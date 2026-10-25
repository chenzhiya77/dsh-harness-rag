# RAG 重试与就绪判定对齐 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-04-rag-retry-and-ready-verdict-design.md](../specs/2026-10-04-rag-retry-and-ready-verdict-design.md)
**Status:** ✅ **全交付（2026-10-04）**——D1–D3 全裁=甲；Task 0–5 完成，实测逐段回填；提交链见文末。
**Architecture:** worker 终态判定改「vector 完整性」（`indexed == total`）；router 重试门加「degraded」判定（配 TS 侧同款 helper）；worker 加 per-doc 在途合并（镜像 wiki runner 先例）；后端 TDD 翻面一只既有用例 + 补矩阵，前端两处入口放宽，真栈按 A3 验收。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 降级重试范围 | ✅ 已裁=甲：任一腿 `degraded` | 图谱腿独立重跑入口 |
| D2 UI 入口形态 | ✅ 已裁=甲：状态格悬停卡复用失败卡 | 操作列新增按钮 |
| D3 防重入机制 | ✅ 已裁=甲：worker 在途合并 | 处理代次字段/条件写表结构 |
| 就绪判定收紧 | 定案（spec §2.1 矩阵；翻面 `test_worker.py:374-387`） | 检索侧状态门/原子发布 |

## 硬约束

- 不加 `degraded` 状态枚举；检索侧零改动（无门）；失败文档半截切片保留可检索，不得清理。
- 翻面用例一处（`test_worker.py:374-387`）；其余四处为守护行（`test_api.py:686`、`document-panel.dom.test.tsx:399`、`hooks.dom.test.tsx:117,190`）——行为不变、须保持绿。
- 改写产物只在本对涉及面；`chunk_count = indexed` 语义保持。

## Task 0 — 落点核实 ✅

- [x] ① 行号零漂移核对：15 处锚全零漂移（`knowledge_bases.py:246-247`、`knowledge_service.py:486-512`、`worker.py:283-284/302-308/387-389/417-421/495/500-505/579-587`、`indexer.py:65-97`、`store.py:32-34/199-201`、`document-panel.tsx:316-341/1041-1046`）；受害面复核＝翻面×1（`test_worker.py:374-387`）＋守护×4（`test_api.py:686`、`document-panel.dom.test.tsx:399`、`hooks.dom.test.tsx:117,190`）。
- [x] ② 零切片可达性实测：文本路径**不可达**（10/10 最小样本均 ≥1 切片）；视频「全空镜头」路径**可达**（`worker.py:820-839` 全 continue ⇒ `chunk_rows=[]`；`test_worker_pipeline.py:404` 只覆盖部分空）⇒ Task 1 该用例走视频全空夹具。
- [x] ③ worker 并发结构确认：`_dispatch_loop`→`_run_guarded`（`_sem`）→`process_document`；`submit` 调用面＝upload/retry/`recover()`（recaption 走独立口）；D3 合并检查点须置于 `_run_guarded` 首个 await 之前（同刻入档竞态）。
- [x] ④ 门禁基线（2026-10-04）：后端 knowledge 面 **1506 passed / 4 failed / 2 skipped / 417s**——4 红全为在案环境账（缺 key 对 `test_embed_missing_api_key`/`test_rerank_missing_api_key`＋解析器对 `test_parse_pdf_full_flow`/`test_token_read_from_env_never_from_caller`＝本机真实 MinerU token）；前端基线随 Task 3 首跑记录（见文末尾注）。

## Task 1 — 后端 TDD：就绪判定收紧 ✅

- [x] RED：判定矩阵用例（全成→`ready`；部分→`failed`（error=N/M）；全败→`failed`；零切片→`failed`——用例走**视频全空镜头夹具**，文本路径实测不可达）＋翻面 `test_worker.py:374-387`（软失败文档 `ready`→`failed`，docstring 同步重写）；error 文案两条（索引不完整/无可索引内容）覆盖断言；neuter 预演。**实测：新 2 例（`test_vector_partial_index_fails_document_and_keeps_indexed_chunks`、`test_video_all_empty_shots_fail_as_no_indexable_content`）＋翻面 1 例（`_FailingEmbedder` docstring 同步）⇒ 恰 3 红 / 57 绿。**
- [x] GREEN：`worker.py:417-421` 改 `done ⟺ total > 0 且 indexed == total`；`:495` 终态改「`vector == "done"` → `ready`，否则 `failed` + error 文案」；确保不遮蔽 caption/graph 子标记（追加式子标记，不整体覆写）。**实测：60 绿；文案落 `向量索引不完整：N/M 切片未入库` / `无可索引内容：文档未产生任何可索引切片`（replace 同族前缀刷新）。**
- [x] neuter：①还原 vector 判定 ⇒ 恰红（部分/全败族）；②还原终态 ⇒ 恰红（软失败族）；还原复绿。**实测：① 1 红；② 3 红；还原 60 绿。**
- [x] 门禁：knowledge 面全量 + ruff check/format 双净。**实测并入 Task 2 合并树段（同一棵树一次跑全）。**

## Task 2 — 后端 TDD：降级可重试 + 幂等 ✅

- [x] RED：router 门用例（caption `degraded`→202；graph `degraded`→202（D1=甲）；`processing`/干净 `ready`→409 新文案）；`test_api.py:686` 翻面；幂等族（并发双提交单跑、重试受理中删除不复活/无僵尸、重试后旧向量残留 0、受理序=先删向量后入队）。**实测：`test_retry_degraded_document_wipes_and_reenqueues`／`test_retry_graph_degraded_document_is_allowed`／`test_retry_processing_document_conflicts_with_new_copy`／`test_duplicate_submits_coalesce_into_serial_rerun` ⇒ 4 红；守护 2 绿；守卫末条与守护行等价、按审查改判不翻面（`test_api.py:686`＝`test_retry_non_failed_document_conflicts` 保持绿）。**
- [x] GREEN：`knowledge_bases.py:246-247` 门 + 降级判定 helper（后端一处、文档口径 spec §2.2）；D3=甲 在途合并 + 收尾补跑落 `worker.py`。**实测：retry 族 6 绿；`_run_guarded` 判档在任何 await 之前；`has_degraded_leg` 为唯一判定源（router 与服务共用）。**
- [x] neuter/复绿；门禁同 Task 1。**实测：① router 还原 ⇒ 3 红；② worker 合并还原 ⇒ 1 红；还原复绿；`test_api.py`+`test_worker.py` 98 绿。**
- [x] 补口（真栈验收前置，2026-10-04）：视频重试走 resume 路、只补跑 pending 镜头 ⇒ 受理翻无图说镜头（`failed`/`empty`）回 `pending`（spec §2.2 修订）：`test_retry_video_document_requeues_captionless_shots`（RED 1 红 → GREEN；empty 分支 neuter ⇒ 恰 1 红）；受理后删除窗口 `test_worker_noops_when_document_deleted_after_retry_acceptance`（spec §4.3 第三项）。recaption / citations 两套 21 绿零回归。
- [x] 门禁（合并树）：knowledge 面全量 **1512 passed / 4 failed / 2 skipped / 470.55s**（4 红全为在案环境账；另有一次 1507/5 中的第 5 红＝已登记图谱并发 flake，单跑复绿）；**ruff check `All checks passed!` + ruff format `1314 files already formatted`。补口后终态（含 2 个新用例）：1514 passed / 4 failed / 2 skipped / 401.58s，ruff 同双净。**

## Task 3 — 前端：降级重试入口 ✅

- [x] RED：`document-panel.dom.test.tsx` 增降级行用例（D2=甲 形态：悬停卡含降级说明+重试按钮+breakdown 行）+ 干净行仍 Tooltip + 失败态零回归；`hooks.dom.test.tsx` 重试流补降级。**实测：dom 3 红（降级悬停卡／降级右键重试／降级窄列重试）＋ `doc-errors.test.ts` 2 红（新 kind）＝ 恰 5 红 / 108 绿（hooks 新例与干净行守护当场绿）。**
- [x] GREEN：`document-panel.tsx` 两处入口放宽（TS 侧 `hasDegradedLeg` helper）；降级卡**独立文案分支**（不点名具体腿、不走 `classifyDocError`，zh/en）；失败侧 `classifyDocError` 加 pattern/kind + `docErrors` i18n（zh/en）覆盖新 error 文案。**实测：113 绿；终态结论文优先于既有腿标记（spec §2.5 修订）；降级卡文案 zh=「部分产物未成功，可重试补齐」/ en 同步。**
- [x] `pnpm check` 零诊断 + 前端全量绿（前端基线数字一并记入 Task 0 ④ 尾注）。**实测：首跑 3 处 `DocumentPathStatus` 必填键修正后 `pnpm check` 零诊断；前端全量 247 文件 / 2796 例全绿（见尾注）。**

## Task 4 — 文档 + 收尾 ✅

- [x] `backend/AGENTS.md` 增补：索引完整性=就绪前提、降级可重试（视频镜头翻 pending）、worker 提交合并、检索侧无状态门（新「Retry & readiness verdicts」段）；路由表 retry 行改「failed or degraded」。
- [x] spec 状态行回填 + 本 plan 实测回填；RFC §5.2 表行 1–4、A3/A4/A8 → 用例编号映射表（见下）。
- [x] 提交链回填（按仓库惯例逐 Task 提交）：见下「提交链」。

## Task 5 — 真栈端到端验收（A3）✅

- [x] 隔离实例（`DEER_FLOW_CONFIG_PATH` / `MODELS_CONFIG_PATH` / `RAG_CONFIG_PATH` / `EXTENSIONS_CONFIG_PATH` / `HOME` / `PROJECT_ROOT` 六变量指仓外 scratch + `AUTH_DISABLED=1`；recorder :8098 三形状桩［chat/completions、DashScope 原生 embed、openai-audio ASR］；第二 Qdrant 容器 :6399 宽度 8；Gateway :8099；夹具＝ffmpeg 两场 6s mp4；零出网、真配置 md5 全程未变 `config.yaml 073c32…`/`models_config.json a6b98a…`）：**阶段一**（recorder 对 `rec-vlm` 全 500）上传 202 ⇒ 文档 **ready** + `caption=degraded`（asr/segment/vector/graph 全 done、chunk_count=2、error=null）；**恢复→整篇重试**：首击 **202**、同点第二击 **409**（"Only failed or degraded documents can be retried"）；**阶段二**文档 **ready** + `caption=done`、**两个镜头卡正文均含阶段二配文**、文档 ID 不变。
- [x] 重复点击重试不双跑（提交计数/日志为证）；重试受理中删除交错一相（可选）。**实测：第二击 409（两次运行复现）×＋recorder 阶段二 `rec-vlm 200` 恰 2 次（=2 镜头，双跑会翻倍）；embed 2 批 / extract 8 次（2 切片×2 趟）/ ASR 仅首趟 1 次（resume 不重跑）＝单跑与 resume 语义为证。**「受理中删除」交错相改由单测钉住（`test_worker_noops_when_document_deleted_after_retry_acceptance`），真栈不做可选相。
- [x] 收尾：临时库/进程/文件逐项清理并核验。**实测：gateway/recorder 进程杀净（:8099/:8098 释放）、`kb-scratch-qdrant` 容器删除（:6399 释放）、scratch 目录删净。**

## RFC 对齐映射表（spec §4 第 8 条）

| RFC §5.2 表行 / A 锚 | 落点用例 |
| --- | --- |
| 表行 1（受理中停旧产物、同一文档不重复启动重试） | `test_retry_processing_document_conflicts_with_new_copy`（409 新文案）＋ `test_duplicate_submits_coalesce_into_serial_rerun`（worker 合并）＋ 真栈同点第二击 409 |
| 表行 2（完整成功→发布新产物） | `test_pipeline_advances_status_machine_to_ready`（既有）＋ 真栈阶段二 |
| 表行 3（仍有图说失败但正文/索引完整→降级标记、允许再重试） | caption 降级族（`test_worker.py` caption lifecycle 既有）＋ `test_retry_degraded_document_wipes_and_reenqueues` ＋ `test_retry_graph_degraded_document_is_allowed` ＋ 真栈阶段一 |
| 表行 4（解析失败/无可索引内容/索引不完整→保持失败、允许再重试） | 翻面 `test_path_status_vector_failed_when_embed_soft_fails` ＋ `test_vector_partial_index_fails_document_and_keeps_indexed_chunks` ＋ `test_video_all_empty_shots_fail_as_no_indexable_content` |
| A3（VLM 降级可见；恢复后保留 ID 整篇重试补齐图片内容） | 真栈验收（Task 5 实测）＋ `test_retry_video_document_requeues_captionless_shots` |
| A4（最小 UI：失败/降级重试） | `document-panel.dom.test.tsx` 降级三例 + 干净行边界 + `hooks.dom.test.tsx` 降级续流 |
| A8（失败/降级均可重试且 ID 不变；不重复或混用旧产物） | Task 2 幂等族（wipes 顺序／coalesce／删除窗口）＋ 真栈 ID 不变与单跑计数 |

## 提交链

| Task | 提交 | 内容 |
| --- | --- | --- |
| Task 1 | `ed6847975` | feat(rag): fail documents whose vector index is incomplete |
| Task 2 | `7de49b9dc` | feat(rag): allow retrying degraded documents, coalesce duplicate submits |
| Task 3 | `8fbf5d26a` | feat(rag): offer retry on degraded documents in the panel |
| Task 4 | 本笔（docs/rag） | AGENTS.md + spec 状态行与两处修订 + 本 plan 回填 |

> 本笔不含 Task 5 的代码改动（无）；真栈验收记录在上表 Task 5 段。§4 跨库切片隔离改动为并行线在途产物（`store.py`/`knowledge_bases.py` 的 `get_chunks_by_ids` 系），本链未夹带。

## Task 0 ④ 尾注 — 前端基线（Task 3 首跑，2026-10-04）

前端全量基线：**247 文件 / 2796 例全绿**（`pnpm test run`，2m35s）。
