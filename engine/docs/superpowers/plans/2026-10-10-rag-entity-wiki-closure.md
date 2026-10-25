# 实体↔wiki 收口（两格） —— 实施计划

## 范围与交接

一对一件事＝两格一起做：①`graph_search` 加 `entity` 直参（wiki→实体→按键跳；`query` 变可选）②新增 `list_wiki_entries`（模型面枚举；注册面随批）。成对 spec 同名（`../specs/2026-10-10-rag-entity-wiki-closure-design.md`），决策点 D1–D7 见 spec §3（**已裁全甲**：①单实体 `entity`／②如实空态／③主键 getter／④只列生成条目／⑤全量＋计数／⑥新独立工具／⑦docstring＋SOUL 同批）。**树归属**：主树 `feat/rag-knowledge-base` 独有——切片无实体/wiki 模块与 wiki/graph 工具，**不随带**、切片 example 零落点。**不碰**：三路检索链本体（召回/重排/扩张/引用编号）、wiki 生成与脏标记、图谱抽取/合并、注入面、前端、recall-test 投影。TDD 必做（backend/AGENTS.md）；提交信息英文 conventional；只 stage 本线文件。

## 硬约束（执行期注意）／Global Constraints

- **TDD 命令**（照 `backend/Makefile` 的 RUN 变量）：`RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync`；单测＝`$(RUN) pytest tests/knowledge/… -q`（basetemp 用仓外隔离目录、跑完删）；门禁＝`ruff check`／`ruff format --check` 双净；**工具属共享面 ⇒ 加跑全量**（后台，约 15–23 分，落盘日志）。
- **薄壳口径**：① 直取复用现有 seed/扩张链、零查询改动（D3 甲 例外：store 一行 `get_entity` getter）；② 只读 `list_entries`（零查询改动）。
- **注册面三件（新工具特有）**：`builtins/__init__` 导出＋`config.example.yaml` 条目＋装配钉句扩一行（`test_rag_agent_assembly.py` 两个装配用例各扩一条 pin：在 rag 组、不在默认组）。
- **配置面（本批唯一例外，明示）**：t6 实例配置与仓内 gitignored `config.yaml` 各补一条启用条目（同 doc-tools 先例；随证据/回填记档）。
- **SOUL 句改同批**：docstring 与 SOUL 半句同批落；句改前扫 `test_rag_agent_assembly.py` 钉句族（`:58-:71`）。
- **门控一致**：①② 三分支（未绑定/无权限/跨库）文案与三路检索同款。
- 真栈仅测试库；临时件收尾删净；`rag_config.json` 零改动。

## Task 0 — 落点核实

> 动到的文件：只读核实＋spec/plan 回填（本对文档）

- [ ] ① 实读行复核（`graph_search_tool.py:175` impl／短路缝 `:211-245`（抽取/回退/空态/查询嵌入/匹配/未命中空态）／`:257-266` 扩张入参（`query_vector=query_dense` 双用尺）／`:332` trace／`:395-396` @tool 两参）；② `wiki_store.list_entries`（`wiki/store.py:91-97`）＋`list_knowledge_documents` 消息/空态先例复核；注册面三件（`builtins/__init__` 导入＋`__all__`、`config.example.yaml:697-708/712-718`、装配钉句 `:74-79` 与默认组排除用例 `:82-87`）＋仓内 `config.yaml:70-83` 启用面；③ `graph/store.py:29-30` `_entity_id`＋`:107-111` `list_entities`；④ 受害者扫描：`test_graph_search.py` 逐用例（query 路不破）／`test_rag_agent_assembly.py` 两装配用例＋钉句族／`test_wiki_search*.py`（不受影响——本批不动 wiki_search）／example 外部消费者（`test_local_registration_gate`、`test_config_version`、`test_doctor` 等——终审已扫零钉工具名，执行期复核）；⑤ D1–D7 裁定值回填本文件与 spec §3。

**Task 0 复核结果（2026-10-10 执行；终审已预扫、执行期复核）**：
- ① 实读全中：impl `:175-199`（query 首位、`llm` 为 keyword）、gate `:201-206`；短路缝 `:208-245`（抽取 `:211`／回退 `:212-219`／空态 `:221`／查询嵌入 `:224-226`／匹配循环 `:231-243`／未命中空态 `:244-245`）；扩张入参 `:248-266`（`query_vector=query_dense` 同用尺）。**尾段细节（执行期实读）**：空 hop 态（`:269-270`）消息用 `query_names`、`_score_candidates` 首参是文本（仅 rerank 用）⇒ 直取路须定义 `query_names=[entity]`（消息用）＋打分文本＝entity。
- ② `list_entries`（`wiki/store.py:91-97`）✓；文档先例消息「共 N 篇文档（…）」/空态「当前知识库中还没有文档。」✓。
- ③ `_entity_id :29-30`＋`list_entities :107-111` ✓；getter 测试落点＝`tests/knowledge/graph/test_graph_store.py`（plain `session_factory`＋`upsert_entities` 夹具，实读）。
- ④ 受害者面：`test_graph_search.py` query 路用例（新参默认 None，不破）／装配两用例 `:74-79`（`<=` 子集）＋`:82-87`（默认组排除）／`test_graph_store.py`（加 getter 不动既有）／example 外部消费者（终审已扫零钉工具名）。
- ⑤ D1–D7 全甲已回填 ✓（本文件交接段＋spec §3）。

## Task 1 — ① `graph_search` 加 `entity` 直参（TDD）

> 动到的文件：`backend/packages/harness/deerflow/tools/builtins/graph_search_tool.py`＋（D3 甲）`knowledge/graph/store.py`＋对应测试

- [x] RED：entity 命中（种子＝该实体、跳抽取与匹配、扩张/引用正常）／未命中如实空态／两者皆缺引导／门控三分支／（D3 甲）getter 主键查；GREEN：impl 加 keyword 参数＋直取短路（`entity_scores={entity: 1.0}` 汇入扩张；下游打分尺＝嵌入实体名一次、零 LLM）＋`query` 变可选＋docstring Args 行（按 D7 句）；neuter 一次（去直取恰红后还原）。
- [x] 门禁：knowledge 面定向（`tests/knowledge/tools/`）。

**实测（2026-10-10 执行）**：RED 5 例（命中／未命中／两者皆缺／门控三分支＋store getter；`_ExplodingLLM`/`_ExplodingEmbedder` 证不抽取、不误嵌）→ GREEN 46/46；neuter（`if entity and False`）恰红 2 例（命中＋未命中）后还原。定向 `tests/knowledge/tools`＋`tests/knowledge/graph` = **176 passed / 0 failed**（Qdrant 在线）。缝上口径全按 spec 落：直取路嵌实体名一次作双用尺（邻居门＋打分）、`query_names`/`matched_names`=`[entity]`、未命中文案照抄「知识图谱中…」样式族、`scoring_text` 仅 rerank 用。

## Task 2 — ② 新增 `list_wiki_entries`（TDD）

> 动到的文件：新 `tools/builtins/wiki_entries_tool.py`（名待定，按 D6）＋`builtins/__init__.py`＋`config.example.yaml`＋对应测试＋`test_rag_agent_assembly.py` 两 pin 扩行

- [x] RED：清单（title/status/updated_at＋诚实计数）／空库／门控三分支／有界按 D5；GREEN：工具实现（`list_entries` 只读）＋注册三件；neuter 一次（恰红后还原）。
- [x] 门禁：定向＋装配两用例复核。

**实测（2026-10-10 执行）**：RED＝模块不存在（collection error）→ GREEN（新 `wiki_entries_tool.py`＋注册三件：`builtins/__init__` 导出／`config.example.yaml` 条目／装配两用例各扩一 pin）**12/12**；neuter（断 `list_entries` 读）恰红 1 例（清单用例）后还原。ruff 顺手修一处 F401（未用 `Annotated`）。enablement 配置条目（仓内 gitignored `config.yaml`＋t6 实例）已补（配置例外，Task 4 记档）。

## Task 3 — 引导（docstring＋SOUL，按 D7）

> 动到的文件：两工具 docstring（随各自 Task）＋`agents/assets/rag/SOUL.md`（主树独有）

- [x] `graph_search` docstring（`entity` 用法句）／list 工具 docstring（用法＋覆盖面「只覆盖过门槛的头部实体」）；SOUL：语料边界节加「有哪些百科条目」条＋`:34` 第三步扩 entity 直参半句；`test_rag_agent_assembly.py` 同批复核（预期不出红）。

**实测（2026-10-10 执行）**：docstring 两处随代码落（graph `entity` Args＋用法句；新工具用法/覆盖面句）。SOUL：语料边界节插入第 2 条「有哪些百科条目」（原 2–5 顺延为 3–6；钉句子串「4 个窗口」「6 次」等全保留）＋`:34` 第三步扩「规范名即图节点名，可用 `graph_search(entity=…)` 直取邻域」。复核 `tests/knowledge/tools`＋`test_rag_agent_assembly.py` = **98 passed 全绿**（钉句族不相交）。

## Task 4 — 门禁＋真栈小相＋回填

- [x] ruff 双净＋定向＋**全量**（日志落盘）；真栈小相（W21，t6 实例）：① `graph_search(entity="证件")` 直取邻域；②「知识库里有哪些百科条目？」→ `list_wiki_entries`；**实例配置补启用条目**（配置面例外，随证据记）；临时件收尾。
- [x] 回填：本 plan 纪行（Task 0–4 逐格勾＋实测）＋spec 状态行；提交链落定（含仓内 gitignored `config.yaml` 启用条目状态）。

**实测（2026-10-10 执行）**：
- **ruff 双净（仓级）**：`ruff check .` = All checks passed；`ruff format --check .` = 1332 files already formatted（+2＝本批新文件，算术闭合）。
- **定向**：`tests/knowledge`（Qdrant 6333 临时实例在线；在线判据 = 只 2 skipped）= **1631 passed / 2 skipped / 4 failed（467s）**；4 红＝在案环境族同签名 ⇒ 零新增红；净增 +8 = 本批新用例（5＋3）。
- **全量**（后台、完整日志落 `E:/app-model/deer-flow-scratch/pytest-full-ew.log`）：**168 failed / 13069 passed / 109 skipped / 0 error（1141s ≈ 19 分钟）**；Qdrant 在线。红集对基线 diff：**知识面零新增**（同 4 条在案环境红）；多出的 **15 条全在浏览器/抓取族**（browser_automation×3／browser_router×1／browserless×4／crawl4ai×4／fastcrw×3）——报文（「Refusing to browse a private, loopback, or metadata address」）与文件分布**逐字命中在案第七形态**（SSRF 守卫 fail-closed 的瞬态 DNS 状态）；**现况复跑那 5 个文件 = 142 passed / 1 skipped 全绿**（`pytest-browser-repro.log`）⇒ 判环境瞬态、与本批零因果（import 面不相关）。算术闭合：+15 浏览器红＋新用例 8 ⇒ passed −7 与 failed +15 对得上。
- **真栈 W21（t6 实例）**：新 Qdrant `:6398` → reindex `succeeded`；**实例配置补启用条目**（`list_wiki_entries`，配置例外）。同线程两轮全 wait=200：T1「用实体名直取图谱：『证件』…」→ **`graph_search({"entity": "证件", "hops": 2})`**（args 无 query，直参生效；返回护照/身份证＋「属于」关系，答案逐条列关系与依据）；T2「知识库里现在有哪些百科条目？」→ **`list_wiki_entries({})`**（返回 18 条 title/status/updated_at，全 ready；答案按主题列全 18 条并转述「只覆盖过门槛的头部实体」口径）。**两格全贯通且被模型消费** ✓。证据存 `acceptance-t6/w21-evidence.md`＋`w21-messages.json`（scratch，不提交）。
- **配置面（例外已记档）**：仓内 gitignored `config.yaml` 补 `list_wiki_entries` 条目（启用；同 doc-tools 先例）＋t6 实例配置同补——两件均为 gitignored 实名件、不进 git；`rag_config.json` 零改动。
- **收尾**：gateway 停、Qdrant 容器（:6398 与 :6333 临时）移除、basetemp 删净；主仓工作树零临时件。

## 提交链（落定，2026-10-10）

- 开工首笔 `89aadf092`（spec+plan 成对）／代码一笔 `00e08c4b4`（Task 1＋2＋docstring＋测试＋注册面三件含 `config.example.yaml` 条目）／引导一笔 `40de0be79`（SOUL 语料边界第 2 条＋`:34` 扩句）／回填并入文档笔（本笔）；均主树、不推（待令）。
- **启用条目（gitignored 实名件，不进 git）**：仓内 `config.yaml` 与 t6 实例配置各补 `list_wiki_entries` 一条（配置例外，Task 4 记档）。
