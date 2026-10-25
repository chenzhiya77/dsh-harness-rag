# RAG 稀疏来源「选错也存得下」的编辑期拦截（design）

**Status:** 待实现（2026-09-16 起草）
**Plan:** [2026-09-16-rag-sparse-compatibility-guard.md](../plans/2026-09-16-rag-sparse-compatibility-guard.md)
**前序:** [2026-09-14-rag-model-provider-adaptation-design.md](2026-09-14-rag-model-provider-adaptation-design.md)（provider 维度与三条稀疏路的来源）

## 1. 问题

「稀疏向量来源」有三个取值，其中一个只在特定条件下合法：

| 取值                         | 合法性                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `跟随向量模型`（`provider`） | **仅当所选嵌入 provider 的允许名单行 `emits_sparse=True` 时合法**。目前只有 `dashscope` 是 `True`，`openai-compatible` 是 `False` |
| `独立稀疏服务`（`external`） | 任何 provider 都合法                                                                                                              |
| `本地 BM25`（`bm25`）        | 任何 provider 都合法                                                                                                              |

现在这条约束**只活在后端**，界面上三处都没有：

1. **前端不知道**。`emits_sparse` 只出现在 4 个后端文件里（允许名单、`embedder_factory.py:86` 的拦截、一条测试），`frontend/src/` 零引用；`config-form.ts:63` 只有 id 列表。
2. **保存不校验**。`put_rag_config`（`app/gateway/routers/rag_config.py:176`）只做密钥哨兵处理然后落盘，没有跨字段检查。
3. **出错看不到**。唯一的拦截在第一次要用嵌入时（`embedder_factory.py:86` 抛 `ValueError`，消息点名 provider 并给出两条出路），但网关**没有注册任何异常处理器**（全仓 `add_exception_handler` / `@app.exception_handler` 命中 0 处，`FastAPI(...)` 也未开 `debug`），于是它变成裸的 `500 Internal Server Error`：那句中文只留在服务端日志里。

**用户实际经历的**：把嵌入 provider 换成 `openai-compatible`、稀疏来源留在默认的 `跟随向量模型`，点保存 → 成功；之后某次上传或检索失败，界面上只看到一次通用失败。

## 2. 目标

- 选到一个不可能启用的组合时，**在编辑期就说清楚**，并阻止保存；
- 手工改过 `rag_config.json` 的部署，在 HTTP 路径上拿到**可读的 400**，而不是裸 500；
- 不改变任何合法配置的行为，不改变后台任务（worker）与工具调用（search tools）现有的失败语义。

## 3. 决定

### D1 —— 能力随配置一起下发

`GET /api/rag/config` 的响应新增一个**只读能力块**，列出嵌入 leg 每个 provider 会不会自带稀疏：

```jsonc
{
  "config": { ... },
  "sources": { ... },
  "embedding_providers": [
    { "provider_id": "dashscope",         "emits_sparse": true },
    { "provider_id": "openai-compatible", "emits_sparse": false }
  ]
}
```

形状取自允许名单本身（`deerflow.knowledge.providers.resolve_provider("embedding", id).emits_sparse`），**不是**前端再抄一份名单——抄一份就会漂。

- 加字段是纯加法：旧前端忽略它。
- **只报嵌入 leg**，因为只有它的允许名单行带「能力标志」（`emits_sparse`）这种需要界面**预判**的字段。rerank 与 parse 并非没有约束——`MineruLocalParseProvider`（`parse_local.py:112`）与 `TEISparseEncoder`（`sparse.py:110`）同样在构造期校验地址——但那些是**取值依赖**，不是能力标志，靠 D3 在保存时拦下（而 D3 本次只覆盖嵌入 leg，见 §5）。
- 字段名保持 `embedding_providers` 而不是 `..._capabilities`：这份列表**就是**嵌入 leg 的 provider，`emits_sparse` 只是它的一个属性；将来给条目加键不会让名字失真，而加 `_capabilities` 后缀反而把它说小了。

### D2 —— 编辑期就地拦下

前端拿到 D1 后，在选中的 provider 与稀疏来源不匹配时渲染一条 `role="alert"` 的红色提示，位置与已有的「需重建索引」告警同处（检索卡底部，**不放进折叠区**——放进折叠区等于对折叠状态下的人不可见）。

- **判定取表单当前值**（`values.embedding_provider`），不是已保存的值：用户**切到**错误组合的当下就该看到提示，而不是保存之后。
- 文案（与后端 `embedder_factory.py:87` 是同一事实，语气对齐，实现时直接落这两个键值）：
  - zh：`当前提供商只输出稠密向量，无法由它提供稀疏；请把「稀疏向量来源」改为「独立稀疏服务」或「本地 BM25」。`
  - en：`This provider emits dense vectors only, so it cannot supply the sparse half. Set the sparse source to a separate sparse service or local BM25.`
  - > **2026-09-16 后续修订（主语改中性）**：上面两句的主语是"提供商"，但后续实测证明**支持稀疏的提供商下也有单路模型**（百炼的 `text-embedding-v1` / `v2`）⇒ 主因是模型时会指错对象。现文案已改为「当前选择的向量模型无法提供稀疏向量…」/「该向量模型只输出稠密向量」（i18n 键名不变），后端那两句不动。原文按冻结规矩保留，改动见 [2026-09-16-rag-sparse-capability-probe.md](../plans/2026-09-16-rag-sparse-capability-probe.md) 的 Task 5 第 8 条。
- **Save 同时禁用，并且必须说明原因**：非法态下在 Save 左侧（复用既有「没有需要保存的改动」的位置）显示同一句。只灰按钮不给理由，会让告警落在视口外的人卡在「能改不能存、不知道为什么」。
- 理由：这个组合后端必定拒绝，让按钮可点只会换来一次失败往返。

### D3 —— 保存期用**同一段代码**判定

`PUT /api/rag/config` 在落盘前先试构建一次 embedder，失败则 400，`detail` 就是那句中文：

- **不另写一套规则**，因此保存期的判定与运行期的判定**不可能漂**：同一段 `embedder_factory` 代码、同一句消息。
- 构建不发出任何网络请求（只构造客户端与解析类；维度探测发生在第一次真实 `embed()`，不在构造期），PUT 是低频管理操作，可以接受。
- 覆盖范围 = **嵌入 leg 的构建期规则**：稀疏来源与 provider 不匹配、非 dashscope 缺 `embedding_base_url`、`external` 缺 `sparse_base_url`（`sparse.py:110`）、声明维度不是 1024。**rerank 与 parse 不在本次覆盖内**（见 §5）。
- 400 而不是 422：配置在语法上合法，是**语义上无法启用**。

**接口**：判定必须针对**将要写入的**配置，而不是当前生效的，所以要给 `build_embedder` 一个显式覆盖参数：

```python
def build_embedder(config: Any | None = None, *, rag: Any | None = None, client: Any | None = None) -> Embedder:
    ...
    rag = rag if rag is not None else config.rag
```

选它而不是给 `AppConfig` 凑一个替换副本：`model_copy(update=...)` 默认不重校验，凑出来的对象与真配置不同源；显式 `rag=` 也让测试能直接喂一个 `RagConfig`，不必伪造整个 AppConfig。代价是签名多一个口子，只有一处调用点用它。

**已知副作用（接受）**：若坏在界面改不到的地方（`config.yaml` 的 `rag:` 块自身就是坏的），那么 PUT **任何**字段都会因「提交后的视图仍然构建失败」而 400，管理员只能去改文件——**这种部署上用界面存不进任何东西**。接受它的理由：界面本来就不该把不可用的配置写进去；而「把坏的那次改好」的 PUT 构建的是修好的视图，能通过，不会把人困死。代价是错误消息会指向一个他刚才没动过的字段，所以 `detail` 要带上前缀说明语义，如 `提交后的配置仍不可用：<原因>`。

### D4 —— 给手工改文件的部署留一条可读出口

新增 `RagConfigurationError(ValueError)`（放在 harness 的 `knowledge` 侧，与 `EmbedderError` 等并列），`build_embedder` 的配置类拒绝改抛它；网关注册**一个**异常处理器把它映射成 400 + `detail=str(exc)`。

- **只映射这一个新类型**，不是给全 app 的 `ValueError` 开后门——后者会把无关的编程错误也说成 400。
- 子类化 `ValueError` 保持既有 `pytest.raises(ValueError)` 与调用方 `except ValueError` 全部继续成立。
- worker 与工具调用路径**不变**：它们不经 HTTP，异常照旧向上冒（后台任务的失败语义是 job 失败 + 日志，不是状态码）。

## 4. 接口契约

| 端点                                                     | 变化                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /api/rag/config`                                    | 响应加法：`embedding_providers: [{provider_id, emits_sparse}]`                             |
| `PUT /api/rag/config`                                    | 新增 400 分支，`detail` = `提交后的配置仍不可用：<原因>`（中文，含两条出路）；成功路径不变 |
| 其它 HTTP 路径（knowledge 下凡调用 `build_embedder` 的） | 配置类失败由 500 变 400 + 可读 `detail`                                                    |

harness 侧新增一个**向后兼容**的签名口子：`build_embedder(..., *, rag=None)`（见 §3 D3 接口）。

## 5. 不做什么

- **不改** `EmbedderError` 的软失败语义（`index_chunks` 按批次软失败是既有契约，配置错误从第一天起就故意用 `ValueError` 与之区分）。
- **不改** worker / search tools / eval 的失败方式。
- **不做**前端的 provider 能力本地缓存或第二份名单。
- **不做**对 `external` / `bm25` 搭配任何 provider 的额外校验（合法组合）。
- **不做** rerank / parse 的保存期试构建：它们各有独立工厂（`reranker_factory.py:15`），parse 的构建器还直接读全局配置（`parser.py:731`），要覆盖得把三个工厂都改成"可传入视图"。**代价记在这里**：两者的地址校验发生在构造期（`parse_local.py:112`），所以「存得下、用时才炸」在它们身上依然存在。
- **不做** kill switch：PUT 是低频管理员操作、失败即时可见，不需要像 `rag.table.enabled` 那样的运行时开关。
- **不动** `.env` / 密钥解析链（`显式参数 > 文件 > 环境变量`）。

## 6. 验收

**后端**

1. `GET /api/rag/config` 的 `embedding_providers` 与允许名单一致（dashscope=True、openai-compatible=False）。
2. **形状守卫（"纯加法"的证据）**：`GET` 与 `PUT` 成功路径的响应体，在**改动代码之前**用真实端点跑出一份 golden 存成夹具，改完之后必须仍然满足——
   - 键集恰好等于 `golden 的键 ∪ {"embedding_providers"}`；
   - 且**除该键之外的部分与 golden 逐字节相等**（deep-equal，不做归一化、不排序、不裁字段）。
     注意不能整体比对：加字段与"逐字节相同"互斥，所以断言写成"只多这一个键、其余一字不改"。夹具里的密钥字段是掩码哨兵，不含真实值。
3. `PUT` 一个 `{embedding_provider: "openai-compatible", embedding_sparse_source: "provider"}` → **400**，detail 含 provider id 与两条出路；同请求的**任何字段都没有落盘**。
4. 同一个 PUT 换成 `sparse_source: "bm25"` → 200，正常落盘（反例，证明不是一刀切拒）。
5. `build_embedder` 的配置类拒绝抛的是 `RagConfigurationError`，且 `isinstance(exc, ValueError)` 为真；网关把它映射成 400 的处理器有对应用例。
6. 既有 `tests/knowledge/test_provider_construction_sites.py` 与稀疏相关用例**全绿不改**。

**前端**

7. `emits_sparse=false` + `sparse_source=provider` → 出现 `role="alert"` 告警，且 Save 禁用。
8. 换成 `bm25` → 告警消失、Save 回到「有改动才可点」的既有规则。
9. 后端没给 `embedding_providers`（旧响应）时不报错、不误报（降级为不提示）。

**真栈**

10. 在 `localhost:3000` 上把 provider 切到 `openai-compatible` 并保持来源为「跟随向量模型」：告警出现、Save 不可点、**Save 旁给出同一句原因**；改回 `dashscope` 后恢复正常。
11. **D4 的出口（不经前端）**：手工把 `rag_config.json`（gitignored 的运行时文件）写成同一个坏组合，再打一个**会让异常冒泡**的接口——`POST /api/knowledge-bases/{kb_id}/manual-knowledge`（`include_in_wiki_search: true`；它的顺序是 embed → upsert → 落库，坏配置在 embed 就失败，**不会写入任何数据**）——拿到 **400 + 可读 detail**，而不是裸 500。
    ⚠️ **真栈实测（2026-09-16）修正了本条的一个前提**：`POST /{kb_id}/recall-test` **不能用**来验这条——它按路降级（「该路检索失败（RagConfigurationError），详情见服务端日志。」）并返回 **200**，异常到不了处理器。这是该端点"永远产出完整报告"的既有设计，不是缺陷；但它同时意味着**那条路上可读的那句话仍然没到用户眼前**，属于本期之外的遗留（见 §5）。

## 7. 影响面

- `frontend/AGENTS.md`：功能模型一节补「能力随配置下发 + 编辑期拦截」。
- `backend/AGENTS.md`：RAG 配置一节补 `embedding_providers` 与 PUT 的 400 语义，以及 `build_embedder` 新增的 `rag=` 覆盖参数。
- 契约文件：无（`RagConfigResponse` 由 pydantic 直接产出，不在 `contracts/` 下）。
- 迁移：无（不改表、不改 `rag_config.json` 的 schema）。
