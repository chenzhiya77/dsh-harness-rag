import { createHash } from 'node:crypto'
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  statfsSync,
  statSync,
  unlinkSync,
  type WriteStream,
} from 'node:fs'
import { dirname } from 'node:path'

export type DownloadPhase = 'download' | 'extract' | 'verify'

/** One progress tick. `total` is the manifest size for downloads and the
 * archive's uncompressed total for extraction, so bars stay monotone. */
export interface DownloadProgress {
  phase: DownloadPhase
  received: number
  total: number
}

export type DownloadFailure =
  | 'invalid_url'
  | 'no_space'
  | 'network'
  | 'size_mismatch'
  | 'sha256_mismatch'
  | 'aborted'

export type DownloadResult = { ok: true; path: string } | { ok: false; code: DownloadFailure; detail?: string }

export interface DownloadRequest {
  urls: string[]
  size: number
  unpackedSize: number
  sha256: string
  targetPath: string
  signal?: AbortSignal
  onProgress?: (event: DownloadProgress) => void
  fetchImpl?: typeof fetch
  freeBytes?: (path: string) => number | null
  /** Milliseconds between retries of the same URL. */
  retryDelayMs?: number
  /** Total attempts per URL: the first try plus retries. */
  attempts?: number
}

type Attempt =
  | { kind: 'ok' }
  | { kind: 'aborted' }
  | { kind: 'retry'; code: DownloadFailure; detail: string }
  | { kind: 'corrupt'; code: DownloadFailure; detail: string }

/** https everywhere, plus plain http on loopback so tests can stub the origin. */
export function isFetchableUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    if (url.protocol !== 'http:') return false
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]'
  } catch {
    return false
  }
}

function freeBytesAt(path: string): number | null {
  try {
    const stats = statfsSync(path)
    return stats.bavail * stats.bsize
  } catch {
    return null
  }
}

function removeIfPresent(path: string): void {
  try {
    unlinkSync(path)
  } catch {
    // already gone
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/** Write one chunk and wait for it to reach the disk, so an abort keeps every
 * byte reported so far (and the kept file stays a true prefix). */
export function writeChunk(stream: WriteStream, chunk: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.write(chunk, (error) => (error ? reject(error) : resolve()))
  })
}

export function endStream(stream: WriteStream): Promise<void> {
  return new Promise((resolve) => {
    stream.once('error', () => resolve())
    stream.end(() => resolve())
  })
}

async function sha256OfFile(path: string, request: DownloadRequest): Promise<string> {
  const hash = createHash('sha256')
  let received = 0
  for await (const chunk of createReadStream(path)) {
    const buffer = chunk as Buffer
    hash.update(buffer)
    received += buffer.length
    request.onProgress?.({ phase: 'verify', received, total: request.size })
  }
  return hash.digest('hex')
}

/** One request. A resume keeps `.part` on failures, a corrupt body drops it so
 * the next attempt starts clean. */
async function attemptOnce(url: string, request: DownloadRequest, doFetch: typeof fetch): Promise<Attempt> {
  const partPath = `${request.targetPath}.part`
  const offset = existsSync(partPath) ? statSync(partPath).size : 0
  let response: Response
  try {
    response = await doFetch(url, {
      headers: offset > 0 ? { range: `bytes=${offset}-` } : undefined,
      signal: request.signal,
    })
  } catch (error) {
    return request.signal?.aborted ? { kind: 'aborted' } : { kind: 'retry', code: 'network', detail: messageOf(error) }
  }
  if (response.status === 416) {
    removeIfPresent(partPath)
    return { kind: 'corrupt', code: 'network', detail: 'range not satisfiable' }
  }
  if (!response.ok || !response.body) {
    return { kind: 'retry', code: 'network', detail: `HTTP ${response.status}` }
  }
  let received = offset > 0 && response.status === 206 ? offset : 0
  const out = createWriteStream(partPath, { flags: received > 0 ? 'a' : 'w' })
  try {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      received += chunk.length
      await writeChunk(out, chunk)
      request.onProgress?.({ phase: 'download', received, total: request.size })
    }
    await endStream(out)
  } catch (error) {
    await endStream(out)
    return request.signal?.aborted ? { kind: 'aborted' } : { kind: 'retry', code: 'network', detail: messageOf(error) }
  }
  const actual = statSync(partPath).size
  if (request.size > 0 && actual !== request.size) {
    return { kind: 'corrupt', code: 'size_mismatch', detail: `expected ${request.size} bytes, received ${actual}` }
  }
  const digest = await sha256OfFile(partPath, request)
  if (digest !== request.sha256) {
    return { kind: 'corrupt', code: 'sha256_mismatch', detail: `expected ${request.sha256}, got ${digest}` }
  }
  removeIfPresent(request.targetPath)
  renameSync(partPath, request.targetPath)
  return { kind: 'ok' }
}

/** Mirrors in order, retries per mirror, resume via `.part`. The caller aborts
 * through `signal`; an abort never deletes the partial download. */
export async function downloadPack(request: DownloadRequest): Promise<DownloadResult> {
  const attempts = request.attempts ?? 4
  const delay = request.retryDelayMs ?? 250
  const doFetch = request.fetchImpl ?? fetch
  const partPath = `${request.targetPath}.part`
  mkdirSync(dirname(request.targetPath), { recursive: true })

  if (request.size > 0) {
    const required = Math.ceil(request.size + request.unpackedSize * 1.1)
    const free = (request.freeBytes ?? freeBytesAt)(dirname(request.targetPath))
    if (free !== null && free < required) {
      return { ok: false, code: 'no_space', detail: `needs ${required} bytes, ${free} available` }
    }
  }

  const urls = request.urls.filter(isFetchableUrl)
  if (urls.length === 0) return { ok: false, code: 'invalid_url', detail: 'no https download url' }

  let failure: DownloadFailure = 'network'
  let detail = ''
  for (const url of urls) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      if (request.signal?.aborted) return { ok: false, code: 'aborted' }
      if (attempt > 1 && delay > 0) await sleep(delay)
      const outcome = await attemptOnce(url, request, doFetch)
      if (outcome.kind === 'ok') return { ok: true, path: request.targetPath }
      if (outcome.kind === 'aborted') return { ok: false, code: 'aborted' }
      failure = outcome.code
      detail = outcome.detail
      if (outcome.kind === 'corrupt') removeIfPresent(partPath)
    }
  }
  return { ok: false, code: failure, detail }
}
