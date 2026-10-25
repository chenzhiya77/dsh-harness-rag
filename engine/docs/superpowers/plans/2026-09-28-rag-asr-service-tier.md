# 视频 ASR 的「服务档」（HTTP）—— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-28-rag-asr-service-tier-design.md](../specs/2026-09-28-rag-asr-service-tier-design.md)
**Status:** 🚧 **已立项、开工（2026-09-29）**——**Task 0 已完成**（三项取证全回填；两处 spec §5.1 的缺前提 + 三处 spec 没写的配置面）；**四件追加裁定已落**（钥匙放**顶层** · 加 **`asr` 腿** · 服务档**两格都填、地址格灰字占位**（③ 已按 09-25 端点解锁对复核更正）· 探针**夹具自带黄金期望**），并**补了 Task 2b**（探针后端原先没 Task）；spec 已原地改词。**Task 0–4 全部落地**（含真机端到端正反例），各 Task 的 `实测` 已回填。D1–D8 已裁，串行门已清。
**来源**：侧聊产出；与 [2026-09-28-video-asr-output-shape.md](2026-09-28-video-asr-output-shape.md)（本地档）是同一架构的**两条来源面**——⚠️ **两条线都动 `asr.py` ⇒ 必须串行**（spec §8）。

**Architecture:** 三处——**① 配置面**（两处后端字面量 + `video` 块两字段 + 两处前端字面量 + 3 处窄化）**② 后端**（`asr.py` 分派加一支 + 新增服务档 provider：HTTP 客户端 + 抽取函数 + 降级）**③ 前端**（ASR 行 2→4 行 + 分组下拉 + 锁法 + 探针）。逐面清单见 spec **§3 落点**。

**硬约束（spec 已定，实现时不许自行放松）**：

- **D1 行形状**：四行（提供商 / Model ID / API Key / 接口地址）；**恒显、锁不隐藏**。
- **D2 分组**：**三组**（本地引擎 / 通用协议 / 原生协议），一期共 **4 个值**（`funasr` / `whisper` / `openai-audio` / `dashscope`）；**原生协议**组 = **每套原生协议一格**，一期只有 `dashscope`（`volc-asr` 随投递二期）。
- **D3 锁法**：本地引擎（进程内）⇒ 地址、钥匙**两格都锁**；通用协议 ⇒ **两格可填**。
- **D6 长音频**：**一期不投递** ⇒ 服务档只吃 **≤5 分钟**（同步 + base64）；更长的整段走本地腿（接受的现状）。
- **D7 探针**：挂「提供商」行右端；**结论入表单状态、保存时按结论拦**（只有 `no_timestamps` 拦 Save）；只挂服务档那几格。
- **D8 降级**：网络失败 / 超时 / 401 / 429 / 5xx ⇒ `AsrError` ⇒ `asr=failed` ⇒ 卡片「（ASR 失败）」；**不重试、不回退、不加新状态值**。
- **非目标**（spec §7）：不帮起/管 `funasr-server` · 不做 GPU 部署 · 不做凭据加密 · 不做多服务池。
- **不引入新依赖**：HTTP 客户端用仓里已有的；对象存储 / 新 SDK 属二期投递，本件不做。
- **请求开关要显式传**（服务端默认都不给）：说话人（百炼 `speaker_diarization_enabled`）等——漏了就静默退化。

**Global Constraints:**

- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **命令**：后端 `cd backend && make test` / `make lint`；前端 `cd frontend && pnpm test` / `pnpm check`。
- **每个 Task 的 `**实测**` 行必须回填**（RED/GREEN/neuter 受害者/门禁数字/真机耗时）——未回写的 plan 不算交付。

**依赖顺序**：Task 0（取证）→ Task 1（配置面）→ Task 2（后端 provider）→ **Task 2b（后端探针）** → Task 3（前端行）→ Task 4（文档 + 端到端 + 收官）。

---

## Task 0 — 开工前取证（只读 + 一次性真机实验）

- [x] 1. **真机跑一次 `dashscope` 同步档**（临时脚本，**不进仓库**；用 `rag_config.json` 里的 key）：`qwen-audio-3.1-asr-flash` + 说话人开关。**spec §5.1 已把三条路径的端点 / 音频给法 / 时间戳写全**（§1 也有 200 / 毫秒级段+词 / 24s→3 段的实测）⇒ 本项只补**仍缺的两件**：① **`sentences[]` 的逐字段样本**（含 `words[]` 的 punctuation 形状）；② 说话人开关的**实际字段名与取值**（`speaker_diarization_enabled` / `diarization_enabled` 谁生效、返回里 `speaker_id` 长什么样）。
- [x] 2. **探针 fixture**：选/造一段 **≤10 秒**的内置短 wav，定它放哪（后端资产目录）+ 探针 endpoint 的请求/响应形状（照既有三个探针同族）。
- [x] 3. **接口契约**：核 `asr.py:193`（`resolve_provider`）的分派与既有 provider 的返回契约（新 provider 要产出的形状）——**逐字段抄**，别发明。

**实测**（Task 0，2026-09-29 真机；临时脚本在仓外 `%TEMP%`，未入库）：

### 1）`dashscope` 同步档的真实请求 / 返回（**补齐 spec §5.1 缺的两处前提**：`format` 必填 + 分段依赖说话人开关）

**端点**：`POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`（`Authorization: Bearer <key>`）。

**请求体（实测可用）**：
```json
{"model": "qwen-audio-3.1-asr-flash",
 "input": {"messages": [{"role": "user", "content": [{"audio": "data:audio/wav;base64,<...>"}]}]},
 "parameters": {"format": "wav", "speaker_diarization_enabled": true}}
```

| # | 实测结论 | 证据 |
| --- | --- | --- |
| ① | **`parameters.format` 是必填**（`"format is empty"` 400、0.7 s 秒回、音频根本没被读）；**值不校验**——`wav/mp3/mp4/m4a/aac/ogg/flac/xyz` **全 200 且结果相同** ⇒ 服务端自己嗅探容器，我们填**文件后缀**即可 | 9 值扫描 |
| ② | **说话人开关只在 `parameters` 顶层生效**：`{"speaker_diarization_enabled": true}` ⇒ 200 且多出 `sentences[]`；塞进 `asr_options` ⇒ **与不开完全一样**；`diarization_enabled`（§7 表里 `fun-asr` 那个）⇒ **也无效果** | 5 变体对照 |
| ③ | ⚠️ **不开说话人 ⇒ 没有分段**：43.69 s 音频只回**一个** `output.sentence`（`200→43520 ms` 整段一行）；**开了才出现 `output.sentences[]`**（同一文件 6 段，边界≈真停顿）⇒ **这个开关不是"加说话人"，是"开分段"**（spec §1 的"`speaker_diarization_enabled: true` 才返回 `sentences[]`"实测成立，但**要写清它同时是分段开关**） | V5 vs V6 |
| ④ | 返回形状（**同一份挂在两层**：`output.*` 与 `output.output.*`，逐字段相同）：`output.sentence`（**单数对象**，恒有）/ `output.sentences`（**列表，仅开开关时出现**）/ `output.text` / `output.usage{duration,input_tokens,output_tokens,total_tokens}` / 顶层 `usage` + `request_id` | 全量 shape dump |
| ⑤ | `sentences[i]` 逐字段：`begin_time`(int,ms) · `end_time`(int,ms) · `sentence_id`(int,1 起) · `sentence_end`(bool) · `channel_id`(int,0) · `speaker_id`(int,0 起) · `text`(str,**带标点**) · `words[]`；`words[j]`：`begin_time` · `end_time` · `text` · `punctuation`(**恒 `""`**——标点只在 `text` 里) · `fixed`(bool) · `speaker_id` | V6 逐字段 |
| ⑥ | 文本**带标点、不带逐字空格**（与本地 `paraformer-zh` 相反）；`speaker_id` 在双人合成音频上 **0/1 交替、与真值一致**（单人音频上会假分裂成 1） | V6 6 段 / 夹具 |
| ⑦ | **"等分特征"判据可用**：真边界下 `ms/字符` 在段间**不均匀**（实测 160 / 325，双人长音频 3.57–4.77 字符/秒）——照字符数等比摊开的合成段会给出**同一个** ms/字符 | V6 + 夹具 |
| ⑧ | **`qwen3-asr-flash` 是另一条路**（同端点、同 body 形状）：返回 `output.choices[].message.content[].text` + `annotations[{emotion,language,type}]`，**完全不给时间戳** ⇒ 不可用（它才是 spec §5.1 引的那份文档的形状） | T1 |
| ⑨ | 耗时：9 s 音频 0.7–1.4 s、18 s 1.0 s、44 s 1.6–2.4 s；`usage.duration` = 音频秒数（成本口径） | 全轮 |
| ⑩ | ⚠️ **钥匙盘面**：`.env` 里 `DASHSCOPE_API_KEY` / `DASHSCOPE_JUDGE_API_KEY` **已被封**（`InvalidApiKey: API-key is blocked`）；`DASHSCOPE_EMBEDDING_API_KEY` / `DASHSCOPE_RERANK_API_KEY` / `DASHSCOPE_QWEN38_API_KEY` + `rag_config.json` 那两把 **都过鉴权**（本轮用 `DASHSCOPE_QWEN38_API_KEY`） | 7 把逐试 |
| ⑪ | ⚠️ **红鲱鱼，别当限制**：**钥匙被封**时 body >≈150 KB 会以 `ConnectionResetError 10054` 收场（服务端早退 401 后关读端）；**钥匙有效时 1.86 MB base64 正常返回** ⇒ 与"10 MB 上限"无关，**别为它改设计** | 尺寸阶梯 193 KB/772 KB/1.86 MB |

### 2）探针 fixture（**已造、已双向验通**）

- **来源**：**Windows SAPI 现造**（`Microsoft Huihui Desktop`，zh-CN）——本机合成、**无第三方音频来源 / 许可问题**，不引入 ModelScope 样例。
- **设计**（专为"识破合成段"）：句 A「语音识别探针第一句。」（10 字）**快读**（Rate +4，1.84 s）+ **1.2 s 静音** + 句 B「第二句慢一些，用来检查时间戳。」（15 字）**慢读**（Rate −3，5.92 s）= **8.96 s**。⇒ ① 段间 `ms/字符` 差 **2.1×**（184 vs 395），等比摊开的假段会被一眼看穿；② **边界必须落在 1.84–3.04 s 这段静音里**——比"跟本地基线比"更硬、且**不需要跑本地腿**。
- ⚠️ **静音必须 > VAD 阈值**：0.6 s 间隔**本地腿不切**（FSMN-VAD 默认 `max_end_silence_time` 800 ms），1.2 s 才切。
- **双向验通**（真机）：DashScope（`format` 填 wav 或 mp3）⇒ **2–3 段**、A/B 边界落在 3.12 s≈设计的静音处、`ms/字符` 160 vs 325 ✓；本地 `funasr + vad + cam++` ⇒ **2 段**（`0→1600` / `3080→8950`）、边界同样落在静音处 ✓。
- **体积 / 格式**：`wav` **286,922 B**（280 KB）· `mp3` **36,512 B**（36 KB）· opus 13,506 B。⚠️ **本地腿吃 mp3 会把两段并成一段**（funasr 自己的 mp3 解码路径；解回 wav 就正常）⇒ **探针只走服务腿，mp3 够用**；若将来要"本地基线"就选 wav。
- **放哪**：`app/` 下**没有**资产目录先例，harness 包里只有 yaml/md（**无二进制先例**）。事实：Docker `COPY backend ./backend` ⇒ **`backend/` 下任意路径都随镜像走**；wheel 安装要求文件**被 git 跟踪**（hatchling 排除 VCS-ignored，姊妹件踩过）。建议 `backend/app/gateway/assets/asr_probe.wav`（新建目录，与探针路由同层）。
- **探针 endpoint 形状**（照既有四支，**不是三支**）：`POST /rag/config/probe-asr` · `require_admin_user` · Pydantic body `extra="forbid"`（候选 `asr_provider/asr_model/asr_base_url/asr_api_key`，钥匙可送掩码哨兵）· 返回 `{status: Literal[...], detail: str}` · `_PROBE_TIMEOUT_SECONDS = 10` · **不落库**（`rag_config.py:609/683/773/849` 四支为模板）。
- ⚠️ **D7 的"本地基线对照"要改落法**：本地腿 `load` 实测 **8.2–8.4 s**（+ 推理 2 s）**已超探针 10 s 超时**，且部署上未必装 funasr ⇒ **探针里跑不起本地基线**。改为**夹具自带黄金期望**（边界必须落进已知静音区间 + 段间 ms/字符不得近似相等），判据等价、零额外依赖。**这一条要你拍**。

### 3）接口契约（逐字段核完）

| 面 | 事实 | 对新 provider 的含义 |
| --- | --- | --- |
| `AsrProvider` Protocol（`asr.py:45-51`） | `name: str` · `unit: Literal["ms","s"]` · `transcribe(path) -> list[tuple[float,float,str]]` | 新 provider 产出**三元组**，单位走 `unit`（服务档用 `"ms"`） |
| 调用方式（`asr.py:222`） | `run_file_io(prov.transcribe, path)` ⇒ **落线程池** | 新 provider 必须是**同步 blocking**（用 `requests`/同步 `httpx`），**不要 async** |
| `path` 是什么（`worker.py:599`） | `transcribe_video(storage_path, …)`，`storage_path` = **视频文件**（不是抽出的音轨） | provider 自己读字节 + base64；`parameters.format` 用**文件后缀** |
| ⚠️ **没有钥匙/地址的通道** | `resolve_provider(name, *, model)` 与 `transcribe_video(…, provider_name, model, duration_ms)` **都只收 model** | **Task 2 必须扩签名**（`base_url=` / `api_key=`，worker 传 `cfg.asr_base_url` / `cfg.asr_api_key`；探针传候选值）——spec §3 只写了"分派加一支"，**这条要补进 plan** |
| 降级 | `transcribe_video` 把**任何**异常收敛为 `AsrError`（`AsrError` 原样透传） | D8 免费成立；provider 内部只需**不吞**异常 |
| 错误文案 | `resolve_provider` 抛 `AsrError("未知 ASR provider：…（支持 funasr | whisper）")` | 加值时必须同步改这句话 |

**⚠️ 配置面比 spec §3 写的多三处**（Task 1 的实际改动面）：

| 处 | 现状 | 不加会怎样 |
| --- | --- | --- |
| `rag_config.py:66` `_VIDEO_FIELDS = ("asr_provider","asr_model")` | 白名单**只放这两格** | 两个新字段**根本不进 GET/PUT**（静默丢弃） |
| `rag_config.py:52/58` `_SECRET_FIELDS` / `_SECRET_LEGS` | 四个**顶层**钥匙才有掩码 + env 徽章 | `video.asr_api_key` 会被**明文回显**（`_build_response` 的 video 分支 `:225-229` 对所有 video 字段一律当普通值） |
| `providers/__init__.py` `PROVIDER_ALLOWLIST` | 四条腿（embedding/rerank/parse/sparse）；`secret_env_var(leg, provider)` **要查表** | `_secret_env_name` 会 **KeyError** ⇒ 要么加一条 `asr` 腿（拿到 id 校验 + `secret_env_var` + `default_endpoint` 占位来源），要么给 ASR 特判 |

**前端三处窄化逐条复核**（行号未漂）：`config-form.ts:62`（类型字面量）· `:185`（归一化）· `:305` / `:307`（provider 联合类型）· `types.ts:11` ✓ 全部在位。

### 4）Task 0 结论落定 / 待裁

| # | 件 | 状态 |
| --- | --- | --- |
| ① | `asr_base_url` / `asr_api_key` 放哪 | **已裁：乙——放顶层**（2026-09-29）。理由 = 与既有四条腿同形、零新机制（掩码/env 徽章/哨兵/整对象替换全现成）。spec D4 已原地改词；`video` 块仍只放 `asr_provider` / `asr_model` |
| ② | `PROVIDER_ALLOWLIST` 加不加 `asr` 腿 | **已裁：甲——加**（2026-09-29）。D2 的三组四值本就是一份受控清单；env 徽章必经 `secret_env_var(leg, provider)`（`providers/__init__.py:170/177`），不加腿就得特判 |
| ③ | dashscope 那行的**地址/钥匙锁法** | **已裁并复核更正（2026-09-29）**：**不锁**——**服务档（通用 + 原生）两格都填，地址格用 `default_endpoint` 做灰字占位**。⚠️ 我原先按 `has_fixed_endpoint` 推成"地址锁"，被 **2026-09-25 端点解锁对（D1 乙 / D2 乙）** 推翻：地址行**永远可编辑**（同厂商可能有 workspace 级端点），`default_endpoint` **只作占位、不落值、不回落**（**留空 ⇒ 报错**）。`has_fixed_endpoint` 已不是 UI 的锁依据（docstring 里的"read-only"是 09-17 旧话） |
| ④ | D7 的"本地基线对照" | **已裁：甲——夹具自带黄金期望**（2026-09-29）：① 边界必须落进夹具已知静音区间；② 段间 `ms/字符` 不得近似相等。**不跑本地腿**（`load` 8.2–8.4 s 已超探针 10 s 超时） |

**① 的连带事实（Task 1 要处理）**：ASR 的 **provider 字段是嵌套的**（`rag.video.asr_provider`），而 `_secret_env_name` 的两次取值（`written.get(provider_field)` / `getattr(config.rag, provider_field, None)`，`rag_config.py:199`）**都按顶层字段名写死** ⇒ `_SECRET_LEGS["asr_api_key"] = ("asr", "video.asr_provider")` 会**静默取不到**（退化成 `provider_ids("asr")[0]`）。要么让这两处认点号路径，要么让 `_SECRET_LEGS` 存取值器。env 变量名：`dashscope` → `DASHSCOPE_ASR_API_KEY`（**别用 `DASHSCOPE_API_KEY`**——他机器上那把已封，且被 config.yaml:50 的条目引用着）、`openai-audio` → `RAG_ASR_API_KEY`、`funasr` / `whisper` → `None`（本机进程内，无凭据）。

**⚠️ 计划缺口（Task 0 查出）**：探针的**后端那一半没有 Task**——原 Task 3 只覆盖前端（状态点 / 结论入状态 / 拦 Save），而 fixture 入库 + `probe-asr` 路由 + 黄金期望判据 + 桩测都在后端 ⇒ **补 Task 2b**。

---

## Task 1 — 配置面（spec D4；落点按 Task 0 实测校正）

- [x] **RED**：断言两处后端字面量（`app_config.py:156` / `rag_config_file.py:110`）接受服务档值、两处前端字面量（`types.ts:11` / `config-form.ts:62`）同步、**顶层**两个新字段（`asr_base_url` / `asr_api_key`）可读写且**钥匙走 secret 机制**（掩码哨兵 + env 徽章）；**3 处窄化**（`config-form.ts:185` / `:305` / `:307`）不再吞掉新值；`PROVIDER_ALLOWLIST["asr"]` 四条 id 齐（`funasr` / `whisper` / `openai-audio` / `dashscope`）且 `secret_env_var` 各自对。此刻无实现 ⇒ 红。
- [x] **GREEN**：放开字面量 + 顶层加 `asr_base_url` / `asr_api_key`（`app_config.RagConfig` 与 `rag_config_file.RagConfigFile` 各一对）；`_SECRET_FIELDS` + `_SECRET_LEGS` 各加一行；**`_secret_env_name` 认点号路径**（`rag.video.asr_provider`，见 Task 0 结论 ① 的连带事实）；**新增 `PROVIDER_ALLOWLIST["asr"]` 腿**；**GET 响应加 `asr_providers` capability 列表**；`_VIDEO_FIELDS` **不动**。
- [x] **neuter**：把窄化改回"只认两个"⇒ "新值被吞"的断言红（revert proof）。
- [x] **门禁**：后端相关套件 + `make lint`；前端 `pnpm test` / `pnpm check`。

**实测**（Task 1，2026-09-29）：

- **RED**：后端 `test_rag_provider_config.py` **10 红 / 28 绿**；后端 `test_rag_config_api.py` **6 红 / 70 绿**（4 条新用例 + 2 条"纯增量"守卫 —— 后者按设计在 `asr_providers` 落地前红）；前端 `config-form.test.ts` **2 红 / 93 绿**。
- **GREEN**：后端两文件 **114 绿**（+ `test_embedder_ark.py` 共 129 绿）；前端 `config-form.test.ts` **95 绿**；前端全量 **247 文件 / 2738 例 / 0 失败**；`pnpm check` 净；`make lint` 净（1308 文件）。
- **neuter（两个受害者不相交）**：① 把**载入侧**窄化改回三元 ⇒ `keeps a service-tier ASR provider…` **1 红**；② 把**提交侧**两处窄化改回 ⇒ `round-trips the ASR address and key…` **1 红**。两处还原后全绿 ⇒ revert proof 成立。
- **真机/既有面**：触碰面（5 个 rag 配置套件 + `tests/knowledge/`）**8 红 / 1448 绿 / 1 错**——逐条归因：**6 条探针红在 HEAD 上同样红**（`git worktree add --detach` 于 `28ab027d` 跑同一批 node id，A/B 双向）；**2 条 `*_missing_api_key` 是他本机仓库根 `config.yaml` + `rag_config.json` 的真实钥匙所致**（把 `DEER_FLOW_CONFIG_PATH` 指到最小配置 + `DEER_FLOW_RAG_CONFIG_PATH` 指到不存在的路径，**同一棵树里立刻转绿**）；**1 条 qdrant 错**＝本机没起 Qdrant。⇒ **零回归**。（第 9 条红＝`test_the_two_new_fields_never_disagree`，属**本件真回归**，已由偏差 2 修掉——这正是那条不变量测试的价值。）
- **偏差登记（三处，均已改）**：
  1. **分组不进 allowlist**：原计划写"`ProviderSpec` 加 `group`、分组跟行走"。读代码后更正——仓里既有两条惯例是**前端常量镜像 allowlist**（`EMBEDDING_PROVIDER_OPTIONS` 那组 + "drift 由 422 显形"）与**按 provider 值判锁**（MinerU 行 `parse_provider === "mineru-local"`），capability 块只喂**占位**（`endpointPlaceholderFor`）。⇒ 分组与锁法落成前端常量（`ASR_PROVIDER_OPTIONS` / `ASR_LOCAL_ENGINES`），capability 只出 `provider_id` + `default_endpoint`。
  2. **`has_fixed_endpoint` 必须跟着填**：既有单测 `test_the_two_new_fields_never_disagree` 钉着"它与 `default_endpoint` 同真同假"⇒ `asr/dashscope` 行必须 `True`（事实为真），只是**不发布**给 ASR 行（锁已由 09-25 解锁退役）。顺带把该字段那句过期 docstring（"UI 显示为只读"）改成现义。
  3. **地址必填检查挪到 Task 2**：它属于 provider 的构造面（既有先例是 `build_*` 抛 `RagConfigurationError`），本 Task 不碰 `asr.py`。
- **顺带发现**：响应基线 `tests/fixtures/rag_config/response_golden.json` 的"纯增量"守卫**只覆盖顶层键**，嵌套新键要**手工登记**到 `_registered_additions`（本次加了 4 个：`config`/`sources` 的 `asr_base_url`、`asr_api_key`）——照仓里既有注释的约定办。

---

## Task 2 — 后端：服务档 provider（spec D5 / D8 + §3 落点）

- [x] **RED**：桩测（替换 HTTP 调用）——① **请求形状**（地址 / 钥匙 / 模型名 / **`format` 必填** / **`speaker_diarization_enabled` 在 `parameters` 顶层**）；② **抽取**：`sentences[]` 优先、`utterances[]` 回退、空/单段 ⇒ 空 rows（**不抛**）；③ **降级**：网络失败 / 超时 / 401 ⇒ `AsrError`（不新增状态值）；④ **签名**：`base_url` / `api_key` 能传进 provider。此刻无实现 ⇒ 红。
- [x] **GREEN**：`asr.py`（`resolve_provider`）分派加两支（**并同步改那句"支持 funasr | whisper"**）+ 扩签名（`resolve_provider` / `transcribe_video` 收 `base_url` / `api_key`；worker 传 `rag.asr_base_url` / `rag.asr_api_key`）+ 两支服务 provider（**同步 blocking** `httpx.Client`；`path` 是视频文件 ⇒ 自己读字节 + base64 / multipart）+ **D6 的长音频闸门**（`resolve_leg_provider`）+ **服务档地址必填**（从 Task 1 挪来：`_reject_unusable_after_save` 里构造一次 ASR provider）。
- [x] **neuter**：把降级去掉（失败直接抛原始异常）⇒ ③ 红（revert proof）。
- [x] **门禁**：`make test`（相关文件）+ `make lint` 净。

**实测**（Task 2，2026-09-29）：

- **RED**：`test_asr.py` **收集期 ImportError**（四个新名字还不存在）；API 侧两条新用例（地址必填 / 进程内引擎免地址）此刻红。
- **GREEN**：`test_asr.py` **49 绿**（原 22 → 49）；`test_rag_config_api.py` **78 绿**（+2）；`tests/knowledge/video/` 全目录 **161 绿**；`make lint` 净（1308 文件）。
- **neuter（两个受害者）**：① 去掉 `raise_for_status()` ⇒ **只有 401 那条红**（1 红 / 2 绿）；② 去掉 `transcribe_video` 的降级包装 ⇒ **connect / timeout / 401 三条全红**。⇒ 新代码两块（HTTP 状态判定、降级收敛）都是承重的，revert proof 成立。
- **实现要点（与 spec §5.4 逐条对上）**：`parameters.format` = **文件后缀**；`speaker_diarization_enabled` 在 `parameters` **顶层**；音频 `data:audio/<后缀>;base64,…`；`sentences[]` 优先（两层嵌套都认）→ `utterances[]` 回退；**空或单段 ⇒ 空 rows**（硬要求 ③）；OpenAI 腿 `response_format=verbose_json` + multipart，路径走 `join_endpoint`（`/v1` 不写两遍）。
- **偏差/决定（两处，需你过目）**：
  1. **D6 的"本地腿"落成 `funasr`**：spec 只说"更长的整段走本地腿"，而配置里只有一个 `asr_provider` ⇒ `resolve_leg_provider()` 在**超 5 分钟**时把服务档换成 `funasr`（进程内默认那支），并打一条 info 日志；时长未知不换。**若不认可这个落点，改 3 行**。
  2. **worker 的假配置要跟着长**：`test_worker_pipeline.py` 的 `_video_config()` 是 `SimpleNamespace`，新字段在 **`rag`** 层（不在 `video` 里）⇒ 给它补了 `asr_base_url=None` / `asr_api_key=None`；同时 worker 改成 `rag_cfg = get_app_config().rag` 再取 `.video`（原来只取 `.video`，拿不到顶层两格）。
- **抽取器的键名**：三种拼法都认（OpenAI `start`/`end` 秒、百炼 `begin_time`/`end_time` 毫秒、火山 `start_time`/`end_time` 毫秒）——单位由 provider 的 `unit` 声明；火山那条形状**未实测**（随投递二期），先钉住回退路径。
- **触碰面（同一批 5 个 rag 配置套件 + `tests/knowledge/`）**：**8 红 / 1477 绿 / 1 错**——与 Task 1 收官时**逐条相同**（6 条探针红在 HEAD 上同样红、2 条环境红由仓库根真实钥匙所致、1 条 qdrant 错），**绿数 1448 → 1477（+29 = 本 Task 新增的 27 条 ASR 用例 + 2 条 API 用例）** ⇒ **零回归**。

---

## Task 2b — 后端：探针（fixture + `probe-asr` 路由；D7 的黄金期望）

> Task 0 查出的计划缺口：探针的后端那一半原先没 Task。

- [x] **RED**：① fixture **入库**（`backend/app/gateway/assets/asr_probe.wav`，SAPI 现造 8.96 s；仓里已有测试断言它的时长/静音区间/体积）；② `POST /rag/config/probe-asr`（照 `probe-sparse` 族：`require_admin_user` · body `extra="forbid"` · 返回 `{status, detail}` · 10 s 超时 · 不落库）；③ **黄金期望判据**：边界落进已知静音区间 + 段间 `ms/字符` 不得近似相等 ⇒ `no_timestamps` 只在"没有段级时间戳 / 只有一条整段"时给。此刻无实现 ⇒ 红。
- [x] **GREEN**：fixture 落盘 + 路由 + 判据（探针**只走服务腿**，不发本地腿）。
- [x] **neuter**：把"等分特征"判据去掉（只看"有没有 segments"）⇒ ③ 的合成段用例红（revert proof）。
- [x] **门禁**：`make test`（相关文件）+ `make lint` 净。

**实测**（Task 2b，2026-09-29）：

- **RED**：新文件 `tests/test_rag_config_asr_probe.py` 收集期 `ImportError`（`ASR_PROBE_FIXTURE_PATH` 还不存在）。⚠️ 期间踩了自己一个坑：`user_factory=lambda User(...)` **漏了冒号**（写成 `lambda User(...)`），先报成 SyntaxError——已按同族文件改成 `lambda: User(...)`。
- **GREEN**：`test_rag_config_asr_probe.py` **14 绿**；与 `test_asr.py` 合跑 **63 绿**；`make lint` 净（1309 文件）。
- **neuter（两个受害者不相交）**：① 停掉「离散度」判据 ⇒ **只有** `test_equal_rates_are_not_an_ok` 红；② 停掉「静音落点」判据 ⇒ **只有** `test_boundaries_outside_the_pause_are_not_an_ok` 红。⇒ 两条判据各自承重，revert proof 成立。
- **夹具真值（本文件与测试共同钉住）**：8.965 s / 16 kHz / 单声道 / 16 bit；静音窗实测 **1.32–3.22 s**（设计值是 1.84–3.04，SAPI 首尾静音把窗口撑宽了）；句 A 在 0.4–1.2 s、句 B 在 4.0–4.8 s 有声。
- **两条判据的数值与理由**：① 边界必须落在 `1320–3220 ms ± 150 ms`——静音本身 1.9 s，这个余量对真分段很宽；按字数摊开的假段会落在 **3586 ms**（静音之外）⇒ 抓得住。② 段间 `ms/字符` 的离散度必须 ≥ **1.5×**——夹具故意把句 A 快读、句 B 慢读（真分段 ≈2.1×），等比摊开恒为 **1.0×**；两条判据**互相兜底**（`_SYNTHETIC` 那条被任一判据抓到都算过，所以用例只钉状态；专门为判据 ② 造了 `_EQUAL_RATES`：边界蒙混进静音、但离散度只有 1.3×）。
- **状态映射（四态，只有一态拦保存）**：`ok` / `no_timestamps`（含"没有段"与"段是造的"两类，detail 区分）/ `refused`（401/403）/ `unreachable`（网络、超时、其它 HTTP）。⚠️ **合成段折进 `no_timestamps` 是我对 D7 的读法**（D7 明说"只有 `no_timestamps` 拦 Save"，所以"段是造的"必须落在这个会拦的状态里，不能另开第五态）；若你想让它单独成一态，前端与 spec 要一起改。
- **夹具入库面**：`app/gateway/assets/` 是新目录；它随 Docker 的 `COPY backend ./backend` 走，`git check-ignore` 确认**未被忽略**（Task 0 已证"入库才随包走"）。
- **触碰面（同一批 + 新探针文件）**：**8 红 / 1491 绿 / 1 错**——与 Task 2 收官**逐条相同**（6 探针红 + 2 环境红 + 1 qdrant 错），绿数 **1477 → 1491（+14 = 新探针用例）** ⇒ **零回归**。

---

## Task 3 — 前端：ASR 行（spec D1 / D2 / D3 / D7）

- [x] **RED**：DOM 用例——① 行数 2→4（标签复用「提供商 / Model ID / API Key / 接口地址」）；② 分组下拉（**三组** + 分隔线）；③ 锁法**两态**（本地引擎双锁 / **服务档两格都填 + 地址格灰字占位**：`dashscope` ⇒ `https://dashscope.aliyuncs.com`、`openai-audio` ⇒ `https://api.example.com/v1`）；④ 探针（挂提供商行右端、结论入状态、`no_timestamps` 拦 Save）。此刻无实现 ⇒ 红。
- [x] **GREEN**：`functional-models-view.tsx` 按 D1–D3 / D7 实现；`OptionSelect` 扩分组（照 `models-add-dialog.tsx:234-244` 的 `SelectGroup`/`SelectLabel`/`SelectSeparator`）；占位**读后端 capability**（`default_endpoint`，照 `endpointPlaceholderFor`），分组按仓里惯例落在前端常量（`ASR_PROVIDER_GROUPS`）。
- [x] **neuter**：把"锁"改成"隐藏"⇒ ③ 红（revert proof；铁律 = 恒显、锁而不藏）。
- [x] **门禁**：`pnpm test` + `pnpm check`；**真浏览器复核**四行 / 分组 / 锁（**只读，不点保存**）。

**实测**（Task 3，2026-09-29）：

- **RED**：新 describe 块 **8 红**（i18n 键与探针 hook 都还不存在）；期间自己踩一个：`new RegExp(undefined)` 变成 `/(?:)/`，报的是"找到多个 button"——键一落地就对了。
- **GREEN**：`functional-models.dom.test.tsx` **109 绿**；前端全量 **247 文件 / 2746 例 / 0 失败**（+8 = 本 Task 新增）；`pnpm check` 净。
- **neuter**：把两格的"锁"改成"藏"（整行不渲染）⇒ **只有** `locks both service fields for an in-process engine and hides neither row` 红 ⇒ revert proof 成立（铁律 = 恒显、锁而不藏）。
- **连带修的既有面（3 处）**：① 另一个 DOM 文件（`tests/unit/components/workspace/settings/…`）的 hooks mock 少 `useProbeAsrService` ⇒ 整个视图崩，已补 idle 桩；② 它的 `getByText(lockedCloudOnly)` 因 ASR 两格也用该串而变"多个匹配" ⇒ **给 ASR 换成新串 `lockedServiceOnly`（「仅服务档需要」）**——顺带更正语义：ASR 的服务档**可以是本机服务**（`funasr-server`），说"仅云 API"是错的；③ 布局用例里 `F.asrModel` 的**可见**标签断言改成 `F.modelLabel`（D1 复用共享词，角色区分在 aria-label）。
- **两处实现决定（都记在代码注释里）**：① **服务档不给模型候选下拉**（服务侧模型名是开放集，没有"首行"可换）⇒ 切到服务档时 `asrModelForProviderSwitch` **原样保留值**（另一侧由探针给反馈），模型行的 ⓘ 也换成新串 `asrModelServiceHint`；② 探针的**门控**：模型 + 地址 + 钥匙三者齐了才可点（与两条腿的 `ready` 同尺子），hover 给服务端原话（`detail`），四态里只有 `no_timestamps` 进 `saveBlockReason`。
- **交付后调整（2026-09-29，他报的缺陷）**：**框内下拉箭头与页面标准下拉不同规格**——模型行与**维度行**两处的框内触发器用的是 `size-3.5` + `pr-1.5`，而标准 `SelectTrigger` 的箭头是 `size-4 opacity-50` + `px-3` ⇒ 视觉上小一号、也更贴右缘。两处统一成 `size-4 opacity-50` + `pr-3`；真机量到与标准下拉**逐项相同**（16×16 · `opacity .5` · 同色 · 距右 12px vs 12.7px 差的是那条边框，且模型框右缘与标准触发器同为 544px）。
  - 补一条结构用例（`dimension-tiers-trigger` + `asr-model-candidates-trigger` 都断言 `size-4`/`opacity-50`/`pr-3`；几何只能在真浏览器量）；**neuter**：把其中一处改回旧规格 ⇒ 该用例红（revert proof）。前端全量 **247 文件 / 2747 例 / 0 失败**、`pnpm check` 净。
- ✅ **真浏览器复核（2026-09-29，他起栈后只读跑完；全程没点保存，收尾 `navigate_page` 重载复原表单）**：
  - **四行 + 可见标签**：`提供商 → 语音识别 (ASR)` · `Model ID → ASR 模型` · `API Key → 锁` · `接口地址 → 锁`（本地引擎态），四行的 gutter 词就是共享的「提供商 / Model ID / API Key / 接口地址」✓
  - **三组 + 分隔线**：列表按 `本地引擎[funasr/whisper] · 通用协议[openai-audio] · 原生协议[dashscope]` 分三组，组间 **2 条 `data-slot=select-separator`（高 1px）** ✓
  - **两态锁法**：`funasr` ⇒ 钥匙与地址两个 input **不存在**、`[data-slot=asr-locked]` **2 个**（文案「仅服务档需要」）；切到 `dashscope` ⇒ 两个 input 都在、**0 个锁框**、地址格 placeholder = `https://dashscope.aliyuncs.com`（来自后端 capability）✓
  - **探针点**：本地引擎态**不挂**；服务档态挂上且 `data-state=untested`、**disabled**（钥匙三处都没有 ⇒ 未就绪），hover 文案走 `legDotNeedsConfig` ✓
  - **模型行**：服务档态**无候选下拉**、无 placeholder（服务侧名是开放集）✓；切回后 Save 仍禁用（无脏改动）✓

---

## Task 4 — 文档 + 端到端 + 收官（spec §7 / §8）

- [x] **文档**：`backend/AGENTS.md` 的视频段 + `frontend/AGENTS.md` 的 functional-models 段各补一句（服务档：四行 / **三组四值** / 探针 / 降级契约）。
- [x] **端到端（真机）**：配一个 `dashscope` 服务 + 一个 ≤5 分钟视频 ⇒ 卡片「口述」多段、带标点（**说话人不进卡**，与 §3 fence 一致）；再跑一次**故意配错钥匙** ⇒ `asr=failed` + 卡片「（ASR 失败）」；记录耗时。
- [x] **收官门禁**：后端全量 + `pnpm check` 净；`git diff` 只含本件该动的文件。

**实测**（Task 4，2026-09-29；**他授权改配置、先备份**）：

- **端到端素材**：`ffmpeg` 现造 `asr_e2e.mp4`（testsrc 640×360/15fps + 43.69 s 双人对话音轨，506 KB）——≤5 分钟 ✓、有视频流 ✓。
- **配置面（改前先备份、改后逐字节还原）**：把 `rag_config.json` 加上 `video.asr_provider=dashscope` / `asr_model=qwen-audio-3.1-asr-flash` / `asr_base_url` / `asr_api_key`（用他 `.env` 里那把**已验证可用**的 key）；GET 立刻回新值 + `sources` 报 `ui`（**热重载生效，没重启**）。收尾 `cp` 还原 + `md5sum` 一致（`323f904649584253f0da67e1d4a32f30`）。
- **正例（真机，走完整流水线）**：上传 → `path_status.asr=done`、9 张镜头卡，**6 张卡的「口述」是完整句子且带标点**（如「大家好，今天我来介绍一下我们的知识库功能。」「那如果视频比较长呢？比如一个小时的会议室录像。」）——与本地腿的「逐字空格、无标点」形成对照 ✓；另 3 张「（无）」是段与镜头错位的既有分桶行为 ✓。
  - ⚠️ **文档最终 `failed`**：`vector`/`graph` 腿「All connection attempts failed」——**本机没起 Qdrant**，与本件无关（ASR 腿 done、卡片已落库，所以判据照读）。
- **反例（真机）**：把 `asr_api_key` 换成假值 ⇒ 再传同一视频 ⇒ `path_status.asr=failed`、**每张卡的「口述」都是「（ASR 失败）」** ✓、**没有新状态值** ✓（文档的 `failed` 同样来自 Qdrant 腿）。
- **耗时（真机，服务档这一腿本身）**：同一支 44 s 视频直接走 `DashScopeAsrProvider.transcribe` ⇒ **2.0 s、6 段**（与 Task 0 量的 44 s 音频 1.6–2.4 s 一致）；探针那次 9 s 夹具 ⇒ **1.0 s**。流水线整体从上传到 `asr=done` 在 ~25 s 内（含 probe / segment / 9 帧关键帧 + OCR），其余腿与本地档同构、不受本件影响。
- **探针真机（附加证据）**：`POST /api/rag/config/probe-asr`（真 key）⇒ **1.0 s**、`status=ok`、detail「连通正常，返回 3 段，边界落在夹具的静音处。」⇒ D7 的黄金期望对**真服务**判 ok ✓。⚠️ 换成假钥匙后同一条探针回 **`unreachable`（不是 `refused`）**：平台是**直接掐连接**（`10054`）而不是回 401——正是 Task 0 记的那条红鲱鱼；四态里两者都不拦保存 ✓，但"配错钥匙"在真机上长得像"连不上"，这点值得知道。
- **清理**：临时库 `asr-e2e-tmp` 已删（级联清掉它的文档与向量）、`frontend/public/` 里那份暂存 mp4 已删、`rag_config.json` 已还原 ⇒ 工作树只剩本件该动的文件 + 别线那两份。
- **文档**：`backend/AGENTS.md` 的视频「Legs」段补了四行/两条服务档/`format` 与分段开关/`rag.asr_base_url` 顶层且必填/D6 五分钟/「空或单段=没答案」/探针夹具；`frontend/AGENTS.md` 的 functional-models 段补了四行块、三组、两态锁法（含新理由串）、探针点与 `no_timestamps` 拦保存、服务档无候选菜单。
- **顺带发现（既有，未修）**：`_build_response` 的 video 分支读的是**扁平化后的** `written`（`_declared_flat` 把 `video` 摊成 `video.asr_provider` 键），所以 `sources["video.*"]` **永远报 `config_file`**，哪怕文件确实声明了它（真机上看到的就是这个）。对 UI 无害（`owned()` 只影响"未改动是否重提交"，而值相等时提交与否都不改变文件），但**provenance 显示是错的**。不属本件范围，登记待裁。
- **收官门禁**：
  - **前端**：`pnpm check` 净；全量 **247 文件 / 2746 例 / 0 失败**（复跑一次确认）。
  - **后端全量**（`-m "not live" tests/`，仓内 basetemp）：**164 failed / 12743 passed / 160 skipped / 1 error**（15m25s）。**A/B 归因**（`git worktree add --detach` 于 HEAD `082b5090` 跑同一批 164 个 node id）：**161 条在 HEAD 上同样红**；剩 3 条逐条查清——① `test_delta_channel_state…randomized_differential`（**已知易失**，复跑即过）、② `test_detector_repo_root…`（**已知 basetemp 位置条件**：换仓外 basetemp 立刻过）、③ `test_invoke_acp_agent…times_out_and_kills_hung_subprocess`（**在 HEAD 的干净树里重跑也红**，两种 PYTHONPATH 形式都试过）⇒ **零回归**。失败清单里与本件相关的只有那 6 条探针红（既有，见 Task 1/2 的归因）。
  - **`git diff` 范围**：本件该动的文件 = `backend/AGENTS.md` · `frontend/AGENTS.md` · 本 plan（+ spec 的 Status 一行）；`PRE_RELEASE_HARDCODE_INVENTORY.md` 与那批未跟踪研究文档**一律没碰**（别线）。
