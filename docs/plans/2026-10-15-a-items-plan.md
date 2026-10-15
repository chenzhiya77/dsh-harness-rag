# 面板 A 档余项六件 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-15-a-items-spec.md](../specs/2026-10-15-a-items-spec.md)（六件范围＋D1–D4＋验收）
**Status:** ✅ 收官（2026-10-15 全交付：Task 0–5 全毕；六件真跑全过；**D1＝乙（10-15 更裁「换，用我的九枚」）／D2＝甲／D3＝甲／D4＝甲丙（Task 1 真跑补）**）——Task 1–4 代码四笔已提交（`241c770`／`6a1ee19`／`184f43a`／`c2e3449`）＋定稿一笔（本对 spec/plan＋销定＋步骤记录同步）；全部未推（仓暂无 remote）。
**Parent:** T3 plan（[2026-10-12-t3-panel-plan.md](2026-10-12-t3-panel-plan.md)）「A 组终裁（10-14 他拍）」行；菜单对 spec（[2026-10-14-menu-model-settings-spec.md](../specs/2026-10-14-menu-model-settings-spec.md)）§6 缺口表六行；步骤记录：[2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** 六件全在面板面（`client.js`），四个落点：**文档行**（⑪ 类型图标＋⑤ 分类文案＋④ 右键出题）／**切片抽屉**（⑫ 刻度轨）／**tab 行**（⑦ 溢出降级）／**库下拉**（排序拖拽）。形态与逻辑底本＝工作台对应件（照抄口径、代码不搬）；④ 复用既有 `triggerSynthesis`（count=1）；排序＝localStorage 持久（承 `kb-order` 语义、插件前缀键）；**无后端新面预期**（缺路由停下待裁）。

**硬约束（spec 已裁或承 T3，不许自行放松）**：

- **照工作台**（承 T3）：六件逐件以工作台对应件为底本（⑪＝工作台九类复刻，见 D1 更裁）；形态创新一律登记。
- **D 全拍（10-15）**：D1＝乙／D2＝甲／D3＝甲／D4＝甲丙（Task 1 真跑补）——「未拍段不动」约束解除。
- **数据缝（承 T3）**：面板不直连后端；零新 op 预期；缺路由停下待裁。
- **⑫ 不得复改 focus 通路语义**：跳片复用 10-15 修后的 `focusedIdRef` ref 守卫，不得退回状态守卫（1.2s 拉回缺陷）。
- **桌面端铁律**：改 `client.js` 验收须整重启（模块代体检法）。

**Global Constraints:**

- 分支：插件仓（dsh-harness-rag）；每 Task 落地随手提交（英文 Conventional）；deer-flow 零代码。
- **每 Task 的 `**实测**` 行必须回填**（探针输出/真跑结论/提交哈希）。
- **插件侧验证**（同 T3 口径，有意不做单测）：`node --check`＋冒烟回归（仓外 `client-load-check.mjs`）＋桌面端整重启真跑。
- **scope fence（本对不做）**：B–K 组审计余项（B1 搜索/排序菜单/列体系、B2 失败详情面板、C1 徽章族/播放器、C2 编辑/重抽、E2 卡片 CRUD/抽屉体系等）· 菜单对已盖面。

**依赖顺序**：Task 0（只读核实）→ Task 1（文档行三件）→ Task 2（⑫ 刻度轨）→ Task 3（⑦ tab 溢出）→ Task 4（库排序，**D3 拍后**）→ Task 5（收口：门禁＋销定＋提交链）。Task 1–3 可按序连做、各自真跑；Task 4 与前三无依赖、候 D3。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点（六件行锚＋宿主面）＋ D3 判据。

- [x] ① **⑪ 双面实读**：工作台 `file-type-badge` 判型表/九类/未知后缀兜底；宿主 `FileTypeIcon`＋`classifyFileType` API（导出面/入参/返回面）——D1 判据；
- [x] ② **⑤ 两核**：工作台 `doc-errors.ts` 八类映射实读（分类名/文案键/兜底类）；插件外露点复核（`client.js:5388`／`:5420`）＋失败态全出口盘点——D2 判据；
- [x] ③ **④ 链路实读**：工作台 `onGenerateQuestion`（count=1 语义/反馈/toast/在飞禁用）；插件 `triggerSynthesis` 现状（参数面/反馈面）；
- [x] ④ **⑫ 参数实读**：工作台 `chunk-tick-rail`（门槛≥5／间距 26／悬停标签层／点击跳片联动）；插件切片抽屉落点（focus 通路＋右缘空间）；
- [x] ⑤ **⑦ 逻辑实读**：工作台 `tab-strip.tsx` 折叠（固定折点/遮罩下拉/激活滚入 clamp/尾垫）；插件 tab 行现状（flex-wrap 平铺行）；
- [x] ⑥ **排序双核**：工作台 `kb-order.ts`（key/拖拽语义/clamp/回退）；宿主 `Menu` 内 DnD 可行性（事件冒泡/菜单关闭行为）＋插件库下拉现状——D3 判据。

**实测**（Task 0，2026-10-15，六格全核；D1／D2 已拍甲）：

- ①**⑪ 双面**：工作台 `file-type-badge.tsx`＝九类（pdf/word/ppt/sheet/code/image/media/archive/unknown）＋`KIND_BY_SUFFIX` 判型表＋全内联 56-grid SVG（无外部件）；宿主 `classifyFileType(path, context)`（`primitives/lib/index.js:6207`：代码名规则→`NAME_TYPES`→`EXTENSION_TYPES`→`"other"` 兜底）＋`FileTypeIcon`（`:6409` 起，入参 `path` 或 `kind` 两式）。**档差（当时按甲登记）**：库内实际可入类型上——`.md`＝宿主 markdown（蓝）vs 工作台 code（青）；`.txt`＝宿主 other（灰）vs 工作台 word（蓝）；`.csv/.xlsx`＝excel vs sheet（同族异名）。（**10-15 更裁乙：此档差作废**——⑪ 改走工作台九类复刻。）
- ②**⑤ 两核**：`doc-errors.ts` 八类（empty/unsupported/retryLimit/serviceUnconfigured/timeout/indexIncomplete/noIndexableContent/unknown；模式序、大小写不敏感、两枚中文终态串优位）；工作台渲染点＝失败指示器 HoverCard（`document-panel.tsx:322-344`，友好文案＋重试钮）。插件外露点＝`:5394`（重试钮 `title`＝`doc.error` 原串）＋`:5426`（状态 `title` 同）——D2 甲（全隐）拍定后两处改分类文案。
- ③**④ 链路**：工作台＝`onGenerateQuestion`（`app/workspace/knowledge/page.tsx:452-466`）→ `triggerSynthesis({doc_ids, count:1})`；enqueued→success toast（`stk.generating`）、already_running→info toast、catch→error toast；停留文档页。插件 op 现成＝`client.js:7807` `callOp('triggerSynthesis', { kb_id, body:{doc_ids, count} })`＋`showToast` 总线；入口＝文档行 `onContextMenu`（题库行 `:7290` 先例）。
- ④**⑫ 参数**：`chunk-tick-rail.tsx` 全参——`MIN_TICKS=5`／`TICK_GAP=26`／`TICK_HIT=16`／`VISIBLE_TICKS=11`；`tickRange` 纯函数（窗口夹取）；悬停意图 150ms 开／200ms 关（跨缝宽限）；标签层 w-72、行高＝26 与刻度 1:1、其滚动驱动共享窗口偏移；刻度列 `mask-image` 上下渐隐、`(i−base)·26−frac·26` 定位、active 加宽（w-3.5）；点击→`onJump(index)`。插件落点＝`ChunkDrawer`（`hrag-drawer` 右缘 absolute 叠加、不入滚动流）＋跳片复用 `focusedIdRef` 通路。
- ⑤**⑦ 逻辑**：`tab-strip.tsx`——`MASK_WIDTH=40` 固定、`computeFoldCount` 纯函数；每渲染量一次＋ResizeObserver 兜宽变；遮罩条件＝任一 tab end＞栏宽（**不用 `scrollWidth`**——尾垫会把它撑大）；下拉内容＝`tabs.slice(foldCount)`（固定折点，滚动永不改成员）；激活滚入「有效可见区」＝栏宽−遮罩宽（`:68` 注释先例）；尾垫 w-10 仅溢出时渲染；六 trigger 永不移出 DOM。插件现状＝`.hrag-tabs` `flex-wrap` 换行（`client.js:1349`）——改造落点＝`SECTIONS.map` 段（`:12046`）。
- ⑥**排序双核**：`kb-order.ts`——键 `deerflow.knowledge.kb-order.v1`（localStorage、设计即本地）；`ordered()`＝存量按用户序在前、新库尾随服务端序；`commitMove(source, target)`＝source 拼入 target 槽位＋持久（异常静默、内存态兜底）。宿主 Menu 事实：`MenuItemButton` 根＝真 `<button role="menuitem">`（**嵌套钮非法 ⇒「行内位移钮」出局**）；菜单关闭＝仅外点 pointerdown／Esc／选中（`closeOnPointerLeave` 默认 false）⇒ 菜单内拖拽期间不会被关；primitives 零拖拽件（`draggable` 0 命中）⇒ 拖拽源须自绘（label 内 `draggable` span）。插件落点＝库下拉 `DshMenu`（`:11957-11971`，items＝`kbs.map`）；插件侧键拟 `hrag-kb-order`（照 `hrag-last-kb` 先例）。

---

## Task 1 — 文档行三件（⑪ 类型图标＋⑤ docErrors＋④ 右键出题）

> 动到的文件：`client.js`（文档行段）＋`locale/{zh,en}.json`。
> **验收对应**：spec §4.1（⑪⑤④ 三条）＋ §4.2。

- [x] **⑪ 类型图标**（D1＝乙）：文档行左侧＝工作台九类徽章整件移植（`file-type-badge.tsx` 几何原样＋`KIND_BY_SUFFIX`＋`fileSuffix`）；未知后缀走 unknown 兜底；
- [x] **⑤ 分类文案**（D2 拍后）：照 `doc-errors.ts` 八类映射表移植＋失败态 title 外露收敛（按 D2 拍）；
- [x] **④ 右键出题**：文档行右键菜单（宿主 `DshMenu` 承载）→ `triggerSynthesis`（count=1）＋成功/失败 toast 反馈＋在飞禁用；**10-15 真跑补（D4 甲丙）**：菜单门槛＝仅就绪（照工作台）＋错误面解包（`errorDetail` 对齐工作台）；
- [x] **门禁**：`node --check`＋冒烟（新增映射表纯函数用例）＋整重启真跑（他手点）。

**实测**（Task 1，2026-10-15，三件真跑过（他手点）；提交 `241c770`，248+/4−）：

- ⑪**九类徽章**：`FileTypeBadge` 整件移植（九类 56-grid 内联 SVG＋`KIND_BY_SUFFIX`＋`fileSuffix`）；冒烟钉 13 例（9 类＋后缀大小写/无后缀/未映射兜底）、SSR 56-grid/unknown 兜底两渲染。
- ⑤**分类文案**：`classifyDocError` 八类（两枚中文终态串优位）10 例；两处外露点（重试钮 `title`／状态 `title`）改分类文案，原始英文零出口（D2 甲）。
- ④**右键出题**：行右键 → `DshMenu`（指针位代理锚）→ `triggerSynthesis` count=1 → toast；门槛 `canGenerateQuestion` 3 例＋`errorDetail` 解包 5 例（D4 甲丙，真跑当场两缺陷修）。
- **在飞禁用未落**：底本工作台同函数无此态（菜单选中即关、already_running 走同文案 toast），照底本不补（本行内该词作废）。
- **门禁**：`node --check` 过；冒烟全绿；整重启真跑＝⑪⑤④ 三件均过（含 D4 修复复验）。

---

## Task 2 — 切片抽屉刻度轨（⑫）

> 动到的文件：`client.js`（切片抽屉段）。
> **验收对应**：spec §4.1-⑫＋ §4.2。

- [x] **落轨**：照 `chunk-tick-rail` 逐参（≥5 门槛／间距 26／悬停标签层／末片对齐）挂抽屉右缘（窄档隐藏条件照工作台——底本亦无隐藏条件）；**10-15 首轮真跑修**：弹窗底改 `--dsw-alias-bg-base` 实底（撤半透明＋背板模糊）；
- [x] **跳片联动**：点击刻点→复用 focus 通路（`focusedIdRef` ref 守卫语义不动）；
- [x] **门禁**：`node --check`＋冒烟（刻度几何纯函数用例）＋整重启真跑。

**实测**（Task 2，2026-10-15，真跑过（他手点）；提交 `6a1ee19`，268+/8−）：

- **落轨**：`ChunkTickRail` 整件移植——门槛 ≥5／间距 26／热区 16／可见槽 11；悬停意图 150ms 开、200ms 关（跨缝宽限）；窗口夹取 `tickRange`；悬停标签层行高与刻度 1:1、其滚动驱动同一窗口偏移。挂抽屉右缘 `.hrag-drawer-panel` 绝对层（不入滚动流）。
- **跳片联动**：点击刻点/标签行 → `flashAndCenter`（与 focus 通路共用原语）；`focusedIdRef` ref 守卫未动——既有 happy-dom 单跳+闪环交接用例复跑绿。
- **首轮真跑修**：弹窗「有点透明」→ 实底令牌复验过。
- **门禁**：`node --check` 过；冒烟钉 `tickRange` 7 例＋SSR 两态（<5 不渲染、aria 逐条、active 加宽）；整重启真跑＝跳片/悬停标签/低切片不出现 均过。

---

## Task 3 — tab 行溢出降级（⑦）

> 动到的文件：`client.js`（tab 行段）。
> **验收对应**：spec §4.1-⑦＋ §4.2。

- [x] **折叠**：照工作台口径（固定折点＋遮罩下拉）——窄档放不下的 tab 折入下拉；
- [x] **滚入＋尾垫**：激活项滚入有效可见区（避右缘遮罩——照 `tab-strip.tsx:68` 先例）＋尾垫；
- [x] **两档对照**：宽档零行为变化（原平铺行维持）；
- [x] **门禁**：`node --check`＋冒烟（折叠边界纯函数用例）＋整重启真跑（宽/窄两档）。

**实测**（Task 3，2026-10-15，真跑过（他手点）；提交 `184f43a`，134+/20−）：

- **折叠**：`computeFoldCount`（照 `tab-strip.utils` 逐参：溢出才减遮罩宽、前缀夹取）＋`TabsStrip`（固定折点——下拉成员只随宽度变；六枚 tab 永在行内 DOM）；遮罩＝右缘 40px 渐隐（宿主 `bg-base` 70% 混合，箭头悬停现身）；下拉走宿主 `DshMenu`（当前分区带勾）。
- **滚入＋尾垫**：激活项滚入有效可见区（栏宽−遮罩宽，避右缘遮罩；含从下拉切回同一路径）；尾垫 40px 仅溢出时渲染。
- **两档对照**：宽档零行为变化——底缘发丝线改 inset 阴影＋1px 下垫（滚动容器防裁），激活下划线仍压在发丝线上，宽档逐位同观感；窄档＝折入下拉。
- **门禁**：`node --check` 过；冒烟钉纯函数 7 例＋happy-dom 三档（宽档零遮罩／窄档遮罩+尾垫+折点成员恰为尾巴三枚／从下拉切折片滚入 540−(300−40)=280／回宽撤除、再窄回成员不随滚动变）；真浏览器几何核（探针页 `tabs-geom-check.html`：遮罩 40×26 贴右缘、宿主 Menu 根 span 压平零高、下划线 y=+25.5 命中按钮、尾垫恰 40px）；整重启真跑＝宽/窄两档过。

---

## Task 4 — 库排序拖拽（D3 拍后）

> 动到的文件：`client.js`（库下拉段）。
> **验收对应**：spec §4.1-库排序＋ §4.2。

- [x] **形态落码**（D3 拍定）：按甲（下拉内拖拽）或乙（位移钮）执行；
- [x] **持久**：localStorage 插件前缀键（照 `kb-order` 语义：越界 clamp／失效回退）；与「上次打开记忆」共存；
- [x] **门禁**：`node --check`＋冒烟（排序纯函数用例：重排/clamp/持久往返）＋整重启真跑（重开保持）。

**实测**（Task 4，2026-10-15，真跑过（他手点）；提交 `c2e3449`，124+/1−）：

- **形态落码**（D3＝甲，「先 spike 再全量」）：探针页 `kb-drag-spike.html`（宿主菜单行真值复刻：`Menu.module.css` 34px 行／6·8 内边距／itemLabel flex:1）＋拟移植算法，真 Chromium 实拖两轮全绿——拖拽起于行内自绘 span／跨行两次各自当场挪槽且重排后拖拽不中断／全程菜单未关、无选中误触／存储往返＋重开读回（另核宿主源码：外点关闭只听 `pointerdown`、行渲 `entry.label` 直作 ReactNode 子树）。落码＝拖拽源＝行 label 内自绘 `draggable` span（宿主菜单件零改）＋窗口级 `dragover` 委托（`elementFromPoint`→`closest('button')`→`data-kbid` 读行身份）；跨行即挪槽、同行去重；`drop` 只落地、`dragend` 清态；空闲态无光标改色（照工作台）。
- **持久**：键 `hrag-kb-order`（照 `hrag-last-kb` 先例）；`kbOrderApply`（存量按用户序在前、新库尾随服务端序）＋`kbOrderCommit`（source 拼入 target 槽位；无效 id／同位原样返回）；越界（幽灵 id）丢弃、坏值／非数组静默回退；与「上次打开记忆」键位分离共存。
- **收窄报备**：按 spec「本件只补排序」——选库回退仍走服务端首件（工作台为「用户序首件」），未动；要对齐工作台一行事。
- **门禁**：`node --check` 过；冒烟钉 8 例纯函数（空存储保服务端序／存量领先新库尾随／幽灵 id 丢弃／上·下拖槽位／同位·缺源·缺靶 no-op）＋存储往返 3 例（往返保数组／非数组回退／垃圾回退）＋happy-dom 拖拽委托三连（跨行一次／同行去重／dragend 清态）；整重启真跑＝四项过。

---

## Task 5 — 收口（门禁汇总＋销定＋提交链）

> 动到的文件：本对两件（spec/plan）＋菜单对 spec（§6 销定）＋T3 plan（审计节补销）。
> **验收对应**：spec §4.3／§4.4。

- [x] **门禁汇总**：`node --check`＋冒烟全量绿＋六件真跑结论齐；
- [x] **销定**：菜单对 spec §6 六行改「已实施（10-15，本对）」；T3 plan 审计节对应行补销；
- [x] **提交链**：本对各笔滚动记实（英文 Conventional）＋步骤记录同步。

**实测**（Task 5，2026-10-15）：

- **门禁汇总**：`node --check` 过；冒烟全量绿（`ALL CLIENT SMOKE CHECKS PASSED`，A 批五组新用例在内）＋t-param 审计过；六件真跑结论齐（Task 1–4 各实测行）。
- **销定**：菜单对 spec §6 六行销定＝「已实施（10-15，A 对）」；顺带修同表两处陈旧行（A②→已实施（10-14，菜单对 Task 8）；面板拖拽上传→已实施（10-14，菜单对 Task 7））＋宿主件候选行 A⑪ 标注（首拍甲散去、更裁乙）；T3 plan 审计节 A 组终裁行补销（乙档余项全清）；菜单对 plan scope fence 行补注（10-15 全开转正）。
- **提交链**：Task 1–4 代码四笔已提交＋定稿一笔（本对 spec/plan＋销定＋步骤记录同步）；旁项账（上次打开记忆/建库入口/文档下载/A② 重复上传）见菜单对。

---

## 提交链（滚动记实）

- [x] Task 1 笔：`241c770` feat(panel): add the doc-row file badge, error copy and quick-question menu（248+/4−）
- [x] Task 2 笔：`6a1ee19` feat(panel): add the chunk tick rail to the chunk drawer（268+/8−）
- [x] Task 3 笔：`184f43a` feat(panel): fold the tab-row overflow into a mask dropdown（134+/20−）
- [x] Task 4 笔：`c2e3449` feat(panel): add the kb dropdown drag reorder with local persistence（124+/1−）
- [x] 定稿笔：`docs(panel): close the a-items pair with the settle-in sweep`（本对 spec/plan＋菜单对 §6 销定＋T3 plan 补销＋步骤记录同步）。**全部未推**（仓暂无 remote）。
