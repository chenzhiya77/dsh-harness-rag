# RAG 知识栈持有实例随配置换新 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-05-rag-store-refresh-design.md](../specs/2026-10-05-rag-store-refresh-design.md)
**Status:** ✅ 全交付（2026-10-05）：D1=甲、D2=甲；Task 0–4 完成（真栈 9/9；门禁 1574/4/2 零新增）；提交链见 Task 4。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 修法 | ✅ 已裁=甲：取值口自检换新（worker + service） | 乙（重建 worker/service）、丙（迁移收尾换新）、架构级 |
| D2 卡片竞态 | ✅ 已裁=甲：点龄判据（payload `updated_at` + 宽限 60s） | 乙（写入侧自检）、丙（两轮确认）、丁（改序） |

## 硬约束

- 配置未变 ⇒ 取值口同一实例；不新增配置面；假体直通；迁移自身代次 store 钉死宽度不动；只动取值口。

## Task 0 — 落点核实

- [x] ① 取值点清单：`worker.py` 里 `self._vector_store` 全部使用点（~10 处）与既有测试对它的读写（有无直接赋值/identity 断言——上一对 wiring 测试有一条 `is worker._vector_store`）；`knowledge_service.py` 里 `self.vector_store` 使用点与 router 侧读法（`rag_config.py:686`）。
- [x] ② `KnowledgeVectorStore` 复用 client 换宽度的可行性：ctor `(url=None, client=None, collection_prefix="kb", dense_size=…)` 现状、url 未存的问题（补记）、测试里 `_FakeQdrant` 的 client 形状（`test_vector_store_dimensions.py`）。
- [x] ③ 自检读配置的代价与路径：`get_app_config()` 签名缓存现状、`effective_dimension(rag)` 是否可直传；`vector_store.py` 内惰性 import 先例（`get_vector_store()`）。
- [x] ④ 注入面清单：fake 直通（MagicMock/FakeVectorStore/SimpleNamespace）+ **真实例逐点列**（`test_e2e_smoke.py:106` / `test_phase2_smoke.py:86` 的 `client=` 构造、`test_vector_store_dimensions._store(client=…)`）——按「url 未知直通」规则应全部直通，逐点确认。
- [x] ⑤ 真栈脚本改造点：`E:/app-model/deer-flow-scratch/stale-store/e2e.py`（上一对钉死用）——翻转后把「startup 实例直用」改为「经取值口取」再入库；另加 **①相**改造点（`service.store.update_manual_card` 包闸门以撑开 [upsert → 行写] 窗口）。
- [x] ⑥ ①落点：`ManualCardUpsert` 构造点（create / update 两处 upsert）与 payload 消费面（hydration 读行不读 payload——加键零影响）；`sweep._sweep_manual_cards` 两段判据位置；既有 D5 用例对"无 `updated_at`"的依赖（应全部照旧可删、零改动）。

**实测（2026-10-05，Task 0 · 只读）**：

- ① ✓ worker `self._vector_store` **12 处**（`:261` init_collections / `:429` sweep_round / `:432` sweep_generations / `:509` 入库 / `:540`·`:574`（视频/重跑路）/ `:688-689` 删除 / `:1057`·`:1068-1069` 切片编辑 / `:1096`）；service `self.vector_store` **~26 处**（删除族、`:746` 重嵌切片、`:955`/`:1044` 卡片、检索三路 `:1112/1119/1135`、投影 `:1393`、wiki/reindex `:1725/1761/1769`）；router 只有 `rag_config.py:686` 一处读。全部为属性取值 ⇒ 属性化**零调用点改动** ✓。测试交互面全是读 mock 方法（`service.vector_store.delete_by_doc` 类断言）——mock 直通后原样 ✓；无对两属性的直接赋值（唯一 `test_api.py:732` 是往 mock 上赋方法）✓。
- ② ✓ ctor 现状 `(url=None, client=None, collection_prefix="kb", dense_size=…)`——**url 未存**（只存 `_client/_prefix/_dense_size`）；`_FakeQdrant` 是极简 client 双（collection_exists/get_collection/create_collection/create_payload_index）——换新构造不需要它做任何调用 ⇒ 可直接用作换新单测的 client ✓。
- ③ ✓ 签名=共享 `file_signature.get_config_signature` 的 `(mtime, size, sha256)`、**每次全文件哈希**（注释写明防"同秒同长换内容"）——rag_config.json 极小、量级可忽略；`effective_dimension(rag=None)` 可直传 ✓；`vector_store.py` 已有惰性 import 先例（`get_vector_store()` 内）✓。
- ④ ✓ 全仓真实例注入面 **8 文件全为 `client=` 构造**（graph/tools/wiki conftest、`test_vector_store`、`test_vector_store_dimensions`、`test_indexer`、`e2e_smoke`、`phase2_smoke`）⇒ 按「url 未知直通」规则 **100% 直通、零测试扰动**；fake 面（MagicMock/FakeVectorStore）经 isinstance 直通 ✓。
- ⑤ ✓ 脚本在；①相改造点=给 `service.store.update_manual_card` 包闸门（`knowledge_service.py:1040` 的调用处）撑开窗口 ✓。
- ⑥ ✓ `ManualCardUpsert` 构造点 = **3**（`knowledge_service.py:955` / `:1044` / `reindex.py:300`）；payload 消费面 = hydration 只读 `payload["card_id"]`（`wiki_search_tool.py:83`）+ 投影按 id 取行——**加键零影响** ✓；`_sweep_manual_cards` 两段判据在位（`:183` 候选 / `:186` 复核，`_card_is_live` `:173`）；既有 D5 用例夹具点均无 `updated_at`（新规则下=老、照删）⇒ **零改动** ✓。

## Task 1 — 取值口自检换新（TDD）

- [x] RED：宽度差 ⇒ 换新且复用同一 client、集合名带新宽度；一致 ⇒ 同一实例；url 差 ⇒ 重建；假体直通；`url=None`（client 注入）⇒ 直通不重建（**死循环式换新回归钉**）；worker 与 service 两取值口各一（真 store + 配置桩换新、fake 原样）。
- [x] GREEN：`vector_store.py` 补 `dense_size`/`url` 访问器（ctor 有 client 时也记 url）与 `refreshed_store(held)`（判别含 url-未知直通；换新构造带 url）；`worker._vector_store` 与 `service.vector_store` 变自检属性（存量字段改名，调用点零改动）。
- [x] neuter：关自检（恒返回 held）⇒ 换新用例恰红；还原复绿；门禁 + 实测回填。

**实测（2026-10-05，Task 1 · 已实现未提交）**：

- 用例：`tests/knowledge/test_store_refresh.py`（新文件，9 例）——宽度差换新复用同 client / 一致同一实例 / url 差重建 / 假体直通（不读配置）/ `url=None` 直通（不读配置，**死循环回归钉**）/ worker 与 service 两取值口各一（真 store + 配置桩换新、fake 原样）。RED 首跑 = ImportError；GREEN = 本文件 9 绿 + 受影响面（test_sweep / test_worker / test_api）共 **127 passed**；neuter（自检判定恒真）→ **恰 4 红**（宽度差 / url 差 / 两取值口；一致、假体、url-None 五例不受影响）→ 还原复绿。
- 落点：`vector_store.py`（ctor 记 `_url`；`dense_size`/`url` 属性；`refreshed_store(held)`——判别=真实例且 url 已知，仅宽度差复用 client、url 差重建、换新打 info 日志）；`worker.py`（`_vector_store` 属性自检，存量字段改名 `_vector_store_held`，12 处调用点零改动）；`knowledge_service.py`（`vector_store` 属性同款，~26 处调用点与 router 读法零改动）。
- 门禁：`tests/knowledge/` 全量 **1570 passed / 4 failed / 2 skipped**（438.50s；+9 = 本 Task 新用例，4 条全为既有环境条件红）⇒ 零新增；ruff check + format 双净（四文件）。

## Task 2 — 卡片点龄判据（①，TDD）

- [x] RED：flag 关 + 新点（`updated_at≈now`）⇒ 保留（**当前代码会删——即合成交错的最小复现，修前红**）；flag 关 + 老点 ⇒ 删；无 `updated_at` 键的存量点 ⇒ 删；行缺 + 新点 ⇒ 保留；已删库组（kb 行无）不受龄门影响 ⇒ 照清。
- [x] GREEN：`ManualCardUpsert` 加 `updated_at` + payload 键；create / update 两处 upsert 传 `time.time()`（重嵌 `reindex.py:300` 留默认 `0.0`=老）；`_sweep_manual_cards` 收集段加龄门（`_CARD_ORPHAN_GRACE_SECONDS = 60.0`；无键=老）。
- [x] neuter：关龄门（恒可删）⇒ 新点保留用例恰红；还原复绿；门禁 + 实测回填。

**实测（2026-10-05，Task 2 · 已实现，随本笔提交）**：

- 用例（`test_sweep.py` +4）：新点保留（flag 关 / 行缺两条，**修前红——合成交错最小复现**）、老点删、无键存量删（既有用例覆盖）、已删库组照清。RED 首跑 **2 红 / 17 绿**（恰两条新点保留）；GREEN 三文件（sweep + manual_knowledge_api + api）**90 passed**；neuter（关龄门）→ **2 红 / 17 绿**（恰两条新点用例）→ 还原复绿（19/19）。
- 落点：`sweep.py`（`_CARD_ORPHAN_GRACE_SECONDS = 60.0`；`_sweep_manual_cards` 收集段龄门，无键=老）；`vector_store.py`（`ManualCardUpsert.updated_at: float = 0.0` + payload 键）；`knowledge_service.py`（create / update 传 `time.time()`；重嵌路留默认）；`reindex.py` **零改动**（默认即老）。
- 门禁：`tests/knowledge/` 全量 **1574 passed / 4 failed / 2 skipped**（413.16s；+4 = 本 Task 新用例，4 条全为既有环境条件红）⇒ 零新增。

## Task 3 — 真栈验收

- [x] 隔离实例（stale-store 场景改造）：真迁移三步 + 不重启 → 经取值口入库成功、点落在新代、检索可读；重启对照仍过；**①相**：闸门撑开 [upsert → 行写] 窗口、跑真 `sweep_round` ⇒ 新点不被删；放闸后行开、点仍在。
- [x] 收尾：容器/进程清理并核验。

**实测（2026-10-05，Task 3 · 隔离实例 9/9 全绿）**：

- 隔离面：临时 Qdrant 容器 `kb-stale-store-qdrant`（:6399）+ 仓外 scratch 根（`stale-store/`）；脚本 `stale-store/e2e_fixed.py`（真迁移三步 + 真 `sweep_round` + 真 `update_manual_card` 闸门；嵌入器用桩——网络调用与本对无关）。**零触碰**他的 6333 / 真配置。
- 结果 **9 PASS / 0 FAIL**：②（翻转前经取值口入库 ✓；翻转后旧代在场 / 已删两态经**取值口**入库均成功、`store_width` 已换 1536、点在新代可读；重启对照 ✓）；①（闸门撑开窗口时点已写、行仍关；同一轮真 `sweep_round` 下**新点存活**、老 flag-off 残留**照收**（龄门没关掉 D5 的对照组）；放闸后行开、点仍在）。
- 收尾：容器已 `docker rm -f` 并核验（6333 照旧）；scratch 脚本/目录留 `E:/app-model/deer-flow-scratch/stale-store/` 待他点名清理。

## Task 4 — 文档与收尾

- [x] `backend/AGENTS.md` 迁移段补一句（翻转后持有实例随配置换新，取值口自检）；清扫条补一句（D5 判据含点龄宽限）；spec/plan 状态行与实测回填。
- [x] 提交链回填。

**实测（2026-10-05，Task 4 · 纯文档）**：

- `backend/AGENTS.md` 迁移段补「两取值口每次读取自检 `(qdrant_url, 声明宽度)` 并原地换新（spec 2026-10-05 D1）」；清扫条 D5 判据补 60s 点龄宽限（新点不得回收、无键=老）。
- spec / plan 状态行 → ✅ 全交付；提交链见下。
- **提交链**：`f2ec4578b`（spec+plan 起草）→ `b495041e9`（Task 1）→ `3b64fa9a1`（Task 2）→ `ff735dcaa`（Task 3）→ `e301d844f`（收尾）。
