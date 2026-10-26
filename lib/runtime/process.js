import { spawnSync } from 'node:child_process';
import { isAbsolute, relative, sep } from 'node:path';
import { isRuntimeVersion } from "./manifest.js";
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const positiveInt = (value) => typeof value === 'number' && Number.isInteger(value) && value > 0;
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
function sanitizePorts(raw) {
    if (!isRecord(raw))
        return null;
    const { qdrantHttp, qdrantGrpc, knowledge } = raw;
    if (!positiveInt(qdrantHttp) || !positiveInt(qdrantGrpc) || !positiveInt(knowledge))
        return null;
    return { qdrantHttp, qdrantGrpc, knowledge };
}
/** `state/service.json`: written once both children answer, read to adopt a
 * running instance instead of spawning a second one. */
export function sanitizeService(raw) {
    if (!isRecord(raw) || raw.version !== 1)
        return null;
    if (!isRuntimeVersion(raw.runtimeVersion))
        return null;
    if (!nonEmpty(raw.token))
        return null;
    const ports = sanitizePorts(raw.ports);
    if (!ports)
        return null;
    if (!nonEmpty(raw.startedAt))
        return null;
    const pid = raw.pid === undefined || raw.pid === null ? null : raw.pid;
    if (pid !== null && !positiveInt(pid))
        return null;
    const qdrantPid = raw.qdrantPid === undefined || raw.qdrantPid === null ? null : raw.qdrantPid;
    if (qdrantPid !== null && !positiveInt(qdrantPid))
        return null;
    return {
        version: 1,
        pid,
        qdrantPid,
        runtimeVersion: raw.runtimeVersion,
        token: raw.token,
        ports,
        startedAt: raw.startedAt,
    };
}
/** `state/lease.json`: one writer at a time. A stale lease (dead host, or one
 * whose owner released it) is taken over by the next host. */
export function sanitizeLease(raw) {
    if (!isRecord(raw) || raw.version !== 1)
        return null;
    if (!nonEmpty(raw.owner))
        return null;
    if (!positiveInt(raw.pid))
        return null;
    if (!nonEmpty(raw.startedAt))
        return null;
    return { version: 1, owner: raw.owner.trim(), pid: raw.pid, startedAt: raw.startedAt };
}
const fold = (path) => (process.platform === 'win32' ? path.toLowerCase() : path);
/** True when an executable lives inside the runtime root — the guard before any
 * kill, so a recycled pid that now belongs to something else is left alone. */
export function isOwnedPath(executablePath, root) {
    if (!executablePath)
        return false;
    const base = fold(root.endsWith(sep) ? root.slice(0, -sep.length) : root);
    const target = fold(executablePath);
    const rest = relative(base, target);
    return rest !== '' && !rest.startsWith('..') && !isAbsolute(rest);
}
/** Best-effort tree kill: `taskkill /T` on Windows (the host's process is the
 * parent, so the tree includes port-bound grandchildren). */
export function killTree(pid, options = {}) {
    const platform = options.platform ?? process.platform;
    if (platform === 'win32') {
        const run = options.run ?? defaultRun;
        return run('taskkill', ['/PID', String(pid), '/T', '/F'], process.env);
    }
    try {
        ;
        (options.signal ?? process.kill)(pid, 'SIGTERM');
        return true;
    }
    catch {
        return false;
    }
}
function defaultRun(command, args, env) {
    try {
        const result = spawnSync(command, args, { env, windowsHide: true, stdio: 'ignore' });
        return result.status === 0;
    }
    catch {
        return false;
    }
}
