# 向量重灌与嵌入身份防护 —— 实施计划

- 成对 spec：`docs/superpowers/specs/2026-10-04-vector-reembed-and-embed-identity-guard-design.md`
- 日期：2026-10-04
- 状态：✅ **全对交付**（Task 0①–⑤ + Task 1–7 于 2026-10-04 交付；Task 1 尾项=存量盖章已执行（甲 4 库 + 乙 最小非空库）。✅ 全裁：D1=四类全量 / D2=甲按库一列 / D3=甲自动重建 / D 并入本对，2026-10-04 他拍）

## 范围与交接

四决策：D1 重灌（修数据，复用 `reindex_kb`）/ D2 记身份（结构修）/ D3 换模型触发重建（结构修）/ D4 失配检测（兜底/观测）。甲（查询侧链接加强）已淘汰不进本对。改动面=knowledge + `app/gateway/routers/rag_config.py` 保存路径 + 设置页提示；ragas/chat 链零改动。验收口径=小样本（3–6 题）对照，全量只在他点名时跑。

## 硬约束（执行期注意）

- 重建=只重嵌不重解析（`test_reindex.py:163` 是钉子，别碰）。
- 失败姿态=旧索引继续服务；不建空集合、不静默清库。
- 宽度三格口径不动；密钥轮换不进指纹、不触发。
- 门禁用 `backend/.venv/Scripts/python.exe`；basetemp 用仓外隔离目录、跑完删（见 [[env-induced-test-failures]]）。
- 工作树有别线未提交内容，提交按线拆、逐文件看 hunk。

## Task 0 — 落点核实

- [x] ① KB 表模型与迁移：`knowledge/store.py` / persistence models 里 KB 行的落点，`embedding_identity` 加列走迁移 0019 的写法（对照 0018 的先例）。（已核 2026-10-04：列落 `deerflow/knowledge/models.py` 的 `KnowledgeBaseRow`；迁移 `0019_kb_embedding_identity`（down_revision=`77df30935788`，`safe_add_column`/`safe_drop_column`）；**`store.py` 零改动**——`_row_to_dict` 是列无关的 `row.to_dict()`，新列自动出现在 get_kb/list_kbs；D2 写入走独立模块 `knowledge/embed_identity.py`（GraphStore/WikiStore 的 `store._sf` 先例），绕开 store.py 的别线未提交 hunk）
- [x] ② 保存路径触发点：`rag_config.py:452` `_embedding_signature` 现比较哪几个字段、api_key 排除法怎么落；同宽指纹差分支的插入点。（已核 2026-10-04：指纹=provider/model/base_url 三字段、api_key 明确排除；插入点=`put_rag_config` 的 `rebuilding` 分支，宽度差优先吸收）
- [x] ③ 重建入口现状：`knowledge_service.py:1726-1745` 库级重建/状态查询的签名与并发语义（`reindex_in_progress` 单飞），D3 触发复用它要不要过 `rag_migration` 的「先建后切」通道（宽度变更走的是 `start_migration`）。（已核 2026-10-04：`migrate_collections` 开头就 `drop_collections` ⇒ 同宽不可复用；D3 走独立 `services/rag_reembed.py` 逐库 `reindex_kb`，不过先建后切通道；同跑互斥由保存路径 409 承担）
- [x] ④ 受害者扫描：断言 `_embedding_signature`/保存响应/重建状态的既有用例清单（`tests/knowledge/test_reindex.py`、rag_config 相关），谁会被「指纹字段/新响应键」波及。（已核 2026-10-04：api 面 41 条受害者修夹具/豁免归零；`test_rag_config_save_probe.py` 6 条门禁期二波抓到并修；`test_rag_config_probe.py` 4 条=预存红，HEAD A/B 定性见 Task 3 门禁）
- [x] ⑤ D1 成本核实：四库实际待嵌文本数与批大小（`embedder.batch_size`），报数后再跑。（已核 2026-10-04：**5 库 1376 条文本 / 18.6 万字符 / 最长 2178**（chunks 94·entities 1055·wiki 224·cards 3），批宽=10（`qwen3.7-text-embedding-flash` 走 `DASHSCOPE_SAFE_BATCH_SIZE`）⇒ **163 次嵌入调用**（chunks 逐文档批 31 + entities 107 + wiki 24 + cards 1）；实测单批 10 条=1.75s ⇒ 串行约 **3–8 分钟**；≈13–16 万 token。明细=scratch `ragas-perf/d1_cost_inventory.py`（零调用点数））

## Task 1 — D1：全量重灌（执行 + 对照）✅ 2026-10-04 交付

- [x] 报成本（批次数/预计调用数）等他点头再动手。（账见 Task 0⑤；2026-10-04 他拍「跑 D1 全量重灌」）
- [x] 逐库跑 `reindex_kb`（4 库；单库失败不连坐、记录 last_run）。—— 实测 **5 库全过、0 失败、253.9s**：29 档 94 块 1055 实体 224 wiki 3 卡=**1376 条全量重嵌**（测试2 的 8/10=两档零块文档无物可嵌）；日志=scratch `ragas-perf/d1_reembed_run.log`。
- [x] 抽验：四类各抽样 cos(存库, 现算) ≥ 0.9（复用 scratch `vec_space_check.py` 口径）。—— **11 样本全 PASS，最差 0.997**（chunks/entities/wiki/cards 每类 2–3，跨库；stale 期同口径 ≈-0.008~0.03）。
- [x] 小样本 L1 前后对照：3–6 题（含 q011/q005/q009）逐题翻盘 + Δhit/Δrecall 报数（基线=本对前实测 0.471/0.314，见 spec §1）。—— 6 题（q001/q002/q006/q005/q009/q011）**前 0.167/0.167 → 后 1.000/1.000（Δhit/Δrecall=+0.833/+0.833）**；三道点名 miss 全翻盘、q006 对照守住、三腿全活（前值三腿全 0）；前后日志=`l1_pair_before.log`/`l1_pair_after.log`。
- [x] D2 身份写入落地后补跑一次：重建完成 ⇒ `embedding_identity` = 当前指纹。（✅ 2026-10-04 他拍「甲全库 + 乙只跑最小一库」执行完：**甲**=直接盖 4 库（测试1/测试2/测试3/评测冒烟，零 API 调用，凭 D1 cos 0.997/0 失败）；**乙**=最小非空库「验收图文档」真跑 `reindex_kb`（24 段文本 4.7s、docs 3/3、chunks 3+entities 14+wiki 7、0 失败）⇒ 章由机制自己盖上（重建前 None → 重建后=当前指纹）。回读 5 库全 OK。附带反证一次：Qdrant 容器停时重跑乙 ⇒ 3 篇全失败 ⇒ 完整性闸拒绝盖章（正确姿态）。盘点/执行脚本=scratch `ragas-perf/d2_stamp_inventory.py` / `d2_stamp_backfill.py`）

## Task 2 — D2 记身份 TDD（已裁：甲=按库列）✅ 2026-10-04 交付

- [x] RED：①入库完成/重建完成 ⇒ 身份字段=当前指纹（现状无字段 ⇒ 红）；②api_key 轮换 ⇒ 指纹不变（防误触发）。—— 5 例恰红：4× `KeyError: 'embedding_identity'`（列不存在）+ 1× `AttributeError`（embedder 无 `identity`）；②钉子=`test_the_identity_covers_exactly_the_space_fields`（换钥同身份 / 换模异身份）。
- [x] GREEN：迁移 0019 + 写入两处（新库入库 / `reindex_kb` 成功后）。—— 新增 `knowledge/embed_identity.py`（`embedding_identity`/`identity_from_rag`/`write_kb_identity`）+ `models.py` 加列 + `0019_kb_embedding_identity`（down_revision=`77df30935788`）；写入两处精确化（spec §2.2 已记）：①`reindex_kb` **全程完整**后（非终态跳过 / 文档失败 / 批次软失败任一 ⇒ 不写）②worker **库首完成文档**（软读 `.identity`；身份已记或已有其他终态文档 ⇒ 跳过）；`build_embedder` 按构建它的 rag 挂 `.identity`；**`store.py` 零改动**（`_row_to_dict` 列无关）。编码=紧凑 JSON 而非 `hash(...)` 速记——D4 要点名差在哪个字段（spec §2.2 GREEN 期定形）。每迁移一测先例补 `test_migration_0019_kb_embedding_identity.py`（加列遗留行 NULL / downgrade 掉列回环）。
- [x] neuter：拆「成功后更新」⇒ 恰红 A1；还原复绿。—— 实测四次拆解各恰红 1 条、受害者不相交：A 拆 `reindex_kb` 盖章⇒`test_reindex_stamps…`；B 拆 worker 盖章⇒`test_the_first_completed…`；C 拆完整性闸（`if complete`）⇒`test_an_incomplete_rebuild…`；D 拆首件闸（其他终态文档判据）⇒`test_an_incremental_document…`；还原后 7/7 复绿。
- [x] 门禁：knowledge 面 + ruff 双净。—— `tests/knowledge` + 迁移 0019 + `test_rag_config_api.py` 共 **1608 passed / 2 skipped / 4 failed（全环境红，非本对回归）**：`test_embed_missing_api_key`/`test_rerank_missing_api_key`=本机 `rag_config.json` 真钥经 `configured_rag_secret` 兜到 ⇒ 缺钥断言不抛；`test_parse_pdf_full_flow`/`test_token_read_from_env_never_from_caller`=env 真 MinerU token + 无 DNS（`getaddrinfo failed`）。四条都不经过本对改的文件（测试直接构造 `DashScopeEmbedder`/`DashScopeReranker`/parser）。ruff check/format 双净（新迁移测试格式化后重跑 2/2）。

## Task 3 — D3 换模型触发重建 TDD（已裁：甲=自动逐库重建）✅ 2026-10-04 交付

- [x] RED：①同宽、指纹差保存 ⇒ 触发逐库重建（甲）/响应带强确认要求（乙）；②宽度差 ⇒ 仍走既有先建后切迁移（回归钉住，不许被本对改道）；③重建进行中再保存 ⇒ 409、什么都没写。—— 6 例写红（状态空/扣住不翻/失败不翻/二次 409/轮换不触发/宽度不改道）；GREEN 期补第 7 例=凭据随身份扣（`test_the_credential_waits_with_the_identity`）。
- [x] GREEN：`_embedding_signature` 比较扩展 + 触发分支（复用 Task 0③ 的入口）。—— 新增 `app/gateway/services/rag_reembed.py`（hold→逐库 `reindex_kb`→原子 flip，镜像 `rag_migration` 姿态）；`rag_config.py` 触发+503/409+hold 通道+`reembed` 响应键与 GET 端点。GREEN 期两条定形（spec §2.3 已记）：①响应=报文件现状、目标挂 `reembed.target_*`（对齐 `migration.target_dimension`），旧「同响应即换兜底」契约改为「翻转即换、状态点名目标」，两条既有用例改向；②`embedding_api_key` 进 hold 集不进指纹（窗口里旧端点拿旧钥；轮换单独保存仍即时）。
- [x] neuter：拆触发分支 ⇒ 恰红；宽度回归例保持绿（受害者不相交）。—— 实测：拆触发=6 红（启动侧断言）、拆 flip=9 红（落地侧断言）；交集 5（两头都断的集成形）、①独有 1（失败不翻）、②独有 4（落地断言）；三条「不该触发」钉子双绿。与「不相交」预期有出入，按实测报。
- [x] 门禁：knowledge 面 + ruff 双净。—— `test_rag_config_api.py` 87/87；`test_rag_config_save_probe.py` 6 条（我的 503 受害者）修夹具转绿（服务占位+即时重建桩+settle）；`test_rag_config_probe.py` 4 条预存红 HEAD worktree A/B 定性（双向同 4 条同签名=「provider 需要 embedding_base_url」，09-25 端点必填线欠账，非本对回归、不进本对修）；ruff check/format 双净。

## Task 4 — D4 失配检测 TDD ✅ 2026-10-04 交付

- [x] RED：①库身份 ≠ 当前指纹 ⇒ 检索 API 响应带 `embedding_mismatch: true` + warning 日志（无密钥）；②一致 ⇒ 两样都没有；③查询不被拒绝（不锁定）。—— 3 例写红进 `test_recall_test_api.py`：①恰红（响应无键 `KeyError`），②③是缺键断言=先天空心绿（老规矩：牙在 neuter 补——B/C 两次反证专打这两条）；①同时钉「密钥字符串不出现在 caplog」（`sk-super-secret-never-log`）与「命中照常返回」（③不锁定）。
- [x] GREEN：读侧比对 + 响应键 + 文案（复用/升级 `embeddingChangeWarning`）。—— `embed_identity.py` 加纯函数 `identity_diff_fields(stored, current)`（三态：`None`=未盖章无主张 / 空元组=一致 / 非空元组=差异字段名）；`knowledge_service.recall_test` 返回前比对 `store.get_kb(kb_id).embedding_identity` vs `identity_from_rag(rag)`，失配 ⇒ 响应 `embedding_mismatch: true` + warning 点名 kb/差异字段；前端 `recall-test-panel.tsx` 复用 `zhCN.settings.functionalModels.embeddingChangeWarning`（零新键），`types.ts` 加可选 `embedding_mismatch`。后端 3/3、前端 dom 34/34、`pnpm check` 净。落点全在净文件（router/store 零改动——router 透传响应字典）。
- [x] neuter：摘比对 ⇒ 恰红；还原复绿。—— 三次拆解各恰红且受害者不相交：A 摘比对⇒`test_a_mismatched_library_flags…` 1 红；B 反向恒报（无条件插键）⇒两条缺键对照恰 2 红（空心绿补上牙）；C NULL 当失配（`identity_diff_fields` 对空 stored 返回主张）⇒`test_an_unstamped_library_claims_nothing` 恰 1 红。还原后 3/3 复绿。
- [x] 门禁：knowledge 面 + ruff 双净；前端 `pnpm check`（若文案动）。—— 文案复用未新增键但仍动了组件 ⇒ `pnpm check` 双净 + dom 34/34；`tests/knowledge` 面 **1522 passed / 2 skipped / 4 failed（411s，全环境红=既有 4 条账：`test_embed_missing_api_key`/`test_rerank_missing_api_key`（本机真钥兜到）+ `test_parse_pdf_full_flow`/`test_token_read_from_env_never_from_caller`（env MinerU token/无 DNS））**；ruff check/format 三文件双净。

## Task 5 — 门禁 + 文档 ✅ 2026-10-04 交付

- [x] 全量门禁：knowledge 面全绿（环境红按既有账登记）+ ruff 双净。—— Task 5 仅文档、零代码 delta ⇒ knowledge 面沿用 Task 4 同树数字 **1522 passed / 2 skipped / 4 failed（411s；环境红=既有 4 条账：embed/rerank 缺钥 + parser 两条）**；ruff check/format 全后端双净。
- [x] 文档：`backend/AGENTS.md` RAG 段补「嵌入身份与重建」一段；spec/plan 回填实测数字与提交链；受影响前端文案键表。—— AGENTS.md「Recall-test API」条后新增 `**Embedding identity & rebuilds**` 一段（身份列=三字段 JSON / 两处写入与 NULL 语义 / D3 自动重建与 503·409 / D4 读侧检测不锁定 / 已知缺口=delta 复走待拍）；spec §2.4 补「受影响前端文案键表」（**零新增键、零改动既有键**，唯一相关键=`embeddingChangeWarning` 逐字复用）。**提交链（本对 6 笔 + 本笔）**：`61a598218` spec+plan 草案 → `132e8d353` D3 同宽换模型自动重建 → `0eeda48fe` D1 全量重灌数字 → `c9bb5832f` D2 按库记身份 → `1fba23148` 存量盖章记录 → `779f8dd21` D4 失配检测 → 本笔 Task 5 文档。

## Task 6 — 真栈验收 + 收尾 ✅ 2026-10-04 交付

- [x] 真栈 A4：同宽换模型保存（改模型名→保存→改回，配置逐字节还原、md5 前后对照）⇒ 触发语义按待拍结果验证；完成后身份一致、L1 检索复常。—— 真栈（:3000 登录会话驱动 `PUT /api/rag/config`）`qwen3.7-text-embedding-flash → qwen3.7-text-embedding → 改回`（同厂商/端点/1024 宽 ⇒ D3 通道）：**触发语义=甲自动重建**坐实（响应 `reembed.state=running` + `target_model`，零确认）；**hold→逐库盖章→翻转殿后**的顺序两遍都对（看守日志：盖章 1→2→4→5 期间文件恒持旧值、5/5 才翻）；改回再触发第二遍（target=flash）。收口三样：**身份一致 5/5**（=原指纹逐字相等）、**配置 md5 逐字节还原** `4d92921e…`、**L1 6 题复常 hit/recall=1.000/1.000**（=D1 后值持平）。成本：2×163 嵌入调用（每遍约 4.5/3.75 分钟，LLM 零调用）。附带两条实测注记：①保存后探测（`_probe_after_save`）对窗口模型把关宽度/稀疏半边，不合格400 免写；②整对象 PUT 会把 10 个默认值物化进 `rag_config.json`（5 thinking 布尔 + parse 三件 + `qdrant_url` + `video` 块，零值变更）⇒ md5 必漂，**逐字节还原走备份回拷**（本次照此复原）；「GET→PUT 往返不物化默认值」可作后续小补丁候选。
- [x] 收尾：scratch 留 `ragas-perf/` 不进仓；工作树核对仅本对改动；提交链回填。—— scratch 只新增 `rag_config.a4-before.json`（含真实密钥，**不进仓**）；工作树核对=仅别线未提交件（`knowledge_bases.py`/`store.py`/`test_api.py`/README 等），本对 Task 6 零仓内文件改动。**提交链（7 笔）**：`61a598218` 草案 → `132e8d353` D3 → `0eeda48fe` D1 数字 → `c9bb5832f` D2 → `1fba23148` 存量盖章 → `779f8dd21` D4 → `efef6cc49` Task 5 文档。

## Task 7 — D 小补丁：graph_search 抽取 malformed JSON 兜底（✅ 2026-10-04 他拍并入本对）✅ 2026-10-04 交付

- [x] RED：`_extract_query_entities` 收到畸形 JSON ⇒ 按既有兜底路径走整句候选（现状抛/返回空的行为差异用例钉住）。—— 5 例写红进 `test_graph_search.py`：畸形形状三态恰 3 红（`{"entities": 5}` TypeError 抛死图路 / `{"entities": {...}}` 静默挖出垃圾名 `["x"]` / `{"entities": "PDF"}` 拆成 `["P","F","D"]`）+ 端到端（impl 级、真 Qdrant）恰 1 红（标量形状把整条图路抛死）；`{not json` → `[]` 是现状「返回空」半边=先天空心绿，当回归钉子留着（牙在三形状红上）。
- [x] GREEN：解析失败的防御（一行级）；不动抽取 prompt 与模型。—— `entities` 非列表 ⇒ warning + `[]`（与解析失败同一兜底，调用方拿整句当落点候选）；prompt/模型零改动。文件 29/29。
- [x] 门禁：knowledge 面 + ruff 双净。—— `tests/knowledge` **1527 passed / 2 skipped / 4 failed（402s；比 Task 4 面 +5=恰为本 Task 新增用例；环境红=既有 4 条账）**；ruff check/format 两文件双净。

## C 线去留判据（✅ 2026-10-04 他拍）

A（Task 1）完成后 3–6 题对照：「落上却空手」类（q011/q005/q009 型）**全翻盘 ⇒ C 转观察项**；仅剩多跳题仍 miss ⇒ 另立小对动 ④ 剪枝。

**判定（2026-10-04，Task 1 后测）**：q005/q009/q011 三道**全翻盘**（6 题样本 hit/recall 0.167→1.000）⇒ **C 转观察项，④ 剪枝不动**。
