# 视频入库与时间码引用设计 spec（2026-09-08）

状态：✅ 设计定稿（2026-09-08），待 plan 实施。对应 plan：
`docs/superpowers/plans/2026-09-08-video-ingest.md`。

## 0. 一句话结论与业界对齐

视频作为**一等文档类型**接入知识库：离线管线把视频拆成**镜头卡（shot card）**——
对齐 NVIDIA VSS Blueprint 的四元组（VLM caption + ASR 转录 + OCR/CV 屏幕文字 +
时间戳）——镜头卡文本物化为现有 `chunks` 行，**零新检索路**地进入
vector / graph / wiki 三路索引；引用携带时间码与关键帧缩略图。原生视频多模态
向量（Twelve Labs Marengo 一类）**不做主索引**，仅列为 v2 候选辅路。

| 业界参照 | 借鉴点 | 不借鉴点 |
|---|---|---|
| NVIDIA VSS Blueprint | 镜头卡四元组 schema；caption/转录文本入向量+图双库 | CA-RAG 自建检索栈（复用本项目三路） |
| Microsoft GraphRAG（本项目血缘） | 实体图 + 社区摘要（wiki）照吃镜头卡文本 | ——（本项目即其超集） |
| Video-RAG（NeurIPS 2025） | OCR/ASR/描述多文本库并行思想；CLIP 仅作预筛/辅路 | 检测→场景图转文本一路（v2 再议） |
| Twelve Labs Marengo/Pegasus | 无（SaaS 买选项，数据不出域要求不符时再议） | 原生视频向量当主索引 |
| LangChain/LlamaIndex video recipe | 断点分段 + 帧摘要 + Whisper 转录的最小闭环 | 固定 10s 等距分段（改场景切分） |

**为什么文本是主索引**（决策记录，勿翻案）：生成端要可读上下文；细粒度事实/
数字/屏幕文字检索文本 embedding+BM25 远强于视频向量；文本 chunk 可人审、可挂
时间码引用、可进本项目评测 harness；成本上几百张镜头卡 vs 每秒数帧的向量洪流。

## 1. 目标与非目标

目标：
1. 上传 `.mp4/.mov/.mkv/.webm`（配置门控）→ 文档列表可见进度与分腿状态 →
   镜头卡进三路索引 → 对话/检索测试可命中 → 引用带 `[start, end]` 时间码与关键帧；
   切片抽屉内嵌播放器**点击镜头即播**（seek + 区间高亮，2026-09-09 评审提级进 v1）。
2. 管线全腿可恢复（resume）、可降级（degraded 可视，不静默残缺），纪律对齐
   现有 graph leg 的 30% 失败率降级规则与 `EmptyParseResultError` 响亮失败规则。
3. 评测 harness 零改造覆盖镜头卡（它就是 chunk）；另给caption 质量消融实验开关。

非目标（v2 候选，本 spec 冻结不做）：
- 关键帧多模态向量集合（`kb_shot_frames`）与 RRF 视觉辅路。
- 说话人分离、实时流、以图搜镜头、检测→场景图路。
- 原生视频嵌入（Marengo/Gemini video）主索引。

## 2. 入库管线（KnowledgeIndexWorker 新腿）

后缀门控：`parser.py` 的 `SUPPORTED_UPLOAD_SUFFIXES` 保持**文本集冻结**；新增
`VIDEO_UPLOAD_SUFFIXES = frozenset({".mp4", ".mov", ".mkv", ".webm"})`。
`/supported-formats` 端点返回两者**并集当且仅当** `rag.video.enabled=true`
（前端 file-picker accept 与上传前拦截自动跟随，零前端硬编码）。

腿序（视频文档）：`probe → asr → segment → keyframe+ocr → caption → materialize`
→ 现有 `vector → graph → (alias resolve) → wiki` 腿原样复用。`path_status` JSON
扩腿 `{asr, segment, caption, vector, graph}`（文本文档不写视频腿，NULL 安全）。

| 腿 | 工具/模型 | 失败语义 |
|---|---|---|
| probe | ffprobe（时长/可解码性） | 不可解码 → 文档 `failed` + 可操作错误（对齐 EmptyParseResultError 响亮失败） |
| asr | FunASR paraformer-zh（默认，CPU 离线）或 whisper small（配置切换）；带字级/段级时间戳 | 整腿失败 → `asr=failed`，镜头卡口述段写「（ASR 失败）」，文档仍可达 ready（降级） |
| segment | PySceneDetect ContentDetector；**最长 `max_shot_seconds`（默认 5s）兜底必切** | 整腿失败 → 回退 `fallback_window_seconds`（默认 10s）等距窗，`segment=degraded` |
| keyframe+ocr | 每镜头取中帧持久化（JPEG q80 ≤1280px）；caption 临时可用至多 3 帧不持久化；OCR=PaddleOCR 屏幕文字 | 单镜头失败 → 屏幕文字「（无）」、引用不带 frame_url；>30% 失败 → 腿 degraded |
| caption | DashScope VLM（默认复用 `rag.vlm_model`），prompt 双模式对齐 captioner.py 先例（文字密集帧全转录/否则一句描述），**降级非硬依赖** | 单镜头失败 → 卡文本只含 asr+ocr；>30% 失败 → `caption=degraded`（对齐 graph 30% 规则） |
| materialize | 镜头卡 → `video_shots` 行 + `chunks` 行（纯函数组装，单测钉死） | 全空镜头（asr/ocr/caption 俱空）不产 chunk，计数可视 |

恢复（resume）：`video_shots.caption_status` 状态机 `pending → done / failed /
empty` 对齐 `chunks.extract_status` 先例；worker 重入只跑 pending 镜头。
并发/限流：caption 调用走 `rag.worker_concurrency` 与 VLM 侧限流，ASR 为本地
CPU 腿不限流；长视频占 worker 的窗口由 progress_percent 持续上报（腿权重：
asr 30 / segment 5 / caption 35 / materialize 5 / 现有腿不变）。

**运维重跑入口（冻结，2026-09-09 补，评审 G1）**：
`POST /{kb_id}/documents/{doc_id}/video/recaption`——caption 模型/prompt 升级后
的类比 `re_extract_chunk` / `regenerate_wiki_entries` 运维血统入口：重置
`caption_status`（done/failed → pending，empty 保持）→ 只重跑 caption +
materialize 腿（帧/ASR/分镜不重跑，帧已持久化）→ 变更 chunk 增量重嵌向量 →
受影响实体标 wiki dirty（复用 `mark_dirty_for_entities`）。与文档在飞管线
互斥（409）；非视频文档 404。缺了它模型迭代只能删文档重传，是描述式管线的
长期运维命门。

## 3. 镜头卡 schema（冻结契约）

新表 `video_shots`（alembic `make migrate-rev`）：

| 列 | 类型 | 说明 |
|---|---|---|
| id | String(64) PK | uuid hex |
| doc_id / kb_id | String(64) index | 归属 |
| shot_index | Integer | 0 起，按 start_ms 升序；与 chunk_index 同序 |
| start_ms / end_ms | Integer | 闭开区间毫秒 |
| keyframe_path | String(1024) nullable | 相对 KB 存储目录；缺帧 NULL |
| asr_text / ocr_text / caption | Text | 三路原文，空串=该路无内容 |
| caption_status | String(16) | pending/done/failed/empty（resume 状态机） |
| created_at | DateTime tz | —— |

唯一约束 `(doc_id, shot_index)`。`chunk_id` 沿用 `{doc_id}#{shot_index:04d}`
扁平序（不引入层级地址，对齐 heading_path 仅展示层的项目先例）。

`chunks` 行**零 schema 改动**：`text` = 冻结卡模板（下），`heading_path` =
`["<视频文件名>", "镜头 #K"]`（展示层），`page` = NULL，`entities` 由 graph 腿
回填如常，`extract_status` 状态机如常。

冻结卡**正文**模板（嵌入与展示单一源，改模板即改契约）：

```
场景：{caption}
口述：{asr_text 或 （无）}
屏幕文字：{ocr_text 或 （无）}
```

**嵌入文本契约（冻结，2026-09-09 补，评审 G2）**：`chunks.text` 只存**正文**——
时间码头不进 dense/sparse 向量与 FTS 索引（数字串是纯噪点：查询永不匹配它）。
头部改由**展示层合成**：切片抽屉 = 时间码芯片（源自 `video_shots`）+ 正文；
引用 payload 带时间码四字段；纯文本导出/人审面经纯函数
`render_card_display(body, shot)` 合成带头全卡（单一源，单测钉死）。由此
嵌入文本 = 存储文本 = 正文，零双存储。

时间码格式冻结 `HH:MM:SS.mmm`（毫秒三位，前端芯片可截秒显示但数据源不截）。

**时间轴对齐规则（冻结，2026-09-09 补）**：
- 唯一主时钟 = 媒体 PTS 毫秒轴。ASR 腿与 segment 腿**各自独立**在该轴上产出
  区间，materialize 腿按区间重叠做 join——**不以 ASR 时间戳为主**（静默镜头/
  无语音段在 ASR 轴上不存在，若以其为主会整段丢失视觉信息；语音停顿边界与
  画面语义边界也不同源）。
- 卡粒度 = segment 腿的镜头边界（含 max_shot 兜底切 / 等距回退窗）；卡头时间码
  = 镜头区间 `[start_ms, end_ms)`，引用时间码同源。
- ASR 归属：每条转录段归入**重叠占比最大**的镜头（保句子完整性，检索单元友好）；
  重叠相同归较早镜头；与所有镜头重叠均为 0 的段丢弃并计数（防御）。
- 同镜头多条转录段按 start_ms 升序拼接进口述段；无重叠段的镜头口述 = （无）。
- 关键帧/OCR/caption 天然镜头 scoped（中帧抽帧、OCR 读该帧、VLM 看区间内 ≤3 帧），
  不做二次对齐。

## 4. 检索与引用

- **零新检索路**：镜头卡即 chunk → hybrid_search / graph_search / wiki_search /
  choose_path 全部原样工作；wiki 资格（跨 chunk freq≥2）天然由「多镜头提及同实体」满足。
- 引用 payload 扩展（service 层 join `video_shots`，仅视频文档）：
  `media: "video"`, `shot_index`, `start_ms`, `end_ms`, `frame_url`（可缺）。
  文本引用字段一字不动（前端旧渲染零回归）。
- 关键帧服务：新端点 `GET /{kb_id}/documents/{doc_id}/shots/{shot_index}/frame`
  流式 JPEG（鉴权对齐文档读取）；无帧 404，前端缩略图位降级为图标占位。
- 视频流端点（播放器提级配套，2026-09-09）：
  `GET /{kb_id}/documents/{doc_id}/video/stream` 支持 Range（206/416），鉴权对齐
  文档读取，Content-Type 按后缀映射；实现优先 Starlette `FileResponse` 原生
  Range，版本不支持则手写 partial handler（range 解析为纯函数，单测钉死）。
  按需流式，零入库侧成本。

## 5. 前端表面

- 上传：accept 随 `/supported-formats` 自动含视频后缀；上传前拦截与错误 toast
  文案复用现有 unsupported 分支（kb-toast 中栏作用域）。
- 文档列表：视频行加胶片图标 + 时长（probe 落 `documents.error` 之外的新列？
  **不加列**——时长由 `video_shots` 末行 end_ms 读时聚合，列表接口带
  `duration_ms` 仅当视频文档）+ 镜头数（chunk_count 即镜头数，文案「N 镜头」）。
- path_status hover：视频腿 asr/segment/caption 三芯片（degraded 琥珀色，对齐
  现有 degraded 视觉词汇）。
- 切片抽屉：视频 chunk 显示**时间码芯片**（mono，`#K · 00:01:12–00:01:40`）+
  关键帧缩略图（lazy，404 降级图标）+「复制时间码」按钮；卡文本原样展示。
- i18n：`knowledge.documents.*` 增 videoDuration / shotCount / timecodeChip /
  copyTimecode / frameMissing / legs.asr|segment|caption 等键（zh/en 同批）。
- 检索测试（recall-test）：零改造（镜头卡即 chunk）；合成候选/存题链路照旧。
- **内嵌播放器（提级进 v1，2026-09-09 评审）**：切片抽屉顶部**单例** `<video>`
  （原生 controls、`preload="metadata"`、**不自动播放**）；点行时间码芯片/缩略图
  → seek(start_ms) 并播放；引用闪环定位同时把播放器载到 start_ms 但**保持暂停**
  （不惊喜自动播）；`timeupdate`（节流）currentTime 落在某镜头
  `[start_ms, end_ms)` 时该行区间高亮（边框提亮，不抢滚动——滚动只随显式定位）。
  窄抽屉：播放器宽随抽屉、16:9 限高；i18n 增 playerHint 键。

## 6. 评测 harness 接入

- 镜头卡作为 chunk 自动进入 L1（确定性检索）/L2（对话链路）与 recall@k、
  path_accuracy 全部现有指标；视频 KB 的 golden question 编写指引落
  `backend/docs/`（口述型/屏幕文字型/视觉描述型三类各 ≥1 题的造题规范）。
- **caption 质量消融开关**（实验用，非生产路径）：`rag.video.card_text_mode:
  full | caption_only | asr_only`（默认 full）只影响 materialize 腿的卡文本组装，
  供 recall-test 对比「描述写坏对检索的损耗」——这是描述式管线的唯一质量护栏，
  本项目评测 harness 是 GraphRAG/VSS 都不具备的差异点。
- 趋势/门禁零改造（指标口径不变）。

## 7. 配置 schema（`config.yaml` → `rag.video`）

```yaml
rag:
  video:
    enabled: false            # 门控：allowlist 并集与全部视频腿的总开关
    max_size_mb: 2048
    max_shot_seconds: 5       # 场景切分最长镜头兜底
    fallback_window_seconds: 10  # segment 腿失败时的等距窗
    keyframes_per_shot: 1     # 持久化关键帧数（caption 临时帧不持久化）
    asr_provider: funasr      # funasr | whisper
    asr_model: paraformer-zh  # whisper 档例：small
    caption_model: ""         # 空 = 复用 rag.vlm_model
    card_text_mode: full      # full | caption_only | asr_only（消融实验）
```

`config.example.yaml` 同批补注释段；enabled=false 时上传视频后缀仍被拒（门口
拒绝，不白跑 probe）。

## 8. 存储与成本预算

- 关键帧：JPEG q80 ≤1280px，单帧 ~60–120KB；1h 视频 ≈ 300–600 镜头 →
  持久化帧 ≈ 20–70MB（keyframes_per_shot=1 默认）。
- ASR：FunASR paraformer-zh CPU 实时率 ~10–20x（1h 视频 ≈ 3–6min）；whisper
  small CPU 约 1–2x 仅作兼容档。
- caption：1 VLM call/镜头（≤3 帧）；600 镜头 ≈ 600 call，走现有 VLM 限流与
  worker_concurrency，预计 10–20min（qwen3.7-flash 档）。
- 向量/图/wiki 腿成本与同字数文本文档同量级（镜头卡文本 ≈ 转录+描述长度）。

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| caption 幻觉污染索引 | 卡文本永远并列 asr+ocr 原文（幻觉可被原文对冲）；消融开关 + recall-test 量化；caption 降级不阻断 |
| ASR 错字（专名/术语） | 屏幕文字路互为备份；graph 腿实体别名合并（resolve_entity_aliases）兜底跨镜头别名 |
| 长视频占 worker | 腿级 progress + resume；delete 检查点对齐 `_require_alive` 先例 |
| 存储膨胀 | 帧预算钉死（q80/1280px/1 帧每镜头）；删除文档级联删帧目录（对齐 `_remove_dir`） |
| 无 GPU 环境 | 默认 FunASR CPU 档；caption 走云端 VLM（已有 DASHSCOPE 链路） |
| 后缀门控误开 | enabled 默认 false；冻结文本集不动，视频集独立 frozenset |
| 大文件 Range 流阻塞事件循环 | 优先 FileResponse 原生 Range；手写 handler 必须异步读（aiofiles/`run_file_io`），blocking-io-guard 静态检查覆盖 |

## 10. 测试策略与验收

- 纯函数单测（node 环境）：场景边界合并（含 max_shot 兜底切）、等距回退窗、
  卡文本组装三模式、时间码格式化/解析往返、chunk_id 序与 shot_index 对齐。
- worker 集成测：fake ASR/VLM/OCR + 2 镜头 fixture 视频（ffmpeg 合成静音+字卡）
  → 断言 legs/path_status/degraded 矩阵/resume（中断重入只跑 pending）。
- qdrant-marked 测：镜头卡 upsert 进 kb_chunks、实体回填、wiki 资格跨镜头 freq≥2。
- 后端 API 测：/supported-formats 门控并集、frame 端点 200/404/鉴权、引用 payload
  时间码字段、删除文档级联删 video_shots+帧。
- 前端 dom 测：时间码芯片/缩略图 404 降级/复制时间码（kb-toast 作用域断言带
  toasterId）、文档列表视频徽章与「N 镜头」。
- 流端点测：200 全量 / 206 部分（Content-Range 正确）/ 416 越界 / 404 非视频 /
  未授权；range 解析纯函数单测。
- 播放器 dom 测：点芯片 → currentTime 被设 + play() 被调（HTMLMediaElement spy）；
  派发 timeupdate → 活动行高亮；引用定位 → start_ms 暂停加载。
- 浏览器实测：真实 2–5min 视频全链路 + 对话命中引用跳时间码芯片 + 评测跑一轮
  视频 KB（recall@k 有数）；revert proof 惯例（摘 materialize 腿 → 集成测 RED）。

## 11. 分期

- **v1（本 spec）**：文本主索引 + 时间码引用 + 关键帧缩略图 + 评测接入。
- v2 候选（另立 spec，按优先级）：
  1. **整片摘要与章节（评审 G3，v2 首位）**：纯文本 LLM 过一遍某文档的镜头卡
     序列（不碰视频）→ 视频摘要 + 章节列表（章节 = 连续同主题镜头段），落文档
     元数据或 wiki；零新模型链路，是 v1 产物之上的纯增量（对标 VSS summarization
     / YouTube 章节，补「这片视频讲了什么」中间层）。
  2. `kb_shot_frames` 多模态辅路 + RRF；
  3. 说话人分离；
  4. 检测→场景图路；
  5. 直播流。
