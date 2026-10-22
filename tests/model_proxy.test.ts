import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aliasFor,
  authorizeProxy,
  buildCatalog,
  buildGenerateOptions,
  collectCompletion,
  isLoopbackAddress,
  LLM_PROXY_ROUTE,
  mapFailure,
  registerModelProxy,
  selectEffort,
  toChatCompletion,
  type LlmHostLike,
  type PromptPart,
  type ProxyHostContextLike,
  type StreamChunkLike,
} from '../src/model_proxy.ts'

const TOKEN = 'proxy-token'

function expectSyncError(fn: () => unknown, status: number, code: string): void {
  assert.throws(fn, (error: unknown) => {
    const info = error as { status?: number; code?: string }
    return info.status === status && info.code === code
  })
}

async function expectAsyncError(fn: () => Promise<unknown>, status: number, code: string): Promise<void> {
  await assert.rejects(fn, (error: unknown) => {
    const info = error as { status?: number; code?: string }
    return info.status === status && info.code === code
  })
}

const admitEcho = async (parts: readonly PromptPart[]) =>
  parts.map((part) =>
    part.type === 'text' ? { type: 'text' as const, text: part.text } : { type: 'image' as const, attachment: { sha: part.data } },
  )

const target = { provider: 'xiaomi', model: 'mimo-v2.6-flash' }

test('aliasFor joins provider and model with the managed prefix', () => {
  assert.equal(aliasFor('deepseek-account', 'deepseek-flash'), 'dsh:deepseek-account/deepseek-flash')
  assert.equal(aliasFor('a/b', 'm/n'), 'dsh:a/b/m/n')
})

test('isLoopbackAddress accepts v4, v6 and mapped forms only', () => {
  for (const value of ['127.0.0.1', '127.1.2.3', '::1', '[::1]', '::ffff:127.0.0.1']) {
    assert.equal(isLoopbackAddress(value), true, value)
  }
  for (const value of ['10.0.0.5', '192.168.1.2', '::ffff:10.0.0.5', '2001:db8::1', '', undefined]) {
    assert.equal(isLoopbackAddress(value), false, String(value))
  }
})

test('authorizeProxy requires the bearer token when one is configured', () => {
  assert.doesNotThrow(() => authorizeProxy({ authorization: `Bearer ${TOKEN}` }, '10.0.0.5', TOKEN))
  expectSyncError(() => authorizeProxy({}, '127.0.0.1', TOKEN), 401, 'unauthorized')
  expectSyncError(() => authorizeProxy({ authorization: 'Bearer wrong' }, '127.0.0.1', TOKEN), 401, 'unauthorized')
})

test('authorizeProxy falls back to loopback when the token is empty', () => {
  assert.doesNotThrow(() => authorizeProxy({}, '127.0.0.1', ''))
  expectSyncError(() => authorizeProxy({}, '10.0.0.5', ''), 403, 'loopback_only')
})

test('selectEffort maps six levels and clamps against the model effort list', () => {
  const full = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
  assert.equal(selectEffort('none', full), 'off')
  assert.equal(selectEffort('off', full), 'off')
  assert.equal(selectEffort('minimal', full), 'minimal')
  assert.equal(selectEffort('xhigh', full), 'xhigh')
  assert.equal(selectEffort('max', full), 'max')

  const noMinimal = ['low', 'medium', 'high']
  assert.equal(selectEffort('minimal', noMinimal), 'low')
  assert.equal(selectEffort('none', noMinimal), 'low')
  assert.equal(selectEffort('xhigh', noMinimal), 'high')
  assert.equal(selectEffort('max', noMinimal), 'high')

  const sparse = ['low', 'high']
  assert.equal(selectEffort('medium', sparse), 'low')

  assert.equal(selectEffort(undefined, full), undefined)
  assert.equal(selectEffort('high', []), undefined)
  expectSyncError(() => selectEffort('turbo', full), 400, 'invalid_reasoning_effort')
})

test('buildCatalog maps providers, filters failed ones and sorts by alias', async () => {
  const llm: LlmHostLike = {
    listProviders: () => [
      { id: 'xiaomi', name: 'Xiaomi' },
      { id: 'broken', name: 'Broken' },
      { id: 'deepseek-account', name: 'DeepSeek Account' },
    ],
    async listModels(provider) {
      if (provider === 'broken') throw new Error('boom')
      if (provider === 'xiaomi') {
        return [{ provider, id: 'mimo-v2.6-flash', name: 'MiMo Flash', inputModalities: ['text', 'image'] }]
      }
      return [{ provider, id: 'deepseek-flash', name: 'DeepSeek Flash' }]
    },
    async resolveModelInfo(provider, model) {
      return {
        provider,
        id: model,
        name: model,
        ...(provider === 'xiaomi' ? { inputModalities: ['text', 'image'] } : {}),
        context: { contextWindow: 128000 },
        defaultMaxTokens: 8192,
        ...(provider === 'xiaomi'
          ? {
              reasoning: {
                efforts: [{ id: 'low' }, { id: 'medium' }, { id: 'high' }, { id: 'xhigh' }, { id: 'max' }],
                defaultEffort: 'medium',
              },
            }
          : {}),
      }
    },
  }

  const catalog = await buildCatalog(llm, 'http://127.0.0.1:3080')
  assert.equal(catalog.origin, 'http://127.0.0.1:3080')
  assert.deepEqual(
    catalog.models.map((model) => model.alias),
    ['dsh:deepseek-account/deepseek-flash', 'dsh:xiaomi/mimo-v2.6-flash'],
  )
  const xiaomi = catalog.byAlias.get('dsh:xiaomi/mimo-v2.6-flash')
  assert.equal(xiaomi?.contextWindow, 128000)
  assert.equal(xiaomi?.maxTokens, 8192)
  assert.deepEqual(xiaomi?.efforts, ['low', 'medium', 'high', 'xhigh', 'max'])
  assert.equal(xiaomi?.defaultEffort, 'medium', 'the catalog carries the host default for display')
  assert.deepEqual(catalog.unavailable, [{ provider: 'broken', code: 'catalog_failed' }])
})

test('buildGenerateOptions lifts system, maps text and keeps images admitted', async () => {
  const admitted: PromptPart[][] = []
  const options = await buildGenerateOptions(
    {
      messages: [
        { role: 'system', content: 'You are terse.' },
        { role: 'developer', content: [{ type: 'text', text: 'Follow JSON.' }] },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'describe' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,YWJj', detail: 'high' } },
          ],
        },
        { role: 'assistant', content: 'seen' },
        { role: 'user', content: 'next' },
      ],
      max_tokens: 512,
      temperature: 0.2,
    },
    target,
    { efforts: ['low', 'medium', 'high'] },
    async (parts) => {
      admitted.push([...parts])
      return admitEcho(parts)
    },
  )

  assert.equal(options.provider, 'xiaomi')
  assert.equal(options.model, 'mimo-v2.6-flash')
  assert.equal(options.system, 'You are terse.\n\nFollow JSON.')
  assert.equal(options.maxTokens, 512)
  assert.equal(options.temperature, 0.2)
  assert.equal(options.reasoningEffort, undefined)
  assert.equal(admitted.length, 1)
  assert.deepEqual(admitted[0], [
    { type: 'text', text: 'describe' },
    { type: 'image', data: 'YWJj', mediaType: 'image/png' },
  ])
  assert.deepEqual(options.messages[0], {
    role: 'user',
    content: [
      { type: 'text', text: 'describe' },
      { type: 'image', attachment: { sha: 'YWJj' } },
    ],
  })
  const assistant = options.messages[1] as { id?: string; source?: unknown }
  assert.equal(typeof assistant.id, 'string')
  assert.deepEqual(assistant.source, { kind: 'model', provider: 'xiaomi', model: 'mimo-v2.6-flash' })
  assert.deepEqual(options.messages[2], { role: 'user', content: [{ type: 'text', text: 'next' }] })
})

test('buildGenerateOptions clamps a requested effort to the model subset', async () => {
  const options = await buildGenerateOptions(
    { messages: [{ role: 'user', content: 'hi' }], reasoning_effort: 'max' },
    target,
    { efforts: ['low', 'high'] },
    admitEcho,
  )
  assert.equal(options.reasoningEffort, 'high')
})

test('buildGenerateOptions passes xhigh and max through when the model declares them', async () => {
  for (const level of ['xhigh', 'max'] as const) {
    const options = await buildGenerateOptions(
      { messages: [{ role: 'user', content: 'hi' }], reasoning_effort: level },
      target,
      { efforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
      admitEcho,
    )
    assert.equal(options.reasoningEffort, level)
  }
})

test('buildGenerateOptions rejects unsupported request shapes', async () => {
  const base = { messages: [{ role: 'user', content: 'hi' }] }
  await expectAsyncError(
    () => buildGenerateOptions({ ...base, stream: true }, target, { efforts: [] }, admitEcho),
    400,
    'stream_unsupported',
  )
  await expectAsyncError(
    () => buildGenerateOptions({ ...base, tools: [{ type: 'function' }] }, target, { efforts: [] }, admitEcho),
    400,
    'tools_unsupported',
  )
  await expectAsyncError(
    () => buildGenerateOptions({ ...base, n: 2 }, target, { efforts: [] }, admitEcho),
    400,
    'n_unsupported',
  )
  await expectAsyncError(
    () => buildGenerateOptions({ ...base, stop: ['END'] }, target, { efforts: [] }, admitEcho),
    400,
    'stop_unsupported',
  )
  await expectAsyncError(
    () => buildGenerateOptions({ messages: [{ role: 'tool', content: 'x' }] }, target, { efforts: [] }, admitEcho),
    400,
    'unsupported_role',
  )
})

test('buildGenerateOptions rejects unsupported image payloads', async () => {
  const image = (url: string, type = 'image_url') => ({
    messages: [{ role: 'user', content: [{ type, image_url: { url } }] }],
  })
  await expectAsyncError(
    () => buildGenerateOptions(image('data:image/bmp;base64,YWJj'), target, { efforts: [] }, admitEcho),
    415,
    'unsupported_image_type',
  )
  await expectAsyncError(
    () => buildGenerateOptions(image('https://example.com/a.png'), target, { efforts: [] }, admitEcho),
    400,
    'invalid_image_url',
  )
  await expectAsyncError(
    () => buildGenerateOptions(image('data:image/png;base64,YW Jj'), target, { efforts: [] }, admitEcho),
    400,
    'invalid_image_base64',
  )
})

test('toChatCompletion returns an OpenAI chat.completion body', () => {
  const body = toChatCompletion({
    model: 'dsh:xiaomi/mimo',
    text: 'hello',
    reasoning: 'thinking',
    usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14, cacheReadTokens: 2, reasoningTokens: 1 },
    finish: 'max-tokens',
  }) as {
    object: string
    model: string
    choices: Array<{ message: { role: string; content: string; reasoning_content?: string }; finish_reason: string }>
    usage: Record<string, number>
  }
  assert.equal(body.object, 'chat.completion')
  assert.equal(body.model, 'dsh:xiaomi/mimo')
  assert.equal(body.choices[0].message.role, 'assistant')
  assert.equal(body.choices[0].message.content, 'hello')
  assert.equal(body.choices[0].message.reasoning_content, 'thinking')
  assert.equal(body.choices[0].finish_reason, 'length')
  assert.equal(body.usage.prompt_tokens, 10)
  assert.equal(body.usage.completion_tokens, 4)
  assert.equal(body.usage.total_tokens, 14)
})

test('toChatCompletion omits empty reasoning and still answers a valid body', () => {
  const body = toChatCompletion({ model: 'dsh:a/b', text: '', reasoning: '' }) as {
    choices: Array<{ message: Record<string, unknown>; finish_reason: string }>
  }
  assert.equal(body.choices[0].message.content, '')
  assert.equal('reasoning_content' in body.choices[0].message, false)
  assert.equal(body.choices[0].finish_reason, 'stop')
})

test('collectCompletion accumulates text, reasoning, usage and finish', async () => {
  const chunks: StreamChunkLike[] = [
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'hel' },
    { type: 'reasoning-delta', index: 1, text: 'think' },
    { type: 'text-delta', index: 0, text: 'lo' },
    {
      type: 'usage',
      usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5, cacheReadTokens: 1 },
    },
    { type: 'finish', reason: { kind: 'max-tokens' } },
  ]
  const result = await collectCompletion((async function* () {
    yield* chunks
  })())
  assert.equal(result.text, 'hello')
  assert.equal(result.reasoning, 'think')
  assert.equal(result.finish, 'max-tokens')
  assert.deepEqual(result.usage, { inputTokens: 3, outputTokens: 2, totalTokens: 5, cacheReadTokens: 1 })
  assert.equal(result.failure, undefined)
})

test('collectCompletion surfaces a terminal failure without a finish marker as stop', async () => {
  const failed = await collectCompletion((async function* () {
    yield { type: 'text-delta', index: 0, text: 'partial' } as StreamChunkLike
    yield {
      type: 'finish',
      reason: { kind: 'error', failure: { code: 'QUOTA', message: 'quota' } },
    } as StreamChunkLike
  })())
  assert.equal(failed.finish, 'error')
  assert.equal(failed.failure?.code, 'QUOTA')

  const truncated = await collectCompletion((async function* () {
    yield { type: 'text-delta', index: 0, text: 'partial' } as StreamChunkLike
  })())
  assert.equal(truncated.finish, 'stop')
})

function fakeResponse(): {
  state: { status: number; body: string }
  writeHead(status: number, _headers: Record<string, unknown>): void
  end(body?: string | Buffer): void
} {
  const state = { status: 0, body: '' }
  return {
    state,
    writeHead(status) {
      state.status = status
    },
    end(body) {
      state.body = body === undefined ? '' : String(body)
    },
  }
}

function fakeRequest(method: string, url: string, body?: unknown, authorization?: string) {
  const text = body === undefined ? undefined : JSON.stringify(body)
  return {
    method,
    url,
    headers: authorization ? { authorization } : {},
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      if (text !== undefined) yield Buffer.from(text)
    },
  }
}

function makeProxy(): {
  handler: (req: unknown, res: unknown) => Promise<void>
  ready: Promise<unknown>
  streamOptions: () => Record<string, unknown> | undefined
} {
  let handler: ((req: unknown, res: unknown) => Promise<void>) | undefined
  let streamOptions: Record<string, unknown> | undefined
  const llm = {
    listProviders: () => [{ id: 'p', name: 'P' }],
    async listModels(provider: string) {
      return [{ provider, id: 'm', name: 'M' }]
    },
    async resolveModelInfo(provider: string, model: string) {
      return { provider, id: model, name: model, reasoning: { efforts: [{ id: 'low' }, { id: 'high' }] } }
    },
    async *stream(options: unknown) {
      streamOptions = options as Record<string, unknown>
      yield { type: 'text-delta', index: 0, text: 'hello' }
      yield { type: 'usage', usage: { inputTokens: 3, outputTokens: 1, totalTokens: 4 } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
  const ctx = {
    inject(_deps: string[], callback: (fresh: unknown) => void) {
      callback({
        webServer: {
          getOrigin: () => 'http://127.0.0.1:3080',
          register(route: { handler: (req: unknown, res: unknown) => Promise<void> }) {
            handler = route.handler
            return () => {}
          },
        },
        llm,
        effect(callback: () => unknown) {
          return callback()
        },
      })
    },
    get() {
      return undefined
    },
    effect(callback: () => unknown) {
      return callback()
    },
  }
  const proxy = registerModelProxy(ctx as unknown as ProxyHostContextLike, { apiToken: TOKEN })
  return {
    ready: proxy.whenReady,
    streamOptions: () => streamOptions,
    handler: (req, res) => {
      if (handler === undefined) throw new Error('proxy route was not registered')
      return handler(req, res)
    },
  }
}

test('registerModelProxy serves the model list and one chat completion', async () => {
  const proxy = makeProxy()
  await proxy.ready

  const list = fakeResponse()
  await proxy.handler(fakeRequest('GET', `${LLM_PROXY_ROUTE}/models`, undefined, `Bearer ${TOKEN}`), list)
  assert.equal(list.state.status, 200)
  const listed = JSON.parse(list.state.body) as { data: Array<{ id: string }> }
  assert.deepEqual(listed.data.map((entry) => entry.id), ['dsh:p/m'])

  const completion = fakeResponse()
  await proxy.handler(
    fakeRequest(
      'POST',
      `${LLM_PROXY_ROUTE}/chat/completions`,
      { model: 'dsh:p/m', messages: [{ role: 'user', content: 'hi' }], max_tokens: 16 },
      `Bearer ${TOKEN}`,
    ),
    completion,
  )
  assert.equal(completion.state.status, 200)
  const parsed = JSON.parse(completion.state.body) as {
    choices: Array<{ message: { content: string } }>
    usage: { total_tokens: number }
  }
  assert.equal(parsed.choices[0].message.content, 'hello')
  assert.equal(parsed.usage.total_tokens, 4)
  const forwarded = proxy.streamOptions()
  assert.equal(typeof forwarded?.sessionId, 'string')
  assert.ok((forwarded?.sessionId as string).length > 0)

  const denied = fakeResponse()
  await proxy.handler(fakeRequest('GET', `${LLM_PROXY_ROUTE}/models`), denied)
  assert.equal(denied.state.status, 401)
})

test('mapFailure maps known codes and never echoes provider detail', () => {
  assert.deepEqual(mapFailure({ code: 'CONTEXT_WINDOW_EXCEEDED', message: 'raw secret sk-1' }), {
    status: 400,
    code: 'context_window_exceeded',
    message: 'The request exceeds the model context window.',
  })
  assert.deepEqual(mapFailure({ code: 'MISSING_CREDENTIAL', message: 'raw' }), {
    status: 502,
    code: 'provider_credential',
    message: 'The provider credential is missing.',
  })
  assert.deepEqual(mapFailure({ code: 'QUOTA', message: 'raw' }), {
    status: 429,
    code: 'quota_exhausted',
    message: 'The provider quota is exhausted.',
  })
  const unknown = mapFailure({ code: 'WEIRD', message: 'raw secret sk-1' })
  assert.equal(unknown.status, 502)
  assert.equal(unknown.message, 'The model call failed.')
  assert.equal(JSON.stringify(unknown).includes('sk-1'), false)
})
