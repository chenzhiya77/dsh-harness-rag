# RAG 的两个无字段角色：百科生成与考题合成 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 每个 Task 走完 RED → GREEN → neuter → revert proof → 门禁 再进下一个；「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-09-26-rag-wiki-synthesis-model-design.md](../specs/2026-09-26-rag-wiki-synthesis-model-design.md)
**Status:** **2026-09-29 已交付**：Task 0–5 全部完成，复选框 **36／36**。五项裁定全部落定（①甲 ②两行分别进既有「图谱抽取」「评测裁判」 ③乙 ④甲 ⑤甲）；实施提交 `7d517757`（Task 1 后端）／`7ba229eb`（Task 2 前端）／`9ffae7c3`（Task 3 模板与文档），Task 4 真栈验收与 Task 5 交付回写另成一笔文档提交（均未推送）。真栈阶段未读改任何用户模型条目，`rag_config.json` 已逐字节还原（见 Task 4 实测）。
**2026-09-28／29 更正与裁定：** 门 A（[2026-09-23 那一对](../specs/2026-09-23-default-model-design.md)）**已于 2026-09-27 全部交付**（plan 82/82，`bfed5529` → `305f4fa2`）⇒ 本计划起草时「门 A 尚未落地」的前提失效：`rag.default_model` 与 `knowledge/model_target.py` 已在 HEAD，本对是**在它之上**再加两个字段。字段真名是 **`default_model`**（不是本文原写的 `default_model_name`）。同日的三项裁定：

- **第二步：spec §6.1 ④＝甲** —— 本对一并接 `rag.default_model`，兜底链为 `wiki_model → rag.default_model → models[0]`，三个调用点走既有 `require_usable_rag_target()`（spec D4）。
- **第三步：spec §6.1 ③＝乙（惰性化进本对）** —— worker 那条腿**不再用启动期实例**：`_maybe_generate_wiki` 每次触发时现解析，`app.py` 的 boot 建模型与它那条 `except` 一并退场；`main_llm` 构造参数保留作测试注入口，**因此 4 个既有 `main_llm=` 调用点不用改**（spec D3）。**这是本对唯一与"字段是否声明"无关的行为变化** —— 硬约束第一条据此收窄。
- **第四步（2026-09-29）：①＝甲、②＝两行并入既有分组、⑤＝甲** —— ①（字段名）与 ⑤（保存期检查扩到六个字段）照推荐落；**② 不新开卡片**：百科那行进既有「图谱抽取」、考题那行进既有「评测裁判」（spec D5，i18n 因此是**六个键**而非八个）。据此本计划改了：Status（含本条）、相关基线、Architecture、范围与交接表、待裁段、硬约束、Task 0 的 golden 基线与碰撞面、**Task 1 的文件行与三条 RED／GREEN／neuter ＋ 新增的保存期检查一条**、**Task 2 的标题／界面结构 RED／GREEN／neuter**、**Task 2 的 hint 文案与 neuter ④**、**Task 4 的腿二与新增腿六**、Task 5 的待裁条数。
- **第五步（2026-09-29，按实码复核十处）**：逐条对 HEAD `4bec69b4` 核过后落的十处 —— Task 3 的示例断言收窄（1）、⑤甲 的落点写符号（2）、三处行号漂移（3）、`config_version` 升 40（4）、`_registered_additions` 补记（5）、`AGENTS.md` 实为三处（6）、`main_llm` 只作测试注入（7）、⑤甲 只动一处检查（8）、`synthesize_for_docs` 复数（9）、`app.py` 局部 import 同批删（10）。**行号约定：本计划行号截至 HEAD `4bec69b4`，实施前按符号重读、不以行号代替。** **五项全部已裁，本计划不再有待裁项。**
**相关基线:** [RAG 功能模型配置](../specs/2026-09-10-rag-functional-model-config-design.md)（`extract_model` / `judge_model` 的条目选择器形状，本对逐字照抄）、[发布前写死项盘点](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 1」＝本对（A-7 + A-8）。**门 A**＝[2026-09-23 RAG 默认模型](../specs/2026-09-23-default-model-design.md)（**已交付**），碰撞面与随之而来的更正见 spec §5.2。

**Architecture:** `rag_config.json → RagConfigFile → merge_rag_config → AppConfig.rag`；两个新字段 `wiki_model` / `synthesis_model` 挂在 `RagConfig` 与 `RagConfigFile` 两层，三个调用点（`wiki/generator.py::_default_llm`、`worker.py::_maybe_generate_wiki`、`eval/synthesis.py::_default_llm_factory`）各自**每次现取配置**、经 `require_usable_rag_target()` 取明确名字后交给未修改的 `create_chat_model()`。`app.py` 的 boot 段（实测 `:347` import / `:350-354` try-except / `:355` 的 `main_llm=` 实参）退场（spec D3）。响应侧不需要改 router 的**响应生成**：`_build_response` 反射 `RagConfigFile.model_fields`，所以 golden 必须与字段同批更新（`:316` 的保存期检查是另一回事，⑤＝甲 只加两个字段名）。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 / D2 | 两层字段 + 三个调用点接线，**并接上 `rag.default_model`**（spec D4，2026-09-28 裁定甲） | 改 `models/factory.py` |
| D3 | **worker 腿惰性化（③ 已裁乙）**：`_maybe_generate_wiki` 每次现解析、与手动腿同一条路；`app.py` 的 boot 注入退场；`main_llm` 参数保留作测试注入口（4 个既有调用点不改） | 新增"自动生成不可用"的显式开关或其他配置项；重跑历史百科的入口 |
| D4 | **已裁甲**：`wiki_model → rag.default_model → models[0]`，三个调用点走既有 `require_usable_rag_target()` | 改 `knowledge/model_target.py` 本身（只消费它）；保存期字段表（spec §6.1 **⑤**） |
| D5 | **两行分别并入既有分组**（「图谱抽取」＋「评测裁判」，② 已裁）：不新开卡片、不改卡片标题与卡片 ⓘ；行内 ⓘ 讲各自角色 | 为这两个角色新开卡片；视觉能力过滤；改动既有卡片标题与卡片 ⓘ |
| D6 / D7 | golden 同批（**按已交付门 A 的现行键集重算增量**）；前端四个触点全改 | 改 `_build_response` 的反射逻辑 |
| D8 | 错名字沿用运行期 `ValueError`；**保存期并入既有检查、字段表由四个扩到六个**（⑤＝甲） | 造第二套校验或第二套异常／文案 |

**待裁：无。**①（字段名）＝甲、②（界面分组）＝两行分别进既有两组、③（D3 的不对称）＝乙（惰性化进本对）、④（要不要一并接 `rag.default_model`）＝甲、⑤（保存期检查的字段数）＝甲 —— 五项全部已裁，落点见 spec D1／D5／D3／D4／D8。**已按此交付（2026-09-29）**。

## 硬约束

- **默认值全部 `None` ⇒ 不声明时"用哪个模型"逐字节不变**。这是本对的"不破坏"保证，任何一条用例都要能证明它（负向对照，不是只测正向）。**唯一例外**：worker 腿的模型生命周期变了（spec D3，③＝乙）—— 它不依赖任何声明，是"没有可用模型时从启动期一条日志＋静默关闭"变成"每次触发各一条日志"，实施时如实登记，不把它算进这条保证。
- **三个调用点同批交付**。只改 `generator.py` 或只改 worker 腿都会造出一个只对一条腿生效的假旋钮（spec D2），那是盘点档 §3.1 判为最危险的一类。
- **golden 与字段同一个提交**。`_build_response` 反射 `RagConfigFile.model_fields`，声明字段即改响应；留到后面的 Task 会让中途全量门禁红。
- **前端四个触点一个都不能漏**：`types.ts` 的 `RagConfigValues`、`config-form.ts` 的表单值类型、`TEXT_FIELDS`、`formValuesFromConfig()`。其中 `TEXT_FIELDS` 是**功能性**的——不进清单 ⇒ `buildRagConfigInput()` 带不回 ⇒ **保存即丢**，正是盘点档 B-1 第四轮查出的 `embedding_dimension` 缺陷。`formValuesFromConfig` 是**显式逐字段映射、不是清单循环**，漏改不报错、只让字段永远显示为空。
- **不改宿主**：`models/factory.py`、`config/models_config.py`、`routers/models.py` 一行不动；`create_chat_model(name=None)` 的行为不变。**`knowledge/worker.py` 与 `app/gateway/app.py` 不在这条之列**（③＝乙）；**`routers/rag_config.py` 也不在** —— ⑤＝甲 只把 `_reject_unusable_role_targets` 的角色字段元组由四个扩到六个（spec D8），响应侧仍靠反射。
- **不新造校验**：错名字沿用今天的运行期 `ValueError`；这两个字段的**运行期**检查由既有 `require_usable_rag_target()` 提供（spec D4），**保存期**并入 D10.1 已有的那道检查、复用同一套 `RagConfigurationError` 与文案（⑤＝甲，spec D8）—— 不造第二套异常、不写第二份文案。
- **不增加出网**：改选／保存这两个字段不触发任何探针、SDK 构造或鉴权请求；`_embedding_signature` 不含这两个字段，已有 embedding 保存探针的触发条件不变。用计数桩证明。
- **界面词汇复用页面已有的词**：wiki 一律「百科」、synthesis 一律「考题／合成」；空选项文案逐字沿用 `（使用配置默认）` / `(use the configured default)`。i18n 三文件（`types.ts` / `zh-CN.ts` / `en-US.ts`）**六个键**齐全（`wikiModel` / `wikiModelNone` / `wikiModelHint` ＋ `synthesisModel` / `synthesisModelNone` / `synthesisModelHint`，② 已裁 ⇒ 不再有 `group*` 键），缺一 `pnpm check` 就红。
- **示例文件不放个人在用的模型名**（盘点档 C-2 判为坏）：`rag_config.example.json` 用空串，`config.example.yaml` 用注释掉的中性占位。

## 执行纪律

- 当前分支 `feat/rag-knowledge-base`。起草轮只写文档、不据此开工；实施按 **RED → GREEN → neuter（行为还原并记录受害者）→ revert proof → 门禁** 执行；提交／推送按届时明确授权，使用 Conventional Commits。Task 0 为只读核实，Task 4 为真栈验收，不伪造这两类任务的 RED／neuter 数字。
- 后端在 `backend/` 用 `PYTHONIOENCODING=utf-8 .venv/Scripts/python -m pytest <path>`；ruff 用 `uv run --no-sync ruff check` 与 `uv run --no-sync ruff format --check`。不用裸 `uv run`／`uv sync`（会 prune 视频依赖）。
- 前端在 `frontend/` 用 `PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`；门禁为 `check`、对应窄面与 `test`。全量长跑后台执行，结果未回不报绿。
- 单测／集成测试显式绑定临时配置与测试环境变量，不读取真实 `config.yaml` / `models_config.json` / `rag_config.json`，不调用外部模型。需要"已配置条目"时用临时配置文件里自己声明的条目，不依赖用户真实条目。
- **改共享组件后必须跑全量**：`config-form.ts` / `functional-models-view.tsx` / `app_config.py` / `rag_config_file.py` 都是共享面，窄面绿不算完。
- **找"会被改动影响的既有断言"要按界面词汇 grep，不是按数据字段**：代理 i18n 的 dom 用例按 `extract_model` 扫不到，要按「图谱抽取」「裁判模型」这类界面词扫。
- 真栈开始前确认服务实际运行并已加载待验收代码，使用隔离浏览器上下文与授权测试数据。仅允许临时修改 **RAG 配置**，不改／删用户模型条目，不写 `config.yaml`、`models_config.json`、扩展配置。每轮先保存 `rag_config.json` 原字节、存在状态与 md5，成功／失败均逐字节还原；原本不存在则恢复不存在。只清理本次创建且可确定 ID 的测试资源。
- 每个 Task 的「实测」回填命令、数量、neuter 受害者、还原证明与门禁结果；纯守卫初始为绿要如实记载，并用 neuter 证明有牙。

**依赖顺序**：Task 0（只读核实）→ Task 1（后端字段 + 三调用点 + golden）→ Task 2（前端四触点 + 两个 Group + i18n）→ Task 3（示例与文档同步）→ Task 4（真栈验收）→ Task 5（交付回写）。Task 1 与 Task 2 之间不发布：Task 1 单独落地会让 GET 响应多两键而前端不认（不炸，但字段在界面够不着，等于本对自己造了一个 `embedding_dimension`）。

---

## Task 0 — 只读核实与基线捕获

- [x] **三个调用点复核**：按符号（不按行号）重读 `wiki/generator.py::_default_llm` 及其两个消费者（`generate_wiki`、`regenerate_wiki_entries` 的 `if llm is None`）、`app/gateway/app.py` 的 `wiki_main_llm` 及其 `except` 分支、`worker.py` 的 `_main_llm` 判空与传参、`eval/synthesis.py::_default_llm_factory` 及 `factory = llm_factory or _default_llm_factory` 的调用时机。列出「谁选择角色、谁传配置、谁捕获错误」，确认 spec D2 表格的三行与生效时机仍准确。**另核 ③＝乙 的两处前提**（spec D3）：① `app.py` 的 boot 段（实测 `:347` 局部 import、`:350-354` try/except、`:355` 的 `main_llm=` 实参）**可整段删除**（`wiki_main_llm` 不被该函数以外引用，`KnowledgeIndexWorker` 的其余实参不受影响；删完确认 `create_chat_model` 的局部 import 一并去掉，别留未使用 import）；② `worker.py:849-850` 的 `except` 确实是自动生成那次调用的兜底，且 4 个既有 `main_llm=` 调用点在保留注入口后无需改动。
- [x] **既有形状取样**：逐字记录 `extract_model` / `judge_model` 在后端两层、`core/rag/types.ts`、`config-form.ts` 四个触点、`functional-models-view.tsx` 的 `Group`+行结构、i18n 三文件的 key 命名与空选项文案。本对以它为模板，不另造形状。
- [x] **响应 golden 基线**：**当场重捕获**（⚠ 本文原写的 `get.config` 25 键 / `get.sources` 27 键 / `put.payload` 12 键**已过期** —— 门 A 的 Task 1 加了 `default_model`、Task 9 删了三个 VLM 键。2026-09-28 核对 HEAD `47c35ca0` 时实测为 **`get.config` 24 / `get.sources` 25 / `put.payload` 12 / `put.response.config` 24 / `put.response.sources` 25**，仍以实施当天重数为准）`backend/tests/fixtures/rag_config/response_golden.json` 的当前键集，作为 Task 1 双向差集的对照。确认 `_build_response` 仍按 `RagConfigFile.model_fields` 反射。
- [x] **碰撞面确认**：核 [2026-09-23 那一对](../specs/2026-09-23-default-model-design.md) 的 §5.1 文件表与本对 §5.1 的交集，确认全部是加法、无语义冲突；**记录它已交付（2026-09-27）** ⇒ 「本对先落地」的措辞已作废，本对是**在它之上**加两个字段；实施前按符号重读改动落点，不按本文行号。
- [x] **既有断言扫描（两把扫）**：按**数据字段**（`extract_model` / `judge_model`）与按**界面词汇**（「图谱抽取」「裁判模型」「评测裁判」）各扫一遍 `backend/tests` 与 `frontend/tests`，记录会被新增字段影响的用例（重点 `test_rag_config_api.py` 的 golden 断言、`config-form.test.ts`、`functional-models.dom.test.tsx`）。⚠ 既有断言常按关键词子串匹配，**按整句文案 grep 会误报「零覆盖」**。
- [x] **B-1 缺陷的反向守卫可行性**：确认能用一个临时 `rag_config.json`（含 `wiki_model` 覆盖）+ 一次无关字段的 PUT 来钉住 spec §4 第 5 条；若 `buildRagConfigInput` 的现有用例夹具不支持，记录需要新增的夹具形状。

**实测（2026-09-29 完成，只读核实；生产代码零改动、未提交）**：

**性质与基线**：Task 0 是**只读核实**，无 RED／neuter／revert proof（plan 纪律明写不伪造这两类数字）。基线 HEAD `4bec69b4`。**用户真实配置一份都没读**（`config.yaml` / `models_config.json` / `rag_config.json` 未打开），全部事实来自源码、fixture 与测试目录。三份文档状态：盘点档 `M`（未提交）、本对两份 `??`。

**① 三个调用点复核（按符号）**

| 腿 | 谁选择角色 | 谁传配置 | 谁捕获错误 |
| --- | --- | --- | --- |
| wiki 手动 ／ 逐条重生成 | `generator._default_llm()`（**无参** ⇒ 工厂落 `models[0]`；docstring 自述 "uses the main model (first configured)"），两个消费者各自 `if llm is None: llm = _default_llm()`（`generator.py:392`／`:488`） | **没有人传 llm** —— `knowledge_service.py:1694`（`generate_wiki`）与 `:1738`（`regenerate_wiki_entries`）都不带 `llm=` | 调用方（服务层／路由） |
| wiki worker（自动） | `worker._maybe_generate_wiki` 用构造时注入的实例：`if self._main_llm is None: return`（`:833`） | `app.py:355-361` 注入 `main_llm=wiki_main_llm`（boot 段 `:350-354` 用 `startup_config` 建） | `worker.py:835` try → `:849-850` `except Exception` ⇒ `logger.exception("wiki generation trigger failed for kb %s")`；boot 段自己那条 `except` 记 `Main model unavailable; wiki auto-generation disabled` 并置 `None` |
| 考题合成 | `synthesis._default_llm_factory()`（无参） | `knowledge_service.py:1562` 调 **`synthesize_for_docs`（复数）**，不传 `llm_factory` ⇒ 恒走默认工厂 | 合成自身（`_SYNTH_IN_FLIGHT` 的 finally 递减） |

⇒ **spec D2 的三行与"生效时机"仍准确**：手动腿每次调用各取一次、worker 腿 boot 冻结、合成腿每次合成调一次工厂（`factory = llm_factory or _default_llm_factory; llm = factory()`，`synthesis.py:332-333`）。

**③＝乙 的两处前提都成立**：① `wiki_main_llm` 全函数只出现三次（`:351` 建、`:354` 置 `None`、`:359` 传参）⇒ **boot 段可整段删除**，`KnowledgeIndexWorker` 的其余实参（`store` / `vector_store` / `worker_concurrency` / `graph_resolution_full_scan_threshold` / `entity_merge_similarity`）不受影响；② `:835` 的 `try` 与 `:849-850` 的 `except` 确实包住 `generate_wiki(...)` 那一次调用；4 个既有 `main_llm=` 调用点（`test_worker.py:503/568`、`test_e2e_smoke.py:116`、`test_phase2_smoke.py:98`）**全在测试里** ✓。

**② 既有形状取样（逐字）**

- 后端两层：`RagConfig`（`app_config.py`）`vlm_model:191`／`extract_model:194`／`judge_model:195`／`default_model:196`；`RagConfigFile`（`rag_config_file.py`）`:129`／`:130`／`:131`／`:132`。**两层描述句式不同**（见发现 3）。
- `core/rag/types.ts`：`extract_model?: string | null`（`:23`）、`judge_model`（`:24`）、`default_model`（`:30`）；`export type RagConfigInput = RagConfigValues`（`:128`）。
- `core/rag/config-form.ts`：表单值类型 `vlm_model:36`／`extract_model:37`／`judge_model:38`／`default_model:39`；`TEXT_FIELDS`（`:104` 起，角色字段在 `:109-113`）；读取映射 `formValuesFromConfig`（`:160-163`）。**多了一类清单**：`NUMERIC_FIELDS = ["embedding_dimension"]`（`:124`）—— 见发现 2。
- 视图：`groupExtraction`（`:1281`）与 `groupEvaluation`（`:1311`）**各仍只有一行**；行结构 `ROW` + `RowLabel` + `Select`（`:1282-1308` / `:1312-1335`）；`RowLabel` 支持 `info?: string`（定义在 `:218`）；哨兵 `MODEL_REFERENCE_NONE`（`config-form.ts:538`）、`modelReferenceOptions`（`:637`，空选项插在 `:643`）。
- i18n：键命名成组 —— `{role}Model` / `{role}ModelNone` / `{role}ModelHint` ＋ `group{X}`（`types.ts:1714`/`1770-1781` 一带）；空选项文案实测在 `zh-CN.ts:1762/1771/1775/1777`、`en-US.ts:1856/1864/1868`；`wikiModel|synthesisModel|groupWiki|groupSynthesis` **三文件零命中** ⇒ 名字未被占用。

**③ 响应 golden 基线（当场重捕获）**：`backend/tests/fixtures/rag_config/response_golden.json` 顶层五键（`_captured` / `_precondition` / `_registered_additions` / `get` / `put`），键集 **`get.config` 24、`get.sources` 25、`put.payload` 12、`put.response.config` 24、`put.response.sources` 25** —— 与 spec D6 表一致。`_registered_additions` 里现有的一句记的是门 A 的 `config.default_model` ＋ `sources.default_model`（R19）与 Task 9 撤下的三项。`_build_response` 仍 `for name in RagConfigFile.model_fields:` 反射 ✓。

**④ 既有断言扫描（两把扫 —— 第二把必须换轴，结果不同）**

- **后端 · 数据字段轴**：`extract_model` 9 文件／22 处，`judge_model` 8 文件／46 处，`default_model` 12 文件／127 处。集中在这 13 个文件：`knowledge/eval/{test_eval_factory,test_ondemand,test_ragas_eval_cli}.py`、`knowledge/graph/test_extractor.py`、`knowledge/{test_model_target,test_rag_model_wiring}.py`、`test_rag_config{,_api,_file,_probe,_save_probe,_dimension_probe,_sparse_probe}.py`。
- **前端 · 数据字段轴**：`unit/rag/config-form.test.ts`、`unit/settings/functional-models.dom.test.tsx`。
- **前端 · 界面词汇轴**：「图谱抽取」1 文件、「评测裁判」1 文件、「裁判模型」**0** —— 全落在 `unit/settings/functional-models.dom.test.tsx`（真 locale）。**`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx` 一把都没扫到**：它用 Proxy i18n（`:41` 的 `KEYS`），锚是 i18n **键**（`getByLabelText("defaultModel")`／`"extractModel"`）而不是中文词 ⇒ **存在第三轴（键轴）**，Task 2 的用例按键轴写、运行面按计划两份 dom 都跑。
- **会被新增行波及的既有断言（已定位）**：`functional-models.dom.test.tsx:565`（hint 三连断言 `[F.extractModelHint, F.groupEvaluationHint, F.captionModelHint]`）与 `:685`（`F.groupExtraction` 分组断言）—— 新行落在同一组内，这两处要按"组内行数"重写（plan Task 2 RED 已要求）；`:438/:442` 的"对话视图没有抽取行"与 `:578` 的 `defaultModelHint` 逐字断言**不受影响**。

**⑤ 碰撞面确认**：门 A 那一对**已交付**（2026-09-27，plan 82/82，`bfed5529` → `305f4fa2`）；两份 §5.1 的交集仍是那 12 个文件、**全部是加法**；「本对先落地」的措辞已作废（spec §5.2 已改），**本对是在已交付版之上加两行**；已交付那两份文档**不回改**。

**⑥ B-1 反向守卫可行性**：**夹具支持** —— `tests/unit/rag/config-form.test.ts:52` 的 `view(config, sources)` 可声明 `config.wiki_model = "X"` ＋ `sources.wiki_model = "ui"`，改一个无关字段后断言 payload 仍带 `wiki_model`；把 `TEXT_FIELDS` 少一项即转红。**但先例已变**（见发现 2）。

**发现（本轮新出，四条 —— 均已按 Task 0 → 文档的惯例回写）**

1. **漏了 `MODEL_REFERENCE_FIELDS`（最要紧）**：`rag_config_file.py:74` 的 `MODEL_REFERENCE_FIELDS = ("default_model", "extract_model", "judge_model", "vlm_model")` 是门 A 建的**共享空白归一 validator**（`:152` `@field_validator(*MODEL_REFERENCE_FIELDS, mode="before")`）。两个新字段不进这个元组，文件里 `"wiki_model": "   "`（纯空白）**不会被归一成 `None`**，会以"声明了一个空白名字"活到运行期（`_prune_empty()` 只吃 `""`）。⇒ 已写进 spec D1 与 plan Task 1 的 RED／GREEN。
2. **B-1 的先例已由别的会话闭合**：`embedding_dimension` 的"保存即丢"不再存在 —— `config-form.ts:124` 的 `NUMERIC_FIELDS` 专类会带出文件覆盖、清空写 `null` 撤销；`formValuesFromConfig:167` 读它、`hasFormChanges` 覆盖它、视图 `:663` 有行。⇒ spec §4 第 5 项与 plan Task 2 RED 的措辞已从"复刻一个还活着的缺陷"改成"沿用一条已闭合缺陷的守卫形状"。
3. **两层字段描述的句式本来就不同**：`app_config.py:194` 的 `extract_model` 结尾是 `None uses the first configured model.`，而 `rag_config_file.py:130` 同名字段只写 `used for graph extraction.`；`judge_model` 两层也不同（`…first configured model.` vs `…config primary model.`）。spec D1 原写"逐字对齐 `app_config.py:199`／`:200`，包括结尾那句"—— **行号已漂**（实测 `:194`／`:195`）且**跨层不成立** ⇒ 已把 D1 改成"按各自那一层的邻居写"并直接给出要写的那两行描述。
4. **窄面清单要扩**：`backend/tests/test_rag_config_dimension_probe.py` 与 `test_rag_config_sparse_probe.py` 是本对起草**之后**才出现的（另一条线）⇒ plan Task 1 的门禁已点名把它们算进窄面。

**遗留（不属本 Task）**：Task 0 只读 ⇒ 无 RED／neuter／revert proof，实施任务各自补；真栈未起（Task 4）；`config_version` 的升位落在 Task 3（已定为 39 → 40）。

---

## Task 1 — 后端两层字段、三个调用点与响应 golden

> 文件：`config/app_config.py`（`RagConfig`）、`config/rag_config_file.py`（`RagConfigFile`）、`knowledge/wiki/generator.py`、`knowledge/worker.py`（`_maybe_generate_wiki` 惰性化，spec D3）、`app/gateway/app.py`（删掉 boot 段：`:347` 局部 import ＋ `:350-354` 建模型与 `except` ＋ `:355` 的 `main_llm=` 实参）、`knowledge/eval/synthesis.py`、`backend/app/gateway/routers/rag_config.py`（⑤＝甲：`_reject_unusable_role_targets` 的字段元组 `:332` 加两个字 ＋ 它 docstring 的 "three role fields" 改五个）、`tests/fixtures/rag_config/response_golden.json`；用例就近放 `test_rag_config*.py`、`tests/knowledge/`（wiki，含 `test_worker.py` 的惰性用例）、`tests/knowledge/eval/test_synthesis.py`。**4 个既有 `main_llm=` 调用点不改**（注入口保留，且生产调用点今后也不得传它 —— spec D3）。
> **验收对应**：spec §4 的 1 / 2 / 3 / 4 / 8 / 10。

- [x] **RED：加载链**：无 RAG 文件、旧文件（不含新键）、空字段三种前提都能加载且不产生 UI 覆盖；临时 YAML 的 `rag.wiki_model=A` 与临时 JSON 的 `B` 经**真实加载**得到 `B`，撤销 UI 覆盖得到 `A`，两者都无则 `None`。`synthesis_model` 同样四条。**另加空白归一那一档**：文件里的 `"wiki_model": "   "`（纯空白）加载后是未声明 —— 不产生 UI 覆盖、`sources` 不报 `ui` —— 由把两个字段加进 `MODEL_REFERENCE_FIELDS`（`rag_config_file.py:74`，门 A 的共享 validator）承重，**不在 resolver 里另做 strip**。不只构造 `AppConfig(...)` 验证，也不依赖 PrivateAttr 自动补齐。
- [x] **RED：三个调用点（五层，按 spec §4 第 2 项与 D4 的链）**：① 声明 `X` ⇒ 拿到 `X`（**不被 RAG 默认替换**）；② 角色为空 ＋ `rag.default_model` 指到有效条目 ⇒ **这三条腿跟着换**（与抽取／裁判同链的正向证据）；③ 角色与默认都为空 ⇒ `models[0]`（与今天逐字节相同）；④ 默认指不到条目 ⇒ **回落首项 ＋ 一条点名 warning**（不是报错）；⑤ 一个模型条目都没有 ⇒ `RagConfigurationError`（不把 `None` 交给工厂）。**worker 腿另加一条（③＝乙 的专属牙）**：把字段改掉后**不重启**，`_maybe_generate_wiki` 下一次触发即用新目标 —— 反向对照是"改回启动期实例后该用例转红"。合成腿另断言 `_default_llm_factory` 每次调用都重读配置（热加载生效），且不破坏既有注入 `llm_factory` 的四条用例。**桩放 SDK 边界**（观察交给工厂的名字），不把 resolver 整体换常量。
- [x] **RED：响应形状**：以 Task 0 的 golden 为基线，GET／PUT 的 `config` 与 `sources` **仅**各多 `wiki_model` / `synthesis_model` 两键，其余逐字不变；`put.payload` 键集不变；新字段的 `sources` 在未被写入时为 `config_file`、被写入时为 `ui`。做**双向差集**，不只断言新键存在。
- [x] **RED：保存期检查扩到六个字段（⑤＝甲）**：PUT 一个**不存在**的 `wiki_model` / `synthesis_model` ⇒ **400**、detail 以 `提交后的配置仍不可用：` 开头且含那句 `Model <名称> not found in config`，`rag_config.json` 字节不变；PUT 合法值 ⇒ 200（正向对照）。四个既有字段的判定不变；**兜底目标仍不检查**（这两个字段留空时，即使 `models[0]` 缺钥匙也照样能保存 —— R2 规则的牙）。**只动 `_reject_unusable_role_targets`**（`rag_config.py:316`，元组在 `:332`）—— **别碰同文件的 `_reject_unusable_after_save`**，它构造的是三条管道腿、不看角色字段。**先核夹具再动生产代码**：门 A 的 Task 9 踩过"零条目夹具让既有 200 变 400"这个坑（`test_rag_config_api.py` 的 `config_env` 与 `_write_config_yaml()` 写的是 `"models": []`），修法是**给夹具补模型条目、不是放宽检查**。
- [x] **RED：不增加出网**：改选／保存这两个字段时，embedding 探针与稀疏探针的调用计数为零；`_embedding_signature` 对新字段不敏感（改它不触发保存期探针）。
- [x] **GREEN**：两层各加两字段（描述句式照 D1 给的那段；`RagConfigFile` 侧**同时把两个字段加进 `MODEL_REFERENCE_FIELDS`**，`rag_config_file.py:74`，空白归一由它承重）；三个调用点改成 `create_chat_model(require_usable_rag_target(config, config.rag.<角色字段>, role=…), app_config=config)`（**形状逐字照抄 `graph/extractor.py:111-125` 的 `get_extract_llm()`**，含函数内 import）；**worker 腿惰性化**：`llm = self._main_llm or create_chat_model(require_usable_rag_target(config, config.rag.wiki_model, role="百科生成"), app_config=config)`，`config = get_app_config()`（⚠ **实施期更正**：spec D3 的片段漏了外层 `create_chat_model(...)` —— `require_usable_rag_target` 返回的是名字，`generate_wiki` 要的是模型对象；由惰性用例抓出，已同批修 spec D3 与本行）；**`app.py` 删掉 boot 建模型与它那条 `except`**（`main_llm` 实参一并去掉，构造参数保留）。**同一个提交**更新 `response_golden.json` 的四处键集，**并在它的 `_registered_additions` 记录里补一句**（两个键是**嵌套**新键、顶层白名单 `_ADDED_FIELDS` 管不到 —— 门 A 的 R19 先例就是为此写的）；**保存期把 `_reject_unusable_role_targets` 的字段元组由四个扩到六个**（`routers/rag_config.py:332`，docstring 的 "three role fields" 同批改成五个；⑤＝甲，只这一处）。不改工厂、**不改 `knowledge/model_target.py`**。
- [x] **neuter：还原旧行为整体**，逐项独立还原并证明 GREEN 恢复、各有对应用例转红：① 三个调用点还原成 `create_chat_model()` 无参（**这同时抽掉了 RAG 默认那一层** ⇒ ②③④⑤ 四层断言应一起转红）；② `RagConfigFile` 去掉两字段（响应形状守卫转红）；③ golden 回退（形状守卫转红）；④ **worker 腿单独还原成"用启动期实例"**（保留 `generator.py` 的新写法）⇒ 惰性那条用例转红，**证明"两条腿同路"有牙**；⑤ 把 `app.py` 的 boot 建模型加回来（条数与日志文案一并复原）⇒ 与"不再读启动快照"的断言转红；⑥ **把保存期字段表退回四个** ⇒ 新增的 400 断言转红（四个既有字段的判定不受影响，`comm` 对照）。⚠ 半还原（只改一处、值仍取新字段）看着有牙其实只红一条，必须整体还原。
- [x] **门禁**：`uv run --no-sync ruff check` 与 `ruff format --check` 双净；RAG 配置／加载／wiki／synthesis 窄面绿（**含本对起草后才出现的 `test_rag_config_dimension_probe.py` 与 `test_rag_config_sparse_probe.py`** —— Task 0 实测这两个文件已在窄面里）；`app_config.py` 与 `rag_config_file.py` 是共享加载路径 ⇒ **跑后端全量**（后台执行，结果未回不报绿），与基线对照零新增失败。

**实测（2026-09-29 完成，RED → GREEN → 六条 neuter → 门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `4bec69b4`（本轮未变）。工作树带着**别条线**的未跟踪文档（`2026-09-28-video-asr-output-shape*` 等），本 Task 一处未纳入；**用户真实配置一份未读**（全程 `config_env` / `tmp_path` 隔离 ＋ `monkeypatch.setenv`）。

**RED（五组，红因全部是"字段／接线不存在"）**

1. **加载链**（`test_rag_config_file.py`，**11 红**）：新字段不在 `RagConfigFile` ⇒ 写进文件即 `extra_forbidden`（6 条参数化空白 ＋ 2 条覆盖/撤销 ＋ 1 条两侧皆空 ＋ 1 条本地清单 pin）。其中新加的 **pin**（`test_the_local_blank_rule_list_matches_the_production_one`）是本轮唯一的"新角色静默逃过空白归一"警报：本地那份 `MODEL_REFERENCE_FIELDS` 副本必须与生产的相等。
2. **三个调用点**（`test_rag_model_wiring.py`，**18 红**）：两条新腿各 9 条（优先级 4 ＋ 显式名 1 ＋ 默认失效 1 ＋ 无模型 1 ＋ 声明指向缺钥匙 1 ＋ 兜底不判 1）；红因是今天的形状 —— `_default_llm()` / `_default_llm_factory()` 无参 ⇒ 工厂收到 `(None, None)`。**同批反转了 门 A 留下的 `test_nameless_rag_points_never_see_the_rag_default`**（它断言这两个点**不接** RAG 默认 —— ④甲 之后方向反了），改写成本对的六条用例。
3. **worker 腿**（`test_worker.py`，**3 红**）：惰性（同实例换配置再触发 ⇒ 目标跟着换，末尾附"配置不变则目标不变"的反向对照）、失败收尾（无可解析目标 ⇒ 落既有 `except`、文档仍 `ready`、不抛）、源码 pin（`app.py` 无建模型／无 `main_llm=`，worker 读 `get_app_config` 且不含 `startup_config`）。另有 1 条**初始即绿**的守卫：注入口仍生效（牙由 neuter 4 证明）。
4. **保存期检查**（`test_rag_config_api.py`，**6 红**）：新字段往返与来源（2）、错名 400（2 —— 参数化并入既有那条，由四个参数扩到六个）、声明的 UI 目标缺钥匙 400 ／ 完整目标 200（2）。
5. **出网**（`test_rag_config_save_probe.py`，**1 红**）：只改这两个字段 ⇒ 探针计数为零；同一桩上带正向对照（改真实嵌入字段必须打到网络）。

**GREEN（生产 7 文件 ＋ golden）**

- `RagConfig` / `RagConfigFile` 各加两字段（**紧跟 `default_model`**；描述按各自那一层的邻居写，不跨层抄）。
- **`MODEL_REFERENCE_FIELDS` 由四个扩到六个**（`rag_config_file.py:74`）＋ validator docstring "all four" → "all six" —— Task 0 查出的漏项，空白归一靠它承重。
- 三个调用点全部改成 `create_chat_model(require_usable_rag_target(config, config.rag.<角色字段>, role=…), app_config=config)`，形状照抄 `get_extract_llm()`。
- **⚠ 实施期更正（spec D3 与本 plan 同批改）**：D3 原片段写到 `require_usable_rag_target(...)` 就结束 —— 那返回的是**条目名字符串**，而 `generate_wiki(llm=…)` 要的是模型对象。惰性用例当场把它抓出来（`seen == []`），已补外层 `create_chat_model(...)`。
- `app.py` 删 boot 段（`:347` 局部 import ＋ `:350-354` 建模型与 `except` ＋ `:355` 实参），原位留一句"这里不再建模型"的理由。
- `routers/rag_config.py` 的 `_reject_unusable_role_targets` 元组由四个扩到六个 ＋ docstring "three" → "five" ＋ 内联注释 "all four" → "all six"；`_reject_unusable_after_save` **未动**。
- golden：四个 dict 各加两键（顺序 `default_model` → `wiki_model` → `synthesis_model`）；键数 `get.config` 24→**26**、`get.sources` 25→**27**、`put.response.*` 同、`put.payload` **12 不变**；`_registered_additions` 补一句（引 R19 的嵌套键理由）。

**neuter（六条，批量脚本逐条"改→跑→逐字节还原"；7 文件 md5 复原一致；驱动脚本跑完即删）**

| # | 还原的旧行为 | 受害者 |
| --- | --- | --- |
| 1 | 三个调用点回到裸 `create_chat_model()` | **18**（两条新腿的全部断言，含拒绝与来源） |
| 2 | `RagConfigFile` 去掉两字段（＋ 元组回到四个） | **13**（加载链 11 ＋ 形状守卫 2） |
| 3 | golden 回退到 24／25（代码不动） | **2**（两条纯加法形状守卫） |
| 4 | worker 腿回到"用启动期实例"（手动腿保留新写法） | **2**（惰性 ＋ 失败收尾）；注入口守卫保持**绿**（符合预期） |
| 5 | `app.py` 加回 boot 建模型与 `main_llm=` 注入 | **1**（源码 pin） |
| 6 | 保存期元组退回四个 | **4**（两条新角色的错名 ＋ 缺钥匙）；四个既有角色**仍绿**（改动只扩面、不改判） |

**一条过程记录**：neuter 脚本对三个 CRLF 文件（`generator.py` / `app.py` / `rag_config.py`）走**二进制替换**、替换前按行尾展开模式 —— 门 A Task 2 的文本往返把它们静默归一成 LF 过，这次没有发生（跑完复查：13 个文件无 mixed 行尾）。

**既有受害者（真红，按新行为改写、不是放宽）**：`test_new_document_marks_touched_wiki_entries_dirty` —— 它原本靠 `main_llm=None` 让自动生成不发生，从而"标脏后仍是 dirty"；惰性化之后同一轮就会消费这个标记。改法是给这个库**再加一份未处理的文档**（ready 份额 1/2 < 0.9 ⇒ 触发器不到阈值），**原断言原样保留**，并注入假 LLM 保证离线；docstring 写明为什么要有第二份文档。

**门禁**

- ruff：`uv run --no-sync ruff check` ＋ `ruff format --check` 对 12 个文件**双净**。
- 窄面（`tests/knowledge` ＋ `test_rag_config*` ＋ `test_default_model_isolation`）：**1563 passed ／ 4 failed ／ 2 skipped（7 分 05 秒）**，4 条**全部是既有红、零新增** —— ① `test_indexer`／`test_reranker` 的 missing-key（本机仓库根真实 `rag_config.json` 供了钥匙）；② `test_rag_config_save_probe.py` 的两条**宽度文案换代**红，**HEAD 上同样红**（`_WRONG_WIDTH_MESSAGE` 还是旧句"向量库集合固定为 1024 维…「重建索引」"，而 `embedder_factory` 现在给的是"当前生效宽度是…「高级设置 → 维度」"）⇒ 属宽度迁移那条线的收尾面，不是本对。
- **全量**：**162 failed ／ 12730 passed ／ 109 skipped（17 分 51 秒）**。判据是**集合不是条数** —— 跑**原地 A/B**（13 个改动文件先备份到仓外并记 md5 → `git checkout HEAD --` → 只跑这 **63 个**失败文件 → 双向 diff → `cp` 还原并核 md5）⇒ **HEAD 上同样 162 条、id 集合逐条相同、双向差集皆空 ⇒ 零新增失败**；还原后 13 个文件 md5 逐字节一致。条数比我记录里的 160 多 2，但那是既有红的漂移（宽度文案那对等），不是本对引入 —— A/B 已证明。

---

## Task 2 — 前端四触点、两行并入既有分组与 i18n

> 文件：`core/rag/types.ts`、`core/rag/config-form.ts`、`components/workspace/settings/functional-models-view.tsx`、`core/i18n/locales/{types,zh-CN,en-US}.ts`；用例 `tests/unit/rag/config-form.test.ts`、`tests/unit/settings/functional-models.dom.test.tsx`。
> **验收对应**：spec §4 的 5 / 6 / 7。

- [x] **RED：保存不丢字段（沿用 B-1 那条守卫的形状）**：`rag_config.json` 已有 `wiki_model` 覆盖时，编辑任一**无关**字段后 `buildRagConfigInput()` 的输出**仍带** `wiki_model`；`synthesis_model` 同。这条用例必须在 `TEXT_FIELDS` 少一项时转红 —— 先写用例、再故意从清单里去掉那一项验证它真的有牙。**夹具现成**：`tests/unit/rag/config-form.test.ts:52` 的 `view(config, sources)` 支持声明 `config.wiki_model` ＋ `sources.wiki_model = "ui"`。**先例已闭合**（Task 0 实测）：`embedding_dimension` 的"保存即丢"已被别的会话修好（`NUMERIC_FIELDS` 专类），所以本条是沿用形状，别去追一个已不在的缺陷。
- [x] **RED：读取映射**：`formValuesFromConfig()` 把 GET 回来的 `wiki_model` / `synthesis_model`（含 `null` 与缺键）正确落成表单值；漏改显式映射时用例转红。
- [x] **RED：界面结构（② 已裁：并入既有分组）**：既有「图谱抽取」卡片内**两行**（图谱抽取模型 ＋ **百科生成模型**）、既有「评测裁判」卡片内**两行**（裁判模型 ＋ **考题合成模型**）—— 组内行数从 1 变 2 是本条的核心断言；新增两行的 `aria-label` 是「百科生成模型」「考题合成模型」，空选项文案「（使用配置默认）」；**没有新增卡片**，`groupWiki` / `groupSynthesis` 这两个键**不存在**；对话模型视图与设置总标题**没有**这两行。不断言几何。
- [x] **RED：非 RAG 隔离**：既有 `extract_model` / `judge_model` / `vlm_model` / `video.caption_model` 的表单契约与界面结构断言全部不变（作为守卫，初始为绿，用 neuter 证明有牙）。
- [x] **GREEN**：`RagConfigValues` 加两个可空字段；`RagConfigFormValues` 加两个 `string`；`TEXT_FIELDS` 加两项；`formValuesFromConfig()` 加两行 `asText(...)`；视图在既有「图谱抽取」「评测裁判」卡片内**各追加一行**（照抄 `functional-models-view.tsx:1282-1308` 的 `ROW` + `RowLabel` + `Select` 结构，行内解释用 `RowLabel info={F.wikiModelHint}` / `…synthesisModelHint`；候选用 `modelReferenceOptions`、**不用** `visionReferenceOptions`），**不新开卡片、不动卡片标题与卡片 ⓘ**；i18n 三文件补**六个键**（D5），`wikiModelHint` 只写继承口径（留空先撤本行覆盖 → 配置值 → RAG 默认 → 首项），**不写"要重启"**——③＝乙 之后两条腿都即时生效，那条不对称已消失（spec D5／D3）。
- [x] **neuter**：① 从 `TEXT_FIELDS` 去掉两项 ⇒ 保存不丢用例转红；② 从 `formValuesFromConfig` 去掉两行 ⇒ 读取映射用例转红；③ 把候选换成 `visionReferenceOptions` ⇒ 界面用例应能逮住过滤差异（若逮不住，说明用例无牙，当场改强）；④ **在 `wikiModelHint` 里加回"要重启"那句（改前的事实）** ⇒ 文案断言转红；⑤ **把新行从既有卡片移出、改装进一个新 `Group`** ⇒ 组内行数与"没有新增卡片"的断言转红（证明"并入既有分组"这条裁定有牙）。
- [x] **门禁**：`pnpm check` 零诊断（含 i18n 三文件的类型对齐）；`config-form` 与 `functional-models` 窄面绿；**前端全量**（共享组件，后台执行）。

**实测（2026-09-29 完成，RED → GREEN → 五条 neuter → 门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `4bec69b4`（本 Task 开工时）。**第一次动到用户可见层**：`functional-models-view.tsx` ＋ 三个 locale 文件。后端**零改动、未跑后端门禁**（本 Task 没有后端面）。

**并发提交（已核，未受影响）**：本 Task 进行中，别条线落了 `3d0d4e05`（sensevoice 从 ASR 菜单移除）—— 它碰了**四个我也在改的同文件**（三个 locale／`config-form.ts`／`config-form.test.ts`／本对的 `functional-models.dom.test.tsx`）。**逐文件核过其 diff：只含它自己的 ASR 行，没有把我的在飞改动一起带走**；我的改动仍在工作树（`grep` 复核），且本轮全量是在"它的提交 ＋ 我的改动"之上跑的。收尾时 HEAD 已前进到 `37eb6d51`。

**RED（16 红，红因全部是"字段／键不存在"）**

1. `tests/unit/rag/config-form.test.ts`：**12 红** —— 两条新腿 × 6 条（种子值、空态、新选值提交、**文件覆盖扛过一次无关编辑**（B-1 形状的反向守卫）、空串撤销、改动判定）。
2. `tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`（Proxy i18n）：**1 红** —— ② 裁定与行位置的**结构**用例。
3. `tests/unit/settings/functional-models.dom.test.tsx`（真 locale）：**3 红** —— 两行可见且各带自己的 ⓘ（卡片保留自己的）、两条新 hint 与既有角色同口径（含 `defaultModel` 字样，不含「主模型／要重启／primary model」）、两语文案逐字。
- **非 RAG 隔离**那一项是**纯守卫**（既有 extract／judge／vlm／caption 的表单与界面断言）**初始即绿**，牙由 neuter 5 间接证明（同一张卡片的结构断言就是它的邻接守卫）。

**GREEN（4 生产文件 ＋ 3 测试文件）**

- `core/rag/types.ts`：`RagConfigValues` 加两键（可空条目名，与 `default_model` 同形状）。
- `core/rag/config-form.ts` 三处：表单值类型两行、`TEXT_FIELDS` 两项、`formValuesFromConfig` 两行 —— **只加进既有清单，不另写保存逻辑**（沿用 R4 的结论：进清单即自动获得"新建覆盖／带出文件覆盖／空串撤销／改动判定"四条）。
- 视图：**在既有「图谱抽取」「评测裁判」卡片内各追加一行**（照抄 `:1282-1308` 的 `ROW` + `RowLabel` + `Select`，行内解释用 `RowLabel info=`），**不新开卡片、不动卡片标题与卡片 ⓘ**。
- i18n **六个键 × 三文件**：`wikiModel` / `wikiModelHint` / `wikiModelNone` ＋ `synthesisModel` / `synthesisModelHint` / `synthesisModelNone`；空选项沿用「（使用配置默认）」/「(use the configured default)」。
- **写 RED 时按计划自查补了两处牙**（原用例太弱）：① ② 的"没有新增卡片"只断言 `groupWiki`/`groupSynthesis` 两个键不存在的话，**一个同标题的新组也不会红** ⇒ 补 `closest('[data-slot="card"]')` 的**同卡包含**断言（新行必须与它跟随的那行同卡）；② ③ 的"不过滤视觉"补一条**非视觉条目的 display_name 出现在触发器上**的守卫（被过滤掉的存量值只会显示原始条目名 —— 门 A Task 4 的教训）。

**neuter（五条，批量脚本逐条"改→跑→逐字节还原"；3 文件 md5 复原一致；驱动脚本跑完即删）**

| # | 还原的旧行为 | 受害者 |
| --- | --- | --- |
| 1 | `TEXT_FIELDS` 退回四项 | **8 红**（两条新腿的提交／撤销／改动判定） |
| 2 | `formValuesFromConfig` 去掉两行 | **46 红**（该函数是所有用例的种子来源 ⇒ 面很宽、数字真实） |
| 3 | 两行候选换成 `visionReferenceOptions` | **1 红** —— 正是那条非视觉 display_name 守卫（加牙有效） |
| 4 | `wikiModelHint` 加回"改完要重启" | **1 红**（文案断言） |
| 5 | wiki 行移出卡片、装进它自己的 `Group` | **1 红** —— 正是那条同卡包含断言（② 的牙） |

**门禁**

- `pnpm check`（eslint ＋ `tsc --noEmit`）：**零诊断**。首跑抓到我自己两条 `noUncheckedIndexedAccess` 的数组下标（`order[i-1]`）⇒ 按该文件既有风格补 `!`。
- 窄面（`tests/unit/rag` ＋ `tests/unit/settings` ＋ `tests/unit/components/workspace/settings`）：**15 文件 ／ 292 passed ／ 0 failed（43.4 秒）**。
- 格式债自查（`pnpm format` 在工作树恒红＝CRLF 环境条件，见盘点档）：按"只比内容、与 HEAD 同法对照"的办法查**我自己新写的行** ⇒ **新增超宽代码行 0 条**（初次自查抓到 3 条，只重排了那 3 行；注释与字符串字面量不在 prettier 的重排范围内）。
- **前端全量**：**247 文件 ／ 2736 passed ／ 0 failed（2 分 45 秒）** —— 全绿。（高于记录里的 243／2648 是因为别的线也落了用例；本轮零失败。）

---

## Task 3 — 示例文件与文档同步

> 文件：`rag_config.example.json`、`config.example.yaml` 的 rag 段、`backend/AGENTS.md`、[发布前写死项盘点](../../PRE_RELEASE_HARDCODE_INVENTORY.md)。
> **验收对应**：spec §5.3。**不运行 `make config-upgrade`、不读不改用户真实配置。**

- [x] **RED**：钉示例文件契约的用例（若已有 `rag_config.example.json` 的形状守卫则扩它，没有则新增一条）：两个**新**键存在、值为空串、**键序紧随 `default_model`**。⚠ **不要断言"整个文件不含真实模型名"** —— 该文件里 `embedding_model` / `rerank_model` / `extract_model` 三处**今天就是真实在用名**（实测 2026-09-29），那样写必红，而修它等于做盘点档 **C-2**（不在本对）。`config.example.yaml` 的 rag 段有两行注释掉的中性占位。
- [x] **GREEN**：`rag_config.example.json` 加 `"wiki_model": ""` 与 `"synthesis_model": ""`（与既有 `"judge_model": ""` 同形，紧跟 `default_model`，**不动**那三处既有真实名）；`config.example.yaml` 在 `# judge_model:`（实测 **`:2587`**，不是旧写的 `:2590`）附近加两行注释示例，并**把 `config_version` 从 39 升到 40**（门 A 的 38→39 就是为加 `default_model` 做的，同一先例）；`backend/AGENTS.md` **三处同批** —— ① `:685` 附近 "RAG Functional-Model Configuration" 段的角色清单 ② `:725` 附近 "**RAG model targets**" 段（今天只写四个角色，本对之后六个，不改会与 ③④ 后的实况矛盾）③ `:1273` 那条 open point（「no dedicated config knob (spec §10 open point 1, deferred)」）；盘点档 A-7 / A-8 标为已交付、§4.2「对 1」勾掉、计数随之调整。
- [x] **门禁**：示例契约用例绿；`config_version` **按门 A 先例升到 40**（不再"以指南为准"）；`backend/AGENTS.md` 改完 grep 一遍 `no dedicated config knob` 与 `judge_model` 段，确认三处都动了。**同批把 chart 一起升**（见实测：不升会把这个门禁新开成红）。

**实测（2026-09-29 完成，RED → GREEN → 门禁）**：

**性质与基线**：实施 Task（模板 ＋ 文档 ＋ 一条新守卫），基线 HEAD `37eb6d51`。**没有 neuter 项**（本条不还原行为，只钉模板契约与文档同步）。**未跑 `make config-upgrade`、未读改任何用户配置**。

**RED（4 红 ／ 1 绿）** —— 本对起草时仓库里**没有任何**示例文件守卫（`grep -rln "rag_config.example.json" backend/tests` 零命中），按 plan 新建 `tests/test_rag_config_example.py`：
1. `test_the_json_template_ships_both_roles_as_empty_overrides`（两个键缺失）
2. `test_the_json_template_keeps_the_roles_next_to_default_model`（键序）
3. `test_the_yaml_template_advertises_both_roles_as_commented_examples`（注释示例缺失）
4. `test_the_yaml_template_is_bumped_for_the_new_fields`（`39 >= 40` 假）
5. **初始即绿**的守卫：`test_the_json_template_loads_through_the_real_model`（模板本身能过真实校验 ⇒ 挡住"下游把模板改坏"）。
**按 Task 0 的结论收窄了一处**：**不做**"整个文件不含真实模型名"的断言 —— 那三处今天就是真实在用名，换掉属盘点档 C-2。

**GREEN（4 个载体 ＋ 1 个新守卫 ＋ 计划外的第 5 个载体）**
- `rag_config.example.json`：两个空串键，**紧跟 `default_model`**（键序 … judge_model → default_model → wiki_model → synthesis_model → mineru_api_token），既有三处真实名一处未动。
- `config.example.yaml`：`# judge_model:` 之后加两行注释示例（`# wiki_model: <your-model-name>` / `# synthesis_model: <your-model-name>`，中性占位）；`config_version` **39 → 40**。
- `backend/AGENTS.md` **三处**：① 功能模型清单补两个角色（并顺手改掉同句里"judge 未设退 config 主模型"那半句 —— 门 A 的 D3 之后它已过期）；② "**RAG model targets**" 段由四角色扩到六角色，并补一句 worker 腿"每次现解析、改设置不用重启"；③ 撤掉 `no dedicated config knob (spec §10 open point 1, deferred…)`，改成 `rag.synthesis_model` → RAG 默认 → 首项，并修正同段 `synthesize_for_doc` 的单数名与旧签名。
- **⚠ 计划外但必要：chart 同批升 40**。`scripts/check_config_version.sh` 在本次改动**之前是绿的**（example 39 == chart 39 —— 与门 A 当时不同，那次它本来就是红的）⇒ 只升 example 会把这个由 `chart.yaml:61` 与 `nightly.yaml:98` 跑的门禁**新开成红**。已把 `deploy/helm/deer-flow/values.yaml:243` 与 `deploy/helm/deer-flow/README.md:127` 一起升到 40。

**门禁**
- 新守卫：`tests/test_rag_config_example.py` **5 passed**。
- 示例／配置／向导窄面（两个不相交批次，合计）：**428 passed ／ 4 failed ／ 1 skipped**；4 条**全部是既有环境红** —— `test_doctor::TestCheckModelsConfigured::test_no_models` 与 `test_app_config_reload` ×2 ＝ 本机仓库根真实 `models_config.json`；`test_config_version::test_version_26_config_upgrades_to_checkpoint_channel_mode` ＝ 本机 `bash` 被解析到 WSL 空壳（`execvpe(/bin/bash) failed`，HEAD 上同样红）。
- `bash scripts/check_config_version.sh`：**OK（40 == 40）**。
- grep 复核：`no dedicated config knob` 计数 **0**；`wiki_model` / `synthesis_model` 在三处出现（功能模型清单、RAG model targets 段、合成那条的 knob）。
- **未跑后端全量**：本 Task 只动模板／文档与一条自包含新用例（无共享夹具、不改加载路径），按 plan 的 Task 3 门禁逐条执行即可。
- **盘点档的交付标记与计数不收在本 Task**：plan 的 Task 3 GREEN 与 Task 5 都列了它 —— 收在 Task 5（交付回写），因为那要等真栈与最终验收之后的定论。

---

## Task 4 — 真栈验收

> 前提：服务实际运行且已加载本对代码；隔离浏览器上下文；授权测试库；`rag_config.json` 原字节 + 存在状态 + md5 先存档。

- [x] **腿一（手动生成即时生效）**：把 `rag.wiki_model` 设为一个已授权条目 ⇒ `POST /wiki/generate` 与逐条重生成的实际调用模型改变（用 run 事件／日志里的 `model_name` 证明，不靠推断）。清空该字段 ⇒ 按 spec D4 的链落到 `rag.default_model`（把它设成**另一个**有效条目，实际调用应跟着换），再把默认也清掉才回到 `models[0]`。
- [x] **腿二（自动生成改完即生效）**：改字段后**不重启**，触发一次文档入库 ⇒ worker 那条腿**立刻用新目标**（证据口径同腿一：日志／run 事件里的实际调用模型，不靠推断）；再把字段清掉触发一次 ⇒ 落到 `rag.default_model`。**反向对照**：不改字段连触发两次，两次目标相同（证明"新"不是偶然）。
- [x] **腿三（考题合成）**：设 `rag.synthesis_model` ⇒ `POST …/eval/questions/synthesize` 的实际调用模型改变；清空 ⇒ 落到 `rag.default_model`（同腿一的两级）。候选题仍走既有两道守卫，staging 形状不变。
- [x] **腿四（保存不丢）**：在设置页改一个**无关**字段并保存 ⇒ 回读 `rag_config.json`，两个新字段的既有覆盖仍在。
- [x] **腿五（聊天隔离）**：只改这两个字段 ⇒ 普通聊天、知识库聊天主模型、`extract_model` / `judge_model` / `vlm_model` 的实际选模不变。
- [x] **腿六（保存期检查扩到六个字段，⑤＝甲）**：在设置页把 `wiki_model` 选用一个不存在的条目名（或直接 PUT 一个不存在的名字）⇒ **400**、界面 toast 的 detail 以「提交后的配置仍不可用：」开头、`rag_config.json` **字节不变**；再 PUT 一个合法条目名 ⇒ 200（正向对照）。**缺项那半（UI 协议格缺钥匙／缺地址）由隔离用例覆盖** —— 真栈不为此创建不完整条目（执行纪律禁止改／删用户模型条目）。
- [x] **还原**：`rag_config.json` 逐字节还原（原本不存在则恢复不存在）；其余配置只核字节指纹不变、不回显内容；清理本次创建且可确定 ID 的测试资源（不删任何非本次创建的东西）。

**实测（2026-09-29 完成：腿一 / 二 / 三 / 四 / 五 / 六 全过）**：

**前提与存档**：Gateway `:8001` 与前端 `:3000` 都 200；**跑的是新代码** —— `GET /openapi.json` 里 `RagConfigFile` 已 26 个字段且含 `wiki_model` / `synthesis_model`（描述与实现一致）。`rag_config.json` 先备份到**仓外**（md5 `323f9046…`，723 B），另记 `models_config.json` `ff8d1d5b…`、`config.yaml` `7b32d281…`、`extensions_config.json` `78088459…`。**模型候选取自 `/api/models` 的脱敏元数据**（名与来源，不出钥匙）。每次 PUT 都按 UI 的整对象规则**带出文件当前拥有的 12 个覆盖**，避免误删。

**腿一（手动／逐条重生成）—— 三级链，三个不同宿主（具名证据）**

| 步 | 配置 | 出网记录 | 结论 |
| --- | --- | --- | --- |
| A | 显式 `wiki_model=mimo-v2.6-flash` ＋ 默认 `deepseek-v4-flash` | `06:00:02 POST https://api.xiaomimimo.com/v1/chat/completions 200` | **显式压过默认** ✓ |
| B | 撤销显式（默认仍在） | `06:00:39 POST https://api.deepseek.com/v1/chat/completions 200` | **默认链接手** ✓ |
| C | 两级都撤 | `06:01:49 POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions 200` | **回落首项**（`qwen3.8-flash`）✓ |

每步之后紧跟一次条目重嵌（`PUT localhost:6333/collections/kb_wiki_entries/points` 200）⇒ 不只是"没报错"，是**打到哪个 host** 具名可辨。条目用测试2 的 dirty 条目逐条重生成（`POST …/wiki/regenerate`）。

**腿三（考题合成）—— 两级**：显式 `synthesis_model=mimo`（+默认 deepseek）⇒ `06:02:35 POST https://api.xiaomimimo.com/v1/chat/completions 200` ✓；撤销显式（默认在）⇒ `06:03:13 POST https://api.deepseek.com/v1/chat/completions 200` ✓。
⚠ **顺带查出一条文档漂移**：该端点真实请求字段是 **`doc_ids`**（422 的 `loc` 明说 `body.doc_ids` 缺失，`knowledge_bases.py:803` 也读 `body.doc_ids`），而 `backend/AGENTS.md` 那句写的是 `{doc_id, count: 1–10}` —— 旧事实，**待随 Task 5 的文档批一起修**（本轮只记录）。

**腿四（保存不丢）**：把两个新字段都设成 UI 覆盖后，做一次**无关编辑**（`judge_model` → `qwen3.7-flash`）的整对象保存 ⇒ 重新 GET ＋ **读盘上文件**都显示 `wiki_model` / `synthesis_model` 仍是 `qwen3.7-flash` 且来源 `ui`，`default_model` 也仍在；**12 个既有覆盖无一旁落** ✓。载荷按 UI 的 carry-forward 规则构造（页面上的保存按钮无法在本视口驱动，见下）。

**腿五（聊天隔离）**：RAG 侧处于 `wiki/synthesis=qwen3.7-flash`、`default=deepseek-v4-flash` 时，**普通聊天**与**知识库聊天**的模型按钮都仍是 `DashScope / qwen3.8-flash` ⇒ 聊天不跟随 RAG 字段 ✓。

**腿六（保存期检查，⑤＝甲）**：PUT `wiki_model: "ghost-entry"` ⇒ **400**，detail 恰为 `提交后的配置仍不可用：Model ghost-entry not found in config`，且 **`rag_config.json` 字节不变**（md5 复核与快照一致）✓；同一序列里所有合法名的 PUT 都是 200（正向对照）✓。缺项那半按计划由隔离用例覆盖（真栈不创建不完整条目）。

**腿二（worker 自动生成，甲：临时文档传测试1，用完按 id 删）—— 成立**

`wiki_trigger_ready` 要求 ready 占比 ≥ 0.9，而**测试2 现为 8 ready ／ 3 failed（共 11）⇒ 0.727**，自动触发在本库不会发生（探针文档传到 `ready/100` 也没触发，那轮日志只有抽取腿的 `api.xiaomimimo.com`）。按你选的甲改在**测试1**（17/17 = 1.0）做，四份临时文档 `06c23da3` ／ `6408dab9` ／ `fa1906a8` ／ `e55291be`，**用完全部按 id 删除（204×4），该库回到 17/17**。

| 步 | 配置 | 出网记录 | 结论 |
| --- | --- | --- | --- |
| 甲 | 显式 `wiki_model=qwen3.7-flash`（＋默认 deepseek） | `06:11:09 POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | **自动腿认显式** ✓；距改配置只隔 **28 秒**且进程未重启 ⇒ **③乙 的活体证据** |
| 乙 | 撤销显式（默认仍在） | `06:12:49`／`06:12:53 POST https://api.deepseek.com/v1/chat/completions 200` | **默认链接手** ✓ |
| 丙 | 配置未改再触发（该轮无候选） | —— | "没有可生成项就不打模型"，记录但不算证据 |
| 丁 | 配置未改，用提到**已有条目名**（HashMap／JVM）的文档再触发 | `06:17:32`／`06:17:35 POST https://api.deepseek.com/… 200` | **反向对照成立**：同一配置的第二次触发目标相同 ✓ |

**甲的一处代价（如实记，不可逆）**：那次自动生成重写了测试1 里 **JVM** 与 **HashMap** 两条已有条目的正文（`updated_at` 22:17:35／:37）—— 内容是重新生成的，**回不去**；**没有新建条目**（我的临时标记实体一个都没产出条目 ✓）。

**另一条环境事实**：甲那步的 `qwen3.7-flash` 调用返回 **401 Unauthorized** ⇒ 生成失败、落进既有 `except` 记了一行 `wiki generation trigger failed for kb …`（**顺带把失败收尾也验了**）。四个条目里只有它 401（mimo／deepseek 200，首项 qwen3.8-flash 也 200）⇒ 该条目的钥匙在这个网关进程里没生效，属环境事实、非本对引入；按纪律**不改用户模型条目**。

**清理与还原**：删除本次创建的探针文档（`9978d3fb…`，DELETE 204）与 staging 里当时的 **2 条**候选（按 id，204 ／ 204）；`rag_config.json` **逐字节还原**（md5 回到 `323f9046…`），另三份配置指纹**一字未动**（复核见上）；还原后 GET 复核：两个新字段回到 `null`/`config_file`、`judge`/`extract`/`vlm` 回到 `mimo-v2.6-flash`（ui）⇒ 服务热加载也顺带被验证。

**两处如实记**
1. **第一次 `wiki/generate` 打错了库**：我把日志里出现的 KB id 当成了「测试2」，实际打到了「测试1」。该调用带 `mode=incremental`，而**测试1 没有 dirty 条目** ⇒ **没有产生任何 LLM 调用或写入**（日志无对应出网记录、无 wiki 变更）；此后所有腿都在测试2 上做。
2. **合成会整份替换 staging**（该功能的既有语义）：我两次合成后 staging 里有 2 条候选，已按 id 全删；其中至少一条确为我这次产生，**无法排除另一条来自更早的会话**。

**真栈未覆盖（不冒充）**：本视口 515×557（< md 断点），且浏览器窗口不可交互 ⇒ 页面上**没有真正点过控件**；所有保存/生成都走**页面内同源 fetch**（与按钮背后同一条链路），界面的结构断言由两份 dom 用例承担。**保存按钮触发、几何/观感**仍是本轮的空白。

**腿二走的甲（2026-09-29 用户拍）** —— 该腿已按甲完成并回填在上方；原先列 甲／乙／丙 的待裁表随决定落地一并删除（决定与足迹见腿二那段）。

---

## Task 5 — 交付回写

- [x] **spec Status** 改为已交付；§6.1 的**五项均已在起草期裁定**（①甲 ②两行进既有分组 ③乙 ④甲 ⑤甲），只记录实际采用值、不重开裁定；并把 ③＝乙 的三条取值（spec D3 末）与"不破坏保证的例外"写进交付纪要。
- [x] **plan Status** 改为已交付，逐 Task 的「实测」补齐命令、数量、neuter 受害者、还原证明与门禁结果。
- [x] **盘点档**：A-7 / A-8 两条标已交付并指向本对；§4.2「对 1」勾掉；一句话结论与 §3 计数随之调整；若本对在实施中查出与盘点不符的事实，按 §5 的格式加一行「实施轮」记录，不原地改写已交付的判定。
- [x] **六角色同链复核**：确认本对交付后 RAG 的六个角色（图谱抽取／评测裁判／图片配文／视频配文／百科生成／考题合成）共用同一套解析与同一兜底顺序（`角色字段 → rag.default_model → models[0]`）、同一入口 `knowledge/model_target.py::require_usable_rag_target`，没有留下第二套语义；这一条同时兑现 spec §6.2 里「两套兜底」代价项已随 ④ 选甲消失的说法。**门 A 那两份已交付文档不回改**（原写的「在那一对里补上这两个角色」已作废）。
- [x] 提交按届时授权，Conventional Commits；不推送除非明确要求。

**实测（2026-09-29 完成，交付回写）**：

**性质**：文档回写任务 —— 无 RED／neuter／revert proof（本 Task 不改任何代码）；**未读改任何用户配置**。载体四处：spec、plan、[盘点档](../../PRE_RELEASE_HARDCODE_INVENTORY.md)、`backend/AGENTS.md`。

**① 六角色同链复核（本 Task 第 4 项；兑现 spec §6.2「两套兜底已随 ④ 选甲消失」）**

| 角色 | 入口（全部经 `require_usable_rag_target`） |
| --- | --- |
| 图谱抽取 | `knowledge/graph/extractor.py:125` |
| 评测裁判 | `knowledge/eval/factory.py:71` |
| 图片配文／视频配文 | `knowledge/vlm_target.py:84`（两条腿共用这一入口；视频腿的取模型在 `knowledge/video/captioner.py:80-82`） |
| 百科生成（手动／逐条重生成） | `knowledge/wiki/generator.py:220` |
| 百科生成（worker 自动） | `knowledge/worker.py:848` |
| 考题合成 | `knowledge/eval/synthesis.py:149` |

- **单解析器**：`resolve_rag_model_name(` 全仓只有一处**调用** —— `knowledge/model_target.py:125`（在 `require_usable_rag_target` 内部）⇒ 兜底顺序 `角色字段 → rag.default_model → models[0]` 只有一份实现，没有第二套语义可漂移。
- **`knowledge/` 内零 `models[0]`**（grep 实测 0 命中）⇒ 没有绕开链路的选模位点。
- **一处退役字段提及经核实非残留**：`knowledge/video/captioner.py:4` 写「`rag.video.caption_model` 已于 2026-09-23 R18 退役，视频腿不再有自己的那一层」—— 语义是**解释退役**、指向正确，不改（照"凡出现即清理"处理反而会删掉这条线索）。
- ⇒ 六个角色一套解析、一套兜底顺序、一套运行期检查（`require_usable_rag_target`），加上 ⑤＝甲 的保存期六字段 ⇒ 同一张功能模型视图里的六个角色不再是"四个一等、两个二等"。

**② 文档批（本 Task 的产出，逐处）**

- **spec**：Status → 已交付（含提交清单与分笔：Task 1–3 已提交、Task 4／5 另成一笔）；新增「交付纪要（2026-09-29）」五条（③＝乙 三条取值／不破坏保证的例外／实施期两处更正／六角色复核）；§6.1 的"只等开工授权"改为"已于 2026-09-29 交付"。
- **plan**：Status → 已交付（**36／36**）；Task 4 实测头部由"腿二受阻"改为"六条腿全过"；**删除回写时误留的一份重复块**（"清理与还原／两处如实记／真栈未覆盖"在 Task 4 实测里曾出现两份、逐字相同 —— Task 4 回写留下的编辑事故，本轮去重，内容不变）；执行纪律首句改为对起草轮的描述。
- **盘点档**：A-7／A-8 两节的尾部行由「✅ 已成对起草（未开工）」改为「✅ 已交付（2026-09-29）」并补交付事实；§4.2「对 1」标已交付；新增「闭合登记（2026-09-29）」段；一句话结论与 §3（16 坏 → **现存 12**、**本仓待修 11**）、§3.2（现存 7）、§4（原列表 8 条移出 2）、§4.1（13 → 11）计数同批改准；§4 第 1 项标已交付、移出可做清单；排期状态段改写；§5 新增「实施轮」两行（复选框实数 34 → 36；`MODEL_REFERENCE_FIELDS` 漏项这一"改法描述不全"）；§6.1 快照过期行在开头登记处追加一句（wiki／题目合成两行随本对过期，留作快照、等指令）。
- **`backend/AGENTS.md`**：合成段的四处 `doc_id` → `doc_ids`（触发签名／暂存元数据／请求体／状态载荷 —— Task 4 腿三的 422 `loc` 与 `knowledge_service.py:1526/1586` 都是复数；Task 3 当时只修了 `synthesize_for_docs` 的名字与签名）。

**③ 门禁**：本 Task 只动文档，无测试面；对文档里的**数字**做了回源复核 —— plan 复选框重数（31 勾 ＋ 本 Task 新勾 5 ＝ **36／36**）；盘点档各计数句逐处 grep 复核（12／11／7／6／11 五处一致）。**另在交付前把后端全量再跑一次作最终认证**（运行中，数字回填于本段之下）。

**④ 后端全量（最终认证，2026-09-29）**：`PYTHONIOENCODING=utf-8 .venv/Scripts/python -m pytest tests -q -rf -p no:cacheprovider --basetemp=.pytest-tmp` ⇒ **163 failed ／ 12734 passed ／ 109 skipped（28 分 11 秒）**。判据是**集合**：与 Task 1 那次全量的 162 条失败做逐条集合差分（两次的 FAILED 清单都落盘）⇒ **唯一新增** `tests/test_delta_channel_state.py::test_merge_message_writes_randomized_differential`，**无消失项、无其它变化**。

- 新增那条的定性：它在全量日志里的失败类型是 **`hypothesis.errors.FailedHealthCheck: Input generation is slow: Hypothesis only generated 2 valid inputs after 6.43 seconds`**（属性用例的**生成期超时**，不是断言失败、不是反例）⇒ 负载相关的环境条件红；**单跑两条都过**（单条 14.4 秒 ✓；整文件 **35／35** ✓）。与 RAG 六角色链无关、与本对无关，**本对仍是零新增真红**。
- 条数对账（可复算）：passed 由 12730 → 12734（**＋5 −1**）—— ＋5 是 Task 3 新增的 `tests/test_rag_config_example.py` 五条全过；−1 是上面那条 flake 从"过"变"红"。failed 162 → 163 即同一条。
- **全量覆盖比 Task 1 那次更广**：HEAD 已前进到 `1e7c023b`（别条线的 ASR 代码提交落在 Task 1 之后）⇒ 这次认证同时覆盖了它们；集合差分里零新增（除那条 flake）说明那批提交也没带新红。
