# 视频 ASR 腿的输出形状（抽取器校准 + 整段一行可观测；**放弃分段**）—— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-28-video-asr-output-shape-design.md](../specs/2026-09-28-video-asr-output-shape-design.md)
**Status:** ✅ **已交付（2026-09-28 成对；2026-09-29 收官）**。**D1 = 只补 VAD 且明确放弃分段 / D2 甲 / D3 = 默认全配 VAD + 例外名单（2026-09-29 裁）**；**Task 0 ✅ 已跑完**（真机记录见下 `实测`）——其中"补了配件也达不到 rows>1"一条促成了 D1 的改判（当日再由 cam++ 二次改判，见 Task 1b）。**Task 1 ✅（`dcd1142d`）/ Task 1b ✅（`2c17c94b`）/ Task 2 ✅（`15b72ab5`）/ Task 3 ✅（`479a7ffa` 代码 + `d337f168` 文档）**——Task 1：RED 1 红/17 绿 → GREEN 18 → neuter 1 红 → 还原 18；Task 1b：RED 1 红/19 绿 → GREEN 20 → neuter 1 红（spk）→ 还原 20 + 真机（rows=8、每段带 `spk`）；Task 2：RED 2 红/18 绿 → GREEN 20 → neuter 1 红（告警）→ 还原 20；Task 3：文档 + 端到端（进程内真机）+ (a) 跨度判据 + (b) 跨件回改 + 门禁（后端全量 **163 / 12739 / 109**、A/B 双向差 1 条 flake ⇒ **零回归**）；`tests/knowledge/video` **134 例**、`make lint` 净。
**来源**：[2026-09-27-rag-asr-model-picker.md](2026-09-27-rag-asr-model-picker.md) 的 `实测` 越界发现（那条线纯前端、本件动 `backend/`，两者零文件重叠）。

**Architecture:** 两处——**① 调用侧只带 `vad_model="fsmn-vad"`**（`asr.py:98-99`；**不补 `punc_model`**——真机已证"分段绕不过 punc"，本件放弃分段）**② 抽取器按真机形状校准 + 把"整段一行"变可观测**（`asr.py:127-150`：键名按真机校正、保留回退，新增告警，按 D2）。

**硬约束（spec 已定，实现时不许自行放松）**：

- **D1 已裁，不许加码**：调用只带 VAD；**不许顺手补 `punc_model`**（那是另一条出路，见 spec §2 D1 的"将来出路"，且会带来 283 MB–1.2 GB 下载）。
- **降级语义原样**：依赖缺失 / 加载失败仍收敛为 `AsrError` ⇒ `asr=failed` ⇒ 卡片「（ASR 失败）」；**不得**因为"补了 VAD"就改成硬失败或新增状态值。
- **不改 whisper 侧**（`transcribe()` 默认带 segments 起止，本来就对）；不改卡片三行结构；不改 `worker.py` 的降级矩阵与分桶规则（`worker.py:93-125`）。
- **配件 = 只有 VAD**：默认给所有名字配 `vad_model="fsmn-vad"`；**例外名单**（`paraformer-zh-streaming` 流式 / `Whisper-*` 托管）**不加**。
- **成本要给数**：真机腿必须记录耗时（补 VAD 前后各一次；Task 0 的对照数在 `实测` 里）。
- **scope fence**：不做 ASR 服务档 · 不做模型候选化/探测 · **不修分段、不补标点**（本件只交付"可观测"+VAD 接线）· 不动前端（`asr-picker` 那条线）· 不引入新依赖（VAD 是 funasr 自带模型，不是新包）。

**Global Constraints:**

- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **后端命令**：`cd backend && make test`（离线套件）/ `make lint`；真机实验跑 `.venv/Scripts/python`（**别用裸 `uv run`**——它按 lock 精确同步、会把 funasr 那套剪掉）。
- **每个 Task 的 `**实测**` 行必须回填**（RED/GREEN/neuter 受害者/门禁数字/真机耗时）——未回写的 plan 不算交付。

**依赖顺序**：Task 0（取证，含一次性真机实验）→ Task 1（调用侧带 VAD）→ Task 2（抽取器校准 + 可观测）→ Task 3（文档 + 端到端 + 收官）。

---

## Task 0 — 开工前取证（只读 + 一次性真机实验）

- [x] 1. **补 vad + punc 真机跑**（临时脚本，**不进仓库**）：`AutoModel(model="paraformer-zh", vad_model="fsmn-vad", punc_model="ct-punc")` + `generate(input=<示例 wav>, batch_size_s=300)` —— 报：① `sentence` 出不出？② 文本是否带标点、还有没有逐字空格？③ **耗时**（对照现状的 `load 4.7s / gen 1.2s`）。
  - **顺手把 `sensevoice` 也跑一遍**：同一个 wav，`model="sensevoice"` + 其 CLI 预设（`vad_model="fsmn-vad"` + `vad_kwargs={"max_single_segment_time": 30000}`），同样报三项；并对照"不传 `output_timestamp` 时是否 **0 段**"（`sense_voice` 类的开关默认 False，`sense_voice/model.py:980`）。**这条结论同时是 picker 的 ⓘ 注记原文**（不跑，注记只能写"未测"）。
- [x] 2. **`ct-punc` vs `ct-punc-c`**：下载体积与中英混排效果，给出选哪个（以及是否要按语言切）。
- [x] 3. **长音频切分粒度**：把示例 wav 拼长（或 `max_single_segment_time` 调小）跑一次，报 VAD 切出多少段、段长分布——判"分桶会不会过碎"。
- [x] 4. **配件表核对（已结，2026-09-29）**：`funasr/cli.py:11-16` 的 `MODEL_CONFIGS` 逐 key 抄准（verbatim）——
  - `sensevoice` = `{"model": "iic/SenseVoiceSmall", "vad_model": "fsmn-vad", "vad_kwargs": {"max_single_segment_time": 30000}}`
  - `paraformer` = `{"model": "paraformer-zh", "vad_model": "fsmn-vad", "punc_model": "ct-punc"}`
  - `paraformer-en` = `{"model": "paraformer-en", "vad_model": "fsmn-vad"}`（**不带 punc** ✓）
  - `fun-asr-nano` = `{"model": "FunAudioLLM/Fun-ASR-Nano-2512", "vad_model": "fsmn-vad"}`
  - ⚠️ 实现时注意：`sensevoice` 的 `vad_kwargs` 是**嵌套 dict**，要原样传进 `AutoModel`。

**实测**（Task 0，2026-09-29，真机；样本 = seaco 快照自带的 `example/asr_example.wav`（**4.52s / 16k**），长音频 = 该样本重复 20 次拼成 **90.45s**）：
- **第 1 项（补 vad + punc）**：`paraformer-zh + vad_model="fsmn-vad" + punc_model="ct-punc"`
  - 4.5s：`keys=['key','text','timestamp']`、文本**带标点**（"欢迎大家来到哒社区进行体验。"）、**逐字空格消失** ✓、`n_items=1`、`n_timestamp=14`、**`sentence` 没出现**；`load 31.9s / gen 0.9s`。
  - 90s：**`n_items` 仍为 1**、`timestamp` 跨度 **89.2s** ⇒ 抽取器还是走"整段一行" ⇒ **rows 不会 > 1**。⚠️ **spec 的前提被推翻**：`AutoModel` 把 VAD 各段**并回一条结果**，VAD 单用不产生"每段一条"。
  - 真正给分段的是 **`sentence_timestamp=True`**：90s ⇒ 多出 **`sentence_info`** 键、**20 条**（≈3.4s/条，正好每次重复句一条；`gen 7.9s`）；换 `ct-punc-c` ⇒ **27 条**（段更细）。⚠️ **键名是 `sentence_info`**，不是抽取器读的 `sentence`（真机里**从不出现**）。
- **第 1 项第二半（sensevoice）**：`model="sensevoice"` ⇒ **`RuntimeError: model 'sensevoice' is not registered`**——它只是 **CLI 层别名**（CLI 自己换成 `iic/SenseVoiceSmall` 再调 `AutoModel`），别名表里没有它；用仓库 id `iic/SenseVoiceSmall` + 其预设 ⇒ `keys=['key','text']`、**无 `timestamp`** ⇒ `_rows_from_funasr` 产 **0 段**（静默空），且文本带 `<|zh|><|NEUTRAL|><|Speech|><|woitn|>` 特殊标记 ⇒ **SenseVoice 按当前调用不可用**。
- **第 2 项（punc 选型）**：`ct-punc` = **1.2 GB**、90s 出 20 段；`ct-punc-c` = **283 MB**、90s 出 **27 段**（更细）。**中英混排那半未测**（无英文样本）⇒ 建议 **`ct-punc-c`**（本腿默认是中文；体积 1/4）。`fsmn-vad` 只有 **3.9 MB**（可忽略）。
- **第 3 项（长音频粒度）**：见上——`vad` 单用**不分段**（1 条）；`vad + sentence_timestamp` 在 90s 上给 **20–27 段、段长 ≈ 3–4.5s**（正好对齐镜头卡粒度，不过碎）；`gen` 90s ≈ **8–9s**（CPU，≈10× 实时）。
- ⚠️ **对 D1/D2 的影响（→ 已按此改判，2026-09-29）**：刚拍的 **D1 甲达不到验收 §4.1 / §4.2**（rows > 1、段落多张卡）⇒ 实际需要 **`vad + punc + sentence_timestamp=True`**（原表"丙"里的 `pred_timestamp` 换成这个；`pred_timestamp` 那版可弃）；**D2 的校准目标要改成 `sentence_info`**（`sentence` 键不存在）。**改判结果（2026-09-29 裁）**：**D1 = 只补 VAD + 明确放弃分段**（不装 punc，接受"整段一行"）⇒ 本件只剩"**可观测** + VAD 接线"；`vad + punc + sentence_timestamp` 记成"将来出路"（spec §2 D1）。
- ⚠️ **对 picker 那对的影响（另报）**：菜单第三条 `sensevoice` ① 名字 `AutoModel` 不认（须 `iic/SenseVoiceSmall`）② 就算改名也拿不到段（0 段静默）⇒ 菜单名与 ⓘ 注记需要一次小修。
- **追加（2026-09-29，候选侦察；不在原四项里 ⇒ 原"待验"至此已验）**：`OpenMOSS-Team/MOSS-Transcribe-Diarize` 真机一跑（**1.83 GB**、走 `hf-mirror`、需 `trust_remote_code`；缓存落 `E:\app-model\hf-cache\hub`，C 盘零写入）⇒ **它确实给段**：键 `['key','raw_text','sentence_info','text','timestamp']`，`sentence_info` = `{start: 1030, end: 4470, text: "欢迎大家来到摩哒社区进行体验。", spk: "S01", timestamp: [[1030, 4470]]}`（`sentence` 键为 `null`）；1030→4470 ms 与 4.52 s 音频吻合 ⇒ **真时间戳，不是等分合成**。**但代价否掉默认**：CPU 上**加载 628 s、4.52 s 音频推理 66 s（RTF ≈ 14.6）**（10 分钟视频外推 ≈ 2.4 h）⇒ **本件不采用、也不进 picker 菜单**；它证明的是"进程内形态也能拿到段"，并为"要不要 GPU / 服务档"提供量级参照（详见 [HTTP 草案 §5](../specs/2026-09-28-rag-asr-service-tier-design.md)）。

---

## Task 1 — 调用侧带 VAD（spec D1 / D3）

> 动到的文件：`packages/harness/deerflow/knowledge/video/asr.py`（`FunAsrProvider.__init__` 与 `transcribe` 的 `AutoModel(...)` 调用）＋ 该腿的既有测试文件（`backend/tests/knowledge/video/…`）。
> **验收对应**：spec §4 的 3（降级语义不变）+ §4 的 1（前半：补 VAD 后 rows 仍为 1——本件接受的现状）。
> ⚠️ **2026-09-29 二次改判**：配件追加 `spk_model="cam++"` ⇒ 上面这条"rows 仍为 1"的期望**作废**（改为 rows > 1）；追加落 **Task 1b**（见下）。

- [x] **RED**：单测——以桩替换 `funasr.AutoModel`，断言：① 构造参数**含** `vad_model="fsmn-vad"`；② **不含** `punc_model`（D1 不许加码）；③ 例外名单（`paraformer-zh-streaming` / `Whisper-*`）**不带** `vad_model`。此刻无实现 ⇒ 红。
- [x] **GREEN**：例外名单常量 + `AutoModel(...)` 带上 `vad_model`。
- [x] **neuter**：把 `vad_model` 去掉 ⇒ ① 红（revert proof）。
- [x] **门禁**：`make test`（相关文件）+ `make lint` 净。

**实测**（Task 1，2026-09-29）：
- **RED**：**1 红 / 17 绿**（单文件 18 例）。⚠️ 计划里「③ 例外名单不带 VAD ⇒ 红」**不成立**——那是"不许加"的断言，实现前天然绿（与 picker 的 ⑤/⑥ 同类）；真正红的是 ① 的 `vad_model` 断言。
- **GREEN**：**18 绿**（桩经 `sys.modules["funasr"]` 注入，不真加载模型 ⇒ 秒级）。
- **neuter**（把调用里的 `vad_model` 去掉）：**1 红 / 17 绿**，受害者 = ① 那条 ⇒ revert proof 成立。
- **还原证明 + 门禁**：还原 ⇒ **18 绿**；`tests/knowledge/video` 全套 **130 例全绿**；`make lint` 净（1308 文件已格式化）。
- **偏差登记**：例外名单落成两个常量（`_NO_VAD_NAMES` / `_NO_VAD_PREFIXES`）+ 纯函数 `_vad_kwargs(model)`，而不是把判断写在调用点——这样它可被单测直接覆盖。

---

## Task 1b — 追加 `spk_model="cam++"`（2026-09-29 二次改判；spec D1 追加段 + §7.5）

> 动到的文件：同 Task 1（`asr.py` 的 `_vad_kwargs` 与调用点）＋ 该腿测试。
> **验收对应**：spec §4 的 1（**新期望：rows > 1、每段带 `spk`**）+ §4 的 3（降级语义不变）。

- [x] **RED**：在 Task 1 的断言上加两条——① 构造参数**含** `spk_model="cam++"`；② 例外名单（`paraformer-zh-streaming` / `Whisper-*`）**两个都不带**（`spk_model` 也不给）。此刻无实现 ⇒ 红。
- [x] **GREEN**：`_vad_kwargs(model)` 扩成"VAD + spk"（或并列一个新纯函数）；例外名单同时管住两个参数。
- [x] **neuter**：把 `spk_model` 去掉 ⇒ ① 红（revert proof）。
- [x] **真机复核**：示例音频 ⇒ **rows > 1**（VAD 段 + `spk`）；"整段一行" + warning 用**无停顿样本**复现（400ms 间隙版）；记录 **gen ≈2.3×** 的实测耗时。
- [x] **门禁**：`make test`（相关文件）+ `make lint` 净。

**实测**（Task 1b，2026-09-29）：
- **RED**：**1 红 / 19 绿**（单文件 20 例）。⚠️ 计划的 ②（例外名单"两个都不带"）又是"不许加"的守卫 ⇒ **实现前天然绿**；真正红的是 ① 的 `spk_model` 断言。
- **GREEN**：**20 绿**。
- **neuter**（把 `spk_model` 去掉）：**1 红 / 19 绿**，受害者 = ① ⇒ revert proof 成立。
- **真机复核**（`MODELSCOPE_CACHE=E:\app-model\ms-cache`；材料 = 4.52s 样本重复 20 次 = 90s）：
  - `provider · 20× 原样` ⇒ **rows = 8 / segments = 8**（跨度 740→90430 ms）、**无 warning**（有句级就不再报）；全程 44.0 s（含 VAD + cam++ + ASR 三个模型的加载）。
  - **直调 ⇒ `sentence_info` 8 条、`spk = [0,1,0,0,0,0,0,0]`** ⇒ **每段带 `spk`** ✓（单人音频的 0/1 交替 = §5 边界①"假分裂"，与 §7.5 一致）。
  - ⚠️ **"整段一行"的复现没做成**：按"400ms 间隙版"构造（重复之间插 400 ms 静音）跑出 **9 段**，不是 1 段——**材料不同**：§7.5 那组（400 ms ⇒ 合 1 段 / 1.2 s ⇒ 6 段）是在**合成对话**（6 句交替）上得的，而我的样本自带内部停顿。1 行 + warning 的**真机证据**此前已有（Task 2 那次 `rows=1` + warning 原文 ✓），单测也覆盖该路径 ⇒ 本项记"未按此材料复现，证据由 Task 2 那次提供"。
- **门禁**：`tests/knowledge/video` **132 例全绿**；`make lint` 净（1308 文件）。
- **偏差登记**：`_vad_kwargs` **改名 `_funasr_kwargs`**、`_NO_VAD_*` **改名 `_NO_COMPANION_*`**（配件已不止 VAD，旧名会误导；计划里"或并列一个新纯函数"两者都允许）。另：**`spk` 没有进 `TranscriptSegment`**（该 dataclass 无说话人字段）⇒ 说话人标签当前止于 funasr 输出、被抽取器丢弃；要用它得扩契约（另立项）。

---

## Task 2 — 抽取器校准 + 可观测（spec D2）

> 动到的文件：`asr.py`（`_rows_from_funasr` 与其 docstring）＋ 该腿测试。
> **验收对应**：spec §4 的 2（可观测生效）。
> ⚠️ **2026-09-29 二次改判**：`sentence_info` 现在由 **cam++ 顺带**产生（不必装 punc）；本 Task 的"整段一行"用例仍有效（无停顿样本会复现），但**真机常态期望改为 rows > 1**（见 Task 1b）。

- [x] **RED**：纯函数用例三形状——① `sentence_info` 非空（**真机键名**，装 punc 后才会出现）⇒ 多 rows；② 只有 `timestamp` 且跨度≈全长 ⇒ **1 行 + 一条 warning**（"整段一行"防御，**本件真机的实际形状**）；③ 两者都没有 ⇒ 空 rows（**不抛**，保持降级语义）。此刻无实现 ⇒ 红。
- [x] **GREEN**：按真机键名校准取数（`sentence_info` 优先 / `timestamp` 回退）+ 加告警；docstring 去掉"待 Task 7/12 校准"的自述（已校准）。
- [x] **neuter**：去掉"整段一行"告警 ⇒ ② 红、①③ 绿。
- [x] **真机复核**：90s 音频 ⇒ **1 行 + warning 出现**（rows 仍为 1——本件接受的现状）；分桶结果与今天一致（仍进 1 张卡）⇒ 把"不变"记成现状，**不是失败**。
- [x] **门禁**：`make test` + `make lint` 净。

**实测**（Task 2，2026-09-29）：
- **RED**：**2 红 / 18 绿**（单文件 20 例）。红的是 ①（`sentence_info` 未读）与 ②（告警未加）；③「两者都没有 ⇒ 空 rows」是**守卫**（实现前天然绿，与 Task 1 的例外名单同类）。另：既有用例 `test_rows_from_funasr_prefers_sentence_segments` 用的 `sentence` 键**就是校准对象本身** ⇒ 一并改成 `sentence_info`（真机里 `sentence` 从不出现）。
- **GREEN**：**20 绿**（键名校准 + 回退告警）。
- **neuter**（去掉告警调用）：**1 红 / 19 绿**，受害者 = ② ⇒ revert proof 成立；①③ 绿 ✓ 与计划一致。
- **真机复核**（90s 重建样本，走真 `FunAsrProvider.transcribe`）：**rows = 1 / segments = 1 / 跨度 1070→90305 ms**，**warning 原文打出**，`load+gen ≈ 31.4 s`。分桶输入与改造前**完全相同**（同一条 1 行）⇒ 仍进 1 张卡，**记成现状**。
- **门禁**：`tests/knowledge/video` **132 例全绿**；`make lint` 净（1308 文件）——期间它抓到我一处格式债（新常量被折成多行，仓里行长 240 ⇒ 应为单行），已改。
- **偏差登记**：计划写「跨度≈全长 ⇒ 告警」，但**纯函数拿不到音频时长** ⇒ 落成「**走到 `timestamp` 回退即告警**」（这正是真机形状的退化信号：没有 `sentence_info` ⇒ 整篇并成一行）。另：0 行（无任何计时）**按计划不告警**——它仍是静默空（sensevoice 那类），要不要补信号留待二期。

---

## Task 3 — 文档 + 端到端 + 收官（spec §4）

> 动到的文件：`backend/AGENTS.md`（视频 ASR 腿一段）。
> **验收对应**：spec §4 的 3 / 4。

- [x] **文档**：`backend/AGENTS.md` 的视频段补一句——ASR 腿的 `AutoModel` 带 `vad_model="fsmn-vad"` + `spk_model="cam++"`（**不补 punc**）；**分段由 cam++ 顺带获得**（VAD 段粒度 + `spk`；2026-09-29 二次改判）；"整段一行"只在无停顿样本上出现、由抽取器的 warning 可观测。
- [x] **端到端（真机）**：入一个真实（短）视频，看镜头卡「口述」：**rows > 1**（VAD 段、每段带 `spk`）、**仍无标点**；看日志是否出现"整段一行"信号；记录**总耗时**对照改造前（VAD + cam++ 的加载与推理成本）。
- [x] **跨件：回改姊妹件的注记文案（2026-09-29 恢复并完成）**：cam++ 之后本件**确实修了分段** ⇒ picker 那条 ⓘ 的后果句（"没有逐句时间戳时整段文字会挤进一张镜头卡"）**已过期** ⇒ 改成"口述按 VAD 分段落到镜头卡，连续语音可能整段只落一张"（`zh-CN.ts` / `en-US.ts` 各 1 行；其 dom 断言靠新文案里的"镜头卡"继续成立，picker 大册 **101 例全绿**）。
- [ ] ~~**跨件：回改姊妹件的注记文案**~~ **取消留档（2026-09-29）**：本件**不修分段**（放弃 punc）⇒ picker 那条 ⓘ 注记的后果句**仍然成立、不过期**，无需回改（将来若装 punc，再把这条恢复）。
- [x] **收官门禁**：后端全量套件 + `make lint` 净；`git diff` 只含本件该动的文件。

**实测**（Task 3，2026-09-29，进行中——收官门禁待全量套件回填）：
- **文档**：`backend/AGENTS.md` 的视频腿那条补了一句——funasr 腿带 `vad_model="fsmn-vad"` + `spk_model="cam++"`（**不补标点模型**），这正是 `sentence_info`（VAD 段粒度）出现、口述能落到多张卡的原因；例外名单两个都不给，且抽取器在"塌成一行"时会 warning。
- **端到端（进程内真机，未走 UI）**：浏览器两个标签被 volcengine 文档占着（另一条线在用），且隐藏窗口下 `window.open` / `click` 都不可用 ⇒ 改走**进程内**同一条腿序：真 `probe_video` → 真 `_detect_scene_cuts`（PySceneDetect）→ `merge_scene_bounds` → 真 `transcribe_video` → 真 `assign_transcript_to_shots`。材料 = 自造短片（18s、3 段硬切、音轨 = 4.52s 样本 ×4）：
  - `duration_ms = 18000`、`cuts = [6000, 12000]`、**6 个镜头**（6s 段被 `max_shot_seconds=5` 再切成 3s+3s ✓）；
  - ⚠️ **ASR 只出 1 段**（`seg_spans = [[750, 17960]]`）⇒ **口述只落 1 张卡**，与 90s WAV 上的 8 段不同。直调复核原因：`WARNING punc_model is missing, falling back to vad_segment mode` ⇒ `sentence_info` **只有 1 条**（**VAD 在这段连续语音上只切出 1 段**）⇒ 正是 spec §5 边界③"段粒度由 VAD 定"的实例（连续语音 ⇒ 整段）。
  - ⚠️ **而且这次没有 warning**：抽取器走的是 `sentence_info` 分支（1 条）而非 `timestamp` 回退 ⇒ **Task 2 的告警覆盖不到"1 个 VAD 段"这种整段一行**；而 §4.2 的验收词正是"跨度≈全长 ⇒ 给出信号" ⇒ **这条真实路径漏了信号**（要覆盖得把时长带进来判"跨度≈全长"；纯函数没有时长）⇒ **留给你拍：现在补还是二期**。
- **跨件那条要翻案**：Task 3 的"取消留档"写"本件不修分段 ⇒ picker 的 ⓘ 后果句仍成立"——**cam++ 之后本件确实修了分段**（VAD 段粒度）⇒ picker 那条注记的"没有逐句时间戳时整段文字会挤进一张镜头卡"在常态下**已过期**（除连续语音这种 1 段情形）。建议**恢复**那条跨件回改（picker 的 ⓘ 文案 + 其 dom 断言各一处）。
- **（a）已补：告警改成"跨度≈全长"判据**（2026-09-29，Task 3 内追加）：`transcribe_video(..., duration_ms=)` 拿到探测腿的时长后判"只有一段且覆盖 ≥90% ⇒ warning"（判据 `_is_collapsed` / 占比 `_COLLAPSED_SPAN_RATIO = 0.9`）；纯函数里的旧告警**移除**（单一信号点，纯函数恢复无日志）；`worker.py` 的 asr 腿传 `duration_ms`。RED **3 红 / 19 绿** → GREEN **22 绿** → neuter（去掉判据）**1 红 / 21 绿** → 还原 22；真机复核：18s MP4（连续语音、1 段）**warning 打出** ✓ / 90s WAV（8 段）**不报** ✓；`tests/knowledge/video` **134 例**、`make lint` 净。
- **收官门禁**：后端全量套件 **163 failed / 12739 passed / 109 skipped**（19:08；失败全在既有环境条件红，`tests/knowledge/video/` **零条**）；按房规做 **A/B**（把这 163 个 id 在**本线三笔之前**的 `c8194d4a` 上跑同一批）⇒ **双向差 1 条**：`test_delta_channel_state.py::test_merge_message_writes_randomized_differential`（随机化差分用例、属 checkpoint 线、不在本线触碰面）**复跑 3/3 通过 ⇒ flake** ⇒ **本线零回归**。`make lint` 净（1308 文件）；A/B worktree 与两侧 basetemp 已清。

---

## 残留账（2026-09-29 登记，**不在本件范围**，按"要不要单独立项"排）

1. **说话人进卡**（**最接近可用**）：`spk` 在 funasr 输出里**每段都有**（真机 8 段各一个号：`[0,1,0,0,0,0,0,0]`），但抽取器只取 `(start_ms, end_ms, text)` ⇒ `TranscriptSegment` 没有说话人字段 ⇒ **卡片上根本看不到**。要显示得动四处：`TranscriptSegment` 加字段 → `assign_transcript_to_shots` 带着它 → 卡片三行契约（现为 场景/口述/屏幕文字）加位 → 相关 dom / 接口用例。⚠️ 前提：单人音频会**假分裂**（实测 `0/1` 交替）⇒ 只能当"多人对话"的提示，不能当事实；whisper 腿没有这个信息。
2. **0 行静默**：模型完全不返回计时（如 `sensevoice`）⇒ 空 rows，不报错也不 warning（Task 2 按计划只给"1 段覆盖全片"信号）。
3. **标点**：文本仍逐字带空格、无标点 ⇒ 要装 punc（`ct-punc-c` 283 MB / `ct-punc` 1.2 GB）。
4. **LLM 型模型**：`MOSS-Transcribe-Diarize` 等本机 CPU 跑不动（实测 RTF ≈ 14.6）⇒ 要 GPU 或走服务档（那条暂停线，决定表 D1–D8 已写）。
