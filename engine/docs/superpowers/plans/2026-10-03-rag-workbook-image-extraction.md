# RAG 工作簿内嵌图片提取（.xlsx）小对 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-03-rag-workbook-image-extraction-design.md](../specs/2026-10-03-rag-workbook-image-extraction-design.md)
**Status:** ✅ **已裁（D1=甲 / D2=乙 / D3=甲）** —— 2026-10-03 成对起草、同日裁定；评审九项已并入（③=甲：caption 清洗=Task 3）；Task 0 已核 5 项（含 D2=乙 锚点语义 probe，下）；**Task 1 已交付**（窄面 15 绿 / neuter 3 红 / 整文件 88 绿 / ruff 双净）；**Task 2 已交付**（RED 11 红 / GREEN 窄面 25 绿 / neuter 4 红 / `tests/knowledge` 全套 1470 绿 + 2 条在册环境红）；**Task 0–2 已提交**（`3273fdb0` docs 成对 + `dc2fea73` 代码一笔，2026-10-03 按「先提交 Task 0 到 2」指示提前落账）；**Task 3 已交付**（RED 2 红/1 绿 / GREEN 4 绿 / neuter 2 红 / caption 窄面 60 绿 / ruff 双净；已提交 `6e6a7a86`）；**Task 4 已交付**（真 e2e 1 绿 / 文档四处 / 全量 1474 绿 + 2 在册环境红 / ruff 双净；已提交 `35321656`）；**Task 5 已交付——本对全对收官**（RFC v3 L47 两格 + L355 升级，md5 `ce3562b2`→`f50c7577`；提交链 `3273fdb0`→`35321656`，未推送；②批次验收（L45 切分/标题定位、L46 表格行来源、L47 工作表行来源）跟交付后另账同跑）。

**Architecture:** `.xlsx` 走本地腿不变（calamine 读行 + `sheet.start` 原点）；新增 stdlib 解析（`workbook.xml`→…→drawing XML 锚点 `xdr:from` + `a:blip r:embed`→drawing rels）取 `xl/media/*` → `ParsedImage(ref=images/…)`；锚点命中 ⇒ 图链接**并入该单元格文本**（`start` 归一；越界/绝对锚回退 sheet 段尾）；`_parse_excel` 改返 `ParsedDocument`；现配文腿/落盘链吃图（唯一配套=Task 3 caption 落笔前清洗）。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 `.xls` 图片 | **已裁=甲**：不覆盖（`.xls` 纯文本 GFM，矩阵如实标注） | `.xls` 图片覆盖与矩阵该格补注 |
| D2 图片挂位 | **已裁=乙**：单元格级行列映射（越界/绝对锚回退 sheet 段尾） | 绝对锚/越界锚坐标精度；合并区修正 |
| D3 依赖 | **已裁=甲**：stdlib（zipfile + xml.etree） | — |
| caption 落表清洗（评审③） | **已裁=甲**：并入本对（`apply_captions`：先 `\`→`\\`，换行→空格、`|`/`[`/`]` 转义 + 用例） | 其余 caption/落盘/展示链改动 |
| RFC 两格升级 | Task 5（先重读全文——常手改） | L47「工作表与行来源」样例验收（归②批次，另账） |
| RFC 六处「需验收/验证」 | **0 处在本对**（本对只产图片能力证据，Task 5 升级 L47 两格） | L45 切分 / L45 标题定位 / L46 表格行来源 / L47 工作表行来源 → ②批次（L47 那条跟本对交付后同跑）；L48 逐组合 / L49 图片文档链 → ③批次 |

## 硬约束

- 改动两处：`parser.py` 工作簿腿 + `captioner.py::apply_captions` 清洗一处（评审③=甲）；worker/chunker 零改动。
- 零回归：无图 `.xlsx`/`.xls`/`.csv`/`.tsv` 输出逐字节不变；`_workbook_rows_to_markdown` 单参兼容（`test_table_eval.py:122`）。
- 零新依赖（D3=甲）；TDD + 门禁 `tests/knowledge` + ruff 双净。

## Task 0 — 起草时核实（5 已核）+ 动手前复核（2，2026-10-03 全绿）

已核（2026-10-03，起草时）：

- [x] ① **调用面**：`_parse_excel` 仅 dispatch（`parser.py:794`）与测试直调；`_workbook_rows_to_markdown` 另有单参调用（`test_table_eval.py:122`）⇒ 扩展须默认参兼容；`backend/AGENTS.md` 表格段引用它（Task 4 更新）。
- [x] ② **通道**：`python_calamine` 0.8.2 `dir` 无任何图片接口 ⇒ 提取走 zip+XML 自解析。
- [x] ③ **先例**：Dify / RAGFlow「仅 xlsx 抽图；`.xls` 纯文本」（源码核）——D1=甲 有据。
- [x] ④ **夹具**：venv 有 `openpyxl 3.1.5` + `Pillow 12.3.0` ⇒ 真 xlsx e2e 可直接造图（skipif 兜 CI）。
- [x] ⑤ **D2=乙 锚点语义 probe**（`E:\app-model\deer-flow-scratch\workbook-images\`）：openpyxl 锚=`oneCellAnchor`+`xdr:from`(col,row) 0-based、media Target 写**绝对** `/xl/…`；calamine `start=(2,1)`（B3 起数据）且 `to_python()` 以 start 为原点、空 sheet `start=None`（⇒ 全回退尾挂）。

动手前复核（2026-10-03 已跑）：

- [x] ① 装配点未漂移：dispatch 本地三分支（`parser.py:791-796`）与 `if parsed.images:` 两触发点（`worker.py:576` / `:590`）已重开核，未漂移。
- [x] ② 兼容面全绿（当次快照）：`cd backend && pytest tests/knowledge/test_parser.py tests/knowledge/eval/test_table_eval.py --basetemp=../.pytest-tmp -q` ⇒ **85 passed / 39.25s / 0 failed**（工作树仅无关文档改动，backend 代码干净）。

## Task 1 — 提取器（stdlib，TDD）

- [x] ① RED：夹具 helper（手造最小 OOXML zip：两 sheet、sheet 有无 drawing 各一、**oneCell+twoCell+absoluteAnchor 三形态、命中锚与越界锚各一、Target 绝对/相对各一**、两真图 png/jpeg、一 emf 引用、一悬空媒体、**一 `r:link` 外部链接图、一越界媒体（`xl/embeddings/…`）**）+ 用例：映射与字节/媒体类型；**锚点行列提取（twoCell 取 from；absolute→无锚）**；白名单滤（emf 跳过）；**`r:link` 跳过**；**越界媒体跳过（硬界）**；悬空/孤儿不取；**单件缺件（drawing/media）跳过不炸（件级）**；同媒体去重归首见；无 rels sheet 不炸；坏 zip 抛 `BadZipFile`。**实测：5 红 / 2 绿**（新 5 用例全因 `ImportError` 红）——落地为 `test_parser.py` 新区段（夹具 5 helper + 富夹具 7 锚 + 5 用例，插在 Excel 区段与 caption 区段之间）。
- [x] ② GREEN：`_xlsx_sheet_images(zf)`（rels 链 + drawing XML 锚点 + `r:embed`/`xl/media/` 双闸，返回 sheet→[(ParsedImage 素材, row|None, col|None)]）+ `_extract_xlsx_images(path)`（读字节；件级容错；入 `run_file_io`）。**实测：窄面 7 绿**。实现= `parser.py` 新增 `import posixpath`、`import xml.etree.ElementTree as ET`、5 命名空间常量 + 7 助手（`_rels_part`/`_resolve_part`/`_read_rels`/`_anchor_cell`/`_drawing_images`/`_xlsx_sheet_images`/`_extract_xlsx_images`）；`_extract_xlsx_images` 为 sync（`run_file_io` 包裹归 Task 2 调用方）；`_parse_excel`/dispatch 本任务零改动。
- [x] ③ neuter：断锚点解析一处（如 from 不读）⇒ 锚点用例红；还原。**实测：`from_el = None` ⇒ 3 红**（断言锚点的 maps/dedupes/skips_missing）+ 4 绿；已还原、窄面复绿。
- [x] ④ 窄面：`pytest backend/tests/knowledge/test_parser.py -k "xlsx or workbook"` 绿 + ruff。**实测：15 passed / 15.8s；整文件 88 passed 零回归；ruff check + format --check 双净（2 文件）**。

## Task 2 — 挂载与接线（TDD）

- [x] ① RED：**并入规则**（命中空格→仅链接；命中非空格→`原文本 ![图片]`；数字格经 `_cell_to_text` 不写成 `120.0`；多图同格空格连接）；**回退**（越界行/超表宽/absoluteAnchor/空 sheet `start=None`→sheet 段尾图行，图片间空行）；仅图无行 sheet 出段；`_parse_excel`→`ParsedDocument`（fake calamine 扩 `start`（默认 `(0,0)`）+ 真 zip：markdown 行内 refs、images 扁平序）；坏 zip 尽力腿（`BadZipFile`/`ET.ParseError`/`KeyError` → `images==[]` + 正文照出 + caplog warning）；`.xls` 不尝试 zip。**实测：11 红**（merge 3 + trailing 1 + `_parse_excel` 形状 4 + 错误降级参数化 3（`[exc0-2]`）+ `.xls` 1；成因=缺 `_merge_anchor_links`/参数不支持/返回仍是 str）；fixture 扩 `_install_fake_calamine(..., starts=None)`（默认 `(0,0)`，显式 `None` 模拟空 sheet）。
- [x] ② GREEN：`_merge_anchor_links(rows, start, images)`（或内联）；`_workbook_rows_to_markdown(..., trailing_images_by_sheet=None)` 扩展（尾挂回退专用）；`_parse_excel` 返 `ParsedDocument`；dispatch 一行；既有直调用例同步改取 `.markdown`（形状变化，计划内显式列出）。**实测：窄面 25 绿**。实现＝ `_merge_anchor_links`（start 归一、越界/无锚/无 start 回退尾挂、命中并入 `原文本/仅链接`）+ builder 增 keyword-only `trailing_images_by_sheet`（尾挂每图一行、空行分隔、仅图无行也出 `##` 段）+ `_parse_excel` 重写（`_blocking` 三tuple 读行 + `.xlsx` 才尽力读 zip + catch 集 `{BadZipFile, ET.ParseError, KeyError}` → 英文 warning + `images` 扁平序=calamine sheet 序×锚点文档序）+ dispatch `return await _parse_excel(path)`；既有 `test_parse_excel_happy_path_via_fake_calamine` 改「写假字节 + 取 `.markdown` + `images==[]`」（顺带吃回退腿）。
- [x] ③ neuter：去掉并入逻辑或尾挂 append ⇒ 对应用例红；还原。**实测：去掉并入写回 ⇒ 4 红**（3 单测 + 1 集成 `merges_anchor_links`）+ 21 绿；已还原、窄面复绿。
- [x] ④ 零回归：`tests/knowledge` 全套（含 `test_table_eval.py`）零回归 + ruff 双净。**实测：1470 passed / 2 skipped / 2 failed（576.9s）**；2 条=在册环境红对（`test_indexer.py::test_embed_missing_api_key` / `test_reranker.py::test_rerank_missing_api_key`，本机真 `rag_config.json` 带 key ⇒「缺 key 须抛」前提不成立）；**阳性对照**（`DEER_FLOW_RAG_CONFIG_PATH=<仓外空 {}>`）⇒ **2 passed** 当场齐绿（同树隔离法）。ruff check（knowledge 包 + tests/knowledge）+ format --check（2 文件）双净。

## Task 3 — caption 落 markdown 清洗（captioner.py，TDD；评审③=甲）

- [x] ① RED：`apply_captions` 用例——换行 caption（`\r\n`/`\n`）落笔后行仍单行（GFM 表行不中断）；`|`→`\|`、`[`/`]` 转义（渲染等价）；组装产物（表行内 ref、多图同格）alt 就地重写（评审⑤钉点）。既有 plain-caption 断言（`test_parser.py:245`）保持不变。**实测：2 红 / 1 绿**（换行、转义两条红=无清洗；组装钉子条绿=既有重写行为已满足，属防回归钉）+ 既有 plain-caption 用例原样未动；三条插在 `test_apply_captions_merges_back_into_markdown` 之后。
- [x] ② GREEN：`apply_captions` `_sub` 落笔前清洗（先 `\`→`\\`，再换行→空格、再 `|`/`[`/`]` 转义；调用点唯一 `worker.py:580`，视频腿不经此处）。**实测：4 绿**（3 新 + 既有 plain）。实现= `captioner.py` 新增 `_sanitize_caption`（三序清洗：`\` 翻倍 → `\r\n?|\n`→空格 → `|`/`[`/`]` 逐字转义）+ `_sub` 落笔前调用 + `apply_captions` docstring 补口径；调用面重核仍唯一（仅 `worker.py:580`）。
- [x] ③ neuter：去清洗 ⇒ 换行用例红；还原。**实测：旁路 `_sanitize_caption` ⇒ 2 红**（换行+转义）+ 2 绿（组装钉子+既有 plain）；已还原、复绿。
- [x] ④ 窄面：`pytest backend/tests/knowledge -k "caption"` 绿 + ruff。**实测：60 passed / 0 failed（隔离 basetemp）/ 23.2s**；ruff check + format --check 双净（首跑 18 条 ERROR 定性=另一并发 pytest 会话共用 `.pytest-tmp` 的已知假红——会话启动清 basetemp 撞 sqlite 句柄；换仓外隔离 basetemp 后全绿。另修我新写行的 ruff format 等价重排一处）。

## Task 4 — 真 e2e 与文档

- [x] ① 真 `.xlsx` e2e：openpyxl+PIL 造（数据 + 命中锚图 + 远锚图）→ `parse_document` → images 数、ref 字节==原图、命中图链接在锚点**行内**、远锚图回退 `## {sheet}` 段尾；skipif（calamine/PIL/openpyxl 缺）。**实测：1 passed（14.4s）**。先探针证 openpyxl 嵌入字节与源 PNG **逐字节一致**（⇒ `content == 原图字节` 可钉精确相等）；断言四条=images==2 / 两图字节相等 / `| North | 120 ![图片](ref0) |` 行内 / `endswith("\n\n![图片](ref1)")` 段尾；skipif=calamine+openpyxl+Pillow 任一缺（`_xlsx_imaging_available`）。
- [x] ② 文档：`parser.py` 模块 docstring 本地腿段、`_EXCEL_SUFFIXES` 注释、`_parse_excel`/`parse_document` docstring；`apply_captions` docstring（清洗口径）；`backend/AGENTS.md` 表格/摄取段补行。**实测：四处落地**——`parser.py` 模块 docstring（`.xlsx` 嵌图句 + `.xls` D1=甲 注）、`_EXCEL_SUFFIXES` 注释（嵌图指向 `_extract_xlsx_images`）、`parse_document` docstring（嵌图并入锚点句）、`backend/AGENTS.md` 表格摄取段（OOXML 链/双闸/回退/caption 清洗口径/`.xls` 纯文本/坏 zip 降级）；`_parse_excel`（Task 2）与 `apply_captions`（Task 3）两处 docstring 已随各自任务落笔。
- [x] ③ 门禁：`tests/knowledge` 全绿 + `ruff check` + `ruff format --check`。**实测：1474 passed / 2 skipped / 2 failed（392.5s，仓外隔离 basetemp）**；2 条=在册环境红对（缺 key，本对零耦合；阳性对照前轮已证）；passed +4 与新增用例（Task 3 三条 + Task 4 一条）逐一对上。**ruff 全后端双净**（`All checks passed!` + `1312 files already formatted`）。

## Task 5 — RFC 两格升级与收尾

- [x] ① **先重读 RFC v3 全文**（373 行重读核过：L45 已是「设计上不提取」、L47/L355 未漂移）：L47「内嵌图片」「现状与缺口」两格升级 + L355 去「待补图片实现」。**实测：改后 md5 `f50c7577…`（前 `ce3562b2…`）、373 行不变、恰好 2 行改**——L47「内嵌图片」=「已实现（.xlsx）：从工作簿 zip 内提取内嵌图片，按行列锚点并入所在单元格（越界回退工作表段尾）；.xls 不覆盖」、「现状与缺口」=「单元格解析与 .xlsx 内嵌图片提取均已实现；.xls 图片不覆盖，按矩阵如实标注」；L355=删「待补图片实现、」；全文「待补/空图片列表」0 残留。RFC 为未跟踪对外稿，不入 git（待他贴 #5391）。
- [x] ② plan 复选框全勾 + 提交号回填；spec/plan 成对提交已提前落账（`3273fdb0`；Task 1–2 代码 `dc2fea73`；**Task 3 `6e6a7a86` / Task 4 `35321656`**）；本项收窄为「Task 3–5 的提交链回填 + RFC 升级笔与代码交付笔相邻」——均已落。

## 收尾

- [x] 复选框回填、提交链回填；RFC 升级笔与代码交付笔相邻（RFC 升级发生在代码全部交付/提交之后）。本对残余：仅 plan 自身这笔收尾改动待提交；②批次四项验收另账（跟交付后同跑）。
