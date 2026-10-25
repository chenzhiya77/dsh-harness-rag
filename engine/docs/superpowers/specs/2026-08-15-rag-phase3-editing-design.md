# RAG 三期第一批功能设计（切片编辑 / Wiki 双模式编辑 / 人工知识卡片 / 删除失格预览）

> 状态：✅ 已落地（2026-08-16） · 日期：2026-08-15 · 范围：主 spec 三期预留「切片编辑/禁用（写回三库）」+ Wiki 条目人工编辑 + 人工知识卡片通道 · 关联：主 spec `2026-08-07-rag-knowledge-base-design.md` §3.4（切片可视化抽屉）/ §9（三期清单）；二期 Batch-1 spec `2026-08-11-rag-phase2-batch1-design.md` §7 非目标预留项 · 实施 Plan：`docs/superpowers/plans/2026-08-15-rag-phase3-editing.md`（Task 1-9 全绿）

## 1. 背景

主 spec 将「切片编辑/禁用（写回三库）」划入三期（§9），一期切片抽屉为只读预览（§3.4）。当前能力缺口：

- 知识库内容修正**只有删除一条路**：文档级删除（级联 wipe）或 Wiki 条目删除（触发资格制重建），无法修正 OCR 错字、乱码、隐私泄漏等局部问题；
- **Wiki 双通道分离缺失**：AI 生成的 Wiki 条目被自动刷新机制不断覆盖，用户无法在保持生成式进化的同时保留手工提炼的核心知识片段。

**架构事实核查（本 spec 的设计基础，2026-08-15 代码核查）**：

1. **三层绑定均为 ID 引用而非内容引用**——`chunks.entities`（切片标注实体名）、`graph_entities.source_chunk_ids`（实体溯源）、`wiki_entries.source_chunk_ids`（条目溯源）。编辑切片 `text` 不改变 `chunk_id`，链路引用完好，**编辑天然安全**；
2. **向量与文本同步缺口**：改 `text` 后 Qdrant `kb_chunks` 中该切片的 embedding 仍是旧文本的，检索按旧向量匹配却返回新文本，产生语义漂移。故编辑必须附带**单向量重嵌入**（单 chunk embed + upsert，成本极低）——此即主 spec「写回三库」的最小正确实现；
3. **不能复用 `_reparse_and_chunk` 做编辑后重抽取**：该管线从 `storage_path` 源文件重新解析（MinerU/本地直读），会用文件旧内容**覆盖 DB 中的人工编辑**。编辑后的重抽取必须是**单切片级**：只对该 chunk 新文本重跑实体/关系抽取，并复用 `remove_chunk_contributions` 摘除旧贡献；
4. **删除级联已有完整机制**：`remove_chunk_contributions`（graph/store.py）→ orphaned 实体删除 + affected 实体精简 + 关系清理 + wiki 失格/dirty 标记。切片级删除预览只需提取其计算逻辑做 dry-run。

**需求场景（2026-08-15 用户讨论）**：OCR/乱码修正、隐私信息脱敏、术语解释优化、**AI 生成 Wiki 外的人工知识卡片隔离存储**。

## 2. 交付项与建议顺序

| # | 交付项 | 依赖与理由 |
|---|---|---|
| P1 | Wiki 双模式编辑（正文 + 补充层） | 无前置；改动最小（wiki_entries 加 supplement_content 列），验证「编辑即材料」语义 |
| P2 | 切片文本编辑 + 单向量重嵌入 | 无前置；写回两库（业务 DB + Qdrant），图谱不动 |
| P3 | 单切片实体重抽取（显式触发） | 依赖 P2；复用 worker per-chunk 抽取逻辑 + `remove_chunk_contributions` |
| ~~P4~~ | ~~切片禁用（可逆）~~ | ❌ **删除**：直接用删除代替，禁用功能冗余 |
| P5 | 删除失格预览（dry-run） | 依赖切片管理入口；`remove_chunk_contributions` 纯计算化改造 |
| **P6 (新增)** | **人工知识条目系统** ⭐ | 独立于 Wiki 的全新条目类型，永不自动更新，与 AI 生成内容隔离 |

切片管理入口（文档行 → 切片抽屉）一期已有只读预览组件（主 spec §3.4），P2-P5 均在该抽屉内扩展操作位，不新增页面。

## 3. P1：Wiki 双模式编辑（正文 + 补充层）

**核心语义**：
- **正文编辑**：与自动生成内容同结构，重生成时作为参考材料融入新版本（"编辑即材料"）；
- **补充层**：依附于条目的随手批注区，**条目存活期间永不被重生成覆盖**，且在下一次重生成时作为额外参考材料提供；**条目删除时随条目一并删除**（不做自动打捞，用户的重要经验应主动沉淀到 P6 人工知识卡片）。

> **更正（2026-09-12，见 `2026-09-12-rag-wiki-supplement-direction-design.md`）**：A7 只落地了一半。
> 补充层「在下一次重生成时作为额外参考材料提供」**当初并未实现**（生成侧两个 prompt 都不读条目），
> 2026-09-12 已补齐（注入 user message + 保存补充层即排队单条重写）；
> **正文编辑**那一半「重生成时作为参考材料融入」**不在实现范围**——正文只会被重写覆盖，不会被融入，
> 编辑框文案已改为只说「会被覆盖」。上面这条与生命周期表首行的原文保留，作为当时的决策记录。

**补充层生命周期（2026-08-15 拍板：与条目同生共死）**：

| 事件 | 主内容 | 补充层 |
|------|--------|--------|
| 条目 dirty 重生成 | 被新版本替换（人工编辑作为参考材料融入） | 保留不动，继续作为参考材料 |
| 异名实体合并（re-resolution） | alias 条目删除 | **随条目一并删除** |
| 实体失格（源切片全删） | 条目删除 | **随条目一并删除** |
| 用户手动删条目 | 条目删除 | **随条目一并删除**（删除确认弹窗中提示"该条目含人工补充内容，将一并删除"） |

实现方式（最小改动方案）：
- `wiki_entries` 表新增 `supplement_content TEXT` 列（nullable）；
- 编辑器 UI 两区并列：主内容区（可编辑）+ 补充区块（可编辑/追加）；
- `upsert_entry`（重生成写入点）：新条目只写 `content`，`supplement_content` 保持不变；
- **无打捞钩子**：`delete_entries` 不区分内容来源，整行删除即完成——重要知识的永久保存由 P6 人工知识卡片承担（用户主动创建，与条目无绑定）；
- API：
  ```
  PATCH /api/knowledge-bases/{kb_id}/wiki/entries/{entry_id}
  请求：{"content": str, "supplement_content": str | null}
  权限：与文档上传同级 can_access（个人知识库场景下不限制）
  ```
- 前端：百科 tab 条目视图加「编辑」按钮 → 双区编辑器（正文区 + 补充区）；保存时在底部显示轻量审计标签（"最后编辑时间：XXX" + 「已编辑」徽标）；补充区编辑框旁常驻提示：「补充内容随条目删除一并清除，重要知识请存到知识卡片」。

## 4. P2：切片文本编辑 + 单向量重嵌入

- API：
  ```
  PATCH /api/knowledge-bases/{kb_id}/chunks/{chunk_id}
  请求：{"text": str}
  响应：更新后的 chunk（含 token_count 重算）
  ```
- **写回两库**（主 spec「写回三库」的最小实现，图谱留 P3）：
  1. 业务 DB：`chunks.text` 更新 + `token_count` 重算 + `last_edited_at` 时间戳（轻量审计标记，对齐点 A2）；
  2. Qdrant `kb_chunks`：新文本**单条 embed + upsert**（同 point id，覆盖旧向量），payload 中文本同步更新；
  3. 图谱：**不动**——`chunks.entities` 列与实体 `source_chunk_ids` 保持原值（ID 引用不受文本变更影响）。
- 前端交互：切片抽屉内文本区变可编辑；保存时明确提示「**实体与 Wiki 不会自动更新**，如需以新内容重建实体请使用『重新抽取』」（链 P3）；编辑后切片显示「已编辑」小徽标。
- 边界：`heading_path` / `page` 不可编辑（结构元数据来自解析期）；空文本拒绝（400）。

## 5. P3：单切片实体重抽取（显式触发）

**设计修正**（2026-08-15 核查，推翻"复用 `_reparse_and_chunk`"的初稿）：整文档重试管线从源文件重解析，会覆盖人工编辑；必须做**单切片级**重抽取。

- 触发：切片抽屉内「重新抽取实体」按钮（带成本提示：1 次 LLM 抽取调用 + 若干 embedding）；
- **互斥范围（已定）**：同文档互斥即可——同一文档存在运行中任务时拒绝触发（与文档重试 `__reparse_and_chunk_` 互斥），库级不锁（实现轻量、阻塞面小）；
- 流程（复用现有组件，不重写级联）：
  1. `remove_chunk_contributions(kb_id, [chunk_id])` → `(orphaned, affected)`（摘除该切片的旧图谱贡献）；
  2. orphaned 实体 → `vector_store.delete_entities` + wiki 失格链（复用 worker 同款调用序列）；
  3. 对 chunk **新文本**重跑 worker 的 per-chunk 实体/关系抽取（抽取函数从 worker 抽为可复用方法）；
  4. 新实体/关系走正常 upsert 管线 + `chunks.entities` 双写更新 + Qdrant payload 同步；
  5. affected ∪ 新晋实体 → `mark_dirty` wiki 增量链（资格制自动补写，复用二期机制）；
- 非原子性声明（已定稿）：步骤 1 与 3-4 之间失败 → 该切片旧贡献已摘除、新贡献未写入，等价于"切片暂失图谱贡献"；由用户重新触发恢复，不做自动回滚（与现有 worker 失败语义一致）。

## 6. P5：删除失格预览（dry-run）

- `remove_chunk_contributions` 重构：提取**纯计算函数**（读 entities/relations → 算 orphaned/affected，不 commit）；commit 版与 dry-run 版共用该计算，杜绝双实现漂移；
- API：
  ```
  POST /api/knowledge-bases/{kb_id}/chunks/delete-preview
  请求：{"chunk_ids": [str]}
  响应：{
    "orphaned_entities": [str],        # 将失格删除的实体名
    "affected_entities": [str],        # 将精简 source_chunk_ids 的实体名
    "affected_wiki_titles": [str],     # 将标 dirty / 失格的 wiki 条目
    "relation_deletions": int          # 将删除的关系数
  }
  ```
- 前端：切片删除按钮 → 预览对话框（失格实体列表红色警示 + 受影响条目黄色提示 + 「删除不可恢复」声明）→ 确认才执行真删除（真删除走现有级联，不另写）；
- 文档级删除沿用现有级联，本预览仅服务切片级操作；文档级预览为可选增强（非目标外沿，视实施余量）。

## 7. 决策点（全部已拍板）

| # | 决策点 | 选择 | 说明 |
|---|--------|------|------|
| A2 | 编辑审计粒度 | **轻量版** | `last_edited_at` + 「已编辑」徽标，不留历史版本 |
| A3 | P3 与文档重试互斥范围 | **同文档互斥**即可 | 库级不锁，实现轻量 |
| A4 | 禁用切片为何存在？ | ❌ **删除 P4** | 直接用删除代替，禁用功能冗余 |
| A5 | 编辑入口权限 | **不限制** | 能访问就能编辑（个人知识库场景） |
| A7 | Wiki 编辑方案选型 | **方案 B：编辑即材料** | 正文编辑（可被覆盖）+ 补充层（不被重生成覆盖），重生成时都作为参考材料 |
| A8 | P6 人工知识系统检索集成 | **可选混合，共享名额** | 卡片级 `include_in_wiki_search` 开关；开启后与 AI Wiki 条目共享同一 top_k 名额池，按 score 纯质量竞争（不给人工卡片单独配额） |
| A9 | 条目删除时补充层处置 | **随条目一并删除（无打捞）** | 补充层是依附性批注，与条目同生共死；重要经验由用户主动沉淀到 P6 知识卡片；手动删除时弹窗提示补充内容将一并清除 |

所有决策点已确认，spec 状态翻转为「✅ 已定稿」。

## 8. P6：人工知识条目系统（新通道）

**核心目标**：在 AI 生成的 Wiki 条目之外，提供**完全人工管理**的知识卡片通道，永不自动更新，与项目内容隔离。

### 数据模型

`manual_knowledge` 表（新增）：
```python
class ManualKnowledgeRow(Base):
    __tablename__ = "manual_knowledge"
    
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    kb_id: Mapped[str] = mapped_column(String(64), index=True)  # 归属哪个知识库
    owner_id: Mapped[str]  # 创建人 ID（个人知识库 = kb.owner_id）
    title: Mapped[str] = mapped_column(String(512))
    content: Mapped[str] = mapped_column(Text)  # Markdown 格式
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
    tags: Mapped[list] = mapped_column(JSON, default=list)  # 可选分类标签
```

### API 端点

```
POST   /api/knowledge-bases/{kb_id}/manual-knowledge      # 创建条目
GET    /api/knowledge-bases/{kb_id}/manual-knowledge       # 列表（分页）
GET    /api/knowledge-bases/{kb_id}/manual-knowledge/{id}  # 详情
PUT    /api/knowledge-bases/{kb_id}/manual-knowledge/{id}  # 更新（全量覆盖）
PATCH  /api/knowledge-bases/{kb_id}/manual-knowledge/{id}  # 部分更新
DELETE /api/knowledge-bases/{kb_id}/manual-knowledge/{id}  # 删除
```

### 检索集成策略（已定稿：可选混合，共享名额）

**核心机制（2026-08-15 拍板）**：
- 人工卡片带 `include_in_wiki_search: bool` 开关（默认 `false`）；
- 开启后卡片内容生成 embedding 存入 Qdrant，**与 AI Wiki 条目共享同一个 `top_k` 名额池**——不单独给人工卡片配额；
- Wiki 路检索时合并两路候选 → 按 score（同一 embedder 余弦相似度）降序 → 截取前 `top_k` 条；
- **纯质量竞争**：人工卡片分数高则挤占 AI 条目名额，分数低则自然落选——检索总量恒定，来源透明竞争；
- 返回结果通过 `source_type: "wiki" | "manual"` 标识来源（前端引用卡片区分展示「百科」/「我的卡片」徽标）；
- 关闭开关的卡片：不参与检索，仅在百科 tab 分区展示（纯管理视角）。

### 前端展示逻辑

百科 tab 三栏结构（可选）：
1. **AI 生成区**（默认展开）
   - Wiki 条目列表（资格制条目）
   - 每条支持「正文编辑 + 补充层编辑」
2. **「我的知识卡片」**（可折叠，默认收起）
   - 人工知识条目列表
   - 提供「+ 新建卡片」按钮
   - 每条支持全量 CRUD

### 与 Wiki 条目的区分

| 特性 | Wiki 条目（自动生成） | 人工知识条目（P6） |
|------|---------------------|-------------------|
| 来源 | LLM 基于实体 + 材料束生成 | 用户手动创建 |
| 生命周期 | 随资格制刷新 | 永久静止 |
| 更新策略 | dirty 标记 → 重生成 | 仅用户手动保存 |
| 失格处理 | 实体消失 → 删除 | 不受影响（无绑定） |
| 检索集成 | ✅ 参与三路检索 | ✅ 可选混合（共享 top_k 名额，卡片级开关） |
| 存储列 | `wiki_entries.content + supplement_content` | `manual_knowledge.content` |

### 实施优先级

**Phase 3A（第 1 个月）**：基础 CRUD + 百科 tab 双通道展示 + 可选混合检索（卡片级开关 + embedding 入库 + Wiki 路共享名额混排）

**Phase 3B（第 2 个月）**：可选功能（标签系统、卡片引用统计），详见补充 spec。

## 9. 非目标（明确排除）

- 实体/关系的直接编辑（实体名、类型、关系边）——merge 与 re-resolution 流程会重写，编辑必丢，属图谱治理专项（另立 spec）；
- 编辑历史版本管理与 diff 视图（对齐点 A2 的延后端）；
- 切片拆分/合并（改变 chunk_id 体系，影响全部 ID 引用，属切片策略专项）；
- 文档级「重新解析时保留人工编辑」的合并策略（与 P3 单切片重抽取语义冲突，待 P3 落地后评估）;
- 共享知识库场景的多人编辑冲突处理（三期后段角色体系前置）。

---

**本 spec 状态**：✅ 已定稿（待实施） — Phase 3A 内容全部覆盖至此。
