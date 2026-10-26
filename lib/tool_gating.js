import { DISCIPLINE_SECTION, RETRIEVAL_DISCIPLINE } from "./retrieval_discipline.js";
import { buildToolDefinitions } from "./tools.js";
/** Bound sessions own the knowledge tools; unbound ones see none. The layer is
 * the calling agent scope, so a session's tools are visible to that session
 * alone and unwind with it (spec 2026-10-23 binding-tool-gating D1/D2). The
 * discipline section rides the same scope and the same transaction: tools and
 * prompt either both mount or neither does (spec 2026-10-25 rag-soul-section
 * D1/D2). */
export function createToolGating(options) {
    const definitions = buildToolDefinitions(options.config, options.bindings);
    const live = new Map();
    return {
        mountAgent(agent) {
            if (!options.bindings.get(agent.id))
                return false;
            if (live.has(agent.id))
                return false;
            const disposers = [];
            try {
                for (const definition of definitions)
                    disposers.push(agent.ctx.tools.register(definition));
                disposers.push(agent.ctx.systemPrompt.section({ ...DISCIPLINE_SECTION, text: RETRIEVAL_DISCIPLINE }));
            }
            catch (error) {
                for (const off of disposers.reverse()) {
                    try {
                        off();
                    }
                    catch {
                        /* keep unwinding the partial mount */
                    }
                }
                throw error;
            }
            live.set(agent.id, disposers);
            return true;
        },
        unmountSession(sessionId) {
            const disposers = live.get(sessionId);
            if (!disposers)
                return false;
            live.delete(sessionId);
            for (const off of disposers.reverse()) {
                try {
                    off();
                }
                catch {
                    /* one failed disposer must not strand the rest */
                }
            }
            return true;
        },
        forgetAgent(sessionId) {
            live.delete(sessionId);
        },
        mounted() {
            return [...live.keys()];
        },
    };
}
/** Wire the gating to the host: mount bound sessions as they come alive (fresh
 * and resumed), drop records when agents go away, and expose bind/unbind hooks
 * for the panel ops. */
export function registerToolGating(ctx, config, bindings) {
    const gating = createToolGating({ config, bindings });
    const host = ctx;
    let agents = null;
    const warn = (detail) => {
        host.logger?.warn(`harness-rag: ${detail}`);
    };
    const mount = (agent) => {
        if (!agent)
            return;
        try {
            gating.mountAgent(agent);
        }
        catch (error) {
            warn(`tool mount failed for ${agent.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    host.inject(['agents'], (fresh) => {
        agents = fresh.agents;
        for (const agent of fresh.agents.list())
            mount(agent);
    });
    host.on('agent/created', (payload) => mount(payload?.agent));
    host.on('agent/disposed', (payload) => {
        const sessionId = payload?.agent?.id;
        if (sessionId)
            gating.forgetAgent(sessionId);
    });
    return {
        gating,
        onBound(sessionId) {
            mount(agents?.get(sessionId));
        },
        onUnbound(sessionId) {
            gating.unmountSession(sessionId);
        },
    };
}
