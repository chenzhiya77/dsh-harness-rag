# 实时脉冲("流程走到哪",§12#6)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让构成视图那条环在 run 进行中**动起来**:一个指针沿环走(N 圈),并显示已经绕到第几圈 —— 今天环是静态的,跑了三分钟、绕了七八圈的 run 在环上看上去和刚起步一样。

**Architecture:** 见 `../specs/2026-09-13-harness-live-pulse-design.md`。**实时性方案 = A(已裁)**:脉冲**从既有 live 状态派生**(页面手上那条 `thread.messages`),**不新增任何订阅/轮询**;计数规则由 Task 0 探针实测钉死(见下)。终点判定复用**已交付**的 `core/run-status/`(那条线刚收官)。渲染侧只给环加一个**可选的 marker prop**(环是 props-only 纯绘制原语,不许教它取数)。

**Tech Stack:** 前端 Next.js 16 / TS / Tailwind 4 / TanStack Query / Rstest(纯逻辑走 node 工程,组件走 happy-dom)。**本项零后端改动。**

**前置(2026-09-13 已冻结,本计划不再议)**:
- **D1 = A**(用户 2026-09-13 裁;依据 Task 0 探针);
- **D2 = 已裁**(用户 2026-09-13 按推荐):"一圈" = 一次 `model→tools` 往返 ⇒ `lap` = **带 `tool_calls` 的根 AI 消息条数**;闸门**不在环上重复**(它们已长在工具卡上);"被拦过几次"不做;
- **D3 = 已裁**(用户 2026-09-13 按推荐):**只在 Dialog 内**做,头部触发器不动;
- **Task 0 探针已完成**(结论见下与 spec §7)。

**测试命令(全程统一):**
```bash
cd frontend && python ../scripts/pnpm.py test            # 全量;单文件过滤:"core/pulse"
cd frontend && python ../scripts/pnpm.py check           # eslint + tsc
node node_modules/prettier/bin/prettier.cjs --check <文件>  # 逐文件;CRLF 文件用「剥 CR 后比对」法
```

**关键事实(Task 0 探针实测,3/3 一致;详见 spec §7):**
- **`lap` 的计数规则(两条,缺一不可)**:按 **message id** 去重(实测一条 run 的根帧 **103 个 `AIMessageChunk` 只对应 2 个 id**——**数帧毫无意义**)、**排除带命名空间的帧**(`messages|<ns>`,实测子代理形如 `tools:<uuid>`)。**好消息**:若从 `thread.messages`(应用已消费的那份)派生,这两条是**结构性成立**的 —— 它本就是"每条消息一次"的列表,且应用不请求 `stream_subgraphs` ⇒ 子代理帧从不进入。**但两条都要有测试钉住**。
- 探针**没有**踩到闸门 tag 本身(两次尝试都没触发),**也没有**复现 `stream_replay_gap` ⇒ 本项不依赖这两样。
- 环的几何齐备:`core/constitution/geometry.ts` 的 `polarPoint(:75)` / `ringLayout(:107)` / `RING_START_DEG(24) = -90` / `RING_SPAN_DEG(43) = spanDeg(5)` / `EXIT_STAGE_KEY(36) = "epilogue"`;`LOOP_TRACK_RADIUS(27)` 已是现成的圈道。
- 环的既有约定(`frontend/AGENTS.md` 构成视图不变量 b):**环吃全部文案作为 props**,两档共用它 ⇒ **判据是它拿不到 `useI18n`**;marker 进来也必须是数据(prop),文案留在调用方。
- 快照是 **fetch-once**(run 内不变),**脉冲是第二条数据通道** ⇒ 不要把两者混成一次拉取。

---

## Task 0: 探针(已完成)

- [x] 私有 `:8099`(`DEER_FLOW_AUTH_DISABLED=1`)+ python 直读 SSE,`stream_mode:["messages-tuple","values","custom"]` + `stream_subgraphs: true`;3 条真 run 量出**根命名空间 distinct AI id == `llm_call_index`**(2=2、2=2、1=1),含命名空间会数成 4。收尾:5 条测试线程**按确定 id** 删除并逐条复核 404、实例停掉、脚本删掉。**结论写回 spec §7。**(用户 `:8001` 全程未碰。)

## Task 1: 数据层 `core/pulse/`(纯函数)—— **已提交 `58578f5f`**(4 文件 / +216 −9)

**Files:** Create `frontend/src/core/pulse/{types,reduce}.ts`、`frontend/tests/unit/core/pulse/reduce.test.ts`

- [x] **Step 1(RED —— 规则表逐条)** `reducePulse(messages, { finished })`:
  - `lap` **只数带 `tool_calls` 的 AI 消息**(最后那条纯文本回答不计一圈);
  - **指针的段**:还没出现任何 AI 消息 ⇒ `intake`(与 `context` 不可分,合并显示);最近一条 AI **带** `tool_calls` ⇒ `tools`;最近一条 AI **不带** ⇒ `model`;`finished` ⇒ `epilogue`;
  - **未知/空输入 ⇒ `null`(不呈现),不猜** —— 与本线其余几项同一条纪律。
  - 用例:① 空 → `null`;② 只有 human → `intake`;③ AI 带 `tool_calls` → `tools`;④ AI 不带 → `model`;⑤ `finished` → `epilogue`;⑥ **混进一条带命名空间标记的消息不影响 `lap`**(钉住规则);⑦ 多轮 model→tools 往返 ⇒ `lap` 递增而指针回到 `model`。
- [x] **Step 2**:`types.ts` 给 `PulseState { stageKey: string; lap: number }`;`reduce.ts` 是**纯函数、零依赖**(不 import React、不 import 任何 hook)。
- [x] **Step 3**:转绿 —— **7 例全绿**。
- [x] **Step 4(revert 证明)**:**两刀都有牙**——去掉 `tool_calls` 判据 ⇒ **3 红**(三条断言圈数的);去掉 `finished` 分支 ⇒ **恰好 1 红**(`parks on the exit arc once the run is over`)。两刀均已恢复,`grep NEUTER` 零残留。
- [x] **Step 5**:单文件 7 绿 + `pnpm check` **exit 0**;prettier 干净(测试文件按 prettier 折了三处长行,行尾仍 LF)。

**交付判据:** 纯函数全绿;模块**不 import React**;未知输入一律 `null`。 **✅ 达成。**

**⚠ 一处偏离(诚实记录)**:计划的用例 ⑥ 原写"**混进一条带命名空间标记的消息不影响 `lap`**"。实施时发现**这个用例没有可断言的对象**:子代理帧**从不进入**这份列表——线程 feed 会滤掉 `subagent` 类别,且应用不请求 `stream_subgraphs` ⇒ **root-only 是"输入"的性质,不是 reducer 能检查的东西**。硬造一个标记字段就是给不存在的场景写代码。⇒ 换成一个真实的不变量:**"只数 assistant 轮"**(`tool` 消息即使带 `tool_call_id` 也不得抬高圈数)。它管住了同一件事里**可能真发生**的那一半;命名空间那半留在 spec §7 作为**要守的输入前提**,并在 Task 5 写进 `frontend/AGENTS.md`。

## Task 2: 文案 + 机具 —— **已提交 `a3da2957`**(1 条文案、2 处机具)

**Files:** Create `frontend/src/core/pulse/pulse-i18n-keys.json`、`frontend/tests/unit/core/pulse/i18n-keys.test.ts`;Modify `frontend/src/core/i18n/locales/{zh-CN,en-US,types}.ts`

- [x] **Step 1(RED)**:清单 + 前端 guard(复用 `tests/unit/support/i18n-key-manifest.ts`)。**先确认红** —— **2 红**(两个 locale 各缺 1 条),清单形状那条当次即绿。
- [x] **Step 2**:**只落 1 条** —— `pulse.lap(n)`:`第 ${lap} 圈` / `Lap ${lap}`(**用户 2026-09-13 授权"你来定"**)。⚠ **砍掉计划的第 2 条 `pulse.markerA11y`**:marker 按 Task 3 的裁决是 `aria-hidden` 的纯装饰,语义由调用方那行**可见的**圈数文本承载 ⇒ 再造一个无障碍名是把同一件事说两遍。**段名也不新增**:环早就有 `labelForStage` prop,文案在构成那套已冻结的 67 条里。
- [x] **Step 3**:**明说为什么没有第三处(后端)guard**:`pulse.*` **不映射任何后端枚举**(不像 `delivery.*` 挂契约的 `stage`、`constitution.*` 挂 middleware 真名)⇒ 只有清单 + 前端 locale + 前端类型三处,少的那一处是**因为不存在跨端对账对象**,不是漏了。
- [x] **Step 4**:转绿(**10 例**:7 reduce + 3 i18n)+ **全量 235 文件 / 2444 例 / 0 失败** + `pnpm check` **exit 0** + prettier 干净(3 个 locale 的残差与 HEAD **逐字相同** 24/30/7 ⇒ 零新增格式债)。
- [x] **Step 5(revert)**:**两刀各自命中** —— zh-CN 删 `lap` ⇒ `missing:['lap']`;en-US 加 `orphanKey` ⇒ `orphans`。恢复后 10 绿,零残留。

**交付判据:** 清单是 `pulse.*` 的完整镜像;文案逐字等于落盘值。 **✅ 达成**(文案由我起草并已报告给用户——他授权自定,但措辞可一句话改)。

## Task 3: 环上的 marker(组件)

**Files:** Modify `frontend/src/components/workspace/constitution/constitution-ring.tsx`;Modify `frontend/tests/unit/components/workspace/constitution/constitution-ring.dom.test.tsx`

- [ ] **Step 1(RED)** `constitution-ring.dom.test.tsx` 加用例:① 传了 `pulse` ⇒ 出现 `data-testid="constitution-pulse-marker"`,且 `data-stage` = 传进来的段;② **不传 `pulse` ⇒ 一个节点都不多**(既有调用方零变化);③ marker **`aria-hidden="true"`**(它不承载语义,语义由调用方那行 lap 文本给)。
- [ ] **Step 2**:实现 —— 环加**可选** `pulse?: { stageKey: string; lap: number } | null`;位置用现成的 `polarPoint(...)` 落在 `LOOP_TRACK_RADIUS` 上,**不新造几何**;**不碰弧的绘制**。
- [ ] **Step 3**:转绿 + 环的**既有**用例全绿(证明未传 `pulse` 时行为不变)。
- [ ] **Step 4(revert)**:让 marker 忽略 `stageKey`(恒画在起点)⇒ 用例 ① 红。
- [ ] **Step 5**:`pnpm check`。

**交付判据:** 环仍是 props-only(新增的也只是数据);不传 `pulse` 时**零差异**。

## Task 4: 接线(两档 + Dialog)

**Files:** Modify `frontend/src/app/workspace/chats/[thread_id]/page.tsx`、`frontend/src/components/workspace/constitution/{constitution-trigger,constitution-dialog,constitution-dialog-body,constitution-user-view,constitution-developer-view}.tsx`

- [ ] **Step 1(RED —— tier 侧)** 两个 tier 的 DOM 用例:拿到 `pulse` ⇒ 渲染 lap 文本(逐字)且环上有 marker;**`pulse` 为 `null` ⇒ 两者都不渲染**(与快照的"没有快照就没有触发器"同一姿势)。
- [ ] **Step 2**:把脉冲**算在页面**(它已经有 `thread`):`reducePulse(thread.messages, { finished })`,`finished` 复用**已交付**的 `core/run-status/` 那套终态判定(不新造);沿 `trigger → dialog → body → tier → ring` 传下去。
- [ ] **Step 3**:转绿 + **全量** `pnpm test`(改了共享的环与两档)+ `pnpm check` + prettier。
- [ ] **Step 4(revert)**:让页面恒传 `null` ⇒ tier 的两条"渲染"用例红(证明接线是承重的,不是摆设)。

**交付判据:** 不新增任何订阅/查询;Dialog 关闭时不解算;两档行为一致。

## Task 5: 真栈验收 + 文档 + 收尾

**Files:** Modify `frontend/AGENTS.md`(构成视图节)、`docs/superpowers/specs/2026-09-13-harness-live-pulse-design.md`(D 定案与探针结果已写)、`docs/superpowers/specs/2026-09-10-harness-constitution-snapshot-design.md`(§12#6 标交付)、本 plan(交付纪要)

- [ ] **Step 1(真栈)**:在**用户自己那套栈**上跑(私有栈开不出第二个前端:Next 16 按目录锁 `.next`;见 `[[project-local-dev-stack]]`)。跑一条**会绕多圈**的 run(带工具),打开 Dialog 量:
  - 指针在 `model`/`tools` 之间**随流移动**;圈数**随往返递增**;
  - run 结束后指针停在 `epilogue`,圈数为最终值;
  - **历史 run 打开时**:不显示"进行中"的假象(终态即终态);
  - 证据 = DOM/属性/数值(**内嵌浏览器视口 0×0 ⇒ 拿不到截图**,观感归用户眼睛)。
- [ ] **Step 2**:`frontend/AGENTS.md` 的构成视图节加:**脉冲从既有 live 状态派生(零新订阅)**、**与 fetch-once 的快照是两条通道**、**环仍是 props-only**、**计数两条规则**(按 id 去重 / 排除命名空间)与它们为什么在 `thread.messages` 上结构性成立。
- [ ] **Step 3**:回写上游 §12#6 为已交付(连带 D1 被探针支持那条);本 plan 交付纪要(逐 Task 记 hash 与实测数字)。
- [ ] **Step 4**:按冻结信息提交(**显式列路径、不推送**);`git status` 确认只含本线文件。

**交付判据:** 真栈观感由用户确认;**任一不过:不提交**,记为开放项。

---

## 依赖排序

```
Task 0 ✅ ─→ (D1 定案 A)
Task 1(纯函数) ─┬─→ Task 3(marker) ─→ Task 4(接线) ─→ Task 5(真栈+文档)
Task 2(文案) ───┘
```
Task 1 与 Task 2 相互独立;Task 3 依赖 1(拿到 `PulseState` 的形状)+ 2(文案只在调用方,环不吃文案,所以 2 不阻塞 3,但 4 需要);Task 5 依赖全部。

## 交付纪要

### Task 0(探针)— 2026-09-13,**已提交 `39f257d8`**(spec+plan+上游指针同笔)

见上方 Task 0 与 spec §7。

### Task 2(文案 + 机具)— 2026-09-13,**已提交 `a3da2957`**

**改动**:新建 `frontend/src/core/pulse/pulse-i18n-keys.json` + `tests/unit/core/pulse/i18n-keys.test.ts`;改三个 locale(各加一个 `pulse` 块)。

| 项 | 实测 |
|---|---|
| 新增用例 | **3**(两个 locale 各 1 + 清单形状 1) |
| RED | **2 红**(两 locale 各缺 1 条) |
| GREEN | `core/pulse` **10 passed**(7 reduce + 3 i18n);**全量 2444 例 / 0 失败** |
| `pnpm check` | **exit 0** |
| prettier | 新文件全过;三个 locale 残差 **24/30/7 = 与 HEAD 逐字相同** ⇒ 零新增格式债 |
| revert | 删 zh-CN `lap` → `missing`;en-US 加孤儿 → `orphans`。**两刀各自命中** |

**偏离(诚实记录)**:计划要 2 条,实际落 **1 条** —— `pulse.markerA11y` 被砍(marker 是 `aria-hidden` 纯装饰,可见的圈数文本已经承载语义;段名复用环既有的 `labelForStage`)。

### Task 1(数据层 `core/pulse/`)— 2026-09-13,**已提交 `58578f5f`**

**改动**:新建 `frontend/src/core/pulse/{types,reduce}.ts` + `frontend/tests/unit/core/pulse/reduce.test.ts`。

| 项 | 实测 |
|---|---|
| 新增用例 | **7** |
| RED | 1 failed / 0 tests —— `Cannot find module '@/core/pulse/reduce'` |
| GREEN | **7 passed** |
| `pnpm check` | **exit 0** |
| prettier | 全过(测试文件的 3 处长行按 prettier 折行后复检;行尾 LF) |
| revert | **两刀**:`tool_calls` 判据 → **3 红**(三条断言圈数的);`finished` 分支 → **恰好 1 红**。恢复后 7 绿、`NEUTER` 零残留 |

**偏离(见上方用例 ⑥ 那段)**:命名空间那条用例换成"只数 assistant 轮",因为子代理帧从不进入这份列表 ⇒ root-only 属于输入前提、不是 reducer 的检查对象。
