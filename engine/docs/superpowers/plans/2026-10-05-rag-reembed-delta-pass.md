# 重建窗口 delta 复走 —— 实施计划

- 成对 spec：`docs/superpowers/specs/2026-10-05-rag-reembed-delta-pass-design.md`
- 日期：2026-10-05
- 状态：**决策已裁、待开工**（2026-10-05 他拍：D1=甲一遍 delta / D2=乙章归 delta 完整后 / ③=甲并入当重建通道加固；同日审查后追加：复走门槛=甲·指纹门，审查精化九条全采纳）

## 范围与交接

一件事：同宽换模型就地重建（D3 通道）翻转后对**动过的库**补走 delta 复走（`_content_mark` 指纹门同构宽度通道，没动过的库零嵌入），把「翻转前写入、主行走快照没覆盖」的行补进新空间，让 D2 的章=真相。**并入件 ③**：同通道的翻转写加固（replace 撞车**有界**重试 + 翻转失败落 `failed` 不留 `running`）。失败词汇定形：`failed` 只给 raise；软失败=succeeded+无章+D4 可见。与孤儿向量清扫对互补、与物化默认键补丁（`bd61109db`，已交付）无关。改动面=`rag_reembed.py` + `reindex_kb` 参数化（默认零变化）+ 盖章时序后移 + 写文件助手重试；查询路径、宽度通道、worker 写序零改动。

## 硬约束（执行期注意）

- `reindex_kb` 默认行为零变化：新参数 opt-in（`stamp` 默认 True），旧调用方（worker、手动重建 `knowledge_service.py:1755`）语义不动。
- 不动 hold/flip 语义、不动 `migrate_collections` 及其二遍（只抄它的指纹门与调用形，不抄 `_drop_documents_that_left`——in-place 删除走自己的路）。
- 失败如实：raise ⇒ 记日志 + 状态 `failed`（章留旧值/NULL，D4 可见）；软失败 ⇒ `succeeded` + 不盖章 + D4 可见。③同姿态：翻转写失败落 `failed`、replace 重试 3 次/50–100ms、耗尽按翻转失败。
- 门禁用 `backend/.venv/Scripts/python.exe`；basetemp 用仓外隔离目录、跑完删（见 [[env-induced-test-failures]]）。在案 flake 两条（图谱并发、rag_config 翻转竞态族——后者正是 ③ 的病）单跑复绿即可归因。
- 工作树有别线未提交内容，提交按线拆、逐文件看 hunk。

## Task 0 — 落点核实

- [x] ① `reindex_kb` 签名与语义（已核 2026-10-05 审查）：`include_non_terminal=True`（reindex.py:117）=整库复走、含非终态文档（:155 的跳过闸只对默认形生效）；宽度通道二遍（dimension_migration.py:141-165）带**指纹门**——`_content_mark` 基线（`get_kb_content_stats` 四信号 + 文档 id 集）对比，没动过的库零嵌入跳过；门不受重建自身写入污染（`index_chunks`/`update_document_status` 只碰 documents 表）。实体信号盲区（count only、表无时间戳列）已在 spec §2 登记。
- [x] ② 盖章点参数化（已核 2026-10-05）：写点唯一=reindex.py:198-201（`if complete:`），`stamp` 参数=一行闸；受害者=零（默认 True 全部旧调用方语义不动），钉子=test_reindex.py 的盖章三例（含新增 `stamp=False` 例）。worker 首件闸不动。
- [x] ③ 插入点（已核 2026-10-05 审查）：翻转写在 try/except 外=rag_reembed.py:145-146（③ 半二实锤）；delta 循环插在 flip 后、按指纹门逐库；失败记账落 `_Run`（`failed` 只给 raise）；重跑路径 `reembed_libraries` 天然再走一遍（门基线随新 run 重拍）。
- [x] ④ 受害者扫描（已核 2026-10-05）：通道测试全 stub `reembed_libraries`（`test_rag_config_api.py` 两 fixture + `test_rag_config_save_probe.py` 一处）⇒ 新增两个 seam 后这三处要跟着扩 stub（GREEN 期已做）；`stamp` 参数默认 True ⇒ 零受害；`_stub_reembed` 返回形 int→dict 一并改。
- [x] ⑤ ③ 竞态面（已核 2026-10-05 审查）：`atomic_write_rag_config`（rag_config_file.py:314，tmp+fsync+`os.replace` :347、无重试）；生产调用方唯一=`write_rag_config`（:301）⇒ 重试落助手、所有写方受益；并发读方=load（:226）+ 热重载签名检查（file_signature.py:49）——Windows 打开句柄无 FILE_SHARE_DELETE ⇒ replace 报 13。孪生 `atomic_write_models_config` 同病已登记（spec §6）。

## Task 1 — delta 复走 + 盖章后移 + 指纹门 TDD（D1=甲、D2=乙、门槛=甲）✅ 2026-10-05 交付

- [x] RED：①主行走完成不写身份、delta 完整走完才写；②快照缝文档 ⇒ delta 补进新空间；③门槛：未动库零嵌入、动过库整库复走；④delta raise ⇒ 旧章+`failed`、软失败 ⇒ `succeeded`+无章。—— **6 例恰红**（新文件 `tests/knowledge/test_reembed_window_delta.py` 5 例 + `test_reindex.py` 的 `stamp=False` 1 例 TypeError），红因逐条核过：事件序 `['stamp','flip']` / 窗口句 0 命中 / 复走计数 1≠2 / 状态 succeeded≠failed / 软失败 0 命中。
- [x] GREEN：`reindex_kb` 加 `stamp`（默认 True）+ `rag_reembed` 三件（`collect_window_marks` 基线 / `reembed_window_delta` 复走+盖章 / `_run` 基线→行走→翻转→delta）+ `ReindexReport.complete` 外露 + docstring 两调用方（审查 6）。**GREEN 期翻出真缺口并当场补**：门槛跳过的库没人盖章（章只在 delta 走完落、而未动库恰被跳过 ⇒ 章永不落）⇒ 修法=主行走交出逐库完整性判词（`reembed_libraries` 返回 `dict[str, bool]`，契约一改、三处 stub 跟上），delta 对「未动+完整」的库直接盖章；补第 7 例对照 `test_an_untouched_library_that_walked_incompletely_stays_unstamped`（未动≠均匀）。
- [x] neuter：四拆各恰红且受害者按实测报（与「不相交」预期有出入，同 D3 对先例）——A 拆 delta 复走 ⇒ 4 红（快照缝/门槛/raise/软失败）；B 拆盖章后移（主行走恢复 stamp）⇒ 3 红（事件序/raise/软失败）；C 拆指纹门（基线恒等）⇒ 4 红（同 A 集）；D 拆完整性判词（f 补牙）⇒ **恰 1 红**（未动+不完整例）。还原后 27/27 复绿。
- [x] 门禁：knowledge 面 + API 两族 + ruff 双净。—— 窄面 **130 passed**（delta 7 + reindex 20 + api 87 + save_probe）；knowledge 面 + API 两族 **1644 passed / 2 skipped / 5 failed（419s）**——4 条=既有环境账（embed/rerank 缺钥 + parser 两条），1 条=在案 flake（`test_concurrent_results_match_serial_including_order` 图谱并发，本日单跑 2/2 复绿）；ruff check/format **6 文件双净**。

## Task 2 — ③ 翻转写加固 TDD ✅ 2026-10-05 交付

- [x] RED：①翻转写抛异常 ⇒ 状态落 `failed` 不留 `running`、章不落；②replace 撞车一次 ⇒ 重试后落盘；③重试耗尽 ⇒ 抛出且恰好 1 首试+3 重试。—— **3 例恰红**，红因核对：状态 `'running' != 'failed'`（正是 409 死锁的病灶）/ `PermissionError` 直接抛出 / `len(calls) 1 != 4`。①落 `tests/knowledge/test_reembed_window_delta.py`（翻转写加固节），②③落 `tests/test_rag_config_file.py`（atomic 写节）。
- [x] GREEN：`_run` 翻转写纳入 try/except 失败记账（失败 ⇒ `failed` + 日志点名「文件仍旧模型、delta 未跑」）+ `rag_config_file._replace_with_retry`（3 次重试、50ms 退避、只接 `PermissionError`——病灶是 Windows EACCES；无界重试=常驻读方变悬挂）。
- [x] neuter：三拆按实测报——N1 摘失败记账 ⇒ **恰 1 红**（翻转例）；N2 摘重试 ⇒ 2 红（②+③计数，同源）；N3 上限改 2 ⇒ **恰 1 红**（上限例）。还原后窄面 86/86 复绿。
- [x] 门禁：同 Task 1 面 + `test_rag_config_file.py` 族。—— 窄面 **86 passed**（delta 8 + reindex 20 + rag_config_file 58）；全面 **1704 passed / 2 skipped / 4 failed（459s）**——4 条全环境账（embed/rerank 缺钥 + parser 两条），在案 flake 未响；ruff check/format **4 文件双净**。

## Task 3 — 门禁 + 回填 + 登记 ✅ 2026-10-05 交付

- [x] 全量门禁 + spec/plan 回填实测数字与提交链；`backend/AGENTS.md` 的「Embedding identity & rebuilds」段更新。—— 数字逐任务回填（Task 1 全面 1644/2/5、Task 2 全面 1704/2/4，4 条环境账、flake 一次响一次未响）；AGENTS.md「Known gap」句已换 delta 语义 + ③ 姿态 + 尾部残余。**提交链**：`86c1deba6` ①草稿成对 → `fd7348ee1` 三裁回填 → `7a0eb7dbf` 审查裁定十条 → `86c402173` Task 1 复走+盖章后移 → `94e3522b3` Task 2 翻转写加固 → 本笔 Task 3 文档。
- [x] 登记三件落文档（审查 7/8/9）+ 尾部残余。—— 已在裁定笔落 spec §6（孪生竞态=只修 rag 路径 / 清扫 busy 面=可选 / 进度观感）与 §4·§5（单文档嵌入时延=尾部残余、与宽度通道同口径）。

## Task 4 — 真栈验收（审查 5）✅ 2026-10-05 交付

- [x] 触发重建（改模型名→保存）→ 窗口里塞一篇文档 → 验：delta 把它补进新空间（cos 抽验复常）、章最后落、D4 静默；顺手看一眼 `reembed.state` 全程不卡。配置逐字节还原（`cp`+md5 老配方）、临时文档/库删净、scratch 留 `E:\app-model\deer-flow-scratch\`。—— **2026-10-05 真栈 A5 全过**：①触发 PUT flash→`qwen3.7-text-embedding` 回 `state=running`+`target_model` 点名、文件仍报旧模型（hold 契约活证）；②窗口句（临时库 `90ebf314…` + 文档 `d3ac28b1…`，02:56:29 时 `ready`）**六库章全 withheld**（=主行走 `stamp=False` 活证）；③翻转帧 **03:00:19**：配置翻 + 六库章齐落（watcher「config flipped and every kb stamped」）；④cos 抽验：窗口句重建中 0.999（旧空间、洞的形状）→ delta 后 **1.000 fresh**、存量样本同 1.000，`现算侧模型 = qwen3.7-text-embedding`；⑤D4 `recall-test` 临时库+测试1 双 `mismatch: false`、`reembed.state=succeeded`；⑥还原遍 03:02:40→03:06:00 回 flash，配置 md5 `4d92921eba884f167429edf9cab78c2f` 与备份**逐字节相同**（顺手活证 ② 剥离补丁：整对象往返两遍零物化）、临时库+文档行删净（剩原 5 库）。
