import type { Binding, BindingsStore } from './bindings.ts'
import { HarnessRagError } from './http.ts'

/** The Agent preset that mounts this plugin's tool pack (presets/knowledge.patch.yml).
 * New conversations ask for it first and fall back to the host default when the
 * user has not merged that preset into their profile. */
export const KNOWLEDGE_PRESET = 'harness-rag-knowledge'

/** The slice of `ctx.sessionController` these ops use. */
export interface SessionRowLike {
  sessionId: string
  updatedAt: number
  running?: boolean
  blank?: boolean
  cwd?: string
  projections?: { values?: Record<string, unknown> }
}

export interface SessionControllerLike {
  /** The host service answers `{ items }` (its internal list helper answers a
   * bare array); accept both so the op does not depend on which layer it sees. */
  list(request?: unknown, signal?: AbortSignal): Promise<SessionRowLike[] | { items?: SessionRowLike[] }>
  create(request: { cwd?: string; agentPreset?: string }): Promise<{ sessionId: string; agentPreset?: string }>
}

/** The controller arrives with the host composition, possibly after this
 * plugin activates; the holder stays null until then. */
export interface ConversationsHost {
  controller: SessionControllerLike | null
}

export interface ConversationRow {
  sessionId: string
  title: string | null
  updatedAt: number
  running: boolean
  blank: boolean
  cwd?: string
  kbId: string | null
  kbName?: string
}

function bindingMap(store: BindingsStore): Record<string, Binding> {
  const map: Record<string, Binding> = {}
  for (const row of store.list()) {
    map[row.sessionId] = { kbId: row.kbId, ...(row.kbName ? { kbName: row.kbName } : {}), updatedAt: row.updatedAt }
  }
  return map
}

/** Sessions the drawer lists: every bound session plus the one this panel
 * belongs to (with `kbId: null` when it is not bound yet). */
export function mergeRows(
  rows: SessionRowLike[],
  bindings: Record<string, Binding>,
  currentSessionId?: string,
): ConversationRow[] {
  const merged: ConversationRow[] = []
  for (const row of rows) {
    const binding = bindings[row.sessionId]
    if (!binding && row.sessionId !== currentSessionId) continue
    const title = row.projections?.values?.title
    merged.push({
      sessionId: row.sessionId,
      title: typeof title === 'string' && title.trim() ? title : null,
      updatedAt: row.updatedAt,
      running: row.running === true,
      blank: row.blank === true,
      ...(typeof row.cwd === 'string' && row.cwd ? { cwd: row.cwd } : {}),
      kbId: binding?.kbId ?? null,
      ...(binding?.kbName ? { kbName: binding.kbName } : {}),
    })
  }
  merged.sort((left, right) => right.updatedAt - left.updatedAt)
  return merged
}

/** Create one session under the requested preset, falling back to the host
 * default when that preset is not part of the user's composition. */
export async function createSession(
  controller: SessionControllerLike,
  request: { cwd?: string; agentPreset?: string },
): Promise<{ sessionId: string; agentPreset?: string }> {
  try {
    return await controller.create(request)
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code
    if (typeof code === 'string' && code.startsWith('agent-preset/') && request.agentPreset !== undefined) {
      return await controller.create(request.cwd === undefined ? {} : { cwd: request.cwd })
    }
    throw error
  }
}

const optionalString = (args: unknown, key: string): string | undefined => {
  const value = (args as Record<string, unknown> | null | undefined)?.[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

const requireString = (args: unknown, key: string): string => {
  const value = optionalString(args, key)
  if (!value) throw new HarnessRagError({ kind: 'http', status: 400, detail: `panel op requires "${key}"` })
  return value
}

export interface ConversationOpsDeps {
  host: ConversationsHost
  bindings: BindingsStore
  /** Preset for new conversations; absent when the composition has none. */
  agentPreset?: string
}

/** Panel ops for the conversation drawer. Only `create` and `list` need the
 * controller; `bind`/`unbind` write the local table and always work. */
export function conversationOps(deps: ConversationOpsDeps): Record<string, (args: unknown) => Promise<unknown>> {
  const controller = (): SessionControllerLike => {
    const current = deps.host.controller
    if (!current) {
      throw new HarnessRagError({
        kind: 'http',
        status: 503,
        detail: 'the session controller is unavailable in this host',
      })
    }
    return current
  }

  return {
    'conversations/list': async (args) => {
      const currentSessionId = optionalString(args, 'currentSessionId')
      if (!deps.host.controller) return { ready: false, items: [] }
      const result = await deps.host.controller.list()
      const rows = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : []
      return { ready: true, items: mergeRows(rows, bindingMap(deps.bindings), currentSessionId) }
    },
    'conversations/create': async (args) => {
      const kbId = requireString(args, 'kbId')
      const kbName = optionalString(args, 'kbName')
      const cwd = optionalString(args, 'cwd')
      const created = await createSession(controller(), {
        ...(cwd === undefined ? {} : { cwd }),
        ...(deps.agentPreset === undefined ? {} : { agentPreset: deps.agentPreset }),
      })
      await deps.bindings.set(created.sessionId, kbId, kbName)
      return created
    },
    'conversations/bind': async (args) => {
      const sessionId = requireString(args, 'sessionId')
      const kbId = requireString(args, 'kbId')
      await deps.bindings.set(sessionId, kbId, optionalString(args, 'kbName'))
      return { sessionId, kbId }
    },
    'conversations/unbind': async (args) => {
      const sessionId = requireString(args, 'sessionId')
      await deps.bindings.delete(sessionId)
      return { sessionId }
    },
  }
}
