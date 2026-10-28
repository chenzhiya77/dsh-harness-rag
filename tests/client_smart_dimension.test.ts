import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

interface DimensionVerdict {
  status?: string
  type?: string | null
  native?: number | null
  values?: readonly number[]
  candidates?: readonly number[]
  detail?: string
}

type Decision = 'empty' | 'fixed' | 'apply' | 'unverified'

function loadDimensionDecision() {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  let registered: { factory?: unknown } | undefined
  const sandbox: Record<string, unknown> = {
    window: {
      __ModuleLoader__: {
        load(definition: { factory?: unknown }) {
          registered = definition
        },
      },
    },
  }
  vm.runInNewContext(source, sandbox)
  assert.equal(typeof registered?.factory, 'function', 'client.js registers a module factory')
  const decision = sandbox.ragSmartDimensionDecision
  assert.equal(typeof decision, 'function', 'client.js defines the fixed-dimension decision')
  return decision as (
    dimension: unknown,
    recognizedProvider: unknown,
    formProvider: unknown,
    verdict: DimensionVerdict | null | undefined,
  ) => Decision
}

test('client.js drops a recognized dimension only for the probed fixed-dimension provider', () => {
  const decide = loadDimensionDecision()
  // 引擎 probe-dimensions 的 fixed 回答形状（见 rag_config.py RagDimensionProbeResponse）。
  const fixed: DimensionVerdict = {
    status: 'ok',
    type: 'fixed',
    native: 768,
    values: [768],
    candidates: [256, 512, 768, 1024],
    detail: '该模型不接受 dimensions 参数，固定 768 维',
  }

  assert.equal(decide(1024, 'dashscope', 'dashscope', fixed), 'fixed')
  assert.equal(decide(1024, '', 'dashscope', fixed), 'fixed')
  assert.equal(decide(1024, 'volcengine-ark', 'dashscope', fixed), 'unverified')
  assert.equal(decide(1024, 'dashscope', 'volcengine-ark', fixed), 'unverified')
  assert.equal(decide(1024, 'dashscope', 'dashscope', { status: 'unreachable', type: null, native: null }), 'unverified')
  assert.equal(decide(1024, 'dashscope', 'dashscope', null), 'unverified')
  assert.equal(decide(1024, 'dashscope', 'dashscope', undefined), 'unverified')

  assert.equal(decide(1024, 'dashscope', 'dashscope', { status: 'ok', type: 'tiered', native: 1024, values: [256, 1024] }), 'apply')
  assert.equal(decide(1024, 'dashscope', 'dashscope', { status: 'ok', type: 'range', native: 1536, values: [1536] }), 'apply')
  assert.equal(decide(1024, 'dashscope', 'dashscope', { status: 'ok', type: 'fixed', native: null, values: [] }), 'apply')

  assert.equal(decide(null, 'dashscope', 'dashscope', fixed), 'empty')
  assert.equal(decide(undefined, 'dashscope', 'dashscope', fixed), 'empty')
  assert.equal(decide('', 'dashscope', 'dashscope', fixed), 'empty')
})
