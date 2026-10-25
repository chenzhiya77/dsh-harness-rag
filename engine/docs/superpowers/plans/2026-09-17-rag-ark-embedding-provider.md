# 火山方舟嵌入 provider（第二家双路） —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-17-rag-ark-embedding-provider-design.md](../specs/2026-09-17-rag-ark-embedding-provider-design.md)
**Status:** **全部交付 2026-09-17**（Task 0–3 完成，含真栈四条腿；仅"几何观感"未用人眼确认，见 Task 3）
**Parent:** [2026-09-16-rag-sparse-capability-probe.md](2026-09-16-rag-sparse-capability-probe.md)（模型级能力探针；探针本身**零改动**，本计划只是让它多覆盖一行 provider）

**Architecture:** 把「一次调用同时给稠密+稀疏」这条**已有的机制**（今天只有 `dashscope` 一家）补上第二个实现。落点是三层、全是加法：**allowlist 加一行**（`emits_sparse=True` 就是"第二家双路"的全部声明）、**一个新适配器**（走火山的多模态端点、一次一条、无条件发 `dimensions: 1024`）、**前端那个写死的选项常量加一个值**。保存期交叉校验、能力探针、空稀疏兜底、密钥 env 提示**都已经是 provider 无关的**，不改。

**依赖顺序**：Task 1（后端）→ Task 2（前端）→ Task 3（文档 + 真栈）。Task 2 依赖 Task 1 的字段（前端选项要能通过 PUT）。

---

## Task 0 — 开工前的七项核实（只读，不改代码）

**状态：已核实 2026-09-17。**

**核实纪要**

1. **`Embedder` Protocol**：`batch_size: int`（普通属性——`ComposedEmbedder` 用 property 实现也算满足）+ `async embed(texts: Sequence[str], *, text_type: str = "document") -> list[EmbeddingResult]`；`EmbeddingResult(dense: list[float], sparse: SparseVector)` 是 `@dataclass(slots=True)`。对齐基准 `OpenAICompatibleEmbedder.__init__(*, base_url, model=None, api_key=None, batch_size=20, max_retries=3, retry_backoff_seconds=0.5, client=None, timeout_seconds=60.0)`；它的 `_KEY_ENV_VAR = secret_env_var("embedding", "openai-compatible")` **在模块导入期求值**（Ark 同款写法会拿到 `ARK_API_KEY`），`_read_api_key()` 用 `os.environ.get(...)` 兜底 ⇒ **`base_url` 照它写成必填**（工厂总会从 allowlist 传）。
2. **`EMBEDDING_PROVIDER_OPTIONS` 只有两个消费点**（`config-form.ts:64` 的定义 + `:137` 的 `asEnum` + 视图 `:555` 那个 Select）⇒ 加值安全。`PROVIDER_LABELS` 是**视图内的局部常量**（`:468`），被 4 个 Select 共用 ⇒ 加一个键即可（按 id 取值，不污染别处）。
3. **地址那一行的判据确实只有两处**：嵌入 `:629`、rerank `:644`，都是 `=== "dashscope" ? <LockedBox value={…} /> : <Input …>`。`LockedBox` 定义在 `:220`，**值为空时显示 `reason`**（`:231-232`）。能力块的 wire 类型在 `core/rag/types.ts:63`：`RagEmbeddingProviderCapability { provider_id; emits_sparse }` ⇒ 要加两个键。
4. **密钥 env 回退对新 provider 自动生效** ✅：`_SECRET_LEGS["embedding_api_key"] = ("embedding", "embedding_provider")` → `_secret_env_name()` → `secret_env_var(leg, provider)` → **allowlist 那一列**。
5. **⚠️ 发现一处 plan 没写的落点**：除已知的 `test_rag_config_api.py:416`（那条字面量用例）之外，**前端 dom 测试里还有一个夹具要改**——`tests/unit/settings/functional-models.dom.test.tsx:68` 的 `EMBEDDING_PROVIDERS`（两条：dashscope=true / openai-compatible=false）。**Task 2 必须给它补第三项和两个新键**，否则用例 3/4 读不到 `has_fixed_endpoint` / `default_endpoint`。已补进 Task 2 的 GREEN。
6. **`ARK_API_KEY` 无冲突**：全仓 grep 的命中全是 `LARK_*` / `_SPARK_KEYS` 的误配。命名与既有风格一致（`DASHSCOPE_*` / `MINERU_*` / `RAG_*`）。
7. **`ProviderSpec` 的 7 处构造全是关键字**（dashscope×2 / openai-compatible / generic-rerank / mineru-cloud / mineru-local / tei-sparse）⇒ 加两个带默认的字段安全。能力块在 `rag_config.py:181` 用一个 list comprehension 填（只读 `emits_sparse` 一列）⇒ 加两个键就是多读两列；配合已核过的 `_assert_pure_addition`（**整键排除** `embedding_providers`）⇒ **仍是纯加法**。

- [x] 1. `Embedder` Protocol 的确切成员（`batch_size` / `embed` 签名 / `text_type` / `EmbeddingResult` 字段名）——以 `OpenAICompatibleEmbedder` 为准对齐。
- [x] 2. `EMBEDDING_PROVIDER_OPTIONS` 与 `PROVIDER_LABELS` 的全部消费点：前者两个、后者是视图内局部常量被 4 个 Select 共用 ⇒ 加值/加键安全。
- [x] 3. 地址那一行的判据现状（`:629` / rerank `:644`）+ `types.ts:63` 的能力块类型；**rerank 那一行保持不动**（spec §6 G3 记一行）。
- [x] 4. 密钥 env 回退与界面 env 提示**自动生效**（`_SECRET_LEGS` + allowlist 的 `secret_env_var`）⇒ 不是 Task 1 的一小项。
- [x] 5. 除那条字面量用例之外，**前端 dom 夹具 `EMBEDDING_PROVIDERS` 也要改**（已补进 Task 2）；其余无。
- [x] 6. `ARK_API_KEY` 与既有 env 约定**不冲突**。
- [x] 7. `ProviderSpec` 7 处构造全用关键字；能力块加两个键**仍是纯加法**。

**门禁**：无（只读）。

---

## Task 1 — 后端：allowlist 一行 + 适配器 + `Literal` 加值（D1–D4）

**状态：已实现，门禁部分待回（2026-09-17）。**

**交付纪要**

- **RED 两处**：① 新文件整文件收集失败（`ModuleNotFoundError: deerflow.knowledge.embedder_ark`）；② 那条字面量用例 `KeyError: 'has_fixed_endpoint'`。
- **实现落点**（比原计划多一处精简）：
  - `providers/__init__.py`：`ProviderSpec` 加 `has_fixed_endpoint` / `default_endpoint`（**默认关**）+ `dashscope` 补两字段 + 新行 `volcengine-ark`（放在 dashscope 之后、`openai-compatible` 之前——两条双路相邻）。
  - `knowledge/embedder_ark.py`（新）：`ArkEmbedder`，一次一条、`batch_size=1`、**`dimension` 无默认值（必填）**、`text_type` 收下不发送、`_post_with_retry` 与 `OpenAICompatibleEmbedder` 同构。**没有 import 工厂的 `COLLECTION_DIMENSION`**。
  - `embedder_factory.py`：`_build_dense` **由「按 provider id 分支」合并成一条路径**（这是意料之外的精简，原计划只写了改兜底值来源）：`base_url = 存量 or spec.default_endpoint`；`pins_dimension` ⇒ 注入 `dimension`（未声明时用 `COLLECTION_DIMENSION`，与 dashscope 原行为等值）；错误文案去掉「只有 dashscope 有内置地址」的枚举。
  - `app/gateway/routers/rag_config.py`：能力块模型加两个键；填充抽成 `_embedding_provider_capabilities()`（原是个三元表达式 comprehension，加两列后不好读）。
  - `config/app_config.py` + `config/rag_config_file.py`：`Literal` 各加一个值。
- **revert proof（三条，逐条有牙）**：① 请求体去掉 `sparse_embedding` ⇒ **恰好 1 条**红（形状守卫）；② 注入条件改回 `declared is not None` ⇒ **2 条**红（两条经工厂构建的用例）；③ 能力块不读 allowlist（写死 `False`/`None`）⇒ 字面量用例红，diff 直接点出那两个键。
- **⚠️ neuter ② 第一次跑出全绿 ⇒ 逮出一条没牙的用例，当场改强（没留到评审）**：`ArkEmbedder` 原本自带 `dimension: int = 1024`，工厂不传时它照样发 1024 ⇒ 那条「宽度由工厂注入」的用例**分辨不出「注入」与「自带默认」**。改成 **`dimension` 必填**（D3 的字面意思：适配器不该对集合宽度有意见），neuter 才转红。
- **⚠️ 当场删掉一条我自己写歪的用例**：`test_the_capability_block_reports_the_new_keys` —— 名字说测能力块，实际只断言「新 id 在 `provider_ids` 里」，与后端那条字面量用例重复且名不副实 ⇒ 删除，能力块的键由字面量用例覆盖。
- **⚠️ Task 0 漏了两处（诚实记录）**：Task 0 第 5 项我只 grep 了 `embedding_providers` / `EMBEDDING_PROVIDER_OPTIONS`，**没 grep `provider_ids(`** ⇒ 漏掉 `tests/knowledge/test_rag_provider_config.py` 里两处：`test_provider_ids_lists_the_curated_set_per_leg`（钉着旧二元组）与 `test_allowlist_resolves_each_supported_provider`（参数表缺新行）。两条都已更新（前者预期内的用例更新，后者补覆盖）。
- **门禁**：`ruff check` ✅；`ruff format --check` ✅（`--write` 只动了本轮新增/改动的两个测试文件，逐行核过只碰我加的代码）；窄面（`tests/knowledge/` + 三个 rag_config 文件，`-m "not integration"`）= **1165 passed / 51 deselected / 0 failed**；**全量后端（`-m "not live"`）= 145 failed / 12325 passed / 160 skipped / 1 error**，逐条比对见下。
- **全量红的逐条定性（不是"看着像环境"）**：抽出全部 **146** 个 node id，在**同一个 HEAD（`0f005970`，代码改动尚未提交）上跑同一批**、双向 diff ⇒ **HEAD 只有 145 条红、我这边 146 条**，差的唯一一条是 `tests/test_delta_channel_state.py::test_merge_message_writes_randomized_differential`（**已知随机差分 flake**：在本机单跑 **3/3 全过**，本线前几轮它都在集合内）。**HEAD 独有红 = 0** ⇒ 无本改动引入的红。
  - ⚠️ **踩到一个坑（记下来）**：抽出的 id 里有一条参数**本身就是 shell 元字符**——`tests/test_dev_entrypoint.py::test_metacharacters_abort_with_nonzero_exit[; rm -rf /]`。用 `$(cat ids)` 这种 unquoted 展开会被词分割/通配展开（第一次跑因此报 `file or directory not found: rm`、结果全空）。**必须用 `xargs -d '\n' -a <file>` 传参**。
  - ⚠️ 另一处我自己的失误：第一次全量命令带了 `| tail -40`，只存下 39 行 ⇒ 白跑一轮（13 分钟）重跑。**抓门禁输出不要截断。**
- **环境性红（与本改动无关）**：`tests/knowledge/wiki/test_generator.py::test_only_dirty_prune_removes_vector_point` 标了 `@pytest.mark.integration` 且要真 Qdrant —— 本机 6333 / 6334 **都不通**（直接 socket 探过）。

- [x] **RED**：`backend/tests/knowledge/test_embedder_ark.py` 新建（15 条 / 16 case）+ `test_rag_config_api.py` 那条字面量用例改成三项两键。
- [x] **GREEN**：allowlist 两个新字段 + `volcengine-ark` 行；`embedder_ark.py`；`_build_dense` 合并路径 + 注入 + 文案；能力块两个键；两处 `Literal`。
- [x] **neuter 三条（都必须有牙）**：① 形状守卫红 1 条；② 宽度注入红 2 条；③ 能力块键红 1 条。
- [x] **门禁**：`ruff` 双净 ✅；窄面 ✅；**全量后端与 HEAD 双向 diff ⇒ 无本改动引入的红（差集唯一一条是已知 flake）**。

**RED 覆盖清单（13 项，已全部落到 `test_embedder_ark.py` 与那条字面量用例）**

1. 请求形状守卫（body 恰好四项、`input` 恰好一条内容条目、`dimensions==1024`、`sparse_embedding=={"type":"enabled"}`、路径对）；
2. 一次一条（3 条 ⇒ 3 次请求，`batch_size == 1`，顺序照输入）；
3. 解析（单对象 `data`；`sparse_embedding[]` 的 `index`/`value` ⇒ `SparseVector`）；
4. 空稀疏 ⇒ `SparseHalfMissingError`（外层兜，适配器不自己吞）；
5. 失败类型（401 不重试 / 500 重试 / 形状不符）；
6. 无条件发 1024（`embedding_dimension=None` 时请求里仍有；**宽度由工厂注入，适配器不 import `COLLECTION_DIMENSION`**）；
7. 默认值未动（`embedding_provider` 仍是 `dashscope`、模型仍是 `qwen3.7-text-embedding`）；
8. `build_embedder` 能建出火山；
9. `text_type` 收下但不发送（`query` 与 `document` 请求体逐字节相同）；
10. env 名（`secret_env_var("embedding","volcengine-ark") == "ARK_API_KEY"`）；
11. allowlist 行 + 能力块两个新键 + **每一行都断言两键同真同假**（⑥甲）；
12. **⑤-4 回归保护**（存量地址仍生效，参数化 dashscope / volcengine-ark）+ 对照组（`openai-compatible` 缺地址仍拒）；
13. 防漂移（`dashscope.default_endpoint == DASHSCOPE_BASE_URL`）。

## Task 2 — 前端：选项加一个值 + 地址那一行改读 allowlist（D5）

**状态：已交付 2026-09-17。**

**交付纪要**

- **RED 9 条**：node 5 条（新 describe：选项 + 五态地址行）＋ dom 4 条（两处既有断言 + 新 describe 的三条里两条）。其中「Ark 不报 dense-only」那条**当时就已经合法通过**（夹具里 ark 的 `emits_sparse` 是 true）——它是回归保护，不是红。
- **实现落点**：`core/rag/types.ts`（能力块加 `has_fixed_endpoint` / `default_endpoint`，**外加两处 Literal**：wire 的 `RagConfigValues.embedding_provider` 与表单的 `RagConfigFormValues.embedding_provider`）；`core/rag/config-form.ts`（`EMBEDDING_PROVIDER_OPTIONS` 加值 + 新纯函数 `resolveFixedEndpointRow`）；`functional-models-view.tsx`（`PROVIDER_LABELS` 加一行 + 地址行判据改读能力块 + `LockedBox` 新增可选 `onReset`/`resetLabel`，按钮**骑在框内**）；i18n 三处（`providerVolcengineArk` / `resetToDefault`）。
- **tsc 当场逼出一处漏改**：我只改了**表单**类型的 Literal，漏了 **wire** 类型 `RagConfigValues.embedding_provider` ⇒ 三条用例 `TS2322`。这条值得记：一个 provider id 在前端有**两处** Literal。
- **eslint 逼出一处写法**：`stored || capability?.default_endpoint || ""` 被 `prefer-nullish-coalescing` 判 error——而那处 `||` 是**故意的**（空串必须落到默认，`??` 会把空串留下）。改成显式 `stored === "" ? fallback : stored`，意图也更清楚。
- **⚠️ Task 0 只查了一半（诚实记录）**：能力块相关的既有断言其实在**两个** dom 文件里。另一个是 `tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`——它用**代理 i18n**（断言 `getAllByText("lockedByProvider")`），不含 `emits_sparse`，所以我 Task 0 那条 grep 扫不到它。**全量前端跑出 1 条红**，补上能力块夹具 + 把断言从 2 条改 1 条并断言地址在屏上，才绿。**教训：找"会被我改动影响的断言"要按界面词汇 grep（`lockedByProvider` / `embeddingBaseUrl`），不是按数据字段 grep。**
- **设计变更登记（会改既有断言，故写在这里）**：锁框现在**显示实际会用的地址**（存量值，否则提供方默认），不再显示「由提供方固定」。因此两个既有 dom 用例的 `lockedByProvider` 计数从 2 改成 1，并新增"地址在屏上"的断言。**rerank 那一行不动**（仍显示理由），这是 spec §6 G3 记下的已知不对称。
- **一条行为变更（有意，且写进注释）**：`providers` 缺失（旧响应）时**不锁**——旧服务答不了这个问题，不替它答。代价是：旧响应 + dashscope 从"锁"变成"可编辑"（更自由，不是更受限）。
- **revert proof（三条，逐条有牙）**：① 从 `EMBEDDING_PROVIDER_OPTIONS` 撤掉新值 ⇒ **恰好 1 条**红（选项用例）；② 地址行判据改回写死 `=== "dashscope"` ⇒ **恰好 2 条**红（两条 ark 相关）；③ 去掉 `onReset` 的渲染 ⇒ **恰好 1 条**红（「恢复默认」那条）。
- **门禁**：`eslint` 干净；`tsc` **仅宠物线那条预存红**（`pet-sprite.dom.test.tsx:222` 的 `"greet"`）；**prettier 逐文件与 HEAD 比**——`config-form.test.ts` 194=194、`types.ts` 0=0、`config-form.ts` 58（HEAD 63，把自己碰过的那行按 prettier 收好了）、`functional-models-view.dom.test.tsx` 5（HEAD 10）、其余 4 个文件与 HEAD 同数 ⇒ **零新增格式债**（只改自己的行，没重排历史债）；**全量前端 238 文件 / 2544 用例全绿**（上一轮基线 2535 ⇒ **+9** = 本轮新增的 9 条）。

- [x] **RED**：node 5 条 + dom 4 条（含两处既有断言的设计性更新）。
- [x] **GREEN**：`types.ts`（能力块两键 + 两处 Literal）、`config-form.ts`（选项 + `resolveFixedEndpointRow`）、视图（标签 + 地址行 + `LockedBox.onReset`）、i18n 三处、dom 夹具两处。
- [x] **neuter 三条（都必须有牙）**：① 选项值 1 条；② 判据回退 2 条；③ `onReset` 1 条。
- [x] **门禁**：eslint ✅ / tsc 仅预存红 ✅ / prettier 零新增债 ✅ / **全量前端 238 文件 / 2544 用例全绿**。

## Task 3 — 文档同步与真栈验收

**状态：文档已交付；真栈两条腿已过、两条 UI 腿待登录（2026-09-17）。**

**交付纪要 —— 文档**

- `backend/AGENTS.md`：能力块那一句补上两个新键（`{provider_id, emits_sparse, has_fixed_endpoint, default_endpoint}`）并说明「锁由**能力**而非写死的 provider 名决定」；嵌入 provider 段**新增两段**——「两个厂商现在都给两半」（火山的形状：一次一条 ⇒ `batch_size=1`、实测 ~1.3 倍；`dimensions` 每次都发且由工厂注入、`ArkEmbedder.__init__` 故意不给默认值；`text_type` 收下不发；稀疏只在多模态端点）与「厂商可能固定自己的地址」（`has_fixed_endpoint`/`default_endpoint`、**存量值仍然生效**、`default_endpoint` 是字面量不 import 的理由、**只覆盖嵌入 leg**）。
- `frontend/AGENTS.md`：能力块字段更新；新增一段「地址行同样按能力块判」——三问（锁不锁 / 显示什么 / 有没有可清的自定义值）、「恢复默认」骑在框内且无存量时不出现、**未知不锁**、rerank 那一列仍写死（已知并记录）。
- **prettier 逐文件与 HEAD 比**：`backend/AGENTS.md` **282 = 282**、`frontend/AGENTS.md` **16 = 16** ⇒ **零新增格式债**（我第一稿用了 `*row*`，按本仓 prettier 偏好改成 `_row_`）。

**交付纪要 —— 真栈**

- **腿 A②（真调用）✅**：`build_embedder(config, rag=<火山 + sparse_source=provider + 不给地址>)` ⇒ 建出 **`_SparseHalfCheckedEmbedder`**（⇒ 保存期交叉校验确认放行这条路），再真打一次 ⇒ **row0/row1 dense=1024、`sparse_indices=2` 非空**，index `[4428, 11036]` 与早先裸调一致。**这是"第二家双路"的真凭据**（若稀疏回空，那个包装类会抛）。
- **腿 A①（数据半）✅**：**走真 HTTP**（登录后从页面同源 `GET /api/rag/config`）拿到三行四键：`dashscope`(true/true/dashscope 默认)、`volcengine-ark`(true/true/火山默认)、`openai-compatible`(false/false/null)；进程内调 `_embedding_provider_capabilities()` 得到同一份。
- **腿 A④（零影响）✅**：为腿 A①/③ 临时 PUT 过一次（`{extract_model, embedding_provider: volcengine-ark, embedding_base_url: <工作空间级地址>}` ⇒ **200**，顺带证明保存期交叉校验接受「火山 + 跟随向量模型」），随后 PUT 回 `{extract_model}` 还原：`rag_config.json` 逐字节回到 `{"extract_model": "qwen3.8-flash"}`，md5 = **`15fa768a0d5d5c388c26b14aa2844abe`**（与上一线记录的"动手前"值相同）；新鲜 GET 复核 `embedding_provider=dashscope` / `base_url=null` / `sparse_source=provider` / `model=qwen3.7-text-embedding`。密钥全程只在进程内存里（按形态从会话记录取，未打印、未落盘）。浏览器里那份未保存的表单已重载丢弃。
- **腿 A①（界面半）+ 腿 A③ ✅（真浏览器，2026-09-17 补齐）**：`?settings=models` 深链打开设置 → 切到「功能模型」：
  - 打开向量提供方那个下拉 ⇒ 选项**恰好三项且顺序对**（阿里百炼 / **火山方舟 (Ark)** / OpenAI 兼容）；
  - dashscope 时：接口地址那一行显示 **`https://dashscope.aliyuncs.com`**（不再是「由提供方固定」），而「由提供方固定」**只剩 1 处**——就是没动的 rerank 列；无存量值 ⇒ 「恢复默认」**不出现**；
  - PUT 成火山 + 一个**工作空间级**自定义地址并重载后：trigger = **火山方舟 (Ark)**、那一行显示**那个自定义地址**、「恢复默认」**出现**、`role="alert"` **为空**（Ark 无 dense-only 告警）；
  - 点「恢复默认」⇒ 框回落到 **`https://ark.cn-beijing.volces.com`**、自定义值从 DOM 消失、按钮自己消失、Save 变为可点（证明表单确实改了）。
  - ⚠️ **几何没量**：这个内嵌浏览器的视口是 **547×644**（< 768），且 `resizeTo` 无效 ⇒ 「恢复默认」按钮在真实宽度下的观感**仍未用眼睛确认**（结构层已由 dom 用例钉住）。

- [x] `backend/AGENTS.md`：能力块两键 + 火山的形状 + 固定地址规则（含"只覆盖嵌入 leg"）。
- [x] `frontend/AGENTS.md`：能力块两键 + 地址行的判据/恢复默认/未知不锁。
- [x] **真栈腿 A②（真调用）**：真端点跑 `build_embedder(...).embed([...])` ⇒ dense=1024 且 **稀疏非空**。
- [x] **真栈腿 A①（数据半 + 界面半）**：真实能力块三行四键；真浏览器里下拉三项、无告警。
- [x] **真栈腿 A③**：真浏览器里锁框显示存量地址 + 「恢复默认」出现 ⇒ 点击后回落默认并消失。
- [x] 真栈腿 A④：**配置逐字节还原**（md5 `15fa768a…` 与动手前相同）、密钥未落盘、未新建文件。
- [x] **门禁**：两份 `.md` 的 prettier 与 HEAD 同数（282 / 16）；`rag_config.json` md5 未变。
- **仍开着的一条（不是本 plan 的验收项）**：内嵌浏览器视口 547×644 且不可 resize ⇒ **几何类观感**没有人眼确认。

---

## 提交切分

| 提交 | 内容                                                        |
| ---- | ----------------------------------------------------------- |
| 0    | **本计划 + 它的 spec 成对**（本线先例：spec/plan 成对一笔）  |
| 1    | Task 1（allowlist + 适配器 + `Literal` + 用例）              |
| 2    | Task 2（前端选项 + i18n + 用例）                             |
| 3    | Task 3（文档 + 真栈结论）                                    |

不改表、不改 `rag_config.json` schema、**不动任何默认值**。
