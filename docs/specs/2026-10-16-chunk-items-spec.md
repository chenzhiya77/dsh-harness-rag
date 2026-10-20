# 面板 ② 档 · 切片面三件（渲染切换／视频镜头条＋播放器／切片编辑＋重抽） —— spec

**Status:** ✅ 收官（2026-10-16 他令「开②档乙对」，10-18 他手验真跑通过；10-20 回填）——②档批第二对（甲对 doc-columns 已收官 `4d9a7d0`）；**D1＝甲（10-16 他令「按甲方案直接开跑」）**；**Task 0–5 全毕**（Task 0 五格全核；Task 1 门禁 11/11＋真栈 5/5；Task 2–4 冒烟 69 PASS＋缺件二跑全绿；真跑：渲染/原始切换、图片通道、视频镜头条＋真视频 seek、编辑保存、重抽）；实现已随 `a90db41` 入库，定稿一笔已落。
**来源:** T3 plan「RAG 前端全域覆盖审计」C 组走查账——C1③ 视频镜头条＋播放器／C2① 渲染·原始切换／C2④ 切片编辑＋重抽（10-15 三件登记；②档批 10-16 他令「都做」——切片面为五面之一）。
**承接:** 条目为 10-15 审计原文（T3 plan C 组）；工作台只作形态与逻辑底本（照抄口径、代码不搬——承 T3 D5 与「先一致后另案」）。
**配套 plan:** [../plans/2026-10-16-chunk-items-plan.md](../plans/2026-10-16-chunk-items-plan.md)（同批成对）。

## 1. 范围

本对三件（落点＝`client.js` 切片面（ChunkDrawer 段）＋ host 半 `src/kb_proxy.ts`；deer-flow 零改动）：

1. **渲染/原始切换（C2①）**：切片卡查看态默认渲染 Markdown（相对图片引用经代理显示、失败降级），可切回原始文本；编辑态恒原始（照 `chunk-card.tsx:114-190`）。
2. **视频镜头条＋播放器（C1③）**：视频 chunk 行上方镜头条（关键帧缩略图＋`#K · 时间码`芯片＋复制钮）＋抽屉头行下方单例 `<video>`（点击 seek 播放／focus 定位暂停 seek／播放头琥珀高亮镜头行／提示行）——照 `chunk-drawer.tsx:53-132／164-227／494-510`。
3. **切片编辑＋重抽（C2④）**：卡片就地区编辑（Textarea＋保存/取消）＋「重新抽取」（费用提示 title／每文档互斥／抽取中态／409 友好化）——照 `chunk-card.tsx:194-210／274-300` ＋ `chunk-drawer.tsx:351-423`。

## 2. 决定表（D1，**已拍：甲**，2026-10-16）

### D1 —— 渲染切换的承载件（**已拍：甲**）

- **甲（拍定）**：宿主 `MarkdownText`（primitives，直用）——`pathImages` 词表重写图片引用（预取→blob URL 映射；宿主词表只放行 `http(s)/blob/data`，`dsh-app://` 被拒——见 §3）；缺件回退＝现 pre-wrap（不崩）。切换钮＝宿主 `SegmentedControl`（两段 icon；缺件回退两枚自绘钮照工作台 ToggleGroup 形态）。
- ~~乙：自写轻量 markdown 渲染器~~（**散去**——宿主有件，自写复制渲染质量/维护面）。
- ~~丙：维持 pre-wrap 不做~~（②档「都做」令已否，散去）。

**非叉（照工作台既定，登记在案）**：视频播放器＝原生 `<video>`（宿主无视频件）；重抽＝点击即跑、title 费用提示「将消耗 1 次 LLM 抽取调用」、无确认弹层（如要确认弹层＝有意偏离面，点名才加）。

## 3. 契约与落点（Task 0 已核；行锚/实样已回填）

- **工作台参照件**：`chunk-card.tsx`（渲染/原始 ToggleGroup :170-190；`ChunkImage` 相对引用重写/失败降级 :25-59；编辑 Textarea :194-210；重抽钮 title=reExtractCost :274-300）；`chunk-drawer.tsx`（`VideoShotBar` :53-132——缩略图 `h-9 w-16`／芯片 `#K · mm:ss–mm:ss`／复制钮；播放器 ref/seek/高亮 :164-227；头部 sticky 播放器 :494-510；focus 暂停 seek :299-306；条件轮询谓词含重抽在飞 :177-182）。
- **端点面（全既存，零后端改动；真机实证）**：PATCH `.../chunks/{id}`（body `{text}` 非空；重嵌向量＋token 重算＋`last_edited_at`——embed 先行、同一 point 覆写）／POST `.../chunks/{id}/re-extract`（五步级联：抽取走「当前（可能已改）文本」、置 `extract_status=pending`；文档非终态 409）／GET `.../shots/{i}/frame`（JPEG；缺帧 404 降级）／GET `.../video/stream`（Range 206 实测：`content-range: bytes 0-1023/4625372`）／GET `.../files/{ref}`（文档资产）。
- **数据缝（真样已核）**：chunk 载荷含 `media/shot_index/start_ms/end_ms/frame_url`（视频样：`media:'video', shot_index:2, start_ms:9337, end_ms:14005`）＋`extract_status/token_count/last_edited_at`——listChunks 透传即得，零新字段。
- **宿主链路（10-16 实核）**：桌面页 origin＝`dsh-app://app`；壳 `protocol.handle` 对非静态路径全量 `forwardWebRequest(request, hostUrl, hostCookie)`——**透传 Range/206/流式**（`/lib/main.js:11542/7461`）⇒ `<img>/<video>` 直接 load 相对代理 URL 可行（GET）；`MarkdownText` 图片词表只放行 `http(s)/blob/data` ⇒ 图片走**预取→blob**映射（`pathImages.resolve` 同步返回，blob 生命周期随卡挂载/卸）。
- **插件落点（行锚）**：host 半 `src/kb_proxy.ts`（JSON 两 op＋raw 中继三枚；现方法闸「POST only」按 op 放行 GET）；client 半 `ChunkDrawer`（`client.js:3446`；行渲染 `:3671`；抽屉头 `:3785`；轮询谓词 `:3499`／`hasPendingExtraction :3897`；`chunkTimecode :3265`；常量族 `:2592-2596`；样式族 `:1943+`）。
- **文案**：全表照工作台 `zh-CN.ts／en-US.ts :: chunkDrawer` 逐字（已回收全键：编辑/保存/取消/`editHint`／重新抽取/`reExtractCost`〔将消耗 1 次 LLM 抽取调用〕/抽取中…/正在抽取实体，请稍候…／时间码族〔timecodeChip/copyTimecode/copiedTimecode/copyTimecodeFailed/frameMissing〕／播放器族〔playerHint/playShot〕／图片不可用 等）。

## 4. 验收

1. **逐件可用**：渲染↔原始切换生效（渲染态含图片直显、失败降级；编辑态恒原始）；视频文档出镜头条＋播放器（缩略图/seek 播放/播放头高亮/复制时间码/提示行）；编辑保存生效（重开保持、向量已重嵌）；重抽全链（转圈/互斥/409 友好/完成后实体刷新）。
2. **对照工作台**：文案逐字、形态逐件（差项登记 §6）。
3. **门禁**：`node --check`＋冒烟回归（新增渲染用例）＋桌面端真跑（整重启铁律）。
4. **deer-flow 零改动**。

## 5. 影响面

**改的（插件仓）**：`client.js`（切片面）＋`src/kb_proxy.ts`（五 op）＋locale 内联字典（新键）。
**不改的**：deer-flow 全部；宿主面（壳/件零改）。

## 6. 缺口登记

- 图片失败降级＝MarkdownText 内建 alt 呈现（工作台为虚线缺图框——小差）；渲染器/播放器缺件回退＝原生 pre-wrap／不渲（不崩）。
- 编辑/重抽成功后的刷新口径：抽屉 reload（工作台为 react-query 前缀失效一次覆盖文档＋切片两处——差异点，实现时按插件 refreshToken 通路取简）。
- 重抽 409 警告色：工作台为黄色 warning，插件宿主 Toast 无 warn 档（仅常规/错误两色）⇒ 走**中性色**；要黄标点名再配。
- 重抽互斥取向：按卡 prop 文档意图实现「在飞禁余卡」（OR）；工作台字面 `disabled={isReExtracting ?? reExtractDisabled}` 的 `??` 令该 prop 恒失效——工作台缺陷，不照抄（冒烟已钉 OR 行为）。
- 本对不动：丙＝卡片管理面（候立）；E1② wiki 正文渲染维持登记（本渲染器届时可复用，另案）。

## 7. 来源与范围

**来源**：10-15 审计 C 组走查 → ②档批（10-16 他令「都做」）；乙对＝切片面三件。
**范围**：只收本件三行；②档余面（丙＝卡片管理面）＝后续对候立；③档维持挂账。
