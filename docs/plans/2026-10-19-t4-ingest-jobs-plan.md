# 插件 T4 —— 摄取通道（宿主后台任务）Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-19-t4-ingest-jobs-spec.md](../specs/2026-10-19-t4-ingest-jobs-spec.md)
**Status:** ✅ 实施完成（2026-10-19 他令「都做」＝最小＋完整合一整做）——Task 0–4 全落；门禁：双语法全过＋冒烟默认/hostless 各 **78 PASS/0 FAIL**＋`probe-t4` 6/6＋`probe-menu` 13/13；真跑候他手验（先整重启 DSH 换 host 模块代）；定稿一笔已落（`af6bb38`，未推）。
**Parent:** 步骤记录 §5 T4 × ③档批收官（`2ea80c1`）。
**步骤记录:** [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)。

**Architecture:** host 半新增 `src/jobs.ts`（观察 job 内核：注册回退链、静默结算 wait、文档/重建两观察循环、软着陆）；`src/kb_proxy.ts` 上传/重建两处接线；client 半采集面板会话 id 并随两处载荷携带（`session_id`/`kb_label`，零新 op）。零后端改动。

**硬约束**：deer-flow 只读；原始 error 字符串零出口；面板现有行为零回归；host 半改动须**整重启 DSH** 才换模块代（验收指明）。

---

## Task 0 — 落点核实（只读）

> 已随本对一次性完成（10-19 侦察，结论见 spec §2/§4）。

- [x] 宿主契约实读：`dsh-jobs-local`（start/kill/settle/servesOwner）、`dsh-tool-jobs`（attachController 在预设作用域；结算通知与 awaited 抑制）、`dsh-api-job-controller`（list/follow/kill 投影）、`dsh-client-ui-jobs`（名册行＝kind/label/progress/detail/输出环）、`presets/standard.patch.yml`（tool-jobs 在 agent 预设内）。
- [x] 插件落点实读：`kb_proxy` 上传（`forwardUpload` 原样中继 2xx 文本）与重建（op 直返）；client 调用点（`callUpload` 1604、`confirmReindex` 15361、`ModelSettingsPanel` 持 `kbs`）；面板根（`hrag-root`，18122）与其祖先 `[data-sidebar-right-session]`。
- [x] 后端形状核实：上传响应＝文档记录（`id`/`name`/`status`/`progress_percent`/`chunk_count`，202）；文档状态词汇＝uploaded/parsing/chunking/indexing/ready/failed；重建 status＝`{in_progress, last_run('succeeded'|'failed'|None), progress:{documents_done,documents_total,chunks_indexed,entities_indexed,wiki_entries_indexed,cards_indexed}}`；`_IN_FLIGHT` 在 `reindex_kb` 首段自增（派发毫秒级）。
- [x] 停点：无（唯一待验=真跑，列入 Task 4 清单）。

## Task 1 — host 半 `src/jobs.ts`

> 动到的文件：`src/jobs.ts`（新）。

- [x] 结构型最小接口（`JobsRegistryLike`：`start`/`wait`），不 import 宿主类型包；`ctx.get('jobs')` 惰性。
- [x] `registerIngestJobs(ctx, config)` → `{noteDocument, noteReindex}`；启动回退链（owner→无主→静默跳过）；每进程一次性 warn。
- [x] 静默结算 wait（长时 `wait` 收走结算，防唤醒对话）；`remove` 不做（结算行留名册，宿主客户端自清）。
- [x] 文档观察循环（D6）：progress 映射＋阶段 log 行＋终态组装（§5 口径）。
- [x] 重建观察循环（D6）：progress＝`rebuilding N/M · K vectors`；结算只认翻转/`last_run` 判。
- [x] cancel（D4）＝停轮询、结算 killed＋「tracking stopped; …」文案；`done` 幂等结算。
- [x] 门禁：`node --experimental-strip-types --check src/jobs.ts`。

**实测**：`src/jobs.ts` 落成（结构型最小接口零宿主类型包 import；`ctx.get('jobs')` 惰性＋异常软着陆＋每进程一次性 warn）。启动回退链＝owner→无主→静默跳过（两路皆拒才 warn）。静默结算＝每 job 发一次覆盖观察上限的长时 `wait`，`running`/`stopping` 续拍收尾（结算不注入对话、不唤醒空闲会话）。文档循环：初始 progress＝`queued`（uploaded 映射），逐拍阶段 log 行（阶段粒度，百分比只走 progress 行）、`indexing N%`；终态 `ready · N slices`（任一路 degraded 追加 ` · some paths degraded`）／`failed · <腿>`（path_status failed 腿名，无则 `failed`）。重建循环：`rebuilding N/M · K vectors`（K＝chunks+entities+wiki+cards）；结算只认实见 `in_progress:true→false` 翻转，未见则 3 拍宽限按 `last_run` 判、`null`→`the rebuild did not start`。cancel＝结算 killed「tracking stopped; the ingest continues on the server」；`finish` 幂等（清定时器，取消后零轮询）。门禁 `node --experimental-strip-types --check src/jobs.ts` 过。

## Task 2 — host 半接线（`src/kb_proxy.ts`）

> 动到的文件：`src/kb_proxy.ts`。

- [x] `forwardUpload`：2xx 时解析响应 JSON（id 齐才起 job、name 缺回退 `document`）、`session_id` 从 query 取、调 `noteDocument`；非 2xx/非 JSON 一律照旧原样中继（不猜）。
- [x] `reindex` op 包 async：`api()` 成功后 `status==='enqueued'` 时 `noteReindex`（`session_id`/`kb_label` 从 args 取）；`already_running` 不起。
- [x] `registerKbProxy` 内构造 `ingestJobs` 并传入两处。
- [x] 门禁：`node --experimental-strip-types --check src/kb_proxy.ts`。

**实测**：`registerKbProxy` 构造 `ingestJobs` 并传入 `buildOps` 与 `forwardUpload`。上传：2xx 且响应 JSON 解析出对象时 `noteDocument`（`session_id` 自 query；id 非字符串在 `noteDocument` 内拒——不起 job），非 2xx/非 JSON 原样中继零改动，响应头/体积/错误面逐字照旧。`reindex` 包 async：`api()` 成功后仅 `status==='enqueued'` 调 `noteReindex`（`already_running` 不起），返回值原样透传。门禁 `node --experimental-strip-types --check src/kb_proxy.ts` 过。

## Task 3 — client 半（会话采集＋两处携带）

> 动到的文件：`client.js`。

- [x] `capturePanelSession(element)`＋`panelSessionId()`（`closest('[data-sidebar-right-session]')`；任何异常＝空串）。
- [x] `KnowledgePanel` 根 ref 挂 `hrag-root`，挂载时采集。
- [x] `callUpload` query 增 `&session_id=`（空则不加）；`confirmReindex` 参数增 `session_id`＋`kb_label`（`kb.name || kb.id`）。
- [x] 门禁：`node --check client.js`。

**实测**：模块级 `capturePanelSession(element)`（`closest('[data-sidebar-right-session]')` 读属性；元素缺/异常/属性空一律空串）＋`panelSessionId()`；`KnowledgePanel` 新增 `panelRootRef` 挂 `hrag-root`，挂载 effect 采集一次。`callUpload` query＝`kb_id`＋（非空会话才追加 `&session_id=`）；`confirmReindex` 载荷增 `session_id: panelSessionId()`＋`kb_label: kb.name || kb.id`（kbs 表内查名，查不到回退库 id）。零新 op；面板既有行为逐字不变。门禁 `node --check client.js` 过。

## Task 4 — 门禁＋冒烟＋文档回写

> 动到的文件：仓外冒烟 `client-load-check.mjs`＋本 spec/plan＋步骤记录。

- [x] 冒烟：暴露面补 `capturePanelSession`/`panelSessionId`；新增「面板会话采集」块（假元素链读属性、空链/异常回退空串）；默认＋`SMOKE_HOSTLESS=1` 双绿。
- [x] 双语法门禁全跑（client＋全部 src `.ts`）。
- [x] 回写：本 plan 各 Task 实测、步骤记录 T4 行与总览、spec Status。
- [x] 真跑清单交付（整重启 DSH 换 host 代后他手验）；提交候令。

**实测**：冒烟暴露面补 `capturePanelSession`/`panelSessionId`；新增「T4 面板会话采集」块（假元素链五断言：读回 `sess-abc`／缺容器／`closest` 抛异常／null 元素／空属性，全回退空串）。仓外新增 `probe-t4.mjs`（假 registry＋桩后端 HTTP）六例全过：①上传全链（kind/label/owner、初始 `queued`、三拍轮询、`ready · 28 slices`、环＝parsing/indexing/ready 三行、progress 带 40%）；②kill（结算 killed＋其后零轮询）；③owner 被拒→无主回退（尝试序＝[sess-2, undefined]、零 warn）＋畸形通知不起 job（无 id 文档／空 kb_id 重建）；④重建翻转结算（计数器行 `rebuilding 3/10 · 126 vectors`、`rebuild succeeded`、单条起始行）；⑤重建宽限（3 拍后按 `last_run=failed` 判）；⑥无 jobs 服务静默 no-op。语法门禁：`node --check client.js`＋全部 6 个 src `.ts` strip-types 过；冒烟默认 **78 PASS/0 FAIL**、`SMOKE_HOSTLESS=1` **78 PASS/0 FAIL**；`probe-menu` 13/13。真跑候他手验（**先整重启 DSH 换 host 模块代**）：①上传一条→头部名册出行、进度推进、终态 ready；②名册两击停止→killed 且面板照常走到 ready；③重建→`rebuilding N/M` 行与终态；④断后端→约 15s 后 unreachable。提交候令。

---

## 提交链（滚动记实）

- [x] 定稿一笔（2026-10-19；英文 Conventional；本笔 `af6bb38`）。**未推**（仓暂无 remote；前笔 tip＝`2ea80c1`）。
