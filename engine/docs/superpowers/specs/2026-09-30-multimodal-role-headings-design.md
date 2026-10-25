# 视频区 ASR 块：主从行与探针落点 —— 设计

> ⚠ **2026-09-30 两轮观感裁定后改判：本文件初稿的「两条角色标题」整案已删。** 一轮（加标题＋探针上标题）与二轮（标题对齐输入框列）均被否；最终形态＝**无标题**——ASR 块改为「主行改名「语音识别模型」（与「图片描述模型 (VLM)」同级）＋三张缩进明细行」；**手动探针三轮落点皆不成立，同日第三轮裁定为「零入口休眠」**（控件不渲染、链路与保存门保留）。保留下来的：Task 0 的核实（锚点/断言扫描/碰撞面/`divide-y` 机制/可点性事实，见 plan 实测）。

**Status:** **2026-09-30 起草；同日三轮裁定后定形（无标题·主从行·探针零入口休眠），Task 1／2 已按最终形态落地（未提交）。** 遗留＝提交。除 D1–D4 外**零行为变化**——探针取值/判定键/拦保存、`shouldProbeAsr`、候选菜单与锁两态全不动（探针仅失去 UI 入口）。

**Plan:** [2026-09-30-multimodal-role-headings.md](../plans/2026-09-30-multimodal-role-headings.md)

**相关记录**：

- [2026-09-28 ASR 服务档](2026-09-28-rag-asr-service-tier-design.md)：探针（D7）与「只挂服务档」的出处；本件只动它的**行结构**，语义不动。
- [2026-09-26 连通点与探测](2026-09-26-rag-embedding-probe-design.md)：`LegHeading` 的出处（本件最终**没有**用它——两轮标题方案都被否，检索两腿保持原样）。
- [2026-09-24 设置页响应式](2026-09-24-settings-responsive-layout-design.md)／检索区的高级设置（稀疏服务四行）：`RowLabel nested`（缩进＋竖线）的既有形状——本件照它做明细缩进。
- [2026-09-27 ASR 模型选择器](2026-09-27-rag-asr-model-picker-design.md)：视频区四行与共享标签的出处。

## 1. 目标与边界

视频区此前是一个**无分隔的四行块**（`提供商 / Model ID / API Key / 接口地址`）＋上一行的 `图片描述模型 (VLM)`，两者读不出主次；首稿试图用「两条角色标题」分块，两轮观感都不成立（先被嫌"混"、加标题又被判"没有层次"、对齐到输入框列后仍"效果不好"）。最终改用**同一页面里已在用的词汇**——主从行（`RowLabel nested`：缩进＋竖线，出处是检索区高级设置的稀疏服务四行）：块的分层由「改名的主行＋缩进明细」自己说清，不再需要标题这一层。

| 本期做 | 本期不做 |
| --- | --- |
| ASR 块主行**改名**「语音识别模型」（与「图片描述模型 (VLM)」同级） | 角色标题（两轮皆否，整案删除）；给 VLM 腿新做探针 |
| `Model ID` / `API Key` / `接口地址` **缩进一级**（照稀疏服务四行） | 探针**重新落点**（D2：零入口休眠，不找家） |
| i18n ＋1 键；用例两处新钉；`frontend/AGENTS.md` 一句 | 改探针链路与后端；改组标题与其 ⓘ；拆卡 |

## 2. 决定

### D1 主从结构（最终形态）

```
（左列＝8rem 标签栏）
图片描述模型 (VLM)      [vision 条目选择器]        ← 一级
语音识别模型            [引擎/服务下拉 ＋ ●]       ← 一级（原「提供商」行改名）
  ∟ Model ID            [输入框＋框内 ⌄]           ← 缩进一级（RowLabel nested：缩进＋竖线）
    API Key             [SecretInput ／ LockedBox]
    接口地址             [Input ／ LockedBox]
```

- 主行标签＝新键 `asrModelRow`「语音识别模型」；**aria 不动**（`F.asrProvider`）；分组菜单、锁两态、候选菜单规则全不动。
- 三行明细只缩进**标签栏**（`RowLabel nested`），值列不动——照稀疏服务四行的既有形状。

### D2 探针 ＝ 零入口休眠（2026-09-30 第三轮，用户提案并点头）

三轮落点都不成立（行内点＝读成 provider 的状态；标题上＝标题被否；主行标签上＝页面唯一的可点标签太突兀）⇒ **控件不渲染**（两种模式下都没有 `asr-probe`），**链路保留但休眠**：`POST /rag/config/probe-asr`、夹具与判据、`useProbeAsrService`、`asrProbeKey/VerdictFor`、保存区那道 `no_timestamps` 拦门**全部留着**——只是没有入口、没有弹源。载荷/判定键/拦保存语义**逐字不动**。将来要么给它找家、要么正式退役，两件都单开。

**兜底现状（对着代码核过）**：

| 情形 | 兜底 |
| --- | --- |
| 服务档缺地址/钥匙 | **硬**：保存期构造拒绝（400＋具名理由） |
| 钥匙错 / 连不上 | 入库期 `asr=failed`、每卡「（ASR 失败）」 |
| 连得上但**没分段**（单段/空） | ⚠ **变静默**：服务档单段答案按「没答案」处理（`asr/_segments_to_rows`：空或单段 ⇒ 空 rows）⇒ 口述行全空、不报错——这正是 D7 加手动探针的唯一理由（见 §6.2） |

### D3 用词

主行标签「**语音识别模型**」（en「Speech recognition model」）：与「图片描述模型 (VLM)」**同模**（角色＋模型），词根复用页面既有的「语音识别」（组 ⓘ／下拉名）。先拟的「ASR 模型」被他判**不规范**（2026-09-30），改判本案（见 §6.1 ③）。三行明细沿用共享标签（`Model ID` / `API Key` / `接口地址`）。

### D4 i18n：＋1 键

`asrModelRow`（zh「语音识别模型」／en「Speech recognition model」）。初稿的四个标题/引擎档文案键与 `asrProbe` 的退场**一并作废**——`asrProbe` 保留原值，`captionRole`／`asrRole`／`legDotLocalEngine`／`legDotUntestedAsr` 不落地。

## 3. 接口与实施归属

| 接口／对象 | 本期契约 |
| --- | --- |
| `functional-models-view.tsx` | 视频区：主行改名（`F.asrModelRow`）、三行明细加 `nested`、探针回位；初稿的标题行/`LegHeading`/`asrHeadingStatus`/`asrHeadingReason` 全撤 |
| i18n（`types.ts`／`zh-CN.ts`／`en-US.ts`） | **＋1 键**（`asrModelRow`）×2 语＋类型；其余不动 |
| 探针链路（`useProbeAsrService`／`asrProbeKey`／`asrProbeVerdictFor`／`asrProbeBlocksSave`／`shouldProbeAsr`） | **保留但休眠**：判定与拦保存逐字不动，只有渲染层摘掉了控件（`asrProbeKey` 在视图的 import 随之退场） |
| `tests/unit/settings/functional-models.dom.test.tsx` | 恢复「hangs the probe on the provider row for services only」；新增「names the engine row after the ASR model, and nests its details under it」；四行/分组/锁/载荷/拦保存各条原样 |
| `frontend/AGENTS.md` | functional-models 段改写：主从行（无标题）、探针原位（落点先放着） |

**明确不改**：探针链路与后端 `POST /rag/config/probe-asr`；`LegHeading`（检索两腿继续用）；组标题与 ⓘ；检索两列与 `PairCell`；`Rows`／`ROW` 原语；i18n 里三个既有死键（`legDotOk`／`legDotUnreachable`／`legDotDimension`，不顺手清理）。

## 4. 验收清单

1. **主行**：视频区第一张 ASR 行的标签为「语音识别模型」，与「图片描述模型 (VLM)」同级；原「提供商」标签不再用于 ASR 块（检索两列不动）。
2. **明细三行缩进**：`Model ID` / `API Key` / `接口地址` 的标签带 `RowLabel nested` 的缩进＋竖线；值列不受影响。
3. **探针零入口**：两种模式下都没有探针控件（`[data-slot="asr-probe"]` 与按名查询的按钮均为 null，两条用例钉住）；休眠门保留（stub 注 verdict 时保存区仍按 `no_timestamps` 拦保存，两条既有用例原样绿）。
4. **无标题**：视频区不渲染任何角色标题行。
5. **i18n**：三文件仅多 `asrModelRow`；无悬空键。
6. **门禁**：`pnpm check` 零诊断；窄面绿；前端全量（共享组件）。
7. **真浏览器（只读）**：主行/缩进的观感；引擎↔服务切换不位移；探针点一次真发（假 key 得 `unreachable` 亦可）；不点保存。

## 5. 文件影响

### 5.1 本期修改面

| 文件 | 修改 |
| --- | --- |
| `components/workspace/settings/functional-models-view.tsx` | D1／D2（主行改名、明细缩进、探针控件摘除＋三个只为控件服务的局部量退场） |
| `core/i18n/locales/{types,zh-CN,en-US}.ts` | ＋1 键 |
| `tests/unit/settings/functional-models.dom.test.tsx` | 恢复 1 条、新增 1 条 |
| `frontend/AGENTS.md` | functional-models 段改写 |

### 5.2 碰撞面

- **解析旋钮那一对（2026-09-29）与本案共用 4 个源文件**（视图＋i18n 三文件），其 Task 2（前端）**已落地**（`80fe8c01`）＋ Task 3（`d231e430`）——本案 Task 0 已按新基线重扫：锚点无漂移、其新键为 `parse*` 族零撞名、其未碰本案主用例文件 ⇒ **无需再串行**。文档面不重叠。
- 检索对（2026-09-26 已交付）：`LegHeading` 保持原样，无冲突。

## 6. 裁定记录与已知代价

### 6.1 裁定记录

| # | 在问什么 | 选项 | 裁定 | 后果 |
| --- | --- | --- | --- | --- |
| ① | 分块方式 | 甲 角色标题／乙 主从行（缩进） | **已裁（2026-09-30，乙）**——标题方案两轮被否（一轮"混"、二轮"没有层次"、对齐后仍"效果不好"） | 无标题这一层；块分层由主行＋缩进承担 |
| ② | 探针落点 | 行内点／标题上／主行标签上／`trailing` 槽 | **已裁（2026-09-30 第三轮）：零入口休眠**——用户提案「暂时留着、不显示，只用保存兜底」 | 控件摘除；链路保留（见 §6.2 静默格） |
| ③ | 主行用词 | 甲 语音识别模型／乙 语音识别模型 (ASR)／丙 语音识别引擎 | **已裁（2026-09-30，甲）**——先拟的「ASR 模型」被判不规范（它是照用户举例直抄的，不是规范词） | 只影响一个 i18n 值 |

### 6.2 已知代价

- **主行的「模型」是角色级说法**：它手里是引擎/服务下拉，真正的模型名在下一行 `Model ID`——与「图片描述模型 (VLM)」同一用法（刻意保留的概括，用户 2026-09-30 裁甲案）。
- 明细三行占用左侧缩进空间（与稀疏服务四行同款）。
- **「连得上但没分段」变静默**（② 的直接代价）：手动探针是它唯一的提前预警（D7 的初衷）；零入口后，发现它要靠入库后自己看出口述行全空。要拿回这格，将来给它找个家（甲/乙/丙）或把预警做进保存期（需后端加真调用，单开）。

后续不再重开 ①；实施中若确遇新事实，按本文件的更正惯例**追加**一条（不改写已裁的行）。
