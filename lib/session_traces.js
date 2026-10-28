/** Session-following retrieval traces: the panel's projection and graph
 * overlays follow the conversation's own hrag_* calls. The workbench feeds
 * them from chat turns (graph_retrieval_trace events plus cited chunk ids);
 * the DSH host has no such stream, so the tool dispatch captures the payloads
 * it already forwards. In-memory on purpose — the panel polls this process. */
const DEFAULT_MAX_KEYS = 200;
function traceKey(sessionId, kbId) {
    return sessionId + '\u0000' + kbId;
}
function strings(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === 'string' && item !== '');
}
/** hybrid_search rows carry `chunk_id` + optional `score`; anything else is
 * dropped so the panel's hit matcher never sees malformed ids. */
export function sessionTraceHits(results) {
    if (!Array.isArray(results))
        return [];
    const hits = [];
    for (const item of results) {
        if (!item || typeof item !== 'object')
            continue;
        const row = item;
        if (typeof row.chunk_id !== 'string' || row.chunk_id === '')
            continue;
        const score = typeof row.score === 'number' && Number.isFinite(row.score) ? row.score : undefined;
        hits.push(score === undefined ? { pointId: row.chunk_id } : { pointId: row.chunk_id, score });
    }
    return hits;
}
/** graph_search's `trace`: seed entities, hop-annotated expanded nodes and
 * evidence entities. All three empty means "no trace" (not an empty overlay). */
export function sessionGraphTrace(trace) {
    if (!trace || typeof trace !== 'object')
        return null;
    const row = trace;
    const seeds = strings(row.seed_entities);
    const evidence = strings(row.evidence_entities);
    const expanded = [];
    if (Array.isArray(row.expanded_nodes)) {
        for (const node of row.expanded_nodes) {
            if (!node || typeof node !== 'object')
                continue;
            const item = node;
            if (typeof item.name !== 'string' || item.name === '')
                continue;
            const hop = typeof item.hop === 'number' && Number.isFinite(item.hop) ? item.hop : 1;
            expanded.push({ name: item.name, hop });
        }
    }
    if (seeds.length === 0 && expanded.length === 0 && evidence.length === 0)
        return null;
    return { seed_entities: seeds, expanded_nodes: expanded, evidence_entities: evidence };
}
export function createSessionTraceStore(options = {}) {
    const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS;
    const table = new Map();
    // One counter for both channels: the panel compares revisions per channel,
    // so the graph turn after a hybrid turn still reads as newer.
    let revision = 0;
    const entry = (sessionId, kbId) => {
        const key = traceKey(sessionId, kbId);
        let value = table.get(key);
        if (value)
            return value;
        if (table.size >= maxKeys) {
            const oldest = table.keys().next().value;
            if (oldest !== undefined)
                table.delete(oldest);
        }
        value = { vector: null, graph: null };
        table.set(key, value);
        return value;
    };
    return {
        recordVector(sessionId, kbId, text, results) {
            const hits = sessionTraceHits(results);
            if (!sessionId || !kbId || hits.length === 0)
                return false;
            entry(sessionId, kbId).vector = { revision: ++revision, at: Date.now(), text, hits };
            return true;
        },
        recordGraph(sessionId, kbId, text, trace) {
            const parsed = sessionGraphTrace(trace);
            if (!sessionId || !kbId || !parsed)
                return false;
            entry(sessionId, kbId).graph = { revision: ++revision, at: Date.now(), text, trace: parsed };
            return true;
        },
        latest(sessionId, kbId) {
            const value = sessionId && kbId ? table.get(traceKey(sessionId, kbId)) : undefined;
            return { vector: value?.vector ?? null, graph: value?.graph ?? null };
        },
    };
}
