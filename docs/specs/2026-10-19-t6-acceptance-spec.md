# 插件 T6 —— 终验（等价对照表＋文档＋icon＋三检索真跑）Spec

**Status:** ✅ 实施完成（2026-10-19 D1–D6 已拍：D3＝母题 A「一路三检」，其余全甲）——Task 0–4 全落；门禁双净＋真跑通过；收口笔为本笔。
**Date:** 2026-10-19
**配套 plan:** [2026-10-19-t6-acceptance-plan.md](../plans/2026-10-19-t6-acceptance-plan.md)

## 1. 范围与来源

来源＝步骤记录 [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md) §7 T6 三格：

- [x] 真 DSH 会话跑三检索工具（原甲档价值验证并入乙验收）
- [x] 等价移植对照表（harness RAG 现面 ↔ 插件面逐项）+ 文档
- [x] icon 原创（现缺=回退默认图）

本对＝插件线终验：**不改任何运行时行为**（除 icon 清单字段）；产出＝可对外引用的等价对照档、原创图标资产、一次真会话的三检索验收记录。

## 2. 事实（2026-10-19 一手实读）

### 2.1 icon 契约（asar `dsh-client-ui-plugin-manager/README.md`＋官方包实读）

- 插件卡片/详情/组件行显示**包根 manifest `icon`** 或导出 `./icon`；absent/undecodable ⇒ 宿主默认图。
- 官方 bundle 形如：`package.json` → `"icon": "./icon.svg"`；`files` 含 `icon.svg`；文件＝36×36 viewBox、`fill="none"`、描边/渐变几何（蓝系 `#658EFF`/`#679EFE`/`#7CB7FF`，绿点缀 `#41E1AC`）。
- 渲染尺寸（plugin-manager CSS 实读）：卡片 `.cardIcon` 48×48、行 `.rowIcon` 40×40、圆角 `--dsw-radius-lg/md`＋0.5px 描边。⇒ SVG 需在 40/48px 下清晰。

### 2.2 两面清单（对照表底稿来源）

- **工作台现面**＝`frontend/src/components/workspace/knowledge/`（56 件）：库列表／中间 tab／文档面板／切片抽屉／召回测试／百科（面板·条目抽屉·编辑·重建闸）／图谱／向量／评测（题库·历史·三抽屉·趋势·指标·合成）／删除预览／重复上传／失败卡／文件类型徽章／锚块提示／引用标记／**KB 助手对话＋引用源**。
- **插件面**＝`client.js` 六分区（`docs/wiki/recall/vectors/graph/eval`）＋顶栏库选择与 ⋯ 菜单（刷新·上传·更新/重建百科·重命名·删除库·功能模型设置）＋上传/重建后台任务（T4）＋设置 Sheet（功能模型，10-14 对）＋五工具（`hrag_*`）。
- 已知**有意差异**：工作台的 KB 助手对话/引用标记＝DSH 宿主对话＋工具面的对应物（10-14 裁定「面板内置对话不做」）；其余差异按 T3–③档各对实测登记。

### 2.3 三检索工具端点（`src/tools.ts` 实读）

| 工具 | 端点 | 输出主体 |
|---|---|---|
| `hrag_hybrid_search` | recall-test `path=vector` | `results`（hits） |
| `hrag_graph_search` | recall-test `path=graph` | `entities`/`relations`/`evidence` |
| `hrag_wiki_search` | recall-test `path=wiki` | `entries`（含 `source_type`） |

判据基石＝与工作台召回测试同题同后端，同路结果逐条一致（T2 已证单路=缺省同题逐条相同）。验收题面沿用 T3 验收题：`星野摄影 银河 曝光`（top_k 3；当时 counts 3/2/3）。

## 3. 决策表

| # | 点 | 决定（推荐） | 理由 |
| --- | --- | --- | --- |
| D1 | 对照表口径 | **记录形**：逐项列「工作台现面 → 插件面 → 状态」，状态三态＝**等价／精简（功能可达但交互简化）／不做（必带理由）**；另设「宿主侧」区（DSH 自身提供，不属插件面） | 与 T3 §4.2「记录形」裁定一致；验收凭据而非强制等价闸 |
| D2 | 对照表落点 | 新档 `docs/equivalence.md`（完整表）＋ README 一句指路；spec 承载方法论与判据 | 对外可引用；README 不膨胀 |
| D3 | icon 形态 | **原创手绘 SVG**（36×36，描边几何，蓝系主色＋绿点缀，对齐官方 bundle 语言）；母题＝**A「一路三检」**（一源 node＋三条分叉检索线＋三终点圆，对应 hybrid/graph/wiki）；`package.json` 增 `"icon": "./icon.svg"`＋`files` 增 `icon.svg` | 宿主契约直读；零构建步骤；40/48px 可读（三候选实测后他拍 A） |
| D4 | 三检索真跑 | **他手跑固定题面**（DSH 会话内让模型依次调三工具，题面同 §2.3），我交付题面/判据并以后端日志取证 | 真会话由他手验（沿 T2 Task 7 模式）；判据可机核 |
| D5 | 真跑判据 | ①hybrid＝召回测试 vector 路同题 hits 逐条相同；②graph 返回 entities/evidence 非空且结构完整；③wiki 返回 entries 含 `source_type` 且与召回 wiki 路同题一致；④三工具均命中 `t3-panel-acceptance` 库 | 与工作台同源同后端；逐条可比 |
| D6 | 顺序 | 对照表 → icon → 三检索真跑 → 收口 | 前两件零依赖可先行；真跑需后端＋会话，放在最后 |

## 4. 落点

- `docs/equivalence.md`（新）：完整对照表（分区：入口／库管理／文档／切片／召回／百科／图谱／向量／评测／设置／摄取任务／工具面／宿主侧）。
- `icon.svg`（新）：原创图标；`package.json`：`"icon": "./icon.svg"`＋`files` 增 `icon.svg`。
- `README.md`：增一句对照表指路（+ 如 icon 完成，移除「icon 未随包」占位句）。
- 步骤记录 §7 T6 两格勾＋总览行；本 spec/plan Status。

## 5. 失败/边界语义

- icon：SVG 不可解码 ⇒ 宿主回退默认图（验收失败）；`files` 缺 `icon.svg` ⇒ 发布包丢图（本地 `link:` 安装不暴露此错，须以 `files` 列表核对）。
- 对照表：凡「不做」必须写理由与归属（另案/宿主侧/设计裁定）；无理由的不做项＝未收口。
- 真跑：题面须用同一后端与库；模型未调工具＝验收未完成（重跑）；工具报 `not_configured`＝`kb_id` 未传且无默认（题面显式给 kb_id）。

## 6. 非目标与另案

- 不做面板内置对话（10-14 裁定）；不做像素级视觉对照（对照表记功能面，不记观感）。
- 不新增功能、不修缺陷（真跑咬出缺陷⇒停下登记，另案）。
- icon 不做多尺寸位图集（宿主只吃 SVG/导出图）。

## 7. 验收

1. **对照表**：`docs/equivalence.md` 覆盖 §2.2 两面清单全部面；每行状态∈{等价, 精简, 不做, 宿主侧}；「不做」行带理由；README 有指路。
2. **icon**：`package.json` 含 `icon` 字段且 `files` 含 `icon.svg`；SVG 合法（XML 解析过）；Plugins 页卡片/行显示新图（非默认）。
3. **三检索真跑**：D4 判据四条全过，后端日志留证（recall-test ×3 请求）。
4. **无回归**：`node --check client.js`＋`src/*.ts` strip-types＋冒烟双 78 全绿。
5. **文档一致性**：README 无「icon 未随包」陈旧句；步骤记录 T6 行如实。

## 8. 对照（宿主先例）

| 面 | 宿主先例 | 本文 |
| --- | --- | --- |
| icon | 官方 bundle `icon.svg`＋manifest `icon` 字段 | 同构（原创资产） |
| 对照表 | 上游 PR/RFC「等价移植」记录形 | 同口径（T3 §4.2） |
| 工具真跑 | T2 Task 7（他手跑＋日志取证） | 同法 |
