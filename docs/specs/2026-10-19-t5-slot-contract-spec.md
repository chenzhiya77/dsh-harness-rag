# 插件 T5 —— 子槽声明契约化与命名空间四防 Spec

**Status:** ✅ 实施完成并真跑通过（2026-10-19 全甲已拍：D1–D6 全按推荐）——Task 0–4 全落（键重命名＋迁移／README 契约节／冒烟断言／收口）；门禁：双语法全过＋冒烟默认/hostless 各 **78 PASS/0 FAIL**＋neuter 三针恰红；真跑已过（他手验：新键值与旧值逐字节相同、旧键删除、UI 三抽屉 chip 吻合、写路落新键；README 契约节核读通过）；定稿一笔已落（`ef2d564`，未推）；真跑回写一笔（本笔，未推）。
**Date:** 2026-10-19
**配套 plan:** [2026-10-19-t5-slot-contract-plan.md](../plans/2026-10-19-t5-slot-contract-plan.md)

## 1. 范围与来源

来源＝步骤记录 [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md) §6 T5 两格：

- 子槽声明对外契约化：槽名/props/生命周期/冲突语义四层稳定承诺（冲突语义三层已核：同名 scoped 遮蔽/槽位 priority 替换或 list 并排/未声明注册激活期失败）。
- 命名空间四防落地核对（工具名/槽名/设置 id/存储路径）。

落法＝**以声明现状为事实源，把四层写成对外稳定承诺（README 新节），并给承诺配机械保证（冒烟「契约标识」断言块）**；四防核对＝逐件清单（§4），唯一实修＝card-drawers 存储键入族＋一次性迁移（D4）。零宿主改动、零后端改动；面板行为零变更（迁移除外，且对用户不可见）。

## 2. 宿主契约（2026-10-19 一手实读：`@deepseek-ai/dsh-client-ui-sidebar-right` README）

宿主右栏 tab 系统＝两段式注册（均在我们的 `ctx.effect` 内）：

1. **类型**：`ctx.sidebarRightTabs.register({ id, kind, patterns?, priority?, canOpen?, title, guide?, keepMounted? })`——静态声明、返回 disposer；`id` 全注册唯一（**重复注册抛**）；一个 `kind` 至多一对 builtin+extension（extension 在位生效、退出即 builtin 回归；其余同 kind 冲突抛）；页类型（我们）不写 `patterns`、按 kind 打开；`title(address)` 开页时固化（活标题需标题座，我们不用）。
2. **体**：`ctx.slots.register({ name: 'sidebar.right.pane.tab', key: definition.id }, Body)`；体经框架注入的 `useTabInfo()` 读 `{sidebar, panel, tab{record, visible, navigation, signal, actions}}`（可选座：标题/guide 替换/菜单项——均不用）。

四层事实（现状）：

- **槽名**：挂入宿主槽 `sidebar.right.pane.tab`；我们的标识＝类型 id `dsh-harness-rag`、kind `harness-rag`、体 key `dsh-harness-rag`、guide 条目 id `open`（provider 内唯一）、locale 命名空间 `harnessRag`。
- **props**：**不消费** `useTabInfo` 任何字段；宿主注入面依赖仅两处＝locale（`ctx.locale.bind(NS)`）与 DOM 标记 `[data-sidebar-right-session]`（T4 会话采集；缺/异常＝空串软降级）。
- **生命周期**：三件注册全在 `ctx.effect`（插件卸载即注销）；**未设 `keepMounted`** ⇒ 体按访问挂载、切走/折叠/docking 即卸载、后台会话不渲染；普通↔全屏切换**不重挂**；持久状态只落服务端＋localStorage（卸载重挂零损失）。
- **冲突语义**（三层已核＋本包新增两条）：①工具同名＝scoped 遮蔽（宿主按 `get(name, scope)` 解析）；②槽位同位＝keyed 替换点（同 key＝接管；list 槽＝并排）；③未声明槽注册＝激活期失败；④tab 类型 id 重复＝抛；⑤kind 冲突（超出 builtin+extension 一对）＝抛。

## 3. 决策表

| # | 点 | 决定 | 理由 |
| --- | --- | --- | --- |
| D1 | 契约载体 | **README 新节**（「子槽声明契约」）＋spec §2 留全量事实 | README 随包发行（`files`）＝对外面；spec 承载取证与核对表 |
| D2 | 承诺姿态 | 四层按 §2 现状原样承诺（标识稳定、不消费 props、effect 作用域、命名空间避冲突）；重命名＝破坏性变更 | 承诺必须与代码逐字一致；不承诺未用面 |
| D3 | 设置 id | **维持** bundle 行 id `harness-rag`（文档化）；不注册宿主设置面（无 schemastery 导出）＝N/A 记录 | 改行 id 破坏既有 profile 引用；行 id 已产品辨识 |
| D4 | card-drawers 键 | **重命名** `deerflow.knowledge.card-drawers.<kbId>.v1` → `hrag-card-drawers.<kbId>.v1`＋**一次性迁移**（读旧写新删旧） | 键族统一（其余三键早已 `hrag-`）；他 DSH leveldb 实查有真实抽屉数据 ⇒ 无迁移＝可见损失 |
| D5 | 承诺保证 | 冒烟加「契约标识」断言块（id/kind/key/NS＋四存储键逐字钉死）＋旧键 fixtures 迁移＋迁移用例 | 「稳定承诺」须有机械保证，防漂移 |
| D6 | README 陈旧 | 四处同轮修正（Status 行/形态节「（占位）」/占位件段 locale 句/开发段换代口径） | 对外文档只写完成态；加契约节却留错文案自相矛盾 |

## 4. 落点

**四防核对清单（只读，已核）**：

| 防 | 标识 | 落点 | 结论 |
| --- | --- | --- | --- |
| 工具名 | `hrag_hybrid_search`／`hrag_graph_search`／`hrag_wiki_search`／`hrag_list_documents`／`hrag_read_document` | `src/tools.ts:81/98/127/144/161` | ✓ |
| 槽名 | 类型 id `dsh-harness-rag`／kind `harness-rag`／体 key `dsh-harness-rag`／guide id `open`／NS `harnessRag`／effect 标签 `harness-rag: *` | `client.js:18406-18441` | ✓（guide id 按宿主口径＝provider 内唯一即可） |
| 设置 id | 不注册宿主设置面（`src/settings.ts` 注释＝schemastery 不可用、故意不导出）；bundle 行 id `harness-rag` | `cordis.patch.yml:7` | ✓（D3 维持） |
| 存储路径 | `hrag-last-kb`／`hrag-kb-order`／`hrag-doc-table-prefs.<kbId>`／**`deerflow.knowledge.card-drawers.<kbId>.v1`** | `client.js:1653/1670/8162/13144` | ⚠️ 第四枚族外（工作台 `card-drawers.ts:99` 逐字复制）→ D4 |
| 附核 | 代理路由 `/dsh-harness-rag/api`／job kind `hrag-ingest`·`hrag-reindex`／CSS 前缀 `hrag-` | `src/kb_proxy.ts`／`src/jobs.ts`／全 CSS | ✓ |

**待改动点**：`client.js` `cardDrawersKey`（13144-13146；读写三调用点 13180/13190/15191 经 helper 自动覆盖）＝D4；`README.md` 五处＝D1/D6；仓外冒烟 `client-load-check.mjs`＝D5。

## 5. 失败/边界语义

- 迁移：新键存在 ⇒ 无视旧键（幂等）；新键缺＋旧键在 ⇒ 读旧值写入新键、删旧键；旧值坏 JSON ⇒ 照既有容错回退默认（旧键一并删，坏值无保留价值）。
- 迁移写失败（localStorage 异常）⇒ 静默；旧键保留、本次照读旧值，下次读重试迁移（永不因迁移本身崩）。
- README 契约节与代码不一致 ⇒ 冒烟断言块即判据（Task 3），不一致＝门禁失败。

## 6. 非目标与另案登记

- 不声明自有子槽（不给第三方开扩展位）；不注册标题座/菜单项座/guide 替换座。
- 不改包名、不改 bundle 行 id、不改代理路由/job kind/工具名（全部已命名空间化，改动＝破坏性）。
- 不追宿主 locale 动态刷新（标题开页固化＝宿主口径，登记）。
- 残差登记：guide id `open` 为 provider 内短名（宿主口径允许；跨 provider 冲突不可能）。

## 7. 验收

1. **契约节**：README 含「子槽声明契约」节，四层＋四防清单与代码逐字一致。
2. **陈旧清零**：README 无「未实装/占位」类失真文案（Status/形态/占位件/开发四处）。
3. **迁移**：真栈重开面板后既有抽屉仍在；localStorage 新键出现、旧键消失。
4. **断言块**：冒烟默认＋`SMOKE_HOSTLESS=1` 全绿（含契约标识块）。
5. **无回归**：面板全部既有行为不变；`node --check client.js`＋全部 `src/*.ts` strip-types 过。

## 8. 对照（宿主先例）

| 面 | 宿主 guide/documentpreview 先例 | 本文 |
| --- | --- | --- |
| 注册路径 | 同两段式公共路径（官方明言「shipped guide 走与第三方完全相同路径」） | 同（类型＋体，均在 effect 内） |
| patterns | 资源型写 globs | 页类型不写、按 kind 打开 |
| keepMounted | 驻留型（终端等）设 true | 不设（按访问挂载） |
| 标题 | 可选标题座 | 无（开页固化） |
