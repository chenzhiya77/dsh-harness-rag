# RAG 重试与就绪判定对齐（RFC §5.2 落地）—— 设计

**Status:** ✅ **全交付（2026-10-04）**—— D1–D3 全裁=甲（任一腿 `degraded` 可重试／状态格悬停卡复用失败卡／worker 在途合并）；Task 0–5 完成（后端 TDD + 前端 + 真栈 A3 验收），实测见配套 plan：[2026-10-04-rag-retry-and-ready-verdict.md](../plans/2026-10-04-rag-retry-and-ready-verdict.md)。

本对一件事：把 RFC v3 §5.2（状态与重试）从文本承诺落到代码——**降级文档可整篇重试**、**就绪判定按「索引完整」收紧**、**重试与删除交错的幂等机制定案**（RFC §5.2「重试以本轮任务与产物为准：有效切片只保留一份、向量与切片同轮一致、文档状态以最新任务为准；处理中发生删除时以删除为准」的落点）。检索侧不建状态门：五处措辞对齐后（RAGFlow 档），可见性=切片写入进度，代码现状已符合，本对只补重试与判定差并为档位补验证用例。

**⚠️ 翻案记录**：本对**推翻** [2026-08-11 二期批次一](../plans/2026-08-11-rag-phase2-batch1.md)（L126）两条现状语义——「部分批次失败仍记 done」「全部批次软失败（`indexed == 0`）文档仍 ready」（后者钉在其用例 `test_worker.py:374-387`，文件名 `test_path_status_vector_failed_when_embed_soft_fails`，docstring 明写「文档仍 ready」）。翻案依据 = RFC v3 §5.2「不能因为向量部分成功就把整篇文档标成 `ready`」与表行 4「索引不完整 → 保持失败」。

**相关记录**：

- RFC：[2026-09-22-local-knowledge-base-rfc-v3.md](../plans/2026-09-22-local-knowledge-base-rfc-v3.md) §5.2 表行 1–4、L160/L162、A3/A4/A8。
- 删除竞态前科与防复活机制：`test_worker.py:633`（Task 9）、`worker._require_alive`。
- 重试先擦后写与服务受理：`knowledge_service.retry_document`（2026-08 期既有）。

## 1. 问题

### 1.0 一眼看懂

RFC v3 §5.2 承诺四件事：a) 处理状态能表达完整成功 / 明确降级 / 失败（按解析、图片说明、索引三个口径）；b) 失败或降级文档可发起**整篇重试**、保留文档 ID、不引入局部图片重跑；c) 重试受理后旧产物不再返回、新产物随写入逐步可见（五处措辞已按此档对齐）；d) 重试与删除交错时幂等、删除优先、旧任务不覆盖新状态（「具体字段与事务方案」由实现设计定并通过测试）。

现状与承诺的差共五条：

1. **重试门只认 `failed`**：降级文档（`ready` + 腿 `degraded` + error 子标记）无重试入口，API 与 UI 双缺。
2. **就绪判定不看索引完整性**：文档终态 `ready` 无条件写入——vector 腿软失败（`indexed == 0`）也标 `ready`（被 `test_worker.py:374-387` 钉着）。
3. **「部分成功」记 `done`**：`indexed > 0` 即 vector 腿 `done`，部分批次失败不可见；RFC 要求「索引不完整 → 失败」。
4. **零切片记 `done`**：无可索引内容未按 RFC 表行 4 落失败口径（实测：文本路径不可达——10/10 最小样本均 ≥1 切片；视频「全空镜头」路径可达，`worker.py:820-839`）。
5. **提交无同文档去重**：`submit` 裸入队；并发双重重试、任务收尾微窗口下可产生同一文档的并发双跑（RFC 表行 1「同一文档不重复启动重试」无机制）。

### 1.1 机制证据

| 事实 | 位置 |
| --- | --- |
| 重试门= `status != "failed"` → 409 | `gateway/routers/knowledge_bases.py:246-247` |
| 重试 UI 两处均只挂 `status === "failed"`（状态格悬停卡 / 行 ⋯ 菜单） | `document-panel.tsx:316-341`、`:1041-1046` |
| 受理=先擦后写：删向量（`delete_by_doc`）＋图谱贡献＋wiki 脏标＋chunk 行 → reset → 入队 | `knowledge_service.py:486-512` |
| vector 腿判定 `indexed > 0 → "done"`；零切片 → `"done"` | `worker.py:417-421` |
| 文档终态 `ready` 无条件写入（不看 vector 腿） | `worker.py:495` |
| 部分批次软失败：`failed_chunk_ids` 记录、继续跑；`chunk_count = indexed` | `knowledge/indexer.py:65-97` |
| 终态复检（重复入队对终态文档 no-op） | `worker.py:387-389` |
| 提交裸入队（无去重/在途检查） | `worker.py:283-284` |
| 删除竞态：`_require_alive` 检查点×8；删除文档后状态写 no-op | `worker.py:302-308`、`store.py:199-201` |
| caption 降级=腿 `degraded` + error 子标记（文档仍 `ready`） | `worker.py:579-587` |
| 状态机无 `degraded` 枚举（六值） | `knowledge/store.py:32-34` |
| 钉住现状的用例：**翻面×1**＋**守护×4** | 翻面＝`test_worker.py:374-387`（软失败仍 ready → 改后 failed）；守护（行为不变、须保持绿）＝`test_api.py:686`（上传态仍 409）、`document-panel.dom.test.tsx:399`（failed 行卡形态不变）、`hooks.dom.test.tsx:117,190`（failed 重试流） |

## 2. 设计

### 2.0 裁决（D1–D3 = 甲，2026-10-04 已裁）

| # | 结论 | 语义 |
| --- | --- | --- |
| D1 | 任一腿 `degraded` | caption／graph／视频腿统一：命中 `any(v == "degraded" …)` 即可重试；图谱腿降级同样视为「有未成功产物」，整篇重试是其修复手段 |
| D2 | 状态格悬停卡复用失败卡形态 | 降级行悬停出卡（降级说明 + 重试按钮；breakdown 行并入卡内）；干净 `ready` 行保持现有 Tooltip；行 ⋯/右键菜单同步挂 |
| D3 | worker 在途合并 | `submit` 命中在途/排队 → 登记 pending，任务收尾补跑一次（镜像 wiki runner busy/pending 先例）；双提交收敛为单次运行＋至多一次补跑（终态复检兜底） |

### 2.1 就绪判定（索引完整性）

**vector 腿判定**（`worker.py:417-421` 改）：

```
done  ⟺  total > 0 且 indexed == total（即零批次失败）
否则 → failed
  0 < indexed < total：索引不完整
  indexed == 0（total > 0）：索引无产出
  total == 0：无可索引内容（实测：文本路径不可达——10/10 最小样本均 ≥1 切片；视频「全空镜头」可达，见 `worker.py:820-839`；空解析已在更早路径 failed）
```

**文档终态**（`worker.py:495` 改）：解析、切片完成且 `vector == "done"` → `ready`；`vector != "done"` → `failed`，error 记可读原因（如「向量索引不完整：3/50 切片未入库」，沿用 error 子标记机制、不遮蔽既有 caption/graph 标记）。

不阻断 `ready` 的项（沿用现状）：caption 腿 `degraded`（发布明确标记的降级结果）、graph 腿 `degraded`（图谱为补充产物）。

管道顺序不动（软失败后照走图谱腿，仅终态判定改；已写入产物一律保留——「失败半截可见」与五处措辞档位一致；此点可翻案）。

`chunk_count = indexed` 语义保持（实际入库切片数）。

### 2.2 降级判定与重试门

- 降级判定：`any(v == "degraded" for v in (path_status or {}).values())`（D1=甲，任一腿）。wiki 键为库级读时注入、不在存储 `path_status` 内，不参与判定。
- 重试门（`knowledge_bases.py:246-247` 改）：`status == "failed"` 或（`status == "ready"` 且命中降级判定）→ 202；其余 409，detail 更新为「仅失败或降级文档可重试」。
- 受理逻辑主体不动（有 chunk 先擦、reset、入队），**视频专化一处**（真栈验收补口，2026-10-04）：视频重试走 resume 路、只补跑 pending 镜头 ⇒ 受理时把无图说的镜头（`failed`／`empty`）翻回 `pending`；`done` 保持（重刷已有图说属 recaption 职责，其「done/failed→pending、empty 保持」矩阵不动）。`empty` 必须在内：静默视频 + VLM 故障时 run#1 会把 caption 全败的镜头物化成 `empty`，不翻则重试永远停在零切片失败。重试使用保存的源文件与有效配置，全量重建正文/图片说明/切片/索引，覆盖原先未成功的图片说明（RFC L162 逐条对应）。

### 2.3 重试幂等与删除优先（RFC §5.2 定案）

**裁决：不新增处理代次字段。** 沿用并补强现有机制，全部以用例钉住：

1. 「不重复创建有效切片、不混用旧向量」= 受理先擦后写 + `_reparse_and_chunk` 入口再擦（幂等）；chunk id 确定性（`doc_id#%04d`）upsert；重试受理即删旧向量，检索面不含旧版本（无状态门，纯写入时序）。
2. 「不让旧任务覆盖新状态」= 终态复检（`worker.py:387-389`）＋ D3 防重入。
3. 「删除优先且不被重试完成覆盖」= 删除级联删行/向量 + `_require_alive` 检查点抛 `_DocumentDeletedError` 静默收尾（既有）；补「重试受理中删除」用例扩展（Task 9 同族）。

**备案（受理期 Qdrant 删除失败被吞）**：`knowledge_service.py:496-497` 删除失败仅 log 继续——与「不混用旧向量」的残留条件＝删除失败×新切片数更少；处置沿用现状（吞掉+记录、由失败结果外显；不新增受理期 503），下次成功重建（再次重试/全库）清除。

### 2.4 UI（D2=甲）

- 重试入口两处同步放宽：状态格悬停卡（D2 甲形态）与行 ⋯/右键菜单；判定统一用 `status === "failed" || hasDegradedLeg(doc.path_status)`。
- 干净 `ready` 行不出现任何重试入口；失败态既有形态零回归。

### 2.5 文案

- 409 detail 沿用英文风格：`Only failed or degraded documents can be retried`（现状 detail 为英文，不新增 i18n 键）。
- 失败侧 error 文案按情形 ≥2 条（zh，写入 `documents.error`）：索引不完整（N/M 切片未入库）、无可索引内容；零切片改 failed 必须携带可读原因，不得裸失败。
- 前端分类联动（失败侧）：`classifyDocError`（doc-errors.ts:8-19）加 pattern/kind + `docErrors` i18n（zh/en）覆盖上述文案；**终态结论文优先**于既有腿标记匹配——caption 降级串里的 `timeout` 不抢占索引终态原因（它才是 failed 的直接解释）。
- 降级悬停卡说明文案 1 条（zh/en）：**不点名具体腿**（如「部分产物未成功，可重试补齐」），具体腿由卡内 breakdown 行（已琥珀着色）指出；独立分支、不走 `classifyDocError`（避免落 unknown 兜底）；重试按钮复用既有 `retryDocument` 文案。

## 3. 硬约束

- 不扩状态机枚举（不加 `degraded` 状态）——降级= `ready` + 腿标记 + error 子标记（既有形状）。
- 检索侧不建状态门、不做原子发布、不读文档状态（RAGFlow 档已裁；五处措辞已对齐）。
- 不引入代次字段/条件写表结构。
- 失败文档已写入切片**保留可检索**（档位一致）；本对不得顺手清理（禁止「失败即清空」）。
- `chunk_count` 语义保持=实际入库切片数。
- A3 / A4 / A8 为验收锚；RFC §5.2 表行 1–4 逐行可映射到用例。

## 4. 验收

1. **后端单测（判定矩阵）**：vector 全成→`ready`；部分失败→`failed`（error 含 N/M）；全失败→`failed`；零切片→`failed`（若可达）；caption `degraded`→`ready` + 可重试；graph `degraded`→`ready`（D1 甲下同可重试）。翻面用例：`test_worker.py:374-387` 期望由「仍 ready」改为 `failed`。
2. **后端单测（重试门）**：降级文档 retry→202（含先擦后写调用序列）；`processing`/干净 `ready`→409；`test_api.py:686` 保持绿（上传态仍 409）＋降级新用例。
3. **后端单测（幂等）**：并发双提交收敛为单次运行（D3 甲：在途合并 + 收尾补跑至多一次）；重试受理中删除→不复活、无僵尸切片（Task 9 用例同族扩展）；重试后旧向量残留=0。
4. **后端单测（档位验证）**：失败文档已写入半截切片仍可命中（防将来加状态门）；受理重试后旧向量先删、后入队（调用顺序断言）。
5. **前端**：降级行出现重试入口（D2 定案形态）+ 干净行不出现 + 失败态零回归；`pnpm check` 零诊断、全量绿。
6. **门禁**：后端 knowledge 面全量 + ruff check/format 双净。
7. **真栈端到端（A3 语）**：隔离实例制造 VLM 降级 → 恢复 → 整篇重试 → 图片说明补齐、文档 ID 不变；重复点击重试不双跑（日志/提交计数为证）。
8. **RFC 对齐**：§5.2 表行 1–4、A3/A4/A8 每项 → 对应上述用例编号（写进 plan 收尾）。

## 5. 非目标

- 检索侧停查门、原子发布、处理中返回旧版本（已裁：RAGFlow 档）。
- 局部图片重跑（`trigger_recaption` 运维入口保持现状，不进本对）。
- 图谱腿降级/失败的单腿独立重跑入口（整篇重试已覆盖；不新增局部入口）。
- 失败自动重试与退避策略（重试=库拥有者的显式动作）。
- 视频腿特有动作（随整篇重试走同一管线，无独立分支）。