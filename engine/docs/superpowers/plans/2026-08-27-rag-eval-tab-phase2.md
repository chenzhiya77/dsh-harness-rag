# RAG Eval Tab Phase-2 Implementation Plan（题库管理 · 运行触发 · 历史列表）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为评测 Tab 落地父 spec §9 二期功能——题库 CRUD（per-KB golden.jsonl + 三端点）、运行触发（202 幂等 + in-flight 轮询，仅 Layer 1）、历史运行列表、分段三视图布局（总览/题库/历史）、召回面板联动（存为考题 + 复现跳转）；本 plan 仅分解实施任务，所有设计决策见 spec。

**Spec:** `docs/superpowers/specs/2026-08-27-rag-eval-tab-phase2-design.md`（已定稿，含 2026-08-27 布局定案与三项开放点裁定）

**基线：** `ec4e492e`（分支 `feat/rag-knowledge-base`）

**Architecture:** 后端新增题库文件模块 `deerflow/knowledge/eval/question_bank.py`（per-KB `data/knowledge/<kb_id>/golden.jsonl`，读全量→`load_golden` 校验→tmp+原子 replace 落盘，per-KB `asyncio.Lock` 串行化）与按需运行模块 `eval/ondemand.py`（模块级 `_IN_FLIGHT` 注册表 + service 层 Layer 1 编排：读题库→`build_default_searchers`→`run_evaluation`→`save_eval_run`，复刻 CLI `run_rag_eval.py` 的编排但复用 gateway 已初始化的引擎与 store 单例）；路由层加 `GET/POST/DELETE /{kb_id}/eval/questions`、`POST /{kb_id}/eval-runs`（202 `enqueued/already_running`，wiki 生成同款幂等）、`GET /{kb_id}/eval-runs`（历史 + 顶层 `in_flight` 标志）。前端 `eval-tab.tsx` 加分段三视图骨架（视图 state 本地 `useState`，分段控件与粒度切换同 `bg-muted` 样式族）与常驻工具栏（左分段控件、右「上次运行 X 前」+「▶ 运行评测」状态机按钮）；新组件 `eval-question-bank.tsx`（表格+添加 dialog+删除确认）、`eval-question-drawer.tsx`（Sheet 详情）、`eval-run-history.tsx`（历史列表，行点击复用 `EvalRunDrawer`）；召回面板加命中行勾选 + 存为考题 dialog + `prefillQuery` 预填通道（page 层 state，`onViewInVectorSpace` 先例）。

**Tech Stack:** FastAPI + SQLAlchemy（backend，无新 migration——只新增文件读写与端点）+ React 19 + TanStack Query + TypeScript（frontend）；后端 `pytest`，前端 `rstest`（`pnpm test`）+ `pnpm check`。

**Global Constraints:**
- Branch: `feat/rag-knowledge-base`；每个 task：RED → GREEN → regression proof（stash 实现→RED→pop→GREEN）→ commit（Conventional Commits，**English subject only，无 body**）。
- Backend TDD mandatory：`cd backend && uv run pytest <file> -q`；frontend DOM tests（`pnpm test`），收尾 `pnpm check` + `ruff check/format` 双净。
- Schema 单一事实源：题库写路径必须复用 `dataset.py::validate_question` / `load_golden`，禁止在 API 层重写校验（spec §4.2）。
- 触发纪律：**仅 Layer 1**（Layer 2 有 judge 成本，留 nightly/CLI）；`environment="local"` 固定；每次触发按 `--baseline auto` 语义读 DB is_baseline 行做 diff（`persistence.get_baseline_run` + `baseline_report_from_metrics`）；报告→行映射复用 `persistence.layer1_metrics_from_report` / `baseline_diff_from_report`，**不复制映射逻辑**。
- 时钟单一事实源：`created_at` = 报告 `generated_at`（`run_evaluation(generated_at=...)` 显式传入），不用 DB default。
- in-flight 边界：单进程模块级注册表（wiki `generator.py::_IN_FLIGHT` 同模式），不多副本队列；UI/CLI/nightly 并发碰撞窗口接受（各自落行，趋势末次语义吸收，spec §10）。
- 数据纪律：服务端状态一律 TanStack Query hooks（`core/knowledge/hooks.ts`），新 key factory 沿用 `knowledgeEval*Key` 命名（`hooks.ts:149-159` 先例）；三视图查询均 `enabled: activeTab === "eval"` 门控。
- i18n 纪律：全部 UI 文案走 `tk.eval.*` / `tk.recall.*`（`types.ts` / `zh-CN.ts` / `en-US.ts` 三处同步）；行内只放短 nowrap 状态，长解释进 ⓘ tooltip；**UI 不出现 shell 命令提示**（原 `runConfigNote` 文案随工具栏落地删除）。
- 样式纪律：语义 token（`text-muted-foreground` 等）+ 既有 `eval-metrics.css` 变量；无裸色板。分段控件复用粒度切换的 `bg-muted flex rounded-md p-0.5` + `role="radiogroup"` 样式族。
- `ui/` 组件齐备（checkbox / dialog / select / table / sheet / alert 均已存在），缺组件走 shadcn CLI，不手写。
- Known code facts (verified 2026-08-27):
  - Golden schema（`dataset.py`）：必填 `id/query/expected_path/relevant_chunk_ids/relevant_entities/category`，可选 `reference_answer`；`CATEGORIES=(fact,relation,concept,global)`、`EXPECTED_PATHS=(vector,graph,wiki)`；chunk id 正则 `<32hex>#NNNN`；`load_golden` 含 id 去重守卫。空 `relevant_chunk_ids` 合法且 Layer 1 已降级（`metrics.py::evaluate_question` chunk 指标计 None、`_mean` 跳过、path_correct 照常）——**无锚定题零后端改动**。
  - per-KB 目录约定：`knowledge_service.py:234` `self.data_dir / "knowledge" / kb_id / ...`；`data_dir = get_paths().base_dir / "data"`（`app.py:365`）。
  - wiki 幂等先例：`generator.py::_IN_FLIGHT` + `wiki_generation_in_progress(kb_id)` + `_LAST_RUN`；service `trigger_wiki_generation` 返回 bool；router 202 `{"status": "enqueued"|"already_running"}`（`knowledge_bases.py:313-320`）；前端 3s `refetchInterval` 轮询 list 端点直至 drain（`wiki-status.ts::wikiEntriesRefetchInterval` + `hooks.ts:222`）。
  - runner 入口：`run_evaluation(questions, searchers, *, top_k=5, baseline, fail_threshold, generated_at)`；`build_default_searchers(kb_id, user_id=kb["owner_id"], store, vector_store, graph_store, wiki_store)`（`run_rag_eval.py:225-235` 的构造方式：`get_knowledge_store()` / `get_vector_store()` / `GraphStore(store._sf)` / `WikiStore(store._sf)`，gateway 进程内同样可用）。
  - run_id 格式：`rag-<UTC秒>-<uuid4.hex[:8]>`（`_generate_run_id()`，现居 CLI 层 `scripts/run_rag_eval.py:47`——Task 3 将其提升到 eval 包供 CLI 与 service 共用）。
  - `store.list_eval_runs(kb_id)` 已存在（created_at 升序全量行，`store.py:496`），历史端点在 service 层过滤/倒序/limit。
  - `EvalRunDrawer` props：`{kbId, open, runId, onOpenChange}`，Sheet 右侧覆盖式（`ui/sheet.tsx`）——历史视图直接复用，零改动。
  - 前端 `formatTimeAgo(date, locale)` 已存在（`core/utils/datetime.ts:17`），工具栏「上次运行 X 前」直接复用。
  - 跨 tab 预填先例：`page.tsx:388` `onViewInVectorSpace`（`setVectorOverlay(next); setActiveTab("vectors")`）；`RecallTestPanel` 的 query 是本地 state（`recall-test-panel.tsx:118`），新增 `prefillQuery` prop + `onPrefillConsumed` 回调。
  - 前端测试基建：`frontend/tests/unit/knowledge/*.dom.test.tsx`，`rs.mock("@/core/knowledge/hooks", ...)` 注入数据 + canvas/drawer mock（`eval-tab.dom.test.tsx` 先例）；toast 用 `sonner`。
  - **路由顺序**：新端点注册在既有 `GET /eval-runs/{run_id}`（`knowledge_bases.py:570`）之前可读性更佳；`GET /eval-runs`（list）与 `/eval-runs/{run_id}` 路径不冲突。

---

## Phase 1: 题库 CRUD（后端）

## Task 1: 题库文件模块 + CRUD 三端点 ✅ 已完成（2026-08-27，`55a0c771`）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/eval/question_bank.py`（per-KB golden.jsonl 读写：`_LOCKS` 注册表、`load_questions(path)` / `add_question(path, fields)` / `delete_question(path, question_id)`，tmp+`os.replace` 原子写）
- Modify: `backend/app/gateway/services/knowledge_service.py`（+`_golden_path(kb_id)` + `list_eval_questions` / `create_eval_question` / `delete_eval_question`）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（+`GET /{kb_id}/eval/questions`、`POST /{kb_id}/eval/questions` 201、`DELETE /{kb_id}/eval/questions/{question_id}` 204；Pydantic `EvalQuestionCreateRequest`）
- Create: `backend/tests/knowledge/eval/test_question_bank.py`（文件层）
- Create: `backend/tests/knowledge/test_eval_questions_api.py`（API 层，基建对齐 `test_eval_runs_api.py`）

- [x] RED test 文件层（tmp_path fixture）：
  - 读不存在的文件 → 空列表（新 KB 不是错误）；
  - add：生成 `q_<hex8>` id、字段经 `validate_question` 守卫（注入 id 后）、文件可被 `load_golden` 回读；
  - add 非法入参（坏 category / 坏 expected_path / 坏 chunk id 格式 / 显式带 id 字段）→ `GoldenDatasetError`；
  - delete 存在的 id → 文件不再含该行；delete 不存在 id → KeyError/None（契约由实现定，测试钉死）；
  - 脏文件（手工写入非法行）→ 读写均抛 `GoldenDatasetError` 且消息含行号；
  - 原子写：写后无 tmp 残留；并发 add（`asyncio.gather` 两写）最终两行都在（per-KB lock 串行）。
- [x] RED test API 层：
  - 空题库 → 200 `{questions: [], total: 0}`；POST 201 返回完整 question（含服务端 id）；POST 带 id → 422；schema 违例 → 422 detail 含字段名；DELETE → 204 / 404；脏文件 → 500 detail 含行号；未知 kb → 404（`_require_kb_access` 先例）。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_question_bank.py tests/knowledge/test_eval_questions_api.py -q`，记录 missing-module/endpoint RED。
- [x] Implement：question_bank 纯文件层（锁注册表 + 原子写），service 薄壳拼路径，router 三端点（错误映射：`GoldenDatasetError`→422（写入校验）/500（存量脏文件），KeyError→404）。
- [x] GREEN；revert proof：stash 实现 → RED → pop → GREEN。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add per-KB eval question bank CRUD API`

---

## Phase 2: 运行触发与历史（后端）

## Task 2: 按需运行模块 + `POST /eval-runs` 202 幂等触发 ✅ 已完成（2026-08-27，`dc1e7892`）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/eval/ondemand.py`（`_IN_FLIGHT: dict[str, int]` + `eval_run_in_progress(kb_id)` + `async run_layer1_for_kb(kb_id, *, golden_path, top_k=5)`——编排：load_golden → build_default_searchers（owner 身份）→ get_baseline_run/baseline_report_from_metrics → run_evaluation（generated_at 显式）→ save_eval_run（layer1 映射 + baseline_diff，`environment="local"`）；异常兜底落 error 行，复刻 CLI `_persist_eval_run` 的 best-effort 语义）
- Modify: `backend/scripts/run_rag_eval.py`（`_generate_run_id` 移入 eval 包——如 `ondemand.py` 或 `persistence.py`——CLI 改 import，消除重复实现）
- Modify: `backend/app/gateway/services/knowledge_service.py`（+`trigger_eval_run(kb_id) -> bool`：in-flight 检查 → fire-and-forget `asyncio.create_task`；题库为空（文件不存在或 0 题）抛 `EvalQuestionBankEmpty` 供路由映 409）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（+`POST /{kb_id}/eval-runs` 202 `{"status": "enqueued"|"already_running"}`）
- Create: `backend/tests/knowledge/eval/test_ondemand.py`（编排层，stub 三路 impl + fake store）
- Modify: `backend/tests/knowledge/test_eval_runs_api.py`（+触发端点用例）

- [x] RED test 编排层：
  - stub searchers 跑通：落库行 `layer1_metrics` 非空、`layer2_metrics == {}`、`environment == "local"`、`created_at` == 传入的 generated_at；
  - 有 is_baseline 行时 `baseline_diff` 非 null（auto diff 生效）；无则 null；
  - 运行期异常（searcher 抛错使 run_evaluation 失败）→ 落 error 行且异常不再上抛（fire-and-forget 安全）；
  - 题库文件不存在/0 题 → `EvalQuestionBankEmpty`；
  - `_generate_run_id` 提升后 CLI 仍 import 得到（回归：`test_eval_cli.py` 不动应全绿）。
- [x] RED test 触发端点：首次 POST → 202 enqueued 且任务被调度（fake runner 断言调用）；in-flight 中再 POST → 202 already_running 且不重复调度；空题库 → 409；未知 kb → 404。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_ondemand.py tests/knowledge/test_eval_runs_api.py tests/knowledge/eval/test_eval_cli.py -q`，记录 RED。
- [x] Implement：ondemand 编排 + service 触发 + 路由；`_IN_FLIGHT` 计数在 finally 中递减（crash 不卡死后续触发）。
- [x] GREEN；revert proof。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add on-demand Layer 1 eval trigger with in-flight idempotency`

## Task 3: 历史列表 API——`GET /eval-runs`（含 `in_flight`）✅ 已完成（2026-08-27，`f60b05bf`）

**Files:**
- Modify: `backend/app/gateway/services/knowledge_service.py`（+`list_eval_runs(kb_id, *, limit, include_ci)`——读 `store.list_eval_runs` 全量行，内存过滤 ci/倒序/clamp limit，拼 `in_flight` 标志）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（+`GET /{kb_id}/eval-runs?limit=&include_ci=`；注册在 `/{run_id}` 之前）
- Modify: `backend/tests/knowledge/test_eval_runs_api.py`（+历史端点用例）

- [x] RED test：
  - 排序 created_at desc；`limit` 默认 50、>200 clamp 到 200、非法值 422；
  - `include_ci=false` 默认排除 ci 行、`true` 全量；
  - `has_layer1`/`has_layer2` 由 `*_metrics != {}` 推导；`regression_detected` 从 `baseline_diff` 透传（null → false）；`langfuse_trace_url` 透传；
  - `in_flight`：注册表有运行 → true，且 in-flight 运行**不出现**在 `runs` 里（行未落库）；
  - 空历史 → `{in_flight: false, runs: [], total: 0}`；未知 kb 404。
- [x] Run `cd backend && uv run pytest tests/knowledge/test_eval_runs_api.py -q`，记录 RED。
- [x] Implement：service 内存组装（单 KB <100 行，无需 SQL 分页——`list_eval_runs` docstring 同判断）。
- [x] GREEN；revert proof。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add eval-runs history list API with in-flight flag`

---

## Phase 3: 前端骨架（数据层 + 三视图 + 工具栏）

## Task 4: 前端数据层——types + api client + hooks + i18n 键批次 ✅ 已完成（2026-08-27，`1519104a`）

**Files:**
- Modify: `frontend/src/core/knowledge/types.ts`（+`EvalQuestion` / `EvalQuestionCreateInput` / `EvalQuestionListResponse` / `EvalRunSummary` / `EvalRunListResponse` / `EvalTriggerResponse`）
- Modify: `frontend/src/core/knowledge/api.ts`（+`listEvalQuestions` / `createEvalQuestion` / `deleteEvalQuestion` / `listEvalRuns` / `triggerEvalRun`，`kbUrl` 先例；201/204/202 状态处理与错误 detail 提取）
- Create: `frontend/src/core/knowledge/eval-run-status.ts`（`evalRunsRefetchInterval(data)`：`in_flight ? 3000 : false`——`wiki-status.ts` 先例，纯函数可直测）
- Modify: `frontend/src/core/knowledge/hooks.ts`（+`knowledgeEvalQuestionsKey` / `knowledgeEvalRunsKey` key factory；+`useEvalQuestions` / `useAddEvalQuestion` / `useDeleteEvalQuestion` / `useEvalRuns`（含 refetchInterval）/ `useTriggerEvalRun`；全部 `enabled` 门控）
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`（+`eval.views.*` 三视图标签、`eval.runButton/runningButton/lastRun*/neverRan/runStarted/alreadyRunning/runFailed`、`eval.questions.*` 表格列/添加 dialog/删除确认/空态、`eval.history.*` 列/环境 badge/状态文案/空态、`recall.saveAsQuestion.*` dialog 文案；**删除** `eval.runConfigNote`——工具栏落地后无占位文案）
- Modify: `frontend/tests/unit/knowledge/hooks.dom.test.tsx`（+新 hooks 用例）

- [x] RED test（hooks.dom.test.tsx 扩充）：
  - queryKey 形状（`knowledgeEvalQuestionsKey(kbId)` / `knowledgeEvalRunsKey(kbId)` 唯一且含 kbId）；
  - `enabled=false` 不发请求（`useEvalQuestions` / `useEvalRuns`）；
  - `useEvalRuns` 的 refetchInterval：`in_flight=true` → 3000，`false` → false（纯函数直测 `evalRunsRefetchInterval`）；
  - mutation 成功 invalidate 对应 query（mock queryClient 断言）；
  - `useTriggerEvalRun` 返回 `{status}` 透传。
- [x] Run `cd frontend && pnpm test hooks`，记录 RED。
- [x] Implement：types → api → eval-run-status → hooks → i18n 三文件同步。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add eval phase-2 data layer hooks and i18n keys`

## Task 5: eval-tab 三视图骨架 + 常驻工具栏（运行按钮状态机）✅ 已完成（2026-08-28，`7698c420`）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/eval-tab.tsx`（+视图 state `useState<"overview"|"questions"|"history">`；工具栏行替换 `runConfigNote` 占位行：左分段控件（粒度切换同样式族 + `role="radiogroup"`）、右「上次运行 X 前」（`formatTimeAgo`）+ 运行按钮；工具栏溢出降级复用 `useToolbarTier`（溢出时运行按钮收 ⋯ 菜单）；drain 边检测 `useEffect`：`in_flight` true→false 时一次性 invalidate `evalRuns`/`metricsOverview`/`evalTrend`）
- Modify: `frontend/tests/unit/knowledge/eval-tab.dom.test.tsx`（+视图切换与工具栏用例）

- [x] RED test：
  - 默认渲染 overview 视图（指标总览+趋势图现状回归：原有断言不删不改）；
  - 分段控件切到 questions/history 视图（本任务先渲染占位 div + data-testid，Task 6/7 填内容）；
  - 工具栏：有历史行时显示「上次运行 X 前」、无历史显示「尚未运行」、`in_flight=true` 显示 spinner+「运行中…」且按钮禁用；
  - 点击运行按钮 → trigger mutation 被调；mutation 返回 `already_running` → toast（mock sonner 断言）；`enqueued` → toast「评测已开始」；
  - drain 边：in_flight true→false 切换时三个 query 各 invalidate 一次（mock queryClient）；
  - 窄面板：scrollWidth > clientWidth 时运行按钮收进 ⋯ 菜单（钉 scrollWidth 模拟，useToolbarTier 先例）。
- [x] Run `cd frontend && pnpm test eval-tab`，记录 RED。
- [x] Implement：视图 state + 工具栏 + 状态机接线。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add eval tab segmented views and run trigger toolbar`

---

## Phase 4: 前端视图

## Task 6: 题库视图——表格 + 详情 drawer + 添加 dialog + 删除确认 ✅ 已完成（2026-08-28，`63b20ea4`）

**Files:**
- Create: `frontend/src/components/workspace/knowledge/eval-question-bank.tsx`（表格主组件：列=问题/分类 Badge/预期路径 Badge/锚定/操作；行点击开 drawer；尾部「+ 添加考题」虚线行；空态引导文案；三态 loading/失败/数据）
- Create: `frontend/src/components/workspace/knowledge/eval-question-drawer.tsx`（Sheet 右侧：完整 query、Badge、reference_answer、锚定清单可复制、底部「↗ 在召回测试面板复现」主按钮 + 「删除」次按钮）
- Create: `frontend/src/components/workspace/knowledge/eval-add-question-dialog.tsx`（query textarea + category select + expected_path select + reference_answer textarea + ⓘ 说明 tooltip「未锚定切片的题只参与路径选择与生成质量评测」）
- Create: `frontend/tests/unit/knowledge/eval-question-bank.dom.test.tsx`

- [x] RED test：
  - 表格渲染：行数=题数；锚定列推导（`3 切片` / `3 切片 · 2 实体` / 空数组 → 「未锚定」muted）；
  - 操作列 ↗/🗑 点击 stopPropagation（不开 drawer）；行点击开 drawer 且传入该题；
  - 删除：确认 dialog 展示 query 全文 → 确认调 delete mutation → 成功 toast；取消不调；
  - 添加 dialog：必填校验（空 query/未选 category 禁用提交）；提交体**不含** relevant_chunk_ids/relevant_entities 键（后端补空数组）；成功 toast + invalidate；
  - 空态：无题时显示引导文案（指向召回测试面板）；
  - drawer：字段全量渲染、无 reference_answer 显示「未填写」muted、复现按钮回调携带 query。
- [x] Run `cd frontend && pnpm test eval-question-bank`，记录 missing-component RED。
- [x] Implement：三组件；eval-tab 的 questions 视图占位替换为 `<EvalQuestionBank kbId={kbId} enabled={...} onReproduce={...} />`。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add eval question bank table with detail drawer and add dialog`

## Task 7: 历史视图——运行列表 + 复用 EvalRunDrawer ✅ 已完成（2026-08-28，`35273e69`）

**Files:**
- Create: `frontend/src/components/workspace/knowledge/eval-run-history.tsx`（行：⭐baseline + 时间 + 环境 Badge（本地/CI/定时）+ 层徽标 L1/L2/L1+L2 + 状态图标短文案 ✅完成/❌失败/⏭跳过 + 回退红 Badge；行点击 → `EvalRunDrawer`；空态「尚无评测运行——点右上角运行评测发起首次评测」；三态）
- Create: `frontend/tests/unit/knowledge/eval-run-history.dom.test.tsx`

- [x] RED test：
  - 行渲染：环境/层/状态/badge 组合正确（含 is_baseline ⭐、regression_detected 回退 Badge）；
  - skipped/error 行可见（历史是唯一曝光面，spec §6.2）；
  - 行点击 → EvalRunDrawer open 且 runId 正确（drawer mock 断言，eval-tab.dom.test 先例）；
  - 空态与 loading/失败三态；
  - `in_flight=true` 时列表顶部无伪行（in-flight 只由工具栏 spinner 表达，spec §6.1）。
- [x] Run `cd frontend && pnpm test eval-run-history`，记录 RED。
- [x] Implement；eval-tab 的 history 视图占位替换为 `<EvalRunHistory ... />`。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add eval run history list with drawer drill-down`

---

## Phase 5: 召回面板联动

## Task 8: 存为考题 + 复现跳转预填 ✅ 已完成（2026-08-28，`c2af5476`）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/recall-test-panel.tsx`（+命中行勾选 checkbox（vector hits / graph evidence 的 ChunkHitRow）；勾选 ≥1 时结果区尾部浮出「存为考题」按钮；+`prefillQuery` / `onPrefillConsumed` props：`useEffect` 监听非空 → 写入本地 query state → 调 `onPrefillConsumed`；**不自动触发检索**）
- Create: `frontend/src/components/workspace/knowledge/eval-save-question-dialog.tsx`（query 预填可改 + category select 必填 + expected_path select（默认勾选项来源路径，混路默认 vector）+ reference_answer 可选 + 只读摘要「已选 N 个切片」；提交 → `useAddEvalQuestion`）
- Modify: `frontend/src/app/workspace/knowledge/page.tsx`（+`recallPrefill` state；评测侧 `onReproduce={(query) => { setRecallPrefill(query); setActiveTab("recall"); }}` 透传到 EvalTab → EvalQuestionBank/drawer；RecallTestPanel 接 `prefillQuery={recallPrefill}` + `onPrefillConsumed={() => setRecallPrefill(null)}`）
- Modify: `frontend/src/components/workspace/knowledge/eval-tab.tsx` / `eval-question-bank.tsx` / `eval-question-drawer.tsx`（接 `onReproduce` prop 透传）
- Modify: `frontend/tests/unit/knowledge/recall-test-panel.dom.test.tsx`（若无则新建）+ `eval-question-bank.dom.test.tsx`（+复现回调用例）

- [x] RED test：
  - 勾选行 checkbox → 「存为考题」按钮出现；全不选 → 按钮消失；
  - dialog 提交体：`relevant_chunk_ids` = 勾选 chunk id 集、query 预填值、category/expected_path 必填校验；成功 toast 且**不跳视图**；
  - `prefillQuery` 非空 → query 输入框被写入 → `onPrefillConsumed` 被调；**不自动发检索请求**（mock useRecallTest 断言未调用）；
  - 评测侧 ↗ 按钮 → `onReproduce` 回调携带该题 query。
- [x] Run `cd frontend && pnpm test recall-test-panel eval-question-bank`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add save-as-question and recall reproduce prefill`

---

## Phase 6: 收尾

## Task 9: 文档同步 + 全量回归 + Live 冒烟

**Files:**
- Modify: `backend/AGENTS.md`（eval 包加 question_bank/ondemand 模块说明 + 新端点清单）
- Modify: `frontend/AGENTS.md`（评测 tab 三视图结构 + 新组件/hooks 清单）
- Modify: `docs/superpowers/specs/2026-08-27-rag-eval-tab-phase2-design.md`（状态行更新为已落地）
- Create: `frontend/tests/e2e/eval-tab-phase2.spec.ts`（Playwright page.route mock：切题库视图见表格；触发按钮 mock 202 后进 running 态——`eval-metrics.spec.ts` 先例）

- [x] E2E 用例落地并跑通。—— 新增 `frontend/tests/e2e/eval-tab-phase2.spec.ts`，**2 passed**（12.4s）：①题库表格渲染；②202 触发 → running 态（进度变体 + 终止按钮）→ **drain 边**回落为空闲摘要并刷出历史行——第②条正是真栈测不到的那一环（隐藏窗口 ⇒ TanStack v5 暂停轮询）。本机首次装 Playwright Chromium（`playwright install chromium`，1217 + headless shell）；因本机 dev server 开着鉴权、`/workspace/*` 有**服务端**守卫（`page.route` 拦不到），照 `tests/e2e-real-backend` 先例注册一次性账号取真会话（CI 侧鉴权关闭且无网关，注册失败被容忍）。
- [x] 全量回归：`cd backend && uv run pytest tests/knowledge -q` 全绿 + `cd frontend && pnpm test` 全绿（既有 chat-panel 失败基线见 frontend AGENTS，非本 plan 回归）+ `ruff check` / `ruff format --check` / `pnpm check` 双净。—— 后端 **1184 passed / 2 skipped / 0 error**（复跑；首轮 `test_vector_store.py::test_init_collections_idempotent` 单条 ERROR 为顺序性 flake，单跑与该文件重跑均绿）；前端 **242 文件 / 2604 例 / 0 失败**；`ruff check` All checks passed；`pnpm check`（eslint+tsc）零诊断；`ruff format --check` 唯一非净项是 `tests/knowledge/tools/test_graph_search.py` 的 **预存漂移**（acabd069/2026-09-05 起，Task 7 已记，非本线）。
- [x] Live 冒烟（`make dev` 实跑）：① 题库空态 → 手动添加一题 → 表格出现；② 运行评测按钮 → running 态 → drain 后总览/趋势/历史自动刷新；③ 召回面板勾选 chunk 存为考题 → 题库出现该题且锚定列正确；④ 题库行 ↗ → 跳召回 tab 且 query 预填；⑤ 历史行点击 → drawer 打开。截图归档 `pr-build/`。—— **2026-09-23 用户本机真栈（KB「测试2」）五项全过**，证据 `pr-build/eval-smoke-2026-09-23/`。两处环境口径：窗口隐藏 ⇒ 截图不可用（以 DOM/文本快照替代）；TanStack v5 失焦暂停轮询 ⇒「drain 原地自动收敛」改为由新 E2E 覆盖。
- [x] Commit: `docs(rag): sync agent guides and spec status for eval tab phase 2` —— 内容已落（spec 状态行翻「已落地」；`backend/AGENTS.md` 修 `/eval-runs/progress` 旧句、`frontend/AGENTS.md` 修轮询 hook 名）；提交按用户裁定**按线拆三笔**，本框随 eval 笔（`docs(rag): close eval tab phase 2 with E2E and live smoke evidence`）落地。

---

## Final verification

- [x] `cd backend && uv run pytest tests/knowledge -q` 全绿。—— **1184 passed / 2 skipped**（复跑）。
- [x] `cd frontend && pnpm test` 全绿（chat-panel 既有失败除外）。—— **242 文件 / 2604 例 / 0 失败**（既有失败已由 `d8f5e8f7` 修掉，本次无需除外）。
- [x] `ruff check` + `ruff format --check` + `pnpm check` 双净。—— `ruff check` 通过、`pnpm check` 零诊断；`ruff format --check` 唯一非净项为上述预存漂移（非本线）。
- [x] Live 冒烟五项全过，截图归档。—— 五项全过（见 Task 9）；截图以 `pr-build/eval-smoke-2026-09-23/` 的 DOM/文本快照替代（口径同 Task 9）。

---

## 运行期遗留（不属本 plan 交付，供后续决策）

- **逐题明细与「近次结果」列**：需 per-question 结果持久化（eval_runs 现状不存），随「单次运行逐题明细 drawer」另立 spec——届时题库表格再加列。
- **Layer 2 UI 触发**：judge 成本与耗时需配额/确认 UI，另立 spec。
- **CI 题库 ↔ 运行期题库同步**：手动拷贝；如需「导出为 fixture」按钮另立任务。
- **题目编辑**：本期删了重加；如频 usages 证明需要编辑，另立 spec（注意 id 稳定性与历史运行的题引用）。
- **实体锚定 UI**：graph 题的 `relevant_entities` 标注暂走手工编辑 JSONL。
- 多 KB 对比、自定义阈值、baseline 管理 API、平滑趋势线：沿用可视化 spec §7 遗留清单。
