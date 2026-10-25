# 保存期嵌入探测（G1 + G2 合并） —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-17-rag-save-time-embedding-probe-design.md](../specs/2026-09-17-rag-save-time-embedding-probe-design.md)
**Status:** 已全部交付 2026-09-17（Task 0–3；三条真栈腿全过，配置逐字节还原）
**Parent:** [2026-09-17-rag-ark-embedding-provider.md](2026-09-17-rag-ark-embedding-provider.md)（那份 plan 的 spec §6 把 G1/G2 判为「同因、合并成独立一条」）

**Architecture:** 把 PUT 从「只做静态判定」变成「**静态判定 → 真打一次 → 才写盘**」，但那一次调用**只在相关字段真的变了时才发**（改 rerank/parse 等一律零延迟）。一次调用同时答两问（宽度 / 稀疏在不在），因为运行期本来就是同一段代码同时判这两件事。平台不可达**不拦**——改配置的动机常常正是"当前这份不能用"，拦住等于堵死出口——而是 200 加一句 `warning`（**始终存在、无话时为 `null`**；刻意**不用** `models/config/validate` 那个 `exclude_none` 的写法——它是递归的，会把嵌套 `config` 里的 null 一并剔掉，理由见 spec D3）。

**依赖顺序**：Task 1（后端）→ Task 2（前端）→ Task 3（文档 + 真栈）。

---

## Task 0 — 开工前的五项核实（只读，不改代码）

**起草终审时已按代码核实、不必再核的**（列出来免得重复劳动）：PUT 的顺序是 `_prune_empty` → `_reject_unusable_after_save` → `atomic_write`；**哨兵解析排在静态校验之前**（`submitted[name] = keep`），所以值比较落在 `payload` 上就够；`_PROBE_TIMEOUT_SECONDS = 10.0` 与 `_PROBE_TEXT = "probe"` 就在同一模块；`TEISparseEncoder` 连不上抛的是 `EmbedderError`（401 才是 `EmbedderAuthError`）；**`response_model_exclude_none` 是递归的**（实测会把 `config` 里所有 null 一并剔掉）。

**状态：已核实 2026-09-17。**

**核实纪要（五条都核了，其中两条改进了 spec）**

1. **`probe-embedding` 的判定代码**：它**只答稀疏那一问**——先捕 `SparseHalfMissingError` ⇒ `unsupported`，再由最后那个兜底 `except Exception` ⇒ `unverifiable`，**中间没有任何宽度判定**。
   ⚠️ **⇒ 两条改进**：(a) 保存期探测**必须把 `RagConfigurationError` 捕在最前面**判 400，否则宽度错会掉进兜底、被当成"没能验证"**放行**（正是 G1 要治的洞）；(b) **不能指望包装类**，宽度要**自己看 `dense` 长度**。两条都已写进 spec 的 D4/D6。
2. **`_PROBED_DIMENSIONS`**：键 = `(provider id, base_url, model)`；判定体写在 `if results and self._key not in _PROBED_DIMENSIONS:` **里面**（先缓存、再抛）。
   ⚠️ **⇒ 我 D6 原来的第二句是错的**：key 一旦在缓存里，后续调用**直接返回、不再检查宽度**（靠 Qdrant 拒写兜底），**不是"立刻拒"**。spec D6 已改正。
3. **golden 的 PUT payload** 确实会触发探测：它把四个嵌入字段一起改了（`provider=dashscope→openai-compatible`、`model→ui-embedding`、`base_url→http://localhost:8080/v1`、`sparse_source→bm25`，而该夹具的前提是"`rag_config.json` 起始为空 + `config.yaml` 带 `YAML_RAG`"）⇒ 那两条形状守卫按 spec §5 放宽（`golden ∪ {embedding_providers, warning}`）。
4. **前端保存路径**：`useSaveRagConfig()`（视图 `:328`），`handleSave` 里的 `onSuccess` 目前**只 toast**；`warning` 要在那里接（`onSuccess(data)`）+ 自己存一个 state 常驻显示。**渲染形态照抄 `models-add-dialog.tsx:326-331`** 的 `<p className="text-muted-foreground text-sm" role="status">`（不新造控件）。
5. **桩与计数**：兄弟文件的做法是把 `httpx.AsyncClient` **整个换掉**——`real_async_client = httpx.AsyncClient; monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: real_async_client(transport=httpx.MockTransport(handler)))`，handler 里 `recorded.append(request)` ⇒ **计数就是 `len(recorded)`**（正是用例 7/8 要的）。"连不上"用 `handler` 里 `raise httpx.ConnectError(..., request=request)`。

- [x] 1. `probe-embedding` 的断言代码位置与可复用性（⇒ 两条改进，见上）。
- [x] 2. `_PROBED_DIMENSIONS` 的键与语义（⇒ D6 那句已改正）。
- [x] 3. golden PUT payload 的嵌入字段变化（⇒ 四字段全变，探测确实会触发）。
- [x] 4. 前端保存路径与 `warning` 的渲染落点。
- [x] 5. 兄弟用例桩网络的确切写法与计数读法。

**门禁**：无（只读）。

---

## Task 1 — 后端：相关字段变了才探（D1–D5）

**状态：已交付 2026-09-17（RED 9 红 / GREEN 11 绿 / 三条 neuter 全有牙 / 窄面绿；全量在跑）。**

**交付纪要 —— RED**

- 新文件 `backend/tests/test_rag_config_save_probe.py`，11 条用例（计划列的 10 条 + 一条把「保存期 400 的措辞 == 运行期那句」单独钉住的用例）。桩照抄兄弟文件（换掉 `httpx.AsyncClient` + `MockTransport`，handler 里记请求 ⇒ 计数就是 `len(recorded)`）。
- **RED 的结果是 `9 failed / 2 passed`，两条全绿的都是本来就成立的**：① 「运行期文案」那条（改的是断言、不是行为，它当场就绿）；② 「同值不探」那条——**它绿是因为当时根本没有探测**，这正是计划里 neuter ① 要补的那颗牙。
- 失败原因逐条核过都是预期的那一种：四条「该 400 却是 200」、四条 `KeyError: 'warning'`、一条「不该写的写了」。

**交付纪要 —— GREEN**

- `knowledge/embedder_factory.py`：新增 `dimension_mismatch_message(measured)`，`_DimensionCheckedEmbedder` 改用它 ⇒ **宽度这句只有一处措辞**，保存期与运行期共用（D5）。
- `app/gateway/routers/rag_config.py`：`_pending_rag()`（把「这次写会产出的配置」从 `_reject_unusable_after_save` 里提出来，两处共用）、`_reject_unusable_after_save(pending)`（不再自己 merge）、`_WATCHED_EMBEDDING_FIELDS`（六个字段）、`_embedding_signature()`（**空串与 None 同义**）、`_probe_after_save()`（`build_embedder(rag=pending)` + `asyncio.wait_for(embed(...), 10s)`；`RagConfigurationError` **捕在最前**判 400；其余一律 warning）、`_unverified_warning()`（**按原因分措辞**：凭据被拒 / 探测超时 / 未能连通）；`RagConfigResponse` 加 `warning: str | None = None`（**不加 `exclude_none`**）。
- **宽度判定写在探测自己肚子里**（`len(results[0].dense)`），不读运行期那层包装——Task 0 第 2 条核实过：`_PROBED_DIMENSIONS` 的判定体写在 if 里面，key 一旦缓存，后续调用直接返回。用例 1 **故意连发两次**同一个 PUT（第二次缓存已热），把这件事钉住。
- `tests/test_rag_config_api.py`：加了一条 autouse 的「本文件不出网」桩（新契约下 golden PUT 会真的去拨 `localhost:8080`），并把两条形状守卫的允许集**显式登记**成 `{embedding_providers, warning}`（GET 也要放 `warning`——它同样始终在）。

**交付纪要 —— neuter（三条都有牙）**

| neuter | 预期 | 实测 |
| --- | --- | --- |
| ① 去掉触发器（无条件探） | 7/8 红 | **3 红**（两条「不探」+ `warning` 始终在的那条） |
| ② 探测改成只 build 不真打 | 1/2 红 | **6 红**（1/2 之外，四条依赖真实调用产生异常/答案的跟着红——符合预期，它们本就靠这次调用） |
| ③ 「不可达放行」改成拒绝 | 4/5/6 红 | **3 红**，正是这三条 |

- [x] **RED**：新建 `backend/tests/test_rag_config_save_probe.py`（与既有 `test_rag_config_sparse_probe.py` 同构）。**桩的做法照抄兄弟文件**——`monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: real_client(transport=httpx.MockTransport(handler)))`（那边的原话是 *Nothing here touches the network*），handler 里**记计数**。用例：
  1. **宽度不对**（桩返回 2560 维）⇒ **400**，`detail` 以 `提交后的配置仍不可用：` 开头、含**重建索引**指引，且正文与 `_DimensionCheckedEmbedder` 那句**逐字一致**；
  2. **稀疏为空** + `sparse_source=provider` ⇒ **400**，`detail` 含「独立稀疏服务」与「本地 BM25」（即 `SparseHalfMissingError` 那句）；
  3. **反例**：同一个空稀疏端点但 `sparse_source=bm25` ⇒ **200**；
  4. **`external` + 死的稀疏服务** ⇒ **200 + `warning`**（**不是 400**）——D3 那张映射表唯一的入口，今天没有用例覆盖；
  5. **不可达**（死端口）⇒ **200 + `warning`**，且**配置确实写进去了**（读回有效值）；
  6. **凭据被拒**（桩返回 401）⇒ **200 + `warning`**，且措辞说的是"凭据被拒"**不是**"连不上"；
  7. **只改无关字段**（`rerank_model`）⇒ **handler 计数为 0**、PUT 200；
  8. **值没变则不探**：payload 带着嵌入字段但值与当前相同（含**掩码哨兵**那一情形）⇒ **计数为 0**；
  9. **失败不半写**：被拒的写 ⇒ 落盘为零（读回与写前逐字节相同）；
  10. **`warning` 始终在**、无话时值为 `null`；**且 `config` 里原本是 `null` 的字段仍在**（断言 `config.judge_model` 是 `null` 而不是缺键——这条守的是"不许用 `exclude_none`"）。
- [x] **GREEN**：
  - `app/gateway/routers/rag_config.py`：新增触发判据（六个字段的值比较，落在 `payload` 上）与探测（`build_embedder(config, rag=pending)` + `asyncio.wait_for(embedder.embed([_PROBE_TEXT]), _PROBE_TIMEOUT_SECONDS)`）；**异常按 D3 那张表分派**（`RagConfigurationError` ⇒ 400；`EmbedderError`/`EmbedderAuthError`/超时 ⇒ 200 + `warning`，措辞按原因分）；两条 400 与探测一起插在静态校验之后、`atomic_write` 之前；探测失败/不可达各记一条 warning 日志。
  - `RagConfigResponse` 加 `warning: str | None = None`（**不加 `exclude_none`**，理由见 spec D3）+ `_build_response` 收一个可选的 warning 参数。
  - 400 的正文**复用既有两个异常的文案**（D5），断言逻辑复用 `COLLECTION_DIMENSION`，不另写一套。
- [x] **neuter 三条（都必须有牙）**：① 去掉触发器（无条件探）⇒ 用例 7/8 红；② 探测改成不真打（只 build）⇒ 用例 1/2 红；③ 把"不可达放行"改成拒绝 ⇒ 用例 4/5/6 红（三条一起红是**对的**：它们属同一类结局）。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`tests/test_rag_config_api.py` + 新文件 + `tests/knowledge/`）绿；**全量后端后台跑**，跑完**抽全部 FAILED 的 node id 去 HEAD 跑同一批、双向 diff**（`xargs -d '\n'`，别用 unquoted `$(cat ids)`——有一条 id 的参数本身就是 `; rm -rf /`）。

**交付纪要 —— 门禁**

- `ruff check` / `ruff format --check`：干净（顺手去掉一个 import 后引入的 `EmbedderError` 未用项——它本来就落在兜底 `except Exception` 里）。
- **窄面**：`tests/knowledge/` + 四个 rag-config 文件 = **1180 passed / 50 skipped / 1 error**。那个 error 是 `tests/knowledge/wiki/test_generator.py::test_only_dirty_prune_removes_vector_point`——**既有环境项**（setup 期连 Qdrant，本机 6333 连不上），与本次改动无关。
- **全量后端**：**145 failed / 12336 passed / 160 skipped / 1 error**（14:26）。通过数 **+11 = 本轮新增用例**；那个 error 就是上面那条 Qdrant 环境项。
- **与 HEAD 的双向 diff**：把本轮 145 个 FAILED 的 node id 拿去 HEAD（`git worktree add --detach` 到仓外）跑同一批 ⇒ **143 failed / 2 passed**。两条「HEAD 绿、本轮红」逐条归因，**都不是回归**：
  1. `tests/test_delta_channel_state.py::test_merge_message_writes_randomized_differential` —— **记录在案的 flake**（整跑里红、单独跑两次都过，两轮都在集合内）；
  2. `tests/test_review_changed_public_skills.py::test_main_exits_nonzero_when_review_cli_reports_error` —— **环境条件**：那条断言要求 `PYTHONPATH` 里含**正斜杠**的 `backend/packages/harness`，而 `str(WindowsPath)` 是反斜杠。本仓把 `PYTHONPATH` 设成正斜杠式**当场就绿**（已实测）；HEAD 那一轮之所以「绿」，正是因为那次为了让 worktree 的 `deerflow` 指向 worktree 而设的 `PYTHONPATH` 恰好是正斜杠。
- **两处过程记录**：① 那条 id 文件我第一次用 `write_text()` 写 ⇒ Windows 下变成 **CRLF** ⇒ HEAD 那一批**全部 "not found"**（`1 warning`、零收集），改用 `write_bytes` 存 LF 后重跑，第二次无 "not found"；② HEAD 那一批里有些用例的失败原因与主树不同（worktree 环境缺 `ComSpec`，见 `FileNotFoundError('shell not found…')`）——这不影响「有没有回归」这个唯一要回答的问题，但不该把 worktree 的 143 当作与主树逐条同因。

## Task 2 — 前端：把 `warning` 显示出来（D3 的另一半）

**状态：已交付 2026-09-17。**

**交付纪要**

- **RED**：`tests/unit/settings/functional-models.dom.test.tsx` 加一个 describe（2 条），并给该文件的 `view()` 夹具加 `warning` 选参（默认 `null` = 服务端验证过了）。为此加了一个 `saveWillReturn(warning)` 助手：视图的 `onSuccess` 收的就是响应体，所以「保存成功但带警告」要靠它摆出来。RED 两条都红（`findByText` 超时，通知根本没渲染）。
- **GREEN**：`core/rag/types.ts` 的 `RagConfigView` 加 `warning: string | null`（**非可选**，注释写明「旧后端不发时读作 `undefined`，与 `null` 同义」）；`functional-models-view.tsx` 加一个 `saveWarning` state、在 `handleSave` 的 `onSuccess(saved)` 里 `setSaveWarning(saved.warning ?? null)`，渲染用**既有的**形态（`<p className="text-muted-foreground mt-3 text-sm" role="status">`，照 `models-add-dialog`），落在 Save 那一行**上方自成一行**——不跟 `sparseBlockReason`/`noChanges` 抢同一个槽位。
- **两处与计划不符（都不需要改，如实记）**：① **`api.ts` / `hooks.ts` 零改动**——`saveRagConfig` 本来就 `Promise<RagConfigView>`，`useMutation` 也本就把响应体递给 `onSuccess`，所以只改类型就够；② **i18n 三处没有加键**——这句措辞由服务端给（`提交后的配置已保存，但未能验证：…`），前端只负责显示，没有新的界面文案（与 400 的 `detail` 走 toast 同一口径）。
- **一条计划没定的规则，我定了并给了用例**：这条通知**属于它描述的那次保存**，所以「下一次保存报自己的结论」时被替换/清空，而不是被下一次敲键清掉（它说的是**已在生效**的那份配置）。neuter ② 专门钉它。
- **neuter 两条都有牙**：① 去掉渲染 ⇒ 2 红；② 只在有话说时才赋值（`if (saved.warning)`，即永不清理）⇒ **只有第 2 条红**（第 1 条仍绿）⇒ 证明"属于最后一次保存"这条规则不是顺带的。
- **门禁**：`pnpm check`（eslint + tsc）**零诊断**（宠物线那条预存红已被 `fc7548f3` 修掉，因此现在是干净零）；prettier 逐文件与 HEAD 比数字：`types.ts` 0/0、`functional-models-view.tsx` 17/17、`functional-models.dom.test.tsx` 129/129、`config-form.test.ts` 194/194 ⇒ **零新增格式债**（其中 `config-form.test.ts` 我第一版写了个内联字面量，prettier 会折成 5 行 ⇒ 当场按它的偏好预折，数字才回到 194）；**全量前端 238 文件 / 2549 用例 / 0 失败**。

- [x] **RED**：`frontend/tests/unit/settings/functional-models.dom.test.tsx` 加用例：保存成功但响应带 `warning` ⇒ 页面出现那句话（断言文本）；**没有 `warning` ⇒ 什么都不出现**（不是为了显示而显示）。
- [x] **GREEN**：`core/rag/types.ts`（PUT 响应类型加 `warning: string | null`——**非可选**，它始终在）、`hooks.ts`/`api.ts` 把它带回来、`functional-models-view.tsx` 用**既有**的提示形态渲染（Task 0 第 4 项定的落点，别新造控件）；i18n 三处按需加键。
- [x] **neuter 一条**：去掉渲染 ⇒ 用例红。（另加一条：永不清理 ⇒ 只有「下一次保存」那条红。）
- [x] **门禁**：`pnpm check`（eslint + tsc；**tsc 的允许集只有宠物线那一条** `pet-sprite.dom.test.tsx` 的 `"greet"`——若它已修，则应为零诊断）；prettier **逐文件与 HEAD 比数字**；**全量前端**。

## Task 3 — 文档同步与真栈验收

**状态：已交付 2026-09-17（三条真栈腿全过，收尾逐字节还原）。**

**交付纪要 —— 文档**

- `backend/AGENTS.md`（RAG 配置节，新增一段）：**三条结局**（问到答案是"不可用" ⇒ 400，且**文案由运行期那两个 helper 给**；没能问到答案 ⇒ 200 + `warning`；**没变 ⇒ 一次调用都不发**）+ 六个字段 + 最坏多等 `_PROBE_TIMEOUT_SECONDS`（10s）；两条护栏：**宽度从探测手里的向量量**（`_PROBED_DIMENSIONS` 的判定体在 `if` 里面，热 key 会直接放行）、**`warning` 始终在、无话为 `null`** 及**为什么刻意不用 `exclude_none`**（递归，会连 `config` 里的 null 一起剔掉）。
- `frontend/AGENTS.md`（功能模型节，新增一段）：三种结局怎么区分、通知落在 Save 上方自成一行（不与 `sparseBlockReason` / `noChanges` 抢槽位）、**是状态不是 toast**、**属于它描述的那次保存**（下次保存替换它，敲键不替换）、旧网关缺字段读作 `null`。

**交付纪要 —— 真栈（`:8001` 网关 + `:3000` 前端，均在跑；用一个一次性桩脚本，已删）**

- **`openapi.json` 先核了代码已在跑**：`RagConfigResponse` 的属性里有 `warning` ⇒ 运行中的网关确实是新代码（不是拿旧进程测新行为）。
- **腿①（宽度）**：向量提供方切到「OpenAI 兼容」⇒ 地址那一行**当场从锁框变成可编辑输入框**（能力块驱动），填入桩的 **2560 维**端点、稀疏来源改「本地 BM25」（不然 Save 被 dense-only 拦着、请求根本发不出去）⇒ 保存 ⇒ 页面 toast **逐字**：`提交后的配置仍不可用：嵌入模型返回 2560 维，而向量库集合固定为 1024 维 ⇒ 拒绝启用。请改用 1024 维的模型，然后到「设置 → 模型 → 功能模型 → 重建索引」重新嵌入现有切片。`；**`rag_config.json` 的 md5 未变**（md5 `15fa768a…`）。
- **腿②（不可达）**：地址改 `http://127.0.0.1:8199/v1`（死端口）⇒ 保存**成功**（文件写入了 `openai-compatible` + 该地址 + `bm25`），页面在 Save 那一行**上方**出现 `role="status"`：`提交后的配置已保存，但未能验证：未能连通（EmbedderError）：embedding request failed: All connection attempts failed` —— 这就是 D3 那张映射表唯一没有用例覆盖的入口，在真栈上落地。
- **腿③（零负担，计数桩真观测）**：地址改指**计数桩**（1024 维）⇒ 保存 ⇒ 桩计数 **0 → 1**（**恰好一次**真实调用），且**上一次那条「未能验证」被这次已验证的保存清掉**（同一次读取里 `[role=status]` 为空）；随后**只改 `rerank_model`** ⇒ 保存 ⇒ 桩计数**仍是 1**（**零次调用**，且改动确实写进了文件）⇒「不每次出网」是**观测到的**，不是嘴上说的。
- **收尾**：`rag_config.json` **逐字节还原**（`cmp` 通过，md5 回到 `15fa768a0d5d5c388c26b14aa2844abe`）；文件里**没有任何密钥**（全程没在界面里填过 key，两个 API Key 都是「环境变量已提供」）；桩进程**按 PID** 停掉（8123/8124 已拒绝连接）、脚本已删（`.deer-flow/` 只剩原有的 `blocking-io-t8.json`）；页面重载丢弃表单编辑 ⇒ 复核回到 **阿里百炼 (DashScope)**、地址那一行**又是锁框**、锁框里是默认地址；「重建索引」入口**只确认在**（目标知识库选择器 + 按钮都在），**没有实际重建**。
- **两处过程记录**：① 547px 视口下 Save 按钮在折叠线以下，browser-use 的 `click` 报 `Element could not be scrolled into the viewport` ⇒ 改用页面内 `scrollIntoView({block:'center'})` + `.click()`；② 腿②我第一遍在点击后 6s 内读 `[role=status]` 拿到**空数组**，稍后复查**有值**（就是上面那句）⇒ 判定「有没有渲染」**不能靠单次即时读取**，要以复查为准（成因未隔离，如实记）。

- [x] `backend/AGENTS.md`（RAG 配置一节）：补 PUT 的**三条结局**、**异常 → 结局的映射**（哪一类是"确定的错"、哪一类只是"没问到答案"）、**"只在相关字段变了才探"**及那六个字段、**PUT 从此可能出网 ⇒ 最坏多等 `_PROBE_TIMEOUT_SECONDS`（10s）**、以及 **`warning` 始终存在（无话为 `null`）——并写明为什么刻意不用 `exclude_none`**（它是递归的，会剔掉 `config` 里所有 null）。
- [x] `frontend/AGENTS.md`（功能模型一节）：补保存成功但带警告时的呈现（`warning` 是 **`null` 而不是缺席**；为 `null` 时什么都不显示）。
- [x] **真栈腿①（宽度）**：配一个宽度不对但**能连上**的模型 ⇒ 保存当场被拒、提示含重建索引。
- [x] **真栈腿②（不可达）**：地址指向死端口 ⇒ 保存**成功** + 页面给出"未能验证"的提示。
- [x] **真栈腿③（零负担，用计数桩真观测）**：本机起一个**计数桩**当嵌入端点（一次性脚本，跑完即删）⇒ 改一个嵌入字段保存：计数 **+1**；接着**只改 rerank** 保存：计数**保持不变**。⇒「不每次出网」是**观测到的**，不是嘴上说的。
- [x] **收尾**：配置**逐字节还原**（md5 与动手前相同）、密钥不落盘、不新建文件（计数桩脚本已删）、浏览器里被改过的表单重载丢弃。
- [x] **门禁**：两份 `.md` 的 prettier 与 HEAD 同数（backend **282/282**、frontend **16/16** ⇒ 零新增债）；`rag_config.json` md5 未变。
      > ⚠️ 量 `frontend/AGENTS.md` **必须在 `frontend/` 目录里跑** prettier——在仓库根跑会因解析不到 `prettier-plugin-tailwindcss` 直接报错、输出为空，从而给出**假数字**（我第一次就得到 `head=547`）。

---

## 提交切分

| 提交 | 内容                                              |
| ---- | ------------------------------------------------- |
| 0    | **本计划 + 它的 spec 成对**                        |
| 1    | Task 1（后端：触发判据 + 探测 + `warning` + 用例） |
| 2    | Task 2（前端：显示 `warning` + 用例）              |
| 3    | Task 3（文档 + 真栈结论）                          |

不改表、不改 `rag_config.json` schema、**不动任何默认值**。
