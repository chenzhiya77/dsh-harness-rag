import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { downloadPack, freeBytesAt } from "./download.js";
import { isUnpublished } from "./manifest.js";
import { downloadsDir, runtimeDir, runtimeRoot, stateDir } from "./paths.js";
import { RUNTIME_MANIFEST, extractPack } from "./zip.js";
const LOCK_FILE = 'provision.lock';
const LOCK_STALE_MS = 15 * 60_000;
const LOCK_WAIT_MS = 10 * 60_000;
const LOCK_POLL_MS = 500;
function defaultIsAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
function readLock(path) {
    try {
        const raw = JSON.parse(readFileSync(path, 'utf8'));
        if (!raw || raw.version !== 1)
            return null;
        if (typeof raw.owner !== 'string' || !raw.owner)
            return null;
        if (typeof raw.pid !== 'number' || !Number.isInteger(raw.pid) || raw.pid <= 0)
            return null;
        if (typeof raw.startedAt !== 'string' || !raw.startedAt)
            return null;
        return { version: 1, owner: raw.owner, pid: raw.pid, startedAt: raw.startedAt };
    }
    catch {
        return null;
    }
}
async function acquireLock(request) {
    const path = join(stateDir(request.root), LOCK_FILE);
    const manifest = join(runtimeDir(request.root, request.version), RUNTIME_MANIFEST);
    const isAlive = request.isAlive ?? defaultIsAlive;
    const nowMs = request.nowMs ?? Date.now;
    const sleep = request.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    mkdirSync(dirname(path), { recursive: true });
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const owner = randomBytes(8).toString('hex');
            const fd = openSync(path, 'wx');
            try {
                const record = {
                    version: 1,
                    owner,
                    pid: process.pid,
                    startedAt: new Date(nowMs()).toISOString(),
                };
                writeSync(fd, `${JSON.stringify(record)}\n`);
            }
            finally {
                closeSync(fd);
            }
            return {
                kind: 'owned',
                release: () => {
                    const current = readLock(path);
                    if (current?.owner === owner)
                        rmSync(path, { force: true });
                },
            };
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
            const current = readLock(path);
            const startedAt = current ? Date.parse(current.startedAt) : Number.NaN;
            const stale = !current ||
                !Number.isFinite(startedAt) ||
                nowMs() - startedAt > LOCK_STALE_MS ||
                !isAlive(current.pid);
            if (stale) {
                rmSync(path, { force: true });
                continue;
            }
            if (!request.background) {
                const deadline = nowMs() + (request.lockWaitMs ?? LOCK_WAIT_MS);
                const poll = request.lockPollMs ?? LOCK_POLL_MS;
                while (nowMs() < deadline) {
                    if (existsSync(manifest))
                        return { kind: 'reused' };
                    await sleep(poll);
                }
            }
            return { kind: 'held' };
        }
    }
    return { kind: 'held' };
}
function manifestMatches(root, request) {
    let raw;
    try {
        raw = JSON.parse(readFileSync(join(runtimeDir(root, request.version), RUNTIME_MANIFEST), 'utf8'));
    }
    catch {
        return { ok: false, detail: `${RUNTIME_MANIFEST} is missing or unreadable` };
    }
    const record = raw;
    if (record?.runtimeVersion !== request.version) {
        return { ok: false, detail: `runtimeVersion ${String(record?.runtimeVersion)} != ${request.version}` };
    }
    if (record?.configVersion !== request.pack.configVersion) {
        return { ok: false, detail: `configVersion ${String(record?.configVersion)} != ${request.pack.configVersion}` };
    }
    return { ok: true };
}
/** Download to `downloads/`, then unpack into `runtime/<version>`. Both halves
 * are resumable/idempotent, so a retry after a failure picks up where it
 * stopped and a finished runtime is never downloaded again. A cross-process
 * lock keeps two hosts from unpacking the same version at once. */
export async function ensureRuntime(request) {
    const lock = await acquireLock(request);
    if (lock.kind === 'held')
        return { kind: 'failed', code: 'provision_held' };
    if (lock.kind === 'reused') {
        const matched = manifestMatches(request.root, request);
        return matched.ok
            ? { kind: 'ok' }
            : { kind: 'failed', code: 'manifest_mismatch', detail: matched.detail };
    }
    try {
        const installed = runtimeDir(request.root, request.version);
        if (existsSync(join(installed, RUNTIME_MANIFEST))) {
            const matched = manifestMatches(request.root, request);
            return matched.ok
                ? { kind: 'ok' }
                : { kind: 'failed', code: 'manifest_mismatch', detail: matched.detail };
        }
        const sourceZip = request.sourceZip?.trim() ?? '';
        if (!sourceZip && isUnpublished(request.pack))
            return { kind: 'failed', code: 'pack_missing' };
        let zipPath = sourceZip;
        if (zipPath) {
            if (!existsSync(zipPath)) {
                return { kind: 'failed', code: 'pack_missing', detail: `overridden pack not found: ${zipPath}` };
            }
            const required = Math.ceil(statSync(zipPath).size + request.pack.unpackedSize * 1.1);
            const free = (request.freeBytes ?? freeBytesAt)(request.root);
            if (free !== null && free < required) {
                return { kind: 'failed', code: 'no_space', detail: `needs ${required} bytes, ${free} available` };
            }
        }
        else {
            zipPath = join(downloadsDir(request.root), `harness-rag-runtime-${request.platform}-${request.version}.zip`);
            const downloaded = await downloadPack({
                urls: request.pack.urls,
                size: request.pack.size,
                unpackedSize: request.pack.unpackedSize,
                sha256: request.pack.sha256,
                targetPath: zipPath,
                signal: request.signal,
                onProgress: request.onProgress,
            });
            if (!downloaded.ok)
                return { kind: 'failed', code: downloaded.code, detail: downloaded.detail };
        }
        const extract = request.extract ?? extractPack;
        const extracted = await extract({
            zipPath,
            runtimeRoot: runtimeRoot(request.root),
            version: request.version,
            signal: request.signal,
            onProgress: request.onProgress,
        });
        if (!extracted.ok)
            return { kind: 'failed', code: extracted.code, detail: extracted.detail };
        const matched = manifestMatches(request.root, request);
        if (!matched.ok) {
            rmSync(installed, { recursive: true, force: true });
            return { kind: 'failed', code: 'manifest_mismatch', detail: matched.detail };
        }
        return { kind: 'ok' };
    }
    finally {
        lock.release();
    }
}
