# 文档文件夹（本地分组） Plan

**Spec:** [2026-10-22-doc-folders-spec.md](../specs/2026-10-22-doc-folders-spec.md)
**Status:** 实现完成·真栈主路径通过（2026-10-22；归属落点已拍＝本地 localStorage；D4 已拍甲——名称表头排序/组行收起，不引入全局收起；未分类定甲＝可收起；P1/P2 已补齐；D1–D3/D5 已按建议落改；Task 0–4 已实现并回填实测，Task 5 静态门禁过、真栈 1–8 主路径过；暗色/上传/切库等残项见 Task 5；10-22 追加：未分类补 ⋯/右键；篇数整段移除、原位置改为悬浮组全选框；去掉下拉箭头改点文件夹图标切换；10-22 追加二：文件夹图标与表头全选框同列、组名与「名称」表头同列，空文件夹也渲染禁用态组全选框；10-22 追加三：去掉组行分割线、文件夹图标改收起线条/展开蓝色实心两态、跨组拖行＝移动；10-22 追加四：未分类可重命名（本地 `unfiledName`，⋯/右键入口，改回「未分类」恢复默认）；10-22 追加五：每个用户文件夹与「未分类」可自定义图标与颜色（15 图案×10 色；默认仍是两态文件夹，非默认图案展开态同色实心填充；图案取 lucide 线条族，不照搬参考项目原套）；冒烟 162/162、探针 58/58；追加六：用户文件夹组行可前后拖拽重排（上/下插入线，未分类行＝末位，搜索/草稿/改名禁拖）；追加五、六真栈待复验；定稿一笔已落（实现 `0f349bb`，收口文档见提交链））。
**Architecture:** 纯前端。`client.js` 文档 tab 加一层本地分组：`hrag-doc-folders.<kbId>.v1`＝`{ folders, membership, unfiledCollapsed? }`，照百科卡片抽屉的 localStorage 分区口径；一张表＋组行，零引擎、零 API、零 host 半改动。

**硬约束**：只改插件仓 `E:\app\python\agent\dsh-harness-rag`；引擎 `E:\app\python\agent\harness-rag` 与主树 `deer-flow` 只读零改动；后端/API/host 半零改动；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。`node_modules/` 为既有未跟踪目录，不触碰、不纳入提交。几何以真浏览器实测为准，不靠估算。分组是个人视图数据，不改变检索范围与检索结果。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 复读并记录文档段锚点：表骨架/吸顶/定宽（`client.js:1935-2008`）、列偏好与存储（`client.js:8379-8417`）、排序/手动序（`client.js:8208-8268`）、`DocsView` 状态与切库（`client.js:8694-8745`）、加载/轮询（`8748-8798`）、选择集修剪（`8814-8824`）、可见集（`8828-8857`）、工具栏（`8998-9073`）、表头与名称 th（`9145-9205`，名称＝`9183`）、行渲染（`9210-9400`）、行菜单（`8450-8489`）。
- [x] 复读分组先例：百科卡片抽屉模型/键/持久化（`client.js:13471-13738`，键 `13531-13533`，读写/清洗 `13549-13608`，动作 `13616-13708`）；移动子菜单（`14935-14962`）确认宿主 Menu 的 `submenu` 用法与当前项打勾/置灰形态。
- [x] 复读工作台 `frontend/src/core/knowledge/card-drawers.ts` 头注（local-only、personal/cosmetic、partition、删抽屉只掉归属），并确认工作台文档表无文件夹（`document-panel.tsx` 零命中）——本对为插件自有，收口登记等价表。
- [x] 真浏览器（同款 CSS/DOM 复刻页，仓外临时件）量当前文档表：570／740／满宽三档的 `th` 高、行高、复选框列宽、名称单元格左内衬／文件图标左缘、短列 chevron 盒；据此钉文件夹组行的 36px 高与左内衬；追加二后图标改为对表头全选框（按钮 4..24，字形 7..21 vs 框 8..21）、组名 32 对「名称」表头；未分类行（同 ⋯）的名称/图标基线同量。
- [x] 量名称表头：570／740／满宽三档下「名称」标签＋hover 双箭头/激活升/降箭头（`ArrowUp`/`ArrowDown`）的总宽与余量（候选箭盒 12–14、gap 2、常驻占位仅 opacity）；确认 552 档不挤标签、不覆盖右列；确认双箭头与其它列的列菜单单 chevron 视觉可区分。
- [x] 核排序箭头取件：宿主图标集检索 `ArrowUp`/`ArrowDown`（此前 asar grep 零命中）；缺件则按宿主 12px 线性图标自绘 path，记录取件结论与 hover 双箭头/激活升/降箭头的切换方式。
- [x] 核名称表头点击边界：左键排序、右键列菜单不互吃；`tabIndex=0`＋Enter/Space 的焦点序不跳；排序后工具栏菜单勾选同步；手动模式点名称退出后「手动排序」可恢复。
- [x] 核切库重置点（`client.js:8723-8745`）：记录现有 kbId 变化时的状态清空（拖拽/选择/加载），本对追加草稿、改名输入、打开的组行菜单；确认 `unfiledCollapsed` 随新库重读。
- [x] 核实本地存储边界：`window.localStorage` 不可用/配额满时读回空态、写 best-effort；per-kb 键切换照 `kbIdRef` 先例；无旧键迁移。
- [x] 确认宿主子菜单行为：百科抽屉已在用 `submenu`；记录「子菜单不翻转」是宿主已知行为，列出真栈底部裁切的回退方案（同一数据模型的小弹层选择），不改数据面。
- [x] 记录停点待钉：组行 36px／文件夹图标按钮 20 盒、14 字形与表头全选框同列（按钮 4..24，字形 7..21 vs 框 8..21）／组名左缘 32＝「名称」表头，文档行仍为徽章 32／名称 60／名称 13px 500／组全选框 13（原篇数位、悬浮显现、空文件夹禁用）／名称单击 220ms 防抖／未分类行同 36px、有文件夹图标按钮、⋯/右键（新建文件夹、收起/展开）、名称单击立即切换／名称表头箭盒 12–14＋gap 2、常驻占位、激活箭头 `ArrowUp`/`ArrowDown`（缺件自绘）／名称表头首点升序；Task 0 量完回填。
- [x] 核工作区：插件仓 HEAD 与 `git status`；除本对 spec/plan 外，当前还有并行会话的 model-proxy 未提交改动（`client.js`／`src/model_proxy.ts`／`src/model_sync.ts`／`tests/model_proxy.test.ts`／`tests/model_sync.test.ts`／四份 10-21 spec+plan）与既有 `node_modules/` 未跟踪——逐文件记录，不触碰、不纳入；引擎与主树零 diff。实现时若与 `client.js` 同文件，按 hunk 分离。

**实测**：Task 0 已跑（2026-10-22）。锚点复读完成，实现后行号漂移约 +840 行，落点改为：模型 `client.js:8481-8691`、DocsView 状态/动作 `9012-9383`、组行/草稿/空提示 `9998-10180`、样式 `2046-2073`、名称表头 `9726-9756`。先例复读：百科抽屉单次 persist、宿主 `submenu` 用法一致。真浏览器复刻页（仓外 `_scratch/doc-folders-replica.html`，浅色 token）实测：552 档 nameTh 78、label 24、箭盒 14、余量 22；570 档 nameTh 94、overflow 0；740 档 264；1100 档 624；四档 `groupH=36`、`rowH=37`（旧 caret 版 caretLeft 15、folderIconLeft 33、groupNameLeft＝fileNameLeft＝61；10-22 改版后真栈 iconRel 32＝fileIconRel 32、groupNameRel＝fileNameRel 60、`groupH=36`、组全选框 13×13）；552 档 2px 横滚＝既有 `min-width:552` 加外框所致，非本对新增。箭头取件：宿主 asar 无 `ArrowUp/ArrowDown` 线性件，`dshIconOr` 优先宿主键、缺件自绘 16 视窗；hover/focus 出双箭头，激活切升/降箭头。存储边界探针覆盖坏 JSON/读失败/写失败。切库 effect 追加清草稿、改名、组行菜单、删除确认与名称定时器。宿主子菜单「不翻转」沿用既有行为，真栈裁切回退留 Task 3/5（尚未触发）。工作区：插件 HEAD `c7a2dde`，`git status`＝`M client.js`＋本对 spec/plan＋`node_modules/`；并行 model-proxy 改动已由并行会话提交，不在工作区；引擎 `harness-rag` HEAD `b36e39e16` 无改动；主树 `deer-flow` 有其它会话既有脏文件，本对零触碰。

## Task 1 — 本地分组模型＋纯助手

> 动到的文件：`client.js`（常量／清洗／读写成对／纯函数／`useDocFolders`）；仓外探针。

- [x] 键与模型：`DOC_FOLDER_KEY_PREFIX = 'hrag-doc-folders.'`＋`v1`；值 `{ folders: [{ id, name, collapsed? }], membership: { [docId]: folderId }, unfiledCollapsed?: true }`；未分类折叠位是顶层布尔，不混进 `folders`。
- [x] 清洗 `docFolderStateSanitize`：`folders` 只收字符串 `id`/`name`、名称 trim 后非空、重复 id 首个胜、`collapsed` 仅 `true` 保留；`unfiledCollapsed` 仅 `true` 保留（非 `true` 丢弃），零文件夹时丢弃；`membership` 只收字符串键/字符串值；坏 JSON/缺键/读失败回空态。
- [x] 读写 `readDocFolders` / `writeDocFolders`：写 best-effort；`useDocFolders(kbId)` 照 `useCardDrawers`（`client.js:13602-13708`）做 per-kb 重读与单次 persist；切库不把旧库状态写进新键。
- [x] 纯助手：`newDocFolderId()`（照 `newCardDrawerId`，`crypto.randomUUID`＋时间戳回退）；`docFolderOwner(membership, folderIds, docId)`（失效归属⇒null）；`docFolderGroups(docs, folders, membership, query, unfiledCollapsed)`（分组、未分类兜底、query 非空强制展开并隐藏零命中、空用户文件夹保留、未分类空则隐藏、零文件夹返回平表标记）；`docFolderNameError(name, folders, excludeId)`（空/同名）；`createDocFolder(state, name)`（头插置顶）；`renameDocFolder(state, folderId, name)`；`moveDocFolder(membership, docIds, folderId)`（`folderId=null`＝未分类，删映射）；`deleteDocFolder(state, folderId)`（同时清 `unfiledCollapsed`）；`toggleDocFolder(state, folderId)`；`toggleUnfiled(state)`。
- [x] 新建默认置顶：`folders` 头插；`collapsed` 缺省＝展开；删除只移除该 folder＋其 membership，文档对象零改动。
- [x] 仓外探针 `probe-doc-folders.mjs`（从 `client.js` 抽函数源码执行，非副本）：坏 JSON/缺字段/重复 id/空名、`unfiledCollapsed` 非 `true` 丢弃、零文件夹丢弃 `unfiledCollapsed`、失效 membership、未分类兜底、零文件夹平表、新建置顶、改名、删除掉归属且清 `unfiledCollapsed`、批量移动单次 persist、用户文件夹折叠往返、未分类折叠往返、搜索隐藏/强制展开/清空恢复两类折叠态、未分类空→有文档自动展开、per-kb 键隔离、写失败回退，≥18 例。
- [x] 门禁：`node --check client.js`；探针全绿；冒烟默认与 `SMOKE_HOSTLESS=1` 全绿（本 Task 不接 UI，预期零回归）。

**实测**：已落 `client.js:8481-8691`。清洗函数名 `docFoldersSanitize`；动作助手并入 `useDocFolders`（单次 `persist`），纯函数落 `moveDocFolderMembership` / `deleteDocFolderState`；`deleteDocFolderState` 返回新 state 时丢弃 `unfiledCollapsed`（删文件夹即展开未分类）。仓外探针 `_scratch/probe-doc-folders.mjs` **42 PASS / 0 FAIL**（含坏 JSON、缺字段、重复 id、空名、`unfiledCollapsed` 非 true/零文件夹丢弃、`unfiledName` 读写/保留/末文件夹丢弃、失效 membership、平表、置顶、改名、删除掉归属、批量移动、折叠往返、搜索强制展开/恢复、per-kb 隔离、写失败）。门禁 `node --check client.js` 通过；仓内无官方冒烟 runner，改用 React 19＋happy-dom 组件冒烟 `_scratch/smoke-doc-folders.mjs`（无 host 路径，documents API 走 fetch 模拟）**71 PASS / 0 FAIL**。

## Task 2 — 组行与新建/改名/折叠

> 动到的文件：`client.js`（Styles() 文档表段、DocsView 组行渲染/草稿/改名、图标、内联 zh/en 词条）。

- [x] 工具栏「新建文件夹」加号：仅 `phase === 'ready'` 且搜索词为空时可用；点击在用户文件夹最上方出草稿行（输入聚焦）。
- [x] 草稿行：Enter 提交、Esc 取消、失焦有效则提交；空/纯空白取消；完全同名（trim 后、区分大小写）行内报错并保留输入；提交后新文件夹置顶、自动展开。
- [x] 用户文件夹组行：文件夹图标按钮（14px，替代原下拉箭头；点击切换折叠，不旋转，默认文件夹收起线条/展开蓝色实心两态；自定义图案收起线条、展开同色实心）＋名称＋右侧组全选框＋⋯；图标与表头全选框同列、名称与「名称」表头同列；行高 36px、无分割线；hover `interactive-bg-hover`；⋯/组全选框 hover/focus 显现，空文件夹的组全选框渲染为禁用态。
- [x] 图标与颜色（追加五）：用户文件夹与未分类组行 ⋯/右键「图标与颜色」→ 弹层（上一排 15 个样式钮、下一排默认＋10 色）；`folders[].icon`/`color` 与顶层 `unfiledIcon`/`unfiledColor` 白名单落盘（旧值/未知值清洗回默认）；默认文件夹用宿主两态图标，其余 14 个图案用 lucide 24×24 线条节点；展开态同色实心填充（`fill=currentColor`、线宽 1.5）；「恢复默认」清两键；删最后一个文件夹时随未分类组一起丢弃。
- [x] 未分类组行：文件夹图标按钮＋名称＋右侧组全选框＋⋯；⋯/右键菜单＝图标与颜色、重命名、新建文件夹、收起/展开，可改名（顶层 `unfiledName`），不可删除；名称/图标/行点击都立即切换，双击不改名；行高与左内衬同用户文件夹行，组名基线对齐。
- [x] 组行/空提示行 `colspan`＝1（复选）＋1（名称）＋当前可见数据列＋1（操作）；隐藏列变化时重算。
- [x] 组行不挂 `draggable`，也不是 drop 目标。
- [x] 折叠：文件夹图标按钮点击立即切换、组行除名称/图标/组全选框外区域立即切换、名称单击 220ms 防抖切换、双击取消并进入改名；未分类三种点击都立即切换；组全选框点击不触发折叠，收起组点击全选会先展开；`aria-expanded` 同步；用户文件夹写 `folders[].collapsed`，未分类写 `unfiledCollapsed`。
- [x] 改名：双击名称或右键菜单「重命名」→ 行内输入（全选）；Enter 提交、Esc 取消、失焦有效则提交；空名取消恢复原名；同名行内报错；成功后折叠态不变。
- [x] 组行 ⋯／右键菜单先挂「重命名」，删除项留 Task 3；「未分类」组行同样有 ⋯/右键，菜单含重命名、新建文件夹、收起/展开（不可删除）。
- [x] 切库重置：kbId 变化时清空草稿、改名输入、打开的组行菜单（连同既有拖拽/选择），不把旧库编辑态带进新库。
- [x] 空用户文件夹展开显示「此文件夹为空」提示行；未分类为空且有用户文件夹时不渲染；零文件夹时完全不渲染组行（平表）。
- [x] 内联词条（zh/en）：新建文件夹、未分类、此文件夹为空、重命名、组全选/占位/空名/同名错误等；不放 `locale/*.json`（该文件只承载元数据）。
- [x] 门禁：`node --check client.js`；冒烟默认与 `SMOKE_HOSTLESS=1`；真浏览器复刻页看组行几何（570／740／满宽、浅/深），未分类行与用户文件夹行对齐。

**实测**：组行/草稿/改名渲染落 `client.js:9998-10180`，样式 `2046-2073`，词条 zh `104-119`／en `895-909`。组件冒烟覆盖：三组渲染顺序、折叠/展开与落盘、草稿新建置顶、空文件夹提示、双击改名、名称单击 220ms 折叠、双击不进折叠、Esc 取消、切库清态；另修一处实现期缺陷——未分类 `group.id=null` 与 `renamingFolderId` 初值同值，行点击曾被误判为改名态吞掉，现按 `group.kind === 'folder'` 才拦。几何复刻页（旧 caret 版）：四档 `groupH=36`，folderIconLeft 33 与文件徽标同列，groupNameLeft＝fileNameLeft＝61，未分类行同高同基线；10-22 首个改版真栈 iconRel 32＝fileIcon 32、nameRel 60，追加二改为图标对表头全选框（按钮 4..24，字形 7..21 vs 框 8..21）、组名 32 对「名称」，文档行仍 32／60，见 Task 5。组行/边框走宿主 token；文件夹色调走 `--hrag-folder-tone-*`（浅/深两套值，深色提亮），深色真栈归 Task 5 #8。10-22 追加：篇数整段移除；原位置改为悬浮组全选框（组内全选/清、部分选中 indeterminate、收起组点选先展开）；去掉下拉箭头，改文件夹图标按钮切换；未分类补 ⋯/右键（新建文件夹、收起/展开）；冒烟新增「无 caret/无计数」「图标切换」「组全选/半选/清空」「收起组展开全选」「空文件夹禁用全选框」并全绿；追加三再补「两态图标路径」「跨组拖行」两组用例；追加四补「未分类改名/复位/落盘」用例；追加五补「15 样式/11 色点」「自定义图案落盘」「展开态实心填充」「恢复默认」与「未分类同选择器/顶层落盘/复位」用例（探针 58/58、冒烟 162/162）。

## Task 3 — 移动与删除

> 动到的文件：`client.js`（行菜单/右键菜单、移动子菜单、删除确认、选择安全）。

- [x] 行 ⋯ 与行右键增加「移动到文件夹」子菜单：`未分类`＋各用户文件夹；当前归属打勾并置灰；批量选择跨多个文件夹时无任何目标打勾；单篇/批量同一入口；批量只 persist 一次（沿百科抽屉 `moveCards` 单次 persist）。
- [x] 搜索词非空时移动入口置灰（与拖拽禁用同口径）；零文件夹（平表）时不渲染该入口。
- [x] 移动后自动展开目标（含未分类：清 `unfiledCollapsed`），选择集保留；不发请求、不重载清单；不改 `hrag-doc-order` 的 id 序列，文档在目标组内按现有全局 id 序落位。
- [x] 组行 ⋯／右键「删除文件夹」→ 确认弹层（含篇数与「文档不会删除」文案）；确认后删 folder＋membership、清 `unfiledCollapsed`，文档归未分类，清这些文档的选择；删最后一个文件夹回平表。
- [x] 内联词条（zh/en）：移动到文件夹、删除文件夹、确认弹层文案（含篇数与「文档不会删除」）。
- [ ] 子菜单裁切兜底：真栈若在贴近底部时被宿主裁切（子菜单不翻转），回退为同一数据模型的小弹层选择；不改键/模型/动作。
- [x] 门禁：`node --check client.js`；探针加移动/删除/选择安全/手动序 id 不变例；冒烟双绿。

**实测**：菜单入口落 `docRowMenuItems`／`docContextMenuItems`（`client.js:8724-8790`），位置在生成考题/重试之后、分隔线之前；`folderMoveItems` 打勾＝全部所选归属同一目标，跨多文件夹则无勾；搜索时父项 `disabled`，动作层再守一次。组件冒烟覆盖：单篇移动落盘、目标组按当前全局排序落位、目标自动展开、目标组归属即时更新、搜索态子项点击不改归属、删除确认篇数（2 篇）、删除后 membership 清空且文档回未分类、选择被清、删最后一个文件夹回平表。批量单次 persist 由 `moveDocs` 一次 `persist` 保证。子菜单真栈裁切核仍在 Task 5（尚未触发回退）。门禁见 Task 5。

## Task 4 — 搜索/排序/选择/拖拽接合

> 动到的文件：`client.js`（可见集/分组渲染、名称表头点击/键盘/箭头样式、选择集/组全选、拖拽守卫）。

- [x] 渲染改为「排序 → 分组 → 组行＋文档行」：字段排序（含名称）先排全表；组内顺序＝排序结果；用户文件夹与未分类组行只在 ready 态出现。
- [x] 可见集：`displayedDocs`＝展开且过滤后的文档（含未分类组）；全选/未全选/半选改用 `displayedDocs`；统计底栏仍用全量 `docs`。
- [x] 折叠某组（含未分类）时清掉该组已选文档；删除文件夹清该组选择；移动目标自动展开、选择保留；搜索变化清选择沿用现状。
- [x] 搜索态：只显示有命中的组并强制展开；清空恢复存储的两类折叠态（`folders[].collapsed`＋`unfiledCollapsed`）；搜索期间折叠（含未分类）/新建/移动置灰（临时展开与持久态分离）。
- [x] 名称表头（D4 甲）：`th` 整格可点＋`tabIndex=0`；左键与 Enter/Space 等价；首次设 `name`＋`asc`，已是 `name` 则反转；`aria-sort` 给 `none/ascending/descending`；`focus-visible` 焦点环。
- [x] 名称表头可发现性：`cursor:pointer`＋`title`「按名称排序」；hover/focus 出双箭头（`ChevronsUpDown`），激活时升/降箭头（`ArrowUp`/`ArrowDown`，宿主缺件自绘；12–14px、gap 2，Task 0 钉）；箭盒常驻占位、默认仅 opacity，不挤标签；列菜单 chevron 不复用。
- [x] 名称表头作用域：只重排组内文档，不重排文件夹；不清选择、不改列偏好；工具栏排序菜单同步；手动模式点名称退出、手动 ids 保留、点「手动排序」恢复；右键仍开列菜单。
- [x] 名称表头不对称：只有名称表头有直接排序；其他表头继续走 chevron 列菜单；不加点击排序。
- [x] Styles：`.hrag-docth-name` cursor/focus；`.hrag-docnamehead` 内联 flex＋gap 2；`.hrag-docnamehead-sort` 常驻箭盒、默认 opacity 0、hover/focus/active 显现；激活态切 `ArrowUp`/`ArrowDown`；不改列宽/其它表头。
- [x] 手动序：同文件夹内拖行照旧切「手动排序」并写 `hrag-doc-order`；重排基准用**过滤后的全量文档 id**（含其它/折叠组），不得用 `displayedDocs` 子集；移动不改该 id 序列，目标组内按现有序落位。
- [x] 跨组拖行：组行/空态行/异组文档行接受 `dropEffect='move'`，悬停高亮目标组行（2px 内环，不出插入线），drop 只改 `membership`、目标组自动展开、不写 `hrag-doc-order`；拖回当前组 no-op；搜索/多选禁拖照旧。
- [x] 文件夹前后拖拽（追加六）：用户文件夹组行可拖（搜索非空/草稿/改名/仅一个文件夹时禁拖）；悬停另一文件夹行按上/下半区出 2px 插入线，drop 移到该行前/后；悬停未分类行＝挪到末位；拖动源 0.45 透明；落点后 300ms 抑制 click（不误触折叠）；`moveDocFolderOrder` 纯助手＋`moveFolder` 单次 persist，只改 `folders` 数组顺序；实现期修一处未分类恒 0.45 透明（`group.id=null` 与空闲 `folderOrderDragId=null` 误判相等），降透明类加 `isFolder` 守卫并补冒烟用例。
- [x] 新上传文档无 membership⇒未分类，按当前排序落组内；未分类此前为空被隐藏则随文档出现并清 `unfiledCollapsed`（展开）；已在列表中的折叠未分类不因上传自动展开；删除文档后失效 membership 不影响分组与组全选。
- [x] 门禁：`node --check client.js`；探针加分组/搜索/全选/重排基准/移动落位例；冒烟当前 162/162（含组全选/半选/清空、图标切换、空文件夹禁用全选框、两态图标路径、跨组拖行落点/高亮/展开/归位、未分类改名/复位/落盘）；复刻页量 570/740/满宽无新横滚、未分类行对齐、名称表头箭头在 552/570 不挤标签。

**实测**：分组派生 `client.js:9184-9189`，全选改 `displayedIds`（`9214-9230`），折叠清选择 `9245-9262`，名称表头 `9722-9756`，拖拽落点（行内插入线＋跨组组落点）`9845-9925`，未分类自动展开 `9235-9243`。组件冒烟覆盖：搜索只出命中组并强制展开、清空恢复两类折叠态、搜索期新建/折叠/移动置灰、全选只覆盖展开行（折叠组文档不入选择集）、折叠清该组选择、名称首点升序/再点降序/Enter/Space 等价、`aria-sort` 同步、移动按全局序落位、未分类空→有文档自动展开（kb2）、per-kb 键隔离、零文件夹平表。另修一处冷启动边界：未分类自动展开原在首载 `docs=[]` 拍记账，会把已持久化的 `unfiledCollapsed` 误冲成展开；现按 `phase === 'loading'/'error'` 跳过，加 kb3 冷启动用例（folders＋折叠未分类＋首载即有未分类文档 → 保持折叠、文档隐藏、键不变），并做了 neuter 反证（去掉守卫时该用例 2 项失败）。探针覆盖分组/搜索强制展开/恢复/平表/失效归属。手动序重排基准仍是 `visibleDocs` 全量 id（非 `displayedDocs`），移动不写 `hrag-doc-order`；跨组拖行只改 membership（组行/空态行/异组文档行均落点），同组拖行才重排。复刻页：570/740/1100 无横滚；552 档 nameTh 78＝24 label＋2 gap＋14 箭盒＋22 余量，不挤标签。10-22 追加：组全选框只作用该组、部分选中 indeterminate、收起组点选先展开；门禁见 Task 5。

## Task 5 — 门禁与真栈验收

> 动到的文件：无（探针/截图仓外）。

- [x] `node --check client.js`；全部 `src/*.ts` 跑 `--experimental-strip-types --check`（预期零改）；冒烟默认与 `SMOKE_HOSTLESS=1` 全绿；仓外探针全绿。
- [ ] DSH 整重启后真跑下方 1–10；沿 Task 0 停点核对组行几何、未分类行对齐、名称表头箭头与对齐。（已整重启并跑 1–8 主路径；残项见下）
- [ ] 回归：列偏好/列菜单/表头右键、排序菜单/手动序、行拖拽、搜索、全选/批量删除、行 ⋯/右键、抽屉点击、上传/重复检测、评测/百科/召回/图谱 tab。（已回归列菜单/表头右键、排序/手动序、行拖拽、搜索、行菜单、百科 tab；上传/重复检测、评测/召回/图谱未跑）
- [ ] 子菜单在列表顶部/中部/底部三种位置各开一次，确认不裁切；若裁切，按 Task 3 兜底改为小弹层。（中部一次未见裁切；顶部/底部未跑）
- [x] 确认提交面仅含本对文件＋收口文档（并行会话的 model-proxy 未提交改动与 `node_modules/` 不入）；引擎 `harness-rag` 与主树 `deer-flow` 零 diff。（提交时逐文件核 hunk：本对实现为 `0f349bb`；`node_modules/` 保持未跟踪、不入提交面；引擎与主树 scoped 零 diff）

**真跑清单（他手验）**：

1. **零文件夹回归**：未建任何文件夹时，文档表除名称表头新增排序入口外，列宽/横滚、列菜单、排序、拖拽、搜索、全选/批量、行菜单、抽屉、上传与改前一致。
2. **新建/改名/折叠**：新建文件夹置顶出现；双击/右键改名；未分类经 ⋯/右键重命名、改回「未分类」恢复默认；文件夹图标/行点击折叠展开（含未分类，无下拉箭头；图标收起线条/展开蓝色实心）；重开面板、切 tab、切库后文件夹、归属、折叠态（含 `unfiledCollapsed`）与 `unfiledName` 保持；切库时草稿/改名/组行菜单状态清空。
3. **点击语义**：名称表头左键/Enter/Space 首点升序、再点降序；hover/聚焦出双箭头、激活升/降箭头（`ArrowUp`/`ArrowDown`），`aria-sort` 与排序菜单同步；右键仍开列菜单；排序只重排组内文档、不清选择/不改列偏好；手动序往返保留；组行名称单击折叠（220ms）、双击改名；未分类名称单击立即切换、双击不改名，重命名走 ⋯/右键；文件夹图标按钮点击切换且不触发组行其它动作；组全选框点击不切换折叠；用户文件夹右键改名；空名/同名/与自定义未分类名同名拦截。
4. **移动**：单篇/批量移到用户文件夹与未分类（显示名随 `unfiledName`）；当前目标置灰打勾、跨多文件夹批量无勾；目标自动展开；手动序下移动不改全局 id 序，目标组内按现有序落位；搜索词非空时入口置灰；零文件夹时不渲染入口；子菜单三处位置可开。
5. **删除文件夹**：确认弹层篇数正确、明示不删文档；确认后文档归未分类、选择被清、未分类若收起则展开；删最后一个文件夹回平表。
6. **搜索与选择**：搜索只出命中组并强制展开（含未分类）；清空恢复两类折叠态；表头全选只含展开行；组全选框只作用该组、部分选中 indeterminate、收起组点选先展开；折叠/删文件夹（含未分类）清该组选择；批量删除不命中隐藏行。
7. **排序/拖拽**：名称/字段排序在组内生效；手动模式同组拖拽生效、其它文件夹与折叠组顺序不变；跨组拖到组行/空态行/异组文档行＝移动归属、目标组高亮并自动展开、不出插入线、不写手动序；拖回当前组 no-op；搜索/多选禁拖照旧。
8. **几何/主题**：570／740／满宽组行不撑破、不新增横滚；组行无分割线；隐藏列时组行/空提示行 `colspan` 正确；未分类行文件夹图标/⋯ 与用户文件夹行对齐，组全选框在原篇数位；两态图标形状/颜色正确；名称表头箭头在 552/570 不挤「名称」；浅/深主题层次与现有表格一致，拖放高亮可见；空文件夹提示对齐；⋯/组全选框 hover/focus 可见。
    - **图标与颜色（追加五）**：用户文件夹与未分类的 ⋯/右键都开弹层，15 样式钮＋11 色点；点选披萨/兔子等非默认图案后组行即时切换并落盘，展开态同色实心、收起线条；选色后图标着色，重开/切 tab 保持；恢复默认回两态文件夹；未分类写顶层两键、删最后一个文件夹时随组丢弃；弹层在窄视口不溢出。
9. **本地容错**：坏 JSON、缺键、重复 id、空名、`unfiledCollapsed` 非 `true`、失效 membership、切库键隔离、localStorage 不可写均不崩；上传新文档入未分类；删文档后组全选/分组无残留。
10. **回归面**：列偏好/列菜单/表头右键、排序/手动序、行拖拽、上传链、抽屉、评测/百科/召回/图谱无变化。

**实测**：静态门禁已过（2026-10-22）：`node --check client.js` 通过；`src/*.ts` 全部 `--experimental-strip-types --check` 通过；`tsc -p tsconfig.json` exit 0（注：`pnpm run typecheck` 会触发 `pnpm install` 并拉取缺失的 `@deepseek-ai/dsh-type-meta`，本机改用 `node node_modules/typescript/bin/tsc` 直跑）；仓外探针 42/42；组件冒烟 114/114。仓内无官方冒烟 runner（默认／`SMOKE_HOSTLESS=1` 两档不可得），以 React 19＋happy-dom 的 `_scratch/smoke-doc-folders.mjs` 代替并在无 host 路径下跑通。真栈（2026-10-22，DSH 整重启后；KB `t3-panel-acceptance` id `9141e58d…720a`，8 篇文档）：

1. 零文件夹：0 组行／8 行；行右键菜单只出「查看切片/下载原文/生成考题/取消选择/删除所选」，无移动入口；搜索 `doc` 4 行、搜索态行无 `hrag-docrow-draggable`；清空后 8 行。
2. 新建/改名/折叠：建 验收A→A2、验收B；双击/右键改名；空名/同名（「已存在同名文件夹」）拦截且草稿保留/取消；A2 与未分类折叠态在「文档↔百科」切 tab 后保持；搜索强制展开并恢复两类折叠态；面板重开与切库未单独跑。
3. 点击语义：名称表头 `aria-sort` 升/降、Enter/Space、排序菜单同步；表头右键列菜单；组名单击折叠、双击改名；未分类名单击立即切换；均过。
4. 移动：批量 2 篇→验收B（选择保留、目标置灰打勾）、单篇移回未分类；搜索态入口置灰；零文件夹无入口；子菜单只在中部开过一次，未见裁切，顶部/底部未跑。
5. 删除：确认层「其中 1 篇文档会移到未分类，文档不会被删除。」；取消保留；确认后 membership 清空、选择清 0、未分类展开、8 行；删最后一个文件夹回平表；测试文件夹已清理，localStorage＝`{"folders":[],"membership":{}}`。
6. 搜索/选择：搜索只出命中组、强制展开；清空恢复；全选 8；折叠清该组选择；搜索清选择；批量删除未跑。
7. 排序/拖拽：同组拖行出上/下插入线且 dragover 被接受（`sameLine=true/samePrevented=true`）；跨组拖到组行/空态行/异组文档行＝移动归属（真栈以 `t3-doc-a.md` 从「测试」拖入未分类再拖回，两向均落库）；拖回当前组 no-op；目标组自动展开；手动序实际重排；搜索态/有选择时行无 `draggable`。
8. 几何：`.hrag-docscroll` 551/552、overflow 1；组行 36、`box-shadow:none`（无分割线）；无 caret/count 节点；组文件夹图标与表头全选框同列（按钮 4..24，14 字形 7..21 vs 框 8..21）、组名 32＝「名称」表头 32；文档行 fileIcon 32／fileName 60 不变；组全选框 13×13；`colspan=8`；名称 th 126；箭头 14、默认 opacity 0；展开图标 3 路径 `rgb(65,118,230)`、收起 2 路径 `rgb(129,133,140)`；拖放高亮 2px 内环；暗色主题与隐藏列 colspan 未跑。
9. 本地容错：探针 42/42、冒烟 114/114（坏 JSON/缺键/重复 id/空名/失效 membership/键隔离/写失败/空文件夹禁用全选框/跨组拖行/未分类改名与复位/末文件夹丢弃 `unfiledName`）；上传新文档入未分类、删文档后组全选取证未跑。
10. 回归：列菜单/表头右键、排序菜单/手动序、行拖拽、搜索、行 ⋯/右键、百科 tab 已回归；上传/重复检测、评测/召回/图谱 tab 未跑。

- 复位：测试排序偏好恢复 `{mode:'created_at',ids:[]}`；选择清 0；DSH 本轮六次整重启（首次验收一次；`location.reload()` 触发插件 bundle 404 后恢复一次；追加二改版加载一次；追加三改版加载一次；追加四改版加载一次；追加五改版加载一次）。
- 10-22 追加二复验（整重启后，KB 内有用户建的空文件夹「测试」＋未分类 8 篇）：两行均无 `.hrag-docgroup-count`/`.hrag-docgroup-caret`，均有 `.hrag-docgroup-iconbtn`；空文件夹当时无组全选框（追加三已改为禁用态），未分类组全选框存在；未分类 ⋯/右键仍为「新建文件夹/收起未分类」。点未分类文件夹图标 → 0 文档行、`aria-expanded:false`；点该组全选框（收起态）→ 展开并选中 8 篇（`sel:8`、`checked:true`），再点清空（`sel:0`）；单选取 1 篇时 `indeterminate:true`。当时几何：iconRel 32＝fileIconRel 32、groupNameRel＝fileNameRel 60、组行 36、组全选框 13×13。注：渲染层 `location.reload()` 会让 linked 插件以 `dsh-app://app/plugins/??dsh-harness-rag/client.js` 404 进入崩溃页，重启应用可恢复；后续验证不再走 reload。
- 10-22 追加三复验（第 4 次整重启；改「图标对齐表头全选框、空文件夹保留禁用全选框」后）：`.hrag-docth-check input` left 8／w 13（中心 14.5）；`.hrag-docgroup-iconbtn` left 4／w 20（14 字形 7..21，与框 8..21 同列）；`.hrag-docgroup-name` left 32＝`.hrag-docnamehead` 32；文档行 fileIcon 32／fileName 60 不变；组行 36。空文件夹「测试」的组全选框存在且 disabled（`[[true,false],[false,false]]`），未分类启用；smoke 89/89、probe 38/38。
- 10-22 追加四复验（第 5 次整重启；改「去组行分割线、两态文件夹图标、跨组拖行」后）：组行 `td` 的 `box-shadow` 为 `none`，空态行同样无分割线（表头线保留）。展开态「未分类」图标 3 路径、`color: rgb(65,118,230)`；收起态「测试」图标 2 路径、`color: rgb(129,133,140)`（两态路径取自宿主 16×16 侧栏工作区图标）。真栈拖行：`t3-doc-a.md` 从「测试」拖到「未分类」再拖回「测试」，两向均落库；悬停目标组行出现 `hrag-docgroup-drop`（`interactive-bg-hover`＋2px `button-primary-fill` 内环），松手后消失；目标组自动展开、未写手动序。此时「测试」已有 3 篇文档，两组全选框均启用（`[[false,false],[false,false]]`）；smoke 108/108、probe 38/38。
- 10-22 追加五复验（第 6 次整重启；改「未分类可重命名」后）：未分类 ⋯ 菜单为「重命名 / 新建文件夹 / 收起未分类」（宿主 `[role=menuitem]`）；点重命名后输入框预填「未分类」，改为「收件箱」并 Enter → 组名即时变「收件箱」、`localStorage` 落 `unfiledName:"收件箱"`；再次改回「未分类」→ 组名恢复默认、`unfiledName` 键被删除；未分类归属文档未变。smoke 114/114、probe 42/42。

## Task 6 — 收口

> 动到的文件：本对＋`docs/equivalence.md`＋`README.md`。

- [x] 回写 spec Status 与各 Task 实测；plan 勾选与实测回填。
- [x] `docs/equivalence.md` §2 增行：文档文件夹（本地分组）＝插件增加（工作台文档表无对应；分组模型照工作台 `card-drawers` / 百科抽屉的本地分区口径）。（本笔已补）
- [x] `README.md`：功能处补一句「文档 tab 支持本地文件夹分组（新建/改名/折叠/移动/删除；per-kb localStorage，与百科卡片抽屉同口径；不改变检索范围）」；命名空间 localStorage 键清单加 `hrag-doc-folders.<kbId>.v1`。（本笔已补）
- [x] 逐文件核 hunk，排除 `node_modules/` 与并行工作区；提交信息英文 Conventional ASCII。（实现笔 `0f349bb`，收口文档本笔）
- [x] 提交后回填本 plan 提交链；仓无 remote，不推送。（见下方提交链）

**实测**：spec Status 与 Task 0–5 实测已回写（2026-10-22）；真栈 1–10 主路径与残项已记入 Task 5。等价表与 README 已补；实现笔 `0f349bb`，收口文档笔见提交链。

---

## 提交链（滚动记实）

- `0f349bb` — `feat(panel): group documents into local folders`（本对实现＋spec/plan）
- `9e59d3c` — `docs(panel): close out the document folder pair`（README／等价表／提交链）
- 同日邻线（不属本对）：`e122344` 模型代理 sessionId/stop、`67ef485` 视频 seek 源、`27bfc23` 召回/评测 UI 对齐。
