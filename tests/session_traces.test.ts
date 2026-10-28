import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSessionTraceStore,
  sessionGraphTrace,
  sessionTraceHits,
} from '../src/session_traces.ts'
import { buildToolDefinitions } from '../src/tools.ts'
import type { BindingsStore } from '../src/bindings.ts'
import type { Config } from '../src/settings.ts'

const CONFIG: Config = { backendUrl: 'http://127.0.0.1:8020', apiToken: '', autoSyncModels: true }

function fakeStore(): BindingsStore {
  return {
    path: '/tmp/never',
    loadSync() {},
    get: () => undefined,
    list: () => [],
    set: async () => {},
    delete: async () => {},
  }
}

function mockFetch(payload: unknown) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof globalThis.fetch
  return () => {
    globalThis.fetch = originalFetch
  }
}

function toolNamed(name: string, traces: ReturnType<typeof createSessionTraceStore>) {
  const tool = buildToolDefinitions(CONFIG, fakeStore(), traces).find((definition) => definition.name === name)
  assert.ok(tool)
  return tool
}

test('hits: only chunk_id rows survive, score kept when finite', () => {
  assert.deepEqual(
    sessionTraceHits([
      { chunk_id: 'c1', score: 0.9 },
      { chunk_id: 'c2' },
      { chunk_id: '', score: 1 },
      { id: 'nope' },
      null,
      'x',
      { chunk_id: 'c3', score: Number.NaN },
    ]),
    [{ pointId: 'c1', score: 0.9 }, { pointId: 'c2' }, { pointId: 'c3' }],
  )
  assert.deepEqual(sessionTraceHits(undefined), [])
  assert.deepEqual(sessionTraceHits({ results: [] }), [])
})

test('graph trace: normalizes the three layers and rejects an empty one', () => {
  assert.deepEqual(
    sessionGraphTrace({
      seed_entities: ['A', '', 3],
      expanded_nodes: [{ name: 'B', hop: 1 }, { name: 'C' }, { hop: 2 }, null, 'x'],
      evidence_entities: ['D'],
    }),
    { seed_entities: ['A'], expanded_nodes: [{ name: 'B', hop: 1 }, { name: 'C', hop: 1 }], evidence_entities: ['D'] },
  )
  assert.equal(sessionGraphTrace(null), null)
  assert.equal(sessionGraphTrace({}), null)
  assert.equal(sessionGraphTrace({ seed_entities: [], expanded_nodes: [], evidence_entities: [] }), null)
})

test('store: latest per session × kb, revisions increase across channels', () => {
  const store = createSessionTraceStore()
  assert.deepEqual(store.latest('s1', 'kb-a'), { vector: null, graph: null })
  assert.equal(store.recordVector('s1', 'kb-a', 'q1', [{ chunk_id: 'c1', score: 0.5 }]), true)
  const first = store.latest('s1', 'kb-a')
  assert.equal(first.vector?.text, 'q1')
  assert.deepEqual(first.vector?.hits, [{ pointId: 'c1', score: 0.5 }])
  assert.equal(first.graph, null)

  assert.equal(store.recordGraph('s1', 'kb-a', 'q2', { seed_entities: ['A'], expanded_nodes: [], evidence_entities: ['B'] }), true)
  const second = store.latest('s1', 'kb-a')
  assert.ok(second.graph && second.vector)
  assert.equal(second.graph?.text, 'q2')
  assert.ok(second.graph!.revision > second.vector!.revision)

  assert.equal(store.recordVector('s1', 'kb-b', 'other', [{ chunk_id: 'c9' }]), true)
  assert.equal(store.latest('s1', 'kb-a').vector?.text, 'q1')
  assert.equal(store.latest('s1', 'kb-b').vector?.text, 'other')
  assert.deepEqual(store.latest('s2', 'kb-a'), { vector: null, graph: null })
})

test('store: empty hits / unusable trace never clear an overlay', () => {
  const store = createSessionTraceStore()
  assert.equal(store.recordVector('s1', 'kb-a', 'q', [{ id: 'no-chunk' }]), false)
  assert.equal(store.recordVector('s1', 'kb-a', 'q', []), false)
  assert.equal(store.recordGraph('s1', 'kb-a', 'q', { seed_entities: [] }), false)
  assert.deepEqual(store.latest('s1', 'kb-a'), { vector: null, graph: null })

  store.recordVector('s1', 'kb-a', 'q1', [{ chunk_id: 'c1' }])
  store.recordGraph('s1', 'kb-a', 'q1', { seed_entities: ['A'] })
  const before = store.latest('s1', 'kb-a')
  store.recordVector('s1', 'kb-a', 'q2', [])
  store.recordGraph('s1', 'kb-a', 'q2', {})
  assert.deepEqual(store.latest('s1', 'kb-a'), before)
})

test('store: bounded key table evicts the oldest session × kb', () => {
  const store = createSessionTraceStore({ maxKeys: 2 })
  store.recordVector('s1', 'kb', 'a', [{ chunk_id: 'c1' }])
  store.recordVector('s2', 'kb', 'b', [{ chunk_id: 'c2' }])
  store.recordVector('s3', 'kb', 'c', [{ chunk_id: 'c3' }])
  assert.equal(store.latest('s1', 'kb').vector, null)
  assert.equal(store.latest('s2', 'kb').vector?.text, 'b')
  assert.equal(store.latest('s3', 'kb').vector?.text, 'c')
})

test('tools: hybrid and graph calls record the session trace', async () => {
  const traces = createSessionTraceStore()
  const restore = mockFetch({
    results: [{ chunk_id: 'c1', score: 0.7 }, { chunk_id: 'c2' }],
    trace: { seed_entities: ['Gateway'], expanded_nodes: [{ name: 'Router', hop: 1 }], evidence_entities: ['Gateway', 'Router'] },
    message: 'ok',
  })
  try {
    const exec = { signal: undefined, agent: { id: 's1' } } as never
    await toolNamed('hrag_hybrid_search', traces).execute({ kb_id: 'kb-a', query: '如何部署' }, exec)
    const afterHybrid = traces.latest('s1', 'kb-a')
    assert.equal(afterHybrid.vector?.text, '如何部署')
    assert.deepEqual(afterHybrid.vector?.hits, [{ pointId: 'c1', score: 0.7 }, { pointId: 'c2' }])
    assert.equal(afterHybrid.graph, null)

    await toolNamed('hrag_graph_search', traces).execute({ kb_id: 'kb-a', entity: 'Gateway', hops: 1 }, exec)
    const afterGraph = traces.latest('s1', 'kb-a')
    assert.equal(afterGraph.graph?.text, 'Gateway')
    assert.deepEqual(afterGraph.graph?.trace.seed_entities, ['Gateway'])
    assert.deepEqual(afterGraph.graph?.trace.expanded_nodes, [{ name: 'Router', hop: 1 }])
    assert.ok(afterGraph.graph!.revision > afterGraph.vector!.revision)
  } finally {
    restore()
  }
})

test('tools: no session id or no usable payload records nothing', async () => {
  const traces = createSessionTraceStore()
  const restore = mockFetch({ results: [], trace: null, message: 'empty' })
  try {
    const noAgent = { signal: undefined } as never
    await toolNamed('hrag_hybrid_search', traces).execute({ kb_id: 'kb-a', query: 'q' }, noAgent)
    await toolNamed('hrag_graph_search', traces).execute({ kb_id: 'kb-a', entity: 'A' }, noAgent)
    assert.deepEqual(traces.latest('s1', 'kb-a'), { vector: null, graph: null })

    const exec = { signal: undefined, agent: { id: 's1' } } as never
    await toolNamed('hrag_hybrid_search', traces).execute({ kb_id: 'kb-a', query: 'q' }, exec)
    await toolNamed('hrag_graph_search', traces).execute({ kb_id: 'kb-a', entity: 'A' }, exec)
    assert.deepEqual(traces.latest('s1', 'kb-a'), { vector: null, graph: null })
  } finally {
    restore()
  }
})
