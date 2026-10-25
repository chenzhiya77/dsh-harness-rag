# RAG 图谱腿 chunk 级并发 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 每个 Task 走完 RED → GREEN → neuter → revert proof → 门禁 再进下一个；「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-01-rag-graph-extract-concurrency-design.md](../specs/2026-10-01-rag-graph-extract-concurrency-design.md)
**Status:** ✅ **已交付（2026-10-02 收官）** —— Task 0–5 全交付，Task 6 按替代路径关闭（判定 = **甲+wiki 一并钉**：不落思考旋钮，D7 转正为裁定、wiki 生成同裁定不带思考）。复选框 **32/32 全勾**（T6①②③ 为划掉取消 + 勾替代路径关闭）。提交号：Task 0 `f3dc0bb8` / Task 1 `3423f768`+`860410b2` / Task 2 `63645d16` / Task 3 `13a07c5c` / Task 4 `4cf519c8` / Task 5 `98833590` / 收官=本笔。**实测两表**：Task 4 图谱腿墙钟 串行 260–294s → N=8 **64s**（≤90s 过线，双文档 80s≤128s、65 chunk 零 failed）；Task 5 思考 A/B 图谱路 Recall@5 = A 0.725 / B1 0.050（同参截断）/ B2 0.767（+4.6pp=3 题噪声级，成本 4× token·13.6× 单发）。

**Architecture:** `config.yaml → RagConfig.extract_concurrency`（默认 8，`ge=1, le=32`）→ worker 进图谱腿时 `get_app_config()` 现读（`table.card_mode` 先例，热生效）→ `index_document_graph(..., concurrency=N)` → `Semaphore(N) + gather` 并发跑 pending chunks，每 chunk 结果回传统一结算；`extract_graph` 内对 API 级瞬态错误退避重试 2 次后按 chunk 软失败。**除执行顺序（串行→并发）与 D3 的失败面收窄外，语义零变化**。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 | `graph/indexer.py` chunk 循环并发化（结果回传 + 结尾两笔批写不动） | 腿间并行（D6） |
| D2 | `rag.extract_concurrency`（默认 8，实测膝点）+ worker 现读传参 | 代码常量（乙已否） |
| D3 | `extract_graph` 瞬态重试 2 次 + chunk 软失败 | 改 `factory.py:402` 的 `max_retries`；整篇级重试 |
| D4 | gleaning 留 chunk 内串行（一行不动，只在用例里钉住） | gleaning 并行/可配 |
| D5 | — | 实体名 embed 攒批（`indexer.py:166`，二期） |
| D8 | 双库思考 A/B（Task 5，`extract_graph` 的 `llm=` 注入、零产品代码改动）+ 条件旋钮（Task 6） | A/B 常态化；输出瘦身 / `gleaning_rounds` 可配（仍二期待裁） |

## 硭约束

- **断点续跑契约不动**：`pending` 过滤（`indexer.py:132`）与 `extract_status` 逐 chunk 落库是并发化的前提，任何"先聚合再落库"的改法都算违约。
- **进度单调 + 输出保序**：`progress_callback`（`worker.py:348-350`）在并发下必须单调不减、终值 = total；结算按 `pending` 输入序归并，`stats`/落库与串行版逐项含顺序等价（Task 0 ①②）。
- **失败面只收窄不放大**：D3 之后，任何单 chunk 失败（解析失败或瞬态耗尽）只标该 chunk `failed`，不得把整篇文档打成 `failed`。
- **默认值有实测背书**：N=8 的依据是 2026-10-01 真调用三组数据（spec §2）；换端点按 spec §2 公式重推，不许把 8 当真理。
- **A/B 对照变量唯一**（spec §3.6）：双库除 thinking 外逐参相同（同模型/同 N/同 chunker/同 embedding），否则对比无效；B 组慢是预期，不许"优化掉"。

## Task 0 — 开工前核实（4 项，回填结论再开工）

- [x] ① **顺序断言清单**（`tests/knowledge/graph/test_graph_indexer.py` 全 5 用例扫完）：**唯一真顺序断言 = `:185` `stats.failed_chunk_ids == [c1, c2]`**。处置升级：**不改断言，改实现保序**——gather 后按 `pending` 输入序归并结算，输出与串行版**逐项含顺序**等价（契约更强）。其余断言全为计数/集合/sorted/按 key 取值（`test_end_to_end` :126-140/:144-146/:155-157/:166-169；`test_resume` :216-223（单 pending ⇒ `calls[0]` 恒定）；`:240`、`:266-268`）⇒ **全部不动**。桩安全：`_RoutingLLM` 按内容路由、`_StubEmbedder` 确定性 one-hot，均并发安全；⚠️ 并发后 `llm.calls` 顺序不定，新用例断言调用只用计数/集合。
- [x] ② **并发化插入点与收集面**：循环体 `indexer.py:146-178`、结尾批写 `:180-202` 复核无误。三收集点在"每任务返回结算、主协程按 pending 序归并"下与串行逐项等价：`backfill`（dict 按 key 合并）/ `touched_entities`（set 并）/ `stats`（计数 + 保序列表）；`degraded` 在归并后由 `failed/total` 算（`:204`）不变。per-chunk `update_chunk_extract` 是独立行写、乱序无害；`settled += 1` 与 `await _report()` 无让出点竞争、单调成立；结尾两笔批写保持主协程单次执行。SQLite 并发写：`worker_concurrency=2` 今天已跨文档并发写同库 ⇒ 同文档并发不引入新级别，无需额外锁。
- [x] ③ **参数贯通点**：新字段插 `app_config.py:241`（`worker_concurrency`）之后（`extract_rate_limit_rps` 已删、位置确认）；`indexer.py:116` 签名加 `concurrency: int = 1`；调用点 `worker.py:355-367`。**读取=图谱腿入口现读 `get_app_config().rag.extract_concurrency`**（`worker.py:352` 附近；`:518` card_mode 先例、`get_app_config` 已导入）⇒ 热生效、**`app.py:355` 不动**（不经构造器）。`gleaning_rounds` 走构造器（`worker.py:193/206`）与现读策略分属不同参数，确认无冲突。
- [x] ④ **文档/模板落点**：`config.example.yaml:2626`（rag 块 `worker_concurrency: 2` 行后加 `extract_concurrency: 8`）；`backend/AGENTS.md` 两处（`:1230` Ingestion 段补并发句+重推公式+D7 三标准；`:940` Routers 表 rag 配置块清单加 `extract_concurrency`）；`backend/tests/test_rag_config.py` 复用槽位三模式（`test_loads_defaults` :11 / `test_overridable_from_dict` :21 / `test_rejects_invalid_worker_concurrency` :47）。

## Task 1 — 并发化（RED → GREEN）

- [x] **RED① 并发上限生效**：`test_concurrency_bounds_inflight_extractions`（C=12、N=4，桩记录在飞峰值）——今日串行实现下红（3/3 红，`TypeError: unexpected keyword argument 'concurrency'`）。
- [x] **RED② 结果等价**：`test_concurrent_results_match_serial_including_order`——含"完成序≠输入序"前置断言（`坏一` 延迟 0.05s 强制反转）+ `failed_chunk_ids == [c1, c4]` 输入序契约（`:185` 断言不动）。RED 期同 TypeError 红。
- [x] **RED③ 进度单调**：`test_progress_callback_monotonic_under_concurrency`——snapshot 单调不减 + 终值 = total。RED 期同 TypeError 红。
- [x] **GREEN**：`graph/indexer.py` 循环改 `Semaphore(max(1, concurrency)) + gather`（每任务返回 `(kind, chunk_id, names)`、gather 保输入序、主协程按 `pending` 序归并 stats/backfill/touched）；`app_config.py:242` 加 `extract_concurrency`（默认 8，`ge=1, le=32`，描述含重推公式）；worker `:357` 图谱腿入口现读传参（热生效、**`app.py` 零改动**）；`test_rag_config.py` 三处（默认 8 / 覆写 4 / 拒绝 0 与 33）。三条 RED 全绿。**两笔实现期插曲**：① RED 期两条红的根因在桩不在实现（桩无让出点 ⇒ 峰值恒 1；空切片文本缺路由落坏 JSON 默认）——修桩后即绿；② video 8 条**真回归**（测试夹具 `SimpleNamespace` 桩缺新字段 ⇒ `AttributeError`）——按仓库惯例改夹具（`test_worker_pipeline.py:125` / `test_recaption.py:94` 补 `extract_concurrency=1`），非实现防御。
- [x] **neuter①②**：① `Semaphore` 置 1 ⇒ RED① 红（峰值 1）、RED③ 仍绿；RED② 的**前置断言**也红（串行无反转）——原预测"RED② 仍绿"只对契约断言成立，前置断言红属预期（如实登记）；② 归并改 `reversed(outcomes)` ⇒ RED② 红（`failed_chunk_ids` 反序）、RED①③ 仍绿。两项均还原，`grep DEBUG-neuter` 零残留。
- [x] **门禁**：`make lint` 净 + 7 改动文件 `ruff format --check` 净；`tests/knowledge/graph/ + video/ + test_rag_config.py` = **274 passed / 8 skipped**；知识树全量 = **1466 passed / 2 failed / 1 error**，逐条定性：2 failed（`test_embed_missing_api_key` / `test_rerank_missing_api_key`）＝**环境性**（仓库根真实 `rag_config.json`/`models_config.json` 供 key；空配置指针实验下转绿坐实，非回归家族）；1 error（`test_only_dirty_prune_removes_vector_point`）＝**Qdrant 未起**（Docker Desktop 未运行；8 条 `@requires_qdrant` 同因 skip）——**待你起 Docker 后复跑这 9 条**。

## Task 2 — 瞬态兜底（RED → GREEN）

- [x] **RED④ 瞬态软失败**：`_FlakyLLM` 桩（按针前 N 次抛调用级错误、之后放行）三条用例——①`test_transient_llm_error_retries_then_recovers`（第 1 次抛、第 2 次成功 ⇒ chunk 正常 done）②`test_transient_llm_error_soft_fails_chunk_not_document`（连抛 ⇒ chunk `failed` + `error` 有原因、其余 chunk 不受影响、`documents.error` 不动）③`test_transient_llm_error_retry_budget_is_two_retries`（**预算钉**：恰好 3 次尝试后放弃）。RED 期 3/3 红，穿透点=今日整篇打挂路径（`extractor.py` `ainvoke` → gather → worker 外层）。
- [x] **GREEN**：`extractor.py` 加 `ExtractionCallError(ExtractionError)` + `_ainvoke_with_retry`（共 3 次尝试、0.5s×2ⁿ 退避，`embedder_openai.py:198-214` 同风格；首轮与 gleaning **两处** `ainvoke` 调用点都走它）；耗尽后抛 `ExtractionCallError`——**子类**继承 ⇒ 被 `indexer.py` 既有 chunk 级 catch 按「与 `ExtractionError` 同路径」转软失败（`_run_one` / `extract_single_chunk` 零改动 ride-along，`indexer.py` 最终与 HEAD 零差=与 §源文件清单一致：D3 只落 extractor.py）；解析失败（`ExtractionError` 本体）不参与重试、路径不动。3 条转绿。
- [x] **neuter③**：①`_RETRIES=0`（去重试）⇒ RED④ 前半红（无恢复）、**后半仍绿**（软失败不依赖重试）✓计划原文；②chunk 级 catch 改 `raise` ⇒ RED④ 后半红（整篇打挂）、前半仍绿 ✓计划原文。**如实登记**：预算钉③在两个 neuter 下都红（它同时钉重试次数与软失败落地）——计划原文只预测 RED④ 两半的分布。两项均还原，`grep DEBUG-neuter` 零残留。
- [x] **门禁**：`make lint` 净 + 3 改动文件 `ruff format --check` 净；**影响集复跑 = 277 passed / 8 skipped**（对记录基线 274/8 差额恰为新 3 条、skip 数一致 ⇒ 零回归）；`tests/knowledge/ + test_rag_config.py` 全套 = **1413 passed / 50 skipped / 2 failed / 1 error**：50 条 skip 全部「Qdrant not reachable」（Docker 未起，含上框那 9 条待复跑名单在内）；2 failed（`test_embed_missing_api_key` / `test_rerank_missing_api_key`）+ 1 error（`test_only_dirty_prune_removes_vector_point`）＝Task 1 已定性的三条**环境红**（空配置指针实验坐实 / Qdrant 未起），**无新增红**。**口径注记**：上文 Task 1「知识树全量 1466 passed」与本次 collected=1466 同数异义（本次=1413+50+2+1，其中 knowledge 树 1440 条 + `test_rag_config.py` 26 条；knowledge 树较 Task 1 时恰 +3=本框新增用例，收集面别无变化）——判为 collected 口径误记，非回归；若要钉死可跑 HEAD worktree A/B 全量双向 diff。

## Task 3 — 文档与模板（同批，不另起）

- [x] `backend/AGENTS.md` **两处**（比框里多一处=spec §6 说的「旋钮表」）：`:1230` Ingestion 补并发句（`rag.extract_concurrency` 默认 8=实测膝点）+ 换端点重推公式（`N = min((RPM/60)*T, (TPM*T)/(60*K), 文档粒度)`，T/K 定义随附）+ 瞬态软失败句（重试 2 次后切片 `extract_status=failed`、文档不打挂）+ D7 选型三标准（不带思考/严格 JSON 遵从/解码快）；`:940` 路由表 `Requires the rag: config block` 清单补 `extract_concurrency`。
- [x] `config.example.yaml` rag 块 `:2627-2629`：`worker_concurrency: 2` 正下方补 2 行注释 + `extract_concurrency: 8`。**`config_version` 不再抬**：42→43 台阶（`3423f768`）已覆盖本对全部 schema 变更（Task 1 加键 + Task 3 补模板同一台阶），模板测试只钉 `version >= 42`，再抬 44 只会多发一次过期告警。
- [x] **spec §6 影响面核对 = 逐条一致、零更正**：源文件 3 个+worker 传参一处 ✓（Task 1/2 实际生产改动恰为 `graph/indexer.py`/`graph/extractor.py`/`config/app_config.py`+`worker.py`，测试与 plan 不计「源文件」）；配置键 1 个 `rag.extract_concurrency` ✓；「`config.example.yaml` rag 块与 `backend/AGENTS.md` 旋钮表同步」由本 Task 完成 ✓；对外 API、表结构、Qdrant、检索三路零变化 ✓（无 router/migration/检索代码改动）。**门禁**：模板三套件 = 48 passed / 1 failed——那条 `test_config_version.py::test_version_26_config_upgrades_to_checkpoint_channel_mode` 为**已定性环境红**（`execvpe(/bin/bash) failed`，WSL relay 跑不了升级脚本，subprocess 启动即挂、与本次编辑无关；模板解析与 version 读数 43 正常）；prettier 双文件 flag 均为**存量债**（AGENTS.md 106 hunk / config.example.yaml 各 hunk 与 HEAD 逐一同集合 ⇒ 零新债，行号交集法复核我新增行不进「想改」集合）。

## Task 4 — 真栈验收（前后对照，回填真实数字）

- [x] 前测基线：13 chunk 夹具（`chunk_markdown` 校准恰 13 片 / 865–958 token/片，markdown 直入免 MinerU）以 **`extract_concurrency: 1`** 重传——与"未并发化"串行代码调用序逐拍等价（Task 0/1 已证有序归并同序），图谱腿墙钟 = **260s**（00:44:37 首抽发出 → 00:48:57 归并收尾；26 LLM = 13×(抽取+1 轮 gleaning) + 13 实体嵌入，日志逐拍全序无并发）。**意外复测**：后测首跑因 `cp` 落错目录（bash cwd 漂到 `backend/`，还原写进 `backend/config.yaml`）实际仍跑在 N=1，白得第二条串行样本 = **294s** ⇒ 串行带 **260–294s**，与框内 ~290s 预期相符。口径=图谱腿首抽发出→归并/入库收尾，全部跑次同仪器（`gateway.log` 逐请求时间戳 + poller 秒级 progress 序列）。
- [x] 后测：同夹具同法重传（键缺省走 Field default=8；热重载由日志 `Config file has been modified … reloading AppConfig` 01:05:55 坐实），图谱腿墙钟 = **64s**（01:06:01 → 01:07:04）**≤ 90s 验收线 ⇒ PASS**，较串行带 **4.1–4.6×**。曲线呈并发特征：progress 17.5s 内 0→61（分批落 7/23/30/46/61），串行复测则每 ~22.6s 单步 1 片；首波 8 发 LLM 在 01:06:05–08 同秒簇内返回。
- [x] 失败面核对：五跑（260s / 294s / 64s / 双文档 2 篇）合计 **65 chunk 全 `extract_status=done`、0 failed** ⇒ 并发不新增失败 ✓。
- [x] 双文档并发（`worker_concurrency=2`）：两篇 0.12s 内先后上传、同批入队，双跑总时长 = **80s**（01:19:02 同批起跑 → 01:20:22 双图谱腿收尾）**不劣于两篇串行之和 128s（2×64s）** ✓；分篇图谱腿 64s / 74s（重叠执行，单篇腿长与独跑 64s 同级，与 burst8/16 通量持平的膝点结论一致）；`progress_percent` 双序列各 70 点 **0→100 全单调** ✓。**过程发现（如实登记，非本对回归）**：百科腿在信号量内跑完才放槽（`worker.py:357` 起整段持槽含 `_maybe_generate_wiki`），前序文档的两次百科生成把 2 槽占满 ⇒ 新传双篇排队、不并发；处置=按原命令行重启网关，`recover()` 自动重入双篇（日志 `re-enqueued 2 non-terminal document(s)`），双篇即同批并发——本框数据取自重启后干净窗口。此发现顺带坐实「文档 status 转 ready 时百科腿仍在槽内跑」的既有行为，是否要把百科腿挪出槽是**另一条待办线**，不在本对范围。
- [x] 真栈收尾：`config.yaml` 逐字节还原（md5 `073c322160072eba5155bb23c18168b8` 与改动前备份一致，`extract_concurrency` 键已除、默认 8 生效）；临时库 `T4-acceptance`（5 篇文档）DELETE 204 级联清理；探针脚本零残留（仓库 `git status` 无一行为本 Task 产物，`_t_probe.py` 时代已删；本轮仪器 poller/夹具/配置备份/日志副本全在仓外 `E:\app-model\deer-flow-scratch\task4\`）。**残余两件待知悉**：① 验收注册账号 `rag-task4-acceptance@example.com` 仍在本机 users 表（cookies 同上 scratch 目录）；② 网关 01:19 被我按原命令行重启（现仍运行，原日志已留副本 `gateway-runAB.log`）。

## Task 5 — 思考 A/B（D8，并入本对；零产品代码改动）

- [x] **A/B① 对照准备**：测试文档集=golden 锚定的 4 篇 Java docx（39 chunk：基础11/集合6/并发13/JVM9，从库内 `测试1` 原 chunk 逐字复制）；**golden 口径偏差（如实登记）**：`chunk_id` 是 chunks 全局 PK 且 Qdrant point id 只由 `chunk_id` 派生 ⇒ 两库不可能共享同一 id 空间（连源库行都占着），golden 改用**派生件**（`golden-{A,B,B2}.jsonl`）——20 问逐字同、仅 `relevant_chunk_ids` 前缀按各库 doc_id 机械平移，top-k=5 同。驱动脚本 `ab_build.py` 走 `index_document_graph(llm=...)` 注入（与 `extract_graph(llm=...)` 同一注入面，多带向量腿/图谱腿全套入库），CountingLLM 包装器记 token/墙钟/reasoning 证据；**条目实测纠偏**：计划点名的 A/B 同条目若用生产抽取条目 `qwen3.8-flash` 是**空对照**——该条目无 thinking 形态，`thinking_enabled=True` 线上不发任何参数（factory 只对有 `when_thinking_*` 的条目动手）⇒ 改用 `deepseek-v4-flash`（唯一双形态条目，`when_thinking_enabled/disabled` 双向显式发），smoke 实测 wire 差异真实存在（thinking=off 0 reasoning token / on 31+ reasoning token 且带 `reasoning_content`）。脚本与报告全在仓外 `E:\app-model\deer-flow-scratch\task5\`，不入产品代码。
- [x] **A/B② A 组入库**（思考关＝现状口径，`deepseek-v4-flash`，max_tokens 8192 条目原值）：39/39 done、0 failed；**成本账**：78 调用（39×(抽取+1 轮 gleaning)）、prompt 150.6K / completion 77.5K token、reasoning 0、调用墙钟合计 253s（中位 2.61s/发）、图谱腿合计 188s；图谱产出 **747 实体 / 867 关系**。
- [x] **A/B③ B 组入库**（思考开）：**拆成两列防混淆——B1=同参直开（max_tokens 8192 不动）/ B2=开思考+给足输出预算（32768）**。B1：**35/39 chunk 截断失败**（`Unterminated string…`=思考吃光 8192 预算、JSON 被切，gleaning 只跑了 4 片 ⇒ 43 调用）、图谱只剩 76 实体/98 关系、reasoning 302K、中位 29.9s/发——**「旋钮开了就坏」的现实列**。B2：39/39 done、78 调用、prompt 223.1K / completion 738.2K（**reasoning 602K**）、调用墙钟合计 2534s（中位 35.4s/发、max 58.5s）、图谱腿合计 725s、**1391 实体 / 2272 关系**——预期「慢 ~2.5×」实测 **13.6×**（更慢），token 贵在 completion 9.5×（对预期 2–17× 带内）。
- [x] **A/B④ 双跑 Layer-1**（`run_rag_eval.py`，同 golden 派生件、同 top-k=5；**per-path Recall@5 / Hit@5，n=20**）：

  | 组 | 配置 | vector R@5 | **graph R@5**（fact/rel/concept/global） | graph Hit@5 | wiki |
  |---|---|---|---|---|---|
  | A | 思考关 | 0.883 | **0.725**（1.00/0.80/0.80/0.30） | 0.750 | 0（双侧都不建，D8 口径只抽图谱） |
  | B1 | 思考开·8192 预算 | 0.883 | **0.050**（0.00/0.20/0.00/0.00） | 0.050 | 0 |
  | B2 | 思考开·32K 预算 | 0.883 | **0.767**（1.00/0.80/1.00/0.27） | 0.800 | 0 |

  向量路三组逐位相同（0.883/0.90）=**对照干净**，差异全部落在图谱路。**口径二（剔除 2 题无标注的 global 问，n=18）**：A=0.806 / B2=0.852 ⇒ **+4.6pp**，但逐题 diff 只 **3 题翻转**（q013 concept 0→1、q019 global 0→0.33、q018 global 0.5→0 **反跌**）——2 涨 1 跌、单题粒度=5.6pp，点估计过 3pp 线而**稳健性=单题噪声级**。同批发现：`graph_search` 查询侧实体抽取偶发 malformed JSON（A/B 各 2–3 例，双侧对称、压低绝对值但不影响对比）；q013 单题翻转提示「思考可能帮概念类抽取」——1 题证据，要判 category 差异得先扩 golden。
- [x] **A/B⑤ 判定交拍**：对比表已交用户（2026-10-02）：**我的判读=不值得现在落旋钮**（门槛本意是稳健提升；+4.6pp 由 3 题翻转构成、其中 1 题反跌，撑不起 4× token / 13.6× 单发时延；且 B1 列显示直开思考在条目原预算下会把图谱打穿）。**结构性前提**：生产的 `qwen3.8-flash` 条目无 thinking 形态 ⇒ `rag.extract_thinking` 旋钮在今天配置上是**空转**，只对 thinking-capable 条目有意义——落法若走旋钮必须连带「换条目+预算随思考抬」两件。**判定已拍（2026-10-02）= 甲 + wiki 一并钉**：不落旋钮，D7 从"约定"转正为"裁定"、**wiki 生成同裁定不带思考**；结论已回写 spec D8（§3.6 结论块）。

## Task 6 — （条件任务，仅 A/B 判定"值得"时执行）思考旋钮

- [x] ~~**T6①** `rag.extract_thinking` 新键（默认 false）+ `get_extract_llm` 传参一行（`extractor.py:125` 处把开关透传 `create_chat_model`）~~ **已取消**（2026-10-02 判定甲+wiki：不落旋钮；替代=D7 转正裁定 + wiki 一并钉，见 spec §3.6 结论）。
- [x] ~~**T6②** 用例：开/关两态构造断言（请求体 `thinking:{type:enabled/disabled}` 各钉一条）+ `test_rag_config.py` 键校验~~ **已取消**（同上）。
- [x] ~~**T6③** 文档三处（AGENTS.md / config.example.yaml / spec 回写"已交付"）~~ **已取消**（同上；文档侧改由 spec D8 结论块承担）。
- [x] **T6 替代路径**：**不值得，D7 转正**——2026-10-02 判定**甲+wiki 一并钉**：不补 `rag.extract_thinking`，D7「抽取不带思考」从约定升格为裁定，**wiki 生成（`wiki_model` 腿）同裁定不带思考**；市场对照同向（LightRAG/Graphiti/GraphRAG 全部抽取与摘要走非思考快模型，全行业无抽取思考开关先例）。

## 交付回写

- [x] 完成后回写本文件 Status（提交号 + 复选框计数 + 实测表），并同步 spec Status 行一句"已交付"（本笔完成）。
