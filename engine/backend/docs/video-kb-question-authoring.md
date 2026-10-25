# 视频知识库造题指引（Video KB Question Authoring）

面向为**视频知识库**编写评测 golden question（题库）的人。视频入库后，每个镜头
（shot）物化为一张**镜头卡**并作为一个 **chunk** 进入现有三路索引（vector / graph /
wiki）与 L1（确定性检索）/ L2（对话链路）评测——**零改造**：镜头卡 chunk_id
`{doc_id}#{shot_index:04d}`（`doc_id` 是 32 位小写 hex）天然匹配 golden schema 的
`relevant_chunk_ids` 正则 `<32-hex>#NNNN`，因此 `recall@k`、`hit_rate`、`mrr`、
`path_accuracy` 全部现有指标对视频 KB 与文本 KB 完全同口径。

设计依据：`docs/superpowers/specs/2026-09-08-video-ingest-design.md` §3（嵌入文本
契约）/ §6（评测接入）。集成验证：`tests/knowledge/eval/test_video_eval.py`。

## 1. 镜头卡结构 = 造题的三类信息源

每张镜头卡的正文是**冻结三段**（`shot_card.assemble_card_body`，即 `chunks.text` =
嵌入文本，spec §3）。时间码头**不进**卡正文（不污染向量空间），由展示层合成：

```
场景：{caption}        ← VLM 视觉描述（画面里有什么）
口述：{asr_text}       ← ASR 语音转录（有人说了什么）
屏幕文字：{ocr_text}    ← OCR 屏幕文字（幻灯片/字幕/代码显示了什么）
```

三路原文互为备份（spec §9 风险缓解）：ASR 错字（专名/术语）由屏幕文字路兜底，
caption 幻觉由并列的 asr+ocr **原文**对冲。三类造题正是分别锚定这三段。

## 2. 三类造题规范（各 ≥1 例）

每题锚定**含目标信息的那张镜头卡**（跨镜头则列多个 chunk_id）。示例 JSONL 行中
`{doc_id}` 替换为真实 32 位 hex 文档 id，`#NNNN` 为镜头序号（0 基、4 位补零）。

### 2.1 口述型（asr 主导）——问"视频里说了什么"

```json
{"query": "视频里讲师说退休年龄怎么执行？", "category": "fact", "expected_paths": ["vector"], "relevant_chunk_ids": ["{doc_id}#0001"], "relevant_entities": [], "reference_answer": "按渐进式延迟方案执行。"}
```

- 锚定含目标口述原文的镜头卡（该卡「口述：」段命中问题语义）。
- 走 **vector** 路（卡正文语义检索）；专名/术语被 ASR 听错时，若同镜头屏幕文字
  有正确写法，可把该镜头卡同时作为锚点（三段并列，vector 仍命中）。

### 2.2 屏幕文字型（ocr 主导）——问"屏幕上显示的文字/公式/代码"

```json
{"query": "幻灯片上第三章第十五条写了什么？", "category": "fact", "expected_paths": ["vector"], "relevant_chunk_ids": ["{doc_id}#0002"], "relevant_entities": [], "reference_answer": "第三章 退休制度 第十五条。"}
```

- 锚定含目标 OCR 文字的镜头卡（该卡「屏幕文字：」段是精确文本）。
- 精确文本最适合 `fact` 类；屏幕文字与口述互为备份（专名兜底）。

### 2.3 视觉描述型（caption 主导）——问"视频展示了什么场景/画面"

```json
{"query": "视频里讲师在什么场景讲解退休制度？", "category": "fact", "expected_paths": ["vector"], "relevant_chunk_ids": ["{doc_id}#0000"], "relevant_entities": [], "reference_answer": "讲师站在白板前讲解。"}
```

- 锚定含目标视觉描述的镜头卡（该卡「场景：」段由 VLM 生成）。
- **caption 可能有幻觉**：视觉描述型问题应聚焦**可被画面证实的客观事实**（谁/在哪/
  做什么），避免问 VLM 的主观推断或画面外信息；卡正文并列的 asr+ocr 原文是幻觉的
  对冲护栏（spec §9）。

## 3. golden 字段的视频专用注意

- **relevant_chunk_ids**：镜头卡 chunk_id（`{doc_id}#{shot_index:04d}`）。一个问题的
  答案跨多个镜头时列多个；每条必须匹配 `<32-hex>#NNNN`，否则 `add_question` /
  `load_golden` 校验失败（`dataset.validate_question`）。
- **expected_paths**：视频镜头卡主要走 `vector`（卡正文语义检索）。被多镜头提及的
  实体可走 `graph`（实体别名由 `resolve_entity_aliases` 跨镜头合并）；`wiki` 是条目级
  （多镜头提及满足实体资格时）。可列多路（如 `["vector", "graph"]`），任一命中即算
  path 正确（集合成员判定，spec 2026-08-28 §4）。
- **category**：`fact`（具体事实，口述/屏幕文字型常用）/ `relation`（实体关系）/
  `concept`（概念）/ `global`（全局）。
- **relevant_entities**：跨镜头实体名（graph 路命中率用）；纯口述/屏幕文字事实题可留空。

## 4. caption 质量消融对比（`card_text_mode` + recall-test）

描述式管线的唯一质量护栏（spec §6）：量化"caption 写坏对检索的损耗"。消融开关
`rag.video.card_text_mode`（`config.yaml`，**实验路径，非生产**）只影响 materialize
腿的卡文本组装：

| 模式 | 卡正文 | 用途 |
|---|---|---|
| `full`（默认） | 场景 + 口述 + 屏幕文字 三段 | 生产基线 |
| `caption_only` | 只「场景：」行 | 隔离 caption 单独的检索贡献 |
| `asr_only` | 只「口述：」行 | 隔离 ASR 单独的检索贡献 |

**对比流程**（用 recall-test，不改 full 冻结模板）：

1. 以 `full` 入库视频 KB，记录 baseline：跑一轮评测（评测 tab）或对目标 query 集
   逐个 `POST /{kb_id}/recall-test`（body `{query, top_k}`），记录三路命中与 `recall@k`。
2. 改 `card_text_mode: caption_only`（或 `asr_only`），对**同一视频**重跑 materialize：
   - 新上传：直接以新 mode 入库；
   - 已入库：用 recaption 运维入口 `POST /{kb_id}/documents/{doc_id}/video/recaption`
     （Task 8b）重置 caption 状态、以当前 mode 重组卡文本 + 增量重嵌（不删文档）。
3. 对**同一组 query** 重跑 recall-test，对比 `full` vs `caption_only` vs `asr_only` 的
   `recall@k` 差异 = caption / asr 各自对检索的边际贡献；差值大说明该路是检索主力，
   差值小说明冗余或该路质量不足。
4. 前端**检索测试 Tab** 可直接跑 recall-test 并勾选命中切片一键存为 golden question
   （镜头卡有源切片，可锚定；`relevant_chunk_ids` 自动填镜头卡 chunk_id）。

> 注意：`card_text_mode` 非 `full` 时卡文本缺路，仅用于消融对比，**不作为生产评测
> 基线**；正式评测始终用 `full`。

## 5. 相关代码与文档索引

- 镜头卡组装：`packages/harness/deerflow/knowledge/video/shot_card.py`
  （`assemble_card_body` / `chunk_id_for_shot` / `heading_path_for_shot`）
- L1 评测编排：`packages/harness/deerflow/knowledge/eval/ondemand.py`（`run_layer1_for_kb`）
- 指标口径：`packages/harness/deerflow/knowledge/eval/metrics.py`（`recall_at_k` / `hit` / `evaluate_question`）
- golden schema 与校验：`packages/harness/deerflow/knowledge/eval/dataset.py`（`_CHUNK_ID_RE` / `validate_question`）
- recall-test 端点：`app/gateway/routers/knowledge_bases.py`（`POST /{kb_id}/recall-test`）+ `KnowledgeService.recall_test`
- 消融开关：`config.yaml → rag.video.card_text_mode`（`packages/harness/deerflow/config/app_config.py`）
- 集成用例：`tests/knowledge/eval/test_video_eval.py`（fake 视频 KB → 镜头卡进 L1 recall）
