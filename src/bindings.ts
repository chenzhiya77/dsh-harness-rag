import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** One session's knowledge-base binding. `kbName` is display-only: it rides
 * along so tool results can name the library they searched. */
export interface Binding {
  kbId: string
  kbName?: string
  updatedAt: string
}

export interface BindingsFile {
  version: 1
  bindings: Record<string, Binding>
}

/** The fs slice this module needs; tests inject a failing writer. */
export interface BindingsFs {
  readFileSync(path: string, encoding: 'utf8'): string
  writeFileSync(path: string, data: string, encoding: 'utf8'): void
  renameSync(from: string, to: string): void
  mkdirSync(path: string, options: { recursive: true }): void
  copyFileSync(from: string, to: string): void
  existsSync(path: string): boolean
}

const defaultFs: BindingsFs = {
  readFileSync: (path, encoding) => readFileSync(path, encoding),
  writeFileSync: (path, data, encoding) => writeFileSync(path, data, encoding),
  renameSync: (from, to) => renameSync(from, to),
  mkdirSync: (path, options) => {
    mkdirSync(path, options)
  },
  copyFileSync: (from, to) => copyFileSync(from, to),
  existsSync: (path) => existsSync(path),
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Keep only well-formed bindings; an unknown version or shape degrades to an
 * empty table rather than dropping the file (the next write backs it up). */
export function sanitizeBindings(raw: unknown): Record<string, Binding> {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.bindings)) return {}
  const table: Record<string, Binding> = {}
  for (const [sessionId, value] of Object.entries(raw.bindings)) {
    if (!sessionId.trim() || !isRecord(value)) continue
    const kbId = typeof value.kbId === 'string' ? value.kbId.trim() : ''
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt.trim() : ''
    if (!kbId || !updatedAt) continue
    const kbName = typeof value.kbName === 'string' ? value.kbName.trim() : ''
    table[sessionId] = kbName ? { kbId, kbName, updatedAt } : { kbId, updatedAt }
  }
  return table
}

export interface KbResolution {
  kbId: string
  source: 'arg' | 'session' | 'default'
}

/** kb_id resolution order: tool argument, then the session binding, then the
 * configured default. Blank values never win a tier. */
export function resolveKbId(input: {
  argKbId?: string
  sessionId?: string
  bindings: Record<string, Binding>
  defaultKbId?: string
}): KbResolution | null {
  const arg = input.argKbId?.trim()
  if (arg) return { kbId: arg, source: 'arg' }
  const bound = input.sessionId ? input.bindings[input.sessionId]?.kbId.trim() : ''
  if (bound) return { kbId: bound, source: 'session' }
  const fallback = input.defaultKbId?.trim()
  if (fallback) return { kbId: fallback, source: 'default' }
  return null
}

/** `<home>/harness-rag/bindings.json`, home defaulting to `$DSH_HOME` or `~/.dsh`. */
export function bindingsPath(homeDir: string): string {
  return join(homeDir, 'harness-rag', 'bindings.json')
}

export function resolveDshHome(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.DSH_HOME?.trim()
  return configured || join(homedir(), '.dsh')
}

export interface BindingsStore {
  readonly path: string
  loadSync(): void
  get(sessionId: string): Binding | undefined
  list(): Array<{ sessionId: string } & Binding>
  set(sessionId: string, kbId: string, kbName?: string): Promise<void>
  delete(sessionId: string): Promise<void>
}

/** Durable session→kb bindings. Reads are synchronous against memory (tool
 * dispatch must not await I/O); writes update memory first and land through a
 * serial, atomic replace. */
export function createBindingsStore(options: {
  homeDir?: string
  fs?: BindingsFs
  now?: () => string
} = {}): BindingsStore {
  const fs = options.fs ?? defaultFs
  const now = options.now ?? (() => new Date().toISOString())
  const path = bindingsPath(options.homeDir ?? resolveDshHome())

  let table: Record<string, Binding> = {}
  let loaded = false
  let backupPending = false
  let writes: Promise<void> = Promise.resolve()
  let sequence = 0

  const writeNow = (): void => {
    fs.mkdirSync(dirname(path), { recursive: true })
    if (backupPending && fs.existsSync(path)) {
      fs.copyFileSync(path, `${path}.bak`)
      backupPending = false
    }
    const payload: BindingsFile = { version: 1, bindings: table }
    const temp = `${path}.tmp-${process.pid}-${sequence++}`
    fs.writeFileSync(temp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    fs.renameSync(temp, path)
  }

  const enqueue = (): Promise<void> => {
    const run = writes.then(writeNow)
    writes = run.catch(() => {})
    return run
  }

  return {
    path,
    loadSync() {
      if (loaded) return
      loaded = true
      let text: string
      try {
        text = fs.readFileSync(path, 'utf8')
      } catch {
        table = {}
        return
      }
      try {
        table = sanitizeBindings(JSON.parse(text))
      } catch {
        table = {}
        backupPending = true
      }
    },
    get(sessionId) {
      return table[sessionId]
    },
    list() {
      return Object.entries(table).map(([sessionId, binding]) => ({ sessionId, ...binding }))
    },
    set(sessionId, kbId, kbName) {
      const id = kbId.trim()
      const name = kbName?.trim()
      table[sessionId] = name ? { kbId: id, kbName: name, updatedAt: now() } : { kbId: id, updatedAt: now() }
      return enqueue()
    },
    delete(sessionId) {
      if (!(sessionId in table)) return Promise.resolve()
      delete table[sessionId]
      return enqueue()
    },
  }
}
