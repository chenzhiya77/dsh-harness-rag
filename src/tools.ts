import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import { resolveKbId, type BindingsStore } from './bindings.ts'
import { api, HarnessRagError } from './http.ts'
import type { Config } from './settings.ts'

const jsonRender = (_args: unknown, value: unknown) => [
  { type: 'text' as const, text: JSON.stringify(value, null, 2) },
]

/** Output schemas are half-open (spec 2026-10-11 D5 甲): every top-level key
 * is declared and stable, while per-item details stay open
 * (additionalProperties: true) so the backend can evolve without breaking the
 * plugin. The value-schema DSL requires explicit openness on every object
 * node; `json` nodes are annotation-only containers. */
const open = { type: 'json' as const }

const output = <const P extends Record<string, { type: 'string' | 'number' | 'json' }>>(properties: P) => ({
  schema: { type: 'object' as const, additionalProperties: true as const, properties },
  render: jsonRender,
})

/** The knowledge service bounds top_k to 1–20 (RecallTestRequest); the schema
 * DSL has no numeric bounds, so the clamp is enforced here and documented in
 * the parameter description. */
const TOP_K_MIN = 1
const TOP_K_MAX = 20

function clampTopK(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(TOP_K_MAX, Math.max(TOP_K_MIN, Math.trunc(value)))
}

/** Recall-test seam: one query, one selected path. The response is a
 * three-segment envelope; each tool extracts its own segment plus the shared
 * metadata, so its output shape mirrors the corresponding DeerFlow tool. */
async function recallTest(config: Config, kbId: string, path: 'vector' | 'graph' | 'wiki', args: { query: string; top_k?: number; doc_id?: string }, signal?: AbortSignal) {
  return api<Record<string, unknown>>(config, `/api/knowledge-bases/${kbId}/recall-test`, {
    body: { query: args.query, path, top_k: clampTopK(args.top_k), doc_id: args.doc_id },
    signal,
  })
}

/** Shared envelope metadata, passed through verbatim when present. */
function envelopeMeta(envelope: Record<string, unknown>, path: 'vector' | 'graph' | 'wiki'): { query: string; score_type: JsonValue; elapsed_ms: JsonValue; message?: string } {
  const message = segmentOf(envelope, path).message
  return {
    query: envelope.query as string,
    score_type: envelope.score_type as JsonValue,
    elapsed_ms: envelope.elapsed_ms as JsonValue,
    ...(typeof message === 'string' ? { message } : {}),
  }
}

function segmentOf(envelope: Record<string, unknown>, path: 'vector' | 'graph' | 'wiki'): Record<string, unknown> {
  return ((envelope.paths as Record<string, Record<string, unknown>> | undefined)?.[path]) ?? {}
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

export function buildToolDefinitions(config: Config, bindings: BindingsStore) {
  /** kb_id resolution order (spec 2026-10-23 binding-tool-gating D1): tool
   * argument > this session's binding. The binding is keyed by the live
   * session identity (`exec.agent.id`); the tools themselves are only mounted
   * into sessions that hold a binding, so a miss here means the binding went
   * away under a live registration. */
  const kb = (args: { kb_id?: string }, exec?: { agent?: { id?: string } }): KbTarget => {
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

  const searchParams = () => ({
    query: { type: 'string' as const, required: true as const, description: 'Search query' },
    kb_id: { type: 'string' as const, description: kbDescription },
    top_k: { type: 'number' as const, description: 'Max hits to return (1–20, default 5)' },
    doc_id: { type: 'string' as const, description: 'Optional document id; when set, retrieval is scoped to that single document' },
  })

  definitions.push(defineTool({
    name: 'hrag_hybrid_search',
    description: 'Harness RAG hybrid retrieval: vector RRF + sparse fusion with rerank over one knowledge base. Results correspond to the knowledge service\'s recall-test vector path.',
    parameters: searchParams(),
    output: output({
      query: { type: 'string' },
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      results: { type: 'json' },
      message: { type: 'string' },
      score_type: { type: 'json' },
      elapsed_ms: { type: 'json' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const envelope = await recallTest(config, target.kbId, 'vector', args, exec.signal)
      return {
        ...envelopeMeta(envelope, 'vector'),
        ...echo(target),
        results: (segmentOf(envelope, 'vector').hits ?? []) as JsonValue,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_graph_search',
    description: 'Harness RAG graph retrieval: entity-seeded, structure-driven evidence across chapters (semantic gating, node budget, hub guard). Corresponds to the recall-test graph path.',
    parameters: searchParams(),
    output: output({
      query: { type: 'string' },
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      entities: { type: 'json' },
      relations: { type: 'json' },
      evidence: { type: 'json' },
      message: { type: 'string' },
      score_type: { type: 'json' },
      elapsed_ms: { type: 'json' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const envelope = await recallTest(config, target.kbId, 'graph', args, exec.signal)
      const segment = segmentOf(envelope, 'graph')
      const base = envelopeMeta(envelope, 'graph')
      return {
        query: base.query,
        score_type: base.score_type,
        elapsed_ms: base.elapsed_ms,
        ...(typeof segment.message === 'string' ? { message: segment.message } : {}),
        ...echo(target),
        entities: (segment.entities ?? []) as JsonValue,
        relations: (segment.relations ?? []) as JsonValue,
        evidence: (segment.evidence ?? []) as JsonValue,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_wiki_search',
    description: 'Harness RAG wiki retrieval: pre-digested wiki entries and manual knowledge cards merged in one pool (wiki wins score ties); hits carry source_type wiki|manual, and wiki hits carry source_chunk_ids. Corresponds to the recall-test wiki path.',
    parameters: searchParams(),
    output: output({
      query: { type: 'string' },
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      entries: { type: 'json' },
      message: { type: 'string' },
      score_type: { type: 'json' },
      elapsed_ms: { type: 'json' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const envelope = await recallTest(config, target.kbId, 'wiki', args, exec.signal)
      return {
        ...envelopeMeta(envelope, 'wiki'),
        ...echo(target),
        entries: (segmentOf(envelope, 'wiki').hits ?? []) as JsonValue,
      }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_list_documents',
    description: 'List documents in a knowledge base: {documents: [...]} with per-entry id/name/status/chunk_count/progress_percent/path_status, straight from the knowledge service.',
    parameters: {
      kb_id: { type: 'string' as const, description: kbDescription },
    },
    // Wrapped into an object: the host's tool-output path is object-rooted
    // (an array-rooted output fails deeper than defineTool's own compile).
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      documents: { type: 'json' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await api<unknown>(config, `/api/knowledge-bases/${target.kbId}/documents`, { signal: exec.signal })
      return { ...echo(target), documents: (Array.isArray(payload) ? payload : [payload]) as JsonValue }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_read_document',
    description: "Read a knowledge document's chunks. Page through it by doc_id with offset/limit, or follow a search hit by passing its chunk_id: the window (default 20, max 50 chunks) is centered on that chunk and clamped at the document edges. Returns {items, total, offset, limit, has_more, message}.",
    parameters: {
      kb_id: { type: 'string' as const, description: kbDescription },
      doc_id: { type: 'string' as const, required: true, description: 'Document to read (required; when using chunk_id the service resolves the document from the chunk)' },
      chunk_id: { type: 'string' as const, description: 'Center the window on this chunk (takes precedence over offset)' },
      offset: { type: 'number' as const, description: 'Chunk offset when paging by doc_id' },
      limit: { type: 'number' as const, description: 'Page/window width in chunks (default 20, capped at 50)' },
    },
    output: output({
      kb_id: { type: 'string' },
      kb_name: { type: 'string' },
      items: { type: 'json' },
      total: { type: 'number' },
      offset: { type: 'number' },
      limit: { type: 'number' },
      has_more: { type: 'json' },
      message: { type: 'string' },
    }),
    async execute(args, exec) {
      const target = kb(args, exec)
      const payload = await api<Record<string, unknown> | null>(
        config,
        `/api/knowledge-bases/${target.kbId}/documents/${args.doc_id}/chunks`,
        {
          query: { chunk_id: args.chunk_id, offset: args.offset, limit: args.limit },
          signal: exec.signal,
        },
      )
      return { ...(payload ?? {}), ...echo(target) }
    },
  }))

  definitions.push(defineTool({
    name: 'hrag_list_wiki_entries',
    description: 'List the generated wiki entries of a knowledge base (titles + status). Entries cover only head entities that passed the eligibility bar; use hrag_wiki_search for entry content.',
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
      const payload = await api<Record<string, unknown> | null>(
        config,
        `/api/knowledge-bases/${target.kbId}/wiki/entries`,
        { signal: exec.signal },
      )
      const rows = Array.isArray(payload?.entries) ? (payload.entries as Array<Record<string, unknown>>) : []
      const entries = rows.map((row) => ({
        title: row.title,
        status: row.status,
        updated_at: row.updated_at,
      }))
      const ready = entries.filter((entry) => entry.status === 'ready').length
      const pending = entries.length - ready
      const message = entries.length === 0
        ? '当前知识库中还没有百科条目。'
        : `共 ${entries.length} 条百科条目（就绪 ${ready} · 待更新 ${pending}）。`
      return { ...echo(target), entries: entries as JsonValue, message }
    },
  }))

  return definitions
}
