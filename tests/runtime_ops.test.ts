import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defaultConfig } from '../src/settings.ts'
import { HarnessRagError } from '../src/http.ts'
import { checkPrivilegedRequest } from '../src/kb_proxy.ts'
import {
  configureRuntime,
  ensureRuntimeFromPanel,
  panelStatus,
  pickDirectory,
  retryRuntime,
  RuntimeOpError,
  statusPayload,
  type PickerKind,
  type RuntimeOpsDeps,
} from '../src/runtime/ops.ts'
import type { RuntimeStatusView } from '../src/runtime/supervisor.ts'
import type { RuntimePhase } from '../src/runtime/supervisor.ts'

const VERSION = '2.1.0-1'

function fakeSupervisor(phase: RuntimePhase = 'idle') {
  const calls = { ensure: 0, retry: 0 }
  const view: RuntimeStatusView = {
    phase,
    adopted: false,
    runtimeVersion: VERSION,
    root: '',
    logTail: '',
  }
  return {
    calls,
    status: () => view,
    ensure: async () => {
      calls.ensure += 1
      return view
    },
    retry: async () => {
      calls.retry += 1
      return view
    },
  }
}

interface Fixture {
  home: string
  anchorRoot: string
  deps: RuntimeOpsDeps
  supervisor: ReturnType<typeof fakeSupervisor>
  configured: string[]
}

function fixture(overrides: Partial<RuntimeOpsDeps> = {}, phase: RuntimePhase = 'idle'): Fixture {
  const home = mkdtempSync(join(tmpdir(), 'hrag-ops-'))
  const anchorRoot = join(home, 'harness-rag')
  const supervisor = fakeSupervisor(phase)
  const configured: string[] = []
  const deps: RuntimeOpsDeps = {
    config: defaultConfig,
    anchorRoot,
    env: { DSH_HOME: home },
    headless: () => false,
    picker: () => 'native' as PickerKind,
    pick: async () => null,
    supervisor: () => supervisor,
    version: VERSION,
    pack: () => ({ size: 100, unpackedSize: 100 }),
    needsEmbeddingConfig: async () => false,
    configureRoot: (root) => configured.push(root),
    ...overrides,
  }
  return { home, anchorRoot, deps, supervisor, configured }
}

// ── status ──────────────────────────────────────────────────────────────────

test('status: external mode reports itself and never touches the runtime', () => {
  const f = fixture({ config: { ...defaultConfig, backendUrl: 'http://127.0.0.1:8020' } })

  const payload = statusPayload(f.deps)

  assert.equal(payload.mode, 'external')
  assert.equal(payload.phase, 'external')
  assert.equal(payload.anchorRoot, f.anchorRoot)
})

test('status: managed mode defaults to the anchor root and the supervisor phase', () => {
  const f = fixture({}, 'starting')

  const payload = statusPayload(f.deps)

  assert.equal(payload.mode, 'managed')
  assert.equal(payload.phase, 'starting')
  assert.equal(payload.root, join(f.home, 'harness-rag'))
  assert.equal(payload.paths.config, join(payload.root, 'config'))
  assert.deepEqual(payload.pack, { size: 100, unpackedSize: 100 })
  assert.equal(payload.installed, false)
})

test('status: an installed runtime is reported as installed', () => {
  const f = fixture()
  mkdirSync(join(f.home, 'harness-rag', 'state'), { recursive: true })
  writeFileSync(join(f.home, 'harness-rag', 'state', 'current.json'), '{"version":1}')

  const payload = statusPayload(f.deps)

  assert.equal(payload.installed, true)
})

test('status: a recorded root that vanished asks for a location', () => {
  const f = fixture()
  mkdirSync(f.anchorRoot, { recursive: true })
  const gone = join(f.home, 'gone')
  writeFileSync(join(f.anchorRoot, 'location.json'), JSON.stringify({ version: 1, root: gone }))

  const payload = statusPayload(f.deps)

  assert.equal(payload.phase, 'needs_location')
  assert.equal(payload.previousRoot, gone)
  assert.match(payload.reason ?? '', /does not exist/)
  assert.equal(payload.warning, undefined)
})

test('status: a malformed anchor falls back to the default root and reports why', () => {
  const f = fixture({}, 'ready')
  mkdirSync(f.anchorRoot, { recursive: true })
  writeFileSync(join(f.anchorRoot, 'location.json'), '{not json')

  const payload = statusPayload(f.deps)

  assert.equal(payload.phase, 'ready')
  assert.equal(payload.root, join(f.home, 'harness-rag'))
  assert.match(payload.warning ?? '', /not valid JSON/)
  assert.equal(payload.previousRoot, undefined)
})

test('status: external mode never reports an anchor warning', () => {
  const f = fixture({ config: { ...defaultConfig, backendUrl: 'http://127.0.0.1:8020' } })
  mkdirSync(f.anchorRoot, { recursive: true })
  writeFileSync(join(f.anchorRoot, 'location.json'), '{not json')

  const payload = statusPayload(f.deps)

  assert.equal(payload.warning, undefined)
})

test('status: headless ignores a broken anchor and follows the default root', () => {
  const f = fixture({ headless: () => true }, 'preparing')
  mkdirSync(f.anchorRoot, { recursive: true })
  writeFileSync(
    join(f.anchorRoot, 'location.json'),
    JSON.stringify({ version: 1, root: join(f.home, 'gone') }),
  )

  const payload = statusPayload(f.deps)

  assert.equal(payload.headless, true)
  assert.equal(payload.phase, 'preparing')
  assert.equal(payload.root, join(f.home, 'harness-rag'))
})

// ── configure ───────────────────────────────────────────────────────────────

test('configure: a relative parent is rejected', () => {
  const f = fixture()

  assert.throws(
    () => configureRuntime(f.deps, { parent: 'relative\\dir' }),
    (error: unknown) => error instanceof RuntimeOpError && error.kind === 'path_not_absolute',
  )
})

test('configure: a synced drive asks for confirmation before anything is written', () => {
  const f = fixture()
  f.deps.env = { DSH_HOME: f.home, OneDrive: f.home }
  const parent = join(f.home, 'OneDrive')

  assert.throws(
    () => configureRuntime(f.deps, { parent }),
    (error: unknown) => error instanceof RuntimeOpError && error.kind === 'sync_confirm',
  )
  assert.equal(existsSync(join(parent, 'harness-rag')), false)

  configureRuntime(f.deps, { parent, confirmSync: true })
  assert.equal(existsSync(join(parent, 'harness-rag', 'state', 'data')), true)
  assert.deepEqual(f.configured, [join(parent, 'harness-rag')])
})

test('configure: an installed runtime refuses to move', () => {
  const f = fixture()
  mkdirSync(join(f.home, 'harness-rag', 'state'), { recursive: true })
  writeFileSync(join(f.home, 'harness-rag', 'state', 'current.json'), '{"version":1}')

  assert.throws(
    () => configureRuntime(f.deps, { parent: join(f.home, 'elsewhere') }),
    (error: unknown) => error instanceof RuntimeOpError && error.kind === 'runtime_installed',
  )
})

test('configure: the anchor is written and the new root is created', () => {
  const f = fixture()
  const parent = join(f.home, 'data')

  const result = configureRuntime(f.deps, { parent })

  assert.equal(result.root, join(parent, 'harness-rag'))
  const root = join(parent, 'harness-rag')
  assert.deepEqual(JSON.parse(readFileSync(join(f.anchorRoot, 'location.json'), 'utf8')), { version: 1, root })
  for (const dir of ['downloads', 'config', join('state', 'data'), join('state', 'logs'), join('state', 'qdrant')]) {
    assert.equal(existsSync(join(root, dir)), true, dir)
  }
  assert.deepEqual(f.configured, [root])
})

test('configure: the default root can be chosen as-is', () => {
  const f = fixture()

  const result = configureRuntime(f.deps, { parent: f.anchorRoot })

  assert.equal(result.root, f.anchorRoot)
  assert.equal(JSON.parse(readFileSync(join(f.anchorRoot, 'location.json'), 'utf8')).root, f.anchorRoot)
  assert.deepEqual(f.configured, [f.anchorRoot])
})

// ── pick / retry ────────────────────────────────────────────────────────────

test('pick: the native picker returns the parent and its harness-rag target', async () => {
  const f = fixture({ pick: async () => join(fixture().home, 'chosen') })

  const result = await pickDirectory(f.deps)

  assert.equal(result.picker, 'native')
  assert.match(result.path ?? '', /chosen$/)
  assert.equal(result.target, join(result.path!, 'harness-rag'))
})

test('pick: a missing picker returns nothing to change', async () => {
  const f = fixture({ picker: () => 'none' })

  const result = await pickDirectory(f.deps)

  assert.deepEqual(result, { picker: 'none', path: null, target: null })
})

test('retry: triggers one retry and reports the current status', () => {
  const f = fixture({}, 'error')

  const payload = retryRuntime(f.deps)

  assert.equal(f.supervisor.calls.retry, 1)
  assert.equal(payload.phase, 'error')
})

test('ensure: the panel starts provisioning unless it needs a location', () => {
  const f = fixture()
  ensureRuntimeFromPanel(f.deps)
  assert.equal(f.supervisor.calls.ensure, 1)

  const blocked = fixture()
  mkdirSync(blocked.anchorRoot, { recursive: true })
  writeFileSync(
    join(blocked.anchorRoot, 'location.json'),
    JSON.stringify({ version: 1, root: join(blocked.home, 'gone') }),
  )
  ensureRuntimeFromPanel(blocked.deps)
  assert.equal(blocked.supervisor.calls.ensure, 0)
})

test('panel status: the embedding probe only runs once the service is ready', async () => {
  let probes = 0
  const probe = async () => {
    probes += 1
    return true
  }

  const ready = fixture({ needsEmbeddingConfig: probe }, 'ready')
  const readyPayload = await panelStatus(ready.deps)
  assert.equal(readyPayload.needsEmbeddingConfig, true)
  assert.equal(probes, 1)

  const starting = fixture({ needsEmbeddingConfig: probe }, 'starting')
  const startingPayload = await panelStatus(starting.deps)
  assert.equal(startingPayload.needsEmbeddingConfig, undefined)
  assert.equal(probes, 1)
})

// ── privileged-op guards ────────────────────────────────────────────────────

const kindOf = (kind: string) => (error: unknown) => error instanceof HarnessRagError && error.info.kind === kind

test('guard: privileged ops require a JSON body', () => {
  assert.throws(() => checkPrivilegedRequest({ host: '127.0.0.1:2026' }), kindOf('unsupported_media_type'))
  assert.throws(
    () => checkPrivilegedRequest({ 'content-type': 'text/plain', host: '127.0.0.1:2026' }),
    kindOf('unsupported_media_type'),
  )
})

test('guard: a same-origin JSON request passes', () => {
  assert.doesNotThrow(() =>
    checkPrivilegedRequest({
      'content-type': 'application/json',
      host: '127.0.0.1:2026',
      origin: 'http://127.0.0.1:2026',
      'sec-fetch-site': 'same-origin',
    }),
  )
  assert.doesNotThrow(() => checkPrivilegedRequest({ 'content-type': 'application/json; charset=utf-8' }))
})

test('guard: cross-site, cross-origin and opaque origins are rejected', () => {
  const json = { 'content-type': 'application/json', host: '127.0.0.1:2026' }
  assert.throws(() => checkPrivilegedRequest({ ...json, 'sec-fetch-site': 'cross-site' }), kindOf('cross_origin'))
  assert.throws(() => checkPrivilegedRequest({ ...json, origin: 'https://evil.test' }), kindOf('cross_origin'))
  assert.throws(() => checkPrivilegedRequest({ ...json, origin: 'null' }), kindOf('cross_origin'))
})
