import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEffectiveConfig } from "./config.js";
import { loadPack } from "./manifest.js";
import { statusPayload } from "./ops.js";
import { defaultRoot, stateDir } from "./paths.js";
import { resolveRoot } from "./location.js";
import { ensureRuntime } from "./provision.js";
import { createHostSpawn } from "./spawn.js";
import { getSupervisor } from "./supervisor.js";
import { createUpgradeCoordinator } from "./upgrade.js";
import { sanitizeService } from "./process.js";
const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
/** `/api/rag/config` reports the effective values under `config`; a blank or
 * absent model means the seed still needs one. */
export function embeddingModelOf(payload) {
    const record = payload;
    const value = record?.config?.embedding_model;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
/** A model is mandatory and has no default: a provider key in the environment
 * cannot stand in for it. */
export function needsEmbeddingFrom(payload) {
    return !embeddingModelOf(payload);
}
function readService(root) {
    try {
        return sanitizeService(JSON.parse(readFileSync(join(stateDir(root), 'service.json'), 'utf8')));
    }
    catch {
        return null;
    }
}
/** Managed mode wiring: resolve the root, own the supervisor singleton, and
 * expose the raw config through getters that follow the running instance. */
export function createRuntimeBridge(host, raw, env = process.env) {
    const platform = `${process.platform}-${process.arch}`;
    // Dev-only override (spec §4.4): a locally built zip replaces the download.
    const sourceZip = env.DSH_HARNESS_RAG_PACK?.trim() ? resolve(env.DSH_HARNESS_RAG_PACK.trim()) : undefined;
    const selection = loadPack({
        packageRoot: PACKAGE_ROOT,
        platform,
        allowUnpublished: Boolean(sourceZip),
    });
    const pack = selection.ok ? selection.pack : null;
    const target = selection.ok
        ? {
            version: selection.pack.runtimeVersion,
            pack: selection.pack,
            configVersion: selection.pack.configVersion,
        }
        : null;
    const targetError = selection.ok ? undefined : { code: selection.code };
    const version = pack?.runtimeVersion ?? '';
    const anchorRoot = defaultRoot(env);
    let root = (() => {
        const resolved = resolveRoot({ anchorRoot, env });
        return resolved.kind === 'ok' ? resolved.root : defaultRoot(env);
    })();
    let coordinator = null;
    let pickerService = null;
    let pickController = null;
    const readyListeners = [];
    host.inject(['directoryPicker'], (fresh) => {
        pickerService = fresh.directoryPicker ?? null;
    });
    const pickerKind = () => {
        const capability = pickerService?.capability?.();
        return capability?.kind === 'native' || capability?.kind === 'browse' ? capability.kind : 'none';
    };
    const headless = () => host.get('webServer') === undefined;
    const supervisorFor = (subprocess, runtimeVersion) => getSupervisor({
        root,
        runtimeVersion,
        spawn: createHostSpawn(subprocess),
        // Only the target pack is provisionable; an old version must already be
        // installed, so its supervisor starts from disk without a download.
        ensureRuntime: pack && runtimeVersion === pack.runtimeVersion
            ? (hooks) => ensureRuntime({
                root,
                version: runtimeVersion,
                platform,
                pack,
                sourceZip,
                signal: hooks.signal,
                onProgress: hooks.onProgress,
            })
            : undefined,
        onReady: () => {
            for (const listener of readyListeners)
                void listener.syncNow({ force: true });
        },
    });
    const currentCoordinator = () => {
        if (coordinator)
            return coordinator;
        const subprocess = host.get('subprocess');
        if (!subprocess)
            return null;
        coordinator = createUpgradeCoordinator({
            root,
            target,
            targetError,
            headless: headless(),
            supervisorFor: (runtimeVersion) => supervisorFor(subprocess, runtimeVersion),
            provision: (_runtimeVersion, hooks) => pack
                ? ensureRuntime({
                    root,
                    version: pack.runtimeVersion,
                    platform,
                    pack,
                    sourceZip,
                    background: hooks.background,
                    signal: hooks.signal,
                    onProgress: hooks.onProgress,
                })
                : Promise.resolve({ kind: 'failed', code: 'pack_missing' }),
            log: (message) => console.log(`[harness-rag] ${message}`),
        });
        return coordinator;
    };
    const deps = {
        config: raw,
        anchorRoot,
        env,
        headless,
        picker: pickerKind,
        pick: async () => {
            const capability = pickerService?.capability?.();
            if (!capability?.pick)
                return null;
            // The host's native chooser reads the caller-lifetime signal on entry
            // (win32 dialog driver) and closes the dialog when it aborts.
            pickController?.abort();
            const controller = new AbortController();
            pickController = controller;
            try {
                return await capability.pick(controller.signal);
            }
            catch (error) {
                if (controller.signal.aborted)
                    return null;
                throw error;
            }
            finally {
                if (pickController === controller)
                    pickController = null;
            }
        },
        supervisor: () => currentCoordinator(),
        version,
        pack: () => (pack ? { size: pack.size, unpackedSize: pack.unpackedSize } : null),
        needsEmbeddingConfig: async () => {
            const view = currentCoordinator()?.status();
            if (view?.phase !== 'ready')
                return false;
            const record = readService(root);
            if (!record)
                return false;
            try {
                const response = await fetch(`http://127.0.0.1:${record.ports.knowledge}/api/rag/config`, {
                    headers: { authorization: `Bearer ${record.token}` },
                });
                if (!response.ok)
                    return false;
                return needsEmbeddingFrom(await response.json());
            }
            catch {
                return false;
            }
        },
        configureRoot: (nextRoot) => {
            // The old root's service is ours: stop it, and drop every supervisor the
            // coordinator created so a later move back starts clean.
            coordinator?.dispose(true);
            coordinator = null;
            root = nextRoot;
        },
    };
    const effective = createEffectiveConfig(raw, {
        mode: raw.backendUrl.trim() ? 'external' : 'managed',
        backendUrl: () => {
            const record = readService(root);
            return record ? `http://127.0.0.1:${record.ports.knowledge}` : null;
        },
        apiToken: () => readService(root)?.token ?? '',
        phase: () => statusPayload(deps).phase,
    });
    // Headless has no panel to confirm the first run: after a short grace for a
    // late web server, provision with the default root on its own.
    const grace = setTimeout(() => {
        if (headless())
            void currentCoordinator()?.ensure();
    }, 2_000);
    grace.unref?.();
    return {
        effective,
        ops: deps,
        addReadyListener: (listener) => {
            readyListeners.push(listener);
        },
        stop: () => {
            clearTimeout(grace);
            // An open native chooser belongs to this plugin instance; unload closes it.
            pickController?.abort();
            // The singleton stays registered so a reload within the grace period
            // takes it over (cancelling the pending kill) instead of rebuilding it.
            coordinator?.dispose();
        },
    };
}
