import type { ChildHandle, SpawnFn, SpawnRequest } from './process.ts'

/** The slice of `ctx.subprocess` this plugin consumes (see the host's
 * `@deepseek-ai/dsh-subprocess` README): fully specified spawn, bounded
 * collected output, and a provider-owned termination range. */
export interface HostReadResult {
  text: string
  offset: number
  lossy: boolean
}

export interface HostStream {
  readFrom(offset: number): HostReadResult
}

export interface HostSpawnSpec {
  argv: string[]
  cwd: string
  stdio: {
    stdin: 'ignore'
    stdout: { maxBytes: number }
    stderr: { maxBytes: number }
  }
  graceMs: number
  env?: Record<string, string>
}

export interface HostHandle {
  done: Promise<{ exitCode: number | null; signal: string | null }>
  collected?: { stdout?: HostStream; stderr?: HostStream }
  terminate(): void | Promise<void>
  waitForExit(): Promise<void>
}

export interface HostSubprocess {
  spawn(spec: HostSpawnSpec): HostHandle
}

const MAX_LINE_BUFFER = 256 * 1024

/** Adapt the host seam to the narrow handle the supervisor drives.
 *
 * Two host facts shape this: a handle exposes no pid (target identity stays
 * provider-private), and output arrives as a bounded collected tail rather
 * than a live stream. So `pid` is undefined and output is polled into the
 * existing log listeners; the host's own job still owns the process tree. */
export function createHostSpawn(
  host: HostSubprocess,
  options: { pollMs?: number; graceMs?: number } = {},
): SpawnFn {
  const pollMs = options.pollMs ?? 250
  const graceMs = options.graceMs ?? 5_000

  return (request: SpawnRequest): ChildHandle => {
    const listeners = { stdout: [] as Array<(chunk: string) => void>, stderr: [] as Array<(chunk: string) => void> }
    const exitListeners: Array<(code: number | null) => void> = []
    const offsets = { stdout: 0, stderr: 0 }
    let timer: ReturnType<typeof setInterval> | null = null
    let finished = false

    const handle = host.spawn({
      argv: [request.command, ...request.args],
      cwd: request.cwd,
      stdio: { stdin: 'ignore', stdout: { maxBytes: MAX_LINE_BUFFER }, stderr: { maxBytes: MAX_LINE_BUFFER } },
      graceMs,
      env: request.env,
    })

    const drain = (): void => {
      for (const name of ['stdout', 'stderr'] as const) {
        const stream = handle.collected?.[name]
        if (!stream) continue
        const read = stream.readFrom(offsets[name])
        offsets[name] = read.offset
        if (!read.text) continue
        for (const listener of listeners[name]) listener(read.text)
      }
    }

    const finish = (code: number | null): void => {
      if (finished) return
      finished = true
      if (timer) clearInterval(timer)
      timer = null
      drain()
      for (const listener of exitListeners) listener(code)
    }

    const poll = (): void => {
      if (!finished && timer === null) timer = setInterval(drain, pollMs)
    }

    void handle.done.then(
      (outcome) => finish(outcome.exitCode),
      () => finish(-1),
    )

    return {
      pid: undefined,
      onData(stream, listener) {
        listeners[stream].push(listener)
        poll()
      },
      onExit(listener) {
        if (finished) listener(-1)
        else exitListeners.push(listener)
      },
      kill() {
        void handle.terminate()
      },
    }
  }
}
