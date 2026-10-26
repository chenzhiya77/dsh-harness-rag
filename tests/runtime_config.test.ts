import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { api, HarnessRagError } from '../src/http.ts'
import { createEffectiveConfig, type ManagedRuntime } from '../src/runtime/config.ts'
import { defaultConfig, type Config } from '../src/settings.ts'
import { ensureRuntime } from '../src/runtime/provision.ts'
import type { RuntimePack } from '../src/runtime/manifest.ts'

const settings: Config = { backendUrl: 'http://127.0.0.1:8020', apiToken: 'legacy-token', autoSyncModels: true }

function managed(overrides: Partial<ManagedRuntime> = {}, phase = 'starting'): ManagedRuntime {
  return {
    mode: 'managed',
    backendUrl: () => 'http://127.0.0.1:8123',
    apiToken: () => 'live-token',
    phase: () => phase,
    ...overrides,
  }
}

test('effective: external mode passes the settings straight through', () => {
  const config = createEffectiveConfig(settings, { mode: 'external' })

  assert.equal(config.backendUrl, 'http://127.0.0.1:8020')
  assert.equal(config.apiToken, 'legacy-token')
  assert.equal(config.runtimeNotReady?.(), undefined)
})

test('effective: managed mode ignores the profile address and token', () => {
  const config = createEffectiveConfig(settings, managed())

  assert.equal(config.backendUrl, 'http://127.0.0.1:8123')
  assert.equal(config.apiToken, 'live-token')
  assert.equal(config.autoSyncModels, true)
  assert.equal(config.runtimeNotReady?.(), null)
})

test('effective: the getters follow the runtime instead of freezing a snapshot', () => {
  let base: string | null = null
  const runtime = managed({ backendUrl: () => base })
  const config = createEffectiveConfig(settings, runtime)
  assert.equal(config.backendUrl, '')
  assert.deepEqual(config.runtimeNotReady?.(), { phase: 'starting' })

  base = 'http://127.0.0.1:8123'
  assert.equal(config.backendUrl, 'http://127.0.0.1:8123')
  assert.equal(config.runtimeNotReady?.(), null)
})

test('effective: the shipped default is managed mode', () => {
  assert.equal(defaultConfig.backendUrl, '')
})

test('api: managed mode reports the phase, not a blank-address error', async () => {
  const config = createEffectiveConfig(settings, managed({ backendUrl: () => null }, 'preparing'))

  await assert.rejects(
    () => api(config, '/api/knowledge-bases'),
    (error: unknown) => {
      assert.ok(error instanceof HarnessRagError)
      assert.equal(error.info.kind, 'runtime_not_ready')
      assert.match(error.info.detail, /runtime_not_ready/)
      assert.match(error.info.detail, /preparing/)
      assert.match(error.info.detail, /panel/)
      return true
    },
  )
})

test('api: external mode without an address still asks for settings', async () => {
  const config = createEffectiveConfig({ ...settings, backendUrl: '  ' }, { mode: 'external' })

  await assert.rejects(
    () => api(config, '/api/knowledge-bases'),
    (error: unknown) => {
      assert.ok(error instanceof HarnessRagError)
      assert.equal(error.info.kind, 'not_configured')
      return true
    },
  )
})

// ── provisioning ────────────────────────────────────────────────────────────

const unpublished: RuntimePack = {
  runtimeVersion: '2.1.0-1',
  engineVersion: '2.1.0',
  engineCommit: 'b34b2d572',
  pythonVersion: '3.12.13',
  qdrantVersion: '1.20.0',
  configVersion: 44,
  urls: [],
  size: 0,
  unpackedSize: 0,
  sha256: '',
}

const published: RuntimePack = {
  ...unpublished,
  urls: ['https://example.com/runtime.zip'],
  size: 123,
  unpackedSize: 456,
  sha256: 'a'.repeat(64),
}

test('provision: an unpublished pack fails before touching the disk', async () => {
  const root = mkdtempSync(join(tmpdir(), 'hrag-provision-'))

  const result = await ensureRuntime({ root, version: '2.1.0-1', platform: 'win32-x64', pack: unpublished })

  assert.deepEqual(result, { kind: 'failed', code: 'pack_missing' })
  assert.equal(existsSync(join(root, 'downloads')), false)
})

test('provision: an installed runtime skips download and extraction', async () => {
  const root = mkdtempSync(join(tmpdir(), 'hrag-provision-'))
  const installed = join(root, 'runtime', '2.1.0-1')
  mkdirSync(installed, { recursive: true })
  writeFileSync(
    join(installed, 'runtime-manifest.json'),
    JSON.stringify({ format: 1, runtimeVersion: '2.1.0-1', configVersion: published.configVersion }),
  )

  const result = await ensureRuntime({ root, version: '2.1.0-1', platform: 'win32-x64', pack: published })

  assert.deepEqual(result, { kind: 'ok' })
})
