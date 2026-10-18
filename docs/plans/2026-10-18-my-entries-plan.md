# 面板 ② 档 · 丙＝我的条目管理面 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-18-my-entries-spec.md](../specs/2026-10-18-my-entries-spec.md)（范围＋D1/D2＋验收）
**Status:** 🟢 开跑（2026-10-18 他令「D2：甲，按此推进」）——**D1＝甲／D2＝甲（已拍）**；**Task 0–5.5 全毕**（冒烟默认/hostless 各 **73 PASS**；E3 条目编辑并入）；**Task 6 全绿**（probe 13/13＋真栈 CRUD 6/6＋检索生命周期 3/3＋销定＋10-18 他手验真跑全过）；10-18 第二轮真跑两修已落（右缘子菜单翻转／列表横向滚动条）＋他问「生成条目是否紧凑」后行几何照工作台收口（40/14/8）＋生成条目 ⋯ 菜单补图标＋两容器头部同轴对齐＋收起箭头换工作台同款 lucide chevron（展开下/收起右），**10-18 已提交**。
**Parent:** ②档批（10-16 他令「都做」；档位表见会话）× 乙对 chunk-items 收官（`a90db41`）。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** host 半 `src/kb_proxy.ts` 补 JSON 四 op（卡片 CRUD 三枚＋`updateWikiEntry`）；client 半把 `WikiView` 卡片区从只读行升级为模块级 `ManualCardsSection`（自持选择/标签/编辑/删除状态）＋`useCardDrawers`（localStorage 分区，照工作台模型）＋面板内表单弹层；生成条目区批量条退役、右键两态接管；E3 条目编辑并入（主内容＋补充层双栏）；阅读抽屉加归属图标/徽章。卡片数据零新字段、后端零改动；deer-flow 零改动。

**硬约束（spec 已定，不许自行放松）**：

- **照工作台**（承 T3）：文案逐字（仅 spec §3 登记的 Markdown 括注改写）、形态逐件；其余创新一律登记（spec §6）。
- **D 决定**：D1＝甲（范围全做）；D2＝甲（无批量条，批量走右键菜单）。
- **弹层恒在面板内**：自绘 `.hrag-overlay/.hrag-dialog`；宿主 `Modal` 是 document.body portal，不采用。
- **分组＝localStorage**：键 `deerflow.knowledge.card-drawers.{kbId}.v1`；零后端、零 tags 污染。
- **删除＝逐张 DELETE**：无批量端点；`Promise.allSettled`，部分失败 toast error。
- **切标签清选择**：有意偏离工作台（工作台跨抽屉残留选中集会误删），spec §6 已登记。
- **桌面端铁律**：改 `client.js` 验收须整重启（模块代体检法）；host 半改动整重启。
- **scope fence（本对不做）**：卡片正文 Markdown；>200 分页器；拖拽排序；行内常驻混搜 Switch。**10-18 他令追加**：生成条目区批量条退役、改右键两态（选择状态保留）；**E3 条目编辑并入**（原 fence 解除，独立 Task 5.5）。

**Global Constraints:**

- 分支：插件仓（dsh-harness-rag）；deer-flow 零代码。
- **不逐 Task 提交**（spec/账纪律：改动留工作区，定稿/他令一笔）；每 Task 门禁照跑。
- **每 Task 的 `**实测**` 行必须回填**（探针输出/冒烟结论/真跑结论/提交哈希）。
- **插件侧验证**（同前两对口径）：`node --check`＋冒烟回归（仓外 `client-load-check.mjs`，默认＋`SMOKE_HOSTLESS=1` 两跑）＋桌面端整重启真跑。
- 宿主件优先：`Switch`／`Menu` 直用有件；选择框沿用页内 `hrag-ev-check`（页词汇）；缺件回退护栏照旧。上下文菜单宿主根 span 必须移出文档流（flex gap 抖动，10-18 真跑实证）。

**依赖顺序**：Task 0（只读，已毕）→ Task 1（host 三 op，可与 Task 2 并行）→ Task 2（存储＋纯函数＋图标）→ Task 3（卡片 CRUD＋列表交互）→ Task 4（抽屉体系＋头部）→ Task 5（阅读抽屉归属＋文案/样式收口）→ Task 5.5（条目编辑 E3，他令追加）→ Task 6 收口。

---

## Task 0 — 落点核实（只读；已毕）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点＋ D1/D2 判据。

- [x] ① **工作台逻辑全核**：编辑器（:108-209）、头部（:618-822）、行＋右键两态（:854-1290）、保存/开关/删除（:522-576）、抽屉操作（:578-600）、当前标签过滤（:450-473）、选择（:475-515）、删除确认（:1351-1376）、抽屉编辑器（:1330-1347）；发现工作台切标签不清选中集（跨抽屉批量残留）——不照抄，登记 spec §6。
- [x] ② **宿主件签名**（asar 实读）：`Switch{checked,onChange(!checked),label,disabled,title,className}`；`Checkbox{checked,onChange(checked),label,...}`；`Modal` portal 到 `document.body`（不采用）；`Menu` items 支持 `icon/label/danger/shortcut/submenu/type:'label'|'separator'`，子菜单项也走 `onSelect(sub.id)`。
- [x] ③ **插件现状**：卡片区 :12396-12455（只读 button）；阅读抽屉 :12818-12925（固定便签图标）；行/复选框词汇 :1846-1872；表单词汇 :2328-2332；`DocContextMenu` :7376；`DshMenu` :8886；`ConfirmDialog` :2592；locale `wk.*` zh :512+／en :1232+；host 代理 :214-222；后端 :622-688／service :963-1109。
- [x] ④ **后端语义**：create 仅在混搜 on 时 embed→upsert→DB；PATCH 显式 on 或文本变更且 on→重嵌，off→删点；DELETE 先删点（异常吞）再删行；列表 summary=`content[:120]`＋total。
- [x] ⑤ **文案＋图标**：工作台 `manualCards` 全键（zh :977-1028／en :1044-1099）；12 图标＝lucide 节点数据（folder/star/layers/briefcase/target/zap/flag/heart/bookmark/clock/message/grid）；其中 target（3 circle）、clock（path+circle）、briefcase（path+rect）、grid（4 rect）不能只渲染 path——图标件需支持 path/circle/rect（既有 `lucideMenuIcon` 仅 path，另写通用渲染器）。

**实测**（Task 0，2026-10-18，五格全核；证据：工作台全文行锚、asar primitives 实读、lucide 图标源文件、插件行锚、后端真样）：
- 工作台卡片行/右键/头部/弹层语义与文案全表已回收；`setActiveTab` 无清选择动作（安全修正点）。
- 宿主 `Menu` 的 `submenu` 走 `onSelect(sub.id)`，`DshMenu` 直传 items 即得子菜单；缺件回退需补 submenu/danger 渲染。
- 12 图标中 8 枚纯 path、4 枚含 circle/rect；通用渲染器按节点 `tag` 分发（不把圆/矩形硬转 path）。
- 插图/编辑域沿用既有 `field-sizing: content` 修补口径（工作台 Textarea 基类）。

---

## Task 1 — host 半（kb_proxy：三 op）

> 动到的文件：`src/kb_proxy.ts`（＋仓外探针 `probe-menu.mjs` 随扩）。
> **验收对应**：spec §1-1／§3 端点面。

- [x] **createManualCard**：POST `${kbPath}/manual-knowledge`，body 走 `bodyOf` 直传（字段级校验归服务端 422）。
- [x] **updateManualCard**：PATCH `${kbPath}/manual-knowledge/{card_id}`，body 直传；无字段时后端 no-op（面板总会带至少一个字段）。
- [x] **deleteManualCard**：DELETE 同路径（204 中继）。
- [x] **门禁**：`node --experimental-strip-types --check`；`probe-menu` 扩三 op（路径/方法/body 直传/204），全绿。
**实测**（Task 1，2026-10-18，实现＋门禁）：
- **落点**：`src/kb_proxy.ts` 在 `manualCard` 后补三 op（`createManualCard`／`updateManualCard`／`deleteManualCard`；create/update 用 `bodyOf` 直传，delete 走 DELETE 204 中继）；文件头注释同步登记丙对。
- **门禁**：`node --experimental-strip-types --check src/kb_proxy.ts` 过；仓外 `probe-menu.mjs` 扩 section 8 后 **12/12 PASS**（mock：POST/PATCH/DELETE 路径与方法直传、body 逐字、`{}`→kb_id 400、缺/非对象 body→400 且不触后端、delete 204→200 中继、card-404 上游 404 透传）。

---

## Task 2 — client 存储＋纯函数＋图标（无 UI）

> 动到的文件：`client.js`（百科段前纯函数/常量区）＋仓外冒烟。
> **验收对应**：spec §1-2（分组模型）＋§4-2。

- [x] **抽屉模型移植**：`DRAWER_ICON_KEYS`／`DRAWER_COLOR_KEYS`／`DRAWER_COLORS`／默认值；`cardDrawersKey(kbId)`；`sanitizeCardDrawers`（非法 payload 降级空态、图标/色键回默认、hidden 仅 true 时保留）；`readCardDrawers`／`writeCardDrawers`（localStorage 异常吞）；`newDrawerId`（crypto.randomUUID 回退时间戳）。
- [x] **`useCardDrawers(kbId)`**：state＋persist；`createDrawer`／`updateDrawer`（名字 trim）／`deleteDrawer`（只删归属）／`setDrawerHidden`／`revealDrawerToFront`（取消 hidden＋置顶，读写往返保真）／`moveCard`／`moveCards`（单次 persist）；切 KB 重读（render-time 派生重置）。
- [x] **纯函数**：`parseCardTags`（`,|，` trim 去空）；`cardSummaryText`（复用 `stripSummaryHeading`）；`cardOwnerDrawerId`（无/失效归属→未分组）；`activeCardsForTab`；`allSelectedIn`；`cardDrawerIcon` 通用节点渲染器（path/circle/rect，16px，当前色/accent）。
- [x] **门禁**：`node --check`；冒烟扩段（存储键/降级/hidden 往返/各 op/归属失效/标签解析/图标三节点类型），默认＋hostless 两跑。
**实测**（Task 2，2026-10-18，实现＋门禁）：
- **落点**：`client.js` 在 `wikiNoteIcon` 后新增「我的条目管理面」模型段——12 图标键/12 色表/`CARD_DRAWER_ICON_NODES`（工作台 lucide v0.562 节点逐字；target/clock/briefcase/grid 含 circle/rect）、`cardDrawersKey`、`sanitizeCardDrawers`、`readCardDrawers`／`writeCardDrawers`、`useCardDrawers`（create/update/delete/hide/reveal/move/moveCards，切 KB 重读）、`parseCardTags`、`cardOwnerDrawerId`、`cardsForDrawer`、`allCardsInDrawer`、`cardDrawerIcon`（通用 path/circle/rect 渲染器 16px）。
- **门禁**：`node --check client.js` 过；冒烟新增 `②-batch my-entries drawer storage + helpers + icons` 段（存储键/空态/坏值/图标色回退/hidden 往返/标签切分/归属失效/过滤/全选判据/12 图标渲染含 circle/rect）——默认 **70 PASS**＋`SMOKE_HOSTLESS=1` **70 PASS** 双绿。

---

## Task 3 — 卡片 CRUD＋列表交互（client）

> 动到的文件：`client.js`（WikiView 卡片段＋内联字典）＋仓外冒烟。
> **验收对应**：spec §1-1／§4-1。

- [x] **抽件**：模块级 `ManualCardsSection`（props：`t`／`kbId`／`cardsQ`／`query`／`onOpenCard`／`command`）；WikiView 保留取数与 drain 刷新；选择/标签/编辑/删除状态自持。
- [x] **行模型**：复选框（hover 淡入/选中常显）＋主按钮（归属图标/标题≤45%/剥 H1 摘要/混搜 Badge/相对时间 Tooltip）＋行 ⋯ 菜单（打开详情/编辑/开启或关闭混搜/移动到抽屉▸/新建抽屉…/删除）；行 ⋯ 用 `DshMenu` items（danger/submenu）。
- [x] **选择与右键（D2 甲）**：右键未选中行＝单选它；选中>1 时右键菜单切批量态（已选 N/移动到抽屉/取消选择/分隔/删除所选）；无批量条；头部全选（含 indeterminate）；过滤清选择、切标签清选择、切 KB 清选择。
- [x] **编辑弹层**：面板内 `.hrag-overlay/.hrag-dialog`（宽 520）；标题/内容/标签/混搜 Switch（宿主缺件回退 `role=switch` 按钮）；`canSave`＝标题+正文非空且非保存中；标签解析；保存失败停留＋toast；编辑先取详情回填；新建归属当前条目。
- [x] **混搜开关与删除**：行菜单/编辑器 PATCH；删除确认（单卡标题/批量计数标题＋不可恢复描述）；逐张 DELETE＋`allSettled`；成功/部分失败 toast；清选择＋刷新。
- [x] **门禁**：`node --check`；冒烟（行/菜单两态/全选语义/编辑器校验与 body/开关/删除确认与刷新/刷新后列表）；默认＋hostless 两跑；桌面整重启真跑候 Task 6。
**实测**（Task 3，2026-10-18，实现＋门禁；真跑并入 Task 6）：
- **落点**：`client.js` 新增模块级 `ManualCardsSection`（约 600 行；状态自持：expanded/activeTab/selectedIds/deleteTargets/editorOpen/editingId/saving/busy/drawerEditor/ctxMenu）＋`CardDialog`／`CardSwitch`／`CardEditorDialog` 三件；`WikiView` 只留 `cardsQ`＋`command` 经 `sendCardCommand` 下发，取数与 drain 刷新仍在 WikiView。dict 双加卡片 CRUD 族（cardNew/cardEdit/cardDelete*/selectAllCards 等）。
- **实现要点**：行＝原生 `hrag-ev-check`＋主按钮（归属 glyph／标题 45% ellipsis／`stripTitleHeading` 摘要／混搜 Badge／相对时间）＋行尾 ⋯ `DshMenu`（打开/编辑/开关/移动到抽屉▸/新建抽屉/删除）；编辑器先 `manualCard` 取详情（`editRequestRef` 防串）回填；保存 body＝`{title, content, tags, include_in_wiki_search}` 逐字，失败停留编辑态＋红字 toast；开关单字段 PATCH；删除确认单卡标题/批量 `cardDeleteBatchTitle(N)`，`Promise.allSettled` 逐张 `deleteManualCard`，成功/部分失败 toast 后清选择＋`cardsQ.refresh()`；右键未选中=单选，已选>1=批量态；**无批量条**；过滤/切标签/切 KB 均清选择。
- **门禁**：`node --check client.js` 过；冒烟新增 `②-batch my-entries management surface`（happy-dom 真挂载＋fetch mock：首页只列未分组、计数=total、hidden 无标签、切标签过滤、剥 H1、编辑回填/保存 body 逐字/toast/刷新/关窗、行菜单开关单字段、command 新建归属当前抽屉、单卡移动清选择、全选+右键批量（菜单态/无 bulkbar/确认计数/逐张 DELETE=3/成功 toast）、右键删抽屉清归属）——默认 **72 PASS**＋`SMOKE_HOSTLESS=1` **72 PASS** 双绿。

---

## Task 4 — 抽屉体系＋头部（client）

> 动到的文件：`client.js`（卡片头部/抽屉件/抽屉编辑器＋内联字典）＋仓外冒烟。
> **验收对应**：spec §1-2／§1-3／§4-2／§4-3。

- [x] **头部重构**：`[▾] [便签 我的条目 (N)] │ [抽屉A ×] │ [抽屉B ×] [+] ──垫片── [▦全部抽屉] [☑全选]`；计数取 `total`；标签 w-28 固定宽、竖线分隔、strip `overflow-hidden` 不横滚；`[+]`/溢出钮恒可达；空白垫片右键＝新建抽屉。
- [x] **抽屉标签**：active accent/加粗、idle 55% 透明；hover ×＝收起（hidden）；右键＝新建卡片（该抽屉）/编辑/删除（删除不确认，卡片回首页）；当前标签再点回首页。
- [x] **抽屉编辑器**：面板内弹层（宽 560）；名称 Input（Enter 提交、空名禁存）；12 图标 grid-cols-12＋12 色 grid-cols-12；创建/保存；编辑回填。
- [x] **全部抽屉下拉**：列出含 hidden 的全部抽屉（当前项 ✓）；点击＝取消收起＋置顶＋选中；分隔线＋新建抽屉。
- [x] **移动**：单卡/批量「移动到抽屉▸」子菜单（未分组/各抽屉，当前项禁用；项尾「新建抽屉…」）；单次 `moveCards` 落盘。
- [x] **新建入口**：抽屉标签右键/头部 `[+]`/垫片右键/下拉底部/全局 ⋯＝新建抽屉；首页标题右键/内容空白右键/抽屉标签右键/全局 ⋯＝新建卡片（归属当前条目；行 ⋯ 只承载卡片动作，照工作台）；全局 ⋯ 用 command nonce 通知 section。
- [x] **标签过滤与空态**：activeCards＝当前标签；空态（无卡/无匹配）照工作台；标签失效（删除/切库）回落首页。
- [x] **门禁**：`node --check`；冒烟（头部标签/收起恢复/下拉/过滤器/移动批量单次落盘/新建归属）；默认＋hostless 两跑（hostless 需补 submenu 回退）。
**实测**（Task 4，2026-10-18，实现＋门禁；真跑并入 Task 6）：
- **落点**：`client.js` `ManualCardsSection` 头部＋`CardDrawerEditorDialog`＋`fallbackMenuRows` 升级。头部顺序＝caret／首页（便签＋`我的条目`＋total Badge）／竖线／可见抽屉 tab（固定 112px，active 全亮 500，idle 55%）／`[+]`／垫片（右键新建抽屉）／全部抽屉溢出钮／全选；抽屉编辑器＝名称 Input（Enter 提交、trim 空名禁存）＋12 图标 grid＋12 色 grid；全部抽屉下拉＝全部（含 hidden）＋当前 ✓＋底部新建；move 子菜单＝未分组/各抽屉（当前项禁用）＋新建抽屉…。
- **实现要点**：`activeDrawerId` 每渲染校验 `drawerIds.has(activeTab)`，抽屉被删/切库自动回落首页；收起（×/标签右键删除）若正是当前标签即回落首页；恢复走 `revealDrawerToFront`（取消 hidden＋置顶）再选中；新建入口五路（标签右键/`[+]`/垫片右键/下拉底部/全局 ⋯ command nonce），卡片新建归属当前标签（`openCreateFor(activeDrawerId)`）；空态分无卡/无匹配。`fallbackMenuRows` 补 `label/separator/submenu（平铺缩进）/danger`，宿主缺件也能走移动子菜单。
- **门禁**：`node --check` 过；同段冒烟覆盖头部计数/隐藏抽屉不出标签/标签过滤/新建抽屉持久化（名称+clock+blue）/收起→全部抽屉恢复并置顶/单卡移动落盘/切标签清选择；`SMOKE_HOSTLESS=1` 同跑（回退菜单子菜单）——默认与缺件各 **72 PASS**。

---

## Task 5 — 阅读抽屉归属＋文案/样式收口（client）

> 动到的文件：`client.js`（ManualCardDrawer＋样式＋内联字典）。
> **验收对应**：spec §1-2（归属）／§4-4。

- [x] **阅读抽屉归属**：打开时读 `readCardDrawers(kbId)`，头部图标换归属抽屉 Glyph、加抽屉名 Badge；无归属回退便签图标（归组信息不参与详情取数）。
- [x] **文案全表**：卡片专属 `wk.card*`／抽屉 `wk.drawer*` 平铺键（zh/en 逐字照工作台）；复用既有键；内容占位去掉「（支持 Markdown）」括注；aria（选择卡片/全选/更多操作/收起/全部抽屉）齐全。
- [x] **样式收口**：头部 tabs/溢出、抽屉表单双 12 格、编辑域 `field-sizing: content`、按钮/徽章/间距对齐页词汇；窄面板降级（标签裁切、控件不换行）。
- [x] **门禁**：`node --check`；冒烟（归属图标/徽章、文案键存在、CSS 关键断言）；默认＋hostless 两跑；整重启真跑候 Task 6。
**实测**（Task 5，2026-10-18，实现＋门禁；真跑并入 Task 6）：
- **落点**：`client.js` `ManualCardDrawer` 头部——`readCardDrawers(kbId)` 派生 `ownerDrawer`（membership→drawers），有归属则图标换 `cardDrawerIcon(icon,18,accent)`＋`hrag-headbadge-soft` 抽屉名 Badge，无归属回退 `wikiNoteIcon`；归属只在渲染层，详情仍只取 `manualCard`。
- **文案／样式**：dict 双加 `wk.card*`／`wk.drawer*`（zh/en 逐字照工作台；内容占位去「（支持 Markdown）」括注，只此一处按 spec §3 登记改写）；aria 键全用（cardSelect/selectAllCards/cardMoreActions/drawerClose/drawerAll）；CSS＝头部 112px 固定 tab＋`overflow:hidden` 裁切不横滚、双 12 格 grid、`.hrag-cardcontent` `field-sizing: content`（照乙对补修口径）、面板内弹层宽 520/560。
- **门禁**：`node --check client.js` 过；冒烟新增 `②-batch my-entries reader ownership`（localStorage 归属→头部抽屉名/soft badge/svg glyph）；默认与 `SMOKE_HOSTLESS=1` 各 **72 PASS**。

---

## Task 5.5 — 条目编辑（E3 收口，10-18 他令追加）

> 动到的文件：`src/kb_proxy.ts`＋`client.js`（WikiView 条目区/编辑弹层）＋内联字典＋仓外探针。
> **验收对应**：spec §1.2-4／§4-4。

- [x] **host op**：`updateWikiEntry` PATCH `${kbPath}/wiki/entries/{entry_id}`，body 直传（字段校验归服务端 422）。
- [x] **编辑弹层**：面板内宽 600 双栏（主内容区 min-h 200 等宽＋补充层）；详情先取后开（请求防串）；空主内容禁存；保存失败停留＋toast；成功 toast＋关窗＋刷新列表。
- [x] **入口**：单行右键菜单＋行尾 ⋯ 均加「编辑条目」；批量态不加。
- [x] **门禁**：`node --check`；`probe-menu` 加 13 节（PATCH 直传/守卫/404）；冒烟编辑全链（详情回填/保存 body 逐字/失败停留/行 ⋯ 入口）；默认＋hostless 两跑。
**实测**（Task 5.5，2026-10-18，实现＋门禁；真跑并入 Task 6）：
- **落点**：`src/kb_proxy.ts` 在 `deleteWikiEntry` 后补 `updateWikiEntry`；`client.js` 新增 `WikiEditDialog`（照工作台 `wiki-edit-dialog`：主内容区/补充层/提示逐字、末行「最后编辑时间」，宽 600）、`CardDialog` 增 `wide:'wiki'`；`WikiView` 增 `editingEntry/entrySaving/entryEditRef`，右键与行 ⋯ 两个入口；字典双加 `wk.editEntry`＋`wk.wikiEdit*` 11 键＋两条 toast（zh/en）。
- **实现要点**：openEditEntry 先 `wikiEntry` 取详情（防串）再开；保存 `updateWikiEntry` body `{content, supplement_content}` 逐字，`supplement` 空白归一 `null`；失败停留、成功 toast「Wiki 条目已更新」＋刷新；空主内容禁存；切库复位。
- **门禁**：`node --check` 过；`probe-menu` **13/13 PASS**（updateWikiEntry：PATCH 路径/body 逐字、缺 entry_id/body 守卫 400 不触后端、404 透传）；冒烟 `wiki entries context menu + edit dialog` 块覆盖行 ⋯ 入口、详情回填、主/补充双栏、保存 body 逐字、失败停留、成功后关窗——默认/缺件各 **73 PASS**；真栈只读探针 **3/3**（空内容 422 无写入、未知条目 404、宿主 body 守卫 400；未改任何真实条目）。

---

## Task 6 — 收口（门禁汇总＋真跑＋销定＋提交链）

> 动到的文件：本对 spec/plan＋T3 plan 审计节（E2 补销）＋步骤记录。
> **验收对应**：spec §4-4／§4-5／§4-6。

- [x] **门禁汇总**：`node --check`（host 半 `--experimental-strip-types`）＋`probe-menu`＋冒烟默认/hostless 全绿；真栈探针（建临时卡→列表→开关→编辑→删除→清理；失败即停）。
- [x] **真跑**：桌面整重启后他手验全链（建/编/开关/移动/收起恢复/单删/批量删/切标签/搜索/刷新保持）——10-18 他复验，回「测试都过了」。
- [x] **销定**：T3 plan E2 走查账补销（①卡片 CRUD ②抽屉体系 ③空态/计数）；步骤记录同步；spec 状态收口。
- [x] **提交链**：按 he 令一笔英文 Conventional；工作树干净（10-18 已提交）。
**实测**（Task 6，2026-10-18，门禁/真栈/真跑俱过）：
- **门禁**：`node --check client.js` ✓；`node --experimental-strip-types --check src/kb_proxy.ts` ✓；`probe-menu` **13/13 PASS**（含 manual-card CRUD＋updateWikiEntry 节）；冒烟默认 **73 PASS**＋`SMOKE_HOSTLESS=1` **73 PASS**（默认跑新增宿主 Menu 桩 label 行断言；`Switch` 桩按宿主契约 `onChange(!checked)`，缺件二跑改走自绘 `.hrag-switch`）。
- **真栈 CRUD**（`manual-cards-live.mjs`，代理直连 :8001 auth-off，验收库 `t3-panel-acceptance`）：**6/6 PASS**——create 200＋id/字段、list 含新卡＋total、toggle on、edit（title/content/tags 全持久）、detail 回读、DELETE 后 detail 404＋list 清除；临时卡 finally 清理。
- **真栈检索生命周期**（`manual-cards-live-retrieval.mjs`）：**3/3 PASS**——建卡 flag off → wiki 路零命中；toggle on → wiki 路命中（rank 1，score 0.6743052，`source_type=manual`）；toggle off → 零命中；临时卡清理。坐实 spec §4-1「开后被 wiki 检索命中、关后不命中」。
- **销定**：T3 plan E2 行补销（三候选全落＋口径差异）、E1 行「新建抽屉/新建卡片」补销、A6 `drawer-editor`＋`drawer-icon` 补销；步骤记录 ②档批丙项同步；spec Status 改「实施完成」。
- **真跑第一轮（10-18 他手验，两问题）**：①抽屉编辑器色板全空——根因＝`CARD_DRAWER_COLORS` 定义为扁平 hex，而全部消费点按 `.accent` 读取（色板/归属图标/accent 均 undefined）；修法＝色表改 `{ accent: '#…' }`，冒烟补两断言（12 色均带 accent hex＋色板按钮有 backgroundColor），修后默认/缺件各 **72 PASS**。②卡片开关/保存/新建均报 `unknown panel op: updateManualCard`——实核 DSH 进程启动于 05:12、host 文件改于 08:11，**宿主半仍是旧代次**（client 半已热载新码）；非代码缺陷，待完全退出 DSH 后重开复验。③右键行菜单时面板上挤一下——根因＝宿主 `Menu` 根为普通 `span`，`DocContextMenu` 直接挂在 `.hrag-wk-canvas`（flex column＋gap 8px）下，菜单开关多出一个参与 gap 的 flex 项；修法＝`DocContextMenu` 宿主分支外包零尺寸 `position:fixed` 容器（菜单本体仍 portal 到 body），冒烟补 `position:fixed` 断言；默认/缺件各 **73 PASS**。④他令「生成条目批量条应走右键」——底部 `hrag-ev-bulkbar` 退役（照工作台 2026-09-02 裁法）；条目行补右键两态（未选中=单选并出单行菜单；已选>1=批量态：已选 N/更新所选/取消选择/删除所选）；冒烟新增 `wiki entries context menu` 块（单选/批量/无批量条/取消清选择）。⑤他令补「编辑条目」——E3 并入（Task 5.5）：host `updateWikiEntry`＋面板内 600px 双栏编辑（主内容/补充层）、右键与行 ⋯ 两入口、保存/失败/空内容守卫；probe 13/13＋真栈只读 3/3＋冒烟编辑全链；默认/缺件各 **73 PASS**。→ 第三轮复验见下。
- **真跑第二轮（10-18 他手验，两问题）**：⑥靠近屏幕右缘右键，菜单「被吞」——根因＝宿主 `Menu` 子菜单恒向右展开（`.submenu{left:calc(100%+10px)}`）且只夹父菜单；父菜单被夹到 `vw-12` 后子菜单整块落到视口外（真浏览器 900px 量证：翻转前 893→1056，右溢出 156px）。修法＝共享 `useCtxSubmenuFlip`（量父菜单实宽；右缘余量不足 163+10+12 时给宿主 list 加 `.hrag-ctxmenu-subflip`，CSS 把子菜单镜像到左侧并镜像 hover 桥），`DocContextMenu` 与 `DshMenu`（⋯ 行菜单同含「移动到抽屉」子菜单）共用；冒烟补右缘翻转断言；翻转后 502→665 全在视口内。⑦我的条目容器横向滚动条——根因＝卡片行 `div` `width:100%`＋左右 6px 内边距、页内无全局 `border-box`，行撑出 12px；修法＝`.hrag-wk-row{box-sizing:border-box}`＋列表 `overflow-x:hidden`；真浏览器量证：修正前 `scrollWidth-clientWidth=12`，修正后 0。默认/缺件仍 **73 PASS**；`probe-menu` 13/13。→ 第三轮复验见下。
- **真跑第三轮（10-18 他手验）**：按上列 6 项＋全链复验，他回「测试都过了」——Task 6 真跑项销定；10-18 已按令提交。
- **行几何收口（10-18 他问「生成条目是不是有点紧凑」→「按你的建议来」）**：对照工作台实为插件 36px/13px/6px/1px 行缝 vs 工作台 `h-10`（40px）/`text-sm`（14px）/`gap-2`·`px-2`（8px）/列表 `p-2`（8px）/无行缝——不是观感，是实差。修法＝`.hrag-wk-row` 40px＋gap/padding 8＋`box-sizing:border-box`，`.hrag-wk-row-main` 14px，`.hrag-wk-list` padding 8＋去 gap（两列表共用行类，一起变）；冒烟补 40/14 CSS 断言，默认/缺件仍 **73 PASS**；真浏览器量证行高 40、标题 14px（对比页 `density-check.html`）；代价＝同等高度少约一行。
- **⑨ ⋯ 菜单图标（10-18 他报「生成条目三点菜单选项没有图标」）**：根因＝条目行 ⋯ 走面板自绘 `EvalMenu/EvalMenuItem`（非宿主 Menu），该项组件只渲染文字；修法＝`EvalMenuItem` 加可选 `icon`（前置 14px 图标 span），条目行四项接右键同源图标（book/edit/refresh/trash）；冒烟补 4 图标断言；默认/缺件仍 **73 PASS**。
- **⑩ 两容器头部同轴＋收起箭头换件（10-18 他两轮澄清）**：首轮问「下拉和收起是否未对齐统一」——实核两箭头中心已对齐，但箭头后的图标/标题相差 **14px**（生成条目＝裸 10px 箭头＋6px 间距；我的条目＝22px 箭头钮＋2px 头间距＋首页钮 6px 内衬），右侧全选框相差 **3px**（`.hrag-wk-cardhead` 覆盖 `padding-right:6px`，生成条目是 8px）。修法＝生成条目箭头槽改 **22px 居中＋2px 补距**（`padding-left:0`），`cardhead` 撤 `padding-right` 覆盖回归 8px；真浏览器量证箭头中心 13.7/13.7、图标 32.7/32.7、标题 52.7/52.7、全选右距 8.7/8.7。**二轮他明示所指为两容器收起箭头本身的样式**（图1 文本小三角 vs 图2 设置页下拉的 lucide chevron），此前按全选框理解有误；修法＝两箭头换工作台同款 `lucideChevronDownIcon(1)`（16px，颜色随头部 tertiary），展开朝下、收起右旋 90°（`.hrag-wk-chev` 两态），冒烟补 CSS 两态＋两处 SVG 断言。交互仍照工作台（生成条目标题＝收起；我的条目标题＝回首页、箭头＝收起——抽屉标签所需），非缺陷；右侧全选 3px 与左侧槽位对齐作为顺带修正保留。默认/缺件仍 **73 PASS**。

---

## 提交链（滚动记实）

- [x] 定稿一笔（10-18 他令提交；英文 Conventional）。**未推**（仓暂无 remote；前笔 tip＝`a90db41`）。
