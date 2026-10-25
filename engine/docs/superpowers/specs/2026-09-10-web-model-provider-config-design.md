# Web 端模型 Provider 配置 — 设计文档

- 日期：2026-09-10
- Triage：`ready-for-agent`
- 关联边界：AGENTS.md「配置系统」（`config.yaml` = operator-trusted，含会 import 代码的 `plugins:` / `extensions.middlewares`，刻意不走 API 写；`extensions_config.json` = API 可写）
- 关联代码：`deerflow/models/factory.py`（`resolve_class(model_config.use, BaseChatModel)` 动态导入）、`deerflow/config/app_config.py`（`from_file` / mtime 热重载）、`app/gateway/routers/models.py`（现只读 `GET /api/models`）

## 1. 问题陈述（Problem Statement）

DeerFlow 默认是单人自托管（nginx loopback 绑定），**运维方就是用户自己**。但要在里面用自己的 LLM，用户必须：手工编辑 `config.yaml` 的 `models:` 段、理解它的 schema、知道 `use:` 该填哪个类路径、知道 `api_key: $ENV_VAR` 的写法。门槛高、易错，且前端设置弹窗里已经有 channels / integrations / memory / tools / skills 等分区，**唯独没有「模型」**——与 codex / qoder / workbuddy 这类「用户可自配 API」的工具体验不一致，用户会感觉项目「不够完善」。

## 2. 方案概览（Solution）

在现有设置弹窗新增一个 **admin 门控的「模型」分区**，让用户在网页里增删改 LLM 模型（provider、模型名、api_key、base_url、能力开关）。配置写入一个**新的 API 可写文件**（方案 2），与 `config.yaml` 的 `models:` **合并加载**，写后热重载、下一条消息生效。

**关键安全取舍**：`use:` 是动态 import 路径（等同 `plugins:` 的代码执行边界），所以 **UI 绝不暴露自由文本 `use:`**——只提供**预设 provider 白名单选择器**，服务端把选择映射到固定的 `use:` 类路径。**明确不做** per-user 自带 key / 多租户。

## 3. 背景与现状

- **模型来源现状**：models 仅来自 `config.yaml` 的 `models:`（`AppConfig.from_file`，经 `resolve_env_variables` 做 `$ENV_VAR` 替换）；`GET /api/models` 只读列出；**无任何写入 API**。无模型时 `from_file` 打 WARNING 提示「运行 `make setup`」。
- **配置双文件边界**：`config.yaml`（operator-trusted）vs `extensions_config.json`（API 可写，`atomic_write_extensions_config` + `extensions_config_write_lock` + 热重载）。
- **`use:` 是动态 import**：`create_chat_model` → `resolve_class(model_config.use, BaseChatModel)`；导入模块会执行模块级代码。
- **前端设置分区**：`settings-dialog.tsx` 的 sections = account/appearance/notification/channels/integrations/memory/tools/skills/about（**无 models**）。
- **已有可复用范式**：`require_admin_user`；`PUT/PATCH /api/mcp/config`（admin 运行时写）；channel 凭证脱敏哨兵 `********`；support-bundle 对 `config.yaml` 里 `api_key` 的 redact；`make setup` 向导（`write_config_yaml`）；`AppConfig` mtime 热重载。
- **provider 端点键差异**：OpenAI 兼容 / Anthropic 用 `base_url`（`openai_api_base` 别名）；`PatchedChatDeepSeek` 自己声明 `api_base`，`factory._declares_api_base` 对其**原样透传**（不做 `api_base`→`base_url` 归一）。

## 4. 用户故事（User Stories）

1. 作为自托管运维方（=用户自己），我想在网页设置里添加一个 LLM 模型，以便无需编辑 `config.yaml` 就能让 agent 用我的 key。
2. 作为用户，我想从预设 provider 列表（OpenAI 兼容 / Anthropic / DeepSeek）里选，而不必知道 `use:` 类路径，以便避免填错导致加载失败。
3. 作为用户，我想填模型名（如 `gpt-4o`、`claude-sonnet-4-20250514`）、显示名、api_key，以便快速接入。
4. 作为用户，我想为 OpenAI 兼容网关填 base_url（OpenRouter / Novita / AtlasCloud / 火山方舟等），以便一个 provider 接多家网关。
5. 作为用户，我想勾选模型能力（thinking / vision / reasoning effort）与填 context_window，以便聊天 UI 的「上下文占用%」「思考模式」等按模型正确显隐。
6. 作为用户，我想看到 api_key 以 `********` 脱敏回显，以便截图/共享屏幕时不泄露密钥。
7. 作为用户，我想编辑已有模型时，若不改 api_key（保留哨兵值），原 key 不被覆盖，以便只改 base_url/能力而无需重填密钥。
8. 作为用户，我想删除我在 UI 里添加的模型，以便清理不再使用的配置。
9. 作为用户，我想看到来自 `config.yaml` 的模型被标为「只读（由配置文件管理）」，以便清楚哪些能在 UI 改、哪些要去改文件。
10. 作为用户，当我在 UI 添加的模型名与 `config.yaml` 里已有的重名时，UI 版本覆盖生效，以便我能从网页覆盖某个已有模型的 key/base_url 而不动文件。
11. 作为非 admin 用户，我不应看到「模型」管理分区，以免误改共享部署的模型配置。
12. 作为 admin，我想保存后无需重启进程，下一条消息即用新模型（热重载），以便迭代配置。
13. 作为用户，当我提交了非法输入（缺模型名、provider 不在白名单、context_window ≤ 0），我想得到清晰的 422 错误，以便知道怎么改。
14. 作为用户，当没有任何模型时，我想在设置页看到「添加你的第一个模型」的引导空态，以便知道从哪开始。
15. 作为运维方，我想 `make doctor` 把「至少配置了一个模型」的检查覆盖到合并后的两个来源，以便体检结果准确。
16. 作为运维方，我想 support-bundle 对新文件里的 api_key 也做 redact，以便打包排障时不泄密。
17. 作为中文用户，我想「模型」分区有 zh-CN 文案，以便无障碍使用。
18. 作为英文用户，我想「模型」分区有 en-US 文案。
19. 作为用户，我想在添加模型后立即在聊天的模型选择器里看到它，以便直接选用。
20. 作为安全敏感的用户，我想确信网页表单无法写入任意 `use:`/`plugins:`，以便 UI 不会变成远程代码执行入口。
21. 作为用户，我想在一次添加里为同一个 provider / api_key / Base URL 填**多个 Model ID**（可重复行 +「+ 添加 Model ID」+ 逐行删除），以便一把 key 快速接入多个模型而不用重复填凭证。
22. 作为用户，我理解批量添加时共享的 key/端点只在**创建时**共用；创建后每个模型独立，改其中一个的 api_key 不影响其余。

## 5. 设计决策（Implementation Decisions）

### 5.1 存储：新增 API 可写模型文件（方案 2）
- 新增仓库根文件 `models_config.json`（gitignored），配套模板 `models_config.example.json`；路径可用 `DEER_FLOW_MODELS_CONFIG_PATH` 覆盖（对齐 `DEER_FLOW_EXTENSIONS_CONFIG_PATH` 惯例）。
- **不把模型写进 `config.yaml`**：该文件混有会 import 代码的 `plugins:` / `extensions.middlewares`，是 operator-trusted 边界；让 API 写它等于开一条 RCE 路径（CSRF/XSS/误暴露公网均可被利用）。独立文件把「可写配置」与「会执行代码的配置」物理隔离，复用 `extensions_config.json` 已验证的模式。
- 文件结构：顶层 `{ "models": [ <ModelConfig 条目> ] }`，条目字段与现有 `ModelConfig` 一致（`name` / `display_name` / `description` / `use` / `model` / `api_key` / 端点键 / 能力开关 / `context_window` / `max_tokens`）。

### 5.2 加载与合并语义（已确认：UI 文件覆盖 config.yaml）
- `AppConfig.from_file` 在现有「合并 extensions_config」之后，追加「加载 `models_config.json` 并与 `config.yaml` 的 `models:` 合并」。
- 合并规则：**按 `name` 求并集；同名时 `models_config.json`（UI 管理）覆盖 `config.yaml`**。合并后再 `model_validate`。
- 对新文件同样跑 `resolve_env_variables`，使手改的 `$ENV_VAR` 与 UI 写入的字面 key 都能用。
- 每个模型带一个**来源标记**（`config.yaml` vs UI 文件），供只读接口回传给前端做「只读/可编辑」区分。来源标记是加载期派生的运行时元数据，**不写回**任一配置文件。

### 5.3 provider 白名单 → `use:` 映射（安全核心，已确认最小集）
UI 提交的是 **provider id**，服务端映射到固定 `use:` 与端点键，**拒绝任何自由文本 `use:`**：

| provider id（UI） | 映射 `use:` | 端点键 | 说明 |
|---|---|---|---|
| `openai-compatible` | `langchain_openai:ChatOpenAI` | `base_url`（可选） | OpenAI / OpenRouter / Novita / AtlasCloud / 各类兼容网关 |
| `anthropic` | `langchain_anthropic:ChatAnthropic` | `base_url`（可选） | 标准 x-api-key 认证 |
| `deepseek` | `deerflow.models.patched_deepseek:PatchedChatDeepSeek` | `api_base`（可选） | 也覆盖走该适配器的 Doubao/GLM/Kimi 等网关 |

- 写入时：`provider ∉ 白名单` → 422；据 provider 写正确的**端点键**（DeepSeek 写 `api_base`，其余写 `base_url`），避免 `factory` 的 `api_base`→`base_url` 归一告警。
- 白名单是可扩展常量（v1 三项）；新增 provider = 往映射表加一项 + 测试，**不放开自由 `use:`**。

### 5.3.1 批量添加：一个凭证 → N 个模型（创建语义）
- **参考形态**：添加弹窗 = 共享凭证块（provider / API 类型 / 端点 / api_key）+ **可重复的 Model ID 列表**（「+ 添加 Model ID」按钮、每行一个 `Input` + 行尾删除）。一次提交创建 N 个模型，共用同一 provider/端点/api_key。
- **落盘**：`models_config.json` 仍是**扁平的 per-model 列表**（与 `ModelConfig` / config.yaml 一致），**不引入「凭证/端点分组」实体**（v1 YAGNI）。前端把共享块**展开**成 N 条 entry，每条各自存一份 api_key/端点/provider，再走既有 `PUT /api/models/config`（整体集合写）。**批量是客户端展开，后端契约不变**。
- **共享语义**：共享仅发生在**创建时**；创建后每个模型**独立**，改其中一个的 api_key/端点不影响其余（与 config.yaml 每模型各自写 key 的语义一致）。
- **命名规则**：每条 `name` = 该 Model ID（provider 侧模型串）；若与已有（config.yaml 或 UI）重名 → 追加 `-2`/`-3` 去重；`display_name` 默认 = Model ID。
- **API 类型**：映射到 `ModelConfig.use_responses_api`（`Chat Completions API` → 缺省/false，`Responses API` → true）；**仅对 `openai-compatible` 显示**该选择，anthropic/deepseek 隐藏（恒为 Chat Completions 语义）。
- **能力/上下文**：添加时可选一组**共享默认**（thinking/vision/reasoning/context_window）套用到全部 N 条；逐模型微调走**编辑弹窗**。

### 5.4 api_key 存储与脱敏
- 明文存进 gitignored 的 `models_config.json`（与 `extensions_config.json` 存 MCP env 密钥、`config.yaml` 可直接存明文 key 的现状一致）。
- 只读接口回传 api_key 一律脱敏为哨兵 `********`（复用 channel 凭证的 `_MASKED_CREDENTIAL_VALUE` 约定）。
- 写入时：若某模型提交的 api_key == 哨兵值 → **保留已存储的原 key**（不覆盖）；否则写入新值。
- support-bundle 的 redact 逻辑扩展覆盖 `models_config.json`。

### 5.5 API 契约（admin 门控，对齐 `/api/mcp/config`）
- `GET /api/models/config`（admin）：返回管理视图——合并后的模型列表，每项含 `name` / `display_name` / `provider`（由 `use:` 反查，反查不到则标为 `custom`/只读）/ `model` / `base_url` 或 `api_base` / 能力开关 / `context_window` / `source`（`config_file` | `ui`）/ `editable`（仅 `ui` 来源为 true）/ `api_key_masked`（哨兵）。
- `PUT /api/models/config`（admin）：整体写入 UI 管理的模型集合（读-改-写只作用于 `models_config.json`，**绝不触碰 `config.yaml`**）。对每条：校验白名单、映射 `use:`、按 provider 写端点键、处理 api_key 哨兵保留、字段级校验。
- 删除：以「PUT 时集合中不含该 name」表达（UI 管理的模型才可删；`config.yaml` 模型无法经此删除）。
- 现有只读 `GET /api/models`（供聊天选择器）**保持不变**，天然反映合并结果。
- **服务端强制 admin**（`require_admin_user`）；前端分区可见性是 UX，不作为安全边界（纵深防御）。

### 5.6 原子写 + 锁 + 热重载
- 复用 `extensions_config` 那套：新增 `atomic_write_models_config` + 一把 `models_config_write_lock`（`threading.Lock`，在真正做 RMW 的 worker 内持有），避免与并发写互相丢改。
- `get_app_config` 的 mtime 热重载扩展为**同时 stat `config.yaml` 与 `models_config.json`**，任一变化即重载；写后无需重启，下一条消息生效。

### 5.7 前端「模型」设置分区

**落点（已确认）**
- `settings-dialog.tsx` 的 `sections` 数组新增 `models` 项，图标用 `CpuIcon`（`SparklesIcon` 已被 skills 分区占用，避免语义重复），label = `t.settings.sections.models`；**仅对 admin 可见**（复用前端已有 admin/role 信号；设置上下文若没有则补一个——安全以服务端 `require_admin_user` 为准）。
- 新增渲染分支 `{activeSection === "models" && <ModelsSettingsPage />}`，落在与其余分区**同一个** `ScrollArea`（`space-y-8 p-6`）内，继承弹窗外壳（`h-[75vh]`、220px 左导航、选中态 `bg-primary`）。
- 新增文件 `models-settings-page.tsx`（+ 增改弹窗子组件）于 `components/workspace/settings/`。

**视觉样式（已确认：Item 卡片列表，完全继承现有设置页房屋原语，不新造组件）**
- **外壳**：整页包 `<SettingsSection title description>`（`settings-section.tsx`）。
- **三态**：镜像 `ToolSettingsPage` —— loading → muted `text-sm`（`t.common.loading`）；`adminRequired` → muted 提示（`t.settings.models.adminRequired`）；空 → muted 引导空态（`t.settings.models.empty` +「添加模型」按钮）。
- **列表容器**：`flex w-full flex-col gap-4`；顶部一行放「添加模型」`Button`。
- **每行**：`<Item variant="outline">`（`@/components/ui/item`）——
  - `ItemContent` → `ItemTitle` = `display_name ?? name`；`ItemDescription` = `{provider 显示名} · {model}`。
  - `ItemActions` → 来源 `Badge`（`@/components/ui/badge`）：`config_file`=「配置文件·只读」用 `variant="secondary"`（muted）；`ui`=「UI·可编辑」用默认 variant；后接编辑 `Button`（icon）与删除 `Button`（**仅 `editable` 行显示删除**）。
- **添加弹窗（批量，一凭证 → N 模型）**：共享凭证块 + 可重复 Model ID 列表 ——
  - 共享块：provider `Select`（白名单三项）；API 类型 `Select`（Chat Completions / Responses，仅 openai-compatible 显示，映射 `use_responses_api`）；端点 `Input`（label 随 provider 切 `base_url`/`api_base`）；api_key `Input type="password"`（带显隐眼睛图标）。
  - Model ID 列表：右上「+ 添加 Model ID」`Button`；每行 = `Input`（placeholder 如 `qwen3.8-max`）+ 行尾删除 `Button`（trash icon）；**至少 1 行非空**才可提交。
  - 可选共享默认：能力 `Switch`（thinking/vision/reasoning）+ context_window `Input`，套用到全部新建模型。
  - 提交：前端展开为 N 条 entry（命名/去重/共享语义见 §5.3.1）→ `PUT /api/models/config`；单步提交，不做多步向导。
- **编辑弹窗（单模型）**：嵌套 `Dialog`，镜像 `agent-settings-dialog.tsx` 布局 —— `DialogContent` > `DialogHeader`(Title/Description) > body `space-y-4` > `DialogFooter`(取消/保存)。字段：display_name `Input`；api_key `Input type="password"`（编辑态 placeholder 哨兵 `********`，不改保留原值）；端点 `Input`；能力 `Switch`；context_window `Input`；max_tokens `Input`。**provider / model / name 为身份字段，创建后不可改**（要换模型请删除后重新添加）。
- 图标统一 `lucide-react` + `size-4`；类名用 `cn`；保存走 `PUT /api/models/config`，成功 `toast`（sonner）+ 触发模型列表/选择器刷新。
- **明确不采用**：表格、卡片网格等其它形态——一律跟随 `Item` 卡片列表这一房屋风格。
- i18n：`types.ts` + `en-US.ts` + `zh-CN.ts` 三处同步新增 `settings.sections.models` 与 `settings.models.*` 键。

### 5.8 `make doctor` / `make setup` 关系
- `make doctor`：把「至少配置一个模型」的检查改为读**合并后**的模型集（config.yaml ∪ models_config.json）。
- `make setup`：v1 **不改**（仍写 `config.yaml`）；仅在 spec 附注里记录「未来可让向导写 `models_config.json`」为非目标。

### 5.9 校验（服务端为准，前端做即时反馈）
- 必填：`name`（唯一、非空）、`provider ∈ 白名单`、`model`（provider 侧模型串，非空）。
- 可选但校验：`context_window` 为正整数（对齐 `ModelConfig` 的 `gt=0`）；`max_tokens` 正整数；能力开关为布尔。
- `name` 含路径分隔符/控制字符等异常输入 → 拒绝（防御性，虽然模型 name 不作为文件路径使用）。
- v1 **不做**连通性「测试连接」按钮（见非目标），仅做配置形状校验。

## 6. 各组件改动清单

**后端（harness / app）**
- `deerflow/config/app_config.py`：`from_file` 追加加载+合并 `models_config.json`；来源标记派生；`get_app_config` 热重载同时 stat 两个文件。
- 新增 `deerflow/config/models_config.py`（或并入现有 config 模块）：`ModelsConfig` 解析、`resolve_config_path`、`atomic_write_models_config`、`models_config_write_lock`、provider↔`use:` 白名单映射与端点键规则、api_key 哨兵保留逻辑。
- `app/gateway/routers/models.py`：新增 `GET/PUT /api/models/config`（`require_admin_user`），复用现有只读 `GET /api/models`。
- support-bundle redact：覆盖 `models_config.json` 的 api_key。
- `make doctor`（`scripts/doctor.py`）：模型存在性检查读合并集。

**前端**
- `settings-dialog.tsx`：新增 admin-only `models` 分区。
- 新增 `models-settings-page.tsx` + 增改弹窗子组件。
- `core/models/`（api/hooks）：新增管理接口的 fetch/mutation（`GET/PUT /api/models/config`）。
- i18n：`types.ts` / `en-US.ts` / `zh-CN.ts`。

**配置 / 文档**
- 新增 `models_config.example.json`；`.gitignore` 忽略 `models_config.json`。
- `README.md`（用户面：网页配模型）+ `backend/AGENTS.md`（架构面：新增可写文件、合并语义、provider 白名单安全边界）同步更新（仓库文档同步策略）。

## 7. 测试（TDD，三个 seam — 已与用户确认）

### 7.1 好测试的标准
只断言**外部可观察行为**（HTTP 响应、合并后加载结果、DOM 呈现），不断言内部实现细节（私有函数、具体 dict 结构）。后端**强制 TDD**（先 RED 再 GREEN）；前端测试按 node/dom 环境拆分。

### 7.2 seam A（主）：后端 HTTP API（`GET/PUT /api/models/config`）
- 非 admin → 403（`require_admin_user`）。
- PUT 合法模型（openai-compatible / anthropic / deepseek 各一）→ 200；随后 `GET /api/models/config` 与 `GET /api/models` 均反映新模型（端到端验证合并 + 热重载）。
- provider ∉ 白名单 / 缺 `model` / `context_window ≤ 0` → 422。
- 提交自由文本 `use:` → 被拒（不接受该字段 / 422），断言写入文件的 `use:` 恒为白名单映射值。
- DeepSeek 写入落在 `api_base`，其余落在 `base_url`。
- GET 回传 api_key == `********`；PUT 时 api_key 传哨兵 → 磁盘上原 key 不变（读文件断言）。
- 并发/重复 PUT 不丢改（锁生效）；写入是原子替换（无残留 .tmp）。

### 7.3 seam B：`AppConfig` 加载/合并（纯配置逻辑）
- config.yaml 有 A、models_config.json 有 B → 合并 = {A, B}。
- 同名冲突 → **UI 文件版本胜出**（断言 api_key/base_url 取自文件）。
- 来源标记正确（`config_file` vs `ui`）。
- 仅改 `models_config.json` 的 mtime → `get_app_config` 触发重载（对齐 `test_app_config_reload.py` 的 mtime 推进手法）。
- 新文件缺失/为空 → 回退到纯 config.yaml 行为（向后兼容）。

### 7.4 seam C：前端「模型」设置页 DOM（`.dom.test.tsx`）
- admin 打开设置 → 出现「模型」分区；非 admin → 不出现。
- 列表渲染来源徽章（配置文件·只读 / UI·可编辑）；只读行无删除按钮。
- 打开「添加模型」→ provider 选择器三项；选 DeepSeek → 端点字段标签切到 `api_base`；选 openai-compatible → 出现「API 类型」选择，选 anthropic/deepseek → 该选择隐藏。
- **批量添加**：点「+ 添加 Model ID」→ 出现第二行 Model ID 输入；填两个 ID + 共享 api_key → 提交后 `PUT` payload 含**两条** entry，各带同一 api_key、各自 `name`=Model ID；与已有重名时第二条 `name` 带 `-2` 后缀；仅 1 行非空才可提交（全空提交被阻）。
- api_key 输入为 password 型；编辑态占位显示哨兵。
- 保存调用 `PUT /api/models/config`（打桩 fetch，断言 payload 不含自由 `use:`）。
- 空态显示「添加第一个模型」引导。
- 参考 repo 既有 Radix 菜单/对话框测试模式（`pointerDown` 打开菜单、严格定位自身 svg 等既有经验）。

### 7.5 prior art
- 后端：`test_app_config_reload.py`（mtime 热重载）、`test_extensions_config_atomic_write.py`（原子写）、`test_setup_wizard.py`（`write_config_yaml` 生成 models）、mcp config / channel_connections 路由测试（admin 门控、脱敏哨兵、运行时写）。
- 前端：现有 settings 分区页 DOM 测试、knowledge 面板 `.dom.test.tsx`（可选 prop、菜单双入口等模式）。

## 8. 向后兼容性
- 不新增/不改 `models_config.json` 时，行为与今日**完全一致**（模型只来自 config.yaml）。
- 现有 `GET /api/models` 契约不变；聊天选择器、per-agent 模型选择照常工作。
- `make setup` 生成的 config.yaml 模型不受影响，且会在 UI 里以「只读·配置文件管理」呈现。
- 新文件 gitignored，不会误提交密钥。

## 9. 配置 / 字段汇总

**新增环境变量**

| 变量 | 用途 | 默认 |
|---|---|---|
| `DEER_FLOW_MODELS_CONFIG_PATH` | 覆盖 `models_config.json` 路径 | 仓库根 `models_config.json` |

**UI 提交的模型字段**（服务端映射/校验后落盘）

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 唯一标识；同名覆盖 config.yaml |
| `provider` | 是 | 白名单 id（`openai-compatible`/`anthropic`/`deepseek`）→ 映射 `use:` |
| `model` | 是 | provider 侧模型串 |
| `api_key` | 否* | 编辑态传哨兵=保留原值；*新模型无 key 多数 provider 会请求期报错 |
| `base_url` / `api_base` | 否 | 端点覆盖；键名按 provider（DeepSeek=`api_base`） |
| `display_name` / `description` | 否 | 展示用 |
| `supports_thinking` / `supports_vision` / `supports_reasoning_effort` | 否 | 能力开关，驱动 UI 显隐 |
| `context_window` | 否 | 正整数，驱动「上下文占用%」 |
| `max_tokens` | 否 | 每次调用输出上限 |

## 10. 非目标（Out of Scope / YAGNI）
- **per-user 自带 key / 多租户**（key 隔离、成本归属、「这次 run 用谁的 key」）——本项目定位单人自托管，admin 级即可；未来若转多租户再单独设计。
- 通过 UI 编辑/删除 **`config.yaml` 管理的模型**（只读展示；要改去改文件）。
- **自由文本 `use:`**（安全边界，永不放开）。
- 连通性「**测试连接**」按钮（v1 只做形状校验；可作为后续增量）。
- 迁移 `make setup` 去写 `models_config.json`（v1 保持写 config.yaml）。
- 白名单扩到 Volcengine/MiniMax/vLLM/MindIE/Claude OAuth/Codex 等全部适配器（v1 只三项，映射表可扩展）。
- 前端设置后端地址（`NEXT_PUBLIC_BACKEND_BASE_URL`）——属部署期 env，与 nginx 同源架构冲突，不在本 spec。

## 11. 附注（Further Notes）
- 本 spec 的核心不是「加个 CRUD 表单」，而是「在**不打破 config.yaml 代码执行边界**的前提下，把模型配置开成 admin 可写」。provider 白名单 + 独立可写文件是两个不可让步的安全支点。
- 端点键按 provider 分叉（`base_url` vs `api_base`）是既有 `factory._declares_api_base` 行为的直接后果；写错键会触发归一告警甚至请求期 `unexpected keyword argument`，务必按映射表落盘。
- 实现顺序建议：seam B（合并/加载）→ seam A（API + 白名单 + 脱敏 + 原子写/热重载）→ seam C（前端分区），每层 RED→GREEN；最后同步 README + backend/AGENTS.md 并跑 `pnpm check` / 后端 `ruff format --check`。
