# 通用腿接口地址去重 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-26-rag-endpoint-dedup-design.md](../specs/2026-09-26-rag-endpoint-dedup-design.md)
**Status:** ✅ **已提交（2026-09-26）** —— `3fd320b8`（docs：spec+plan+真栈证据）+ `085d8dc7`（code：Task 1+2+3 文档句+4，10 文件；不按 Task 拆笔、按文件边界成两笔、`config.example.yaml` 做了文件内切分）；**D1 乙 / D2 乙 / D3（仅 ⓘ）/ D4 甲 / D5 甲** 全裁、Task 0–4 全做完、实测回填（Task 2 的勾选为 2026-09-26 审计后补齐）；门禁 = 后端相关面 **148 passed** + `make lint` 净；前端 `pnpm check` 净（全量不跑、理由注明）；真栈桩腿两腿全过（证据 `pr-build/rag-endpoint-dedup-2026-09-26/`）。**未推送。**

**硬约束**：去重只作用于**两个通用腿**的 URL 拼装（`openai-compatible` 嵌入 / `generic-rerank` 重排）；**不写回存值**、UI 除 ⓘ 两行外不动（示例/必填/探针一律不动）；厂商腿（dashscope 两腿 / volcengine-ark / tei-rerank / tei-sparse / mineru 两腿）与 parse-local 零触碰；**对今天能用的地址拼接结果逐字不变**。

**Global Constraints:** 分支 `feat/rag-knowledge-base`；每 Task RED→GREEN→neuter→门禁；后端 `cd backend && make test`（相关面）+ `make lint`；**前端只改 i18n 两行 ⇒ 跑 `pnpm check`（tsc 抓 zh/en 对称），前端全量不跑**（零断言影响，交付说明里注明）；pytest 的 `--basetemp` 只用既有 `.pytest-tmp`（跑完即删）。

**依赖顺序**：Task 0 → Task 1（纯函数）→ Task 2（两腿接线）→ Task 3（文档 + 真栈 + 门禁）→ Task 4（ⓘ 文案 + example 三行）。

---

## Task 0 — 开工前五项核实（只读）

- [x] 1. 拼接点唯一性：`_EMBEDDINGS_PATH`（`embedder_openai.py:38`）与 `RERANK_PATH`（`reranker_generic.py:40`）的全部使用点——确认各自只有一处拼 URL（`:110` / `:97`），换掉不波及别处。
- [x] 2. **会红断言扫描（预期：零红）**：全仓搜"请求 URL 相等断言"——`test_embedder_providers.py:118`（`OPENAI_BASE = http://127.0.0.1:8080` 主机名 ⇒ 去重后逐字不变）等；`test_reranker_generic.py` 现无 URL 相等断言（本对补）。若扫出 `/v1` 结尾的既有夹具 ⇒ 提前报告（与"零影响"冲突）。
- [x] 3. 非目标名单落地：其它同款短路径腿（`sparse.py:143` `/embed_sparse`、`reranker_tei.py:89`、parse 两腿 `parse_local.py:181/203/216` 的 `/v1/*` 多段）的拼接行逐一点名 ⇒ 确认本对不碰；豁免理由以 spec D2（含 parse-local 第三点）为准。
- [x] 4. `join_endpoint` 落点体检：新模块 `deerflow/knowledge/endpoint_url.py` 的导入关系（`knowledge/__init__.py` 是否 eager-import、有没有环）；空地址不经此函数的事实核对（`OpenAICompatibleEmbedder.__init__:62` 与 `reranker_factory` 的空地址 raise 在前）⇒ **不加空守卫**。
- [x] 5. 真栈桩腿可行性：09-17 save-probe 用过的 OpenAI 形状本机桩配方（1024 维、记请求路径）是否可复用、落点与启动命令 ⇒ Task 3 直接用。

**实测（2026-09-26，五项）**：

- ① ✅ 两常量各 `def+use` 两处（`_EMBEDDINGS_PATH :38/:110`、`RERANK_PATH :40/:97`）；`_base_url` 在各自文件也仅 init 赋值 + 该用点 ⇒ 换掉不波及别处。全仓 `f"{self._base_url}` 共 **13 处**（见 ③）。
- ② ✅ **零红确认**：全仓 `str(request.url)` 共 6 处——本对相关仅 `test_embedder_providers.py:118`（主机名夹具）；另 5 处 = sparse 腿（`test_sparse_backfill.py:112`）+ VLM chat 腿 ×4（`test_vlm_target.py:156/172/215/332`），都不经本对拼接。**⚠️ 提前报告命中**：`test_rag_config_save_probe.py` 有 4 处 `/v1` 结尾夹具（`:47/:56/:183/:351`）——**不冲突**：均属"存值/响应逐字"用途（`:351` 正是 D3「不写回」的现成钉子，去重后仍逐字 `…/v1` ✓），且该文件无请求路径断言、探针走 MockTransport 不看路径 ⇒ 去重后仍全绿。
- ③ ✅ 13 处拼接点全点名：**本对 2**（`embedder_openai.py:110` / `reranker_generic.py:97`）；**厂商腿 5**（`embedder.py:223` dashscope 嵌入 / `embedder_ark.py:114` / `reranker.py:97` dashscope 重排 / `reranker_tei.py:89` / `sparse.py:143`）；**parse-local 6**（`parse_local.py:181/203/216/225/244` 为固定段——spec D2 已按实测补点位；`:195` 拼服务返回的相对路径、不属同类）。
- ④ ✅ `knowledge/__init__.py` **只有 docstring、零 import** ⇒ 无 eager-import、无环风险；空地址：`OpenAICompatibleEmbedder.__init__:62` 先 raise、`reranker_factory` 构造前 raise（09-25）⇒ 空地址到不了 `join_endpoint`，**不加空守卫成立**（`reranker_generic.__init__` 自身无守卫，但工厂在前）。
- ⑤ ✅ 桩先例 = `pr-build/mineru-4x-smoke-2026-09-24/task5/serve_fixture.py`（一次性本机 HTTP 桩、跑完即删）；配方 = `http.server` 自定义 handler：OpenAI 形状 1024 维（照 `test_rag_config_save_probe.py:121 _openai_body`）+ 记录请求路径 ⇒ Task 3 照写。

---

## Task 1 — 新纯函数 `join_endpoint` + 单元用例

> 动到的文件：**新增** `backend/packages/harness/deerflow/knowledge/endpoint_url.py`、**新增** `backend/tests/knowledge/test_endpoint_url.py`。**验收对应**：spec §4 的 1。

- [x] **RED**：先写断言、函数尚不存在（收集失败即红）。三分支 × 两种 path 形态，预期 URL 逐字写死：
  - `path="/v1/embeddings"`：`https://host` ⇒ `https://host/v1/embeddings`；`https://host/v1` ⇒ `https://host/v1/embeddings`（**不重复 `/v1`**）；`https://host/v1/embeddings` ⇒ 原样；`https://host/v1/`（尾斜杠）⇒ 同第二行；`https://host/compatible-mode/v1` ⇒ `…/compatible-mode/v1/embeddings`；`https://host/api` ⇒ `…/api/v1/embeddings`。
  - `path="/rerank"`：`https://host` ⇒ `https://host/rerank`；`https://host/v1` ⇒ `https://host/v1/rerank`（与今天逐字相同）；`https://host/rerank` ⇒ 原样。
- [x] **GREEN**：`join_endpoint(base_url, path)` = 去尾斜杠 → 分支 2（`path` 以 `/v1/` 开头且 base 以 `/v1` 结尾 ⇒ `path` 截掉那节 `/v1`）→ 分支 1（base 已以（可能已截短的）`path` 结尾 ⇒ 原样返回）→ 分支 3（拼接）。docstring 记三分支与 spec 出处。
- [x] **neuter**：① 删分支 2 ⇒ 生态 base 两条红、其余绿；② 删分支 1 ⇒ 整端点两条红；**受害者不相交**，如实记粒度。
- [x] **还原证明** + 新文件 `make lint` 净（ruff）。

**实测（2026-09-26，Task 1）**：RED **1 error（收集失败：模块不存在）** → GREEN **4/4** → neuter ①（`if False and …` 拆分支 2）**仅 `test_ecosystem_base_with_v1_is_not_doubled` 红** / neuter ②（拆分支 1）**仅 `test_whole_endpoint_is_kept_as_is` 红** ⇒ **受害者不相交** ✓ → 还原 4/4。ruff：`check` 净；`format --check` 报测试文件待重排 ⇒ `ruff format` 两新文件（新文件、无历史债）后复跑 4/4。文件：`packages/harness/deerflow/knowledge/endpoint_url.py`、`tests/knowledge/test_endpoint_url.py`。

---

## Task 2 — 两腿接线 + 生态 base 钉子

> 动到的文件：`embedder_openai.py:110`、`reranker_generic.py:97` + `test_embedder_providers.py` / `test_reranker_generic.py` 各补钉子。**验收对应**：spec §4 的 2/3/5/6。

- [x] **RED**：两腿各补一条"照文档填也能打对"的钉子——嵌入：夹具地址 `f"{OPENAI_BASE}/v1"` ⇒ 期望 `str(request.url) == f"{OPENAI_BASE}/v1/embeddings"`（此刻拼成 `/v1/v1/embeddings` ⇒ 红）；重排：地址 `…/v1` 与整端点两种形态 ⇒ 期望各自的 URL（整端点此刻拼成 `/rerank/rerank` ⇒ 红）。
- [x] **GREEN**：两处调用点改用 `join_endpoint(self._base_url, <path 常量>)`。
- [x] **neuter**：把嵌入腿改回旧拼接 ⇒ 只有嵌入钉红、重排钉绿；反之亦然（受害者不相交）。
- [x] **回归（零影响证明）**：既有断言**零改动**全绿——点名 `test_embedder_providers.py:118`（主机名夹具 ⇒ 拼接结果逐字不变）；厂商腿（dashscope / ark / tei）用例零改动全绿。
- [x] **门禁**：`make test` 相关面（`tests/knowledge/` 下与两腿/工厂有关的文件 + `test_rag_provider_config.py` 一带）。

**实测（2026-09-26，Task 2；补齐 2026-09-26 他审计发现漏勾）**：

- **RED**：三条新钉首跑 **2 红 / 1 绿**——嵌入"生态 base"红、重排"整端点"红；**重排 `/v1` 本来就是通的（绿）**，与 spec §1 表"本表唯一本来就通的"逐字一致。⚠️ 首跑还暴露一个**测试自身**的搭法：`_openai_embedder` 硬编码 `base_url=OPENAI_BASE` ⇒ 新钉直接构造 `OpenAICompatibleEmbedder` 传入 `f"{OPENAI_BASE}/v1"`。
- **GREEN**：两腿改用 `join_endpoint`（含字母序 import）⇒ 三文件 **37/37**。
- **neuter ①（嵌入腿回退旧拼接）**：**仅嵌入钉红**、重排两钉绿（两文件面 1 failed / 32 passed）⇒ 受害者不相交。
- **neuter ②（重排腿回退）**：**仅"整端点"钉红**（1 failed / 32 passed）。
- **还原证明**：两腿复原 ⇒ 全绿（并入下方的 107 面）。
- **回归（零影响证明）**：既有断言**零改动全绿**——`test_embedder_providers.py:118` 逐字不变 ✓；厂商腿（dashscope / ark / tei）用例零改 ✓；另 `test_rag_config_save_probe.py` 的 4 处 `/v1` 夹具零改全绿（MockTransport 不看路径），印证 Task 0 的"不冲突"判定 ✓。
- **门禁**：更宽回归面 **107 passed**（endpoint_url + embedder_providers + embedder_ark + reranker_generic + reranker_tei + provider_construction_sites + rag_provider_config + save_probe）；Task 3 时并入 `test_rag_config_api.py` 达 **148 passed**；`ruff check` 净。三条钉子按计划落在**两腿各自的既有测试文件**（未另建文件）✓。

---

## Task 3 — 文档 + 真栈桩腿 + 门禁

> 动到的文件：`backend/AGENTS.md`（一句）+ spec/plan 的 Status 回填。**验收对应**：spec §4 的 4/7/8 + §5。

- [x] `backend/AGENTS.md`：embedding provider 段补一句——地址可照生态带 `/v1` 或整端点，与腿固定段重复的那节不会重复拼（spec 2026-09-26）。
- [x] **真栈桩腿**（本机桩、零出网、配置动手前先备份）：嵌入地址 = 桩的 `/v1` 形态 ⇒ 保存期探针**通过**；同一桩换整端点形态 ⇒ 同样通过；**重排腿**（无探针）直接打桩两形态各一次 ⇒ 请求路径 = `/v1/rerank` 与 `/rerank`。
- [x] **对照组（证明桩有区分度）**：临时回退去重 ⇒ 同一地址打到 `/v1/v1/embeddings` ⇒ 探针报错；恢复去重 ⇒ 通过。记录两态。
- [x] spec §4 验收 1–10 逐条对账；§5 非目标零触碰（`git diff` 核：厂商腿 / parse-local / 前端 ⓘ 以外零改动）。
- [x] 门禁全跑；spec/plan Status 回填；**不提交**——把改动清单摊给他，等指令。

**实测（2026-09-26，Task 3）**：

- **AGENTS.md**：一句已落，且**顺带修正一处 09-25 漏网**——`:1184` 整段仍写着旧行为（"`build_embedder` falls back to `default_endpoint`…the settings UI shows the field read-only…locked row offers to drop an override" + "rerank row still decides its lock from a hardcoded provider id"）⇒ 已改实（必填/无回落/永远可编辑/仅作灰字占位；顺带删掉已过期的 rerank-lock 句）。
- **真栈桩腿（本机一次性桩，零出网；证据目录 `pr-build/rag-endpoint-dedup-2026-09-26/`：`serve_stub.py` + `drive.py` + `results.json` + `requests.log` + `notes.md`）**：
  - 探针（**未经修改**的 `_probe_after_save`）· 生态 base ⇒ `warning=null`（**已验证**）；整端点 ⇒ `warning=null`；对照组（旧拼接产物 `…/v1/v1`）⇒ warning = `未能连通（EmbedderError）：embedding endpoint HTTP 404`。
  - 重排直连两形态 ⇒ pairs `[[0,0.9]]`。桩日志五条逐字：`/v1/embeddings` ×2、`/v1/v1/embeddings`（404）、`/v1/rerank`、`/rerank`。
  - ⚠️ 首跑插曲：桩只服务 `/v1/rerank`、重排整端点那发被桩 404（**桩的缺口非产品缺陷**）⇒ 补服务裸 `/rerank` 后全过；另有一次"两桩同绑 8137"（Windows `allow_reuse_address`）⇒ 停净重起单实例。均原样记。
- **§4 对账**：1✓（单测三分支）2✓（`:118` 零改）3✓（重排 `/v1` 逐字 + 整端点从坏变好）4✓（`test_rag_config_save_probe.py:351` 零改=存值不写回）5✓（dashscope/ark/tei 用例零改）6✓（空地址用例零改）8✓（真栈腿）；9/10 见 Task 4。
- **门禁**：后端相关面九文件 **148 passed**；`make lint` 净（check + format 1298 文件）。

---

## Task 4 — ⓘ 文案 + `config.example.yaml` 三行（D4 甲 / D5 甲）

> 动到的文件：`locales/{zh-CN,en-US}.ts` 各一行、`config.example.yaml` 三行。**验收对应**：spec §4 的 9/10。**无 RED/neuter**（值级改动、零断言）——按 4e 先例只做"零断言实证 + 门禁"。

- [x] **ⓘ 文案**：按 spec §1.1 a 两列照改（zh `zh-CN.ts:1695` / en `en-US.ts:1789`）；**零断言实证**（`grep retrievalEndpointHint frontend/tests` = 0 命中）+ `pnpm check`（tsc 抓 zh/en 对称与 key 类型）。
- [x] **example 三行**：按 spec §1.1 b 照改（`:2595/:2596/:2603`）；纯注释。
- [x] spec/plan Status 回填；**不提交**。

**实测（2026-09-26，Task 4）**：

- ⓘ 两行照改——**一处微偏差如实记**：spec「改成」列里的反引号是 markdown 强调，落进 UI 字符串会显示**字面反引号** ⇒ 实现去掉反引号、其余逐字相同（若你想要字面反引号，说一声回放）。
- 零断言实证 ✓（`retrievalEndpointHint` 在 `frontend/tests` 0 命中）；`pnpm check`（eslint + tsc）**净**；前端全量不跑（理由=仅 i18n 值改动、零断言）。
- example 三行照改（`:2595` 补 `volcengine-ark` / `:2596` 改 "endpoint; required (no provider fallback)" / `:2603` 补 `tei-rerank`）；纯注释、零行为。
- 另：收尾清掉 `.pytest-tmp`（basetemp 跑完即删）。