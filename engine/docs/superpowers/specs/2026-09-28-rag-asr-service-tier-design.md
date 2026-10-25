# 视频 ASR 的「服务档」（HTTP）—— 设计草案（**未立项；串行门已清**）

**Status:** 🟢 **已立项、开工（2026-09-29）** —— **D1–D8 全裁**（见 §2 决定表 + 「三组四值」表）；**Task 0 取证已完成、四件追加裁定已落**（钥匙放**顶层** · `PROVIDER_ALLOWLIST` 加 **`asr` 腿** · 服务档**两格都填、地址格灰字占位**（按 09-25 端点解锁对复核更正）· 探针**夹具自带黄金期望**，见 §3/§5.4）⇒ **Task 0–4 全部落地**（配置面 / 服务档 provider / 探针后端 / 前端四行 / 文档 + 真机端到端），真机正反例与真服务探针都验过（见 plan 各 Task 的 `实测`）。
**来源**：侧聊产出；与 [2026-09-28-video-asr-output-shape-design.md](2026-09-28-video-asr-output-shape-design.md)（本地档：VAD + cam++，分段顺带获得）是同一架构的**两条来源面**——本文记"服务来源"，那份记"本地来源"。**成对 plan**：[2026-09-28-rag-asr-service-tier.md](../plans/2026-09-28-rag-asr-service-tier.md)。

## 1. 设想（**按协议分档，不按引擎分**）

- **OpenAI 协议档**（值名暂拟 `openai-audio`）：一个"转写服务" = **协议 + 地址 + 钥匙**（模型名复用 `asr_model`，填服务侧的名字），指向任何说 OpenAI audio 协议的服务——远端云或**本机服务**都算。
- **原生协议档**（并列的另一档；**未定义、未立项**）：**不说 OpenAI 协议**、只按厂商自家协议提供的转写服务（例：`qwen-audio-3.1-asr-flash` 的原生形态，见下"已实测"）。对应下拉里的**原生协议**组——**已裁：做**，且该组 = **每套原生协议一格**（**一期只 `dashscope`**；`volc-asr` 随投递挪二期——2026-09-29 裁，见 D5）。⚠️ 本文件"档"有两层用法：**来源档**（本地档 / 服务档）与**协议档**（OpenAI 协议档 / 原生协议档）——引用时带前缀，**不再单说"第一/第二档"**。
- **返回形状三条硬要求**（**协议无关**，形态随档）：① **段级起止时间**（硬卡点——镜头卡按时间投影，没有它就没法落卡）——OpenAI 协议档 = `verbose_json` / `diarized_json` 的 `segments`（后者另带 `speaker`；2026-09-29 按本机 `openai` SDK 2.32.0 校正：`segments` **不是**只挂在 `verbose_json` 下面）；原生协议档 = 厂商自家形状（百炼 `sentences`、火山 `utterances`，见 §7）② **"有段"必须是真时间戳**——服务端可能自己造段（合成段，见 §5.2）③ **空/单段要能被识别成"没答案"**。
- **探针**：内置短 wav + 四态；**只有 `no_timestamps` 拦保存**（其余三态只报告、不阻塞——同探测族"只报不拦"的原则）。
- **已实测（2026-09-28，用他的 key）**：`qwen-audio-3.1-asr-flash` ⇒ 200、**毫秒级段级 + 词级**时间戳；`speaker_diarization_enabled: true` 才返回 `sentences[]`（24 s 音频 → 3 段）；filetrans 那条路要公网 URL（已划掉）；10 MB base64 ≈ 4–5 分钟；成本外推 **¥0.06/小时**（filetrans ¥0.79）；**协议非 OpenAI 兼容 ⇒ 属原生协议档**。

## 2. 决定表（D1–D8，2026-09-29）

> 界面与配置面的八条口径（**D5–D8 = 2026-09-29 当日裁**：原生协议档做 · **长音频一期不投递（甲）** · 探针落点 · 降级语义取「沿用」）。**本线仍未立项**——本表只把"长什么样"写死，开工另起（plan 见文首链接；落点见 §3、验收见 §4）。

| # | 面 | 决定 | 为什么 / 边界 |
| --- | --- | --- | --- |
| **D1** | ASR 行的**形状** | 由今天的 2 行扩成 **4 行**：**提供商**（分组下拉）· **Model ID**（保留字段内候选菜单）· **API Key** · **接口地址**——即检索那两行的形状（`functional-models-view.tsx:915/:947/:974/:1003`）；**恒显，锁不隐藏** | 标签直接复用页面已有词（`providerLabel`「提供商」/ `modelLabel`「Model ID」/ `apiKeyLabel`「API Key」/ `endpointLabel`「接口地址」），不发明新控件。**代价**：行高 2→4（"多模态"组里长高） |
| **D2** | 下拉**分组** | **三组**（一期共 **4 个值**，见上「三组四值」表）：**本地引擎**（进程内：funasr / whisper）+ **通用协议**（说 OpenAI 协议的服务——远端云与**本机服务同类**，后者只是地址填 `127.0.0.1:8000`）。机制照 chat 那个弹窗：`models-add-dialog.tsx:234-244` 的 `SelectGroup`/`SelectLabel`/`SelectSeparator`（`OptionSelect` 现只吃平表，要扩） | 分组轴 = **形态/协议**，不按"在哪台机器"——否则本机 `funasr-server` 会被错分进"本地"。**原生协议**组 = **每套原生协议一格**（D5） |
| **D3** | **锁法** | 选本地引擎（进程内）⇒ API Key、接口地址**两格都锁**（`LockedBox` + 理由——那两格对进程内引擎**没有概念**）；**服务档（通用协议 + 原生协议）⇒ 两格都填**，地址格用当前 provider 的 `default_endpoint` 做**灰字占位**（无则 `https://api.example.com/v1`）。⚠️ **这是 2026-09-25 端点解锁对（D1 乙 / D2 乙）的现行规则**：地址行**永远可编辑**（同一厂商可能有 workspace 级端点），`default_endpoint` **只作占位、不落值、不回落**（留空 ⇒ **报错**）；`has_fixed_endpoint` **不再是 UI 的锁依据**（其 docstring 仍写着"read-only"，是 09-17 的旧话、已过期） | 先例 = MinerU 行（`:1542-1601`：同一选择器两种锁法，"半锁"也在那）；铁律 = 恒显、锁而不藏。**dashscope 那格 2026-09-29 复核更正**：原先我按 `has_fixed_endpoint` 推成"地址锁"，被 09-25 的解锁裁定推翻 |
| **D4** | **配置面**（含会咬人的落点） | **`asr_base_url` / `asr_api_key` 放顶层**（2026-09-29 裁：与既有四条腿同形——provider/model 之外的连接信息全在顶层；`video` 块**仍只放** `asr_provider` / `asr_model`），钥匙走既有 secret 机制（掩码哨兵 + env 徽章 + PUT 整对象替换）。放开字面量——后端**两处**：`app_config.py:156`、`rag_config_file.py:110`；前端**两处**：`types.ts:11`、`config-form.ts:62`。⚠️ 另有 **3 处把值强制归一成两个**的窄化（`config-form.ts:185` / `:305` / `:307`）会静默吞掉新值，必须一起改；**`PROVIDER_ALLOWLIST` 新增 `asr` 腿**（2026-09-29 裁：D2 的三组四值本就是一份受控清单；env 徽章必经 `secret_env_var(leg, provider)` ⇒ 不加腿就得特判）；`asr.py:193`（`resolve_provider`）的分派加一支 | 通用协议格值名 = `openai-audio`（D5）、探针落点见 D7。⚠️ **密钥机制的两处硬约束**：`_SECRET_FIELDS` / `_SECRET_LEGS`（`rag_config.py:52/58`）要各加一行；`_secret_env_name` 的两次取值（`:199`）**按顶层字段名写死**，而 ASR 的 provider 字段是嵌套的（`rag.video.asr_provider`）⇒ 要认点号路径。`_VIDEO_FIELDS`（`:66`）**不动**。⚠️ **地址也要照 09-25 的规则办**：服务档**留空 ⇒ 报错**（D1 乙"连回落删"），不是悄悄用厂商默认 |
| **D5** | **原生协议档**（做不做 + 值名） | **做**；**原生协议**组 = **每套原生协议一格**——**一期只有一格：`dashscope`**（复用检索行词汇）；**`volc-asr` 随投递挪二期**（火山只有异步 + URL，没有投递就没有它；**不叫 `volcengine-ark`**——ASR 不在方舟域名下）；通用协议格值名 = **`openai-audio`** | 三家都有货（§7）；"每协议一格"是"按协议分档"的直接推论——原生档不是"厂商一格"。⚠️ 说话人 / 词级 / VAD **不构成开它的理由**（协议侧已有对等物：`diarized_json` 带 `speaker`、`chunking_strategy.server_vad`、`timestamp_granularities`；本机 `openai` SDK 2.32.0 为证） |
| **D6** | **长音频的处置**（原"公网投递"） | **一期：不投递**——服务档**只服务 ≤5 分钟**的音频（同步 + base64）；**更长的整段走本地腿**（现状兜底——写明是**接受的现状**，不是缺口）。**投递与切片都记二期**（**投递暂时不做**、等维护者意见；真需要长音频时二选一：**切片** = 音频切 ≤5 分钟片 + 时间戳按片偏移合并（**按时间切、不按分镜切**——分镜块 ≤5 秒（`max_shot_seconds=5.0`）：按它切请求数爆炸、上下文太短掉质量，且打破"整段转写→再分桶"的解耦）；**投递** = 对象存储 + 签名 URL）。投递前细则（二期用）：统一**转 mp3/opus**（16k PCM 约 4 分钟就撞 10 MB base64 上限；压缩后 5 分钟 ≈ 2.4 MB） | **为什么先甲**：为"长音频 + 火山"要引入云存储 + 凭据 + SDK + 配置块，服务的是一个尚未被真实需求验证的场景（且本线未立项）⇒ 按"别为假设的未来需求做设计"降到二期。⚠️ 切片**救不了火山**（它只有异步 + URL）⇒ 火山整体随投递二期 |
| **D7** | **探针落点** | **不新增行**：状态点 + 点击即测挂在**「提供商」那行的右端**（交互语义照 `LegHeading`：一点一次真调用、不落库、hover 给服务端原话）；**结论入表单状态，保存时按结论拦**（只有 `no_timestamps` 拦 Save）；**只挂服务档那几格**（本地引擎不挂）；**内置短 wav 落后端资产**、探针走后端 endpoint（与既有**四支**探针同族：`POST /rag/config/probe-asr` · `require_admin_user` · body `extra="forbid"` · 返回 `{status, detail}` · 10 s 超时 · 不落库）；**判"合成段"用夹具自带的黄金期望**（2026-09-29 裁，替代原"本地基线对照"）：① 段边界必须落进夹具**已知的静音区间**；② 段间 `ms/字符` **不得近似相等**（等分特征）。**不跑本地腿**——实测本地 `load` 8.2–8.4 s 已超探针 10 s 超时，且部署未必装 funasr | 恒显、不藏；本地引擎本就有"加载失败 ⇒ `asr_failed`"的降级路径，不需要探针 |
| **D8** | **降级语义**（服务档的新失败面） | **取「沿用」**：网络失败 / 超时 / 401 / 429 / 5xx ⇒ 收敛为 `AsrError` ⇒ `asr=failed` ⇒ 卡片「（ASR 失败）」——**与本地腿同一契约，不重试、不回退** | 服务档引入的是**网络失败面**，但**状态值不加**（同"不得新增状态值"的既有约束）。**两条二期出路留档**：乙 = 先重试（2 次 + 退避）再失败；丙 = 失败**回退本地腿**（更聪明，但要防死循环） |

**三组四值（一期落地，2026-09-29 固化）**

| 组 | 一期值 | 它是什么 | 要填什么 |
| --- | --- | --- | --- |
| **本地引擎** | `funasr` · `whisper` | **形态**（进程内跑）——**不是协议**：没有端点、没有钥匙 | 只填 Model ID（就是今天这两格） |
| **通用协议** | `openai-audio` | **一个协议族**（说 OpenAI audio 协议的服务）——一格装 N 个服务 | Model ID + API Key + 接口地址（地址填谁就是谁：OpenAI 官方 / 兼容端点 / 本机 `funasr-server`） |
| **原生协议** | `dashscope` | **每套厂商协议一格**——一期只有百炼一格（火山 `volc-asr` 二期） | 同上三格（模型名填**服务侧**名字，如 `qwen-audio-3.1-asr-flash`） |

**仍待裁（不入本表）**

1. **投递的落地方式**（D6 的子项）——**投递暂时不做**：OSS / S3 / 自建 / 现成图床四种都不拍，**等维护者意见、不主动推**。

**已裁补充（2026-09-29）**

- **说话人：用**——服务档各腿开各自开关（百炼 `diarization_enabled` / `speaker_diarization_enabled`、火山 `enable_speaker_info`），本地腿 = `spk_model="cam++"`；真机：多人 6/6 全对、**单人假分裂**，详见姊妹件 spec §7.5。

## 3. 落点（逐面 `file:line`）

> 与姊妹件 spec 的 §3 同构：**面 → 改什么**；末行是 fence（明确不动的部分）。

| 面 | 改什么 |
| --- | --- |
| **配置面** | 后端字面量两处：`app_config.py:156`、`rag_config_file.py:110`（加服务档值）；**顶层**加 `asr_base_url` / `asr_api_key`（`app_config.RagConfig` + `rag_config_file.RagConfigFile` 各一对）；钥匙的四处挂点：`_SECRET_FIELDS`（`rag_config.py:52`）+ `_SECRET_LEGS`（`:58`）+ `_secret_env_name` 认点号路径（`:199`）+ `PROVIDER_ALLOWLIST` 新增 **`asr` 腿**（env 名：`dashscope` → `DASHSCOPE_ASR_API_KEY`、`openai-audio` → `RAG_ASR_API_KEY`、`funasr`/`whisper` → `None`）；前端字面量两处：`types.ts:11`、`config-form.ts:62`；⚠️ 前端 **3 处窄化**（`config-form.ts:185` / `:305` / `:307`）必须一起改；`_VIDEO_FIELDS`（`:66`）**不动** |
| **前端行** | `functional-models-view.tsx`：ASR 行 2→4 行（提供商 / Model ID / API Key / 接口地址）+ 分组下拉（`SelectGroup` 那套）+ 锁法（`LockedBox` 只用于**本地引擎那两格**；服务档两格是普通 `Input` + 灰字占位，照 `endpointPlaceholderFor`）+ 探针（挂「提供商」行右端） |
| **后端分派** | `asr.py:193`（`resolve_provider`）的分派加一支（`dashscope`）；⚠️ **签名要扩**——`resolve_provider` / `transcribe_video` 今天**只收 `model`**，没有地址/钥匙的通道（worker 传 `cfg.asr_base_url` / `cfg.asr_api_key`，探针传候选值）；新增服务档实现（**同步 blocking** HTTP 客户端——`run_file_io` 落线程池；`path` 是**视频文件**，自己读字节 + base64，`parameters.format` 填文件后缀；两种返回形状：百炼 `sentences[]` / 火山 `utterances[]`——火山随投递二期） |
| **抽取** | 新增服务档取数函数（与 `_rows_from_funasr` 并列）：`sentences[]` 优先、`utterances[]` 回退；空/单段 ⇒ 空 rows（**不抛**） |
| **探针 fixture** | 内置短 wav（**SAPI 现造、8.96 s**：句 A 快读 1.84 s + **1.2 s 静音** + 句 B 慢读 5.92 s，段间 `ms/字符` 差 2.1×）；**入库跟踪**才随 wheel 走（hatchling 排除 VCS-ignored，实测过）；建议 `backend/app/gateway/assets/asr_probe.wav`（`app/` 下无资产目录先例，Docker 是 `COPY backend ./backend`，任意路径都随镜像） |
| **降级** | 网络失败 ⇒ `AsrError` ⇒ `asr=failed`（D8）；**不加新状态值** |
| **测试** | `backend/tests/knowledge/video/…`（桩测：请求形状 / 抽取形状 / 降级）+ `frontend/tests/unit/settings/functional-models.dom.test.tsx`（行形状与分组） |
| **不动**（fence） | 本地腿（`FunAsrProvider` 与 cam++ 那套）· whisper 侧 · 卡片三行结构 · `worker.py` 的降级矩阵与分桶规则 · `AsrError` 契约（除 D8 已明确处） |

## 4. 验收

1. **配置面**：`asr_provider` 接受服务档值；**顶层**两个新字段（`asr_base_url` / `asr_api_key`）可读写（钥匙走 secret 机制：掩码哨兵 + env 徽章）；前端 **3 处窄化**不再吞掉新值（新值经"保存 → 重载"往返不变形）。
2. **界面**：ASR 行 **4 行**（提供商 / Model ID / API Key / 接口地址）；下拉**三组**（本地引擎 / 通用协议 / 原生协议），一期共 **4 个值**（`funasr` / `whisper` / `openai-audio` / `dashscope`）；选本地引擎 ⇒ 地址、钥匙**两格锁**，**服务档（通用 + 原生）⇒ 两格都填、地址格是灰字占位**（`dashscope` 占位 `https://dashscope.aliyuncs.com`，通用协议占位 `https://api.example.com/v1`）；探针状态点挂「提供商」行右端，**只有 `no_timestamps` 拦 Save**。
3. **后端抽取**：服务档返回 ⇒ 多 rows（`sentences[]` 优先 / `utterances[]` 回退）；空/单段 ⇒ 空 rows（**不抛**）；本地腿与 whisper 侧**零回归**。
4. **降级语义不变**：网络失败 / 超时 / 401 ⇒ `asr=failed`、卡片仍写「（ASR 失败）」；**不加新状态值**。
5. **真机**：配 `dashscope` + 一个 ≤5 分钟视频 ⇒ 卡片「口述」**多段、带标点**（**说话人不进卡**：卡片三行契约无说话人位，与 §3 fence 一致 ⇒ 说话人另立项，见姊妹件残留账第 1 条）；更长的整段走本地腿（现状不变）；记录**耗时**。
6. **门禁**：后端全量套件 + `make lint` 净；前端 `pnpm test` / `pnpm check` 净；`git diff` 只含本件该动的文件。

## 5. 追加四条（2026-09-29）

1. **加"B 本机形态"**：同属 **OpenAI 协议档**也覆盖**本机服务**——funasr 自带 `funasr-server`（**OpenAI 兼容** `POST /v1/audio/transcriptions`，另有 REST `/asr`；`--device cpu/cuda0 --port 8000`，模型用**服务侧短名**：`paraformer` / `sensevoice` / `fun-asr-nano` / `moss-transcribe-diarize`）⇒ 地址填 `127.0.0.1:8000` 即可。**收益**：GPU/vLLM 依赖关在服务进程里，我们只发 HTTP；"我们进程里跑不动的模型"（LLM 型那三个）由此可用。**若立项，B 应是第一个用例**（不需要外网凭据就能验通）。
2. **把"合成段"写进硬要求**：`funasr-server` 在 `verbose_json` 路径下，若后端只给文本，会**自己造段**——`build_openai_fallback_segments()` 把文本每 80 字切一块、**时间按字符数等比摊开**（`funasr/bin/_server_app.py:94-116`，用在 `:446`）⇒ **"返回里有 segments" ≠ "真时间戳"**，且这种错法在卡片上更难发现（看着正常）。**探针必须能识破它。**
3. ~~**探针要基线对照**（**已裁：并入 D7**，不另立口径）：同一段音频先在**本地 A 形态**（进程内、真时间戳）跑一份基线，再比 B/C 的段边界~~ **改判（2026-09-29，Task 0 实测）：不跑本地基线**——本地腿 `load` 实测 8.2–8.4 s 已超探针 10 s 超时、且部署未必装 funasr ⇒ 改为**夹具自带黄金期望**（边界必须落进夹具已知静音区间 + 段间 `ms/字符` 不得近似相等），判据等价、零额外依赖；已并入 D7。
4. **同步档的三条硬事实（2026-09-29 真机，Task 0 取证）**——实现时**不许漏**：① `parameters.format` **必填**（缺了 400 `UNSUPPORTED_FORMAT` "format is empty"，秒回、音频根本没被读；**值不校验**——`wav/mp3/mp4/aac/ogg/flac/xyz` 全 200 且结果相同 ⇒ 填文件后缀即可）；② **`parameters.speaker_diarization_enabled` 是"分段开关"不是"加说话人"**——**不开它只有一条整段 `output.sentence`**（43.69 s 音频回 `200→43520 ms` 一行），**开了才出现 `output.sentences[]`**；字段必须在 `parameters` **顶层**（塞进 `asr_options` 无效、`diarization_enabled` 也无效）；③ 文本**带标点、无逐字空格**（与本地 `paraformer-zh` 相反），`sentences[i]` = `begin_time`/`end_time`/`sentence_id`/`sentence_end`/`channel_id`/`speaker_id`/`text`/`words[]`（`words[j].punctuation` **恒空串**，标点只在 `text`），同一份结果挂在 `output.*` 与 `output.output.*` 两层。⚠️ 别踩的红鲱鱼：**钥匙被拒时** >≈150 KB 的 body 会以 `ConnectionResetError 10054` 收场（服务端早退 401 后关读端）——**钥匙有效时 1.86 MB base64 正常返回**，与"10 MB 上限"无关。另：`qwen3-asr-flash` 同端点同 body 形状但回 `choices[].message.content[].text` + `annotations`、**完全无时间戳** ⇒ 不可用。

## 6. 相关实测（2026-09-29，属本地档的候选，记此备查）

`OpenMOSS-Team/MOSS-Transcribe-Diarize`（**1.83 GB**、走 `hf-mirror`、需 `trust_remote_code`；缓存落 `E:\app-model\hf-cache\hub`）：**能给出段级结果**——键 `['key','raw_text','sentence_info','text','timestamp']`，`sentence_info` = `{start:1030, end:4470, text:"…。", spk:"S01", timestamp:[[1030,4470]]}`（`sentence` 键为 `null`，键名是 `sentence_info`）。代价：**CPU 上加载 628 s、4.52 s 音频推理 66 s（RTF ≈ 14.6）** ⇒ 每个视频都跑不现实；它的价值在"证明进程内形态也能拿段"，以及给"要不要 GPU / 服务档"提供一个量级参照。


## 7. 来源面调研（2026-09-29；官方文档 + 只读探针）

> 为"原生协议档"取证（他点名要做百炼 + 火山）。**本节只留档**（来源面调研）；结论直接喂 §2（D5/D6 与待裁 1）。⚠️ **§5.1 的三条路径表有两处缺前提，以 §5.4 为准**：同步档**必须**带 `parameters.format`，且**分段依赖 `speaker_diarization_enabled`**。

### 5.1 千问 / 百炼：三条路径

| 路径 | 端点（原样） | 支持哪些模型 | 音频怎么给 | 时间戳 |
| --- | --- | --- | --- | --- |
| OpenAI 兼容 | `POST /compatible-mode/v1/chat/completions`（**是 chat，不是 audio**） | **只 `qwen3-asr-flash`** | `content[].input_audio.data`：URL 或 Data URL base64（≤10 MB） | **不给**（返回纯文本 + `annotations`） |
| DashScope 同步 | （`qwen-audio-3.1-asr-flash` 那条；2026-09-28 已实测） | qwen-audio-3.x-asr-flash | base64 直传 | 给（毫秒级段 + 词） |
| DashScope 异步 | `POST /api/v1/services/audio/asr/transcription`（+ `X-DashScope-Async: enable`）→ `GET /api/v1/tasks/{task_id}` | fun-asr / `*-filetrans` / paraformer | ⚠️ **`input.file_urls`：公网 URL** | 给——结果在 `transcription_url`（24h 有效）：`transcripts[].sentences[]` 带 `begin_time`/`end_time`/`speaker_id` + `words[]`（含 `punctuation`） |

**能力表（非实时那批，挑关键的）**

| 模型 | 上限 | 说话人分离 |
| --- | --- | --- |
| `qwen-audio-3.1-asr-flash` | 5 分钟 / 2GB | ✓ |
| `qwen-audio-3.1-asr-flash-filetrans` | 12 小时 / 2GB | ✓ |
| `fun-asr`（含 mtl） | 12 小时 / 2GB | ✓（`diarization_enabled` + `speaker_count` 2–100） |
| `qwen3-asr-flash` | 5 分钟 / 10MB | ✗ |
| `qwen3-asr-flash-filetrans` | 12 小时 / 2GB | ✗ |

**两条只读探针（零成本）**

- `maas.qianwenaiapi.com` 与 `dashscope.aliyuncs.com` 的 `/compatible-mode/v1/audio/transcriptions` **都是 404**（同域 `chat/completions` 为 401/400、乱路径 404 ⇒ 基线成立）⇒ **两家都没有 OpenAI audio 端点**；"OpenAI 兼容 ASR"是把音频塞进 `chat/completions` 的多模态消息。
- **两个域名是同一套**：拿 `rag_config.json` 里那把 `sk-ws-…` 钥匙分别打两域的 `GET /api/v1/tasks/{task_id}` ⇒ **都 200、返回体逐字段同形** ⇒ 共用账号/接口体系（很可能同一平台的两个品牌域名）⇒ **"百炼这条腿"不必二选一，只是 base_url 不同**（建议默认 `dashscope.aliyuncs.com`，可改）。

### 5.2 火山：ASR 不在方舟域名下

- **方舟模型广场有货**（控制台数据）：语音识别 3 个——`doubao-seed-asr-2-0`（Doubao-录音文件识别2.0，`IsNewestRelease` / `IsDefault` 均为 true）、`seedasr-auc`（1.0）、`seedasr-streaming`（流式）。**选 2.0**。
- **调用形态**：`https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit` + `.../query`（**两步式**：提交拿 task id → 轮询查询）。
- **鉴权**：新版控制台**只要 `X-Api-Key`**（旧版：`X-Api-App-Key` + `X-Api-Access-Key`）；都要 `X-Api-Resource-Id`（**1.0 = `volc.bigasr.auc`；2.0 = `volc.seedasr.auc`**）+ `X-Api-Request-Id`（UUID）+ `X-Api-Sequence: -1`。
- ⚠️ **`audio.url`（音频链接）必填**——**没有 base64/字节直传**；`format` 也必填（`raw` / `wav` / `mp3` / `ogg`）。
- 开关：`show_utterances`（分句 + 时间戳，毫秒级）、`enable_speaker_info`（默认 false，10 人内）、`enable_punc`（**默认 false**）、`enable_itn`（默认 true）。
- 限制：单文件 <512M；提交速率默认半小时最多 500 小时。

**取证来源**：千问 `platform.qianwenai.com/docs`（站内有 `llms.txt` 全量索引）+ 百炼 `help.aliyun.com/zh/model-studio/asr-model`；火山 `docs.volcengine.com/docs/DoubaoVoice/LargemodelrecordingfilerecognitionstandardversionAPI`（从方舟模型详情页"接入文档"进入）+ 控制台模型广场数据接口。

## 8. 非目标与风险

**非目标（明确不做）**

- **不帮起/管 `funasr-server`**——本机服务形态要用户自己起那个进程；我们不代启动、不监控、不重启。
- **不做 GPU 部署**——不帮装 CUDA / vLLM / 驱动（LLM 型模型要 GPU 是用户自己的事）。
- **不做凭据加密**——钥匙沿用现有 secret 机制（掩码哨兵 + env 徽章），不引入额外加密 / KMS。
- **不做多服务池**——不搞多地址轮询 / 负载均衡 / 故障转移：一个配置对一个服务。

**风险**

- **网络失败面**（新）——契约见 D8；探针四态里"连不上"只报不拦 ⇒ 真正拦住保存的只有 `no_timestamps`。

## 9. 归属与顺序

- **文件重叠 ⇒ 串行**：本件要动 `asr.py`，而**姊妹件（本地档输出形状）的 Task 1b / Task 3 也在动同一个文件** ⇒ 两条线**必须串行**——**该约束已解除**（本地档已收尾 `d337f168`，`asr.py` 现无并发占用）。
- **前端**：本件要改 ASR 行（D1 的四行），而 picker 那对**已交付** ⇒ 是"在它上面继续改"，不冲突。
- **先后**：**串行门已清**（本地档 `d337f168` 收尾）⇒ 本件**已立项、开工**（2026-09-29）；Task 0 取证已完成，下一步 Task 1（配置面）。
- **家族**：本件独立成 spec（与 [2026-09-28-video-asr-output-shape-design.md](2026-09-28-video-asr-output-shape-design.md) 是"两条来源面"），不与 video-ingest 合并。

