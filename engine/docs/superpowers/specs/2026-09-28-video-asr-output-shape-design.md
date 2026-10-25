# 视频 ASR 腿的输出形状：抽取器校准 + 整段一行的可观测（VAD 接线；分段留给装 punc）—— 设计

**Status:** 🟢 **已裁（2026-09-28 立；2026-09-29 裁 D1/D2/D3；同日两次按真机实测改判）** —— **D1 = 补 VAD + `spk_model="cam++"`（分段顺带获得，VAD 段粒度；仍不补 `punc_model`）**（2026-09-29 二次改判，见 D1 追加段与 §7.5）**· D2 = 甲（校准 + 把"没有句级"变可观测——本件核心）· D3 = 默认全配 VAD + 例外名单**；未开工、未提交。成对 plan：[2026-09-28-video-asr-output-shape.md](../plans/2026-09-28-video-asr-output-shape.md)。**全部现象均为 2026-09-28/29 真机实测**（本机 venv + 缓存权重 + 8s 示例 wav，走 `FunAsrProvider.transcribe` 全路径），非推断。

**来源**：由 [2026-09-27-rag-asr-model-picker-design.md](2026-09-27-rag-asr-model-picker-design.md) 的 plan `实测` 越界发现立项（那条线的范围是纯前端，本件动 `backend/`）。

**相关记录**：[2026-09-08-video-ingest-design.md](2026-09-08-video-ingest-design.md)（ASR 腿出处与降级矩阵）。

## 1. 问题（四条现象 + 一条从未校准）

| # | 现象 | 证据（真机） |
| --- | --- | --- |
| ① | 调用侧**只传** `model` + `batch_size_s`，而官方 CLI 预设带 VAD/标点 | `asr.py:98-99`：`AutoModel(model=…, disable_update=True)` + `generate(input=path, batch_size_s=300)`；`funasr/cli.py:11-16` 的 `MODEL_CONFIGS`：`paraformer` = `{model: paraformer-zh, vad_model: fsmn-vad, punc_model: ct-punc}`、`paraformer-en` 带 `vad_model`、`sensevoice` 带 `vad_model` + `max_single_segment_time: 30000` |
| ② | 输出**没有句级 `sentence`**（`timestamp` 有）⇒ `_rows_from_funasr` 走"整段一行"分支 | 实测返回 `KEYS = ['key', 'text', 'timestamp']`；全路径产出 **ROWS = 1 / SEGMENTS = 1**（`410→7555`） |
| ③ | 文本**逐字带空格、无标点** | 实测：`国 务 院 发 展 研 究 中 心 市 场 经 济 研 究 所 副 所 长 邓 玉 松 认 为` |
| ④ | 后果：整段挤进**一张**镜头卡，其余口述「（无）」 | `worker.py:93-125` 分桶规则（重叠占比最大；平局取早 ⇒ 等长镜头下=第一个） |
| ⑤ | 抽取器**从未按真机校准** | `asr.py:127-150` 的 docstring 自述「真实输出形状在 Task 7/12 集成时校准」 |

**影响面**：**每个**视频的「口述」行都是"整段一句话 + 逐字空格"——卡片可读性与向量检索质量同时受损。

**为什么一直没被发现**：ASR 是**降级腿**，失败有明确路径（`asr=failed` + 卡片「（ASR 失败）」）；而"成功但产出退化"**没有信号**——`worker.py:604` 照标 `asr=done`。这是**静默的质量缺陷**，比"填错模型名"更根本。

## 2. 决定（已裁 2026-09-29：D1 补 VAD + cam++ / D2 甲 / D3 默认全配 VAD + 例外名单）

### D1 —— 调用侧补哪些配件：**补 VAD + `spk_model="cam++"`**（2026-09-29 裁，同日二次改判）

**做法**：`AutoModel(model=…, vad_model="fsmn-vad", spk_model="cam++")`——**仍不补 `punc_model`**；**分段由 cam++ 顺带获得**（VAD 段粒度 + 每段带 `spk`）。

**追加裁定（2026-09-29 二次改判；真机取证见 §7.5；VAD 那半已随 plan 的 Task 1 交付，`spk_model` 追加落 Task 1b）**：原裁定是"只补 VAD、放弃分段、接受整段一行"（见下"原裁定留档"）。实测发现 **`spk_model="cam++"`（28 MB）在无 punc 时自动退到 `vad_segment` 模式**，**顺带产出 `sentence_info`**（`auto_model.py:1206-1207`）⇒ "整段一行"被打破、说话人也拿到。**代价**：gen ≈**2.3×**（90s：19.7s vs ≈8.5s）。**两条边界**：① **单人音频会假分裂**（同一人重复 90s 被聚成 0/1 交替）② **段粒度由 VAD 定**（400ms 间隙整段合一；1.2s 才切 6 段）——不由说话人切换定。

⚠️ **两个别踩的坑（2026-09-29 源码核）**：① **"模型自带标点" ≠ "标点句分段"**——funasr 的句级分段只读 **punc 模型的 `punc_array`**（`auto_model.py:1072`：`if self.punc_model is not None and "timestamps" not in result`），自带标点只让**文本**带标点（段边界仍是 VAD 段）；② **一条免费分段近路**：`sentence_timestamp=True` + **无时间戳**的模型 ⇒ `_vad_segment_sentences`（`:1211-1212`）直接给 VAD 段——可惜 `paraformer-zh` 有 `timestamp`，走的是"warning + 空"那条（Task 0 已实测）。

**原裁定留档（2026-09-29 上午）**（⚠️ 其中"分段绕不过 punc"已被同日下午的 cam++ 实测推翻——见上"追加裁定"）：
- **分段这件事绕不过 punc**：`vad` 单用**不分段**（90s 实测 `n_items` 仍为 1——`AutoModel` 把 VAD 各段并回一条）；只有 `sentence_timestamp=True` 才产 `sentence_info`，而它在"有模型时间戳、无 punc"时走 `auto_model.py:1207-1215` 的 `elif punc_res is None:` ⇒ **warning `punc_model is required for sentence_timestamp` + `sentence_info=[]`**。
- **punc 的体积与"本机离线"冲突**：`ct-punc` 1.2 GB / `ct-punc-c` 283 MB（本机缓存实测）。
- ⇒ 权衡结论：**不装 punc、放弃分段**；VAD 保留（3.9 MB，长音频先切段逐段识别再并回——稳定性收益），标点随识别模型自带/不带。

**两条将来出路（本件不做，记此备查）**：① 装 `ct-punc-c`（283 MB）+ `sentence_timestamp=True` ⇒ 分段 + 标点（90s 实测 27 段、段长 3–4.5s）；② 换自带标点与句段的识别模型（SenseVoice / whisper 系，各有代价：SenseVoice 按当前调用 0 段，whisper 系体积 0.5–3 GB）。

**已知代价（明说）**：本件**不修**「整段挤进一张镜头卡」（缺陷保留），也**不修**逐字空格/无标点；本件交付的是**可观测**（D2）+ 长音频稳定性（VAD）。

**早先记过的选项（留档）**：甲 = vad + punc · 乙 = 只补 punc（长音频仍无切分）· 丙 = vad + punc + `pred_timestamp=True`（实测多余：不传也有 `timestamp`）。

### D2 —— 抽取器怎么校准（`asr.py:127-150`）：**取甲（校准 + 把“没有句级”变可观测）**

- **甲（推荐，已裁）**：保持 `sentence_info` 优先 + `timestamp` 回退（**键名按真机校正**：真机里出现的是 `sentence_info`，`sentence` 从不出现），**但把"没有句级"变成可观测**——跨度≈全长（"整段一行"）时记一条 warning，必要时在 `path_status` 上留痕；防的是这条缺陷再次静默复发。
- 乙：只按真机形状校准取数，不加可观测（省事，但下次退化仍无声）。

### D3 —— 配件从哪来（**开放集问题**）：**取「默认全配 VAD + 例外名单」**

`asr_model` 是自由填的（ModelScope 任意 id / 本地目录），而配件为 **VAD + `spk_model`**——VAD 官方四条预设**全都带**（`cli.py:11-16`，4/4）；`spk_model` 由 CLI 的 `--spk` 控制（`cli.py:613-614`）⇒ 仍不需要"已知名 → 配件"的表：

- **做法**：默认给所有名字配 `vad_model="fsmn-vad"` + `spk_model="cam++"`，另加一份**例外名单**（这些名字**两个都不加**）：`paraformer-zh-streaming`（流式、按 chunk 调，不适用切段）· `Whisper-*`（ModelScope 托管的 whisper，走它自己的路径）。
- 原三选项的处置：甲（小表 + 默认组合）**不再需要**（配件只剩一个、且人人适用）；乙（只对已知名补）**否**（自定义名才是开放集的大多数）；丙（配件做成配置项）**二期**。
- ⚠️ 早先那条"别一刀切给所有模型加 punc"的提醒随裁消失（不再加 punc），但**例外名单**承接了同一种风险（别一刀切给所有名字加 VAD / cam++）。

## 3. 落点

| 面 | 改什么 |
| --- | --- |
| 调用 | `asr.py:98-99`：`AutoModel(...)` 带 `vad_model="fsmn-vad"` + `spk_model="cam++"`（例外名单两个都不加）；**不补 `punc_model`**、不传 `sentence_timestamp`（分段由 cam++ 顺带，见 D1） |
| 抽取 | `asr.py:127-150`：按真机形状校准 + 可观测（按 D2） |
| **不动** | 分派与降级语义（`AsrError` 契约）· whisper 侧 · 卡片三行结构 · `worker.py` 的降级矩阵与分桶规则 |

## 4. 验收

1. **真机**（本机 funasr + 缓存权重 + 示例 wav）：补上 `vad_model` + `spk_model` 后 **rows > 1**（VAD 段粒度，每段带 `spk`——2026-09-29 二次改判后的新期望；原期望"rows 仍为 1"作废）；文本形态不变（`paraformer-zh` 逐字空格、无标点）；
2. **可观测生效**：`_rows_from_funasr` 对"整段一行"（跨度≈全长）**给出信号**（warning，必要时 `path_status` 留痕）——本件的核心交付；
3. **降级语义不变**：依赖缺失 / 加载失败仍 `asr=failed`、卡片仍写「（ASR 失败）」；
4. **门禁**：后端套件 + `make lint`；真机腿记录**耗时**（成本上升要给数）。

## 5. 非目标与风险

- **非目标**：不做 ASR 服务档（另条线）· 不改 whisper 侧 · 不改卡片三行结构 · 不做模型能力探测/候选化（那是另一条线）· **不补标点模型** · 分段**由 cam++ 顺带获得**（VAD 段粒度；**不装 punc、不做标点**）——原"不修分段"随 2026-09-29 二次改判作废。
- **风险**：① **成本上升**——多加载一个 VAD（3.9 MB）+ 一个 cam++（28 MB，首次下载），且 **gen ≈2.3×**（90s：19.7s vs ≈8.5s；对照数见 §7.5）；② **VAD 会改变长音频的识别路径**（先切段逐段识别再并回），需真机复核一轮文本与耗时是否符合预期；③ **说话人标签不可全信**——单人音频会**假分裂**（实测 0/1 交替），段粒度由 **VAD 静音判定**决定（无停顿的快速对话会并段、标签跟着变粗）。

## 6. 归属与顺序

- 与 [2026-09-27-rag-asr-model-picker-design.md](2026-09-27-rag-asr-model-picker-design.md)（纯前端）**零文件重叠**，可并行。
- 动 `asr.py`，与其它动该文件的线**串行**（video-ingest 线已交付，当前无冲突）。

## 7. 待办（Task 0 取证）——**已跑完（2026-09-29，真机；原始记录见 plan 的 `实测`）**

1. ✅ **只补 VAD 真机跑**：**段数不会 > 1**（`n_items=1`，90s 亦然）——真机证明**分段绕不过 punc**；耗时对照见 plan（`load` 明显变长）。**顺带跑了 `sensevoice`**：`AutoModel` 不认这个别名（须 `iic/SenseVoiceSmall`），且按当前调用 **0 段**（无 `timestamp`）⇒ 结论供 picker 的 ⓘ 注记用。
2. ~~**`ct-punc` vs `ct-punc-c`**~~ **取消留档（2026-09-29：不补标点，无 punc 可配）**——顺带记到数：**1.2 GB / 283 MB**（§2 D1 的"将来出路"引用它）。
3. ✅ **长音频（90s）粒度**：`vad` 单用不分段（1 条）；`vad + sentence_timestamp`（配 punc）⇒ **20–27 段、段长 3–4.5s** ⇒ 本件用不上，将来装 punc 时可直接用这组数判分桶。
4. ✅ **例外名单核对**：`paraformer-zh-streaming` / `Whisper-*` 与 `sensevoice` 预设（`vad_kwargs: max_single_segment_time: 30000`）逐 key 已核。
5. ✅ **cam++（说话人）真机取证（2026-09-29 下午）**：`spk_model="cam++"`（28 MB，MS `iic/speech_campplus_sv_zh-cn_16k-common`）——① **单人 90s**（同一句重复 20 次）⇒ `sentence_info` **8 段**、`spk` **0/1 交替**（**假分裂**）；② **双人对话**（SAPI 合成 6 句交替 + ffmpeg 变调造第二人、1.2s 间隙）⇒ **6 段、A→0 / B→1 全对（6/6）**；③ **粒度由 VAD 定**：400ms 间隙 ⇒ 整段合 1 段、1.2s ⇒ 6 段；④ 耗时：43.7s 音频 gen 11.6s / load 6.0s；90s 对照 gen 19.7s（≈2.3×）。
