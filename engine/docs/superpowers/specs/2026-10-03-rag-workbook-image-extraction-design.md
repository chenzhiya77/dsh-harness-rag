# RAG 工作簿内嵌图片提取（.xlsx）小对 —— 设计

**Status:** ✅ **已裁（D1=甲 / D2=乙 / D3=甲）** —— 2026-10-03 起草、同日裁定；评审九项已并入（③=甲：caption 落表清洗随本对）。配套 plan：[2026-10-03-rag-workbook-image-extraction.md](../plans/2026-10-03-rag-workbook-image-extraction.md)。

本对一件事：把 **`.xlsx` 工作簿的内嵌图片**接进现有解析→配文链。xlsx 本身就是 zip，图片字节存在文件内（`xl/media/*`，经 drawing 关系挂到工作表）——**没有本地 md 那种「引用文件外资源」的安全问题**（那是 L45 设计上不提取的理由；工作簿图片在文件内，RAGFlow/Dify 都在提取，2026-10-03 核）。提取成 `ParsedImage`（ref `images/…`；按 D2=乙，图链接并入锚点单元格、越界回退 sheet 段尾）后，现配文腿与落盘/展示链生效（仅一处配套小改：caption 落 markdown 前清洗，见 §2.4）：VLM 配文写回图 alt、图片存 `images/` 供 chunk 查看器渲染。动机=RFC v3 L47 现写「工作簿内嵌图片提取待补」；落地后该格升级为「已实现（.xlsx）」（RFC 起草时行号：L47 表行、L355 组合行）。

**相关记录**（市场先例，2026-10-03 源码核）：

- **Dify**（`api/core/rag/extractor/excel_extractor.py`）：**仅 `.xlsx`** 抽图（openpyxl `_images`），图链接**并入锚点单元格文本**；`.xls` 只走文本、不带图。
- **RAGFlow**（`internal/parser/parser/{xlsx,xls}_parser.go`）：`.xlsx` 经 excelize 抽图，位置 `[sheetIdx, row, col]` 插进分段表（另有 mediaBudget 上限）；**`.xls` 不处理图片**。
- **Unstructured**：xlsx 不抽图（前核）。
- 本仓通道 **python-calamine 0.8.2 无任何图片接口**（venv `dir` 核）⇒ 提取只能走 zip+XML 自解析（xlsx=标准 OOXML 结构）。

## 1. 问题

### 1.0 一眼看懂

`.xlsx`/`.xls` 走本地腿（不走 MinerU）：calamine 读行 → 每 sheet 一张 GFM 表，dispatch 把 `images=[]` 写死——工作簿里贴的截图/照片**全部丢失**（不进索引、chunk 查看器看不到）。xlsx 文件本身是 zip，图片字节就在 `xl/media/` 里，提取不需要新依赖、不需要外部服务、不碰任何文件外资源。

### 1.1 机制证据

| 事实 | 位置 |
|---|---|
| `_parse_excel` 返回 `str`；dispatch 硬编码 `images=[]` | `parser.py:793-794`（dispatch）、`parser.py:296-318` |
| `_workbook_rows_to_markdown` 是纯行转换（每 sheet `## {name}` + GFM 表） | `parser.py:274-293` |
| 配文腿触发点：`parsed.images` 非空即跑（caption→alt 重写→落盘） | `worker.py:576-597`、`captioner.py:125-135` |
| ref 约束：`images/…` 相对路径 + 落盘防穿越（复用零改动） | `worker.py:621-644` |
| xls≠zip（老 BIFF）；xlsx=zip，挂位链 `workbook.xml`→`workbook.xml.rels`→`sheet rels`→drawing XML（锚点 `xdr:from` + `a:blip r:embed`）→`drawing rels`→media | OOXML 结构；本对夹具自造物证 |
| 锚点=`xdr:from` 0-based 绝对行列（oneCell/twoCell）；openpyxl 写绝对 Target（`/xl/media/…`） | probe 实录（`E:\app-model\deer-flow-scratch\workbook-images\probe.xlsx`，2026-10-03） |
| calamine `sheet.start`=用过范围原点、`to_python()` 矩阵以原点为准（B3 起数据→`start=(2,1)`）；空 sheet `start=None` | 同上 probe 实录 |
| calamine 通道无图片接口 | venv `python_calamine` 0.8.2 `dir`（2026-10-03） |

## 2. 设计

### 2.1 D1 `.xls` 处置（已裁：甲）

**裁定（2026-10-03）：甲（不覆盖）** —— `.xlsx` 提取，`.xls` 维持纯文本 GFM、矩阵如实标注。

**在问什么**：老二进制 `.xls`（非 zip）的图片做不做？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲（推荐）：不覆盖** | 只做 `.xlsx` 提取；`.xls` 维持纯文本 GFM，格式矩阵如实标注 | 两家先例同侧（Dify/RAGFlow 的 `.xls` 都不带图）；stdlib 无 BIFF 图片通道，不为老格式引重解析 | 矩阵少一格图片覆盖（如实标注、非暗缺） |
| 乙：转存提示 | 同甲 + 解析时给出「转存 .xlsx 可带图」的可见提示（复用现有 doc 标记/warning 机制） | 用户可自助补齐 | 提示面维护成本；老格式边际小，提示多数时候是噪声 |
| 丙：自研 BIFF 解析 | olefile + MSODRAWING 自解析 `.xls` 内嵌对象 | 全覆盖 | 成本高（BIFF 结构繁、无现成 Python 通道）、可靠性难保证、维护负担长 |

### 2.2 D2 图片挂位（已裁：乙）

**裁定（2026-10-03）：乙（单元格级/行列映射）** —— 落法口径见 §2.4。

**在问什么**：图挂到 markdown 的哪一层？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲（推荐）：工作表级** | 图行附在该 sheet 段尾（GFM 表之后）；仅图无行的 sheet 也出段；来源=sheet 标题 | 复用现 `## {name}` 段结构；零锚点解析（只读 rels 链）；chunker 天然把 caption 归该 sheet 标题下 | 图片没有行级来源（矩阵「行来源」格只对文本行成立） |
| 乙：单元格级（行列映射） | 读 drawing 锚点 `xdr:from` 行列，图链接并入该锚点单元格文本（Dify 式）；越界/绝对锚→回退 sheet 尾 | 最贴两家先例；caption 与该行行卡同 chunk | 锚点/起始偏移/合并列边界多，错位风险；单元格文本被链接语法污染 |
| 丙：文末汇总 | 全部图附全书末尾「## 内嵌图片」段 | 最省（不用 rels 链、直接 glob `xl/media/`） | 丢 sheet 关联，caption 检索无语境；与「工作表来源」验收相悖 |

### 2.3 D3 依赖（已裁：甲）

**裁定（2026-10-03）：甲（stdlib）** —— `zipfile` + `xml.etree`。

**在问什么**：提取用什么工具？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲（推荐）：stdlib** | `zipfile` + `xml.etree` 自解析 rels 链（~百行内） | 零新依赖；xlsx 是标准 OOXML；夹具可纯手造（TDD 不依赖库） | 自维护少量解析代码（结构稳定、面窄） |
| 乙：openpyxl（+Pillow 随需） | 借 `ws._images` 与锚点 API | 成熟库、锚点开箱（若 D2=乙 时省事） | 行读已用 calamine，再引第二个工作簿库；Pillow 二进制重依赖；ref 映射仍要自己写 |

### 2.4 定案（无待拍）

- 图片白名单=现 `_MEDIA_TYPES`（png/jpg/jpeg/gif/bmp/webp）；`emf/wmf/tiff` 等跳过（与 `_unpack_zip` 同集）。
- ref=`images/{media 原名}`（`xl/media/` 平铺、名内唯一）；落盘/防穿越校验复用 worker 现值。
- **媒体路径硬界**：仅取 `xl/media/` 下的部件（大小写不敏感、越界跳过）——防怪包借 drawing rel 引任意部件。
- **挂位口径（D2=乙）**：读 drawing XML 锚点 `xdr:from` 的 0-based 绝对行列，经 calamine `sheet.start` 归一到矩阵（空 sheet `start=None` ⇒ 全回退）；命中（行在矩阵行数内、列在表头宽内）⇒ **并入该单元格文本**：`原文本（经 _cell_to_text，数字格 120 不误写 120.0）+ " " + ![图片](ref)`，同格多图按锚点文档序空格连接；**越界行/超表宽/absoluteAnchor（无 from）⇒ 回退 sheet 段尾图行**；calamine 不列的 sheet（图表页）不产出。
- 只取 drawing XML 里被 `a:blip` 的 **`r:embed`** 引用的媒体（**`r:link`=外部链接图跳过**，字节不在包内；悬空 rel、孤儿媒体不取）；同一媒体多处引用**全局去重**（归首见锚点）；序=calamine sheet 序、sheet 内锚点文档序。
- **尽力非硬依赖（件级）**：单 drawing/单媒体缺件 → 跳过该件（其余照出）；`BadZipFile`/`ET.ParseError`/`KeyError` 才整腿回退 → warning + `images=[]`，正文照出；正文腿错误语义不变。
- 无新旋钮：随 `rag.table.enabled`（门关时 `.xlsx` 本就不可上传）；无图片数量/体积上限（对齐现 MinerU 腿）。
- 复用链基本零改动：`_save_parsed_images` / worker 不动（ref 形态与 MinerU 腿一致，`if parsed.images:` 直接吃）；唯一改动=`apply_captions` 落笔前清洗（见下）。
- **caption 落 markdown 前清洗（评审③=甲，本对并入）**：`_sub` 落笔前归一——先 `\`→`\\`，再换行（`\r\n`/`\r`/`\n`）→空格，再 `|`/`[`/`]` → `\|`/`\[`/`\]`（渲染等价）。理由：D2=乙 把 caption 放进表行内，转录模式的多行输出会让行尾无 `|`、chunker 表收集提前终止（该 sheet 剩余行塌成散文块）；`|` 会串列。调用点唯一（`worker.py:580`，视频腿不经此处）。
- 非 drawing 通道不提取：图表（chart XML）、VML 批注、OLE 对象、Excel「置于单元格内」（cellimages/richValue 链）、页眉/页脚图。

## 3. 硬约束

1. **改动两处**：`parser.py` 工作簿腿（新助手 + `_workbook_rows_to_markdown` 扩展 + `_parse_excel` 返回型 + dispatch 一行）＋ `captioner.py::apply_captions` 清洗一处（评审③=甲）；worker/chunker 零改动。
2. **现行为零回归**：无图 `.xlsx`/`.xls`/`.csv`/`.tsv` 输出逐字节不变；`_workbook_rows_to_markdown` 保持单参兼容（`test_table_eval.py:122`、`test_parser.py` 既有 8 例 `:1118–1196`）。
3. **零新依赖**（D3=甲）；TDD 强制 + 门禁（`tests/knowledge` + ruff 双净）。

## 4. 验收

- **Task 1–3 RED→GREEN→neuter**（坏因见 plan）；窄面 `-k "xlsx or workbook or caption"` 与既有全套零回归。
- **夹具三件**：手造 zip（锚点行列/白名单/去重/缺件/坏 zip；一图命中、一图越界）；fake calamine 接线（扩 `start`；`ParsedDocument.images` 与 markdown 行内 refs）；真 `.xlsx` e2e（openpyxl+PIL 造图 → `parse_document` → ref 字节==原图、命中图链接在锚点**行内**、远锚图回退 `## {sheet}` 段尾）——skipif calamine/PIL 缺失。
- **并入规则钉点**：空单元格→仅链接；非空→`原文本 链接`；数字格不写成 `120.0`；多图同格空格连接；越界行/超表宽/absoluteAnchor/空 sheet→尾挂。
- **caption 清洗钉点（③=甲）**：含换行/竖线/方括号的 caption 落笔后表行不中断、渲染等价；组装产物（行内 ref）经 `apply_captions` 正常重写 alt。
- **行为钉点**：fake-bytes 路由用例维持 `images == []`（尽力腿）；warning 可见（caplog）。

## 5. 非目标

- `.xls` 图片（D1=甲）；非 drawing 通道的图：图表（chart XML）、VML/OLE、单元格内图（cellimages/richValue 链）、页眉/页脚图。
- 绝对锚/越界锚的坐标精度（这类图回退 sheet 段尾，属设计边界）；合并单元格内的坐标修正（并入锚点原格、不展开合并区）。
- 图片配额/预算；caption/落盘/展示链改动。

**交付后衔接**：RFC v3 L47「内嵌图片」「现状与缺口」两格与 L355 升级（plan Task 5，先重读全文；升级文本为「zip 提取 + 行列锚点并入所在单元格（越界回退 sheet 段尾）；`.xls` 不覆盖」）；RFC 六处「需验收/验证」**均不在本对**（0/6，逐处归属见 plan 范围表）——其中仅 L47「工作表与行来源」跟本对交付后同跑（②批次，同一 `.xlsx` 样例可复用）。
