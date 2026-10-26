import { HarnessRagError } from "./http.js";
function bindingMap(store) {
    const map = {};
    for (const row of store.list()) {
        map[row.sessionId] = { kbId: row.kbId, ...(row.kbName ? { kbName: row.kbName } : {}), updatedAt: row.updatedAt };
    }
    return map;
}
/** Sessions the drawer lists: every bound session plus the one this panel
 * belongs to (with `kbId: null` when it is not bound yet). */
export function mergeRows(rows, bindings, currentSessionId) {
    const merged = [];
    for (const row of rows) {
        const binding = bindings[row.sessionId];
        if (!binding && row.sessionId !== currentSessionId)
            continue;
        const title = row.projections?.values?.title;
        merged.push({
            sessionId: row.sessionId,
            title: typeof title === 'string' && title.trim() ? title : null,
            updatedAt: row.updatedAt,
            running: row.running === true,
            blank: row.blank === true,
            ...(typeof row.cwd === 'string' && row.cwd ? { cwd: row.cwd } : {}),
            kbId: binding?.kbId ?? null,
            ...(binding?.kbName ? { kbName: binding.kbName } : {}),
        });
    }
    merged.sort((left, right) => right.updatedAt - left.updatedAt);
    return merged;
}
/** Create one session under the requested preset, falling back to the host
 * default when that preset is not part of the user's composition. */
export async function createSession(controller, request) {
    try {
        return await controller.create(request);
    }
    catch (error) {
        const code = error?.code;
        if (typeof code === 'string' && code.startsWith('agent-preset/') && request.agentPreset !== undefined) {
            return await controller.create({
                ...(request.workspaceId === undefined ? {} : { workspaceId: request.workspaceId }),
                ...(request.cwd === undefined ? {} : { cwd: request.cwd }),
            });
        }
        throw error;
    }
}
/** The workspace owning this directory, if any. `resolveByPath` rejects for a
 * path that no longer resolves; the caller keeps the plain-cwd fallback. */
async function workspaceIdForCwd(registry, cwd) {
    if (!registry || cwd === undefined)
        return undefined;
    try {
        const workspace = await registry.resolveByPath(cwd);
        return workspace === undefined ? undefined : String(workspace.id);
    }
    catch {
        return undefined;
    }
}
const optionalString = (args, key) => {
    const value = args?.[key];
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
};
const requireString = (args, key) => {
    const value = optionalString(args, key);
    if (!value)
        throw new HarnessRagError({ kind: 'http', status: 400, detail: `panel op requires "${key}"` });
    return value;
};
/** Panel ops for the conversation drawer. Only `create` and `list` need the
 * controller; `bind`/`unbind` write the local table and always work. */
export function conversationOps(deps) {
    const controller = () => {
        const current = deps.host.controller;
        if (!current) {
            throw new HarnessRagError({
                kind: 'http',
                status: 503,
                detail: 'the session controller is unavailable in this host',
            });
        }
        return current;
    };
    return {
        'conversations/list': async (args) => {
            const currentSessionId = optionalString(args, 'currentSessionId');
            if (!deps.host.controller)
                return { ready: false, items: [] };
            const result = await deps.host.controller.list();
            const rows = Array.isArray(result) ? result : Array.isArray(result?.items) ? result.items : [];
            return { ready: true, items: mergeRows(rows, bindingMap(deps.bindings), currentSessionId) };
        },
        'conversations/create': async (args) => {
            const kbId = requireString(args, 'kbId');
            const kbName = optionalString(args, 'kbName');
            const cwd = optionalString(args, 'cwd');
            // No agent preset on purpose: the knowledge tools mount per binding
            // (spec 2026-10-23 binding-tool-gating D5), so the session starts on the
            // host default and gains `hrag_*` once this binding lands.
            // Create through the workspace when one owns this directory: a session
            // that is not a member leaves the chat UI on the workspace draft, and the
            // first message would then land in a different session id.
            const workspaceId = await workspaceIdForCwd(deps.host.workspaces, cwd);
            const created = await createSession(controller(), workspaceId === undefined
                ? { ...(cwd === undefined ? {} : { cwd }) }
                : { workspaceId });
            await deps.bindings.set(created.sessionId, kbId, kbName);
            deps.gating?.onBound(created.sessionId);
            return created;
        },
        'conversations/bind': async (args) => {
            const sessionId = requireString(args, 'sessionId');
            const kbId = requireString(args, 'kbId');
            await deps.bindings.set(sessionId, kbId, optionalString(args, 'kbName'));
            deps.gating?.onBound(sessionId);
            return { sessionId, kbId };
        },
        'conversations/unbind': async (args) => {
            const sessionId = requireString(args, 'sessionId');
            await deps.bindings.delete(sessionId);
            deps.gating?.onUnbound(sessionId);
            return { sessionId };
        },
    };
}
