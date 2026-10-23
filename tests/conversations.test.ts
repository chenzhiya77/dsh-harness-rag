import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createBindingsStore } from '../src/bindings.ts'
import {
  conversationOps,
  createSession,
  mergeRows,
  type ConversationsHost,
  type SessionControllerLike,
  type SessionRowLike,
} from '../src/conversations.ts'

const NOW = '2026-10-23T05:00:00.000Z'

function tempStore() {
  const store = createBindingsStore({ homeDir: mkdtempSync(join(tmpdir(), 'hrag-conv-')), now: () => NOW })
  store.loadSync()
  return store
}

function row(overrides: Partial<SessionRowLike> & { sessionId: string }): SessionRowLike {
  return { updatedAt: 1, running: false, blank: false, ...overrides }
}

function fakeController(
  rows: SessionRowLike[] = [],
  createImpl?: SessionControllerLike['create'],
): SessionControllerLike {
  return {
    list: async () => rows,
    create: createImpl ?? (async () => ({ sessionId: 'new-session' })),
  }
}

function host(controller: SessionControllerLike | null): ConversationsHost {
  return { controller }
}

// ── mergeRows ───────────────────────────────────────────────────────────────

test('mergeRows: only bound sessions plus the current one, newest first', () => {
  const rows = [
    row({ sessionId: 'a', updatedAt: 10, projections: { values: { title: '周报' } } }),
    row({ sessionId: 'b', updatedAt: 30, projections: { values: { title: '复盘' } } }),
    row({ sessionId: 'c', updatedAt: 20, cwd: 'E:/work', running: true }),
  ]
  const merged = mergeRows(
    rows,
    { a: { kbId: 'kb-1', kbName: '产品文档', updatedAt: NOW }, b: { kbId: 'kb-2', updatedAt: NOW } },
    'c',
  )
  assert.deepEqual(merged.map((item) => item.sessionId), ['b', 'c', 'a'])
  assert.deepEqual(merged[0], {
    sessionId: 'b',
    title: '复盘',
    updatedAt: 30,
    running: false,
    blank: false,
    kbId: 'kb-2',
  })
  assert.deepEqual(merged[1], {
    sessionId: 'c',
    title: null,
    updatedAt: 20,
    running: true,
    blank: false,
    cwd: 'E:/work',
    kbId: null,
  })
  assert.equal(merged[2].kbName, '产品文档')
})

test('mergeRows: a bound session missing from the list is dropped', () => {
  const merged = mergeRows([row({ sessionId: 'a' })], { gone: { kbId: 'kb-1', updatedAt: NOW } })
  assert.deepEqual(merged, [])
})

test('mergeRows: an unbound current session is included with kbId null', () => {
  const merged = mergeRows([row({ sessionId: 'a' })], {}, 'a')
  assert.equal(merged.length, 1)
  assert.equal(merged[0].kbId, null)
})

// ── createSession ───────────────────────────────────────────────────────────

test('createSession: drops an unavailable preset and retries once', async () => {
  const calls: Array<{ cwd?: string; agentPreset?: string }> = []
  const controller = fakeController([], async (request) => {
    calls.push(request)
    if (request.agentPreset) {
      const error = new Error('preset missing') as Error & { code: string }
      error.code = 'agent-preset/not-found'
      throw error
    }
    return { sessionId: 'fallback-session' }
  })

  const created = await createSession(controller, { cwd: 'E:/work', agentPreset: 'harness-rag-knowledge' })
  assert.deepEqual(created, { sessionId: 'fallback-session' })
  assert.deepEqual(calls, [{ cwd: 'E:/work', agentPreset: 'harness-rag-knowledge' }, { cwd: 'E:/work' }])
})

test('createSession: other failures propagate without a retry', async () => {
  let calls = 0
  const controller = fakeController([], async () => {
    calls += 1
    const error = new Error('boom') as Error & { code: string }
    error.code = 'gateway/internal'
    throw error
  })
  await assert.rejects(createSession(controller, { agentPreset: 'p' }), /boom/)
  assert.equal(calls, 1)
})

test('createSession: no preset requested means a single call', async () => {
  const calls: Array<{ cwd?: string }> = []
  const controller = fakeController([], async (request) => {
    calls.push(request)
    return { sessionId: 's' }
  })
  await createSession(controller, { cwd: 'E:/work' })
  assert.deepEqual(calls, [{ cwd: 'E:/work' }])
})

test('createSession: dropping an unavailable preset keeps the workspace', async () => {
  const calls: Array<{ workspaceId?: string; cwd?: string; agentPreset?: string }> = []
  const controller = fakeController([], async (request) => {
    calls.push(request)
    if (request.agentPreset) {
      const error = new Error('preset missing') as Error & { code: string }
      error.code = 'agent-preset/not-found'
      throw error
    }
    return { sessionId: 's' }
  })
  await createSession(controller, { workspaceId: 'ws-1', agentPreset: 'p' })
  assert.deepEqual(calls, [{ workspaceId: 'ws-1', agentPreset: 'p' }, { workspaceId: 'ws-1' }])
})

// ── ops ─────────────────────────────────────────────────────────────────────

test('ops: list reports not-ready without a controller', async () => {
  const ops = conversationOps({ host: host(null), bindings: tempStore() })
  assert.deepEqual(await ops['conversations/list']({}), { ready: false, items: [] })
})

test('ops: list merges bindings and keeps the current session', async () => {
  const store = tempStore()
  await store.set('a', 'kb-1', '产品文档')
  const ops = conversationOps({
    host: host(fakeController([row({ sessionId: 'a' }), row({ sessionId: 'b' })])),
    bindings: store,
  })
  const listed = (await ops['conversations/list']({ currentSessionId: 'b' })) as {
    ready: boolean
    items: Array<{ sessionId: string; kbId: string | null }>
  }
  assert.equal(listed.ready, true)
  assert.deepEqual(listed.items.map((item) => [item.sessionId, item.kbId]), [
    ['a', 'kb-1'],
    ['b', null],
  ])
})

test('ops: list accepts the host service envelope { items }', async () => {
  const store = tempStore()
  await store.set('a', 'kb-1')
  const controller: SessionControllerLike = {
    list: async () => ({ items: [row({ sessionId: 'a' }), row({ sessionId: 'b' })] }),
    create: async () => ({ sessionId: 'new-session' }),
  }
  const ops = conversationOps({ host: host(controller), bindings: store })
  const listed = (await ops['conversations/list']({ currentSessionId: 'b' })) as {
    ready: boolean
    items: Array<{ sessionId: string; kbId: string | null }>
  }
  assert.equal(listed.ready, true)
  assert.deepEqual(listed.items.map((item) => [item.sessionId, item.kbId]), [
    ['a', 'kb-1'],
    ['b', null],
  ])
})

test('ops: bind and unbind write through the store and drive the gating hooks', async () => {
  const store = tempStore()
  const gateCalls: string[] = []
  const ops = conversationOps({
    host: host(fakeController()),
    bindings: store,
    gating: {
      onBound: (sessionId) => gateCalls.push('bound:' + sessionId),
      onUnbound: (sessionId) => gateCalls.push('unbound:' + sessionId),
    },
  })

  await ops['conversations/bind']({ sessionId: 's1', kbId: 'kb-a', kbName: ' 产品文档 ' })
  assert.deepEqual(store.get('s1'), { kbId: 'kb-a', kbName: '产品文档', updatedAt: NOW })
  assert.deepEqual(gateCalls, ['bound:s1'])

  await ops['conversations/unbind']({ sessionId: 's1' })
  assert.equal(store.get('s1'), undefined)
  assert.deepEqual(gateCalls, ['bound:s1', 'unbound:s1'])
})

test('ops: bind rejects a blank kb id', async () => {
  const ops = conversationOps({ host: host(fakeController()), bindings: tempStore() })
  await assert.rejects(ops['conversations/bind']({ sessionId: 's1', kbId: '  ' }), /kbId/)
})

test('ops: create makes the session, writes the binding, and mounts the tools', async () => {
  const store = tempStore()
  const calls: Array<{ cwd?: string; agentPreset?: string }> = []
  const controller = fakeController([], async (request) => {
    calls.push(request)
    return { sessionId: 'fresh' }
  })
  const gateCalls: string[] = []
  const ops = conversationOps({
    host: host(controller),
    bindings: store,
    gating: {
      onBound: (sessionId) => gateCalls.push(sessionId),
      onUnbound: () => {},
    },
  })

  const created = await ops['conversations/create']({ cwd: 'E:/work', kbId: 'kb-a', kbName: '产品文档' })
  assert.deepEqual(created, { sessionId: 'fresh' })
  // No preset on purpose: tools mount per binding, not per preset (D5).
  assert.deepEqual(calls, [{ cwd: 'E:/work' }])
  assert.deepEqual(store.get('fresh'), { kbId: 'kb-a', kbName: '产品文档', updatedAt: NOW })
  assert.deepEqual(gateCalls, ['fresh'])
})

test('ops: create without a controller is a 503', async () => {
  const ops = conversationOps({ host: host(null), bindings: tempStore() })
  await assert.rejects(ops['conversations/create']({ kbId: 'kb-a' }), (error: unknown) => {
    const info = error as { info?: { status?: number } }
    return info.info?.status === 503
  })
})

// ── workspace attach (the panel's new-session gap) ──────────────────────────

test('ops: create goes through the workspace that owns the cwd', async () => {
  const store = tempStore()
  const calls: Array<{ workspaceId?: string; cwd?: string }> = []
  const controller = fakeController([], async (request) => {
    calls.push(request)
    return { sessionId: 'fresh' }
  })
  const ops = conversationOps({
    host: {
      controller,
      workspaces: {
        resolveByPath: async (path) => (path === 'E:/work' ? { id: 'ws-1' } : undefined),
      },
    },
    bindings: store,
  })
  const created = await ops['conversations/create']({ cwd: 'E:/work', kbId: 'kb-a' })
  assert.deepEqual(created, { sessionId: 'fresh' })
  // workspaceId and cwd are exclusive on the host path; the workspace carries it.
  assert.deepEqual(calls, [{ workspaceId: 'ws-1' }])
  assert.deepEqual(store.get('fresh'), { kbId: 'kb-a', updatedAt: NOW })
})

test('ops: create falls back to cwd when no workspace owns the path', async () => {
  const failures = [
    async () => undefined,
    async () => {
      throw new Error('ENOENT')
    },
  ]
  for (const resolveByPath of failures) {
    const calls: Array<{ workspaceId?: string; cwd?: string }> = []
    const controller = fakeController([], async (request) => {
      calls.push(request)
      return { sessionId: 'fresh' }
    })
    const ops = conversationOps({
      host: { controller, workspaces: { resolveByPath } },
      bindings: tempStore(),
    })
    await ops['conversations/create']({ cwd: 'E:/nowhere', kbId: 'kb-a' })
    assert.deepEqual(calls, [{ cwd: 'E:/nowhere' }])
  }
})
