import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { dirname, join } from 'node:path'
import { downloadPack, freeBytesAt, type DownloadProgress } from './download.ts'
import { isUnpublished, type RuntimePack } from './manifest.ts'
import { downloadsDir, runtimeDir, runtimeRoot, stateDir } from './paths.ts'
import { RUNTIME_MANIFEST, extractPack } from './zip.ts'
import type { EnsureStep } from './supervisor.ts'

export interface ProvisionRequest {
  root: string
  version: string
  platform: string
  pack: RuntimePack
  signal?: AbortSignal
  onProgress?: (progress: DownloadProgress) => void
  /** Dev-only local zip (`DSH_HARNESS_RAG_PACK`, spec §4.4): skips the
   * download and unpacks the file as-is. */
  sourceZip?: string
  /** Background preparation never waits for another host's lock. */
  background?: boolean
  /** Test seam for the unpack step. */
  extract?: typeof extractPack
  /** Test seams for the lock and the local space check. */
  isAlive?: (pid: number) => boolean
  nowMs?: () => number
  lockWaitMs?: number
  lockPollMs?: number
  sleep?: (ms: number) => Promise<void>
  freeBytes?: (path: string) => number | null
}

const LOCK_FILE = 'provision.lock'
const LOCK_STALE_MS = 15 * 60_000
const LOCK_WAIT_MS = 10 * 60_000
const LOCK_POLL_MS = 500

interface LockRecord {
  version: 1
  owner: string
  pid: number
  startedAt: string
}

function defaultIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function readLock(path: string): LockRecord | null {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    if (!raw || raw.version !== 1) return null
    if (typeof raw.owner !== 'string' || !raw.owner) return null
    if (typeof raw.pid !== 'number' || !Number.isInteger(raw.pid) || raw.pid <= 0) return null
    if (typeof raw.startedAt !== 'string' || !raw.startedAt) return null
    return { version: 1, owner: raw.owner, pid: raw.pid, startedAt: raw.startedAt }
  } catch {
    return null
  }
}

type LockOutcome =
  | { kind: 'owned'; release: () => void }
  | { kind: 'held' }
  | { kind: 'reused' }

async function acquireLock(request: ProvisionRequest): Promise<LockOutcome> {
  const path = join(stateDir(request.root), LOCK_FILE)
  const manifest = join(runtimeDir(request.root, request.version), RUNTIME_MANIFEST)
  const isAlive = request.isAlive ?? defaultIsAlive
  const nowMs = request.nowMs ?? Date.now
  const sleep = request.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  mkdirSync(dirname(path), { recursive: true })

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const owner = randomBytes(8).toString('hex')
      const fd = openSync(path, 'wx')
      try {
        const record: LockRecord = {
          version: 1,
          owner,
          pid: process.pid,
          startedAt: new Date(nowMs()).toISOString(),
        }
        writeSync(fd, `${JSON.stringify(record)}\n`)
      } finally {
        closeSync(fd)
      }
      return {
        kind: 'owned',
        release: () => {
          const current = readLock(path)
          if (current?.owner === owner) rmSync(path, { force: true })
        },
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const current = readLock(path)
      const startedAt = current ? Date.parse(current.startedAt) : Number.NaN
      const stale =
        !current ||
        !Number.isFinite(startedAt) ||
        nowMs() - startedAt > LOCK_STALE_MS ||
        !isAlive(current.pid)
      if (stale) {
        rmSync(path, { force: true })
        continue
      }
      if (!request.background) {
        const deadline = nowMs() + (request.lockWaitMs ?? LOCK_WAIT_MS)
        const poll = request.lockPollMs ?? LOCK_POLL_MS
        while (nowMs() < deadline) {
          if (existsSync(manifest)) return { kind: 'reused' }
          await sleep(poll)
        }
      }
      return { kind: 'held' }
    }
  }
  return { kind: 'held' }
}

function manifestMatches(root: string, request: ProvisionRequest): { ok: true } | { ok: false; detail: string } {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(runtimeDir(root, request.version), RUNTIME_MANIFEST), 'utf8'))
  } catch {
    return { ok: false, detail: `${RUNTIME_MANIFEST} is missing or unreadable` }
  }
  const record = raw as { runtimeVersion?: unknown; configVersion?: unknown } | null
  if (record?.runtimeVersion !== request.version) {
    return { ok: false, detail: `runtimeVersion ${String(record?.runtimeVersion)} != ${request.version}` }
  }
  if (record?.configVersion !== request.pack.configVersion) {
    return { ok: false, detail: `configVersion ${String(record?.configVersion)} != ${request.pack.configVersion}` }
  }
  return { ok: true }
}

/** Download to `downloads/`, then unpack into `runtime/<version>`. Both halves
 * are resumable/idempotent, so a retry after a failure picks up where it
 * stopped and a finished runtime is never downloaded again. A cross-process
 * lock keeps two hosts from unpacking the same version at once. */
export async function ensureRuntime(request: ProvisionRequest): Promise<EnsureStep> {
  const lock = await acquireLock(request)
  if (lock.kind === 'held') return { kind: 'failed', code: 'provision_held' }
  if (lock.kind === 'reused') {
    const matched = manifestMatches(request.root, request)
    return matched.ok
      ? { kind: 'ok' }
      : { kind: 'failed', code: 'manifest_mismatch', detail: matched.detail }
  }

  try {
    const installed = runtimeDir(request.root, request.version)
    if (existsSync(join(installed, RUNTIME_MANIFEST))) {
      const matched = manifestMatches(request.root, request)
      return matched.ok
        ? { kind: 'ok' }
        : { kind: 'failed', code: 'manifest_mismatch', detail: matched.detail }
    }

    const sourceZip = request.sourceZip?.trim() ?? ''
    if (!sourceZip && isUnpublished(request.pack)) return { kind: 'failed', code: 'pack_missing' }

    let zipPath = sourceZip
    if (zipPath) {
      if (!existsSync(zipPath)) {
        return { kind: 'failed', code: 'pack_missing', detail: `overridden pack not found: ${zipPath}` }
      }
      const required = Math.ceil(statSync(zipPath).size + request.pack.unpackedSize * 1.1)
      const free = (request.freeBytes ?? freeBytesAt)(request.root)
      if (free !== null && free < required) {
        return { kind: 'failed', code: 'no_space', detail: `needs ${required} bytes, ${free} available` }
      }
    } else {
      zipPath = join(downloadsDir(request.root), `harness-rag-runtime-${request.platform}-${request.version}.zip`)
      const downloaded = await downloadPack({
        urls: request.pack.urls,
        size: request.pack.size,
        unpackedSize: request.pack.unpackedSize,
        sha256: request.pack.sha256,
        targetPath: zipPath,
        signal: request.signal,
        onProgress: request.onProgress,
      })
      if (!downloaded.ok) return { kind: 'failed', code: downloaded.code, detail: downloaded.detail }
    }

    const extract = request.extract ?? extractPack
    const extracted = await extract({
      zipPath,
      runtimeRoot: runtimeRoot(request.root),
      version: request.version,
      signal: request.signal,
      onProgress: request.onProgress,
    })
    if (!extracted.ok) return { kind: 'failed', code: extracted.code, detail: extracted.detail }

    const matched = manifestMatches(request.root, request)
    if (!matched.ok) {
      rmSync(installed, { recursive: true, force: true })
      return { kind: 'failed', code: 'manifest_mismatch', detail: matched.detail }
    }
    return { kind: 'ok' }
  } finally {
    lock.release()
  }
}
