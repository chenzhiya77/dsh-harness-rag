# 感知链余口补强（三格） —— 实施计划

## 范围与交接

一对一件事＝三格一起做：①`wiki_search` 加 `title` 直取（实体→wiki 确定性）②wiki item 带 `source_chunk_ids`（wiki→切片回溯）③`graph_search` 证据片补 `doc_id`（凭据对齐）。成对 spec 同名（`../specs/2026-10-10-rag-perception-handles-design.md`），决策点 D1–D6 见 spec §3（**已裁全甲**：①`title` 参数／②如实空态／③不过滤口径／④全量照返／⑤manual 缺键／⑥docstring＋SOUL 同批）。**树归属**：主树 `feat/rag-knowledge-base` 独有——切片无实体/wiki 模块与 wiki/graph 工具，**不随带**、切片 example 零落点。**不碰**：召回/重排/引用编号链、wiki 生成与脏标记、图谱抽取/扩张、注入面、前端（锚定通道在服务层已有）、recall-test 投影键集。TDD 必做（backend/AGENTS.md）；提交信息英文 conventional；只 stage 本线文件。

## 硬约束（执行期注意）／Global Constraints

- **TDD 命令**（照 `backend/Makefile` 的 RUN 变量）：`RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync`；单测＝`$(RUN) pytest tests/knowledge/… -q`（basetemp 用仓外隔离目录、跑完删）；门禁＝`ruff check`／`ruff format --check` 双净；**工具属共享面 ⇒ 加跑全量**（后台，约 15–23 分，落盘日志）。
- **薄壳零查询改动**：①②③ 取数全在现有行/dict 上（`get_entry` 全列／`row["doc_id"]` 变量），禁止改查询与序列化层；① 直取路不建 embedder（lazy）。
- **SOUL 句改同批**：docstring 与 SOUL 半句须同批落（不得只落一半）；句改前扫 `test_rag_agent_assembly.py` 钉句族（`:58-:71`）＋wiki/graph 两工具用例面。
- **门控一致**：① 直取三分支（未绑定/无权限/跨库）文案与三路检索同款。
- 真栈仅测试库；临时件收尾删净；`config.yaml`/`rag_config.json` 零改动。

## Task 0 — 落点核实

> 动到的文件：只读核实＋spec/plan 回填（本对文档）

- [ ] ① 实读行复核（`wiki_search_tool.py:33/55-71/72-79/86-93/96-97/114-115`）＋`wiki_entry_id`（`store.py:23-24`）与 `get_entry`（`:86-88`）两个复用点＋impl 调用点 `knowledge_service.py:1142`（kwargs，加参不碰）；② `source_chunk_ids` 列实核＋服务层同款口径复核（锚定通道 `knowledge_service.py:1190-1199`；**wiki hit 已带同款键** `:1216-1217`，manual→缺键——② 键名/口径照抄）；③ `graph_search_tool.py:300-321` 证据 item 六键＋`doc_id` 变量（`:308`）复核；④ 受害者扫描：`test_wiki_search.py`（逐键断言——加键/加参逐条复核）／`test_wiki_search_manual_merge.py`（citation 列表断言、manual 混排）／`test_graph_search.py:229` 子集断言／工具组钉句 `test_rag_group_tools_are_exactly_the_three_retrieval_tools`（D1 甲下不相交，乙须动）／SOUL 钉句族 `test_rag_agent_assembly.py:58-:71`；⑤ D1–D6 裁定值回填本文件与 spec §3。

**Task 0 复核结果（2026-10-10 执行；终审已预扫、执行期复核）**：
- ① 实读行全中：`wiki_search_tool.py:33-42` impl 签名（query 首位、gate `:44-50`）／语义路 `:51-71`／wiki item 六键 `:72-79`／manual 分支 `:86-93`／语义空态 `:96-97`／共同尾（citation＋message）`:100-111`／@tool 壳 `:114-115`；`wiki_entry_id`（`store.py:23-24`）与 `get_entry`（`:86-88`）两个复用点；impl 调用点 `knowledge_service.py:1142`（kwargs，加参不碰）。
- ② `source_chunk_ids` 列实核 ✓；服务层同款口径复核 ✓（锚定通道 `knowledge_service.py:1190-1199`；wiki hit 已带同款键 `:1216-1217`、manual→缺键——② 键名/口径照抄）。
- ③ `graph_search_tool.py:300-321` 证据 item 六键（`:313-320`）＋`doc_id` 变量（`:308`，doc 名缓存键）复核 ✓。
- ④ 受害者扫描：`test_wiki_search.py` 逐键断言＋门控用例传 `vector_store=None/embedder=None`（直取测试可照用）／`test_wiki_search_manual_merge.py` citation 列表断言＋manual 混排 ✓ 不破／`test_graph_search.py:229` 子集断言 ✓ 不破／工具组钉句 `test_rag_group_tools_are_exactly_the_three_retrieval_tools`（D1 甲下不相交）／SOUL 钉句族 `test_rag_agent_assembly.py:58-:71`。
- ⑤ **实现口径修正（已同步 spec §2.1）**：`query` 变可选（默认 `None`）、`title` 优先、两者皆缺＝如实引导文案、空串 title 视同未提供。
- ⑥ D1–D6 已裁全甲并回填（本文件交接段＋spec §3）✓。

## Task 1 — ① `wiki_search` 加 `title` 直取（TDD）

> 动到的文件：`backend/packages/harness/deerflow/tools/builtins/wiki_search_tool.py`＋对应测试

- [x] RED：title 命中＝返回该条目（六键＋citation_no）／未命中＝空态文案（按 D2）／无绑定与无权限两分支同款文案；GREEN：impl 加 keyword 参数＋直取短路（跳过嵌入）＋docstring Args 行；neuter 一次（去直取恰红后还原）。
- [x] 门禁：knowledge 面定向（`tests/knowledge/tools/`）。

**实测（2026-10-10 执行）**：RED 4 例（直取命中／未命中如实空态／门控三分支／两者皆缺引导；`_ExplodingEmbedder` 证不嵌）→ GREEN；neuter（`if title and False`）恰红 2 例（命中＋未命中）后还原。定向 `tests/knowledge/tools` 59 passed / 22 skipped（集成档）0 红。含实现口径修正：`query` 变可选（默认 None）、空串 title 视同未提供、两者皆缺＝如实引导（spec §2.1 已同步）。

## Task 2 — ② wiki item 补 `source_chunk_ids`（TDD）

> 动到的文件：同 Task 1 文件＋对应测试

- [x] RED：wiki 条目 item 带 `source_chunk_ids`（与行一致）＋manual 按 D5；GREEN：item 构造补键；neuter 还原。
- [x] 门禁：定向；顺核 merge 用例（manual 混排）不破。

**实测（2026-10-10 执行）**：RED 1 例（`test_items_carry_source_chunk_ids`）→ GREEN：两处 wiki item 补键（直取路＋语义路），manual 分支未动（D5 甲照服务层先例）；neuter（去直取路键）恰红 1 例后还原。定向 `tests/knowledge/tools` 60 passed / 22 skipped。集成侧断言同笔：`returns_full_entry` 带 `["doc-t-c0"]`、merge 用例 `"source_chunk_ids" not in manual_hit`（Task 5 门禁在线实跑覆盖）。

## Task 3 — ③ graph 证据片补 `doc_id`（TDD）

> 动到的文件：`backend/packages/harness/deerflow/tools/builtins/graph_search_tool.py`＋对应测试

- [x] RED：证据 sample 带 `doc_id`（与业务行一致、与同片 hybrid item 一致）；GREEN：一行补键；neuter 还原。
- [x] 门禁：定向（`test_graph_search.py`）。

**实测（2026-10-10 执行）**：RED 1 例（`expands_and_fetches_evidence` 子集断言＋`sample["doc_id"] == DOC_ID`；Qdrant 6333 临时实例在线、集成档实跑）→ GREEN 29/29；neuter（去行）恰红同例后还原。evidence doc_id 原文核对：与业务行/与同片 hybrid 完全一致。

## Task 4 — 引导（docstring＋SOUL，按 D6）

> 动到的文件：两工具 docstring（随各自 Task）＋`agents/assets/rag/SOUL.md`（主树独有）

- [x] `wiki_search` docstring（title 用法＋`source_chunk_ids` 回溯句）／`graph_search` docstring（doc_id 半句）；SOUL 半句按裁落（候选 `:19` 凭据句扩／`:34` 第三步扩）；`test_rag_agent_assembly.py` 同批复核（预期不出红）。

**实测（2026-10-10 执行）**：docstring 三处落（title 用法句随 Task 1 Args／`source_chunk_ids` 回溯句／graph「证据带 `doc_id`＋`doc_name`」半句）；SOUL 两处落——`:19` 扩「`graph_search` 证据片同带 `doc_id`」、`:34` 第三步扩「或对已知实体名用 `wiki_search(title=…)` 直取同名百科条目；条目自带的 `source_chunk_ids` 可再 `read` 回溯来源切片」。复核 `test_rag_agent_assembly.py`＋tools 面 = 91 passed 全绿（钉句族 `:58-:71` 不相交）。

## Task 5 — 门禁＋真栈小相＋回填

- [x] ruff 双净＋定向＋**全量**（日志落盘）；真栈小相（W20，t6 实例）：三跳——「实体名 → `wiki_search(title=…)` 直取条目 → 条目 `source_chunk_ids` → `read(chunk_id)` 回溯；`graph_search` 证据带 `doc_id` → `read(doc_id)` 读篇」；临时件收尾、配置零改动。
- [x] 回填：本 plan 纪行（Task 0–5 逐格勾＋实测）＋spec 状态行；提交链落定。

**实测（2026-10-10 执行）**：
- **ruff 双净（仓级）**：`ruff check .` = All checks passed；`ruff format --check .` = 1330 files already formatted。
- **定向**：`tests/knowledge`（Qdrant 6333 临时实例在线；在线判据 = 只 2 skipped）= **1623 passed / 2 skipped / 4 failed（446s）**；4 红＝在案环境族逐条同签名（缺 key 对＋parser 对）⇒ 知识面零新增红；净增 +5 恰为本批新用例（4＋1）。
- **全量**（后台、完整日志落 `E:/app-model/deer-flow-scratch/pytest-full-ph.log`）：**153 failed / 13076 passed / 109 skipped / 0 error（1116s ≈ 18.6 分钟）**；Qdrant 在线（常规 109 skip、0 error）。**红集与昨夜基线（本批未改前）逐行 diff 为空**（RED-SET-IDENTICAL）⇒ 零新增红；passed 增量 +57 算术闭合 = 本批新用例 5 ＋ 昨夜离线被 skip 的 51 条转绿 ＋ 原 1 error 转绿。
- **真栈 W20（t6 实例）**：新 Qdrant `:6398` → reindex `succeeded`。同线程四轮全 wait=200：T1「按名称精确直取『证件』条目」→ **`wiki_search(title="证件")`**（args 带 title，返回条目含 `source_chunk_ids`）；T2「来源切片读出来」→ 并行 2× `read_knowledge_document(chunk_id=…)`（chunk_id 只可能来自新字段；一条陈旧如实报「该切片不存在或已被删除」）；T3「图谱里连着谁」→ `graph_search(hops=2)`，证据 item 实带 `{"chunk_id":"ae39c47b…#0000","citation_no":1,"doc_id":"ae39c47b4ce14487b60264946d4c9ef9","doc_name":"旅行清单.md"}`；T4「把证据文档打开」→ **`read_knowledge_document(doc_id=ae39c47b…)`** 直达篇级。**三条新链全贯通且被模型消费** ✓。证据存 `acceptance-t6/w20-evidence.md`＋`w20-messages.json`（scratch，不提交）。
- **收尾**：gateway 停、Qdrant 容器（:6398 与 :6333 临时）移除、basetemp 删净；`config.yaml`/`rag_config.json` 零改动；主仓工作树零临时件。

## 提交链（落定，2026-10-10）

- 开工首笔 `3cc1df9cb`（spec+plan 成对）／代码一笔 `04d551624`（Task 1＋2＋3＋docstring＋测试）／引导一笔 `01b92ef16`（SOUL 两处半句）／回填并入文档笔（本笔）；均主树、不推（待令）。
