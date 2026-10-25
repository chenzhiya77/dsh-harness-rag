# 保存期嵌入探测（G1 + G2 合并） —— 设计

**Parent:** [2026-09-17-rag-ark-embedding-provider-design.md](2026-09-17-rag-ark-embedding-provider-design.md)（那份 spec §6 把 G1/G2 判为「同因、应合并成独立一条增量、本期不治」——本 spec 就是那一条）
**Status:** 已交付 2026-09-17（Task 0–3；三条真栈腿全过，配置逐字节还原）

## 1. 问题

两条缺口**同因**：*保存期只做静态判定，而真相必须问真模型*。

**G1 —— 维度守卫不在保存期跑。** `build_embedder` 只**包装**不调用（`_DimensionCheckedEmbedder` 的判定发生在第一次 `embed()`），于是 `PUT` 能把一个宽度不对的模型存下来；失败推迟到**第一次入库或检索**才出现。

**G2 —— `emits_sparse` 是 provider 级，而真相是 model 级。** 后端 PUT 的交叉校验只查 allowlist 那一行，所以它挡不住「同一个 provider 下不该给稀疏的模型」：

| 模型（同一把百炼钥匙，实测 2026-09-17） | `output_type=dense&sparse` 的稀疏条数 |
| --- | --- |
| `qwen3.7-text-embedding` / `-flash` | 293 / 818 |
| `text-embedding-v4` / `-v3` | 2 / 2 |
| **`text-embedding-v2` / `-v1`** | **0 / 0**（HTTP **200 + 空数组**，不报错也不缺字段） |

界面那侧有**模型级探针**（`probe-embedding`）挡住它，但那是**前端**的；绕过前端（直接打 API、或手改 `rag_config.json`）能存下一个注定失败的组合。

两条的后果都是「**保存成功、之后才炸**」——这正是这一整线在治的那类问题。

## 2. 决定

### D1 —— 一次真调用，同时答两问

对**将要写入的**那份配置，做**一次**真实嵌入调用，然后：

| 问 | 怎么读 |
| --- | --- |
| 稠密宽度对不对 | 那次调用返回的 `dense` 长度是否 = `COLLECTION_DIMENSION`（1024） |
| 稀疏那一半在不在 | 仅当 `embedding_sparse_source == "provider"`：返回的 `sparse.indices` 是否非空 |

两问共用一次调用，因为运行期本来就是**同一段代码同时判这两件事**（`_DimensionCheckedEmbedder` 量宽度、`_SparseHalfCheckedEmbedder` 查空稀疏）。

**宽度那问对 `pins_dimension=True` 的 provider 也照样量**：它们自证宽度的前提是"平台真的照做"——量一次不要额外成本（向量已经在手里），顺手把"平台静默忽略 `dimensions`"这种边角也堵上。

### D2 —— 只在**相关字段真的变了**时才探

**不是每次保存都打网络。** 只有当下面六个字段里**任意一个的有效值发生变化**时才探：

`embedding_provider` / `embedding_model` / `embedding_base_url` / `embedding_api_key` / `embedding_dimension` / `embedding_sparse_source`

- 只改 rerank / parse / video / judge / qdrant_url ⇒ **一次网络调用都不发**，PUT 与今天一样快。
- 比较要用**解析后**的值：payload 里的密钥可能是**掩码哨兵**（= 用已存的那把），哨兵解析后若与当前值相同 ⇒ 视为未变，不探；**换成一把新钥匙 ⇒ 探**（新钥匙本来就该验一次）。**已按代码核实**：PUT 里那段 `submitted[name] = keep`（把哨兵换成已存的真钥匙）排在静态校验**之前** ⇒ 比较落在 `payload` 上就够了，不需要额外解析步骤。
- 判据是**值**不是"payload 里出现了这个键"：前端提交的是「文件已拥有的字段 + 本次改动」，只看键会把"只改 rerank"误判成探测。

### D3 —— 平台不可达 ⇒ **放行 + 一句 `warning`**，不是拒绝

**异常 → 结局**（探测只会抛出这两类，映射必须钉死——否则"确定的错"和"没能问到答案"会混在一起）：

| 探测抛出的 | 结局 | 为什么 |
| --- | --- | --- |
| `RagConfigurationError`（含 `SparseHalfMissingError` 与宽度那一条） | **400** | 问到答案了，答案是"不可用" |
| `EmbedderError` / `EmbedderAuthError` / 超时 / 连不上 | **200 + `warning`**（措辞按原因分：连不上 / 凭据被拒） | **没能问到答案**——那不是"不行" |

⚠️ **`sparse_source=external` 时，探测会打到稀疏服务**：`ComposedEmbedder.embed()` 先调稠密、再调稀疏编码器；稀疏服务是死的 ⇒ 抛的是 `EmbedderError` ⇒ 按上表是 **200 + warning**（服务可能稍后起来），**不是 400**。这条路径今天没有任何用例覆盖，必须补一条。

**401 归 warning 侧**：钥匙错是"确定的错误"，但它与"暂时连不上"一样**不该堵住保存出口**——用户可能正是来换钥匙的。措辞说"凭据被拒"。

于是 PUT 的完整结局：

| 探测结果 | PUT |
| --- | --- |
| 宽度不对 | **400**，正文直接用 `_DimensionCheckedEmbedder` 那句（含重建指引） |
| 要求了 provider 稀疏但它是空的 | **400**，正文直接用 `SparseHalfMissingError` 那句（含两条出路） |
| 连不上 / 超时 / 凭据被拒 / 稀疏服务是死的 | **200**（照常写入）+ **`warning`** 说明"没能验证" |

**为什么不拒绝**：**改配置的动机，常常正是"当前这份配置不能用"**。把"平台暂时连不上"升格成"不许保存"，等于把唯一的出口堵上——那比"暂时没验证"糟得多。（与探针族「**只报不拦**」同一精神。）

**`warning` 的形状：始终存在，无话时为 `null`**（`str | None = None`）。

⚠️ **刻意不沿用 `POST /api/models/config/validate` 那个"无话时缺席"的写法**——那边是**扁平**模型，`exclude_none` 只剔到顶层；这里的响应里嵌套着 `config`，而 **`exclude_none` 是递归的**。实测（2026-09-17）：

```
正常 dump:      {"config": {"qdrant_url": null, "embedding_model": null, …, "judge_model": null, …}}
exclude_none:   {"config": {"extract_model": "x"}, "sources": {}, "embedding_providers": []}
```

⇒ 那样会让响应形状**大面积变化**（`judge_model` / `embedding_base_url` / `sparse_provider` / `parse_*` 全消失）、让 golden 形状守卫整屏红，并让前端拿到 `undefined` 而不是 `null`（它的类型写的是 `| null`）。所以：**`warning` 一直在，没话说时它的值是 `null`**。

### D4 —— 判定复用运行期那一段，不另写

`build_embedder(config, rag=<将要写入的合并结果>)` ⇒ `await embedder.embed([_PROBE_TEXT])`，外面套 `asyncio.wait_for(..., _PROBE_TIMEOUT_SECONDS)`。

⚠️ **别照抄 `probe-embedding` 的 catch 结构**（按代码核实）：那个端点**只答稀疏那一问**，宽度错会掉进它最后那个兜底 `except Exception` ⇒ 报成 `unverifiable`。而保存期要求「宽度错 ⇒ **400**」⇒ 必须把 `RagConfigurationError` **捕在最前面**、判成 400；否则宽度错会被当成"没能验证"**放行**——那正好是 G1 要治的那个洞。

**与既有 `probe-embedding` 的关系**：那个是**只读探针**（给界面知情权、三态、永不拦）；这个是**保存期门禁**（二元、会拦）。两者判的是同一件事，所以断言逻辑（`SparseHalfMissingError` / 宽度比较）应当**走同一套类型与常量**，只有"怎么处置结论"不同。

### D5 —— 两条 400 的正文**直接用既有的两个异常文案**，不另写

- 宽度那条：`_DimensionCheckedEmbedder` 现成的「嵌入模型返回 {n} 维，而向量库集合固定为 1024 维 ⇒ 拒绝启用。+ 重建指引」；
- 稀疏那条：`SparseHalfMissingError` 现成的「…请改为「独立稀疏服务」（external）或「本地 BM25」（bm25）」。

前缀仍是 `提交后的配置仍不可用：`。**另写一份就会让同一事实有两处措辞**——本线一直在治这个。

### D6 —— 缓存只省一次往返；**它不会替你拒第二次**（按代码核实）

`_PROBED_DIMENSIONS` 的键是 `(provider id, base_url, model)`，只由 `_guard` **包装过的** provider 写：`pins_dimension=True` 的那些（dashscope / ark）**根本不挂那层包装**，保存期探测对它们**不写任何缓存**；`openai-compatible` 那一类才会写。

⚠️ **别指望"同一 key 之后会立刻拒"**——那段判定的写法是：

```python
if results and self._key not in _PROBED_DIMENSIONS:   # ← 判定体在这个 if 里面
    _PROBED_DIMENSIONS[self._key] = measured          # 先缓存
    if measured != COLLECTION_DIMENSION:
        raise RagConfigurationError(...)              # 再抛
```

⇒ key 一旦进了缓存，后续调用**直接返回、不再检查宽度**（放过去，靠 Qdrant 拒写兜底）。所以：

- 保存期探测**必须自己看 `dense` 的长度**（这就是 D1 那两问里的一问，不能省，也不能指望包装类）；
- 缓存带来的只是"少一次往返"，**不是**"第二次会被拒"。

### D7 —— 不做

- **不**给它加开关（"关掉保存期探测"这种旋钮的默认态仍然要选甲/乙，而正确性保障不该可选）。
- **不**动 G3（rerank 那行的锁判据仍写死）与 G4（rerank/parse 的配置类拒绝仍是普通 `ValueError` ⇒ 那个 500 还在）。
- **不**探测 rerank / parse / sparse 服务：它们不在 `build_embedder` 的路径上，各自的检查是另一个话题。
- **不**缓存探测结论：每次相关改动都真打一次（与探针族"无会话缓存"同）。

## 3. 接口契约

| 端点 | 变化 |
| --- | --- |
| `PUT /api/rag/config` | 相关字段变了 ⇒ **先静态校验、再真打一次、最后才写盘**；宽度不对 / 稀疏空 ⇒ **400**（`detail` 前缀 `提交后的配置仍不可用：`）；不可达 ⇒ **200 + `warning`**。失败路径上一次 `atomic_write` 都不能发生 |
| `PUT` 的响应体 | **新增 `warning: str \| None`**——**始终存在**，无话时为 `null`；**不用 `response_model_exclude_none`**（理由见 D3） |
| `GET /api/rag/config` | 不变 |
| `POST /api/rag/config/probe-embedding` | 不变（只读探针仍在） |
| `rag_config.json` schema / 表 / 迁移 | **无** |

## 4. 验收

**后端（桩端点）**

1. 桩一个返回 **2560 维**的端点 ⇒ PUT **400**，`detail` 以 `提交后的配置仍不可用：` 开头且含**重建索引**的指引（正文即 `_DimensionCheckedEmbedder` 那句）；
2. 桩一个 **dense 正常但稀疏为空**的端点 + `sparse_source=provider` ⇒ PUT **400**，`detail` 含两条出路（独立稀疏服务 / 本地 BM25，即 `SparseHalfMissingError` 那句）；
3. **反例**：同一个空稀疏端点但 `sparse_source=bm25` ⇒ PUT **200**（稀疏不由 provider 提供，就不该拿它拦人）；
4. **`external` + 死的稀疏服务** ⇒ PUT **200 + `warning`**（**不是 400**）——D3 那张映射表唯一的入口，今天没有用例覆盖它；
5. **不可达**（死端口）⇒ PUT **200** 且响应带 `warning`；**且配置确实写进去了**（写盘 + 有效值复核）；
6. **凭据被拒**（桩返回 401）⇒ PUT **200 + `warning`**，且措辞说的是"凭据被拒"而不是"连不上"；
7. **只改无关字段**（如 `rerank_model`）⇒ 桩端点**一次调用都没收到**（计数为 0），PUT 仍然 200；
8. **相关字段真的变了才探**：payload 带着嵌入字段但值与当前相同（含**掩码哨兵**情形）⇒ **0 次调用**；
9. **失败不半写**：被拒的写**落盘为零**（读回的配置与写前逐字节相同）；
10. `warning` **始终存在**，无话时值为 `null`；**且不因为它的加入而让 `config` 里任何原本是 `null` 的字段消失**——加一条形状断言：`config.judge_model` 仍是 `null` 而不是缺键（这条专门守 D3 那个"不许用 `exclude_none`"的决定）；
11. 两条既有「纯加法」形状守卫按新契约更新后仍绿（见 §5 的说明）。

**前端**

12. PUT 返回 `warning` ⇒ 保存成功后把这句话显示出来（沿用 `models-add-dialog` 那个渲染位置的做法，不新造控件形态）；
13. PUT 返回 400 ⇒ 显示 `detail`（今天已有的失败路径，不回归）。

**真栈**

14. 把嵌入模型配成一个**宽度不对**的（能连上的）模型 ⇒ 保存当场被拒，提示含重建索引；
15. 配一个**连不上**的地址 ⇒ 保存成功 + 页面给出"没能验证"的提示；随后把配置**逐字节还原**（md5 与动手前相同）。

## 5. 影响面

- `backend/app/gateway/routers/rag_config.py`：`PUT` 里加一步「相关字段变了才探」+ 探测本身；响应模型加 `warning: str | None = None`（**不加 `response_model_exclude_none`——它是递归的，会把 `config` 里所有 null 一起剔掉，实测见 D3**）；探测不可达 ⇒ 记一条 warning 日志。
- ⚠️ **一条既有守卫要按新契约更新**：`test_put_response_only_gained_the_capability_field` 现在断言键集**恰好** = golden ∪ `{embedding_providers}`；加了 `warning` 之后它要放宽到 `golden ∪ {embedding_providers, "warning"}`（`warning` **始终在**，值可能为 `null`）。这是**有意的放宽**；spec 这里登记，免得日后被当成"纯加法被破坏"。
- `backend/packages/harness/deerflow/knowledge/embedder_factory.py`：探测复用 `build_embedder`，预计**不改**（若需要把"量宽度"变成可复用的出口，那是 Task 0 要核的事）。
- `frontend/src/core/rag/api.ts` / `hooks.ts` / `types.ts`：PUT 响应的类型加可选 `warning`；保存成功后按需展示。
- 文档：`backend/AGENTS.md`（RAG 配置一节：PUT 的**三条结局**、异常→结局的映射、"只在相关字段变了才探"及那六个字段、以及**`PUT` 从此可能出网 ⇒ 最坏多等 `_PROBE_TIMEOUT_SECONDS`（10s）**）、`frontend/AGENTS.md`（保存失败/警告的呈现）。
- **无迁移、无 schema 变更、不动任何默认值。**

## 6. 本期之后仍然开着的（不在本 spec 范围）

- **G3**：`rerank` 那一行的锁判据仍写死 `dashscope`；稀疏服务提供商那格仍是写死的两项。
- **G4**：`rerank` / `parse` 的配置类拒绝仍是普通 `ValueError`（HTTP 上是 500），与嵌入那半的可读 400 不对称。
- 探针族**无会话缓存**（每次打开设置页一次真实调用）——仍未表态。
