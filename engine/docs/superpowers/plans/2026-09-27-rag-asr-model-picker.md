# 「ASR 模型」字段：可填下拉 + provider 联动 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-27-rag-asr-model-picker-design.md](../specs/2026-09-27-rag-asr-model-picker-design.md)
**Status:** ✅ **已交付（2026-09-27 立，2026-09-28 裁 D1/D2/D3；Task 0–3 全部落地）** —— **D1 乙（可填下拉，照抄「维度」行）· D2 甲（切换置目标引擎列表首行）· D3 甲（不做保存期校验）**。**Task 1 ✅ / Task 2 ✅ / Task 3 ✅ 全部交付（2026-09-28~29）**——Task 1：RED 6 红/75 绿 → GREEN 81 → 三刀 neuter（受害者 ③ / ④ / ⑤+⑥，不相交）→ 还原 81；Task 2：RED 5 红/93 绿 → GREEN 98 → 四刀 neuter（受害者各 1：候选组 / 联动 / ⓘ 文案 / 注记）→ 还原 98、触碰面 229 例；Task 3：文档 5 行 + 真机五条 + 收官（前端全量 **247 文件 / 2719 例 0 失败**、`pnpm check` 净、不含 `backend/`）。****已提交：`69c51447` / `bec0f776` / `97f39daf`（代码）· `4bec69b4`（文档）· `3d0d4e05` / `37eb6d51`（删 `sensevoice`）**。**Task 0 ✅ 已完成（2026-09-28，五项全结）**——whisper 14 键 / funasr 侧按**「甲」口径**（菜单按常用排、能力作注记；**`sensevoice-small` 这个名字不存在**，准确拼写 `sensevoice`）/ 行号全中 / 既有断言零必红；另翻出一条**越界发现**（funasr 腿的调用侧缺 `vad_model`/`punc_model`——真机实测文本逐字带空格、整段挤一张卡）⇒ **已立项另起一对**：[2026-09-28-video-asr-output-shape-design.md](../specs/2026-09-28-video-asr-output-shape-design.md)（★★ 姊妹件成对：[其 plan](../plans/2026-09-28-video-asr-output-shape.md)）；**本对不动作**，真机证据见 `实测`。**交付后调整（2026-09-29）：`sensevoice` 从菜单与 ⓘ 里删掉**（短名 `AutoModel` 不认；换仓库 id 实测 0 段）⇒ funasr **2 条**；dom 用例与文案已同步、门禁净；**真机复验已过**（引擎行现为下拉：候选两条、选 whisper ⇒ 模型值自动 `paraformer-zh → small`）。
**相关记录**：[2026-09-26-rag-embedding-probe-design.md](../specs/2026-09-26-rag-embedding-probe-design.md)（同文件的那条线，**已交付**；本对抄它的「维度」行控件与 ⓘ 落点惯例）· [2026-09-08-video-ingest-design.md](../specs/2026-09-08-video-ingest-design.md)（ASR 腿出处）。

**Architecture:** 三件事 —— **① 纯函数**（切换判据 + 首行：只有 whisper 的**合法名集合（14 键）**能判"非法"；切到 whisper 值 ∉ 14 键 ⇒ 置 whisper 首行，切向 funasr 值 ∈ 14 键 ⇒ 置 funasr 首行，其余一律保留）**② 两张候选表**（funasr / whisper，按推荐序排，**第一项即默认**——前端不再有独立的默认常量）**③ 视图控件**（照抄「维度」行：`Input` + 内嵌 chevron 的 `DropdownMenu`，候选组按 provider 整组换；占位进输入框；说明句进 `RowLabel` 的 ⓘ）+ i18n 2 key ×3 文件。

**硬约束（spec 已裁/已定，实现时不许自行放松）**：

- **D1 乙**：控件 = **照抄「维度」行**（`Input` + 内嵌 chevron 的 `DropdownMenu`）；**不引 datalist、不引 combobox、不装 `@radix-ui/react-popover`**；输入框**必须仍能自由打字**——任何字符串（`sensevoice` / 仓库 id / 目录路径）可保存、可原样读回。
- **D2 甲 = 单边判据**：只有 **whisper 的合法名集合（14 键）**能判"非法"；**判据 ≠ 菜单**——菜单只渲染常用 6 条（`large` / `turbo` / `tiny.en` 合法但不在菜单里，两者合并即漏判，漏判的后果是它们原样落到 funasr 上、下次入库降级）。**不得**拿 funasr 的推荐表去判 funasr（它是开放集，推荐表不是全集）。
- **首行 = 默认**：默认值就是**菜单**第一项（funasr `paraformer-zh` / whisper `small`）；**不新增**独立的默认常量（spec 已明确消掉这一份副本）。
- **菜单口径（spec 已裁「甲」，2026-09-28）**：菜单**按常用排**，**不按"能否出句级时间戳"筛**；能力差异写**注记**（无逐句 ⇒ 整段文字挤进一张镜头卡、其余卡口述「（无）」，依据 `worker.py:93-125` 的分桶规则）。**「只留能出时间戳的 N 条」这类筛法不许在本对复活。**
- **D3 甲**：不做保存期校验；**不新增**"非法值"状态与文案（那是 D2 乙 才要的东西，已否）。
- **说明句落点**：进 `RowLabel` 的 `info=`（ⓘ，同 caption 行 `:1337` 先例）；**不新增任何可见行**；占位放输入框内。
- **注记落点（spec §2 D1 已定）**：能力注记写进**该行的 ⓘ 文案**（funasr 那条 hint 内，逐条列「模型名 + 能力/后果」）——**不进菜单项、不新增行、不新增 key**；Task 2 有 ③′ 断言与 neuter ④ 钉住它。
- **不动**：后端全部（`asr_provider`/`asr_model` 契约、`asr.py` 分派与降级语义）· VLM 行 · 本节其它行 · 探测线的「维度」行 · `ui/` 下的生成件。
- **用例只钉结构**（候选菜单项文本 / `onSelect` 写回的值 / ⓘ 文案原文 / 输入框往返），**不钉几何**；几何与观感归 Task 3 真浏览器。
- **scope fence**：不做 C（两个键 / 动后端契约）· 不做跨引擎记忆（甲′）· 不做保存期校验 · 不引新依赖 · 不做 ASR 的连通/能力探测。

**Global Constraints:**

- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **前端命令**：`cd frontend && PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`；门禁 = `pnpm check` + `pnpm test`；**prettier 新债**只重排自己那几行（「新债行号交集法」）。
- **纯前端**：收官时 `git diff` 不含 `backend/`。
- **不起隔离实例**；Task 3 只驱动用户已在跑的 `:3000`、**只读**；不碰任何配置文件。
- **每个 Task 的 `**实测**` 行必须回填**（RED/GREEN/neuter 受害者/门禁数字）——未回写的 plan 不算交付。

**依赖顺序**：Task 0（只读取证）→ Task 1（纯函数 + 候选表）→ Task 2（控件 + 文案 + 接线 + dom）→ Task 3（文档 + 真浏览器 + 收官门禁）。

---

## Task 0 — 开工前取证（只读）

- [x] 1. ✅ **funasr 候选表（已结，2026-09-28；按 spec §2 D1 的「甲」口径）**：三条来源交叉核——官方 README（modelscope/FunASR 模型 zoo）、本机 CLI 注册表 `funasr/cli.py:11-16`、别名表 `download/name_maps_from_hub.py`。**菜单按常用排、不以"能否出时间戳"筛；能力作注记。结论**：
  - ⚠️ **`sensevoice-small` 这个名字不存在**（全包 0 命中）——准确拼写是 **`sensevoice`**（CLI 别名）或仓库 id **`iic/SenseVoiceSmall`**；官方名 **SenseVoiceSmall**，用途=多语言 ASR + 情感/事件标签，官方 README **未标时间戳**（按「甲」不据此排除，留作注记）。
  - `paraformer-zh`（**首行**）：CLI 注册表 = `{"model": "paraformer-zh", "vad_model": "fsmn-vad", "punc_model": "ct-punc"}`；官方 README 明标 **"zh/en ASR with timestamps"**。⚠️ 该预设含 `punc_model`（和 `vad_model`），而我们的调用**两个都没传**——真机实测的文本后果见 `实测`。
  - `paraformer-en`：CLI 注册表 = `{"model": "paraformer-en", "vad_model": "fsmn-vad"}`；别名表映射到 `iic/speech_paraformer-large-vad-punc_asr_nat-en-16k-common-vocab10020`。
  - 官方 zoo 另有 `fun-asr-nano`（中英日+方言）/ `Fun-ASR-MLT-Nano`（31 语）/ `Qwen3-ASR` / `GLM-ASR-Nano` / `Whisper-large-v3(-turbo)`（ModelScope 托管）——**按「甲」不因"未标时间戳"排除**，能力留作注记（未测的写"未测"）；`paraformer-zh-streaming` 流式、用途不符 ⇒ 不进菜单（与时间戳能力无关）。
  - 别名表（旧记录保留）：**三张表**（ms / hf / openai，在 `download_model_from_hub.py:6` import、`:37`/`:51`/`:129` 三处查）；paraformer 系 5 键（`paraformer`/`paraformer-zh`/`paraformer-en`/`paraformer-en-spk`/`paraformer-zh-streaming`，其中 `-en` 与 `-en-spk` 同一 ModelScope id）。
- [x] 2. ✅ **whisper 候选表（已结，2026-09-28）**：`openai-whisper` 源码 `whisper/__init__.py` 的 `_MODELS` = **14 键**（`tiny.en`/`tiny`/`base.en`/`base`/`small.en`/`small`/`medium.en`/`medium`/`large-v1`/`large-v2`/`large-v3`/`large`/`turbo`/`large-v3-turbo`）⇒ **"常用五档"不是全集**；`large-v3-turbo` 存在；`large`≡`large-v3`、`turbo`≡`large-v3-turbo`（同一 URL，实际 12 份权重）。另：同文件 `load_model` 的第二分支 `elif os.path.isfile(name)`（`:139`）接受**本地 .pt**——D3 改措辞的源码证据。本机未装 whisper（`~/.cache/whisper` 不存在）不影响本条：查的是包源码。
- [x] 3. ✅ **两张表的顺序定稿（已结，2026-09-28）**：按**推荐序**排，**首行 = 默认**（D2 的规则直接引用它）。
  - **whisper（6 条）**：`tiny` / `base` / `small`（**首行**）/ `medium` / `large-v3` / `large-v3-turbo`（不混入 `.en` 与别名）。
  - **funasr（按常用度；2026-09-29 裁为两条）**：`paraformer-zh`（**首行**，官方 README 明标 "zh/en ASR with timestamps"）/ `paraformer-en`。**删去 `sensevoice`** 的理由：① 短名 `AutoModel` 不认（只有 CLI 会换名，别名表里没有）② 换仓库 id `iic/SenseVoiceSmall` 实测 **0 段**（无 `timestamp`）⇒ 填了等于静默无口述。**不以"能否出时间戳"筛**（spec §2 D1「甲」）；每条的能力注记见第 1 项与 `实测`。
- [x] 4. ✅ **落点核实（已结，2026-09-28，逐条全中）**：ASR 两行现状（`functional-models-view.tsx:1394-1399`，ToggleGroup `:1370-1389`）；可抄的「维度」行实现**整段**（`:1039-1131`：行壳 `:1039` / `relative w-full` 外壳 `:1056` / `Input` `:1057-1071` / 触发器+菜单 `:1075-1129`——内嵌 `absolute inset-0 flex justify-end` 的 chevron 壳与两层 `pointer-events` / `w-(--radix-dropdown-menu-trigger-width)` / `onSelect` 写值；**只抄 `:1080-1129` 会漏掉 `Input` 与外壳**）；`RowLabel` 的 `info` 支持（`:214-234`）；`config-form.ts` 写回段（`:281-304`）与 `VIDEO_SOURCES`（`:137-138`）；i18n 三文件插入点（zh `:1789-1792` / en `:1882-1885` / `types.ts:1792-1795`）。**五个文件的 mtime 均早于锚定时刻**（`functional-models-view.tsx` 09-28 06:15 / `config-form.ts` 09-27 23:49 / locales 09-28 16:02–16:04）⇒ 锚在当天有效。
- [x] 5. ✅ **会红断言扫描（已结，2026-09-28）**：`tests/unit/settings/functional-models.dom.test.tsx`（既有大册）+ 其它涉及本行的用例——列出会被"新控件 / 新文案 / 值联动"影响的既有断言（按"会不会红"给出清单；预断无把握的标疑）。**目的**：把既有用例的处置（改/加/不动）在动笔前就定下来。
  - 全 `frontend/tests` 搜 `asr_provider|asr_model|asrProvider|asrModel|ASR` ⇒ 两个文件命中，逐条分类：
    - `tests/unit/settings/functional-models.dom.test.tsx:809-818`：`getAllByText(F.asrModel)` 靠 `RowLabel` 文本 ⇒ 不受影响；`getByLabelText(F.asrModel)` ⇒ **新控件必须给 `Input` 保留 `aria-label={F.asrModel}`**（照「维度」行 `:1059` 先例）——实现守约则**不动**。
    - 同文件 `:1760`/`:1816` 的 `findAllByRole("menuitem")`（开的是维度菜单）⇒ 新菜单默认关闭（Radix 不挂内容）⇒ **不受影响**；前提=新菜单**不加 `forceMount`**（照维度行）。
    - `tests/unit/rag/config-form.test.ts:216-225` ⇒ 它间接钉住**联动落点**：若把纯函数放进 `buildRagConfigInput`（payload 构造），这条会红 ⇒ **联动只能落视图的 `updateVideo`**（与 spec §3 一致）。**不动**。
    - 其余命中均为 fixture / 来源映射（`functional-models.dom.test.tsx:173`/`:189-190`、`config-form.test.ts:79`/`:104-105`/`:131-132`/`:145`）⇒ **不动**。
  - **结论：既有断言零必红**（唯一条件性风险 = 新控件丢掉 `aria-label`）。

**实测**（Task 0，2026-09-28，全程只读）：
- **第 1 / 3 项**：见上——funasr 侧**两条**（`paraformer-zh` 首行 / `paraformer-en`；2026-09-29 删 `sensevoice`）；`sensevoice-small` 这个名字不存在（准确拼写 `sensevoice` / `iic/SenseVoiceSmall`）。
- **第 4 项**：行号**全中**（`functional-models-view.tsx:1368-1400` / `:1370-1389` / `:1394-1399`；维度行 `:1039-1131`，子区间 `:1039`/`:1056`/`:1057-1071`/`:1075-1129`；`RowLabel :214-234`；`config-form.ts:281-304` / `:137-138`；locales zh `:1789-1792` / en `:1882-1885` / `types.ts:1792-1795`）。五个文件的 mtime 均早于锚定时刻 ⇒ 锚当天有效。
- **第 5 项**：既有断言**零必红**（唯一条件 = 保留 `aria-label`；分类见上）。
- ⚠️ **越界发现（属视频线，本对不动手）**：调用侧 `asr.py:98-99` 只传 `model` + `batch_size_s`；而官方 CLI 预设有 VAD/标点——`cli.py:11-16` 的 `paraformer` = `{model: paraformer-zh, vad_model: fsmn-vad, punc_model: ct-punc}`（`paraformer-en` / `sensevoice` 也都带 `vad_model`，后者还带 `max_single_segment_time: 30000`）⇒ 我们**两样都没传**。2026-09-28 **真机实测**（本机 venv + 缓存权重 + 8s 示例 wav，走 `FunAsrProvider.transcribe` 全路径）：
  - `timestamp` **有值**（"要显式开 `pred_timestamp` 才出时间戳"的推断被实测推翻）⇒ `_rows_from_funasr` 走"整段一行"分支 ⇒ **ROWS = 1 / SEGMENTS = 1**（`410→7555`）——**不是 0 段、也不是失败**；
  - 该段文本**逐字带空格、无标点**：`国 务 院 发 展 研 究 中 心 …`（缺 `punc_model` 的直接后果）；
  - 按 `worker.py:93-125` 分桶 ⇒ 整段挤进"占比最大"的**一个**镜头（等长镜头 = 第一个），其余镜头口述「（无）」。
  ⇒ 真缺陷 = **调用侧缺 `vad_model` / `punc_model`（以及句级切分）**，外加 `_rows_from_funasr` 需按真机形状校准（其 docstring 自述「真实输出形状在 Task 7/12 集成时校准」）；建议**另开一笔**。whisper 侧不受影响（`transcribe()` 默认带 segments 起止）。

---

## Task 1 — 候选表 + 联动纯函数（spec §2 D2 / §3）

> 动到的文件：`core/rag/config-form.ts`（候选表常量 + `asrModelForProviderSwitch(...)`；与 `isEmbeddingChange` 同处）＋ `tests/unit/rag/config-form.*.test.ts`（node 环境，落既有同族文件）。
> **验收对应**：spec §4 的 2 / 3。

- [x] **RED**：纯函数用例**六情形**——① 切 whisper 且值非法（`paraformer-zh`）⇒ 置 whisper 首行 `small`；② 切向 funasr 且值是 whisper 名（`tiny`）⇒ 置 funasr 首行 `paraformer-zh`；③ **切向 funasr 时判据不看 funasr 推荐表**（`paraformer-en-spk` / 仓库 id / 目录路径：任何"切向 funasr"的场景值都原样保留；⚠️ **不是**"往返不动"——切走再切回不复原上一次的输入）；④ **首行 = 表首项**（两张表各钉一次；防将来表被重排而默认悄悄漂移）；⑤ 值本就合法 ⇒ 不动——**在 14 键内但不在菜单里也要不动**（`turbo` / `large` 切到 whisper 原样保留）；⑥ **判据 = 14 键全集而非菜单 6 条**：`turbo` / `large` / `tiny.en` 切向 funasr ⇒ 一律变 `paraformer-zh`（这三条正是"判据被写成菜单"时会漏的）。此刻无实现 ⇒ 红。
- [x] **GREEN**：**两个常量**（① 菜单：funasr / whisper 两张、按 Task 0 定稿的顺序；② 判据集合：whisper 的 14 键）+ `asrModelForProviderSwitch(prev, next, value)` 按单边判据实现（判依据 ②、置首行依据 ①）。
- [x] **neuter ①**：把判据扩成"两侧都拿各自表判" ⇒ ③ 红（funasr 自定义值被推荐表顶掉）——这条正是 spec 反复强调的边界。⚠️ **承载者是 ③ 里的"仓库 id / 目录路径"两条子断言**：`sensevoice` **就在 funasr 菜单里**（甲的三条候选之一）⇒ 该子断言在 neuter 下会**仍绿**；承载这一刀的只剩 id / 目录路径两条，**不许删**（否则 neuter 变空转）。
- [x] **neuter ②**：把"置首行"改成"置一个硬编码默认" ⇒ ④ 红。
- [x] **neuter ③**：把判据改回"菜单 6 条" ⇒ **⑤ + ⑥ 红**（假判据把 14 键里的非菜单名当外人：切 whisper 被顶成 `small`＝⑤、切 funasr 被原样放行＝⑥）、③ 仍绿——这一刀正钉在"判据 ≠ 菜单"这条边界上，防止将来被"顺手简化"回去。
- [x] **还原证明** + **门禁**：`pnpm check` 净；prettier 只动自己新写的行。

**实测**（Task 1，2026-09-28）：
- **RED**：**6 红 / 75 绿**（单文件 81 例）——六条新用例全红（`TypeError: asrModelForProviderSwitch is not a function`），既有 75 条全绿。
- **GREEN**：**81 绿**。⚠️ **首跑抓到一处真偏差**：whisper 菜单的**首行必须是 `small`**（spec §2 D2：「不是最差的 `tiny`」），而 Task 0 第 3 项那串枚举（`tiny` / `base` / `small`（首行）/ …）按字面摆会把 `tiny` 放头 ⇒ 落成 `["small", "tiny", "base", "medium", "large-v3", "large-v3-turbo"]`（把标了「首行」的那项提前；④ 的断言钉住它）。
- **neuter ①**（判据扩成"两侧都拿各自表判"）：**1 红 / 80 绿**，受害者 = ③，且**红的正是"仓库 id"那条子断言**（首条例子先跑、通过；该例子 2026-09-29 由 `sensevoice` 换成 `paraformer-en-spk`，结论不变）⇒ 计划预言的"承载者 = id / 路径两条"成立。
- **neuter ②**（"置首行"改硬编码默认）：**1 红 / 80 绿**，受害者 = ④。⚠️ **这一刀要连"菜单首行也被挪走"（`tiny` 提到头 = ④ 防的"表被重排"场景）才咬得动**：只换等值字面量时默认与首行仍相等、全绿。计划里「⇒ ④ 红」建议补这个前提。
- **neuter ③**（判据改回菜单 6 条）：**2 红 / 79 绿**，受害者 = **⑤ + ⑥**（`turbo` 切 whisper 被顶成 `small`；`turbo` / `large` / `tiny.en` 切 funasr 被原样放行），③ 仍绿 ⇒ 与计划逐条一致。
- **还原证明**：三刀逐把还原 ⇒ **81 绿**（单文件）；触碰面（`tests/unit/rag` + `tests/unit/settings`）**8 文件 / 222 例全绿**；`pnpm check` **净**（eslint + tsc 零诊断）。
- **prettier**：新债只出在自己那三处超宽行（③ 的数组字面量、④ 的两条 expect）⇒ 按 hunk 只重排这三处；两文件余下的 hunk 全是**既有债**（config-form.ts 9 处 / test 文件多处，行号都在新增段之外），**未动**。
- **偏差登记**：函数签名落成 `asrModelForProviderSwitch(next, value)`（**两参**，非计划写的 `(prev, next, value)`）——六条用例没有一条需要 `prev`，且"停在同一个 provider 上再点一次"也应能修掉非法值（⑤ 的语义），加 `prev` 只会是死参。

---

## Task 2 — 控件 + 文案 + 接线（spec §2 D1 / §3 / §4）

> 动到的文件：`components/workspace/settings/functional-models-view.tsx`（ASR 模型行）、`core/i18n/locales/{types,zh-CN,en-US}.ts`（+2 key）、`tests/unit/settings/functional-models.dom.test.tsx`（+N 条）。
> **验收对应**：spec §4 的 1 / 2 / 3 / 4。

- [x] **RED**：dom 用例六条——① **候选随 provider 换**：切 funasr / whisper 两态，菜单项文本集合各按候选表断言；② **点候选 ⇒ 值写进同一行的输入框**（`toHaveValue`）；③ **ⓘ 文案按 provider 不同**（两个 key 的原文各钉一次）；③′ **注记在 ⓘ 里**：funasr 那条文案中三条菜单模型名（`paraformer-zh` / `paraformer-en` / `sensevoice`）**各出现一次** + 含"逐句时间戳"及其后果的一句——防"注记被整个漏掉"；④ **联动**（视图侧）：切 provider 触发 Task 1 的纯函数 ⇒ 输入框值随之变（含"切向 funasr 时 whisper 名以外的值原样保留"一条）；⑤ **自由填往返**：填任意字符串 ⇒ 保存 payload 带上、读回原样；⑥ **既有配置零变化**：不动这两行时，保存 payload 与今天一致。此刻无实现 ⇒ 红。
- [x] **GREEN**：ASR 模型行换成**维度行同款**（外壳 + `Input` + 内嵌 chevron + `DropdownMenu`，候选组按 `values.video.asr_provider` 换，`onSelect` 写回 `updateVideo("asr_model", …)`）；占位进输入框；说明句进 `RowLabel` 的 `info=`；`updateVideo("asr_provider", next)` 里接上 Task 1 的纯函数；i18n 三文件 +2 key。
- [x] **neuter ①**：候选组不随 provider 换（固定一组）⇒ ① 红。
- [x] **neuter ②**：`updateVideo("asr_provider", …)` 里去掉联动调用 ⇒ ④ 红。
- [x] **neuter ③**：把 ⓘ 的 `info` 换成固定文案（不按 provider）⇒ ③ 红。
- [x] **neuter ④**：把 ⓘ 里的注记删掉（只留"可填模型名"那种提示）⇒ ③′ 红、其余绿。
- [x] **还原证明** + **提交回归**：Task 0 第 5 项清单里的既有断言按预定的处置复核（改过的逐条说明）。
- [x] **门禁**：`pnpm check` 净 + 触碰面（settings / rag 相关用例）全绿。

**实测**（Task 2，2026-09-28）：
- **RED**：**5 红 / 93 绿**（单文件 98 例 = 既有 91 + 新增 7）。⚠️ 计划写「六条 ⇒ 此刻无实现 ⇒ 红」，实际是 **5 红 + 2 条实现前就绿**：那两条（"手填的 funasr 值切回不被覆盖"、"自由填提交 + 不动这两行就不写 `video`"）守的是**既有行为**，实现前后都该绿——它们是回归钉，不是 RED 用例。另：计划的第 ① 条拆成了**两条** dom 用例（funasr 态 / whisper 态各一条），避开在 happy-dom 里"关菜单再开"的脆操作。
- **GREEN**：**98 绿**。
- **neuter ①**（候选组固定成 funasr 一组）：**1 红 / 97 绿**，受害者 = "候选随 provider 换"。
- **neuter ②**（切 provider 时不改值）：**1 红 / 97 绿**，受害者 = "切到 whisper 且值非法 ⇒ 变 `small`"那条（"手填值不被覆盖"那条不受影响——它守的是反方向）。
- **neuter ③**（ⓘ 固定成 funasr 文案）：**1 红 / 97 绿**，受害者 = "ⓘ 随 provider 变"。
- **neuter ④**（把注记从 funasr 文案里删掉）：**1 红 / 97 绿**，受害者 = **③′**（注记内容），其余绿 ⇒ 与计划一致。
- **还原证明**：四刀逐把还原 ⇒ **98 绿**；触碰面（`tests/unit/settings` + `tests/unit/rag`）**8 文件 / 229 例全绿**；`pnpm check` **净**。
- ⚠️ **门禁抓到一处真类型错**：`ToggleGroup` 的 `onValueChange` 回的是 `string`，而纯函数要 `"funasr" | "whisper"`（tsc TS2345）⇒ 按仓里既有的写法收窄（`next === "whisper" ? "whisper" : "funasr"`，同 `config-form.ts` 的做法）。
- **prettier**：新债只在视图那两处（切换回调的两行、`Input` 的 `onChange`）⇒ 按 hunk 手排；改后 view 的剩余 hunk 全在新增段之前，i18n 三文件的 hunk 也都在新键位之外（均既有债，未动）。
- **偏差登记**：i18n 落了 **3 个** key，非计划的 2 个——第三个 `asrModelCandidates`（"常用模型："）给框内下拉的触发器当 accessible name（兼作菜单表头），照「维度」行 `dimensionTierHint` 的先例；计划的 2 个是两条 hint。

---

## Task 3 — 文档 + 真浏览器 + 收官（spec §4.5 / §5 / §6）

> 动到的文件：`frontend/AGENTS.md`（功能模型一节一句）。
> **验收对应**：spec §4 的 5（门禁）+ §6 的顺序结论。

- [x] **文档**：`frontend/AGENTS.md` 的功能模型段补一句——ASR 行的两个 provider 是两套名字空间，值联动 = **单边判据**（只有 whisper 侧可判非法）+ **首行即默认**；控件与「维度」行同款（`Input` + 内嵌 `DropdownMenu`，零依赖）。**后端 AGENTS.md / README 不动**（无用户可见新功能、无后端变化）。
- [x] **真浏览器手验**（只读，驱动用户已在跑的 `:3000`）：① 候选菜单的**观感与宽度**（与输入框等宽、深色一致、不溢出）；② 两个 provider 下候选与 ⓘ 各不同；③ 点候选写值；④ 切 provider 看值变化（含切向 funasr 时 `sensevoice` 这类值原样保留；**whisper 手打 `turbo` → 切 funasr ⇒ 变 `paraformer-zh`**）；⑤ 自由填仍可保存。逐条记录结果；观感不合则记录并升级为"上 combobox"的待议项（**不擅自装依赖**）。
- [x] **收官门禁**：`pnpm check` 净 + 前端全量 `pnpm test` 0 失败 + `git diff` 不含 `backend/`（验收 4/5）。

**实测**（Task 3，2026-09-29）：
- **文档**：`frontend/AGENTS.md` 功能模型段插入 5 行（ASR 行 = 「维度」行同款的框内下拉；切换 ⇒ 回退到目标菜单首行；判据只看 whisper 名字集，funasr 是开放集、其菜单不得当筛子）。该文件的 `git diff` 复核**只含这 5 行**（别线那笔当时已提交）。
- **真浏览器手验**（他的 `:3000`，**只读、未点保存**；视口 587×631）：
  ① **观感与宽度**：实发菜单与输入框**逐像素相等**（左 82 / 右 505 / 宽 423，`sameWidth=true`）、**不溢出视口**；用共享 `DropdownMenuContent`（与「维度」行同一组件 ⇒ 同底色）；funasr 组 = `[paraformer-zh, paraformer-en, sensevoice]`。
  ② **随 provider 换**：切 whisper ⇒ 候选整组变 `[small, tiny, base, medium, large-v3, large-v3-turbo]`，ⓘ 换成 whisper 文案（funasr 文案同时撤下）；切回 funasr ⇒ ⓘ 变回（含三条候选与"逐句时间戳"注记原文）。
  ③ **点候选写值**：点 `large-v3-turbo` ⇒ 输入框即时变。
  ④ **联动**：切 whisper 时值 `paraformer-zh` ⇒ 自动变 `small`；whisper 上手填 `iic/SenseVoiceSmall` 后**切回 funasr ⇒ 原样保留**（开放集规则真机成立）；切向 funasr 且值是 whisper 名 ⇒ 变 `paraformer-zh`。
  ⑤ **自由填可保存**：手填后「保存」由禁用转**可用**（**没点它**，只读；验完已重新加载页面，表单状态复原）。
- **收官门禁**：前端全量 `pnpm test` **247 文件 / 2719 例，0 失败**；`pnpm check` 净；`git diff --name-only` **不含 `backend/`**（验收 4/5）。

---

## 交付后调整（2026-09-29）

**引擎选择：按钮组 → 下拉（`OptionSelect`）**——为后续"厂家分隔线"预留形状（`SelectGroup` / `SelectLabel` / `SelectSeparator`，即 models 添加弹窗那次的路子）。

- **RED**：先把四条"切引擎"的 dom 用例改成驱动下拉（`combobox` → `option`，同 `models-add-dialog.dom.test.tsx:126` 的写法）⇒ **4 红 / 94 绿**（其余三条不切引擎、不受影响）。
- **GREEN**：`OptionSelect` 替掉 `ToggleGroup`（模块常量 `ASR_PROVIDER_OPTIONS` 定顺序；`ToggleGroup` 的 import 随之删除——全文件只剩这一处用它）⇒ **98 绿**。
- **neuter（经新控件重跑）**：去掉 `onChange` 里的联动 ⇒ **1 红 / 97 绿**，受害者仍是"切 whisper 值非法 ⇒ `small`"⇒ 接线在新控件上仍有牙。
- **还原证明 + 门禁**：还原 ⇒ **98 绿**；触碰面（settings + rag）**8 文件 / 229 例全绿**；`pnpm check` 净。
- **真机复验**（他的 `:3000`，只读）：引擎行现为 `combobox`（标签「语音识别 (ASR)」），候选 = `funasr（本地）` / `whisper（本地）`；选 whisper ⇒ 触发器显示 whisper、**模型值自动 `paraformer-zh → small`**（联动经新控件成立）；验完重新加载页面复原。
- **prettier**：顺手补排了 Task 2 留在 dom 用例里的两处超宽行（当时漏查这个文件）⇒ 新增行零债，两文件剩余 hunk 均既有。
- **跨件回改（2026-09-29，姊妹件 Task 3 恢复）**：姊妹件（video-asr-output-shape）落地 cam++ 后**确实修了分段** ⇒ 本对 funasr 那条 ⓘ 的后果句（"没有逐句时间戳时整段文字会挤进一张镜头卡"）**过期** ⇒ 改成"口述按 VAD 分段落到镜头卡，连续语音可能整段只落一张"（`zh-CN.ts` / `en-US.ts` 各 1 行）；RED ③′ 的断言靠新文案里的"镜头卡"继续成立（picker 大册 101 例全绿、`pnpm check` 净）。
