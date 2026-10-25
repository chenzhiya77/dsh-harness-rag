# 主体二引擎依赖瘦身 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-20-engine-dependency-slimming-design.md](../specs/2026-10-20-engine-dependency-slimming-design.md)
**Status:** ✅ 完成（2026-10-20 D1–D6 全甲；Task 0–5 全落，门禁过；已提交：`4b11bef14`…`433aa3021`＋链回填 `ce519b564`）。
**Parent:** [2026-10-20-knowledge-service-trim.md](2026-10-20-knowledge-service-trim.md) Task 3 残留「依赖瘦身另案」。

**Architecture:** 先把最小入口从 run-lifecycle／deps／扩展加载器／工具目录的导入副作用里解出来（app 层拆 accessors＋harness 包懒初始化），再用实测导入闭包收敛两处 pyproject，最后 `uv lock`＋`uv sync` 实删并做行为等价验收。检索/摄取/百科/图谱/评测逻辑零改动。

**硬约束**：主体一（deer-flow）只读；探针脚本落仓外 `E:\appdevelop\hrag-probe\`；Qdrant 共享期单写者；DSH 整重启需候令；提交候令；提交信息英文 Conventional ASCII。

---

## Task 0 — 落点核实（只读）

> 2026-10-20 已完成。

- [x] 启动导入基线：`import app.gateway.knowledge_app` = 6.25–6.31 s／2,871 模块；一级分支 `auth_disabled` 1,637／`routers` 662／fastapi 129／auth middleware 78。
- [x] 隔离测量：`runtime.user_context` 3.60 s／2,005；`services` 5.82 s／2,763；`deps` 5.88 s／2,754；`tools.builtins.graph_search_tool` 5.53 s／2,669；`knowledge_service` 5.93 s／2,792。
- [x] 死代码：§2.2 的 11 个文件全仓零调用方；`deps.py` 仅 3 个轻量 accessor 被 routers 使用，另 15 个为 run 期。
- [x] 依赖：backend 9 项、harness base 17 项无 kept import；可删包自身文件约 85 MB（duckdb 36.1／lark-oapi 17.7／kubernetes 16.2 为前三）。
- [x] 模拟解耦：2.80–2.99 s／2,155–2,180 模块（fake package＋light accessors＋lazy extension spec）。
- [x] 停点：D1–D6 待裁。

## Task 1 — app 层解耦＋死代码删除

> 动到的文件：新增 `backend/app/gateway/accessors.py`；改 `routers/models.py`、`routers/rag_config.py`、`authz.py`、`services/__init__.py`；删 spec §2.2 的 11 个文件。

- [x] 基线取证：起 8020（若未在跑），用固定题面对 t3 库跑三路 `recall-test`，响应原文存 `E:\appdevelop\hrag-probe\baseline-recall-<date>.json`（parity 判据用）。
- [x] `accessors.py`：从 `deps.py` 原样迁 `get_config`／`get_local_provider`／`get_current_user_from_request`／`require_admin_user`／`get_optional_user_from_request`；模块级只 import fastapi＋app_config，auth 依赖保持函数内 import。
- [x] 改引用：`routers/models.py`、`routers/rag_config.py` 改从 accessors 导入；`authz._authenticate` 的函数内 import 改指 accessors。
- [x] `services/__init__.py` 置为只有包 docstring；删 `deps.py`／`context_usage.py`／`langgraph_auth.py`／`run_models.py`／`checkpoint_lineage.py`／`browser_capability.py`／`pagination.py`／`path_utils.py`／`trace_middleware.py`／`utils.py`。
- [x] 门禁：`python -c "import app.gateway.knowledge_app"` 过；`ruff check` 定向净；`pytest tests/knowledge tests/test_rag_config_api.py tests/test_models_config_api.py -q` 过。
- [x] 复测导入墙钟/模块数并记录（预期去掉 services/deps 的 ~2.3 s／750 模块）。

**实测**：基线三路 recall 存 `E:\appdevelop\hrag-probe\baseline-recall-20261020.json`（vector 0.978004／0.269392／0.072026，wiki 0.662098／0.366335／0.36588，graph 8 实体＋2 证据）。新增 `accessors.py`（5 个取数器）；`routers/models.py`／`routers/rag_config.py`／`authz.py`／`auth_middleware.py` 改引用；`services/__init__.py` 置空；删 10 个死模块（含 `deps.py`，净 -2,897 行）。定向 129 passed；导入检查通过；ruff 净。导入面 2,871→2,857 模块——此时体量仍在 runtime/tools 急切导出，Task 2 处理。

## Task 2 — harness 懒初始化＋ExtensionSpec 迁移

> 动到的文件：`deerflow/runtime/__init__.py`、`deerflow/tools/__init__.py`、`deerflow/tools/builtins/__init__.py`、新增 `deerflow/config/extension_spec.py`、`deerflow/extensions/loader.py`、`deerflow/config/app_config.py`；新增 `tests/test_import_surface.py`。

- [x] `deerflow/runtime/__init__.py`：改 PEP 562 `__getattr__`＋`_EXPORTS` 映射，`__all__` 不变；首次访问时 import 对应子模块并缓存到 `globals()`。
- [x] `deerflow/tools/__init__.py`：`get_available_tools` 改为 `__getattr__` 内延迟导入；`skill_manage_tool` 维持现有懒加载。
- [x] `deerflow/tools/builtins/__init__.py`：12 个名字改为 `__getattr__` 映射到各自模块，`__all__` 不变。
- [x] 同类链断点：`deerflow/guardrails/__init__.py`、`deerflow/authz/__init__.py` 懒导出（切断 guardrail→langchain.agents）；`deerflow/agents/__init__.py` 的 `features` 懒导出；`knowledge_service.py` 的三个 `_impl` 改为 None 占位＋首次 recall 填充（保留测试 patch 接缝）。
- [x] `ExtensionSpec` 迁到 `deerflow/config/extension_spec.py`（仍为 pydantic BaseModel）；`app_config.py` 改从这里导入；`extensions/loader.py` 从新模块导入并继续对外导出。
- [x] 回归测试 `tests/test_import_surface.py`：导入 `app.gateway.knowledge_app` 后断言 `deerflow.runtime.runs`／`deerflow.tools.tools`／`deerflow.extensions.loader` 不在 `sys.modules`（子进程执行，避免污染）。
- [x] 门禁：定向测试（`test_rag_agent_assembly`、`test_recall_test_api`、`test_chunk_*`）＋`ruff check`；复测导入墙钟/模块数（目标 ≤3.2 s／≤2,300）。

**实测**：`runtime`／`tools`／`tools.builtins`／`guardrails`／`authz` 五处 PEP 562 懒导出，`agents` 的 `features` 懒导出；`ExtensionSpec` 迁 `deerflow/config/extension_spec.py`；`knowledge_service` 三个 `_impl` 改 None 占位＋首次 recall 填充。**过程中 22 条 recall 测试红**：本地 import 绕过了测试的模块级 patch 接缝；改占位＋`_load_search_impls()` 后 24 passed。新增 `tests/test_import_surface.py`（子进程断言 runtime.runs／stream_bridge、tools.tools、三个检索工具、lead_agent、guardrails.middleware、extensions.loader 均不加载；懒导出仍可解析）。导入面 **2,871→1,708 模块、6.3→3.70 s**（5 次中位，样本 3.65–4.27）；定向 147 passed＋1 条既有环境红（width migration）。

## Task 3 — 依赖声明收敛＋锁与环境

> 动到的文件：`backend/pyproject.toml`、`backend/packages/harness/pyproject.toml`、`backend/uv.lock`、`backend/.venv`（仓外产物）。

- [x] 复算 kept-code 直接 import 集（静态扫描＋启动后 `sys.modules` 分布映射），确认 §2.3 的删/留清单；动态 provider（embedder/rerank/parse/ASR）按「可选依赖」处理，不进 base。
- [x] backend pyproject：删 `lark-oapi`／`slack-sdk`／`python-telegram-bot`／`markdown-to-mrkdwn`／`wecom-aibot-python-sdk`／`dingtalk-stream`／`sse-starlette`／`e2b-code-interpreter`／`langgraph-sdk`。
- [x] harness pyproject：删 §2.3 的 20 项 base 依赖；extras 结构不动；`langchain-anthropic`／`langchain-deepseek`／`langchain-openai` 保留（模型 allowlist）。
- [x] `uv lock`（先 `--offline`，失败再走网络）→ `uv sync`；记录卸载的 distribution 清单与 site-packages 体积差。
- [x] 若 `uv sync` 后有测试因缺包 import 失败：只允许两种处理——该包属于知识面则加回；属于休眠 agent/sandbox 面则删对应测试（需在本 Task 实测中列明，不静默跳过）。
- [x] 门禁：`pytest --collect-only -q` 零错误；`ruff check` 净。

**实测**：backend 删 9 项（6 IM＋sse-starlette＋e2b＋langgraph-sdk），harness 删 17 项；`uv lock --offline` 纯删除 798 行／47 个包，无版本上浮。`uv sync --offline` 卸载 59 个 distribution；site-packages **226→167 个包、685→419.4 MB（-265.6 MB，-38.8%）**；单包大头：volcengine-sdk 151.3 MB、duckdb 36.1、lark-oapi 17.7、kubernetes 16.2。`pytest --collect-only` **1,880 件零错误**；`ruff check` 净、`ruff format --check` 698 文件全规范；`uv pip check` 只剩既有 `websockets==16.0` 固定（backend override 注释已说明）。首轮全量曾因删掉 `ddgs`／`readabilipy`／`markdownify` 红 1 条 `test_rag_agent_assembly`（config.yaml 的休眠 web 工具仍被解析）；三件加回 base 后转绿，extras 与其余 17 项不动。

## Task 4 — 门禁与真栈等价

> 动到的文件：无（探针仓外）。

- [x] 全量测试：与 10-20 保留面基线（1860 passed／8 skipped／10 failed）同集比对；新增红必须为零；10 条环境红逐条同集。
- [x] `ruff check`＋`ruff format --check`。
- [x] 8020 冷启两次：`/health` 200；日志无新增 warning/error；记录 uvicorn 就绪耗时。
- [x] 三路 recall 与 Task 1 基线逐项比对：vector/wiki 的 id、排名、分数一致；graph 的实体集合、证据 id、排名一致（分数不作逐字判据）。
- [x] 两库与 t3 文档列表同 id；配置读写（`/api/rag/config` GET、`/api/models` GET）不报错。
- [x] 收尾：停掉本次起的 8020 实例；如需长期运行，交回用户终端命令。

**实测**：8020 两次冷启均正常——06:56:52 配置加载→06:56:56 startup complete；07:19:13→07:19:16 startup complete；`/health` 200，日志零 ERROR/Traceback。三路 recall 与基线：**vector 3 条 id＋分数逐字相同**（0.978004331616569／0.2693917322619128／0.07202593845383531）；**wiki 3 条 entry_id＋分数相同**；**graph 8 实体名、2 证据 id、1 条关系、trace 全部相同**。首调冷延迟 3.5／4.9／3.2 s（三个 `_impl` 一次性导入＋provider 预热），第二调 0.72／2.20／0.51 s，与基线 0.91／2.22／0.64 s 同档。`/api/knowledge-bases`、`/api/rag/config`、`/api/models` 均 200。全量保留面 **1862 passed／8 skipped／10 failed**；10 条与 10-20 基线同集（indexer 1、parser 2、reranker 1、migration_0016 2、rag_config_probe 4，均为环境红），**零新增红**；首轮出现的 worker 并发用例单跑 6.11 s 绿，复跑全量亦绿。

## Task 5 — 收口（文档＋提交候令）

> 动到的文件：本对＋引擎 README／AGENTS。

- [x] 回写：spec Status、plan 各 Task 实测与提交链；README「安装/依赖」段补 base 依赖范围与休眠模块口径；AGENTS 若提到 services/deps 路径则同步。
- [x] 提交链：按「app 解耦／harness 懒加载／依赖声明＋锁／收口」四笔（或按实测合并），英文 Conventional ASCII；候令后执行。
- [x] 提交前 `git status` 逐文件核 hunk，排除 `.venv`、数据目录与仓外探针。

**实测**：spec 的 Status／§3 目标／§5 验收数字、plan 的 Task 0–4 实测均已回填；README 新增「依赖与启动面」段（base 范围、不再安装项、226→167 包／6.3→3.70 s）；AGENTS 的 harness 行改为「base 依赖收敛到知识面」。补核文档面：t3 列表 8 条与 DB 一致、测试库 0=0（05:30 快照里的 1 个图片文档已于 06:13:19 由一条 HTTP DELETE 删除，早于本轮改动，非本轮差异）。工作区核对：29 改／3 删／3 个新增代码文件＋本对文档，无 `.venv`、数据目录、仓外探针。收尾：本次起的 8020（PID 38204）已停，启动命令交回用户终端。

---

## 提交链（滚动记实）

- `4b11bef14` `refactor(gateway): split light accessors out of deps and drop run-lifecycle modules`
- `2c6791096` `refactor(harness): lazy-load package re-exports and move ExtensionSpec to config`
- `9851fd823` `build(deps): trim base dependencies to the knowledge surface and resync the lock`
- `433aa3021` `docs: record the engine dependency slimming and its measurements`
