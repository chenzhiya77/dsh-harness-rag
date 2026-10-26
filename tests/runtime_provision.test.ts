import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { RuntimePack } from '../src/runtime/manifest.ts'
import { ensureRuntime } from '../src/runtime/provision.ts'
import { RUNTIME_MANIFEST } from '../src/runtime/zip.ts'

function fakePack(overrides: Partial<RuntimePack> = {}): RuntimePack {
  return {
    runtimeVersion: '3.0.0-1',
    engineVersion: '0.1.0',
    engineCommit: 'deadbeef',
    pythonVersion: '3.12.13',
    qdrantVersion: '1.20.0',
    configVersion: 44,
    urls: ['https://example.test/pack.zip'],
    size: 10,
    unpackedSize: 20,
    sha256: 'a'.repeat(64),
    ...overrides,
  }
}

function request(overrides: Partial<Parameters<typeof ensureRuntime>[0]> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'hrag-provision-'))
  return {
    root,
    version: '3.0.0-1',
    platform: 'win32-x64',
    pack: fakePack(),
    ...overrides,
  }
}

function runtimeManifest(version = '3.0.0-1', configVersion = 44): string {
  return JSON.stringify({ format: 1, runtimeVersion: version, configVersion })
}

function writeInstalled(root: string, version = '3.0.0-1', configVersion = 44): string {
  const dir = join(root, 'runtime', version)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, RUNTIME_MANIFEST), runtimeManifest(version, configVersion))
  return dir
}

test('provision: a placeholder pack without a local override is pack_missing', async () => {
  const outcome = await ensureRuntime(
    request({ pack: fakePack({ urls: [], size: 0, unpackedSize: 0, sha256: '' }) }),
  )

  assert.deepEqual(outcome, { kind: 'failed', code: 'pack_missing' })
})

test('provision: a missing local override reports pack_missing with the path', async () => {
  const req = request({ sourceZip: join(tmpdir(), 'hrag-nope', 'missing.zip') })

  const outcome = await ensureRuntime(req)

  assert.equal(outcome.kind, 'failed')
  if (outcome.kind === 'failed') {
    assert.equal(outcome.code, 'pack_missing')
    assert.match(outcome.detail ?? '', /overridden pack not found/)
  }
})

test('provision: a local override skips the download and is unpacked as-is', async () => {
  const req = request()
  const zip = join(req.root, 'local-pack.zip')
  writeFileSync(zip, 'not a real zip')
  const seen: Array<{ zipPath: string; version: string }> = []

  const outcome = await ensureRuntime({
    ...req,
    sourceZip: zip,
    pack: fakePack({ urls: [], size: 0, unpackedSize: 0, sha256: '' }),
    freeBytes: () => 1_000_000_000,
    extract: async (input) => {
      seen.push({ zipPath: input.zipPath, version: input.version })
      const dir = join(input.runtimeRoot, input.version)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, RUNTIME_MANIFEST), runtimeManifest(input.version))
      return { ok: true, dir, reused: false }
    },
  })

  assert.deepEqual(outcome, { kind: 'ok' })
  assert.deepEqual(seen, [{ zipPath: zip, version: req.version }])
})

test('provision: an installed runtime is reused without touching the zip', async () => {
  const req = request({ sourceZip: join(tmpdir(), 'hrag-nope', 'missing.zip') })
  writeInstalled(req.root, req.version)

  const outcome = await ensureRuntime({
    ...req,
    extract: async () => {
      throw new Error('extract must not run')
    },
  })

  assert.deepEqual(outcome, { kind: 'ok' })
  assert.equal(existsSync(join(req.root, 'downloads')), false)
})

test('provision: an installed runtime starts even when the manifest is still unpublished', async () => {
  const req = request({ pack: fakePack({ urls: [], size: 0, unpackedSize: 0, sha256: '' }) })
  writeInstalled(req.root, req.version)

  const outcome = await ensureRuntime(req)

  assert.deepEqual(outcome, { kind: 'ok' })
})

test('provision: an installed runtime with a mismatched manifest is refused', async () => {
  const req = request()
  const dir = join(req.root, 'runtime', req.version)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, RUNTIME_MANIFEST), runtimeManifest('3.0.0-9'))

  const outcome = await ensureRuntime(req)

  assert.equal(outcome.kind, 'failed')
  if (outcome.kind === 'failed') assert.equal(outcome.code, 'manifest_mismatch')
})

test('provision: a local pack is checked against free space before extraction', async () => {
  const req = request()
  writeInstalled(req.root, '3.0.0-0')
  const zip = join(req.root, 'local-pack.zip')
  writeFileSync(zip, 'local')
  let extracted = 0

  const outcome = await ensureRuntime({
    ...req,
    sourceZip: zip,
    freeBytes: () => 0,
    extract: async () => {
      extracted += 1
      return { ok: true, dir: '', reused: false }
    },
  })

  assert.equal(outcome.kind, 'failed')
  if (outcome.kind === 'failed') assert.equal(outcome.code, 'no_space')
  assert.equal(extracted, 0)
  assert.equal(existsSync(join(req.root, 'runtime', '3.0.0-0')), true)
})

test('provision: a live lock blocks background preparation without waiting', async () => {
  const req = request()
  mkdirSync(join(req.root, 'state'), { recursive: true })
  writeFileSync(
    join(req.root, 'state', 'provision.lock'),
    JSON.stringify({ version: 1, owner: 'other', pid: process.pid, startedAt: new Date().toISOString() }),
  )
  let extracted = 0

  const outcome = await ensureRuntime({
    ...req,
    background: true,
    sourceZip: join(req.root, 'local-pack.zip'),
    extract: async () => {
      extracted += 1
      return { ok: true, dir: '', reused: false }
    },
  })

  assert.deepEqual(outcome, { kind: 'failed', code: 'provision_held' })
  assert.equal(extracted, 0)
})

test('provision: a stale lock is taken over', async () => {
  const req = request()
  mkdirSync(join(req.root, 'state'), { recursive: true })
  writeFileSync(
    join(req.root, 'state', 'provision.lock'),
    JSON.stringify({ version: 1, owner: 'dead', pid: 999_999, startedAt: new Date().toISOString() }),
  )
  const zip = join(req.root, 'local-pack.zip')
  writeFileSync(zip, 'local')
  let extracted = 0

  const outcome = await ensureRuntime({
    ...req,
    sourceZip: zip,
    isAlive: () => false,
    freeBytes: () => 1_000_000_000,
    extract: async (input) => {
      extracted += 1
      writeInstalled(req.root, input.version)
      return { ok: true, dir: join(input.runtimeRoot, input.version), reused: false }
    },
  })

  assert.deepEqual(outcome, { kind: 'ok' })
  assert.equal(extracted, 1)
})

test('provision: two foreground callers extract once and the waiter reuses the result', async () => {
  const req = request()
  const zip = join(req.root, 'local-pack.zip')
  writeFileSync(zip, 'local')
  let extracted = 0
  const extract = async (input: Parameters<NonNullable<Parameters<typeof ensureRuntime>[0]['extract']>>[0]) => {
    extracted += 1
    await new Promise((resolve) => setTimeout(resolve, 30))
    writeInstalled(req.root, input.version)
    return { ok: true as const, dir: join(input.runtimeRoot, input.version), reused: false }
  }

  const [first, second] = await Promise.all([
    ensureRuntime({ ...req, sourceZip: zip, freeBytes: () => 1_000_000_000, lockWaitMs: 2_000, lockPollMs: 5, extract }),
    ensureRuntime({ ...req, sourceZip: zip, freeBytes: () => 1_000_000_000, lockWaitMs: 2_000, lockPollMs: 5, extract }),
  ])

  assert.deepEqual(first, { kind: 'ok' })
  assert.deepEqual(second, { kind: 'ok' })
  assert.equal(extracted, 1)
  assert.equal(existsSync(join(req.root, 'state', 'provision.lock')), false)
})
