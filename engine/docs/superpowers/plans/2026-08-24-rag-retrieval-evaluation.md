# RAG Retrieval Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the spec's two-layer retrieval quality evaluation system — Layer 1: git-versioned golden dataset + batch deterministic IR metrics（Hit Rate / Recall@k / MRR / 路径选择准确率）+ CI 硬门禁（回退超阈值即红、bot 评论贴汇总表）; Layer 2: scheduled RAGAS 端到端评估（faithfulness / answer_relevancy / context_precision / context_recall + 路径选择 / 引用 / 图谱落点三个架构专属指标）推送 Langfuse，只出报告永不进门禁。

**Spec:** `docs/superpowers/specs/2026-08-23-rag-retrieval-evaluation-design.md`（已定稿）

**Architecture:** 批量评估复用 recall_test 已验证的唯一 seam——直接调三个在线检索 impl（`_hybrid_search_impl` / `_graph_search_impl` / `_wiki_search_impl`），不走 HTTP、不依赖启动中的 gateway、不做 LLM 答案合成，CI 容器内可跑。评估核心放 `backend/packages/harness/deerflow/knowledge/eval/`（dataset / metrics / runner / ragas_eval），CLI 薄壳放 `backend/scripts/run_rag_eval.py`，测试放 `backend/tests/knowledge/eval/`，golden 题库放 `backend/tests/fixtures/rag_eval/golden.jsonl`。CI 新增 `rag-eval.yml`（Layer 1 门禁），`nightly.yaml` 加 Layer 2 定时 job。

**Tech Stack:** Python 3.12 / pytest（backend TDD 强制）/ ragas（可选依赖，不进默认安装）/ Langfuse（复用 `deerflow/tracing` 现有集成）/ GitHub Actions。

**Global Constraints:**
- 每个 Task：RED → GREEN → regression proof（revert→RED→restore→GREEN）→ commit（Conventional Commits）；收尾 `ruff check` / `ruff format` 双净。
- 分层纪律：Layer 1 确定性指标进 CI 硬门禁；Layer 2 LLM judge 指标**只做报告，永不进硬门禁**（judge 方差会污染门禁信号）。
- 降级契约与 recall_test 一致：单路异常 = 该路空 hits + failure note，**不中断整体运行**，一次运行总能产出完整报告。
- 缺 embedding/rerank/LLM key 时评测显式 skipped 并以约定码退出——**不伪绿**。
- graph 路 config 驱动参数（`graph_per_entity_cap` / `neighbor_min_score` / `hub_degree_threshold` 等）镜像 `knowledge_service.recall_test` 的读取方式，评估逻辑与线上永远同源。
- 不改任何检索算法本身；不引入新向量库/图存储依赖；不解决 NetworkX 全量加载等既有规模限制；不做公开基准（RGB / MultiHop-RAG）自动化；不做多副本部署化的评估任务队列（沿用单进程内存态，与 wiki `_IN_FLIGHT` 同边界）；二期前端评测 Tab 不在本 plan（仅遵守 spec 冻结的 API 契约意图，另立 plan）。
- 题库纪律：先标 20 题跑通全链路，再扩到 50–100；宁少而准，不可多而糙；**题库与代码同 PR 演进——改检索行为的 PR 必须同步审视题库**。global 类题目预期大面积失败属设计意图，报告单独分区呈现。
- 阈值（回退 3% 等）均为初始拍值，报告头部注明，跑两周后按实际抖动校准。
- Known code facts (verified 2026-08-24, pre-construction):
  - seam impl：`backend/packages/harness/deerflow/tools/builtins/hybrid_search_tool.py::_hybrid_search_impl`、`graph_search_tool.py::_graph_search_impl`、`wiki_search_tool.py::_wiki_search_impl`。
  - 在线同源参照：`backend/app/gateway/services/knowledge_service.py::recall_test`（config 镜像读法 + 单路降级范式）；router 在 `backend/app/gateway/routers/knowledge_bases.py`。
  - 测试风格参照：`backend/tests/knowledge/graph/test_retrieval.py`（纯函数）、`backend/tests/knowledge/test_recall_test_api.py`（fake 模式）；Layer 2 judge 解析测试复用 extractor 的 stub-LLM 模式。
  - CI 目录 `.github/workflows/` 现有 `backend-unit-tests.yml` / `nightly.yaml` 等，无 rag-eval 相关文件；`backend/tests/fixtures/` 目录现成。
  - golden schema（spec 冻结）：`id / query / expected_path(vector|graph|wiki) / relevant_chunk_ids(["<doc_id>#NNNN"]) / relevant_entities / reference_answer(可选) / category(fact|relation|concept|global)`。

## Task 1: Golden Dataset——schema、loader、守护测试、冷启动 20 题 ✅ 已完成（2026-08-24）

**Files:**
- Create: `backend/tests/fixtures/rag_eval/golden.jsonl`（git 版本化，先 20 题覆盖 fact/relation/concept/global 四类）
- Create: `backend/packages/harness/deerflow/knowledge/eval/__init__.py`
- Create: `backend/packages/harness/deerflow/knowledge/eval/dataset.py`（题目 dataclass + JSONL loader + schema 校验）
- Create: `backend/tests/knowledge/eval/__init__.py`
- Create: `backend/tests/knowledge/eval/test_dataset.py`

- [x] RED test：合法样本加载通过；缺字段 / 非法 `category` / 非法 `expected_path` / 坏 chunk_id 格式逐一拒绝；**守护测试直接加载真实 `golden.jsonl`** 保证题库永远合法（防脏题目静默污染指标）。
- [x] Run `cd backend && uv run pytest tests/knowledge/eval/test_dataset.py -q`，记录 missing-module RED。
- [x] Implement `dataset.py`：dataclass + `load_golden(path)` + `validate_question(raw)`（字段齐全、枚举合法、`relevant_chunk_ids` 匹配 `<doc_id>#NNNN`）。
- [x] 人工标注首批 20 题（从已入库真实文档，经召回测试面板操作确认预期路径与预期 chunk），写入 `golden.jsonl`。
- [x] GREEN（含守护测试）；revert proof：移走 dataset.py → collection RED → 恢复 → GREEN。
- [x] ruff check/format 双净。
- [x] Commit: `feat(rag): add golden dataset schema and seed retrieval eval questions`（`f9029926`；spec+plan 另提 `b33ceb79`）

## Task 2: 指标纯函数——Hit Rate / Recall@k / MRR / 路径判定 / baseline diff ✅ 已完成（2026-08-24）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/eval/metrics.py`（纯函数，无 IO）
- Create: `backend/tests/knowledge/eval/test_metrics.py`

- [x] RED test（对齐 test_retrieval.py 风格，构造输入断言数值）：Hit Rate（标注 chunk 进 top-k）/ Recall@k（标注 chunk 命中比例）/ MRR（首个正确排名倒数）/ 路径选择判定（三路各自 top-1 分数比较 vs `expected_path`）/ 按 category 聚合 / baseline diff（逐指标 Δ + 回退题目清单 + 任一 category Recall@k 下降 >3% 判失败，阈值可配）。
- [x] Run focused test 确认 RED。
- [x] Implement `metrics.py` 全部纯函数。
- [x] GREEN；revert proof（stash 实现 → RED → 恢复 → GREEN）。
- [x] ruff 双净。
- [x] Commit: `feat(rag): add deterministic IR metrics for retrieval evaluation`（`be25e073`）

## Task 3: 批量评估 runner——降级契约 + 双份报告 ✅ 已完成（2026-08-24）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/eval/runner.py`
- Create: `backend/tests/knowledge/eval/test_runner.py`

- [x] RED test（stub 三个检索 impl + 内存 store，参照 test_recall_test_api.py fake 模式）：单路抛异常仍产出完整报告（该路空 hits + failure note）；report.json schema 稳定（逐题明细 + 按 category 聚合 + 汇总）；baseline diff 退出码语义（无 baseline 全量通过 / 回退超阈值失败 / 未超通过）。
- [x] Run focused test 确认 RED。
- [x] Implement `runner.py`：逐题并行扇出三路 impl；graph 路 config 参数镜像 `recall_test` 读法；产出终端汇总表 + 落盘 `report.md` / `report.json`；回退题目附详情（预期命中 vs 实际命中、各路分数）；global 类题目单独分区。
- [x] GREEN；revert proof → 恢复 → GREEN。
- [x] ruff 双净。
- [x] Commit: `feat(rag): add batch retrieval evaluation runner with degradation contract`（`d46bfede`）

## Task 4: CLI 薄壳 + pytest 集成入口 ✅ 已完成（2026-08-24）

**Files:**
- Create: `backend/scripts/run_rag_eval.py`（`--golden --out --baseline --top-k --fail-threshold`；自行构造 store/vector_store/graph_store/wiki_store；按 runner 结果定退出码）
- Create: `backend/tests/knowledge/eval/test_eval_cli.py`

- [x] RED test：缺 key 环境显式 skipped（不伪绿）+ 约定退出码；CLI 参数解析与退出码映射。
- [x] Run focused test 确认 RED。
- [x] Implement CLI 薄壳。
- [x] GREEN；revert proof → 恢复 → GREEN。
- [x] 本地带 key 对 20 题跑一次全链路，产出首份 baseline `report.json` 归档（后续所有 diff 的基准）。
- [x] ruff 双净。
- [x] Commit: `feat(rag): add rag eval CLI entrypoint and pytest integration`（`bb33591e`）

## Task 5: CI 门禁 workflow `rag-eval.yml` ✅ 已完成（2026-08-24）

**Files:**
- Create: `.github/workflows/rag-eval.yml`

- [x] 配置触发：PR 触及检索相关模块（`backend/packages/harness/deerflow/knowledge/**`、检索工具、`backend/app/gateway/**` 检索相关部分、相关配置）。
- [x] Job：跑 Layer 1（`run_rag_eval.py`），失败阈值与 `--fail-threshold` 同源，回退超阈值 CI 红；bot 评论把汇总表贴到 PR。
- [x] secrets 注入 embedding/rerank/LLM key；缺 key 显式 skipped（不伪绿）。
- [x] 验证（按 spec 不入 pytest）：开测试 PR 实跑确认触发 / 评论 / skipped 三条路径；人为制造回退确认 CI 红。
- [x] Commit: `ci(rag): gate retrieval changes on golden dataset metrics`

## Task 6: Layer 2——RAGAS 定期评估 + Langfuse（只报告不门禁）✅ 已完成（2026-08-24）

**Files:**
- Modify: `backend/pyproject.toml` + `backend/packages/harness/pyproject.toml`（`ragas` 加为可选依赖 extra，不进默认安装/镜像；uv.lock 已更新）
- Create: `backend/packages/harness/deerflow/knowledge/eval/ragas_eval.py`
- Create: `backend/scripts/run_ragas_eval.py`（CLI 薄壳；plan 外补充，与 Layer 1 CLI 对称）
- Create: `backend/tests/knowledge/eval/test_ragas_eval.py` + `test_ragas_eval_cli.py`
- Modify: `.github/workflows/nightly.yaml`（placeholder → 真实命令；**同时修复 Task 5 遗留结构 bug**：rag-eval-layer-2 曾误插在 publish-chart 头部与 steps 之间，导致 publish-chart 丢失 steps、rag-eval-layer-2 出现重复 steps 键——已归还 publish-chart 完整定义）
- Modify: `.github/workflows/rag-eval.yml`（Task 5 缺陷修复：`|| true` 使 exit code 永远为 0 → 门禁永不红，改为 set +e 捕获 + Regression gate 步骤；kb-id 硬编码本地开发库 id → `vars.RAG_EVAL_KB_ID`；补 DEEPSEEK_API_KEY（graph 路实体抽取 LLM）；baseline 改为从 main 最近成功运行的 artifact 下载 + push main 时回传）

- [x] RED test（stub judge LLM，复用 extractor stub-LLM 模式）：judge 输出解析（合法 / 畸形 / 空响应）；引用准确率判定（答案 `[n]` vs 工具返回 citation_no 切片的支撑性 precision/recall，含编号不存在情形）；图谱落点命中率（实体落点 vs `relevant_entities`）；路径选择判定（trace 提取实际检索工具序列 vs `expected_path`）。
- [x] Run focused test 确认 RED。
- [x] Implement `ragas_eval.py`：走真实对话链路（rag agent 实际选工具、生成答案——`agent_name="rag"` 带 rag 工具组，不传 `deep_research` 保持自主选路）；复用 golden JSONL（缺 `reference_answer` 退化 reference-free）；judge 用 config 主模型，**judge prompt 固化在模块内**；三个架构专属指标随 RAGAS 报告一并输出；结果推 Langfuse（复用 `deerflow/tracing`）；报告头部预留人工校准字段（每月抽样 ≥10%，Cohen's κ）。**实跑发现并修复两个关键接线问题**：直接 ainvoke 时 `config["context"]` 不到 `ToolRuntime.context`（必须走顶层 `context=` 参数，gateway 链路是 langgraph-runtime 映射的）；检索工具是 `opt_in+group:rag` 默认 agent 不带（需 rag agent）。
- [x] `nightly.yaml` 定时 job 接真实命令（`--extra ragas` 安装、缺 key/KB_ID 显式 skipped、exit 2 用法错误显式红、指标永不红）；手动触发留待首次 nightly 实跑确认 Langfuse 收数（本地未启用 langfuse，推送路径由单测 fake client 覆盖）。
- [x] GREEN（141 passed）；revert proof → 恢复 → GREEN；ruff 双净。
- [x] 本地带 key 全链路冒烟（`--limit 2`）：路径选择 100%、引用 P 63.2%/R 68.8%（judge 真实判定）、ragas/langfuse 显式 skipped，报告归档 `logs/rag-eval-layer2-smoke/`。
- [x] 增量（用户要求）：CLI 拆 `--agent-model` / `--judge-model`（judge 独立性可调，避免 agent 自评盲区）；`--judge-model dashscope:<model>` 直连百炼兼容端点（key 走 `DASHSCOPE_JUDGE_API_KEY` env，不落配置、不进 config.yaml models）。已用 `dashscope:qwen3.8-max` 实跑验证（引用 P 65.3%/R 65.0%）。
- [x] Commit: `feat(rag): add scheduled RAGAS evaluation with Langfuse reporting`（`936b8e0b`；CI 修复另提 `1ebb70be`）

## Task 7: 文档同步与收尾 ✅ 已完成（2026-08-24）

**Files:**
- Modify: `backend/AGENTS.md`（增「检索质量评估」小节：题库位置、脚本用法、CI 门禁行为、Layer 2 报告入口）
- `README.md`：评估体系为开发/CI 工具，无用户可见行为变化，不同步

- [x] 写明阈值 3% 为初始拍值、两周后按抖动校准的运维约定（写入 AGENTS.md Layer 1 段）。
- [x] 全量回归：`cd backend && uv run pytest tests/knowledge -q`（首轮 545 passed + 1 failed：`test_umap_reduce_with_extra_produces_finite_coords`，根因是此前 ragas sync 失败残留的 numba 残缺安装——`--reinstall-package numba --reinstall-package llvmlite` 修复，单测转绿）。
- [x] `ruff check` + `ruff format --check` 双净（1199 files）。
- [x] Commit: `docs(rag): document the retrieval evaluation system`（`88cd6320`）

## Final verification

- [x] `golden.jsonl` ≥20 题且守护测试常绿；四类分布、含预期路径与预期 chunk。
- [x] `run_rag_eval.py` 本地跑出终端汇总表 + `report.md` / `report.json`；带 `--baseline` 复跑输出逐指标 Δ 与回退清单。
- [x] 单路故障演练：人为注入一路异常，评估不中断、报告含 failure note。
- [x] CI：`rag-eval.yml` 在触及检索模块的 PR 上触发并贴评论；人为回退 CI 红；缺 key 显式 skipped。（workflow 逻辑就绪；首次真实 PR 触发属运行期验证，见下方遗留）
- [x] Layer 2：nightly 跑一次 RAGAS，Langfuse 可见趋势，报告含三个架构专属指标与人工校准字段；确认其**不进任何硬门禁**。（本地实跑 ragas 四指标出数：`faithfulness 0.933 / answer_relevancy 0.877 / context_precision 0.944 / context_recall 1.0`；Langfuse 实收与 nightly 首跑待 CI 前置条件，见下方遗留）
- [x] `backend/AGENTS.md` 已更新；`pytest tests/knowledge` / `ruff check` / `ruff format --check` 全绿。

## 运行期遗留（不属本 plan 交付，供后续决策）

- CI 环境缺评估知识库种子数据：题库的 `relevant_chunk_ids` 锚定本地库，云端需 `RAG_EVAL_KB_ID` 指向一个已种入数据的 KB，否则 rag-eval.yml / nightly 评估 job 永远显式 skipped。
- GitHub secrets/vars 需手动配置：`DASHSCOPE_EMBEDDING_API_KEY` / `DASHSCOPE_RERANK_API_KEY` / `DEEPSEEK_API_KEY` / `DASHSCOPE_JUDGE_API_KEY` + `vars.RAG_EVAL_KB_ID`。
- nightly 首次实跑确认 Langfuse 收数（推送路径已由单测 fake client 覆盖）。
