/**
 * Publish host model aliases into the knowledge service's UI-managed model
 * catalog. Each alias carries only the local proxy address and token; provider
 * endpoints, keys and thinking dialects stay inside the host.
 */

import { api } from './http.ts'
import type { Config } from './settings.ts'
import type { ModelProxyHandle, ModelProxyRuntime, ProxyCatalog, ProxyModel } from './model_proxy.ts'

export class ModelSyncError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export interface EngineModelInput {
  provider: string
  name: string
  model: string
  api_key?: string
  endpoint?: string | null
  display_name?: string | null
  description?: string | null
  supports_thinking: boolean
  supports_vision: boolean
  supports_reasoning_effort: boolean
  supported_context_windows?: number[] | null
  supported_reasoning_efforts?: string[] | null
  reasoning_effort?: string | null
  context_window?: number | null
  max_tokens?: number | null
  use_responses_api?: boolean | null
  when_thinking_enabled?: Record<string, unknown> | null
  when_thinking_disabled?: Record<string, unknown> | null
  default_headers?: Record<string, string> | null
}

export interface EngineModelView {
  name: string
  model: string
  display_name?: string | null
  description?: string | null
  provider?: string | null
  endpoint?: string | null
  source?: string
  hidden_in_chat?: boolean
  supports_thinking?: boolean
  supports_vision?: boolean
  supports_reasoning_effort?: boolean
  supported_context_windows?: number[] | null
  supported_reasoning_efforts?: string[] | null
  reasoning_effort?: string | null
  context_window?: number | null
  max_tokens?: number | null
  use_responses_api?: boolean | null
  when_thinking_enabled?: Record<string, unknown> | null
  when_thinking_disabled?: Record<string, unknown> | null
  default_headers?: Record<string, string> | null
}

export interface EngineModelsView {
  models: EngineModelView[]
}

export interface EngineModelsPayload {
  models: EngineModelInput[]
  hidden_in_chat: string[]
}

export interface ModelsApi {
  get(): Promise<EngineModelsView>
  put(payload: EngineModelsPayload): Promise<unknown>
}

export interface SyncResult {
  synced_at: string
  published: number
  removed: number
  changed: boolean
  error?: string
}

export interface SyncRuntime {
  baseUrl: string
  token: string
}

export interface MergeResult {
  models: EngineModelInput[]
  hidden_in_chat: string[]
  removed: string[]
  changed: boolean
}

const EFFORT_ORDER = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const
const MANAGED_PREFIX = 'dsh:'

function mappedEffort(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  return EFFORT_ORDER.includes(value as (typeof EFFORT_ORDER)[number]) ? value : undefined
}

export function publishEfforts(efforts: readonly string[]): string[] {
  const present = new Set<string>()
  for (const effort of efforts) {
    const mapped = mappedEffort(effort)
    if (mapped !== undefined) present.add(mapped)
  }
  return EFFORT_ORDER.filter((level) => present.has(level))
}

export function toEngineEntry(model: ProxyModel, runtime: SyncRuntime): EngineModelInput {
  const efforts = publishEfforts(model.efforts)
  // "Thinking off" is not the lowest thinking level: some providers reject
  // `minimal` outright (measured on xiaomi), while the host's own `off` works.
  // The engine sends this declared shape verbatim, so `off` may leave the
  // published subset.
  const disableEffort = model.efforts.includes('off') ? 'off' : efforts[0]
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
  }
}

export function collectPublishedModels(catalog: ProxyCatalog, runtime: SyncRuntime): EngineModelInput[] {
  return catalog.models.map((model) => toEngineEntry(model, runtime))
}

function manualInput(entry: EngineModelView): EngineModelInput {
  if (!entry.provider) {
    throw new ModelSyncError(
      'manual_entry_unrepresentable',
      `UI-managed model "${entry.name}" has no allowlisted provider.`,
    )
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
  }
}

function comparable(entry: EngineModelInput): Omit<EngineModelInput, 'api_key'> {
  const { api_key: _apiKey, ...rest } = entry
  return rest
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) out[key] = canonical(source[key])
    }
    return out
  }
  return value
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))
}

export function mergeModels(view: EngineModelsView, published: EngineModelInput[]): MergeResult {
  const uiEntries = view.models.filter((entry) => entry.source === 'ui')
  const previousManaged = uiEntries.filter((entry) => entry.name.startsWith(MANAGED_PREFIX)).map((entry) => entry.name)
  const manual = uiEntries.filter((entry) => !entry.name.startsWith(MANAGED_PREFIX)).map(manualInput)
  const models = [...manual, ...published]
  const publishedNames = new Set(published.map((entry) => entry.name))
  const removed = previousManaged.filter((name) => !publishedNames.has(name))

  const hidden = view.models.filter((entry) => entry.hidden_in_chat === true).map((entry) => entry.name)
  const keptHidden = hidden.filter((name) => !previousManaged.includes(name))
  for (const name of publishedNames) {
    if (!keptHidden.includes(name)) keptHidden.push(name)
  }

  const existingComparable = uiEntries.map(manualInput).map(comparable)
  const nextComparable = models.map(comparable)
  const changed = !sameJson(existingComparable, nextComparable) || !sameJson(hidden, keptHidden)
  return { models, hidden_in_chat: keptHidden, removed, changed }
}

function syncErrorCode(error: unknown): string {
  if (error instanceof ModelSyncError) return error.code
  const info = (error as { info?: { kind?: string; status?: number } } | null)?.info
  if (info?.kind === 'network') return 'unreachable'
  if (info?.kind === 'not_configured') return 'not_configured'
  if (info?.kind === 'http' && typeof info.status === 'number') return `http_${info.status}`
  return 'sync_failed'
}

export async function syncModels(
  api: ModelsApi,
  published: EngineModelInput[],
  options?: { force?: boolean },
): Promise<SyncResult> {
  const syncedAt = new Date().toISOString()
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
    }
  }
  try {
    const view = await api.get()
    const merged = mergeModels(view, published)
    if (!merged.changed && options?.force !== true) {
      return {
        synced_at: syncedAt,
        published: published.length,
        removed: merged.removed.length,
        changed: false,
      }
    }
    await api.put({ models: merged.models, hidden_in_chat: merged.hidden_in_chat })
    return {
      synced_at: syncedAt,
      published: published.length,
      removed: merged.removed.length,
      changed: true,
    }
  } catch (error) {
    return {
      synced_at: syncedAt,
      published: 0,
      removed: 0,
      changed: false,
      error: syncErrorCode(error),
    }
  }
}

export interface DshModelStatus {
  available: boolean
  origin?: string
  published: number
  removed: number
  changed: boolean
  lastSyncAt?: string
  lastError?: string
  autoSync: boolean
  mainModel?: { provider: string; model: string; reasoningEffort?: string }
  /** Alias -> host default effort id, for the panel to resolve "Default". */
  defaults?: Record<string, string>
  unavailable: Array<{ provider: string; code: string }>
}

export interface ModelSyncHandle {
  status(): DshModelStatus
  syncNow(options?: { force?: boolean }): Promise<DshModelStatus>
}

export interface SyncHostContextLike {
  get(name: string): unknown
  on(event: string, listener: () => void): () => void
  effect(callback: () => unknown, label: string): unknown
}

export function unavailableModelStatus(autoSync: boolean): DshModelStatus {
  return { available: false, published: 0, removed: 0, changed: false, autoSync, unavailable: [] }
}

export function createModelsApi(config: Config): ModelsApi {
  return {
    get: () => api<EngineModelsView>(config, '/api/models/config'),
    put: (payload) => api<unknown>(config, '/api/models/config', { method: 'PUT', body: payload }),
  }
}

function runtimeOrigin(runtime: ModelProxyRuntime): string | undefined {
  try {
    return runtime.getOrigin()
  } catch {
    return undefined
  }
}

/** Alias -> host default effort, display only; publishing stays level-free. */
export function catalogDefaults(catalog: ProxyCatalog | undefined): Record<string, string> {
  const defaults: Record<string, string> = {}
  for (const model of catalog?.models ?? []) {
    if (typeof model.defaultEffort === 'string' && model.defaultEffort) defaults[model.alias] = model.defaultEffort
  }
  return defaults
}

function readMainModel(ctx: SyncHostContextLike): DshModelStatus['mainModel'] {
  try {
    const service = ctx.get('agentDefaultModel') as
      | { currentSelection?: () => { provider?: unknown; model?: unknown; reasoningEffort?: unknown } }
      | undefined
    const selection = service?.currentSelection?.()
    if (selection === undefined || typeof selection.provider !== 'string' || typeof selection.model !== 'string') {
      return undefined
    }
    return {
      provider: selection.provider,
      model: selection.model,
      ...(typeof selection.reasoningEffort === 'string' ? { reasoningEffort: selection.reasoningEffort } : {}),
    }
  } catch {
    return undefined
  }
}

export function registerModelSync(
  ctx: SyncHostContextLike,
  config: Config,
  proxy: ModelProxyHandle,
): ModelSyncHandle {
  const api = createModelsApi(config)
  let runtime: ModelProxyRuntime | undefined
  let catalog: ProxyCatalog | undefined
  let last: SyncResult | undefined
  let readyError: string | undefined
  let syncing: Promise<DshModelStatus> | undefined
  let pendingForce = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let emptyRetryTimer: ReturnType<typeof setTimeout> | undefined
  let emptyRetries = 0

  const status = (): DshModelStatus => {
    const mainModel = readMainModel(ctx)
    const error = last?.error ?? readyError
    const origin = runtime ? runtimeOrigin(runtime) : undefined
    const defaults = catalogDefaults(catalog)
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
    }
  }

  const syncNow = (options?: { force?: boolean }): Promise<DshModelStatus> => {
    if (syncing !== undefined) {
      // The ready callback can land while the activation sync is still in
      // flight; that first pass may have read the previous service token, so a
      // forced request has to run again after it settles.
      if (options?.force === true) pendingForce = true
      return syncing
    }
    syncing = (async () => {
      try {
        runtime = runtime ?? (await proxy.whenReady)
        readyError = undefined
      } catch {
        readyError = 'proxy_unavailable'
        return status()
      }
      try {
        catalog = await runtime.refresh()
      } catch {
        last = {
          synced_at: new Date().toISOString(),
          published: 0,
          removed: 0,
          changed: false,
          error: 'catalog_unavailable',
        }
        return status()
      }
      let baseUrl: string
      try {
        baseUrl = runtime.getBaseUrl()
      } catch {
        last = {
          synced_at: new Date().toISOString(),
          published: 0,
          removed: 0,
          changed: false,
          error: 'catalog_unavailable',
        }
        return status()
      }
      last = await syncModels(
        api,
        collectPublishedModels(catalog, { baseUrl, token: proxy.token }),
        { force: options?.force === true },
      )
      // Providers register a moment after activation; an empty first catalog is
      // the normal startup race, not a decision to remove every alias.
      if (last.error === 'catalog_unavailable' && config.autoSyncModels && emptyRetries < 10) {
        emptyRetries += 1
        if (emptyRetryTimer !== undefined) clearTimeout(emptyRetryTimer)
        emptyRetryTimer = setTimeout(() => {
          emptyRetryTimer = undefined
          void syncNow()
        }, 3000)
        ;(emptyRetryTimer as { unref?: () => void }).unref?.()
      } else if (last.error !== 'catalog_unavailable') {
        emptyRetries = 0
      }
      return status()
    })().finally(() => {
      syncing = undefined
      if (pendingForce) {
        pendingForce = false
        void syncNow({ force: true })
      }
    })
    return syncing
  }

  const schedule = (): void => {
    if (!config.autoSyncModels || runtime === undefined) return
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void syncNow()
    }, 500)
    ;(timer as { unref?: () => void }).unref?.()
  }

  ctx.effect(
    () => {
      const offAdapters = ctx.on('llm/adapters-updated', schedule)
      const offVolatile = ctx.on('loader/volatile-update', schedule)
      return () => {
        offAdapters()
        offVolatile()
        if (timer !== undefined) clearTimeout(timer)
        if (emptyRetryTimer !== undefined) clearTimeout(emptyRetryTimer)
      }
    },
    'harness-rag: model sync listeners',
  )

  void proxy.whenReady
    .then((resolved) => {
      runtime = resolved
      if (config.autoSyncModels) void syncNow({ force: true })
    })
    .catch(() => {
      readyError = 'proxy_unavailable'
    })

  return { status, syncNow }
}
