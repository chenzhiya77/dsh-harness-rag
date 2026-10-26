import type { Context } from '@deepseek-ai/cordis'
import type { BindingsStore } from './bindings.ts'
import type { Config } from './settings.ts'
import { DISCIPLINE_SECTION, RETRIEVAL_DISCIPLINE } from './retrieval_discipline.ts'
import { buildToolDefinitions } from './tools.ts'

/** The slice of a live agent this module touches: its identity and the scoped
 * tool and prompt registries. Structural on purpose so tests and hosts can
 * fake it. */
export interface GatingAgent {
  readonly id: string
  readonly ctx: {
    tools: { register(definition: unknown): () => void }
    systemPrompt: { section(section: { name: string; order: number; text: string }): () => void }
  }
}

export interface ToolGating {
  /** Mount one bound agent: the six knowledge tools plus the retrieval
   * discipline section, both in that agent's scope. True when this call
   * mounted them (bound agents only, once per agent). */
  mountAgent(agent: GatingAgent): boolean
  /** Run the disposers and drop the record; true when the session was mounted. */
  unmountSession(sessionId: string): boolean
  /** Drop the record without disposing — the agent scope already unwound. */
  forgetAgent(sessionId: string): void
  mounted(): string[]
}

/** Bound sessions own the knowledge tools; unbound ones see none. The layer is
 * the calling agent scope, so a session's tools are visible to that session
 * alone and unwind with it (spec 2026-10-23 binding-tool-gating D1/D2). The
 * discipline section rides the same scope and the same transaction: tools and
 * prompt either both mount or neither does (spec 2026-10-25 rag-soul-section
 * D1/D2). */
export function createToolGating(options: { config: Config; bindings: BindingsStore }): ToolGating {
  const definitions = buildToolDefinitions(options.config, options.bindings)
  const live = new Map<string, Array<() => void>>()
  return {
    mountAgent(agent) {
      if (!options.bindings.get(agent.id)) return false
      if (live.has(agent.id)) return false
      const disposers: Array<() => void> = []
      try {
        for (const definition of definitions) disposers.push(agent.ctx.tools.register(definition))
        disposers.push(agent.ctx.systemPrompt.section({ ...DISCIPLINE_SECTION, text: RETRIEVAL_DISCIPLINE }))
      } catch (error) {
        for (const off of disposers.reverse()) {
          try {
            off()
          } catch {
            /* keep unwinding the partial mount */
          }
        }
        throw error
      }
      live.set(agent.id, disposers)
      return true
    },
    unmountSession(sessionId) {
      const disposers = live.get(sessionId)
      if (!disposers) return false
      live.delete(sessionId)
      for (const off of disposers.reverse()) {
        try {
          off()
        } catch {
          /* one failed disposer must not strand the rest */
        }
      }
      return true
    },
    forgetAgent(sessionId) {
      live.delete(sessionId)
    },
    mounted() {
      return [...live.keys()]
    },
  }
}

interface AgentsLike {
  get(id: string): GatingAgent | undefined
  list(): GatingAgent[]
}

/** Host seams used by the wiring; kept structural so headless compositions and
 * tests can stand in. */
interface GatingHostContext {
  inject(dependencies: string[], callback: (fresh: { agents: AgentsLike }) => void): void
  on(event: string, listener: (payload: unknown) => void): unknown
  logger?: { warn(message: string): void }
}

export interface ToolGatingHandle {
  gating: ToolGating
  onBound(sessionId: string): void
  onUnbound(sessionId: string): void
}

/** Wire the gating to the host: mount bound sessions as they come alive (fresh
 * and resumed), drop records when agents go away, and expose bind/unbind hooks
 * for the panel ops. */
export function registerToolGating(ctx: Context, config: Config, bindings: BindingsStore): ToolGatingHandle {
  const gating = createToolGating({ config, bindings })
  const host = ctx as unknown as GatingHostContext
  let agents: AgentsLike | null = null
  const warn = (detail: string): void => {
    host.logger?.warn(`harness-rag: ${detail}`)
  }
  const mount = (agent: GatingAgent | undefined): void => {
    if (!agent) return
    try {
      gating.mountAgent(agent)
    } catch (error) {
      warn(`tool mount failed for ${agent.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  host.inject(['agents'], (fresh) => {
    agents = fresh.agents
    for (const agent of fresh.agents.list()) mount(agent)
  })
  host.on('agent/created', (payload) => mount((payload as { agent?: GatingAgent } | null)?.agent))
  host.on('agent/disposed', (payload) => {
    const sessionId = (payload as { agent?: { id?: string } } | null)?.agent?.id
    if (sessionId) gating.forgetAgent(sessionId)
  })
  return {
    gating,
    onBound(sessionId) {
      mount(agents?.get(sessionId))
    },
    onUnbound(sessionId) {
      gating.unmountSession(sessionId)
    },
  }
}
