import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readCurrent } from "./manifest.js";
import { resolveRoot, targetRoot, validateRootCandidate, writeLocation, } from "./location.js";
import { configDir, defaultRoot, downloadsDir, logsDir, runtimeRoot, stateDir } from "./paths.js";
import { readLogTail } from "./supervisor.js";
export class RuntimeOpError extends Error {
    kind;
    constructor(kind, detail) {
        super(detail);
        this.kind = kind;
    }
}
const currentRoot = (deps) => resolveRoot({ anchorRoot: deps.anchorRoot, env: deps.env });
export function statusPayload(deps) {
    const external = deps.config.backendUrl.trim().length > 0;
    const defaulted = defaultRoot(deps.env);
    const pack = deps.pack();
    const base = {
        headless: deps.headless(),
        picker: deps.picker(),
        defaultRoot: defaulted,
        anchorRoot: deps.anchorRoot,
        version: deps.version,
        pack: pack ? { size: pack.size, unpackedSize: pack.unpackedSize } : null,
    };
    if (external) {
        return {
            ...base,
            mode: 'external',
            phase: 'external',
            root: defaulted,
            installed: false,
            paths: layoutOf(defaulted),
        };
    }
    const resolved = currentRoot(deps);
    const needsLocation = resolved.kind === 'needs_location';
    const headless = deps.headless();
    const root = resolved.kind === 'ok' ? resolved.root : defaulted;
    const managed = deps.supervisor();
    const view = managed?.status();
    const phase = needsLocation && !headless ? 'needs_location' : (view?.phase ?? 'idle');
    const payload = {
        ...base,
        mode: 'managed',
        phase,
        root,
        installed: existsSync(join(stateDir(root), 'current.json')),
        paths: layoutOf(root),
    };
    if (resolved.kind === 'ok' && resolved.warning)
        payload.warning = resolved.warning;
    if (needsLocation) {
        payload.previousRoot = resolved.previousRoot;
        payload.reason = resolved.reason;
    }
    // `version` is the version that is actually running, not the pack target.
    const current = readCurrent(root);
    if (current) {
        payload.version = current.runtimeVersion;
        if (current.previousVersion)
            payload.previousVersion = current.previousVersion;
    }
    if (view) {
        if (view.phase === 'ready')
            payload.version = view.runtimeVersion;
        if (view.previousVersion)
            payload.previousVersion = view.previousVersion;
        if (view.targetVersion)
            payload.targetVersion = view.targetVersion;
        if (view.upgrade)
            payload.upgrade = view.upgrade;
        payload.ports = view.ports;
        payload.progress = view.progress;
        payload.logTail = view.logTail || readLogTail(root) || undefined;
        if (view.error)
            payload.error = view.error;
    }
    return payload;
}
function layoutOf(root) {
    return {
        runtime: runtimeRoot(root),
        state: stateDir(root),
        config: configDir(root),
        logs: logsDir(root),
        downloads: downloadsDir(root),
    };
}
/** `runtime/configure`: validate the parent, create the root layout, anchor it,
 * and hand the new root back so the caller can start provisioning. */
export function configureRuntime(deps, body) {
    const parent = typeof body.parent === 'string' ? body.parent.trim() : '';
    if (!parent)
        throw new RuntimeOpError('path_not_absolute', 'parent is required');
    const resolved = currentRoot(deps);
    const activeRoot = resolved.kind === 'ok' ? resolved.root : defaultRoot(deps.env);
    if (existsSync(join(stateDir(activeRoot), 'current.json'))) {
        throw new RuntimeOpError('runtime_installed', 'the runtime is already installed; move it manually instead');
    }
    const pack = deps.pack();
    const candidate = validateRootCandidate({
        parent,
        anchorRoot: deps.anchorRoot,
        size: pack?.size ?? 0,
        unpackedSize: pack?.unpackedSize ?? 0,
        env: deps.env,
    });
    if (!candidate.ok)
        throw new RuntimeOpError(candidate.code, candidate.reason);
    if (candidate.needsSyncConfirm && body.confirmSync !== true) {
        throw new RuntimeOpError('sync_confirm', 'the target sits on a synced drive; confirm to continue');
    }
    const root = candidate.root;
    for (const dir of [
        root,
        downloadsDir(root),
        configDir(root),
        stateDir(root),
        join(stateDir(root), 'data'),
        join(stateDir(root), 'logs'),
        join(stateDir(root), 'qdrant'),
        join(stateDir(root), 'qdrant-snapshots'),
    ]) {
        mkdirSync(dir, { recursive: true });
    }
    writeLocation(deps.anchorRoot, root);
    deps.configureRoot(root);
    return statusPayload(deps);
}
export function pickDirectory(deps) {
    const picker = deps.picker();
    if (picker === 'none')
        return Promise.resolve({ picker, path: null, target: null });
    return deps.pick().then((path) => ({
        picker,
        path,
        target: path ? targetRoot(path) : null,
    }));
}
export function retryRuntime(deps) {
    const managed = deps.supervisor();
    if (managed)
        void managed.retry();
    return statusPayload(deps);
}
/** `runtime/upgrade`: confirm a changed-config upgrade or clear a failed one. */
export async function upgradeRuntime(deps, body) {
    const action = body.action;
    if (action !== 'confirm' && action !== 'retry') {
        throw new RuntimeOpError('bad_request', 'action must be "confirm" or "retry"');
    }
    const managed = deps.supervisor();
    if (!managed)
        throw new RuntimeOpError('upgrade_state', 'the runtime is not managed');
    if (action === 'confirm') {
        if (!managed.confirm)
            throw new RuntimeOpError('upgrade_state', 'confirmation is not available');
        try {
            managed.confirm();
        }
        catch (error) {
            const kind = typeof error === 'object' && error !== null && 'kind' in error ? String(error.kind) : '';
            if (kind)
                throw new RuntimeOpError(kind, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    else {
        await managed.retry();
    }
    return statusPayload(deps);
}
/** Panel mount: return the status and, in managed mode, make sure provisioning
 * has been asked for (headless has no settings card to wait for). */
export function ensureRuntimeFromPanel(deps) {
    const payload = statusPayload(deps);
    if (payload.mode !== 'managed')
        return payload;
    if (payload.phase === 'needs_location')
        return payload;
    const managed = deps.supervisor();
    if (managed)
        void managed.ensure();
    return payload;
}
/** `runtime/status`: the mount payload, plus the embedding probe once the
 * service actually answers (the probe fetches the service; it must not run
 * while the stack is still starting). */
export async function panelStatus(deps) {
    const payload = ensureRuntimeFromPanel(deps);
    if (payload.mode === 'managed' && payload.phase === 'ready') {
        payload.needsEmbeddingConfig = await deps.needsEmbeddingConfig();
    }
    return payload;
}
