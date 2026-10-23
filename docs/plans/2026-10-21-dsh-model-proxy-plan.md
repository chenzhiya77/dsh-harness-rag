# 插件 —— RAG 功能模型经 DSH 本地代理 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-21-dsh-model-proxy-spec.md](../specs/2026-10-21-dsh-model-proxy-spec.md)
**Status:** 已实现·已验收（2026-10-21）；Task 0–4 全落，Task 5 文档已回写；代码两笔已入库（3d465b6、20dc0a3），文档笔已入库（`69b7dd7`；10-22 补记 `c7a2dde`／`ee5214a`）。Task 3 的旧思考菜单已由 rag-leg-effort 线的逐腿选择器取代。
**Architecture:** 插件宿主半新增本地 OpenAI 兼容代理（`/dsh-harness-rag/llm/v1`），引擎 RAG 腿经代理调用 `ctx.llm.stream`；引擎侧每条 DSH 模型只写一条 `dsh:` 薄别名（代理地址＋别名＋本地代理 token＋能力元数据），不写 provider endpoint/key/协议/thinking 方言。账号主模型因此可用。引擎零代码改动。

**硬约束**：引擎只读（除经其既有 `/api/models/config` 写条目）；探针落仓外 `E:\appdevelop\hrag-probe\`；provider key 不得进入引擎配置、面板响应或日志；DSH 整重启候令；提交候令，提交信息英文 Conventional ASCII；不做流式/tools/per-session 模型；`dsh:` 条目由插件托管。

---

## Task 0 — 落点核实（只读）

> 2026-10-21 完成。以下均为 asar/引擎源码实读；两处与 spec 原假设不同，已按停点回报并同步 spec（§2.1／§4.2／§5／§8），设计不变。

- [x] DSH `LlmRuntime` 方法面：`listProviders`／`listConfigurableProviders`／`listModels`／`resolveModelInfo`／`stream`（asar 实读）。
- [x] `LlmCallConfig` 字段：`provider`／`model`／`reasoningEffort`／`temperature`／`maxTokens`／`stop`，无 per-call thinking。
- [x] 账户/API-key 路由：`deepseek-account` 走 `x-dsh-auth-token`；`deepseek-official` 是 `https://api.deepseek.com/anthropic` 的 Anthropic Messages。
- [x] pi-ai 协议矩阵：三家可映射（`openai-completions`／`openai-responses`／`anthropic-messages`）；`google`／`mistral`／`radius`／`azure`／`bedrock`／`vertex`／`copilot`／`codex` 不自动映射（丙下由 `ctx.llm` 吸收，不再需要名单）。
- [x] 引擎模型 API：GET/PUT `/api/models/config`、POST `/api/models/config/validate`；`source === "ui"` 过滤；`api_key: "********"` 保留；`hidden_in_chat` 整集写。
- [x] `models_config.json` 已引擎 `.gitignore`。
- [x] RAG 腿调用形态：抽取/百科/合成/裁判 `ainvoke`；caption `httpx.post` 非流式；caption 图片为 `image_url` data URL。
- [x] `webServer.port` 在 listen 后可用；`getOrigin()` 返回 `协议://具体本地 IP:端口`。host 在 schema 层拒绝 wildcard，所以 origin 可直接作为引擎 endpoint 基址；TLS 配置时 origin 为 `https:`，引擎会拒自签证书（残差，本机默认无 TLS）。
- [x] 消息构造：system 走 `GenerateOptions.system?: string`，不构造 system 消息；user 可用 `{ role:'user', content }`（即 `RequestUserInput`，无需 id/source）；assistant 必须带 `id` 与 `source:{ kind:'model', provider, model }`，id 本地 `randomUUID()`。
- [x] 图片块：DSH 无内联图片。必须 `ctx.attachments.admitPromptContent([{ type:'image', data:<canonical base64>, mediaType, name? }])`，返回 `{ type:'image', attachment: ref }`。仅收 `image/png|jpeg|webp|gif`；源图 ≤20 MiB/张、≤20 张/消息；归一化后落盘 `<DSH_HOME>/attachments/v1`，永不自动删除、仅内容寻址去重。引擎本地解析允许 BMP，DSH 会拒（415，caption 走既有逐图失败面）。
- [x] chunk 形状：`text-delta`／`reasoning-delta` `{ type, index, text }`；`usage` `{ inputTokens, outputTokens, totalTokens?, cacheReadTokens?, cacheWriteTokens?, reasoningTokens? }`；`finish.reason` kind `stop`／`max-tokens`／`error`／`aborted`（`tool-calls` 在拒绝 tools 后不应出现）；失败在 `finish.reason.failure` `{ code, message, status?, providerRetryAfterMs? }`。
- [x] `ctx.llm.stream(options)` 直接收 `GenerateOptions`（`provider`／`model`／`messages`／`system?`／`temperature?`／`maxTokens?`／`stop?`／`signal?`）；DSH 按模型能力校验 effort，不支持的档位抛 `UNSUPPORTED_REASONING_EFFORT`（不 clamp），代理必须先 clamp 到该模型声明的 efforts。
- [x] `@deepseek-ai/dsh-llm` 不可 import：插件无 `node_modules`，loader peer 面只有 `@deepseek-ai/dsh-tools` + `cordis`；代理用普通对象＋本地文本累积，零新增依赖。
- [x] 引擎请求体（langchain-openai 1.2.1）：非流式只发 `model/messages/temperature/max_tokens/reasoning_effort(有则)/stream:false`；`stream_usage=True` 只在流式追加 `stream_options`，`ainvoke` 不发；caption 直发 `max_tokens/temperature`，关闭思考时若有 `when_thinking_disabled` 用声明形状，否则发 `reasoning_effort:"none"`。
- [x] `agentDefaultModel.currentSelection()` → `{ provider, model, reasoningEffort? }`；`llm/adapters-updated`（registry 提交点）与 `loader/volatile-update`（pi-ai 配置刷新点）均可 `ctx.on` 监听。
- [x] 模型目录：pi-ai `listModels` 在缺凭据时返回 `[]`；其他 adapter 可能抛错，目录收集逐个 provider 捕获并记入 `unavailable`（面板折叠用），单点失败不拖垮整表。
- [x] 停点结论：图片必须走 attachment 落盘（有累积代价）；system 走 `options.system`。均已写入 spec，原设计（丙）不变。

## Task 1 — host 半：本地代理（`src/model_proxy.ts`）

> 动到的文件：新增 `src/model_proxy.ts`；新增 `tests/model_proxy.test.ts`。

- [x] **RED**：先写纯函数与契约测试——别名生成/查表、目录过滤（缺凭据不列、单 provider 抛错进 `unavailable`）、鉴权（token 模式无/错 Bearer 401；auth-off 模式仅 loopback）、消息映射（system 进 `options.system`、user 文本/图片 data URL、assistant 带 source/id、拒绝 tool/function）、图片媒体类型（png/jpeg/webp/gif 放行，bmp 415）、effort 映射与 clamp（`none`/`off`→`off` 或最低档；`minimal`/`low`/`medium`/`high`/`max` 按模型 efforts 取最近档，未知值 400）、响应组装（文本/`reasoning_content`/usage/finish）、错误映射与脱敏、`stream:true`/`tools`/`n>1` 400。先跑，确认按预期红。
- [x] 实现 `src/model_proxy.ts`：
  - `LLM_PROXY_ROUTE = '/dsh-harness-rag/llm/v1'`；
  - `registerModelProxy(ctx, config)` 返回 `{ token, whenReady }`；`whenReady` 解析为 `{ getOrigin, getBaseUrl, refresh, getCatalog }`（origin 延迟到 listen 后读取，注入早于绑定时最多等 5s）。条件注入 `webServer` + `llm`，`attachments` 用 `ctx.get` 取（缺失时仅文本可用）；
  - `GET /models`：`listProviders` + `listModels` + `resolveModelInfo`；别名 `dsh:<provider>/<model>`；目录缓存 + 事件刷新，别名未命中时刷新一次；数据不足时 503；
  - `POST /chat/completions`：Bearer（D1）＋loopback（token 为空时）；解析 `model/messages/temperature/max_tokens/max_completion_tokens/stop/reasoning_effort`；system 合并进 `options.system`；user/assistant 转 DSH 消息；图片先 `admitPromptContent` 再入块；effort 按 `resolveModelInfo` 的 efforts clamp；`ctx.llm.stream` 消费 chunk，本地累积可见文本/推理文本，组装 OpenAI 响应；
  - 错误按 `finish.reason.failure.code` 映射（`MISSING_CREDENTIAL`／`INVALID_CREDENTIAL`／`QUOTA`／`RATE_LIMIT`／`CONTEXT_WINDOW_EXCEEDED`／`UNKNOWN_MODEL`／`UNSUPPORTED_REASONING_EFFORT` 等），消息只给稳定短语；不泄露 provider 原始 body/key；
  - 不引入 `@deepseek-ai/dsh-llm` 类依赖（Task 0 已证不可解析）。
- [x] 门禁：`node --test --experimental-strip-types tests/model_proxy.test.ts` 全绿；`node --experimental-strip-types --check src/model_proxy.ts`；neuter 两针（effort 映射、tool 拒绝）恰红。

**实测**：2026-10-21 — 15/15 绿（纯函数 13＋chunk 消费 2）；strip-types check 过；neuter ①（effort 取首档）恰红 `selectEffort` 与 `buildGenerateOptions` 两项，②（删 tools 拒绝）恰红请求形状一项，均按整文件备份还原。`pnpm typecheck` 本地不可跑：插件无 `node_modules`，安装探到私有 peer 包 `@deepseek-ai/dsh-type-meta` 404；未改 `package.json`。

## Task 2 — host 半：发布薄别名＋同步（`src/model_sync.ts`）

> 动到的文件：新增 `src/model_sync.ts`；新增 `tests/model_sync.test.ts`；改 `src/settings.ts`、`src/kb_proxy.ts`、`src/index.ts`。

- [x] **RED**：先写映射/合并测试——`toEngineEntry` 字段表（别名/显示名/profile/token/能力/effort/thinking 形状；enable/disable 形状取已发布档的最高/最低，不硬写 high/minimal）、`mergeModels`（保留手动条目、替换 `dsh:`、删过期、`hidden_in_chat` 保留全集并增删别名）、幂等（无变化 `changed:false`）。先跑确认红。
- [x] 实现 `src/model_sync.ts`：
  - `collectPublishedModels(proxyCatalog)`：只收代理目录中的模型；端口/token 变化时重建条目；
  - `toEngineEntry`：按 spec §4.2；DSH `off` 不进 `supported_reasoning_efforts`，`xhigh`/`max` 折成 `high`，默认档仅当落在发布子集内才写 `reasoning_effort`；
  - `mergeModels`：按 spec §4.3；`hidden_in_chat` 的保留集来自 GET 响应里全部 `hidden_in_chat:true` 的名字（含 `source:config_file`），不只看 UI 条目；
  - `syncModels(api, ...)`：GET → merge → 无变化不发 PUT → 有变化 PUT；返回 `{synced_at, published, removed, changed, error}`；`force` 只用于激活（GET 看不到真实 key，token 变化靠激活重写；面板/事件同步保持幂等）；
  - `registerModelSync(ctx, config, proxy)`：拿 `registerModelProxy` 的 handle（服务注入在代理侧完成）；激活一次 + `llm/adapters-updated`／`loader/volatile-update` 防抖 + `dshModelSync` 手动；`autoSyncModels` 默认 true；连同 `agentDefaultModel.currentSelection()` 进状态；失败只记录。
- [x] `src/settings.ts`：`autoSyncModels: boolean`（默认 true）。
- [x] `src/kb_proxy.ts`：新增 `dshModelStatus`、`dshModelSync` ops；把 model sync handle 传进 `buildOps`；响应不含代理 token。
- [x] `src/index.ts`：先 `registerModelProxy`，再 `registerModelSync`；不把 `llm`/`webServer` 加进插件级 `inject`（headless 仍可加载）。
- [x] 门禁：`node --test --experimental-strip-types tests/model_sync.test.ts` 全绿；strip-types；neuter 两针（`hidden_in_chat` 维护、删除过期别名）恰红。

**实测**：2026-10-21 — 同步 8/8 绿，连同代理共 24/24（Task 2 追加一条路由冒烟：真实注册后 GET `/models`＋POST `/chat/completions`＋缺 token 401）；四个改动的 TS 文件（`model_sync`／`settings`／`kb_proxy`／`index`）strip-types check 过，`client.js` 未动。neuter ①（不去除已删除别名的隐藏项）恰红合并测试一项；②（把托管条目当手动保留）恰红合并与 sync 两项；均按整文件备份还原。`createModelsApi` 走既有 `api()`，错误码只取 `info.kind/status`（`unreachable`／`not_configured`／`http_<status>`／`sync_failed`）。

## Task 3 — client 半：面板（`client.js`）

> 动到的文件：`client.js`。

- [x] 「DSH 模型」组（`ModelSettingsPanel` 顶部）：
  - 只读「DSH 主模型：provider / model」（`dshModelStatus` 返回；无 `agentDefaultModel` 时显示 ——）；
  - 状态行：已发布 N 个模型／上次同步／失败原因码；不可用 provider 折叠（DSH 已配置但无可用模型）；
  - 按钮：立即同步、刷新；打开设置页先 `dshModelSync`（幂等），成功后刷新模型列表。
- [x] 功能模型下拉继续读引擎 `/api/models`；同步后刷新 `modelsQ`/`modelsConfigQ`；显示名来自 DSH 模型名＋provider。
- [x] 思考菜单：`supports_thinking=false` 的模型置灰＋注记「由 DSH 模型能力决定」。
- [x] 文案：「发布到 RAG」；说明 RAG 侧不保存 provider key；zh/en 内联字典同步。
- [x] 门禁：`node --check client.js`；仓外冒烟（`client-load-check.mjs`，如仍覆盖该面板）默认与 `SMOKE_HOSTLESS=1` 全绿；真渲染检查分组/折叠/置灰。

**实测**：2026-10-21 — 新增 zh/en 各 17 键＋`set.group.dsh`；组内＝提示句、只读主模型行、状态行（已发布／上次同步／原因码）、立即同步＋刷新两钮、不可用 provider 折叠。空状态用「未读取到」而非草稿的 `——`（与面板既有文案口径一致）。打开面板先发一次 `dshModelSync`（幂等；失败不回弹窗，原因落状态行），成功/手动同步后刷新 `dshModelStatus`＋`modelsQ`＋`modelsConfigQ`。思考菜单置灰只对 `dsh:` 托管条目生效（能力由 DSH 定；手动条目的 `supports_thinking` 是 operator 声明，保持原行为），生效模型按「槽位值→配置默认→列表首行」解析；置灰行带 title／aria 注记，菜单尾附一行脚注。门禁：`node --check client.js` 过；仓外冒烟默认与 `SMOKE_HOSTLESS=1` 均 ALL PASSED，新增 SSR 断言（组在 RAG 默认组之前、主模型/发布数/上次同步/折叠计数、折叠时行不可见）＋ happy-dom 真挂载（展开折叠行、五个思考槽、无思考 DSH 条目 disabled 且点击不改值、有思考条目仍可勾、脚注文案）。

## Task 4 — 真栈验收

> 动到的文件：无（探针在仓外）。

- [x] 前置：引擎 8020 token 模式、Qdrant、DSH 桌面；xiaomi 已配置；账号已登录。
- [x] 发布矩阵：
  1. 面板打开 → 自动同步；引擎 `/api/models` 出现 `dsh:` 别名，手动条目保留；
  2. `/api/models/config/validate` 对每个别名 `model_present:true`；
  3. 功能模型分别选 `dsh:deepseek-account/…`（账号主模型）与 `dsh:xiaomi/…`，各跑一条 RAG 腿（wiki/extract/judge）成功；
  4. 已配置的 Anthropic 协议 provider 跑一条（证明代理翻译）——2026-10-22 补：`dsh:ceshi/qwen3.8-flash` 最小调用返回 `ok`（消息通路）；`dsh:opencode-go/claude-haiku-5-5` 补跑 effort（`high`/`max` 均 200，`max` 带 `reasoning_content`）与图片描述（PNG data URL → 200），两条均过；
  5. caption/VLM 用视觉别名 + 图片，确认 data URL→图片块与返回文本；同时记一张 BMP 走 415/caption 失败面的现象；
  6. 思考开关打开/关闭，确认 `reasoning_effort` 到达 DSH（日志无 key）；无 effort 模型的开关置灰；
  7. DSH 整退重开（候选令）→ 端口/令牌变化 → 自动重发布 → RAG 调用恢复；
  8. 停 DSH → 代理条目报可读错误，手动条目仍可用；
  9. 面板响应/日志无 provider key；引擎 `models_config.json` 只有代理 token（或 auth-off 占位）；
  10. 记录 `<DSH_HOME>/attachments/v1` 在一次 caption 前后的增量（确认去重与累积代价符合 spec §8）。
- [x] 证据：代理日志、引擎日志、面板截图、`/api/models` 响应存仓外。

**实测**：2026-10-21 — 引擎 8020（token 模式）＋Qdrant＋DSH 桌面（账号 `deepseek-account/deepseek-flash`、`xiaomi` 三模型）。发布 5 条别名、手动条目 `deepseek-flash`／`mimo-v2.6-flash` 原样保留；`hidden_in_chat` 收 5 条别名。validate 5/5 `model_present:true`（每轮重启后各一次）。账号腿＝切片重抽（20 实体、`extract_status=done`，39s／复验 31s，extract_thinking=true，条目默认档 high）；xiaomi 腿＝百科单条重生成（`status=ready`、内容更新，wiki_thinking=true，条目无默认档/无 enable 形状 ⇒ 引擎不传 effort，DSH 走 Default）。VLM：图片文档经视觉别名配文成功（`一张纯蓝色的正方形图片。`）；BMP 直发代理得 415 `unsupported_image_type`（引擎 caption 会先转 JPEG，故 BMP 不经引擎到达代理）。effort：`high`→200 且 `reasoning_content` 非空；`max`→按声明 clamp 到 high 仍 200；`none`→off、无 reasoning。四次整退重开端口 52739→52199→52763→54836→60166，每次自动重发布并更新 endpoint；复验后别名形状＝`disable=off`、`enable` 缺失、账号 `default=high`、xiaomi 无默认。停 DSH 时别名 validate 回「All connection attempts failed」，手动条目仍 `available`。Key 面：别名只含本地 `/dsh-harness-rag/llm/v1` 地址与代理 token；引擎配置/`rag_config.json`/引擎日志均不含 xiaomi key；引擎日志也不含代理 token。附件：一次 caption 使 `~/.dsh/attachments/v1` 从 2 文件/1832 B 增至 3 文件/2725 B（+893 B，归一化副本、内容寻址）。未做面：Anthropic 协议第 4 条已于 2026-10-22 补验完毕——`dsh:ceshi/qwen3.8-flash` 走通消息通路，`dsh:opencode-go/claude-haiku-5-5` 补跑 effort 与图片两条均 200（`high`/`max` 被接受，`max` 带 `reasoning_content`；PNG 描述与图相符）；L1+L2 评测跑通但当时 `ragas_available:false`（引擎未装 ragas）；ragas 已于 2026-10-22 改为后端默认依赖并装入环境，判分腿仍待一次完整 L2 真调。2026-10-21 晚起档位词表扩到六档，`xhigh`/`max` 原样透传（见 rag-leg-effort spec）；本条中 `max` clamp 的描述属于四档期记录。

**验收期缺陷（已修，未提交）**：
1. **思考关闭档**：DSH 声明 xiaomi 支持 `minimal`，但提供商 4/4 拒绝（502 `model_call_failed`），而别名把关闭形状写成「发布子集最低档」⇒ 所有 `*_thinking=false` 的腿（含 caption）必失败。改为：host 声明 `off` 时关闭形状用 `off`，否则用最低发布档；单测＋真栈复验过。
2. **启动空目录误删**：DSH 启动初期 provider 目录尚未就绪，激活同步以空目录为准删除了 5 条别名（`removed:5`）且事件未再触发。改为：空目录一律 `catalog_unavailable`、不写引擎；启动期 10×3s 有界重试。单测＋重开复验（`removed:0`、自动发布 5 条）。
3. **开思考档位**（用户口径校正）：原实现写 `when_thinking_enabled`＝最高发布档，会盖掉 DSH 的 Default。改为不写该形状：开思考跟随 DSH 默认（LangChain 腿沿用条目默认档；caption 腿不传 effort），关思考仍为 `off`。

## Task 5 — 文档与收口

> 动到的文件：`README.md`、本 spec/plan、`docs/equivalence.md`（若需）。

- [x] README 新增「RAG 功能模型来自 DSH」节：代理形态、账号模型可用、provider key 不出 DSH、thinking 的 effort 口径、DSH 必须在跑、手动条目 fallback、全局作用域。
- [x] spec Status 与 §7 验收数字回写；plan 各 Task 实测与提交链回填（spec 已补「实测（2026-10-21）」，plan Status/实测/链已回写）。
- [x] 引擎全量测试确认无影响（零代码改动）；插件门禁复跑（2026-10-21：引擎全量 12 failed/1917 passed，红集与基线逐条相同；插件 27 pass、`tsc` exit 0、仓外冒烟全绿）。
- [x] 工作区逐文件核 hunk，排除 `.env`、数据目录、仓外探针（代码两笔已入库；文档面见提交链）。
- [x] 提交链：三笔已落——代理核心＋单测、发布同步＋面板、文档收口（本笔）。

**实测**：2026-10-21 — 见 Task 4 实测；收口日复跑插件 27 pass、`tsc` exit 0、仓外冒烟全绿；引擎全量 12 failed / 1917 passed（红集与基线逐条相同）。

---

## 提交链（滚动记实）

- Task 1 — `3d465b6` feat(proxy): add the local OpenAI-compatible model proxy（`src/model_proxy.ts`＋`tests/model_proxy.test.ts`）。
- Task 2 — `20dc0a3` feat(sync): publish host models to the knowledge service（`src/model_sync.ts`＋同步/接线/路由冒烟）。
- Task 5 — `docs(rag): record the dsh model proxy design and acceptance`（README / spec / plan；`69b7dd7`）。
