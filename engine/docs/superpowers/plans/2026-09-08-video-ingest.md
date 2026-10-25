# 视频入库实施 plan（2026-09-08）

对应 spec：`docs/superpowers/specs/2026-09-08-video-ingest-design.md`（章节引用
以「spec §N」标记）。任务按序执行；每任务 RED → GREEN → revert proof → 提交。
后端验证基线：`cd backend && uv run pytest tests/knowledge -q`（沙箱需
`--basetemp=.pytest-tmp/<sub>` + PYTHONPATH/PYTHONIOENCODING/PYTHONUTF8 三 env，
Makefile 同款）+ `ruff check/format` 双净；前端：`python ../scripts/pnpm.py check`
+ `test run tests/unit/knowledge`。

## Task 1: 配置门控与后缀并集（spec §2/§7）

**Files:**
- Modify: `backend/packages/harness/deerflow/config/app_config.py`（rag.video 段 schema，默认 enabled=false）
- Modify: `backend/packages/harness/deerflow/knowledge/parser.py`（`VIDEO_UPLOAD_SUFFIXES` frozenset；`SUPPORTED_UPLOAD_SUFFIXES` 文本集**不动**）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`/supported-formats` 返回并集当且仅当 enabled）
- Modify: `config.example.yaml`（注释段）
- Test: `backend/tests/knowledge/test_api.py`（门控并集两态：off 拒 .mp4 / on 收 .mp4；文本集恒在）

- [x] RED：门控两态用例 failed（端点恒返文本集）。（8 例 RED，含体积门与配置段用例）
- [x] Implement：配置段 + frozenset + 端点并集。（另落 `video_upload_limit_bytes()` 体积门：超 `max_size_mb` 门口即拒）
- [x] GREEN + revert proof（摘 `video_ingest_enabled` 门控 → 4 例 RED）。
- [x] Commit: `feat(rag): gate video upload suffixes behind rag.video.enabled`（`787e817e`）

## Task 2: video_shots 表与 store CRUD（spec §3）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/models.py`（VideoShotRow，唯一约束 (doc_id, shot_index)）
- Create: `backend/packages/harness/deerflow/knowledge/video/store.py`（VideoShotStore：bulk upsert / list by doc / pending 查询 / delete by doc）
- Migration: `make migrate-rev MSG="add video_shots table"`
- Test: `backend/tests/knowledge/video/test_store.py`（CRUD + resume pending 查询 + 级联删）

- [x] RED → Implement → GREEN → revert proof。（5 例；upsert 冻结「present keys overwrite / absent keys persist」，caption_status 不隐式重置；迁移 `77df30935788` 已剔除 autogen 混入的 content_hash 漂移 noise，upgrade head + downgrade -1 实跑验证）
- [x] Commit: `feat(rag): add video_shots table and store for shot cards`（`8c3868f1`）

## Task 3: probe + ASR 适配层（spec §2）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/video/probe.py`（ffprobe 时长/可解码性；不可解码抛 `VideoUndecodableError`）
- Create: `backend/packages/harness/deerflow/knowledge/video/asr.py`（`TranscriptSegment(start_ms,end_ms,text)`；FunASR/whisper 双 provider 协议 + 本地 CPU 档；整腿失败抛 `AsrError`）
- Test: `backend/tests/knowledge/video/test_probe.py`（fake runner + 真实 ffprobe JSON 覆盖解析/错误映射；真实二进制端到端 skipif）+ `test_asr.py`（fake provider 协议 + normalize_transcript 时间戳合并纯函数 + provider 输出解析白盒）

- [x] RED → Implement → GREEN → revert proof。（25 passed + 1 skipped；本机无 ffmpeg/funasr/whisper，纯逻辑用 fake runner + fake provider 全覆盖，真实二进制端到端标 skipif 不阻塞回归——对原文「ffmpeg 合成 fixture」的合理偏离；probe 硬失败 VideoUndecodableError/FfprobeMissingError，asr 整腿降级 AsrError（依赖缺失延迟 import 即降级，不 crash）；normalize_transcript 钉死单位换算/排序/无效丢弃；blocking subprocess/推理经 run_file_io 落线程池）
- [x] Commit: `feat(rag): video probe and ASR adapter legs`（`c86f1c4f`）

## Task 4: 场景切分纯函数（spec §2/§10）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/video/segmentation.py`（`merge_scene_bounds(cuts, duration_ms, max_shot_ms)` 兜底必切；`fallback_windows(duration_ms, window_ms)` 等距回退；边界去重/零长度镜头剔除纯函数）
- PySceneDetect 调用封在 worker 腿内（可 fake），纯函数不依赖它
- Test: `backend/tests/knowledge/video/test_segmentation.py`（兜底切/回退窗/零长度剔除/确定性同输入同输出）

- [x] RED → Implement → GREEN → revert proof。（20 passed 全本机、无 skipif——零外部依赖纯函数；等分兜底避免末尾碎片；覆盖/升序/无缝/≤max_shot/确定性五条不变量钉死；初始 RED 因与写实现并行发命令被抢跑，revert proof 已补回干净 RED 证据）
- [x] Commit: `feat(rag): scene segmentation pure functions with max-shot fallback`（`ca2ffabe`）

## Task 5: 关键帧 + OCR 适配层（spec §2/§8）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/video/frames.py`（ffmpeg 抽中帧 → JPEG q80 ≤1280px 落 KB 存储目录 `frames/<doc_id>/shot_%04d.jpg`；caption 临时 3 帧不持久化；单镜头失败返回 None 不阻断）
- Create: `backend/packages/harness/deerflow/knowledge/video/ocr.py`（PaddleOCR 屏幕文字；失败空串）
- Test: `test_frames.py`（合成视频抽帧尺寸/质量预算/缺帧 None）+ `test_ocr.py`（fake OCR）

- [x] RED → Implement → GREEN → revert proof。（18 passed + 1 skipped；本机无 ffmpeg/PaddleOCR，纯逻辑用 fake runner + fake engine 全覆盖，真实抽帧端到端 skipif；帧路径精化为 `doc_dir/frames/shot_%04d.jpg`——doc_dir 已 per-doc 含 doc_id，对齐现有 images/ 布局、删除文档 _remove_dir 自动级联删帧，不再嵌套 `<doc_id>/`；单镜头失败 None 不阻断、OCR 每帧降级空串、caption 帧走 stdout pipe 不持久化；RED 独立成轮收集，未重蹈 Task 4 并行竞态）
- [x] Commit: `feat(rag): keyframe extraction and screen-text OCR legs`（`c174be79`）

## Task 6: 镜头卡 captioner 与卡文本组装（spec §3/§6）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/video/captioner.py`（DashScope VLM，prompt 双模式对齐 `captioner.py` 先例；降级非硬依赖；>30% 失败率返回 degraded 标记）
- Create: `backend/packages/harness/deerflow/knowledge/video/shot_card.py`（**冻结卡正文模板**组装纯函数（**不含时间码头**，spec §3 嵌入文本契约）+ 展示合成纯函数 `render_card_display(body, shot)`（带头全卡单一源）+ 三模式 `card_text_mode` + 时间码 `HH:MM:SS.mmm` 格式化/解析往返 + `chunk_id_for_shot`）
- Test: `test_shot_card.py`（正文模板逐字钉死、展示合成往返、三模式、时间码往返、全空镜头判 empty）+ `test_captioner.py`（fake VLM + 30% 降级阈值）

- [x] RED → Implement → GREEN → revert proof。（29 passed 全本机、无 skipif——shot_card 纯函数逐字钉死冻结模板（场景/口述/屏幕文字，caption 空补（无）保三行稳定）+ 时间码往返×9 + 三模式消融 + empty 判定 + render 展示合成；captioner 用 httpx.MockTransport（对齐 test_parser 先例）+ monkeypatch DASHSCOPE_API_KEY，钉死 api_key 缺失全降级、单镜头失败计数、>30% degraded（30% 边界严格大于不触发）、无帧镜头不计 failed；base_url 读 cfg.rag.vlm_base_url（config 单一源，避开现有 captioner 未读该键的缺口）；RED 独立成轮收集）
- [x] Commit: `feat(rag): shot card assembler and VLM captioner with degradation gate`（`94bc2ffa`）

## Task 7: worker 腿接线 + resume + path_status（spec §2）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/worker.py`（视频分支腿序 probe→asr→segment→keyframe+ocr→caption→materialize；path_status 扩腿；progress 腿权重 asr30/segment5/caption35/materialize5；`_require_alive` 检查点；resume 只跑 pending 镜头；materialize 写 video_shots+chunks 后**落入现有 vector/graph/wiki 腿**零改动）
- Modify: `backend/packages/harness/deerflow/knowledge/store.py`（文档删除级联删 video_shots + 帧目录，对齐 `_remove_dir`）
- Test: `backend/tests/knowledge/video/test_worker_pipeline.py`（fake 全腿：2 镜头 fixture → legs/path_status/degraded 矩阵/resume 重入只跑 pending/删除级联）

- [x] RED → Implement → GREEN → revert proof（摘 materialize → 6 RED）。（16 passed 全本机、无 skipif——5 ASR 投影纯函数 + 11 集成；媒体腿全 fake/monkeypatch、DB 真实 SQLite；腿序 probe→asr→segment→keyframe+ocr→**persist 骨架**→caption→materialize，镜头卡落现有 vector/graph/wiki 腿零改动。**persist 骨架前置于 caption** 是 resume「只跑 pending」的必需偏离——骨架写 video_shots（start/end/keyframe/asr/ocr，**不写 caption_status** 遵 upsert absent-keys-persist，done 不重置），caption 腿只跑 list_pending_shots，materialize 组装 chunks（幂等 wipe 重建，提取 `_wipe_doc_chunks` 与文本 reparse 共用）；resume 判据 = video_shots 骨架非空则跳过 probe/asr/segment/keyframe。ASR 投影 `assign_transcript_to_shots` 纯函数钉死 spec §3 时间轴对齐（最大重叠占比归桶 / 同重叠归早桶 / 升序空格拼接 / 零重叠丢弃 / 静默镜头缺席）；progress 权重 asr30·segment5·caption35·materialize5=75，vector/graph 映射 75→100（文本 base0/span100 不变、单调）；path_status 扩 {asr,segment,caption}（文本 NULL 安全）；降级矩阵 asr 失败→asr=failed+口述「（ASR 失败）」、检测器失败→fallback_windows+segment=degraded、caption>30%→degraded、keyframe>30%→error marker（path_status 仅三腿，spec §5）。PySceneDetect/funasr/whisper/paddleocr 均不在依赖，segment detector 延迟 import 缺失即降级，blocking detect/读帧经 run_file_io（blocking_io 守卫仅预存无关失败）；store delete_document/delete_kb 级联删 video_shots，帧目录由 service `_remove_dir(doc_dir)` 覆盖 frames/ 子目录、无需 store 碰文件系统）
- [x] Commit: `feat(rag): wire video legs into the indexing worker with resume and degradation`（`2c11e501`）

## Task 8: 引用时间码 + frame 端点（spec §4）

**Files:**
- Modify: `backend/app/gateway/services/knowledge_service.py`（引用 payload join video_shots：media/shot_index/start_ms/end_ms/frame_url，仅视频文档；文本引用字段不动）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`GET /{kb_id}/documents/{doc_id}/shots/{shot_index}/frame` 流式 JPEG，鉴权对齐文档读取，无帧 404；文档列表 payload 带 duration_ms/镜头数仅视频文档）
- Test: `backend/tests/knowledge/test_video_citations_api.py`（payload 字段/404/鉴权/列表时长）

- [x] RED → Implement → GREEN → revert proof（stash 摘两实现文件 → 7 RED，与初始 RED 同形；负向「无 shots 不注入」用例两态恒绿，守过度注入）。（8 passed；引用 join 落 recall_test 的 vector hits + graph evidence 两 chunk 级引用面（wiki 条目级不 join），按 chunk_id 扁平序 `{doc_id}#{shot_index:04d}` 分组每文档一次 list_shots，文本文档返回空自然缺省；frame_url 仅镜头有持久化关键帧时带（缺帧降级不带，spec §2）；frame 端点 FileResponse 流式 JPEG、鉴权走 _require_kb_access 与文档读取同源、404 覆盖非视频/缺镜头/缺帧/穿越 keyframe_path/磁盘帧丢失（resolve_shot_frame 镜像 get_document_file 穿越守卫先例，LOW FILE_METADATA 静态发现与兄弟端点同基线、运行时 blocking-io 门禁不覆盖知识库层）；文档列表 duration_ms=末镜 end_ms + shot_count=video_shots 行数，仅 storage_path 后缀 ∈ 视频集且 shots 已物化时注入，文本行 payload 不变；全量 knowledge 950 passed，仅 umap 可选依赖预存无关失败）
- [x] Commit: `feat(rag): timecode citations and keyframe serving endpoint`（`a751b18c`）

## Task 8b: recaption 运维重跑入口（spec §2 运维重跑入口，评审 G1）

**Files:**
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`POST /{kb_id}/documents/{doc_id}/video/recaption` 202；在飞 409；非视频文档 404）
- Modify: `backend/app/gateway/services/knowledge_service.py`（`trigger_recaption`：重置 caption_status（done/failed→pending，empty 保持）+ 入队子集腿运行）
- Modify: `backend/packages/harness/deerflow/knowledge/worker.py`（子集腿模式：只跑 caption+materialize+增量重嵌向量+`mark_dirty_for_entities`；帧/ASR/segment 腿跳过，帧已持久化）
- Test: `backend/tests/knowledge/video/test_recaption.py`（重置矩阵 done→pending / empty 保持 / 在飞 409 / 非视频 404 / wiki dirty 传播 / 仅变更 chunk 重嵌）

- [x] RED → Implement → GREEN → revert proof（精准 neuter trigger_recaption 的 caption_status 重置 → 重置矩阵用例 RED：done/failed 不翻 pending → worker caption 腿 list_pending_shots 空 → 重跑不生效）。（10 passed；service.trigger_recaption 重置 done/failed→pending（empty 保持，三路俱空重跑无意义）走 bulk_upsert 只翻 caption_status 遵 absent-keys-persist，同步翻文档 parsing 标记在飞（镜像 retry status flip；且 parsing→重启 recover 走 resume 路重跑 pending 镜头正确恢复）；门禁：非视频 NotVideoDocumentError→404、在飞 DocumentProcessingError→409、缺失/跨库 None→404；worker.submit_recaption 不走 resume 队列（recover 不重触，共用信号量+inflight）→ recaption_document 子集腿：复用 _video_caption_leg（只跑 pending）+ _video_recaption_materialize 原地重组（不 wipe，diff 旧正文仅变更 chunk 经 index_chunks 增量重嵌、实体列保留图谱不重抽、镜头转全空退役其卡对齐单删级联）+ mark_dirty_for_entities 传播 wiki dirty，终态 ready/失败降级 ready+error marker；_is_video_document 提取与 _inject_video_summary 共用；全量 knowledge 960 passed，仅 umap 可选依赖预存无关失败）
- [x] Commit: `feat(rag): recaption endpoint for caption model upgrades`（`7dba2f8d`）

## Task 9: 前端文档列表与上传面（spec §5）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/document-panel.tsx`（视频行胶片图标 + 时长 + 「N 镜头」；path_status hover 增 asr/segment/caption 芯片，degraded 琥珀色）
- Modify: `frontend/src/core/knowledge/{types,api,hooks}.ts`（payload 新字段类型）
- Modify: i18n 三文件（videoDuration/shotCount/legs.* 键）
- Test: `frontend/tests/unit/knowledge/document-panel.dom.test.tsx`（视频徽章/三芯片/degraded 色）

- [x] RED → Implement → GREEN（`pnpm check` 双净）→ revert proof（stash 摘 document-panel.tsx + path-status.ts 两运行时实现文件、留测试与 format/types/i18n → 5 RED，与初始 RED 同形；文本行不渲染徽章 / 未物化视频行不渲染徽章 / 文本 pathStatusLines 仍三腿 三条负向用例两态恒绿）。（document-panel.dom.test.tsx +8 例 → 67 passed；视频徽章：胶片图标本就由 FileTypeBadge 按 .mp4/.mov/.mkv 后缀落 media kind 自动渲染（无需新图标），名称单元格只补 duration_ms（formatVideoDuration 秒级取整 M:SS / 超小时 H:MM:SS）+ shot_count「N 镜头」，仅列表接口 Task 8 注入了这两字段的已物化视频文档才渲染（`duration_ms!=null || shot_count!=null` 门控，文本行/解析中视频行不渲染）；path_status hover：pathStatusLines 前置 asr/segment/caption 三腿（管线 upstream 排检索腿前）、只收 payload 实际携带的腿（`.filter(status[leg]!==undefined)`，文本文档仍只 vector/graph/wiki），degraded 按状态而非腿着琥珀 `text-amber-600 dark:text-amber-500`（对齐 vector-tab/eval-synthesis-review 既有 caution 词汇，图谱腿 degraded 同处理），line div 挂 data-path、state span 挂 data-state 供 dom 测试定位；types.ts DocumentPathStatus 加可选 asr/segment/caption（VideoLegState 复用 pending/indexing/done/degraded/failed，与 worker 写入口径一致）+ KnowledgeDocument 加 duration_ms/shot_count，api/hooks 是泛型透传 `readResponse<KnowledgeDocument[]>` 故无需改（新字段随类型自动流通）；i18n 三文件同步 pathStatus.asr|segment|caption（zh 语音/分镜/配文，en Speech/Shots/Caption）+ videoDuration（title/aria）/shotCount(n)；pnpm check（eslint+tsc）双净——修 path-status.ts 一处 `non-nullable-type-assertion-style`（`status[leg] as string` → `status[leg]!`）；prettier 非本仓门禁（.git/hooks/pre-commit 未安装、5/6 被标记文件 HEAD 即已脏），path-status.ts HEAD 干净故单独 prettier --write 复位、余 5 文件不重排以免卷入无关全文件 churn；全量 tests/unit/knowledge 63 passed / 1 failed，唯一失败 chat-panel 模型选择器 `context.model_name` 期望 qwen-plus 得 undefined，git stash 撤回本次全部改动后同样失败 → 预存本地模型配置依赖，与 Task 9 无关）
- [x] Commit: `feat(frontend): video document badges and video leg status chips`（`8ca4db94`）

## Task 10: 切片抽屉时间码芯片 + 缩略图（spec §5）

**Files:**
- Modify: `frontend/src/components/workspace/knowledge/chunk-drawer.tsx`（视频 chunk：mono 时间码芯片 `#K · 00:01:12–00:01:40` + lazy 关键帧缩略图（404 降级图标）+「复制时间码」按钮走 kb-toast 中栏作用域；正文原样展示——`chunks.text` 即正文无重复头，spec §3 嵌入文本契约；**芯片/缩略图点击语义 = seek 播放，见 Task 10b**）
- Modify: i18n 三文件（timecodeChip/copyTimecode/frameMissing）
- Test: `frontend/tests/unit/knowledge/chunk-drawer.dom.test.tsx`（芯片文案/缩略图 404 降级/复制按钮 toast 带 toasterId 断言）

- [x] RED → Implement → GREEN → revert proof（后端：neuter list_document_chunks 的 _inject_video_citations 调用 → 注入用例 KeyError 'media' RED、文本负向恒绿 → 恢复；前端：stash chunk-drawer.tsx → 5 RED 同初始形（芯片/缩略图/缺图/复制按钮未找到）、文本 chunk 无视频条负向恒绿 → pop）。（**plan Files 漏列后端**：切片抽屉时间码数据源在后端缺失——`GET /{kb_id}/documents/{doc_id}/chunks` 原样返回 store 行，故补 `KnowledgeService.list_document_chunks`（store.list_chunks + count_chunks + 复用 Task 8 的 `_inject_video_citations` 按 chunk_id 扁平序 join video_shots），router 改接；video chunk 得 media/shot_index/start_ms/end_ms/frame_url，文本 chunk 一字不动、缺帧无 frame_url。前端 chunk-drawer.tsx 加 VideoShotBar（仅 chunk.media==='video' 渲染于 ChunkCard 上方）：mono 时间码芯片 `#{shot_index+1} · HH:MM:SS–HH:MM:SS`（formatTimecodeRange 定长，区别于时长徽章变长 formatVideoDuration）+ lazy 关键帧缩略图（shotFrameUrl 镜像 documentFileUrl；onError 404 或无 frame_url → ImageOff 缺图占位）+「复制时间码」按钮（navigator.clipboard.writeText 区间 → kb-toast 中栏作用域 copiedTimecode）；正文原样（chunks.text 无时间码头，spec §3）；芯片/缩略图点击 seek 播放留 Task 10b。types.ts KnowledgeChunk 加可选 media/shot_index/start_ms/end_ms/frame_url；api.ts shotFrameUrl；format.ts formatShotTimecode/formatTimecodeRange；i18n 三文件 chunkDrawer.timecodeChip/copyTimecode/copiedTimecode/copyTimecodeFailed/frameMissing。验证：后端 test_video_citations_api.py +2（10 passed）+ test_api/test_e2e_smoke chunks 端点回归 39 passed/1 skipped + ruff 双净；前端 chunk-drawer.dom.test.tsx +6（16 passed）+ pnpm check（eslint+tsc）双净（修一处 no-unnecessary-type-assertion：findByTestId 结果 as HTMLImageElement 多余，getAttribute 在 HTMLElement 即可用）；全量 tests/unit/knowledge 63 文件 passed/1 failed，唯一失败 chat-panel 模型选择器预存无关（Task 9 已 git stash 证明）。**prettier 陷阱**：误信 Task 9 记的「git show HEAD:file | prettier --check」判 HEAD 干净——该法失效（tmp 文件在 .workbuddy/ 未加载 frontend/prettier.config.js，得假 clean），对 api.ts/chunk-drawer.tsx/test 跑 prettier --write 触发全文重排（api.ts 441 行 churn，因这些文件 HEAD 本就非 prettier-clean）；git checkout HEAD 还原 3 文件 + 重新 SearchReplace 应用我的改动复位（diff 收敛回 +219/-3 纯新增）。教训：prettier 非本仓门禁（HEAD 文件不遵循、无 pre-commit hook），勿跑 prettier --write，匹配周围风格即可）
- [x] Commit: 后端 `feat(rag): serve video shot timecode fields on the chunk list endpoint`（`ec314c54`）+ 前端 `feat(frontend): timecode chip and keyframe thumbnail in chunk drawer`（`0638cd93`）

## Task 10b: 视频流端点 + 抽屉内嵌播放器（spec §4/§5，2026-09-09 评审提级）

**Files:**
- Create: `backend/packages/harness/deerflow/knowledge/video/streaming.py`（range 解析纯函数 `parse_range_header(header, size)` → (start, end) / 416 标记 + Content-Range 组装）
- Modify: `backend/app/gateway/routers/knowledge_bases.py`（`GET /{kb_id}/documents/{doc_id}/video/stream`：Range 206/416、鉴权对齐文档读取、Content-Type 按后缀映射；优先 Starlette `FileResponse` 原生 Range，不支持则手写 partial handler 异步读）
- Test: `backend/tests/knowledge/test_video_stream_api.py`（200 全量 / 206 部分 Content-Range 正确 / 416 越界 / 404 非视频 / 未授权）+ range 纯函数单测
- Modify: `frontend/src/components/workspace/knowledge/chunk-drawer.tsx`（抽屉顶部单例 `<video>`：原生 controls、`preload="metadata"`、不自动播放；芯片/缩略图点击 → seek(start_ms/1000)+play；引用闪环定位 → 载到 start_ms 保持暂停；timeupdate 节流 → 活动行边框高亮不抢滚动；窄抽屉宽随抽屉 16:9 限高）
- Modify: `frontend/src/core/knowledge/{api,types}.ts`（stream URL builder）
- Modify: i18n 三文件（playerHint）
- Test: `frontend/tests/unit/knowledge/chunk-drawer.dom.test.tsx`（HTMLMediaElement spy：点芯片 → currentTime 被设 + play() 被调；派发 timeupdate → 活动行高亮；引用定位 → 暂停加载）

- [x] RED → Implement → GREEN → revert proof（后端：neuter resolve_video_stream 的 `return target` → 200/206/416 三用例 RED（皆 404）、media-type 纯函数+404+403 恒绿 → 恢复；前端：neuter handleSeekPlay → 点芯片 seek+play 用例 RED（1 failed/20 passed）、其余恒绿 → 恢复）。（**偏离 plan Files：streaming.py 不含 range 解析纯函数**——验证 Starlette **1.3.1** `FileResponse.__call__` 原生协商 Range（无 range→200 全量 / 单 range→206+`Content-Range`+anyio 异步读不阻塞事件循环 / `RangeNotSatisfiable`→**返回** 416+`Content-Range: bytes */size` / `MalformedRangeHeader`→400），故走 plan「优先 FileResponse 原生 Range」分支：手写 partial handler + `parse_range_header` 会是重复 FileResponse 上游已测能力的死代码，不建；streaming.py 只承载 FileResponse 唯一会猜错的 Content-Type——`content_type_for_video(suffix)` 显式映射冻结视频集（`mimetypes.guess_type` 平台相关、`.mkv` 不可靠），即 plan 要「钉死」的纯函数单测。后端 `KnowledgeService.resolve_video_stream`（镜像 resolve_shot_frame：get_document + kb 归属 + `_is_video_document` 后缀门禁 + `is_file` 守卫，None→404；storage_path 即源视频绝对路径，无 keyframe 那种子路径穿越面）+ router `GET .../video/stream`（鉴权 `_require_kb_access` 对齐文档读取，`FileResponse(video, media_type=content_type_for_video(suffix))`，不传 filename→无 content-disposition→内联播放不下载）。前端 chunk-drawer.tsx 抽屉顶部单例 `<video>`（钉在 ScrollArea **之上** `shrink-0`，浏览镜头卡时始终可见；原生 controls、`preload=metadata`、不自动播、`aspect-video max-h-56` 宽随抽屉；仅 `items.some(media==='video')` 渲染，文本文档零改动）：VideoShotBar 缩略图+芯片包成单个 seek 按钮（点击→`handleSeekPlay`：`video.currentTime=start_ms/1000`+`play()`；复制按钮仍独立）、`onTimeUpdate`→算播放头所在镜头 `[start,end)` 置 activeShotIndex→该行琥珀 `ring-2 ring-amber-500/70`（仅边框不抢滚动，仅变化时 setState 天然节流）、引用定位 focusChunkId→载到 start_ms **保持暂停**（**Radix Sheet portal 的 `<video>` 可能晚于 focus effect 挂载→暂停 seek 暂存 `pendingPausedSeekRef`，由 video 挂载回调 `attachVideo` 补 seek**，对两种挂载顺序都健壮）；api.ts `videoStreamUrl`（镜像 shotFrameUrl）；i18n 三文件 chunkDrawer.playerHint/playShot。验证：后端 test_video_stream_api.py 7 例（media-type 纯函数 + 200/206 Content-Range/416/404 非视频+缺失/403）+ citations 回归 17 passed + ruff 双净；前端 chunk-drawer.dom.test.tsx +5（HTMLMediaElement 原型 spy：播放器属性/点芯片 seek+play/timeupdate 行高亮/定位暂停 seek/文本无播放器）21 passed + pnpm check 双净（修一处 `unbound-method`：`prototype.play` 直接引用→改 `getOwnPropertyDescriptor` 存取）；全量 tests/unit/knowledge 63 文件 passed/1 failed（chat-panel 模型选择器预存无关，Task 9 已证）。**未跑 prettier**（吸取 Task 10 教训：非本仓门禁、pnpm check 才是）。
- [x] Commit: 后端 `feat(rag): range-streaming video endpoint for the inline shot player`（`32976902`）+ 前端 `feat(frontend): inline video player with shot seek in chunk drawer`（`2ae40eb1`）

## Task 11: 评测接入与造题指引（spec §6）

**Files:**
- Create: `backend/docs/video-kb-question-authoring.md`（口述型/屏幕文字型/视觉描述型三类造题规范各 ≥1 例）
- Modify: `backend/tests/knowledge/eval/`（镜头卡作为 chunk 进 L1 检索的最小集成用例：fake 视频 KB → recall@k 有数）
- 消融开关 `card_text_mode` 在 Task 6 已落，此处补 recall-test 对比脚本说明进造题指引

- [x] RED → Implement → GREEN。（**表征测试（naturally GREEN）+ revert proof**：镜头卡进 L1 是 Task 6/7 已落行为（镜头卡=chunk、chunk_id 扁平序），本集成用例是验证既有兼容性非新功能，故写定即 GREEN；revert proof 补牙：neuter `shot_card.chunk_id_for_shot` 生成不合规 id（`shot-{doc}-{i}`）→ `add_question` 的 `validate_question` 抛 `QuestionBankInvalidQuestion`（relevant_chunk_ids 不匹配 `<32-hex>#NNNN`）→ 两用例 RED → 恢复。新建 `tests/knowledge/eval/test_video_eval.py`（2 例）：`_seed_video_kb` 建 fake 视频 KB（真实 store：.mp4 文档 + 三张镜头卡 chunk，用生产 `shot_card.assemble_card_body`/`chunk_id_for_shot` 组装、对应造题三类视觉/口述/屏幕文字，insert 后从 store 读回 chunk_id），跑生产同款 `run_layer1_for_kb` 编排 + stub searchers（vector 命中镜头卡）：①镜头卡 chunk_id 过 `add_question` golden 校验（零 schema 改造）②recall@k/hit_rate/path_accuracy 均 1.0（有数）。eval 套件 324 passed + ruff 双净。）
- [x] Commit: `docs(rag): video KB question authoring guide and eval integration test`（`b3f6af02`：造题指引 `backend/docs/video-kb-question-authoring.md`——镜头卡三段=三类信息源、口述/屏幕文字/视觉描述三类造题各一带完整 golden JSONL 例+字段注意、`card_text_mode`（full/caption_only/asr_only）消融×recall-test 对比流程（含 recaption 重嵌路径）、代码索引；+ 集成用例 test_video_eval.py）

## Task 12: 收官——全量回归 + 浏览器实测 + 指南落档

- [x] 后端 `pytest tests/knowledge -q` 全量 GREEN + ruff 双净；前端 check 双净 +
      knowledge 套件对基线（仅预存无关失败）。（**后端**：971 passed / 1 failed / 4 skipped（7m41s）——唯一失败 `projection/test_reducer.py::test_umap_reduce_with_extra_produces_finite_coords` 是 `pytest.importorskip("umap")` 触发 `import numba` 报错（numba njit 可选依赖环境问题），在 projection/ 与视频 video/ 零交集，Task 7 收官已录同类预存失败；ruff check 视频全集 All passed + format 22 files already formatted（双净）。**前端**：`pnpm check` exit 0（eslint+tsc 双净）；knowledge 套件 63 文件 passed / 1 failed（`chat-panel` model selector 预存无关，历次收官均现）。）
- [x] 浏览器实测：真实 2–5min 视频上传 → 腿进度 → 对话命中 → 引用时间码芯片 +
      缩略图 + **点芯片即播/区间高亮/引用定位暂停加载** → 检索测试命中镜头卡 →
      评测跑一轮视频 KB；截图落 `pr-build/`。（**用户 2026-09-09 手动逐项通过**：含音轨视频
      `2022_03_26_22_51_IMG_0150.MP4`（11.1MB）上传 → 五腿全 done → ready；对话命中、引用
      时间码芯片+缩略图、点芯片即播/区间高亮/引用定位暂停、检索测试命中镜头卡、评测一轮
      均通。机器旁证：documents 表该文档 path_status 五腿全 done、gateway.log POST 202 且无
      代理截断警告。**截图豁免**：用户口头确认通过、未落 `pr-build/`。实测期间修复的环境/栈
      缺陷（非本 plan 代码）：uv 剪包 `f3183e1b`/`bde44fc8`、删文档竞态 `404a378c`、Next 代理
      10MB 上限+reload 白名单 `d6243919`、徽章去重 `8aea9cac`、播放器布局 `985d6833`。）
- [x] Modify: `backend/AGENTS.md`（knowledge 小节补视频腿与 video_shots 契约）；
      `frontend/AGENTS.md` 无需改（表面层改动已在组件注释自载）。（`### Knowledge Base / RAG` 小节末尾补 `**Video ingestion**` 段：gate（rag.video.enabled + VIDEO_UPLOAD_SUFFIXES）/ legs（_run_video_legs 腿序 + persist 骨架前置 caption 的 resume 理由 + progress 单调 0→75→100 + 降级矩阵）/ video_shots 表（媒体侧字段 + 级联删）/ shot-card=chunk（冻结三段=嵌入文本、chunk_id 扁平序匹配 golden 正则零改造进 L1、card_text_mode 消融）/ path_status 三视频腿 + duration_ms/shot_count 读时聚合 / citations+媒体端点（_inject_video_citations、frame 端点、video/stream 的 FileResponse 原生 Range + streaming.py Content-Type map）/ recaption / tests。对齐 orientation-layer 原则（模块+职责+契约口径，不含 commit hash/RED-GREEN/验收清单）。）
- [x] Commit: `docs(rag): sync agent guides for video ingest and smoke evidence`（拆两步：
      `fb9b2c5c` AGENTS.md Video ingestion 段 + 本 plan 回归结论；smoke evidence 即本 commit——
      Task 12 浏览器实测勾选 + 实测证据录档，plan 收官。）

## 风险登记（实施期新增即补此行下表）

| 风险 | 触发任务 | 缓解 |
|---|---|---|
| FunASR 依赖体积/安装失败 | T3 | provider 协议隔离；whisper 档兜底；CI 不装重依赖（fake 测试） |
| PySceneDetect 在沙箱阻塞事件循环 | T4/T7 | 腿内 `run_file_io` 线程池包裹（blocking-io-guard 技能先例） |
| 帧目录删除遗漏 | T7 | 级联删单测钉死 + 实测删文档核对磁盘 |
