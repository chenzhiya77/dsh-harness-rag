import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import { resolveKbId, type BindingsStore } from './bindings.ts'
import { api, HarnessRagError } from './http.ts'
import type { Config } from './settings.ts'
import type { SessionTraceStore } from './session_traces.ts'

const jsonRender = (_args: unknown, value: unknown) => [
  { type: 'text' as const, text: JSON.stringify(value, null, 2) },
]

/** Output schemas are half-open (spec 2026-10-11 D5 甲): every top-level key
 * is declared and stable, while per-item details stay open
 * (additionalProperties: true) so the backend can evolve without breaking the
 * plugin. The value-schema DSL requires explicit openness on every object
 * node; `json` nodes are annotation-only containers. */
const output = <const P extends Record<string, { type: 'string' | 'number' | 'json' }>>(properties: P) => ({
  schema: { type: 'object' as const, additionalProperties: true as const, properties },
  render: jsonRender,
})

type ToolName =
  | 'hybrid_search'
  | 'graph_search'
  | 'wiki_search'
  | 'list_knowledge_documents'
  | 'read_knowledge_document'
  | 'list_wiki_entries'

interface ToolExec {
  signal?: AbortSignal
  agent?: {
    id?: string
    /** Live phase of the agent loop: `turn` is the turn this call runs in. */
    phase?: { turn?: number }
  }
}

/** Current-turn identity for the engine's per-run citation counter. The agent
 * loop stamps `phase.turn` while a turn runs, so parallel calls in one turn
 * share it and the next turn gets a fresh value; a call outside any turn (no
 * phase turn) omits `run_id`, which makes the engine number from 1. */
function citationRunId(exec: ToolExec): string | undefined {
  const agent = exec.agent
  const turn = agent?.phase?.turn
  if (!agent?.id || typeof turn !== 'number') return undefined
  return `${agent.id}:${turn}`
}

/** The discipline gives the model no citation instruction (spec 2026-10-25
 * D6), so the engine's note would be the only one and is removed here. The
 * citation_no fields and the engine's per-run counter stay untouched. */
const CITATION_NOTE = /（引用编号 \[[^）]+\]，标注时照抄 citation_no）/

/** One model-facing call. The engine owns argument defaults, boundary
 * validation, refusals and citation numbering; the plugin maps the tool name
 * and forwards the model's arguments unchanged apart from the citation note.
 * Successful retrieval calls also feed the session trace store the panel
 * follows (projection hits / graph trace); refusals and empty payloads are
 * not recorded so a failed lookup never clears an overlay. */
async function callTool(
  config: Config,
  kbId: string,
  name: ToolName,
  args: Record<string, unknown>,
  exec: ToolExec,
  traces?: SessionTraceStore,
) {
  const body: Record<string, unknown> = { name, ...args }
  const runId = citationRunId(exec)
  if (runId !== undefined) body.run_id = runId
  const payload = await api<Record<string, unknown>>(config, `/api/knowledge-bases/${kbId}/tools`, { body, signal: exec.signal })
  if (typeof payload.message === 'string') payload.message = payload.message.replace(CITATION_NOTE, '')
  const sessionId = exec.agent?.id
  if (traces && typeof sessionId === 'string' && sessionId) {
    if (name === 'hybrid_search') {
      const text = typeof args.query === 'string' ? args.query : ''
      traces.recordVector(sessionId, kbId, text, payload.results)
    } else if (name === 'graph_search') {
      const query = typeof args.query === 'string' ? args.query : ''
      const entity = typeof args.entity === 'string' ? args.entity : ''
      traces.recordGraph(sessionId, kbId, query || entity, payload.trace)
    }
  }
  return payload
}

/** Where a call's kb came from, plus the display name when the binding knew it.
 * Every tool echoes this so an answer can name the library behind its evidence. */
interface KbTarget {
  kbId: string
  kbName?: string
}

function echo(target: KbTarget): { kb_id: string; kb_name?: string } {
  return { kb_id: target.kbId, ...(target.kbName ? { kb_name: target.kbName } : {}) }
}

export function buildToolDefinitions(config: Config, bindings: BindingsStore, traces?: SessionTraceStore) {
  /** kb_id resolution order (spec 2026-10-23 binding-tool-gating D1): tool
   * argument > this session's binding. The binding is keyed by the live
   * session identity (`exec.agent.id`); the tools themselves are only mounted
   * into sessions that hold a binding, so a miss here means the binding went
   * away under a live registration. */
  const kb = (args: { kb_id?: string }, exec?: ToolExec): KbTarget => {
    const sessionId = exec?.agent?.id
    const binding = sessionId ? bindings.get(sessionId) : undefined
    const resolution = resolveKbId({
      argKbId: args.kb_id,
      sessionId,
      bindings: sessionId && binding ? { [sessionId]: binding } : {},
    })
    if (!resolution) {
      throw new HarnessRagError({
        kind: 'not_configured',
        detail: 'kb_id was not given and this session has no knowledge-base binding.',
      })
    }
    return {
      kbId: resolution.kbId,
      ...(resolution.source === 'session' && binding?.kbName ? { kbName: binding.kbName } : {}),
    }
  }

  const kbDescription = "Knowledge base id; falls back to this session's binding"

  const definitions: Array<ReturnType<typeof defineTool>> = []

  definitions.push(defineTool({
    name: 'hrag_hybrid_search',
    description: 'Hybrid retrieval over the bound knowledge base: dense + sparse vectors fused with RRF, then reranked. Results carry chunk text, doc_id/chunk_index, mentioned entities and scores; pass doc_id to search inside one document.',
    parameters: {
      query: { type: 'string' as const, required: true as const, description: "The retrieval question, phrased in the user's language." },
      top_k: { type: 'number' as const, description: 'Number of chunks to return after precision ranking (default 5, max 20).' },
      doc_id: { type: 'string' as const, description: 'Optional document id; when set, retrieval is scoped to that single document.' },
      kb_id: { type: 'string' as const, description: kbDescription },
    },
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      results: { type: 'json' },
      message: { type: 'string' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await callTool(config, target.kbId, 'hybrid_search', { query: args.query, top_k: args.top_k, doc_id: args.doc_id }, exec, traces)
      return {
        ...echo(target),
        results: (payload.results ?? []) as JsonValue,
        message: payload.message as string,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_graph_search',
    description: 'Graph retrieval over the bound knowledge base: entity-seeded, structure-driven evidence across 1-2 hops with semantic gating, a node budget and a hub guard. Pass entity for a direct entry or query for query understanding; evidence carries doc_id and chunk text.',
    parameters: {
      query: { type: 'string' as const, description: "The relationship/structure question, phrased in the user's language. Provide this or entity." },
      entity: { type: 'string' as const, description: 'Exact entity name to enter the graph directly — skips query understanding and vector matching.' },
      hops: { type: 'number' as const, description: 'Graph expansion depth from the matched entities (1 or 2, default 2).' },
      kb_id: { type: 'string' as const, description: kbDescription },
    },
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      entities: { type: 'json' },
      relations: { type: 'json' },
      evidence: { type: 'json' },
      trace: { type: 'json' },
      score_source: { type: 'json' },
      message: { type: 'string' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await callTool(config, target.kbId, 'graph_search', { query: args.query, entity: args.entity, hops: args.hops }, exec, traces)
      return {
        ...echo(target),
        entities: (payload.entities ?? []) as JsonValue,
        relations: (payload.relations ?? []) as JsonValue,
        evidence: (payload.evidence ?? []) as JsonValue,
        trace: payload.trace as JsonValue,
        ...(payload.score_source !== undefined ? { score_source: payload.score_source as JsonValue } : {}),
        message: payload.message as string,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_wiki_search',
    description: 'Wiki retrieval over the bound knowledge base: generated encyclopedia entries and manual knowledge cards merged in one pool (wiki wins score ties). Hits carry full entry content, source_type wiki|manual and updated_at; pass title to fetch one entry directly.',
    parameters: {
      query: { type: 'string' as const, description: "The concept/topic question, phrased in the user's language. Provide this or title." },
      title: { type: 'string' as const, description: 'Exact entry title (an entity name) — fetches that entry directly, skipping semantic search.' },
      top_k: { type: 'number' as const, description: 'Number of wiki entries to return (default 3, max 20; ignored by the exact-title fetch).' },
      kb_id: { type: 'string' as const, description: kbDescription },
    },
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      entries: { type: 'json' },
      message: { type: 'string' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await callTool(config, target.kbId, 'wiki_search', { query: args.query, title: args.title, top_k: args.top_k }, exec)
      return {
        ...echo(target),
        entries: (payload.entries ?? []) as JsonValue,
        message: payload.message as string,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_list_documents',
    description: 'List every document in the bound knowledge base with an honest status count: documents carry doc_id/name/status/chunk_count, and the message summarizes ready / in-progress / failed. Use doc_id to address the same document in a follow-up read.',
    parameters: {
      kb_id: { type: 'string' as const, description: kbDescription },
    },
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      documents: { type: 'json' },
      message: { type: 'string' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await callTool(config, target.kbId, 'list_knowledge_documents', {}, exec)
      return {
        ...echo(target),
        documents: (payload.documents ?? []) as JsonValue,
        message: payload.message as string,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_read_document',
    description: "Read one document's chunks. Page through it by doc_id with offset/limit, or follow a search hit by passing its chunk_id: the window (default 20, max 50 chunks) is centered on that chunk and clamped at the document edges. Returns doc/items/total/offset/has_more/message; oversized chunk text is truncated at 2000 characters with truncated=true, and each item carries entities (up to 10).",
    parameters: {
      doc_id: { type: 'string' as const, description: 'Document id (from list_knowledge_documents or a search result) for a paged read.' },
      chunk_id: { type: 'string' as const, description: 'Chunk id (from a search result); reads the window around that chunk and takes precedence over doc_id.' },
      offset: { type: 'number' as const, description: 'Page offset in chunks for the doc_id mode (default 0).' },
      limit: { type: 'number' as const, description: 'Page/window width in chunks (default 20, capped at 50).' },
      kb_id: { type: 'string' as const, description: kbDescription },
    },
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      doc: { type: 'json' },
      items: { type: 'json' },
      total: { type: 'number' },
      offset: { type: 'number' },
      has_more: { type: 'json' },
      message: { type: 'string' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await callTool(
        config,
        target.kbId,
        'read_knowledge_document',
        { doc_id: args.doc_id, chunk_id: args.chunk_id, offset: args.offset, limit: args.limit },
        exec,
      )
      return {
        ...echo(target),
        doc: (payload.doc ?? null) as JsonValue,
        items: (payload.items ?? []) as JsonValue,
        ...(payload.total !== undefined ? { total: payload.total as number } : {}),
        ...(payload.offset !== undefined ? { offset: payload.offset as number } : {}),
        ...(payload.has_more !== undefined ? { has_more: payload.has_more as JsonValue } : {}),
        message: payload.message as string,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_list_wiki_entries',
    description: 'List the generated wiki entries of the bound knowledge base (titles + status + updated_at) with an honest ready/pending count. Entries cover only head entities that passed the eligibility bar; use hrag_wiki_search for entry content.',
    parameters: {
      kb_id: { type: 'string' as const, description: kbDescription },
    },
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      entries: { type: 'json' },
      message: { type: 'string' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await callTool(config, target.kbId, 'list_wiki_entries', {}, exec)
      return {
        ...echo(target),
        entries: (payload.entries ?? []) as JsonValue,
        message: payload.message as string,
      }
    },
  }))

  return definitions
}
