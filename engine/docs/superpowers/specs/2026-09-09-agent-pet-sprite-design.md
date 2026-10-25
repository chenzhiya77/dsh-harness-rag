# Agent 装饰宠物(鹦鹉帧动画)— 设计文档

- 日期:2026-09-09
- 分支(2026-09-10 用户裁决):直接在个人分支 `feat/rag-knowledge-base` 实施,不新切(该分支是个人分支,`main` 是项目官方;且多会话共用一棵工作树,切分支会扰动其他会话)。进官方时从 `main` 切 PR 分支、只携带宠物线提交区间(自 `1e349aa5` 起,每笔提交自包含、可 cherry-pick)
- 上游调研:无独立调研文档。project AIRI 一手核查(moeru-ai/airi @ main,5380 blobs 全量检索)见 §2.5
- 相邻产品线:`../../HARNESS_EXECUTION_FLOW_MAP.md`(harness 构成观测台,**不是本 spec 的对象**;本 spec 只消费既有前端信号,不新增任何后端事件通道)
- 计划文档:`../plans/2026-09-09-agent-pet-sprite.md`(第 1 期,已生成)

## 1. 目标

在 agent 聊天窗内加一只装饰性鹦鹉,用帧动画(sprite sheet)反映当前 run 的可观测状态。三件事:

1. **把已经存在但无人读取的状态做成周边视觉**。DeerFlow 的 run 很长(子代理默认 `timeout_seconds=1800`、`general-purpose` 的 `max_turns=150`),用户会走开。今天「agent 在等你回答」这件事**没有任何周边提示**。
2. **区分「跑完了」和「卡在你身上」**。这是本功能唯一的产品价值支点,也是最容易做错的一处 —— `ClarificationMiddleware` 走 `Command(goto=END)`,两种情形在流层面完全同形(§2.1)。
3. **第 1-3 期零后端改动、零新依赖、零新事件通道**。全部信号来自前端已有的 `useThread()`。(第 4 期是唯一候选例外,见 §18,且它需同时重开 §4.1 裁决一。)

**明确不做**:鹦鹉语音输出/念回复(前端零 TTS)、鹦鹉被 agent 看见或拥有自己的回合(§4.4)、从模型输出解析情绪(要改 lead agent 输出格式)、任何后端事件新增、PixiJS/Lottie/Rive、宠物插件系统、per-agent 皮肤、通用 avatar 抽象。文字形式的生成式评论是第 4 期候选,不是本 spec 任何一期的交付物。

## 2. 背景与现状(2026-09-09 代码核查,全部带行号)

### 2.1 关键事实:「在等你」和「跑完了」同形

`ClarificationMiddleware` 拦截 `ask_clarification` 后写 `ToolMessage.artifact.human_input` 并 `Command(goto=END)`(见 `backend/AGENTS.md` 中间件链第 35 条)。图直接结束,所以:

| | 流层面表现 |
|---|---|
| run 正常完成 | `isLoading` → false,`onFinish` 触发 |
| agent 在等用户回答 | `isLoading` → false,`onFinish` 触发(**完全相同**) |

唯一能分开二者的信号是 `hasOpenHumanInputRequest`(`core/messages/human-input.ts:486`)。既有调用形状在 `app/workspace/chats/[thread_id]/page.tsx:262-269`:`useMemo` 键为 `[thread.messages]`,过滤器 `(m) => !isHiddenFromUIMessage(m)`。本 spec 的实现必须与它逐字一致,不要另起一套。

### 2.2 实时可观测信号(全部已存在,无需后端改动)

| 信号 | 来源 | 行号 |
|---|---|---|
| 加载中 / 出错 | `thread.isLoading` / `thread.error` | `BaseStream<AgentThreadState>`,`components/workspace/messages/context.ts:7` |
| 三态优先级 | `error > isLoading > ready` | `page.tsx:416-421`(**与本 spec 决策树顶层同构,是既有先例**) |
| 消息分组 | `getMessageGroups(messages, { isCurrentTurnLoading })` | `core/messages/utils.ts:36`。**2026-09-09 核查:不可用作「在飞工具名」的来源** —— 带工具调用的 AI 消息被拆进**三种互斥** group,优先级为 `hasPresentFiles` → `assistant:present-files`(`:158`)> `hasSubagent`(即 `task`)→ `assistant:subagent`(`:164`)> 其余 → `assistant:processing`(`:170-187`)。故只看 `assistant:processing` **永远看不到 `task` 与 `present_files`**,`delegate` workKind 会变成死代码。见 §6.1 |
| 某条 AI 消息有工具调用 | `hasToolCalls(message)` = `type === "ai" && tool_calls.length > 0` | `core/messages/utils.ts:664`,可直接复用 |
| 工具调用是否有结果 | `findToolCallResult(toolCallId, messages)` | `core/messages/utils.ts:706`,**有缺陷不可复用,见 §15 开放项 1** |
| 未回答的人工输入请求 | `hasOpenHumanInputRequest` | `core/messages/human-input.ts:486` |
| 隐藏消息判定 | `isHiddenFromUIMessage` | `core/messages/utils.ts:718` |
| 子代理派生状态 | `parseSubtaskResult` / `derivePendingSubtaskStatus` | `core/tasks/subtask-result.ts:117`、`:198` |
| 子代理被哪个 guardrail 掐断 | `Subtask.stopReason`:`token_capped` / `turn_capped` / `loop_capped` | `core/tasks/types.ts:32`(字段注释明写「so a future badge can show "capped" **without parsing result text**」) |
| 目标受阻类型 | `goal.last_evaluation.blocker`(六值) | `core/threads/types.ts:16-22` |
| 待办 | `todos`:pending / in_progress / completed | `core/todos/types.ts:3` |
| **工具结果的结构化语义**(2026-09-09 核查新增) | `ToolMessage.additional_kwargs.deerflow_tool_meta`:`status`(`success`\|`error`\|`partial_success`)、`error_type`(auth / rate_limited / transient / config / permission / no_results / not_found / internal / unknown)、`recoverable_by_model: bool`、`recommended_next_action`(`continue`\|`rewrite_query`\|`try_alternative`\|`summarize`\|`stop`)、`source` | 后端 `agents/middlewares/tool_result_meta.py`:`TOOL_META_KEY` `:18`、dataclass `:33-40`、错误分类表 `:43-73`;模块 docstring 明写「Downstream consumers read this key **instead of parsing text**」。**前端当前零命中**(全量检索 `deerflow_tool_meta` / `error_type` / `recoverable_by_model` / `tool_meta` 均无),但 `additional_kwargs` 确实到前端 —— `isHiddenFromUIMessage` 读 `.hide_from_ui`(`utils.ts:718`)、`subtask-result.ts:40-46` 读 ToolMessage 的 `subagent_status` 等键。§7 的 `byErrors` / `byUnrecoverable` 用它 —— **2026-09-10 Task 0 Step 1 已运行时确认抵达**(138 条真实持久化 ToolMessage 的键形状 138/138 与 dataclass 对齐,`serialize_messages_tuple` 与 `serialize_channel_values_for_api` 两条出线用真实 error 消息实测原样带出),详见 §15 开放项 8(已闭环) |

实时 SSE custom 通道的生产者全量只有 4 个(已排除 tests,无截断):`tools/builtins/task_tool.py`(8 处)、`tools/builtins/graph_search_tool.py:59`、`agents/middlewares/llm_error_handling_middleware.py:745,766`、`agents/middlewares/safety_finish_reason_middleware.py:245,268`。

### 2.3 中间件事件只落库(否定「实时语义反应」的可行性)

`RunJournal._put`(`backend/packages/harness/deerflow/runtime/journal.py:646-659`)只 append 到 buffer 再 flush 进 `RunEventStore`;**整个 journal 没有任何 stream publish**。`record_middleware`(`:819-839`)形成的 `middleware:{tag}` 事件因此只能经 REST `GET /runs/{rid}/events` 回读。

后果:护栏拦截(`guardrails/middleware.py:123`)、技能激活、上下文压缩、标题生成、循环检测/token 预算硬停(只 stamp `stop_reason`,完全无事件)、沙箱获取释放 —— 这些**都拿不到实时信号**。轮询 REST 对一个装饰元素是错的方向(换来延迟与请求量),故本 spec 不涉及。

### 2.4 前端动画基建与缺口

`frontend/package.json` 已有 `motion` ^12.26.2、`gsap` ^3.13.0、`ogl`、`canvas-confetti`、`tw-animate-css`;`styles/globals.css` 有 10 个 keyframes(`bouncing` :122、`wave` :154、`ambilight` :420 等)。**无 sprite-sheet / 帧动画 / Lottie / Rive 任何先例**,帧动画基建需从零起(§9 给出纯 CSS 方案,不引依赖)。

`prefers-reduced-motion` 在 `styles/` 里**零命中**,但 Tailwind 的 `motion-reduce:` 变体已在 `components/workspace/chats/chat-box.tsx` 用了 3 处。故降级走 `motion-reduce:` 变体,不写裸 media query(与既有代码一致)。

### 2.5 参照系:project AIRI 的耦合方向相反

一手核查 moeru-ai/airi @ main(48,937 stars,当日仍在推)。它的情绪链路是:

```
use-airi-runtime-prompt.ts 每次请求注入 9 值情绪清单
  → 模型在 token 流吐 <|...|> 标记
    → core-agent/runtime/llm-marker-parser.ts(流式,tailLength 半标记保护)
    → core-agent/runtime/response-categoriser.ts(rehype 非流式,speech|reasoning|unknown)
      → constants/emotions.ts 唯一 Emotion 枚举 → 4 张 per-renderer 映射表
```

**情绪是模型生成的,不是事件派生的** —— 它拥有模型的输出格式。它是第 1 档(表达),本 spec 是第 0 档(观察)。

AIRI 的宠物本身挂着一套 agent 基建:`core-agent` + `memory-pgvector` + `provider-inference` + `plugin-protocol` + `server-runtime` 共 114 个非测试源文件,带六边形端口(`llm-port`/`session-port`/`context-port`/`stream-port`)、自己的上下文压缩 `messages/compaction.ts`。**逐包对照,DeerFlow 全部已有等价物**(`RunManager` / `SummarizationMiddleware` / `models/factory.py` / `ThreadState` / scheduler / DeerMem + `knowledge/` / `models[]` / 扩展系统 + skills / Gateway)。引入它不是加重量,是建第二套 harness 去和第一套抢回复权。

一处更正:`memory-pgvector` **在 main 上是空壳** —— `src/index.ts` 仅 25 行,建一个 `Client`、注册一个空的 `module:configure` handler、`runUntilSignal()`,无任何记忆实现。故「AIRI 有自己的向量记忆」不成立(`stores/character/notebook.ts` 未读,不下判断)。

### 2.5.1 spark-notify:AIRI「主动 agent」的实际形状(§4.4 的证据基础)

`core-agent/agents/spark-notify/`,六个特征均已核实到源码:

1. **一回合、无状态、无历史。** `SparkNotifyAgent.handle(request) => Promise<{ commands }>`,注释原文 "Platform-neutral agent that handles **exactly one prepared** Spark Notify turn"。请求体只有 `event` / `systemPrompt` / `runtimePrompt` / `selectedChat` / `control` —— **无 message history,无 thread id**。用户消息即事件 dump:`JSON.stringify({ notify: event.data, source: event.metadata?.source }, null, 2)`(`agent.ts::renderSparkNotifyUserMessage`)。
2. **输出是命令,不是聊天。** `SparkNotifyCommandDraft`(`tools.ts`):`destinations[]`、`interrupt: 'force'|'soft'|boolean`、`priority: 'critical'|'high'|'normal'|'low'`、`intent: 'plan'|'proposal'|'action'|'pause'|'resume'|'reroute'|'context'`,加结构化 `guidance.options[]`(每项带 label / steps / rationale / possibleOutcome / risk / fallback / triggers)与 `persona` trait-strength 表。它是 triage router,不是 chatbot。
3. **默认答案是「什么都不说」。** 有 `builtIn_sparkNoResponse` 工具与 `allowNoResponse` 策略开关;指令块原文(`agent.ts::getSparkNotifyHandlingAgentInstruction`):`'This is AIRI system, the life pod hosting your consciousness. You do not need to respond to every spark:notify event directly.'`
4. **「说话」与「派活」互斥。** `agent.ts::resolveSparkNotifyRuntimePolicy`:`forceTextResponse` 为真时返回 `{ allowNoResponse: false, allowSparkCommand: false, supportsTools: false }` —— 工具全关,只出文本。
5. **角色反应只是插件 sink,不是 agent 本身。** `plugins/reaction.ts::createSparkNotifyReactionPlugin({ onDelta, onEnd })` 只监听 `model-output-text` 与 `result` 两类事件,把文本推给 host 呈现层;`plugins/observer.ts::createSparkNotifyObserverPlugin` 是另一个独立插件(诊断/遥测/测试录制)。观察、反应、派命令三者可单独插拔。
6. **注意力循环是队列 + backoff,不是常驻 agent。** `stage-ui/src/stores/character/orchestrator/store.ts`:`scheduledNotifies` 带 `enqueuedAt/nextRunAt/attempts/maxAttempts`,`computeNextRunAt` 按 urgency 分档(immediate=0 / soon=10s / later=60s / 默认 30s)加 `attempts × requeueDelayMs(30s)`,由 `tickIntervalMs: 2000` 的 tick 驱动,`maxAttempts: 3`。

对照 DeerFlow:

| AIRI spark-notify | DeerFlow 已有等价物 |
|---|---|
| 一回合无状态 LLM 调用 | `deerflow.utils.oneshot_llm.run_oneshot_llm`(`utils/oneshot_llm.py:33`;4 个生产调用点:`routers/input_polish.py`、`routers/suggestions.py`、`runtime/goal.py`、`skills/security_scanner.py`) |
| urgency 分档 + attempts + requeue 队列 | scheduler(`scheduler.enabled`、`overlap_policy=skip`、`uq_scheduled_task_run_active`) |
| `destinations[]` + priority + interrupt 派给下游 | `task` 工具 + `SubagentExecutor` + `SubagentLimitMiddleware` |
| observer / reaction 插件分离 | 扩展系统 `IsolatedMiddleware` + 语义 placement |
| `builtIn_sparkNoResponse`(默认不说话) | 无等价物;纯函数返回 `null` 即同一件事 |

**关键推论**:AIRI 是为「有自主性的伙伴」设计的,它尚且把主动 agent 约束成一回合、无历史、默认闭嘴、工具与文本互斥 —— 那正是 `oneshot_llm` 的形状,不是 harness 的形状。

**但 AIRI 在渲染轴上是空白**:全量 5380 文件检索 `spritesheet|sprite-sheet|flipbook|frame.?animation|atlas` 命中 4 条,全是 LLM 提供商 `atlascloud`,非纹理图集。5 个渲染后端 `stage-ui-{live2d,mmd,spine,tachie,three}` 全是骨骼绑定或静态整图,无一个做帧动画。最接近的 `stage-ui-tachie` 是「一个情绪一张完整静态图」,只有 state 一维,README 明确排除 layered sprites / rigged animation / lip-sync。本 spec 需要 `state × frame` 二维。

**可借的只有契约形状**(§8 逐条标注来源):一枚举 + N 张映射表、有损折叠被允许(`EMOTION_VRMExpressionName_value` 把 `Awkward→neutral`、`Question→think`、`Curious→think`)、`EmotionPayload { name, intensity }` 把「哪个状态」与「多强」分开、tachie 的四条资产规则。代码零可复用(AIRI 是 Vue 3 + Pinia + PixiJS + UnoCSS,本项目 React 19 + Next.js 16 + Tailwind 4)。

### 2.6 挂载面与碰撞清单

`components/workspace/chats/chat-box.tsx:413` 是 `<div className="relative size-full min-h-0 min-w-0" id="chat">`,包在 `<ResizablePanel className="relative min-h-0 min-w-0">`(`:411`)内,是随右侧面板 resize 存活的每面板 relative 容器。**且 `chat-box.tsx:81` 已经有 `const { thread } = useThread();`** —— 挂在这里零新管线,并自动覆盖所有用 ChatBox 的面。

**2026-09-09 通读全文(463 行)后确认挂载安全**:`frontend/AGENTS.md` 记录的三条 ResizablePanelGroup 约束全部作用在**侧面板**,不在聊天面板 —— `pinnedContentWidth`(cqw 宽度锁定)消费于 `:450-452`,位于 `id={...-side}` 的 `<aside id="artifacts">` 子树内;`animatingRightPanel` 消费于 `:404`,是加在 group 上的 `[&>[data-panel]]` flex-grow 过渡;`handlePanelGroupLayoutChanged`(`:199-220`)与 `handleSidePanelResize`(`:192-197`)只处理侧面板的折叠与拖拽。在 `div#chat` 内加一个 `{children}` 的兄弟节点不触碰任何一条。

**但发现一处新的结构事实**:`chat-box.tsx:349-353` 有独立的 **mobile 分支**,`isMobile` 为真时渲染的是 `<div className="relative size-full min-w-0">{children}</div>` —— **没有 `id="chat"`**。即本 spec 的挂载点在移动端不存在。裁决见 §10。

已有主的角落:

| 位置 | 占用者 | 证据 |
|---|---|---|
| viewport 右下 | 全局 `<Toaster>` | 知识库页正因「它压在聊天 composer 上」把通知改道中间列(`components/workspace/knowledge/kb-toast.ts`、`panels-shell.tsx`) |
| documents tab 右下 | `doc-failure-panel.tsx` | 绝对定位失败卡片 |
| composer 上方 | `GoalStatus` | `page.tsx` composer 栈 |
| 顶部 `h-12` 横条 | header | `page.tsx:281-283`,`absolute top-0 right-0 left-0 z-30` |

## 3. 术语表(本 spec 一次定死)

| 术语 | 定义 | 避让 |
|---|---|---|
| **宠物 / 鹦鹉** | 本功能的装饰性帧动画元素 | 不叫 mascot、avatar、companion(avatar 在本仓库已指自定义 agent 的 `BotIcon`) |
| **持续态(base)** | 条件成立期间循环播放的帧组,共 5 个 | 不叫 emotion(AIRI 术语,语义是模型自报,与本设计的可观测事实相反) |
| **一次性(one-shot)** | 边沿触发、播完自动回到 base 的覆盖帧组 | 不叫 transition |
| **疲劳度(fatigue)** | 0-3 的派生标量,只影响播放参数不新增帧 | 不叫 mood、personality |
| **工具类别(workKind)** | `base === "work"` 时对当前在飞工具的归类 | 不叫 tool state |
| **观察者** | 只读信号、不产生输出、不被 agent 看见 | 与 AIRI 的「输出面」严格对立 |

## 4. 四项裁决

### 4.1 裁决一:宠物是观察者,不是 agent 的输出面

宠物不产生任何用户可见内容,不占用回复权,`pointer-events-none` 默认。理由:输出面已被 `MessageList` + Streamdown 占有(所有权见 `frontend/AGENTS.md` Interaction Ownership),且前端零 TTS(全量检索 `frontend/src` 对 `speechSynthesis|TTS|text-to-speech` 命中 0 文件;`core/voice-input/` 只有 ASR 输入)。第 1 档不是「借一个组件」,是新增一整个输出模态 + 一个与 lead agent 抢回复权的人格层,而 DeerFlow 的人格层已归属自定义 agent 的 `SOUL.md`。

**本裁决对第 1-3 期冻结。** §18 的第 4 期候选(文字形式生成式评论)**会与本条直接冲突** —— 一旦鹦鹉显示文本,它就不再是纯观察者,而是产生了一个次要输出面。故第 4 期的前置门槛不只是「证明有人 care」,还必须**显式重开并重写本裁决**(界定气泡与 message list 的关系、失败与误判的降级、以及它是否仍配称「装饰」)。不得静默实现。

**2026-09-11 重开一处:宠物从「线程的灯」变成「app 的灯」(只解除挂载范围,不解除观察者立场)。** 第 1 期挂 `div#chat`(§10),所以宠物只在**渲染了 ChatBox 的那一面**存在,离开聊天页就消失。用户裁定改为「不管切到哪个界面,鹦鹉都在」——这是本裁决第一次被改动。两条边界必须写清:

- **只解除「挂在哪个面」**,不解除任何一项观察者约束:仍不产生用户可见内容、不发请求、不持有 agent/线程/记忆、**不订阅 custom 事件**(§4.3 原样有效;外壳级订阅走的是线程流 `messages`/`values`,不是 custom 事件通道)。
- **改动不免费,原因是信息需求**:`wait` 的判定源 `hasOpenHumanInputRequest` **必须扫消息**,而线程列表里的 `status`(busy/idle)区分不了「在等你」与「跑完了」—— 因为 `ClarificationMiddleware` 走 `Command(goto=END)`,run 正常结束、线程就是 idle(§2.1 那条「同形」事实在 status 层面同样成立)。所以「粗档」(只读 status)在别的页面上**说不出本期唯一的交付判断**。结论:**精确档要求外壳一直持有当前线程的消息**,实现形态见 §10.3。

### 4.2 裁决二:持续态 + 一次性覆盖,不是扁平枚举

AIRI 的 `Emotion` 是扁平枚举,因为 Live2D motion 本身就是一次性动作叠 idle。帧动画不是这样组织的:美术按**循环**与**一次性**两种交付物出图,播放器也按这两种工作。

把 `done` 建成持续态是错的 —— 必须决定它何时结束,而这个决定是任意的,最终一定退化成写死的 timer。建成「`isLoading` 下降沿触发的一次性覆盖」则无此问题,且与美术交付物天然对齐。

### 4.3 裁决三:纯派生,不订阅 custom 事件

只读 `useThread()`,不在 `onStreamCustomEvent`(`core/threads/hooks.ts:73`、`:1797`)挂订阅。

- 走订阅能多拿 `llm_retry` 与 `safety_termination`,但要动 5 个聊天面的调用点(`page.tsx:117`、`agents/[agent_name]/chats/[thread_id]/page.tsx:112`、`agents/new/page.tsx:95`、`sidecar-panel.tsx:185`、`knowledge/chat-panel.tsx:163`),而 `hooks.ts:1662-1889` 的 options 对象已经很密
- 这两个事件都是罕见瞬态,且 `llm_retry` 已有 toast(`hooks.ts:1850-1855`)
- 子代理状态也不需要 custom 事件:`parseSubtaskResult` / `derivePendingSubtaskStatus` 已从 ToolMessage 派生

代价:第一版没有 `alert` 一次性动画。接受。收益:5 个面自动全覆盖,零新管线。

### 4.4 裁决四:鹦鹉不拥有 agent

鹦鹉**永不**持有自己的 agent、线程、记忆或回合。需要语义时只从既有类型化字段借;将来若要生成式评论,走 `oneshot_llm`,不走 harness。

**(a) 语义只借不造。** DeerFlow 已经在产语义,且前端已可读,增量成本为零:

| 语义 | 谁产出 | 前端可达 |
|---|---|---|
| goal blocker 六值(`missing_evidence` / `needs_user_input` / `run_failed` / `external_wait` / `goal_not_met_yet`) | `runtime/goal.py` 调 `run_oneshot_llm` 评估 | `thread.values.goal.last_evaluation.blocker`(`core/threads/types.ts:16-22`) |
| 子代理 guardrail cap(`token_capped` / `turn_capped` / `loop_capped`) | 中间件 stamp 的加性字段 | `Subtask.stopReason`(`core/tasks/types.ts:32`) |
| 子代理终态五值 + 折叠规则 | `contracts/subagent_status_contract.json` | `parseSubtaskResult` |

第一项已由主 run 付过 LLM 成本,鹦鹉白拿。且仓库自身立场明确 —— `core/tasks/types.ts:26-31` 的字段注释写着 "so a future badge can show 'capped' **without parsing result text**":**用类型化语义字段,不要重新从文本推语义**。一个自判情绪的鹦鹉 agent 正好违背这条既有约定。

**(b) harness agent 的代价是结构性的,不是代码量。**

| 会撞上什么 | 后果 |
|---|---|
| `uq_runs_thread_active`(`persistence/migrations/versions/0004_run_ownership.py:27`,每线程最多一个 pending/running run) | 同线程跑鹦鹉 agent 与主 run 409;换独立线程则写 `threads_meta` → **侧边栏出现鹦鹉会话**(Web UI 会话列表即读 `threads_meta`) |
| `ThreadDataMiddleware` + `SandboxMiddleware` | 一个线程 = 一棵 `.deer-flow/users/{uid}/threads/{tid}/user-data/{workspace,uploads,outputs}` 目录 + 一次沙箱获取,为一只装饰鹦鹉 |
| `MemoryMiddleware` | 它把用户消息与最终 AI 回复排队进 durable memory。仓库已为子代理加过 `skip_memory_flush=True`,原因正是子代理共享父 `thread_id` 会污染父线程记忆 —— 鹦鹉 agent 是同一类 bug |
| 成本 | 每次反应一次 LLM 调用;一轮 35 个工具调用的 run = 35 次鹦鹉调用 |
| 双声音 | 一旦它能说话就与 message list 争信任;它说错损的是整个产品的可信度 |

**(c) AIRI 是这条裁决的证据,不是反例。** 详见 §2.5.1:一个以「有自主性的伙伴」为全部卖点的项目,把主动 agent 约束成一回合、无历史、无 thread id、默认 `builtIn_sparkNoResponse`、工具与文本互斥、角色反应只是一个可插拔 sink 插件。那正是 `oneshot_llm` 的形状。

**(d) 若将来真要开口,抄 AIRI 给自己上的三道锁,并在第 2 条上做得更严:**

1. **一回合、无历史、无线程** → `oneshot_llm` 天然满足(`POST /api/input-polish` 的措辞即 "does not create a LangGraph run, persist a message, or touch thread state")
2. **默认不说话** → AIRI 给模型一个工具让它自己决定闭嘴;本设计更便宜也更稳:**由死映射决定「要不要开口」,由 `oneshot_llm` 只决定「说什么」**。LLM 永不判断时机,只判断措辞,误判面缩小一个量级,且时机是确定的、可测试的
3. **说话与做事互斥** → 鹦鹉永远只出反应,永不派活(不接 `task`,不接 scheduler)

## 5. 状态模型

### 5.1 类型(`core/pet/state.ts`)

```ts
export const PET_BASE_STATES = ["idle", "think", "work", "wait", "error"] as const;
export type PetBaseState = (typeof PET_BASE_STATES)[number];

export const PET_WORK_KINDS = [
  "exec", "read", "write", "browse", "recall", "delegate", "generic",
] as const;
export type PetWorkKind = (typeof PET_WORK_KINDS)[number];

export const PET_ONE_SHOTS = ["greet", "done"] as const;
export type PetOneShot = (typeof PET_ONE_SHOTS)[number];

export type FatigueLevel = 0 | 1 | 2 | 3;

export interface PetSignals {
  isLoading: boolean;
  wasLoading: boolean;
  hasError: boolean;
  hasOpenHumanInputRequest: boolean;
  /**
   * 全部在飞工具名,可为多个 —— DeerFlow 支持并行工具调用
   * (`max_concurrent_subagents` 钳在 1-4,且 LangGraph `ToolNode` 在一个
   * super-step 内追加多条 ToolMessage)。原设计的 `string | null` 是错的。
   * 空数组 = 无工具在飞。
   */
  activeToolNames: string[];
  fatigue: FatigueLevel;
}

export interface PetState {
  base: PetBaseState;
  workKind: PetWorkKind | null;
  fatigue: FatigueLevel;
  oneShot: PetOneShot | null;
}
```

`work` 的子类别**不进 `base` 枚举**,而是 `base === "work"` 时才非 null 的 `workKind`。这样决策树仍只在 5 个 base 上分支,回落是结构性的(§9),且可以一个子类别都不画。

### 5.2 派生逻辑

```ts
export function derivePetState(s: PetSignals): PetState {
  if (s.hasError) {
    return { base: "error", workKind: null, fatigue: s.fatigue, oneShot: null };
  }
  if (s.isLoading) {
    const kind = pickWorkKind(s.activeToolNames);
    return { base: kind ? "work" : "think", workKind: kind, fatigue: s.fatigue, oneShot: null };
  }
  if (s.hasOpenHumanInputRequest) {
    return { base: "wait", workKind: null, fatigue: s.fatigue, oneShot: null };
  }
  return {
    base: "idle",
    workKind: null,
    fatigue: s.fatigue,
    oneShot: s.wasLoading ? "done" : null,
  };
}
```

`greet` 不进纯函数 —— 它是挂载生命周期,由 `agent-pet.tsx` 触发一次。

### 5.3 三条不变量(测试必须逐条钉住)

1. **`error` 最高,且压掉 `done`** —— 跑挂了不庆祝。与既有语义一致:`thread.error` 本就会清掉 pending 的 human-input card(`shouldClearPendingHumanInputOnThreadError`,`core/messages/human-input.ts:74`)。
2. **`isLoading` 先分支,所以「未回答请求 + 新 run 在飞」时 `work` 赢。** 这是对的:agent 确实在干活,画 `wait` 会误导。该共存真实可达 —— composer 在有未回答请求时仍可用,且 `backend/AGENTS.md` 明写「没有任何东西保证同时只有一个未回答请求」。
3. **`done` 只在落到 `idle` 的下降沿触发**,不落到 `wait` 也不落到 `error`。这条就是 §1 目标 2 的实现。

顶层优先级与 `page.tsx:416-421` 的 `ChatStatus` 三元表达式同构(`error > isLoading > ready`),不是新发明。

## 6. 轴一:工具类别(`core/pet/tools.ts`)

### 6.1 在飞工具名怎么取(裁决:直接走 messages,不走 getMessageGroups)

2026-09-09 通读 `core/messages/utils.ts:36-196` 后裁决:**不得从 `getMessageGroups` 的输出派生在飞工具名**。原因是它把带工具调用的 AI 消息拆进三种互斥 group,优先级 `hasPresentFiles` → `assistant:present-files`(`:158`)> `hasSubagent`(即 `task`)→ `assistant:subagent`(`:164`)> 其余 → `assistant:processing`(`:170-187`)。只看 `assistant:processing` 会**永远看不到 `task` 与 `present_files`** —— 恰好是 §6.2 表里的 `delegate` 与 `write` 两项,`delegate` 会整个变成死代码。且一条同时含 `task` 与 `bash` 的消息会被判成 `assistant:subagent`,`bash` 直接消失。

另有两处复杂化因素使「取最后一个 group」不可靠:一个 processing group 会**累积多条** AI 消息(`:185`),每条又可能带多个 tool_calls;而孤儿 ToolMessage 会开出**不含任何 AI 消息**的 processing group(`:124-128`,注释明写 `convertToSteps` 只对 `type === "ai"` 出步骤)。

正确做法是直接走 `thread.messages`,与 group 分类完全解耦:

```ts
/** 收集当前没有对应 ToolMessage 的全部 tool_call 名。纯函数,O(n) 单遍。 */
export function collectActiveToolNames(messages: Message[]): string[] {
  const answered = new Set<string>();
  for (const m of messages) {
    // 不复用 findToolCallResult:它在 ToolMessage 存在但内容为空时也返回
    // undefined(§15 开放项 1),会把「已完成的空结果」误读成「仍在飞」。
    if (m.type === "tool" && m.tool_call_id) answered.add(m.tool_call_id);
  }
  const active: string[] = [];
  for (const m of messages) {
    if (!hasToolCalls(m)) continue;
    for (const call of m.tool_calls ?? []) {
      if (call.id && !answered.has(call.id)) active.push(call.name);
    }
  }
  return active;
}
```

复用 `hasToolCalls`(`core/messages/utils.ts:664`,实现即 `type === "ai" && tool_calls.length > 0`),自己写「有没有结果」的判定。

### 6.2 分类与并行裁决

```ts
const TOOL_WORK_KINDS: Record<string, PetWorkKind> = {
  bash: "exec", invoke_acp_agent: "exec",
  read_file: "read", ls: "read", glob: "read", grep: "read", view_image: "read",
  write_file: "write", str_replace: "write", present_files: "write",
  web_search: "browse", web_fetch: "browse", image_search: "browse",
  web_capture: "browse",
  browser_navigate: "browse", browser_snapshot: "browse", browser_click: "browse",
  browser_type: "browse", browser_get_text: "browse", browser_back: "browse",
  browser_screenshot: "browse", browser_close: "browse",
  hybrid_search: "recall", graph_search: "recall", wiki_search: "recall",
  memory_search: "recall", describe_skill: "recall", tool_search: "recall",
  task: "delegate",
};

export function classifyTool(name: string): PetWorkKind {
  return TOOL_WORK_KINDS[name] ?? "generic";
}

/** 多个工具并行在飞时谁赢。数值越小越显著。 */
const WORK_KIND_PRECEDENCE: Record<PetWorkKind, number> = {
  delegate: 0, exec: 1, write: 2, browse: 3, recall: 4, read: 5, generic: 6,
};

export function pickWorkKind(names: string[]): PetWorkKind | null {
  if (names.length === 0) return null;
  return names
    .map(classifyTool)
    .sort((a, b) => WORK_KIND_PRECEDENCE[a] - WORK_KIND_PRECEDENCE[b])[0];
}
```

优先级理由:`delegate`(派了子代理出去)最显著且最稀有;`exec`(bash)后果最重;`write` 改变产物;其余按对用户可见性递减。**这是产品判断而非推导结果**,若你有不同直觉改这一张表即可,涟漪面只有 `tools.test.ts`。

注意它与仓库既有的 group 优先级(`present_files` > `task` > 其余,§6.1)**故意不同**:那一套解决的是「一条消息只能渲染成一个 group」的互斥问题,这一套解决的是「多个并行工具里哪个最值得画」的显著性问题。两者不是同一个问题,不应统一。

**`?? "generic"` 是必需项而非礼貌兜底**:MCP 工具名是 `<server_name>_<tool>` 的无界命名空间(`tool_name_prefix` 默认 `true`),无法枚举。未知工具落 `generic`,`generic` 无帧则落 `work`。

`ask_clarification` 不在表内 —— 它走 `Command(goto=END)`,`isLoading` 变 false,由 `wait` 分支接管,永远不会作为在飞的 work 工具被观察到。

工具名的实时可见性:Gateway 通过 `messages-tuple` 推送每个工具调用一次(见 `backend/AGENTS.md` Embedded Client 的 stream 语义),且已被 chain-of-thought 步骤面板渲染(`components/workspace/messages/message-group.tsx:317+`)。

## 7. 轴二:疲劳度(`core/pet/fatigue.ts`)

> **状态(2026-09-12):本地址实现并测试完毕,但用户决定「不做」—— 不进任何一期,闸门 `FATIGUE_ENABLED` 恒 `false`。** 理由见 §17 的「疲劳度轴」行。本节余下内容保留为设计记录,重新启用前必须先回答那个符号方向问题(慢 = 累,还是慢 = 悠闲)。

```ts
export interface FatigueInput {
  toolCallCount: number;
  maxConsecutiveSameTool: number;
  /** `deerflow_tool_meta.status === "error"` 的 ToolMessage 数 */
  toolErrorCount: number;
  /** 上者中 `recoverable_by_model === false` 的子集(auth / config / internal 等) */
  unrecoverableErrorCount: number;
  elapsedMs: number;
}

export function computeFatigueLevel(i: FatigueInput): FatigueLevel {
  return Math.min(3, Math.max(
    byCount(i.toolCallCount),
    byRepetition(i.maxConsecutiveSameTool),
    byErrors(i.toolErrorCount),
    byUnrecoverable(i.unrecoverableErrorCount),
    byElapsed(i.elapsedMs),
  )) as FatigueLevel;
}
```

**`collectFatigueInput` 的签名(2026-09-10 Task 2 定案,原文留白)**:`collectFatigueInput(messages: Message[]): FatigueSignals`,其中 `export type FatigueSignals = Omit<FatigueInput, "elapsedMs">`。四种子分(调用数、连续同名、错误数、不可恢复错误数)都可由 `messages` 单遍推出,而 `elapsedMs` 是每 tick 变化的**活值** —— 若让它进 `collectFatigueInput`,调用方就必须把时间传进 memo,§12 要求的「memo 在 `messages.length` 上」当场失效。故 `elapsedMs` 由 `agent-pet.tsx` 在渲染时补进 `computeFatigueLevel({...signals, elapsedMs})`,补这一步的成本可以忽略(纯算术,每帧算也不贵)。另:`toolCallCount` 数的是**发起过的** tool_call(AI 消息 `tool_calls` 的条目数),不是已落地的 ToolMessage 数 —— 前提是「这个 run 干了多少活」,发起即算。

**错误判定来源已核实(2026-09-09,原设计的「带错误内容的 ToolMessage」是未验证假设)。** 后端 `agents/middlewares/tool_result_meta.py` 把 `ToolResultMeta` 盖在 `ToolMessage.additional_kwargs.deerflow_tool_meta`(`TOOL_META_KEY` `:18`,dataclass `:33-40`),模块 docstring 明写「Downstream consumers read this key **instead of parsing text**」。故本设计读 `status`(`success`|`error`|`partial_success`)与 `recoverable_by_model`,**不从文本猜错误** —— 这正是 §4.4(a) 引用的那条仓库约定的同一立场。

拆出 `unrecoverableErrorCount` 的理由:`recoverable_by_model === false` 对应 `error_type` 为 auth / rate_limited / transient / config / internal(`_ERROR_RULES` `:43-73`,`recommended_next_action` 为 `stop` 或 `summarize`),这类错误 agent 自己修不了,与 `no_results` / `not_found` / `permission`(可由模型恢复)是完全不同的处境,不该算同一个分。

五个子分取最大值,各自封顶 3:

| 子分 | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| `toolCallCount` | <5 | <15 | <35 | ≥35 |
| `maxConsecutiveSameTool` | <3 | 3-4 | 5-7 | ≥8 |
| `toolErrorCount` | 0 | 1 | 2-3 | ≥4 |
| `unrecoverableErrorCount` | 0 | 1 | ≥2 | — (1 个即 1,2 个封顶 3) |
| `elapsedMs` | <2min | <10min | <30min | ≥30min |

**这些阈值是猜的,不是推导出来的**(§15 开放项 2)。尤其 `maxConsecutiveSameTool`:后端 `LoopDetectionMiddleware` 判「重复」用的是完全相同的 tool_calls 集合,而这里只数连续同名,会明显更宽松(agent 反复 `read_file` 不同文件是正常的,不是打转)。

疲劳**只影响播放参数,不新增帧**(§9.2)。后端已有 `ToolProgressMiddleware` / `LoopDetectionMiddleware` 做同类判断,但均无实时事件通道(§2.3),故前端自算。`deerflow_tool_meta` **已确认抵达前端 ToolMessage**(2026-09-10,Task 0 Step 1,§15 开放项 8 已闭环:`messages-tuple` 与历史回灌两条出线都原样带出完整 meta)。

**但两个子分的实测触发频率差一个量级,校阈值时必须分开看**(同一批 138 条真实样本):`byErrors` 对应的 `status: "error"` 实测 5/138 ≈ **3.6%**(普通会话里每 28 次工具调用才一次出错);`byUnrecoverable` 对应的 `recoverable_by_model: false` 实测 **0/138** —— 本机全部历史里从未出现过,只有代码级证据(`_ERROR_RULES` 把 auth / rate_limited / transient / config / internal 判为 `False`)。所以 `byErrors` 的阈值是在校准一个「偶发但会发生」的信号,`byUnrecoverable` 的阈值是在校准一个「几乎不发生、一发生就很严重」的信号:前者封顶 3 的曲线可以按上面的实测频率推,后者本质上是布尔告警而非计数,`max` 语义(单一高分即拉满)正是为它准备的。

## 8. 帧资产契约

目录 `frontend/public/pet/parrot/`,`manifest.json` + 每状态一张横向单行 sheet:

```json
{
  "frameWidth": 512,
  "frameHeight": 512,
  "displaySize": 158,
  "fallback": "idle",
  "states": {
    "idle":  { "frames": 31, "fps": 8,  "loop": true,  "sheetWidth": 15872, "sheetHeight": 512 },
    "think": { "frames": 31, "fps": 8,  "loop": true,  "sheetWidth": 15872, "sheetHeight": 512 },
    "work":  { "frames": 31, "fps": 8,  "loop": true,  "sheetWidth": 15872, "sheetHeight": 512 },
    "wait":  { "frames": 31, "fps": 8,  "loop": true,  "sheetWidth": 15872, "sheetHeight": 512 },
    "error": { "frames": 31, "fps": 8,  "loop": true,  "sheetWidth": 15872, "sheetHeight": 512 },
    "done":  { "frames": 31, "fps": 24, "loop": false, "sheetWidth": 15872, "sheetHeight": 512 },
    "greet": { "frames": 30, "fps": 12, "loop": false, "sheetWidth": 15360, "sheetHeight": 512 }
  }
}
```

**31 而非 32,平台原因(2026-09-11 实测)**:libwebp **拒绝编码宽度 > 16383 的图**(`Picture size is too large. Max is 16383x16383.`),而且它写出的是**一张 0 字节文件** —— 静默失败的味道。32 帧 × 512 = 16384 正好越界 ⇒ 单行 512px sheet 的**编码**上限是 31 帧(15872)。注意这与 §8 规则 5 的**解码**上限是两回事:同一批实测里 16384/20480 宽的图 CSS 能解码,但**编不出来**;`pet_extract.py` 现在把这条做成了前置检查,而不是等最后 hstack 才炸。`greet` 的 30 帧(15360)本来就合规。

**manifest 自校验(2026-09-10 确认)**:每态多存 `sheetWidth / sheetHeight` 两个**由抽帧脚本写出**的数(`pet_extract.py sheet` 的 manifest 输出已含),node 测试逐态断言 `sheetWidth === frames × frameWidth` 且 `sheetHeight === frameHeight`。防的是「重导了 30 帧的 sheet 却忘了改 manifest 的 32」这类不同步:它不报错,只表现为某态播到尾巴花屏/空白,且只在该态播放时露出。纯算术、不解码图片,CI 提交时即拦。对照:Qoder 在加载时硬校验 sheet 网格(`DESKTOP_PET_SPRITESHEET_GRID_INVALID` 直接抛错),我们把它前移到提交时。

**三个尺寸/速度数(2026-09-10 用户确认):**

- `frameWidth × frameHeight = 512` 是 **sheet 帧的像素尺寸**,由缩放上限反推:`帧像素 = 缩放上限 CSS px × DPR`。**不插值的临界点 = `512 ÷ 用户屏 DPR`**(本机 DPR 1.5 ⇒ ≈341 ⇒ 取偶 **340**;DPR 2 ⇒ 256)。**注意这个判据与鸟占帧多少无关** —— 帧内所有元素按同一比例缩放,所以「何时开始放大」只看 `盒子宽 × DPR ÷ 帧像素`。原写的「鸟只占帧高 ~61% ⇒ 清晰上限按 `256 × 0.61 ≈ 156` 计」是**错的**(把尺寸比当成分辨率比,2026-09-12 更正):156 实为「DPR 2 的 1:1 盒子(256)下鸟在屏上的高度」,是鸟的高度、不是盒子尺寸。鸟只占 61% 的实际后果是**同一盒子下鸟看起来只有 61% 大**(§8 的补偿公式),而不是「盒子更早开始糊」
- `displaySize` 是 **CSS 显示尺寸**(元素盒子),与帧像素是两个独立的数:前者运行时改、后者导出时烘焙定死。**帧里装的是整个场景**(见 §8.1 规则 3),所以鸟在帧里只占一部分,`displaySize` 要按占比补偿:`displaySize = 期望鸟的显示高 ÷ 鸟在帧里的高度占比`。已交付的 idle:idle 鸟占帧高 61.5%、期望显示 ~96 CSS px ⇒ **`displaySize: 158`**(偶数,满足下一条约束)。**注意这条公式按 61.5% 与「~96」精确算得的是 `96 ÷ 0.615 ≈ 156.1` ⇒ 取偶 156,落地取 **158** 是「约 96」那一档的取偶结果(158 × 0.615 = 97.2 ≈ 96);**两者差 2px、视觉不可分,别把 158「纠正」成 156**(156 这个数在旧文档里还当过「清晰上限」,已于 2026-09-12 证伪,见 §10.2)。缩小免费且干净,放大超过 `帧像素 ÷ DPR` 丢细节。**约束(2026-09-10 确认):恒为偶数整数 CSS px**。理由:sheet 是栅格,盒子宽度在设备像素上取整后若与帧宽不齐(`displaySize × DPR` 非整数),盒子右缘会露出邻帧一条亚像素鬼影且随帧跳动;本机 DPR 1.5,偶数 CSS px ⇒ 整数设备像素(158 × 1.5 = 237)。Qoder 同款做法:`roundToEven(128 × percent/100)`。缩放控件(§10.2)的滑杆因此按 `step 2` 取偶
- **分档(多档帧像素按显示尺寸切换)暂不做**:分档省体积与解码内存,不省清晰度;母版与 sheet 分离(§8.1)保证将来加档 = 重新导出 + manifest 一行,零重画。若实测 31 帧×512 的解码内存(≈32.5 MB/态)不可接受,加档是唯一优化路径

六条规则,来源标注:

1. **`idle` 必需,其余全部可选,缺失回落 `fallback`** —— 借 tachie(`packages/stage-ui-tachie/README.md`:`neutral` required,missing emotions fall back to `neutral`)。效果:可先只画 `idle` + `wait` 两组就上线,后续纯美术增量,代码不动
2. **扩展名不属于协议** —— 借 tachie。png/webp 都不改代码
3. **所有 sheet 同 `frameWidth × frameHeight`** —— 借 tachie(「Every recognized image must use the same pixel dimensions」)。防状态切换时布局抖动
4. **横向单行 sheet** —— 本 spec 加料,理由是 §9 的纯 CSS 播放方案
5. **帧数预算上限 31 帧/态**(512/帧时)。两个限制里更紧的那个说了算:① **编码侧**:libwebp 拒绝宽度 > 16383(实测 `Picture size is too large` + 0 字节文件)⇒ `floor(16383/512) = 31` 帧;② **解码侧不是悬崖**:2026-09-10 在目标浏览器实测 CSS 背景图解码 15360 / 16384 / 20480 ×512 **全部成功**,16384 只是 WebGL 的 `MAX_TEXTURE_SIZE`,不适用 CSS 背景。另 31 帧×512 的解码内存 ≈32.5 MB/态,与原先 32 帧的估算同档
6. **帧数与 fps 由源 clip 反推,不独立选**,且 **fps 必须整除源帧率 24**(整数步长防时序抖动,可达阶梯 {24,12,8,6,4,3};15fps 要步长 1.6,否决)。循环态首尾同帧使整条 clip 即循环(§8.1)⇒ `fps = 帧数 ÷ clip 秒数`,clip ≥4s(生成器下限)且帧数 ≤31(规则 5)⇒ **循环态 fps 上限 8**:本表取 4s clip、步长 3、31 帧 @8fps(3.875s 一圈)。12fps 循环需 48 帧(50 MB/态解码、宽 24,576 未实测),或放弃像素级闭环改周期窗口 —— 后者每圈循环留一个接缝 tick 永久重复,对常驻装饰元素否决;24fps 循环需 96 帧,结构性死。一次性态不循环、窗口自选故 fps 自由:`done` 取 1.29s 窗口 @24fps 步长 1 = **31 帧**(视频原生顺滑,奖励时刻零定格感;原先按 32 帧设计,受规则 5 的编码上限压到 31);`greet` 取 2.5s 窗口 @12fps 步长 2 = 30 帧(挥手是长动作,宁可长不要丝)。两者成本几乎相同(都贴帧数预算),只差「长而略顿」与「短而丝滑」,按动作性格分配

### 8.1 视频抽帧管线契约(2026-09-10 收敛)

美术源是 MiniMax H3 生成视频(1:1 / 2K 即 1920×1920 / 24fps / 循环态 4s 整条循环且首尾同帧 / 一次性态 ≥4s 切窗口、不要求首尾同帧),不是手画帧。抽帧→资产的五条硬规则,违反任一条都是静默缺陷:

1. **丢重复末帧(仅循环态)**:首尾同帧保证闭环,但像素相同的首末帧会使接缝停留两倍时长 ⇒ 导出取 `[S, N-2]`(`S` = 循环起点,默认 0,见规则 4)。首尾同帧与本规则**只适用于循环态 clip**;一次性态 clip 不循环,生成时不需要首尾同帧(prompt 只要求动作发生在片段内),导出时不丢末帧、直接切窗口
2. **抠像参数全帧统一**:同一组容差/despill 一次设定跑全部帧;逐帧自动 matting 让 alpha 边缘每帧抖(boiling 转移到 alpha 通道)。背景用蓝或品红幕 —— 鹦鹉翅膀是绿色,绿幕对绿色主体是最坏组合
3. **裁剪框一次声明、永久不变(2026-09-11 修订:不是「各 clip 并集」)**:在画布坐标里**声明一个框**,以后每条 clip、每次重导都用它 —— 绝不逐帧自动裁,也**不再逐 clip 量并集**。原设计写的「并集矩形」被实测否掉,原因有两条:① 每来一条新 clip 都要重锁并集、并把**所有状态重出一遍**(维护成本落在每条新美术上);② 并集只会随动作变大,而框越大鸟在 512 帧里越小(§8 的 `displaySize` 补偿条:清晰缩放上限随鸟的占比缩)。**推荐声明整幅场景**(即不裁):动作空间拉满、换新 clip 零操作,代价只是清晰缩放上限从 256 降到约 156 CSS px —— 而母版是 source of truth,将来真要更大缩放上限,从**同一批母版**重新导一个更紧的框即可,美术零重画。生成侧规则不变且仍必须遵守:所有 clip 按**同一鸟尺度**生成、**鸟占画面高度约 60%、居中**(不是静态参考图的 96%)、**prompt 禁止全展翼**(全展需把鸟缩到画面高 45%,512 母版余量只剩 1.7×;且 96px 显示下全展与半展只差几个像素,不值)。`measure` 从「决定框」的作用降级为**体检**:量出并集确认鸟没出框、没碰到水印区
   **烧死水印(2026-09-11 实测)**:生成器会在右下角烧入水印(MiniMax/Hailuo 的 356×36 白字,逐帧位置固定)。它不是键色,**抠像抠不掉**,并会污染 `measure` 的并集(实测把右/下余量从 470/80 误报成 40/40)。导出前必须用 `pet_extract.py --mask x0,y0,x1,y1` 把该矩形**填成键色**,让同一个 colorkey 顺手去掉;`crop` 若恰好在框外可以不填,但整幅场景下**必然要填**
4. **先选窗口再抽稀,整数步长**:循环态通常整条即循环、无需选窗,步长 3(4s/96 帧 → **31 帧 @8fps**;31 而非 32 是 WebP 编码上限所致,§8 规则 5)。**但生成器常在开头留一段静止** —— 实测(2026-09-11 的 wait clip):帧 0~10 与首帧的相似度一直是 34~44 dB(基本没动),帧 11 才开始歪头;整条循环会把这段静止循环进去,于是**每圈开头都有一拍呆滞**(用户原话「回正后接不上…的开始歪头」)。修法是 **`--start S`(循环态专用,默认 0)把循环起点推到静止段之后**,`sheet` / `frames` 都支持,守卫相应改成对 `N-1-S` 求整除。**选 S 的方法**:量 `psnr(末帧, 候选起点)` 并和该窗口内的普通步长(即 `psnr(i, i+步长)`)比,**落在普通步附近即可**(wait 实测:起点 12、收尾切到 99 时收尾步 30.02 dB,被两侧普通步 28.31 / 29.80 dB 夹住 ⇒ 看不出哪一步是接缝)。一次性态先选动作窗口再等间隔取帧:`done` 1.29s 窗口步长 1(**31 帧 @24fps**)、`greet` 2.5s 窗口步长 2(30 帧 @12fps)。**生成器常超出标称时长**(实测要 4s 给 107 帧 = 4.458s),而循环要求跨度能被步长整除 ⇒ 用 `--frames N` 收敛到合法周期,不要为此重编码素材。**允许的例外:多窗口拼接(2026-09-13 实测定案,greet 落地)** —— 当动作弧本身超过「31 帧 × 步长」的覆盖上限时(一次性态尤其常见:greet 的源片弧长 **109 源帧 = 4.54s**,而 8fps 的 31 帧只覆盖 90 源帧),可以把弧切成**连续窗口分别抽帧、再按顺序拼成一条 sheet**(`frames` 分段 → 合并目录 → `pack --config`),**用变速采样换覆盖**:静止段按大步长取稀、动作段按小步长取密。这是对「等间隔」的**有意例外**,成立条件两条:① **拼接点必须落在静止段里**(用 `psnr(i, 0)` 验证那段几乎不动,否则会看到跳变);② 输出 fps 仍是**单一值**(manifest 只有一个 `fps`),所以变速体现在**局部时间密度**上 —— 静止段那截会「走得更快」,只有静止才看不出来。greet 的实际切法:A 段源帧 9~21 步长 3(5 帧)+ B 段 24~100 步长 4(20 帧)+ C 段 105~118 步长 3(5 帧)= **30 帧 @8fps = 3.75s**,举翅/保持/回落完整。
5. **基准帧三层锚定(2026-09-10 定案)**:参考图 → 基准帧 → 视频,三层各司其职。参考图只回答「角色长什么样」,**永不直接进视频生成器**(外貌文字描述是有害冗余,会诱导模型重绘角色产生形象漂移);基准帧是**确定性合成**,AI 不参与布局 —— 生图模型不吃比例与绝对位置的文字指令,布局权威只能在合成里:透明底参考图贴到 1920×1920 纯品红画布,参数仅三个(画布色 / 鸟高 1152 即 60% / y 偏移 668,x 居中)。五条循环态 clip 的**首帧 = 末帧 = 基准帧 A**,且五态共用同一张(error 为围绕中性姿态的叹气循环,故无需耷拉基准帧);一次性态只挂首帧 = A。视频模型「动作小就撑满、动作大就留空」的自动构图权威由此收回,这是跨 clip 尺度一致性的来源;prompt 的「位置与大小全程完全不变」是第二道保险。**QC**:每 clip 量首/中/末三帧鸟 bbox,尺度漂移超 ±5% 弃片或走脚本侧归一化(安全网的明确触发条件);若某态动作被模型挤出画框,说明动作幅度超了预批余量 —— 改小 prompt 动作幅度,**不得为该 clip 单独改基准帧**(改基准帧 = 尺度跳变回归)

管线顺序:`统一抠像 → 锁定声明框 → 重采样烘焙到 512 → 拼横向单行 sheet`。**视频/母版是 source of truth,sheet 是可重导产物**:放大上限、帧尺寸或声明框变更时从母版重新导出,绝不从旧 sheet 放大。

**工具(`scripts/pet_extract.py`,纯标准库 + ffmpeg,无第三方依赖)**:

| 子命令 | 作用 | 生效的闸 |
|---|---|---|
| `base` | 从透明底参考图**确定性合成**基准帧(规则 5 的布局权威) | 鸟高 ≤65% 画布、下余量 ≥80px |
| `measure` | **体检**:量该 clip 抠像后的并集与四边余量 | 无(只读) |
| `sheet` | **一步流**:挑帧→抹水印→抠像→裁框→缩到 512→拼长条→WebP | 步长整除 24、循环态 `(n-1)%步长==0`、≤31 帧、WebP 宽度上限 |
| `frames` | **美术侧半步**:挑帧→抹水印→裁框,交出**背景未抠**、**原分辨率**的 PNG(`--no-scale` 为默认推荐;不带则交 512² 帧) | 同上 |
| `pack` | 把外部编辑过的 PNG 拼成长条 + 打印 manifest(**默认按「已抠像」处理;带 `--config` 则用与 `sheet` 同一条 colorkey 在拼图时抠**) | 全套尺寸一致、必须正方、WebP 宽度上限;无 alpha 且未给 `--config` 时警告 |

`frames` + `pack` 是为「美术侧自己抠像」准备的:取帧与几何(裁/缩)由脚本保证一致,**抠像这一刀可以由人用别的工具完成**。**默认交原分辨率帧**(`frames --no-scale`,裁剪后不缩放),抠完由 `pack --frame 512` 在拼图时下采样 —— 于是两条路是**同一个顺序(抠像 → 缩放)**,实测产物只差 0.5%(PNG 的 alpha 往返;同为 15872×512 / 31 帧)。想省传输体积也可以不要 `--no-scale`(交出 512² 帧,31 帧约 15 MB → 约 2 MB),代价是在已缩小的帧上抠、边缘略硬(实测体积 391 KB vs 445 KB,显示尺寸下不可辨)。`pack` 因此**接受任意统一的正方尺寸**并在拼接时缩到 `--frame`,但要求尺寸必须齐、必须正方(否则拼出的帧会错位,或与声明框的宽高比不符)。**已知未修的观感项**:品红幕没有等价的 `despill`(ffmpeg 的 `despill` 只支持 green/blue),深色主题下剪影有一圈品红描边 —— 在整幅场景方案里它约 0.19 像素,用户 2026-09-11 确认**接受**;真要根治需改用**蓝幕**重出并启用 `despill=type=blue`。

**配套预览器 `scripts/pet_sheet_viewer.html`(2026-09-11 加入)**:单文件、无依赖、双击离线可用。把 sheet 拖进页面即可播放,**可一次拖入多张并排对比**;帧数按 `宽 ÷ 高` 自动读出、fps 取文件名里的 `Nfps`(两者都可手改),播放行与 §9.1 的渲染器**逐字同源**(同一套 `@keyframes` + `steps(N, jump-none)`),所以预览里顺的到应用里就是顺的。另有三件专为这条线加的东西:**逐帧检视滑杆**(暂停并停到第 k 帧,用于看接缝)、**背景切换**(深色/浅色/棋盘/品红,用于判断抠像边缘),以及**「复制 manifest」**(按当前帧数/fps/状态名生成 manifest 片段,防「重导了 26 帧忘了改 manifest」)。它是纯观察工具,不参与导出、不进渲染路径。

**README 预览动图(2026-09-18 记入 —— 这份配方此前只活在执行者记忆里,仓库零记录)**:`docs/assets/pet/parrot-<state>.gif`(README「Agent 观测宠物」那节表格里的 7 张)由对应 sheet 用**两步 ffmpeg** 合成,与 §9.1 的渲染器无关(纯预览,不参与应用内播放):

```bash
# 1) 切帧:i 从 0 到 N-1(sheet 是横向单行,每帧 512 宽)
ffmpeg -y -i frontend/public/pet/parrot/<state>.webp -vf "crop=512:512:$((i*512)):0" -frames:v 1 <tmp>/f$(printf %02d $i).png
# 2) 合成:8fps、缩到 240、保留透明、96 色
ffmpeg -y -framerate 8 -i <tmp>/f%02d.png \
  -vf "scale=240:240,split[a][b];[a]palettegen=reserve_transparent=1:max_colors=96[p];[b][p]paletteuse=dither=none" \
  -loop 0 docs/assets/pet/parrot-<state>.gif
```

实测参数(**2026-10-02 起 7 张统一 240×240**,README 表格 `<img width="240">` 显示;此前为 `idle` 200×200、其余 120×120、表格 `width="120"`);`nb_frames` = 该态的帧数;GIF 时基只有 10 ms,故 8 fps 落成 `25/3`(与产品里的 8 fps 观感无差)。**换美术时这 7 张要用同一条配方一起重生成**,否则表格里会出现两种量化风格;两个一次性态在 README 里是**循环预览**(`-loop 0`),产品里只播一次,表下那行注释已说明。**验配方一致性的便宜办法**:重生成一张已入库的比字节 —— 同族产物应落在 ±5% 内(240 尺寸时代实测:按本配方重出 `wait` 146,688 vs 入库 147,153 = **-0.32%**;ffmpeg 版本不同不会逐字节相同)。

## 9. 渲染器

### 9.1 纯 CSS `steps()`,不引依赖

横向单行等高 sheet 意味着 `background-position` + `steps(N, jump-none)` 就够:

```css
/* 盒子边长 = displaySize;sheet 宽 = N 帧 */
background-size: calc(var(--frames) * 100%) 100%;
animation: pet-play calc(var(--frames) / var(--fps) * 1s) steps(var(--frames), jump-none) infinite;
```

**必须是 `jump-none`,不能是裸 `steps(N)`(2026-09-10 真实浏览器实测,订正本节原片段)。** 数学:sheet 宽设为 N×盒子宽后,背景可移动范围是 `(N-1)×盒子宽`,于是第 k 帧恰好落在 `100k/(N-1)%` 上 —— 这正是 `steps(N, jump-none)` 输出的 N 个离散值(含首末两端)。裸 `steps(N)` 输出的是 `k/N`,少了一整帧的行程:

| 进度 | `steps(4, jump-none)` | 裸 `steps(4)` |
|---|---|---|
| 0 | 0% | 0% |
| 1/4 | **33.3333%** | 25% |
| 2/4 | **66.6667%** | 50% |
| 3/4 | **100%** | 75%(**末帧永不可达**) |

即裸写法**永远播不到最后一帧**(N=4 时整帧缺失,N=32 时漂移到约一帧并丢掉末帧);`CSS.supports('animation-timing-function','steps(4, jump-none)') === true`,支持无虞。另外盒子尺寸一旦变化(缩放、DPR 变化)就会重排并重置 `background-position` 的百分比基准 —— §10 的「displaySize 恒为偶数整数 CSS px」同时也在防这件事。

不要 JS rAF、不要 canvas、不要 PixiJS。tachie 用 PixiJS 是为了透明 canvas + 缩放/阴影/截图/主题色提取,本设计无这些需求。一次性动画即 `animation-iteration-count: 1` + `onAnimationEnd` 清 `oneShot` 回 base。

**换 sheet 必须等解码完成(2026-09-11 用户实测缺陷,已修)**:`background-image` 一换 URL,浏览器要**现解码**新的 sheet —— 31 帧 × 512 是 7.5 Mpx、解码后约 31 MB,解完之前那一格**没有像素**,表现就是「切状态时宠物先消失一下,再进入下一个状态」。修法是让**画在元素上的那张慢于状态一步**:新的 sheet 用 `new Image()` + `decode()` 预热,**解码成功后才换 `background-image`**,期间旧的那张一直在画,所以看不出空白。两个细节都不是可选的:① 预热结果要**持有 `<img>` 的强引用**(否则解码数据被回收,预热等于没做);② **解码失败就不换** —— 换上去是一格空白,留着旧的至少还是一只鸟。首帧例外:没有旧图可留,直接画即可(等只会让宠物出现得更晚)。不变量由 `pet-sprite.dom.test.tsx` 的「state switch」两条用例钉住(把等待去掉即转红)。

**但 `decode()` 不是可靠信号(2026-09-13 补)**:页面被判为不可见时 Chrome 会**推迟解码**,`decode()` 既不 resolve 也不 reject —— 可以**永不 settle**(在自动化浏览器里实测:整段探针脚本超时 15s,同页 `document.hidden === true`、动画 `currentTime` 冻在 0)。只认它会把换图**永久扣住**:宠物停在上一张,直到下一次状态变化再来一遍(切到后台标签、run 跑完、再切回来就是这个场景)。修法是给**有界回退**——字节到齐(`load` 事件)之后最多再等 **150ms**,到点就换;真解码失败(编码错误)仍按「不换」处理。表面代价是极端情况下可能等到一张尚未解码完的图(那一格有空白风险),但**比永久停在旧状态好**。用例:「decode 永不 settle ⇒ 过了宽限期照样换图」(revert 证明:拿掉那个定时器即转红)。**注**:首次渲染走 `useState(sprite)` 直接赋值、**不经过这道门**,所以它不受影响 —— 这也是「能看见 idle 却换不到 wait」这类现象的解释。

**对照实测(2026-09-10,Qoder 安装包)**:它走的是「烤死 fps 的动画 WebP」路线,代价直接可见 —— 每个状态都要再配一个 `-still` 首帧 WebP,靠 `<picture><source media="(prefers-reduced-motion: reduce)">` 切换(内置角色 11 态 + 16 视线帧 ⇒ 成对资产 ~54 个文件);一次性动作拿不到播完事件,`waving` 问候只能 `setTimeout(2600ms)` 硬切回 idle。本设计的 `steps()` 两个代价都为零:减弱动效 = 动画时长置 0 停在首帧(单套资产),一次性态 = `animationend` 真事件。

### 9.2 解析与 fps(`core/pet/sprite.ts`,纯函数)

```ts
export function resolveSprite(state: PetState, manifest: PetManifest): string | null {
  const oneShot = state.oneShot ? [state.oneShot] : [];
  const base =
    state.base === "work" && state.workKind
      ? [`work-${state.workKind}`, "work"]
      : [state.base];
  return [...oneShot, ...base, manifest.fallback].find((c) => c in manifest.states) ?? null;
}

export const FATIGUE_FPS_SCALE = [1, 0.9, 0.75, 0.6] as const;

export function effectiveFps(sprite: string, state: PetState, manifest: PetManifest): number {
  const entry = manifest.states[sprite];
  // 一次性动画不衰减:done 是信息,必须读得清
  return entry.loop ? entry.fps * FATIGUE_FPS_SCALE[state.fatigue] : entry.fps;
}
```

两级回落(`work-{kind}` → `work` → `fallback`)是 §8 规则 1 的自然延伸,使 §6 的六个子类别**全部可选**。

## 10. 挂载与定位(裁决)

**第 1 期挂点**(第 2 期跨页迁移到外壳,见 §10.3):挂 `chat-box.tsx:413` 的 `div#chat` 内,作为 `{children}` 的兄弟:

```
absolute right-3 top-14 z-20 pointer-events-none
```

- `top-14` = 56px,避开 `h-12`(48px)的 header(`page.tsx:281-283`)
- `z-20` 低于 header 与 composer 的 `z-30`
- `pointer-events-none` 让点击穿透
- **窄面板不渲染,断点定为容器宽度 ≤ 480px**(`@container` 查询,不用 viewport 断点 —— 因为 sidecar 面板可以独立于窗口宽度被拖窄,viewport 断点判不出来;`max-width: 480px` 是闭区间,2026-09-10 实测 481 显示 / 480 隐藏,故措辞从「< 480px」更正为「≤ 480px」)。**2026-09-10 核查更正**:既有的 `container-type:inline-size` 挂在 `ResizablePanelGroup` 上(`chat-box.tsx:400`),量的是 **chat + 右侧面板的总宽**,是错误的盒子 —— 侧面板开着且 group 宽时,chat 面板被拖窄不会触发。裁决:挂载点自己加一层 `[container-type:inline-size]`(加在 `div#chat` 或宠物外壳上),让 `@container` 量 chat 面板;inline-size  containment 不改变布局(宽度仍由父级决定),不触碰三条既有约束。浏览器支持与隐藏语义已实测(`CSS.supports('container-type','inline-size') === true`;400px 容器隐藏、600px 容器显示,均正确)。
  **2026-09-10 Task 0 Step 2 已在真实应用内闭环**(运行时 spike,零源码改动,reload 后无残留):① `div#chat` 在 `/workspace/chats/new`(新会话页,尚未发消息)就存在,宽 759、`container-type: normal`,而带 `[container-type:inline-size]` 的祖先是 `#workspace-chats-new-group`(宽 760)—— 现场复现了上面的「错误盒子」;② 给 `div#chat` 自挂 `container-type: inline-size` 后**布局逐字节不变**(自身 759→759,首个子节点矩形 before/after 完全相同),「不触碰既有约束」成立;③ 挂在 `div#chat` 下的探针按 700/600/481 显示、480/479/400/300 隐藏,断点精确落在 480;④ **对照实验**:同一时刻把 chat 面板压到 400 而 group 仍为 760,挂在 group 下的同规则探针**不匹配**窄规则(仍按 760 求值)—— 证明自挂不是偏好而是必需,§10 的更正方向正确。Task 6 的隐藏实现照此写即可;「sidecar 真拖拽会改变 `div#chat` 宽度」这一环已于 2026-09-10 在应用内补验:拖分隔条时 chat 面板 **538 → 318**、side 面板 359 → 579,拖拽期间库自身的 `data-separator` 翻成 `active`(手势被正常接管、约束未被本设计触碰),chat 落到 318(≤480)时 `.pet-shell` **`display: none` 但节点仍在**,拖回后两面板宽度与初始完全对称、宠物**自动回到 `display: block`**,console 全程零报错。

**布局覆盖裁决(2026-09-12 改写:原「第 1 期桌面端 only」作废)。** 宠物已改挂 **workspace 外壳**(§10.3),不再挂在 `div#chat` 里 —— 原裁决的理由(「mobile 分支没有 `id="chat"`,挂载点不存在」)**随迁移自动失效**。现在宠物在**所有布局**出现,唯一的闸是下面那条 `@container (max-width: 480px)`。

- **实测(2026-09-12,真实应用采样)**:内容区 = 窗口 − 侧边栏(展开 **256** / 收起 **48**);窗口 < 768 时切移动布局(侧边栏变 Sheet),此时内容区 = 窗口。⇒ **桌面布局最窄的内容区是 `768 − 256 = 512` > 480**,所以那条 480 **在桌面布局里永远触发不到**,它只是「窗口本身窄到 480 以下」时的兜底。边界实测:内容区 482 显示 / 480 隐藏,回程 479 隐藏 / 483 显示(闭区间确认)。
- **用户裁定(2026-09-12):窄窗口(481–767)也要有宠物**,依据是内容区 512–600 实测**不挤**;再窄时用户可以缩小宠物(§10.2 缩放控件)或收起侧边栏(内容区 +208)。⇒ **480 保持不动**,不改阈值。
- **由此带来的覆盖面**:宠物现在也会出现在**知识库、agent 列表、定时任务**等非聊天页,以及窄/移动布局里 —— 与各页工具栏的观感由 plan Task 5 Step 7 看。

**为什么不是右下**:全局 `<Toaster>` 在 viewport 右下,知识库页已因它压 composer 而把通知改道中间列(§2.6)。**为什么不是 header 内**:24px 的元素是状态图标不是宠物,装饰需要存在感。

**已接受的代价**:该位置会盖住 message list 右上角,可能压到代码块复制按钮。缓解是 `pointer-events-none`(点击穿透)+ 480px 断点隐藏。若实测不可接受,回退方案见 §15 开放项 3。

**缩放(第 2 期,2026-09-11 定案、2026-09-12 已交付;控件设计见 §10.2)**:第 1 期按固定 `displaySize: 158` 渲染(2026-09-11 从 96 上调 —— 帧装的是整个场景,鸟只占 61.5%,这个数是按「期望鸟显示 ~96 CSS px」补偿出来的,见 §8),全部验收与位置碰撞评估以 158 为准。缩放控件把 displaySize 在 **64–512** CSS px 内运行时化(上界 2026-09-12 由 256 两度放宽:256 → 340 → **512 = 帧像素数**;不插值的临界点、以及「超过 340 才是插值」见 §10.2):纯 CSS 盒子尺寸 + `background-size` 等比,不改渲染器状态逻辑,不需要新资产档(512 帧像素在用户屏 DPR 1.5 下正好覆盖到上界,再往上才是放大);缩到 64 是把帧下采样 8 倍的保守端,无细线闪烁风险。**缩放基准点定底边**(`origin-bottom`,Qoder 精灵 `<img>` 同款):鹦鹉常态站地,绕中心缩放会让脚浮空/陷进消息流。**displaySize 恒为偶数整数 CSS px**(2026-09-10 确认):sheet 是栅格,盒子宽在设备像素取整后若与帧宽不齐(`displaySize × DPR` 非整数),右缘会露出邻帧一条亚像素鬼影且随帧跳动;本机 DPR 1.5 ⇒ 偶数 CSS px 即整数设备像素;Qoder 同款 `roundToEven`。故滑杆按 `step 2` 取偶(实测形态取滑杆,见 §10.2)。

### 10.1 自由放置(第 1 期,2026-09-10 确认)

**先例实测(读本机 Qoder 安装包 `app.asar`,2026-09-10)**:桌宠 = 同进程独立 top-level 窗口(surfaceId `desktop-pet`,标题 `Qoder Desktop Pet`,`focusable: true`),窗口盒 = **精灵盒 + 48px 工具条区**:`spriteSize = roundToEven(128 × sizePercent / 100)`,`width = spriteSize`,`height = spriteSize + 48`(默认 100% ⇒ 128×176,与窗口列表实测一致)。内置角色 `Qoduck`,资产为**每态一对预烤 WebP**:`idle / running / running-left / running-right / waiting / review / failed / waving / jumping` 各一个动画 WebP + 一个 `-still` 首帧 WebP,外加 16 个 22.5° 步进的 `look-*` 视线帧(同样成对);渲染是 `<picture><source media="(prefers-reduced-motion: reduce)" srcSet={still}><img src={animated} class="object-contain origin-bottom pointer-events-none"></picture>` —— **动图 fps 烤死在资产里,减弱动效靠双资产切换**。第三方宠物包(petdex)契约:`~/.petdex/pets/<slug>/pet.json` + **恰好一个** `spritesheet.webp|png`(≤32MB),sheet 是 **8 列 × 9 行(v2 为 11 行)网格**,格子 ≥48×52 且宽高比锁死 `cellW×13 === cellH×12`;主进程用 sharp 把每行按 `frameDelaysMs` 数组(逐帧不等间隔,如 idle `[280,110,110,140,140,320]`)编成动画 WebP(`lossless, loop:0`)缓存复用 —— 即**网格 sheet 是分发格式,播放仍是烤死 fps 的动图**。拖拽:`pointerdown`(左键)在 **`id="desktop-pet-hit-target"`、高度 = `spriteSize` 的独立命中元素**上(精灵 `<img>` 自身 `pointer-events-none`)→ `setPointerCapture` → 屏幕坐标位移 `> 4px` 才算起拖并发 IPC `dragStart`,随后 `dragMove`,`pointerup` 发 `dragEnd`,并用一个 ref 标志**吞掉拖拽后紧跟的那次 click**;主进程按 delta 移动窗口 bounds、立即把 `placement` 置 `"detached"`,松手 `clamp` 到当前显示器工作区(`x ∈ [wa.x, wa.x + max(0, wa.w - w)]`,y 同理);默认锚位是工作区**右下角内缩 24px**,且每次开窗都重算 ⇒ **detached 位置不跨重启持久**。另有光标采样 80ms 一次驱动视线跟随(距离 ≥ `max(40, size × 0.38)` 且在 ±200px 内才跟),问候 `waving` 是**循环动图 + `setTimeout(2600ms)` 切回**,没有播完事件。

可迁移四条:① **命中区域与精灵分离**(精灵恒 `pointer-events-none`,输入交给一个精灵盒大小的兄弟元素)—— 与本节 DOM 裁决同构;② **4px 起拖阈值 + pointer capture + 拖后吞 click** 三件套照抄;③ **clamp 是纯函数、在松手/容器变化时对矩形做一次**,与 `clampOffset` 同形;④ **缩放绕底边**(`origin-bottom` + `object-contain`),脚不浮空 —— 写进 §10 缩放行。不可迁移四条:OS 窗口放置与 z 序(本项目在标签页内);按像素点击穿透(它靠窗口管理器,我们靠 `pointer-events-none`,后者更彻底);双资产减弱动效(CSS `steps()` 冻结动画即可,省掉 22 个 still 文件);烤死 fps 的动图(会杀死 §8 的疲劳轴,且一次性态只能退化成硬编码计时器 —— Qoder 的 `waving` 正是这个退化形态)。

**DOM 内实现裁决:Alt+拖拽,window 级矩形命中。** `window` 的 `pointerdown` 上判断 Alt 按下且指针落在宠物盒矩形内(矩形由 `offset` + `displaySize` 算出,**不依赖宠物自身 pointer-events**)→ 记录 `pointerId` + 起点并 `setPointerCapture`;位移 **> 4px** 才真正起拖(照抄 Qoder 的 `dragThreshold = 4`,避免 Alt+单击误判成拖拽);`pointermove` 更新 offset;`pointerup` 写回设置并释放捕获,`pointercancel` 同样收尾。**这条手势的另一半是「Alt+单击 = 跳转」(2026-09-12 落地,见 §17)**:同一条命中路径、同一个 4px 阈值,`pointerup` 时未越阈值即单击 ⇒ 不写 offset,改为跳回宠物代表的会话。**两种分支都吞掉紧跟的那次 click**(Qoder 用一个 ref 标志做同一件事):不吞的话松手会激活底下的消息链接,单击分支还会「既跳转又点中链接」。鹦鹉**全程保持 `pointer-events-none`**,故自由放置、单击跳转与点击穿透共存:两者的成本都只是该次手势本身。**不做 hover 控制药丸**(那要求闲置时给宠物指针事件,遮挡问题回归;Qoder 挂得住药丸因其窗口原生按像素命中)。发现性由设置行提示文案承担(现含 Alt+单击一句)。

**拖拽期间状态裁决(2026-09-10,用户确认 ①)**:拖拽手势**不进状态机** —— 拖拽中鹦鹉继续播当前态。理由:拖拽是**摆放操作**不是宠物行为,播当前态不会被读成错误信息;而 Qoder 的方向感知拖拽态(`running-left/right`,宠物「被拖着跑」)需要一条新方向性视频 + 状态机新输入,记 §17 推迟项。实现上即 `dragging` 只存在于手势 ref,不写进 `PetState`。

**持久化与跨面**:`core/settings/local.ts` 的 pet 节加 `offset: { right, top }`,默认 `{ right: 12, top: 56 }`(即原 `right-3 top-14`);按节 merge 自动补默认,无迁移。所有 ChatBox 挂载读同一 offset;**渲染时 clamp 到面板可见区**(sidecar 拖窄、窗口 resize 不把盒子推出屏;clamp 不写回设置),clamp 为纯函数 `clampOffset`,置 `core/pet/placement.ts`,node 环境可测。与 480px 容器隐藏、缩放正交不变。设置行提供「重置位置」。默认 offset 即 §10 的挂载位置,未摆放用户零感知。

**测试**:node 增 `placement.test.ts`(clamp:窄面板/resize 不出屏;默认 offset 即 right-3 top-14);DOM 增两 case(Alt+拖拽更新 offset 并持久化;未按 Alt 不起拖、鹦鹉仍点击穿透)。

### 10.2 用户可控缩放(第 2 期,2026-09-11 定案)

**范围 64–512,「不插值」的临界点是 341 —— 控件必须把这两个数分开说,别混。**(上界 2026-09-12 由用户两次放宽:256 → 340 → 512)

- **整帧 1:1 的临界点 = 341**(用户屏 DPR 1.5):帧 512 像素铺满盒子,当 `盒子宽 × DPR ≤ 512` 时**没有任何插值**。`512 ÷ 1.5 ≈ 341`,取偶 340。用户实测印证:340 时鹦鹉「仍然非常清晰」—— 插值在这里刚刚要开始。
- **可拖上界 = 512**(用户裁定「再大一点」):512 等于**帧的像素数**,好记;它是在 1:1 临界点之上**刻意留 1.5× 插值余量**的封顶值。512 时鸟在屏上高 ≈315 CSS px(其源像素也是 315px)⇒ 恰好 1.5×;厚涂/软笔触的美术在 1.5× 下基本看不出软。**341 以上都在插值**,不是从 156 开始。
- **更正(2026-09-12,用户已裁定「改成真阈值」)**:本节原先写的「鸟的清晰上限 ≈156,156 以上是插值放大」**算术有误** —— 它把 61.5% 这个**尺寸比**当成了分辨率比。帧内所有元素按同一比例缩放,故「插值何时开始」只由 `盒子宽 × DPR ÷ 512` 决定,与鸟占帧多少无关:**DPR 1.5 ⇒ 341,DPR 2 ⇒ 256**。**156 实际是「DPR 2 的 1:1 盒子(256)下鸟在屏上的高度」**,不是盒子尺寸(与 §8 那条实测「本机清晰上限 ≈341」相矛盾,已按 341 更正 §8)。连带三处已同步:① 两种语言的 `sizeHint` 文案改成「超过 **340px** 开始插值放大」;② 吸附点 `154 → 156` 改为 **`338 → 340`**(语义从「质量提示」变成「精确落在不插值边界上」);③ §8 的同一条推导。**注意 340 是 DPR 相关的值** —— 换到 DPR 2 的屏上真正的边界是 256,文案里的数字届时需跟着改(未做运行时按 DPR 推导,见 §17)。

⇒ 512 是**可拖动范围**的上界,340 是**不插值**的临界点(本机 DPR 1.5)。滑杆在临界点以上照旧**不禁用** —— 它只是会变软。

- **落盘**:`core/settings/local.ts` 的 pet 节加 `displaySize`,按节 merge 自动补默认(**无需迁移**,§11 同款);默认 158(§8 的补偿值)。设置行照 §10.1 提供「重置」。
- **控件**:滑杆或档位,**恒取偶数整数**(§10 已给理由:盒宽要与设备像素对齐)。**实测形态取滑杆**(`min 64 / max 512 / step 2`,实时读数);若改档位,建议 64 / 128 / **158** / 256 / 341 / 512 —— 形状参照 Qoder 的 `roundToEven(128 × percent / 100)`。
- **渲染**:纯 CSS —— 盒子 `width`/`height` + `background-size: N × 100% 100%` 等比。不改渲染器状态逻辑、不需要新资产档。
- **已知陷阱,必须处理(来自 §9.1 的同一条实测)**:盒子尺寸一变就会重排并**重置 `background-position` 的百分比基准** ⇒ 拖滑杆时若每帧改尺寸,帧位会抖/回跳。故控件的值**松手才应用**(拖动中只更新本地预览态,`onPointerUp` / `onChangeEnd` 才写设置),或在拖动期间暂停 animation。
- **与放置正交**:`clampOffset` 用 `displaySize` 算盒矩形,所以缩放后要**对矩形重跑一次 clamp**(§10.1 的 clamp 本就是「容器/盒子变化时对矩形做一次」的纯函数);窗口 resize 同理。
- **验收**:① 全程偶数;② DPR 1.5 下盒宽落到整数设备像素;③ 拖动滑杆**不出现帧位抖动**;④ 缩放后盒子不出屏(clamp 生效);⑤ 切状态仍不空白(§9.1 的解码门不受影响)。

### 10.3 跨页挂载:从「线程的灯」到「app 的灯」(第 2 期,2026-09-11 定案)

**范围** = `workspace` 全站(chats / agents / knowledge / scheduled-tasks 之间任意切换,宠物都在)。**不含公开路由** —— 落地页 `/`、`/login`、`/[lang]/docs`、`/blog`、`/showcase` 都不挂:根 `layout.tsx` 的约定是**必须保持静态**(不读 cookie、不引聊天专用 CSS),且公开路由另有体积预算;往那里挂等于让登录页和文档页也加载宠物的 JS。**登录页上有一只鸟在晃,产品上也不成立。**

**落点已核实:`SidebarInset`**(`components/ui/sidebar.tsx:312`,className 自带 `relative`)。它包着 `{children}`,于是:

- **定位模型原样不变**(现在也是 `absolute right/top`),只是父级从 `div#chat` 换成内容区;
- 坐标空间天然**排除侧边栏**,宠物不会飘到侧边栏上;
- 它旁边已有**四个同类先例**:`CommandPalette` / `SettingsDialogHost` / `WorkspaceSettingsDeepLink` / `Toaster` —— 都挂在 `WorkspaceContent` 里、与 `SidebarProvider` 平级。

**要改的四件事**:

1. **撤掉第 1 期挂点**:不再挂 `div#chat`(否则会同时存在两只宠物)。
2. **`pet.offset` 语义变更**:从「聊天面板内缩进」变成「内容区内缩进」;默认 `{ right: 12, top: 56 }` 需要重新评估(56 的理由是聊天页 `h-12` 的 header,跨页后这个理由不成立)。
3. **480px 断点必须重推**(§10 那条):现在量的是 `div#chat` 自己挂的 `container-type` 容器宽;换到内容区后盒子变了,而且**拖 sidecar 不再影响它**(现在会)。**新断点数值要实测,不得沿用 480 拍脑袋。**
4. **前置工程:外壳订阅「当前活跃线程」(形态已于 2026-09-12 Task 0 裁决)**。宠物要从消息派生,外壳就得一直持有**当前线程的消息**(理由见 §4.1 重开段)。**已核实的现状**:① `ThreadContext` 是按页面挂的(`messages/context.ts`,由三个 chat 页面各自渲染);② 流的创建点有五处,其中 `sidecar-panel.tsx` 传的是 `sidecar.sidecarThreadId`、`knowledge/chat-panel.tsx` 传的是自己的 kb 线程(`useState(() => uuid())` + `metadata.kb_id`)⇒ **这两处服务的是别的线程,不参与本条**;③ `useThreadStream` 的返回(`hooks.ts:2605`)九项里**只有 `thread`(`messages` + `isLoading`)是宠物需要的**,其余八项(`sendMessage` / `regenerateMessage` / `editAndRegenerateMessage` / `isUploading` / `isHistoryLoading` / `hasMoreHistory` / `loadMoreHistory` / `pendingUsageMessages`)全是页面与 composer 的机器;④ `thread.messages` = 历史查询 + 实时流 + 乐观消息三者合并,其中**历史那半本来就全局**(`useThreadHistory` 是 QueryClient 下的 TanStack Query),只有实时那半是每次挂载各建一份。
   **选定形态(B+,取代本节原先写的「整体上提」)**:外壳持有**一条薄订阅**(只要 `messages` + `isLoading`),目标线程由**各主面挂载时注册** —— 实际是**三个面**:`chats/*`、`agents/*/chats/*`、**`knowledge/chat-panel`(2026-09-12 用户裁决:也跟)**;**原列的第四个面 `agents/new` 已剔除**(实施时核实:新会话页第 399 行直接渲染 `MessageList`、不渲染 `ChatBox` ⇒ 那里**根本没有宠物**,注册它无的放矢;它还把 `threadId: undefined` 硬编码传给 hook)。注册的值 = **`{ threadId, runId: liveRunId, href }`** —— `href` 是**注册方自己算好的回跳路由**(2026-09-12 加,给点鹦鹉跳转用),因为同一个线程在不同面上是不同路由(知识库线程走 `/workspace/knowledge?kb=…`,从 id 反推会落到 chats 路由、那里的 rag agent 没有 kb 绑定;自定义 agent 的线程要走 `/workspace/agents/<name>/chats/…`),只有注册方知道该回哪。三面都用自己的富 hook、不重构。新会话在首条消息前 `threadId` 是 `undefined`,即「还没有线程」时不注册。**外壳一旦拿到 threadId 就自己续订,不随页面卸载而断** —— 这正是「换页后仍在跑 / 仍能说在等你」的来源。页面**不改造成消费外壳**,继续用各自的富 hook。
   **为什么否掉另两条**:**整体上提**(本节原文的形态)—— 三个 chat 页面传的上下文不同(`context.agent_name`,以及新会话页的 `threadId: undefined` + `onStart` 回收新 id),外壳无法用一条 hook 持有它们;硬做就得在外壳建「活跃流注册表」,那已是 B+ 的另一半。**页面快照广播** —— 页面一卸载即失活,说不出「在等你」,**不满足目标**。
   **已知代价**:页面挂载期间同一线程会有**两条订阅**(页面的富 hook + 外壳的薄订阅)。外壳那条**零副作用**(无乐观消息、无 ledger、无 artifact 自动打开),故不产生重复行为,代价只是多一条 SSE。
   **顺带收益**:换页不再断流、回到聊天页时流已就绪(今天靠 `Last-Event-ID` 重接)。

**待核实项(实施前必须先闭环,不许默认)**:① ~~sidecar / knowledge 是否服务别的线程~~ **已闭环(2026-09-12)**:是,两者都用别的线程,不参与。② ~~重复订阅的防法~~ **已裁决(2026-09-12)**:选 B+,接受两条订阅,外壳那条零副作用(见上)。③ ~~新容器下的隐藏断点数值~~ **已闭环(2026-09-12 实测 + 用户裁定)**:容器查询量的确实是**内容区**,边界 482 显示 / 480 隐藏(回程 479/483 对称);且**该阈值在桌面布局永不触发**(桌面最窄内容区 = 768 − 256 = 512),它只是窗口本身窄到 480 以下时的兜底。用户裁定**保留 480 不动**,并接受宠物在 481–767 窄布局里也出现(§10 的布局覆盖裁决已改写)。④ ~~宠物第一次出现在非聊天页(尤其知识库三列布局)时的落位观感~~ **已闭环(2026-09-12 Task 5,真机截图)**:721px 窄布局下,宠物在知识库页落在右下、正好在 kb composer 上方,压不到输入框;智能体/定时任务等页无遮挡;位置随用户 `pet.offset`(实测用户自己拖到了 `right 63 / top 409`,不是默认角)。**桌面三列(≥768)的观感已于 2026-09-18 补到实况**(视口 1056、侧栏展开,截图在案;详见 §15 第 5 条)。⑤ ~~B+ 的载荷性假设~~ **已闭环(2026-09-12 真栈实测,私有免鉴权实例 8099)**:① **传输层**:迟到订阅(迟到 8 / 10 / 32s)拿到的是**从事件 0 的完整回放**(实测 119 / 675 / 864 事件)并收到 **`event: end`** ⇒ 外壳能观测「在跑」与「跑完」。② **「status 说不出在等你」已被实测钉死**:一条以 `ask_clarification` 结束的 run 与普通跑完**完全同形** —— run 都是 `success`、`GET /api/threads/{id}` 的 `status` 都是 `idle`,唯一区分点是消息里的 `artifact.human_input`(`request_id=clarification:call_…`、`input_mode=free_text`、`version=1`)⇒ **wait 只能由消息派生,粗档作废**。③ **并发**:两个订阅者同时挂同一条 run,各拿到 111 事件的完整副本(逐项分布相同、都含 `end`),互不干扰 ⇒ 「两条订阅」的代价就是 2× 事件量。**机制收敛:选 J2**(外壳用客户端级 `runs.joinStream`),不再需要写 SDK 私有 storage key 的 J1。**仍未验**:`gap` 路径没能触发(非法 / 合法但极旧 / 未来 id 三种都完整回放),故 J2 仍要求**在 run 结束或收到 gap 时重取一次 thread state**,不靠回放重建消息。⑥ ~~知识库面板要不要注册~~ **已裁决(2026-09-12,用户):跟**。它有自己 kb 绑定的线程(`useState(() => uuid())` + `metadata.kb_id`);不跟的话,在知识库里聊天时宠物会显示主线程(那条可能一直是 idle),看起来像坏了。跟随的成本只是面板加一行注册(新会话在首条消息前是 `undefined`,即不注册),**不重构它的富 hook**。

## 11. 开关与降级

- **开关**:`core/settings/local.ts:4` 的 `DEFAULT_LOCAL_SETTINGS` 加一节 `pet: { enabled: true }`,形状照抄既有 `notification: { enabled: true }`(`local.ts:5-7`)。`LocalSettingsSetter`(`core/settings/store.ts:14`)是按节 merge 的,**无需迁移**,旧 localStorage 读出时自动补默认节。默认开:这是差异化个性,默认关等于没人看见
- **`prefers-reduced-motion`**:走 Tailwind `motion-reduce:` 变体(`chat-box.tsx` 已有 3 处先例),停在第 0 帧不加 animation。**无条件生效,不受开关影响**
- **资产缺失/加载失败**:`resolveSprite` 返回 null 时不渲染任何节点(不渲染破图,不占位)
- **`manifest.json` 加载方式(裁决):静态 `import`,不运行时 fetch。** 理由:运行时 fetch 会引入 loading 态与失败态两套额外分支,而 manifest 是**代码同期演进的配置**(帧数/fps 改了必须同时改代码里的 state 枚举),不是用户可替换的数据。静态 import 让它进 bundle、类型可校验、无异步窗口。sheet 图片本身仍由浏览器按需加载(第一张 `idle` 随组件挂载请求,其余靠 `<link rel="prefetch">` 或首次切到该状态时请求)。若将来要支持用户自带宠物包,再改成 fetch —— 那是 §17 里已推迟的「宠物插件系统」,不是第 1 期
- **跨线程重置语义(裁决)**:切换 thread 时 `fatigue` 归零、`wasLoading` 归零、`greet` **不重放**。理由:fatigue 是「本轮 run 有多累」,跨线程延续会把上一个会话的疲劳带到新会话;`greet` 是「宠物第一次出现」的欢迎,每次切线程都放会变成噪音。实现上以 `threadId` 作为 `agent-pet.tsx` 内 ref 的重置键(仓库已有同类做法:composer draft 按会话作用域存储,`core/threads/composer-draft.ts`)

## 12. 性能约束

`collectFatigueInput(messages)` 与 `collectActiveToolNames(messages)`(§6.1)都是对 `thread.messages` 的单遍扫描,二者都必须 **memo 在 `messages.length` 上**,不得每帧重算。依据是既有流式语义:`useStream` 开 `throttle: true`(`core/threads/hooks.ts:1662`,同一宏任务的更新合并),而 `messages-tuple` 的 AI 文本 delta 是**按 id 合并进已有消息**的 —— 故 token 流不改变 `messages.length`,只有新 AI 消息或新 ToolMessage 到达才改变。memo 键天然对齐「结构性变化」,token 级重渲染零成本。

**不得把 `throttle: true` 改成数值延迟** —— `frontend/AGENTS.md` 明确禁止(需先验证 SDK 的 trailing-debounce 行为)。

`hasOpenHumanInputRequest` 的 memo 键同样为 `[thread.messages]`,与 `page.tsx:262-269` 一致。

资产:sprite sheet 是 `public/` 下静态图,不计入 `pnpm perf:check` 的预算(该命令度量唯一 JS 与 CSS 文件)。仍建议 WebP + 懒加载(仅开关打开时请求)。

## 13. 文件清单与测试(TDD)

### 13.1 新增/改动

```
frontend/src/core/pet/state.ts        derivePetState + 全部类型
frontend/src/core/pet/tools.ts        collectActiveToolNames + classifyTool + pickWorkKind
frontend/src/core/pet/fatigue.ts      collectFatigueInput(读 deerflow_tool_meta) + computeFatigueLevel
frontend/src/core/pet/sprite.ts       resolveSprite + effectiveFps
frontend/src/core/pet/placement.ts    clampOffset(自由放置 clamp 纯函数,§10.1)
frontend/src/components/workspace/pet/pet-sprite.tsx    渲染器,不知道 agent 存在
frontend/src/components/workspace/pet/agent-pet.tsx     订阅者,读 context 组合上两者
frontend/src/core/settings/local.ts                     加 pet 节(改)
frontend/src/components/workspace/chats/chat-box.tsx    挂载一行(改,仅桌面分支)
frontend/public/pet/parrot/                             manifest.json(静态 import) + sheets
```

`core/pet/` 放 `core/` 而非 `components/` 的理由很具体:按 `frontend/AGENTS.md` 测试约定,`*.test.ts` 跑 node 环境,`*.dom.test.tsx` 跑 happy-dom,后者贵约 3 倍。状态机是 case 最多的部分,必须能在 node 环境测。

**无障碍裁决(2026-09-10,用户确认)**:宠物外壳(含精灵与拖拽命中矩形)一律 `aria-hidden="true"`,不写 `alt`、不用 `role="status"`。理由:鹦鹉陈述的每条状态在消息流里都已有可读载体(run 状态、clarification 卡片都是真实 DOM 内容),装饰复述对读屏是纯噪音;且本设计状态变化频率高(每次工具调用都可能切态),`role="status"` 的自动播报会变成轰炸。对照:Qoder 把 phase 写进窗口 aria-label,因为它是 app 全局唯一陪伴入口且状态变化稀 —— 我们正好相反,不借。

### 13.2 测试

| 文件 | 环境 | 覆盖 |
|---|---|---|
| `tests/unit/core/pet/state.test.ts` | node | 决策树全分支 + 下降沿 + §5.3 三条不变量逐条 |
| `tests/unit/core/pet/tools.test.ts` | node | ① `collectActiveToolNames`:多工具并行、**ToolMessage 内容为空仍算已答**(钉住 §15 开放项 1 那个坑)、孤儿 ToolMessage、无 AI 前置;② 6 类映射 + **未知 MCP 名落 `generic`**;③ `pickWorkKind` 优先级表逐对 + 空数组返回 null |
| `tests/unit/core/pet/fatigue.test.ts` | node | 五子分各自封顶 + max 语义 + `collectFatigueInput` 从 `additional_kwargs.deerflow_tool_meta` 正确分出 `toolErrorCount` 与 `unrecoverableErrorCount`(含 meta 缺失时两者都为 0) |
| `tests/unit/core/pet/sprite.test.ts` | node | 两级回落 + fallback + 一次性不衰减 fps + **manifest 自洽:逐态 `sheetWidth === frames × frameWidth`、`sheetHeight === frameHeight`**(§8 自校验) |
| `tests/unit/core/pet/placement.test.ts` | node | clampOffset:窄面板/resize 不把盒子推出可见区;默认 offset 即 right-3 top-14 |
| `tests/unit/components/workspace/pet/pet-sprite.dom.test.tsx` | happy-dom | **只测三件**(2026-09-10 按组件归属重新切分):① `motion-reduce` 出静态帧(同一条里带「允许动效时确有 `steps(N, jump-none)`」的正向对照,否则「无 animation」在组件压根不动画时也会通过);② one-shot 播完回 base;③ 解析不到 sprite 时不渲染任何节点(资产缺失降级)。精灵根节点带 `aria-hidden="true"`,其断言随外壳 |
| `tests/unit/components/workspace/pet/agent-pet.dom.test.tsx` | happy-dom | **订阅者两条**:开关关掉时不渲染任何节点;Alt+拖拽更新 offset 并持久化、未按 Alt 不起拖(§10.1) |

DOM 测试压到最小是刻意的:渲染器逻辑已全被 `sprite.ts` 在 node 环境吃掉。不写 e2e。

### 13.3 浏览器阶梯的驱动要点(2026-09-13 实测三条,验状态切换必读)

在本应用里用**自动化浏览器**验宠物状态时,踩到三条与产品无关、但会让你**验不出来**的坑。三条都不是猜测,是那晚连着两次失败之后定位出来的:

1. **自动化浏览器里的页面是「不可见」的** —— `document.hidden === true`、无焦点、连 `document.getAnimations()` 的 `currentTime` 都冻在 0。后果:**Chrome 推迟解码** ⇒ `Image.decode()` 既不 resolve 也不 reject ⇒ 在 §9.1 的宽限期补上之前,**精灵根本换不动**,于是任何状态切换都观测成「一直是首帧那张」。⇒ 在这类浏览器里验切换,先确认页面不是 hidden;如果换不了图,先怀疑解码门而不是状态派生。
2. **合成输入要留一拍** —— 「用原生 setter 写 `textarea` 值 + 派发 `input` 事件」与「点提交按钮」**不能放在同一个同步块**里:React 还没消化那个 `input`,按钮点的是旧状态,消息发不出去而且**没有任何报错**(表现为「桩一次没被调用、页面毫无变化」)。中间插 ~400ms 即可。
3. **有未答卡片时,提交入口是卡片自己的「提交」按钮** —— composer 的 `button[aria-label="Submit"]` 在这个状态下点了没反应(卡片打开时 composer 入口保持可用,但走的是卡片那条路 —— 该协议在 `frontend/AGENTS.md` 的 human-input card 一节)。要驱动一次新 run,先点卡片上的「提交」。

**另外一条纪律**(与上两条同源):在这类页面里做模拟补丁(覆写 `fetch` 等)**必须带自己的开关** —— 只靠删一个标记是解除不了的,因为包装函数仍在原处;没有开关就只能靠刷新页面带走。第一次(甲)带了开关、第二次漏了,实测才发现。

## 14. 向后兼容与影响面

- **第 1-3 期零后端改动**,无 schema/迁移/契约文件变更,`contracts/` 不动(第 4 期候选例外,见 §18)
- **零新依赖**,`package.json` 不变
- `chat-box.tsx` 只加一个兄弟节点,不改既有 `ResizablePanelGroup` 逻辑(该处有三条已记录的约束,见 `frontend/AGENTS.md` Interaction Ownership 末条,不得触碰)
- `core/settings/local.ts` 加节是按节 merge,旧 localStorage 自动补默认,无需迁移
- 关掉开关后 DOM 中不留节点,与既有 `notification.enabled` 行为一致
- 需按仓库策略同步 `frontend/AGENTS.md`(新增 `core/pet/` 域与宠物挂载所有权)

## 15. 风险与开放项

1. **~~`findToolCallResult` 不能用于「在飞」判定~~ — 已闭环(2026-09-09)。** `core/messages/utils.ts:706` 在 ToolMessage 存在但内容为空时同样返回 `undefined`,于是「已完成的空结果」会被误读成「仍在飞」。修复已写进 §6.1 的 `collectActiveToolNames`(自建 `answered` Set,只看 `type === "tool" && tool_call_id`),并要求 `tools.test.ts` 专门钉这个 case。
2. ~~疲劳度阈值全是猜的,上线后需拿真实 run 校准。~~ **已随「不做疲劳轴」关闭(2026-09-12 用户决定,见 §17)。** 阈值不再需要校准,因为该轴不进任何一期、闸门恒 `false`。`maxConsecutiveSameTool` 的语义偏差保留为记录(§7)。
3. **挂载位置盖住 message list 右上角**(§10 已接受)。若实测压到代码块操作,回退候选按序:① 缩到 64px ② 移到 header 右侧当小元素(牺牲存在感) ③ 给 message list 加右侧 padding 让位(改动面最大,需评估对既有滚动/布局的影响)。
4. **~~`getMessageGroups` 的 `isCurrentTurnLoading` 必须传对~~ — 已失效(2026-09-09)。** §6.1 裁决后本设计**完全不调用 `getMessageGroups`**,该风险自动消失。保留此条仅作记录:该选项(`core/messages/utils.ts:38`)只影响 `currentTurnStartIndex`(`:46-54`)进而影响 `isUnresolvedAssistantText`(`:148-152`),作用面比原描述更窄。
5. **~~多面一致性未验证~~ — 已闭环(2026-09-18,三个面分别实测)。** 原文担心 sidecar 面板(`sidecar-panel.tsx:185`)与知识库聊天(`knowledge/chat-panel.tsx:163`)的 `MessageList` 实例与主聊天页不同,宠物在这些面的观感会不一致。**该前提已随 2a 的挂载点迁移失效**:宠物挂在外壳 `SidebarInset`、不在任何 `MessageList` 里,三个注册面只决定「外壳该盯哪条线程」,不再各自承载一个挂载点。实测(视口 **1056×608**、侧栏展开 ⇒ 内容区 800):
   - **① 知识库聊天面**:URL 直开 `/workspace/knowledge`,宠物**在**、`display: block`、**158×158 @ (853, 289)**。
   - **② sidecar 面**:在聊天页经「选中消息文本 → 在侧边聊天中提问」打开面板(320 宽 @ x736–1056),宠物仍是 **158×158 @ (853, 289)** —— **开合面板不改变它的位置**;与面板框几何重叠 100%,但宠物是 `absolute z-20`、面板是 `static z-auto` ⇒ **宠物画在面板之上**(截图确认):不被盖住、不被裁,且落在面板输入框上方、不压引用 chip。它压在 sidecar 的**消息区**上属 §10 已接受的代价。
   - **③ 与主聊天页的一致性**:①② 的位置与聊天页**逐像素相同**(同一视口/侧栏状态下),即「同一个挂载点、同一套定位(相对**内容区**,`right:45` ⇒ 1056−45=1011=宠物右缘)」。
   - **顺带**:这两次观测都在**桌面宽 1056**,故「桌面三列观感」在该场景下已有实况可看(截图在案,好不好仍归用户判);**341–512 的软化程度已于 2026-09-18 由用户判定可接受** ⇒ 宠物线至此无「待眼睛」项(480 断点已按收口处理:该阈值在桌面布局永不触发,见 §18 的 2a 交付状态)。
6. **`elapsedMs` 的起点**无既有权威字段(run 时长是 run-scoped UI 元数据,`core/messages/run-duration.ts` 折叠的是历史消息上的兼容字段)。第一版用组件内记录的「首次观察到 `isLoading === true`」时刻,不追求与后端 wall-clock 一致。
7. **`goal.last_evaluation.blocker` 的 `needs_user_input` 比 `hasOpenHumanInputRequest` 宽,但有滞留风险,故第 1 期不接。** `last_evaluation` 是**持久化**字段(`core/threads/types.ts:14-27`,带 `evaluated_at` / `run_id`),run 结束后仍留在 `thread.values.goal` 上。若直接拿它触发 `wait`,一次陈旧的评估会把鹦鹉**永久钉在 `wait`**。要接就必须加新鲜度门槛(如比对 `evaluated_at` 与本轮 run,或只在 `continuation_count` 变化后的一窗内采信),而这个门槛的正确形状需要真实 run 观察后再定。**列为第 2 期候选,不进第 1 期**;第 1 期的 `wait` 只认 `hasOpenHumanInputRequest`。
8. **~~`deerflow_tool_meta` 是否真的抵达前端~~ — 已闭环(2026-09-10,Task 0 Step 1)。结论:抵达,§7 的 `byErrors` / `byUnrecoverable` 两路全部保留。** 没有走原计划的「浏览器里打印 `additional_kwargs`」那条路,因为下面四条腿合起来比单次观察更强(覆盖了持久化、两条出线、客户端类型四层,而单次浏览器打印只覆盖其中一条出线的活体样本):
   - **① 本机真实 run 的持久化证据**:`backend/.deer-flow/data/deerflow.db` 的 `writes` 表 121 行含该 key,用 `JsonPlusSerializer` 解码出 **138 条带 stamp 的 ToolMessage**;meta 键形状 **138/138 一致**为 `status` / `error_type` / `recoverable_by_model` / `recommended_next_action` / `source`,与后端 dataclass(`tool_result_meta.py:34-40`)逐字对齐。其中 5 条 `status: "error"`(两条 `read_file` 是「该 agent 工具集里没有这个工具」→ `error_type: unknown`;一条 `image_search` 返回 `{"error": "No images found"}` → `no_results`)。命中的工具面也说明了 stamp 的覆盖面:`hybrid_search` 59 / `wiki_search` 42 / `graph_search` 24 / `read_file` 6 / `image_search` 2 / `write_file` 2 / `bash` 1 / `list_uploaded_files` 1。
   - **② 实时 SSE 出线路径**:把库里那条真实 error ToolMessage 喂进 `serialize_messages_tuple`(`runtime/serialization.py:124`,即 `messages-tuple` 模式的序列化器),输出 dict 的 `additional_kwargs` **原样带出完整 meta**。
   - **③ 历史/REST 出线路径**:同一条消息喂进 `serialize_channel_values_for_api` 同样原样带出。这一条是本机的主路径而非备胎 —— `run_events.backend: memory`(`config.yaml:246`),`run_events` 表 0 行,前端刷新后的消息回灌走的正是 `threads.py:1378` 的 `serialize_channel_values_for_api({"messages": messages})`(checkpoint 播种)。
   - **④ 客户端类型层**:SDK 的 `ToolMessage = BaseMessage & {...}`,而 `BaseMessage.additional_kwargs?: Record<string, unknown>`(`@langchain/langgraph-sdk/dist/types.messages.d.ts:20-26`、`:103`)是**开放记录**,不是闭合形状;前端已在生产读同一 dict 的兄弟键(`utils.ts:719` 的 `.hide_from_ui`、`derived-state.ts:49` 的 `.turn_duration`)。
   - **顺带一条真实分布发现(直接影响 §7 阈值校准)**:138 条样本里 `recoverable_by_model` **全为 `true`,零条 `false`**;`source` 只出现 `content_analysis`(133)与 `tool_return`(5),**没有 `exception`**。即 `byUnrecoverable` 这一路在本机全部历史里从未触发过,它目前只有代码级证据(`_ERROR_RULES` 把 auth / rate_limited / transient / config / internal 判为 `False`,`tool_result_meta.py:43-76`)。两个后果:Task 2 的该子分**只能靠合成 fixture 覆盖**(计划本来就这么写,不是妥协);读 §7 阈值时不要把 `byUnrecoverable` 的触发频率想象成与 `byErrors` 同量级 —— 后者实测 5/138 ≈ 3.6%,前者实测 0/138。
   - 「**不得改为从文本猜错误**」这条约束(违背 §4.4(a))原样保留,且现在有了正面理由:结构化字段确实到得了前端,没有任何退回猜文本的借口。
9. ~~**移动端挂载点不存在,已裁决第 1 期桌面 only。**~~ **该裁决已作废(2026-09-12,§10 的「布局覆盖裁决」改写),本条按收口处理(2026-09-18 用户裁定「收了」)。** 原文依据是「`chat-box.tsx:349-353` 的 mobile 分支没有 `id="chat"`、第 1 期只在桌面分支挂载」——**这条依据随 2a 的挂载点迁移自动失效**:宠物改挂 workspace 外壳(`SidebarInset`),**所有布局都会出现**,唯一的闸是 `@container (max-width: 480px)`。用户 2026-09-12 另裁定**保留窄布局(481–767)可见**(依据:内容区 512–600 实测不挤,且宠物本身可缩放、打包成桌面软件后还能脱离窗口)。详见 §10。
10. **`getMessageGroups` 的三类互斥拆分是 §6.1 存在的唯一原因**(2026-09-09 通读发现,原设计据此写的「取最后一个 processing group」是错的):`present_files`(`:158`)> `task`(`:164`)> processing(`:170`)。若将来有人把 §6.1 改回走 groups,`delegate` 与 `write` 两个 workKind 会静默失效 —— 不报错,只是永远不出现。`tools.test.ts` 必须有一个 case 直接用含 `task` 的 fixture 断言 `delegate` 能出来。

## 16. 否决备选

| 备选 | 否决理由 |
|---|---|
| 订阅 `onStreamCustomEvent` 拿 `llm_retry` / `safety_termination` | 要动 5 个调用点,换两个罕见瞬态;`llm_retry` 已有 toast(§4.3) |
| 轮询 `GET /runs/{rid}/events` 拿 `middleware:{tag}` | 装饰元素不值这个延迟与请求量(§2.3) |
| 扁平情绪枚举(AIRI 形状) | 帧动画按循环/一次性两种交付物组织,扁平枚举会逼出写死的 timer(§4.2) |
| 模型生成情绪(AIRI 的 `<\|...\|>` 标记链路) | 要改 lead agent 输出格式,并在 `hooks.ts:472-1163` 那段最脆弱的流式合并逻辑里剥标记;漏一个标记就是用户可见乱码 |
| 旁路 LLM 调用判情绪 | 延迟 + token 成本 + 一个会错的解释层;死映射的好处正是不会错 |
| PixiJS 渲染 | tachie 用它是为透明 canvas + 缩放/阴影/截图/主题色提取,本设计无这些需求;横向等高 sheet 用 `background-position` + `steps()` 即可(§9.1) |
| 直接复用 AIRI 代码 | Vue 3 + Pinia + PixiJS + UnoCSS,与本项目 React 19 + Next.js 16 + Tailwind 4 零兼容;可借的只有契约形状(§2.5) |
| 把 `work` 子类别做成 6 个 base | 决策树会从 5 分支膨胀到 10 分支,且强制 6 组帧;做成 `workKind` 后可全不画(§5.1) |
| **给鹦鹉一个「简化版 harness agent」** | 代价是结构性的而非代码量:`uq_runs_thread_active` 冲突或侧边栏出现鹦鹉会话、线程目录 + 沙箱获取、`MemoryMiddleware` 记忆污染、每反应一次 LLM 调用、双声音争信任。且 AIRI 的 spark-notify 证明连「有自主性的伙伴」都只用一回合无状态调用(§4.4(b)、§2.5.1) |
| 引入 AIRI 的 agent 层(`core-agent` / `spark-notify` / `memory-pgvector`) | 逐包对照 DeerFlow 全部已有等价物,引入等于建第二套 harness 抢回复权(§2.5、§4.4(c));`memory-pgvector` 本身在 main 上还是空壳 |
| 让 LLM 判断「要不要开口」 | AIRI 用 `builtIn_sparkNoResponse` 工具把时机交给模型;本设计反过来 —— 死映射定时机、`oneshot_llm` 只定措辞,时机确定且可测试(§4.4(d) 第 2 条) |
| 从 `getMessageGroups` 输出派生在飞工具 | 三类互斥拆分(`present_files` > `task` > processing)会让 `delegate` / `write` 两个 workKind 静默失效;且一个 group 会累积多条 AI 消息、孤儿 ToolMessage 还会开出不含 AI 消息的 group(§6.1、§15 开放项 10) |
| 从 ToolMessage 文本猜「出错了」 | 后端已把结构化 `deerflow_tool_meta` 盖在 `additional_kwargs`,其模块 docstring 明写「read this key **instead of parsing text**」;猜文本同时违背 §4.4(a)(§7) |
| 移动端也挂载 | mobile 分支无 `id="chat"`,且 480px 容器断点本就会挡掉窄面板;多一处需同步维护的分支换不到可见收益(§10) |

## 17. 非目标与路线图(YAGNI)

明确推迟。除标注为第 4 期候选的一项外,不在本 spec 任何一期内:

| 项 | 推迟理由 | 何时重估 |
|---|---|---|
| `alert` 一次性动画(重试/安全终止) | 需走 §4.3 否决的订阅路径 | 第 3 期,且需先证明有人 care |
| per-agent 皮肤 | 自定义 agent 已有 `SOUL.md` 与 `BotIcon` 作身份表达,宠物再分叉会稀释 | 多 agent 用户实际提出 |
| 宠物插件系统 / 第三方宠物包 | 一只鹦鹉不需要扩展点 | 出现第二个宠物需求 |
| 声音(叫一声) | 前端零 TTS/音频输出基建,且工作环境出声是负价值 | 不重估 |
| 点击交互(摸头) | 自由放置已用 Alt+拖拽 + window 级矩形命中解决(§10.1),鹦鹉全程 `pointer-events-none`;摸头要求**闲置时**的指针交互,仍会与点击穿透冲突 | 放置上线后,有证据表明有人 care |
| 拖拽态(方向感知,「被拖着跑」) | Qoder 拖拽时播 `running-left/right`;我们第 1 期拖拽中保持当前态(§10.1 裁决)。新增需一条方向性视频 + 状态机新输入 + manifest 两行 | 有人真的拖着玩并提出 |
| **跨页挂载(挂到 workspace 外壳,离开聊天页也存活)** | **已交付(2026-09-12,Task 2;真机验收 Task 5)**。两条裁决按要求重开:① §4.1 语义裁定为 **app 的灯**(只解除挂载范围,观察者立场不变);② §10 断点挂 `SidebarInset` 后**已重推并实测**(内容区边界 482/480,用户裁定保留 480)。前置工程已落地 = 外壳薄订阅 + 三个主面注册(§10.3);只读 `status` 的粗档说不出「在等你」,已由真栈实测钉死(§10.3 待核实项 ⑤)。**真机**:SPA 换页后宠物仍在且**外壳不重挂**,硬刷新后仍能说出 `wait` | **第 2 期 2a(已交付)** |
| **点鹦鹉跳转该线程(只读)** | **已交付(2026-09-12,Task 4)** —— 定案见下。宠物代表**一个**线程(§10.3 的壳订阅),点它 = **直接跳回那一个**,不需要任何选择器 ⇒ **零写路径,不违反 §4.1**。**手势 = Alt+单击**,它不是新手势:复用同一套 window 级命中矩形 + `pointerdown`,**已有的 4px 阈值**把两者分开:Alt + 位移 **≥4px = 拖拽**(§10.1),Alt + 位移 **<4px = 单击(跳转)**,两种分支都吞掉紧随的 click。宠物全程 `pointer-events-none`。**纯单击被否决**:那要求 idle 时给宠物指针事件,会**静默吞掉**底下消息列表的点击(§10.1)。**跳转规则**:目标线程**不在当前页时才跳**,否则无操作;**同页判定比路径不比整个 URL** —— 知识库页打开线程后会 `router.replace` 把 `thread` 参数抹掉(只剩 `?kb=`),比 URL 会误判成「不在本页」而把用户推走。**路由只能由注册方给**:同一线程在不同面上是不同路由,外壳从 `threadId` 反推会把知识库线程推成 chats 路由(那里的 rag agent 无 kb 绑定、检索永不触发)⇒ 注册载荷加 `href`(§10.3)。发现性由设置行提示文案承担(与 §10.1 同款,已加一句)。**多会话版**(卡 = 选择器)属另一条线,见本表「浮动会话卡」行 | **第 2 期 2a(已交付)** |
| **浮动会话卡(显示当前对话片段 + 回复 + 停止)** | **不在本 spec 任何一期**。它是第二个会话写入口(回复 = 第二个 composer 写同一线程),与 §4.1 观察者裁决正面冲突,应自立一条线「浮动会话卡 / 全局会话监视」,自己裁:多 run 时显示哪个会话、写路径一致性、与 workbench 线的边界。本线只借它一个 UI 事实:卡可锚在宠物盒上(复用 §10.1 的 offset/clamp 基建)。**地基将于第 2 期 2a 就位** —— app 灯(§10.3)的跨线程数据源与挂点正是它需要的东西;它本身仍不在本 spec | 新线立项时(本 spec 不重估) |
| 跨线程持久状态(宠物会记得你) | 一旦有记忆就成了第 2 档(参与),与 §4.1 观察者裁决和 §4.4 裁决四冲突 | 不重估 |
| 鹦鹉拥有 agent / 线程 / 回合 | §4.4 裁决四:五条结构性代价,且 AIRI 自身也未这么做 | 不重估 |
| 对内容的语义反应(为难过的问题难过) | 需语义理解;两个入口(改 lead agent 输出格式、旁路 LLM 判情绪)都被 §16 否决。**但语义不必自造** —— §4.4(a) 的三处既有类型化字段是允许的来源 | 借用既有字段:第 2 期(见 §15 开放项 7);自造语义:不重估 |
| **生成式评论(鹦鹉开口说一句)** | 唯一被列为候选的 LLM 项。必须走 `oneshot_llm` + §4.4(d) 三道锁,且慢节奏(如一轮 run 结束一次),**永不走 harness** | **第 4 期候选**,前置条件是第 1-3 期已上线且证明有人 care |
| **宠物缩放**(显示尺寸 64–512 CSS px 用户可控) | **已定案(§10.2)**:滑杆、恒偶数取整、**松手才应用**(否则重排会抖帧)。范围上界 **512 = 帧像素数**(2026-09-12 由 256 → 340 → 512 两次放宽);**不插值的临界点是 `512 ÷ DPR`**(本机 DPR 1.5 ⇒ 340,以上到 512 是 1.5×)。旧的「清晰上限 ~156」**已证伪并更正**(§8/§10.2 有证据)。渲染器只改盒子与 `background-size` 比例,无状态逻辑改动、无新资产档 | **第 2 期 2a(零美术)** |
| **疲劳度轴**(`core/pet/fatigue.ts`,第 1 期已写好但不生效) | **用户 2026-09-12 明确不做**。三条理由:① 与「工具类别」轴相比**信息重复且更弱** —— 消息流在滚、Todo 在动、还有 token 用量与 run 时长,慢下来不提供新信息;② **含义本身歧义**:「慢」可以读成「累」,也可以读成「悠闲」,符号方向不是自明的;③ 1 档只降 10%(8 → 7.2fps),很可能**低于感知阈值**,真正可感知的只有 2/3 档,而那恰恰是人已经注意到的时候。**代码保留**(已写并有 36 例测试)、闸门 `FATIGUE_ENABLED` **恒 `false`**;§15 开放项 2 的「阈值校准」随之关闭 | **不重估**(除非有人提出「阶段性节奏」本身是需求) |
| 后端新增宠物专用事件 | 违反 §1 目标 3 | 不重估 |

## 18. 分期

| 期 | 内容 | 帧需求 | 代码改动 |
|---|---|---|---|
| **1** | 五个纯函数(`state` / `tools` / `fatigue` / `sprite` / `placement`)+ 两个组件 + 挂载 + 设置节(含 `offset`)+ 自由放置(Alt+拖拽,§10.1)。`classifyTool` 全部返回 `generic`,`fatigue` 恒为 0(两条轴写好但不生效) | **`idle` + `wait` 两组** | 全部 |
| **2a(零美术,功能)** | 跨页挂载 = app 的灯(§10.3):外壳薄订阅 + 四个主面注册(须带 runId)+ 挂点迁到 `SidebarInset` + 断点重推 + `offset` 语义重估;宠物缩放控件(§10.2) | **0** | 前端架构(外壳订阅与注册)+ 设置节 + 控件 |
| **2b(美术增量,可与 2a 并行)** | 补 `think` `work` `error` `done` `greet` 五组帧;帧到位后打开 `WORK_KIND_ENABLED`(它才开始区分「在想」与「在干活」—— 没有 `think`/`work` 帧时翻它无效) | +5 组 | 只改 `agent-pet.tsx` 的一个常量开关 |
| **3** | 打开 `workKind` 分类,按在乎的顺序逐个补子类别帧 | 每子类别 +1 组,**可选** | 零(回落契约已保证) |
| **4(候选,有前置门槛)** | 生成式评论:慢节奏 `oneshot_llm` 一次,遵守 §4.4(d) 三道锁;可同批接 §15 开放项 7 的 goal blocker(需先定新鲜度门槛) | 可能 +1 组「说话」帧 | **唯一需要动后端的一期**(一个新路由,复用 `run_oneshot_llm`) |

**第 2 期拆成 2a / 2b 的理由(2026-09-11 用户要求)**:美术生成周期很长,必须与功能解耦、并行推进。**2a 全零美术**(跨页挂载 + 缩放控件),只动前端架构与设置;**2b 是纯美术增量 + 翻常量开关**。两者无相互依赖 —— 另开一个美术会话出那 5 组帧,不影响 2a 推进。

第 4 期的前置门槛有两条,缺一不可:① 第 1-3 期已上线且有证据表明有人 care;② **显式重开并重写 §4.1 裁决一**(见该节末段)—— 文字评论会让鹦鹉从纯观察者变成次要输出面,这与裁决一直接冲突,不得静默实现。未过门槛不启动:它是本 spec 里唯一会产生 LLM 成本、唯一需要后端改动、也是唯一动摇既有裁决的一期。

第 1 期就把四个纯函数**全部**写出来并测完,但让两条轴的输出不生效 —— 因为 §8 规则 1 与 §9.2 的两级回落保证了没有帧也能正确塌回 `idle`。这样第 2、3 期是纯美术增量加一个常量开关,不再碰逻辑也不再碰测试。

第 1 期的交付判断只有一条:**「在等你」和「跑完了」视觉上分得开**。这一条就值回整个功能。

**第 1 期交付状态(2026-09-11 更新)**:代码**已全部交付并挂载**(提交区间 `7073c703` → `2096746d`,`frontend/AGENTS.md` 的 `core/pet/` 域与 Interaction Ownership 已同步;另有 `8e9ef2a5` 修掉 `perf:check` 在 Windows 上的裸名 spawn 缺陷)。上述交付判断**已在真实应用内验证**:触发 `ask_clarification` 时精灵切到琥珀 `WAIT`,而 run 跑完回落成蓝 `IDLE`,两者视觉可分;§10.1 的自由放置六项(Alt+拖拽持久化、越界 clamp、不按 Alt 不起拖、<4px 阈值、拖后吞 click、拖拽不进状态机)与窄面板隐藏(含拖回后宠物自动回来)亦全部实测通过。(那次阶梯跑在**占位帧**上;真图接入后状态机零改动,但整条阶梯没有重跑 —— 2026-09-11 用户实测确认的是「切状态不再空一拍」这一项。)**三组美术已接入真图,不再是占位**:`idle` 31 帧 / 15872×512、`think` 31 帧 / 15872×512(起点 9,让收尾落在接缝与两侧普通步同级处)、`wait` 30 帧 / 15360×512,均来自用户的 1440² 母版(水印已 `--mask` 掉);`displaySize` 按帧内鸟占比补偿为 **158**(§8)。接入流程已固定为:`measure` 体检 → `sheet` 一步流(或 `frames`+外部抠像+`pack`)→ 换掉对应 `.webp` 并把 manifest 的 `frames` 与 `sheetWidth` **一起**改(§8 自洽断言会拦只改一个的失误);新增状态若沿用同一画布与声明框则无需再动 `displaySize`。关联提交:真美术与渲染 `277f1039`(idle)/ `6ec34574`(wait + 解码门)/ `think` 那笔,工具链 `4283d13f` / `f1b60d40`。**下一步是第 2 期剩下的 4 组帧**(work / error / done / greet),代码侧只需翻 `agent-pet.tsx` 的两个常量；`think` 已接入后,「在推理、无工具在飞」那一态不再回落显示 `idle`。

**该前瞻已过时(2026-09-18 标注)**:五组帧全部落地 —— 见下「第 2 期 2b 交付状态」。

**第 2 期 2a 交付状态(2026-09-12 更新;Task 0–6 全交付;当时那 1 项未验已于 2026-09-18 收口)**:**跨页挂载 = app 的灯 + 缩放控件 + 单目标 Alt+单击跳转三项都已上线**。提交:`0b93d601`/`2ae7e3ef`/`1da98539`(spec 重开 + plan + Task 0 结论)、`0156a64c`/`0f0cdf8d`(Task 1 外壳薄订阅 + 三面注册)、`363e433d`/`89f59dd5`(Task 2 挂点迁 `SidebarInset`)、`3dee42f6`/`c23f7112`(Task 3 缩放滑杆)、`719134c8`/`c144b808`/`9f82ddca`/`20ae0221`/`9be8e29f`/`a9e19d31`(上界 256→340→512 与 156 证伪更正)、`21285a67`(修 Task 1 留下的 knowledge 套件 27 红)、`1a02aaa2`/`51b309cb`(Task 4 跳转)、`2588d826`/`160af097`(Task 5 阶梯 + 它抓到的 state 信封缺陷)。**真机验收(用户自己的栈,内置浏览器)**:存在性六页对、公开路由四页无;真澄清 run ⇒ 跑着 `think` / 跑完 `wait` ⇒ SPA 换页仍 `wait` 且外壳不重挂 ⇒ 硬刷新仍 `wait`(该次只打 `GET …/state`);缩放拖动中不落盘、松手才生效、`End`/`Home` 两端、刷新持久、放大后 clamp 不写回;跳转/同页无操作/穿透/拖拽四分支与吞 click 全过。**该项已于 2026-09-18 收口**(用户裁定「收了」):480 断点的本轮复测**不再进行** —— 驱动端改不了窗口宽度(`window.resizeTo` 无效:实测 `outerWidth` 变、`innerWidth` 不变),而它要的是**窗口本身**窄到内容区 ≤480;且 §10 已确认该阈值**在桌面布局永不触发**(桌面最窄内容区 = 768 − 256 = 512 > 480),故沿用 Task 2 的实测(内容区 482 显示 / 480 隐藏,回程 479/483 对称)并保留用户 2026-09-12 的裁定即可。同一批观测里「桌面三列观感」已取到实况(视口 1056、侧栏展开,截图在案,见 §15 第 5 条);**341–512 的软化程度也于同日由用户判定可接受(2026-09-18),2a 至此无未验项**。**2b 只剩 3 组帧**(work / error / done / greet 中 `think` 已接入)**——该计数已过时,见下段「第 2 期 2b 交付状态」。**

**第 2 期 2b 交付状态(2026-09-18 更新;七态全部落地)**:`done` 与 `greet` 两组真美术已接入,manifest 现在声明 **7 态** —— `idle` / `think` / `work` / `error` / `done` 各 31 帧、`wait` / `greet` 各 30 帧;两个一次性态(`greet` / `done`)写 `loop: false`,§8 那条「声明的 sheet 必须存在」守卫(`599e829d`)随之覆盖 7 态。提交:`f1e92de0`(think)、`9824fb8d` + `5b9041fe`(work + `pack --config` 拼图时抠像)、`ff8d78d4` + `27e041ef`(error + `hasError` 扩到 run 终态)、`70b21b40`(done + 可重复 `--mask`)、`1cd5a2b1`(greet + 多窗口拼接写成 §8.1 规则 4 的允许例外)。`WORK_KIND_ENABLED` 已于 2026-09-13 翻 `true`(「在推理」与「有工具在飞」不再共用一张图);`FATIGUE_ENABLED` 保持 `false`(疲劳轴 2026-09-12 用户裁定不做,§17)。**两个一次性态的真帧链路已在真栈跑过(2026-09-18)**:冷加载 ⇒ `greet.webp`(`3.75s steps(30, jump-none) 1 both`),派发 `animationend` ⇒ 回 `idle.webp`(`3.875s steps(31) infinite`),同一 DOM 节点;`GET /pet/parrot/greet.webp` ⇒ 200 / 472264 B(与入库字节数一致)。**「跨路由不重放」也取得了活体证据**:经命令面板「新对话」触发一次真 SPA 换页(正文从会话页换成欢迎页)后,宠物**仍是同一个 DOM 节点**(探针标记未丢)、精灵全程 `idle`。**plan Task 7 Step 3(error 态)同批闭环**:桩住 `GET /threads/{tid}/runs/{rid}` 回 `status:"error"` ⇒ 正常收尾的 run 让精灵落到 `error.webp`,而该 run 的下降沿本会点亮 `done`(manifest 里 `done.webp` 确实存在)⇒ §5.3 不变量 1(「error 压掉 done」)取得活体证据。**未验项已于同日收口(见上段 §2a 交付状态)**:480 断点的本轮复测不再进行(该阈值在桌面布局永不触发)、「桌面三列观感」已在 1056 宽那次连同截图取到;**341–512 的软化程度已于同日由用户判定可接受**(另「多面一致性」见 §15 第 5 条,亦已闭环)⇒ 2b 亦无未验项。

### 18.1 代码量估计(第 1 期)

纯函数约 120 行、组件约 110 行、测试约 200 行、`chat-box.tsx` 改 1 行、`core/settings/local.ts` 改 1 节、`manifest.json` 一份。

### 18.2 实施前必读 —— 已于 2026-09-09 读完

四项全部读完,产出两个新缺陷(证明这一步不可跳):

| 读什么 | 产出 |
|---|---|
| `core/messages/utils.ts:36-196`(`getMessageGroups` 全文) | **缺陷 3**:三类互斥 group 拆分使「取最后一个 processing group」永远看不到 `task` / `present_files` → 催生 §6.1 裁决与开放项 10;同时令原开放项 4 失效 |
| `core/messages/human-input.ts:486-494`(`hasOpenHumanInputRequest`) | 签名 `(messages, isVisibleMessage?)` 确认,与 `page.tsx:262-269` 的调用形状一致,spec 原设计无需修改 |
| `components/workspace/chats/chat-box.tsx` 全文(463 行) | 挂载点确认安全(三条 ResizablePanelGroup 约束全在侧面板:`pinnedContentWidth` 消费于 `:450-452`、`animatingRightPanel` 于 `:404`);**缺陷 4**:mobile 分支 `:349-353` 无 `id="chat"` → §10 裁决桌面 only |
| `frontend/AGENTS.md` Interaction Ownership 与测试环境分节 | 已在上下文内;`core/pet/` 落 node 环境测试的依据成立 |

追加读(为闭环缺陷 2):`backend/packages/harness/deerflow/agents/middlewares/tool_result_meta.py` → 确认 `ToolResultMeta` 盖在 `additional_kwargs`,§7 的错误判定改为读结构化字段。