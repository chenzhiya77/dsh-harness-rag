# 向量重灌与嵌入身份防护 —— 设计

- 日期：2026-10-04
- 状态：**已完工**（2026-10-04）——已裁全甲：D1=四类全量重灌 / D2=按库一列 / D3=自动逐库重建 / D 并入本对（均 2026-10-04 他拍）；Task 0–7 全交付，实测与提交链见成对 plan
- 成对计划：`docs/superpowers/plans/2026-10-04-vector-reembed-and-embed-identity-guard.md`

## 1. 问题

**症状**：L1 检索 hit 0.471 / recall 0.314 长期低位；graph_search 17 题只中 2 题。

**机制证据链（2026-10-04 三层探针终局，scratch `ragas-perf/l1_*` 四支，不进仓）**：

1. 查询侧链接（①抽取 5/6 正常、③落点 4/6 过）与挂接（golden 挂 14/22 实体、离落点 0 跳）**全好**；
2. 死点=⑤证据评分近零噪声（golden 排 12/18、全池分数 ±0.04）；
3. **向量空间三方对照实锤**：cos(存库向量, 现算同文本向量) ≈ **-0.008/0.030（正交）**，cos(查询, 现算) = 0.712/0.475（正常水平），Qdrant dense 与本地评分逐位一致 ⇒ **打分器无罪，`kb_chunks`/`kb_wiki_entries`/`kb_manual_cards` 存量向量是旧嵌入模型灌的（同 1024 维、不同坐标系）**。

**时间线（写入代差）**：

| 时间 | 事件 | 向量空间 |
|---|---|---|
| 早期（测试1 入库） | chunk 94 / wiki 225 / 手工卡 3 写入 | 旧空间 A（cos≈0） |
| 10-02 之前的某时点 | 有效嵌入模型变为现 `qwen3.7-text-embedding-flash`（查无身份记录，无法定因） | 新空间 B |
| 10-02 22:06 | 新库入库 chunk | B（cos 0.999–1.000 ⇒ **非服务端漂移**） |
| 10-02/03 | 图谱抽取重跑重嵌实体 1055 | B（cos 0.998，**纯属运气**） |
| 每次查询 | 查询侧现算问题向量 | 永远 B ⇒ 与 A 全对不上 |

**波及面**：graph_search ⑤评分=随机排名；hybrid_search dense 预取同为噪声（靠 sparse 半边撑 RRF，解释向量腿仅 5/17）；chat 与评测共用同一批检索工具，两边同损。

**防护缺口（修正口径：三层宽度守卫已有，见 RFC v3 §2.3 已实现）**：

1. **无身份记录**——向量/库不记「哪代模型灌的」，混用只能靠逐点余弦破案；
2. **同宽换模型只提示不重建**（`embeddingChangeWarning`，`zh-CN.ts:1804`）——提示被忽略即长期混用，本案实况；
3. **服务端同名漂移无感知**——保存期探测只在保存时跑，漂移发生在保存后零提示。

## 2. 设计（四决策；修法逐项标「修数据/结构修/兜底」）

### 2.1 D1 = A：全量重灌向量（修数据；✅ 他裁「四类全量含实体，不搞好的就不动」）

- 机制**复用 `deerflow/knowledge/reindex.py::reindex_kb`**（四集合全覆盖、确定性 point id 原地覆盖、单篇失败不连坐、只重嵌不重解析）；不新造轮子。
- 范围=全部 4 库跑一遍：`kb_chunks` 94 + `kb_wiki_entries` 225 + `kb_manual_cards` 3 + `kb_entities` 1055 ≈ **1377 段文本向量化**（批量接口）。动手前按实际批次报数。
- 「实体当前 fresh」不作免重灌理由（运气不是防护）；重嵌实体无害且让四类同代。

### 2.2 D2：写入记身份（结构修；✅ 已裁甲=按库一列）

- 落点：库级身份字段（KB 表加列 `embedding_identity`，迁移 0019；精确落点 Task 0 核实），值=**嵌入指纹 `hash(provider, model, base_url)`**——不含 api_key（轮换密钥不触发，沿 §2.3-④）、不含宽度（宽度已有独立轴）。
- 写入时机：①`reindex_kb` 全程成功后更新；②新库首次入库完成时写入。
- 裁定记录：粒度=**甲=按库一列**（2026-10-04 他拍）；乙=按集合记不做（重建按库、造不出混代，收益低）。
- 裁定记录（2026-10-04 GREEN 期定形）：**编码=紧凑 JSON `{"base_url":…,"model":…,"provider":…}`（`sort_keys`+无分隔空格）而非 `hash(...)` 速记**——结构化才能让 D4 的 warning 点名「差在哪个字段」（§2.4 要求）；空串与 `None` 归一同一值。api_key、宽度继续不进（前者沿 §2.3-④、后者已有独立轴）。
- 裁定记录（2026-10-04 GREEN 期定形）：两处写入精确化——①`reindex_kb` **全程完整**才写：任一非终态文档跳过 / 文档失败 / 批次软失败（`indexed < total`，四类同判）⇒ 不写，**NULL=未知**而非「当前」；②worker 在**库的首个完成文档**写（前提=身份未记 且 无其他终态文档），增量文档永不覆盖遗留库的 NULL。身份取自**真正产出向量的那个 embedder**（`build_embedder` 按构建它的 rag 挂 `.identity`，对迁移的目标 embedder 同样成立）；读取姿态分两档：`reindex` Protocol 强要求、worker 软读（拿不到=不声明）。宽度迁移的 delta 重建同样按①盖章。

### 2.3 D3：换模型触发重建（结构修；✅ 已裁甲=自动逐库重建）

- 触发条件（在 `_embedding_signature` 既有比较上扩展，`backend/app/gateway/routers/rag_config.py:452`）：**宽度差 ⇒ 沿用现有先建后切迁移（不动）；同宽但指纹差 ⇒ 本对新增触发**。
- 裁定记录：语义=**甲=自动逐库重建**（2026-10-04 他拍）：与宽度变更的「全流程不需要手动重建」对齐；服务不在线/已有重建在跑 ⇒ 沿现有 503/409 姿态拒保存，什么都不写。乙=强确认弹窗+一键重建不做（「忽略提示」的旧伤口不保留）。
- 重建复用 D1 同一入口（`reindex_kb` / `knowledge_service` 的库级重建，`knowledge_service.py:1726-1745`）。
- 裁定记录（2026-10-04 GREEN 期定形）：**响应=报文件现状**，目标挂 `reembed.target_provider/target_model/target_base_url`——hold 期间 PUT 响应报的还是生效值（宽度通道同款：`migration` 也是响应报旧宽度、`target_dimension` 报目标），理由=**记录必须等于生效值**（沿 effort 对裁定）且 `RagConfigResponse` 是 GET/PUT 共用读形状。旧契约「同一次响应里兜底跟着新 provider 换」（`test_embedding_secret_env_source_follows_the_selected_provider`）在延迟翻转下改为「**翻转即换、状态点名目标**」——两条既有用例按此改向，弯本身有钉子（`test_a_model_change_defers…` 断言响应报旧值+状态带目标）。
- 裁定记录（2026-10-04 GREEN 期定形）：**凭据跟身份一起扣**——`embedding_api_key` 进 hold 集、仍不进指纹。窗口里旧端点必须还拿得到旧钥，不留「旧端点+新钥」拼接态（换厂商+贴新钥正是本通道的主用例）；轮换单独保存仍即时生效（不触发重建，那半不动）。分类=结构修（`test_the_credential_waits_with_the_identity`）。
- 残余风险注记（2026-10-04 Task 2 发现，待拍）：D3 的就地重建**没有**宽度通道的 delta 复走（`migrate_collections` 的 `include_non_terminal=True` 二遍）⇒ 重建窗口内新入库/未跑完的文档在翻转后仍留旧空间向量（增量腿读的是窗口里的旧配置）。D2 盖章规则不会替它遮掩（库身份已记，不重写），D4 能看见；修法=翻转后每库补一遍 `reindex_kb(include_non_terminal=True)`（`rag_reembed` 小改），建议并入 Task 5，不进 Task 2。

### 2.4 D4：失配检测（兜底/观测）

- 读侧比对 `kb.embedding_identity` vs 当前配置指纹：不一致 ⇒ `logger.warning`（点名库+差异字段、无密钥）+ 检索 API 返回 `embedding_mismatch: true`，设置页复用/升级现有提示文案。
- **不拒绝查询**（沿「修法收敛、不锁定」：混用可查、只是质量不保证）；本项与 D3 是「触发重建」+「事后仍可见」的两层。
- 裁定记录（2026-10-04 GREEN 期定形）：**NULL=不做声明**——身份未记（或不可解析）的库既不说失配、也不说一致：响应无 `embedding_mismatch` 键、无 warning。判词三态由 `identity_diff_fields` 分开：`None`=无主张（未盖章）/ 空元组=一致 / 非空元组=失配且点名差异字段。钉子=`test_an_unstamped_library_claims_nothing`。
- 裁定记录（2026-10-04 GREEN 期定形）：**面=只在检索测试 API**——`KnowledgeService.recall_test` 响应加 `embedding_mismatch: true`（router 透传零改动，绕开 `knowledge_bases.py` 别线未提交 hunk）；chat 工具输出不带标记（这是给调试面板的观测面，不进对话）。warning 日志点名 kb_id + 差异字段（`provider/model/base_url` 以 `/` 连接），密钥永不进日志（用例钉住）。
- 裁定记录（2026-10-04 GREEN 期定形）：**文案=逐字复用设置页 `zhCN.settings.functionalModels.embeddingChangeWarning`**，不新增 i18n 键；落点=召回测试面板（`recall-test-panel.tsx`，`role="alert"` 红字），缺键/一致/未盖章都不显示（前端用例钉住复用同一条文案）。
- 残余风险注记：同名漂移（服务端换代、配置未动）D2–D4 抓不到——周期抽样探测登记为非目标。
- 受影响前端文案键表（Task 5 回填）：**零新增键、零改动既有键**。唯一相关键=`zhCN.settings.functionalModels.embeddingChangeWarning`（设置页原有），D4 在召回测试面板**逐字复用**同一键；后端新增响应键 `embedding_mismatch`（布尔、缺键=不做声明，`RecallTestResponse.embedding_mismatch?: boolean`）不属于文案键。

## 3. 硬约束

- **重建=只重嵌不重解析**（`test_reindex.py:163` 已钉，不许破坏）。
- **失败姿态不变**：重建/探测失败 ⇒ 旧索引继续服务，不建空集合、不静默清库。
- **宽度三格口径不动**（宽度差仍走先建后切；本对只补「同宽换模型」轴）。
- eval_runs / chat 语义零变化；改动面=knowledge + 配置保存路径 + 设置页提示，ragas 链不动。
- 计日/提示不含密钥与正文；scratch 脚本不进仓；提交不带别线未提交内容。

## 4. 验收

1. **A1 重灌抽验**：重灌后四类各抽样 cos(存库, 现算) ≥ 0.9。
2. **A2 小样本 L1 前后对照**（3–6 题，含 q011/q005/q009 三道「落上却空手」）：报逐题翻盘与 Δhit/Δrecall；全量复测仅在他点名时跑。
3. **A3 TDD**：身份写入/更新、换模型触发、失配检测三组用例 RED→GREEN→neuter（反证受害者不相交）。
4. **A4 真栈**：保存一次同宽换模型 ⇒ 触发重建（甲）或强确认（乙）⇒ 完成后身份一致、检索复常。
5. **A5 门禁**：knowledge 面全绿 + ruff check/format 双净（环境红按既有账登记）。

## 5. 非目标

- ④ 图谱扩展剪枝校准（`neighbor_min_score=0.4` 全灭邻居）——C 线，A 落地后小样本复测**按判据定去留（✅ 2026-10-04 他拍）**：A 后 3–6 题对照中「落上却空手」类全翻盘 ⇒ C 转观察项；仅剩多跳题仍 miss ⇒ 才动手。
- 查询侧链接加强（原甲：抽取加强/别名反查/阈值校准）——已淘汰（①③ 实测好），不做。
- ~~malformed JSON 兜底（D）另立~~ ⇒ **D 并入本对**（✅ 2026-10-04 他拍）：graph_search 查询实体抽取 JSON 解析失败时的防御补丁，随对落一个小 Task。
- 服务端漂移的周期主动探测（含 cos 抽样巡检）——登记不做。
- ragas 指标 4→2（旧待拍，另线）。

## 6. 修法分类一览

| 项 | 分类 | 一句话 |
|---|---|---|
| D1 重灌 | 修数据 | 把四类存量搬进当前坐标系 |
| D2 记身份 | 结构修 | 让「谁灌的」可查 |
| D3 触发重建 | 结构修 | 换代不再留下混用存量 |
| D4 失配检测 | 兜底/观测 | 混用可见、可补救、不锁库 |
