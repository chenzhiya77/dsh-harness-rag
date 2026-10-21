# 插件 —— RAG 功能模型经 DSH 本地代理 Spec

**Status:** 已实现·已验收（2026-10-21；Anthropic 消息通路 2026-10-22 补验，effort/视觉仍待带档位模型）；逐腿思考档位（六档）由 [2026-10-21-rag-leg-effort-spec.md](2026-10-21-rag-leg-effort-spec.md) 接续。
**Date:** 2026-10-21
**配套 plan:** [2026-10-21-dsh-model-proxy-plan.md](../plans/2026-10-21-dsh-model-proxy-plan.md)

## 1. 范围与来源

RAG 面板的「功能模型」列表来自引擎 `/api/models`（`models_config.json`），与 DSH 设置里的模型列表互不联动：DSH 新增模型，RAG 列表不会变；`deepseek-account` 主模型因为账号 token 不能变成引擎可用的 API key，永远进不来。前一版「乙」方案把 DSH 的 endpoint/key/协议/thinking 抄进引擎，用户指出这等于多一层复制，且 key 与 thinking 方言都要在引擎侧再存一份。裁定改做「丙」：

- **目标**：引擎 RAG 腿通过插件宿主半的本地 OpenAI 兼容代理调用 DSH 已配置的模型；功能模型列表＝DSH 当前可用模型（含账号主模型）；provider key 不出 DSH；协议与 thinking 方言由 DSH adapter 处理。
- **形态**：插件宿主半新增本地代理（`/v1/models` + `/v1/chat/completions`），引擎每条 DSH 模型只写一条「薄别名」（代理地址＋别名＋本地代理 token＋能力元数据），不再写 provider endpoint/key/协议/thinking 方言。
- **引擎零代码改动**：引擎仍按正常的 `openai-compatible` 模型条目调用；代理负责把 OpenAI Chat Completions 翻译成 `ctx.llm.stream`，上游是 Anthropic Messages、OpenAI Responses、DeepSeek Messages 还是账号路由，都只在 DSH 内部决定。
- **边界**：DSH 必须在跑；引擎现有手动条目保留作 fallback；embedding/rerank/ASR/parse 仍由引擎侧配置；RAG 配置仍是全局（不做 per-session）。

## 2. 取证与现状（2026-10-21 一手实读）

### 2.1 DSH 宿主面

- `ctx.llm` 是 DSH 进程内的 provider-neutral 模型服务：
  - `listProviders()` 报告已注册路由；
  - `listConfigurableProviders()` 报告目录条目（含 `defaultBaseURL`、`nativeAuth.env/oauth`、`settingsPath`）；
  - `listModels(provider)` 返回 `{provider, id, name, inputModalities}`；
  - `resolveModelInfo(provider, model)` 返回 `context.contextWindow`、`defaultMaxTokens`、`reasoning.efforts/defaultEffort`、`inputModalities` 等；
  - `stream(options)` 返回 chunk 流（`block-start`／`text-delta`／`usage`／`finish`）；
  - `LlmCallConfig` 只有 `provider`／`model`／`reasoningEffort`／`temperature`／`maxTokens`／`stop`，没有 per-call thinking 布尔。
- 认证/账号：`deepseek-account` 走账号 token（`x-dsh-auth-token`），文档明确不走 API key；`deepseek-official`（API-key 路由）是 `https://api.deepseek.com/anthropic` 的 Anthropic Messages；pi-ai 路由的凭据通过 credentials seam 解析。
- 宿主 webServer：插件已有 `/dsh-harness-rag/api` 具名路由；代理复用同一 webServer，桌面窗口走真 HTTP 同源。`webServer.port` 在 listen 后可用，`getOrigin()` 返回 `协议://具体本地 IP:端口`；schema 拒绝 wildcard host，所以该 origin 可直接作为引擎 endpoint 基址（TLS 配置时是 `https:`，引擎会拒自签证书，本机默认无 TLS）。
- 消息与流：`GenerateOptions` 为 `{ provider, model, reasoningEffort?, messages, system?, temperature?, maxTokens?, stop?, signal? }`；system 走 `system` 字符串；user 可用 `{ role:'user', content }`；assistant 必须带 `id` 与 `source:{ kind:'model', provider, model }`。chunk 为 `block-start`／`text-delta`／`reasoning-delta`／`usage`／`finish`；`finish.reason` kind 为 `stop`／`max-tokens`／`tool-calls`／`error`／`aborted`，失败带 `failure.code/message`。
- 图片：DSH 没有内联图片块，必须经 `ctx.attachments.admitPromptContent()` 把 `{type:'image', data:<canonical base64>, mediaType}` 落成 durable ref，再作为 `{type:'image', attachment}` 入消息。只收 png/jpeg/webp/gif；源图 ≤20 MiB/张、≤20 张/消息、归一化 ≤4 MiB；落在 `<DSH_HOME>/attachments/v1`，永不自动删除（内容寻址去重）。引擎本地解析允许的 BMP 会被拒。
- 模型选择器在 DSH 会话里能直接选，是因为选择与调用在同一进程、共用 `ctx.llm`；RAG 引擎是另一进程，缺的正是执行这一半。

### 2.2 引擎面

- 模型目录：GET/PUT `/api/models/config`；PUT 是 UI 条目整集替换，需 `models` + `hidden_in_chat`，`api_key: "********"` 表示保留；GET 返回 `models`（每条带 `source: "ui" | "config_file"` 与 `hidden_in_chat`）。
- 校验：POST `/api/models/config/validate` 以 `{endpoint}/models` 探测 key 与模型是否存在，不持久化。
- 允许的 provider：`openai-compatible`／`anthropic`／`deepseek`；代理条目只用 `openai-compatible`。
- `models_config.json` 已在引擎 `.gitignore`，写入本地代理 token 不会脏工作区。
- RAG 腿调用形态：抽取/百科/合成/裁判全部 `ainvoke`（非流式、无 tools）；caption 走 `httpx.post`（非流式），图片是 `image_url` data URL。代理只需 OpenAI Chat Completions 的非流式子集＋图片。
- 实际请求体（langchain-openai 1.2.1）：非流式发 `model`／`messages`／`temperature`／`max_tokens`／`reasoning_effort`（有则）／`stream:false`；引擎设的 `stream_usage=True` 只在流式时追加 `stream_options`，`ainvoke` 不带。caption 关闭思考时优先用 `when_thinking_disabled` 声明形状，未声明才发 `reasoning_effort:"none"`。

### 2.3 为什么不走乙

| 面 | 乙（复制配置） | 丙（本地代理） |
| --- | --- | --- |
| provider key | 引擎要存一份 | 不出 DSH |
| 协议 | 引擎要按三家 allowlist 映射 | DSH adapter 自己处理 |
| thinking | 引擎要抄方言表 | DSH 自己处理；引擎只发通用 effort |
| 账号主模型 | 不可用 | 可用 |
| 用户动作 | 每个模型先「导入」 | 自动发布，直接选 |
| 额外面 | 无 | 一个本地 HTTP 代理 |

## 3. 决策表（D1–D6 全甲）

| # | 点 | 决定（甲） | 理由 |
| --- | --- | --- | --- |
| D1 | 代理鉴权 | 复用插件已持有的引擎 `apiToken` 作为代理 Bearer；`apiToken` 为空（引擎 auth-off）时代理只做 loopback 校验，条目写占位 `local-proxy` | 不引入新 secret；DSH 重启不换 token；与引擎同一信任域 |
| D2 | 模型别名 | `dsh:<provider>/<model>` | 稳定、可读、可移除；代理按精确别名查表，不解析字符串 |
| D3 | 引擎条目 | 每个 DSH 模型一条薄别名 | 引擎的 `model` 是固定字段，功能模型选择器需要逐模型条目 |
| D4 | thinking | 通用 `reasoning_effort` 六档原样映射：`none`/`off`→该模型的 `off`（无则最低档）；`minimal`/`low`/`medium`/`high`/`xhigh`/`max` 精确或就近取档，不做折叠。仅当 DSH 有非 off 档时开 `supports_thinking`；disable 形状取 host `off` 或发布子集最低档；不写 enable 形状——开思考的档位由引擎逐腿配置提供，未选＝不发值；provider 级 thinking 不做逐调用切换，面板标注 | `LlmCallConfig` 没有 per-call thinking 布尔，DSH 还会拒绝不支持的档位（不 clamp），所以必须由代理先归一到该模型的 efforts；方言由 DSH 处理，引擎只发通用信号 |
| D5 | RAG 默认模型 | 面板只读展示 DSH 主模型，不自动改 `rag.default_model` | RAG 腿与聊天主模型职责不同；自动改会全局覆盖用户选择 |
| D6 | 触发 | 激活时一次 + `llm/adapters-updated`／`loader/volatile-update` 防抖 + 面板打开/手动；`autoSyncModels` 默认 true | DSH 增删模型后 RAG 列表自动跟；引擎不可用不阻塞插件 |

## 4. 目标形态与落点

```text
引擎 RAG 腿（OpenAI Chat Completions，非流式）
  → 插件本地代理 /dsh-harness-rag/llm/v1/chat/completions
    → ctx.llm.stream({ provider, model, ... })
      → DSH adapter（账号 / Anthropic Messages / OpenAI Responses / DeepSeek Messages / …）
        → 上游
  ← 代理组装 OpenAI chat.completion（content / reasoning_content / usage / finish_reason）
```

### 4.1 代理路由

- `GET /dsh-harness-rag/llm/v1/models`：OpenAI 模型列表；`data[].id` 为别名；供引擎 validate 探测与外部核对。
- `POST /dsh-harness-rag/llm/v1/chat/completions`：非流式；Bearer 校验；只接受 loopback。
- 代理目录只列 DSH 当前可用的模型（`listModels` 对缺凭据返回空）；账号模型在登录后出现。

### 4.2 引擎条目形状（每条 DSH 模型）

| 字段 | 值 |
| --- | --- |
| `name` / `model` | `dsh:<provider>/<model>` |
| `display_name` | `<模型名> · <provider>` |
| `description` | DSH 模型 description（若有） |
| `provider` | `openai-compatible` |
| `endpoint` | `${webServer.getOrigin()}/dsh-harness-rag/llm/v1` |
| `api_key` | 代理 token（D1；auth-off 时 `local-proxy`） |
| `supports_vision` | `inputModalities` 含 `image` |
| `context_window` / `max_tokens` | `context.contextWindow` / `defaultMaxTokens`（缺则省略） |
| `supports_reasoning_effort` / `supported_reasoning_efforts` / `reasoning_effort` | DSH efforts 去掉 `off`，按 minimal<low<medium<high<xhigh<max 排序原样发布；`reasoning_effort` 不写——跟随＝不发值，DSH 在调用时用自己的默认 |
| `supports_thinking` | 发布子集非空时为 true |
| `when_thinking_enabled` | 不写。开思考的档位由引擎逐腿配置提供（`extract_reasoning_effort` 等，见 [rag-leg-effort spec](2026-10-21-rag-leg-effort-spec.md)）；该腿未选＝不发值，回落到 DSH 默认 |
| `when_thinking_disabled` | host efforts 含 `off` 时 `{ "reasoning_effort": "off" }`，否则发布子集最低档（实测 xiaomi 拒绝 `minimal`，不能把最低发布档当作「关闭」） |
| `use_responses_api` | false |
| `hidden_in_chat` | 加入该别名（RAG 面板不按它过滤，聊天选择器不显示） |

不写 `default_headers`、provider key、上游 endpoint、协议标识或 provider 专属 thinking 参数。

### 4.3 同步合并

- GET `/api/models/config` → 只取 `source === "ui"` 的条目。
- 保留所有非 `dsh:` 手动条目与顺序；整体替换 `dsh:` 条目；删除目录中已不存在的别名。
- `hidden_in_chat`：保留集取自 GET 响应里**全部** `hidden_in_chat:true` 的名字（含 `source:config_file` 条目），再加入当前别名、移除已删除的别名。
- 无变化不发 PUT；PUT 失败保留引擎原状态并返回错误码。

### 4.4 面板

- `ModelSettingsPanel` 顶部新增「DSH 模型」组：已发布数量/上次同步/失败原因、立即同步/刷新、不可用 provider 折叠（DSH 已配置但无可用模型）。
- 功能模型下拉继续读引擎 `/api/models`；同步成功后刷新 `modelsQ`/`modelsConfigQ`。
- 每腿一个思考选择器，合并「关 / 跟随模型默认 / 六档」：选项取该腿生效模型的 `supported_reasoning_efforts`；`supports_thinking=false` 只留「关」，`supports_reasoning_effort=false` 只留「关 / 跟随模型默认」，其余禁用并注记「由模型能力决定」。
- 文案从「导入」改为「发布到 RAG」；明确 RAG 侧不保存 provider key。

## 5. 语义与边界

- **鉴权**：代理校验 `Authorization: Bearer <apiToken>`（timing-safe）；`apiToken` 为空时只接受 loopback 且不校验 Bearer；不把 token 写入响应或日志。
- **模型目录**：DSH 缺 key/OAuth 未登录的 provider 不出模型（与 DSH 模型选择器一致）；不再维护「不可导入 provider」名单。
- **请求映射**：system 合并进 `options.system`；user/assistant 文本按 DSH 消息（assistant 补 provider/model source）；OpenAI `image_url` data URL 先 `admitPromptContent` 再入图片块，仅 png/jpeg/webp/gif（BMP/TIFF 415）；`temperature`/`max_tokens`/`max_completion_tokens`/`stop` → call controls；`reasoning_effort` 按 §3 D4 归一；`stream:true`、`tools`、`n>1` 明确 400。
- **附件存储**：图片经 DSH attachment 落盘（`<DSH_HOME>/attachments/v1`），内容寻址去重但永不自动删除；caption 的每张文档图片会留下归一化副本（目标 ≤4 MiB），空间随去重后的图片总量增长。这是 DSH 图片协议的固有代价，面板文档注明。
- **响应**：`choices[0].message.content` 为可见文本；如有 reasoning，附 `reasoning_content`（caption 的空文本兜底可读）；usage 映射为 prompt/completion/total；finish_reason 映射为 stop/length/error。
- **错误**：`MISSING_CREDENTIAL`→502/`provider_credential`，`INVALID_CREDENTIAL`→502/`provider_auth`，`RATE_LIMIT`→429，`QUOTA`/`ACCOUNT_QUOTA`→429，`CONTEXT_WINDOW_EXCEEDED`→400，`UNKNOWN_MODEL`→404，`UNSUPPORTED_REASONING_EFFORT`→400，`EMPTY_RESPONSE`→502，其他→502；只回稳定短语与映射码，不泄露 provider 原始 body 与 key。
- **DSH 重启**：端口/地址变化（配置改端口或 OS 分配）后，激活/事件触发重发布，更新 `endpoint`；代理 token 来自引擎 `apiToken`，不随 DSH 重启变化。未重发布前旧条目调用失败，面板显示「代理已更新，待同步」。
- **DSH 停止**：代理条目调用失败并给出可读错误；引擎原有手动条目仍可用。
- **作用域**：RAG 配置与发布条目全局，所有会话共用；不做 per-session 模型绑定。
- **托管边界**：`dsh:` 前缀条目由插件托管，手改会被下一次同步覆盖；自定义条目用非 `dsh:` 名字。

## 6. 非目标

- 不做流式（SSE）；RAG 腿全部非流式。后续如需要再另案。
- 不做 tools/function calling；RAG 腿不用。
- 不代理 embedding/rerank/ASR/parse；这些不是 DSH 模型目录成员，仍由引擎侧配置。
- 不自动把 `rag.default_model` 指向 DSH 主模型；面板只展示。
- 不做 per-session 模型绑定；抽取/百科/评测是后台任务，没有会话上下文。
- 不改引擎代码、不改 DSH 源码、不新增 peer 依赖（宿主包不可解析时用普通对象＋本地累积）。
- 不把 provider 级 thinking 做成 per-call 开关（`ctx.llm` 的 call config 不提供）。

## 7. 验收

1. **代理单测**：别名/目录过滤、鉴权、消息映射（文本/system/图片）、effort 映射、响应组装、错误映射、unsupported 字段。
2. **同步单测**：能力映射、合并、`dsh:` 归属、`hidden_in_chat`、幂等、删除。
3. **真栈**：引擎 `/api/models` 出现别名且手动条目保留；validate 每个别名 `model_present:true`；账号主模型（`dsh:deepseek-account/…`）跑通一条 RAG 腿；xiaomi 跑通；Anthropic 协议 provider 跑通；caption 图片跑通；思考开关的 effort 到达 DSH；DSH 重启后自动重发布；DSH 停止时错误可读且手动条目可用。
4. **安全**：面板响应与日志无 provider key；引擎 `models_config.json` 只有本地代理 token（或 auth-off 占位）。
5. **无回归**：引擎全量测试不受影响（零代码改动）；插件 `client.js` 语法与 `src/*.ts` strip-types 门禁过。

**实测（2026-10-21）**：5 条别名发布，`validate` 5/5 `model_present:true`；账号腿（切片重抽，20 实体，`extract_status=done`，39s）与 xiaomi 腿（百科重生成，`status=ready`）跑通；VLM 图片配文成功，BMP 直发代理 415。四个整退重开周期端口变化，均自动重发布；停 DSH 时别名报可读连接错误。别名只含本地代理地址与代理 token，引擎配置、`rag_config.json` 与日志均无 provider key。附件归一化落盘（一次 caption +893 B）。未做面：`ragas` 可选 extra 未装。验收期三处缺陷（关思考档、启动空目录误删、开思考档位）已修复并复验；档位词表在当晚扩到六档（`xhigh`/`max` 原样传递），详见 rag-leg-effort spec。

**Anthropic 协议补验（2026-10-22）**：新增 provider `ceshi`（`api: anthropic-messages`，模型 `qwen3.8-flash`）后，别名 `dsh:ceshi/qwen3.8-flash` 经引擎模型工厂一次最小调用返回 `ok`，消息通路贯通（引擎 → 本地代理 → DSH Anthropic 适配器）。该模型在 DSH 声明 `supports_thinking: false`／`supports_reasoning_effort: false`／`supports_vision: false`，故 `output_config.effort` 映射与图片通路仍未验。

## 8. 风险与残差

- **DSH 依赖**：代理条目依赖 DSH 进程；DSH 停则 RAG 腿不可用（手动条目兜底）。这是“直接用 DSH 模型”的固有代价。
- **协议边角**：已实测消息/图片/chunk/usage/finish/reasoning 形状；首版只覆盖 RAG 腿实际用到的非流式子集，流式与 tools 明确拒绝。
- **附件累积**：DSH 图片必须落盘且永不自动删除；caption 会在 `<DSH_HOME>/attachments/v1` 留下去重后的归一化副本，空间随文档图片总量增长，需 operator 侧清理（面板注明）。
- **图片类型收窄**：DSH 只收 png/jpeg/webp/gif；引擎本地解析允许的 BMP 会 415，走 caption 既有逐图失败面；超大图（>20 MiB 源图 / 归一化 >4 MiB）同样被拒。
- **TLS 边角**：若 DSH webServer 配了 TLS，origin 是 `https:` 且证书多半自签，引擎 httpx 会拒；本期按默认无 TLS 的本机部署验收。
- **引擎设置可见**：别名写进 `models_config.json` 后会在引擎「设置 → 模型」里出现并显示为可编辑 UI 条目；手改会在下次同步被覆盖，属托管边界。
- **thinking 限制**：只有 effort 档能逐调用映射；provider 级 thinking（DeepSeek `thinking`）不随 RAG 开关变化，面板注记。
- **开思考跟随 DSH 默认**：不写 `when_thinking_enabled`；每腿未选档位（「跟随模型默认」）时也不发 `reasoning_effort`，DSH 在调用时用自己的默认。逐腿选了档位就按 §3 D4 归一到该模型子集；关＝disable 形状（`off` 或最低发布档）。
- **别名重复**：手动条目与别名可能指向同一模型（显示名不同）；不自动去重，避免覆盖用户条目。
- **隐藏标记**：`hidden_in_chat` 是聊天选择器过滤；RAG 面板不按它过滤，故别名仍可选。
- **启动目录空窗**：DSH 启动初期 provider 目录可能为空；同步把空目录视为 `catalog_unavailable` 且不写引擎，启动期 10×3s 有界重试，避免把「尚在加载」误判成「模型全删」。
- **思考关闭档**：`minimal` 在 xiaomi 上实测 4/4 被提供商拒绝（502），关闭形状因此优先用 host 的 `off`；无 `off` 的模型仍用最低发布档。
- **Anthropic effort/视觉未验收**：消息通路已补验（2026-10-22，`dsh:ceshi/qwen3.8-flash` 最小调用返回 `ok`）；现有 Anthropic provider 只声明了这一条无 thinking/effort、无视觉的模型，`output_config.effort` 映射与图片通路待带档位/视觉声明的 Anthropic 模型补跑。
- **判分腿未真调**：引擎未安装 `ragas` 可选 extra，L2 评测以 `ragas_available:false` 跳过，判分模型的代理调用面未实测。
