# 两条尾巴腿的对齐（G3 + G4 合并） —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-17-rag-rerank-parse-alignment-design.md](../specs/2026-09-17-rag-rerank-parse-alignment-design.md)
**Status:** 已全部交付 2026-09-17（Task 0–3；三条真栈腿全过，配置逐字节还原）
**Parent:** [2026-09-17-rag-save-time-embedding-probe.md](2026-09-17-rag-save-time-embedding-probe.md)（那份 spec §6 把 G3/G4 判为「同因、本期不治」；本计划是它的**增量**）

**Architecture:** 把嵌入腿已经立好的两条规矩横向补到**重排 / 解析**两条腿上，全部是"把既有的判断换个出口/换个类型/换个数据来源"，**不新写判断**：

1. **G4-a（异常类型）**：两处 `raise ValueError` 改抛 `RagConfigurationError` ⇒ 网关那条 400 映射白拿。
2. **G4-b（保存期扩面）**：`PUT` 的静态检查从"只构造嵌入器"扩到"三条腿都构造一遍"（**纯离线，不新增任何网络调用**），并为此给 `build_reranker` / 解析构造各补一个 `rag=` 覆盖（照 `build_embedder` 的先例）。
3. **G3（能力块 + 界面）**：响应新开平行的 `rerank_providers`（纯加键），重排 allowlist 的 `dashscope` 行补两个字段；前端把 `resolveFixedEndpointRow` **参数化**（核心 + 两个薄包装），重排那一行改读能力块，含同款「恢复默认」。

**依赖顺序**：Task 1（G4）→ Task 2（G3，依赖 G4 定下的后端形状）→ Task 3（文档 + 真栈）。

---

## Task 0 — 开工前的五项核实（只读，不改代码）

**状态：已核实 2026-09-17。**

**核实纪要（五项都核了；**第一项与第四项改进了 spec**）**

1. **两处拒绝点的触发路径与既有覆盖**：`reranker_factory.py:30`（`build_reranker` 内，`endpoint is None and provider != "dashscope"`）、`parse_local.py:113`（`MineruLocalParseProvider.__init__` 内，地址为空的**第一个**校验）。
   ⚠️ **本项我第一次核错了，RED 期纠正**：我当时按**整句文案** grep（`本地解析需要服务地址` / `requires rag.rerank_base_url`）报「零既有覆盖」——**错的**。按**关键词**扫就命中：`tests/knowledge/test_parse_local.py:242` 的 `test_parse_document_local_without_base_url_fails_loud` 早就钉着 `pytest.raises(ValueError, match="parse_base_url")`（用的是**子串** `parse_base_url`，所以整句 grep 扫不到）。⇒ 结论改成：**解析那侧有一条既有用例**（它断言的是 `ValueError`，D1 之后仍然绿，因为新类型是子类 ⇒ 所以 RED 是把**它的类型收紧**成 `RagConfigurationError`）；**重排工厂那侧确实没有**（隔壁 `test_reranker_generic.py:141` 的 `test_the_endpoint_is_required` 断言的是**类自身**的 `TypeError`，不是工厂的拒绝）⇒ 新增一条。
   另外 400 的映射本身**有**覆盖（`tests/test_rag_configuration_error.py` 用 `create_app().exception_handlers` 验过），缺的是**"某条真实路由抛出来"**这一层 ⇒ 新增 recall-test 那条。
2. **两个构造点的签名与调用面**：`build_reranker(config=None)` 共 **4 个调用点**（`knowledge_service.py:1101`、`hybrid_search_tool.py:50`、`graph_search_tool.py:404`、`eval/runner.py:378`），**全部零参调用** ⇒ 加带默认的 `rag=` 不影响它们。`_build_parse_provider` 只有**一个**调用点（`parse_document` 自己，`parser.py:776`）；`parse_document` 的 `model_version: str = "vlm"` 等四个参数**都已有默认值**（`parser.py:744-751`）⇒ 新入口照抄默认值即可。**云 provider 的构造是纯赋值**（`MineruCloudParseProvider.__init__` 只在 `parse()` 里读 token，`parser.py:681-692`）⇒ 保存期扩面确实**零网络**。
3. **能力块的两条形状守卫**：登记点**只有一处** —— `tests/test_rag_config_api.py:446` 的 `_ADDED_FIELDS`（GET / PUT 两条守卫都走 `_assert_pure_addition`）⇒ 加 `rerank_providers` 是**改一行**。`provider_ids("rerank")` 实测为 **`('dashscope', 'generic-rerank')`**，且 `resolve_provider("rerank","dashscope")` 今天 `has_fixed_endpoint=False` / `default_endpoint=None`（⇒ D3 补两个字段是真实新增，不是"改个值"）。
4. **前端爆炸半径**：⚠️ **起草时我漏了第二份 dom 文件** —— 按界面词汇扫下来，受影响的是**两份**文件、**六处**断言 + **两个夹具** + **两处注释**（清单已改写进 spec §6 **S3** 的 A/B 两张表）。这正是「按界面词汇 grep、别按数据字段扫」那条规矩要防的（我只按 `settings/` 那份扫过，`components/workspace/settings/` 那份漏了）。**值得单记一条**：第二份文件的 i18n 是 **KEYS 代理**，断言里写的是**键名本身**（`getAllByText("lockedByProvider")`），所以"看起来不像界面词汇"的字符串也可能是界面断言。
5. **`resolveFixedEndpointRow` 的调用面**：1 处定义 + **视图 1 处使用** + `config-form.test.ts` 内 **5 处调用点**；第二份 dom 文件**不引用它**。⇒「抽核心 + 两个薄包装」只要保住 `(values, providers)` 这个签名，既有 5 处调用点与视图那处**一行都不用改**。

**额外两点（不在五项里，但会影响 Task 1 的写法）**

- **构造点约定测试是按类名守的**：`tests/knowledge/test_provider_construction_sites.py` 只禁"直接 `new` 那个实现类"，守卫名单由 allowlist 表驱动 ⇒ 新增公开的 `build_parse_provider` **不会**触发它（保存期那处必须走工厂函数、不得直连类名）。但它的**断言消息**里写着"只能经 `build_embedder()` / `build_reranker()` / `parse_document` 构造"，`parse_document` 那半随着新入口应当顺手改准（一句话，Task 1 GREEN 里带上）。
- **`graph_search_tool.py:404` 与 `knowledge_service.py:1101` 都是 `build_reranker() if rag.graph_rerank else None`** ⇒ 重排腿在 `graph_rerank` 关闭时**根本不构造**；而 `hybrid_search_tool.py:50` 是无条件的。所以"坏重排配置"在检索侧**必然**炸（不问开关），这也是 §1 那个 500 的来源。

- [x] 1. 两处拒绝点的确切位置、文案与**触发路径**（`reranker_factory.py` / `parse_local.py`），以及**有没有既有用例钉住"裸 ValueError"或 500**——按**错误文案 + 界面词汇**两头 grep（别只按字段名扫）。⇒ **零既有覆盖**，见上。
- [x] 2. 两个构造点的签名：`build_reranker(config)` / `parser.py::_build_parse_provider(...)`（它现在连 config 都不收、直接读 `get_app_config().rag`）——补 `rag=` 覆盖要动几处；`parse_document` 怎么给 `model_version`，保存期校验用哪个值（**构造不能出网**，核清 cloud 那家的构造是否纯离线）。⇒ 4 个零参调用点 + 1 个构造调用点；默认值齐备；云构造纯赋值。
- [x] 3. 能力块的两条形状守卫现状（golden 夹具 + 允许集写法）：新键 `rerank_providers` 要登记在哪几行；`provider_ids("rerank")` 的顺序。⇒ 一行（`:446`）；顺序实测 `('dashscope', 'generic-rerank')`。
- [x] 4. 前端重排那一行的现状（写死判据的确切行号）与**会被 G3 动到的既有 dom 断言**：按**界面词汇** grep（`由提供方固定`、`重排接口地址`、`恢复默认`、`重排提供方`），把行号列出来；spec §6 **S3** 已列了四处（`:511` / `:512` / `:600` / 夹具 `view()`），**要独立复核并补充**（别只信那张表）。⇒ **查出第二份文件**（B 表），S3 已改写。
- [x] 5. `resolveFixedEndpointRow` 的签名与它的 **5 处调用点**（`config-form.test.ts` 内 5 处、视图 1 处使用）——参数化（抽核心 + 两个薄包装）会不会改动嵌入那侧的调用形状；若会，先记清是哪几处。⇒ **不会**：保住 `(values, providers)` 签名即可。

**门禁**：无（只读）。

---

## Task 1 — G4：异常类型对齐 + 保存期扩到三条腿（D1–D2，D6）

**状态：RED 已完成 2026-09-17。**

**交付纪要 —— RED（6 红 / 1 条按设计恒绿）**

| 用例                                                             | 落在                                                                                      | RED 的失败原因（逐条核过）                                                                                                                                                             |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test_the_factory_refuses_a_generic_provider_without_an_address` | `test_reranker_generic.py`（新增）                                                        | `TypeError: build_reranker() got an unexpected keyword argument 'rag'` ⇒ `rag=` 覆盖还不存在                                                                                           |
| `test_parse_document_local_without_base_url_fails_loud`          | `test_parse_local.py:242`（**把既有断言从 `ValueError` 收紧成 `RagConfigurationError`**） | 抛的仍是裸 `ValueError` ⇒ 未捕获到该类型                                                                                                                                               |
| `test_an_unknown_backend_is_refused_as_a_configuration_error`    | `test_parse_local.py`（新增，防御性）                                                     | `ValueError: 未知的 parse_backend 'pipeline'…`                                                                                                                                         |
| `test_put_refuses_a_rerank_without_its_address`                  | `test_rag_config_api.py`（新增）                                                          | `assert 200 == 400`（保存期还不看重排）+ 文件被写了                                                                                                                                    |
| `test_put_refuses_a_local_parser_without_its_address`            | `test_rag_config_api.py`（新增）                                                          | 同上                                                                                                                                                                                   |
| `test_a_bad_rerank_config_answers_400_not_500`                   | `test_recall_test_api.py`（新增）                                                         | 路由里抛出的正是那句 `ValueError: rerank_provider='generic-rerank' requires rag.rerank_base_url…` ⇒ **G4 那个 500 在真实路由上被当场复现**（这条 RED 同时是 §1 表格里"500"的一手证据） |

- **`test_a_complete_configuration_saves_without_touching_the_network` 今天就是绿的**（不在红名单里）：它钉的是"保存期零出网"，而**今天保存期只构造嵌入器**、`rerank_model` 的改动不碰那六个嵌入字段 ⇒ 本来就不出网。**这是设计如此**——它的牙由 neuter Ⅱ 给（一旦 GREEN 让保存期多打一次网络，它就红），与上一对「同值不探」那条同一形态。
- **一处自我纠正**（见 Task 0 第 1 项的 ⚠️）：解析那侧的拒绝**本来就有既有用例**（`test_parse_local.py:242`，用的是子串 `parse_base_url`，所以按整句 grep 扫不到）。因此 RED 不是"新增覆盖"，而是**把既有断言的类型收紧**。

- [x] **RED**：
  1. `build_reranker(rag=<generic-rerank 无地址>)` ⇒ **`RagConfigurationError`**，且 `isinstance(exc, ValueError)` 仍为真；
  2. `MineruLocalParseProvider(base_url="")` ⇒ **`RagConfigurationError`**；未知 `backend` 同理（**防御性**：`parse_backend` 是 `Literal["vlm","hybrid"]`，配置到不了那里，用例只钉类型不钉可达性）；
  3. **保存期**：`PUT` 一份"重排选了通用但没地址"的配置 ⇒ **400**、正文点名重排、**文件未被写**（读回逐字节相同）；同一份在 HEAD 上是 200（用固定对照说明这是**收紧**）；
  4. **保存期**：`PUT` 一份"本地解析但没地址" ⇒ **400**；
  5. **反例**：三条腿都完整 ⇒ **200**，且**保存期零网络调用**（不出网的桩：任何出网即红）；
  6. **网关**（真实路由）：`rerank_provider=generic-rerank` 无地址时经 HTTP 得到 **400 + 可读正文**（而不是 500）。
- [x] **GREEN**：
  - `reranker_factory.build_reranker(config=None, *, rag=None)`：`rag` 覆盖 + 改抛 `RagConfigurationError`；
  - `parse_local.MineruLocalParseProvider.__init__` 的两处改抛 `RagConfigurationError`；
  - `parser.py`：把解析 provider 的构造抽成收 `rag=` 的入口（`_build_parse_provider` 加 `rag=None`，内部 `rag or get_app_config().rag`），`parse_document` 照旧调用；
  - `rag_config._reject_unusable_after_save(pending)`：三条腿都构造（**判断逻辑一行不重写**），异常仍映射成 `提交后的配置仍不可用：<原因>`；**必须走工厂函数**（`build_reranker` / 新的 `build_parse_provider`），不得直连实现类名 —— 否则 `test_provider_construction_sites.py` 会红；
  - 顺手把 `test_provider_construction_sites.py` 那条**断言消息**里的 `parse_document` 改准（它现在是"只能经 `build_embedder()` / `build_reranker()` / `parse_document` 构造"，而保存期走的是新入口）；
  - `embedder.py` 里 `RagConfigurationError` 的 docstring：语义从"嵌入腿"改成"任一条腿"。

**交付纪要 —— GREEN（narrow 69 passed / 1 skipped）**

- 落地形状与计划一致：`build_reranker(config=None, *, rag=None)`（内部 `section = config.rag if rag is None else rag`）、`parse_local` 两处改类型、**`_build_parse_provider` 提升为公开的 `build_parse_provider(*, rag=None, client=None, model_version="vlm", poll_interval_seconds=5.0, timeout_seconds=1800.0)`**（`parse_document` 那一处调用随之改名，行为不变）、`_reject_unusable_after_save` 三条腿都构造。
- `parser.py` 需要 `from typing import Any`（新签名用到）——ruff F821 当场逮出，已补。
- ⚠️ **GREEN 的窄跑抓到两处既有测试被这次收紧打红**（Task 0 只按前端词汇扫过，没覆盖后端夹具）：
  - `test_rerank_secret_env_source_follows_the_provider`：原本 `PUT {"rerank_provider": "generic-rerank"}` —— 现在**不合法**（缺地址）⇒ 该写从 200 变 400，后面的 `sources` 断言全塌；
  - `test_local_mineru_has_no_secret_fallback`：同理（`{"parse_provider": "mineru-local"}` 缺 `parse_base_url`）。
    ⇒ 处置：给这两条**补上地址**（它们问的是"密钥的环境回退跟不跟 provider 走"，与地址无关），并在用例里留一行注释说明为什么必须带上地址。**这是 S1 的第一批实际受害者**，已补记进 spec §6 S1。

**交付纪要 —— neuter（三条都有牙，逐条跑过）**

| neuter                                  | 预期        | 实测                                                                                                                                                                                   |
| --------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ① 只改解析那半，重排仍抛裸 `ValueError` | 用例 1 红   | **3 红**：用例 1 本身 + 保存期重排那条（保存期只捕 `RagConfigurationError`，裸 `ValueError` 逃逸）+ recall-test 那条 400                                                               |
| ② 保存期仍只构造嵌入器                  | 用例 3/4 红 | **正是 2 红**（两条 PUT 拒绝）                                                                                                                                                         |
| ③ 把拒绝吞掉（记 warning 然后照常写盘） | 用例 3/4 红 | **3 红**：两条 + **既有的嵌入那条拒绝用例**（`test_put_validates_against_config_yaml_not_the_payload_alone`）⇒ 证明同一处 `raise` 同时服务三条腿；且**零出网那条仍绿**（不是"一律拒"） |

- [x] **neuter 三条（都必须有牙）**：① 只改解析那半、不改重排 ⇒ 用例 1 红；② 保存期仍只构造嵌入器 ⇒ 用例 3/4 红；③ 保存期把异常吞成 warning ⇒ 用例 3/4 红（且 5 仍绿 ⇒ 证明不是"一律拒"）。⇒ **实测 3 / 2 / 3 红**，见上表。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`tests/knowledge/` + `tests/test_rag_config_api.py` + 新文件）绿；**全量后端后台跑**，跑完抽全部 FAILED 的 node id 去 HEAD 跑同一批、双向 diff（`xargs -d '\n'`，别 pipe 长跑）。

**交付纪要 —— 门禁**

- `ruff check` / `ruff format --check`：**10 个文件**干净（实现期 ruff 当场逮出一个 `F821 Undefined name Any`，已补 import）。
- **窄面**：`tests/knowledge/` + `test_rag_config_api.py` + `test_rag_config_save_probe.py` + `test_rag_configuration_error.py` = **1173 passed / 50 skipped / 1 error**（那个 error 仍是本机 Qdrant 连不上的既有环境项）。
- **全量后端**：**145 failed / 12343 passed / 160 skipped / 0 error**（15:07）。passed 比上一轮基线（12336）**+7**（本轮新增 6 条 + 他线在飞的文件带来的 1 条）；failed 数与上一轮相同。
- **与 HEAD 的双向 diff**：把本轮 145 个 FAILED 的 node id 拿去 HEAD（`git worktree add --detach` 到仓外，并按修正过的姿势把 `deerflow` 钉到那棵树）跑同一批 ⇒ **143 failed / 2 passed**，还是那两条、**逐条重验过**（不靠上一轮的结论）：
  1. `tests/test_delta_channel_state.py::test_merge_message_writes_randomized_differential` —— 记录在案的随机差分 flake，**本轮单独跑两次都过**；
  2. `tests/test_review_changed_public_skills.py::test_main_exits_nonzero_when_review_cli_reports_error` —— **环境条件**：那条断言要求 `PYTHONPATH` 含**正斜杠**的 `backend/packages/harness`，而 `str(WindowsPath)` 是反斜杠；**本轮把 `PYTHONPATH` 设成正斜杠式当场就绿**。（HEAD 那一轮显示「绿」正是因为要让 worktree 的 `deerflow` 指向它自己而设的那条正斜杠 `PYTHONPATH` —— 一个已知 confound，见 [[project-env-test-failures]]。）
     ⇒ **没有本改动引入的红**。
- 收尾：worktree 已删（`git worktree list` 只剩主树）、`.deer-flow/` 的临时 id 清单与对照日志已删、`.pytest-tmp` 1KB。

## Task 2 — G3：能力块新键 + 重排行改读它（D3–D4）

**状态：RED 已完成 2026-09-17。**

**交付纪要 —— RED（后端 4 红 / 前端 8 红，逐条核过原因）**

后端（`tests/test_rag_config_api.py`）：

1. `test_get_returns_the_rerank_provider_capabilities` ⇒ `KeyError: 'rerank_providers'`；
2. `test_the_rerank_default_endpoint_is_the_clients_own_constant` ⇒ allowlist 行还是 `None`；
3. **两条既有形状守卫**（GET / PUT）⇒ 我把新键**先**登记进 `_ADDED_FIELDS`，它们于是要求响应里真有这个键 ⇒ **红**（这正是"纯加法"该有的证明方式：先收紧允许集，再看代码是否补上）。

前端：4. `config-form.test.ts` 新增的 4 条纯函数用例 ⇒ `resolveRerankEndpointRow is not a function`（包装函数还不存在）；5. `functional-models.dom.test.tsx`：「labels a provider-fixed endpoint…」与新增的「rerank address row > locks the row and shows **2**」⇒ `expected 1 to be 2`（今天只有嵌入那一行印地址）；「shows a stored rerank override and lets the admin drop it」⇒ **`resetButton()` 是 null**（重排的锁框还没有 `onReset`，点它会 TypeError）；「stays editable when the server sends no rerank capability block」⇒ 今天写死的判据照样把 dashscope 锁住，没有输入框；6. **第二份 dom 文件**（`components/workspace/settings/functional-models-view.dom.test.tsx`，Task 0 才查出来的那份）⇒ 同一条 `expected 1 to be 2`。

- **两条按设计今天就绿**（不在红名单里，它们的牙由 neuter 给）：纯函数里的「leaves a provider without a fixed endpoint editable」（今天写死的判据恰好给出正确答案——**这正是 G3 的性质：答案对、来源错**），以及样式那条「paints a credential chip and a locked row's reason identically」（它被我改钉到解析腿的 `lockedLocalOnly`，今天本来就渲染，改的是"钉哪一处"）。

- [x] **RED**：
  1. `GET /api/rag/config` 的 `rerank_providers` 与 `provider_ids("rerank")` 同序、两个键逐条正确（`dashscope` = `True` + 默认地址、`generic-rerank` = `False` + `None`）；
  2. **防漂移**：`spec("rerank","dashscope").default_endpoint == reranker.DASHSCOPE_RERANK_BASE_URL`；
  3. 两条既有形状守卫按新契约**显式登记**新键后仍绿（改动即"加键"，不是改值）；
  4. 前端纯函数：重排行的判定按 `rerank_providers` 走（能力块说固定 ⇒ 锁、说没有 ⇒ 不锁、**旧响应（无该键）⇒ 不锁**）；
  5. dom：重排选 `dashscope` ⇒ 锁框显示**实际会用的地址**（无存量值时 = 默认地址）；选 `generic-rerank` ⇒ 可编辑 `Input`；有存量值时给「恢复默认」，点它清空；
  6. dom：**嵌入那两行行为不变**（参数化重构的回归保护）；
  7. **既有断言按新契约更新**（spec §6 S3 那四处：`:511` 单数 `getByText` 改 `getAllByText` + 个数、`:512` 的 chip 计数 1→0 改钉"重排行显示地址"、`:600` 的字形比对改钉一种**仍显示原因**的锁如 `F.lockedLocalOnly`、夹具 `view()` 补一份重排能力块）——**先按 Task 0 第 4 项的 grep 结果核对/补充这张表，再动手**。
- [x] **GREEN**：
  - `providers/__init__.py`：rerank 的 `dashscope` 行补 `has_fixed_endpoint=True` + `default_endpoint="https://dashscope.aliyuncs.com"`；
  - `rag_config.py`：新增 `RerankProviderCapability`（`provider_id` / `has_fixed_endpoint` / `default_endpoint`，**无 `emits_sparse`**）与 `rerank_providers` 的填充函数（与 `_embedding_provider_capabilities` 同形，读 `provider_ids("rerank")`）；
  - `types.ts`：能力块类型加一个重排版；
  - `config-form.ts`：`resolveFixedEndpointRow` 拆成**一个核心 + 两个薄包装**（嵌入 / 重排），嵌入那侧**签名与 5 处调用点形状都不变**；
  - `functional-models-view.tsx`：重排那一行改读能力块（含「恢复默认」），删掉写死的 `=== "dashscope"`；
  - `functional-models.dom.test.tsx`：按 S3 更新那三处断言 + 夹具补 `RERANK_PROVIDERS`（与 `EMBEDDING_PROVIDERS` 同形，**不带 `emits_sparse`**）。

**交付纪要 —— GREEN**

- 后端：rerank allowlist 的 `dashscope` 行补两键；`RagConfigResponse` 新开 `rerank_providers`（`RerankProviderCapability`，**条目形状与嵌入那块不同：没有 `emits_sparse`**），填充函数与嵌入那块同形、读 `provider_ids("rerank")`。
- 前端：`config-form.ts` 把判据收成**一个核心 `resolveEndpointRow(provider, storedValue, capabilities)` + 两个薄包装**（`resolveFixedEndpointRow` 签名与 5 处调用点**一字未动**，新增 `resolveRerankEndpointRow`）；`types.ts` 加 `RagRerankProviderCapability`；视图里重排那一行改读 `view?.rerank_providers`，并**同款带上 `onReset`（清空 `rerank_base_url`）**，写死的 `=== "dashscope"` 删掉。
- 两个夹具（两份 dom 文件）各补一份 `RERANK_PROVIDERS`；`view()` 的"旧响应"开关改成**两块一起摘掉**（两块是同一批上线的）。

**交付纪要 —— neuter（三条都有牙）**

| neuter                                       | 预期       | 实测                                                                                                                                                                                                                                                                                            |
| -------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ① 重排行改回写死判据                         | dom 用例红 | **5 红**（两份 dom 文件：三条 rerank 用例 + 两处被更新的既有断言）。⚠️ **第一次我做的是"半 revert"**——只把分支条件换回写死、`value` 仍取能力块的 `shown` ⇒ 只有 **1 红**（因为显示值仍来自能力块，看着像对的一样）。**教训：neuter 要回到"旧行为整体"，不能只还原一半**——半还原的 neuter 没牙。 |
| ② 能力块不填两个新键（allowlist 行退回默认） | 用例 1 红  | **2 红**（能力块用例 + 防漂移用例）                                                                                                                                                                                                                                                             |
| ③ 去掉重排行「恢复默认」的渲染               | 用例 5 红  | **1 红**（只有重排那条；嵌入那条覆盖用例仍绿 ⇒ 这条 neuter 是**重排专属**的）                                                                                                                                                                                                                   |

**交付纪要 —— 门禁**

- `pnpm check`（eslint + tsc）：**零诊断**。
- **prettier 逐文件与 HEAD 同数**：`types.ts` 0/0、`config-form.ts` 58/58、`functional-models-view.tsx` 17/17、`config-form.test.ts` 194/194、`functional-models.dom.test.tsx` 129/129、`functional-models-view.dom.test.tsx` 5/5 ⇒ **零新增格式债**。
  ⚠️ 第一遍我有**四个文件**带新债，逐条都是"我这行超宽"：`getAllByText("https://dashscope.aliyuncs.com").length` 那句要折成三行、纯函数用例的调用点要一参一行。**处置**：用「把 prettier 的输出按 hunk 比对、只重排我自己那几行」的办法对齐（**不跑 `--write`**，否则会翻掉这些文件里的历史债）。
- **全量前端**：**238 文件 / 2557 用例 / 0 失败**（+8 = 本轮新增的 4 条纯函数 + 4 条 dom）。
- **全量后端**：**145 failed / 12396 passed / 109 skipped / 0 error**（18:37）。⚠️ **与本轮开工前那次（145 / 12343 / **160 skipped** / 1 error）相比，跳过数少了 51、通过数多了 53** —— 环境在两轮之间变了（**Qdrant 变得可达**）：那 51 条 `requires_qdrant` 用例这次真的跑了、并且全过，上一轮被判 error 的那条也过了。⇒ 两次的 failed **都是 145**，但"145 条红的构成"不能只按数字比，所以下面照旧做集合 diff。
  - 与 HEAD（`b61e88f1` = Task 1 的代码，Task 2 尚未提交）跑同一批 145 id ⇒ **143 failed / 2 passed**，还是那两条、**本轮再次逐条重验**（flake 单跑 1 passed；`test_review_changed_public_skills…` 设成正斜杠 `PYTHONPATH` 后 1 passed ⇒ 就是那个环境条件）。⇒ **Task 2 没有引入任何红**。
  - 收尾：worktree 已删（`git worktree list` 只剩主树）、临时 id 清单与对照日志已删、`.pytest-tmp` 1KB。

- [x] **neuter 三条**：① 重排行改回写死判据 ⇒ dom 用例红；② 能力块不填两个新键 ⇒ 用例 1 红；③ 去掉「恢复默认」的渲染 ⇒ 用例 5 红。⇒ **实测 5 / 2 / 1 红**，见上表（① 连半 revert 只红 1 条的教训也在表里）。
- [x] **门禁**：`pnpm check`（eslint + tsc，**应为零诊断**）；prettier 逐文件与 HEAD 比数字；**全量前端**；两条 `.md` 的 prettier 同数（Task 3 一起核）。⇒ 零诊断、六个文件同数、前端 238/2557/0；**另按"共享组件"规矩补跑了全量后端**并做了 HEAD 双向 diff。

## Task 3 — 文档同步与真栈验收

**状态：已交付 2026-09-17（三条真栈腿全过，收尾逐字节还原）。**

**交付纪要 —— 文档**

- `backend/AGENTS.md`（RAG 配置节）：把「**Before anything is written** 只 build 嵌入器」改成**三条腿**（`build_embedder` / `build_reranker` / `build_parse_provider`）、写明**每条构造都离线、不增网络开销**、以及两个新入口带 `rag=` 的原因；`RagConfigurationError` 的语义写明扩到"任一条腿"、以及它换来的**一个 400 映射**（重排/解析以前是裸 `ValueError` ⇒ recall-test 500 / 聊天里工具错误）；新键 `rerank_providers`（**形状与嵌入那块不同：没有 `emits_sparse`**）；并补上 **⚠️ 那条收紧的确切两种情形 + 逃生口**（含"非法 provider/backend 到不了这里，它们是 `Literal`"）。
- `frontend/AGENTS.md`（功能模型节）：`resolveEndpointRow` **一个核心 + 两个薄包装**（并写清"两行可以共享一份判断，但**不能共享一份副本**"）；重排行读 `rerank_providers`、别把两个类型合并；`unknown ≠ cannot`；以及那条**可见后果**：锁定行一旦有地址显示，就不印「由提供方固定」（解析腿那两行还印，因为它们的锁是「模式」而非「厂商地址」）。
- 过程记录：前端那份我第一次用了两处 `*强调*`，本仓 prettier 要 `_强调_` ⇒ +4 行债；只改我自己那两行后回到 16/16（**没跑 `--write`**）。

**交付纪要 —— 真栈（`:8001` 网关 + `:3000` 前端）**

- **先核代码**：`/openapi.json` 的 `RagConfigResponse` 属性里有 `rerank_providers` ⇒ 运行中的网关已是新代码，不必重启。
- ⚠️ **真栈上撞到的新操作坑**：内嵌浏览器的 surface 中途消失（`NATIVE_BROWSER_VIEWPORT_UNAVAILABLE … viewport=547x624, visible=false`）⇒ **MCP 的指针动作被拒**。处置：三条腿改用**页面内 JS**（普通 React 按钮的 `.click()` 有效、同源 `fetch` + `X-CSRF-Token` 有效）；只有 **Radix Select（provider 选择器）选不中** ⇒ provider 的各个状态改用「合法 PUT 落盘 + 重载页面」摆出来。**诚实记**：选择器那一次鼠标动作没做成，它的行为由 dom 用例覆盖（本次真栈覆盖的是这些状态**渲染出来的样子**、以及「恢复默认」与「保存」两次点击的真实处理链）。
- **腿①（重排缺地址）**：`rerank_provider='generic-rerank'` 无地址 ⇒ **400**，正文逐字 `提交后的配置仍不可用：rerank_provider='generic-rerank' requires rag.rerank_base_url; only `dashscope` has a built-in endpoint.`；补上地址 ⇒ **200**。**并且用真实「保存」按钮复现了一次**：表单里清空地址 ⇒ 点保存 ⇒ **错误 toast 逐字**（这就是管理员看到的样子），且没有 status 通知。
- **腿②（本地解析缺地址）**：`parse_provider='mineru-local'` 无地址 ⇒ **400**，正文逐字 `提交后的配置仍不可用：本地解析需要服务地址：请设置 rag.parse_base_url（parse_provider=mineru-local）`；补上地址 ⇒ **200**。
- **腿③（界面，四个状态 + 两次点击）**：
  1. `dashscope` 无存量 ⇒ 重排是**锁框**、框里是默认地址；**两个地址框都显示 `https://dashscope.aliyuncs.com`**，且整个页面里「由提供方固定」出现 **0 次**（正是上面那条"可见后果"）。
  2. `generic-rerank` + 存量地址 ⇒ 重排行是**可编辑输入框**、值为存量的 `http://localhost:8000`，且**没有**「恢复默认」。
  3. 切回 `dashscope` + 存量地址（残留值）⇒ 仍**锁着**、框里显示**存量地址**、且「恢复默认」**就在锁框内部**（`resetInsideLockedBox: true`）——这就是 ⑤-4 要的"看得见"。
  4. **点「恢复默认」** ⇒ 按钮消失、框回到默认地址；再点**「保存」** ⇒ **200** + toast「功能模型配置已保存」、**没有任何 status 通知**（这次改动不涉及那六个嵌入字段 ⇒ 不触发保存期探测）。
- **收尾**：`rag_config.json` **逐字节还原**（md5 回到 `15fa768a0d5d5c388c26b14aa2844abe`）；文件里**零个 key/token 字段**；**无新建文件**（`.deer-flow/` 只剩原有的 `blocking-io-t8.json`）；页面重载丢弃表单（复核回到 DashScope + 锁框 + 无「恢复默认」+ 解析回到 MinerU 官方云）；「重建索引」入口**只确认在**（目标知识库选择器在、按钮禁用），**没有实际重建**。
- **⚠️ 一条收尾教训（值得进记忆）**：这次我**只记了 md5 没有先 `cp` 原始字节**，而网关写这个文件在 Windows 上是 **CRLF**（文本模式）⇒ 我按 md5 反推字节形态（`{
  "extract_model": …
}`）才还原成功。**以后真栈动手前先 `cp` 一份原始文件**，别只记哈希。

- [x] `backend/AGENTS.md`（RAG 配置一节）：保存期的检查**覆盖面**从"嵌入"改成"三条腿"（**纯离线、不新增网络调用**）、`RagConfigurationError` 的语义扩大、新键 `rerank_providers`（条目形状与嵌入那条不同：**没有 `emits_sparse`**）、以及 §6 **S1** 那条收紧（**确切只有两种**：`generic-rerank` 缺 `rerank_base_url` / `mineru-local` 缺 `parse_base_url`；一旦 `config.yaml` 是那样，此后每次 PUT 都 400 + 逃生口是改 `config.yaml`）。
- [x] `frontend/AGENTS.md`（功能模型一节）：重排地址行与嵌入同行构（锁/显示实际地址/「恢复默认」/unknown ≠ cannot），并点名 `resolveFixedEndpointRow` 现在是"核心 + 两个薄包装"。
- [x] **真栈腿①**：把重排配成「通用重排」但地址留空 ⇒ 保存**当场 400**（可读原因）；补上地址 ⇒ 200。
- [x] **真栈腿②**：解析配成「本地 MinerU」但地址留空 ⇒ 保存**当场 400**。
- [x] **真栈腿③（界面）**：重排选 `dashscope` ⇒ 锁框显示默认地址；选「通用重排」⇒ 变成可编辑；填一个地址保存成功后回到 `dashscope` ⇒ 出现「恢复默认」（存量值），点它 ⇒ 地址字段被清空。
- [x] **收尾**：配置**逐字节还原**（md5 与动手前相同）、密钥不落盘、不新建文件、浏览器里被改过的表单重载丢弃；「重建索引」入口**只确认在、不实际重建**。
- [x] **门禁**：两份 `AGENTS.md` 的 prettier 与 HEAD 同数（backend **282/282**、frontend **16/16**）；`rag_config.json` md5 未变。

---

## 提交切分

| 提交 | 内容                                                 |
| ---- | ---------------------------------------------------- |
| 0    | **本计划 + 它的 spec 成对**                          |
| 1    | Task 1（G4：异常类型 + 保存期三条腿 + 用例）         |
| 2    | Task 2（G3：`rerank_providers` + 前端参数化 + 用例） |
| 3    | Task 3（文档 + 真栈结论）                            |

不改表、不改 `rag_config.json` schema、**不动任何默认值**、**不新增网络调用**。
