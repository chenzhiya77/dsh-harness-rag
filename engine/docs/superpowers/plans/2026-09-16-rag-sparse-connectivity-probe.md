# 外部稀疏服务连通性探针 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-16-rag-sparse-connectivity-probe-design.md](../specs/2026-09-16-rag-sparse-connectivity-probe-design.md)
**Status:** 已交付 2026-09-17（Task 1–3 全部完成，含真栈两条腿）
**Parent:** [2026-09-16-rag-sparse-capability-probe.md](2026-09-16-rag-sparse-capability-probe.md)（模型级能力探针；本计划是它的增量，形状逐条对齐）

**Architecture:** 把嵌入侧探针（`POST /api/rag/config/probe-embedding`）的**同一套形状**补到"外部稀疏服务"这一格：admin、只读不落盘、有界超时、失败返回状态而不是抛。判定**直接构造 allowlist 里那个稀疏 encoder** 并真打一次 `/embed_sparse`（不经过 `build_embedder`，避免连带要求稠密配置完整）。界面沿用刚立的规矩——状态**骑在接口地址字段内**（`trailing` 插槽），**只报不拦**。

**依赖顺序**：Task 1（后端）→ Task 2（前端）→ Task 3（文档 + 真栈）。

---

## Task 1 — 后端：`POST /api/rag/config/probe-sparse`（D1–D3）

**状态：已交付 2026-09-17。**

**交付纪要**

- **实现**：`rag_config.py` 加 `RagSparseServiceProbeRequest/Response`（三态 `ok|empty|unreachable`）与端点；**直接构造 allowlist 里那一行的 encoder** 并 `encode([_PROBE_TEXT])`（不走 `build_embedder`）；掩码哨兵复用 `_probe_api_key`（顺手把它从"写死 embedding"泛化成接 `field_name`，环境名走 `_SECRET_KEYS` 表；兄弟探针的 8 条用例全绿证明行为未变）；超时/`detail` 截断沿用既有常量。
- **用例 9 条**（`tests/test_rag_config_sparse_probe.py`）：`ok`（并断言请求形状 = `POST {base}/embed_sparse` + `{"inputs": ["probe"]}`）、`empty`、形状不符、连不上、401 带状态码、不落盘、不回显密钥、未知/空 provider ⇒ 422、非 admin ⇒ 403。
- **RED 时 8 红 1 绿，那 1 绿是空洞的**（404 当然不动文件）⇒ 当场把"不落盘"那条改成**先断言探针成功**再比字节（与上一轮"不回显密钥"同一个坑，第二次踩到同一个模式）。
- **⚠️ 实现期踩到一个真缺陷（被兄弟文件当场抓住）**：我最初把两个模型类**重名定义**成 `RagSparseProbeRequest/Response`——那正是**嵌入能力探针**的类名 ⇒ 它的端点被换成校验稀疏请求体，兄弟文件 8 条立刻红（422、无 `status` 键）。改名为 `RagSparseServiceProbe*` 后 46 条全绿。**教训：新增同族端点时先 grep 一遍类名**。
- **⚠️ neuter 抓出一段死代码**：`len(vectors) != 1` 那个分支**永远到不了**——行数不符在 `TEISparseEncoder._encode_batch` 里就被拒了（它与批大小比对后抛 `EmbedderError`），会先落到 `except` 分支。已**删掉**该分支并在原位留注释说明，测试改为断言"走到异常路径"。
- **neuter 两条（都有牙）**：① `empty` 归进 `ok` ⇒ "空不是 ok"那条红；② 失败一律报 `ok` ⇒ 三条（形状/连不上/401）同时红。

- [x] **RED**：`backend/tests/test_rag_config_sparse_probe.py` 加用例（桩一个本地 `/embed_sparse`）：
  1. 正常返回稀疏 ⇒ `{status: "ok"}`；
  2. 返回 `[[]]`（通、形状对、无词项）⇒ `{status: "empty"}`——**不是** `ok`，也**不是** `unreachable`；
  3. 连不上 ⇒ `unreachable` 且 `detail` 非空；
  4. **401** ⇒ `unreachable` 且 `detail` 含 `401`；
  5. **不落盘**：调用前后 `rag_config.json` 逐字节相同；
  6. **不回显密钥**：提交一个明显的假 key，断言**成功响应**的 body 里不含它；
  7. `sparse_provider` 为空 / 未知 ⇒ 422；
  8. 非 admin ⇒ 403。
- [x] **GREEN**：`app/gateway/routers/rag_config.py` 加 `RagSparseProbeRequest` / `RagSparseProbeResponse`（`Literal["ok","empty","unreachable"]`）+ 端点；`sparse_api_key` 支持掩码哨兵（复用 `_probe_api_key` 的语义，环境名走 `_secret_env_name("sparse_api_key", …)`）；`asyncio.wait_for(..., _PROBE_TIMEOUT_SECONDS)`；`detail` 走 `_probe_detail`。
- [x] **neuter 两条**：① 把 `empty` 归到 `ok` ⇒ 用例 2 红；② 把「形状/条数不符」也报成 `ok` ⇒ 一条红（新增的形状用例）。
- [x] **门禁**：`ruff check` / `ruff format --check` 干净；窄面（新文件 + `test_rag_config_probe.py` + `test_rag_config_api.py`）绿；**全量后端**（后台跑）。

## Task 2 — 前端：接口地址一行上的连通状态（D4）

**状态：已交付 2026-09-17。**

**交付纪要**

- **纯函数 3 个**（`config-form.ts`）：`shouldProbeSparseService`（来源必须是 external、provider 非空、地址非空——另两条来源不出网，空地址只会报一个已知事实）、`sparseServiceProbeKey(values, hasKey)`（`provider|address|key|nokey`：**加一把密钥能改变答案**，所以它也是问句的一部分）、`sparseServiceVerdictFor`（键不符 ⇒ 无结论）。
- **wire + hook**：`types.ts` 加请求/响应类型；`api.ts` 加 `probeSparseService`；`hooks.ts` 加 `useProbeSparseService`（入参带 key、出参 `{key, status}`、不 invalidate、不 toast——与能力探针同一条契约）。
- **界面**：状态**骑在 `接口地址` 那个输入框里**（右对齐、`data-slot="sparse-service-status"`），`pr-24` **常驻预留** ⇒ 出现/消失都不改布局、也不让可见地址重排；两态文案「连不上」/「没返回词项」（都不拦保存）。
- **用例 11 条**：纯函数 3 条（触发条件 / 键的构成 / 结论绑定）+ dom 8 条（发一次且请求体正确、空地址不发、来源不是 external 不发、`unreachable` 警告且 **Save 可点**、`empty` 是**另一种**警告、`ok` 无话、地址变了就丢结论、状态在字段内）。
- **两次 neuter 都有牙**：① 关掉触发 ⇒ "地址填了就发"红；② 去掉键校验 ⇒ "地址变了丢结论"红。
- **实现期踩到两处测试自身的问题**（不是产品缺陷，但值得记）：① `openAdvanced` 定义在上一个 describe 里 ⇒ 新 describe 引用不到（`ReferenceError`），补了一个同名局部 helper；② **状态 stub 被 `withExternal()` 里的 `setRag()` 重置** ⇒ 5 条状态用例全红，改成"先 seed、再 set 状态 stub"（与能力探针那组同一个顺序陷阱）。
- **格式**：prettier 逐文件与 HEAD 同数（11 个文件）；`eslint` 干净；`tsc` 仅宠物线那条既有红。

- [x] **RED**：`frontend/tests/unit/rag/config-form.test.ts` 加纯函数用例（键的构成与绑定）；`tests/unit/settings/functional-models.dom.test.tsx` 加：
  1. 来源 `external` + 地址非空 ⇒ 发一次探测（断言请求体含 provider 与 base_url）；
  2. **地址为空 ⇒ 不发**；
  3. `unreachable` ⇒ 该行给出警告、**Save 不被拦**（可保存）；
  4. `ok` ⇒ 该行无话；`empty` ⇒ 该行给出（另一种）警告且不拦；
  5. **结构**：状态在 `接口地址` 的字段内（`closest('[data-slot=…]')`）。
- [x] **GREEN**：`types.ts`（`RagSparseProbeRequest/Response`）、`api.ts`（`probeSparseService`）、`hooks.ts`（`useProbeSparseService`，结论带键）、`config-form.ts`（键函数）、`functional-models-view.tsx`（触发 + `trailing` 状态，落在**接口地址**那一行的输入框上）、i18n 三处（检测中… 复用 / 「稀疏服务未连通」/「稀疏服务没给出词项」）。
- [x] **neuter**：撤掉这条探测的触发 ⇒ 用例 1 红；把 `unreachable` 也算成拦 ⇒ 用例 3 红。
- [x] **门禁**：`eslint` + `tsc`（仅宠物线既有红）+ prettier 与 HEAD 同数 + **全量前端**。

## Task 3 — 文档同步与真栈

**状态：已交付 2026-09-17。**

**交付纪要 —— 文档**

- `backend/AGENTS.md`（RAG 配置一节，**纯新增 12 行**）：新端点与它的每一条（只读不落盘、不回显密钥、同一个 10s、三态、`empty` 为什么单独成态、非 allowlist/空 id ⇒ 422、**直接调 allowlist 的 encoder 而不走 `build_embedder`** 及理由、**只报不拦**）。
- `frontend/AGENTS.md`（功能模型一节）：状态骑在**接口地址字段**内、三态里两态是警告且**都不拦保存**、触发条件（来源 external + 地址非空，防抖，按 `provider|address|has-key` 只探一次）、key 的判据（存过或环境提供）。
- 两份都按 prettier 口径核过：worktree 与 HEAD 的比对数字相同（backend 282 / frontend 16）⇒ 零新增格式债。

**交付纪要 —— 真栈（`:3000` 前端 + `:8001` 网关）**

1. **地址指向死端口**（`http://127.0.0.1:8199`）⇒ `接口地址` 字段内出现「**连不上**」，而**Save 仍可点**（探针只报不拦）。
2. **地址指向一个真的 TEI 形状桩**（本机 `127.0.0.1:8124`，`POST /embed_sparse` → `[[{index,value}]]`，一次性脚本跑完即删）⇒ 标记**消失**（`ok`）。
3. **两条真实 HTTP 响应**（从页面直接打线上端点）：
   - 死端口 ⇒ `{"status": "unreachable", "detail": "未能连通（EmbedderError）：sparse service request failed: All connection attempts failed"}`；
   - 活桩 ⇒ `{"status": "ok", "detail": "稀疏服务已连通，并返回了词项。"}`。
4. **全程未保存**：`GET /api/rag/config` 复核落盘值仍是 `embedding_sparse_source=provider` / `sparse_base_url=null`，`rag_config.json` md5 **`15fa768a…` 与动手前逐字节相同**（这一整条腿用的都是**表单候选值**——探针的请求体带候选，所以不需要改配置）。桩进程已杀、脚本已删、浏览器里被我改过的表单已重载丢弃。
5. **一处过程记录**：这段开工时 `:3000` 前端 dev server 已停（用户在跑的用户进程，我不重启），真栈腿因此等用户起回前端后才跑；`:8001` 网关当时仍在跑，且**已加载新端点**（用 `openapi.json` 核过）。

- [x] `backend/AGENTS.md`：RAG 配置一节补新端点（形状、三态、只读、**只报不拦**、422 条件）。
- [x] `frontend/AGENTS.md`：功能模型一节补这条探针（落在接口地址行、触发条件、三态语义、只报不拦）。
- [x] 真栈：① 地址指向一个**不存在的端口** ⇒ 编辑期出现「未连通」且 Save 仍可点；② 地址指向一个**真的 TEI 形状桩** ⇒ 状态转为正常（无话）；③ 全程**未保存**，`rag_config.json` 逐字节复核。
- [x] **门禁**：文档过 prettier；`rag_config.json` md5 不变。

---

## 交付后补的两条修正（2026-09-17，用户审「稀疏服务的提供商只有 TEI 吗」时发现）

**① 空值选项的标签是从别处借的**：`稀疏服务提供方` 那个下拉里有一项写「（由服务决定）」——那是 `PROVIDER_LABELS[""]` 从**解析后端**那一行借来的措辞（MinerU 那行确实是"由服务决定"）。在这条腿上它没有那个语义：空值就是"**未选择**"，而且运行期**直接拒绝**（`external` 需要具体的 `sparse_provider`）。⇒ 给这行自己的标签表，空值显示 **「（未选择）」**（`sparseProviderNone`；解析后端那行不动）。

**② 「独立稀疏服务」+ 未选提供商：编辑期不提示、Save 还能点**，要等保存时那次 400（`需要 rag_sparse_provider`）才知道。这与本线一直在治的"配错了要等下一步"是同一类 ⇒ 新增纯函数 `isSparseServiceUnconfigured`，并把它**并进既有的那套表现**（卡底 `role="alert"` + Save 旁同一句 + Save 禁用），两句原因合成一个 `sparseBlockReason`（dense-only 那句 / 未选提供商那句，各说各的事实）。

**一个只有实测才会发现的细节**：这一对状态**没法通过 API 造出来**——`PUT` 会被保存期校验直接拒（400），所以它只存在于两种情形：**UI 上未保存的编辑**，或**手改过的 `rag_config.json`**。这正是 D2（编辑期拦下）要覆盖的两种，也说明这条修正落在正确的一层。

**用例**：纯函数 2 条；dom 3 条（告警 + Save 被挡 + Save 旁同一句、选了提供商后放行、空值那项的措辞走 trigger 镜像值断言）。**tsc 当场逼出一处测试自身的错**：wire 侧的"未声明"是 `null`（`sparse_provider?: "tei-sparse" | null`），seed 写成 `""` 直接编译不过——表单把它折成 `""` 给 Radix，两回事。**两次 neuter 都有牙**：去掉 provider 判据 ⇒ 3 红；去掉 Save 的禁用项 ⇒ 1 红。

**门禁**：`eslint` 干净、`tsc` 仅宠物线既有红、prettier 与 HEAD 同数（5 个文件）、**全量前端 238 文件 / 2535 用例 / 0 失败**（+5 = 本轮）。

**一处诚实记录**：这条的**实机查看没做成**——内嵌浏览器的 surface 在中途变成 0x0（CDP 指针动作被拒，`pointerdown` 能展开列表但选不中），而这一对状态又**没法用 PUT 造**（见上）⇒ 只做到用例层；复现路径已交给用户：设置 → 功能模型 → 高级设置 → 稀疏向量来源选「独立稀疏服务」、提供商保持「（未选择）」。

---

## 交付后顺带修掉的一个真缺陷（每模型的批次上限，2026-09-17）

**怎么发现的**：用户问"百炼有稀疏向量模型吗"，查官方文档时发现**每模型的行数上限不一样**，而我们客户端**硬编码 20**（`embedder.py` 旧常量，注释还写着"百炼文档"）。用同一把密钥直连平台实测（不打印密钥）：

| 模型                     | 10 行 | 20 行                                                             |
| ------------------------ | ----- | ----------------------------------------------------------------- |
| `qwen3.7-text-embedding` | 200   | **200**（上限 20）                                                |
| `text-embedding-v3`      | 200   | **400** `batch size is invalid, it should not be larger than 10.` |
| `text-embedding-v4`      | 200   | **400** 同上                                                      |

**后果**：把向量模型配成 v3/v4 后，**任何切出 ≥11 片的文档**都会被分批成"第一批 20 行"从而整批被拒；摄入侧按批兜住（`index_chunks` 每批 try/except + `continue`），所以表现是**那 20 片标 `failed`、后一批照常入库**，而向量腿只要有一片成功就报 `done`（`worker.py:326`）⇒ **静默降级**。当前部署用 `qwen3.7-text-embedding`（上限 20）所以未暴露。

**采用的设计（用户提的，我赞同并给了理由）**：**默认取安全值 10，只给"已探明能吃更多"的模型开例外**。

- 关键在**失效方向**：未知模型按保守值走，最坏是"多发几次请求、慢一点"；反过来（默认 20、已知弱的降 10）则会让新模型重演同一个 400。
- 默认值 = **实测见过的最低上限**（今天就是 10），判据写进注释；将来见到更低的就跟着降。
- 表**只升不降**：`DASHSCOPE_BATCH_SIZES = {"qwen3.7-text-embedding": 20}`，未登记一律 10。
- **不做**自适应折半重试（丙）：它要动重试逻辑并定义"折半后再失败怎么办"，而复杂度换来的只是省一张两行的表。

**落点**（只有一处取值逻辑，分批循环**一行未动**）：`embedder.py` 的 `DASHSCOPE_SAFE_BATCH_SIZE` / `DASHSCOPE_BATCH_SIZES` / `dashscope_batch_size(model)`；`DashScopeEmbedder.__init__` 的 `batch_size` 由"常量默认"改成"显式值优先，否则按模型查表"。`test_indexer.py` 里对旧常量的引用随之改成本地显式 20。

**用例 2 条**：① 纯断言（v3/v4 → 10、qwen3.7 → 20、**未登记与 `None` → 10**）；② 行为断言——**25 片在 v3 上必须拆成 10 / 10 / 5 三次请求**（直接钉住"第一批多大"这件事，而不是只钉常量），并断言结果仍是 25 条。**neuter 两条都有牙**：① 未知模型回到 20 ⇒ 两条红；② 一律返回安全值（不查表）⇒ 纯断言红。

**影响面**：只决定入库/重建打几次请求，**不影响正确性，也不影响检索延迟**（查询都是单行）。`backend/AGENTS.md` 的嵌入 provider 段补了一句说明。

**门禁**：`ruff check` / `format --check` 干净；`tests/knowledge/` **1156 passed / 2 skipped**；**全量后端 136 failed / 12370 passed（+2 = 本轮新增），与上一轮 FAILED 集合双向差集为空**（其中 `test_delta_channel_state.py::…randomized_differential` 那一类在整跑里红、单独跑两次都过，两轮都在集合内，与本改动无关）。

---

## 提交切分

| 提交 | 内容                      |
| ---- | ------------------------- |
| 1    | Task 1（端点 + 用例）     |
| 2    | Task 2（界面 + 用例）     |
| 3    | Task 3（文档 + 真栈结论） |

不改表、不改 `rag_config.json` schema、不动任何默认值。
