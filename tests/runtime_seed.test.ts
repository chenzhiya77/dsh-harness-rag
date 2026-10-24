import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  seedRuntimeConfig,
  updateSqliteDir,
  type SeedRequest,
} from '../src/runtime/seed.ts'

const EXAMPLE = `# operator config
config_version: 44
sandbox:
  use: deerflow.sandbox.local:LocalSandboxProvider
models:
  - name: chat
    use: deepseek:ChatDeepSeek/PatchedChatDeepSeek

# The database block is commented out upstream:
# database:
#   backend: sqlite
#   sqlite_dir: .deer-flow/data
`

function fixture(example = EXAMPLE): { root: string; engineRoot: string; configPath: string; request: SeedRequest } {
  const root = mkdtempSync(join(tmpdir(), 'hrag-seed-'))
  const engineRoot = join(root, 'engine')
  mkdirSync(engineRoot, { recursive: true })
  writeFileSync(join(engineRoot, 'config.example.yaml'), example)
  const configPath = join(root, 'config', 'config.yaml')
  return { root, engineRoot, configPath, request: { root, engineRoot, qdrantUrl: 'http://127.0.0.1:6333' } }
}

// ── config.yaml ─────────────────────────────────────────────────────────────

test('seed: the example is copied verbatim and the database block is appended', () => {
  const f = fixture()

  const result = seedRuntimeConfig(f.request)

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.created.config, true)
  const text = readFileSync(f.configPath, 'utf8')
  assert.ok(text.startsWith(EXAMPLE), 'the example bytes are untouched')
  const lines = text.split('\n')
  assert.equal(lines.filter((line) => /^database:/.test(line)).length, 1, 'exactly one active block')
  assert.match(text, new RegExp(`\\n  sqlite_dir: '${f.root.replace(/\\/g, '\\\\')}`))
  assert.match(text, /^ {2}backend: sqlite$/m)
})

test('seed: a missing example is reported, not invented', async () => {
  const root = mkdtempSync(join(tmpdir(), 'hrag-seed-'))

  const result = seedRuntimeConfig({ root, engineRoot: join(root, 'engine'), qdrantUrl: 'x' })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'missing_example')
})

test('seed: an active database block keeps every other key', () => {
  const example = 'config_version: 44\nsandbox:\n  use: x\ndatabase:\n  backend: sqlite\n  sqlite_dir: .deer-flow/data\nlogging:\n  level: INFO\n'
  const f = fixture(example)

  const result = seedRuntimeConfig(f.request)

  assert.equal(result.ok, true)
  const text = readFileSync(f.configPath, 'utf8')
  assert.equal(text.split('\n').filter((line) => /^database:/.test(line)).length, 1)
  assert.match(text, /logging:\n {2}level: INFO\n/)
  assert.ok(!text.includes('.deer-flow/data'), 'the old path is gone')
})

test('seed: an active block without sqlite_dir gains one', () => {
  const f = fixture('database:\n  backend: sqlite\nlogging:\n  level: INFO\n')

  seedRuntimeConfig(f.request)

  const text = readFileSync(f.configPath, 'utf8')
  assert.equal(text.split('\n').filter((line) => /^database:/.test(line)).length, 1)
  assert.match(text, /^database:\n {2}sqlite_dir: '/m)
})

test('seed: a re-seed at another root rewrites only the sqlite_dir line', () => {
  const f = fixture()
  seedRuntimeConfig(f.request)
  const first = readFileSync(f.configPath, 'utf8')
  const movedRoot = join(f.root, 'moved')
  mkdirSync(movedRoot, { recursive: true })
  renameSync(join(f.root, 'config'), join(movedRoot, 'config'))

  const result = seedRuntimeConfig({ ...f.request, root: movedRoot })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.created.config, false)
  const second = readFileSync(join(movedRoot, 'config', 'config.yaml'), 'utf8')
  const changed = second
    .split('\n')
    .filter((line, index) => line !== first.split('\n')[index])
  assert.equal(changed.length, 1, `only sqlite_dir changed: ${JSON.stringify(changed)}`)
  assert.match(changed[0], /^ {2}sqlite_dir: '/)
})

test('seed: updateSqliteDir is a no-op when the path already matches', () => {
  const f = fixture()
  seedRuntimeConfig(f.request)
  const text = readFileSync(f.configPath, 'utf8')

  const once = updateSqliteDir(text, join(f.root, 'state', 'data'))

  assert.equal(once.changed, false)
  assert.equal(once.text, text)
})

test('seed: an already-seeded config is reported as unchanged', () => {
  const f = fixture()
  seedRuntimeConfig(f.request)

  const result = seedRuntimeConfig(f.request)

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.created.config, false)
  assert.equal(existsSync(join(f.root, 'config', 'config.yaml')), true)
})

// ── rag_config.json / models_config.json ────────────────────────────────────

test('rag: an absent file is created with the qdrant url', () => {
  const f = fixture()

  const result = seedRuntimeConfig(f.request)

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.created.rag, true)
  const raw = JSON.parse(readFileSync(join(f.root, 'config', 'rag_config.json'), 'utf8'))
  assert.deepEqual(raw, { qdrant_url: 'http://127.0.0.1:6333' })
})

test('rag: an existing file keeps every other key and only moves qdrant_url', () => {
  const f = fixture()
  mkdirSync(join(f.root, 'config'), { recursive: true })
  const path = join(f.root, 'config', 'rag_config.json')
  const existing = {
    qdrant_url: 'http://127.0.0.1:6333',
    embedding_model: 'text-embedding-v4',
    embedding_dimension: 1024,
    vlm_thinking: true,
  }
  writeFileSync(path, JSON.stringify(existing, null, 2))

  const result = seedRuntimeConfig({ ...f.request, qdrantUrl: 'http://127.0.0.1:6433' })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.created.rag, false)
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(raw.qdrant_url, 'http://127.0.0.1:6433')
  assert.equal(raw.embedding_model, 'text-embedding-v4')
  assert.equal(raw.embedding_dimension, 1024)
  assert.equal(raw.vlm_thinking, true)
})

test('rag: a corrupt file is reported and left untouched', () => {
  const f = fixture()
  mkdirSync(join(f.root, 'config'), { recursive: true })
  const path = join(f.root, 'config', 'rag_config.json')
  writeFileSync(path, '{ not json')

  const result = seedRuntimeConfig(f.request)

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'invalid_rag_config')
  assert.equal(readFileSync(path, 'utf8'), '{ not json')
})

test('models: an absent file is created with an empty model list', () => {
  const f = fixture()

  const result = seedRuntimeConfig(f.request)

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.created.models, true)
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, 'config', 'models_config.json'), 'utf8')), { models: [] })
})

test('models: an existing file is never rewritten', () => {
  const f = fixture()
  mkdirSync(join(f.root, 'config'), { recursive: true })
  const path = join(f.root, 'config', 'models_config.json')
  writeFileSync(path, '{"models":[{"name":"keep"}]}')

  const result = seedRuntimeConfig(f.request)

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.created.models, false)
  assert.equal(readFileSync(path, 'utf8'), '{"models":[{"name":"keep"}]}')
})
