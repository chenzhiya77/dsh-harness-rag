import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer as createNetServer } from 'node:net'
import { dirname, join } from 'node:path'
import { configDir, downloadsDir, logsDir, runtimeDir, stateDir } from './paths.ts'
import { planPorts, type PortPlan } from './ports.ts'
import {
  isOwnedPath,
  killTree,
  sanitizeLease,
  sanitizeService,
  type ChildHandle,
  type LeaseRecord,
  type ServiceRecord,
  type SpawnFn,
  type SpawnRequest,
} from './process.ts'
import { seedRuntimeConfig } from './seed.ts'
import type { DownloadProgress } from './download.ts'

export type RuntimePhase = 'idle' | 'preparing' | 'starting' | 'ready' | 'error'

export interface RuntimeError {
  phase: string
  code: string
  detail?: string
}

export interface RuntimeStatusView {
  phase: RuntimePhase
  adopted: boolean
  progress?: DownloadProgress
  runtimeVersion: string
  root: string
  ports?: PortPlan
  error?: RuntimeError
  logTail: string
}

export type EnsureStep =
  | { kind: 'ok' }
  | { kind: 'failed'; code: string; detail?: string }
  | { kind: 'aborted' }

export interface SupervisorOptions {
  root: string
  runtimeVersion: string
  /** Provision the runtime directory (download + extract). Task 4 wires this;
   * the supervisor only needs it to have succeeded. */
  ensureRuntime?: (hooks: {
    signal: AbortSignal
    onProgress: (progress: DownloadProgress) => void
  }) => Promise<EnsureStep>
  spawn: SpawnFn
  token?: string
  fetchImpl?: typeof fetch
  now?: () => string
  isAlive?: (pid: number) => boolean
  executablePath?: (pid: number) => string | null
  probePort?: (port: number) => Promise<boolean>
  preferredPorts?: Partial<PortPlan>
  readyTimeoutMs?: number
  probeIntervalMs?: number
  disposeGraceMs?: number
  /** Called once the instance answers, whether adopted or freshly started. */
  onReady?: () => void
  timers?: { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void }
  maxLogBytes?: number
}

export interface Supervisor {
  readonly root: string
  ensure(): Promise<RuntimeStatusView>
  status(): RuntimeStatusView
  retry(): Promise<RuntimeStatusView>
  dispose(): void
}

const MAX_LOG_BYTES = 2 * 1024 * 1024
const LOG_TAIL_LINES = 40

const randomToken = (): string => randomBytes(24).toString('base64url')

function defaultIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function defaultProbePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true))
    })
  })
}

interface LogSink {
  write(chunk: string): void
  path: string
}

function createLogSink(path: string, maxBytes: number): LogSink {
  if (existsSync(path)) {
    try {
      if (statSync(path).size > maxBytes) renameSync(path, `${path}.1`)
    } catch {
      // rotation is best effort
    }
  }
  return {
    path,
    write(chunk: string) {
      try {
        appendFileSync(path, chunk, 'utf8')
      } catch {
        // logging must never take the runtime down
      }
    },
  }
}

function tailOf(path: string, lines = LOG_TAIL_LINES): string {
  try {
    const text = readFileSync(path, 'utf8')
    return text.split('\n').filter(Boolean).slice(-lines).join('\n')
  } catch {
    return ''
  }
}

export function createSupervisor(options: SupervisorOptions): Supervisor {
  const root = options.root
  const runtimeVersion = options.runtimeVersion
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => new Date().toISOString())
  const isAlive = options.isAlive ?? defaultIsAlive
  const executablePath = options.executablePath ?? (() => null)
  const probePort = options.probePort ?? defaultProbePort
  const readyTimeoutMs = options.readyTimeoutMs ?? 120_000
  const probeIntervalMs = options.probeIntervalMs ?? 250
  const disposeGraceMs = options.disposeGraceMs ?? 5_000
  const maxLogBytes = options.maxLogBytes ?? MAX_LOG_BYTES
  const timers = options.timers ?? {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (handle) => clearTimeout(handle as NodeJS.Timeout),
  }
  const token = options.token ?? randomToken()
  const owner = randomBytes(8).toString('hex')

  const runtime = runtimeDir(root, runtimeVersion)
  const statePath = join(stateDir(root), 'service.json')
  const leasePath = join(stateDir(root), 'lease.json')
  const logs = logsDir(root)

  let status: RuntimeStatusView = {
    phase: 'idle',
    adopted: false,
    runtimeVersion,
    root,
    logTail: '',
  }
  let qdrant: ChildHandle | null = null
  let engine: ChildHandle | null = null
  let startPromise: Promise<RuntimeStatusView> | null = null
  let pendingDispose: unknown | null = null
  let disposed = false

  const setPhase = (patch: Partial<RuntimeStatusView>): void => {
    status = { ...status, ...patch }
  }

  const writeJson = (path: string, value: unknown): void => {
    mkdirSync(dirname(path), { recursive: true })
    const temp = `${path}.tmp-${process.pid}`
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    renameSync(temp, path)
  }

  const readService = (): ServiceRecord | null => {
    try {
      return sanitizeService(JSON.parse(readFileSync(statePath, 'utf8')))
    } catch {
      return null
    }
  }

  const readLease = (): LeaseRecord | null => {
    try {
      return sanitizeLease(JSON.parse(readFileSync(leasePath, 'utf8')))
    } catch {
      return null
    }
  }

  const acquireLease = (): 'acquired' | 'held' => {
    mkdirSync(stateDir(root), { recursive: true })
    const current = readLease()
    if (current && current.owner !== owner && isAlive(current.pid)) return 'held'
    writeJson(leasePath, { version: 1, owner, pid: process.pid, startedAt: now() })
    return 'acquired'
  }

  const releaseLease = (): void => {
    const current = readLease()
    if (current?.owner === owner) rmSync(leasePath, { force: true })
  }

  const fail = (phase: string, code: string, detail?: string): RuntimeStatusView => {
    killChildren()
    rmSync(statePath, { force: true })
    releaseLease()
    setPhase({ phase: 'error', error: { phase, code, detail }, logTail: currentLogTail() })
    return status
  }

  const currentLogTail = (): string =>
    [tailOf(join(logs, 'engine.log')), tailOf(join(logs, 'qdrant.log'))].filter(Boolean).join('\n').trim()

  const killChildren = (): void => {
    for (const child of [engine, qdrant]) {
      if (!child) continue
      try {
        child.kill()
      } catch {
        // already gone
      }
    }
    engine = null
    qdrant = null
  }

  const probe = async (url: string, headers: Record<string, string> = {}): Promise<boolean> => {
    try {
      const response = await fetchImpl(url, {
        headers,
        signal: AbortSignal.timeout(Math.max(1_000, probeIntervalMs * 4)),
      })
      return response.ok
    } catch {
      return false
    }
  }

  const waitFor = async (
    check: () => Promise<boolean>,
    child: () => ChildHandle | null,
    exited: () => boolean,
  ): Promise<'ready' | 'exited' | 'timeout'> => {
    const deadline = Date.now() + readyTimeoutMs
    for (;;) {
      if (disposed || !child()) return 'exited'
      if (await check()) return 'ready'
      if (exited()) return 'exited'
      if (Date.now() > deadline) return 'timeout'
      await new Promise<void>((resolve) => setTimeout(resolve, probeIntervalMs))
    }
  }

  const spawnChild = (request: SpawnRequest, logName: string, onExit: (code: number | null) => void): ChildHandle => {
    const sink = createLogSink(join(logs, logName), maxLogBytes)
    const child = options.spawn(request)
    child.onData('stdout', (chunk) => sink.write(chunk))
    child.onData('stderr', (chunk) => sink.write(chunk))
    child.onExit(onExit)
    return child
  }

  const qdrantRequest = (ports: PortPlan): SpawnRequest => ({
    command: join(runtime, 'qdrant', 'qdrant.exe'),
    args: [],
    cwd: root,
    env: {
      QDRANT__SERVICE__HOST: '127.0.0.1',
      QDRANT__SERVICE__HTTP_PORT: String(ports.qdrantHttp),
      QDRANT__SERVICE__GRPC_PORT: String(ports.qdrantGrpc),
      QDRANT__STORAGE__STORAGE_PATH: join(stateDir(root), 'qdrant'),
      QDRANT__STORAGE__SNAPSHOTS_PATH: join(stateDir(root), 'qdrant-snapshots'),
      QDRANT__TELEMETRY_DISABLED: 'true',
    },
  })

  const engineRequest = (ports: PortPlan, serviceToken: string): SpawnRequest => ({
    command: join(runtime, 'python', 'python.exe'),
    args: [
      '-m',
      'uvicorn',
      'app.gateway.knowledge_app:app',
      '--host',
      '127.0.0.1',
      '--port',
      String(ports.knowledge),
    ],
    cwd: root,
    env: {
      DEER_FLOW_PROJECT_ROOT: root,
      DEER_FLOW_HOME: stateDir(root),
      DEER_FLOW_CONFIG_PATH: join(configDir(root), 'config.yaml'),
      DEER_FLOW_MODELS_CONFIG_PATH: join(configDir(root), 'models_config.json'),
      DEER_FLOW_RAG_CONFIG_PATH: join(configDir(root), 'rag_config.json'),
      DEER_FLOW_API_TOKEN: serviceToken,
      PYTHONPATH: [
        join(runtime, 'site-packages'),
        join(runtime, 'engine', 'backend'),
        join(runtime, 'engine', 'backend', 'packages', 'harness'),
        join(runtime, 'engine', 'backend', 'packages', 'extension-api'),
      ].join(';'),
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
    },
  })

  const adopt = async (): Promise<RuntimeStatusView | null> => {
    const record = readService()
    if (!record) return null
    const base = `http://127.0.0.1:${record.ports.knowledge}`
    const healthy = await probe(`${base}/api/knowledge-bases`, { authorization: `Bearer ${record.token}` })
    if (!healthy) return null
    options.onReady?.()
    setPhase({
      phase: 'ready',
      adopted: true,
      runtimeVersion: record.runtimeVersion,
      ports: record.ports,
      progress: undefined,
      error: undefined,
      logTail: currentLogTail(),
    })
    return status
  }

  /** A recorded instance that no longer answers is only killed when its pid
   * still points at an executable inside this root. */
  const cleanStale = (): void => {
    const record = readService()
    if (!record) return
    for (const pid of [record.pid, record.qdrantPid]) {
      if (!pid) continue
      if (isOwnedPath(executablePath(pid), root)) killTree(pid)
    }
    rmSync(statePath, { force: true })
  }

  const start = async (): Promise<RuntimeStatusView> => {
    setPhase({ phase: 'preparing', adopted: false, error: undefined, logTail: '' })
    if (options.ensureRuntime) {
      const outcome = await options.ensureRuntime({
        signal: new AbortController().signal,
        onProgress: (progress) => setPhase({ progress }),
      })
      if (outcome.kind === 'aborted') return fail('prepare', 'aborted')
      if (outcome.kind === 'failed') return fail('prepare', outcome.code, outcome.detail)
    }
    mkdirSync(logs, { recursive: true })
    mkdirSync(downloadsDir(root), { recursive: true })
    mkdirSync(join(stateDir(root), 'data'), { recursive: true })
    mkdirSync(join(stateDir(root), 'qdrant'), { recursive: true })
    mkdirSync(join(stateDir(root), 'qdrant-snapshots'), { recursive: true })
    setPhase({ phase: 'starting' })

    if (acquireLease() === 'held') return fail('lease', 'lease_held')
    cleanStale()

    const planned = await planPorts({
      preferred: options.preferredPorts,
      isFree: (port) => probePort(port),
    })
    if (!planned.ok) return fail('ports', planned.code, planned.role)
    const ports = planned.ports
    setPhase({ ports })

    const seeded = seedRuntimeConfig({
      root,
      engineRoot: join(runtime, 'engine'),
      qdrantUrl: `http://127.0.0.1:${ports.qdrantHttp}`,
    })
    if (!seeded.ok) return fail('seed', seeded.code, seeded.detail)

    let qdrantExit: number | null | undefined
    qdrant = spawnChild(qdrantRequest(ports), 'qdrant.log', (code) => {
      qdrantExit = code ?? -1
    })
    const qdrantReady = await waitFor(
      () => probe(`http://127.0.0.1:${ports.qdrantHttp}/readyz`),
      () => qdrant,
      () => qdrantExit !== undefined,
    )
    if (qdrantReady !== 'ready') {
      return qdrantReady === 'exited'
        ? fail('qdrant', 'qdrant_exited', `exit ${String(qdrantExit)}`)
        : fail('qdrant', 'qdrant_not_ready')
    }

    let engineExit: number | null | undefined
    engine = spawnChild(engineRequest(ports, token), 'engine.log', (code) => {
      engineExit = code ?? -1
    })
    const engineReady = await waitFor(
      () =>
        probe(`http://127.0.0.1:${ports.knowledge}/health`).then(async (healthy) => {
          if (!healthy) return false
          return probe(`http://127.0.0.1:${ports.knowledge}/api/knowledge-bases`, {
            authorization: `Bearer ${token}`,
          })
        }),
      () => engine,
      () => engineExit !== undefined,
    )
    if (engineReady !== 'ready') {
      return engineReady === 'exited'
        ? fail('engine', 'engine_exited', `exit ${String(engineExit)}`)
        : fail('engine', 'engine_not_ready')
    }

    writeJson(statePath, {
      version: 1,
      pid: engine.pid ?? null,
      qdrantPid: qdrant.pid ?? null,
      runtimeVersion,
      token,
      ports,
      startedAt: now(),
    })
    options.onReady?.()
    setPhase({ phase: 'ready', adopted: false, error: undefined, logTail: currentLogTail() })
    return status
  }

  const ensure = async (): Promise<RuntimeStatusView> => {
    disposed = false
    if (pendingDispose !== null) {
      timers.clear(pendingDispose)
      pendingDispose = null
    }
    if (status.phase === 'ready') return status
    if (startPromise) return startPromise
    const adopted = await adopt()
    if (adopted) return adopted
    startPromise = start().finally(() => {
      startPromise = null
    })
    return startPromise
  }

  return {
    root,
    ensure,
    status: () => status,
    retry: () => {
      setPhase({ phase: 'idle', error: undefined })
      return ensure()
    },
    dispose() {
      if (status.phase === 'ready' && status.adopted) return
      disposed = true
      const finish = (): void => {
        pendingDispose = null
        killChildren()
        rmSync(statePath, { force: true })
        releaseLease()
        setPhase({ phase: 'idle', ports: undefined, progress: undefined, adopted: false })
      }
      if (disposeGraceMs <= 0) {
        finish()
        return
      }
      pendingDispose = timers.set(finish, disposeGraceMs)
    },
  }
}

export function supervisorKey(root: string, runtimeVersion: string): string {
  return `__hrag_supervisor__:${root}:${runtimeVersion}`
}

const registry = globalThis as unknown as Record<string, unknown>

/** One supervisor per root and version, surviving plugin reloads. */
export function getSupervisor(options: SupervisorOptions): Supervisor {
  const key = supervisorKey(options.root, options.runtimeVersion)
  const existing = registry[key] as Supervisor | undefined
  if (existing) {
    void existing.ensure()
    return existing
  }
  const created = createSupervisor(options)
  registry[key] = created
  return created
}

export function forgetSupervisor(root: string, runtimeVersion: string): void {
  delete registry[supervisorKey(root, runtimeVersion)]
}

export function readLogTail(root: string): string {
  return [tailOf(join(logsDir(root), 'engine.log')), tailOf(join(logsDir(root), 'qdrant.log'))]
    .filter(Boolean)
    .join('\n')
    .trim()
}
