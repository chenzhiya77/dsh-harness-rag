import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadPack,
  planCurrent,
  readCurrent,
  readManifest,
  sanitizeCurrent,
  sanitizeFailed,
  sanitizeUpgrade,
  selectPack,
  validateManifest,
  writeCurrent,
} from '../src/runtime/manifest.ts'

const HASH = 'a'.repeat(64)
const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))

function pack(overrides: Record<string, unknown> = {}) {
  return {
    runtimeVersion: '2.1.0-1',
    engineVersion: '2.1.0',
    engineCommit: 'b34b2d572',
    pythonVersion: '3.12.13',
    qdrantVersion: '1.20.0',
    configVersion: 44,
    urls: ['https://example.com/runtime.zip'],
    size: 123,
    unpackedSize: 456,
    sha256: HASH,
    ...overrides,
  }
}

function manifest(overrides: Record<string, unknown> = {}) {
  return { format: 1, packs: { 'win32-x64': pack() }, ...overrides }
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'hrag-manifest-'))
}

function assertInvalid(raw: unknown, label: string): void {
  const result = validateManifest(raw)
  assert.equal(result.ok, false, label)
  if (!result.ok) assert.equal(result.code, 'manifest_invalid', label)
}

// ── validateManifest ────────────────────────────────────────────────────────

test('validate: a published pack is accepted and returned whole', () => {
  const result = validateManifest(manifest())
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.manifest.format, 1)
    assert.equal(result.manifest.packs['win32-x64'].size, 123)
  }
})

test('validate: format must be exactly 1', () => {
  for (const format of [0, 2, '1', null, undefined]) {
    assertInvalid(manifest({ format }), `format=${String(format)}`)
  }
})

test('validate: packs must be a non-empty object of platform keys', () => {
  for (const packs of [undefined, null, [], {}, { win32: pack() }, { WIN32_X64: pack() }]) {
    assertInvalid(manifest({ packs }), `packs=${JSON.stringify(packs)}`)
  }
})

test('validate: runtimeVersion allows [0-9A-Za-z._-] only', () => {
  for (const runtimeVersion of ['', '2.1.0/1', '2.1 0', '../2.1.0', 1]) {
    assertInvalid(manifest({ packs: { 'win32-x64': pack({ runtimeVersion }) } }), `runtimeVersion=${String(runtimeVersion)}`)
  }
})

test('validate: non-placeholder entries need https urls', () => {
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ urls: ['http://example.com/x.zip'] }) } }), 'http')
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ urls: ['ftp://example.com/x.zip'] }) } }), 'ftp')
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ urls: 'https://example.com/x.zip' }) } }), 'not an array')
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ urls: ['not a url'] }) } }), 'garbage url')
})

test('validate: non-placeholder entries need a 64-hex sha256 and positive sizes', () => {
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ sha256: 'abc' }) } }), 'short hash')
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ sha256: HASH.toUpperCase() }) } }), 'uppercase hash')
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ size: -1 }) } }), 'negative size')
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ unpackedSize: 1.5 }) } }), 'fractional size')
})

test('validate: each entry carries the identity fields', () => {
  for (const field of ['engineVersion', 'engineCommit', 'pythonVersion', 'qdrantVersion']) {
    assertInvalid(manifest({ packs: { 'win32-x64': pack({ [field]: '' }) } }), field)
  }
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ configVersion: -1 }) } }), 'configVersion')
  assertInvalid(manifest({ packs: { 'win32-x64': pack({ configVersion: 1.5 }) } }), 'configVersion fraction')
})

test('validate: the unpublished placeholder is legal but selects as pack_missing', () => {
  const placeholder = pack({ urls: [], size: 0, unpackedSize: 0, sha256: '' })
  const result = validateManifest(manifest({ packs: { 'win32-x64': placeholder } }))
  assert.equal(result.ok, true)
  if (!result.ok) return
  const selected = selectPack(result.manifest, 'win32-x64')
  assert.equal(selected.ok, false)
  if (!selected.ok) assert.equal(selected.code, 'pack_missing')
})

test('validate: a partially filled pack is still an unpublished placeholder', () => {
  const partial = pack({ size: 0 })
  const result = validateManifest(manifest({ packs: { 'win32-x64': partial } }))
  assert.equal(result.ok, true)
  if (!result.ok) return
  const selected = selectPack(result.manifest, 'win32-x64')
  assert.equal(selected.ok, false)
  if (!selected.ok) assert.equal(selected.code, 'pack_missing')
})

// ── selectPack / loadPack ───────────────────────────────────────────────────

test('select: an absent platform is platform_unsupported', () => {
  const result = validateManifest(manifest())
  assert.equal(result.ok, true)
  if (!result.ok) return
  for (const platform of ['darwin-arm64', 'linux-x64', 'win32-arm64']) {
    const selected = selectPack(result.manifest, platform)
    assert.equal(selected.ok, false)
    if (!selected.ok) assert.equal(selected.code, 'platform_unsupported', platform)
  }
})

test('select: the matching platform returns its pack', () => {
  const result = validateManifest(manifest())
  assert.equal(result.ok, true)
  if (!result.ok) return
  const selected = selectPack(result.manifest, 'win32-x64')
  assert.equal(selected.ok, true)
  if (selected.ok) {
    assert.equal(selected.platform, 'win32-x64')
    assert.equal(selected.pack.runtimeVersion, '2.1.0-1')
  }
})

test('load: reads runtime.json from the package root', () => {
  const dir = tempDir()
  writeFileSync(join(dir, 'runtime.json'), JSON.stringify(manifest()))
  const loaded = loadPack({ packageRoot: dir, platform: 'win32-x64' })
  assert.equal(loaded.ok, true)
  if (loaded.ok) assert.equal(loaded.pack.size, 123)
})

test('load: missing or malformed runtime.json is manifest_invalid', () => {
  const dir = tempDir()
  const missing = loadPack({ packageRoot: dir, platform: 'win32-x64' })
  assert.equal(missing.ok, false)
  if (!missing.ok) assert.equal(missing.code, 'manifest_invalid')

  writeFileSync(join(dir, 'runtime.json'), '{ not json')
  const malformed = loadPack({ packageRoot: dir, platform: 'win32-x64' })
  assert.equal(malformed.ok, false)
  if (!malformed.ok) assert.equal(malformed.code, 'manifest_invalid')
})

test('load: the shipped runtime.json is valid and its win32-x64 pack is unpublished', () => {
  const read = readManifest({ packageRoot: PACKAGE_ROOT })
  assert.equal(read.ok, true)
  const loaded = loadPack({ packageRoot: PACKAGE_ROOT, platform: 'win32-x64' })
  assert.equal(loaded.ok, false)
  if (!loaded.ok) assert.equal(loaded.code, 'pack_missing')
})

// ── current.json ────────────────────────────────────────────────────────────

test('current: a well-formed record survives, with or without previousVersion', () => {
  const base = { version: 1, runtimeVersion: '2.1.0-1', updatedAt: '2026-10-25T00:00:00.000Z' }
  assert.deepEqual(sanitizeCurrent(base), base)
  assert.deepEqual(sanitizeCurrent({ ...base, previousVersion: '2.0.0-1' }), { ...base, previousVersion: '2.0.0-1' })
})

test('current: wrong version, bad runtimeVersion, or blank updatedAt degrades to null', () => {
  const base = { version: 1, runtimeVersion: '2.1.0-1', updatedAt: '2026-10-25T00:00:00.000Z' }
  for (const raw of [
    null,
    undefined,
    [],
    { ...base, version: 2 },
    { ...base, runtimeVersion: '2.1.0/1' },
    { ...base, runtimeVersion: '' },
    { ...base, updatedAt: '' },
    { ...base, previousVersion: 'bad/version' },
  ]) {
    assert.equal(sanitizeCurrent(raw), null, JSON.stringify(raw))
  }
})

// ── current.json I/O ────────────────────────────────────────────────────────

const STAMP = '2026-10-25T00:00:00.000Z'

test('current: writeCurrent records previousVersion only when it is given', () => {
  const root = tempDir()

  const first = writeCurrent(root, { runtimeVersion: '2.1.0-1' }, () => STAMP)
  assert.deepEqual(first, { version: 1, runtimeVersion: '2.1.0-1', updatedAt: STAMP })
  assert.deepEqual(readCurrent(root), first)
  assert.equal('previousVersion' in JSON.parse(readFileSync(join(root, 'state', 'current.json'), 'utf8')), false)

  const switched = writeCurrent(root, { runtimeVersion: '2.1.0-2', previousVersion: '2.1.0-1' }, () => STAMP)
  assert.deepEqual(switched, {
    version: 1,
    runtimeVersion: '2.1.0-2',
    updatedAt: STAMP,
    previousVersion: '2.1.0-1',
  })
  assert.deepEqual(readCurrent(root), switched)
})

test('current: a missing or damaged file reads as null', () => {
  const root = tempDir()
  assert.equal(readCurrent(root), null)

  mkdirSync(join(root, 'state'), { recursive: true })
  writeFileSync(join(root, 'state', 'current.json'), '{not json')
  assert.equal(readCurrent(root), null)

  writeFileSync(join(root, 'state', 'current.json'), JSON.stringify({ version: 1 }))
  assert.equal(readCurrent(root), null)
})

test('current: writeCurrent refuses versions that cannot be directory names', () => {
  const root = tempDir()
  assert.throws(() => writeCurrent(root, { runtimeVersion: '' }), /invalid runtime version/)
  assert.throws(
    () => writeCurrent(root, { runtimeVersion: '2.1.0-1', previousVersion: 'bad/version' }),
    /invalid previous version/,
  )
})

test('current: the pointer follows a healthy service, or blocks when its runtime is gone', () => {
  const current = { version: 1 as const, runtimeVersion: '2.1.0-1', updatedAt: STAMP }
  assert.deepEqual(planCurrent(null, '2.1.0-1', false), { kind: 'first' })
  assert.deepEqual(planCurrent(current, '2.1.0-1', false), { kind: 'keep' })
  assert.deepEqual(planCurrent(current, '2.1.0-2', true), { kind: 'rewrite', previousVersion: '2.1.0-1' })
  assert.deepEqual(planCurrent(current, '2.1.0-2', false), { kind: 'conflict', previousVersion: '2.1.0-1' })
})

// ── upgrade.json ────────────────────────────────────────────────────────────

function upgradeRecord(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    targetVersion: '2.1.0-2',
    fromVersion: '2.1.0-1',
    configVersion: 44,
    state: 'pending',
    requestedAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  }
}

test('upgrade: every preparable state survives, with an optional confirmation', () => {
  for (const state of ['pending', 'ready', 'needs_confirmation', 'blocked']) {
    assert.deepEqual(sanitizeUpgrade(upgradeRecord({ state })), upgradeRecord({ state }), state)
  }
  const confirmed = upgradeRecord({ state: 'needs_confirmation', confirmedConfigVersion: 44 })
  assert.deepEqual(sanitizeUpgrade(confirmed), confirmed)
})

test('upgrade: bad records degrade to null', () => {
  for (const raw of [
    null,
    [],
    upgradeRecord({ version: 2 }),
    upgradeRecord({ targetVersion: '' }),
    upgradeRecord({ targetVersion: '../2.1.0' }),
    upgradeRecord({ fromVersion: '' }),
    upgradeRecord({ fromVersion: 'bad/version' }),
    upgradeRecord({ configVersion: -1 }),
    upgradeRecord({ configVersion: 1.5 }),
    upgradeRecord({ state: 'failed' }),
    upgradeRecord({ state: 'Pending' }),
    upgradeRecord({ requestedAt: '' }),
    upgradeRecord({ updatedAt: '' }),
    upgradeRecord({ confirmedConfigVersion: 0 }),
    upgradeRecord({ confirmedConfigVersion: '44' }),
  ]) {
    assert.equal(sanitizeUpgrade(raw), null, JSON.stringify(raw))
  }
})

// ── failed-<version>.json ───────────────────────────────────────────────────

function failedRecord(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    runtimeVersion: '2.1.0-2',
    fromVersion: '2.1.0-1',
    failedAt: STAMP,
    error: { phase: 'engine', code: 'engine_not_ready' },
    rolledBack: true,
    ...overrides,
  }
}

test('failed: a health-gate failure survives, including the first-install form', () => {
  assert.deepEqual(sanitizeFailed(failedRecord()), failedRecord())
  assert.deepEqual(
    sanitizeFailed(failedRecord({ fromVersion: '', rolledBack: false })),
    failedRecord({ fromVersion: '', rolledBack: false }),
  )
  const detailed = failedRecord({ error: { phase: 'engine', code: 'engine_not_ready', detail: 'exit 1' } })
  assert.deepEqual(sanitizeFailed(detailed), detailed)
})

test('failed: bad records degrade to null', () => {
  for (const raw of [
    null,
    [],
    failedRecord({ version: 2 }),
    failedRecord({ runtimeVersion: '' }),
    failedRecord({ runtimeVersion: 'bad/version' }),
    failedRecord({ fromVersion: 'bad/version' }),
    failedRecord({ failedAt: '' }),
    failedRecord({ error: undefined }),
    failedRecord({ error: { phase: 'engine' } }),
    failedRecord({ error: { phase: '', code: 'engine_not_ready' } }),
    failedRecord({ error: { phase: 'engine', code: 'engine_not_ready', detail: 1 } }),
    failedRecord({ rolledBack: 'yes' }),
  ]) {
    assert.equal(sanitizeFailed(raw), null, JSON.stringify(raw))
  }
})
