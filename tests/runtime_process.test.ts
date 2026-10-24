import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isOwnedPath,
  killTree,
  sanitizeLease,
  sanitizeService,
  type ServiceRecord,
} from '../src/runtime/process.ts'

const service: ServiceRecord = {
  version: 1,
  pid: 100,
  qdrantPid: 200,
  runtimeVersion: '2.1.0-1',
  token: 'sealed-token',
  ports: { qdrantHttp: 6333, qdrantGrpc: 6334, knowledge: 8020 },
  startedAt: '2026-10-25T00:00:00.000Z',
}

// ── service.json ────────────────────────────────────────────────────────────

test('service: a well-formed record survives', () => {
  assert.deepEqual(sanitizeService(service), service)
})

test('service: a missing qdrant pid is tolerated', () => {
  const { qdrantPid: _dropped, ...withoutQdrant } = service
  assert.deepEqual(sanitizeService(withoutQdrant), { ...withoutQdrant, qdrantPid: null })
})

test('service: broken records degrade to null', () => {
  const broken: unknown[] = [
    null,
    undefined,
    [],
    { ...service, version: 2 },
    { ...service, pid: 0 },
    { ...service, pid: 1.5 },
    { ...service, token: '' },
    { ...service, token: 7 },
    { ...service, runtimeVersion: '2.1.0/1' },
    { ...service, runtimeVersion: '' },
    { ...service, startedAt: '' },
    { ...service, ports: undefined },
    { ...service, ports: { qdrantHttp: 6333, qdrantGrpc: 6334 } },
    { ...service, ports: { ...service.ports, knowledge: -1 } },
  ]
  for (const raw of broken) assert.equal(sanitizeService(raw), null, JSON.stringify(raw))
})

// ── lease.json ──────────────────────────────────────────────────────────────

test('lease: a well-formed record survives and broken ones degrade to null', () => {
  const lease = { version: 1, owner: 'host-1', pid: 42, startedAt: '2026-10-25T00:00:00.000Z' }
  assert.deepEqual(sanitizeLease(lease), lease)
  for (const raw of [
    null,
    { ...lease, version: 2 },
    { ...lease, owner: '  ' },
    { ...lease, pid: 0 },
    { ...lease, pid: '42' },
    { ...lease, startedAt: '' },
  ]) {
    assert.equal(sanitizeLease(raw), null, JSON.stringify(raw))
  }
})

// ── ownership ───────────────────────────────────────────────────────────────

test('ownership: only executables under the runtime root count', () => {
  const root = 'C:\\Users\\me\\.dsh\\harness-rag'
  assert.equal(isOwnedPath('C:\\Users\\me\\.dsh\\harness-rag\\runtime\\2.1.0-1\\python\\python.exe', root), true)
  assert.equal(isOwnedPath('C:\\USERS\\ME\\.DSH\\HARNESS-RAG\\runtime\\x\\python.exe', root), true)
  assert.equal(isOwnedPath('C:\\Users\\me\\.dsh\\harness-rag2\\runtime\\python.exe', root), false)
  assert.equal(isOwnedPath('C:\\Users\\me\\AppData\\Local\\python.exe', root), false)
  assert.equal(isOwnedPath(null, root), false)
})

// ── kill ────────────────────────────────────────────────────────────────────

test('kill: Windows uses taskkill on the tree and reports failure honestly', () => {
  const calls: string[][] = []
  const ok = killTree(1234, {
    platform: 'win32',
    run: (command, args, _env) => {
      calls.push([command, ...args])
      return true
    },
  })

  assert.equal(ok, true)
  assert.deepEqual(calls, [['taskkill', '/PID', '1234', '/T', '/F']])

  const failed = killTree(99, { platform: 'win32', run: () => false })
  assert.equal(failed, false)
})

test('kill: other platforms signal the process and map a missing pid to false', () => {
  const signals: Array<[number, string]> = []
  const ok = killTree(7, {
    platform: 'linux',
    signal: (pid, name) => {
      signals.push([pid, name])
    },
  })
  assert.equal(ok, true)
  assert.deepEqual(signals, [[7, 'SIGTERM']])

  const gone = killTree(7, {
    platform: 'linux',
    signal: () => {
      throw new Error('ESRCH')
    },
  })
  assert.equal(gone, false)
})
