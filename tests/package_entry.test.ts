import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url))

test('package: the host entry points at compiled output that ships', () => {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.main, './lib/index.js')
  assert.equal(pkg.exports['.'], './lib/index.js')
  assert.ok(Array.isArray(pkg.files) && pkg.files.includes('lib'))
  const entry = join(PACKAGE_ROOT, 'lib', 'index.js')
  assert.equal(existsSync(entry), true)
  assert.doesNotMatch(readFileSync(entry, 'utf8'), /from ['"]\.\/[^'"]+\.ts['"]/)
})
