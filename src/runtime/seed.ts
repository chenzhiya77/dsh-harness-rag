import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { configDir } from './paths.ts'

export interface SeedRequest {
  root: string
  /** Where `config.example.yaml` lives: `<runtime>/engine` in a provisioned root. */
  engineRoot: string
  qdrantUrl: string
}

export type SeedFailure = 'missing_example' | 'invalid_rag_config'

export type SeedResult =
  | { ok: true; created: { config: boolean; rag: boolean; models: boolean } }
  | { ok: false; code: SeedFailure; detail?: string }

const DATABASE_HEADER = /^database:\s*(#.*)?$/

const quote = (value: string): string => `'${value.replace(/'/g, "''")}'`

const databaseBlock = (sqliteDir: string): string =>
  [
    '',
    '# Harness RAG runtime: the knowledge SQLite file lives under the runtime root.',
    'database:',
    '  backend: sqlite',
    `  sqlite_dir: ${quote(sqliteDir)}`,
    '',
  ].join('\n')

/** Set `database.sqlite_dir` by editing the one line, so the operator's copy of
 * `config.example.yaml` keeps its comments, quoting, and every other key. The
 * upstream example ships the whole block commented out, so a missing block is
 * appended rather than rewritten. */
export function updateSqliteDir(text: string, sqliteDir: string): { text: string; changed: boolean } {
  const quoted = quote(sqliteDir)
  const lines = text.split('\n')
  const header = lines.findIndex((line) => DATABASE_HEADER.test(line))
  if (header === -1) {
    const separator = text === '' || text.endsWith('\n') ? '' : '\n'
    return { text: `${text}${separator}${databaseBlock(sqliteDir)}`, changed: true }
  }
  let end = header + 1
  while (end < lines.length) {
    const line = lines[end]
    if (line.trim() === '' || /^\s/.test(line)) {
      end += 1
      continue
    }
    break
  }
  for (let index = header + 1; index < end; index++) {
    if (!/^\s+sqlite_dir:/.test(lines[index])) continue
    const indent = /^(\s+)/.exec(lines[index])?.[1] ?? '  '
    const next = `${indent}sqlite_dir: ${quoted}`
    if (lines[index] === next) return { text, changed: false }
    const copy = lines.slice()
    copy[index] = next
    return { text: copy.join('\n'), changed: true }
  }
  const copy = lines.slice()
  copy.splice(header + 1, 0, `  sqlite_dir: ${quoted}`)
  return { text: copy.join('\n'), changed: true }
}

function writeAtomic(path: string, text: string): void {
  const temp = `${path}.tmp-${process.pid}`
  writeFileSync(temp, text, 'utf8')
  renameSync(temp, path)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Owns `config.yaml:database.sqlite_dir` and `rag_config.json:qdrant_url`, and
 * nothing else: `models_config.json` is created once and never rewritten. */
export function seedRuntimeConfig(request: SeedRequest): SeedResult {
  const dir = configDir(request.root)
  mkdirSync(dir, { recursive: true })
  const created = { config: false, rag: false, models: false }

  const configPath = join(dir, 'config.yaml')
  if (!existsSync(configPath)) {
    const examplePath = join(request.engineRoot, 'config.example.yaml')
    if (!existsSync(examplePath)) return { ok: false, code: 'missing_example', detail: examplePath }
    copyFileSync(examplePath, configPath)
    created.config = true
  }
  const configText = readFileSync(configPath, 'utf8')
  const sqliteDir = join(request.root, 'state', 'data')
  const updated = updateSqliteDir(configText, sqliteDir)
  if (updated.changed) writeAtomic(configPath, updated.text)

  const ragPath = join(dir, 'rag_config.json')
  if (!existsSync(ragPath)) {
    writeAtomic(ragPath, `${JSON.stringify({ qdrant_url: request.qdrantUrl }, null, 2)}\n`)
    created.rag = true
  } else {
    const text = readFileSync(ragPath, 'utf8')
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return { ok: false, code: 'invalid_rag_config', detail: ragPath }
    }
    if (!isRecord(raw)) return { ok: false, code: 'invalid_rag_config', detail: ragPath }
    const serialized = `${JSON.stringify({ ...raw, qdrant_url: request.qdrantUrl }, null, 2)}\n`
    if (serialized !== text) writeAtomic(ragPath, serialized)
  }

  const modelsPath = join(dir, 'models_config.json')
  if (!existsSync(modelsPath)) {
    writeAtomic(modelsPath, `${JSON.stringify({ models: [] }, null, 2)}\n`)
    created.models = true
  }

  return { ok: true, created }
}
