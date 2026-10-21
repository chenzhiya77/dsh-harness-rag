import test from 'node:test'
import assert from 'node:assert/strict'
import {
  collectPublishedModels,
  mergeModels,
  ModelSyncError,
  publishEfforts,
  syncModels,
  toEngineEntry,
  type EngineModelsPayload,
  type EngineModelsView,
  type ModelsApi,
} from '../src/model_sync.ts'
import type { ProxyCatalog, ProxyModel } from '../src/model_proxy.ts'

const RUNTIME = { baseUrl: 'http://127.0.0.1:3080/dsh-harness-rag/llm/v1', token: 'proxy-token' }

function model(overrides: Partial<ProxyModel> = {}): ProxyModel {
  return {
    alias: 'dsh:xiaomi/mimo',
    provider: 'xiaomi',
    model: 'mimo',
    name: 'MiMo',
    inputModalities: ['text', 'image'],
    contextWindow: 128000,
    maxTokens: 8192,
    efforts: ['low', 'medium', 'high', 'xhigh'],
    ...overrides,
  }
}

function apiWith(view: EngineModelsView, fail?: 'get' | 'put'): { api: ModelsApi; puts: EngineModelsPayload[] } {
  const puts: EngineModelsPayload[] = []
  return {
    puts,
    api: {
      async get() {
        if (fail === 'get') throw Object.assign(new Error('boom'), { info: { kind: 'network' } })
        return structuredClone(view)
      },
      async put(payload) {
        if (fail === 'put') throw Object.assign(new Error('boom'), { info: { kind: 'http', status: 500 } })
        puts.push(structuredClone(payload))
      },
    },
  }
}

function viewAfter(payload: EngineModelsPayload, extra: EngineModelsView['models'] = []): EngineModelsView {
  return {
    models: [
      ...extra,
      ...payload.models.map((entry) => ({
        ...entry,
        source: 'ui',
        api_key: '********',
        hidden_in_chat: payload.hidden_in_chat.includes(entry.name),
      })),
    ],
  }
}

test('publishEfforts maps six DSH levels into the engine subset', () => {
  assert.deepEqual(publishEfforts(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']), [
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
  ])
  assert.deepEqual(publishEfforts(['max', 'xhigh']), ['xhigh', 'max'])
  assert.deepEqual(publishEfforts(['high', 'low']), ['low', 'high'])
  assert.deepEqual(publishEfforts(['off']), [])
  assert.deepEqual(publishEfforts(['turbo', 'high']), ['high'])
})

test('toEngineEntry writes one thin alias and no provider material', () => {
  const entry = toEngineEntry(model(), RUNTIME)
  assert.deepEqual(entry, {
    provider: 'openai-compatible',
    name: 'dsh:xiaomi/mimo',
    model: 'dsh:xiaomi/mimo',
    display_name: 'MiMo · xiaomi',
    endpoint: RUNTIME.baseUrl,
    api_key: 'proxy-token',
    supports_vision: true,
    supports_thinking: true,
    supports_reasoning_effort: true,
    supported_reasoning_efforts: ['low', 'medium', 'high', 'xhigh'],
    context_window: 128000,
    max_tokens: 8192,
    use_responses_api: false,
    when_thinking_disabled: { reasoning_effort: 'low' },
  })
  assert.equal('reasoning_effort' in entry, false, 'follow means send no value; DSH applies its default at call time')
  assert.equal('when_thinking_enabled' in entry, false, 'thinking on follows the host default, not a forced level')
})

test('toEngineEntry omits reasoning shapes for a model without efforts', () => {
  const entry = toEngineEntry(
    model({ efforts: [], inputModalities: ['text'], contextWindow: undefined, maxTokens: undefined }),
    { ...RUNTIME, token: '' },
  )
  assert.equal(entry.api_key, 'local-proxy')
  assert.equal(entry.supports_vision, false)
  assert.equal(entry.supports_thinking, false)
  assert.equal(entry.supports_reasoning_effort, false)
  assert.equal('supported_reasoning_efforts' in entry, false)
  assert.equal('reasoning_effort' in entry, false)
  assert.equal('when_thinking_enabled' in entry, false)
  assert.equal('when_thinking_disabled' in entry, false)
  assert.equal('context_window' in entry, false)
  assert.equal('max_tokens' in entry, false)
})

test('toEngineEntry never writes a default effort so thinking-on follows DSH at call time', () => {
  const entry = toEngineEntry(model({ efforts: ['low', 'medium', 'high', 'max'] }), RUNTIME)
  assert.equal('reasoning_effort' in entry, false)
  assert.equal('when_thinking_enabled' in entry, false)
  assert.deepEqual(entry.supported_reasoning_efforts, ['low', 'medium', 'high', 'max'])
})

test('toEngineEntry disables thinking with the host off effort when declared', () => {
  const entry = toEngineEntry(model({ efforts: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] }), RUNTIME)
  assert.deepEqual(entry.supported_reasoning_efforts, ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
  assert.deepEqual(entry.when_thinking_disabled, { reasoning_effort: 'off' })
})

test('collectPublishedModels maps the catalog in order', () => {
  const first = model()
  const second = model({ alias: 'dsh:deepseek-account/flash', provider: 'deepseek-account', model: 'flash', name: 'Flash' })
  const catalog: ProxyCatalog = {
    origin: 'http://127.0.0.1:3080',
    models: [first, second],
    byAlias: new Map([
      [first.alias, first],
      [second.alias, second],
    ]),
    unavailable: [],
    builtAt: 0,
  }
  const entries = collectPublishedModels(catalog, RUNTIME)
  assert.deepEqual(
    entries.map((entry) => entry.name),
    ['dsh:xiaomi/mimo', 'dsh:deepseek-account/flash'],
  )
})

test('mergeModels preserves manual entries, replaces managed ones and maintains hidden_in_chat', () => {
  const manual = {
    name: 'manual',
    model: 'manual-m',
    provider: 'openai-compatible',
    endpoint: 'https://manual.example/v1',
    source: 'ui',
    hidden_in_chat: false,
    supports_thinking: false,
    supports_vision: false,
    supports_reasoning_effort: false,
  }
  const view: EngineModelsView = {
    models: [
      { name: 'cfg-model', model: 'cfg', source: 'config_file', hidden_in_chat: true },
      manual,
      {
        name: 'dsh:old/x',
        model: 'dsh:old/x',
        provider: 'openai-compatible',
        endpoint: 'http://old',
        source: 'ui',
        hidden_in_chat: true,
        supports_thinking: true,
        supports_vision: false,
        supports_reasoning_effort: true,
        supported_reasoning_efforts: ['low', 'high'],
      },
    ],
  }
  const published = [toEngineEntry(model(), RUNTIME)]
  const merged = mergeModels(view, published)
  assert.deepEqual(
    merged.models.map((entry) => entry.name),
    ['manual', 'dsh:xiaomi/mimo'],
  )
  assert.deepEqual(merged.hidden_in_chat, ['cfg-model', 'dsh:xiaomi/mimo'])
  assert.deepEqual(merged.removed, ['dsh:old/x'])
  assert.equal(merged.changed, true)

  const again = mergeModels(
    viewAfter(
      { models: merged.models, hidden_in_chat: merged.hidden_in_chat },
      [{ name: 'cfg-model', model: 'cfg', source: 'config_file', hidden_in_chat: true }],
    ),
    published,
  )
  assert.equal(again.changed, false)
  assert.deepEqual(again.models, merged.models)
  assert.deepEqual(again.hidden_in_chat, merged.hidden_in_chat)
})

test('mergeModels refuses to silently drop an unrepresentable manual entry', () => {
  const view: EngineModelsView = {
    models: [{ name: 'manual', model: 'm', provider: null, source: 'ui', hidden_in_chat: false }],
  }
  assert.throws(
    () => mergeModels(view, []),
    (error: unknown) => error instanceof ModelSyncError && error.code === 'manual_entry_unrepresentable',
  )
})

test('syncModels never wipes aliases when the host catalog is empty', async () => {
  const { api, puts } = apiWith({
    models: [{ name: 'dsh:old/x', model: 'dsh:old/x', provider: 'openai-compatible', source: 'ui', hidden_in_chat: true }],
  })
  const result = await syncModels(api, [])
  assert.equal(result.error, 'catalog_unavailable')
  assert.equal(result.changed, false)
  assert.equal(puts.length, 0)
})

test('syncModels skips an unchanged PUT, forces on request and returns readable errors', async () => {
  const view: EngineModelsView = { models: [] }
  const published = [toEngineEntry(model(), RUNTIME)]
  const firstApi = apiWith(view)
  const first = await syncModels(firstApi.api, published)
  assert.equal(first.changed, true)
  assert.equal(firstApi.puts.length, 1)
  assert.equal(first.published, 1)
  assert.equal(first.removed, 0)

  const secondApi = apiWith(viewAfter(firstApi.puts[0]))
  const second = await syncModels(secondApi.api, published)
  assert.equal(second.changed, false)
  assert.equal(secondApi.puts.length, 0)

  const forced = await syncModels(secondApi.api, published, { force: true })
  assert.equal(forced.changed, true)
  assert.equal(secondApi.puts.length, 1)

  const network = await syncModels(apiWith(view, 'get').api, published)
  assert.equal(network.changed, false)
  assert.equal(network.error, 'unreachable')

  const http = await syncModels(apiWith(view, 'put').api, published, { force: true })
  assert.equal(http.error, 'http_500')
})
