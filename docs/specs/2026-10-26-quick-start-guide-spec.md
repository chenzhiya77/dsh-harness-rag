# 面板「快速开始」引导 —— spec

**Status:** 已实施 · 未提交（2026-10-26 隔离沙箱验收完成；用户实例真栈与上传/拖拽回归待复核；提交候令）
**Date:** 2026-10-26
**来源:** 10-26 他提「加在会话按钮的左边……用来说明使用的步骤，而不是整体的介绍项目」，要「告诉用户你只需要完成这几步后就可以完整的使用 rag 的功能」；否掉纯 `?` 图标（「没有焦点，用户不能一眼注意到」），定「加上文字，例如：快速开始」。
**承接:** 顶栏与会话入口（[会话绑定 spec](2026-10-23-conversation-binding-spec.md) §4.1；`client.js:20630`、`client.js:21961`）；会话小面板底座（`client.js:20674`、`client.js:22575`，CSS `client.js:2144-2160`）；窄档测量（`client.js:21233-21238`）；零库空态（`client.js:21912`）与建库成功链（`client.js:21507-21529`）；上传 toast（`client.js:22262`）与并行 R4 的 MinerU toast（`client.js:22285`）；设置入口（`client.js:20983`、`client.js:22035`）；口径词表 `client.js:790/931-934`。
**配套 plan:** [../plans/2026-10-26-quick-start-guide-plan.md](../plans/2026-10-26-quick-start-guide-plan.md)
**行号口径:** 以上为实施前落点（2026-10-26 HEAD；R4 已提交 `c67bbe7/680190a/367d379`）；实施后行号已移，以代码为准。

## 1. 范围

只改 `client.js`（组件＋CSS＋i18n 词条），五件：

1. **主入口**：`hrag-bar` 内在「会话」钮左侧新增「快速开始」钮；宽档＝罗盘＋文字药丸，中/窄档＝图标（未看过时带点）。
2. **零库空态第二入口（C1 暂选乙）**：空态卡加「新建知识库」主按钮＋「快速开始」文字链钮，打开同一浮层；空态上下文里指南的 step 3 动作不渲染；建库成功后把空态切到主面板（`confirmCreateKb` 成功时置 `phase='ready'`），不再要求手动点「刷新」。
3. **卡片**：320 宽锚定浮层，内容＝一句自动说明＋三步＋一句尾注，每步一个动作入口；从栏内打开时 step 3 动作可用，从空态打开时隐藏。
4. **三档**：指南文字在栏宽 <320 时让位；会话文字沿用现状 <208 让位。
5. **记忆与词汇**：首开点用 `hrag-guide-seen` 记一次（两个入口都写）；同轮把 zh 上传 toast 的「嵌入模型」改为「向量模型」，并把空态提示改成不要求手动刷新。

**不包含**：项目/功能整体介绍与营销文案；自动弹出；完成勾选或进度联动（不读运行时/模型/库/会话状态）；帮助中心全文或外链；运行时卡、上传拦截行为、设置面本身的改动（上传拦截仅 zh 词条对齐；MinerU 引导属并行 R4）；往宿主会话写记录；跨窗口同步；host 半、引擎、后端任何改动；空态以外（loading / error / 运行时 gate）的分支改动。

## 2. 现状与依据

### 2.1 顶栏、空态与窄档

- DOM 顺序（`client.js:21926-22039`）：库选择器（`DshMenu`，可收）→「快速开始」钮→「会话」钮（`SessionEntryButton`，`client.js:20630`；渲染 `client.js:21961`）→ `⋯` 菜单。CSS：`.hrag-bar` gap 8（`client.js:2118`），指南图标档（<320）降为 6；会话钮 28px ghost（`client.js:2131`）；`margin-left:auto` 挂在指南钮（`client.js:2133` 一带）。
- 窄档：栏宽 <208 时会话文字让位，只留 14px 图标（`client.js:21233-21238`）；198px 面板下栏宽 174、库选择器可用宽约 102（库名文字宽 75）。
- 现状固定件（198px）：会话 28＋`⋯` 28＋两道 8 gap＝72；加指南图标（28＋8）后若不动其他件，库名实测只剩 42px。最终口径：指南图标档（<320）收起库 chevron、栏距降到 6px，198px 面板下库选择器可用宽 74、库名 66；208 档 77/69；320 档 124/75。
- 面板 `phase` 初始 `'loading'`（`client.js:20901`）；顶栏只在 ready 分支渲染（`client.js:21926`）；零库时 `load()` 置 `phase='empty'`（`client.js:21093`），空态分支（`client.js:21912`）只有标题/提示/「刷新」，**没有顶栏，也没有建库按钮**。

### 2.2 可复用的浮层与动作

- 会话小面板 `SessionPopover`（定义 `client.js:20674`，渲染 `client.js:22575`）：fixed、320 宽、右缘对齐锚点、下方不足 280 翻上（`client.js:20714`）、max-height 480（`client.js:20718`）、外点/Esc 关闭，可越过 198px 面板左缘。
- 设置面：`openSettings(advanced)`（`client.js:20983`）同时设置「高级设置」开关；菜单走 `openSettings(false)`（`client.js:22035`）。**指南的「去配置」必须走它**，不能直接 `setSettingsOpen(true)`。
- 新建库：清空 `createKbName/createKbDesc` 后 `setCreateKbOpen(true)`（`client.js:21949-21954`）。
- 建库成功链：`confirmCreateKb`（`client.js:21507-21529`）成功后只更新 `kbs/kbId` 并弹 toast，**不置 phase**；零库下新建后仍停在空态，需手动「刷新」——C1 暂选乙要补的正是这一格。
- 会话面板：`setSessionOpen(true)`＋`refreshSessions()`（`client.js:21961-21975`）；`conversations/create` 成功后写绑定（`src/conversations.ts:189`），所以「会话」里新建的会话会自动绑定当前库。
- 现成件：`dshCloseIcon()`；关闭钮样式 `.hrag-rt-bannerclose` 24px（`client.js:2251`）；链接钮 `.hrag-ev-linkbtn`（`client.js:3217`）；focus ring 用法 `.hrag-chip`（`client.js:2506`）。

### 2.3 现有引导入口与词汇

- 已有引导都是「碰到才解释」：上传拦截 toast（嵌入 `client.js:22262`、MinerU `client.js:22285`）、运行时卡（`client.js:21828` 起）、设置面。没有一处把「完整使用要哪几步」一次说清。
- 词汇：设置页菜单叫「功能模型设置」（`client.js:790`），字段叫「向量提供方／向量模型／向量接口地址／API Key（向量）」（`client.js:931-934`）；zh 上传 toast 叫「嵌入模型」（`client.js:808`）——同物两名，本轮统一。
- 并行 R4（[MinerU 令牌首用指引 plan](../plans/2026-10-26-r4-mineru-token-guidance-plan.md)）已提交（`c67bbe7` 运行时检测、`680190a` 上传门与设置链接），给 PDF/Office/图片加了 MinerU 令牌门，文案路径是「功能模型设置 → 高级设置 → 解析提供方」。指南的 step 2 需要带一句条件提示；若 R4 撤线则删这句。

### 2.4 可见性矩阵

| 面板状态 | 顶栏 | 指南入口 | 处理 |
|---|---|---|---|
| loading / error | 无 | 无 | 由加载/错误卡负责 |
| 运行时 gate（托管未 ready） | 无 | 无 | 由运行时进度/错误卡负责 |
| ready（有库） | 有 | 顶栏「会话」左侧 | 主入口 |
| empty（零库） | 无 | 空态卡内「快速开始」链钮 | C1 暂选乙新增第二入口 |

## 3. 决策表

### D1 入口形态（拍定：甲）
- **甲（拍定）**：宽档 `[罗盘 14px] 快速开始` 浅底药丸；中/窄档 28×28 图标；零库空态另设文字链钮（D8）。
- 乙（不做）：纯 `?` 图标——10-26 他否：「没有焦点，用户不能一眼注意到」。
- 丙（不做）：收进 `⋯` 菜单——他要求常驻、一眼可见。

### D2 点的语义（拍定：甲）
- **甲（拍定）**：只在栏内图标档（<320）显示 5px 点，首次打开指南后消失；`localStorage['hrag-guide-seen']='1'`。空态链钮是文字，不渲染点；从任一入口打开都写 seen。
- 乙（不做）：直到三步完成——会话绑定是 per-session，会长期骚扰；且与现有状态面重复。

### D3 容器（拍定：甲）
- **甲（拍定）**：复用会话小面板浮层（fixed 320、越过面板左缘、外点/Esc 关闭）；锚点是触发入口（栏内钮或空态链钮），关闭后焦点回该入口。
- 乙（不做）：抽屉；丙（不做）：弹窗——读一次的低频内容，两个底座都太重。

### D4 内容（拍定：甲）
- **甲（拍定）**：一句自动说明＋三步＋一句尾注＋每步一个动作入口；空态上下文里 step 3 动作不渲染（步骤说明保留）。不写项目介绍、不复述六 tab。
- 乙（不做）：完整帮助文档/功能导览。

### D5 文案词汇（拍定：甲）
- **甲（拍定）**：zh 统一「向量模型」，zh 上传 toast 同改一行；EN 沿用设置页的 "embedding model"；MinerU 的条件提示复用 R4 的路径词。
- 乙（不做）：保留「嵌入模型」与「向量模型」两套叫法。

### D6 打开时机（拍定：甲）
- **甲（拍定）**：只手动打开；不自动弹；不做已完成勾选/进度。
- 乙（不做）：首启自动弹出/按步高亮。

### D7 互斥与焦点（拍定：甲）
- **甲（拍定）**：指南与会话小面板互斥；动作跳转前先关指南（焦点交给目标面）；×／外点／Esc 收起后焦点回触发入口；打开后焦点进卡内关闭钮；不做焦点陷阱。

### D8 零库空态入口（暂选：乙）
- **在问什么**：零库空态要不要成为指南的第二入口、要不要顺手补建库按钮。
- **乙（暂选）**：空态卡加「新建知识库」主按钮＋「快速开始」文字链钮；空态上下文里指南的 step 3 动作不渲染；`confirmCreateKb` 成功后置 `phase='ready'`，建库即进主面板。代价：多一个按钮/文案＋一步状态修复（约 20 行）。
- 甲（不选）：只加「快速开始」链钮，建库藏在指南 step 2 里；代价：用户要先点指南才发现建库，空态死路仍在。
- 丙（不选）：不改空态，指南只在有库时出现；代价：错过首跑受众，零库死路另立一笔。
- **选错后果**：甲保留发现成本；丙让本功能的核心受众看不到它。

## 4. 口径

### 4.1 入口与三档

```text
栏宽 ≥320    [产品文档库 ▾]          [◉ 快速开始] [◍ 会话] [⋯]
208–319      [产品文档库]             [◉] [◍ 会话] [⋯]
<208         [产品文档库]              [◉•] [◍] [⋯]
```

- 位置：`h(SessionEntryButton…)` 之前（`client.js:21961`）；`margin-left:auto` 从 `.hrag-sessionbtn` 移到指南钮，会话钮不再 auto；CSS 注释「顶栏三件」改「四件」。
- 三档测量：沿用 `barNarrow` 的 ResizeObserver 口径，新增 `barGuideWide`（栏宽 ≥320）。208 线不动。**测量必须绑到栏元素本身**：面板初始 `loading`、运行时 gate 还会让栏反复挂卸（`runtimeGate || content`，`client.js:22308`），只写 `[]` 或只写 `[phase]` 都可能漏测；用回调 ref 记录栏元素，再对其做 `ResizeObserver`＋`clientWidth`。
- 图标档（栏宽 <320）为库名让位：`.hrag-bar-compact` 隐藏 `.hrag-kbtrigger-chev`，`.hrag-bar` gap 由 8 降到 6；320 档恢复 chevron 与原 8px。实测库选择器可用宽：174→74、208→77、319→188、320→124（库名文字 174→66、208→69、319/320→75）。
- 药丸：height 28、padding 0 8、gap 5、radius `--dsw-radius-md`、底色 `--dsw-alias-bg-module-platform`、字 13/500 `label-primary`、图标 14px；实测宽 87px；hover 底色＝`color-mix(label-primary 6%, module-platform)`（照 `hrag-ev-graybtn`）；`aria-expanded="true"` 用同一 hover 底（照会话钮）。
- 图标档：28×28 同底色；点 5px、`--dsw-alias-state-business-primary`、right 2/top 2，叠 2px `bg-module-platform` 环把点与罗盘描边隔开；`guideSeen` 后不渲染。
- 键盘：`aria-haspopup="dialog"`、`aria-expanded`；focus-visible 用宿主 focus ring（照 `client.js:2506`）。

零库空态（C1 暂选乙）：

```text
┌ 暂无知识库 ───────────────────┐
│ 新建知识库后即可上传文档。      │
│ [新建知识库]  [刷新]            │
│ 快速开始 →                     │
└────────────────────────────────┘
```

- 「新建知识库」＝主按钮（`.hrag-btn-primary`），清空两输入后开现有新建弹层；「刷新」＝现有 outline 钮保留（外部建库后的刷新口）；「快速开始」＝文字链钮（`guide.entry`，照 `hrag-ev-linkbtn` 的链接词法，不渲染点）。
- `confirmCreateKb` 成功时置 `phase='ready'`（若仍在 empty）——不要求用户手动点「刷新」；`shell.emptyHint` 改为「新建知识库后即可上传文档。」/「Create a knowledge base to start uploading.」。
- 空态链钮打开指南时：`canBindSession=false`，step 3 的「绑定本会话」不渲染；「去配置」「新建知识库」照常。

### 4.2 浮层卡与交互

- 320 宽、fixed；右缘对齐触发入口；下方空间 <360（指南卡比会话卡高）且上方更大时翻上；max-height `min(480, 可用空间)`；正文区独立滚动。surface/阴影/圆角完全复用会话小面板（`--dsw-menu-surface-fill`、`--dsw-elevation-prominent`、`--dsw-radius-lg`）。
- 头部：标题「快速开始」13/600＋右侧 24px ghost 关闭钮（`dshCloseIcon()`，`aria-label`＝`rt.dismiss`）。
- 主体：序号圆 18px（底 `bg-module-platform`、12/600 `label-secondary`）＋标题 13/600＋说明 12/18 `label-tertiary`＋动作链钮 12/500 `label-primary` 下划线；步骤间 8px 纵距。
- 尾注：与主体间 0.5px `border-l2` 分隔；11/16 `label-tertiary`。
- 关闭：外点／Esc／×；收起后焦点回触发入口；动作跳转不回焦。互斥：打开指南先关会话小面板，反之亦然。
- 动作：
  - 去配置 → 关指南 → `openSettings(false)`。
  - 新建知识库 → 关指南 → 清空输入 → `setCreateKbOpen(true)`。
  - 绑定本会话 → 仅 `canBindSession` 时渲染：关指南 → `setSessionOpen(true)`＋`refreshSessions()`。
- 焦点：打开后 focus 关闭钮（宿主在面板打开后会把焦点交回聊天输入，聚焦延后一拍）；×／外点／Esc 收起后 focus 回触发入口；动作跳转不回焦；不做焦点陷阱。
- 首开写点：任一入口打开都写 `hrag-guide-seen='1'`、置 `guideSeen=true`（写失败静默）。

### 4.3 文案（zh／en 全文）

| 键 | zh | en |
|---|---|---|
| guide.entry / guide.title | 快速开始 | Quick start |
| guide.lead | 完成下面三步就能完整使用 RAG；本地服务的下载、启动与模型同步都是自动的。 | Three steps and RAG is fully usable. Downloading and starting the local service, and syncing models, all happen automatically. |
| guide.step1.title | 配置向量模型 | Set up the embedding model |
| guide.step1.body | 在 ⋯ →「功能模型设置」里填向量提供方、向量模型、向量接口地址与 API Key（向量）。这是必须手动填的一步。 | In ⋯ → “Functional model settings”, fill in the embedding provider, embedding model, endpoint and API key (embedding). This is the one step that needs manual input. |
| guide.step1.action | 去配置 | Open settings |
| guide.step2.title | 建库并上传 | Create a library and upload |
| guide.step2.body | 新建知识库，从 ⋯ →「上传文档」添加文件；切块与向量化自动完成，等文档状态变成「就绪」。PDF / Office / 图片若提示缺少解析令牌，按提示在「功能模型设置 → 高级设置 → 解析提供方」补填 MinerU 令牌。 | Create a knowledge base, then add files via ⋯ → “Upload document”. Chunking and embedding run automatically; wait until documents show “Ready”. If PDF / Office / images report a missing parse token, add the MinerU token under “Functional model settings → Advanced → Parse provider” as prompted. |
| guide.step2.action | 新建知识库 | New knowledge base |
| guide.step3.title | 绑定本会话 | Bind this session |
| guide.step3.body | 在顶栏「会话」里选择知识库；绑定后本会话的对话自动使用该库检索。在「会话」里点「新建」的会话会自动绑定当前库（宿主里另建的会话要在这里再绑一次）。 | Choose a knowledge base under “Session” in the top bar; chat then uses retrieval from it automatically. Sessions created with “New” in “Session” bind the current library for you (sessions created elsewhere in DSH need to be bound here). |
| guide.step3.action | 绑定本会话 | Bind this session |
| guide.tail | 图谱、Wiki、评测等面板不影响基本使用，需要时再看。 | Graph, Wiki and Eval panels do not affect basic use; explore them when needed. |

- 关闭钮的 `aria-label`/title 复用 `rt.dismiss`（关闭／Dismiss）。
- zh toast 改：`upload.needEmbedding` →「先配置向量模型，再上传文档」；EN 不动（"embedding model" 与设置页 EN 一致）。
- 空态提示改：`shell.emptyHint` →「新建知识库后即可上传文档。」/「Create a knowledge base to start uploading.」。
- MinerU 条件句以 R4 落地为准；R4 撤线时删这一句，其余不变。

### 4.4 持久与容错

- `hrag-guide-seen`：值 `'1'`；挂载时读一次（读抛错视为未看过），打开时写；写失败不影响本次打开。
- 多窗口不同步（与 `hrag-kb-order`、`hrag-doc-table-prefs.*` 同姿态）。
- 点只在栏内图标档出现；宽档文字与空态链钮本身就是焦点，不渲染点。

### 4.5 视觉与无障碍

- 只走现有 token，不新增底色层；深浅色一致。
- 图标用罗盘（circle＋needle，14px、描边 1.5），不新增图标库。
- 空态：主按钮＋outline 刷新＋文字链钮；按钮行 gap 8，链钮另起一行。
- 入口钮、空态链钮、关闭钮、动作链均可用 Tab 到达；Esc 从卡内关闭；focus ring 可见。

## 5. 验收

1. **三档与边界**：真浏览器量 ≥320／208–319／<208 三档，外加 319/321、207/209 边界——药丸全显、指南图标、会话文字让位、图标档库 chevron 收起；无横向溢出；库选择器可用宽：≥320 ≥120（实测 124）、208–319 ≥77（实测 208=77）、<208 ≥74（实测 174=74）；库名文字 174 档 66、208 档 69、≥319 档 75。
2. **零库首跑**：零库面板显示空态卡（无顶栏），卡内「新建知识库」「刷新」「快速开始」齐全；点快速开始能开卡、step 3 动作不渲染、去配置/新建动作可用；点新建并创建成功后直接进主面板（顶栏出现、新库选中），不要求手动刷新；从顶栏再开指南时 step 3 动作存在；删掉最后一个库能回到该空态。
3. **点与持久**：首开前栏内图标档有点；打开一次后消失，reload 仍在；清 `hrag-guide-seen` 后复现；宽档与空态链钮始终无点。
4. **浮层**：198px 下卡宽 320、越过面板左缘不被裁；下方 <360 时翻上；外点/Esc/× 关闭；打开不动当前 tab、顶栏 top 不变；点与罗盘不互相压住。
5. **动作与互斥**：栏内指南→去配置落功能模型设置（基本区）、新建知识库落空输入弹层、绑定本会话落会话小面板且列表刷新；空态指南不出现绑定动作；指南与会话小面板不同时开。
6. **文案**：zh/en 全文一致；字段名与设置页一致；MinerU 条件句路径与 R4 一致；空态提示已改；zh 上传 toast 已改「向量模型」。
7. **回归**：库选择器、会话钮、`⋯` 菜单、六 tab、拖拽、运行时卡、上传拦截行为/布局零变化（嵌入 toast 仅 zh 一词按 §4.3 改；MinerU toast 属 R4，不动）；键盘 Tab/Enter/Esc 可用；删最后一个库后的空态可用。
8. **门禁**：`node --check client.js`；`node --test tests/*.test.ts` 全绿；`node node_modules/typescript/bin/tsc -p tsconfig.json` 零错；真 DSH 面板内完成 1–7。
9. **并行面**：指南提交只含自己的改动；不夹带其他并行会话的在途改动；引擎 `harness-rag` 与主树 `deer-flow` 零 diff。

## 6. 影响面

- 只 `client.js`：新增一个栏内入口、一个空态第二入口与建库闭环、一个浮层组件、一段测量状态、窄档库 chevron/栏距调整、13 条 zh/en 词条、1 个 localStorage 键、建库成功链一行；实测 +347／−7 行。
- 不改 host 半/引擎/后端，不改运行时状态机、存储文件、工具面。
- zh 上传 toast 一词、空态提示一句与入口词汇对齐；MinerU 条件句依赖已提交的 R4。
