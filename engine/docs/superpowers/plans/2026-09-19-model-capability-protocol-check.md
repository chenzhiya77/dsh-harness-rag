# 能力声明 × 协议：写入期核对 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-19-model-capability-protocol-check-design.md](../specs/2026-09-19-model-capability-protocol-check-design.md)
**Status:** 进行中 —— **Task 1 已交付**（RED 4 红 → GREEN 41 绿 → neuter 4 红 / 2 红 → 窄面 166 绿 → 全量 144 红全为基线、**双向 diff 零新增**）；**Task 2 已交付**（RED 1 红 / 1 绿 → GREEN 89 绿 → neuter 1 红 / 1 红 → 窄面 168 绿 → 全量 136 红全为基线、**双向 diff 零新增**）；**Task 3 已交付**（RED 4 红其中 2 条前提有误已重做 → `pnpm check` 零诊断 → neuter 2 / 2 / 0（另补测两洞同开 = 1 红）→ **全量前端 238 文件 / 2569 用例 / 0 失败**、prettier 零新增区块）；**Task 4 已交付**（两份 `AGENTS.md` 同步 + 真栈真 PUT **两条腿都过**、配置**逐字节还原** md5 未变）—— ✅ **"浏览器那一步"已于 2026-09-19 补做并通关**（见 Task 4 腿② 的补记）（2026-09-19 起草；**同日两轮更正**：① 按 10 条审查意见——D2 从"通用未知键表"收窄成"只查 `reasoning_effort` 的针对性 lint"（原方案会推翻 `test_model_factory.py:1473` 那条带回归注释的既有断言）、D3 从"切换时清空"改成"**提交时强制清空**"（原方案会让带旧数据的 anthropic 条目在编辑对话框里被永久锁死）、四个测试载体点名、删掉不必要的 i18n 项、补上"向导建议按 provider 过滤"与"界面填不了预算"两处缺口；② **第二次核实推翻了一个前提**：Anthropic 协议**有** effort 档位，名字是 `output_config.effort`（`anthropic` 0.97.0 稳定版 `message_create_params.py:138`，值域 `low/medium/high/xhigh/max`），`reasoning_effort` 只是 **OpenAI 的名字** ⇒ D1 的**结论不变、理由与文案已改**；"丁"从"包 thinking 预算"改成"**档位→`output_config.effort` 的映射**"（本机实测这条路今天就是通的））
**Parent:** [2026-09-10-model-capability-config-design.md](../specs/2026-09-10-model-capability-config-design.md)（能力声明层；本计划补它缺的第二道：**声明必须与协议对账**）

**Architecture:** 三处**纯收紧**，都在既有机制上：**写入口**加一条 422（只针对 `provider=anthropic` + 推理档位三件套）、**工厂**加一条只查 `reasoning_effort` 的**针对性 lint**（只记日志；**不**做通用未知键表，那会误报 `frequency_penalty` 这类合法透传名）、**界面**按 provider 决定那两格渲不渲染并在**提交时清空**（编辑旧条目等于顺手修数据）。`openai-compatible` / `deepseek` 的行为**一字不改**；`config.yaml` 手写条目只警告不阻断。

**依赖顺序**：Task 1（写入期）→ Task 2（针对性 lint）→ Task 3（前端）→ Task 4（文档 + 真栈）。Task 2 与 Task 1 相互独立，但先 1 后 2 能让 Task 2 的用例直接引用"被拒的那种条目"。

---

## Task 0 — 开工前的五项核实（只读，不改代码）

- [x] 1. **写入期的确切落点与形状**：`_validate_capabilities`（`:244`）的调用位置（`put_models_config` 的条目循环内、`atomic_write` 之前）与现有 422 的文案形状（`Model '<name>' has an invalid capability configuration: <msg>`，msg 来自 `ValidationError` 第一条并去掉 `Value error, ` 前缀）。
     **核实结果**：循环在 **`:623`**（`for item in body.models:`），`use = resolve_provider_use(item.provider)` 在 **`:631`**（⇒ `item.provider` 就在手边），`stored_entry` 在 **`:657`**、`_validate_capabilities(item.name, stored_entry)` 在 **`:658`** ⇒ **新检查插在 `:658` 之后、另传 `item.provider`**（不要塞进只收 `(name, entry)` 的那个函数）。422 由 `_validate_capabilities` 自己抛，形状与上面一致。
- [x] 2. **工厂守卫的门与判据**：`_warn_unknown_model_settings` 的签名与"家族门"，以及它拼 `valid_names` 的三步。
     **核实结果**：`def _warn_unknown_model_settings(model_class, model_name, model_settings_from_config)` 在 **`:76`**，家族门 `if not issubclass(model_class, BaseChatOpenAI): return` 在 **`:95`**；`valid_names = model_fields 键 ∪ 别名 ∪ {model, model_kwargs, extra_body, default_headers, default_query, stream_usage, stream_chunk_timeout, reasoning_effort}`；警告措辞是 _"config key(s) %s are not recognized parameters of the model class and will be forwarded as-is; this may raise at request time. Check for typos…"_。**控制组**：`test_model_factory.py:1473`（`ChatAnthropic` + `frequency_penalty` + `api_base`）断言**无**该警告且 `api_base` 原样透传 ⇒ 本对的 lint **不许破它**。
     ⚠️ **本条记的是 T0 开工那一刻的行号与措辞**（行号本就随改动漂移，别当现状）。其中**那句措辞已被 Task 2 改掉**：`…and will be forwarded as-is; this may raise at request time.` 现为共享常量 `_KWARG_DIVERT_CONSEQUENCE`（`…moved into `model_kwargs`…rejected at request time.`）——**要引用现状请读 Task 2 的 GREEN 纪要，别照这条 grep**。
- [x] 3. **前端：编辑对话框的提交路径**：`models-edit-dialog.tsx` 的 `capability` 初值、`onSave` 组装处、provider 是否只读。
     **核实结果**：初值在 **`:62-68`**（`useEffect` → `setCapability(capabilityValueFromModel(model))`）；**提交组装在 `:76`**，其中 `provider: (model.provider ?? "openai-compatible")` **直接取自条目、界面无切换控件 ⇒ provider 确认只读**。⇒ **"提交时清空那三个字段"的最小落点就是这个 `onSave` 组装处**（不必改编辑器内部）。
- [x] 4. **前端：向导那一侧**：`models-add-dialog.tsx` 的 provider 状态与切 provider 的 handler、`suggested` 的来源、建议按什么匹配。
     **核实结果**：`provider` 状态在 **`:65`**，切换 handler 就是 Select 的 `onValueChange`（**`:204`**，三个选项 openai-compatible/anthropic/deepseek）；第二步的种子在 **`:143`**：`capabilityValueFromSuggestion(suggestCapabilities(ids[0] ?? ""), …)`，而 `suggestCapabilities(modelId)`（`capability-registry.ts:89`）**只按模型 id 匹配、不认识 provider**。
     ⇒ **"向导建议按 provider 过滤"的落点定在调用处（`models-add-dialog.tsx:143`）**，不必动 registry 的既有规则；"切到 anthropic 时清空表单值"挂在 **`:204`**。
- [x] 5. **真栈前置**：网关 + 前端在跑；**动手前 `cp` 一份 `models_config.json` 原始字节**；确认当前 UI-managed 条目清单。
     **核实结果**：`:8001`/`:3000` 都 200；快照 `cp` 到 `/tmp/models_config.task0.json`，**md5 `e17ad9984f2c081361837d8809e5e39d`**；当前 UI 条目 **4 条**：`deepseek-flash` / `ZHIPU/GLM-5.3-Flash` / `deepseek-v4.1-flash` / **`minimax-m3`（`use=langchain_anthropic:ChatAnthropic`）**。
     ⚠️ **`minimax-m3` 已经回来了、而且仍带着那三件套**（`supports_reasoning_effort: true` + 四档 + `reasoning_effort: "medium"`，`base_url=https://opencode.ai/zen/go`）⇒ **验收第 7 条（加载旧条目 ⇒ 直接保存 ⇒ 修好）与 Task 4 的真栈腿① 现在都有真实靶子**，不必先造一条。

**门禁**：无（只读）。

---

## Task 1 — 写入期拒绝 `anthropic` + 推理档位三件套（D1）

- [x] **RED**（写进 `backend/tests/test_models_config_api.py`，挨着既有 `:542` 那条参数化校验用例、风格照抄）：
  1. `provider="anthropic"` + `supports_reasoning_effort: true` ⇒ **422** 且 `detail` 同时含条目名与该句"这条协议的名字是 `output_config.effort`"（**不是**"这家没有 effort 参数"——2026-09-19 第二次核实已更正，见 spec §1/§6）；
  2. 同一 PUT 换成只带 `supported_reasoning_efforts`（布尔为假）⇒ **422**；
  3. 同一 PUT 换成只带 `reasoning_effort` ⇒ **422**（三条分开测，证明规则看的是**三个字段各自**，不是只看布尔）；
  4. **对照组**：`provider="openai-compatible"` 与 `provider="deepseek"` + 同样的三字段 ⇒ **200**（不误伤）；
  5. **放行**：anthropic 条目不带这三字段 ⇒ **200**，且写回文件里这三个键**不出现**。
     **实测 RED = 4 红 / 37 绿**：四条失败全是 `assert 200 == 422`（正是"今天不拦"这件事）。新增两组对照**首跑即绿**：`openai-compatible` / `deepseek` + 同样三字段 ⇒ 200（**控制组**，证明规则只按 provider 生效），以及"清干净就放行 + 写回不含这三键"（后者是"修法本身能通过"的正向锚）。
     ⚠️ **RED 期自己抓到一个前提错了的用例（已改）**：最初把单字段用例建在"完整三件套"的基底上 ⇒ 只改子集那一档会被**既有**的"默认档必须属于子集"规则先 422 掉，于是那个用例**红得对、理由错**（断言 `output_config.effort` 才把它拦下来）。改成**干净基底 + 单字段覆盖**，并补了第 4 档"三件套一起"（真实世界的那副样子）。
- [x] **GREEN**：在 `put_models_config` 的条目循环里、`_validate_capabilities(...)` 之后加一条 `_reject_anthropic_effort_levels(item.name, item.provider, stored_entry)`（`provider == "anthropic"` 时检查那三个键）。⚠️ **判据是"真值/非空"，不是"键存在"**：`stored_entry` 里 `supports_reasoning_effort` **恒存在**（输入模型默认 `False`，只有 `None` 会被剔），写成 `in` 会把每条 anthropic 条目都拒掉。文案按 spec §2 D1（点名条目 + 原因 + 下一步）。
      **实测**：新函数落在 `_validate_capabilities` 旁边（`routers/models.py`），调用点在 **`:658` 之后**；**41 passed**（0 failed）、`ruff check` + `format --check` 干净。窄面 `test_models_config_api.py + test_model_factory.py + test_models_config.py` = **166 passed / 1 failed**，那一条是**已知环境条件红** `test_models_config.py::test_missing_models_file_falls_back_to_config_yaml`（仓库根真实 `models_config.json`，属基线 145）。
- [x] **neuter 两条（都必须有牙）**：① 把 anthropic 分支整个去掉 ⇒ 用例 1/2/3 全红；② 把判断写成"只看 `supports_reasoning_effort`"（漏掉另两个字段）⇒ **用例 2/3 红**（证明三条字段各有牙，而不是一条覆盖三条）。
      **实测**：① 注释掉调用点 ⇒ **4 红**（四档全中）；② 判据收成只看布尔 ⇒ **2 红**（正是"只带子集""只带默认档"那两档，第 4 档"三件套一起"因含布尔仍被拦 ⇒ 绿）——两条都**回退后复跑确认回到 41 绿**。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`tests/test_models_config_api.py` + `tests/test_model_factory.py` + `models/` 相关）绿；**先在门禁前扫一遍既有夹具的载荷**（已核：`_CAPABILITY_MODEL`（`:490`）是 `openai-compatible`、`_seed`/`deepseek` 那些也不带这三字段 ⇒ **8 条既有参数化用例不受影响**；若实地发现别的夹具带这三字段，**给它补值而不是放宽检查**）；**全量后端后台跑**，跑完抽全部 FAILED+ERROR 的 node id 去 HEAD 跑同一批、**双向 diff**（`xargs -d '\n'`，别 pipe 长跑；HEAD 那棵树要先 `cp` 仓库根本地环境文件进去，否则 4 条环境红会假报成本轮新红）。
      **实测（本轮零回归）**：全量 = **144 failed / 12413 passed / 109 skipped**（17m22s）。抽 144 个 node id ⇒ `git worktree add --detach` 出一棵 HEAD 树（`cp` 进 `config.yaml`/`models_config.json`/`extensions_config.json`/`rag_config.json` 四个本地环境文件）、跑同一批 = **130 红**。**双向 diff 结果：`只在 HEAD 红` = 空**；`只在工作树红` 14 条，逐条落实：
      - **13 条是"全量顺序"假象**——单独跑（工作树与 HEAD 两侧各跑一次）**都 13 passed**（`test_dev_entrypoint.py` 的 7 个 metacharacters 档、`test_checkpointer.py` 两条打包、`test_pnpm_script.py`、`test_extension_api_contracts.py`、`test_thread_id_route_contract.py`、`test_delta_channel_state.py::…randomized…` 等）。
      - **1 条是已知 PYTHONPATH 形态条件红** `test_review_changed_public_skills.py::test_main_exits_nonzero_when_review_cli_reports_error`（断言要正斜杠 `PYTHONPATH`）——用 `PYTHONPATH=.` 在 **HEAD 树上同样红**，与本轮改动无关。⚠️ 这里踩了一个 confound：首次 HEAD 跑我用的是**绝对正斜杠** `PYTHONPATH`，那一条便是绿的、差点被读成"我的改动把它弄红了"；两侧必须用**同一个** `PYTHONPATH` 才有可比性。
      - **我改的两个文件无一命中**（144 条里与 `models` 相关只有 3 条，都是仓库根真实 `models_config.json` 造成的老环境红）。
      ⇒ **Task 1 无新增红**。收尾：worktree 已 `remove`、`.pytest-tmp` 与 `/tmp/t1-*` 已删。

## Task 2 — 工厂：`anthropic` 家族的**针对性 lint**（D2，**不是**通用未知键表）

- [x] **RED**（写进 `backend/tests/test_model_factory.py`，挨着 `:1410` / `:1429` / `:1473` / `:1540` 那一族）：
  1. `ChatAnthropic` 类 + 条目里带 `reasoning_effort` ⇒ **一条**警告，且**不抛**（构造期成功）；
  2. **对照组**：同一条目换成 `ChatOpenAI` ⇒ **不**打这条（证明它是**分家族**的，不是"一律警告"）；
  3. **控制组（既有断言，不许破）**：`test_no_unknown_key_warning_for_non_openai_class`（`:1473`，`ChatAnthropic` + `frequency_penalty`）**逐字不变且保持绿**——它就是"不许退化成通用未知键表"的看门人。
      **实测 RED = 1 红 / 1 绿**：用例 1 红在 `assert 0 == 1`（今天一条都不打），用例 2 **首跑即绿**（**控制组**，不是"已通过的功能"）。用例 1 的条目形状是关键：`supports_reasoning_effort: True` 才让键活到构造期（`factory.py:278` 否则就 pop 了），且调用方不传 level（`:325` 会 pop）——正是 `minimax-m3` 那副样子。
      **题目（真实客户端实测，非桩）**：`ChatAnthropic(model='claude-x', api_key=…, reasoning_effort='medium')` ⇒ `model_kwargs == {'reasoning_effort': 'medium'}`、`_get_request_payload` 的键 = `['max_tokens','messages','model','reasoning_effort']`、LangChain 自己只打了 `WARNING! reasoning_effort is not default parameter` ⇒ 前提逐字成立。
- [x] **GREEN**：在 `_warn_unknown_model_settings`（或它旁边）加一条只对 `issubclass(model_class, ChatAnthropic)` 生效的 lint：`model_settings_from_config` 里出现 `reasoning_effort` ⇒ 打**一条**警告，措辞与 OpenAI 家族那条**同源**（同一件事只留一处措辞 ⇒ 提共享常量/同一句模板），内容点明"该键会被转进 `model_kwargs`、并在请求期被 SDK 拒绝"。**不做**通用白名单表、**只记日志、不改任何行为**。
      **实测**：新增 `_warn_anthropic_reasoning_effort`（`factory.py`），调用点紧挨既有那条（`:375`）；**共享常量为 `_KWARG_DIVERT_CONSEQUENCE`**（"…moved into `model_kwargs`, which it spreads into every request body, and the provider SDK rejects them at request time."），**两条警告都嵌这一句** ⇒ 同一事实只有一处措辞。家族门用**函数内 lazy import** `langchain_anthropic`（照 Codex 那处既有写法，不给 `factory` 的模块加载路径加重量）；`ChatAnthropic` 与 `ClaudeChatModel` **都不声明** `reasoning_effort` 字段（实测），所以"看键在不在"这条规则在本仓不存在误报面。**全文件 89 passed / 0 failed**（87 + 2）。
      ⚠️ **一处用户可见的文案变更（有意，不是顺带改）**：OpenAI 家族那条警告的正文从 `…are not recognized parameters of the model class and will be forwarded as-is; this may raise at request time.` 变成 `…of the model class. <共享常量> `（多了 `model_kwargs` 那半句，少了 `forwarded as-is` 那半句）——因为"同源"要求两句嵌同一个机制句。两条既有断言的子串（`not recognized parameters`、键名）都保留，仓库内除该文件与那两条断言外**无人逐字引用**这句（已全仓 grep）。
- [x] **neuter 两条**：① 去掉这条 lint（回到完全不管 Anthropic 家族）⇒ 用例 1 红；② 把它写成"对 Anthropic 也跑 OpenAI 那套通用表" ⇒ **控制组（用例 3）红**（`frequency_penalty` 被误报）——这正是本轮 review 抓出的那个坑。
      **实测**：① 注释掉调用点 ⇒ **1 红**（只有用例 1；对照组仍绿）；② 把通用守卫的家族门放宽成 `(BaseChatOpenAI, ChatAnthropic)` ⇒ **1 红**，红的正是既有那条 `test_no_unknown_key_warning_for_non_openai_class`（`frequency_penalty` 被误报）⇒ **那条既有断言就是"不许退化成通用表"的看门人**，与 plan 的预测逐字吻合。两条都**回退后复跑确认回到 89 绿**。
- [x] **门禁**：同 Task 1（ruff 双净 + 窄面 + 全量对照 HEAD）。
      **实测（本轮零回归）**：`ruff check` + `format --check` 双净；窄面 = **168 passed / 1 failed**（`test_models_config_file_falls_back_to_config_yaml`，已知环境红，属基线）；全量 = **136 failed / 12423 passed / 109 skipped**（18m43s）。
      抽 136 个 node id ⇒ `git worktree add --detach` 出 HEAD 树（**这次 HEAD = `56ebec1d`，已含 Task 1**；`cp` 进四个本地环境文件），跑同一批 = **135 红 / 1 绿**。**两侧 `PYTHONPATH` 都是 `.`**（Task 1 那个 confound 已按纪要规避；`UV_PROJECT_ENVIRONMENT` 指主仓 `.venv`，worktree 不再新建空 venv）。
      **双向 diff**：`只在 HEAD 红` 看似 2 条，逐行核出**两条都不是 node id**（`comm` 出来的行首是空格、没有 `::`，是失败摘要的**换行续行**被我的 `grep ^(FAILED|ERROR) ` 之外的 sed 残留；我漏了 `^` 的锚定这一点与 Task 1 同源，已当场人眼核过）⇒ **实质为空**。`只在工作树红` **1 条** = `test_delta_channel_state.py::test_merge_message_writes_randomized_differential`——正是 Task 1 那 13 条"全量顺序假象"里的同一条（名字里就写着 randomized），**两侧单独复跑都 1 passed** ⇒ 顺序假象，与本轮改动无关。
      ⇒ **Task 2 无新增红**。收尾：worktree 已 `remove`、`.pytest-tmp` 与 `/tmp/t2-*` 已删。
      ⚠️ **两次全量的失败数不同（Task 1 = 144、Task 2 = 136）不是回归也不是修复**：两次跑的是同一棵树 + 同一批改动之外的代码，差异全部落在"顺序假象"这一类上（13 条那种）。**所以"这轮全量比上轮少 8 条"不能读成改好了什么**，判据只能是"抽 id 去 HEAD 双向 diff"。

## Task 3 — 界面：`anthropic` 时那两格不渲染，**且提交时强制清空**（D3）

- [x] **RED**（`frontend/tests/unit/settings/models-capability-wizard.dom.test.tsx` 与 `models-settings-page.dom.test.tsx`）：
  1. `provider="anthropic"` 时「可用推理深度」「默认推理深度」**不在 DOM**（按**界面词汇**取 aria-label/label 文案，别按数据字段名扫）；
  2. **payload 用例**：从 `openai-compatible`（已选好四档）**切到** `anthropic` 后提交 ⇒ 提交的 `ManagedModelInput` 里这三个键**被清空**；
  3. **修旧数据用例（本 task 的核心）**：加载一条**已经带三件套**的 anthropic 条目 ⇒ **什么都不改直接保存** ⇒ 提交的 payload 里这三个键**为空**（后端因此能 200，旧条目被顺手修好）；
  4. **对照组**：`provider="openai-compatible"` 时那两格**在**、且选了能提交上去；
  5. **向导建议**：新增向导里 `provider=anthropic` 时**不给** effort 建议（对照组：`openai-compatible` 照旧给）。
      **实测首轮 = 4 红 / 2 绿**，但**其中 2 条的「红」不成立（前提错了，当场处置）**：向导那两条（用例 1 的向导半 + 用例 2）红在 `pickProvider` 找不到 `role="option"` —— **Radix Select 在这套环境里根本打不开**，所以它们红的是我驱动不了控件，而不是功能缺失。**查明真因后重做驱动**（见下）并用 neuter 取回**有效的**红证。另 2 条红是对的那两条：编辑弹窗的 DOM 缺席（用例 1）与页面级 payload（用例 3 的近亲）。
      ⚠️ **Radix Select 的驱动方式（本轮新知识，与 `pointerdown` 那条既有笔记相反）**：`@radix-ui/react-select` 的 trigger 上，`onPointerDown` **只在 `event.pointerType === "mouse"` 时才开**（`react-select/dist/index.mjs:191`），而 happy-dom 的合成事件**不带 `pointerType`**；同一文件里 `onClick` 是 `if (pointerTypeRef.current !== "mouse") handleOpen()` 的兜底，item 也按同一条门选值 ⇒ **纯 `fireEvent.click` 就能开、能选**（已用一次性探针逐项验过：开→`data-state="open"`、候选 `["OpenAI 兼容","Anthropic","DeepSeek"]`、选完 `data-state="closed"` 且 trigger 显示 `Anthropic`）。探针文件已删。
      ⚠️ **另外两条「对照组首跑即绿」要标明**：向导那条 `openai-compatible` 的「仍然给 effort 建议」、编辑弹窗那条「能发的一侧那两格还在」——它们是**控制组**，不是本轮实现的功能。
- [x] **GREEN**：`ModelCapabilityEditor` 增一个入参（语义=**"这条腿能不能正确发送这套字段"**——⚠️ **不是**"这家协议能不能表达 effort"：协议能，缺的是我们没做那步翻译，见 spec §2 D3）；两个对话框按 provider 传值；为假时**不渲染**那两格，**并在组 payload 时把这三个字段清空**（不是只在切 provider 时清——编辑对话框的 provider 只读，只隐藏会让旧条目永远清不掉）；新增向导里**切 provider 到 anthropic 时清空表单值**；`capability-registry.ts`（或调用处）**按 provider 过滤建议**。**不动 i18n**（422 文案走服务端 `detail`，前端 toast 已经在用它）。
      **实测**：`core/models/capability.ts` 加**一条判据 + 两个纯函数**——`canSendEffortLevels(provider)`: `provider !== "anthropic"`（**命名即语义**：叫 "supports effort levels" 会在翻译落地那天变成假话，因为缺的从来不是协议那侧）、`withoutEffortAxis(value)`（只清 effort 轴，窗口与能力对不动）、`capabilityValueForProvider(value, provider)`（payload 期总入口）。写入点四处：编辑器 `canSendEffortLevels` 为假时**不渲染**（新增**必需**入参，两个调用点都传）；编辑弹窗 `handleSubmit` 走 `capabilityValueForProvider`；向导 `handleSubmit` 同上、`handleNext` 的种子**按 provider 过滤**（**`setSuggested` 也改读过滤后的值**——否则「建议值」会靠一组表单里已经不存在的东西自称建议）、provider `onValueChange` 切到不可发的一侧时清空；**`models-settings-page.tsx::toManagedInput` 也清**。
      ⚠️ **最后那处是计划外但必需的**（我自己核出来的，见下"一处比计划更大的面"）：`toManagedInput` 是"改写没打开的那一行"的唯一路径，不清它 ⇒ 编辑任何别的行都会把 anthropic 行原样发上去 ⇒ D1 直接 422 整包，**在修好那行之前谁都存不了任何东西**（连删除都会 422）。用例 3 的"后端因此能 200"要成立就必须带这一处。
      **一处比计划更大的面（要你知道）**：计划只写了"两个对话框"。实际必需的是**三条 payload 路径**（编辑弹窗 / 向导 / 页面 `toManagedInput`）。第 3 条我已按计划外补齐，并另加一条用例（见 RED 的页面级那条）。
- [x] **neuter 三条**：① 把"不渲染"改回"总是渲染" ⇒ 用例 1 红；② **只隐藏、不在 payload 里清空** ⇒ 用例 2/3 红（neuter 只回退"清空"这一半，别连隐藏一起还原，否则分不清哪半有牙）；③ 取消向导的建议过滤 ⇒ 用例 5 红。
      **实测（三条都与计划的预测有出入，逐条如实记）**：
      ① `{canSendEffortLevels &&` → `{true &&` ⇒ **2 红**（向导「offers no effort rows」的 DOM 断言 + 编辑弹窗「clears a stored anthropic entry」的 DOM 断言），与计划一致。
      ② 三个清空点同时退回 ⇒ **2 红**：编辑弹窗「clears a stored anthropic entry…」（计划用例 3）**与**页面级那条；**向导那条（计划用例 2）不红**。
      ③ 去掉种子过滤（其余全留）⇒ **0 红**。
      ⇒ **核查结论：向导那条用例的"清空"与"种子过滤"是互为冗余的两道保险**。因为进入 step 2 的唯一路径 `handleNext` 总会重新播种，删掉任一保独都不改变结果；再补测 **②+③ 同时关掉**（两个洞一起开）= **1 红**，红的正是向导那条的 **payload 断言**。所以"清空那一半"的**独立证据在用例 3（编辑弹窗）与页面级那条**，向导那条只钉"这一对合起来有效"。
      ⚠️ 按"neuter 不转红=用例无牙"的规矩，我**如实报告而不是再造一条测试**：向导那条仍保留为**端到端护栏**（它防的是两个机制一起被移除），但它**没有**独立牙；能独立取证的是编辑弹窗与页面那两条。
- [x] **门禁**：`pnpm check`（eslint + tsc，**应为零诊断**）；prettier **逐文件与 HEAD 比数字**（别对本来有格式债的文件跑 `--write`；新写的行自己控制在 80 列内）；**全量前端**。
      **实测**：`pnpm check` = **零诊断**（eslint + tsc 都过，rg 无输出）。**全量前端 = 238 文件 / 2569 用例 / 0 失败**（2m27s）。
      **prettier（方法本身要更正一句）**：直接比"与 prettier 输出的差异**行数**"**不成立** —— 这几个文件**本来就有债**（`capability.ts` 在 HEAD 就有 64 行、向导测试 591 行），而且这个数**会随文件体量增长**，加了行就一定"变大"，看不出是不是我写坏的。改用**偏离区块数（unified-diff 的 `@@` 个数）与 HEAD 比**：7 个文件**全部 same-or-better，零新增区块**（`capability.ts` 1→1、编辑器 0→0、编辑弹窗 3→2、添加弹窗 6→6、设置页 1→0、向导测试 17→17、页面测试 11→11）。长行**注释**不追（prettier 从不重排注释，且 HEAD 本来就有 14–21 行这种，是新债的假象）。
      ⚠️ **顺带抓到并回退了我自己造的一处历史 churn**：我第一版把新写的 `expect(...)` 长行折成三行时，脚本把**三处既有的一行式 `expect(...).toBeDefined(),`（85 列）也一起折了**——那是 HEAD 本来就有的债。用 `git diff` 的"被移除行"清单抓到（只剩那 3 条同形状的行），**逐行还原**，现在该文件的 diff 里**被移除行 = 0**（纯追加）。

## Task 4 — 文档同步与真栈验收

- [x] `backend/AGENTS.md`：在能力声明/模型配置那一节补一句"**声明要过写入期对账**"（`anthropic` 条目不许带推理档位三件套，`config.yaml` 手写条目只**警告**不阻断）；并记一句"工厂另有一条**只针对 `reasoning_effort`** 的 lint——它**不是**通用未知键守卫，Anthropic 家族那条通用表仍是**有意留空**的（`frequency_penalty` 那类合法透传名不许被误报）"。
      **实测**：落在既有那段 "Two invariants the code has to keep true" 上 —— 开头改成**不带计数的 "Invariants the code has to keep true:"**（避免以后再改计数），并**新增两条**：①写入期对账（点名三字段、truthiness 判据、`config.yaml` 只警告、**并写明这条是暂时的**，后续那对会放开）；②Anthropic 家族的通用表**有意留空**、工厂那条 lint 只查 `reasoning_effort`、两条警告共用一句机制措辞。
      ⚠️ **该文件没有 prettier 门禁**（见门禁那条的实测），所以它的"与 HEAD 同数"只能看内容、不能看 prettier 数字。
- [x] `frontend/AGENTS.md`：模型能力那一段补一句"那两格由 provider 决定渲不渲染，**并在提交时清空**（编辑旧条目时等于顺手修数据）；向导的建议也按 provider 过滤"。
      **实测**：接在 step 2 那段 `model-capability-editor.tsx` 的说明后面，写清三件事：两格由 `canSendEffortLevels` 决定、**三条 payload 路径都清空**（含"页面改写没打开的那行"）、**判据措辞是 "can send" 不是 "supports"**（协议有 effort，缺的是翻译）；并把"向导的种子与 suggested 标注都按 provider 过滤"一起写进去。
- [x] **真栈验收（真 PUT，两条路）**：起真栈（网关 + 前端，PUT 是 admin-gated）⇒ ① 一条**带三件套的 anthropic 条目** ⇒ 保存被 **422** 明确拒绝（读 `detail` 原文）；② 在**编辑对话框**里对那条旧条目**什么都不改直接保存** ⇒ **200**，重读配置文件确认那三个键**消失**；既有 OpenAI 兼容条目**一字未变**。
      **实测（用私有端口的免登录实例跑，`DEER_FLOW_AUTH_DISABLED=1` + `:8099`，跑的是当前工作树代码；判据 `/api/threads` 回 405 而非 401、`/api/models/config` 回 200）**：
      - **腿①：HTTP 422**，`detail` 原文 = _`Model 'minimax-m3' cannot declare reasoning-effort levels: this protocol names effort `output_config.effort`, not `reasoning_effort`, so the value would be forwarded into every request and rejected by the SDK before it is sent. Clear 可用推理深度 / 默认推理深度 for this entry.`_ ⇒ 点名条目 + 写清**协议的名字** + 给下一步。**且被拒后配置文件 md5 未变**（拒绝发生在 `atomic_write` 之前）。
      - **腿②：HTTP 200**；重读文件：`minimax-m3` 的 `supported_reasoning_efforts` / `reasoning_effort` **两键消失**、`supports_reasoning_effort` = `False`；**其余三条 OpenAI 兼容条目逐字段**且**逐键序**均未变。
      - ~~⚠️ 这一腿当时是用"编辑对话框会提交的那份载荷"跑的 API，不是浏览器（你的 dev 栈那时是关的）。~~ ⇒ **2026-09-19 补做，已在真浏览器里通关**：
        **做法**：那条条目当时已经被保存过一次（三件套早没了）⇒ 为了能验"清空那一半"，我**先按逐字节快照把三件套写回文件**，重现"修复前的存档状态"（重建后的 md5 正好等于**修复前那份原始字节** `e17ad998…`，说明重现是逐字节的）；然后在**真浏览器**里：`?settings=models` 打开设置 → 点 `minimax-m3` 那一行的「编辑」→ **什么都不改点「保存」**。
        **结果**：① **DOM 口径**——编辑对话框里 `可用推理深度` / `默认推理深度` **都不在**，而对照组（`思考模式` / `视觉` / `支持上下文窗口` / `默认上下文窗口`，后者显示「已选 3 个 / 200K」）**都在**；② 保存**成功**：编辑对话框关闭、**无 toast、无 alert、页面无错误文案**；③ 重读配置文件：`minimax-m3` 的 `supported_reasoning_efforts` / `reasoning_effort` **两键消失**、`supports_reasoning_effort=False`，**md5 正好回到 `b8b729dd…`**（＝我做脏之前的状态）⇒ **整轮真 UI 往返字节稳定**，另外三条条目一字未变，**不欠还原**。
        **顺带一条现场证据**：把三件套写回文件后、还没保存时，输入栏就出现了「推理深度: 中」——**声明驱动那个菜单**这件事在真界面上直接看到了。
        **前置核实**：动手前先核过"跑的是不是新代码"——`:8001`(PID 9368) 起于 **15:58:20**、`:3000`(PID 7500) 起于 **15:58:49**，而两处修复提交是 **05:43**(`acc23f4f`) / **07:07**(`bf6fd39e`) ⇒ 进程晚于修复，跑的是新代码。
      ⚠️ **验收载荷踩了一个坑（值得记住）**：我第一版把 `GET /api/models/config` 返回的**全部 7 条**发回去 —— 而 `GET` 返回的是 **`config.yaml` ∪ `models_config.json` 的合并集**，PUT 又是**整集合替换** ⇒ 那三条只在 `config.yaml` 里、本来是 `source=config_file / editable=false` 的条目被**写进了 UI 文件**（前端不会犯这个错：它只发 `uiModels`，即 `editable` 的那些）。**判据：PUT 的载荷只能取自 `editable === true` 的条目**。已按快照逐字节还原并重跑。
- [x] **收尾**：配置**逐字节还原**（动手前 `cp` 过原始字节；网关写这个文件在 Windows 上是 CRLF）、页面重载丢弃表单、不新建残留文件；`models_config.json` md5 与动手前相同。
      **实测**：**md5 = `e17ad9984f2c081361837d8809e5e39d`，与动手前相同**（也与 Task 0 记的那份相同 ⇒ 这条线全程没动过他的配置）。私有实例已停（`taskkill /T`，8099 已释放、无孤儿监听）；仓库里无新增文件；文件里仍是原 4 条。
      ⚠️ **过程里出过一次险（如实记）**：我把原始字节 `cp` 到了系统临时目录，**它中途被清理掉了**，而工作树当时正处在"被改过"的状态。救回来靠的是：那条 anthropic 条目提交时用的是**哨兵 `********`**，所以服务端把原密钥留在了文件里 ⇒ 我按"删掉多写的三条 + 还原三件套 + 用**应用自己的 `json.dump(indent=2)` + CRLF** 重放"重建，**逐字节验到 md5 相符**才落盘（第一次重建只差 `minimax-m3` 的**键序**——三件套被我追加到了末尾，原位置在窗口之后、`context_window` 之前）。**教训：原始字节别只放系统临时目录；或先验证重建配方再动手改配置。**
- [x] **门禁**：两份 `AGENTS.md` 的 prettier 与 HEAD 同数（**量 `frontend/AGENTS.md` 必须在 `frontend/` 里跑**）；`models_config.json` md5 未变。
      **实测**：`frontend/AGENTS.md` **HEAD 7 → work 7 个偏离区块**（零新增）；`models_config.json` md5 未变（见上）。
      ⚠️ **`backend/AGENTS.md` 没有 prettier 门禁 —— 这条要更正计划的前提**：仓库根**没有** `package.json` / `.prettierrc` / prettier 脚本；唯一的配置是 `frontend/prettier.config.js`；`.pre-commit-config.yaml` 里 `frontend-prettier` 的 `files: ^frontend/` **且 `types_or: [javascript, tsx, ts, json, css]`（不含 markdown）** ⇒ 两份 `AGENTS.md` 都不在 pre-commit 的 prettier 里，`frontend/AGENTS.md` 只被前端自己的 `pnpm format`（`prettier --check .`，无类型限制）覆盖。拿 prettier 默认参数去量 `backend/AGENTS.md` 会得到**假数字**（HEAD 就已 103 个偏离区块、输出还长 52 行＝它从来不是 prettier 干净的）。
      ⚠️ **踩了一次"新债"误报并修掉**：我在 `frontend/AGENTS.md` 里写了 `_other_` 做强调，**prettier 把它与同一 bullet 里更早的 `api_key` 配对**了（输出变成 `api*key` … `\_other*`），多出 2 个区块。同一文件里 `*provider*` / `*shared*` 那几处是**既有**行（HEAD 就有）。⇒ **`_x_` 单下划线强调在含 `api_key` 这类下划线词的段落里不要用**，改成不强调即可（已改，回到 7→7）。另外我第一版还写过一处 `*other*`，按本仓既定口径（新写的强调用 `_x_`）也一并去掉了。

---

## 提交切分

| 提交 | 内容                                                      |
| ---- | --------------------------------------------------------- |
| 0    | **本计划 + 它的 spec 成对**                               |
| 1    | Task 1（写入期拒绝 + 用例）                               |
| 2    | Task 2（工厂：`anthropic` 针对性 lint + 用例）            |
| 3    | Task 3（界面：不渲染 + 提交时清空 + 向导建议过滤 + 用例） |
| 4    | Task 4（文档 + 真栈结论）                                 |

不改表、不改 schema、不动任何默认值、**不给 `openai-compatible` / `deepseek` 加任何新行为**；不做"按协议映射参数 / 超范围回退"、不做"条目自定义请求头"（两者都另立）。
