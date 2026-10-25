import test from 'node:test'
import assert from 'node:assert/strict'
import { embeddingModelOf } from '../src/runtime/bridge.ts'

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
