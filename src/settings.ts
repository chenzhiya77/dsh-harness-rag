export interface Config {
  backendUrl: string
  apiToken: string
  defaultKbId: string
}

/**
 * Config values arrive from the bundle patch `config:` block into
 * `apply(ctx, config)`. A schemastery schema export is deliberately not
 * declared here: `@deepseek-ai/schemastery` is not in the loader's provided
 * peer surface (only `@deepseek-ai/dsh-tools` + `cordis` are), and importing
 * it fails the whole entry at activation. The settings form ships in T3 via
 * the composition-provided path (see dsh-knowledge's bundle).
 */
export const defaultConfig: Config = {
  backendUrl: 'http://127.0.0.1:8020',
  apiToken: '',
  defaultKbId: '',
}
