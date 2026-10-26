export class HarnessRagError extends Error {
    info;
    constructor(info) {
        super(info.detail);
        this.info = info;
    }
}
/**
 * One outbound entry point for the knowledge service. Tools never build URLs
 * themselves, so the backend surface stays replaceable in one place.
 *
 * GET surfaces (documents / chunks) take their parameters as query values —
 * the knowledge service declares them Query(...) and never reads a GET body.
 */
export async function api(config, path, init) {
    const waiting = config.runtimeNotReady?.();
    if (waiting) {
        throw new HarnessRagError({
            kind: 'runtime_not_ready',
            detail: `runtime_not_ready: the local knowledge service is not ready (phase: ${waiting.phase}). Open the knowledge-base panel to finish setup, or retry later.`,
        });
    }
    const base = config.backendUrl?.trim();
    if (!base) {
        throw new HarnessRagError({
            kind: 'not_configured',
            detail: 'backendUrl is not configured (settings → harness-rag).',
        });
    }
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(init?.query ?? {})) {
        // 数组 → 重复键（FastAPI List[...] Query 口径：chunks-by-ids 的 ids 多值）。
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item !== undefined && item !== null && item !== '')
                    url.searchParams.append(key, String(item));
            }
            continue;
        }
        if (value !== undefined && value !== null && value !== '')
            url.searchParams.set(key, String(value));
    }
    const headers = { 'content-type': 'application/json' };
    if (config.apiToken)
        headers.authorization = `Bearer ${config.apiToken}`;
    let response;
    try {
        response = await fetch(url, {
            method: init?.method ?? (init?.body === undefined ? 'GET' : 'POST'),
            headers,
            body: init?.body === undefined ? undefined : JSON.stringify(init.body),
            signal: init?.signal,
        });
    }
    catch (cause) {
        throw new HarnessRagError({
            kind: 'network',
            detail: `knowledge service unreachable: ${String(cause)}`,
        });
    }
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new HarnessRagError({
            kind: 'http',
            status: response.status,
            detail: `${response.status} ${detail.slice(0, 200)}`,
        });
    }
    // 204 / empty bodies (e.g. DELETE document) are a legitimate "no payload".
    if (response.status === 204)
        return null;
    const text = await response.text();
    return (text ? JSON.parse(text) : null);
}
