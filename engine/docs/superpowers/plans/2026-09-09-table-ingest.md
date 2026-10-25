# 表格文档入库实施 plan（2026-09-09）

对应 spec：`docs/superpowers/specs/2026-09-09-table-ingest-design.md`（章节引用以「spec §N」
标记）。任务按序执行；每任务 RED → GREEN → revert proof → 提交。

验证基线（对齐视频 plan）：后端 `cd backend && uv run pytest tests/knowledge -q`（沙箱需
`--basetemp=.pytest-tmp/<sub>` + PYTHONPATH/PYTHONIOENCODING/PYTHONUTF8 三 env，Makefile 同款）
+ `ruff check/format` 双净；前端 `python ../scripts/pnpm.py check` + `test run tests/unit/knowledge`。

架构基调（spec §3）：parser 归一 → chunker 表格感知 → worker 零改动 → 复用现有三通道。
**无新 store 表、无新 path_status 腿、无 resume**——比视频轻。

## Task 0: MinerU 表格语法实测门（spec §5/§11）

**目的**：冻结「parser 是否需要 HTML→GFM 归一器」这一唯一实测未知项。

- [x] 用一份含表格的真实 PDF 跑 MinerU 云 API v4 + `model_version="vlm"`（`MINERU_API_TOKEN`
      就位），抓取 `full.md`，确认表格实际语法：GFM 管道表 / HTML `<table>`。
- [x] 结论写回 spec §5/§11（归一器是「必需路径」还是「幂等 no-op 安全网」）。
- [x] ~~无 token/网络时的降级预案~~ **未触发**：token + 网络均就位，实测门已真跑（两次）。
      归一器仍按「无论如何都实现」推进（HTML→GFM + 幂等 no-op），chunker 对残留 HTML
      `<table>` 做原子块防御（spec §6）。

### 实测结论（2026-09-09，已冻结进 spec §1/§5/§6/§11）

**取证**：自制单页 PDF（一张普通 4×5 表 + 一张含 rowspan/colspan 合并单元格的表 + 一行含
shell 管道符的散文），无第三方 PDF 库、纯字节手写；走生产 `parse_document`（v4 + 默认
`model_version="vlm"`，即 `worker._reparse_and_chunk` 的真实路）跑两次（带/不带表头底纹）。
另从 live DB 只读扫描 16 份已入库文档的 `chunks.text` 作旁证。产物：
`pr-build/t0-mineru-table-gate/`（两份 PDF + 两份 `full.md` + 两份运行日志 + 两个探针脚本）。

1. **语法定调：HTML `<table>`，不是 GFM。** 两次实跑 + DB 中 7 张历史表格（docx 路）全部为
   HTML；GFM 分隔行/管道行命中数 **0**。→ **Task 2 的 `_normalize_tables_to_gfm` 是必需路径**，
   不是幂等 no-op 安全网（no-op 分支仅对用户 authored `.md` 有意义）。
2. **两种形态都要吃**：PDF 路无 `<thead>`/`<th>`（**表头 = 首个 `<tr>`**、单元格无嵌套标签、
   整表压在一行）；docx 路有 `<thead><th>` 且单元格内嵌 `<p>`/`<strong>`，**单格可多个 `<p>`**。
3. **行宽不齐真实存在**：`colspan="3"` 行只回 **1 个 `<td>`** → 归一器必须按表头列数补空/截断，
   否则不是合法 GFM、前端渲染不出真表格（破 spec §8 零改动前提）。
4. **合并单元格双表达**：显式 `rowspan="2"`/`colspan="3"`（PDF 路）**与**隐式空 `<td></td>`
   （docx 路）同时存在 → 扁平化规则对两者都要健壮。
5. **§1 的现状损坏拿到真实复现**：`3.java并发.docx` chunk `db10e8f7…#0011` `token_count` 恰为
   1024，HTML 表被从 `<td><p>` 标签中间截断；续块 `#0012` 仅 53 token 悬空尾巴且**无表头**。
6. **散文里的 `|` 不会被 MinerU 误判为表格**（实测 `cat sales.csv | grep north | wc -l` 原样
   输出）→ Task 4 的误伤风险面仅来自用户 authored `.md`，双条件 + fence 守卫仍必要。
7. **附带观察**：表头带灰色底纹时 VLM 把整行表头读成空 `<td></td>`（去底纹后完整）——上游
   保真度损失，归一器无法凭空补列名，已记入 spec §11 风险行；zip 内 2 张表格裁切图但
   `full.md` 无图片引用（不触发 caption 路）；`MINERU_ZIP_PROXY` 不可达时直连降级成功。

> 注：本任务不产代码，只产实测结论。探针脚本为一次性取证工具，置于 `pr-build/` 作证据留存，
> **不进产品代码路径**；Task 7 浏览器实测阶段可用真实业务 PDF 再补一轮旁证。

## Task 1: 配置门控与后缀并集（spec §4）

**Files:**
- Modify: `backend/packages/harness/deerflow/config/app_config.py`（`RagTableConfig`：
      `enabled=False` / `max_size_mb` / `card_mode: Literal["markdown","linearized"]="markdown"`；
      `RagConfig.table` 字段紧邻 `video:196`）
- Modify: `backend/packages/harness/deerflow/knowledge/parser.py`（`TABLE_UPLOAD_SUFFIXES`
      frozenset `{".xlsx",".xls",".tsv"}`；`table_ingest_enabled()`；`supported_upload_suffixes()`
      门控并入；`SUPPORTED_UPLOAD_SUFFIXES` 文本集**不动**）
- Modify: `config.example.yaml` + `config.yaml`（`rag.table` 注释段）
- Test: `backend/tests/knowledge/test_api.py`（门控两态：off 拒 `.xlsx` / on 收 `.xlsx`；`.csv`
      恒在；三后缀 `.xlsx`/`.xls`/`.tsv`；`max_size_mb` 体积门）

- [x] RED：门控两态用例 failed（端点恒返文本集）。—— 6 条新用例 RED（4 条
      `ImportError: TABLE_UPLOAD_SUFFIXES`、2 条 400≠202）。
- [x] Implement：配置段 + frozenset + 端点并集 + 体积门。
- [x] GREEN + revert proof（摘 `table_ingest_enabled` 门控 → 用例 RED）。—— 恢复后
      `tests/knowledge` + `tests/test_rag_config.py` 全量 **1005 passed / 2 failed / 2 skipped**
      （6m41s），ruff check + format 双净；revert proof 把 `table_ingest_enabled()` 摘成恒
      `return False` → 4 条 on 态用例 RED → 恢复。
- [x] Commit: `feat(rag): gate table upload suffixes behind rag.table.enabled`

### 交付纪要（2026-09-09）

- **预存缺陷顺手修了（本任务同一咽喉）**：三条 off 态门控用例（`test_api.py` 两条 +
  `test_parser.py::test_video_upload_suffixes_contract`）**开发机上本来就红**：它们声称「测试
  环境默认 off」却直读真实 `config.yaml`（本机 `rag.video.enabled: true`）。已改为双腿
  config stub（`_stub_rag_gates` / `_stub_gates`）——stub 必须同时带 video 与 table 两条腿，
  否则另一腿走 AttributeError 降级路，会把真实行为掩盖成「恰好也是 off」。基线从
  67 passed/3 failed → 79 passed/0 failed。
- **两个冻结细节**：①`max_size_mb` 默认 **50**（spec 只给 `ge=1` 未给值；电子表格远小于视频
  的 2048）；②**体积门只管被门控的三后缀**，`.csv` 不受 `rag.table.max_size_mb` 约束——它是
  既有文本集成员，spec §4「.csv 不门控」推到体积面就是不得为本特性给它新增限制（已用
  `test_table_size_gate_does_not_apply_to_csv` 钉死）。
- **额外覆盖面**（plan Files 未列、对标视频 Task 1 同名提交 `787e817e` 补齐）：
  `tests/test_rag_config.py::TestRagTableConfig`（6 例：默认值/覆盖/非法 literal/非法下界/
  两腿独立/**shipped config.example.yaml 的 `rag.table` 段能被模型吃下且值与文档一致**）；
  路由 `/supported-formats` docstring 补表格腿。`config.example.yaml` 新增注释段；`config.yaml`
  同步加 `table.enabled: false`（gitignored，仅本机；Task 7 实测时再开门）。
- **遗留的预存失败（与本任务无关，未动）**：`test_rag_config.py` 两条用例仍钉
  `vlm_model == "Qwen/Qwen3-VL-30B-A3B-Instruct"`，而 HEAD 上默认值已是 `qwen3.7-flash`
  （本次 diff 对这两个文件纯增量 +67/-0，未触碰该行）；`ruff format --check` 全仓另有一处
  预存未格式化文件 `tests/knowledge/tools/test_graph_search.py`（git 未修改，非本次引入）。

## Task 2: 分隔文本解析 CSV/TSV → GFM（spec §5）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/parser.py`（`_parse_delimited(path)`：
      标准库 `csv`、编码复用 UTF-8/GBK 回退 + BOM 剥离、`.tsv` 固定 tab / `.csv` Sniffer 嗅探、
      首行表头 → GFM 管道表；`parse_document` 把 `.csv`/`.tsv` 从 `_read_local_text` 改路由到
      `_parse_delimited`，`parser.py:322-323`）
- Modify（依 Task 0——**已实测定为必需路径**）: `parser.py`（`_normalize_tables_to_gfm(markdown)`：
      HTML `<table>`→GFM，仅 MinerU 分支调用；对已是 GFM 的输入幂等 no-op。**Task 0 冻结的四项
      必须覆盖**：①两形态（无 `<thead>`/`<th>` 时表头回落首 `<tr>`；单元格剥内嵌 `<p>`/`<strong>`
      且多段 `<p>` 以**空格**连接、绝不插换行；HTML 实体反转义）②**行宽按表头列数补空/截断**
      （`colspan` 行只回 1 个 `<td>`）③rowspan/colspan 扁平化 + 隐式空 `<td>` 容忍④表头全空
      （底纹表头失读）时不猜列名、退化为无列名行组）
- Test: `backend/tests/knowledge/test_parser.py`（CSV 逗号/分号 → GFM 表头+行；TSV tab；编码
      回退；空表/单行/无表头退化；HTML→GFM 归一含 rowspan/colspan 扁平化；**两形态 fixture 直接
      取 `pr-build/t0-mineru-table-gate/t0_mineru_full*.md` 的实测输出**（无 `<thead>` 形 / 嵌套
      `<p><strong>` 形 / colspan 行补齐 / 隐式空 `<td>`）；`.md`/`.txt` 原始直读回归不变）

- [x] RED → Implement → GREEN → revert proof。—— 28 条新用例 RED（27 条 ImportError/断言 + 1 条
      更新后的 CSV 逐字直读用例）→ 实现两函数 + 路由接线 → `test_parser.py` **61 passed**、
      `tests/knowledge` 全量 **1012 passed / 2 skipped / 0 failed**（5m57s）、ruff check+format 双净；
      revert proof 把 `_parse_delimited` 摘成原始 dump + `_normalize_tables_to_gfm` 摘成 no-op →
      **23 条 RED**（no-op/残留/本地守卫 6 条正确恒绿）→ 恢复 61 passed。
- [x] Commit: `feat(rag): parse delimited text into GFM tables and normalize MinerU HTML tables`（`30c70f05`）

### 交付纪要（2026-09-09）

- **实现落点**（`parser.py`，+265 行，纯增量；仅动 `parser.py` + `test_parser.py`）：
  - `_parse_delimited(path)`：复用 `_read_local_text`（UTF-8 严格→GBK 回退）+ BOM 剥离；`.tsv`
    固定 tab、`.csv` 用 `csv.Sniffer(delimiters=",;")` 回退逗号；首行表头 → GFM；行宽按表头补空/
    截断、跳过空行、空输入→`""`（worker 触发 `EmptyParseResultError`，与空文本一致）。
  - `_normalize_tables_to_gfm(markdown)`：`_find_table_spans` 栈匹配顶层 `<table>` 段（嵌套表标记后
    原样残留）→ `_TableCellParser`（`HTMLParser`，`convert_charrefs` 自动反转义实体；单元格剥内嵌
    标签、同级 `<p>` 以空格连接绝不换行、空白折叠）→ `_flatten_rows`（rowspan 值下沉、colspan 首列
    取值余列空、按表头列数补齐/截断）→ `_gfm_row`（字面 `|` 转义为 `\|`）。表头 `<th>`/`<thead>`
    优先、缺失回落首 `<tr>`；全空表头保留空列名（绝不臆造）。
  - 路由：新增 `_DELIMITED_SUFFIXES={.csv,.tsv}`，`parse_document` 先判分隔文本→`_parse_delimited`，
    再判 `is_local_suffix`→原始直读；`.tsv` 并入 `_LOCAL_READ_SUFFIXES`（永不触 MinerU）。MinerU
    分支在 `_relocate_trailing_title` 后追加 `_normalize_tables_to_gfm`（仅 MinerU 路，本地 `.md`
    绝不归一）。
- **冻结的实现决策**：①rowspan **下沉填充**（非留空）——检索行卡自足（`Widget A | Weight | 2.4 kg`
  优于空首列），spec §5「下沉填充或留空」二选一取前者；②colspan 首列取值、余列空（spec §5 明定）；
  ③底纹空表头 → 输出空列名 GFM（`|  |  |  |  |`），仍合法可渲染、绝不猜列名（spec §5 ④/§11）；
  ④单元格字面 `|` 转义 + 空白折叠 → 保证输出恒为单行合法 GFM（Task 4 表检测与前端 streamdown 渲染
  前提）；⑤嵌套/畸形表原样残留 HTML，交 chunker 原子块防御（Task 4，spec §6），归一器只吃 T0 两形态。
- **fixture 来源**：形态 A 两条（含 rowspan/colspan 的 plain + 底纹全空表头的 shaded）**逐字内嵌**
  `pr-build/t0-mineru-table-gate/t0_mineru_full{_plain,}.md` 实测输出（**2026-09-23 更正：`pr-build/` 并未被
  gitignore**——该目录在册（59 份证据）；内嵌而非读盘的真实理由只是保 CI 自足）；形态 B（`<thead><th>` + 嵌套 `<p><strong>` + 单格多 `<p>` + 隐式空
  `<td>`）无 fixture 文件（源自 live DB docx 路观测），按 spec §5 实测样例构造。
- **顺手修的过时用例**：`test_parse_csv_local_read_gbk` 原钉「CSV 逐字直读」（`assert "苹果,3" in`）
  ——正是本任务升级的旧行为，已改钉 GFM 输出（GBK 回退仍生效）。`test_api.py` 两条 `.csv` 用例只验
  上传门控（202）+ stub worker，不触解析，未受影响。
- **遗留（与本任务无关，未动）**：`tests/test_rag_config.py` 两条 vlm_model 漂移失败（Task 1 已记录，
  在 knowledge 目录外）；`ruff format --check .` 全仓预存 `tests/knowledge/tools/test_graph_search.py`
  未格式化（非本次引入，未触碰）。

## Task 3: Excel 解析 .xlsx/.xls → 每 sheet 一张 GFM 表（spec §5）

**Files:**
- ~~Modify: `backend/pyproject.toml`（加 `python-calamine`）~~ **改走视频重依赖先例（不进 pyproject/lock）**——uv.lock 因预存 tenki-sandbox 解析失败无法本地再生，加 extra 会令 lock 陈旧卡死 `uv sync`；calamine 走延迟 import + `pip install` 降级（详见交付纪要，用户已确认）
- Modify: `backend/packages/harness/deerflow/knowledge/parser.py`（`_parse_excel(path)`：延迟
      import `python_calamine`、缺失/门控 off 抛清晰降级错误、blocking 读取经 `run_file_io`、
      每 sheet → `## {sheet_name}\n\n<GFM 表>`、空 sheet 跳过、多 sheet 顺序拼接；`parse_document`
      加 Excel 分支）
- Test: `backend/tests/knowledge/test_parser.py`（fake calamine 覆盖多 sheet/空 sheet/表头推断/
      sheet 名进 `##` 标题；真实 `.xlsx` 端到端标 `skipif`——本机无 calamine 不阻塞回归，对齐
      视频 Task 3 skipif 纪律）

- [x] RED → Implement → GREEN → revert proof（neuter `_parse_excel` → Excel 用例 RED）。—— 12 条新用例 RED
      （11 failed：ImportError/路由落 MinerU + 1 真实 xlsx skipif）→ 实现纯函数 `_workbook_rows_to_markdown`
      + `_parse_excel`（gate/延迟 import/run_file_io）+ parse_document Excel 分支 → `test_parser.py`
      **72 passed/1 skipped**、`tests/knowledge` 全量 **1023 passed/3 skipped/0 failed**（5m46s）、ruff 双净；
      revert proof 同时 neuter 两新函数 → **10 条 RED**（`all_sheets_empty` 期望 "" 恒绿 + 真实 xlsx skip）→ 恢复 72 passed。
- [x] Commit: `feat(rag): parse Excel workbooks into per-sheet GFM tables via calamine`（`40c77eb2`）

### 交付纪要（2026-09-09）

- **实现落点**（`parser.py`，+74 行；仅动 `parser.py` + `test_parser.py`，**未动 pyproject/lock**）：
  - `_workbook_rows_to_markdown(sheets)`（纯函数）：`(sheet_name, rows)` 序列 → 每非空 sheet 一段
    `## {sheet}` 标题 + 空行 + GFM 表，多 sheet 以空行顺序拼接；首行表头、行宽按表头补齐/截断
    （复用 Task 2 的 `_gfm_row`/`_gfm_separator`/`_fit_width`）、跳过空行与空 sheet、全空 → `""`。
  - `_cell_to_text(value)`：calamine `to_python()` 原生类型（int/float/bool/datetime/None）→ 文本，
    `None` → 空单元格。
  - `_parse_excel(path)`（async）：先门控 `table_ingest_enabled()`（off → 清晰 ValueError 带
    `rag.table.enabled`）→ `_blocking()` 内延迟 import `python_calamine`（缺失 → ValueError 带
    `pip install python-calamine`）+ `CalamineWorkbook.from_path` + 遍历 `sheet_names` /
    `get_sheet_by_name().to_python()`，整段 blocking 读取经 `run_file_io` 落线程池 → 交纯函数组装。
  - 路由：新增 `_EXCEL_SUFFIXES={.xlsx,.xls}`，`parse_document` 在分隔文本分支后、`is_local_suffix`
    前加 Excel 分支（`await _parse_excel`，绝不触 MinerU）。
- **calamine 依赖声明改走视频先例（用户确认，偏离 plan 字面）**：plan Files 原写「Modify
  backend/pyproject.toml 加 python-calamine」。实测 `uv lock` **失败**——`tenki-sandbox` 对
  `python_full_version>=3.14 & win32` 无 wheel（**预存 repo-wide 问题，与 calamine 无关**，`uv.lock`
  原子未改）。而 uv.lock 显式枚举每个 extra（root L875 + harness L1014），加 `table` extra 却无法
  再生 lock → lock 陈旧 → `uv sync --inexact`（make test/dev）与 CI `uv sync --group dev` 会触发重锁
  并撞 tenki 失败，**破坏开发流**。故按 Makefile 既有纪律（视频 funasr/torch/scenedetect「以 uv pip
  extra 安装、不在 uv.lock」）：calamine **不进 pyproject/lock**，靠延迟 import + `pip install
  python-calamine` 降级；spec §11「CI 用 fake 不装重依赖」本就要求 CI 不装它，功能完整。已撤销两处
  pyproject 改动、降级文案从 `--extra table` 改为 `pip install`（对齐 `asr.py` 的 `pip install funasr`）。
- **测试面**：纯函数 7 例（单/多 sheet 顺序、空 sheet 跳过、全空、类型 stringify、行宽补齐、仅表头）
  直测字面数据；`_parse_excel` 4 例（gate off / 缺 calamine / fake happy path / parse_document 路由不触
  网）用 `sys.modules` 注入 fake calamine 模块（镜像 `from_path`→`sheet_names`→`get_sheet_by_name().
  to_python()`）+ `None` 强制 ImportError；真实 `.xlsx` 端到端 `skipif(not _calamine_available())`
  （openpyxl 3.1.5 可造 fixture，本机无 calamine → skip）。
- **blocking-io**：`_parse_excel` 的 calamine 读取经 `run_file_io`（对齐 asr/ocr/frames 纪律）。
  `tests/blocking_io` 有 **4 条预存失败**（`test_channel_runtime_config_store` 三条 chmod/owner-only +
  `test_lark_auth_complete_route`），属 Windows 环境/IM 认证，与本任务无关（parser 不涉及）。
- **遗留（未动）**：`tests/test_rag_config.py` 两条 vlm_model 漂移（knowledge 目录外）；uv.lock 的
  tenki-sandbox 再生问题是 repo-wide 预存缺陷，非本任务引入，建议另立 issue（cap `requires-python
  <3.14` 或等 tenki 发 wheel）。

## Task 4: 表格感知 chunker（spec §6/§7，核心）

**Files:**
- Modify: `backend/packages/harness/deerflow/knowledge/chunker.py`：
  - `_split_by_headings:61` 增强：检测连续 GFM 管道表块（行 `^\s*\|.*\|\s*$` + 次行分隔行
        `^\s*\|[\s:|-]+\|\s*$`），代码 fence 内 `|` 不误判（复用 `in_fence`），块标记 `is_table`，
        表块作原子块保留。
  - **残留 HTML `<table>` 原子块防御**（Task 0 实测后升为必需兜底，spec §6）：归一器未覆盖的
        表形态可能残留 HTML（且 MinerU 整表压在**一行**），此时整段 `<table>…</table>` 作原子块
        保留、**绝不进 `_hard_split_tokens`**（live DB 已复现从 `<td><p>` 中间截断的损坏）；不做
        行组切分（无 GFM 表头可锚）。
  - 新增 `_chunk_table_block(path, header, delimiter, rows, max_tokens, card_mode)`：小表单块；
        大表贪心行组打包（表头+分隔+组内行 ≤ cap，目标 512±256）；**每块重复表头**；多块拆分时
        每块顶加溯源说明行 `表格：{名}（第 {起}-{止} 行 / 共 {N} 行）`；退化：单行+表头超 cap 时
        整行保留不中切。
  - `card_mode` 两态：`markdown`（默认，GFM 表格行）/ `linearized`（`列名: 值 | ...` 句子）。
  - 管线：`_split_by_headings`（tag 表格）→ 非表块 `_subdivide_oversized`（不变）→ 表块
        `_chunk_table_block` → `_merge_small_blocks`（表块已原子不拆）。`chunk_markdown:148`
        统一枚举保 `chunk_index` 连续、`chunk_id={doc_id}#NNNN`。
  - chunker 需读到 `card_mode`：经 `chunk_markdown` 新增可选参 `card_mode="markdown"`，worker
        调用点从 `get_app_config().rag.table.card_mode` 传入（worker 仅传参、无逻辑分支）。
- Test: `backend/tests/knowledge/test_chunker.py`（**最大测试面**：表头在每个行组 chunk 重复；
      小表单块；超宽行不中切；内嵌表继承 heading_path；Excel sheet 名进 heading_path；代码
      fence 内 `|` 不判为表；残留单行 HTML `<table>` 整块保留不中切（fixture 取 Task 0 实测输出）；
      card_mode 两态逐字钉死冻结模板（spec §7）；溯源说明行仅多块拆分带；
      chunk_index 连续 + id 合规 `[0-9a-f]{32}#\d{4}`；**非表格散文回归逐字不变**守现有行为）

- [x] RED → Implement → GREEN → revert proof（摘表头重复 → 「每块含表头」用例 RED；摘表格检测
      → 表块回落硬切、散文回归恒绿）。—— 15 条新用例 RED（`is_table`/`_chunk_table_block`/`card_mode`
      未定义）→ 引入 `_Block` + 表格检测 + `_chunk_table_block` + `chunk_markdown(card_mode=)` + worker
      接线 → `test_chunker.py` **29 passed**、`tests/knowledge` 全量 **1040 passed/3 skipped/0 failed**
      （6m02s，+17 无回归）、ruff 双净；revert proof 同时 neuter 表头重复 + 表格检测 → **8 RED / 21 绿**
      （散文回归 + 现有 12 例 + fence/孤 pipe/provenance/超宽行/linearized 恒绿）→ 恢复 29 passed。
- [x] Commit: `feat(rag): table-aware chunking with header-anchored row groups`（`3352461b`）

### 交付纪要（2026-09-10）

- **plan↔代码结构不符（用户确认走 Option A，偏离 plan 字面）**：plan Task 4 假设 chunker 有 `_Block`
  dataclass（`.is_table`/`.text`）、heading 归 `heading_path`（不入 text）、`_HEADING_RE` 支持 `#{1,6}`、
  有 `page_map`；**实际** `chunker.py` 全程用 `(path, text)` 元组、heading **在 text 里**、`_HEADING_RE`
  仅 `#{1,2}`、无 `page_map`（`Chunk.page` 恒 None）。照 plan 字面实现会破坏现有 12 例（如
  `test_oversized_block_subdivided_by_paragraph` 断言 `text.startswith("## 1.2 …")`）。故引入轻量
  `_Block(path, text, is_table=False)` 把元组管线换成它、**保留实际分块语义**（H1/H2、heading-in-text、
  path 逻辑），现有 12 例仅用公共 `chunk_markdown` → 透明不变；plan 的 Step 4.1 新测试按原样可跑。
- **实现落点**（`chunker.py`；动 `chunker.py` + `worker.py` 一行接线，**未动 pyproject/lock**）：
  - `_split_by_headings` 改索引式 while 循环（保留 fence/heading 语义），新增两支表格检测：GFM 管道表
    （行 `_GFM_ROW_RE` + 次行分隔 `_GFM_DELIM_RE` 双条件，fence 内不触发）→ 收连续管道行为一原子
    `is_table` 块；残留 HTML `<table`（MinerU 整表压一行）→ 深度计数配平 `</table>` 整段作原子块。
  - `_subdivide_oversized`/`_merge_small_blocks` 对 `is_table` 块透传（不硬切、不合并、不被合并）。
  - `_chunk_table_block(path, header, delimiter, rows, max_tokens, card_mode)`：贪心行组（表头计入每组）；
    **每块重复表头+分隔**；多块拆分每块顶加溯源行 `表格：{名}（第 {起}-{止} 行 / 共 {N} 行）`（名取
    `path[-1]`）；`card_mode` 两态 markdown（GFM 行）/ linearized（`列名: 值 | …`）；退化：单行+表头超
    cap 时整行单独成块**绝不中切**。
  - `chunk_markdown(…, card_mode="markdown")` 新增可选关键字参；路由 GFM 表块 → `_chunk_table_block`、
    残留 HTML 表块 → 原样原子（绝不 `_hard_split_tokens`，§7.3）、散文 → 原逻辑；`chunk_index` 统一
    enumerate 连续、`chunk_id={doc_id}#NNNN` 不变。
  - worker `_reparse_and_chunk`：`card_mode = get_app_config().rag.table.card_mode` → 传入
    `chunk_markdown`（仅传参、无分支；`.md` 等散文文档 card_mode 被忽略）。
- **顺带修 H2-only heading_path 累积**（服务「Excel sheet 名进 heading_path」）：原 `path[:1] + [title]`
  假设 path[0] 是 H1；Excel 每 sheet 是同级 `## {sheet}`（无 H1），第 2+ sheet 会累积成
  `["Sheet1","Sheet2"]`。改为显式跟踪 `h1`：H2 有 H1 父 → `[h1, title]`、无 H1 → `[title]`（各 sheet
  独立根）。对现有「H1→H2」文档逐字等价（现有 12 例均有 H1 父，不受影响）。
- **测试面**：17 例——GFM 表原子检测 / fence 内 `|` 不判表 / 孤立 `|` 行（次行非分隔）不判表 / 残留
  HTML 原子（含超 cap 不硬切 + Task 0 实测单行 fixture）/ `_chunk_table_block` 小表单块·大表表头重复·
  溯源行·超宽行不中切·linearized / `chunk_markdown` card_mode 透传·page 恒 None·内嵌表继承 heading_path·
  Excel sheet 名进 path·chunk_index 连续 / 散文回归不误判。
- **遗留（未动，非本任务）**：`tests/test_rag_config.py` vlm_model 漂移、uv.lock tenki 再生（同 Task 3
  纪要，knowledge 目录外/repo-wide 预存）。残留 HTML 表原子块即便超 cap 也整块保留（§7.3 明确取舍，
  优于现状从 `<td><p>` 中切的损坏）。

## Task 5: worker 兼容性验证 + eval 接入（spec §3/§9）

**Files:**
- Verify: `backend/packages/harness/deerflow/knowledge/worker.py`（文本腿零改动即处理表格文档：
      `path_status` 仍三腿 `{vector,graph,wiki}`、无新腿；`_reparse_and_chunk:432` 仅在
      `chunk_markdown` 调用处传 `card_mode`；`_is_video_path` 分支**不**新增表格类比）
- Create: `backend/tests/knowledge/eval/test_table_eval.py`（真实 store 建 fake 表格 KB：.csv/
      .xlsx 文档 → 行卡 chunk，用生产 `chunk_markdown` 组装 → 跑 `run_layer1_for_kb` + stub
      searchers → 断言 ①行卡 chunk_id 过 `add_question` golden 校验（零 schema 改造）②
      recall@k/hit_rate/path_accuracy 有数）
- Create: `backend/docs/table-kb-question-authoring.md`（按列值提问型 / 跨行聚合型不可锚定说明 /
      card_mode 消融对比流程，镜像 `video-kb-question-authoring.md`）

- [x] RED → Implement → GREEN。（表征测试 naturally GREEN + revert proof 补牙：neuter
      `chunk_markdown` 生成不合规 id → `validate_question` 抛 `QuestionBankInvalidQuestion` →
      用例 RED → 恢复，对齐视频 Task 11 手法）—— `test_table_eval.py` **2 passed**（naturally
      GREEN：行卡 chunk_id 过 golden 校验 + recall@k/hit_rate/path_accuracy=1.0）；revert proof
      neuter `{index:04d}`→`{index}` → **2 RED**（`QuestionBankInvalidQuestion: …got '…#0'`）→
      恢复 chunker.py git-clean；`tests/knowledge/eval` 全量 **326 passed**、ruff 双净。
- [x] Commit: `docs(rag): table KB question authoring guide and eval integration test`（`36241083`）

### 交付纪要（2026-09-10）

- **纯验证 + 新增（无生产代码改动）**：Task 5 不动任何生产逻辑——worker 文本腿的 card_mode
  接线已在 Task 4 落地、chunker.py revert proof 后 git-clean。仅新增 1 测试 + 1 指南。
- **worker 文本腿零改动核实（spec §3）**：`_is_video_path`（后缀 ∈ `VIDEO_UPLOAD_SUFFIXES`
  = `{.mp4,.mov,.mkv,.webm}`）是视频/文本腿的**单一判据**；表格后缀（.csv/.xlsx/.tsv ∉ 视频集）
  → 落**文本腿** `_reparse_and_chunk`，`path_status` 仍三腿 `{vector,graph,wiki}`、**无新腿**、
  **无 `_is_video_path` 的表格类比**；`_reparse_and_chunk` 唯一改动是 Task 4 的 card_mode 透传。
- **`test_table_eval.py`（镜像 `test_video_eval.py`）**：真实 store 建 fake 表格 KB——一个 `.csv`
  文档走生产 `parse_document`（永远开启、不受门控）归一、一个 `.xlsx` 文档走生产
  `_workbook_rows_to_markdown`（纯函数，避开 calamine/门控）组装，二者均用生产 `chunk_markdown`
  切成行卡入库（字段口径同 worker insert）；跑生产 `run_layer1_for_kb` + stub searchers。断言
  ① 全部行卡 chunk_id 过 `add_question`→`validate_question` 的 `<32-hex>#NNNN` golden 校验
  （零 schema 改造）+ CSV 大表切出 ≥2 行卡；② 锚定一张行卡 → recall@k/hit_rate/path_accuracy=1.0。
- **revert proof（对齐视频 Task 11）**：neuter `chunk_markdown` 的 `chunk_id={doc_id}#{index:04d}`
  → `{index}`（非 4 位补零）→ 两用例均 RED（`QuestionBankInvalidQuestion: relevant_chunk_ids
  entries must match '<doc_id>#NNNN', got '…#0'`）→ 恢复后 chunker.py 与 3352461b 逐字一致
  （git diff 空）。证明用例确实钉住「行卡 chunk_id 合规」而非空跑。
- **`backend/docs/table-kb-question-authoring.md`（镜像 video 版）**：§1 行卡结构 = spec §7 冻结
  模板（溯源行 + 重复表头 + 行组）；§2 三类造题——按列值提问型（可精确锚定单卡）/ 跨行聚合型
  （**不可锚定单卡、属降级语义**，spec §9：L1 单跳召回不覆盖全表，须列全相关卡否则 recall 被低估）/
  按表头列语义型（每卡重复表头的红利）；§3 golden 字段表格专用注意（含底纹表头失读不猜列名，
  spec §11）；§4 card_mode（markdown vs linearized）recall-test 消融流程；§5 代码/文档索引。
- **验证**：`tests/knowledge/eval` 全量 **326 passed**（含新 2 例，无 KB/fixture 冲突）、ruff 双净。

## Task 6: 前端表面层（spec §8）

**Files:**
- Modify: `frontend/src/core/knowledge/supported-formats.ts`（`FALLBACK_SUPPORTED_SUFFIXES:7-20`
      += `.xlsx`/`.xls`/`.tsv`；后端端点仍是真源）
- Modify: `frontend/src/components/workspace/knowledge/file-type-badge.tsx`（`KIND_BY_SUFFIX`
      加 `.tsv: "sheet"`，xls/xlsx/csv 已在 `46-48`；可选补 sheet 的 `MIME_SPECS` 拖拽 accept）
- Verify: `frontend/src/components/workspace/knowledge/chunk-card.tsx`（`MarkdownContent:214-219`
      渲染 GFM 表格为真表格——预期零改动；若 streamdown 默认 remarkPlugins 不含 gfm 表格则显式加）
- Test: `frontend/tests/unit/knowledge/*.dom.test.tsx`（markdown 模式行卡渲染为 `<table>`；
      `.tsv` 落 sheet 徽章；linearized 模式渲染为文本行）

- [x] RED → Implement → GREEN（`pnpm check` 双净）→ revert proof（stash 实现文件、留测试 →
      RED 同初始形；散文 chunk 渲染回归恒绿）。—— 初始 RED **3 failed**（suffix 列表×2 + `.tsv` 徽章）
      / dom 渲染用例 naturally GREEN（零改动验证）→ 实现后 3 文件 **30 passed** + `pnpm check` 双净；
      revert proof stash 两实现文件 → **4 RED**（suffix×2 + badge×2，同初始形）/ dom 渲染 3 例恒绿
      → `git stash pop` 恢复 30 passed。
- [x] **prettier 陷阱**（对齐视频 Task 10 教训）：prettier 非本仓门禁、勿跑 `--write`，
      `pnpm check`（eslint+tsc）才是；匹配周围风格即可。—— 已避：未跑 prettier，仅 `pnpm check` 作门禁。
- [x] Commit: `feat(frontend): spreadsheet suffixes and native GFM table rendering in chunk cards`（`32c6b271`）

### 交付纪要（2026-09-10）

- **纯前端表面层（近零改动，spec §8）**：`chunk-card.tsx` **零改动**——核实 `MarkdownContent`
  默认 `remarkPlugins = streamdownPluginsWithoutRawHtml.remarkPlugins`，其 `sharedRemarkPlugins`
  含 `[remarkGfm, {singleTilde:false}]`（`core/streamdown/plugins.ts`），GFM 管道表**原生渲染为真
  `<table>`**；ChunkCard 的 `components` 只覆写 `img`、不动 table/td/th。故 plan 的「若不含 gfm 则显式加」
  分支未触发。
- **实现落点**（2 文件小改 + 1 新 dom 测试）：
  - `supported-formats.ts`：`FALLBACK_SUPPORTED_SUFFIXES` += `.tsv/.xlsx/.xls`（后端 `/supported-formats`
    端点仍是真源、门控开启才返回并集；fallback 仅镜像作端点未达时的乐观客户端守卫，spec §8）。
  - `file-type-badge.tsx`：`KIND_BY_SUFFIX` += `.tsv: "sheet"`（xls/xlsx/csv 已在）；`MIME_SPECS` sheet 项
    += `text/tab-separated-values` + `.tsv`（拖拽 accept，plan 可选项）。
- **测试面**（node/dom 分环境，遵 AGENTS.md「不渲染的测试不进 dom」）：
  - node：`supported-formats.test.ts` 精确列表 += 3 后缀 + 专测 spreadsheet 后缀在 fallback；
    `file-type-badge.test.ts` DESIGN_ROWS sheet += tsv + `kindFromMime("text/tab-separated-values")==="sheet"`。
  - dom（新 `chunk-table.dom.test.tsx`）：markdown 行卡 → 真 `<table>`（th 含列名 / td 含值）；
    linearized 行卡 → 无 `<table>`、文本行原样；散文 chunk → 无表格、正文回归。
- **验证**：3 文件 **30 passed**；`pnpm check`（eslint+tsc）**双净**；revert proof stash 两实现文件 →
  **4 RED**（suffix×2 + badge×2）/ dom 渲染 3 例恒绿（证 chunk-card 零改动、渲染独立于 fallback/badge）
  → `git stash pop` 恢复 30 passed。KaTeX quirks-mode warning 为 happy-dom doctype benign 提示，与本任务无关。

## Task 7: 收官——全量回归 + 浏览器实测 + 指南落档

- [x] 后端 `pytest tests/knowledge -q` 全量 GREEN + `ruff check/format` 双净；前端 `pnpm check`
      双净 + knowledge 套件对基线（仅预存无关失败，如 chat-panel model selector / umap）。
      —— 后端 **1042 passed / 3 skipped**（+2 = Task 5 的 test_table_eval；3 skip 为 funasr/calamine
      真实供应端守门）；ruff check **All checks passed** + format 我的文件全净（`tests/knowledge/tools/
      test_graph_search.py` 的 format 漂移为 acabd069/2026-09-05 预存、非本特性，同 test_rag_config 漂移例，未动）。
      前端 knowledge 套件 **999 passed / 1 failed**（唯一失败 = chat-panel model selector，aa02a307/2026-09-08
      预存、plan 已预言的基线）；`pnpm check`（eslint+tsc）**EXITCODE=0** 双净。
- [x] 浏览器实测：上传真实 `.xlsx`（多 sheet）+ `.csv` + 一份含表格的 PDF（补验 Task 0 实测门）
      → 五态到 ready → 切片抽屉行卡**渲染为真表格且每块含表头** → 对话检索命中正确行 →
      检索测试命中行卡 → 评测跑一轮表格 KB；核对 chunk_count 合理（无行爆炸）。截图落 `pr-build/`。
      —— **延后（环境未就绪，用户选定先提交文档+回归）**：探测得 nginx:2026 未起（仅 gateway:8001 在跑）、
      `config.yaml rag.table.enabled=false`、`python-calamine` 未装；真实入库到 ready 还需 embedding/MinerU
      keys + Qdrant:6333。待环境就绪作为独立步骤补，届时 commit 补 smoke evidence。
      —— **2026-09-23 已补做（用户本机真栈，KB「测试2」）**：三件全部 `ready 100%`；抽屉 3 张真 `<table>`、
      行组重复表头（31 行 + 9 行同表头）；对话「SKU-1001 → 128 / 399」、召回面板向量通道 #1 = 该行卡 0.938；
      完整评测一轮（事实 n=2 全 100%）；chunk_count xlsx=3 / csv=2 / pdf=1 无行爆炸。
      证据落 `pr-build/table-smoke-2026-09-23/`（窗口隐藏 ⇒ 截图不可用，以 DOM/JSON 快照替代，口径见其 `notes.md`）。
- [x] Modify: `backend/AGENTS.md`（`### Knowledge Base / RAG` 小节补「表格入库」段：门控
      `rag.table.enabled` + `TABLE_UPLOAD_SUFFIXES` / parser 归一 CSV-TSV-Excel-MinerU 表格 → GFM /
      chunker 行组 + 重复表头 + card_mode 消融 / 无新 store 表无新腿 / chunk_id 扁平序进 L1）。
      对齐 orientation-layer 原则（模块+职责+契约口径，不含 commit hash/RED-GREEN/验收清单）。
      —— 已补：**Table ingestion** 段（与 **Graph path online flow** 平行），事实已逐一核实源代码
      （`TABLE_UPLOAD_SUFFIXES`/`table_ingest_enabled` 降级关/`_parse_excel` 延迟 calamine + 清晰 ValueError/
      `_workbook_rows_to_markdown` 每 sheet GFM）。
- [x] Commit: `docs(rag): sync agent guide for table ingest`（doc-only；smoke evidence 随实测延后补）

### 交付纪要（2026-09-10）

- **自动化收官全绿**：后端 `tests/knowledge` **1042 passed / 3 skipped**（ruff check 全过、format 本特性文件全净）；
  前端 knowledge 套件 **999 passed / 1 预存无关失败** + `pnpm check` 双净。Task 0-6 零回归。
- **文档同步**：`backend/AGENTS.md` 的 `### Knowledge Base / RAG` 补 **Table ingestion** 段（门控+后缀集 /
  parser 归一四源→GFM / chunker 行卡+重复表头+溯源行+card_mode 消融 / 无新 store 表无新腿 /
  chunk_id 扁平序零改造进 L1），严格 orientation-layer 口径（无 hash/RED-GREEN/验收清单）。
- **预存无关项（未动、非本任务）**：`test_graph_search.py` ruff format 漂移（acabd069）、chat-panel
  model selector 前端失败（aa02a307）、`tests/test_rag_config.py` vlm_model 漂移——均先于本特性。
- **浏览器实测延后**（用户选定）：环境未就绪（nginx 未起 / 门控关 / calamine 未装 / 需 keys+Qdrant）；
  就绪后作为独立步骤跑，届时补截图到 `pr-build/` 并 commit smoke evidence。

## 风险登记（实施期新增即补此行下表）

| 风险 | 触发任务 | 缓解 |
|---|---|---|
| ~~MinerU 云 API v4 表格输出 HTML 而非 GFM~~ **T0 已实测坐实（非风险、是事实）** | T0 已关 / T2 承接 | 归一器升格为必需路径；两形态 + 行宽补齐 + span/空单元格双表达已冻结进 spec §5；chunker 残留 HTML 原子块防御仍做 |
| MinerU 对底纹/反白表头识别失败 → 表头整行为空 `<td></td>`（T0 实测） | T2/T4 | 上游保真度损失，不猜列名；退化为无列名行组，仍优于现状硬切（spec §11） |
| `python-calamine` 依赖安装/平台轮子问题 | T3 | 延迟 import + 缺失降级；真实端到端 skipif；CI 用 fake 不装重依赖 |
| 超宽表单行 + 表头 > 1024 token | T4 | 整行保留不中切、容忍轻微溢出（优于现状中切丢表头） |
| 巨型电子表格行爆炸 → chunk 数暴涨 | T4/T7 | 行组按 token cap 打包；`max_size_mb` 门口限流；实测核对 chunk_count |
| 表格检测误伤散文中的 `|`（如 shell 管道） | T4 | 需满足「行 + 次行分隔行」双条件 + 代码 fence 守卫；散文回归用例钉死。**T0 实测收窄**：MinerU 不会把散文里的 `|` 变成表格，风险面仅来自用户 authored `.md` |
