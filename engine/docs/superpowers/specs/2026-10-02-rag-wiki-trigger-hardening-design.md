# RAG 百科触发面加固（④+⑤+开机扫描）—— 设计

**Status:** ✅ **收官（2026-10-02）** —— **D1 已裁 = 甲（换序）**、**D2 已裁 = 不过阈值门**（用户拍板）；同日追补：**开机扫描并入本对**（用户裁「并入本对 spec」）。三笔账全部收掉：⑤ 换序 `e2d3810e`、④ 去 settle `47b46127`、开机扫描 `1c114519`。配套 plan：[2026-10-02-rag-wiki-trigger-hardening.md](../plans/2026-10-02-rag-wiki-trigger-hardening.md)。

本对一件事：收掉百科触发面的三笔账——**⑤** `_spawn_wiki` 的 `create_task` 失败残留 `_wiki_busy`（换序修）、**④** 三条用例的固定 settle 窗换事件/计数断言、**开机扫描**（重启后有 dirty 条目的库自动补跑，D2=不过阈值门）。**产品语义只多一件事**：开机多一个自动触发源；单飞+合并、`_wiki_tasks` 收编、手动 `already_running`、文档完成触发的阈值门全不动。

**相关记录**：

- [2026-10-02-rag-wiki-leg-slot-release.md](../plans/2026-10-02-rag-wiki-leg-slot-release.md) 收尾节修订行（审查五条残余的复核结论 + ⑤ 修法预告）
- 上对 spec §2.2/§3（单飞+合并契约与硬约束——本对不得动）

## 1. 问题

### 1.0 一眼看懂

**⑤**：`_spawn_wiki` 先占位后建任务——`busy.add`（`worker.py:324`）在 `create_task`（`:325`）之前。若 `create_task` 抛（无运行中 event loop 的场景），busy 已占位且**没有 runner 认领** ⇒ 该 KB 后续触发全部静默折叠进 pending、永不执行。今天不可达（调用点全在 async 上下文），但防卫生效只要换序。

**④**：三条用例用固定 sleep 当观察窗（`test_worker.py:1166` 1.0s / `:1232` 0.05s / `:1202` 0.05s）。GREEN 侧断言由结构保证不假红，损失的是**未来回归的检出力**（极端加载下，破形状的并发触发可能没在窗内攒堆就被放行）。且三处都能换成零时间窗的计数/事件断言（§2.2）。

### 1.1 机制证据

| 事实 | 位置 |
|---|---|
| claim 顺序：pending → busy → create_task | `worker.py:321/324/325` |
| runner 认领即清理 | `worker.py:346` `finally: busy.discard` |
| `_spawn_wiki` 全同步无 `await`（换序原子性的前提） | `worker.py:313-327` |
| 三条固定 settle | `test_worker.py:1166`（攒堆 1s）/ `:1232`（断 `calls == 0` 前）/ `:1202`（抓多余尾随的 0.05s） |

## 2. 设计

### 2.1 D1 ⑤ 修法（已裁：甲）

**在问什么**：`create_task` 失败不留 busy 残留，怎么修？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲（推荐）：换序** | `create_task` 提到 `busy.add` 之前——claim 检查与建任务同在同步段（`_spawn_wiki` 无 `await`，runner 必然晚于本函数返回才启动）⇒ 原子性不变，失败即无残留 | 零异常路径、两行换位；`_wiki_tasks.add`/done_callback 本就在创建成功之后，无连带 | 若后人往 `_spawn_wiki` 里插 `await` 会破原子性——用一行注释钉住 |
| 乙：try/except 兜清 | `create_task` 失败时 `busy.discard` 再抛 | 等价正确 | 多一条永不执行的失败分支要养测试；语义依赖异常路径 |

**推荐甲。**

### 2.2 ④ 修法（定案，无待拍）

- `single_flight`（`:1135`）：删 1s 攒堆——`release.set()` → `wait_idle` 排干 → 断 **`calls == 1 && peak == 1`**（5 连发全在 runner 启动前落袋 ⇒ 整单被首次运行吸收，无尾随；无 claim 的破形状必得 `calls==5` ⇒ 恒红）。GREEN 由同步 claim 保证，**零时间窗**。（实施更正：初稿写 `calls == 2` 是把「落袋时机」想错了——尾随场景归 `coalesce` 用例。）
- `defers_wiki`（`:1209`）：patched `wiki_generation_in_progress` **首次被探**时 set `polled` Event → `await asyncio.wait_for(polled.wait(), 5)` 后断 `calls == 0` ⇒ 断言点钉在「runner 真到轮询点」，非计时猜测。
- `coalesce`（`:1202`）：删冗余 settle——尾随在同一 runner 任务内完成、`wait_idle` 循环排干已覆盖 ⇒ 直接断 `calls == 2`。

### 2.3 D2 开机扫描（2026-10-02 追补并入；已裁：**不过阈值门**）

**问题**（放槽对登记的残余）：dirty 标记落库但触发意图在内存——「重启 + 之后无新文档」组合下，兜底两条（下一篇文档重触发 / 手动按钮）都不来，dirty 永久挂死。

**修法**：`worker.start()` 里扫一遍——**有 dirty 条目的库**各排一次 `_spawn_wiki`（复用单飞+合并；`_wiki_tasks` 收编照旧）。范围只有 dirty（空库首批量不进——那是阈值门/手动的活）。扫描失败只记日志、**不影响启动**。

**D2=不过阈值门（已裁）**：开机补跑**不查** `wiki_trigger_ready`（占比 ≥0.9），走手动增量口径「有 dirty 就跑」。理由：dirty 由已入库文档标出，「等库入完」前提早已满足；且阈值门在库永远到不了 0.9（如一批 failed 文档）时会把兜底堵成新的死胡同。**文档完成触发的阈值门一字不动**（既有用例 `test_new_document_marks_touched_wiki_entries_dirty` 继续钉着）。

## 3. 硬约束

1. **上对契约全不动**：单飞+合并语义、`_wiki_tasks` 收编、手动 `already_running`、重启残余口径（plan 修订行）。
2. **失败面只收窄**：⑤ 之后 `create_task` 失败不再冻结 KB；开机扫描失败只记日志、不影响网关启动。
3. **测试改写只动等待/断言形状**，不放宽任何断言（判别力只增不减，逐条反证）。
4. **D2 边界**：只有开机补跑不过阈值门；文档完成触发的阈值门、手动按钮口径全不动；零新旋钮。

## 4. 验收

- ⑤ RED：`create_task` 换抛错桩 → 断 `_wiki_busy` 不残留、pending 保持 → 换序后绿。
- ④ 判别力反证：破形状三连（去 claim / 去推迟 / 去尾随）在新断言形状下各照红。
- 开机扫描：RED = 造 dirty 条目 +「重启」（`start()`）+ 不给任何文档 → `generate_wiki` 恰好跑一次且 `only_dirty=True`（现形状红=不跑）；D2 钉住 = 该库**零文档**（阈值门必拒）仍要跑；范围钉住 = 无 dirty 的库零动作；neuter = 摘扫描 / 扫描加阈值门 ⇒ 各红。
- 门禁：`tests/knowledge` 全绿、ruff check/format 干净。

## 5. 非目标

- `_wiki_runner` 的 0.5s 轮询形态（已登记为收敛延迟，不卡停机）。
- 其他测试文件、`slow_parse` 的交错窗（`:1071`，观测用非 settle）。

（初稿把「开机扫描」列在本节；同日用户裁并入本对 ⇒ 已移入 §2.3，见该节。）
