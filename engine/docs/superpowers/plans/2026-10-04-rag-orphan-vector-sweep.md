# RAG 孤儿向量对账清扫 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-04-rag-orphan-vector-sweep-design.md](../specs/2026-10-04-rag-orphan-vector-sweep-design.md)
**Status:** ✅ **全交付（2026-10-05）**——D1–D4 全裁（甲/甲/乙/甲）；Task 0–3 完成，Task 4 随本笔收口；提交链见文末。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 清扫范围 | ✅ 已裁=甲：四集合全扫 | 检索侧读取守卫 |
| D2 触发方式 | ✅ 已裁=甲：启动 jitter 一次 + 周期（默认开，24h） | 前端与手动入口 |
| D3 并发姿态 | ✅ 已裁=乙：该库无在飞、无迁移才跑 | — |
| D4 可观测 | ✅ 已裁=甲：仅日志 | 状态查询接口 |

## 硬约束

- 只删 Qdrant 点；业务行/文件不动；不新增持久记录；幂等可重复；检索/写入路径零改动。
- 清扫实现放 `deerflow.knowledge`（harness 层），复用 `KnowledgeVectorStore` 既有删除方法；不碰 `app.*`。

## Task 0 — 落点核实 ✅

- [x] ① 写序四路（已核）：chunks / entities / wiki = 行先行（`worker.py:664→439`、`graph/indexer.py:177→213`、`wiki/generator.py:299→302`）；cards = 创建向量先行（`knowledge_service.py:941-950`，embed→upsert→insert）。**实测：12 组锚全部零漂移。**
- [x] ② 点键与载荷（已核）：`scroll_collection(collection_name, kb_id)` 按 kb 过滤滚动（`vector_store.py:495-524`，payload 全带、内部分页）；复用删除方法 = `delete_chunks` / `delete_entities` / `delete_wiki_entries` / `delete_manual_cards`（`:482/330/370/559`），分别按 (kb,name)/(kb,title)/point-id 过滤，与 payload 键一一对应。**实测：`delete_by_doc failed during retry` 锚 `:504` ✓。**
- [x] ③ 并发面（已定）：闸输入 =（a）逐库：worker busy-kb 集合——**现无**（`_active`/`_pending` 仅 doc_id，`worker.py:229-230`），Task 2 给 worker 加结构化 `_busy_kbs` 并暴露 `busy_kb_ids()`（不用"查行反推"，避免文档被删后误判空闲）；wiki 腿并入 `wiki_generation_in_progress(kb_id)`（`wiki/generator.py:69`）；（b）全局：`dimension_migration.migration_in_progress()`（`dimension_migration.py:80`）为真则整轮跳过。**挂靠宿主 = `KnowledgeIndexWorker.start()/stop()`**（`app.py:366` 已在 lifespan 起停；sweep 作为 worker 自己的后台任务，与其生命周期一致）。**实测：`_queue`:215 / `_inflight`:217 / `start`:234 / `stop`:275。**
- [x] ④ 基线与成本（实测 2026-10-04，Qdrant :6333 在线）：全量四集合 = chunks 123 / entities 1335 / wiki 268 / cards 3（共 1729 点）；5 库中最大 = 测试1（67/736/142/3）。一圈滚动请求量 = Σceil(count/512) ≈ **6 次 scroll + 1729 次业务行回查（分批）——近零成本**。观察项：Qdrant 里有数十个测试遗留集合（`test_*`/`testt*`）与一个空库「测试3」（四集合全 0）；清扫只扫本部署四集合，不触它们。

## Task 1 — 核心清扫（TDD）✅

- [x] RED：四集合孤儿→消失；正常点全保留；单集合失败（scroll 与 delete 两形态）续跑；候选复核（收集后出现业务行→不删）；幂等（二跑零删除）。**实测：先落 `tests/knowledge/test_sweep.py`（5 例）⇒ 收集期 ImportError = 恰红。**
- [x] GREEN：`knowledge/sweep.py`：按库滚动↔对账↔两段式（收集候选→复核→批量删点）；`sweep_library(*, store, vector_store, graph_store, wiki_store, kb_id) -> SweepReport`（`scanned`/`deleted`/`skipped`/`failed`，集合键恒满）。**实测：5 passed / 14.06s。**
- [x] neuter：① 关两段式复核（chunks 候选直删）⇒ **恰 1 红**（候选复核例）；② 判据恒活（`_existing_chunk_ids` 返回全量）⇒ **5 红**（全部孤儿断言）；还原**复绿 5 passed**。
- [x] 门禁：knowledge 面全量 + ruff 双净。**实测：1532 passed / 4 failed / 2 skipped / 388.74s；4 红全为在案环境账（缺 key 对 `test_embed_missing_api_key`/`test_rerank_missing_api_key`＋解析器对 `test_parse_pdf_full_flow`/`test_token_read_from_env_never_from_caller`）；ruff check + format 双净。**
- [x] 实测回填（2026-10-05）。

## Task 2 — 触发接线（D2=甲：启动+周期；D3=乙：空闲闸）✅

- [x] 启动 jitter（≤600s）+ 周期循环挂 `KnowledgeIndexWorker.start()/stop()`（`_sweep_task`，name=`knowledge-orphan-sweep`）；worker 加结构化 `_busy_kbs`（文档腿 `_run_guarded`、recaption 腿 `_run_recaption_guarded` 增删）并暴露 `busy_kb_ids()`（∪ `_wiki_busy`）；`sweep_enabled` / `sweep_interval_hours` 进 `RagConfig`（默认 true / 24h；`config.example.yaml` 同步、`config_version` 43→44）；`app.py` 生命周期传参；守卫 = `busy_kb_ids()` ∪ `wiki_generation_in_progress(kb_id)`（逐库）+ `migration_in_progress()`（全局整轮跳过）。**实测：忙库登记在等槽位前完成（排队中的一跑也算忙）。**
- [x] 用例：开关关→不调度（`_sweep_task is None`）；守卫命中→跳过（忙库 / wiki 腿 / 迁移三态）；全空闲→恰扫一次；`busy_kb_ids()` 两腿并集。**实测：RED 3 红（TypeError）→ GREEN 8 passed / 14.56s；neuter 去忙库闸 ⇒ 恰 1 红 → 还原复绿。**
- [x] 门禁：knowledge 面全量 **1535 passed / 4 failed / 2 skipped / 486.79s**（4 红逐名等于在案环境账，无新增）；配置三件 77 passed / 2 failed（环境账：本机真实 models 配置混入）；ruff 4 文件双净。
- [x] 实测回填（2026-10-05）。

## Task 3 — 真栈验收 ✅

- [x] 隔离实例（第二 Qdrant 容器 `kb-sweep-qdrant` :6399 + scratch sqlite/文件；零出网；直调 `sweep_library`）：种子 2 点 → **docker stop** → 删 victim 文档（级联 True，stderr 有预期的 `qdrant delete_by_doc failed` 吞错记录）→ **docker start** → 残留仍 2 点（victim 点独存）→ 清扫恰删 1 点 → 收于 1 点（仅 `doc-live#0000`）；victim 业务行已无、live 切片行原样。**实测 `E2E OK`**：`{"points_seeded":2,"points_after_delete_with_qdrant_down":2,"sweep_report_deleted":{"chunks":1,"entities":0,"wiki_entries":0,"manual_cards":0},"points_after_sweep":1,"remaining_chunk_points":["doc-live#0000"],"victim_doc_row":null,"live_doc_chunks_in_db":1}`。
- [x] 收尾：容器 `kb-sweep-qdrant` 已删、scratch 目录已删净、:6399 已关闭（逐项核验）。

## Task 4 — 文档与收尾 ✅

- [x] spec 状态行回填（全交付 + plan 链接）；本文实测回填；`backend/AGENTS.md` knowledge 段补「Orphan-vector sweep」一条；RFC §5.3 条目 2 尾补一句——「遗留的孤儿向量由后台对账清扫回收」（落点由 §6.x 改到 §5.3：行为归属更准）。
- [x] 提交链回填（见下表）。

## 提交链

| Task | 提交 | 内容 |
| --- | --- | --- |
| 对（草稿+Task 0 回填） | `f0f163ee0` | docs(rag): draft the orphan-vector sweep spec and plan |
| Task 1 | `33d661d38` | feat(rag): add the orphan-vector reconciliation sweep（核心 + 5 用例 + plan 回填） |
| Task 2 | `e930fd3b1` | feat(rag): run the orphan sweep from the knowledge worker（接线 + 守卫 + 配置 + 3 用例 + plan 回填） |
| Task 3–4 | `6fe1eacd4` | docs(rag): close out the orphan-vector sweep pair（真栈记录 + 状态行 + AGENTS.md + RFC 一句） |
