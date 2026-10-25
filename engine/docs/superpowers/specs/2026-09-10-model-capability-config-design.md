# 模型能力配置增量设计 — 2026-09-10（修订版）

> 增量于 `2026-09-10-web-model-provider-config-design.md`（Task 1–5 已交付）。
> **修订说明**：初版误将「模式 / 推理深度」截图当作外部产品（qodercn）形态，据其提出 5 档强度。
> 经核实该截图为 **DeerFlow 前端输入栏自带控件**：模式 4 档（flash/thinking/pro/ultra）与推理深度
> 4 档（minimal/low/medium/high）早已存在并由 `supports_thinking` / `supports_reasoning_effort` 门控。
> 故本增量**复用项目既有 4 档强度词表**，不引入第三套词表；聚焦：结构化窗口/强度子集、两步向导+校验、
> 以及输入栏门控缺陷修复。

## Problem Statement

设置侧（设置 → 模型）的能力配置过于粗糙，且与输入栏已消费的能力模型不匹配：

1. 上下文窗口只有单个 `context_window` 整数，无法表达「该模型支持哪些窗口档位、默认用哪档」。
2. 思考强度只有布尔 `supports_reasoning_effort`，无法表达「该模型可用哪几档强度、默认哪档」；
   而输入栏的推理深度选择器目前对支持强度的模型**恒显示全部 4 档**，不区分 per-model 子集。
3. 添加模型时没有「先校验 key/模型是否可用」的反馈环，填错 key 要到发消息才暴露。
4. **输入栏门控缺陷**：模式菜单仅「思考」条目被 `supports_thinking` 门控；Pro/Ultra 对不支持
   thinking 的模型**照样渲染**，但 `getResolvedMode` 会把选择静默打回 flash ⇒ UI 提供点了无效的死选项
   （用户体感"模型也不可以选,只能是闪速"却仍列着 Pro/Ultra）。

## Solution

1. **两步向导**：step1 = 身份 + 凭证（provider / API 类型 / 端点 / api_key / 可重复 Model ID）；
   点「下一步」先做**凭证 + 模型存在性校验**（用 key 调 `GET {endpoint}/models`），通过才进 step2。
2. **step2 = 能力编辑器**：支持的上下文窗口（多选，固定枚举 200K/400K/1M）+ 默认上下文窗口
   （单选，必须 ∈ 已选）+ 能力 chip（视觉/思考）+ 推理强度（**复用既有 4 档** minimal/low/medium/high，
   按 per-model 子集呈现）+ 默认强度。可选项由内置 curated 表预填（标注「建议值，可修改」）。
3. **存储仍为单条 `ModelConfig`**（不拆实体）：新增 `supported_context_windows`、`supported_reasoning_efforts`，
   把 `context_window` 语义定为默认窗口、新增 `reasoning_effort` 存默认档位。提交沿用整体集合
   `PUT /api/models/config`。
4. **输入栏集成（修缺陷 + 读子集）**：推理深度选择器只列该模型 `supported_reasoning_efforts` 子集；
   模式菜单在 `!supports_thinking` 时隐藏 thinking/pro/ultra（只剩闪速），消除死条目。

## User Stories

1. As an admin, I want to add a model by first entering provider/endpoint/key and Model IDs, so that identity and credentials are captured before capabilities.
2. As an admin, I want the wizard to validate my API key and model id against the provider before I configure capabilities, so that a bad key fails fast instead of at first message.
3. As an admin, I want to be blocked from step 2 when validation fails, with a clear reason, so that I never persist an unreachable model.
4. As an admin, I want to select which context-window sizes a model supports (200K/400K/1M, multi-select), so that the model's real window options are recorded.
5. As an admin, I want to pick a default context window from the selected set, so that runs use a sane window by default.
6. As an admin, I want the default window constrained to the selected supported set, so that config cannot express an invalid combination.
7. As an admin, I want capability toggles (vision / thinking) shown as chips, so that capability declaration is glanceable.
8. As an admin, I want to select which reasoning-effort levels a model supports (subset of the existing 4 levels), so that per-model limits are recorded.
9. As an admin, I want to pick a default reasoning-effort level from the supported subset, so that runs use a sane depth by default.
10. As an admin, I want known model ids to prefill suggested capabilities (windows/effort subset/vision/thinking), so that I do not re-declare well-known facts.
11. As an admin, I want prefilled values clearly labeled as suggestions I can override, so that I know they are not authoritative detections.
12. As an admin adding several Model IDs with one key, I want the shared capability defaults applied to every created model, so that batch add stays one action.
13. As an admin, I want to edit an existing model's capabilities (and credentials) without changing its provider/model/name, so that identity stays stable.
14. As a chat user, I want the reasoning-effort selector to list only the levels my current model supports, so that I cannot pick an unsupported depth.
15. As a chat user on a model without thinking support, I want the mode menu to offer only Flash (no dead Pro/Ultra entries), so that the menu never shows choices that snap back.
16. As a non-admin, I want the Models section hidden and the endpoints denied, so that capability editing remains admin-only.
17. As an operator editing config.yaml by hand, I want old files without the new fields to keep loading, so that the schema change is backward compatible.
18. As a developer, I want the new capability fields excluded from provider constructor kwargs, so that they cannot leak into adapter instantiation.
19. As a maintainer, I want capability validation (subset/dup/default-membership) enforced at config load, so that bad values fail loudly.

## Implementation Decisions

- **存储形状**：扩展**单条** `ModelConfig`，不拆实体/不拆文件。新增/改语义字段：
  - `supported_context_windows: list[int] | None` —— 窗口档位子集，取值限于固定枚举
    `CONTEXT_WINDOW_OPTIONS = [200_000, 400_000, 1_000_000]`；校验：元素 ∈ 枚举、去重、升序、非空（若设置）。
  - `context_window: int | None` —— 语义改为**默认窗口**；若与 `supported_context_windows` 同时设置则必须 ∈ 子集。
  - `reasoning_effort: Literal["minimal","low","medium","high"] | None` —— 默认强度档位，**复用输入栏既有
    4 档词表**（`threads/types.ts` / `local.ts`），不引入 qodercn 5 档。
  - `supported_reasoning_efforts: list[Literal["minimal","low","medium","high"]] | None` —— 强度子集；
    校验：元素 ∈ 4 档枚举、去重、按枚举序、非空（若设置）；`reasoning_effort` 若与子集同时设置则必须 ∈ 子集。
  - `supports_thinking` / `supports_vision` / `supports_reasoning_effort` 布尔保留（能力 chip / 门控）。
  - `ModelConfig` 为 `extra="allow"`，新字段全部可选 ⇒ 旧 config.yaml / models_config.json 不受影响。
- **provider-kwarg 隔离**：`create_chat_model` 必须把 `supported_context_windows`、
  `supported_reasoning_efforts` 等非 provider 参数从构造 kwargs 排除，沿用 `context_window` 既有排除方式；
  seam B 测试钉住「新字段不进入 provider 构造 kwargs」。
- **校验端点**：`POST /api/models/config/validate`（admin 门控、**不落盘**），body =
  `{provider, endpoint, api_key, model}`；按 provider→端点键映射拼 URL，Bearer key 调 `GET {endpoint}/models`
  （有界超时），返回 `{ok, model_present, detail}`。`ok=false` 或 `model_present=false` 时前端阻止进 step2。
  复用 `PROVIDER_ALLOWLIST` 端点键映射，不收自由 URL（防 SSRF）。
- **curated 能力表（前端纯模块）**：`core/models/capability-registry.ts`，按已知 model id 模式给出建议
  `{supported_context_windows, supported_reasoning_efforts, supports_vision, supports_thinking, reasoning_effort}`；
  未知 id → 空默认（用户声明）。纯函数、node 可测；预填标注「建议值，可修改」，不谎称检测。
- **两步向导（UI 分步，数据不分家）**：step1 身份+凭证（含批量 Model ID）；「下一步」→ validate → step2
  能力编辑器；共享默认套用到批量 N 条；提交走既有整体集合 `PUT`（复用 `expandBatchToEntries` 携带新字段）。
  编辑弹窗 = 能力编辑器 + 可改凭证，身份字段冻结。
- **输入栏集成（修缺陷 + 读子集）**：
  - 推理深度选择器选项 = `supported_reasoning_efforts ?? 全部 4 档`（与 `mode !== "flash"` 既有门控叠加）。
  - 模式菜单：`!supports_thinking` 时**隐藏** thinking/pro/ultra 条目（与「思考」条目同一门控），只剩闪速，
    消除「渲染但被打回 flash」的死条目；`getResolvedMode` 的强制回退保留为兜底。
- **运行时优先级（方案 A，已确认）——「选了这个档位,模型就是这个档位的」**：
  effort 解析序 = **用户手选**（`context.reasoning_effort` 显式）> **模型默认**（`model.reasoning_effort`，
  若 ∈ `supported_reasoning_efforts`）> **模式启发式**（兜底，仅当模型无声明默认）。模式切换**不再重写**
  effort（模型有默认时）；输入栏在选中模型时**预选**模型默认档。模式仍只负责编排
  （thinking/plan/subagent）。后端对非 UI 调用方（IM/调度）在解析链插入模型默认兜底环：
  request > agent > model > None（`lead_agent` 的 `_resolve_runtime_option`）。
- **向后兼容显示**：仅有 `context_window`、无 `supported_context_windows` 的旧数据 → 视为「未声明子集」，
  默认 = `context_window`，不报错；无 `supported_reasoning_efforts` → 输入栏/编辑器显示全部 4 档（现状行为）。
- **i18n**：复用既有 `inputBox.reasoningEffort*` 4 档标签；新增 settings 侧窗口档位（200K/400K/1M）、
  `supportedWindows`/`defaultWindow`/`supportedEfforts`/`defaultEffort`/`suggested`/校验文案键。

## Testing Decisions

- 好测试 = 外部行为（校验规则、端点契约、向导流转、输入栏门控、PUT payload），不测内部实现细节。
- **Seam B（复用）** `backend/tests/test_models_config.py`：窗口子集/去重/升序、默认∈已选、强度子集/默认∈子集、
  旧文件无新字段仍可加载；factory 排除：新字段不进 provider kwargs。
- **Seam A（复用）** `backend/tests/test_models_config_api.py`：validate admin 403；ok 路径（mock 上游
  `/models`）；`model_present=false`；不可达 → `ok=false`+detail；validate 不落盘。
- **Seam C（复用）** `frontend/tests/unit/models/*.test.ts`（node）：registry 已知/未知预填；批量展开携带
  窗口/强度子集与默认；默认∈子集门控。
  `frontend/tests/unit/settings/*.dom.test.tsx`（dom）：step1→validate→step2；validate 失败阻止 step2；
  窗口多选+默认单选；强度子集呈现；批量两 id → PUT payload 两条各带共享能力。
  输入栏门控：推理深度只列子集；`!supports_thinking` 时模式菜单无 thinking/pro/ultra。
  运行时优先级：模式切换不覆盖模型默认；输入栏预选模型默认；后端无 request/agent effort 时落到模型默认。
- 先例：既有 `test_models_config.py` / `test_models_config_api.py` / `batch.test.ts` /
  `models-settings-page.dom.test.tsx` / input-box 既有测试的夹具与断言风格。

## Out of Scope

- 运行时能力探测（标准 API 探测不到窗口/视觉/思考/强度，不做）。
- 引入 qodercn 5 档强度词表；统一后端 agent 级 3 档 `ReasoningEffort`（low/medium/high）与前端 4 档
  （minimal 为前端专有）——词表统一另立增量。
- 模式轴（flash/thinking/pro/ultra）的重新设计；本增量仅修「死条目」门控缺陷，不改模式→运行时映射。
- 请求级切换上下文窗口（本增量只存默认值）。
- per-user BYO key / 多租户；Fast 模式；Credit/定价。
- `make setup` 写 `models_config.json`。

## Further Notes

- **截图来源澄清（2026-09）**：输入栏「模式 / 推理深度」为 DeerFlow 自带控件，非外部产品。既有门控：
  模式菜单仅「思考」被 `supports_thinking` 门控、flash/pro/ultra 恒渲染；`getResolvedMode` 在
  `!supports_thinking && mode!=="flash"` 时强制回 flash ⇒ 死条目缺陷根源。推理深度选择器门控为
  `supports_reasoning_effort && mode !== "flash"`，恒列 4 档。
- 三种观察形态 = 两布尔组合：(T,T) 思考+全模式+推理深度；(T,F) 全模式无推理深度；(F,F) 仅闪速有效+无推理深度。
- 本增量不改动已交付 Task 1–5 的安全支点（独立可写文件、provider 白名单、来源 PrivateAttr、哨兵脱敏）。
