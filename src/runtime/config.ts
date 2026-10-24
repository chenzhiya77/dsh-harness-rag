import type { Config } from '../settings.ts'

export interface ManagedRuntime {
  mode: 'managed'
  /** Base URL of the local service, or null while it is not ready. */
  backendUrl(): string | null
  apiToken(): string
  phase(): string
}

export interface ExternalRuntime {
  mode: 'external'
}

export type RuntimeSource = ManagedRuntime | ExternalRuntime

export interface EffectiveConfig extends Config {
  readonly runtimeNotReady?: () => { phase: string } | null
}

/** External mode passes the settings through. Managed mode ignores any
 * `backendUrl`/`apiToken` left in the profile: the address comes from the
 * running instance and the token only from `state/service.json`, which is what
 * keeps a stale profile token from turning every call into a 401. */
export function createEffectiveConfig(raw: Config, runtime: RuntimeSource): EffectiveConfig {
  if (runtime.mode === 'external') {
    return {
      backendUrl: raw.backendUrl.trim(),
      apiToken: raw.apiToken.trim(),
      autoSyncModels: raw.autoSyncModels,
    }
  }
  return {
    autoSyncModels: raw.autoSyncModels,
    get backendUrl() {
      return runtime.backendUrl() ?? ''
    },
    get apiToken() {
      return runtime.apiToken()
    },
    runtimeNotReady: () => (runtime.backendUrl() ? null : { phase: runtime.phase() }),
  }
}
