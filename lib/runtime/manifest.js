import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from "./paths.js";
export const MANIFEST_FILE = 'runtime.json';
const PLATFORM_KEY = /^(win32|darwin|linux)-(x64|arm64)$/;
const VERSION_TEXT = /^[0-9A-Za-z._-]+$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const isCount = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0;
/** Version strings double as directory names, so `.` and `..` are out. */
export function isRuntimeVersion(value) {
    return typeof value === 'string' && VERSION_TEXT.test(value) && value !== '.' && value !== '..';
}
function isHttpsUrl(value) {
    if (typeof value !== 'string')
        return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.hostname.length > 0;
    }
    catch {
        return false;
    }
}
/** An unpublished pack: no URL or no size yet. It validates so the plugin can
 * ship a manifest before the first release, but never selects. */
export function isUnpublished(pack) {
    return pack.urls.length === 0 || pack.size === 0;
}
function validatePack(raw) {
    if (!isRecord(raw))
        return null;
    if (!isRuntimeVersion(raw.runtimeVersion))
        return null;
    const engineVersion = nonEmpty(raw.engineVersion) ? raw.engineVersion.trim() : '';
    const engineCommit = nonEmpty(raw.engineCommit) ? raw.engineCommit.trim() : '';
    const pythonVersion = nonEmpty(raw.pythonVersion) ? raw.pythonVersion.trim() : '';
    const qdrantVersion = nonEmpty(raw.qdrantVersion) ? raw.qdrantVersion.trim() : '';
    if (!engineVersion || !engineCommit || !pythonVersion || !qdrantVersion)
        return null;
    if (!isCount(raw.configVersion) || raw.configVersion === 0)
        return null;
    if (!Array.isArray(raw.urls))
        return null;
    if (!isCount(raw.size) || !isCount(raw.unpackedSize))
        return null;
    if (typeof raw.sha256 !== 'string')
        return null;
    const pack = {
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
    };
    if (isUnpublished(pack))
        return pack;
    if (!pack.urls.every(isHttpsUrl))
        return null;
    if (!SHA256_HEX.test(pack.sha256))
        return null;
    if (pack.unpackedSize === 0)
        return null;
    return pack;
}
export function validateManifest(raw) {
    if (!isRecord(raw) || raw.format !== 1 || !isRecord(raw.packs))
        return { ok: false, code: 'manifest_invalid' };
    const platforms = Object.keys(raw.packs);
    if (platforms.length === 0)
        return { ok: false, code: 'manifest_invalid' };
    const packs = {};
    for (const platform of platforms) {
        if (!PLATFORM_KEY.test(platform))
            return { ok: false, code: 'manifest_invalid' };
        const pack = validatePack(raw.packs[platform]);
        if (!pack)
            return { ok: false, code: 'manifest_invalid' };
        packs[platform] = pack;
    }
    return { ok: true, manifest: { format: 1, packs } };
}
export function readManifest(options) {
    let text;
    try {
        text = readFileSync(join(options.packageRoot, MANIFEST_FILE), 'utf8');
    }
    catch {
        return { ok: false, code: 'manifest_invalid' };
    }
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        return { ok: false, code: 'manifest_invalid' };
    }
    return validateManifest(raw);
}
export function selectPack(manifest, platform, options = {}) {
    const pack = manifest.packs[platform];
    if (!pack)
        return { ok: false, code: 'platform_unsupported' };
    if (isUnpublished(pack)) {
        if (!options.allowUnpublished)
            return { ok: false, code: 'pack_missing' };
        // The local zip supplies the bytes, but a real build must have filled the
        // size metadata; the 0.0.0-0 placeholder must never become a target.
        if (pack.runtimeVersion === '0.0.0-0' || pack.size === 0 || pack.unpackedSize === 0) {
            return { ok: false, code: 'pack_missing' };
        }
    }
    return { ok: true, platform, pack };
}
export function loadPack(options) {
    const read = readManifest({ packageRoot: options.packageRoot });
    if (!read.ok)
        return read;
    return selectPack(read.manifest, options.platform, { allowUnpublished: options.allowUnpublished });
}
/** Keep only a well-formed record; a damaged `current.json` degrades to null
 * so the caller falls back to a clean install. */
export function sanitizeCurrent(raw) {
    if (!isRecord(raw) || raw.version !== 1)
        return null;
    const runtimeVersion = typeof raw.runtimeVersion === 'string' ? raw.runtimeVersion.trim() : '';
    if (!isRuntimeVersion(runtimeVersion))
        return null;
    const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : '';
    if (!updatedAt)
        return null;
    const current = { version: 1, runtimeVersion, updatedAt };
    if (raw.previousVersion !== undefined) {
        const previous = typeof raw.previousVersion === 'string' ? raw.previousVersion.trim() : '';
        if (!isRuntimeVersion(previous))
            return null;
        current.previousVersion = previous;
    }
    return current;
}
const isUpgradeState = (value) => value === 'pending' || value === 'ready' || value === 'needs_confirmation' || value === 'blocked';
function sanitizeError(raw) {
    if (!isRecord(raw))
        return null;
    const phase = typeof raw.phase === 'string' ? raw.phase.trim() : '';
    const code = typeof raw.code === 'string' ? raw.code.trim() : '';
    if (!phase || !code)
        return null;
    const error = { phase, code };
    if (raw.detail !== undefined) {
        if (typeof raw.detail !== 'string')
            return null;
        error.detail = raw.detail;
    }
    return error;
}
export function sanitizeUpgrade(raw) {
    if (!isRecord(raw) || raw.version !== 1)
        return null;
    const targetVersion = typeof raw.targetVersion === 'string' ? raw.targetVersion.trim() : '';
    if (!isRuntimeVersion(targetVersion))
        return null;
    const fromVersion = typeof raw.fromVersion === 'string' ? raw.fromVersion.trim() : '';
    if (!isRuntimeVersion(fromVersion))
        return null;
    if (!isCount(raw.configVersion))
        return null;
    if (!isUpgradeState(raw.state))
        return null;
    const requestedAt = typeof raw.requestedAt === 'string' ? raw.requestedAt.trim() : '';
    const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt.trim() : '';
    if (!requestedAt || !updatedAt)
        return null;
    const record = {
        version: 1,
        targetVersion,
        fromVersion,
        configVersion: raw.configVersion,
        state: raw.state,
        requestedAt,
        updatedAt,
    };
    if (raw.confirmedConfigVersion !== undefined) {
        if (!isCount(raw.confirmedConfigVersion) || raw.confirmedConfigVersion === 0)
            return null;
        record.confirmedConfigVersion = raw.confirmedConfigVersion;
    }
    if (raw.error !== undefined) {
        const error = sanitizeError(raw.error);
        if (!error)
            return null;
        record.error = error;
    }
    return record;
}
/** A failed record's `fromVersion` is empty only for a first install, which
 * has no current version to roll back to. */
export function sanitizeFailed(raw) {
    if (!isRecord(raw) || raw.version !== 1)
        return null;
    const runtimeVersion = typeof raw.runtimeVersion === 'string' ? raw.runtimeVersion.trim() : '';
    if (!isRuntimeVersion(runtimeVersion))
        return null;
    const fromVersion = typeof raw.fromVersion === 'string' ? raw.fromVersion.trim() : '';
    if (fromVersion !== '' && !isRuntimeVersion(fromVersion))
        return null;
    const failedAt = typeof raw.failedAt === 'string' ? raw.failedAt.trim() : '';
    if (!failedAt)
        return null;
    const error = sanitizeError(raw.error);
    if (!error)
        return null;
    if (typeof raw.rolledBack !== 'boolean')
        return null;
    return { version: 1, runtimeVersion, fromVersion, failedAt, error, rolledBack: raw.rolledBack };
}
export function planCurrent(current, runningVersion, installed) {
    if (!current)
        return { kind: 'first' };
    if (current.runtimeVersion === runningVersion)
        return { kind: 'keep' };
    if (!installed)
        return { kind: 'conflict', previousVersion: current.runtimeVersion };
    return { kind: 'rewrite', previousVersion: current.runtimeVersion };
}
/** Read `state/current.json`; a missing or damaged file reads as null. */
export function readCurrent(root) {
    try {
        return sanitizeCurrent(JSON.parse(readFileSync(join(stateDir(root), 'current.json'), 'utf8')));
    }
    catch {
        return null;
    }
}
/** Write `state/current.json` atomically. A plain restart must not move the
 * pointer: only the first-install write and a successful switch call this. */
export function writeCurrent(root, next, now = () => new Date().toISOString()) {
    if (!isRuntimeVersion(next.runtimeVersion))
        throw new Error(`invalid runtime version: ${next.runtimeVersion}`);
    if (next.previousVersion !== undefined && !isRuntimeVersion(next.previousVersion)) {
        throw new Error(`invalid previous version: ${next.previousVersion}`);
    }
    const record = { version: 1, runtimeVersion: next.runtimeVersion, updatedAt: now() };
    if (next.previousVersion !== undefined)
        record.previousVersion = next.previousVersion;
    const dir = stateDir(root);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'current.json');
    const temp = `${path}.tmp-${process.pid}`;
    writeFileSync(temp, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    renameSync(temp, path);
    return record;
}
