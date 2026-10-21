# 引擎 + 插件 —— RAG 腿思考档位 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-21-rag-leg-effort-spec.md](../specs/2026-10-21-rag-leg-effort-spec.md)
**Status:** 立项（2026-10-21 两点裁定：逐腿选择器 / 六档原样；D3 于当晚由四档投影改为 `xhigh`、`max` 各占一项）；**Task 0–6 已完成**——引擎侧全落（Task 1 门禁 155 绿；Task 2 门禁 33 绿、`tests/knowledge` 零新增红；Task 3 caption 门禁 419 + 14 绿），三组 neuter 全过；Task 4 插件代理六档与发布口径已落（两测 27 绿、typecheck 绿、两针 neuter 各恰红 2 项）；Task 5 面板五腿选择器已落（两冒烟全绿、两针 neuter 各恰红 1 项、复刻页真量宽）；Task 6 真栈矩阵已跑（抽取/裁判/手动条目/caption/max/夹取/思考关/死端口全过；`minimal` 按已知风险被拒并留档）。Task 7 全过（引擎全量红集零新增；插件门禁全绿；真面板换模型清回由用户实点复验）。后续面板观感跟进（单框双配置 + 删重复说明 + 搜索/厂商分组）已于同日晚按用户点令实施，见「面板观感跟进」。
**Architecture:** 引擎档位词表扩到六档（`minimal/low/medium/high/xhigh/max`）；RAG 配置新增五个逐腿档位字段；四条 LangChain 腿经 `create_rag_chat_model` 传档，caption 腿在 OpenAI / Anthropic 两种直发协议下各写对应字段；插件代理不再折叠 `xhigh/max`，并停止把 DSH 默认档写进别名条目。选项来自该腿生效模型的 `supported_reasoning_efforts`。

**硬约束**：引擎只改本 plan 列出的文件，其余保持只读；探针落仓外 `E:\appdevelop\hrag-probe\`；provider key 不得进入配置、响应或日志；DSH 整重启候令；提交候令，提交信息英文 Conventional ASCII；档位只在思考开启时下发；`off` 不做档位；引擎词表只扩 `xhigh`/`max` 两项；Codex 路径不动；主树/切片树不动；手动模型条目不受发布逻辑影响。

---

## Task 0 — 落点核实（只读）

> 待开工。以下每条都要实读；任何一条与 spec 不符，先停点回报并同步 spec，不带着旧前提开工。

- [x] 档位词表与配置形状：`config/model_config.py` 的 `REASONING_EFFORT_LEVELS`/`ReasoningEffort`、排序与夹取、`ModelConfig` 校验；`RagConfig` 五个 `*_thinking` 与 `RagConfigFile` 的五条三态字段；`models/factory.py` 的 Anthropic 名表与 Codex 白名单。
- [x] 代理词表：`src/model_proxy.ts:16-24` 的 `EFFORT_ORDER`/`CANONICAL_EFFORT` 当前把 `xhigh/max` 折成 `high`；`tests/model_proxy.test.ts:74-75` 与 `test_models_config_api.py:545` 的排序错误句都钉在四档上，`app/gateway/routers/models.py:48/204` 两处描述同样钉在四档上，一并记入同步清单。
- [x] 工厂顺序：思考开的 enable 形状合并、思考关的 disable 覆盖、`supports_reasoning_effort=false` 丢弃、调用方 vs 条目默认的 reconcile、`_apply_declared_effort` 与 Anthropic 翻译；确认「思考关时传档位会覆盖 off 形状」仍成立。
- [x] 五条腿调用点：`graph/extractor.py`、`wiki/generator.py`、`worker.py`、`eval/factory.py`、`eval/synthesis.py`；确认 `create_rag_chat_model` 是唯一构造入口。
- [x] caption 链：`vlm_target.py` 的字段、`caption_client.py` 的 off/on 形状与两种请求体；确认 Anthropic 腿的档位字段名与 `minimal→low` 映射来源。
- [x] RAG 配置 API：响应值/来源循环、`_pending_rag`、保存校验的插入点、黄金文件；确认新字段会自动进响应与来源。
- [x] 引擎 `/api/models`：确认三条档位能力字段已返回（`models.py`），面板不需要新读口。
- [x] 面板：思考菜单、三个模型行组、`ragFormValuesFromConfig`、`ragBuildInput`、`ragHasChanges`、`RAG_THINKING_FIELDS`；确认 `update` 是函数式 setState，可连写 thinking＋effort。
- [x] 测试与门禁：引擎 `.venv/Scripts/python.exe` 可用；记录引擎全量基线（`pytest -m "not live" tests/` 的通过/跳过/失败数与耗时）；确认插件 `node --test --experimental-strip-types` 与仓外冒烟入口可用。
- [x] 当前工作区状态：插件 `src/model_sync.ts`、`tests/model_sync.test.ts` 有未提交改动；确认其内容与本项目 D8 的起点一致，决定「先提交再开工」还是「并入 Task 4」。

**实测（2026-10-21）**

- 静态落点与 spec §2.1 一致，逐条实读无偏差：词表、工厂四步顺序、五个 `*_thinking` 三态字段、`_pending_rag` 与来源循环、caption 的 off/on 形状与 `minimal→low` 映射、面板函数式 `update`。「思考关时传档位会覆盖 off 形状」成立（disable 形状在调用方 reconcile 之前落、`_apply_declared_effort` 在其后无条件写 `output_config`）。
- 引擎全量基线（`pytest -m "not live" tests/`，Qdrant 在线）：**11 failed / 1872 passed / 8 skipped / 0 error，553.74s**。红集 = 既有 10 条环境红（indexer 1、parser 2、reranker 1、migration_0016 2、rag_config_probe 4）+ 1 条全量顺序偶发（`test_a_second_width_change_mid_migration_is_refused`：单跑 4.22s 绿、该文件整文件 89 passed）。**零新增代码红**（红集与 2026-10-20 登记逐条相同）。⇒ 触发停点「基线本身不绿」，已回报候令，未开 Task 1。
- 插件门禁：`node --test --experimental-strip-types tests/model_proxy.test.ts tests/model_sync.test.ts` → **26 pass / 0 fail / 220.86ms**；typecheck 先做 `chore(types)` 对齐后 `npm run typecheck` **exit 0**，改用 `tsc -p tsconfig.json`（不经 `-b`，不产 `tsconfig.tsbuildinfo`）；仓外冒烟入口在位（`E:\appdevelop\hrag-probe\client-load-check.mjs`，214,436 B）。
- 工作区状态：插件仓 8 个文件有本线改动（`package.json`、`src/index.ts`、`src/jobs.ts`、`src/kb_proxy.ts`、`src/model_proxy.ts`、`src/tools.ts`、`src/model_sync.ts`、`tests/model_sync.test.ts`）；先前在飞的 `client.js`、`docs/equivalence.md` 已由另一线提交（`fcf0907`、`f7c59b9`），现树内只剩本线 diff。无 `package-lock.json`；`node_modules/` 未跟踪、仓内也没有 `.gitignore` ⇒ 提交时逐文件点名，**绝不带入 `node_modules/`**。
- 两条裁定：①type 对齐（`package.json` devDeps + typecheck 脚本、四个 `Context` 改 `@deepseek-ai/cordis`、`tools.ts` 泛型/`required`/返回值收敛、`model_proxy` 文本段收窄）落成插件仓前置笔 `chore(types)`，与 Task 4 分开；②`model_sync` 的三处既有修正（off disable 形状、空目录防删、思考开跟随 DSH 默认）属 D8 同一主题，**并入 Task 4 的提交笔**，不另立一笔。

**停点**：若 factory 顺序与 spec §2.1 不同、caption 没有可复用的 Anthropic 映射、或全量基线本身不绿，先回报再继续。

## Task 1 — 引擎：六档词表 + 配置字段 + API + 校验（TDD）

> 动到的文件：`backend/packages/harness/deerflow/config/model_config.py`、`models/factory.py`、`config/app_config.py`、`config/rag_config_file.py`、`backend/app/gateway/routers/rag_config.py`、`backend/app/gateway/routers/models.py`、`backend/tests/test_models_config_api.py`、`backend/tests/test_rag_config_api.py`、`backend/tests/fixtures/rag_config/response_golden.json`、`config.example.yaml`、`rag_config.example.json`。

- [x] **RED**：先写测试——词表六档有序（`minimal<low<medium<high<xhigh<max`）、`nearest_declared_effort` 对 `xhigh`/`max` 的同档/就近/全高三种情形、`ModelConfig` 接受两项且拒绝乱序、Anthropic 名表把两者映射到 `high`；五个字段可被 `RagConfigFile` 接受、`RagConfig` 能解析；GET 的 `config` 带五键且 `sources` 给 `ui`/`config_file`；PUT 全量往返（显式档、撤回为 `null`、省略键三态）；旧文件无五键时零变化；保存期拒绝只针对本次 payload 显式声明的档位（声明目标不存在由现有校验先拒、系统自选首模型不因档位被拒、模型不支持档位、档位不在子集）各带腿/模型/档位；config.yaml 来源的越界档位保存通过、留给运行期夹取；黄金文件更新。先跑，确认按预期红。
- [x] 实现词表扩展：`REASONING_EFFORT_LEVELS`/`ReasoningEffort` 加两项；更新 `ModelConfig` 的描述与排序错误句，以及 `models.py:48/204` 的两处描述；`_ANTHROPIC_EFFORT_NAMES` 补 `xhigh→high`、`max→high`；Codex 白名单不动。
- [x] 实现五个 RAG 字段（`ReasoningEffort | None`，`None` = 跟随）；两个 example 文件补注释行。
- [x] 在 `put_rag_config` 的现有 target 校验之后插入档位校验：只检查本次 payload 显式设置的档位键，按 pending 的「腿字段 → default_model → 首模型」解析生效模型；config.yaml 来源的值不拒（留给运行期夹取）；错误句双语、指名腿/模型/可用档位。
- [x] 门禁：`cd backend && .venv/Scripts/python.exe -m pytest -m "not live" tests/test_models_config_api.py tests/test_rag_config_api.py -q` 全绿；新增用例在无档位旧配置上不变。
- [x] neuter 两针：删掉「不在子集」分支、把来源循环对新字段短路，各恰红对应用例；按整文件备份还原。

**实测**：RED 17 条（模型 9 + RAG 8）首跑全红，RAG 侧即 `extra_forbidden`。GREEN 后两文件门禁 **155 passed / 25.25s**；`tests/knowledge/test_rag_agent_assembly.py`（读 `config.example.yaml`）9 passed；改动 8 个 py 文件 `ruff check` 与 `ruff format --check` 全绿。neuter 两针：删「不在子集」分支 → 仅 `test_put_refuses_a_leg_effort_outside_the_target_models_subset` 红（其余 4 条校验用例绿）；来源循环对新字段短路 → round-trip 与 config.yaml clamp 两条红；备份 `cmp` 逐字节还原后复跑 155 绿。

两处落地口径（与 plan 字面不同、按现场约束定）：①`rag_config.example.json` 无法承载注释，五键以 `null`（= 未声明）示例化，并 `JSON.parse` 验过；`config.example.yaml` 仍用注释行。②保存期校验只解析到「腿字段 → `default_model`」，不解析首模型——首模型属系统自选（D3 除外条款），skip 而不是判它不支持；校验落在 `_reject_unusable_role_targets` 之后、`_reject_unusable_after_save` 之前。顺带把同文件三处重复的「提交后的配置仍不可用：」前缀收成 `_STILL_UNUSABLE`（四处同措辞）。

## Task 2 — 引擎：四条 LangChain 腿传档（TDD）

> 动到的文件：`backend/packages/harness/deerflow/knowledge/model_target.py`、`graph/extractor.py`、`wiki/generator.py`、`worker.py`、`eval/factory.py`、`eval/synthesis.py`；新增 `backend/tests/knowledge/test_leg_reasoning_effort.py`（或并入现有 leg-thinking 测试文件）。

- [x] **RED**：先写测试——`create_rag_chat_model(reasoning_effort=...)` 在 `thinking=True` 时把档位传给工厂；`thinking=False` 时**不传**（断言 kwargs 无 `reasoning_effort`）；模型不支持思考时降级后同样不传；工厂会把越界档位夹到条目子集；四条腿（五个调用点）各读到自己的 RAG 字段（抽取/百科/裁判/合成；百科腿占 worker 与 generator 两处）。先跑确认红。
- [x] 实现：`create_rag_chat_model` 增加 `reasoning_effort: str | None = None`，在最终 `thinking` 为真时并入 `kwargs`；五个调用点分别传 `config.rag.<leg>_reasoning_effort`（`worker.py` 的 `_main_llm` 快路径保持现有语义）。
- [x] 门禁：`cd backend && .venv/Scripts/python.exe -m pytest -m "not live" tests/knowledge/test_leg_thinking_toggle.py tests/knowledge/test_leg_reasoning_effort.py -q` 全绿；既有 thinking 测试不改语义。
- [x] neuter 两针：去掉 `thinking` 门禁（思考关也传档）、把腿字段接到错误的腿，各恰红对应用例；按整文件备份还原。

**实测**：新文件 15 例；RED 首跑 8 红（3 条 wrapper 门禁 + 4 条腿接线 + worker 第二门）。GREEN：`test_leg_thinking_toggle.py` + 新文件 **33 passed / 5.17s**；相邻面（`tests/knowledge/eval`、`test_rag_model_wiring.py`、`test_worker.py`、`tests/knowledge/wiki`）**510 passed / 3 skipped**；`tests/knowledge` 全量 **1647 passed / 4 failed / 8 skipped（443.94s）**，4 红即 2026-10-03 登记的本机环境红四件（indexer `test_embed_missing_api_key`、parser `test_parse_pdf_full_flow`/`test_token_read_from_env_never_from_caller`、reranker `test_rerank_missing_api_key`），**零新增红**。neuter：去掉 thinking 门禁 → 6 红（wrapper 两条 + 四条「思考关 + 已存档位」）；把抽取腿接到 `wiki_reasoning_effort` → 恰红 `[extract]` 一条；备份 `cmp` 逐字节还原后 33 绿。ruff check/format 对 9 个文件全绿。

一处计划外但必要的测试夹具修改：`tests/knowledge/eval/test_eval_factory.py` 与 `test_ragas_eval_cli.py` 的 duck-typed `SimpleNamespace(rag=...)` 缺新字段，调用点新增直读后会 `AttributeError`；两处各补 `judge_reasoning_effort=None`（与当年加 `judge_thinking` 时的夹具口径一致），未改断言。

## Task 3 — 引擎：caption 两协议档位（TDD）

> 动到的文件：`backend/packages/harness/deerflow/knowledge/vlm_target.py`、`caption_client.py`、`captioner.py`、`video/captioner.py`、`config/model_config.py`（只抽共用纯函数，不改语义）；新增/扩展 caption 测试。

- [x] **RED**：先写测试——思考开 + 显式档时，OpenAI 体带 `reasoning_effort`、Anthropic 体带 `output_config.effort`（`minimal→low`、`xhigh/max→high`）；思考关时不带；腿档优先于条目 `when_thinking_enabled` 形状；Anthropic 的 enable 形状带其他 `output_config` 键时仍保留（合并写入）；越界档位按声明子集夹取（含 `max→xhigh/high`）；不支持档位的条目丢弃并 warning；`vlm_reasoning_effort=None` 时保持现有行为。先跑确认红。
- [x] 实现：`VlmTarget` 增加 `supported_reasoning_efforts`；在 `config/model_config.py` 落 `clamp_declared_effort(level, *, supports, declared)` 与 `anthropic_effort_name(level)` 两个纯函数，`resolve_effective_effort` 委托前者、factory 改调后者（不留第二份表）；`request_caption` 增加 `reasoning_effort`，在 `_apply_thinking_on` 之后写入，Anthropic 体对 `output_config` 合并写入；两条 captioner 从 `cfg.rag.vlm_reasoning_effort` 取值。
- [x] 门禁：caption 相关 `pytest -m "not live"` 全绿；`test_leg_thinking_toggle.py` 不变。
- [x] neuter 两针：让 caption 忽略显式档、把 Anthropic 映射表复制成错误的一份，各恰红对应用例；按整文件备份还原。

**实测**：RED 16 条（body/门禁 12 + `VlmTarget` 2 + 图片腿接线 1 + 视频腿接线 1）首跑全红。GREEN：caption 合并门禁（`test_caption_client`、`test_caption_concurrency`、`test_vlm_target`、`tests/knowledge/video`、leg-thinking/effort、`test_models_config_api`、`test_rag_config_api`）**419 passed**；`test_parser.py -k caption` **14 passed**；受工厂/表移动波及的 `test_worker` + `test_rag_model_wiring` + `tests/knowledge/eval` **440 passed / 3 skipped**。neuter：`_apply_leg_effort` 直接 return → 9 红（恰为全部「带档」用例，思考关/跟随 15 条绿）；在 caption 里复制一份不折叠 `xhigh/max` 的错表 → 恰红两条 fold 用例。备份 `cmp` 逐字节还原；ruff check/format 11 文件全绿。

两处实现取舍：①`VlmTarget` 是 frozen dataclass，子集存 `tuple[str, ...] | None`（未声明为 `None`，空列表在 `ModelConfig` 层已被拒）；②`_ANTHROPIC_EFFORT_NAMES` 随 `anthropic_effort_name` 从 `models/factory.py` **移到** `config/model_config.py`，factory 改为调函数——因此 Task 1 那条表内容用例的 import 跟着改指新家（同一张表、零第二份）。另加两条接线钉：图片腿在 `test_parser.py`、视频腿在 `video/test_captioner.py` 各验证 `vlm_reasoning_effort` 真到了请求体。

## Task 4 — 插件：代理词表 + 发布口径（TDD）

> 动到的文件：`src/model_proxy.ts`、`src/model_sync.ts`、`tests/model_proxy.test.ts`、`tests/model_sync.test.ts`。起点是当前未提交的三处修正（off disable 形状、空目录防删、思考开跟随 DSH 默认），按 Task 0 裁定并入本 Task 的提交笔；type 对齐另成前置笔 `chore(types)`。

- [x] **RED**：先写测试——代理 `selectEffort` 在模型声明含 `xhigh`/`max` 时原样返回、模型只到 `high` 时 `max` 夹到 `high`、`none`/`off` 行为不变、请求体 `reasoning_effort:"max"` 传到 `options.reasoningEffort:"max"`；`publishEfforts` 保留 `xhigh`/`max` 并按六档排序；`toEngineEntry` 不再输出 `reasoning_effort`/`when_thinking_enabled`，仍输出能力子集与 disable 形状；目录条目不再带 `defaultEffort`（无读点）；同步幂等与 `hidden_in_chat` 不动。先跑确认红。
- [x] 实现：`EFFORT_ORDER`/`CANONICAL_EFFORT` 改六档（移除 `xhigh/max→high` 折叠）；`publishEfforts` 保留两项；删掉默认档写入；同时删除 `defaultEffort` 的采集与传参（`buildCatalog`、`ProxyModel`/`CatalogModelLike` 与 `buildGenerateOptions` 调用点；该字段已无读点）并同步测试夹具；注释写明「跟随＝不发值，DSH 默认在调用时生效」。
- [x] 门禁：`node --test --experimental-strip-types tests/model_proxy.test.ts tests/model_sync.test.ts` 全绿；`npm run typecheck`（现为 `tsc -p tsconfig.json --pretty false`，不经 `-b`、不产 `tsconfig.tsbuildinfo`；tsconfig 只含 `src`，测试由 node 运行器覆盖）；neuter 两针（把 `max` 折回 `high`、把默认档写回）各恰红对应项。
- [x] 回写：同步修订 [2026-10-21-dsh-model-proxy-spec.md](../specs/2026-10-21-dsh-model-proxy-spec.md) 的 D4、§4.2（三行：`reasoning_effort` / `when_thinking_enabled` / `when_thinking_disabled`）、§4.4（思考菜单置灰）、§8（「开思考跟随 DSH 默认」条）（不单独提交）。

**实测**：RED 先改两测——`selectEffort` 六档原样（`max`/`xhigh` 返回自身、仅到 `high` 的模型夹到 `high`）、`buildGenerateOptions` 六档原样穿过、目录不带 `defaultEffort`、`publishEfforts` 六档排序、`toEngineEntry` 子集含 `xhigh` 且不写默认档。跑两测：27 项 **7 红 20 绿**，红项恰为 `#5`（selectEffort）、`#6`（catalog 无默认档）、`#9`（穿过）、`#18`（publishEfforts）、`#19`/`#21`/`#22`（条目形状）。实现后两文件词表六档并删折叠；`ProxyModel`/`CatalogModelLike`/`buildCatalog`/handler 调用点删 `defaultEffort`；`toEngineEntry` 删默认档写入，注释「Thinking on follows the host: send no level…」；`LlmHostLike.resolveModelInfo` 的 `defaultEffort?` 保留（宿主返回形状，本侧不读）。门禁：两测 **27/27 绿**；`npm run typecheck` 退出 0，工作区无 `tsconfig.tsbuildinfo`。neuter：①`['max','high']` 折回 → 仅 `#5`、`#9` 红（25/27）；②`toEngineEntry` 写回 `reasoning_effort: efforts.at(-1)` → 仅 `#19`、`#21` 红（25/27）；均已还原并复跑 27/27。回写：旧 spec 的 D4、§4.2 三行、§4.4（含删「主模型只读行」以与 leg-effort spec D4 对齐）、§8 已改；顺带修正 leg-effort spec §1 一句（`dsh:` 别名不再由条目默认档承载「跟随」），与 Task 4 同批。三处未提交修正（off disable 形状、空目录防删、思考开跟随）按 Task 0 裁定留在本 Task 的提交笔。**未提交**。

## Task 5 — 插件：面板五腿选择器（`client.js`）

> 动到的文件：`client.js`；仓外 `E:\appdevelop\hrag-probe\client-load-check.mjs`。

- [x] **先立断言**：仓外冒烟补 fixture 与 SSR/happy-dom 断言——五个选择器存在、六档值域（含「极高/最高」）随模型子集变化、`supports_thinking=false` 只有「关」、无档位模型只有「关/跟随」、换模型清回跟随（config.yaml 来源的档位不动）、旧思考菜单与「DSH 主模型」行消失、关思考时档位为空。
- [x] 实现：
  - `RAG_EFFORT_FIELDS`（五键）＋表单种子＋`ragBuildInput`（空值在文件持有本键时写 `null`）＋`ragHasChanges`；
  - 每腿选择器：`*_thinking` 与 `*_reasoning_effort` 合成一个控件；值域 `关 / 跟随模型默认 / 最低 / 低 / 中 / 高 / 极高 / 最高`；关 → `thinking=false` + 档位清空；跟随 → `thinking=true` + 档位空；档位 → `thinking=true` + 档位值；
  - 选项解析：生效模型 → `supports_reasoning_effort` 与 `supported_reasoning_efforts`；未声明子集＝六档全开；
  - 模型行改造：抽取组、评测组、多模态组各加选择器；删除 `thinkingMenu` 与 `dshMainModel` 行；保留 `dshModelStatus.mainModel` 为主机诊断字段；
  - 换模型时就地清回本面板持有的跟随（config.yaml 声明的档位不动，选择器显示该值）；`supports_thinking=false` 只留「关」、`supports_reasoning_effort=false` 只留「关/跟随」，其余禁用并给「由模型能力决定」的说明；
  - zh/en 字典增删同步。
- [x] 门禁：`node --check client.js`；`node E:/appdevelop/hrag-probe/client-load-check.mjs` 与 `SMOKE_HOSTLESS=1 node ...` 均 ALL PASSED；happy-dom 真挂载覆盖五个选择器。
- [x] neuter 两针：让「关」保留档位、换模型不清回，各恰红对应断言；还原。

**实测**：先改仓外冒烟（`E:\appdevelop\hrag-probe\client-load-check.mjs`）——SSR fixture 补五腿能力/声明子集；新增「per-leg effort form logic」块（值域、关清档、换模型清回、config.yaml 不动、载荷空值）；happy-dom 段重写为五选择器（非思考模型只有「关」、声明子集只列子集、无档位模型只有「关/跟随」、旧思考菜单与「DSH 主模型」行消失）。RED：`five per-leg effort selectors render` 0 !== 5。实现：`RAG_EFFORT_FIELDS`/`RAG_LEGS`/`RAG_EFFORT_LEVELS`＋种子/载荷/hasChanges＋五个纯函数；`effortSelector` 与 `legModelRow` 把模型和档位放进同一控制列（VLM 行同样）；旧 `thinkingMenu`、五勾选 CSS、DSH 主模型行与旧文案删除；zh/en 新增八条档位文案；`.hrag-set-pair` 宽档并排、窄档由 `flex-wrap` 退化为两行。门禁：`node --check client.js` 过；两冒烟均 ALL PASSED（happy-dom 五选择器＋hostless）；picker 计数更新为 17/18/19。neuter：①「关」不清档 → `Off clears the level` 红；②换模型不清回 → `owned level outside the new subset resets to follow` 红；均已还原并复跑全绿。复刻页量宽（仓外 `effort-pair-check.html`，真浏览器）：modal 568（content 540、pair 396）五腿均并排、行高 32、无溢出；modal 468（pair 296）折成两行（行高 72：模型占满首行、档位 156 次行）。真栈按面板实际宽度复验后再定是否收窄档位控件。DSH 未整重启，真栈视觉/交互留 Task 6。**未提交**。

## Task 6 — 真栈验收

> 动到的文件：无（探针与证据在仓外）。

- [x] 前置：DSH 整启（候令）、引擎 8020 token 模式、Qdrant；至少两条 `dsh:` 别名与一条手动条目可用。
- [x] 矩阵：
  1. 抽取腿设「低」、裁判腿设「高」，各跑一条腿；确认两条腿各自按档下发（引擎侧构造探针断言 kwargs；真跑确认被 DSH 接受）；
  2. 若目录里有声明 `xhigh`/`max` 的模型，各跑一条确认代理原样交给 DSH；当前盘上（`task4-models-config.json`）没有这样的条目时，记「不可执行」并由代理单测证身份传递。在只声明到 `high` 的模型上请求 `max`，确认夹到 `high`；
  3. caption 腿设显式档跑通；再验「跟随」不写任何档位；
  4. 手动条目设档位跑通；
  5. 任一腿思考关 → 确认请求里没有档位、disable 形状仍生效；
  6. 换模型到不支持该档的条目 → 面板清回跟随；
  7. `minimal` 在思考开启路径实测（风险项）；若被 DSH/provider 拒绝，记录原始形状并回报，不静默改档；
  8. config.yaml 写入越界档位 → 运行期夹取 + warning，腿不失败；
  9. DSH 停止 → 别名腿错误可读，手动条目仍可用。
- [x] 证据落 `E:\appdevelop\hrag-probe\`：面板截图、引擎构造/kwargs 探针输出、请求体探针、腿运行日志；不写密钥。

**实测（2026-10-21）**

- 前置：DSH 整启后端口 49577；插件发布 5 条别名——`deepseek-account` 子集 `low/high/max`、`xiaomi` 子集 `minimal/low/medium/high`，均无默认档、`when_thinking_disabled` 为 `off`；手动条目 `mimo-v2.6-flash`（`low/medium/high`）可用；引擎 8020 token、Qdrant 6333。
- 面板：用户截图归档 `_t6-panel-effort-menu.png`——图谱抽取模型为 `MiMo-V2.6-Flash · xiaomi`，档位菜单恰为「关 / 跟随模型默认 / 最低 / 低 / 中 / 高」，与 xiaomi 声明子集逐项一致，无极高/最高；模型行与档位行同列，窄宽折两行。用户已把 `extract_model` 存为 `dsh:xiaomi/mimo-v2.6-flash`（其余字段未动）。
- 矩阵 1（构造 + 真跑）：本地 capture sink 收到四条 LangChain 腿各自的请求体，档位依次为 extract `low` / wiki `low` / judge `high` / synthesis `low`，模型名与腿一一对应；真跑 `extract_graph`（xiaomi 别名 + `low`）返回 4 实体/3 关系，`build_judge_llm`（deepseek-account 别名 + `high`）返回 `ok`。证据 `_t6-capture-bodies.json`、`_t6-real-runs.json`。
- 矩阵 2：`max` 在 `dsh:deepseek-account/deepseek-flash` 上真跑返回 `ok`；`xhigh` 无任何模型声明，记「不可执行」，由代理单测证身份传递（`_t6-proxy-unit.txt` 17/17）。high-only 模型（`low/medium/high`）请求 `xhigh`/`max` 均夹到 `high`，warning 两条、腿不失败（`_t6-clamp.json`）。
- 矩阵 3：caption 显式 `high` 的请求体带 `reasoning_effort:"high"`、`max_tokens` 拉到 4096 下限；「跟随」请求体无 `reasoning_effort` 键；两条在 xiaomi 别名上真跑均返回图片描述（`_t6-capture-bodies.json`、`_t6-real-runs.json`）。
- 矩阵 4：手动条目 `mimo-v2.6-flash` + `high` 真跑返回 `ok`。
- 矩阵 5：思考关的 LangChain 腿请求体没有档位、只带 disable 形状（capture 为 `reasoning_effort:"none"`）；别名的 disable 形状为 `off`，真跑通过；caption 思考关同理（`_t6-capture-bodies.json`、`_t6-offreal-deadleg.json`）。
- 矩阵 6：换模型清回跟随由客户端冒烟覆盖（Task 5 同一代码路径；neuter 曾令该断言恰红，`_t6-client-smoke.txt`）；真面板未点按，不宣称真栈点过。
- 矩阵 7：`minimal`（xiaomi 别名、思考开）被 DSH/provider 拒绝——代理原始返回 `502 {"error":{"message":"The model call failed.","type":"proxy_error","code":"model_call_failed"}}`，请求体为 `reasoning_effort:"minimal"`；同模型 `low` 返回 200。未静默改档；与 spec §8 已登记风险一致。
- 矩阵 8：以 config_file 同义方式把 `extract_reasoning_effort` 设为 `xhigh`/`max`（high-only 模型），运行期均夹到 `high` 并各打一条 warning，腿不失败；未改用户 `config.yaml`（`_t6-clamp.json`）。
- 矩阵 9：以死端口模拟 DSH 不可达——抽取腿报 `extraction LLM call failed after 3 attempts: Connection error.`（可读、含尝试次数），手动条目同时返回 `ok`；真实停止 DSH 未执行，避免打断当前 DSH 会话（`_t6-offreal-deadleg.json`、`_t6-deadport.json`）。
- 裁判腿未跑完整 ragas（引擎未装可选 extra），构造 + 真实调用已覆盖代理接受面；caption 首次用 1×1 PNG 两条 502，换真实截图后通过，属探针素材问题而非档位。
- 证据汇总 `_t6-summary.md`；探针 `leg_effort_probe.py`、`dsh_rag_probe.py`；不打印密钥。**未提交**。

## Task 7 — 收口

- [x] 引擎全量：`cd backend && .venv/Scripts/python.exe -m pytest -m "not live" tests/ -q` 后台跑；与 Task 0 基线比，红集零新增；重点看 `test_models_config_api`、caption 两组、leg-thinking 三处。
- [x] 插件门禁全跑：`node --check client.js`、两条冒烟、`tests/model_sync.test.ts`、`npm run typecheck`（`tsc -p tsconfig.json --pretty false`）。
- [x] 文档：spec/plan 全部勾选并回填实测；两个 example 文件与既有 model-proxy spec 修订到位；README 若涉及功能模型说明则同步。
- [x] 检查无隐藏状态：关思考的腿在 `rag_config.json` 不留档位；换模型的清回行为在真栈复验过。
- [x] 呈报「未提交」并列出两仓改动文件。

**实测（2026-10-21）**

- 引擎全量：**12 failed / 1917 passed / 8 skipped / 23 warnings，379.51s**。红集 = 基线 11 条 + `tests/knowledge/graph/test_graph_indexer.py::test_concurrent_results_match_serial_including_order`（并发时序 flake：单跑 4.30s 绿；同文件首跑 1 failed / 10 passed；立即复跑 11 passed）。**零新增代码红**；通过数 1872→1917（新增用例）。基线红集逐条相同：indexer 1、parser 2、reranker 1、migration_0016 2、rag_config_api 顺序偶发 1、rag_config_probe 4。
- 插件门禁：`node --check client.js` 过；`tests/model_sync.test.ts + tests/model_proxy.test.ts` **27 pass / 0 fail**；`npm run typecheck` exit 0；仓外 `client-load-check.mjs` 默认与 `SMOKE_HOSTLESS=1` 均 `ALL CLIENT SMOKE CHECKS PASSED`（含五腿选择器与换模型清回断言）。
- 文档：`config.example.yaml`（2639–2643 五条注释）、`rag_config.example.json`（五键 null）已在位；插件 `README.md` / `docs/equivalence.md` 无功能模型档位描述，无需补；spec §8 的 `minimal` 风险已由「尚未实测」改为实测事实并 **D1 已裁＝甲**（保持现状：面板照 DSH 声明展示，拒绝时由腿报错；发布不剔除 `minimal`）。
- 无隐藏状态：`rag_config.json` 五条 `*_reasoning_effort` 均为 null、五条 `*_thinking` 均为 null（跟随 config.yaml）；用户面板保存的 `extract_model=dsh:xiaomi/mimo-v2.6-flash` 保留未还原。换模型清回已由用户真面板点按复验通过（2026-10-21）。
- 未提交文件：引擎 27 改 + 1 新测（`backend/tests/knowledge/test_leg_reasoning_effort.py`）；插件 10 改（`client.js`、`package.json`、`src/index.ts`、`src/jobs.ts`、`src/kb_proxy.ts`、`src/model_proxy.ts`、`src/model_sync.ts`、`src/tools.ts`、两测试）+ 本线 3 个未跟踪 docs（另有另一线 `panel-surface` 的 spec/plan 与 `node_modules/` 未跟踪，提交时逐文件点名）。`client.js` 含另一线面板底色改动，提交本线前须分 hunk。

## 面板观感跟进（2026-10-21，用户点令）

- [x] 两框并排 → 单框双配置：触发盒显示模型＋档位；根面板两格（模型／思考档位）→ 下钻列表；下钻页返回箭头＋页名，Escape 先退页再关闭。
- [x] 模型页加搜索框（候选 >4 时出现，照 DSH 阈值）、按 provider 分组（组标题＝厂商显示名，条目名去掉「 · provider」后缀，手动条目末组，默认项置顶）。
- [x] 删除「DSH 模型」卡片的说明段落（同文已在组标题悬停提示里）。
- [x] 几何对齐 DSH 参考实现（根格 34px、条目 34px、返回/右箭头 12px、搜索行无边框、分组标题 12px）；旧的 `.hrag-set-pair` / `.hrag-set-effort` 残件清零。
- [x] 第二轮对齐（用户看图点名）：组标题改取宿主 `MenuGroup` 口径——11px/16px、`4px 7px 2px`、默认透明、组包 section、钉住时 `data-stuck` 填 `--dsw-alias-menu-group-header-fill`、组间 3px；厂商名用 `DeepSeek 账号`（其余 provider id）。
- [x] 档位标签改英文（`Off / Default / Minimal / Low / Medium / High / Xhigh / Max`），与 DSH 适配器给出的 `effort.name` 同名，不进 zh/en 字典。
- [x] 触发盒与根面板只显示模型名（显示名去掉「 · provider」后缀），模型页条目同口径。
- [x] 「使用配置默认」不再像一条游离的模型：文字降为次级色，并在其下加细分隔线，与厂商组分开。
- [x] 框内下拉件（ASR Model ID / 维度档位）中轴对齐：Menu 包裹层与按钮统一 flex 居中、图标 16×16 块级。
- [x] 菜单上下翻转缺陷修复：打开时先按根页真实高度（两格≈84px）定位，下钻/搜索后再按实测高度重放；修掉靠底部腿（VLM 必现）菜单被甩到面板顶部的问题。
- [x] 门禁：插件 `node --test` **27 pass**、`tsc -p tsconfig.json` exit 0；仓外冒烟 SSR 计数与 happy-dom 交互（根两格、下钻、Off 清档、能力说明、搜索过滤、厂商分组、Escape 两级、选中关闭）全绿；本轮补断言：组标题 `DeepSeek 账号`、英文档位、触发盒无厂商后缀。
- [x] 清理非 DSH 模型（用户点令，2026-10-21）：删掉 UI 手工条目 `deepseek-flash`、`mimo-v2.6-flash`；移除 `config.yaml` 的 `qwen3.8-flash`/`deepseek-v4-flash`/`qwen3.7-flash` 三条；五腿改指 DSH 同名模型（default/vlm→`dsh:xiaomi/mimo-v2.6-flash`，wiki/judge/synthesis→`dsh:opencode-go/qwen3.8-flash`）。备份在 `E:/appdevelop/hrag-probe/_cleanup-backup-20261021/`；引擎按配置签名热重载，免重启。API 复核：models 35 条全为 `dsh:`，五腿值均为 `dsh:`。
- [x] 默认项文案去掉括号：`使用配置默认`（en `Use config default`），腿选择器、默认模型、VLM 空值三处同步。
- [x] 「RAG 默认模型」换用同一套模型菜单：触发盒只显示模型名，打开即模型页（厂商分组/搜索/空值项），无根页与档位格；菜单宽度封顶 420px。
- [x] 默认档显示照 DSH（2026-10-22）：跟随态在触发器显示宿主默认档名，未声明默认档才显示 `Default`；`defaultEffort` 仅经 `dshModelStatus.defaults` 供显示，不进引擎条目。门禁：插件 28 单测、`tsc` exit 0、冒烟全绿（新增默认档断言）。
- [x] 真面板复验：DSH 整启后五腿点按（根面板/模型页/档位页/搜索/换模型），2026-10-21 用户复验通过。

---

## 提交链（已落）

> 提交信息英文 Conventional ASCII；文档随代码走，不单落空文档笔。

**引擎仓（`E:\app\python\agent\harness-rag`）**

1. `cf9a99fda` `feat(models): add xhigh and max reasoning-effort levels` — 词表、排序/夹取、ModelConfig 与 models API 的描述和错误句、Anthropic 名表、测试；Codex 白名单不动。
2. `41cf1cb67` `feat(rag): add per-leg reasoning-effort fields to rag config` — 配置双入口、API 往返、来源、保存校验、黄金文件、example。
3. `3ff54ca5f` `feat(rag): pass per-leg reasoning effort to the langchain legs` — `create_rag_chat_model` + 四个调用点 + 测试。
4. `b36e39e16` `feat(rag): apply per-leg reasoning effort to the caption legs` — VLM target 子集、两协议请求体、共用夹取/翻译、测试。

**插件仓（`E:\app\python\agent\dsh-harness-rag`）**

5. `943c6b9` `chore(types): align the plugin with the host cordis types` — **前置笔**：`package.json` 增 devDeps（typescript、`@types/node`、`@deepseek-ai/cordis`）并把 typecheck 改为 `tsc -p tsconfig.json --pretty false`；四个 `Context` 的 type-only 导入改 scoped 包；`tools.ts` 的 `defineTool` 输出泛型、`required: true as const`、`JsonValue` 返回；`model_proxy` 文本段收窄。零运行时行为变化，`node --test` 与 `typecheck` 双绿。
6. `faf85a4` `feat(models): keep xhigh and max effort levels end to end` — 代理六档词表＋发布保留两项＋去掉默认档写入；并入当前未提交的三处修正（Task 0 裁定：同属 D8，不拆笔）＋测试。
7. `1c33548` `feat(panel): pick a thinking effort per rag leg` — 五腿选择器、删旧思考菜单与主模型行、文案、仓外冒烟。
8. 本对 spec/plan 已按压合口径并入第 7 笔；`dsh-model-proxy` 的文档收口见其 plan 提交链。

**压合口径**：同仓相邻、同主题的文档笔并入代码笔；引擎仓第 1–4 笔各自独立成笔（词表、配置/API、LangChain、caption 四层可分别回退）；插件仓第 5 笔是唯一与功能无关的前置笔，单独可回退。提交前逐笔看 hunk，不把 `models_config.json`、`rag_config.json`、`node_modules/`、日志、探针产物带入。
