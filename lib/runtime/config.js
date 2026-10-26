/** External mode passes the settings through. Managed mode ignores any
 * `backendUrl`/`apiToken` left in the profile: the address comes from the
 * running instance and the token only from `state/service.json`, which is what
 * keeps a stale profile token from turning every call into a 401. */
export function createEffectiveConfig(raw, runtime) {
    if (runtime.mode === 'external') {
        return {
            backendUrl: raw.backendUrl.trim(),
            apiToken: raw.apiToken.trim(),
            autoSyncModels: raw.autoSyncModels,
        };
    }
    return {
        autoSyncModels: raw.autoSyncModels,
        get backendUrl() {
            return runtime.backendUrl() ?? '';
        },
        get apiToken() {
            return runtime.apiToken();
        },
        runtimeNotReady: () => (runtime.backendUrl() ? null : { phase: runtime.phase() }),
    };
}
