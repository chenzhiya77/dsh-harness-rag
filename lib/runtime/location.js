import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, statfsSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { defaultRoot } from "./paths.js";
/** The custom-root anchor. It lives in the anchor root (`<DSH_HOME>/harness-rag`)
 * and never moves with the runtime root. */
export const LOCATION_FILE = 'location.json';
/** Windows budgets a runtime root at 120 chars: `MAX_PATH` 259 minus the
 * `runtime\<version>\` segment plus the longest pack entry (measured ≤120). */
const WINDOWS_ROOT_BUDGET = 120;
/** A write probe catches ACL denials that an access check would miss. */
export function probeWritable(dir) {
    const probe = join(dir, `.hrag-write-probe-${process.pid}-${Date.now()}`);
    try {
        writeFileSync(probe, '');
        unlinkSync(probe);
        return true;
    }
    catch {
        return false;
    }
}
const defaultFs = {
    readFileSync: (path, encoding) => readFileSync(path, encoding),
    existsSync: (path) => existsSync(path),
    mkdirSync: (path, options) => {
        mkdirSync(path, options);
    },
    writeFileSync: (path, data, encoding) => writeFileSync(path, data, encoding),
    renameSync: (from, to) => renameSync(from, to),
    isWritable: probeWritable,
};
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export function locationPath(anchorRoot) {
    return join(anchorRoot, LOCATION_FILE);
}
export function readLocation(anchorRoot, fs = defaultFs) {
    const path = locationPath(anchorRoot);
    let text;
    try {
        text = fs.readFileSync(path, 'utf8');
    }
    catch {
        return { kind: 'none', path };
    }
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch {
        return { kind: 'invalid', path, reason: 'location.json is not valid JSON' };
    }
    if (!isRecord(raw) || raw.version !== 1) {
        return { kind: 'invalid', path, reason: 'location.json version is not 1' };
    }
    const root = typeof raw.root === 'string' ? raw.root.trim() : '';
    if (!root || !isAbsolute(root)) {
        return { kind: 'invalid', path, reason: 'location.json root is not an absolute path' };
    }
    return { kind: 'ok', path, root };
}
/** Absolute runs of the custom root are recorded atomically, so a crash never
 * leaves a half-written anchor behind. */
export function writeLocation(anchorRoot, root, fs = defaultFs) {
    const path = locationPath(anchorRoot);
    const target = root.trim();
    if (!isAbsolute(target))
        throw new Error(`runtime root is not absolute: ${root}`);
    fs.mkdirSync(anchorRoot, { recursive: true });
    const temp = `${path}.tmp-${process.pid}`;
    fs.writeFileSync(temp, `${JSON.stringify({ version: 1, root: target }, null, 2)}\n`, 'utf8');
    fs.renameSync(temp, path);
    return path;
}
/** Anchor first, default root second. An anchor that points at a missing or
 * unwritable target is reported, never silently replaced: the user chose it. */
export function resolveRoot(options) {
    const fs = options.fs ?? defaultFs;
    const anchorRoot = options.anchorRoot;
    const read = readLocation(anchorRoot, fs);
    if (read.kind === 'none') {
        return { kind: 'ok', source: 'default', root: defaultRoot(options.env) };
    }
    if (read.kind === 'invalid') {
        return { kind: 'ok', source: 'default', root: defaultRoot(options.env), warning: read.reason };
    }
    if (!fs.existsSync(read.root)) {
        return {
            kind: 'needs_location',
            anchorRoot,
            previousRoot: read.root,
            reason: `target root does not exist: ${read.root}`,
        };
    }
    if (!fs.isWritable(read.root)) {
        return {
            kind: 'needs_location',
            anchorRoot,
            previousRoot: read.root,
            reason: `target root is not writable: ${read.root}`,
        };
    }
    return { kind: 'ok', source: 'anchor', root: read.root };
}
/** `<parent>/harness-rag`, unless the parent is already named that. */
export function targetRoot(parent) {
    return basename(parent).toLowerCase() === 'harness-rag' ? parent : join(parent, 'harness-rag');
}
const fold = (path) => (process.platform === 'win32' ? path.toLowerCase() : path);
/** True when `candidate` is `base` or lives beneath it. */
function containsPath(base, candidate) {
    const rest = relative(fold(resolve(base)), fold(resolve(candidate)));
    return rest === '' || (!rest.startsWith('..') && !isAbsolute(rest));
}
function hasNodeModulesSegment(path) {
    return fold(path)
        .split(/[\\/]+/)
        .some((segment) => segment === 'node_modules');
}
function systemDirsOf(input) {
    if (input.systemDirs)
        return input.systemDirs;
    if ((input.platform ?? process.platform) !== 'win32')
        return [];
    const env = input.env ?? process.env;
    const keys = ['SystemRoot', 'windir', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramW6432', 'ProgramData'];
    return keys.map((key) => env[key]?.trim()).filter((value) => Boolean(value));
}
function syncDriveOf(parent, env) {
    const keys = ['OneDrive', 'OneDriveConsumer', 'OneDriveCommercial', 'OneDriveBusiness'];
    return keys.some((key) => {
        const dir = env[key]?.trim();
        return dir ? containsPath(dir, parent) : false;
    });
}
function nearestExisting(path) {
    let current = resolve(path);
    for (;;) {
        if (existsSync(current))
            return current;
        const parent = dirname(current);
        if (parent === current)
            return null;
        current = parent;
    }
}
function freeBytesOf(path) {
    try {
        const stats = statfsSync(path);
        return stats.bavail * stats.bsize;
    }
    catch {
        return null;
    }
}
/** Markers that make an existing `harness-rag` directory ours (spec §4.1). */
function carriesPluginData(root) {
    if (existsSync(join(root, 'bindings.json')) || existsSync(join(root, LOCATION_FILE)))
        return true;
    const runtime = join(root, 'runtime');
    if (!existsSync(runtime))
        return false;
    try {
        return readdirSync(runtime, { withFileTypes: true }).some((entry) => entry.isDirectory() && existsSync(join(runtime, entry.name, 'runtime-manifest.json')));
    }
    catch {
        return false;
    }
}
/** Read-only checks before a parent directory becomes the runtime root. The
 * caller creates nothing until this returns ok. */
export function validateRootCandidate(input) {
    const fail = (code, reason) => ({ ok: false, code, reason });
    const parent = input.parent?.trim() ?? '';
    if (!parent || !isAbsolute(parent))
        return fail('path_not_absolute', `not an absolute path: ${input.parent}`);
    if (/^[\\/]{2}/.test(parent) || input.isRemotePath?.(parent)) {
        return fail('network_path', `network paths are not supported: ${parent}`);
    }
    if (hasNodeModulesSegment(parent) || (input.pluginRoot && containsPath(input.pluginRoot, parent))) {
        return fail('plugin_dir', `inside a plugin directory: ${parent}`);
    }
    if (containsPath(input.anchorRoot, parent) && fold(resolve(parent)) !== fold(resolve(input.anchorRoot))) {
        return fail('nested_in_anchor', `nested inside the anchor root: ${parent}`);
    }
    for (const dir of systemDirsOf(input)) {
        if (containsPath(dir, parent))
            return fail('system_dir', `system directory: ${parent}`);
    }
    const root = targetRoot(parent);
    if ((input.platform ?? process.platform) === 'win32' && root.length > WINDOWS_ROOT_BUDGET) {
        return fail('path_too_long', `runtime root exceeds ${WINDOWS_ROOT_BUDGET} characters: ${root}`);
    }
    if (existsSync(root)) {
        let isDirectory = false;
        try {
            isDirectory = statSync(root).isDirectory();
        }
        catch {
            isDirectory = false;
        }
        if (!isDirectory || !carriesPluginData(root)) {
            return fail('target_not_plugin_data', `existing directory is not plugin data: ${root}`);
        }
    }
    const writableAt = nearestExisting(root);
    if (!writableAt)
        return fail('not_writable', `no writable ancestor: ${root}`);
    const isWritable = input.isWritable ?? probeWritable;
    if (!isWritable(writableAt))
        return fail('not_writable', `not writable: ${writableAt}`);
    if (input.size && input.size > 0) {
        const required = Math.ceil(input.size + (input.unpackedSize ?? 0) * 1.1);
        const free = (input.freeBytes ?? freeBytesOf)(writableAt);
        if (free !== null && free < required) {
            return fail('space_insufficient', `needs ${required} bytes, ${free} available: ${writableAt}`);
        }
    }
    return { ok: true, root, needsSyncConfirm: syncDriveOf(parent, input.env ?? process.env) };
}
