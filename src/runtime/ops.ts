import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Config } from '../settings.ts'
import type { RuntimePack } from './manifest.ts'
import {
  resolveRoot,
  targetRoot,
  validateRootCandidate,
  writeLocation,
  type ResolvedRoot,
} from './location.ts'
import { configDir, defaultRoot, downloadsDir, logsDir, runtimeRoot, stateDir } from './paths.ts'
import type { PortPlan } from './ports.ts'
import { readLogTail, type RuntimeStatusView } from './supervisor.ts'
import type { DownloadProgress } from './download.ts'

export type PickerKind = 'native' | 'browse' | 'none'

export interface RuntimeStatusPayload {
  mode: 'external' | 'managed'
  phase: string
  headless: boolean
  picker: PickerKind
  root: string
  defaultRoot: string
  anchorRoot: string
  previousRoot?: string
  reason?: string
  version: string
  ports?: PortPlan
  progress?: DownloadProgress
  logTail?: string
  error?: { phase: string; code: string; detail?: string }
  needsEmbeddingConfig?: boolean
  paths: { runtime: string; state: string; config: string; logs: string; downloads: string }
  pack: { size: number; unpackedSize: number } | null
}

export interface RuntimeOpsDeps {
  config: Config
  anchorRoot: string
  env?: NodeJS.ProcessEnv
  headless: () => boolean
  picker: () => PickerKind
  pick: () => Promise<string | null>
  supervisor: () => { status(): RuntimeStatusView; ensure(): Promise<RuntimeStatusView>; retry(): Promise<RuntimeStatusView> } | null
  version: string
  pack: () => Pick<RuntimePack, 'size' | 'unpackedSize'> | null
  needsEmbeddingConfig: () => Promise<boolean>
  configureRoot: (root: string) => void
}

export class RuntimeOpError extends Error {
  readonly kind: string

  constructor(kind: string, detail: string) {
    super(detail)
    this.kind = kind
  }
}

const currentRoot = (deps: RuntimeOpsDeps): ResolvedRoot => resolveRoot({ anchorRoot: deps.anchorRoot, env: deps.env })

export function statusPayload(deps: RuntimeOpsDeps): RuntimeStatusPayload {
  const external = deps.config.backendUrl.trim().length > 0
  const defaulted = defaultRoot(deps.env)
  const pack = deps.pack()
  const base = {
    headless: deps.headless(),
    picker: deps.picker(),
    defaultRoot: defaulted,
    anchorRoot: deps.anchorRoot,
    version: deps.version,
    pack: pack ? { size: pack.size, unpackedSize: pack.unpackedSize } : null,
  }
  if (external) {
    return {
      ...base,
      mode: 'external',
      phase: 'external',
      root: defaulted,
      paths: layoutOf(defaulted),
    }
  }

  const resolved = currentRoot(deps)
  const needsLocation = resolved.kind === 'needs_location'
  const headless = deps.headless()
  const root = resolved.kind === 'ok' ? resolved.root : defaulted
  const managed = deps.supervisor()
  const view = managed?.status()
  const phase = needsLocation && !headless ? 'needs_location' : (view?.phase ?? 'idle')
  const payload: RuntimeStatusPayload = {
    ...base,
    mode: 'managed',
    phase,
    root,
    paths: layoutOf(root),
  }
  if (needsLocation) {
    payload.previousRoot = resolved.previousRoot
    payload.reason = resolved.reason
  }
  if (view) {
    payload.version = view.runtimeVersion
    payload.ports = view.ports
    payload.progress = view.progress
    payload.logTail = view.logTail || readLogTail(root) || undefined
    if (view.error) payload.error = view.error
  }
  return payload
}

function layoutOf(root: string): RuntimeStatusPayload['paths'] {
  return {
    runtime: runtimeRoot(root),
    state: stateDir(root),
    config: configDir(root),
    logs: logsDir(root),
    downloads: downloadsDir(root),
  }
}

/** `runtime/configure`: validate the parent, create the root layout, anchor it,
 * and hand the new root back so the caller can start provisioning. */
export function configureRuntime(
  deps: RuntimeOpsDeps,
  body: { parent?: unknown; confirmSync?: unknown },
): RuntimeStatusPayload {
  const parent = typeof body.parent === 'string' ? body.parent.trim() : ''
  if (!parent) throw new RuntimeOpError('path_not_absolute', 'parent is required')
  const resolved = currentRoot(deps)
  const activeRoot = resolved.kind === 'ok' ? resolved.root : defaultRoot(deps.env)
  if (existsSync(join(stateDir(activeRoot), 'current.json'))) {
    throw new RuntimeOpError('runtime_installed', 'the runtime is already installed; move it manually instead')
  }
  const pack = deps.pack()
  const candidate = validateRootCandidate({
    parent,
    anchorRoot: deps.anchorRoot,
    size: pack?.size ?? 0,
    unpackedSize: pack?.unpackedSize ?? 0,
    env: deps.env,
  })
  if (!candidate.ok) throw new RuntimeOpError(candidate.code, candidate.reason)
  if (candidate.needsSyncConfirm && body.confirmSync !== true) {
    throw new RuntimeOpError('sync_confirm', 'the target sits on a synced drive; confirm to continue')
  }
  const root = candidate.root
  for (const dir of [
    root,
    downloadsDir(root),
    configDir(root),
    stateDir(root),
    join(stateDir(root), 'data'),
    join(stateDir(root), 'logs'),
    join(stateDir(root), 'qdrant'),
    join(stateDir(root), 'qdrant-snapshots'),
  ]) {
    mkdirSync(dir, { recursive: true })
  }
  writeLocation(deps.anchorRoot, root)
  deps.configureRoot(root)
  return statusPayload(deps)
}

export function pickDirectory(
  deps: RuntimeOpsDeps,
): Promise<{ picker: PickerKind; path: string | null; target: string | null }> {
  const picker = deps.picker()
  if (picker === 'none') return Promise.resolve({ picker, path: null, target: null })
  return deps.pick().then((path) => ({
    picker,
    path,
    target: path ? targetRoot(path) : null,
  }))
}

export function retryRuntime(deps: RuntimeOpsDeps): RuntimeStatusPayload {
  const managed = deps.supervisor()
  if (managed) void managed.retry()
  return statusPayload(deps)
}

/** Panel mount: return the status and, in managed mode, make sure provisioning
 * has been asked for (headless has no settings card to wait for). */
export function ensureRuntimeFromPanel(deps: RuntimeOpsDeps): RuntimeStatusPayload {
  const payload = statusPayload(deps)
  if (payload.mode !== 'managed') return payload
  if (payload.phase === 'needs_location') return payload
  const managed = deps.supervisor()
  if (managed) void managed.ensure()
  return payload
}
