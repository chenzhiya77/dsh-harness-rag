# Harness RAG → DSH 插件 T2 工具面等价移植冻结清单 —— 设计（**已冻结；未开工**）

**Status:** 🟢 **已冻结（2026-10-11 整批拍板推荐套：D1乙/D2乙/D3丙/D4三级序/D5甲/D6进）** —— 未提交、未开工；执行见成对 plan（Task 0–7，提交链执行期落定）。
**来源**：侧聊产出；2026-10-10 拍板乙+丙′、首期=等价移植（「会混掉基线」）；2026-10-11 映射核出两处真缺口（recall-test 无 `path` 字段、chunk_id 开窗未 HTTP 化）后整批冻结 D1–D6。**成对 plan**：[2026-10-11-equivalence-freeze-plan.md](../plans/2026-10-11-equivalence-freeze-plan.md)。

**本对一件事：把 harness RAG 的查询工具面（三检索＋文档读两件套）按对照表等价移植进 DSH 插件 `dsh-harness-rag`——检索效果与 DeerFlow 零区别，后端零逻辑改动，两处缺口用「只加不改」跟进笔换逐字等价。**

**术语约定**：**等价移植** = 行为口径照搬（同后端同 impl，召回证据/分数/顺序一致），开始改检索/分块/续读逻辑即跑出范围；**只加不改** = 后端只加可选参数、缺省行为逐字不变的跟进笔；**半开** = output schema 顶层键稳定声明＋明细开放透传。

## 1. 设想（工具面等价移植：范围与判据）

- 本清单只冻 **T2 工具面**（三检索＋文档读两件套）。管理面板=T3、摄取=T4、子槽契约=T5 各自开工时另冻。
- 等价判据：**后端逻辑零改动、行为口径照搬**。开始改检索/分块/续读逻辑＝跑出范围，归优化另案。
- DeerFlow 侧默认零改动；唯一开口情形＝映射核出缺 route，走「只加不改」跟进笔。**本清单已核出两处**（§2 D1/D2，落点见 §3）。

## 2. 决定表（D1–D6，2026-10-11）

> 五工具等价移植的六条口径（2026-10-11 整批拍板：D1乙/D2乙/D3丙/D4三级序/D5甲/D6进）。落点见 §3、验收见 §4、对照依据见 §5。

| # | 面 | 决定 | 为什么 / 边界 |
| --- | --- | --- | --- |
| **D1** | 检索**单路化**（recall-test 选路） | **乙**：recall-test 加可选 `path` 参数；缺省仍三路、旧消费者零感知；**响应保持三段形、只算且只填请求那一类** | 现面三工具各跑自己一条 impl，乙=compute/延迟口径逐字一致；甲每次白算另两路（graph 路含实体抽取 LLM）。后端「只加不改」跟进笔之一 |
| **D2** | **chunk_id 开窗续读** | **乙**：chunks 路由加可选 `chunk_id`＋窗口参数（语义照搬 `read_knowledge_document` 的 `_read_document_impl` 开窗，`:118-147`：中心窗＋截断标志）；开窗逻辑抽 `deerflow.knowledge/` 纯函数，工具与路由两边同用 | 甲的窗洞是行为口径差异。后端「只加不改」跟进笔之二 |
| **D3** | **隔离落地件** | **丙**：Agent 预设工具集圈定＋scoped 工具层，两件各管一头 | 圈定=现面「只装配给 rag agent」的可见性对应物；scoped=防 DSH 特有同名遮蔽（属命名空间四防） |
| **D4** | **kb_id 解析次序** | **三级序**：工具参数 ＞ 会话上下文 ＞ `defaultKbId` | 会话上下文级=现面 per-thread KB binding 的对应物，不可省；参数级=显式覆盖逃生口 |
| **D5** | **output schema** | **甲（半开）**：顶层键稳定声明＋明细 `additionalProperties:true` 开放 | 载荷原样透传=与现面无区别；后端演进不破坏插件 |
| **D6** | **`doc_id` 单文档限定** | **进**：随 `hybrid_search` 等价面带入 `hrag_hybrid_search` 工具参数 | 现面 `hybrid_search` 本就有该可选参数 |

## 3. 落点（逐面）

> 与姊妹线同构：**面 → 改什么**；末行是 fence（明确不动的部分）。执行序见成对 plan。

| 面 | 改什么 |
| --- | --- |
| **DeerFlow 跟进笔一** | recall-test 加可选 `path`（D1 乙）：`backend/app/gateway/routers/knowledge_bases.py`（`RecallTestRequest` :120-124 + `recall_test` handler :672-680）＋路由测试；缺省不传＝现状三路、现有消费者零感知；非法值 422 |
| **DeerFlow 跟进笔二** | `GET /{kb_id}/documents/{doc_id}/chunks` 加可选 `chunk_id`＋窗口参数（D2 乙）：`knowledge_bases.py:270-280`／`knowledge_service.py:364`；**先抽** `knowledge_documents_tool.py:118-147` 的 `_read_document_impl` 开窗逻辑成 `deerflow.knowledge/` 纯函数（工具与路由两边同用、单一口径）；缺省＝offset/limit 分页逐字不变 |
| **插件映射** | `src/tools.ts` 清 `TODO(T2)`：三检索→带 `path` 的 `POST /{kb_id}/recall-test`（只填本路）；`hrag_read_document`→带 `chunk_id` 窗口的 chunks 路由，参数载体改 GET Query（现发 GET body＝机械偏差）；**`chunk_id` 续读时 `doc_id` 必带**（现面口径：服务端由 chunk 反查文档；插件参数面不得比现面宽——§5.2）；`top_k` 落 schema min/max（界 1–20，运行时 clamp 仅兜底）；`doc_id` 随 D6 进 `hrag_hybrid_search` |
| **插件 schema** | output 半开收窄（D5 甲）：撤 `additionalProperties:true` 透传壳，顶层键稳定＋明细开放；本地编译探针复验（一次性，不入库） |
| **插件隔离** | kb_id 三级解析（D4）＋Agent 预设工具集圈定＋scoped 工具层（D3 丙；宿主 API 细节先 `gh api` 取证） |
| **部署面** | 插件仓 `README.md` 部署节：最小形态＝现有 Gateway 单进程直接当对端、不启 nginx/前端/IM（零改动路线）；精简启动入口＝可裁「不加」 |
| **测试** | `backend/tests/`（受害者面实名须在案：`test_recall_test_api.py` 旧响应形状断言、chunks 路由既有测试、`tools/test_citation_numbering.py`；新增 TDD 单元用例）；插件=本地编译探针 |
| **不动**（fence） | 检索/分块/续读业务逻辑零改动 · `GET /{kb_id}/chunks?ids=` 批取面不动 · DeerFlow 前端/IM/nginx 不动 · 优化另案三件（证据窗四细节/零配置降级链/中英查询桥）不进首期 |

## 4. 验收

1. **三检索**：DSH 会话里知识提问真召回；同题与 DeerFlow 侧对照零区别（hits/分数/顺序）；`path` 缺省时三路全算全填（旧消费者零感知）、指定路时响应保持三段形只填该路。
2. **续读**：`chunk_id` 中心窗＋超长块 `truncated` 标志，口径对照 `read_knowledge_document`；缺省 offset/limit 分页逐字不变。
3. **隔离**：知识会话才暴露 `hrag_*`；kb_id 解析次序＝工具参数 ＞ 会话上下文 ＞ `defaultKbId`。
4. **schema**：五工具 defineTool 编译探针全过（authorError 零复发）；顶层键稳定声明、明细开放。
5. **门禁**：`cd backend && make lint && make test` 双净；`git diff` 只含跟进笔该动的文件；插件改码后**整重启桌面端**实测（模块代缓存铁律）。
6. **收官**：对照 §5 表逐项勾；全勾回写 `docs/2026-10-11-plugin-porting-plan.md`（步骤记录）T2 行。

## 5. 等价对照（现面 ↔ 插件面；冻结依据，留档）

### 5.1 检索三工具

| 现面（rag 工具组） | 行为口径 | 插件工具 | HTTP 映射 |
| --- | --- | --- | --- |
| `hybrid_search` | 向量 RRF＋稀疏融合＋rerank；可选 `doc_id` 限定单文档 | `hrag_hybrid_search` | `POST /{kb_id}/recall-test`，取 vector 路 hits |
| `graph_search` | 实体种子→邻域扩展（语义门/预算/枢纽护栏）→证据选择；响应带 `trace`（seed_entities/expanded_nodes/evidence_entities） | `hrag_graph_search` | 同上，取 graph 路 hits |
| `wiki_search` | wiki 条目＋手动卡合池（wiki 赢平分）；命中带 `source_type: wiki\|manual`，wiki 带 `source_chunk_ids` | `hrag_wiki_search` | 同上，取 wiki 路 hits |

**映射事实（已核，KB 路由 `backend/app/gateway/routers/knowledge_bases.py` :120-124、:672-680）**：`RecallTestRequest` 只有 `query` + `top_k`（默认 5、界 1–20），**没有 `path` 字段**；recall-test 是「一个 query 并行扇出 vector/graph/wiki 三路」的调试缝，一次返回三路 raw hits/scores/elapsed_ms（不带 LLM 综合），命中携带视频 media 引用、`source_chunk_ids`、`embedding_mismatch` 警告。tools.ts 现状给三工具都发 `path:'vector'|'graph'|'wiki'`——该字段**不存在**（多发的字段被忽略，不会报错，但三路都会回来）。⇒ 单路化落法＝§2 D1。

**待核（不裁断言）**：graph `trace` 是否随 recall-test 响应携带（工具响应有、recall-test 未核到）——Task 3 映射时以真响应核，若缺再进待裁。

### 5.2 文档两工具

| 现面 | 行为口径 | 插件工具 | HTTP 映射 |
| --- | --- | --- | --- |
| `list_knowledge_documents` | 列绑定库文档＋诚实分态计数 | `hrag_list_documents` | `GET /{kb_id}/documents` |
| `read_knowledge_document` | 按 `doc_id` 分页 **或** 以 `chunk_id` 为中心开窗续读（chunk 路 doc_id 为必带——由服务端取到 chunk 行后反查其文档，非独立参数）；超长切片截断＋`truncated` 标志 | `hrag_read_document` | `GET /{kb_id}/documents/{doc_id}/chunks`（现路由**只有** `offset`/`limit` Query 参数，:270-280） |

**两处机械偏差（Task 3 动作，不是待裁）**：①tools.ts 把参数放 GET body——应改 Query 载体；②`top_k` 参数无界——对齐后端 1–20（落 schema min/max）。

**缺口（§2 D2）**：chunk_id 开窗续读在 harness 是工具层能力（`read_knowledge_document` 的 `_read_document_impl`，`knowledge_documents_tool.py:118-147` 内联；app 层不可反向 import），**没有对应 HTTP 路由**——chunks 路由只支持 offset/limit 分页；`GET /{kb_id}/chunks?ids=` 是按 id 批取（无窗概念）。落地时须先把开窗逻辑抽成 `deerflow.knowledge/` 纯函数（工具与路由两边同用，单一口径——plan Task 2）。

## 6. 隔离口径（现面 ↔ 插件）

- 现面：三检索＋文档两工具注册在 **`rag` 工具组**，只给 `rag` agent 装配；**per-thread KB binding 门禁**（没绑库的会话工具不装配）。
- 插件现状：五工具全局注册（测试态）、`kb_id` 参数缺省回落 `defaultKbId`。
- 等价目标：**知识会话才暴露 `hrag_*`，kb_id 走会话上下文**。落地件＝§2 D3，解析次序＝§2 D4。

## 7. 非目标与风险

- **非目标**（另案；吸收前逐项单独指定）：证据窗四细节（Token 预算组装/句子级 anchor 裁剪/命中自带窗口/跨章节约束+去重）、零配置降级链、中英查询桥。
- **待核风险**：graph `trace` 是否随 recall-test 响应携带（见 §5.1）——Task 3 以真响应核，缺则进待裁；另：插件改码须整重启桌面端才生效（模块代缓存铁律），「改完没生效」先核报错行号与现文件对不对得上。
