import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { downloadPack, type DownloadProgress } from '../src/runtime/download.ts'
import { extractPack } from '../src/runtime/zip.ts'

const sha256 = (data: Buffer): string => createHash('sha256').update(data).digest('hex')

type Handler = (req: IncomingMessage, res: ServerResponse, nth: number) => void

interface Stub {
  url: string
  requests: () => number
  ranges: Array<string | undefined>
}

async function serve(t: TestContext, handler: Handler): Promise<Stub> {
  const ranges: Array<string | undefined> = []
  let count = 0
  const server = createServer((req, res) => {
    count += 1
    ranges.push(req.headers.range)
    handler(req, res, count)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })
  const port = (server.address() as AddressInfo).port
  return { url: `http://127.0.0.1:${port}/runtime.zip`, requests: () => count, ranges }
}

function body(bytes: number): Buffer {
  return randomBytes(bytes)
}

function target(): { path: string; part: string } {
  const root = mkdtempSync(join(tmpdir(), 'hrag-download-'))
  const path = join(root, 'downloads', 'runtime.zip')
  mkdirSync(dirname(path), { recursive: true })
  return { path, part: `${path}.part` }
}

function send(res: ServerResponse, data: Buffer): void {
  res.writeHead(200, { 'content-length': data.length })
  res.end(data)
}

// ── happy path ──────────────────────────────────────────────────────────────

test('download: streams the pack, verifies it, and renames .part away', async (t) => {
  const data = body(4096)
  const stub = await serve(t, (_req, res) => send(res, data))
  const file = target()
  const progress: DownloadProgress[] = []

  const result = await downloadPack({
    urls: [stub.url],
    size: data.length,
    unpackedSize: 8192,
    sha256: sha256(data),
    targetPath: file.path,
    retryDelayMs: 0,
    onProgress: (event) => progress.push(event),
  })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.path, file.path)
  assert.deepEqual(readFileSync(file.path), data)
  assert.equal(existsSync(file.part), false)
  assert.ok(progress.some((event) => event.phase === 'download' && event.received === data.length))
  assert.ok(progress.some((event) => event.phase === 'verify' && event.received === data.length))
})

test('download: a sha256 mismatch discards the body instead of keeping it', async (t) => {
  const data = body(1024)
  const stub = await serve(t, (_req, res) => send(res, data))
  const file = target()

  const result = await downloadPack({
    urls: [stub.url],
    size: data.length,
    unpackedSize: 0,
    sha256: 'a'.repeat(64),
    targetPath: file.path,
    retryDelayMs: 0,
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'sha256_mismatch')
  assert.equal(existsSync(file.path), false)
  assert.equal(existsSync(file.part), false)
})

test('download: a short body is size_mismatch and is not renamed', async (t) => {
  const data = body(900)
  const stub = await serve(t, (_req, res) => send(res, data))
  const file = target()

  const result = await downloadPack({
    urls: [stub.url],
    size: 1000,
    unpackedSize: 0,
    sha256: sha256(data),
    targetPath: file.path,
    retryDelayMs: 0,
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'size_mismatch')
  assert.equal(existsSync(file.path), false)
})

// ── mirrors and retries ─────────────────────────────────────────────────────

test('download: a dead mirror is retried four times, then the next mirror serves', async (t) => {
  const data = body(2048)
  const dead = await serve(t, (_req, res) => {
    res.writeHead(500)
    res.end('nope')
  })
  const good = await serve(t, (_req, res) => send(res, data))
  const file = target()

  const result = await downloadPack({
    urls: [dead.url, good.url],
    size: data.length,
    unpackedSize: 0,
    sha256: sha256(data),
    targetPath: file.path,
    retryDelayMs: 0,
  })

  assert.equal(result.ok, true)
  assert.equal(dead.requests(), 4, 'first attempt plus three retries')
  assert.equal(good.requests(), 1)
  assert.deepEqual(readFileSync(file.path), data)
})

test('download: exhausting the retries reports network with the last status', async (t) => {
  const stub = await serve(t, (_req, res) => {
    res.writeHead(503)
    res.end()
  })
  const file = target()

  const result = await downloadPack({
    urls: [stub.url],
    size: 16,
    unpackedSize: 0,
    sha256: 'b'.repeat(64),
    targetPath: file.path,
    retryDelayMs: 0,
  })

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.code, 'network')
    assert.match(result.detail ?? '', /503/)
  }
  assert.equal(stub.requests(), 4)
})

// ── resume ──────────────────────────────────────────────────────────────────

test('download: an existing .part resumes with a Range request (206 append)', async (t) => {
  const data = body(4096)
  const stub = await serve(t, (req, res) => {
    const range = req.headers.range
    if (range === `bytes=1024-`) {
      res.writeHead(206, {
        'content-range': `bytes 1024-${data.length - 1}/${data.length}`,
        'content-length': data.length - 1024,
      })
      res.end(data.subarray(1024))
      return
    }
    send(res, data)
  })
  const file = target()
  writeFileSync(file.part, data.subarray(0, 1024))

  const result = await downloadPack({
    urls: [stub.url],
    size: data.length,
    unpackedSize: 0,
    sha256: sha256(data),
    targetPath: file.path,
    retryDelayMs: 0,
  })

  assert.equal(result.ok, true)
  assert.equal(stub.ranges[0], 'bytes=1024-')
  assert.deepEqual(readFileSync(file.path), data)
  assert.equal(existsSync(file.part), false)
})

test('download: a server that ignores Range (200) restarts the file', async (t) => {
  const data = body(4096)
  const stub = await serve(t, (_req, res) => send(res, data))
  const file = target()
  writeFileSync(file.part, Buffer.alloc(1024, 7))

  const result = await downloadPack({
    urls: [stub.url],
    size: data.length,
    unpackedSize: 0,
    sha256: sha256(data),
    targetPath: file.path,
    retryDelayMs: 0,
  })

  assert.equal(result.ok, true)
  assert.deepEqual(readFileSync(file.path), data)
})

// ── abort and space ─────────────────────────────────────────────────────────

test('download: aborting keeps the partial file for the next run', async (t) => {
  const block = randomBytes(64 * 1024)
  const total = 16 * block.length
  const stub = await serve(t, (_req, res) => {
    res.writeHead(200, { 'content-length': total })
    const timer = setInterval(() => {
      if (res.destroyed || res.writableEnded) return
      res.write(block)
    }, 5)
    res.on('close', () => clearInterval(timer))
  })
  const file = target()
  const controller = new AbortController()
  let ticks = 0

  const result = await downloadPack({
    urls: [stub.url],
    size: total,
    unpackedSize: 0,
    sha256: 'c'.repeat(64),
    targetPath: file.path,
    retryDelayMs: 0,
    signal: controller.signal,
    onProgress: () => {
      ticks += 1
      if (ticks >= 2) controller.abort()
    },
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'aborted')
  assert.equal(existsSync(file.path), false)
  assert.equal(existsSync(file.part), true)
  const kept = readFileSync(file.part)
  assert.ok(kept.length > 0, 'kept bytes')
  assert.deepEqual(kept, Buffer.concat(Array.from({ length: total / block.length }, () => block)).subarray(0, kept.length))
})

test('download: insufficient free space fails before any request', async (t) => {
  const stub = await serve(t, (_req, res) => res.end())
  const file = target()

  const result = await downloadPack({
    urls: [stub.url],
    size: 1024,
    unpackedSize: 1024,
    sha256: 'd'.repeat(64),
    targetPath: file.path,
    retryDelayMs: 0,
    freeBytes: () => 100,
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'no_space')
  assert.equal(stub.requests(), 0)
})

// ── url policy ──────────────────────────────────────────────────────────────

test('download: only https and loopback http are fetched', async (t) => {
  const stub = await serve(t, (_req, res) => res.end())
  const file = target()

  const result = await downloadPack({
    urls: ['ftp://example.com/x.zip', 'http://example.com/x.zip', stub.url.replace('127.0.0.1', 'evil.test')],
    size: 16,
    unpackedSize: 0,
    sha256: 'e'.repeat(64),
    targetPath: file.path,
    retryDelayMs: 0,
  })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'invalid_url')
  assert.equal(stub.requests(), 0)
})

// ── zip extraction ──────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index++) {
    let value = index
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

function crc32(data: Buffer): number {
  let value = 0xffffffff
  for (const byte of data) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  data: Buffer
  symlink?: boolean
}

/** A stored-only writer, enough to exercise the extractor without a second
 * dependency. CRC and sizes are real, so yauzl validates them. */
function makeZip(entries: ZipEntry[]): Buffer {
  const parts: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const crc = crc32(entry.data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(entry.data.length, 18)
    local.writeUInt32LE(entry.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    parts.push(local, name, entry.data)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x0314, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(entry.data.length, 20)
    central.writeUInt32LE(entry.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE((entry.symlink ? 0o120777 : 0o100644) * 0x10000, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)

    offset += 30 + name.length + entry.data.length
  }
  const directory = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(directory.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, directory, eocd])
}

function zipFixture(entries: ZipEntry[]): { root: string; runtimeRoot: string; zipPath: string; version: string } {
  const root = mkdtempSync(join(tmpdir(), 'hrag-zip-'))
  const zipPath = join(root, 'pack.zip')
  writeFileSync(zipPath, makeZip(entries))
  return { root, runtimeRoot: join(root, 'runtime'), zipPath, version: '2.1.0-1' }
}

const MANIFEST = Buffer.from('{"version":1}')

test('extract: unpacks the pack and leaves no temporary directory', async () => {
  const fixture = zipFixture([
    { name: 'runtime-manifest.json', data: MANIFEST },
    { name: 'python/python.exe', data: Buffer.from('MZ') },
  ])

  const result = await extractPack(fixture)

  assert.equal(result.ok, true)
  const dir = join(fixture.runtimeRoot, fixture.version)
  if (result.ok) {
    assert.equal(result.dir, dir)
    assert.equal(result.reused, false)
  }
  assert.deepEqual(readFileSync(join(dir, 'runtime-manifest.json')), MANIFEST)
  assert.deepEqual(readFileSync(join(dir, 'python', 'python.exe')), Buffer.from('MZ'))
  assert.equal(existsSync(`${dir}.tmp`), false)
})

test('extract: an entry that escapes the target is rejected', async () => {
  for (const name of ['../evil.txt', 'C:/evil.txt']) {
    const fixture = zipFixture([
      { name: 'runtime-manifest.json', data: MANIFEST },
      { name, data: Buffer.from('x') },
    ])
    const result = await extractPack(fixture)
    assert.equal(result.ok, false, name)
    if (!result.ok) assert.ok(['zip_invalid', 'unsafe_entry'].includes(result.code), `${name}: ${result.code}`)
    assert.equal(existsSync(join(fixture.root, 'evil.txt')), false, name)
    assert.equal(existsSync(join(fixture.runtimeRoot, fixture.version)), false, name)
    assert.equal(existsSync(`${join(fixture.runtimeRoot, fixture.version)}.tmp`), false, name)
  }
})

test('extract: a symlink entry is refused', async () => {
  const fixture = zipFixture([
    { name: 'runtime-manifest.json', data: MANIFEST },
    { name: 'link', data: Buffer.from('../outside'), symlink: true },
  ])

  const result = await extractPack(fixture)

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'unsafe_entry')
  assert.equal(existsSync(join(fixture.runtimeRoot, fixture.version)), false)
})

test('extract: a truncated archive is zip_invalid and leaves nothing behind', async () => {
  const fixture = zipFixture([{ name: 'runtime-manifest.json', data: MANIFEST }])
  writeFileSync(fixture.zipPath, readFileSync(fixture.zipPath).subarray(0, 40))

  const result = await extractPack(fixture)

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'zip_invalid')
  assert.equal(existsSync(join(fixture.runtimeRoot, fixture.version)), false)
})

test('extract: a target without the manifest marker is discarded and re-extracted', async () => {
  const fixture = zipFixture([{ name: 'runtime-manifest.json', data: MANIFEST }])
  const dir = join(fixture.runtimeRoot, fixture.version)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'junk.txt'), 'stale')

  const result = await extractPack(fixture)

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.reused, false)
  assert.equal(existsSync(join(dir, 'junk.txt')), false)
  assert.deepEqual(readFileSync(join(dir, 'runtime-manifest.json')), MANIFEST)
})

test('extract: a complete target is reused without reading the archive', async () => {
  const fixture = zipFixture([{ name: 'runtime-manifest.json', data: MANIFEST }])
  const dir = join(fixture.runtimeRoot, fixture.version)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'runtime-manifest.json'), MANIFEST)
  writeFileSync(fixture.zipPath, 'not a zip at all')

  const result = await extractPack(fixture)

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.reused, true)
    assert.equal(result.dir, dir)
  }
})

test('extract: progress climbs to the uncompressed total', async () => {
  const fixture = zipFixture([
    { name: 'runtime-manifest.json', data: MANIFEST },
    { name: 'site-packages/big.bin', data: randomBytes(4096) },
  ])
  const progress: DownloadProgress[] = []

  const result = await extractPack({ ...fixture, onProgress: (event) => progress.push(event) })

  assert.equal(result.ok, true)
  const total = MANIFEST.length + 4096
  assert.ok(progress.length > 0)
  assert.ok(progress.every((event) => event.phase === 'extract' && event.total === total))
  assert.equal(progress.at(-1)?.received, total)
  for (let index = 1; index < progress.length; index++) {
    assert.ok(progress[index].received >= progress[index - 1].received)
  }
})

