# 设置页「提供商」下拉分组 + 随带修复（两批六处） —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-22-provider-grouping-design.md](../specs/2026-09-22-provider-grouping-design.md)
**Status:** ✅ **已定稿（2026-09-22；随带修复两批 2026-09-23 并入）—— 待拍清零（D1 甲 / D2 甲 / D5 甲+乙 / D6 用户给定词 / D7 甲 / D8 甲 / D9 甲 / D10 乙 / D11 甲）；其中 **D8（形状② 文案）已在开工前落地（2026-09-22）**。**进行中（2026-09-23 开工）：Task 0 已核、Task 1 已交付、Task 2 已交付、Task 3 已交付（`b10de00f`）、Task 4 已完成并回填（2026-09-24）；**✅ 交付收官（2026-09-24）** —— 五个 Task 全部落地、门禁 = `pnpm check` 净 + 前端全量 243 文件 / 2619 例 / 0 失败；spec 的 `**Status:**` 已同步为「已交付」**。
**Parent:** [2026-09-22-reasoning-replay-default-design.md](../specs/2026-09-22-reasoning-replay-default-design.md)（**类层**：`openai-compatible` 那格*背后*的类；本对只动**前端呈现/文案/布局**、**零文件重叠** ⇒ 可与它并行）· 相关：[2026-09-23-default-model-design.md](../specs/2026-09-23-default-model-design.md)（**同文件 ⇒ 串行、本对先交付**：`models-settings-page.tsx` + locales 三文件 + 它的 dom 用例）· [2026-09-21-model-entry-field-parity-design.md](../specs/2026-09-21-model-entry-field-parity-design.md)（同表面、已交付）

**Architecture:** 四件事 —— **① 分组表**（`core/models/provider-groups.ts`，node 用例钉"表 + 穷尽性"）**② 接线 + 文案**（添加弹窗的 `SelectContent` 改按表渲染 `SelectGroup` / `SelectLabel`（含两组之间的 `SelectSeparator`）+ i18n 三文件：2 个组名新 key、1 个占位新 key、**7 处改值**（D6 / D7 / D9 / D10 / D11）；分组结构由 **dom 用例驱动候选**钉住，配方 = `tests/unit/settings/models-capability-wizard.dom.test.tsx:123-129`）**③ 切换行不带抖动**（行自持 `min-h-9` + 按钮 `size="sm"`；结构 dom 钉、几何真浏览器量）**④ 真浏览器复核**（分组结构 / 两视图切换不位移 / 观感）。

**硬约束（spec 已裁，实现时不许自行放松）**：

- **已拍：D1 甲（组标题 + 分割线）/ D2 甲（「通用协议」/「厂商」；en = `Generic protocol` / `Vendors`，**en 两条已拍 2026-09-23**）** —— 实现按这个写，**不许自行换词、不许省掉分割线**。
- **已拍：D5 甲+乙都做** —— 切换行加 `min-h-9` **且**「添加模型」按钮改 `size="sm"`。**两条都要**（只做乙也能消抖，但会把 chat 视图今天的样子整体上移 4px；甲让行高归行所有，保住既有间距）。
- **已拍：D6 用户给定词** —— 新增 `apiKeyPlaceholder` = 「请输入API Key」；`modelIdPlaceholder` = 「请输入模型ID名称」；en = `Enter API key` / `Enter the model ID`（**en 四条已拍 2026-09-23**，与 D2 的两条同批）。
- **已拍：D7 甲** —— `providerOpenaiCompatible` = **`OpenAI-compatible`**（zh 与 en 同值）；`providerAnthropic` / `providerDeepseek` / `customProvider` **不动**。改的是**文案**不是契约（三项 `value` = id 仍不动）。
- **已落地：D8（形状② 文案）** —— `thinkingShapeVllm`：zh = **`chat_template_kwargs（vLLM / SGLang）`**、en = **`chat_template_kwargs (vLLM / SGLang)`**，**2026-09-22 已改**（2 个 i18n 各 1 行、零断言改动、全量 242/2604/0）⇒ **开工时不得再改这个 key**（只做核对，见 Task 5）。
- **已拍：D9 甲 / D10 乙 / D11 甲（2026-09-23，随带修复第二批）** —— `addHeader` / `addModelId` 去掉文案里的 `+`（**保留 `PlusIcon`**，D9）；`thinkingShapeGateway` = **`extra_body.thinking（OpenAI 兼容）`**（en `extra_body.thinking (OpenAI-compatible)`，D10）；`headerNamePlaceholder` / `headerValuePlaceholder` = **「Header 名称」/「Header 值」**（en `Header name` / `Header value`，D11）。**行标签 `defaultHeaders`（「请求头」）不动**。用例面已扫（Task 0.8）：**零断言改动**。
- **不动**：provider id（`core/models/types.ts:29` 的 `ProviderId`）· 提交 payload（`ManagedModelInput.provider`）· 后端全部 · 编辑弹窗的**代码**（provider 只读，`models-edit-dialog.tsx:129`；它显示的 `addHeader` / `header*Placeholder` / `thinkingShapeGateway` **文案**随 D9–D11 变）· `providerLabel` / `customProvider` 的**代码**（它们显示的 `provider*` 值随 D7 变，函数与分支不动）· `ui/select.tsx`（三件已导出 `:182/:184/:187`）· endpoint 的占位（`https://api.example.com/v1` 原样）· 行标签 `defaultHeaders`（D11 明确不动）· 「添加模型」按钮的**可见性逻辑**（`view === "chat" && !adminRequired && !error` 原样）。
- **按表渲染**：弹窗**不平行硬编码**；表与渲染同源（node 用例钉表、dom 用例**驱动候选**钉渲染）；新增 `ProviderId` 必须落表（验收 2 的穷尽性用例会红）。
- **i18n 三文件联动**：`locales/types.ts` + `locales/zh-CN.ts` + `locales/en-US.ts` —— 缺 `types.ts` ⇒ tsc 当场红；本对各 **+3 key**（`providerGroupGeneric` / `providerGroupVendor` / `apiKeyPlaceholder`）+ **7 处改值**（D6 1 / D7 1 / D9 2 / D10 1 / D11 2）+ **D8 的 1 处已提前落地**（共 8 处；**`thinkingShapeVllm` 别动、开工时只核对**，见 Task 5）。
- **用例只钉结构**（`data-slot` / `[role=option]` / 类名 / 文案原文），**不钉几何**（宽高/位置/观感归 Task 4 真浏览器）。读候选结构要**驱动候选**：`fireEvent.click(getByRole("combobox", { name: M.provider }))` 开列表 + `fireEvent.click(await findByRole("option", { name }))` 选中（配方 = `models-capability-wizard.dom.test.tsx:123-129`；2026-09-22 实测该文件 23/23 绿）。

**Global Constraints:**

- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **前端命令**：`cd frontend && PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`；门禁 = `pnpm check`（eslint + tsc）+ `pnpm test`（rstest：node 项目 + dom 项目）。
- **不起隔离实例**（纯前端、零后端改动）；Task 4 只驱动用户已在跑的 `:3000`、**只读**；**不碰** `models_config.json` / `config.yaml`（Task 4 只读、不保存）。
- **每个 Task 的 `**实测**` 行必须回填**（RED 几条红 / GREEN 几条绿 / neuter 受害者 / 门禁数字）——未回写的 plan 不算交付。
- **scope fence（明确不做）**：厂商项**预填端点**（终态另立一对；本对是它的第一步）· 行标签 `customProvider` 措辞 · 「更多」折叠分组 · 编辑弹窗分组 · endpoint 占位 · 功能模型栏自己的 provider 下拉与密钥框（另一 id 空间，见 Task 0.5）。

**依赖顺序**：Task 0（只读核实）→ Task 1（分组表 + node 用例）→ Task 2（接线 + 文案）→ Task 3（切换行）→ Task 4（真浏览器复核）→ 交付后回写。**（Task 5 = D8 文案改名，已在开工前落地 ⇒ 不占顺序、开工时只核对。）**

---

## Task 0 — 开工前七项核实（只读）

- [x] 1. **`ui/select.tsx` 三件已导出**（初核：`SelectGroup` `:182` / `SelectLabel` `:184` / `SelectSeparator` `:187`，`data-slot` 分别 = `select-group` / `select-label` / `select-separator`）⇒ 复核一遍，确认**不用改共享组件**。
- [x] 2. **Radix `SelectGroup` 的 DOM 形状**：读 `ui/select.tsx:15-20` 的包装（`SelectPrimitive.Group`）+ 仓内先例 `artifact-file-detail.tsx:415-421`（`SelectGroup` 包 `SelectItem`，无 label）；确认组容器渲染成什么元素、`SelectLabel` 有没有 `role` ⇒ 决定 Task 2（dom）与 Task 4 的断言用 `data-slot` 还是 `[role=option]` 顺序。
- [x] 3. **i18n 三文件落点与命名**：`locales/types.ts:1655` 一带 / `zh-CN.ts:1636` 一带 / `en-US.ts:1731` 一带 ⇒ 三个新 key 插哪、`providerGroup*` / `apiKeyPlaceholder` 前缀是否全仓 0 命中（避免撞车）。
- [x] 4. **现有用例不会因分组/改值而红**：`models-add-dialog.dom.test.tsx` 今天**没有** provider 相关断言（初核 grep 无命中）⇒ 复核；另核 `models-settings-page.dom.test.tsx` 是否钉过下拉结构或行标签原文（初核：只钉过"按钮与切换器同一父元素"这一条结构，其余断言都走 `M.*` 常量）。
- [x] 5. **下拉只有一处（限定 `ProviderId` 空间）**：确认 **`ProviderId` 空间内**的下拉只在添加弹窗（编辑弹窗 provider 只读；设置页只有行标签 `providerLabel`；功能模型栏的 embedding / rerank provider 下拉是 RAG 的 `provider_id: string`（`core/rag/types.ts:70/85`），另一 id 空间、与本对无关）⇒ 复核，若 `ProviderId` 空间内还有第二处，回报并加进本对的改动面。
- [x] 6. **「自定义」占用仍成立**：`customProvider` 的 i18n 行 + 唯一消费点（`models-settings-page.tsx:79-89`，渲染点 `:196`）⇒ 复核 D2 的"避让前提"（若已被别处改词，回报）。
- [x] 7. **既有断言没钉旧字面量**（已核）：`qwen3.8-max` / `OpenAI 兼容` 在 `tests/` 里**没有字面量断言**（只有 `thinking-shape.test.ts` 注释里的散文）；`addOneModel` 用 `M.modelIdPlaceholder` 常量取框（`:56`）⇒ 改值不会红；~~`tests/unit/support/i18n-key-manifest.ts` 只查三文件 key 对齐~~ ⇒ **修正见实测 ⑦**。

**实测（2026-09-23 复核，七项逐条）**：

- ① ✅ 三件均导出（定义 `:15`/`:90`/`:130`，导出 `:182`/`:184`/`:187`），`data-slot` = `select-group`/`select-label`/`select-separator` ⇒ **不改共享组件**。
- ② ✅ **决定：组标题与分割线都只能走 `data-slot`，不能用 role** —— Radix 里 `SelectLabel` 是 `Primitive.div`（**无 role**）、`SelectSeparator` 是 `Primitive.div + aria-hidden`（**无 role**）；`role="presentation"` 属 **viewport**、`role="group"` 属 `SelectGroup`。成员与顺序照旧用 `[role=option]`（Item 保留 `role="option"`）。Task 2 / Task 4 的断言口径按此写。
- ③ ✅ `providerGroup*` / `apiKeyPlaceholder` 全仓 **0 命中**；插入点现状：zh-CN `:1637-1641` 区段、types `:1655-1658`、en `:1731-1734`（与 spec 的"一带"一致）。
- ④ ✅ 添加弹窗用例**零** provider/结构断言；设置页用例只钉**数据夹具**（`provider: "deepseek"` 等）与 payload（`:316`）⇒ 改文案 / 加分组都不会红。
- ⑤ ✅ `SelectItem value=` 三个只出现在 `models-add-dialog.tsx:227-231` ⇒ `ProviderId` 空间内唯一，改动面无需扩大。
- ⑥ ✅ `customProvider` 消费点唯一（`models-settings-page.tsx:88`），D2 的避让前提成立。
- ⑦ ✅ 旧字面量无断言（`tests/` 仅 `thinking-shape.test.ts:21` 注释；`addOneModel` 走 `M.modelIdPlaceholder`，`:56`）。⚠️ **修正**：`settings.models` **不参与** i18n key manifest guard —— `tests/unit/support/i18n-key-manifest.ts` 只服务 constitution / delivery / pulse / run-status 四个命名空间；本 namespace 的双向兜底就是 `types.ts` 的**编译期约束**（`zhCN/enUS: Translations` 同时拒绝缺键与多键）。⇒ 新 key **三处齐加**即可，没有 manifest 兜底。
- [x] 8. **第二批四个 key 的引用面（2026-09-23 扫完）**：`addHeader` / `addModelId` / `headerNamePlaceholder` / `headerValuePlaceholder` 的**全部消费点走 `M.*` 常量**（`getByRole("button", { name: M.addHeader })` @ `models-add-dialog.dom.test.tsx:86`；`getByPlaceholderText(M.headerNamePlaceholder)` @ `:87`；`{ name: M.addModelId }` @ `models-settings-page.dom.test.tsx:302` / `models-capability-wizard.dom.test.tsx:87`）⇒ **改值零断言改动**；`thinkingShapeGateway` 在 `frontend/tests` **0 命中**（同 D8）；测试里的 `x-opencode-session` 是 **`default_headers` 的数据**（batch/edit/settings 三个测试），不是占位文案。docs 侧的逐字引用：D10 有（已登记在 spec D10，**本对不碰那两份、开工时同步**），D9 / D11 **零**。

---

## Task 1 — 分组表 + node 用例

> 动到的文件：`src/core/models/provider-groups.ts`（**新增**）、`tests/unit/models/provider-groups.test.ts`（**新增**）。
> **验收对应**：spec §4 的 1 / 2。

- [x] **RED**：先建新用例文件（三条断言）：① 表 = spec §3.1 的两组（**顺序 + 成员**逐项）；② **穷尽性** —— `ProviderId` 的三个值在表里**各恰好一次**（用 `flatMap` + 去重 + 集合比较）；③ **文案 key 表** —— `PROVIDER_LABEL_KEYS` 对三个 id 各给一个 `provider*` key（值集合 = 三个）。此刻实现文件不存在 ⇒ 红。
- [x] **GREEN**：写 `provider-groups.ts`（`ProviderGroup` 接口 + `PROVIDER_GROUPS` 常量 + **`PROVIDER_LABEL_KEYS: Record<ProviderId, …>`**；两个 key 都收窄成字面量联合 ⇒ i18n 缺 key / 新增 id 时 tsc 红）。窄面转绿。
- [x] **neuter ①（归属）**：把 `deepseek` 从厂商组挪进协议组 ⇒ ① 转红、② 保持绿（**受害者不相交**）。
- [x] **neuter ②（穷尽）**：删掉表里 `anthropic` 一项 ⇒ **② 转红**（① 也红 ⇒ 据实记录两支的受害者集合）。
- [x] **门禁**：`pnpm check` 净；窄面（`tests/unit/models/provider-groups.test.ts`）绿。

**实测（2026-09-23，Task 1 完成）**：

- **RED**：用例文件就位、实现文件未建 ⇒ **1 文件红 / 0 例**（`Cannot find module '@/core/models/provider-groups'`，987ms）。
- **GREEN**：写好 `provider-groups.ts` ⇒ 窄面 **3/3 绿**（243ms）。
- **neuter ①（`deepseek` 挪进协议组、厂商组留空）**：**① 红、②③ 绿** ⇒ 受害者 = **{①}**，与 ② 不相交（与计划预测一致）。
- **neuter ②（删掉 `anthropic`）**：**①② 红、③ 绿** ⇒ 受害者 = **{①②}**（计划已预告"① 也红"，据实记录）。
- **还原证明**：原表恢复后窄面复跑 **3/3 绿**。
- **门禁**：`pnpm check`（eslint + tsc）**净**（零输出）；两个新文件 `prettier --check` 全绿（用例文件被 prettier 重排 **1 处** = 末条断言换行；实现文件零改动）。
- **两道网的分工（写清，免得后人误判）**：新增第 4 个 `ProviderId` 时**第一道网是 `PROVIDER_LABEL_KEYS` 的 `Record`（tsc 当场红）**；用例 ② 是**第二道网**（抓"表里删了/多了一个 id"）—— 与 spec §3.1 的说法一致。

---

## Task 2 — 接线 + 文案：添加弹窗 JSX + i18n（3 文件）

> 动到的文件：`models-add-dialog.tsx`（import + `SelectContent` 按表渲染 + API Key 框加 `placeholder={M.apiKeyPlaceholder}`）；`locales/types.ts` / `zh-CN.ts` / `en-US.ts` 各 **+3 key、7 处改值**（D6 / D7 / D9 / D10 / D11）+ **D8 已提前落地（别动、只核对）**；`models-add-dialog.dom.test.tsx`（+4~6 条）+ `models-edit-dialog.dom.test.tsx`（+2~3 条 —— D9/D11 的**编辑腿**：同一批 i18n 值在那边也渲染）。
> **验收对应**：spec §4 的 3 / 4（dom 层驱动候选钉结构）· 5 / 6 / 10 / 13 / 14 / 15（dom 层钉）；8 的观感复核在 Task 4。

- [x] **RED**：dom 用例加 ① **提交回归**：走 `addOneModel()` ⇒ payload 的 `provider` 仍是 `openai-compatible`，且 `SelectTrigger` 文案随选择变化（驱动候选，配方见下）；② **分组结构**：驱动候选 ⇒ 两个组标题（`M.providerGroupGeneric` / `M.providerGroupVendor`）都在、`data-slot="select-separator"` 存在、`[role=option]` 的顺序与归属（协议组两项在前、厂商组一项在后）；③ **文案钉子**：`M.customProvider` **原文**逐字断言 + 三项 `provider*` = **D7 新值**逐字断言（含"zh 与 en 同值"一条）；④ **占位钉子**：`getByPlaceholderText(M.apiKeyPlaceholder)` 与 `getByPlaceholderText(M.modelIdPlaceholder)` 各一条；⑤ **加号钉子（D9）**：两个弹窗的「添加请求头 / 添加 Model ID」按钮 —— `textContent` 不含 `+`、且按钮内有 `svg`（添加腿在 add-dialog、编辑腿在 edit-dialog 各一条）；⑥ **形状①文案（D10）**：`M.thinkingShapeGateway` 逐字断言 = `extra_body.thinking（OpenAI 兼容）`（zh）/ `extra_body.thinking (OpenAI-compatible)`（en）；⑦ **请求头占位（D11）**：`getByPlaceholderText(M.headerNamePlaceholder)` / `M.headerValuePlaceholder`（两个弹窗各一条）。⚠️ 驱动候选用 `models-capability-wizard.dom.test.tsx:123-129` 的配方（`fireEvent.click` 开、`findByRole("option")` 选），**不要**用 pointerdown；另有两处为稳定性主动绕开 Radix Select（`functional-models.dom.test.tsx:402` / `models-settings-page.dom.test.tsx:339-341`）—— 本对**显式选择驱动**（配方已实测可跑）。
- [x] **GREEN**：i18n 三文件按 D2 甲加 `providerGroupGeneric`（「通用协议」/`Generic protocol`）与 `providerGroupVendor`（「厂商」/`Vendors`）、按 D6 加 `apiKeyPlaceholder`（「请输入API Key」/`Enter API key`）并把 `modelIdPlaceholder` 改成「请输入模型ID名称」/`Enter the model ID`、按 D7 把 `providerOpenaiCompatible` 改成 `OpenAI-compatible`（zh 与 en 同值）、按 **D9** 把 `addHeader` / `addModelId` 去掉文案里的 `+`、按 **D10** 把 `thinkingShapeGateway` 改成 `extra_body.thinking（OpenAI 兼容）` / `extra_body.thinking (OpenAI-compatible)`、按 **D11** 把 `headerNamePlaceholder` / `headerValuePlaceholder` 改成「Header 名称」/「Header 值」（en `Header name` / `Header value`）；`models-add-dialog.tsx` 的 `SelectContent` 改为 `PROVIDER_GROUPS.map(...)` ⇒ `SelectGroup`（`SelectLabel` + `SelectItem value={id}` + `{M[PROVIDER_LABEL_KEYS[id]]}`），**两组之间加 `SelectSeparator`**（⚠️ `SelectGroup` 直接子节点只能是 `SelectLabel`/`SelectItem`，不要包 `div`）；API Key 框加 `placeholder={M.apiKeyPlaceholder}`。⚠️ **不要碰 `thinkingShapeVllm`**（D8 已落地，见 Task 5 —— 它同在这两个文件里，改错就会把新文案覆盖回旧词）。窄面转绿。
- [x] **neuter ①（接线）**：把弹窗改回平铺三项（不读表）⇒ ② 的组标题 / 分割线断言应转红（"表→渲染"有牙）；若**无红**，说明 dom 用例没真开到候选 ⇒ 按上面的配方修好再重验。
- [x] **neuter ②（文案）**：把组名换成错词 ⇒ ② 红；把 `providerOpenaiCompatible` 改回「OpenAI 兼容」⇒ ③ 红；删掉 key 框的 `placeholder` ⇒ ④ 红；把 `addHeader` 改回带 `+` ⇒ ⑤ 红；把 `thinkingShapeGateway` 改回「OpenAI 兼容网关」⇒ ⑥ 红（据实记录受害者集合）。
- [x] **门禁**：`pnpm check` 净（含 tsc：i18n 三文件缺一即红）；窄面（`models-add-dialog.dom.test.tsx` + `provider-groups.test.ts`）绿；更宽面（`tests/unit/components/workspace/settings/` 全目录 + `tests/unit/settings/`）绿。

**实测（2026-09-23，Task 2 完成）**：

- **RED**：add-dialog 腿 **6 红 / 3 绿**（9 例：两条既有 + 提交回归绿；分组结构与五条文案钉红）；edit-dialog 腿 **2 红 / 5 绿**（7 例）⇒ 合计 **8 红 / 8 绿**。
- **GREEN**：两条腿 **17/17 绿**（add 10 + edit 7 —— RED 后 add 腿又补 1 条，见"偏差"）；门禁 `pnpm check` 净。
- **neuter 受害者集合（六支，逐支跑）**：
  - 接线改回平铺 ⇒ **只 {分组结构} 红** ⇒ "表→渲染"有牙；
  - 组名换错词（`providerGroupGeneric` → 「协议组」）⇒ **只 {组名字面量钉子} 红** —— ⚠️ 常量驱动的"分组结构"**不会红**，这正是补那条字面量钉子的原因（见"偏差"）；
  - `providerOpenaiCompatible` 改回「OpenAI 兼容」⇒ **只 {文案钉子} 红**；
  - `addHeader` 加回 `+` ⇒ **{add 加号, edit 加号} 两条红**（两条腿各一）；
  - `thinkingShapeGateway` 改回「OpenAI 兼容网关」⇒ **只 {形状①钉子} 红**；
  - 删掉 Key 框的 `placeholder` ⇒ **只 {占位钉子} 红**。
  - ⇒ 六支的受害者**两两不相交**（每组都只在对应断言的范围内）。
- **还原证明**：六支全部还原后 17/17 绿。
- **门禁细节**：`pnpm check` 先抓到**我一个真错**（`import/order`：`provider-groups` 应排在 `capability-registry` 之后）⇒ 修完复跑净；prettier：两个用例文件绿；**4 个被 flag 的文件（弹窗 + 三个 locale）HEAD 版同样被 flag = 既有格式债**（逐文件核过：我的改动行**都不在** prettier 的差异 hunk 里）⇒ 按惯例不 `--write`。
- **偏差（据实记录）**：计划写 add 腿 "+4~6 条"，实落 **+8**（7 条计划内 + 1 条"两条组标题的字面量钉子"）—— 后者是为让"组名换错词"那支 neuter 能咬（只靠 `M.*` 常量喂查询时，改值会静默通过）。

---

## Task 3 — 切换行不带抖动（`models-settings-page.tsx`）

> 动到的文件：`models-settings-page.tsx`（**两处**：切换行 `min-h-9`、「添加模型」按钮 `size="sm"`）；`tests/unit/settings/models-settings-page.dom.test.tsx`（+1~2 条）。
> **验收对应**：spec §4 的 11（结构部分）；几何部分在 Task 4。

- [x] **RED**：dom 用例放在同文件既有那条 `keeps the add button on the view-switch row`（`:122-131`）**旁边**、同一写法（`toggle.parentElement`）钉两条：① 切换行有 `min-h-9`；② 「添加模型」按钮 `size="sm"`（渲染类含 `h-8`，出处 `ui/button.tsx:26`）⇒ 此刻两条都红（行没有 `min-h-9`、按钮是 default 的 `h-9`）。
- [x] **GREEN**：`models-settings-page.tsx` 两处按 D5 改（行加 `min-h-9`、按钮加 `size="sm"`）；按钮可见性逻辑原样。窄面转绿。
- [x] **neuter ①（行高）**：去掉 `min-h-9` ⇒ ① 红、② 保持绿。
- [x] **neuter ②（按钮）**：按钮还原 default ⇒ ② 红、① 保持绿（**受害者不相交**）。
- [x] **门禁**：`pnpm check` 净；窄面（`tests/unit/settings/` 全目录）绿。

**实测（2026-09-24，Task 3 完成）**：

- **RED**：同文件 `:133-152` 新增两条（沿用既有那条的 `toggle.parentElement` 写法）⇒ **2 红 / 14 绿** —— ① 实收行 class = `mb-4 flex items-center justify-between gap-3`（无 `min-h-9`）；② 按钮 class 尾部为 default 的 `h-9 px-4 py-2 has-[>svg]:px-3`（无 `h-8`）。8.66s。
- **GREEN**：源码两处 = 行 `mb-4 flex min-h-9 items-center justify-between gap-3`、按钮 `size="sm"`（保持 `view === "chat" && !adminRequired && !error` 原样）⇒ 窄面 **16/16 绿**（14 旧 + 2 新）；`tests/unit/settings/` 全目录 **5 文件 / 104 例 / 0 失败**（21.3s）。
- **neuter ①（去掉 `min-h-9`）**：只 `gives the view-switch row a floor of its own…` 红，按钮那条保持绿。
- **neuter ②（按钮还原 default）**：只 `renders the add button small…` 红，行高那条保持绿 ⇒ **受害者不相交，双向各验一次**（每次 neuter 后均已回退并复跑）。
- **门禁**：`pnpm check`（eslint + tsc）**净**（零输出）；**前端全量套件 243 文件 / 2619 例 / 0 失败**（3m29s，后台跑；09-23 基线 242/2604 ⇒ +1 文件 +15 例）。
- **格式债判别**（两文件均被 `prettier --check` flag）：`tr -d '\r'` 后内容比对 —— ① 源码文件**内容干净**（flag 全来自 CRLF 环境）；② dom 用例文件 **12 处差异，与 HEAD 逐 hunk 相同**（后六个 hunk 全按 +21 行平移 = 本 Task 插入的行数；`:133-152` 新区间零差异）⇒ **纯既有债、不 `--write`**（按既有纪律：只重排自己的行，不在历史行上翻格式）。
- ⚠️ **工具坑（新记）**：`scripts/pnpm.py` 的 stdin **只认管道（FIFO）**；用 `< 文件` 重定向喂输入会被当"无输入" ⇒ prettier 静默产出 0 字节（exit 0）＝假阴性。判定内容合规必须走 `cat f | … prettier --stdin-filepath <真路径>`。

---

## Task 4 — 真浏览器复核（添加弹窗 + 视图切换，只读）

> 用户已在跑的 `:3000` 上直开设置页（`?settings=models`）；**只读** —— 不保存、不删除、不提交。
> **验收对应**：spec §4 的 8（观感 / 几何）· 11（几何部分）；3 / 4 已由 Task 2 的 dom 断言钉住，这里在真渲染下再复核一眼。

- [x] 打开添加模型弹窗 ⇒ 用合成 `pointerdown` 打开「提供商」候选（先例：09-18 的三条浏览器操作要点）⇒ 读 `[role=option]` 的顺序、两个组标题（`data-slot="select-label"`）、以及 `data-slot="select-separator"` 是否存在（D1 甲）。
- [x] 三项仍可选：选 `deepseek` ⇒ `SelectTrigger` 文案随之变化（看一眼即可，**不提交**）；顺带确认三项文案已按 D7 显示为 `OpenAI-compatible` / `Anthropic` / `DeepSeek`。
- [x] **切换行几何（D5）**：切到「功能模型」再切回「对话模型」⇒ 读切换行高度与其下内容顶坐标，**两视图应一致**（改动前实测：行高 34 / 30、内容顶 485 / 482，差 4px）——若仍是这两个数，说明 D5 没生效。
- [x] 记录观感（组标题小字够不够辨认、分割线是否过重、切换时是否还有跳动、按钮变 sm 后是否仍显眼）—— 观感结论**只写进实测**，不进用例。

**实测（2026-09-24，Task 4 完成；驱动用户**正在跑的** `:3000`、只读、未保存）**：

- **入口（措辞更正）**：`/workspace?settings=models` **会被 `/workspace → /workspace/chats/new` 的跳转吃掉查询参数**（弹窗不开、地址栏参数也没了）⇒ 直开要用**终态路由** `http://localhost:3000/workspace/chats/new?settings=models`（深链组件打开弹窗后自行把参数从地址栏清掉，弹窗保持打开）。
- **① 候选结构（D1 甲）**：合成 `pointerdown` 打开 `[data-slot="select-content"]` 后，按 DOM 顺序读到的节点 = `select-label「通用协议」` → `option OpenAI-compatible` → `option Anthropic` → `select-separator` → `select-label「厂商」` → `option DeepSeek`（labels = 2 / separators = 1 / options = 3）—— **与分组表逐项一致**；`SelectLabel` / `SelectSeparator` 在真渲染里也确实没有 role（与 Task 0 ② 的判据一致）。
- **② 可选性与文案（D7）**：点 `DeepSeek` ⇒ 触发器文案 `OpenAI-compatible` → `DeepSeek`、列表收起（`data-state` 回 `closed`）；重开后该项 `data-state="checked"`、另两项 `unchecked`。**未保存、未提交**。附带核到：选中 DeepSeek 后「API 类型」下拉消失（仍只有 openai-compatible 显示该控件）。
- **③ 切换行几何（D5）**：同一脚本内 chat → functional → chat → functional → chat **五点测量**：**行高恒 36、行→内容间距恒 52（含 `mb-4` = 16）、行顶恒 392.33、滚动位恒 0**（改前 34 / 30、内容顶 485 / 482）⇒ **零位移**。⚠️ 首帧曾读到行顶 503.33 / 内容顶 555.33 —— 是**弹窗入场动画**期间的瞬时值（同一数值在两种视图都出现、稳定后消失），非视图差异；判据 = 同脚本连测五点全部相同。
- **④ 观感（截图，940×790 设备像素）**：组标题是灰色小字、与选项层级清楚；分割线是极细浅色线、不抢视线；选中项右侧的 ✓ 仍在；按钮改 `sm` 后仍是深色实心、在一行里依旧显眼；功能模型视图按规则不显示它，且**两张截图里标题与切换行的 y 坐标逐像素相同（543 / 574）** —— 视觉上再次印证「不跳」。
- **状态还原**：收尾切回对话模型、关闭设置弹窗（`[role="dialog"]` 计数 0）；全程**未保存、未删除、未提交**。

---

## Task 5 — 形状② 文案改名（D8）· **已在开工前落地（2026-09-22），本 Task 只核对**

> 动到的文件（**已改**）：`locales/zh-CN.ts:1647` / `locales/en-US.ts:1741`（各 1 行；`types.ts` 只声明类型、无值 ⇒ 不动）；外加 **field-parity** 的 spec/plan 两处引用同步（那是已交付文档，只同步引用不改契约）。
> **验收对应**：spec §4 的 12。

- [x] **文案已改**：`thinkingShapeVllm`：zh = `chat_template_kwargs（vLLM / SGLang）`、en = `chat_template_kwargs (vLLM / SGLang)`（旧名「vLLM / SGLang」；2026-09-22）。
- [x] **零断言改动**：`grep thinkingShapeVllm frontend/tests` **0 命中**（旧文案没有用例钉过）。
- [x] **门禁**：`pnpm check` 净；前端全量 **242 文件 / 2604 例 / 0 失败**（与基线同数）。
- [x] **核对（开工时做一次）**：Task 2 动 locales 后，`thinkingShapeVllm` 的**值仍是新文案**（防被覆盖/回退）；另确认 `thinkingShapeNone` / `thinkingShapeAnthropic` **原样**、而 ① 与 ② 都是新文案（① 由 **D10** 改、② 由 D8 改）—— ⚠️ 本条原写"只有 ② 改过"，已随 D10 作废。

**实测**：见上方三条 —— 落地时的数字（2026-09-22）；**开工核对（2026-09-24，Task 3 后顺带做）**：`thinkingShapeVllm` zh `chat_template_kwargs（vLLM / SGLang）` / en `chat_template_kwargs (vLLM / SGLang)` **未被回退**（D8 新文案仍在，`zh-CN.ts:1649` / `en-US.ts:1743`）；`thinkingShapeGateway` = **D10 新文案**（`zh-CN.ts:1648` / `en-US.ts:1742`）；`thinkingShapeNone` 原样（`:1647` / `:1741`）。⚠️ **措辞更正**：**`thinkingShapeAnthropic` 这个 key 并不存在** —— 用户可选项只有三支（`THINKING_SHAPE_OPTIONS = none / gateway / vllm`，渲染点 `model-capability-editor.tsx:79-83`），anthropic 形状按类自动推导、没有界面标签，故三份 locales 里都无此 key（`types.ts:1665-1667` 同）。

---

- [x] **交付后回写**：spec 的 `**Status:**` 与 plan 本文件的 `**Status:**` 一起更新（交付的提交号 + 关键门禁数字），并把各 Task 的 `**实测**` 行补齐 —— **未回写的 plan 不算交付**。
      **实测**：**2026-09-24 完成** —— spec 与 plan 的 `**Status:**` 均已改为「已交付」（写入代码三笔 `448fa421` / `ead8c43b` / `b10de00f`，门禁 = `pnpm check` 净 + 前端全量 243 文件 / 2619 例 / 0 失败）；Task 0–4 的 `**实测**` 行全部有内容，**本文件零空框**。两处措辞更正已就地写入：Task 4 的入口要带终态路由（`?settings=models` 会被跳转吃掉）、Task 5 的 `thinkingShapeAnthropic` 这个 key 并不存在（见各自 `**实测**`）。