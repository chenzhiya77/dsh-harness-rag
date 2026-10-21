import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import { defaultConfig, type Config } from './settings.ts'
import { registerKbProxy } from './kb_proxy.ts'
import { registerModelProxy, type ProxyHostContextLike } from './model_proxy.ts'
import { registerModelSync, type SyncHostContextLike } from './model_sync.ts'
import { registerTools } from './tools.ts'

export const name = 'dsh-harness-rag'
// Host half only: the host world provides `tools` but never `slots` — UI
// registration lives in the browser half (client.js).
export const inject = ['tools']

export function apply(ctx: Context, config: Config = defaultConfig): void {
  const merged = { ...defaultConfig, ...config }
  registerTools(ctx, merged)
  // The panel's data seam (T3 Task 1): a named route on the browser-facing
  // web server, skipped where that service does not exist (headless).
  const modelProxy = registerModelProxy(ctx as unknown as ProxyHostContextLike, merged)
  const modelSync = registerModelSync(ctx as unknown as SyncHostContextLike, merged, modelProxy)
  registerKbProxy(ctx, merged, modelSync)
}
