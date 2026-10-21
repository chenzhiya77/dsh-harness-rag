# 面板 · 评测/投影/召回交互收口 —— spec

**Status:** ✅ 收官（2026-10-21，**D1／D2 已拍：均丙**；Task 0–5 全毕；他手验真跑全过；定稿两笔提交，未推——仓无 remote）。
**Date:** 2026-10-21
**来源:** 10-21 他三点体验反馈——①评测「检索质量」表未对齐；②召回图谱通道点实体无详情；③投影点图例无详情；随后裁「表格对齐／投影点补线／召回点开详情」三项全收，独立成对（不并入文档表对）。
**承接:** 与 [2026-10-21-doc-table-interactions-spec.md](2026-10-21-doc-table-interactions-spec.md) 并行、互不并入；本对只收读侧三 tab（评测／投影／召回）的交互小件。
**配套 plan:** [../plans/2026-10-21-eval-vector-recall-plan.md](../plans/2026-10-21-eval-vector-recall-plan.md)

## 1. 范围

三件（落点全在 `client.js`；host 半、后端、工作台零改）：

1. **评测表对齐修**：检索质量表的数值列表头被更高特异性的左对齐规则压住，与右对齐数值错位；汇总胶囊文字再偏 6px。题库、历史两表共用同一套类，同源受益。
2. **投影数据点补线**：数据点点击现只接 chunk；wiki／card 照工作台补到条目／卡片抽屉；entity 同走丙（切图谱 tab＋完整抽屉，D2）。
3. **召回迷你图实体详情**：图谱通道迷你图点实体现只有 tooltip；补「点实体 → 切知识图谱 tab 并选中打开完整抽屉」的入口（D1 丙）。

**不包含**：图例点击改详情（两边图例语义均为显隐开关）；投影 entity 点点击；召回迷你图点边／空白；表格列体系与列宽定重做；任何后端或存储改动；工作台任何改动。

## 2. 现状与根因（10-21 只读核实）

### 2.1 检索质量表为什么错位

- 数值列表头挂 `hrag-ev-th-num`，规则是 `text-align:right`（`client.js:2556`）；但 `.hrag-ev-table th` 的 `text-align:left`（`client.js:2554`）特异性 0,1,1 高于 0,1,0，表头实际左对齐。
- 数据格 `td` 不受 th 规则影响，`hrag-ev-th-num` 生效 → 数值右对齐。于是「表头贴列左、数字贴列右」，列越宽错位越明显。
- 表头与数据行共用一张原生 `<table>`（`client.js:10307-10362`），无 `table-layout`／`colgroup`；列宽由内容自动分配，进一步放大两侧空档。
- 汇总行第二层偏差：胶囊 `padding: 1px 6px`（`client.js:2549`），盒右缘对齐而文字右缘再缩 6px；同行为 600 字重（`client.js:2570`）。
- 题库表（`client.js:11484`／`11492`／`11551`／`11554`）与历史表（`client.js:12737`／`12854`）共用同套类，受同一规则影响；`.hrag-ev-th-sort`（`client.js:2568`）的右对齐也被同一条 th 规则压住。
- 数字已启用 `tabular-nums`（`client.js:2542`），无需再补。

### 2.2 投影数据点为什么 wiki／card 无反应

- 画布拾取在 mouseup 后回调 `onPick`（`client.js:6341`）；`VectorView` 的 `onPick` 只处理 `source_type === 'chunk'`（`client.js:6828-6833`），注释自认「wiki/card 点 → 条目/卡片抽屉随 Task 9 接线；entity 照工作台惰性」。
- 工作台同位置三类全接：chunk→切片、wiki→条目抽屉、card→卡片抽屉（`vector-tab.tsx:363-371`），entity 明确惰性（同文件 `:362` 注释）；插件侧按 D2 把 entity 改为同走丙（工作台仍惰性，属自有增强）。
- 插件底座已具备：面板级 `wikiDrawer` 状态与渲染在 `client.js:17764`／`18428-18460`，召回视图已用它开条目／卡片（`client.js:18295-18296`）；投影视图挂载处只传了 `onOpenChunk`（`client.js:18331-18339`）。缺的是两条 props、一处分发与 entity 的丙跳转（D2）。
- 图例是另一回事：插件 `onClick` 只切 `hiddenTypes`（`client.js:6875-6879`），工作台是 ECharts 原生显隐（`vector-canvas.tsx:481-500`，`legendselectchanged` 仅刷新衬底），两边都不是详情入口，本对不改。

### 2.3 召回迷你图为什么点实体无反应

- 迷你图事件只有 `mousedown／mousemove／mouseup／mouseleave`（`client.js:5248-5251`）：按下只区分「拖节点／平移」（`client.js:5209-5219`），抬起只解钉（`client.js:5221-5231`），没有 click 回调；唯一反馈是悬停 tooltip（`client.js:5253-5261`）。
- 工作台 `recall-graph-mini.tsx` 同样无 `click` 监听（只有 `rendered`／`graphRoam`，`:80`／`:83`）；实体详情在工作台属于知识图谱 tab（`graph-tab.tsx:365` → Sheet，事件源 `graph-canvas.tsx:234-237`）。
- 插件侧实体抽屉内联在 `GraphView`：`selected` 状态（`client.js:7525`）＋抽屉（`client.js:7808` 起），依赖整张图谱数据（邻居子图 `client.js:7542`、关联切片、文档名）；召回迷你图只持有当次召回的 `entities／relations`（`client.js:5658-5664`），实体字段为 name／type／description（`client.js:4942-4946`、`4961`）。
- 大图已有「拖拽 vs 点击」判别（`client.js:7471`，`drag.moved`），迷你图没有；补详情入口时必须补同款判别，否则拖节点松手会误开。

## 3. 决策表（D1，**已拍：丙**）

### D1 —— 召回迷你图点实体的详情承载（**已拍：丙**，2026-10-21）

- 甲：就地轻量抽屉——复用 `.hrag-drawer` 壳，展示 name／type／description，附「在图谱中查看」跳到知识图谱 tab 并定位；不依赖整张图谱数据，零新增请求。
- 乙：就地复用完整实体抽屉——把 `GraphView` 的抽屉提升为共享件；但召回结果缺少邻居／关联切片数据，需懒拉图谱或对抽屉降级，成本与失败面最大。
- **丙（拍定）**：点击即切到知识图谱 tab 并选中——图就绪后按 id 置 `selected` 打开完整抽屉，并复用 `focusNode` 定位画布。详情最全；代价是离开召回上下文。
- 判据：甲在不离开召回上下文与实现成本之间取平，也最接近工作台「迷你图不承载完整详情」的边界（本交互属插件自有增强，需在等价表登记）；乙的完整抽屉在召回态数据不成立；丙牺牲就地感。**10-21 拍丙**：完整详情与「等待与图谱 tab 一致」优先，接受离开召回上下文；共享缓存不做（见 §7）。

### D2 —— 投影实体点点击（**已拍：同走丙**，2026-10-21）

- 甲：维持与工作台一致，不响应（原口径）。
- 乙：就地轻量卡（复用抽屉壳，只展示实体名／类型／描述）。
- **丙（拍定）**：点实体点 → 切知识图谱 tab，按实体名定位并打开完整实体抽屉；复用 D1 丙的 `graphEntityRequest` 链路，零新增请求。
- 判据：与召回实体点击保持同一心智、同一实现；投影点 `id`＝实体名（后端 `projection/fetcher.py:45`），与图谱节点同键；工作台此点仍惰性，插件属自有增强（等价表登记）。

## 4. 口径

### 4.1 检索质量表对齐（既定）

- 补一条更高特异性的右对齐规则（如 `.hrag-ev-table th.hrag-ev-th-num{ text-align:right }`），并覆盖 `.hrag-ev-th-sort` 的同源问题；表头右缘与数值右缘重合。
- 汇总胶囊加 `margin-right:-6px`（或等价补偿），让胶囊内文字右缘与上方数字对齐；胶囊造型与配色不变。
- 不加 `colgroup`／定宽：auto 布局在右对齐后网格即成立；若真浏览器三档实测仍显松散，作为 Task 1 的停点另行拍。
- 不动列集合、行内容、排序箭头与井号含义；题库／历史两表只做回归，不改结构。

### 4.2 投影数据点补线（既定）

- `VectorView` 增 `onOpenWikiEntry`／`onOpenManualCard`／`onOpenEntity` 三个 props，签名照 `RecallView`（`client.js:5319`／`18295-18296`）；`onPick` 按 `source_type` 分发：chunk 走既有切片抽屉，wiki／card 走面板级 `wikiDrawer`（`client.js:18428-18460`），entity 走 `openEntityInGraph`（D2）。
- entity：点 → `onOpenEntity(point.id)`（id＝实体名），父级复用 `openEntityInGraph` 切图谱 tab 并开完整抽屉（D2 丙）；图例、搜索叠加、hover 聚焦、keep-alive 状态全部不动。
- 不新增请求、不改 `VectorCanvas` 拾取逻辑。

### 4.3 召回实体详情（D1 丙）

- 迷你图补「拖拽 vs 点击」判别（沿用大图 `drag.moved` 口径，`client.js:7471`）：按下记起点，抬起时位移未超阈值且命中节点才触发；拖节点、平移、缩放松手不误触。
- 迷你图向上抛 `onOpenEntity(name)`；`RecallView` 透传，父级发实体定位请求并把 `section` 切到 `graph`（照 `onViewInGraphSpace` 先例 `client.js:18305-18308`，带 nonce 去重）。
- `GraphView` 新增请求消费：图就绪后按 id 找节点 → `setSelected(node)` 开完整抽屉＋`setFocusNode` 定位；同一 nonce 只消费一次（照 overlay 消费 `client.js:7602-7608`）。
- 边界：图加载中＝等就绪再消费（等待即图谱 tab 自身首次加载）；图空／失败＝停在既有空态／错误态，不凭空开抽屉；目标 id 不在图中＝不开抽屉。
- 不新增请求、不做共享缓存、不改抽屉与 `GraphView` 的数据归属。

### 4.4 存储与网络

- 无新增 localStorage、无新增接口、无写操作；三者都是纯展示交互。

## 5. 验收

1. **评测**：面板 570／740／满宽三档，检索质量表逐个数值列的表头与数字同缘、汇总胶囊文字同缘；题库表与历史表无错位回归；排序箭头位置正常。
2. **投影**：点 chunk→切片抽屉（既有）；点 wiki→条目抽屉；点 card→卡片抽屉；点 entity→切图谱 tab＋实体抽屉（D2）；抽屉关闭后投影配置、搜索叠加、图例显隐保持（keep-alive）。
3. **召回**：点实体→切到知识图谱 tab、定位并打开实体抽屉；拖动节点、平移、缩放松手不误触；悬停 tooltip 不变；图谱 tab 首次加载即既有等待；返回召回 tab 时结果与选择集保持（keep-alive）；图空／失败时停在既有空态，不弹空抽屉。
4. **门禁**：`node --check client.js`；`src/*.ts` strip-types 全过；冒烟默认与 `SMOKE_HOSTLESS=1` 全绿；DSH 整重启（候令）后真跑。
5. **零改动**：deer-flow 主树、后端、host 半零 diff；并行未提交件不纳入。

## 6. 影响面

**改的（插件仓）**：`client.js`（评测表 CSS 两三条；`VectorView` 三 props＋分发；迷你图 click 判别＋定位请求，复用 GraphView 抽屉）＋内联 zh/en 文案；本对 spec／plan；收口时 `docs/equivalence.md` 增三条——投影 wiki／card 点点击＝对齐工作台（非偏离）；投影 entity 与召回迷你图点实体＝插件自有增强（工作台无）。

**不改的**：工作台；后端与 API；图例语义；投影 entity；文档表（另一对）；列偏好、行菜单、上传链。

**并行工作区**：`src/model_sync.ts`、`tests/model_sync.test.ts` 与 `2026-10-21-dsh-model-proxy-*` 两文档为他线未提交改动，本对不触碰、不纳入提交。

## 7. 不做

- 图例点击改详情（两边语义＝显隐开关，不改）。
- 投影实体就地详情（甲／乙落选，统一走丙）。
- 召回迷你图点边／空白／键盘可达（v1 登记候选）。
- 召回就地实体卡／就地完整抽屉（D1 甲、乙落选）。
- 面板级共享缓存（D1 丙不依赖；观察项：真跑若点击频繁／等待难受再立对）。
- 表格列宽定重做、列集合变更。
- 服务端持久化与跨端同步。

## 8. 来源与范围

**来源**：10-21 他三点体验反馈＋「三项全收、独立成对」裁定。
**范围**：只收读侧三 tab 的三件；与文档表对并行，互不并入。
