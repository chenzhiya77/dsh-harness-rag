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
    extract: async (input) => {
      seen.push({ zipPath: input.zipPath, version: input.version })
      return { ok: true, dir: join(input.runtimeRoot, input.version), reused: false }
    },
  })

  assert.deepEqual(outcome, { kind: 'ok' })
  assert.deepEqual(seen, [{ zipPath: zip, version: req.version }])
})

test('provision: an installed runtime is reused without touching the zip', async () => {
  const req = request({ sourceZip: join(tmpdir(), 'hrag-nope', 'missing.zip') })
  const installed = join(req.root, 'runtime', req.version)
  mkdirSync(installed, { recursive: true })
  writeFileSync(join(installed, RUNTIME_MANIFEST), '{}')

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
  const installed = join(req.root, 'runtime', req.version)
  mkdirSync(installed, { recursive: true })
  writeFileSync(join(installed, RUNTIME_MANIFEST), '{}')

  const outcome = await ensureRuntime(req)

  assert.deepEqual(outcome, { kind: 'ok' })
})
