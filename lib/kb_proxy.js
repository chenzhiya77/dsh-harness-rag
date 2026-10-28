import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { conversationOps, } from "./conversations.js";
import { api, HarnessRagError } from "./http.js";
import { registerIngestJobs } from "./jobs.js";
import { unavailableModelStatus } from "./model_sync.js";
import { configureRuntime, panelStatus, pickDirectory, retryRuntime, RuntimeOpError, upgradeRuntime, } from "./runtime/ops.js";
/**
 * Named route for the panel's data seam (spec 2026-10-12 §3.1, D3 甲): the
 * browser half POSTs `{op}` requests here and the host half forwards them
 * through the same `api()` the tools use, so the service credentials never
 * reach the page and no cross-origin configuration is involved.
 */
export const KB_PROXY_ROUTE = '/dsh-harness-rag/api';
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
 * latest / trend / detail, and the anchor-preview chunk lookup). ②档乙对
 * Task 1 adds the slice-face actions (chunk text update / re-extract) plus
 * three read-only media relays that the panel's <img>/<video> load directly
 * (document files, shot keyframes, the range-negotiated video stream).
 * The ②档丙对 (my-entries) adds the manual-card CRUD trio (create / update /
 * delete); grouping stays device-local in localStorage, so the backend surface
 * is unchanged.
 */
/** Shared projection query mirror for both projection ops: collections join
 * into the comma form the route declares (absent array = route default),
 * algo/dims/sample_size pass through only when well-formed. */
function projectionQueryParams(args) {
    const source = args;
    const query = {};
    const collections = source?.collections;
    if (Array.isArray(collections) && collections.length > 0 && collections.every((key) => typeof key === 'string')) {
        query.collections = collections.join(',');
    }
    if (source?.algo === 'pca' || source?.algo === 'umap')
        query.algo = source.algo;
    if (source?.dims === 2 || source?.dims === 3)
        query.dims = source.dims;
    if (typeof source?.sample_size === 'number')
        query.sample_size = source.sample_size;
    return query;
}
function buildOps(config, ingestJobs, modelSync) {
    const needString = (args, key) => {
        const value = args?.[key];
        if (typeof value !== 'string' || !value.trim()) {
            throw new HarnessRagError({ kind: 'http', status: 400, detail: `panel op requires "${key}"` });
        }
        return value.trim();
    };
    const kbPath = (args) => `/api/knowledge-bases/${encodeURIComponent(needString(args, 'kb_id'))}`;
    const docPath = (args) => `${kbPath(args)}/documents/${encodeURIComponent(needString(args, 'doc_id'))}`;
    /** Panel-composed JSON body pass-through (eval family): a plain object is
     * required; field-level validation is the service's own contract (422). */
    const bodyOf = (args) => {
        const body = args?.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires an object "body"' });
        }
        return body;
    };
    return {
        listKbs: () => api(config, '/api/knowledge-bases'),
        listDocuments: (args) => api(config, `${kbPath(args)}/documents`),
        deleteDocument: (args) => api(config, docPath(args), { method: 'DELETE' }),
        retryDocument: (args) => api(config, `${docPath(args)}/retry`, { method: 'POST' }),
        listChunks: (args) => {
            const source = args;
            const query = {};
            if (typeof source?.offset === 'number')
                query.offset = source.offset;
            if (typeof source?.limit === 'number')
                query.limit = source.limit;
            return api(config, `${docPath(args)}/chunks`, { query });
        },
        previewChunkDeletion: (args) => {
            const ids = args?.chunk_ids;
            if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim())) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "chunk_ids"' });
            }
            return api(config, `${kbPath(args)}/chunks/delete-preview`, { body: { chunk_ids: ids } });
        },
        deleteChunk: (args) => api(config, `${kbPath(args)}/chunks/${encodeURIComponent(needString(args, 'chunk_id'))}`, { method: 'DELETE' }),
        // ── 切片面（②档乙对 Task 1）：编辑重嵌＋重抽（五步级联，文档非终态 409）──
        updateChunk: (args) => {
            const body = bodyOf(args);
            if (typeof body.text !== 'string') {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires a string "text" in body' });
            }
            return api(config, `${kbPath(args)}/chunks/${encodeURIComponent(needString(args, 'chunk_id'))}`, {
                method: 'PATCH',
                body,
            });
        },
        reExtractChunk: (args) => api(config, `${kbPath(args)}/chunks/${encodeURIComponent(needString(args, 'chunk_id'))}/re-extract`, { method: 'POST' }),
        recallTest: (args) => {
            const source = args;
            const query = typeof source?.query === 'string' ? source.query.trim() : '';
            if (!query) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "query"' });
            }
            // Same clamp as the hrag tool's top_k: absent → 5, otherwise 1–20.
            const raw = source?.top_k;
            const topK = typeof raw === 'number' && Number.isFinite(raw) ? Math.min(20, Math.max(1, Math.trunc(raw))) : 5;
            return api(config, `${kbPath(args)}/recall-test`, { body: { query, top_k: topK } });
        },
        supportedFormats: () => api(config, '/api/knowledge-bases/supported-formats'),
        knowledgeGraph: (args) => api(config, `${kbPath(args)}/graph`),
        chunkPositions: (args) => {
            const ids = args?.chunk_ids;
            if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim())) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "chunk_ids"' });
            }
            return api(config, `${kbPath(args)}/chunk-positions`, { body: { chunk_ids: ids } });
        },
        reindex: async (args) => {
            const source = args;
            const data = await api(config, `${kbPath(args)}/reindex`, { method: 'POST' });
            // T4 摄取通道：只给新起的重建登记宿主后台任务（already_running 不起，防重复）。
            if (data && data.status === 'enqueued') {
                const sessionId = typeof source?.session_id === 'string' ? source.session_id.trim() : '';
                const kbLabel = typeof source?.kb_label === 'string' ? source.kb_label : '';
                ingestJobs.noteReindex({ sessionId, kbId: needString(args, 'kb_id'), kbLabel });
            }
            return data;
        },
        reindexStatus: (args) => api(config, `${kbPath(args)}/reindex/status`),
        vectorProjection: (args) => {
            const query = projectionQueryParams(args);
            if (args?.refresh === true)
                query.refresh = 'true';
            return api(config, `${kbPath(args)}/vector-projection`, { query });
        },
        projectVectorQuery: (args) => {
            const source = args;
            const text = typeof source?.text === 'string' ? source.text.trim() : '';
            if (!text) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "text"' });
            }
            // Mirror the view's params: the server cache key includes them, so any
            // drift turns the transform into a 409 by design.
            return api(config, `${kbPath(args)}/vector-projection/query`, {
                query: projectionQueryParams(args),
                body: { text },
            });
        },
        // ── 评测（Task 8）：题库 CRUD／合成四端点／运行族／锚片预览 ─────────────
        listEvalQuestions: (args) => api(config, `${kbPath(args)}/eval/questions`),
        createEvalQuestion: (args) => api(config, `${kbPath(args)}/eval/questions`, { body: bodyOf(args) }),
        updateEvalQuestion: (args) => api(config, `${kbPath(args)}/eval/questions/${encodeURIComponent(needString(args, 'question_id'))}`, {
            method: 'PATCH',
            body: bodyOf(args),
        }),
        deleteEvalQuestion: (args) => api(config, `${kbPath(args)}/eval/questions/${encodeURIComponent(needString(args, 'question_id'))}`, {
            method: 'DELETE',
        }),
        triggerSynthesis: (args) => api(config, `${kbPath(args)}/eval/questions/synthesize`, { body: bodyOf(args) }),
        synthesisStatus: (args) => api(config, `${kbPath(args)}/eval/questions/synthesize`),
        acceptSynthesis: (args) => {
            // Bodyless unless the panel confirms past an anchor block (B′ contract).
            const ack = args?.anchor_ack === true;
            return api(config, `${kbPath(args)}/eval/questions/synthesize/${encodeURIComponent(needString(args, 'candidate_id'))}/accept`, { method: 'POST', ...(ack ? { body: { anchor_ack: true } } : {}) });
        },
        rejectSynthesis: (args) => api(config, `${kbPath(args)}/eval/questions/synthesize/${encodeURIComponent(needString(args, 'candidate_id'))}`, {
            method: 'DELETE',
        }),
        listEvalRuns: (args) => {
            const source = args;
            const query = {};
            if (typeof source?.limit === 'number' && Number.isFinite(source.limit))
                query.limit = Math.trunc(source.limit);
            if (source?.include_ci === true)
                query.include_ci = 'true';
            return api(config, `${kbPath(args)}/eval-runs`, { query });
        },
        triggerEvalRun: (args) => api(config, `${kbPath(args)}/eval-runs`, { body: bodyOf(args) }),
        cancelEvalRun: (args) => api(config, `${kbPath(args)}/eval-runs/cancel`, { method: 'POST' }),
        deleteEvalRuns: (args) => api(config, `${kbPath(args)}/eval-runs`, { method: 'DELETE', body: bodyOf(args) }),
        evalRunLatest: (args) => api(config, `${kbPath(args)}/eval-runs/latest`),
        evalRunTrend: (args) => api(config, `${kbPath(args)}/eval-runs/trend`),
        evalRunDetail: (args) => api(config, `${kbPath(args)}/eval-runs/${encodeURIComponent(needString(args, 'run_id'))}`),
        chunksByIds: (args) => {
            const ids = args?.chunk_ids;
            if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim())) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "chunk_ids"' });
            }
            return api(config, `${kbPath(args)}/chunks`, { query: { ids } });
        },
        // ── 百科（Task 9）：条目读/删/更新（单条与库级同族）＋人工卡片读 ─────────
        listWikiEntries: (args) => api(config, `${kbPath(args)}/wiki/entries`),
        wikiEntry: (args) => api(config, `${kbPath(args)}/wiki/entries/${encodeURIComponent(needString(args, 'entry_id'))}`),
        deleteWikiEntry: (args) => api(config, `${kbPath(args)}/wiki/entries/${encodeURIComponent(needString(args, 'entry_id'))}`, {
            method: 'DELETE',
        }),
        // 丙对收口追加（E3 条目编辑）：PATCH 主内容＋补充层，字段级校验归服务端 422。
        updateWikiEntry: (args) => api(config, `${kbPath(args)}/wiki/entries/${encodeURIComponent(needString(args, 'entry_id'))}`, {
            method: 'PATCH',
            body: bodyOf(args),
        }),
        regenerateWikiEntries: (args) => {
            const ids = args?.entry_ids;
            if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.trim())) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "entry_ids"' });
            }
            return api(config, `${kbPath(args)}/wiki/regenerate`, { body: { entry_ids: ids } });
        },
        generateWiki: (args) => {
            const mode = args?.mode;
            if (mode !== 'incremental' && mode !== 'full') {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "mode" (incremental|full)' });
            }
            return api(config, `${kbPath(args)}/wiki/generate`, { method: 'POST', query: { mode } });
        },
        listManualCards: (args) => {
            const source = args;
            const query = {};
            if (typeof source?.offset === 'number' && Number.isFinite(source.offset))
                query.offset = Math.trunc(source.offset);
            if (typeof source?.limit === 'number' && Number.isFinite(source.limit))
                query.limit = Math.trunc(source.limit);
            return api(config, `${kbPath(args)}/manual-knowledge`, { query });
        },
        manualCard: (args) => api(config, `${kbPath(args)}/manual-knowledge/${encodeURIComponent(needString(args, 'card_id'))}`),
        // ②档丙对：我的条目管理面——卡片 CRUD 三枚（分组仍在本机 localStorage，零后端）。
        createManualCard: (args) => api(config, `${kbPath(args)}/manual-knowledge`, { method: 'POST', body: bodyOf(args) }),
        updateManualCard: (args) => api(config, `${kbPath(args)}/manual-knowledge/${encodeURIComponent(needString(args, 'card_id'))}`, {
            method: 'PATCH',
            body: bodyOf(args),
        }),
        deleteManualCard: (args) => api(config, `${kbPath(args)}/manual-knowledge/${encodeURIComponent(needString(args, 'card_id'))}`, {
            method: 'DELETE',
        }),
        // ── 库级与设置面（菜单批 Task 1）：KB CRUD ＋ RAG 配置读取 ＋ 模型目录 ──
        createKb: (args) => {
            const source = args;
            const name = typeof source?.name === 'string' ? source.name.trim() : '';
            if (!name) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "name"' });
            }
            const description = typeof source?.description === 'string' ? source.description : '';
            return api(config, '/api/knowledge-bases', { method: 'POST', body: { name, description } });
        },
        renameKb: (args) => {
            const name = args?.name;
            if (typeof name !== 'string' || !name.trim()) {
                throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel op requires "name"' });
            }
            return api(config, kbPath(args), { method: 'PATCH', body: { name: name.trim() } });
        },
        deleteKb: (args) => api(config, kbPath(args), { method: 'DELETE' }),
        ragConfigGet: () => api(config, '/api/rag/config'),
        ragMigration: () => api(config, '/api/rag/config/migration'),
        listModels: () => api(config, '/api/models'),
        // 配置条目面（带声明能力，如 supports_vision）——caption 选择器的合规源（照工作台 modelsConfig）。
        listModelsConfig: () => api(config, '/api/models/config'),
        // DSH 模型同步（丙）：只读状态与手动重发布；响应不含代理 token。
        dshModelStatus: async () => modelSync?.status() ?? unavailableModelStatus(config.autoSyncModels),
        dshModelSync: async () => modelSync ? modelSync.syncNow() : unavailableModelStatus(config.autoSyncModels),
        // ── 设置面批 2（Task 2）：RAG 配置保存 ＋ 四枚只读探针（探针是真实调用但零写入）──
        ragConfigPut: (args) => api(config, '/api/rag/config', { method: 'PUT', body: bodyOf(args) }),
        probeEmbedding: (args) => api(config, '/api/rag/config/probe-embedding', { method: 'POST', body: bodyOf(args) }),
        probeDimensions: (args) => api(config, '/api/rag/config/probe-dimensions', { method: 'POST', body: bodyOf(args) }),
        probeConnectivity: (args) => api(config, '/api/rag/config/probe-connectivity', { method: 'POST', body: bodyOf(args) }),
        probeSparse: (args) => api(config, '/api/rag/config/probe-sparse', { method: 'POST', body: bodyOf(args) }),
        // 照工作台「零入口休眠」保持链路完整（探针 UI 已撤，判定与门留着）。
        probeAsr: (args) => api(config, '/api/rag/config/probe-asr', { method: 'POST', body: bodyOf(args) }),
    };
}
const MAX_BODY_BYTES = 1024 * 1024;
const sendJson = (res, status, payload) => {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        'cache-control': 'no-store',
    });
    res.end(body);
};
const readJsonBody = async (req) => {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        size += buf.length;
        if (size > MAX_BODY_BYTES) {
            throw new HarnessRagError({ kind: 'http', status: 413, detail: 'panel request body too large' });
        }
        chunks.push(buf);
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new HarnessRagError({ kind: 'http', status: 400, detail: 'panel request body is not valid JSON' });
    }
};
/** Service failures keep their own status; bridge-level failures answer 502
 * (unreachable) or 503 (not configured) so the panel can tell them apart. */
const errorStatus = (info) => {
    if (info.kind === 'http' && typeof info.status === 'number')
        return info.status;
    if (info.kind === 'runtime_not_ready' || info.kind === 'not_configured')
        return 503;
    if (info.kind === 'cross_origin')
        return 403;
    if (info.kind === 'unsupported_media_type')
        return 415;
    return 502;
};
/** Ops that can start a download or move the runtime root. They only accept a
 * JSON POST from this origin, so a cross-site page cannot trigger them. */
export const PRIVILEGED_OPS = new Set([
    'runtime/configure',
    'runtime/pickDirectory',
    'runtime/retry',
    'runtime/upgrade',
]);
export function checkPrivilegedRequest(headers) {
    const type = (headers['content-type'] ?? '').toLowerCase();
    if (!type.startsWith('application/json')) {
        throw new HarnessRagError({
            kind: 'unsupported_media_type',
            detail: 'privileged panel ops require application/json',
        });
    }
    const site = headers['sec-fetch-site'];
    if (site && site !== 'same-origin' && site !== 'none') {
        throw new HarnessRagError({
            kind: 'cross_origin',
            detail: `cross-site panel op rejected (sec-fetch-site: ${site})`,
        });
    }
    const origin = headers.origin;
    if (origin === 'null') {
        throw new HarnessRagError({ kind: 'cross_origin', detail: 'opaque-origin panel op rejected' });
    }
    if (origin) {
        const host = headers.host ?? '';
        if (!host || (origin !== `http://${host}` && origin !== `https://${host}`)) {
            throw new HarnessRagError({
                kind: 'cross_origin',
                detail: `cross-origin panel op rejected (origin: ${origin})`,
            });
        }
    }
}
/** The panel's "follow the session" read: latest retrieval trace recorded by
 * this session's hrag_* calls for the browsing kb. Read-only and unscoped on
 * purpose — the panel polls it while the conversation is live. */
function sessionTraceOps(traces) {
    return {
        sessionTrace: async (args) => {
            const body = (args ?? {});
            const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
            const kbId = typeof body.kb_id === 'string' ? body.kb_id : '';
            if (!sessionId || !kbId)
                return { vector: null, graph: null };
            return traces.latest(sessionId, kbId);
        },
    };
}
function runtimePanelOps(deps) {
    return {
        'runtime/status': async () => panelStatus(deps),
        'runtime/retry': async () => retryRuntime(deps),
        'runtime/upgrade': async (args) => upgradeRuntime(deps, (args ?? {})),
        'runtime/pickDirectory': async () => pickDirectory(deps),
        'runtime/configure': async (args) => configureRuntime(deps, (args ?? {})),
    };
}
/** Raw upload pass-through: the browser posts multipart here and the body
 * streams to the backend unchanged (the JSON ops' envelope does not fit
 * file payloads). The original content-type boundary, the token header and
 * the upstream status all pass through. A 2xx response that parses as the
 * created document record additionally registers the T4 ingest job. */
const forwardUpload = async (req, res, config, ingestJobs) => {
    const url = new URL(req.url ?? '/', 'http://webServer');
    const kbId = (url.searchParams.get('kb_id') ?? '').trim();
    if (!kbId) {
        sendJson(res, 400, { error: { kind: 'http', status: 400, detail: 'panel op requires "kb_id"' } });
        return;
    }
    const base = config.backendUrl?.trim();
    if (!base) {
        sendJson(res, 503, { error: { kind: 'not_configured', detail: 'backendUrl is not configured (settings → harness-rag).' } });
        return;
    }
    const headers = {};
    const contentType = req.headers['content-type'];
    if (typeof contentType === 'string' && contentType)
        headers['content-type'] = contentType;
    if (config.apiToken)
        headers.authorization = `Bearer ${config.apiToken}`;
    let upstream;
    try {
        upstream = await fetch(new URL(`/api/knowledge-bases/${encodeURIComponent(kbId)}/documents`, base), {
            method: 'POST',
            headers,
            body: Readable.toWeb(req),
            duplex: 'half',
        });
    }
    catch (cause) {
        sendJson(res, 502, { error: { kind: 'network', detail: `knowledge service unreachable: ${String(cause)}` } });
        return;
    }
    const text = await upstream.text();
    // T4 摄取通道：2xx 且响应可解析出文档记录时登记宿主后台任务（跟随到终态）；
    // 失败面/非 JSON 一律原样中继，不猜、不起 job。
    if (upstream.status < 300) {
        try {
            const doc = JSON.parse(text);
            if (doc && typeof doc === 'object') {
                const sessionId = (url.searchParams.get('session_id') ?? '').trim();
                ingestJobs.noteDocument({ sessionId, kbId, doc: doc });
            }
        }
        catch {
            /* not JSON: the panel body passes through unchanged */
        }
    }
    res.writeHead(upstream.status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(text),
        'cache-control': 'no-store',
    });
    res.end(text);
};
/** Raw download relay: the browser POSTs kb/doc ids to the proxy route and the
 * source bytes stream back with the upstream content-type and disposition
 * (the JSON ops' envelope does not fit file bodies). Failures answer the JSON
 * error envelope with the upstream status preserved. */
const forwardDownload = async (req, res, config) => {
    const url = new URL(req.url ?? '/', 'http://webServer');
    const kbId = (url.searchParams.get('kb_id') ?? '').trim();
    const docId = (url.searchParams.get('doc_id') ?? '').trim();
    if (!kbId || !docId) {
        sendJson(res, 400, { error: { kind: 'http', status: 400, detail: 'panel op requires "kb_id" and "doc_id"' } });
        return;
    }
    const base = config.backendUrl?.trim();
    if (!base) {
        sendJson(res, 503, { error: { kind: 'not_configured', detail: 'backendUrl is not configured (settings → harness-rag).' } });
        return;
    }
    const headers = {};
    if (config.apiToken)
        headers.authorization = `Bearer ${config.apiToken}`;
    let upstream;
    try {
        upstream = await fetch(new URL(`/api/knowledge-bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}/source`, base), { headers });
    }
    catch (cause) {
        sendJson(res, 502, { error: { kind: 'network', detail: `knowledge service unreachable: ${String(cause)}` } });
        return;
    }
    if (!upstream.ok) {
        const text = await upstream.text();
        let detail = text;
        try {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed.detail === 'string')
                detail = parsed.detail;
        }
        catch {
            /* keep the raw text */
        }
        sendJson(res, upstream.status, { error: { kind: 'http', status: upstream.status, detail: `${upstream.status} ${detail}` } });
        return;
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    const outHeaders = {
        'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'content-length': bytes.length,
        'cache-control': 'no-store',
    };
    const disposition = upstream.headers.get('content-disposition');
    if (disposition)
        outHeaders['content-disposition'] = disposition;
    res.writeHead(200, outHeaders);
    res.end(bytes);
};
const relayAddress = (params, key) => (params.get(key) ?? '').trim();
const rawRelays = {
    documentFile: {
        path: (params) => {
            const kbId = relayAddress(params, 'kb_id');
            const docId = relayAddress(params, 'doc_id');
            const ref = relayAddress(params, 'ref');
            if (!kbId || !docId || !ref)
                return null;
            // 照工作台 documentFileUrl：ref 按段编码，斜杠保留作路径分隔。
            const encodedRef = ref.split('/').map(encodeURIComponent).join('/');
            return `/api/knowledge-bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}/files/${encodedRef}`;
        },
    },
    shotFrame: {
        path: (params) => {
            const kbId = relayAddress(params, 'kb_id');
            const docId = relayAddress(params, 'doc_id');
            const shotIndex = Number.parseInt(relayAddress(params, 'shot_index'), 10);
            if (!kbId || !docId || !Number.isInteger(shotIndex) || shotIndex < 0)
                return null;
            return `/api/knowledge-bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}/shots/${shotIndex}/frame`;
        },
    },
    videoStream: {
        range: true,
        path: (params) => {
            const kbId = relayAddress(params, 'kb_id');
            const docId = relayAddress(params, 'doc_id');
            if (!kbId || !docId)
                return null;
            return `/api/knowledge-bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}/video/stream`;
        },
    },
};
const forwardRelay = async (req, res, config, spec) => {
    const url = new URL(req.url ?? '/', 'http://webServer');
    const base = config.backendUrl?.trim();
    if (!base) {
        sendJson(res, 503, { error: { kind: 'not_configured', detail: 'backendUrl is not configured (settings → harness-rag).' } });
        return;
    }
    const path = spec.path(url.searchParams);
    if (path === null) {
        sendJson(res, 400, { error: { kind: 'http', status: 400, detail: 'panel relay requires well-formed addressing params' } });
        return;
    }
    const headers = {};
    if (config.apiToken)
        headers.authorization = `Bearer ${config.apiToken}`;
    const range = req.headers.range;
    if (spec.range && typeof range === 'string' && range)
        headers.range = range;
    let upstream;
    try {
        upstream = await fetch(new URL(path, base), { headers });
    }
    catch (cause) {
        sendJson(res, 502, { error: { kind: 'network', detail: `knowledge service unreachable: ${String(cause)}` } });
        return;
    }
    // 状态与体原样中继（404/416 等让原生 <img>/<video> 走自己的失败面）；流式不缓冲。
    const outHeaders = {
        'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'cache-control': 'no-store',
    };
    for (const name of ['content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(name);
        if (value)
            outHeaders[name] = value;
    }
    res.writeHead(upstream.status, outHeaders);
    if (!upstream.body) {
        res.end();
        return;
    }
    // 客户端提前断开（视频 seek 常态）会让 pipeline 以 abort 结束——响应已亡，静默收尾。
    await pipeline(Readable.fromWeb(upstream.body), res).catch(() => { });
};
export function registerKbProxy(ctx, config, bindings, modelSync, gating, runtimeOps, traces) {
    const ingestJobs = registerIngestJobs(ctx, config);
    // The conversation drawer's four ops: they read the host session catalog and
    // the local binding table instead of the knowledge service.
    const conversations = { controller: null };
    const ops = {
        ...buildOps(config, ingestJobs, modelSync),
        ...conversationOps({ host: conversations, bindings, ...(gating ? { gating } : {}) }),
        ...(runtimeOps ? runtimePanelOps(runtimeOps) : {}),
        ...(traces ? sessionTraceOps(traces) : {}),
    };
    const handler = async (req, res) => {
        try {
            const pathname = new URL(req.url ?? '/', 'http://webServer').pathname;
            const opName = decodeURIComponent(pathname.slice(KB_PROXY_ROUTE.length + 1));
            // 媒体直载路（<img>/<video> 原生加载）：GET；JSON op 与 upload/download 维持 POST。
            const relay = rawRelays[opName];
            if (relay) {
                if (req.method !== 'GET') {
                    sendJson(res, 405, { error: { kind: 'method', detail: 'the media relay accepts GET only' } });
                    return;
                }
                await forwardRelay(req, res, config, relay);
                return;
            }
            if (req.method !== 'POST') {
                sendJson(res, 405, { error: { kind: 'method', detail: 'the panel proxy accepts POST only' } });
                return;
            }
            if (opName === 'uploadDocument') {
                await forwardUpload(req, res, config, ingestJobs);
                return;
            }
            if (opName === 'downloadDocument') {
                await forwardDownload(req, res, config);
                return;
            }
            if (PRIVILEGED_OPS.has(opName))
                checkPrivilegedRequest(req.headers);
            const op = ops[opName];
            if (!op) {
                sendJson(res, 404, { error: { kind: 'op', detail: `unknown panel op: ${opName}` } });
                return;
            }
            const data = await op(await readJsonBody(req));
            sendJson(res, 200, data ?? null);
        }
        catch (error) {
            if (error instanceof RuntimeOpError) {
                sendJson(res, error.kind === 'upgrade_state' ? 409 : 400, {
                    error: { kind: error.kind, detail: error.message },
                });
                return;
            }
            if (error instanceof HarnessRagError) {
                sendJson(res, errorStatus(error.info), { error: error.info });
                return;
            }
            sendJson(res, 500, {
                error: { kind: 'internal', detail: error instanceof Error ? error.message : String(error) },
            });
        }
    };
    // The web server is optional at activation (headless profiles have none):
    // inject it so the tools keep working there, and the route appears wherever
    // a browser-facing host runs.
    const host = ctx;
    host.inject(['webServer'], (fresh) => {
        fresh.effect(() => fresh.webServer.register({ kind: 'prefix', path: KB_PROXY_ROUTE, handler }), 'harness-rag: panel proxy route');
    });
    const sessionHost = ctx;
    sessionHost.inject(['sessionController'], (fresh) => {
        conversations.controller = fresh.sessionController;
    });
    const workspaceHost = ctx;
    workspaceHost.inject(['workspaceRegistry'], (fresh) => {
        conversations.workspaces = fresh.workspaceRegistry;
    });
}
