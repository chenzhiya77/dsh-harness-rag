# 切片→实体 模型面通路（感知链断点补强） —— 实施计划

## 范围与交接

一对一件事＝`hybrid_search` 与 `read_knowledge_document` 两处结果各带 `entities`（本片规范化实体名）＋引导（docstring/SOUL）。成对 spec 同名（`../specs/2026-10-10-rag-chunk-entity-surface-design.md`），决策点 D1–D5 见 spec §3（**已裁全甲**：数组／两处覆盖／cap 10 静默／docstring＋SOUL 半句／空数组照常）。**树归属**：主树 `feat/rag-knowledge-base` 独有——切片无实体模块与 `graph_search`，**不随带**、切片 example 零落点（spec §2.3）。**不碰**：召回/重排/引用编号链、注入面、前端、图谱/wiki 腿、recall-test 白名单投影（除复核确认）。TDD 必做（backend/AGENTS.md）；提交信息英文 conventional；只 stage 本线文件。

## 硬约束（执行期注意）／Global Constraints

- **TDD 命令**（照 `backend/Makefile` 的 RUN 变量）：`RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync`；单测＝`$(RUN) pytest tests/knowledge/… -q`（basetemp 用仓外隔离目录、跑完删）；门禁＝`ruff check`／`ruff format --check` 双净；**工具属共享面 ⇒ 加跑全量**（后台，约 18–23 分，落盘日志）。
- **薄壳零查询改动**：`entities` 取自行上（store 整行 dict 已含），禁止改查询/序列化层；上限与空态严格按 D3/D5 裁定。
- **SOUL 句改同批**：docstring 与 SOUL 半句须同笔落（不得只落一半）；句改前扫 `test_rag_agent_assembly.py` 钉句族＋SOUL 用例面。
- **有界**：cap 口径写进 docstring（「up to N」），单测钉死截断行为。
- 真栈仅测试库；临时件收尾删净；`rag_config.json` 零改动。

## Task 0 — 落点核实

> 动到的文件：只读核实＋spec/plan 回填（本对文档）

- [x] ① 两处 item 构造行复核（`hybrid_search_tool.py:80-94`／`knowledge_documents_tool.py:76` 起）＋docstring 落句行；② 受害者扫描（终审已预扫，执行期复核）：`test_hybrid_search.py` 逐键断言（加键不破；**夹具行需补 `entities` 供 RED/GREEN**）／**`test_knowledge_documents_tool.py:129` 精确 items 列表断言（加键必改——随 Task 2 同笔更新夹具与断言）**／SOUL 用例族 `backend/tests/knowledge/test_rag_agent_assembly.py`（现况钉句 `:63` 事实性·`:69` 语料边界·`:70` list+read 引用·`:71` 读取限次——本次半句与之不相交，预期不出红）／recall-test 白名单投影（`knowledge_service.py:1160-1172` 键挑选、无 entities——不入其响应为预期）；③ SOUL 半句落点行（补检节 `:32-33`）；④ D1–D5 裁定值回填本文件与 spec §3。

**Task 0 复核结果（2026-10-10 执行；终审已预扫、执行期复核）**：
- ① 两处 item 锚点全中：`hybrid_search_tool.py:80-94`（item 七键构造）／`knowledge_documents_tool.py:76`（`_shape_items` 五键）；docstring 落句行＝hybrid `:119`「Each result carries…」句、read「Oversized chunk text is truncated…」段（`:200` 附近）。
- ② 受害者面复核：`test_hybrid_search.py` 逐键断言（`:105-109` 等；加键不破）＋夹具 `_FieldStore.rows` **无 entities 键**（RED/GREEN 同笔补）；`test_knowledge_documents_tool.py:129` 精确 items 列表断言（加键必改——随 Task 2 同笔更新）；SOUL 用例族 `backend/tests/knowledge/test_rag_agent_assembly.py` 钉句＝`:63` 事实性·`:64` 纯概念·`:65` 回补·`:66` 深度检索·`:69` 语料边界·`:70` list+read·`:71` 读取限次——本次「第三步沿实体扩展」+ 上限句更新**与之全不相交**（「回补」句保持不动）；recall-test 投影 `knowledge_service.py:1160-1172` 逐键挑选（无 entities——不入为预期）。
- ③ SOUL 落点实读：补检节＝`:30-34`（`:30` 为「换路与换问法各最多一次，合计不超过两次工具调用轮」上限句）；第三小步插于 `:33`（第二步换问法）之后，`:30` 上限句同笔扩写为「换路、换问法与沿实体扩展各最多一次，合计不超过两次工具调用轮」。
- ④ D1–D5 已裁全甲并回填（本文件＋spec §3）✓。
- ⑤ 实现口径实核：`insert_chunks`／`to_dict` 均透传 `entities`（行上可取）；两处 surface 共用一个 helper（`knowledge/chunk_entities.py`＝去重保序＋cap 10，单一口径防漂）。

## Task 1 — `hybrid_search` 结果带 entities（TDD）

> 动到的文件：`backend/packages/harness/deerflow/tools/builtins/hybrid_search_tool.py`＋对应测试

- [x] RED：断言 item 含 `entities`（数组、去重保序）＋cap 截断态＋空数组态；GREEN：item 构造补键（取 `row["entities"]`，按 D3 截断）＋docstring 一句（按 D4）；neuter 一次（去键恰红）。
- [x] 门禁：knowledge 面定向（`tests/knowledge/tools/`）。

**实测（2026-10-10 执行）**：RED 3 例（去重保序／cap 12→10／未回填空数组）→ GREEN；neuter 去键恰红后还原。夹具 `_FieldStore.rows` 同笔补 `entities`（含重复项，供去重断言）。落笔 `486b9d226`（与 Task 2 同笔；首落 `c2b65a092`，同任务 lint 修——UP035／超长 docstring 行——后 amend）。

## Task 2 — read 工具 item 带 entities（TDD）

> 动到的文件：`backend/packages/harness/deerflow/tools/builtins/knowledge_documents_tool.py`＋对应测试

- [x] RED：`_shape_items` 输出含 `entities`（同款三态）；GREEN：塑形补键＋read 工具 docstring 一句（按 D4）；neuter 还原。
- [x] 门禁：knowledge 面定向。

**实测（2026-10-10 执行）**：RED（`test_read_items_carry_mentioned_entities`，去重＋cap 12→10）→ GREEN；neuter 还原。Task 0 预扫的受害者同笔处置：`test_knowledge_documents_tool.py:129` 精确 items 列表断言加 `entities` 键、`_seed_chunks` 补 `entities` 形参。落笔 `486b9d226`（与 Task 1 同笔）。

## Task 3 — SOUL 半句（按 D4）

> 动到的文件：`backend/packages/harness/deerflow/agents/assets/rag/SOUL.md`（主树独有）

- [x] 补检节补「沿实体扩展」半句（与换路/换问法并列，不动「回补」句）；`backend/tests/knowledge/test_rag_agent_assembly.py` 同批复核（预期不出红）；切片不动（复核零落差）。

**实测（2026-10-10 执行）**：`:30` 上限句扩写为「换路、换问法与沿实体扩展各最多一次，合计不超过两次工具调用轮」＋`:33`（第二步换问法）后插入第三步「沿实体扩展」（entities 作 `graph_search` 入口）。`test_rag_agent_assembly.py` 与全部 SOUL 钉句族不出红（窄复跑含该文件 0 红）。落笔 `27531b488`。

## Task 4 — 门禁＋真栈小相＋回填

- [x] ruff 双净＋定向＋**全量**（日志落盘）；真栈小相（W19）：实例造两跳追问（「这片提到哪些实体」→「与 X 的关系」），观察 `entities`→`graph_search` 被用；临时件收尾、配置零改动。
- [x] 回填：本 plan 纪行（Task 0–4 逐格勾＋实测）＋spec 状态行；提交链落定。

**实测（2026-10-10 执行）**：
- **ruff 双净（仓级）**：`ruff check .` = All checks passed；`ruff format --check .` = 1330 files already formatted（09-24 那笔预存债已修、维持净）。
- **定向**：`tests/knowledge`（Qdrant 6333 临时实例在线；在线判据 = 只 2 skipped）= **1618 passed / 2 skipped / 4 failed**；4 红＝在案环境族逐条同签名（缺 key 对 `test_embed_missing_api_key`/`test_rerank_missing_api_key`＋parser 对 `test_parse_pdf_full_flow`/`test_token_read_from_env_never_from_caller`；与 10-04/10-05/10-06 记载一致，均不 import 本批文件）⇒ **知识面零新增红**。窄复跑 `tests/knowledge/tools`＋`test_rag_agent_assembly.py` = 64 passed / 22 skipped（skip 为集成档，无 Qdrant 时）0 红。
- **全量**（后台、完整日志落 `E:/app-model/deer-flow-scratch/pytest-full-ce.log`）：**153 failed / 13019 passed / 160 skipped / 1 error（917s）**；收集时 Qdrant 离线 ⇒ skip 109→160、1 error＝wiki 生成器那条未挂标记的集成用例——均为在案离线签名；知识面红集与定向同 4 条；红数为本机浮动值（历史 144–164），判据按红集对照不按数字。
- **真栈小相（W19；t6 实例）**：新 Qdrant `:6398` → `POST /reindex` 202 → `succeeded`。T1「旅行清单里都要带哪些东西？」→ `hybrid_search(top_k=8)`：items 带 `entities`（旅行清单片 10 名全量；测试10 片 **14→10 截断**，cap 实况）；T2「那『证件』和『电子设备』这两类，各自底下具体都有什么？彼此之间又是什么关系？」→ `graph_search(query=…证件 与 电子设备…, hops=2)`＋`read_knowledge_document`：命中 6 实体、扩展 8 节点/7 关系、1 条证据 `[1]`；read items 同带 entities。**`entities`→`graph_search` 被用** ✓。证据存 `acceptance-t6/w19-evidence.md`＋`w19-messages.json`（scratch，不提交）。
- **收尾**：gateway 停、Qdrant 容器移除、basetemp 删净；`config.yaml`/`rag_config.json` 零改动；主仓工作树零临时件。

## 提交链（落定，2026-10-10）

- 开工首笔 `6ac56bef0`（spec+plan 成对）／代码一笔 `486b9d226`（Task 1＋2＋测试）／引导一笔 `27531b488`（Task 3，含用例核正）／回填并入文档笔（本笔）；均主树、不推（待令）。
