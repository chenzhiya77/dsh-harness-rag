import assert from 'node:assert/strict'
import { join } from 'node:path'
import test from 'node:test'
import { LANGFUSE_ENV_KEYS, runtimeEngineExtras } from '../src/runtime/engine_env.ts'

test('engine extras prepend the bundled ffmpeg and point tiktoken at the pack', () => {
  const extras = runtimeEngineExtras('C:\\rt', { PATH: 'C:\\Windows' })
  assert.equal(extras.PATH, `${join('C:\\rt', 'ffmpeg')};C:\\Windows`)
  assert.equal(extras.TIKTOKEN_CACHE_DIR, join('C:\\rt', 'tiktoken-cache'))
})

test('engine extras accept the Windows Path spelling and an empty host env', () => {
  const withPath = runtimeEngineExtras('C:\\rt', { Path: 'C:\\Windows' })
  assert.equal(withPath.PATH, `${join('C:\\rt', 'ffmpeg')};C:\\Windows`)
  const empty = runtimeEngineExtras('C:\\rt', {})
  assert.equal(empty.PATH, join('C:\\rt', 'ffmpeg'))
})

test('langfuse variables pass through only when set', () => {
  const extras = runtimeEngineExtras('C:\\rt', {
    PATH: 'C:\\Windows',
    LANGFUSE_TRACING: 'true',
    LANGFUSE_PUBLIC_KEY: 'pk-lf-test',
    LANGFUSE_SECRET_KEY: '',
    LANGFUSE_BASE_URL: 'http://127.0.0.1:3999',
  })
  assert.equal(extras.LANGFUSE_TRACING, 'true')
  assert.equal(extras.LANGFUSE_PUBLIC_KEY, 'pk-lf-test')
  assert.equal(extras.LANGFUSE_BASE_URL, 'http://127.0.0.1:3999')
  assert.equal(extras.LANGFUSE_SECRET_KEY, undefined)
  for (const key of LANGFUSE_ENV_KEYS) {
    if (key !== 'LANGFUSE_TRACING' && key !== 'LANGFUSE_PUBLIC_KEY' && key !== 'LANGFUSE_BASE_URL') {
      assert.equal(extras[key], undefined)
    }
  }
})
