# RAG 评测题库改造设计（多路预期 · wiki 锚定 · 自底向上合成造题）

> 状态：**Landed 2026-08-28, closed 2026-09-09**（plan `../plans/2026-08-28-rag-eval-question-bank-redesign.md` Task 1–12 全部完结：Task 1–11 于 2026-08-28 交付；Task 12 文档同步 2026-09-08、Live 冒烟用户自跑五项全过 2026-09-09） · 日期：2026-08-28 · 范围：评测题库的三项修正——①`expected_path` 单值升级为 `expected_paths` 多路集合判定；②百科词条经 `source_chunk_ids` 可锚定 + 造题入口定位反转；③自底向上合成造题（从文档生成候选题 + 人工审核入库）· 关联：父 spec `2026-08-23-rag-retrieval-evaluation-design.md`（指标体系）；二期子 spec `2026-08-27-rag-eval-tab-phase2-design.md`（题库 CRUD / 触发 / 历史，已落地）；后续演进 spec `2026-09-06-rag-eval-run-progress-design.md`（进度条 + 终止）、`2026-09-06-rag-eval-trend-visibility-design.md`（趋势可见性 + `context_recall` 退役）
>
> **定案（2026-08-28 用户决策）**：
> 1. ①② 两项照单全收；③ 只做**自底向上合成**一项（生产流量挖掘、对抗题不做，见 §10）；
> 2. 合成造题坚持**人工审核入库**——LLM 只产候选，采纳动作永远是人点确认；
> 3. 存量题库**不做文件迁移**——靠加载器兼容读取（§9），新写入一律新格式。

---

## 1. 背景与问题陈述

二期落地后题库随使用生长，但「召回面板存为考题」这一造题主通道暴露三个设计缺陷：

1. **`expected_path` 单值与混路现实冲突**。`relevant_chunk_ids` 是无路径归属的切片集合，Layer 1 的 Hit/Recall/MRR 按三路并集计分（`metrics.py::evaluate_question` 的 `union_hits`），从图谱路和向量路混选切片完全自洽；但 `path_correct` 是 `actual == expected_path` 的严格相等判定（`metrics.py:158`），混路题被迫标单路后另一路胜出即记 ❌，`path_accuracy` 被污染。Layer 2 的 `path_hit` 反而已是集合语义（"期望工具出现在实际调用序列"，`ragas_eval.py:299-308`）——两层语义不一致。
2. **百科路无法锚定**。锚定 schema 是切片级（`<doc_id>#NNNN`），召回面板的 wiki 命中行只有 `entry_id` 没有 chunk 归属，前端勾选框只挂在 vector / graph 行上——百科题永远未锚定，只能走 Layer 2 judge。
3. **从检索结果造题有幸存者偏差**。看着系统当前召回结果挑切片锚定，等于只能锚定"系统现在找得到的东西"——召回差的题进不了题库，锚点集合天然是可召回切片的子集，Recall@k 被系统性高估。主流做法（RAGAS / DeepEval / Azure AI Foundry）是**自底向上**：从源文档生成题目再反向标注出处，题来自语料而非检索结果。

**架构事实核查（2026-08-28 代码核查）**：

1. **Schema 白名单是硬守卫**：`dataset.py::_KNOWN_FIELDS` 拒绝一切未知字段，`_REQUIRED_FIELDS` 含 `expected_path`；`validate_question` 是唯一校验入口，题库写路径（`question_bank.add_question` 注入服务端 id 后调它）与加载器共用。任何字段增删必须改这里。
2. **落盘即 dataclass 序列化**：`question_bank.py::_atomic_write` 用 `asdict(question)` 逐行写 JSONL——`GoldenQuestion` 的字段形状就是存储格式，改 dataclass 即改文件形态。
3. **wiki 路已归一化为切片**：`runner.py::build_default_searchers` 的 `wiki_fn` 把词条展开为 `source_chunk_ids`（`wiki_store.get_entry` 读取）计入切片指标，人工卡片（无 chunk 映射）跳过——**百科锚定复用切片维度即可，不需要新的 `relevant_entry_ids` 指标维度**。
4. **召回端点 wiki 命中不带源切片**：`recall_test` 的 wiki hit payload 只有 `entry_id/title/summary/score/source_type`（`knowledge_service.py:933-949`），前端要勾选百科条目锚定，端点需补 `source_chunk_ids`（runner 的 `wiki_fn` 有同款读取先例）。
5. **幂等触发模式两例在先**：wiki 生成（`trigger_wiki_generation` + `wiki_generation_in_progress` + 202 `enqueued/already_running` + 前端 3s `refetchInterval` 轮询至 drain）与评测触发（`ondemand._IN_FLIGHT`）——合成造题的异步编排完整复刻此模式，不引入新机制。
6. **知识库合成类 LLM 调用先例**：`wiki/generator.py` 在 gateway 进程内调配置模型做批量生成，无外部队列——合成造题沿用同构调用方式。
7. **无锚定降级语义复用**：未锚定题跳过切片指标、仍参与路径判定（一期事实，二期 spec 定案 3 沿用），本 spec 不改此语义。
8. **逐题结果不持久化**（二期事实 6）：baseline diff 只依赖聚合指标与 per-question recall，`expected_path` 键只存在于 CLI `report.json` 与内存结构中——多路化的兼容面比看起来小（§9）。

---

## 2. 交付项与建议顺序

| # | 交付项 | 依赖与理由 |
|---|---|---|
| P0 | **Schema 多路化**（`expected_paths` 字段 + 校验器 + dataclass + 加载器向后兼容） | 一切的前置；①的核心（§3） |
| P0 | **评分语义调整**（Layer 1 `path_correct` 集合判定 + Layer 2 `path_hit` 集合判定 + baseline 读取兼容） | 紧跟 schema；不动语义字段就是死的（§4） |
| P1 | **wiki 锚定通道**（召回端点补 `source_chunk_ids` + 百科行可勾选） | 依赖 §3；独立于合成（§5） |
| P1 | **合成造题后端**（`synthesis.py` + 202 触发 + 候选暂存 + 审核端点） | 依赖 §3（候选直接按新 schema 落）；③ 核心（§6） |
| P2 | **前端**（存题 dialog 多选、百科勾选、候选审核面板、入口定位文案） | 依赖 P0/P1 全部契约（§7） |

建设顺序纪律：**先 schema 后语义，先后端后前端**——加载器兼容是所有后续工作的地基；合成造题的候选格式就是新 schema 的实例，晚于它没有意义。

---

## 3. Schema 演化：`expected_paths` 多路集合（冻结）

**新字段**：`expected_paths: list[str]`——非空、元素 ∈ `EXPECTED_PATHS`、去重保序、长度 1–3。`GoldenQuestion.expected_path: str` 字段**替换**为 `expected_paths: tuple[str, ...]`。

**校验器兼容规则**（`validate_question`）：

| 输入形态 | 处理 |
|---|---|
| 仅 `expected_path: str`（存量文件 / fixture 现状） | 合法，归一化为单元素 `expected_paths` |
| 仅 `expected_paths: list`（新格式） | 合法，逐元素校验枚举 |
| 两者同时出现 | 拒绝（`unknown/ambiguous field` 语义，错误消息指名字段） |
| 两者都缺 | 拒绝（`missing required field`） |
| `expected_paths` 为空数组 / 含非法枚举 / 非字符串元素 | 拒绝，消息含字段名 |

**写路径**：`question_bank.add_question` 的参数改为 `expected_paths: Sequence[str]`，落盘一律写新格式 `expected_paths`（`asdict` 自然生效）。**存量文件不迁移**——加载器兼容读取是唯一契约（定案 3）；`_atomic_write` 的读-改-写会把改动的文件整体升级为新格式，未触碰的文件保持原样，两种形态长期共存且都合法。

**API 契约**：`POST /{kb_id}/eval/questions` 请求体改用 `expected_paths: list[str]`（1–3 项），**不接受**单数 `expected_path`（API 层不做历史兼容——唯一消费者是同批发的前端；历史兼容是文件加载器的职责）。响应体 `EvalQuestion` 返回 `expected_paths`。

**`_KNOWN_FIELDS` 更新**：增 `expected_paths`；`expected_path` 保留在白名单（兼容读取需要）。

---

## 4. 评分语义调整（冻结）

**Layer 1（`metrics.py`）**：

- `evaluate_question`：`path_correct = actual is not None and actual in question.expected_paths`——实际胜出路落在期望集合内即正确。单路题行为与现状逐位一致（单元素集合的 `in` 等价 `==`）。
- `QuestionMetrics.expected_path` → `expected_paths: tuple[str, ...]`；`aggregate` 的 `path_accuracy` 公式不变（按 `path_correct` 计数）。
- `report_to_dict` 的逐题字段 `expected_path` → `expected_paths`（列表）；`_baseline_parts` 读取**两个键都认**（`q.get("expected_paths") or [q.get("expected_path")]`），旧 CLI `report.json` 直接可用。
- `render_markdown` 回退题详情的预期展示：`预期路径: vector, graph`（逗号连接）。

**Layer 2（`ragas_eval.py`）**：

- `path_hit(expected_paths, retrieval_tools)`：`any(EXPECTED_PATH_TO_TOOL[p] in retrieval_tools for p in expected_paths)`——原单路语义是其一的特例。
- `QuestionEvalResult.expected_path` → `expected_paths`；报告渲染同步。

**判定口径说明（写进模块 docstring）**：多路的语义是"这些路**任何一路**承担本题都算对"，不是"这些路**都必须**被调用"——后者要求交集语义，会惩罚合理的单路直答，明确不采纳。

---

## 5. wiki 锚定通道（冻结）

**决策：不引入 `relevant_entry_ids`**。理由（事实 3）：Layer 1 的 `wiki_fn` 已把词条归一化为 `source_chunk_ids` 计分，百科条目锚定到它的源切片后，切片指标链路（Hit/Recall/MRR + 逐路明细）零改动即可正确给百科路记分——新的锚定维度意味着新的指标维度、新的聚合口径、新的报告列，收益为零。

**端点改动**（`recall_test` 的 wiki hit）：

- 每个 `source_type == "wiki"` 的命中补 `source_chunk_ids: list[str]`（`wiki_store.get_entry` 读取，与 `runner.wiki_fn` 同源）；人工卡片不带此键。**实施校正（2026-08-28）**：人工卡片的 `source_type` 枚举实际是 `"manual"` 而非本节原文的 `"card"`，判定条件以 `source_type != "wiki"` 为准（含 `manual`），比原文口径更宽——以代码事实为准。
- 这是纯增量字段，前端旧版本无视即可，无兼容问题。

**前端勾选规则**（§7.2 详述）：百科行有非空 `source_chunk_ids` 时可勾选，勾选贡献其源切片进 `relevant_chunk_ids`；人工卡片行不可勾选（无切片映射，tooltip 说明）——与 `wiki_fn` 跳过人工卡片的口径一致。

**已知局限（接受，不修）**：人工卡片百科题依旧无法锚定；一条百科词条的源切片与向量路切片重合时，"百科路赢了还是向量路赢了"的归因交给逐路明细（`per_path` 已有）。

---

## 6. 自底向上合成造题（后端，冻结）

### 6.1 编排与幂等

新模块 `deerflow/knowledge/eval/synthesis.py`，复刻 `ondemand._IN_FLIGHT` 模式：

- 模块级 `_SYNTH_IN_FLIGHT: dict[str, int]`（per-KB 计数，finally 递减，crash 不卡死）+ `synthesis_in_progress(kb_id)`；
- service 层 `trigger_question_synthesis(kb_id, *, doc_id, count) -> bool`：in-flight 检查 → `asyncio.create_task` fire-and-forget；
- 路由 `POST /{kb_id}/eval/questions/synthesize`，body `{doc_id: str, count: int = 5}`（`count` 范围 1–10），返回 202 `{"status": "enqueued" | "already_running"}`——与评测触发、wiki 生成同款。

**入参裁定**：必须指定**单篇文档**（不做全库合成）——锚定是切片级的，限定文档范围让候选的出处可核验、单次成本可预期（10 题以内一次 LLM 调用完成）。文档无切片（未索引完成）→ 409。

### 6.2 生成契约

- 读该文档全部切片（`store` 既有读取接口），以编号列表喂给配置模型（`wiki/generator.py` 同款调用基建），一次调用产出 `count` 道候选题，JSON 结构化输出；
- 候选题构成约束（写进 prompt）：**single-hop**（fact/relation 类，锚定 1–3 个切片）与 **multi-hop**（concept 类，锚定跨段落的多切片）混合；query 禁止照抄切片原文；`reference_answer` 由切片内容归纳；
- 每个候选携带：`query / category / expected_paths / 锚定切片编号列表 / reference_answer`；
- **落地前双重守卫**：①编号 → `chunk_id` 映射必须全部命中该文档真实切片（幻觉锚定整条候选丢弃）；②注入服务端 id 后过 `validate_question`（与人工创建同守卫）。不过守卫的候选静默丢弃并在暂存元数据记 `dropped` 计数——宁可少出题，不出脏题。

### 6.3 候选暂存与审核

- 暂存文件：`data/knowledge/<kb_id>/eval_candidates.json`（与 golden.jsonl 同目录树），**实施校正（2026-08-28）**：改用单一 JSON 文档而非原文的 `.jsonl` 逐行格式——元数据（`doc_id` / `generated_at` / `dropped`）必须在候选全部被审核后仍可读（状态端点要展示全部丢弃数），JSONL 逐行格式做不到；文档结构为 `{doc_id, generated_at, dropped, candidates: [...]}`，`candidates[i]` 字段 = 完整题目字段 + `candidate_id`（`c_<hex8>`）；tmp + 原子 replace 落盘，每次合成**整体替换**（不做增量累积——审核面永远是一次合成的产物，心智简单）；
- 候选**不进 `golden.jsonl`**，不进任何评测——只有审核通过才经既有 `POST /eval/questions` 端点入库（复用全部校验与锁，不新开写路径）；
- 读端点 `GET /{kb_id}/eval/questions/synthesize`：`{in_progress, candidates: [...], generated_at, doc_id, dropped}`（无暂存文件 → 空列表）；前端 3s 轮询至 drain（wiki-status 先例）；
- 审核端点（两个，均作用于暂存文件，幂等）：
  - `POST /{kb_id}/eval/questions/synthesize/{candidate_id}/accept` → 经 `add_question` 写入题库，返回新建题目（201），同时从暂存删除该候选；
  - `DELETE /{kb_id}/eval/questions/synthesize/{candidate_id}` → 仅从暂存删除（204）。候选不存在均 404。

### 6.4 反偏差守则（设计意图，写进模块 docstring）

自底向上合成根治的是**幸存者偏差**（题来自语料而非检索结果）；残留的两类偏差靠流程吸收：①同源模型偏好（合成模型与答题/判分模型同源）——人工审核是闸门，审核者能看到锚定切片原文并对照；②合成题分布偏事实题——multi-hop 配额约束 + 人工可补 global/对抗题。生产流量挖掘另立（§10）。

---

## 7. 前端设计（冻结）

### 7.1 存题入口多路化

- **存为考题 dialog**（`eval-save-question-dialog.tsx`）：预期路径 `Select` 换三项 `Checkbox` 组（vector / graph / wiki）；默认勾选 = 勾选切片的**来源路径集合**（混路即多选，不再强选一路）；至少勾一项才可提交（`canSubmit` 追加条件）；
- **题库添加 dialog**（`eval-add-question-dialog.tsx`）：同款 Checkbox 组，默认仅勾 vector（手工题无来源推导）；
- **题库表格 / 详情 drawer**：路径 Badge 列渲染 `expected_paths` 全量（多枚 Badge）；
- types / api / hooks / i18n 三件套同步（`EvalQuestion.expected_paths: Path[]`）。

### 7.2 百科行勾选

- 百科命中行加 checkbox：有非空 `source_chunk_ids` 才渲染；勾选后其源切片并入 `selectedChunkIds`，来源路径集合并入 `wiki`；
- 人工卡片行：无 checkbox，hover tooltip「人工卡片无切片映射，不可锚定」；
- 「存为考题」按钮的出现条件不变（勾选 ≥1）。

### 7.3 合成造题入口与候选审核

- 题库视图工具行（表格上方，与「+ 添加考题」并列）：「✦ 从文档生成考题」按钮 → dialog：文档下拉（复用知识库文档列表数据源）+ 数量选择（默认 5，上限 10）→ 触发后 toast + 进入候选审核态；
  **实施校正（2026-08-29 UX 修订）**：「生成考题」（Sparkles）与「添加考题」（Plus）两个按钮最终**并入 eval-tab 常驻工具栏右侧**（分段控件与「运行评测」之间），不再是题库视图内的独立工具行；bank 组件不再自渲染入口按钮，改由 EvalTab 通过 `bankAddOpen` / `bankSynthesisOpen` 受控 props 驱动 dialog。理由：同类工具按钮分两处（顶部工具行 + 表格尾部虚线行）导致添加入口随列表增长沉底；并入常驻工具栏后窄面板经 `useToolbarTier` 一并收进 ⋯ 菜单，与其他五个 middle tab 的工具栏形态对齐。详见 plan「计划外 UX 修订（2026-08-29）」段。
- **候选审核面板**（题库视图内联区块，暂存非空时出现，优先于空态展示）：候选卡片列 = query 全文 + category/paths Badge + 锚定切片数 + reference_answer 折叠预览；每卡片「✓ 采纳」（调 accept → 成功 toast，卡片消失）/「✕ 忽略」（调 DELETE）；顶部一行元信息（来源文档 · 生成时间 · 剩余候选数）+「全部忽略」次按钮；
- `in_progress` 时面板顶部显示 spinner +「生成中…」，轮询至出候选；
- drain 后暂存为空 → 面板消失，回到表格常态。

### 7.4 造题入口定位反转（文案级）

- 题库空态引导改为双入口：「从文档生成考题（推荐）」+「手动添加」；
- 召回面板「存为考题」按钮的 tooltip/说明改为**锚定辅助**定位：「对已有题目做锚定验证，或顺手标注」；
- 不做结构性改动——合成是主通道，召回面板勾选降级为轻量辅助，手动添加保留（对抗题 / global 题只能人造）。

---

## 8. API 契约清单

| 方法 + 路径 | 状态 | 变化 |
|---|---|---|
| `POST /{kb_id}/eval/questions` | 201 | 请求/响应 `expected_path` → `expected_paths: list`（破坏式，前端同批切换） |
| `GET /{kb_id}/eval/questions` | 200 | 响应字段同上 |
| `POST /{kb_id}/recall-test` | 200 | wiki hit 增量字段 `source_chunk_ids`（`source_type=wiki` 时） |
| `POST /{kb_id}/eval/questions/synthesize` | 202 | 新增；`{doc_id, count}`；`enqueued / already_running`；文档无切片 409；未知文档 404 |
| `GET /{kb_id}/eval/questions/synthesize` | 200 | 新增；`{in_progress, candidates, generated_at, doc_id, dropped}` |
| `POST /{kb_id}/eval/questions/synthesize/{cid}/accept` | 201 | 新增；候选题入库并从暂存移除；候选 404 |
| `DELETE /{kb_id}/eval/questions/synthesize/{cid}` | 204 | 新增；候选 404 |

错误映射沿用二期惯例：`GoldenDatasetError`→422（写入校验）/ 500（存量脏文件），`_require_kb_access` 门禁 403/404 在先。

---

## 9. 迁移与兼容

1. **题库文件**：零迁移。加载器双认（§3），`asdict` 写新格式，两形态长期共存且都合法；守护测试（直接加载真实 `golden.jsonl`）扩充：存量单值文件与新格式文件均常绿。
2. **CI 门禁**：`rag-eval.yml` 链路零改动——`load_golden` 兼容读取，指标语义对单值题逐位不变。
3. **eval_runs 存量行**：只存聚合指标，无逐题 `expected_path`，零影响。
4. **CLI `report.json`**：新运行写 `expected_paths`；`_baseline_parts` 双键读取，旧报告做 `--baseline` 依然可用。不做报告文件版本号变更（纯增量字段）。
5. **前端类型破坏式切换**：`EvalQuestion.expected_path` → `expected_paths` 与后端同一 plan 内完成，无中间态。

---

## 10. 范围外与开放点

**明确不做**（本次）：

- 题目编辑（仍是删了重加，二期遗留沿用）；
- 生产流量挖掘（从对话历史抽真实 query 造题）——价值高但依赖 trace 落盘口径，另立；
- 对抗/越界题合成（"知识库里没有 X"类防幻觉题）——合成器做不好判分口径，人工为主；
- `relevant_entry_ids` 词条级锚定维度（§5 已裁定不做）；
- 全库级合成（不限文档）——成本与锚定核验性都不可控；
- 候选题跨合成批次累积（§6.3 已裁定整体替换）。

**开放点（plan 期已裁定，2026-08-28 / 2026-09-08 收官时确认）**：

1. 合成用模型是否允许独立配置项（与答题模型错开以减同源偏差）——**已裁定：沿用主模型 `deerflow.models.factory.create_chat_model()`，无独立配置项**（spec §10 预裁 + Task 6/7 实施一致）；跑通后按同源偏差观察决定是否加开关，目前无计划；
2. 候选审核面板的交互密度——**已裁定：卡片列**（Task 11 实施），每卡「✓ 采纳」/「✕ 忽略」+ 顶部「全部忽略」次按钮；表格行方案未采纳，理由是候选字段密度高（query 全文 + Badge 组 + 锚定数 + reference_answer 折叠），卡片列的垂直空间对长 query 更友好；
3. `dropped` 计数是否需要在 UI 露出（审核面板元信息行）——**已裁定：露出数字**（Task 11 实施），元信息行为「来源文档 · 生成时间 · 剩余数 · dropped 数字」四段；不做详情（丢弃理由不入暂存文件，只日志），理由是 dropped 数字本身已足够传达「合成有守卫、不产出脏题」的信号，详情属于调试信息不该在审核面露出。

---

## 附录 A：主流产品评测题生成方式（设计依据）

| 做法 | 代表 | 与本 spec 的对应 |
|---|---|---|
| 自底向上合成（文档 → QA → 反向标注出处，single-hop + multi-hop，人工审核入库） | RAGAS `TestsetGenerator`、DeepEval Synthesizer、Azure AI Foundry | §6 整体；§6.4 反偏差守则 |
| 生产流量挖掘（真实对话 trace 抽样 + 人工标注期望上下文） | LangSmith / Langfuse Datasets | 范围外，另立 |
| 人工策展（对抗题 / 主题级综述题） | 通用实践 | §7.4 保留手动添加通道 |
| 评测集与调参集分离 | 通用实践 | 双题库分离沿用（二期事实 8） |
