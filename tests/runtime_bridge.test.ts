import test from 'node:test'
import assert from 'node:assert/strict'
import { createRuntimeBridge, embeddingModelOf, type BridgeHost } from '../src/runtime/bridge.ts'
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

