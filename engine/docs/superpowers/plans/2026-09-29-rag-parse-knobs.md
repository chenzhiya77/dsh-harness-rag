# 解析的三个旋钮 —— 实施计划

> ⚠️ **2026-09-30 改判：第四个旋钮（`rag.video.ocr_lang`，代号 A-3）已撤销**——屏幕文字改走 `rag.vlm_model`（详见 spec 的「A-3 的撤销与替换」）。**本文件里凡提到 `ocr_lang` 的条目一律作废**（下面已就地划线标注），实施时按 spec 那一节做。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 每个 Task 走完 RED → GREEN → neuter → revert proof → 门禁 再进下一个；「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-09-29-rag-parse-knobs-design.md](../specs/2026-09-29-rag-parse-knobs-design.md)
**Status:** **2026-09-30 已交付**：Task 0–5 全部完成，复选框 **33／33**。**①＝乙**（服务地址**复用既有 `parse_base_url`**、界面标题改「服务地址」）／**②＝乙**（**两个**新控件进设置界面）；**A-3（OCR 语种）已于 2026-09-30 撤销**（屏幕文字改走 `rag.vlm_model`，不随本对交付，见 spec「A-3 的撤销与替换」）。**本对唯一的行为变化**＝`parse_base_url` 的语义扩大（spec §6.2 首条；云腿下从「被忽略」变「生效」）——真栈已具名验证（Task 4 实测）。实施提交 `5bea5cfe`（T1 后端）／`80fe8c01`（T2 前端）／`d231e430`（T3 模板与文档）／`5dc512f1`（T4 真栈），Task 5 交付回写为本笔（**均未推送**）。真栈阶段未读改任何用户配置，`config.yaml`／`rag_config.json` 已逐字节还原（见 Task 4 实测）。
**相关基线:** [盘点档](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 2」＝本对；**A-3 已于 2026-09-30 撤销**（余 `A-2` + `A-6` + `A-5`）；[2026-09-24 MinerU 4.x 那一对](../specs/2026-09-24-mineru-4x-parse-adaptation-design.md)（本地腿，明写「mineru-cloud 零改动」）；[2026-09-08 视频入库](../specs/2026-09-08-video-ingest-design.md)（A-3 所在腿）。

**Architecture:** `config.yaml → RagConfig`／`rag_config.json → RagConfigFile → merge → AppConfig.rag`；**两个新字段**挂两层，另**扩大既有 `parse_base_url` 的语义**（云腿也读它，空则退官方常量）。**两个消费点**各自**现取配置**：云腿 `parser.py`（请求体的 `language`／`model_version` 与 URL 主机）——~~视频 ocr `video/ocr.py`（`PaddleOCR(lang=…)`）~~ **2026-09-30 撤销**（该消费点已消失）。响应侧靠 `_build_response` 反射（② 已裁乙，golden 同批）。**除 `parse_base_url` 语义扩大这唯一例外外**，不声明时余下三项行为逐字节不变。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| A-2 | `rag.parse_language`（Literal 16 值，默认 `"ch"`）＋ 云腿请求体接线 | 改默认语种；语言枚举的远端同步 |
| A-5 | `rag.parse_model_version`（Literal `pipeline`/`vlm`，默认 `"vlm"`）＋ 云腿请求体接线 | 改默认档（留白）；`MinerU-HTML` 档 |
| A-6 | **复用既有 `rag.parse_base_url`**（语义扩为"当前解析服务的地址"；云腿空＝官方常量）＋ 云腿两处拼 URL；**登记行为变化** | 为云腿新开字段（① 已裁乙）；改它的类型与默认值 |
| ~~A-3~~ | ~~`rag.video.ocr_lang`（str，默认 `"ch"`）＋ 引擎构造传参~~ **2026-09-30 撤销**（改走 VLM；见 spec「A-3 的撤销与替换」） | ~~装 PaddleOCR；校准 `_lines_from_paddle`~~ **一并作废** |
| D3 | 界面（② 已裁乙）：解析区两新行（**云分支可编辑、本地分支锁定孪生**）＋ 地址行改标题 ＋ provider 行 ⓘ 改说明 ＋ ~~视频区一行~~（**2026-09-30 撤销**，A-3 已废） | 新卡片、卡片标题/ⓘ、`parse_provider` 开关本身、`parse_tier` 行 |

**待裁：无**（spec §6.1 ①② 均已裁＝乙：① 复用既有 `parse_base_url`；② 两个新控件进设置界面）。全文按 ②＝乙 有效；若日后改口为甲，Task 1 的「响应形状/golden」与整个 Task 2 移出（`parse_base_url` 的语义扩大不受影响），其余不变。

## 硬约束

- **默认值全部保持现状**（**唯一例外＝`parse_base_url` 的语义扩大**，① 裁乙）：余下三项在不声明时与今天逐字节相同（每条的**负向对照**都要有正向执行证据，不是"看起来没坏"）；那条例外必须另有一条**正向**用例钉住（设了地址 ⇒ 云腿真的打到那里）。
- **被改语义的既有字段只有一个**：`parse_base_url`（类型／默认／两层位置都不动）；`parse_tier`／`parse_provider`／`asr_*` 一行不动。**这条行为变化要登记**（Task 3 的盘点档 A-6 行 ＋ Task 5 回写），不许静默。
- **~~三个~~两个消费点同批**：云腿两处（请求体、URL）都经 `build_parse_provider` 的云侧 kwargs（**2026-09-30 由三处收窄**——视频消费点随 A-3 撤销已消失）；只改一处＝半个旋钮。
- **不新增机制**：不造校验、不造异常、不动 `MODEL_REFERENCE_FIELDS`（非模型引用）、不动保存期检查与掩码/原子写。
- ~~**不装 PaddleOCR**~~ **2026-09-30 撤销**：屏幕文字改走 VLM ⇒ 不再有"装引擎"这件事（spec 同节）。
- **共享组件（`app_config.py`／`rag_config_file.py`／前端三件套）改完必须跑全量**。

## 执行纪律

- 当前分支 `feat/rag-knowledge-base`。起草轮只写文档、不据此开工；实施按 **RED → GREEN → neuter（行为还原并记录受害者）→ revert proof → 门禁** 执行；提交／推送按届时明确授权，使用 Conventional Commits。
- 后端在 `backend/` 用 `PYTHONIOENCODING=utf-8 .venv/Scripts/python -m pytest <path>`；ruff 用 `uv run --no-sync ruff check` 与 `uv run --no-sync ruff format --check`（不用裸 `uv run`／`uv sync`）。
- 前端在 `frontend/` 用 `PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`。
- 单测显式绑定临时配置；**云腿用例用 `MockTransport` 拦网**（不真发 MinerU）；~~视频屏幕文字腿的用例改打 `MockTransport`（VLM 路线，PaddleOCR 已退场）~~ **2026-09-30 撤销**（那批用例归 VLM 路线自己，不在本计划）。
- 真栈只允许临时改 **RAG 配置**；`rag_config.json` 与 `config.yaml` 先存档字节、成功/失败均逐字节还原；只清理本次创建且可确定 ID 的资源。
- **找会被影响的既有断言按界面词汇与数据字段两把扫**（`parse_`／`asr_`／`解析档位`／`解析提供方`）。

**依赖顺序**：Task 0（只读核实）→ Task 1（后端两新字段＋`parse_base_url` 语义扩大＋云腿两处）→ Task 2（前端，② 已裁乙）→ Task 3（示例/版本/文档）→ Task 4（真栈）→ Task 5（回写）。Task 1 与 Task 2 之间不发布（只发 Task 1 会让 GET 多两键而前端不认）。**与 ASR 服务档那一对的串行（spec §5.2）**：它的写码任务（当前 Task 1 在飞，还剩 Task 1–4）先落地，本对的 **Task 1–3 排其后**——共享七处（两层配置／router 的 GET ＋ `_ADDED_FIELDS`／`response_golden.json`／`test_rag_config_api.py`／视频区 JSX ＋ i18n 三文件／同份 dom 用例／`config.example.yaml`）；本对 Task 0 的「golden 重数 ＋ 断言扫描」两项也等它落地后再做（其余四项不受影响）。**若它先 bump `config_version`，本对顺延 41 → 42**。

---

## Task 0 — 只读核实与基线捕获

- [x] **四个落点复核（按符号，不按行号）**：`parser.py::_apply_upload_url` 的请求体与签名、`_poll_result` 的 URL 拼接、`MINERU_BASE_URL` 的全部使用点；`build_parse_provider` 的 `if/else` 两侧 kwargs；`parse_document` / `MineruCloudParser.__init__` 的签名默认；`video/ocr.py::PaddleOcrEngine._engine` 与 `ocr_frame`；`worker._video_ocr_leg` 的调用形状。确认「谁取配置、谁传参、谁捕获错误」并记下现状。
- [x] **既有形状取样（逐字）**：`RagConfig` 的 `parse_tier`／`parse_base_url`／`video.asr_model`（`app_config.py`）与 `RagConfigFile` 对应字段的类型/默认/描述句式；前端 `config-form.ts` 的类型、`TEXT_FIELDS`、枚举清单、`formValuesFromConfig` 四处对 `parse_*` 的处理；`functional-models-view.tsx` 解析区（`:1720-1776`）与视频区（`:1455-1705`）的行结构；i18n 三文件的键名与空选文案。
- [x] **响应 golden 基线**：当场重数 `backend/tests/fixtures/rag_config/response_golden.json` 的键集（`get.config`／`get.sources`／`put.*`），作为双向差集基线（② 已裁乙，会用到）。
- [x] **断言扫描（两把扫）**：按数据字段（`parse_language`／`model_version`／`ocr_lang`／`parse_base_url`）与界面词汇（`解析提供方`／`解析档位`／`解析语种`／`屏幕文字`）各扫 `backend/tests` 与 `frontend/tests`，列出会被影响的既有用例。**已知四位（2026-09-29 审查点名，Task 0 只需确认仍在；行号已按 HEAD `34f4940e` 更新）**：`functional-models-view.dom.test.tsx:372-381`、同文件 `:383-391`、`config-form.test.ts:136`、`test_parse_local.py:410-424`（环境依赖型）；~~另 `test_ocr.py:61` 会因 `PaddleOcrEngine(lang)` 改必填而受影响~~（**2026-09-30 撤销**：A-3 已废、该文件随 VLM 路线重写）。
- [x] **碰撞面（2026-09-29 升级：从"文档在飞"到"代码在飞"）**：**ASR 服务档那一对已开工且代码在飞**（未提交：`test_rag_config_api.py` 的 `asr_providers`／顶层 `asr_base_url`／`asr_api_key`，`test_rag_provider_config.py` 在扩 `asr` 腿）⇒ **开工前核它是否已落地**；落地后**重数 golden 键集、重扫断言**（本 Task 的这两项按新基线做，其余四项不受影响）。共享七处与串行约束见 spec §5.2。对 1（已交付）为加法，无冲突。
- [x] **云腿请求形状的现行证据**：用临时配置 ＋ `MockTransport` 捕一次今天的请求体（`language`/`model_version`/URL 主机）存作对照，供 Task 1 的"逐字节相同"负向对照使用。

**实测（2026-09-29 完成，只读核实；生产代码零改动、未提交）**：

**性质与基线**：Task 0 是**只读核实**，无 RED／neuter（plan 纪律明写不伪造这两类数字）。基线 HEAD `34f4940e`——ASR 服务档那一对**已收官**（plan 22／22 全勾、其代码已在 HEAD、工作树无该线在飞文件）。**用户真实配置一份没读**：全部探针走临时三件套（见 ⑥）。

**① 四个落点复核（按符号；行号仅作当时参考 —— ASR 线已让 worker 那处漂移）**

| 腿 | 谁取配置 | 谁传参 | 谁捕获错误 |
| --- | --- | --- | --- |
| 云腿请求体 | **今天无处取**（`language` 是 `:387` 的字面量） | `_apply_upload_url(client, *, file_name, data_id, model_version, token)`（`:383`）← `MineruCloudParser.__init__`（`:686`）→ `parse()`（`:701`） | 调用方（保存期构造不触网） |
| 云腿 URL | **今天无**（模块常量 `MINERU_BASE_URL` `:54`） | 两个函数各自拼：`:385`（申请）／`:406`（轮询） | 同上 |
| 云腿档位默认 | **三层签名默认** `"vlm"`（`:686`／`:722`／`:756`） | `build_parse_provider` 的 `if/else`：本地 `:743` `base_url`／云 `:746` `model_version` | —— |
| 视频 OCR | **今天无**（`PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)` `ocr.py:57`） | `ocr_frame`（`:84`）建默认引擎（`:90`）；`worker._video_ocr_leg`（`:676`）**每帧**调（`:684`；该腿入口 `:629`） | `PaddleOcrEngine.recognize` 的宽捕获 → 空串（`:48-50`） |

**② 既有形状取样（逐字）**：`RagConfig.parse_base_url: str | None = Field(default=None, …)`、`parse_tier: Literal["flash","basic","standard","advanced"] | None`（`app_config.py:216-222`）；`RagVideoConfig.asr_model: str = Field(default="paraformer-zh", …)`（`:157`）。`RagConfigFile` 同三字段全 `| None`（`rag_config_file.py:149-151`）、`RagVideoFileConfig.asr_model: str | None`（`:111`）。前端：类型 `config-form.ts:58-63`（`parse_provider`／`parse_base_url`／`parse_tier` ＋ `video.{asr_provider,asr_model}`）、`TEXT_FIELDS`（`:120` 含 `parse_base_url`）、`SELECT_FIELDS`（`:136-137` 含 `parse_provider`／`parse_tier`）、`VIDEO_SOURCES`（`:140-143`）、`formValuesFromConfig`（`:181-186`）。视图：解析区 `:1720-1776`（`parseProvider` 行 ⓘ 在 `:1720`；本地分支 `:1733-1766`；云分支锁定孪生 `:1771-1776`）、视频区 `groupMultimodal` `:1455-1705`（caption 行 ＋ ASR 四行；后者用**共享可见词** `providerLabel`／`modelLabel`／`apiKeyLabel`／`endpointLabel` ＋ 各自 aria）。i18n：改的 2 键 = `parseBaseUrl`（`zh-CN:1751`）／`parseBaseUrlHint`（`:1752`）；空选项文案家族 = `parseTierAuto`（`:1754`，视图 `:829` 的 `"": F.parseTierAuto`）／`sparseProviderNone`（视图 `:840`）／`judgeModelNone`（`zh-CN:1762`）等。

**③ 响应 golden 基线（ASR 落地后重数）**：`get.config` **28**、`get.sources` **29**、`put.payload` **12**、`put.response.config` **28**、`put.response.sources` **29**。`_registered_additions` 里 ASR 已按 R19 同款补记（"…were added by hand (spec 2026-09-28 ASR service tier §3; same R19 reason…)"）⇒ ~~本对三键照同格式续一句；本对落地后应为 **31／32／12／31／32**~~ **2026-09-30 更正（A-3 撤销）**：本对**两键**照同格式续一句；本对落地后应为 **30／31／12／30／31**。

**④ 断言扫描（两把扫）**

- **数据字段轴**：后端 `test_rag_config_api.py`（全文键集守卫 `:842` 的 `set(body) == set(golden) | _ADDED_FIELDS` —— 本对两键在 `config`／`sources` 内层、不经过它（`_ADDED_FIELDS` 只登记响应顶层键）✓）、`test_parse_local.py`、`test_rag_provider_config.py`、`test_rag_config_save_probe.py`、`test_rag_config_sparse_probe.py`、`test_embedder_providers.py`、`fixtures/rag_config/response_golden.json`；前端 `unit/rag/config-form.test.ts`、`unit/settings/functional-models.dom.test.tsx`。
- **界面词汇轴**：`knowledge/video/{test_ocr,test_recaption,test_shot_card,test_worker_pipeline}.py`、`knowledge/eval/test_video_eval.py`（「屏幕文字」是镜头卡第三行 —— 本对不碰卡片组装 ✓）；前端 `unit/knowledge/chunk-drawer.dom.test.tsx`、`unit/settings/functional-models.dom.test.tsx`。
- **确认为受害者（四位；原第五位 `test_ocr.py:61` 随 A-3 撤销、不再算）**：`functional-models-view.dom.test.tsx:372-381`／`:383-391`、`config-form.test.ts:136`、`test_parse_local.py:410-424` —— 与审查点名一致、仍在原位。

**⑤ 碰撞面**：ASR 服务档已落地（22／22、`34f4940e`）；共享七处与串行约束见 spec §5.2；它还在 `app_config.py:156-158` 留下同款 ①乙 注释（"The ASR leg's connection info sits here rather than inside `video:`…"）—— 与本对 §5.2 的边界句一致 ✓；落地后的「重数 golden ＋ 重扫断言」已在本段完成。

**⑥ 云腿请求形状的现行证据（今日基线，捕获于临时三件套）**

`DEER_FLOW_CONFIG_PATH`＝`config.example.yaml` 的副本、`DEER_FLOW_MODELS_CONFIG_PATH`＝`{"models":[]}`、`DEER_FLOW_RAG_CONFIG_PATH`＝`{}` ＋ `MockTransport` ⇒ 捕获一次：

```
POST https://mineru.net/api/v4/file-urls/batch
Authorization: Bearer <token>
{"files": [{"data_id": "probe", "name": "probe.pdf"}], "language": "ch", "model_version": "vlm"}
```

**⚠ 隔离姿势（Task 1 新用例必须照办）**：`ModelsConfig`／`RagConfigFile.resolve_config_path` 有 **`__file__` 回退**（editable 安装 ⇒ 直指**仓库根**）⇒ 只设 `DEER_FLOW_CONFIG_PATH` 不够，三个 `DEER_FLOW_*_PATH` 都要指到临时文件，否则会合并**真实** `models_config.json`／`rag_config.json`（首次探针就这么撞上：校验错误里出现了不在临时配置里的真实模型）。

**Task 0 新出发现（已就地回写 spec／plan）**

1. **i18n 是 8 键不是 6 键**：两个新 `OptionSelect` 各需一个**空选项标签**键（既有家族：`parseTierAuto`／`sparseProviderNone`／`judgeModelNone`）⇒ spec D3 与 plan Task 2 已改为 **8 键 × 3 文件 ＝ 24 处**（文案仍沿用「（使用配置默认）」）。
2. **视频区锚点过期**：`groupMultimodal` 真实边界 **`:1455-1705`**（原引 `:1428-1510` 只盖到开头）⇒ 已改。
3. `worker._video_ocr_leg` 行号已漂（原记 `:664-673` → 现 `:676-684`）—— 按符号无碍，仅记录。

**遗留**：**Task 0 已提交 `1538657b`；Task 1 实施中（未提交）**，Task 2–5 待授权（**A-3 那部分已于 2026-09-30 撤销**）。

---

## Task 1 — 后端两新字段、`parse_base_url` 语义扩大与两个消费点

> 文件：`config/app_config.py`、`config/rag_config_file.py`（② 已裁乙）、`knowledge/parser.py`、`backend/tests/…`、`tests/fixtures/rag_config/response_golden.json`（② 已裁乙）。（原列的 `knowledge/video/ocr.py` ⚠️ **2026-09-30 移出本 Task**——那一格随 A-3 一并撤销。）
> **验收对应**：spec §4 的 1 / 2 / 4 / 6（第 3 条是视频腿、已随 A-3 撤销）。

- [x] **RED：加载链**：无覆盖 ⇒ 两个新字段取默认（`"ch"`／`"vlm"`）；`parse_base_url` 为空 ⇒ 云腿退官方常量；文件层覆盖生效、撤销回到 config.yaml；非法 Literal ⇒ 422。不经"直接构造 `AppConfig(...)`"代替。
- [x] **RED：云腿请求体（`MockTransport`）**：`language`／`model_version` 来自配置且为顶层批参数；**`parse_base_url` 非空 ⇒ 请求打到该主机（正向）**、为空 ⇒ 与 Task 0 捕的请求体逐字节相同（负向对照）。**负向对照落在既有守卫 `test_parse_local.py:410-424`（`host == "mineru.net"`）上**——它的 `_stub_config` 会**继承真实配置**（今天靠"云腿忽略该字段"侥幸绿）⇒ **先显式钉 `parse_base_url=None`**；正向用例照 `:389` 的写法 `_stub_config(..., parse_base_url="http://127.0.0.1:9999")` 看 host（夹具现成）。
- [x] ~~**RED：视频腿**：`ocr_lang` 被传到 `PaddleOcrEngine`（捕构造参数）；引擎缺失路径不变。~~ **2026-09-30 撤销**（A-3 已废）
- [x] **GREEN**：两层各加**两个新字段**（描述按各自那一层的邻居写；A-3 已撤）＋ **两层的 `parse_base_url` 描述都改成两态口径**（云腿留空＝官方；本地腿必填、不带鉴权）；`parser.py` 三个签名接 `language`／`model_version`／`base_url`（**`__init__` 侧必填、不再带字面默认**，上层 `None` ⇒ 读配置 ⇒ 地址再退官方常量；spec §3「签名默认不再是值的唯一来源」）；`build_parse_provider` 云腿分支传三个值（`model_version`／`language`／`base_url`＝`section.parse_base_url or MINERU_BASE_URL`）、本地腿不动；~~`video/ocr.py` 的 `PaddleOcrEngine(lang=…)` ＋ `ocr_frame` 现取配置~~ **2026-09-30 撤销**（A-3 已废）。**同一个提交**更新 golden（② 已裁乙）＋ **在它的 `_registered_additions` 补一句**（**两键**都是顶层 —— R19 先例）。（原写的"三键含嵌套 `video.ocr_lang`" **2026-09-30 撤销**。）
- [x] **neuter：整体还原旧行为**，逐项独立还原并证明 GREEN 恢复、各有对应用例转红：① 请求体回到字面 `"ch"`／签名默认 `"vlm"`；② URL 回到常量（**忽略 `parse_base_url`**）；~~③ 引擎回到字面 `lang="ch"`~~（**2026-09-30 撤销**）；④（② 已裁乙）文件层**两个**新字段改名（等效于不存在）⇒ 形状守卫转红；⑤ 两层 Literal 放宽为 `str` ⇒「非法值 422／加载硬报错」转红（2026-09-30 增，补那条的牙）。
- [x] **门禁**：ruff 双净；RAG 配置／解析窄面绿（视频腿的用例归 VLM 路线）；`app_config.py` 与 `rag_config_file.py` 是共享加载路径 ⇒ **跑后端全量**（后台执行，结果未回不报绿），与基线集合对照零新增。

**实测（2026-09-30；A-3 撤销后的收窄面）**

**RED／revert proof（同一批用例 × HEAD 生产码）**：三个生产文件先备份、`git checkout HEAD --` 后跑窄面（`test_rag_config_file`／`test_rag_config_api`／`test_parse_local`）⇒ **8 红／151 绿**（40.60s）：`test_a_parse_knob_overrides_config_yaml_then_undoes[parse_language／parse_model_version]`、`test_the_parse_knobs_default_when_nobody_declares_them`、`test_get_response_only_gained_the_capability_field`、`test_put_response_only_gained_the_capability_field`、`test_the_two_parse_knobs_round_trip_with_their_sources`、`test_cloud_request_carries_the_configured_language_and_model_version`、`test_cloud_request_follows_the_configured_service_address`；随后逐字节还原（md5 与跑前一致 ✓）。**如实记差**：两条负向用例（`test_cloud_request_is_byte_identical_when_nothing_is_declared`、两条 `test_an_out_of_enum_*`）在 HEAD 上也绿——前者本就钉"不声明＝旧行为"、后者因"字段不存在 ⇒ 同形 422／ValueError"；它们的牙由 neuter ⑤ 单独证。

**GREEN**：窄面 **159 passed**（49.63s）。**更宽窄面（16 文件：`test_rag_config*.py` 十件 ＋ 解析／模型目标／嵌入／provider 六件）**：**425 passed／6 failed**——6 条经 **A/B（同三文件回 HEAD）证明与本对无关**（失败集逐条相同）：`test_rag_config_probe.py` 四条（探针拿到 `unverifiable`、期望 `supported`／`unsupported`／401 与"不回显钥匙"）＋ `test_rag_config_save_probe.py` 两条（保存期文案与现行运行期文案不一致）——成因（环境或文案漂移）另行核对，不进本对结论。视频腿（VLM 路线、同树在飞）同时复核 **162 passed**。

**neuter（逐项独立；改 → 跑 → 逐字节还原 → md5 核对，全部 ✓）**：

| # | 还原的旧行为 | 受害者 |
| --- | --- | --- |
| ① | 请求体回到字面 `"vlm"`／`"ch"` | 1：`test_cloud_request_carries_the_configured_language_and_model_version` |
| ② | URL 忽略 `parse_base_url`（回常量） | 1：`test_cloud_request_follows_the_configured_service_address` |
| ③ | 文件层两新字段改名（等效不存在） | 50：golden 双守卫 ＋ `test_the_two_parse_knobs…` ＋ 各响应形状用例 |
| ④ | 两层 Literal 放宽为 `str` | 3：`test_an_out_of_enum_parse_knob_is_rejected_with_422` ＋ `test_an_out_of_enum_choice_is_a_loud_load_error[×2]` |

**门禁**：ruff 双净 ✓（`All checks passed!` ＋ `6 files already formatted`）；**后端全量**：**162 failed／12756 passed／160 skipped（15:21）**——**逐条对照零新增**：把 162 个失败 id 原样在 HEAD 生产码上重跑 ⇒ **162/162 逐条复现（0 passed）**，失败集合 ⊆ HEAD 既有集、本对零新增（均为本机环境基线类：`test_mcp_file_migration` 15／lark 两件 19／persistence 三件 16／probe 6 等；全量输出里 `parse_language`／`parse_model_version` **零提及**，本对三件测试文件零红）。

**实施期发现（三条，已就地回写）**：① `_VIDEO_FIELDS` 是显式清单、视频子块**不**反射 `model_fields`——原 `ocr_lang` 需要动 router 即因此；A-3 撤销后 **router 零改动**（spec §3／§5.1）。② **清空枚举的编码缺陷**：`""` ⇒ 422，`SELECT_FIELDS` 六个旧枚举字段"清不掉覆盖"；Task 2 改为 `null`（spec §6.2 末条）。③ `__init__` 侧三参定为**必填**、上层 `None` ⇒ 读配置（"签名默认不再是值的唯一来源"，spec §3）。

---

## Task 2 — 前端触点与解析区（② 已裁乙）

> 文件：`core/rag/types.ts`、`core/rag/config-form.ts`、`components/workspace/settings/functional-models-view.tsx`、`core/i18n/locales/{types,zh-CN,en-US}.ts`；用例 `tests/unit/rag/config-form.test.ts`、`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`（**2026-09-30 核实更正**：原写 `tests/unit/settings/…` 漏了 `components/workspace/` 段。同目录另有一份 `tests/unit/settings/functional-models.dom.test.tsx`：其 `:861-873` 取 `getAllByText(lockedLocalOnly)[0]`，云分支 2→1 后仍 ≥1 ⇒ 预期不受影响，实施时顺带跑一遍确认）。

> **2026-09-30 只读核实（准备轮；未写码，锚点复核于 HEAD `5bea5cfe`）**
> - 视图锚点全中：ⓘ 在「解析提供方」行 `:1720` ✓；`parse_tier` 可编辑行 `:1748-1762` ✓（照它做两个新 select）；云分支**地址锁定行 `:1770-1773`**（`LockedBox lockedLocalOnly`）、本地分支 `mineruToken` 孪生 `:1763-1766` ✓；解析区在 `groupServices`（`:1706`）内、**不在** `advancedSettings` 折叠区（`:1094-1324`；常量 `ADVANCED_SETTING_COUNT=6` 只数检索组）⇒ 加两行**不动**折叠计数、`openAdvanced()` 不受影响。
> - 断言现况与计划一致：云分支 `labelCount("parseBaseUrl")===0` ＋ `lockedLocalOnly===2`（`:376-380`）；本地分支单数 `getByText("lockedCloudOnly")`（`:387-390`）⇒ 改动后应为 `>0`／`1`／`getAllByText(...).length===3` ✓。
> - i18n 现况：`parseBaseUrl` zh-CN `:1751`／en-US `:1845`；`parseBaseUrlHint` `:1752`／`:1846`。**空选项文案取 `judgeModelNone` 那句「（使用配置默认）」**——`parseTierAuto` 是「（由服务决定）」、`sparseProviderNone` 是「（未选择）」，都不是本义。
> - 实施细节：两个新 `OPTIONS` 常量放 `config-form.ts` 的 `PARSE_TIER_OPTIONS`（`:94`）旁、由视图导入；两个新 select 各配一张小 labels 映射（照 `SPARSE_SERVICE_LABELS` 形：`"": 新键`），16 个语种与两个档位按 `parse_tier` 先例**直接显示原值**（`OptionSelect` 缺省回退 `labels[option] ?? option`）。清空编码缺陷的实测面＝`config-form.ts:297-303`（`writeField(input, key, next)` 原样写 `""`），既有用例**无一**钉住该行为 ⇒ 改 `null` 没有旧断言要改。

- [x] **RED：保存不丢字段**（B-1 形状的反向守卫）：两个新字段任一有文件层覆盖时，编辑无关字段后 `buildRagConfigInput()` 仍带它。
- [x] **RED：清空枚举的编码**（Task 1 实施期查出的既有缺陷，spec §6.2 末条）：「文件里有覆盖」的枚举被清空 ⇒ 载荷必须写 `null`（今天写 `""` ⇒ PUT 422）；两个新字段与六个旧 `SELECT_FIELDS` 走同一循环、同此路径。
- [x] ~~**RED：保存不可用也要防**：只改 `ocr_lang` ⇒ Save 必须可用~~ **2026-09-30 撤销**（A-3 已废；`hasFormChanges` 的 video 列表不动）。
- [x] **RED：读取映射**：`formValuesFromConfig()` 把两项（含 `null`/缺键）正确落成表单值。
- [x] **RED：界面结构**：解析区新增语种／版本两行——**云分支是可编辑控件、本地分支是同名的锁定孪生**（`lockedCloudOnly`）；**地址行标题为「服务地址」**（始终可编辑、**无**锁定孪生）；**两态 ⓘ 在「解析提供方」行**（`:1720`）；~~视频区多一行 `ocrLang`~~ **2026-09-30 撤销**；用 `aria-label` 与分组标题断言，不断言几何。
- [x] **RED：既有断言改写（不是放宽，2026-09-29 审查点名）**：~~`config-form.test.ts:136` 的 `values.video` 整对象相等 ⇒ 补 `ocr_lang` 键~~（**2026-09-30 不用改了**：`ocr_lang` 已废、video 形状回到两格）；`functional-models-view.dom.test.tsx:372-381` 云分支改成"地址行可编辑 ＋ `getAllByText("lockedLocalOnly").length === 1`"；`:383-391` 的 `lockedCloudOnly` 由**单数** `getByText` 改 `getAllByText(...).length === 3`。**⚠ 孪生行没有 aria-label**（照 `mineruToken` 孪生）而 `labelCount` 用 `queryAllByLabelText` ⇒ 孪生断言用 gutter 文本/计数，**别用 `labelCount`**（恒 0 ＝ 假绿）。
- [x] **GREEN**：**触点四处**（2026-09-30 由六处收窄——原 ③⑤⑥ 里的 `ocr_lang` 那半已撤）：① `types.ts` **两项**；② `config-form.ts` 表单值类型**两行**；③ `SELECT_FIELDS`（语种／版本）；④ `formValuesFromConfig` **两行**；~~`VIDEO_SOURCES`／video 自由文本循环（`:288`）／`hasFormChanges` 的 video 列表（`:677`）~~ **都不动**；＋ **清空编码 `""` → `null`**（`:297-303`，见上一条 RED——顺带修既有六个枚举字段）。视图**解析区**两行（语种/版本用 `OptionSelect`；**地址行只改标题**，`parseBaseUrlHint` 的两态口径改的是**「解析提供方」行的 ⓘ**（`:1720`））＋ i18n **新 6 键 × 3 文件**（四键角色标签/提示 ＋ **两个 select 的空选项标签 2 键**）＋ **改 2 键 × 2 语（`parseBaseUrl` 标题、`parseBaseUrlHint` 说明）**。
- [x] **neuter**：① 从各清单去掉两个新字段（`parse_language`/`parse_model_version` 在 `SELECT_FIELDS`）⇒ 保存不丢转红；~~①′／①″（`ocr_lang` 那两条）~~ **2026-09-30 撤销**；② 从 `formValuesFromConfig` 去掉两行 ⇒ 读取映射转红；③ **把本地分支的两个锁定孪生行删掉** ⇒ 界面结构转红（验"孪生"这条有牙；**不是**"把两行放进本地分支"——甲方案下本地分支本来就该有它们）。
- [x] **门禁**：`pnpm check` 零诊断；`config-form` 与 `functional-models` 窄面绿；**前端全量**（共享组件，后台执行）。

**实测（2026-09-30）**

**RED**：新增/改写 6 条用例在未改代码上 **6 红／113 绿**（`config-form.test.ts`：映射、空选项回退、带出、`null` 撤销；`functional-models-view.dom.test.tsx`：云分支"地址可编辑＋`lockedLocalOnly===1`＋两个新行可编辑"、本地分支"`lockedCloudOnly===3`＋两新行锁上"）。

**GREEN**：窄面（两文件）**119 passed**；更宽窄面（`tests/unit/rag`＋`tests/unit/settings`＋`tests/unit/components/workspace/settings`，15 文件）**307 passed**（含第二份 dom 文件的复核）。

**neuter（逐项独立；改 → 跑 → 逐字节还原 → md5 核对，全部 ✓）**：

| # | 还原的旧行为 | 受害者 |
| --- | --- | --- |
| ① | `SELECT_FIELDS` 去掉两个新字段（改名） | 2：`carries a file-owned parse language and version forward`、`withdraws a file-owned enum with null, never an empty string` |
| ② | `formValuesFromConfig` 两行改为常量空串 | 2：`carries a file-owned…`、`maps the stored parse language and version back into the form` |
| ③ | 本地分支两个锁定孪生删掉 | 1：`swaps the token for the service address when parsing goes local` |
| ④ | 清空编码回 `""`（撤销 `null` 修复） | 1：`withdraws a file-owned enum with null, never an empty string` |

**门禁**：`pnpm check`（eslint ＋ tsc）**零诊断**（tsc 逮出 1 处：测试里先 `const cleared = {…}` 再传入 ⇒ 字面量放宽为 `string`，已改内联、照 `:690` 先例）；**前端全量：247 文件／2751 例／0 失败**（3m13s；跑在 HEAD `74136371`＋本对未提交改动上——他线的 VLM 提交先落地，与本对零重叠）。

**实施期发现**：① 空选项文案＝`judgeModelNone` 那句「（使用配置默认）」（准备轮已核）；② 清空编码的 `null` 修复走同一循环 ⇒ 六个旧枚举字段一并受益，**既有用例无一钉住旧行为**、无需改写；③ 前端全仓本来就有 prettier 历史格式债（`pnpm format` 非本仓门禁，CI 只跑 `pnpm check`）⇒ 新行按文件既有风格写即可，不动历史行。

**交付后调整（2026-09-30，他审 UI 时提出并令做）**：云腿「服务地址」补**灰字占位 `https://mineru.net`**——留空时的实际去向，与 embedding/rerank 地址行的既有形状一致；**本地分支不给占位**（没有默认值，灰字会被读成"默认就是它"）。视图一行（`placeholder`＋注释说明与后端常量同值）；两条既有 parse 用例各加一条钉（云分支 `placeholder === "https://mineru.net"`／本地分支 `placeholder` 为 null）。复跑：两 dom 文件绿、`pnpm check` 净；全量 **247 文件／2752 例／0 失败**（2m54s）。

---

## Task 3 — 示例文件、版本与文档

> 文件：`config.example.yaml`、`deploy/helm/deer-flow/values.yaml`、`deploy/helm/deer-flow/README.md`、**仓根 `README.md`**、`backend/AGENTS.md`、[盘点档](../../PRE_RELEASE_HARDCODE_INVENTORY.md)。**`rag_config.example.json` 不改**（该文件口径＝模型条目／主设施字段，其守卫绑定 `MODEL_REFERENCE_FIELDS`）。**不运行 `make config-upgrade`、不读改用户真实配置。**

- [x] **RED**：模板契约用例扩**两项**（存在、键序、`config_version` ≥ 41；**取值按各段既有风格**：parse 段两处是注释示例）。**`rag_config.example.json` 不进断言面**（它不改）。
- [x] **GREEN**：示例**按各段风格**（parse 段：两处新增注释示例 ＋ `parse_base_url` 注释改两态；~~video 段加 `ocr_lang`~~ **2026-09-30 撤销**）／版本同批（`config_version` 40 → 41，**若 ASR 服务档先落地并 bump 则顺延 42** ＋ chart 同升，否则 `scripts/check_config_version.sh` 会新开红）；**仓根 `README.md` 两处**（解析 bullet `:46` 补"云腿留空＝官方、填了就打到它"；~~视频 bullet `:45` 补"PaddleOCR 未安装 ⇒ 屏幕文字恒空"~~ —— **2026-09-30 改判**：该 bullet 已由撤销轮就地改为"屏幕文字走所配置的模型端点"、不再提 PaddleOCR）；`backend/AGENTS.md` 补**两个**旋钮＋ `parse_base_url` 的两态口径；~~把 PaddleOCR 加进视频重依赖清单 ＋ 一句"未安装时屏幕文字恒空"~~ **2026-09-30 撤销**（视频段那句已由撤销轮改写为走 `rag.vlm_model`；PaddleOCR 不入清单）；盘点档 A-2 例证收窄（"非中英文字种"）＋ **复核 A-6 行的"⚠ 不再能称纯加法"批注**（起草轮 2026-09-29 已就地登记，实施时确认仍在即可）。
- [x] **门禁**：示例契约用例绿；`bash scripts/check_config_version.sh` OK；grep 复核**两处新增键 ＋ 一处改写**出现（parse 段两键、`parse_base_url` 注释）。

**实测（2026-09-30）**

**RED**：`test_rag_config_example.py` 扩两条（两键的注释示例存在＋不激活；`parse_*` 注释行的键序）＋版本底线 40 → 41 ⇒ 未改示例前 **3 红／4 绿**（两条新用例＋版本那条）。

**GREEN**：契约用例 **7 passed**；`bash scripts/check_config_version.sh` **OK**（example 41 ＝ chart 41）；grep 复核：两处注释示例在 `:2617-2618`、`parse_base_url` 注释已改两态口径（`:2614`）。**连跑三件读示例的用例**（`test_config_version` ＋ `test_rag_config_example` ＋ `test_rag_config`）：**39 passed／1 failed**——那条 `test_version_26_config_upgrades_to_checkpoint_channel_mode` **在既有全量基线集合内**（162 红之一、已在 HEAD 上逐条复现），非本对所致。

**改动面**：`config.example.yaml`（版本 40→41 ＋ 两处注释示例 ＋ `parse_base_url` 一处改写）、`deploy/helm/deer-flow/{values.yaml,README.md}`（版本同升）、仓根 `README.md`（解析 bullet 补"该地址云腿同样生效：留空＝官方地址，填了就打到它"）、`backend/AGENTS.md`（RAG 段补两个旋钮 ＋ 地址两态）、盘点档（A-2 例证收窄；**A-6 行批注复核仍在** ✓）。**未做**（按 spec D5）：`rag_config.example.json` 不改（两键非模型引用）。

---

## Task 4 — 真栈验收

> 前提：服务运行且已加载本对代码；`config.yaml` 与 `rag_config.json` 先存档字节/md5，结束逐字节还原。

- [x] **腿一（语种）**：改 `parse_language` ⇒ 入库一条文本文件，网关日志里 MinerU 请求体的 `language` 跟着变（具名证据）；清空 ⇒ 回 `"ch"`。
- [x] **腿二（档位）**：改 `parse_model_version` ⇒ 请求体 `model_version` 跟着变；清空 ⇒ 回 `"vlm"`。
- [x] **腿三（地址）**：把 `parse_base_url` 设到一个**可控的失败地址**（如 `http://127.0.0.1:9/`，日志只体现主机名）⇒ 云腿请求打到该主机并失败（**这同时是 spec §6.2 那条行为变化的真栈证据**：该字段在云腿下从"被忽略"变"生效"）；清空 ⇒ 回官方地址。（**不把真实文档流量引向不明主机**；失败即证据。）
- [x] ~~**腿四（OCR 语种）**~~ **2026-09-30 撤销**（A-3 已废；屏幕文字改走 VLM，其验收归那条改动自己的用例）。
- [x] **还原**：两份配置逐字节还原；清理本次创建的测试文档（按 id）。

**实测（2026-09-30，真栈；网关已加载本对代码——`openapi.json` 含两个新字段）**

**做法**：临时把 `parse_base_url` 指到本机抓包服务（`127.0.0.1:8899`，只记录请求体、零外网流量），以 **PNG 探针**入库「测试2」，每腿两向（设→抓、清→抓）。共 5 件探针、4 笔 PUT；结束时按 id 全删、两份配置逐字节还原。

**腿一（语种）**：设 `parse_language=japan` ⇒ 抓包 `body={…,"language":"japan"}`；清空 ⇒ `"language":"ch"` ✓。
**腿二（档位）**：设 `parse_model_version=pipeline` ⇒ `"model_version":"pipeline"`；清空 ⇒ `"vlm"` ✓。
**腿三（地址）**：指向抓包服务 ⇒ 请求**到达配置地址**（抓包 `host=127.0.0.1:8899`；对应文档的失败文案逐字引用该服务的应答）；改到 `http://127.0.0.1:9/` ⇒ 连接失败（`All connection attempts failed`——**如实记差：网关日志对连接失败不体现主机名**，httpx 只在收到响应时打 INFO 行；具名链路由 traceback 的 `base_url=self._base_url` 帧 ＋ 当时 GET 的 `parse_base_url` 值构成）；清空 ⇒ `POST https://mineru.net/api/v4/file-urls/batch "HTTP/1.1 200 OK"` ✓（回官方）。
**还原**：5 探针文档按 id 删除（204×5）；`config.yaml`（`764c7c4d…`）与 `rag_config.json`（`323f9046…`）逐字节还原、md5 一致 ✓；终态 GET：三项均 `config_file`／`ch`／`vlm`／`null` ✓；抓包服务已停。

**实施期发现**：① 计划里"入库一条**文本文件**"不成立——`.md`/`.txt` 走本地直读、永不到达 MinerU ⇒ 探针改用 PNG（任一 MinerU 后缀同理）；② 版本 40→41 落地后，真栈每次配置重载会打 `config.yaml (version 40) is outdated — the latest version is 41. Run make config-upgrade` 的 WARNING（bump 的设计行为；本对不代跑 upgrade）。

---

## Task 5 — 交付回写

- [x] **spec／plan Status** 改为已交付，记录 ①② 的裁定（①＝复用既有字段、②＝进界面）；**把 spec §6.2 首条的行为变化写进交付纪要**，并核对盘点档 A-6 行的登记已落；逐 Task 的「实测」补齐。
- [x] **盘点档**：A-2／A-5／A-6 三条标已交付并指向本对（**A-3 标「已被取代」——2026-09-30 已登记，不随本对交付**）；§4.2「对 2」标已交付；计数随 §4.2 与 §4 可做清单调整。
- [x] **文档缺口**（本对话 2026-09-29 查出的两处）随本对收口：~~`backend/AGENTS.md` 重依赖清单补 PaddleOCR（Task 3）~~ **2026-09-30 撤销**（屏幕文字走 `rag.vlm_model`，PaddleOCR 不入清单）；~~盘点档 A-3 行补一句"实施前重读引擎欠账"~~ **同日改记**：A-3 行的「已被取代」注已落（取代注随撤销轮登记），本处收口即可。
- [x] 提交按届时授权，Conventional Commits；不推送除非明确要求。

**实测（2026-09-30 完成，交付回写）**

**性质**：文档回写任务——无 RED／neuter／revert proof（不改代码）；**未读改任何用户配置**。载体：spec、plan、盘点档。

**交付物**（实施/验收 4 笔 ＋ 本回写 1 笔，均未推送）：

| 提交 | 内容 |
| --- | --- |
| `5bea5cfe` | Task 1 后端：两字段两层 ＋ `parse_base_url` 语义扩大 ＋ 云腿两处 ＋ golden/用例 |
| `80fe8c01` | Task 2 前端：解析区两行＋本地孪生、地址行解锁、清空编码 `""`→`null`（顺带修六个旧枚举字段）、i18n 6 键 |
| `d231e430` | Task 3 模板与文档：`config_version` 40→41、两处注释示例、README/AGENTS、盘点档 A-2 收窄 |
| `5dc512f1` | Task 4 真栈验收：三腿两向（抓包服务证 language/version/地址）＋逐字节还原 |
| 本笔 | Task 5 交付回写：Status ×2、盘点档四条、计数与清单 |

**行为变化（spec §6.2 首条，交付纪要）**：云腿下 `parse_base_url` 由「被忽略」变「生效」（空＝官方 `https://mineru.net`）。**影响面**：先设过本地地址、后切回云的部署，云请求会打到那个地址（失败可见、清掉即恢复）；本机该字段为空 ⇒ 无感。真栈具名证据见 Task 4 实测。

**盘点档回写**：A-2／A-5／A-6 标已交付并指向本对；A-3 保持「已被取代」；§4.2「对 2」标已交付；计数：坏写死**现存 8 条**（16 − 闭合/取代 5 − 交付 3），**本仓待修 7 条**（再减 A-10）；§4 可做清单与 §4.1 同步。

**开着的（不属本对）**：① 用户 `config.yaml` 版本 40 会在每次重载时打 outdated WARNING，直到跑 `make config-upgrade`（本对不代跑）；② 准备轮提的 OPTIONS 顺序用例未加（可撤）。
