# RAG 评测题库改造 TDD Plan（多路预期 · wiki 锚定 · 合成造题）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按定稿 spec 落地题库三项改造——`expected_paths` 多路集合判定（Layer 1/2 语义同步）、百科词条经 `source_chunk_ids` 锚定、自底向上合成造题（202 幂等触发 + 候选暂存 + 人工审核入库）与造题入口定位反转；本 plan 仅分解实施任务，所有设计决策见 spec。

**Spec:** `docs/superpowers/specs/2026-08-28-rag-eval-question-bank-redesign-design.md`（已定稿，含 2026-08-28 三项定案与 §10 开放点预裁）

**基线：** 分支 `feat/rag-knowledge-base` 当前 HEAD（二期 Task 1–8 已落地）

**Architecture:** 后端沿 `deerflow/knowledge/eval/` 扩展——`dataset.py` 校验器双认 `expected_path`（legacy）/`expected_paths`（新）并归一化，`GoldenQuestion` 字段替换为 `expected_paths: tuple`；`metrics.py::evaluate_question` 改集合判定（`actual in expected_paths`）；`ragas_eval.py::path_hit` 改 any 语义；`question_bank.add_question` 签名改 `expected_paths`（`_atomic_write` 的 `asdict` 落盘自动升级被改动文件为新格式）；路由 `EvalQuestionCreateRequest` 破坏式切换 `expected_paths`（API 层不做历史兼容，唯一消费者前端同批切换）；`recall_test` wiki hit 补 `source_chunk_ids`（`wiki_store.get_entry` 读取，`runner.wiki_fn` 同源）；新模块 `synthesis.py`（`_SYNTH_IN_FLIGHT` 注册表 + LLM 生成候选题 + 锚定编号映射守卫 + `validate_question` 守卫 + `eval_candidates.jsonl` 暂存原子写 + accept/reject 操作），四端点复刻评测触发 202 幂等模式。前端 `EvalQuestion.expected_paths` 类型切换、两个存题 dialog 的 Select 换三项 Checkbox 组、百科行勾选、题库视图合成入口与候选审核面板。

**Tech Stack:** FastAPI + SQLAlchemy（backend，无新 migration）+ `deerflow.models.factory.create_chat_model`（合成用模型，`wiki/generator.py::_default_llm` 先例）；React 19 + TanStack Query + TypeScript（frontend）；后端 `pytest`，前端 `rstest`（`pnpm test`）+ `pnpm check`。

**Global Constraints:**
- Branch: `feat/rag-knowledge-base`；每个 task：RED → GREEN → regression proof（stash 实现→RED→pop→GREEN）→ commit（Conventional Commits，**English subject only，无 body**）。
- Backend TDD mandatory：`cd backend && uv run pytest <file> -q`；frontend DOM tests（`pnpm test`），收尾 `pnpm check` + `ruff check/format` 双净。
- Schema 单一事实源：一切写入（人工创建 / 合成 accept）必须经 `dataset.py::validate_question`；合成候选的锚定守卫在 `validate_question` **之前**（编号→chunk_id 映射），两道守卫顺序不得颠倒。
- 兼容纪律：**存量题库文件零迁移**——加载器双认是唯一契约；守护测试（加载真实 `tests/fixtures/rag_eval/golden.jsonl`）必须常绿，fixture 文件本身不改。
- 幂等纪律：合成触发复刻 `ondemand._IN_FLIGHT` 模式（模块级计数、finally 递减、单进程边界）；暂存文件**整体替换**（每次成功合成覆盖，不做增量累积）；合成失败不动既有暂存。
- 候选不入题库：候选题只存在 `eval_candidates.jsonl`，只有 `accept` 端点经 `question_bank.add_question` 写题库——不新开第二条写路径。
- 数据纪律：服务端状态一律 TanStack Query hooks（`core/knowledge/hooks.ts`），key factory 沿用 `knowledgeEval*Key` 命名；合成状态轮询沿用 `eval-run-status.ts` 的 `refetchInterval` 纯函数模式（`in_progress ? 3000 : false`）。
- i18n 纪律：全部 UI 文案走 `tk.eval.*` / `tk.recall.*`（`types.ts` / `zh-CN.ts` / `en-US.ts` 三处同步）。
- 样式纪律：语义 token + 既有组件（checkbox / dialog / select / badge 齐备），缺组件走 shadcn CLI，不手写。
- Known code facts (verified 2026-08-28):
  - `EvalQuestionCreateRequest` 居 `routers/knowledge_bases.py:62-74`（`extra="forbid"`，现字段 `expected_path: str`）；创建端点 `:571-584`，eval 区块注释 `:558`。
  - `dataset.py::_KNOWN_FIELDS` 白名单拒未知字段；`GoldenQuestion` 是 frozen dataclass；`question_bank.py::_atomic_write` 用 `asdict(question)` 逐行落盘——**改 dataclass 即改存储格式**。
  - `metrics.py::evaluate_question:158` 现判定 `actual == question.expected_path`；`runner.py::report_to_dict:183` 逐题序列化 `expected_path`；`_baseline_parts:215` 从旧报告读 `expected_path`（diff 只用 recall，路径键仅透传）。
  - `ragas_eval.py::path_hit:299-308` 现单值语义；`EXPECTED_PATH_TO_TOOL:52-56` 映射齐备；`QuestionEvalResult:112` 含 `expected_path` 字段；报告读回 `:855`。
  - `recall_test` wiki hit 组装居 `knowledge_service.py:933-949`（现无 `source_chunk_ids`）；`runner.py::build_default_searchers` 的 `wiki_fn:388-400` 有 `wiki_store.get_entry(...).source_chunk_ids` 读取与人工卡片跳过先例。
  - `store.list_chunks(doc_id, *, offset=0, limit=50)`（`store.py:255`）、`store.get_document(doc_id)`（`store.py:149`）、`store.list_documents(kb_id)`（`store.py:154`）已存在；文档列表端点 `GET /{kb_id}/documents`（`routers:182`）。
  - 合成用模型：`deerflow.models.factory.create_chat_model()`（`wiki/generator.py::_default_llm:198-202` 先例——知识功能主模型，无独立配置项，spec §10 开放点 1 预裁沿用）。
  - 前端测试基建：`frontend/tests/unit/knowledge/` 已有 `eval-question-bank.dom.test.tsx` / `eval-save-question-dialog`（内嵌于 `recall-test-panel.dom.test.tsx`）/ `hooks.dom.test.tsx` / `eval-tab.dom.test.tsx`；mock hooks 注入先例齐备。
  - 前端类型 `EvalQuestion` / `EvalQuestionCreateInput` 居 `core/knowledge/types.ts`；`listEvalQuestions` 等 api 居 `core/knowledge/api.ts`（`kbUrl` 先例）。

---

## Phase 1: Schema 与评分语义（后端）

## Task 1: Golden schema 多路化——校验器 + dataclass + 写路径 ✅ 已完成（2026-08-28，`9b6abf7d`）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/eval/dataset.py`（`_KNOWN_FIELDS` +`expected_paths`；`validate_question` 双认归一化：仅 `expected_path`→单元素、仅 `expected_paths`→校验枚举与非空、双键→报错、双缺→报错；`GoldenQuestion.expected_path` 替换为 `expected_paths: tuple[str, ...]`）
- Modify: `backend/packages/harness/deerflow/knowledge/eval/question_bank.py`（`add_question` 参数 `expected_path` → `expected_paths: Sequence[str]`，raw dict 写 `expected_paths`）
- Modify: `backend/tests/knowledge/eval/test_dataset.py`（+多路用例；既有单值用例改断言归一化结果）
- Modify: `backend/tests/knowledge/eval/test_question_bank.py`（+新签名用例）

- [x] RED test（文件层）：
  - 仅 `expected_path` 的 legacy 行 → 加载为 `expected_paths == (该值,)`；
  - 仅 `expected_paths: ["vector","graph"]` → 原样加载；空数组 / 含非法枚举 / 非字符串元素 / 重复值是否去重保序（实现定，测试钉死：**去重保序**）→ 前三者拒绝；
  - 双键并存 → `GoldenDatasetError` 消息同时含两个字段名；双缺 → `missing required field`；
  - 真实 fixture `golden.jsonl` 守护测试不动应常绿（单值兼容的回归证明）；
  - `add_question(expected_paths=[...])` 落盘行为 `expected_paths` 键；**向含 legacy 行的文件追加后全文件升级为新格式**（`asdict` 重写语义，测试钉死）。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_dataset.py tests/knowledge/eval/test_question_bank.py -q`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): allow multi-path expected_paths in golden schema`

**实施偏差记录**：① `GoldenQuestion` 保留只读兼容属性 `expected_path`（返回首路）——字段替换后消费方（metrics/runner/ragas）不改也能绿，为 Task 2/3 保留真 RED 空间，Task 3 收尾移除；② 四个测试构造器（`test_metrics` / `test_runner` / `test_ragas_eval` / `test_eval_persistence`）与 `test_ondemand::_seed_question`、`test_eval_questions_api` 响应断言随 schema 机械适配（保持单路语义不变）；③ API 请求体契约仍是单值 `expected_path`，service 层包单元素列表过渡（Task 4 切换）；④ Windows 环境需 `--basetemp=.pytest-tmp/<task>` 规避系统临时目录权限问题。

## Task 2: Layer 1 多路判定——`path_correct` 集合语义 + 报告序列化 ✅ 已完成（2026-08-28，`c52fe546`）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/eval/metrics.py`（`evaluate_question`：`path_correct = actual is not None and actual in question.expected_paths`；`QuestionMetrics.expected_path` → `expected_paths: tuple[str, ...]`；模块 docstring 补多路口径：任一命中即对，非必须全调）
- Modify: `backend/packages/harness/deerflow/knowledge/eval/runner.py`（`report_to_dict` 逐题 `expected_paths` 列表；`_baseline_parts` 双键读取 `expected_paths or [expected_path]`；`render_markdown` 回退详情路径逗号连接）
- Modify: `backend/tests/knowledge/eval/test_metrics.py`（+多路用例；既有构造改 `expected_paths`）
- Modify: `backend/tests/knowledge/eval/test_runner.py`（+旧格式报告做 baseline 可读；新报告含 `expected_paths`）

- [x] RED test：
  - 单元素集合行为与现状逐位一致（`actual == 唯一期望` 的真值表不变——防语义漂移的回归钉）；
  - 多路：`actual=vector`、期望 `{vector,graph}` → True；`actual=wiki` → False；`actual=None` → False；
  - `aggregate` 的 `path_accuracy` 按新 `path_correct` 计数（构造 2 对 1 错 → 0.5）；
  - `report_to_dict(...).questions[i].expected_paths` 为列表；`_baseline_parts` 吃仅有 `expected_path` 键的旧报告不抛错；
  - 回退详情 markdown 含 `预期路径: vector, graph`。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_metrics.py tests/knowledge/eval/test_runner.py -q`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof；**回归**：`test_ondemand.py` 与 `test_eval_cli.py` 不动应全绿（编排层只透传题目对象）。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): judge layer-1 path correctness against expected path set`

**实施记录**：RED 阶段 5 failed（多路判定/序列化键/markdown）；单路等价用例与双键 baseline 用例在兼容属性下先行通过属预期（语义切换只对多路题产生行为差异）。回归证据：`tests/knowledge/eval` 260 全绿，`test_ondemand` / `test_eval_cli` 零改动。

## Task 3: Layer 2 多路判定——`path_hit` any 语义 ✅ 已完成（2026-08-28，`a092d154`）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/eval/ragas_eval.py`（`path_hit(expected_paths, retrieval_tools)`：any 映射；`QuestionEvalResult.expected_path` → `expected_paths`；聚合/渲染/报告读回 `:855` 同步）
- Modify: `backend/tests/knowledge/eval/test_ragas_eval.py`（+多路用例；既有构造改集合）

- [x] RED test：
  - 单元素语义与现状逐位一致（期望工具在序列 → True；不在/未检索 → False）；
  - 多路：调用 `hybrid_search`、期望 `{vector,graph}` → True；只调 `wiki_search` → False；
  - `QuestionEvalResult.expected_paths` 透传进报告 dict 与 markdown 渲染。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_ragas_eval.py -q`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): accept multi-path expectations in layer-2 path hit`

**实施记录**：① 报告读回 `report_from_dict` 同步双键兼容（旧单值 `expected_path` → 单元素集合），与 Layer 1 `_baseline_parts` 同口径；② 逐题表格渲染用 `'/'.join`（vector/graph）紧凑展示；③ 按 Task 1 偏差①计划移除了 `GoldenQuestion.expected_path` 过渡属性（消费方已全部切换），`test_dataset.py` 断言同步。回归：`tests/knowledge/eval` 266 全绿 + 题库/运行 API 45 全绿。

## Task 4: API 破坏式切换——`expected_paths` 请求/响应 ✅ 已完成（2026-08-28，`40abafc2`）

**Files:**
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`EvalQuestionCreateRequest.expected_path` → `expected_paths: list[str] = Field(min_length=1, max_length=3)`；创建端点传参同步；类注释更新）
- Modify: `backend/app/gateway/services/knowledge_service.py`（`create_eval_question` 参数 `expected_path` → `expected_paths`）
- Modify: `backend/tests/knowledge/test_eval_questions_api.py`（全量用例切换）

- [x] RED test：
  - POST `expected_paths: ["vector","graph"]` → 201 响应回显 `expected_paths`；GET list 同形；
  - POST 旧字段 `expected_path: "vector"` → 422（`extra="forbid"` 拒绝——**API 层不兼容是契约**，测试钉死）；
  - 空数组 → 422；4 项 → 422；非法枚举 → 422 detail 含字段名；
  - 既有「题库添加/删除/脏文件 500/未知 kb 404」用例改新字段后全绿。
- [x] Run `cd backend && uv run pytest tests/knowledge/test_eval_questions_api.py -q`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): switch eval question API to expected_paths payload`

**实施记录**：`EvalQuestionCreateRequest.expected_paths: list[str] = Field(min_length=1, max_length=3)`；service 层 `create_eval_question(expected_paths: Collection[str])` 直透（移除 Task 1 的单元素包裹过渡）；`test_eval_runs_api.py` 的种子题 POST 同步切换。回归：eval 套件 + 两个 API 文件 316 全绿。**注意**：前端仍用旧字段，中间态持续到 Task 8 同批切换（开发分支不切生产，可接受）。

---

## Phase 2: wiki 锚定通道（后端）

## Task 5: recall-test wiki hit 补 `source_chunk_ids` ✅ 已完成（2026-08-28，`2c659f64`）

**Files:**
- Modify: `backend/app/gateway/services/knowledge_service.py`（`recall_test` wiki 命中组装：`source_type == "wiki"` 时 `wiki_store.get_entry(entry_id)` 读 `source_chunk_ids` 注入；人工卡片不带此键——与 `runner.wiki_fn` 跳过卡片的口径一致）
- Modify: `backend/tests/knowledge/test_recall_test_api.py`（+wiki 锚定字段用例）

- [x] RED test：
  - wiki 词条命中（mock `wiki_store.get_entry` 返回 `source_chunk_ids`）→ hit 含该列表；
  - 人工卡片命中（`source_type == "card"`）→ hit **无** `source_chunk_ids` 键；
  - 词条缺源切片（`get_entry` 返回空/`source_chunk_ids` 为空）→ 空数组（不炸）；
  - vector / graph 路结构不变（回归既有断言不动）。
- [x] Run `cd backend && uv run pytest tests/knowledge/test_recall_test_api.py -q`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): expose wiki entry source chunks in recall-test hits`

**实施记录**：① 卡片口径与 spec 细节不同：实现按既有代码事实以 `source_type != "wiki"`（含 `manual`）为不注入条件，比 spec 写的 `card` 更宽——人工卡片实际枚举是 `manual`，spec 举例有误，实现以代码事实为准；② `KnowledgeService` 构造器保证 `wiki_store` 永非 None（`or WikiStore(...)`），无 None 守卫，库中不存在的词条 → 空数组；③ 只对词条调 `get_entry`（`asyncio.gather` 并发），不为卡片白打；④ 新增 `service_with_wiki` fixture（mock get_entry），原 `service` fixture 行为不变。回归：8 passed（integration 用例需 qdrant，本地 deselect，其集合断言不受增量字段影响）。

---

## Phase 3: 合成造题（后端）

## Task 6: synthesis 核心——生成解析 + 锚定守卫 + 暂存文件 ✅ 已完成（2026-08-28，`e291ecb0`）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/eval/synthesis.py`（`_SYNTH_IN_FLIGHT` 注册表 + `synthesis_in_progress(kb_id)`；`synthesize_for_doc(kb_id, doc_id, count, *, chunks, llm_factory)` 编排：构造编号切片 prompt → LLM JSON → 逐候选 ①锚定编号→`chunk_id` 映射（越界/缺失 → 丢弃）②注入 `c_<hex8>` candidate_id 与题目字段后过 `validate_question`（失败 → 丢弃）→ `dropped` 计数 → 暂存整体替换；`load_candidates(path)` / `accept_candidate(bank_path, staging_path, candidate_id)`（经 `question_bank.add_question` 入库并从暂存移除，返回新题；未知 → KeyError）/ `reject_candidate(staging_path, candidate_id)`（移除；未知 → KeyError）；暂存落盘复用 tmp + `os.replace` 原子写 + per-path lock 模式）
- Create: `backend/tests/knowledge/eval/test_synthesis.py`（stub LLM factory，纯文件层）

- [x] RED test：
  - stub LLM 返回合法 JSON（single-hop + multi-hop 各若干）→ 暂存文件行数 = 采纳数，每行过 `validate_question`（回读断言），`candidate_id` 形如 `c_<hex8>` 互不重复，`generated_at` / `doc_id` 落元数据；
  - 锚定编号越界 / 指向不存在的切片序号 → 该候选丢弃、`dropped` +1、其余候选不受影响；
  - 候选字段违例（坏 category）→ 丢弃、`dropped` +1（`validate_question` 守卫生效）；
  - LLM 返回非法 JSON → 0 候选、`dropped=0`、暂存整体替换为空合成元数据（失败不炸，编排层兜底）；
  - 再次合成 → 暂存**整体替换**（旧候选不残留）；
  - accept：暂存候选 → `golden.jsonl` 多一题（服务端新 `q_` id，非 `c_` id）且暂存少一行；未知候选 → KeyError；
  - reject：暂存少一行；未知 → KeyError；
  - prompt 契约钉死：含编号切片清单、`count` 数量约束、single-hop/multi-hop 混合要求、禁止照抄切片原文、JSON 输出字段清单（用 stub 捕获 prompt 文本断言关键词）。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_synthesis.py -q`，记录 missing-module RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add bottom-up question synthesis with anchor guards`

**实施偏差记录**：① **暂存文件改用单一 JSON 文档 `eval_candidates.json`**（非 plan/spec 的 `.jsonl` 逐行格式）——元数据（doc_id/generated_at/dropped）必须在候选全部被审核后仍可读（状态端点要展示全部丢弃数），JSONL 逐行格式做不到；**Task 7 的 `_synthesis_staging_path` 相应返回 `.json`**，spec §6.3 的文件名随 Task 12 文档同步一并修正；② revert proof 用文件移动法（新模块 untracked，`git stash` 不适用）；③ `_SYNTH_IN_FLIGHT` 注册表提供 `begin_synthesis/end_synthesis/synthesis_in_progress` 三件套（ondemand 同款）；④ LLM JSON 输出容忍 ```代码围栏包裹（实际模型高频行为）；⑤ 守卫顺序钉死：锚定编号映射（越界/非整→丢）→ `validate_question`（schema 违例→丢），`dropped` 计数。回归：`tests/knowledge/eval` 278 全绿。

## Task 7: 合成触发与审核端点——202 幂等 + 状态 + accept/reject ✅ 已完成（2026-08-28，`792f259a`）

**Files:**
- Modify: `backend/app/gateway/services/knowledge_service.py`（+`_synthesis_staging_path(kb_id)`（与 golden.jsonl 同目录 `eval_candidates.json`，Task 6 偏差①）+ `trigger_question_synthesis(kb_id, *, doc_id, count) -> bool`：文档不存在/无切片 → `SynthesisDocNotReady`，in-flight → False，否则 fire-and-forget `asyncio.create_task`（`store.list_chunks` 分页拉全量切片喂 `synthesize_for_doc`，异常兜底只记日志并 drain in-flight，不动既有暂存）+ `get_synthesis_status(kb_id)`（`{in_progress, candidates, generated_at, doc_id, dropped}`）+ `accept_synthesis_candidate` / `reject_synthesis_candidate` 薄壳（KeyError → 上层 404））
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（+`POST /{kb_id}/eval/questions/synthesize`（body `{doc_id, count: 1-10}`，202 `enqueued/already_running`，`SynthesisDocNotReady`→409，count 越界 422）+ `GET .../synthesize`（状态）+ `POST .../synthesize/{candidate_id}/accept`（201 返回新题）+ `DELETE .../synthesize/{candidate_id}`（204）；注册于既有 `GET /eval-runs/{run_id}` 之前、`/eval/questions` 区块内；**路由顺序守卫**：`/synthesize` 固定段必须先于任何 `{question_id}` 通配段注册，避免路径吞并）
- Create: `backend/tests/knowledge/test_synthesis_api.py`（基建对齐 `test_eval_questions_api.py`）

- [x] RED test：
  - 首次 POST → 202 `enqueued` 且任务被调度（fake `synthesize_for_doc` 断言调用参数含 kb/doc/count）；in-flight 中再 POST → 202 `already_running` 且不重复调度；
  - 未知文档 / 文档无切片 → 409；未知 kb → 404；`count=0` / `count=11` → 422；
  - GET 状态：运行中 `in_progress: true` 且 `candidates` 为上一次暂存（合成失败不清空——钉死）；完成后暂存候选原样下发；无暂存 → `{in_progress: false, candidates: []}`；
  - accept → 201 返回含服务端 `q_` id 的完整题目，再 GET 状态该候选消失、`GET /eval/questions` 可见新题；未知候选 → 404；
  - reject → 204 且候选消失；未知 → 404；
  - 运行期异常（fake 编排抛错）→ in-flight drain（再 POST 可重新 `enqueued`）、既有暂存不变、无 500 泄漏给触发方（202 已发出，异常仅日志）。
- [x] Run `cd backend && uv run pytest tests/knowledge/test_synthesis_api.py -q`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof；**回归**：`tests/knowledge -q` 全绿（路由注册不得破坏既有题库/运行端点）。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add question synthesis trigger and review endpoints`

**实施记录**：① 触发幂等测试用假调度器模式（`test_eval_runs_api` 同款）——曾试真实调度 + 跨线程 `asyncio.Event` 挂起，TestClient portal 跨线程下 Event 不可靠，弃用；in-flight 占用由 `begin_synthesis` 在调度前同步完成，假调度不 drain 即确定可断言；② `SynthesisDocNotReady` 定义在 `synthesis.py`（与 `EvalQuestionBankEmpty` 居 `ondemand` 对称）；③ 跨文档切片读取 `_all_chunks` 分页 50/页；④ `_synthesis_tasks` 任务集防 GC（`_eval_tasks` 同款）；⑤ 路由顺序：`/synthesize` 四/五段路径与 `{question_id}` 三段通配无吞并风险，集中注册保可读；⑥ 暂存播种用真实 `synthesize_for_doc` + stub LLM（而非手写字段），钉死状态端点与合成链路的字段一致性。回归：341 passed（eval 套件 + 三个 API 文件）；revert proof 13 failed。

---

## Phase 4: 前端数据层与多路化

## Task 8: 前端数据层——types + api + hooks + i18n 键批次 ✅ 已完成（2026-08-28，`0f5d736f`）

**Files:**
- Modify: `frontend/src/core/knowledge/types.ts`（`EvalQuestion` / `EvalQuestionCreateInput`：`expected_path` → `expected_paths: ("vector"|"graph"|"wiki")[]`；+`RecallWikiHit.source_chunk_ids?: string[]`；+`SynthesisCandidate` / `SynthesisStatus` / `SynthesisTriggerResponse`）
- Modify: `frontend/src/core/knowledge/api.ts`（`createEvalQuestion` body 切换；+`triggerQuestionSynthesis` / `getSynthesisStatus` / `acceptSynthesisCandidate` / `rejectSynthesisCandidate`，`kbUrl` 先例）
- Create: `frontend/src/core/knowledge/synthesis-status.ts`（`synthesisRefetchInterval(data)`：`in_progress ? 3000 : false`——`eval-run-status.ts` 同款纯函数）
- Modify: `frontend/src/core/knowledge/hooks.ts`（+`knowledgeSynthesisKey` key factory；+`useSynthesisStatus`（refetchInterval 门控）/ `useTriggerSynthesis` / `useAcceptSynthesisCandidate` / `useRejectSynthesisCandidate`；mutation 成功 invalidate `synthesis` 与 `evalQuestions`；全部 `enabled` 门控）
- Modify: `frontend/src/core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`（+`eval.synthesize.*`（入口按钮/文档选择 dialog/数量/生成中/审核面板/采纳/忽略/全部忽略/元信息行）、`eval.questions.emptyState` 双入口文案、`recall.saveAsQuestion` 锚定辅助定位文案与 `expectedPathsLabel` 复数化、`recall.wikiEntry.anchorTooltip`（人工卡片不可锚定））
- Modify: `frontend/tests/unit/knowledge/hooks.dom.test.tsx`（+新 hooks 用例）

- [x] RED test（hooks.dom.test.tsx 扩充）：
  - `knowledgeSynthesisKey(kbId)` 唯一且含 kbId；`enabled=false` 不发请求；
  - `synthesisRefetchInterval`：`in_progress=true` → 3000，`false` → false（纯函数直测）；
  - accept/reject mutation 成功 → invalidate `synthesis` + `evalQuestions` 两个 key；
  - `useTriggerSynthesis` 返回 `{status}` 透传。
- [x] Run `cd frontend && pnpm test hooks`，记录 RED。
- [x] Implement：types → api → synthesis-status → hooks → i18n 三文件同步。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add synthesis data layer and multi-path eval types`

**实施偏差记录**：① `pnpm check` 非全绿——8 个类型错误全部是 Task 9 计划内切换的组件/测试 fixture（`eval-save/add-question-dialog`、`eval-question-bank`、`eval-question-drawer` 及两个对应测试）的 `expected_path` 中间态，与后端 Task 4→8 的计划内中间态同款；本任务范围（数据层 + hooks 测试 46 passed）全绿；② 无 `recall.wikiEntry` 键路径，人工卡片不可锚定提示用平键 `recallTest.wikiAnchorTooltip`；③ `expectedPathsLabel`/`anchorHint` 新增与旧 `expectedPathLabel` 并存（过渡期，组件仍引用旧键），Task 9 切换后删旧键；④ `eval.questions.emptyState` 双入口落地为 `emptyBankSynthesis`（空态第二句）；⑤ `SynthesisTriggerInput` 额外定义（触发体类型化）；⑥ revert proof 用新模块文件移动法（移走 → 测试文件红 → 恢复 → 46 passed）。

## Task 9: 存题入口多路化——两个 dialog + 表格/drawer Badge ✅ 已完成（2026-08-28，`a48f9676`）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/eval-save-question-dialog.tsx`（预期路径 `Select` → 三项 Checkbox 组；props `defaultPath` → `defaultPaths: Path[]`；`canSubmit` 追加「至少勾一路」；提交体 `expected_paths`）
- Modify: `frontend/src/components/workspace/knowledge/eval-add-question-dialog.tsx`（同款 Checkbox 组，默认仅勾 vector）
- Modify: `frontend/src/components/workspace/knowledge/eval-question-bank.tsx`（路径列渲染 `expected_paths` 全量 Badge）
- Modify: `frontend/src/components/workspace/knowledge/eval-question-drawer.tsx`（Badge 复数渲染）
- Modify: `frontend/src/components/workspace/knowledge/recall-test-panel.tsx`（`defaultPath` 推导改 `defaultPaths` 集合，透传新 prop）
- Modify: `frontend/tests/unit/knowledge/eval-question-bank.dom.test.tsx`（+多路渲染与提交体断言；既有单路用例切换）

- [x] RED test：
  - 存题 dialog：默认勾选 = `defaultPaths`（混路即多勾）；全不勾 → 提交禁用；提交体 `expected_paths` 为勾选集合、**不含** `expected_path` 键；
  - 添加 dialog：默认仅 vector；勾两项提交体双路；
  - 表格路径列：`["vector","graph"]` → 两枚 Badge；drawer 同步；
  - 既有「混路默认 vector」断言删除（语义已被集合默认取代）。
- [x] Run `cd frontend && pnpm test eval-question-bank recall-test-panel`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): allow multi-path expectations in question dialogs`

**实施记录**：① RED 8 failed → GREEN 35 passed；`pnpm check` 全绿（Task 8 遗留的 8 个 `expected_path` 中间态类型错误清零）；相关面回归 176 passed（eval/hooks/recall）；② checkbox 状态断言用 `getAttribute("aria-checked")` 先例（vector-tab 同款）——`toHaveProperty` 查的是 JS 属性而非 attribute，对 Radix checkbox 无效；③ 混路默认多勾落地：面板 `defaultSavePaths = [...selectionPaths]`（Set 迭代序 = 勾选序，与提交顺序一致），原测试注释写混路实际双 vector 点击，已修正为真混路；④ 旧键处置：`saveAsQuestion.expectedPathLabel` 已无引用（存题 dialog 切新键），`addDialog.expectedPathLabel` 保留作 Checkbox 组标签（文案「预期路径」对组标签仍适用），Task 8 偏差③「删旧键」收窄为此口径；⑤ 两 dialog 的 `canSubmit` 均追加「至少勾一路」（后端 min_length=1 前哨）。

## Task 10: 百科行勾选——`source_chunk_ids` 进锚定集 ✅ 已完成（2026-08-28，`5207d4b3`）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/recall-test-panel.tsx`（wiki 命中行：`source_chunk_ids` 非空 → 渲染 checkbox，勾选将其源切片并入 `selectedChunkIds`、来源路径集合并入 `wiki`；人工卡片行无 checkbox + tooltip `recall.wikiEntry.anchorTooltip`；`defaultPaths` 推导含 wiki）
- Modify: `frontend/tests/unit/knowledge/recall-test-panel.dom.test.tsx`（+百科勾选用例）

- [x] RED test：
  - 带 `source_chunk_ids` 的 wiki 行勾选 → 「存为考题」按钮出现、提交体 `relevant_chunk_ids` 含源切片、`defaultPaths` 含 `wiki`；
  - 人工卡片行（无 `source_chunk_ids`）→ 无 checkbox、tooltip 文案在；
  - 混勾（向量切片 + 百科条目）→ `defaultPaths == ["vector","wiki"]`、两类切片都在提交体；
  - 既有「勾选向量/图谱行」用例不动应全绿。
- [x] Run `cd frontend && pnpm test recall-test-panel`，记录 RED。
- [x] Implement。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): allow anchoring wiki entries via source chunks`

**实施记录**：① RED 3 failed → GREEN 20 passed（既有 17 用例零改动回归，含「3 个勾选框」计数断言——无源切片的 wiki 行不新增勾选框）；回归面 38 passed；② 词条行勾选 = 源切片整体进/出锚定集（`toggleWikiEntry`），已选切片不重复加（保提交体无重）；勾选态 = 全部源切片已选；③ 人工卡片判定用 `source_type === "manual"`（与后端 Task 5 口径一致，无源切片的词条同样不可锚定）；④ tooltip 用原生 `title`（轻量，测试 `getByTitle` 可断言）；⑤ 首版实现把行按钮的 `flex flex-col` 弄丢导致布局退化，`cn` 条件拼接修复（`anchorable && "min-w-0 flex-1"`）；⑥ eslint --fix 处理了导入顺序（`cn` 归入 `@/` 分组）。

---

## Phase 5: 合成造题（前端）

## Task 11: 生成入口 + 候选审核面板 ✅ 已完成（2026-08-28，`f718ee01`）

**Files:**
- Create: `frontend/src/components/workspace/knowledge/eval-synthesis-dialog.tsx`（文档下拉（复用文档列表数据源）+ 数量 select（默认 5，1–10）→ `useTriggerSynthesis`；`already_running` → toast；`enqueued` → toast 并关 dialog）
- Create: `frontend/src/components/workspace/knowledge/eval-synthesis-review.tsx`（题库视图内联区块，暂存非空时出现：元信息行（来源文档 · 生成时间 · 剩余数 · dropped 数字）+ 候选卡片列（query 全文 + category/paths Badge + 锚定切片数 + reference_answer 折叠）+ 每卡「✓ 采纳」/「✕ 忽略」+「全部忽略」；`in_progress` 时顶部 spinner +「生成中…」）
- Modify: `frontend/src/components/workspace/knowledge/eval-question-bank.tsx`（表格上方工具行 +「✦ 从文档生成考题」按钮挂合成 dialog；审核区块插入表格上方；空态文案切双入口）
- Create: `frontend/tests/unit/knowledge/eval-synthesis.dom.test.tsx`

- [x] RED test：
  - 工具行按钮 → dialog 打开；文档未选 → 提交禁用；提交 → trigger mutation 携带 `{doc_id, count}`；`enqueued`/`already_running` 各自 toast；
  - 审核面板：候选卡片字段全量渲染；「采纳」→ accept mutation 成功后卡片消失（invalidate 驱动）且成功 toast；「忽略」→ reject mutation；「全部忽略」→ 逐条 reject（或批量语义，实现定，测试钉死）；
  - `in_progress` → spinner 文案、轮询由 `useSynthesisStatus` refetchInterval 承担（mock queryClient 断言）；
  - 暂存空且非运行中 → 面板不渲染，表格常态；
  - 空态文案含「从文档生成考题（推荐）」与「手动添加」双入口。
- [x] Run `cd frontend && pnpm test eval-synthesis eval-question-bank`，记录 missing-component RED。
- [x] Implement；eval-question-bank 接线。
- [x] GREEN；revert proof。
- [x] `pnpm check` 双净。
- [x] Commit: `feat(frontend): add question synthesis review flow`

**实施记录**：① RED（2 bank 接线用例 + eval-synthesis 依赖缺失）→ GREEN 24 passed（dialog 3 + review 6 + bank 新增 2 + 既有回归 13）；`pnpm check` 双净；② 轮询断言不在 dom 层重复——refetchInterval 门控已在 hooks.dom.test（Task 8）钉死，此处只测消费面；③ 「全部忽略」落地为逐条串行 reject（后端无批量端点，整体替换语义下暂存量小）；④ 触发 dialog 文档下拉预过滤 `status === "ready"`（无切片必 409，减误触发）；`useDocuments(open ? kbId : null)` 懒门控；⑤ already_running 与 enqueued 共用 `generating` toast（info/success 区分），未新增 i18n 键；⑥ i18n 两处文案定稿：`entryButton` 改「从文档生成考题」（空态推荐入口语义），`emptyBankSynthesis` 去前导逗号（空态拆两个 `<p>` 分行，`getByText` 可定位）；⑦ **分支既有问题记录**：`chat-panel.dom.test.tsx` 模型选择器用例在本分支持续失败，还原本任务全部改动后仍红——与题库重构无关，留待独立排查；本任务回归面其余 596 全绿。

---

## 计划外 UX 修订（2026-08-29，用户反馈驱动）：题库造题入口并入常驻工具栏 + 轻量化 [x]

**背景**：用户反馈两个问题——① 合成入口在顶部工具行、添加入口在表格尾部虚线行，同类工具按钮分两处且添加入口随列表增长沉底；② 修复合并后工具栏显得臃肿、视觉质量重于其他 tab。

**定稿方案**（三轮设计推演：独立工具行 ✘ 两条栏叠加 → 表格卡片 ✘ tab 内盒中盒 → 并入常驻工具栏 ✔）：
- 「添加考题」（Plus 图标）+「从文档生成考题」（Sparkles）并入 eval-tab 常驻工具栏右侧，仅题库视图出现；「运行评测」保持最右主位；窄面板经既有 `useToolbarTier` 一并收进 ⋯ 菜单。
- 状态提升：`bankAddOpen`/`bankSynthesisOpen` 在 EvalTab，bank 的添加/合成 dialog 改受控（`addOpen`/`synthesisOpen` props）。
- 移除：bank 原工具行 + 表格尾部虚线按钮（**偏离 spec §4.3「表格尾部虚线行」表述，Task 12 文档同步时一并修 spec**）。
- 轻量化：全栏按钮 `h-7` 降 `h-6`（客观高度本就与文档/百科/向量/图谱工具栏一致，均为 `py-2`，重的是视觉质量）。分段控件去底色块改下划线曾一并实施，**用户随即否决（`1bc239f7` 还原）**：底色块样式与顶部知识库大 tab 的下划线样式形成层级区分，是有意设计，保留。
- 空态两句引导文案保留（按钮在表格外，空库时依然可达）。

**TDD 轨迹**：RED 7 failed（eval-tab 新 4 用例：仅题库视图出现/受控置真与复位/降档进菜单；bank 改 3 用例：受控渲染 + 不自渲染入口负断言）→ GREEN 40 passed → 轻量化追加 RED 2 → GREEN 41 → revert proof 9 failed → `pnpm check` 双净 → 全域回归 598/599（唯一失败仍为 chat-panel 既有）。Commit: `refactor(frontend): merge question entries into eval toolbar and slim it`（`d271707f`，4 文件 +209/−50）；分段控件还原另见 `1bc239f7`（RED 1 → GREEN 41 双净）。

**后续打磨（2026-08-30，逐轮反馈驱动，三个提交）**：
- `45ec67bb` `fix(frontend): align eval tab toolbars and question bank layout`：① 按钮 `h-6` 回退 `h-7`（曾误降致 42px，恢复 44 = 全知识库页基准）；② ⋯ 降档触发器 `size="sm"`（h-8）改 `size-7`，修「切题库栏高 44→48 突跳」（document-panel 同款先例）；③ `entryButton` 文案「从文档生成考题」→「生成考题」，三按钮同长；④ 题库视图内容区通栏 `px-0 pt-0 pb-3`（总览/历史保持 `px-4 py-3`），表头分界线与常驻工具栏下沿四边对齐（文档列表同构）。
- `85f01ec1` `refactor(frontend): move recall cost hint into run button tooltip`：检索测试成本提示从独占一行收进「开始检索」按钮 Tooltip（`@/components/workspace/tooltip`，focus/hover 弹出）；控件全锁 `h-7`，检索栏归入 44px 基准（原 `py-3` + 默认 `h-9` 实为 52px）。
- `9c5644ba` `style(frontend): unify question bank table style with document list`：表头去默认 `h-10`（40px）降 `h-auto text-xs`（32px）；数据行同文档列表 `px-2 py-2`（36px）；表头/首行/末行左右缘 `pl-4`/`pr-4` 找齐工具栏内容边距；行内 ↗ 复现按钮移除（占栏宽，入口留详情 drawer）；审核区块空时 `[&:empty]:hidden` 不浮间隙。每轮均 RED→GREEN→revert proof→双净，全域回归保持 601/602（仅 chat-panel 既有失败）。
- `3865c374` `feat(frontend): add question bank search to eval toolbar`：题库搜索**常驻**工具栏（用户拍板否决展开/收起交互）——分段控件与动作按钮之间，仅题库视图，`h-7 text-xs`、`min-w-40 max-w-64`（输入型控件可用底线，窄了按钮走 ⋯ 不让搜索挤压）；纯前端不区分大小写包含过滤，三态区分（空库引导/无匹配/正常）；运行评测加 `Play` 图标（运行中切 spinner）；三按钮统一 `gap-1.5 px-2.5` 紧凑档（修默认档带/不带图标宽度不一）。设计推演：覆盖遮挡分段控件方案被否（导航层级高于搜索，遮导航需逃生通道）；主流收起机制（iOS 取消/Android 返回箭头/Chrome ✕+Esc）均为覆盖打的补丁，常驻后无需。全域回归 608/609。
- `c0bc9d4b` `feat(frontend): surface wiki actions in wiki tab and regroup library menu`（知识库页按钮三连）：① 更新/重建本是百科功能却只在全局库菜单——百科 tab 搜索框后加 ⋯（`size-7`）承接，双入口共用 `handleGenerateWiki`（page.tsx 提取）；重建确认弹窗抽出共享组件 `wiki-rebuild-dialog.tsx` 两处复用；② 「全部重建」范围不明，文案改「重建百科」（en `Rebuild wiki`）；③ 全局菜单重命名（Pencil）/删除（Trash2 红色）补图标，分界上移使两项独占知识库管理段。菜单项一律带图标（测试锁住不得裸文字）。RED 5 → GREEN 28/28 → 双净 → revert proof → 全域回归 611/612。
- `641f5d2d` + `558bceb0`（表格/状态/错误三连，同一轮评审）：① 数值列右对齐 + `tabular-nums`（评测分类表四列；文档表列序重排为文本左组/数值右组，主流文件管理器惯例）；② 状态黑底徽章→圆点+小字（就绪退背景、失败唯一抢眼），文件图标形状+颜色双区分（Drive/OneDrive 色系）；③ 错误产品化：后端空文件上传门口拒绝（400，不再白送 MinerU——户号.pptx 失败根因即 0 字节文件），前端 `classifyDocError` 映射友好文案，失败不再常驻表格、状态转 failed 时弹右下角**汇总 toast**（同周期多失败折叠一条、会话内去重、重试后再失败重新提醒），原始英文彻底不外露。前后端均 TDD，前端全域回归 627/628、后端 knowledge 套件 744 绿。
- `420eedc5` `feat(frontend): move document failure notifications into an in-tab panel`（失败通知三连收尾）：① 行级收尾：状态单元格 `whitespace-nowrap` 单行化（失败行不再被撑高换行），重试收进失败状态 HoverCard（Tooltip 不支持内部点击）+ 右键菜单兜底，操作列全行统一仅删除；全局 Toaster 改 `bottom-right` + `closeButton`。② 面板化（用户五条拍板）：全局 sonner toast 退出文档错误链路（视口级定位做不到留在 tab 内）——`useDocFailureToasts` 重构为 `useDocFailureNotifier`（检测语义不变：转 failed 才提醒/首载不补发/去重/重试再失败重新进列，新增：离开 failed 即撤条、`report` 收编上传即拒与重试请求失败），自绘 `doc-failure-panel.tsx` 绝对定位文档 tab 内右下角：✕ 右侧、折叠单行/悬停主体展开（悬停 ✕ 不展开，感应区只挂主体）、头部 ✕ 总关/行内 ✕ 单关、状态驱动无定时器不自动消失。③ 定稿样式：底色沿用全局 toast（`bg-white dark:bg-black` + 浅边框 + `shadow-lg`，曾用 `bg-background` 与页面同色被否）；文件名/原因两行制（长名 `truncate` 独占一行）；条目加 `retryable` 标记，可重试条目带紧凑重试按钮（复用行级 `onRetryDocument`，key 即文档 id）。叠卡复刻尝试（每条失败一张独立卡片 + 黑圆感叹号图标）实施后按用户要求整轮回退，定稿即汇总卡+展开列表。RED→GREEN→revert proof→双净，全域回归 1635/1636（仅 chat-panel 既有失败）。

---

## Phase 6: 收尾

## Task 12: 文档同步 + 全量回归 + Live 冒烟 ✅ 已完成（2026-09-08 文档同步；2026-09-09 Live 冒烟用户自跑通过）

**Files:**
- Modify: `backend/AGENTS.md`（eval 包补 `synthesis` 模块说明 + 新四端点清单 + 多路语义口径）
- Modify: `frontend/AGENTS.md`（评测 tab 合成入口与审核面板结构 + 新组件/hooks 清单）
- Modify: `docs/superpowers/specs/2026-08-28-rag-eval-question-bank-redesign-design.md`（状态行更新为已落地）
- Create: `frontend/tests/e2e/eval-question-bank-redesign.spec.ts`（Playwright page.route mock：多路 dialog 提交体、合成触发 202 → 审核面板渲染 → accept 后表格 +1——`eval-tab-phase2.spec.ts` 先例若未落地则对齐 `eval-metrics.spec.ts`）

- [x] E2E 用例落地并跑通。**2026-09-08 决策：不落地独立 e2e**。后续 4 份 plan（run-progress / trend-visibility / trend-runlevel / trend-ordinal-warp）均未写 Playwright e2e，团队实践已收敛到「dom/unit 回归替代 e2e」；本 plan Task 1–11 的 dom/unit 回归（bank / dialog / hooks / recall-test-panel / synthesis 五族用例）已覆盖 e2e 计划断言的全部交互面。
- [x] 全量回归：`cd backend && uv run pytest tests/knowledge -q` 全绿 + `cd frontend && pnpm test` 全绿（既有 chat-panel 失败基线见 frontend AGENTS，非本 plan 回归）+ `ruff check` / `ruff format --check` / `pnpm check` 双净。**2026-09-08 确认：已被后续 4 份 plan 的收官回归覆盖 4 次**，最新基线 backend eval **358 passed** + frontend knowledge **923 passed | 1 预存**（chat-panel model selector）+ 两端双净（具体数字见后续 plan 尾注）。本 plan Task 1–11 的每次局部回归都钉死了自己涉及的文件，跨 plan 耦合已由后续 RED→GREEN 反复证伪。
- [x] Live 冒烟（`make dev` 实跑）：① 存题 dialog 勾两路提交 → 表格双 Badge，跑评测 `path_accuracy` 不因混路误判；② 召回面板搜一题 → 百科词条行勾选 → 存题锚定列含源切片；③ 「从文档生成考题」选一篇已索引文档、5 题 → 审核面板出候选 → 采纳 2 题忽略 3 题 → 题库 +2；④ 合成中再点触发 → `already_running` toast；⑤ 旧格式题库文件（手造一行 `expected_path` 单值）读取正常、经 UI 追加一题后整文件升级新格式仍可跑评测。**2026-09-09 用户自跑五项全过**。
- [x] Commit: `docs(rag): sync agent guides and spec status for eval plans`（2026-09-08 落地，见收尾说明；subject 从原文 `for question bank redesign` 拓宽为 `for eval plans`，反映实际改动覆盖本 plan + 后续 3 份 plan 的产物）

**Task 12 收尾说明（2026-09-08）**：

本 plan Task 1–11 于 2026-08-28 全部落地后，Task 12 因用户紧接着推进后续 4 份 plan（`2026-09-06-rag-eval-run-progress.md` / `2026-09-06-rag-eval-trend-visibility.md` / `2026-09-07-rag-eval-trend-runlevel.md` / `2026-09-07-rag-eval-trend-ordinal-warp.md`）而搁置。2026-09-08 用户拍板按「精简收尾」方案关闭 Task 12：

1. **文档同步（backend/frontend AGENTS.md + spec）本次落地**——backend/AGENTS.md 追加 5 段契约说明（multi-path expected_paths / wiki anchoring / synthesis / progress + cancellation / trend payload v5），覆盖本 plan 与后续 3 份 plan 的后端产物；frontend/AGENTS.md 追加 2 段（document failure notifications in-tab / eval tab structure），覆盖本 plan 与后续 3 份 plan 的前端产物；spec 状态行改 `Landed 2026-08-28, closed 2026-09-08`，§5 `source_type == "card"` → `"manual"` 校正，§6.3 `.jsonl` → `.json` 校正，§7.3 加入「并入常驻工具栏」实施校正脚注，§10 三个开放点全部标注已裁定。
2. **全量回归与 e2e 已被后续 plan 覆盖**——后续 4 份 plan 每份收官都跑过 backend eval + frontend knowledge 全套回归，最新基线 backend eval 358 passed + frontend knowledge 923 passed | 1 预存（chat-panel）+ 两端双净。本 plan Task 1–11 的局部回归 + 后续 4 份 plan 的全量回归 = 等价于本 Task 12 的全量回归要求，不再重复跑。
3. **Live 冒烟用户自跑（2026-09-09 已通过）**——五项冒烟都是新交互路径（多路存题 / 百科行勾选 / 合成审核面板 / already_running toast / 旧格式升级），dom/unit 测覆盖不到「真实 LLM + 真实 qdrant + 真实文件写入」这一层，无法由后续 plan 的自动化回归替代。用户于 2026-09-09 实跑五项全过，本 plan 全部 Task 至此完结。
4. **AGENTS.md 粒度纪律**——本次补写对齐现有基线：只写「模块存在 + 职责 + 公共接口清单 + 关键契约/口径」，不写 commit hash / RED-GREEN 数字 / 实施偏差 / 手动验收清单（那些留在 plan 与 spec）。判据：新 agent 读完 AGENTS.md 后能「知道模块存在、大致做什么、去哪找细节」即够。

---

## Final verification

- [x] `cd backend && uv run pytest tests/knowledge -q` 全绿。**2026-09-08 状态**：被后续 4 份 plan 收官回归覆盖，最新基线 backend eval **358 passed**（见 run-progress plan Task 21 尾注）。
- [x] `cd frontend && pnpm test` 全绿（chat-panel 既有失败除外）。**2026-09-08 状态**：被后续 4 份 plan 收官回归覆盖，最新基线 frontend knowledge **923 passed | 1 预存**（chat-panel model selector，与本 plan 零交集）。
- [x] `ruff check` + `ruff format --check` + `pnpm check` 双净。**2026-09-08 状态**：后续每份 plan 收官均双净，本次文档补写不涉及代码，无需重跑。
- [x] Live 冒烟五项全过。**2026-09-09 用户自跑通过**（Task 12 第 3 项同源）。
- [x] 守护测试：`tests/fixtures/rag_eval/golden.jsonl` 未改动且加载常绿；CI `rag-eval.yml` 无需变更（本地以 `--golden` fixture 跑一次 `run_rag_eval.py` 佐证）。**2026-09-08 状态**：fixture 文件自 Task 1 起零改动（本 plan 纪律钉死），加载器双认契约由 `test_dataset.py` 守护测试常绿；后续 4 份 plan 均未触及 fixture 或 CI workflow。

---

## 运行期遗留（不属本 plan 交付，供后续决策）

- **题目编辑**：仍是删了重加（二期遗留沿用）；合成候选的采纳前微调（改 query/锚定）如需，另立。
- **合成模型独立配置**：现复用知识功能主模型（`create_chat_model()`），跑通后按同源偏差观察决定是否加开关（spec §10 开放点 1）。
- **生产流量挖掘 / 对抗题合成**：另立（spec §10）。
- **`relevant_entry_ids` 词条级锚定维度**：已裁定不做（spec §5）；人工卡片百科题保持不可锚定。
- **合成候选题的逐题来源展示**（候选卡片展开锚定切片原文预览）：审核面板先只显示锚定数，预览随逐题明细 spec 一并。
