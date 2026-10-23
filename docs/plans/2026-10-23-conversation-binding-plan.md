# 会话知识库绑定（面板内） Plan

**Spec:** [2026-10-23-conversation-binding-spec.md](../specs/2026-10-23-conversation-binding-spec.md)
**Status:** ✅ 全收官（2026-10-23 Task 0–5 完成、真栈 1–9 手验通过；Task 6 收口已落 `6867222`，D1 甲、D2 乙、D3 甲、D4 甲、D5 甲、D6 甲、D7 不弹确认、D8 悬空标灰；多库不做；10-23 对照实码审查后修订 P1–P3）
**Architecture:** 绑定落在 host 半的 JSON 文件（`<DSH_HOME>/harness-rag/bindings.json`），面板经既有具名路由读写；工具 `kb()` 在参数与 `defaultKbId` 之间插入「会话绑定」一格。client 半只加顶栏按钮＋覆盖抽屉；打开会话走 `ctx.uiWorkspace.openSession`，新建走 host `sessionController.create` 再导航。

**硬约束**：只改插件仓 `E:\app\python\agent\dsh-harness-rag`；引擎 `harness-rag` 与主树 `deer-flow` 只读零改动；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。`node_modules/` 为既有未跟踪目录，不触碰、不纳入提交。不往会话记录里写任何事件。多库混合不做。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 核面板的会话身份来源：`sidebar.right.pane.tab` 是 session 作用域槽，组件以**标准 prop `sessionId`** 收到所属会话（同槽 `FilesBody({ useTabInfo, sessionId, … })`、`ScheduleTaskTabTitle({ sessionId, … })` 实证）；`useTabInfo()` 只回 `{sidebar,panel,tab}`、不含 sessionId。我方注册在 `client.js:21128-21130`（`key:'dsh-harness-rag'`），签名 `KnowledgePanel({ t })`（`20213`）需改 `({ t, sessionId })`；hostless 路径无该 prop 时按未绑定渲染。
- [x] 核右栏布局作用域：`useTabInfo` 读 `state.bySession[sessionId].layout` ⇒ per-session；`openSession` 切会话后右栏显示目标会话自己的布局（抽屉不留在原地）。
- [x] 核 `ctx.uiWorkspace` 可从插件 client 半注入：服务目录八件含 `uiWorkspace`，`openSession(target)` 在册；内置件用 `ctx.inject([… 'uiWorkspace'], cb)`（agent-preset client）⇒ 本对用 scoped inject 捕获，不进顶层 `inject`。
- [x] 核 host 服务注入：`ctx.inject(['sessionController'], cb)` 与既有 `host.inject(['webServer'], …)`（`src/kb_proxy.ts:614`）同款；`create` 只给 `cwd` 时缺省回落 `defaultCwd`，返回 `{sessionId, agentPreset?}`。
- [x] 核工具上下文里的会话 id：`ToolExecutionInput.agent?: Agent` 可缺；`Agent` 同时有 `readonly id: SessionId` 与 `readonly session: Session`（同一身份）⇒ **实施用 `exec.agent?.id`**（类型最直接），`exec.agent?.session?.id` 等价；子代理调用带子会话 id。
- [x] 核 `DSH_HOME` 解析：`DSH_HOME` 环境变量，**空白串视同未设**，缺省 `~/.dsh`（`dsh-home-paths` 规则）。
- [x] 复核 `ctx.storageDomain` 可达性：插件 `node_modules/@deepseek-ai/` **无 `dsh-storage-domain`**（只有 cordis/dsh-tools 等 dev 依赖）⇒ 不可用，D4 甲（JSON 文件）成立。
- [x] 复读锚点：顶栏 `client.js:20628`、库选择器 `20631-20695`、`TabsStrip` `19943`（定义）/`20733`（渲染）、抽屉样式 `2706-2715`、`ToasterHost` `3327`、工具 `kb()` `src/tools.ts:59-70`、路由 `src/kb_proxy.ts:20/57/562/614`、入口 `src/index.ts:11-21`。
- [x] 工作区核对：插件 HEAD `92a16b2`，未提交＝本对 spec/plan＋既有 `node_modules/`；引擎 `harness-rag` `git status` 空；主树 `deer-flow` 本对零触碰。

**实测**：Task 0 已跑（2026-10-23）。四条关键结论：①面板拿会话身份用**标准 prop `sessionId`**（`useTabInfo` 不含它）；②右栏布局 per-session，跳转后抽屉不留在原地；③`Agent` 的 `id` 与 `session.id` 同身份，`exec.agent?.id` 可直接用；④`@deepseek-ai/dsh-storage-domain` 未装 ⇒ D4 甲不变。另记两条实施面变化：`title` 投影值是 `string | null`（`row.projections.values.title` 直接可用）；**仓内已无冒烟 runner**（`_scratch/` 与前两对的 React 19＋happy-dom 已清、`node_modules` 里没有 react/happy-dom）⇒ Task 3/4 的组件冒烟需在仓外重建（临时装依赖、不入提交面），否则退化为纯函数探针＋真栈手验。

## Task 1 — 绑定存储（TDD）

> 动到的文件：`src/bindings.ts`（新增）、`tests/bindings.test.ts`（新增）。

- [x] 先写测试：`sanitizeBindings` 收 `{version:1,bindings:{}}`；坏 JSON / 缺 `bindings` / 值非对象 / `kbId` 非字符串⇒空表；未知 `version`⇒空表；未知字段丢弃。
- [x] `createBindingsStore({ homeDir, fs?, now? })`：`loadSync()`/`get(sessionId)`/`set(sessionId, kbId, kbName?)`/`delete(sessionId)`/`list()`/`path`；测试用临时目录，覆盖首次创建目录、写后读回、删除、多次 `set` 串行落盘。
- [x] 原子写：临时文件 + `rename`；写失败时不破坏旧文件；坏文件在覆盖前备份 `.bak`（测试注入会抛错的 `writeFileSync`）。
- [x] 同步载入：`loadSync()` 用 `readFileSync`（文件小），启动期调一次且**幂等**；`get()` 只读内存，`set()`/`delete()` 先改内存再串行落盘——保证 `kb()` 全程同步。
- [x] 纯助手：`resolveKbId({ argKbId, sessionId, bindings, defaultKbId })` 按 `arg > binding > default` 返回 `{ kbId, source } | null`；`source ∈ {'arg','session','default'}`；空白值不占任何一档。
- [x] 门禁：`node --test tests/bindings.test.ts`；`node --experimental-strip-types --check src/bindings.ts`。

**实测**：落 `src/bindings.ts`（172 行）＋`tests/bindings.test.ts`（218 行，16 例）：清洗 5 例、解析链 4 例、存储 7 例。`set()` 返回本次落盘的 Promise（调用方是面板 op，可 await；工具侧只读内存不等待）；写队列 `writes.then(writeNow)` 串行、单次失败不毒化后续写。`loadSync()` 已载入后再次调用直接返回（幂等，避免把内存里的新值冲掉）。坏 JSON 不在读取时改文件，只在**下一次写**前 `copyFileSync(path, path + '.bak')`。门禁：`node --test tests/*.test.ts` **44/44**（既有 28＋新增 16）、`tsc -p tsconfig.json` 零错、`--experimental-strip-types --check` 与 `node --check client.js` 均过。实现期发现并修正一处**测试自身**的错误：`resolveKbId` 的「无来源」用例里误留了 `s1` 绑定，导致期望 `null` 与实际 `session` 冲突；改为不绑定的 `s2` 后全绿（实现未改）。

## Task 2 — host 四个 op＋工具链接线

> 动到的文件：`src/conversations.ts`（新增，实施期拆出）、`src/kb_proxy.ts`、`src/tools.ts`、`src/index.ts`、`tests/conversations.test.ts`（新增）。

- [x] 四个 op（不转发引擎，直接读会话目录＋绑定表）：
  - `conversations/list`＝`sessionController.list()` 左连接绑定，返回有绑定的行 `{sessionId,title,updatedAt,running,blank,cwd?,kbId,kbName?}`，按 `updatedAt` 倒序；入参 `currentSessionId` 时把当前会话行一并带回（未绑定时 `kbId: null`），供「本会话」区与新建取 `cwd`。
  - `conversations/create`＝`create({cwd, agentPreset})`；`agent-preset/*` 去掉预设重试一次；成功后写绑定并返回 `{sessionId, agentPreset?}`；`cwd` 可选，缺省交由宿主回落 `defaultCwd`。
  - `conversations/bind`＝`{sessionId, kbId, kbName?}` upsert。
  - `conversations/unbind`＝`{sessionId}` 删除。
- [x] 控制器晚到：`registerKbProxy` 内用 `ctx.inject(['sessionController'], cb)` 填 holder；缺控制器时 `list` 返回 `{ready:false, items:[]}`、`create` 报 503（`bind`/`unbind` 不需要控制器，照常可用）。
- [x] `registerTools(ctx, config, bindings)`：`kb()` 改读 `exec.agent?.id`，按 `resolveKbId` 解析；无会话或未绑定走 `defaultKbId`；悬空按引擎错误原文抛出，不回落。
- [x] 工具结果回显：五枚 `hrag_*` 的输出 schema 与返回值都加 `kb_id` 与可选 `kb_name`（只有会话绑定来源才带名字）。
- [x] `src/index.ts`：创建 store、`loadSync()`、`registerTools` 与 `registerKbProxy` 传参（`registerKbProxy` 新签名 `(ctx, config, bindings, modelSync?)`）。
- [x] 测试：`tests/conversations.test.ts` 12 例（`mergeRows` 3、`createSession` 3、四 op 6）。
- [x] 门禁：`node --test tests/*.test.ts`；`node node_modules/typescript/bin/tsc -p tsconfig.json --pretty false`；引擎零 diff。

**实测**：实现拆成 `src/conversations.ts`（约 160 行）承载 `mergeRows`/`createSession`/`conversationOps`，`kb_proxy` 只做接线（`buildOps` 与四 op 合表）。与计划的三处偏差：①「not_ready」改为 `list` 回 `{ready:false, items:[]}`、`create` 报 503——比只回一个码更好用；②`create` 的回落条件是 `code.startsWith('agent-preset/')`（覆盖 not-found 与 invalid）；③预设 id 以常量 `KNOWLEDGE_PRESET='harness-rag-knowledge'` 放在 `conversations.ts`，不进配置（它就是本插件 `presets/knowledge.patch.yml` 的 id）。工具侧：`kb()` 返回 `{kbId, kbName?}`，五枚工具统一 `echo(target)`；`hrag_read_document` 由直接透传 payload 改为 `{...payload, kb_id, kb_name?}`。门禁：`node --test tests/*.test.ts` **56/56**（44＋12）、`tsc` 零错、五个改动 TS 文件 `--experimental-strip-types --check` 与 `node --check client.js` 全过。

## Task 3 — 面板顶栏入口＋抽屉＋绑定区

> 动到的文件：`client.js`（顶栏、抽屉组件、样式、内联 zh/en 词条）。

- [x] `KnowledgePanel({ t, sessionId })`：`sessionId` 走标准 prop；缺失时按未绑定渲染（hostless 冒烟可跑）。
- [x] 顶栏加按钮（库选择器与 `⋯` 之间）：14px 图标；已绑定实心点（`state-success-primary`）、未绑定空心（`label-tertiary`）；`title` 写「本会话使用：<库名>」或「本会话未绑定知识库」；198px 档只留图标。
- [x] 抽屉骨架复用 `.hrag-drawer`：标题「会话」、Esc/遮罩关闭、打开不改变当前 tab；区块＝「本会话」（标题＋「使用知识库」行）＋「RAG 会话」（列表位，Task 4 填）。
- [x] 「使用知识库」单选菜单（复用 `DshMenu`）：当前绑定打勾；选中即调 `conversations/bind`，成功后顶栏状态与抽屉同步并出 Toast「已切换到 <库名>，此后检索使用该库」；回合运行中改为「下一条消息生效」。
- [x] 「移除绑定」入口（菜单末项或行尾按钮）→ `conversations/unbind`。
- [x] 词条（zh/en）：会话、本会话、使用知识库、未绑定、选择知识库、已切换/下一条消息生效、移除绑定、RAG 会话、新建、空态。
- [x] 门禁：`node --check client.js`；组件冒烟（无 host 路径）覆盖按钮三态（未绑定/已绑定/无 sessionId）、菜单勾选、Toast 文案两分支。

**实测**：入口拆成 `SessionEntryButton`（图标＋label，`barNarrow` 时只留图标）与 `SessionDrawer`（本会话区＋列表区）。`sessionId` 走槽位标准 prop（宿主 `ui-session` 的 `BUILTIN_SOURCE.props=['sessionId']` 实证，右侧栏整棵树在 `SessionProvider` 内）。面板每请求拉一次 `conversations/list`（`currentSessionId`），顶栏按钮与抽屉共用同一响应；绑定/解绑成功即刷新并出 Toast（`running` 分支文案不同）。顶栏布局补了一条 `.hrag-bar > .hrag-sessionbtn { margin-left: auto }`——原「⋯ 靠右」规则（`.hrag-mmhost + .hrag-mmhost`）因中间多了一件而失效，改由会话钮吃掉自由空间、⋯ 仍贴右。抽屉「本会话」区固定、列表区独立滚动（`.hrag-sess-listsec`）。门禁：`node --check` 过；冒烟改为**仓外 hostless 探针**（`E:/appdevelop/hrag-probe/client-probe.mjs`，React stub 浅渲染）：模块加载、tab 注册、zh/en 838 键、四 op 引用、按钮三态（绑定 tooltip/实心点、未绑定 tooltip/空心、窄档 icononly、点击开抽屉）、菜单勾选与「移除绑定」项、抽屉列表/空态/悬空/点击/移除、相对时间五档，全过。**未覆盖**：Toast 两分支的真渲染（浅渲染不跑 KnowledgePanel 的异步链）⇒ 真栈手验第 8 条补。另发现一条**既有**词典缺键（`set.form.modelPickerAria` 仅 zh 有），与本对无关，未动。

## Task 4 — 会话列表＋新建＋跳转

> 动到的文件：`client.js`（抽屉列表、新建、导航接线）。

- [x] 打开抽屉时拉 `conversations/list`（带 `currentSessionId`）；行＝标题（缺省「新会话」）＋库名＋相对时间；`running` 带状态点；「本会话」区用响应里的当前行（未绑定时 `kbId:null`）；空态「还没有绑定知识库的会话」＋「新建」。
- [x] 点击行 → `ctx.uiWorkspace.openSession(sessionId)`（apply 期用 scoped inject 捕获服务，组件不直接持 ctx）；主区切到该会话，右栏随之切到目标会话自己的布局（抽屉不留在原地，属预期）。
- [x] 「新建 ＋」：按当前浏览库调 `conversations/create`（`cwd` 取当前会话行，取不到则不传、由宿主回落 `defaultCwd`）→ 成功 `openSession`；预设回落由 host 完成。
- [x] 悬空绑定行：库名后「（已删除）」、整行降透明度，仍可跳转；行内「移除绑定」可用。
- [x] 门禁：`node --check client.js`；冒烟覆盖列表渲染/空态/点击调用 `openSession`（桩）/新建成功与 400 分支/悬空行。

**实测**：列表只取 `items` 里 `kbId` 非空的行（当前会话未绑定时仍只在「本会话」区显示）；行内容＝运行点（可选）＋标题＋库名（悬空加「（已删除）」）＋相对时间（36px 单行；移除钮常驻 20px 槽位、`opacity:0`，悬停/聚焦才显形——避免悬停时布局跳动）。点击行经 `uiWorkspaceHolder` 调 `openSession`（holder 由 `apply` 期 `ctx.inject(['uiWorkspace'])` 填；缺件时 Toast 报错不崩）。「新建」按钮与空态里的「新建会话」共用 `newConversation`：`kbId`/`kbName` 取面板浏览库、`cwd` 取当前行、缺 `cwd` 不传；成功先关抽屉再 `openSession`。新建的失败分支（400/503/预设）统一 `showToast(errorDetail)`——host 侧预设回落已由 Task 2 覆盖。相对时间：刚刚/分钟/小时/昨天/天/日期六档（`relativeTime`）。门禁：`node --check` 过；探针覆盖三行列表（含一行悬空）、空态按钮、缺控制器提示、加载提示、hostless 无 picker/标题为「—」、行点击与移除（`stopPropagation` 生效）——全过。**未覆盖**：真实 `openSession` 的跳转效果与「新建后绑定落盘」，留真栈手验第 5/6 条。

## Task 5 — 门禁与真栈验收

> 动到的文件：无（探针/截图仓外）。

- [x] `node --check client.js`；`src/*.ts` strip-types 全过；`node --test tests/*.test.ts` 全绿；`node node_modules/typescript/bin/tsc -p tsconfig.json` 通过；hostless 冒烟全绿。
- [x] DSH 整重启后按 spec §5 逐条手验（1–9），并核对：文件落点与结构、顶栏三态、抽屉几何（198/400/560）、跳转后面板保持、新建后的绑定。
- [x] 回归：六 tab、上传、切片抽屉、Wiki 抽屉、召回/评测/图谱；无绑定时的默认库口径不变。
- [x] 引擎 `harness-rag` 与主树 `deer-flow` 零 diff；提交面只含本对文件。

**真跑清单（他手验）**：

1. **解析链**：绑定 A 库后，不带 `kb_id` 检索走 A；带 `kb_id` 覆盖；移除绑定回到 `defaultKbId`；子代理会话回落 `defaultKbId`。
2. **持久**：绑定后整重启 DSH，面板与工具都仍按绑定走；`bindings.json` 结构正确。
3. **入口**：顶栏按钮位置、198px 图标态、tooltip、开关抽屉不切 tab。
4. **绑定**：切换即时生效＋Toast；顶栏状态同步；移除绑定复位。
5. **列表**：列表区只列已绑定会话、倒序、标题/库名/时间正确；未绑定时「本会话」区仍显示标题；点击跳转后右栏切到目标会话自己的布局（抽屉不留在原地）；空态。
6. **新建**：按当前浏览库建会话并跳转；缺 `cwd` 时不传、宿主回落 `defaultCwd`、按钮不禁用；预设缺失回落仍成功。
7. **悬空**：删库后标灰可移除；工具报错原文。
8. **运行中切换**：不打断当前回合，文案为「下一条消息生效」。
9. **回归**：六 tab 与既有抽屉零变化。

**实测**：静态门禁重跑（2026-10-23）：`node --check client.js` 过；`node --test tests/*.test.ts` **57/57**（新增 `conversations/list` 宿主 `{items}` 信封的回归例）；`tsc -p tsconfig.json` 零错；五个 TS 文件 strip-types 全过；仓外 hostless 探针全绿；引擎 `harness-rag` `git status` 空、主树 `deer-flow` 无本对改动。

真栈手验（10-23；期间 DSH 整重启 2 次，含 §5.2 的持久验证）：

1. **解析链**：会话绑定 `t3-panel-acceptance` 后发「请调用知识库检索工具查一下 t3-doc-a…」——工具参数只有 `query`（无 `kb_id`），结果 JSON 回显 `"kb_id": "9141e58dee8a4a08a32c5758395d720a"` 且取到 t3-doc-a 正文；`arg > binding > default` 与子代理回落由 `tests/bindings.test.ts` 的 `resolveKbId` 例覆盖。
2. **持久**：整重启后 `bindings.json` 原样保留，顶栏标题仍是「本会话使用：测试」且实心点、抽屉 picker 仍为「测试」；文件结构 `{version:1,bindings:{session-…:{kbId,kbName,updatedAt}}}` 与 §4.6 一致；坏 JSON 空表不崩由 `tests/bindings.test.ts` 覆盖。
3. **面板入口**：DOM 子序＝库选择器（`.hrag-mmhost`）→ `.hrag-sessionbtn` → `⋯`；551px 档 label 显示；把容器强制到 174px（<208）时 class 变 `hrag-sessionbtn-icononly`、label `display:none`、`title` tooltip 保留，恢复宽度后回宽态；开关抽屉（覆盖层）不切当前 tab。
4. **绑定**：抽屉内改绑「测试」→ Toast「已切换到 测试，此后检索使用该库」、顶栏 title 同步、点变实心；「移除绑定」→ Toast「已移除绑定，本会话回到默认知识库」、picker 回「未绑定 · 选择知识库」、hint 与空心点复位、`bindings.json` 变空表、列表行消失。
5. **列表与跳转**：两行按 `updatedAt` 倒序（新会话 3 分钟前 / 友好问候 6 小时前），行内标题＋库名＋相对时间＋尾随 ✕；点「新会话」行 → 主区切到该会话、`window title` 变化、右栏换成目标会话自己的布局（页面内 `[class*=hrag]` 归零、抽屉不残留）；当前行带 `hrag-sess-item-current` 左条；空态与未绑定「本会话」标题前置已验。
6. **新建**：抽屉「新建」→ `conversations/create` 返回 `session-785d137d-…`、绑定即时落盘（kbId 同当前浏览库）、主区跳转，新会话右栏为宿主空白布局；`cwd` 取当前行、取不到则不传（本会话有 cwd，未走缺省分支；宿主 `defaultCwd` 回落与预设回落由 host 单测覆盖）。
7. **悬空**：用不存在的库 id 造绑定（不删真库）→ 行带 `hrag-sess-item-dangling`、库名「已删测试库（已删除）」；行内 ✕ 移除成功（行消失、文件删项）；工具回合报引擎原文 404「知识库不存在」，未回落默认库。
8. **运行中切换**：回合进行中改绑 → Toast「已切换到 测试，下一条消息生效」、顶栏同步；当前回合未打断，正常跑完并出答复（`conversations/list` 的 `running` 由 true 回 false）。
9. **回归**：六 tab（文档/图谱/Wiki/召回/投影/评测）逐一切换均渲染、评测页数据正常、无「加载失败」；`⋯` 菜单仍含「上传文档／刷新界面／更新 Wiki／重建 Wiki／重命名／删除知识库」；无绑定状态下按钮与抽屉照常可用（§5.4 解绑后即该态）。

## Task 6 — 收口

> 动到的文件：本对＋`README.md`＋`docs/equivalence.md`。

- [x] 回写 spec Status 与本 plan 各 Task 实测。
- [x] `README.md`：功能处补一句「会话可绑定知识库（面板内切换；绑定存 host，工具检索按绑定取库）」；数据落点加 `~/.dsh/harness-rag/bindings.json`。
- [x] `docs/equivalence.md`：登记「会话绑定＝插件增加（工作台为 per-thread 绑定；本插件在 DSH 会话上复刻同一语义）」。
- [x] 逐文件核 hunk，排除 `node_modules/` 与并行工作区；提交信息英文 Conventional ASCII；回填提交链。

**实测**：spec Status 改「已实施·真栈验收通过」、Task 5 九条实测回写（2026-10-23）；README 的 kb_id 链改为「参数 ＞ 会话绑定 ＞ defaultKbId」并新增会话绑定词条（含 `bindings.json` 落点）；等价表 §1 绑库行改判等价、§11 增「会话级绑库」行、§12 删「不做」行、核对日期更新。实现笔 `ec58a41`（10 文件、+1783/−32），收口文档本笔；引擎与主树零 diff；`node_modules/` 未纳入。

---

## 提交链（滚动记实）

- `ec58a41` — `feat(panel): bind a knowledge base per session`（实现＋spec/plan）
- `6867222` — `docs(panel): close out the session binding pair`（README／等价表／Task 5–6 回写）
