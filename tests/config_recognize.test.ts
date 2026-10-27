import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ASR_MODEL_MENU,
  CONFIG_RECOGNIZE_ROUTE,
  ConfigRecognizeError,
  EMBEDDING_PROVIDERS,
  MAX_IMAGE_BYTES,
  MAX_RECOGNIZE_BODY_BYTES,
  MAX_RECOGNIZE_IMAGES,
  MAX_RECOGNIZE_TEXT_CHARS,
  MAX_ROUND_IMAGE_BYTES,
  PARSE_LANGUAGES,
  PARSE_MODEL_VERSIONS,
  PARSE_PROVIDERS,
  PARSE_TIERS,
  RECOGNIZE_IMAGE_TYPES,
  RERANK_PROVIDERS,
  SPARSE_SOURCES,
  SPARSE_PROVIDERS,
  assertRecognizeBodySize,
  attachmentsUnavailableError,
  buildPromptContent,
  buildSystemPrompt,
  catalogUnavailableError,
  mapImageAdmissionFailure,
  mapRecognitionFailure,
  modelNotVisionError,
  normalizeModelAlias,
  parseModelOutput,
  registerConfigRecognize,
  unknownModelError,
  validateRecognizeRequest,
  validateRecognizedFields,
  type ConfigRecognizeContextLike,
} from '../src/config_recognize.ts'

const PNG = 'iVBORw0KGgo='
const PNG_BYTES = Buffer.from(PNG, 'base64').length

function expectSyncError(fn: () => unknown, status: number, code: string): ConfigRecognizeError {
  try {
    fn()
  } catch (error) {
    assert.ok(error instanceof ConfigRecognizeError, 'expected ConfigRecognizeError')
    assert.equal(error.status, status)
    assert.equal(error.code, code)
    return error
  }
  assert.fail('expected the call to throw')
}

function image(mediaType = 'image/png', data = PNG) {
  return { mediaType, data, bytes: Buffer.from(data, 'base64').length }
}

test('constants pin the route, body and image limits to the spec', () => {
  assert.equal(CONFIG_RECOGNIZE_ROUTE, '/dsh-harness-rag/config/recognize')
  assert.equal(MAX_RECOGNIZE_BODY_BYTES, 24 * 1024 * 1024)
  assert.equal(MAX_RECOGNIZE_TEXT_CHARS, 20_000)
  assert.equal(MAX_RECOGNIZE_IMAGES, 3)
  assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024)
  assert.equal(MAX_ROUND_IMAGE_BYTES, 10 * 1024 * 1024)
  assert.deepEqual([...RECOGNIZE_IMAGE_TYPES], ['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  assert.deepEqual([...EMBEDDING_PROVIDERS], ['dashscope', 'volcengine-ark', 'openai-compatible'])
  assert.deepEqual([...SPARSE_SOURCES], ['provider', 'external', 'bm25'])
  assert.deepEqual([...SPARSE_PROVIDERS], ['tei-sparse'])
  assert.deepEqual([...RERANK_PROVIDERS], ['dashscope', 'generic-rerank', 'tei-rerank'])
  assert.deepEqual([...PARSE_PROVIDERS], ['mineru-cloud', 'mineru-local'])
  assert.deepEqual([...PARSE_TIERS], ['flash', 'basic', 'standard', 'advanced'])
  assert.equal(PARSE_LANGUAGES.length, 16)
  assert.deepEqual([...PARSE_MODEL_VERSIONS], ['pipeline', 'vlm'])
})

test('normalizeModelAlias accepts only managed dsh provider/model aliases', () => {
  assert.equal(normalizeModelAlias('dsh:xiaomi/mimo-v2.6-flash'), 'dsh:xiaomi/mimo-v2.6-flash')
  assert.equal(normalizeModelAlias('  dsh:provider/model/with/slash  '), 'dsh:provider/model/with/slash')
  expectSyncError(() => normalizeModelAlias('xiaomi/mimo'), 400, 'invalid_request')
  expectSyncError(() => normalizeModelAlias('dsh:xiaomi'), 400, 'invalid_request')
  expectSyncError(() => normalizeModelAlias('dsh:/model'), 400, 'invalid_request')
  expectSyncError(() => normalizeModelAlias('dsh:provider/'), 400, 'invalid_request')
  expectSyncError(() => normalizeModelAlias('dsh: provider/model'), 400, 'invalid_request')
  expectSyncError(() => normalizeModelAlias(42), 400, 'invalid_request')
})

test('assertRecognizeBodySize accepts the exact limit and rejects one byte more', () => {
  assert.doesNotThrow(() => assertRecognizeBodySize(MAX_RECOGNIZE_BODY_BYTES))
  expectSyncError(() => assertRecognizeBodySize(MAX_RECOGNIZE_BODY_BYTES + 1), 413, 'body_too_large')
})

test('validateRecognizeRequest accepts text and a canonical image', () => {
  const request = validateRecognizeRequest({
    model: 'dsh:xiaomi/mimo-v2.6-flash',
    text: 'embedding model: text-embedding-v4',
    images: [{ mediaType: 'IMAGE/PNG', data: PNG }],
  })
  assert.equal(request.model, 'dsh:xiaomi/mimo-v2.6-flash')
  assert.equal(request.text, 'embedding model: text-embedding-v4')
  assert.deepEqual(request.images, [{ mediaType: 'image/png', data: PNG, bytes: PNG_BYTES }])
})

test('validateRecognizeRequest rejects empty material, bad json and bad aliases', () => {
  expectSyncError(() => validateRecognizeRequest(null), 400, 'invalid_request')
  expectSyncError(() => validateRecognizeRequest({ model: 'dsh:p/m' }), 400, 'invalid_request')
  expectSyncError(() => validateRecognizeRequest({ model: 'p/m', text: 'x' }), 400, 'invalid_request')
  expectSyncError(() => validateRecognizeRequest({ model: 'dsh:p/m', text: 42 }), 400, 'invalid_request')
  expectSyncError(() => validateRecognizeRequest({ model: 'dsh:p/m', text: 'x', images: 'nope' }), 400, 'invalid_request')
  expectSyncError(
    () => validateRecognizeRequest({ model: 'dsh:p/m', text: 'x'.repeat(MAX_RECOGNIZE_TEXT_CHARS + 1) }),
    400,
    'invalid_request',
  )
})

test('validateRecognizeRequest enforces image count, types, size and canonical base64', () => {
  const base = { model: 'dsh:p/m', text: '' }
  const exactText = validateRecognizeRequest({ model: 'dsh:p/m', text: 'x'.repeat(MAX_RECOGNIZE_TEXT_CHARS) })
  assert.equal(exactText.text.length, MAX_RECOGNIZE_TEXT_CHARS)
  const threeImages = validateRecognizeRequest({
    ...base,
    images: [
      { mediaType: 'image/png', data: PNG },
      { mediaType: 'image/jpeg', data: PNG },
      { mediaType: 'image/gif', data: PNG },
    ],
  })
  assert.equal(threeImages.images.length, MAX_RECOGNIZE_IMAGES)
  expectSyncError(
    () => validateRecognizeRequest({ ...base, images: [image(), image(), image(), image()] }),
    400,
    'too_many_images',
  )
  expectSyncError(
    () => validateRecognizeRequest({ ...base, images: [{ mediaType: 'image/svg+xml', data: PNG }] }),
    415,
    'invalid_image_type',
  )
  expectSyncError(
    () => validateRecognizeRequest({ ...base, images: [{ mediaType: 'image/png', data: 'abc' }] }),
    400,
    'invalid_request',
  )
  const fiveMiB = Buffer.alloc(MAX_IMAGE_BYTES).toString('base64')
  const overFiveMiB = Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64')
  expectSyncError(
    () => validateRecognizeRequest({ ...base, images: [{ mediaType: 'image/png', data: overFiveMiB }] }),
    413,
    'image_too_large',
  )
  assert.equal(
    validateRecognizeRequest({ ...base, images: [{ mediaType: 'image/png', data: fiveMiB }] }).images[0].bytes,
    MAX_IMAGE_BYTES,
  )
  const exactRound = validateRecognizeRequest({
    ...base,
    images: [
      { mediaType: 'image/png', data: fiveMiB },
      { mediaType: 'image/jpeg', data: fiveMiB },
    ],
  })
  assert.equal(exactRound.images.reduce((sum, item) => sum + item.bytes, 0), MAX_ROUND_IMAGE_BYTES)
  const twoFiveMiB = [fiveMiB, fiveMiB, PNG]
  expectSyncError(
    () =>
      validateRecognizeRequest({
        ...base,
        images: [
          { mediaType: 'image/png', data: twoFiveMiB[0] },
          { mediaType: 'image/jpeg', data: twoFiveMiB[1] },
          { mediaType: 'image/webp', data: twoFiveMiB[2] },
        ],
      }),
    413,
    'image_too_large',
  )
})

test('buildSystemPrompt pins the schema, enums and secret rules', () => {
  const prompt = buildSystemPrompt()
  for (const token of [
    'JSON',
    'null',
    'API key',
    'Bearer',
    'embedding.provider',
    'parse.language',
    'devanagari',
    'pipeline',
    'vlm',
    'funasr',
    'tei-sparse',
  ]) {
    assert.ok(prompt.includes(token), `missing prompt token: ${token}`)
  }
})

test('buildPromptContent emits text then image data URLs', () => {
  assert.deepEqual(buildPromptContent('hello', [image()]), [
    { type: 'text', text: 'hello' },
    { type: 'image_url', image_url: { url: `data:image/png;base64,${PNG}` } },
  ])
  assert.deepEqual(buildPromptContent('   ', [image('image/jpeg', PNG)]), [
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${PNG}` } },
  ])
  assert.deepEqual(buildPromptContent('text', []), [{ type: 'text', text: 'text' }])
})

test('parseModelOutput tolerates fences and prose around the first balanced object', () => {
  assert.deepEqual(parseModelOutput('Here you go:\n```json\n{"embedding":{"provider":"dashscope"}}\n```\nDone.'), {
    embedding: { provider: 'dashscope' },
  })
  assert.deepEqual(parseModelOutput('prefix {"a":"}{","nested":{"b":1}} suffix {"ignored":true}'), {
    a: '}{',
    nested: { b: 1 },
  })
  assert.deepEqual(parseModelOutput('```\n{"parse":{"provider":"mineru-cloud","language":"ch"}}\n```'), {
    parse: { provider: 'mineru-cloud', language: 'ch' },
  })
})

test('parseModelOutput rejects empty, truncated, non-JSON and non-object output without echoing text', () => {
  expectSyncError(() => parseModelOutput(''), 502, 'empty_response')
  expectSyncError(() => parseModelOutput('   '), 502, 'empty_response')
  const truncated = expectSyncError(() => parseModelOutput('{"embedding":{"provider":"dashscope"'), 502, 'invalid_json')
  assert.ok(!truncated.message.includes('dashscope'))
  expectSyncError(() => parseModelOutput('no json here'), 502, 'invalid_json')
  expectSyncError(() => parseModelOutput('["not","an","object"]'), 502, 'invalid_json')
  expectSyncError(() => parseModelOutput('{"broken": true,}'), 502, 'invalid_json')
})

test('validateRecognizedFields keeps valid values and drops empty or unknown values', () => {
  const result = validateRecognizedFields({
    embedding: {
      provider: 'dashscope',
      model: 'text-embedding-v4',
      base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      dimension: 1024,
      api_key: 'sk-should-not-survive',
    },
    qdrant_url: 'https://should-not-survive.example.com',
    unknown: { provider: 'dashscope' },
  })
  assert.deepEqual(result.fields, {
    embedding: {
      provider: 'dashscope',
      model: 'text-embedding-v4',
      base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      dimension: 1024,
    },
  })
  assert.deepEqual(result.warnings, [])
  assert.ok(!JSON.stringify(result).includes('sk-should-not-survive'))
  assert.deepEqual(validateRecognizedFields({ embedding: { provider: null, model: '', base_url: '  ', dimension: null } }), {
    fields: {},
    warnings: [],
  })
  assert.deepEqual(validateRecognizedFields(null), { fields: {}, warnings: [] })
})

test('validateRecognizedFields validates enums, lengths, integers and URLs', () => {
  const result = validateRecognizedFields({
    embedding: { provider: 'openrouter', model: 'x'.repeat(201), base_url: 'https://user:pass@example.com/v1', dimension: 1.5 },
    rerank: { provider: 'dashscope', model: '', base_url: 'ftp://example.com' },
    asr: { provider: 'funasr', model: 'x'.repeat(201), base_url: 'https://example.com' },
  })
  assert.deepEqual(result.fields, { rerank: { provider: 'dashscope' }, asr: { provider: 'funasr' } })
  const fields = result.warnings.map((warning) => warning.field)
  assert.ok(fields.includes('embedding.provider'))
  assert.ok(fields.includes('embedding.model'))
  assert.ok(fields.includes('embedding.base_url'))
  assert.ok(fields.includes('embedding.dimension'))
  assert.ok(fields.includes('rerank.base_url'))
  assert.ok(fields.includes('asr.model'))
  assert.ok(fields.includes('asr.base_url'))
  assert.ok(result.warnings.some((warning) => warning.code === 'invalid_url'))
  assert.ok(result.warnings.some((warning) => warning.code === 'conditional_field_dropped' && warning.field === 'asr.base_url'))
  const longUrl = validateRecognizedFields({
    embedding: { provider: 'dashscope', model: 'text-embedding-v4', base_url: 'https://example.com/' + 'a'.repeat(2048) },
  })
  assert.ok(longUrl.warnings.some((warning) => warning.code === 'invalid_url' && warning.field === 'embedding.base_url'))
})

test('validateRecognizedFields applies parse conditions and the full language enum', () => {
  for (const language of PARSE_LANGUAGES) {
    const result = validateRecognizedFields({ parse: { provider: 'mineru-cloud', language } })
    assert.deepEqual(result.fields, { parse: { provider: 'mineru-cloud', language } })
  }
  for (const tier of PARSE_TIERS) {
    const result = validateRecognizedFields({ parse: { provider: 'mineru-local', tier } })
    assert.deepEqual(result.fields, { parse: { provider: 'mineru-local', tier } })
  }
  const cloud = validateRecognizedFields({
    parse: { provider: 'mineru-cloud', tier: 'flash', language: 'ch', model_version: 'vlm' },
  })
  assert.deepEqual(cloud.fields, { parse: { provider: 'mineru-cloud', language: 'ch', model_version: 'vlm' } })
  assert.ok(cloud.warnings.some((warning) => warning.code === 'conditional_field_dropped' && warning.field === 'parse.tier'))
  const local = validateRecognizedFields({
    parse: { provider: 'mineru-local', tier: 'flash', language: 'ch', model_version: 'pipeline' },
  })
  assert.deepEqual(local.fields, { parse: { provider: 'mineru-local', tier: 'flash' } })
  assert.ok(local.warnings.some((warning) => warning.field === 'parse.language'))
  assert.ok(local.warnings.some((warning) => warning.field === 'parse.model_version'))
  const invalid = validateRecognizedFields({ parse: { provider: 'mineru-cloud', language: 'xx', model_version: 'v2' } })
  assert.deepEqual(invalid.fields, { parse: { provider: 'mineru-cloud' } })
  assert.ok(invalid.warnings.some((warning) => warning.field === 'parse.language'))
  assert.ok(invalid.warnings.some((warning) => warning.field === 'parse.model_version'))
})

test('validateRecognizedFields applies sparse conditions and ASR menu warnings', () => {
  const sparse = validateRecognizedFields({
    sparse: { source: 'bm25', provider: 'tei-sparse', model: 'm', base_url: 'https://example.com' },
  })
  assert.deepEqual(sparse.fields, { sparse: { source: 'bm25' } })
  assert.equal(sparse.warnings.filter((warning) => warning.code === 'conditional_field_dropped').length, 3)
  const external = validateRecognizedFields({
    sparse: { source: 'external', provider: 'tei-sparse', model: 'm', base_url: 'https://example.com' },
  })
  assert.deepEqual(external.fields, {
    sparse: { source: 'external', provider: 'tei-sparse', model: 'm', base_url: 'https://example.com' },
  })
  assert.deepEqual(external.warnings, [])

  const localAsr = validateRecognizedFields({ asr: { provider: 'funasr', model: 'custom-model' } })
  assert.deepEqual(localAsr.fields, { asr: { provider: 'funasr', model: 'custom-model' } })
  assert.ok(localAsr.warnings.some((warning) => warning.code === 'asr_model_not_in_menu'))
  const knownAsr = validateRecognizedFields({ asr: { provider: 'funasr', model: 'paraformer-zh' } })
  assert.deepEqual(knownAsr.warnings, [])
  const serviceAsr = validateRecognizedFields({ asr: { provider: 'dashscope', model: 'paraformer-v2', base_url: 'https://example.com' } })
  assert.deepEqual(serviceAsr.fields, {
    asr: { provider: 'dashscope', model: 'paraformer-v2', base_url: 'https://example.com' },
  })
  assert.deepEqual(serviceAsr.warnings, [])
})

test('validateRecognizedFields warns when a provider arrives without a model', () => {
  const result = validateRecognizedFields({ embedding: { provider: 'dashscope' }, rerank: { provider: 'dashscope' } })
  assert.deepEqual(result.fields, {
    embedding: { provider: 'dashscope' },
    rerank: { provider: 'dashscope' },
  })
  assert.equal(result.warnings.filter((warning) => warning.code === 'provider_without_model').length, 2)
})

test('validateRecognizedFields keeps an unverified dimension and drops a fixed-dimension mismatch', () => {
  const unverified = validateRecognizedFields(
    { embedding: { provider: 'dashscope', model: 'text-embedding-v4', dimension: 1024 } },
    { dimensionVerdict: null },
  )
  assert.equal(unverified.fields.embedding?.dimension, 1024)
  assert.ok(unverified.warnings.some((warning) => warning.code === 'dimension_unverified'))

  const fixed = validateRecognizedFields(
    { embedding: { provider: 'dashscope', model: 'text-embedding-v4', dimension: 1024 } },
    { dimensionVerdict: { status: 'ok', type: 'tiered', values: [512] } },
  )
  assert.equal(fixed.fields.embedding?.dimension, undefined)
  assert.ok(fixed.warnings.some((warning) => warning.code === 'embedding_dimension_fixed'))

  const accepted = validateRecognizedFields(
    { embedding: { provider: 'dashscope', model: 'text-embedding-v4', dimension: 1024 } },
    { dimensionVerdict: { status: 'ok', type: 'tiered', values: [1024, 2048] } },
  )
  assert.equal(accepted.fields.embedding?.dimension, 1024)
  assert.deepEqual(accepted.warnings, [])
})

test('validateRecognizedFields returns empty fields for no usable output', () => {
  assert.deepEqual(validateRecognizedFields({}), { fields: {}, warnings: [] })
  assert.deepEqual(validateRecognizedFields({ parse: {} }), { fields: {}, warnings: [] })
  assert.deepEqual(validateRecognizedFields({ embedding: 'not an object' }), { fields: {}, warnings: [] })
})

test('mapRecognitionFailure covers credential, empty and generic model failures', () => {
  const credential = expectSyncError(() => {
    throw mapRecognitionFailure({ code: 'MISSING_CREDENTIAL' })
  }, 502, 'provider_credential')
  assert.ok(!credential.message.includes('MISSING_CREDENTIAL'))
  expectSyncError(
    () => {
      throw mapRecognitionFailure({ code: 'EMPTY_RESPONSE' })
    },
    502,
    'empty_response',
  )
  expectSyncError(
    () => {
      throw mapRecognitionFailure(undefined)
    },
    502,
    'model_call_failed',
  )
  expectSyncError(
    () => {
      throw mapRecognitionFailure({ code: 'RATE_LIMIT' })
    },
    429,
    'rate_limited',
  )
})

test('mapImageAdmissionFailure, catalog and model helpers expose the stable codes', () => {
  expectSyncError(
    () => {
      throw mapImageAdmissionFailure({ code: 'UNSUPPORTED_IMAGE_TYPE' })
    },
    415,
    'invalid_image_type',
  )
  expectSyncError(
    () => {
      throw mapImageAdmissionFailure({ code: 'TOO_MANY_IMAGES' })
    },
    400,
    'too_many_images',
  )
  expectSyncError(
    () => {
      throw mapImageAdmissionFailure(new Error('host storage failed'))
    },
    502,
    'image_admission_failed',
  )
  expectSyncError(
    () => {
      throw catalogUnavailableError()
    },
    503,
    'catalog_unavailable',
  )
  expectSyncError(
    () => {
      throw attachmentsUnavailableError()
    },
    502,
    'attachments_unavailable',
  )
  expectSyncError(
    () => {
      throw unknownModelError()
    },
    404,
    'unknown_model',
  )
  expectSyncError(
    () => {
      throw modelNotVisionError()
    },
    400,
    'model_not_vision',
  )
})

test('the allowlists are shared by the prompt and the validator', () => {
  const prompt = buildSystemPrompt()
  for (const provider of EMBEDDING_PROVIDERS) assert.ok(prompt.includes(provider))
  for (const source of SPARSE_SOURCES) assert.ok(prompt.includes(source))
  for (const provider of RERANK_PROVIDERS) assert.ok(prompt.includes(provider))
  for (const provider of PARSE_PROVIDERS) assert.ok(prompt.includes(provider))
  for (const language of PARSE_LANGUAGES) assert.ok(prompt.includes(language))
  for (const version of PARSE_MODEL_VERSIONS) assert.ok(prompt.includes(version))
  for (const [provider, models] of Object.entries(ASR_MODEL_MENU)) {
    assert.ok(prompt.includes(provider))
    for (const model of models) assert.ok(prompt.includes(model))
  }
})

const SAME_ORIGIN_HEADERS = {
  'content-type': 'application/json',
  'sec-fetch-site': 'same-origin',
  origin: 'http://127.0.0.1:3080',
  host: '127.0.0.1:3080',
}

const DEFAULT_ANSWER = JSON.stringify({
  embedding: { provider: 'dashscope', model: 'text-embedding-v4', dimension: 1024 },
})

function routeModel(overrides: Record<string, unknown> = {}) {
  return {
    alias: 'dsh:p/m',
    provider: 'p',
    model: 'm',
    name: 'M',
    inputModalities: ['text', 'image'],
    efforts: [],
    ...overrides,
  }
}

function fakeRouteRequest(
  body: unknown,
  headers: Record<string, string> = {},
  method = 'POST',
) {
  const raw = Buffer.isBuffer(body) ? body : body === undefined ? undefined : Buffer.from(JSON.stringify(body))
  return {
    method,
    url: CONFIG_RECOGNIZE_ROUTE,
    headers: { ...SAME_ORIGIN_HEADERS, ...headers },
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      if (raw !== undefined) yield raw
    },
  }
}

function fakeRouteResponse() {
  const state = { status: 0, body: '' }
  return {
    state,
    writeHead(status: number) {
      state.status = status
    },
    end(body?: unknown) {
      state.body = body === undefined ? '' : String(body)
    },
  }
}

interface RouteOptions {
  text?: string
  finish?: 'stop' | 'error' | 'aborted'
  failureCode?: string
  models?: Array<Record<string, unknown>>
  catalogFirst?: boolean
  attachments?: 'echo' | 'missing' | 'throw'
}

function makeRoute(options: RouteOptions = {}) {
  let handler: ((req: unknown, res: unknown) => Promise<void>) | undefined
  let registered: { kind: string; path: string } | undefined
  let streamOptions: Record<string, unknown> | undefined
  let refreshCalls = 0
  const admitCalls: unknown[][] = []
  const models = options.models ?? [routeModel()]
  const catalog = {
    origin: 'http://127.0.0.1:3080',
    models,
    byAlias: new Map(models.map((model) => [String(model.alias), model])),
    unavailable: [],
    builtAt: 0,
  }
  let catalogFirst = options.catalogFirst === true
  const text = options.text === undefined ? DEFAULT_ANSWER : options.text
  const llm = {
    async *stream(received: Record<string, unknown>) {
      streamOptions = received
      if (text !== '') yield { type: 'text-delta', index: 0, text }
      if (options.finish === 'error') {
        yield { type: 'finish', reason: { kind: 'error', failure: { code: options.failureCode ?? 'UNKNOWN' } } }
      } else if (options.finish === 'aborted') {
        yield { type: 'finish', reason: { kind: 'aborted' } }
      } else {
        yield { type: 'finish', reason: { kind: 'stop' } }
      }
    },
  }
  const attachments =
    options.attachments === 'missing'
      ? undefined
      : {
          async admitPromptContent(parts: Array<Record<string, unknown>>) {
            admitCalls.push([...parts])
            if (options.attachments === 'throw') {
              const error = new Error('host storage failed') as Error & { code?: string }
              error.code = 'TOO_MANY_IMAGES'
              throw error
            }
            return parts.map((part) =>
              part.type === 'text'
                ? { type: 'text', text: String(part.text ?? '') }
                : { type: 'image', attachment: { sha: part.data } },
            )
          },
        }
  const ctx = {
    inject(_dependencies: string[], callback: (fresh: unknown) => void) {
      callback({
        webServer: {
          register(route: { kind: string; path: string; handler: typeof handler }) {
            registered = { kind: route.kind, path: route.path }
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
    get(name: string) {
      return name === 'attachments' ? attachments : undefined
    },
  }
  const runtime = {
    getOrigin: () => 'http://127.0.0.1:3080',
    getBaseUrl: () => 'http://127.0.0.1:3080/dsh-harness-rag/llm/v1',
    getCatalog: () => {
      if (catalogFirst) {
        catalogFirst = false
        return undefined
      }
      return catalog
    },
    refresh: async () => {
      refreshCalls += 1
      return catalog
    },
  }
  const modelProxy = { token: 'route-token', whenReady: Promise.resolve(runtime) }
  registerConfigRecognize(
    ctx as unknown as ConfigRecognizeContextLike,
    modelProxy as unknown as Parameters<typeof registerConfigRecognize>[1],
  )
  return {
    registered,
    admitCalls,
    refreshCalls: () => refreshCalls,
    streamOptions: () => streamOptions,
    handler: (req: unknown, res: unknown) => {
      if (handler === undefined) throw new Error('recognize route was not registered')
      return handler(req, res)
    },
  }
}

async function callRoute(route: ReturnType<typeof makeRoute>, req: unknown) {
  const res = fakeRouteResponse()
  await route.handler(req, res)
  return { status: res.state.status, body: res.state.body === '' ? null : JSON.parse(res.state.body) }
}

test('registerConfigRecognize serves a JSON answer and pins the call options', async () => {
  const route = makeRoute()
  assert.deepEqual(route.registered, { kind: 'prefix', path: CONFIG_RECOGNIZE_ROUTE })
  const result = await callRoute(route, fakeRouteRequest({ model: 'dsh:p/m', text: 'embedding config' }))
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, {
    fields: { embedding: { provider: 'dashscope', model: 'text-embedding-v4', dimension: 1024 } },
    warnings: [],
  })
  const options = route.streamOptions()
  assert.equal(options?.temperature, 0)
  assert.equal(options?.maxTokens, 3000)
  assert.equal(options?.reasoningEffort, undefined)
  assert.equal(options?.provider, 'p')
  assert.equal(options?.model, 'm')
  assert.equal(typeof options?.sessionId, 'string')
  assert.ok(String(options?.system).includes('JSON'))
  assert.deepEqual((options?.messages as Array<{ role: string; content: unknown }>)[0], {
    role: 'user',
    content: [{ type: 'text', text: 'embedding config' }],
  })
  assert.equal(route.admitCalls.length, 0)
})

test('registerConfigRecognize forwards a requested reasoning effort', async () => {
  const route = makeRoute({ models: [routeModel({ efforts: ['low', 'high'] })] })
  const result = await callRoute(
    route,
    fakeRouteRequest({ model: 'dsh:p/m', text: 'x', reasoning_effort: 'high' }),
  )
  assert.equal(result.status, 200)
  assert.equal(route.streamOptions()?.reasoningEffort, 'high')
})

test('registerConfigRecognize rejects an unknown reasoning effort', async () => {
  const route = makeRoute()
  const result = await callRoute(
    route,
    fakeRouteRequest({ model: 'dsh:p/m', text: 'x', reasoning_effort: 'turbo' }),
  )
  assert.equal(result.status, 400)
  assert.equal(result.body.error.code, 'invalid_request')
  assert.equal(route.streamOptions(), undefined)
})

test('registerConfigRecognize admits images and sends only this round', async () => {
  const route = makeRoute({ text: '{}' })
  const image = { mediaType: 'image/png', data: PNG }
  const result = await callRoute(
    route,
    fakeRouteRequest({ model: 'dsh:p/m', text: '', images: [image, image, image] }),
  )
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { fields: {}, warnings: [] })
  assert.equal(route.admitCalls.length, 1)
  assert.equal(route.admitCalls[0].length, 3)
  const user = (route.streamOptions()?.messages as Array<{ role: string; content: unknown }>)[0]
  assert.equal((user.content as unknown[]).length, 3)
  assert.equal((user.content as Array<{ type: string }>)[0].type, 'image')
})

test('registerConfigRecognize allows text-only requests without the attachment service', async () => {
  const route = makeRoute({ attachments: 'missing', text: '{}' })
  const result = await callRoute(route, fakeRouteRequest({ model: 'dsh:p/m', text: 'only text' }))
  assert.equal(result.status, 200)
  assert.equal(route.admitCalls.length, 0)
})

test('registerConfigRecognize rejects images when the attachment service is missing', async () => {
  const route = makeRoute({ attachments: 'missing', text: '{}' })
  const result = await callRoute(
    route,
    fakeRouteRequest({ model: 'dsh:p/m', text: '', images: [{ mediaType: 'image/png', data: PNG }] }),
  )
  assert.equal(result.status, 502)
  assert.equal(result.body.error.code, 'attachments_unavailable')
  assert.equal(route.streamOptions(), undefined)
})

test('registerConfigRecognize distinguishes unknown and non-vision models', async () => {
  const unknown = makeRoute()
  const unknownResult = await callRoute(unknown, fakeRouteRequest({ model: 'dsh:p/missing', text: 'x' }))
  assert.equal(unknownResult.status, 404)
  assert.equal(unknownResult.body.error.code, 'unknown_model')

  const nonVision = makeRoute({ models: [routeModel({ inputModalities: ['text'] })] })
  const nonVisionResult = await callRoute(nonVision, fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }))
  assert.equal(nonVisionResult.status, 400)
  assert.equal(nonVisionResult.body.error.code, 'model_not_vision')
  assert.equal(nonVision.streamOptions(), undefined)
})

test('registerConfigRecognize enforces method, content type and same origin', async () => {
  const method = makeRoute()
  const methodResult = await callRoute(method, fakeRouteRequest(undefined, {}, 'GET'))
  assert.equal(methodResult.status, 405)
  assert.equal(methodResult.body.error.code, 'method_not_allowed')

  const media = makeRoute()
  const mediaResult = await callRoute(
    media,
    fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }, { 'content-type': 'text/plain' }),
  )
  assert.equal(mediaResult.status, 415)
  assert.equal(mediaResult.body.error.code, 'invalid_request')

  const crossOrigin = makeRoute()
  const crossOriginResult = await callRoute(
    crossOrigin,
    fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }, { origin: 'http://evil.example' }),
  )
  assert.equal(crossOriginResult.status, 403)
  assert.equal(crossOriginResult.body.error.code, 'cross_origin')
  assert.equal(crossOrigin.streamOptions(), undefined)
})

test('registerConfigRecognize rejects a subpath of the recognize route', async () => {
  const route = makeRoute()
  const request = fakeRouteRequest({ model: 'dsh:p/m', text: 'x' })
  request.url = CONFIG_RECOGNIZE_ROUTE + '/extra'
  const result = await callRoute(route, request)
  assert.equal(result.status, 404)
  assert.equal(result.body.error.code, 'not_found')
  assert.equal(route.streamOptions(), undefined)
})

test('registerConfigRecognize enforces the body and request image limits', async () => {
  const bodyLarge = makeRoute()
  const bodyResult = await callRoute(bodyLarge, fakeRouteRequest(Buffer.alloc(MAX_RECOGNIZE_BODY_BYTES + 1, 'a')))
  assert.equal(bodyResult.status, 413)
  assert.equal(bodyResult.body.error.code, 'body_too_large')

  const tooMany = makeRoute()
  const tooManyResult = await callRoute(
    tooMany,
    fakeRouteRequest({
      model: 'dsh:p/m',
      images: [
        { mediaType: 'image/png', data: PNG },
        { mediaType: 'image/png', data: PNG },
        { mediaType: 'image/png', data: PNG },
        { mediaType: 'image/png', data: PNG },
      ],
    }),
  )
  assert.equal(tooManyResult.status, 400)
  assert.equal(tooManyResult.body.error.code, 'too_many_images')

  const badBase64 = makeRoute()
  const badBase64Result = await callRoute(
    badBase64,
    fakeRouteRequest({ model: 'dsh:p/m', images: [{ mediaType: 'image/png', data: 'abc' }] }),
  )
  assert.equal(badBase64Result.status, 400)
  assert.equal(badBase64Result.body.error.code, 'invalid_request')
})

test('registerConfigRecognize returns 200 empty fields for empty output', async () => {
  const emptyFields = makeRoute({ text: '{}' })
  const emptyFieldsResult = await callRoute(emptyFields, fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }))
  assert.equal(emptyFieldsResult.status, 200)
  assert.deepEqual(emptyFieldsResult.body, { fields: {}, warnings: [] })

  const emptyCompletion = makeRoute({ text: '' })
  const emptyCompletionResult = await callRoute(emptyCompletion, fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }))
  assert.equal(emptyCompletionResult.status, 200)
  assert.deepEqual(emptyCompletionResult.body, { fields: {}, warnings: [] })
})

test('registerConfigRecognize maps provider failures and invalid JSON without raw text', async () => {
  const credential = makeRoute({ text: '', finish: 'error', failureCode: 'MISSING_CREDENTIAL' })
  const credentialResult = await callRoute(credential, fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }))
  assert.equal(credentialResult.status, 502)
  assert.equal(credentialResult.body.error.code, 'provider_credential')
  assert.ok(!JSON.stringify(credentialResult.body).includes('MISSING_CREDENTIAL'))

  const invalid = makeRoute({ text: 'the model wrote prose, not JSON' })
  const invalidResult = await callRoute(invalid, fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }))
  assert.equal(invalidResult.status, 502)
  assert.equal(invalidResult.body.error.code, 'invalid_json')
  assert.ok(!JSON.stringify(invalidResult.body).includes('prose'))

  const aborted = makeRoute({ text: '', finish: 'aborted' })
  const abortedResult = await callRoute(aborted, fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }))
  assert.equal(abortedResult.status, 502)
  assert.equal(abortedResult.body.error.code, 'model_call_failed')
})

test('registerConfigRecognize maps attachment admission failures and refreshes a missing catalog', async () => {
  const rejected = makeRoute({ text: '{}', attachments: 'throw' })
  const rejectedResult = await callRoute(
    rejected,
    fakeRouteRequest({ model: 'dsh:p/m', images: [{ mediaType: 'image/png', data: PNG }] }),
  )
  assert.equal(rejectedResult.status, 413)
  assert.equal(rejectedResult.body.error.code, 'image_too_large')

  const refreshed = makeRoute({ text: '{}', catalogFirst: true })
  const refreshedResult = await callRoute(refreshed, fakeRouteRequest({ model: 'dsh:p/m', text: 'x' }))
  assert.equal(refreshedResult.status, 200)
  assert.equal(refreshed.refreshCalls(), 1)
})

