# 面板 · 评测/投影/召回交互收口 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-21-eval-vector-recall-spec.md](../specs/2026-10-21-eval-vector-recall-spec.md)
**Status:** ✅ 收官（2026-10-21，**D1／D2 已拍：均丙**；Task 0–5 全毕；他手验真跑全过；定稿两笔提交，未推——仓无 remote）。
**Architecture:** 纯前端。评测表＝CSS 特异性修正＋汇总补偿；投影＝三个 props＋分发（wiki／card 就地抽屉、entity 走 D2 丙）；召回＝迷你图 click 判别＋切图谱 tab 定位并开完整抽屉（D1 丙）。零后端、零 API、零 host 半改动。

**硬约束**：只改插件仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 只读零改动；后端零改动；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。工作区并行未提交件（`src/model_sync.ts`、`tests/model_sync.test.ts`、`2026-10-21-dsh-model-proxy-*`）不触碰、不纳入。几何以真浏览器实测为准，不靠估算。与文档表对（`2026-10-21-doc-table-interactions-*`）并行，互不并入。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 真浏览器量评测表：面板 570／740／满宽三档，逐列记录 th 文本左缘／右缘、td 数字右缘、汇总胶囊文字右缘，量出错位像素；截图对照当前错位态。
- [x] 复读锚点：CSS（`client.js:2554`／`2556`／`2568`／`2549`／`2542`／`2570`）；检索质量表（`client.js:10307-10362`）；题库表（`client.js:11484`／`11492`／`11551`／`11554`）；历史表（`client.js:12737`／`12854`）。
- [x] 投影：拾取（`client.js:6341`）、分发（`client.js:6828-6833`）、挂载（`client.js:18331-18339`）、抽屉壳（`client.js:17764`／`18428-18460`）、召回先例（`client.js:18291-18309`）。
- [x] 召回：数据形状（`client.js:4942-4964`）、拖拽（`client.js:5209-5231`）、事件（`client.js:5248-5251`）、大图判别（`client.js:7471`）、focusNode（`client.js:7524`／`7312-7342`）、抽屉依赖（`client.js:7542`／`7808` 起）、挂载（`client.js:5658-5664`）。
- [x] 工作台参照：`recall-graph-mini.tsx:80`／`:83`、`graph-tab.tsx:365`、`graph-canvas.tsx:234-237`、`vector-tab.tsx:362-371`、`vector-canvas.tsx:424-431`／`481-500`。
- [x] 复核 D1 丙落点：迷你图拖拽判别、父级 section 切换与 nonce 请求、`GraphView` 图就绪后的 `selected`／`focusNode` 消费、图空／失败／目标缺失三个边界；共享缓存不做（§7）。

**实测**（2026-10-21，只读）：
- 环境：DSH 运行中（PID 40156），无 CDP 端口（9222／9223／9333 探测无响应）；不整重启 ⇒ 真机几何改由 Chromium 加载插件同款 CSS/DOM 复刻页实测（仓外 `C:\Users\h7242\AppData\Local\Temp\hrag-task0-probe.html`，宿主 token 用近似色值）。本环境截图不可用，改用数值测量；真机视觉留 Task 4 真跑。
- 复刻页三档（容器宽 570／740／1000，表宽同）：表头文字右缘 − 数值右缘，四列依次——
  - 570：63.1／43.7／71.7／45.3 px；加修正后 0／0／0／0。
  - 740：96.3／76.8／104.8／80.3 px；加修正后 0／0／0／0。
  - 1000：146.9／127.5／155.5／133.8 px；加修正后 0／0／0／0。
- 汇总胶囊文字右缘 vs 事实行数字右缘：修正前恒 −6px；修正后 0。
- 修正实测：`.hrag-ev-table th.hrag-ev-th-num{text-align:right}` 与 `.hrag-ev-tr-summary .hrag-ev-capsule{margin-right:-6px}` 均生效；列宽随右对齐轻微重分配（570 档首列 111.1→105.2），表宽不变。`.hrag-ev-th-sort` 需同规则覆盖（同源 0,1,0 被 th 压住）。
- 大图点击判别口径：`startX／startY＋moved`，曼哈顿阈值 >3px，抬手未移动才触发 click（`client.js:7442-7472`）；迷你图缺 `startX／startY／moved` 与抬手回调（`5209-5231`），Task 3 照抄大图。
- D1 丙落点：`GraphView` 四态（`7724-7742`）；`setFocusNode` 由搜索使用、带 token 去重（`7638`／`7312-7342`）；请求消费有 overlay nonce 先例（`7602-7608`）；父级 section 切换与请求先例（`18305-18308`）。边界：loading＝等 ready；empty／error＝停既有态；目标 id 缺失＝不开抽屉。
- 工作台参照复核与 §2 一致，无新差异。

## Task 1 — 评测表对齐（4.1）

> 动到的文件：`client.js`（评测表 CSS 两三条）。

- [x] 补更高特异性的 th 右对齐规则，同时覆盖 `.hrag-ev-th-sort` 的同源问题。
- [x] 汇总胶囊文字右缘补偿（`margin-right:-6px` 或等价），造型与配色不动。
- [x] 三档截图：表头与数字同缘、汇总胶囊同缘、无列宽跳动；题库／历史两表回归无错位。
- [x] 门禁：`node --check client.js`；冒烟默认与 `SMOKE_HOSTLESS=1`。

**实测**（Task 1，2026-10-21）：
- **落点**：`client.js` Styles() 在 `.hrag-ev-tr-summary` 后新增两条——`.hrag-ev-table th.hrag-ev-th-num, .hrag-ev-table th.hrag-ev-th-sort { text-align: right; }`（0,2,1 压过 th 的 0,1,1）与 `.hrag-ev-tr-summary .hrag-ev-capsule { margin-right: -6px; }`（0,2,0 压过胶囊基类）。
- **几何**（Chromium 同款 CSS/DOM 复刻页，570／740／1000；本环境截图不可用，改用数值）：修正后表头文字右缘−数值右缘四列全为 0；汇总胶囊文字右缘−事实行数字右缘为 0（修正前恒 −6）。表宽不变，列宽轻微重分配（570 档首列 111.1→105.2）。
- **门禁**：`node --check client.js` 过；冒烟默认 **79 PASS／0 FAIL**、`SMOKE_HOSTLESS=1` **79 PASS／0 FAIL**，末尾 `ALL CLIENT SMOKE CHECKS PASSED`。
- **未做**：真机截图与题库／历史表视觉回归留 Task 4 真跑；两表共用同一套类，本修只改表头对齐方向。

## Task 2 — 投影点点击补线（4.2）

> 动到的文件：`client.js`（`VectorView` props／`onPick` 分发／父级接线）。

- [x] `VectorView` 增 `onOpenWikiEntry`／`onOpenManualCard`／`onOpenEntity`；父级挂载处接到 `wikiDrawer` 与 `openEntityInGraph`。
- [x] `onPick` 按 `source_type` 分发：chunk 走既有切片抽屉；wiki／card 开面板级条目／卡片抽屉；entity 同走丙（D2）。
- [ ] 手验四类点；图例显隐、搜索叠加、hover 聚焦、keep-alive 状态回归。
- [x] 门禁：`node --check client.js`；冒烟默认与 `SMOKE_HOSTLESS=1`。

**实测**（Task 2，2026-10-21）：
- **落点**：`VectorView` 签名加三 props（`client.js:6419`）；`onPick` 增加 wiki／card／entity 分支（`client.js:6845-6856`）；父级投影挂载接 `setWikiDrawer` 与 `openEntityInGraph`（`client.js:18384-18387`），抽屉壳沿用面板级（`18428-18460`）。
- **口径**：chunk 保持原调用；wiki→`onOpenWikiEntry(point.id)`；card→`onOpenManualCard(point.id)`；entity→`onOpenEntity(point.id)`（id＝实体名），复用 D2 丙切图谱＋完整抽屉；召回与投影共用 `openEntityInGraph`（`client.js:17869`）；图例／叠加／hover／keep-alive 代码未动。
- **门禁**：`node --check client.js` 过；冒烟默认 **79 PASS／0 FAIL**、hostless **79 PASS／0 FAIL**（D2 后复跑）。
- **未做**：真面板手验（需重开面板载入新 client 半）——留 Task 4。

## Task 3 — 召回实体详情（D1 丙）

> 动到的文件：`client.js`（迷你图 click 判别／`RecallView` 透传／父级请求与 section 切换／`GraphView` 请求消费）。

- [x] 迷你图补「拖拽 vs 点击」判别（照大图 `drag.moved`），命中节点且未拖动才触发 `onOpenEntity`。
- [x] 父级发实体定位请求（nonce 去重）并切到 `graph`；`GraphView` 在图就绪后按 id 开抽屉＋`focusNode` 定位，同一请求只消费一次。
- [x] 边界：图加载中等待就绪；图空／失败停既有态；目标缺失不开抽屉。
- [ ] 手验：点实体→切 tab 并开抽屉；拖节点／平移／缩放松手不误触；tooltip 不变；返回召回 tab 结果与选择集保持。
- [x] 门禁：`node --check client.js`；冒烟默认与 `SMOKE_HOSTLESS=1`。

**实测**（Task 3，2026-10-21）：
- **迷你图**：`RecallGraphMini` 加 `onOpenEntity`（`client.js:4950`）；按下记 `startX／startY／moved`（`5218-5221`），移动曼哈顿和 >3px 置 `moved`（`5177-5180`，照大图 `7405`）；`handleUp` 在未移动时拾取节点并回调（`5238-5246`），`onMouseUp` 改挂 `handleUp`（`5263`），拖拽／平移／缩放松手不触发。
- **请求链**：`RecallView` 透传（`5319`／`5677-5680`）；父级 `graphEntityRequest` 状态（`17862-17863`）与切 section（`18339-18342`）；`GraphView` 新增 `entityRequest`（`7539`）＋`entityNonceRef`（`7556`），图就绪后按 id 找节点、`setSelected`＋`setFocusNode`（`7633-7643`）；切库清请求与 ref（`17925`／`7590`）。
- **边界**：loading 等 `graph` 就绪再消费；empty／error 时 `graph` 为 null，停在既有态；目标 id 缺失只消费 nonce、不开抽屉；请求带 `kbId` 防跨库串用。
- **门禁**：`node --check client.js` 过；冒烟默认 **79 PASS／0 FAIL**、hostless **79 PASS／0 FAIL**。
- **未做**：真面板手验（需重开面板）——点实体切 tab／拖拽不误触／tooltip／返回召回状态保持，留 Task 4。

## Task 4 — 门禁与真栈验收

> 动到的文件：无（探针与截图仓外）。

- [x] `node --check client.js`；全部 `src/*.ts` 跑 `--experimental-strip-types --check`；冒烟默认与 `SMOKE_HOSTLESS=1` 全绿。
- [x] 重开面板（client 半；整重启非必需）后真跑：570／740／满宽三档评测表；投影 chunk／wiki／card 三类点；entity 点（切图谱＋抽屉）；召回点实体（切图谱 tab＋抽屉）。
- [x] 回归：图例显隐、搜索叠加、切片抽屉、条目／卡片抽屉、keep-alive、上传链、文档表（另一对未开工时应零变化）。
- [x] 确认 `git status` 中本对范围＝`client.js`＋本对文档＋`equivalence.md`（并行件单列、不纳入）；deer-flow 主树与后端零 diff。

**实测**（Task 4，2026-10-21）：
- **门禁**：`node --check client.js` 过；`src/*.ts` 6 件 strip-types 全过；冒烟默认 **79 PASS／0 FAIL**、hostless **79 PASS／0 FAIL**（D2 后复跑同值）。
- **改动面**：本对工作区＝`client.js`＋本对 spec／plan＋`docs/equivalence.md`；另有他线未提交件（`src/model_sync.ts`、`tests/model_sync.test.ts`、`2026-10-21-dsh-model-proxy-*`、`2026-10-21-rag-leg-effort-*`）及未跟踪 `node_modules/`、`tsconfig.tsbuildinfo`，不属本对、不纳入；deer-flow 主树与后端本次零写入。
- **真跑**（他手验，2026-10-21）：重开面板后——三档评测表对齐、投影 chunk／wiki／card 三类点＋entity 切图谱开抽屉、召回点实体切图谱开抽屉、回归项（图例／叠加／keep-alive／抽屉链）全过。

## Task 5 — 收口

> 动到的文件：本对＋`docs/equivalence.md`。

- [x] 回写 spec Status 与各 Task 实测；plan 勾选与实测回填。
- [x] `docs/equivalence.md` 增两条：投影 wiki／card 点点击＝对齐工作台（非偏离）；召回迷你图点实体＝插件自有增强（工作台无对应）。
- [x] 逐文件核 hunk，排除并行工作区与仓外探针；提交链候令后执行（拟两笔：实现＋收口）。

**实测**（Task 5，2026-10-21）：
- spec／plan Status 均为「实施中（D1 丙；Task 0–3 实现已落，真跑手验与收口待办）」；Task 0–4 实测已回填。
- `docs/equivalence.md` 已增三行：§4「图谱迷你图点实体」＝插件增加；§7「数据点点击（chunk/wiki/card）」＝等价；§7「实体点点击」＝插件增加（D2）。
- hunk 已核：本对为 `client.js`（Task 1–3 合计 +51/−6）、本对 spec／plan、`docs/equivalence.md`；并行件与仓外探针未纳入。
- **提交**：实现笔 `fcf0907`（`client.js`）；收口笔＝本笔（本对 spec／plan＋`equivalence.md`）。

---

## 提交链（滚动记实）

- `fcf0907` feat(panel): add read-tab detail drill-downs and align eval metrics
- 收口（本笔）：docs(panel): record read-tab interaction close-out
