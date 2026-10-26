/**
 * Publish host model aliases into the knowledge service's UI-managed model
 * catalog. Each alias carries only the local proxy address and token; provider
 * endpoints, keys and thinking dialects stay inside the host.
 */
import { api } from "./http.js";
export class ModelSyncError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
const EFFORT_ORDER = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const MANAGED_PREFIX = 'dsh:';
function mappedEffort(value) {
    if (value === undefined)
        return undefined;
    return EFFORT_ORDER.includes(value) ? value : undefined;
}
export function publishEfforts(efforts) {
    const present = new Set();
    for (const effort of efforts) {
        const mapped = mappedEffort(effort);
        if (mapped !== undefined)
            present.add(mapped);
    }
    return EFFORT_ORDER.filter((level) => present.has(level));
}
export function toEngineEntry(model, runtime) {
    const efforts = publishEfforts(model.efforts);
    // "Thinking off" is not the lowest thinking level: some providers reject
    // `minimal` outright (measured on xiaomi), while the host's own `off` works.
    // The engine sends this declared shape verbatim, so `off` may leave the
    // published subset.
    const disableEffort = model.efforts.includes('off') ? 'off' : efforts[0];
    return {
        provider: 'openai-compatible',
        name: model.alias,
        model: model.alias,
        display_name: `${model.name} · ${model.provider}`,
        ...(model.description ? { description: model.description } : {}),
        endpoint: runtime.baseUrl,
        api_key: runtime.token || 'local-proxy',
        supports_thinking: efforts.length > 0,
        supports_vision: model.inputModalities?.includes('image') ?? false,
        supports_reasoning_effort: efforts.length > 0,
        use_responses_api: false,
        ...(efforts.length > 0
            ? {
                supported_reasoning_efforts: efforts,
                when_thinking_disabled: { reasoning_effort: disableEffort },
            }
            : {}),
        // Thinking on sends no level: "follow" means DSH applies its own default at
        // call time, so this entry carries no reasoning_effort.
        ...(model.contextWindow ? { context_window: model.contextWindow } : {}),
        ...(model.maxTokens ? { max_tokens: model.maxTokens } : {}),
    };
}
export function collectPublishedModels(catalog, runtime) {
    return catalog.models.map((model) => toEngineEntry(model, runtime));
}
function manualInput(entry) {
    if (!entry.provider) {
        throw new ModelSyncError('manual_entry_unrepresentable', `UI-managed model "${entry.name}" has no allowlisted provider.`);
    }
    return {
        provider: entry.provider,
        name: entry.name,
        model: entry.model,
        supports_thinking: entry.supports_thinking ?? false,
        supports_vision: entry.supports_vision ?? false,
        supports_reasoning_effort: entry.supports_reasoning_effort ?? false,
        ...(entry.endpoint ? { endpoint: entry.endpoint } : {}),
        ...(entry.display_name ? { display_name: entry.display_name } : {}),
        ...(entry.description ? { description: entry.description } : {}),
        ...(entry.supported_context_windows ? { supported_context_windows: entry.supported_context_windows } : {}),
        ...(entry.supported_reasoning_efforts ? { supported_reasoning_efforts: entry.supported_reasoning_efforts } : {}),
        ...(entry.reasoning_effort ? { reasoning_effort: entry.reasoning_effort } : {}),
        ...(entry.context_window ? { context_window: entry.context_window } : {}),
        ...(entry.max_tokens ? { max_tokens: entry.max_tokens } : {}),
        ...(entry.use_responses_api !== undefined && entry.use_responses_api !== null
            ? { use_responses_api: entry.use_responses_api }
            : {}),
        ...(entry.when_thinking_enabled ? { when_thinking_enabled: entry.when_thinking_enabled } : {}),
        ...(entry.when_thinking_disabled ? { when_thinking_disabled: entry.when_thinking_disabled } : {}),
        ...(entry.default_headers ? { default_headers: entry.default_headers } : {}),
    };
}
function comparable(entry) {
    const { api_key: _apiKey, ...rest } = entry;
    return rest;
}
function canonical(value) {
    if (Array.isArray(value))
        return value.map(canonical);
    if (value !== null && typeof value === 'object') {
        const source = value;
        const out = {};
        for (const key of Object.keys(source).sort()) {
            if (source[key] !== undefined)
                out[key] = canonical(source[key]);
        }
        return out;
    }
    return value;
}
function sameJson(left, right) {
    return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}
export function mergeModels(view, published) {
    const uiEntries = view.models.filter((entry) => entry.source === 'ui');
    const previousManaged = uiEntries.filter((entry) => entry.name.startsWith(MANAGED_PREFIX)).map((entry) => entry.name);
    const manual = uiEntries.filter((entry) => !entry.name.startsWith(MANAGED_PREFIX)).map(manualInput);
    const models = [...manual, ...published];
    const publishedNames = new Set(published.map((entry) => entry.name));
    const removed = previousManaged.filter((name) => !publishedNames.has(name));
    const hidden = view.models.filter((entry) => entry.hidden_in_chat === true).map((entry) => entry.name);
    const keptHidden = hidden.filter((name) => !previousManaged.includes(name));
    for (const name of publishedNames) {
        if (!keptHidden.includes(name))
            keptHidden.push(name);
    }
    const existingComparable = uiEntries.map(manualInput).map(comparable);
    const nextComparable = models.map(comparable);
    const changed = !sameJson(existingComparable, nextComparable) || !sameJson(hidden, keptHidden);
    return { models, hidden_in_chat: keptHidden, removed, changed };
}
function syncErrorCode(error) {
    if (error instanceof ModelSyncError)
        return error.code;
    const info = error?.info;
    if (info?.kind === 'network')
        return 'unreachable';
    if (info?.kind === 'not_configured')
        return 'not_configured';
    if (info?.kind === 'http' && typeof info.status === 'number')
        return `http_${info.status}`;
    return 'sync_failed';
}
export async function syncModels(api, published, options) {
    const syncedAt = new Date().toISOString();
    // An empty catalog is indistinguishable from "the host is still loading its
    // providers" and must never be read as "every model was removed": that would
    // wipe the aliases minutes before the host becomes ready.
    if (published.length === 0) {
        return {
            synced_at: syncedAt,
            published: 0,
            removed: 0,
            changed: false,
            error: 'catalog_unavailable',
        };
    }
    try {
        const view = await api.get();
        const merged = mergeModels(view, published);
        if (!merged.changed && options?.force !== true) {
            return {
                synced_at: syncedAt,
                published: published.length,
                removed: merged.removed.length,
                changed: false,
            };
        }
        await api.put({ models: merged.models, hidden_in_chat: merged.hidden_in_chat });
        return {
            synced_at: syncedAt,
            published: published.length,
            removed: merged.removed.length,
            changed: true,
        };
    }
    catch (error) {
        return {
            synced_at: syncedAt,
            published: 0,
            removed: 0,
            changed: false,
            error: syncErrorCode(error),
        };
    }
}
export function unavailableModelStatus(autoSync) {
    return { available: false, published: 0, removed: 0, changed: false, autoSync, unavailable: [] };
}
export function createModelsApi(config) {
    return {
        get: () => api(config, '/api/models/config'),
        put: (payload) => api(config, '/api/models/config', { method: 'PUT', body: payload }),
    };
}
function runtimeOrigin(runtime) {
    try {
        return runtime.getOrigin();
    }
    catch {
        return undefined;
    }
}
/** Alias -> host default effort, display only; publishing stays level-free. */
export function catalogDefaults(catalog) {
    const defaults = {};
    for (const model of catalog?.models ?? []) {
        if (typeof model.defaultEffort === 'string' && model.defaultEffort)
            defaults[model.alias] = model.defaultEffort;
    }
    return defaults;
}
function readMainModel(ctx) {
    try {
        const service = ctx.get('agentDefaultModel');
        const selection = service?.currentSelection?.();
        if (selection === undefined || typeof selection.provider !== 'string' || typeof selection.model !== 'string') {
            return undefined;
        }
        return {
            provider: selection.provider,
            model: selection.model,
            ...(typeof selection.reasoningEffort === 'string' ? { reasoningEffort: selection.reasoningEffort } : {}),
        };
    }
    catch {
        return undefined;
    }
}
export function registerModelSync(ctx, config, proxy) {
    const api = createModelsApi(config);
    let runtime;
    let catalog;
    let last;
    let readyError;
    let syncing;
    let timer;
    let emptyRetryTimer;
    let emptyRetries = 0;
    const status = () => {
        const mainModel = readMainModel(ctx);
        const error = last?.error ?? readyError;
        const origin = runtime ? runtimeOrigin(runtime) : undefined;
        const defaults = catalogDefaults(catalog);
        return {
            available: runtime !== undefined && readyError === undefined,
            ...(origin ? { origin } : {}),
            published: last?.published ?? 0,
            removed: last?.removed ?? 0,
            changed: last?.changed ?? false,
            ...(last?.synced_at ? { lastSyncAt: last.synced_at } : {}),
            ...(error ? { lastError: error } : {}),
            autoSync: config.autoSyncModels,
            ...(mainModel ? { mainModel } : {}),
            ...(Object.keys(defaults).length > 0 ? { defaults } : {}),
            unavailable: catalog?.unavailable ?? [],
        };
    };
    const syncNow = (options) => {
        if (syncing !== undefined)
            return syncing;
        syncing = (async () => {
            try {
                runtime = runtime ?? (await proxy.whenReady);
                readyError = undefined;
            }
            catch {
                readyError = 'proxy_unavailable';
                return status();
            }
            try {
                catalog = await runtime.refresh();
            }
            catch {
                last = {
                    synced_at: new Date().toISOString(),
                    published: 0,
                    removed: 0,
                    changed: false,
                    error: 'catalog_unavailable',
                };
                return status();
            }
            let baseUrl;
            try {
                baseUrl = runtime.getBaseUrl();
            }
            catch {
                last = {
                    synced_at: new Date().toISOString(),
                    published: 0,
                    removed: 0,
                    changed: false,
                    error: 'catalog_unavailable',
                };
                return status();
            }
            last = await syncModels(api, collectPublishedModels(catalog, { baseUrl, token: proxy.token }), { force: options?.force === true });
            // Providers register a moment after activation; an empty first catalog is
            // the normal startup race, not a decision to remove every alias.
            if (last.error === 'catalog_unavailable' && config.autoSyncModels && emptyRetries < 10) {
                emptyRetries += 1;
                if (emptyRetryTimer !== undefined)
                    clearTimeout(emptyRetryTimer);
                emptyRetryTimer = setTimeout(() => {
                    emptyRetryTimer = undefined;
                    void syncNow();
                }, 3000);
                emptyRetryTimer.unref?.();
            }
            else if (last.error !== 'catalog_unavailable') {
                emptyRetries = 0;
            }
            return status();
        })().finally(() => {
            syncing = undefined;
        });
        return syncing;
    };
    const schedule = () => {
        if (!config.autoSyncModels || runtime === undefined)
            return;
        if (timer !== undefined)
            clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            void syncNow();
        }, 500);
        timer.unref?.();
    };
    ctx.effect(() => {
        const offAdapters = ctx.on('llm/adapters-updated', schedule);
        const offVolatile = ctx.on('loader/volatile-update', schedule);
        return () => {
            offAdapters();
            offVolatile();
            if (timer !== undefined)
                clearTimeout(timer);
            if (emptyRetryTimer !== undefined)
                clearTimeout(emptyRetryTimer);
        };
    }, 'harness-rag: model sync listeners');
    void proxy.whenReady
        .then((resolved) => {
        runtime = resolved;
        if (config.autoSyncModels)
            void syncNow({ force: true });
    })
        .catch(() => {
        readyError = 'proxy_unavailable';
    });
    return { status, syncNow };
}
