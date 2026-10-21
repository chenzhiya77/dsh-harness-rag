# 面板容器底色统一（全 tab） —— spec

**Status:** 已实现·已手验（2026-10-21，D1–D4 按建议拍定；主体两笔已提交 `53697ba`/`6978d49`；10-21 追加三处已提交 `e5e5e87`）。
**Date:** 2026-10-21
**来源:** 他提出「容器底层用 DSH 左侧边栏底色、标题行用会话选中色」，随后令「立 spec/plan，先改 wiki＋评测两块」。
**承接:** 纯视觉口径（不改功能面与几何）；与 [2026-10-16-doc-columns-spec.md](2026-10-16-doc-columns-spec.md) 的列宽体系无关。
**配套 plan:** [../plans/2026-10-21-panel-surface-plan.md](../plans/2026-10-21-panel-surface-plan.md)

## 1. 范围

本对覆盖（10-21 他点名全部核过）：

1. **百科**：`生成条目`、`我的条目` 两个大容器（`.hrag-wk-sect`）＋条目/卡片详情抽屉内的卡片（`.hrag-gcard`）与「切片源」列表项（`.hrag-wk-linitem`／`.hrag-wk-linhead`）。
2. **召回**：三个通道容器（`.hrag-recall-section` 与其 `.hrag-recall-head`）。
3. **图谱**：实体详情里的卡片（`.hrag-gcard`）。
4. **评测**：总览三容器、题库问题详情、历史运行详情里的卡片（`.hrag-ev-card`）。

**不包含**：抽屉外壳（`.hrag-drawer`）、菜单/浮层/弹窗。

## 2. 现状与色值（10-21 只读核实）

- 两处容器现在都是 `background: var(--dsw-alias-bg-layer-1)`＋`border: 0.5px solid var(--dsw-alias-border-l3)`；标题行透明（百科有 hover 底色）。浅色下卡片与面板同为 `#fff`，只靠边框分层。
- 宿主 token（asar 实读）：
  - `.hrag-ev-card` / `.hrag-wk-sect` 现状体色 `bg-layer-1`：浅 `#fff`、深 `#232324`。
  - 面板底 `bg-base`：浅 `#fff`、深 `#151517`。
  - 左侧栏底 `--dsw-specific-sidebar-fill`：浅 `#f9fafb`、深 `#1b1b1c`。
  - 会话行**选中**（`dsh-client-ui-workspace` 的 `.sessionRow.selected`）用 `--dsw-alias-interactive-bg-hover`：浅 `#2631480f`、深 `#ffffff14`（均为半透明叠色，落在侧栏底上）。
  - 会话行**未选中**＝透明，露出侧栏底；hover 与选中同色（同一 token）。
  - 深色主题选择器在宿主里为 `[data-ds-dark-theme]`（asar 内多处使用）。
- 结论：宿主的「未选中／选中」是「侧栏底＋约 6%（深 8%）半透明压色」两级，不是两个不透明灰。10-21 首版误取 `--dsw-specific-sidebar-nav-item-active`（`#ebeef2`/`#43454a`）：浅色头带 `#EBEEF2` vs 宿主 `#ECEEF0`（截图实测，偏蓝 1–2 阶），深色 `#43454a` 明显偏亮、连排偏重；已按实读改回 `interactive-bg-hover`，深色无需再混色。

## 3. 决策表（D1–D4，按建议拍定）

### D1 —— 颜色来源（拍定：浅色定值＋深色宿主 token）

- 浅色体 `#FCFDFE`（B−R=2）、头 `#F3F5F7`（B−R=4）：比宿主原值各浅 3／7 阶而色相比例不变（10-21 他令「颜色可以浅一点，但 B−R（浅色）不变」）。浅色两个定值无法由 token 混色得出（混白会等比稀释 B−R），故直接写死。
- 深色在 `[data-ds-dark-theme] .hrag-root` 覆盖回宿主 token：体 `--dsw-specific-sidebar-fill`（`#1B1B1C`）、头 `--dsw-alias-interactive-bg-hover`（落体色后 `#2D2D2E`），缺件回退 `bg-layer-1` / 6% 主文字色叠色。
- 插件别名 `--hrag-surface` / `--hrag-surface-head` 落在 `.hrag-root`，其余规则只引用别名。
- **已知耦合**：深色下选中色若被宿主改成品牌色，容器标题会跟着变色；接受并在 spec 登记。

### D2 —— 强度与深色（10-21 修订）

- 浅色按上面的定值提亮一档、色相指标不变。
- 深色走宿主 token；选中色本身是半透明叠色（浅 6%／深 8%），落在体色上自动跟随主题，无需再混色（首版的 70% 混色已删）。

### D3 —— 形态（拍定：平铺）

- 体色用 surface；边框维持 `0.5px border-l3`；**不加阴影**（tint 与阴影不叠）。
- 标题行保持容器原形态（通栏、随容器圆角）；底色用 surface-head，展开态保留 0.5px 下分隔（百科 inset 阴影／评测 `-cardhead-open` 边框）。10-21 试过删线，观感变差，已恢复。
- 文字 token 不变（`label-primary` / `label-secondary` / `label-tertiary`）。

### D4 —— 作用层级（拍定：只染区块级容器）

- 只染上述区块级容器与其标题行；内部 tile／列表行／输入件／表格头维持现有 token。
- 抽屉外壳（`.hrag-drawer`）、菜单、浮层、弹窗不染。
- 阶段二（召回三通道、图谱实体卡、百科抽屉内卡）已并入本对（Task 2b），同一套别名。

## 4. 口径

- 百科标题行 hover：**不换色**（与宿主选中会话行一致——选中态 hover 不加深）。首版曾用 `color-mix(… 96%, … 4%)` 自造压色，换 token 后删除。
- 标题行上的既有控件 hover 仍走 `--dsw-alias-interactive-bg-hover`（半透明叠色，见 Task 3 实测），不会出现白块。
- 评测标题行无需 hover 态（现无）。
- 几何零变化：padding、字号、行高、圆角、边框宽度全部原值。
- 主题切换即时生效（全部走 CSS 变量，无 JS 状态）。

## 5. 验收

1. 浅色与深色各看一遍：百科两容器＋抽屉内卡、召回三通道、图谱实体卡、评测总览/题详情/历史详情——体色与头色按上表生效；无阴影；边框仍是 0.5px。
2. 深色下三卡连排不显压：头带 `#2D2D2E`、体 `#1B1B1C`（token 原值），有层次但不抢内容。
3. 几何零变化：折叠/展开、滚动、悬停、行 hover、徽章位置与改前逐像素一致（同宽度）。
4. 内层 tile／列表行／抽屉外壳颜色不变。
5. 门禁：`node --check client.js`；冒烟默认与 `SMOKE_HOSTLESS=1` 全绿；真栈手验已过（10-21 他手验，无问题）。

## 6. 影响面

**改的（插件仓）**：`client.js` Styles() 的 token 别名与 `.hrag-wk-sect`／`.hrag-wk-secthead`／`.hrag-ev-card`／`.hrag-ev-cardhead`、`.hrag-recall-section`／`.hrag-recall-head`、`.hrag-gcard`／`.hrag-gcard-head`、`.hrag-wk-linitem`／`.hrag-wk-linhead`、`.hrag-chunkcard`／`.hrag-chunklist`、`.hrag-set-group`／`.hrag-set-grouptitle`／`.hrag-set-card`／`.hrag-set-cardhead`、`.hrag-chunkrow-view` 收档规则；本对 spec/plan。

**不改的**：几何、交互、数据面、host 半、后端、工作台。

## 7. 后置与不做

- 阶段二已并入本对：召回三通道、图谱实体详情卡、百科条目抽屉内卡（10-21 他点名核过，同一套别名）。
- 不做：抽屉外壳/菜单/浮层染色；模型设置弹窗只染卡体与卡头，弹窗外壳不染；给内层 tile 再加一层 tint；把选中色用在真正的选中行之外的其他语义面。
- **不做标题行的内缩胶囊化**（10-21 他明令回退）：标题行保持容器原形态，只换色；「像会话行」仅指取色，不是改形。

## 8. 追加（10-21 手验后）

- **文档切片抽屉**：每个切片加卡壳（`.hrag-chunkcard`：`0.5px border-l3`＋`radius-md`＋`8px 10px` 内衬＋体色 surface），列表间距 8px；行分隔线与行内衬在卡内清零。照主树 `ChunkCard` 的卡片形态，保留面板密度、无阴影。
- **模型设置弹窗**：`.hrag-set-group` / `.hrag-set-card` 体色改 surface；`.hrag-set-grouptitle` 改通栏头带（上圆角）／`.hrag-set-cardhead` 改 surface-head。弹窗外壳、菜单、浮层仍不染。
- **两态钮收档**：宿主 `SegmentedControl` 由 36px 高收到 28px（2px 内衬＋24px 段高）、段内距 16→6px、图标 14px；自绘回退维持原 32×28。
- 验收：10-21 他手验通过（文档切片卡、模型设置卡、两态钮）。
