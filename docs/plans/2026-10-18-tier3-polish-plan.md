# 面板 ③ 档批 —— F·G·H 精简项收口 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-18-tier3-polish-spec.md](../specs/2026-10-18-tier3-polish-spec.md)
**Status:** ✅ 实施完成（2026-10-18 他令「先盘点,都做了」）——F 组零待办；G×5＋H×5 全做；host 半不动；门禁双绿；候真跑；2026-10-19 定稿一笔（未推）。
**Parent:** ②档三对收官（`ce4faa8`）× T3 走查账 F/G/H。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** 全部在插件 client 半。向量面（`VectorView`/`VectorCanvas`）补搜索、范围、工具栏档位、索引提示、3D 平移；评测面（`EvalTrendCard`/`EvalTrendChart`、`EvalHistory`、`EvalSynthReview`）补 dataZoom、时长格式、行右键、头部右键、相对时间。数据全部来自现有 op；文案照工作台 zh/en 逐字。

**硬约束**：照工作台、零后端、既有行为不回退、改 `client.js` 真跑重开面板即可。

---

## Task 0 — 盘点＋落对

> 动到的文件：本 spec/plan＋T3 走查账。

- [x] 逐项核对 T3 §F–§H 与插件现状；F 两项已有裁、无待办。
- [x] 确认 10 项缺口（G1–G5、H1–H5）与工作台行为；零新 op。
- [x] spec/plan 落盘。

## Task 1 — 向量面搜索＋范围选择

> 动到的文件：`client.js`（VectorView/VectorCanvas/样式/字典）＋仓外冒烟。

- [x] 搜索栏：工具栏上方独立一行；`hrag-vec-search` 输入＋范围原生 select（all/chunks/entities/wiki/cards），文案照工作台（`搜索…`／`搜索范围`／全部·文档·实体·百科·条目）。
- [x] 匹配：`label` 大小写不敏感子串；范围限定类别；空查询＝不启用。
- [x] 画布：命中点 alpha 提满、尺寸 ×1.4；未命中 alpha 0.2；清空恢复；与叠加/图例/悬停并存。
- [x] 门禁：`node --check`＋冒烟断言（搜索输入/范围选项/命中集合/画布参数）。

**实测**：`vecSearchMatches(point, needle, scope)` 归一 `label` 小写子串并映射 `source_type→collection` 过滤；`VectorView` 搜索行（文本输入＋范围 select）常驻工具栏上方，空查询传空集；`VectorCanvas` 在搜索激活时命中 `alpha=1`、半径 `×1.4`，未命中 `alpha=0.2`，清空回原四档透明度与尺寸。冒烟新增三例 `vecSearchMatches`（命中/跨类别/空查询）与 `VectorView` SSR 断言（`hrag-vec-search` 输入、五个范围选项、命中集合），全过。

## Task 2 — 向量工具栏档位＋更多选项

> 动到的文件：`client.js`（VectorView/样式/字典）＋冒烟。

- [x] `useToolbarTier` 照工作台：`scrollWidth > clientWidth+1` 升档、`restoreWidth` 回落；档 0 全标签 / 档 1 chip icon-only / 档 2 维度·算法入 ⋯。
- [x] `.hrag-vec-bar` 改 `flex-wrap: nowrap; overflow: hidden;`；chip 文案随档显隐。
- [x] ⋯ 菜单（EvalMenu）：维度 2D/3D、算法 PCA/UMAP 两组单选，当前项 ✓；`更多选项` aria/title。
- [x] 门禁：冒烟断言（档位阈值函数/菜单项/不再 wrap）。

**实测**：`evaluateTier` 以 `scrollWidth > clientWidth+1` 升档、回落用 `restoreWidth` 逐档退；档 0 全标签、档 1 仅图标 chip、档 2 维度/算法收进 `EvalMenu`（2D/3D、PCA/UMAP 两组单选，当前项 ✓，`更多选项` aria/title）；`ResizeObserver` + 每渲染 effect 双触发。`.hrag-vec-bar` 改 `nowrap + hidden`。冒烟断言档位阈值行为与 `EvalMenu` 项集，全过。

## Task 3 — 向量索引中提示

> 动到的文件：`client.js`（VectorView/样式/字典）＋冒烟。

- [x] `listDocuments` 取非 ready/failed 计数；>0 显示 `{N} 个文档索引中，投影可能不完整`（琥珀）。
- [x] 有在飞文档时 3s 轮询（沿用 `PIPELINE_POLL_MS`），清零即停并隐藏。
- [x] 门禁：冒烟断言（文案键/提示渲染/轮询谓词）。

**实测**：`listDocuments` 计数排除 `ready`/`failed`；`indexingCount>0` 渲染琥珀提示 `evText(t('vec.indexingHint'), [n])`（zh/en 双键），轮询 3s（在飞）/15s（空闲）随计数切换，清零即隐藏。冒烟覆盖文案键参数化与提示渲染。

## Task 4 — 3D 平移

> 动到的文件：`client.js`（VectorCanvas）＋冒烟。

- [x] 3D：左键拖拽＝旋转（现状不变）；右键拖拽＝平移（`ox/oy`）；`onContextMenu` 阻止默认菜单。
- [x] 2D：左键平移不变；点击拾取/悬停不受影响。
- [x] 门禁：`node --check`＋冒烟断言（右键拖拽改变 ox/oy、左键仍是 yaw/pitch）。

**实测**：拖拽记录 `button`；`dims===3 && button===2` 走 `view.ox/oy` 平移，其余维持旋转；`onContextMenu` `preventDefault`；点击开切片仅 `button===0` 且未拖动。2D 左键平移路径未改。冒烟断言右键拖拽改 `ox/oy`、左键仍改 `yaw/pitch`。

## Task 5 — 趋势图 dataZoom

> 动到的文件：`client.js`（EvalTrendCard/EvalTrendChart/样式）＋冒烟。

- [x] 全量点入场：`span` 只作为初始索引窗（日/周/月→首点≥末点−跨度），不再预先裁剪点集。
- [x] 画布：滚轮围绕光标缩放；拖拽水平平移；索引窗 clamp（至少 2 点）。
- [x] 滑条：点数 > 阈值时显示底部细带（14px），可拖窗；窗宽/位置与画布同步。
- [x] 轴格式随可见跨度：≤2 天用 `HH:mm`，否则 `MM-DD`；点符号密度随可见点数切换。
- [x] 悬停/点击下钻/图例/picker 保持；`node --check`＋冒烟断言（窗函数/滑条显隐/轴格式）。

**实测**：`evTrendWindow(points, preset)` 按 `EVAL_SPAN_MS` 回算初始索引窗，`EvalTrendChart` 持全量点（`span` 仅初始化）；滚轮以光标为锚缩放、左键拖拽平移、窗宽 clamp ≥2 点；`total>8` 显示 14px 滑条（`.hrag-ev-zoom`），窗块 `.hrag-ev-zoom-win` 与画布同步；可见跨度 ≤2 天用 `HH:mm`、否则 `MM-DD`；点半径按可见点数 2.6/1.8/0 三档；点击下钻以 `xs[idx]` 守卫。冒烟新增 `evTrendWindow` 三例（日/月/空）、12 点滑条显隐与窗块断言，全过。

## Task 6 — 历史时长格式＋右键菜单

> 动到的文件：`client.js`（EvalHistory/样式/字典）＋冒烟。

- [x] 时长表头下拉（EvalMenu）：紧凑/按秒；按秒＝`90s`；非默认档按钮常驻；文案照工作台（时长格式/紧凑/按秒）。
- [x] 行右键两态：未选中=选中该行并出「取消选择/删除」；已选>1=「已选 N/取消选择/删除所选」；`DocContextMenu` 承载；⋯ 入口与批量条保留。
- [x] 门禁：冒烟断言（格式切换文案、右键菜单两态、删除目标）。

**实测**：时长 `<th>` 挂 `EvalMenu`（紧凑/按秒，title `时长格式`），按秒档渲染 `90s`（`ev.durSeconds` 参数化），非默认档按钮常驻；行 `onContextMenu` 未选则先选中该行，再按选中数出单选（取消选择/删除）或批量（已选 N/取消选择/删除所选）菜单，`DocContextMenu` 承载；原有 ⋯ 与批量条保留。字典 zh/en 新增 5 键。冒烟断言下拉触发与按秒文案、两态菜单项集。

## Task 7 — 合成审核头部右键＋相对时间

> 动到的文件：`client.js`（EvalSynthReview/字典）＋冒烟。

- [x] 头部右键菜单：有候选＝全部采纳/全部忽略（busy 禁用）；无候选＝禁用空态项；撤除头部两枚可见批量 link。
- [x] 生成时间改相对时间（复用 `docFmtRelative`：刚刚/x 分钟前/x 天前）。
- [x] 门禁：冒烟断言（头部无可见批量按钮、右键项、相对时间文案）。

**实测**：`EvalSynthReview` 头部 `onContextMenu` 出 `DocContextMenu`：有候选＝全部采纳/全部忽略（busy 禁用），无候选＝禁用空态项；头部两枚可见 link 撤除；生成时间由 `MM-DD HH:mm` 改 `docFmtRelative`。冒烟断言头部无可见批量按钮、右键项集与相对时间渲染。

## Task 8 — 收口

- [x] `node --check client.js`＋`node --experimental-strip-types --check src/kb_proxy.ts`。
- [x] 冒烟默认＋`SMOKE_HOSTLESS=1` 双绿；`probe-menu` 13/13。
- [x] 回写本 plan 实测、T3 走查账 F/G/H 销定、步骤记录。
- [x] 真跑候他手验；提交候令。

**实测**（2026-10-18）：`node --check client.js` 过；`node --experimental-strip-types --check src/kb_proxy.ts` 过；`probe-menu.mjs` 13/13 PASS；冒烟默认 74 PASS/0 FAIL、`SMOKE_HOSTLESS=1` 74 PASS/0 FAIL。host 半零改动。真跑项：搜索/范围、三档工具栏与 ⋯、索引提示、3D 右键平移、趋势缩放/滑条、时长格式、历史右键、合成头部右键/相对时间（重开面板生效）。

## Task 9 — 复测修订（10-18 他截图点名）

> 动到的文件：`client.js`（投影工具栏/图例、评测表头、题库/历史底部）＋仓外冒烟。

- [x] 投影范围/算法下拉改宿主菜单件（`EvalMenu`）；范围 28px、算法 24px，选项带 ✓。
- [x] 工具栏控件统一 24px：chip 档 0 自动宽＋色点、档 1 图标钮；重算 24×24；2D/3D 段 24px。
- [x] 图例照 ECharts `type:scroll`：项不收缩不换行，窄栏横向滚动、色点不再被裁。
- [x] 历史/题库表头排序钮改无边框 `ArrowUpDown` 图标（22px，title「排序」）。
- [x] 题库/历史底部批量条删除；题库补行右键两态（已选 N／快速／完整／取消／删除所选）。
- [x] 参考切片「数字＋悬空」语义同工作台；悬空胶囊改红色禁行图标（全缺失不叠数字、部分缺失数字＋图标），明细入 `title`。
- [x] 趋势滚轮：验收库实查 2 条运行（<3 点无缩放空间）；阈值改 ≥2 点接管画布，2 点不再把滚动漏给页面。
- [x] 悬浮提示统一暗泡：`NativeTipLayer` 接管 `.hrag-root` 内原生 `title`（暂存→黑底白字→离开还原）；画布/趋势自绘提示同步改暗底。
- [x] 评测行选框改瞬态（悬停/勾选/有选中项显形，表头常亮）；表头选框垂直居中。
- [x] 模型设置：去掉「没有需要保存的改动」恒显行；统一节距/行距/标签栏与控件垂直对齐。
- [x] 召回行选框 22→16px；耗时胶囊逐字照主树 `ELAPSED_RANK_CLASSES`：emerald/lime/orange 10% 底＋浅色 700 文字、暗色 300 文字（`body[data-ds-dark-theme]`）。
- [x] 召回空态照主树：flask 20px 图标＋灰色 14px 文案垂直居中；六 tab 首行统一 44px 工具条（`hrag-tabbar`），搜索框统一 28px/左 8px 14px 放大镜/文字左衬 28px（文档宿主 Input 同参覆盖），行内召回运行钮、评测/百科/图谱控件同步 28px 垂直居中。
- [x] 评测选框列收至内容宽（`width:1%`＋nowrap＋6/8px 衬距），选框与问题列空档约 25→14px；投影/图谱空态补 ChartScatter／Waypoints 20px 图标＋灰色 14px 文案并垂直居中（同召回）。
- [x] 搜索行按钮统一 28px：百科 ⋯ 22→28×28；评测/图谱段控外框 29→28（border-box＋按钮吃满内容高）；其余行内钮保持 28，行高由 `min-height:44px` 固定。
- [x] 门禁：语法过；冒烟默认/hostless 各 77 PASS/0 FAIL（含题库右键两态、暗泡、召回空态＋统一搜索框四测试）；`probe-menu` 13/13。

---

## 提交链（滚动记实）

- [x] 定稿一笔（2026-10-19；英文 Conventional）。**未推**（仓暂无 remote；前笔 tip＝`ce4faa8`）。
