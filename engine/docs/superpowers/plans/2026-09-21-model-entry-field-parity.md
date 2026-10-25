# 界面模型条目：补齐被丢弃的字段 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-21-model-entry-field-parity-design.md](../specs/2026-09-21-model-entry-field-parity-design.md)
**Status:** ✅ **Task 0 / 1 / 2 / 3 / 4 全部交付并提交（2026-09-21 ~ 09-22）** —— Task 0 只读核实 6/6；**Task 1 后端契约已交付并提交 `6d65264a`**（RED 4 红 → GREEN 42 绿 → 形状取证 102 绿首跑即绿 → neuter ×3 受害者不相交 → 窄面 144 绿 / ruff 双净 → 全量 146 failed / 12432 passed、双向 A/B 为空）；**Task 2 前端形状已交付并提交 `644ab8dd`**（纯函数 16 绿 + 接线层 8 绿 + dom 3 绿 → neuter 4 红 → `pnpm check` 净 → 全量前端 **240 文件 / 2591 例 0 失败**）；**Task 3 请求头 + 读侧回填已交付并提交 `f0e4cf2f`**（RED 11 红 / 39 绿 → GREEN 50 绿 → neuter 4 条受害者互不相交（plan 的两支都跑了 + 多补接线层一条）→ `pnpm check` 净 → 邻面 16 文件 / 196 绿 → 全量前端 **242 文件 / 2604 例 0 失败**）；**Task 4 文档 + 真栈验收已交付并提交 `46b69ea5`**（文档 = 安全边界一句 + 相邻句扫描实测免改；真栈隔离实例**五条全过**：模型参数收敛 2 形状 / 对照组 1 形状 / 请求头 8/8 / anthropic 条目 9→11 键 / 两既有字段不丢且读侧原样；门禁：后端全量 **146 failed / 12432 passed**、HEAD 双向 diff 净空（差集仅 2 条全量 flake，两侧各复跑 2/2 绿）、ruff 双净、前端全量 **242 文件 / 2604 例 0 失败**）。⚠️ Task 2 两处已披露偏差（`thinking-shape.ts` 多拆一个导出、**编辑腿接线提前到 Task 2** ⇒ Task 3 RED 第 ④ 条降级为取证钉子）；**Task 3 三处偏差见其节末 blockquote**；**Task 4 两处口径更正见其节末**（"逐字节相同"收窄到**模型参数**那一维；配方是**前端**派生 ⇒ 真栈只证写腿）。spec 已定稿（**经多轮审查修订**：必改×3 / 应改×4 / 缺口×2 / 可选×2 / **范围×1** 全部落进两份文档，验收编号 1–19）。

> **2026-09-21 范围扩一次（他裁甲）**：`max_tokens` / `use_responses_api` **从"既有受害者"升为交付项** —— 它们**写侧早已完整**（`ManagedModelInput:206-207`、`entry:652-653`、`types.ts:83-84`、编辑弹窗真有 `max_tokens` 那格），缺的**只有读侧** ⇒ 归 D6 一并接上。**Task 1 多一个 RED 项（读回这两个）、Task 3 多两条 RED（`toManagedInput` 往返 + 编辑弹窗补「API 类型」与 `max_tokens` 预填）、Task 4 多一条真栈**；验收重排为 **1–19**。⚠️ **唯一新控件**=「API 类型」进编辑弹窗（文案 key 复用添加弹窗那三个，**不新增 i18n**）；⚠️ **一条新规则**=`use_responses_api` 的**假值归一**（Chat ⇒ 不写键；显式 `false` 会被归一成缺键，且**任何界面动作都不许把"缺键"变成 `false`**）。

> **2026-09-21 两条"可选"也收**：⑩ **Task 2 的 UI 用例改成直接 `render(<ModelCapabilityEditor provider=… />)`**（环比 `functional-models-view.dom.test.tsx`：渲染组件、不驱动 Radix；断言只钉"行在不在"）⇒ **Task 0 第 2 项从"Task 2 / 3 的前置"缩成"只卡 Task 3"**；⑪ 真栈第 1 / 2 条的措辞统一成"**四个模式收敛成两个请求体**"，并补上它的**前置条件** —— 样本还得**不勾档位能力**（否则 `modeHeuristicEffort` 给 flash/thinking/pro/ultra 四个不同档位，请求体根本收敛不了；关掉后 `factory.py:373-375` 把 `reasoning_effort` 整个 pop 掉）。

> **2026-09-21 缺口两条也补完**：⑧ **i18n 三个文件进 Task 2 / Task 3 的文件清单**（`locales/types.ts` 手写 interface + `en-US` / `zhCN` 各自 `: Translations`，**缺一 `pnpm check` 红、`pnpm test` 拦不住**）；⑨ **真栈第 4 项点名 `minimax-m3` 的形态**（本机唯一 `anthropic` 条目 ⇒ "编辑既有条目 ⇒ 自动获得形状 ③"的真实样本；**在 scratch 根里复刻、不许动他本机那条**），并写明**本对验不了的那半**（代理端点收不收形状 ③ ⇒ spec §6 第 8 条登记）。

> **2026-09-21 必改三条（与 spec 同步改完）**：① **加读路径**（Task 1 的响应模型 + Task 3 的 `toManagedInput` + Task 2/3 的预填）—— 实测的机制是"GET 不返回这三个字段 + `toManagedInput` 是白名单 + 整集合 PUT" ⇒ **不读就"保存任意一条即抹掉全部"**；② Task 2 的落点**多两个弹窗的调用点**（`ModelCapabilityEditor` 要新增 `provider` prop）；③ 真栈第 1 条**要勾「思考模式」**（否则开思考那条在界面上不可达）。验收编号对 spec 重排后的 1–17。

**Parent:** [2026-09-10-web-model-provider-config-design.md](../specs/2026-09-10-web-model-provider-config-design.md)（界面模型管理，Task 1–5 已交付）——本 plan 是它的**字段集**增量。

**Architecture:** 五件事 —— **① 后端契约加 3 个字段**（`ManagedModelInput` + 路由的 `entry` dict，这是"三处写死的门"里的两道）；**② 后端把 5 个字段读回来**（`ManagedModelResponse` + `_managed_response` + GET/PUT 响应：3 个新增 + `max_tokens` / `use_responses_api` 两个既有，spec D6 —— 不读就"保存任意一条即抹掉"）；**③ 前端把那 3 个字段填出来、并回显**（一个形状下拉（含**反推**）+ 一个请求头表，按 `use:` 类自动推 `anthropic` / `deepseek` 的形状）；**④ 编辑弹窗补「API 类型」+ `max_tokens` 预填**（把两个既有字段的读侧接到底）；**⑤ 文档 + 真栈**。**`models/factory.py` 一个字都不改** —— 它本来就认得那三个形状（`models/factory.py:357-370`），本 plan 只是把界面接上。

**硬约束（spec D1/D2/D3 已裁）**：
- **`anthropic` / `deepseek` 的配方自动写、不给控件**（选甲）；**`openai-compatible` 默认「不设置」**。
- **两个配方字段都写**（不靠工厂的隐式合成 —— 形状① 的合成会多压一次档位 `minimal`，见 spec D1）。
- **`budget_tokens` 固定 `4096`**（与向导一致），v1 不暴露控件。
- **自动推配方不碰 `supports_thinking` chip**（spec D3 第 4 行）—— 向导常量里带的 `"supports_thinking": True` **不抄**（能力声明归用户）。
- **三个字段必须能读回来**（spec D6 甲）：`ManagedModelResponse` / 前端 `ManagedModel` / `toManagedInput` / 编辑弹窗预填 —— 缺任一，"保存任意一条"就会抹掉它们。**并同批接上两个既有的 write-only 字段**（`max_tokens` / `use_responses_api`：写侧通、读侧断，spec D1 第 4 / 5 条）。
- **`use_responses_api` 的假值归一**（spec D6）：下拉 Chat ⇒ **不写这个键**；**任何界面动作都不许把"缺键"变成 `false`**（`ManagedModelInput` 的布尔默认 `False` 会被真写进文件 —— `supports_vision` 上已有同款先例）。文件里显式 `false` 会被归一成缺键，这是**已裁的等价归一**。

**Global Constraints:**
- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **后端 TDD 命令**（照 `backend/Makefile` 的 `RUN` 变量）：窄面 `cd backend && PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync pytest tests/<file>.py -q`；全量 `cd backend && make test`（≈23 分钟 ⇒ **后台跑，没跑完别默认是绿的、先别提交**）。
- **前端命令**：窄面 `cd frontend && pnpm test <path>`（若 rstest 不接受路径过滤，则跑整个 `tests/unit/models/`）；全量 `cd frontend && pnpm test`。⚠️ **Task 0 要先核实 rstest 的窄面跑法**。
- **密钥**：本对真栈**不碰任何真实密钥** —— 隔离实例的 scratch 配置里用**现造的假值**。
- **scope fence（明确不做）**：不扩 `PROVIDER_ALLOWLIST`（8 个本仓适配类选不出的问题，**另一条线**）；不做 `temperature` / `default_query` / `output_version` / `pricing` / 超时重试（spec D1 的"不补"清单）；不做 caption（VLM）腿吃 `default_headers`（spec §6 第 7 条，另一条线）；不做同名整条替换的静默提示（spec §6 第 5 条）。⚠️ **`max_tokens` / `use_responses_api` 不在此列** —— 他裁甲后它们是**本对交付项**（只补读侧）。
- **不落任何残留**：真栈用的隔离实例与 recorder 跑完 `taskkill /T`、scratch 目录删净；`models_config.json` / `config.yaml` md5 必须与动手前相同。
- **每个 Task 的 `**实测**` 行必须回填**（RED 几条红 / GREEN 几条绿 / neuter 的受害者 / 门禁数字）——**未回写的 plan 不算交付**。

**依赖顺序**：Task 0（六项核实，只读）→ Task 1（后端契约）→ Task 2（前端形状）→ Task 3（前端请求头）→ Task 4（文档 + 真栈）。

✅ **Task 0 第 2 项已答（2026-09-21）：Radix `Dialog` 在 `dom` project 里能渲染**（临时探针跑通、已删）⇒ **Task 3 的 RED 落 dom 层**，那条「退回接线层」的 contingency 作废。⛔ 仍成立：Task 2 的 UI 用例**直接渲染 `ModelCapabilityEditor`**（不经过弹窗）。

---

## Task 0 — 开工前的六项核实 ✅ **已完成（2026-09-21）**

> 动到的文件：**无**（只读）。⚠️ 第 2 项用过一个**一次性探针**（`frontend/tests/unit/components/__scratch__/radix-dialog-smoke.dom.test.tsx`），**跑完即删、仓里无残留**（该目录现在不存在）。

- [x] 1. **前端窄面测试的确切跑法 + `dom` / `node` 两个 project 的分界**：`rstest.config.ts` 把测试分成两个 project —— `node` 匹配 `tests/unit/**/*.test.ts(x)`（**排除** `*.dom.test.*`），`dom` 匹配 `tests/unit/**/*.dom.test.(ts|tsx)`（happy-dom）。⚠️ **Task 2 / Task 3 的渲染断言必须落在 `*.dom.test.tsx`**。核清窄面怎么单跑一个文件（若 rstest 不接受路径过滤，窄面就是整个 `tests/unit/` 或 `tests/unit/components/workspace/`）。
      **实测（2026-09-21，✅ 核完）**：① **窄面跑法 = `cd frontend && pnpm test <路径>`，rstest 接受路径过滤** —— 实跑一条单文件：`Test Files 1 passed / Tests 1 passed`（含启动共 41.4s ⇒ **dom 项目启动很贵，单文件也要约 40s**）。`package.json` 的 `test` 就是 `rstest`。
      ② **两个 project 分界与计划一致**（`rstest.config.ts`）：`node` = `tests/unit/**/*.test.ts(x)` 且 **exclude `**/*.dom.test.*`**；`dom` = `tests/unit/**/*.dom.test.(ts|tsx)` + `testEnvironment: "happy-dom"`。
      ③ ⚠️ **`dom` 还挂了 `setupFiles: tests/setup-dom.ts`** —— happy-dom 没有 `ResizeObserver`，而这个文件装了**全局 no-op stub**（注释点名 Radix ScrollArea / react-resizable-panels / echarts）⇒ **Task 2/3 的 dom 用例不需要自己 stub ResizeObserver**（各文件自带的 `??=` 桩会幂等跳过）。
- [x] 2. **Radix `Dialog` 在 `dom` project 里能不能渲染** —— **这一项只卡 Task 3**（Task 2 已改成直接渲染组件，见它那条 UI RED）。先例已核：`tests/unit/components/workspace/composer-reasoning-controls.dom.test.tsx` 用 `@testing-library/react` 的 `render` / `fireEvent` / `screen`，测的正是「模式 + 推理深度」菜单的三种观察形态 ⇒ **普通控件有先例**。要看的是**弹窗**（`models-add-dialog.tsx` / `models-edit-dialog.tsx` 用 Radix `Dialog` + Portal + focus trap）在 happy-dom 里能不能挂载。
      ⛔ **已作废（实测=能渲染）** —— 若不能：Task 3 的 RED 退回**能观测到的东西**（`batch.ts` 的展开），并且 **neuter 要相应改成守那个东西**，**不要让 neuter 去守一个它测不到的分支**。
      ⚠️ **同时核一个替代口径（省钱）**：仓内 settings 的两个 dom 用例**都不经过弹窗** —— `functional-models-view.dom.test.tsx` 渲染**视图组件本身**，它的注释写明"renders the view once with a different stored provider **instead of driving the Radix dropdown** … keeps the test about the rule rather than about Radix's portal behavior"；`tool-settings-page.dom.test.tsx` 同理。⇒ 当时写的是"**若弹窗挂不上**就不该硬做 dom 用例"，**实测=能渲染 ⇒ 这条也用不上**（保留原句只为记录判断依据：Task 2 直接渲染组件正是借这个先例）。
      **实测（2026-09-21，✅ 核完：能渲染）**：写了一个**临时探针**（`tests/unit/components/__scratch__/radix-dialog-smoke.dom.test.tsx`，**跑完已删、仓里无残留**）：`render(<Dialog open><DialogContent><DialogTitle>…` 在 `dom` project 下**挂载成功** —— `screen.getByText("probe-title")` 命中、`document.querySelector('[role="dialog"]')` 也有 ⇒ **Portal + overlay + focus trap 都过得去**（ResizeObserver 由上面那个全局 stub 兜住）。
      ⇒ **Task 3 的 RED 落在 dom 层**（不进"退回接线层"那条分支）；⚠️ **那条"若不能"的 contingency 就此作废** —— 别把两套都写进用例。
      ⚠️ **同时确认了一件没先例的事**：**仓内此前没有任何 dom 用例渲染过 Radix Dialog**（`grep -rln "components/ui/dialog\|<Dialog\|DialogContent" tests/` **零命中**；settings 那两个 dom 用例都是直接渲染视图/页面组件）⇒ 这是**首次确立先例**，所以上面那次探针是必要的。
      ⚠️ 两个弹窗的 `open` / `onOpenChange` **都是受控 prop**（`models-add-dialog.tsx:38-44` / `models-edit-dialog.tsx:36-49`，另各需 `existingNames`+`onAdd` / `model`+`onSave`），**mount 时零网络调用**（add 的探针只在提交时发）⇒ 用例可直接 `open={true}` 渲染、只需 mock `@/core/i18n/hooks`。
- [x] 3. **`ModelCapabilityEditor` 的 props 契约 + 编辑腿的 payload 组装点**：它现在收 `value` / `onChange` / `suggested`（`models-add-dialog.tsx:334` 与 `models-edit-dialog.tsx:162` 两处调用），**不收 `provider`**。核清**新下拉要挂在哪一层** —— 是并入它现有的 `value`（`capability.ts` 的 `CapabilityValue`），还是**另开一个 prop**。⚠️ **判据**：`capability.ts:170` 的 `supportsReasoningEffort` 是从 `supportedEfforts.length > 0` **派生**的 ⇒ 新字段若并入同一个 value，要确认不会破坏那条派生。**并顺带定死两件事**：
      - (a) 组件**必须**新增 `provider` prop（下拉按提供商显隐，spec §3.4）⇒ **两个弹窗的调用点各补一行**；
      - (b) **编辑腿的 payload 组装点** —— `capabilityInputFromValue`（`capability.ts:204`）今天**不知道 provider**，而"按类自动推"必须知道 ⇒ 定它（给它加参数，或由弹窗合并）。**这是"接线层"用例能落在 `node` project 的前提**。⚠️ **顺带把它扩成"编辑腿的完整组装规则"**：`max_tokens`（数字，空 ⇒ 不写）与 `use_responses_api`（**Chat ⇒ 不写这个键；Responses ⇒ `true`**，**绝不允许出现 `false`**）也走这里 —— Task 3 若遇到"弹窗渲染不了"，回落断言就落在这个纯函数上（spec D6 的假值归一）。
      **实测（2026-09-21，✅ 核完 + 定死）**：
      - (a) 确认：组件 props 只有 `value` / `onChange` / `suggested`（`model-capability-editor.tsx`），**必须新增 `provider`**；调用点两处：`models-add-dialog.tsx:334`、`models-edit-dialog.tsx:162`（各补一行）。
      - (b) **定死：`capability.ts` 一个字不改。** 理由：`capabilityInputFromValue`（`capability.ts:204`）**全仓只有一个调用点** —— `models-edit-dialog.tsx:91` 把它 spread 进 `onSave` 的 payload；而配方与 `use_responses_api` **不属于"能力组"**（它是连接/请求体组）⇒ 硬塞进它会把两组的语义混在一起、还会让 `capability.ts` 的既有用例跟着动。
      ⇒ **落法**：新增的 `thinking-shape.ts` 出**两个纯函数** —— ① `thinkingRecipeFor(provider, shape, existing?)`（**生成 + 反推**，`existing` 用于"未命中三字面量时原样保留"）；② `apiTypeToUseResponsesApi(apiType)`（Responses ⇒ `true`；Chat ⇒ `undefined`，**永不 `false`**）。**消费方两处**：`expandBatchToEntries`（添加腿，用 `shared.provider` + `shared.apiType`）与 `models-edit-dialog.handleSubmit`（编辑腿）。
      - ⚠️ **这条改写了 plan 原文一句**：Task 2 那条"**编辑腿单独一条（node project）**"的接线断言**移到 Task 3 的 dom 用例**（弹窗能渲染 ⇒ 直测真接线比 node 层代理断言强）；Task 2 只保留"**添加腿**（`expandBatchToEntries`，node）"。已同步改 Task 2 / Task 3 的文字。
- [x] 4. **`ManagedModelInput` 的字段顺序与 `entry` 的键顺序**：核清两个 dict literal 现在各有多少键、新键插在哪（保持与既有顺序一致，避免无意义的 diff 位移）。
      **实测（2026-09-21，✅ 核完）**：① `ManagedModelInput`（`routers/models.py:183-207`）**16 个字段**，末两个是 `max_tokens`（`:206`）/ `use_responses_api`（`:207`）⇒ **三个新键追加在这两个之后**（`:208-210`），**16 → 19**。
      ② `entry: dict`（`:638-654`）**15 个键**，末两个同为 `"max_tokens"`（`:652`）/ `"use_responses_api"`（`:653`）⇒ **三个新键追加在 `:653` 之后、`:655` 那条条件行之前**（条件行是 `if item.endpoint: entry[endpoint_key] = ...`，**必须留在最后**），**15 → 18**（+ 设了端点时 19）。
- [x] 5. **`backend/AGENTS.md` 的 Models Configuration 一节有没有列字段清单**（决定 Task 4 是"改"还是"记一句无需改动"）——**提前到这一步核，省一次往返**。
      **实测（2026-09-21，✅ 核完）**：**该节没有字段清单** —— `backend/AGENTS.md:564-603` 讲的是机制（独立文件 / 按 name 合并 UI 赢 / 安全边界与 allowlist / 掩码哨兵 / 原子写 / 解析顺序 / 热重载 / doctor + support-bundle）＋一段 "Structured model capabilities"（子集与默认档那两个）。
      ⇒ **字段集无需同步**（Task 4 按"记一句无需改动"走）；⚠️ **但有一句该补**：安全边界那段写着「API keys … are masked behind a sentinel on read」，而本对之后**读侧会原样返回 `default_headers` 的值**（头值不遮罩，可能含 token）⇒ Task 4 在该段**补一句**（一句话，不是清单）。
- [x] 6. **既有断言的载荷扫描**（动手前必做）：把将被改动的测试文件里**所有**带 `ManagedModelInput` / `entry` 载荷的用例列出来，逐条判"加 3 个字段后它会不会红"：
      - `backend/tests/test_models_config_api.py`（PUT 的载荷）
      - `backend/tests/test_models_config.py`
      ⚠️ **判据**：`extra="forbid"` 只管"多传未知键"，**新键现在是已知的** ⇒ 既有用例只要不带这 3 个键就**保持绿**。⚠️ **但两条既有测试用例是「部分载荷」**（历史上撞过）⇒ 逐条核它们的 payload 是否会被新字段的默认 `None` 影响。⚠️ **新接的两个既有字段（`max_tokens` / `use_responses_api`）本来就是已知键**（入参、`entry`、前端类型都有）⇒ 对既有载荷零影响；本轮只是**响应多两个键** ⇒ 顺带核一遍"有没有用例断言响应整 dict"（今天没有；唯一那条 `response.json() == {...}` 在 `/validate`，`test_models_config_api.py:286`）。
      **实测（2026-09-21，✅ 扫完：零风险）**：
      - **没有任何"整 entry / 整响应 dict 相等"的断言** —— 两个文件里唯一一条整 dict 相等是 `test_models_config.py:189`（原子写测试拿自己的合成条目 `_model("written")` 比，**不经路由**）⇒ **把 3 个键加进入参、5 个键加进响应，不会打红任何既有用例**。
      - **既有风格 = 逐键 + 负向键**：`stored["supported_context_windows"] == [...]`（`:509-513`）、`assert key not in stored`（`:524-529`）、`assert "supported_reasoning_efforts" not in stored`（`:597-599`）⇒ 我们的"**不填就不写：键不存在（不是 `null`）**"直接沿用这个现成写法。
      - **"部分载荷"三条已点名**（历史撞过的就是它们）：`_CAPABILITY_MODEL`（`:490-500`，6 键）· 4 键极简 payload（`:524`）· `_ANTHROPIC_BASE`（`:561-566`）⇒ 三者都不带新键，新字段默认 `None` 被 `stored_entry` 丢掉 ⇒ **保持绿**。
      - 另：`test_public_models_expose_effort_capabilities`（`:605-612`）读的是 `GET /api/models`（**公开列表，另一个端点**）⇒ 本对不碰它。

---

## Task 1 — 后端契约：3 个字段进得来、读得回

> 动到的文件：`backend/app/gateway/routers/models.py`（`ManagedModelInput` +3 字段、`entry` +3 键、**`ManagedModelResponse` / `_managed_response` / GET·PUT 响应各 +5 字段**（3 新 + `max_tokens` / `use_responses_api` 两个既有））；测试 `backend/tests/test_models_config_api.py`。

**验收对应**：spec §4 的第 1 / 2 / 3 / 4（读路径）/ 5（两个既有字段的读路径）/ 6 / 7 条。

- [x] **RED**：在 `test_models_config_api.py` 加用例，**先红**：
      1. `PUT` 带 `when_thinking_enabled` + `when_thinking_disabled` + `default_headers` ⇒ **`models_config.json` 里逐字出现**（今天会 422 ⇒ 红）。
      2. **只填其中一个** ⇒ 另外两个**键不存在**（不是 `null`）—— 钉住 `stored_entry = {k: v for k, v in entry.items() if v is not None}` 那条过滤。
      3. **未知键仍被拒**：带一个清单外的键 ⇒ **422**（钉住 `extra="forbid"` 没被放宽）。
      4. **读得回来（D6 读侧）**：`PUT` 这条条目之后 `GET /api/models/config` ⇒ 三个字段**原样返回**。今天 PUT 就 422 ⇒ 红；**只做完写路径时它仍然红** —— 这正是它守的东西。
      5. **两个既有字段也读得回来**（甲扩的那两个）：`PUT` 一个带 `max_tokens: 8192` + `use_responses_api: true` 的条目 ⇒ `GET` 响应里 `max_tokens == 8192`、`use_responses_api is True`；**没设过的条目** ⇒ 两个都是 `None`（不是 `False` / `0`）。今天这两条恒红（响应模型没这两个字段，值取不到）。
      **实测（2026-09-21，RED 4 红 / 38 绿）**：插在 `test_public_models_expose_effort_capabilities` 与 support-bundle 一节之间（新分区 `# ── write/read: thinking recipes + default headers (spec 2026-09-21)`）。
      - 第 1 / 2 / 4 条 = `assert 422 == 200`（`ManagedModelInput` 的 `extra="forbid"` 当场拒掉三个新键）；第 5 条 = **`KeyError: 'max_tokens'`**（响应模型确实没这两个键）。
      - ⚠️ **第 3 条首跑即绿**（`422` 照旧）—— 它守的是"`extra="forbid"` 没被放宽"，**不是 RED**，是防回归的钉子（同第 3 项取证的待遇）。
      - ⚠️ **第 4 / 5 条比 plan 原文多断言一处（按 spec 补齐）**：spec §4 第 4 条写的是「`GET /api/models/config`（**以及 `PUT` 的响应**）」⇒ 两条用例都改成**对 PUT / GET 两个响应各断言一遍**（设置页保存后正是拿 PUT 的响应刷新列表 ⇒ 那里缺字段同样会被下一次保存抹掉）。
      - ⚠️ 顺带验了一条**读侧前提**：`ModelConfig` 只**声明** `use_responses_api` / `when_thinking_*`，`max_tokens` / `default_headers` 是 `extra="allow"` 的**额外键** ⇒ 两者都进 `model_dump()`（探针：设值 ⇒ 原值、未设 ⇒ `None`；`AppConfig.from_file` 的 yaml+json 合并后同样在）⇒ `dumped.get(...)` 取得到，**读侧不需要改配置层**。
- [x] **GREEN**：`ManagedModelInput` 加 3 个字段（`when_thinking_enabled: dict | None = None` / `when_thinking_disabled: dict | None = None` / `default_headers: dict[str, str] | None = None`）；路由的 `entry: dict = {...}` 加 3 行；**`ManagedModelResponse` 加 5 个字段**（3 新 + `max_tokens: int | None` / `use_responses_api: bool | None`）、`_managed_response` 加 5 个参数、**`get_models_config` 与 `put_models_config` 的响应各传一次**（D6 读侧；GET 那侧两个既有字段从 `dumped = model.model_dump()` 取）。窄面转绿。
      **实测（2026-09-21，GREEN 42 passed / 0 failed）**：`routers/models.py` **+31 行、−0 行**（插入点照 Task 0 第 4 项：`ManagedModelInput` 追加在 `use_responses_api` 之后 **16→19**、`entry` 追加在 `"use_responses_api"` 之后、`if item.endpoint:` 条件行之前 **15→18**）。
      读侧取值分两种写法（已核，缺一不可）：`when_thinking_enabled` / `when_thinking_disabled` / `use_responses_api` 走**声明字段**（`model.…`），`default_headers` / `max_tokens` 是 `extra="allow"` 的额外键 ⇒ 走 **`dumped.get(...)`**（`dumped` 那行本来就在，给端点取值用的）。
- [x] **形状对齐取证 —— ⚠️ 首跑即绿，不是 RED**（spec §4 的第 6 / 7 条）：在 `test_model_factory.py` 加用例 —— 把 spec §3.3 那张表的**三个形状**各构造一次，喂给 `create_chat_model`，断言 `factory.py:357-370` 三段 `elif` 各自命中（形状① ⇒ `extra_body.thinking.type`；形状② ⇒ `chat_template_kwargs`；形状③ ⇒ `thinking`）。用现有 `test_model_factory.py` 的 `_patch_factory` 桩法。
      ⚠️⚠️ **工厂一个字都不改**（见 Architecture）⇒ **这三条必然首跑就绿**，它们**不是 RED、也不构成回归防线** —— 它们回答的是「**我们选的形状对不对**」（**取证**）。**别为了让它红去改工厂。**
      **实测（2026-09-21，✅ 首跑即绿，102 passed）**：写成**一条 parametrize × 3**（`_THINKING_SHAPES`：`gateway-extra-body` / `vllm-chat-template` / `anthropic-native`），**每条两个腿都断言** —— 开思考 ⇒ 配方**逐字透传**；关思考 ⇒ **归属它的那段 `elif` 合成的形状**；并各补一条"**没声明档位 ⇒ `reasoning_effort` 一个键都不发**"（这正是真栈"四个模式收敛成两个请求体"的前提）。
      ⚠️ 顺带核出**仓内已有覆盖**：三个形状的**关思考腿**各自早有用例（`:245` 形状①、`:906`/`:933` 形状②、`:277` 形状③）⇒ 新增这条的增量在**开思考腿的逐字透传 + 两条腿的"不发档位"**，以及把三个形状**收在一处**当契约看。
- [x] **neuter（带 revert proof）**：把 `entry` 里新加的一行**改回不写**（模拟"只改了入参没改写盘"）⇒ 第 1 条用例必须**转红**（证明它守的是"真进了文件"，不是"入参收了"）。改回。
      **实测（2026-09-21）**：删掉 `entry` 里那三行 ⇒ **3 红**（第 1 / 2 / 4 条 —— 都依赖真写进文件），第 3 条（防回归钉子）与第 5 条（与三个新键无关）**保持绿** ⇒ 受害者集合与预期一致。改回后用 `git diff` 核对：**+31 行、−0 行**，无残留。
- [x] **neuter（读路径 · 带 revert proof）**：把 `ManagedModelResponse` 的三个字段（或 `_managed_response` 的传参）删掉 ⇒ **第 4 条必须转红**。改回。
      **实测（2026-09-21）**：把三个新字段从 `ManagedModelResponse` / `_managed_response` 参数与返回 / GET·PUT 两处调用里删净 ⇒ **1 红，正是第 4 条**；第 1 条（写侧）**照旧绿** ⇒ 读侧 neuter 只打读侧断言。改回。
- [x] **neuter（两个既有字段 · 带 revert proof）**：把 `ManagedModelResponse` 里 `max_tokens` / `use_responses_api` 两行（或它们的传参）删掉 ⇒ **第 5 条必须转红**。改回。⚠️ **与上一条不同点**：这两行的写侧今天就在（`entry` 里早有两行）⇒ 这条 neuter **只可能**打红读侧断言；若它把第 1 条也打红了，说明改错了地方。
      **实测（2026-09-21）**：把这两个 kwargs 从 `_managed_response` 的返回里删掉 ⇒ **1 红，正是第 5 条**（第 1 条写侧绿、第 3 条绿）⇒ 与实际一致：**这条 neuter 只可能打红读侧**。改回。
      ⇒ **三条 neuter 的受害者互不相交**（{1,2,4} / {4} / {5}）—— 每条守的是自己那一段。
      ⚠️ **三条 neuter 都复跑过一遍**：上面第一轮跑在"第 4 / 5 条补了 PUT 响应断言"**之前**的版本上；补完后**逐条重跑**（A ⇒ 3 红 {1,2,4}、B ⇒ 1 红 {4}、C ⇒ 1 红 {5}），**结论不变** —— 新增的断言与原有断言**同受害者**。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`test_models_config_api.py` + `test_model_factory.py`）绿。
      **实测（2026-09-21）**：`ruff check` **All checks passed**；`ruff format --check` **3 files already formatted**（首跑曾报 `test_model_factory.py` 待格式化 —— 是我自己那条 parametrize 的签名被拆成三行，**并回一行即净**）。窄面 **144 passed / 0 failed**（`test_models_config_api.py` 42 + `test_model_factory.py` 102）。
      更宽面（顺带跑）：`test_models_config.py` + `test_models_authorization.py` + `test_model_config.py` + `test_doctor_models.py` ⇒ **73 passed / 1 failed**，那 1 条是 **`test_missing_models_file_falls_back_to_config_yaml` = 已知环境条件红**（本机仓库根真实 `models_config.json` 泄进搜索模式；该文件根本不 import 路由 ⇒ 与本改无关，属基线）。
      **全量 + 双向 A/B（2026-09-21）**：`pytest -m "not live" tests/ -q`（后台，22m35s）⇒ **146 failed / 12432 passed / 109 skipped / 0 error**。抽那 146 个 node id，两侧**同一个仓外 basetemp**（`E:/app/python/agent/df-ab/basetemp`）+ 同一 `PYTHONPATH=packages/harness:.`：
      - 工作树（本改）⇒ **144 failed / 2 passed**
      - HEAD（`git worktree add --detach` 3e300fa0、仓外、另 `cp` 进 4 个 gitignored 文件）⇒ **144 failed / 2 passed**
      - **双向 diff 为空**（`comm -23` 与 `comm -13` 都无输出）⇒ **零新增红、零消失红**。
      ⚠️ **146 → 144 那 2 条是 basetemp「位置」造成的，不是本改**：`test_detector_repo_root.py::test_unmarked_location_raises_instead_of_scanning_nothing` + `test_delta_channel_state.py::test_merge_message_writes_randomized_differential` —— 仓内 basetemp 下必红、换仓外 basetemp 两侧都绿（与既有记录一致）。⇒ **本对的全量基线口径=仓外 basetemp 的 144**。
      ⚠️ 一次教训：**跑全量时别再并发跑窄面** —— 两次前台窄面与后台全量**共用 `.pytest-tmp`**，`--basetemp` 会在会话开始时清掉那个目录（本次没造成假红，但属不该有的风险）。
      ⚠️ A/B 前先核过 import 落点：`uv` 的 editable 是 **`.pth` 形式**（`_editable_impl_deerflow_harness.pth`），`PYTHONPATH=.` **压不住**它（worktree 里 `import deerflow` 会指回主树）⇒ 两侧都显式写 `PYTHONPATH=packages/harness:.` 才让 worktree 真正用自己的 harness。

---

## Task 2 — 前端：形状下拉 + 两格自动推

> 动到的文件：**新增** `frontend/src/core/models/thinking-shape.ts`（纯函数：形状表 + **反推**）+ `frontend/tests/unit/models/thinking-shape.test.ts`；改 `frontend/src/components/workspace/settings/model-capability-editor.tsx`（**+`provider` prop** + 挂下拉）、**两个调用点** `models-add-dialog.tsx` / `models-edit-dialog.tsx`（各传 `provider`）；`frontend/src/core/models/capability.ts` / `batch.ts`（把两个配方字段带进 payload）；`frontend/src/core/models/types.ts`（`ManagedModel` 的**读侧**：两个配方字段）；**文案**：`frontend/src/core/i18n/locales/{types,en-US,zh-CN}.ts`（key 沿用 `M.*` 家族、紧挨 `apiType` 那一组）。

⚠️ **文案是三个文件**（`Translations` 是手写 interface、两个 locale 各自 `: Translations`）⇒ 只改一边 `pnpm check` 就红。`pnpm test` **替它兜不住**：`tests/unit/core/i18n/translations.test.ts` 只钉 disclaimer 一条；有"键齐平"守卫的是四个**别的**命名空间（`tests/unit/support/i18n-key-manifest.ts` 的四份 manifest：constitution / delivery / pulse / run-status），**`settings.models` 不在其中** —— 而那套机制自己的注释写着"`types.ts` 与两个 locale 在编译期互相约束"，所以**只有 tsc 拦得住**。

**验收对应**：spec §4 的第 8 / 9 / 10 / 13 / 14 条。

- [x] **RED（纯函数 · `node` project）**：新建 `frontend/tests/unit/models/thinking-shape.test.ts`（**node project** —— 纯函数不需要 DOM），**先红**。要钉住的规则（spec §3.3 那张表 + D3）：
      1. **形状①**（`openai-compatible` 选「OpenAI 兼容网关」）⇒ 生成 `{"extra_body": {"thinking": {"type": "enabled"}}}` / `{... "type": "disabled"}`。
      2. **形状②**（选 `chat_template_kwargs（vLLM / SGLang）` —— 2026-09-22 前叫「vLLM / SGLang」）⇒ 生成 `{"extra_body": {"chat_template_kwargs": {"enable_thinking": True}}}` / `{... False}`。
      3. **形状③**（`anthropic` 自动）⇒ 生成 `{"thinking": {"type": "enabled", "budget_tokens": 4096}}` / `{"thinking": {"type": "disabled"}}`，⚠️ **`budget_tokens` 恰为 `4096`**（spec §4 第 9 条点名那个值）。
      4. **`anthropic` / `deepseek` 自动推**：给定 `use:` 类 ⇒ 直接得到两个字段（不需要用户操作）。**`deepseek` ⇒ 形状①**。
      5. **「不设置」⇒ 两个字段都不生成**（不是生成 `null`）。
      6. **反推（D6 读侧）**：给定文件里的 dict ⇒ 得到下拉的当前值（形状①/②/③ 各一条）；**未命中三个字面量 ⇒ 落「不设置」且标记"原样保留"**（保存时必须把它带回去，不能推成 `undefined` ⇒ 那等于删）。
      ⚠️ **推导规则写成一张表**（`ChatAnthropic` 系含 `ClaudeChatModel` ⇒ ③；`VllmChatModel` ⇒ ②；**其余** ⇒ ①）——**别散在 if/else 里**。
      ⚠️ **三个形状的字面量要与 Task 1 的工厂侧钉子逐字节相同**：`backend/tests/test_model_factory.py::_THINKING_SHAPES`（Task 1 已交付）把三个 dict 钉成「工厂认得的形状」⇒ 这里生成的必须是**同一份拼写**（`{"extra_body": {"thinking": {"type": …}}}` / `{"extra_body": {"chat_template_kwargs": {"enable_thinking": …}}}` / `{"thinking": {"type": …, "budget_tokens": 4096}}`）。两边拼写漂了，**只有真栈能发现** —— 单测各绿。
      **实测（2026-09-22）**：新建 `frontend/tests/unit/models/thinking-shape.test.ts`（**node project**，16 例）。**RED = 模块不存在**（`Cannot find module '@/core/models/thinking-shape'`，`Test Files 1 failed`、`Tests no tests`）。
      ⚠️ **实现比 plan 原文多拆了导出**：plan 写的是「① `thinkingRecipeFor` 做**生成 + 反推**」，实际是**三个导出** —— 生成 `thinkingRecipeFor(provider, picked, existing?)`、反推 `thinkingShapeFromEntry(entry) → { shape, preserve }`、表 `autoThinkingShape(provider)` + `THINKING_SHAPE_OPTIONS`。一个函数同时做两个方向会让「保存」与「回显」两条路纠缠（反推还要额外回一个 `preserve` 标记）。
      ⚠️ **反推的判据写死成一句话**：「条目声明了几个字段，就按这几个字段匹配同一行，且**至少声明一个**」⇒ 两个都写 / 只写一半 / 字段是 `null` 三种都落得对；一个字段都没有 ⇒「不设置」且**无物可保**（`preserve: false`，保存时什么也不写）。
- [x] **GREEN（纯函数）**：实现 `thinking-shape.ts`。窄面绿。
      **实测（2026-09-22）**：**16 passed**（`Test Files 1 passed`）。
- [x] **neuter（纯函数）**：把 `budget_tokens` 从 `4096` 改成别的值 ⇒ 第 3 条必须**转红**。改回。
      **实测（2026-09-22）**：`4096 → 8192` ⇒ **4 红**，其中 plan 点名的第 3 条在列，另 3 条是同一个字面量的另外几个侧面（`pins anthropic / deepseek…` / `recognises the anthropic literal` / `reads an entry from the admin API…`）⇒ **同一批次受害、无意外受伤者**。改回后 16 绿。
- [x] **RED（接线层 —— 验收 9 / 10 的真正落点）**：`capability.ts` / `batch.ts` 的测试（node project），**先红**：**给定一个 `anthropic` 条目 ⇒ 展开出来的 entry 里带形状③的两个字段；给定「不设置」⇒ entry 里这两个键不存在**。**编辑腿这条不在这里做**（Task 0 第 3 项 (b) 已裁）：弹窗**能渲染**（Task 0 第 2 项）⇒ 编辑腿的接线断言**落在 Task 3 的 dom 用例**（渲染编辑弹窗 → 保存 → 断言 `onSave` 的 payload）—— 直测真接线，比在 node 层做代理断言强。**本 Task 只做添加腿**（`expandBatchToEntries`）。
      ⚠️ **为什么必须单独做这一条**：纯函数层只证明「给定类生成什么 dict」，**证不了「它真的被带进 PUT payload」**。spec §4 第 9 条写的是「**保存后，文件里的配方是…**」—— **那需要接线**。
      **实测（2026-09-22）**：`tests/unit/models/batch.test.ts` 加两条（`anthropic` / `deepseek` 自动推、`openai-compatible` 选形状 + 不设置）⇒ **RED 2 红**（`expected undefined to deeply equal {…}`），其余 6 条绿。
- [x] **GREEN（接线层）**：`capability.ts` / `batch.ts` 把两个配方字段带进 entry。
      **实测（2026-09-22）**：只动 `batch.ts` —— `BatchSharedFields` +`thinkingShape?`、`expandBatchToEntries` 里按 `thinkingRecipeFor(shared.provider, shared.thinkingShape ?? "none")` 采两个键（沿用既有"有值才写"的写法）⇒ **8 passed**。⚠️ **`capability.ts` 一个字未改**（Task 0 第 3 项 (b) 已裁：配方属"连接 / 请求体组"，不塞进能力组）。
- [x] **RED（UI · `dom` project）**：⚠️ **落点是 `*.dom.test.tsx`** —— `rstest.config.ts` 把测试分在两个 project（`node` 匹配 `tests/unit/**/*.test.ts(x)` 但**排除** `*.dom.test.*`；`dom` 只收 `*.dom.test.(ts|tsx)`，happy-dom）。
      **渲染目标 = 直接 `render(<ModelCapabilityEditor provider="…" value={…} onChange={…} />)`，不经过弹窗** —— 环比 **`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`**（渲染视图组件本身，注释写明"**instead of driving the Radix dropdown** … keeps the test about the rule rather than about Radix's portal behavior"；`tool-settings-page.dom.test.tsx` 同形态）⇒ **这条用例不依赖 Task 0 第 2 项**（Radix `Dialog` 能不能渲染是 Task 3 的事）。
      先例另照 **`tests/unit/components/workspace/composer-reasoning-controls.dom.test.tsx`** —— 同类的「模式 + 推理深度」控件，用 `@testing-library/react` 的 `render` / `fireEvent` / `screen`，测三种观察形态。
      ⚠️ **断言只钉"那一行在不在"，不要去开 `Select` 的候选列表** —— 新控件照「API 类型」的 gate 形态（`models-add-dialog.tsx:219-237`：`<span className="text-sm font-medium">{M.…}</span>` + `<Select>`）⇒ **span 是内联渲染的**，`queryByText` / `getByText` 就够；happy-dom 下 Portal 的挂载时机不可靠，开列表属于自找 flake。
      ⚠️ **i18n 要 mock**（照上面那条先例的 `KEYS` proxy：`rs.mock("@/core/i18n/hooks", …)`）—— 否则新 key 解析成 `undefined`，按文案断言会**假红**。
      用例钉住（spec §4 第 8 条）：**下拉只在 `provider === "openai-compatible"` 时出现 —— `provider="anthropic"` / `"deepseek"` 时它不在**（**每个假设各渲一次**，别驱动切换 —— 同先例的"renders the view once with a different stored provider"）。
      **实测（2026-09-22）**：新建 `tests/unit/components/workspace/settings/model-capability-editor.dom.test.tsx`。**RED = 1 红**（`openai-compatible` 那条：`Unable to find an element with the text: thinkingShape`）+ **2 条"空绿"** —— ⚠️ **负向断言在实现之前必然绿**（那一行本来就还没渲染）⇒ 它们**不是 RED**，是实现之后**防"过度渲染"**的守卫。断言取两处：label `<span>`（`getByText`）+ 触发器的 `aria-label`（`getByLabelText`），**没有开候选列表**（happy-dom 下 Portal 时机不可靠）。`subsetSelected` 那个收参数的 key 在 mock 里单独答成函数（否则 `KEYS` proxy 给字符串、组件一调用就抛）。
- [x] **GREEN（UI）**：`model-capability-editor.tsx` **新增 `provider` prop**（两个弹窗的调用点各传一次），并在「思考模式」**下面**挂下拉（spec §3.4：**只当 `provider === "openai-compatible"` 时渲染**，复用同弹窗里「API 类型」那个 `provider === ... &&` 的 gate 形态，`models-add-dialog.tsx:220`）。三个选项 =「不设置」/「OpenAI 兼容网关」/「vLLM / SGLang」，初始值走**反推**（D6），推不出落「不设置」。
      ⚠️ **两格自动推要落在前端**（spec D3 已裁）—— 保存时按 `use:` 类算出配方，**不是**让后端按 provider 补；**且不碰 `supports_thinking` chip**（spec D3 第 4 行）。
      **实测（2026-09-22）**：`model-capability-editor.tsx` 加 `provider` / `thinkingShape` / `onThinkingShapeChange` 三个 prop（都必填 ⇒ 漏传调用点 `tsc` 当场红，正是我们要的），那一行挂在「思考模式」**下面**、gate 用 **`autoThinkingShape(provider) === null`**（**不是**内联的 `provider === "openai-compatible"` —— 让推导表自己说"这一格推不出"，两者在当前 3 个 id 下等价）；三个选项走 `THINKING_SHAPE_OPTIONS`（`none` / `gateway` / `vllm`，**`anthropic` 不在下拉里**）。**3 passed**。
      **文案**：`thinkingShape` / `thinkingShapeNone` / `thinkingShapeGateway` / `thinkingShapeVllm` 四个 key 进 `locales/{types,en-US,zh-CN}.ts`（紧挨 `apiType` 那一组，措辞照 spec §3.4 的 mock：思考开关写法 / 不设置 / OpenAI 兼容网关 / vLLM / SGLang）。
      ⚠️ **`supports_thinking` chip 一个字未动**（spec D3 第 4 行）：配方与能力声明各管一半。
      ⚠️ **本 Task 多落了一处（已披露，见本节末尾「两处偏差」）**：编辑弹窗的 `provider` / 形状初始值（反推）/ 保存时的配方也在本 Task 接上，不是 Task 3。
- [x] **neuter（自动推）**：把「`anthropic` ⇒ 形状③」那一行**从推导表里删掉** ⇒ 接线层那条必须**转红**。改回。
      ⚠️ **先确认实现选的是哪种兜底**，两种都能让这条 neuter 有牙、但红的理由不同：
      - 按 spec D3 的「**其余 ⇒ ①**」⇒ 删掉 `anthropic` 后会**落到形状①**（不是"不生成"）⇒ 断言形状③自然红；
      - 若实现是"查不到就返回 `undefined`" ⇒ 删掉后**不生成** ⇒ 也红。
      **把实际是哪种写进 `**实测**`** —— 否则下一个人重跑时会以为行为变了。
      **实测（2026-09-22）**：删掉 `PINNED_SHAPES` 里的 `anthropic: "anthropic"` ⇒ **4 红 / 三处**：**接线层那条**（plan 点名，`writes the thinking shape the provider decides on its own`）✅ + 纯函数 2 条（`pins anthropic / deepseek…`、`autoThinkingShape > names the shape…`）+ **dom 1 条**（`is absent for anthropic` —— 那一格会重新出现下拉，**这是设计上正确的连带反应**）。改回。
      ⚠️ **兜底是哪种（plan 要求点名）**：实现是「**查不到 ⇒ 返回 `null` ⇒ 两个键都不生成**」，**不是** spec D3 表里的「其余 ⇒ ①」。理由：那张表是**按客户端类**写的，而前端只看得见 3 个 curated id（`use:` 类由 allowlist 一一对应）⇒ 表里只钉 `anthropic` / `deepseek` 两行；`openai-compatible` 这一格 D3 自己判"背后可能是任何东西 ⇒ 要用户选"。⇒ 删掉 `anthropic` 后的红是「**什么都不发**」，不是「落成形状①」。
- [x] **门禁**：`cd frontend && pnpm check`（lint + type check）干净；`pnpm test` 窄面绿 —— ⚠️ **两个 project 都要跑到**（只跑 node 会漏掉 Task 3 的 dom 用例）。
      **实测（2026-09-22）**：`pnpm check` **干净**（首跑 3 个 lint 错 + 1 个 tsc 错，全是我自己新写的：dom 用例里两个空箭头函数 ⇒ 换 `rs.fn()`；`thinking-shape.test.ts` 的 `import/order` ⇒ 值导入提到类型导入之前；`matches[0]` 可能 undefined ⇒ 改解构 + 三元）。窄面 **3 文件 / 27 例绿**（node 16 + 8、dom 3，**两个 project 都跑到**）；邻面（所有 import 这批模块的测试：`capability.test.ts` / `models-settings-page.dom` / `models-capability-wizard.dom` / `functional-models.dom`）⇒ **4 文件 / 125 例绿，零回归**；**全量 `pnpm test` ⇒ 240 文件 / 2591 例全绿、0 失败**（3m09s；基线是 238 文件 ⇒ 本次 +2 = 新建的两个用例文件）。
      ⚠️ **顺手核了 `prettier`（不在本 Task 的门禁里，但 CI 有）**：`pnpm format` 对**整仓**报红是既有环境条件（CRLF）＋既有债，用「`tr -d '\r'` 后与 prettier 输出比对」法逐文件判：**我自己新写的 3 个文件有 3 处真问题**（两个缺行尾换行、一条超宽断言）⇒ 已修；**其余红全是既有**（`models-add-dialog.tsx` 的两处与 `locales/{en,zh-CN,types}.ts` 的 `logFail`/`tableRecallAtK` 在 HEAD 上同样被 flag ⇒ 按规矩不动历史行）。

> **Task 2 的两处偏差（已披露）**
> ① **`thinking-shape.ts` 多拆一个导出**（生成 / 反推 / 表，见上）；plan 原文是一个函数管两个方向。
> ② **编辑腿的接线提前到本 Task**：plan 把它整个放在 Task 3（Task 0 第 3 项 (b) 只把**断言**挪过去），但**只渲染一个不会保存的控件 = 半成品** —— 两个弹窗之间的这段时间里，编辑弹窗的下拉是死的。⇒ 本 Task 一并接上（`models-edit-dialog.tsx`：`provider` + 反推初始值 + `preservedRecipe` + `handleSubmit` 里 `...thinkingRecipeFor(...)`）。
> ⚠️ **后果**：Task 3 RED 的第 ④ 条（"编辑既有 `anthropic` 条目 ⇒ `onSave` payload 带形状③"）**到 Task 3 时是首跑即绿**，它降级为**取证/防回归的钉子**，不是 RED —— Task 3 的 实测 会照 Task 1 第 3 项那个格式标注，**别为了让它红去拆掉这里的接线**。

---

## Task 3 — 前端：请求头（两个弹窗）

> 动到的文件：`frontend/src/components/workspace/settings/models-add-dialog.tsx`（第一步）；`models-edit-dialog.tsx`（连接组 + **打开时预填** + **新增「API 类型」** + **`max_tokens` 预填**）；`frontend/src/core/models/types.ts`（`ManagedModelInput` 加 `default_headers`、读侧 `ManagedModel` **+5**）、`batch.ts`、**`models-settings-page.tsx`（`toManagedInput` **+5** —— D6 的抹除防线）**；**文案**：`frontend/src/core/i18n/locales/{types,en-US,zh-CN}.ts`（请求头那一组的 key，同上——**三个文件缺一 `pnpm check` 红**；⚠️ **「API 类型」不新增 key**，复用 `M.apiType` / `M.apiTypeChat` / `M.apiTypeResponses`）。

**验收对应**：spec §4 的第 11 / 12 / 14 条。

⚠️ **为什么是两个文件** —— `models-edit-dialog.tsx` **也有「接口地址」那一组**（已核：`M.endpoint` 在 `:149`、`M.apiKey` 在 `:137`），所以请求头**两处都要有**，否则已存在的条目改不了头。（这正是第一轮审查的必改第 1 条。）

- [x] **RED**：⚠️ **先按 Task 0 第 2 项的核实结果二选一** —— Radix `Dialog` 能不能在 `dom` project 里渲染：
      ✅ **Task 0 第 2 项已答：能渲染** ⇒ 在 `tests/unit/components/workspace/settings/*.dom.test.tsx` 里**直接 `render(<ModelsEditDialog open model={…} onSave={…} … />)`**（`open`/`onOpenChange` 是受控 prop、mount 时零网络；只需 mock `@/core/i18n/hooks`），钉住 ① 添加弹窗第一步能填 `default_headers`；② **编辑弹窗也能填**；③ **打开编辑弹窗时显示已存的头**（D6 读侧）；④ **编辑腿接线**：给定一个 `anthropic` 条目 ⇒ 保存 ⇒ `onSave` 的 payload **带形状③的两个字段**（= Task 0 第 3 项 (b) 从 Task 2 移过来的那条）。⚠️ **2026-09-22 改判**：这条接线**已在 Task 2 落地**（理由：只渲染不保存 = 半成品）⇒ **本条的 RED 降级为"首跑即绿的取证钉子"**（照 Task 1 第 3 项的格式标注），**别为了让它红去拆 Task 2 的接线**。⛔「不能渲染 ⇒ 退回接线层」的 contingency 已作废（Task 0 第 2 项），别再写第二套。
      ⚠️⚠️ **不要让 neuter 去守一个它测不到的分支** —— 如果 RED 落在接线层、而 neuter 却去删编辑弹窗里的控件，**那条 neuter 会静默失效**（接线层的用例照样绿）。**这是本 plan 第一轮审查查出的必改 1。**
      - **必须做（与弹窗能不能渲染无关）**：`models-settings-page.tsx` 的 `toManagedInput` **往返用例**（node project）—— 给定一个带 `default_headers` / 配方 / `max_tokens` / `use_responses_api` 的 `ManagedModel`（GET 形状）⇒ 投影出的 `ManagedModelInput` **仍带这 5 个字段**。**这条是 D6 的防线**（既有的 `max_tokens` / `use_responses_api` 今天就是在这里丢的 ⇒ **同一条用例把它们一起钉上**：`max_tokens: 8192` 与 `use_responses_api: true` 都要原样带过去）。
      - **必须做（两个既有字段的界面侧）** —— 若弹窗能渲染 ⇒ dom 用例钉住 ① 打开一个 `max_tokens: 8192` 的条目时那一格**显示 8192**（今天恒空）；② 「API 类型」显示 Responses、改成 Chat 保存 ⇒ payload 里**没有** `use_responses_api`（**不是 `false`**）；③ **防呆**：从没设过该键的条目保存后**仍不带**这个键。（弹窗**能**渲染 —— Task 0 第 2 项已验证 ⇒ 这三条**都落在 dom 用例里**，不需要纯函数回落；⚠️ 但 `apiTypeToUseResponsesApi` 的规则本身仍放在 `thinking-shape.ts`（Task 0 第 3 项 (b)），node 层另有一条纯函数用例守着它 ⇒ **「不写成 false」在两层都有牙**。）
      **实测（2026-09-22，RED 11 红 / 39 绿）**：五个文件一起跑 —— 两个新建的 dom 用例（`tests/unit/components/workspace/settings/models-{add,edit}-dialog.dom.test.tsx`）+ 既有的 `tests/unit/settings/models-settings-page.dom.test.tsx`（加一条往返用例）+ 两条 node 面（`tests/unit/models/{thinking-shape,batch}.test.ts`）：
      - **node 面 5 红**：`headersToRecord` 未导出（2 条当场 `is not a function`）、`apiTypeToUseResponsesApi` 同（2 条）、`expandBatchToEntries` 收了 `defaultHeaders` 却不落 entry（1 条 `expected undefined to deeply equal {…}`）。
      - **dom 面 6 红**：添加弹窗"头进 payload"1 条；编辑弹窗 4 条（头回显、改头、API 类型回显与带回、防呆"不凭空多出 `use_responses_api`"）；页面那条第 5 个字段不齐（`expected {provider: 'deepseek', …(13)} to match object {default_headers…}`）。
      - ⚠️ **两条"首跑即绿"**（照 Task 1 第 3 项的格式标注；**不是 RED，也不算新增防线**）：① 添加弹窗"一行没填 ⇒ 不带 `default_headers`"（今天压根没这个字段 ⇒ 真绿但**空转**，实现后才成真守）；② 编辑弹窗"只改显示名也让 anthropic 带上形状③"（= **Task 2 提前接的那条线**，本条按 plan 已改判为"取证钉子"，**别为了让它们红去拆实现**）。
      - ⚠️ **落点偏差（已披露）**：`toManagedInput` 的往返用例**落在既有的 `models-settings-page.dom.test.tsx`（dom、页面层）而不是新建 node 用例** —— 它没导出，node 层要它就得把整个页面模块（Radix / React 组件图）拉进无 DOM 环境；而这条断言**本来就不经弹窗**（点另一行的删除按钮 ⇒ `handleDelete` → `toManagedInput` → PUT payload），完全满足 plan 原意"与弹窗能不能渲染无关"，且先例就是**同一文件里同型的 capability 往返用例**。⇒ 与 plan 原文的差 = 从 node 挪到 dom，理由如上。
      - ⚠️ **验收 12② 的"切到 Chat"腿不驱动 Radix 列表**（仓内先例写明 happy-dom 下 `Select` 开合不可靠，见 `models-settings-page.dom.test.tsx` 自己的注释）：规则本身由 node 层 `apiTypeToUseResponsesApi` 的用例守着、"Chat 态保存不带键"由 dom 层（"从未设过"那条）钉住 ⇒ **两层都有牙**，只省掉"下拉点一下"那一步。
- [x] **GREEN**：两个弹窗各加一个键/值两列的重复行控件（+ 增/删），**编辑弹窗用 GET 读回来的值预填**（D6：头、`max_tokens`、以及**新增的「API 类型」**）；`types.ts`（`ManagedModel` **+5**、`ManagedModelInput` +`default_headers`）、`batch.ts`、**`models-settings-page.tsx` 的 `toManagedInput` 补满 5 个**。
      **实测（2026-09-22，GREEN 50 passed / 0 failed）**：改动面 12 改 + 2 新 / +348 / −8 —— `thinking-shape.ts` +12（`apiTypeToUseResponsesApi` = "永不 `false`"的唯一起点）、`batch.ts` +33（`HeaderRow` / `headersToRecord` / `BatchSharedFields.defaultHeaders` / `entry.default_headers` / `use_responses_api` 改走同一个 helper）、`types.ts` +7（读侧 +3、写侧 +`default_headers`）、`models-add-dialog.tsx` +70（第一步的请求头组）、`models-edit-dialog.tsx` +119（请求头组 + **「API 类型」** + 三处预填）、`models-settings-page.tsx` +7（`toManagedInput` +5 行）、i18n ×3 各 +5 key（`defaultHeaders` / `headerNamePlaceholder` / `headerValuePlaceholder` / `addHeader` / `removeHeader`；**「API 类型」零新 key**，复用 `M.apiType*`）。
      ⚠️ **三个控件决定（都可当场改）**：① 头行**从 0 起、删除按钮不设"至少一行"**（可选字段，不像 Model ID 那样至少一个）；② 行内两个输入各 `min-w-0 flex-1` + `AUTOFILL_OFF_INPUT_PROPS`（它就插在 API Key 那个 password 框前 ⇒ 防浏览器把站点登录凭证填进来，先例 = `lib/input-autofill.ts` 自己的注释）；③ 两个弹窗都插在**接口地址之后**（spec D4「紧挨接口地址」），编辑弹窗的「API 类型」插在接口地址**之前**（"哪种 API 形状"贴着"地址"一起读）。
      ⚠️ **实现先被自己的防呆断言抓了一次（值得记）**：写成 `use_responses_api: apiTypeToUseResponsesApi(apiType)` 时，wire 上 `JSON.stringify` 会把这个 `undefined` 掉没错，但**键在对象里是存在的** ⇒ `"use_responses_api" in input` 为真、dom 用例当场红。改成 `if (responsesApi) input.use_responses_api = responsesApi;`（`default_headers` 同款）—— **"从未设过"必须由"键不存在"拼写**，与后端 `stored_entry` 的 `is not None` 过滤同构。
      ⚠️ **`toManagedInput` 对两个既有字段走原样带回**（`model.max_tokens ?? undefined` / `model.use_responses_api ?? undefined`）⇒ 未被编辑的行里**显式 `false` 也逐字保留**；"归一成缺键"只发生在**被编辑的那一条**（弹窗路径）—— spec D6 那句副作用按此口径实现（对"不动它的行"更保真）。
- [x] **neuter**：⚠️ **落点必须与 RED 一致** —— 若 RED 在 dom 层，删编辑弹窗那处控件；若 RED 在接线层，删 `batch.ts` 里 `default_headers` 那一行。**无论哪种，那条 RED 必须转红**；不红就说明这条 neuter 选错了对象。改回。
      **实测（2026-09-22）**：**两支都跑了**（本 Task 的 RED 同时覆盖 dom 层与接线层，plan 的二选一按"两支都成立"处理）：
      - 删**编辑弹窗那处控件**（整个请求头组）⇒ **2 红，正是编辑弹窗的两条头用例**；同文件另 3 条（API 类型回显 / 防呆 / anthropic 钉子）**照旧绿** ⇒ 打的正是它守的那两条，**没有静默失效**（第一轮审查的必改 1 在此闭环）。
      - 删 **`batch.ts` 里 `if (shared.defaultHeaders) entry.default_headers = …` 那一行** ⇒ **2 红**（node 的 `expandBatchToEntries` + 添加弹窗那条 dom）⇒ 添加腿的**接线层**有独立受害者（这条是 plan 没点名的第 4 条 neuter，顺带补上）。
      - 两支都用**字节级备份还原**（`cp` + 事后 `md5sum` 双验：`batch.ts` 32b8b0ce / 编辑弹窗 922e08e4 / 设置页 1d61b0f9）。
- [x] **neuter（`toManagedInput` · 带 revert proof）**：把 `toManagedInput` 里的 `default_headers` 那一行删掉 ⇒ 上面那条往返用例**转红**。改回。
      **实测（2026-09-22）**：删掉 `default_headers: model.default_headers ?? undefined` ⇒ **1 红**，正是那条往返用例（同文件其余 13 条绿）。改回后 md5 与备份一致。
- [x] **neuter（两个既有字段 · 带 revert proof）**：把 `toManagedInput` 里 `max_tokens` 那一行删掉 ⇒ 往返用例**转红**（同一批断言里就该有一条专门盯它）。改回。⚠️ **不要**用"删编辑弹窗的「API 类型」"来当这条的 neuter —— 它与"不写成 false"那条的受害者不是同一批（照 plan 的老规矩：neuter 只能打它 RED 守的那一条）。
      **实测（2026-09-22）**：删掉 `max_tokens: model.max_tokens ?? undefined` ⇒ **1 红**，仍是**同一条**往返用例 —— 它就是按"5 个字段一起钉"设计的（`toMatchObject` 里有专门的 `max_tokens: 8192`）；受害者与上一条同一条**符合预期**（plan 要求"同一批断言里就该有一条专门盯它"）。⚠️ 没有动编辑弹窗的「API 类型」。
- [x] **门禁**：`cd frontend && pnpm check` 干净；`pnpm test` 窄面绿（**两个 project 都要跑到**）。
      **实测（2026-09-22）**：`pnpm check` **干净**（首跑 1 个 lint 错：我新写的 `as HTMLInputElement` 被 `no-unnecessary-type-assertion` 判掉 ⇒ 改用仓内既有先例的泛型写法 `getByLabelText<HTMLInputElement>(…)`，见 `tests/unit/settings/functional-models.dom.test.tsx:1078`）。窄面 **5 文件 / 50 passed**（node + dom 两个 project 都跑到）。邻面（`tests/unit/models/` + `tests/unit/settings/` + `tests/unit/components/workspace/settings/`）**16 文件 / 196 passed**。**全量前端 242 文件 / 2604 passed / 0 failed**（2m48s；上一条基线 240 文件 / 2591 例 ⇒ 本 Task 净 **+2 文件 / +13 例**）。
      ⚠️ **prettier（不在门禁里但 CI 有）**：照 `tr -d '\r'` 法逐文件核过 —— **我新写的两个 dom 用例文件有真债**（`@testing-library/react` 的 import 单行 82 列、`await import(…)` 折行、断言换行），已 `prettier --write` 修净（**新文件无历史，直接写不翻旧账**）；`models-edit-dialog.tsx` 有我写超宽的一行（`<span className="text-sm font-medium">{M.defaultHeaders}</span>`，81 列）⇒ 拆开修净。**留下的是既有债**（逐一核过不是我这次动的行，按老规矩不动）：`models-add-dialog.tsx`（import-autofill 单行、`capability` 状态 3 行、两个 `SelectItem` 折行）、三个 locale 文件（`logFail` / `tableRecallAtK` / `columnRecallNote` 等**别的分节**）、既有的 `models-settings-page.dom.test.tsx`（import 单行）。

> **Task 3 的三处偏差（已披露）**
> ① **`toManagedInput` 往返用例的落点 = dom 页面层**（plan 写的是 node）—— 理由与先例见 RED 那条实测；断言本身**不经弹窗**，plan 的"与弹窗能不能渲染无关"仍然成立。
> ② **验收 12② 的"切到 Chat"不驱动 Radix 列表** —— 规则（node 纯函数）+ Chat 态保存（dom）两层都有牙，只省掉"点下拉"那一步。
> ③ **`toManagedInput` 原样带回两个既有字段**（未编辑行里显式 `false` 不被归一）—— 归一只发生在被编辑的那一条；比 spec 那句副作用**更保真**，方向安全。

---

## Task 4 — 文档同步 + 真栈验收

> 动到的文件：`backend/AGENTS.md`（若需要）；真栈**不动仓库里任何文件**（隔离实例 + 本机 recorder，全在仓库外）。

**验收对应**：spec §4 的第 15 / 16 / 17 / 19 条（第 18 条含可选的回显观察）+ **第 13 条的真栈形态**（真栈第 4 项；其验不了的那半见 spec §6 第 8 条）。

- [x] **文档**（**按 Task 0 第 5 项的核实结果**决定动作）：若 `backend/AGENTS.md` 的 **Models Configuration** 一节确实列了 `models_config.json` 的字段集 ⇒ **同步更新**（本对加 3 个）。⚠️ **顺手扫同段相邻句**（上一对的教训：计划点名的两处之外还查出了第三处）。**若该节根本没列字段清单 ⇒ 明确记一句「无需改动」**，别硬加。
      **实测**（2026-09-22）：该节**没有逐字段清单**（只有 allowlist / 掩码 / 解析顺序 / `ModelConfig` 的能力子集）⇒ **不硬加字段表**；但**安全边界那段正好被本对改动**（`default_headers` 是唯一不过掩码的字段、读端点与写同敏感）⇒ 只加这一句（+4 行，插在 "sentinel means keep the stored key" 之后）。**顺手扫同段相邻句**（上一对的教训）：唯一受影响的是 `make support-bundle` 那句（`models-summary.json`）—— **实测已自动覆盖**：`redact_data` 的 `HEADER_KEY_RE = re.compile(r"(?i)header")` 命中 `default_headers` ⇒ 值变 `<redacted>`、键保留 ⇒ **无需改动**。
- [x] **真栈（口径照前两对：只验请求体形状，不声称回话）**：**隔离实例**（`DEER_FLOW_PROJECT_ROOT` / `DEER_FLOW_CONFIG_PATH` / `DEER_FLOW_MODELS_CONFIG_PATH` 三个环境变量指向**仓库外 scratch 根** + `DEER_FLOW_AUTH_DISABLED=1` + `:8099`）+ **本机 recorder 端点** ⇒ **零出网**。
      ⚠️ **启动隔离实例前把 `rag.qdrant_url` 也改到 scratch 或指向空**（前两对的实测：它会连本机 `:6333`）。
      ⚠️ **触发路径要点名**：配方的差异**只体现在请求体**，所以断言点是 **recorder 抓到的 body**，不是界面。
      **实测**（2026-09-22）：scratch 根 `E:\app\python\agent\_snapshots\t4root`（**仓外**，收尾已删）；`config.yaml` 由 `backend/tests/_replay_fixture.build_config_yaml` 生成（`models: []`、本地 sandbox、空 skills、memory / summarization 关、sqlite 落 scratch）+ `prepare_hermetic_extras`；四个 `DEER_FLOW_*` 环境变量 + `DEER_FLOW_AUTH_DISABLED=1`；recorder 在 `127.0.0.1:8098`（OpenAI + Anthropic 两种形状都答），gateway 在 `127.0.0.1:8099`；四个条目端点全指向 recorder、key = 假值 ⇒ **零出网**。
      ⚠️ **第一版踩到计划点名的坑**：`build_config_yaml` **不含 rag 段** ⇒ 走默认 `localhost:6333`，启动时连到了他本机共享的 Qdrant（8 条 GET/PUT `index?wait=true`；集合数 18 → 18 未变）⇒ 停实例、scratch 配置补 `rag: {qdrant_url: http://127.0.0.1:6399}`（死端口）重启 ⇒ **0 条 Qdrant 日志**，其余全绿。
- [x] **真栈五条**：
      1. 建一个**勾了「思考模式」**、**不勾档位能力**、带「OpenAI 兼容网关」形状的条目 ⇒ 四个模式**收敛成两个请求体**：flash ⇒ `extra_body.thinking.type == "disabled"`、thinking / pro / ultra ⇒ `"enabled"`，同组内逐字节相同 —— **本对的核心验收**。
         ⚠️ **两条前提都要照做**：① D3 的自动推**不碰 `supports_thinking` chip**，chip 不勾时开思考那条在界面上不可达（composer 只给 Flash）⇒ 条目会**验不出差异**，那不是配方的错；② **档位那一维必须先关**（`supports_reasoning_effort` 不勾、`supported_reasoning_efforts` 空）—— 否则 flash `undefined` / thinking `low` / pro `medium` / ultra `high` 四个请求体**收敛不了**；关掉后 `factory.py:373-375` 会把 `reasoning_effort` 整个 pop 掉（`offeredModes` 只看思考 chip，四个模式照样能选）。
      2. **对照组**：同一条目把形状设回「不设置」⇒ **四个**模式的请求体**逐字节相同**（前提同上：档位那一维已关）—— 证明差异来自配方，不是别的东西。
      3. `default_headers` 用一个 recorder 端点验：**请求头里出现所配的键**。
      4. **编辑既有 `anthropic` 条目 ⇒ 自动获得形状 ③**（验收 13 在真栈上的样子）：样本**在 scratch 根里复刻**他本机 `minimax-m3` 的形态 —— `use: langchain_anthropic:ChatAnthropic` + `base_url` 指向本机 recorder + **假 key**；设置页里**只改显示名**再保存 ⇒ scratch 的 `models_config.json` 里该条目**多出** `{"thinking": {"type": "enabled", "budget_tokens": 4096}}` / `{"thinking": {"type": "disabled"}}`。
         ⚠️ **样本要"手写进 scratch 文件"、不能走界面新增** —— 界面上新建 `anthropic` 条目**在创建那一刻就会带上形状 ③**（D3 自动写），那就验不出"编辑让它多出配方"这条路径了；**起点必须是"有类、无配方"**（与他本机 `minimax-m3` 今天的状态一致）。
         ⚠️⚠️ **不许编辑他本机那条** —— `minimax-m3` 是全局唯一一条 `ChatAnthropic` 条目（响应里的 `provider` 由 `use:` 反查得出，`models_config.py:66-68`），本项是"**复刻它的形态**"、不是"动它"；动手前后 `models_config.json` md5 必须逐字节相同。
         ⚠️ **这一项只验到"写进去了"为止**：`opencode.ai/zen/go` 那个代理**收不收原生 Anthropic 形状的 `thinking`**，隔离实例答不了（recorder 只证明发得出去）—— 而他本机两条 `opencode.ai` 条目（`deepseek-v4.1-flash` / `minimax-m3`）此前实测都 400 `MissingSessionID`（缺 `x-opencode-session` 头）⇒ 真要验接受度得先补 `default_headers` + 一个真 key，**那是另一条线**（spec §6 第 8 条登记）。
      5. **两个既有字段在真栈上不丢**（验收 18）：scratch 里造一个带 `max_tokens: 8192` + `use_responses_api: true` 的条目 ⇒ 在设置页**动另一个条目**（新增或删除）后保存 ⇒ 前者这两个键**仍在 scratch 文件里**；顺带（可选）重开它的编辑弹窗 ⇒ 头 / 形状 / **最大输出**显示为**已存值**（D6 读侧在真栈上的样子）。⚠️ **判据是"没被抹"**，不是"能被改" —— 保存前后逐字比对那两个键即可。
      ⚠️ **区分度检查**（上一对的教训）：如果那条目的**默认档恰好等于回退目标**，观测值就无法解释 ⇒ **先确认两个假设预测出不同结果**。本对按上面第 1 条的"**不勾档位能力**"造样本，这条自动满足。
      **实测**（2026-09-22）：
      1. `t4-gateway`（`supports_thinking: true`、`supports_reasoning_effort` 关且子集空、配方 = 形状 ① × 2）⇒ 四个模式**模型参数收敛成 2 个形状**：`{"model": "t4-model", "stream": false, "thinking": {"type": "disabled"}}`（flash）与 `…"enabled"`（thinking / pro / ultra）；脚本口径 `# distinct model-parameter shapes (messages/tools excluded): 2`，`thinking=enabled: ['pro','thinking','ultra'] | disabled: ['flash']`。⚠️ **口径更正（第一处）**：spec §4 第 15 条那句"同组内逐字节相同"**只在"模型参数"这一维成立** —— 同一批请求里 pro / ultra 的 `tools` 本就比 flash / thinking 多（`tools_n` = 4 / 4 / 5 / 6，`tools_sha` = `97f38cd93cbb` / `97f38cd93cbb` / `2cd9f2778b24` / `8bdbfcc61759`，pro 起多 `write_todos`）、`messages` 也逐模式不同（`messages_sha` = `0f3717f96da1` / `1a2abd3f3069` / `a1ccda7c4f29` / `b54147a1eced`）⇒ 那是**模式自己的差异**（计划模式 / 子代理），不是配方；"差异来自配方"正由第 2 条钉住。
      2. 同一条目把两个配方键整个去掉再整集合 PUT（同设置页的写法）⇒ 四个模式**只剩 1 个**模型参数形状 `{"model": "t4-model", "stream": false}`（`thinking` 键整体消失），而**逐模式的 tools / messages 哈希与第 1 条逐位相同** ⇒ 唯一变量就是配方键。
      3. `default_headers: {"x-t4-header": "t4-header-value"}`（同 PUT）⇒ recorder 侧 `shaped | calls: 4 | x-t4-header: {'t4-header-value'} | authorization: {'Bearer t4-fake-key'} | path: {'/v1/chat/completions'}`，对照组一行同值（`control | calls: 4 | …`）⇒ 八个请求**全部**带上，没有一条漏。
      4. 编辑 `t4-anthropic`（scratch 里手写复刻 `minimax-m3` 的形态：`use: langchain_anthropic:ChatAnthropic` + recorder 端点 + 假 key，**起点 9 键、零配方**）⇒ 改名 + 弹窗会派生的形状 ③ 一起 PUT ⇒ 该条目变 **11 键**（+`when_thinking_enabled` = `{"thinking": {"type": "enabled", "budget_tokens": 4096}}`、+`when_thinking_disabled` = `{"thinking": {"type": "disabled"}}`）。⚠️ **口径更正（第二处，即第四处偏差）**：**配方是前端派生的**（编辑弹窗的 `thinkingRecipeFor`），后端不派生 —— 第一次只 PUT 显示名时文件**一个键都没多**（9 键不变），照弹窗的实际载荷补上两个键才到 11 键 ⇒ 真栈只证明**写腿**，派生规则由 node / dom 用例钉（验收 13 在真栈上天然只有"写"这一半）。
      5. 动 `t4-other`（改名 + 整集合 PUT）后 ⇒ `t4-parity` 的 `max_tokens: 8192` / `use_responses_api: true` **仍在**文件里（`BEFORE` / `AFTER` 键清单逐字相同）；`GET /api/models/config` 四个条目五字段全在（没设过的 = `null` 不是 `false` / `0`），且 `t4-gateway.default_headers` **原样回显** `{"x-t4-header": "t4-header-value"}`（掩码只吃 `api_key`）⇒ 验收 15 / 16 / 17 / 18 的真栈侧齐（第 18 条那句"重开编辑弹窗显示已存值"由 `models-edit-dialog.dom.test.tsx` 的预填用例钉，本次没开浏览器）。
- [x] **收尾**：**零改动他的配置**（写入全落 scratch 根 ⇒ `models_config.json` / `config.yaml` md5 与动手前相同，**不欠还原**；**动手前先把两本的 md5 记下来**，收尾逐个比对）；隔离实例与 recorder 停掉（`taskkill /T`，确认端口释放）；**scratch 目录删净**。
      **实测**（2026-09-22）：动手前记下的 md5（`models_config.json` = `1fbfd8019d45ea317a07c81aa1494972`、`config.yaml` = `96af3c540c67cd32093bbb57490eb254`）收尾逐个比对 ⇒ **两份逐字节相同**（写入全落 scratch 根，不欠还原）；隔离 gateway 与 recorder 已停、`:8098` / `:8099` 无监听（他的 `:3000` / `:8001` 全程未动）；`_snapshots\t4root` 与空掉的 `_snapshots` **已删净**。
- [x] **门禁**：后端 **全量 `cd backend && make test` 后台跑** ⇒ 抽 FAILED 的 node id 去 HEAD（`git worktree add --detach`、**仓外 basetemp**、HEAD 那棵树先 `cp` 进去那 4 个 gitignored 文件）跑同一批 ⇒ **双向 diff**；`ruff` 双净；`cd frontend && pnpm check` + `pnpm test` 全量。
      ⚠️ **跨树 A/B 两侧必须用同一个仓外 basetemp**（否则凭空多一条"回归"，双向已证）。
      **实测**（2026-09-22）：
      - **后端全量**（`make test` 口径，仓外 basetemp `E:\app\python\agent\_bt-t4\bt`）：**146 failed / 12432 passed / 109 skipped**（19:02）—— 与 Task 1 那次全量**逐数字相同**（同一批环境条件红：仓库根真实 `models_config.json` 等）。
      - **HEAD 双向 A/B**：抽 146 个 node id（`tr -d '\r'` 后取 `^FAILED`）⇒ 仓外 detached worktree（`git worktree add --detach`、先把 5 个 gitignored 根文件 `cp` 进去、同一个 basetemp、同一个解释器）跑同一批 ⇒ **144 failed / 2 passed**；`comm` 双向 diff 的差集**只有那 2 条**：`test_delta_channel_state.py::test_merge_message_writes_randomized_differential` 与 `test_multi_worker_run_ownership.py::test_hung_renewal_is_bounded_by_confirmed_lease_deadline[asyncio]`。两侧各**单独复跑 2 次 = 2/2 全绿**（WT 15.5s ×2 / HEAD 15.6s ×2）⇒ **全量跑才偶发**的 flake（时间/租约类），**双向 diff 净空**、无回归。
      - **ruff**：`ruff check` 两侧**都净**；`ruff format --check` 两侧**都红同一个文件**（`tests/knowledge/tools/test_graph_search.py`，别线历史债、HEAD 同样被 flag ⇒ 非本对引入；其余 1287 文件 formatted）。
      - **前端**：`pnpm check` 净；`pnpm test` 全量 **242 文件 / 2604 例 / 0 失败**（与 Task 3 后的基线同数）。
      - ⚠️ **踩坑**：`--basetemp` 会**清空它指向的目录** —— 第一次把 `full.log` 写进 basetemp，进程一起来日志就被删、整跑输出全丢 ⇒ **日志与 basetemp 必须分家**（重跑一次才拿到数字）。
- [x] **交付后回写**：spec 的 `**Status:**` 与 plan 本文件的 `**Status:**` 一起更新（交付的提交号 + 关键门禁数字），并把各 Task 的 `**实测**` 行补齐 —— **未回写的 plan 不算交付**。
      **实测**（2026-09-22）：本文件的 `**Status:**` 已改（六个 Task 全交付 + Task 4 门禁数字）；spec 的 `**Status:**` 同步改（见 spec 首行）；Task 4 的 6 个复选框与 6 段 `**实测**` 全填。⚠️ **提交号**：本对提交 `46b69ea5`（3 文件 / +33 / −15）；Status 里那个提交号与这句一样，是**同一条线紧接着的跟进提交**补上的（Task 2 的先例：`644ab8dd` 的号写进了 Task 3 那笔）。

> **Task 4 的两处口径更正（已披露）**
> ① **「同组内逐字节相同」收窄到"模型参数"那一维** —— spec §4 第 15 / 16 条的原话在真栈上**逐字节比整个请求体时并不成立**：同一批四个模式里 `tools`（`tools_n` 4/4/5/6、pro 起多 `write_todos`）与 `messages` 本来就逐模式不同，那是**模式自己的差异**（计划模式 / 子代理），不是配方造成的；配方的作用面就是**模型参数**（`model` / `stream` / `thinking`），这一维上四条收敛成 2 形状（第 2 条对照组：1 形状）。spec 正文未改（属叙述收窄、非结论变化），口径以本节实测为准。
> ② **形状 ③ 是前端派生的** —— 编辑弹窗的 `thinkingRecipeFor` 负责把 `anthropic` 类条目自动写成 `{"thinking": {"type": "enabled", "budget_tokens": 4096}}` / `{"thinking": {"type": "disabled"}}`，**后端不派生**（第一次只 PUT 显示名 ⇒ 文件一个键都没多）⇒ Task 4 的第 4 项在真栈上只能证明**写腿**（"多出来的键被写进文件"），派生规则由 node / dom 用例钉（验收 13 天然只有真栈这一半）。
