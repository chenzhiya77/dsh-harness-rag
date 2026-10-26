#!/usr/bin/env node
// Build the win32-x64 runtime pack consumed by src/runtime/*: portable Python,
// a --target site-packages, the engine source, Qdrant, a manifest and notices,
// all zipped with the size/hash the plugin manifest needs.
//
//   node scripts/build-runtime-pack.mjs --engine <repo> [--out dist]
//        [--runtime-version 0.1.0-1] [--engine-commit <sha>]
//        [--update-manifest] [--clean] [--print-inputs]
//
// The engine defaults to ./engine (snapshot layout). The engine commit comes
// from --engine-commit, the checkout's own HEAD when <repo>/.git exists, or
// the Commit row of <repo>/UPSTREAM.md for the snapshot; git never walks up
// past <repo>. Cold builds need uv 0.11.2, gh >= 2.40 and network access for
// CPython/Qdrant. Everything except the final zip stays in --out (dist/ is
// ignored by git).
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
const PYTHON_VERSION = '3.12.13'
const UV_VERSION = '0.11.2'
const GH_MIN_VERSION = '2.40.0'
const PLATFORM = 'win32-x64'
const FIXED_MTIME = new Date('1980-01-01T00:00:00Z')
const ROOT_BUDGET = 120
const EXTRA_REQUIREMENTS_FILE = join(PACKAGE_ROOT, 'scripts', 'runtime-extra-requirements.txt')
const PINNED_REQUIREMENT = /^([A-Za-z0-9][A-Za-z0-9._-]*)==([A-Za-z0-9][A-Za-z0-9._+!-]*)(?:\s*;\s*.+)?$/

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
  const args = { engine: 'engine', out: 'dist', updateManifest: false, clean: false, printInputs: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--engine') args.engine = argv[++i]
    else if (arg === '--out') args.out = argv[++i]
    else if (arg === '--runtime-version') args.runtimeVersion = argv[++i]
    else if (arg === '--engine-commit') args.engineCommit = argv[++i]
    else if (arg === '--update-manifest') args.updateManifest = true
    else if (arg === '--clean') args.clean = true
    else if (arg === '--print-inputs') args.printInputs = true
    else if (arg === '--help' || arg === '-h') {
      console.log('node scripts/build-runtime-pack.mjs [--engine <repo>] [--out <dir>] [--runtime-version <v>] [--engine-commit <sha>] [--update-manifest] [--clean] [--print-inputs]')
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
const toolVersion = (command, commandArgs, pattern) => {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8' })
  if (result.error || result.status !== 0) return undefined
  return pattern.exec(result.stdout ?? '')?.[1]
}
const compareVersions = (left, right) => {
  const parts = (value) => value.replace(/^v/, '').split('-')[0].split('.').map((part) => Number.parseInt(part, 10))
  const a = parts(left)
  const b = parts(right)
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const delta = (a[i] ?? 0) - (b[i] ?? 0)
    if (delta !== 0) return Math.sign(delta)
  }
  return 0
}
const normalizePackageName = (name) => name.toLowerCase().replace(/[-_.]+/g, '-')
const requirementPackage = (line) => {
  const match = PINNED_REQUIREMENT.exec(line)
  return match ? normalizePackageName(match[1]) : undefined
}
const readExtraRequirements = () => {
  let text
  try {
    text = readFileSync(EXTRA_REQUIREMENTS_FILE, 'utf8')
  } catch {
    fail(`extra requirements file is missing or unreadable: ${EXTRA_REQUIREMENTS_FILE}`)
  }
  const seen = new Set()
  const pins = []
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const match = PINNED_REQUIREMENT.exec(line)
    if (!match) {
      fail(`bad extra requirement at ${EXTRA_REQUIREMENTS_FILE}:${index + 1}: ${line}`)
      return
    }
    const name = normalizePackageName(match[1])
    if (seen.has(name)) {
      fail(`duplicate extra requirement "${match[1]}" at ${EXTRA_REQUIREMENTS_FILE}:${index + 1}`)
      return
    }
    seen.add(name)
    pins.push(line)
  })
  if (pins.length === 0) fail(`extra requirements file has no pinned requirements: ${EXTRA_REQUIREMENTS_FILE}`)
  return pins
}
const resolveEngineCommit = (root, override) => {
  if (override !== undefined) {
    const normalized = override.toLowerCase()
    if (!/^[0-9a-f]{7,40}$/.test(normalized)) {
      fail(`--engine-commit must be a 7-40 character hex sha, got "${override}"`)
    }
    return { commit: normalized, source: '--engine-commit' }
  }
  if (existsSync(join(root, '.git'))) {
    const result = spawnSync('git', ['rev-parse', '--short=9', 'HEAD'], { cwd: root, encoding: 'utf8' })
    const head = (result.stdout ?? '').trim()
    if (result.status !== 0 || !/^[0-9a-f]{7,40}$/.test(head)) {
      fail(`git rev-parse --short=9 HEAD failed in ${root}: ${(result.stderr ?? '').trim() || `exit ${result.status}`}`)
    }
    return { commit: head, source: 'git HEAD' }
  }
  const upstream = join(root, 'UPSTREAM.md')
  if (existsSync(upstream)) {
    const row = /^\|\s*Commit\s*\|\s*`([0-9a-f]{7,40})`(?:\s*\(\s*`([0-9a-f]{7,40})`\s*\))?\s*\|/m.exec(
      readFileSync(upstream, 'utf8'),
    )
    if (!row) fail(`${upstream} has no readable "Commit" row; pass --engine-commit <sha>`)
    const [, full, short] = row
    return { commit: short && full.startsWith(short) ? short : full.slice(0, 9), source: 'UPSTREAM.md' }
  }
  fail(`cannot resolve the engine commit for ${root}: not a git checkout and no UPSTREAM.md; pass --engine-commit <sha>`)
}

// ── build inputs ─────────────────────────────────────────────────────────────
step('resolve the engine commit and build toolchain')
const engineCommitInfo = resolveEngineCommit(engineRoot, args.engineCommit)
const uvVersion = toolVersion('uv', ['--version'], /^uv\s+(\S+)/m)
if (uvVersion !== UV_VERSION) {
  fail(`uv ${UV_VERSION} is required (found ${uvVersion ?? 'none'}); see https://docs.astral.sh/uv/`)
}
const ghVersion = toolVersion('gh', ['--version'], /^gh version\s+(\S+)/m)
if (!ghVersion) fail(`gh >= ${GH_MIN_VERSION} is required for the Qdrant asset download`)
if (compareVersions(ghVersion, GH_MIN_VERSION) < 0) {
  fail(`gh >= ${GH_MIN_VERSION} is required (found ${ghVersion})`)
}
console.log(`[build]   engine commit ${engineCommitInfo.commit} (${engineCommitInfo.source})`)
console.log(`[build]   uv ${uvVersion}, gh ${ghVersion}, Python ${PYTHON_VERSION}, Qdrant ${QDRANT_VERSION}`)
const extraRequirements = readExtraRequirements()
console.log(`[build]   extra requirements ${extraRequirements.length} (${EXTRA_REQUIREMENTS_FILE})`)
done()

if (args.printInputs) {
  console.log(`[build] engine: ${engineRoot}`)
  console.log(`[build] out:    ${outDir}`)
  for (const line of extraRequirements) console.log(`[build] extra:  ${line}`)
  process.exit(0)
}

// ── clean ────────────────────────────────────────────────────────────────────
rmSync(packDir, { recursive: true, force: true })
mkdirSync(join(packDir, 'site-packages'), { recursive: true })
mkdirSync(join(packDir, 'engine'), { recursive: true })
mkdirSync(join(packDir, 'qdrant'), { recursive: true })
mkdirSync(workDir, { recursive: true })
mkdirSync(dirname(zipPath), { recursive: true })

// ── 1. portable Python ───────────────────────────────────────────────────────
step(`python ${PYTHON_VERSION} (uv python install)`)
const pythonInstallDir = join(workDir, 'python')
const installedPython = () =>
  existsSync(pythonInstallDir)
    ? readdirSync(pythonInstallDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith(`cpython-${PYTHON_VERSION}-`))
        .sort((a, b) => a.name.localeCompare(b.name))[0]
    : undefined
if (!installedPython()) {
  rmSync(pythonInstallDir, { recursive: true, force: true })
  run('uv', ['python', 'install', '--install-dir', pythonInstallDir, '--no-bin', PYTHON_VERSION])
}
const cpythonDir = installedPython()
if (!cpythonDir) fail(`no cpython-${PYTHON_VERSION} directory under ${pythonInstallDir}`)
const pythonExe = join(packDir, 'python', 'python.exe')
cpSync(join(pythonInstallDir, cpythonDir.name), join(packDir, 'python'), { recursive: true })
if (!existsSync(pythonExe)) fail('python.exe missing after flattening the uv install')
const pythonVersionResult = spawnSync(
  pythonExe,
  ['-c', 'import sys;print(".".join(map(str,sys.version_info[:3])))'],
  { encoding: 'utf8' },
)
const pythonVersion = (pythonVersionResult.stdout ?? '').trim()
if (pythonVersionResult.status !== 0) fail(`packed python failed to report its version: ${(pythonVersionResult.stderr ?? '').trim()}`)
if (pythonVersion !== PYTHON_VERSION) fail(`packed Python is ${pythonVersion}, expected ${PYTHON_VERSION}`)
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
const lockedPackages = new Set(kept.map(requirementPackage).filter(Boolean))
for (const line of extraRequirements) {
  const name = requirementPackage(line)
  if (name && lockedPackages.has(name)) fail(`extra requirement "${name}" is already pinned by the engine lock export`)
}
const requirementsToInstall = [...kept, ...extraRequirements]
writeFileSync(requirements, `${requirementsToInstall.join('\n')}\n`)

step(`install ${lockedPackages.size} locked packages + ${extraRequirements.length} extra into site-packages (uv pip sync)`)
run('uv', ['pip', 'sync', '--python', pythonExe, '--target', join(packDir, 'site-packages'), requirements])
done()

step('smoke-test python-calamine')
const smokeXlsx = join(workDir, 'calamine-smoke.xlsx')
const smokeSitePackages = join(packDir, 'site-packages')
const smokeScript = `import os
import sys
import zipfile

import python_calamine
from python_calamine import CalamineWorkbook

path = sys.argv[1]
assert os.path.normcase(python_calamine.__file__).startswith(os.path.normcase(sys.argv[2])), python_calamine.__file__
parts = {
    "[Content_Types].xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""",
    "_rels/.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""",
    "xl/workbook.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets>
</workbook>""",
    "xl/_rels/workbook.xml.rels": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""",
    "xl/worksheets/sheet1.xml": """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1"><c r="A1" t="inlineStr"><is><t>name</t></is></c><c r="B1" t="inlineStr"><is><t>value</t></is></c></row>
<row r="2"><c r="A2" t="inlineStr"><is><t>alpha</t></is></c><c r="B2"><v>1</v></c></row>
</sheetData>
</worksheet>""",
}
with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as archive:
    for name, data in parts.items():
        archive.writestr(name, data)
workbook = CalamineWorkbook.from_path(path)
rows = workbook.get_sheet_by_name(workbook.sheet_names[0]).to_python()
assert rows[0] == ["name", "value"], rows
assert rows[1][0] == "alpha" and rows[1][1] == 1, rows
print(python_calamine.__file__)`
const smoke = spawnSync(pythonExe, ['-c', smokeScript, smokeXlsx, smokeSitePackages], {
  cwd: workDir,
  encoding: 'utf8',
  env: {
    ...process.env,
    PYTHONPATH: smokeSitePackages,
    PYTHONNOUSERSITE: '1',
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
  },
})
if (smoke.status !== 0) {
  const detail = (smoke.stderr || smoke.stdout || smoke.error?.message || '').trim()
  fail(`python-calamine smoke test failed (exit ${smoke.status}): ${detail}`)
}
console.log(`[build]   ${(smoke.stdout ?? '').trim()}`)
rmSync(smokeXlsx, { force: true })
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
const configVersion = Number(/^config_version:\s*(\d+)/m.exec(readFileSync(join(engineOut, 'config.example.yaml'), 'utf8'))?.[1] ?? 0)
const runtimeManifest = {
  format: 1,
  runtimeVersion,
  engineVersion: currentPack.engineVersion ?? '0.0.0',
  engineCommit: engineCommitInfo.commit,
  pythonVersion,
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
  const projectLicense = readFileSync(join(PACKAGE_ROOT, 'LICENSE'), 'utf8').trim()
  return `# Runtime pack notices

This archive is unpacked by the Harness RAG plugin under
\`<DSH_HOME>/harness-rag/runtime/${runtimeVersion}/\`. It bundles:

## Harness RAG engine (original work, MIT)

The RAG capabilities bundled in \`engine/\` (document parsing and chunking,
embedding and indexing, three-path retrieval, graph and wiki generation, and
evaluation) are original Harness RAG work. The engine also bundles a
third-party harness framework; the MIT notice below applies to those framework
portions, not to the RAG code. The seeded configuration uses
\`config_version: ${configVersion}\`.

License: MIT. The plugin's license text is reproduced in full:

\`\`\`text
${projectLicense}
\`\`\`

## Bundled harness framework (MIT)

Applies only to the third-party harness framework portions bundled under
\`engine/backend/packages/\` (\`harness\` and \`extension-api\`), not to the RAG
capabilities.

License: MIT. The notice is reproduced in \`engine/LICENSE\`:
Copyright (c) 2025 Bytedance Ltd. and/or its affiliates;
Copyright (c) 2025-2026 DeerFlow Authors.

## CPython ${pythonVersion} (PSF-2.0)

Source: https://www.python.org/
License: Python Software Foundation License 2.0 (\`python/LICENSE.txt\`).

## Qdrant ${QDRANT_VERSION} (Apache-2.0)

Source: https://github.com/qdrant/qdrant
License: Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0).

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
