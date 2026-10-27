import { randomBytes } from 'node:crypto'
import {
  appendFileSync,
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { connect as connectNet, createServer as createNetServer } from 'node:net'
import { dirname, join } from 'node:path'
import { runtimeEngineExtras } from './engine_env.ts'
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
import { planCurrent, readCurrent, writeCurrent, type CurrentPlan } from './manifest.ts'
import { RUNTIME_MANIFEST } from './zip.ts'
import type { DownloadProgress } from './download.ts'

export type RuntimePhase = 'idle' | 'preparing' | 'starting' | 'ready' | 'switching' | 'error'

export interface RuntimeError {
  phase: string
  code: string
  detail?: string
}

export interface RuntimeUpgradeView {
  state: 'pending' | 'ready' | 'needs_confirmation' | 'failed' | 'blocked'
  fromVersion: string
  targetVersion: string
  configVersionChanged: boolean
  requiresConfirmation: boolean
  progress?: DownloadProgress
  error?: RuntimeError
}

export interface RuntimeStatusView {
  phase: RuntimePhase
  adopted: boolean
  progress?: DownloadProgress
  runtimeVersion: string
  targetVersion?: string
  previousVersion?: string
  upgrade?: RuntimeUpgradeView
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
  /** Monotonic-ish clock for the shared startup budget; tests inject it. */
  nowMs?: () => number
  isAlive?: (pid: number) => boolean
  executablePath?: (pid: number) => string | null
  probePort?: (port: number) => Promise<boolean>
  preferredPorts?: Partial<PortPlan>
  readyTimeoutMs?: number
  probeIntervalMs?: number
  disposeGraceMs?: number
  /** Called once the instance answers, whether adopted or freshly started. */
  onReady?: () => void
  /** Adopted instances only: probe cadence and consecutive misses before the
   * status flips to `adopted_unreachable`. A self-managed stack is covered by
   * its exit callbacks. */
  watchdogIntervalMs?: number
  watchdogFailures?: number
  timers?: { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void }
  maxLogBytes?: number
}

export interface Supervisor {
  readonly root: string
  ensure(options?: { readyTimeoutMs?: number }): Promise<RuntimeStatusView>
  /** Read-only: the healthy service record for this supervisor's version, or
   * null. Never spawns, never touches `current.json`. */
  probe(): Promise<ServiceRecord | null>
  /** Adopt the healthy service if it still answers; never starts a new stack. */
  adopt(): Promise<RuntimeStatusView | null>
  status(): RuntimeStatusView
  retry(): Promise<RuntimeStatusView>
  /** Follow the newest plugin instance: the singleton outlives a reload, and
   * the package that takes it over brings a fresh ready hook. */
  rebind(onReady?: () => void): void
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

export function probeTcpPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true))
    })
  })
}

/** True when something accepts a TCP connection on the loopback port. This is
 * the opposite question from `probeTcpPort`, which asks whether the port is
 * free: an orphan check must not mistake "occupied" for "available". */
export function probePortAnswer(port: number, timeoutMs = 1_000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connectNet({ host: '127.0.0.1', port })
    let settled = false
    const finish = (value: boolean): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

interface LogSink {
  write(chunk: string): void
  path: string
}

function createLogSink(path: string, maxBytes: number): LogSink {
  let size = 0
  try {
    if (existsSync(path)) {
      size = statSync(path).size
      if (size > maxBytes) {
        // A previous generation may already own `.1`; Windows rename does not
        // replace it, and the oversized log would otherwise survive forever.
        rmSync(`${path}.1`, { force: true })
        renameSync(path, `${path}.1`)
        size = 0
      }
    }
  } catch {
    // rotation is best effort
  }
  return {
    path,
    write(chunk: string) {
      const bytes = Buffer.byteLength(chunk)
      try {
        if (size + bytes > maxBytes) {
          // Rotate mid-run too: a long-lived stack writes access logs continuously,
          // and the cap cannot wait for the next start.
          rmSync(`${path}.1`, { force: true })
          renameSync(path, `${path}.1`)
          size = 0
        }
      } catch {
        // rotation is best effort; keep writing to the current file
      }
      try {
        appendFileSync(path, chunk, 'utf8')
        size += bytes
      } catch {
        // logging must never take the runtime down
      }
    },
  }
}

const LOG_TAIL_BYTES = 64 * 1024

/** Read only the end of the log: a long-running stack can leave gigabytes
 * behind, and loading that whole file is what took the host down. */
function tailOf(path: string, lines = LOG_TAIL_LINES): string {
  let fd: number | undefined
  try {
    fd = openSync(path, 'r')
    const size = fstatSync(fd).size
    const start = Math.max(0, size - LOG_TAIL_BYTES)
    const buffer = Buffer.allocUnsafe(size - start)
    readSync(fd, buffer, 0, buffer.length, start)
    const out = buffer.toString('utf8').split('\n').filter(Boolean).slice(-lines)
    return out.join('\n')
  } catch {
    return ''
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

/** Only the bytes this round appended: an older run's bind error must not
 * trigger a retry. */
function readFrom(path: string, offset: number): string {
  try {
    return readFileSync(path).subarray(offset).toString('utf8')
  } catch {
    return ''
  }
}

function sizeOf(path: string): number {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

/** httpx reads `NO_PROXY` entries as URL patterns, so a bracketed IPv6 entry
 * (`[::1]`) throws when the client is built — and the host's proxy overlay
 * writes exactly that form. Keep the user's entries, drop the brackets, and
 * make sure loopback stays bypassed. */
export function pythonNoProxy(env: NodeJS.ProcessEnv): string {
  const raw = (env.no_proxy ?? env.NO_PROXY ?? '').trim()
  if (raw === '*') return '*'
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (entry.startsWith('[') && entry.endsWith(']') ? entry.slice(1, -1) : entry))
  for (const name of ['localhost', '127.0.0.1', '::1', '0.0.0.0', '::ffff:127.0.0.1']) {
    if (!entries.includes(name)) entries.push(name)
  }
  return entries.join(',')
}

/** Windows reports the port conflict as a numeric code; the English phrase only
 * appears on English locales. */
const BIND_FAILURE = /(os error|Errno|winerror)\s*10048|EADDRINUSE|address already in use/i

export function createSupervisor(options: SupervisorOptions): Supervisor {
  const root = options.root
  const runtimeVersion = options.runtimeVersion
  const fetchImpl = options.fetchImpl ?? fetch
  const now = options.now ?? (() => new Date().toISOString())
  const nowMs = options.nowMs ?? Date.now
  const isAlive = options.isAlive ?? defaultIsAlive
  const executablePath = options.executablePath ?? (() => null)
  const probePort = options.probePort ?? probeTcpPort
  const readyTimeoutMs = options.readyTimeoutMs ?? 120_000
  const probeIntervalMs = options.probeIntervalMs ?? 250
  const disposeGraceMs = options.disposeGraceMs ?? 5_000
  const maxLogBytes = options.maxLogBytes ?? MAX_LOG_BYTES
  const watchdogIntervalMs = options.watchdogIntervalMs ?? 10_000
  const watchdogMissesLimit = options.watchdogFailures ?? 2
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
  let onReady = options.onReady

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

  /** What the pointer should do given the version that actually answers. */
  const currentPlan = (runningVersion: string): CurrentPlan =>
    planCurrent(
      readCurrent(root),
      runningVersion,
      existsSync(join(runtimeDir(root, runningVersion), RUNTIME_MANIFEST)),
    )

  const applyCurrent = (runningVersion: string, plan: CurrentPlan): void => {
    if (plan.kind === 'first') writeCurrent(root, { runtimeVersion: runningVersion }, now)
    if (plan.kind === 'rewrite') {
      writeCurrent(root, { runtimeVersion: runningVersion, previousVersion: plan.previousVersion }, now)
    }
  }

  const readLease = (): LeaseRecord | null => readLeaseRecord(root)

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
    // Set the error phase first: killing the children fires their exit callbacks,
    // and those must not re-enter fail() through the post-ready crash handler.
    setPhase({ phase: 'error', error: { phase, code, detail }, logTail: currentLogTail() })
    killChildren()
    rmSync(statePath, { force: true })
    releaseLease()
    return status
  }

  /** A supervised child that dies after `ready` takes the whole instance down:
   * the panel flips to the error card and the retry path starts a fresh stack. */
  const crash = (role: 'qdrant' | 'engine', code: number | null | undefined): void => {
    if (disposed || status.phase !== 'ready') return
    fail(role, `${role}_exited`, `exit ${String(code)}`)
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

  /** Adopted services are not ours: a periodic probe notices a dead instance,
   * but nothing is killed, deleted, or released. */
  let watchdog: unknown | null = null
  let watchdogMisses = 0

  const stopWatchdog = (): void => {
    watchdogMisses = 0
    if (watchdog === null) return
    timers.clear(watchdog)
    watchdog = null
  }

  const failAdopted = (detail: string): RuntimeStatusView => {
    // Not `fail()`: the record, lease, and processes belong to the other host.
    setPhase({ phase: 'error', error: { phase: 'adopted', code: 'adopted_unreachable', detail }, logTail: currentLogTail() })
    return status
  }

  const scheduleWatchdog = (): void => {
    // A probe from an earlier episode can land after a retry re-adopted the
    // service; clearing first keeps exactly one timer.
    if (watchdog !== null) timers.clear(watchdog)
    watchdog = timers.set(() => {
      void probeAdopted()
    }, watchdogIntervalMs)
    // Host shutdown must not wait on a health timer; the host reaps the tree.
    ;(watchdog as { unref?: () => void } | null)?.unref?.()
  }

  const probeAdopted = async (): Promise<void> => {
    watchdog = null
    if (disposed || status.phase !== 'ready' || !status.adopted) return
    const record = readService()
    const healthy = record
      ? await probe(`http://127.0.0.1:${record.ports.knowledge}/api/knowledge-bases`, {
          authorization: `Bearer ${record.token}`,
        })
      : false
    // The probe outlives a phase change: retry or teardown may have run while
    // it was in flight.
    if (disposed || status.phase !== 'ready' || !status.adopted) return
    if (healthy) {
      watchdogMisses = 0
      scheduleWatchdog()
      return
    }
    watchdogMisses += 1
    if (watchdogMisses >= watchdogMissesLimit) {
      failAdopted(`${watchdogMisses} consecutive probes failed`)
      return
    }
    scheduleWatchdog()
  }

  const waitFor = async (
    check: () => Promise<boolean>,
    child: () => ChildHandle | null,
    exited: () => boolean,
    deadline: number,
  ): Promise<'ready' | 'exited' | 'timeout'> => {
    for (;;) {
      if (disposed || !child()) return 'exited'
      if (await check()) return 'ready'
      if (exited()) return 'exited'
      if (nowMs() > deadline) return 'timeout'
      await new Promise<void>((resolve) => setTimeout(resolve, probeIntervalMs))
    }
  }

  const exitWatchers = new WeakMap<ChildHandle, { exited: boolean; waiters: Array<() => void> }>()

  /** The offset is taken before the child starts and after the sink's rotation,
   * so `appended()` only ever returns this round's output. */
  const spawnChild = (
    request: SpawnRequest,
    logName: string,
    onExit: (code: number | null) => void,
  ): { child: ChildHandle; appended: () => string } => {
    const sink = createLogSink(join(logs, logName), maxLogBytes)
    const offset = sizeOf(sink.path)
    const child = options.spawn(request)
    const state = { exited: false, waiters: [] as Array<() => void> }
    exitWatchers.set(child, state)
    child.onData('stdout', (chunk) => sink.write(chunk))
    child.onData('stderr', (chunk) => sink.write(chunk))
    child.onExit((code) => {
      state.exited = true
      for (const waiter of state.waiters.splice(0)) waiter()
      onExit(code)
    })
    return { child, appended: () => readFrom(sink.path, offset) }
  }

  /** Windows termination is asynchronous: a retry must not rebind a port the
   * previous child still holds. Resolves on exit, or after a bounded wait. */
  const whenExited = (child: ChildHandle | null): Promise<void> => {
    if (!child) return Promise.resolve()
    const state = exitWatchers.get(child)
    if (!state || state.exited) return Promise.resolve()
    return new Promise((resolve) => {
      state.waiters.push(resolve)
      const timer = setTimeout(resolve, 3_000)
      timer.unref?.()
    })
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
      ...runtimeEngineExtras(runtime, process.env),
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
      // The host overlays the resolved proxy policy onto every child, and its
      // bypass list carries bracketed IPv6 entries (`[::1]`) that httpx rejects
      // at client construction. Our env merges last, so hand Python a list it
      // can parse instead.
      no_proxy: pythonNoProxy(process.env),
      NO_PROXY: pythonNoProxy(process.env),
    },
  })

  /** Only a record for the expected version that answers counts. Read-only. */
  const probeService = async (expectedVersion: string): Promise<ServiceRecord | null> => {
    const record = readService()
    if (!record) return null
    if (record.runtimeVersion !== expectedVersion) return null
    const base = `http://127.0.0.1:${record.ports.knowledge}`
    const healthy = await probe(`${base}/api/knowledge-bases`, { authorization: `Bearer ${record.token}` })
    return healthy ? record : null
  }

  /** Only a record for the version this supervisor owns can be adopted; a
   * leftover from another version is left for the coordinator to classify. */
  const adopt = async (expectedVersion: string): Promise<RuntimeStatusView | null> => {
    const record = await probeService(expectedVersion)
    if (!record) return null
    const plan = currentPlan(record.runtimeVersion)
    applyCurrent(record.runtimeVersion, plan)
    onReady?.()
    setPhase({
      phase: 'ready',
      adopted: true,
      runtimeVersion: record.runtimeVersion,
      ports: record.ports,
      progress: undefined,
      error: undefined,
      logTail: currentLogTail(),
      upgrade:
        plan.kind === 'conflict'
          ? {
              state: 'blocked',
              fromVersion: plan.previousVersion,
              targetVersion: expectedVersion,
              configVersionChanged: false,
              requiresConfirmation: false,
              error: { phase: 'current', code: 'state_version_conflict', detail: record.runtimeVersion },
            }
          : undefined,
    })
    stopWatchdog()
    scheduleWatchdog()
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

  type RoundOutcome =
    | { kind: 'ready' }
    | { kind: 'exited'; role: 'qdrant' | 'engine'; code: number | null | undefined; log: string }
    | { kind: 'timeout'; role: 'qdrant' | 'engine' }

  /** One attempt: Qdrant first, the engine second. Killed children are the
   * caller's business, so a retry can rebuild the round from planPorts. */
  const runRound = async (ports: PortPlan, deadline: number): Promise<RoundOutcome> => {
    let qdrantExit: number | null | undefined
    const qdrantSpawn = spawnChild(qdrantRequest(ports), 'qdrant.log', (code) => {
      if (qdrant !== qdrantSpawn.child) return
      qdrantExit = code ?? -1
      crash('qdrant', code)
    })
    qdrant = qdrantSpawn.child
    const qdrantReady = await waitFor(
      () => probe(`http://127.0.0.1:${ports.qdrantHttp}/readyz`),
      () => qdrant,
      () => qdrantExit !== undefined,
      deadline,
    )
    if (qdrantReady !== 'ready') {
      return qdrantReady === 'exited'
        ? { kind: 'exited', role: 'qdrant', code: qdrantExit, log: qdrantSpawn.appended() }
        : { kind: 'timeout', role: 'qdrant' }
    }

    let engineExit: number | null | undefined
    const engineSpawn = spawnChild(engineRequest(ports, token), 'engine.log', (code) => {
      if (engine !== engineSpawn.child) return
      engineExit = code ?? -1
      crash('engine', code)
    })
    engine = engineSpawn.child
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
      deadline,
    )
    if (engineReady !== 'ready') {
      return engineReady === 'exited'
        ? { kind: 'exited', role: 'engine', code: engineExit, log: engineSpawn.appended() }
        : { kind: 'timeout', role: 'engine' }
    }
    return { kind: 'ready' }
  }

  const start = async (budgetMs: number): Promise<RuntimeStatusView> => {
    stopWatchdog()
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

    let preferred: Partial<PortPlan> | undefined = options.preferredPorts
    let retried = false
    // One deadline for Qdrant + knowledge: a slow first role cannot borrow a
    // fresh budget for the second.
    const deadline = nowMs() + budgetMs
    for (;;) {
      const planned = await planPorts({
        preferred,
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

      const outcome = await runRound(ports, deadline)
      if (outcome.kind === 'ready') {
        writeJson(statePath, {
          version: 1,
          pid: engine?.pid ?? null,
          qdrantPid: qdrant?.pid ?? null,
          runtimeVersion,
          token,
          ports,
          startedAt: now(),
        })
        applyCurrent(runtimeVersion, currentPlan(runtimeVersion))
        onReady?.()
        setPhase({ phase: 'ready', adopted: false, error: undefined, logTail: currentLogTail() })
        return status
      }

      // Only a bind conflict earns the one retry: a real startup failure must
      // not double its own failure time.
      if (!retried && outcome.kind === 'exited' && BIND_FAILURE.test(outcome.log)) {
        retried = true
        const children = [qdrant, engine]
        killChildren()
        await Promise.all(children.map((child) => whenExited(child)))
        const next = { ...ports }
        const key = outcome.role === 'qdrant' ? 'qdrantHttp' : 'knowledge'
        next[key] = ports[key] + 1
        preferred = next
        continue
      }

      const suffix = retried ? ' after one retry' : ''
      return outcome.kind === 'exited'
        ? fail(outcome.role, `${outcome.role}_exited`, `exit ${String(outcome.code)}${suffix}`)
        : fail(outcome.role, `${outcome.role}_not_ready`)
    }
  }

  const ensure = async (request?: { readyTimeoutMs?: number }): Promise<RuntimeStatusView> => {
    disposed = false
    if (pendingDispose !== null) {
      timers.clear(pendingDispose)
      pendingDispose = null
    }
    if (status.phase === 'ready') return status
    if (startPromise) return startPromise
    const adopted = await adopt(runtimeVersion)
    if (adopted) return adopted
    startPromise = start(request?.readyTimeoutMs ?? readyTimeoutMs).finally(() => {
      startPromise = null
    })
    return startPromise
  }

  return {
    root,
    ensure,
    probe: () => probeService(runtimeVersion),
    adopt: () => adopt(runtimeVersion),
    status: () => status,
    retry: () => {
      stopWatchdog()
      setPhase({ phase: 'idle', error: undefined })
      return ensure()
    },
    rebind: (next) => {
      onReady = next
    },
    dispose() {
      // An adopted service is never torn down, in any phase: its record, lease,
      // and processes belong to the other host. Its watchdog keeps watching so
      // a reload cannot inherit a stale `ready`.
      if (status.adopted) return
      disposed = true
      stopWatchdog()
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
      // A plugin unload during host shutdown must not hold the process open for
      // the whole grace period; the host's Job still reaps the tree on exit.
      ;(pendingDispose as { unref?: () => void } | null)?.unref?.()
    },
  }
}

export function supervisorKey(root: string, runtimeVersion: string): string {
  return `__hrag_supervisor__:${root}:${runtimeVersion}`
}

const registry = globalThis as unknown as Record<string, unknown>

/** One supervisor per root and version, surviving plugin reloads. A reload
 * rebinds the ready hook first: the old package's listener is gone with it. */
export function getSupervisor(options: SupervisorOptions): Supervisor {
  const key = supervisorKey(options.root, options.runtimeVersion)
  const existing = registry[key] as Supervisor | undefined
  if (existing) {
    existing.rebind(options.onReady)
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

export function readLeaseRecord(root: string): LeaseRecord | null {
  try {
    return sanitizeLease(JSON.parse(readFileSync(join(stateDir(root), 'lease.json'), 'utf8')))
  } catch {
    return null
  }
}

export type LeaseOwner = 'none' | 'ours' | 'foreign' | 'stale'

/** Who owns the root's lease: a live other host, this process (a previous
 * supervisor for another version), a dead pid, or nobody. */
export function leaseOwner(
  root: string,
  isAlive: (pid: number) => boolean = defaultIsAlive,
): LeaseOwner {
  const lease = readLeaseRecord(root)
  if (!lease) return 'none'
  if (lease.pid === process.pid) return 'ours'
  return isAlive(lease.pid) ? 'foreign' : 'stale'
}

/** Another live host owns the root's lease. A lease written by this process is
 * ours (a previous supervisor for another version), so treat it as free. */
export function leaseHeldByOther(root: string, isAlive: (pid: number) => boolean = defaultIsAlive): boolean {
  return leaseOwner(root, isAlive) === 'foreign'
}

export function readLogTail(root: string): string {
  return [tailOf(join(logsDir(root), 'engine.log')), tailOf(join(logsDir(root), 'qdrant.log'))]
    .filter(Boolean)
    .join('\n')
    .trim()
}
