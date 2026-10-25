# RAG 知识库专精窗口设计文档（Design Spec）

> 状态：设计闭合 · 分支：feat/rag-knowledge-base · 范围：DeerFlow 新增知识库（RAG）专精对话窗口 · 规模基线：万级文档

## 1. 功能定位

为 DeerFlow 新增一个面向知识库问答的**专精对话窗口**，与现有通用对话窗口并列：

- 通用窗口：开放式任务，全工具集
- 专精窗口（本设计）：知识库问答——事实细节、概念综述、关系推理三类问题

**架构路线**：复用 lead_agent 的 agent loop（`create_agent` 的 model⇄tools 最小循环），检索能力以**工具**形式装配，不做独立图编排。检索内部是确定性流水线，检索时机由大模型在 P5 循环中自主决策——即"外层 agent loop + 内层工具化流水线"的两级嵌套。

**与九时期模型的复用关系**：P0–P8 机制代码零改动；定制全部发生在 P2 图构建的**装配输入**（新 custom agent 配置）与前端发起层（新窗口传 `assistant_id`）。记忆按 agent 隔离、检查点按 thread 隔离为免费红利。

## 2. 总体架构：三路协同 + 统一切片基座

```
原始文档（PDF / Word / Markdown，一期）
  ↓ MinerU 解析（版面分析，图片走 VLM caption 文本化）
统一切片基座（chunk）—— 三路共同原料，"切片数"字段的统一来源
  ↓                ↓                    ↓
向量路            图谱路                wiki路（生成时序最晚）
切片→embedding   切片→LLM抽三元组      实体聚合切片+图关系→LLM写条目
→Qdrant          →图存储+实体向量     →条目库+条目向量
（细节证据）      （结构导航仪）        （概念成品）
```

三路职责正交互补：

| 路径 | 角色 | 回答的问题类型 | 在线成本 |
|---|---|---|---|
| 向量路（hybrid_search） | 细节证据检索 | 事实细节、精确匹配 | 低 |
| 图谱路（graph_search） | 导航仪——不直接回答，负责"找到哪些切片相关" | 关系型、多跳推理 | 中 |
| wiki路（wiki_search） | 预消化的概念成品 | "什么是 X"概念综述 | 极低（检索即取，零生成） |

**查询时协作机制**（由主 LLM 在 P5 循环中自主选路组合）：

- 机制 A：多路召回融合——多路并行取证据
- 机制 B：实体链接扩展——向量命中切片后经 `entities` 字段进图遍历，发现向量相似度覆盖不到的跨文档切片
- 机制 C：摘要级检索——wiki 条目回答单个切片答不了的全局性/概念性问题

## 3. 离线索引流水线

### 3.1 文档解析

- 解析器：**MinerU** 官方 API（覆盖 PDF/Word/Markdown；版面分析分区标题/正文/表格/图片）
- 多模态策略：**文本化路线**——MinerU 产出图片引用 → **VLM caption 子步骤**（Qwen3-VL-30B-A3B，逐图生成中文描述）→ caption 以 `![caption](...)` 形式写回 Markdown 文本流后再切片，不引入多模态向量
- 原始文件存储：本地磁盘 `{base_dir}/data/knowledge/{kb_id}/{doc_id}/`（`base_dir` 为 gateway 数据根 `DEER_FLOW_HOME`，dev 下即 `backend/.deer-flow`），`documents.storage_path` 记录落盘绝对路径（重传覆盖、删文档级联删目录）
- 二期第一批扩展（2026-08-09 定稿；截至 2026-08-11 未实施，实施契约见 `2026-08-11-rag-phase2-batch1-design.md` §6）：TXT/CSV 本地直读（不经 MinerU，复用 md 路径）；PPT/PPTX 与 PNG/JPG 图片走 MinerU（图片经 VLM caption 文本化，管线同上述多模态策略）。上传入口补前后端双白名单校验（一期遗留缺口：无白名单时任意格式可上传、到解析期才 failed）——支持集合 = `.md/.markdown/.txt/.csv/.pdf/.doc/.docx/.ppt/.pptx/.png/.jpg/.jpeg`。Excel（表格切片专项策略）、网页 URL（正文抽取）延后

### 3.2 切片策略：结构感知为主 + 大小约束兜底

1. 按 MinerU 输出的 Markdown 标题层级切块（H1/H2 为天然边界）
2. 块 > 1024 token → 按段落递归细分
3. 块 < 100 token → 与相邻兄弟块合并
4. 目标大小 512 ± 256 token；每块记录 `heading_path`（标题路径）元数据

切片 schema：

```json
{
  "chunk_id": "doc_xxx#0042",
  "doc_id": "doc_xxx",
  "kb_id": "kb_001",
  "text": "切片正文……",
  "heading_path": ["第3章", "3.2节 切片策略"],
  "page": 17,
  "chunk_index": 42,
  "token_count": 486,
  "entities": ["广义相对论", "GPS"]
}
```

`entities` 由图谱路抽取后回填（归一化实体名），是机制 B 的双向链接点之一。

**切片存储归属**：切片正文与状态存业务库 `chunks` 表（chunk_id/doc_id/kb_id/chunk_index/text/heading_path/page/token_count/entities/extract_status/extract_error），Qdrant `kb_chunks` 只存向量 + 检索用元数据（含 chunk_id 指针）——状态管理、分页查询、引用展开都走业务库，Qdrant 不管正文。

### 3.3 向量路产物

Qdrant 单 collection `kb_chunks`，named vectors：

- `"dense"`：1024 维（以模型实际输出为准，可配），COSINE（**阿里百炼 qwen3.7-text-embedding**，DashScope API）
- `"sparse"`：稀疏向量，DOT——**同模型单次调用双路产出**（DashScope `output_type=dense&sparse`）。选型修正：bge-m3 的 OpenAI 兼容 API 不暴露 sparse，故 embedding/rerank 整体切换至百炼，恢复“一次调用双路同产”的原始设计；VLM 仍走硅基流动

payload 索引字段（仅为过滤条件建索引）：

| 字段 | 类型 | 用途 |
|---|---|---|
| `kb_id` | keyword | 多知识库隔离（payload-based multitenancy）、删库清理 |
| `doc_id` | keyword | 删/重传文档时批量清切片 |
| `entities` | keyword 数组 | 图谱扩展后 `contains any` 反查关联切片 |

其余字段（`doc_name` 冗余存储、heading_path、page 等）只用于组装返回，不建索引。

### 3.4 图谱路产物

**抽取流水线**（切片为最小单元，独立调用、状态落盘）：

```
切片 → LLM 抽取（实体+关系，含 description）
     → gleaning 补抽 1 轮（"是否有遗漏"自问，召回率 +20~30%）
     → 实体归一化（别名表 + embedding 相似度合并）
     → 写图存储 → 归一化名回填切片 entities 字段
```

- 每切片抽取状态机：`pending / done / empty / failed`，支持断点续跑与单切片重试
- 单文档失败率 > 30% 标记"图谱降级"，前端可见，杜绝静默残图
- 增量合并采用 LightRAG 式（同名实体 description 拼接/再摘要），不做 GraphRAG 式社区全量重算
- 成本控制：抽取用小模型，归一化/摘要用主力模型

**存储（三块，ID 咬合）**：

| 存储 | 内容 | 选型 |
|---|---|---|
| 图结构 | Entity 节点表（name 主键, type, description, source_chunk_ids[]）+ Relation 边表 | Kùzu（嵌入式图库）或 SQLite 两表 + NetworkX 内存计算 |
| 实体向量 | Qdrant `kb_entities`：实体名+description 稠密向量 | 复用 Qdrant 服务，不添新组件 |
| 切片 | 见 3.3 | Qdrant `kb_chunks` |

**与 Qdrant 的双向链接**：正向——图节点/边存 `source_chunk_ids`（精确取回）；反向——切片 payload 的 `entities` 字段（弹性反查）。两键冗余：chunk_id 保精确，entities 保召回，删除时两侧可精确清理。

### 3.5 wiki 路产物

- 条目 = 实体的百科页：`{entry_id, title, content, kb_id, status(dirty/ready), source_chunk_ids[], updated_at}`
- 粒度两级：**实体级**（重要实体各一篇）+ **主题级**（图上紧密社区各一篇，借鉴 GraphRAG 社区摘要）。**二期候选**（2026-08-12 设计讨论定方向）：主题级实施时以“主题聚簇”承载同簇实体（如 String/StringBuilder/StringBuffer/常量池 合写一篇，成员实体向量指向同一条目），从根上缓解同源材料条目的内容冗余
- **条目资格策略**（2026-08-12 修订，原“头部 ~20%”比例制废止）：实体获得条目需同时满足——①通过卫生过滤（剔除纯符号/运算符、引号字面量、单字符、超长碎片等抽取垃圾）；②跨切片（`len(source_chunk_ids) ≥ 2`——只出现在单一切片的实体由向量路直接服务，写条目等于复述单节原文，无聚合价值）。**不设条目总数上限**，丰富度随库内跨切片概念自然增长；score（图度数+频率）不再决定“写不写”，仅决定生成与补写顺序；长尾依旧靠图谱碎片。修订动机（2026-08-12 实测）：比例制席位随实体总数无限膨胀（一篇概念密集文档把席位从 6 冲到 54，尾部混入薄条目），且无法表达“单切片实体不值得综述”的资格语义
- **条目生命周期（2026-08-12 资格制配套）**：资格即条目存在理由——①合格且材料变化 → dirty 重生成；②删除文档致实体失格（freq 跌下 2）→ 删除条目与其 `kb_wiki_entries` 向量（实体节点与其 `kb_entities` 向量保留，剩余活切片由向量路直接服务，不违背删除意图）；③实体消失（孤儿清除）→ 删除条目与条目向量；④D3 合并 → 别名条目删除、代表名条目 dirty 重生成。生命周期由删除/合并事件驱动（级联与 resolver），`generate_wiki` 自身只写不删（幂等，不做资格清算）。比例制语境的“挤出头部保留不删”原则随资格制废止
- **生成调度：材料束批量**（2026-08-12）：切片集合高度重叠的实体打包共享一次 LLM 调用——贪心聚簇（Jaccard≥0.5，实体按 score 降序遍历）后每包 ≤7 实体，prompt 携带包内并集切片（只送一次）+ 实体清单，结构化输出多条目（JSON 数组，title 白名单校验）；缺篇或解析失败的包自动降级为逐条补写；dirty 重生成保持逐条（量小不值得打包）。动机：生成轴心（实体）与材料轴心（切片）错位导致同批切片被重复搬运（实测 27 切片/152 合格实体 → 逐条需 518 次切片搬运、152 次串行调用 ≈60 分钟）；批量后 ≈22 次调用、耗时降至约 1/5，且条目产物模型不变（仍一实体一条目）
- 更新：新文档涉及的实体条目标记 `dirty`，后台增量重生成，不重建全库。**2026-08-12 修订**：①增量目标集扩为「dirty 条目 ∪ 当前头部中尚无条目的实体」（新晋头部自动补写；被挤出头部的旧条目保留不删）——原契约只管内容过期刷新，不管头部成员资格变化；②落地注记：dirty 钩子（`mark_dirty_for_entities`）一期未接入 worker 导致增量空转，已随二期第一批修复（实施契约见 `2026-08-11-rag-phase2-batch1-design.md` 的 plan Task 5b）；③随 2026-08-12 资格制修订，“新晋头部”措辞相应理解为“新晋合格实体”；自动增量补写节流为每次 ≤40 篇（score 降序，批量调度下 ≈6 次调用），dirty 条目重生成与手动「生成百科」全量均不受节流限制
- 存储：全文+状态放 backend 统一 database（SQLite/PG）`wiki_entries` 表；向量放 Qdrant `kb_wiki_entries`（payload 只存 entry_id 指针 + title + kb_id）——"向量库存指针、正文存业务库"

**wiki 与图谱的边界**：图谱管跨实体结构广度（在线遍历受跳数与上下文预算限制），wiki 管单实体消化深度（离线预算充裕，可消化全部关联切片浓缩成文）。两者不构成替代关系。

### 3.6 文档状态机与文档列表契约

文档列表字段（Document 表核心 schema），展示形态参考（超越 ima 的单文件名展示）：

```
│  名称              上传者   大小    切片数  状态       时间   │
│  📄 产品手册.pdf    张三    2.3MB   156    ● 就绪   08-01 │
│  📄 技术白皮书.md   王五    456KB    —     ◐ 67%   08-01  │
统计：共 5 个文档 · 245 个切片
```

| 前端字段 | 后端字段 | 说明 |
|---|---|---|
| 名称 | `name` | 原始文件名（含类型图标） |
| 上传者 | `uploader_id` | **一期必埋字段**：一期恒为库 owner，二期共享库激活语义（谁传的文档一目了然） |
| 大小 | `size_bytes` | 字节数 |
| 切片数 | `chunk_count` | 索引完成后回填；未完成显示 "—" |
| 状态 | `status` + `progress_percent` + 三路子标记 | 主状态机 + 每路径子标记（向量/图谱/wiki 各状态，二期第一批补齐契约字段，悬停展示「向量✓ / 图谱 87% / wiki 待生成」，实施契约见 `2026-08-11-rag-phase2-batch1-design.md` §5）；indexing 中显示百分比 |
| 时间 | `created_at` | 上传时间 |

底部统计行（共 N 文档 · M 切片）：前端从列表聚合，不占 API 契约。

进度百分比算法：`progress = 图谱抽取 done 切片数 / 总切片数`——以切片粒度计算（3.4 状态机已落盘），图谱路是最慢阶段故近似整体进度，且天然涵盖失败重试。

主状态机：`uploaded → parsing → chunking → indexing → ready / failed`；向量/wiki/图谱各带子标记（如"图谱 87%"），允许向量先就绪先可搜。

**切片可视化**（主流开发者向 RAG 平台标配，Dify/RAGFlow 均有）：点击文档行 → 抽屉展示该文档全部切片（文本 + heading_path + 页码 + token 数 + 关联实体），一期做只读预览；召回测试（输入 query 看命中切片+得分，Dify/RAGFlow 验证过的调优闭环）二期第一批；切片编辑/禁用（写回三库）三期。与 4.6 引用卡片的“展开切片原文”复用同一展示组件。

### 3.7 索引任务执行载体与级联删除

- **执行载体**：索引进程为长任务（万级文档需数十万抽取调用），不阻塞上传请求。上传接口仅入库 Document 记录并投递异步任务；任务在 backend 后台 worker（asyncio 任务 + 并发上限）中执行，状态推进实时写回 Document 表，前端轮询/SSE 获取进度
- **启动恢复**：worker 启动时扫描非终态 documents（非 ready/failed）重新入队；切片级抽取状态机保证续跑不重抽
- **级联删除**（删文档时三库一致性）：
  1. Qdrant：按 `doc_id` 批量删 `kb_chunks` 切片点
  2. 图存储：删该文档切片贡献的实体/关系条目；实体 `source_chunk_ids` 清空后成为孤儿节点→删除（其向量从 `kb_entities` 同步删除）；仅剩部分来源失效的实体保留并更新 description（标记 dirty 增量再摘要）
  3. wiki：受影响条目标记 `dirty`，后台重生成
  4. 知识库整体删除：按 `kb_id` 清三个 Qdrant collection + 图分区 + wiki 表
- **wiki 首次生成时机**：头部实体策略依赖全局实体统计（鸡生蛋问题），故 wiki 生成采用**触发式批量**：知识库索引完成度达阈值（或手动点击"生成百科"）后统一跑一轮；此后转入 dirty 增量模式

## 4. 在线查询：三个工具的执行链

### 4.1 hybrid_search（向量路）

```
query → qwen3.7-text-embedding API（dense+sparse 单次双路产出）
      → Qdrant Query API：prefetch 双路各 top-20 → RRF 融合（粗排）
      → qwen3-rerank 精排 → top-5
      → 返回切片文本 + doc_name/page/heading_path（供引用）
```

### 4.2 graph_search（图谱路）

```
query → 局部 LLM 抽实体/关键词
      → kb_entities 向量匹配命中实体集
      → 图遍历 1~2 跳邻居 + 关系描述
      → source_chunk_ids 精确取回 + entities 反查补充 → 切片原文
      → 返回 {实体关系描述 + 切片证据}；查无结果如实返回，绝不编造
```

二期增强（2026-08-10 补充 spec `2026-08-10-rag-graph-quality-design.md`）：证据选择重构为"图结构定候选池 + 每源限流 + 保底（逐轮出资）+ 纯切片分全局竞争"；扩展增加语义剪枝 + 节点预算 + 枢纽守护；移除弹性反查通道③（实证与节点通道重复）；增量全局实体再归一（跨切片别名合并）。

### 4.3 wiki_search（wiki 路）

```
query → embedding → kb_wiki_entries 向量检索 top-k
      → 按 entry_id 取回整篇条目 → 返回
```

### 4.4 容错与降级

三路平行架构天然免疫单路部分失效：图谱缺失的切片仍可被向量路命中（导航仪失灵，车照开）。graph_search 返回空时主 LLM 自然转向其他路——agentic 架构的自恢复能力，无需硬编码降级逻辑。

### 4.5 运行时知识库定位（kb_id 传递）

绑定模式已定：**库间对话隔离的单库绑定**（参照 ima：选中哪个库，对话就基于哪个库）。传递链：前端创建 thread/发 run 时在 `context` 携带单个 `kb_id` → Gateway 透传进 run context → 三工具执行时从 runtime context 读取并作为 Qdrant 强制过滤条件。无 kb_id 时工具返回引导语（"请先在窗口中选择知识库"），不静默全库检索。对话历史按库隔离：thread metadata 记 `kb_id`，每库独立 thread 列表。

### 4.6 引用溯源契约

工具返回的每条证据携带 `{doc_name, page, heading_path, chunk_id}`；SOUL.md 约束主 LLM 回答中使用 `[序号]` 标注引用；前端将引用渲染为可点击卡片（显示来源文档+页码），点击展开切片原文。**二期第一批补充**：来源卡片带类型徽标（文档 / 百科）——一期 wiki 条目与文档切片在引用列表混排无区分，用户无法辨识来源类型；百科来源点击跳转中栏百科 tab 对应条目全文（实施契约见 `2026-08-11-rag-phase2-batch1-design.md` §4）。检索工具执行过程复用现有 tool_progress middleware 的进度事件，前端显示"正在检索知识库…"等状态。

### 4.7 检索模式开关（已定：方案 C——默认自主 + 显式深度强制）

参照主流产品共识（ChatGPT Deep Research、Kimi 深度研究、Perplexity Pro Search 均为显式按钮）：默认便宜快答，用户一键升级深度模式。

- **传递链**（复用现有 thinking_enabled 同类开关通道）：右栏对话面板「深度检索」开关 → `context.deep_research` → P2 装配/prompt 层
- **关（默认）**：模型自主选路；SOUL.md 引导"简单问题优先向量路，按需再升级 wiki/图谱"——控成本、控延迟
- **开**：prompt 注入强制指令"本轮必须调用 wiki_search 和 graph_search，并综合三路证据作答"
- **边界**：开关是"强制升级"而非三路总开关——默认模式下模型仍保有自主调用 wiki/图谱的能力，不被阉割
- **一期实现为 prompt 软强制**：SOUL.md 是静态文件无法按 run 切换——双模式静态规则写入 SOUL.md，动态强制指令由 middleware（before_model 钩子读取 `context.deep_research`）按 run 注入；二期以召回测试的评测数据为支撑，再评估是否在工具层做硬编排（三路强制并行 + 统一 rerank）。**（2026-10-02 补充）**：一期软约束一侧已补「作答前自查+有界补检」，见 [2026-10-02-rag-answer-selfcheck-design.md](2026-10-02-rag-answer-selfcheck-design.md)。**形态约束（2026-08-10 补充 spec D5）**：硬编排落地时按"分格预算"——各路内部同类候选精排 + 跨路按角色分配 token 预算，禁止三路产物混池平铺排序

## 5. DeerFlow 集成方案

### 5.1 后端装配（P2 装配输入）

新增 custom agent 目录 `{base_dir}/users/{user_id}/agents/rag/`：

- `config.yaml`（AgentConfig）：
  - `tool_groups: ["rag"]`——RAG 三工具仅对本 agent 可见
  - `skills: []` 或仅保留 deep-research
  - `model_settings.temperature: 0.1`——保证回答严谨
- `SOUL.md`：专精 prompt——强制引用格式、来源标注、"检索不到就说不知道"拒答策略、作答前自查与有界补检（2026-10-02 补充，见 [2026-10-02-rag-answer-selfcheck-design.md](2026-10-02-rag-answer-selfcheck-design.md)）

工具落地：`backend/packages/harness/deerflow/tools/builtins/` 下新建三个工具文件，`@tool(parse_docstring=True)` 注册；config.yaml 的 `tool_groups` 定义 `"rag"` 组。工具描述写清各自适用场景（决定 LLM 选路质量）。

### 5.2 前端设计（已定：ima 式三栏布局，对话按库隔离）

信息架构参照 ima 知识库界面，侧边栏**一级入口**「知识库」进入三栏布局单页：

```
/workspace/knowledge
├── 左栏：知识库分组列表
│     ├── 个人知识库（组头「+」新建）—— 一期
│     ├── 共享知识库（「+」新建 / 通过邀请链接加入）—— 二期后段
│     └── （订阅知识库 / 广场 —— 远期可选，参照 ima 生态）
├── 中栏：选中库的内容管理（tab 分区：文档 | 百科 | 检索测试）
│     ├── 头部：库名 + 类型标签 + ⋯操作菜单（上传文档/生成百科/重命名/删除）
│     ├── 文档 tab：文档表格（名称 / 上传者 / 大小 / 切片数 / 状态 / 时间 / 操作）+ 搜索/排序工具行 + 批量选择与右键菜单 + 底部统计行（见 3.6）
│     ├── 百科 tab：wiki 条目列表（标题 / 摘要 / dirty·ready 状态 / 更新时间），点击条目右侧抽屉看全文；「生成百科」进度在此展示
│     └── 检索测试 tab：输入 query → 三路（向量/图谱/wiki）命中结果分组展示 + 得分（对应 5.3 recall-test 端点；Dify/RAGFlow 验证过的调优闭环）
└── 右栏：对话面板（内嵌聊天组件，基于当前库提问）
```

**操作逻辑**：

- 上传：拖拽多文件 → multipart 上传 → 立即入列（状态 uploading）→ 轮询状态推进至 ready/failed
- 状态：主状态徽章，悬停显示三路子标记（向量✓ / 图谱 87% / wiki 待生成）
- 点击文档行：切片预览抽屉（见 3.6）
- 删除：确认弹窗（提示三路级联清理）→ 后台异步执行
- 对话：右栏选中库即绑定，kb_id 单值注入 run context；每库独立 thread 列表（隔离）
- 深度检索开关：右栏对话输入区提供「深度检索」开关，状态随 `context.deep_research` 传递（见 4.7）

**复用与路由**：

- 对话面板复用现有聊天组件套件（useStream + assistantId="rag"）；完整对话页可走现成路由 `workspace/agents/rag/chats/[thread_id]`（从右栏展开进入，实测该路由已将 agent_name 注入 run context）
- agent 创建 UI（workspace/agents/new）与 assistants 列表接口均已存在，rag agent 可被自动列出
- 引用卡片渲染（见 4.6）：回答中 [n] → 来源卡片（文档名 + 页码，点击展开切片原文）

### 5.3 知识库管理 API 契约（前后端先行定义）

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/knowledge-bases` | GET/POST | 知识库列表 / 新建 |
| `/api/knowledge-bases/{kb_id}` | GET/PATCH/DELETE | 详情 / 重命名 / 删除（级联见 3.7） |
| `/api/knowledge-bases/{kb_id}/documents` | GET/POST | 文档列表（含状态）/ 上传（multipart，异步索引） |
| `/api/knowledge-bases/{kb_id}/documents/{doc_id}` | DELETE/POST retry | 删除（级联）/ 失败重试 |
| `/api/knowledge-bases/{kb_id}/documents/{doc_id}/chunks` | GET | 切片列表（分页；切片预览抽屉，一期只读） |
| `/api/knowledge-bases/{kb_id}/wiki/entries` | GET | wiki 条目列表（百科 tab：title/summary/status/updated_at；不含全文） |
| `/api/knowledge-bases/{kb_id}/wiki/entries/{entry_id}` | GET | wiki 条目全文（条目抽屉 + 引用跳转落地） |
| `/api/knowledge-bases/{kb_id}/recall-test` | POST | 召回测试：query → 三路命中切片/条目+得分（二期第一批落地，实施契约见 `2026-08-11-rag-phase2-batch1-design.md` §3） |
| `/api/knowledge-bases/{kb_id}/wiki/generate` | POST | 触发 wiki 批量生成（见 3.7） |

### 5.4 知识库权限模型（已定：私有起步 + 邀请制共享二期）

路线参照 ima 共享知识库模式：一期仅私有，二期邀请制共享。**agent 人格与 kb 数据权限正交**：rag agent 按 per-user 落地（每用户自己的 SOUL.md 与记忆隔离）；kb 带权限表，被邀请者用自己的 agent 实例访问共享库——共享只发生在数据层。

**一期必埋的三个钩子**（不埋则二期需迁移存量数据或改动 API 契约）：

1. `knowledge_bases` 表带 `owner_id` + `visibility`（`private/shared` 枚举，一期恒为 `private`）
2. 所有访问入口（API 层 + 工具层）统一走 `can_access(user_id, kb_id)`；一期实现为 `owner_id == user_id`，二期改查成员表——API、工具链、前端零改动
3. API 路径保持中性（即 5.3 的 `/api/knowledge-bases`，不含 private 语义）

**工具层安全闸门**：RAG 三工具执行时从 run context 取 `user_id` + `kb_id`，先过 `can_access` 再检索。一期就要有（哪怕实现仅一行），防止共享上线后“知道 kb_id 即可查他人库”。

**二期增量**：

- `kb_members` 表：`{kb_id, user_id, role(owner/member), invited_by, joined_at}`
- 邀请链接机制：带过期时间、可撤销、可设使用次数（主流做法，优于手动输用户 ID）
- 角色分期：二期 owner + member（可问答、看文档列表）；admin/editor（管成员、传文档）三期可选

## 6. 技术选型总表

| 组件 | 选型 | 备注 |
|---|---|---|
| 文档解析 | MinerU | PDF/Word/MD 一期全覆盖 |
| 多模态 | VLM API caption | 文本化路线 |
| 向量库 | Qdrant（独立服务） | 三 collection：kb_chunks / kb_entities / kb_wiki_entries |
| embedding | qwen3.7-text-embedding（阿里百炼 DashScope） | `output_type=dense&sparse` 单次调用同产稠密+稀疏 |
| rerank | qwen3-rerank（阿里百炼） | 精排 |
| 图存储 | Kùzu 或 SQLite+NetworkX | 嵌入式，不添容器 |
| 条目/文档元数据 | backend 统一 database（SQLite/PG） | 状态机所在 |
| 抽取 LLM | 小模型（成本） + 主力模型（归一化/摘要/wiki） | 万级文档约数十万抽取调用 |

规模预期：万级文档 ≈ 百万级切片、归一化后数万~数十万实体节点，全精度向量、单节点 Qdrant 可承载。

## 7. 待决策项与分期

**已定决策**：

1. custom agent 可见性：按 per-user 语义落地（现有目录机制），共享只发生在 kb 数据层（见 5.4）
2. 权限模型：私有起步 + 邀请制共享二期，can_access 单点封装（见 5.4）

**已定决策（前端）**：

3. 绑定模式：库间对话隔离的单库绑定（ima 式，见 4.5/5.2）
4. 入口层级与建库关系：侧边栏一级入口 + ima 式三栏布局，分组组头「+」建库（见 5.2）
5. 检索模式：方案 C 混合模式——默认模型自主选路 + 显式「深度检索」开关强制三路（见 4.7）

**动手前需定**：

1. 索引 worker 的并发配额与 LLM 抽取调用的限流策略（成本闸门）

**分期**：

- 一期：PDF/Word/MD + 三路检索 + 专精窗口 + 文档管理列表 + 私有知识库（含三个权限钩子）+ 切片只读预览
- 二期第一批（2026-08-09 锁定）：入库类型扩展（TXT/CSV 直读 + PPT/图片走 MinerU，前后端白名单）、中栏 tab 结构（文档 | 百科 | 检索测试）、引用来源类型徽标与 wiki 条目可视化管理、召回测试端点落地、文档状态三路子标记、轻量召回评测脚本（golden set，工程脚本非产品功能）
- 二期后段：邀请制共享（kb_members + 邀请链接，暂缓）、Excel/网页解析（暂缓）、图谱可视化（形态待定：力导向图或轻量实体列表）、评测驱动的检索硬编排评估（依赖召回测试数据）
- 三期：切片编辑/禁用（写回三库；设计已定稿，见 `2026-08-15-rag-phase3-editing-design.md`）、admin/editor 角色
- 升级预留：若评测证明需要固化流程（如深度研究报告的确定性 DAG），再注册第二张图做显式编排，P0–P8 生命周期仍复用
