export interface Config {
  backendUrl: string
  apiToken: string
  autoSyncModels: boolean
}

/**
 * Config values arrive from the bundle patch `config:` block into
 * `apply(ctx, config)`. A schemastery schema export is deliberately not
 * declared here: `@deepseek-ai/schemastery` is not in the loader's provided
 * peer surface (only `@deepseek-ai/dsh-tools` + `cordis` are), and importing
 * it fails the whole entry at activation. The settings form ships in T3 via
 * the composition-provided path (see dsh-knowledge's bundle).
 */
/** Empty `backendUrl` means "run the bundled service": the plugin provisions
 * and supervises it under the runtime root. A non-empty value keeps the old
 * external mode and nothing is downloaded. */
export const defaultConfig: Config = {
  backendUrl: '',
  apiToken: '',
  autoSyncModels: true,
}
