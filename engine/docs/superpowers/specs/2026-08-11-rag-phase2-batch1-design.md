# RAG 二期第一批功能设计（召回测试 / 引用徽标 / 状态子标记 / 解析扩展）

> 状态：✅ 已落地（Phase-2 Batch-1 全部完成） · 日期：2026-08-14 · 范围：主 spec 已定稿但尚未实施的二期第一批四项 · 关联：主 spec `2026-08-07-rag-knowledge-base-design.md` §3.1 / §3.6 / §4.6 / §5.3；图谱质量二期 spec `2026-08-10-rag-graph-quality-design.md`（已落地 2026-08-11）

## 1. 背景

主 spec（2026-08-07）将以下四项标记为"二期第一批"，设计均已定稿，但 2026-08-11 代码核查确认**均未实施**：

- §3.1 的"二期第一批已扩展（2026-08-09 定）"实为**设计定稿**：`parser.py` 本地直读仍仅 `.md/.markdown`，上传路由无扩展名白名单，前端上传控件无 `accept` 限制；
- §3.6 三路子标记：documents API 仅返回主状态 + 总进度（error 文本子标记 `graph degraded` / `entity-resolution failed` 已随图谱质量二期落地，但 per-path 状态字段契约与前端悬停展示未做）；
- §5.3 `recall-test` 端点无对应路由；
- §4.6 引用来源类型徽标未实现（wiki 条目与文档切片在引用列表仍混排）；且引用 UX 存在两项缺陷（2026-08-11 用户反馈）：AI 消息底部「参考来源」紧凑列表全量平铺、视觉拥挤；正文内引用标记（如 `[9]`）与正文同字号、基线平齐，扫读时被打断。

另一处隐藏前置（2026-08-11 核查）：**中栏「文档 | 百科」tab 容器前端未实施**——当前中栏是 DocumentPanel 单面板，百科 tab 不存在（后端 `wiki/entries` API 已在一期落地）。P1 的第三 tab 与 P2 的百科查看入口都依赖该容器，本批一并交付。

另一处一期遗留缺陷（2026-08-12 核查）：主 spec §3.5 契约“新文档实体条目标 dirty 增量重生成”从未生效——`mark_dirty_for_entities` 钩子未接入 worker，增量恒空转，新内容进 wiki 只能靠手动全量。本批随 P3 一并修复（plan Task 5b），并将增量语义修订为「dirty ∪ 新晋头部自动补写」（主 spec §3.5 已同步修订，2026-08-12 用户确认）。

另一处设计修订（2026-08-12 用户拍板）：主 spec §3.5 的头部实体策略由“top ~20% 比例制”修订为**资格制**——卫生过滤（纯符号/运算符、引号字面量、单字符、超长碎片）+ 跨切片（freq≥2，单切片实体由向量路直接服务）；**不设条目总数上限**，score（度+频率）仅决定生成/补写顺序；生成调度同步改为**材料束批量**（Jaccard 聚簇共享一次调用、JSON 多条目输出、失败降级逐条，实测 152 次调用 → ≈22 次），自动增量补写节流每次 ≤40 篇，手动全量与 dirty 重生成不节流。动机：比例制席位随实体总数膨胀（实测一篇概念密集文档 6→54 席）、尾部混入薄条目，且逐条生成重复搬运共享切片（27 切片/152 实体 → 518 次搬运）。主 spec §3.5 已同步修订，实施见 plan Task 8。

本 spec 将四项契约从主 spec 抽出独立成文，作为实施阶段的单一事实源；主 spec 原文保留，对应位置加交叉引用。

## 2. 交付项与建议顺序

| # | 交付项 | 主 spec 出处 | 依赖与理由 |
|---|---|---|---|
| P1 | 召回测试 API + 中栏「检索测试」tab | §3.6 / §5.3 | 前置：中栏 tab 容器（随本批一并交付）；是轻量评测体系与硬编排（D5）的数据生产入口，最先做 |
| P2 | 引用 UX 改造：类型徽标 + 上标标记 + 来源区折叠 | §4.6 | `source_type` 由前端引用解析层填充（零后端改动）；百科抽屉依赖中栏 tab 容器（同上） |
| P3 | 文档状态三路子标记 | §3.6 | 无前置；后端契约字段 + 前端悬停 |
| P4 | 解析能力扩展第一批 + 上传白名单 | §3.1 | 无前置；涉及解析层与前后端校验 |

## 3. P1：召回测试（recall-test）

**主 spec 原文契约**：召回测试（输入 query 看命中切片+得分，Dify/RAGFlow 验证过的调优闭环）二期第一批（§3.6）；`POST /api/knowledge-bases/{kb_id}/recall-test`：query → 三路命中切片/条目+得分（§5.3）；拟以中栏「检索测试」tab 形式落地。

**实施契约（本 spec 定稿）**：

```
POST /api/knowledge-bases/{kb_id}/recall-test
请求：{"query": str, "top_k": int = 5}          # top_k ≤ 20
响应：{
  "query": str,
  "paths": {
    "vector": {"hits": [{"chunk_id", "doc_name", "text", "heading_path", "page", "score": float | null, "rank"}]},
    "graph":  {"entities": [...], "relations": [...], "evidence": [{同 vector hits + "score"}]},
    "wiki":   {"hits": [{"entry_id", "title", "summary", "score", "rank"}]}
  },
  "score_type": {"vector": "qwen3-rerank relevance", "graph": "embedding cosine（当次可比）", "wiki": "embedding cosine"},
  "elapsed_ms": {"vector": int, "graph": int, "wiki": int}
}
```

- 三路调用**复用在线检索工具的内部 impl**（`_hybrid_search_impl` / `_graph_search_impl` / `_wiki_search_impl`），不另起检索逻辑；实现差异只在"不做 LLM 答案合成、直接返回原始命中与得分"。路由层以 `SimpleNamespace(context={kb_id, user_id})` 构造 runtime 传入 impl（与集成测试同一模式）。
- **得分口径**：三路分数语义不同，禁止跨路比大小——vector 是 qwen3-rerank relevance 分（**rerank 降级时为 `null`**，schema 必须可空）；graph 是二期 D1 的切片分（当次结果内可比）；wiki 是稠密向量余弦。响应逐路附 `score_type` 标注。
- **top_k 映射**：vector/wiki 直通 `top_k`；graph 路映射到 `evidence_limit` 参数（默认 8，召回测试可调大）。vector 路 `candidate_limit` 保持默认 20 ≥ top_k。
- **成本提示**：graph 路含一次实体抽取 LLM 调用 + embedding；vector 路含 embedding + rerank——召回测试即走真实链路，前端入口文案应提示"会产生检索调用成本"。
- 权限：与文档列表同级 `can_access` 门禁；无速率豁免（走真实模型调用，按调试接口定位即可）。
- 前端：中栏新增「检索测试」tab（与文档/百科并列）。**中栏三行结构（2026-08-11 定稿，同日修正）**：第一行 = 库名 + 库级菜单（上传/生成百科/重命名/删除——库级动作，对所有 tab 可见）；第二行 = tab 导航；第三行起 = 各 tab 内容（文档 tab 工具行仅搜索 + 排序，保持精简——上传置于库级菜单：往当前库加文档是库级动作，且避免工具行拥挤）。tab 内容 keep-alive 切换，文档 tab 的搜索/选中状态与索引进度轮询不中断。检索测试 tab 内容：query 输入框 + 三路结果分栏展示（命中列表 + 得分 + 耗时），命中项可展开切片原文（复用 4.6 的切片展示组件）。
- 非目标：golden set 管理、recall@k 自动计算（属轻量评测体系，另立任务，依赖本 API 积累的数据）。

## 4. P2：引用 UX 改造（类型徽标 / 上标标记 / 来源区折叠）

**主 spec 原文契约**：来源卡片带类型徽标（文档 / 百科）——一期 wiki 条目与文档切片在引用列表混排无区分，用户无法辨识来源类型；百科来源点击跳转中栏百科 tab 对应条目全文（§4.6）。

**主流产品实证（2026-08-11 调研）**：Perplexity / Google AI Overviews 采用答案下方来源卡片；ChatGPT 将来源区默认收敛为入口按钮；正文标记的共识形态是**上标脚注**（Wikipedia 模型）——缩小、弱化、基线抬高，阅读流不被打断；Copilot 的 citation chip 提供 hover 预览。两个反模式被明确规避：引用标记与正文同层级平铺、来源列表默认全量展开。

**实施契约（本 spec 定稿）**：

数据层：
- `source_type: "chunk" | "wiki"` **由前端引用解析层填充，不改后端工具返回**——`citations.ts::parseRetrievalToolContent` 在解析时已持有 `toolName`（hybrid_search / graph_search → `"chunk"`，wiki_search → `"wiki"`），`KnowledgeCitation` 增加该字段即可；wiki 引用的标识沿用现状（`chunk_id ?? entry_id` 占位，跳转取 `entry_id`）。
- hover 预览卡的摘录**复用引用对象已有的 `text` 字段**（解析层已从工具返回提取 `text ?? content`），截取前 ~120 字符，无需新增 API。
- 兼容：历史消息引用无 `source_type` 时按 `"chunk"` 渲染，不迁移存量数据。

正文内引用标记（上标化）：
- `[n]` 渲染为上标小徽章：纯数字、`font-size ≈ 0.7em`、`vertical-align: super`、弱化色（muted-foreground）、淡底圆角；视觉上属“注释层”而非正文层。
- hover 显示来源预览卡（类型徽标 + 文档名 + 页码/路径 + 摘录），用 Radix `HoverCard` 并遵守仓库既有规范：弹窗延迟打开（防快速划过闪烁）与图层管理（关闭路径回归测试，防 body `pointer-events` 残留）。
- 点击锚点跳转底部来源区对应项并短暂高亮；移动端无 hover，tap 直接展开切片抽屉。
- 流式期间 deferred 渲染：流结束后统一解析标记再上标化，避免中途 `[` 半标记抖动。

参考来源区（默认收敛 + 展开卡片化）：
- 默认折叠为一行入口：图标 + “参考来源 · N” + 类型统计（文档×a / 百科×b）；点击展开。
- 展开后为卡片列表，每条：编号 `[n]`（与正文标记双向联动定位）+ 类型徽标 + 文档名 + 页码 + `heading_path` 面包屑 + 一句摘录；行距宽松，与正文视觉权重分明。
- 展示上限 5 条，超出折叠为“查看全部”；同一文档多处引用合并为一条（编号合并展示）。
- **引用点击走叠加层而非中栏跳转**（2026-08-11 修正：引用查看是验证性动作，跳转中栏会打断阅读流并劫持中栏状态；主流产品——ChatGPT 侧栏、ima/Notion 抽屉——均为叠加层）：百科来源点击 → **右侧抽屉**展示条目全文（复用 `wiki/entries/{entry_id}` 全文端点，与 ChunkDrawer 同侧同形态），不切换中栏 tab；抽屉内提供「在百科 tab 中查看」二级入口，才做中栏跳转（用户明确进入管理视图的导航性动作）。文档来源维持现有“展开切片原文”。

模型侧纪律（SOUL.md 同步）：
- 每个论断最多 1 个引用标记，仅在论断级事实后标注；禁止一句多标（引用过载会训练用户无视标记）。

## 5. P3：文档状态三路子标记

**主 spec 原文契约**：主状态机 + 每路径子标记（向量/图谱/wiki 各状态，二期第一批补齐契约字段，悬停展示「向量✓ / 图谱 87% / wiki 待生成」）（§3.6）。

**实施契约（本 spec 定稿）**：

- documents 表新增 `path_status` JSON 列（Alembic migration；缺省 `null`，老客户端无感），结构：
  ```json
  "path_status": {
    "vector": "pending | indexing | done | failed",
    "graph":  "pending | indexing | done | degraded | failed",
    "wiki":   "pending | generating | ready | failed"
  }
  ```
  **写入时机（worker 各阶段推进时顺手更新，一次写入多处读取，避免查询期实时聚合）**：
  - `vector`：`index_chunks` 完成 → `done`（现无持久化，本列即载体；向量路先于图谱路执行，天然可能"向量先就绪先可搜"）；
  - `graph`：复用现有进度口径（`done 切片数 / 总切片数`，`progress_percent` 同源）；失败率超阈值 → `degraded`（与 error 子标记 `graph degraded` 同源）；
  - `wiki`：**库级状态镜像**而非 per-文档计算——百科是库级触发式批量，所有文档共享库的 wiki 状态（未触发 `pending` / 生成中 `generating` / 已生成 `ready`；`dirty` 条目视为已生成态——内容过期但可用，库级判定时计入 ready）；主 spec 悬停示例"wiki 待生成"本就是库级语义，per-文档 join `source_chunk_ids` 计算覆盖既昂贵又语义牵强，不做。
- indexing 中的细分百分比继续由 `progress_percent` 承担，子标记不重复表达数字（悬停文案可组合展示「图谱 87%」）。
- 前端：状态列悬停 tooltip 展示三路子状态；不新增列。

## 6. P4：解析能力扩展第一批 + 上传白名单

**主 spec 原文契约**（§3.1，2026-08-09 定稿）：TXT/CSV 本地直读（不经 MinerU，复用 md 路径）；PPT/PPTX 与 PNG/JPG 图片走 MinerU（图片经 VLM caption 文本化，管线同多模态策略）。上传入口补前后端双白名单校验（一期遗留缺口：无白名单时任意格式可上传、到解析期才 failed）——支持集合 = `.md/.markdown/.txt/.csv/.pdf/.doc/.docx/.ppt/.pptx/.png/.jpg/.jpeg`。Excel（表格切片专项策略）、网页 URL（正文抽取）延后。

**实施契约（本 spec 定稿）**：

- `parser.py` 本地直读集合扩为 `{.md, .markdown, .txt, .csv}`：先按 UTF-8 严格解码，失败回退 GBK（Windows 中文环境导出的 TXT/CSV 常见 GBK），再失败返回明确编码错误；CSV 不做表格结构理解——原文直读即契约；表格化切片属延后的 Excel 专项。
- 白名单单一事实源放 harness 层（`knowledge/parser.py` 导出 `SUPPORTED_UPLOAD_SUFFIXES`）：后端上传路由校验（不在集合 → `400` + 列出支持集合的明确文案）；**前端不硬编码副本**——新增轻量 `GET /api/knowledge-bases/supported-formats` 返回该集合，上传组件挂载时拉取生成 `accept` 与拦截提示，消除前后端漂移。
- MinerU 路径不变：`.pdf/.doc/.docx/.ppt/.pptx/.png/.jpg/.jpeg` 继续走 MinerU API；图片的 VLM caption 子步骤沿用现有多模态管线。

## 7. 非目标（明确排除）

- 邀请制共享知识库（二期后段，主 spec §5.4；一期三钩子已埋）；
- Excel 表格切片专项策略、网页 URL 正文抽取（主 spec §3.1 延后项）；
- 切片编辑/禁用（三期；设计已定稿，见 `2026-08-15-rag-phase3-editing-design.md`）；
- 检索硬编排（三路强制并行 + 统一 rerank，D5 分格预算形态约束）与轻量评测体系（golden set + recall@k）——均以 P1 召回测试积累的数据为决策前置。
