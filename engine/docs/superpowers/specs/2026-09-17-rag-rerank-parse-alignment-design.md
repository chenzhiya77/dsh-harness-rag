# 两条尾巴腿的对齐（G3 + G4 合并） —— 设计

**Parent:** [2026-09-17-rag-save-time-embedding-probe-design.md](2026-09-17-rag-save-time-embedding-probe-design.md)（那份 spec §6 把 G3/G4 判为「本期不治、写在案上」——本 spec 就是那一条）
**Status:** 已交付 2026-09-17（Task 0–3；三条真栈腿全过，配置逐字节还原）

## 1. 问题

嵌入腿已经立好两条规矩，**另外两条腿（重排 / 解析）一条都没有**：

**G4 —— 同一个「配置不对」，两条腿的表现不同。** 嵌入腿的配置类拒绝有自己的类型 `RagConfigurationError`，网关**专门**把这一个类型映射成可读的 400（`app/gateway/app.py:641`），文案是 `提交后的配置仍不可用：<原因>`；而重排 / 解析抛的是**普通 `ValueError`**，那条映射不认：

| 拒绝点                   | 今天的文案                                                                                                 | 今天的结果                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reranker_factory.py:30` | `rerank_provider='generic-rerank' requires rag.rerank_base_url; only 'dashscope' has a built-in endpoint.` | 网关里直调检索那几条路（`knowledge_service.py:1101` 的 recall-test、`eval/runner.py:377`）⇒ **未映射异常 = 500**，原因只落在日志；聊天里 ⇒ 被包成**工具错误**。**这条是代码可推的，不是猜的**：`_hybrid_search_impl` 里 `reranker = reranker or build_reranker()` **无条件**构造（`hybrid_search_tool.py:50`），而 recall-test 调它时**不传** reranker（`knowledge_service.py:1091`） |
| `parse_local.py:113`     | `本地解析需要服务地址：请设置 rag.parse_base_url（parse_provider=mineru-local）`                           | 入库时文档失败，原因不指向"你有个字段没填"                                                                                                                                                                                                                                                                                                                                            |

（`parse_local.py:115` 那条「未知 `parse_backend`」是**防御性**的：`RagConfig.parse_backend` 是 `Literal["vlm","hybrid"] \| None`（`app_config.py:219`），配置**到不了**那里；本期只把它一并升级成 `RagConfigurationError`，不指望靠它拦住谁。）

而且**保存期完全不拦这两条腿**：`PUT` 的静态检查只 `build_embedder`，所以「重排选了通用但没填地址」「本地解析但没填地址」都能**存下去**，等到检索/入库才炸 —— 与 G1（宽度）当初的形态一模一样。

**G3 —— 同一条规则，只在一半的腿上生效。** 上一对给嵌入那一行立了「厂商固定地址 ⇒ 地址栏锁住、显示实际会用的地址、有存量值时给「恢复默认」」，判据是**从 allowlist 读能力**（`has_fixed_endpoint` / `default_endpoint`）。重排那一行的判据仍是**写死的名字**（`functional-models-view.tsx:683` 的 `values.rerank_provider === "dashscope"`），而且后端**只报嵌入腿的能力块**（响应里只有 `embedding_providers`），重排腿没有这项元数据可读 ⇒ 加第二家厂商固定地址的重排 provider 时，那行**不会锁**（界面在问一个没有意义的字段，填进去的东西是否生效取决于那家实现，最坏是静默忽略）。

两条**同因**：_嵌入腿立好的规矩没有横向补齐_。所以合并成一条增量，但 **G4 在前、G3 在后**（G3 要依赖 G4 那半确定下来的后端形状）。

## 2. 决定

### D1 —— G4-a：把这两处拒绝升级成 `RagConfigurationError`

两处 `raise ValueError` 改抛 `RagConfigurationError`（`knowledge/embedder.py` 里那个类）。**类型名与层级都不变，语义扩大**：它的定义从"嵌入腿的配置不可用"变成"**任一条腿**的配置不可用"，文档同步改。

- **为什么用现成的类型**：网关那条 400 映射白拿，不需要第二处注册；另建一个 `RerankConfigurationError` 会让网关要认两个类型，而它们要做的事完全一样。
- **向后兼容**：`RagConfigurationError` 是 `ValueError` 的子类，所以任何 `except ValueError` 仍旧接得住。Task 0 会按错误文案与界面词汇再核一遍有没有靠异常类型分支的调用点。
- **不做**：不为这两条腿新加入网探针。它们的拒绝**本来就是纯配置判定**（地址在不在、backend 认不认），没有"能不能问到答案"这一层，因此不需要上一对那套三态。

### D2 —— G4-b：保存期的静态检查扩成构造**三条腿**

`_reject_unusable_after_save` 从「只 `build_embedder`」扩成「嵌入 + 重排 + 解析都构造一遍」，仍**全部离线**（重排的拒绝在 `build_reranker` 里、解析的拒绝在 `MineruLocalParseProvider.__init__` 里，两者都不出网）⇒ **不新增任何网络调用**。

- **为可复用补一个出口，而不是在保存期另写一套判断**：`build_reranker(config)` 现在只读 `config.rag`；`parser.py::_build_parse_provider(...)` 更是**直接读 `get_app_config().rag`**（连 config 都不收）。保存期要校验的是**将要写入的那份配置** ⇒ 照 `build_embedder` 的先例，给这两处各补一个 `rag=` 覆盖（`build_reranker(config=None, *, rag=None)`；解析那条把构造抽成一个收 `rag=` 的入口）。**判断逻辑一行都不重写。**
  - **解析那个入口的签名（冻结）**：`build_parse_provider(*, rag=None, client=None, model_version="vlm", poll_interval_seconds=5.0, timeout_seconds=1800.0)` —— 除 `rag` 外**全部保留现有默认值**，保存期只传 `rag`。`model_version` 只被**云** provider 使用，而 `MineruCloudParseProvider.__init__` 是**纯赋值**（token 到 `parse()` 才读，实测 `parser.py:681-692`）⇒ 构造期不发任何请求。
  - **考虑过 `AppConfig` 的 `model_copy`**（它是 pydantic：`app_config.py:295`）⇒ 重排那侧本可以 `config.model_copy(update={"rag": pending})`、完全不动签名。**否决理由**：解析那侧**必须**有 `rag=`（它直接读全局配置，`model_copy` 帮不上），两条腿取对称比省一个参数重要。
- **与 D1 的关系**：D1 治"炸了看不见原因"，D2 治"存下去才知道"。D1 单独就能让 recall-test / 工具那条表现变好；D2 把同一件事提前到保存期。两条都做才与嵌入腿对称。
- ⚠️ **这是收紧**（2026-09-17 用户裁定 (a) 同意）：过去能存下的「重排选了通用但没填地址」从此**当场 400**。已知副作用见 §6 S1。

### D3 —— G3-a：能力块新开一个平行的 `rerank_providers`

`GET/PUT /api/rag/config` 的响应在 `embedding_providers` 旁边**新开 `rerank_providers`**（纯加键），条目形状 = 嵌入那条**去掉 `emits_sparse`**（重排没有"哪一半"这回事）：

```
rerank_providers: [{provider_id, has_fixed_endpoint, default_endpoint}, …]
```

- **为什么不泛化成 `providers: {embedding: [...], rerank: [...]}`**：那会**改掉既有键**（`embedding_providers` 消失），既有两条形状守卫与前端都得跟着改；新开一个平行键是纯加法，代价只有"多一个键要登记"。
- **重排 allowlist 的 `dashscope` 行**补 `has_fixed_endpoint=True` + `default_endpoint`（字面量 `https://dashscope.aliyuncs.com`，与 `reranker.py:31` 的 `DASHSCOPE_RERANK_BASE_URL` **配一条防漂移用例**，与嵌入那两条同规矩）；`generic-rerank` 保持默认 `False` / `None`。
- **解析腿不加能力块**：它那两行的锁是「**模式**不同 ⇒ 这个字段没意义」（`lockedCloudOnly` / `lockedLocalOnly`），与「厂商固定地址」是两回事，别混。

### D4 —— G3-b：前端把那一行的判据参数化，重排改读能力块

- `resolveFixedEndpointRow` 现在写死读 `values.embedding_provider` / `embedding_base_url` / 嵌入能力块。把它拆成**一个核心 + 两个薄包装**（嵌入 / 重排各一个），重排那一行改读 `rerank_providers`。
  ⇒ **这一改是在消除重复，而不是再复制一份判据**（复制一份正是 G3 的成因）。
- **同款「恢复默认」也要有**：重排腿的运行期同样让存量的 `rerank_base_url` **优先**（`build_reranker` 只在有值时才把它传给实现），所以「锁着 + 显示实际会用的地址 + 有存量值时给一个清空动作」这套在重排行**逐条同构**，不另立规矩。
- **unknown ≠ cannot**（与嵌入同）：响应里没有 `rerank_providers`（旧网关）⇒ **不锁**，保持可编辑。
- ⚠️ **锁定行一旦有地址可显示，就不再显示「由提供方固定」**：`LockedBox` 是**单个节点**、内容是 `value?.trim() ? value : reason`（`functional-models-view.tsx:237-239`），所以重排行有了 `default_endpoint` 之后那句原因会从这一行消失。**这与嵌入那行今天的表现完全一致**（上一对就是这样：有地址就不显示原因），**不是本期引入**；但它会让三条既有 dom 断言失效、并让夹具必须补一份重排能力块 —— 见 §6 S3，Task 2 一并处理。

### D5 —— 不做

- **不**动稀疏服务提供商那两个写死的选项：它与嵌入的 `EMBEDDING_PROVIDER_OPTIONS` 同类（前端常量，本线一贯如此），不是"判据写死"。
- **不**动解析腿那两个锁（模式依赖，见 D3）。
- **不**动 rerank / parse 的运行期行为：改的只是"拒绝用什么类型抛"与"界面读什么"。
- **不**给这两条腿加入网探针（D1 已说明：它们的拒绝是纯配置判定）。
- **不**顺手改 `vlm_model` 那条既知缺口（保存期不校验它）——与本期无关。

### D6 —— 判据与文案

400 的正文仍是 `提交后的配置仍不可用：<原因>`，原因**直接用两个拒绝点自己的文案**。那两句是英/中混排的现状，**本期不重写文案**（重写会让「同一事实不要两处措辞」这条规矩反而多出一处）；只保证它们**能被看见**、且**发生在保存期**。

## 3. 接口契约

| 端点 / 契约                                   | 变化                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `GET/PUT /api/rag/config` 响应                | **新增 `rerank_providers`**（纯加键）；其余字段一字不变                                                                               |
| `PUT /api/rag/config`                         | 静态检查从「嵌入」扩到「嵌入 + 重排 + 解析」⇒ 这两条腿的配置类拒绝**也在保存期 400**（正文点名原因，**文件不写**）                    |
| `RagConfigurationError`                       | 语义从"嵌入腿"扩成"任一条腿"（类型与继承层级不变）                                                                                    |
| `build_reranker(config=None, *, rag=None)`    | 新增 `rag=` 覆盖（照 `build_embedder`）                                                                                               |
| 解析腿构造                                    | 抽出一个收 `rag=` 的入口（现在 `_build_parse_provider` 直接读 `get_app_config()`）；**除 `rag` 外签名与默认值都不变**（见 D2 的冻结） |
| `PROVIDER_ALLOWLIST["rerank"]["dashscope"]`   | 补 `has_fixed_endpoint=True` / `default_endpoint="https://dashscope.aliyuncs.com"`                                                    |
| 表 / `rag_config.json` schema / 迁移 / 默认值 | **无**                                                                                                                                |

## 4. 验收

**后端**

1. `build_reranker(rag=<provider=generic-rerank 且无地址>)` 抛 **`RagConfigurationError`**（不再是裸 `ValueError`）；且 `isinstance(exc, ValueError)` 仍为真（子类，向后兼容）。
2. `MineruLocalParseProvider(base_url="")` 抛 `RagConfigurationError`；未知 `backend` 同理（后者是**防御性**的，配置到不了，见 §1 的括注）。
3. **网关**：这两种拒绝经 HTTP 变成 **400 + 可读正文**（原来是 500 / 工具原文不可见）——桩一个调用打到网关里直调检索的那条路（recall-test 一族）。
4. **保存期**：`PUT` 一份「重排选了通用但没地址」的配置 ⇒ **400**（过去是 200），正文点名重排，**文件未被写**（读回与写前逐字节相同）。
5. **保存期**：`PUT` 一份「本地解析但没地址」⇒ **400**（同上）。
6. **反例**：三条腿都完整 ⇒ **200**，且**保存期一次网络调用都没发生**（用不出网的桩：任何出网都让用例红）——证明扩面是纯构造。
7. **能力块**：`rerank_providers` 的 `provider_id` 列表与 `provider_ids("rerank")` 同序；`dashscope` 的两个新键为 `True` + `DASHSCOPE_RERANK_BASE_URL`（**防漂移**：一处用例把 allowlist 的字面量与实现类的常量钉成相等），`generic-rerank` 为 `False` + `None`（默认关没被带偏）。
8. 两条既有「纯加法」形状守卫按老规矩**显式登记**新键后仍绿。

**前端**

9. 选 `dashscope` ⇒ 重排地址行是**锁框**，框里显示**实际会用的地址**（无存量值时 = `default_endpoint`）；选 `generic-rerank` ⇒ 仍是可编辑 `Input`（与今天一字不变）。
10. **「恢复默认」**：重排有存量 `rerank_base_url` ⇒ 锁框旁出现该动作，点它 ⇒ 该字段清空、框里改显示默认地址；无存量值时**不出现**。
11. **旧响应**（无 `rerank_providers`）⇒ 重排行**不锁**（unknown ≠ cannot）。
12. 既有的嵌入那两行行为不变（参数化重构不得改动它的判据）。
13. **既有 dom 断言按新契约更新后仍绿**，且**更新处逐条点名**（§6 S3 那三处 + 夹具补一份重排能力块）；`config-form.test.ts` 里 `resolveFixedEndpointRow` 的 **5 处调用点（含视图 1 处）**形状不变。

**真栈**

14. 把重排配成「通用重排」但地址留空 ⇒ 保存当场 **400**（可读原因）；把地址补上 ⇒ 200。
15. 解析配成「本地 MinerU」但地址留空 ⇒ 保存当场 **400**。
16. 收尾：配置**逐字节还原**（md5 与动手前相同）、不新建文件、密钥不落盘。

## 5. 影响面

- `backend/packages/harness/deerflow/knowledge/reranker_factory.py`（异常类型 + `rag=` 覆盖）
- `backend/packages/harness/deerflow/knowledge/parse_local.py`（异常类型）与 `parser.py`（构造入口收 `rag=`）
- `backend/packages/harness/deerflow/knowledge/providers/__init__.py`（rerank 的 `dashscope` 行补两键）
- `backend/app/gateway/routers/rag_config.py`（能力块新增 `rerank_providers`；静态检查扩到三条腿）
- `frontend/src/core/rag/types.ts`（能力块类型）、`config-form.ts`（`resolveFixedEndpointRow` 抽核心 + 两个薄包装）、`functional-models-view.tsx`（重排那一行改读能力块 + 「恢复默认」）
- **既有测试要跟着动**：`tests/unit/settings/functional-models.dom.test.tsx`（三处断言 + 夹具补重排能力块，见 §6 S3）、`tests/unit/rag/config-form.test.ts`（调用形状不变，只增用例）
- 文档：`backend/AGENTS.md`（RAG 配置节：保存期检查覆盖面、`RagConfigurationError` 的语义、新键）、`frontend/AGENTS.md`（功能模型节：重排行同构）
- **无迁移、无 schema 变更、不动任何默认值、不新增网络调用**

## 6. 已知缺口 / 已知副作用

**S1 —— `config.yaml` 里那两种缺地址的配置会全面堵死 PUT（本期引入的收紧，D2 的必然结果）**

静态检查跑的是「`config.yaml` 的 `rag:` 块 + 本次载荷」，所以只要**这两条**之一成立，此后**每一次 `PUT` 都会 400** —— 哪怕这次只改解析或视频：

1. `rerank_provider = "generic-rerank"` 且 `rerank_base_url` 为空；
2. `parse_provider = "mineru-local"` 且 `parse_base_url` 为空。

（**只有这两种**：`rerank_provider` / `parse_provider` / `parse_backend` 在 `RagConfig` 里都是 `Literal`（`app_config.py:215/217/219`），非法的 provider id 或 backend 取值**根本载不进来**，所以"配置里写了乱七八糟的 provider"不会走到这里。）

逃生口是改 `config.yaml`（operator 文件、热加载、不需重启），且 400 正文点名是哪条腿。

**第一批实际受害者（GREEN 窄跑抓到）**：两处既有测试的 PUT 是**部分**载荷 —— `test_rerank_secret_env_source_follows_the_provider`（`{"rerank_provider": "generic-rerank"}`）与 `test_local_mineru_has_no_secret_fallback`（`{"parse_provider": "mineru-local"}`）—— 它们在这次收紧后从 200 变 400。处置是**给它们补上地址**（它们问的是密钥的环境回退，与地址无关）。⇒ **规律**：任何 PUT 一份「缺地址的重排/解析」的既有测试或夹具都会红，Task 2/3 若再遇到同类夹具，照此处理而不是放宽检查。**这与嵌入腿今天的处境相同**（嵌入腿早就是这样），本期是把同一处境横向补齐；若日后要改成"只查本次改动的那条腿"，切换点在 `_reject_unusable_after_save` 的入参，不需要改别的。

**S2 —— `rerank_providers` 与 `embedding_providers` 的条目形状不同**

前者没有 `emits_sparse`（重排没有稀疏这一半）。两个键的条目形状不一致是**如实**的，不是疏漏；但前端读它时不能复用同一个 TS 接口，要各写一个（Task 2 的 RED 会钉住"重排行不看 `emits_sparse`"）。

**S3 —— 前端有两份 dom 文件、六处断言会因 G3 失效（本期必须一并更新，否则 GREEN 后会突然冒红）**

> **Task 0 已核实并修正本表**：起草时我只按 `tests/unit/settings/…` 这一份文件扫，漏掉了**第二份** dom 文件（`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`）。这一处正是「按界面词汇 grep、别按数据字段扫」那条规矩要防的。下面两张表是核实后的完整清单。

`LockedBox` 只有一个文本节点、内容是 `value?.trim() ? value : reason`，而它今天**唯一**在显示原因的就是重排行（嵌入行已经有了 `default_endpoint`）。G3 把重排行也补上地址之后：

**A. `tests/unit/settings/functional-models.dom.test.tsx`**

| 位置                                                             | 今天                         | G3 之后                                                                                                                |
| ---------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `:511` `getByText("https://dashscope.aliyuncs.com")`（**单数**） | 1 个匹配                     | **2 个**（两行同址）⇒ `getByText` 抛 "found multiple elements"，改 `getAllByText` + 断言个数                           |
| `:512` `getAllByText(F.lockedByProvider).length === 1`           | 1（重排行那句原因）          | **0** ⇒ 改钉"重排行显示的是地址、不是原因"                                                                             |
| `:600` `getAllByText(F.lockedByProvider)[0]!` 用于比对字形       | 命中重排行那句原因           | `undefined` ⇒ 改钉一种**仍显示原因**的锁（解析腿默认就有 `F.lockedLocalOnly`）                                         |
| 夹具 `view()`                                                    | 只提供 `embedding_providers` | 必须补一份重排能力块，否则重排行按"unknown ⇒ 不锁"变成输入框，`:514` 的 `queryByLabelText(F.rerankBaseUrl)` 会命中输入 |

**B. `tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`**（这份文件的 i18n 是一个 **KEYS 代理**，所以断言里写的是**键名本身**，如 `"lockedByProvider"`）

| 位置                                                                                        | 今天                          | G3 之后                                           |
| ------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| 夹具 `renderWith()`（`:107-113`）                                                           | 只提供 `embedding_providers`  | 同样要补重排能力块（否则 `:139` 红）              |
| `:139` `labelCount("rerankBaseUrl")).toBe(0)`                                               | 0（锁框，无输入）             | 无能力块时会变**输入框** ⇒ 红；补了能力块则仍为 0 |
| `:140` `getByText("https://dashscope.aliyuncs.com")`（**单数**）                            | 1 个匹配                      | **2 个** ⇒ 同 A 的第一条，改 `getAllByText`       |
| `:141` `getAllByText("lockedByProvider").length === 1`                                      | 1（重排行那句原因）           | **0** ⇒ 同 A 的第二条                             |
| 注释（`:135-137`）"only the rerank row — untouched this round — still carries the sentence" | 描述现状                      | **随改动一起更新**（它正是本期要推翻的那句话）    |
| `:148-160`「generic-rerank ⇒ 可编辑」那条                                                   | 两侧都无固定地址 ⇒ 无原因文本 | **不受影响**（补能力块后仍成立）                  |

**不受影响、但要一并看过的一条**：`tests/unit/settings/…:653` 用 `queryByRole("button", { name: F.resetToDefault })`（**单数**）钉嵌入那行的「恢复默认」；重排行在该用例里没有存量值 ⇒ 不会多出第二个按钮。若日后给重排行也造存量值，这条要改成 `getAllByRole`。

Task 0 已按界面词汇（`由提供方固定` / `重排接口地址` / `恢复默认` / `重排提供方`）扫过全部前端测试，**以上即完整清单**；Task 2 动手前仍要求复核一次（界面词汇可能随文案改动而变）。

**G5（新登记，本期不治）—— 另外两条腿仍没有"模型级能力"这一层**

嵌入腿有模型级能力探针（`probe-embedding`）与模型级真相（v1/v2 只出稠密）。重排 / 解析的 provider 级声明与模型级真相之间**没有**同类问题（它们的拒绝都是配置在不在），所以本期不引入探针——但若哪天某家重排 provider 出现"同一 provider 下某个模型不可用"，那会是 G2 的横向版本，届时另起一条。
