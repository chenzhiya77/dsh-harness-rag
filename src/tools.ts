import type { Context } from 'cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { api, HarnessRagError } from './http.ts'
import type { Config } from './settings.ts'

const jsonRender = (_args: unknown, value: unknown) => [
  { type: 'text' as const, text: JSON.stringify(value, null, 2) },
]

const output = {
  // The DSL mandates explicit openness on every object node (schema.ts
  // authorError); outputs are open backend payloads until T2 tightens them.
  schema: { type: 'object' as const, additionalProperties: true as const },
  render: jsonRender,
}

function kbParams() {
  return {
    query: { type: 'string' as const, required: true, description: 'Search query' },
    kb_id: { type: 'string' as const, description: 'Knowledge base id; falls back to the configured default' },
    top_k: { type: 'number' as const, description: 'Max hits to return' },
  }
}

export function registerTools(ctx: Context, config: Config) {
  const kb = (args: { kb_id?: string }) => {
    const id = args.kb_id?.trim() || config.defaultKbId.trim()
    if (!id) {
      throw new HarnessRagError({ kind: 'not_configured', detail: 'kb_id not given and no defaultKbId configured.' })
    }
    return id
  }

  // TODO(T2): pin each path against the knowledge service surface (recall-test
  // seam). Endpoint shapes below are the planned mapping, not yet verified.
  ctx.tools.register(defineTool({
    name: 'hrag_hybrid_search',
    description: 'Harness RAG hybrid retrieval: vector + sparse fusion with rerank over one knowledge base.',
    parameters: kbParams(),
    output,
    async execute(args, exec) {
      return api(config, `/api/knowledge-bases/${kb(args)}/recall-test`, {
        body: { query: args.query, path: 'vector', top_k: args.top_k },
        signal: exec.signal,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_graph_search',
    description: 'Harness RAG graph retrieval: entity-seeded structure-driven evidence across chapters.',
    parameters: kbParams(),
    output,
    async execute(args, exec) {
      return api(config, `/api/knowledge-bases/${kb(args)}/recall-test`, {
        body: { query: args.query, path: 'graph', top_k: args.top_k },
        signal: exec.signal,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_wiki_search',
    description: 'Harness RAG wiki retrieval: pre-digested wiki entries and manual knowledge cards.',
    parameters: kbParams(),
    output,
    async execute(args, exec) {
      return api(config, `/api/knowledge-bases/${kb(args)}/recall-test`, {
        body: { query: args.query, path: 'wiki', top_k: args.top_k },
        signal: exec.signal,
      })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_list_documents',
    description: 'List documents in a knowledge base with per-status counts.',
    parameters: {
      kb_id: { type: 'string', description: 'Knowledge base id; falls back to the configured default' },
    },
    output,
    async execute(args, exec) {
      return api(config, `/api/knowledge-bases/${kb(args)}/documents`, { signal: exec.signal })
    },
  }))

  ctx.tools.register(defineTool({
    name: 'hrag_read_document',
    description: "Read a knowledge document's chunks, paged by doc_id or as a window centered on a known chunk_id, so a search hit can be followed up in place.",
    parameters: {
      kb_id: { type: 'string', description: 'Knowledge base id; falls back to the configured default' },
      doc_id: { type: 'string', description: 'Document to page through' },
      chunk_id: { type: 'string', description: 'Center the window on this chunk (takes precedence over offset)' },
      offset: { type: 'number', description: 'Chunk offset when paging by doc_id' },
      limit: { type: 'number', description: 'Max chunks to return' },
    },
    output,
    async execute(args, exec) {
      return api(config, `/api/knowledge-bases/${kb(args)}/documents/${args.doc_id ?? ''}/chunks`, {
        body: { chunk_id: args.chunk_id, offset: args.offset, limit: args.limit },
        signal: exec.signal,
      })
    },
  }))
}
