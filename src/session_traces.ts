/** Session-following retrieval traces: the panel's projection and graph
 * overlays follow the conversation's own hrag_* calls. The workbench feeds
 * them from chat turns (graph_retrieval_trace events plus cited chunk ids);
 * the DSH host has no such stream, so the tool dispatch captures the payloads
 * it already forwards. In-memory on purpose — the panel polls this process. */

/** One retrieval hit, keyed by the chunk id the projection points carry
 * (the workbench's `pointId`). */
export interface SessionTraceHit {
  pointId: string
  score?: number
}

export interface SessionGraphTrace {
  seed_entities: string[]
  expanded_nodes: Array<{ name: string; hop: number }>
  evidence_entities: string[]
}

export interface SessionVectorOverlay {
  revision: number
  at: number
  text: string
  hits: SessionTraceHit[]
}

export interface SessionGraphOverlay {
  revision: number
  at: number
  text: string
  trace: SessionGraphTrace
}

export interface SessionTraceSnapshot {
  vector: SessionVectorOverlay | null
  graph: SessionGraphOverlay | null
}

export interface SessionTraceStore {
  /** Record a hybrid search's hits; false when the payload carried none. */
  recordVector(sessionId: string, kbId: string, text: string, results: unknown): boolean
  /** Record a graph search's three-layer trace; false when the trace was not
   * usable (an empty trace must not clear the previous overlay). */
  recordGraph(sessionId: string, kbId: string, text: string, trace: unknown): boolean
  latest(sessionId: string, kbId: string): SessionTraceSnapshot
}

const DEFAULT_MAX_KEYS = 200

function traceKey(sessionId: string, kbId: string): string {
  return sessionId + '\u0000' + kbId
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item !== '')
}

/** hybrid_search rows carry `chunk_id` + optional `score`; anything else is
 * dropped so the panel's hit matcher never sees malformed ids. */
export function sessionTraceHits(results: unknown): SessionTraceHit[] {
  if (!Array.isArray(results)) return []
  const hits: SessionTraceHit[] = []
  for (const item of results) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.chunk_id !== 'string' || row.chunk_id === '') continue
    const score = typeof row.score === 'number' && Number.isFinite(row.score) ? row.score : undefined
    hits.push(score === undefined ? { pointId: row.chunk_id } : { pointId: row.chunk_id, score })
  }
  return hits
}

/** graph_search's `trace`: seed entities, hop-annotated expanded nodes and
 * evidence entities. All three empty means "no trace" (not an empty overlay). */
export function sessionGraphTrace(trace: unknown): SessionGraphTrace | null {
  if (!trace || typeof trace !== 'object') return null
  const row = trace as Record<string, unknown>
  const seeds = strings(row.seed_entities)
  const evidence = strings(row.evidence_entities)
  const expanded: Array<{ name: string; hop: number }> = []
  if (Array.isArray(row.expanded_nodes)) {
    for (const node of row.expanded_nodes) {
      if (!node || typeof node !== 'object') continue
      const item = node as Record<string, unknown>
      if (typeof item.name !== 'string' || item.name === '') continue
      const hop = typeof item.hop === 'number' && Number.isFinite(item.hop) ? item.hop : 1
      expanded.push({ name: item.name, hop })
    }
  }
  if (seeds.length === 0 && expanded.length === 0 && evidence.length === 0) return null
  return { seed_entities: seeds, expanded_nodes: expanded, evidence_entities: evidence }
}

export function createSessionTraceStore(options: { maxKeys?: number } = {}): SessionTraceStore {
  const maxKeys = options.maxKeys ?? DEFAULT_MAX_KEYS
  const table = new Map<string, { vector: SessionVectorOverlay | null; graph: SessionGraphOverlay | null }>()
  // One counter for both channels: the panel compares revisions per channel,
  // so the graph turn after a hybrid turn still reads as newer.
  let revision = 0

  const entry = (sessionId: string, kbId: string) => {
    const key = traceKey(sessionId, kbId)
    let value = table.get(key)
    if (value) return value
    if (table.size >= maxKeys) {
      const oldest = table.keys().next().value
      if (oldest !== undefined) table.delete(oldest)
    }
    value = { vector: null, graph: null }
    table.set(key, value)
    return value
  }

  return {
    recordVector(sessionId, kbId, text, results) {
      const hits = sessionTraceHits(results)
      if (!sessionId || !kbId || hits.length === 0) return false
      entry(sessionId, kbId).vector = { revision: ++revision, at: Date.now(), text, hits }
      return true
    },
    recordGraph(sessionId, kbId, text, trace) {
      const parsed = sessionGraphTrace(trace)
      if (!sessionId || !kbId || !parsed) return false
      entry(sessionId, kbId).graph = { revision: ++revision, at: Date.now(), text, trace: parsed }
      return true
    },
    latest(sessionId, kbId) {
      const value = sessionId && kbId ? table.get(traceKey(sessionId, kbId)) : undefined
      return { vector: value?.vector ?? null, graph: value?.graph ?? null }
    },
  }
}
