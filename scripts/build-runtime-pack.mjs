#!/usr/bin/env node
// Build the win32-x64 runtime pack consumed by src/runtime/*: portable Python,
// a --target site-packages, the engine source, Qdrant, a manifest and notices,
// all zipped with the size/hash the plugin manifest needs.
//
//   node scripts/build-runtime-pack.mjs --engine <repo> [--out dist]
//        [--runtime-version 0.1.0-1] [--update-manifest] [--clean]
//
// The engine defaults to ./engine (single-repo layout); until the engine is
// merged, point --engine at the source checkout. Everything except the final
// zip stays in --out (dist/ is ignored by git).
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import yauzl from 'yauzl'
import yazl from 'yazl'

const PACKAGE_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const QDRANT_VERSION = '1.20.0'
const QDRANT_ASSET = 'qdrant-x86_64-pc-windows-msvc.zip'
const QDRANT_SIZE = 30_801_664
const PLATFORM = 'win32-x64'
const FIXED_MTIME = new Date('1980-01-01T00:00:00Z')
const ROOT_BUDGET = 120

const EXCLUDED_DIRS = new Set([
  '.deer-flow',
  '.git',
  '.hypothesis',
  '.mimosa',
  '.mypy_cache',
  '.pytest-tmp',
  '.pytest_cache',
  '.ruff_cache',
  '.venv',
  '.vscode',
  '__pycache__',
  'docs',
  'extension_test_fixtures',
  'node_modules',
  'tests',
])
const EXCLUDED_FILES = new Set(['.env'])

// ── args ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { engine: 'engine', out: 'dist', updateManifest: false, clean: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--engine') args.engine = argv[++i]
    else if (arg === '--out') args.out = argv[++i]
    else if (arg === '--runtime-version') args.runtimeVersion = argv[++i]
    else if (arg === '--update-manifest') args.updateManifest = true
    else if (arg === '--clean') args.clean = true
    else if (arg === '--help' || arg === '-h') {
      console.log('node scripts/build-runtime-pack.mjs [--engine <repo>] [--out <dir>] [--runtime-version <v>] [--update-manifest] [--clean]')
      process.exit(0)
    } else {
      throw new Error(`unknown argument: ${arg}`)
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const manifestPath = join(PACKAGE_ROOT, 'runtime.json')
const currentManifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const currentPack = currentManifest.packs?.[PLATFORM] ?? {}
const runtimeVersion = args.runtimeVersion ?? currentPack.runtimeVersion ?? '0.1.0-1'

const engineRoot = resolve(args.engine)
const engineBackend = join(engineRoot, 'backend')
const outDir = resolve(args.out)
const workDir = join(outDir, '.work')
const packDir = join(workDir, 'pack')
const zipName = `harness-rag-runtime-${PLATFORM}-${runtimeVersion}.zip`
const zipPath = join(outDir, zipName)

if (!existsSync(join(engineBackend, 'uv.lock'))) {
  console.error(`[build] engine not found at ${engineRoot} (expected backend/uv.lock)`)
  console.error('[build] run Task 7 first, or pass --engine <harness-rag checkout>')
  process.exit(1)
}
if (process.platform !== 'win32') {
  console.error('[build] the pack targets win32-x64 and needs a Windows host')
  process.exit(1)
}

// ── helpers ──────────────────────────────────────────────────────────────────
let stepStarted = Date.now()
const step = (name) => {
  stepStarted = Date.now()
  console.log(`[build] ${name}`)
}
const done = () => {
  console.log(`[build]   done in ${((Date.now() - stepStarted) / 1000).toFixed(1)}s`)
}
const fail = (message) => {
  console.error(`[build] FAILED: ${message}`)
  process.exit(1)
}
const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, { stdio: 'inherit', ...options })
  if (result.status !== 0) fail(`${command} ${commandArgs.join(' ')} exited with ${result.status}`)
}
const walk = (root, visit) => {
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      walk(join(root, entry.name), visit)
      continue
    }
    if (!entry.isFile()) continue
    if (EXCLUDED_FILES.has(entry.name)) continue
    if (/\.(pyc|pyo)$/.test(entry.name)) continue
    visit(join(root, entry.name))
  }
}
const posix = (path) => path.split(sep).join('/')
const human = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`

// ── clean ────────────────────────────────────────────────────────────────────
rmSync(packDir, { recursive: true, force: true })
mkdirSync(join(packDir, 'site-packages'), { recursive: true })
mkdirSync(join(packDir, 'engine'), { recursive: true })
mkdirSync(join(packDir, 'qdrant'), { recursive: true })
mkdirSync(workDir, { recursive: true })
mkdirSync(dirname(zipPath), { recursive: true })

// ── 1. portable Python ───────────────────────────────────────────────────────
step('python 3.12 (uv python install)')
const pythonInstallDir = join(workDir, 'python')
const installedPython = () =>
  existsSync(pythonInstallDir)
    ? readdirSync(pythonInstallDir, { withFileTypes: true }).find(
        (entry) => entry.isDirectory() && /^cpython-3\.12\.\d+/.test(entry.name),
      )
    : undefined
if (!installedPython()) {
  rmSync(pythonInstallDir, { recursive: true, force: true })
  run('uv', ['python', 'install', '--install-dir', pythonInstallDir, '3.12'])
}
const cpythonDir = installedPython()
if (!cpythonDir) fail(`no cpython-3.12 directory under ${pythonInstallDir}`)
const pythonExe = join(packDir, 'python', 'python.exe')
cpSync(join(pythonInstallDir, cpythonDir.name), join(packDir, 'python'), { recursive: true })
if (!existsSync(pythonExe)) fail('python.exe missing after flattening the uv install')
done()

// ── 2. site-packages ─────────────────────────────────────────────────────────
step('export the lockfile')
const requirements = join(workDir, 'requirements.txt')
run('uv', [
  'export',
  '--frozen',
  '--no-dev',
  '--extra',
  'umap',
  '--no-hashes',
  '--no-emit-project',
  '--output-file',
  requirements,
], { cwd: engineBackend })
const exported = readFileSync(requirements, 'utf8')
const kept = exported
  .split(/\r?\n/)
  .filter((line) => line.trim() && !/^(-e|--editable)\s/.test(line.trim()))
if (kept.length < 300) fail(`the export looks wrong (${kept.length} requirement lines)`)
writeFileSync(requirements, `${kept.join('\n')}\n`)

step(`install ${kept.length} requirements into site-packages (uv pip sync)`)
run('uv', ['pip', 'sync', '--python', pythonExe, '--target', join(packDir, 'site-packages'), requirements])
done()

// ── 3. engine source ─────────────────────────────────────────────────────────
step('copy the engine source')
const engineOut = join(packDir, 'engine')
let engineFiles = 0
walk(engineBackend, (file) => {
  const target = join(engineOut, 'backend', relative(engineBackend, file))
  mkdirSync(dirname(target), { recursive: true })
  copyFileSync(file, target)
  engineFiles += 1
})
for (const name of ['config.example.yaml', 'LICENSE']) {
  const from = join(engineRoot, name)
  if (!existsSync(from)) fail(`engine file missing: ${from}`)
  copyFileSync(from, join(engineOut, name))
}
for (const marker of ['backend/app/gateway/knowledge_app.py', 'config.example.yaml', 'backend/packages/harness']) {
  if (!existsSync(join(engineOut, marker))) fail(`engine layout looks wrong: missing ${marker}`)
}
console.log(`[build]   ${engineFiles} engine files`)
done()

// ── 4. Qdrant ────────────────────────────────────────────────────────────────
step(`qdrant ${QDRANT_VERSION}`)
const qdrantDir = join(workDir, 'qdrant-dl')
const qdrantZip = join(qdrantDir, QDRANT_ASSET)
mkdirSync(qdrantDir, { recursive: true })
if (!existsSync(qdrantZip) || statSync(qdrantZip).size !== QDRANT_SIZE) {
  rmSync(qdrantZip, { force: true })
  const gh = spawnSync('gh', ['release', 'download', `v${QDRANT_VERSION}`, '-R', 'qdrant/qdrant', '-p', QDRANT_ASSET, '-D', qdrantDir, '--clobber'], {
    stdio: 'inherit',
  })
  if (gh.status !== 0 || !existsSync(qdrantZip)) fail('gh release download failed for the qdrant asset')
}
if (statSync(qdrantZip).size !== QDRANT_SIZE) {
  fail(`qdrant asset size ${statSync(qdrantZip).size} != ${QDRANT_SIZE}`)
}
await unzipTo(qdrantZip, join(packDir, 'qdrant'))
if (!existsSync(join(packDir, 'qdrant', 'qdrant.exe'))) fail('qdrant.exe missing after unpacking the asset')
done()

// ── 5. manifest + notices ────────────────────────────────────────────────────
step('write runtime-manifest.json and THIRD_PARTY_NOTICES.md')
const pythonVersion = spawnSync(pythonExe, ['-c', 'import sys;print(".".join(map(str,sys.version_info[:3])))'], {
  encoding: 'utf8',
})
const engineCommit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: engineRoot, encoding: 'utf8' })
const configVersion = Number(/^config_version:\s*(\d+)/m.exec(readFileSync(join(engineOut, 'config.example.yaml'), 'utf8'))?.[1] ?? 0)
const runtimeManifest = {
  format: 1,
  runtimeVersion,
  engineVersion: currentPack.engineVersion ?? '0.0.0',
  engineCommit: (engineCommit.stdout ?? '').trim() || 'unknown',
  pythonVersion: (pythonVersion.stdout ?? '').trim(),
  qdrantVersion: QDRANT_VERSION,
  configVersion,
  builtAt: new Date().toISOString(),
}
writeFileSync(join(packDir, 'runtime-manifest.json'), `${JSON.stringify(runtimeManifest, null, 2)}\n`)
writeFileSync(join(packDir, 'THIRD_PARTY_NOTICES.md'), notices({ pythonVersion: runtimeManifest.pythonVersion, configVersion }))
done()

// ── 6. zip ───────────────────────────────────────────────────────────────────
step('zip the pack')
const entries = []
let unpackedSize = 0
let maxName = 0
walk(packDir, (file) => {
  const name = posix(relative(packDir, file))
  maxName = Math.max(maxName, name.length)
  unpackedSize += statSync(file).size
  entries.push({ file, name })
})
const overhead = 1 + 'runtime'.length + 1 + runtimeVersion.length + 1
if (ROOT_BUDGET + overhead + maxName > 259) {
  fail(
    `longest entry ${maxName} chars + ${overhead} for runtime/<version>/ + the ${ROOT_BUDGET}-char root exceed MAX_PATH (259)`,
  )
}
console.log(`[build]   max entry ${maxName} chars; ${259 - overhead - maxName} chars left for the root (budget ${ROOT_BUDGET})`)
rmSync(zipPath, { force: true })
const zip = new yazl.ZipFile()
for (const entry of entries) zip.addFile(entry.file, entry.name, { mtime: FIXED_MTIME, mode: 0o100644 })
await new Promise((resolveZip, rejectZip) => {
  zip.outputStream.on('error', rejectZip).pipe(createWriteStream(zipPath)).on('close', resolveZip).on('error', rejectZip)
  zip.end()
})
const size = statSync(zipPath).size
const sha256 = await hashFile(zipPath)
console.log(`[build]   ${entries.length} entries, ${human(size)} zipped, ${human(unpackedSize)} unpacked`)
console.log(`[build]   sha256 ${sha256}`)
done()

// ── 7. manifest backfill ─────────────────────────────────────────────────────
if (args.updateManifest) {
  step('update runtime.json')
  const next = {
    ...currentManifest,
    packs: {
      ...currentManifest.packs,
      [PLATFORM]: {
        ...currentPack,
        runtimeVersion,
        engineCommit: runtimeManifest.engineCommit,
        pythonVersion: runtimeManifest.pythonVersion,
        configVersion,
        size,
        unpackedSize,
        sha256,
      },
    },
  }
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`)
  done()
}

console.log(`\n[build] zip:  ${zipPath}`)
console.log(`[build] pack: ${packDir}`)
if (args.clean) {
  rmSync(packDir, { recursive: true, force: true })
  rmSync(pythonInstallDir, { recursive: true, force: true })
  console.log('[build] cleaned the staging directories')
}

// ── implementations ──────────────────────────────────────────────────────────
function notices({ pythonVersion, configVersion }) {
  return `# Runtime pack third-party notices

This archive is unpacked by the Harness RAG plugin under
\`<DSH_HOME>/harness-rag/runtime/<runtimeVersion>/\`. It bundles:

## CPython ${pythonVersion} (PSF-2.0)

Source: https://www.python.org/
License: Python Software Foundation License 2.0 (\`python/LICENSE.txt\`).

## Qdrant ${QDRANT_VERSION} (Apache-2.0)

Source: https://github.com/qdrant/qdrant
License: Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0).

## DeerFlow engine (MIT)

Source: https://github.com/bytedance/deer-flow
License: MIT (\`engine/LICENSE\`). The seeded configuration uses
\`config_version: ${configVersion}\`.

## Python wheels (site-packages)

Every wheel keeps its own metadata under
\`site-packages/<distribution>-<version>.dist-info/\`, including its declared
license and any bundled notice files. Those notices are authoritative for the
individual packages.
`
}

function unzipTo(source, destination) {
  return new Promise((resolveZip, rejectZip) => {
    yauzl.open(source, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) {
        rejectZip(error ?? new Error('cannot open zip'))
        return
      }
      zip.on('error', rejectZip)
      zip.on('entry', (entry) => {
        const name = entry.fileName.replace(/\\/g, '/')
        if (name.endsWith('/')) {
          mkdirSync(join(destination, name), { recursive: true })
          zip.readEntry()
          return
        }
        const target = join(destination, name)
        if (!resolve(target).startsWith(resolve(destination) + sep)) {
          rejectZip(new Error(`unsafe zip entry: ${name}`))
          return
        }
        mkdirSync(dirname(target), { recursive: true })
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            rejectZip(streamError ?? new Error(`cannot read ${name}`))
            return
          }
          const out = createWriteStream(target)
          stream.on('error', rejectZip)
          out.on('error', rejectZip).on('close', () => zip.readEntry())
          stream.pipe(out)
        })
      })
      zip.on('end', resolveZip)
      zip.readEntry()
    })
  })
}

function hashFile(path) {
  return new Promise((resolveHash, rejectHash) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('error', rejectHash)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolveHash(hash.digest('hex')))
  })
}
