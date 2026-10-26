import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
const defaultFs = {
    readFileSync: (path, encoding) => readFileSync(path, encoding),
    writeFileSync: (path, data, encoding) => writeFileSync(path, data, encoding),
    renameSync: (from, to) => renameSync(from, to),
    mkdirSync: (path, options) => {
        mkdirSync(path, options);
    },
    copyFileSync: (from, to) => copyFileSync(from, to),
    existsSync: (path) => existsSync(path),
};
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
/** Keep only well-formed bindings; an unknown version or shape degrades to an
 * empty table rather than dropping the file (the next write backs it up). */
export function sanitizeBindings(raw) {
    if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.bindings))
        return {};
    const table = {};
    for (const [sessionId, value] of Object.entries(raw.bindings)) {
        if (!sessionId.trim() || !isRecord(value))
            continue;
        const kbId = typeof value.kbId === 'string' ? value.kbId.trim() : '';
        const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt.trim() : '';
        if (!kbId || !updatedAt)
            continue;
        const kbName = typeof value.kbName === 'string' ? value.kbName.trim() : '';
        table[sessionId] = kbName ? { kbId, kbName, updatedAt } : { kbId, updatedAt };
    }
    return table;
}
/** kb_id resolution order: tool argument, then the session binding. The tools
 * only exist in bound sessions (spec 2026-10-23 binding-tool-gating), so there
 * is no config-level default tier; blank values never win a tier. */
export function resolveKbId(input) {
    const arg = input.argKbId?.trim();
    if (arg)
        return { kbId: arg, source: 'arg' };
    const bound = input.sessionId ? input.bindings[input.sessionId]?.kbId.trim() : '';
    if (bound)
        return { kbId: bound, source: 'session' };
    return null;
}
/** `<home>/harness-rag/bindings.json`, home defaulting to `$DSH_HOME` or `~/.dsh`. */
export function bindingsPath(homeDir) {
    return join(homeDir, 'harness-rag', 'bindings.json');
}
export function resolveDshHome(env = process.env) {
    const configured = env.DSH_HOME?.trim();
    return configured || join(homedir(), '.dsh');
}
/** Durable session→kb bindings. Reads are synchronous against memory (tool
 * dispatch must not await I/O); writes update memory first and land through a
 * serial, atomic replace. */
export function createBindingsStore(options = {}) {
    const fs = options.fs ?? defaultFs;
    const now = options.now ?? (() => new Date().toISOString());
    const path = bindingsPath(options.homeDir ?? resolveDshHome());
    let table = {};
    let loaded = false;
    let backupPending = false;
    let writes = Promise.resolve();
    let sequence = 0;
    const writeNow = () => {
        fs.mkdirSync(dirname(path), { recursive: true });
        if (backupPending && fs.existsSync(path)) {
            fs.copyFileSync(path, `${path}.bak`);
            backupPending = false;
        }
        const payload = { version: 1, bindings: table };
        const temp = `${path}.tmp-${process.pid}-${sequence++}`;
        fs.writeFileSync(temp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
        fs.renameSync(temp, path);
    };
    const enqueue = () => {
        const run = writes.then(writeNow);
        writes = run.catch(() => { });
        return run;
    };
    return {
        path,
        loadSync() {
            if (loaded)
                return;
            loaded = true;
            let text;
            try {
                text = fs.readFileSync(path, 'utf8');
            }
            catch {
                table = {};
                return;
            }
            try {
                table = sanitizeBindings(JSON.parse(text));
            }
            catch {
                table = {};
                backupPending = true;
            }
        },
        get(sessionId) {
            return table[sessionId];
        },
        list() {
            return Object.entries(table).map(([sessionId, binding]) => ({ sessionId, ...binding }));
        },
        set(sessionId, kbId, kbName) {
            const id = kbId.trim();
            const name = kbName?.trim();
            table[sessionId] = name ? { kbId: id, kbName: name, updatedAt: now() } : { kbId: id, updatedAt: now() };
            return enqueue();
        },
        delete(sessionId) {
            if (!(sessionId in table))
                return Promise.resolve();
            delete table[sessionId];
            return enqueue();
        },
    };
}
