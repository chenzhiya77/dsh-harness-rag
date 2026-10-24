import test from 'node:test'
import assert from 'node:assert/strict'
import { createHostSpawn, type HostHandle, type HostSpawnSpec } from '../src/runtime/spawn.ts'
import type { SpawnRequest } from '../src/runtime/process.ts'

const request: SpawnRequest = {
  command: 'C:\\root\\runtime\\2.1.0-1\\python\\python.exe',
  args: ['-m', 'uvicorn', 'app.gateway.knowledge_app:app'],
  cwd: 'C:\\root',
  env: { DEER_FLOW_API_TOKEN: 'tkn' },
}

interface FakeHost {
  spec: HostSpawnSpec | null
  handle: HostHandle
  terminated: number
  emit(text: string): void
  exit(code: number | null): void
}

function fakeHost(): FakeHost {
  const state = { text: '' }
  let resolveDone: (value: { exitCode: number | null; signal: string | null }) => void = () => {}
  const done = new Promise<{ exitCode: number | null; signal: string | null }>((resolve) => {
    resolveDone = resolve
  })
  const fake: FakeHost = {
    spec: null,
    terminated: 0,
    handle: {
      done,
      collected: {
        stdout: {
          readFrom: (offset) => ({ text: state.text.slice(offset), offset: state.text.length, lossy: false }),
        },
      },
      terminate: () => {
        fake.terminated += 1
      },
      waitForExit: async () => {},
    },
    emit(text: string) {
      state.text += text
    },
    exit(code: number | null) {
      resolveDone({ exitCode: code, signal: null })
    },
  }
  return fake
}

function hostOf(fake: FakeHost) {
  return {
    spawn(spec: HostSpawnSpec) {
      fake.spec = spec
      return fake.handle
    },
  }
}

test('host spawn: the command becomes argv[0] and env is passed explicitly', () => {
  const fake = fakeHost()
  const spawn = createHostSpawn(hostOf(fake), { pollMs: 5 })

  spawn(request)

  assert.deepEqual(fake.spec?.argv, [request.command, ...request.args])
  assert.equal(fake.spec?.cwd, request.cwd)
  assert.deepEqual(fake.spec?.env, { DEER_FLOW_API_TOKEN: 'tkn' })
  assert.equal(fake.spec?.stdio.stdin, 'ignore')
  assert.deepEqual(fake.spec?.stdio.stdout, { maxBytes: 256 * 1024 })
})

test('host spawn: collected output reaches the log listeners and the exit code follows', async () => {
  const fake = fakeHost()
  const spawn = createHostSpawn(hostOf(fake), { pollMs: 5 })
  const chunks: string[] = []
  let exitCode: number | null | undefined

  const child = spawn(request)
  child.onData('stdout', (chunk) => chunks.push(chunk))
  child.onExit((code) => {
    exitCode = code
  })
  fake.emit('listening on 8020\n')
  await new Promise((resolve) => setTimeout(resolve, 30))
  fake.emit('ready\n')
  fake.exit(0)
  await new Promise((resolve) => setTimeout(resolve, 30))

  assert.deepEqual(chunks, ['listening on 8020\n', 'ready\n'])
  assert.equal(exitCode, 0)
})

test('host spawn: a failed spawn surfaces as a non-zero exit', async () => {
  const fake = fakeHost()
  const handle: HostHandle = {
    ...fake.handle,
    done: Promise.reject(new Error('no such command')),
  }
  const spawn = createHostSpawn({ spawn: () => handle }, { pollMs: 5 })
  let exitCode: number | null | undefined

  spawn(request).onExit((code) => {
    exitCode = code
  })
  await new Promise((resolve) => setTimeout(resolve, 20))

  assert.equal(exitCode, -1)
})

test('host spawn: kill goes through the provider terminate range', () => {
  const fake = fakeHost()
  const spawn = createHostSpawn(hostOf(fake), { pollMs: 5 })

  const child = spawn(request)
  child.kill()

  assert.equal(fake.terminated, 1)
})

test('host spawn: no pid is exposed because the provider keeps target identity private', () => {
  const fake = fakeHost()
  const spawn = createHostSpawn(hostOf(fake), { pollMs: 5 })

  assert.equal(spawn(request).pid, undefined)
})
