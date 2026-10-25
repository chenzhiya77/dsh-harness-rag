# Agent 宠物 2a:app 的灯 + 缩放控件(2026-09-12)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标**:把宠物从「这个线程的灯」变成「**app 的灯**」—— 在 `workspace` 全站任意切换都在;并让 `displaySize` 用户可控。

**设计依据**:`docs/superpowers/specs/2026-09-09-agent-pet-sprite-design.md` 的 §4.1 重开段、§10.2(缩放)、§10.3(跨页)。**本 plan 不重新论证设计**;与 spec 冲突时先改 spec。

**本期的定义性约束**:零美术、零新帧。只有前端架构、设置与控件。美术增量见 2b(另一份 plan / 另一个会话)。

**约定**:
- 纯逻辑放 `core/pet/`(`*.test.ts`,node 环境);只有真渲染才用 `*.dom.test.tsx`(贵约 3 倍)。
- 每个 Task 末尾写**交付纪要**:真实数字 / revert 证明 / 偏离 / 未覆盖项。**未覆盖项必须显式列出**,不许用「验证通过」盖过去。
- 门禁:`frontend` 下 `pnpm check`(scoped eslint + 过滤 tsc)+ 相关测试全绿。
- **提交粒度**:Task 0 结论落 spec 一笔;Task 1-6 按可独立回滚的单元提交。提交前 `git status` 核对该笔只含本线文件。

---

## Task 0:前置核实与设计取舍(**阻塞后续所有任务**)

§10.3 列了四个待核实项,其中第 ② 项会**决定 Task 1 的形态** —— 不闭环不许写代码。

- [x] **Step 1(能不能不动 sidecar / knowledge)** 读 `components/workspace/sidecar/sidecar-panel.tsx:156` 与 `components/workspace/knowledge/chat-panel.tsx:163` 的 `useThreadStream` 调用:**它们传的 `threadId` 是不是当前主线程**(`displayThreadId` / `context` 各是什么)。结论只有两种:① 用的是别的线程 ⇒ 本期不动;② 与主线程同一个 ⇒ 它们也必须改成消费 provider,工作量翻倍。
- [x] **Step 2(薄 vs 厚)** 通读 `core/threads/hooks.ts:1534` 的 `useThreadStream` 全貌,把返回值与内部状态分成两类:**页面专属**(`optimisticMessages`、`pendingSuperseded*`、`isUploading`、replay mask、`onSend/onStart/onFinish` 监听)与**宠物需要的**(`messages`、`isLoading`,以及切线程时的重置契约)。产出是一张清单,不是印象。
- [x] **Step 3(三条候选做取舍)** 用 Step 2 的清单在三条里选一条,判据是**换页后仍能说出「在等你」**、且不引入难以收拾的副作用:

  | 候选 | 形态 | 已知代价 |
  |---|---|---|
  | **A 整体上提** | 把 `useThreadStream` 提到外壳,页面改成消费 | 一大坨页面专属状态跟着进外壳,风险最高 |
  | **B 薄订阅并列** | 外壳只用 SDK `useStream` 订 `messages`+`isLoading`;页面保留自己的富 hook | 同一线程**两条订阅**;要证明双订阅无害(后端 StreamBridge 是多订阅广播,但必须实地确认,不能推断) |
  | **C 页面快照广播** | 页面把宠物需要的切片发布到外壳 store | 最便宜,但**换页即失活** ⇒ 说不出「在等你」,**已判为不满足目标**(除非前两条都被否) |

- [x] **Step 4** 结论写回 spec §10.3,把「待核实项 ① ②」关掉或改写;**若结论推翻 §10.3 的形态,先改 spec 再动代码**。
- **验收**:Step 1 有明确引文;Step 2 有清单;Step 3 有选定项 + 否掉另两条的理由;spec 相应处已更新。
- **交付纪要(2026-09-12 完成)**:
  - **Step 1 结论 = ① 两者都用别的线程,本期不动**。证据(引文):`sidecar-panel.tsx` 传 `threadId: sidecar.sidecarThreadId`;`knowledge/chat-panel.tsx` 传 `threadId: isNewThread ? undefined : threadId`,而它的 `threadId` 来自 `useState(() => uuid())` + `metadata.kb_id`(kb 绑定线程,与主线程无关)。⇒ 原「工作量翻倍」的分支不存在。
  - **Step 2 清单**:`useThreadStream` 的返回(`hooks.ts:2605`)九项中,**宠物只要 `thread`(`messages` + `isLoading`)**,其余八项(`sendMessage` / `regenerateMessage` / `editAndRegenerateMessage` / `isUploading` / `isHistoryLoading` / `hasMoreHistory` / `loadMoreHistory` / `pendingUsageMessages`)全是页面与 composer 机器。另:内部还有 `optimisticMessages` / `pendingSuperseded*` / replay mask / 上传态 / `onSend|onStart|onFinish` 监听 —— 全部页面专属。**关键**:`thread.messages` = 历史查询 + 实时流 + 乐观消息三者合并,而**历史那半本来就全局**(`useThreadHistory` 跑在 QueryClient 下),只有实时那半每次挂载各建。
  - **Step 3 选定 B+(薄订阅 + 主面注册),否掉 A 与 C**。A 被否的**新理由**(写 plan 时才看清):三个 chat 页面传的上下文不同(`context.agent_name`,以及新会话页的 `threadId: undefined` + `onStart` 回收新 id),外壳无法用一条 hook 持有 ⇒ 硬做等于在外壳建「活跃流注册表」,那已是 B+ 的另一半。C 被否:页面一卸载即失活,说不出「在等你」。**B+ 的要点**:外壳拿到 threadId 后**自己续订、不随页面卸载而断**;页面不改造成消费外壳。
  - **偏离**:spec §10.3 原文写的是 A(「chat 页面改成消费」),已按 Step 4 改写为 B+,并把 ① ② 两道待核实项关掉。
  - **未覆盖 / 新增待办**:① ~~**B+ 的硬假设仍未验证**~~ **已闭环(2026-09-12,Leg 1 的 spike)** —— 迟到的订阅者能否正确报告一条「已在飞行中」的 run:迟到 **8 / 10 / 32s** 三次都拿到**从事件 0 的完整回放**(119 / 675 / 864 事件)并收到 **`event: end`** ⇒ 外壳能报告「在跑」与「跑完」,结论见本 Task 的 Leg 1 段;② ~~知识库面板要不要也注册~~ **已裁决(2026-09-12,用户):跟** —— 共**四个主面**注册(含 `knowledge/chat-panel`,只加一行、不重构);不跟的话在知识库里聊天时宠物会显示主线程那条可能一直 idle 的线程,看起来像坏了。

## Task 1:外壳薄订阅 + 主面注册(TDD)

按 Task 0 的裁决(**B+**)实现:外壳持有**一条薄订阅**,主面**注册**线程 id。**不是**把页面改造成消费外壳。

- [x] **Step 1(spike,阻塞)** 坐实外壳薄订阅的机制。**Leg 0(静态)+ Leg 1(传输层)+ Leg 2(重定向后)均已跑完(2026-09-12);Leg 3 移出到 Task 5 Step 3。** Leg 0 改变了机制的形状,Leg 1/2 把剩下的假设全部实测掉。

  **Leg 0(静态读源码,已完成)**:应用走 `useStreamLGP`(选项里没有 `transport`,`dist/react/stream.js` 的分流),返回的 `isLoading` = `stream.isLoading`(`stream.lgp.js:401`),而它**只在两种情况下为真**:① **本 hook 自己**发起 submit(49/55);② 挂载时的 reconnect 路径(386-388)调到 `joinStream(runId)`,而它需要 `reconnectOnMount` 真值(应用已开,`hooks.ts:1667` ⇒ `sessionStorage`)、`lg:stream:<threadId>` 里有 runId,且 `reconnectKey` 这个 memo **重算** —— 它的依赖是 `[runMetadataStorage, stream.isLoading, threadId]`。
  ⇒ **两条推论**:
  - **A(订阅后跑)**:外壳在 run 已在飞时挂上,若 `lg:stream:X` 已有 runId ⇒ 会 join ⇒ `isLoading` 真、能收后续事件。**预期可行。**
  - **B(先订阅后跑,即常见情形)**:外壳的 hook 先挂好,随后页面发送消息、另一个 hook 把 runId 写进 storage ⇒ **外壳那条的 memo 不会重算**(它的 `stream.isLoading` 仍为 false、`threadId` 未变)⇒ **`isLoading` 永远 false**。**静态预测:这条路径不行。**
  ⇒ **机制必须改**:注册协议要带 **runId**,而不是只带 threadId(`useThreadStream` 的 `onCreated` 已经拿到 `meta.thread_id` + `meta.run_id`,`hooks.ts:1676`),外壳侧显式 join。两个候选(**Leg 1 实测后选定 J2**):
  - **J1** 外壳把 runId 写进 SDK 的私有 key `lg:stream:<threadId>` 并让 hook 重挂 —— 零新流代码,但依赖 SDK 私有实现;
  - **J2** 外壳自己 `getAPIClient().runs.joinStream(threadId, runId)` —— join **只当存活信号**,精确状态在 run 结束时**重取一次 thread state**(那时消息已落盘,`wait` 才可靠)。

  **Leg 1(传输层)已跑完(2026-09-12,私有免鉴权实例 8099,不需要登录)**。三条 run,全部在**已在飞行中**时才 `/join`:

  | run | 迟到 | 事件总数 | 收到 | 首个事件 | 终态 |
  |---|---|---|---|---|---|
  | `sleep 45` | 8s | 119 | 119 | `…-0`(run 首事件) | `event: end` ✅ |
  | 1500 字散文 | 10s | 675 | 675 | `…-0` ✅ | `end` ✅ |
  | 2500 字散文 | 32s | 864 | 864 | `…-0` ✅ | `end` ✅ |

  ⇒ **拿到的是从事件 0 的完整回放 + 终结帧**,比原判据要求的「尾部」更强。**未验**:`gap` 路径没能触发(非法 / 合法但极旧 / 未来 id 三种都完整回放;`queue_maxsize` 默认 256,但订阅时事件已远超 256 仍完整回放)⇒ 记为未测,因此 J2 仍要求在 run 结束或收到 gap 时**重取一次 thread state**。

  **Leg 2(原「客户端 A/B 两条件对照」)已重定向并跑完**。原设计要用「第二个 `useStream`」探针在 J1/J2 之间选;但 **Leg 1 已证明原始 `/join` 可用 ⇒ 直接选 J2(客户端级 join),那个探针失去对象**。改为跑两件不需要登录、且真正决定设计的事:
  - **premise(实测钉死「status 说不出在等你」)**:一条以 `ask_clarification` 结束的 run 与普通跑完**完全同形** —— run 都 `success`、`GET /api/threads/{id}.status` 都 `idle`;唯一区分点是消息里的 `artifact.human_input`(`request_id=clarification:call_84b93bbd…`、`input_mode=free_text`、`version=1`)。**判据成立 ⇒ 粗档作废,wait 必须由消息派生。**
  - **并发(把「两条订阅」从推断变实测)**:两个订阅者同时挂同一条 run,**各拿到 111 事件**(`metadata` 1 / `values` 13 / `messages` 95 / `end` 1,逐项相同)、都从 `…-0` 起、都看到 `end`、互不干扰 ⇒ 代价就是 2× 事件量。

  **Leg 3 移出本 spike**:它要「宠物在切页状态下显示 `wait`」,而 2a 未落地时离开聊天页**根本没有宠物** —— 它是功能验收,且**已逐字写在 Task 5 Step 3**,留在那里。

  **证据与可复现性**:结论已写回 spec §10.3 待核实项 ⑤;脚本是一次性的(已删),但上表的数字与判定都在此处与 spec 里。**机制若有变,先改 spec 再写代码。**
- [x] **Step 2(先写红测试)** 契约三条:① **宠物只认外壳那一条** —— 页面那条富 hook 与宠物无关,两者不得争「谁更新宠物」;② `threadId` 切换时的重置照 §11 既有契约(fatigue / `wasLoading` 归零、`greet` **不重放**);③ 无注册线程 / 非聊天页时给出稳定空态,不抛错。
- [x] **Step 3** 实现外壳薄订阅(只取 `messages` + `isLoading`)+ 注册协议。**要点:外壳拿到 threadId 后自己续订,不随页面卸载而断** —— 这正是「换页后仍在跑 / 仍能说在等你」的来源。
- [x] **Step 4(阻塞已解,2026-09-12)** 四个主面**注册 `(threadId, liveRunId)`** —— **不是只有 threadId**:Leg 0 已证「只带线程 id」在那条最常见的路径上永远拿不到 `isLoading`,必须带 runId 才能 join。
  **那条线已落地**(用户选择等它):`liveRunId` 现在在 `HEAD` 里,是**派生值** —— `liveRun && liveRun.threadId === threadId ? liveRun.runId : null`(`hooks.ts:2621`),在 `onCreated` 时置入、随线程本地状态一起清;`chats/[thread_id]/page.tsx` 也已经在解构它。同批还落了一个 `@/core/constitution/run-id::resolveRunId(liveRunId, messages)`。
  **本步只用 `liveRunId`,不用 `resolveRunId`**:后者的回退值是「消息里最近一条 `run_id`」= 一条**已经跑完**的 run,join 上去只会立刻收到 `end`,而 `runId: null` 那条路径已经会取一次 thread state —— 所以回退在这里是白做功。**注册值**:`{ threadId, runId: liveRunId }`;新会话在首条消息前 `threadId` 为空 ⇒ 不登记(也不清掉上一个,见 `useRegisterActivity` 的注释:卸载与空线程都不注销,否则外壳订阅活不过页面)。
  **实际是三个面(不是四个,已改)**:`chats/[thread_id]/page.tsx`、`agents/[agent_name]/chats/[thread_id]/page.tsx`、`knowledge/chat-panel.tsx`。**`agents/new/page.tsx` 被剔除**,依据有据:它**不渲染 `ChatBox`**(第 399 行直接用 `MessageList`),而宠物挂在 ChatBox 的桌面分支 ⇒ **那里没有宠物**,注册它无的放矢;它还把 `threadId: undefined` 硬编码传给 hook、没有 `onStart`,连线程 id 都拿不到;它的线程是引导式(建完 agent 就回不去)。**不改造它们去消费外壳**,它们继续用自己的富 hook。
- [x] **Step 5** 转绿 + 门禁。
- **验收**:契约三条各有用例;Step 1 的 spike 有实测证据;**页面富 hook 与外壳薄订阅同时存在时,`messages` 与 `isLoading` 都正确**。
- **交付纪要(2026-09-12 完成)**:
  - **交付物**:`core/threads/activity.ts`(纯状态机)+ `core/threads/activity-context.tsx`(provider:join 消费 + 注册协议)+ 两个测试文件 + provider 挂载到 `WorkspaceContent` + **三处**注册。
  - **测试量**:**21 例**(14 node 纯函数 + 7 DOM);连同本线既有套件,`core/threads + core/pet + components/pet` **348 例全过**。门禁:scoped eslint 干净、**tsc 全量干净**。
  - **revert 证明(两轮,都恰好命中)**:(1) provider 层同时破坏三处(换目标不 abort / 不重取 / 无 run 时不取状态)⇒ **恰好 3 条红**、其余 3 条绿;(2) 修掉两个自埋缺陷后再同时破坏(去掉幂等与保留标志 / 恢复卸载注销)⇒ **恰好 3 条红**(2 node + 1 DOM)。
  - **过程中修掉的两个自埋缺陷**:① `useRegisterActivity` 原本**卸载即注销** ⇒ 一离开会话页订阅就断,与「离开聊天页仍在跑」正相反 —— 改为卸载与空线程都**不**注销(换会话由下次注册覆盖);② `register` 原本重置 `needsRefetch` ⇒ run 刚结束标记的重取会被紧随其后的重注册吃掉 —— 改为同线程重注册**保留**该标志,并加**幂等**判定(完全相同的注册不动状态,否则一次重放会把在跑的 join 抹成停跑)。
  - **偏离 spec/plan**:① 注册面 **4 → 3**(剔 `agents/new`,依据见 Step 4);② **放弃 `resolveRunId`**,只用 `liveRunId`(理由见 Step 4);③ 注册值从 plan 原文的「只注册线程 id」改为 **`(threadId, liveRunId)`**(Leg 0 结论)。
  - **未覆盖(诚实记录)**:**三处注册是页面级接线,没有单测** —— tsc 只保证调用形状正确;「切页之后宠物仍能说 wait」要等 **Task 5 的浏览器阶梯**才验。provider 的 `gap` 与 `join-error` 两条分支**只有单测覆盖,从未被真栈触发**。
  - **过渡状态(提交时必须知道)**:注册已接上 ⇒ **外壳订阅现在会真的跑起来**,与页面那条**并存**(已量化:2× 事件量)。宠物**仍读页面的 `useThread()`**,要等 Task 2 把它挂到外壳并改读 `useAppActivity()`;在那之前这是一笔**已知、已量化、spec 里记过的过渡成本**。

## Task 2:挂点迁移 + 断点重推

**进展(2026-09-12):Step 1 / 2 / 3 / 5 已交付;Step 4(断点)与 Step 6(真栈部分)待浏览器。**

- [x] **Step 1** 给内容区加容器上下文:`WorkspaceContent` 里 `<SidebarInset className="min-w-0 [container-type:inline-size]">` —— `SidebarInset` 的 `className` 走 `cn(...)` 合并(`components/ui/sidebar.tsx:307-318` 已核实),**不改 `ui/` 下的生成文件**。**风险已排除**:`container-type` 会给 `fixed` 后代换包含块,而 workspace 下**全量 grep 确认没有任何 `fixed` 后代**,这一层安全。
- [x] **Step 2** `AgentPet` 从 `chat-box.tsx` 的 `div#chat` 迁到外壳(落 `SidebarInset` 内,与 `CommandPalette` / `Toaster` 同层);`aria-hidden`、`pointer-events-none`、`z-20` 三项不变。**同时改了数据源**:`useThread()` → `useAppActivity()`,并**去掉 `threadId` prop**(重置键改从 `activity.target?.threadId` 取)。为此给活动状态**补了 `hasError`**:宠物的优先级是 error > 在跑 > wait > done(§5.3 不变量 1),少了它,外壳版宠物永远到不了 error 态 —— 页面的 `thread.error` 在迁移中是丢掉的。**消息类型在宠物这一侧收口**(`activity.messages as Message[]`):活动层刻意对消息形状不可知。
- [x] **Step 3(回收)** 已删掉 `div#chat` 上那条 `[container-type:inline-size]`,以及 `chat-box.tsx` 里 `<AgentPet threadId={…} />` 与它的 import(宠物不再挂在聊天页里)。`chat-box.tsx:401` 那条在 `ResizablePanelGroup` 上是既有的、**不在本线范围**,不动。
- [x] **Step 4(断点:实测后**保持 480**,不改 `globals.css` 的阈值)** —— 2026-09-12 真实应用采样(用户操作):边界落在内容区 **482 显示 / 480 隐藏**,回程 **479 隐藏 / 483 显示** ⇒ 容器查询确实量的是内容区(闭区间确认)。**同时测出那条规则在桌面布局里永远触发不到**:内容区 = 窗口 − 侧边栏(展开 **256** / 收起 **48**),窗口 <768 切移动布局(此时内容区 = 窗口)⇒ 桌面最窄内容区 = `768 − 256 = `**512** > 480。**用户裁定:窄窗口(481–767)也要有宠物**(实测 512–600 不挤),故阈值**不动**;只更新了 `globals.css` 的注释与 spec §10 的布局覆盖裁决(原「第 1 期桌面端 only」作废)。
- [x] **Step 5(`pet.offset` 语义重估;结论:保持 `{ right: 12, top: 56 }`)** 坐标空间从「chat 面板」换成「内容区」,但**默认值不变**,理由:**需要让开的 header / 工具栏本来就在内容区里面**(聊天页的 `h-12` header 与知识库工具栏都由页面自己渲染,不在内容区之外)⇒ 垂直让位量不变;水平上 `right: 12` 在聊天页仍等价于「距 chat 面板右缘 12px」。差异只出现在**非聊天页**(宠物现在在那里也出现),与各页工具栏的观感交给 **Task 5 Step 7**。
- [x] **Step 6** 门禁 + 真栈浏览器验收。**代码侧已过**(1164 例、tsc/eslint 干净)。**真栈(用户实测 2026-09-12)**:① 切页后宠物还在 ✓(迁移的核心成果);② `/`、`/login`、showcase 404 页都**没有**宠物 ✓;③ 断点边界有实测数字 ✓。**④ 拖 sidecar 不再改变宠物可见性 —— 已实测(2026-09-18,驱动端)**:聊天页把 sidecar 打开到 `panels = [439, 292]`,对分隔条发合成 pointer 序列(在 `[data-separator]` 上 `pointerdown`,move ×2 与 up 派发到 `document`),连续拖出四种状态:`chat 439 / side 292` → `339 / 392` → `585 / 146` → **`285 / 446`**。**关键三点**:① **对照组** —— 面板宽度每次都变(分隔条 x:`695 → 595 → 841 → 541`),证明拖拽真的生效、不是空跑;② 四种状态下**容器(内容区)恒为 732,未变**;③ 宠物在四种状态下**都**是 `display: block`、矩形恒 **(785, 289)**、精灵恒 `idle.webp`。⇒ 最后那次 **`chat = 285 ≤ 480`**(正是当年挂在 `div#chat` 上会把它藏起来的阈值)而宠物**照常显示、位置一动不动** ⇒「容器已换成内容区,拖 sidecar 与之无关」由推理变成实测。**顺带**:同一会话里窗口在 **568**(窄布局)时宠物也是 `display: block`、仍贴内容区右下 ⇒ §10 的「481–767 也让它出现」多了一个采样点。
- **验收**:① ✅(用户实测)② ✅(用户实测)③ ✅(482/480 边界)④ **✅(2026-09-18 实测,见 Step 6)**
- **交付纪要(2026-09-12)**:
  - **交付物**:`AgentPet` 改挂 `SidebarInset` 并改读 `useAppActivity()`(去掉 `threadId` prop);`SidebarInset` 承载容器上下文;`chat-box.tsx` 移除宠物挂载与 `div#chat` 的 `container-type`;活动状态**新增 `hasError`**(否则 error 态在迁移中静默丢失);宠物 DOM 用例改用 `ActivityProvider`,并新增「活动里的未答请求 ⇒ `wait.webp`」这条核心断言。
  - **测试量**:agent-pet **7 → 9 例**;`tests/unit/core` + `tests/unit/components/workspace` **1164 例全过**;tsc 全量干净、eslint 干净。
  - **改写/偏离**:① spec §10 的「第 1 期桌面端 only」**作废**(原理由「mobile 分支没有 `id="chat"`」随迁移失效);② `frontend/AGENTS.md` 的 Interaction Ownership (a) 已同步(挂载点 / 容器 / 公开路由 / 注册语义);③ 注册值带 `liveRunId`、只用 `liveRunId` 不用 `resolveRunId`(见 Task 1)。
  - **未覆盖(交付当时的记录)**:④ sidecar 拖拽 —— **已于 2026-09-18 实测,见 Step 6**;**Task 5 的阶梯**(跨页 `wait` / 缩放 / 跳转 / 非聊天页观感)当时整体仍待做,后由 Task 5 完成并提交(见该 Task 与 spec §18 的「2a 交付状态」)。
  - **已知但未处理**:窄窗口(481–767)现在也会显示宠物 —— 这是**用户明确要的**(裁定见 spec §10),不是缺陷;窗口 <480 时由那条容器规则兜底隐藏。

## Task 3:缩放控件

**进展(2026-09-12):Step 1–6 全交付。** 裁定沿用 spec §10.2 已写的:**不封顶**。**范围上界当日两次放宽 `256 → 340 → 512`**,并在同一轮**更正经用户裁定**了「不插值临界点」的算法(`>156` 改 `>340`,见交付纪要 ⑤)。

- [x] **Step 1(先写红测试)** 纯函数落在 `core/pet/placement.ts`:`evenBoxSize`(恒偶数)与 `normalizeDisplaySize`(非有限数回落 158 → 收进 64–512 → 取偶)。**clamp 侧不需要新增函数** —— `clampOffset` 本就按 `{ size }` 算盒矩形,所以「缩放后重跑 clamp」是**调用方传新盒子**的事(已加一条对应用例:同为 offset 12/56,盒子 64 时不动、256 时 top 被拉回 `300 − 256`)。**revert 证明**:把收口整体拿掉 ⇒ **恰好 3 条红**(全偶数扫描 / 越界 / 非有限数回落),其余 11 条绿。
- [x] **Step 2** `core/settings/local.ts` 的 pet 节加 `displaySize`(默认 **158**)。**无需迁移**:merge 是「节级 spread + offset 单独嵌套」,新键直接由默认值补上(旧 localStorage 的 pet 节没这个键)。类型注释里写明**读取时统一过 `normalizeDisplaySize`**。
- [x] **Step 3** 控件落在 `settings/pet-settings-page.tsx`:range 滑杆(`min 64 / max 512 / step 2`,恒偶数)+ 实时读数 + `sizeHint` 文案(`>340` 是插值、松手才生效)。**吸附点**:`338 → 340`(不插值临界,让用户能精确落在边界上)。文案走 i18n 两语言(`types.ts` + `en-US` + `zh-CN` 各加 `size` / `sizeHint`);顺手把 `description` 里过期的「聊天面板角落」改成「工作区角落」(宠物已不在聊天面板里)。
- [x] **Step 4(松手才应用)** 拖动中只写 `draft`,`onPointerUp` / `onKeyUp` / `onBlur` 才调 `commitDisplaySize` 落盘 —— 盒子尺寸一变就重排并重置 `background-position` 的百分比基准(§9.1 实测),逐帧写设置会让动画抖。
- [x] **Step 5** 渲染层:`AgentPet` 用 `normalizeDisplaySize(settings.pet.displaySize)` 算**一次**盒子尺寸,既喂 `clampOffset` 又作为 `size` prop 传给 `PetSprite` —— **单一来源**;`PetSprite` 的 `size` 可选,省略时退回 `manifest.displaySize`(§8 的占比补偿值),所以既有渲染用例不必改。顺手**去重**:`evenBoxSize` 原在 `pet-sprite.tsx` 内自有一份,现统一从 `core/pet/placement` 引。
- [x] **Step 6 降级为纯函数用例(并说明为什么)**:"松手才写设置"在控件里是**接线**,把它做成 DOM 用例要包一层 SettingsSection + i18n provider,成本高而覆盖薄。改成把提交语义**抽成纯函数** `commitDisplaySize`(先收口再吸附),node 用例覆盖:偶数扫描 / 越界 / 非有限数回落 / 吸附 / 归一化先于吸附。**未覆盖**:控件本身的交互(拖滑杆)没有 DOM 用例 —— 与三处注册同理,靠 Task 5 的真栈验收。
- **验收**:§10.2 的五条 —— ① 恒偶数 ✅(纯函数 + `step 2`)② DPR 1.5 下整数设备像素 ✅(偶数 ⇒ 158×1.5=237)③ **拖动不抖帧** ✅(松手才落盘)④ 缩放后不出屏 ✅(clamp 用新盒子,有用例)⑤ 切状态不空白 ✅(§9.1 的解码门不受影响);**刷新后持久**待 Task 5 真栈验。
- **交付纪要(2026-09-12)**:
  - **交付物**:`core/pet/placement.ts`(`evenBoxSize` / `normalizeDisplaySize` / `commitDisplaySize` + 4 个常量)、`local.ts` 的 `displaySize: 158`、`pet-settings-page.tsx` 的滑杆、`PetSprite` 的 `size` prop、i18n 两语言 2 键 + 1 处过期文案修正。
  - **测试量**:placement **8 → 17 例**(其中 2 例是**钉值**用例:原来所有范围/吸附断言都走常量符号,改常量不会转红,等于没牙);`core/pet + components/pet + core/settings + components/settings` 全过;eslint 干净、tsc 全量干净、prettier(按 `tr -d '\r'` 后比对)干净。
  - **revert 证明**(三处,各自独立):① 把 `normalizeDisplaySize` 的收口整体拿掉 ⇒ **恰好 3 条红**(全偶数扫描 / 越界 / 非有限数回落);② `PET_DISPLAY_SIZE_MAX` 拨回 256 ⇒ **恰好 1 条红**(上界钉值);③ `PET_DISPLAY_SIZE_SHARP_MAX` 拨回 156 ⇒ **恰好 2 条红**(上界钉值 + 吸附),`PET_DISPLAY_SIZE_SNAP_FROM` 拨到 336 ⇒ **恰好 1 条红**(吸附)。其余全绿。
  - **偏离**:① Step 6 从 DOM 用例**降级为纯函数用例**(理由见上);② **没做「大小」的单独重置按钮** —— 滑杆可拖回 158 且 158 就是默认值,不存在「回不去」,加按钮是多余的一行 UI;③ 顺手改了 i18n 里过期的 description 文案(宠物已不在聊天面板);④ **范围上界两次放宽 `256 → 340 → 512`**(用户两次裁定)。原 256 的来历是「鸟占满帧」假设下的 `512 ÷ 2`;本设计帧装整个场景,故改用**整帧 1:1 的最后一个偶数点** `512 ÷ 1.5 ≈ 341 ⇒ 340`;用户实测 340 时「仍然非常清晰」,遂按 512(= 帧像素数,刻意留 1.5× 插值余量)封顶。**⑤ 「不插值临界点」的算法更正**(用户裁定「改成真阈值」):原 `PET_DISPLAY_SIZE_SHARP_MAX = 156` 把 61.5% 的**尺寸比**当成了分辨率比 —— 插值何时开始只由 `盒子宽 × DPR ÷ 512` 决定(DPR 1.5 ⇒ 340、DPR 2 ⇒ 256),与鸟占帧多少无关;156 实为「DPR 2 的 1:1 盒子下鸟在屏上的高度」。三处同步:常量 156 → **340**、吸附点 `154 → 156` 改 **`338 → 340`**、两种语言的 `sizeHint` 数字改 340;spec §8 的同一条推导与 §10.2/§17 一并更正。**已知残留:340 是 DPR 相关值**,未做运行时按 `devicePixelRatio` 推导(换 DPR 2 的屏需改文案数字),记为未做。
  - **未覆盖**:拖滑杆的 DOM 交互;缩放后持久化;DPR 1.5 下的实际盒宽(需浏览器)。

## Task 4:单目标点击跳转(Alt+单击)

宠物代表**一个**线程,点它直接跳回那一个 —— **不做选择器**(多会话版属另一条线,见 spec §17「浮动会话卡」)。用户 2026-09-12 选「先做单目标」,手势定为 Alt+单击。

- [x] **Step 1(复用而非新写)** 走 §10.1 已有的 Alt+`pointerdown` window 级命中路径:把「Alt + 位移 **<4px** 后抬起」判定为**单击**,**≥4px 仍是拖拽**(阈值不变)。**宠物仍 `pointer-events-none`**,入口只在命中矩形上 —— 纯单击被否决,因为那要求 idle 时给宠物指针事件,会静默吞掉底下消息列表的点击。
- [x] **Step 2** 跳转规则:目标线程**不在当前页时才跳**,否则不做任何事。路径必须走 `core/threads/utils.ts::pathOfThread()`(仓库约定:百分号编码自定义 agent 名与 thread id)。**实施时两处修订**(见交付纪要 ②):**同页判定改为只比路径**(知识库页会把 `thread` 参数从 URL 抹掉,比整个 URL 会误判),**且路由由注册方提供而非宠物自己反推**(`ActivityTarget.href`)。
- [x] **Step 3** 单击**不得**触发底下的消息链接 —— 复用 §10.1 已有的「拖后吞 click」逻辑,不新写一套。改成一件事:**落在宠物盒上的 Alt 手势在 `pointerdown` 就武装吞 click**,两种分支共用。
- [x] **Step 4** 设置行提示文案补一句「Alt+单击回到该会话」(发现性由文案承担,与 §10.1 同款)。改的是既有 `dragHint` 一条键的两语言文案,**不新增 i18n key**。
- [x] **Step 5** DOM 用例:Alt+位移 <4px 触发跳转且**不写 offset**;Alt+位移 ≥4px 只拖拽**不跳转** —— 两条互斥,钉住 4px 这个分叉。共 7 条(含「同页无操作」「用注册方给的 href」「知识库页视为同页」「无目标不跳」「单击也吞 click」)。
- **验收**:① 在非聊天页 Alt+单击 ⇒ 回到宠物代表的那个线程 ✅(DOM)② 当前页就是目标线程 ⇒ **无操作**(不刷新、不跳空路由)✅(DOM)③ 不按 Alt 单击 ⇒ 什么都不发生且点击穿透到下方内容 ✅(§10.1 既有用例未回归)④ §10.1 的拖拽六项**不回归** ✅;真栈观感待 Task 5。
- **交付纪要(2026-09-12)**:
  - **交付物**:`agent-pet.tsx`(`jumpRef` + `endDrag` 的单击分支 + 命中即武装吞 click + 文案)、`activity.ts`(`ActivityTarget.href` + 幂等判定认 href)、`activity-context.tsx`(`href` 进注册标量依赖)、`utils.ts`(新增 `pathOfKnowledgeThread`,与 `pathOfThread` 的 kb 分支共用构造)、三个注册面(各带上自己的 `href`)、i18n 两语言 `dragHint`。
  - **测试量**:DOM **9 → 16 例**(新增 7);`core/threads` + `core/pet` + `components/workspace/pet` + `knowledge/chat-panel` **30 文件 / 全绿**(唯一红是下面那条预存失败);eslint、tsc 干净。
  - **revert 证明(四处独立)**:① 摘掉 `jumpRef.current?.()` ⇒ **恰好 2 条红**;② 注册端不带 `href` ⇒ **恰好 2 条红**;③ reducer 幂等判定去掉 `href` ⇒ **恰好 1 条红**;④ 摘掉 `pointerdown` 处武装吞 click ⇒ **恰好 2 条红**(拖拽与单击两条吞 click 用例)。其余全绿。
  - **偏离**:① **注册协议加 `href`** —— 计划原文是宠物侧调 `pathOfThread(threadId)`;实施时发现**推不出来**:知识库线程的规范路由是 `/workspace/knowledge?kb=…`,从 id 反推会落到 chats 路由,而那里的 rag agent **没有 kb 绑定、检索永不触发**(`pathOfThread` 的 kb 分支注释早写着这件事);自定义 agent 的线程同理要走 `agents/<name>/chats/…`。只有注册方知道自己是谁 ⇒ 路由由注册方给,宠物只消费。为此 `ActivityTarget` 多一个可选 `href`,三面各传 `pathOfThread(thread)`(kb 面用新抽的 `pathOfKnowledgeThread`)。② **同页判定只比路径**:知识库页打开线程后 `router.replace` 会把 `thread` 参数抹掉(只剩 `?kb=`,`knowledge/page.tsx:155`),比整个 URL 会误判成「不在本页」并把用户推一次。③ 顺手把 `agents/new` 从 spec §10.3 的注册面里删掉(4 → 3,Task 1 已核实那里不渲染 `ChatBox`),并把 §10.3 待核实项 ③ 断点标为已闭环(数值 480 保留、用户裁定)。
  - **顺手修掉一条 Task 1 埋下的红(重要)**:`tests/unit/knowledge/chat-panel.dom.test.tsx` **27 例自 `0156a64c` 起一直全红** —— Task 1 给 kb 面板加了 `useRegisterActivity`,而该测试文件是裸渲染面板、没有 `ActivityProvider`,于是每条用例都在 `useContext` 抛错。**当时没发现是因为 Task 1 的验证范围写的是 `tests/unit/core + tests/unit/components/workspace`,没跑 `tests/unit/knowledge`**(交付纪要里那句「1164 例全过」是真的,但不覆盖这个面)。本轮在该文件加一条 `activity-context` 的 mock(注册不是这些用例的主题),26 绿;剩下的 1 条是该文件**早已记录的预存失败**(「restores the remembered model per kb…」,`context.model_name` 得 undefined,根因未查),不是本轮引入。
  - **未覆盖**:三个注册面**自身**没有 DOM 用例(它们渲染在页面里,页面没有测试脚手架;注册值的形状由 provider 的用例 + 宠物侧的用例覆盖,接线靠 Task 5 真栈);单击跳转的真栈观感与「在知识库页点它」的实际体感待 Task 5。

## Task 5:浏览器验收阶梯(**不可用单测替代**)

前 1 期的阶梯是在**占位帧**上跑的(已在 spec §18 标注),本期必须用**真美术**重跑与本线相关的部分。

- [x] **Step 1** 起栈(`backend` 的 gateway + `frontend` 的 `scripts/pnpm.py dev`;无 nginx,`make dev` 必失败),登录后进一个线程。**实施时改走用户自己的栈**(`:3000` + `:8001`,他自持且已登录),驱动端 = **Qoder 内置浏览器**;另两个方案都死了:① 同目录第二个 dev server 被 Next 16 拒绝(`Another next dev server is already running`,按目录锁 `.next`);② 临时副本 + `node_modules` 目录联接被 Turbopack 拒(`points out of the filesystem root`),换 webpack 又被跨盘符路径拼坏。**内置浏览器必须用 `localhost` 而不是 `127.0.0.1`** —— cookie 按 host 存,用 IP 读等于另一个站点(这是我先撞的一次)。
- [x] **Step 2(跨页)** 存在:`.pet-shell` 在 `/workspace/{chats/new,chats/<id>,agents,knowledge,scheduled-tasks}` 均为 **1** 且 `background-image` 有值;不存在:`/`、`/en/docs` 均为 **0**(`/login` 在未登录主机上实测 0 —— 已登录时它会直接回 `/workspace`,故只能在未登录态验;`/docs` 实际是 404 页,也是 0)。
- [x] **Step 3(核心)** 现场造真 run:在用户账号发一条**故意触发澄清**的指令 ⇒ 运行中宠物播 **`think.webp`**(顺带验到 2b 的 think 美术已生效)⇒ run 结束(**5 秒**,「需要你的协助」卡)⇒ 宠物**播 `wait.webp`**;切到 `/workspace/scheduled-tasks`(SPA)后**仍是 `wait`** 且**是同一个 DOM 节点**(外壳没重挂);**硬刷新**后仍是 `wait`,而该次加载只有 `GET /api/langgraph/threads/{id}/state`(**没有 `/join`**)⇒ 这条 `wait` 只能来自 state 那条路径(即下面那个缺陷的修复)。答完 ⇒ 回落 `idle` **已于 2026-09-18 由用户在真机自行验证**(此前只用现有已答线程观察到 `idle`,没做「答后再切页」这一步)。
- [x] **Step 4(缩放)** 滑杆 `min 64 / max 512 / step 2`、文案「超过 340px 开始插值放大」在真机可见。**拖动中不落盘**:把值改到 400(读数显示 400)时盒子**仍 158**、localStorage **仍 158** ⇒ 不重排、不抖帧;松手 ⇒ 落盘 400 ⇒ 渲染 400。**真键盘**:`End` ⇒ 512(盒 512、落盘 512、动画 3.75s = 30 帧/8fps)、`Home` ⇒ 64(偶数);刷新后仍 64 ⇒ **持久**。**Clamp**:512 + Alt 拖到左上 ⇒ 盒子实坐标 `(0,0)-(512,512)` 完整落在内容区(706×659)内,而**落盘值仍是 703/−21**(clamp 只在渲染时算、不回写)⇒ 面板变宽后会自动回到用户摆的位置。
- [x] **Step 5(断点)** **本轮未复测,按收口处理(2026-09-18 用户裁定「收了」)**:内置浏览器**视口宽度改不了**(`window.resizeTo` 无效 —— 实测 `outerWidth` 变、`innerWidth` 不变;2026-09-18 那次 surface 还退化成 0×0),而这条要的是**窗口本身**窄到内容区 ≤480。沿用 Task 2 的实测(内容区 482 显示 / 480 隐藏,回程 479/483 对称),且 §10 已确认该阈值**在桌面布局永不触发**(桌面最窄内容区 = 768 − 256 = 512 > 480)、用户 2026-09-12 已裁定**保留 480 不动** ⇒ 不再复测,也不留一个环境上打不了勾的空框。
  **顺带(2026-09-18)**:同一批观测里「桌面三列观感」已取到实况(视口 1056、侧栏展开,截图在案),见 spec §15 第 5 条;**341–512 的软化程度已于 2026-09-18 由用户判定可接受**。
- [x] **Step 6(跳转)** 在 `/workspace/agents` 上 Alt+单击 ⇒ URL 变为宠物代表的线程 `/workspace/chats/e9e0bc99…`;**当前页即目标**时 Alt+单击 ⇒ `history.length` 不变(无导航);**不按 Alt** 单击 ⇒ 1 次 click **穿透到内容**、无导航、offset 不变;**Alt+拖拽(≥4px)** ⇒ offset 精确 `+40/−30`、不跳转;**吞 click** ⇒ Alt+单击后紧跟的那次 click 在 document 捕获探针上记到 **0** 次。(知识库页「Alt+单击 = 无操作」未单独复测:该页硬刷新后外壳已无目标,判据退化成「无目标不跳」——已是既有 DOM 用例。)
- [x] **Step 7(观感)** 截图三张:知识库页(三列 + 宠物在右下、播 `wait`)、智能体页(非聊天页落位)、缩放 512 端。落位与遮挡由用户看截图判断(宠物位置是**用户自己拖过的** `right 63 / top 409`,不是默认右上下角)。
- **验收**:每步给证据(截图 / DOM 断言 / 计算样式采样),**无证据的步骤记为未验**。
- **交付纪要(2026-09-12)**:
  - **阶梯抓到一个真缺陷(本期唯一的产品判断差点是坏的)**:`GET /threads/{id}/state` 的响应是**信封** `{values:{messages}}`,顶层**没有** `messages`;而 `activity-context.tsx` 的 `messagesOf` 只读顶层 ⇒ provider 的 `!runId` 分支(`!runId` = 「没有 run 在飞」,正是「回到一条正在等你的线程」)拿到的永远是 null ⇒ **宠物只会显示 idle,`wait` 说不出来**。原测试没抓到,是因为那条用例只断言「取了一次 state」,没断言「取到了」——桩用的就是真信封,只是没人看结果。修复:`messagesOf` 认出两种形状(join 事件体 = 状态本身;state = 信封),`needsRefetch` 的第二次 getState 同一条路一起修好。**revert 证明**:把拆信封那层拿掉 ⇒ **恰好 1 条红**(新用例)。提交 `2588d826`(代码+测试)。
  - **顺带清掉该测试文件在 HEAD 就有的 4 处格式债**(`read('[data-consumer]')` 单引号 → 双引号),否则 `prettier --check` 在这个文件上恒红。
  - **方法学(三条,都影响「证据算不算数」)**:① **Alt 手势**用页面内派发的 `PointerEvent(altKey:true)` 走的是同一条 `window` 监听路径 —— 它证明的是**我们的代码**,不证明「OS 层按住 Alt 能把事件送到页面」(那是浏览器的事);② **滑杆拖动中**的态用原生 value setter + `input` 事件驱动(React 的 value tracker 会吞掉直接赋值),**松手**用真 `pointerup`,两端用**真键盘** `End`/`Home`;③ 同步 evaluate 会在 React 重渲染**之前**读到旧值(本次两次踩到:松手后的盒宽、clamp 后的 right)——判「渲染结果」必须隔一拍再读。
  - **对本机环境的影响(需用户知情)**:① 在用户账号里**新建了一条真线程 + 真 run**(`e9e0bc99…`,结尾是一张**未回答**的澄清卡)——这是 Step 3 的来源,要不要删由用户定;② 阶梯期间改过宠物设置,已**恢复原值**(`displaySize 158`、`offset 63/409`);③ 用户的 `:3000`/`:8001` 全程只读(我没起第二个实例、没停他的进程);④ 我起的私有栈(`:8099` 免登录网关)已停。
  - **未覆盖(当时的记录;2026-09-18 全部收口)**:① Step 5 断点 → **按收口处理**(视口宽度改不了,且该阈值在桌面布局永不触发);② 「答完澄清后切页回落 idle」→ **已由用户在真机自行验证(2026-09-18)**;③ 知识库页 Alt+单击 = 无操作 → 判据退化为「无目标不跳」,已是既有 DOM 用例;④ 512–341 的软化程度 → **由用户判定可接受(2026-09-18)**。

## Task 6:文档同步

- [x] **Step 1** `frontend/AGENTS.md` 的 Interaction Ownership:挂载点从 `div#chat` 改写为外壳(`SidebarInset`)+ 撤掉「mobile 分支没有 `id="chat"` 所以不挂」那条理由(跨页后这个理由不再成立,改写成「公开路由不挂」)+ 把 Alt 那条从「拖拽」补成「拖拽 / 单击两分支」。三条不变量 (a) 需重写,(b)(c) 原样。**实施时:(a) 的挂点重写早在 Task 2 就做了**(`89f59dd5`),本轮补两处 Task 4 带来的变化 —— 注册三元组补 `href`(并写明为什么外壳不能自己从 id 反推)、不变量的 (c) 从「Alt+拖拽」改写成一跳手势两分支(4px 阈值分叉、同页无操作、两分支都吞 click);(b) 原样未动。
- [x] **Step 2** spec §18 补 2a 交付状态(含测试量、真栈验收、未验项);§10.3 待核实项按 Task 0 结论关闭。**实施时:新增「第 2 期 2a 交付状态」段**(三项功能、提交清单、真机验收要点、**1 项未验** = 480 断点本轮未复测 —— **该项已于 2026-09-18 收口,见 spec §18;遗留的「桌面三列观感」也于同日补到实况**)；§10.3 的 ④(非聊天页落位观感)按 Task 5 结果关闭,① ② ③ ⑤ ⑥ 在此前各轮已闭环。
- [x] **Step 3** 若 `displaySize` 的取值/语义与 §8 的补偿公式有出入,同步 §8。**有出入,已同步**:补偿公式按 61.5% 与「~96」精确算得 **156.1 ⇒ 156**,而落地是 **158**;§8 现在写明「158 是『约 96』那一档的取偶结果(97.2 ≈ 96),两者差 2px、视觉不可分,别把它『纠正』成 156」——尤其因为 156 这个数在旧文档里还当过「清晰上限」(已于 §10.2 证伪)。顺手修掉 §10 缩放段里两处 Task 3/4 没覆盖到的旧值(「64-256」「512 已覆盖 256@2x」「档位 …256」),以及 §17 里唯一还写着「断点待实测」「已定案」的两行(改为已交付 + 已实测)。
- **验收**:两份文档与代码一致;无「待填」。
- **交付纪要(2026-09-12)**:改动两份文档 —— `frontend/AGENTS.md`(Interaction Ownership 的 (a)/(c) 两处)+ spec(§8 补偿口径、§10 缩放段旧值、§10.3 ④ 关闭、§17 两行状态、§18 新增 2a 交付状态段)。**grep 复核**:全 spec 已无 `64-256` / `≈156` 这类旧值(仅在「已证伪」的叙述里保留 `156` 作为被更正的对象),plan 无「待填」。**未同步(有意)**:§15 开放项与 §17 推迟项里那些「未来才评估」的行保持原样;`docs/` 下另两条线的文档不在本 Task 范围。

---

## 依赖与并行

- **Task 0 阻塞 1-6**(② 的结论决定 1 的形态)。
- **Task 3(缩放)不依赖任何别的 Task** —— 它只动设置节、`placement.ts` 与 `pet-sprite.tsx` 的盒子尺寸,与外壳订阅无关(本条 2026-09-12 更正:原文写成「依赖 Task 1」是过度约束)。**所以 Task 1 Step 4 挂起期间可以先做 Task 3。**
- Task 2 依赖 Task 1(挂到外壳才有壳订阅可读)。
- **Task 4 依赖 Task 1 + Task 2**(要有壳订阅才知道跳去哪,要有壳挂载才有那个点击目标)。
- **2b(美术)与本 plan 完全无依赖**,可同时进行:另一个会话出 `think` / `work` / `error` / `done` / `greet` 五组帧,帧到位后翻 `WORK_KIND_ENABLED`,不碰本 plan 的任何文件。(**疲劳轴不在 2b**:用户 2026-09-12 明确不做,闸门 `FATIGUE_ENABLED` 恒 `false`,见 spec §17。)
