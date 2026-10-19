# 插件 T5 —— 子槽声明契约化与命名空间四防 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-19-t5-slot-contract-spec.md](../specs/2026-10-19-t5-slot-contract-spec.md)
**Status:** ✅ 实施完成并真跑通过（2026-10-19）——Task 0–4 全落；门禁：双语法全过＋冒烟默认/hostless 各 **78 PASS/0 FAIL**＋neuter 三针恰红；真跑已过（他手验：迁移保真——新键值与旧值逐字节相同、旧键删除、UI 三抽屉 chip 吻合＋写路落新键；README 契约节核读通过）；定稿一笔已落（`ef2d564`，未推）；真跑回写一笔（本笔，未推）。
**Parent:** 步骤记录 §6 T5（✅ 实施完成 2026-10-19）。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** 契约化＝README 新节（四层承诺＋四防清单，与代码逐字一致）；四防实修＝`client.js` card-drawers 键入 `hrag-` 族＋一次性迁移；保证机制＝仓外冒烟「契约标识」断言块（钉死 id/kind/key/NS＋四存储键）。零宿主/零后端/零面板行为改动（迁移除外且对用户不可见）。

**硬约束**：deer-flow 只读；对外文档只写完成态；契约节与代码逐字一致（不一致＝门禁失败）；不改包名/行 id/工具名/路由/job kind（破坏性）；client 半改动重开窗口即生效（无需整重启）；旧键迁移保真（抽屉数据不可丢）。

---

## Task 0 — 落点核实（只读）

> 已随本对一次性完成（10-19 立对侦察，结论见 spec §2/§4）。

- [x] 宿主契约实读：`@deepseek-ai/dsh-client-ui-sidebar-right` README（asar 一手）——两段式注册、id 全注册唯一（重复抛）、kind 至多 builtin+extension 一对、`keepMounted` 语义（未设＝按访问挂载/切走即卸载）、普通↔全屏不重挂、effect 作用域生命周期、guide 条目 provider 内唯一。
- [x] 插件声明实读：`client.js:18406-18441`（inject 三件、NS `harnessRag`、类型 id `dsh-harness-rag`/kind `harness-rag`/guide id `open`、体 key `dsh-harness-rag`）；`useTabInfo` 全文件零消费；`[data-sidebar-right-session]` 依赖点（1603-1612）。
- [x] 四防清单实核：工具名五枚（`src/tools.ts:81/98/127/144/161`）；槽名族（`client.js:18406-18441`）；设置面（`src/settings.ts` 注释＋`cordis.patch.yml:7` 行 id）；存储键四枚（`client.js:1653/1670/8162/13144`）——第四枚族外坐实（工作台 `frontend/src/core/knowledge/card-drawers.ts:99` 逐字同串）。
- [x] 迁移必要性实查：他 DSH 桌面 leveldb（`@deepseek-ai/dsh-desktop` Local Storage `000006.log`）含 `deerflow.knowledge.card-drawers.9141e58d….v1` 真实值（多抽屉：star/emerald、star/teal、target/emerald，含 hidden 态）⇒ D4 必带迁移。
- [x] 冒烟现状实读：`client-load-check.mjs`——`__smokeExpose` 已含 `cardDrawersKey/readCardDrawers/writeCardDrawers`；`sidebarRightTabs.register` 现为 no-op 桩（未捕获）；旧键断言（1738）＋fixtures（3259/3343/3541）待迁。
- [x] 停点：无（唯一待验＝真跑迁移保真，列入 Task 4 清单）。

## Task 1 — 存储键重命名＋一次性迁移（client.js）

> 动到的文件：`client.js`。

- [x] `cardDrawersKey(kbId)` → `'hrag-card-drawers.' + kbId + '.v1'`；旧键串留 `legacyCardDrawersKey`（迁移读用，勿删串）。
- [x] 读路加一次性迁移：新键缺＋旧键在 ⇒ 旧值原样写新键、删旧键；新键在 ⇒ 无视旧键；旧值坏 JSON ⇒ 回退默认（旧键一并删）。
- [x] 读写调用点（`readCardDrawers`/`writeCardDrawers`）经 helper 自动覆盖；确认无裸串引用残留。
- [x] 门禁：`node --check client.js`。

**实测**：`cardDrawersKey` → `hrag-card-drawers.<kbId>.v1`（13144）；旧串入 `legacyCardDrawersKey`（13149，仅迁移读用）。`readCardDrawers` 加一次性迁移（13185-13198）：新键缺＋旧键在 ⇒ 旧值原样 `setItem` 新键＋`removeItem` 旧键（同一 try——写失败则旧键保留、下次读重试）；新键在 ⇒ 无视旧键；坏值 ⇒ 既有容错回退空态。`cardDrawersKey` 直呼点全在 helper 内（读 13185／迁移写 13193／写 13209），其余消费点（useCardDrawers 三处、ManualCardDrawer 一处）经 `readCardDrawers`/`writeCardDrawers` 覆盖 ⇒ 零裸串（`deerflow.knowledge` 全文件仅剩迁移助手 13150）。门禁 `node --check client.js` 过；冒烟预期 RED（1738 旧键断言，actual 已是新键——Task 3 迁断言/fixtures＋加迁移用例后复绿）。

## Task 2 — README 契约节＋陈旧修正

> 动到的文件：`README.md`。

- [x] 新增「子槽声明契约」节：四层承诺表（槽名/props/生命周期/冲突语义）＋命名空间四防清单（工具/槽/设置行/存储/路由/job kind）。
- [x] Status 行修正：T2–T4 已实装（工具面/面板/摄取通道）＋ T5 实施中、T6 未开工；删「未实装」失真。
- [x] 形态节：tab 描述去「（占位）」（改「完整面板」）；顺带修 host 半描述「五工具壳」→「五工具＋面板数据桥＋摄取 job」。
- [x] 已知占位件段：locale 句修正（内联字典＝三方插件官方模式；`locale/*.json` 只承载 meta 显示元数据）；仅 icon 留 T6。
- [x] 开发段：换代口径修正（client 半＝重开窗口；host 半＝托盘完整退出重启）。
- [x] 自查：契约节每条与代码逐字核对（标识串、行号）——槽名族/存储键/路由/job kind/行 id 全数 grep 对上。

**实测**：Status 行改「T2–T4 已实装并在真栈验收」；形态节两行（tab「（占位）」→「完整面板」、host「五工具壳」→「五工具＋面板数据桥＋摄取 job」）；新增「子槽声明契约」节（四层承诺表＋命名空间四防清单，插于「模型可见工具」与「开发」之间）；开发段换代口径（client 重开窗口／host 托盘整退）＋占位件段（内联字典＝官方模式；`locale/*.json`＝meta 元数据，实读确认只有 title/description）。自查 grep 全对上：`sidebar.right.pane.tab`（18449/18451）／id-kind-key（18433/18434/18451）／guide `open`（18438）／NS（37）／四存储键（1653/1670/8162/13145）／路由（client.js:39＋kb_proxy.ts:18）／job kind（jobs.ts:311/321）／行 id（cordis.patch.yml:7）。

## Task 3 — 冒烟契约标识断言＋fixtures 迁移（仓外）

> 动到的文件：`E:/appdevelop/hrag-probe/client-load-check.mjs`。

- [x] `sidebarRightTabs.register` 桩改捕获；断言 id/kind/guide 条目 id；`slots` 断言补 name/key/locale NS；locale 断言补 NS＝`harnessRag`。
- [x] 新增「契约标识」块：`cardDrawersKey` 新串逐字；其余三键行为探（写→查桩内键名逐字）。
- [x] 旧键 fixtures（3259/3343/3541）迁新键；新增迁移用例（旧键种子→读→新键在＋旧键消＋值等）。
- [x] 默认＋`SMOKE_HOSTLESS=1` 双跑全绿。

**实测**：暴露面补 `readLastKbId/writeLastKbId`；apply 块 `sidebarRightTabs` 桩改捕获＋「T5 契约标识」8 断言（id/kind/guide id/NS/slot name/key/body locale）；存储块加三键行为探（`hrag-kb-order`/`hrag-last-kb`/`hrag-doc-table-prefs.<kbId>` 键名逐字）；`cardDrawersKey` 断言改新串；新增迁移三例（有效旧值⇒采纳＋新键原样＋旧键删；坏旧值⇒回退空态＋旧键删；两键并存⇒新键胜＋旧键不动）；fixtures 3259 定义与 3541 处迁新键（3343 经变量随迁）。默认 **78 PASS 全过**＋`SMOKE_HOSTLESS=1` **78 PASS 全过**（计数=块数不涨，断言在既有块内）。RED→GREEN 证据：Task 1 后旧断言恰红（1738 actual 已是新键），本 Task 迁断言后复绿。

## Task 4 — 门禁＋回写＋真跑清单

> 动到的文件：本 spec/plan＋步骤记录。

- [x] 双语法门禁全跑（`node --check client.js`＋全部 `src/*.ts` strip-types）。
- [x] 回写：本 plan 各 Task 实测、步骤记录 §6 T5 两格勾＋总览行、spec Status。
- [x] 真跑清单交付（重开面板即可）：既有抽屉仍在（迁移保真）＋README 契约节人工核读；提交候令。

**实测**：门禁 `node --check client.js` 过＋全部 6 个 `src/*.ts`（http/index/jobs/kb_proxy/settings/tools）strip-types 过。冒烟默认 **78 PASS/0 FAIL**、`SMOKE_HOSTLESS=1` **78 PASS/0 FAIL**（契约断言在既有块内，计数不涨）。**neuter 三针**（`SMOKE_SRC` 换件法：坏值副本跑冒烟、真件零动）：①`kind` 改坏→恰红 `tab kind`（actual `harness-rag-broken`）；②`LAST_KB_KEY` 改坏→恰红 `T5 contract: last-kb key is hrag-last-kb`；③迁移 `removeItem` 拆除→恰红 `legacy key is removed after adoption`——三处断言均承重。真跑清单交付（重开面板即可，client 半改动随窗口重开生效、无须整重启）：①既有卡片抽屉仍在（旧键数据经迁移保真；如已有抽屉分组，重开后应原样可见）；②README「子槽声明契约」节人工核读（四层承诺表＋四防清单）。

**真跑（2026-10-19 他手验）**：①迁移保真——基线＝旧键 3 抽屉（`1` target/emerald、`1` star/teal、`测试` star/emerald hidden）＋2 条归属；DSH 21:58 整启（client 半已新），面板重连后端后 **22:44:01** 新键写入（值**逐字节相同**：457 字符 JSON，UTF-16 跨 32KB 块记录重建核过）＋旧键删除记录落地；22:44:40 百科数据加载（entries＋manual cards 200）；他截图核「我的条目（3）」三枚抽屉 chip 名称/图标/色逐一吻合、选中抽屉空态正确；**22:55:20** 一笔 UI 写入（`测试` hidden 标记清除）落**新键**——写路同证。②README「子槽声明契约」节他核读**通过**。真跑期间 :8001 起 auth-off 实例（我起，跑完停）。

---

## 提交链（滚动记实）

- [x] 定稿一笔（2026-10-19；英文 Conventional；本笔 `ef2d564`）。**未推**（仓暂无 remote；前笔 tip＝`a4e3451`）；定稿前 README Status 行微修（T5 子句「实施中」→「已实装（真栈复验待做）」，防定稿笔自带陈旧文案）。
- [x] 真跑回写一笔（2026-10-19；英文 Conventional；本笔）。**未推**（前笔 tip＝`ef2d564`）。
