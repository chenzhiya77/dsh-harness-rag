# 面板 ② 档 · 文档列体系＋白名单兜底 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-16-doc-columns-spec.md](../specs/2026-10-16-doc-columns-spec.md)（范围＋D1–D2＋验收）
**Status:** ✅ 收官（2026-10-16 他令「都做」＋「都按你的推荐来」）——**D1＝甲／D2＝甲（10-16 拍定；D1 窄档口径 10-16 复测改判见 spec §2）**；**Task 0–5 全落**（实现＋门禁过＋截图对照修订＋五轮复测修订〔第五轮他评「过了」〕＋真跑〔坏后缀拦截，Task 4〕过＋收口〔门禁终跑 64 绿＋T3 审计节补销〕）；定稿一笔已落（10-16 他令「定稿一笔提交」——`client.js`＋本对 spec/plan＋T3 plan 补销＋步骤记录同笔）；全部未推（仓暂无 remote）。
**Parent:** ②档批（10-16 他令「都做」；档位表见会话）× bk-smalls spec §7 挂账行转正；前对＝小件批（[2026-10-15-bk-smalls-plan.md](2026-10-15-bk-smalls-plan.md)，已收官）。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** 两件全在文档面（`client.js` 文档段）：**列体系**＝表头行（列/偏好/控件）＋行渲染列位＋「列」总控（照 `use-doc-table-prefs` 口径、代码不搬；与小件批工具栏搜索＋排序并位）；**白名单兜底**＝上传前置拦截的常量兜底（照 `supported-formats`）。host 半预期零改。

**硬约束（spec 已定，不许自行放松）**：

- **照工作台**（承 T3）：逐件以工作台对应件为底本；形态创新一律登记。
- **D 决定**：D1（列体系形态）＝甲／D2（白名单兜底）＝甲——已拍（2026-10-16），Task 1/4 解锁。
- **数据缝（承 T3）**：零新 op 为预期；Task 0 逐件核实（上传者字段面、偏好持久化位、未取白名单路径）；缺→停下待裁。
- **桌面端铁律**：改 `client.js` 验收须整重启（模块代体检法）。
- **scope fence（本对不做）**：②档其余四面（视频镜头条＋播放器／渲染切换／切片编辑重抽／卡片管理面）＝后续各对候立；③档其余项（F·G·H）维持挂账（**「行菜单双入口」经 10-16 复测令转正入本对 Task 3.5**；**「批量版」经 10-16 第三令「按甲」转正入本对 Task 3.6**）。

**Global Constraints:**

- 分支：插件仓（dsh-harness-rag）；每 Task 落地随手提交（英文 Conventional）；deer-flow 零代码。
- **每 Task 的 `**实测**` 行必须回填**（探针输出/真跑结论/提交哈希）。
- **插件侧验证**（同 A 对口径，有意不做单测）：`node --check`＋冒烟回归（仓外 `client-load-check.mjs`）＋桌面端整重启真跑。
- 宿主件优先：新控件/菜单若能直用宿主 `primitives` 则直用（照菜单对 Task 6 口径）。

**依赖顺序**：Task 0（只读核实）→ Task 1（列体系骨架：表头＋列位）→ Task 2（列偏好＋持久化）→ Task 3（表头控件：「列」总控＋右键）→ Task 4（白名单兜底微件）→ Task 5 收口（门禁＋销定＋提交链）。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点（工作台参照件行锚＋数据缝）＋ D1–D2 判据。

- [x] ① **工作台列体系实读**：`use-doc-table-prefs.ts`（列集合/默认显隐/时间绝对相对/KB·MB/「全部显示」语义/持久化键结构与 per-kb 口径）；文档表组件（表头 chevron 语义——是否兼排序；表头右键项集；「列」总控菜单项集）。
- [x] ② **插件面现状**：文档段结构（工具栏 h-11＋行渲染）实读；清单行字段核对（上传者字段有无；`created_at`/`size_bytes`/`chunk_count` 已在）；现行列信息位与窄档形态。
- [x] ③ **偏好持久化先例**：插件 localStorage 键族（库序 `deerflow.knowledge.kb-order.v1` 同款）核对；per-kb 键命名口径。
- [x] ④ **白名单兜底**：工作台 `supported-formats.ts:7-27` 的 `FALLBACK_SUPPORTED_SUFFIXES` 全表实读；插件「未取白名单」现行路径（`supportedFormats` 空返→放行）实读。
- [x] ⑤ **D 判据与落点回填**：D1 窄档可行性（物理不可达即停下待裁）；D2 移植成本；spec §3 行锚逐条回填。

**实测**（Task 0，2026-10-16，五格全核；零「停下待裁」）：
- ① 列序＝复选框｜名（钉死不可隐）｜状态｜上传者｜时间｜大小｜切片数｜尾窄列；`HIDEABLE_COLUMNS=[status, uploader, createdAt, size, chunks]`；默认 `{hidden:[], timeFormat:'absolute', sizeUnit:'kb'}`；时间格式（绝对↔相对）/大小单位（KB↔MB）＝列级档；「全部显示」＝`resetColumns`（仅清 hidden，格式/单位不动）；persist＝`deerflow.knowledge.doc-table-prefs.{kbId}.v1`（sanitize 守卫＋try/catch 永不崩）。表头 chevron＝列级菜单（format/unit/隐藏列，**不含排序**）；表头右键＋「列」总控＝同项集（勾选×5＋全部显示）；排序＝工具栏独立下拉。窄档＝横向滚动（`min-w-[34rem]`＋吸顶 `sticky` th），不折叠列。行锚：`document-panel.tsx:180/788/866/990-1041`；横滚 `:728-778`。
- ② docbar（搜索＋清空＋排序菜单）／docsum／两行卡行（main＝badge 20px＋名＋行内三钮〔下载/重试/删除〕；meta＝状态＋切片数）；无表头行、无上传者/时间/大小列、无列偏好。清单行＝host 透传（`kb_proxy.ts:67`）＝后端全行（`store._row_to_dict`）⇒ `uploader_id`/`created_at`/`size_bytes`/`chunk_count` 全在；`kb.owner_id` 在 listKbs 行（「我」判据可照）⇒ **零新 op**。
- ③ 插件 localStorage 仅两键——`hrag-last-kb`（client.js:1370）／`hrag-kb-order`（:1387），模式＝常量键＋read/write 函数＋try/catch；per-kb 键无先例 ⇒ 新族 `hrag-doc-table-prefs.{kbId}`（Task 2 定名）。
- ④ 工作台常量＝15 后缀（`supported-formats.ts`，端点真源、常量兜底）；插件未取路径＝初值 null＋catch 空返两窗——上传拦截（:13813）空⇒放行、accept（:14170）空⇒不设、probe（:13944）空⇒全拒降灰（三处现自相矛盾）。D2 甲成本＝＋15 常量＋三消费点改持常量。
- ⑤ D1 甲＝物理可达（窄档照工作台横滚口径）⇒ 无「停下待裁」；D2 甲＝窗口真实但窄（审计已认）。行内三钮在表形态下的列位（名格内保留 vs 尾列 ⋯）＝Task 1 设计点（工作台为尾列 ⋯；③档「行菜单双入口」挂账不动，本对不并）。

---

## Task 1 — 列体系骨架（表头＋列位）

> 动到的文件：`client.js`（文档段；界面文案落内联 zh/en 字典）。
> **验收对应**：spec §1-1＋§4-1（表头/列位条）。

- [x] **表头行**：照工作台列集合与列序（名〔钉死〕/状态/上传者/时间/大小/切片数——Task 0 实核）；窄档＝横向滚动（`min-w` 底盘＋吸顶表头，照工作台）；
- [x] **行渲染列位**：现行列信息按列位归位（时间/大小先取工作台默认格式档）；
- [ ] **门禁**：`node --check`＋冒烟（渲染用例）＋整重启真跑。

**实测**（Task 1，2026-10-16，实现＋门禁；真跑候批）：
- **落点**：`client.js` 文档段——表头行六列（序照 `document-panel.tsx:804-861`）；吸顶表头（`th` sticky 于滚动区，`.hrag-docscroll`＝滚动容器，横滚 `min-w 544px`）；行位归位（badge＋名＋行内三钮入名格＝Task 0 设计点「保留名格」；状态/上传者/时间/大小/切片数各列）；行点击/右键照旧挂整行；文本键 `doc.th*`×6＋`doc.uploaderMe` 双语落内联字典；`kbOwnerId` 由壳注入（`currentKb.owner_id`）。
- **随件清理**：旧卡行类（`hrag-docrow-main/-meta/-chunks`）清零；`doc.chunksUnit` 键消费点清零随删；`.hrag-docs` 类保留（切片抽屉列表复用，核实时误挂连带，已复原）。
- **门禁**：`node --check` 过；全量冒烟 **63 PASS 全绿**（新增两段：表骨架＝表头逐字＋上传者「我」/外部原样＋KB 尺寸＋时间带年份＋切片数纯数字/`—`；格式纯函数＝KB 0/进位/取整＋时间可解析/原样）。既有工具栏用例判据随身改（`stub-tooltip` 哨兵被尺寸列 Tooltip 污染 ⇒ 改状态列专属嵌套特征）。
- **10-16 他截图对照修订**（他令「缺了不少样式，仔细排查，一个一个的对照」——图1＝插件、图2＝工作台）：**主缺陷**＝`.hrag-docnamecol { width: 100% }` 在 auto 表布局下让名称列吃满整表宽、其余五列被挤出视口（只剩名称列＋底部横滚条）⇒ 删该类及双挂点（th/td）；首末列 2px 特例同删（照工作台 px-2 口径）。**对照收编四项**：①行去分隔线——工作台结构线只留表头/统计行两条（像素核：图2 整表仅 y=242 表头线一条；图1 有 4 条行线）⇒ 分隔改留白＋悬停底色（`--dsw-alias-interactive-bg-hover`）；②状态列补工作台同款悬挂圆点（6px、文字左缘外 10px〔点 6px＋间隙 4px〕、四色族＝tertiary/60 混·amber-500·green-500/45 混·error）；③顶部「就绪 N」汇总行撤除，改挂工作台同款底栏统计行＝**B3 审计在册变形收编**（左「文档 N · 切片 N · 总量」可缩省略号、右端仅可动/失败计数彩点、就绪为静默默认；空态同挂 `文档 0 · 切片 0 · 0 B`）；④表头高 h-9（36px，照工作台）。**归类不动**：排序图标（宿主 ⇅＝控件件已裁维持）／行内三钮（③档「行菜单双入口」登记）／复选框列（③档批量版登记）／相对时间·列显隐·KB·MB（Task 2 偏好；工作台默认亦绝对/KB——图2 相对是该库已切档）／视频时长徽章（工作台专有数据，插件清单未核）。
- **门禁（修订后复跑）**：`node --check` 过；全量冒烟 **63 PASS 全绿**（表骨架用例扩：统计行文案「文档 2 · 切片 12 · 2.1 KB」＋就绪/在飞/失败三点断言＋alert 组显隐＋docsum/docnamecol 清零；Styles 用例扩：hover·点族·统计行在，行线·namecol·docsum 不在；格式纯函数扩 `docFmtBytes`×4＋`docStats` 混合计数）。
- **真跑（桌面整重启）候批。**

---

## Task 2 — 列偏好＋持久化

> 动到的文件：`client.js`（文档段偏好面）。
> **验收对应**：spec §1-1＋§4-1（偏好条）。

- [x] **偏好面**：列显隐／时间绝对相对／KB·MB／「全部显示」（口径照 `use-doc-table-prefs`）；
- [x] **持久化**：per-kb localStorage（键＝`hrag-doc-table-prefs.{kbId}`——插件 `hrag-` 键族照先例；重开保持；脏数据回退默认）；
- [x] **门禁**：`node --check`＋冒烟（偏好纯函数用例）＋整重启真跑。

**实测**（Task 2，2026-10-16，实现＋门禁；真跑候批）：
- **落点**：`client.js` 文档段——`DOC_PREFS_KEY_PREFIX='hrag-doc-table-prefs.'`＋`docPrefsSanitize/readDocPrefs/writeDocPrefs`（照工作台 hook：kbIdRef 锁最新库防切库 race；脏数据/缺失回退默认）；列显隐＝表头/单元格双端同谓词；时间相对＝`docFmtRelative`（Intl.RelativeTimeFormat numeric auto＋亚分钟「刚刚」硬编码）；大小 MB＝`docFmtMb`（≥0.1 一位小数、以下两位）；「全部显示」＝仅清 hidden。
- **门禁**：`node --check` 过；冒烟全绿（sanitize 三例＋相对时间三例〔node 侧 lang=en-US：just now/N days ago/N months ago〕＋MB 三例＋偏好注入渲染：隐藏列表头/单元格双消失、相对式不落年份、MB 后缀）。
- **真跑候批。**

---

## Task 3 — 表头控件（「列」总控＋表头右键）

> 动到的文件：`client.js`（文档段表头）。
> **验收对应**：spec §1-1＋§4-1（控件条）。

- [x] **「列」总控入口**＋**表头右键菜单**（项集照 Task 0 实核；宿主 `Menu` 直用）；
- [x] **表头 chevron**：列级菜单（createdAt＝时间格式档／size＝单位档／全列＝隐藏列项——Task 0 实核：**不含排序**，排序维持工具栏）；
- [x] **门禁**：`node --check`＋冒烟（菜单项/切换用例）＋整重启真跑。

**实测**（Task 3，2026-10-16，实现＋门禁；真跑候批）：
- **落点**：可隐列 th＝「列名＋chevron（悬停淡入）」挂 `DshMenu`；菜单＝〔时间格式档（绝对/相对）｜单位档（KB/MB）〕＋隐藏列；行尾窄列（w-10）表头＝「列」总控（悬停淡入；菜单＝列清单勾选（勾＝可见）＋全部显示）；表头行右键＝指针位同项集（复用 DocContextMenu 指针锚，照工作台表头右键）；文案照工作台 `table.*` 逐字（列选项/隐藏列/列/全部显示/时间格式/绝对/相对/单位）。
- **门禁**：`node --check` 过；冒烟全绿（chevron×5＋「列」总控件＋菜单项装配：五勾选〔隐藏列无勾〕＋全部显示殿后）。
- **真跑候批。**

---

## Task 3.5 — 复测修订（10-16 第二轮：行菜单转正＋列宽自适应）

> 动到的文件：`client.js`（文档段）＋内联字典（行菜单文案）。
> **验收对应**：spec §2 D1（窄档改判）＋§6（③档「行菜单双入口」随令转正）。
> 来源：10-16 他复测令——「删除和下载按钮应该在右键或者三点菜单中」「列还是没有显示完整，放大时才能显示完全」「还缺少很多的设置」（三条→③档转正／列宽收口／Task 2＋3 全落）。

- [x] **行菜单双入口（③档转正）**：行内三钮撤除——行尾 ⋯（悬停淡入，照工作台）＋整行右键＝同项集：查看切片/下载原文（照工作台 `openChunks`/`downloadDocument` 逐字）/生成考题〔插件自有，仍按就绪门槛〕/重试〔failed 或降级〕/删除（危险殿后）；aria「更多操作」照工作台。
- [x] **列宽自适应**：auto 布局真浏览器实测不截断（名列表 min-content＝全文——表面 738 溢出 570 面板 168px，即「列显示不全」根因）⇒ `table-layout: fixed`＋表头定宽（状态 80／上传者 56／时间 124／大小 78／切片数 60／ops 40；名称列 auto 吃余宽、超宽省略号；`min-width: 520px` 仅超窄兜底横滚）；状态文本省略号承载（悬挂点在外，不受文本裁剪面影响）。
- [x] **门禁**：`node --check`＋冒烟（渲染/样式/菜单项/旧断言改写）＋真浏览器几何实测。

**实测**（Task 3.5，2026-10-16，实现＋门禁；真跑候批）：
- **真浏览器几何探针**（`file://` 探针＝照真实 CSS 值与各列最长字面；后升级为 SSR 真产物 dump 量）：573 面板＝表宽即容器、零横滚、名称列吃余宽（长名省略号）；999＝名称列吃满、其余列照定宽；456＝表 520 触发兜底横滚。auto 布局对照：738／570（溢出 168）——工作台自身以 `min-w 34rem` 恒横滚回避窄档，本面板宽度不适用（改判见 spec §2 D1）。
- **10-16 复测二次修正**（他报「名称列太短／其他列偏长／名称列遮挡状态点」）：①**遮挡根因**＝上一轮给 `.hrag-doccell` 加的 `overflow: hidden`（省略号载体）把悬挂点左缘裁掉 2px（点跨出单元格内边 2px，`overflow` 裁剪面＝padding box）⇒ 状态格单开 `.hrag-doccell-status { overflow: visible }`（文本省略号由内层 `.hrag-docrow-statustext` 自持，不依赖格级裁剪）；②**配平**＝时间列随格式档双值（相对 88／绝对 124）＋上传者 52／大小 74／切片数 56（各收 4-6px 让给名称列）⇒ 573 面板名称列 147px（默认绝对档）／183px（相对档）。真浏览器复测：573 零溢出、点 6px 全宽（跨格悬挂 2px 不裁、`overflow: visible` 实核）、999 名称列吃满。
- **冒烟**：全绿（行 ⋯＋chevron×5＋「列」总控件；行菜单项装配＝failed 行五件序、ready 行三件；偏好注入渲染＋相对档收窄时间列断言；行内下载/删除按钮撤销断言；Styles 增 fixed/定宽/statustext/`doccell-status` 在、min-w 544 不在）。
- **真跑候批。**

---

## Task 3.6 — 批量版收编（10-16 第三令「按甲」）

> 动到的文件：`client.js`（文档段表头/行/右键菜单/删除流）＋内联字典（全选/已选 N/取消选择/删除所选/生成考题（联合））。
> **验收对应**：spec §6（③档「批量版」随令转正）。
> 来源：10-16 他问「插件中是不是没有当前项目的多选框」→ 答（B1 d 条＝已裁不做；三选项）→ 他令「按甲方案来」＝照工作台补批量版。

- [x] **复选框列**：表头 w-8 列全选（含缩进半选）＋行 checkbox（悬停/勾选/有选中项显形）＋选中行底色；选择模型照工作台（检索即清/右键即选中/选择集随清单修剪〔插件自刷现实〕）；
- [x] **右键两态菜单**：批量态（选中>1）＝已选 N 标签／生成考题（联合）〔全就绪才亮〕／取消选择／分隔／删除所选；单行态＝⋯ 项＋生成考题＋取消选择＋分隔／删除所选；**⋯ 去生成考题**（工作台该入口只在右键选择态菜单）；
- [x] **批量删除**：`deleteTargets` 列表语义（照工作台）；allSettled 逐删、部分失败弹层收窄为失败集；
- [x] **门禁**：`node --check`＋冒烟（选择集注入渲染/两态菜单项/样式）＋真浏览器几何＋真链路选择器验证。

**实测**（Task 3.6，2026-10-16，实现＋门禁；真跑候批）：
- **落点**：`client.js` 文档段——表头首列 `.hrag-docth-check`（32px）全选 checkbox（`indeterminate` 经 ref 置位）＋行首 checkbox（13px `.hrag-ev-check`，照 wk 选择面先例；宿主 primitives 有 Checkbox 件但为「checkbox＋常显 label」的表单件，表格格位不适用，故随面板既有两处选择面统一原生控件）；选中行 `.hrag-docrow-selected`、表 `.hrag-doctable-selecting`。选择模型照工作台逐条：全选/缩进随可见集（过滤＋排序）、**检索即清选择集**（工作台 updateQuery 语义）、**右键即选中**（未选中行改单选它）、**选择集随清单修剪**（工作台只在删除后移除；插件 3s 自刷——被他处删除的行不留在「已选 N」）；`min-width 520→552`（＋复选框列 32）。
- **菜单分流（照工作台）**：行 ⋯＝行内动作（查看切片/下载原文/重试/删除——**生成考题挪出**，工作台 ⋯ 无此件）；整行右键＝选择态菜单两态：批量态＝已选 N 标签／生成考题（联合）〔`allSelectedReady` 门槛：选中集全就绪——任一篇未就绪后端整批 409〕／取消选择／分隔／删除所选；单行态＝⋯ 项＋生成考题〔就绪〕＋取消选择＋分隔／删除所选（措辞随选择态改「删除所选」）。批量出题＝`triggerSynthesis { doc_ids: [...selectedIds], count: 1 }`（工作台选中集联合一条同款）。
- **删除流**：`deleteTarget` → `deleteTargets` 列表（照工作台）；`Promise.allSettled` 逐删——成功项出选择集、刷新清单；部分失败弹层收窄为失败集（重按只重试失败项）。
- **门禁**：`node --check` 过；冒烟 **63 PASS 全绿**（新增：选择集注入渲染＝表头全选＋两行 checkbox＋选中底色＋checked 计数两态；菜单装配＝⋯ 四件序（gen 撤出）＋右键单行五件序＋批量三件序＋批量标签「已选 3 项」＋未全就绪无联合项；Styles＝复选框列/显形族/选择底/552）。
- **真浏览器（SSR dump）**：573 零溢出、列宽 [32,115,80,52,124,74,56,40]、min-w 552、fixed；行 checkbox 13px 默认 opacity 0、表头 13px 常显；四态选择器真链路实核（idle 0→checked 1→uncheck 0→selecting 1；`.hrag-docrow-selected` 底色随 token 解析；aria「全选」「选择文档: 名」）。
- **10-16 第四轮复测修订**（他真跑报两件：「表头的选框有点没有和表头对齐」＋「上方的搜索框，看起来不融洽，左右都有大的空的地方」）：①**对齐**——th 内容居中而输入框默认基线锚（底贴基线）⇒ 表头选框中心比「名称」文字视觉中心高 2.2px（行内同机只偏 0.5px——th line-height 18 与 td 20 之差）⇒ `.hrag-docth-check .hrag-ev-check { vertical-align: middle }`；②**同轴**——像素复测（他截图按 1.5 缩放还原）：面板内容轴 ≈24px（壳内缩），检索框左缘 39px（＝轴＋docbar 16 内衬）⇒ 框比表格窄一圈、左右各一条 ~40px 空带 ⇒ docbar 横向内衬 16→0、统计行 `8px 16px`→`8px 0`——工具栏/表格/统计行三处同左轴。真链路复测：表头差 **−2.17→+1.09px**（行内 −0.5 不动）、四者左缘全 0.7 同轴；冒烟三断言随增（全绿）。
- **10-16 第五轮复测修订**（他真跑报两件：「名称以及文档是不是离框有点远呀」＋「图中的下状态栏是不是有点高了，不太融洽」）：①**名称列收紧**——复选列照工作台 w-8=32 但本插件框为 13px（工作台 16px，w-8 恰好零余量），32 会多攒一格余量：框右缘→徽章 19px、名称文字距面板左缘 80.67px（真浏览器基线实测）⇒ 列宽 **32→24**（8+13+3）：间距 **19→11px**（≈一枚框宽）、名称文字 **80.67→72.67px**（表内 68→60）；表头「名称」随列同移、文本距表左 32 与徽章同轴（Range 实测）；名称列有效宽 +8px（截断更晚）。②**统计行**——行高 34（8+18+8）＋壳层 12px 下衬在行底下留空带（截图量得统计底→面板底 12.67px）⇒ line-height 18→16（＝工作台 text-xs 口径 12/16，行高 **34→32**）＋ `.hrag-docsbody { margin-bottom: -12px }` 抵消壳层下衬（统计行＝面板收尾行，底缘贴面板底缘，**贴底距 12.67→0.67px**）。改后真浏览器复测：行高 40／表头 36／统计 32、间距 11、名称文字距面板左 72.67，全部落位。③**dump 保真修复（顺带）**：宿主图标 `svg[data-icon]` 尺寸在宿主基础 CSS 层（dump 无此层）⇒ 裸 svg 落 UA 默认 300×150 把行撑到 107px（历史 dump 只量横向未暴露）⇒ dump 页内补 `svg[data-icon]{width:16px;height:16px}`，行高回 40 真值。④冒烟：宽断言随改（24px）＋新增三条（stats line-height 16／docsbody margin-bottom −12／选区三态不动），全绿。
- **真跑候批。**

---

## Task 4 — 白名单兜底（微件）

> 动到的文件：`client.js`（上传前置拦截）。
> **验收对应**：spec §1-2＋§4-1（兜底条）。

- [x] **兜底常量**：`FALLBACK_SUPPORTED_SUFFIXES`（15）照搬；三消费点（上传拦截/accept/probe）未取白名单一律改持常量（照 D2＝甲）；
- [x] **门禁**：`node --check`＋冒烟（判型兜底用例）＋整重启真跑（未取白名单路径按 Task 0 核实的可达性）。

**实测**（Task 4，2026-10-16，实现＋门禁＋真跑通过）：
- **落点**：模块层 `FALLBACK_SUPPORTED_SUFFIXES`（15 项点号形式，照工作台 `supported-formats.ts` 逐条）＋ `supportedSuffixesFor(fetched)`（`Array.isArray(fetched) && fetched.length > 0 ? fetched : FALLBACK`——照工作台 `page.tsx: data?.suffixes ?? FALLBACK_SUPPORTED_SUFFIXES` 的源头兜底口径，未载/取失败两窗同回退）；壳内派生 `const supportedSuffixes = supportedSuffixesFor(acceptedSuffixes)`，三消费点改持派生值：上传前置拦截（`allowed` 集合自 `supportedSuffixes` 构建、else 全放行支删除）、`accept: supportedSuffixes.join(',')`（不再 undefined）、`probeDraggedItems(…, supportedSuffixes)`（不再 `|| []` 全拒降灰）——原「空⇒放行／不设／全拒」三处分歧作废（D2＝甲：未取白名单＝仍拦）。
- **门禁**：`node --check` 过；冒烟 **64 PASS 全绿**（新增 Task 4 块：15 条逐字 `deepEqual` 对照＋派生三例〔null→常量／[]→常量／已取非空原样〕＋源码钉三枚〔旧式 `acceptedSuffixes && length>0` 计数归零＋派生行＋probe/accept 行〕）；**neuter**＝accept 行临时还原旧式 ⇒ 冒烟恰红（「the three contradictory empty-paths are gone」），还原后复绿。
- **真跑（2026-10-16 晚，通过）**：路径＝面板 ⋯ 菜单→「上传文档」→原生「打开」对话框（文件名框键入全路径回车，绕过 accept 筛选）→坏后缀 `t4-bad-probe.xyz`；结果＝**UI 警报「已跳过不支持的文件：t4-bad-probe.xyz」**（UIA 树 `警报→文本` 逐字捕获，元素 182/183）＋统计行仍「文档 5 · 切片 28 · 5.0 MB」零入队；视觉佐证＝他截图（toast 深色气泡在面板顶、文案逐字）。证据文件 `E:\appdevelop\hrag-probe\t4-acceptance\uia-evidence.txt`（外两仓）。附带实证：native 对话框「文件类型」筛选项显示**已取白名单全表**（含 `*.mkv;*.mov;*.mp4;*.webm`…——accept 属性在真机携带真源，非兜底常量，正常路口径 ✓）。未取两窗（null 初值＝加载前瞬态／catch 空返＝op 失败）按 Task 0 核实「触发窗口极窄」、不可自然触发——以冒烟三例＋源码钉坐实；正常路取到列表时派生值＝原引用、行为逐字不变。**口径注**：本次面板所载为早先 client 半，最新（第五轮视觉＋Task 4 代码）需面板重开一次载入——坏后缀守卫两版逻辑逐字相同，本次结论对当前代码成立。

---

## Task 5 — 收口（门禁汇总＋销定＋提交链）

> 动到的文件：本对两件（spec/plan）＋T3 plan（审计节补销）＋步骤记录。
> **验收对应**：spec §4-3／§4-4。

- [x] **门禁汇总**：`node --check`＋冒烟全量绿＋各 Task 真跑结论齐；
- [x] **销定**：T3 plan 审计节 B1c/B4/B3 统计行/B1②（行菜单双入口·随复测转正）/B1d（批量版·随第三令转正）行补销（「已实施（10-16，doc-columns 对）」）；步骤记录同步；
- [x] **提交链**：定稿一笔（英文 Conventional）——见下「提交链（滚动记实）」节。

**实测**（Task 5，2026-10-16，门禁＋销定＋提交链全办）：
- **门禁（终跑）**：`node --check` 过；全量冒烟 **64 PASS 全绿**（含 Task 4 块＝15 条逐字＋派生三例＋源码钉四枚）；各 Task 真跑结论齐——Task 4 真跑过（坏后缀拦截，UIA 证据 `E:\appdevelop\hrag-probe\t4-acceptance\uia-evidence.txt`）；第五轮复测他评「过了」（视觉收口）。
- **销定（已办）**：T3 plan 审计节补销 **14 处**落地——**已计划 7**（B1②行菜单双入口·Task 3.5／c 列体系·Task 1/2/3／d 批量版·Task 3.6、B3 统计行·Task 1＋第五轮、B4 白名单·Task 4、随销 `formatBytes/Kb/Mb`·Task 2＋`use-doc-table-prefs.ts`·Task 2/3）＋**顺带核补 7**（B1①表格列子集、B1③原始串〔⑤〕、B1④ path_status、B1f 行菜单候选、B3 `document-view.ts`〔a/b〕、B3 `doc-errors.ts`〔⑤〕、C1②刻度轨〔⑫〕——均系前对已落未标，10-16 实核补齐）；步骤记录已同步。
- **提交链**：定稿一笔已落（10-16 他令）——`feat(panel): add the doc table columns and the whitelist fallback`（`client.js`＋本对 spec/plan＋T3 plan 补销＋步骤记录同笔）。**全部未推**（仓暂无 remote）。

---

## 提交链（滚动记实）

- [x] **定稿一笔**：`feat(panel): add the doc table columns and the whitelist fallback`（10-16 他令「定稿一笔提交」；内容＝`client.js`＋本对 spec/plan〔新增〕＋T3 plan〔补销〕＋步骤记录同步）。**全部未推**（仓暂无 remote；前笔 tip＝`2e0be3d`）。
