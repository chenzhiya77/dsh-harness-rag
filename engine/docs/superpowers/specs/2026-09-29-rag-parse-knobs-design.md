# 解析的三个旋钮：MinerU 语种／服务地址／解析档位 —— 设计

> ⚠️ **2026-09-30 改判：第四个旋钮（`rag.video.ocr_lang`，本文代号 A-3）已撤销**——屏幕文字改走 `rag.vlm_model`（与 caption 同一条链），PaddleOCR 那条路整块不做。撤销与替换的细节见下「A-3 的撤销与替换」一节；本文件其余部分（A-2／A-6／A-5）不变。

**Status:** **2026-09-30 已交付**：Task 0–5 全部完成（plan 33／33）。**①＝乙**（服务地址**复用一个既有字段**、界面标题改「服务地址」，云腿留空＝官方默认、本地腿必填）；**②＝乙**（**两个**新控件进设置界面：解析语种、模型版本）。**A-3（OCR 语种）已于 2026-09-30 撤销**——屏幕文字改走 `rag.vlm_model`，不随本对交付（见「A-3 的撤销与替换」）。**行为变化（交付纪要）**：云腿下 `parse_base_url` 从「被忽略」变「生效」（空＝官方 `https://mineru.net`），见 §6.2 首条——影响面＝先设过本地地址、后切回云的部署（失败可见、清掉即恢复），真栈具名证据见 plan Task 4 实测。实施提交 `5bea5cfe`（T1）／`80fe8c01`（T2）／`d231e430`（T3）／`5dc512f1`（T4）＋ 回写（T5，均未推送）。**除那条行为变化外，默认行为全部保持现状**；真栈阶段未读改任何用户配置（逐字节还原）。

**Plan:** [2026-09-29-rag-parse-knobs.md](../plans/2026-09-29-rag-parse-knobs.md)

**相关记录**：

- [发布前写死项盘点](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 2」＝本对（`A-2` + `A-3` + `A-6` + `A-5`）；四条完整证据在那里，本文件只写改法。**其中 A-3（`ocr_lang`）已于 2026-09-30 撤销**——盘点档的 A-3 行**已就地标「已被取代（VLM 路线）」**，对 2 行与计数句同批改准。
- [2026-09-24 MinerU 4.x 解析适配](2026-09-24-mineru-4x-parse-adaptation-design.md)：**本地腿**的 `parse_backend → parse_tier` 与地址字段；其 spec 明写「**mineru-cloud 零改动**」⇒ A-2／A-5／A-6 **不在它范围内**（本对补上）。
- [2026-09-08 视频入库](2026-09-08-video-ingest-design.md)：视频四条腿与 `video_*` 字段的来源；~~A-3 的 `lang="ch"` 就在它建的 ocr 腿上~~（2026-09-30：那台引擎已退场，屏幕文字改走 VLM）。
- [2026-09-27 ASR 模型选择器](2026-09-27-rag-asr-model-picker-design.md)：把 `asr_provider` / `asr_model` 做成界面行（本对与它同区、同文件 ⇒ 碰撞面见 §5.2）。

## 1. 目标与边界

把三个「决定结果方向、却写死在代码里」的值提成配置字段（其中"服务地址"＝**扩大既有 `parse_base_url` 的语义**，不新开字段——① 裁乙；原第四项 A-3 已于 2026-09-30 撤销，见改判节）。**除 §6.2 首条登记的唯一例外外**，不声明时这三项的行为与今天逐字节相同。

| 本期做 | 本期不做 |
| --- | --- |
| `rag.parse_language`（MinerU **云腿**语种，16 值，默认 `"ch"`）—— A-2 | 改 caption 的 prompt（屏幕文字腿已换引擎＝VLM，但它有自己的 prompt，见改判节） |
| `rag.parse_model_version`（云腿档位，`pipeline`／`vlm`，默认 `"vlm"`）—— A-5 | 改默认值（"默认该不该是平台默认 `pipeline`"留白）；`MinerU-HTML` 档（上传白名单没有 `.html`，不可达） |
| **服务地址＝复用既有 `rag.parse_base_url`**（语义扩为"当前解析服务的地址"：云腿留空＝官方 `https://mineru.net`；本地腿仍必填）—— A-6 | 为云腿**新开**一个地址字段（① 已裁乙）；改 `parse_base_url` 的类型与默认值 |
| 两个新字段进两层 ＋（② 已裁乙）设置界面：解析区云腿两行、地址行改标题 | 保存期新增校验；不动 `models:` 引用机制；**视频区不加行**（A-3 已于 2026-09-30 撤销） |

**为什么值得做**（余下三条都属盘点档 §1.2 的"坏-A"：值决定结果方向、用户够不着）：

- **A-2**：MinerU 云 API 本就支持 16 个语言包（官方默认就是 `ch`）——**问题不在平台，在我们没把能力接出来**；`ch` 的字面含义是「中英文」，所以受影响的是日／韩／繁／泰／阿拉伯／西里尔等语种的文档。
- **A-5**：我们硬点 `vlm` 而**平台默认是 `pipeline`** ⇒ 替用户选了另一条解析流水线；同为"解析档位"，**本地腿有 `parse_tier` 字段、云腿没有**。
- **A-6**：该地址决定**源文件被 PUT 到哪台服务器**（数据出域方向由代码定）；`parse_base_url` 只服务本地腿，其余端点腿各有地址旋钮。
- ~~**A-3**：视频屏幕文字用哪套字库被钉死~~ **2026-09-30 撤销**：屏幕文字改走 `rag.vlm_model`（VLM 读屏幕文字，中英之外的语种由模型自身能力覆盖）⇒ **不再需要**「语种」这个旋钮，PaddleOCR 与其字库一并退场。

## 2. 决定

### D1 两个新字段 ＋ 一个既有字段的语义扩大（各自照邻居的形状）

| 字段（`config.yaml` 的 `rag:` 段） | 类型 | 默认 | 照谁 |
| --- | --- | --- | --- |
| `parse_language`（新） | `Literal[16 值]`（官方「language 取值参考」全表） | `"ch"` | `parse_tier` 的 Literal 形状 |
| `parse_model_version`（新） | `Literal["pipeline", "vlm"]` | `"vlm"` | 同上；只列两档 |
| `parse_base_url`（**既有，类型与默认都不动**） | `str \| None` | `None` | —— |

- **`parse_base_url` 的语义扩大（① 裁乙；本对唯一行为变化，§6.2 首条）**：描述由「本地 MinerU 服务地址；`parse_provider=mineru-local` 时必填」改为「**当前解析服务的地址**：云腿留空＝官方 `https://mineru.net`；本地腿必填（该服务不带鉴权，只应部署在内网）」。**类型、默认值、两层声明位置一律不动**；空态语义随 provider 变，靠字段描述与行内 ⓘ 写清。判据（为什么两个 provider 共用一个地址字段是对的）：仓内的同类参数就是这样——`embedding_base_url` 服务 3 个 provider、`asr_model` 服务 2 个，都是"一类参数一个字段"；**＋ 同日、同页的第三个先例**：ASR 腿（[2026-09-28 那一对](2026-09-28-rag-asr-service-tier-design.md)）也是 **4 个值（`funasr`／`whisper`／`openai-audio`／`dashscope`）共用一个 `asr_base_url`** ⇒ 这条规则正在同一张设置页上被第二条腿复制。
- 16 值（官方取值参考，2026-09-29 两次实测一致）：`ch`、`ch_server`、`en`、`japan`、`korean`、`chinese_cht`、`ta`、`te`、`ka`、`el`、`th`、`latin`、`arabic`、`cyrillic`、`east_slavic`、`devanagari`。官方原文：`language`「指定文档语言，默认 `ch`…**仅对 pipeline、vlm 模型有效**」；`model_version`「三个选项:pipeline、vlm、MinerU-HTML，默认 pipeline…HTML 文件需明确指定为 MinerU-HTML」。
- **两个新字段两层都声明**：`RagConfig`（config.yaml 层）给字面默认；`RagConfigFile`（UI 文件层）同名同类型、默认 `None` ＝"不覆盖 config.yaml"（照 `parse_tier` 的既有关系）。**不进 `MODEL_REFERENCE_FIELDS`**（它们不是模型条目引用）。

### D2 两个消费点（云腿两处）＋ 一个不再存在的消费点

| 消费点 | 今天 | 改成 |
| --- | --- | --- |
| `parser.py:387` `_apply_upload_url` 的请求体 | `"language": "ch"`；`model_version` 来自三层签名默认 `"vlm"` | 语种与档位从 `get_app_config().rag` 现取；两者仍是**顶层批参数**（官方文档：per-request，不是 per-file） |
| `parser.py:54` `MINERU_BASE_URL`（拼进 `:385` 申请上传、`:406` 轮询） | 模块常量，无覆盖 | 常量**保留作默认**；两个拼 URL 的函数各收 `base_url: str = MINERU_BASE_URL`；云客户端由 `build_parse_provider` 传 `section.parse_base_url or MINERU_BASE_URL`（① 裁乙：读的就是既有字段） |
| ~~`video/ocr.py:57` `PaddleOCR(..., lang="ch")`~~ | 字面量 | **2026-09-30 撤销**：该引擎连同这一行一起退场——屏幕文字改走 `rag.vlm_model`（见下「A-3 的撤销与替换」） |

**形状纪律**：三处只改"值从哪来"。`build_parse_provider` 的 `if/else` 两侧各加自己的 kwargs（云腿：`model_version` ＋ `language` ＋ `base_url`（空则退常量）；本地腿：`base_url` ＋ `tier`——**这一侧今天就是这么写的，不动**）；语种与档位的签名默认收敛为"一处默认"（`RagConfig` 字段），避免 `:686` / `:722` / `:756` 三处默认再漂；地址那一处的默认仍是模块常量。

### D3 界面（② 已裁＝乙：进设置界面）

界面改动为：

- **解析区**：新增两行 —— 「解析语种」`OptionSelect`（16 值 + 空）与「模型版本」`OptionSelect`（`pipeline`／`vlm` + 空），**控件形状**照 `parse_tier` 行（`functional-models-view.tsx:1748-1762` 一带）。**这两行同样"始终渲染"**（该区的硬约定：不适用的行锁上并给原因，不隐藏）：**云分支可编辑；本地分支渲染为同名的锁定孪生**，原因复用现成的 `lockedCloudOnly`（「仅云 API 需要」）——照 `mineruToken` 行在本地分支的样子（实测 `:1763-1766`）。两行都是**云腿专属**（本地腿的对应物是既有的 `parse_tier`，没有"语言／版本"这两个概念）。
- **地址沿用既有那一行**（不新增行；**始终可编辑**，① 裁乙后不再有"锁定孪生"）：**地址行只改标题** —— 「本地服务地址」→「**服务地址**」（i18n `parseBaseUrl`，两语同步）。**ⓘ 不在地址行**：`parseBaseUrlHint` 实测挂在**「解析提供方」行**（`functional-models-view.tsx:1720` 的 `RowLabel info={F.parseBaseUrlHint}`），所以两态口径写在**那一行**：**云腿留空＝官方 `https://mineru.net`；本地腿必填，该服务不带鉴权、只应部署在内网**（现文案只有后半句）。实施时按符号定位这个 `RowLabel`，别去地址行找 ⓘ。
- ~~**视频区**：新增一行「OCR 语种」`Input`~~ **2026-09-30 撤销**（A-3 已废）⇒ 视频区不新增任何行。
- i18n：**新增 6 键 × 3 文件 ＝ 18 处**（`parseLanguage`／`parseLanguageHint`、`parseModelVersion`／`parseModelVersionHint` 四键 ＋ **两个新 `OptionSelect` 各自的空选项标签 2 键**（原写 8 键含已废的 `ocrLang`／`ocrLangHint`） —— 既有家族就是这么做的：`parseTierAuto`（`:829` 的 `"": F.parseTierAuto`）、`sparseProviderNone`（`:840`）、`judgeModelNone`；Task 0 实测更正，原写 6 键）＋ **改 2 键 × 2 语 ＝ 4 处**（`parseBaseUrl` 标题、`parseBaseUrlHint` 说明）；空选项**文案**沿用既有那句（「（使用配置默认）」）。
- **前端触点（四处，缺一处就是缺陷；2026-09-30 由六处收窄——原 ③⑤⑥ 都是 `ocr_lang` 的）**：① `types.ts` 的 `RagConfigValues` **两项**；② `config-form.ts` 表单值类型**两行**；③ **`SELECT_FIELDS`**（`parse_language`／`parse_model_version`）；④ `formValuesFromConfig` **两行**。`VIDEO_SOURCES`／video 自由文本循环／`hasFormChanges` 的 video 列表**都不动**（`ocr_lang` 已废）。
- **既有断言的改写（不是放宽，2026-09-29 审查点名；2026-09-30 收窄）**：`config-form.test.ts:136` 的 `values.video` 整对象相等**不用再改**（`ocr_lang` 已废、video 形状回到两格）；`functional-models-view.dom.test.tsx:372-381`（云分支：地址行变可编辑 ⇒ `labelCount("parseBaseUrl")` 0→>0、`lockedLocalOnly` 计数 2→1）与 `:383-391`（本地分支多两个孪生 ⇒ `lockedCloudOnly` 的单数 `getByText` 会因多元素抛错，改 `getAllByText(...).length === 3`）按新行为改写。**⚠ 孪生行没有 aria-label**（照 `mineruToken` 孪生），而 `labelCount` 用的是 `queryAllByLabelText` ⇒ 断言孪生要用 gutter 文本/`lockedCloudOnly` 计数，**不要用 `labelCount`**（恒 0，会写出假绿断言）。详见 plan Task 2。
- **不改**：`parse_provider` 开关本身、`parse_tier` 行、ASR 两行、卡片标题与卡片 ⓘ。

（若日后改口为甲：以上界面部分整体移出，两个新字段只进 `RagConfig`、不进 `RagConfigFile`（⇒ 无响应形状变化、无 golden 改动、无前端）；但 **`parse_base_url` 的语义扩大照旧发生** —— 那是 `RagConfig` 层的读取行为。）

### D4 不做与边界

- ~~**不装 PaddleOCR**~~ **2026-09-30 撤销**：不再有"装引擎那天"——屏幕文字改走 `rag.vlm_model`，本机当天就能用（真机实测中英混排逐字全对）；`PaddleOcrEngine`／`_lines_from_paddle`／`OcrEngine` 协议**整块删除**，依赖清单里也不出现 PaddleOCR。
- **不改默认值**："`vlm` 该不该改成平台默认 `pipeline`""语种该不该仍 `ch`"都是产品决定，本对留白。
- **不改 caption prompt**：屏幕文字腿与 caption 腿**共用出站链**但**各用自己的 prompt**（前者要转录、后者双模式）；caption 那一句照旧。
- **不新增保存期校验**：Literal 由 pydantic 校验（非法值 422），地址格式不校验（与 `embedding_base_url` 等一致）。
- **不动**：`knowledge/model_target.py`、`models/factory.py`、`rag_config.json` 的掩码／原子写／热加载机制、MinerU 本地腿客户端。

### D5 文档与模板同批

- `config.example.yaml` 的 rag 段：**parse 段是"注释示例"风格**（实测 `:2613-2615` 一带）⇒ 加**两处**注释示例（`parse_language`／`parse_model_version`，中性占位）＋ **改写一处**（`parse_base_url` 那条注释，把「required when parse_provider=mineru-local」改成两态口径）；**video 段不动**（`ocr_lang` 已废）。合计＝**两处新增 ＋ 一处改写**。`config_version` **40 → 41**（门 A／对 1 的先例），`deploy/helm/deer-flow/values.yaml` 与 `deploy/helm/deer-flow/README.md` 同批。**⚠ 编号随落地顺序**：若 ASR 服务档那一对先落地并 bump（它也要改配置面），本对顺延 **41 → 42**（见 §5.2 的串行约束）。
- **仓根 `README.md` 两处（2026-09-29 审查补）**：解析 bullet（`:46`）补"云腿留空＝官方地址、填了就打到它"；视频 bullet（`:45`）**不再提 PaddleOCR**（2026-09-30：屏幕文字走 `rag.vlm_model`，无需额外安装）。
- `backend/AGENTS.md`：RAG 段补**两个新旋钮**（`parse_language`／`parse_model_version`）**＋ 改写 `parse_base_url` 的两态口径**；视频段改一句**屏幕文字走 `rag.vlm_model`**（2026-09-30；**PaddleOCR 不进依赖清单**）。
- `rag_config.example.json` **不改（2026-09-29 审查定）**：该文件的既有口径是"模型条目／主设施字段"，其守卫（`test_rag_config_example.py:48-54`）把"模板里应含什么"与 `MODEL_REFERENCE_FIELDS` 绑定 —— 两个新字段都不是模型引用。
- 盘点档：A-2 行的例证收窄为"**非中英**文字种被硬套中英文字库"（`ch` 官方含义＝中英文，纯英文文档受影响很小）；**三条在交付时标已交付；A-3 已标「已被取代」**（2026-09-30 已就地落进盘点档：其行取代注 ＋ 对 2 行缩为三项 ＋ 计数句同批改准）。

### A-3 的撤销与替换（2026-09-30，用户裁定）

**撤销**：`rag.video.ocr_lang` 不再存在——`RagConfig` / `RagConfigFile` / `_VIDEO_FIELDS` 三个配置层、`PaddleOcrEngine` 的 `lang` 参数、界面那一行、i18n 里的两键、以及 golden 里那一个嵌套键，全部移除（撤销前的实现改动从未提交）。

**替换**：视频的「屏幕文字」改走 **`rag.vlm_model`**（与 caption 同一条链）——腿还在（`video/ocr.py`），只是引擎从进程内的 PaddleOCR 换成 VLM：

- **提问**：一句只要求转录的 prompt（`_SCREEN_TEXT_PROMPT`；caption 那句是双模式，两者不共用 prompt）；
- **共用骨架**：与 caption 腿共用 `knowledge/video/captioner.py::run_shot_prompt`（目标解析 ／ 无钥匙 ⇒ 全空 + degraded ／ 单镜头失败计数 ／ 失败率 >30% ⇒ degraded）⇒ 两条腿的降级语义逐条同形；
- **零新增**：模型条目、地址、钥匙全沿用 caption 那一套 —— 这正是裁定的动机（"用户不用再多配置一个模型，页面也可以少承载一个模型的管理"）。

**为什么**（2026-09-30 实机取证，同一张现造的中英混排四行帧）：千问 `qwen-vl-ocr` **0.7 s**、`qwen3.5-ocr` 3.2 s、**通用 VLM 路线**（`qwen3.8-flash` 1.6 s ／ `mimo-v2.6-flash` 3.4 s）——**四条路线逐字全对**；而 PaddleOCR 在本机/CI 都没装（屏幕文字今天恒空且**静默**）。行业面上新出的 OCR 基本都是 VLM（`qwen-vl-ocr` 自述基于 Qwen3-VL；PaddleOCR 本尊也出了 `PaddleOCR-VL`；本仓已在用的 MinerU 默认即 VLM 模式）⇒ 这条腿没有理由再自带一套引擎。

**新风险与它的信号**：屏幕文字从"确定性引擎"变成生成式输出（**可能编字**——作为检索用的一行可接受），且会像 caption 一样遇到网络／凭据失败；失败率 >30% 时 `worker._video_ocr_leg` 打一条 warning，**它没有自己的 `path_status` 腿**（屏幕文字空即「（无）」，与今天同形）。

## 3. 接口与实施归属

| 接口／对象 | 本期契约 |
| --- | --- |
| `RagConfig.parse_language` / `.parse_model_version`（**新**）＋ `parse_base_url` 的**语义扩大** | D1 表 |
| `RagConfigFile` 同名**两**新字段 | 同类型、默认 `None`；**顶层两键**声明即自动进 GET／PUT 响应与 `sources`（`_build_response` 反射）。~~嵌套的 `video.ocr_lang` 要动 `_VIDEO_FIELDS`~~ **2026-09-30 撤销**（`_VIDEO_FIELDS` 回两格、不动；见「A-3 的撤销与替换」） |
| `MineruCloudParser.__init__` / `build_parse_provider` / `parse_document` | 三个值参数（`model_version`／`language`／`base_url`）：**`__init__` 侧必填、不再带字面默认**；`build_parse_provider`／`parse_document` 侧默认 `None` ⇒ 读配置 ⇒ 云腿地址再退官方常量（Task 1 实施期定形；"签名默认不再是值的唯一来源"） |
| `_apply_upload_url` / `_poll_result` | 各加 `language` / `base_url` 参数（默认＝今天的字面量，保证不传时逐字节相同） |
| ~~`PaddleOcrEngine` / `ocr_frame`~~ | **2026-09-30 撤销**：两者连同 `_lines_from_paddle`／`OcrEngine` 协议一并删除；屏幕文字改由 `screen_text_shots`（走 `rag.vlm_model`）产出 |
| 设置界面（**② 已裁乙**） | 解析区两新行（云分支可编辑、本地分支锁定孪生）＋ 地址行改标题 ＋ provider 行 ⓘ 改说明；~~视频区一行~~ **2026-09-30 撤销**（A-3 已废）；不含新卡片 |
| `response_golden.json`（**② 已裁乙**） | `config` **顶层 +2**（`parse_language`／`parse_model_version`）、`sources` **扁平 +2**；`put.payload` 不变。（原写的「`video` 块内 +1 = `ocr_lang`」**2026-09-30 撤销**。）**`_registered_additions` 记一句**（R19 先例）；形状守卫同批 |

## 4. 验收清单

1. **加载链**：无覆盖 ⇒ 两个新字段取字面默认（`"ch"`／`"vlm"`）；`parse_base_url` 为空时云腿落官方常量；文件层覆盖生效、撤销覆盖回到 config.yaml；两层的类型不合法值时 422。
2. **云腿请求体**：临时配置 ＋ `MockTransport`（不真发网）观察：`language`／`model_version` 来自配置、且是**顶层批参数**；`parse_base_url` 非空时云腿请求打到该主机，为空时打官方（负向对照：与今天的请求**逐字节相同**）。**负向对照落在既有守卫 `test_parse_local.py:410-424` 上**——它的 `_stub_config` 会**继承真实配置的 `parse_base_url`**（今天靠"云腿忽略该字段"侥幸绿），先显式钉 `None`；正向用例照 `:389` 的写法 `_stub_config(..., parse_base_url="http://127.0.0.1:9999")` 看 host（夹具现成）。
3. ~~**视频腿**：`ocr_lang` 被传给 `PaddleOcrEngine`~~ **2026-09-30 撤销**（见「A-3 的撤销与替换」——屏幕文字腿的验收改由那条线自己的用例覆盖）。
4. **三条各自的负向对照**：不声明 ⇒ 行为与今天逐字节相同（不是"看起来没坏"的空洞断言——每条的默认路径都要有正向执行证据）。**唯一例外**＝`parse_base_url` 非空的部署在云腿下的新行为（§6.2 首条），要有一条**正向**用例钉住它（设了地址 ⇒ 真的打到那里）。
5. **界面（② 已裁乙）**：解析区新增语种／版本两行（**云分支可编辑、本地分支锁定孪生**）、**地址行标题为「服务地址」**、**两态 ⓘ 在「解析提供方」行**；~~视频区多一行 `ocrLang`~~（**2026-09-30 撤销**，A-3 已废）；保存不丢（B-1 形状的反向守卫）；非 RAG 隔离不变（既有 `parse_*` / `asr_*` 断言全绿）。
6. **响应形状（② 已裁乙）**：以 goldens 为基线做**双向差集**，`config`／`sources` 仅各多 **两** 键，其余逐字不变。
7. **门禁**：后端 ruff 双净、RAG 窄面与全量（共享加载路径）；前端（② 已裁乙）`pnpm check`、窄面与全量。
8. **真栈**：改 `parse_language` / `parse_model_version` / `parse_base_url` ⇒ 入库一条文本文件，网关日志里的 MinerU 请求 URL 与请求体跟着变（具名证据）；`config.yaml` 与 `rag_config.json` 逐字节还原。（原写的 `ocr_lang` 那半 **2026-09-30 撤销**：那个字段已不存在。）

## 5. 文件影响

### 5.1 本期修改面

| 文件 | 修改 |
| --- | --- |
| `config/app_config.py`（只动 `RagConfig`；`RagVideoConfig` 因 A-3 撤销而不再动） | **两个**新字段 ＋ `parse_base_url` 的**描述扩写**（D1） |
| `config/rag_config_file.py`（② 已裁乙） | **两个**新字段 ＋ `parse_base_url` 描述扩写（**两层描述都要改**）（`ocr_lang` 已撤） |
| `knowledge/parser.py` | 云腿消费点（D2） |
| `knowledge/video/ocr.py` | ~~`lang` 参数 ＋ 现取配置~~ **2026-09-30 撤销本对改动**：该文件由 VLM 路线重写（`screen_text_shots` 复用 `run_shot_prompt`；PaddleOCR 整块删除）——**不在本对交付面**（见「A-3 的撤销与替换」） |
| `app/gateway/routers/rag_config.py` | ~~**只改一处**：`_VIDEO_FIELDS` 加 `"ocr_lang"`~~ **2026-09-30 撤销：该文件不改**（两个新字段都是 `RagConfigFile` 顶层字段，靠反射自动进出响应） |
| `frontend/src/core/rag/{types,config-form}.ts`、`functional-models-view.tsx`、`i18n/locales/{types,zh-CN,en-US}.ts`（② 已裁乙） | 触点 ＋ 解析区（视频区不动） ＋ **新 6 键** ＋ 改 `parseBaseUrl`／`parseBaseUrlHint` ＋ **清空编码 `""` → `null`**（枚举字段的撤销路径，Task 1 实施期查出的既有缺陷，见 §6.2 末条） |
| `backend/tests/…` | 加载链、请求体、（界面形状守卫）；屏幕文字腿（VLM 路线）的用例归那条线自己 |
| `config.example.yaml`、chart `values.yaml` ＋ `deploy/helm/deer-flow/README.md`、**仓根 `README.md`**、`backend/AGENTS.md`、盘点档 | D5（`rag_config.example.json` **不改**，见 D5） |

**明确不改**：`parse_tier`／`parse_provider`／`asr_*` 的语义与默认值；`parse_base_url` 的**类型与默认值**（只有语义扩大，见 D1）；`video/captioner.py` 的 prompt（~~其代码整块不动~~ **2026-09-30**：骨架已抽成 `run_shot_prompt` 供屏幕文字腿复用，prompt 本身不变）；~~`_lines_from_paddle`~~（随 PaddleOCR 一并删除）；MinerU 本地腿客户端（`parse_local.py`）；`models/factory.py`、`knowledge/model_target.py`、rag router 的响应反射与保存期检查。

### 5.2 碰撞面

- **ASR 服务档**（[2026-09-28 那一对](2026-09-28-rag-asr-service-tier-design.md)：**已立项开工、代码在飞**（2026-09-29 实测：`test_rag_config_api.py` 未提交的 +99 行里已有 `asr_providers`／顶层 `asr_base_url`／`asr_api_key`，`test_rag_provider_config.py` 已在扩 `asr` 腿）；**它自己的 spec 只登记了与姊妹件（输出形状）的串行、不知道本对存在** ⇒ 碰撞面由本对登记）—— **本对与它共用一批文件 ⇒ 必须串行**：

  | 共享面 | 它会动 | 本对会动 |
  | --- | --- | --- |
  | `app_config.py` / `rag_config_file.py` | 顶层 `asr_base_url` / `asr_api_key` ＋ `asr_provider` 枚举扩值 | 两个新字段（顶层；`video` 块不动） |
  | `routers/rag_config.py` 的 GET ＋ `_ADDED_FIELDS` | 顶层 `asr_providers` 能力块（顶层白名单扩） | **零改动**（2026-09-30：两个新字段都是 `RagConfigFile` 顶层字段、跟着反射走；它们在 `config`／`sources` 内层——响应顶层白名单管不到，本对只动 golden 与它的 `_registered_additions` 记一句） |
  | `response_golden.json` | 键集与 `sources` 变 | 键集与 `sources` 变 |
  | `test_rag_config_api.py` | **在飞（+99）** | 本对也要动它（形状守卫） |
  | 视频区 JSX ＋ i18n 三文件 | ASR 行 2→4 行（提供商/Model ID/API Key/接口地址） | ~~同段加 `ocrLang` 行~~（**2026-09-30 撤销**）；只改 `parseBaseUrl`／`parseBaseUrlHint`（解析区，同文件） |
  | `functional-models-view.dom.test.tsx` | 行数 2→4 的 DOM 用例 | 改 `:372-381`／`:383-391` |
  | `backend/AGENTS.md`（＋它的 `frontend/AGENTS.md`） | 视频段一句（服务档：四行／三组四值／探针／降级契约）；`frontend/AGENTS.md` 的 functional-models 段 | 本对动 `backend/AGENTS.md` 的 **RAG 段**（同文件不同段）；`frontend/AGENTS.md` 本对**不动** |

  **⇒ 本对的写码任务（Task 1–3）排在其后**；开工前先核它是否已落地，落地后**重数 golden 键集、重扫断言**（只这两步，不重跑整个 Task 0）。`config_version` 编号随落地顺序（见 D5）。
- ~~**边界：`ocr_lang` 留在 `video` 块**~~ **2026-09-30 撤销**（字段本身已废）：这条边界连同它的判据一并作废——`video` 块现在只有 `asr_provider`／`asr_model` 两格。
- **对 1**（`2026-09-26`，已交付）：同文件 `app_config.py`／`rag_config_file.py`／前端三件套／golden（② 已裁乙）⇒ 加法，无语义冲突。

## 6. 裁定记录与已知代价

### 6.1 裁定记录（①② 均已裁＝乙，两项都不再重开）

| # | 在问什么 | 选项 | 裁定／推荐 | 后果 |
| --- | --- | --- | --- | --- |
| **①** ✅ **已裁（2026-09-29，乙）** | 服务地址：新开字段还是复用 `parse_base_url` | ~~甲 新开 `parse_cloud_base_url`；乙 复用既有字段~~ | **已裁乙** —— 判据是仓内的同类参数规则：**一类参数一个字段、跨 provider 共用**（`embedding_base_url` 服务 3 个 provider、`asr_model` 服务 2 个）；我此前"形状不同就该各开字段"的说法不成立，已撤回。界面标题改「服务地址」；云腿留空＝官方默认，本地腿必填 | 代价＝**一条已登记的行为变化**（§6.2 首条）：云腿下该字段从"被忽略"变"生效"；类型与默认值不动 |
| **②** ✅ **已裁（2026-09-29，乙：进设置界面）** | 界面暴露 | ~~甲 只做配置层；乙 连界面~~ | **已裁乙** —— 既有同类旋钮都在界面里；"进文件层不进前端"正是 B-1（保存即丢）缺陷的形状；且 ① 的落点（改标题「服务地址」）本身就是界面动作 ⇒ 两项互证 | 代价＝一片前端面（plan Task 2）；若不做界面，两个新旋钮只能手改 `config.yaml`（与邻居不一致） |

### 6.2 已知代价与登记不改

- **`parse_base_url` 的语义扩大 ＝ 本对唯一的行为变化（① 裁乙，与"字段是否声明"无关、必须登记）**：今天云腿**忽略**该字段（`MINERU_BASE_URL` 写死）；改后云腿**读它**。**具体场景**：任何人先选本地、填了地址（文件里存下 `parse_base_url`）、之后切回云 —— 文件里的值不会消失（前端按字段把覆盖带过去）⇒ 云请求会打到那台本地地址、入库当场失败。**这是"响的变化"**（失败可见、清掉字段即恢复），不是静默改结果方向；但它确实把 A-6 从"纯加法"降级为"带一次行为变化"——盘点档 A-6 行与交付回写要如实更正（对 1 里 A-7 那句"⚠ 不再能称纯加法"是同一处理）。**逃生口**：清空该字段 ⇒ 回官方默认。
- ~~**A-3 的"屏幕文字可用"不在本对**~~ **2026-09-30 撤销**：屏幕文字改走 VLM 后**当天可用**（真机实测中英混排逐字全对）；PaddleOCR 的"装引擎／校准返回形状／引擎只建一次"三笔欠账**一并作废**。
- ~~**`ocr_lang` 写错是静默的**~~ **2026-09-30 撤销**（字段已废）。**取而代之的新风险**：屏幕文字腿会像 caption 一样遇到网络／凭据失败 ⇒ 失败率 >30% 打一条 warning（本腿无自己的 `path_status`），见「A-3 的撤销与替换」。
- **纯空白值对两个新字段是硬报错、不是"未声明"（2026-09-29 审查核实）**：`MODEL_REFERENCE_FIELDS` 的空白归一**只管模型引用字段** ⇒ `parse_language`／`parse_model_version`（Literal）收到 `"   "` 会撞 pydantic 校验（与 `parse_tier` 今天的形状一致）。本对**不**为它们加归一（不新增机制）。
- **Literal 的远端同步**：MinerU 若新增语种值或档位，需要一行代码（与 `parse_tier` 同等代价）。
- **真栈验收的边界**：云腿两项（语种／档位）与地址可用"文本文件入库 + 网关日志"具名验收。（原写的 `ocr_lang` 那半 2026-09-30 撤销。）
- **清空枚举字段的编码 ＝ 一条查出的既有缺陷（Task 1 实施期实测；与 A-3 无关）**：前端 `SELECT_FIELDS` 的清空路径把 `""` 写进载荷（`config-form.ts:297-303`：`next === "" && owned` ⇒ 原样写回），而枚举字段在 PUT 体（`RagConfigFile`）里是 `Literal[...] | None` ⇒ `""` 过不了校验、保存 **422**。**实例**：Task 1 的撤销 PUT 用 `""` 时当场撞上，改用 `null` 才通（`exclude_none`／`_prune_empty` 能承载）。⇒ 凡"文件里有覆盖"的枚举字段（`SELECT_FIELDS` 六个：`embedding_provider`／`embedding_sparse_source`／`sparse_provider`／`rerank_provider`／`parse_provider`／`parse_tier`），今天在界面上**清不掉覆盖**。**本对不修这条既有缺陷本身**，但两个新字段不沿用该编码：Task 2 把清空值改成 `null`（同一循环 ⇒ 六个旧字段一并受益——这是一条**修复方向**的既有行为变化，实施时以 Task 2 的 RED 为准）。

后续不再重开本对余下三项改法（A-2／A-5／A-6；A-3 已撤销）；实施中若确遇新事实，按本文件的更正惯例**追加**一条（不改写已裁的行）。
