# RAG 面板会话栏（轻聊）—— spec

**Status:** 已暂缓（2026-10-24 裁撤：面板会话栏暂不做；Task 1–5 代码已回滚至 HEAD `58f2acd`，本对仅留档）
**Date:** 2026-10-24
**来源:** 10-24 他描述「像主树中那样，加一个 AI 会话栏，入口在知识库名称右侧、三点菜单旁」，并确认形态为「左知识库详情、右会话栏（上：名称与会话历史；下：输入框）」；探针回来后拍 A（面板内自绘轻聊）。
**承接:** [2026-10-23-conversation-binding-spec.md](2026-10-23-conversation-binding-spec.md)（会话绑定、`conversations/*` 四 op、抽屉）与 [2026-10-23-binding-tool-gating-spec.md](2026-10-23-binding-tool-gating-spec.md)（绑定即挂载）。本对把「抽屉列会话、点击跳主区」升级为「面板内直接聊」，并吸收本轮 per-kb 草案的按库过滤口径。

## 1. 目标

1. **面板内直接聊天**：RAG 面板右栏常驻会话栏——从上到下是会话名、该库会话列表、正文与输入框；不再必须跳到主区才能对话。
2. **仍是宿主会话**：面板聊天就是宿主 workspace 会话（可在主区打开、可被宿主侧栏列出），绑定即挂载 `hrag_*` 工具，证据链仍是 `request/header`。
3. **会话按当前库取**：栏头历史只列绑定当前浏览库的会话；切库即换历史与选中；新建即绑定当前库。

## 2. 现状

- 面板只有知识库详情六 tab；会话通过顶栏「RAG 会话」抽屉查看，点击行走 `openConversation` 跳到主区（`client.js` 的 `onOpenSession`）。
- 抽屉列表已按当前浏览库过滤（`boundRows` 比 `browsingKbId`；空态「这个知识库还没有会话」）——该改动已落 `client.js`、**未提交**（口径原记于已并入本 spec 的 per-kb 草案；`node --check` 与文案探针 838/838 已过）。
- 「新建」经 `conversations/create` 建 workspace 成员会话并绑定当前库（已修，见 `2026-10-23-binding-tool-gating` 的 Task 4b）。

## 3. 事实基座（2026-10-24 真栈探针）

一次性只读探针（boot 注入、retain 一个会话、读快照、不发送、已移除）：

- **能读**：`ctx.inject(['sessions','uiConversation'])` 成功；`sessions.list` phase=ready（15 行）；`sessions.retain(id,{source})` → `await ready` → `binding.eventSource` 有 44 条 journal（`user/message`、`turn/start` 等）；`binding.session.prompt` / `beginSubmission` 均为 function。
- **能取视图**：`uiConversation.binding(id).target('chat')` 要先 `subscribe` 激活，随后快照 `order: 8`，节点 `kind`＝`user / turn-process / turn-error / turn-tail / assistant-step`。
- **能发**：`sessions.scope(id).get('conversation')` 解析成功，`.send` 为 function（未实发，零写入）。等价直调 `binding.session.prompt([{type:'text',text}], 'queue')`。
- **不能嵌宿主聊天 UI**：slot 渲染只允许入口渲染自己声明过的子槽（`conversation.content` 已被宿主 factory 声明）、`ctx.slots.renderSlot` 只渲 `'root'`、插件 `require` 只有 10 个静态模块（react/react-dom/cordis/zod/primitives/slots/store/dockkit/tanstack-virtual）。
- **可用的宿主件**：primitives 提供 `MarkdownText`、`CodeBlock`、`FileTypeIcon` 与图标族。
- **布局观测**：tab body 可经槽级 hook `useTabInfo()` 读 `{sidebar:{expanded,fullscreen}, tab:{visible,actions,...}}`，拿不到 panel 级 `toggleExpanded/toggleFullscreen`；右栏可拖宽（最小 300px）、可全屏（`--dsh-sidebar-width:100vw`）。宽度需自量。

## 4. 设计

### 4.1 形态与宽度

- 单一 RAG tab 内两栏：**左＝现有知识库详情六 tab；右＝会话栏**。
- 按 tab body 实测宽度（ResizeObserver，非 window）分档：
  - **宽档 ≥720px**：两栏同屏。左栏最小 380px；右栏 flex 1、最小 320px、最大 46%；栏间 1px 分隔线（宿主 border token）。
  - **窄档 <720px**：单栏详情；会话栏为 tab 内**浮层**（100% 宽 × 100% 高，覆盖详情），栏头带返回钮，Esc 关闭。
- 入口：库名右侧、⋯ 菜单左侧的**宿主侧边栏钮**——复用宿主右侧栏展开钮同款图标（`IconPanelLeftOutlineRegular`）、28×28 ghost 图标钮与 tooltip（zh「打开会话栏」/ en「Open chat sidebar」）。宽档＝展开/聚焦右栏（若已收起）；窄档＝打开浮层。
- 宽档右栏可收起（栏头钮），开关状态记 `localStorage['hrag.panel.chat.v1']`（与 §4.5 同键，分段存）；窄档浮层不记状态。
- 宿主全屏时随宽度自然进入两栏；插件不主动请求全屏（无 panel 级 actions）。

### 4.2 会话栏结构

- **栏头**：当前会话标题（无会话时留空）＋「＋」新建钮 ＋ 收起/返回钮（按档位）。
- **会话列表（常驻，D9 已拍）**：栏头下方常驻，只列**当前库**的会话；行＝标题＋时间，当前项高亮，点击切换；可折叠（栏头箭头），最高 1/3 栏高、超出滚动。
- **正文**：消息流；贴底跟随；有更早历史时顶部「加载更早」。
- **底部**：自增高输入框（≤6 行）＋ 发送/停止钮。
- **空态**：该库无会话时，列表区显示「这个知识库还没有会话」，正文留空。

### 4.3 渲染面（轻聊）

以 `uiConversation.binding(id).target('chat')` 快照为唯一消息源（`order` ＋ `nodes`）；不新开事件流、不直读 jsonl、不自行重排。

| 节点 kind | 渲染 |
| --- | --- |
| `user` / `steering` / `turn-trigger` | `data.content.text` 纯文本（保留换行） |
| `assistant-step` | `data.blocks` 里 `kind === 'text'` 的块走 `MarkdownText`；`status === 'running'` 带流式，`'interrupted'` 标「已中断」；`reasoning`/`image`/`tool-call` 块跳过 |
| `tool-call` | `data.root` 一行：名称（有 `call` 时取 `call.name`，否则 `name`）＋状态（`preparing`/`start`＝运行中；结果 `isError`＝失败；否则完成）；不展开参数/结果；`visibility === 'hidden'` 跳过 |
| `turn-error` | `data.message` ＋可选 `data.code` 的错误行 |

- 其余节点（`turn-process` 用时汇总、`turn-tail`、思考、command/plan、审批/提问、子代理、图片/附件、用量）**不渲染**。
- 待处理交互：从 `uiSession` 的会话状态源读 pending 事实，栏头下方横幅「会话有待处理的交互」＋「在主会话打开」；不做交互 UI。
- 滚动跟随：距底 <32px 视为贴底；上滚解除跟随；发送或新消息到达时仅在贴底态自动滚动。

### 4.4 发送与停止

- 发送：`sessions.scope(id).get('conversation').send(text)`（宿主 `ConversationController.send`，queue 模式）；`trim` 后为空禁发。
- 成功：清空输入并保持焦点；失败：保留输入，栏内一行错误（code＋message）。
- 运行中 Enter 仍可发送（queue 排队）；栏底按钮位在运行中显示**停止**，调 `conversation.cancel()`，失败就地提示。
- 会话运行态以宿主会话对象为准（`binding.session.running`；Task 0 复核）。
- 不做附件、@ 引用、斜杠命令、模型选择、队列管理。

### 4.5 选会话与记忆

- 取数：`conversations/list`（已绑定行，含标题/时间/`kbId`），按当前库过滤（沿用已落代码）。
- 选择顺序：`localStorage['hrag.panel.chat.v1'].byKb[kbId]` 仍在列表 → 该库最近更新行 → 空态。
- 切库：按上述顺序重选；栏内草稿随会话切换丢弃（不做持久草稿）。
- 新建：走现有 `conversations/create`（workspace 成员＋绑定当前库）→ 插到历史首位、选中、聚焦输入。
- 标题：op 行标题；空标题回退库名/目录名/id（沿用宿主 displayTitle 口径）。

### 4.6 生命周期

- 选中：`sessions.retain(id, {source:'hrag-panel'})` → `await ready` → 取 binding；切走、切库、关面板均 `release()`（`finally` 保证）。
- 同一会话在主区同时打开时，两处共享同一 `eventSource` 与宿主会话对象；面板与主区互为镜像，引用计数互不干扰。
- 关面板不停止正在跑的回合；重开后由快照恢复。
- 断线（`sessions.list.phase !== 'ready'`）：正文骨架/错误、输入禁发；恢复后自动重试一次。

### 4.7 入口与抽屉处置（D6 已拍甲）

现状顶栏顺序是：库选择器 →「会话」按钮（显示本会话绑定，点开抽屉：本会话区＋该库会话列表＋新建）→ ⋯。接入会话栏后：

- 原「会话」按钮**原地改作聊天入口**（即 §4.1 的宿主侧边栏钮），不再显示绑定名。
- 「本会话绑定」收进顶栏 ⋯ 菜单：子项显示当前绑定的库名（未绑定时「未绑定」），可改绑/解绑；作用域仍是**当前宿主会话**。
- 原 `SessionDrawer` 整体退场（组件与专属文案清理）；列表与新建由右栏承担。

## 5. 决策

- **D1（已拍）**：A——面板内自绘轻聊；不嵌宿主聊天 UI（机制不允许，见 §3）。
- **D2（拍）**：只渲染 §4.3 四类节点；其余不渲染。
- **D3（拍）**：历史只列当前库会话（吸收原 per-kb D1）；空态文案沿用。
- **D4（拍）**：宽度门槛 720px；窄档浮层、宽档常驻可收起；入口在库名右侧。
- **D5（拍）**：发送走 `conversation.send`（queue），停止走 `conversation.cancel`；不做附件/引用/斜杠。
- **D6（已拍）**：甲——「会话」按钮改聊天入口（复用宿主侧边栏钮）；「本会话绑定」进 ⋯ 菜单；旧抽屉退场。
- **D7（拍）**：待处理交互只提示＋「在主会话打开」，不做交互 UI。
- **D8（拍）**：不做消息复制、反馈、重试、未读、搜索、草稿持久化。
- **D9（已拍）**：历史＝栏头下方**常驻列表**（只列当前库会话，当前项高亮；可折叠，最高 1/3 栏高）。

## 6. 不做

- 不复刻主聊天：思考、工具卡详情、图片/附件、审批与提问 UI、子代理卡、用量统计。
- 不新增 host op；不改 bindings 存储、`conversations/*` 契约与工具挂载/解析链。
- 不做跨库聚合列表、全文搜索、会话重命名/归档/删除（宿主侧负责）。
- 不动主区聊天、宿主右栏宽度与全屏机制。
- 不直读会话日志文件；一切消息来自宿主客户端服务。

## 7. 验收

1. 宽档：面板拉宽到 ≥720（或宿主全屏）两栏同屏；左详情六 tab 可用；右栏可收起再展开。
2. 窄档：<720 为单栏；库名右侧聊天图标打开浮层，Esc 关闭。
3. 新建：新会话出现在历史首位并被选中；该会话首次请求的 `request/header` 含五件 `hrag_*`（绑定即挂载）。
4. 发送/流式/停止：真发一条，assistant 文本流式出现；停止能中断；失败有就地错误且草稿保留。
5. 主区镜像：同一会话在主区打开，消息一致；主区发送后面板可见。
6. 切库：历史与选中随库切换；空库显示「这个知识库还没有会话」。
7. 常驻列表：只列当前库会话、当前项高亮、点击切换；折叠/展开可用；有更早历史时「加载更早」可拉取。
8. ⋯ 菜单「本会话绑定」：显示当前库名、可改绑/解绑，任一步后宿主工具表随下一请求变化（绑定即挂载）。
9. 待处理交互：可复现时横幅出现，「在主会话打开」落在主区该会话。
10. 回归：六 tab、上传、切片/Wiki 抽屉、召回/评测/图谱面零变化。
11. 门禁：`node --check client.js`；既有冒烟；文案一致性探针（键集/占位/新文案）；若动 host 层则 `tsc` 与 strip-types。

## 8. 影响面

**改的**：`client.js`（会话栏组件族、栏头常驻列表、输入框、retain/release 与选择逻辑、宽度分档、宿主式入口钮、`SessionDrawer` 退场与 ⋯ 菜单绑定项、i18n）。

**不改的**：`src/*`（复用 `conversations/create|list`）、bindings 与清洗、gating、引擎 `harness-rag`、主树 `deer-flow`、宿主布局机制。

**测试**：插件无客户端测试底座，门禁沿用 `node --check` ＋仓外文案一致性探针＋真栈手验；投影适配层单点隔离宿主字段，便于宿主升级时定位。

## 9. 风险与逃生

- **宿主快照字段非公开契约**：`target('chat')` 的节点字段属宿主内部形状。缓解：只依赖 `kind` 与 Task 0 核实过的字段；单点适配层（`chatProjection`）隔离；宿主升级回归入验收。
- **retain 泄漏**：切会话/切库/关面板必须 `release()`；用 `finally`，切换幂等。
- **长流性能**：整快照订阅重渲，量级与主区一致（主区同一快照）；不额外轮询、不做虚拟滚动。
- **交互卡死**：宿主 agent 若发起审批/提问，面板无 UI；以横幅＋跳主区兜底（D7）。
