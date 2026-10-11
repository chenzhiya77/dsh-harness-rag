import type { Config } from './settings.ts'

export interface ApiError {
  kind: 'not_configured' | 'http' | 'network'
  status?: number
  detail: string
}

export class HarnessRagError extends Error {
  readonly info: ApiError
  constructor(info: ApiError) {
    super(info.detail)
    this.info = info
  }
}

/**
 * One outbound entry point for the knowledge service. Tools never build URLs
 * themselves, so the backend surface stays replaceable in one place.
 *
 * GET surfaces (documents / chunks) take their parameters as query values —
 * the knowledge service declares them Query(...) and never reads a GET body.
 */
export async function api<T>(
  config: Config,
  path: string,
  init?: { method?: string; body?: unknown; query?: Record<string, unknown>; signal?: AbortSignal },
): Promise<T> {
  const base = config.backendUrl?.trim()
  if (!base) {
    throw new HarnessRagError({
      kind: 'not_configured',
      detail: 'backendUrl is not configured (settings → harness-rag).',
    })
  }
  const url = new URL(path, base)
  for (const [key, value] of Object.entries(init?.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (config.apiToken) headers.authorization = `Bearer ${config.apiToken}`
  let response: Response
  try {
    response = await fetch(url, {
      method: init?.method ?? (init?.body === undefined ? 'GET' : 'POST'),
      headers,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init?.signal,
    })
  } catch (cause) {
    throw new HarnessRagError({
      kind: 'network',
      detail: `knowledge service unreachable: ${String(cause)}`,
    })
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new HarnessRagError({
      kind: 'http',
      status: response.status,
      detail: `${response.status} ${detail.slice(0, 200)}`,
    })
  }
  return (await response.json()) as T
}
