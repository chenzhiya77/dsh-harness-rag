# 通用腿接口地址去重（重复的路径段不再重复拼） —— 设计

**Status:** ✅ **已提交（2026-09-26）** —— `3fd320b8`（docs：本 spec+plan+真栈证据）+ `085d8dc7`（code，10 文件）。**D1 乙 / D2 乙（作用域，parse-local 理由已写实）/ D3（前端仅 ⓘ） / D4 甲（ⓘ 并入）/ D5 甲（example 三行顺手修）** 全裁、Task 0–4 全做完；门禁 = 后端相关面 148 passed + `make lint` 净、前端 `pnpm check` 净、真栈桩腿两腿全过（证据 `pr-build/rag-endpoint-dedup-2026-09-26/`）。**未推送。** 本对修 2026-09-25 endpoint-unlock 对留下的一处自相矛盾：灰字示例 `https://api.example.com/v1` 是生态形态（把 `/v1` 算进 base），而通用腿的拼接会在后面再补一段 `/v1`。厂商腿（dashscope / 火山方舟 / TEI / MinerU）地址是主机名、路径是专有整段，不受影响、不在本对。

## 1. 问题

「接口地址」= **该腿固定路径之前的那段前缀**；拼接发生在两处：`embedder_openai.py:110`（`base + "/v1/embeddings"`）与 `reranker_generic.py:97`（`base + "/rerank"`）。而服务商文档给的 base 都是**把 `/v1` 算进去**的生态形态（OpenAI SDK / LangChain / Ollama / SiliconFlow / 百炼兼容面 / Jina 皆然）：

| 腿 | 固定拼上的段 | 照文档抄来的典型地址 | 今天的结果 |
| --- | --- | --- | --- |
| 向量 `openai-compatible` | `/v1/embeddings` | `https://host/v1`（Ollama / SiliconFlow / 百炼兼容面…） | 拼成 `…/v1/v1/embeddings` ⇒ 404 |
| 向量 | 同上 | `https://host/v1/embeddings`（整端点） | 拼成 `…/embeddings/v1/embeddings` ⇒ 404 |
| 重排 `generic-rerank` | `/rerank` | `https://host/v1`（Jina 惯例；vLLM 同款） | `/v1/rerank` ✓（本表唯一本来就通的） |
| 重排 | 同上 | `https://host/rerank`（整端点） | `…/rerank/rerank` ⇒ 404 |

即：**"照文档填"这条最自然的路径在两个通用腿上是坏的**；09-25 对新增的灰字示例恰好就是这个形态 ⇒ 示例与拼接规则互相矛盾（示例教人填一个会被拼坏的地址）。

### 1.1 顺带修复（2026-09-26 审查并入，他裁）

**a. 「接口地址 ⓘ」文案已失真且是本对唯一用户可见的落点（D4 甲）**：`retrievalEndpointHint`（zh `zh-CN.ts:1695` / en `en-US.ts:1789`）仍写着 09-25 已被推翻的两条语义——「留空 = 用该提供方的默认地址」（现为空=报错）、「地址由客户端固定」（现已解锁）——且最后触碰是 `0d6bd5d5`、09-25 的 `090bbcbc` 没动它（上一对漏网）。去重后「照生态带 `/v1` 或整端点都能用」只有写进这里用户才看得到（`backend/AGENTS.md` 是开发者文档）。一条 key 服务两腿的 ⓘ，文案须两腿通用；`frontend/tests` 对该 key **0 命中** ⇒ 改值零断言。

| | 原文 → 改成（zh） | 原文 → 改成（en） |
| --- | --- | --- |
| 现文 | 「留空 = 用该提供方的默认地址；换成百炼以外的提供方后需要填写。百炼走自有协议，地址由客户端固定。」 | "Empty means the provider's own default endpoint; fill it in after switching away from DashScope, whose address is fixed by the client." |
| **改成** | 「必填。填法随意：主机名（`https://host`）、带 `/v1` 的 base（`https://host/v1`）或整段端点（`https://host/v1/embeddings`）都能用——与固定段重复的那节不会重复拼。」 | "Required. Any of these work: the host, a base ending in `/v1`, or the full endpoint — a segment repeated by the leg's fixed path is not joined twice." |

**b. `config.example.yaml` 三处同块漂移顺手修（D5 甲）**：

| 行 | 原文 | 改成 |
| --- | --- | --- |
| `:2595` | `# embedding_provider: dashscope        # dashscope \| openai-compatible (dense only)` | `# ... # dashscope \| volcengine-ark \| openai-compatible (dense only)` |
| `:2596` | `# embedding_base_url:                  # endpoint; empty uses the provider default` | `# endpoint; required (no provider fallback)` |
| `:2603` | `# rerank_provider: dashscope           # dashscope \| generic-rerank` | `# ... # dashscope \| generic-rerank \| tei-rerank` |

## 2. 决定

### D1 —— 拼接前先"去重"（**已裁：乙**，2026-09-26）

两腿共用一条规则，三分支：

1. **整端点**：地址去掉尾斜杠后**已以要拼的段结尾**（`…/v1/embeddings` / `…/rerank`）⇒ 原样用，不再拼；
2. **生态 base**：地址以 `/v1` 结尾、而本腿要拼的段是 `/v1/…` ⇒ 跳过重复的那节 `/v1`，只拼它之后的部分（`…/v1` + `/v1/embeddings` ⇒ `…/v1/embeddings`）；
3. **其它**：照旧全拼（主机名、`https://host/api` 这类自定义前缀，逐字不变）。

**与 09-25 删掉的「静默兜底」的区别（会被问，先答）**：兜底 = 值为空时替用户发明一个默认（已删）；本规则 = **解析用户实际填的值**，且只对"今天必然拼坏"的形态生效 ⇒ **今天能用的地址（分支 3）拼接结果逐字不变**，不存在"静默改掉本来能用的东西"。

**残留风险（如实记）**：服务真把 API 挂在 `…/v1/v1/…` 且用户就要那个地址——实际不存在。另：嵌入腿保存期探针照旧在保存时真打一发、打不通会当场报；重排腿无探针，拼错表现为退回 RRF 序（比今天少一种静默坏）。

### D2 —— 作用域 = 两个通用腿（厂商/自部署腿不做）

- 只做 `openai-compatible`（嵌入）与 `generic-rerank`（重排）：它们的固定段短（`/v1/embeddings`、`/rerank`）、且与生态形态直接冲突。
- **厂商腿一律不做**：dashscope 两腿、volcengine-ark、tei-rerank、tei-sparse、mineru 两腿——地址是主机名（或自部署服务根）、路径是厂商/服务专有的整段（如 DashScope 的 `/api/v1/services/…`、TEI 的 `/rerank`）；把 `…/compatible-mode/v1` 粘给百炼腿属于**选错端点族**，只能报错，猜不得。
- **parse-local 单独说明（审查补齐，理由写实；实测修正点位数）**：它的固定路径是 `/v1/uploads`、`/v1/parse/jobs` 这类**多段式 v1 前缀**（`parse_local.py` 固定段共 **5 处**：`:181/203/216/225/244`；另 `:195` 拼的是服务返回的相对 `upload_url`、不是我们的固定段、不属同类），形态上与本对同类；豁免理由**不是**"路径专有整段"，而是：**没有示例/文档把人往 `/v1` 上引**（其地址惯例是服务根 `http://host:port`），且本机能跑通的真栈桩即以服务根为准 ⇒ 本对不碰，登记为同类残留（将来若出现"照文档填 `/v1`"的落点，同规则直接复用 `join_endpoint`）。

### D3 —— 存值与界面零改动（**修订 2026-09-26：前端并入 ⓘ 文案两行**）

- 去重**只作用于请求 URL 的拼装**：不写回、不改存值——`rag_config.json` 里逐字仍是用户填的（PUT/GET 往返不动）。
- **灰字示例不动**：去重后 `https://api.example.com/v1` 变成"填了也对"的示例，两格示例形状保持统一。
- **前端改动 = 仅 ⓘ 文案两行**（§1.1 a，D4 甲）；其余前端（示例、必填、校验）零改动。必填、保存期探针、错误文案一律不动。

### D4 —— ⓘ 文案并入（**已裁：甲**，2026-09-26）

| 落法 | 做法 |
| --- | --- |
| **甲 · 并入本对**（**已裁**） | 按 §1.1 a 的两列文案改 zh/en 各一行；零断言（该 key 测试 0 命中） |
| 乙 · 只登记待裁 | 本对交付后 ⓘ 仍教旧语义（用户照它会填"留空"= 被必填挡住；且看不到"照生态填也行"） |

### D5 —— `config.example.yaml` 三处漂移（**已裁：甲**，2026-09-26）

| 落法 | 做法 |
| --- | --- |
| **甲 · 顺手修**（**已裁**） | 按 §1.1 b 三行照改（同块、零行为影响） |
| 乙 · 只登记 | 留三处漂移（其中 `:2596` 与 09-25 同源） |

## 3. 落点

| 面 | 改什么 |
| --- | --- |
| **新增** `deerflow/knowledge/endpoint_url.py` | 纯函数 `join_endpoint(base_url, path)` 实现三分支（自带去尾斜杠）。两腿共用一份、避免两份漂移——与前端 `endpointPlaceholderFor` 同款理由 |
| `embedder_openai.py:110` | `f"{self._base_url}{_EMBEDDINGS_PATH}"` ⇒ `join_endpoint(self._base_url, _EMBEDDINGS_PATH)` |
| `reranker_generic.py:97` | 同上（本腿 `path="/rerank"`，分支 2 天然不触发） |
| 用例 | 新增 `backend/tests/knowledge/test_endpoint_url.py`（三分支 × 两种路径形态）；两腿各补一条"生态 base 打得出请求"的钉子（`test_embedder_providers.py` / `test_reranker_generic.py`） |
| `backend/AGENTS.md` | embedding provider 段补一句：地址可照生态带 `/v1` 或整端点，重复段不会重复拼（spec 2026-09-26） |
| **前端** `locales/{zh-CN,en-US}.ts` | §1.1 a 的 ⓘ 文案各一行（D4 甲）——前端唯一改动 |
| `config.example.yaml` | §1.1 b 的三行注释（D5 甲） |
| **不动** | 前端其余全部（示例/必填/校验）、厂商腿、探针、存值语义 |

## 4. 验收

1. 三分支各自成立：主机名 / `…/v1` / 整端点 ⇒ 拼出同一个期望 URL（单元钉，两腿各一遍）。
2. **对今天能用的值零影响**：主机名与自定义前缀（`https://host/api`）的拼接结果与改动前逐字相同——既有断言（`test_embedder_providers.py:118` 的 `…/v1/embeddings`）零改动全绿。
3. 重排腿：`…/v1`（Jina）结果与今天逐字相同（`…/v1/rerank`）；整端点形态从坏变好。
4. 存值不被改写：以 `…/v1` 结尾的地址保存后逐字仍是 `…/v1`（往返用例）。
5. 厂商腿零改动：dashscope / ark / tei 的既有用例零改全绿（本对不碰它们的 URL 构造）。
6. 空地址行为不变：仍必填、仍报错（既有用例零改）。
7. 门禁：后端相关面 + `make lint` 全绿；前端 = `pnpm check`（仅 i18n 两行值改动，tsc 抓 zh/en 对称；**全量前后端套件不跑**，理由=零断言影响，交付说明里注明）。
8. 真栈腿（本机桩，零出网、两腿各一条）：嵌入地址改成桩的 `/v1` 形态 ⇒ 保存期探针**通过**；同一桩换整端点形态 ⇒ 同样通过；**重排腿**（无探针，走桩直接打）同样两形态各一次，断言请求路径 = `/v1/rerank` 与 `/rerank`。
9. ⓘ 文案（D4 甲）：zh/en 两值 = §1.1 a 的新文案；该 key 既有断言 0 命中（改值零断言实证）。
10. `config.example.yaml`（D5 甲）：三行注释 = §1.1 b 的新值；纯注释、零行为。

## 5. 影响面与非目标

- **影响面**：两条通用腿的 URL 拼装；对存量值 = "今天能用的零变化、今天会拼坏的从坏变好"；另加 ⓘ 文案两行（D4 甲）与 `config.example.yaml` 三行注释（D5 甲）；不新增配置键。
- **非目标**：厂商腿（dashscope 两腿 / ark / tei-rerank / tei-sparse / mineru 两腿）与 parse-local（同类、见 D2 第三点，登记残留）；示例文案；必填/探针/校验规则；前端 ⓘ 两行以外的任何改动。
- **旧文引用**：09-25 endpoint-unlock spec 的 §3 落点表把占位示例记为 `https://api.example.com/v1`；本对**不改**冻结的旧 spec，只在这里记引用关系。
- **同类残留（登记，不在本对）**：parse-local 的 `/v1/*` 多段路径（D2 第三点）——出现"照文档填 `/v1`"的落点时直接复用 `join_endpoint`。