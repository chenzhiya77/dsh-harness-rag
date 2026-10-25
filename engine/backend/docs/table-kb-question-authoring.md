# 表格知识库造题指引（Table KB Question Authoring）

面向为**表格知识库**编写评测 golden question（题库）的人。表格文档（`.csv`/`.tsv`/
`.xlsx`/`.xls`，以及 PDF/Word 内嵌表）入库后，parser 先把它归一为 **GFM 管道表**（spec §5），
表格感知 chunker 再把它切成一张或多张**行卡**（row card），每张行卡作为一个 **chunk** 进入
现有三路索引（vector / graph / wiki）与 L1（确定性检索）/ L2（对话链路）评测——**零改造**：
行卡 chunk_id `{doc_id}#{index:04d}`（`doc_id` 是 32 位小写 hex）天然匹配 golden schema 的
`relevant_chunk_ids` 正则 `<32-hex>#NNNN`（`dataset._CHUNK_ID_RE`），因此 `recall@k`、
`hit_rate`、`mrr`、`path_accuracy` 全部现有指标对表格 KB 与文本 KB 完全同口径。

设计依据：`docs/superpowers/specs/2026-09-09-table-ingest-design.md` §6（表格感知切片）/
§7（行卡正文契约，冻结模板）/ §9（评测接入与消融）。集成验证：
`tests/knowledge/eval/test_table_eval.py`。

## 1. 行卡结构 = 造题的信息源

一张表格若小于切分上限（`MAX_CHUNK_TOKENS`），整表是**一张行卡**（最常见）；大表按**行组**
贪心拆成多张行卡。行卡正文即 `chunks.text` = 嵌入文本，是 spec §7 的**冻结模板**：

```
表格：{sheet/文档名}（第 {起}-{止} 行 / 共 {N} 行）   ← 溯源说明行（仅多卡拆分时出现）
| Region | Product | Q1 | Q2 | Total |               ← 表头（每张行卡都重复）
| --- | --- | --- | --- | --- |                      ← 分隔行
| 华北 | Widget-A | 100 | 110 | 210 |                ← 本卡承载的行组（连续若干行）
| 华东 | Widget-B | 101 | 111 | 212 |
```

两个关键性质决定造题方式：

- **每卡重复表头**（spec §6/§7）：任一行卡都自带列名，检索命中一张卡即可自解释地读出
  「列 → 值」，无需回看其它卡。这是相对现状（硬切丢表头）的核心修复，也是造题的直接红利。
- **行组是原子的**：一行绝不跨卡、绝不从单元格中切；一张卡承载**连续**若干行。因此「某一行的
  值」可精确锚定到**承载它的那张行卡**，而「全表聚合」往往横跨多卡（见 §2.2）。

## 2. 三类造题规范

每题锚定**含目标行的那张行卡**（目标行跨多卡则列多个 chunk_id）。示例 JSONL 行中 `{doc_id}`
替换为真实 32 位 hex 文档 id，`#NNNN` 为行卡的 `chunk_index`（0 基、4 位补零）。

### 2.1 按列值提问型（可精确锚定）——问"某行某列的值"

```json
{"query": "华北区 Widget-A 的 Q1 销售额是多少？", "category": "fact", "expected_paths": ["vector"], "relevant_chunk_ids": ["{doc_id}#0000"], "relevant_entities": [], "reference_answer": "100。"}
```

- 锚定**承载该数据行的那张行卡**（该行 + 重复表头都在卡内，vector 路按「列名 + 值」语义命中）。
- 走 **vector** 路（行卡正文语义检索）；这是表格 KB 最主力、最可锚定的题型，`category` 多用 `fact`。
- 定位技巧：行卡按行组**顺序**切分，目标行落在第几组即锚定第几张卡（`#0000` 起）；不确定时用
  前端**检索测试 Tab** 跑一次 query，看命中哪张行卡再一键存为 golden（`relevant_chunk_ids` 自动填）。

### 2.2 跨行聚合型（**不可锚定到单卡**，属降级语义）——问"全表统计/极值/求和"

```json
{"query": "全部区域的 Q1 总销售额是多少？", "category": "global", "expected_paths": ["vector"], "relevant_chunk_ids": ["{doc_id}#0000", "{doc_id}#0001"], "relevant_entities": [], "reference_answer": "所有行 Q1 之和。"}
```

- **聚合答案横跨多行、往往跨多张行卡**：单张行卡只承载一个行组，无法独立回答「全表求和 / 计数 /
  极值 / 排序」。此类题要么把**所有相关行卡**都列进 `relevant_chunk_ids`（召回全部才算命中），要么标
  `category="global"` 并接受它更多考察 L2（对话链路多次检索 + 汇总）而非 L1 单跳召回。
- **诚实标注局限**（spec §9）：L1（确定性单跳检索）对跨行聚合天然弱——它召回 top-k 张卡，不保证
  覆盖全表。造题时若目标是聚合值，务必列全承载相关行的卡，否则 `recall@k` 会因「答案分散在多卡」
  被低估。这**不是检索缺陷**，是聚合题与单跳召回的口径错配，属已知降级语义。

### 2.3 按表头/列语义提问型——问"表里有哪些列/字段"

```json
{"query": "这张销售表统计了哪些指标列？", "category": "concept", "expected_paths": ["vector"], "relevant_chunk_ids": ["{doc_id}#0000"], "relevant_entities": [], "reference_answer": "Region、Product、Q1、Q2、Total。"}
```

- 因**每卡重复表头**，任一行卡都能回答「有哪些列」；锚定任意一张（通常 `#0000`）即可，`category`
  多用 `concept`。这是「每卡重复表头」设计在造题侧的直接红利。

## 3. golden 字段的表格专用注意

- **relevant_chunk_ids**：行卡 chunk_id（`{doc_id}#{chunk_index:04d}`）。答案跨多张行卡时列多个；
  每条必须匹配 `<32-hex>#NNNN`，否则 `add_question` / `load_golden` 校验失败
  （`dataset.validate_question`）。
- **expected_paths**：表格行卡主要走 `vector`（行卡正文语义检索）。表内反复出现的实体（产品名、
  区域名等）可走 `graph`（实体别名由 `resolve_entity_aliases` 跨卡合并）；`wiki` 是条目级。可列多路
  （如 `["vector", "graph"]`），任一命中即算 path 正确（集合成员判定）。
- **category**：`fact`（某行某列的值，按列值提问型常用）/ `global`（跨行聚合）/ `concept`（列语义）/
  `relation`（实体关系）。
- **relevant_entities**：表内实体名（如产品 / 区域，graph 路命中率用）；纯按列值事实题可留空。
- **底纹 / 反白表头失读**（spec §11 实测门）：MinerU 对底纹表头可能整行识别为空 `<td></td>`，归一后
  表头列名为空。此时行卡**无列名可锚**，按列值提问会退化——造题前先在切片抽屉核对表头是否读出；
  空表头的表优先出「按行位置 / 按其它已读出列」的题，**不猜列名**。

## 4. card_mode 质量消融对比（`rag.table.card_mode` + recall-test）

行卡正文的序列化有两态（spec §7 冻结模板），是「行卡文本形态对检索的边际影响」的消融开关
`rag.table.card_mode`（`config.yaml`，**linearized 为实验路径，非生产默认**）：

| 模式 | 行卡正文 | 用途 |
|---|---|---|
| `markdown`（默认） | GFM 管道表（重复表头 + `\| 值 \| 值 \|` 行组） | 生产基线；前端 `ChunkCard` 原生渲染为真表格 |
| `linearized` | 每行转 `列名: 值 \| 列名: 值` 句子 | 窄上下文模型消融；隔离「表格结构 vs 线性句子」对召回的贡献 |

**对比流程**（用 recall-test，不改 markdown 生产默认；对齐视频 `card_text_mode` 消融）：

1. 以 `markdown` 入库表格 KB，记录 baseline：跑一轮评测（评测 Tab）或对目标 query 集逐个
   `POST /{kb_id}/recall-test`（body `{query, top_k}`），记录三路命中与 `recall@k`。
2. 改 `card_mode: linearized`，对**同一表格文档**重新入库（重新上传即可——worker
   `_reparse_and_chunk` 在切片时读当前 `card_mode`），行卡正文即改为线性句子形态（表头 / 列名仍随卡重复）。
3. 对**同一组 query** 重跑 recall-test，对比 `markdown` vs `linearized` 的 `recall@k` 差异 = 「表格结构」
   相对「线性句子」对检索的边际贡献；差值大说明结构化表头 / 管道格式是检索主力，差值小说明该模型对
   表格结构不敏感（线性化即可）。
4. 前端**检索测试 Tab** 可直接跑 recall-test 并勾选命中行卡一键存为 golden question（行卡有源切片，
   可锚定；`relevant_chunk_ids` 自动填行卡 chunk_id）。

> 注意：`card_mode` 为 `linearized` 时行卡非 GFM 表格，仅用于消融对比，**不作为生产评测基线**；
> 正式评测始终用 `markdown`。

## 5. 相关代码与文档索引

- 表格归一（parser）：`packages/harness/deerflow/knowledge/parser.py`
  （CSV/TSV `_parse_delimited` / Excel `_workbook_rows_to_markdown` / MinerU HTML `_normalize_tables_to_gfm`）
- 表格感知切分（chunker）：`packages/harness/deerflow/knowledge/chunker.py`
  （`chunk_markdown` / `_chunk_table_block` / `_split_by_headings` 表块检测）
- L1 评测编排：`packages/harness/deerflow/knowledge/eval/ondemand.py`（`run_layer1_for_kb`）
- 指标口径：`packages/harness/deerflow/knowledge/eval/metrics.py`（`recall_at_k` / `hit` / `evaluate_question`）
- golden schema 与校验：`packages/harness/deerflow/knowledge/eval/dataset.py`（`_CHUNK_ID_RE` / `validate_question`）
- recall-test 端点：`app/gateway/routers/knowledge_bases.py`（`POST /{kb_id}/recall-test`）+ `KnowledgeService.recall_test`
- 消融开关：`config.yaml → rag.table.card_mode`（`packages/harness/deerflow/config/app_config.py`）
- 集成用例：`tests/knowledge/eval/test_table_eval.py`（fake 表格 KB → 行卡进 L1 recall）
- 设计规格：`docs/superpowers/specs/2026-09-09-table-ingest-design.md`（§6/§7/§9）
