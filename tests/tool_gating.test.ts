import assert from 'node:assert/strict'
import test from 'node:test'
import { createToolGating } from '../src/tool_gating.ts'
import { buildToolDefinitions } from '../src/tools.ts'
import type { Binding, BindingsStore } from '../src/bindings.ts'
import type { Config } from '../src/settings.ts'

const NOW = '2026-10-23T05:00:00.000Z'

const CONFIG: Config = { backendUrl: 'http://127.0.0.1:8020', apiToken: '', autoSyncModels: true }

export const TOOL_NAMES = [
  'hrag_graph_search',
  'hrag_hybrid_search',
  'hrag_list_documents',
  'hrag_list_wiki_entries',
  'hrag_read_document',
  'hrag_wiki_search',
]

function fakeStore(table: Record<string, Binding>): BindingsStore {
  return {
    path: '/tmp/never',
    loadSync() {},
    get: (sessionId: string) => table[sessionId],
    list: () => Object.entries(table).map(([sessionId, binding]) => ({ sessionId, ...binding })),
    set: async () => {},
    delete: async () => {},
  }
}

function fakeAgent(id: string) {
  const registered: string[] = []
  const disposed: string[] = []
  const agent = {
    id,
    ctx: {
      tools: {
        register(definition: { name: string }) {
          registered.push(definition.name)
          return () => {
            disposed.push(definition.name)
          }
        },
      },
    },
  }
  return { agent, registered, disposed }
}

test('definitions: the six knowledge tools, by name', () => {
  const definitions = buildToolDefinitions(CONFIG, fakeStore({}))
  assert.deepEqual(definitions.map((definition) => definition.name).sort(), TOOL_NAMES)
})

test('mount: a bound agent receives all six tools once', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  assert.equal(gating.mountAgent(first.agent), true)
  assert.deepEqual(first.registered.slice().sort(), TOOL_NAMES)
  assert.deepEqual(gating.mounted(), ['s1'])
})

test('mount: repeats are no-ops (one registration per agent)', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  assert.equal(gating.mountAgent(first.agent), true)
  assert.equal(gating.mountAgent(first.agent), false)
  assert.equal(first.registered.length, TOOL_NAMES.length)
})

test('mount: an unbound agent stays empty', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({}) })
  const first = fakeAgent('s2')
  assert.equal(gating.mountAgent(first.agent), false)
  assert.equal(first.registered.length, 0)
  assert.deepEqual(gating.mounted(), [])
})

test('unmount: every disposer runs, then the record clears', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  gating.mountAgent(first.agent)
  assert.equal(gating.unmountSession('s1'), true)
  assert.deepEqual(first.disposed.slice().sort(), TOOL_NAMES)
  assert.deepEqual(gating.mounted(), [])
  assert.equal(gating.unmountSession('s1'), false)
})

test('unmount: one agent leaves the other mounted', () => {
  const gating = createToolGating({
    config: CONFIG,
    bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW }, s2: { kbId: 'kb2', updatedAt: NOW } }),
  })
  const one = fakeAgent('s1')
  const two = fakeAgent('s2')
  gating.mountAgent(one.agent)
  gating.mountAgent(two.agent)
  assert.equal(gating.unmountSession('s1'), true)
  assert.equal(one.disposed.length, TOOL_NAMES.length)
  assert.equal(two.disposed.length, 0)
  assert.deepEqual(gating.mounted(), ['s2'])
})

test('forget: agent disposal drops the record without running disposers', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  gating.mountAgent(first.agent)
  gating.forgetAgent('s1')
  assert.equal(first.disposed.length, 0)
  assert.deepEqual(gating.mounted(), [])
  const again = fakeAgent('s1')
  assert.equal(gating.mountAgent(again.agent), true)
  assert.equal(again.registered.length, TOOL_NAMES.length)
})

test('wiki entries: lists titles and statuses with honest counts', async () => {
  const originalFetch = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = (async (input: unknown) => {
    urls.push(String(input))
    return new Response(JSON.stringify({
      entries: [
        { id: 'w1', title: 'Alpha', summary: 'a', status: 'ready', updated_at: '2026-10-24T00:00:00Z' },
        { id: 'w2', title: 'Beta', summary: 'b', status: 'stale', updated_at: '2026-10-23T00:00:00Z' },
      ],
      generation: 'idle',
      last_run: null,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof globalThis.fetch
  try {
    const definitions = buildToolDefinitions(CONFIG, fakeStore({}))
    const tool = definitions.find((definition) => definition.name === 'hrag_list_wiki_entries')
    assert.ok(tool)
    const result = await tool.execute({ kb_id: 'kb-1' }, { signal: undefined } as never)
    assert.deepEqual(urls, ['http://127.0.0.1:8020/api/knowledge-bases/kb-1/wiki/entries'])
    assert.deepEqual(result, {
      kb_id: 'kb-1',
      entries: [
        { title: 'Alpha', status: 'ready', updated_at: '2026-10-24T00:00:00Z' },
        { title: 'Beta', status: 'stale', updated_at: '2026-10-23T00:00:00Z' },
      ],
      message: '共 2 条百科条目（就绪 1 · 待更新 1）。',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})
