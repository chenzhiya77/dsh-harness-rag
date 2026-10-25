# RAG 稀疏来源编辑期拦截 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-16-rag-sparse-compatibility-guard-design.md](../specs/2026-09-16-rag-sparse-compatibility-guard-design.md)
**Status:** 已交付 2026-09-16（Task 0–5 全部完成，含真栈两条腿；提交见文末）

**Architecture:** 让**后端允许名单成为唯一事实源**，并把它沿已有通道推到两个边界上——读到界面（`GET /api/rag/config` 加一个只读能力块，前端据此在编辑期拦下并禁用保存），写到磁盘（`PUT` 落盘前用 `build_embedder()` 试构建一次，失败即 400 并回传同一句原因）。运行期的配置类拒绝改抛 `RagConfigurationError(ValueError)`，网关只为一个类型注册 400 映射，给手工改过 `rag_config.json` 的部署留一条可读出口；worker 与工具的失败语义一律不动。

**依赖顺序**：Task 1 → Task 2 → Task 3 是后端一条链（能力块先落地，PUT 与异常类型复用同一段判定）；Task 4 依赖 Task 1 的字段；Task 5 收尾。

---

## Task 0 — 开工前的三项核实（只读，不改代码）

**状态：已核实（2026-09-16），三项都被后续任务按结论落地。**

- [x] 1. `RagConfigResponse` 加字段是否会打破 `TestGatewayConformance` 或前端 `RagConfigView` 的必填项（预期：纯加法，不会；如会，先改契约再动手）。→ 纯加法成立：字段 `default_factory=list`，Task 1 的 golden 形状守卫（键集 + 深层相等）就是这条结论的证明。
- [x] 2. 异常处理器该注册在哪：`app/gateway/app.py` 的 `create_app()` 里（`include_router` 附近），确认那里能在注册路由前后加 `app.add_exception_handler` 且对全部 router 生效。→ 成立，Task 3 落在此处；`test_rag_configuration_error.py` 断言真实 `create_app().exception_handlers` 里**有** `RagConfigurationError`、**没有** `ValueError`。
- [x] 3. `deerflow.knowledge.providers.provider_ids("embedding")` 是否已导出（D1 需要按它枚举，**不要**在前端或路由里再写一份 id 列表）。→ 已导出，Task 1 的 `_build_response` 直接按它枚举；能力列表用例钉住顺序与取值。

---

## Task 1 — 后端：能力块随配置下发（D1）

**状态：已交付 2026-09-16。**

**交付纪要**

- 夹具 `backend/tests/fixtures/rag_config/response_golden.json` 由**改动前的端点真跑**捕获（临时脚本用完即删）：GET（空 `rag_config.json` 叠在 `YAML_RAG` 上）与一次成功 PUT（那份覆盖全部新字段的 payload）。捕获时验了可复现——GET 连跑两遍相等、换新文件重跑 PUT 相等——并查验夹具无绝对路径泄漏、密钥字段皆为哨兵。
- 三条用例落在 `tests/test_rag_config_api.py` 末尾：能力列表（顺序取自 `provider_ids("embedding")`，值钉死 `dashscope=True / openai-compatible=False`）、GET 形状守卫、PUT 形状守卫。plan 里的 bullet 2/3 合并成 `_assert_pure_addition` 的两条有序断言：先键集（形状变了就点名那个键），再深层相等（值动了就 diff 出字段）。
- 实现：`app/gateway/routers/rag_config.py` 新增 `RagEmbeddingProviderCapability` 与 `RagConfigResponse.embedding_providers`（`default_factory=list`，纯加法），`_build_response` 按 `provider_ids("embedding")` 顺序用 `resolve_provider(...).emits_sparse` 填。字段说明写明「只报嵌入 leg」的理由。
- **有牙证明**：(a) 把 `emits_sparse` 写死 `True`（忽略允许名单）→ 能力用例红（`{'openai-compatible': True}` vs `False`）；(b) 键集不变、只把 `sources["qdrant_url"]` 改成 `ui` → GET 与 PUT 两条形状守卫同时红，diff 指出值变了。
- **门禁**：`tests/test_rag_config_api.py` 24 passed；周边子集（`tests/knowledge/` + 三个 rag_config 文件）绿；`ruff check` / `ruff format --check` 干净；全量后端 `pytest -m "not live" tests/` = **145 failed / 12328 passed**，其中 144 个可复现的失败**在 HEAD 上跑同一批 id 得到逐条相同的集合**（差集为空），即全部预存；余下 1 个是偶发（重跑即过）。本机跑全量需 `--basetemp=<可写目录>`，否则 `tmp_path` 用例成批 ERROR。

- [x] **RED**
  - **第 0 步：先捕获 golden（必须在改任何代码之前做）。**
    - 跑既有的 `GET /api/rag/config` 与一次成功 `PUT`，把两个响应体原样存成夹具 `backend/tests/fixtures/rag_config/response_golden.json`（**端点真跑出来的字节，不手写**）。
    - 同一次运行里连跑两遍、断言相等，确认它可复现——否则夹具本身不可信。
    - 夹具里密钥字段是**掩码哨兵**、不含真实值；`sources` 依赖环境变量，所以夹具要连同"生成它的环境前提"一起记下来，测试用同一套 env 夹具复现。
  - 再写三条用例：
    1. `embedding_providers` 等于允许名单的嵌入 leg（dashscope=True / openai-compatible=False），顺序与 `provider_ids("embedding")` 一致；
    2. **形状守卫**：`GET` 与 `PUT` 成功路径的响应体，键集恰好 = `golden 的键 ∪ {"embedding_providers"}`，且**除该键外与 golden 逐字节相等**（deep-equal，不归一化、不排序、不裁字段）。**不能整体比对**——加字段与"逐字节相同"互斥，这条要写成"只多这一个键、其余一字不改"。
    3. 抠掉 `embedding_providers` 后与 golden **深层相等**：把"纯加法"这件事单独钉一次，失败信息能直接指出是哪个字段被动了。

- [x] **GREEN**
  - `rag_config.py`：加 `RagEmbeddingProviderCapability(BaseModel)` 与 `RagConfigResponse.embedding_providers: list[...] = Field(default_factory=list, ...)`；`_build_response` 填它（数据来自 `resolve_provider("embedding", pid).emits_sparse`）。
  - 说明写进字段 description：**只报嵌入 leg**——只有它的允许名单行带「能力标志」这种需要界面预判的字段；rerank / parse 的地址约束是取值依赖，不在这一层（spec §3 D1）。
  - **改完立刻重跑形状守卫**：它由绿转绿的这一跑，就是"纯加法"的证据（而不是靠人看 diff 下结论）。

- [x] **门禁**：`cd backend && make test`（窄面：先跑 `tests/test_rag_config_api.py -v`，再全量）。

---

## Task 2 — 后端：PUT 用同一段代码判定（D3）

**状态：已交付 2026-09-16。**

**交付纪要**

- **判定基准（spec 没写"用哪份配置"，而它决定结论）**：必须是 `config.yaml ⊕ 待写入的 payload`。拿 `config.rag` 当基准不行——它已经含着**待替换的那个文件**，"管理员刚清掉的字段"会被按旧值判；只拿 payload 也不行——yaml 里声明、payload 未携带的字段（前端只带"文件已拥有 + 本次改动"）会退化成 section 默认值。为此给 `AppConfig` 加了私有属性 `_yaml_rag` 与公开属性 `yaml_rag`（照 `_ui_model_names` 的先例，在合并 API 文件**之前**留一份），并给 `build_embedder` 加了 `rag=` 覆盖参数（现有调用点零改动）。
- 校验落在 `_reject_unusable_after_save()`，**排在任何写入之前**；失败即 400，`detail` 前缀 `提交后的配置仍不可用：`。
- 用例 5 条：400 + detail 三要素、被拒的写**落盘为零**、同一写换成 `bm25` 则 200（反例）、**基准必须含 yaml**（payload 省略 provider 时不能靠默认值过关）、**不能把旧文件的值当基准**（`512` 能加载、只有 build 拒，拿旧文件当基准会把"修好的写"也拒掉）。另加 `test_app_config_reload.py::test_app_config_exposes_the_yaml_rag_block_before_the_file_merges` 钉住新属性。
- **有牙证明（两个方向各一次，因为它们互相不能替代）**：基准换成 `config.rag` → 只有"别过度拒绝"那条红；基准换成只校验 payload → 只有"必须含 yaml"那条红；不校验（RED 态）→ 两条 400 用例红。
- **被测试逼出来的两处修正**：① 后端那句原本写 `'bm25'（本地）`，验收要求含「本地 BM25」⇒ 改成直接引用界面选项名：`请改为「独立稀疏服务」（external）或「本地 BM25」（bm25）`；② 既有用例 `test_embedding_secret_env_source_follows_the_selected_provider` 做的是"不带地址切到 openai-compatible"，现在必须是一次**可用**的切换（地址 + 稀疏来源一起改，因为 `embedding_sparse_source` 缺省是 `provider`）。
- **门禁**：`tests/test_rag_config_api.py` 29 passed；周边子集（knowledge/ + app_config + config_version + support_bundle）跑到 ~85% 零 F；`ruff check` / `ruff format --check` 干净；**全量 144 failed / 12335 passed，与 Task 1 那轮逐条比对「新增失败 = 0」**（只少了一个随机差分用例的偶发红）。

- [x] **RED**
  - 三条用例：
    1. `{embedding_provider: "openai-compatible", embedding_sparse_source: "provider"}` → **400**，`detail` 以 `提交后的配置仍不可用：` 开头、含 provider id 与「独立稀疏服务 / 本地 BM25」两条出路；
    2. 同请求落盘为零——断言读回的配置与写前一致（**不能出现半写**）；
    3. 同一请求把来源换成 `bm25` → 200 且落盘（反例：证明不是一刀切）。

- [x] **GREEN**
  - `embedder_factory.build_embedder` 增加覆盖参数（spec §3 D3 接口）：`rag = rag if rag is not None else config.rag`；现有调用点**一个都不用改**。
  - `put_rag_config` 在 `atomic_write_rag_config` **之前**校验：

  ```python
  pending = merge_rag_config(config.yaml_rag, RagConfigFile.model_validate(payload))
  try:
      build_embedder(config, rag=RagConfig.model_validate(pending))
  except RagConfigurationError as exc:
      raise HTTPException(400, detail=f"提交后的配置仍不可用：{exc}") from exc
  ```

> **Task 2 落地时按实际改了这里**：基准从 `config.rag.model_dump(...)` 换成 `config.yaml_rag`（前者含待替换的文件、后者是 yaml 原样），并先写 `except ValueError`（该类型由 Task 3 引入）。理由见 Task 1/2 的交付纪要。

- 校验的是**将要写入的**合并结果，不是当前 `config.rag`。
- 写入必须排在校验之后——失败路径上一次 `atomic_write` 都不能发生。
- `detail` 带前缀：错误可能指向用户本次没动过的字段（spec §3 D3 已知副作用），前缀负责把这件事说清。
- **成功路径必须仍过 Task 1 的形状守卫**：这次改动重排了 PUT 内部的顺序（先校验后写），所以那条断言要在本任务里再跑一次——它保证"只加了一条失败分支，成功路径一字未变"。

- [x] **门禁**：同上；并确认既有 PUT 用例（哨兵保留密钥、清空即回落环境变量）仍全绿。

---

## Task 3 — 后端：配置类拒绝有可读出口（D4）

**状态：已交付 2026-09-16。**

**交付纪要**

- **类型放在 `knowledge/embedder.py`，紧挨 `EmbedderError`**（spec 原话"与 `EmbedderError` 等并列"）：这样只依赖 `EmbedderError` 的模块不用反过来去 import 工厂。docstring 写明为什么继承 `ValueError` 而不是 `EmbedderError`——后者会被 `index_chunks` 当**软失败**吞掉，配置错误就变成"部分切片失败"。
- **改了 6 处 raise**：工厂里 5 处（稀疏不匹配 / 缺 `embedding_base_url` / 声明维度≠1024 / `external` 缺 `sparse_provider` / **维度探测那次拒绝**），加上 `sparse.py` 的 `TEISparseEncoder` 缺地址那句——最后这处是**用例逼出来的**：把既有断言从 `ValueError` 收紧成专用类型后它当场红，说明它同在构建路径上、同属配置类拒绝。
- 网关注册**一个**处理器（`JSONResponse(400, {"detail": str(exc)})` + 一条 warning 日志），且在注释里写明为什么只注册这一个类型。
- **与 plan 的一点偏差（已在计划里登记的验收写法之外）**：plan 写"用 TestClient 直接打一个会触发的端点"，但真栈上没有便宜的此类端点（能触发的路由都要知识库夹具）。改成两件事分开钉：① 真实 `create_app()` 的注册表里**有**该类型、**没有** `ValueError`；② 取出真实处理器挂到裸 app 上走**真实 HTTP**，断言 400 且 detail 原样。
- **范围不对称（记录在案）**：`parse_local.py` / reranker 的同类拒绝**仍是普通 `ValueError`**（HTTP 上仍是 500）——它们不在 `build_embedder` 路径上，而 spec §5 已把 rerank/parse 的保存期校验排除在本期之外。
- **有牙证明**：把处理器注册到 `ValueError` 上 → 两条用例立刻红（`ValueError not in handlers` + 按类型取不到处理器）。
- **门禁**：`test_rag_configuration_error.py` + `test_embedder_providers.py` + `test_rag_config_api.py` = 46 passed；`test_harness_boundary.py` 绿（harness → app 方向未破）；`ruff check` / `ruff format --check` 干净；**全量 144 failed / 12339 passed（+4 即本次新增用例），与 Task 2 那轮逐条比对双向差集为空**。

- [x] **RED**
  - `RagConfigurationError` 存在且 `isinstance(exc, ValueError)`；
  - `build_embedder` 在四种配置错误下都抛它（稀疏不匹配、缺 base_url、维度不是 1024、声明与集合不符）；
  - 网关处理器把该类型映射成 400 + `detail=str(exc)`（用 `TestClient` 直接打一个会触发的端点）；
  - 反例：只开了这一个口子——断言 `app.exception_handlers` 里**只有** `RagConfigurationError` 一个键、**没有** `ValueError`（比造一个故意抛 ValueError 的端点稳，也不依赖某个端点的内部实现）。

- [x] **GREEN**
  - `knowledge/embedder_factory.py`（或 `providers` 旁）新增 `RagConfigurationError(ValueError)`，把该模块现有 `ValueError` 换成它；
  - **把 Task 2 里那句 `except ValueError` 收窄成 `except RagConfigurationError`**（Task 2 落地时该类型还不存在，那里的注释已写明由本任务接手）；
  - `app/gateway/app.py` 注册 `app.add_exception_handler(RagConfigurationError, handler)`，返回 `JSONResponse(400, {"detail": str(exc)})`；
  - 确认 harness → app 方向依赖不变（`test_harness_boundary.py` 必须全绿）。

- [x] **门禁**：`make test` 全量（这步动了共享层，必须全量）。

---

## Task 4 — 前端：编辑期拦下并禁用保存（D2）

**状态：已交付 2026-09-16。**

**交付纪要**

- 判定抽成纯函数 `core/rag/config-form.ts::isSparseSourceUnsupported(values, providers)`（与 `isEmbeddingChange` 并列）；视图只负责渲染。**这是必须的分解**：plan case 4 要证「拿表单当前值判定」，而 DOM 里驱动 Radix Select 不可靠（该文件既有注释已说明），纯函数层可以直接把「表单里的 provider」与「响应里 seed 的 provider」构造成两个不同的值来钉死。
- **unknown ≠ unsupported**：`providers` 缺失（旧响应）或列表里没有该 id ⇒ 返回 `false`。理由写进函数 docstring：不知道的事不该报警（后端本来也会拒），报错比沉默更糟。三种情形各有用例（`undefined` / `[]` / 列表缺该 id）。
- 渲染：检索卡底部的 `role="alert"`（与 `embeddingChangeWarning` 同处，**且在折叠区之外**）+ Save 左侧复用 `noChanges` 位置的同一句；Save 的 `disabled` 并入该规则。
- **用例 6 条**：node 3 条（规则语义 / 用表单值判定 / 未知不报）+ DOM 3 条（告警 + Save 被挡 + Save 旁给原因 / 换成 `bm25` 后放行 / 旧响应不报）。i18n 三处键名 `sparseProviderUnsupported`（spec §3 D2 的两句话原样落地）。
- **⚠ 一条自己抓出来的空断言（当场改强，未留到评审）**：最初那条「Save 必须 disabled」在夹具里是**空的**——配置本身非法 ⇒ 表单无可改 ⇒ `hasChanges` 为假时 Save 本来就灰。改成**先做一个普通编辑**（本该让 Save 可点），再断言仍被这条规则挡住；neuter 才因此转红（见下）。
- **有牙证明**：(a) 把「未知」也算成不支持（`!capability?.emits_sparse`）→ node 与 DOM 两条「未知不报」用例同时红；(b) 去掉 Save 上的 `sparseUnsupported ||` → 那条被改强的 Save 用例红（`expected false to be true`）。
- **门禁**：`pnpm test` 全量 **238 文件 / 2500 用例全绿**（+6 = 本次新增）；`pnpm check` eslint 干净、tsc 只剩宠物线那条预存红；prettier 逐文件与 HEAD 比对——`config-form.test.ts` 一度 39→44（我那段有 4 处该折行、1 处多余空格），按 prettier 偏好改回 **39 = 39**，其余文件与既有基线持平（`functional-models-view.tsx` 6 / `functional-models.dom.test.tsx` 32 / locales 8/12/1）⇒ **零新增格式债**。

- [x] **RED**
  - `frontend/tests/unit/settings/functional-models.dom.test.tsx`（及其 isolated 版）加：
    1. `emits_sparse=false` + `source=provider` → `role="alert"` 告警出现，Save `disabled`，**且 Save 旁出现同一句原因**；
    2. 来源改 `bm25` → 告警消失、Save 回落到既有「有改动才可点」规则；
    3. **旧响应兼容**：响应里没有 `embedding_providers` 时不告警、不崩（「拿不到能力就不提示」的降级语义）；
    4. **判定取表单当前值**：只改 `embedding_provider`（不改来源、不保存）就立刻出现告警——证明它读的是表单值而不是已保存值。

- [x] **GREEN**
  - `core/rag/types.ts`：`RagConfigView.embedding_providers?: { provider_id: string; emits_sparse: boolean }[]`；
  - `components/workspace/settings/functional-models-view.tsx`：由 `values.embedding_provider` 与 `view.embedding_providers` 派生 `sparseUnusable`，渲染告警（与 `embeddingChangeWarning` 同处、同 `role="alert"` 形态），并入 Save 的 `disabled` 条件，并在 Save 左侧（复用既有 `noChanges` 的位置）显示同一句原因；
  - i18n 三处（`zh-CN.ts` / `en-US.ts` / `types.ts`）键名固定为 **`sparseProviderUnsupported`**，中英各一句，与后端 `embedder_factory.py:87` 同一事实（spec §3 D2 已给出两个可落地的句子）。

- [x] **门禁**：`pnpm check` + 全量 `pnpm test`（改了共享设置视图，必须全量）。

---

## Task 5 — 文档同步与真栈验收

**状态：已交付 2026-09-16。**

**交付纪要**

- 文档：`frontend/AGENTS.md` 功能模型一节补「能力随配置下发 + 编辑期拦截（表单值判定 / 未知不算不支持 / Save 旁给原因）」；`backend/AGENTS.md` 的 RAG 配置一节补 `embedding_providers` 字段、PUT 落盘前用同一段 `build_embedder` 校验与 `提交后的配置仍不可用：` 400、判定基准是 `AppConfig.yaml_rag`（并说明为何不能用 `config.rag`）；`build_embedder` 那段补 `rag=` 覆盖参数与 `RagConfigurationError`（含"网关只映射这一个类型、rerank/parse 仍是普通 `ValueError`"）。两份 .md 的 prettier 债与 HEAD 持平（frontend 8 = 8；backend 115 = 115）。
- **真栈腿①（界面）**：`?settings=models` 深链 → 功能模型 → 合法态无告警、Save 灰且为「没有需要保存的改动」；把「提供商」切到「OpenAI 兼容」→ **两条 `role="alert"` 并存**（重排索引那条 + 稀疏那条，后者文案逐字符合 spec），Save 仍灰，**那句原因就在 Save 旁**；切回「阿里百炼 (DashScope)」→ 告警清零、Save 回到「没有需要保存的改动」。**全程未保存任何配置**。
- **真栈腿②（D4 的 400）**：手工把 `rag_config.json` 写成坏组合（含 `embedding_base_url`，确保命中稀疏那条而非缺地址），`POST /api/knowledge-bases/{kb}/manual-knowledge` → **400 + 原样 detail**（`嵌入 provider 'openai-compatible' 只输出稠密向量 ⇒ …请改为「独立稀疏服务」（external）或「本地 BM25」（bm25）。`），且**没有写入任何数据**（该路径顺序是 embed → upsert → 落库）。配置随后**逐字节还原**并两次用 `GET /api/rag/config` 复核（`dashscope` / `provider` / `extract_model` 原样）。
  顺带确认 Task 1 的能力块在真栈上确实返回：`[{dashscope,true},{openai-compatible,false}]`。
- **⚠️ 真栈推翻了我原先挑的验证端点（spec §6.11 已当场修正）**：`POST /{kb}/recall-test` 返回 **200**，把异常按路降级成「该路检索失败（RagConfigurationError），详情见服务端日志。」——异常到不了处理器。那是该端点"永远产出完整报告"的既有设计（不是缺陷），但也意味着**在那条路上，可读的那句话仍然没到用户眼前**；这是本期范围之外的遗留，已记进 spec §6.11 的告警与我们 §5 的"不做"清单精神一致。

**验收清单**

- [x] `frontend/AGENTS.md` 功能模型一节：补能力随配置下发 + 编辑期拦截 + Save 禁用并给出原因；
- [x] `backend/AGENTS.md` RAG 配置一节：补 `embedding_providers` 字段、PUT 的 400 语义（含 `提交后的配置仍不可用：` 前缀）、以及 `build_embedder` 新增的 `rag=` 覆盖参数；
- [x] 真栈（spec §6）：
  1. 界面上切到 `openai-compatible` 保持「跟随向量模型」→ 告警出现、Save 灰并给出原因；改回 `dashscope` 恢复；再用 `?settings=models` 复核深链仍可用。
  2. **D4 的出口**：手工把 `rag_config.json` 写成坏组合，curl 一个用到嵌入的接口（或 PUT）→ 400 + 可读 detail，不是裸 500。这一步不经前端。

---

## 提交切分

| 提交 | 内容                                                 |
| ---- | ---------------------------------------------------- |
| 1    | Task 1（能力块）+ 用例                               |
| 2    | Task 2 + Task 3（PUT 拦截 + 异常类型与处理器）+ 用例 |
| 3    | Task 4（前端拦截）+ 用例                             |
| 4    | Task 5（文档 + 真栈结论）                            |

不改表、不改 `rag_config.json` schema，无迁移。
