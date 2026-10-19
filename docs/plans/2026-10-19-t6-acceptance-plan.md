# 插件 T6 —— 终验（等价对照表＋文档＋icon＋三检索真跑）Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-19-t6-acceptance-spec.md](../specs/2026-10-19-t6-acceptance-spec.md)
**Status:** ✅ 实施完成（2026-10-19 D1–D6 已拍：D3＝母题 A，其余全甲）——Task 0–4 全落；门禁双净＋真跑通过；收口笔为本笔。
**Parent:** 步骤记录 §7 T6（验收）。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** 三件并行产物——①`docs/equivalence.md`（记录形对照表，零代码）；②`icon.svg`＋manifest 两处字段（唯一代码面改动）；③真会话三检索验收（他手跑、日志取证）。零运行时行为改动。

**硬约束**：deer-flow 只读；对外文档只写完成态；对照表「不做」必带理由；icon 原创不抄官方资产；真跑判据逐条可比（同后端同库同题）。

---

## Task 0 — 落点核实（只读）

> 已随本对一次性完成（10-19 侦察，结论见 spec §2）。

- [x] icon 契约实读：plugin-manager README（卡片/详情/行显示 manifest `icon` 或 `./icon`，缺失/不可解码回退默认）；官方 bundle 实读（`"icon": "./icon.svg"`＋36×36 描边 SVG＋`files` 含图标）；渲染尺寸（卡片 48px／行 40px）。
- [x] 两面清单实读：工作台 `frontend/src/components/workspace/knowledge/` 56 件组件清点；插件面六分区＋顶栏菜单＋设置 Sheet＋T4 任务＋五工具。
- [x] 工具端点实读：`src/tools.ts` 三检索→recall-test `path=vector|graph|wiki`；判据基石＝T2 单路=缺省同题逐条相同＋T3 验收题 `星野摄影 银河 曝光`（counts 3/2/3）。
- [x] 停点：无。

## Task 1 — 等价对照表（`docs/equivalence.md`＋README 指路）

> 动到的文件：`docs/equivalence.md`（新）、`README.md`。

- [x] 新档：分区表（入口／库管理／文档／切片／召回／百科／图谱／向量／评测／设置／摄取任务／工具面／宿主侧），逐项「工作台现面 → 插件面 → 状态＋理由」。
- [x] 状态四值：等价／精简／不做（带理由）／宿主侧；逐行与实现核对（T3–③档各对＋菜单对＋A 对＋②档＋③档的落点）。
- [x] README 增一句指路（放「形态」或「模型可见工具」附近）；`package.json` `files` 增 `docs/equivalence.md`（发布包内指路可达）。
- [x] 自查：两面清单无遗漏（对照 spec §2.2 逐件勾销）。

**实测**：新档 `docs/equivalence.md`——12 节 **76 行**数据，四状态（等价/精简/不做/宿主侧）逐项对照；README「模型可见工具」节后加一句指路；`package.json` `files` 增 `docs/equivalence.md`。自查：工作台 56 件组件逐件映射（特征件全入表；`*.utils`/壳层/滚动画布等实现件不单列），补入「分区导航」「文件类型徽章」「下载原文」「对话引用锚块提示」四处漏项；插件面补核 `dupVerdict` 重复上传、`downloadDocument` 下载、`copyTimecode` 时间码均已在册。精简项 9 处均带差异说明（入口形态/续读/生成条目批量/局部图/跨档着色/功能模型 Sheet/摄取呈现/库记忆/合成批量），不做 4 项均带理由（per-thread 绑库/独立整页/面板内置对话/像素对照）。

## Task 2 — icon 原创（`icon.svg`＋manifest）

> 动到的文件：`icon.svg`（新）、`package.json`。

- [x] 设计并落 `icon.svg`：36×36、描边几何、蓝系＋绿点缀；40/48px 可读（卡片 48／行 40）。
- [x] `package.json`：增 `"icon": "./icon.svg"`；`files` 增 `icon.svg`。
- [x] 门禁：SVG XML 解析过；`node -e "JSON.parse(...)"` 过；`files` 列表含图标。
- [x] 真跑：Plugins 页卡片与已安装行显示新图（他手验；缺省＝默认图）。

**实测**：母题 A「一路三检」——左侧渐变源点（绿→蓝）＋三条蓝线分叉＋三个绿端点，`viewBox 0 0 36 36` 描边几何；`fill="none"`，线宽 2.5、端点 r=2.2；纯 XML、无外部引用。`package.json` 增 `"icon": "./icon.svg"`、`files` 首项 `icon.svg`。门禁：SVG XML 解析 OK（尺寸 36×36）、JSON 解析 OK、`icon` 字段与 `files` 均含 `icon.svg`。真跑：Plugins 页「已安装插件」行显示新图（40px 行图标，用户截图核读；非默认图；本版该页无卡片形态，唯一渲染面即已安装行；图标按包根路径即时读取，无需整重启）。

## Task 3 — 三检索真跑（他手跑＋日志取证）

> 动到的文件：本 spec/plan＋步骤记录（回写）。

- [x] 交付题面与判据：DSH 会话内依次调用 `hrag_hybrid_search`／`hrag_graph_search`／`hrag_wiki_search`，题面 `星野摄影 银河 曝光`、`top_k=3`、`kb_id=t3-panel-acceptance` 的 id。
- [x] 后端就绪（auth-off :8001；跑完停）＋库数据确认。
- [x] 他手跑；我以后端日志（recall-test ×3）＋工具输出核对 D5 四条判据。
- [x] 结果回写（通过/缺陷登记）。

**实测**：后端 auth-off :8001（`DEER_FLOW_AUTH_DISABLED=1`；`GET /api/threads` 回 405 证已绕过）；库 `t3-panel-acceptance`＝`9141e58dee8a4a08a32c5758395d720a`。用户新开会话（`session-cde7ccda…`）按固定题面手跑：三调用参数逐字一致（query／kb_id／top_k=3），后端日志 01:02:38／01:02:40／01:02:42 三条 recall-test 均 200，下游调用分别落在 chunks＋rerank／entities／wiki_entries＋manual_cards，确认三路各自执行。判据逐条：
1. **hybrid＝vector 基线**：3 条命中，`chunk_id` 与分数逐项全等（`6f959253…#0002` 0.978004／`7618071665…#0000` 0.2694／`ca4d0206…#0004` 0.072）。
2. **graph 非空**：8 实体（五百法则／城市光害／感光度／拱桥构图／星图应用／星形特效／星点拖尾／超焦距）与基线逐名全等；证据 2 条（`6f959253…#0002`／`a13b0637…#0001`）逐 id 全等；1 条关系。
3. **wiki 带 source_type**：3 条（manual 1＋wiki 2），标题与基线全等；wiki 条目携带 `source_chunk_ids`。
4. **同库**：三调用的 `kb_id` 均为 `t3-panel-acceptance`。
耗时 vector 719ms／graph 3077ms／wiki 405ms。缺陷登记：无。跑完已停 :8001。

## Task 4 — 收口（门禁＋文档回写＋提交候令）

> 动到的文件：本 spec/plan＋步骤记录＋README。

- [x] 门禁全跑：`node --check client.js`＋全部 `src/*.ts` strip-types＋冒烟默认/hostless 双 78。
- [x] 回写：对照表完成度、icon 落地、真跑结果；步骤记录 §7 T6 三格勾＋总览行；spec Status。
- [x] README「已知占位件」段：icon 句如已落地则移除/改写（只写完成态）。
- [x] 提交（本笔）。

**实测**：门禁——`node --check client.js` 过；6 个 `src/*.ts`（http/index/jobs/kb_proxy/settings/tools）`--experimental-strip-types --check` 全过；冒烟默认 **78 PASS/0 FAIL**、`SMOKE_HOSTLESS=1` **78 PASS/0 FAIL**。README——Status 改「T2–T6 已实装并在真栈验收」；删除「已知占位件（T6 收口）：插件清单 icon 未随包」句，余文案说明保留。步骤记录 §1 总览 T6 行与 §7 三格已勾；spec Status 同步。收口笔为本笔。

---

## 提交链（滚动记实）

- [x] Task 1 笔（2026-10-20；英文 Conventional；本笔）。**未推**（仓暂无 remote；前笔 tip＝`19868df`）。
- [x] 定稿一笔（2026-10-20；英文 Conventional；本笔）。**未推**（仓暂无 remote；前笔 tip＝`e6eb7db`）。
