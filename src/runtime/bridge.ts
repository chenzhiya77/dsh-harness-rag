import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Config } from '../settings.ts'
import { createEffectiveConfig, type EffectiveConfig } from './config.ts'
import { loadPack, type RuntimePack } from './manifest.ts'
import { statusPayload, type PickerKind, type RuntimeOpsDeps } from './ops.ts'
import { defaultRoot, stateDir } from './paths.ts'
import { resolveRoot } from './location.ts'
import { ensureRuntime } from './provision.ts'
import { createHostSpawn, type HostSubprocess } from './spawn.ts'
import { getSupervisor, type Supervisor } from './supervisor.ts'
import { createUpgradeCoordinator, type UpgradeCoordinator, type UpgradeTarget } from './upgrade.ts'
import { sanitizeService, type ServiceRecord } from './process.ts'
import type { DownloadProgress } from './download.ts'

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

/** MinerU cloud parsing needs a token from the UI or the environment. The
 * source field is the only reliable signal: a stored token reads back masked,
 * while an env-backed one reads back blank. A local MinerU service needs none. */
export function needsMineruFrom(payload: unknown): boolean {
  const record = payload as {
    config?: { parse_provider?: unknown }
    sources?: { mineru_api_token?: unknown }
  } | null
  return record?.config?.parse_provider === 'mineru-cloud' && record?.sources?.mineru_api_token === 'unset'
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
  // Dev-only override (spec §4.4): a locally built zip replaces the download.
  const sourceZip = env.DSH_HARNESS_RAG_PACK?.trim() ? resolve(env.DSH_HARNESS_RAG_PACK.trim()) : undefined
  const selection = loadPack({
    packageRoot: PACKAGE_ROOT,
    platform,
    allowUnpublished: Boolean(sourceZip),
  })
  const pack = selection.ok ? selection.pack : null
  const target: UpgradeTarget | null = selection.ok
    ? {
        version: selection.pack.runtimeVersion,
        pack: selection.pack,
        configVersion: selection.pack.configVersion,
      }
    : null
  const targetError = selection.ok ? undefined : { code: selection.code }
  const version = pack?.runtimeVersion ?? ''
  const anchorRoot = defaultRoot(env)
  let root = (() => {
    const resolved = resolveRoot({ anchorRoot, env })
    return resolved.kind === 'ok' ? resolved.root : defaultRoot(env)
  })()
  let coordinator: UpgradeCoordinator | null = null
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

  const supervisorFor = (subprocess: HostSubprocess, runtimeVersion: string): Supervisor =>
    getSupervisor({
      root,
      runtimeVersion,
      spawn: createHostSpawn(subprocess),
      // Only the target pack is provisionable; an old version must already be
      // installed, so its supervisor starts from disk without a download.
      ensureRuntime:
        pack && runtimeVersion === pack.runtimeVersion
          ? (hooks: { signal: AbortSignal; onProgress: (progress: DownloadProgress) => void }) =>
              ensureRuntime({
                root,
                version: runtimeVersion,
                platform,
                pack,
                sourceZip,
                signal: hooks.signal,
                onProgress: hooks.onProgress,
              })
          : undefined,
      onReady: () => {
        for (const listener of readyListeners) void listener.syncNow({ force: true })
      },
    })

  const currentCoordinator = (): UpgradeCoordinator | null => {
    if (coordinator) return coordinator
    const subprocess = host.get('subprocess') as HostSubprocess | undefined
    if (!subprocess) return null
    coordinator = createUpgradeCoordinator({
      root,
      target,
      targetError,
      headless: headless(),
      supervisorFor: (runtimeVersion) => supervisorFor(subprocess, runtimeVersion),
      provision: (_runtimeVersion, hooks) =>
        pack
          ? ensureRuntime({
              root,
              version: pack.runtimeVersion,
              platform,
              pack,
              sourceZip,
              background: hooks.background,
              signal: hooks.signal,
              onProgress: hooks.onProgress,
            })
          : Promise.resolve({ kind: 'failed', code: 'pack_missing' }),
      log: (message) => console.log(`[harness-rag] ${message}`),
    })
    return coordinator
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
    supervisor: () => currentCoordinator(),
    version,
    pack: () => (pack ? { size: pack.size, unpackedSize: pack.unpackedSize } : null),
    configNeeds: async () => {
      const view = currentCoordinator()?.status()
      if (view?.phase !== 'ready') return { needsEmbedding: false, needsMineru: false }
      const record = readService(root)
      if (!record) return { needsEmbedding: false, needsMineru: false }
      try {
        const response = await fetch(`http://127.0.0.1:${record.ports.knowledge}/api/rag/config`, {
          headers: { authorization: `Bearer ${record.token}` },
        })
        if (!response.ok) return { needsEmbedding: false, needsMineru: false }
        const payload = await response.json()
        return { needsEmbedding: needsEmbeddingFrom(payload), needsMineru: needsMineruFrom(payload) }
      } catch {
        return { needsEmbedding: false, needsMineru: false }
      }
    },
    configureRoot: (nextRoot) => {
      // The old root's service is ours: stop it, and drop every supervisor the
      // coordinator created so a later move back starts clean.
      coordinator?.dispose(true)
      coordinator = null
      root = nextRoot
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
    if (headless()) void currentCoordinator()?.ensure()
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
      coordinator?.dispose()
    },
  }
}
