# RAG Evaluation Metrics Visualization Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **2026-08-26 修订**（Task 2 完成后实现复查）：Task 4 补窄面板降级策略与 category 显示名本地化（Task 2 补遗）；Task 5 补趋势图空态用例。详见各任务内「2026-08-26 补」标注。

**Goal:** 为评测 Tab 实现数据可视化层——指标总览组件（Layer 1 表格 + Layer 2 卡片网格）与趋势图组件（ECharts 多线时间序列），含数据供给链路（双 CLI 持久化 + baseline 机制 + latest/trend 端点）；本 plan 仅分解实施任务，所有设计决策见 spec v3。

**Spec:** `docs/superpowers/specs/2026-08-24-rag-evaluation-metrics-visualization-design.md`（v3 已定稿）

**基线：** `50e9ae6a`（Task 0a 完成标记提交，分支 `feat/rag-knowledge-base`）

**Architecture:** 后端 `eval_runs` 表（migration 0017 已落地）持久化评估运行——一行 = 一次 CLI 运行，`run_rag_eval.py` 写 `layer1_metrics`、`run_ragas_eval.py` 写 `layer2_metrics`（未执行的层存 `{}`）；migration 0018 加 `is_baseline` + `environment` 两列（baseline 标记与 CI 隔离同批）；新增 `GET /eval-runs/latest`、`GET /eval-runs/trend`、`GET /eval-runs/{run_id}` 三个端点。前端复用 vector-canvas 的**手写 echarts 适配层**模式（`echarts/core` 模块化注册，无 `echarts-for-react` 依赖），新增 `eval-metrics-overview.tsx`（props 驱动静态展示）与 `eval-trend-chart.tsx`（纯渲染 canvas）两个组件，由 `eval-tab.tsx` 经 `next/dynamic ssr:false` 懒加载 + TanStack Query hooks（`enabled` 门控）注入数据；下钻走 `EvalRunDrawer`（drawer 先例），不开新路由。

**Tech Stack:** FastAPI + SQLAlchemy + Alembic（backend）+ ECharts 5.6（手写适配）+ React 19 + TanStack Query + TypeScript（frontend）；后端测试 `pytest`，前端测试 `rstest` + `pnpm check`。

**Global Constraints:**
- Branch: `feat/rag-knowledge-base`（沿用当前工作分支）; each task: RED → GREEN → regression proof (revert→RED→restore→GREEN) → commit (Conventional Commits)。
- Backend TDD mandatory: `cd backend && uv run pytest <file> -q`；frontend DOM tests (`pnpm test`)，收尾 `pnpm check` + `ruff` 双净。
- ECharts 懒加载纪律：canvas 组件由 eval-tab 经 `next/dynamic ssr:false` 挂载（对齐 vector-tab 先例），不进首屏 chunk；`performance-budgets.json` 无需新增条目（懒加载组件不进测量面）。
- 指标颜色语义与 CI 门禁同源：`threshold_percent = DEFAULT_FAIL_THRESHOLD * 100` 由后端 trend API 返回，前端不硬编码。
- Layer 1 实线 / Layer 2 虚线视觉规范冻结（spec §4.3.2），实施时不得变更。
- 数据库纪律：复用同一 SQLite 数据库（`deerflow.persistence.base.Base`）；0017 已落地，新增 `is_baseline` 列为 migration 0018，不改已有 migration 文件。
- 样式纪律：UI 着色用语义 CSS 变量（新建 `frontend/src/styles/eval-metrics.css`，globals.css 末尾 `@import`，不改原有变量）+ 主题 token；禁止 `amber-/rose-/gray-` 裸色板（全仓无先例）。图表装饰层（轴/图例/tooltip）主题感知（vector-canvas `ink()` 先例）。
- i18n 纪律：全部 UI 文案走 `tk.eval.*`（`types.ts` / `zh-CN.ts` / `en-US.ts` 三处同步）；canvas 组件保持纯渲染，文案经 props/option 参数注入。
- 数据纪律：服务端状态一律 TanStack Query hooks（`core/knowledge/hooks.ts`）；keep-alive 六 pane 常驻，评测查询必须 `enabled: activeTab === "eval"` 门控（`useWikiEntries` 先例）。
- `ui/` 组件由 shadcn registry 生成（frontend/AGENTS.md），`table.tsx` 用 CLI 添加，不手写。
- Known code facts (verified 2026-08-24, v2 核查):
  - Layer 1 报告（`runner.py`）：`overall{count,hit_rate,recall,mrr,path_accuracy}` + `by_category`（动态键，仅含本批次出现的 category）+ `diff`——键名 `recall` 需映射为 `recall_at_k`，`overall→summary`，`count→question_count`。
  - Layer 2 报告（`ragas_eval.py::Layer2Report`）：`aggregate{path_accuracy,citation_precision,citation_recall,graph_entity_hit_rate,ragas{...}}` + `ragas_available/ragas_skip_reason/langfuse/generated_at`——**不含** hit_rate/recall/mrr。
  - `eval_runs` 表已存在（0017）；`EvalRunRow` 在 `models.py` L163-L193。
  - 数据库现状：`migrations/versions/` 最新为 `0017_eval_runs_table.py`，新列走 `0018_eval_runs_baseline.py`（`is_baseline` + `environment` 两列同批；部分唯一索引需 `sqlite_where` + `postgresql_where` 双方言声明）。
  - 前端组件库：缺 `table.tsx`（shadcn CLI 生成）。
  - ECharts 适配先例：`vector-canvas.tsx`（手写适配 + `graph-utils.ts` 纯函数可测模式）；无 `echarts-for-react` 依赖。
  - 评测 Tab 挂载点：`middle-tabs.tsx`（`KnowledgeMiddleTab` 当前 5 tab，扩 `"eval"` 为第 6 个）；tab 为本地 state 不可深链，知识库路由为 `/workspace/knowledge?kb=<id>`。
  - 详情视图先例：drawer（ChunkDrawer / WikiEntryDrawer / ManualCardDrawer），非路由。
  - 后端路由挂载点：`backend/app/gateway/routers/knowledge_bases.py`（现有无 `/eval-runs` 端点，全部新增）；API 测试基建对齐 `test_vector_projection_api.py`。
  - v3 设计决策（spec 头部修订记录）：`environment` 三值 `local/ci/nightly`，`--environment` 显式优先、否则按环境推断（`CI=true`→`ci`）；trend/latest 默认排除 ci（`include_ci=true` 可含）；聚合统一「周期末次」（v2 均值已废弃）；回退标红由 `baseline_diff.regression_detected` 驱动（per-category 口径），与 summary 阈值线解耦；`created_at` 显式写报告 `generated_at`（不用 DB default）；`run_rag_eval.py --baseline auto` 读 is_baseline 行做 diff；聚合逻辑抽纯函数 `eval/trend.py` 直测。
  - **无** `frontend/tests/unit/knowledge/middle-tabs.dom.test.tsx`——Task 4 的测试文件是 Create 不是 Modify。

---

## Phase 1: 基础设施（前置依赖）

### Task 0a: 新增 eval_runs 数据库表 ✅ 已完成（2026-08-24，`d5952f1c`）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/models.py`（+`EvalRunRow`）
- Create: `backend/packages/harness/deerflow/persistence/migrations/versions/0017_eval_runs_table.py`
- Create: `backend/tests/knowledge/eval/test_eval_runs_model.py`

- [x] RED test：EvalRunRow 字段完整性；JSON 字段可序列化/反序列化。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_eval_runs_model.py -q`，记录 missing-table RED。
- [x] Implement `EvalRunRow` + Alembic migration 0017。
- [x] Run migration：`cd backend && uv run alembic upgrade head`（成功升级至 0017）。GREEN→RED→upgrade → GREEN。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add eval_runs table for evaluation metrics persistence`（`d5952f1c`）

### Task 0b: 双 CLI 持久化——两层报告各写 eval_runs 一行 ✅ 已完成（2026-08-24）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/eval/persistence.py`（`save_eval_run` 共享函数 + §3.1.2 字段映射纯函数）
- Modify: `backend/scripts/run_rag_eval.py`（Layer 1 CLI 调用保存）
- Modify: `backend/scripts/run_ragas_eval.py`（Layer 2 CLI 调用保存）
- Create: `backend/tests/knowledge/eval/test_eval_persistence.py`

- [x] RED test：
  - 字段映射纯函数：Layer 1 报告 → `layer1_metrics`（`overall→summary`、`recall→recall_at_k`、`count→question_count`、`by_category` 动态键透传）；Layer 2 报告 → `layer2_metrics`（`ragas` / `arch_specific` / `ragas_available` / `ragas_skip_reason` / `has_graph_questions`）。
  - Layer 1 CLI 运行后新增一行：`layer1_metrics` 非空、`layer2_metrics == {}`；Layer 2 CLI 反之。
  - status 映射：exit 0/1 → `completed`、exit 2 → `error`、exit 3 → `skipped`（skipped/error 行也写库）。
  - `baseline_diff` 列：Layer 1 带 `--baseline` 时写入（含 `recall_at_k_delta / regression_detected / threshold_percent` 与回退 category 列表）。
  - `environment` 推断（纯函数 `resolve_environment`）：`--environment` 显式指定优先；否则 `CI=true` → `ci`，缺省 `local`。**CLI 标志接线与落库在 Task 0c**（`environment` 列由 migration 0018 提供）。
  - `created_at` 显式写报告 `generated_at`（不用 DB default）。
  - ~~`--baseline auto`~~ → **移至 Task 0c**（读取 `is_baseline` 行依赖 0018 新列，与 `--mark-baseline` 同批落地）。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_eval_persistence.py -q`，记录 missing-module RED（`ImportError: cannot import name 'persistence'`）。
- [x] Implement `persistence.py`（映射纯函数 + `save_eval_run` + environment 推断纯函数）+ 两个 CLI 接线（completed/error/skipped 三态均落库，best-effort 不影响 exit code；引擎生命周期复用 CLI 现有 `init_engine_from_config` 段，早退路径按需自建自销）。
- [x] GREEN（22 passed）；revert proof：stash 三实现文件 → collection-error RED → pop → GREEN。
- [x] ruff 双净。
- [x] Commit: `feat(rag): persist layer1/layer2 eval runs to eval_runs table`（`3c20a204`）

### Task 0c: migration 0018——is_baseline + environment 列 + --mark-baseline ✅ 已完成（2026-08-25）

**Files:**
- Create: `backend/packages/harness/deerflow/persistence/migrations/versions/0018_eval_runs_baseline.py`
- Modify: `backend/packages/harness/deerflow/knowledge/models.py`（`EvalRunRow` +`is_baseline`）
- Modify: `backend/packages/harness/deerflow/knowledge/eval/persistence.py`（标记逻辑）
- Modify: `backend/scripts/run_rag_eval.py` / `run_ragas_eval.py`（+`--mark-baseline`）
- Modify: `backend/tests/knowledge/eval/test_eval_persistence.py`

- [x] RED test：标记后该行 `is_baseline=true` 且同 KB 旧 baseline 被清（同事务）；部分唯一索引存在（每 KB 至多一行 true，双方言 where 声明）；`environment` 列存在且存量行回填默认值 `local`；`--baseline auto`：从 eval_runs 读该 KB is_baseline 行做 diff，无 baseline 行按无 diff 运行（自 0b 移入——依赖本任务新增的 `is_baseline` 列）。
- [x] Implement migration 0018（`is_baseline` Boolean NOT NULL default false + `environment` String(16) NOT NULL default `"local"` + 双方言部分唯一索引）+ 标记逻辑。
- [x] `alembic upgrade head` GREEN；downgrade→upgrade revert proof.
- [x] ruff 双净。
- [x] Commit: `feat(rag): add is_baseline flag to eval_runs with mark-baseline CLI option`

### Task 0d: 前端 table 组件 + 语义色 CSS 变量 ✅ 已完成（2026-08-25）

**Files:**
- Create: `frontend/src/components/ui/table.tsx`（**shadcn CLI 生成**：`cd frontend && pnpm dlx shadcn@latest add table`，不手写）
- Create: `frontend/src/styles/eval-metrics.css`（spec §3.5 三态语义变量，亮暗双主题）
- Modify: `frontend/src/styles/globals.css`（**末尾** `@import` 新文件，不改原有变量）

- [x] shadcn CLI 生成 table 组件；`pnpm check` 通过。
- [x] eval-metrics.css 变量定义（`--eval-ok/--eval-warn/--eval-warn-bg/--eval-warn-fg/--eval-danger/--eval-danger-bg/--eval-danger-fg`）。
- [x] Commit: `feat(frontend): add table component and eval metric semantic colors`（`619478b9`）

---

## Phase 2: 后端读取端点

## Task 1: eval-runs 读取 API——latest + trend + run_id 三端点 ✅ 已完成（2026-08-25）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/eval/trend.py`（`aggregate_trend_points` 聚合纯函数）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（+GET `/{kb_id}/eval-runs/latest`、`/{kb_id}/eval-runs/trend`、`/{kb_id}/eval-runs/{run_id}`）
- Modify: `backend/app/gateway/services/knowledge_service.py`（+`get_latest_eval_metrics` / `get_eval_trend` / `get_eval_run`）
- Modify: `backend/packages/harness/deerflow/knowledge/store.py`（+`list_eval_runs` / `get_eval_run_row`——随 `efec065e` 实际落地，此前漏记，补记）
- Create: `backend/tests/knowledge/eval/test_trend.py`（聚合纯函数）
- Create: `backend/tests/knowledge/test_eval_runs_api.py`

- [x] RED test 聚合纯函数先行（`test_trend.py`）：三粒度统一末次语义、跨周/跨年/空周期边界、两层独立取数、双 run_id 来源、ci 过滤、regression 透传。
- [x] RED test API（基建对齐 `test_vector_projection_api.py`）：
  - latest：两层各取最近 `status=completed` 且对应层 `*_metrics != {}` 且非 ci 的行；一层无数据该层为 null；未知 kb 404。
  - trend：`include_ci=true` 时 ci 行进入取数集合；该层该周期无数据指标为 null。
  - baseline 块：有 baseline 行时返回 `recall_at_k` + `threshold_percent`（= `DEFAULT_FAIL_THRESHOLD * 100`）；无则 `baseline: null`；`is_baseline_update` 在 baseline 行对应日期为 true。
  - `GET /eval-runs/{run_id}`：单行完整 JSON；跨 kb 访问 404。
  - 非法 granularity → 422；`days_back` clamp ≤90 并在响应回显实际值。
  - 空历史：`has_data: false`。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_trend.py tests/knowledge/test_eval_runs_api.py -q`，记录 missing-module/endpoint RED（ImportError + 14 failed）。
- [x] Implement：`trend.py` 纯函数聚合（spec §4.2），service 薄壳读 eval_runs 全量行（单 KB <100 条）内存计算，返回 `MetricsOverview` / `TrendResponse` / `EvalRunDetail` schema。
- [x] GREEN（34 passed）；revert proof：stash 实现 → RED → 恢复 → GREEN。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add eval-runs latest and trend API endpoints`（`efec065e`）

---

## Phase 3: 前端可视化

## Task 2: 指标总览组件——Layer 1 表格 + Layer 2 卡片（props 驱动） ✅ 已完成（2026-08-25）

**Files:**
- Create: `frontend/src/components/workspace/knowledge/eval-metrics-overview.tsx`
- Create: `frontend/src/components/workspace/knowledge/eval-metrics-overview.utils.ts`（`getCellColorClass` / `getProgressBarColor` 纯函数）
- Modify: `frontend/src/core/knowledge/types.ts`（+`MetricsOverview` / `Layer1Metrics` / `Layer1CategoryMetrics` / `RagasMetrics` / `ArchSpecificMetrics` / `BaselineDiff`）
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`（+`tk.eval.*` 总览文案组）
- Create: `frontend/tests/unit/knowledge/eval-metrics-overview.dom.test.tsx`
- Create: `frontend/tests/unit/knowledge/eval-metrics-overview.unit.test.ts`（纯函数）

- [x] RED test：
  - Layer 1 表格：5 行渲染（4 category + 汇总）、单元格三态着色（阈值来自 `baseline_diff.threshold_percent` props，非硬编码）
  - 缺失 category（`by_category` 无此键）整行灰显「本批次无此类题目」；`layer1 === null` 整区空态
  - Layer 2 卡片：RAGAS 四指标 + 架构专属三指标渲染；null 显示 `-`、`ragas_available=false` Badge、`has_graph_questions=false` 禁用态；`layer2 === null` 整区空态
  - 纯函数：`getCellColorClass` 边界（delta=0 / ±threshold / 无 diff）、`getProgressBarColor` 三档 + null
  - 文案断言走 i18n key（zh-CN / en-US 双字典）
- [x] Run `cd frontend && pnpm test eval-metrics-overview`，记录 missing-component RED。
- [x] Implement：组件 props 驱动（不内置 fetch），着色用 `bg-(--eval-warn-bg)` 等语义变量，中性色用 `text-muted-foreground` 等 token。
- [x] GREEN（22 passed）；revert proof：stash 实现 → RED → pop → GREEN。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add eval metrics overview with Layer 1 table and Layer 2 cards`（`4d3c8818`）

> **2026-08-26 补**（实现复查）：Layer1Table 行头当前直接渲染 wire 键（`fact/relation/concept/global`），中文用户会看到英文协议键，与 §3.6 i18n 纪律有出入——category 显示名本地化（`tk.eval.category.*` + Layer1Table 渲染改用显示名）移至 **Task 4** 随 i18n 批次落地，见 Task 4 补遗。

---

## Task 3: 趋势图 canvas——手写 echarts 适配层 + 纯函数 option ✅ 已完成（2026-08-26，`9bbb69eb`）

**Files:**
- Create: `frontend/src/components/workspace/knowledge/eval-trend-chart.tsx`（纯渲染 canvas，`export default`）
- Create: `frontend/src/components/workspace/knowledge/eval-trend-chart.utils.ts`（`buildChartOption` / `buildTrendTooltipHtml` / `escapeHtml` 纯函数）
- Modify: `frontend/src/core/knowledge/types.ts`（+`TrendPoint` / `TrendResponse` / `TrendQueryParams` / `TrendChartLabels` / `EvalRunDetail`——后者为 Task 6 drawer 预埋类型）
- Create: `frontend/tests/unit/knowledge/eval-trend-chart.dom.test.tsx`（mock `echarts/core` 适配层 + ResizeObserver 桩（panels-shell 先例），对齐 `graph-tab.dom.test.tsx` 基建）
- Create: `frontend/tests/unit/knowledge/eval-trend-chart.unit.test.ts`（纯函数，对齐 `vector-canvas.unit.test.ts`）

- [x] RED test：
  - canvas mock 下 props 透传（points/granularity/baseline/labels/onPointClick）
  - `buildChartOption` 纯函数：
    - 6 条 series（颜色/线型/默认显隐：Recall@k+Hit Rate 显示，其余隐藏）
    - datum 携带 `runId`（Layer 1 线挂 `layer1_run_id`，Layer 2 线挂 `layer2_run_id`）+ `metricKey`（tooltip 格式化用）
    - 阈值线：`baseline.recall_at_k - threshold_percent/100`；`baseline === null` 时不生成 markLine
    - 回退点项级 `itemStyle` 标红（`regression.detected` 驱动，per-category 口径，与阈值线解耦）
    - y 轴动态下界（数据/阈值线最小值让 0.05、下限 0、上界 1）
    - 基线更新竖线（`is_baseline_update` 点；阈值缺位时竖线仍生成）
    - tooltip 输出格式（率类百分比 / MRR/RAGAS 三位小数 + 环比箭头）+ `escapeHtml` 转义
- [x] Run `pnpm test eval-trend-chart`，记录 missing-component RED（2 个测试文件均 Cannot find module）。
- [x] Implement：
  - 手写适配层：`echarts/core` 模块化注册（LineChart + Grid/Tooltip/Legend/MarkLine/DataZoom 组件 + CanvasRenderer），init/setOption/ResizeObserver/MutationObserver 主题感知（vector-canvas 先例；主题重建经 argsRef 读最新 props，规避一次性闭包过期）
  - click 从 `params.data.runId` 取数（不依赖 dataIndex）
  - 组件不 fetch、不直接调 `useI18n`（labels 经 props 注入）
- [x] GREEN（26 passed）；revert proof：stash 两实现文件 → collection-error RED → pop → GREEN。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add eval trend chart canvas with hand-rolled echarts adapter`（`9bbb69eb`）

---

## Task 4: 评测 Tab 挂载——middle-tabs 扩第六 tab ✅ 已完成（2026-08-26，`0d549eee`）

> **2026-08-26 布局定案**：维持 spec v3 §5 单列垂直布局（route A）。用户手绘的双栏工作台草图（左：题库+历史边栏）依赖父 spec §9 二期 API（题库 CRUD / 历史列表 / 触发评测），不属本 plan；双栏如需重做随 §9 立项时一并设计。

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/middle-tabs.tsx`（`KnowledgeMiddleTab` 扩 `"eval"` + TabsTrigger/TabsContent + `eval: ReactNode` prop）
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`（`tk.tabs.eval` = 评测 / Evaluation）
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（接线 eval pane + drawer state）
- Create: `frontend/src/components/workspace/knowledge/eval-tab.tsx`（组合 overview + trend + drawer 占位；数据接线在 Task 5）
- Modify: `frontend/src/components/workspace/knowledge/eval-metrics-overview.tsx`（**2026-08-26 补遗**：Layer1Table category 显示名本地化）
- Create: `frontend/tests/unit/knowledge/middle-tabs.dom.test.tsx`（**新建**——该文件不存在）

- [x] RED test：
  - 第六个 trigger 渲染「评测」
  - 点击切 tab pane active；六 pane forceMount keep-alive
  - `eval-tab.tsx` 组合渲染 overview + trend（canvas mock）+ drawer 占位
  - **2026-08-26 补**：窄面板降档——容器溢出（钉 `scrollWidth` 模拟）时粒度按钮组降档（沿用 vector-tab `useToolbarTier` 溢出检测先例；jsdom 无布局恒 0 档，窄档用例手法对齐 vector-tab 测试）
  - **2026-08-26 补**：Layer1Table 行头用 `tk.eval.category.*` 显示名渲染（wire 键不再直接暴露给用户）
- [x] Implement：middle-tabs 扩展、eval-tab 布局（上：运行配置区——父 spec §9 触发按钮落地前**仅渲染一行说明文案**，不留无功能空盒；中：overview；下：trend 卡片壳，粒度按钮组接 `useToolbarTier` 降档）、i18n 三处（含 `tk.eval.category.fact/relation/concept/global/summary` 显示名组）。
  - 实现备注：strict mode 下 `eval` 不能作解构绑定名，middle-tabs 用 `eval: evalPane` 重命名（prop 名保持 `eval`）；`useToolbarTier` 两档（0 内联 / 1 ⋯ 菜单）副本内联在 eval-tab.tsx（vector-tab 的为模块私有，未抽共用）；drawer 占位状态（`drawerRunId`）在 eval-tab 内部，Task 6 替换为 EvalRunDrawer；`summaryRow` i18n 键并入 `category.summary`；graph-tab/vector-tab/wiki-panel 三个既有测试的 MiddleTabs harness 补 `eval` prop；`page.tsx` 暂以 `overview={null} trend={null}` 挂壳，Task 5 接通。
- [x] `pnpm test` GREEN（目标三文件 35 passed；含 graph-tab/vector-tab/wiki-panel 回归共 123 passed）；revert proof：stash 实现 → 4 failed + 收集错误 RED → pop → GREEN。
  - 既有失败记录：`chat-panel.dom.test.tsx`「restores the remembered model per kb」在 HEAD（无本任务改动）即失败（1/25），属预存问题，与本任务无关。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): mount eval tab in knowledge middle tabs`（`0d549eee`）

---

## Task 5: 数据联通——TanStack Query hooks + lazy 门控 ✅ 已完成（2026-08-26，`14bbf6ac`）

**Files:**
- Modify: `frontend/src/core/knowledge/api.ts`（+`getLatestEvalMetrics` / `getEvalTrend`）
- Modify: `frontend/src/core/knowledge/hooks.ts`（+`useMetricsOverview` / `useEvalTrend` + queryKey 工厂）
- Modify: `frontend/src/components/workspace/knowledge/eval-tab.tsx`（接通数据 + `enabled` 门控 + 粒度 state）
- Create: `frontend/tests/unit/knowledge/eval-tab.dom.test.tsx`
- Modify: `frontend/tests/unit/knowledge/hooks.dom.test.tsx`（门控用例）

- [x] RED test：
  - `useMetricsOverview` / `useEvalTrend`：queryKey 正确、`enabled=false` 时不发请求（keep-alive 门控）、粒度进 queryKey（切换自动重新请求）
  - eval-tab：loading skeleton、错误提示、数据到达后渲染 overview + trend
  - **2026-08-26 补**：趋势图空态——`trend.has_data === false`（新 KB 无评测历史）时渲染空态提示而非空白画布（文案走 i18n，与 overview 空态同风格）
- [x] Implement hooks + eval-tab 接线（`enabled: activeTab === "eval"` 由 page.tsx 传入；`staleTime: 30_000`——评测数据分钟级不变，keep-alive 来回切不重复请求）。
  - 实现备注：粒度 state 从 page.tsx 移入 EvalTab 内部（仅该组件消费）；Task 4 的 EvalTab 组合用例从 middle-tabs.dom.test.tsx 迁出至新建 eval-tab.dom.test.tsx（hooks mock 供数，middle-tabs 文件回归纯挂载用例）；queryKey 工厂 `knowledgeEvalLatestKey` / `knowledgeEvalTrendKey(kbId, {granularity})`；i18n 补 `loading` / `loadFailed` 两键；trend 空态同时覆盖 `has_data=false` 与无 data 分支（未激活时渲染 null 不闪空态文案）。
- [x] `pnpm test` GREEN（目标三文件 42 passed）；revert proof：stash 实现 → RED → pop → GREEN。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): connect eval tab to backend APIs with lazy-gated hooks`（`14bbf6ac`）

---

## Task 6: 点击下钻——EvalRunDrawer 壳 ✅ 已完成（2026-08-26，`b84176b1`）

**Files:**
- Create: `frontend/src/components/workspace/knowledge/eval-run-drawer.tsx`（drawer 壳：run 元信息 + 两层指标只读摘要含 Layer 2 path_accuracy 口径标注；对齐 ChunkDrawer 模式）
- Modify: `frontend/src/components/workspace/knowledge/eval-tab.tsx`（`onPointClick` → `setDrawerRunId`）
- Modify: `frontend/src/core/knowledge/api.ts` / `hooks.ts`（+`getEvalRun` / `useEvalRun`，`enabled: runId !== null`）
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`（drawer 文案）
- Create: `frontend/tests/unit/knowledge/eval-run-drawer.dom.test.tsx`

- [x] RED test：
  - 点击趋势图数据点（mock canvas 触发 `onPointClick("run-1")`）→ drawer 打开并请求 `GET /eval-runs/run-1`
  - drawer 渲染 run_id / created_at / environment / 两层指标摘要（含 Layer 2 path_accuracy 口径标注）；`onOpenChange(false)` 关闭
  - 层未执行（`*_metrics = {}`）渲染「未执行」提示；loading / 错误文案复用查询三态
- [x] Implement drawer 壳 + 接线（不跳路由——drawer 为先例模式，知识库页无 kb 子路由）。
  - 实现备注：`useEvalRun(kbId, runId)` 双非空门控，eval-tab 传 `open ? runId : null` 保证关闭态不残留请求；Layer 摘要取 summary 行（per-category 明细属逐题明细 spec）；i18n 新增 `eval.drawer.*` 组（状态三值本地化徽标 + path_accuracy 口径标注 + contextRecallLabel）。
- [x] `pnpm test` GREEN（目标四文件 49 passed）；revert proof：stash 实现 → RED → pop → GREEN。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add eval run drill-down drawer from trend chart`（`b84176b1`）

---

## Task 7: 文档同步 + 全量回归 + Live 冒烟 ✅ 已完成（2026-08-26）

**Files:**
- Modify: `backend/AGENTS.md`（RAG 小节补评测持久化与端点段）
- Modify: `frontend/AGENTS.md`（知识域组件清单补 eval tab）
- Modify: `docs/superpowers/specs/2026-08-24-rag-evaluation-metrics-visualization-design.md`（状态翻转「✅ 已落地」+ 日期）
- Create: `pr-build/rag-eval-*.png`（冒烟截图）

- [x] Spec 状态翻转为「✅ 已落地」；AGENTS.md 双端落档。
- [x] `cd backend && uv run pytest tests/knowledge -q` 全量 GREEN（637 passed, 2 skipped——首次跑因本机 Temp 权限错误 296 errors，`--basetemp=.pytest-tmp/t7` 后全绿，属环境而非代码）；`ruff check/format` 双净。
- [x] `cd frontend && pnpm test && pnpm check`（1509 passed, 1 failed——`chat-panel.dom.test.tsx` 模型选择器恢复用例为 HEAD 既有失败，与本 plan 无关；eslint + tsc 双净）。
- [x] Live 冒烟（真实 KB + 双 CLI 各跑至少一次 + 后端运行）：
  | 冒烟项 | 步骤 | 预期 | 结果 | 证据 |
  |---|---|---|---|---|
  | 指标总览渲染 | 打开评测 Tab | Layer 1 表格 + Layer 2 卡片正确显示 | ✅ Layer 1 全四类+汇总出数（召回 98.1%），Layer 2 三张架构卡片真值，ragas 未安装徽章正确 | `pr-build/rag-eval-metrics-overview.png` |
  | 趋势图渲染 | 查看趋势图 | 折线出图；打过 baseline 后阈值线显示 | ✅ Recall@k+Hit Rate 出点、红色回退阈值线(-3%)、基线更新竖线、六项图例齐 | `pr-build/rag-eval-trend-chart.png` |
  | 粒度切换 | 点击 Day/Week/Month | 图表刷新，数据正确 | ✅ 切「周」后 x 轴变 yyyy-MM 格式且按钮选中态正确 | `pr-build/rag-eval-granularity.png` |
  | 点击下钻 | 点击趋势图数据点 | drawer 打开显示运行摘要 | ✅ drawer 含 run_id/时间/环境/状态/基线徽标 + 两层摘要 + path_accuracy 口径标注 | `pr-build/rag-eval-drilldown.png` |
  | 暗色主题 | 切换暗色 | 表格/卡片/图表装饰层主题正确 | ✅ 表格与图表装饰层均暗色适配（ink() 主题感知），阈值线保持红色 | `pr-build/rag-eval-dark.png` |
  - 冒烟造数据：`测试1` KB（真实 golden 20 题）L1 recall 0.981（`--mark-baseline`）+ L2 8 题；另为冒烟专用用户注册 + 自建 KB/文档/题库（golden-smoke.jsonl）双 CLI 各跑一次，`eval_runs` 共 4 行（2 KB × 2 层，baseline 各 1）。
- [x] Commit: `docs(rag): sync agent guides and spec status for eval metrics visualization`

---

## Final verification

- [x] 双 CLI 各跑一次后 `eval_runs` 各落一行（层指标互补为 `{}`），status / environment / created_at 写入正确（4 行落库核查通过；created_at = 报告 generated_at）。
- [x] `--mark-baseline` 后 trend API 返回 baseline 块且旧标记被清；`--baseline auto` diff 正确（后端子测试全绿 + 冒烟阈值线/基线竖线可见）。
- [x] `GET /eval-runs/latest` 两层独立取最近 completed 非 ci 运行；`GET /eval-runs/trend` 三粒度统一末次语义正确；`GET /eval-runs/{run_id}` 详情正确（drawer 冒烟验证）。
- [x] 指标总览正确显示两层数据，着色阈值来自后端 `threshold_percent`（冒烟截图 + 单测）。
- [x] 趋势图六线渲染、粒度切换、阈值线、回退标红、点击开 drawer 全部正常（冒烟截图 2/3/4）。
- [x] 评测 Tab 挂载正确，六 pane keep-alive；未激活时**不发出**评测请求（`enabled` 门控由 eval-tab.dom.test「forwards kbId/enabled」+ hooks.dom.test「enabled=false 不发请求」覆盖；页面激活后才见数据）。
- [x] 亮/暗主题下 UI 与图表装饰层均正确（无裸色板残留——冒烟截图 1/5）。
- [x] `backend/AGENTS.md` / `frontend/AGENTS.md` 已更新；`pytest`（637 passed）/ `ruff` / `pnpm check` 全绿（含前述既有 chat-panel 失败说明）。
- [x] Live 冒烟五项全部通过，截图归档（`pr-build/rag-eval-*.png` ×5）。

---

## 运行期遗留（不属本 plan 交付，供后续决策）

- **单次运行逐题明细**：drawer 详细 UI（逐题结果、失败原因、引用明细）另立 spec——本 plan 仅交付 drawer 壳。
- **评测历史运行列表 / 题库 CRUD / 触发评测按钮**：父 spec `2026-08-23-rag-retrieval-evaluation-design.md` §9 范围，另立 plan。
- **多 KB 对比**：跨知识库趋势对比另立 spec。
- **自定义阈值**：阈值与 `DEFAULT_FAIL_THRESHOLD` 同源；如需用户可调阈值，需先引入配置项再放开前端。
- **baseline 管理 API**：当前仅 CLI `--mark-baseline`；如需前端标记入口，另立 spec。
- **平滑趋势线**：如需要均值视角，以移动平均另加一条线（不改变点的「真实运行」语义），另立任务。
