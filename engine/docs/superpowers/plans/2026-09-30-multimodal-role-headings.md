# 多模态区的两条角色标题与探针落点 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. 每个 Task 走完 RED → GREEN → neuter → revert proof → 门禁 再进下一个；「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-09-30-multimodal-role-headings-design.md](../specs/2026-09-30-multimodal-role-headings-design.md)
**Status:** **2026-09-30 起草；同日三轮裁定后定形（无标题·主从行·探针零入口休眠）。** Task 0／1／2 已按**最终形态**落地（未提交）：主行改名「语音识别模型」、明细三行缩进、探针控件摘除（链路与保存门保留）。**遗留＝提交按授权。** 初稿（角色标题＋探针上标题）的历史过程留在 Task 1 的实测里，已被二轮改判取代。
**Architecture:** 纯前端：`functional-models-view.tsx` 视频区改为主从行（主行改名、三行缩进、探针回位）；探针链路（hook／key／判定／拦保存）与后端零改动；文案走 i18n 三文件（**＋1 键**）。

**相关基线:** spec 的「相关记录」四条；碰撞面＝解析旋钮那一对（4 个源文件共享）——其 Task 2／3 已落地、Task 0 已按新基线重扫，**无需再串行**。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 结构 | 主行改名「语音识别模型」＋明细三行缩进（`RowLabel nested`） | 角色标题（两轮皆否，整案删除）；给 VLM 腿新做探针；拆卡 |
| D2 落点 | **零入口休眠**（控件不渲染；链路与保存门保留） | 重新落点（不找家） |
| D3 用词 | 主行标签「语音识别模型」（他裁甲；「ASR 模型」被判不规范）；明细沿用共享标签 | 改其余标签 |

**待裁：无**（探针最终落点是「先放着」不是待裁项——将来单开）。

## 硬约束

- **探针语义零变化**：载荷、`key`、脏值失效、拦保存、`shouldProbeAsr` 一行不动；落点＝**零入口休眠**（控件摘除、链路保留）。
- **无标题**：视频区不渲染角色标题（两轮皆否）；块分层由主行＋`RowLabel nested` 缩进承担。
- **文案不留悬空键**：三文件（`types`／`zh-CN`／`en-US`）同批；初稿四键不落地、`asrProbe` 保留原值。
- **共享文件（视图 ＋ i18n 三件 ＋ 同一份 dom 用例）改完必须跑前端全量**。

## 执行纪律

- 当前分支 `feat/rag-knowledge-base`。实施按 **RED → GREEN → neuter（行为还原并记录受害者）→ revert proof → 门禁**；提交／推送按届时明确授权，使用 Conventional Commits。
- 前端命令：`cd frontend`，`PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py test`／`... check`（不用裸 `pnpm`）。
- 真浏览器复核**只读**（不点保存）；如真栈未起，先报告再定替代取证。
- 找会被影响的既有断言按两把扫：数据字段轴（`asr_probe`／`asrProbe` 族）与界面词汇轴（`语音识别`／`图片描述`／`提供商`）。

**依赖顺序**：Task 0（只读核实）→ Task 1（实现）→ Task 2（真浏览器＋收官）。**与解析旋钮对的串行（spec §5.2）**：共用 4 个源文件（视图＋i18n 三文件）、用例面不重叠；其 Task 2（前端）先落地（2026-09-30 现场：未落地），本对 Task 1 排其后；落地后重扫断言与 i18n 键面。

---

## Task 0 — 只读核实（锚点／断言扫描／碰撞面）

- [x] **锚点复核（按符号，不按行号）**：`LegHeading` 的定义与检索两处用法；ASR 探针块与局部量（`asrServiceApplies`／`asrReady`／`asrVerdict`／`asrProbing`／`asrBlockReason`）；`useProbeAsrService` 与 `config-form.ts` 的五个 ASR 导出（`shouldProbeAsr`／`asrProbeKey`／`asrProbeVerdictFor`／`asrProbeBlocksSave`／`asrModelForProviderSwitch`）；`Rows`／`ROW`／`RowLabel` 的行结构与发丝线。记下现状（谁渲染、谁禁用、谁给理由）。
- [x] **断言扫描（两把扫）**：全仓搜 `asrProbe`／`asr-probe`／`asr-provider-control`／`leg-heading`／`leg-dot`／`legDotUntested`／`lockedServiceOnly`／`语音识别`／`图片描述`。**已核基线（2026-09-30）**：`F.asrProbe` 全仓代码引用仅 3 处（视图 aria ×1；`tests/unit/settings/functional-models.dom.test.tsx` ×2：`:2316` 助手 `probeDot()` 与 `:2439` 行内查询）。预期受害者**共 2 条**：①「hangs the probe on the provider row for services only」**必改**（引擎档 `toBeNull` → 按钮存在＋禁用＋`legDotLocalEngine`）；②「runs one real probe on click…」**只经 `probeDot()` 换名**；③ 两条拦保存用例**不动**（不查按钮）；④「turns both role headings into connectivity buttons…」按可访问名选择、无计数断言（加第三条不受影响）。
- [x] **碰撞面**：核解析旋钮对 Task 2（前端）是否已落地——**共用面＝4 个源文件**（视图＋i18n 三文件）；**用例面不重叠**（它主改 `tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`，本案不碰；本案主用例在 `tests/unit/settings/functional-models.dom.test.tsx`，它只顺带跑）⇒ 两侧各互相复跑一次即可。**现场（2026-09-30，已完成）**：其 Task 2 **已落地**（`80fe8c01`，11 文件）＋ Task 3（`d231e430`，9 文件）⇒ **重扫已做**：锚点无漂移（视频区行号未动）、受害者清单不变、其新键为 `parse*` 族（6 键）零撞名、其未碰本案主用例文件。**Task 1 的前置门已开**。
- [x] **i18n 键面清点**：`types.ts`／`zh-CN.ts`／`en-US.ts` 中新 4 键的落位与 `asrProbe` 的全部引用点（**已核：代码 3 处＋locales ×3**）；**登记不动**：`legDotOk`／`legDotUnreachable`／`legDotDimension` 三个全仓零引用的死键（不顺手清理，防误读为新增）。

**实测（2026-09-30 完成，只读核实；无 RED／neuter——只读轮不伪造这两类数字；生产代码零改动、未提交；基线 HEAD `d231e430`）**

**① 锚点复核（按符号；行号仅作当时参考）**

| 对象 | 现状 |
| --- | --- |
| `LegHeading` | 定义 `:332-374`；`data-slot="leg-heading"`、内 `leg-dot`；aria＝`${label} · ${reason}`；禁用由调用方给。检索两处用法：宽屏头行 `:964-968`（`ROW_PAIR`＋占位 `<span/>`，`max-md:hidden`）、窄屏文本标题 `:974-980` |
| ASR 探针（现状） | `提供商` 行 `flex` 包裹 `data-slot="asr-provider-control"`（`:1501-1603`）；按钮 `asr-probe` `:1548`、点 `asr-probe-dot` `:1587`；**仅 `asrServiceApplies` 时渲染**（`:1535`）；`disabled={!asrReady \|\| asrProbing}`（`:1567`） |
| 局部量 | `asrServiceApplies`＝`shouldProbeAsr(values)`（`:544`）；`asrReady`＝model∧地址∧钥匙在（`:551-556`）；`asrProbing`＝pending∧同键（`:549-550`）；`asrVerdict` 按 key 失效（`:545-547`）；拦保存文案 `:557-560` |
| 理由句 | 现状四句全共享（`legDotProbing`／`legDotNeedsConfig`／`verdict.detail`／`legDotUntested`，`:1536-1543`）→ 搬迁后前三句原样、未测句换 ASR 自有句（spec D4） |
| 探针链路 | `useProbeAsrService`（`core/rag/hooks.ts:180-191`：mutation 接 `{key, ...request}`、回 `{...verdict, key}`）；`asrProbeKey`＝`provider\|model\|base_url\|key`（`config-form.ts:686-695`）；`asrProbeVerdictFor`（`:702-708`）；`asrProbeBlocksSave` 只认 `no_timestamps`（`:716-718`）——**五个导出与 hook 一行不动** |
| 行原语／发丝线 | `ROW`＝`grid grid-cols-[8rem_minmax(0,1fr)] … max-md:grid-cols-1`（`:218-219`）；`Rows`＝`divide-y`（`:229-243`，`stacked` 只影响 `max-md`）；**`divide-y` 语义已核（`frontend/node_modules/tailwindcss/dist/lib.js`，v4）：对非末子画 `border-bottom`（`:where(& > :not(:last-child))`，零特异性）** ⇒ 标题贴身＝标题行加 `border-b-0`（已回写 spec D1） |

**② 断言扫描（两把扫；与预期一致，无新增受害者）**

- `F.asrProbe` 全仓代码引用 **3 处**：视图 aria（`:1560`）＋ `tests/unit/settings/functional-models.dom.test.tsx` ×2（`:2317` 助手 `probeDot()`、`:2439` 行内查询）。
- 受害者 **2 条**：「hangs the probe on the provider row for services only」（`:2432`）必改；「runs one real probe…」（`:2443`）经助手换名；拦保存两条（`:2464` 一带）不查按钮；「turns both role headings…」（`:1915`）与「keeps the dots disabled…」（`:1940`）按可访问名、无计数断言。
- slot 面：`asr-provider-control`／`asr-probe`／`asr-probe-dot` **测试零引用**（仅视图自用）。
- 界面词汇／e2e 面：`语音识别`／`图片描述` 在 `tests/` 零字面命中（用例都走 i18n 键）；`tests/e2e/` 无该区覆盖 ⇒ 无第三类受害者。

**③ 碰撞面（Task 2 已落地 ⇒ 已按新基线重扫）**

解析旋钮对 **Task 2（前端）已落地 `80fe8c01`**（11 文件，含视图＋i18n×3＋其主用例＋config-form/types）＋ **Task 3 `d231e430`**（9 文件，模板／chart／README／backend AGENTS／盘点档）。重扫结果：

- **锚点无漂移**：视频区行号未动（`groupMultimodal :1465`、`asr-provider-control :1503`、`asr-probe :1548`——其解析行加在后段 `groupServices` 一带）；
- **受害者清单不变**（见 ②）；
- **零撞名**：其新键为 `parse*` 族（`parseLanguage`／`parseModelVersion`＋两 Hint＋两 Default＝6 键，`parseBaseUrl`/Hint 改文案），与本案拟键（`captionRole`／`asrRole`／`legDotLocalEngine`／`legDotUntestedAsr`）不相交；
- 它未触碰 `tests/unit/settings/functional-models.dom.test.tsx`（本案主用例文件）。

⇒ **Task 1 前置门已开**；两侧用例互跑一次仍照 spec §5.2 执行。

**④ i18n 键面清点**

- 拟增 4 键落位：视频块文案区（`groupMultimodal` 一带，zh-CN 现 `:1775-1824`）。
- `asrProbe` 退场面：视图 ×1＋测试 ×2＋locales ×3（types／zh／en **各 1 处**）＝**6 处清到零**。
- 死键登记（不动）：`legDotOk`／`legDotUnreachable`／`legDotDimension`，**types／zh／en 各 3 处**（共 9），全仓零引用。

**遗留**：D3 标题用词待拍（拍前不影响 Task 1 的结构实现，只卡 i18n 值）；其余无。

---

## Task 1 — 实现（RED → GREEN → neuter → 门禁）

- [x] **RED（DOM 用例）**：① 两条角色标题在（`图片与视频描述` 非按钮、`语音识别` 是 button）；② ASR 标题＝探针，状态逐条（**引擎档含"服务字段有余值"**——禁用＝`!asrServiceApplies || !asrReady || asrProbing`，灰点＋`legDotLocalEngine`；未填齐禁用＋`legDotNeedsConfig`；就绪未测可点＋`legDotUntestedAsr`；探测中；结论绿／琥珀）；③ `提供商` 行内无按钮（`asr-provider-control` 退场）；④ 既有探针载荷断言原样（经 `probeDot()` 换名）、拦保存两条不动。
- [x] **GREEN**：视频区两条标题行（进 `<Rows>`；**标题贴身**——标题行加 `border-b-0` 抑制自己那条 `border-bottom`，spec D1）＋ ASR 标题接 `LegHeading`（状态映射与禁用兜底照 spec D2）＋ provider 行复位；i18n 三文件（＋4／−1）；`frontend/AGENTS.md` **两处**改写（探针句＋four-row block 句）。三处同批。
- [x] **neuter**：① 把 ASR 标题退回纯文字 ⇒ ② 红；② 把点搬回 provider 行 ⇒ ③ 红。逐项还原、记录受害者。
- [x] **门禁**：`pnpm check` 零诊断；窄面（`tests/unit/settings/functional-models.dom.test.tsx`）绿；**前端全量**（共享组件，后台执行，结果未回不报绿）。

**实测（2026-09-30，Task 1）**

**RED**：窄面 **8 failed／108 passed（116）**，失败即新增/改写的 8 条（`gives each role its own heading…`／`keeps the speech heading disabled with its own reason…`／`…engine row carries leftover service values`／`…until the service coordinates are complete`／`says what the untested heading will run…`／`paints the heading's dot by the verdict…`／`…amber for a report-only failure`／`runs one real probe on click…`）——旧界面没有角色标题，`probeHeading()` 全数找不到（`TestingLibraryElementError`）。
⚠️ **实施期发现（已就地修正）**：裸 `/语音识别/` 会先命中**分组的 ⓘ 按钮**（它的 aria-label＝组提示语，含「语音识别」四字）⇒ 助手锚定成 `^语音识别 ·`（`LegHeading` 的 aria 形状 `${label} · ${reason}`）；调试法＝在助手内 `queryAllByRole` 打印 `outerHTML`。

**GREEN**：窄面 **116 passed**。改动面＝视图（两条标题行、ASR 标题接 `LegHeading`、provider 行复位、新增 `asrHeadingStatus`／`asrHeadingReason` 两个局部量）／i18n 三文件（＋4／−1）／`frontend/AGENTS.md` 两处。

**neuter（逐项独立；改 → 跑 → 逐字还原）**：

| # | 还原的旧行为 | 受害者 |
| --- | --- | --- |
| ① | ASR 标题退回纯文字 | **8**：全部 `probeHeading` 系（找不到按钮） |
| ② | 点搬回 provider 行（重开 `asr-provider-control` ＋行内按钮） | **1**：位置钉（`asr-provider-control` 必须为 null） |

**门禁**：`pnpm check` 零诊断（先修一处 tsc：`probeHeading()` 未标类型参数 ⇒ `.disabled` 报 TS2339，已补 `<HTMLButtonElement>`）；窄面绿；**前端全量 247 文件／2757 例／0 失败**（3m35s，后台跑完）。

**格式复核（自订，非门禁的一部分）**：prettier 本会动我新写的两处（测试文件 `.toContain(` 的折行与 `setAsrProbe({...})` 的拆行），已按 prettier 输出就地重排；重核「我新增行 ∩ prettier 想改行」＝**0**（残余 want 全是 HEAD 上的旧债，与本件无关）。

**交付后调整（他观感裁定，2026-09-30）**：两条角色标题初版整行贴左（与 `提供商` 等字段标签同列），他判「没有层次、标题要和输入框对齐」⇒ 标题行改入 `ROW` 栅格（**占位列留空、标题落在输入框列**，照检索两列角色标题的既有形状；`max-md` 占位隐藏、标题回落整行）。窄面复跑绿、`pnpm check` 净；全量复跑 **247 文件／2757 例／0 失败**（3m24s）。

**二轮改判后重做（2026-09-30，他观感裁定：标题两轮皆否 ⇒ 主从行）**：视图＝撤两条标题/`LegHeading`/两个局部量，主行改名（先用他举例的 `ASR 模型`，后按甲案改「语音识别模型」）、三行明细加 `nested`、探针回原位；i18n＝初稿 4 键全撤（`asrProbe` 保留）、仅加 `asrModelRow`；用例＝删 7 条初稿用例、恢复「hangs the probe on the provider row for services only」、加 1 条新钉（标签＋嵌套）。
**未走独立 RED 轮**（观感改判直接重做，如实记）：新钉的牙由两条 neuter 证明——① 主行标签退回「提供商」⇒ 该用例红；② 三处 `nested` 撤掉 ⇒ 该用例红（均逐字还原、窄面复跑 **111 passed**）。`pnpm check` 净；全量复跑 **247 文件／2752 例／0 失败**（3m20s）。

**第三轮改判（2026-09-30，用户提案「暂时留着、不显示，只用保存兜底」并点头）：探针零入口休眠。** 用例先行（RED：服务档那条新钉 1 红——引擎档那条本来就绿、留作守卫），再摘视图：删探针按钮与 `flex` 包裹、`asrReady`／`asrProbing`／`asrProbeCurrentKey` 三个只为控件服务的局部量、视图 import 里的 `asrProbeKey`；**保留** `useProbeAsrService` 调用、`asrProbeVerdictFor`／`asrProbeBlocksSave`／`asrBlockReason`（保存区那道休眠门）与后端路由。用例＝删「runs one real probe on click…」、把「hangs the probe…」改成引擎档「无控件」钉、新增服务档「无控件」钉；拦保存两条原样（stub 注 verdict，钉休眠门语义）。窄面复跑 **111 passed**；`pnpm check` 净；全量复跑 **247 文件／2752 例／0 失败**（2m37s）。

**用词改判（2026-09-30，他裁甲）**：`asrModelRow` 的值由 `ASR 模型` 改为「**语音识别模型**」（en `Speech recognition model`）——他判先拟的「ASR 模型」不规范（那是照他举例直抄的）。只动两个 i18n 字面量；窄面复跑 **111 passed**；全量复跑 **247 文件／2752 例／0 失败**（2m53s）。

---

## Task 2 — 真浏览器复核 + 收官

- [x] **只读复核（真栈）**：结构就位（主行「语音识别模型」与「图片描述模型 (VLM)」同级；三行明细缩进＋竖线；无标题行；`leg-heading` 仅剩检索两腿）；引擎↔服务来回切——探针出现/消失、锁两态、**逐像素零位移**；hover/焦点 tooltip 文案；不点保存。
- [x] **收官（除提交）**：`frontend/AGENTS.md`（已按最终形态改写并复核）；`pnpm check` 净；窄面与全量复跑见上。
- [x] **提交（按届时授权）**：`77debea3`——一笔：视图／用例／i18n×3／`frontend/AGENTS.md` ＋本对 spec/plan。

**实测（2026-09-30，真栈只读；用户 :3000，页面驱动：深链 `?settings=models` → 切「功能模型」）**

**结构（`evaluate_script` 量取）**：五行标签 left/top ＝ `图片描述模型 (VLM)` **95**/1756、`语音识别模型` **95**/1833（**同级**）、`Model ID`／`API Key`／`接口地址` **106**/1910·1987·2064（**缩进 11px＋竖线**，`nested=true`）；`[data-slot="leg-heading"]`＝**2**（只剩检索两腿）；视频区无任何标题行。

**引擎↔服务来回切（funasr ⇄ dashscope，合成 pointerdown 开列表＋对聚焦条目发 Enter 选中）**：服务档 ⇒ `asr-locked` 2→0、探针出现（`data-state=untested`、`disabled=true`、aria 与 tooltip＝「请先填写提供商 / Model / 地址 / 钥匙」）；切回引擎档 ⇒ 探针消失、锁回 2。**三态之间五行标签的 left/top 逐像素相同（零位移）**。

**探针真发未复跑（如实记）**：该部署 `sources.asr_api_key === "unset"`（未配 ASR 钥匙、无 env 兜底）⇒ 补上地址后按钮仍按规则禁用＋给理由（**正确行为**）；真发路径与 2026-09-28 逐字同码，其真机证据（真 key `ok`／假 key `unreachable`）见那一轮的 Task 4。

**收尾**：切回 funasr 后 `navigate_page` 重载——表单脏状态复原（`funasr（本地）`／地址空／锁 2／探针无；未点保存）。

> ⚠ **第三轮改判后作废半句**：上面「引擎↔服务来回切」里的**探针出现/消失与 tooltip 两条随零入口休眠作废**（没有控件可验）；结构/同级/缩进/零位移与锁两态仍然有效。

**改后复跑（2026-09-30，第三轮落地后；合成事件开到服务档用全套 pointer 序列＋Enter 选中）**：引擎档——结构同前（`95/95/106`；行距恒 **77px**）、`asr-probe` 与 `asr-provider-control` **均 null**；切到 dashscope——`asr-locked` 2→0、**探针仍 null**、三行缩进与行距不变（top 随页面滚动变、**行距 77px 逐行相同**）⇒「两种模式都没有探针控件」在真栈成立。收尾重载复原、离页。
