import test from 'node:test'
import assert from 'node:assert/strict'
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  configDir,
  defaultRoot,
  downloadsDir,
  logsDir,
  resolveDshHome,
  runtimeDir,
  runtimeRoot,
  stateDir,
} from '../src/runtime/paths.ts'
import {
  LOCATION_FILE,
  locationPath,
  readLocation,
  resolveRoot,
  targetRoot,
  validateRootCandidate,
  writeLocation,
  type LocationFs,
} from '../src/runtime/location.ts'

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'hrag-paths-'))
}

function writable(path: string): boolean {
  try {
    accessSync(path, constants.W_OK)
    return true
  } catch {
    return false
  }
}

function locationFs(overrides: Partial<LocationFs> = {}): LocationFs {
  return {
    readFileSync: (path, encoding) => readFileSync(path, encoding),
    existsSync: (path) => existsSync(path),
    mkdirSync: (path, options) => {
      mkdirSync(path, options)
    },
    writeFileSync: (path, data, encoding) => writeFileSync(path, data, encoding),
    renameSync: (from, to) => renameSync(from, to),
    isWritable: (path) => writable(path),
    ...overrides,
  }
}

// ── paths ───────────────────────────────────────────────────────────────────

test('home: DSH_HOME wins when non-blank, otherwise ~/.dsh', () => {
  assert.equal(resolveDshHome({ DSH_HOME: 'D:\\dsh' }), 'D:\\dsh')
  for (const env of [{}, { DSH_HOME: '' }, { DSH_HOME: '   ' }]) {
    assert.equal(resolveDshHome(env), join(homedir(), '.dsh'))
  }
})

test('defaultRoot: <DSH_HOME>/harness-rag', () => {
  const root = join(tmpdir(), 'hrag-home')
  assert.equal(defaultRoot({ DSH_HOME: root }), join(root, 'harness-rag'))
})

test('layout: runtime/state/config/logs/downloads are pure joins', () => {
  const root = join(tmpdir(), 'hrag-root')
  assert.equal(runtimeRoot(root), join(root, 'runtime'))
  assert.equal(runtimeDir(root, '2.1.0-1'), join(root, 'runtime', '2.1.0-1'))
  assert.equal(stateDir(root), join(root, 'state'))
  assert.equal(configDir(root), join(root, 'config'))
  assert.equal(logsDir(root), join(root, 'state', 'logs'))
  assert.equal(downloadsDir(root), join(root, 'downloads'))
})

// ── location.json ───────────────────────────────────────────────────────────

test('location: absent file reads as none', () => {
  const anchor = tempDir()
  assert.deepEqual(readLocation(anchor), { kind: 'none', path: locationPath(anchor) })
  assert.equal(locationPath(anchor), join(anchor, LOCATION_FILE))
})

test('location: write then read round-trips an absolute root atomically', () => {
  const anchor = tempDir()
  const target = join(tempDir(), 'custom')
  const path = writeLocation(anchor, target)
  assert.equal(path, join(anchor, 'location.json'))
  assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), { version: 1, root: target })
  assert.deepEqual(readLocation(anchor), { kind: 'ok', path, root: target })
})

test('location: malformed JSON, wrong version, or a relative root is invalid', () => {
  const anchor = tempDir()
  const path = join(anchor, 'location.json')
  for (const body of ['{ not json', JSON.stringify({ version: 2, root: 'C:\\x' }), JSON.stringify({ version: 1, root: 'relative\\x' })]) {
    writeFileSync(path, body)
    const read = readLocation(anchor)
    assert.equal(read.kind, 'invalid', body)
    if (read.kind === 'invalid') assert.ok(read.reason.length > 0)
  }
})

test('resolve: absent anchor uses the default root', () => {
  const home = tempDir()
  const anchor = join(home, 'anchor')
  const resolved = resolveRoot({ anchorRoot: anchor, env: { DSH_HOME: home } })
  assert.equal(resolved.kind, 'ok')
  if (resolved.kind === 'ok') {
    assert.equal(resolved.source, 'default')
    assert.equal(resolved.root, join(home, 'harness-rag'))
  }
})

test('resolve: a valid anchor wins over the default root', () => {
  const home = tempDir()
  const anchor = join(home, 'anchor')
  const target = join(home, 'custom')
  mkdirSync(target, { recursive: true })
  writeLocation(anchor, target)
  const resolved = resolveRoot({ anchorRoot: anchor, env: { DSH_HOME: home } })
  assert.equal(resolved.kind, 'ok')
  if (resolved.kind === 'ok') {
    assert.equal(resolved.source, 'anchor')
    assert.equal(resolved.root, target)
  }
})

test('resolve: an invalid anchor falls back to the default root with a warning', () => {
  const home = tempDir()
  const anchor = join(home, 'anchor')
  mkdirSync(anchor, { recursive: true })
  writeFileSync(join(anchor, 'location.json'), '{ broken')
  const resolved = resolveRoot({ anchorRoot: anchor, env: { DSH_HOME: home } })
  assert.equal(resolved.kind, 'ok')
  if (resolved.kind === 'ok') {
    assert.equal(resolved.source, 'default')
    assert.equal(resolved.root, join(home, 'harness-rag'))
    assert.ok(resolved.warning && resolved.warning.length > 0)
  }
})

test('resolve: a missing or unwritable target is needs_location, not a silent fallback', () => {
  const home = tempDir()
  const anchor = join(home, 'anchor')
  const missing = join(home, 'gone')
  writeLocation(anchor, missing)
  const absent = resolveRoot({ anchorRoot: anchor, env: { DSH_HOME: home } })
  assert.equal(absent.kind, 'needs_location')
  if (absent.kind === 'needs_location') {
    assert.equal(absent.previousRoot, missing)
    assert.ok(absent.reason.length > 0)
  }

  const present = join(home, 'present')
  mkdirSync(present, { recursive: true })
  writeLocation(anchor, present)
  const readOnly = resolveRoot({
    anchorRoot: anchor,
    env: { DSH_HOME: home },
    fs: locationFs({ isWritable: () => false }),
  })
  assert.equal(readOnly.kind, 'needs_location')
  if (readOnly.kind === 'needs_location') assert.match(readOnly.reason, /writ/i)
})

test('resolve: an existing target without a runtime is still usable', () => {
  const home = tempDir()
  const anchor = join(home, 'anchor')
  const target = join(home, 'empty-root')
  mkdirSync(target, { recursive: true })
  writeLocation(anchor, target)
  const resolved = resolveRoot({ anchorRoot: anchor, env: { DSH_HOME: home } })
  assert.equal(resolved.kind, 'ok')
  if (resolved.kind === 'ok') assert.equal(resolved.source, 'anchor')
})

// ── root validation ─────────────────────────────────────────────────────────

test('targetRoot: a parent already named harness-rag is not doubled', () => {
  const base = join(tmpdir(), 'x')
  assert.equal(targetRoot(base), join(base, 'harness-rag'))
  assert.equal(targetRoot(join(base, 'harness-rag')), join(base, 'harness-rag'))
})

test('validate: a relative parent is rejected', () => {
  const anchor = join(tempDir(), 'anchor')
  const result = validateRootCandidate({ parent: 'relative\\dir', anchorRoot: anchor })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'path_not_absolute')
})

test('validate: UNC and remote parents are rejected', () => {
  const anchor = join(tempDir(), 'anchor')
  const unc = validateRootCandidate({ parent: '\\\\server\\share', anchorRoot: anchor })
  assert.equal(unc.ok, false)
  if (!unc.ok) assert.equal(unc.code, 'network_path')

  const remote = validateRootCandidate({
    parent: join(tempDir(), 'mapped'),
    anchorRoot: anchor,
    isRemotePath: () => true,
  })
  assert.equal(remote.ok, false)
  if (!remote.ok) assert.equal(remote.code, 'network_path')
})

test('validate: plugin directories and node_modules are rejected', () => {
  const anchor = join(tempDir(), 'anchor')
  const inModules = validateRootCandidate({
    parent: join(tempDir(), 'node_modules', 'pkg'),
    anchorRoot: anchor,
  })
  assert.equal(inModules.ok, false)
  if (!inModules.ok) assert.equal(inModules.code, 'plugin_dir')

  const pluginRoot = join(tempDir(), 'plugin')
  const inPlugin = validateRootCandidate({
    parent: join(pluginRoot, 'sub'),
    anchorRoot: anchor,
    pluginRoot,
  })
  assert.equal(inPlugin.ok, false)
  if (!inPlugin.ok) assert.equal(inPlugin.code, 'plugin_dir')
})

test('validate: a parent nested inside the anchor root is rejected', () => {
  const anchor = join(tempDir(), 'anchor')
  const result = validateRootCandidate({ parent: join(anchor, 'inside'), anchorRoot: anchor })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'nested_in_anchor')
})

test('validate: the anchor root itself is the default install root', () => {
  const anchor = join(tempDir(), 'harness-rag')

  const result = validateRootCandidate({ parent: anchor, anchorRoot: anchor })

  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.root, anchor)
})

test('validate: system directories are rejected', () => {
  const base = tempDir()
  const system = join(base, 'Windows')
  const result = validateRootCandidate({
    parent: system,
    anchorRoot: join(base, 'anchor'),
    systemDirs: [system],
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'system_dir')
})

test('validate: the Windows path budget is enforced', () => {
  const result = validateRootCandidate({
    parent: 'C:\\' + 'a'.repeat(200),
    anchorRoot: 'C:\\anchor',
    platform: 'win32',
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.code, 'path_too_long')
})

test('validate: free space must cover size + unpackedSize x 1.1', () => {
  const parent = tempDir()
  const anchor = join(parent, 'anchor')
  const tight = validateRootCandidate({
    parent,
    anchorRoot: anchor,
    size: 100,
    unpackedSize: 100,
    freeBytes: () => 200,
  })
  assert.equal(tight.ok, false)
  if (!tight.ok) assert.equal(tight.code, 'space_insufficient')

  const roomy = validateRootCandidate({
    parent,
    anchorRoot: anchor,
    size: 100,
    unpackedSize: 100,
    freeBytes: () => 1000,
  })
  assert.equal(roomy.ok, true)
})

test('validate: a missing parent is accepted when an ancestor is writable', () => {
  const base = tempDir()
  const result = validateRootCandidate({ parent: join(base, 'missing', 'child'), anchorRoot: join(base, 'anchor') })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.root, join(base, 'missing', 'child', 'harness-rag'))
})

test('validate: an existing target is only accepted when it carries plugin markers', () => {
  const base = tempDir()
  const anchor = join(base, 'anchor')
  const target = join(base, 'harness-rag')
  mkdirSync(target, { recursive: true })

  const unknown = validateRootCandidate({ parent: base, anchorRoot: anchor })
  assert.equal(unknown.ok, false)
  if (!unknown.ok) assert.equal(unknown.code, 'target_not_plugin_data')

  writeFileSync(join(target, 'bindings.json'), '{}')
  assert.equal(validateRootCandidate({ parent: base, anchorRoot: anchor }).ok, true)

  mkdirSync(join(target, 'runtime', '2.1.0-1'), { recursive: true })
  writeFileSync(join(target, 'runtime', '2.1.0-1', 'runtime-manifest.json'), '{}')
  assert.equal(validateRootCandidate({ parent: base, anchorRoot: anchor }).ok, true)
})

test('validate: a sync-drive root is accepted but asks for confirmation', () => {
  const base = tempDir()
  const anchor = join(base, 'anchor')
  const sync = validateRootCandidate({
    parent: join(base, 'OneDrive'),
    anchorRoot: anchor,
    env: { OneDrive: base },
  })
  assert.equal(sync.ok, true)
  if (sync.ok) assert.equal(sync.needsSyncConfirm, true)

  const local = validateRootCandidate({ parent: base, anchorRoot: anchor, env: {} })
  assert.equal(local.ok, true)
  if (local.ok) assert.equal(local.needsSyncConfirm, false)
})
