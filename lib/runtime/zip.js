import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { open } from 'yauzl';
import { endStream, writeChunk } from "./download.js";
export const RUNTIME_MANIFEST = 'runtime-manifest.json';
class Aborted extends Error {
}
class Unsafe extends Error {
}
class MissingManifest extends Error {
}
function openZip(path) {
    return new Promise((resolveZip, reject) => {
        open(path, { lazyEntries: true, autoClose: true }, (error, zip) => {
            if (error || !zip)
                reject(error ?? new Error('zip could not be opened'));
            else
                resolveZip(zip);
        });
    });
}
/** yauzl normalises separators already; the guard also covers raw names. */
function entryName(entry) {
    return entry.fileName.replace(/\\/g, '/');
}
function isUnsafeName(name) {
    if (!name || name.includes('\0'))
        return true;
    if (name.startsWith('/') || name.startsWith('//') || /^[A-Za-z]:/.test(name))
        return true;
    return name.split('/').some((segment) => segment === '..' || segment === '.');
}
const isSymlink = (entry) => ((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000;
async function uncompressedTotal(zipPath) {
    const zip = await openZip(zipPath);
    return new Promise((resolveTotal, reject) => {
        let total = 0;
        zip.on('error', reject);
        zip.on('end', () => resolveTotal(total));
        zip.on('entry', (entry) => {
            if (!entry.fileName.endsWith('/'))
                total += entry.uncompressedSize;
            zip.readEntry();
        });
        zip.readEntry();
    });
}
async function extractEntries(zipPath, tmp, request, total) {
    const zip = await openZip(zipPath);
    const root = resolve(tmp);
    let received = 0;
    const extractOne = async (entry) => {
        if (request.signal?.aborted)
            throw new Aborted();
        const name = entryName(entry);
        if (isUnsafeName(name))
            throw new Unsafe(name);
        if (isSymlink(entry))
            throw new Unsafe(`symlink entry: ${name}`);
        const destination = resolve(root, name);
        if (destination !== root && !destination.startsWith(root + sep))
            throw new Unsafe(name);
        if (name.endsWith('/')) {
            mkdirSync(destination, { recursive: true });
            return;
        }
        mkdirSync(dirname(destination), { recursive: true });
        await new Promise((resolveFile, rejectFile) => {
            zip.openReadStream(entry, (error, stream) => {
                if (error || !stream) {
                    rejectFile(error ?? new Error(`cannot read ${name}`));
                    return;
                }
                const out = createWriteStream(destination);
                void (async () => {
                    try {
                        for await (const chunk of stream) {
                            if (request.signal?.aborted)
                                throw new Aborted();
                            const buffer = chunk;
                            await writeChunk(out, buffer);
                            received += buffer.length;
                            request.onProgress?.({ phase: 'extract', received, total });
                        }
                        await endStream(out);
                        resolveFile();
                    }
                    catch (streamError) {
                        await endStream(out);
                        rejectFile(streamError);
                    }
                })();
            });
        });
    };
    await new Promise((resolveDone, reject) => {
        let settled = false;
        const fail = (error) => {
            if (settled)
                return;
            settled = true;
            try {
                zip.close();
            }
            catch {
                // already closed
            }
            reject(error);
        };
        zip.on('error', fail);
        zip.on('end', () => {
            if (settled)
                return;
            settled = true;
            resolveDone();
        });
        zip.on('entry', (entry) => {
            void extractOne(entry).then(() => zip.readEntry(), (error) => fail(error));
        });
        zip.readEntry();
    });
}
/** Extract into `<version>.tmp` and swap it in only when the pack carries its
 * manifest marker. An interrupted or rejected extraction leaves nothing. */
export async function extractPack(request) {
    const dir = join(request.runtimeRoot, request.version);
    const tmp = `${dir}.tmp`;
    if (existsSync(join(dir, RUNTIME_MANIFEST)))
        return { ok: true, dir, reused: true };
    const fail = (code, detail) => ({ ok: false, code, detail });
    try {
        rmSync(dir, { recursive: true, force: true });
        rmSync(tmp, { recursive: true, force: true });
        mkdirSync(request.runtimeRoot, { recursive: true });
        const total = await uncompressedTotal(request.zipPath);
        await extractEntries(request.zipPath, tmp, request, total);
        if (!existsSync(join(tmp, RUNTIME_MANIFEST)))
            throw new MissingManifest();
        renameSync(tmp, dir);
        return { ok: true, dir, reused: false };
    }
    catch (error) {
        rmSync(tmp, { recursive: true, force: true });
        if (error instanceof Aborted || request.signal?.aborted)
            return fail('aborted', 'extraction cancelled');
        if (error instanceof Unsafe)
            return fail('unsafe_entry', error.message);
        if (error instanceof MissingManifest)
            return fail('missing_manifest', `${RUNTIME_MANIFEST} is missing from the pack`);
        return fail('zip_invalid', error instanceof Error ? error.message : String(error));
    }
}
