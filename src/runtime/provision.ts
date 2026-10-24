import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { downloadPack, type DownloadProgress } from './download.ts'
import { isUnpublished, type RuntimePack } from './manifest.ts'
import { downloadsDir, runtimeDir, runtimeRoot } from './paths.ts'
import { RUNTIME_MANIFEST, extractPack } from './zip.ts'
import type { EnsureStep } from './supervisor.ts'

export interface ProvisionRequest {
  root: string
  version: string
  platform: string
  pack: RuntimePack
  signal?: AbortSignal
  onProgress?: (progress: DownloadProgress) => void
}

/** Download to `downloads/`, then unpack into `runtime/<version>`. Both halves
 * are resumable/idempotent, so a retry after a failure picks up where it
 * stopped and a finished runtime is never downloaded again. */
export async function ensureRuntime(request: ProvisionRequest): Promise<EnsureStep> {
  if (isUnpublished(request.pack)) return { kind: 'failed', code: 'pack_missing' }
  const installed = runtimeDir(request.root, request.version)
  if (existsSync(join(installed, RUNTIME_MANIFEST))) return { kind: 'ok' }

  const zipPath = join(
    downloadsDir(request.root),
    `harness-rag-runtime-${request.platform}-${request.version}.zip`,
  )
  const downloaded = await downloadPack({
    urls: request.pack.urls,
    size: request.pack.size,
    unpackedSize: request.pack.unpackedSize,
    sha256: request.pack.sha256,
    targetPath: zipPath,
    signal: request.signal,
    onProgress: request.onProgress,
  })
  if (!downloaded.ok) return { kind: 'failed', code: downloaded.code, detail: downloaded.detail }

  const extracted = await extractPack({
    zipPath,
    runtimeRoot: runtimeRoot(request.root),
    version: request.version,
    signal: request.signal,
    onProgress: request.onProgress,
  })
  if (!extracted.ok) return { kind: 'failed', code: extracted.code, detail: extracted.detail }
  return { kind: 'ok' }
}
