# 设置弹窗表单行响应式布局 + 知识库页三处随带修复 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-24-settings-responsive-layout-design.md](../specs/2026-09-24-settings-responsive-layout-design.md)
**Status:** ✅ **已交付（2026-09-25）** —— Task 0–5 全落地、全框勾完、实测逐 Task 回填；**交付后调整（2026-09-25，他裁）**：① 断点 1024 → 768（`96ea6b0b`，类名 `max-lg`/`lg:` → `max-md`/`md:`）；② **D3 改判**（未提交、等他验）——窄屏"行内短名"作废，改**整列分组**（块头 ×1 + 四行「字段名+值」+ 块间一横线；四行 `max-md:contents` + `order` 归组）+ **列头胶囊整删**（`roleTag*` 两 key 删，三文件）；①后门禁 = `pnpm check` 净 + 前端全量 **243 文件 / 2630 例 / 0 失败** + 真浏览器两态复验全过；②门禁 = 触碰面 105/105 + `pnpm check` 净 + 真浏览器 700/1200 两态过（块头×2+单横线/宽屏零变化+胶囊消失）。代码 8 笔（`9fa80f6c`→`1ed3e24a`）+ docs 成对 `9c6e0d91` + 收官笔 + 断点笔 `96ea6b0b`。裁定：**D1 甲 / D2 甲（`md`=768）/ D3 改判（整列分组 + 胶囊乙整删）/ D4 甲 / D5 乙** + §7 五处；7.1 两个附加小点按默认做；重排文案（TEI 收窄）不进本对（他线）。
**Parent:** [2026-09-23-default-model-design.md](../specs/2026-09-23-default-model-design.md)（**同文件 `models-settings-page.tsx` ⇒ 串行**：本 plan Task 3 只加 1 个类名，与它的「默认模型」控件互不覆盖，开工时行号校准）· [2026-09-22-provider-grouping-design.md](../specs/2026-09-22-provider-grouping-design.md)（同表面、已交付；其切换行 `min-h-9` / 按钮 `sm` **原样保留**，本 plan 只在同行加 `flex-wrap`）。

**Architecture:** 八件事 —— **① 轨道收缩**（`ROW`/`ROW_PAIR` 的 `1fr` → `minmax(0,1fr)` + 三处 wrapper `min-w-0` + Select 调用点 override；spec §3.1）**② 窄屏堆叠**（`max-md:` 断点 = 视口 <768，D2 终值（交付后他裁 1024→768）：双值行拆「角色短名 + label + 值」两条、label 文案复用、表头行窄屏隐藏；spec §3.2）**③ 顶部行 `flex-wrap`**（`models-settings-page.tsx:141`，spec §3.3）**④ 知识库列表删 chevron**（`kb-list-panel.tsx` 两处）**⑤ 文档统计行分段 + 0 值隐藏**（`document-panel.tsx:1182-1190`）**⑥ 阈值徽章窄档隐藏**（`eval-tab.tsx:729-737`）**⑦ 历史下拉高度封顶**（`chat-panel.tsx:545-546`，`min(300px 级, 可用高)`；spec §7.4）**⑧ 提供商标签改值**（`zh-CN.ts:1704` → `OpenAI-compatible`；spec §7.5）。

**硬约束（spec 已裁，实现时不许自行放松）**：

- **D1 甲 + D2 甲 + D3 甲**：窄屏（**`max-md:` = 视口 <768px**，D2 阈值终值——交付后他裁 1024→768）双值行**堆叠**为「角色短名 + label + 值」× 2（label 同文案各一次；短名 = **表头 RoleHeading 的同一对现有词**（`F.embeddingModel` / `F.rerankModel`，审查已核），零新 i18n key）；宽屏（`md:` 以上）DOM 与视觉**一字不变**（断言与肉眼双验）。
- **D4 甲**：顶部切换行加 `flex-wrap`；**`min-h-9` 与按钮 `size="sm"` 不动**（grouping D5 裁定）。
- **D5 乙**：账号页 `:76` / 外观页 `:173` **一行不动**（只在 spec §1.2 登记）。
- **§7.1**：删 `kb-list-panel.tsx:108`（个人组）与 `:234`（共享组）的两处 `ChevronDown`；折叠行为（整行 button + `aria-expanded`）**不动**。默认含两个待裁小点（共享组同步删 / 标题 `whitespace-nowrap`）。
- **§7.2 = 甲**：统计行分两段（左体量 / 右状态计数 `ml-auto`），状态计数**复用列表状态列的圆点类与 `status.*` 词汇**、**0 值不渲染**；两段 `whitespace-nowrap` + 外层 `flex flex-wrap`。
- **§7.3 = 乙**：阈值徽章窄档（`useToolbarTier` tier 1）**不渲染**、宽档照旧；**不改图内虚线**（`eval-trend-chart.utils.ts` 零改动）。已知代价已登记（spec §6.5）。
- **§7.4**：历史下拉 ScrollArea 的 max-h 改 **`min(300px 级, 可用高)`**（他裁照默认；先例 `ui/command.tsx:90`）；保留"低视口不溢出屏幕"意图；条目上限/虚拟化**不做**。
- **§7.5 = 甲**：`providerOpenAIChat` 的 **zh 值**改 **`OpenAI-compatible`**（en 不动）；`providerDashscope` / `providerVolcengineArk` **不动**；**`providerGenericRerank`（「通用重排 (Cohere / Jina / TEI 形状)」）零触碰**——TEI 收窄已在他线 plan（他 2026-09-25 裁定）。
- **不动**：`ui/` 生成件（`select.tsx` / `input.tsx` / `toggle-group.tsx`）· 后端全部 · 字段 / payload / API · 对话模型面板 · 高级设置单列区的形态 · 宽屏"一行 label 管两列"信息结构 · i18n **零新 key、零改值**（§7.2 若走"复用 `status.*`"路线则只删 `stats*` 三个 key 的消费点，key 本体去留见 Task 0.7）。
- **用例只钉结构**（类名 / 显隐 / 文案原文 / `data-testid`），**不钉几何**；几何归 Task 5 真浏览器（`localhost:3000` 只读）。

**Global Constraints:**

- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits；§7 三处**各一笔**）。
- **前端命令**：`cd frontend && PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`；门禁 = `pnpm check` + `pnpm test`；**prettier 新债**只重排自己那几行（「新债行号交集法」）。
- **不起隔离实例**；Task 5 只驱动用户已在跑的 `:3000`、**只读**；不碰任何配置文件。
- **每个 Task 的 `**实测**` 行必须回填**（RED/GREEN/neuter 受害者/门禁数字）——未回写的 plan 不算交付。
- **scope fence**：账号 / 外观两处轻症（D5 乙）· Select 文本折行 · 图内虚线标注（7.3 的补救路，另议）· **重排提供商文案的 TEI 收窄（7.5 已裁不进，他线）** · 历史下拉的条目上限/虚拟化 · 弹窗壳 `settings-dialog.tsx`（spec §6.1 逃生口，验收实测仍外溢才动）· 断点阈值 768px 调参（spec §6.4）。

**依赖顺序**：Task 0（只读核实）→ Task 1（轨道收缩）→ Task 2（窄屏堆叠）→ Task 3（顶部行）→ Task 4（知识库三处，三笔）→ Task 5（真浏览器 + 文档 + 全量门禁收官）。

---

## Task 0 — 开工前七项核实（只读）

- [x] 1. **ROW / ROW_PAIR 的消费面**：`functional-models-view.tsx:160-161` 两个常量各被多少行引用（审查已核：ROW_PAIR 5 处 `:583/:589/:617/:635/:663`，ROW 在高级设置区多处）⇒ 复核报数；改常量一处生效全行，确认无别处复制同款类字符串。
- [x] 2. **D3 短名的 i18n 词**：RoleHeading（`:199`）在 `:583` 表头行的绑定——**审查已核**：label = `F.embeddingModel` / `F.rerankModel`、tag = `F.roleTagEmbedding` / `F.roleTagRerank`（「Embedding」/「Rerank」药丸）⇒ 复核即可、**堆叠短名复用同一对 key**（零新 key）。顺带确认 `kb-list-panel` 的 `personalKBs`/`sharedKBs`（`zh-CN.ts:412-413`，已核）现状。
- [x] 3. **wrapper 与 Select 调用点清单**：SecretInput 外层（`:270` 起 `cn("relative", className)` ⇒ `min-w-0` 走基类还是调用点 className，择一并报）· 稀疏地址 wrapper `:807` · SelectTrigger 调用点（初核 5 处：`OptionSelect :128` + 裸 `:876/:903/:932/:1084`）⇒ 逐处报"补在哪一行"。
- [x] 4. **会红断言扫描**（初扫三处，复核行号 + 补漏）：`kb-list-panel.dom.test.tsx:163-194`（svg 断言 / 整行折叠）· `document-panel.dom.test.tsx:601-619`（`document-stats-row` textContent）· `eval-tab.dom.test.tsx:275/:285-292`（标题文案 / `eval-threshold-chip`）；另扫 `functional-models-view.dom.test.tsx` / `models-settings-page.dom.test.tsx` 是否钉过行网格类名或列数（钉过 ⇒ 改钉新形态，报清单）。
- [x] 5. **堆叠挂点**：`:583` 表头行结构（RoleHeading×2 如何并排）与 `NESTED_GUTTER`（`:173`）在窄屏的堆叠归属 ⇒ 确认"表头行 `max-lg:hidden` + 短名下移"没有第三处重复词汇。
- [x] 6. **`useToolbarTier` 在 happy-dom 的默认档**：溢出判定（`scrollWidth > clientWidth`）在测试环境下恒不溢出 ⇒ tier 0；确认 §7.3 的两态用例如何钉（宽态断在、窄态靠 prop/纯函数注入还是 mock hook，给方案）。
- [x] 7. **§7.2 的 key 归并定案**：`statsReady/statsIndexing/statsFailed` vs `status.*` 双轨 ⇒ 二选一（推荐：渲染走 `status.*` 三 key、`stats*` 三 key 删（连 `types.ts` 声明）；若 `stats*` 还有别处消费则保留只换消费点）——`statsDocuments`/`statsChunks` 两 key **保留**（体量段继续用）。

**实测（2026-09-25，七项逐条）**：

- ① ✅ ROW_PAIR **5 处**（`:583/:589/:617/:635/:663`）；ROW **20 处**（`:722/:762/:777/:790/:805/:841/:868/:895/:923/:952/:976/:990/:1001/:1019/:1030/:1045/:1052/:1056/:1060/:1081`）；`grid-cols-[8rem_…` 类字面量只在 `:160-161` 两处 const ⇒ **改常量一处生效全行**，无复制粘贴副本。
- ② ✅ 无新发现（审查已销案）；短名词 = `F.embeddingModel` / `F.rerankModel`，药丸 = `F.roleTagEmbedding` / `F.roleTagRerank`。
- ③ ✅ **落点定案**：SecretInput 走**基类**——`:280` 改 `cn("relative min-w-0 w-full", className)`（4 个调用点 `:641/:653/:792/:1062` **都不传 className** ⇒ 基类一处全覆盖）；稀疏地址 wrapper `:807` 加 `min-w-0`；SelectTrigger **5 处**（`:128/:876/:903/:932/:1084`）`w-full` → `w-full min-w-0`。
- ④ ✅ **零既有类名钉**：`grid-cols|minmax|1fr|8rem|ROW_PAIR` 在 `functional-models-view.dom.test.tsx` / `models-settings-page.dom.test.tsx` / `settings/functional-models.dom.test.tsx` **0 命中** ⇒ Task 1/2 的钉全是新增。已知会红处（改形态时按 plan 对应条处理）：kb-list `:166`（svg 非空，图标供给 ⇒ 7.1 零红）/ `:177-194`（整行折叠，零红）；doc stats `:615` 只断**数字**（`3`/`4.0 KB`/`5`）⇒ key 归并与 0 值隐藏都不红既有断言；eval-tab `:275`（标题）/`:292`（`回退阈值 -3%` 原文）。
- ⑤ ✅ 表头行 = `<span /> + RoleHeading×2`（`:583-586`），整行走 `max-lg:hidden` 即可；`RowLabel`（`:176`）无第三处角色词汇；`NESTED_GUTTER`（`:173`）只是缩进壳，随断点堆叠无需单独处理。
- ⑥ ✅ **方案 = 照既有配方钉 `scrollWidth`**：`eval-tab.dom.test.tsx:458-488`（`Object.defineProperty(HTMLElement.prototype, "scrollWidth", …)` 模拟溢出 ⇒ tier 1；hook 注释自述"jsdom 无布局 ⇒ 恒 0 档，窄档用例钉 scrollWidth 模拟"）。宽态 = 默认不钉。
- ⑦ ✅ **定案（照推荐）**：状态计数渲染改走 `tk.status.*`（`zh-CN.ts:519-521`，zh 同词「就绪/索引中/失败」）；删 `statsReady/statsIndexing/statsFailed` 三 key（含 `types.ts` 声明——唯一消费点 `document-panel.tsx`）；`statsDocuments`/`statsChunks` 保留。

---

## Task 1 — 轨道收缩 + 子项 min-w-0（spec §3.1 / 根因①②）

> 动到的文件：`functional-models-view.tsx`（`:160-161` 两常量 + 3 处 wrapper + Select 调用点类名）、`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`（+1~2 条）。
> **验收对应**：spec §4 的 1 / 2 / 4。

- [x] **RED**：新断言（结构钉）：① 双值行的网格容器类含 `minmax(0, 1fr)` × 2（防被改回裸 `1fr`）；② SecretInput 外层与稀疏地址 wrapper 含 `min-w-0`。此刻未改实现 ⇒ 红。
- [x] **GREEN**：`ROW` → `grid-cols-[8rem_minmax(0,1fr)]`、`ROW_PAIR` → `grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]`（断点类是 Task 2 的事，此处先只换轨道）；3 处 wrapper 补 `min-w-0 w-full`（按 Task 0.3 择一落点）；Select 调用点 `w-full` 之外补 `min-w-0`。窄面转绿。
- [x] **neuter ①**：把 ROW_PAIR 改回 `1fr_1fr` ⇒ ① 红、② 绿（受害者不相交）。
- [x] **neuter ②**：去掉 SecretInput 的 `min-w-0` ⇒ ② 红、① 绿。
- [x] **还原证明** + **提交回归**：现有功能模型保存流程用例原样全绿（payload 一字不差）。
- [x] **门禁**：`pnpm check` 净 + 窄面绿；prettier 只动自己新写的行。

**实测（2026-09-25，Task 1 完成）**：

- **RED**：新 2 条 **2 红 / 7 绿**。⚠️ 首跑夹具有误（稀疏行默认锁着 ⇒ `sparseModel` 输入不存在），RED 夹具补 `embedding_sparse_source: "external"` 后红成立——是**测试夹具修正**不是实现变化，照实记。
- **GREEN**：轨道 + 3 wrapper（SecretInput 走**基类** `:280`、稀疏地址 `:807`、SelectTrigger 5 处 `w-full`→`w-full min-w-0`）⇒ **9/9 绿**。
- **neuter ①（ROW_PAIR 退 `1fr_1fr`）**：**① 红、② 绿** ⇒ 受害者 = {①}。
- **neuter ②（SecretInput 去 `min-w-0`）**：**② 红、① 绿** ⇒ 受害者 = {②}，与 ① 不相交。
- **还原证明**：复原后 **9/9 绿**；既有 7 条零改动零红（提交回归 = 同文件既有用例全绿）。
- **门禁**：`pnpm check`（eslint + tsc）净。⚠️ 一条 eslint 自纠：`as HTMLElement` 撞 `non-nullable-type-assertion-style` ⇒ 改 `closest<HTMLElement>(…)!`。**prettier**：触碰行按 hunk 重放（我的 3 行 SelectTrigger 超 80 列照 prettier 折行、类序按 tailwind 插件排）；残余差异 = **HEAD 既有债 4 处**（src `:124/:480/:483/:562` + 测试 `:148`），非本对行、未动。
- **提交**：`9fa80f6c`（本 Task 两文件 +63/−9）；docs 成对另笔 `9c6e0d91`。⚠️ 工作树有**别线未提交改动**（backend rag-retrieval 那批）⇒ 只 add 自己的文件。

---

## Task 2 — 窄屏堆叠（spec §3.2 / D1 甲 + D2 甲 + D3 甲）

> 动到的文件：`functional-models-view.tsx`（双值行 5 处 + 表头行 + 单值行 `ROW` + `NESTED_GUTTER` 区）、dom 用例（+2~3 条）。**零新 i18n key**（短名复用 Task 0.2 确认的那对）。

- [x] **RED**：新断言（结构钉）：① 每个双值行窄屏有两条堆叠单值（label 副本各一、`max-lg:` 显隐类成对：共享 RowLabel `max-lg:hidden` / 副本 `lg:hidden`）；② 堆叠行首角色短名 = 既有 `M.*`/`F.*` 值（断言原文「向量模型」/「重排模型」，防换词）；③ 表头行带 `max-lg:hidden`。
- [x] **GREEN**：按 spec §3.2 落 DOM（推荐：值格内嵌窄屏 label 副本 + 短名；`NESTED_GUTTER` 跟随同一断点；单值行窄屏 = label 在上、值在下）。**宽屏 DOM 断言复核一遍一字不变**（既有用例全绿 + 人工 diff 类名）。
- [x] **neuter ①**：去掉一处 label 副本的显隐类 ⇒ ① 红（宽屏出现双 label）、②③ 绿。
- [x] **neuter ②**：把一处短名换词 ⇒ ② 红、①③ 绿。
- [x] **neuter ③**：去掉表头行的 `max-lg:hidden` ⇒ ③ 红、①② 绿。
- [x] **还原证明** + **门禁**（`pnpm check` + 窄面 + 触碰面 `tests/unit/components/workspace/settings/` 全绿）。

**实测（2026-09-25，Task 2 完成）**：

- **RED**：新 3 条 **3 红 / 9 绿**。
- **GREEN**：`PairCell` 新组件（宽屏 `lg:contents` = 网格仍只见控件、宽屏布局零变化；窄屏 flex-col 出「短名 + label」行）+ `RowLabel` 加 `className` 通道 + 4 个双值行包裹（provider / model / api key / endpoint）+ 表头行 `max-lg:hidden` + `ROW`/`ROW_PAIR` 加 `max-lg:grid-cols-1`（gap-y 1/2）⇒ **12/12 绿**。
- **neuter ①（拆一处副本 `lg:hidden`）**：test1 红（显隐类断言）、②③ 绿 ⇒ 受害 = {①}。
- **neuter ②（model 行右格短名换词）**：test1 的**短名断言**红、③ 绿。⚠️ **①②同居 test1**：断言粒度不相交、用例粒度相交——plan 预测的"受害者不相交"按**断言粒度**成立，如实记。
- **neuter ③（拆表头 `max-lg:hidden`）**：仅 test3 红 ⇒ 受害 = {③}，与 ①② 不相交。
- **⚠️ 会红断言超出 Task 0.4 扫描（扫描方法缺口，记账）**：`tests/unit/settings/functional-models.dom.test.tsx` 两处**文本钉**被副本打红——(a) `:380` `getByText(F.embeddingModel)` 单一性 ⇒ 改钉 `{ selector: ".text-sm.font-semibold" }`（= 表头本身）；(b) **"label-once"规则钉**（AGENTS.md 记录的"一行 label 管两列、只写一次"）计数 1→3 ⇒ 改钉**宽屏可见**（过滤 `.lg:hidden` 子树），规则语义原样。Task 0.4 只扫了**类名**断言、漏了**文本计数**钉 ⇒ 同类任务先扫两者。
- **还原证明**：触碰面 `settings` 两目录 **144/144 绿**。**门禁**：`pnpm check` 净（tsc 一处自纠：`Array.from(row.children)` 解构改元组断言消 `possibly undefined`）。**prettier**：我的 2 行照输出重放；`functional-models.dom.test.tsx` 的 **25 处 hunk 与 HEAD 既有债同数同源**（零新增债，不动）。
- **提交**：`c6f3dd59`（3 文件 +221/−107）。

---

## Task 3 — 顶部切换行 `flex-wrap`（spec §3.3 / D4 甲）

> 动到的文件：`models-settings-page.tsx:141`（+1 类名）、其 dom 用例（+1 条）。**只加 `flex-wrap`，`min-h-9` / 按钮 `sm` / 可见性逻辑一字不动。**

- [x] **RED**：断言切换行（`models-settings-page.dom.test.tsx`，先例 = grouping D5 那条"按钮与切换器同一父元素"）含 `flex-wrap`。
- [x] **GREEN**：`:141` 行加 `flex-wrap`。
- [x] **neuter**：去掉 ⇒ 红（revert proof）。
- [x] **门禁** + 与 default-model 线的行号校准（同文件，若其未提交改动在树上，只动自己那一行）。

**实测（2026-09-25，Task 3 完成）**：RED **1 红 / 16 绿**（新钉 `flex-wrap`，锚 = `toggle.parentElement?.className`）→ GREEN **17/17** → neuter **仅新钉红**（revert proof）→ 还原 17/17。门禁 `pnpm check` 净；prettier 源文件**零 hunk**、测试文件 hunk 全在改动区外（既有债未动）。default-model 线同文件无未提交改动冲突。**提交 `4d46ae3f`**（2 文件 +11/−1）。

**实测**：（回填）

---

## Task 4 — 知识库页四处 + 提供商文案（spec §7；**五笔提交**）

> 动到的文件：`kb-list-panel.tsx` / `document-panel.tsx` / `eval-tab.tsx` / `chat-panel.tsx` / `zh-CN.ts`（1 行）+ 四个对应 dom 用例文件。与 Task 1–3 的重叠仅 `zh-CN.ts`（Task 2 **零 i18n 改值** ⇒ 无冲突）。

### 4a — §7.1 删 chevron（一笔）

- [x] 删 `kb-list-panel.tsx:108`（个人组）与 `:234`（共享组）的 `ChevronDown`（按钮块 `:97-114` / `:225-240`；含 import 收尾）；折叠 button / `aria-expanded` **不动**；两个待裁小点按默认做：共享组同步删 + 标题文字 `whitespace-nowrap`。
- [x] **验证**：`kb-list-panel.dom.test.tsx` 全绿（初判零红——`:166` 的 svg 由 UserRound/Users 提供、`:177-194` 断整行 button）；若 Task 0.4 扫出钉 svg **数量**的断言则按新形态改并记账。

### 4b — §7.2 统计行分段 + 0 值隐藏（一笔）

- [x] **RED**：按新形态先改/写断言：① 左段「文档/切片/大小」与右段状态计数分属两个容器（右段 `ml-auto`）；② **0 值不出现在 textContent**（夹具给 `inProgress: 0` 断"索引中"不出现；给 `failed: 2` 断出现 + 圆点类）；③ 状态计数圆点 = 列表同款 `STATUS_DOT_CLASS` 类。
- [x] **GREEN**：重写 `document-panel.tsx:1182-1190`（`flex flex-wrap` + 两段 `whitespace-nowrap`；0 值条件渲染；按 Task 0.7 的 key 归并定案接 `status.*` 词汇）。
- [x] **neuter ①**：0 值无条件渲染 ⇒ ② 红、①③ 绿。**neuter ②**：换个圆点类 ⇒ ③ 红、①② 绿。
- [x] **还原证明** + 门禁窄面。

### 4c — §7.3 徽章窄档隐藏（一笔）

- [x] **RED**：两态断言（方案按 Task 0.6）：tier 0 徽章在（既有 `:285-292` 保留原文断言）/ tier 1 **不渲染**。⚠️ 既有断言 `getByText("指标趋势")`（`:275`）不得动。
- [x] **GREEN**：`eval-tab.tsx:729-737` 的 Badge 按 tier 条件渲染；`eval-trend-chart.utils.ts` **零改动**（图内虚线不动）。
- [x] **neuter**：去掉条件 ⇒ 窄态断言红（revert proof）。
- [x] **门禁**。

### 4d — §7.4 历史下拉高度封顶（一笔）

- [x] **RED**：`chat-panel.dom.test.tsx`（`:210-224` 一带）加一条结构钉：ScrollArea 的 max-h 类含**固定封顶**（`min(` 形态），不钉具体像素几何。此刻未改 ⇒ 红。
- [x] **GREEN**：`chat-panel.tsx:545-546` 的 ScrollArea max-h 改 `min(300px 级, calc(var(--radix-dropdown-menu-content-available-height) - 0.5rem))`；`:540-544` 注释同步（上限=封顶与可用高取小）。
- [x] **neuter**：去掉封顶 ⇒ 红（revert proof）。
- [x] **门禁**。

### 4e — §7.5 提供商标签改值（一笔）

- [x] `zh-CN.ts:1704` `providerOpenAIChat`：「OpenAI 兼容」→ **`OpenAI-compatible`**（en `:1798` 不动）；**其余 `PROVIDER_LABELS` 值一字不动**（含 `providerGenericRerank`，他线）。
- [x] **验证**：零断言改动实证（grep `frontend/tests` 无原文「OpenAI 兼容」命中，Task 0 如有则报）+ 门禁。
- [x] 4a–4e 五笔各自 Conventional Commit。

**实测（2026-09-25，4a–4e 五笔）**：

- **4a（`1ad603c6`）**：两处 ChevronDown 删（`:108`/`:234`）+ import 收尾 + 两按钮 `whitespace-nowrap`（待裁小点按默认做）⇒ `kb-list-panel.dom` **13/13 零红**（预测成立：`:166` svg 由图标供给）。
- **4b（`7a4d6ddb`，5 文件）**：RED **1 红 / 67 绿** → GREEN **68/68**（两段 flex-wrap、右段 `ml-auto`、`STATUS_DOT_CLASS` 圆点、0 值静默、词汇走 `tk.status.*`）→ neuter ①（0 值无条件）**② 红**、②（去圆点类）**③ 红**（②③同 test、断言粒度不相交）→ 还原 68/68。key 归并照 0.7：删 `statsReady/statsIndexing/statsFailed` 三 key × 三文件（zh/en/types），`statsDocuments/statsChunks` 保留；tsc 对称约束过。prettier：我的 2 处重放（其余 hunk 与 HEAD 同数=既有债）。
- **4c（`241f3b6e`）**：RED **1 红 / 58 绿**（scrollWidth 配方钉 tier 1）→ GREEN **59/59**（Badge 挂 `toolbarTier === 0`）→ neuter 仅新钉红 → 还原。prettier：测试文件我的行零命中 diff；`eval-tab.tsx` 我的行整块落在既有债区（HEAD 同 22 hunk）⇒ 照"不动格式债文件"留。
- **4d（`713ec448`）**：RED **1 红 / 27 绿** → GREEN **28/28**（`max-h-[min(300px,calc(…-0.5rem))]` + 注释同步）→ neuter 仅新钉红 → 还原。prettier 我的行零命中 diff。
- **4e（`1ed3e24a`）**：zh `providerOpenAIChat` → `OpenAI-compatible`（en 不动）。零断言实证：tests 里「OpenAI 兼容」原文命中仅 `thinkingShapeGateway` 值（**另一 key、不属本格**）⇒ 本格零断言；`functional-models` 73/73 + `pnpm check` 净；prettier 8=8（HEAD 既有债同数）。

---

## Task 5 — 真浏览器手验 + 文档 + 全量门禁收官

> 只读驱动 `localhost:3000`（`/workspace/chats/new?settings=models` 深链直开设置 + `/workspace/knowledge`）；不保存、不碰配置。

- [x] **spec §4 验收 8 五条**（几何，拖窗口/分栏）：(a) 输入框随栏宽压缩、同行不挤扁；(b) 「检索」卡与弹窗内无横向溢出；(c) 断点以下（视口 <1024）两列堆叠、每框满宽、行首短名在、表头收起；(d) 顶部切换栏不出外框、极窄换行；(e) 来回拖断点两侧行高不抖。
- [x] **§7 观感五条**：kb 列表组标题单行无箭头（「个人知识库」不折行）；统计行窄栏整段换行段内不断、0 值不显示；趋势卡窄档无红徽章且「指标趋势」不被压；历史下拉封顶约 10 条可见、其余滚动（不再拉满全屏）；向量提供商下拉三项标签 =「阿里百炼 (DashScope) / 火山方舟 (Ark) / OpenAI-compatible」。
- [x] **文档**：`frontend/AGENTS.md` 的 functional-view 段补一句（宽屏一行 label 管两列 / 窄屏 `max-lg` 堆叠、短名复用列首词）；spec 的 `**Status:**` 改「已交付」并回填实测摘要。
- [x] **全量门禁**：`pnpm check` 净 + 前端全量 **0 失败**（记录文件/例数）；`git diff` 不含 `backend/`。

**实测（2026-09-25，Task 5 收官）**：

- **真浏览器（他起栈的 :3000、已登录；主窗 633px 窄 + 同源隐藏 iframe 造 800/1200 两档对照；全程 evaluate_script 只读）**：
  - **验收 8**：(a) ✓ 宽 1200 = 3 轨、值格 ~469px、同行不挤；(b) ✓ 行/卡/弹窗 `scrollWidth-clientWidth` **全 0**（633/800/1200 三档）；(c) ✓ 633/800 = 单轨堆叠、`inputFillsRow = 1.0`、行首短名「向量模型 Model ID」在、表头行 `display:none`、gutter 收起；宽 1200 = 3 轨、PairCell `display:contents`、副本 `display:none`（**宽屏零变化**）；(d) ✓ 顶部行 `flex-wrap` 类在、堆叠后零溢出；(e) ✓ 静态三读行高恒 **145px**（动态拖拽手感他顺手拖一下即可——纯 CSS 断点、无过渡逻辑）。
  - **§7 五条**：① ✓ 组标题「个人知识库」单行 88×20px、`whitespace-nowrap`、svg 各 1（仅 UserRound/Users，chevron 无）；② ✓ 统计行两段（右段 `ml-auto`）、当前库「索引中 0」**静默**、「就绪 6 / 失败 4」带圆点；③ ✓ **两态闭环**——宽 1200 tier 0：徽章「回退阈值 -3%」可见 + 内联粒度组；窄 633 tier 1：徽章退场、粒度收 ⋯（snapshot 证实）；④ ✓ 历史下拉 computed `max-height: 300px`（min() 取小正确），菜单高 169（3 条、内容低于封顶）；⑤ ✓ 向量提供商触发器 = **`OpenAI-compatible`**（4e 生效），重排标签原样（fence ✓）。
- **全量门禁**：`pnpm check` 净（逐笔 + 收官复跑）；前端全量 **243 文件 / 2630 例 / 0 失败**（2m19s；较基线 +11 例 = 本对新钉）；`git diff` 无 `backend/`。
- **⚠️ 一处操作记录**：Radix Tabs/菜单不吃合成 `.click()`，合成 `KeyboardEvent Enter` 与 `PointerEvent pointerdown` 可驱动（与既有配方一致）；keep-alive 面板有隐藏副本 ⇒ 量几何必须按 `getClientRects().length > 0` 过滤可见实例。

**实测**：（回填）
