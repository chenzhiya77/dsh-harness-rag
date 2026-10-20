# 面板 ② 档 · 切片面三件（渲染切换／视频镜头条＋播放器／切片编辑＋重抽） —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-16-chunk-items-spec.md](../specs/2026-10-16-chunk-items-spec.md)（范围＋D1＋验收）
**Status:** ✅ 收官（2026-10-16 他令「开②档乙对」＋「按甲方案直接开跑」；10-20 回填）——**D1＝甲（已拍 10-16）**；**Task 0–5 全毕**（T1 门禁 11/11＋真栈 5/5；T2–T4 冒烟 69 PASS＋缺件二跑全绿；**真跑整批已过**——10-18 他手验：渲染/原始切换、图片通道、视频镜头条＋真视频 seek、编辑保存、重抽）。销定已落、门禁四项全绿——**定稿一笔落地**（`a90db41`）。
**Parent:** ②档批（10-16 他令「都做」；档位表见会话）× 甲对 doc-columns 收官（`4d9a7d0`）。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** 三件全在切片面：host 半 `src/kb_proxy.ts` 补 JSON 两 op（`updateChunk`／`reExtractChunk`）＋raw 中继三枚（`documentFile`／`shotFrame`——GET；`videoStream`——GET＋Range 流式；照 `downloadDocument` 模式抽共用件，方法闸按 op 放行 GET）；client 半 `ChunkDrawer` 段补三件（渲染态＝宿主 `MarkdownText`＋预取 blob 图片映射；播放器＝原生 `<video>` 直载相对代理 URL；编辑/重抽＝两 op＋轮询并入重抽在飞源）。deer-flow 零改动（端点全既存）。

**硬约束（spec 已定，不许自行放松）**：

- **照工作台**（承 T3）：文案逐字、形态逐件；创新一律登记（spec §6）。
- **D 决定**：D1（渲染承载）＝甲（已拍 10-16）；Task 1–4 全解锁（先 Task 1，Task 2 随其后）。
- **数据缝（承 T3）**：零新字段、零新后端（Task 0 真样已核）；缺→停下待裁。
- **桌面端铁律**：改 `client.js` 验收须整重启（模块代体检法）。
- **scope fence（本对不做）**：丙＝卡片管理面；wiki 正文渲染维持登记（渲染器届时可复用，另案）；重抽确认弹层不做（有意偏离面，点名才加）。

**Global Constraints:**

- 分支：插件仓（dsh-harness-rag）；每 Task 落地随手提交（英文 Conventional）；deer-flow 零代码。
- **每 Task 的 `**实测**` 行必须回填**（探针输出/真跑结论/提交哈希）。
- **插件侧验证**（同 A 对口径，有意不做单测）：`node --check`＋冒烟回归（仓外 `client-load-check.mjs`）＋桌面端整重启真跑。
- 宿主件优先：渲染器/两态钮/图标能直用宿主件则直用（缺件回退护栏照旧）。

**依赖顺序**：Task 0（只读核实，已毕）→ Task 1（host 半五 op）→ Task 2（渲染切换＋图片通道；候 D1）→ Task 3（视频条＋播放器）→ Task 4（编辑＋重抽）→ Task 5 收口。

---

## Task 0 — 落点核实（只读；已毕）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点＋ D1 判据。

- [x] ① **宿主件实读**：`MarkdownText`（bundle 实读：props `{text,streaming,labels,fileMentions,pathImages,variant}`；raw HTML 关；图片词表 `http(s)/blob/data`＋`dsh-app://app/api/file?`；相对引用→`pathImages.resolve`→再筛词表；失败渲染 alt）；`SegmentedControl`（`{id,value,options[{value,label,title}],onChange}`）；外壳链路（`protocol.handle`→`forwardWebRequest` 透传 Range/206/流式）。
- [x] ② **插件面现状**：ChunkDrawer 段结构实读（行渲染 `:3671`；头部 `:3785`；滚动体 bodyRef；轮询谓词 `:3499`）；样式族 `:1943+`；视频字段实样（真载荷：`media/shot_index/start_ms/end_ms/frame_url` 全在）。
- [x] ③ **端点面实证**：PATCH／re-extract／shot frame／video stream（Range 206）／files 全既存；帧 200 `image/jpeg`；409 语义＝文档非终态。
- [x] ④ **工作台行锚＋文案全表**：`chunk-card.tsx`／`chunk-drawer.tsx` 行锚；zh/en `chunkDrawer` 全键回收（编辑族/时间码族/播放器族/图片不可用）。
- [x] ⑤ **编辑/重抽后端语义**：update＝重嵌向量＋token 重算＋`last_edited_at`（embed 先行、同一 point 覆写）；re-extract＝五步级联（抽取走「当前（可能已改）文本」、置 `extract_status=pending` ⇒ 插件现有轮询谓词即覆盖）；409 互斥＝文档非终态。**零「停下待裁」**。

**实测**（Task 0，2026-10-16，五格全核——起跑前侦察一次过；证据：bundle 段读、真载荷/curl 206、壳源码行锚）：
- 缩略图/播放器直载通道＝相对 URL `PROXY_ROUTE + '/shotFrame?…'`（页 origin `dsh-app://app` 全量 forward；`<video>` Range 自动协商经壳透传）。
- 图片（渲染态）＝词表拒 `dsh-app:` ⇒ 走「预取代理→blob→`pathImages.resolve`」；blob 生命周期随卡挂载/卸。
- 播放器落位＝抽屉头行下方固定区（照工作台 sticky 头语义；插件头 `flex-shrink:0` 已核）。

---

## Task 1 — host 半（kb_proxy：五 op）

> 动到的文件：`src/kb_proxy.ts`（＋探针随扩）。
> **验收对应**：spec §1（三件的 host 面）＋§3 端点面。

- [x] **JSON 两 op**：`updateChunk`（PATCH `${kbPath}/chunks/{chunk_id}` body `{text}`——轻守卫：body 对象＋text 字符串；字段级契约归服务端 422）／`reExtractChunk`（POST `${kbPath}/chunks/{chunk_id}/re-extract`）。
- [x] **raw 中继三枚**（照 `forwardDownload` 抽共用件）：`documentFile`（GET；query `kb_id/doc_id/ref` → `/documents/{docId}/files/{ref 分段编码}`）／`shotFrame`（GET；query `kb_id/doc_id/shot_index` → `/documents/{docId}/shots/{index}/frame`，缓冲中继即可——JPEG 小件）／`videoStream`（GET＋`range` 头透传；响应 status 与 `content-type/content-range/accept-ranges/content-length` 原样、体流式 `Readable.fromWeb` 不回读）。
- [x] **方法闸**：handler 现「POST only」→ relay 三枚放行 GET（JSON 与 upload/download 维持 POST；GET 打 JSON op 仍 405）。
- [x] **门禁**：`node --check`＋探针（`probe-menu` 扩：五 op 路由存在性/方法闸）＋真栈 curl（206/416/400 与透传头）。
**实测**（Task 1，2026-10-16，实现＋门禁）：
- **落点**：`src/kb_proxy.ts`——buildOps 补 `updateChunk`／`reExtractChunk`；`RelaySpec`（`{path,range?}`）＋`relayAddress`＋`rawRelays` 三枚（shotFrame `parseInt≥0` 守卫；videoStream `range:true`）＋`forwardRelay`（503 未配／400 参数不合格／502 不可达；GET-only；status＋`content-type/content-length/content-range/accept-ranges` 原样、`cache-control: no-store`、体 `pipeline(Readable.fromWeb)` 流式静默断连）；handler 先判 relay 名（GET）再落 POST 闸。
- **门禁**：`node --experimental-strip-types --check` 过；`probe-menu` 扩 section 7 后 **11/11 PASS**（mock 全绿：updateChunk passthrough＋text 守卫 400、reExtract 409 透传、两 GET 中继 ref 分段编码/字节/守卫 400、videoStream Range 206 头透传＋双向方法闸 405）。
- **真栈**（`relay-live.mjs`，代理直连 :8001 auth-off，真件＝journey-draft.mp4）：**5/5 PASS**——videoStream Range `bytes=0-1023` → **206**＋`content-range: bytes 0-1023/4625372`＋`accept-ranges: bytes`；越界 Range → **416**（`bytes */4625372`）透传；shotFrame #2 → 200 image/jpeg 实体 20199B（FFD8 魔数核）；shotFrame #9999 → 404 原样透传（`{"detail":"Keyframe not found"}`——按设计后端体直通，非桥错误封套）；documentFile 未存 ref → 404 透传；`GET listKbs`／`POST shotFrame` 双向 405。真栈无实图文档（两库扫描零 `images/` ref）⇒ documentFile 同件同路（同一 `forwardRelay`）以 shotFrame 实体取证，实图消费留 Task 2 真跑。

## Task 2 — 渲染切换＋图片通道（client；候 D1＝甲）

> 动到的文件：`client.js`（切片面）＋内联字典（`chunk.viewRendered/viewRaw` 等键）。
> **验收对应**：spec §1-1＋§4-1（渲染条）。

- [x] **两态钮**：卡片头右「渲染/原始」（宿主 `SegmentedControl` 两段 icon〔宿主 icon 族 Eye/Code 最近邻〕；缺件回退自绘两钮照工作台 h-7 形态）；默认渲染；编辑态恒原始；切换钮编辑态隐藏（照工作台）。
- [x] **MarkdownText 接入**：渲染态＝`MarkdownText text=chunk.text variant=body`；缺件回退 pre-wrap（不崩）。
- [x] **图片通道**：文本内相对引用（inline image dest＋引用定义）扫描 → `documentFile` 相对 URL 预取 → blob URL 映射 → `pathImages={resolve}`；卸载/切换撤销 revoke；失败→映射缺失→alt（工作台虚线框差登记 spec §6）。
- [x] **行态承载**：优先行渲染抽子件（卡自治态照工作台）；若抽件牵动面大，退回抽屉级 keyed 映射（切库/切文档复位）。实现时定，评审取简。
- [x] **门禁**：`node --check`＋冒烟（渲染/原始两态 SSR／图片占位→就绪／缺件回退）＋整重启真跑。
**实测**（Task 2，2026-10-16，实现＋门禁；真跑已过 10-18）：
- **落点**：`client.js`——`HostMarkdownText`／`HostSegmentedControl` 两常量（缺件回退）；dict 双加 `chunk.viewRendered/viewRaw`＋`markdown.*` 六键（逐字照宿主 locale：复制/复制成功/代码块/自动换行/取消自动换行/脚注）；`dshCodeIcon`（宿主最近邻 `IconInspectOutline`＝CodeBrackets 真值 `</>`；缺件回退工作台同款 lucide Code2）；helpers 三枚（`markdownLabelsFor` 照宿主 markdownLabels 六键／`relativeImageRefs` 扫描／`documentFileRelayUrl` 照工作台 documentFileUrl）；`ChunkViewToggle`＋`ChunkRow` 抽件（行内联渲染退役；卡自治视图态＋blob 映射；抽屉仅传数据回调）。CSS：`.hrag-chunkrow-view/.hrag-viewseg*`（两态钮回退）＋`.hrag-chunkrow-render > div …` 紧凑覆盖（宿主文档级排版收进行内 12px 档；照工作台 chunk-card 边距 p/列表 6、li 2、pre 8、引用 6；`> div` 抬特异度；li 用 `:not(:first-child)` 压宿主同名两档规则）。
- **实现要点**：视图态默认 rendered、逐卡自治（照工作台）；渲染态且宿主件在才预取（相对＝无 scheme、非 `/`；inline 含 `<>` 角括号形＋引用定义两路，去重）；预取走 `documentFile` GET 相对 URL → blob → `URL.createObjectURL` → resolve 同步查表；**pathImages 身份随 blob 到达换新**（MarkdownText 为 memo，同身份渲不进新映射）；切原始/文本变更/卸载即 revoke＋清映射；失败（404/网络）落 alt。缺件（无 MarkdownText）不预取、恒 pre-wrap。
- **门禁**：`node --check` 过；冒烟扩两段（helpers 9 例＋CSS＋段控/Stub 契约；happy-dom 真挂载全链）——默认跑 **66 PASS 全绿**（新增 `②-batch chunk render helpers`＋`②-batch chunk row render + image channel (placeholder -> blob -> revoke)`）；**缺件二跑**（`SMOKE_HOSTLESS=1`）**全绿**（新增 `②-batch chunk row hostless fallback (pre-wrap + self-drawn toggle)`——撤宿主两件：恒 pre-wrap、自绘两钮 aria 对、零预取）。冒烟新增宿主件契约桩（MarkdownText 挂 `data-labels`/`data-path`；SegmentedControl 受控桩）；`URL.createObjectURL/revokeObjectURL` 记账桩验生成/撤销配对（切走撤销、回渲重取、卸载清账）。
- **真跑（10-18 他手验，桌面整重启）已过**：渲染态/原始态切换、图片通道（测试10.pdf 切片内图片直显）均正常。

## Task 3 — 视频镜头条＋播放器（client）

> 动到的文件：`client.js`（切片面）＋内联字典（时间码族/播放器族键）。
> **验收对应**：spec §1-2＋§4-1（视频条）。

- [x] **镜头条**：视频 chunk 行上方：缩略图 `h-9 w-16 rounded border`（`loading=lazy decoding=async`；失败→虚线缺框〔`ImageOff` 宿主 icon〕）＋`#K · mm:ss–mm:ss` 等宽芯片＋复制钮（宿主 `writeClipboard` 有件则直用；成功/失败 toast 照工作台文案）。
- [x] **单例播放器**：抽屉头行下方固定区（仅 `items.some(media==='video')`）：`<video controls preload=metadata src={PROXY_ROUTE+'/videoStream?…'}>`（`aspect-video max-h-56 w-full rounded bg-black`）＋提示行（`playerHint`）；ref 暂存补 seek（focus 早于挂载）。
- [x] **交互**：点缩略图/芯片→`currentTime=start_ms/1000`＋play；focus 定位→暂停 seek（不惊喜自动播）；`onTimeUpdate`→命中镜头行琥珀环（不抢滚动，只改边框）。
- [x] **门禁**：`node --check`＋冒烟（镜头条渲染/缺帧降级/高亮类）＋真浏览器几何＋整重启真跑（真视频 seek）。
**实测**（Task 3，2026-10-16，实现＋门禁；真跑已过 10-18）：
- **落点**：`client.js`——`HostWriteClipboard` 常量（宿主件，缺件回退 navigator.clipboard）；dict 双加六键（playShot/copyTimecode/copiedTimecode/copyTimecodeFailed/frameMissing/playerHint，逐字照工作台）；图标 `dshCopyIcon`（宿主 IconCopyOutline；缺件回退 lucide Copy 两形）＋`dshImageOffIcon`（宿主无件·直用工作台同款 lucide ImageOff 六形）；纯函数四枚（`shotFrameRelayUrl`／`videoStreamRelayUrl` 直载相对 URL；`formatShotTimecode`／`formatTimecodeRange` 照工作台 format.ts 逐式）；`VideoShotBar`（缩略图 64×36＋等宽芯片整体 seek 触发器；缺帧/onError 双路降级虚线缺框；复制钮 iconbare＋toast 双语）；`ChunkRow` 加 `shotActive`/`onSeekShot`（镜头条顶置行首；琥珀 class 并挂）；抽屉加 `videoRef`＋暂存 seek＋`seekShot`（seek+play，play 承诺吞拒）＋`handleTimeUpdate`（~4Hz、仅变化 setState）＋focus 暂停 seek＋`hasVideo` 门＋面板固定播放器块（头下、体上；不随滚动）＋切文档复位。CSS：`.hrag-shotbar*`（thumb/missing 64×36）、`.hrag-chunkrow-shot-active`（琥珀 box-shadow 环＝只改边框不占布局）、`.hrag-drawer-video*`（16/9＋max-h 224＋提示行 11px）。
- **实现要点**：缩略图/视频流均**直载**相对代理 URL（原生 img/video 经壳全量转发；非 blob 预取通道——词表只拦 MarkdownText 内图片）；`hasVideo` 由 items 同帧算出、随轮询更新；timeupdate 命中判据 `start_ms ≤ ms < end_ms`（照工作台）；focus 早于播放器挂载时暂存秒数、`attachVideo` 回调补 seek。
- **门禁**：`node --check` 过；冒烟新增两段——纯函数 6 例（时间码 0/取整/时进位/区间 en dash＋两 URL 逐字）；happy-dom 真挂载全链（镜头条只挂视频行、缩略图 relay URL＋lazy、缺 frame_url 降级＋缩略图 onError 再降级、播放器 src/controls/preload/提示行、点击 seek `currentTime=5`＋play 恰一次、timeupdate 命中行恰一条琥珀、focus 复挂载暂停 seek 且 play 不增）。默认跑 **68 PASS 全绿**；缺件二跑全绿。**真视频 seek（10-18 他手验，整重启）已过**：镜头条缩略图/时间码、点击定位播放、播放高亮均正常。

## Task 4 — 切片编辑＋重抽（client）

> 动到的文件：`client.js`（切片面）＋内联字典（`editHint/reExtractCost/reExtracting/reExtractHint` 等键）。
> **验收对应**：spec §1-3＋§4-1（编辑/重抽条）。

- [x] **就地编辑**：编辑钮→Textarea（min-h-100）＋`editHint`＋保存/取消（空文本禁、保存中禁；重抽中禁入编辑）；保存→`updateChunk`→toast「切片已更新」→reload（行元数据刷出「已编辑」徽章/新 tokens）。
- [x] **重抽**：按钮 title＝「将消耗 1 次 LLM 抽取调用」；在飞/`extract_status==='pending'`＝StateDot 转圈＋「抽取中…」＋提示行「正在抽取实体，请稍候…」；每文档互斥（在飞禁余卡）；成功 toast「重抽取完成，实体已更新」＋reload；409→警告「文档正在处理中，请稍后重试」。
- [x] **轮询**：抽屉条件轮询谓词追加「重抽在飞」源（照工作台 `:177-182`；重抽路径服务端置 pending 亦覆盖，双保险）。
- [x] **门禁**：`node --check`＋冒烟（编辑态/重抽态/互斥渲染）＋整重启真跑。
**实测**（Task 4，2026-10-16，实现＋门禁；真跑已过 10-18）：
- **落点**：`client.js`——dict 双加十二键（编辑族：edit/save/editHint/updateSuccess/updateFailed/reExtract/reExtractCost/reExtracting/reExtractHint/reExtractSuccess/reExtractFailed/reExtractProcessing，逐字照工作台）；`ChunkRow` 加编辑三态（isEditing/editedText/isSaving；保存失败停留编辑态＝工作台语义）＋重抽三态渲染（StateDot 12＋「抽取中…」/「重新抽取」＋费用 title＋提示行）；动作族迁入页脚（照工作台卡页脚：度量左、动作右 margin-left:auto、编辑态整页脚隐）——**删除钮随迁**（原顶行 outline 小钮退役，与编辑/重抽同族入页脚）；抽屉加 `reExtractingChunkId`（每文档互斥）＋`handleEditChunk`（成功 toast＋reload、失败红字 toast 后 rethrow）＋`handleReExtractChunk`（成功 toast＋reload；409 含 `being processed` → 中性色警告文案）＋轮询谓词第二源＋切文档复位。CSS：页脚列向重构（footrow）＋动作族（图标 12px）＋编辑域（等宽 min-h 100＋focus 边色）＋提示行。
- **实现要点／两处口径裁定**：①工作台 `disabled={isReExtracting ?? reExtractDisabled}` 的 `??` 令 `reExtractDisabled` 恒失效（`false ?? x = false`）——按卡 prop 文档意图实现 **OR**（在飞禁余卡），已在冒烟断言钉死；②宿主 Toast 无 warn 档（仅常规/错误两色）⇒ 409 警告走**中性色** toast（工作台为黄色 warning），登记 spec §6。
- **门禁**：`node --check` 过；冒烟新增一段（happy-dom 全链：编辑开态 Toggle/页脚隐＋空文本禁存＋取消复位；保存成功 body 逐字＋toast「切片已更新」＋退出编辑＋reload 刷「已编辑」；保存失败红字 detail＋停留编辑态；重抽在飞 StateDot＋标签＋费用 title＋提示行＋**余卡禁**；在飞即武装轮询（fetch 计数）+落定自停；放行成功 toast「重抽取完成，实体已更新」；409 中性文案「文档正在处理中，请稍后重试」）。既有小件批页脚段断言随动作族入页脚更新（两行皆页脚、动作族逐字）。默认跑 **69 PASS 全绿**；缺件二跑全绿。**整重启真跑（10-18 他手验）已过**：编辑保存（toast＋「已编辑」）、重抽（转圈→完成）、编辑域随内容增高（补修二后复验）。
- **10-18 补修二（编辑域高度）**：真跑发现编辑态内容锁在 100px 内滚动，与工作台不一致——根因＝宿主 `Textarea` 基类带 `field-sizing-content`（`min-h-[100px]` 只是下限），插件只抄了下限。修法：`.hrag-chunkrow-editarea` 补 `field-sizing: content`＋`growTextarea` 老内核回退（`CSS.supports` 判断，不支持时按 `scrollHeight` 撑开，ref 挂载＋输入两路）。冒烟加 CSS 断言（`field-sizing: content`）；默认＋缺件两跑全绿；随本对定稿一笔落地。

## Task 5 — 收口（门禁汇总＋销定＋提交链）

> 动到的文件：本对两件（spec/plan）＋T3 plan（审计节补销：C1③／C1④〔附注〕／C2①／C2④）＋步骤记录。
> **验收对应**：spec §4-3／§4-4。

- [x] **门禁汇总**（自动项全绿＋**真跑整批已过**，见实测）；
- [x] **销定**：T3 plan 审计节 C1③／C2①／C2④ 行补销（「已实施（…，chunk-items 对）」）；步骤记录同步；
- [x] **提交链**：本对定稿一笔（英文 Conventional；10-18 他令「提交一下吧」）。

**实测**（Task 5，2026-10-16，销定已落；**真跑已过 10-18**；定稿一笔落地）：
- **门禁汇总（自动项）**：`node --check` client.js ✓＋`node --experimental-strip-types --check` kb_proxy.ts ✓；`probe-menu` **11/11 PASS**（含 Task 1 五 op）；`relay-live` **5/5 PASS**（真栈 :8001：206/416/404 透传＋JPEG 实件）；冒烟默认 **69 PASS 全绿**＋缺件二跑（`SMOKE_HOSTLESS=1`）全绿。**真跑（10-18 他手验，桌面整重启：Tasks 2–4 一并）已过**——渲染/原始、图片、镜头条/真视频 seek、编辑/重抽（含真 LLM 抽取调用）；409 为可选项，未专门造。
- **销定**：T3 plan 审计节四处补销（C1③ 补销＋C1④ 附注「重抽在飞源已补」＋C2① 补销＋C2④ 补销，均带口径差异注记）；步骤记录（`docs/2026-10-11-plugin-porting-plan.md` ②档批 bullet）同步（乙对 Task 0–5 全落＋真跑已过）。
- **提交链**：全对未提交（候定稿令；前笔 tip＝`4d9a7d0`）。

---

## 提交链（滚动记实）

- [x] 定稿一笔（10-18 他令提交；英文 Conventional）。**未推**（仓暂无 remote；前笔 tip＝`4d9a7d0`）。
