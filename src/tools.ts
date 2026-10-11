import type { Context } from 'cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { api, HarnessRagError } from './http.ts'
import type { Config } from './settings.ts'

const jsonRender = (_args: unknown, value: unknown) => [
  { type: 'text' as const, text: JSON.stringify(value, null, 2) },
]

const output = {
  // The DSL mandates explicit openness on every object node (schema.ts
  // authorError); outputs stay half-open backend payloads until T2 tightens
  // their top-level keys (D5 甲).
  schema: { type: 'object' as const, additionalProperties: true as const },
  render: jsonRender,
}

/** The knowledge service bounds top_k to 1–20 (RecallTestRequest); the schema
 * DSL has no numeric bounds, so the clamp is enforced here and documented in
 * the parameter description. */
const TOP_K_MIN = 1
const TOP_K_MAX = 20

function clampTopK(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(TOP_K_MAX, Math.max(TOP_K_MIN, Math.trunc(value)))
}

/** Recall-test seam: one query, one selected path; the three-segment response
 * is returned as-is (unselected segments stay empty). */
async function recallTest(config: Config, kbId: string, path: 'vector' | 'graph' | 'wiki', args: { query: string; top_k?: number; doc_id?: string }, signal?: AbortSignal) {
  return api(config, `/api/knowledge-bases/${kbId}/recall-test`, {
    body: { query: args.query, path, top_k: clampTopK(args.top_k), doc_id: args.doc_id },
    signal,
  })
}

export function registerTools(ctx: Context, config: Config) {
  const kb = (args: { kb_id?: string }) => {
    const id = args.kb_id?.trim() || config.defaultKbId.trim()
    if (!id) {
      throw new HarnessRagError({ kind: 'not_configured', detail: 'kb_id not given and no defaultKbId configured.' })
    }
    return id
  }

  const searchParams = () => ({
    query: { type: 'string' as const, required: true, description: 'Search query' },
    kb_id: { type: 'string' as const, description: 'Knowledge base id; falls back to the configured default' },
    top_k: { type: 'number' as const, description: 'Max hits to return (1–20, default 5)' },
    doc_id: { type: 'string' as const, description: 'Optional document id; when set, retrieval is scoped to that single document' },
  })

  ctx.tools.register(defineTool({
    name: 'hrag_hybrid_search',
    description: 'Harness RAG hybrid retrieval: vector RRF + sparse fusion with rerank over one knowledge base. Results correspond to the knowledge service\'s recall-test vector path.',
    parameters: searchParams(),
    output,
    async execute(args, exec) {
      return recallTest(config, kb(args), 'vector', args, exec.signal)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_graph_search',
    description: 'Harness RAG graph retrieval: entity-seeded, structure-driven evidence across chapters (semantic gating, node budget, hub guard; the response carries the retrieval trace). Corresponds to the recall-test graph path.',
    parameters: searchParams(),
    output,
    async execute(args, exec) {
      return recallTest(config, kb(args), 'graph', args, exec.signal)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_wiki_search',
    description: 'Harness RAG wiki retrieval: pre-digested wiki entries and manual knowledge cards merged in one pool (wiki wins score ties); hits carry source_type wiki|manual, and wiki hits carry source_chunk_ids. Corresponds to the recall-test wiki path.',
    parameters: searchParams(),
    output,
    async execute(args, exec) {
      return recallTest(config, kb(args), 'wiki', args, exec.signal)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_list_documents',
    description: 'List documents in a knowledge base with honest per-status counts.',
    parameters: {
      kb_id: { type: 'string' as const, description: 'Knowledge base id; falls back to the configured default' },
    },
    output,
    async execute(args, exec) {
      return api(config, `/api/knowledge-bases/${kb(args)}/documents`, { signal: exec.signal })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_read_document',
    description: "Read a knowledge document's chunks. Page through it by doc_id with offset/limit, or follow a search hit by passing its chunk_id: the window (default 20, max 50 chunks) is centered on that chunk and clamped at the document edges. Returns {items, total, offset, limit, has_more, message}.",
    parameters: {
      kb_id: { type: 'string' as const, description: 'Knowledge base id; falls back to the configured default' },
      doc_id: { type: 'string' as const, required: true, description: 'Document to read (required; when using chunk_id the service resolves the document from the chunk)' },
      chunk_id: { type: 'string' as const, description: 'Center the window on this chunk (takes precedence over offset)' },
      offset: { type: 'number' as const, description: 'Chunk offset when paging by doc_id' },
      limit: { type: 'number' as const, description: 'Page/window width in chunks (default 20, capped at 50)' },
    },
    output,
    async execute(args, exec) {
      return api(config, `/api/knowledge-bases/${kb(args)}/documents/${args.doc_id}/chunks`, {
        query: { chunk_id: args.chunk_id, offset: args.offset, limit: args.limit },
        signal: exec.signal,
      })
    },
  }))
}
