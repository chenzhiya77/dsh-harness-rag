import test from 'node:test'
import assert from 'node:assert/strict'
import { planPorts, DEFAULT_PORTS } from '../src/runtime/ports.ts'

function occupier(...ports: number[]): (port: number) => boolean {
  const taken = new Set(ports)
  return (port) => !taken.has(port)
}

test('ports: free defaults are kept as they are', async () => {
  const result = await planPorts({ isFree: occupier() })

  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.ports, DEFAULT_PORTS)
})

test('ports: a busy http port moves up and the grpc port follows without colliding', async () => {
  const result = await planPorts({ isFree: occupier(6333) })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.ports.qdrantHttp, 6334)
    assert.equal(result.ports.qdrantGrpc, 6335)
    assert.equal(result.ports.knowledge, 8020)
  }
})

test('ports: both qdrant defaults busy shift by two', async () => {
  const result = await planPorts({ isFree: occupier(6333, 6334) })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.ports.qdrantHttp, 6335)
    assert.equal(result.ports.qdrantGrpc, 6336)
  }
})

test('ports: a busy knowledge port moves up on its own', async () => {
  const result = await planPorts({ isFree: occupier(8020) })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.ports.knowledge, 8021)
})

test('ports: preferred ports can be overridden', async () => {
  const result = await planPorts({
    preferred: { qdrantHttp: 16333, qdrantGrpc: 16334, knowledge: 18020 },
    isFree: occupier(16334),
  })

  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.ports, { qdrantHttp: 16333, qdrantGrpc: 16335, knowledge: 18020 })
})

test('ports: a fully occupied range reports no_port for the role', async () => {
  const result = await planPorts({ isFree: () => false, span: 4 })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'no_port')
})

test('ports: the async probe is awaited in order', async () => {
  const seen: number[] = []
  const result = await planPorts({
    isFree: async (port) => {
      seen.push(port)
      return port !== 6333
    },
  })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.ports.qdrantHttp, 6334)
  assert.deepEqual(seen, [6333, 6334, 6335, 8020])
})
