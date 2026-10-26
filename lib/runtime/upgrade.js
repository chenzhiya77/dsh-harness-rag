import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isRuntimeVersion, readCurrent, sanitizeFailed, sanitizeUpgrade, writeCurrent, } from "./manifest.js";
import { runtimeDir, runtimeRoot, stateDir } from "./paths.js";
import { sanitizeService } from "./process.js";
import { forgetSupervisor, leaseHeldByOther, leaseOwner, probePortAnswer, } from "./supervisor.js";
import { RUNTIME_MANIFEST } from "./zip.js";
export class UpgradeOpError extends Error {
    kind;
    constructor(kind, detail) {
        super(detail);
        this.kind = kind;
    }
}
const upgradePath = (root) => join(stateDir(root), 'upgrade.json');
const failedPath = (root, version) => join(stateDir(root), `failed-${version}.json`);
function readJson(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    }
    catch {
        return null;
    }
}
function writeJson(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    const temp = `${path}.tmp-${process.pid}`;
    writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    renameSync(temp, path);
}
function readUpgradeRecord(root) {
    return sanitizeUpgrade(readJson(upgradePath(root)));
}
function readFailedRecord(root, version) {
    return sanitizeFailed(readJson(failedPath(root, version)));
}
function readServiceRecord(root) {
    return sanitizeService(readJson(join(stateDir(root), 'service.json')));
}
function installed(root, version) {
    return existsSync(join(runtimeDir(root, version), RUNTIME_MANIFEST));
}
function configVersionOf(root, version) {
    const raw = readJson(join(runtimeDir(root, version), RUNTIME_MANIFEST));
    const value = raw?.configVersion;
    return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}
/** Keep the current and previous versions; delete older installed runtimes.
 * Unknown names, `.tmp` leftovers and directories without a manifest stay. */
export function cleanOldVersions(root, keepVersions, log) {
    let entries;
    try {
        entries = readdirSync(runtimeRoot(root));
    }
    catch {
        return [];
    }
    const keep = new Set(keepVersions.filter(Boolean));
    const removed = [];
    for (const name of entries) {
        if (!isRuntimeVersion(name) || name.endsWith('.tmp'))
            continue;
        if (keep.has(name))
            continue;
        const dir = join(runtimeRoot(root), name);
        try {
            if (!statSync(dir).isDirectory())
                continue;
        }
        catch {
            continue;
        }
        if (!existsSync(join(dir, RUNTIME_MANIFEST)))
            continue;
        try {
            rmSync(dir, { recursive: true, force: true });
            rmSync(failedPath(root, name), { force: true });
            removed.push(name);
        }
        catch (error) {
            log?.(`could not remove runtime ${name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return removed;
}
export function createUpgradeCoordinator(options) {
    const root = options.root;
    const target = options.target;
    const now = options.now ?? (() => new Date().toISOString());
    const probePort = options.probePort ?? probePortAnswer;
    const created = new Map();
    const initialCurrent = readCurrent(root);
    let view = {
        phase: 'idle',
        adopted: false,
        runtimeVersion: initialCurrent?.runtimeVersion ?? '',
        root,
        logTail: '',
    };
    let upgrade = initialUpgrade();
    let running = null;
    let ensuring = null;
    let preparing = null;
    let abortController = null;
    let prepError;
    let prepared = target ? installed(root, target.version) : false;
    let foreignLease = false;
    let needsConfirm = false;
    let disposed = false;
    function initialUpgrade() {
        if (!target)
            return undefined;
        const record = readUpgradeRecord(root);
        if (!record || record.targetVersion !== target.version)
            return undefined;
        return {
            state: record.state,
            fromVersion: record.fromVersion,
            targetVersion: record.targetVersion,
            configVersionChanged: record.configVersion !== target.configVersion,
            requiresConfirmation: record.state === 'needs_confirmation',
            error: record.error,
        };
    }
    const status = () => ({ ...view, upgrade });
    const supervisorFor = (version) => {
        let supervisor = created.get(version);
        if (!supervisor) {
            supervisor = options.supervisorFor(version);
            created.set(version, supervisor);
        }
        return supervisor;
    };
    const publishView = (next) => {
        view = { ...next };
    };
    const removeUpgrade = () => {
        rmSync(upgradePath(root), { force: true });
    };
    /** A failure file only suppresses the target it names; when `runtime.json`
     * moves on, the old target's file is noise. */
    const removeStaleFailures = () => {
        if (!target)
            return;
        let entries;
        try {
            entries = readdirSync(stateDir(root));
        }
        catch {
            return;
        }
        for (const name of entries) {
            if (!name.startsWith('failed-') || !name.endsWith('.json'))
                continue;
            const version = name.slice('failed-'.length, -'.json'.length);
            if (version !== target.version)
                rmSync(join(stateDir(root), name), { force: true });
        }
    };
    const baseUpgrade = (fromVersion, configChanged, confirm) => ({
        state: 'pending',
        fromVersion,
        targetVersion: target?.version ?? '',
        configVersionChanged: configChanged,
        requiresConfirmation: confirm,
    });
    const persist = (fromVersion, state, error) => {
        if (!target)
            return;
        const existing = readUpgradeRecord(root);
        const record = {
            version: 1,
            targetVersion: target.version,
            fromVersion,
            configVersion: target.configVersion,
            state,
            requestedAt: existing?.targetVersion === target.version ? existing.requestedAt : now(),
            updatedAt: now(),
        };
        if (existing?.targetVersion === target.version && existing.confirmedConfigVersion !== undefined) {
            record.confirmedConfigVersion = existing.confirmedConfigVersion;
        }
        if (error)
            record.error = error;
        writeJson(upgradePath(root), record);
    };
    /** Background provisioning for a healthy old service: the old stack keeps
     * answering while the next version's pack lands. */
    const startPrepare = (fromVersion, configChanged, confirm) => {
        if (!target || prepared || preparing || prepError)
            return;
        const base = baseUpgrade(fromVersion, configChanged, confirm);
        const controller = new AbortController();
        abortController = controller;
        preparing = (async () => {
            const outcome = await options.provision(target.version, {
                signal: controller.signal,
                background: true,
                onProgress: (progress) => {
                    upgrade = { ...(upgrade ?? base), progress };
                },
            });
            if (outcome.kind !== 'ok') {
                if (outcome.kind === 'failed' && outcome.code === 'provision_held') {
                    // Another host is preparing: keep the old stack and retry later
                    // instead of latching a failure for this activation.
                    upgrade = { ...base, state: 'pending' };
                    persist(fromVersion, 'pending');
                    return;
                }
                prepError = {
                    phase: 'prepare',
                    code: outcome.kind === 'aborted' ? 'aborted' : outcome.code,
                    detail: outcome.kind === 'aborted' ? undefined : outcome.detail,
                };
                upgrade = { ...base, state: 'blocked', error: prepError };
                persist(fromVersion, 'blocked', prepError);
                return;
            }
            prepared = true;
            const state = foreignLease ? 'blocked' : confirm ? 'needs_confirmation' : 'ready';
            const error = foreignLease
                ? { phase: 'lease', code: 'upgrade_blocked_by_instance' }
                : undefined;
            upgrade = { ...base, state, error };
            persist(fromVersion, state, error);
        })()
            .catch((error) => {
            prepError = {
                phase: 'prepare',
                code: 'provision_failed',
                detail: error instanceof Error ? error.message : String(error),
            };
            upgrade = { ...base, state: 'blocked', error: prepError };
            persist(fromVersion, 'blocked', prepError);
        })
            .finally(() => {
            preparing = null;
            if (abortController === controller)
                abortController = null;
        });
    };
    /** Switch to the prepared target with the shared 90 s budget. Success moves
     * `current.json`; failure records `failed-<target>.json` and rolls back. */
    const switchTo = async (targetSupervisor, fromVersion) => {
        if (!target)
            return status();
        const targetView = await targetSupervisor.ensure({ readyTimeoutMs: 90_000 });
        if (targetView.phase === 'ready') {
            if (fromVersion) {
                writeCurrent(root, { runtimeVersion: target.version, previousVersion: fromVersion }, now);
            }
            rmSync(failedPath(root, target.version), { force: true });
            removeUpgrade();
            cleanOldVersions(root, [target.version, fromVersion], options.log);
            return { ...targetView, previousVersion: fromVersion || targetView.previousVersion };
        }
        const error = targetView.error ?? { phase: 'switch', code: 'switch_failed' };
        const failed = {
            version: 1,
            runtimeVersion: target.version,
            fromVersion,
            failedAt: now(),
            error,
            rolledBack: false,
        };
        writeJson(failedPath(root, target.version), failed);
        removeUpgrade();
        targetSupervisor.dispose();
        if (!fromVersion) {
            return {
                ...targetView,
                upgrade: {
                    state: 'failed',
                    fromVersion,
                    targetVersion: target.version,
                    configVersionChanged: false,
                    requiresConfirmation: false,
                    error,
                },
            };
        }
        const old = supervisorFor(fromVersion);
        running = old;
        const oldView = await old.ensure();
        if (oldView.phase === 'ready') {
            writeJson(failedPath(root, target.version), { ...failed, rolledBack: true });
            return {
                ...oldView,
                upgrade: {
                    state: 'failed',
                    fromVersion,
                    targetVersion: target.version,
                    configVersionChanged: false,
                    requiresConfirmation: false,
                    error,
                },
            };
        }
        return {
            ...oldView,
            phase: 'error',
            error: { phase: 'switch', code: 'rollback_failed', detail: oldView.error?.code },
            upgrade: {
                state: 'failed',
                fromVersion,
                targetVersion: target.version,
                configVersionChanged: false,
                requiresConfirmation: false,
                error,
            },
        };
    };
    const run = async () => {
        if (disposed)
            return status();
        const current = readCurrent(root);
        const service = readServiceRecord(root);
        let currentVersion = current?.runtimeVersion ?? service?.runtimeVersion ?? null;
        // A healthy service is the authority on what runs (the service/current
        // write order leaves a window where current lags behind).
        if (current && service && service.runtimeVersion !== current.runtimeVersion) {
            const serviceSupervisor = supervisorFor(service.runtimeVersion);
            if (await serviceSupervisor.probe()) {
                if (installed(root, service.runtimeVersion)) {
                    writeCurrent(root, { runtimeVersion: service.runtimeVersion, previousVersion: current.runtimeVersion }, now);
                    currentVersion = service.runtimeVersion;
                }
                else {
                    running = serviceSupervisor;
                    publishView(await serviceSupervisor.ensure());
                    upgrade = {
                        state: 'blocked',
                        fromVersion: current.runtimeVersion,
                        targetVersion: service.runtimeVersion,
                        configVersionChanged: false,
                        requiresConfirmation: false,
                        error: { phase: 'current', code: 'state_version_conflict', detail: service.runtimeVersion },
                    };
                    return status();
                }
            }
        }
        if (!target) {
            if (currentVersion) {
                const old = supervisorFor(currentVersion);
                running = old;
                const healthy = await old.probe();
                publishView(healthy
                    ? await old.ensure()
                    : { phase: 'idle', adopted: false, runtimeVersion: currentVersion, root, logTail: '' });
                upgrade = {
                    state: 'blocked',
                    fromVersion: currentVersion,
                    targetVersion: currentVersion,
                    configVersionChanged: false,
                    requiresConfirmation: false,
                    error: { phase: 'prepare', code: options.targetError?.code ?? 'pack_missing', detail: options.targetError?.detail },
                };
                return status();
            }
            upgrade = undefined;
            publishView({
                phase: 'error',
                adopted: false,
                runtimeVersion: '',
                root,
                logTail: '',
                error: { phase: 'prepare', code: options.targetError?.code ?? 'pack_missing', detail: options.targetError?.detail },
            });
            return status();
        }
        const failed = readFailedRecord(root, target.version);
        removeStaleFailures();
        if (target.version === currentVersion || (!currentVersion && !failed)) {
            removeUpgrade();
            if (target.version === currentVersion)
                rmSync(failedPath(root, target.version), { force: true });
            const supervisor = supervisorFor(target.version);
            running = supervisor;
            publishView(await supervisor.ensure());
            upgrade = undefined;
            return status();
        }
        const old = currentVersion ? supervisorFor(currentVersion) : null;
        const oldHealthy = old ? Boolean(await old.probe()) : false;
        foreignLease = leaseHeldByOther(root, options.isAlive);
        const oldConfig = currentVersion ? configVersionOf(root, currentVersion) : null;
        const configChanged = oldConfig !== target.configVersion;
        const record = readUpgradeRecord(root);
        const confirmed = record?.targetVersion === target.version && record.confirmedConfigVersion === target.configVersion;
        needsConfirm = configChanged && !confirmed;
        prepared = prepared || installed(root, target.version);
        const fromVersion = currentVersion ?? failed?.fromVersion ?? '';
        const base = baseUpgrade(fromVersion, configChanged, needsConfirm);
        if (failed) {
            removeUpgrade();
            upgrade = { ...base, state: 'failed', error: failed.error };
            if (!currentVersion) {
                publishView({
                    phase: 'error',
                    adopted: false,
                    runtimeVersion: '',
                    root,
                    logTail: '',
                    error: { phase: 'switch', code: 'upgrade_failed', detail: failed.error.detail },
                });
                return status();
            }
            running = old;
            publishView(await old.ensure());
            return status();
        }
        // An answering service record with no pid and no live lease owner is an
        // orphan we cannot stop safely. Adopt it so the library keeps working,
        // but hold the upgrade for a manual stop instead of guessing a pid.
        const leaseState = leaseOwner(root, options.isAlive);
        const staleAnswer = service && currentVersion && service.runtimeVersion === currentVersion && service.pid === null &&
            !foreignLease && (leaseState === 'stale' || leaseState === 'none')
            ? await probePort(service.ports.knowledge)
            : false;
        if (staleAnswer) {
            const error = { phase: 'lease', code: 'upgrade_blocked_stale_instance', detail: currentVersion ?? '' };
            if (oldHealthy && old) {
                const adopted = await old.adopt();
                if (adopted) {
                    running = old;
                    publishView(adopted);
                }
            }
            if (!running) {
                publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' });
            }
            upgrade = { ...base, state: 'blocked', error };
            persist(fromVersion, 'blocked', error);
            return status();
        }
        if (needsConfirm) {
            options.log?.(`runtime upgrade to ${target.version} needs confirmation (config ${oldConfig ?? 'unknown'} -> ${target.configVersion})`);
        }
        if (oldHealthy) {
            // Adopt only: the decision table must never start a healthy old version
            // through ensure(), so a probe/claim race cannot spawn a second stack.
            const adopted = await old.adopt();
            if (adopted) {
                running = old;
                publishView(adopted);
                if (foreignLease) {
                    upgrade = {
                        ...base,
                        state: 'blocked',
                        error: { phase: 'lease', code: 'upgrade_blocked_by_instance', detail: currentVersion ?? '' },
                    };
                    persist(fromVersion, 'blocked', upgrade.error);
                    startPrepare(fromVersion, configChanged, needsConfirm);
                }
                else if (prepared) {
                    const state = needsConfirm ? 'needs_confirmation' : 'ready';
                    upgrade = { ...base, state };
                    persist(fromVersion, state);
                }
                else if (prepError) {
                    upgrade = { ...base, state: 'blocked', error: prepError };
                    persist(fromVersion, 'blocked', prepError);
                }
                else {
                    upgrade = { ...base, state: 'pending' };
                    persist(fromVersion, 'pending');
                    startPrepare(fromVersion, configChanged, needsConfirm);
                }
                return status();
            }
        }
        if (foreignLease) {
            upgrade = {
                ...base,
                state: 'blocked',
                error: { phase: 'lease', code: 'upgrade_blocked_by_instance', detail: currentVersion ?? '' },
            };
            persist(fromVersion, 'blocked', upgrade.error);
            publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' });
            return status();
        }
        if (needsConfirm) {
            upgrade = { ...base, state: 'needs_confirmation' };
            persist(fromVersion, 'needs_confirmation');
            publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' });
            return status();
        }
        if (!prepared && prepError) {
            upgrade = { ...base, state: 'blocked', error: prepError };
            publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' });
            return status();
        }
        if (!prepared) {
            upgrade = { ...base, state: 'pending' };
            persist(fromVersion, 'pending');
            publishView({
                phase: 'preparing',
                adopted: false,
                runtimeVersion: currentVersion ?? target.version,
                root,
                logTail: '',
            });
            const controller = new AbortController();
            abortController = controller;
            const outcome = await options.provision(target.version, {
                signal: controller.signal,
                background: false,
                onProgress: (progress) => {
                    upgrade = { ...(upgrade ?? base), progress };
                },
            });
            if (abortController === controller)
                abortController = null;
            if (outcome.kind !== 'ok') {
                prepError = {
                    phase: 'prepare',
                    code: outcome.kind === 'aborted' ? 'aborted' : outcome.code,
                    detail: outcome.kind === 'aborted' ? undefined : outcome.detail,
                };
                upgrade = { ...base, state: 'blocked', error: prepError };
                persist(fromVersion, 'blocked', prepError);
                publishView({ phase: 'idle', adopted: false, runtimeVersion: currentVersion ?? '', root, logTail: '' });
                return status();
            }
            prepared = true;
        }
        const targetSupervisor = supervisorFor(target.version);
        running = targetSupervisor;
        publishView({
            phase: 'switching',
            adopted: false,
            runtimeVersion: currentVersion ?? target.version,
            root,
            logTail: '',
        });
        const result = options.activate
            ? await options.activate(targetSupervisor, fromVersion)
            : await switchTo(targetSupervisor, fromVersion);
        publishView({ ...result, previousVersion: fromVersion || result.previousVersion });
        if (result.phase === 'ready' && result.upgrade?.state !== 'failed') {
            removeUpgrade();
            upgrade = undefined;
            prepared = true;
        }
        else {
            upgrade = result.upgrade
                ? { ...result.upgrade, configVersionChanged: configChanged, requiresConfirmation: needsConfirm }
                : { ...base, state: 'pending', error: result.error };
        }
        return status();
    };
    const ensure = () => {
        if (ensuring)
            return ensuring;
        ensuring = run().finally(() => {
            ensuring = null;
        });
        return ensuring;
    };
    // Own the target supervisor from the start so a plugin reload disposes the
    // singleton that is already running, exactly like the old bridge did.
    if (target)
        supervisorFor(target.version);
    return {
        status,
        ensure,
        retry: async () => {
            if (target)
                rmSync(failedPath(root, target.version), { force: true });
            removeUpgrade();
            upgrade = undefined;
            prepError = undefined;
            return ensure();
        },
        confirm: () => {
            if (!target)
                throw new UpgradeOpError('upgrade_state', 'no target version');
            const record = readUpgradeRecord(root);
            if (!record || record.targetVersion !== target.version || record.state !== 'needs_confirmation') {
                throw new UpgradeOpError('upgrade_state', 'no confirmation is pending');
            }
            writeJson(upgradePath(root), {
                ...record,
                confirmedConfigVersion: target.configVersion,
                updatedAt: now(),
            });
            upgrade = upgrade
                ? { ...upgrade, state: prepared ? 'ready' : 'pending', requiresConfirmation: false, error: undefined }
                : undefined;
            persist(record.fromVersion, prepared ? 'ready' : 'pending');
            return status();
        },
        dispose: (forget = false) => {
            disposed = true;
            abortController?.abort();
            abortController = null;
            for (const version of created.keys()) {
                created.get(version)?.dispose();
                if (forget)
                    forgetSupervisor(root, version);
            }
            created.clear();
            running = null;
        },
    };
}
