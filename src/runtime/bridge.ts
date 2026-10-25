import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Config } from '../settings.ts'
import { createEffectiveConfig, type EffectiveConfig } from './config.ts'
import { readManifest, type RuntimePack } from './manifest.ts'
import { statusPayload, type PickerKind, type RuntimeOpsDeps } from './ops.ts'
import { defaultRoot, stateDir } from './paths.ts'
import { resolveRoot } from './location.ts'
import { ensureRuntime } from './provision.ts'
import { createHostSpawn, type HostSubprocess } from './spawn.ts'
import { forgetSupervisor, getSupervisor, type Supervisor } from './supervisor.ts'
import { sanitizeService, type ServiceRecord } from './process.ts'

const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url))

/** The host services this bridge reads. Everything is looked up lazily: the
 * plugin activates before the web server and the picker may never appear. */
export interface BridgeHost {
  get(name: string): unknown
  inject(names: string[], callback: (ctx: BridgeHost) => void): void
  subprocess?: HostSubprocess
  directoryPicker?: {
    capability(): { kind?: string; pick?(signal?: AbortSignal): Promise<string | null> }
  }
}

export interface ReadyListener {
  syncNow(options?: { force?: boolean }): Promise<unknown>
}

export interface RuntimeBridge {
  effective: EffectiveConfig
  ops: RuntimeOpsDeps
  /** Resync the chat model catalog once the service answers. */
  addReadyListener(listener: ReadyListener): void
  stop(): void
}

function packOf(platform: string): RuntimePack | null {
  const read = readManifest({ packageRoot: PACKAGE_ROOT })
  return read.ok ? (read.manifest.packs[platform] ?? null) : null
}

/** `/api/rag/config` reports the effective values under `config`; a blank or
 * absent model means the seed still needs one. */
export function embeddingModelOf(payload: unknown): string | null {
  const record = payload as { config?: { embedding_model?: unknown } } | null
  const value = record?.config?.embedding_model
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** A model is mandatory and has no default: a provider key in the environment
 * cannot stand in for it. */
export function needsEmbeddingFrom(payload: unknown): boolean {
  return !embeddingModelOf(payload)
}

function readService(root: string): ServiceRecord | null {
  try {
    return sanitizeService(JSON.parse(readFileSync(join(stateDir(root), 'service.json'), 'utf8')))
  } catch {
    return null
  }
}

/** Managed mode wiring: resolve the root, own the supervisor singleton, and
 * expose the raw config through getters that follow the running instance. */
export function createRuntimeBridge(
  host: BridgeHost,
  raw: Config,
  env: NodeJS.ProcessEnv = process.env,
): RuntimeBridge {
  const platform = `${process.platform}-${process.arch}`
  const pack = packOf(platform)
  const version = pack?.runtimeVersion ?? '0.0.0-0'
  // Dev-only override (spec §4.4): a locally built zip replaces the download.
  const sourceZip = env.DSH_HARNESS_RAG_PACK?.trim() ? resolve(env.DSH_HARNESS_RAG_PACK.trim()) : undefined
  const anchorRoot = defaultRoot(env)
  let root = (() => {
    const resolved = resolveRoot({ anchorRoot, env })
    return resolved.kind === 'ok' ? resolved.root : defaultRoot(env)
  })()
  let supervisor: Supervisor | null = null
  let pickerService: BridgeHost['directoryPicker'] | null = null
  let pickController: AbortController | null = null
  const readyListeners: ReadyListener[] = []

  host.inject(['directoryPicker'], (fresh) => {
    pickerService = (fresh as BridgeHost).directoryPicker ?? null
  })

  const pickerKind = (): PickerKind => {
    const capability = pickerService?.capability?.()
    return capability?.kind === 'native' || capability?.kind === 'browse' ? capability.kind : 'none'
  }

  const headless = (): boolean => host.get('webServer') === undefined

  const ensureSupervisor = (): Supervisor | null => {
    const subprocess = host.get('subprocess') as HostSubprocess | undefined
    if (!subprocess) return null
    return getSupervisor({
      root,
      runtimeVersion: version,
      spawn: createHostSpawn(subprocess),
      ensureRuntime: (hooks) =>
        pack
          ? ensureRuntime({
              root,
              version,
              platform,
              pack,
              sourceZip,
              signal: hooks.signal,
              onProgress: hooks.onProgress,
            })
          : Promise.resolve({ kind: 'failed', code: 'pack_missing' }),
      onReady: () => {
        for (const listener of readyListeners) void listener.syncNow({ force: true })
      },
    })
  }

  const currentSupervisor = (): Supervisor | null => {
    supervisor ??= ensureSupervisor()
    return supervisor
  }

  const deps: RuntimeOpsDeps = {
    config: raw,
    anchorRoot,
    env,
    headless,
    picker: pickerKind,
    pick: async () => {
      const capability = pickerService?.capability?.()
      if (!capability?.pick) return null
      // The host's native chooser reads the caller-lifetime signal on entry
      // (win32 dialog driver) and closes the dialog when it aborts.
      pickController?.abort()
      const controller = new AbortController()
      pickController = controller
      try {
        return await capability.pick(controller.signal)
      } catch (error) {
        if (controller.signal.aborted) return null
        throw error
      } finally {
        if (pickController === controller) pickController = null
      }
    },
    supervisor: () => currentSupervisor(),
    version,
    pack: () => (pack ? { size: pack.size, unpackedSize: pack.unpackedSize } : null),
    needsEmbeddingConfig: async () => {
      const view = currentSupervisor()?.status()
      if (view?.phase !== 'ready') return false
      const record = readService(root)
      if (!record) return false
      try {
        const response = await fetch(`http://127.0.0.1:${record.ports.knowledge}/api/rag/config`, {
          headers: { authorization: `Bearer ${record.token}` },
        })
        if (!response.ok) return false
        return needsEmbeddingFrom(await response.json())
      } catch {
        return false
      }
    },
    configureRoot: (nextRoot) => {
      // The old root's service is ours: stop it, and drop the singleton so a
      // later move back does not resurrect a half-disposed instance.
      supervisor?.dispose()
      forgetSupervisor(root, version)
      root = nextRoot
      supervisor = null
    },
  }

  const effective = createEffectiveConfig(raw, {
    mode: raw.backendUrl.trim() ? 'external' : 'managed',
    backendUrl: () => {
      const record = readService(root)
      return record ? `http://127.0.0.1:${record.ports.knowledge}` : null
    },
    apiToken: () => readService(root)?.token ?? '',
    phase: () => statusPayload(deps).phase,
  })

  // Headless has no panel to confirm the first run: after a short grace for a
  // late web server, provision with the default root on its own.
  const grace = setTimeout(() => {
    if (headless()) void currentSupervisor()?.ensure()
  }, 2_000)
  grace.unref?.()

  return {
    effective,
    ops: deps,
    addReadyListener: (listener) => {
      readyListeners.push(listener)
    },
    stop: () => {
      clearTimeout(grace)
      // An open native chooser belongs to this plugin instance; unload closes it.
      pickController?.abort()
      // The singleton stays registered so a reload within the grace period
      // takes it over (cancelling the pending kill) instead of rebuilding it.
      supervisor?.dispose()
    },
  }
}
