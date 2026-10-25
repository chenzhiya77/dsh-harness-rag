# harness 构成观测台:前端构成视图(§12 第 2 项)— 设计文档

- 日期:2026-09-12
- 分支:沿用 `feat/rag-knowledge-base`
- 上游:构成快照 spec `2026-09-10-harness-constitution-snapshot-design.md`(一期,§12 第 2 项)、闸门埋点 spec `2026-09-11-harness-gate-instrumentation-design.md`(二期 #1,事件通道)
- 相邻:`../../HARNESS_EXECUTION_FLOW_MAP.md`、`../../AGENT_HARNESS_VISUALIZATION_RESEARCH.md`

## 1. 目标与范围

**一句话**:把已经躺在 `run.start.content.constitution` 里的构成快照,和已经在 SSE 上流动的闸门事件,渲染成那个"环形 + 两档"的界面。

**本 spec 不重新裁决任何产品决策。** 环形布局、手写 SVG、头部触发器 + Dialog、两档是两个独立组件、`extension` 是环外附加带、闸门通知长在既有工具卡上、文案冻结(一期 §13 的 60 key + 本 spec §8.3 新增并已批的 7 key = 67 key)——全部已裁决(§6.6.1 / §8 风险 11/12 / §12.1 / §6.8.1 / §13 / 本文 §8.3)。本 spec 是**实施规格**,只补三件一期没写清的事,加一处必要的后端小改:

| # | 本 spec 补的东西 | 一期 spec 的缺口 |
|---|---|---|
| 1 | **10 个既有前端接入点的具体接法**(带行号) | §12 第 2 项只写了"落点头部 + Dialog",没写怎么接数据 |
| 2 | **环形几何的确定性定义**(角度、半径、DOM/SVG 分工) | §6.6.1 裁了"环形"与"手写 SVG",§8 风险 12 裁了"不引 React Flow",但没有几何规格 |
| 3 | **i18n 清单的载体 + 三处 guard 的实现口径** | §13.6 定了三处 guard 的**意图**,没定**清单文件放哪、长什么样** |
| 4 | **一处后端改动:`run.start` 即时 flush**(§3) | §6.7 的"onCreated 之后 fetch 一次"在今天的 journal buffer 语义下**会拿到空数组** |

**本期不做**:实时脉冲(§12 第 6 项,依赖本项,含指针绕圈与圈数徽标)、⑩ 交付层(§12 第 3 项)、⑤ 状态机外框(第 4 项)、④⑥ 失败类型化(第 5 项)、subagent 构成(第 7 项)、闸门点到工具卡的跳转(§10 开放项)。

## 2. 已核实的前提(2026-09-12 代码核查,全部带行号)

### 2.1 数据源 A:构成快照(fetch-once)

- **载荷形状**已冻结在一期 spec §6.5:顶层 `schema_version` / `model` / `agent` / `checkpoint_mode` / `runtime_flags` / `stages[]` / `middlewares[]` / `tools` / `tool_authorization` / `skills` / `mcp_routing_built`。
- **读取端点已存在**(`backend/app/gateway/routers/thread_runs.py:1401-1435`):
  `GET /api/threads/{thread_id}/runs/{run_id}/events?event_types=run.start&limit=N`,返回 `list[dict]`,每行含 `seq` / `event_type` / `content` / `metadata` / `created_at`。**`content` 在该端点上往返为 JSON 对象**(contracts 的 `run.start.content` 是 `additionalProperties: true` 的对象,不是字符串)。
- **快照只在第一条 `run.start` 上**(`journal.py:332-346` 的 `parent_run_id is None` 分支 + `_constitution_emitted` 守卫)。goal continuation 会产生第二条 `run.start` 但**不带** `constitution` ⇒ 前端必须**扫描而不是取第一条**,取"第一个带 `constitution` 的行"。
- **`stages[]` 的退化形状已实测确认**(`constitution_record.py:272-293`):五个 canonical stage(`intake`/`context`/`model`/`tools`/`epilogue`)**恒出现**,零成员也出现;`extension` **仅当非空时追加**,且 `loop: false`。⇒ 环上恒为 5 段,第六段走环外带。
- **`middlewares[].name` 是真实类名**(§6.6.3 的命名要求),`kind` ∈ `member` / `overlay`,`overlay` 再带 `overlay_kind` ∈ `guard` / `handoff`(handoff 才带 `exits_run: true`)。

### 2.2 数据源 B:闸门事件(实时 + 回填)

- **双发已实现**(闸门 spec §4.6,提交 `c342e13d`):同一条 payload 同时进 custom SSE 帧与 `middleware:{tag}` run event。
- **payload 形状**(`journal.py:857-861` + `agents/middlewares/gate_events.py`):
  `{type: <tag>, name: <middleware 真名>, hook, action, changes}`。persisted 行把同样的四个键放进 `content`(不带 `type`,类型在 `event_type` 里)。
- **`name` 是连接到 ring 的钥匙**:闸门事件带 middleware 真名 ⇒ 前端可用 `middlewares[]` 的 `name → stage` 映射,把每个闸门挂到它所属的弧段上。**不需要新造一张 tag→stage 表**(那会违反 §6.6.4"不让前端按名字猜结构"的同一纪律——这里恰好是快照已经提供了权威映射)。
- **回填端点**:同一个 events 端点,`event_types` 接受逗号分隔列表(`thread_runs.py:1418` 的 `event_types.split(",")`),可一次取全 6 个 tag。
- **6 个 tag 与 6 条冻结文案一一对应**(闸门 spec §3.1 ↔ 一期 spec §13.3)。

### 2.3 前端既有接入点(这是本 spec 的主体,逐条列)

| # | 接什么 | 位置 | 怎么接 |
|---|---|---|---|
| 1 | 头部触发器的位置 | `app/workspace/chats/[thread_id]/page.tsx:292-316` 的右簇(现 6 项:`ThreadScheduledTasksLink` / token 或 `ContextUsageBadge` / `SidecarTrigger` / `BrowserTrigger` / `ExportTrigger` / `ArtifactTrigger`) | 插成第 7 项,排在 `ArtifactTrigger` 之后 |
| 2 | 触发器形状 | `components/workspace/artifacts/artifact-trigger.tsx:11-36`:`variant="ghost"` + `Tooltip` + `<span className="hidden sm:inline">` 标签 + `aria-label` + `data-testid` | 照抄形状,但**不带可见标签**——理由与备选见下方修正框 |
| 3 | 头部高度约束 | `page.tsx:280-287`,`h-12`(48px)+ `absolute top-0 z-30` | 只放触发器,环开在 Dialog(§12.1 已裁) |
| 4 | Dialog | `components/ui/dialog.tsx:63` 默认 `sm:max-w-lg`,业务先例 `delete-preview-dialog.tsx:40`(`max-w-2xl`)、`settings-dialog.tsx:214`(`sm:max-w-5xl`) | 本项从 `sm:max-w-2xl` 起步(§12.1 建议值) |
| 5 | **run id 的实时来源** | `core/threads/hooks.ts:1676-1677` `onCreated(meta) → handleStreamStart(meta.thread_id, meta.run_id)`;`:1635-1637` **`onStart` 只在 `startedRef` 为假时转发,即每线程一次** | **改用 `useThreadStream` 新返回的 `liveRunId`**(在 `handleStreamStart` 里由 `onCreated` 每 run 写入,线程切换时清空)——见下方修正框 |
| 6 | **run id 的历史来源** | 消息自带 `run_id`(`hooks.ts:284` 的 `${message.run_id}:${identity}`;`workspace-changes` 就是靠 `(threadId, runId)` 定位的) | 纯函数:从 `thread.messages` 末尾向前扫第一个非空 `run_id` |
| 7 | **闸门事件的实时入口** | `ThreadStreamOptions.onStreamCustomEvent`(`hooks.ts:74`)→ `:1580-1581` 的**单槽** ref → `:1794-1798` 在 `task_*` / `stream_replay_gap` 之前原样转发 | 主聊天页今天**没有**传它(只有知识页 `knowledge/chat-panel.tsx:170` 传了);本项在 `page.tsx:117` 的 `useThreadStream` 调用里补上传参 |
| 8 | run 事件端点抓取先例 | `core/tasks/api.ts:24-65`(`fetchSubtaskSteps`):`getBackendBaseURL()` 拼 URL + `core/api/fetcher` 的 `fetch` + `?event_types=…` + 翻页 | 新模块照抄这套,不做翻页(构成只有一个 run,数据量小) |
| 9 | TanStack Query 先例 | `hooks.ts:3065-3075`(`useRunDetail`):`queryKey: ["thread", threadId, "run", runId]`、`refetchOnWindowFocus: false` | 新 hook 照抄,`staleTime: Infinity`(快照 run 内不变) |
| 10 | lazy 加载先例 | 知识页 `vector-canvas.tsx` 用 `next/dynamic ssr:false` 挂 echarts-gl | Dialog 主体照做,环的代码不进线程路由的初始 chunk |

**两个必须知道的约束:**

- **`onStreamCustomEvent` 是单槽的**(`hooks.ts:1580-1581` 每次渲染直接覆盖 ref)。主聊天页今天没占用它,本项占用后,后续任何新消费者都必须**并到同一个转发函数里**,不能各传各的。
- **合成输入的浏览器验证有既有约束**(本机实测记录):视口须 ≥768px 才能可靠地往编辑器敲字。本项的验收里**只有窄屏检查**需要 <768px,而它只看头部是否溢出(截图 + 量宽),不需要输入 ⇒ 不受该约束影响。

> **修正框(2026-09-12,实施 Task 5 时发现两处,均已就地改掉)**
>
> **① 第 5 行原写的 `onStart` 拿不到当前 run。** `handleStreamStart` 里 `listeners.current.onStart` 只在 **`startedRef.current` 为假时**转发,而 `startedRef` 只在线程切换时重置 ⇒ **`onStart` 是"线程建立"信号,同一线程的第二次 run 永远到不了它**。照原写法,第二次 run 会拿着第一次的 run id 去查快照与闸门事件,把上一轮的闸门通知挂在上一轮的构成上。**改法**:`useThreadStream` 新增返回 `liveRunId`(在 `handleStreamStart` 里由每 run 触发的 `onCreated` 写入,随其余线程本地状态一起清空)——这是本次唯一一处改到共享 hook 的地方,约 6 行,并有一条 DOM 测试钉住"第二次 run 会替换它"。
>
> **② 第 2 行的"逐字照抄含可见标签"没有可用的文案。** 冻结的 67 条里没有这个控件的短标签,而 `constitution.title` 是一整句("本次 run 的构成",9 字),头部既有标签全是 2–4 字;头部右簇加到第 7 项本来就是 spec 自己标出的拥挤风险。**改法**:做成**纯图标**(`aria-label` + tooltip 用 `constitution.title`),与同一簇里的 `SidecarTrigger` 一致(它也是只有 `aria-label`)。**不新增文案。** 若用户要可见标签,需要的是一条**新的短 key**(例如 `constitution.trigger`),那要单独批。

### 2.4 i18n 现状

- 三文件:`src/core/i18n/locales/zh-CN.ts`(1,898 行)/ `en-US.ts`(1,987 行)/ `types.ts`(1,803 行,`interface Translations`)。
- **locale 文件是带类型的运行期对象**:`export const zhCN: Translations = {...}` ⇒ types.ts 与两份 locale 之间**两个方向的漂移都是编译错误**(缺键、多键都红——对象字面量的多余属性检查)。
- **JSON 可 import**:`tsconfig.json:8` `resolveJsonModule: true`,先例 `components/workspace/pet/agent-pet.tsx:15`(`import petManifest from "../../../../public/pet/parrot/manifest.json"`)。
- **后端读前端仓库文件有先例**:`backend/tests/test_compose_default_bind_host.py:24` 用 `Path(__file__).resolve().parents[2]` 定位仓库根再读 `docker/`。
- 既有 i18n 测试很薄(`tests/unit/core/i18n/translations.test.ts` 只断言两条文案),本项新增的 guard 是**新面**。

## 3. 唯一后端改动:`run.start` 即时 flush

**这是本 spec 唯一的非前端改动,也是它必须存在的理由。**

**现状(代码读出,行号为准)**:`run.start` 走普通 `_put`(`journal.py:341-346`),而 `_put` **只在缓冲 ≥ `flush_threshold = 20` 时刷**(`:659-672`,默认值在 `:231`),**且无时间兜底**。相比之下 `run.end` / `run.error` 都显式紧跟一次 `_flush_sync()`(`:367` / `:376`)。

**后果**:一次普通 run 在结束前产生的 run_events 通常 **< 20 条**(run.start + human.input + 若干 llm/tool + run.end),所以

> **一期的 §6.7 裁决"前端在 `onCreated` 之后 fetch 一次 `?event_types=run.start`"在今天的实现下会拿到空数组** —— 除非该 run 恰好已产生 ≥20 条事件(长 run)或已经结束。

这不是前端的问题,是投递时序的问题;而且它**同时挡着 §12 第 6 项**(脉冲要在跑动中画环,而环需要快照)。

**改动**:在 `on_chain_start` 的根分支 `_put(...)` 之后补一次 `self._flush_sync()`,与 `on_chain_end` 同款、**每 run 一次**。理由三条:

1. **成本与既有先例同级**:`_flush_sync` 是"把当前 buffer 交给一个 fire-and-forget 的 `put_batch`",`on_chain_end` / `on_chain_error` 已经在这么做;run.start 时 buffer 里只有 1 条事件。
2. **不碰执行语义**:journal 是旁路,`_flush_sync` 在无事件循环时自己退化为留 buffer(`:688-692`),embedded / 无 store 场景行为不变。
3. **它把一期那条裁决从"碰运气"变成"确定"**,而不是推翻它。

**测试(RED → GREEN)**:

- **RED(先写目标断言,今天必红)**:`tests/test_run_journal_constitution.py` 加一例——真实 journal + `MemoryRunEventStore`,只触发根 `on_chain_start`,断言**立即**能从 store 读到 `run.start`。**今天这条是红的**(缓冲阈 20,一条事件不触发刷写),这就是缺口本身的证据,不需要额外写一条"今天读不到"的反向用例(它会与改动后的行为直接冲突)。
- **GREEN(改动后)**:上条转绿;并断言**嵌套 chain 的 start 不触发 flush、也不多出 `run.start`**(`parent_run_id is not None` 早退,`:331-332`)。
- 回滚证明:把 `_flush_sync()` 注释掉 → GREEN 那条转红;嵌套那条保持绿(两组用例的牙相互独立)。

**否决的备选**:

- **给 `run.start` 也走 custom SSE 双发**(照闸门事件的先例):违反一期 §6.7 的 fetch-once 裁决,且自定义帧**不能替 Dialog 承担回填**(重开页面就没有了),等于两套投递并存。否决。
- **前端轮询**:给构成视图加 `refetchInterval`。一期 §13.4 刚把"前端在 run 进行中没有 run 级轮询"记成事实,为一个静态字段开轮询面不划算。否决。
- **改 `flush_threshold`**:全局调小会改变**所有** run 事件的写库节奏(包括进度回填、子代理步骤),爆炸半径远大于本项。否决。

## 4. 前端数据层

### 4.1 run id 解析(纯函数 + 一处页面状态)

```
resolveRunId(liveRunId: string | null, messages: RunMessage[]): string | null
```

规则:① `liveRunId` 非空则用它(本次 run 优先);② 否则从 `messages` **末尾向前**扫第一个非空 `run_id`;③ 都没有 → `null`(新线程/空线程)。

- `liveRunId` 由页面在 `onStart`(`page.tsx:128`)接住 runId 后写入 state;**线程切换时清空**(与 `page.tsx` 既有的 threadId 处理同处)。
- 纯函数放 `core/constitution/run-id.ts`,单测覆盖上面三条分支。

### 4.2 快照查询

`core/constitution/api.ts`(照 `core/tasks/api.ts` 的形状):

```
fetchConstitution(threadId, runId): Promise<ConstitutionRecord | null>
  GET {backend}/api/threads/{tid}/runs/{rid}/events?event_types=run.start&limit=20
  → 取第一个 content.constitution 存在的行;没有则 null
```

`core/constitution/hooks.ts`:

```
useConstitution(threadId, runId)  // TanStack Query
  queryKey: ["constitution", threadId, runId]
  enabled: Boolean(threadId && runId)
  staleTime: Infinity, refetchOnWindowFocus: false
```

**触发器可见性 = `data != null`**(而不是"永远显示、Dialog 里做空态")。这样:

- 上线前产生的旧 run、自定义 `agent_factory`、embedded 场景(§7 的降级表)→ **不显示触发器**,不会把"没有记录"渲染成一个可点击的空壳;
- **不需要任何新增空态文案**(冻结的 67 key 里没有空态 key)。

代价是每个 (thread, run) 多一次小 GET(run.start 行 ≈ 6 KB);由 TanStack 缓存,**不是每次渲染**。运行中新 run 的快照由 §3 的即时 flush 保证在 sub-秒级落库;为避免触发器在两次 run 之间闪烁,查询用 `placeholderData` 保留同线程上一个 run 的数据。

**解析必须防御三件事**(`core/constitution/parse.ts`,纯函数,单测):

1. `schema_version > 1` → 仍按已知字段渲染,未知键忽略(契约的可加性);
2. 顶层 `truncated: true` 或 `tools.truncated: true` → 记一个标记给开发者档(§6.2);
3. `stages[]` 里出现未知 `key` → 画成**环外带**(与 `extension` 同一条兜底),不猜 stage。

### 4.3 闸门事件的合并(纯函数)

`core/constitution/gate-events.ts`:

```
parseGateFrame(event: unknown): GateNotification | null
  // 自定义帧:{type: <6 tag 之一>, name, hook, action, changes}
  // 持久化行:{event_type: "middleware:<tag>", content: {name, hook, action, changes}}
  // 两条形态归一成 {tag, name, hook, action, changes, seq?}

mergeGateEvents(persisted: GateNotification[], live: GateNotification[]): GateNotification[]
```

- **去重键**:`JSON.stringify([tag, name, changes])`。同一 run 内两个逐字相同的事件折叠成一条(可接受;真要区分,那属于需要序号语义的新需求)。
- **排序**:回填按 `seq` 升序,实时按到达顺序;**展示时倒序(最新在前)**。
- **回填时机**:Dialog 打开时拉一次 `event_types=middleware:read_gate,middleware:tool_progress,middleware:subagent_limit,middleware:tool_promotion,middleware:sandbox_audit,middleware:skill_policy`(照 §4.2 的 query 规范,`queryKey: ["gate-events", threadId, runId]`)。
- **live 列表的生命周期**:由页面 `onStreamCustomEvent` 累积,`onStart`(新 run)与线程切换时清空。

## 5. 环形几何与渲染

### 5.1 纯几何(`core/constitution/geometry.ts`,零依赖)

```ts
// 坐标:viewBox 0 0 360 360,圆心 (180,180);0° = 三点钟方向,顺时针为正;
// 起点 -90°(十二点),五段等分。
const R = 118;          // 弧中心线半径
const BAND = 40;        // 弧宽(inner 98 / outer 138)
const GAP = 6;          // 弧间空隙(度)
const SPAN = (360 - 5 * GAP) / 5;   // 66°

arcPath(startDeg, endDeg, r): string           // SVG A 命令
polarPercent(r, deg, box): { left: string; top: string }   // DOM 叠层定位
ringLayout(stages): RingStage[]                // {key, loop, members, gates, handoffGates, startDeg, endDeg, centerDeg}
```

- **等分,不按成员数加权**:加权会让"零成员的段"退化成一个点(而 `stages[]` 保证五段恒在),且指针速度会随配置跳变。成员数在标签下方用计数表达(开发者档),不靠弧长。
- **`loop: true` 的三段**:在其弧外侧(R = 146)画一条 2px 的连续细弧,**把循环体标出来**;intake / epilogue 不画。这是 `stages[].loop` 在环上的唯一消费点(§6.6.1 说它是环形的必要输入)。
- **`extension` 段**(存在时):画在**环外**(R = 152,弧宽 12),**落在出口弧(epilogue)的角度范围上**,`loop:false`,视觉上明确"不占环上位次"(§8 风险 11)。
  > **2026-09-12 修正(实施 Task 4 时对着渲染图发现的自身漂移)**:本行原写"跨首尾接缝(约 253°–287°)",与上游一期 spec §8 风险 11 的冻结裁决"画在**出口弧外侧**"不符——那是我在写本 spec 时未经记录地改掉的。**以上游裁决为准。**理由也站得住:接缝正是出口弧与入口弧的交界,带子画在那里会读成"既不属于 epilogue 也不属于 intake",而 extension 的位次本就在链尾。
- **闸门徽标**:每个 stage 一枚,**落在该段弧的弧上**(R = 118,即弧中心线),显示 `gates + handoff_gates` 的合计数;`handoff` 单独计数用不同形状(§6.6.1 表格:"被拦" 与 "交给你了" 不是一件事)。徽标自带背景色,因此在弧的深浅两态下都可读。
  > **2026-09-12 修正(同上)**:本行原写"弧**外缘**(R = 138)",实施时渲染发现它与循环体细弧(R = 146)贴得太近;改到弧中心线后,标签另有落点(见下)。
- **段名标签**:画在**环内空区**(R = 70),不压在弧上——弧在选中时会变深,压在弧上的文字会被吃掉对比度;环内是唯一无人占用的区域。
- **`handoff` 出环边**:当 `stages[tools].handoff_gates > 0` 时,从 tools 弧中点向外画一条短线 + 三角(离环),表达 `Command(goto=END)` 的提前离场(§6.6.1 的代价②)。
- **指针是 #6 的座位,本期不画运动**:几何模块导出 `stageAngle(key)` 供第 6 项驱动指针;本项只在**悬停/选中**时高亮弧段。

### 5.2 SVG 与 DOM 的分工

| 元素 | 技术 | 理由 |
|---|---|---|
| 5 段弧 / loop 细弧 / extension 带 / handoff 出环边 | **SVG `<path>`** | 极坐标曲线用 path 最直接(`stroke-dasharray` 不需要,五段是五条独立 path) |
| 段名 / 计数标签 / 闸门徽标 / 通知条 | **DOM 叠层**(绝对定位,`polarPercent` 算 left/top) | 文字用 DOM 才有现成的字体、换行、`title`/Tooltip、i18n;SVG `<text>` 会把换行与本地化排版全变成手工活(§8 风险 12 的裁决原文:"标签与闸门徽标用 DOM 叠层") |
| Dialog / 列表 / 键盘可达性 | 既有 `components/ui/dialog` + 普通列表 | 零新依赖 |

- 根容器 `relative`,SVG `size-full` 打底,DOM 叠层绝对定位覆盖。
- **a11y**:每段弧一个 `role="img"` + `aria-label`(用 `constitution.a11y.segment`),列表头用 `constitution.a11y.total`。
- **动画**:本期只有 hover/选中态的颜色过渡(`transition-colors`),不做位置动画(那是 #6)。

### 5.3 退化与边界

| 情况 | 渲染 |
|---|---|
| `extension` 段不存在 | 环外带整块不渲染(常态) |
| `stages[]` 出现未知 key | 画成环外带(与 extension 同槽,按出现顺序排列) |
| `handoff_gates === 0` | 不出环边 |
| `truncated`(顶层或 tools) | 开发者档顶部一行提示(`constitution.truncated`,§8.3);用户档无感 |
| `middlewares[]` 里有 `stage: "extension"` 的行 | 归入环外带的分组,不挂任何弧 |

## 6. 两档视图(两个独立组件)

§6.8.1 的硬要求:两档**不是一个组件的详略开关**。落地为两个组件,共享的只有绘制原语(`ConstitutionRing`,它只画几何,不含任何一档的词汇)。

### 6.1 用户档(`constitution-user-view.tsx`)

输入:**只有** `stages[]` + 闸门事件。**拿不到也不渲染任何 middleware 真名、工具名、authorization 明细**(§6.8 的策展投影:靠"数组里没有",不靠"前端忍住不渲染")。

- 环(段名用 `constitution.stage.*`)+ 悬停某段时其下显示一句 `constitution.activity.*`;
- 闸门通知栈(最新在前,最多 3 条):每条用 `constitution.gate.<tag>` 的一句话,来自 §4.3 合并后的列表;**这是本项对终端用户的全部价值**(§6.8:"今天用户看到的是 agent 突然不说话,他会以为坏了");
- 闸门徽标被触发时加"已触发"态(环形上的一处小点)。

### 6.2 开发者档(`constitution-developer-view.tsx`)

输入:`middlewares[]` + `stages[]` + `tools` + `tool_authorization` + 闸门事件的 `changes`。

- 环(同一几何)+ 按 stage 分组的可折叠列表:每行 = 真名 + `kind`(`constitution.kind.*`)+ `frequency`(`constitution.frequency.*`)+ 可展开的 `hooks[]`(原始标识符,不翻译,同真名的处理);悬停出行内人话 tooltip = `constitution.middleware.<真名>`(34 条已冻结);
  > **2026-09-12 实施时发现的用词错位(已就地处理)**:payload 把 overlay 拆成 `kind:"overlay"` + `overlay_kind`,且它的值是 **`guard`**;而冻结文案表 §13.4 的三个键是 `member` / **`gate`** / `handoff`。**同一件事两个词**(payload 说 guard,文案键说 gate)。键只是标识符(§8 风险 8),所以映射写在组件里一张显式的三行表(`guard → gate`),不藏进 fallback——否则下次有人只改一边,显示的会是英文 `overlay`。
- 闸门事件的 `changes` 以 key-value 小表呈现(键是代码标识符,不翻译);`tool_call_id` 显示为等宽文本(跳转见 §10);
- **事实条**(v1 最小集):模型名 / 工具(挂载 N / 延迟 N / 被移除 N)/ `truncated` 提示。`runtime_flags` / `checkpoint_mode` / `skills` 本期不渲染(它们要么别处已有,要么需要更多文案——见 §8.1)。

### 6.3 视图切换与持久化

- Dialog 头部一个两段式切换(用户档 / 开发者档),**默认用户档**。
- 选中项存 `localSettings`(照 `page.tsx:296-308` 的 `localSettings.tokenUsage` 用法),key 新增 `constitution.view`;不做跨设备同步。
- Dialog 主体用 `next/dynamic` + `ssr: false` 懒加载(§2.3 第 10 条),关闭后卸载。

## 7. 文件清单

```
frontend/src/core/constitution/
  parse.ts                      # 快照解析 + 退化(§4.2)
  run-id.ts                     # resolveRunId(§4.1)
  api.ts                        # fetchConstitution / fetchGateEvents(§4.2/§4.3)
  hooks.ts                      # useConstitution / useGateEvents
  gate-events.ts                # 归一 + 合并 + 去重(§4.3)
  geometry.ts                   # 环形纯几何(§5.1)
  constitution-i18n-keys.json   # 67 key 清单(§8)
  types.ts                      # 快照/事件的前端类型(镜像后端形状)

frontend/src/components/workspace/constitution/
  constitution-trigger.tsx      # 头部触发器(ArtifactTrigger 形状)
  constitution-dialog.tsx       # Dialog 外壳 + 两档切换 + 懒加载
  constitution-ring.tsx         # 绘制原语(SVG + DOM 叠层)
  constitution-user-view.tsx    # 用户档
  constitution-developer-view.tsx  # 开发者档

frontend/tests/unit/core/constitution/…      # 纯函数与 guard(§9)
frontend/tests/unit/components/workspace/constitution/…  # 两个 .dom 测试
backend/tests/test_constitution_i18n_keys.py  # 清单 ↔ STAGE_OF_MIDDLEWARE / 契约 tag
backend/tests/test_run_journal_constitution.py # §3 的 flush(RED→GREEN)
```

## 8. i18n:清单载体 + 三处 guard 的实现口径

### 8.1 清单文件

`frontend/src/core/constitution/constitution-i18n-keys.json`,形状**镜像 i18n 的嵌套结构**(这样两个 walker 用同一套路径,不需要第三套词汇):

```jsonc
{
  "core": {
    "stage":     ["intake", "context", "model", "tools", "epilogue", "extension"],
    "activity":  ["intake", "context", "model", "tools", "epilogue"],
    "gate":      ["read_gate", "tool_progress", "subagent_limit", "tool_promotion", "sandbox_audit", "skill_policy"],
    "frequency": ["once_per_run", "per_model_call", "per_tool_call"],
    "kind":      ["member", "gate", "handoff"],
    "a11y":      ["segment", "total"],
    "facts":     ["model", "tools", "deferred", "removed"],
    "view":      ["user", "developer"],
    "title":     true,
    "truncated": true
  },
  "middlewares": ["ThreadDataMiddleware", "…共 34…", "MemoryMiddleware"]
}
```

**为什么放前端**:这份清单是**文案的密钥目录**,文案归前端拥有(§6.8);`contracts/` 放的是跨组件 payload schema,清单不是。后端测试读它用 §2.4 的既有先例(`parents[2]` 定位仓库根)。

**计数**:`core` = 6 + 5 + 6 + 3 + 3 + 2 + 4 + 2 + 1 + 1 = **33**(其中 26 条来自一期 §13、7 条是本 spec §8.3 新增),`middlewares` = **34**,合计 **67 key × 2 locale = 134 条**(一期 §13 的 60 是同一批减去 §8.3 的 7 条;§13.4 里 `title` 与 `a11y.*` 共 3 条,本节按嵌套结构拆成 `title` + `a11y[2]`,总数不变)。

> **§8.3 那 7 条已于 2026-09-12 由用户批准**,因此本节清单是**全量冻结**的,不再有"待批"部分。

### 8.2 三处 guard 的实现口径(§13.6 的细化)

§13.6 写的是意图,这里写**每个测试到底怎么断言**:

1. **前端 locale guard**(`tests/unit/core/constitution/i18n-keys.test.ts`,node 环境):
   以 `constitution-i18n-keys.json` 为基准,**双向**遍历 `zhCN.constitution` 与 `enUS.constitution`:
   - 正向:清单里每个 key 在两份 locale 里都存在、且是非空字符串(`title` 是字符串,`a11y.segment` / `a11y.total` 是**函数**——用 `typeof` 断言,不能只查 truthy);
   - 反向:两份 locale 的 `constitution` 子树**没有多余叶子**(逐层比 key 集合),防止改名后留下孤儿文案。
2. **types.ts 的覆盖机制**(同文件里的一段说明 + 不额外造测试):types.ts 与两份 locale **互为编译约束**——`export const zhCN: Translations` 让"缺键"和"多键"都是编译错误;再叠加第 1 条的运行期双向遍历,types.ts 的任何漂移都会以"locale 漂移"的形式被同一组断言抓住。**因此 §13.6 的第 2 处不需要独立测试文件**;但要在测试文件头部把这条推理写清楚(否则下一个人会以为漏了一处)。
3. **后端清单 guard**(`backend/tests/test_constitution_i18n_keys.py`):
   - `manifest["middlewares"]` ↔ `STAGE_OF_MIDDLEWARE` 的键集**逐项相等**(双向:漏一个 / 多一个都红);
   - `manifest["core"]["gate"]` ↔ catalog 里那六个闸门 tag 常量(改名即红);
   - 断言 34 个名字在 locale 侧是**索引键**而不是 i18n 的普通 key(即它们出现在 `manifest["middlewares"]` 里,防止有人把它们塞进 `core`)。

### 8.3 新增文案(2026-09-12 用户批,与 §13 同级冻结)

一期 §13 的 60 key 覆盖了环、闸门、两档轴、tooltip——**没有覆盖开发者档的事实条与截断提示**。这是本 spec 唯一新增文案的地方,7 条已由用户 2026-09-12 批准(风格沿用 §13:开发者档用陈述句,不抄实现细节):

| key | zh-CN | en-US |
|---|---|---|
| `constitution.facts.model` | 模型 | Model |
| `constitution.facts.tools` | 挂载的工具 | Mounted tools |
| `constitution.facts.deferred` | 延迟工具 | Deferred tools |
| `constitution.facts.removed` | 被权限移除 | Removed by authorization |
| `constitution.truncated` | 构成记录过大，已省略部分明细 | The record was too large; some details are omitted |
| `constitution.view.user` | 用户视图 | User view |
| `constitution.view.developer` | 开发者视图 | Developer view |

> **落盘口径与 §13 相同**:文案只落 `zh-CN.ts` / `en-US.ts` 的 `constitution` 块与 `types.ts` 的类型定义,由 §8.2 的三处 guard 对账(清单计数为 `core 33 / middlewares 34 / 合计 67`,见 §8.1)。**新增这 7 条之后,一期 §13 提到的"60 key"一律以本节清单的 67 为准。**

## 9. 测试(TDD)

**前端**(Rstest;纯逻辑默认 node 环境,DOM 的才用 `.dom.test.*`,见 `frontend/AGENTS.md`):

- `core/constitution/geometry.test.ts`:五段等分(起点 -90°、跨度 66°、间隙 6°)、`arcPath` 的方向与 sweep 标志、`ringLayout` 对 `extension` 的排除、`loop:true` 恰好三段、`polarPercent` 的四个象限;
- `core/constitution/run-id.test.ts`:live 优先 / 历史回退 / 空线程三条分支;
- `core/constitution/gate-events.test.ts`:两种载荷形态归一、去重键、排序、未知 tag 丢弃;
- `core/constitution/parse.test.ts`:`schema_version: 2` 仍解析、`truncated` 标记、未知 stage key 落环外带、`constitution` 缺失返回 `null`;
- `core/constitution/i18n-keys.test.ts`:**§8.2 第 1 条**(双向),并且断言清单本身计数(`core 33` / `middlewares 34` / `合计 67`)以防被静默改小;
- `components/workspace/constitution/constitution-user-view.dom.test.tsx`:用一份固定快照 + 两条闸门事件渲染,断言 ① 出现三段以上的 stage 文案;② **整棵树的可读文本里不含任何 `…Middleware` 真名、不含 `tools.mounted` 里的工具名**——这是 §6.8 策展投影在前端的**渲染层对偶**(后端那条只钉了 `stages[]` 的序列化文本,管不住前端从别的字段读出真名再渲染);
- `components/workspace/constitution/constitution-developer-view.dom.test.tsx`:34 条 tooltip 在悬停时可取(抽 3 条断言)、`kind` / `frequency` 徽标按数据渲染、未知 stage 的行落环外带分组、`truncated` 提示出现。

**后端**:

- `tests/test_run_journal_constitution.py`(增量):§3 的 RED/GREEN 两条;
- `tests/test_constitution_i18n_keys.py`(新):§8.2 第 3 条的三组断言。

**前端门禁**:`pnpm check`(lint + tsc)、`pnpm test`(全量单测)、`pnpm format`。`pnpm perf:check` **不是本轮门禁**(一期 §8 风险 12 已裁:零新依赖;且该预算表本身过期、不在 CI)。发布前人工确认:线程路由由本项引入的 gzip 增量(< 10 KB 量级),若明显超出则把 Dialog 主体进一步拆包。

## 10. 风险与开放项

1. **`onStreamCustomEvent` 是单槽的**(§2.3)。本项占用后,后来者必须并到同一个转发函数。**缓解**:在 `page.tsx` 的传参旁留一行注释说明这个槽的所有者与合并方式(注释解释"为什么",符合本仓注释纪律)。
2. **窄屏头部拥挤**(§12.1 明确要求实测):右簇加到第 7 项,`sm` 以下只剩图标。**处置**:375px 视口截图 + 量头部宽度;溢出则把本项收进溢出菜单(与既有的降级手段一致)。这是**唯一必须在真浏览器里过一遍的布局风险**。
3. **快照的"最后一次 run"语义**:`resolveRunId` 取的是可见消息里最后一个 `run_id`。分支线程 / 重新生成会让"最新 run"与"用户以为的那次"错位——**本期接受**(触发器文案是"本次 run 的构成",不声称是哪一次),若用户要"选某次 run 看构成",那是新需求。
4. **闸门点到工具卡的跳转(deferred)**:§12.1 的交互清单里有"点成员跳去对应工具卡"。本仓**没有**现成的"按 `tool_call_id` 定位消息组并滚动"的工具,新增它等于一个新的跨组件定位机制,会稀释本项的主体。**本项 v1 只把 `tool_call_id` 显示成等宽文本**;跳转与 §12 第 6 项同期再评估。
5. **`changes` 的展示口径**:开发者档直接渲染原始 `changes`。它们是契约字段(闸门 spec §7 风险 3),改名要走契约变更——前端因此**不要**对键名做映射,原样展示(映射表会变成第三套词汇)。
6. **两个 Dialog 里的环 + 懒加载**:`next/dynamic` 的先例是画布类组件;环是 SVG,DOM 叠层的定位依赖挂载后的 `ResizeObserver`/百分比布局。**若**发现首帧错位,退化方案是用固定 viewBox 的百分比定位(不需要测量)。

## 11. 手工验收(真栈)

前置同既有纪律:**私有端口 `:8099` + `DEER_FLOW_AUTH_DISABLED=1`,绝不碰用户自己的 8001**;浏览器视口 ≥768px(合成输入约束,§2.3)。

1. **默认档位**:发起一个会触发闸门的 run(例:让它改一个没先读过的文件 → `read_gate`),打开 Dialog:
   - 环上五段齐全,`intake`/`epilogue` 在首尾,循环体三段带 loop 细弧;
   - 闸门通知出现,文案与 §13.3 逐字一致;
   - 用户档文本里**搜不到**任何 `Middleware` 真名与工具名。
2. **开发者档**:切过去,`Tools` 分组里能看到被拦的那次调用对应的 middleware 行 + `changes`;tooltip 出来的是 §13.5 的人话。
3. **回填**:刷新页面(重连历史),闸门通知**仍在**(来自 run_events,不是只活在 SSE 里)。
4. **时序(§3 的验证)**:在 run **进行中**打开 Dialog,快照应在 1 秒内出现(而不是等 run 结束)。
5. **窄屏**:375px 视口截图,头部不溢出(或已按 §10 风险 2 收进菜单)。
6. **降级**:手工构造一份没有 `constitution` 的 run(或指向一个旧 run)→ 触发器不出现,无空壳弹窗。

## 12. 非目标

- **不新增**依赖(`pnpm perf:check` 的约束不适用,§8 风险 12);
- **不新增**路由、顶级入口、事件类型、端点、数据库表、迁移;
- **不重新裁决**任何已冻结项(环形 / SVG / 位置 / 两档 / 67 key 文案);
- **不实现**实时脉冲(指针绕圈、圈数徽标、`llm_call_index` 消费)——第 6 项;
- **不实现** ⑩ 交付层、⑤ 状态机外框、④⑥ 失败类型化、subagent 构成;
- **不改**任何 middleware 的行为;唯一的后端改动是 §3 的一次 flush(旁路,不碰执行语义)。