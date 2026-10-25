# RAG 知识库文档级只读工具（文档感知补强） —— 设计

**Status:** 已裁（D1–D4 全甲，2026-10-08）；**主树已全落**（Task 0–6 交付＋Task 7 收口，2026-10-08；真栈两问回归＋追问链＋篇内检索全过——见 plan 纪行与提交链）；**切片随带已落**（Task 8 交接单＋实施四笔、四门全绿；真栈七轮全过——W18）。载体＝成对（本文件＋`../plans/2026-10-08-rag-doc-tools.md`）；口径＝**并进首期**（A，2026-10-08 已裁）；实现序＝**主树先**（切片随带，与 ② 刻度轨恢复同批次机制）。来源：验收实例会话发现（thread `c4af859d`）＋两树核实（见验收反馈记录第八节）＋全锚复核（2026-10-08，勘误随首次提交落定）。

**本对一件事：把「文档」从只能被检索意外命中的对象，提升为可枚举、可按名/按编号定位的一等对象——只读、薄壳。** 现状（两树同源）：会话侧感知只有「按正文语义检索」一条通道；「库里有哪些文档」「这篇还有什么」不可枚举（基准会话实证：拒答与"能召回的主要是上述两类"）。数据层关联全部已在（chunk↔doc、有序切片、按 id 批量取），缺的只是模型面：两个只读工具＋检索结果里可追下去的标识＋门控与行为配套。

## 1. 现状与缺口（锚点）

- **模型可见的检索结果**（两树同段）：`{chunk_id, text, doc_name, page, heading_path}`（主仓 `backend/packages/harness/deerflow/tools/builtins/hybrid_search_tool.py:81-87`；切片同构、item 构造 `:137` 起）——**doc_name 有；doc_id、chunk_index 无**。
- **数据层全就绪**：Qdrant payload 含 `doc_id`/`doc_name`（主仓 `knowledge/vector_store.py:316-320`）＋payload 索引 `(kb_id, doc_id, entities)`（主仓 `:62`；切片 `_CHUNKS_PAYLOAD_INDEXES` `:57`）；`chunk_id = f"{doc_id}#{index:04d}"`（`knowledge/chunker.py:369`，两树同）；切片有序分页 `list_chunks(order_by=chunk_index, offset/limit)`＋`count_chunks`＋`chunk_positions`（1-based 活体位置）（主仓 `knowledge/store.py:282-305`）；按 id 批量取 `get_chunks_by_ids`（`:326`）；同款 `doc_id` filter 已在删除路使用（主仓 `delete_by_doc` `:609`·`:613`；切片 `:336` 同款）。
- **服务/REST 已在**（UI 在用、工具面零）：`service.list_documents`（`app/gateway/services/knowledge_service.py:268`）、`service.list_document_chunks`（`:364`，items/total/offset/limit；切片同款锚：`store.py:160`／`knowledge_service.py:100`）。
- **工具面**：两树 rag 工具组各只有检索型工具（主树 `hybrid_search` 等／切片 `knowledge_search`）；无文档级工具。主树门控＝工具内 `resolve_kb_scope` fail-closed（无中间件层）；切片门控＝`knowledge_scope_middleware.py:25` 单名常量（两处按名生效：tools 过滤 L82-83＋请求拦截 L89-98）。

## 2. 方案

### 2.1 新工具组（只读两件，两树同名）

命名与实现形态：命名对齐上游货架先例 `list_project_documents`/`read_project_document` 风格；实现镜像既有检索工具——`@tool(parse_docstring=True)`＋runtime 门控＋`resolve_kb_scope` fail-closed；import 形态按各树现行件：**主树模块级**（照主树 `hybrid_search_tool.py:18-25`——harness 内知识模块恒在，主树无扩展概念）、**切片函数内**（照切片件 `:78-93`——注册面须在知识扩展缺席时可导入）；注册落点＝`config.example.yaml`（tracked 模板）＋本地 `config.yaml`（gitignored 运行时）双落 `tools[]`（`group: rag, opt_in: true`；rag 资产 `config.yaml` 零改动、组已在；切片侧落 acceptance config）：

- **`list_knowledge_documents()`** —— 当前绑定库的文档清单：`{documents: [{doc_id, name, status, chunk_count}], message}`；全量返回＋诚实计数（如「共 N 篇（就绪 X · 处理中 Y · 失败 Z）」）；空库/未绑定/无权限按既有拒绝、引导文案（与检索工具同款）。
- **`read_knowledge_document(doc_id=None, chunk_id=None, offset=0, limit=20)`** —— 按文档读切片（双寻址，D2=甲）：
  - `doc_id` 模式：按 `offset/limit` 分页（默认 20、上限 50），返回 `{doc: {doc_id, name}, items: [{chunk_id, chunk_index, heading_path, page, text}], total, offset, has_more}`；
  - `chunk_id` 模式（优先）：服务端定位该片（`#` 尾部序号→活体位置）返回**以该片为中心的窗口**（宽＝limit，边界收拢并在 message 注明「第 K/共 N 片」）——即「前后切片」；
  - 守卫：doc/chunk 不存在、属其他库、非 `ready`（如解析中/失败）→ 明确错误文案（含状态），不空返。
  - 截断诚实标注：单条超长按上限截断并标 `truncated`（不静默；上限随实现定、用例钉死）。

### 2.2 检索结果补字段（追问链凭据）

`hybrid_search_tool` 结果 item 增 `doc_id`＋`chunk_index`（主仓 `:81-87`／切片 `:137` 起，同段小改）：`doc_id`＝追下去（read/篇内检索）的凭据（payload 与 DB 行俱有）；`chunk_index`＝直接算出前后窗口（取自 `get_chunks_by_ids` 返回的 DB 行键——两树 payload 均无 `chunk_index`；无它也能从 `chunk_id` 尾部拆，属锦上添花）。**不加** `position`（活体位置由 read 端换算，避免双口径）。同批更新检索工具 docstring：明示结果含 `doc_id`/`chunk_index`（可用 `read_knowledge_document` 追问）。

### 2.3 篇内检索（D1=甲，随本对）

检索工具加可选 `doc_id` 参数：并进现有 kb filter（Qdrant 单处）——`(kb_id, doc_id, entities)` 索引已建，改动≈一处 filter＋一个入参＋docstring。

### 2.4 门控与行为

- **切片树**：`_KNOWLEDGE_SEARCH_TOOL_NAME` 单名常量→集合 `{knowledge_search, list_knowledge_documents, read_knowledge_document}`，两处按名生效同扩。
- **主树**：无中间件；新工具按既有模式内置 `resolve_kb_scope` fail-closed（未绑定/无权限＝拒绝文案）。
- **其余按名引用点（零改动核实清单）**：切片 `knowledge_scope_admission.py:17-20·36·45-46`（准入 provider＝检索工具全名；`:36`＝工具名查找行、`:45-46`＝`tool_groups` 检查）、`routers/features.py:122-128`（scope 感知谓词）、`community/ragflow/sources.py:82`（durable export 过滤 `{knowledge_search, task}`）、前端 `citations.ts:13`／`sources.ts:34`（来源区过滤）、`src/AGENTS.md:213`——全部只认**检索条目/检索 artifact**（D3=甲 下新工具不进引用体系），均零改动；主树对应点同机制（前端三件套 Set `citations.ts:17` 跳过新工具、`core/pet/tools.ts:56-58` 分类映射属观察面可不动），已核；本清单随 Task 0 ⑤ 全量重扫复核。
- **SOUL**（`backend/packages/harness/deerflow/agents/assets/rag/SOUL.md`，两树同路径各自适配）：新增「语料边界问题」节——有哪些文档/这篇讲什么/除了 X 还有什么/第几片 → 走 list/read；**与各树 L7 强制句同批修订**（⚠️ 两树并**非同文**：切片 L7＝「任何事实性问题必须至少调用一次 `knowledge_search`」（检索工作流 2 件）；主树 L7＝`hybrid_search` 版且另含 wiki 唯一例外／图谱路／深度检索模式三句——按各树检索链各自适配措辞），两分：事实性证据走检索（`[n]` 引用不变）；枚举/结构/定位类回答可直接依据 list/read，不虚构。
- 读取限次（D4=甲 宽松档）：同文档续读 ≤4 窗口、单轮读取 ≤6 次；主控＝够答即止。
- 输出预算（面 3 附项）：read/list **不并入** `tool_output_budget_middleware` 的 `{knowledge_search, task}` 特判——该特判护的是 citation↔来源配对（切片侧由 `budget_source_artifact` 承载），D3=甲 下 read 无引用可护、过大输出走通用预算（截断/外置）；两树现状已核（切片 `:665` 有特判、主树该中间件本就无）。

### 2.5 引用合同（D3=甲，不进）

list/read 输出**不进** `citation_no` 引用体系（v1）：引用编号空间仍只属检索证据；read 返回带来源头（文档名/片序）供文字级出处说明。不选"进"的原因：同一片既被读又被检索命中时编号有二义，且前端来源区要扩容。

## 3. 决策点（已裁 2026-10-08：全甲）

**✅ 裁定：D1=甲（篇内检索随）／D2=甲（双寻址）／D3=甲（引用不进）／D4=甲（限次宽松档 ≤4 窗口/≤6 次）；乙/丙各案均不取。**

- **D1 篇内检索随本对？** 甲｜随（荐）：白送级改动（索引已建），"在这篇里找 X"闭环。乙｜留后：省一处改动，篇内找只能整篇翻。
- **D2 read 寻址形态？** 甲｜双寻址（荐）：`chunk_id` 或 `doc_id`+`offset`——直接满足「按编号查内容」「看前后」。乙｜仅 `doc_id`+`offset`：少一个参数；"按编号"要模型自拆 `#` 算偏移（易错）。
- **D3 引用合同？** 甲｜不进（荐，理由见 2.5）。乙｜进（read 也 `claim_citation_range`＋artifact；覆盖全、代价是编号二义与来源区扩容）。
- **D4 SOUL 读取限次取值？** 甲｜宽松（荐）：同文档续读 ≤4 窗口、单轮读取 ≤6 次（先保"能通读中等文档"，主控＝够答即止）。乙｜收紧：≤2 窗口、≤3 次（省 token，长文穷举中途停）。丙｜不设上限（靠输出预算与模型自控）。

## 4. 硬约束

- **只读**：新工具零写库；不破切片「切片只读」边界与编辑族后置。
- **fail-closed**：未绑定/无权限/跨库对象 → 与检索工具同款拒绝；**不信 chunk_id 前缀**（服务端以行校验归属，不"拆前缀即算授权"）。
- **有界与诚实**：list 全量＋真实计数；read 分页上限 50；单条超长截断必标 `truncated`（不静默）；窗口边界收拢必注明「第 K/共 N 片」。
- **不动检索主路**：除 2.2 结果字段与 D1 的可选 filter，召回/重排/引用编号链零改动。
- 两树同名同契约；切片门控集合必须同批扩（否则 disabled 下新工具漏网）。
- SOUL 强制句与新增节**同批**改，不得只落一半。
- 提交信息英文；TDD；真栈临时件收尾删净。

## 5. 首期口径（A＝并进首期，2026-10-08 已裁）

文档级只读工具组并入首期声明。四处落点（**随切片移植批次、RFC 发布前完成**——与「说了没做＝重大错误」纪律一致）：

1. RFC v3 声明句（`docs/plans/2026-09-22-local-knowledge-base-rfc-v3.md:17`）：「…索引 → **一个检索工具** → 可核验引用…」改为含文档清单/读取（只读）的表述；
2. 工作清单（`docs/plans/2026-10-06-rfc-v3-eval-workitems.md`）加一行「文档级只读工具组（list/read＋结果补 doc_id＋门控＋SOUL）」并同步「首期只含向量腿＋一个检索工具」旧句；
3. 审计件 re-pin（`docs/plans/2026-10-06-rfc-v3-audit-findings.md` 的 md5/行数 pin；**须在第 1 项 RFC L17 落改、且全部在飞 RFC 改动落定之后**对最终稿重算——pin 现值 `5f9eeaab…`＝RFC HEAD 版，被刷新的触发点即在飞两笔：L17 句＋ui 线 §配置位置 两行）；
4. 切片验收材料补相（Task 8 材料行＋补充相记录）。

## 6. 验收

1. 单测：list（有绑定/未绑定/空库/状态混合/计数诚实）；read（双寻址各一、居中窗口与边界收拢、未就绪拒绝、跨库拒绝、分页 has_more、超长截断标注）；结果字段（新字段出现在 payload）；门控（切片 disabled⇒两工具不可调/被拦；主树无绑定⇒拒绝文案）。
2. **真栈两问回归**（主树先）：①「测试10中有哪些内容呀」＝list→read→内容清单；②「除了鹦鹉提示词还有什么」＝通读→有据枚举到文档边界（对基准会话 `c4af859d` 的行为差）。③追问链：检索命中（带 doc_id）→read 前后片→整篇。临时件收尾删净、配置零改动。
3. 切片相：随带批次后，验收实例同两问回归（基准会话先后对照）。
4. 门禁：knowledge 面全量＋ruff 双净（主树）；切片随带批次同理。

## 7. 非目标

- **注入面**（每请求 `<documents>` 索引注入）不做、后置——模型按需调用即可闭环；上游货架同款形态留作将来加档先例（本对零模型输入改动）。
- 前端零改动（工具面＋SOUL 即可用；UI 已有文档面板）。
- 编辑族、图谱/wiki 腿、检索主路零改动。
