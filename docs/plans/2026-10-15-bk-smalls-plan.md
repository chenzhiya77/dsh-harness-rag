# 面板 B–K 余项 · ① 小件批（14 行全量） —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-15-bk-smalls-spec.md](../specs/2026-10-15-bk-smalls-spec.md)（14 行范围＋D1–D3＋验收）
**Status:** ✅ 收官（2026-10-15 他令「①全要，攒一批照 A 对规格立对」；10-16 全交付：Task 0–8 全毕、八组真跑全过）—— **D1＝甲／D2＝甲／D3＝甲（10-15 他拍「全甲」）**；Task 0 已毕（10-15，十格全核，零「停下待裁」）；Task 1 已毕（10-15 真跑过〔他手点〕；提交 `9a36851`）；Task 2 已毕（10-15 真跑过〔含宿主遮罩定性，他拍甲＝潜伏层保留〕；提交 `bc63781`）；Task 4 已毕（10-16 真跑过〔他手点〕；提交 `1be7c93`）；Task 5 已毕（10-16 真跑过〔他手点〕；提交 `433d440`）；Task 6 已毕（10-16 真跑过〔他手点「task6,7都测试过了」〕；提交 `3ea0355`）；Task 7 已毕（10-16 真跑过〔他手点〕；提交 `729b795`）；Task 3 已毕（10-16 真跑过〔他手点「task3,8测试过了」〕；提交 `492f205`）；Task 8 已毕（10-16 真跑过〔他手点〕；提交 `687c214`）；Task 9 收口已落（10-16：门禁汇总＋销定〔T3 plan B–K 审计节补销＋E1③ 勘误〕＋账齐；八组真跑全过、代码九笔齐）；＋定稿一笔（本对 spec/plan＋T3 plan 补销＋步骤记录同步）；全部未推（仓暂无 remote）。
**Parent:** T3 plan（[2026-10-12-t3-panel-plan.md](2026-10-12-t3-panel-plan.md)）B–K 组审计走查账；档位表＝会话（10-15 我建议／他圈「①全要」）；前置对＝A 对（[2026-10-15-a-items-plan.md](2026-10-15-a-items-plan.md)，已收官）。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** 14 行全在面板面（`client.js`），按面分组八 Task：**文档面**（搜索/排序/拖拽反馈/空态/失败卡/六腿分解）／**切片面**（抽屉三件＋富切片卡两件）／**召回面**（wiki 锚定/变形小件/段控＋迷你图）／**百科面**（导航钮/血缘注记）。形态与逻辑底本＝工作台对应件（照抄口径、代码不搬）；**host 半预期零改**（缺字段/缺路由停下待裁）。

**硬约束（spec 已定，不许自行放松）**：

- **照工作台**（承 T3）：逐件以工作台对应件为底本；形态创新一律登记。
- **D 决定**：D1（召回段控＋迷你图）/D2（失败卡落位）/D3（排序承载）——**全甲已拍（10-15）**，对应 Task 解锁（Task 7 照甲；Task 3 照甲；Task 1 排序段照甲）。
- **数据缝（承 T3）**：零新 op 为预期；Task 0 逐件核实（`path_status` 透传、召回 trace 够不够迷你图）；缺→停下待裁。
- **桌面端铁律**：改 `client.js` 验收须整重启（模块代体检法）。
- **scope fence（本对不做）**：②档（列体系/视频播放器/渲染切换/切片编辑重抽/我的条目管理面）· ③档（批量版/行双入口/白名单兜底/F·G·H 精简项）——维持挂账。

**Global Constraints:**

- 分支：插件仓（dsh-harness-rag）；每 Task 落地随手提交（英文 Conventional）；deer-flow 零代码。
- **每 Task 的 `**实测**` 行必须回填**（探针输出/真跑结论/提交哈希）。
- **插件侧验证**（同 A 对口径，有意不做单测）：`node --check`＋冒烟回归（仓外 `client-load-check.mjs`）＋桌面端整重启真跑。
- 宿主件优先：新控件/浮卡若能直用宿主 `primitives` 则直用（照菜单对 Task 6 口径）；宿主无件者照工作台复刻。

**依赖顺序**：Task 0（只读核实）→ Task 1（文档面·搜索＋排序）→ Task 2（拖拽反馈＋空态）→ Task 4（六腿分解）→ Task 5（抽屉三件）→ Task 6（富切片卡两件）→ Task 8（百科面两件）→ Task 3（失败卡，候 D2）、Task 7（召回面，候 D1）可穿插；Task 9 收口（门禁＋销定＋提交链）。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点（八组行锚＋数据缝）＋ D1–D3 判据。

- [x] ① **文档面双核**：`document-view.ts::filterDocuments/sortDocuments` 实读（过滤口径/排序键/升降）；插件文档行现状（工具栏位/表头有无）；
- [x] ② **拖拽反馈链**：`probeDraggedItems` 点亮/降灰/落区横幅机制实读；插件 Task 7 已落拦截链复核（补哪段）；
- [x] ③ **空态九宫格**：工作台空态组件实读（九格/拒项降灰/点击行为）；我方白名单口径对照；
- [x] ④ **失败卡双件**：`doc-failure-panel.tsx`＋`use-doc-failure-notifier.ts` 逐条实读（D2 判据＋面板容纳性）；插件现有失败面出口盘点；
- [x] ⑤ **六腿分解**：`path-status.ts` 六腿映射实读；插件 `listDocuments` 响应**是否带 `path_status`**（缺→停下待裁）；
- [x] ⑥ **抽屉三件**：`chunk-drawer.tsx:445-489`（徽章族/↑↓）／`:177-182`（轮询条件）实读；插件抽屉 focus/滚动定位现状；
- [x] ⑦ **富切片卡两件**：`chunk-card.tsx:223-243`（实体徽章 cap6+N）／`:249-264`（tokens/已编辑）实读；插件卡片字段面核对；
- [x] ⑧ **召回面四核**：wiki 锚定 `:233-253/367-406`；变形五处（折叠/档色/悬浮/右键/气泡）行锚；段控 `:224-226`；**迷你图数据缝**（`recall-graph-mini.tsx` 数据源 vs 插件 `recallTest` trace/实体数据——够不够，缺→停下）；
- [x] ⑨ **百科面两件**：`wiki-entry-drawer.tsx:99-109`（导航钮）＋血缘注记 `:174-178` 实读；插件条目抽屉现状；
- [x] ⑩ **D3 排序承载核实**：工作台承载位（表头级?）与可移植性——物理不可达即停下待裁。

**实测**（Task 0，2026-10-15，十格全核；零「停下待裁」）：

- ①**文档面双核**：`filterDocuments`＝trim＋小写包含（纯客户端）；`sortDocuments`＝键 `created_at/name/size_bytes/chunk_count`，**null 恒沉底不随方向**，字符串 localeCompare、数字差；默认 `{created_at, desc}`；`SORT_OPTIONS`＝4 键（标签 createdAt/name/size/chunks）＋分隔线＋asc/desc 两枚（Check 显隐）。**承载位实核＝工具栏 h-11**（搜索框 `Input h-7 flex-1` 左挂 Search 图标、右挂 X 清空；排序＝`size-7` ghost 钮 `ArrowUpDown` → `DropdownMenu w-40`）——**非表头级**（spec D3 甲行文「表头级」猜测作废；「照工作台」＝工具栏收纳，与插件现有形态天然合拍）。插件落点＝文档段新增工具行（现无）。
- ②**拖拽反馈链**：`probeDraggedItems(items, supportedSuffixes)`（`file-type-badge.tsx:464`）＝file 项 MIME→`specForMime`→后缀∈白名单 判 `litKinds/anyAccepted/anyRejected`（非 file 忽略、未知 MIME 计拒）；`probeSignature` 去重（dragover 高频只重渲变化）。根 `dragActive→bg-muted/40`；**overlay 双态**（空库＝border-only 虚线框＋底部提示胶囊〔全拒换 `dropUnsupported` 文案〕；非空库＝`bg-background/70` 居中胶囊 `dropToUpload`）；定位上下文＝内容区（不包工具栏）。插件 Task 7 已落 root 拦截链——本件补：probe 计算＋双态 overlay＋文案（`dataTransfer.items` 现成）。
- ③**空态九宫格**：`EMPTY_STATE_SAMPLES` 9 名（report.pdf/notes.docx/data.xlsx/deck.pptx/app.py/photo.png/video.mp4/bundle.zip/`readme` 无后缀落 unknown 软收尾）；分布 `grid-cols-3 gap-3 size-8`；静态＝`opacity-60`＋hover 上浮全彩；拖入＝lit `scale-125` 全彩、其余（或全拒时全部）`opacity-25`；短文案一句。插件白名单＝op `supportedSuffixes`（菜单对已接）——九格全展示、可拒类降灰照工作台。
- ④**失败卡双件**：`doc-failure-panel.tsx` 全读——定位＝**面板根 `absolute right-3 bottom-3 z-20 w-80 max-w-[calc(100%-1.5rem)]`**（**D2 甲「面板内右下角」原生成立**，窄档有 max-w 兜底）；`bg-white`/`dark:bg-black`＋`shadow-lg`；单条＝CircleAlert＋两行体（名/因各 truncate）＋retry＋✕；多条＝「标题（N）」＋**主体悬停展开（✕ 永不触发）**＋清单 `max-h-40` ScrollArea＋逐条 retry/✕；mouseleave 收起；**无定时器（不自动消退）**。`use-doc-failure-notifier.ts` 全读——首屏预标（不回放历史）→ 新 failed 播报（notified set 去重）→ 离 failed 撤条＋清标记（重试后再报）；`report(name, reason)`＝上传即拒（rejection-N 临时键、retryable false）。插件现状出口＝行状态/重试钮 title（分类文案，A 对 D2 已改）＋上传即拒走 Toast——落地后照工作台收编进卡。
- ⑤**六腿分解**：`path-status.ts` 全读——videoLegs（asr/segment/caption 按 payload 有无键）前置＋vector/graph/wiki；graph 索引中合成 `percent`（「图谱 索引中 87%」）；`path_status` 空＝null 不出悬停。渲染 `PathStatusBreakdown`（`:133-172`）：左腿名（wiki 带库级提示）/右状态文案；degraded 琥珀（amber-600/dark:500）。**数据缝：插件文档行已带 `path_status`**（`client.js:2001` degraded 检测、`:5832` wiki generating 两处先例）⇒ **零新 op ✓**。
- ⑥**抽屉三件**：头部（`:441-493`）＝sticky 头（`bg-background/95 backdrop-blur border-b`）单行：FileTypeBadge size-5＋标题 truncate＋Badge「切片」＋Badge「N 片」＋Badge「当前 #K」（outline tabular，total>0 才现）＋右 `↑↓` size-7 ghost（边界禁、title/aria 同词）＋sr-only 复述。轮询（`:170-182`）＝`refetchInterval`：reExtracting 或任一 chunk `extract_status==='pending'` → 3000，否则 false；enabled=open。位置感（`:313-340`）＝active＝越过视口上 **35% 带**的最后一张卡、rAF 节流；`jumpTo` 越界守卫＋未加载先扩 limit（`pendingJumpRef`、PAGE_SIZE 对齐）→ `scrollToIndex`（头顶高+8、smooth、闪环 1.2s）；focus 跳＝`focusedIdRef` 守卫（与插件 A 对同款）。插件落点＝ChunkDrawer（已有刻度轨）补头部徽章行＋↑↓＋active 跟随＋pending 轮询（插件无 re-extract 源——轮询条件取 pending 主项）。
- ⑦**富切片卡两件**：`ENTITY_CAP=6`（`:15`）——「实体：」＋badges（`text-[10px]` secondary）＋「+N」outline 钮（`title`＝余名列表、点击展开；`visibleEntities`＝展开全量/截 6）；页脚（`:244-264`）＝`border-t` 分层：「P n」＋「N tokens」（非空才渲）＋「已编辑」Badge（`last_edited_at` 非空）＋操作钮（C2④，不在批）。**数据缝：`chunk.entities/token_count/last_edited_at` 同 chunks 端点行**（`chunk-drawer.tsx:549/554/564` 实读）⇒ 插件同端点 ⇒ 字段在 payload，零新 op ✓。
- ⑧**召回面四核**：wiki 锚定（`:233-253`）＝勾＝源切片**整体**进（path='wiki'、已选不重）／全在＝整体撤；无 `source_chunk_ids`＝不可勾选；manual 卡＝仅计 selection 不锚定。段控（`:222-226`＋`:580-615`）＝图谱路标题栏右挂 pill（`bg-muted/60 p-0.5`）两枚 10px 钮（证据 N/实体 N）；active＝`bg-card shadow-xs`；实体钮 entities+relations===0 禁；实体视图＝`RecallGraphMini` **占满容器不进 ScrollArea**。变形五处：三路可折叠（**整栏点击收起、无 chevron**；收起＝只留标题行）／耗时档色（`ELAPSED_RANK_CLASSES` 三色 绿·lime·橙 按**跨路排名**）／存为考题栏悬浮（`absolute inset-x-0 bottom-3 z-10` 居中胶囊、pointer-events 双档）／命中行右键＝勾选（`:131/:381` ContextMenu）／位次气泡（`:148` Tooltip「切片 #K」）。迷你图（`recall-graph-mini.tsx`）＝props `{entities, relations}`（当次召回子图）；echarts graph＋`typeColor` 稳定按 type＋全画布 roam＋节点拖＋节点 tooltip 带 description/边标签带关系名＋label 档位随 zoom；无 LOD/叠加/搜索。**数据缝：插件 recallTest graph 段 payload＝entities/evidence/message/relations（T2 已透传）＋Task 7 力场内核/标签档现成** ⇒ 组件级低本移植 ✓。
- ⑨**百科面两件**：导航钮（`:99-109`）＝头行右侧 outline sm 钮 `ExternalLink`＋「在 tab 中查看」（entry 在才渲；page 层承接＝切百科 tab＋选中该条目）。删除注记（`:155-178`）＝血缘展开后 `sourceIds.length > 已取回切片数` → 灰色小字「{缺} 个来源已删除」；血缘行本体＝rich ChunkCard（工作台；插件现简行——本件只做注记）。插件落点＝条目抽屉加二件（source 总数 vs 取回数差额可算）。
- ⑩**D3 承载位**：并入①——工具栏 h-11 原样可移植（表头级猜测作废）；**D3 甲落定无疑**。

---

## Task 1 — 文档面·搜索＋排序

> 动到的文件：`client.js`（文档段；界面文案落内联 zh/en 字典）。
> **验收对应**：spec §1-1＋§4.1（搜索/排序两条）。

- [x] **搜索框**（B1a）：名称过滤＋清空钮（口径照 `filterDocuments`）；
- [x] **排序菜单**（B1b，**候 D3 拍**）：createdAt/name/size/chunks × asc/desc（口径照 `sortDocuments`）；
- [x] **门禁**：`node --check`＋冒烟（过滤/排序纯函数用例）＋整重启真跑。

**实测**（Task 1，2026-10-15，真跑过（他手点）；提交 `9a36851`，140+/1−）：

- **搜索框**：`docsFilter`（trim＋小写包含）＋宿主 `Input` 直用（`icon` 前置宿主 `IconSearchOutlineRegular`；回退原生 input 时不传 icon）；清空钮（宿主 `IconCloseOutlineRegular`）仅检索词非空现；无匹配＝「没有匹配的文档」态。
- **排序菜单**：宿主 `Menu` 直用——label 行（读 `entry.text`）＋四键＋separator＋升序/降序；选中＝前导勾（空槽保对齐，等效工作台 invisible Check）；默认 `created_at desc`；`docsSort` null 恒沉底不随方向。
- **两处有意差异**（宿主件优先）：排序钮图标＝宿主 `IconChevronsUpDownOutlineRegular`（宿主无 ArrowUpDown 件；工作台底本用 lucide ArrowUpDown）；搜索框高走宿主 32px（工作台 h-7＝28px）。检索词随库切换保留（工作台同态，未加重置）。
- **门禁**：`node --check` 过；冒烟钉纯函数 12 例（过滤 4／排序 7〔含 null 沉底两向〕／原数组不可变 1）＋ DocsView SSR 渲染块（工具栏就位／占位文案／默认最新在前／过滤增删）；整重启真跑＝搜索/清空/排序菜单 均过。

---

## Task 2 — 拖拽反馈＋文档空态

> 动到的文件：`client.js`（拖拽链＋文档空态；界面文案落内联 zh/en 字典）。
> **验收对应**：spec §1-2＋§4.1（拖拽/空态两条）。

- [x] **拖拽反馈**（B1e）：可落区点亮/全拒降灰/落区横幅（照 `probeDraggedItems`；复用 Task 7 拦截链）；
- [x] **空态九宫格**：九格＋我方白名单拒绝项降灰（口径照工作台空态件）；
- [x] **门禁**：`node --check`＋冒烟（判型/降灰纯函数用例）＋整重启真跑。

**实测**（Task 2，2026-10-15，真跑过（他手点）；提交 `bc63781`，302+/67−）：

- **拖拽反馈链**（零新 op）：根拖入＝淡灰底＋判词探针——`DRAG_MIME_SPECS` 照工作台 `file-type-badge.tsx` 全表移植（pdf/word/sheet/ppt/code/archive＋image\*/audio\*/video\* 前缀族；白名单后缀匹配、大小写不敏感＝与上传拦截同口径；未知 MIME 计拒、非 file 项忽略）；`probeSignature` 指纹去重（dragover 高频只重渲变化）；拖离「真离面板」才复位（子元素穿梭不震荡；不 stopPropagation，宿主计数照 T7 注释零变化）。
- **放置层双态**：空库＝虚线框＋底缘胶囊（全拒换「该格式暂不支持」）；非空库＝70% 实底＋中央胶囊；文案逐字照工作台。反馈仅在「有库＋就绪」时亮（无库落下＝先建库 toast，照既有）。
- **空态九宫格**：9 枚样本逐名照工作台（`readme` 落 unknown 软收尾）；静态半透＋悬停上浮全彩；拖入＝可落类放大点亮、其余降灰、全拒全灰；文案「上传或拖拽文件开始构建索引」（替换原「暂无文档」，工作台逐字）。
- **宿主遮罩注记（10-15 实测定性，他拍甲）**：宿主全窗拖拽遮罩覆盖面板反馈——拖拽中的呈现（tint／框／胶囊／九宫格判词态）不可达；实现保留为遮罩下潜伏层（宿主遮罩变化时零改动重现），落点行为与结果 toast 照常。spec §4.1 该句已加注。
- **两处顺带（明标）**：① 工具行改常驻——空态也渲染（工作台 h-11 稳定容器语义；加载/错误态维持全屏状态页），Task 1 结构同源对齐；② 放置层锚定＝面板根全幅（工作台＝其内容区不包工具栏——插件面板整体即落区）。
- **门禁**：`node --check` 过；冒烟钉拖拽探针块 15 断言（判型全表／未知 MIME 计拒／非 file 忽略／混合判词／指纹三态）＋空态渲染三态（九枚／点亮-降灰计数／全拒全灰）；整重启真跑＝反馈链/空态九宫格/落点上传 均过（含遮罩定性）。

---

## Task 3 — 失败详情卡（候 D2 拍）

> 动到的文件：`client.js`（失败面；界面文案落内联 zh/en 字典）。
> **验收对应**：spec §1-3＋§4.1（失败卡条）。

- [x] **落卡**（按 D2 拍定形态）：底右卡／顶部横卡；双行截断＋悬停展开＋逐条 ✕＋重试钮＋不自动消退；
- [x] **notifier 语义**：仅入 failed 播报/首屏不补播/episode 去重/重试后再报/离 failed 撤条/上传即拒收编；
- [x] **门禁**：`node --check`＋冒烟（episode 去重/撤条纯函数用例）＋整重启真跑。

**实测**（Task 3，2026-10-16，真跑过（他手点「task3,8测试过了」）；提交 `492f205`，181+/21−）：
- **形态（D2 甲）**：`DocFailureCard` 底右浮卡（320px、right/bottom 12、包含块＝`hrag-root`）——双行制（名/因各一行截断）、悬停展开（感应区＝摘要区、不含 ✕/重试）、逐条 ✕、单条 retryable 头行带重试、不自动消退；图标直用宿主族（Warning/Refresh/Close 三枚；闭钮缺件回退 '✕' 字）。
- **语义**：fold 状态机在壳（照工作台 page 层 notifier）；纯函数 `foldDocFailures`＝首屏预标记不补播／仅入 failed 转变播报／episode 去重／离 failed 或删行撤条／重试后再 failed 重报；快照仅在 ready/empty 阶段上报（loading 期空数组不预标记）；`rejection-N` 收编＝上传请求失败与重试请求失败（不走 toast）；白名单预拒 toast 维持工作台同款不动；失败明细不再进上传汇总 toast（照工作台）。
- **门禁**：`node --check`＋冒烟两块新增（fold 12 断言＋卡三态渲染：空/单条/多条折叠）全绿。

---

## Task 4 — 状态六腿悬停分解（B3）

> 动到的文件：`client.js`（文档状态列）。
> **验收对应**：spec §1-4＋§4.1（六腿条）。

- [x] **悬停分解**：asr/segment/caption＋vector/graph/wiki 六腿（口径照 `path-status.ts`；图谱中段百分比合入「图谱 索引中 87%」；wiki 带库级提示）；
- [x] **门禁**：`node --check`＋冒烟（六腿映射纯函数用例）＋整重启真跑。

**实测**（Task 4，2026-10-16，真跑过（他手点，复「测过了」）；提交 `1be7c93`，148+/11−）：
- **实现面**：字典 14 键（zh/en 逐字照工作台）；`pathStatusLines`（视频腿 presence 前置、图谱仅 `indexing && doc.status==='indexing'` 带 `percent`、无 `path_status` 返 null）＋`docPathStateLabel`（未知态回原串）＋`PathStatusBreakdown`（degraded 着 `--dsw-static-amber-500`）；docrow 三分支＝failed 裸 span（分类错误文案留 title）／`HostTooltip` 包裹（side `top`、delayMs 150、portal）／无宿主件铺平原生 title（缺件回退面）。
- **门禁**：`node --check`＋冒烟三块（映射 11 断言＋渲染＋Tooltip 载体随 `path_status` 出现/消失）全绿。
- **补修（2026-10-18，他真跑两轮点名）**：①**失败行也挂六腿分解**——原实现 failed 行跳过分解（只给原生 title）；他明确要「图 1 的状态框、不要重试卡」⇒ `pathLines` 对 failed 行照算、状态格走宿主 Tooltip 六腿分解（首版误做 HoverCard 重试卡已撤；重试仍在右下失败卡＋行 ⋯ 菜单）。②**错误 token 修正**——宿主主题**无** `--dsw-alias-label-error` 定义（只有 `--dsw-alias-state-error-primary`）⇒ 失败文字不红、状态点背景透明不可见；插件 22 处全部替换。另做全量比对：插件用到的 31 个 `--dsw-*` token 对宿主主题 403 项定义**零缺失**。冒烟更新（failed 行 Tooltip 载体／状态点存在／错 token 清零＋正确 token）；`node --check`＋默认/缺件二跑全绿。随 chunk-items 对定稿一笔落地。

---

## Task 5 — 切片抽屉三件（C1①④⑤）

> 动到的文件：`client.js`（抽屉段）。
> **验收对应**：spec §1-5＋§4.1（抽屉三件条）。

- [x] **头部徽章族＋↑↓**：类型徽章/总数/当前 #N/上一·下一（跳片复用 `focusedIdRef` 通路，握手中不退回状态守卫）；
- [x] **条件轮询**：抽取 pending 时 3s 条件轮询（谓词同源；无重抽在飞源可裁减——Task 0 核实后按实况）；
- [x] **滚动位置感**：「当前 #K」随滚动跟随（1/3 带 active 口径）；
- [x] **门禁**：`node --check`＋冒烟（位次/徽章纯函数用例）＋整重启真跑。

**实测**（Task 5，2026-10-16，真跑过（他手点「5测试过了」）；提交 `433d440`，87+/3−）：
- **徽章族（照工作台头行）**：类型徽章（FileTypeBadge 20px S 档）＋标题＋软底徽章「切片预览」＋「N 个切片」（tabular-nums）＋「当前 #K」（total>0 才现）；跳片钮＝26px 幽灵（与关闭钮同格），边界禁（active≤0／active≥total−1）、title/aria 同词（上一切片/下一切片）；图标＝宿主 `IconChevronUp/DownOutlineRegular`（回退＝下行镜像 lucide 路径）。跳片走既有 `jumpTo` 通路（未加载目标先扩 limit、pending effect 续跳；`focusedIdRef` 持久 ref 守卫不动）；focus 握手命中时同步 `setActiveIndex`（smooth 落定前头部即显正确位次，照工作台 :298）。
- **条件轮询**：新常量 `CHUNK_POLL_MS=3000`＋纯函数 `hasPendingExtraction`（谓词＝任一 chunk `extract_status==='pending'`；Task 0 已核该字段随 chunks 端点行透传；插件无重抽在飞源＝②档裁减）；谓词布尔进 deps——节拍不被每次回包重置；phase ready 才武装。**顺带（明标）**：`load` catch 改为「有数据即静默保留」（react-query refetch 语义——轮询/refreshToken 后台刷新失败不再把列表打回错误整页；无数据失败面不变）。
- **门禁**：`node --check` 过；冒烟新增两块——`hasPendingExtraction` 6 断言（空/全落定/任一 pending/failed 算落定/缺字段/null）＋ChunkDrawer happy-dom 真挂载（徽章族三片全对〔切片预览/5 个切片/当前 #5〕、跳片钮边界禁用、点「上一」闪环落第 4 片且 1.2s 自清、全 done 不轮询〔1.5s 只 1 次加载〕、转 pending 轮询武装〔节拍拨 60ms〕、全落定自停）全绿；既有 focus hand-off 块无回归。

---

## Task 6 — 富切片卡两件（C2②③）

> 动到的文件：`client.js`（切片卡段）。
> **验收对应**：spec §1-6＋§4.1（徽章两条）。

- [x] **实体徽章**：cap 6＋+N 展开（照 `:223-243`）；
- [x] **tokens＋已编辑徽章**：照 `:249-264`（字段面 Task 0 核过）；
- [x] **门禁**：`node --check`＋冒烟（截断/徽章纯函数用例）＋整重启真跑。

**实测**（Task 6，2026-10-16，真跑过（他手点「task6,7都测试过了」）；提交 `3ea0355`，76+/0−）：
- **实体徽章（C2②）**：纯函数 `entityBadges`（展开全量／未展开截 `ENTITY_CAP=6`／hidden 计数）＋行内渲染照工作台 :223-243——`实体:` 标签＋软底 textchip 徽章（Task 5 词汇）＋`+N` 裸底 chip 钮（`title` 列余名 `entities.slice(6).join(', ')`，展开后消失）；展开集＝抽屉按 chunk_id 的 Set（工作台为每卡自治 state，插件行内联渲染故由抽屉统持），切文档清空；无实体不渲。
- **页脚度量（C2③）**：border-t 分隔行——tokens 计数（`N tokens`）＋「已编辑」textchip（`last_edited_at` 非空）；两者皆无则不加分隔线。**口径注**：工作台该行还含页码——插件页码已在顶行 chip 位（A⑫ 既有），本件不搬、不重复。
- **门禁**：`node --check` 过；冒烟两块——`entityBadges` 6 断言（空/null／短表／恰 6 无 +N／8 截 6 报 2／展开全量）＋happy-dom 真挂载（cap 6 且保序、`+2` 钮含 title 余名、点击展开全量且 +N 消失、光板行无实体行无页脚、`120 tokens`＋已编辑徽章）全绿。

---

## Task 7 — 召回面（候 D1 拍）

> 动到的文件：`client.js`（召回三段卡）。
> **验收对应**：spec §1-7＋§4.1（锚定/变形/段控三条）。

- [x] **wiki 行勾选锚定**（D1①）：词条＝源切片整体进/出锚定集、manual 卡仅记路径不锚定、无源切片禁用；
- [x] **段控＋迷你图**（D1②＋D2；**按 D1 拍定**）：图谱路「证据↔实体」段控；实体视图＝内嵌力导向迷你图（照 `recall-graph-mini`）；
- [x] **变形小件**：三路可折叠／耗时排名档色／存为考题栏悬浮／命中行右键勾选／「切片 #K」气泡；
- [x] **门禁**：`node --check`＋冒烟（锚定集/档色纯函数用例）＋整重启真跑。

**实测**（Task 7，2026-10-16，真跑过（他手点「task6,7都测试过了」）；提交 `729b795`，696+/141−）：
- **wiki 锚定（D1①）**：勾选描述子统一三行（`{checked,label,onToggle,disabled}`）——词条行＝源切片**整体**进/出锚定集（Map 去重、path=wiki；全在＝整体撤）；manual 卡＝`selectedCards` 记路径（贡献 wiki 路径与计数、**不进锚定集**；行挂 `wikiAnchorTooltip`）；无 `source_chunk_ids` 词条勾选禁；右键（行容器级 preventDefault）＝切换、禁用/不可锚定行不动作；提交面＝`selectionCount`（切片＋卡片）、`defaultPaths`＝路径并集（卡片记 wiki）；跑题清双集。
- **段控＋迷你图（D1②）**：图谱路头行挂证据↔实体段控（10px 两枚、active 白底阴影；实体钮 entities+relations 空时禁）；实体视图＝新组件 `RecallGraphMini`（当次召回子图）——**力场内核与大图共用**（新提取 `graphForceStep`：弹簧/重力/斥力/Verlet 逐公式原样，参数注入；迷你 repulsion 140）；`graphTypeColor` 按 type 稳定取色；全画布 roam（滚轮缩放锚光标 0.3–3＋拖拽平移）；节点可拖（钉住＋warmUp＋解钉 pp 同步）；节点 tooltip（名＋描述，vec-tip 词汇）；边＝源节点色/弧 0.12/箭头 6/边标签＝关系名（9px）；节点名与边标签 zoom<0.6 同隐（只判 hidden 档——迷你语义）；无 LOD/叠加/搜索。
- **变形小件**：①三路可折叠——左簇（名＋分数语义芯片）即 toggle、无 chevron，收起类只留头行（head 撤底边），sections/rows 加 flex:1＋行区内滚（三路均分、收起让位；原为内容高堆叠）；②耗时档色——跨路去重排序下标、同值共享快档；**色板换算登记**：宿主静态色板无 lime/orange ⇒ 最近邻三档 绿500→amber400→amber500（黄→橙热力序），缺席/非数走中性档；③存为考题栏改悬浮——结果区 relative 容器＋absolute 底中、pointer-events 双档、胶囊（底 95%＋模糊＋阴影）、不占三路流；④命中行右键勾选（同锚定语义）；⑤「切片 #K」气泡＝HostTooltip 包裹（`chunk_position` 已核后端 `_inject_chunk_positions` 注 vector hits＋graph evidence；缺件回退行原生 title；wiki 行无此气泡）。
- **门禁**：`node --check` 过；冒烟两块——`elapsedRankClass` 6 断言（三档/同值共享/缺席中性）＋happy-dom 全链真挂载（档色三类落 chip、位次气泡仅带 position 行、词条勾选整体锚定〔计数 2＋vector 行同步点亮〕、卡片计数 3 不扰锚定、右键整撤〔共享锚定同步释放〕、禁用行右键不动作、段控两钮计数与实体视图挂 canvas/行区让位、折叠类与展开回环、悬浮栏胶囊）全绿；既有 RecallView SSR 四块（wiki routing/full-shape/save-dialog/red-block）无回归。

---

## Task 8 — 百科面两件（E1①③）

> 动到的文件：`client.js`（条目抽屉）。
> **验收对应**：spec §1-8＋§4.1（导航钮/注记两条）。

- [x] **导航钮**：「在 tab 中查看」一键进管理视图（照 `:99-109`）；
- [x] **血缘注记**：展开血缘行「N 个来源已删除」注记（照 `:174-178`）；
- [x] **门禁**：`node --check`＋冒烟（注记切断纯函数用例）＋整重启真跑。

**实测**（Task 8，2026-10-16，真跑过（他手点「task3,8测试过了」）；提交 `687c214`，30+/1−）：
- **导航钮（E1①）**：条目抽屉头行右侧 outline 小钮——插件词汇 `hrag-btn-sm`（26px）＋`hrag-drawer-reveal`；图标＝宿主最近邻 `IconRightUpOutlineRegular`（右上箭头＝跳转语义；缺件回退工作台原形 lucide ExternalLink 手刻路径）；文案「在百科 tab 中查看」（zh/en 逐字照工作台）；`entry && onRevealInTab` 才渲；壳侧接线＝切百科 tab＋关抽屉（照工作台 `revealWikiEntry`——列表未分页、切过去即可见；不清筛选，工作台同）。
- **血缘注记（E1③）＝实核已落，非本件新增**：展开血缘后的差额注记（`sourceIds.length > 已取回数` → 「{缺} 个源切片已删除」）自 `0007c03`（百科视图＋双抽屉笔）即在插件，条件与措辞同工作台 `:174-178`；既有冒烟已钉（'1 个源切片已删除'）。⇒ 本件代码仅导航钮一项。
- **门禁**：`node --check` 过；冒烟——既有块补两断言（无回调不渲／断言无该文案）＋新块（有回调现「在百科 tab 中查看」＋钩子类）全绿；血缘注记既有断言（含差额行）仍在绿。

---

## Task 9 — 收口（门禁汇总＋销定＋提交链）

> 动到的文件：本对两件（spec/plan）＋T3 plan（审计节补销）＋步骤记录。
> **验收对应**：spec §4.3／§4.4。

- [x] **门禁汇总**：`node --check`＋冒烟全量绿＋八组真跑结论齐；
- [x] **销定**：T3 plan 审计节对应行补销（B1a/b/e、B2、B3、C1①④⑤、C2②③、D1①②、D2、E1①③）；步骤记录同步；
- [x] **提交链**：本对各笔滚动记实（英文 Conventional）＋定稿一笔。

**实测**（Task 9，2026-10-16；八组真跑全过；代码九笔已落；定稿笔＝本提交）：
- **门禁汇总**：`node --check` 过；冒烟全量绿（`ALL CLIENT SMOKE CHECKS PASSED`——本批新增八块：抽屉谓词＋挂载、卡纯函数＋挂载、档色＋召回全链、导航钮；既有块〔含 RecallView SSR 四块／focus hand-off／刻度轨〕零回归）；Task 1–8 各实测行齐（真跑结论：Task 1–8 全过）。
- **销定**：T3 plan B–K 审计节逐行补销——B1a/b/e、B2（含归属建议「与 ⑤ 合对」不再需要）、B3-path-status、C1①④⑤、C2②③、D1①②＋变形①–⑤、D2、E1① 各注「已实施（10-15/16，小件批）」；**勘误一处**：E1③「插件无删除注记」实核作废（`0007c03` 起注记已落、条件/措辞同工作台——本件零代码）；D1⑥微项／C1②维持既有销定，各行未波及处一字未动；步骤记录 Status 行同步（Task 0–8 已毕＋销定已落＋E1③勘误）。
- **提交链**：已落九笔——`9a36851`（Task 1）／`bc63781`（Task 2）／`1be7c93`（Task 4）／`864f15c`（spinner 插队）／`433d440`（Task 5）／`3ea0355`（Task 6）／`729b795`（Task 7）／`492f205`（Task 3）／`687c214`（Task 8）＋定稿一笔（本对 spec/plan＋T3 plan 补销＋步骤记录同步，即本笔）。**全部未推**（仓暂无 remote）。
- **真跑清单（交批，逐件他手点；10-16 全过）**：Task 3＝造一条失败文档看出卡/单条重试/多条折叠/手动关闭不自动消退；Task 5＝抽屉头行徽章族与↑↓跳动、抽 done→「无缝」、滚动头部「当前 #K」跟随；Task 6＝实体徽章 +N 展开、tokens/已编辑行；Task 7＝wiki 行勾选（含共享锚定同步）、右键勾选、证据↔实体段控与迷你图（拖拽/缩放/悬停）、三路折叠、耗时档色、勾选浮出悬浮栏、命中行气泡；Task 8＝条目抽屉「在百科 tab 中查看」一键跳（含血缘注记顺手核）。

---

## 提交链（滚动记实）

- [x] Task 1 笔：`9a36851` feat(panel): add the doc toolbar search and sort（140+/1−）
- [x] Task 2 笔：`bc63781` feat(panel): add the drag feedback and the empty-doc nine-grid（302+/67−）
- [x] Task 4 笔：`1be7c93` feat(panel): add the six-leg path status breakdown on hover（148+/11−）
- [x] spinner 插队笔：`864f15c` fix(panel): swap the busy spinners to the host StateDot（10+/6−；宿主件修复，非本对 Task）
- [x] Task 5 笔：`433d440` feat(panel): add the chunk drawer head badges, nav and conditional poll（87+/3−）
- [x] Task 6 笔：`3ea0355` feat(panel): add the entity badges and footer meta to the chunk cards（76+/0−）
- [x] Task 7 笔：`729b795` feat(panel): anchor wiki rows wholesale and rebuild the recall face（696+/141−）
- [x] Task 3 笔：`492f205` feat(panel): add the doc failure card and the fold notifier（181+/21−）
- [x] Task 8 笔：`687c214` feat(panel): add the wiki tab nav to the entry drawer（30+/1−）
- [x] 定稿笔：`docs(panel): close the bk-smalls pair with the backfill sweep`（本对 spec/plan＋T3 plan 补销＋步骤记录同步；代码九笔已落）。**全部未推**（仓暂无 remote）。
