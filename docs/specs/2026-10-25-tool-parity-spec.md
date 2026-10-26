# 工具面对齐（六件 `hrag_*` 与主树 RAG 工具组逐项对齐） —— spec

**Status:** 已实施（2026-10-25；D1 B；D2–D8 甲已落地；运行时包 `0.1.0-2` 已重建；G11 已另案实施；托管冒烟已用本地 fake 模型覆盖六件真实调用）
**Date:** 2026-10-25
**来源:** 10-25 工具盘点。用户记得有 7 件工具、当前插件只有 5 件；补上 `hrag_list_wiki_entries` 后确认主树 RAG 工具组实为 6 件（三检索 + 文档两件 + 百科条目清单），数量已对齐。随后按主树逐项核对参数、字段、默认值与拒绝语义，发现工具面仍有一批缺口。
**承接:** [2026-10-23-binding-tool-gating-spec.md](2026-10-23-binding-tool-gating-spec.md)（六件工具的挂载与 `kb_id` 解析）、根 README 产品页「检索 / 文档感知」两节、`docs/equivalence.md` §工具面。
**配套 plan:** [../plans/2026-10-25-tool-parity-plan.md](../plans/2026-10-25-tool-parity-plan.md)

## 1. 目标

1. 六件 `hrag_*` 的工具契约与主树 RAG 工具组逐项对齐：参数、返回字段、默认值、拒绝语义、引用编号。
2. 工具不再借用面板的 `recall-test` 投影。面板与模型是两个消费面，各自有稳定的载荷契约；一面的裁剪不再传导到另一面。
3. 当前仓库成为唯一主仓：`engine/` 是可直接编辑的后端目录，不再从 `harness-rag` 重新 vendor（D1 B）。
4. 对外文档只写已实现的行为；本 spec 落地后同步 README、插件手册与等价表。

**不包含**：新增第七件工具（主树只有六件）、改工具名、面板召回测试的展示形态、检索算法 / 图谱 / 百科生成逻辑、Qdrant 与模型配置。

**等价边界（重要）**：本 spec 只对齐六件工具的**可观察契约**，不等于整个 RAG agent 与主树等价。主树的 RAG agent 另有 `agents/assets/rag/SOUL.md` 承载回答纪律（强制向量保底、分路路由、补检上限、读取限次、引用与拒答规范）；该纪律已由 G11 以 agent 级 `systemPrompt.section` 单独移植（[rag-soul-section spec](2026-10-25-rag-soul-section-spec.md)），不在本 spec 的 D2–D8 内。人格、深度检索模式与附图处理仍不移植——「等价」仍只覆盖工具契约与检索纪律。

## 2. 现状与根因

### 2.1 六件工具与主树的对应

| 插件工具 | 当前后端 | 主树对应 | 契约状态 |
| --- | --- | --- | --- |
| `hrag_hybrid_search` | `POST /recall-test` 的 vector 段 | `hybrid_search` | 参数少 `doc_id` 生效；命中少 `doc_id` / `chunk_index` / `entities` / `citation_no` |
| `hrag_graph_search` | `POST /recall-test` 的 graph 段 | `graph_search` | 少 `entity` / `hops`；证据字段基本透传，编号每次从 1 起 |
| `hrag_wiki_search` | `POST /recall-test` 的 wiki 段 | `wiki_search` | 少 `title`；正文被截成 120 字摘要，丢 `content` / `updated_at` / `citation_no` |
| `hrag_list_documents` | `GET /documents` 面板路由 | `list_knowledge_documents` | 返回面板原始行（主键 `id` 而非 `doc_id`），无状态计数 / message |
| `hrag_read_document` | `GET /documents/{doc_id}/chunks` 面板路由 | `read_knowledge_document` | 强制 `doc_id`，`chunk_id` 不能单独续读；缺 doc 元数据 / `entities` / `truncated` / 未就绪拒绝 |
| `hrag_list_wiki_entries` | `GET /wiki/entries` 面板路由 | `list_wiki_entries` | 基本对齐（标题 / 状态 / `updated_at` + 计数）；消息的零计数口径略异 |

### 2.2 根因

这不是「复制主树时漏了几个文件」，而是**工具层的后端选错了消费面**。插件 `src/tools.ts` 是手写的 HTTP 适配器，把手用面板调试端点 `recall-test` 当成了模型工具后端；该端点从设计起就是给召回测试面板看的：

- **请求面窄**：`RecallTestRequest` 只有 `query` / `top_k` / `path`（`engine/backend/app/gateway/routers/knowledge_bases.py:120-136`），没有 `doc_id`，也没有 `extra="forbid"`。插件一直在发 `doc_id`（`src/tools.ts:36-40`），被 Pydantic 静默丢弃——单文档检索看起来有参数，实际从未生效。
- **参数面窄**：服务里三路调用只传 `query` / `top_k`（`engine/backend/app/gateway/services/knowledge_service.py:1182-1218`），主树工具支持的图谱 `entity` / `hops` 与百科 `title` 都没有入口。
- **字段面按面板裁剪**：vector 段重建命中时只留 `chunk_id` / `doc_name` / `text` / `heading_path` / `page` / `score` / `rank`（`knowledge_service.py:1240-1252`），丢掉 `doc_id` / `chunk_index` / `entities` / `citation_no`；wiki 段只留 120 字 `summary`，丢掉完整 `content` / `updated_at` / `citation_no`（`:1280-1307`）。
- **给模型看的引用注记被剥掉**：面板不应该显示「引用编号…照抄 citation_no」这种模型指令，所以 `_user_facing` 用正则删掉了它（`knowledge_service.py:1230-1233`）。但同一段 message 又被模型工具原样拿走，导致模型从未收到编号纪律。
- **引用编号没有跨调用共享**：主树的 `claim_citation_range` 把计数器挂在一次 agent run 的 runtime context 上（`engine/backend/packages/harness/deerflow/knowledge/citation_counter.py`），三路工具共用一套编号；插件的每次 HTTP 调用都新建一个 context，编号只能从 1 重来。graph 段因为透传 evidence，尚能看到 `citation_no`，但每次调用都从 `[1]` 起；vector / wiki 段则完全没有编号。
- **文档工具复用了人用路由**：`list_documents` 直接返回 store 行（`id` / `storage_path` / `path_status` 等），`read_document` 依赖路径参数 `doc_id` 且只在找不到文档时 404（`knowledge_bases.py:235-239`、`:277-294`；`knowledge_service.py:289-306`、`:385-423`）。模型需要的是 `doc_id` / 名称 / 状态 / 切片数与可读的拒绝语，而不是面板行的原样透传。

**性质判定**：这些缺口不是 DSH 平台强制的差异。面板侧的 120 字摘要、剥引用注记、丢内部字段、`top_k→graph_evidence_limit`、404 拒绝，都是**对面板正确的适配**；错在把这份面板适配直接当成模型工具后端。因此 G1–G11 在工具契约上都是缺漏 / 错接，而不是「DSH 与主树的合理差异」。真正属于适配、且应当保留的是另一组：`hrag_*` 命名空间、HTTP 传输、会话绑定、输出 schema / JSON 渲染、宿主侧引用呈现，以及只服务面板的 `chunk_position` / 视频时间码。引用计数与 SOUL 注入在实现时需要新的载体（引擎 run 缓存、`systemPrompt.section`），但「现在没有」仍是缺漏，不是平台限制。

### 2.3 本轮已修（不在剩余清单）

- `hrag_list_wiki_entries` 已补：`src/tools.ts:241-273`；`tests/tool_gating.test.ts` 的工具名集与执行用例已改为六件；README / 手册 / 等价表已写入第六件。数量对齐主树的六件，剩余问题都是契约差距。

## 3. 问题清单

级别：P1＝模型行为错误或对外承诺未实现；P2＝契约偏差或误导。

| 编号 | 级别 | 问题 | 证据 | 影响 |
| --- | --- | --- | --- | --- |
| G1 | P1 | `doc_id` 单文档过滤无效：请求发得出去，服务端静默丢弃 | `knowledge_bases.py:120-136`、`src/tools.ts:36-40` | 模型以为缩小了范围，实际仍全库检索 |
| G2 | P1 | 图谱检索缺 `entity` / `hops`：不能按实体名直取，也不能选 1/2 跳 | `knowledge_service.py:1187-1211`；主树 `graph_search_tool.py:412-450` | 少一条确定性的图谱入口，多跳不可控 |
| G3 | P1 | 百科检索缺 `title`：不能按条目标题精确直取 | `knowledge_service.py:1213-1218`；主树 `wiki_search_tool.py:140-176` | 已知实体名时仍要走一次语义检索，且可能错过条目 |
| G4 | P1 | 向量命中丢 `doc_id` / `chunk_index` / `entities` / `citation_no` | `knowledge_service.py:1240-1252`；主树 `hybrid_search_tool.py:80-106` | 追问无法按片定位、实体不能成为图谱入口、事实结论无编号可抄 |
| G5 | P1 | 百科命中只剩 120 字 `summary`，丢完整 `content` / `updated_at` / `citation_no` | `knowledge_service.py:1280-1307`；主树 `wiki_search_tool.py:45-136` | 「内容深度」这条路名不副实：模型拿到的是摘要而不是条目正文 |
| G6 | P1 | 三路引用编号不共享：vector / wiki 无 `citation_no`，graph 每次从 1 起；message 的编号提示被剥离 | `knowledge_service.py:1230-1233`；`citation_counter.py`；主树三工具共用 per-run 计数器 | 多路并答时编号冲突；README 承诺的「共用一套连续引用编号」不成立 |
| G7 | P1 | `hrag_read_document` 强制 `doc_id`，`chunk_id` 不能单独续读；缺 doc 元数据 / `entities` / `truncated` / 未就绪拒绝 | `src/tools.ts:207-239`、`knowledge_bases.py:277-294`、`knowledge_service.py:385-423`；主树 `knowledge_documents_tool.py:62-167` | 命中后按片续读要先猜 doc_id；读取面与主树不等价 |
| G8 | P2 | `hrag_list_documents` 返回面板原始行（`id` 而非 `doc_id`），无状态计数 / message | `knowledge_bases.py:235-239`、`knowledge_service.py:289-306`、`models.py:49-63`；主树 `knowledge_documents_tool.py:28-56` | README 的 `doc_id` / 诚实计数承诺不成立 |
| G9 | P2 | 默认值与参数边界不齐：wiki 默认 5（主树 3）；graph 暴露 `top_k`（主树无此参数，证据上限取配置 8，当前 recall-test 把 `top_k` 当证据上限、默认 5）；read 描述 20/50 但省略 `limit` 时实际走面板默认 50/上限 200；`doc_id` 描述挂在三路而只有向量真支持；条目清单消息恒列零计数 | `src/tools.ts:99-104`、`:209-216`；`engine/config.example.yaml:2684`；主树 `wiki_search_tool.py:142`、`wiki_entries_tool.py:50-52` | 模型按描述调用会得到与预期不同的条数 / 上限；参数表继续误导 |
| G10 | P2 | 文档现状已按旧行为保守描述（并列明差距）；修复后需同批回写为完成态，避免旧差距句残留 | `README.md` §检索 / §文档感知、`docs/plugin-manual.md` 工具表、`docs/equivalence.md` §工具面（当前版本已按现状写） | 代码修好而文档仍写「需 doc_id / 面板行」，用户按文档使用会低估能力 |
| G11 | P1 | **回答纪律没有载体**：主树 RAG agent 用 `agents/assets/rag/SOUL.md` 强制向量保底、分路路由、补检上限、读取限次（同篇 ≤4 窗口 / 单轮 ≤6 次）、引用与拒答规范；插件只挂了工具，没有等价 prompt 注入 | 主树 `backend/packages/harness/deerflow/agents/assets/rag/SOUL.md`；`src/index.ts:16`；审计时 `README.md` §检索的回答侧说明 | 工具齐了但模型不会按主树纪律使用（审计时）；G11 已实施——绑定会话注入检索纪律段，见 [rag-soul-section spec](2026-10-25-rag-soul-section-spec.md) |

## 4. 设计

### 4.1 D1 主仓归属（已拍 B）

当前仓库 `dsh-harness-rag` 是唯一主仓：`engine/` 就是后端目录，可以直接改，不再从 `harness-rag` 重新 vendor。

- `engine/UPSTREAM.md` 从「byte-identical 快照 / 不得编辑 / 重新 vendor」改写为**分叉记录**：保留来源仓库、分支与基准 commit，说明本地已分叉、上游改动改为人工筛选后 cherry-pick，不再用 `git archive` 覆盖。
- `engine/README.md` 的「源码快照」措辞同步改为「后端目录」。
- `scripts/build-runtime-pack.mjs` 不变；`engine/` 自身没有 `.git`，且 builder 明确不向上找仓根，所以重建时必须显式传 `--engine-commit "$(git rev-parse --short=9 HEAD)"`（`engine/UPSTREAM.md` 只记分叉基准，不作为构建来源）。
- 引擎改动必须随运行时包重建发布；`runtime.json` 的 `engineVersion` / `runtimeVersion` 在发布时按现有规则递增，本次不预先改版本号。
- 与上游 `harness-rag` 的关系变成「同源实现，各自演进」；后续若上游也修同样问题，按补丁手工比对，不整树覆盖。

### 4.2 D2 数据面：模型工具走独立端点（已拍甲，2026-10-25）

- **甲（推荐）**：新增工具专用端点 `POST /api/knowledge-bases/{kb_id}/tools`，请求体按 `name` 区分六种工具及其扁平参数；端点直接调用主树同名 `_*_impl`，返回**工具原生载荷**（含给模型看的 message），不加面板投影。`recall-test` 一字不改，面板契约保持稳定。
- **乙**：在 `recall-test` 上加 `mode=tool`，放宽请求模型并保留字段。少一个路由，但两个消费面继续共用一条投影，今天的裁剪问题会以另一种形式回来。
- **丙**：插件继续走面板路由，在 TS 里补字段。读取 / 清单的拒绝语义与 `chunk_id` 解析仍缺，且字段来自面板投影，引擎一改就断。
- **推荐理由**：根因就是消费面混用；甲把「人看的面板载荷」与「模型用的工具载荷」分开，后续两边可以独立演进。新增面只做转发与校验，检索逻辑复用现有 `_impl`，不复制算法。

### 4.3 D3 引用编号：同回合共用一套（已拍甲，2026-10-25）

- **甲（推荐）**：引擎按「会话 + 回合」维护计数器，三路工具共用；同回合内编号连续且不重复，新回合从 1 开始。插件从宿主 agent 的实时回合相位取回合号（工具执行期可读 `exec.agent.phase.turn`），随工具调用上送 `run_id`；引擎侧用有界缓存（建议上限 256 个回合 + 1 小时 TTL）持有计数器。无 `run_id` 的调试调用退回每次从 1 起。
- **乙**：插件侧编号。不引引擎状态，但并行工具调用要预留号段（编号出现空洞）或串行化（增加等待），且编号注记要由插件重写。
- **丙**：不共享编号，改文档。不推荐——README 首屏已把它当作产品能力。
- **现状可复用**：引擎已有 `citation_counter.py` 与 `tests/knowledge/tools/test_citation_numbering.py`；甲复用这条实现，只把计数器的生命周期从「一次进程内 runtime」提升为「一个有界 run 缓存」。
- **面板不受影响**：`recall-test` 继续剥掉编号注记、继续用面板自己的投影。

### 4.4 D4 参数面：按主树逐工具给参数（已拍甲，2026-10-25）

- **甲（推荐）**：每件工具只暴露主树同名工具的参数，不再共用一套 `query` / `top_k` / `doc_id`。

| 工具 | 参数 | 默认 / 边界 |
| --- | --- | --- |
| `hrag_hybrid_search` | `query` 必填；`top_k`；`doc_id` 可选 | `top_k` 1–20，默认 5；`doc_id` 只在本工具生效 |
| `hrag_graph_search` | `query` / `entity` 至少一个（`entity` 优先）；`hops` | `hops` 取 1 或 2，默认 2；不暴露 `top_k`，证据上限取 `rag.graph_evidence_limit`（默认 8） |
| `hrag_wiki_search` | `query` / `title` 至少一个（`title` 优先）；`top_k` | `top_k` 1–20，默认 3 |
| `hrag_list_documents` | 无 | — |
| `hrag_read_document` | `doc_id` / `chunk_id` 至少一个（`chunk_id` 优先）；`offset`；`limit` | `offset` ≥ 0，默认 0；`limit` 1–50，默认 20 |
| `hrag_list_wiki_entries` | 无 | — |

- `kb_id` 只走路径参数（插件已按会话绑定解析），不再进工具参数体。
- 请求模型 `extra="forbid"`：拼错的参数直接 422，不再静默忽略。
- **乙**：继续共用 `query` / `top_k` / `doc_id`。改动小，但 `entity` / `title` / `chunk_id` 单独续读仍缺，`doc_id` 描述继续误导图谱与百科两路。

### 4.5 D5 读取面：`chunk_id` 可单独续读（已拍甲，2026-10-25）

- **甲（推荐）**：工具端点按主树 `read_knowledge_document` 的语义：
  - `chunk_id` 优先：服务端解析该片所属文档并校验归属，返回以该片为中心的窗口（边界收拢），message 写明「第 K/共 N 片」。
  - 只有 `doc_id`：按 `offset` / `limit` 分页。
  - 两者都没有：200 + 可读 message（工具级拒绝不抛 HTTP 404）。
  - 未就绪、跨库、不存在：同样 200 + 对应拒绝语；不空返、不静默。
- **乙**：维持 `doc_id` 必填，只改文档。模型仍可用命中里的 `doc_id` 续读，但失去 `chunk_id` 单参便利，且与主树工具不等价。

### 4.6 D6 输出面：透传工具原生载荷（已拍甲，2026-10-25）

- **甲（推荐）**：工具端点返回与主树工具一致的原生载荷，不再经过面板投影。

| 工具 | 返回 |
| --- | --- |
| `hrag_hybrid_search` | `results[]`：`chunk_id` / `text` / `doc_id` / `chunk_index` / `doc_name` / `page` / `heading_path` / `entities` / `score`（重排降级时可缺）/ `citation_no`；`message`（含编号注记） |
| `hrag_graph_search` | `entities` / `relations` / `evidence[]`（`chunk_id` / `text` / `doc_id` / `doc_name` / `heading_path` / `page` / `score` / `citation_no`）/ `trace` / `score_source` / `message` |
| `hrag_wiki_search` | `entries[]`：`entry_id` / `title` / `content` / `score` / `updated_at` / `source_chunk_ids`（仅 wiki 条目）/ `source_type` / `citation_no`；`message` |
| `hrag_list_documents` | `documents[]`：`doc_id` / `name` / `status` / `chunk_count`；`message`（就绪 / 处理中 / 失败计数，零项不列） |
| `hrag_read_document` | `doc`：`{doc_id, name}`；`items[]`：`chunk_id` / `chunk_index` / `heading_path` / `page` / `text` / `entities`（去重后最多 10 个）/ `truncated`（超 2000 字时）；`total` / `offset` / `has_more` / `message` |
| `hrag_list_wiki_entries` | `entries[]`：`title` / `status` / `updated_at`；`message`（零项不列） |

- 面板专用字段（`chunk_position`、视频时间码与 `frame_url`）只留在 `recall-test`，不进模型工具载荷。
- `message` 保留「引用编号…照抄 `citation_no`」的模型注记；面板继续自行剥离。
- **乙**：继续用面板投影 + 插件侧补丁。字段补齐依赖面板行，且每条都要在 TS 里维护一份映射，最容易再次漂移。

### 4.7 D7 默认值与消息口径（已拍甲，2026-10-25）

- **甲（推荐）**：沿用主树默认值——hybrid 5、wiki 3、graph 证据上限取 `rag.graph_evidence_limit`（默认 8）、hops 2、read 20/50；计数消息省略为 0 的类别。
- **乙**：维持现状——三路统一 5、read 声称 20/50 但实际 50/200、计数消息恒列两类。
- **说明**：graph 的 `top_k` 是插件自造的参数，主树没有；证据上限是配置旋钮。本次按主树去掉工具参数，配置仍可由运维调。

### 4.8 D8 文档同步：与代码同批（已拍甲，2026-10-25）

- **甲（推荐）**：D2–D7 落地同批更新，所有对外句子必须与实测行为一一对应：
  - `README.md` §检索 / §文档感知（`:71`、`:76`、`:82-85`）：连续引用编号、每篇 `doc_id`、单文档检索、`chunk_id` 中心窗、`truncated`、清单计数。
  - `docs/plugin-manual.md` 工具表（`:105-114`）：六件工具的一句话说明与默认值。
  - `docs/equivalence.md` §工具面（`:151-153`）：「等价（同一端点）」改为「工具端点复用同一实现，面板召回测试独立」。
  - 工具 description 去掉「Corresponds to the recall-test … path」，改为工具端点 / 原生语义；图谱与百科不再宣称 `doc_id`。
  - `engine/UPSTREAM.md` / `engine/README.md` 按 D1 改写。
- **乙**：代码先行、文档另批。不推荐——对外文档只写完成态；两批之间会出现「文档说已做、实际未做」的窗口。

## 5. 验收

1. **G1**：两篇文档的库里，hybrid 带 `doc_id` 只返回该篇命中；不带则两篇都可能命中（同一 query 对照）。
2. **G2**：graph 只传 `entity`（精确实体名）能返回实体 / 关系 / 证据；`hops=1` 与 `hops=2` 的扩展结果不同（或至少按 1/2 生效）。
3. **G3**：wiki 只传 `title` 能返回完整 `content`，且单测证明未走 embedding 检索。
4. **G4 / G5**：vector 命中含 `doc_id` / `chunk_index` / `entities` / `citation_no`；wiki 命中含完整 `content` / `updated_at` / `citation_no`。
5. **G6**：同一回合内连续两次检索，编号连续、不重复；下一回合从 1 重新开始；面板 `recall-test` 仍不显示编号注记。
6. **G7**：只传 `chunk_id` 能读回中心窗；返回 `doc` 元数据与 `entities`；超长文本带 `truncated`；不存在 / 跨库 / 未就绪三种拒绝都有可读 message 且不是 404。
7. **G8**：`hrag_list_documents` 的键是 `doc_id` / `name` / `status` / `chunk_count`，message 的计数与实际状态一致；百科条目清单同样。
8. **G9**：默认值实测——wiki 不带 `top_k` 最多 3 条；graph 证据不超过配置上限；read 不带 `limit` 返回 20 条、传 51 被拒或钳到 50；`extra` 字段 422。
9. **G10**：文档扫描——README / 手册 / 等价表中不再有未实现的承诺；工具 description 不再出现 `recall-test` 字样；每条参数描述都能在请求模型里找到对应字段。
10. **D1**：`engine/UPSTREAM.md` 不再出现「byte-identical / 不得编辑 / 重新 vendor」；用当前 `engine/` 能重建运行时包（显式传 `--engine-commit`）。
11. **回归**：面板 `recall-test` 三路响应的形状与字段不变；文档上传 / 列表 / 切片抽屉 / Wiki 抽屉零变化；`hrag_list_wiki_entries` 的既有用例继续通过。
12. **门禁**：引擎定向用例 + 全量 `tests/knowledge/` + `ruff check` / `ruff format --check`；插件 `node --test tests/tool_gating.test.ts`、全量 `node --test tests/*.test.ts`、`pnpm run typecheck`；引擎改动后重建运行时包。

## 6. 影响面

**引擎（可改）**：
- 新增工具端点（`knowledge_bases` router 或独立 `tools` router）与六个请求模型；复用 `hybrid_search_tool` / `graph_search_tool` / `wiki_search_tool` / `knowledge_documents_tool` / `wiki_entries_tool` 的 `_impl`，不复制检索算法。
- 服务层新增工具分派、参数校验、读取面的 doc 解析与拒绝语义。
- 引用计数器：从 runtime context 提升为按 `run_id` 的有界缓存（复用 `citation_counter.py`）。
- 测试：新增工具端点契约测试；沿用 `tests/knowledge/tools/` 的 impl 用例与 `test_citation_numbering.py`。

**插件**：
- `src/tools.ts`：六件工具改为逐工具参数与工具端点；输出 schema 按 D6；引用 run 标识随调用上送。
- `tests/tool_gating.test.ts`：mock URL / 载荷、六件工具的执行用例、参数校验用例。
- `client.js` 不改；面板数据桥不改。

**文档**：`README.md`、`docs/plugin-manual.md`、`docs/equivalence.md`、`engine/UPSTREAM.md`、`engine/README.md`。

**运行时**：引擎改动后重建运行时包；发布时递增 `runtimeVersion` / `engineVersion`；`engineCommit` 改为插件仓库 HEAD。

**明确不动**：`src/runtime/supervisor.ts` 与 `tests/runtime_supervisor.test.ts`（并行会话改动）、既有 `docs/plans/*`、面板 `recall-test` 的投影与展示、主树 `deer-flow`。

## 7. 不做

- 不新增第七件工具，不改 `hrag_` 命名空间、不改工具名。
- 不改面板召回测试的展示形态；不把面板字段塞回模型载荷。
- 不改检索 / 图谱 / 百科生成算法，不改 Qdrant 集合与 schema。
- 不为旧工具输出保留兼容层（尚未发布，没有外部消费者）。
- 不把主树的 agent 运行时、IM、调度器、工作台前端带进来。
- 不再从 `harness-rag` 整树 re-vendor；上游同步只做人工比对的补丁。
- 不移植 `SOUL.md` 的完整人格 / 深度检索 / 附图段；检索纪律已由 G11 单独移植（见 [rag-soul-section spec](2026-10-25-rag-soul-section-spec.md)），不进本 spec 的 D2–D8。

## 8. 风险与待核

- **回合号来源**（2026-10-25 复核后已定）：随包 dsh-session 为 0.2.1-rc.2，运行时 `Session` 不暴露 `events`（同步事件读取已标弃用，仅存 `eventAt` / `snapshotEvents` / `ownEvents` / `seq`）；本仓类型落后一代，按类型写的取源取不到值。实际取源为工具执行期可读的 `exec.agent.phase.turn`，证据与修法见 [G11 spec](2026-10-25-rag-soul-section-spec.md) §3.5。
- **引擎 run 缓存**：客户端上送 `run_id`，不可全信。缓存必须有界（建议 256 个回合 + 1 小时 TTL），key 带上用户与会话（`run_id` 已含会话与回合）；不按库拆分——同一回合跨库调用仍要共用一套编号。
- **graph `trace` 进模型载荷**：主树工具原样返回 `trace`；对齐后模型会多看到种子 / 扩展 / 证据实体名单。若实际回答变得嘈杂，D6 再单独决定是否裁剪，届时等价表同步。
- **去掉 graph `top_k`**：这是一次工具参数面变更；当前尚未发布，无外部消费者，但插件内文案与测试要同步。
- **面板与工具共用 `_impl`**：引擎改 impl 的 message / 默认值时，`recall-test` 也会跟着变；面板已有 `_user_facing` 剥离编号注记、显式传 `top_k`，验收第 11 条守住面板形状。
- **运行时包重建**：引擎改动必须重建包才能在托管模式生效；包体约 330 MB，构建与上传成本高。发布前把重建与版本递增列入 plan 的收尾任务。
- **上游分叉漂移**：`harness-rag` 后续若继续演进，不能再用 `git archive` 覆盖；`engine/UPSTREAM.md` 必须记录基准 commit 与分叉状态，避免下一次误覆盖。
- **回答侧的剩余差异**：G11 已注入检索纪律（2026-10-25），模型是否真按纪律行事只能在真实模型会话里观察（托管冒烟用的是本地 fake 模型，只验机制）；人格 / 深度检索 / 附图仍不移植，文档仍不能把整个 RAG agent 记为等价。

## 9. 排期

D2–D8 拍板后立配套 plan。预计顺序：Task 0 宿主回合面核实 → 引擎工具端点与请求模型 → 引用计数器缓存 → 读取面 / 清单面 → 插件六件适配 → 契约与回归测试 → 文档同步 → 运行时包重建与验收。具体 Task 划分、门禁命令与提交链以 plan 为准。

G11（回答纪律注入）已按此建议落地：单独 spec/plan，复用宿主 agent 级 `systemPrompt.section`，绑定挂工具时同挂纪律段、解绑即卸（[spec](2026-10-25-rag-soul-section-spec.md)、[plan](../plans/2026-10-25-rag-soul-section-plan.md)）。
