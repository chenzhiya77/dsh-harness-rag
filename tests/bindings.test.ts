import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  bindingsPath,
  createBindingsStore,
  resolveKbId,
  sanitizeBindings,
  type BindingsFs,
  type BindingsFile,
} from '../src/bindings.ts'

const NOW = '2026-10-23T05:00:00.000Z'

function tempHome(): string {
  return mkdtempSync(join(tmpdir(), 'hrag-bindings-'))
}

function realFs(overrides: Partial<BindingsFs> = {}): BindingsFs {
  return {
    readFileSync: (path, encoding) => readFileSync(path, encoding),
    writeFileSync: (path, data, encoding) => writeFileSync(path, data, encoding),
    renameSync: (from, to) => renameSync(from, to),
    mkdirSync: (path, options) => {
      mkdirSync(path, options)
    },
    copyFileSync: (from, to) => copyFileSync(from, to),
    existsSync: (path) => existsSync(path),
    ...overrides,
  }
}

// ── sanitizeBindings ────────────────────────────────────────────────────────

test('sanitize: non-object input yields an empty table', () => {
  for (const raw of [null, undefined, 42, 'x', [], [{ kbId: 'a' }]]) {
    assert.deepEqual(sanitizeBindings(raw), {})
  }
})

test('sanitize: a valid file keeps every binding', () => {
  const raw: BindingsFile = {
    version: 1,
    bindings: {
      s1: { kbId: 'kb-a', kbName: '产品文档', updatedAt: NOW },
      s2: { kbId: 'kb-b', updatedAt: NOW },
    },
  }
  assert.deepEqual(sanitizeBindings(raw), raw.bindings)
})

test('sanitize: an unknown version yields an empty table', () => {
  assert.deepEqual(sanitizeBindings({ version: 2, bindings: { s1: { kbId: 'a', updatedAt: NOW } } }), {})
  assert.deepEqual(sanitizeBindings({ bindings: { s1: { kbId: 'a', updatedAt: NOW } } }), {})
})

test('sanitize: entries without a string kbId are dropped', () => {
  const table = sanitizeBindings({
    version: 1,
    bindings: {
      ok: { kbId: 'kb-a', updatedAt: NOW },
      noId: { updatedAt: NOW },
      blankId: { kbId: '   ', updatedAt: NOW },
      numeric: { kbId: 7, updatedAt: NOW },
      notObject: 'kb-a',
      missingUpdatedAt: { kbId: 'kb-c' },
    },
  })
  assert.deepEqual(Object.keys(table), ['ok'])
})

test('sanitize: kbName is kept only when a non-blank string, other fields dropped', () => {
  const table = sanitizeBindings({
    version: 1,
    bindings: {
      s1: { kbId: 'kb-a', kbName: '  ', updatedAt: NOW, extra: true },
      s2: { kbId: 'kb-b', kbName: ' 会议纪要 ', updatedAt: NOW },
    },
  })
  assert.deepEqual(table.s1, { kbId: 'kb-a', updatedAt: NOW })
  assert.deepEqual(table.s2, { kbId: 'kb-b', kbName: '会议纪要', updatedAt: NOW })
})

// ── resolveKbId ─────────────────────────────────────────────────────────────

test('resolveKbId: argument wins over the session binding', () => {
  const bindings = { s1: { kbId: 'kb-bound', updatedAt: NOW } }
  assert.deepEqual(resolveKbId({ argKbId: ' kb-arg ', sessionId: 's1', bindings }), {
    kbId: 'kb-arg',
    source: 'arg',
  })
})

test('resolveKbId: the session binding fills in when the argument is absent', () => {
  const bindings = { s1: { kbId: 'kb-bound', updatedAt: NOW } }
  assert.deepEqual(resolveKbId({ sessionId: 's1', bindings }), {
    kbId: 'kb-bound',
    source: 'session',
  })
})

test('resolveKbId: no argument and no binding means no kb', () => {
  assert.equal(resolveKbId({ bindings: {} }), null)
  assert.equal(resolveKbId({ argKbId: '  ', sessionId: 's2', bindings: { s1: { kbId: 'kb', updatedAt: NOW } } }), null)
  assert.equal(resolveKbId({ sessionId: 's1', bindings: {} }), null)
})

// ── store ───────────────────────────────────────────────────────────────────

test('store: path sits under <home>/harness-rag/bindings.json', () => {
  assert.equal(bindingsPath('/tmp/dsh'), join('/tmp/dsh', 'harness-rag', 'bindings.json'))
})

test('store: set persists, a fresh store loads it back', async () => {
  const home = tempHome()
  const store = createBindingsStore({ homeDir: home, now: () => NOW })
  store.loadSync()
  await store.set('s1', 'kb-a', '产品文档')

  const onDisk = JSON.parse(readFileSync(bindingsPath(home), 'utf8'))
  assert.deepEqual(onDisk, {
    version: 1,
    bindings: { s1: { kbId: 'kb-a', kbName: '产品文档', updatedAt: NOW } },
  })

  const reopened = createBindingsStore({ homeDir: home })
  reopened.loadSync()
  assert.deepEqual(reopened.get('s1'), { kbId: 'kb-a', kbName: '产品文档', updatedAt: NOW })
})

test('store: missing file is an empty table, get/list/delete behave', async () => {
  const home = tempHome()
  const store = createBindingsStore({ homeDir: home, now: () => NOW })
  store.loadSync()
  assert.equal(store.get('none'), undefined)
  assert.deepEqual(store.list(), [])

  await store.set('s1', 'kb-a')
  await store.set('s2', 'kb-b')
  assert.deepEqual(store.list().map((row) => row.sessionId).sort(), ['s1', 's2'])

  await store.delete('s1')
  assert.equal(store.get('s1'), undefined)
  assert.deepEqual(store.list().map((row) => row.sessionId), ['s2'])
})

test('store: concurrent sets serialize and the last value survives', async () => {
  const home = tempHome()
  const store = createBindingsStore({ homeDir: home, now: () => NOW })
  store.loadSync()
  await Promise.all([store.set('s1', 'kb-1'), store.set('s2', 'kb-2'), store.set('s1', 'kb-3')])

  const reopened = createBindingsStore({ homeDir: home })
  reopened.loadSync()
  assert.equal(reopened.get('s1')?.kbId, 'kb-3')
  assert.equal(reopened.get('s2')?.kbId, 'kb-2')
})

test('store: corrupt file loads empty and is backed up on the next write', async () => {
  const home = tempHome()
  const path = bindingsPath(home)
  mkdirSync(join(home, 'harness-rag'), { recursive: true })
  writeFileSync(path, '{"version":1,"bindings":', 'utf8')

  const store = createBindingsStore({ homeDir: home, now: () => NOW })
  store.loadSync()
  assert.deepEqual(store.list(), [])

  await store.set('s1', 'kb-a')
  assert.equal(readFileSync(`${path}.bak`, 'utf8'), '{"version":1,"bindings":')
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).bindings.s1.kbId, 'kb-a')
})

test('store: a failed write keeps memory and the old file, and rejects', async () => {
  const home = tempHome()
  const seed = createBindingsStore({ homeDir: home, now: () => NOW })
  seed.loadSync()
  await seed.set('s1', 'kb-old')

  const failing = realFs({
    writeFileSync: () => {
      throw new Error('disk full')
    },
  })
  const store = createBindingsStore({ homeDir: home, fs: failing, now: () => NOW })
  store.loadSync()
  await assert.rejects(store.set('s1', 'kb-new'), /disk full/)
  assert.equal(store.get('s1')?.kbId, 'kb-new')

  const onDisk = JSON.parse(readFileSync(bindingsPath(home), 'utf8'))
  assert.equal(onDisk.bindings.s1.kbId, 'kb-old')
})

test('store: loadSync is idempotent and ignores later external edits', async () => {
  const home = tempHome()
  const store = createBindingsStore({ homeDir: home, now: () => NOW })
  store.loadSync()
  await store.set('s1', 'kb-a')

  writeFileSync(
    bindingsPath(home),
    JSON.stringify({ version: 1, bindings: { s9: { kbId: 'kb-x', updatedAt: NOW } } }),
    'utf8',
  )
  store.loadSync()
  assert.equal(store.get('s1')?.kbId, 'kb-a')
  assert.equal(store.get('s9'), undefined)
})
