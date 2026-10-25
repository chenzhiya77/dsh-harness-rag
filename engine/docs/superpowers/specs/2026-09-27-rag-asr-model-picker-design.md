# 「ASR 模型」字段：可填下拉 + provider 联动 —— 设计

**Status:** 🟢 **已交付（2026-09-27 立，2026-09-28 裁 D1/D2/D3；Task 0–3 全部落地）** —— **D1 = 乙（可填下拉；实现照抄「维度」行 = `Input` + 内嵌 `DropdownMenu`，零新依赖）· D2 = 甲（切换时置目标引擎列表的首行）· D3 = 甲（不做保存期校验）**。**已成对**：plan = [2026-09-27-rag-asr-model-picker.md](../plans/2026-09-27-rag-asr-model-picker.md)（Task 0–3 + 一节「交付后调整」）。与嵌入探测线的串行约束**已解除**：**本线** `63f3c448`→`e6dc651b` 各笔已推送（分支 tip 随推送到 `7e9dfc6c`）。**交付后调整（2026-09-29）：引擎选择由按钮组改为下拉**（`OptionSelect`，为后续"厂家分隔线"预留形状；本件 §1.1 ① 记的是调整前的形态）。**同日再调整：`sensevoice` 从 funasr 菜单与 ⓘ 注记里删掉**（短名 `AutoModel` 不认、换仓库 id 实测 0 段 ⇒ 不可用）⇒ **菜单现为 2 条**。

> **行号锚点**：本文所有 `file:line` 锚定于 **2026-09-28**（嵌入探测线落地之后）。线漂了就按文件名 + 符号名找。

**相关记录**：[2026-09-08-video-ingest-design.md](2026-09-08-video-ingest-design.md)（ASR 腿的出处：`asr_provider: funasr | whisper`、`asr_model: paraformer-zh`、降级矩阵）· [2026-09-10-rag-functional-model-config-design.md](2026-09-10-rag-functional-model-config-design.md)（本行所在的「功能模型」表单）· [2026-09-26-rag-embedding-probe-design.md](2026-09-26-rag-embedding-probe-design.md)（同文件的那条线，**已交付**；本对的控件先例与 ⓘ 落点惯例取自它）

## 1. 问题

### 1.1 现状（三件，逐条带落点）

| # | 现状 | 落点 |
| --- | --- | --- |
| ① | 「语音识别 (ASR)」= 两个按钮（funasr / whisper，都是**本机 CPU**）；「ASR 模型」= **裸文本输入框**：无 placeholder、无提示、无候选 | `functional-models-view.tsx:1368-1400`（ToggleGroup `:1370-1389`、裸 `Input` `:1394-1399`）；i18n 只有四个标签 key，无 hint/placeholder key：`zh-CN.ts:1789-1792` / `en-US.ts:1882-1885` |
| ② | 两个 provider 是**两套互不通用**的模型名空间：名字发给另一个引擎必然失败 | `asr.py:163-169`（按 provider 名分派到 `FunAsrProvider` / `WhisperProvider`），加载分别在 `:98`（`AutoModel(model=...)`）/ `:120`（`whisper.load_model(...)`） |
| ③ | 值**不被任何一层校验**：字符串原样传给加载函数；填错只在**视频入库那一刻**失败 ⇒ 该腿降级 `asr=failed`、镜头卡「口述」写「（ASR 失败）」，文档仍可 ready | `app_config.py:156-157`（`asr_provider: Literal["funasr","whisper"]`、`asr_model: str`，默认 `paraformer-zh`）、`rag_config_file.py:110-111`、`asr.py:1-16` / `:96` / `:118` / `:123` |

**两套名字空间的性质（决定 D1 能不能"纯下拉"）**：

| | funasr | whisper |
| --- | --- | --- |
| 名字从哪来 | ModelScope 模型 id（或**本地目录**）——**开放集**：`funasr/download/download_model_from_hub.py:241-275`（`os.path.exists(model)` ⇒ 直接当目录用；否则 `snapshot_download(model)` 当仓库 id 去下） | 包内置固定清单——**封闭集** |
| 常用值 | `paraformer-zh`（默认，中文）、`paraformer-en`（**`sensevoice` 已于 2026-09-29 剔出菜单**：短名不可加载、实测 0 段，见 §7.1）…（**Task 0 已结，见 §7.1**） | 包内 `_MODELS` 共 **14 键**（含 `.en` 与别名），菜单列常用 **6 条**：`tiny` / `base` / `small` / `medium` / `large-v3` / `large-v3-turbo`（`large`≡`large-v3`、`turbo`≡`large-v3-turbo` 是别名 ⇒ 实际 12 份权重）；**判据用它（14 键），菜单只列 6 条** |
| 值的含义 | 模型**族**不同（中文 / 多语言 / 英文），也可以是**一个目录路径** | 同族里**大小**不同（越大越准越慢） |
| 仓内唯一的示例 | `app_config.py:157` 的默认值与 video spec `:55/:185-186` | 同处："whisper tier example: small" |

**由此得出的三件**：① 用户"怎么知道怎么填"今天**没有任何界面内答案**；② 切 provider 后旧值可能非法（`paraformer-zh` 对 whisper 无意义），而**两个字段今天互不相干**（`config-form.ts:137-138` 各管各的写回）；③ 填错不报错、只降级——所以"补候选/提示"是**体验修复**，不是正确性修复。

### 1.2 组件现状（决定 D1 的成本，已核实）

- `ui/` 有 `select.tsx`（纯下拉，**不能打字**）、`command.tsx`（cmdk 列表）、`dropdown-menu.tsx`；**没有 combobox，也没有 Popover 原语**（`@radix-ui/react-popover` 未安装，全仓 0 命中）。
- **但同一文件里已有现成形态可抄**：探测线那轮的「维度」行（`functional-models-view.tsx:1039-1131`：行壳 `:1039` / `relative w-full` 外壳 `:1056` / `Input` `:1057-1071` / 触发器+菜单 `:1075-1129`）= `Input` 自由打字 + **内嵌 chevron 的 `DropdownMenu`**（菜单项 `onSelect` 写回输入框）——**零新依赖、零新原语**，观感与页面一致，且已经过真浏览器验收。本行的「可填下拉」**要连 `Input` 与外壳整段一起抄**（只抄 `:1080-1129` 会漏掉输入框本身），**不引入 datalist / combobox**。
- 同一表单里已有先例：VLM 那行是 `Select`（下拉）；本行是 `Input`（自由填）——两种控件都在这一节里出现过。
- 说明句的落点先例：同节 caption 行 `RowLabel info={F.captionModelHint}`（`functional-models-view.tsx:1337`）——**说明句进标签后的 ⓘ，不新增行**（探测线那轮已定死这条惯例）。

## 2. 决定（已裁 2026-09-28）

### D1 —— 控件形态：**取乙（可填下拉）**

- **做法**：**照抄「维度」行那一格**（`functional-models-view.tsx:1039-1131`，含 `Input` 与外壳）——`Input` 自由打字 + 内嵌 chevron 的 `DropdownMenu` 候选，点一条写进输入框。候选组按 `values.video.asr_provider` **整组换**（funasr 一组、whisper 一组）。**零新依赖、零新原语**（用仓里已有的 `DropdownMenu`，不引 Popover、不引 datalist）。
- **不取甲（纯下拉）**：funasr 是开放集——纯下拉会锁死 ModelScope 新模型与**本地目录**，且手写在配置文件里的非候选值在 Select 里**显示不出**、有被写回抹掉的风险。
- **不取丙（只加提示不换控件）**：它只解决"怎么知道怎么填"，用户仍要手打全名；乙把"能浏览候选"一起给了，且没有任何额外风险（自由填照旧）。
- **已知代价**：该形态的菜单**不做"边打字边过滤"**（`DropdownMenu` 的键盘模型是菜单的，不是 combobox 的）。候选只有 3–6 条 ⇒ 够用；哪天真涨到几十条，才需要真 combobox（那时才引入 Popover）。
- **菜单的入选口径（2026-09-28 裁「甲」）**：菜单**按常用排**（`paraformer-zh` 打头），**不拿"能否出句级时间戳"当门槛**——能力差异写成**注记**：逐条标明"有/无逐句时间戳"及其后果（无 ⇒ 整段文字会挤进一张镜头卡、其余卡口述「（无）」，见 `worker.py:93-125` 的分桶规则）。**注记的落点 = 该行的 ⓘ 文案**（写进 funasr 那条 hint 内，逐条列「模型名 + 能力/后果」）——**不进菜单项、不新增可见行、不新增 i18n key**；plan Task 2 有对应断言与 neuter。理由：菜单是给"不知道怎么填的人"看的**常用表**，而用户本就能自由填（本格不设白名单）——设门槛只会把常用选择藏起来，拦不住谁去填。**「只留能出时间戳的 N 条」这类筛法在本对里不许复活。**

### D2 —— 切换 provider 时的值联动：**取甲（换值），且"首行 = 默认"**

**判据（单边，可执行）**——**只有 whisper 的合法名集合（`_MODELS` 的 14 键）能判"非法"**；funasr 是开放集，没有可比的候选表，**不得**拿 funasr 的推荐表去判。⚠️ **判据 ≠ 菜单**：菜单只渲染常用 6 条，判据用**全部 14 键**——`large` / `turbo` / `tiny.en` 这些别名与 `.en` 变体都是合法 whisper 名，漏判会让它们原样落到 funasr 上，下次入库即降级。

| 切换方向 | 判定 | 动作 |
| --- | --- | --- |
| → whisper | 值 ∉ whisper 合法名（14 键） | 置 whisper 列表**首行** `small` |
| → funasr | 值 ∈ whisper 合法名（14 键） | 置 funasr 列表**首行** `paraformer-zh` |
| → funasr | 其余一切（`paraformer-en-spk`、仓库 id、目录路径…） | **原样保留** |

- **首行 = 默认**：前端**不另设默认常量**——每个引擎的"默认"就是它推荐列表的第一项（funasr `paraformer-zh` 与后端 `app_config.py:157` 一致；whisper `small` 是多数人该用的档，不是最差的 `tiny`）。这一条同时消掉了"前端要不要硬编码两个默认值"的问题。
- **不记历史**：切走再切回**不会复原**用户上一次的输入（`sensevoice` 这类值会被首行顶掉）。要"每个引擎各留一份值"就得改数据模型 ⇒ 见 §5 的 C（单独立项）。
- **为什么必须有人改值**：这条腿**没有探针可用**——embedding / rerank / parse 那几行的错配在保存时被真探针挡住，而 ASR 是本地引擎，保存期真校验 = 下载权重 + 加载（已列为不做）⇒ 只能把"挡"提前到**切换那一刻**，否则一路静默到下一次视频入库才降级。
- **不取乙（只提示非法）**：要新增"非法值"状态与文案，且用户不改就降级——比甲多一步、还不如甲可靠。
- **不取丙（不联动）**：就是今天的样子（静默降级），等于本 spec 白做。

### D3 —— 保存期校验：**取甲（不校验）**

- 与今天一致：`asr_model` 是无约束字符串。
- 理由：① ASR 是**降级腿**，失败不毁文档（`asr.py:1-16`）；② **名字层两边都判不出硬对错**——whisper 的 `load_model` 也接受本地 `.pt`（源码 `whisper/__init__.py:139` 的 `elif os.path.isfile(name)`），funasr 更是接受任意仓库 id / 目录 ⇒ 想硬拦只有**真加载**一条路，那要下权重 + 联网，成本与收益不成比例；③ 只查格式对 funasr 是**假安全感**。

## 3. 落点

| 面 | 改什么 |
| --- | --- |
| 界面 | `functional-models-view.tsx:1394-1399`：控件换成**可填下拉**——**照抄「维度」行整段**（`:1039-1131`）：`relative w-full` 包一层 + `Input`（留出右侧内边距）+ 内嵌 `absolute inset-0 flex justify-end` 的 chevron 壳（外层 `pointer-events-none`、里层 `pointer-events-auto`）+ `DropdownMenu`（菜单 `w-(--radix-dropdown-menu-trigger-width)` 与输入框等宽），候选 `onSelect` 写回输入框。候选组按 provider 整组换；**占位**放输入框内；**说明句**进 `RowLabel` 的 `info=`（ⓘ，同 `:1337` 先例）——**不新增任何可见行** |
| 候选表 | **两张常量、各司其职**：**① 菜单**——**按推荐序**（funasr 首行 `paraformer-zh`、whisper 首行 `small`；**funasr 两条（2026-09-29 删 `sensevoice`）/ whisper 已定 6 条**），只负责渲染候选与「**首行 = 默认**」；**按常用排、不按能力筛**（逐句时间戳能力作注记，见 §2 D1）；**② 判据集合**——whisper 的**全部合法名（14 键，§7.2）**，只负责 D2 的"是不是 whisper 名"。⚠️ **不要合并两者**：`large` / `turbo` / `tiny.en` 合法但不在菜单里，合并即漏判。funasr 侧菜单两条已拍（2026-09-29 删 `sensevoice`；原文见 §7.1）。|
| 表单规则 | `config-form.ts` 加一个**纯函数**（按上表判 + 置首行），由视图的 `updateVideo` 在 provider 变化时调用；与现有写回语义一致（`:281-304`：值变了才写、空值只在文件自有覆盖时写回） |
| i18n | `locales/{types,zh-CN,en-US}.ts`：新增提示 key（按 provider 变 ⇒ **2 个**）+ 占位（可直接用模型名字面量，不进 i18n）——**+2 key ×3 文件** |
| **不动** | 后端全部（`asr_provider`/`asr_model` 的契约、`asr.py` 的分派与降级语义）；video 流水线；VLM 行；本节的其它行 |

## 4. 验收

1. **候选与提示按 provider 变**：选 funasr 与选 whisper 时，候选组内容不同（dom 断言菜单项文本）、ⓘ 文案不同（钉文案原文）——其中 **funasr 的 ⓘ 里逐条列出三个候选名与"逐句时间戳"能力注记**（见 §2 D1）；**点一条候选 ⇒ 值写进同一行的输入框**；几何/观感归真浏览器。
2. **联动三条**（D2=甲，判据 = whisper 合法名 **14 键**）：
   - 切到 whisper 且当前值 ∉ 14 键 ⇒ 变 `small`；
   - 切向 funasr 且当前值 ∈ 14 键 ⇒ 变 `paraformer-zh`——**含不在菜单里的合法名**（`turbo` / `large` / `tiny.en`）；
   - **切向 funasr 时判据不看 funasr 自己的推荐表**：whisper 名以外的值（`paraformer-en-spk`、仓库 id、目录路径）在任何"切向 funasr"的场景都原样保留。⚠️ 这一条**不是**"往返不动"——切走再切回**不复原**上一次的输入（见 §2 D2「不记历史」）。
3. **自由填不被破坏**（D1=乙）：任意字符串仍可保存并原样读回（往返用例）。
4. **既有配置零变化**：不动这两行时，保存 payload 与今天逐字节相同；后端零改动（`git diff` 不含 `backend/`）。
5. **门禁**：前端 `pnpm check` + 相关 dom 用例；纯前端 ⇒ 不跑后端套件（交付说明注明）。

## 5. 影响面与非目标

- **影响面**：只动「多模态与视频」一节的 ASR 两行 + 文案 + 一条前端联动规则。
- **风险**：候选菜单**不做打字过滤**（非 combobox 语义，靠候选少而没有影响）；候选表若将来显著变长（几十条），需升级为真 combobox（新原语 + `@radix-ui/react-popover` 依赖）。
- **已知残差（有意不堵）**：whisper 用户在那格填的是**本地 `.pt` 路径**时（D3 已认定这是合法形态，源码证据见 §2 D3），切向 funasr 它 ∉ 14 键 ⇒ 被当"其余一切"**原样保留** ⇒ funasr 加载失败、该腿降级。**不堵的理由**：路径**对 funasr 也可能是合法的**（`AutoModel` 接受本地目录，D1 明确保护），形状上区分不出"whisper 的 .pt 文件"与"funasr 的模型目录"；用 `.pt` 后缀去猜会误杀叫 `xxx.pt` 的目录，且这不是前端该猜的事。
- **非目标**：不改 `asr_provider` / `asr_model` 的契约与默认值；不改 `asr.py` 的分派、依赖缺失/加载失败的降级语义；不做保存期真加载校验；不动 VLM 行与本节其它行；不做 ASR 的"连通/能力探测"（那是另一族，ASR 是本地引擎、没有端点可探）。
- **待议（不在本对）**：**C · 两个键**——配置里给两个引擎各存一份值（`asr_model` 按引擎分键），界面按 provider 显示对应的那份 ⇒ 来回切换互不污染、刷新重启也在。代价：动后端契约（新字段 + worker 读取 + 老 `asr_model` 的迁移），故单独立项，不塞进这条纯前端的对里。
- **定位**：**体验修复**（"用户怎么知道怎么填" + "切了引擎别留下跑不了的值"），不是缺陷修复——填错今天已有明确降级路径。

## 6. 归属与顺序

- **独立小对**（纯前端，spec + plan 各一份）；**不并进**嵌入探测线。
- **串行约束已解除**：与本对同文件的嵌入探测线（`functional-models-view.tsx` / locales / `config-form.ts`）**已于 2026-09-28 全部交付并推送** ⇒ 本对可随时开工。
- **已与 plan 成对**：[2026-09-27-rag-asr-model-picker.md](../plans/2026-09-27-rag-asr-model-picker.md)——含 Task 0 **五项**（三项取证 + 落点核实 + 断言预扫）与四个 Task 的 RED/GREEN/neuter 纪律。

## 7. 待办（开工前 Task 0 该取证的）

1. ✅ **funasr 候选表（已结，2026-09-28）**：三条来源交叉核——官方 README / 模型 zoo、本机 CLI 注册表 `funasr/cli.py:11-16`、别名表 `download/name_maps_from_hub.py`。**按 §2 D1「甲」**：
   - **菜单两条（已拍；2026-09-29 删去 `sensevoice`）**：`paraformer-zh`（**首行**）/ `paraformer-en`——按**常用度**排，**不按"能否出时间戳"筛**；
   - ⚠️ **拼写更正**：`sensevoice-small` 这个名字**不存在**（全包 0 命中）——准确拼写 `sensevoice`（CLI 别名）/ 仓库 id `iic/SenseVoiceSmall`；
   - **能力注记（当前调用的实测结论）**：`paraformer-zh` 能返回 `timestamp`，但只因调用侧没传 `vad_model` / `punc_model`，产出是**整段一行 + 逐字带空格** ⇒ 整段挤进一张镜头卡、其余「（无）」；**其余模型未测**（标"未测"）。真机证据与"另开一笔"的建议见 plan 的 `实测`。
2. ✅ **whisper 候选表（已结，2026-09-28）**：`openai-whisper` 源码 `whisper/__init__.py` 的 `_MODELS` = **14 键**（`tiny.en`/`tiny`/`base.en`/`base`/`small.en`/`small`/`medium.en`/`medium`/`large-v1`/`large-v2`/`large-v3`/`large`/`turbo`/`large-v3-turbo`）⇒ **"常用五档"不是全集**；`large-v3-turbo` 确实存在；`large`≡`large-v3`、`turbo`≡`large-v3-turbo` 指向同一 URL ⇒ 实际 12 份权重。同文件 `load_model` 的第二分支 `elif os.path.isfile(name)`（`:139`）接受**本地 .pt**——这也是 D3 改措辞的源码证据。**菜单**取常用 6 条：`tiny` / `base` / `small` / `medium` / `large-v3` / `large-v3-turbo`（不混入 `.en` 与别名）；⚠️ **判据用这 14 键全集**，菜单只负责渲染（见 §2 D2 / §3）——两者不得合并。
3. ✅ **两张候选表的顺序定稿（已结，2026-09-28）**：按**推荐序**排，**首行 = 默认**（D2 的规则直接引用它）——whisper **6 条**（首行 `small`）；funasr **按「甲」两条（已拍；2026-09-29 删 `sensevoice`）**（首行 `paraformer-zh`）。控件形态已无待验项（照抄「维度」行）。
