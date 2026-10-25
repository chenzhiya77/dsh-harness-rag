# 百科补充层即生成方向（注入 + 编辑即重写）— 2026-09-12

**状态：** ✅ 已落地（2026-09-12）。Plan：`docs/superpowers/plans/2026-09-12-rag-wiki-supplement-direction.md`（Task 1–4）。

> 成果取向：把百科条目编辑框里的「补充层」从一条**只有编辑者能看到的批注**，变成**真正控制下一次生成的提示词**；
> 并把主内容区那半句当前做不到的承诺（"您的编辑将作为参考材料融入新版本"）改回真话。
> 本增量只让**补充层**成为方向；正文编辑维持"会被覆盖"的语义（理由见 Out of Scope）。

## Problem Statement

1. **生成侧完全不读条目**：两个 prompt 构造点都不带条目内容——`_write_entry`（`knowledge/wiki/generator.py:281-287` ＝ 实体名 / 类型 / `graph_entities.description` / 来源切片）、`_write_bundle`（`:313-316` ＝ 实体清单 + 切片）。
   全仓 `get_entry(` / `list_entries(` 的读取者只有五类，**无一是生成**：召回测试的切片锚定（`app/gateway/services/knowledge_service.py:1149`）、eval runner（`knowledge/eval/runner.py:406`）、`wiki_search` 水合（`tools/builtins/wiki_search_tool.py:69`）、worker 的"有没有条目"判断（`knowledge/worker.py:776`）、路由/服务层的列表与校验。
2. **spec A7 承诺未落地**：`docs/superpowers/specs/2026-08-15-rag-phase3-editing-design.md:38`「补充层…在下一次重生成时作为额外参考材料提供」——只有"保留"实现了（`upsert_entry` 的 `_UNSET` 语义，`knowledge/wiki/store.py:79`），"提供"没有。故 `mainContentHint`（`frontend/src/core/i18n/locales/zh-CN.ts:926-927`）是一句假承诺。
3. **补充层连检索都不进**：向量只用 `name + content` 建（`generator.py:259`），`wiki_search` 只回 `content`（`wiki_search_tool.py:76`），前端除编辑框外无第二处渲染 ⇒ 今天它是一条纯批注。
4. **编辑不触发任何重写**：`update_wiki_entry` 把 `status` 原样写回（`knowledge_service.py:653`）⇒ 保存后不排队任何生成。重写只发生在"新文档入库"（`worker.py:387` 标脏 → `:391` 自动增量）或用户手点「更新/局部更新」时，**且"下一次"何时到来不可预期**。
5. **全量重建天然读不到方向**：`only_dirty=False` 时 `singles=[]`、所有合格实体走 `_write_bundle`（`generator.py:371-374`、`:392-393`）⇒ 即便注入，一次全量重建也会静默忽略全部方向。
6. **顺带（本增量不修，见 Further Notes）**：编辑后不重嵌入（`knowledge_service.py:648-655`）⇒ 手改正文后向量仍是旧文本，与 spec §1.2 对切片警告过的"语义漂移"同源。

## Solution

1. **注入**：`_write_entry` 增加可选 `guidance`，作为独立段落拼进 **user message**（`WIKI_SYSTEM_PROMPT` / `WIKI_BATCH_SYSTEM_PROMPT` 一字不动）；两个"已存在条目"的调用点把补充层带下去。
2. **全量重建不再无视方向**：`only_dirty=False` 时先按"是否有非空补充层"把合格实体分两拨——有的走单条 `_write_entry`（带方向），没有的仍批量。
3. **保存即重写**：`update_wiki_entry` 检测到**补充层变化**时调 `trigger_wiki_regeneration(kb_id, [entry_id])`（fire-and-forget，复用现成 `_IN_FLIGHT` 互斥）；返回 `False`（库级生成在跑）则回退 `mark_dirty_for_titles`，让方向进下一次增量。
   **写入侧护栏（2026-09-12 真栈实测后补）**：兜底标脏会被那次在飞的 run 收尾写库时无条件写的 `ready` 擦掉，方向即"存着却永不生效"。故 `_persist_entry` 写前重读该条目的补充层，与本轮抓到的快照不一致时写 `dirty` 而非 `ready`（`_direction_moved_since_snapshot`），把延迟生效做实；方向未变时仍照常清标。
4. **文案说真话**：`mainContentHint` 删"融入"半句；补充层三条改为"方向"口径；对话框副标题同步。

## User Stories

1. As a knowledge-base owner, I want the supplement layer to steer the next generation, so that「语气严谨些 / 多介绍相关概念」actually changes the entry body.
2. As a knowledge-base owner, I want saving the supplement to start the rewrite, so that I don't have to hunt for a separate update button.
3. As a knowledge-base owner, I want a full rebuild to respect my directions, so that rebuilding never silently discards them.
4. As someone asking questions, I want the retrieved entry body to already carry my corrections, so that answers use the corrected wording.
5. As a user, I want the dialog copy to be true, so that I don't believe my main-content edits are merged when they are overwritten.

## Implementation Decisions

- **注入位置与措辞**：常量 `WIKI_DIRECTION_HEADER`；仅在 `guidance` 非空（`strip()` 后）时插入；位置在实体信息之后、来源切片之前。文案（与既有 prompt 同语种）：
  `用户在补充层写下的要求（人工指令，优先于来源切片；仍不得引入材料与要求之外的信息）：`
  理由：不动系统提示词 ⇒ 静态前缀不变（不改变既有 prefix-cache 行为），且批量 prompt 天然不受影响。
- **成对传递**：dirty 分支与 regenerate 分支都改为携带 `(row, guidance)`；`_write_bundle` 不变（它服务 backfill，而 backfill 的定义就是"还没有条目的实体"），其内部漏标题时回退 `_write_entry` 不带 guidance（`generator.py:323`）。
- **全量模式拆分**：非 dirty 分支先 `list_entries(kb_id)` 取 `{title: entry}`，把合格实体拆成 `guided`（有非空补充层）与 `plain`；`guided` 走 `_write_entry`，`plain` 走既有 `plan_entry_batches`。代价：写过方向的条目退化为单条 LLM 调用（数量天然很小）。
- **触发条件**：仅当 `supplement_content` 与库中值不同（空白串归一为 `None` 后比较）时触发；**正文变化不触发**——否则用户刚手改的正文会被同一个请求立刻冲掉。
- **HTTP 契约不变**：PATCH 仍返回更新后的条目；触发是服务层内部行为。UI 不需要新状态：wiki 列表已有 `generation` 标志与轮询（`frontend/src/core/knowledge/hooks.ts:397-399`），重写期间自然显示「更新中」。
- **i18n 三处同步**：`locales/types.ts` / `zh-CN.ts` / `en-US.ts` 的 `knowledge.wikiEdit` 块。

## Testing Decisions

- **Seam B（生成侧）** `backend/tests/knowledge/wiki/test_generator.py`：复用既有 `_WikiLLM.calls`（已记录 user message 原文，`test_generator.py:43-50`），不需要新 fake。
  ① dirty 重写：条目有补充层 ⇒ 该次调用的 user message 含补充层原文；② 无补充层 ⇒ 不含 `WIKI_DIRECTION_HEADER`；③ 全量模式：有补充层的条目走单条且带方向、无补充层的仍走批量（按 `实体清单：` 是否出现区分两种调用）；④ `regenerate_wiki_entries` 单条路径同样带上；⑤ 空白补充层（`"   "`）不注入。
- **Seam A（服务层）** `backend/tests/knowledge/test_api.py`：沿用 `service` fixture 与既有 monkeypatch 手法（`test_api.py:776-792`）。
  ① PATCH 补充层变化 ⇒ `trigger_wiki_regeneration` 被调且 `entry_ids == [entry_id]`；② 库级生成在跑（`wiki_generation_in_progress` 为真）⇒ 不触发、条目落 `dirty`；③ 只改正文 ⇒ 既不触发也不标脏；④ 补充层从有到清空（`None`）⇒ 触发（撤下方向同样要重写）。
- **Seam C（前端）** `frontend/tests/unit/knowledge/wiki-edit-dialog.dom.test.tsx`：hint 断言更新（主内容区 hint **不含**"参考材料"；补充层 hint 含"方向"语义）；既有 `/主内容区/`、`/补充层/` 标签正则不受影响。
- **先例**：`test_generator.py::test_regenerate_preserves_supplement_layer`（`:622`）——本增量把"保留"扩成"保留 **+ 被消费**"。
- **revert proof 三刀**：① `_write_entry` 忽略 guidance；② dirty/regenerate 分支不带 guidance；③ `update_wiki_entry` 不触发。

## Out of Scope

- **正文编辑作为材料**（"编辑即材料"的另一半）：正文是产物格式（`# 标题` + 2–4 段），塞回 prompt 当材料会污染生成；正文编辑维持"临时覆盖、可被重写覆盖"的语义 ⇒ 文案必须如实说明（Task 3）。
- **补充层进检索**（单独 embedding / `wiki_search` 返回）：只走"被吃进正文"这单一路径，避免引用里出现批注语体；代价是"保存 → 重写完成"之间存在不可见窗口。
- 补充层历史版本 / 多方向管理 / diff 预览 / per-条目启用开关。
- 手动知识卡片（P6）无补充层，不受影响。

## Further Notes

- **硬约束**：`_IN_FLIGHT` 互斥（`generator.py:351`、`:437`）⇒ 库级生成在跑时单条重写会被 `trigger_wiki_regeneration` 拒绝（`knowledge_service.py:572-574`），必须回退标脏，否则保存后的方向会静默丢失。
- **"自动"的准确边界**：本增量后，保存补充层 ＝ 立即排队单条重写；若此时库级生成在跑，则退化为"进下一次增量生成"。用户可见差别是等待时长，不是有没有生效。
- **提示词注入＝功能本身**：`guidance` 是用户输入直接进入 LLM prompt 的通道，这是设计意图（用户本来就要控制生成）。仍保留"不得引入材料与要求之外的信息"这句护栏；本增量不引入新的 eval / 过滤层。
- **成本**：每次保存补充层一次单条 LLM 调用；批量路径豁免（没有条目就没有方向）。
- **已知副作用（本轮不修）**：手改正文不会更新向量（`knowledge_service.py:648-655`），因此在该条目被任何一次重写之前，检索的**命中判定**仍按旧文本（编辑中新写的词不带来新命中），而命中后返回的已是新文本。修它有两个独立做法（编辑即重嵌入 / 编辑即标脏），都与"正文是否被覆盖"无关，需要时另立增量。
- **影响面**：`_write_entry` 签名变更只影响 3 个调用点（`generator.py:323` 回退、`:391` dirty、`:464` regenerate），全在本文件内。
