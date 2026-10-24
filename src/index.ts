import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-tools'
import { createBindingsStore } from './bindings.ts'
import { defaultConfig, type Config } from './settings.ts'
import { registerKbProxy } from './kb_proxy.ts'
import { registerModelProxy, type ProxyHostContextLike } from './model_proxy.ts'
import { registerModelSync, type SyncHostContextLike } from './model_sync.ts'
import { registerToolGating } from './tool_gating.ts'
import { createRuntimeBridge, type BridgeHost } from './runtime/bridge.ts'

export const name = 'dsh-harness-rag'
// Host half only: the host world provides `tools` but never `slots` — UI
// registration lives in the browser half (client.js). `subprocess`,
// `webServer`, and `directoryPicker` are looked up lazily by the runtime
// bridge so the plugin still activates in headless profiles.
export const inject = ['tools']

export function apply(ctx: Context, config: Config = defaultConfig): void {
  const merged = { ...defaultConfig, ...config }
  // Session→knowledge-base bindings survive restarts next to the host's own
  // data; loaded synchronously so tool dispatch never waits on the file.
  const bindings = createBindingsStore()
  bindings.loadSync()
  // Managed mode (empty backendUrl) provisions and supervises the local
  // service; external mode keeps the settings as they are. Every consumer
  // below reads the effective config, never the raw one.
  const runtime = createRuntimeBridge(ctx as unknown as BridgeHost, merged)
  // Knowledge tools mount per bound session (agent scope), never globally
  // (spec 2026-10-23 binding-tool-gating D1/D2).
  const gating = registerToolGating(ctx, runtime.effective, bindings)
  // The panel's data seam (T3 Task 1): a named route on the browser-facing
  // web server, skipped where that service does not exist (headless).
  const modelProxy = registerModelProxy(ctx as unknown as ProxyHostContextLike, runtime.effective)
  const modelSync = registerModelSync(ctx as unknown as SyncHostContextLike, runtime.effective, modelProxy)
  runtime.addReadyListener(modelSync)
  registerKbProxy(ctx, runtime.effective, bindings, modelSync, gating, runtime.ops)
  ctx.effect(() => () => runtime.stop(), 'harness-rag: runtime bridge')
}
