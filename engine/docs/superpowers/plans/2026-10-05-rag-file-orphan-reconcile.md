# RAG 清扫轮盲区收口 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-05-rag-file-orphan-reconcile-design.md](../specs/2026-10-05-rag-file-orphan-reconcile-design.md)
**Status:** ✅ 全交付（2026-10-05）：D1–D6 全甲；Task 0–5 完成（真栈 17/17；门禁 1561/4/2 零新增）；提交链见 Task 5。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 两层 | ✅ 已裁=甲：异常即清 + 对账清扫 | 上传管线重构 |
| D2 落点 | ✅ 已裁=甲：并入清扫轮（`data_dir` 传 worker） | 独立目录任务 |
| D3 范围 | ✅ 已裁=甲：`knowledge/` 整棵 | 通用磁盘清理 |
| D4 向量侧枚举 | ✅ 已裁=甲：集合级 pass 取代逐库枚举 | tombstone 表 |
| D5 卡片判据 | ✅ 已裁=甲：行存在且开关开才保留 | 不修 / 改姿态 |
| D6 代次残留 | ✅ 已裁=甲：集合级枚举 + 注入闸（§2.6） | 单开小对 / 不修 |

## 硬约束

- 只删 `knowledge/` 下目录；业务行/Qdrant 不动；不新增配置面（复用 `rag.sweep_*`）；两段式；失败仅记录、下轮重试。向量侧同款：只删两段判据内的点，闸逐库精确（组内跳过，不做全轮收缩）。

## Task 0 — 落点核实

- [x] ① 锚点与顺序：`knowledge_service.py:422-441`（write→create→submit 无补偿）；`_remove_dir` 语义（`:1769`，ignore_errors）；service 与 worker 各自拿到的 `data_dir` 现状（`app.py:352-364`）。
- [x] ② 目录布局：`knowledge/<kb_id>/<doc_id>/` 下有哪些内容（原文件、`images/`、video `frames/` 等），是否有 kb 级直挂文件；确认 walk 判据只认这两级。
- [x] ③ 清扫轮接线面：`_sweep_once` 现状（本仓上一对）、worker 构造参数表、闸信号（`busy_kb_ids`/`wiki_generation_in_progress`/`migration_in_progress`）——文件腿复用同一轮。
- [x] ④ 基线与成本：目标部署 `knowledge/` 目录数与体量（实测回填）。
- [x] ⑤ 向量侧枚举面：`scroll_collection` 现签名（`vector_store.py:495`，kb_id 必填）→ 无过滤扫描的落点（新参数或新方法）；四集合 payload 的 `kb_id` 字段核实；`delete_*` helper 签名表（chunks=ids / entities=kb_id+names / wiki=kb_id+titles / manual=ids）。
- [x] ⑥ 卡片判据锚点：`sweep.py:122/125` 两段判据；`update_manual_card` 顺序（`knowledge_service.py:1027-1054`：upsert→行写→关删）——竞态窗口按此评估。
- [x] ⑦ 代次面：两闸现状与注入点（`dimension_migration.migration_in_progress` / `rag_migration.migration_running`，worker 构造参数 + `app.py` 接线）；Qdrant 集合枚举 API 在用的客户端版本可用性；`drop_collections` 的吞错面（`vector_store.py:235-248` 无逐项吞错 ⇒ 与 GC 并发的微竞态登记）；worker/service 持有的实例在宽度翻转后是否换新（锚点=声明宽度，不依赖它；若陈旧登记另议）。

**实测（2026-10-05，Task 0 · 只读）**：

- ① ✓ 逐行对上：`_write`（`:425-429`）→ `create_document`（`:430`）→ `worker.submit`（`:440`），异常路径无补偿；`_remove_dir`（`:1769-1776`）= `shutil.rmtree(ignore_errors=True)` + except 吞。service 拿 `data_dir`（`app.py:366` = `get_paths().base_dir/"data"`）；**worker 现不拿 `data_dir`**（`app.py:352-360`：store/vector_store/concurrency/resolution_full_scan_threshold/entity_merge_similarity/sweep_enabled/sweep_interval_hours）——D2 新增。
- ② ✓ 布局实测（真实数据盘 `backend/.deer-flow/data/knowledge`）：doc 目录 = 原文件 + `images/`（文本/PDF）或 `frames/`（视频，`shot_XXXX.jpg`）；**kb 级直挂文件存在**：`golden.jsonl`、`eval_candidates.json`（eval 题库/候选，`question_bank.py:125` / `synthesis.py:268`）⇒ walk 判据 = 只有 `<kb_id>/<doc_id>` 形状的**目录**才算文档目录（doc 行缺**或 kb_id 不匹配**才删）；kb 级文件不属对账面（kb 行在即保留，kb 行无走整棵清）。eval 报告输出（`write_reports`）只被 CLI 脚本用 `args.out`，不落 knowledge 树。
- ③ ✓ `_sweep_once`（`worker.py:416-427`）：`migration_in_progress()` 整轮跳；逐库 `busy_kb_ids()`（`:398-404`）∪ `wiki_generation_in_progress(kb_id)` 跳；随后 `sweep_library`。构造参数 15 项（`:188-206`）。
- ④ ✓ 基线（本机真实栈）：`knowledge/` = **4 库 / 31 文档目录 / 31M**（per-kb：4.0K / 1.7M / 29M / 196K）。成本：walk 规模 31 个目录级、两段式后每轮全树 stat 可忽略。
- ⑤ ✓ `scroll_collection(collection_name, kb_id, *, with_vectors=False, batch_size=512)`（`:495-524`）kb_id 必填（内部构造 kb Filter）→ D4 需无过滤变体（参数 `kb_id: str | None = None` 或新方法）。四集合 payload 全带 `kb_id`：chunks `:275-279`、entities `:321`、wiki `:361`、manual `:550`。`delete_*` 签名：chunks=ids（payload 过滤 `:482`）/ entities=kb_id+names（点 id `:330`）/ wiki=kb_id+titles（payload 过滤 `:370`）/ manual=ids（点 id `:559`）。
- ⑥ ✓ `sweep.py:122/125` 两段「行存在」判据在位；`update_manual_card` 顺序 upsert（`:1038`）→ 行写（`:1040`）→ 关删（`:1052`，吞）——竞态窗口 = upsert 与行写之间（ms 级），§2.5 已登记。
- ⑦ ✓ 两闸：`migration_in_progress()`（`dimension_migration.py:80-81`）、`rag_migration.migration_running()`（`:44-45`，app 层）；注入点 = worker 构造（`:188-206`）+ `app.py:352-360` 接线（同 D2 的 `data_dir`）。Qdrant 枚举：`qdrant-client 1.19.0`，`AsyncQdrantClient.get_collections` 在（`async_qdrant_client.py:1511`）。`drop_collections`（`vector_store.py:235-248`）= 存在检查后逐个 delete、**无逐项吞错** ⇒ 与 GC 并发的微竞态按计划登记。**实例换新：静态未见路径**——`worker.py:208` 与 `knowledge_service.py:242` 均只构造一次赋值，`app.py` 启动构造一次、无配置重载回调 ⇒ 登记另议（本对锚点 = 声明宽度，不依赖它）。

## Task 1 — 异常即清（TDD）

- [x] RED：`create_document` 桩抛错 → 请求报错且 `doc_dir` 不残留。
- [x] GREEN：`upload_document` 的 write→create→submit 包补偿（失败 `_remove_dir` 再抛）。
- [x] neuter：去掉补偿 → 用例恰红；还原复绿；门禁 + 实测回填。

**实测（2026-10-05，Task 1 · 已实现未提交）**：

- 用例：`tests/knowledge/test_api.py::test_upload_compensates_when_row_creation_fails`——`raise_server_exceptions=False` 的 TestClient（既有先例 `test_chunk_edit_api.py:69`）断言 500 + `knowledge/<kb_id>/` 无残留 + `submit` 未调用。RED 首跑 **1 红**（恰是残留断言，孤儿目录实测存在）；GREEN 整文件 **57 passed**；neuter（补偿动作换 `pass`）→ **1 failed / 56 passed**（受害者=新用例、不相交）；还原复绿。
- **实现更正（一处收窄）**：补偿范围 = **write + create（行落地即止）**，**不含 submit**——submit 是 `await self._queue.put`（无界队列、不可失败面），且行已落地时删文件会制造「行无文件」孤儿；「行→入队」半段本由 `worker.recover()` 兜（spec §1 原话）。plan 原文「write→create→submit 包补偿」按此收窄。
- 门禁：`tests/knowledge/` 全量 **1544 passed / 4 failed / 2 skipped**（386.98s）；4 条全是既有环境条件红（embed/rerank 缺 key、`test_parse_pdf_full_flow`、`test_token_read_from_env_never_from_caller`）⇒ 零新增；ruff check + format 双净（两文件）。

## Task 2 — 目录对账并入清扫轮（TDD）

- [x] RED：孤儿目录→消失；正常目录/正常库不动；KB 目录（无 kb 行）整棵清；候选复核守护；闸跳过。
- [x] GREEN：`reconcile_files(data_dir, store)`（两段式）+ `worker` 新参数 `data_dir` + `_sweep_once` 接线（`app.py` 传参）。
- [x] neuter：关判据 → 孤儿用例恰红；还原复绿；门禁 + 实测回填。

**实测（2026-10-05，Task 2 · 已实现未提交）**：

- 用例：`tests/knowledge/test_file_reconcile.py`（新文件，5 例）——孤儿 doc 目录清/活目录与 kb 级文件保留（含 kb_id 不匹配一相）；kb 行缺整棵清；候选复核守护（flaky `get_document`：复核时行已落 → 不删、`kept==1`）；忙库整库跳过；接线（`_sweep_once` 带 `data_dir`：空闲库孤儿被收、忙库不动）。RED 首跑 = ImportError（模块面不存在）；GREEN **5 passed**；neuter（关 doc 判据 `if False`）→ **3 failed / 2 passed**（受害者 = 孤儿清收 ×2 + 复核守护；kb 级整棵清与忙库跳过不受影响——如实记，非不相交）；还原复绿。
- 落点：`sweep.py` 新增 `FileReconcileReport` + `reconcile_files`（两段式；判据=业务行存在性、只有 `<kb_id>/<doc_id>` 形状子目录才算文档目录）；`worker.py` 新参数 `data_dir: str | Path | None = None`（None=不跑文件腿，既有夹具零改动）+ `_sweep_once` 尾部接文件腿（`skip_kb_ids=busy`）；`app.py` 传 `data_dir=get_paths().base_dir / "data"`。
- 一处测试自身笔误（如实记）：kb 级整棵清用例首跑断言了一个从未创建的活库目录 ⇒ 先修测试（给活库建真目录）再绿；非实现缺陷。
- 门禁：`tests/knowledge/` 全量 **1549 passed / 4 failed / 2 skipped**（385.65s；+5 = 本 Task 新用例，4 条全为既有环境条件红）⇒ 零新增；ruff check + format 双净（四文件）。

## Task 3 — 向量侧盲区收口（TDD）

- [x] RED（D4）：已删库残留点（kb 行无、四集合有点）→ 整组清；正常库点不动；忙库组跳过；复核守护（候选后 kb 行出现 → 不删）。
- [x] RED（D5）：卡片开关关 + 残留点 → 清；开关开 → 保留；复核守护（候选后开关翻回 → 不删）。
- [x] RED（D6）：残留代（旧宽度集合组 + 生效代在位）→ 收；生效代不动；建完未翻窗口（app 闸 True）→ 不收；生效代缺失（手改宽度态）→ 不收；并发删"已不存在"吞错。
- [x] GREEN：`_sweep_once` 收集段改集合级 pass（无过滤 scroll + kb 分组 + 组内闸跳过）+ `_sweep_manual_cards` 判据升级 + `vector_store.scroll_collection` 无过滤支持 + `sweep_generations`（集合枚举 + 严格匹配 + 声明宽度锚 + 两道前置）+ worker 注入 `migration_running_fn`（`app.py` 接线）。
- [x] neuter：关 kb 存在判据 → D4 用例恰红；关卡片开关判据 → D5 用例恰红；去掉 app 闸 → D6"建完未翻"用例恰红；去掉生效代在位前置 → D6"手改态"用例恰红；还原复绿；门禁 + 实测回填。

**实测（2026-10-05，Task 3 · 已实现未提交）**：

- 重构（如实记）：`sweep_library`（逐库）→ **`sweep_round`**（集合级：四集合各无过滤扫一遍 + payload `kb_id` 分组 + 组内闸 `skip_kb_ids ∪ wiki 腿`）；`_sweep_once` 不再枚举 `list_all_kbs()`（盲区正是它）；旧 per-KB API 调用方只有 worker + 本文件用例，已同步。核心语义原样保留（两段式、单集合失败不拖累、幂等）。
- 用例：`test_sweep.py` 重写（17 例：原 8 例语义保留 + D4 整组清/复核守护/忙组跳过 + D5 关清开留/翻转守护）+ 新文件 `test_sweep_generations.py`（5 例：残留代收/无关集合不动/声明代缺停手/单删失败继续/已不存在吞错/非默认宽度反向）。RED 首跑 = 两文件 ImportError；GREEN **四文件 71 passed**；neuter 四刀同落 → **恰 6 红**（D4×2、D5×2、app 闸×1、生效代前置×1；受害者互不相交、余全绿）→ 还原复绿（20/20）。
- 落点：`vector_store.py`（`scroll_collection` kb_id 可选=无过滤、`names_at_width`/`collection_prefix`、`list_all_collections`/`drop_collection`）；`sweep.py`（`SweepReport` 增 `deleted_kb_groups`、`sweep_round`、四 kind 的已删库组整删、`_card_is_live`（D5）、`GenerationReport`+`sweep_generations`）；`worker.py`（`migration_running_fn` 参数 + `_sweep_once` 重写：两闸整轮跳 → `sweep_round` → 文件腿 → 代次 GC（锚=声明宽度 `effective_dimension()`））；`app.py`（`migration_running_fn=migration_running` 接线）。
- 门禁：`tests/knowledge/` 全量 **1561 passed / 4 failed / 2 skipped**（387.96s；较 Task 2 +12 = 新用例，4 条全为既有环境条件红）⇒ 零新增；ruff check + format 双净（七文件）。

## Task 4 — 真栈验收

- [x] 隔离实例：文件相（删文档后手动重建目录 + 一次"上传中途失败"）+ 向量相（停 Qdrant 后删库、关卡片开关 → 起 Qdrant）+ 代次相（手造一组残留代集合）→ 跑一轮清扫 → 目录、残留点与残留代清零；正常库检索不受影响。
- [x] 收尾：临时库/进程/文件清理并核验。

**实测（2026-10-05，Task 4 · 隔离实例全绿）**：

- 隔离面：临时 Qdrant 容器 `kb-sweep-t4-qdrant`（:6399）+ 仓外 scratch 根（`DEER_FLOW_PROJECT_ROOT`/`DEER_FLOW_HOME` 全指 `E:/app-model/deer-flow-scratch/sweep-t4`）；脚本 `sweep-t4/e2e.py`（直调真 store + 真 worker `_sweep_once`）。**零触碰**：他的 6333 Qdrant/真配置全程未读写。
- 结果 **17 PASS / 0 FAIL**：文件相（活目录与 kb 级 `golden.jsonl` 保留；孤儿目录 / 崩溃窗口目录 / 已删库整棵清除）；向量相（ghost 点清、活点留；卡片关开关与"停 Qdrant 关开关"残留清、开的留；已删库四集合组清零）；代次相（`kb_*_1000` 残留代被收、声明代四个在位不动）；行不动、活库完整。停 Qdrant 删库一相里 `delete_by_kb` 的吞错栈（`ResponseHandlingException: All connection attempts failed`）如实出现在 stderr、流程继续——即验证点本身。
- 收尾：容器已 `docker rm -f` 并核验（6333 容器照旧、无其它容器）；scratch 脚本/目录留 `E:/app-model/deer-flow-scratch/sweep-t4/` 待他点名清理。

## Task 5 — 文档与收尾

- [x] §5.3 条目 3 半句改写实口径（"须纳入恢复"→已实现表述）；`backend/AGENTS.md` 清扫条补文件腿、向量侧枚举与代次三句；spec/plan 状态行与实测回填。
- [x] 提交链回填。

**实测（2026-10-05，Task 5 · 纯文档）**：

- RFC §5.3 条目 3：半句从"也须纳入恢复"改为已实现表述（行创建失败即清 + 孤儿文件与目录由清扫轮对账回收）。
- `backend/AGENTS.md` 清扫条重写：集合级枚举 / 已删库整组 / 卡片开关判据 / 文件腿 / 代次 GC（锚=声明宽度、生效代在位前置）/ 双闸（in-flight ∪ app `migration_running`），spec 双链接。
- **提交链**：`15044db00`（RFC 回收口径）→ `a1cb45d3c`（spec+plan 起草）→ `d9ca5b644`（Task 1）→ `f0207aba7`（Task 2）→ `46718eee4`（Task 3）→ `1a66509dc`（Task 4）→ `f54843c7f`（收尾）。
