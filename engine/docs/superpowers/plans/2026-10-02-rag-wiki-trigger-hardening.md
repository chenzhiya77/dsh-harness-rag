# RAG 百科触发面加固（④+⑤+开机扫描）—— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 每个 Task 走完 RED → GREEN → neuter → revert proof → 门禁 再进下一个；「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-02-rag-wiki-trigger-hardening-design.md](../specs/2026-10-02-rag-wiki-trigger-hardening-design.md)
**Status:** ✅ **收官（2026-10-02）**——用户裁「开机扫描并入本对 + D2=不过阈值门」；提交链：⑤ 换序 `e2d3810e` → ④ 去 settle `47b46127` → 本对草稿/裁定 `5765571f`/`901d8ff6` → 收官 `b54125dd` → 并入开机扫描 `3dee8238` → Task 0 追补 `3527790f` → Task 3 开机扫描 `1c114519` → 收尾回填（本笔）。

**Architecture:** ⑤ `_spawn_wiki` 换序（`create_task` → `busy.add`，同同步段原子性不变、失败即无残留）；④ 三条用例去固定 settle（`calls`/`peak` 计数断言 + `polled` Event）。**零产品语义变化。**

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 | 甲（推荐）：`create_task` 先于 `busy.add` | 乙（try/except 兜清）；`_spawn_wiki` 引入 await 的任何形态 |
| D2 | 三条用例去 settle（计数/事件断言） | 开机扫描（另一条线）；`slow_parse` 交错窗；其他测试文件 |

## 硬约束

- 上对契约全不动（单飞+合并 / `_wiki_tasks` 收编 / `already_running` / 重启残余口径）。
- 失败面只收窄（⑤ 后 `create_task` 失败不再冻结 KB）。
- 测试改写不放宽断言：新形状对三种破形状的判别力逐条反证。

## Task 0 — 开工前核实（3 项，回填结论再开工）

- [x] ① **换序原子性前提**：`_spawn_wiki`（`worker.py:313-327`）全同步无 `await` ✓；`_wiki_tasks.add`/done_callback（`:326-327`）在 `create_task` 成功之后 ✓；runner 首个可让出点在自身体内（`:343` 轮询 sleep / `:344` 生成 await）⇒ 任务必晚于 `_spawn_wiki` 返回才启动 ⇒ **换序后 claim 检查与建任务仍在同一同步段、原子性不变**，`create_task` 抛错则 busy 从未占位。
- [x] ② **固定 settle 全扫**：百科触发用例块内**恰好三处** = `:1166`（1.0s 攒堆）/ `:1202`（0.05s 抓多余尾随 + 冗余二次 `wait_idle`）/ `:1232`（0.05s 断 `calls==0` 前）✓。判别方向登记：`single_flight` 现断 `peak==1`（破=peak>1；慢机攒堆不足**会漏检** ⇒ 升级 `calls==1 && peak==1`——5 连发在 runner 启动前落袋、整单吸收，无 claim 必 `calls==5`）；`coalesce` 断 `calls==2`（破=去尾随 1 / 无单飞 4）；`defers` 断 `calls==0`→`calls==1`（破=首轮即 ≥1）。
- [x] ③ **同类辨析**：`slow_parse` 的 `sleep(0.05)`（`:1071`）= 并发观测交错窗（同 `test_concurrency_cap_respected` 先例）、hanging 用例的 300×0.01 poll = 看门狗上限（带 `entered` 标志）⇒ **均非 settle 断言，不动** ✓。

## Task 1 — ⑤ RED→GREEN→neuter（换序）

- [x] **RED**：`test_a_failed_task_creation_never_freezes_the_kb`——`asyncio.create_task` 换抛错桩（无 await 窗口内换回真身）→ **红（正确红因）**：`a failed spawn froze the KB behind a dead claim`（`busy` 残留 `{'kb-1'}`）；断言含「pending 保持 + 后续触发仍能跑」。
- [x] **GREEN**（D1=甲）：`create_task` 提到 `busy.add` 之前 + 原子性注释（「本函数保持全同步，claim 检查与占位必须同一不间断步骤」）→ 转绿。
- [x] **neuter**：换回旧序（`busy.add` 在前）→ **红（同红因）** → 还原转绿。
- [x] 门禁：`test_worker.py` **39/39 全绿**、ruff check/format 双净。

## Task 2 — ④ 去 settle（计数/事件断言）

- [x] `single_flight`：删 1s 攒堆，改 `release.set()` → `wait_idle` → 断 `calls == 1 && peak == 1`。⚠️ **实施更正一处**：spec 初稿写 `calls == 2` 是把「5 连发的落袋时机」想错了（全在 runner 启动前落袋 ⇒ 整单被首次运行吸收、无尾随；尾随场景归 `coalesce`）——实测纠偏后 spec §2.2 / Task 0 ② 已同步改为 `calls == 1`。
- [x] `defers_wiki`：`wiki_generation_in_progress` 换 `_manual_gate` 探针（首次被调 set `polled` Event），`wait_for(polled.wait(), 5)` 后断 `calls == 0`；尾随后断 `calls == 1` 不变。**零计时猜测**。
- [x] `coalesce`：删 0.05s 冗余 settle + 二次 `wait_idle`（尾随在同一 runner 任务内、一次 `wait_idle` 循环排干已覆盖），直接断 `calls == 2`。
- [x] **判别力反证三连**（新断言形状下）：**A 去 claim**（每触发一任务）→ `single_flight` 红（`got 5`）+ `coalesce` 红（`got 4`）；**B 去推迟**（闸恒假）→ `defers` 红（探针不至 ⇒ `TimeoutError`）；**C 去尾随**（while→if）→ `coalesce` 红（`got 1`）。三处均还原转绿。
- [x] 门禁：`test_worker.py` **39/39 全绿**、ruff check/format 双净；`tests/knowledge` **1442 passed / 2 skipped / 2 failed**（2026-10-02）——2 条即已定性的环境红（`test_embed_missing_api_key`/`test_rerank_missing_api_key`，本机 env 带真 key）。

## Task 0 追补 — 开机扫描核实（3 项，回填结论再开工）

- [x] ① **挂载点**：`start()`（`:216-233`）= init_collections（已兜底）→ `recover()` → dispatcher ⇒ 扫描挂 `recover()` 之后、整段 try/except（含 `build_embedder` 配置错）只记日志。**撞车核对**：recover() 重入文档的后续触发与开机补跑同 KB 相遇 ⇒ 单飞+合并消化，但**口径要合并**——`_wiki_pending` 从 set 升 `dict[str, bool]`（flag=各触发 `require_threshold` 的 AND：任一触发免检则合并轮免检），否则「文档触发先建 runner、开机触发搭 pending」会把免检意图挤掉（尾随按 runner 口径跑回阈值门 ⇒ boot 补跑失灵）。
- [x] ② **dirty 查询面**：`WikiStore.list_entries(kb_id, status=)` 只按库；`store.list_kbs(owner_id)` **按用户过滤**（开机要全局，不可用）⇒ 选**新增 `WikiStore.list_kb_ids_with_dirty()`**（`SELECT DISTINCT kb_id … status='dirty'`），与 `list_non_terminal_documents()` 的全局无过滤先例同形。
- [x] ③ **测试面影响**：调 `start()` 的用例（`:415`/`:449`/hanging/`test_e2e_smoke`/`test_phase2_smoke`）全无 wiki 行 ⇒ 扫描零动作、不受影响；`test_new_document_marks_touched_wiki_entries_dirty` 不经 `start()` ⇒ 阈值门断言不受影响 ✓。RED① 用**零文档库**钉 D2（`wiki_trigger_ready` total==0 必拒）。

## Task 3 — 开机扫描（D2=不过阈值门）

- [x] **RED①**：`test_boot_scan_resumes_dirty_wikis_without_new_documents`——造 dirty 条目 + **零文档库**（阈值门必拒）→ `start()` → `wait_idle` → 断 `generate_wiki` 恰好 1 次且 `only_dirty=True` → 现形状**红**（`got []` 不跑）✓。
- [x] **RED②**：`test_boot_scan_skips_kbs_without_dirty_entries`——无 dirty 的库零动作 → 口径先核：**现形状天然绿（范围守卫）**，与预告一致；对「扫描不看 dirty 全库都跑」的破形状恒红（判别力在 GREEN 后成立）。
- [x] **GREEN**（`1c114519`）：`WikiStore.list_kb_ids_with_dirty()`（`SELECT DISTINCT kb_id … status='dirty'`，全局无过滤）；`scan_dirty_wikis()` 挂 `start()` 的 `recover()` 之后、**整段 try/except 只记日志**（含 `build_embedder` 配置错）；`_spawn_wiki`/`_maybe_generate_wiki` 加 `require_threshold` 关键字（**默认 True**，文档完成路径 `worker.py` 调用点与既有用例零改动）；`_wiki_pending` set→`dict[str, bool]`，**AND-合并**（任一触发免检则合并轮免检——否则文档触发先建 runner 会把开机免检意图挤进尾随、尾随回阈值门失灵）。`test_worker.py` **41/41 全绿**。
- [x] **neuter①**：摘 `start()` 里的扫描 → RED① **红（同红因 `got []`）** → 还原转绿。
- [x] **neuter②**：扫描 spawn 改回 `require_threshold=True`（阈值门加回）→ RED① **红**（零文档库被 `wiki_trigger_ready` 拒）→ 还原转绿（**D2 钉死**）。
- [x] 门禁：`tests/knowledge/test_worker.py` **41/41**；`tests/knowledge` 全量 **1443 passed / 2 skipped / 3 failed**（2026-10-02）——2 条已定性环境红（`test_embed_missing_api_key`/`test_rerank_missing_api_key`）+ 1 条 flake `test_graph_indexer.py::test_concurrent_results_match_serial_including_order`（**2 红 1 绿**复跑定性，图谱并发顺序断言，与本对 wiki 改动面无交集）；ruff check/format **双净**。

## Task 4 — 文档

- [x] 上对 plan 修订行注记 ④⑤ 已收（指回本对提交号 `e2d3810e`/`47b46127`）；本对 Status 回填提交链（见上）。

## 收尾

- [x] plan 复选框全勾 + 提交号回填（见 Status 行）；spec/plan 成对提交（`5765571f` 起，Task 3 = `1c114519`，收尾 = 本笔）。
