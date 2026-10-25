# 火山方舟嵌入 provider（第二家双路） —— 设计

**Parent:** [2026-09-16-rag-sparse-capability-probe-design.md](2026-09-16-rag-sparse-capability-probe-design.md)（模型级能力探针；本 spec 是它的**增量**）
**Status:** 未开工（2026-09-17 起草）

## 1. 问题

今天系统里「一次调用同时给稠密+稀疏」的嵌入 provider **只有一家**（阿里百炼 `dashscope`）。稀疏来源选「跟随向量模型」之所以能用，**不是通用机制，而是 dashscope 那一段实现**：allowlist 那一行的 `emits_sparse=True`，加上 `DashScopeEmbedder` 内部就发了 `parameters.output_type` 并按 `sparse_embedding` 解析。换一家 provider，这个"自动跟随"不会跟着发生。

而这构成一个**单点**——但要说准：**稀疏本身**还有 `external`（TEI 形状的服务）和 `bm25`（本地）两条出路，稠密也能换成 `openai-compatible`。缺的不是"去处"，而是**「双路这一格」的同构备选**：`qwen3.7-text-embedding` 一旦改价、变更行为或不可用，双路部署没有第二家**同构**选择。

**火山方舟有第二家**：`doubao-embedding-vision-250615` / `-251215` 在一次调用里同时返回 `data.embedding` 与 `data.sparse_embedding[]`（2026-09-17 逐项实测：`sparse_embedding:{"type":"enabled"}` 开关、`dimensions:1024` 确实生效、稀疏 index 跨调用稳定）。本 spec 把它接成第二家双路 provider。

## 2. 决定

### D1 —— provider id `volcengine-ark`，新增一行 allowlist

`PROVIDER_ALLOWLIST["embedding"]` 增：

| 字段               | 值                                                          | 理由                                                                                                              |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `implementation`   | `deerflow.knowledge.embedder_ark:ArkEmbedder`               | 新模块，照 `embedder_openai.py` 的形状写                                                                          |
| `path`             | `/api/v3/embeddings/multimodal`                             | **稀疏只在这个端点上**；`/api/v3/embeddings`（OpenAI 形状、可批量）连 `sparse_embedding` 参数都没有                 |
| `secret_env_var`   | `ARK_API_KEY`                                               | 密钥的环境回退；界面的 env 提示由它自动跟随（`_secret_env_name` 读的就是这一列），前端零改动                       |
| `emits_sparse`     | `True`                                                      | **这一行就是"第二家双路"的全部声明**：保存期交叉校验放行、能力探针直接问模型而不是从列表答                        |
| `pins_dimension`   | `True`                                                      | 适配器**无条件**发 `dimensions`（见 D3），所以不需要运行时宽度探测                                                |
| `has_fixed_endpoint` | `True`                                                    | **新增字段**：这一家的地址由提供方固定 ⇒ 界面锁住（见 D5）                                                          |
| `default_endpoint` | `https://ark.cn-beijing.volces.com`                          | **新增字段**：内置默认地址。字段为空时由它兜底；能力块把它报给界面，好让"恢复默认"有明确目标（见 D5 ⑤-4）            |

`endpoint_key` 保持默认 `base_url`。

**本 spec 把一条既有规则泛化**：新增 `ProviderSpec.has_fixed_endpoint: bool = False`（**默认关 ⇒ `openai-compatible` 等现有行行为一字不变**），`dashscope` 与 `volcengine-ark` 各标 `True`，并各带自己的 `default_endpoint`。

这条规则今天**写死在两处**——前端三元 `values.embedding_provider === "dashscope"`、后端文案「（**只有 dashscope 有内置地址**）」。泛化之后，「锁不锁」与「是哪一家」解耦：两个 provider 都锁，是因为**两个都声明了自己有固定地址**，不是因为写了名字。（2026-09-17 用户裁定选此方案。）

**`default_endpoint` 写的是字面量，不 import 实现模块的常量**：`DASHSCOPE_BASE_URL` 在 `embedder.py`，而**本模块的 docstring 明写**「Implementations are stored as strings so this module **stays import-light**」——为这一个常量去 import `embedder` 会破坏那条约束。代价是值在两处各有一份 ⇒ **用一条用例把它们钉成相等**（§4 第 15 条），而不是靠 import。

### D2 —— 适配器 `ArkEmbedder`：一次一条，顺序循环

**这是与 dashscope 唯一实质不同的地方。** 代价比预想**小得多**——原先按"请求数 × 20"估，实测（2026-09-17，同 20 条文本、各跑三轮）**只慢约 1.3 倍**：百炼 1 次请求 / 20 条 ≈ **2.9 s**，火山 20 次请求 / 20 条 ≈ **3.8 s**。原因是百炼**单次**就要 2.9 s（平台侧逐条计算占主导，批量并不省时），而火山单次往返只要 ~0.19 s。spec 此处按实测数字定调，不按直觉。

| 项       | 形状                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| 请求     | `POST {base_url}{path}`，`{"model", "input": [{"type": "text", "text": …}], "dimensions": 1024, "sparse_embedding": {"type": "enabled"}}` |
| 一次几条 | **1 条**。`input` 是"**一条**的多个模态部分"（嵌套数组实测 400），返回的 `data` 是**单个对象而不是数组**            |
| `batch_size` | **恒为 1**。`index_chunks` 用 `max(1, embedder.batch_size)` 切片，所以每片一次调用；失败粒度因此更细（一次只标 1 片 `failed`），**没有行为惊变** |
| 顺序     | `embed()` 内**顺序**循环（不并发，见 D7）；返回顺序与输入一一对应                                                |
| `text_type` | **接受但不发送**——该端点没有 query/document 位（官方 SDK 的签名里只有 `model` / `input` / `encoding_format` / `dimensions` / `instructions` / `sparse_embedding`）。与 `OpenAICompatibleEmbedder` 同一处理（它的 docstring 就写着 "the shape has no such knob"）。**必须显式收下这个参数**：`_SparseHalfCheckedEmbedder` 会把 `text_type` 透传下来，签名不符会直接 `TypeError` |
| 响应     | `data.embedding`（稠密）+ `data.sparse_embedding[]`（`{index, value}`，**没有 `token`**）⇒ 拼成 Qdrant `SparseVector` |
| 防御     | 返回的行数/形状不符 ⇒ `EmbedderError`（一次一条使它几乎不可能，但不静默）                                          |
| 鉴权     | `Authorization: Bearer <key>`，密钥来源＝配置里的显式值，否则 allowlist 的 `ARK_API_KEY`                          |
| 失败     | 复用 `EmbedderError` / `EmbedderAuthError`，与别家同语义                                                           |

**空稀疏不在这里判**：交给既有的 `_SparseHalfCheckedEmbedder`（`sparse_source=provider` 时自动套上），它会持续抛 `SparseHalfMissingError`。

**已知的两个不体面之处，写在这里而不是藏着**：

1. **请求数被放大**：`batch_size=1` ⇒ 一篇切 500 片的文档是 **500 次往返**（百炼同文档 25 次）。**但墙钟时间不是 20 倍**——实测约 1.3 倍（见上）。真实风险是**大文档下请求数放大可能撞平台限流**，这一点**我没有压测过**，别当结论。本期的取舍是**正确优先、并发留待以后**（D7）。
2. **语义错配**：`doubao-embedding-vision` 是**多模态**模型（本职是图文/视频），我们只拿它当**纯文本**向量用。文本输入实测正常，但**它是火山唯一能出稀疏的模型**，不是为文本检索设计的。这条会影响"值不值得接"的判断，故留在 spec 里。

### D3 —— 维度：**无条件发 1024**（宽度由工厂注入）

**宽度从哪来**：由 `_build_dense` 通过 **`dimension=` 参数注入**（`rag.embedding_dimension or COLLECTION_DIMENSION`），适配器**收到就发、每次都发**。

- **为什么不能让适配器自己取**：`COLLECTION_DIMENSION` **只定义在 `embedder_factory.py:36`**，而实现模块一律只 import `deerflow.knowledge.embedder` + `deerflow.knowledge.providers`（`embedder_openai.py` / `sparse.py` 都是如此）⇒ 自己去取会形成**反向依赖**（实现 → 工厂）。注入是既有的机制（dashscope 那行 `kwargs["dimension"] = declared` 就是它），只是对它**每次都传**。
- **为什么不能省**：这个模型的 born 宽度是 **2048**（实测），不发就超宽。
- **为什么必须由实现保证"一定发"**：`build_embedder` 只在**声明了**维度时才做"N = 1024"的静态校验，而**维度守卫是运行时才测的**（`_DimensionCheckedEmbedder` 构建期只包装、不调用）。若实现成"收到空就不发"，结果是**保存成功、第一次嵌入才炸**——这正是本线已知的那个缺口。所以这里钉死：**工厂每次传、适配器每次发**，并据此把 allowlist 标成 `pins_dimension=True`（于是根本不挂运行时探测）。
- **不做**：本期**不**顺手补那个"维度守卫不在保存期跑"的缺口（它是独立的一条，动的是共享的保存期判定）。
- **代价要知道**：`pins_dimension=True` ⇒ `_guard` **直接返回、不套包装** ⇒ 这条路**运行时一次都不测宽度**。兜底只剩 Qdrant 拒超宽写入（与 dashscope 现状相同）。这是**有意换的**：宽度由实现静态钉死 > 每次构建多一次真实调用。

### D4 —— 稀疏来源：`provider`（这就是"双路"）

`emits_sparse=True` ⇒ PUT 的交叉校验放行，稀疏来源选「跟随向量模型」合法，运行期由 `_SparseHalfCheckedEmbedder` 兜空稀疏。**能力探针（`POST /api/rag/config/probe-embedding`）是 provider 无关的**（它走 `resolve_provider` + `build_embedder`，不认厂商）——加了这一行它就自动覆盖新 provider，**不需要改探针**。

### D5 —— 界面：地址那一行的判据改成读 allowlist（④ 选「甲」）

| 落点                          | 改动                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `EMBEDDING_PROVIDER_OPTIONS`  | 加 `"volcengine-ark"`（`config-form.ts`；它是**前端写死的常量**，不是从 allowlist 渲染） |
| `PROVIDER_LABELS`             | 加一行标签（「火山方舟 (Ark)」）                                                 |
| i18n                          | 三处各加一个键（`zh-CN` / `en-US` / `types`）                                    |
| **接口地址那一行**            | **判据从写死的 `=== "dashscope"` 改成读能力块的新键 `has_fixed_endpoint`**（见 §3）。`true` ⇒ `LockedBox`，否则 `Input`（`openai-compatible` 因此行为一字不变）。`LockedBox` 的 `value` = **实际会用的地址**（存量值，否则该 provider 的 `default_endpoint`） |
| **「恢复默认」**（仅 `has_fixed_endpoint` 为真） | 当**存在存量值**时，框旁给一个动作：点它 ⇒ 清空 `embedding_base_url`（表单值置空，保存后回到该 provider 的默认地址）。没有存量值时**不出现**（否则就是一个永远无事可做的按钮） |
| **密钥那一行**                | **零改动**——它本来就不按 provider 分支；env 提示由 allowlist 的 `secret_env_var` 自动跟随 |
| **rerank 那一行**             | **不动**——它的判据里也写死了 `dashscope`，但 rerank 的能力块不在本期范围。**记为已知不对称**（与 `SPARSE_SERVICE_LABELS` 硬编码同类） |

### D6 —— ⑤「固定地址的 provider 与存量 `embedding_base_url`」：选 **⑤-4**

**问题**：`embedding_base_url` 是**两家共用、切 provider 不清**的字段，而后端 `if rag.embedding_base_url:` 让**存量值盖过内置默认**，且那一格**锁着 ⇒ 界面上清不掉**。曾填过别家地址 → 切到火山 ⇒ 火山去打那个残留地址，用户看着一个改不掉的框。（**今天就已成立**，非本期引入。）

**用户裁定 ⑤-4：运行期行为不动，只把"残留"变可见可清。**

| 层 | 决定 |
| --- | --- |
| **运行期** | **不改**。`rag.embedding_base_url` 有值 ⇒ 仍然用它（**百炼的 workspace 级地址因此保住**）。为空 ⇒ 用 `spec.default_endpoint`（值与今天实现类自带的常量相同 ⇒ **dashscope 行为一字不变**） |
| **能力块** | 每条新增 `has_fixed_endpoint` + **`default_endpoint`**（落在被整键排除的 `embedding_providers` 里 ⇒ 仍是纯加键，守卫不受影响） |
| **界面** | 锁框照实显示**实际会用的地址**；有存量值时旁边给**「恢复默认」**（清空该字段）。⇒ "看得见 + 清得掉"，替代原先"忽略存量"那条会砍掉能力的治法 |
| **防漂移** | 一条用例把 `spec.default_endpoint` 与实现类自带的常量**钉成相等**（`dashscope` 对 `DASHSCOPE_BASE_URL`），于是两处不会各自漂走——**不为此重构实现类** |

**为什么不选另外两条**（留档）：**⑤-1 无条件忽略**会连**百炼 workspace 级地址**一起废掉（用户明确要保留）；**⑤-3 不治**则"锁着且改不掉"的框仍在。

### D7 —— 影响面：两个新键是纯加法，但 dashscope 的构造路径有一处**等价改动**

| 项                                          | 结论                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **默认值**                                  | **一行不动**：`embedding_provider` 仍默认 `dashscope`、`embedding_model` 仍默认 `qwen3.7-text-embedding` |
| `RagConfig.embedding_provider` 的 `Literal` | 加一个值（纯加法）                                                                          |
| 两条「纯加法」守卫（GET/PUT 形状守卫）      | **自动通过**——它们把 `embedding_providers` **整键排除**在深层比较之外                       |
| `test_get_returns_the_embedding_provider_capabilities` | ❌ **必须更新**：它把整份能力列表钉成字面量两个键 ⇒ 加第三项。**这是预期内的用例更新，不是回归** |
| **现有 dashscope 的构造路径**               | **行为等价，但代码有改动**：`_build_dense` 的兜底值来源从实现类常量搬到 `spec.default_endpoint`（取值相同、**存量值仍优先**）。所以"dashscope 路径一行不动"**不成立**——变的是代码，不变的是行为；不切 provider ⇒ 运行中的部署与现有索引仍**零影响** |
| **数据**                                    | ⚠️ **一旦切到火山，现有索引必须重建**（稠密空间与稀疏 index 空间都换了）。切换后由用户点「设置 → 模型 → 功能模型 → 重建索引」，**不自动重建** |

### D8 —— 不做

- **不**做并发：一次一条**顺序**跑。理由是错误归属与顺序都保持平凡；吞吐留给以后（真要做，得同时定并发上限、超时与部分失败的归属）。**代价已在 D2 写明**。
- **不**接文本端点 `/api/v3/embeddings`：它没有 `sparse_embedding` 参数，而且该账号上文本模型**全部 404**（6 条 `Retiring`）。
- **不**喂图片/视频：只当文本向量用。多模态输入不在本期范围。
- **不**动 dashscope 那条路（含它的每模型批次表）。
- **不**补"维度守卫不在保存期跑"那个缺口（独立一条，见 D3）。
- **不**治「provider 级能力声明 vs 模型级真相」那条缺口（见 §6）——它与维度那条**同因**，应合并成独立一条增量（治法会让 PUT 出网，改变它的性质）。
- **不**动 rerank 那一行的写死判据（它的能力块不在本期范围），但**记为已知不对称**。
- **不**做"切换 provider 自动重建索引"：重建是用户的显式动作。
- **不**为火山做独立稀疏服务（`external` 那一格钉的是 TEI 形状，火山进不去；见 Parent 的结论）。

## 3. 接口契约

| 端点 / 契约                            | 变化                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /api/rag/config`                  | `embedding_providers` **多一项** `volcengine-ark`；**每条新增两个键**：`has_fixed_endpoint`（`dashscope`/`volcengine-ark` = `true`、`openai-compatible` = `false`）与 `default_endpoint`（前两者的内置地址、`openai-compatible` = `null`）。**仍是对该键的纯加法**（守卫整键排除），其余字段一字不变 |
| `PUT /api/rag/config`                  | 新增合法取值 `embedding_provider="volcengine-ark"`；成功路径形状不变                       |
| `RagConfig.embedding_provider`         | `Literal["dashscope", "openai-compatible", "volcengine-ark"]`                             |
| `ProviderSpec`                         | 新增 `has_fixed_endpoint: bool = False` 与 `default_endpoint: str \| None = None`（默认关 ⇒ 现有行不变） |
| `PROVIDER_ALLOWLIST["embedding"]`      | 新增一行 `volcengine-ark`；`dashscope` 那一行补两个新字段                                  |
| `POST /api/rag/config/probe-embedding` | **无改动**（provider 无关，自动覆盖新行）                                                  |
| `embedding_base_url` 的**运行期语义**  | **不变**（存量值仍生效 ⇒ workspace 级地址保住）。唯一差别：字段为空时由 `spec.default_endpoint` 显式兜底，值与原实现类常量相同 |
| 表 / `rag_config.json` schema / 迁移   | **无**                                                                                    |

环境变量：新增 `ARK_API_KEY`（密钥的环境回退；配置里的显式值优先）。

## 4. 验收

**后端**

1. allowlist 能解析 `volcengine-ark`，且 `emits_sparse is True` / `pins_dimension is True` / **`has_fixed_endpoint is True`** / `default_endpoint == "https://ark.cn-beijing.volces.com"`；同时断言 `openai-compatible` 的两个新字段仍是 `False` / `None`（默认关没被带偏）；
2. `build_embedder(config, rag=RagConfig(embedding_provider="volcengine-ark", …, embedding_sparse_source="provider"))` **能建出来**（不抛）；
3. **请求形状守卫**（桩服务器）：body 恰好含 `model` / `input`（**恰好一条** `{"type":"text","text":…}`）/ `dimensions`（**恰为 1024**）/ `sparse_embedding`（恰为 `{"type":"enabled"}`），路径为 `/api/v3/embeddings/multimodal`；
4. **一次一条**：喂 3 条文本 ⇒ 恰好 **3 次**请求（不是 1 次），且 `batch_size == 1`；
5. **解析**：响应 `data.embedding` + `data.sparse_embedding[]` ⇒ 组装出的 `EmbeddingResult.dense` 长度正确、`sparse.indices/values` 与响应一一对应（**不依赖响应顺序**）；
6. **空稀疏**：桩一个 `sparse_embedding: []` ⇒ 抛 `SparseHalfMissingError`（由 `_SparseHalfCheckedEmbedder` 负责，用它证明我们的适配器**不**自己吞掉）；
7. **失败类型**：401 ⇒ `EmbedderAuthError`；5xx ⇒ `EmbedderError`；形状不符 ⇒ `EmbedderError`；
8. **`text_type` 接受但不发送**：桩断言 `text_type="query"` 与 `"document"` 发出的请求体**逐字节相同**，且都不抛（这条同时钉住"参数被显式收下"，防的是签名不符的 `TypeError`）；
9. **env 名**：`secret_env_var("embedding", "volcengine-ark") == "ARK_API_KEY"`；
10. **不改默认**：`RagConfig()` 的 `embedding_provider` 仍是 `"dashscope"`；
11. **那条字面量用例更新**：能力列表 = 三项且顺序等于 `provider_ids("embedding")`，**且每条都带 `has_fixed_endpoint` 与 `default_endpoint`**（`dashscope` = `True` + `DASHSCOPE_BASE_URL`、`openai-compatible` = `False` + `None`、`volcengine-ark` = `True` + 火山默认）；
12. **两个新键同真同假**：对**每一行** allowlist 断言 `has_fixed_endpoint == (default_endpoint is not None)`——今天三家都成立；将来若真出现"有默认但不锁"的 provider，这条会逼着改设计，而不是让两处默默矛盾；
13. **两条「纯加法」形状守卫（GET / PUT）仍绿**（两个新键都落在被整键排除的 `embedding_providers` 里，所以是加键不是改值）；
14. **⑤-4 的回归保护（这条最重要）**：把 `rag.embedding_base_url` 指向**本地桩的地址**（当作"自定义地址"）⇒ `dashscope` / `volcengine-ark` 的构造**把它传给了实现**、请求确实落在桩上（**不是**该 provider 的默认 host）——**证明 workspace 级地址没被砍掉**；
15. **防漂移**：`resolve_provider("embedding", "dashscope").default_endpoint == embedder.DASHSCOPE_BASE_URL`（两处不会各自漂走）。

**前端**

16. `EMBEDDING_PROVIDER_OPTIONS` 含 `volcengine-ark`；**选火山或 dashscope ⇒ 接口地址是 `LockedBox`**，框里显示**实际会用的地址**（无存量值时显示该 provider 的 `default_endpoint`）；选 `openai-compatible` ⇒ 仍是可编辑 `Input`（与今天一字不变）；
17. **「恢复默认」**：造一个**有存量值**的配置 ⇒ 锁框旁出现该动作，点它 ⇒ 该字段清空、框里改显示默认地址；**没有存量值时它不出现**（而不是渲染成一个点了没反应的按钮）；
18. dom：切到火山后**不出现**任何"只输出稠密"告警，Save 可点（与 `openai-compatible` 的行为对照）；
19. i18n 三处键齐。

**真栈（`backend` + `frontend`，用真密钥）**

**腿 A —— 验新 provider（会切配置，跑完必须还原）**

20. 设置页选火山（模型 `doubao-embedding-vision-250615`）+ 密钥 ⇒ **保存成功、无告警**（尤其不出现那条 dense-only 告警）；
21. 能力探针回 `supported`（这就是"双路"在真栈上的证据）；
22. 用真端点跑一次 `build_embedder(...).embed([...])` ⇒ `dense` 非空且 **`sparse.indices` 非空**；
23. **地址那一行的规则**：选火山 ⇒ 锁框显示**火山的默认地址**、「恢复默认」**不出现**（没有存量值）；手工在 `rag_config.json` 塞一个**自定义地址**（就用百炼的 workspace 级地址试）⇒ 重载后锁框显示**那个自定义地址**、且「恢复默认」**出现** ⇒ 点它，框改回默认、`embedding_base_url` 被清空。**这一步专门证"workspace 级地址没被砍"**。（前提：前端**不会**回退/重置这个字段——实现时确认一次。）
24. **收尾**：配置**逐字节还原**（md5 与动手前相同）、密钥不落盘、不新建任何文件；「重建索引」入口**只确认在、不实际重建**（重建会改数据，不在本期验收范围）。

> 「**不切 provider ⇒ 零影响**」**不在真栈重复**：它由后端第 13 条（两条纯加法形状守卫）在用例层钉住。原先把它写成真栈的一条是**自相矛盾**的——同一条腿里既要切到火山、又要求不切。

## 5. 影响面

- `backend/packages/harness/deerflow/knowledge/providers/__init__.py`（加一行 + 新增 `has_fixed_endpoint` / `default_endpoint` 两个字段）
- `backend/packages/harness/deerflow/knowledge/embedder_ark.py`（新文件）
- `backend/packages/harness/deerflow/knowledge/embedder_factory.py`：`_build_dense` 对有固定地址的 provider 用 `rag.embedding_base_url or spec.default_endpoint`（**存量值优先 ⇒ 行为与今天等价**，只把"兜底值"从实现类搬到 allowlist）；**对它每次都注入 `dimension=`（见 D3）**；**错误文案里那句「只有 dashscope 有内置地址」改成不枚举 provider 的措辞**
- `backend/packages/harness/deerflow/config/app_config.py`（`RagConfig.embedding_provider` 的 `Literal` 加值）与 `config/rag_config_file.py`（同）
- `backend/app/gateway/routers/rag_config.py`：能力块每条**新增 `has_fixed_endpoint` / `default_endpoint`**（纯加键）
- `frontend/src/core/rag/types.ts`（能力块类型加两个键）、`core/rag/config-form.ts`（`EMBEDDING_PROVIDER_OPTIONS`）、`functional-models-view.tsx`（`PROVIDER_LABELS` + **地址那一行改读能力块** + **「恢复默认」动作**）、i18n 三处
- 文档：`backend/AGENTS.md`（嵌入 provider 段）、`frontend/AGENTS.md`（功能模型段）
- 环境变量：`ARK_API_KEY`
- **无迁移、无 schema 变更、不动任何默认值**

## 6. 已知缺口（本期不治，写在案上）

**G1 —— 维度守卫不在保存期跑**（既有，非本期引入）

`build_embedder` 只**包装**不调用 ⇒ 超宽模型（如 2560 维）**保存成功、第一次 `embed()` 才炸**。本期只钉住火山这一条路（适配器无条件发 `dimensions: 1024` + `pins_dimension=True`）。

**G2 —— provider 级能力声明 vs 模型级真相**（既有，非本期引入；2026-09-17 核实）

`emits_sparse` 是 **provider 级**的，而"能不能出稀疏"是 **model 级**的。同一把钥匙实测 `output_type=dense&sparse`：

| 模型 | 稀疏条数 |
| --- | --- |
| `qwen3.7-text-embedding` | 293 |
| `qwen3.7-text-embedding-flash` | 818 |
| `text-embedding-v4` / `-v3` | 2 / 2 |
| **`text-embedding-v2` / `-v1`** | **0 / 0**（**200 + 空数组**，不报错也不缺字段） |

⇒ **前端挡、后端放**：前端 `resolveSparseCapability` 会拿**模型级探针**的结论（v1/v2 回 `unsupported` ⇒ 该选项禁用 + 告警 + Save 灰）；后端 PUT **只查 provider 级**（`spec.emits_sparse`）⇒ 绕过前端（打 API / 手改 `rag_config.json`）能存下一个注定失败的双路配置。

**后果的响度**：运行期 `_SparseHalfCheckedEmbedder` 抛 `SparseHalfMissingError`——它是 **`ValueError` 系、不是 `EmbedderError`**，所以 `index_chunks` 那个「每批软失败 ⇒ `continue`」的 `except EmbedderError` **接不住它**，异常外抛。**响的，不是静默降级**，但仍是"存下来之后才炸"。

**G1 与 G2 同因**（*保存期只做静态判定，而真相必须问真模型*），应**合并成独立一条增量**——治法会让 PUT 出网，改变它"纯静态"的性质，需要单独设计（超时、平台不可达时怎么办）。本期**不治**（用户 2026-09-17 裁定「C」），只记录在此。

**G3 —— `has_fixed_endpoint` 只覆盖嵌入 leg**（本期引入的不对称）

`rerank` 那一行的锁判据仍写死 `=== "dashscope"`（rerank 的能力块不在本期范围）；`SPARSE_SERVICE_LABELS` 同样硬编码。加第二家 rerank provider 时要一并处理。
