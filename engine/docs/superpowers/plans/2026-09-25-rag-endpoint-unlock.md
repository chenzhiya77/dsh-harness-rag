# 功能模型「接口地址」解锁 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-25-rag-endpoint-unlock-design.md](../specs/2026-09-25-rag-endpoint-unlock-design.md)
**Status:** 🟡 **实现完成（2026-09-25）、hold 提交** —— 裁定清零：**D1 乙 / D2 乙 / D3 必填**；Task 0–3 全做完、实测回填；门禁 = 前端全量 **2628 例 / 0 失败** + 后端相关面 **141/141** + `pnpm check` 净 + 真浏览器只读验过。⚠️ **hold 提交**（他 2026-09-25 明令"先不要提交"，等他验过发话）。

**硬约束**：两格 endpoint 行永远可编辑、无「恢复默认」、占位=能力块 `default_endpoint`（无则 `https://api.example.com/v1`）、必填（前端禁用+原因 / 后端 PUT 报错）、**运行期回落删除**（空=报错）；**LockedBox 组件保留**、稀疏/解析行的锁与 `has_fixed_endpoint`/`default_endpoint` 能力块不动；旧 spec（09-17 alignment）冻结不改。

**Global Constraints:** 分支 `feat/rag-knowledge-base`；每 Task RED→GREEN→neuter→门禁（**不 commit**）；前端 `cd frontend && PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py …`，后端 `cd backend && make test`（相关面）；用例只钉结构/报错文本，几何归真浏览器。

**依赖顺序**：Task 0 → Task 1（前端）→ Task 2（后端）→ Task 3（验收 + 门禁，hold）。

---

## Task 0 — 开工前六项核实（只读）

- [x] 1. `resetToDefault` i18n key 的消费点全清单（除 endpoint 两行外还有谁用 ⇒ 决定 key 删否）。
- [x] 2. `resolveEndpointRow` / `resolveFixedEndpointRow` / `resolveRerankEndpointRow` 的全部调用点与返回字段消费（locked / overridden / shown 各谁在读）。
- [x] 3. `reranker_factory.py` 的 dashscope 内建回落形态（`:36-39` 后半怎么走内建）与报错句的既有断言清单。
- [x] 4. PUT `put_rag_config`（`rag_config.py:382` 起）的校验链现状（`:322` 清单是什么、400"配置仍不可用"由谁抛）⇒ 决定必填校验插哪层。
- [x] 5. 会红断言扫描：`functional-models-view.dom` / `settings/functional-models.dom` 里钉 locked 行 / 恢复默认 / 占位的用例（alignment 线的"留空保存 400"、"恢复默认"真栈腿对应单测在哪）。
- [x] 6. `has_fixed_endpoint` 除锁/回落外还有没有别的消费（探针/文案）⇒ 确认能力块保留不误伤。

**实测（2026-09-25，六项）**：

- ① ✅ `resetToDefault` 消费 = **仅 endpoint 两行**（`functional-models-view.tsx:748/:774`）+ i18n 三文件 + **测试 2 处**（`functional-models.dom.test.tsx:753/:821` `queryByRole` 钉按钮存在性 ⇒ 会红）⇒ **key 删（三文件）**、两断言改钉"永远无该按钮"。
- ② ✅ resolver 调用点 `functional-models-view.tsx:411/:415`，消费 `shown/overridden/locked`；`tests/unit/rag/config-form.test.ts:926-980+` 一组 `toEqual(结构)` 断言 ⇒ 收窄后必红（按新形态改/删，RED 期精确记受害者）。
- ③ ✅ **重排"内建回落"的真实形态** = dashscope 且地址空时**不传 `base_url`**（`:36-45`：`endpoint = rerank_base_url or None`，None 且非 dashscope 才 raise，`endpoint is not None` 才注入）⇒ 让实现自带端点生效。报错句 "only `dashscope` has a built-in endpoint" 在 tests **0 命中** ⇒ 改句零断言债。
- ④ ✅ 400「提交后的配置仍不可用」= 保存期探针/构建失败的包装（`rag_config.py:315/:363`）；`_WATCHED_EMBEDDING_FIELDS`（`:322`）是"六字段变了才探"清单、与必填无关 ⇒ **必填校验插 `put_rag_config` 入口（body 校验层）**。
- ⑤ ✅ 会红清单（前端）：`functional-models-view.dom` "shows a provider-fixed endpoint locked" 整条（含 `labelCount("embeddingBaseUrl")).toBe(0)`）＋ `functional-models.dom:753/:821` ＋ `config-form.test:926+`；（后端）工厂回落断言在 `test_embedder_providers.py` / `test_provider_construction_sites.py` / `test_reranker_generic.py` 一带（RED 期精确记）；`test_embedder_ark.py:14-17` 头注释是散文（改注释不改断言）。
- ⑥ ✅ `has_fixed_endpoint` 消费 = `config-form.ts:435`（locked 判定，本对删）+ types + `rag_config.py` OPTIONS schema（保留）+ `providers/__init__.py`（保留）⇒ **能力块保留不误伤**。

---

## Task 1 — 前端：解锁 + 删恢复默认 + 占位 + 必填守卫

> 动到的文件：`functional-models-view.tsx`、`core/rag/config-form.ts`、dom 用例（+3~4 条）。**验收对应**：spec §4 的 1/2/3/4（前端半）/7。

- [x] **RED**：① 两格 endpoint 行 = 可编辑 Input（`getByLabelText(F.embeddingBaseUrl / F.rerankBaseUrl)` 存在）且格内无 `resetToDefault` 文本；② 空值占位 = provider 的 `default_endpoint`（dashscope 夹具）/ `https://api.example.com/v1`（openai-compatible 夹具）；③ 任一为空 ⇒ Save 禁用 + 原因。此刻未改 ⇒ 红。
- [x] **GREEN**：endpoint 两行永远 `Input`（删 LockedBox 该两腿、删恢复默认按钮与 `resetToDefault` 消费）；占位接能力块；`config-form.ts` resolver 收窄为"取 default_endpoint"；Save 必填守卫接 `sparseBlockReason` 同款槽位。
- [x] **neuter ①/②/③**：拆各断言对应实现 ⇒ 分别红、其余绿（受害者不相交，如实记粒度）。
- [x] **还原证明** + 触碰面全绿 + `pnpm check` 净 + prettier 只动自己行。

**实测（2026-09-25，Task 1）**：RED **7 红 / 58 绿**（新钉）→ GREEN **161/161** → neuter ①（拆 aria-label）**6 红**＝label 钉全集 / ②（拆占位）**4 红**＝占位钉全集 / ③（守卫置 null）**1 红**＝必填钉独占 → 还原 161/161 + `pnpm check` 净（清掉 2 个删码孤儿：`RagRerankProviderCapability` import、test 的 `form` 助手）。**夹具受害者**：`view()` 播种两地址（⚠️ 教训：播种必须放**构造器**而不是 setRag——探针 key 含 base_url，两处不一致会让 verdict 对不上号）；3 条旧语义钉改钉（locked 行→"永远可编辑/无恢复默认/占位"；"labels a provider-fixed endpoint as locked"→"解锁只限 endpoint 行"）；`config-form.test` 的 resolver 结构钉收编为 `endpointPlaceholderFor` 钉。**i18n**：删 `resetToDefault`/`lockedByProvider`、加 `endpointRequired`（三文件）；LockedBox 修剪（reset props 死代码）。`resolveFixedEndpointRow`/`resolveRerankEndpointRow`/`FixedEndpointRow` 退役。

---

## Task 2 — 后端：必填校验 + 回落删除

> 动到的文件：`app/gateway/routers/rag_config.py`（PUT 必填）、`knowledge/embedder_factory.py:161`、`knowledge/reranker_factory.py:36-39` + 后端用例。**验收对应**：spec §4 的 4（后端半）/5/6。

- [x] **RED**：① PUT 缺 `embedding_base_url` ⇒ 可读错误；② PUT 缺 `rerank_base_url` ⇒ 可读错误；③ 嵌入工厂空地址**报错**（不回落 `spec.default_endpoint`）；④ 重排工厂空地址报错且错误句不含 "built-in endpoint"。此刻未改 ⇒ 红（现状：①②能存、③回落、④句含 built-in）。
- [x] **GREEN**：PUT 必填校验（两格、不看 `has_fixed_endpoint`）；`embedder_factory` 删 `or spec.default_endpoint`；`reranker_factory` 删 dashscope 内建回落、错误句改统一文案。
- [x] **neuter**：逐条拆 ⇒ 各自红；**还原证明**：既有"存量地址优先"用例零改动全绿（spec §4 6）。
- [x] **门禁**：`make test` 相关面（knowledge 相关用例文件）+ 全量视时间跑。

**实测（2026-09-25，Task 2）**：RED **4 红**（⚠️ 首跑③"假绿"：本机默认 provider=`openai-compatible`（无回落 ⇒ 早抛）——夹具必须点名 `dashscope` 才测到回落；⚠️ 两条 PUT 首跑 ERROR＝`Temp\pytest-of-h7242` 拒访环境病 ⇒ `--basetemp` 仓外 `.pytest-tmp` 后成立）→ GREEN **4/4**（**必填校验免费到位**：PUT 本有无条件 `_reject_unusable_after_save`（构造两条腿）⇒ 工厂一改即 400 可读）→ **受害者 27→0**：api harness `_EndpointSeededClient` 播种两地址（显式 `""` 不覆盖＝"故意置空"语义）、save_probe 播 `YAML_RAG` 两地址、ark/providers 三夹具补地址（ark 对照用例"无地址仍拒收"曾被我 allow_multiple 误伤、已回滚）、2 条精确内容断言随播种更新、2 条拒收用例显式 `rerank_base_url:""`（否则另一条腿先炸、报错指错对象）→ 九文件 **141/141** → neuter ③（回植 `or spec.default_endpoint`）仅嵌入钉红 / ④（回植 dashscope 例外）仅重排钉红 → 还原。

---

## Task 3 — 验收 + 门禁（hold 提交）

- [x] 真浏览器两态（宽/窄 iframe + 主窗）：两格可编辑、无「恢复默认」、占位正确（dashscope ⇒ 厂商默认灰字）、清空后 Save 禁用带原因。
- [x] spec §4 验收 1–8 逐条对账；§5 非目标零触碰（`git diff` 核）。
- [x] 前端全量 + 后端相关面门禁；spec/plan Status 回填。
- [x] **不提交**——把改动清单摊给他，等指令。

**实测（2026-09-25，Task 3）**：前端全量 **2628 例 / 0 失败**；后端相关面（九文件）**141/141**；真浏览器（隐藏 iframe 1200，只读）：两格 `disabled:false` 可编辑、存量值照显（dashscope 兼容面 / api.jina.ai）、**恢复默认按钮 0**、「由提供方固定」0、占位 = `https://api.example.com/v1`（他当前 provider 无厂商默认 ⇒ D2 乙第二分支正确；厂商默认占位分支由单测 dashscope 夹具钉）、Save 未改动时禁用 ✓。验收 1–8 对账：1✓2✓3✓（占位两分支）4✓（前端守卫+后端 400）5✓（工厂报错 ×2、句无 built-in）6✓（存量优先用例零改全绿）7✓（稀疏/解析锁用例零改）8✓。
