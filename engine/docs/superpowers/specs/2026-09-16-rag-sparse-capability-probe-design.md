# 稀疏来源的**模型级**能力探测（design）

**Status:** 待实现（2026-09-16 起草）
**Plan:** [2026-09-16-rag-sparse-capability-probe.md](../plans/2026-09-16-rag-sparse-capability-probe.md)
**前序:** [2026-09-16-rag-sparse-compatibility-guard-design.md](2026-09-16-rag-sparse-compatibility-guard-design.md)（provider 级的能力下发与编辑期拦截；本设计补它的天花板）

## 1. 问题

上一版守卫把"能不能跟向量模型一起出稀疏"这件事判定在 **provider** 层：允许名单那一行 `emits_sparse`（`providers/__init__.py:55`，只有 `dashscope` 为 `True`）。界面据此报红并禁用 Save，保存期用它拦 400。

但真相是**模型级**的：同一个百炼平台上，有的向量模型一次调用同时返回稠密与稀疏，有的只出稠密。于是：

1. **请求恒定要稀疏**：`output_type: "dense&sparse"` 无条件带着（`embedder.py:165`），不看模型；
2. **拿不到就当空**：响应里没有 `sparse_embedding` 时是 `sparse_items = item.get("sparse_embedding") or []`（`embedder.py:175`）⇒ 构造一个 indices/values 全空的 `SparseVector`，**不校验、不报错**；
3. **照常入库**：它被原样写进 Qdrant（`vector_store.py:193`），稀疏那一路的 prefetch 于是拿不到东西（`:226`）。

**症状是检索质量静默下降**（稀疏 + RRF 那一路空转），而界面、保存期、运行期三处都拦不住——因为三处问的都是"provider 是不是 dashscope"，答案永远是"是"。

**缺口只在一种组合里**（这一点决定了范围可以很小）：

| 组合                                             | 事实在哪                                          | 现状                                      |
| ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------- |
| 模型双路，但挂 `openai-compatible` 提供商        | **方言**带不了稀疏（OpenAI 兼容协议没有这个字段） | `emits_sparse=false` **判对了**，无需探测 |
| 模型在 `dashscope`（原生方言）里，且**只出稠密** | 方言支持，**模型**不支持                          | **判不到** ← 本设计要补的唯一缺口         |

## 2. 目标

- 让「跟随向量模型」这个选择**在编辑期就知道成不成立**（含模型级），而不是等第一次入库后静默降级；
- 探测不到时**不误判**（断网、限流、条件不全都不等于"不支持"）；
- 探测不到的角落仍有**运行期兜底**，不再有"静默降级"这一档；
- **不动任何既有部署的行为**（尤其默认值）。

## 3. 决定

### D1 —— 默认值不动

`RagConfig.embedding_sparse_source` 的后端默认**仍是 `provider`**（`app_config.py:210`）。

- 它是"什么都不配就能用"的那条路（百炼默认 provider + 默认模型即双路）。
- 改成 `external` 等于把**所有从未声明该字段的部署**一次性翻到 external；那些部署没有 `sparse_provider`/地址 ⇒ `build_embedder` 直接拒（`embedder_factory.py:147`）⇒ **入库与检索全停**。这是一次全局行为变更 + 迁移，不是改一个默认。
- 前端那处回退（`config-form.ts:139` 的 `asEnum(..., "provider")`）**几乎是死代码**：响应永远带一个值（`values[name] = written.get(name, getattr(config.rag, name))`），回退分支轮不到。改它不产生任何效果。
- 闸门（D4）让默认值不可误选，因此不需要再翻默认。

### D2 —— 能力是**三态**，且由两处来源合成

| 状态                       | 从哪知道                                                      | 要不要探测                           |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------ |
| **支持**                   | 允许名单 `emits_sparse=true`（dashscope）**且**探测到稀疏非空 | 要（模型级）                         |
| **已知不支持**             | 允许名单 `emits_sparse=false`（openai-compatible）            | **不要**——方言本身带不了，零成本已知 |
| **不支持（探测结论）**     | 探针调通了、但响应里稀疏为空                                  | 已探                                 |
| **未知（`unverifiable`）** | 条件不全（没 key / 没 model）、网络失败、超时、鉴权失败       | 探不成                               |

- **`unverifiable` 这一档不能省**：把"探测失败"当成"不支持"会在断网/限流时误拒一个本来可用的配置，比现在的静默更糟。
- 前端合成一个 `sparseCapability: "supported" | "unsupported" | "unknown"`，**未知按放行**处理（与上一版已实现的"unknown ≠ unsupported"同一条规则）。
- **探测结论必须绑定它测的是哪一个配置**：结论带键 `provider|model|base_url`，合成时只在键与当前表单值相等时才采信，否则按 `unknown`。否则用户探完 A 模型（支持）再改成 B 模型（单路），会吃到 A 的旧结论——又回到静默。

### D3 —— 探针端点：`POST /api/rag/config/probe-embedding`

照 `POST /api/models/config/validate` 的先例（同一个"真打一次、不持久化"的模式）：

- **admin 门控**（同 rag 配置的其它端点）；
- 请求：`{embedding_provider, embedding_model, embedding_base_url?, embedding_api_key?}`；`api_key` 允许是**掩码哨兵**（＝用已存/环境的那把，前端不必回传明文）；
- **一次真实嵌入调用**，形状与运行期一致（同一段 `build_embedder` + `output_type`），检查响应里 `sparse_embedding` 是否非空；
- 响应：`{status: "supported" | "unsupported" | "unverifiable", detail: string}`；
- **不落盘、不改配置、不返回 key**；`detail` 只带状态码与**截断**的响应片段（照 validate 的做法，绝不回显密钥）；
- **有界超时**（validate 是 10s，沿用），超时/网络错误 ⇒ `unverifiable`；
- `unsupported` **只在调用成功且稀疏为空**时给出。
- **只回答一个问题**：探针只判定"该 provider + model 能否出稀疏"。任何**非稀疏原因**的失败——鉴权被拒、限流、HTTP 错误、超时——一律 `unverifiable`，且 `detail` **带上真实原因**（管理员仍要知道为什么没验成）。**探针不替代保存期校验**：维度与地址仍由 PUT 那层（上一版的 `build_embedder` 试构建）管。
  - **实现时更正（2026-09-16）**：初稿把"维度不符"列进这条规则要覆盖的情形，**那是错的**——探针唯一会真调的 provider 是 `dashscope`，而它 `pins_dimension=True`（`providers/__init__.py:55`）⇒ `build_embedder` 那一侧**根本不包维度守卫**；另一个 provider 是稠密单路，探针按名单短路、连调用都不发。所以这条路上**构造不出**维度失败，规则改为覆盖可达的那几类（鉴权 / HTTP 错误 / 超时 / 连接失败）。
- **无副作用**：探针**不会**写 `_PROBED_DIMENSIONS`——唯一会被真调的 provider 把维度钉在请求里，`_guard` 因此不包那一层（`embedder_factory.py:132`），所以"没保存过却已有认证"这种情况不会出现（初稿曾把这写成"顺带产物"，实现时更正）。

### D4 —— 界面表现

1. **已知不支持 ⇒ 选项置灰**：「跟随向量模型」这一项在 `embedding_providers` 说 `emits_sparse=false` 时 `disabled`（Radix `SelectItem` 的 `disabled` 即可；底层类已自带 `data-[disabled]:opacity-50`），标签里带一句原因。**点不了**。
2. **选中即自动探测**（我选的交互）：仅当 `provider === "dashscope"`（即允许名单说支持）**且** `embedding_model` 非空 **且**该密钥可用时才发。**密钥可用的判据是 `sources[field] !== "unset"`，不能按"输入框非空"**——env 提供的密钥在响应里就是空串（`sources.embedding_api_key === "env"`、`config.embedding_api_key === ""`），按非空判会让"百炼 + 环境变量 key"的部署**永远探不了**，功能形同失效（**这正是当前部署的形态**）。探测中显示「检测中…」；结论 `unsupported` ⇒ 落值 + 走上一版已实现的告警与 Save 禁用（复用，不新造一套表现）；`supported` ⇒ 无告警；`unverifiable` ⇒ 落值 + 该行标「未验证」。
3. **存量非法值**（老配置、或先选好再切 provider）⇒ 沿用上一版的表现：卡底红字 + Save 旁同一句 + Save 禁用。今天已实现，真栈两条腿已验过。
4. **不静默改写用户已选的值**：探测失败不自动把选择改成 `external`——那会造成"显示不等于实际"，也让用户失去知情权。
5. **知情权**：那一行的 ⓘ 说明"检测会产生一次真实调用"；状态文案用三个新键（检测中 / 未验证 / 检测说明），中英各一句。

### D5 —— 运行期兜底（探不到的角落）

`source=provider` 时，若一次真实嵌入的响应里 `sparse_embedding` 为空/缺失 ⇒ 抛 `SparseHalfMissingError`——`RagConfigurationError` 的**子类**，因此**继承**网关那条 400 映射，不需要第二次注册。文案给出两条出路（独立稀疏服务 / 本地 BM25）。

- **为什么要是单独的类**：探针必须把"模型答复了：我不出稀疏"（⇒ `unsupported`）与"压根没能查成"（⇒ `unverifiable`）分开，而这两者在**同一次调用里都表现为异常**；没有专门类型，探针就只能去读错误消息的文本。
- **探针复用这道判定，不另写一遍**：探针那侧的 `unsupported` 就**来自这个异常**（不再自己再读一次响应），所以"编辑期的结论"与"运行期的拒绝"由构造保证一致，不可能各自漂移。
- **每次检查、判否定就持续抛**——**不**照抄 `_DimensionCheckedEmbedder` 的"每进程只判一次"。那个先例是**先缓存后抛**（`_PROBED_DIMENSIONS[key] = measured` 写在 `if measured != 1024: raise` **之前**），它之所以安全：维度不符的向量会被 Qdrant 拒收，写不进去。**空稀疏却是合法值** ⇒ 放过一次就真写进去了，此后每次调用都跳过检查——等于"喊一声然后永久静默"，**比现状更隐蔽**。
- 因此**不做 fail-open 缓存**：判空是对返回对象的 O(1) 检查，缓存买不到什么；真要缓存也只能缓存**"已验证能出稀疏"**这一侧（判否定必须每次都抛）。
- 该判定**只作用于 source=provider**：其它来源下 dense 侧的稀疏本来就是被丢弃的（`ComposedEmbedder`），不该管。

### D6 —— 「稀疏模型」这一行要有交代

`sparse_model` 会被存进 `rag_config.json`，但**从不发给服务**——`sparse.py:18` 写明原因（TEI 一个实例只服务一个模型，所以不下发 model 字段；它留在契约里是给将来需要它的服务用的）。本期**只改交代**：那一行加 ⓘ 说明这一点，**不改行为**（不删字段、不改下发）。

### D7 —— 范围与不做

- **不做**模型级能力清单：清单会随平台上新而过时，探测取代它。
- **不改**后端默认（D1）。
- **不改** `recall-test` 的按路降级（`knowledge_service.py:1117` 把异常吞成「详情见服务端日志」）——那是另一条遗留，单独处理。
- **不动** rerank / parse 的拒绝类型（它们仍是普通 `ValueError`，不在 `build_embedder` 路径上）。
- **不加** kill switch：探测是只读、有界的单次调用。
- **不做**探测结论的会话级缓存：探测由用户动作触发、频率极低，缓存要处理失效而收益很小（结论已按 D2 绑定到具体配置）。
- **不做**自动改写用户的选择（D4.4）。

## 4. 接口契约

| 端点                                         | 变化                                                             |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `POST /api/rag/config/probe-embedding`（新） | admin；只读不落盘；`{status, detail}` 三态；有界超时；不返回密钥 |

前端新增的纯函数（"能不能选"与"结论属于谁"都测在这一层，因为 Radix Select 在 happy-dom 里打不开选项）：

- `sparseProbeKey(values)` → `"provider|model|base_url"`，探测结论绑定的键；
- `resolveSparseCapability(values, providers, probe)` → `"supported" | "unsupported" | "unknown"`（`probe` 是三态**加上它的键**；键与当前表单值不符 ⇒ `unknown`）；
- `isSparseProviderOptionDisabled(capability)` → 只有 `"unsupported"` 为真，即"选不了"的可测落点。

## 5. 验收

**后端**

1. 探针四态：桩**返回稀疏** ⇒ `supported`；桩**只返 dense** ⇒ `unsupported`；**网络失败/超时** ⇒ `unverifiable`；**鉴权被拒（401）**⇒ `unverifiable` 且 `detail` 含状态码（**不是** `unsupported`）。注：维度失败在这条路上不可达，见 §3 D3 的实现更正。
2. 探针**不落盘**：调用前后 `rag_config.json` 逐字节相同；响应体里**不含**提交的 key。
3. **名单已知的答案不打电话**：provider 说 `emits_sparse=false` ⇒ 直接 `unsupported`，且**零次**出网调用。
4. 运行期兜底：`source=provider` + 空稀疏 ⇒ `SparseHalfMissingError`（`RagConfigurationError` 子类，仍走 400）；**连续两次嵌入都抛**（不做 fail-open 缓存）；`source=bm25/external` 时空稀疏**不抛**（那一半本来就被丢弃）。探针的 `unsupported` 由**这一个**判定给出（探针不再自己读一遍响应）。
5. 既有行为不变：`embedding_sparse_source` 的后端默认仍是 `provider`（一条断言钉住）。

**前端**

6. `emits_sparse=false` ⇒ 「跟随向量模型」不可选：判定落在纯函数 `isSparseProviderOptionDisabled(capability)` 上；渲染层另外钉住 `unsupported` 时该行的可见表现。
7. **结论绑定**：`probe` 的键与当前表单值不符（换了 model / provider / base_url）⇒ 合成结果是 `unknown`，**不是**沿用旧结论。
8. 探测返回 `unsupported` ⇒ 落值 + `role="alert"` + Save 禁用（复用上一版的断言）。
9. 探测返回 `unverifiable` ⇒ **可保存** + 标「未验证」；`supported` ⇒ 无告警。
10. **触发条件**：没填 model ⇒ **不发**请求（断言 fetch 未被调用）；而**密钥来自环境**（`sources[field] === "env"`、输入框为空）⇒ **仍要发**——这是当前部署的形态，漏掉它功能就形同失效。

**真栈**

11. 真栈能验的三件（都不需要平台侧配合）：① 已知不支持（provider 切成 `openai-compatible`）⇒ 选项置灰 / 告警；② `unverifiable`（清空 model 等条件）⇒ 可保存 + 标「未验证」；③ 运行期兜底——手工把 `rag_config.json` 写成"`source=provider` + 目标只出稠密"，打一次会嵌入的接口 ⇒ `RagConfigurationError`（可读 400 或该路的降级说明）。每一步之后把 `rag_config.json` **逐字节还原**并用 `GET /api/rag/config` 复核。
12. **模型级的 `unsupported` 只在测试层覆盖**——除非你提供一个**真实存在的单路模型 id** 供真栈探。用可控桩跑出来的不算真栈验收，这里如实写明，不冒充。

## 6. 影响面

- `backend/AGENTS.md`：RAG 配置一节补探针端点与运行期兜底。
- `frontend/AGENTS.md`：功能模型一节补三态与置灰规则。
- 无迁移、无表结构、无 `rag_config.json` schema 变更（D6 只改文案）。
