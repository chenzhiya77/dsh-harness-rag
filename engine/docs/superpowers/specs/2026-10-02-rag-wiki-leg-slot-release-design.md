# RAG 百科腿放槽 —— 设计

**Status:** ✅ **已定稿交付（2026-10-02）** —— **D1 已裁 = 乙（派生受跟踪任务）/ D2 已裁 = 乙（单飞+合并）**（用户拍板）；Task 0–4 全交付（plan 收官，含 2026-10-02 审查补的重启残余面/负载叠加两格验收）。配套 plan：[2026-10-02-rag-wiki-leg-slot-release.md](../plans/2026-10-02-rag-wiki-leg-slot-release.md)。

本对一件事：**百科生成腿不再占用工位**——文档转 `ready` 即释放 `worker_concurrency` 信号量，百科生成挪到槽外跑。除「谁在什么时候占槽」外语义零变化：触发时机、生成内容、失败面、镜像口径全部照旧。

**相关记录**：

- [2026-10-01-rag-graph-extract-concurrency.md](../plans/2026-10-01-rag-graph-extract-concurrency.md) Task 4 第 3 框（撞车实录，原文留档：「百科腿在信号量内跑完才放槽……前序文档的两次百科生成把 2 槽占满 ⇒ 新传双篇排队、不并发；处置=按原命令行重启网关……是否要把百科腿挪出槽是**另一条待办线**」——本对就是那条线）
- [2026-09-26-rag-wiki-synthesis-model-design.md](2026-09-26-rag-wiki-synthesis-model-design.md)（D3 模型逐触发解析——本对不动）
- [2026-08-07-rag-knowledge-base-design.md](2026-08-07-rag-knowledge-base-design.md) §3.5 / §3.7（触发式批量 + dirty 增量、断点续跑契约）

## 1. 问题

### 1.0 一眼看懂

**现状**：`_run_guarded` 用 `async with self._sem` 包住整个 `process_document`，而 `process_document` 的最后一行才是 `_maybe_generate_wiki`——文档 status 早已转 `ready`（100%），工位却要等整轮百科生成（分钟级 LLM 批跑，Task 4 窗口观测一轮 15 min 上下）跑完才放。`worker_concurrency=2` 时前序文档的两次生成就能把 2 个工位全占满，新上传的文档只能排队——2026-10-02 真栈撞过一次，靠重启网关 + `recover()` 重入才恢复并发。

**本对之后**：文档转 `ready` 即放槽；百科生成在槽外跑，`worker_concurrency` 预算只花在文档腿上。触发时机（`ready` 之后、`wiki_trigger_ready` 阈值门、`only_dirty` 口径）一字不变。

```
改的                                        不改的
──────────────────────────────────       ──────────────────────
① wiki 腿挪出信号量（D1）                  触发时机 / 阈值门 / only_dirty 口径
② 同 KB 触发单飞+合并（D2，收窄并发面）      失败面（wiki 失败只记日志）
③ wait_idle / stop 收编 wiki 任务          进度口径、path_status、镜像三态、UI
```

### 1.1 机制证据（2026-10-02 复核行号）

| 事实 | 位置 |
|---|---|
| 信号量建在启动时 | `worker.py:209` `self._sem = asyncio.Semaphore(concurrency)` |
| 整段流水线持槽 | `worker.py:296-301` `_run_guarded`：`async with self._sem: await self.process_document(doc_id)` |
| ready 先写、wiki 后跑（同槽内） | `worker.py:415-416` |
| wiki 触发体 | `worker.py:862-891` `_maybe_generate_wiki`（`wiki_trigger_ready` 阈值门 → 每次现解析模型 → `generate_wiki`，兜底 except 只记日志） |
| **唯一** wiki 触发点 | 全仓 `_maybe_generate_wiki` 调用仅 `:416` 一处；recaption 收尾只 `mark_dirty_for_entities`（`:851`）不触发 |
| wiki 腿不落文档行 | `worker.py:315-316` 注释：库级镜像由 API 读时注入（`knowledge_service.py:362-378` `_wiki_path_status`） |
| in-flight 只计数不互斥 | `generator.py:66` `_IN_FLIGHT` 供镜像/幂等闸用，`generate_wiki` 自身不拒并发 |
| 手动腿有幂等闸、auto 腿没有 | `knowledge_service.py:564-576` `trigger_wiki_generation` 查 `wiki_generation_in_progress` 回 `already_running`；worker 侧 `:416` 直呼 `generate_wiki` 不查 |
| 早退面 | `worker.py:305-309`：已 `ready`/`failed` 的文档整段跳过（含 wiki 触发） |

### 1.2 实测证据

2026-10-02 图谱并发对 Task 4 真栈验收（撞车窗口原文见 §相关记录）：前序文档的两次百科生成把 2 槽占满 ⇒ 同批新传双篇排队、不并发，重启网关后 `recover()` 重入（日志 `re-enqueued 2 non-terminal document(s)`）双篇才同批并发。该框如实登记「文档 status 转 ready 时百科腿仍在槽内跑」，并把本条列为待办线。一轮生成的占槽时长以 Task 4 记录为准（15 min 上下），本对 Task 4 会重测回填。

## 2. 设计

### 2.1 D1 放槽落法（已裁：乙）

**在问什么**：百科腿挪出信号量后，以什么形态跑？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| 甲：同任务出槽续跑 | `_run_guarded` 在 `async with self._sem` 块外续跑 `_maybe_generate_wiki` | 生命周期零改（`wait_idle`/`stop`/inflight 一行不动） | 「本次真的转了 ready」判据要另造——`process_document` 对已 ready/failed 文档早退（`:308`），判据漏一格，被 `submit` 的终态文档就平白重跑一轮生成；且 queue `task_done` 迟发 15 min 级，队列口径变味 |
| **乙（推荐）：派生受跟踪任务** | `:416` 一行改 `self._spawn_wiki(kb_id, embedder)`：`asyncio.create_task` 入 `self._wiki_tasks`，由 `wait_idle`/`stop` 收编 | **触发语义逐字不变**（仍在 `process_document` 内、`ready` 之后、早退天然不触发）；文档任务在 ready 即结束；给 D2 一个天然落点 | 代价显式：`wait_idle`/`stop` 各加一段 drain/gather |
| 丙：独立 wiki 常驻队列/worker | 新增一套调度器 | —— | 为一条腿引入第二套调度，超范围，否 |

**推荐乙。**

### 2.2 D2 触发并发面（已裁：乙）

**在问什么**：放槽后文档完成事件更密，同 KB 的生成触发撞车怎么办？

**现状事实**：同 KB 两轮生成今天就可能重叠（W=2 两槽各自走到 `_maybe_generate_wiki`，`generate_wiki` 不拒并发）；auto 腿无幂等闸。放槽会**放大**这个面——不处理等于把既有 race 变宽，违反「失败面只收窄」。

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| 甲：维持现状 | 只放槽，撞车照旧 | 改动最小 | 同 KB 并发两轮 LLM 批写同一批条目：重复成本 + 写竞争（丢更新有先例：2026-08-12 补充层「方向被擦」真栈实测） |
| **乙（推荐）：单飞 + 合并** | `_spawn_wiki` 同步判忙（worker 本地 busy 集 ∪ `wiki_generation_in_progress`）；忙则记 `pending`，运行收尾时若 pending 以 `only_dirty=bool(existing)` 补一轮尾随增量 | 自动触发永不静默丢活；手动腿 `already_running`（P1 触发幂等，2026-08-14）一字不动 | 多一个 pending 集 + 一段尾随循环，几十行 |
| 丙：互斥下沉 `generator`（`claim()` API 全路径统一闸） | 所有触发方走同一个原子闸 | 架构最干净 | 动到手动腿已发布语义，评审面大；二期 |

**推荐乙。** 判忙必须是同步段（asyncio 单线程，check-and-claim 之间不得 `await`）；查 `wiki_generation_in_progress` 保证双向口径：worker 跑时手动按钮照旧回 `already_running`，手动跑时 worker 触发推迟为尾随增量。

**实施口径修正（Task 2 回填）**：claim 只判 worker 自己的 busy 集——把 `wiki_generation_in_progress` 并进 claim 会让「推迟的触发」无人认领（手动跑完没人来接）。跨路径互斥改放在 runner 体里：每次运行前 `wiki_generation_in_progress` 在飞就 0.5s 轮询让路。效果与表内表述同义（双向不重叠 + pending 不丢），形状不同。

### 2.3 生命周期与口径

- `wait_idle()`：queue 排空 + inflight 收拢后再排干 `_wiki_tasks`（排干要循环判空——尾随增量会再入任务）⇒ tests 里「`wait_idle` 之后 wiki 条目已定稿」成立。
- `stop()`：现有 inflight gather 之外同样 gather `_wiki_tasks`（优雅停机等生成收尾，与今天等在槽内一致）。
- 镜像口径零变化：`wiki_generation_in_progress` / `wiki_last_run_status`（`generator.py:69` / `:81`）照旧，`_wiki_path_status` 的 `generating/ready/pending` 三态不动 ⇒ **零 UI 变化**。

## 3. 硬约束

1. **断点续跑契约不动**（主 spec §3.7）：`recover()` 只重入非终态文档；wiki 腿继续不落 `documents.path_status`。重启于生成中途丢一轮生成的既有行为不变（下一次触发或手动按钮补）。
2. **进度单调**：`ready` + `progress_percent=100` 必须先于任何 wiki 工作写入（`:415`→`:416` 顺序不得反转）。
3. **失败面只收窄**：wiki 失败永不影响文档状态（`_maybe_generate_wiki` 兜底 except）；D2 之后同 KB 撞车也不得互相打挂。
4. **手动腿语义不动**：`trigger_wiki_generation` / `trigger_wiki_regeneration` 的 `already_running` 契约与 202 载荷一字不动。
5. **模型逐触发解析不动**（spec 2026-09-26 D3）：`_main_llm` 注入端口、`require_usable_rag_target` 解析链、每次触发现读配置照旧。
6. **零 UI、零新旋钮**：不加配置项；`worker_concurrency` 语义收窄为「文档腿工位」只写进文档，不改字段、不改默认值。

## 4. 验收口径

- 单测①（放槽）：wiki stub 慢速挂起时 W=2 连提 3 篇，parse 并发峰值 = 2（放槽前 = 1）。
- 单测②（生命周期）：`wait_idle()` 返回后 wiki 条目已定稿；`stop()` 不留游离任务。
- 单测③（单飞+合并）：同 KB 连发 N 次触发，`generate_wiki` 同时在飞 ≤1；在飞期间的触发恰好合并为 1 次尾随增量（`only_dirty` 口径）。
- 单测④（触发面不变）：已 ready/failed 文档被 submit 不触发；阈值门未达不触发。
- 真栈（复刻 Task 4 撞车窗口）：手动「全部重建」占住 wiki 期间新传两篇，两篇同批并发入流水线（双 `progress_percent` 序列重叠、总时长不劣于两篇串行之和），全程不重启网关。
- 门禁：`tests/knowledge` 全绿、ruff check/format 干净。

## 5. 非目标

- wiki 生成本身的批量/节流/`backfill_limit`、gleaning、图谱抽取并发（都属已收官对）。
- `worker_concurrency` 数值调整、captioner `Semaphore(4)` 膝点（另一条待办线）。
- 重启后「有 dirty 就自动补一轮」的开机扫描（二期候选；本对只保证触发面不丢活）。
- 评测/重建索引等其他库级后台任务的调度形态。
