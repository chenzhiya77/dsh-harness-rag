# RAG 评测 Tab 二期设计（题库管理 · 运行触发 · 历史列表）

> 状态：✅ 已落地（2026-09-23；Task 1–8 实现 + E2E/回归/真栈冒烟五项收尾，见 plan `../plans/2026-08-27-rag-eval-tab-phase2.md`） · 日期：2026-08-27 · 范围：父 spec §9（P5 二期）契约意图的正式落地——题库 CRUD、评测运行触发（202 + 轮询）、历史运行列表、召回测试面板「存为考题」与复现联动；冻结分段三视图布局与全部新增 API 契约 · 关联：父 spec `2026-08-23-rag-retrieval-evaluation-design.md`（指标体系、后端实现、§9 契约意图）；可视化子 spec `2026-08-24-rag-evaluation-metrics-visualization-design.md`（指标总览 + 趋势图 + drawer 壳，已落地 2026-08-26）
>
> **布局定案（2026-08-27 用户决策）**：双栏工作台方案**明确放弃**——中栏宽度有限，左右分栏下题库表格与趋势图互相挤压。采用**分段三视图**（总览 / 题库 / 历史）：总览视图保持已落地实现一个像素不动，新内容作为平级视图共享全宽。
>
> **三项开放点定案（2026-08-27 用户确认 + 代码核查）**：
> 1. 视图切换用**分段控件**（与趋势图粒度切换同一 `bg-muted rounded-md` 样式族），不用 `TabsList variant="line"`——避免与中栏主 tab 的视觉层级打架；
> 2. 题库表格本期**只出静态列**——「近次结果」列需要 per-question 结果持久化（现状明确不持久化，见 §1 事实 6），随「逐题明细」另立 spec；
> 3. 无 chunk 锚定的题**已有降级语义**——Layer 1 跳过 chunk 指标、仍参与路径选择判定（`metrics.py::evaluate_question` 文档字符串与 `_mean` 的 None 跳过），后端零改动。

---

## 1. 背景

父 spec §9 冻结了评测 Tab 的契约意图（题库 CRUD、触发运行、历史列表、存为考题、复现跳转），可视化子 spec 交付了「看数据」的一半（指标总览 + 趋势图 + drawer 壳）。本 spec 交付另一半：**管题库、跑评测、翻历史**——让题库随使用自然生长，让产品成员不碰 CLI 也能跑评测。

**设计目标**（沿用可视化 spec 的三秒原则并扩展）：

1. **3 秒判断**：打开评测 Tab 默认落在总览视图，健康度判断路径与现状完全一致；
2. **造题零成本**：召回测试面板勾选正确 chunk → 一键存为考题，题库随使用生长；
3. **一键运行**：改完检索代码/调完参数，点一个按钮跑 Layer 1，轮询见结果；
4. **发现到定位不切心智**：失败考题一键跳召回测试面板复现（父 spec §9 附录 A 明示诉求）。

**架构事实核查（2026-08-27 代码核查）**：

1. **Golden 题库是单 JSONL 文件**，schema 固化在 `backend/packages/harness/deerflow/knowledge/eval/dataset.py`：必填 `id / query / expected_path / relevant_chunk_ids / relevant_entities / category`，可选 `reference_answer`；枚举 `CATEGORIES = (fact, relation, concept, global)`、`EXPECTED_PATHS = (vector, graph, wiki)`；chunk id 格式 `<32hex doc_id>#NNNN`；`validate_question()` 单题校验 + `load_golden()` 全量加载（含 id 去重守卫）——**API 写路径必须复用同一校验函数**，脏题静默污染指标是题库的第一风险（模块 docstring 明示）。
2. **无锚定题降级语义已存在**：`metrics.py::evaluate_question`——`relevant_chunk_ids` 为空时 hit/recall/mrr 计 None 且不进均值（`aggregate()` 的 `_mean` 跳过 None），路径选择判定（path_correct）照常参与。手动添加的题不填锚定即可成立，**后端指标链路零改动**。
3. **触发幂等的既有模式**：wiki 生成 `POST /{kb_id}/wiki/generate` → 202 `{"status": "enqueued" | "already_running"}`（`routers/knowledge_bases.py:313`），service 层 `trigger_wiki_generation()` 返回 bool（`knowledge_service.py:348`），in-flight 源是模块级注册表 `wiki_generation_in_progress(kb_id)`；运行期状态经 list 端点 payload 的 `generation` 标志下发，前端以 3s `refetchInterval` 轮询直至 drain（`core/knowledge/wiki-status.ts` + `hooks.ts:222`）。**评测触发完整复刻此模式**，不引入新机制。
4. **CLI 与持久化现状**：`backend/scripts/run_rag_eval.py`（Layer 1）持 `--golden/--out/--kb-id` 必填 + `--baseline auto`（读 DB is_baseline 行做 diff）+ `--mark-baseline`；退出码 0/1→completed、2→error、3→skipped（`persistence.py::status_from_exit_code`）。gateway 进程内引擎与 store 已初始化，**service 层触发不复用 CLI 的 `init_engine_from_config` 路径**，直接调 `runner.py::build_default_searchers / run_evaluation` + `persistence.py::save_eval_run`；检索以 KB owner 身份执行（`build_default_searchers(user_id=kb["owner_id"])` 先例）。
5. **eval_runs 读端点已落地三个**：`GET /eval-runs/latest`、`/trend`、`/{run_id}`（`routers/knowledge_bases.py:540-574`）；`environment` 枚举 `(local, ci, nightly)`，ci 行默认不进 latest/trend。历史列表端点需新增（§6.1）。
6. **逐题结果不持久化**：`persistence.py::baseline_report_from_metrics` docstring 明示 "Per-question detail is not persisted in eval_runs"——「每题最近一次 ✅/❌」需要新增持久化，**本期不做**，随逐题明细 spec（可视化 spec 运行期遗留第 1 条）一并设计。
7. **KB 数据目录约定**：`knowledge_service.py:234`——`data_dir / "knowledge" / kb_id / ...`，`data_dir = get_paths().base_dir / "data"`（`app.py:365`）。per-KB golden 文件落 `data/knowledge/<kb_id>/golden.jsonl`，与上传文档同目录树（§4.1）。
8. **CI 题库与运行期题库分离**：CI 门禁用 git 版本化的 `backend/tests/fixtures/rag_eval/golden.jsonl`（`.github/workflows/rag-eval.yml:116` 显式 `--golden` 传入）。UI CRUD 写的是 per-KB 运行期文件，两者是**两份题库**：CI 的需 review 沉淀，运行期的随使用生长；同步是纯手动动作（review 后拷贝文件），本 spec 不做自动同步。
9. **前端联动先例齐备**：跨 tab 携带状态跳转——`page.tsx` 的 `onViewInVectorSpace`（`setVectorOverlay(next); setActiveTab("recall"→"vectors")`，`page.tsx:388`）；tab 激活门控——`enabled: activeTab === "eval"`（`eval-tab.tsx`）；窄面板工具栏降级——`useToolbarTier` 溢出检测（`eval-tab.tsx:50`）；drawer 下钻——ChunkDrawer / WikiEntryDrawer / ManualCardDrawer / EvalRunDrawer。
10. **召回测试链路**：`POST /{kb_id}/recall-test`（`routers/knowledge_bases.py:472`，`{query, top_k}`）返回三路结果，vector/graph 命中行带 `chunk_id`（`RecallVectorHit` / `RecallGraphEvidence`）；前端 `RecallTestPanel` 的 query 是本地 state（`recall-test-panel.tsx:118`），接收外部预填需新增 prop（§7.2）。

---

## 2. 交付项与建议顺序

| # | 交付项 | 依赖与理由 |
|---|---|---|
| P0 | **题库存储与 CRUD API**（per-KB golden.jsonl + `GET/POST/DELETE /eval/questions`） | 一切的前置；写路径复用 `validate_question` 守卫（§4） |
| P0 | **运行触发**（`POST /eval-runs` 202 + per-KB in-flight 注册表 + service 层 runner） | 复刻 wiki 幂等模式；工具栏主按钮的数据源（§5） |
| P0 | **历史列表 API**（`GET /eval-runs` + `in_flight` 标志） | 触发后轮询的落点；历史视图数据源（§6） |
| P1 | **分段三视图布局**（eval-tab 工具栏 + 视图 state） | 依赖三个数据契约；本期所有前端内容的骨架（§3） |
| P1 | **题库视图**（表格 + 详情 drawer + 添加 dialog + 删除确认） | 依赖 CRUD API（§4.3–4.5） |
| P1 | **历史视图**（运行列表 + 复用 EvalRunDrawer 下钻） | 依赖历史 API（§6.2） |
| P2 | **召回面板联动**（存为考题 + 复现跳转预填） | 依赖 CRUD API 与 page 层 prefill 通道（§7） |

建设顺序纪律：**先契约后视图，先题库后触发**——没有题库文件就没有可跑的评测；历史列表是触发反馈的落点，两者同属一轮询闭环。

---

## 3. 布局设计：分段三视图（冻结）

```
┌────────────────────────────────────────────────────────┐
│ [总览|题库|历史]            上次运行 3 天前 [▶ 运行评测] │ ← 常驻工具栏（替换现 runConfigNote 占位行）
├────────────────────────────────────────────────────────┤
│ 总览（默认）= 现状：指标总览 + 趋势图（零改动）           │
│ 题库 = 题目表格（§4.3）                                  │
│ 历史 = 运行列表（§6.2）                                  │
└────────────────────────────────────────────────────────┘
```

**契约**：

1. **视图 state 在 `eval-tab.tsx` 本地**（`useState<"overview" | "questions" | "history">`，默认 `overview`），不进 URL——知识库页 tab 本就是本地 state（可视化 spec §4.4 已冻结不可深链）。
2. **分段控件**与趋势图粒度切换同一样式族（`bg-muted flex rounded-md p-0.5` + `role="radiogroup"`），三项短标签（总览/题库/历史），不做 badge 计数。
3. **工具栏常驻三视图**（不切视图时消失）：左分段控件，右侧依次「上次运行 X 前」短文案（`text-muted-foreground text-xs`，nowrap，运行中替换为 spinner +「运行中…」）与主按钮「运行评测」（`size="sm"`）。
4. **窄面板降级**：复用 `useToolbarTier` 溢出检测先例（`eval-tab.tsx:50`）——溢出时运行按钮收进 ⋯ 菜单，分段控件三项足够短恒可内联。
5. **keep-alive 门控不变**：三个视图的查询均 `enabled: activeTab === "eval"` 门控；视图间切换不发新请求（TanStack Query 按 queryKey 缓存）。
6. **总览视图零改动**：`EvalMetricsOverview` + 趋势图区块（含粒度切换）原样保留，仅工具栏行的占位文案 `runConfigNote` 被真实工具栏替换。
7. 滚动模型不变：面板容器 `overflow-auto` + 内容 `min-w-[32rem]` 横向滚动下限，题库表格与历史列表共用此模型。

**「上次运行 X 前」的数据口径**：取 `GET /eval-runs` 历史列表首行（任一层的最近 completed 行）的 `created_at`，相对时间格式化（X 分钟/小时/天前）；无历史行显示「尚未运行」；`in_flight=true` 时整个文案位换 spinner +「运行中…」。

---

## 4. 题库管理

### 4.1 存储（冻结）

- **每 KB 一个 golden 文件**：`data/knowledge/<kb_id>/golden.jsonl`（事实 7 的目录约定），JSONL 一行一题，schema 与 `dataset.py` 完全一致。
- **写路径**：读全量 → `load_golden` 校验（防御手工编辑产生的脏文件）→ 内存改 → **tmp 文件 + 原子 replace** 落盘（防半写）。题库规模 50–100 题，全量读写无性能问题。
- **并发**：单进程内 per-KB `asyncio.Lock` 串行化读写（与 `_IN_FLIGHT` 同边界——单进程内存态，不多副本队列，父 spec §10 边界沿用）。
- **CI 题库不动**（事实 8）：`backend/tests/fixtures/rag_eval/golden.jsonl` 继续由 git 管理，CLI `--golden` 显式指定路径的现状不变。

### 4.2 API 契约（冻结）

路由挂 `routers/knowledge_bases.py`，全部走 `_require_kb_access` 鉴权先例：

| 方法与路径 | 语义 | 响应 |
|---|---|---|
| `GET /{kb_id}/eval/questions` | 读全量题库 | 200 `{questions: [...], total: N}`；文件不存在 → `{questions: [], total: 0}`（新 KB 不是错误） |
| `POST /{kb_id}/eval/questions` | 新增一题 | 201 完整 question（含服务端生成的 id） |
| `DELETE /{kb_id}/eval/questions/{question_id}` | 删一题 | 204；id 不存在 → 404 |

**POST 请求体**：

```json
{
  "query": "问题文本（必填，非空）",
  "category": "fact | relation | concept | global（必填）",
  "expected_path": "vector | graph | wiki（必填）",
  "relevant_chunk_ids": ["<doc_id>#NNNN", "...（可空数组）"],
  "relevant_entities": ["实体名（可空数组）"],
  "reference_answer": "参考答案（可选，非空字符串才接受）"
}
```

**服务端规则**：

1. `id` 由服务端生成：`q_` + uuid4 前 8 位 hex；请求体携带 `id` 字段 → 422（id 管理权在服务端）。
2. 校验**复用 `dataset.py::validate_question`**（先注入生成的 id 再校验）——schema 单一事实源，UI 写入与 CLI 加载走同一守卫；校验失败 → 422，detail 含具体字段错误。
3. `relevant_chunk_ids` / `relevant_entities` 缺省或空数组合法（无锚定题，事实 2 的降级语义）；chunk id 格式由 `validate_question` 的正则守卫。
4. 题库文件本身脏（手工编辑引入非法行）→ 读写均 500，detail 指明行号——不静默跳过，脏题必须显式暴露（事实 1 的风险观）。
5. **不支持编辑**（父 spec §9 意图只有读/增/删）：改题 = 删了重加。

### 4.3 题库视图（表格）

| 列 | 内容 | 备注 |
|---|---|---|
| 问题 | `query` truncate + `title` 全文 | 主列 |
| 分类 | Badge（事实/关系/概念/全局，i18n 复用 `eval.category.*`） | |
| 预期路径 | Badge（vector/graph/wiki） | |
| 锚定 | `3 切片` / `3 切片 · 2 实体` / 「未锚定」（muted） | 由两个数组长度推导，不下发展开 |
| 操作 | ↗ 复现（§7.2）+ 🗑 删除（icon button） | nowrap |

- **行点击 → 题目详情 drawer**（§4.5）；操作列按钮 stopPropagation。
- **添加入口**：表格尾部「+ 添加考题」行（虚线框按钮样式，与空态视觉一致）→ 添加 dialog（§4.4）。
- **删除二次确认**（dialog：展示 query 全文 + 「删除后不可恢复」）；删除成功 toast。
- **空态**：虚线框 + 「题库为空——在召回测试面板勾选正确切片可一键存为考题」（引导造题主路径）。
- 表格组件：`ui/table.tsx` 由 shadcn registry 添加（可视化 spec §1 事实 3 已立先例：`pnpm dlx shadcn add table`，不手写）。
- 三态齐备：loading / 加载失败 / 数据（与总览视图同款 dashed 边框占位）。

### 4.4 添加考题 dialog（简化表单，冻结）

字段：`query`（textarea，必填）+ `category`（select，必填）+ `expected_path`（select，必填）+ `reference_answer`（textarea，可选）。**不暴露** `relevant_chunk_ids` / `relevant_entities` 输入——手填 chunk id 痛苦且无意义，锚定的正确来源是召回面板「存为考题」（§7.1）；无锚定题走事实 2 的降级语义（Layer 1 仅参与路径判定 + Layer 2 正常评分）。

dialog 内一行说明文案（ⓘ tooltip 同款原则，不长篇 inline）：「未锚定切片的题只参与路径选择与生成质量评测」。提交成功 toast + 题库 query invalidate。

> **2026-08-28 修订**（用户实测反馈）：分类/预期路径下拉**默认取第一项**（fact / vector），不设空占位项——空行观感差且易误选；必填校验因此收敛为仅 query 必填。

### 4.5 题目详情 drawer

右侧 drawer（EvalRunDrawer 同款覆盖式）：完整 query、分类/预期路径 Badge、reference_answer 全文（无则「未填写」muted）、锚定清单（chunk id 列表可复制 + 实体名列表）、底部「↗ 在召回测试面板复现」主按钮（§7.2）与「删除」次按钮（同 §4.3 确认）。只读——编辑不支持（§4.2 规则 5）。

---

## 5. 运行触发

### 5.1 契约（冻结，复刻 wiki 幂等模式）

```
POST /{kb_id}/eval-runs        → 202 {"status": "enqueued" | "already_running"}
GET  /{kb_id}/eval-runs?limit= → 200 {in_flight: bool, runs: [...], total: N}   （§6.1）
```

- service 层 `trigger_eval_run(kb_id)` 返回 bool，per-KB in-flight 注册表与 `wiki_generation_in_progress` 同模式（模块级，单进程边界）；已 in-flight → `already_running`，不排重复运行。
- **执行体**：asyncio fire-and-forget 任务（wiki 生成同款）；进程内直接调 `runner.py::run_evaluation`（事实 4），不走 CLI 子进程。
- **执行范围：仅 Layer 1**（冻结）。理由：Layer 2 跑真实对话链路 + LLM judge，分钟级耗时且有 token 成本，由 nightly 覆盖（父 spec §8）；按钮场景是「改代码/调参后快速验证检索质量」，确定性指标秒级~分钟级即出。契约不为 Layer 2 预留参数——需要时另立 spec 扩展。
- **baseline diff 自动带**：触发即按 `--baseline auto` 语义读 DB is_baseline 行做 diff（事实 4），有基线则 `baseline_diff` 落库——趋势图回退标红对 UI 触发运行同样生效。
- **`environment = "local"`**：UI 触发语义等同本地手动跑（人发起、要进趋势），复用现有枚举不新增值。
- **失败落行**：KB 不存在 → 404（路由层）；题库为空（文件不存在或 0 题）→ **409**（先造题再跑）；运行期异常 → error 行落库（`status_from_exit_code` 同口径），历史列表可见——不静默。
- 持久化复用 `persistence.py::save_eval_run`（layer1_metrics 写入，layer2 为 `{}`——两层互补语义与双 CLI 一致）。

### 5.2 工具栏运行按钮状态机

| 状态 | 渲染 | 交互 |
|---|---|---|
| idle | 「▶ 运行评测」主按钮 | 点击 → POST |
| enqueued 返回 | toast「评测已开始」+ 按钮转 running 态 | — |
| already_running 返回 | toast「已有评测正在运行」+ 按钮转 running 态 | — |
| running（in_flight=true） | spinner +「运行中…」禁用态 | 不可点 |
| drain（in_flight→false） | invalidate `evalRuns` / `metricsOverview` / `evalTrend` 三个 query | 总览与趋势自动刷新 |

运行状态的真相源是 `GET /eval-runs` 的 `in_flight`（事实 3 的 wiki 先例：状态经 list payload 下发），**不是** POST 的返回值——tab 重新激活时靠它恢复 running 态。

### 5.3 轮询

`useEvalRuns` 的 `refetchInterval`：`in_flight === true` 时 3 秒（与 documents/wiki 同节奏，`wiki-status.ts` 先例），drain 后停（返回 `false`）。drain 沿切换边做一次性 invalidate（§5.2 表末行），非每次渲染重复 invalidate。

---

## 6. 历史运行列表

### 6.1 API 契约（冻结）

```
GET /{kb_id}/eval-runs?limit=50&include_ci=false
→ 200 {
    "in_flight": false,
    "runs": [
      {
        "run_id": "...", "created_at": "...", "completed_at": "...",
        "environment": "local | ci | nightly",
        "status": "completed | error | skipped",
        "is_baseline": false,
        "has_layer1": true, "has_layer2": false,
        "regression_detected": false,          // baseline_diff 为 null → false
        "langfuse_trace_url": null
      }
    ],
    "total": N
  }
```

- 排序 `created_at` desc；`limit` 默认 50、上限 200 clamp（trend API 的 `days_back` clamp 先例）。
- `include_ci` 默认 false——与 trend 同口径（CI 运行留痕但不进默认视图）；`true` 时全量返回。
- `has_layer1` / `has_layer2` 由 `layer1_metrics` / `layer2_metrics` 是否非 `{}` 推导（事实 5 的两层互补语义），不下发指标本体——行保持轻量，详情进 drawer。
- in-flight 中的运行**不在 `runs` 里**（行在运行完成落库后才存在，`save_eval_run` 单行插入语义），运行中状态只由顶层 `in_flight` 表达。

### 6.2 历史视图（列表）

行格式（单行 nowrap，图标+短文本）：

```
⭐ 08-26 14:30   [本地]  L1+L2   ✅ 完成
   08-25 09:12   [CI]    L1      ❌ 失败
   08-24 03:00   [定时]  L2      ⏭ 跳过
```

- ⭐ = `is_baseline`；环境 Badge 三值 i18n（本地/CI/定时）；层徽标 `L1` `L2` `L1+L2` 由 has_layer1/2 推导；状态图标 + 短文案（✅ 完成 / ❌ 失败 / ⏭ 跳过）；`regression_detected=true` 追加「回退」红 Badge（复用总览 `regressionBadge` 语义）。
- **行点击 → 复用 `EvalRunDrawer`**（`kbId + runId` props 现状即可满足）——与趋势图点数据点同一心智、同一下钻组件，零新 drawer。
- 空态：「尚无评测运行——点右上角运行评测发起首次评测」。
- skipped/error 行只在此视图可见（父 spec 与可视化 spec 已冻结：不进 latest/trend）——历史视图是它们的唯一曝光面。

---

## 7. 召回测试面板联动

### 7.1 存为考题（造题主路径）

- `RecallTestPanel` 结果区命中行（vector `RecallVectorHit` / graph evidence）新增**勾选 checkbox**；勾选 ≥1 时结果区尾部浮出「存为考题」按钮（`FlaskConical` 图标区既有视觉族）。
- 点击开 dialog：`query`（预填当前查询，可改）+ `category`（select，必填）+ `expected_path`（select，必填，默认勾选项来源路径；混路勾选时默认 vector）+ `reference_answer`（可选）+ 只读摘要「已选 N 个切片」。
- 提交 → `POST /eval/questions`（`relevant_chunk_ids` = 勾选 chunk id 集）→ toast 成功/失败；成功不跳视图（继续标注下一题，造题成本趋近于零）。
- **实体锚定不进 UI**（冻结）：`relevant_entities` 恒空数组——勾选图谱实体是另一套交互，且只影响 seed_hit_rate 单指标；需要实体标注的 graph 题走手工编辑 JSONL 的高级路径。

### 7.2 复现跳转（发现到定位不切心智）

- page 层新增 `recallPrefill` state（`useState<string | null>`），通道与 `onViewInVectorSpace`/`setVectorOverlay` 先例同构（`page.tsx:388`）：
  - 评测侧（题库表格 ↗ / 题目 drawer 主按钮）→ `setRecallPrefill(query); setActiveTab("recall")`；
  - `RecallTestPanel` 新增 `prefillQuery: string | null` + `onPrefillConsumed: () => void` props——`useEffect` 监听 prefillQuery 非空 → 写入本地 query state（`recall-test-panel.tsx:118`）→ 调 `onPrefillConsumed` 清空通道。
- 只预填 query，**不自动触发检索**（用户可能还要调 top_k；检索是 LLM/embedding 调用，不替用户发起）。

---

## 8. 数据层与 i18n

**新增 hooks**（`frontend/src/core/knowledge/hooks.ts`，命名与 enabled 门控沿用 `useMetricsOverview` 先例）：

| Hook | 类型 | 说明 |
|---|---|---|
| `useEvalQuestions(kbId, enabled)` | query | GET questions；queryKey `["eval-questions", kbId]` |
| `useAddEvalQuestion(kbId)` | mutation | 成功 invalidate questions |
| `useDeleteEvalQuestion(kbId)` | mutation | 成功 invalidate questions |
| `useEvalRuns(kbId, enabled)` | query | GET runs；`refetchInterval` 按 `in_flight` 3s/停（§5.3） |
| `useTriggerEvalRun(kbId)` | mutation | POST 202；返回 status 驱动 toast（§5.2） |

**i18n**：新增键全部落 `knowledge.eval.*`（题库/历史/触发）与 `knowledge.recall.*`（存为考题），`zh-CN.ts` + `en-US.ts` + `locales/types.ts` 三处同步；文案风格沿用既有定案——行内只放短 nowrap 状态，长解释进 ⓘ tooltip，UI 不出现 shell 命令提示（原 `runConfigNote` 的 CLI 提示文案随工具栏落地一并删除）。

---

## 9. 测试策略

只测外部可观察行为；先例对齐既有基建。

**后端**（`backend/tests/`，TDD  mandatory）：

| 目标 | 测试点 | 先例 |
|---|---|---|
| 题库 CRUD API | 空文件读空；POST 201 且文件可被 `load_golden` 回读；422 各类 schema 违例（坏枚举/坏 chunk id/带 id 字段）；DELETE 204/404；脏文件 500 指行号 | `test_eval_runs_api.py` 的 API fake 模式 |
| 触发幂等 | 首次 202 enqueued；in-flight 中再 POST → already_running 且不重复执行；空题库 409 | wiki 触发测试先例 |
| service 层 runner | stub 三路 impl 跑通、落库行 layer2 为 `{}`、baseline auto diff 生效（有标记行时 baseline_diff 非 null）、异常落 error 行 | `test_eval_persistence.py` |
| 历史 API | 排序/limit clamp/include_ci 开关/has_layer 推导/in_flight 标志/in-flight 行不出现 | `test_eval_runs_api.py` |
| 文件写守卫 | tmp+replace 原子写；并发写串行（per-KB lock） | `test_dataset.py` |

**前端**（`frontend/tests/` 或组件旁 `.dom.test.tsx`，对齐 eval 既有测试基建）：

| 目标 | 测试点 |
|---|---|
| eval-tab 视图切换 | 分段控件切三视图；默认 overview；总览内容渲染不变（回归） |
| 工具栏按钮状态机 | idle/running 渲染；already_running toast；drain 后三 query invalidate（mock queryClient 断言） |
| `useEvalRuns` | `in_flight=true` 时 refetchInterval 3s、false 时停；enabled=false 不发请求 |
| 题库表格 | 三态；锚定列推导（含未锚定 muted）；删除确认流 |
| 添加 dialog | 必填校验；提交体不含锚定字段 |
| 召回面板联动 | 勾选 → 按钮出现；存为考题提交体 chunk id 集正确；prefillQuery 写入并不自动检索 |

**E2E**（Playwright，对齐 `eval-metrics.spec.ts` 的 page.route mock 模式）：切题库视图见表格；触发按钮 mock 202 后进 running 态。

---

## 10. 风险与边界

| 风险 | 影响 | 缓解 |
|---|---|---|
| 手工编辑 golden.jsonl 产生脏行 | 指标静默污染 | 读路径全量 `load_golden` 校验、脏文件 500 指行号（§4.2 规则 4） |
| UI 触发与 CLI/nightly 并发撞同一 KB | 重复运行 | per-KB in-flight 注册表覆盖所有触发源（service 层统一入口，CLI 不经 gateway 故不共享注册表——并发碰撞窗口存在但无害：各自落行，趋势图末次语义吸收） |
| 运行中删题 | 当次运行拿到改前快照（内存） | 可接受：运行开始时一次读入题库快照，运行期删改只影响下次运行 |
| 单进程内存态 in-flight | 多副本部署重复触发 | 沿用父 spec §10 边界（与 wiki `_IN_FLIGHT` 同），不多副本队列 |
| 长评测（100 题 × 3 路）阻塞事件循环 | gateway 响应变慢 | 检索调用是 await IO 不阻塞；CPU 段（指标计算）亚秒级，无需 worker 外移 |

**Out of Scope**（另立 spec / 明确不做）：

- **逐题明细与「近次结果」列**：需 per-question 结果持久化（事实 6），随可视化 spec 遗留的「单次运行逐题明细 drawer」另立 spec。
- **Layer 2 UI 触发**：judge 成本与耗时不适合按钮场景（§5.1），需要时另立 spec。
- **题目编辑**：删了重加（§4.2 规则 5）。
- **实体锚定 UI**：手工编辑 JSONL（§7.1）。
- **CI 题库 ↔ 运行期题库自动同步**：手动拷贝（§4.1）。
- **双栏工作台布局**：2026-08-27 用户决策明确放弃。
- 多 KB 对比、自定义阈值、baseline 管理 API、平滑趋势线：沿用可视化 spec §7 遗留清单，均另立 spec。

---

## 附录 A：User Stories（验收视角）

| 角色 | 诉求 | 对应章节 |
|---|---|---|
| 产品成员 | 打开评测 Tab 默认看到健康度总览，与之前完全一致 | §3 |
| 产品成员 | 不碰 CLI，点一个按钮跑评测，运行中有明确状态反馈 | §5 |
| 产品成员 | 已有评测在跑时再点按钮不会重复排队 | §5.1 |
| 产品成员 | 翻看历史运行：何时跑、哪层、成败、是否 baseline、有无回退 | §6.2 |
| 产品成员 | 点历史行直接看单次运行详情（与点趋势图同一 drawer） | §6.2 |
| 产品成员 | 失败/跳过的运行也能在历史里找到痕迹 | §6.2 |
| 产品成员 | 在题库表格里管理题目：看全量、加题、删题 | §4.3 |
| 产品成员 | 手动加题只需填问题和分类，不用懂 chunk id | §4.4 |
| 产品成员 | 召回测试时勾选正确切片一键存为考题，题库随使用生长 | §7.1 |
| 产品成员 | 失败考题一键跳召回面板复现，发现到定位不切心智 | §7.2 |
| 题库维护者 | UI 写入的题库文件永远合法（与 CLI 同一 schema 守卫） | §4.2 |
| 题库维护者 | 手工编辑引入的脏行被显式报错而非静默跳过 | §4.2 |
| 平台开发者 | UI 触发的运行自动与标记 baseline 做 diff，回退标红照常生效 | §5.1 |
| 平台开发者 | CI 门禁题库不受 UI 操作影响，继续 git 版本化可 review | §4.1 |
| 平台开发者 | 窄面板下工具栏自动降级，不出现横向溢出 | §3 |
