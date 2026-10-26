import { randomBytes } from 'node:crypto';
import { appendFileSync, closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, statSync, writeFileSync, } from 'node:fs';
import { connect as connectNet, createServer as createNetServer } from 'node:net';
import { dirname, join } from 'node:path';
import { configDir, downloadsDir, logsDir, runtimeDir, stateDir } from "./paths.js";
import { planPorts } from "./ports.js";
import { isOwnedPath, killTree, sanitizeLease, sanitizeService, } from "./process.js";
import { seedRuntimeConfig } from "./seed.js";
import { planCurrent, readCurrent, writeCurrent } from "./manifest.js";
import { RUNTIME_MANIFEST } from "./zip.js";
const MAX_LOG_BYTES = 2 * 1024 * 1024;
const LOG_TAIL_LINES = 40;
const randomToken = () => randomBytes(24).toString('base64url');
function defaultIsAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
export function probeTcpPort(port) {
    return new Promise((resolve) => {
        const server = createNetServer();
        server.once('error', () => resolve(false));
        server.listen(port, '127.0.0.1', () => {
            server.close(() => resolve(true));
        });
    });
}
/** True when something accepts a TCP connection on the loopback port. This is
 * the opposite question from `probeTcpPort`, which asks whether the port is
 * free: an orphan check must not mistake "occupied" for "available". */
export function probePortAnswer(port, timeoutMs = 1_000) {
    return new Promise((resolve) => {
        const socket = connectNet({ host: '127.0.0.1', port });
        let settled = false;
        const finish = (value) => {
            if (settled)
                return;
            settled = true;
            socket.destroy();
            resolve(value);
        };
        socket.setTimeout(timeoutMs);
        socket.once('connect', () => finish(true));
        socket.once('timeout', () => finish(false));
        socket.once('error', () => finish(false));
    });
}
function createLogSink(path, maxBytes) {
    let size = 0;
    try {
        if (existsSync(path)) {
            size = statSync(path).size;
            if (size > maxBytes) {
                // A previous generation may already own `.1`; Windows rename does not
                // replace it, and the oversized log would otherwise survive forever.
                rmSync(`${path}.1`, { force: true });
                renameSync(path, `${path}.1`);
                size = 0;
            }
        }
    }
    catch {
        // rotation is best effort
    }
    return {
        path,
        write(chunk) {
            const bytes = Buffer.byteLength(chunk);
            try {
                if (size + bytes > maxBytes) {
                    // Rotate mid-run too: a long-lived stack writes access logs continuously,
                    // and the cap cannot wait for the next start.
                    rmSync(`${path}.1`, { force: true });
                    renameSync(path, `${path}.1`);
                    size = 0;
                }
            }
            catch {
                // rotation is best effort; keep writing to the current file
            }
            try {
                appendFileSync(path, chunk, 'utf8');
                size += bytes;
            }
            catch {
                // logging must never take the runtime down
            }
        },
    };
}
const LOG_TAIL_BYTES = 64 * 1024;
/** Read only the end of the log: a long-running stack can leave gigabytes
 * behind, and loading that whole file is what took the host down. */
function tailOf(path, lines = LOG_TAIL_LINES) {
    let fd;
    try {
        fd = openSync(path, 'r');
        const size = fstatSync(fd).size;
        const start = Math.max(0, size - LOG_TAIL_BYTES);
        const buffer = Buffer.allocUnsafe(size - start);
        readSync(fd, buffer, 0, buffer.length, start);
        const out = buffer.toString('utf8').split('\n').filter(Boolean).slice(-lines);
        return out.join('\n');
    }
    catch {
        return '';
    }
    finally {
        if (fd !== undefined)
            closeSync(fd);
    }
}
/** Only the bytes this round appended: an older run's bind error must not
 * trigger a retry. */
function readFrom(path, offset) {
    try {
        return readFileSync(path).subarray(offset).toString('utf8');
    }
    catch {
        return '';
    }
}
function sizeOf(path) {
    try {
        return statSync(path).size;
    }
    catch {
        return 0;
    }
}
/** httpx reads `NO_PROXY` entries as URL patterns, so a bracketed IPv6 entry
 * (`[::1]`) throws when the client is built — and the host's proxy overlay
 * writes exactly that form. Keep the user's entries, drop the brackets, and
 * make sure loopback stays bypassed. */
export function pythonNoProxy(env) {
    const raw = (env.no_proxy ?? env.NO_PROXY ?? '').trim();
    if (raw === '*')
        return '*';
    const entries = raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => (entry.startsWith('[') && entry.endsWith(']') ? entry.slice(1, -1) : entry));
    for (const name of ['localhost', '127.0.0.1', '::1', '0.0.0.0', '::ffff:127.0.0.1']) {
        if (!entries.includes(name))
            entries.push(name);
    }
    return entries.join(',');
}
/** Windows reports the port conflict as a numeric code; the English phrase only
 * appears on English locales. */
const BIND_FAILURE = /(os error|Errno|winerror)\s*10048|EADDRINUSE|address already in use/i;
export function createSupervisor(options) {
    const root = options.root;
    const runtimeVersion = options.runtimeVersion;
    const fetchImpl = options.fetchImpl ?? fetch;
    const now = options.now ?? (() => new Date().toISOString());
    const nowMs = options.nowMs ?? Date.now;
    const isAlive = options.isAlive ?? defaultIsAlive;
    const executablePath = options.executablePath ?? (() => null);
    const probePort = options.probePort ?? probeTcpPort;
    const readyTimeoutMs = options.readyTimeoutMs ?? 120_000;
    const probeIntervalMs = options.probeIntervalMs ?? 250;
    const disposeGraceMs = options.disposeGraceMs ?? 5_000;
    const maxLogBytes = options.maxLogBytes ?? MAX_LOG_BYTES;
    const watchdogIntervalMs = options.watchdogIntervalMs ?? 10_000;
    const watchdogMissesLimit = options.watchdogFailures ?? 2;
    const timers = options.timers ?? {
        set: (fn, ms) => setTimeout(fn, ms),
        clear: (handle) => clearTimeout(handle),
    };
    const token = options.token ?? randomToken();
    const owner = randomBytes(8).toString('hex');
    const runtime = runtimeDir(root, runtimeVersion);
    const statePath = join(stateDir(root), 'service.json');
    const leasePath = join(stateDir(root), 'lease.json');
    const logs = logsDir(root);
    let status = {
        phase: 'idle',
        adopted: false,
        runtimeVersion,
        root,
        logTail: '',
    };
    let qdrant = null;
    let engine = null;
    let startPromise = null;
    let pendingDispose = null;
    let disposed = false;
    let onReady = options.onReady;
    const setPhase = (patch) => {
        status = { ...status, ...patch };
    };
    const writeJson = (path, value) => {
        mkdirSync(dirname(path), { recursive: true });
        const temp = `${path}.tmp-${process.pid}`;
        writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        renameSync(temp, path);
    };
    const readService = () => {
        try {
            return sanitizeService(JSON.parse(readFileSync(statePath, 'utf8')));
        }
        catch {
            return null;
        }
    };
    /** What the pointer should do given the version that actually answers. */
    const currentPlan = (runningVersion) => planCurrent(readCurrent(root), runningVersion, existsSync(join(runtimeDir(root, runningVersion), RUNTIME_MANIFEST)));
    const applyCurrent = (runningVersion, plan) => {
        if (plan.kind === 'first')
            writeCurrent(root, { runtimeVersion: runningVersion }, now);
        if (plan.kind === 'rewrite') {
            writeCurrent(root, { runtimeVersion: runningVersion, previousVersion: plan.previousVersion }, now);
        }
    };
    const readLease = () => readLeaseRecord(root);
    const acquireLease = () => {
        mkdirSync(stateDir(root), { recursive: true });
        const current = readLease();
        if (current && current.owner !== owner && isAlive(current.pid))
            return 'held';
        writeJson(leasePath, { version: 1, owner, pid: process.pid, startedAt: now() });
        return 'acquired';
    };
    const releaseLease = () => {
        const current = readLease();
        if (current?.owner === owner)
            rmSync(leasePath, { force: true });
    };
    const fail = (phase, code, detail) => {
        // Set the error phase first: killing the children fires their exit callbacks,
        // and those must not re-enter fail() through the post-ready crash handler.
        setPhase({ phase: 'error', error: { phase, code, detail }, logTail: currentLogTail() });
        killChildren();
        rmSync(statePath, { force: true });
        releaseLease();
        return status;
    };
    /** A supervised child that dies after `ready` takes the whole instance down:
     * the panel flips to the error card and the retry path starts a fresh stack. */
    const crash = (role, code) => {
        if (disposed || status.phase !== 'ready')
            return;
        fail(role, `${role}_exited`, `exit ${String(code)}`);
    };
    const currentLogTail = () => [tailOf(join(logs, 'engine.log')), tailOf(join(logs, 'qdrant.log'))].filter(Boolean).join('\n').trim();
    const killChildren = () => {
        for (const child of [engine, qdrant]) {
            if (!child)
                continue;
            try {
                child.kill();
            }
            catch {
                // already gone
            }
        }
        engine = null;
        qdrant = null;
    };
    const probe = async (url, headers = {}) => {
        try {
            const response = await fetchImpl(url, {
                headers,
                signal: AbortSignal.timeout(Math.max(1_000, probeIntervalMs * 4)),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    };
    /** Adopted services are not ours: a periodic probe notices a dead instance,
     * but nothing is killed, deleted, or released. */
    let watchdog = null;
    let watchdogMisses = 0;
    const stopWatchdog = () => {
        watchdogMisses = 0;
        if (watchdog === null)
            return;
        timers.clear(watchdog);
        watchdog = null;
    };
    const failAdopted = (detail) => {
        // Not `fail()`: the record, lease, and processes belong to the other host.
        setPhase({ phase: 'error', error: { phase: 'adopted', code: 'adopted_unreachable', detail }, logTail: currentLogTail() });
        return status;
    };
    const scheduleWatchdog = () => {
        // A probe from an earlier episode can land after a retry re-adopted the
        // service; clearing first keeps exactly one timer.
        if (watchdog !== null)
            timers.clear(watchdog);
        watchdog = timers.set(() => {
            void probeAdopted();
        }, watchdogIntervalMs);
        watchdog?.unref?.();
    };
    const probeAdopted = async () => {
        watchdog = null;
        if (disposed || status.phase !== 'ready' || !status.adopted)
            return;
        const record = readService();
        const healthy = record
            ? await probe(`http://127.0.0.1:${record.ports.knowledge}/api/knowledge-bases`, {
                authorization: `Bearer ${record.token}`,
            })
            : false;
        // The probe outlives a phase change: retry or teardown may have run while
        // it was in flight.
        if (disposed || status.phase !== 'ready' || !status.adopted)
            return;
        if (healthy) {
            watchdogMisses = 0;
            scheduleWatchdog();
            return;
        }
        watchdogMisses += 1;
        if (watchdogMisses >= watchdogMissesLimit) {
            failAdopted(`${watchdogMisses} consecutive probes failed`);
            return;
        }
        scheduleWatchdog();
    };
    const waitFor = async (check, child, exited, deadline) => {
        for (;;) {
            if (disposed || !child())
                return 'exited';
            if (await check())
                return 'ready';
            if (exited())
                return 'exited';
            if (nowMs() > deadline)
                return 'timeout';
            await new Promise((resolve) => setTimeout(resolve, probeIntervalMs));
        }
    };
    const exitWatchers = new WeakMap();
    /** The offset is taken before the child starts and after the sink's rotation,
     * so `appended()` only ever returns this round's output. */
    const spawnChild = (request, logName, onExit) => {
        const sink = createLogSink(join(logs, logName), maxLogBytes);
        const offset = sizeOf(sink.path);
        const child = options.spawn(request);
        const state = { exited: false, waiters: [] };
        exitWatchers.set(child, state);
        child.onData('stdout', (chunk) => sink.write(chunk));
        child.onData('stderr', (chunk) => sink.write(chunk));
        child.onExit((code) => {
            state.exited = true;
            for (const waiter of state.waiters.splice(0))
                waiter();
            onExit(code);
        });
        return { child, appended: () => readFrom(sink.path, offset) };
    };
    /** Windows termination is asynchronous: a retry must not rebind a port the
     * previous child still holds. Resolves on exit, or after a bounded wait. */
    const whenExited = (child) => {
        if (!child)
            return Promise.resolve();
        const state = exitWatchers.get(child);
        if (!state || state.exited)
            return Promise.resolve();
        return new Promise((resolve) => {
            state.waiters.push(resolve);
            const timer = setTimeout(resolve, 3_000);
            timer.unref?.();
        });
    };
    const qdrantRequest = (ports) => ({
        command: join(runtime, 'qdrant', 'qdrant.exe'),
        args: [],
        cwd: root,
        env: {
            QDRANT__SERVICE__HOST: '127.0.0.1',
            QDRANT__SERVICE__HTTP_PORT: String(ports.qdrantHttp),
            QDRANT__SERVICE__GRPC_PORT: String(ports.qdrantGrpc),
            QDRANT__STORAGE__STORAGE_PATH: join(stateDir(root), 'qdrant'),
            QDRANT__STORAGE__SNAPSHOTS_PATH: join(stateDir(root), 'qdrant-snapshots'),
            QDRANT__TELEMETRY_DISABLED: 'true',
        },
    });
    const engineRequest = (ports, serviceToken) => ({
        command: join(runtime, 'python', 'python.exe'),
        args: [
            '-m',
            'uvicorn',
            'app.gateway.knowledge_app:app',
            '--host',
            '127.0.0.1',
            '--port',
            String(ports.knowledge),
        ],
        cwd: root,
        env: {
            DEER_FLOW_PROJECT_ROOT: root,
            DEER_FLOW_HOME: stateDir(root),
            DEER_FLOW_CONFIG_PATH: join(configDir(root), 'config.yaml'),
            DEER_FLOW_MODELS_CONFIG_PATH: join(configDir(root), 'models_config.json'),
            DEER_FLOW_RAG_CONFIG_PATH: join(configDir(root), 'rag_config.json'),
            DEER_FLOW_API_TOKEN: serviceToken,
            PYTHONPATH: [
                join(runtime, 'site-packages'),
                join(runtime, 'engine', 'backend'),
                join(runtime, 'engine', 'backend', 'packages', 'harness'),
                join(runtime, 'engine', 'backend', 'packages', 'extension-api'),
            ].join(';'),
            PYTHONUTF8: '1',
            PYTHONIOENCODING: 'utf-8',
            // The host overlays the resolved proxy policy onto every child, and its
            // bypass list carries bracketed IPv6 entries (`[::1]`) that httpx rejects
            // at client construction. Our env merges last, so hand Python a list it
            // can parse instead.
            no_proxy: pythonNoProxy(process.env),
            NO_PROXY: pythonNoProxy(process.env),
        },
    });
    /** Only a record for the expected version that answers counts. Read-only. */
    const probeService = async (expectedVersion) => {
        const record = readService();
        if (!record)
            return null;
        if (record.runtimeVersion !== expectedVersion)
            return null;
        const base = `http://127.0.0.1:${record.ports.knowledge}`;
        const healthy = await probe(`${base}/api/knowledge-bases`, { authorization: `Bearer ${record.token}` });
        return healthy ? record : null;
    };
    /** Only a record for the version this supervisor owns can be adopted; a
     * leftover from another version is left for the coordinator to classify. */
    const adopt = async (expectedVersion) => {
        const record = await probeService(expectedVersion);
        if (!record)
            return null;
        const plan = currentPlan(record.runtimeVersion);
        applyCurrent(record.runtimeVersion, plan);
        onReady?.();
        setPhase({
            phase: 'ready',
            adopted: true,
            runtimeVersion: record.runtimeVersion,
            ports: record.ports,
            progress: undefined,
            error: undefined,
            logTail: currentLogTail(),
            upgrade: plan.kind === 'conflict'
                ? {
                    state: 'blocked',
                    fromVersion: plan.previousVersion,
                    targetVersion: expectedVersion,
                    configVersionChanged: false,
                    requiresConfirmation: false,
                    error: { phase: 'current', code: 'state_version_conflict', detail: record.runtimeVersion },
                }
                : undefined,
        });
        stopWatchdog();
        scheduleWatchdog();
        return status;
    };
    /** A recorded instance that no longer answers is only killed when its pid
     * still points at an executable inside this root. */
    const cleanStale = () => {
        const record = readService();
        if (!record)
            return;
        for (const pid of [record.pid, record.qdrantPid]) {
            if (!pid)
                continue;
            if (isOwnedPath(executablePath(pid), root))
                killTree(pid);
        }
        rmSync(statePath, { force: true });
    };
    /** One attempt: Qdrant first, the engine second. Killed children are the
     * caller's business, so a retry can rebuild the round from planPorts. */
    const runRound = async (ports, deadline) => {
        let qdrantExit;
        const qdrantSpawn = spawnChild(qdrantRequest(ports), 'qdrant.log', (code) => {
            if (qdrant !== qdrantSpawn.child)
                return;
            qdrantExit = code ?? -1;
            crash('qdrant', code);
        });
        qdrant = qdrantSpawn.child;
        const qdrantReady = await waitFor(() => probe(`http://127.0.0.1:${ports.qdrantHttp}/readyz`), () => qdrant, () => qdrantExit !== undefined, deadline);
        if (qdrantReady !== 'ready') {
            return qdrantReady === 'exited'
                ? { kind: 'exited', role: 'qdrant', code: qdrantExit, log: qdrantSpawn.appended() }
                : { kind: 'timeout', role: 'qdrant' };
        }
        let engineExit;
        const engineSpawn = spawnChild(engineRequest(ports, token), 'engine.log', (code) => {
            if (engine !== engineSpawn.child)
                return;
            engineExit = code ?? -1;
            crash('engine', code);
        });
        engine = engineSpawn.child;
        const engineReady = await waitFor(() => probe(`http://127.0.0.1:${ports.knowledge}/health`).then(async (healthy) => {
            if (!healthy)
                return false;
            return probe(`http://127.0.0.1:${ports.knowledge}/api/knowledge-bases`, {
                authorization: `Bearer ${token}`,
            });
        }), () => engine, () => engineExit !== undefined, deadline);
        if (engineReady !== 'ready') {
            return engineReady === 'exited'
                ? { kind: 'exited', role: 'engine', code: engineExit, log: engineSpawn.appended() }
                : { kind: 'timeout', role: 'engine' };
        }
        return { kind: 'ready' };
    };
    const start = async (budgetMs) => {
        stopWatchdog();
        setPhase({ phase: 'preparing', adopted: false, error: undefined, logTail: '' });
        if (options.ensureRuntime) {
            const outcome = await options.ensureRuntime({
                signal: new AbortController().signal,
                onProgress: (progress) => setPhase({ progress }),
            });
            if (outcome.kind === 'aborted')
                return fail('prepare', 'aborted');
            if (outcome.kind === 'failed')
                return fail('prepare', outcome.code, outcome.detail);
        }
        mkdirSync(logs, { recursive: true });
        mkdirSync(downloadsDir(root), { recursive: true });
        mkdirSync(join(stateDir(root), 'data'), { recursive: true });
        mkdirSync(join(stateDir(root), 'qdrant'), { recursive: true });
        mkdirSync(join(stateDir(root), 'qdrant-snapshots'), { recursive: true });
        setPhase({ phase: 'starting' });
        if (acquireLease() === 'held')
            return fail('lease', 'lease_held');
        cleanStale();
        let preferred = options.preferredPorts;
        let retried = false;
        // One deadline for Qdrant + knowledge: a slow first role cannot borrow a
        // fresh budget for the second.
        const deadline = nowMs() + budgetMs;
        for (;;) {
            const planned = await planPorts({
                preferred,
                isFree: (port) => probePort(port),
            });
            if (!planned.ok)
                return fail('ports', planned.code, planned.role);
            const ports = planned.ports;
            setPhase({ ports });
            const seeded = seedRuntimeConfig({
                root,
                engineRoot: join(runtime, 'engine'),
                qdrantUrl: `http://127.0.0.1:${ports.qdrantHttp}`,
            });
            if (!seeded.ok)
                return fail('seed', seeded.code, seeded.detail);
            const outcome = await runRound(ports, deadline);
            if (outcome.kind === 'ready') {
                writeJson(statePath, {
                    version: 1,
                    pid: engine?.pid ?? null,
                    qdrantPid: qdrant?.pid ?? null,
                    runtimeVersion,
                    token,
                    ports,
                    startedAt: now(),
                });
                applyCurrent(runtimeVersion, currentPlan(runtimeVersion));
                onReady?.();
                setPhase({ phase: 'ready', adopted: false, error: undefined, logTail: currentLogTail() });
                return status;
            }
            // Only a bind conflict earns the one retry: a real startup failure must
            // not double its own failure time.
            if (!retried && outcome.kind === 'exited' && BIND_FAILURE.test(outcome.log)) {
                retried = true;
                const children = [qdrant, engine];
                killChildren();
                await Promise.all(children.map((child) => whenExited(child)));
                const next = { ...ports };
                const key = outcome.role === 'qdrant' ? 'qdrantHttp' : 'knowledge';
                next[key] = ports[key] + 1;
                preferred = next;
                continue;
            }
            const suffix = retried ? ' after one retry' : '';
            return outcome.kind === 'exited'
                ? fail(outcome.role, `${outcome.role}_exited`, `exit ${String(outcome.code)}${suffix}`)
                : fail(outcome.role, `${outcome.role}_not_ready`);
        }
    };
    const ensure = async (request) => {
        disposed = false;
        if (pendingDispose !== null) {
            timers.clear(pendingDispose);
            pendingDispose = null;
        }
        if (status.phase === 'ready')
            return status;
        if (startPromise)
            return startPromise;
        const adopted = await adopt(runtimeVersion);
        if (adopted)
            return adopted;
        startPromise = start(request?.readyTimeoutMs ?? readyTimeoutMs).finally(() => {
            startPromise = null;
        });
        return startPromise;
    };
    return {
        root,
        ensure,
        probe: () => probeService(runtimeVersion),
        adopt: () => adopt(runtimeVersion),
        status: () => status,
        retry: () => {
            stopWatchdog();
            setPhase({ phase: 'idle', error: undefined });
            return ensure();
        },
        rebind: (next) => {
            onReady = next;
        },
        dispose() {
            // An adopted service is never torn down, in any phase: its record, lease,
            // and processes belong to the other host. Its watchdog keeps watching so
            // a reload cannot inherit a stale `ready`.
            if (status.adopted)
                return;
            disposed = true;
            stopWatchdog();
            const finish = () => {
                pendingDispose = null;
                killChildren();
                rmSync(statePath, { force: true });
                releaseLease();
                setPhase({ phase: 'idle', ports: undefined, progress: undefined, adopted: false });
            };
            if (disposeGraceMs <= 0) {
                finish();
                return;
            }
            pendingDispose = timers.set(finish, disposeGraceMs);
            pendingDispose?.unref?.();
        },
    };
}
export function supervisorKey(root, runtimeVersion) {
    return `__hrag_supervisor__:${root}:${runtimeVersion}`;
}
const registry = globalThis;
/** One supervisor per root and version, surviving plugin reloads. A reload
 * rebinds the ready hook first: the old package's listener is gone with it. */
export function getSupervisor(options) {
    const key = supervisorKey(options.root, options.runtimeVersion);
    const existing = registry[key];
    if (existing) {
        existing.rebind(options.onReady);
        void existing.ensure();
        return existing;
    }
    const created = createSupervisor(options);
    registry[key] = created;
    return created;
}
export function forgetSupervisor(root, runtimeVersion) {
    delete registry[supervisorKey(root, runtimeVersion)];
}
export function readLeaseRecord(root) {
    try {
        return sanitizeLease(JSON.parse(readFileSync(join(stateDir(root), 'lease.json'), 'utf8')));
    }
    catch {
        return null;
    }
}
/** Who owns the root's lease: a live other host, this process (a previous
 * supervisor for another version), a dead pid, or nobody. */
export function leaseOwner(root, isAlive = defaultIsAlive) {
    const lease = readLeaseRecord(root);
    if (!lease)
        return 'none';
    if (lease.pid === process.pid)
        return 'ours';
    return isAlive(lease.pid) ? 'foreign' : 'stale';
}
/** Another live host owns the root's lease. A lease written by this process is
 * ours (a previous supervisor for another version), so treat it as free. */
export function leaseHeldByOther(root, isAlive = defaultIsAlive) {
    return leaseOwner(root, isAlive) === 'foreign';
}
export function readLogTail(root) {
    return [tailOf(join(logsDir(root), 'engine.log')), tailOf(join(logsDir(root), 'qdrant.log'))]
        .filter(Boolean)
        .join('\n')
        .trim();
}
