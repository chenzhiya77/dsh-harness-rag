import { createBindingsStore } from "./bindings.js";
import { defaultConfig } from "./settings.js";
import { registerConfigRecognize } from "./config_recognize.js";
import { registerKbProxy } from "./kb_proxy.js";
import { registerModelProxy } from "./model_proxy.js";
import { registerModelSync } from "./model_sync.js";
import { registerToolGating } from "./tool_gating.js";
import { createRuntimeBridge } from "./runtime/bridge.js";
export const name = 'dsh-harness-rag';
// Host half only: the host world provides `tools` but never `slots` — UI
// registration lives in the browser half (client.js). `subprocess`,
// `webServer`, and `directoryPicker` are looked up lazily by the runtime
// bridge so the plugin still activates in headless profiles.
export const inject = ['tools'];
export function apply(ctx, config = defaultConfig) {
    const merged = { ...defaultConfig, ...config };
    // Session→knowledge-base bindings survive restarts next to the host's own
    // data; loaded synchronously so tool dispatch never waits on the file.
    const bindings = createBindingsStore();
    bindings.loadSync();
    // Managed mode (empty backendUrl) provisions and supervises the local
    // service; external mode keeps the settings as they are. Every consumer
    // below reads the effective config, never the raw one.
    const runtime = createRuntimeBridge(ctx, merged);
    // Knowledge tools and the retrieval-discipline prompt section mount per
    // bound session (agent scope), never globally (spec 2026-10-23
    // binding-tool-gating D1/D2, spec 2026-10-25 rag-soul-section D1/D2).
    const gating = registerToolGating(ctx, runtime.effective, bindings);
    // The panel's data seam (T3 Task 1): a named route on the browser-facing
    // web server, skipped where that service does not exist (headless).
    const modelProxy = registerModelProxy(ctx, runtime.effective);
    registerConfigRecognize(ctx, modelProxy);
    const modelSync = registerModelSync(ctx, runtime.effective, modelProxy);
    runtime.addReadyListener(modelSync);
    registerKbProxy(ctx, runtime.effective, bindings, modelSync, gating, runtime.ops);
    ctx.effect(() => () => runtime.stop(), 'harness-rag: runtime bridge');
}
