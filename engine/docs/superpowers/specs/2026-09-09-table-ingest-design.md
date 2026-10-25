# 表格文档入库设计规格书（2026-09-09）

状态：设计冻结（待开工）。对应实施计划：`docs/superpowers/plans/2026-09-09-table-ingest.md`。
代码注释引用本文件采用「spec 2026-09-09 §N」格式。

## §1 背景与根因

DeerFlow 知识库当前对「表格格式文档」是**假支持 + 真损坏**：

1. **`.csv` 名义支持、实际被打碎**：`parser.py` 把 `.csv` 列入 `_LOCAL_READ_SUFFIXES`
   做原始文本直读（`_read_local_text`），但 `chunker.py` 是**按 H1/H2 标题切片**的。表格
   无标题 → 整张表被当成单段落 → 超 `MAX_CHUNK_TOKENS=1024` 走 `_hard_split_tokens`
   **按 token 硬切**：表头（列名）在首块之后全部丢失、数据行被从单元格中间截断。检索
   质量近乎为零。
2. **Excel（`.xlsx`/`.xls`）完全不支持**：不在 `SUPPORTED_UPLOAD_SUFFIXES`；
   `backend/pyproject.toml` 无任何表格库（pandas/openpyxl/calamine/duckdb 均无）。
3. **PDF/Word 内嵌表格同样受损**：MinerU 把表格输出进 `full.md`，但这些表格流经同一个
   按标题切片的 chunker，被同样硬切打碎。**真实复现（2026-09-09 实测门取证）**：
   `3.java并发.docx` 的 chunk `db10e8f74d794a64b39ddc81ba23f2b5#0011` `token_count` 恰为
   1024（= `MAX_CHUNK_TOKENS`），HTML 表被 `_hard_split_tokens` **从 `<td><p>` 标签中间截断**；
   续块 `#0012` 只剩 53 token 的悬空 HTML 尾巴，表头（分类维度/具体类型/核心特征/毕设常见示例）
   **仅存于 #0011**。

**唯一切片咽喉**：`worker.py:_reparse_and_chunk` 第 455 行 `chunk_markdown(markdown, doc_id)`。
文本、CSV、Excel、PDF 内嵌表格全部经此。在此做表格感知，三类来源一并受益，**worker 零改动**。

## §2 范围与能力边界

- **来源（in scope）**：独立表格文件 `.csv` / `.tsv` / `.xlsx` / `.xls`，**以及** PDF/Word
  经 MinerU 解析出的内嵌表格。两类都要。
- **能力（in scope）**：**仅检索**。表格行抽取成「行卡」进入现有 vector / graph / wiki
  三通道，语义检索返回相关行；行卡即普通 chunk，`chunk_id` 沿用 `{doc_id}#NNNN`。
- **非目标（out of scope）**：text-to-SQL、按列过滤 / 聚合 / 排序等结构化问答；表格数据的
  可查询视图。若未来需要，另立 spec（本设计的存储层不预留 SQL 引擎接口）。

## §3 架构总览（与视频入库的异同）

对齐视频入库先例（spec 2026-09-08）的核心思想：**新模态 → 抽取成文本卡 → 复用现有三通道
零改动**。但表格模态**显著更轻**，因为表格解析是快速、确定性的，不存在视频那种慢速、多阶段、
可恢复的媒体抽取：

| 维度 | 视频入库（2026-09-08） | 表格入库（本设计） |
|---|---|---|
| 新 store 表 | `video_shots`（媒体侧字段 + resume 状态机） | **无**（行卡全量落 `chunks`，无媒体侧结构数据） |
| path_status 腿 | 扩 `{asr,segment,caption}` 三腿 | **不变**，仍 `{vector,graph,wiki}` |
| worker 分支 | `_is_video_path` → `_run_video_legs`（六腿编排） | **无新分支**，走现有文本腿 `_reparse_and_chunk` |
| resume | 只跑 pending 镜头 | **不需要**（解析快、幂等重跑即可） |
| 进度权重 | asr30/segment5/caption35/materialize5 → 75→100 | **不变**，文本 base0/span100 |
| 抽取产物 | 镜头卡（场景/口述/屏幕文字三段冻结模板） | 行卡（表头锚定 + 行组，见 §7） |
| 新增依赖 | ffmpeg/funasr/PySceneDetect/PaddleOCR（延迟 import） | `python-calamine`（延迟 import，仅 Excel 需要） |

**数据流**（冻结）：

```
上传 .csv/.tsv/.xlsx/.xls  ─┐
                            ├─► parser 归一为 GFM 管道表（§5）─┐
PDF/Word ─► MinerU full.md ─┘   （HTML <table> → GFM 归一）    │
                                                              ▼
                                        chunk_markdown 表格感知切片（§6）
                                                              │  行组 chunk，每块重复表头
                                                              ▼
                                        insert_chunks（chunk_id={doc_id}#NNNN）
                                                              │  零改动
                                                              ▼
                                        现有 vector / graph / wiki 三通道
```

## §4 配置门控与后缀集

镜像 `rag.video` 的门控纪律（`app_config.py:141-196`）：

- **`RagTableConfig`**（新增，`app_config.py`）：
  - `enabled: bool = False` —— Excel/TSV 上传的主门控（默认 off，暴露面为零）。
  - `max_size_mb: int`（`ge=1`）—— 表格文件体积上限，门口即拒（防巨型电子表格行爆炸）。
  - `card_mode: Literal["markdown","linearized"] = "markdown"` —— 行卡正文序列化模式
    （§7），`linearized` 为召回质量消融实验用，非生产默认。
  - 挂载：`RagConfig.table: RagTableConfig`（紧邻 `video` 字段）。
- **后缀集**（`parser.py`）：
  - `TABLE_UPLOAD_SUFFIXES = frozenset({".xlsx", ".xls", ".tsv"})` —— **独立冻结集**，
    文本集 `SUPPORTED_UPLOAD_SUFFIXES` 字节不动（`.csv` 已在文本集，其*处理方式*改变但
    成员身份不变）。
  - `table_ingest_enabled()` 读 `rag.table.enabled`，配置加载失败降级为 off（门口不收窄）。
  - `supported_upload_suffixes()` 在门控开启时并入 `TABLE_UPLOAD_SUFFIXES`（单一源，
    `/supported-formats` 端点与上传门共用，二者不会漂移）。
- **门控边界（冻结）**：
  - `.csv` **不门控**（本就在文本集）；其解析从「原始文本 dump」升级为「表格感知」（§5）。
    即使 `rag.table.enabled=false`，`.csv` 也走表格感知切片——这是修复 §1 的损坏，属正确性
    修正，不是新功能暴露。
  - `.tsv` 免依赖，随门控并入（与 `.csv` 同为分隔文本，逻辑一致）。
  - `.xlsx`/`.xls` 需 `python-calamine`，随门控并入；缺库时解析降级为清晰错误（§8）。

## §5 解析归一（parser 层）

**冻结契约：parser 保证输出给 chunker 的表格恒为 GFM 管道表**（`| a | b |` + `| --- | --- |`
分隔行）。chunker 只需处理一种表格语法。

- **分隔文本 `.csv`/`.tsv`**：新增 `_parse_delimited(path)`：
  - 编码复用 `_read_local_text` 的 UTF-8 严格 → GBK 回退（legacy Windows），剥离 BOM。
  - `.tsv` 固定 tab 分隔；`.csv` 用 `csv.Sniffer` 嗅探逗号/分号（回退逗号）。
  - 用标准库 `csv` 逐行解析 → 首行为表头 → 输出 GFM 管道表。
  - `parse_document` 把 `.csv`/`.tsv` 从 `_read_local_text` 原始直读改路由到 `_parse_delimited`
    （`parser.py:322-323`）。`.md`/`.markdown`/`.txt` 仍走原始直读不变。
- **Excel `.xlsx`/`.xls`**：新增 `_parse_excel(path)`：
  - **延迟 import** `python_calamine`（缺失即降级抛清晰错误，不在模块顶层 import——对齐视频
    PySceneDetect/funasr 延迟 import 纪律）；blocking 读取经 `run_file_io` 落线程池。
  - 每个 sheet → 一段 `## {sheet_name}\n\n<GFM 管道表>`。sheet 名进 `##` 标题 → chunker
    自然把 sheet 名写入该表所有行卡的 `heading_path`（§6）。
  - 空 sheet 跳过；首行作表头；多 sheet 顺序拼接为单个 markdown 文档。
- **MinerU 内嵌表格归一**：新增 `_normalize_tables_to_gfm(markdown)`，仅在 MinerU 分支
  （`parse_document` 非本地分支，`model_version="vlm"`）调用：
  - 若 `full.md` 含 HTML `<table>...</table>`，转为 GFM 管道表（`<tr>`→行、`<td>/<th>`→单元格；
    `rowspan`/`colspan` 合并单元格**扁平化**：跨行值下沉填充或留空，跨列值取首列余列空——
    检索型行卡只需扁平行，不保结构）。
  - 若已是 GFM 管道表，归一器为幂等 no-op（安全网）。
  - **实测门结论（Task 0，2026-09-09 已跑，冻结）**：MinerU 云 API v4 + `model_version="vlm"`
    （即 `worker._reparse_and_chunk` 的默认路）**输出 HTML `<table>`，不输出 GFM 管道表**。
    证据：自制含表格 PDF 两次实跑（`pr-build/t0-mineru-table-gate/`）+ live DB 中 7 张历史
    表格（docx 路，2026-08 解析），GFM 分隔行/管道行命中数**恒为 0**。→ **归一器是必需路径，
    不是可选安全网**；no-op 分支只为「已是 GFM」的输入（用户 authored `.md`）保留。
  - **归一器必须吃下两种实测形态**（冻结）：
    - 形态 A（PDF 路）：`<table><tr><td>Region</td><td>Q1</td></tr>…</table>` —— 无
      `<thead>`/`<tbody>`、无 `<th>`，**表头就是首个 `<tr>`**；单元格无嵌套标签；整表压在
      **一行内**（无内部换行）。
    - 形态 B（docx 路）：`<table><thead><tr><th><p><strong>数据类型</strong></p></th>…</tr></thead>
      <tbody><tr><td><p>…</p></td>…</tr></tbody></table>` —— 单元格内嵌 `<p>`/`<strong>`，
      且**一个单元格可含多个 `<p>`**（实测 `<th><p>Private</p><p>扑瑞沃特</p></th>`）。
    - 故单元格取文本规则：剥内嵌标签 → 多段 `<p>` 以**空格**连接（**绝不插入换行**，否则破坏
      GFM 单行行结构）→ HTML 实体反转义 → 空白折叠。表头判定：`<thead>`/`<th>` 优先，缺失时
      回落首 `<tr>`。
  - **行宽必须补齐到表头列数**（冻结）：实测 `colspan="3"` 行只输出 **1 个 `<td>`**，而表头 3 列
    （ragged rows 真实存在）。归一器须按表头列数**补空/截断**每行，否则输出不是合法 GFM，前端
    streamdown 不渲染为真表格，§8 的「零改动」前提即破。
  - **合并单元格两种表达都存在**（冻结）：显式属性（PDF 路实测出 `rowspan="2"`、`colspan="3"`）
    与**隐式空单元格**（docx 路同一张表出现 `<tr><td></td><td>可中断锁</td>…`，合并区写成空
    `<td>` 而无 span 属性）。扁平化规则须对两者都健壮：有属性按属性展开，无属性按字面空值处理。

## §6 表格感知切片（chunker 层，核心）

改造 `chunk_markdown` 管线（`chunker.py:148-169`），保持 `chunk_id={doc_id}#{index:04d}`、
`chunk_index` 全文档连续（散文块与表格块共用一套递增序号）。

- **表格检测**：`_split_by_headings` 增强——识别连续 GFM 管道表块（行匹配 `^\s*\|.*\|\s*$`，
  次行为分隔行 `^\s*\|[\s:|-]+\|\s*$`），**代码 fence 内的 `|` 不误判**（复用现有 `in_fence`
  状态）。每个块标记 `is_table`。表块作为**原子块**保留，不进 `_subdivide_oversized` 的段落
  打包 / `_hard_split_tokens` 硬切路径（这正是要修的 bug）。
- **残留 HTML `<table>` 原子块防御**（Task 0 实测后由「假设兜底」升为**必需兜底**）：归一器已是
  MinerU 路的必经步骤（§5 实测结论：v4+vlm 恒出 HTML），但遇到未覆盖的表形态（嵌套表、异常
  标签闭合）仍可能残留 HTML。此时 chunker 须把整段 `<table>…</table>` 当**原子块**保留，绝不进
  `_hard_split_tokens` 从标签中间截断（该损坏已在 live DB 复现，见 §1.3）；残留块不做行组切分
  （无 GFM 表头可锚），整块入向量。
- **行组切片**：新增 `_chunk_table_block(path, header, delimiter, rows, max_tokens, card_mode)`：
  - **小表**（表头 + 全部数据行 ≤ `max_tokens`）→ **单 chunk**，整表保留（最常见情形）。
  - **大表** → 贪心按数据行打包成组，使 `表头 + 分隔行 + 组内行` ≤ `max_tokens`（目标 512±256，
    与散文同口径）。**每个行组 chunk 都重复表头 + 分隔行**——列语义在任何一块都不丢失，这是
    相对现状（硬切丢表头）的核心修复。
  - **退化用例（冻结）**：单行 + 表头已 > `max_tokens`（超宽表）→ 该行**整行保留、不中切**
    （容忍轻微溢出）。绝不重蹈 `_hard_split_tokens` 从单元格中间截断的覆辙。
- **溯源说明行**：当且仅当一张表被拆成多个行组 chunk 时，每块正文顶部加一行说明
  `表格：{sheet 名或文档名}（第 {起}-{止} 行 / 共 {N} 行）`，令每块携带 provenance（对齐视频
  镜头卡「冻结卡正文」思路）。整表单块时不加（避免噪声）。
- **heading_path 规则**：
  - Excel sheet：`## {sheet_name}` → `heading_path=[sheet_name]`（由 `_split_by_headings` 现有
    标题逻辑自然产生）。
  - 内嵌表：继承表格前方最近的 H1/H2 路径（chunker 现有 `path` 跟踪，零额外逻辑）。
  - CSV/TSV 单表：`heading_path=[]` 或以文档名为单元素（Task 4 冻结其一，倾向 `[]` 保持与
    无标题散文一致，溯源信息已由说明行承载）。
- **card_mode 消融**：`card_mode="linearized"` 时，行组内每行序列化为 `列名: 值 | 列名: 值`
  自然语言句子（而非 GFM 表格行）；`markdown`（默认）保持 GFM 表格。两模式都重复表头/列名。
- **散文回归**：非表格块走原 `_subdivide_oversized` + `_merge_small_blocks` 路径，行为逐字不变
  （Task 4 必带散文回归用例守现有行为）。`_merge_small_blocks` 只在**原子块**间合并，表块已
  原子，不会被拆或与散文合并致表头丢失。

## §7 行卡正文契约（冻结模板）

嵌入文本 = 行卡正文（对齐视频 spec §3「卡正文即嵌入文本」契约）。**markdown 模式**（默认）
一个行组 chunk 的正文：

```
表格：{sheet/文档名}（第 {起}-{止} 行 / 共 {N} 行）    ← 仅多块拆分时出现
| {列1} | {列2} | {列3} |                              ← 重复表头
| --- | --- | --- |                                    ← 分隔行
| {值} | {值} | {值} |                                 ← 组内数据行
| {值} | {值} | {值} |
```

**linearized 模式**（消融）：

```
表格：{sheet/文档名}（第 {起}-{止} 行 / 共 {N} 行）
{列1}: {值} | {列2}: {值} | {列3}: {值}
{列1}: {值} | {列2}: {值} | {列3}: {值}
```

- markdown 模式的正文是合法 GFM 表格 → 前端 `ChunkCard` 的 `MarkdownContent`（streamdown，
  内含 remark-gfm）**原生渲染为真表格**，零前端改动（§8）。
- 溯源说明行是正文的一部分（进向量），因其携带 sheet/行区间语义，对「XX 表第几行」类查询有益；
  若实测污染向量，可在 card_mode 增第三档剥离（本期不做，留观察）。

## §8 前端表面层（近零改动）

- **文件类型徽章**：`file-type-badge.tsx` 已有 `sheet` 类型（绿色表格图标），`KIND_BY_SUFFIX`
  已覆盖 `.xls`/`.xlsx`/`.csv`/`.numbers`/`.et`（第 46-48 行）——**仅需补 `.tsv: "sheet"` 一行**。
  可选：`MIME_SPECS` 补 sheet 拖拽 accept 项。
- **上传白名单**：`supported-formats.ts` 的 `FALLBACK_SUPPORTED_SUFFIXES` 补 `.xlsx`/`.xls`/`.tsv`
  （后端 `/supported-formats` 端点是真源、门控开启才返回并集；fallback 仅镜像，用于端点未达时
  的客户端守卫）。
- **切片渲染**：`ChunkCard`（`chunk-card.tsx:214-221`）查看态默认 `MarkdownContent` 渲染、可切
  原始文本。markdown 模式行卡是 GFM 表格 → **原生渲染为真表格，零改动**。Task 6 需实测确认
  streamdown 默认 remarkPlugins 含 gfm 表格（若不含则显式加 `remarkPlugins`）。
- **path_status hover**：表格文档仍三腿 `{vector,graph,wiki}`，**无新腿芯片**，前端 hover 不变。

## §9 评测接入与消融

- **golden schema 零改造**：行卡 `chunk_id={doc_id}#NNNN` 匹配 `eval/dataset.py:22` 的
  `_CHUNK_ID_RE = [0-9a-f]{32}#\d{4}`，可直接作为考题 `relevant_chunk_ids` 进 Layer-1 命中率
  计算（对齐视频 Task 11）。
- **最小集成用例**：`test_table_eval.py` —— 真实 store 建 fake 表格 KB（.csv/.xlsx 文档 →
  行卡 chunk，用生产 `chunk_markdown` 组装）→ 跑 `run_layer1_for_kb` + stub searchers →
  断言 ①行卡 chunk_id 过 `add_question` golden 校验 ②recall@k/hit_rate/path_accuracy 有数。
- **card_mode 消融**：`markdown` vs `linearized` 通过 recall-test 对比召回质量（对齐视频
  `card_text_mode` 消融流程）。因 `card_mode` 是 config 项，切换后重跑入库即可 A/B。
- **造题指引**：`backend/docs/table-kb-question-authoring.md` —— 按列值提问型 / 跨行聚合型
  （说明聚合型不可锚定单行卡、属降级语义）/ card_mode 消融对比流程，镜像
  `video-kb-question-authoring.md`。

## §10 冻结决策清单

1. 单一咽喉 = chunker（`worker.py:455`），worker 与检索链路零改动。
2. chunker 只认 GFM 管道表；parser 负责把一切来源归一为 GFM（§5）。
3. 行卡 = 行组 chunk + **每块重复表头** + 多块拆分时的溯源说明行（§6/§7）。
4. `chunk_id={doc_id}#NNNN`，满足 eval golden 正则，零 schema 改造进 L1。
5. heading_path：Excel=sheet 名、内嵌=继承周围标题、CSV/TSV=`[]`（溯源由说明行承载）。
6. Excel 读取库 = `python-calamine`（单依赖覆盖 xlsx/xls/xlsb/ods、轻量、无 pandas），
   延迟 import + 缺失降级，门控 `rag.table.enabled`（默认 off）。
7. CSV/TSV = 标准库 `csv`，无依赖、不门控（`.csv` 已在文本集，处理升级为表格感知）。
8. `rag.table.card_mode`（markdown 默认 / linearized 消融）镜像 `card_text_mode`。
9. **无新 store 表、无新 path_status 腿、无 resume**——区别于视频重子系统。
10. 前端近零改动（sheet 徽章已在、ChunkCard 原生渲染 GFM 表格、端点单一源自动流通）。

## §11 风险登记与实测门

| 风险 | 缓解 |
|---|---|
| ~~MinerU 云 API v4 表格输出 HTML 而非 GFM，内嵌表切片仍被打碎~~ **已实测确认为事实（Task 0，2026-09-09）**：v4+vlm 恒出 HTML `<table>`，GFM 命中 0 | ~~Task 0 实测门~~ **已关闭**；parser `_normalize_tables_to_gfm` 由「安全网」升格为**必需路径**（两形态 + 行宽补齐 + span/空单元格双表达，见 §5）；chunker 仍对残留 HTML `<table>` 做原子块防御（绝不中标签中切） |
| MinerU 对**底纹/反白表头**识别失败 → 表头整行输出为空 `<td></td>`（实测：同一 PDF 加灰色底纹时表头全丢，去底纹后完整） | 归一器/chunker **无法凭空补出丢失的列名**，属上游保真度损失；接受并记录（不为此加启发式猜列名）。表头为空时行卡退化为「无列名行组」，仍优于现状硬切 |
| `python-calamine` 依赖安装/平台轮子问题 | 延迟 import + 缺失降级清晰报错；真实 `.xlsx` 端到端测试标 `skipif`，CI 用 fake 不装重依赖 |
| 超宽表（单行 + 表头 > 1024 token） | 整行保留不中切、容忍轻微溢出（优于现状的中切丢表头） |
| 巨型电子表格行爆炸 → chunk 数暴涨 | 行组按 token cap 打包；`rag.table.max_size_mb` 门口限流；收官实测核对 chunk_count 合理 |
| 行卡重复表头抬高 token 成本 | 表头锚定是检索质量必需；`card_mode=linearized` 提供 A/B；溯源说明行仅多块拆分的表带 |
| HTML 表合并单元格（rowspan/colspan）扁平化丢结构 | 检索型行卡只需扁平行，不保结构；spec §5 冻结扁平化规则（跨行下沉/跨列取首列） |

## §12 代码索引（关键落点）

- `backend/packages/harness/deerflow/knowledge/chunker.py` —— 切片核心（§6）：
  `chunk_markdown:148`、`_split_by_headings:61`、`_hard_split_tokens:91`（表格须绕开）、
  `MAX_CHUNK_TOKENS=1024:24`。
- `backend/packages/harness/deerflow/knowledge/parser.py` —— 归一（§4/§5）：
  `SUPPORTED_UPLOAD_SUFFIXES:45`、`_LOCAL_READ_SUFFIXES:63`、`supported_upload_suffixes:90`、
  `_read_local_text:122`、`parse_document:306`（本地分支 322、MinerU 分支 325-342、
  `model_version="vlm":310`）。
- `backend/packages/harness/deerflow/knowledge/worker.py` —— 咽喉（§1/§3）：
  `_reparse_and_chunk:432`、`chunk_markdown` 调用 `455`、`insert_chunks` payload `456-470`、
  `_is_video_path:76`（表格**不**新增此类分支）、path_status 腿 `306-308`。
- `backend/packages/harness/deerflow/knowledge/models.py` —— `ChunkRow:71-89`（行卡落此，
  **无新表**）；对照 `VideoShotRow:219`（表格不需要类似表）。
- `backend/packages/harness/deerflow/config/app_config.py` —— `RagVideoConfig:141-157`
  （`RagTableConfig` 镜像此）、`RagConfig.video:196`（`table` 字段紧邻）。
- `backend/app/gateway/routers/knowledge_bases.py` —— `/supported-formats:180-187`
  （单一源，**零改动**自动流通并集）。
- `backend/packages/harness/deerflow/knowledge/eval/dataset.py` —— `_CHUNK_ID_RE:22`
  （golden 正则，行卡须匹配）。
- `frontend/src/components/workspace/knowledge/file-type-badge.tsx` —— `sheet` 类型 `27`、
  `KIND_BY_SUFFIX` xls/xlsx/csv `46-48`（补 `.tsv`）。
- `frontend/src/core/knowledge/supported-formats.ts` —— `FALLBACK_SUPPORTED_SUFFIXES:7-20`。
- `frontend/src/components/workspace/knowledge/chunk-card.tsx` —— `MarkdownContent` 渲染
  `214-219`、rendered/raw 切换 `114-116`（GFM 表格原生渲染，零改动）。
- `backend/pyproject.toml` —— 加 `python-calamine`。
