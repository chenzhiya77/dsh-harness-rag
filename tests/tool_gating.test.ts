import assert from 'node:assert/strict'
import test from 'node:test'
import { createToolGating } from '../src/tool_gating.ts'
import { buildToolDefinitions } from '../src/tools.ts'
import { DISCIPLINE_SECTION, RETRIEVAL_DISCIPLINE } from '../src/retrieval_discipline.ts'
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

interface FakeSection {
  name: string
  order: number
  text: string
  complete?: boolean
}

function fakeAgent(id: string, options: { failSection?: boolean } = {}) {
  const registered: string[] = []
  const disposed: string[] = []
  const sections: FakeSection[] = []
  const disposedSections: string[] = []
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
      systemPrompt: {
        section(section: FakeSection) {
          if (options.failSection) throw new Error('section rejected')
          sections.push(section)
          return () => {
            disposedSections.push(section.name)
          }
        },
      },
    },
  }
  return { agent, registered, disposed, sections, disposedSections }
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

test('section: a bound agent gets the discipline section appended, not replacing the prompt', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  assert.equal(gating.mountAgent(first.agent), true)
  assert.equal(first.sections.length, 1)
  const [section] = first.sections
  assert.equal(section.name, DISCIPLINE_SECTION.name)
  assert.equal(section.order, DISCIPLINE_SECTION.order)
  assert.equal(section.text, RETRIEVAL_DISCIPLINE)
  assert.ok(!('complete' in section))
})

test('section: an unbound agent gets no section', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({}) })
  const first = fakeAgent('s2')
  assert.equal(gating.mountAgent(first.agent), false)
  assert.equal(first.sections.length, 0)
})

test('section: repeats add no second section', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  gating.mountAgent(first.agent)
  gating.mountAgent(first.agent)
  assert.equal(first.sections.length, 1)
})

test('section: unbinding disposes the section with the tools', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  gating.mountAgent(first.agent)
  assert.equal(gating.unmountSession('s1'), true)
  assert.deepEqual(first.disposedSections, [DISCIPLINE_SECTION.name])
  assert.deepEqual(first.disposed.slice().sort(), TOOL_NAMES)
})

test('section: one agent unbinding leaves the other section in place', () => {
  const gating = createToolGating({
    config: CONFIG,
    bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW }, s2: { kbId: 'kb2', updatedAt: NOW } }),
  })
  const one = fakeAgent('s1')
  const two = fakeAgent('s2')
  gating.mountAgent(one.agent)
  gating.mountAgent(two.agent)
  gating.unmountSession('s1')
  assert.deepEqual(one.disposedSections, [DISCIPLINE_SECTION.name])
  assert.deepEqual(two.disposedSections, [])
  assert.equal(two.sections.length, 1)
})

test('section: agent disposal runs no disposer (the scope already unwound)', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  gating.mountAgent(first.agent)
  gating.forgetAgent('s1')
  assert.deepEqual(first.disposedSections, [])
})

test('section: rebinding after unbind re-registers the section', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1')
  gating.mountAgent(first.agent)
  gating.unmountSession('s1')
  const again = fakeAgent('s1')
  assert.equal(gating.mountAgent(again.agent), true)
  assert.equal(again.sections.length, 1)
  assert.deepEqual(first.disposedSections, [DISCIPLINE_SECTION.name])
})

test('section: a rejected section unwinds the tools and rethrows', () => {
  const gating = createToolGating({ config: CONFIG, bindings: fakeStore({ s1: { kbId: 'kb', updatedAt: NOW } }) })
  const first = fakeAgent('s1', { failSection: true })
  assert.throws(() => gating.mountAgent(first.agent), /section rejected/)
  assert.deepEqual(first.disposed.slice().sort(), TOOL_NAMES)
  assert.deepEqual(gating.mounted(), [])
  assert.deepEqual(first.sections, [])
})

test('discipline text: names the six tools, the citation field, the read bounds and the refusal', () => {
  for (const name of TOOL_NAMES) assert.ok(RETRIEVAL_DISCIPLINE.includes(`\`${name}\``), name)
  assert.ok(RETRIEVAL_DISCIPLINE.includes('citation_no'))
  assert.ok(RETRIEVAL_DISCIPLINE.includes('最多 4 个窗口'))
  assert.ok(RETRIEVAL_DISCIPLINE.includes('最多 6 次'))
  assert.ok(RETRIEVAL_DISCIPLINE.includes('知识库中没有找到相关内容'))
})

test('discipline text: no bare main-tree tool names, no persona', () => {
  const bare = /(?<![_A-Za-z])(hybrid_search|graph_search|wiki_search|list_knowledge_documents|read_knowledge_document|list_wiki_entries)/
  assert.equal(bare.test(RETRIEVAL_DISCIPLINE), false)
  for (const word of ['知识库问答专家', '深度检索模式', 'SOUL']) {
    assert.ok(!RETRIEVAL_DISCIPLINE.includes(word), word)
  }
})

interface RecordedRequest {
  url: string
  method: string
  body: unknown
}

function mockFetch(requests: RecordedRequest[], payload: unknown) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    })
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof globalThis.fetch
  return () => {
    globalThis.fetch = originalFetch
  }
}

function toolNamed(name: string, store: BindingsStore = fakeStore({})) {
  const tool = buildToolDefinitions(CONFIG, store).find((definition) => definition.name === name)
  assert.ok(tool)
  return tool
}

function execWithoutAgent() {
  return { signal: undefined } as never
}

function execWithTurn(events: unknown[], id = 's1') {
  return { signal: undefined, agent: { id, session: { events } } } as never
}

type ParameterSchema = {
  properties?: Record<string, unknown>
  required?: string[]
}

test('tools: every call posts its native name and arguments to /tools', async () => {
  const requests: RecordedRequest[] = []
  const restore = mockFetch(requests, {})
  try {
    const exec = execWithoutAgent()
    await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'q', top_k: 7, doc_id: 'd1' }, exec)
    await toolNamed('hrag_graph_search').execute({ kb_id: 'kb-1', entity: 'Gateway', hops: 1 }, exec)
    await toolNamed('hrag_wiki_search').execute({ kb_id: 'kb-1', title: 'DeerFlow', top_k: 2 }, exec)
    await toolNamed('hrag_list_documents').execute({ kb_id: 'kb-1' }, exec)
    await toolNamed('hrag_read_document').execute({ kb_id: 'kb-1', chunk_id: 'd1#0004', limit: 3 }, exec)
    await toolNamed('hrag_list_wiki_entries').execute({ kb_id: 'kb-1' }, exec)

    assert.deepEqual(requests.map((request) => request.url), Array(6).fill('http://127.0.0.1:8020/api/knowledge-bases/kb-1/tools'))
    assert.deepEqual(requests.map((request) => request.method), Array(6).fill('POST'))
    assert.deepEqual(requests.map((request) => request.body), [
      { name: 'hybrid_search', query: 'q', top_k: 7, doc_id: 'd1' },
      { name: 'graph_search', entity: 'Gateway', hops: 1 },
      { name: 'wiki_search', title: 'DeerFlow', top_k: 2 },
      { name: 'list_knowledge_documents' },
      { name: 'read_knowledge_document', chunk_id: 'd1#0004', limit: 3 },
      { name: 'list_wiki_entries' },
    ])
  } finally {
    restore()
  }
})

test('run_id: the last turn is reused within a turn and refreshed on the next', async () => {
  const requests: RecordedRequest[] = []
  const restore = mockFetch(requests, { results: [], message: 'm' })
  try {
    const events: unknown[] = [
      { type: 'turn/start', seq: 0, data: { turn: 2 } },
      { type: 'tool/call', seq: 1, data: { turn: 2 } },
    ]
    const exec = execWithTurn(events)
    await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'one' }, exec)
    await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'two' }, exec)
    events.push({ type: 'turn/start', seq: 2, data: { turn: 3 } })
    await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'three' }, exec)

    assert.deepEqual(
      requests.map((request) => (request.body as { run_id?: string }).run_id),
      ['s1:2', 's1:2', 's1:3'],
    )
  } finally {
    restore()
  }
})

test('run_id: omitted when the session has no turn or the call has no agent', async () => {
  const requests: RecordedRequest[] = []
  const restore = mockFetch(requests, { results: [], message: 'm' })
  try {
    await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'q' }, execWithTurn([]))
    await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'q' }, execWithoutAgent())
    for (const request of requests) {
      assert.ok(!('run_id' in (request.body as Record<string, unknown>)))
    }
  } finally {
    restore()
  }
})

test('run_id: omitted after the turn closes', async () => {
  const requests: RecordedRequest[] = []
  const restore = mockFetch(requests, { results: [], message: 'm' })
  try {
    const events = [
      { type: 'turn/start', seq: 0, data: { turn: 2 } },
      { type: 'turn/end', seq: 1, data: { turn: 2, reason: { kind: 'success' } } },
    ]
    await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'q' }, execWithTurn(events))
    assert.ok(!('run_id' in (requests[0].body as Record<string, unknown>)))
  } finally {
    restore()
  }
})

test('hybrid: native results and message pass through with the kb echo', async () => {
  const payload = {
    results: [
      {
        chunk_id: 'c1',
        text: 'slice',
        doc_id: 'd1',
        chunk_index: 3,
        doc_name: 'a.md',
        page: 2,
        heading_path: ['H'],
        entities: ['E'],
        citation_no: 1,
      },
    ],
    message: '检索到 1 条相关切片（引用编号 [1]，标注时照抄 citation_no）。',
  }
  const restore = mockFetch([], payload)
  try {
    const result = await toolNamed('hrag_hybrid_search').execute({ kb_id: 'kb-1', query: 'q' }, execWithoutAgent())
    assert.deepEqual(result, { ...payload, kb_id: 'kb-1' })
  } finally {
    restore()
  }
})

test('graph: trace and score_source pass through', async () => {
  const payload = {
    entities: [{ name: 'Gateway', type: '组件', description: '入口' }],
    relations: [{ source: 'A', target: 'Gateway', relation: '包含', description: '' }],
    evidence: [
      {
        chunk_id: 'c1',
        text: 'slice',
        doc_id: 'd1',
        doc_name: 'a.md',
        heading_path: [],
        page: 1,
        score: 0.9,
        citation_no: 1,
      },
    ],
    score_source: 'cosine',
    trace: { seed_entities: ['Gateway'], expanded_nodes: [], evidence_entities: ['Gateway'] },
    message: '命中 1 个实体，扩展出 1 个节点、1 条关系、1 条切片证据（引用编号 [1]，标注时照抄 citation_no）。',
  }
  const restore = mockFetch([], payload)
  try {
    const result = await toolNamed('hrag_graph_search').execute({ kb_id: 'kb-1', entity: 'Gateway' }, execWithoutAgent())
    assert.deepEqual(result, { ...payload, kb_id: 'kb-1' })
  } finally {
    restore()
  }
})

test('wiki: full entry content passes through unchanged', async () => {
  const payload = {
    entries: [
      {
        entry_id: 'e1',
        title: 'DeerFlow',
        content: '完整条目正文',
        score: 0.91,
        updated_at: '2026-10-24T00:00:00Z',
        source_chunk_ids: ['d1#0000'],
        source_type: 'wiki',
        citation_no: 2,
      },
    ],
    message: '命中 1 篇百科条目（引用编号 [2]，标注时照抄 citation_no）。',
  }
  const restore = mockFetch([], payload)
  try {
    const result = await toolNamed('hrag_wiki_search').execute({ kb_id: 'kb-1', title: 'DeerFlow' }, execWithoutAgent())
    assert.deepEqual(result, { ...payload, kb_id: 'kb-1' })
  } finally {
    restore()
  }
})

test('read: doc/items/total/has_more pass through, including truncation markers', async () => {
  const payload = {
    doc: { doc_id: 'd1', name: 'a.md' },
    items: [
      {
        chunk_id: 'd1#0000',
        chunk_index: 0,
        heading_path: ['H'],
        page: 1,
        text: '长'.repeat(2000),
        entities: ['E0'],
        truncated: true,
      },
    ],
    total: 25,
    offset: 0,
    has_more: true,
    message: '共 25 片；已返回第 1-20 片。',
  }
  const restore = mockFetch([], payload)
  try {
    const result = await toolNamed('hrag_read_document').execute({ kb_id: 'kb-1', doc_id: 'd1' }, execWithoutAgent())
    assert.deepEqual(result, { ...payload, kb_id: 'kb-1' })
  } finally {
    restore()
  }
})

test('list documents: native doc_id rows and counts pass through', async () => {
  const payload = {
    documents: [{ doc_id: 'd1', name: 'a.md', status: 'ready', chunk_count: 2 }],
    message: '共 1 篇文档（就绪 1）。',
  }
  const restore = mockFetch([], payload)
  try {
    const result = await toolNamed('hrag_list_documents').execute({ kb_id: 'kb-1' }, execWithoutAgent())
    assert.deepEqual(result, { ...payload, kb_id: 'kb-1' })
  } finally {
    restore()
  }
})

test('list wiki entries: native rows and counts pass through', async () => {
  const payload = {
    entries: [{ title: 'Alpha', status: 'ready', updated_at: '2026-10-24T00:00:00Z' }],
    message: '共 1 条百科条目（就绪 1）。',
  }
  const restore = mockFetch([], payload)
  try {
    const result = await toolNamed('hrag_list_wiki_entries').execute({ kb_id: 'kb-1' }, execWithoutAgent())
    assert.deepEqual(result, { ...payload, kb_id: 'kb-1' })
  } finally {
    restore()
  }
})

test('kb: a session binding supplies the id and display name', async () => {
  const requests: RecordedRequest[] = []
  const payload = { documents: [], message: '当前知识库中还没有文档。' }
  const restore = mockFetch(requests, payload)
  try {
    const store = fakeStore({ s1: { kbId: 'kb-bound', kbName: '产品资料', updatedAt: NOW } })
    const result = await toolNamed('hrag_list_documents', store).execute({}, execWithTurn([]))
    assert.deepEqual(requests.map((request) => request.url), ['http://127.0.0.1:8020/api/knowledge-bases/kb-bound/tools'])
    assert.deepEqual(requests.map((request) => request.body), [{ name: 'list_knowledge_documents' }])
    assert.deepEqual(result, { ...payload, kb_id: 'kb-bound', kb_name: '产品资料' })
  } finally {
    restore()
  }
})

test('parameters: native requiredness and defaults, no recall-test leftovers', () => {
  const params = (name: string) => toolNamed(name).parameters as ParameterSchema
  const keys = (name: string) => Object.keys(params(name).properties ?? {}).sort()
  const descriptions = (name: string) => JSON.stringify(params(name).properties)

  assert.deepEqual(params('hrag_hybrid_search').required, ['query'])
  assert.deepEqual(keys('hrag_hybrid_search'), ['doc_id', 'kb_id', 'query', 'top_k'])
  assert.deepEqual(params('hrag_graph_search').required, undefined)
  assert.deepEqual(keys('hrag_graph_search'), ['entity', 'hops', 'kb_id', 'query'])
  assert.deepEqual(params('hrag_wiki_search').required, undefined)
  assert.deepEqual(keys('hrag_wiki_search'), ['kb_id', 'query', 'title', 'top_k'])
  assert.deepEqual(params('hrag_read_document').required, undefined)
  assert.deepEqual(keys('hrag_read_document'), ['chunk_id', 'doc_id', 'kb_id', 'limit', 'offset'])
  assert.deepEqual(keys('hrag_list_documents'), ['kb_id'])
  assert.deepEqual(keys('hrag_list_wiki_entries'), ['kb_id'])

  assert.ok(descriptions('hrag_hybrid_search').includes('default 5'))
  assert.ok(descriptions('hrag_graph_search').includes('default 2'))
  assert.ok(descriptions('hrag_wiki_search').includes('default 3'))
  assert.ok(descriptions('hrag_read_document').includes('default 20'))
  for (const name of TOOL_NAMES) assert.ok(!toolNamed(name).description.includes('recall-test'))
})
