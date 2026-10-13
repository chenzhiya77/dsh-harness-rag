import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import type { Context } from 'cordis'
import { api, HarnessRagError } from './http.ts'
import type { ApiError } from './http.ts'
import type { Config } from './settings.ts'

/**
 * Named route for the panel's data seam (spec 2026-10-12 §3.1, D3 甲): the
 * browser half POSTs `{op}` requests here and the host half forwards them
 * through the same `api()` the tools use, so the service credentials never
 * reach the page and no cross-origin configuration is involved.
 */
export const KB_PROXY_ROUTE = '/dsh-harness-rag/api'

/**
 * One thin function per panel action; each maps a panel op onto the existing
 * REST surface. The table grows task by task — T3 Task 1 registered the shell
 * op (the knowledge-base selector's list); Task 2 the documents pane
 * (list / delete / retry); Task 3 the chunks pane (list / delete preview /
 * delete); Task 5 the ingest actions (supported formats / reindex / reindex
 * status; the multipart upload rides its own raw pass-through below);
 * Task 6 the vector projection (coordinates + the query overlay transform);
 * Task 7 the knowledge graph (nodes / edges / communities) and the chunk
 * positions behind the "slice #K" labels; Task 8 the eval family (question
 * bank CRUD, the synthesis quartet, run history / trigger / cancel / delete /
 * latest / trend / detail, and the anchor-preview chunk lookup).
 */
/** Shared projection query mirror for both projection ops: collections join
 * into the comma form the route declares (absent array = route default),
 * algo/dims/sample_size pass through only when well-formed. */
function projectionQueryParams(args: unknown): Record<string, unknown> {
  const source = args as Record<string, unknown> | null | undefined
  const query: Record<string, unknown> = {}
  const collections = source?.collections
  if (Array.isArray(collections) && collections.length > 0 && collections.every((key) => typeof key === 'string')) {
    query.collections = collections.join(',')
  }
  if (source?.algo === 'pca' || source?.algo === 'umap') query.algo = source.algo
  if (source?.dims === 2 || source?.dims === 3) query.dims = source.dims
  if (typeof source?.sample_size === 'number') query.sample_size = source.sample_size
  return query
}

function buildOps(config: Config): Record<string, (args: unknown) => Promise<unknown>> {
  const needString = (args: unknown, key: string): string => {
    const value = (args as Record<string, unknown> | null | undefined)?.[key]
    if (typeof value !== 'string' || !value.trim()) {
      throw new HarnessRagError({ kind: 'http', status: 400, detail: `panel op requires "${key}"` })
    }
    return value.trim()
  }
  const kbPath = (args: unknown) => `/api/knowledge-bases/${encodeURIComponent(needString(args, 'kb_id'))}`
  const docPath = (args: unknown) => `${kbPath(args)}/documents/${encodeURIComponent(needString(args, 'doc_id'))}`
  /** Panel-composed JSON body pass-through (eval family): a plain object is
   * required; field-level validation is the service's own contract (422). */
  const bodyOf = (args: unknown): Record<string, unknown> => {
    const body = (args as Record<string, unknown> | null | undefined)?.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires an object "body"' })
    }
    return body as Record<string, unknown>
  }

  return {
    listKbs: () => api(config, '/api/knowledge-bases'),
    listDocuments: (args) => api(config, `${kbPath(args)}/documents`),
    deleteDocument: (args) => api(config, docPath(args), { method: 'DELETE' }),
    retryDocument: (args) => api(config, `${docPath(args)}/retry`, { method: 'POST' }),
    listChunks: (args) => {
      const source = args as Record<string, unknown> | null | undefined
      const query: Record<string, unknown> = {}
      if (typeof source?.offset === 'number') query.offset = source.offset
      if (typeof source?.limit === 'number') query.limit = source.limit
      return api(config, `${docPath(args)}/chunks`, { query })
    },
    previewChunkDeletion: (args) => {
      const ids = (args as Record<string, unknown> | null | undefined)?.chunk_ids
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim())) {
        throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "chunk_ids"' })
      }
      return api(config, `${kbPath(args)}/chunks/delete-preview`, { body: { chunk_ids: ids } })
    },
    deleteChunk: (args) =>
      api(config, `${kbPath(args)}/chunks/${encodeURIComponent(needString(args, 'chunk_id'))}`, { method: 'DELETE' }),
    recallTest: (args) => {
      const source = args as Record<string, unknown> | null | undefined
      const query = typeof source?.query === 'string' ? source.query.trim() : ''
      if (!query) {
        throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "query"' })
      }
      // Same clamp as the hrag tool's top_k: absent → 5, otherwise 1–20.
      const raw = source?.top_k
      const topK = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(20, Math.max(1, Math.trunc(raw))) : 5
      return api(config, `${kbPath(args)}/recall-test`, { body: { query, top_k: topK } })
    },
    supportedFormats: () => api(config, '/api/knowledge-bases/supported-formats'),
    knowledgeGraph: (args) => api(config, `${kbPath(args)}/graph`),
    chunkPositions: (args) => {
      const ids = (args as Record<string, unknown> | null | undefined)?.chunk_ids
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim())) {
        throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "chunk_ids"' })
      }
      return api(config, `${kbPath(args)}/chunk-positions`, { body: { chunk_ids: ids } })
    },
    reindex: (args) => api(config, `${kbPath(args)}/reindex`, { method: 'POST' }),
    reindexStatus: (args) => api(config, `${kbPath(args)}/reindex/status`),
    vectorProjection: (args) => {
      const query = projectionQueryParams(args)
      if ((args as Record<string, unknown> | null | undefined)?.refresh === true) query.refresh = 'true'
      return api(config, `${kbPath(args)}/vector-projection`, { query })
    },
    projectVectorQuery: (args) => {
      const source = args as Record<string, unknown> | null | undefined
      const text = typeof source?.text === 'string' ? source.text.trim() : ''
      if (!text) {
        throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "text"' })
      }
      // Mirror the view's params: the server cache key includes them, so any
      // drift turns the transform into a 409 by design.
      return api(config, `${kbPath(args)}/vector-projection/query`, {
        query: projectionQueryParams(args),
        body: { text },
      })
    },
    // ── 评测（Task 8）：题库 CRUD／合成四端点／运行族／锚片预览 ─────────────
    listEvalQuestions: (args) => api(config, `${kbPath(args)}/eval/questions`),
    createEvalQuestion: (args) => api(config, `${kbPath(args)}/eval/questions`, { body: bodyOf(args) }),
    updateEvalQuestion: (args) =>
      api(config, `${kbPath(args)}/eval/questions/${encodeURIComponent(needString(args, 'question_id'))}`, {
        method: 'PATCH',
        body: bodyOf(args),
      }),
    deleteEvalQuestion: (args) =>
      api(config, `${kbPath(args)}/eval/questions/${encodeURIComponent(needString(args, 'question_id'))}`, {
        method: 'DELETE',
      }),
    triggerSynthesis: (args) => api(config, `${kbPath(args)}/eval/questions/synthesize`, { body: bodyOf(args) }),
    synthesisStatus: (args) => api(config, `${kbPath(args)}/eval/questions/synthesize`),
    acceptSynthesis: (args) => {
      // Bodyless unless the panel confirms past an anchor block (B′ contract).
      const ack = (args as Record<string, unknown> | null | undefined)?.anchor_ack === true
      return api(
        config,
        `${kbPath(args)}/eval/questions/synthesize/${encodeURIComponent(needString(args, 'candidate_id'))}/accept`,
        { method: 'POST', ...(ack ? { body: { anchor_ack: true } } : {}) },
      )
    },
    rejectSynthesis: (args) =>
      api(config, `${kbPath(args)}/eval/questions/synthesize/${encodeURIComponent(needString(args, 'candidate_id'))}`, {
        method: 'DELETE',
      }),
    listEvalRuns: (args) => {
      const source = args as Record<string, unknown> | null | undefined
      const query: Record<string, unknown> = {}
      if (typeof source?.limit === 'number' && Number.isFinite(source.limit)) query.limit = Math.trunc(source.limit)
      if (source?.include_ci === true) query.include_ci = 'true'
      return api(config, `${kbPath(args)}/eval-runs`, { query })
    },
    triggerEvalRun: (args) => api(config, `${kbPath(args)}/eval-runs`, { body: bodyOf(args) }),
    cancelEvalRun: (args) => api(config, `${kbPath(args)}/eval-runs/cancel`, { method: 'POST' }),
    deleteEvalRuns: (args) => api(config, `${kbPath(args)}/eval-runs`, { method: 'DELETE', body: bodyOf(args) }),
    evalRunLatest: (args) => api(config, `${kbPath(args)}/eval-runs/latest`),
    evalRunTrend: (args) => api(config, `${kbPath(args)}/eval-runs/trend`),
    evalRunDetail: (args) =>
      api(config, `${kbPath(args)}/eval-runs/${encodeURIComponent(needString(args, 'run_id'))}`),
    chunksByIds: (args) => {
      const ids = (args as Record<string, unknown> | null | undefined)?.chunk_ids
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim())) {
        throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "chunk_ids"' })
      }
      return api(config, `${kbPath(args)}/chunks`, { query: { ids } })
    },
  }
}

interface WebServerLike {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>
  }): () => void
}

/** The subset of the injected context used here; the host's service type for
 * `webServer` lives in an installation package the plugin does not depend on. */
interface WebServerHostLike {
  effect(callback: () => unknown, label: string): unknown
  webServer: WebServerLike
}

interface PanelHostLike {
  inject(dependencies: string[], callback: (fresh: WebServerHostLike) => void): void
}

const MAX_BODY_BYTES = 1024 * 1024

const sendJson = (res: ServerResponse, status: number, payload: unknown): void => {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  })
  res.end(body)
}

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buf.length
    if (size > MAX_BODY_BYTES) {
      throw new HarnessRagError({ kind: 'http', status: 413, detail: 'panel request body too large' })
    }
    chunks.push(buf)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel request body is not valid JSON' })
  }
}

/** Service failures keep their own status; bridge-level failures answer 502
 * (unreachable) or 503 (not configured) so the panel can tell them apart. */
const errorStatus = (info: ApiError): number => {
  if (info.kind === 'http' && typeof info.status === 'number') return info.status
  return info.kind === 'network' ? 502 : 503
}

/** Raw upload pass-through: the browser posts multipart here and the body
 * streams to the backend unchanged (the JSON ops' envelope does not fit
 * file payloads). The original content-type boundary, the token header and
 * the upstream status all pass through. */
const forwardUpload = async (req: IncomingMessage, res: ServerResponse, config: Config): Promise<void> => {
  const url = new URL(req.url ?? '/', 'http://webServer')
  const kbId = (url.searchParams.get('kb_id') ?? '').trim()
  if (!kbId) {
    sendJson(res, 400, { error: { kind: 'http', status: 400, detail: 'panel op requires "kb_id"' } })
    return
  }
  const base = config.backendUrl?.trim()
  if (!base) {
    sendJson(res, 503, { error: { kind: 'not_configured', detail: 'backendUrl is not configured (settings → harness-rag).' } })
    return
  }
  const headers: Record<string, string> = {}
  const contentType = req.headers['content-type']
  if (typeof contentType === 'string' && contentType) headers['content-type'] = contentType
  if (config.apiToken) headers.authorization = `Bearer ${config.apiToken}`
  let upstream: Response
  try {
    upstream = await fetch(new URL(`/api/knowledge-bases/${encodeURIComponent(kbId)}/documents`, base), {
      method: 'POST',
      headers,
      body: Readable.toWeb(req) as unknown as ReadableStream,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })
  } catch (cause) {
    sendJson(res, 502, { error: { kind: 'network', detail: `knowledge service unreachable: ${String(cause)}` } })
    return
  }
  const text = await upstream.text()
  res.writeHead(upstream.status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  })
  res.end(text)
}

export function registerKbProxy(ctx: Context, config: Config): void {
  const ops = buildOps(config)

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: { kind: 'method', detail: 'the panel proxy accepts POST only' } })
        return
      }
      const pathname = new URL(req.url ?? '/', 'http://webServer').pathname
      const opName = decodeURIComponent(pathname.slice(KB_PROXY_ROUTE.length + 1))
      if (opName === 'uploadDocument') {
        await forwardUpload(req, res, config)
        return
      }
      const op = ops[opName]
      if (!op) {
        sendJson(res, 404, { error: { kind: 'op', detail: `unknown panel op: ${opName}` } })
        return
      }
      const data = await op(await readJsonBody(req))
      sendJson(res, 200, data ?? null)
    } catch (error) {
      if (error instanceof HarnessRagError) {
        sendJson(res, errorStatus(error.info), { error: error.info })
        return
      }
      sendJson(res, 500, {
        error: { kind: 'internal', detail: error instanceof Error ? error.message : String(error) },
      })
    }
  }

  // The web server is optional at activation (headless profiles have none):
  // inject it so the tools keep working there, and the route appears wherever
  // a browser-facing host runs.
  const host = ctx as unknown as PanelHostLike
  host.inject(['webServer'], (fresh) => {
    fresh.effect(
      () => fresh.webServer.register({ kind: 'prefix', path: KB_PROXY_ROUTE, handler }),
      'harness-rag: panel proxy route',
    )
  })
}
