# RAG 面板会话栏（轻聊）Plan

**Spec:** [2026-10-24-rag-panel-chat-spec.md](../specs/2026-10-24-rag-panel-chat-spec.md)
**Status:** 已暂缓（2026-10-24 裁撤：暂不做面板会话栏；Task 1–5 代码已回滚至 HEAD `58f2acd`，Task 6/7 不再进行）
**Architecture:** 纯客户端：单 tab 内按实测宽度分两栏/浮层；消息取宿主 `sessions` + `uiConversation` 客户端服务，发送走作用域 `conversation`；顶栏「会话」钮改宿主式侧边栏钮作聊天入口，「本会话绑定」进 ⋯ 菜单，旧 `SessionDrawer` 退场。宿主 op、bindings、gating 不动。

**硬约束**：只改插件仓 `E:\app\python\agent\dsh-harness-rag`；引擎 `harness-rag` 与主树 `deer-flow` 只读零改动；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。`node_modules/` 不触碰、不纳入提交。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 快照字段：节点形＝`{key,kind,id,target,anchorSeq,location,visibility,groupTree,data}`。`user`/`steering` 的 `data.content.text`；`assistant-step` 的 `data.blocks`（`kind: text|reasoning|image|tool-call`）与 `data.status`（running/settled/interrupted）；`tool-call` 的 `data.root`（结果态 `root.call.name`，过程态 `root.name`；`phase: preparing|start`；结果 `isError`）；`turn-error` 的 `data.message/code`。**修正**：`turn-process` 只是用时汇总（`messageCount/toolCallCount/subagentCount`），不是工具行；工具行是独立 `tool-call` 节点，spec §4.3 已改。
- [x] `MarkdownText` 契约：`{ text, streaming=false, labels, fileMentions, pathImages, variant='body' }`；最小用法只传 `text`（+`streaming`），`labels` 可省。
- [x] `useTabInfo`：静态确认——`sidebar.right.pane.tab` 子槽声明 `inject: { hooks: { tabInfo } }`，entry 会收到 `useTabInfo`；`sidebar.fullscreen/expanded` 可读。运行时复核并入 Task 6。
- [x] 运行态与待处理交互：`uiSession.sessionStatus` 每会话给 `{running, pendingInteraction, completionUnread}`（`getSnapshot/subscribe`）；`binding.session.running` 亦在。
- [x] 落点：顶栏 `SessionEntryButton`（`client.js:20344`／调用 `:21172`）、`SessionDrawer`（`:20386`／挂载 `:21624`）、i18n `session.*`、CSS 串（`:1976` 起）、`callOp`（`:1789`）、`openConversation`。
- [x] 工作区：HEAD `58f2acd`；未提交＝`client.js` per-kb 过滤（将并入 Task 2/5）＋本 spec/plan。

**实测**：2026-10-24 只读核实完；宿主源＝asar 内 `dsh-client-ui-chat`／`dsh-client-ui-tool`／`dsh-client-ui-session`／`dsh-client-ui-renderer`／`dsh-client-ui-sidebar-right`。唯一设计修正＝`turn-process`→`tool-call`（见上）。

## Task 1 — 数据层（client.js）

> 动到的文件：`client.js`。

- [x] 适配层：`chatHostHolder` 注入 `sessions`/`uiConversation`/`uiSession`（分开 inject，缺件不拖垮面板）；`useChatSession(id)` 做 retain→ready→`target('chat')` 订阅→投影，卸载/切换订阅与 release 全部回收。
- [x] 投影：`projectChatSnapshot` 把 `user/steering/turn-trigger`、`assistant-step`（仅 text 块）、`tool-call`（名称＋状态）、`turn-error` 转成 `{kind,key,...}`；`visibility==='hidden'` 跳过；字段缺失即跳过。
- [x] 选择顺序：`pickChatSession`（`hrag.panel.chat.v1.byKb` → 列表首行 → 空）与 `rememberChatSession`。
- [x] 断线态：`sessions.list.phase !== 'ready'` 时 `phase='connecting'` 挂起，列表就绪后启动一次。
- [x] 门禁：`node --check client.js` 通过。

**实测**：2026-10-24 落地于 `client.js`（`// ── 面板会话栏数据层` 段，`chatHostHolder`/`projectChatSnapshot`/`useChatSession`/`chatConversation`/`pickChatSession`）；`node --check` 0。宿主行为真验并入 Task 6。

## Task 2 — 会话栏 UI（两栏/浮层＋常驻列表）

> 动到的文件：`client.js`。

- [x] 宽度分档：ResizeObserver 量 `.hrag-chat-body`（tab body 内容宽，随栏宽/全屏变化）；≥720 两栏，右栏 `flex:1`＋min 320＋max 46%（左栏由此恒 ≥54%≈389@720），<720 单栏＋全高浮层（Esc 关；浮层随 `.hrag-chat-body` 定位，只盖详情不盖顶栏）。
- [x] 栏头：列表折叠钮＋标题＋「＋」新建＋收起/返回（宽档右向 chevron、窄档左向）；常驻列表（当前库会话、当前项左缘主色条、折叠状态存 `hrag.panel.chat.v1.listCollapsed`、`max-height:33%` 超出滚动）；空态居中「这个知识库还没有会话」＋「新建会话」。
- [x] 入口钮：宿主右栏 ExpandButton 同款——`IconPanelLeftOutlineRegular`＋`scaleX(-1)`、箭头 15×15、28×28 ghost、tooltip「打开会话栏」、按下态保留 hover 底色。
- [x] CSS 新族 `hrag-chat-*`（含 `.hrag-chatentry`；Task 3 续加正文/工具/补页规则）；六 tab 槽与 `TabsStrip` 收进 `.hrag-chat-detail`，槽规则（flex:1／keep-alive 内联 display）原样复用，未覆盖既有 `hrag-*`。
- [x] 门禁：`node --check client.js` 通过；文案一致性探针 zh/en 848/848、键集相同、`problems: []`。

**实测**：2026-10-24 落地于 `client.js`；宽度以 `.hrag-chat-body` 实测（clientWidth ≥720），两栏比例右栏 `flex:1` 上限 46%、下限 320，左栏无 min-width 以保窄栏不横向溢出；宽档开关存 `hrag.panel.chat.v1.layout`（默认开），窄档浮层不记。Task 2 只做骨架：正文与输入位留空，任务 3/4 填充；真机视觉复核并入 Task 6。

## Task 3 — 正文渲染（四类节点）

> 动到的文件：`client.js`。

- [x] `user`／`steering`／`turn-trigger`：`data.content.text` 纯文本（`white-space:pre-wrap`）；照宿主气泡件右对齐（13/20、`--dsw-specific-bubble`、xl 圆角、max 88%）。
- [x] `assistant-step`：只取 `kind==='text'` 的块走宿主 `MarkdownText`（`labels` 复用 `markdownLabelsFor`、末块 `streaming` 随 running）；interrupted 尾行「已中断」；无文本 running 显示「生成中…」；其余块跳过。
- [x] `tool-call`：`data.root` 一行（16px 前导图标按名粗分 search/browse/edit/code/sparkle＋工具名＋运行中/完成/失败），不展开参数/结果；`root.kind==='tool-result'` 才算落定；`visibility==='hidden'` 跳过。
- [x] `turn-error`：红点＋`message`（`code` 与正文不同才并列）错误行；空行跳过；`turn-process`/`turn-tail` 不渲染。
- [x] 滚动跟随（距底 <32px 贴底；切换会话落底；补页按高度差回填锚点不跳底）、「加载更早」（`conversation.loadOlder()`，`hasMore` 读 `binding.session.hasMore`）、空会话「还没有消息」、连接中「正在连接…」。
- [x] 门禁：`node --check client.js` 通过；文案探针 zh/en 857/857、键集相同、`problems: []`。

**实测**：2026-10-24 落地于 `client.js`（`ChatTranscript`＋`SessionChatColumn` 正文/滚动段＋`useChatSession.hasMore`）；投影层新增工具态 `failed`（原 `error` 与 i18n 键不一致，已改）与空错误行跳过。真机滚动/补页行为并入 Task 6；骨架以连接态文案呈现（宿主同为文本提示，未另绘占位条）。

## Task 4 — 输入框与发送

> 动到的文件：`client.js`。

- [x] 自增高输入框（`scrollHeight` 实测，min 36px／max 136px＝6 行＋内边距）；Enter 发送、Shift+Enter 换行；IME composing／229 不触发；`trim` 后空禁发；发送中/停止中重入锁。
- [x] 发送 `chatConversation(id).send(text)`（`sessions.scope(id).get('conversation')`）；成功清空（仅当草稿仍是发送时文本）并回焦，失败保留草稿＋卡下一行错误（`sendFailed: code: message`）。
- [x] 运行中按钮位＝停止（`conversation.cancel()`）；运行中 Enter 仍走 queue 发送；运行态读 `uiSession.sessionStatus`，缺件回落 `binding.session.running`。
- [x] 待处理交互：栏头下方横幅「会话有待处理的交互」＋「在主会话打开」（`openConversation(selectedId)`）；不做交互 UI（D7）。
- [x] 样式照宿主 composer：`--dsw-specific-input-major` 卡片＋`--dsw-radius-panel`＋soft 阴影；28px 圆形主色发送钮（`IconArrowUpOutlineRegular`）／停止钮（`IconStopFillRegular`）。
- [x] 门禁：`node --check client.js` 通过；文案探针 zh/en 864/864、键集相同、`problems: []`。

**实测**：2026-10-24 落地于 `client.js`（`ChatComposer`＋`SessionChatColumn` 横幅/挂载＋`useChatSession` 运行态回落）。会话切换经 `key={selectedId}` 重挂输入框＝草稿随会话丢弃（spec §4.5）。真实发送/停止/排队与横幅触发并入 Task 6。

## Task 5 — 入口、绑定与抽屉退场

> 动到的文件：`client.js`。

- [x] 原「会话」钮由聊天入口取代（`SessionEntryButton` 删除，`sessionBindIcon` 留作 ⋯ 绑定项状态图标）；顶栏顺序＝库选择器 → 会话栏钮 → ⋯。
- [x] ⋯ 菜单加「本会话绑定」子菜单：状态行（`本会话使用：{0}`／`本会话未绑定知识库`）＋逐库勾选（当前项禁用）＋「移除绑定」；复用 `bindKb`／`unbindSession`（后者改为只作用于当前 sessionId）。
- [x] `SessionDrawer` 组件、`sessionOpen`/`barNarrow` 状态与 198px 测量、旧 `newConversation` 全部退场；列表/新建由右栏承担；per-kb 过滤口径留在 `chatRows`；列表加载失败改在栏内红字提示。
- [x] i18n：新增 `chat.*` 与 `session.binding`；删除抽屉专属 `session.entry/title/this/useKb/pickHint/unbound/close/listTitle/new/newHint/emptyNew/unavailable/loading/deletedSuffix`；`session.*` 现存键全部有引用。
- [x] 门禁：`node --check client.js` 通过；仓外文案探针 zh/en 851/851、键集相同、占位一致、`problems: []`（探针期望同步退役 `session.pickHint`、新增 `session.binding`/`chat.*` 断言）。

**实测**：2026-10-24 落地于 `client.js`；删除 `SessionDrawer`（约 220 行）与旧入口按钮及其 CSS 族（`.hrag-sessionbtn*`、`.hrag-sess-*`），空态文字链钮改名 `.hrag-chat-linkbtn`。子菜单走宿主 Menu 的 `submenu` 既有形态（同行 ⋯/卡片菜单），右缘翻转沿用 `hrag-ctxmenu-subflip`。真机点选并入 Task 6。

## Task 6 — 真栈验收（spec §7）

> 动到的文件：无（截图/日志仓外）。

- [ ] spec §7 逐条：宽档／窄档／新建＋`request/header` 五件／发送·流式·停止／主区镜像／切库／常驻列表＋加载更早／⋯ 绑定／待处理交互／回归／门禁。
- [ ] 证据：目标会话日志的 `request/header`＋截图；DSH 重启按既有流程（清 `ELECTRON_RUN_AS_NODE`）。

**实测**：（待填）

## Task 7 — 收口

> 动到的文件：本对。

- [ ] spec Status 冻结；plan 逐格勾与实测回填。
- [ ] 逐文件核 hunk，排除 `node_modules/`；提交信息英文 Conventional ASCII；提交后回填提交链。

**实测**：（待填）

---

## 提交链（滚动记实）

- （待填）
