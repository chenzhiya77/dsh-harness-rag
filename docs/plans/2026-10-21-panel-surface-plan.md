# 面板容器底色统一（全 tab） Plan

**Spec:** [2026-10-21-panel-surface-spec.md](../specs/2026-10-21-panel-surface-spec.md)
**Status:** 已实现·已手验（2026-10-21，D1–D4 按建议拍定；Task 0–4 全落，Task 5 文档已回写、提交候令；未提交）。
**Architecture:** 纯 CSS。`.hrag-root` 落两个插件别名（`--hrag-surface` / `--hrag-surface-head`）；百科两容器、评测卡片、召回三通道、图谱/百科抽屉内卡与切片源统一体色/头色。浅色用提亮定值 `#FCFDFE` / `#F3F5F7`（B−R 与宿主同比例 2 / 4），深色经 `[data-ds-dark-theme]` 覆盖回宿主 token。零 JS、零几何、零 host 半。

**硬约束**：只改插件仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 只读；后端零改动；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。并行未提交件（`src/*.ts`、`tests/*`、`2026-10-21-dsh-model-proxy-*`、`2026-10-21-rag-leg-effort-*`）不触碰、不纳入。**10-21 新增并行面**：`client.js` 里也出现 rag-leg-effort 线的思考档位/i18n 改动，提交本对时必须按 hunk 分段，只取 surface 别名/各容器规则与评测「参考切片」卡补齐的 hunk。几何以真浏览器实测为准，不靠估算。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 复核容器与标题行的类名与实例：`.hrag-wk-sect`（两容器）／`.hrag-wk-secthead`；`.hrag-ev-card`（覆盖总览、题详情、历史详情、banner、合成审核）／`.hrag-ev-cardhead`、`-open`。
- [x] 复核宿主 token 与深色选择器：`--dsw-specific-sidebar-fill`（`#f9fafb` / `#1b1b1c`）、会话行选中 token、`[data-ds-dark-theme]`。
- [x] 核对现有几何：卡片 padding/头部 padding/边框/圆角，确认本对零几何改动。
- [x] 列出阶段一不碰的类：`.hrag-recall-section`、`.hrag-gcard`、`.hrag-drawer`、菜单/浮层（后续 Task 2b 已把召回/`gcard`/切片源并入；抽屉外壳与菜单/浮层仍不碰）。

**实测**：
- 百科两容器：`client.js:14023`（生成条目）、`client.js:15178`（我的条目，附 `hrag-wk-cardsect`）；头行为 `client.js:14963` 的 `hrag-wk-secthead hrag-wk-cardhead`——`.hrag-wk-cardhead` 只调 `gap`/`overflow`，不覆盖底色。
- 评测卡片：`.hrag-ev-card` 精确类串 **14 处**渲染点、`.hrag-ev-cardhead` **11 处**；覆盖总览 banner／Layer 1／Layer 2、题详情、历史详情、合成审核。原计划「36 处」是前缀命中数（含 `-cardhead/-cardbody` 等），已按精确类串更正。
- 宿主 token 复核通过（asar 实读值同上）；深色选择器为属性式 `[data-ds-dark-theme]`。
- **会话行取色实读**（`dsh-client-ui-workspace/lib/client.js`）：`.hIlkoa_sessionRow` 基态无底色（透明，露出侧栏底）；`.hIlkoa_sessionRow.hIlkoa_selected` 与 `:hover` 同为 `background: var(--dsw-alias-interactive-bg-hover)`。该 token 浅 `#2631480f`、深 `#ffffff14`，是半透明叠色，不是不透明灰——首版选的 `nav-item-active` 不是宿主会话行的选中色，Task 1 已改。
- 现有几何：容器/卡片边框 `0.5px border-l3`、圆角 `radius-md`；secthead padding `2/8/2/2`、ev-cardhead `6/10`；本对未改。
- 阶段一不碰：`.hrag-recall-section`、`.hrag-gcard`、`.hrag-drawer`、菜单/浮层——确认无本次选择器命中（Task 2b 起 `recall-section`/`gcard`/切片源已纳入；`hrag-drawer`/菜单/浮层仍不碰）。

## Task 1 — 别名与百科容器（D1–D3）

> 动到的文件：`client.js`（Styles()）。

- [x] `.hrag-root` 增 `--hrag-surface` / `--hrag-surface-head`：浅色用提亮定值 `#FCFDFE` / `#F3F5F7`（B−R 保持 2 / 4）；深色经 `[data-ds-dark-theme]` 覆盖回宿主 token。
- [x] `.hrag-wk-sect` 体色改 surface、保留 0.5px border-l3、无阴影。
- [x] `.hrag-wk-secthead` 底色改 surface-head；展开态保留 0.5px 下分隔（inset 阴影）；hover 不换色（与宿主选中会话行一致）。
- [x] 门禁：`node --check client.js`；冒烟默认与 `SMOKE_HOSTLESS=1`。

**实测**：
- 规则落点按类名检索（并行线持续插入，行号会漂）：`.hrag-root`（两个别名＋深色覆盖）、`.hrag-wk-sect`（体色）、`.hrag-wk-secthead`（头色）、`.hrag-wk-sect-open .hrag-wk-secthead`（展开分隔）；hover 条已删。
- 首版误取 `--dsw-specific-sidebar-nav-item-active`（不透明 `#ebeef2`/`#43454a`）；宿主会话行实际选中色是 `--dsw-alias-interactive-bg-hover`（半透明叠色），Task 0 实读后改回。深色覆盖（70% 混色）随之删除——token 自带透明叠加，落在体色上即宿主观感。
- 第三轮曾试内缩胶囊（内缩 6px＋圆角 8＋删分隔线），他明令回退——标题行只换色、不改形；已还原通栏＋inset 分隔线。
- 多轮调色终态：体 `#F9FAFB`→**`#FCFDFE`**、头 `#ECEEF0`→**`#F3F5F7`**（浅 3／7 阶，B−R 仍为 2／4）；深色 `#1B1B1C` / `#2D2D2E` 走 token 原值。混白会等比稀释 B−R，故浅色两个定值直接写死。复刻页实测。
- 门禁：`node --check client.js` 过；冒烟默认 **80 PASS**、`SMOKE_HOSTLESS=1` **80 PASS**（0 FAIL）。

## Task 2 — 评测卡片（D3／D4）

> 动到的文件：`client.js`（Styles()）。

- [x] `.hrag-ev-card` 体色改 surface、保留 0.5px border-l3、无阴影。
- [x] `.hrag-ev-cardhead` 底色改 surface-head；`-open` 下分隔保留；内层 tile、banner 内容、抽屉外壳不动。
- [x] 复核全部渲染点（精确 14 处）不产生新增嵌套色块（内层 `.hrag-ev-metric` 等仍用原 token）。
- [x] 门禁：`node --check client.js`；冒烟默认与 hostless。

**实测**：
- 规则落点：`.hrag-ev-card`（体色）、`.hrag-ev-cardhead`（头色）、`.hrag-ev-cardhead-open`（下分隔保留）；均按类名检索。
- 14 处卡片渲染点全部走同一对选择器，无第二套底色；内层 `.hrag-ev-metric` 实测仍为 `label-primary 4% / transparent`（`color(srgb … / 0.04)`），未叠新色。
- 评测头展开 28／收起 27（既有 0.5px 边框，本对未改）。
- 题库详情「实体」卡：芯片容器原先直接挂在标题下、无内衬，贴边显挤——补 `hrag-ev-cardbody`（8px 10px 内衬）并把芯片间距 5→6px；仅此一处使用 `.hrag-ev-chipwrap`，无外溢。
- 门禁：同 Task 1，两种模式各 80 PASS。

## Task 2b — 其余容器（召回三通道＋gcard）

> 动到的文件：`client.js`（Styles()）。

- [x] `.hrag-recall-section` 体色改 surface、`.hrag-recall-head` 改 surface-head（保留既有 l2 外框与下分隔）。
- [x] `.hrag-gcard` 体色改 surface、`.hrag-gcard-head` 改 surface-head（覆盖百科条目/卡片抽屉内卡＋图谱实体描述/切片/关系图三卡）。
- [x] 百科抽屉「切片源」列表项：`.hrag-wk-linitem` 体色改 surface、`.hrag-wk-linhead` 改 surface-head（hover 仍用 interactive-bg-hover）。
- [x] 门禁：`node --check client.js`；冒烟默认与 hostless。

**实测**：
- 规则落点（按类名检索，行号随并行线漂移）：`.hrag-gcard`／`.hrag-gcard-head`、`.hrag-recall-section`／`.hrag-recall-head`、`.hrag-wk-linitem`／`.hrag-wk-linhead`。
- 渲染面：召回三通道 `client.js:5638`；gcard 用于百科抽屉 `client.js:15341`／`15525`、图谱实体 `client.js:7927`／`7937`／`7979`；配色与百科/评测同一对别名，无新增几何。
- 评测三处（总览/题详情/历史详情）仍由 `.hrag-ev-card` 覆盖，无遗漏。
- 门禁：两种模式各 **80 PASS**、0 FAIL。

## Task 3 — 视觉复刻与几何回归

> 动到的文件：无（复刻页仓外）。

- [x] 复刻页或真浏览器：浅/深两主题各取 wiki 两容器、评测三容器，记录体色/头色实际计算值（`getComputedStyle`）与深色头色是否等于会话选中行。
- [x] 几何同宽度对比：容器高度、头部高度、折叠/展开、边框宽度与改前一致（±0px）。
- [x] 内层 tile 底色、抽屉外壳色未变。
- [x] 门禁：`node --check`；冒烟双模式。

**实测（截图取色，10-21）**：运行中 DSH 左侧栏底＝**`#F9FAFB`**、选中会话行＝**`#ECEEF0`**（截图逐行众数，选中带连续 12 行同值）；改前面板头带实测 **`#EBEEF2`**、体 `#F9FAFB`——体色已对，头色比宿主偏蓝 1–2 阶，即他指出的差异。换成 `interactive-bg-hover` 后复刻页叠色＝`#ECEEF0`，逐值相同。

**实测**（复刻页 `C:/Users/h7242/AppData/Local/Temp/hrag-surface-check.html`，520px 宽，`getComputedStyle`＋按 alpha 叠到体色上取整）：
- 浅色（终态）：体 **`#FCFDFE`**（B−R=2）；头 **`#F3F5F7`**（B−R=4）——比宿主原值浅 3／7 阶，色相比例不变。
- 深色（终态）：体 `#1B1B1C`；头原始 `rgba(255,255,255,0.08)`，叠加后 **`#2D2D2E`**（token 原值）。
- 对照：宿主原值为 `#F9FAFB`/`#ECEEF0`（浅）与 `#1B1B1C`/`#2D2D2E`（深）；调浅只降强度、色相不变。
- 几何：wiki 头展开/收起均 **24px**（inset 阴影零位移）、评测头 28/27；容器圆角、0.5px 外框、padding 全原值。
- 内层：`.hrag-ev-metric` 仍为 4% 透明叠色；`.hrag-drawer` 未命中本对选择器。
- 头带上的既有控件不打架：`--dsw-alias-interactive-bg-hover` 实为半透明叠色，在头带上仍呈现为轻微压暗/提亮，不会变白块。
- 门禁：`node --check` 过；冒烟默认/`SMOKE_HOSTLESS=1` 各 80 PASS（0 FAIL）。

## Task 4 — 真栈手验

> 动到的文件：无。

- [x] DSH 整重启后，浅/深主题各看：百科两容器、评测总览三卡、题详情卡、历史详情卡，以及召回三通道、图谱实体卡、百科抽屉内卡；观感与层次认可（深色头带走 `interactive-bg-hover` 叠色，无需再回退混色）。
- [x] 回归：折叠/展开、hover、菜单、滚动、行悬停、徽章位置。
- [x] 阶段二（召回/图谱/抽屉内卡）已并入本对（Task 2b），不再另立。

**实测**：10-21 他手验：无问题（本对全部落点，浅/深主题）。同轮补齐的评测题详情「参考切片」卡（触发行一行化＋只读 `ChunkRow`＋组间距）亦经手验，无问题；该件不在本对 spec 范围，随本提交链一并落。

## Task 5 — 收口

> 动到的文件：本对。

- [x] 回写 spec Status 与各 Task 实测；plan 勾选与实测回填；equivalence 不登记（纯观感，无功能面变化），README/维护说明不改。
- [ ] 逐文件核 hunk（含本轮评测「参考切片」卡补齐），排除并行工作区与仓外探针；提交链候令后执行。

**实测**：10-21 文档回写完成；提交未执行（候令）。

---

## 提交链（滚动记实）

（待提交后回填）
