import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import { createBindingsStore } from './bindings.ts'
import { defaultConfig, type Config } from './settings.ts'
import { registerKbProxy } from './kb_proxy.ts'
import { registerModelProxy, type ProxyHostContextLike } from './model_proxy.ts'
import { registerModelSync, type SyncHostContextLike } from './model_sync.ts'
import { registerToolGating } from './tool_gating.ts'

export const name = 'dsh-harness-rag'
// Host half only: the host world provides `tools` but never `slots` — UI
// registration lives in the browser half (client.js).
export const inject = ['tools']

export function apply(ctx: Context, config: Config = defaultConfig): void {
  const merged = { ...defaultConfig, ...config }
  // Session→knowledge-base bindings survive restarts next to the host's own
  // data; loaded synchronously so tool dispatch never waits on the file.
  const bindings = createBindingsStore()
  bindings.loadSync()
  // Knowledge tools mount per bound session (agent scope), never globally
  // (spec 2026-10-23 binding-tool-gating D1/D2).
  const gating = registerToolGating(ctx, merged, bindings)
  // The panel's data seam (T3 Task 1): a named route on the browser-facing
  // web server, skipped where that service does not exist (headless).
  const modelProxy = registerModelProxy(ctx as unknown as ProxyHostContextLike, merged)
  const modelSync = registerModelSync(ctx as unknown as SyncHostContextLike, merged, modelProxy)
  registerKbProxy(ctx, merged, bindings, modelSync, gating)
}
