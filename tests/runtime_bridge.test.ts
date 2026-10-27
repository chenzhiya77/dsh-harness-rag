import test from 'node:test'
import assert from 'node:assert/strict'
import { createRuntimeBridge, embeddingModelOf, needsEmbeddingFrom, needsMineruFrom, type BridgeHost } from '../src/runtime/bridge.ts'
import { defaultConfig } from '../src/settings.ts'

const ENV = { DSH_HOME: 'C:/hrag-bridge-test' }

function hostWithPicker(pick?: (signal: AbortSignal) => Promise<string | null>): BridgeHost {
  return {
    get: () => undefined,
    inject: (names, callback) => {
      if (!names.includes('directoryPicker') || !pick) return
      callback({
        directoryPicker: {
          capability: () => ({ kind: 'native', pick }),
        },
      } as unknown as BridgeHost)
    },
  }
}

test('embedding model: read from the effective config block', () => {
  assert.equal(embeddingModelOf({ config: { embedding_model: 'text-embedding-v4' } }), 'text-embedding-v4')
  assert.equal(embeddingModelOf({ config: { embedding_model: '  ' } }), null)
  assert.equal(embeddingModelOf({ config: { embedding_model: null } }), null)
  assert.equal(embeddingModelOf({ config: {} }), null)
})

test('embedding model: missing or malformed payloads mean "not configured"', () => {
  assert.equal(embeddingModelOf(null), null)
  assert.equal(embeddingModelOf({}), null)
  assert.equal(embeddingModelOf({ embedding_model: 'legacy-field' }), null)
  assert.equal(embeddingModelOf({ config: { embedding_model: 42 } }), null)
})

test('embedding readiness: only the model decides, never the environment', () => {
  assert.equal(needsEmbeddingFrom({ config: { embedding_model: 'text-embedding-v4' } }), false)
  assert.equal(needsEmbeddingFrom({ config: { embedding_model: '' } }), true)
  assert.equal(needsEmbeddingFrom({ config: { embedding_model: '   ' } }), true)
  assert.equal(needsEmbeddingFrom({ config: { embedding_model: null } }), true)
  assert.equal(needsEmbeddingFrom({ config: {} }), true)
  assert.equal(needsEmbeddingFrom(null), true)
})

test('MinerU readiness: cloud without a token needs one', () => {
  assert.equal(
    needsMineruFrom({ config: { parse_provider: 'mineru-cloud' }, sources: { mineru_api_token: 'unset' } }),
    true,
  )
})

test('MinerU readiness: a stored or environment token counts as configured', () => {
  assert.equal(
    needsMineruFrom({ config: { parse_provider: 'mineru-cloud' }, sources: { mineru_api_token: 'ui' } }),
    false,
  )
  assert.equal(
    needsMineruFrom({ config: { parse_provider: 'mineru-cloud' }, sources: { mineru_api_token: 'env' } }),
    false,
  )
})

test('MinerU readiness: local parsing and malformed payloads never block', () => {
  assert.equal(
    needsMineruFrom({ config: { parse_provider: 'mineru-local' }, sources: { mineru_api_token: 'unset' } }),
    false,
  )
  assert.equal(needsMineruFrom({ config: { parse_provider: 'mineru-cloud' } }), false)
  assert.equal(needsMineruFrom({ sources: { mineru_api_token: 'unset' } }), false)
  assert.equal(needsMineruFrom({ config: { parse_provider: 42 }, sources: { mineru_api_token: 'unset' } }), false)
  assert.equal(needsMineruFrom(null), false)
})

// The host's native chooser reads the caller-lifetime signal on entry, so the
// bridge must hand it a real one (a bare pick() throws inside the driver).
test('pick: the host capability receives a caller-lifetime signal', async () => {
  let seen: AbortSignal | undefined
  const bridge = createRuntimeBridge(
    hostWithPicker(async (signal) => {
      seen = signal
      return 'D:/chosen'
    }),
    defaultConfig,
    ENV,
  )
  try {
    assert.equal(await bridge.ops.pick(), 'D:/chosen')
    assert.ok(seen instanceof AbortSignal, 'a signal reaches the capability')
    assert.equal(seen?.aborted, false)
  } finally {
    bridge.stop()
  }
})

test('pick: a cancelled chooser resolves null', async () => {
  const bridge = createRuntimeBridge(hostWithPicker(async () => null), defaultConfig, ENV)
  try {
    assert.equal(await bridge.ops.pick(), null)
  } finally {
    bridge.stop()
  }
})

test('pick: unloading closes an open chooser and reports no change', async () => {
  let opened: (() => void) | undefined
  const ready = new Promise<void>((resolve) => {
    opened = resolve
  })
  const bridge = createRuntimeBridge(
    hostWithPicker(
      (signal) =>
        new Promise<string | null>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('native directory picker aborted')))
          opened?.()
        }),
    ),
    defaultConfig,
    ENV,
  )
  const pending = bridge.ops.pick()
  await ready
  bridge.stop()
  assert.equal(await pending, null)
})

