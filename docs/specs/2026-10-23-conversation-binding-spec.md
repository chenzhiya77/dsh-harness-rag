# 会话知识库绑定（面板内） —— spec

**Status:** 已实施·真栈验收通过（2026-10-23；Task 0–5 全落、§5 九项手验过、Task 6 收口已落（`6867222`）；D1 甲＝顶栏按钮＋覆盖抽屉、D2 乙＝会话可改绑、D3 甲＝浏览与绑定分离、D4 甲＝host 侧 JSON 文件、D5 甲＝`sessionController.list`、D6 甲＝host `create`＋client `openSession`、D7 不弹确认框、D8 悬空绑定标灰；多库混合不做。**10-23 对照实码审查后修订 P1–P3**：sessionId 改走标准 prop、右栏 per-session 布局、list 带当前会话行、`kb()` 同步载入、子代理回落、`DSH_HOME` 空白串、冷会话标题、归档会话、路由鉴权姿态、tsc 命令。**10-24 修订**：入口形态改为锚定小面板（`629fb3f`），见 §9；数据面 D2–D8 与 §4.5–§4.6 不变）
**Date:** 2026-10-23
**来源:** 10-23 他问「一个会话是绑定一个知识库的吗，切换之后这个会话看到的是切换后的库吗」；确认现状＝无绑定、面板切库不影响会话；他拍「乙更符合常理」（会话可改绑），并要求切换时不要弹确认框；随后「我觉得这个应该放在 rag 当中」，定为面板内入口；令写 spec/plan。
**承接:** 面板六 tab 与顶栏（[2026-10-21-panel-tabs 之后](../plans/2026-10-21-dsh-model-proxy-plan.md) 的 `hrag-bar` 结构，`client.js:20628`）；抽屉底座沿用切片续读抽屉（`client.js:2706-2715`）；工具 kb 解析链出自 [2026-10-19-t5-slot-contract-spec.md](2026-10-19-t5-slot-contract-spec.md) D4（`src/tools.ts:59-70`）；宿主会话 API 取证见下方 §2.3。
**配套 plan:** [../plans/2026-10-23-conversation-binding-plan.md](../plans/2026-10-23-conversation-binding-plan.md)

## 1. 范围

本对只改插件仓，四件：

1. **面板入口**：顶栏在库选择器与 `⋯` 之间加一枚「会话」按钮，点开是覆盖式抽屉（不加第 7 个 tab）。
2. **会话×库绑定**：一个会话至多绑定一个库；绑定单选、可改绑；绑定落在 host 侧持久文件，不随浏览器数据清空。
3. **工具解析链补一格**：`kb_id` 参数 > 会话绑定 > `defaultKbId`，即 `src/tools.ts` 头注里留给 T3 的那格。
4. **会话面**：抽屉内显示「本会话」的绑定状态；下方列出已绑定的会话，点击跳转到该会话；「新建」按当前浏览库建会话并绑定。

**不包含**：多库混合；会话头 chip（10-23 他改判放面板内）；往会话记录里写切换事件；按绑定库自动切换面板浏览库；引擎/后端/主树改动；跨设备或跨 profile 同步。

## 2. 现状与依据

### 2.1 面板顶栏与抽屉底座

- 顶栏 `hrag-bar`（`client.js:20628`）只有两件：库选择器（`DshMenu`，`client.js:20631-20695`）与 `⋯`（上传/刷新/Wiki/改名/删除/设置）。
- tab 行 `TabsStrip`（`client.js:20733`）六枚，198px 下尾部折叠成 `⋯` 菜单——不能再加第 7 枚。
- 抽屉底座已具备：`.hrag-drawer-overlay` / `.hrag-drawer`（`client.js:2706-2715`，宽 `min(576px, 100% - 48px)`、右侧滑入、Esc/遮罩关闭），切片续读抽屉与 Wiki 抽屉同款。
- 轻提示已具备：`ToasterHost`（`client.js:3327`），锚在顶栏。

### 2.2 工具侧的 kb 解析（现状＝只有两档）

- `src/tools.ts:59-70`：`kb()` 现读 `args.kb_id` → `config.defaultKbId`；注释明写「session-context tier … at this stage the tier is absent」，即本对要补的那一格。
- 没有绑定的时候，任何会话都落到同一个 `defaultKbId`——这正是他问「切换库后会话看到的是不是新库」的答案：面板切库完全不进这条链。

### 2.3 宿主会话 API（10-23 实读，asar 取证）

| 能力 | 接口 | 层 | 说明 |
|---|---|---|---|
| 列会话 | `ctx.sessionController.list(signal)` | host | 行含 `sessionId / updatedAt / running / blank / cwd? / projections`（标题在 `projections.values.title`） |
| 建会话 | `ctx.sessionController.create({ cwd ｜ workspaceId, sessionId?, agentPreset? })` | host | 返回新建/复用的会话 id；`agentPreset` 不存在报 `agent-preset/not-found` |
| 打开会话 | `ctx.uiWorkspace.openSession(target)` | client | 主区切到该会话、历史加载在其中；`replaceMain(..., 'reveal')` 只让主区回 Conversation，右栏本身不关 |
| 右栏布局作用域 | `state.bySession[sessionId].layout` | client | **per-session**：切会话后右栏显示目标会话自己的布局，抽屉不会留在原地 |
| 面板所属会话 | `sidebar.right.pane.tab` 组件的**标准 prop `sessionId`** | client | `useTabInfo()` 只回 `{sidebar,panel,tab}`、不含 sessionId（同槽 `FilesBody({ useTabInfo, sessionId, … })` 实证） |
| 会话头槽 | `conversation.session.header.actions` | client | 存在且第三方可挂（agent-team 在用），但本对不用 |
| 自定义会话元数据 | — | — | `appendPluginRecord` 文档明确「仓外插件也不该调」⇒ 切换事件写不进会话 |

客户端服务面（`dsh-cordis-client-runner` 的目录）共八件：`layout / locale / sessions / slots / theme / timer / uiWorkspace / workspaces`，`uiWorkspace` 在册且文档化了 `openSession`。

### 2.4 落点与姿态为什么这样选

- **不放会话头**：10-23 他明确「这个应该放在 rag 当中」；会话头属于宿主，且 `actions` 槽是内部槽位（未进公开 slot 文档）。
- **不用 `ctx.storageDomain`**：`defineDomain` / `domainTable` 来自 `@deepseek-ai/dsh-storage-domain`，不在插件 peer 面（本包 peer 只有 `dsh-tools` + `cordis`）⇒ 三方插件构造不出合法 domain spec。Task 0 复核一次；结论若反转则改用它（§8），口径不变。
- **不用 localStorage**：多窗口各记各的，清站点数据即丢；绑定要跟着 DSH 数据目录走。
- **路由鉴权（已知、接受）**：`/dsh-harness-rag/api` 无内建鉴权，只在 loopback 上；新 op 能建会话，与现有删除类 op 同姿态，本对不加独立鉴权。

## 3. 决策表

### D1 —— 入口形态（拍定：甲＝顶栏按钮＋覆盖抽屉）

- **甲（拍定）**：`hrag-bar` 内、库选择器与 `⋯` 之间加一枚图标按钮（未绑定时带小圆点）；点开是覆盖抽屉，复用 `.hrag-drawer`。
- 乙（不做）：做第 7 个 tab。198px 下 tab 行已在折叠尾部，且会话是低频面，不该占内容位。

### D2 —— 绑定语义（拍定：乙＝会话可改绑）

- **乙（拍定）**：一个会话至多一个库；改绑即时生效，**新的**工具调用用新库。上下文里已有的旧库检索结果不重算、不移除——回答可能同时引用新旧来源，由工具结果里的库名标注区分（§4.5）。
- 甲（会话固定单库、换库＝新会话）不做：他 10-23 判「乙更符合常理」。

### D3 —— 浏览与绑定分离（拍定：甲）

- **甲（拍定）**：顶栏库选择器只管面板浏览；抽屉里「使用知识库」那一行才是绑定。已绑定时顶栏按钮带实心点，tooltip 写「本会话使用：<库名>」。
- 乙（不做）：选择器即绑定——浏览另一个库就把会话改绑了，管理动作带副作用。

### D4 —— 存储落点（拍定：甲＝host 侧 JSON 文件）

- **甲（拍定）**：`<DSH_HOME>/harness-rag/bindings.json`，`DSH_HOME` 取 `process.env.DSH_HOME`，缺省 `~/.dsh`；结构 `{ version: 1, bindings: { <sessionId>: { kbId, kbName?, updatedAt } } }`（`kbName` 由面板绑定时一并送来，仅供工具结果回显）；写用「临时文件 + rename」原子替换。
- 乙（不做）：`ctx.storageDomain` —— peer 面不可导入（§2.4）。Task 0 复核；若可达，改用 domain 但键与语义不变。
- 丙（不做）：localStorage —— 多窗口/清缓存丢。

### D5 —— 会话列表数据源（拍定：甲＝`sessionController.list`）

- **甲（拍定）**：host 每请求现拉一次 `ctx.sessionController.list()`，与绑定表做左连接，返回**有绑定**的行：`{ sessionId, title, updatedAt, running, blank, cwd?, kbId, kbName? }`，按 `updatedAt` 倒序；另按入参 `currentSessionId` 把**当前会话那一行**无论是否绑定都带回（未绑定时 `kbId: null`），供抽屉的「本会话」区与「新建」取标题/cwd。
- 乙（不做）：读会话日志判断是否用过 RAG 工具——重、且判断不了「属于哪个库」。

### D6 —— 新建会话（拍定：甲＝host `create` ＋ client `openSession`）

- **甲（拍定）**：面板调 `conversations/create`（host）→ `ctx.sessionController.create({ cwd, agentPreset? })` → 写绑定 → 返回 `sessionId` → client `ctx.uiWorkspace.openSession(sessionId)`。
  - `cwd` 取当前会话在 `list()` 行里的 `cwd`；取不到则报错提示「请先在某个工作区里打开会话」。
  - `agentPreset` 用 `harness-rag-knowledge`（组合里存在时）；报 `agent-preset/not-found` / `agent-preset/invalid` 时**去掉预设重试一次**（照宿主 `createNamed` 同款回落）。
- 乙（不做）：client `uiWorkspace.startSession()` 一步到位——返回 `void`，拿不到新会话 id，写不了绑定。

### D7 —— 切换的提示方式（拍定：不弹确认框）

- 不弹确认框。切换到库时：面板内 Toast「已切换到 <库名>，此后检索使用该库」；顶栏按钮状态同步；回合正在跑时文案改为「下一条消息生效」，当前回合不打断。
- 会话记录里不会出现切换消息（§2.3 无写入口子）；模型侧靠工具结果里的 `kb_id` / 库名看见来源。

### D8 —— 悬空绑定（拍定：标灰＋可移除，不静默回落）

- 绑定指向的库已删除：抽屉列表该行标灰、库名后加「（已删除）」，提供「移除绑定」；点击仍可跳转到该会话（历史可读）。
- 工具侧遇到悬空/无效库：按引擎返回的错误原文报错，**不静默回落到 `defaultKbId`**——静默回落会让「以为在用默认库」难以察觉。

## 4. 口径

### 4.1 入口与抽屉形态

> 2026-10-24 修订：入口仍为顶栏「会话」钮，展开形态已由覆盖抽屉改为锚定小面板，见 §9；以下为 10-23 原稿。

```text
[产品文档库 ▾]   [◍ 会话]  [⋯]        ← 顶栏（hrag-bar）
────────────────────────────────
文档  图谱  Wiki      召回 投影 评测
```

```text
┌ 会话 ──────────────────────────┐
│ 本会话                           │
│   友好问候                       │
│   使用知识库   [产品文档库 ▾]     │
│ ─────────────────────────────── │
│ RAG 会话                  新建 ＋ │
│ 今天                             │
│   友好问候            产品文档库  │
│   昨天                           │
│   季度复盘            会议纪要库  │
└────────────────────────────────┘
```

- 抽屉沿用 `.hrag-drawer`：右侧滑入、宽 `min(576px, 100% - 48px)`、Esc/遮罩关闭；不改变当前 tab。
- 顶栏按钮在 198px 档只显示图标（14px），tooltip 补全库名；已绑定 = 实心点，未绑定 = 空心点。
- 抽屉内「本会话」区固定在最上，列表区独立滚动。

### 4.2 绑定与显示

- 「使用知识库」= 单选菜单（复用 `DshMenu`），列出面板已加载的库；当前库打勾。
- 未绑定时显示「未绑定 · 选择知识库」，副文案「选择后，本会话的检索将使用该库」。
- 选中即写绑定（`conversations/bind`），请求带 `kbId` 与 `kbName`（取自面板已加载的库清单，供工具结果回显），不等待引擎校验；库若已被删，写入后按 D8 标灰。
- 「移除绑定」= `conversations/unbind`；移除后会话回到 `defaultKbId` 口径。
- 面板浏览库不随绑定变化，绑定也不随浏览库变化（D3）。

### 4.3 会话列表与跳转

- 列表区只列有绑定的会话（D5 的左连接结果）；行内容：标题、库名、相对时间；`running` 行带状态点。冷会话取不到标题投影时，标题缺省「新会话」。
- 归档会话照常列出（列表不区分归档），点击仍可打开其历史。
- 「本会话」区读同一响应里的当前会话行（未绑定时 `kbId: null`），不依赖列表是否包含它。
- 点击行 → `ctx.uiWorkspace.openSession(sessionId)`：主区切到该会话；右栏布局是 **per-session** 的，会切到目标会话自己的布局——本抽屉不留在原地，属预期行为，不是缺陷。
- 列表为空时显示空态：「还没有绑定知识库的会话」＋「新建」按钮。

### 4.4 新建会话

- 「新建 ＋」使用**面板当前浏览的库**（不是当前会话的绑定库），按钮旁以库名小字注明，避免歧义。
- 流程（D6 甲）：`conversations/create` → 成功则 `openSession`；失败按错误文案提示（预设回落一次）。
- `cwd` 优先取当前会话行；取不到则不传，由宿主回落 `defaultCwd`——「新建」不因缺 `cwd` 禁用。
- 建完跳到新会话，右栏同样切到该会话自己的布局（抽屉不留在原地，与 §4.3 同因）。

### 4.5 工具解析链

```text
kb_id（参数） > 会话绑定（exec.agent.session.id）> config.defaultKbId
```

- 绑定读取同步：host 启动时用 `readFileSync` 载入一次（文件很小），之后 `kb()` 只读内存；写操作先更新内存、再串行落盘。`kb()` 保持同步，不把工具执行改成异步等文件。
- 会话 id 来源：`exec.agent?.id`（`Agent.id` 与 `agent.session.id` 是同一身份，前者类型更直接）；`exec.agent` 可缺，缺则跳过这一格。
- 子代理会话**不继承**父会话绑定：子会话 id 查不到绑定即回落 `defaultKbId`（有意，简单可解释；不做继承）。
- 工具结果回显 `kb_id` 与库名（`results` 之外的顶层字段），让回答能标出处；无绑定时回显实际使用的默认库。
- 悬空绑定按 D8 报错原文，不回落。

### 4.6 存储与容错

```js
{
  version: 1,
  bindings: {
    "<sessionId>": { "kbId": "<kbId>", "kbName": "<库名>", "updatedAt": "2026-10-23T05:00:00.000Z" }
  }
}
```

- 路径：`<DSH_HOME>/harness-rag/bindings.json`；`DSH_HOME` 取环境变量、**空白串视同未设**（照抄宿主 `dsh-home-paths` 的规则），缺省 `~/.dsh`；目录不存在时创建。
- 读取：坏 JSON / 缺键 / 版本不识别 ⇒ 空表，不删原文件（下次写入覆盖前先备份为 `bindings.json.bak`）。
- 写入：串行队列 + 临时文件 rename；写失败仅本次进程内存生效，并返回错误码给面板（面板 Toast）。
- 清理：会话被删除后绑定若存在，列表里自然不出现（左连接取不到行）；不做主动清扫。

### 4.7 视觉

- 顶栏按钮：14px 图标，`--dsw-alias-label-tertiary`，hover 升 `label-primary`；已绑定点用 `--dsw-alias-state-success-primary`，未绑定用 `label-tertiary` 空心。
- 抽屉：标题行照现有抽屉（`.hrag-drawer-head`）；「本会话」区 12px 标签 + 13px 库名；列表行高 36px、hover `interactive-bg-hover`、当前会话行左侧 2px `button-primary-fill` 竖条。
- 深浅色均只走现有 token；不新增底色层。

## 5. 验收

1. **解析链**：显式 `kb_id` 覆盖绑定；绑定生效时无 `kb_id` 走绑定库；未绑定回落 `defaultKbId`；子代理会话回落默认库；四者顺序与 §4.5 一致（host 单测＋真栈各一条）。
2. **持久**：绑定后 DSH 整重启，绑定仍在；文件内容与 §4.6 结构一致；坏 JSON 下空表不崩。
3. **面板入口**：顶栏按钮出现在库选择器与 `⋯` 之间；198px 下收成图标且 tooltip 正确；点开/关闭抽屉不改变当前 tab。
4. **绑定**：抽屉内切换库即时生效并出 Toast；顶栏按钮状态同步；移除绑定后回到默认库口径。
5. **列表与跳转**：列表区只列有绑定会话、按时间倒序、标题/库名/相对时间正确；未绑定时「本会话」区仍能显示标题；点击后主区切到该会话、右栏切到目标会话自己的布局（抽屉不留在原地）；空态文案正确。
6. **新建**：按当前浏览库建会话、写绑定、跳转；`cwd` 缺失时不传并由宿主回落 `defaultCwd`、按钮不禁用；预设不存在时回落一次仍能建。
7. **悬空绑定**：删库后列表行标灰带「（已删除）」并可移除；工具检索该库报引擎错误原文，不回落默认库。
8. **运行中切换**：回合运行中改绑不打断当前回合，Toast 文案为「下一条消息生效」。
9. **回归**：六 tab、上传、切片抽屉、Wiki 抽屉、召回/评测/图谱面零变化；无任何绑定时顶栏按钮与抽屉照常可用。
10. **门禁**：`node --check client.js`；`src/*.ts` strip-types 全过；`node --test tests/*.test.ts` 全绿；真 DSH 整重启后手验；引擎 `harness-rag` 与主树 `deer-flow` 零 diff。

## 6. 影响面

**改的（插件仓）**：`client.js`（顶栏按钮、抽屉组件、样式、内联 zh/en 词条）；`src/bindings.ts`（新增：文件读写＋内存表＋纯助手）；`src/kb_proxy.ts`（新增四个 op）；`src/tools.ts`（kb 解析链补会话绑定＋结果回显）；`src/index.ts`（`ctx.inject` 补 `sessionController`，绑定模块接线）；`tests/bindings.test.ts`（新增）；本对 spec/plan；收口时 `README.md` 与 `docs/equivalence.md`。

**不改的**：引擎 `harness-rag`、主树 `deer-flow`、六 tab 内容、上传链、`locale/*.json`（只承载元数据）、`hrag-last-kb` 浏览记忆。

**工作区**：`node_modules/` 为既有未跟踪目录，不触碰、不纳入提交；与并行会话同文件时按 hunk 分离。

## 7. 不做

- 不做多库混合检索（跨库分数不可比、引用会混；另立「多库检索」）。
- 不做会话头 chip（10-23 拍定收进面板）。
- 不往会话记录里写切换事件（宿主无口子；`appendPluginRecord` 禁仓外调用）。
- 不按绑定库自动切换面板浏览库；不把绑定做成「最近使用」。
- 不做绑定导出/导入、跨设备同步、按库统计会话数。
- 不改 `defaultKbId` 的语义与设置项；不改工具参数集合。
- 不做引擎侧 `kb_bindings` 表。

## 8. 升级路径（非本对）

- **storageDomain**：若复核发现插件可构造 domain spec（例如宿主开放了 `defineDomain` 的再导出），把 §4.6 的文件换成 domain 表，键与语义不变。
- **引擎落库**：需要跨设备/跨 profile 时，改存引擎 `kb_bindings(session_id, kb_id, updated_at)`＋迁移；插件只换实现，不动面板与解析链。
- **多库**：届时把绑定从 `kbId: string` 扩成 `kbIds: string[]`，引擎侧另开「多库检索」端点（带引用标注与总 top_k 预算），不复活本对的单选口径。

## 9. 修订（2026-10-24）

入口形态自「顶栏按钮＋覆盖抽屉」改为「顶栏按钮＋锚定小面板」，绑定数据面（D2–D8、§4.5–§4.6）零变化。

- **入口**：仍为 `hrag-bar` 内、库选择器与 `⋯` 之间的「会话」钮；图标＋「会话」文字，栏宽 <208px 只留图标；补 `aria-haspopup="dialog"`／`aria-expanded`，展开态有底色。
- **面板**：320px 宽、右缘对齐入口钮、钮下 6px；下方空间不足 280px 时翻到钮上方；高度在 160–480px 间取剩余空间；`position:fixed`，可越过 198px 面板左缘。点外部／Esc 关闭；resize 与滚动重新定位。
- **头部**：本会话标题（超长省略）＋绑定库 chip。chip 定宽 144px、右对齐，库名超长省略且 title 给全名；chip 菜单＝换库（`conversations/bind`）／移除绑定（`conversations/unbind`）。
- **列表**：「RAG 会话」标头右侧「＋ 新建」；行高 32px，当前会话左侧 2px 主色条；每行**恒定**显示绑定库名（悬空库加「（已删除）」并整行标灰，仍可跳转），相对时间列定宽右对齐。
- **文案**：删「本会话」「选择后…」「关闭」三键；空态改为「还没有会话」；解绑入口收进 chip 菜单，行内「✕」退场。
- **退场**：`SessionDrawer` 组件与 `.hrag-drawer` 复用形态退场，改由 `.hrag-sesspop` 承载。
- **落地**：`629fb3f`（`feat(panel): replace the session drawer with an anchored popover`）。同笔含两处修正：chip 外层与宿主 Menu 内层各设 55% 上限造成循环收窄（短库名被压成 0 宽）→ 改定宽 144；列表「行所属库＝浏览库时省略库名」的规则回退为恒定显示。
