# RAG 知识栈持有实例随配置换新与卡片开关竞态收口 —— 设计

**Status:** ✅ 全交付（2026-10-05）：D1=甲、D2=甲；Task 0–4 完成，真栈 9/9，门禁 1570/4/2（4=既有环境红）。

**本对两件事。②：修「worker/service 持有的 vector_store 不随配置换新」这个已钉死的缺陷（上一对 Task 0 ⑦ 登记、2026-10-05 隔离真栈复现 6/6）。** 宽度迁移翻转 `rag_config.json` 后不重启的窗口里，worker 的入库指向旧代：旧代还在 ⇒ `400 Vector dimension error: expected dim: 1024, got 1536`；旧代已删 ⇒ `404 Collection kb_chunks doesn't exist!`——**两种都响亮失败，新文档全部失败直到网关重启**。检索路不受影响（每请求新建 store，天然读新宽度）——不对称的根因就是这两处长期持有实例。**①：卡片 toggle-on 写序竞态收口**（2026-10-05 并入）——清扫 D5 判据与「upsert → 行写」顺序之间存在毫秒窗口，清扫若两次读都落在窗口内会把刚写的点当残留删掉（卡暂时搜不到、再开开关自愈）；本对以点龄判据把窗口**单调关闭**（§2.4）。

## 1. 现状与缺口（锚点 + 钉死证据）

- 持有面：`worker.py:210` 与 `knowledge_service.py:242` 各只赋值一次（启动构造）；`app.py` 启动段（`:349` 构造 store / `:353` 喂 worker / `:365` 喂 service）用同一个启动期实例喂给两者；全仓无换新路径（上一对 Task 0 ⑦ 静态结论）。
- 钉死证据（2026-10-05，隔离真栈，脚本 `E:/app-model/deer-flow-scratch/stale-store/e2e.py`，6/6 PASS）：真 `migrate_collections` + `write_rag_config` + 删旧代三步后——startup 实例经 `index_chunks` 写入失败（两态各一，报错如上）；`effective_dimension()` 与 `get_vector_store()`（检索路）都已是新宽度；重启对照（新 store）入库成功且点可读。
- 同族：`qdrant_url` 变更同形——检索路每请求按新配置，持有实例仍指旧地址。

## 2. 方案（D1=甲）

### 2.1 取值口自检换新

两个取值口（worker 的 `_vector_store`、service 的 `vector_store`）变为**自检属性**：取值时比对「配置声明（`qdrant_url` + `effective_dimension()`）」与「实例持有（url + 宽度）」——

- **判别面**：只有「真实例**且 `held.url` 已知**」才自检；非 `KnowledgeVectorStore` 实例（测试假体、MagicMock）与 `client=` 注入的实例（url 未存 ⇒ None）一律**直通**——生产恒有 url（app.py 经 `get_vector_store()`），后者只服务测试与脚本；直通避免"url 未知被判不符 ⇒ 每次取值都重建"的死循环式换新（`test_e2e_smoke.py:106` / `test_phase2_smoke.py:86` 的 `client=` 夹具正是这一格）；
- 一致 ⇒ 原样返回（配置未变时**同一实例**，成功路径零行为变化）；
- 仅宽度差 ⇒ 复用同一 Qdrant client 换新宽度，构造写死为 `KnowledgeVectorStore(url=声明 url, client=held 的 client, dense_size=声明宽度)`——**url 必须随构造带上**（ctor 在有 client 时也记 url），否则换新后的实例 url=None、下一次取值又判不符；
- url 差 ⇒ 按新配置重建（`get_vector_store()` 同款）；
- 换新时打一条 info 日志（旧值→新值）。赋值原子、并发双建无害（后写胜出，两者皆有效）；取值口每次访问含一次 `get_app_config()` 签名比对（stat + sha256；rag_config.json 极小，量级可忽略）。

### 2.2 落点

- `vector_store.py`：`KnowledgeVectorStore` 补 `dense_size` / `url` 两个公开访问器（ctor 记下 url）；新增 `refreshed_store(held)`（与 `get_vector_store()` 相邻，惰性读 `get_app_config()`，避免循环导入）。
- `worker.py`：`self._vector_store` 改自检属性（存量字段改名，~10 处调用点与全部既有测试零改动）。
- `knowledge_service.py`：`self.vector_store` 同款（router 的 `service.vector_store` 读法不变）。
- 迁移自身的两个 store（`rag_migration` 的目标代/旧代实例）**保持钉死宽度**——它们是代次的锚，绝不随配置漂移。

### 2.3 窗口语义（与迁移既有约定对齐）

| 窗口 | 自检结果 | 与既有约定 |
|---|---|---|
| 迁移在建 / 建完未翻 | 配置仍声明旧宽度 ⇒ 保持旧实例 | 「运行时保持旧态」（D5-2）原样成立 |
| 翻转后 | 首次取值即换新宽度 | 「切点后新态」对 worker/service 终于成立 |
| 单次操作内恰跨翻转（两次取值一旧一新） | 前半落旧代、后半落新代 | 正确而非残余：翻转前写入由迁移 delta pass 覆盖，翻转后操作本就该走新代 |

### 2.4 卡片点龄判据（①，D2=甲）

清扫的卡片判据从「行关（或缺）即删」升级为「行关（或缺）**且点龄 > `_CARD_ORPHAN_GRACE_SECONDS`（60s）**才删」：卡片点 payload 增加 `updated_at`（**全部三个构造点**：create `knowledge_service.py:955` 与 update `:1044` 落 `time.time()`；重嵌 `reindex.py:300` 留字段默认 `0.0`=老——它只重嵌 flag-on 卡、恒被行判据保住，flag-off 卡不产生点），清扫以 `now - updated_at` 计龄；**无该键的老点视为"老"、照删**——存量残留自动兼容。

- **窗口论证（消窗而非缩小）**：toggle-on 的 [upsert → 行写] 窗口里新点龄≈0 ⇒ 永不进候选；时间单调 ⇒ 关闭**不依赖任何读时序**（对照乙法："复核读完到删之间"仍有 μs TOCTOU）。同一判据顺带覆盖 `create_manual_card` 的 [upsert → 行插] 窗口（行缺 + 新点同样被龄门挡住）。
- **两段式不变**：候选收集时过一次龄门；复核仍只重读业务行（点 payload 不变，龄无需复查）。
- **代价**：payload 多一个时间元数据键（对"只存指针"原则的注明偏离）；真残留多活 ≤60s 才被收（无害）。
- **已删库组不走龄门**：`_deleted_kb_manual_cards` 保持无龄门——kb 行先于点的写入序不存在二义状态。

## 3. 决策点（已裁 2026-10-05）

- **D1 修法 = 甲：取值口自检换新**（调用点零改动、覆盖 url 同族、重启与不重启行为一致）。未选：乙（翻转后重建 worker/service——生命周期交接是停服级操作）；丙（迁移收尾显式换新——只治宽度一格、留每配置变更各配钩子的债）。架构级（store 不再持有宽度）不选：动面最大且迁移自身需要钉死宽度的双模式。
- **D2 卡片竞态 = 甲：点龄判据**（payload `updated_at` + 宽限 60s；无键=老、照删）。未选：乙（写入侧尾部自检修复——「读完到删」间仍有 μs TOCTOU，窗口只缩小不归零，且每次更新多一发 retrieve）；丙（清扫两轮确认——给无状态清扫轮加状态，与"不建持久记录"冲突）；丁（改写入顺序——2026-08-16 历史否决，列出仅为对照）。

## 4. 硬约束

- 配置未变时取值口返回同一实例（成功路径零行为变化、不新增配置面）；
- 迁移自身的代次 store 钉死宽度不动；
- 假体直通（判别=真实例且 url 已知，不做鸭子探测）；
- 取值口为唯一入口（实现不得绕过 backing 字段直取实例）；
- 换新只发生在取值口，不改任何调用点的用法与顺序；
- ① 不改 `update_manual_card` 的写序（D5 登记原话）与清扫两段式结构；龄门为常量，不新增配置面。

## 5. 验收

1. 单测：宽度差 ⇒ 换新且复用同一 client（`refreshed._client is held._client`）、集合名带新宽度；
2. 单测：配置一致 ⇒ 同一实例（identity 保持）；url 差 ⇒ 重建走新地址；
3. 单测：假体/魔术对象直通；`url=None`（client 注入）⇒ 直通不重建（死循环式换新回归钉）；
4. 单测：worker 与 service 两个取值口各一（真 store + 配置桩 ⇒ 换新；fake ⇒ 原样）；
5. 单测（①）：flag 关 + 新点（`updated_at≈now`）⇒ 保留（**当前代码会删——即合成交错的最小复现，修前此条红**）；flag 关 + 老点 ⇒ 删；无 `updated_at` 键的存量点 ⇒ 删；行缺 + 新点 ⇒ 保留；
6. 门禁：knowledge 面全量 + ruff 双净；
7. 真栈：隔离实例复用 stale-store 场景（真迁移三步 + 不重启）——经取值口 `index_chunks` 入库成功、点落在新代、检索可读；重启对照仍过；**①相**：闸门撑开 [upsert → 行写] 窗口、跑真 `sweep_round` ⇒ 新点不被删；放闸后行开、点仍在（卡可检索）。

## 6. 非目标

- 不做架构级（store 内不再持有宽度）；
- 不动迁移自身的代次 store 与 `rag_migration` 流程；
- 不顺手改 worker/service 的其他启动期快照（本轮只治 vector_store 的 url/宽度两轴）；
- ① 不做乙/丙/丁 三法；不动 `update_manual_card` 写序与清扫两段式。
