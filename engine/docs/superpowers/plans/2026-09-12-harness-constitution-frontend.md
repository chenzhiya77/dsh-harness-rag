# harness 构成前端视图(二期 §12 第 2 项)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把已经在 `run.start.content.constitution` 里的构成快照、和已经在 SSE 上流动的闸门事件,渲染成"环形 + 两档"的构成视图:头部栏触发器(第 7 项)+ Dialog,用户档 / 开发者档两个独立组件。环形手写 SVG,**零新依赖**。

**Architecture:** 见 `../specs/2026-09-12-harness-constitution-frontend-design.md`。数据两条通道:①**快照 fetch-once**(`?event_types=run.start`,取第一个带 `constitution` 的行);②**闸门事件双发**(custom SSE 实时 + `middleware:{tag}` run events 回填,二期 #1 已交付)。**唯一的后端改动**是 `RunJournal` 在根 `on_chain_start` 后 eager flush(spec §3)——否则快照在 run 进行中读不到(缓冲阈 20)。

**Tech Stack:** Next.js 16 / React 19 / TS / Tailwind 4;Rstest(node + dom 两个 project);TanStack Query;shadcn `ui/dialog`;SVG。后端 Python 3.12 `RunJournal`。

**前置(2026-09-12 已冻结,无待裁决项):** 环形 / 手写 SVG / 头部 + Dialog / 两档独立组件 / 67 key 文案(一期 §13 的 60 + 本 spec §8.3 新增并已批的 7)全部已定。**文案照抄 spec,不重新裁决、不重写。**

**测试命令(全程统一):**
```bash
cd frontend && pnpm test           # 全量单测(node + dom);单文件过滤:pnpm test <路径片段>
cd frontend && pnpm check          # eslint + tsc(types.ts ↔ locale 的编译约束在这里生效)
cd frontend && pnpm format         # prettier --check
cd backend && PYTHONPATH=. .venv/Scripts/python.exe -m pytest tests/test_run_journal_constitution.py tests/test_constitution_i18n_keys.py -q --basetemp .pytest-tmp -p no:cacheprovider
cd backend && .venv/Scripts/python.exe -m ruff check . && .venv/Scripts/python.exe -m ruff format --check .
```

**关键事实(已核实,行号见 spec §2):**
- **run id 已在流里**:`hooks.ts:1676` 的 `onCreated(meta)` 把 `meta.run_id` 传给 `onStart`;页面(`page.tsx:128`)只用了第一个参数。
- **`onStreamCustomEvent` 是单槽 ref**(`hooks.ts:74` / `:1580-1581`),主聊天页今天没占用;本项占用后**后来者必须并到同一个转发函数**。
- **闸门事件带 middleware 真名**(`name` 字段)⇒ 用快照里现成的 `name → stage` 映射挂环,**不新造 tag→stage 表**。
- **`stages[]` 五段恒在**(零成员也出现),`extension` 仅非空时追加(`constitution_record.py:272-293`)⇒ 环恒为 5 段。
- **`extension` 是唯一需要在首尾接缝外画的段**;未知 stage key 走同一条兜底(spec 本文 §5.3 的退化表)。
- **i18n 三文件互为编译约束**:`export const zhCN: Translations` 让缺键/多键都是编译错误 ⇒ §13.6 的"第 2 处 guard"不需要独立测试(spec §8.2)。
- **门禁用窄集合,不要用后端全量**(本机全量有 155 条环境红)。

---

## File Structure

**新建(前端):**
- `frontend/src/core/constitution/`: `constitution-i18n-keys.json`(清单)· `types.ts` · `parse.ts` · `run-id.ts` · `gate-events.ts` · `geometry.ts` · `api.ts` · `hooks.ts`
- `frontend/src/components/workspace/constitution/`: `constitution-trigger.tsx` · `constitution-dialog.tsx` · `constitution-ring.tsx` · `constitution-user-view.tsx` · `constitution-developer-view.tsx`
- `frontend/tests/unit/core/constitution/`: `i18n-keys.test.ts` · `parse.test.ts` · `run-id.test.ts` · `gate-events.test.ts` · `geometry.test.ts`
- `frontend/tests/unit/components/workspace/constitution/`: `constitution-ring.dom.test.tsx` · `constitution-user-view.dom.test.tsx` · `constitution-developer-view.dom.test.tsx`

**新建(后端):** `backend/tests/test_constitution_i18n_keys.py`

**修改:** `frontend/src/core/i18n/locales/{zh-CN,en-US,types}.ts`(constitution 块)· `frontend/src/app/workspace/chats/[thread_id]/page.tsx`(头部第 7 项 + 接线)· `backend/packages/harness/deerflow/runtime/journal.py`(eager flush)· `backend/tests/test_run_journal_constitution.py`(新用例)· `frontend/AGENTS.md`(所有权条目)

**不新建、不修改:** 任何依赖(`package.json` 零改动)· 任何路由 / 端点 / 事件类型 / 表 / 迁移 · `ai-elements/**` · `components/ui/**` · 任何 middleware 行为。

---

## Task 1: i18n 全量落盘(67 key)+ 三处 guard

**Files:** Create `frontend/src/core/constitution/constitution-i18n-keys.json`、`frontend/tests/unit/core/constitution/i18n-keys.test.ts`、`backend/tests/test_constitution_i18n_keys.py`;Modify `frontend/src/core/i18n/locales/{zh-CN,en-US,types}.ts`

- [x] **Step 1(RED —— 先写两个 guard 测试,今天必红):**
  - 前端 `i18n-keys.test.ts`(node 环境):以清单 json 为基准**双向**遍历 `zhCN.constitution` / `enUS.constitution` —— 正向:每个 key 存在且非空(`title` 是字符串;`a11y.segment` / `a11y.total` 用 `typeof === "function"` 断言,不能只查 truthy);反向:两份 locale 的 `constitution` 子树**没有多余叶子**(逐层比 key 集合)。同时断言清单计数 `core 33 / middlewares 34 / 合计 67`。
  - 后端 `test_constitution_i18n_keys.py`:用 `Path(__file__).resolve().parents[2]` 定位仓库根读清单(先例 `test_compose_default_bind_host.py`)—— ① `manifest["middlewares"]` ↔ `STAGE_OF_MIDDLEWARE` 键集**双向相等**;② `manifest["core"]["gate"]` ↔ catalog 的六个闸门 tag 常量;③ 34 个 middleware 名**不在** `core` 子树里(它们是索引键,不是普通 key)。
- [x] **Step 2:** 写清单 `constitution-i18n-keys.json`(结构照 spec §8.1;**34 个名字必须逐字等于 `type(mw).__name__`**,先从 `STAGE_OF_MIDDLEWARE` 键盘点一遍再落盘)。
- [x] **Step 3:** `types.ts` 加 `constitution` 块(67 个 key;34 个真名作为嵌套的索引键;`a11y.segment` / `a11y.total` 是函数类型)。
- [x] **Step 4:** `zh-CN.ts` 填 33 条 core key——`+ 6 stage / 5 activity / 6 gate / 3 frequency / 3 kind / 2 a11y / 1 title` 照抄一期 spec §13.1–§13.4,`facts 4 / view 2 / truncated 1` 照抄本 spec §8.3;34 条 tooltip 照抄 §13.5 中文列(**不改写**)。
- [x] **Step 5:** `en-US.ts` 同 67 条,照抄各表的英文列。
- [x] **Step 6:** 转绿:`pnpm test`(两个新测试;单文件过滤可选)+ `pnpm check`(编译约束生效)+ `pnpm format`;后端 `pytest tests/test_constitution_i18n_keys.py` + `ruff`。
- [x] **Step 7(revert 证明):** 从 `zh-CN.ts` 删掉任意一条 key → 前端 guard 红(正向缺键);给 `en-US.ts` 加一条孤儿 key → 后端(或前端反向)红。两条都验,撤销即绿。

**交付判据:** 两个 guard 绿且各自有牙;**零文案重写**——逐条 diff 与 spec 表格一致;`pnpm check` / `format` / 后端 `ruff` 干净。

## Task 2: 后端 eager flush(`run.start` 在 run 进行中可读)

**Files:** Modify `backend/packages/harness/deerflow/runtime/journal.py`、`backend/tests/test_run_journal_constitution.py`

- [x] **Step 1(RED):** `test_run_journal_constitution.py` 加一例:真实 `RunJournal` + `MemoryRunEventStore`,**只触发根 `on_chain_start`**,断言**立即**能从 store 读到 `run.start`(且 `content.constitution` 在)。**今天必红**(`_put` 只在缓冲 ≥ 20 时刷,`journal.py:659-672`,默认 `:231`)。
- [x] **Step 2:** 在 `on_chain_start` 的根分支 `_put(...)` 之后补 `self._flush_sync()`(与 `on_chain_end` `:367` 同款);嵌套分支不动(`parent_run_id is not None` 早退,`:331-332`)。
- [x] **Step 3(GREEN + 不变量):** 同一文件再加一例:根 start 之后再触发**嵌套** `on_chain_start`,断言不产生新的 `run.start` 行、store 内容不变。既有用例(2 条 `run.start`、只有第一条带 `constitution`、`set_constitution` 纯赋值)保持绿。
- [x] **Step 4:** 窄集合门禁:`pytest tests/test_run_journal_constitution.py tests/test_run_event_stream_contract.py tests/blocking_io/test_run_journal_callbacks.py -q`(**blocking-IO 锚点必须绿**——`_flush_sync` 只做 `loop.create_task`,不碰 IO)+ `ruff check` / `format --check`。
- [x] **Step 5(revert 证明):** 注释掉 `_flush_sync()` → Step 1 那条转红,Step 3 那条保持绿。

**交付判据:** 三条新/旧断言齐绿;门禁窄集合 0 failed;`run.start` 的发射条数与载荷**逐字节不变**(只提前落库)。

## Task 3: 前端数据层(纯函数 + 类型 + 抓取)

**Files:** Create `frontend/src/core/constitution/{types,parse,run-id,gate-events,geometry,api,hooks}.ts`、`frontend/tests/unit/core/constitution/{parse,run-id,gate-events,geometry}.test.ts`

- [x] **Step 1(RED —— 四个纯函数各一组测试):**
  - `run-id.test.ts`:live 优先 / 从 `messages` 末尾向前扫 `run_id` / 空线程返回 `null` 三条分支。
  - `gate-events.test.ts`:两种载荷形态归一(custom 帧 `{type,…}` ↔ 持久行 `{event_type:"middleware:<tag>", content:{…}}`);去重键折叠逐字相同的事件;排序(回填 `seq` 升序、展示倒序);未知 tag / 缺字段丢弃而不抛。
  - `parse.test.ts`:`schema_version: 2` 仍按已知字段解析;顶层或 `tools.truncated` 置标记;未知 stage key 落 extension 兜底槽;无 `constitution` 的行返回 `null`(取"第一个带 constitution 的行",不是第一行)。
  - `geometry.test.ts`:五段等分(起点 -90°、跨度 66°、间隙 6°)、`arcPath` 的 sweep 标志、`loop:true` 恰三段、`ringLayout` 把 extension 排除在环外、`polarPercent` 四象限。
- [x] **Step 2:** `types.ts` 定义快照 / 事件 / 投影的前端类型(镜像后端形状;**不引入新词汇**)。
- [x] **Step 3:** 实现四个纯函数(零依赖,无 DOM、无 React)。
- [x] **Step 4:** `api.ts` 照 `core/tasks/api.ts` 的形状:用 `getBackendBaseURL()` + `core/api/fetcher` 的 `fetch`,抓 `?event_types=run.start`(取第一个带 `constitution` 的行)与 `?event_types=middleware:<6 tags>`(逗号分隔)。
- [x] **Step 5:** `hooks.ts`:`useConstitution(threadId, runId)`(`queryKey: ["constitution", threadId, runId]`、`enabled`、`staleTime: Infinity`、`refetchOnWindowFocus: false`、同线程 `placeholderData`)、`useGateEvents(...)`(同款;`queryKey: ["gate-events", …]`)。
- [x] **Step 6:** 转绿 + `pnpm check` + `pnpm format`。

**交付判据:** 四个纯函数测试全绿(node 环境,**不进 dom project**);`pnpm check` 干净。

## Task 4: 环绘制原语(`constitution-ring.tsx`)

**Files:** Create `frontend/src/components/workspace/constitution/constitution-ring.tsx`、`frontend/tests/unit/components/workspace/constitution/constitution-ring.dom.test.tsx`

- [x] **Step 1(RED —— DOM 测试,固定快照 fixture):** 断言 ① 五段弧各带 `aria-label`(用 `constitution.a11y.segment` 文案);② `loop:true` 的三段有循环体细弧,`intake`/`epilogue` 没有;③ extension 行**只在**传入时渲染、且不进环(环外带);④ 未知 stage key 落同一外带槽;⑤ `handoff_gates > 0` 才出环边;⑥ 每段的闸门徽标计数 = `gates + handoff_gates`,handoff 单独标记。
- [x] **Step 2:** 实现:SVG 画弧(path)/ loop 细弧 / extension 外带 / handoff 出环边;**文字、徽标、标签用 DOM 叠层**(绝对定位,`polarPercent` 算坐标);`viewBox 0 0 360 360`,根容器 `relative` + `size-full`。
- [x] **Step 3:** 交互本期只有 hover / 选中态(`transition-colors`)+ `onSelectStage` 回调、`selectedKey` 受控 prop;指针 / 动画是 §12 第 6 项,不做。
- [x] **Step 4:** 转绿 + `pnpm check` + `pnpm format`。

**交付判据:** DOM 测试全绿;组件**不含任何一档的词汇**(所有文案由 props / i18n 注入,`constitution.*` 之外不新增 key);不 import 任何新依赖。

## Task 5: 两档视图 + Dialog + 头部触发器 + 页面接线

**Files:** Create 四个组件(`constitution-{user-view,developer-view,dialog,trigger}.tsx`)+ 两个 dom 测试;Modify `frontend/src/app/workspace/chats/[thread_id]/page.tsx`

- [x] **Step 1(RED —— 用户档 dom 测试,最重要的一条):** 用固定快照 + 两条闸门事件渲染**用户档**,断言 ① 出现三段以上 `constitution.stage.*` 文案;② **整棵树的可读文本里搜不到任何 `…Middleware` 真名、也搜不到 `tools.mounted` 里的工具名**——这是 §6.8 策展投影在前端的渲染层对偶。
- [x] **Step 2(RED —— 开发者档 dom 测试):** 34 条 tooltip 抽 3 条可悬停取出;`kind` / `frequency` 徽标按数据渲染;未知 stage 的行落环外带分组;`truncated` 时出现 `constitution.truncated` 提示;闸门事件的 `changes` 以 key-value 原样展示(**不做键名映射**)。
- [x] **Step 3:** 实现两个视图(两个独立组件;共享的只有 Task 4 的绘制原语)。用户档文案只读 `stages[]` + 闸门事件;开发者档按 stage 分组列表 + 事实条(`facts.*` 4 条)+ tooltip。
- [x] **Step 4:** `constitution-dialog.tsx`:Dialog 外壳(`sm:max-w-2xl` 起步)+ 两段式切换(默认用户档;偏好存 `localSettings`,新增 `constitution.view`)+ 主体 `next/dynamic` + `ssr:false` 懒加载。
- [x] **Step 5:** `constitution-trigger.tsx`:逐字照抄 `artifact-trigger.tsx:11-36` 的形状(`variant="ghost"` + `Tooltip` + `hidden sm:inline` 标签 + `aria-label` + `data-testid`);**可见性 = `data != null`**(无快照不出触发器,不需要空态文案)。
- [x] **Step 6:** 页面接线(`page.tsx`):① `onStart: (tid, runId) => { …; setLiveRunId(runId) }`(接住第二个参数);② `onStreamCustomEvent` 累积 live 闸门事件(线程切换 / 新 run 清空);③ 头部右簇 `ArtifactTrigger` 之后插第 7 项;④ **在传参旁留一行注释**说明该单槽 ref 的所有者与"后来者须并到同一转发函数"的约定。
- [x] **Step 7:** 转绿 + `pnpm test`(全量)+ `pnpm check` + `pnpm format`。

**交付判据:** 三个 dom 测试全绿;`pnpm test` 全量 0 failed;用户档渲染测试**有牙**(故意在用户档里渲染一个真名 → 当场红,验后撤销)。

## Task 6: 手工验收(真栈 + 浏览器)+ 文档同步 + 收尾

**Files:** Modify `frontend/AGENTS.md`(Interaction Ownership 增一条)、`docs/superpowers/specs/2026-09-10-harness-constitution-snapshot-design.md`(§12 第 2 项标记交付)、本 plan(交付纪要)

- [x] **Step 1(真栈):** 后端私有端口 `:8099` + `DEER_FLOW_AUTH_DISABLED=1`(**绝不碰用户自己的 8001**);前端 `scripts/pnpm.py dev`(:3000);浏览器视口 ≥768px(合成输入约束)。
- [x] **Step 2:** 走 spec §11 的六条:① 用户档五段齐全 + 闸门通知文案逐字一致 + 文本里搜不到真名/工具名;② 开发者档分组 / `changes` / tooltip;③ 刷新后通知仍在(回填);④ **run 进行中**打开 Dialog,快照 1 秒内出现(Task 2 的验收);⑤ 375px 视口头部不溢出(溢出则按 spec §10 风险 2 收进菜单);⑥ 无快照的 run 不出触发器、无空壳弹窗。
- [x] **Step 3:** `frontend/AGENTS.md` 的 Interaction Ownership 增加构成视图条目(触发器 / Dialog 的所有权 + `onStreamCustomEvent` 单槽约定 + 用户档的策展投影约束)。
- [x] **Step 4:** 回写:一期 spec §12 第 2 项标"已交付";本 plan 末尾的交付纪要(逐 Task 记 hash 与实测数字)。
- [x] **Step 5:** 按冻结信息提交(**不推送**,沿用本线惯例);`git status` 确认只含本线文件。

**交付判据:** 六条验收全过(任一不过:**不提交**,记为开放项);`pnpm check` / `pnpm test` / `pnpm format` 与服务端窄集合门禁**双净**。

---

## 依赖排序

```
Task 1(i18n)  ─┐
Task 2(后端)   ├─→ Task 5(视图/接线) ─→ Task 6(验收)
Task 3(数据层) ─→ Task 4(环) ─┘
```

Task 1 / 2 / 3 相互独立,可并行;Task 4 只依赖 Task 3;Task 5 依赖 1+3+4;Task 6 依赖全部。

## 交付纪要(待填)

### Task 1 — 已交付(2026-09-12):i18n 全量落盘 + 三处 guard

- **产物**:`constitution-i18n-keys.json`(清单:`core` 33 × `middlewares` 34 = **67 key**)、`types.ts` 的 `constitution` 块、`zh-CN.ts` / `en-US.ts` 各 **67 条**(照抄 spec §13.1–§13.5 与 §8.3,**零改写**)、前端 guard `tests/unit/core/constitution/i18n-keys.test.ts`(3 例)、后端 guard `backend/tests/test_constitution_i18n_keys.py`(3 例)。
- **RED(先写测试)**:前端 `Cannot find module '@/core/constitution/constitution-i18n-keys.json'`;后端 `FileNotFoundError` × 3。**清单先落盘后**,后端立刻 **3 passed**(清单的 34 个名字与六个 gate tag 与 `STAGE_OF_MIDDLEWARE` / catalog 逐字相符),前端仍红在"67 个 key 全缺"——两组用例的牙各自独立可见。
- **GREEN**:前端 `pnpm test i18n-keys` **3 passed**;后端 **3 passed**。
- **revert 证明(三发,全中)**:① 从 `zh-CN.ts` 删 `stage.extension` → `missing: ["stage.extension"]`;② 给 `en-US.ts` 加 `orphanProbe` → `orphans: ["orphanProbe"]`;③ 给清单加 `BogusMiddleware` → 后端 `test_manifest_middlewares_match_the_stage_table` 红,另两例保持绿。撤即绿。
- **门禁**:`pnpm check`(eslint + tsc)干净;`pnpm test` 全量 **2246 passed / 1 failed**;后端 `ruff check` + `format --check` 干净。
  - **那 1 条 failed 是既有的环境性预存红**:`tests/unit/knowledge/chat-panel.dom.test.tsx` "restores the remembered model per kb…"(`context.model_name` 为 undefined)。判据:该测试文件与其被测组件目录 `git status` **逐项未改**(内容同 HEAD),且 2026-09-10 已复证与本线无关(见项目记忆 `project-env-test-failures`)。
  - **`pnpm format` 在本工作树对 167 个文件报警**,成因是 `core.autocrlf=true` 下工作区全为 CRLF 而 prettier 期望 LF(HEAD 版本同样被 flag,与本轮无关)。**本轮新增/改动内容的格式已逐文件核过**:两个新文件 LF 且 `prettier --check` 通过;三个 locale 文件"去 CR 后与 prettier 输出"的残差行数与 HEAD **完全相同**(zh-CN 27 / en-US 30 / types 7,且全部落在 knowledge / settings 等既有段),**零新增格式债**。
- **一处顺手修正(非格式)**:`en-US` 的 4 条 tooltip 在初稿里手动折行位置与 prettier 不符(3 条该拆、1 条该合),已按 prettier 输出定稿。

_（Task 2–6 待填）_

### Task 2 — 已交付(2026-09-12):`run.start` 即时落库

- **产物**:`journal.py` 根 `on_chain_start` 分支的 `_put(...)` 之后补一次 `self._flush_sync()`(与 `on_chain_end` / `on_chain_error` 同款);`tests/test_run_journal_constitution.py` **+2 例**(`test_root_start_is_readable_without_an_explicit_flush` 用**生产默认阈值**且**不调 `flush()`**;`test_a_nested_start_adds_nothing_after_the_root_flush` 钉住嵌套分支零增行)。
- **RED**:新用例 `assert 0 == 1` —— 事件确实卡在写缓冲里(`_put` 只在 ≥20 条时刷,典型 run 到不了)。
- **GREEN**:本文件 9 passed;**窄集合 171 passed / 0 failed**(journal × 2 + 契约 + worker 宪法 + worker delivery + blocking-IO 锚点);`ruff check` / `format --check` 干净。
- **revert 证明**:注释掉那一行 → **恰好 1 条转红**(新用例),另 8 条(含嵌套不变量、2 条 `run.start` 发射数、未 set 时逐字节不变)保持绿 —— 两组用例的牙相互独立。
- **真栈 A/B 验收(本轮最强证据,私有 `:8099` + `DEER_FLOW_AUTH_DISABLED=1`,未碰 8001)**:
  - **修复后**:建线程 → 建后台 run → 高速轮询 `GET .../events?event_types=run.start`,该行在 **0.094s** 可见、**当时 run 状态 = `running`**(真正的跑动中读取);载荷带 `constitution`(26 条 middleware、`qwen3.8-flash`、`stages` = intake 2 / context 10 / model 3+3 / tools 2+3 / epilogue 2);run 随后正常 `success`。
  - **对照腿(去掉那一行、重启同一栈、同一探针)**:首次可见 **1.531s**、且状态已是 **`success`** —— 即只能在 `on_chain_end` 的 flush 时落库。**这证明"跑动中可读"由那一行产生,不是别的路径顺带带来的。**
  - 探针(临时脚本)用完即删;服务已停;`run.start` 的发射条数与未 set 时的逐字节载荷由既有用例继续钉住,未变。

_（Task 3–6 待填）_

### Task 3 — 已交付(2026-09-12):前端数据层(四个纯函数 + 抓取 + hooks)

- **产物**:`core/constitution/` 七个模块 —— `types.ts`(线上形状逐字镜像,含六个 gate tag)· `run-id.ts` · `gate-events.ts`(双腿归一 + 去重键 + 合并 + `GATE_EVENT_TYPES` filter)· `parse.ts`(`parseConstitution` 逐字段重建 + `splitStages` 环内/环外)· `geometry.ts`(常量 + `arcPath` + `polarPercent` + `ringLayout`)· `api.ts`(两个真实 URL)· `hooks.ts`(`useConstitution` / `useGateEvents`,同线程 placeholder)。测试 **30 例**四个文件。
- **GREEN**:`pnpm test core/constitution` **30 passed**(node project,四个纯函数文件均进 node 而非 dom);`pnpm check` 干净;全量 **2273 passed / 1 failed**(仍是那条已登记的 `knowledge/chat-panel` 预存红,与本题无关);新文件 `prettier --check` 通过(其余 167 文件的红是既有的 CRLF 环境条件)。
- **revert 证明(三探针,各打一处行为)**:① `findConstitution` 只看第一行 → `reads the first row that carries one` 红;② `mergeGateEvents` 关掉去重 → `folds an event that arrived on both legs` 红;③ `resolveRunId` 改为从前往后扫 → `falls back to the newest run id` 红。**恰好三条红、每模块一条,其余全绿**;撤即绿。
- **真栈冒烟(私有 `:8099`,两阶段,验证的是真实载荷而非我的夹具)**:
  - **快照腿**:用 `api.ts` **完全相同**的 URL 形状拉 `?event_types=run.start&limit=20` → 1 行、`constitution` 在;键集与 `STAGE_KEYS` 一致;`middlewares[0]` 字段集 = `{frequency, hooks, kind, name, stage}`;`stages` 五段齐全。
  - **闸门腿**:先探到"新建文件本就不被拦"(只拦覆盖/追加),于是预置一个已存在文件再让它不读直写 → **拿到 1 条真实 `middleware:read_gate`**:`content` 恰为 `{name, hook, action, changes}` 四键,`changes` = `{tool_name:"write_file", tool_call_id, path, reason:"no_current_read_mark"}` —— 与 `parseGateRow` 预期**逐字吻合**。
  - 探针用完即删、服务已停、预置文件与线程一并清掉;未碰用户 8001。
- **一处偏离计划的措辞(已就地修正)**:计划把 `gate-events.test.ts` 的一条用例描述为"两条只差 `action` 的事件"——**去重键是 `[tag, name, changes]`,只差 `action` 会被正确折叠**,改成两条 `changes` 不同的事件才是这条用例的真实意图。

_（Task 4–6 待填）_

### Task 4 — 已交付(2026-09-12):环绘制原语

- **产物**:`components/workspace/constitution/constitution-ring.tsx`(SVG 画弧 / 循环体细弧 / 环外带 / handoff 出环刺;文字与徽标走 DOM 叠层)+ `geometry.ts` 新增四个**具名布局半径**(`LOOP_TRACK_RADIUS` / `OUTSIDE_BAND_RADIUS` / `LABEL_RADIUS` / `BADGE_RADIUS` + `EXIT_STAGE_KEY`)+ `polarPoint` 导出;测试 **11 例**(`constitution-ring.dom.test.tsx`)。
- **GREEN**:本文件 **11 passed**;全量 **2302 passed / 1 failed**(仍是那条已登记的 `knowledge/chat-panel` 预存红);`pnpm check` 干净;新文件 `prettier --check` 通过。
- **revert 证明(四探针,各红一条)**:① 循环体细弧不按 `loop` 过滤 → `draws the loop track only on the looping stages` 红;② 徽标只数 `gates`(漏 `handoff_gates`) → `counts gates plus handoffs` 红;③ handoff 出环刺不看 `handoff_gates` → `draws the handoff exit only where a stage hands off` 红;④ **环外带改回跨接缝** → `hangs the band outside the exit arc` 红。撤即绿。
- **⭐ 对着渲染图看出来的两处自身缺陷(Task 1-3 全靠单测,这是第一次真的看到形状)**。做法:临时写一个 DOM 视觉 harness 把组件渲成静态 HTML,**用仓库已有的 `@resvg/resvg-js`(sharp 同层依赖)把 SVG 栅格化成 PNG** 直接看——不需要装浏览器、不需要起 dev server。看出的两处:
  1. **`extension` 带被我画在了首尾接缝上**,而一期 spec §8 风险 11 的冻结裁决是"画在**出口弧外侧**"。**这是我写前端 spec 时未经记录地改掉的**(该 spec §5.1 原文写"跨首尾接缝 253°–287°")。已改回出口弧(epilogue)角度,**spec 与代码双改并留修正框**,并新增一条断言把"挂在出口弧、不是接缝"钉死(第 ④ 个探针证明它有牙)。理由也补上了:接缝是出口弧与入口弧的交界,带子画在那里读成"两不属于"。
  2. **徽标原本画在弧外缘(R=138),与循环体细弧(R=146)只差 8px 会贴住**;而**标签原本压在弧上**——弧选中时会变深(`text-foreground/70`),压在上面的文字会被吃掉对比度。改成:标签进环内空区(R=70,唯一无人占用处),徽标落到弧中心线(R=118,自带背景色故弧深浅两态都可读)。
  - 探针(视觉 harness + 两个栅格化脚本 + scratch 目录)用完即删;**栅格化只验证了 SVG 几何**;DOM 叠层的位置由 geometry 的数值测试 + 新增的两条断言覆盖,但**它在真实浏览器里的观感仍要走 Task 6**(本机内嵌浏览器无可见视口、Playwright 的 chromium 未安装,且叠层依赖 Tailwind 编译后的 CSS)。
- **一处记录在案的实现选择**:`constitution-ring.tsx` 不 import i18n,四类文案全走 props(`labelForStage` / `segmentLabel`)——环被两档共用,而两档词汇表不同;绘制原语自己挑一个,正是两档重新长回去的路径。

_（Task 5–6 待填）_

### Task 5 — 已交付(2026-09-12):两档视图 + Dialog + 触发器 + 页面接线

- **产物(7 个新文件 + 4 个改动)**:
  - 组件:`constitution-user-view.tsx` · `constitution-developer-view.tsx` · `constitution-dialog-body.tsx` · `constitution-dialog.tsx` · `constitution-trigger.tsx` · `index.ts`(桶);
  - 数据/纯函数:`parse.ts` 新增 `groupMiddlewares`(按 stage 分组,环序 + 环外首现序,空组不画);
  - 共享 hook:`useThreadStream` 新增返回 **`liveRunId`**(见下);
  - 设置:`LocalSettings.constitution.view`(类型 + 默认 + 段合并三处);
  - 页面:`page.tsx` 接线(runId 推导 / 两个查询 / live 闸门累积 / 头部第 7 项 / 单槽转发注释)。
- **测试 24 例新增**:`constitution-user-view.dom`(7)· `constitution-developer-view.dom`(6)· `constitution-trigger.dom`(5)· `live-run-id.dom`(2)· `parse.test` 的 `groupMiddlewares`(2)· 既有 2 例调整。
- **GREEN**:`pnpm check`(eslint + tsc)干净;`pnpm test` 全量 **2324 passed / 1 failed**(仍是那条已登记的 `knowledge/chat-panel` 预存红);新文件 `prettier --check` 通过。
- **revert 证明(三探针,各红目标断言)**:① 用户档把真名当 fallback 渲染 → `never paints an internal name` 红(**这正是计划要求的"用户档渲染测试有牙"**);② 开发者档跳过 `guard → gate` 映射 → 两个轴那条红;③ 触发器忽略 `record == null` → `stays out of the header` 红。撤即绿。
- **⭐ 计划里的两处错误,实施时发现并改掉(spec 里留了修正框)**:
  1. **`onStart` 拿不到当前 run。** 计划写"`onStart: (tid, runId) => setLiveRunId(runId)`",但 `handleStreamStart` 只在 **`startedRef` 为假时**转发 `onStart`,而 `startedRef` 只在线程切换时重置 ⇒ **它是"线程建立"信号,同一线程的第二次 run 永远到不了它**。照原写法会把上一轮的闸门通知挂在本轮的构成上。**改法**:`useThreadStream` 新增 `liveRunId`(由每 run 触发的 `onCreated` 写入,随线程本地状态清空),并加一条 DOM 测试专门钉"第二次 run 会替换它"——这条测试在实现前是红的(`expected undefined`),不是事后补的。
  2. **触发器没有可用的短标签。** 计划写"逐字照抄 `ArtifactTrigger` 形状"含可见标签,但冻结的 67 条里没有这个控件的短标签,`constitution.title` 是一整句,而头部既有标签全是 2–4 字,且第 7 项本来就是 spec 标出的拥挤风险。**改法**:纯图标(`aria-label` + tooltip = `constitution.title`),与同簇的 `SidecarTrigger` 一致;**不新增文案**。要可见标签需单批一条新 key。
- **第三处用词错位(实施中发现)**:payload 的 `overlay_kind` 值是 **`guard`**,而冻结文案的键是 **`gate`** ——同一件事两个词。映射写成组件里一张显式的三行表,不藏在 fallback 里(否则只改一边时会显示英文 `overlay`)。
- **两处行为选择(记录在案)**:①用户档的"该段在干什么"那句是**悬停优先、点击兜底**(`hover ?? selected`),空态**占位不卸载**以免描述时把下方通知推上推下;②开发者档的 `changes` 按原键展示,**不做键名映射**(键是契约字段)。
- **未覆盖面(如实记)**:本轮**没有真浏览器验证**——两个视图的观感、Dialog 布局、`next/dynamic` 的加载表现、以及头部第 7 项的窄屏拥挤,全部留到 Task 6。本机内嵌浏览器无可见视口、Playwright chromium 未安装;而 Tailwind 编译后的类名效果无法靠栅格化预演(栅格化只能验 SVG,Task 4 已用过)。

_（Task 6 待填）_

### Task 6 — 已交付(2026-09-12):真栈真浏览器验收 + 文档同步

**验收环境**:后端私有 `:8099`(`DEER_FLOW_AUTH_DISABLED=1`,**未碰用户的 8001**)+ 前端 dev `:3000` 指向它;**用系统已装的 Chrome 经 Playwright 驱动**(`channel: "chrome"`)——**无需下载浏览器**。两处环境坑:`next.config.js` 的兜底 rewrite 只在 `NEXT_PUBLIC_*` **未设**时注册,所以前端只设 `DEER_FLOW_INTERNAL_GATEWAY_BASE_URL` 就走同源代理(**设了 `NEXT_PUBLIC_*` 反而把 `/api/*` 打成 404,连登录页都进不去**);前端也要 `DEER_FLOW_AUTH_DISABLED=1`(它有自己的同名判据,`core/auth/auth-disabled-user.ts`)。

**验收结果 17/17 全过**(一条脚本跑完,含零 console 错误):

| # | 检查 | 实测 |
|---|---|---|
| 1 | 头部出现触发器 | 是 |
| 2 | 1280px 右簇不溢出 | header 1023 / cluster 384 |
| 3 | 环上五段 | count=5 |
| 4 | 循环体细弧恰三段 | 是 |
| 5 | 用户档说出段名 | 接收 备料 思考 执行 收尾 |
| 6 | **用户档不含任何真名/工具名** | 是 |
| 7 | 闸门通知逐字等于冻结文案 | "有个文件没先读就想改，已拦下" |
| 8 | 悬停某段给出那句话 | "在调用工具" |
| 9 | 开发者档给出事实条 | qwen3.8-flash / 挂载 16 |
| 10 | `changes` 按原键展示 | `no_current_read_mark` / `call_…` |
| 11 | 开发者档也画环 | 是 |
| 12 | 悬停某行给出人话 tooltip | "没先读过这个文件就不许改" |
| 13 | 档位选择刷新后仍在 | 是 |
| 14 | 刷新后闸门通知仍在(回填腿) | 是 |
| 15 | **375px 头部不溢出** | 375/375,右簇 286 |
| 16 | 无快照的线程不出触发器 | 是 |
| 17 | 零 console 错误 | 是 |

**⭐ 两处只有真浏览器才暴露的缺陷(当时单测全绿、`pnpm check` 干净)——这是 Task 6 存在的全部理由**:

1. **新对话的第一次 run 完全看不到构成。** Task 5 给 `liveRunId` 加的"线程切换即清空"重置效果依赖 `[threadId]`,而新对话的第一次 run 恰好让 `threadId` 从 `undefined` 变真实值,**效果当场把 `onCreated` 刚写进去的 run id 抹掉**——正是这个机制本来要防的那类 bug。改成 **run id 与所属 thread 成对携带**(`liveRun`),按"配对是否匹配当前 thread"决定暴露,两处重置效果随之删除。新增 1 例 DOM 测试(第二次 run 替换 id / 切线程失效 / **未保存线程变已保存时保住 id**)。
2. **一次读到空就被永久缓存。** 后端 `run.start` 在 run 创建后 **0.17–2.2s** 才落库(5 次实测),而前端拿到 run id 就立刻问(实测 +348ms),空答案被 `staleTime: Infinity` 锁死整轮。`fetchConstitution` 改为**有界重问**(最多 6 次、间隔 400ms,拿到即停;真没有快照的 run 只多这几次)。新增 `api.test.ts` 4 例。

**修复后重验(run 进行中可见)**:从浏览器 composer 真发一条消息,时间线显示 **+686ms 触发器出现、当时 run 状态 = `running`**,快照请求在 +510ms 发出——**§12.1 那条决定性理由("脉冲必须在 run 进行中看")在真栈上成立**。修复前同一脚本是"4.9s 后才出现、那时已 `success`"。

**文档同步**:`frontend/AGENTS.md` 的 Interaction Ownership 增一条(两档是两个组件 / 环只收 props / 触发器可见性即快照存在性 / 读按 run 作用域 + 两条时序陷阱);一期 spec §12 第 2 项标 ✅ 已交付并记两处缺陷。

**未覆盖/开放项(如实记)**:①环形弧对比度实测偏低(未选中 ≈1.36:1、选中 ≈2.82:1,深浅两主题同量级)——但弧是 40px 宽的大面积、分段靠间隙、文案与徽标另在其上,截图判读清楚可辨,**未改**(若嫌淡是一行常量的事)。②闸门点跳工具卡、事实条里的 `runtime_flags`/`checkpoint_mode`/`skills` 仍按 spec 不做。③本次只用了**一条会触发 `read_gate` 的真实 run**,未逐个渲染另外五种闸门事件(文案由 §8.2 guard + 单测覆盖,渲染路径与 `read_gate` 同一条)。④探针脚本(`.scratch-task6/`)用完即删,两个服务已停。
