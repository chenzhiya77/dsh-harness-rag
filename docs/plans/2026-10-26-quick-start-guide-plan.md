# 面板「快速开始」引导 Plan

**Status:** 已实施 · 已发布（2026-10-26；feat 2eca02b / docs a8b0999；随 `v0.1.2` 发布 2026-10-27；隔离沙箱验收完成，用户实例真栈与上传/拖拽回归仍待复核）
**Date:** 2026-10-26
**配套 spec:** [2026-10-26-quick-start-guide-spec.md](../specs/2026-10-26-quick-start-guide-spec.md)（D1–D7 已拍、D8 暂选乙；C1 暂选乙＝零库空态加建库主按钮＋指南链钮；五件范围、验收 1–9）
**Architecture:** 纯 `client.js`：栏内入口钮＋零库空态第二入口＋320 锚定浮层；定位/关闭/互斥照会话小面板词法，动作复用 `openSettings(false)`／`setCreateKbOpen`／`setSessionOpen`；图标档（<320）收起库 chevron＋栏距 6px 保库名，浮层聚焦延后一拍避开宿主聊天输入；另补建库成功链一行 `phase='ready'`、13 条 zh/en 词条、1 个 `localStorage` 键与空态/上传 toast 各一句词。不动 host 半与引擎。实测 `client.js` +347／−7 行。

## 范围与交接

- 五件：栏内主入口、零库空态第二入口（C1 暂选乙）、320 浮层卡、三档让位、seen 与词汇统一。
- 前置：R4 已提交（`c67bbe7` 运行时检测、`680190a` 上传门与设置链接、`367d379` lib 重建），当前 HEAD 的 `openSettings(advanced)` 可直接复用。
- 验证：隔离 DSH 沙箱（`DSH_HOME=E:/app/python/agent/dsh-harness-rag-sbx2`，端口 3081，external backend `127.0.0.1:18080`）；用户正在跑的 3080 实例未触碰。
- 工作树交接：`client.js` 为本功能改动；本对 spec/plan 未跟踪；并行会话另改了 `docs/plans/2026-10-26-r4-mineru-token-guidance-plan.md`（不属本笔，提交时排除）。

## 硬约束（执行期注意）

- **文案逐字**：spec §4.3 全表为准；字段名「向量提供方／向量模型／向量接口地址／API Key（向量）」与设置页一致；MinerU 条件句以 R4 已落地路径为准。
- **测量口径**：三档按栏宽 `clientWidth`，不是窗口宽；`barGuideWide` 阈值 320。测量绑到栏元素本身（稳定回调 ref＋`ResizeObserver`），因为面板初始 `phase='loading'`、运行时 gate 还会让栏反复挂卸（`runtimeGate || content`）；只写 `[]` 或只写 `[phase]` 都可能漏测。
- **窄档口径**：图标档（<320）`.hrag-bar-compact` 隐藏库 chevron、栏距 6px；320 档恢复 chevron 与原 8px。208 线仍只管会话文字。
- **动作口径**：去配置必须 `openSettings(false)`（重置高级档、落基本区）；三个动作跳转前先关指南。
- **空态口径**：零库时 step 3 动作不渲染（步骤说明保留）；`confirmCreateKb` 成功时若仍在 `empty` 则置 `ready`。
- **焦点口径**：打开后聚焦关闭钮，但宿主会把焦点交回聊天输入——延后一拍再落；外点/Esc/× 收起后回触发入口，动作跳转不回焦。
- **不自动弹、不做完成勾选/进度联动、不写项目介绍**；不读运行时/模型/库/会话状态做门控。
- **提交候令**：英文 Conventional ASCII；不推送；只 `git add client.js` 与本对两文件；不卷入并行 R4 plan；提交前核 `git status` 与 `git diff --cached --stat`。

**校验口径**：纯 UI，无新增单测；门禁＝`node --check client.js`＋既有全量测试零退＋仓外 hostless 探针＋隔离 DSH 真栈三档实测。

---

## Task 0 — 落点核实（只读＋回填）

> 动到的文件：无。
> **验收对应**：spec §2 全部现状引用、§5 1–2。

- [x] 工作树基线：开工时仅本对两文件未跟踪；R4 已在 HEAD（`c67bbe7/680190a`）。执行中并行会话提交 `367d379` 并修改 R4 plan——按最新行号实施，提交排除 R4 plan。
- [x] 顶栏插入点：`.hrag-bar`、`h(SessionEntryButton…)`、`.hrag-sessionbtn` 28px、`margin-left:auto` 现挂会话钮；指南钮插到会话钮前、auto 边距移走后 `⋯` 仍贴右。
- [x] 三档测量：`barNarrow` 阈值 208、依赖 `[phase]`、`ResizeObserver`；新增独立测量不改它；确认栏在 `runtimeGate || content` 下会反复挂卸——测量绑栏元素。
- [x] 浮层底座：`SessionPopover` 定位（右缘对齐、`below < 280` 翻上、`max-height min(480, 剩余)`、resize/scroll 重测）；z 帧 backdrop 69／卡 70；设置面 overlay 70／panel 71——跳设置前先关指南。
- [x] 动作面：`openSettings(advanced)`、菜单调用 `openSettings(false)`；清空两输入＋`setCreateKbOpen(true)`；会话 `onOpen`＝`setSessionOpen`＋`refreshSessions`。
- [x] 空态与建库链：`phase` 初始 `'loading'`；`load()` 置空态；空态分支只有标题/提示/「刷新」，无顶栏、无建库钮；`confirmCreateKb` 成功只更新 `kbs/kbId`，不置 phase。
- [x] 现成件与 token：`dshCloseIcon()`、24px `.hrag-rt-bannerclose`、链接钮 `.hrag-ev-linkbtn`、focus ring、`.hrag-btn-primary`、`bg-module-platform`、`state-business-primary`。
- [x] 图标底座：lucide 助手区；不引图标库，新增 `lucideCompassIcon` 同区。
- [x] 词典与持久：zh/en 两份词典；`rt.dismiss`；`upload.needEmbedding`；`shell.emptyHint`；键常量区 `LAST_KB_KEY`/`KB_ORDER_KEY`。
- [x] 仓外探针：旧 `client-probe.mjs` 的 `SessionDrawer` 已不存在（现为 `SessionPopover`），过期；另建 guide 专用探针 `E:/appdevelop/hrag-probe/guide-probe.mjs`。
- [x] 基线数字：198px 面板下栏宽 174；无指南时库名 75；加指南未调时 42；compact 后库名 66、库选择器可用宽 74。

**实测（2026-10-26）**：开工基线仅本对未跟踪；R4 已在 HEAD；并行会话在执行中提交 `367d379` 并改 R4 plan。三档阈值最终采用 320，实测药丸 87px；探针另起 guide-probe。

## Task 1 — 入口控件与三档测量（spec §4.1 / D1 / D2）

> 动到的文件：`client.js`（`lucideCompassIcon`、`GuideEntryButton`、`.hrag-guidebtn`/`.hrag-bar-compact` CSS、测量 effect、`hrag-guide-seen` 读取、`guide.entry/title` 词条）。
> **验收对应**：spec §5 1、3。

- [x] `lucideCompassIcon(size=14)`：circle＋needle，24 viewBox、stroke 1.5；放在 lucide 助手区。
- [x] `GuideEntryButton({ t, wide, seen, open, onOpen })`：宽档＝罗盘 14px＋「快速开始」；中/窄档＝28×28 图标；未看过且非宽档时渲染 5px 点；`aria-haspopup="dialog"`、`aria-expanded`、`aria-label`/title。
- [x] CSS（照 `.hrag-sessionbtn` 词法新增 `.hrag-guidebtn`）：28px、`--dsw-radius-md`、`bg-module-platform`、13/500、宽档 padding 0 8＋gap 5、图标档 28×28、hover 6% 混合、focus-visible 宿主 ring；`aria-expanded="true"` 同 hover 底。
- [x] 窄档让位：`.hrag-bar-compact`（`!barGuideWide`）隐藏 `.hrag-kbtrigger-chev`、`.hrag-bar` gap 6；320 档恢复 chevron 与原 8px。
- [x] 点：`.hrag-guidebtn-dot` 5px `state-business-primary`、right 2/top 2，叠 2px `bg-module-platform` 环；`guideSeen` 后不渲染。
- [x] 顶栏接线：在会话钮前渲染；`margin-left:auto` 移到指南钮；`.hrag-bar` 在 `!barGuideWide` 时加 `hrag-bar-compact`；注释「三件」改「四件」；DOM 子序＝库选择器→指南→会话→`⋯`。
- [x] 测量：稳定 `useCallback` 回调 ref 记录栏元素（同时喂 `toastAnchorRef`），`useLayoutEffect` 依赖 `[barEl]` 量 `clientWidth >= 320`，挂 `ResizeObserver`；不动 208 原 effect。
- [x] 持久读取：`GUIDE_SEEN_KEY='hrag-guide-seen'`；`readGuideSeen()` try/catch；`useState(readGuideSeen)`。
- [x] 词条：`guide.entry`/`guide.title` zh/en。
- [x] 门禁：`node --check client.js`；guide-probe 宽/窄 class 与点断言通过。

**实测（2026-10-26）**：pill 87×28；174/208/319/320/321/600 档实测见 Task 5；layout effect 首帧无图标→药丸闪。

## Task 2 — 浮层卡、动作与互斥（spec §4.2 / D3 / D7）

> 动到的文件：`client.js`（`GuidePopover`、`guideOpen`/锚点状态、动作接线、卡片 CSS/词条）。
> **验收对应**：spec §5 4–5。

- [x] `GuidePopover({ t, anchorRef, canBindSession, onClose, onSettings, onNewKb, onBindSession })`：fixed 320、右缘对齐、下方 <360 翻上、max-height `min(480, 剩余)`、正文滚动；surface/阴影/圆角照 `SessionPopover`。
- [x] 渲染位置：与 `SessionPopover` 同级（面板根层，不在 `runtimeGate || content` 内），空态与 ready 都能挂卡。
- [x] 结构：标题 13/600＋24px ghost ×；主体序号圆 18px＋标题 13/600＋说明 12/18＋动作链钮 12/500 下划线；尾注 0.5px `border-l2` 分隔；`role="dialog"`＋`aria-label`。
- [x] 状态与互斥：`guideOpen`＋`guideAnchorRef`＋`guideFromEmpty`；`openGuide(el)` 统一入口；打开指南先关会话；会话钮 `onOpen` 先关指南。
- [x] 关闭：backdrop 外点、Esc、×；`closeGuide({ restoreFocus: true })` 统一出口；动作跳转 `restoreFocus: false`。
- [x] 焦点：打开后 focus ×（延后 0ms，避开宿主聊天输入）；不做焦点陷阱。
- [x] 动作：去配置→关指南→`openSettings(false)`；新建知识库→关指南→清空两输入→`setCreateKbOpen(true)`；绑定本会话→仅 `canBindSession` 时渲染→关指南→`setSessionOpen(true)`＋`refreshSessions()`。
- [x] 首开写点：`openGuide()` 写 `hrag-guide-seen='1'`、`setGuideSeen(true)`（失败静默）；两个入口共用。
- [x] 词条：`guide.lead`、step1–3、`guide.tail` zh/en 按 spec §4.3 逐字。
- [x] 门禁：`node --check`；guide-probe 打开顺序/动作/点消失/空态无绑定断言通过。

**实测（2026-10-26）**：198 面板下卡 320×388（y=84）；空态从链钮开时翻上（y=190、h=282）；焦点落 ×，Esc/外点/× 回入口；三动作分别落设置基本区、新建弹层、会话面板；互斥双向通过。

## Task 3 — 零库空态第二入口与建库闭环（spec §2.1 / §4.1 / D8 / 验收 2）

> 动到的文件：`client.js`（空态分支、`confirmCreateKb` 一行、`shell.emptyHint`、链钮/按钮行 CSS）。
> **验收对应**：spec §5 2、7。

- [x] 空态卡：标题＋`shell.emptyHint`＋「新建知识库」主按钮＋「刷新」outline 钮＋「快速开始」文字链钮（不渲染点）。
- [x] 空态链钮：`openGuide(linkEl)` 并置 `guideFromEmpty=true`；浮层 `canBindSession=false`，step 3 动作不渲染（标题/说明保留）。
- [x] 建库闭环：`confirmCreateKb` 成功分支在 `created && created.id` 内、`setKbId` 之后，若 `phase==='empty'` 则 `setPhase('ready')`（无 id 的异常响应不切）。
- [x] 空态提示改：`shell.emptyHint` zh/en 按 spec §4.3。
- [x] 样式：主按钮与刷新钮同一行、gap 8；链钮另起一行；不新增底色层。
- [x] 删除最后一个库回空态；从空态再建库可重复闭环。
- [x] 门禁：`node --check`；guide-probe 空态三控件/无绑定动作断言通过。

**实测（2026-10-26）**：空态三控件与文案正确；空态指南 2 actions（无绑定）；主按钮建库后 phase→ready、顶栏出现、新库选中；删最后库回空态。

## Task 4 — 词汇对齐与文案审计（spec §4.3 / D5）

> 动到的文件：`client.js`（zh toast 一行；词条审计）。
> **验收对应**：spec §5 6。

- [x] zh `upload.needEmbedding` →「先配置向量模型，再上传文档」；EN 不动。
- [x] 逐字核 spec §4.3 全表：zh/en 各 13 键齐全、无重复键、无旧键残留。
- [x] 设置页词汇对照：菜单「功能模型设置」、字段「向量提供方／向量模型／向量接口地址／API Key（向量）」；指南不出现「嵌入」。
- [x] MinerU 条件句路径与 R4 一致：「功能模型设置 → 高级设置 → 解析提供方」。
- [x] 空态提示与 zh toast 同轮核对。
- [x] 门禁：guide-probe 键集/值/词汇扫描通过；`node --check`。

**实测（2026-10-26）**：guide-probe OK（13 keys×2、zh toast/emptyHint/MinerU 路径断言）。

## Task 5 — 门禁与真栈验收（spec §5 1–9）

> 动到的文件：无（探针/截图/测量记录在仓外）。
> **验收对应**：spec §5 全部。

- [x] `node --check client.js`；`node --test tests/*.test.ts` 310/310 通过；`node node_modules/typescript/bin/tsc -p tsconfig.json` 零错。
- [x] 仓外 hostless 探针 `guide-probe.mjs`：13 键×2、入口宽/窄与点、浮层 3 步/动作/关闭/空态无绑定动作全部通过。
- [x] 隔离 DSH 沙箱（3081，external backend 18080）完成真栈手验；用户 3080 实例未触碰。
- [x] 三档＝**栏宽** 174／320／600 实测：

  | 栏宽 | 指南形态 | 库名宽 | 药丸宽 | 顶栏 top（开/关卡） |
  |---|---|---|---|---|
  | 174 | 图标 28（未看过带点） | 66（6 字名） | — | 50/50 |
  | 320 | 药丸 | 75（6 字名全显） | 87 | 50/50 |
  | 600 | 药丸 | 75（6 字名全显） | 87 | 50/50 |

- [x] 边界：319/321 与 207/209 逐档确认——药丸全显/图标切换、会话文字让位、图标档 chevron 收起、无横向溢出；库选择器可用宽 174=74、208=77、320=124。
- [x] 零库首跑：空态卡无顶栏但三控件齐全；快速开始开卡、step 3 动作不渲染、去配置/新建可用；主按钮建库成功后直接进主面板；从顶栏再开指南 step 3 动作存在；删最后库回空态。
- [x] 点：首开前图标档有点→打开后消失→reload 仍在→清 `hrag-guide-seen` 复现；宽档与空态链钮始终无点。
- [x] 浮层：198 下卡 320 越过面板边缘不被裁；空态链钮开卡翻上；外点/Esc/× 关闭；开卡不切 tab、顶栏 top 不变；点与罗盘不互相压住。
- [x] 动作三落点＋互斥；zh 文案；zh toast 已改「向量模型」；空态提示已改。
- [x] 回归（已跑）：库选择器（<320 收起 chevron 但菜单可开）、会话钮、`⋯` 菜单、六 tab、focus 回焦、互斥。
- [ ] 回归（未跑）：上传/拖拽/运行时卡真跑——沙箱无解析链；本笔对这三条路径零改动，待用户实例复核。
- [x] 阈值复核：320 档库选择器可用宽 124（≥120），不调阈值；药丸实测 87 与估算一致。
- [x] 引擎 `harness-rag` 与主树 `deer-flow` 零 diff；仓面只 `client.js`＋本对 spec/plan（另有并行 R4 plan 修改，排除）。

**实测（2026-10-26）**：门禁 310/310＋tsc 零错＋guide-probe OK；隔离沙箱三档/边界/空态/点/浮层/动作/互斥/库菜单/tab 全部通过。未跑：用户 3080 实例真栈、上传/拖拽/运行时卡（代码面零改动）。证据截图：`E:/appdevelop/hrag-probe/shot-dot.png`、`shot-guide-198.png`、`shot-wide-320.png`。

## Task 6 — 收口（spec §5 / 三源交叉）

> 动到的文件：本 spec/plan（状态与实测回填）。
> **验收对应**：spec §5 8–9。

- [x] 回填 spec Status、plan Status 与各 Task 实测；勾选与 Status 不滞后。
- [x] 逐条核验收 1–9，未做项显式标残差（用户实例真栈、上传/拖拽/运行时卡）。
- [x] 提交前核：`git status --short` 只 add `client.js`＋本对两文件；不卷入并行 R4 plan；`git diff --cached --stat` 与预期一致。
- [x] 提交后核：Status 不写「未提交」；仓面零残留；不推送。

**实测**：两笔已提交（`2eca02b`、`a8b0999`）；状态回填 `4dc7883`；已随 `v0.1.2` 发布（2026-10-27，tag `b877623`，与并行 R4 同发，无运行时资产）；用户实例真栈与上传/拖拽回归仍待复核。

## 提交链

> 已提交；英文 Conventional ASCII；不推送。哈希随落随记。

1. `feat(panel): add the quick start guide` —— `client.js`（入口、浮层、空态第二入口与建库闭环、窄档让位、词条）—— `2eca02b`。
2. `docs(guide): record the quick start guide contract` —— `docs/specs/2026-10-26-quick-start-guide-spec.md`＋`docs/plans/2026-10-26-quick-start-guide-plan.md` —— `a8b0999`。

- 验收中的文案/几何微调并入第 1 笔，不落第三笔。
- 提交后状态回填另落一笔（`docs(guide): mark the quick start guide submitted`，哈希见 git log）。
- 实测回填：第 1 笔 `2eca02b`；第 2 笔 `a8b0999`。
