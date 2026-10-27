import { join } from 'node:path';
export const LANGFUSE_ENV_KEYS = [
    'LANGFUSE_TRACING',
    'LANGFUSE_PUBLIC_KEY',
    'LANGFUSE_SECRET_KEY',
    'LANGFUSE_BASE_URL',
];
/** Env additions the engine needs from the runtime pack. The host overlays this
 * object last, so PATH must carry the host PATH or child tools disappear. */
export function runtimeEngineExtras(runtime, env) {
    const hostPath = env.PATH ?? env.Path ?? '';
    const extras = {
        PATH: [join(runtime, 'ffmpeg'), hostPath].filter(Boolean).join(';'),
        TIKTOKEN_CACHE_DIR: join(runtime, 'tiktoken-cache'),
    };
    for (const key of LANGFUSE_ENV_KEYS) {
        const value = env[key];
        if (value)
            extras[key] = value;
    }
    return extras;
}
