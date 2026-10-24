import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const MANIFEST_FILE = 'runtime.json'

const PLATFORM_KEY = /^(win32|darwin|linux)-(x64|arm64)$/
const VERSION_TEXT = /^[0-9A-Za-z._-]+$/
const SHA256_HEX = /^[0-9a-f]{64}$/

export interface RuntimePack {
  runtimeVersion: string
  engineVersion: string
  engineCommit: string
  pythonVersion: string
  qdrantVersion: string
  configVersion: number
  urls: string[]
  size: number
  unpackedSize: number
  sha256: string
}

export interface RuntimeManifest {
  format: 1
  packs: Record<string, RuntimePack>
}

/** `state/current.json`: which runtime version this root is on. */
export interface RuntimeCurrent {
  version: 1
  runtimeVersion: string
  updatedAt: string
  previousVersion?: string
}

export type ManifestFailure = 'manifest_invalid' | 'platform_unsupported' | 'pack_missing'

export type PackSelection =
  | { ok: true; platform: string; pack: RuntimePack }
  | { ok: false; code: ManifestFailure }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

/** Version strings double as directory names, so `.` and `..` are out. */
export function isRuntimeVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION_TEXT.test(value) && value !== '.' && value !== '..'
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.length > 0
  } catch {
    return false
  }
}

/** An unpublished pack: no URL or no size yet. It validates so the plugin can
 * ship a manifest before the first release, but never selects. */
export function isUnpublished(pack: RuntimePack): boolean {
  return pack.urls.length === 0 || pack.size === 0
}

function validatePack(raw: unknown): RuntimePack | null {
  if (!isRecord(raw)) return null
  if (!isRuntimeVersion(raw.runtimeVersion)) return null
  const engineVersion = nonEmpty(raw.engineVersion) ? raw.engineVersion.trim() : ''
  const engineCommit = nonEmpty(raw.engineCommit) ? raw.engineCommit.trim() : ''
  const pythonVersion = nonEmpty(raw.pythonVersion) ? raw.pythonVersion.trim() : ''
  const qdrantVersion = nonEmpty(raw.qdrantVersion) ? raw.qdrantVersion.trim() : ''
  if (!engineVersion || !engineCommit || !pythonVersion || !qdrantVersion) return null
  if (!isCount(raw.configVersion) || raw.configVersion === 0) return null
  if (!Array.isArray(raw.urls)) return null
  if (!isCount(raw.size) || !isCount(raw.unpackedSize)) return null
  if (typeof raw.sha256 !== 'string') return null
  const pack: RuntimePack = {
    runtimeVersion: raw.runtimeVersion,
    engineVersion,
    engineCommit,
    pythonVersion,
    qdrantVersion,
    configVersion: raw.configVersion,
    urls: raw.urls.slice(),
    size: raw.size,
    unpackedSize: raw.unpackedSize,
    sha256: raw.sha256,
  }
  if (isUnpublished(pack)) return pack
  if (!pack.urls.every(isHttpsUrl)) return null
  if (!SHA256_HEX.test(pack.sha256)) return null
  if (pack.unpackedSize === 0) return null
  return pack
}

export function validateManifest(raw: unknown): { ok: true; manifest: RuntimeManifest } | { ok: false; code: ManifestFailure } {
  if (!isRecord(raw) || raw.format !== 1 || !isRecord(raw.packs)) return { ok: false, code: 'manifest_invalid' }
  const platforms = Object.keys(raw.packs)
  if (platforms.length === 0) return { ok: false, code: 'manifest_invalid' }
  const packs: Record<string, RuntimePack> = {}
  for (const platform of platforms) {
    if (!PLATFORM_KEY.test(platform)) return { ok: false, code: 'manifest_invalid' }
    const pack = validatePack(raw.packs[platform])
    if (!pack) return { ok: false, code: 'manifest_invalid' }
    packs[platform] = pack
  }
  return { ok: true, manifest: { format: 1, packs } }
}

export function readManifest(options: { packageRoot: string }): { ok: true; manifest: RuntimeManifest } | { ok: false; code: ManifestFailure } {
  let text: string
  try {
    text = readFileSync(join(options.packageRoot, MANIFEST_FILE), 'utf8')
  } catch {
    return { ok: false, code: 'manifest_invalid' }
  }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, code: 'manifest_invalid' }
  }
  return validateManifest(raw)
}

export function selectPack(manifest: RuntimeManifest, platform: string): PackSelection {
  const pack = manifest.packs[platform]
  if (!pack) return { ok: false, code: 'platform_unsupported' }
  if (isUnpublished(pack)) return { ok: false, code: 'pack_missing' }
  return { ok: true, platform, pack }
}

export function loadPack(options: { packageRoot: string; platform: string }): PackSelection {
  const read = readManifest({ packageRoot: options.packageRoot })
  if (!read.ok) return read
  return selectPack(read.manifest, options.platform)
}

/** Keep only a well-formed record; a damaged `current.json` degrades to null
 * so the caller falls back to a clean install. */
export function sanitizeCurrent(raw: unknown): RuntimeCurrent | null {
  if (!isRecord(raw) || raw.version !== 1) return null
  const runtimeVersion = typeof raw.runtimeVersion === 'string' ? raw.runtimeVersion.trim() : ''
  if (!isRuntimeVersion(runtimeVersion)) return null
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : ''
  if (!updatedAt) return null
  const current: RuntimeCurrent = { version: 1, runtimeVersion, updatedAt }
  if (raw.previousVersion !== undefined) {
    const previous = typeof raw.previousVersion === 'string' ? raw.previousVersion.trim() : ''
    if (!isRuntimeVersion(previous)) return null
    current.previousVersion = previous
  }
  return current
}
