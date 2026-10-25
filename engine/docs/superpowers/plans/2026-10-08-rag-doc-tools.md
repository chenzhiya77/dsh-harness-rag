# RAG 知识库文档级只读工具（文档感知补强） —— 实施计划

## 范围与交接

一对一件事＝`list_knowledge_documents`＋`read_knowledge_document`（只读、双寻址）＋检索结果补 `doc_id`/`chunk_index`＋门控扩列＋SOUL 语料边界节（＋D1 篇内检索）。成对 spec 同名（`../specs/2026-10-08-rag-doc-tools-design.md`），决策点 D1–D4 见 spec §3（**已裁全甲**：篇内检索随／双寻址／引用不进／限次宽松档）。**已裁口径**：并进首期（A）——RFC v3 声明句／25 条清单加行／审计 re-pin／验收材料补充相＝**随带组**，挂切片移植批次、RFC 发布前完成（spec §5 四处落点）。**实现序**：主树先；切片随带（与 ② 刻度轨恢复同批次机制）。**不碰**：检索主路（召回/重排/引用编号链；除 spec §2.2/§2.3 两处小改）、注入面、前端、编辑族、图谱/wiki 腿。TDD 必做（backend/AGENTS.md）；提交按线拆（工作树有别线未提交内容）。

## 硬约束（执行期注意）／Global Constraints

- **TDD 命令**（照 `backend/Makefile` 的 RUN 变量）：`RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync`；单测＝`$(RUN) pytest tests/knowledge/… -q`（basetemp 用仓外隔离目录、跑完删）；门禁＝`$(RUN) pytest -m "not live" tests/`＋`ruff check`／`ruff format --check` 双净；前端零改动（不跑）。
- **两树同名同契约**：`list_knowledge_documents` / `read_knowledge_document`；切片侧门控集合与工具**同批**扩（`knowledge_scope_middleware.py` 两处），否则 disabled 下漏网。
- **fail-closed 与不信前缀**：`chunk_id` 归属以行校验（存在＋属本 kb＋属本用户）；未绑定/无权限/跨库＝与检索工具同款拒绝文案。
- **有界与诚实**：read limit 默认 20、上限 50；list 全量＋诚实计数；窗口边界收拢必注明「第 K/共 N 片」。
- **只读**：新工具零写库；SOUL 与各树 L7 强制句**同批**修订（两树 L7 非同一句，按各树检索链各自适配），不得只落一半。
- **引用合同（D3=甲）**：list/read 输出零 `citation_no`（不调 `claim_citation_range`、不发 artifact）；过大输出走通用预算，不并入 `{knowledge_search, task}` 特判。
- 真栈仅测试库；临时文档收尾删净；`rag_config.json` 零改动；提交信息英文 conventional；只 stage 本线文件。

## Task 0 — 落点核实

> 动到的文件：只读核实＋spec/plan 回填

- [x] ① 两树对照重核 spec §1 各锚（结果构造 81-87／store 282-326／vector_store 62·316-320·删除路 609/613（切片 :336）／chunker 369／服务 268·364（切片 160·100）／切片门控 25＋两处按名）；② 工具注册点（主树 `config.yaml` tools[]＋rag 资产 `tool_groups`；切片 acceptance config）；③ 两树 SOUL L7 强制句确切行；④ `chunk_positions` 语义重核（活体位置 vs `chunk_index` 差与换算）；⑤ 受害者扫描：结果 payload 新键的既有断言、门控常量改名影响面、SOUL 句改的用例面（点名主树 `test_rag_agent_assembly.py`：`test_builtin_rag_soul_contains_citation_and_refusal_rules`——L7 句改必撞、随 Task 5 同步；`test_rag_group_tools_are_exactly_the_three_retrieval_tools`——断言是超集⇒仍过、名称「exactly」陈旧可顺手更新）、预算中间件特判面（切片 `:665`／主树无）、**按名引用点全集**（切片 `knowledge_scope_admission.py:17-20·36·45-46`／`routers/features.py:122-128`／`community/ragflow/sources.py:82`／前端 `citations.ts:13`·`sources.ts:34`／`src/AGENTS.md:213`＋主树对应面 `citations.ts:17`·`core/pet/tools.ts:56-58`——预期全零改动，核实确认）。

**Task 0 复核结果（2026-10-08 执行；含前序两轮全锚复核）**：
- 两树：主树 `6a17e966e`（本对起点后别线两笔：`aca334119` models／`3f536836c` 本对 spec＋plan；别线未提交：README／`backend/AGENTS.md`／RFC 两行〔ui 线〕／若干文档）；切片 `b9989c8c2` 全净。
- ① 两树对照：spec §1 各锚全中（主树 81-87／282-326／62·316-320／609·613／369／268·364；切片 137／57／336／160／100／25·83·89-98），二轮全锚复核（主树约 20 处、切片约 17 处）零漂移；勘误两条已落（锚点 `17-20·36·45-46`＋审计 re-pin 顺序句；未提交）。
- ② 注册点：主树 `config.example.yaml:697-708`（三件 `group: rag, opt_in: true`）＋本地 `config.yaml:66`（hybrid_search 已在）＋rag 资产 `tool_groups: [rag]` 已核；切片 acceptance config＝实例侧（acceptance-8 配方），切片树内零落点。
- ③ 两树 SOUL L7＝各自第 7 行（主树＝`hybrid_search` 版＋wiki 例外／图谱路／深度检索三句；切片＝`knowledge_search` 版仅 2 件工作流）——「两树非同文」确证。
- ④ `store.py:294-305` docstring＝1-based 活体位置（空洞不占位）⇒ `chunk_index`（DB 列）→ 活体位置换算成立。
- ⑤ 受害面：**零破坏**——主树 `tools/test_hybrid_search.py:63-71` 逐键断言（Task 1 加键不破；RED 可在此加 `doc_id`/`chunk_index` 断言；该件 `@requires_qdrant` integration，建议另配 unit 面自足）＋`tools/test_citation_numbering.py`（只钉 `citation_no` 序列）＋`test_recall_test_api.py`（**recall-test 对 vector hits 做白名单投影**〔`knowledge_service.py:1160-1172`：仅取 chunk_id/doc_name/text/heading_path/page/score/rank〕⇒ 新键**不入**其响应、fakes 亦不破——「同源拾取新键」的设想已现场核否）。SOUL 用例面＝`test_rag_agent_assembly.py:47`（`:63` 钉「任何事实性问题必须至少调用一次」——L7 句改必撞、随 Task 5 同步；`:64`/`:65` 另钉两句）＋`:68`（超集断言仍过、名称「exactly」陈旧可顺手更新）。切片门控：常量仅模块内 4 处引用（`:25`/`:83`/`:90`/`:98`）、测试零导名；`test_knowledge_scope_middleware.py:143`（钉 `disabled` 子串）／`:102`·`:176`（精确列表仅针对 knowledge_search 与启用态）⇒ 集合扩列与文案收正预期不收正破。预算特判：切片 `:665` 在、主树无（维持）；按名引用点全集全部零改动（清单＝spec §2.4，已核）。
- 结论：无漂移、无新增勘误；开工可直接进 Task 1。

## Task 1 — 检索结果补字段（TDD）

> 动到的文件：`harness/deerflow/tools/builtins/hybrid_search_tool.py`＋对应测试

- [x] RED：payload 断言 `doc_id`（＋`chunk_index`）出现；GREEN：item 构造（主仓 L81-87／切片 L137 起）补键——`chunk_index` 取 DB 行键（两树 payload 无此键）、`doc_id` payload／行俱有——＋docstring 提及结果含 `doc_id`/`chunk_index`（供 read 追问）；neuter 一次（去键恰红）。
- [x] 门禁：knowledge 面定向。

**实测（2026-10-08，Task 1）**：
- RED：新增自足 unit 件 `test_items_carry_doc_id_and_chunk_index_for_follow_up_reads`（Qdrant-free；payload 夹具故意无 `chunk_index` ⇒ 钉该键必须取自业务库行）＋`test_hybrid_search_end_to_end` 补两断言；恰红 2 件（`KeyError: 'doc_id'`）、旁证 4 件绿。
- GREEN：`hybrid_search_tool.py` item 构造补 `doc_id`/`chunk_index`（两者均取 DB 行）＋docstring 明示两字段；断言形态＝item（工具返回 payload）级——**Qdrant payload 本体零改动**。neuter（去两键）恰红 2 件、还原复绿。
- 门禁（定向）：`tests/knowledge/tools/` **59 passed**；`test_recall_test_api.py` **21 passed**（recall-test 白名单投影受害面实跑确认）；ruff check／format --check 双净（两件）。
- 提交：`8b184cbc9`。

## Task 2 — list 工具（TDD＋注册）

> 动到的文件：新模块 `harness/deerflow/tools/builtins/knowledge_documents_tool.py`＋测试＋`config.example.yaml`／本地 `config.yaml`（注册双落）

- [x] RED：多文档/混合状态/诚实计数；未绑定＝引导；空库；跨用户＝拒绝。GREEN：新模块（镜像检索工具写法：`@tool(parse_docstring=True)`＋`resolve_kb_scope` fail-closed＋**主树模块级 import**（照 `hybrid_search_tool.py:18-25`；函数内 import 是切片形态、见下条）；注册面可导）；主树注册两条（`group: rag, opt_in: true`）**双落**：`config.example.yaml`（tracked 模板）＋本地 `config.yaml`（gitignored 运行时）；rag 资产 `config.yaml` 零改动（`tool_groups: [rag]` 组已在）。
- [x] 切片形态草稿（函数内 import `deerflow_knowledge`）——随带组备件，本对不动切片树；机械变换口径见下实测末行，草稿块已随 Task 8 交接单 §1 承载。

**实测（2026-10-08，Task 2）**：
- RED：新件 `test_knowledge_documents_tool.py`（5 例：混合状态＋诚实计数、零组省略、空库、未绑定、跨用户）——模块未建 ⇒ 采集错恰红。
- GREEN：新模块 `knowledge_documents_tool.py`（`_list_documents_impl`＋`@tool(parse_docstring=True)` 包层；主树模块级 import；`resolve_kb_scope`＋`can_access` fail-closed；返回 `documents=[{doc_id,name,status,chunk_count}]`＋「共 N 篇（就绪 X · 处理中 Y · 失败 Z）」零组省略、空库文案「当前知识库中还没有文档。」）；neuter（拆 `can_access` 守卫）恰红 1 件、还原复绿。
- 注册双落：`config.example.yaml`（注释＋`list_knowledge_documents` 条目）＋本地 `config.yaml`（同条；gitignored 不进提交）——**微裁落法**：read 条目留待 Task 3（避免组装面引用未实现函数）。
- 门禁（定向）：`tests/knowledge/tools/`＋`test_rag_agent_assembly.py` **73 passed**（assembly 夹具读 `config.example.yaml` ⇒ 注册面经真实解析）；本地 `config.yaml` YAML 解析实核含新条；ruff check／format --check 双净（两新件）。
- 提交：`009fb03b1`。
- 切片形态草稿（备件）：机械变换口径＝imports 从模块级改函数内 `from deerflow_knowledge.*`（照切片 `hybrid_search_tool.py:78-93`）＋拒绝文案取切片 `access.py` 常量；草稿块随 Task 8 交接单落（本对不动切片树）。

## Task 3 — read 工具（TDD）

> 动到的文件：同 Task 2 模块＋测试

- [x] RED：①`doc_id` 分页（offset/limit/has_more/边界）②`chunk_id` 居中窗口（`#` 序号→活体位置换算、边界收拢、第 K/共 N）③非 `ready` 拒绝（含状态文案）④跨库/不存在拒绝 ⑤伪造 `chunk_id` 前缀＝拒绝 ⑥超长单条：截断并标 `truncated`（不静默）。GREEN＋neuter（换算拆掉恰红、守卫拆掉恰红）。
- [x] 门禁定向。

**实测（2026-10-08，Task 3）**：
- RED：同文件追加 6 例（分页：首页/末页/offset 越界/上限钉（999→50）＋条目整字典断言；居中窗口：**空洞换算**〔索引 0,1,2,4,5⇒活体位次〕＋左右边界收拢＋第 K/共 N；非就绪：indexing 与 failed 各一；拒绝族：缺失/跨库/伪造 `d-1#9999`/无参/零切片 ready 文；截断：2100→2000＋`truncated` 且短条无该键；未绑定与越权）——`_read_document_impl` 未实现 ⇒ 采集错恰红。
- GREEN：模块补 `_read_document_impl`＋`read_knowledge_document` 包层＋助手（`_doc_meta`／`_ready_document`／`_shape_items`）；常量 `_DEFAULT_LIMIT=20`／`_MAX_LIMIT=50`／`_MAX_ITEM_CHARS=2000`；窗口宽＝`min(limit,total)`、`start=max(1,min(K−half,total−window+1))`；`chunk_id` 优先于 `doc_id`；归属一律以行校验（不拆前缀）。测试自纠一处：窗口 3-5 已达尾 ⇒ `has_more=False`（原期望写错，以代码为准更正）。
- neuter×2：①换算拆掉（`chunk_index+1` 顶替 `chunk_positions`）⇒恰红窗口件；②守卫拆掉（去切片归属检查）⇒恰红拒绝件；均还原复绿。
- 注册双落补 read 条目（example 注释转复数＋entry；本地 `config.yaml` 同条）——本地解析实核两键在。
- 门禁（定向·终态）：`tests/knowledge/tools/`＋`test_rag_agent_assembly.py` **80 passed**；ruff check／format --check 双净（期间修一处 E501：read docstring 超长段折行）。
- 提交：`c15e7f151`。

## Task 4 — 篇内检索（D1=甲，随本对）

> 动到的文件：检索工具＋`knowledge/vector_store.py`（`hybrid_query` 可选 `doc_id`）＋测试

- [x] RED：`doc_id` 过滤命中/未命中/跨库；GREEN：工具可选入参＋filter 一处＋docstring。

**实测（2026-10-08，Task 4）**：
- RED：三件恰红——向量库 `test_hybrid_query_filters_by_doc_within_kb`（命中/未命中/跨库〔kb-2 的 doc-9 跨库查询〕）、工具 unit（`doc_id` 原样落到 `hybrid_query` 调用）、工具 integration（doc 范围命中＋`doc-elsewhere` 未命中文案）。
- GREEN：`vector_store.py` `hybrid_query` 加可选 `doc_id`（并进同一 scope filter、两条 prefetch 共用；`kb_filter`→`scope_filter` 更名）；`hybrid_search_tool.py` impl 加 `doc_id`＋透传，包层加入参＋docstring（Use 第 3 条＋Args 条目）。
- neuter：拆 filter 两行 ⇒ 恰红向量库件＋工具集成件（unit 转发断言仍绿，符合预期）；还原复绿。
- 门禁（定向·终态）：`tests/knowledge/tools/`＋`test_vector_store.py`＋`test_recall_test_api.py` **108 passed**（recall-test 为 `hybrid_query` 受害面，签名加法零破坏）；ruff check／format --check 双净（四件）。
- 提交：`9123bfb8c`。

## Task 5 — SOUL＋门控收口

> 动到的文件：`agents/assets/rag/SOUL.md`（两树各自适配，非逐字同文）＋切片 `knowledge_scope_middleware.py`（草稿）

- [x] 主树 SOUL：新增「语料边界问题」节（工作流＋D4 限次取值）＋L7 强制句两分修订；切片版草稿（按切片两件检索链适配；两树 L7 非同一句）。（主树干完；切片版草稿口径见下实测末行）
- [x] 切片门控集合扩列草稿（`{knowledge_search, list_knowledge_documents, read_knowledge_document}`，两处）＋拒绝文案收正（`_disabled_tool_message`：ToolMessage `name=` 与 content 按被拦工具名回填／泛化；`access.py:37` 同句一并核——第三处同句 `ragflow/tools.py:539` 属 RAGFlow 自答、不随扩列，维持不动）。（草稿口径见下实测末行；物理块已随 Task 8 交接单 §3 承载）

**实测（2026-10-08，Task 5·主树）**：
- RED：`test_builtin_rag_soul_contains_citation_and_refusal_rules` 增三条（`语料边界` 节在、两工具名在、限次 `4 个窗口`/`6 次` 在）⇒ 恰红 1 件。
- GREEN：主树 SOUL——L7 句尾补「语料边界类问题例外（有哪些文档 / 某篇讲什么 / 除了 X 还有什么 / 第几片）→ 见下节」（原钉句「任何事实性问题必须至少调用一次」逐字保留，用例 `:63`/`:64`/`:65` 不动）；新增「语料边界问题（枚举 / 结构 / 定位）」节 5 条：清单枚举（如实转状态计数）、doc_id 分页通读、chunk_id 居中窗口（第 K/共 N 片）、**D4 宽松档限次（≤4 窗口/文档、≤6 次/轮）**、引用两分（事实走 `[n]`；枚举/结构/定位直接 list/read、不虚构、出处用文字）。
- 门禁（定向）：`test_rag_agent_assembly.py` **9 passed**；另三 SOUL 消费面（`test_soul_prompt_injection`／`test_custom_agent`／`test_agent_storage_backend`）**83 passed**；ruff 双净。
- 提交：`e0194c5ae`。
- **切片草稿（备件，物理块随 Task 8 交接单承载；本对不动切片树）**：① 切片 SOUL 版——L7＝`knowledge_search` 版（「任何事实性问题必须至少调用一次 `knowledge_search`」逐字保留）、「语料边界问题」节同义改写（删 wiki/图谱/深度检索指代——切片检索链仅 2 件工作流）；② 门控集合——`_KNOWLEDGE_SEARCH_TOOL_NAME` → `_KNOWLEDGE_TOOL_NAMES = frozenset({knowledge_search, list_knowledge_documents, read_knowledge_document})`，两处按名生效同扩（tools 过滤 `:83`＋拦截 `:89-98`）；③ 拒绝文案收正——`_disabled_tool_message` 的 `name=` 与 content 按被拦工具名回填（保持 `disabled` 子串以兼容 `test_knowledge_scope_middleware.py:143`）；`access.py:37` `SCOPE_DISABLED_MESSAGE` 同句随核（新工具沿用同模板）；`ragflow/tools.py:539` 维持不动。

## Task 6 — 真栈验收（主树）

> 动到的文件：零（真栈验证＋临时件收尾）

- [x] 两问回归＋追问链＋篇内检索一问（D1=甲）；临时件收尾、配置零改动。

**实测（2026-10-08，Task 6·主树真栈）**：
- 实例：主树隔离实例——gateway `:8101`（主树 venv；env 三件＋`.env`）／独立 sqlite＋home／**新 Qdrant 容器 `df-acc-t6-qdrant` `:6398`**（避与 acc8 的 :6399 集合相撞）；config＝主树 `config.yaml` 复制＋三处改（sqlite 绝对化／`allow_host_bash:false`〔W9 守卫〕／qdrant :6398）、rag_config 复制自 acceptance-8——**repo 配置零改动**；证据档 `E:/app-model/deer-flow-scratch/acceptance-t6/acceptance-evidence.md`＋转写 `evidence.txt`。
- 语料：验收库四件（测试10／鹦鹉提示词／部署手册／旅行清单，各 1 片）＋多切片《长文样章.md》（**8 片**）。
- ①「测试10中有哪些内容呀」：`list`→`read(doc_id)`→五部分枚举 ✓；②「除了鹦鹉提示词还有什么」：`list` 有据枚举 4 篇到边界 ✓＋「另外三篇都讲了什么」：**并行 3×`read(doc_id)`** 逐篇内容枚举 ✓；③ 追问链：「鹦鹉提示词里写了什么」`hybrid_search`（结果带 `doc_id`/`chunk_index`/`citation_no`）＋`graph_search`→带 `[1]` 引用 ✓ →「这条切片前后也读一下」`read(chunk_id)` 窗口「第 1/共 1 片」✓ →「整篇都读一下」模型复用已读全文（单切片文档，够答即止）；多切片整篇读由 B2/D 覆盖；④ **篇内检索（D1=甲）**：「只在长文样章.md 这一篇里检索」→`hybrid_search(query, doc_id, top_k=5)`→命中第五章切片→`read(chunk_id, limit=3)`→带引用答案 ✓（首轮收尾后发现的漏项：重建 Qdrant＋`POST /reindex` 后补测）。
- **模型侧波动登记（非工具缺陷）**：D 首跑「整篇列章节」误报「共 7 章」；库内直查证实 `#0007` 含「第八章 总结」、读取结果含 8 条；D2 同问复跑 **8 章全对**且切片分布逐条相符 ⇒ 模型偶发误读（对照坐实）。
- 收尾：gateway 停、容器停删、端口释放、主树工作树零临时件 ✓。

## Task 7 — 门禁＋提交＋回填

> 动到的文件：spec/plan 回填＋验收反馈记录第八节状态行同步＋`backend/AGENTS.md`／`README.md`（文档同步面）

- [x] 全量门禁（后台跑）＋提交链（英文）＋spec/plan 状态回填＋验收反馈记录第八节状态行同步＋文档同步面：`backend/AGENTS.md` 两处（L968「the three retrieval tools」、L1264 工具清单）＋`README.md` 两处（L32「三个检索工具」、L74-76 清单）随工具组扩为五件修订；快照类（`docs/HARNESS_EXECUTION_FLOW_MAP.md`／`docs/AGENT_HARNESS_VISUALIZATION_RESEARCH.md`）不追、登记。

**实测（2026-10-08，Task 7）**：
- 全量门禁（后台·仓外 basetemp·完整落盘 `E:/app-model/deer-flow-scratch/pytest-t7.log`）：**153 failed / 13067 passed / 109 skipped（18:20）**——红带内（本机漂移区间 144–164；skip 109 与基线一致）；knowledge 面红＝登记族全数（缺 key 对 ×2／parser 对 ×2／`test_migration_0016` ×2）＋登记 flake 族（`pnpm_script` ×3／`review_changed_public_skills`／`invoke_acp_agent`）；**本对碰过的文件零红**；ruff 全树双净（`All checks passed!`＋`1329 files already formatted`）。
- 文档同步面（只 stage 本线 hunk：HEAD 重建 mine-only→入 index→还原工作树，别线在飞改动原样留工作区）：`backend/AGENTS.md` 两处（路由行「plus the two document-level read-only tools」；Retrieval tools 条目→五件＋`doc_id` 作用域）＋`README.md` 两处（安全边界行→「rag 工具组的五个工具」；新增「### 文档级读取（只读，共用同一绑定）」小节）。
- 状态回填：spec Status（主树已全落）＋验收反馈记录第八节状态行（已开工/全落注记）＋本纪行；提交链：Task 0–7 全在 `feat/rag-knowledge-base`（未推）。
- 快照类登记：`docs/HARNESS_EXECUTION_FLOW_MAP.md`／`docs/AGENT_HARNESS_VISUALIZATION_RESEARCH.md` 不追（按计划）。
- 提交：`1587cfce6`（文档同步＋状态回填）＋本笔（纪行）。

## Task 8 — 随带组交接单（切片移植批次）

> 动到的文件：交接单（挂 ② 刻度轨恢复同批次）

- [x] 交接单：切片形态工具模块＋结果字段（切片同段）＋门控集合（两处）＋门控文档行同步（切片 `middlewares/AGENTS.md:47`「blocks `knowledge_search`」→三件套表述）＋SOUL（两树各自适配）＋配置（acceptance）＋验收相（同两问回归，基准会话 `c4af859d`）＋口径四处（RFC L17 句／清单行／审计 re-pin／材料补充相——发布前完成；**审计 re-pin 须在 RFC 全部在飞改动落定之后**〔本对 L17 句＋ui 线 §配置位置 两行〕对最终稿重算 md5/行数，否则 pin 立刻又陈旧；pin 现值 `5f9eeaab…` 与 RFC HEAD 逐字相符、346 行——被刷新的触发点正是这两笔落定）。
- [x] **提交前四门复核**（口径＝`../specs/2026-10-08-rag-slice-ci-fix-design.md` §2.5）：切片树任何提交前必过——① `cd backend && make lint`（ruff check＋format 双净）② 仓库根 `python scripts/check_agent_guidance.py --base-ref <基座> --head-ref HEAD` → **errors=0** ③ `cd frontend && pnpm format`（prettier 零 diff）④ 后端定向 pytest（口径按批次）；既有绿项（`uv lock --check`／`pnpm lint`・`typecheck`・`build`）随门联跑；凡动 `.github/workflows/*` 的批次，另以推送后首跑复核（本地无 GitHub workflow 校验器）。（切片随带批次已执行并逐条跑过——见下实测；本框随批次收口）

**交接单（切片移植批次执行用；本对只写不落）**

- **批次口径**：切片随带批次（与 ② 刻度轨恢复同批次机制；A 对切片批已落——切片树 tip `548f54706`、工作区净，执行前先核 tip）。改动全部落切片树 `slice/knowledge-local-vector-retrieval`；提交按线拆、信息英文 conventional；每笔提交前过 §9 四门。
- **§1 切片形态工具模块**（新件 `backend/packages/harness/deerflow/tools/builtins/knowledge_documents_tool.py`）：源＝主树件（`009fb03b1`＋`c15e7f151`）逐字搬运＋两处机械变换——① imports 下移**函数内**并改 `deerflow_knowledge.*`（照切片 `hybrid_search_tool.py:78-93` 现行形态：模块级仅 `langchain.tools.tool` 与 `deerflow.tools.types.Runtime`）；② 文案取 `deerflow_knowledge.access` 常量。契约逐字同主树（`_DEFAULT_LIMIT=20`／`_MAX_LIMIT=50`／`_MAX_ITEM_CHARS=2000`；`_doc_meta`／`_ready_document`／`_shape_items`＋两 impl＋两 `@tool(parse_docstring=True)` 包层）。
- **§2 结果字段＋篇内检索（切片同段小改）**：切片 `hybrid_search_tool.py` item 构造（`:137` 起）补 `doc_id`／`chunk_index`（均取 DB 行）＋docstring 两字段句（照 `8b184cbc9`）；`deerflow_knowledge/vector_store.py` `hybrid_query` 加可选 `doc_id` 并进同一 filter（两条 prefetch 共用；`kb_filter`→`scope_filter`，照 `9123bfb8c`）；检索工具加 `doc_id` 入参＋透传＋docstring（Use 第 3 条＋Args）。
- **§3 门控集合（两处）**：`agents/middlewares/knowledge_scope_middleware.py:25` 单名常量 → `_KNOWLEDGE_TOOL_NAMES = frozenset({knowledge_search, list_knowledge_documents, read_knowledge_document})`；同扩两处按名生效（tools 过滤 `:83`＋拦截 `:89-98`）。拒绝文案收正：`_disabled_tool_message` 的 `name=` 与 content 按被拦工具名回填（保持 `disabled` 子串——兼容 `tests/test_knowledge_scope_middleware.py:143`）；`deerflow_knowledge/access.py:37` `SCOPE_DISABLED_MESSAGE` 同句随核（新工具沿用同模板）；`community/ragflow/tools.py:539` 维持不动。
- **§4 门控文档行**：切片 `agents/middlewares/AGENTS.md:47`「blocks `knowledge_search`」→ 三件套表述。
- **§5 SOUL（切片版）**：切片 `agents/assets/rag/SOUL.md`——L7（`:7`，`knowledge_search` 版）句尾补「语料边界类问题例外（有哪些文档 / 某篇讲什么 / 除了 X 还有什么 / 第几片）→ 见下节」＋新增「语料边界问题（枚举 / 结构 / 定位）」节 5 条（删 wiki／图谱／深度检索指代——切片链仅 2 件工作流；D4 限次同文 ≤4 窗口、≤6 次/轮）；切片 `test_rag_agent_assembly.py` SOUL 断言同批补三条（照主树 `e0194c5ae`）。
- **§6 配置（acceptance）**：切片 acceptance 实例 config `tools[]` 补两条（`list_knowledge_documents`／`read_knowledge_document`，`group: rag, opt_in: true`，`use: deerflow.tools.builtins.knowledge_documents_tool:*`）；切片树 tracked `config.example.yaml` 本批不动（plan 口径＝切片侧落 acceptance；发布前随口径四处复核再定是否同步 example——登记）。
- **§7 验收相（切片）**：acceptance-8 配方实例（gateway `:8101`／Qdrant `:6399`）跑同两问回归（基准会话 `c4af859d` 先后对照）——①「测试10中有哪些内容呀」list→read→清单；②「除了鹦鹉提示词还有什么」有据枚举到边界；③篇内检索一问（D1）；临时件收尾删净。
- **§8 口径四处（发布前完成）**：① RFC v3 L17 句（`docs/plans/2026-09-22-local-knowledge-base-rfc-v3.md:17`）「…一个检索工具…」→ 含文档清单/读取（只读）的表述；② 工作清单（`docs/plans/2026-10-06-rfc-v3-eval-workitems.md`）加一行「文档级只读工具组（list/read＋结果补 doc_id＋门控＋SOUL）」＋同步 L55 旧句；③ 审计件 re-pin（`docs/plans/2026-10-06-rfc-v3-audit-findings.md`）——**须在 RFC 全部在飞改动落定之后**（本对 L17 句＋ui 线 §配置位置 两行）对最终稿重算 md5/行数（pin 现值 `5f9eeaab…`＝RFC HEAD、346 行）；④ 切片验收材料补相（切片移植 plan Task 8 材料行＋补充相记录）。
- **§9 四门复核**：口径＝`../specs/2026-10-08-rag-slice-ci-fix-design.md` §2.5（见上框四条），批次执行期逐条跑；既有绿项随门联跑。
- **§10 提交链（预期 3–5 笔）**：① 结果字段＋篇内检索（feat）→ ② list/read 模块＋acceptance 注册（feat）→ ③ 门控集合＋文案＋AGENTS 行（fix/feat）→ ④ SOUL＋用例（feat）→ ⑤ 回填/材料（docs，如拆）。用例面：切片 `tests/knowledge/tools/` 同批扩（结果字段/双寻址/守卫/门控三件套）。

**实测（2026-10-08，Task 8·切片随带执行）**：
- 切片树 4 笔（工作区净）：`b8d584554` 结果字段＋篇内检索（item 补 `doc_id`/`chunk_index`＋`hybrid_query` 可选 `doc_id`＋工具入参/透传/docstring）／`d4542a355` list/read 模块（函数内 `deerflow_knowledge.*` import，契约逐字同主树）／`13e97ddc1` 门控集合（`_KNOWLEDGE_TOOL_NAMES` 三件套＋两处按名生效）＋文案按被拦工具名回填＋`middlewares/AGENTS.md:47` 行同步／`0ffefc916` SOUL 语料边界节＋assembly 断言三条。
- TDD：RED（新模块采集错＋10 红 1 错；24 绿＝既有面完好）→ GREEN（定向 **62 passed**：`tests/knowledge/tools/`＋`test_vector_store`＋`test_knowledge_scope_middleware`＋`test_rag_agent_assembly`）。
- 四门：① `make lint` 双净（ruff check All passed／**1970 files already formatted**）② guidance **0 errors**（40 AGENTS.md；1 条 AG002 警告＝`middlewares` 链 97,988B 逼近硬限 98,304〔余 316B〕——**diff 作用域警告**：链在基座即超 soft 被祖父化、本笔触碰即报，非错误，余量登记）③ `pnpm format` 全过 ④ 定向 pytest 62 passed；联跑 `uv lock --check` ✓＋`pnpm lint`／`typecheck`／`build` 三件全过（exit 0）。
- 切片形态与主树同契约（`knowledge_search` 的 artifact 配对不变；拒绝文案三态沿用切片 `access.py` 常量；`config.example.yaml` 本批不动——acceptance 实例侧注册，见交接单 §6）。
- 余：切片验收相（交接单 §7）＋口径四处（§8，含审计 re-pin——须等 RFC L17＋ui 两行落定）。
