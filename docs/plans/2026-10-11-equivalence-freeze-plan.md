# Harness RAG → DSH 插件 T2 工具面等价移植 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-11-equivalence-freeze-spec.md](../specs/2026-10-11-equivalence-freeze-spec.md)
**Status:** 未开工 · 未提交（Task 0–7 均未开始）——2026-10-11 立账（冻结清单已整批拍板：D1乙/D2乙/D3丙/D4三级序/D5甲/D6进）；提交链执行期落定（各格实测后回填哈希，两仓各自成笔）。
**来源**：侧聊产出；spec 冻结（2026-10-11）的执行账；全线索进度见 [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)（步骤记录）——全勾后回写 T2 行。

**Architecture:** 三处——**① DeerFlow 后端**（两笔「只加不改」跟进笔：recall-test 可选 `path` / chunks 可选 `chunk_id`＋窗口）**② 插件仓**（`src/tools.ts` 端点映射、output schema 半开收窄、kb_id 三级解析＋隔离两件）**③ 部署面**（README 最小服务形态）＋真栈验收。逐面清单见 spec **§3 落点**。

**硬约束（spec 已定，实现时不许自行放松）**：

- **「只加不改」判据**：缺省路径行为逐字不变（旧消费者零感知）；开始改检索/分块/续读逻辑＝跑出等价范围，归优化另案。
- **D1 响应形状**：响应保持三段形、只算且只填请求那一类；缺省不传＝三路全算全填。
- **D2 开窗单一口径**：`_read_document_impl`（`knowledge_documents_tool.py:118-147`）的开窗逻辑抽 `deerflow.knowledge/` 纯函数，工具与路由两边同用，**不复制第二份**。
- **schema DSL**：`defineTool` 的每个 `type:'object'` 节点显式 `additionalProperties: true|false`（防 authorError 复发）。
- **模块代缓存铁律**：插件改码后验收须**整重启桌面端**（拨开关只重跑 apply、不换模块代）。
- **非目标**（spec §7）：证据窗四细节（Token 预算组装/句子级 anchor 裁剪/命中自带窗口/跨章节约束+去重）、零配置降级链、中英查询桥——不进首期。

**Global Constraints:**

- 分支：DeerFlow 跟进笔落 `feat/rag-knowledge-base`；插件仓独立 git（现全未提交）。每个后端 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits，英文）。
- **命令**：后端 `cd backend && make test` / `make lint`（门禁双净）；插件=本地编译探针（一次性，不入库）。
- **插件侧验证（有意不做单测，Task 3–5 同口径）**：Task 3–5 为薄映射/声明/透明代理，**本阶段不引入单测框架**——插件仓无测试基座且发布态要求薄（不增依赖）；等价验收由 Task 7 真栈对照（spec §4）承当，schema 面由本地编译探针承当（authorError 零复发）。写入本表＝有意为之，防将来当漏项。
- **每个 Task 的 `**实测**` 行必须回填**（RED/GREEN/neuter 受害者/门禁数字/真栈结果）——未回写的 plan 不算交付。

**依赖顺序**：Task 0（落点核实）→ Task 1（recall-test `path`）→ Task 2（chunks `chunk_id`＋窗口）→ Task 3（插件映射）→ Task 4（schema 收窄）→ Task 5（隔离＋kb_id）→ Task 6（README 部署节）→ Task 7（真栈验收＋收官）。Task 1/2 先行——Task 3 的 `path` / `chunk_id` 窗口依赖它们的路由落地。

---

## Task 0 — 落点核实（只读 + spec/plan 回填）

- [x] 1. **三检 tool 面与 recall-test 现状复核**（`RecallTestRequest` 120-124／handler 672-680 拒非法值）。
- [x] 2. **chunks 路由/service 行域**（270-280／`knowledge_service.py:364`）。
- [x] 3. **受害者面实名**——`test_recall_test_api.py`（旧响应形状断言，缺省三路不得破）／`test_api.py::test_chunks_endpoint_paginates`（分页响应形状——缺省不得破）＋`::test_chunks_by_ids_endpoint_returns_requested_order_with_doc_name`（`?ids=` 面，fence 不动）／`tools/test_citation_numbering.py`（若是 hybrid item 逐键断言，须在案）。
- [x] 4. **开窗源复核**：`_read_document_impl` 118-147 抽出边界（纯函数入参/出参）。
- [x] 5. **旧消费者两路**（DeerFlow 前端 recall 面板＋对话工具）缺省路径口径写进 Task 1/2 的 RED 对照。

**实测**（Task 0，2026-10-12 执行）：六格全核，**全部命中，无需修锚**。
- ① `RecallTestRequest` :120-124（query＋top_k 默认 5、界 1–20；`extra` 未设 forbid⇒多发字段被忽略）；handler :672-680（`_require_kb_access`→service 扇出三路）；非法值 422 由加 `Literal` 后天然达成（现在无 path 字段）。
- ② chunks 路由 :270-280（`offset ge=0`／`limit 1–200` Query）；service `knowledge_service.py:364-374`（`list_chunks`＋`count_chunks`＋`_inject_video_citations`；响应 `{items,total,offset,limit}`）——**D2 开窗落点就在此方法**。
- ③ 受害者面实核：`test_recall_test_api.py` 在 **service-module 边界 `monkeypatch` 三个 `_*_impl`**（ks_module 补丁；:114-146），断言逐键（rank/chunk_id/score/…；:162-184）——加 `path` 后 mock 面需同步（指定路时只调该 impl 的断言将新增）；`test_api.py::test_chunks_endpoint_paginates`（:528-546）钉 `total`/items 逐键（**非全字典相等**⇒加键不破；缺省行为不得变）；`test_chunks_by_ids…`（:549+）钉 `?ids=` 面；`test_e2e_smoke.py:212` 亦打 chunks 端点（冒烟面）。`tools/test_citation_numbering.py` 为 hybrid item **逐键断言**（`citation_no` 面）——须随 Task 1 复核（加键不破的话不动）。
- ④ 抽出边界实读：`_read_document_impl` :96-147；**开窗数学＝:136-138 三行**（`window=min(width,total)`／`start=max(1,min(position-(window-1)//2, total-window+1))`／`end=start+window-1`），纯函数抽取即此三行；工具侧另含 scope/access/`_ready_document`/`_shape_items`（:61-93，含 `entities` 面——与 T2 无关）；`surface_entities` 现已在 `deerflow/knowledge/chunk_entities.py`（单一口径先例成立）。
- ⑤ 旧消费者两路＝DeerFlow 前端 recall 面板（`POST recall-test` 全三路消费）＋对话工具（`_read_document_impl` 现面）；两处缺省路径口径已写进 Task 1/2 的 RED（缺省不传＝现状全路/offset-limit 不变）。
- **基线门禁（对照底）**：`tests/knowledge/{test_recall_test_api,test_api,tools/test_citation_numbering}.py` = **80 passed / 4 skipped**（2026-10-12，Task 1/2 的对照基准）；观察记档：`test_a_bad_rerank_config_answers_400_not_500` 会在未等协程上出一个 RuntimeWarning（**预存**，与本批无关，不处置）。

---

## Task 1 — DeerFlow 跟进笔一：recall-test 可选 `path`（spec §2 D1 / §3 落点）

- [x] **RED**：路由测试——`path='vector'|'graph'|'wiki'` 时响应保持三段形、只算且只填请求那一类；缺省不传＝现状三路全算全填（旧消费者零感知）；非法值 422。此刻无实现 ⇒ 红。（`backend/app/gateway/routers/knowledge_bases.py` + `backend/tests/` 新增路由测试）
- [x] **GREEN**：`RecallTestRequest` 加可选 `path`；service 扇出只算选中路（缺省行为逐字不变，不改既有三路逻辑）。
- [x] **neuter**：把缺省分支改成只算一路 ⇒「缺省三路全算全填」断言红（revert proof）。
- [x] **门禁**：`cd backend && make test`（相关套件）+ `make lint` 净 → commit（英文 Conventional）。

**实测**（Task 1，2026-10-12 执行）：RED 1 例（新用例先恰红：那时无 `path` 支持）→ GREEN 实现＝`RecallTestRequest.path: Literal[…]\|None`（422 由此天然拒收）＋service 三个计时闸门（未选路 `None,0`、缺省 `None`＝三路全算——原三路调用原样收进 `_*_call` 闸门内）＋三处 isinstance 各加 `None` 空段分支（`未请求该路（path=…）。`）。**neuter**＝缺省分支改恒单路 ⇒「缺省三路」断言恰红（graph call_count 0≠1）后还原。**门禁**＝定向三文件 **81 passed / 4 skipped**（＝Task 0 基线 80＋新 1，零回归）；`ruff check`＋`format --check` 全净。**提交待令**（按纪律不自行落）。

---

## Task 2 — DeerFlow 跟进笔二：chunks 可选 `chunk_id`＋窗口（spec §2 D2 / §3 落点）

- [ ] **RED**：窗语义测试——中心窗（围绕 `chunk_id`）、边界夹取（窗贴边时向另一端延伸：`start=max(1, min(position-(window-1)//2, total-window+1))`，**非回卷**）、超长块 `truncated` 标志，口径对照 harness `read_knowledge_document`。此刻无实现 ⇒ 红。（`backend/tests/` 新增窗语义测试）
- [ ] **GREEN**：**先从 `_read_document_impl`（:118-147）抽出开窗纯函数**落 `deerflow.knowledge/`（工具与路由两边同用，单一口径，不复制第二份）；路由/service 加可选 `chunk_id`＋窗口参数（`knowledge_bases.py::list_document_chunks` + `knowledge_service.py::list_document_chunks`，工具侧 `knowledge_documents_tool.py` 改调纯函数）；缺省（不带 `chunk_id`）＝现状 offset/limit 分页逐字不变。
- [ ] **neuter**：把窗口直接摊成 offset/limit 计算（不走纯函数口径）⇒ 窗语义断言红（revert proof）。
- [ ] **门禁**：`cd backend && make test`（相关套件）+ `make lint` 净 → commit（英文 Conventional）。

**实测**（Task 2，执行后回填）：

---

## Task 3 — 插件侧映射（spec §3 落点、对照 §5；清 `src/tools.ts` TODO(T2)）

- [ ] **映射**：三检索 → 带 `path` 的 `POST /{kb_id}/recall-test`（响应保持三段形、只填本路，随 D1 乙）；`hrag_read_document` → 带 `chunk_id` 窗口的 chunks 路由（随 Task 2）；参数载体改 GET Query（现发 GET body＝机械偏差）。
- [ ] **边界**：`top_k` 直接落 schema min/max（界 1–20）——模型可见、DSL 显式声明，运行时 clamp 仅兜底；`doc_id` 单文档限定进 `hrag_hybrid_search` 参数（spec §2 D6）。
- [ ] **待核项**：以真响应核 graph `trace` 存否（spec §5.1 待核）——recall-test 的 graph 段是否随带 trace；缺则进待裁。
- [ ] **核响应形**：`hrag_list_documents` → `GET /{kb_id}/documents`（本就通，核响应形）。

**实测**（Task 3，执行后回填）：

---

## Task 4 — output schema 半开收窄（spec §2 D5 甲）

- [ ] **收窄**：撤 `additionalProperties: true` 透传壳——顶层键稳定声明＋明细开放；五工具逐一对真实载荷（hits/scores/elapsed_ms、`source_type`/`source_chunk_ids`、media 引用、`embedding_mismatch`、`truncated`）。
- [ ] **编译探针**：本地编译探针复验 defineTool schema 全过（防 authorError 复发；一次性，不入库）。

**实测**（Task 4，执行后回填）：

---

## Task 5 — 隔离＋kb_id 三级解析（spec §6 隔离口径、§2 D3 丙 / D4）

- [ ] **解析次序**：kb_id 解析次序＝工具参数 ＞ 会话上下文 ＞ `defaultKbId`（会话上下文级=现面 per-thread binding 对应物）。
- [ ] **隔离丙之甲**：Agent 预设工具集圈定（知识预设才带 `hrag_*`）。
- [ ] **隔离丙之乙**：scoped 工具层（防同名遮蔽，属命名空间四防；宿主 API 细节先 `gh api` 取证，吃力再拉 DSH 源码）。

**实测**（Task 5，执行后回填）：

---

## Task 6 — 后端最小服务形态（spec §3 落点 部署面）

- [ ] **README 部署节**：裁定落法（零改动路线＝现有 Gateway 当对端、不启 nginx/前端/IM 即最小形态；精简启动入口＝可裁「不加」）写进插件仓 `README.md` 部署节。

**实测**（Task 6，执行后回填）：

---

## Task 7 — 真栈验收＋收官（spec §4 验收；原甲档价值验证并入）

- [ ] **真栈**：DSH 会话里知识提问——三检索真召回＋chunk_id 续读（**整重启桌面端后测**）。
- [ ] **对照**：对照 spec §5 表逐项勾（检索证据与 DeerFlow 侧同题对照＝零区别）。
- [ ] **收官门禁**：后端全量 `make test` + `make lint` 净；`git diff` 只含本件该动的文件；全勾后回写步骤记录 T2 行＝收官。
- [ ] **补充**（插件侧无单测的替代证明，见 Global Constraints）：本次真栈四工具（三检索＋续读）各至少一次真调用记录在案（模型工具集/轨迹取证法同 T1 复验）；加一次编译探针输出归档（不入库）。

**实测**（Task 7，执行后回填）：
