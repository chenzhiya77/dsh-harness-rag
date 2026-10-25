# Agent 装饰宠物(鹦鹉帧动画)第 1 期 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 agent 聊天窗挂一只帧动画鹦鹉,把已有但无人读取的 run 状态做成周边视觉。第 1 期只交付 **`idle` + `wait` 两组帧**,交付判断只有一条:**「agent 在等你回答」与「run 跑完了」在视觉上分得开**。零后端改动、零新依赖、零新事件通道。

**Architecture:** 宠物是**观察者**,不是输出面、不是 agent(spec `../specs/2026-09-09-agent-pet-sprite-design.md` §4 四项裁决)。数据流是单向的:既有 `useThread()` 信号 → 四个纯函数 → 一个只吃 `PetState` 的渲染器。不订阅 `onStreamCustomEvent`(§4.3),不调用 `getMessageGroups`(§6.1),不持有任何 agent/线程/记忆(§4.4)。契约细节全在 spec,本计划只排步骤。

**Tech Stack:** React 19 + Next.js 16 + Tailwind 4。渲染用纯 CSS `background-position` + `steps()`,**不引 PixiJS/Lottie/motion**(spec §9.1)。测试按 `frontend/AGENTS.md` 分节约定:纯逻辑走 `*.test.ts`(node),只有渲染器走 `*.dom.test.tsx`(happy-dom,贵约 3 倍)。

**测试运行命令(全程统一):**
```bash
cd frontend && pnpm test       # Rstest:*.test.ts 走 node,*.dom.test.tsx 走 happy-dom
cd frontend && pnpm check      # lint + typecheck,提交前必跑
cd frontend && pnpm dev        # 浏览器实测(Task 7 唯一手段,不可用单测替代)
```

**关键事实(已核实,细节与行号见 spec §2):**
- **`ClarificationMiddleware` 走 `Command(goto=END)`**,所以「在等你回答」与「跑完了」在流层面完全同形(`isLoading` 都变 false、`onFinish` 都触发)。唯一区分信号是 `hasOpenHumanInputRequest`(`core/messages/human-input.ts:486`,签名 `(messages, isVisibleMessage?)`)。这是本期全部价值所在。
- **`getMessageGroups` 不可用于派生在飞工具**(spec §6.1):它把带工具调用的 AI 消息拆进三类互斥 group,优先级 `present_files`(`utils.ts:158`)> `task`(`:164`)> `assistant:processing`(`:170`)。只看 processing **永远看不到 `task` 与 `present_files`**,`delegate` workKind 会静默失效。必须直接走 `thread.messages`。
- **`findToolCallResult` 不可复用**(spec §15 开放项 1):`utils.ts:706` 在 ToolMessage 存在但内容为空时也返回 `undefined`,会把「已完成的空结果」误读成「仍在飞」。自建 `answered` Set。
- **挂载点已确认安全**:`chat-box.tsx:413` 的 `div#chat`,且 `:81` 已有 `const { thread } = useThread()`。三条 ResizablePanelGroup 约束全在**侧面板**(`pinnedContentWidth` 消费于 `:450-452`、`animatingRightPanel` 于 `:404`),加一个 `{children}` 的兄弟节点不触碰任何一条。
- **mobile 分支无挂载点**:`chat-box.tsx:349-353` 渲染的容器没有 `id="chat"`。本期裁决桌面 only(spec §10)。
- **`deerflow_tool_meta` 静态证据充分但未直接观测**:后端盖在 `ToolMessage.additional_kwargs`(`tool_result_meta.py:18`,dataclass `:33-40`),前端已在读同一 dict 的其他键(`utils.ts:718` 读 `.hide_from_ui`)。→ Task 0 Step 1 必须先确认。
- 设置节形状照抄既有 `notification: { enabled: true }`(`core/settings/local.ts:5-7`);`LocalSettingsSetter`(`store.ts:14`)按节 merge,**无需迁移**。
- 术语已定死(spec §3):叫**宠物/鹦鹉**,不叫 mascot/avatar/companion(avatar 在本仓库已指自定义 agent 的 `BotIcon`);状态叫**持续态/一次性**,不叫 emotion(AIRI 术语,语义是模型自报,与本设计相反)。

**机器特定:** host 侧 pnpm 一律经 `scripts/pnpm.py`(根 `AGENTS.md` 已写明)。sprite sheet 是 `public/` 下静态图,不计入 `pnpm perf:check` 的预算(该命令度量唯一 JS 与 CSS 文件);新增 `core/pet/` 的 JS 量很小,本期不预期触发预算失败,但 Task 7 仍跑一次确认。

---

## File Structure

**新建:**
- `frontend/src/core/pet/state.ts`(类型 + `derivePetState`)
- `frontend/src/core/pet/tools.ts`(`collectActiveToolNames` + `classifyTool` + `pickWorkKind`)
- `frontend/src/core/pet/fatigue.ts`(`collectFatigueInput` + `computeFatigueLevel`)
- `frontend/src/core/pet/sprite.ts`(`resolveSprite` + `effectiveFps` + `FATIGUE_FPS_SCALE`)
- `frontend/src/components/workspace/pet/pet-sprite.tsx`(渲染器,不知道 agent 存在)
- `frontend/src/components/workspace/pet/agent-pet.tsx`(订阅者)
- `frontend/public/pet/parrot/manifest.json` + `idle.webp` + `wait.webp`(Task 3 先出占位帧)
- `frontend/tests/unit/core/pet/{state,tools,fatigue,sprite}.test.ts`
- `frontend/tests/unit/components/workspace/pet/pet-sprite.dom.test.tsx`

**修改:**
- `frontend/src/core/settings/local.ts`(+ `pet: { enabled: true }` 节 + `LocalSettings` 类型)
- `frontend/src/components/workspace/chats/chat-box.tsx`(+1 行挂载,**仅桌面分支**)
- `frontend/AGENTS.md`(+ `core/pet/` 域说明 + 宠物挂载所有权,仓库强制约定)

**本期不动:** 后端任何文件、`contracts/`、`package.json`、`core/threads/hooks.ts`、`core/messages/*`(只读不改)。

---

## Task 0: 两项前置核实(**阻塞后续所有任务**)

- [x] **Step 1(`deerflow_tool_meta` 运行时确认,spec §15 开放项 8)** — 2026-09-10 闭环,结论:**在**,Task 2 的 `byErrors` / `byUnrecoverable` 两路保留。**交付纪要**:没有按原步骤「发一个必然失败的工具调用 + 浏览器打印」走,改为四条腿(覆盖持久化/两条出线/客户端类型,比单次浏览器打印更宽):① 本机 `backend/.deer-flow/data/deerflow.db` 的 `writes` 表解出 **138 条带 stamp 的真实 ToolMessage**,meta 键形状 **138/138** 为 `status`/`error_type`/`recoverable_by_model`/`recommended_next_action`/`source`,与 `tool_result_meta.py:34-40` 逐字一致,其中 5 条 `status:"error"`;② 把库里那条真实 error 消息喂进 `serialize_messages_tuple`(`runtime/serialization.py:124`),`additional_kwargs` 原样带出;③ 同一条喂进 `serialize_channel_values_for_api` 同样带出,而本机 `run_events.backend: memory`、`run_events` 表 0 行,前端刷新回灌走的正是 `threads.py:1378`;④ SDK `BaseMessage.additional_kwargs?: Record<string, unknown>` 是开放记录,前端已在生产读兄弟键(`utils.ts:719`)。**顺带发现**:138 条里 `recoverable_by_model` 全 `true`、零 `false`,`source` 无 `exception` ⇒ `byUnrecoverable` 实测 0/138(只有代码级证据),Task 2 该子分只能靠合成 fixture;`byErrors` 实测 5/138 ≈ 3.6%。已写回 spec §2 表格行、§7 阈值段、§15 开放项 8。**未覆盖项(诚实记录)**:没有真发一次失败工具调用做活体浏览器打印 —— 四条腿已覆盖其全部信息面,若 Task 7 浏览器验收时顺手打印一次可作为第五腿,非必需。
- [x] **Step 2(容器查询上下文,spec §10 的 480px 断点依赖它)** — 2026-09-10 闭环,结论:**自挂 `[container-type:inline-size]` 于 `div#chat` 可用且必需**,不退回 `ResizeObserver`。**交付纪要**:运行时 spike(零源码改动,reload 后无残留),在已登录真实应用内:① `div#chat` 在 `/workspace/chats/new`(未发消息)即存在,宽 759、`container-type: normal`,带 `[container-type:inline-size]` 的祖先是 `#workspace-chats-new-group`(宽 760)—— 现场复现 spec §10 的「错误盒子」;② 自挂后布局**逐字节不变**(759→759,首子节点矩形 before/after 相同);③ `div#chat` 下探针 700/600/481 显示、480/479/400/300 隐藏,**断点精确 480**(`max-width` 闭区间,spec §10 措辞已从「< 480px」更正为「≤ 480px」);④ 对照实验:chat 压到 400 而 group 仍 760 时,挂在 group 下的同规则探针**不匹配**窄规则 ⇒ 自挂是必需而非偏好。已写回 spec §10。**未覆盖项**:sidecar **真拖拽**改变 `div#chat` 宽度这一环未实测(属 ResizablePanelGroup 既有行为,非本设计引入),并入 Task 7 Step 5。

## Task 1: 状态与工具分类纯函数(TDD)

**Files:** Create `frontend/src/core/pet/{state.ts,tools.ts}` + `frontend/tests/unit/core/pet/{state,tools}.test.ts`

- [x] **Step 1(先写红测试 `tools.test.ts`):** 覆盖 ① `collectActiveToolNames` —— 多工具并行返回多个名、**ToolMessage 内容为空仍算已答**(钉住 spec §15 开放项 1)、孤儿 ToolMessage(无 AI 前置)不崩、空 messages 返回 `[]`;② 6 类映射逐个 + **未知 MCP 名(如 `github_list_prs`)落 `generic`**;③ `pickWorkKind` 优先级表逐对比较 + 空数组返回 `null`;④ **用含 `task` 的 fixture 断言 `delegate` 能出来**(spec §15 开放项 10 的回归锚 —— 将来有人改回走 `getMessageGroups` 时这条会红)。
- [x] **Step 2:** 实现 `tools.ts`,逐字按 spec §6.1 的 `collectActiveToolNames` 与 §6.2 的 `classifyTool` / `WORK_KIND_PRECEDENCE` / `pickWorkKind`。复用 `hasToolCalls`(`core/messages/utils.ts:664`),**不复用 `findToolCallResult`**。
- [x] **Step 3(先写红测试 `state.test.ts`):** 覆盖决策树全分支 + `done` 下降沿(`wasLoading` true→false)+ **spec §5.3 三条不变量逐条**:① `error` 压掉 `done`;② `isLoading` 为真时即使有未回答请求也是 `work`/`think` 而非 `wait`;③ `done` 只在落到 `idle` 时触发,落到 `wait` / `error` 时 `oneShot` 为 `null`。
- [x] **Step 4:** 实现 `state.ts`(类型 + `derivePetState`),按 spec §5.1 / §5.2。注意 `PetSignals.activeToolNames` 是**数组**不是 `string | null`。
- [x] **Step 5:** 转绿 + `cd frontend && pnpm check`。

**Task 1 交付纪要(2026-09-10)**

- **RED**:两个文件的红都是「模块不存在」——`Cannot find module '@/core/pet/tools'`(0 用例被收集)、随后 `Cannot find module '@/core/pet/state'`。先写测试跑红再实现,顺序与 Step 1/3 一致。
- **GREEN**:`tests/unit/core/pet/tools.test.ts` **35 例**、`state.test.ts` **13 例**,合计 **48 例**全绿;两个文件都只跑 node 侧(`*.test.ts`),符合 `frontend/AGENTS.md` 的「纯逻辑不进 DOM」分节纪律。
- **revert proof(七次 neuter,逐个确认对应用例恰好转红后原样恢复)**:每次只改一处实现,恢复后复跑 48 例全绿。

  | # | 被 neuter 的行为 | 改动 | 转红用例 |
  |---|---|---|---|
  | 1 | 空内容 ToolMessage 也算已答 | `answered` 收集加 `&& m.content` | **恰好 1 条**(§15 开放项 1 那条) |
  | 2 | `delegate` 可达 | 删掉 `task: "delegate"` | **8 条**(`task` 映射 + 6 对 delegate 优先级 + 开放项 10 的锚) |
  | 3 | 优先级排序 | `pickWorkKind` 去掉 `sort` | **22 条**(21 对两两比较 + state 里「取最显著」那条) |
  | 4 | 未知工具落 `generic` | `?? "generic"` → `?? "read"` | **恰好 2 条**(`classifyTool` 兜底 + state 的 generic 回落) |
  | 5 | §5.3 不变量 1(`error` 最高) | `hasError` 分支移到 `wait` 之后 | **恰好 1 条**(不变量 1) |
  | 6 | §5.3 不变量 2(`isLoading` 先分支) | `wait` 分支提到 `isLoading` 之前 | **恰好 1 条**(不变量 2) |
  | 7 | §5.3 不变量 3(`done` 只在落 `idle` 时) | `wait` 分支也发 `oneShot` | **恰好 1 条**(不变量 3) |

  三条不变量各自**恰好**命中一条,证明它们是三条独立的钉,不是一条用例重复覆盖。
- **偏离原计划(2 处,均为 tsconfig 强制,语义不变)**:① spec §6.2 片段里的 `...sort(...)[0]` 在本仓库过不了类型检查 —— `tsconfig.json` 开了 `noUncheckedIndexedAccess`,索引访问恒为 `T | undefined`;改为 `const ranked = ...; return ranked[0] ?? null`(仓库既有写法:`eval-tab.tsx:351` 的 `runs[0] ?? null`)。空数组已由前置 guard 排除,`?? null` 只服务类型。② `collectActiveToolNames` 里除 `hasToolCalls(m)` 外多写了 `m.type !== "ai" ||` —— `hasToolCalls` 不是类型谓词,不加这句 `m.tool_calls` 无法通过类型检查;与既有 `extractPresentFilesFromMessage`(`core/messages/utils.ts:682`)同一写法,`hasToolCalls` 仍被复用。
- **门禁**:`pnpm check` 干净(先报 1 条 `import/order`、再报 4 条 `noUncheckedIndexedAccess` 类型错,均已修);**全量 `pnpm test`:2121 通过 / 1 失败**,唯一失败是 `knowledge/chat-panel.dom.test.tsx`「restores the remembered model per kb…」——本机**预存环境性失败**(该测试文件与其被测路径在本树中零改动,本轮只新增 `core/pet/` 两个目录、无任何既有文件被改),判据与记录见项目记忆「环境性测试红」。
- **未覆盖项(诚实记录)**:① 本轮无 DOM 测试 —— 正确而非缺口,`state.ts`/`tools.ts` 是纯函数,AGENTS.md 要求留在 node。② `ask_clarification` 故意不在映射表内也**未加测试**:spec §6.2 已论证它在 `isLoading` 变 false 前不会被观察到(走 `Command(goto=END)`),加一条「它落 generic」的用例会把一个永远不会发生的输入固化成契约。③ `pickWorkKind` 的 `WORK_KIND_PRECEDENCE` 数值本身没有测试断言(只断言相对顺序),这是刻意的:spec §6.2 明说这张表是产品判断、可随时改。

## Task 2: 疲劳度与精灵解析纯函数(TDD)

**Files:** Create `frontend/src/core/pet/{fatigue.ts,sprite.ts}` + `frontend/tests/unit/core/pet/{fatigue,sprite}.test.ts`

- [x] **Step 1(先写红测试 `fatigue.test.ts`):** 覆盖 ① 五个子分各自封顶 3;② `max` 语义(单一高分即拉满);③ `collectFatigueInput` 从 `additional_kwargs.deerflow_tool_meta` 正确分出 `toolErrorCount` 与 `unrecoverableErrorCount`;④ **meta 缺失时两者都为 0**(不崩、不误判);⑤ `maxConsecutiveSameTool` 的连续同名计数。按 Task 0 Step 1 的结论决定是否保留 ③④。
- [x] **Step 2:** 实现 `fatigue.ts`,阈值表按 spec §7(**阈值是猜的,写进模块注释说明需上线后校准**)。
- [x] **Step 3(先写红测试 `sprite.test.ts`):** 覆盖 ① `work-{kind}` → `work` → `fallback` 两级回落逐级;② one-shot 优先于 base;③ manifest 里完全没有候选项时返回 `null`;④ `effectiveFps` 对 `loop: true` 应用 `FATIGUE_FPS_SCALE`、对 `loop: false` **不衰减**(spec §9.2 注释:done 是信息必须读得清)。**用内联 fixture manifest,不 import 真文件**(真 manifest 到 Task 3 才存在;`resolveSprite` 的 manifest 是参数,spec §9.2)。
- [x] **Step 4:** 实现 `sprite.ts`,按 spec §9.2。
- [x] **Step 5:** 转绿 + `pnpm check`。

**Task 2 交付纪要(2026-09-10)**

- **RED**:两次都是「模块不存在」(`@/core/pet/fatigue`、`@/core/pet/sprite`,0 用例收集)。
- **GREEN**:`fatigue.test.ts` **36 例** + `sprite.test.ts` **11 例**;`core/pet/` 四个测试文件合计 **95 例**全绿(35+13+36+11)。
- **revert proof(12 次 neuter,逐个确认命中)**:N1 是批量(五个子分的首个阈值各 +1 一档),其余每次只改一处。

  | # | 被 neuter 的行为 | 改动 | 转红 |
  |---|---|---|---|
  | N1 | 五个子分的档位边界 | 五处首个阈值各 +1 档 | **恰好 5 条**(每个子分各一条边界行) |
  | N2 | `byUnrecoverable` 的 2→3 跳档(无 2 档) | 补出 `<4 → 2` 一档 | 恰好 1 条 |
  | N3 | `max` 而非 `sum` | 子分改成相加 | 恰好 1 条(**首次跑没红,见下**) |
  | N4 | 错误的可恢复性拆分 | `unrecoverable = toolErrorCount` | 恰好 1 条 |
  | N5 | meta 缺失不算错 | 缺失时 `toolErrorCount += 1` | 恰好 1 条 |
  | N6 | `partial_success` 不算错 | 把 partial 也计入 | 恰好 1 条 |
  | N7 | 跨消息的连续同名计数 | 每条消息重置 run 游标 | 恰好 1 条 |
  | N8 | `work-{kind}` 第一级 | 候选只留 `work` | 恰好 1 条 |
  | N9 | one-shot 优先于 base | 候选顺序对调 | 恰好 1 条 |
  | N10 | `fallback` 候选 | 从候选表移除 | 恰好 2 条(两级回落各一条) |
  | N11 | 全部落空返回 `null` | 改成返回 `fallback` | 恰好 1 条 |
  | N12 | 只有 `loop: true` 才衰减 | 去掉 `loop` 判断 | 恰好 1 条 |

- **revert proof 抓到一个空洞测试(本轮最有价值的发现)**:N3 第一次跑**全绿** —— 我原来那条「max 不是 sum」的用例给了一个子分 3 档,于是 `Math.min(3, sum)` 同样得 3,断言根本无法失败。改成四个子分各 1 档(同时 `toolCallCount=5`、`maxConsecutiveSameTool=3`、`toolErrorCount=1`、`elapsedMs=2min`)后:max 得 1、sum 得 `min(3,4)=3`,才真正区分开,N3 随即恰好命中。**这条记下来是为了说明 revert proof 不是仪式**:它当场证伪了我一条「看起来在测 max」的用例。
- **API 决策(spec 留白处,需回填 spec §7/§12)**:`collectFatigueInput` 的签名 spec 没写。实测需要三条约束同时成立 —— 它必须能只靠 `messages` memo(§12 要求 memo 在 `messages.length`),而 `elapsedMs` 是每 tick 变化的活值。故定案:`collectFatigueInput(messages): FatigueSignals`,其中 `FatigueSignals = Omit<FatigueInput, "elapsedMs">`;`elapsedMs` 由调用方在渲染时补进 `computeFatigueLevel`。若按 `FatigueInput` 全量返回,就必须把 `elapsedMs` 传进 memo,缓存每帧失效,直接违背 §12。
- **其余实现决策(2 处)**:① `toolCallCount` 数的是**发起过的** tool_call(AI 消息的 `tool_calls` 条目),不是已完成的 ToolMessage 数 —— 名字是 tool *call* count,且发起即算「这个 run 干了多少活」;② 错误子分只读 `additional_kwargs.deerflow_tool_meta` 的结构化字段(`isRecord` 局部守卫,仓库同类写法见 `human-input.ts:90`),**零文本解析**。
- **偏离原计划(1 处,tsconfig 强制)**:`effectiveFps` 里 `manifest.states[sprite]` 在 `noUncheckedIndexedAccess` 下是 `T | undefined`,而 spec §9.2 直接读 `.loop`。用 `!` 非空断言 + 注释说明「调用方只会传 `resolveSprite` 的产物,其键必然存在」;仓库 `src/core/` 已有非空断言先例(`kb-order.ts:70`、`preprocess.ts:90`)。不用「未命中返回 0」那种静默兜底:那会让 fps=0 流进 `calc(frames/fps)` 变成非法 CSS,而断言是响亮失败。
- **门禁**:`pnpm check` 干净(本轮零 lint/类型错);**全量 `pnpm test`:2173 例 / 2172 通过 / 1 失败**(203 文件 / 1 失败),唯一失败是本机预存环境性失败 `knowledge/chat-panel.dom.test.tsx`「restores the remembered model per kb…」—— 与 Task 1 那条同源,判据相同(该文件与其被测路径在本树零改动)。
  **一次异常记录(如实,原因未查明)**:本轮**第一次**全量跑报的是「**Test Files 3 failed | 200 passed**」但只有 1 条用例失败、总数 2152;紧接着原样复跑得到干净的「1 failed | 202 passed」、总数 2173。两次都在同一个工作树、同一份代码上,差异是 2 个文件未能收集(少了 21 条用例)。我**没有**查明成因,所以不写推测;记录它是为了让后来者知道:这台机器上全量套件偶发「文件级失败但无对应用例失败」,遇到时先原样复跑一次再判断。对本轮的结论无影响 —— 宠物的 95 条在两个文件级视图下都是绿的。
- **未覆盖项(诚实记录)**:① 五个子分的阈值**数值**只被相对边界钉住(`<5` 改 `<6` 会红),但「5 这个数本身对不对」无从测 —— spec §15 开放项 2 已明确阈值是猜的、需上线校准,模块注释里也写明了。② `byUnrecoverable` 的 2→3 跳档在真实数据里**从未触发过**(Task 0 实测 0/138),它的正确性只有合成 fixture 支撑,与 spec §7 的记载一致。③ 本轮仍无 DOM 测试(纯函数,正确);④ `FATIGUE_FPS_SCALE` 只钉了表值(`[1, 0.9, 0.75, 0.6]`)与「一次性态不衰减」,没有验证 0.6 这个下界在浏览器里观感是否合适 —— 那属于 Task 7 的浏览器验收范围。

## Task 3: 资产契约与占位帧

**Files:** Create `frontend/public/pet/parrot/{manifest.json,idle.webp,wait.webp}`

- [x] **Step 1:** 写 `manifest.json`,按 spec §8 的形状(`frameWidth` / `frameHeight` / `fallback: "idle"` / `states`)。**第 1 期只声明 `idle` 与 `wait` 两个条目** —— 其余状态故意不声明,用来验证回落契约真的生效。
- [x] **Step 2:** 出**占位帧**(纯色块 + 状态名文字,横向单行,`idle` 2 帧 / `wait` 2 帧即可)。目的是让链路能跑通并可浏览器实测;真图由用户后续替换,替换时**代码零改动**(spec §8 规则 1、2)。占位帧必须满足契约:两组同 `frameWidth × frameHeight`。
- [x] **Step 3:** `manifest.json` 用**静态 `import`** 引入(spec §11 裁决),不运行时 fetch。确认 TS 能解析 JSON import(`tsconfig.json` 的 `resolveJsonModule`)。
- [x] **Step 4(manifest 自洽断言):** 在 `sprite.test.ts`(或独立 `manifest.test.ts`)里对**静态 import 的真 manifest** 逐态断言 `sheetWidth === frames × frameWidth`、`sheetHeight === frameHeight`(spec §8 自校验;占位帧阶段即生效:2 帧 × 512 ⇒ `sheetWidth: 1024`、`sheetHeight: 512`)。防的是「重导了 sheet 却忘改 manifest 的 frames」这类不同步:它不报错,只表现为某态播到尾巴花屏/空白。

**Task 3 交付纪要(2026-09-10)**

- **产出**:`frontend/public/pet/parrot/` 下三个文件 —— `manifest.json`(只声明 `idle` / `wait`,其余状态故意不声明以验证回落)、`idle.webp`、`wait.webp`(**各 2 帧、1024×512**,即 `2 × 512` 与 `frameHeight`)。
- **RED**:`Cannot find module '../../../../public/pet/parrot/manifest.json'`(0 用例收集)。
- **GREEN**:`sprite.test.ts` 11 → **16 例**(新增 5:1 条 `idle` 必需 + fallback 可达,2 个状态各 1 条宽、1 条高),`core/pet/` 累计 **100 例**全绿。
- **静态 import 已验证**:`tsconfig.json` 的 `resolveJsonModule: true`;测试从 `tests/unit/core/pet/` 用相对路径 `../../../../public/pet/parrot/manifest.json` 引入真文件,Rstest 的 node 工程正常解析(用例通过即证明),`tsc --noEmit` 也通过 —— 即 spec §11 的「静态 import,不运行时 fetch」成立。渲染器(Task 4)按 `${sprite}.webp` 取同名文件,故文件名必须等于 state key。
- **revert proof(2 次 neuter)**:

  | # | 被 neuter 的行为 | 改动 | 转红 |
  |---|---|---|---|
  | P1 | `sheetWidth === frames × frameWidth` | `idle.frames` 改 3、`sheetWidth` 保持 1024 | **恰好 1 条**,且用例名直接点名 `idle` |
  | P2 | fallback 必须可达 | `fallback` 指向未声明的 `think` | 恰好 1 条 |

- **manifest 与真实文件的一致性(人工取证,非测试)**:`ffprobe` 逐张读出 `idle.webp` / `wait.webp` 均为 **1024×512**,与 manifest 的 `frames: 2 × frameWidth: 512` / `frameHeight: 512` 吻合。
- **诚实记录的边界**:Step 4 的断言按 spec §8 的要求是**纯算术、不解码图片**,所以它只能发现「manifest 内部两个数彼此不同步」,**发现不了**「manifest 的数字与 webp 实际尺寸一起错」或「文件缺失」。后者目前靠人工 `ffprobe` 与 Task 7 的浏览器实测兜(资产缺失时渲染器回落成「不渲染任何节点」,是静默降级)。若想把「资产文件本身」也钉住,可在 node 里读 RIFF/WEBP 头 30 行左右拿到真实尺寸再比对 —— 本轮**没做**(计划与 spec 都明确把这条限定为算术自校验),需要的话是一个独立小改动。
- **占位帧的两处设计决定**:① **fps 用真实值 8,只把帧数降到 2** —— 这样 Task 7 观察到的播放节奏就是上线节奏,将来换真图只改 `frames` / `sheetWidth` 两个数据(P1 那个断言正好守它);代价是 2 帧 @8fps 只有 0.25s,肉眼是明显闪烁,但占位阶段这是**诚实的**占位表现。② 两组用**蓝系 / 琥珀系**区分并各印状态名(`IDLE n` / `WAIT n`),使 Task 7 那条唯一交付判断「『在等你』与『跑完了』视觉上分得开」在占位阶段就可判读。生成方式:ffmpeg `drawtext` + `hstack`(`libwebp` 编码),无新增依赖、无仓库内脚本。
- **门禁**:`pnpm check` 干净;`core/pet/` 100 例全绿。**本轮未重跑全量套件** —— 改动只有新增资产 + 一个测试文件的新增 describe,不触碰任何既有源文件;上一次全量(2 小时前)是 2173/2172/1(唯一失败为本机预存那条)。Task 4 会改 `pet-sprite.tsx` 等新文件,那时再跑全量。
- **未覆盖项**:① 占位帧没有做「非 512 尺寸会被拒」的负向校验(渲染器侧不校验,靠 Task 4 的等宽假设);② manifest 只声明两个状态,故 `work-{kind}` / one-shot 等回落路径的真实资产不存在 —— 这正是第 1 期要验的回落行为,由 Task 7 用浏览器确认。

## Task 4: 渲染器组件(TDD,唯一 DOM 测试)

**Files:** Create `frontend/src/components/workspace/pet/pet-sprite.tsx` + `frontend/tests/unit/components/workspace/pet/pet-sprite.dom.test.tsx`

- [x] **Step 1(先写红测试):** **只测三件**(spec §13.2,刻意压最小):① `motion-reduce` 下不加 animation、停在第 0 帧;② one-shot 播完(`animationEnd`)后回调触发、回到 base;③ 开关关掉时不渲染任何节点。其余逻辑已被 `sprite.ts` 在 node 环境覆盖,**不要在 DOM 测试里重复测回落**。
- [x] **Step 2:** 实现 `pet-sprite.tsx`:只吃 `{ base, workKind, fatigue, oneShot }` + manifest,用 `background-position` + `animation: ... steps(N)` 播放。**不引任何动画库**。`pointer-events-none` 在这一层就加上。盒子边长取 manifest 的 `displaySize` 并**取偶数整数 CSS px**(spec §10:帧宽在设备像素上对齐,防右缘邻帧鬼影;DPR 1.5 下偶数即整数设备像素)。
- [x] **Step 3:** 转绿 + `pnpm check`。

**Task 4 交付纪要(2026-09-10)**

- **产出**:`src/components/workspace/pet/pet-sprite.tsx`(新)、`tests/unit/components/workspace/pet/pet-sprite.dom.test.tsx`(新,唯一 DOM 测试),外加**计划未列的一个改动**:`src/styles/globals.css` 增 `@keyframes pet-play` + `.pet-sprite { animation-name: pet-play; }`(见下「订正」第二条,附锚定理由)。
- **RED**:`Cannot find module '@/components/workspace/pet/pet-sprite'`(0 用例收集)。
- **GREEN**:**4 条 DOM 用例**(计划的三件 —— ① 我把「允许动效时确实带 animation」折进同一条,否则「无 animation」的断言在组件压根不动画时也会通过;② 一次性播完回调 + 回 base;③ 解析不到时不渲染节点)。node 侧宠物套件不受影响:**100 例**仍在。
- **订正一(实现层,已在真实浏览器实测)**:`steps(N)` 必须写成 **`steps(N, jump-none)`**。百分比行程下背景可移动范围是 `(N-1)×盒子宽`,第 k 帧落在 `100k/(N-1)%` —— 正是 `jump-none` 输出的 N 个离散值;裸 `steps(N)` 输出 `k/N`,**永远播不到末帧**(实测 N=4:33.3333/66.6667/100% vs 25/50/75%)。`CSS.supports('steps(4, jump-none)') === true`。**spec §9.1 的片段已按此订正**(含实测表),这是本轮发现的一个真问题、不是风格偏好。验证方式:临时 HTML 探针 + `animation-play-state: paused` + 负 `animation-delay` 采样 4 个进度点,探针文件已删。
- **订正二(资源层)**:`@keyframes` 必须落在全局 CSS,而组件把 animation 写在**内联 style** 里 —— 若 keyframes 只被内联字符串引用,生产构建有把它当未使用符号剪掉的风险。故在 `globals.css` 里同时加了一条 `.pet-sprite { animation-name: pet-play; }` 作为锚定规则(该 class 由组件常量携带),并注明原因。这是计划文件清单外的一处必要改动。
- **revert proof(4 次 neuter,各恰好 1 条)**:

  | # | 被 neuter 的行为 | 改动 | 转红 |
  |---|---|---|---|
  | R1 | 减弱动效时不加 animation | 守卫改成恒真 | 恰好 1 条(reduced 那条) |
  | R2 | 一次性播完回调 | 删 `onAnimationEnd` | 恰好 1 条(one-shot 那条) |
  | R3 | 解析不到不渲染节点 | `return null` → `return <div/>` | 恰好 1 条(空 manifest 那条) |
  | R4 | `steps(N, jump-none)` | 退回裸 `steps(N)` | 恰好 1 条(正向动画那条) |

- **两处实现决定**:① **manifest 走 prop 而非在渲染器里 import** —— 渲染器因此完全纯净、可用内联 fixture 测(one-shot 那条必须用 fixture,真 manifest 第 1 期没有 `done`)。真 JSON 的静态 import 由 Task 5 的订阅者承担;计划 Task 3 Step 3 只要求「静态 import」,没指定落点。② 精灵根节点带 `aria-hidden="true"`(spec §13.1)—— 它在任何外壳里都是装饰件;拖拽命中矩形的 `aria-hidden` 随 Task 5 的外壳一起。
- **口径对齐(本批已收敛)**:spec §13.2 的表格原把 **5 条** DOM 用例都挂在本文件(含 Alt+拖拽、开关关闭、aria-hidden),而计划 Task 4 只要求 3 条 —— 两处口径不一致。本轮已按**组件归属**把 spec §13.2 改成两行:`pet-sprite.dom.test.tsx` 三件(渲染器),新增的 `agent-pet.dom.test.tsx` 两件(开关关闭不渲染、Alt+拖拽更新 offset 且未按 Alt 不起拖),aria-hidden 的断言归外壳。Task 5 需据此真的建出 `agent-pet.dom.test.tsx`。
- **门禁**:`pnpm check` 干净(先报 4 条 `@typescript-eslint/no-empty-function`,已修);DOM 4/4、node 100/100;**全量 `pnpm test`:2182 例 / 2181 通过 / 1 失败**(204 文件 / 1 失败)。唯一失败与前一次全量的 1 file/1 test 完全同形,判据同前(本机预存 `knowledge/chat-panel.dom.test.tsx`,该文件与其被测路径在本树零改动);本次日志经 `tail -8` 截断,故未再读一遍失败名。
- **未覆盖项(诚实记录)**:① `evenBoxSize` 的奇数入参路径(97→98)已实现但无测试 —— 第 1 期 `displaySize` 恒为 96,该分支随缩放功能才可达;② 减弱动效的判定发生在 `usePrefersReducedMotion` 的 effect 里,即**首帧之后**才纠正(SSR/首绘可能短暂带 animation);纯 CSS 的 `@media (prefers-reduced-motion: reduce)` 能消掉这个窗口,但计划要求的是可测的 JS 形式,故未加 CSS 兜底 —— 要点可后补;③ `steps()` 的采样验证是在**独立探针页**做的,尚未在应用内真实 sheet 上复验(真 manifest 只有 2 帧、看不出漂移),这一环并入 Task 7。

## Task 5: 订阅者组件 + 设置节

**Files:** Create `frontend/src/components/workspace/pet/agent-pet.tsx`;Modify `frontend/src/core/settings/local.ts`

- [x] **Step 1:** `local.ts` 的 `LocalSettings` 类型与 `DEFAULT_LOCAL_SETTINGS` 各加一节 `pet: { enabled: true }`,形状照抄 `notification`(`:5-7`)。**不写迁移**(按节 merge 自动补默认)。
- [x] **Step 2:** `agent-pet.tsx`:读 `useThread()`(`components/workspace/messages/context.ts`),按 spec §12 把两个消息扫描 **memo 在 `messages.length` 上**;`hasOpenHumanInputRequest` 的调用**逐字照抄** `page.tsx:262-269`(同 `useMemo` 键 `[thread.messages]`、同过滤器 `!isHiddenFromUIMessage`)。
- [x] **Step 3:** 组件内 ref:`wasLoading`(下降沿检测)、`greet` 一次性触发、`elapsedMs` 起点(spec §15 开放项 6:记「首次观察到 `isLoading === true`」的时刻)。**跨线程重置**:以 `threadId` 为键把 fatigue / wasLoading 归零,`greet` 不重放(spec §11 裁决)。
- [x] **Step 4:** 开关关掉时直接返回 `null`(不留 DOM 节点,与 `notification.enabled` 行为一致)。
- [x] **Step 5(自由放置,spec §10.1):** 设置节加 `offset: { right: 12, top: 56 }`;`core/pet/placement.ts` 实现 `clampOffset` 纯函数 + node 测试;`agent-pet.tsx` 实现 Alt+拖拽:window 级 `pointerdown` 判断 Alt 且指针落在宠物盒矩形内(矩形由 offset + displaySize 算出,**不给宠物 pointer-events**),`pointermove` 更新 offset、`pointerup` 写回 `pet.offset`;渲染时 clamp 到面板可见区。设置行加提示文案与重置位置按钮。手势三件套照抄 Qoder 实测值:**位移 > 4px 才起拖**(Alt+单击不算拖拽)、记 `pointerId` 并 `setPointerCapture`(`pointerup` 释放、`pointercancel` 同样收尾)、**起过拖的手势吞掉紧跟的那次 click**(否则松手会点开底下的消息链接)。
- [x] **Step 6:** `pnpm check`。

**Task 5 交付纪要(2026-09-10)**

- **产出(10 个文件)**:新建 `core/pet/placement.ts`、`components/workspace/pet/agent-pet.tsx`、`components/workspace/settings/pet-settings-page.tsx`、`tests/unit/core/pet/placement.test.ts`、`tests/unit/components/workspace/pet/agent-pet.dom.test.tsx`;改 `core/settings/local.ts`(pet 节 + **嵌套 offset 的 merge** —— 这才是「无需迁移」的依据)、`settings-dialog.tsx`(dynamic + union + nav + render + useMemo 依赖)、`styles/globals.css`(`.pet-shell` 窄面板隐藏)、i18n `en-US.ts` / `zh-CN.ts` / `types.ts`(三处都要,漏 `types.ts` 会 tsc 失败)。
- **RED→GREEN**:`placement.test.ts` RED = 模块不存在 → 8 例;`agent-pet.dom.test.tsx` 首轮 6 例(其中一条因我把「未拖拽时 localStorage 为空」写成「等于默认值」而假红,已改成先播种设置再断言未被改写)→ 最终 **7 例**(中途补的见下)。
- **revert proof(6 次 neuter)**:

  | # | 被 neuter 的行为 | 改动 | 转红 |
  |---|---|---|---|
  | S1 | 开关关闭不渲染 | 守卫改恒假 | 恰好 1 条 |
  | S2 | 必须按 Alt 才起拖 | 去掉 `altKey` 判断 | 恰好 1 条 |
  | S3 | 4px 起拖阈值 | 阈值改 0 | 恰好 1 条 |
  | S4 | 拖后吞掉那次 click | 不再置吞点标志 | 恰好 1 条 |
  | S5 | 松手写回设置 | 删 `setSettings` | 恰好 1 条 |
  | S6 | `clampOffset` 真的夹取 | 改成恒等函数 | placement 5 条(两条「保持不变」的用例仍绿,恒等函数恰好满足它们,形态正确) |

- **当场补的有牙用例**:S4 的 neuter 让我发现「拖后吞 click」虽然实现了却**没有任何测试**——补了一条 DOM 用例(拖拽后紧跟的 click 不得到达下层、无拖拽的 click 照常送达),再 neuter 才转红。计划把这条只排在 Task 7 的浏览器验收里,但它是纯事件逻辑,DOM 测试更便宜。
- **同一纪律下的反向决定**:我一度加了一条「跨线程重置」的 DOM 用例,写好就发现它**没有牙** —— 真 manifest 第 1 期没有 `done`/`greet` 帧,闩锁在或不在渲染出的都是 `idle.webp`,断言两边相同。已删除,缺口记在下方未覆盖项。
- **计划未命名的必要改动(4 处)**:① **两条相位闸门常量** `FATIGUE_ENABLED` / `WORK_KIND_ENABLED`(§18 要求第 1 期「两条轴写好但不生效」,而 Task 5 只说了要接线);② `greet` 只在 `base === "idle"` 时注入,避免「在等你」或报错时还挥手;③ 可见区用 **ResizeObserver**(计划说「渲染时 clamp」,但纯渲染时测量在面板被拖窄时不会重算,Task 7 Step 5 会验不过);④ `.pet-shell` 的 `@container (max-width: 480px)` 规则写在 `globals.css`(容器上下文由 Task 6 在 `div#chat` 上提供),没用 Tailwind 变体语法以免押注其写法 —— Task 7 用浏览器确认。
- **给 Task 6 的三个对接事实**:① `ChatBox` **已经**接收 `threadId: string`(`chat-box.tsx:78`),挂载直接 `<AgentPet threadId={threadId} />` 即可,§11 的跨线程键不用另找来源;② 窄面板隐藏需要 Task 6 在 `div#chat` 上加 `[container-type:inline-size]`(Task 0 Step 2 已实测该挂法布局零变化);③ 设置 store 的 `baseSettings` 是**模块级缓存**,只清 localStorage 不会复位(DOM 测试的 afterEach 已按此处理,写新测试时注意)。
- **门禁(如实)**:我的路径 `eslint` 干净、`tsc` 无错;但仓库级 `pnpm check` **当前是红的,原因不在本线** —— 并发会话的 `src/core/rag/config-form.ts` 报 3 条 eslint(`no-unnecessary-type-assertion` ×2、`prefer-optional-chain` ×1)与 2 条 tsc(第 154/159 行 `string` 不能赋给 `"funasr" | "whisper" | null | undefined`),来自提交 `074b783c`。按纪律我没有改他们的文件;等他们那批落地后 `pnpm check` 自会转绿。宠物侧本轮实跑:**node 108 例 + DOM 11 例全绿**。
- **未覆盖项(诚实记录)**:① **跨线程重置无测试**:行为已实现(以 `threadId` 为键清 done 闩锁与计时起点、greet 不重放),但它的可观测效果要等第 2 期有 `done`/`greet` 帧才出现,第 1 期写了也是没有牙的断言(见上);Task 7 Step 7 的浏览器验收同样受此限制,需在有帧之后才真正生效。② **`elapsedMs` 无 ticker**:在渲染时按 `Date.now() - 起点` 计算,故一次安静的长 run(长时间无流事件)里时间驱动的疲劳不会自己推进,要等下一次渲染 —— 第 1 期疲劳闸门关着,影响为零,第 2 期打开时需要补一个低频 ticker 或接受该滞后。③ 疲劳/workKind 两条轴按 §18 恒为 0 / 空数组,尚未生效(第 2、3 期的常量开关)。④ `setPointerCapture` 在 happy-dom 下不可用,该句由 `?.` 兜底;真实指针捕获行为要 Task 7 在浏览器里验。

## Task 6: 挂载

**Files:** Modify `frontend/src/components/workspace/chats/chat-box.tsx`

- [x] **Step 1:** 在 `:413` 的 `div#chat` 内、`{children}` 之后加 `<AgentPet />`,定位 `absolute z-20 pointer-events-none`,`right/top` 读设置 `pet.offset`(渲染时 clamp,默认 12/56 即 right-3 top-14,spec §10.1)+ Task 0 Step 2 裁定的窄面板隐藏方式。**只改桌面分支,mobile 分支(`:349-353`)不动**(spec §10 裁决)。
- [x] **Step 2:** 确认没有触碰 `pinnedContentWidth` / `animatingRightPanel` / `handlePanelGroupLayoutChanged` / `handleSidePanelResize` 任何一处(spec §2.6 已核实四条全在侧面板)。
- [x] **Step 3:** `pnpm check` + `pnpm test` 全量。

**Task 6 交付纪要(2026-09-10)**

- **产出**:只有 `chat-box.tsx` 一个文件、**两个 hunk**:① `div#chat` 的 className 加 `[container-type:inline-size]`(并把该 div 展开成多行);② `{children}` 之后挂 `<AgentPet threadId={threadId} />`。定位、`right/top`、clamp、窄面板隐藏类都已在 Task 5 的 `agent-pet.tsx`/`globals.css` 里,挂载点只决定「放进哪个盒子」—— 所以这一步比计划预期的还小。
- **Step 2 的证据**:`git diff -U0` 对四处侧面板符号(`pinnedContentWidth` / `animatingRightPanel` / `handlePanelGroupLayoutChanged` / `handleSidePanelResize`)**零命中**,即四条约束全未触碰。
- **为什么不加测试**:本步是集成挂载,没有独立可测的行为;给它写 DOM 测试要拉起 AuthProvider/i18n/`ThreadContext` 等一整条上下文链,而它真正的验收是 Task 7 的浏览器阶梯。计划 Step 3 也只要求 check + 全量,故**有意不加**,如实记录。
- **门禁**:`chat-box.tsx` 的 eslint 干净;**全量 `pnpm test`:2226 例 / 2225 通过 / 1 失败**(208 文件 / 1 失败)。这一次**点名确认**了失败:`knowledge/chat-panel.dom.test.tsx`「restores the remembered model per kb…」,签名同前(`expected undefined to be 'qwen-plus'`)—— 并额外排除了一个真实风险:知识库面板**不引用** `ChatBox`(grep 无命中),故我的挂载到不了那条测试。
- **仓库级 `pnpm check` 仍红,原因不在本线**:并发会话的 `src/core/rag/config-form.ts` 剩 1 条 eslint(`prefer-nullish-coalescing`,第 203 行;他们已把先前的 3 条 eslint + 2 条 tsc 清掉)。等他们那批落地自会转绿。

## Task 7: 浏览器验证阶梯(**不可用单测替代**)

- [x] **Step 1:** `pnpm dev`,开一个线程。验证 `idle` 播放。— **通过**(见下「已验」)。
- [x] **Step 2(核心验收):** 触发一个 `ask_clarification`(让 agent 需要追问),验证鹦鹉切到 **`wait`**;再发一条普通消息跑完,验证鹦鹉播 **`done` 一次性动画后回 `idle`**(第 1 期 `done` 无帧 → 应回落到 `idle`,这正是要验的回落行为)。**两者视觉上必须分得开** —— 这是本期唯一交付判断。— **通过**(琥珀 `WAIT 2` 与蓝 `IDLE 1/2` 视觉可分,截图 + 程序化序列双证)。
- [x] **Step 3:** 触发一个 `error`(断网或配错模型),验证 `error` 态;确认 `error` 压掉 `done`(spec §5.3 不变量 1)。— **已闭环(2026-09-18,用户要求「重跑一次桩验证钉死」)**:既没断网、也没动模型配置,改用**桩** —— `evaluate_script` 覆写 `window.fetch`,只拦 **GET + `/runs/{rid}`**(排除 `/stream` / `/join` / `/events`)并回 `{status:"error", stop_reason, error}`;在 `/workspace/chats/new` 用**原生 setter + `input` 事件**填 `textarea`、**隔一拍**点 `button[aria-label="Submit"]` ⇒ run 跑完(`Stop` 按钮消失)后精灵落在 `url("/pet/parrot/error.webp")`(`3.875s steps(31, jump-none) infinite`),桩被调 **3 次**。该 run **正常收尾** ⇒ `done` 的下降沿闩锁本会点亮、且 manifest 里 `done.webp` **确实存在** ⇒ 「`error` 压 `done`」这次是**活体证据**,不再只是 node 用例(`state.test.ts` 不变量 1)。收尾按纪律做全:`armed=false` + **reload**(patch 随新 JS realm 消失,复查 `window.__runErrStub === undefined`、精灵回 `greet.webp`)。**副作用(已如实告知)**:在他账号里新建线程 `bb7de398-d121-444c-bb37-6d50d0730f9d`(run `7990c8d7-…`,一句「你好」+ 真回复),是否删除待他定。
- [x] **Step 4:** 在有未回答的 clarification card 时直接发新消息开新 run,验证鹦鹉走 `work`/`think` 而非 `wait`(spec §5.3 不变量 2)。— **通过**(窗口内从未出现 `wait`);局限见下。
- [x] **Step 5:** 开右侧 artifacts/sidecar 面板并把分隔条拖到最窄,验证窄面板隐藏生效、且**拖拽手感无变化**(没碰到 ResizablePanelGroup 约束)。— **全通过(2026-09-10,用户造出 `hello.txt` 后右侧面板可开)**:分隔条**真拖生效** —— chat 面板 538 → **318**(左移 220px)、side 面板 359 → **579**,拖拽期间库自己的 `data-separator` 从 `inactive` 翻成 **`active`**(说明手势被正常接管、约束没被本线加的 `container-type` 弄坏);chat 落到 318(≤480)时 `.pet-shell` **`display: none` 但节点仍在**(`petExists: true`)⇒ 隐藏是纯 CSS、不是卸载;拖回后 chat=538 / side=359 **与初始完全对称**,`.pet-shell` 自动回到 `display: block`、精灵仍 96×96 且背景仍是 `idle.webp` ⇒ **状态未丢**。全程 console **零报错**;另外单独验了一条副作用:不按 Alt 的分隔条拖拽**不改变宠物偏移**(51/166 → 51/166)。
- [x] **Step 6:** 系统开启「减少动态效果」,验证停在静态帧。关掉设置开关,验证 DOM 里无残留节点。— **开关关闭通过**(`pet.enabled=false` 刷新后 `.pet-shell`/`.pet-sprite` 各 0 节点);**「减少动态效果」未在浏览器验**:browser-use 未暴露 CDP `Emulation.setEmulatedMedia`,改不了该媒体特性,已由 DOM 测试覆盖(无 animation + 停第 0 帧)。
- [x] **Step 7:** 切线程再切回,验证 fatigue 归零、`greet` 不重放。— **两半分开记(2026-09-13 修订;`greet` 半 2026-09-18 收口)**:
  - **`fatigue` 归零那一半:永久不可观测,不再是待办。** 疲劳轴于 2026-09-12 被用户明确「不做」(spec §17),`FATIGUE_ENABLED` 恒 `false` ⇒ 疲劳永远是 0,没有可观察的差异。这一半**不可能再验**,不要再把它当作「未完成的验证」。
  - **`greet` 不重放那一半:前提已满足,且已取得活体证据(2026-09-18)。** ① `greet` 有真帧且**挂载确实会播** —— 三次冷加载 `.pet-sprite` 都是 `greet.webp`(`3.75s steps(30, jump-none) 1 both`);② **一次性态的 `animationend` 回落链路在真栈跑通** —— 派发真 `AnimationEvent('animationend')` ⇒ 翻到 `idle.webp`(`3.875s steps(31) infinite`),**同一 DOM 节点**;③ 随后经命令面板「新对话」触发**一次真 SPA 换页**(正文从会话页换成欢迎页),宠物**仍是同一个 DOM 节点**(探针标记未丢)、精灵全程 `idle` ⇒ **「切走不重放」已直接观测**;④ 「切回来不重放」由「外壳从不重挂」+ `greetActive` 是**挂载作用域**的 `useState(true)`、只由 `animationend` 清掉(`agent-pet.tsx:131-138` 的跨线程重置**故意不动它**)推出。**未直接观测的一项(诚实记录)**:回程那一段 —— 驱动端 0×0 且隐藏,**该页没有可达的导航控件**(无侧栏触发器;`history.back()` 落到我自己早先污染的历史条目上又被 App Router 同步回同一路由;宠物自身的 Alt+单击跳转在新会话页无目标),要**可见窗口**才能补。
- [x] **Step 8:** `cd frontend && pnpm perf:check` 跑一次确认预算未破。— **已跑,结论是「工具修好了,但这份检查全局红,与本线无关」**。过程:先确认脚本缺陷(裸名 `spawn("pnpm")`,`measure-route-assets.mjs` 里仅两处;Windows 只有 `pnpm`/`pnpm.CMD`/`pnpm.ps1`,Node 不加 shell 不解析 PATHEXT)⇒ 用户在 PowerShell 里复现同一 `spawn pnpm ENOENT`,证明**本机对谁都跑不了**、不是我 shell 的限制(我先前那个归因是错的,已在记忆里订正)。随后按用户确认修掉:改用 `process.execPath` + `node_modules/next/dist/bin/next`(`build`/`start` 两处),**不用 `shell: true`** —— 在 Windows 上 `shell: true` 只能杀掉 `cmd.exe`,会把真正的 `next start` 孤儿留在端口上,而脚本后面靠 `server.kill()` 收尾。修完用户重跑,构建与摘要正常产出(即修复有效)。

  **实测结果(用户终端,原始字节)**:六条路由**全部超**——`/en/docs` 与 `/blog/posts` **js +1.43 MB**、css +17.8 KB;`/login` js +30.3 KB、css +14.8 KB;`/` css +13.7 KB;`/workspace/chats` js **+8.9 KB**、css +19.5 KB。两条支撑事实说明这是**阈值失真而非本线回归**:① 这份检查**不在 CI 里**(`.github/` 零引用),是纯手工工具;② 预算表最后一次改动是 `459dd787`(PR #4622),此后应用长了很多功能。**宠物只加载 `/workspace/chats` 一条**,且那条的 css 超支 19.5 KB 与宠物无关(本线 CSS 贡献 < 1 KB:一个 `@keyframes` + 两条类规则);js 那 8.9 KB 里宠物的占比**未实测**——用户明确选择「不再为它花一次构建」(前提是那不改变结论:即便宠物占满 8.9 KB,其余五条仍红线)。
- [x] **Step 9(自由放置):** Alt+拖拽鹦鹉到新位置,刷新页面验证持久化;拖窄 sidecar 验证盒子被 clamp 在可见区内不出屏;不按 Alt 在鹦鹉位置按住拖动,验证不起拖且点击穿透到下方内容;**Alt+按住但位移 < 4px 后松手,验证鹦鹉没动**(阈值生效);**把鹦鹉拖到一条消息链接上松手,验证链接没有被点开**(拖后吞 click 生效);**拖拽全程验证鹦鹉仍播当前态、不切态**(§10.1 拖拽不进状态机)。— **六项全通过**(clamp 一项用「越界拖」代替「拖窄 sidecar」,见下)。

**Task 7 交付纪要(2026-09-10,自动化浏览器视口 842px)**

**已验(真实应用内,程序化取证;截图见交付汇报)**
- **Step 1 `idle` 播放**:`#chat` 的 `container-type: inline-size` 生效;`.pet-shell`/`.pet-sprite` 均 **96×96**,位于 `right≈12 / top=56`;`pointer-events: none`、`aria-hidden="true"`;背景 `url(/pet/parrot/idle.webp)`、`background-size: 200% 100%`;动画 `pet-play 0.25s steps(2, jump-none) infinite`;**两次采样背景位置 `100% → 0%` 证明真在播放**(不是冻结在第 0 帧)。
- **Step 2 核心验收**:发一条要求 `ask_clarification` 的指令 → 精灵序列 **`idle.webp → wait.webp`**,与「需要你的协助」卡片同时出现(14s);截图存证琥珀 **`WAIT 2`**。随后卡片未答时发普通消息 → 卡片转「**已回答**」,窗口内**只出现 `idle.webp`、从未回到 `wait`**,跑完仍 `idle` ⇒ **`done` 无帧时回落 `idle` 成立**。两者视觉可分(琥珀 WAIT vs 蓝 IDLE)= **本期唯一交付判断通过**。
- **Step 4 不变量 2**:同一次发送即「未回答请求 + 新 run 在飞」,观测为 `idle`(相位 1 下 work/think 都回落 idle)而非 `wait`。
- **Step 6 开关关闭**:`pet.enabled=false` + 刷新 ⇒ `.pet-shell` 与 `.pet-sprite` **各 0 个节点**(无残留);恢复后 1 个、位置回默认 12/56。
- **Step 9 六项**:① Alt+拖 → 存 `{right:72,top:96}`(= 12+60 / 56+40,方向符号正确),**刷新后渲染仍是 72/96**(持久化);② 越界拖 → 存原始 `right:-2108` 但**渲染被 clamp 在面板内**(右下贴边、`insidePanel:true`),**clamp 不回写设置**;③ 不按 Alt 拖 → offset 不变(点击穿透);④ Alt+2px → offset 不变(4px 阈值);⑤ 拖后首次 click 送达 **0** 次、下一次 **1** 次(吞 click);⑥ 拖拽中途 5 次采样**始终 `idle.webp`**(手势不进状态机)。
- **Step 5 隐藏机制**:`#chat` 内联压到 400px ⇒ `.pet-shell` `display:none`;撤掉即 `block` —— 说明 Task 6 的容器上下文 + `globals.css` 的 `@container (max-width: 480px)` 规则在真实应用内成立。

**未验(逐条给出原因,不含推测)**
- ~~**Step 3 `error` 态**~~ **已闭环(2026-09-18)**:改用桩法(只拦 GET `/runs/{rid}` 并回 `status:"error"`,在用户的 `:3000` 真栈)验成 —— 精灵落到 `error.webp`,`error` 压 `done` 取得活体证据。详见该 Step 的注文。
- **Step 6「系统减少动态效果」**:browser-use 未暴露 CDP 媒体特性模拟 ⇒ 浏览器侧无法验;DOM 测试覆盖了同一行为。
- ~~**Step 7**~~ **已收口(2026-09-18)**:`fatigue` 半**因疲劳轴取消而永久不可观测**(不是待办);`greet` 半已取得活体证据(冷加载播 `greet` + 一次真 SPA 换页后**仍是同一 DOM 节点**且精灵 `idle`)⇒ 「切走不重放」已直接观测,「切回来不重放」由「外壳从不重挂 + `greetActive` 是挂载作用域」推出。**唯一未直接观测的是回程那一段**(需可见窗口)。详见该 Step 的注文。
- **Step 8 之外的预算归属**:`pnpm perf:check` 本身已跑通(见上),但「宠物在 `/workspace/chats` 那 8.9 KB js 超支里占多少」**未实测** —— 用户明确选择不为此再花一次构建,理由是该数字不改变结论。

**两个环境事实(供后来者)**
1. **自动化浏览器视口必须 ≥768px**。否则 `(max-width: 767px)` 命中 → `useIsMobile()` 为真 → ChatBox 走 **mobile 分支**,而第 1 期按 §10 裁决只在桌面分支挂载 ⇒ DOM 里找不到 `.pet-shell` **是正确行为,不是缺陷**。本次实测:初看 661px(找不到宠物)、Task 0 时为 808px,用户拉宽到 842px 后才可测。
2. **该浏览器里合成输入对编辑器不可靠**:`value` setter + `input` 事件 + 点击 `Submit` 只成功过一次,之后同一手法与 `dispatchEvent(Enter)`、`press_key("Enter")` 均未能提交;需改用原生 `fill`(要从 snapshot 取 uid)。因此 Step 2/4 的第二次 run 是靠**第一次成功发送**的窗口完成的。

## Task 8: 文档同步(仓库强制约定)

- [x] **Step 1:** `frontend/AGENTS.md`:`src/` 结构清单加 `core/pet/` 域;Interaction Ownership 加一条「宠物挂载点在 `chat-box.tsx` 桌面分支的 `div#chat`,mobile 分支故意不挂」。— **已加**:`core/` 域清单里补 `pet/`(写明五个纯函数 + 组件在 `components/workspace/pet/`);Interaction Ownership 顶部新增一条,把三条不变量一次说清 —— (a) 挂载点与**它自己带容器上下文**(否则 `@container` 会量到 group、永不触发)、mobile 分支故意不挂;(b) 观察者纪律(只读 `useThread()` 派生,不发请求、不持有 agent/线程/记忆、不订阅 custom 事件);(c) 精灵恒 `pointer-events-none`,自由放置靠 window 级命中测试 + Alt 拖拽(4px 阈值、pointer capture、拖后吞 click)。
- [x] **Step 2:** 把 Task 0 两步的核实结论写回 spec §15(开放项 8 关闭或改写、§10 的断点方式定案)。— **Task 0 时已写回,本步只做确认**:§15 开放项 8 已改为「已闭环」并附四条证据腿;§10 已定案为「挂载点自挂 `container-type`」且措辞更正为 **≤ 480px**(闭区间)。**本步补了一处收口**:§10 末尾原写「Task 7 Step 5 还需再验 sidecar 真拖拽改变 `div#chat` 宽度」,已替换为那次实测的数字(538→318、拖回对称、宠物自动回来、console 零报错)。
- [x] **Step 3:** 若占位帧仍是占位,在 spec §18 分期表标注「第 1 期代码已交付,等待真图替换(零代码改动)」。— **已加**:§18 交付判断句后新增「第 1 期交付状态(2026-09-10)」段:代码已全部交付并挂载(提交序列 `7073c703` → `3da33b9b`)、交付判断已在应用内验证、放置六项与窄面板隐藏已实测;并写明**唯一待外部输入的是美术** —— 占位仍是两张 2 帧 sheet,真图替换时换两个 `.webp` 并把 manifest 的 `frames`(2→32)与 `sheetWidth`(1024→16384)**一起**改(§8 自洽断言会拦只改一个的失误)。
- [x] **Step 4:** `README.md` 是否需要提及由用户定(纯装饰功能,倾向不加)。— **已收口(2026-09-13),结论:无需再加。** README 已被 `4ff9c54c` 改成 **Harness RAG 的落地页**,不再是 DeerFlow 的 Workspace 功能表(全仓已无「功能列表」可挂,本步原方案失效);而它**已经**在「状态」表里带了宠物一行:`| Agent 观测宠物 / Harness 可视化 / 组装画布与对外 MCP | 同一分支上在研,不属于 harness RAG |` —— 定位正确(明确划到 RAG 之外,与对外口径「不写动画」一致)。

---

## 后续期(不在本计划内)

第 2 期(补 `think`/`work`/`error`/`done`/`greet` 帧 + 打开 fatigue)、第 3 期(打开 `workKind` 分类)、第 4 期候选(生成式评论,需先重开 spec §4.1 裁决一)见 spec §18。第 2、3 期是纯美术增量 + 常量开关,**不再碰逻辑也不再碰测试**。
