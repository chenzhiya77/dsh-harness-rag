import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { spawn as spawnProcess, type ChildProcess } from 'node:child_process'
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sanitizeService, type SpawnFn, type SpawnRequest } from '../src/runtime/process.ts'
import { createRuntimeBridge, type BridgeHost } from '../src/runtime/bridge.ts'
import { readManifest } from '../src/runtime/manifest.ts'
import { defaultConfig } from '../src/settings.ts'
import {
  createSupervisor,
  forgetSupervisor,
  getSupervisor,
  probePortAnswer,
  pythonNoProxy,
  type Supervisor,
} from '../src/runtime/supervisor.ts'

const VERSION = '2.1.0-1'
const PACKAGE_ROOT = fileURLToPath(new URL('../', import.meta.url))

const QDRANT_STUB = `
import { createServer } from 'node:http'
const port = Number(process.env.QDRANT__SERVICE__HTTP_PORT)
createServer((req, res) => {
  if (req.url === '/readyz') { res.writeHead(200); res.end('ok'); return }
  res.writeHead(404); res.end()
}).listen(port, '127.0.0.1')
`

const ENGINE_STUB = `
import { createServer } from 'node:http'
const port = Number(process.argv[process.argv.indexOf('--port') + 1])
const token = process.env.DEER_FLOW_API_TOKEN
createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('{"status":"healthy"}'); return }
  if (req.url === '/api/knowledge-bases') {
    if (req.headers.authorization === 'Bearer ' + token) { res.writeHead(200); res.end('[]') }
    else { res.writeHead(401); res.end() }
    return
  }
  res.writeHead(404); res.end()
}).listen(port, '127.0.0.1')
`

const CRASH_STUB = `process.exit(3)`

const SPAM_ENGINE_STUB = `
import { createServer } from 'node:http'
const port = Number(process.argv[process.argv.indexOf('--port') + 1])
const token = process.env.DEER_FLOW_API_TOKEN
const line = 'x'.repeat(1023) + '\\n'
for (let i = 0; i < 2600; i++) process.stdout.write(line)
createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200); res.end('{"status":"healthy"}'); return }
  if (req.url === '/api/knowledge-bases') {
    if (req.headers.authorization === 'Bearer ' + token) { res.writeHead(200); res.end('[]') }
    else { res.writeHead(401); res.end() }
    return
  }
  res.writeHead(404); res.end()
}).listen(port, '127.0.0.1')
`

interface Spawned {
  spawn: SpawnFn
  requests: SpawnRequest[]
  children: ChildProcess[]
  stop: () => void
}

function fakeSpawn(scripts: { qdrant: string; engine: string }): Spawned {
  const requests: SpawnRequest[] = []
  const children: ChildProcess[] = []
  const spawn: SpawnFn = (request) => {
    requests.push(request)
    const script = request.command.endsWith('qdrant.exe') ? scripts.qdrant : scripts.engine
    const child = spawnProcess(process.execPath, [script, ...request.args], {
      cwd: request.cwd,
      env: { ...process.env, ...request.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    children.push(child)
    return {
      pid: child.pid,
      onData: (stream, listener) => {
        child[stream]?.on('data', (chunk: Buffer) => listener(String(chunk)))
      },
      onExit: (listener) => {
        child.on('exit', (code) => listener(code))
      },
      kill: () => {
        child.kill()
      },
    }
  }
  return {
    spawn,
    requests,
    children,
    stop: () => {
      for (const child of children) child.kill()
    },
  }
}

function writeStubs(root: string): { qdrant: string; engine: string; crash: string; spam: string } {
  const dir = join(root, 'stubs')
  mkdirSync(dir, { recursive: true })
  const qdrant = join(dir, 'qdrant-stub.mjs')
  const engine = join(dir, 'engine-stub.mjs')
  const crash = join(dir, 'crash-stub.mjs')
  const spam = join(dir, 'spam-engine-stub.mjs')
  writeFileSync(qdrant, QDRANT_STUB)
  writeFileSync(engine, ENGINE_STUB)
  writeFileSync(crash, CRASH_STUB)
  writeFileSync(spam, SPAM_ENGINE_STUB)
  return { qdrant, engine, crash, spam }
}

async function freePorts(count: number): Promise<number[]> {
  const ports: number[] = []
  for (let index = 0; index < count; index++) {
    const server = createNetServer()
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    ports.push((server.address() as AddressInfo).port)
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  return ports
}

interface Fixture {
  root: string
  runtime: string
  stubs: { qdrant: string; engine: string; crash: string; spam: string }
  preferredPorts: { qdrantHttp: number; qdrantGrpc: number; knowledge: number }
  spawned: Spawned
}

async function fixture(t: TestContext, mode: 'ok' | 'crash-engine' = 'ok', version = VERSION): Promise<Fixture> {
  const root = mkdtempSync(join(tmpdir(), 'hrag-sup-'))
  const runtime = join(root, 'runtime', version)
  mkdirSync(join(runtime, 'engine'), { recursive: true })
  writeFileSync(join(runtime, 'engine', 'config.example.yaml'), 'config_version: 44\nsandbox:\n  use: x\n')
  mkdirSync(join(runtime, 'qdrant'), { recursive: true })
  mkdirSync(join(runtime, 'python'), { recursive: true })
  writeFileSync(join(runtime, 'qdrant', 'qdrant.exe'), '')
  writeFileSync(join(runtime, 'python', 'python.exe'), '')
  const stubs = writeStubs(root)
  const [qdrantHttp, qdrantGrpc, knowledge] = await freePorts(3)
  const spawned = fakeSpawn({ qdrant: stubs.qdrant, engine: mode === 'ok' ? stubs.engine : stubs.crash })
  t.after(() => spawned.stop())
  return { root, runtime, stubs, preferredPorts: { qdrantHttp, qdrantGrpc, knowledge }, spawned }
}

function supervisor(f: Fixture, overrides: Partial<Parameters<typeof createSupervisor>[0]> = {}): Supervisor {
  return createSupervisor({
    root: f.root,
    runtimeVersion: VERSION,
    token: 'test-token',
    spawn: f.spawned.spawn,
    preferredPorts: f.preferredPorts,
    probePort: async () => true,
    readyTimeoutMs: 8_000,
    probeIntervalMs: 40,
    disposeGraceMs: 0,
    ...overrides,
  })
}

// ── start ───────────────────────────────────────────────────────────────────

test('start: qdrant comes up first, the engine second, and service.json records both', async (t) => {
  const f = await fixture(t)
  const sup = supervisor(f)

  const status = await sup.ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.adopted, false)
  assert.deepEqual(
    f.spawned.requests.map((request) => (request.command.endsWith('qdrant.exe') ? 'qdrant' : 'engine')),
    ['qdrant', 'engine'],
  )
  const record = sanitizeService(JSON.parse(readFileSync(join(f.root, 'state', 'service.json'), 'utf8')))
  assert.ok(record)
  assert.equal(record.token, 'test-token')
  assert.deepEqual(record.ports, status.ports)
  assert.ok(record.pid > 0)
  assert.ok(record.qdrantPid && record.qdrantPid > 0)
  const current = JSON.parse(readFileSync(join(f.root, 'state', 'current.json'), 'utf8'))
  assert.equal(current.runtimeVersion, VERSION)
  assert.equal(current.previousVersion, undefined)
})

test('start: qdrant receives the six storage and service variables', async (t) => {
  const f = await fixture(t)
  const status = await supervisor(f).ensure()

  const env = f.spawned.requests[0].env
  assert.equal(env.QDRANT__SERVICE__HOST, '127.0.0.1')
  assert.equal(env.QDRANT__SERVICE__HTTP_PORT, String(status.ports?.qdrantHttp))
  assert.equal(env.QDRANT__SERVICE__GRPC_PORT, String(status.ports?.qdrantGrpc))
  assert.equal(env.QDRANT__STORAGE__STORAGE_PATH, join(f.root, 'state', 'qdrant'))
  assert.equal(env.QDRANT__STORAGE__SNAPSHOTS_PATH, join(f.root, 'state', 'qdrant-snapshots'))
  assert.equal(env.QDRANT__TELEMETRY_DISABLED, 'true')
})

test('pythonNoProxy: brackets are stripped and loopback stays bypassed', () => {
  assert.equal(pythonNoProxy({ NO_PROXY: 'corp.example,[::1],10.0.0.0/8' }), 'corp.example,::1,10.0.0.0/8,localhost,127.0.0.1,0.0.0.0,::ffff:127.0.0.1')
  assert.equal(pythonNoProxy({ no_proxy: 'intra.example' }), 'intra.example,localhost,127.0.0.1,::1,0.0.0.0,::ffff:127.0.0.1')
  assert.equal(pythonNoProxy({}), 'localhost,127.0.0.1,::1,0.0.0.0,::ffff:127.0.0.1')
  assert.equal(pythonNoProxy({ NO_PROXY: '*' }), '*')
})

test('start: the engine gets a NO_PROXY list httpx can parse', async (t) => {
  const saved = process.env.NO_PROXY
  process.env.NO_PROXY = 'corp.example,[::1]'
  t.after(() => {
    if (saved === undefined) delete process.env.NO_PROXY
    else process.env.NO_PROXY = saved
  })
  const f = await fixture(t)
  await supervisor(f).ensure()

  const env = f.spawned.requests[1].env
  assert.equal(env.no_proxy, env.NO_PROXY)
  assert.ok(!String(env.NO_PROXY).includes('['), env.NO_PROXY)
  assert.ok(String(env.NO_PROXY).includes('corp.example'))
  assert.ok(String(env.NO_PROXY).includes('127.0.0.1'))
})

test('start: the engine receives the five paths, the token, and PYTHONPATH', async (t) => {
  const f = await fixture(t)
  await supervisor(f).ensure()

  const env = f.spawned.requests[1].env
  assert.equal(env.DEER_FLOW_PROJECT_ROOT, f.root)
  assert.equal(env.DEER_FLOW_HOME, join(f.root, 'state'))
  assert.equal(env.DEER_FLOW_CONFIG_PATH, join(f.root, 'config', 'config.yaml'))
  assert.equal(env.DEER_FLOW_MODELS_CONFIG_PATH, join(f.root, 'config', 'models_config.json'))
  assert.equal(env.DEER_FLOW_RAG_CONFIG_PATH, join(f.root, 'config', 'rag_config.json'))
  assert.equal(env.DEER_FLOW_API_TOKEN, 'test-token')
  assert.equal(env.PYTHONUTF8, '1')
  assert.equal(
    env.PYTHONPATH,
    [
      join(f.runtime, 'site-packages'),
      join(f.runtime, 'engine', 'backend'),
      join(f.runtime, 'engine', 'backend', 'packages', 'harness'),
      join(f.runtime, 'engine', 'backend', 'packages', 'extension-api'),
    ].join(';'),
  )
})

test('start: the seed runs before the children and points at the planned qdrant', async (t) => {
  const f = await fixture(t)
  const status = await supervisor(f).ensure()

  const config = readFileSync(join(f.root, 'config', 'config.yaml'), 'utf8')
  assert.match(config, new RegExp(`sqlite_dir: '${join(f.root, 'state', 'data').replace(/\\/g, '\\\\')}`))
  const rag = JSON.parse(readFileSync(join(f.root, 'config', 'rag_config.json'), 'utf8'))
  assert.equal(rag.qdrant_url, `http://127.0.0.1:${status.ports?.qdrantHttp}`)
})

test('start: the startup budget is shared by qdrant and the engine', async (t) => {
  const f = await fixture(t)
  let clock = 0
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input)
    clock += 40
    if (url.includes('/readyz')) return new Response('ok', { status: 200 })
    if (url.includes('/health')) return new Response('down', { status: 503 })
    return new Response('[]', { status: 200 })
  }) as typeof fetch
  const spawn: SpawnFn = () => ({
    pid: 1,
    onData: () => {},
    onExit: () => {},
    kill: () => {},
  })
  const sup = supervisor(f, {
    spawn,
    fetchImpl,
    nowMs: () => clock,
    readyTimeoutMs: 90,
    probeIntervalMs: 1,
  })

  const status = await sup.ensure()

  assert.equal(status.phase, 'error')
  assert.equal(status.error?.code, 'engine_not_ready')
  // Qdrant used 40; a per-role engine budget would run to 130. The shared
  // deadline cuts the second role off once the overall 90 is gone.
  assert.ok(clock >= 90, `clock=${clock}`)
  assert.ok(clock < 160, `clock=${clock}`)
})

// ── adopt / lease ───────────────────────────────────────────────────────────

test('adopt: a live instance is reused and nothing is spawned', async (t) => {
  const f = await fixture(t)
  const ports = f.preferredPorts
  const server = createHttpServer((req, res) => {
    if (req.url === '/api/knowledge-bases' && req.headers.authorization === 'Bearer live-token') {
      res.writeHead(200)
      res.end('[]')
      return
    }
    res.writeHead(401)
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(ports.knowledge, '127.0.0.1', resolve))
  t.after(() => server.close())
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'service.json'),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      qdrantPid: null,
      runtimeVersion: VERSION,
      token: 'live-token',
      ports,
      startedAt: '2026-10-25T00:00:00.000Z',
    }),
  )

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.adopted, true)
  assert.equal(f.spawned.requests.length, 0)
  assert.equal(JSON.parse(readFileSync(join(f.root, 'state', 'current.json'), 'utf8')).runtimeVersion, VERSION)
})

test('adopt: a service record for another version is not adopted', async (t) => {
  const f = await fixture(t)
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'service.json'),
    JSON.stringify({
      version: 1,
      pid: null,
      qdrantPid: null,
      runtimeVersion: '9.9.9-1',
      token: 'stale-token',
      ports: f.preferredPorts,
      startedAt: '2026-10-25T00:00:00.000Z',
    }),
  )

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.adopted, false)
  assert.equal(f.spawned.requests.length, 2)
  const record = sanitizeService(JSON.parse(readFileSync(join(f.root, 'state', 'service.json'), 'utf8')))
  assert.equal(record?.runtimeVersion, VERSION)
  assert.equal(JSON.parse(readFileSync(join(f.root, 'state', 'current.json'), 'utf8')).runtimeVersion, VERSION)
})

test('current: a restart keeps an existing previousVersion', async (t) => {
  const f = await fixture(t)
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'current.json'),
    JSON.stringify({
      version: 1,
      runtimeVersion: VERSION,
      previousVersion: '2.0.0-1',
      updatedAt: '2026-10-25T00:00:00.000Z',
    }),
  )

  await supervisor(f).ensure()

  const current = JSON.parse(readFileSync(join(f.root, 'state', 'current.json'), 'utf8'))
  assert.equal(current.runtimeVersion, VERSION)
  assert.equal(current.previousVersion, '2.0.0-1')
  assert.equal(current.updatedAt, '2026-10-25T00:00:00.000Z')
})

test('current: a claim leaves an existing pointer untouched', async (t) => {
  const f = await fixture(t)
  const ports = f.preferredPorts
  const server = createHttpServer((req, res) => {
    if (req.url === '/api/knowledge-bases' && req.headers.authorization === 'Bearer live-token') {
      res.writeHead(200)
      res.end('[]')
      return
    }
    res.writeHead(401)
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(ports.knowledge, '127.0.0.1', resolve))
  t.after(() => server.close())
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'service.json'),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      qdrantPid: null,
      runtimeVersion: VERSION,
      token: 'live-token',
      ports,
      startedAt: '2026-10-25T00:00:00.000Z',
    }),
  )
  writeFileSync(
    join(f.root, 'state', 'current.json'),
    JSON.stringify({
      version: 1,
      runtimeVersion: VERSION,
      previousVersion: '2.0.0-1',
      updatedAt: '2026-10-25T00:00:00.000Z',
    }),
  )

  const status = await supervisor(f).ensure()

  assert.equal(status.adopted, true)
  const current = JSON.parse(readFileSync(join(f.root, 'state', 'current.json'), 'utf8'))
  assert.equal(current.runtimeVersion, VERSION)
  assert.equal(current.previousVersion, '2.0.0-1')
  assert.equal(current.updatedAt, '2026-10-25T00:00:00.000Z')
})

test('current: a healthy service wins a stale pointer and rewrites it', async (t) => {
  const f = await fixture(t)
  writeFileSync(join(f.runtime, 'runtime-manifest.json'), '{}')
  const ports = f.preferredPorts
  const server = createHttpServer((req, res) => {
    if (req.url === '/api/knowledge-bases' && req.headers.authorization === 'Bearer live-token') {
      res.writeHead(200)
      res.end('[]')
      return
    }
    res.writeHead(401)
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(ports.knowledge, '127.0.0.1', resolve))
  t.after(() => server.close())
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'service.json'),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      qdrantPid: null,
      runtimeVersion: VERSION,
      token: 'live-token',
      ports,
      startedAt: '2026-10-25T00:00:00.000Z',
    }),
  )
  writeFileSync(
    join(f.root, 'state', 'current.json'),
    JSON.stringify({ version: 1, runtimeVersion: '2.0.0-1', updatedAt: '2026-10-25T00:00:00.000Z' }),
  )

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.adopted, true)
  assert.equal(f.spawned.requests.length, 0)
  const current = JSON.parse(readFileSync(join(f.root, 'state', 'current.json'), 'utf8'))
  assert.equal(current.runtimeVersion, VERSION)
  assert.equal(current.previousVersion, '2.0.0-1')
})

test('current: a running version without an installed runtime blocks the pointer', async (t) => {
  const f = await fixture(t)
  const ports = f.preferredPorts
  const server = createHttpServer((req, res) => {
    if (req.url === '/api/knowledge-bases' && req.headers.authorization === 'Bearer live-token') {
      res.writeHead(200)
      res.end('[]')
      return
    }
    res.writeHead(401)
    res.end()
  })
  await new Promise<void>((resolve) => server.listen(ports.knowledge, '127.0.0.1', resolve))
  t.after(() => server.close())
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'service.json'),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      qdrantPid: null,
      runtimeVersion: VERSION,
      token: 'live-token',
      ports,
      startedAt: '2026-10-25T00:00:00.000Z',
    }),
  )
  writeFileSync(
    join(f.root, 'state', 'current.json'),
    JSON.stringify({ version: 1, runtimeVersion: '2.0.0-1', updatedAt: '2026-10-25T00:00:00.000Z' }),
  )

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'ready')
  assert.equal(status.adopted, true)
  assert.equal(f.spawned.requests.length, 0)
  assert.equal(status.upgrade?.state, 'blocked')
  assert.equal(status.upgrade?.error?.code, 'state_version_conflict')
  assert.equal(status.upgrade?.fromVersion, '2.0.0-1')
  const current = JSON.parse(readFileSync(join(f.root, 'state', 'current.json'), 'utf8'))
  assert.equal(current.runtimeVersion, '2.0.0-1')
  assert.equal(current.previousVersion, undefined)
})

test('lease: a live foreign owner blocks startup without spawning', async (t) => {
  const f = await fixture(t)
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'lease.json'),
    JSON.stringify({ version: 1, owner: 'other-host', pid: process.pid, startedAt: '2026-10-25T00:00:00.000Z' }),
  )

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'error')
  assert.equal(status.error?.code, 'lease_held')
  assert.equal(f.spawned.requests.length, 0)
})

test('lease: a stale owner is taken over', async (t) => {
  const f = await fixture(t)
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'lease.json'),
    JSON.stringify({ version: 1, owner: 'dead-host', pid: 999_999, startedAt: '2026-10-25T00:00:00.000Z' }),
  )

  const status = await supervisor(f, { isAlive: () => false }).ensure()

  assert.equal(status.phase, 'ready')
})

// ── watchdog (adopted instances) ────────────────────────────────────────────

const WATCHDOG_MS = 10_000

interface WatchdogTimers {
  set: (fn: () => void, ms: number) => unknown
  clear: (handle: unknown) => void
  fire: (ms: number) => boolean
  count: (ms: number) => number
}

function watchdogTimers(): WatchdogTimers {
  let next = 1
  const pending = new Map<number, { fn: () => void; ms: number }>()
  return {
    set: (fn, ms) => {
      const id = next++
      pending.set(id, { fn, ms })
      return id
    },
    clear: (handle) => {
      pending.delete(handle as number)
    },
    fire: (ms) => {
      const entry = [...pending.entries()].find(([, item]) => item.ms === ms)
      if (!entry) return false
      pending.delete(entry[0])
      entry[1].fn()
      return true
    },
    count: (ms) => [...pending.values()].filter((item) => item.ms === ms).length,
  }
}

async function until(condition: () => boolean, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline && !condition()) {
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  assert.ok(condition(), 'condition met before the timeout')
}

interface AdoptedFixture {
  f: Fixture
  sup: Supervisor
  timers: WatchdogTimers
  stop: () => Promise<void>
  start: () => Promise<void>
}

/** A service another profile owns: recording a live instance means adopted. */
async function adoptedFixture(t: TestContext): Promise<AdoptedFixture> {
  const f = await fixture(t)
  const port = f.preferredPorts.knowledge
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    if (req.url === '/api/knowledge-bases' && req.headers.authorization === 'Bearer live-token') {
      res.writeHead(200)
      res.end('[]')
      return
    }
    res.writeHead(401)
    res.end()
  }
  let server = createHttpServer(handler)
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  t.after(() => {
    if (server.listening) server.close()
  })
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'service.json'),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      qdrantPid: null,
      runtimeVersion: VERSION,
      token: 'live-token',
      ports: f.preferredPorts,
      startedAt: '2026-10-25T00:00:00.000Z',
    }),
  )
  const timers = watchdogTimers()
  const sup = supervisor(f, { timers })
  const status = await sup.ensure()
  assert.equal(status.adopted, true)
  return {
    f,
    sup,
    timers,
    stop: () =>
      new Promise<void>((resolve) => {
        if (!server.listening) {
          resolve()
          return
        }
        server.close(() => resolve())
      }),
    start: async () => {
      server = createHttpServer(handler)
      await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
    },
  }
}

test('watchdog: one failed probe keeps the adopted instance ready', async (t) => {
  const a = await adoptedFixture(t)
  await a.stop()

  assert.equal(a.timers.fire(WATCHDOG_MS), true)
  await until(() => a.timers.count(WATCHDOG_MS) === 1)

  const status = a.sup.status()
  assert.equal(status.phase, 'ready')
  assert.equal(status.error, undefined)
  assert.equal(existsSync(join(a.f.root, 'state', 'service.json')), true)
})

test('watchdog: two consecutive failures flip to adopted_unreachable and touch nothing', async (t) => {
  const a = await adoptedFixture(t)
  const leasePath = join(a.f.root, 'state', 'lease.json')
  const lease = JSON.stringify({ version: 1, owner: 'other-host', pid: process.pid, startedAt: '2026-10-25T00:00:00.000Z' })
  writeFileSync(leasePath, lease)
  await a.stop()

  a.timers.fire(WATCHDOG_MS)
  await until(() => a.timers.count(WATCHDOG_MS) === 1)
  a.timers.fire(WATCHDOG_MS)
  await until(() => a.sup.status().phase === 'error')

  const status = a.sup.status()
  assert.equal(status.error?.code, 'adopted_unreachable')
  assert.equal(status.adopted, true)
  assert.equal(existsSync(join(a.f.root, 'state', 'service.json')), true)
  assert.equal(readFileSync(leasePath, 'utf8'), lease)
  assert.equal(a.f.spawned.requests.length, 0)
})

test('watchdog: a healthy probe resets the failure count', async (t) => {
  const a = await adoptedFixture(t)
  await a.stop()

  a.timers.fire(WATCHDOG_MS)
  await until(() => a.timers.count(WATCHDOG_MS) === 1)
  assert.equal(a.sup.status().phase, 'ready')

  await a.start()
  a.timers.fire(WATCHDOG_MS)
  await until(() => a.timers.count(WATCHDOG_MS) === 1)

  await a.stop()
  a.timers.fire(WATCHDOG_MS)
  await until(() => a.timers.count(WATCHDOG_MS) === 1)
  assert.equal(a.sup.status().phase, 'ready')
})

test('watchdog: unloading an adopted instance keeps the probes running', async (t) => {
  const a = await adoptedFixture(t)

  a.sup.dispose()

  assert.equal(existsSync(join(a.f.root, 'state', 'service.json')), true)
  assert.equal(a.timers.count(WATCHDOG_MS), 1)

  await a.stop()
  a.timers.fire(WATCHDOG_MS)
  await until(() => a.timers.count(WATCHDOG_MS) === 1)
  a.timers.fire(WATCHDOG_MS)
  await until(() => a.sup.status().phase === 'error')
  assert.equal(a.sup.status().error?.code, 'adopted_unreachable')
})

test('watchdog: retry re-adopts once the service answers again', async (t) => {
  const a = await adoptedFixture(t)
  await a.stop()
  a.timers.fire(WATCHDOG_MS)
  await until(() => a.timers.count(WATCHDOG_MS) === 1)
  a.timers.fire(WATCHDOG_MS)
  await until(() => a.sup.status().phase === 'error')

  await a.start()
  const status = await a.sup.retry()

  assert.equal(status.phase, 'ready')
  assert.equal(status.adopted, true)
  assert.equal(a.timers.count(WATCHDOG_MS), 1)
})

test('watchdog: a self-managed stack does not schedule one', async (t) => {
  const f = await fixture(t)
  const timers = watchdogTimers()
  const sup = supervisor(f, { timers })

  const status = await sup.ensure()

  assert.equal(status.adopted, false)
  assert.equal(timers.count(WATCHDOG_MS), 0)
})

// ── startup port retry ──────────────────────────────────────────────────────

/** A real listener on the planned port: `probePort` still reports it free, so
 * the bind failure only shows up when the child starts. */
async function occupy(t: TestContext, port: number): Promise<void> {
  const server = createNetServer()
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  t.after(() => server.close())
}

const isQdrant = (request: SpawnRequest): boolean => request.command.endsWith('qdrant.exe')
const enginePortOf = (request: SpawnRequest): number => Number(request.args[request.args.indexOf('--port') + 1])

test('retry: a stolen qdrant port is re-planned once and the stack comes up', async (t) => {
  const f = await fixture(t)
  await occupy(t, f.preferredPorts.qdrantHttp)

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'ready')
  const qdrantPorts = f.spawned.requests
    .filter(isQdrant)
    .map((request) => Number(request.env.QDRANT__SERVICE__HTTP_PORT))
  assert.deepEqual(qdrantPorts, [f.preferredPorts.qdrantHttp, f.preferredPorts.qdrantHttp + 1])
  const rag = JSON.parse(readFileSync(join(f.root, 'config', 'rag_config.json'), 'utf8'))
  assert.equal(rag.qdrant_url, `http://127.0.0.1:${f.preferredPorts.qdrantHttp + 1}`)
})

test('retry: a second bind failure reports qdrant_exited after one retry', async (t) => {
  const f = await fixture(t)
  await occupy(t, f.preferredPorts.qdrantHttp)
  await occupy(t, f.preferredPorts.qdrantHttp + 1)

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'error')
  assert.equal(status.error?.code, 'qdrant_exited')
  assert.match(status.error?.detail ?? '', /after one retry/)
  assert.equal(f.spawned.requests.filter(isQdrant).length, 2)
  assert.equal(f.spawned.requests.filter((request) => !isQdrant(request)).length, 0)
})

test('retry: an engine bind failure re-plans only the engine port', async (t) => {
  const f = await fixture(t)
  await occupy(t, f.preferredPorts.knowledge)

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'ready')
  const qdrantPorts = f.spawned.requests
    .filter(isQdrant)
    .map((request) => Number(request.env.QDRANT__SERVICE__HTTP_PORT))
  const enginePorts = f.spawned.requests.filter((request) => !isQdrant(request)).map(enginePortOf)
  assert.deepEqual(qdrantPorts, [f.preferredPorts.qdrantHttp, f.preferredPorts.qdrantHttp])
  assert.deepEqual(enginePorts, [f.preferredPorts.knowledge, f.preferredPorts.knowledge + 1])
})

test('retry: a startup failure without bind text is not retried', async (t) => {
  const f = await fixture(t, 'crash-engine')

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'error')
  assert.equal(status.error?.code, 'engine_exited')
  assert.doesNotMatch(status.error?.detail ?? '', /after one retry/)
  assert.equal(f.spawned.requests.filter(isQdrant).length, 1)
  assert.equal(f.spawned.requests.filter((request) => !isQdrant(request)).length, 1)
})

// ── failures ────────────────────────────────────────────────────────────────

test('fail: an engine that exits during startup reports its phase, not a timeout', async (t) => {
  const f = await fixture(t, 'crash-engine')

  const status = await supervisor(f).ensure()

  assert.equal(status.phase, 'error')
  assert.equal(status.error?.phase, 'engine')
  assert.equal(status.error?.code, 'engine_exited')
  assert.equal(existsSync(join(f.root, 'state', 'service.json')), false)
  assert.equal(existsSync(join(f.root, 'state', 'lease.json')), false)
})

test('crash: an engine that dies after ready flips the status to error', async (t) => {
  const f = await fixture(t)
  const sup = supervisor(f)
  const ready = await sup.ensure()
  assert.equal(ready.phase, 'ready')

  f.spawned.children[1].kill()
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline && sup.status().phase === 'ready') {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  const status = sup.status()
  assert.equal(status.phase, 'error')
  assert.equal(status.error?.phase, 'engine')
  assert.equal(status.error?.code, 'engine_exited')
  assert.equal(existsSync(join(f.root, 'state', 'service.json')), false)
  assert.equal(existsSync(join(f.root, 'state', 'lease.json')), false)
})

test('crash: the log tail reads only the end of an oversized log', async (t) => {
  const f = await fixture(t)
  const sup = supervisor(f)
  assert.equal((await sup.ensure()).phase, 'ready')
  const engineLog = join(f.root, 'state', 'logs', 'engine.log')
  appendFileSync(engineLog, `${'x'.repeat(1_024)}\n`.repeat(4_000))
  appendFileSync(engineLog, 'TAIL-MARKER\n')

  f.spawned.children[1].kill()
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline && sup.status().phase === 'ready') {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  const status = sup.status()
  assert.equal(status.phase, 'error')
  assert.match(status.logTail ?? '', /TAIL-MARKER/)
  assert.ok((status.logTail ?? '').length < 70 * 1_024)
})

test('start: an oversized log rotates even when the previous generation exists', async (t) => {
  const f = await fixture(t)
  const logs = join(f.root, 'state', 'logs')
  mkdirSync(logs, { recursive: true })
  const engineLog = join(logs, 'engine.log')
  const previous = join(logs, 'engine.log.1')
  const oversized = 'OLD\n'.repeat(1_100_000)
  writeFileSync(previous, 'PREVIOUS\n')
  writeFileSync(engineLog, oversized)

  assert.equal((await supervisor(f).ensure()).phase, 'ready')

  assert.equal(readFileSync(previous, 'utf8'), oversized)
  assert.ok(!existsSync(engineLog) || !readFileSync(engineLog, 'utf8').startsWith('OLD'))
})

test('start: a chatty child keeps its log under the cap while it runs', async (t) => {
  const f = await fixture(t)
  const spawned = fakeSpawn({ qdrant: f.stubs.qdrant, engine: f.stubs.spam })
  t.after(() => spawned.stop())
  assert.equal((await supervisor(f, { spawn: spawned.spawn }).ensure()).phase, 'ready')

  const logs = join(f.root, 'state', 'logs')
  const currentPath = join(logs, 'engine.log')
  const rotatedPath = `${currentPath}.1`
  const total = 2_600 * 1_024
  const written = () =>
    (existsSync(currentPath) ? statSync(currentPath).size : 0) +
    (existsSync(rotatedPath) ? statSync(rotatedPath).size : 0)
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline && written() < total) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  assert.equal(written(), total)
  assert.ok(existsSync(rotatedPath))
  assert.ok(statSync(rotatedPath).size > 1_500_000)
  assert.ok(statSync(currentPath).size < 2 * 1024 * 1024)
})

// ── stop ────────────────────────────────────────────────────────────────────

test('stop: dispose kills both children and clears service.json and the lease', async (t) => {
  const f = await fixture(t)
  const sup = supervisor(f)
  const status = await sup.ensure()
  assert.equal(status.phase, 'ready')

  sup.dispose()
  const port = status.ports!.knowledge
  const deadline = Date.now() + 5_000
  let answered = true
  while (Date.now() < deadline) {
    answered = await fetch(`http://127.0.0.1:${port}/health`)
      .then(() => true)
      .catch(() => false)
    if (!answered) break
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  assert.equal(answered, false, 'the engine port stops answering')
  assert.equal(existsSync(join(f.root, 'state', 'service.json')), false)
  assert.equal(existsSync(join(f.root, 'state', 'lease.json')), false)
})

test('stop: an adopted instance is left running', async (t) => {
  const f = await fixture(t)
  const server = createHttpServer((_req, res) => {
    res.writeHead(200)
    res.end('[]')
  })
  await new Promise<void>((resolve) => server.listen(f.preferredPorts.knowledge, '127.0.0.1', resolve))
  t.after(() => server.close())
  mkdirSync(join(f.root, 'state'), { recursive: true })
  writeFileSync(
    join(f.root, 'state', 'service.json'),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      qdrantPid: null,
      runtimeVersion: VERSION,
      token: 'live-token',
      ports: f.preferredPorts,
      startedAt: '2026-10-25T00:00:00.000Z',
    }),
  )
  const sup = supervisor(f)
  await sup.ensure()

  sup.dispose()

  assert.equal(existsSync(join(f.root, 'state', 'service.json')), true)
})

// ── singleton and dispose debounce ──────────────────────────────────────────

test('singleton: one supervisor per root and a pending dispose is cancelled by ensure', async (t) => {
  const f = await fixture(t)
  const pending = new Map<number, () => void>()
  let nextId = 0
  const timers = {
    set: (fn: () => void) => {
      pending.set(++nextId, fn)
      return nextId
    },
    clear: (handle: unknown) => {
      pending.delete(handle as number)
    },
  }
  const options = {
    root: f.root,
    runtimeVersion: VERSION,
    token: 'test-token',
    spawn: f.spawned.spawn,
    preferredPorts: f.preferredPorts,
    probePort: async () => true,
    readyTimeoutMs: 8_000,
    probeIntervalMs: 40,
    disposeGraceMs: 5_000,
    timers,
  }
  t.after(() => forgetSupervisor(f.root, VERSION))

  const first = getSupervisor(options)
  await first.ensure()
  first.dispose()
  assert.equal(pending.size, 1, 'dispose is deferred')

  const second = getSupervisor(options)
  assert.equal(second, first, 'the same instance comes back')
  await second.ensure()
  assert.equal(pending.size, 0, 'ensure cancels the pending dispose')

  for (const fire of [...pending.values()]) fire()
  assert.equal(existsSync(join(f.root, 'state', 'service.json')), true)
})

// ── plugin reload: the singleton is handed over, not forgotten ──────────────

test('reload: the ready hook follows the newest plugin instance', async (t) => {
  const f = await fixture(t)
  const hits: string[] = []
  const sup = supervisor(f, { onReady: () => hits.push('first') })

  assert.equal((await sup.ensure()).phase, 'ready')

  sup.rebind(() => hits.push('second'))
  const again = await sup.retry()

  assert.equal(again.phase, 'ready')
  assert.equal(again.adopted, true)
  assert.deepEqual(hits, ['first', 'second'])
})

test('reload: the singleton is handed over and the pending kill is cancelled', async (t) => {
  const f = await fixture(t)
  const pending = new Map<number, () => void>()
  let nextId = 0
  const timers = {
    set: (fn: () => void) => {
      pending.set(++nextId, fn)
      return nextId
    },
    clear: (handle: unknown) => {
      pending.delete(handle as number)
    },
  }
  const hits: string[] = []
  const base = {
    root: f.root,
    runtimeVersion: VERSION,
    token: 'test-token',
    spawn: f.spawned.spawn,
    preferredPorts: f.preferredPorts,
    probePort: async () => true,
    readyTimeoutMs: 8_000,
    probeIntervalMs: 40,
    disposeGraceMs: 5_000,
    timers,
  }
  t.after(() => forgetSupervisor(f.root, VERSION))

  const first = getSupervisor({ ...base, onReady: () => hits.push('first') })
  await first.ensure()
  first.dispose()
  assert.equal(pending.size, 1, 'dispose is deferred')

  const second = getSupervisor({ ...base, onReady: () => hits.push('second') })
  assert.equal(second, first, 'the same instance comes back')
  await second.ensure()
  assert.equal(pending.size, 0, 'the reload cancels the pending kill')

  await second.retry()
  assert.deepEqual(hits, ['first', 'second'], 'the new instance receives ready events')
})

test('stop: the bridge disposes the running singleton instead of forgetting it', async (t) => {
  const read = readManifest({ packageRoot: PACKAGE_ROOT })
  assert.equal(read.ok, true)
  if (!read.ok) return
  const version = read.manifest.packs[`${process.platform}-${process.arch}`]?.runtimeVersion
  if (!version) {
    t.skip('no runtime pack for this platform')
    return
  }

  const f = await fixture(t, 'ok', version)
  const pending = new Map<number, () => void>()
  let nextId = 0
  const timers = {
    set: (fn: () => void) => {
      pending.set(++nextId, fn)
      return nextId
    },
    clear: (handle: unknown) => {
      pending.delete(handle as number)
    },
  }
  const options = {
    root: f.root,
    runtimeVersion: version,
    token: 'test-token',
    spawn: f.spawned.spawn,
    preferredPorts: f.preferredPorts,
    probePort: async () => true,
    readyTimeoutMs: 8_000,
    probeIntervalMs: 40,
    disposeGraceMs: 5_000,
    timers,
  }
  t.after(() => forgetSupervisor(f.root, version))

  const sup = getSupervisor(options)
  assert.equal((await sup.ensure()).phase, 'ready')

  const home = mkdtempSync(join(tmpdir(), 'hrag-home-'))
  const anchor = join(home, 'harness-rag')
  mkdirSync(anchor, { recursive: true })
  writeFileSync(join(anchor, 'location.json'), JSON.stringify({ version: 1, root: f.root }))
  const host: BridgeHost = {
    get: (name) => (name === 'subprocess' ? { spawn: f.spawned.spawn } : undefined),
    inject: () => {},
  }
  const bridge = createRuntimeBridge(host, defaultConfig, { DSH_HOME: home })

  const facade = bridge.ops.supervisor()
  assert.ok(facade, 'the bridge exposes the coordinator facade')
  assert.equal((await facade.ensure()).phase, 'ready')
  assert.equal(facade.status().runtimeVersion, version)
  bridge.stop()
  assert.equal(pending.size, 1, 'stop defers the kill')

  const reloaded = getSupervisor(options)
  assert.equal(reloaded, sup, 'the singleton stays registered for a reload')
  await reloaded.ensure()
  assert.equal(pending.size, 0, 'the reload cancels the pending kill')
  assert.equal(existsSync(join(f.root, 'state', 'service.json')), true)
})

test('probePortAnswer: a listener answers and a closed port does not', async () => {
  const server = createNetServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  assert.equal(await probePortAnswer(port), true)
  await new Promise<void>((resolve) => server.close(() => resolve()))
  assert.equal(await probePortAnswer(port), false)
})
