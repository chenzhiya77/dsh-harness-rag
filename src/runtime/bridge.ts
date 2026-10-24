import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
  const anchorRoot = defaultRoot(env)
  let root = (() => {
    const resolved = resolveRoot({ anchorRoot, env })
    return resolved.kind === 'ok' ? resolved.root : defaultRoot(env)
  })()
  let supervisor: Supervisor | null = null
  let pickerService: BridgeHost['directoryPicker'] | null = null
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
          ? ensureRuntime({ root, version, platform, pack, signal: hooks.signal, onProgress: hooks.onProgress })
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
      return capability.pick()
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
        const payload = (await response.json()) as {
          embedding_model?: string | null
          effective?: { embedding_model?: string | null }
        }
        const model = payload.effective?.embedding_model ?? payload.embedding_model ?? null
        if (model) return false
        return !(env.DASHSCOPE_API_KEY || env.EMBEDDING_API_KEY || env.RAG_EMBEDDING_API_KEY)
      } catch {
        return false
      }
    },
    configureRoot: (nextRoot) => {
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
      forgetSupervisor(root, version)
    },
  }
}
