# 推理档位：回退铺到两条腿 + 记录必须等于实发值 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-19-model-effort-fallback-and-record-design.md](../specs/2026-09-19-model-effort-fallback-and-record-design.md)
**Status:** ✅ **本对三个 Task 全部交付（2026-09-20）** —— Task 1 `7414eeb1`（纯函数 + 两条腿回退 + warning，窄面 99 绿）/ Task 2 `0725463d`（记录跟随实发值 + 补传引导腿参数，53 绿）/ Task 3（文档 + 真栈，本笔）。**关键门禁**：ruff 双净；窄面 4 文件 236 例（1 条已知环境红）；**全量 145 failed / 12425 passed / 109 skipped、对 HEAD 双向 diff 为空**；真栈隔离实例两腿 + 对照组 4 条全过、**零出网**、他的 `models_config.json` md5 未变。**起草时**（2026-09-20；**同日经两轮审查定稿**——① 初稿有两处事实错误（记录点位置、D3 覆盖不到 A/B 两格），② 终审又查出**两条设计级问题**：**D2 的 warning 在 D3 之后是死代码**、**D4 与"记录必须等于实发值"这条约束直接冲突**。两条均已按他裁的**①甲 / ②甲**落进 spec。）

**Parent:** [2026-09-19-model-effort-probe-and-translation-design.md](../specs/2026-09-19-model-effort-probe-and-translation-design.md)（那一对把档位**按协议翻译**并给 anthropic 腿加了**对声明子集的回退**；本对处理它留下的不对称。**翻译本身不动**。）

**Architecture:** 两件事 —— **① 回退从翻译里拆出来、两条腿共用**（openai 腿今天连声明子集都不读）；**② 把"实发值"算在一个地方**（新增纯函数 `resolve_effective_effort`，`lead_agent` 在记录前调一次 ⇒ 三处记录自动变准，并补上引导腿漏传的那个参数）。**不引入任何网络调用**；**`ModelConfig` / schema / 界面全部不动**。

**硬约束（他 2026-09-20 裁）**：**记录必须等于实发值。** 精确表述见 spec §D4 —— 指**我们词汇里的档位**，**不含协议拼写**（`minimal` 在 anthropic 线上是 `low`，这一处是**已知且有意**的例外）。

**Global Constraints:**
- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **密钥只从 `.env` 读**，绝不硬编码、绝不提交、绝不回显。本对真栈**不碰任何真实密钥**：隔离实例的 scratch 配置里用**现造的假值**。
- **本对不改任何配置 schema / 默认值**：`ModelConfig` / `models_config.json` / `config.yaml` / `contracts/` **零改动**；不动 `supports_reasoning_effort` 那道闸本身。
- **scope fence（明确不做）**：不做**配置期探测**（`ModelInfo.capabilities.effort`，登记在上一对 spec §6）；**不做 opencode 的 `x-opencode-session` 请求头**（第三条待办线，另立一对）；不扩档位值域（不加 `xhigh`/`max`）；不动界面 / i18n；不动预算那一维。
- **后端 TDD 命令**：窄面 `cd backend && PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync pytest tests/<file>.py -q`；全量 `cd backend && make test`（≈23 分钟 ⇒ **后台跑，没跑完别默认是绿的、先别提交**）。前端本对不涉及。
- **不落任何残留**：真栈用的隔离实例与 recorder 跑完 `taskkill /T`、scratch 目录删净；`models_config.json` md5 必须与动手前相同。
- **每个 Task 的 `**实测**` 行必须回填**（RED 几条红 / GREEN 几条绿 / neuter 的受害者 / 门禁数字）——**未回写的 plan 不算交付**。

**依赖顺序**：Task 0（核实，只读）→ Task 1（纯函数 + 两条腿回退 + warning）→ Task 2（记录跟随实发值 + 补传引导腿参数）→ Task 3（文档 + 真栈）。

---

## Task 0 — 开工前的四项核实（只读，不改代码）

> 动到的文件：**无**（只读）。

- [x] 1. **`_nearest_declared_effort` 的搬运面**：现在它在 `models/factory.py`，模块私有（`_` 前缀）。核清：① 全仓还有谁引用它（应当只有 `_translate_reasoning_effort`）；② 搬到 `config/model_config.py` 后，`factory.py` 的 import 要改哪一行；③ `config/model_config.py` 现在只 import `typing` / `pydantic`（已核）⇒ 无循环依赖，但**搬进去之后要确认它不反向 import `models.*`**。
      **核实结果**：① **全仓只有 2 处**、都在 `factory.py` —— 定义 `:98` + 唯一调用点 `:147`；**测试零引用**（私有）⇒ 搬运面就是这 2 处。（**扫描口径**：全仓 `--include=*.py`，含根 `tests/` 与 `scripts/`；两个 `Permission denied` 的路径是 `backend/.deer-flow/users/.../lark-cli`（运行期集成目录）与 `backend/.pytest_cache`（pytest 缓存），**都不是 py 源码**，不构成缺口。）② `factory.py:8` 是 `from deerflow.config.model_config import REASONING_EFFORT_LEVELS`；⚠️ **搬走后那行会变 unused**（`REASONING_EFFORT_LEVELS` 全文件只在 `:105` 那个函数里用）⇒ ruff **F401**，搬的时候要把 `:8` 改成 import 新函数。③ `model_config.py` 只 import `typing` / `pydantic`；import 它的四个文件是 `config/app_config.py` / `config/models_config.py` / `models/factory.py` / `gateway/routers/models.py` ⇒ **无环**。
- [x] 2. **`lead_agent` 那一段的确切插入点**：`model_config` 在 **`:757`** 才有（⚠️ 不是 `:756`，那是空行；同文件 `:508` 另有一个同名变量，别按名字 grep 找错）、`reasoning_effort` 在 `:743` 解析、`:772-773` 补默认档、`:775` 打日志。核清插入点应落在 `:773` 与 `:775` **之间**，且**两个 `create_chat_model` 调用点（`:874` / `:980`）之后的 constitution 快照（`:889` / `:997`）读的是同一个局部变量**。
      **核实结果**：插入点**唯一** —— `:773` 之后、`:775` 之前（`:774` 正好是空行）。五处读的**确实是同一个局部变量** `reasoning_effort`：`:779`（logger 实参）/ `:796`（metadata）/ `:898`（constitution·引导腿）/ `:980`（工厂·正常腿）/ `:1006`（constitution·正常腿）。⚠️ **`:874`（工厂·引导腿）不在这个列表里** ⇒ 再次确认它没传（A 格）。⇒ 在 `:773` 之后改一次这个变量，**五处一起变准**。
- [x] 3. **`substituted` 的打日志面**：核清 `lead_agent` 现有 `logger` 的用法与措辞风格（它已经有一条 `logger.info("Create Agent(...) reasoning_effort: %s ...")`），warning 要**与它同源、不重复报同一件事**（spec §D2：只在替换时打、内容三件）。
      **核实结果**：**同族先例就在下面 13 行处** —— `:762` `logger.warning(f"Thinking mode is enabled but model '{model_name}' does not support it; fallback to non-thinking mode.")`，形状 = **点名模型 + 请求的东西 + 为什么用不了 + 改用什么**（f-string）。新 warning 照这个形状写（点名条目 + 请求档 + 不在声明子集 + 实发档）。文件里 %-style（`:775` 那条 info）与 f-string 混用 ⇒ 单行三值用 f-string 即可。**与 `:762` 不重复**：那条讲的是 thinking 开关、本条讲的是档位替换。
- [x] 4. **既有断言的载荷扫描**（动手前必做，照上一对的规矩）：把将要被改动的三个测试文件里**所有**带 `reasoning_effort` 的用例列出来，逐条判"加回退后它会不会红"：
      - `test_model_factory.py`（5 条 effort 用例 + 3 条 Codex 用例）
      - `test_lead_agent_model_resolution.py`（`_fake_create_chat_model` 桩的 5 处签名）
      - `test_constitution_record.py`（`:190` / `:310` 两条 `reasoning_effort: None`）
      ⚠️ **判据**：只要 fixture **没声明 `supported_reasoning_efforts`**，回退就不发生 ⇒ 保持绿。**发现任何一条"声明了子集 + 传了子集外的档"的既有用例 ⇒ 给它补值而不是放宽检查。**
      **核实结果**：
      - **`test_model_factory.py`：0 条受影响**（逐条核过）—— `:468` 闸关无子集 / `:486` 有闸无子集 / `:825`/`:845`/`:865` Codex 有闸无子集 / `:1112` 无子集 / `:1499` 无子集 / `:1676`+`:1683` 声明了 `['low','high']` 但**发的档都在子集内**（默认档 "low"/"high"）/ 上一对那 5 条。
      - **`test_constitution_record.py`：0 条红**，但 `:190`/`:310` 钉的是 `None` 字面值、**不覆盖回退路径** ⇒ 绿也无证据力（Task 2 新用例另写）。
      - ⚠️⚠️ **`test_lead_agent_model_resolution.py`：7 条受影响（6 红 + 1 条变空洞绿）** —— 这是本项查出来的**计划没预料到的面**：
        | 用例 | 断言 |
        | --- | --- |
        | `test_make_lead_agent_reads_runtime_options_from_context`（`:521` 的 dict 比较） | `"reasoning_effort": "high"` ⇒ **红** |
        | `test_make_lead_agent_applies_agent_model_settings` | `== "high"` ⇒ **红** |
        | `test_model_declared_default_reasoning_effort_applies` | `== "high"` ⇒ **红** |
        | `test_request_reasoning_effort_beats_the_model_default` | `== "low"` ⇒ **红** |
        | `test_model_default_applies_without_a_declared_subset` | `== "medium"` ⇒ **红** |
        | `test_agent_default_reasoning_effort_beats_the_model_default` | `== "medium"` ⇒ **红** |
        | `test_model_without_a_default_leaves_reasoning_effort_unset` | `is None` ⇒ 绿，但**变成空洞绿** |
        **根因**：该文件的 `_make_model`（`:100`）**从不设 `supports_reasoning_effort`**（`ModelConfig` 默认 `False`），而它的桩是 `monkeypatch.setattr(lead_agent_module, "create_chat_model", _fake_create_chat_model)`（`:1337`）—— **整个替换掉工厂** ⇒ **今天那道闸对这些用例根本不可见**。D3 把闸搬进 `lead_agent`（**没被桩掉**）⇒ 闸突然生效、值被归零 ⇒ 断言全落空。
        **处置**：照"**给夹具补值而不是放宽检查**"给这 7 条补 `supports_reasoning_effort=True`（它们的意图是**解析链**，不是闸）。⚠️ 补完**仍无**任何既有用例覆盖 B 格 ⇒ B 格只能靠 Task 2 的新用例。**这条已并入 Task 2 的 GREEN 步骤。**

**门禁**：无（只读）。

---

## Task 1 — 纯函数 + 两条腿回退 + warning（D1 / D2）

> 动到的文件：`config/model_config.py`（新增函数 + 搬入 `_nearest_declared_effort`）、`models/factory.py`（拆两段）、`tests/test_model_factory.py`（新增用例 + 改一条 docstring）。

- [x] **RED**（`backend/tests/test_model_factory.py`，挨着上一对那 5 条 effort 用例）：
  1. **openai 腿现在会回退**：`ChatOpenAI` + 声明 `['low','high']` + 调用方传 `medium` ⇒ 请求体 **`reasoning_effort == 'low'`**，且**无 `output_config`**；
  2. **openai 腿未越界时逐字节不变**（控制组）：声明 `['low','medium','high']` + 传 `medium` ⇒ `reasoning_effort == 'medium'`、**无 `output_config`**（**首跑即绿 = 控制组**，不是本对的功能）；
  3. **两条腿落到同一个档**：同一份声明、同一个越界输入 ⇒ anthropic 出 `output_config: {'effort': 'low'}`、openai 出 `reasoning_effort: 'low'`；
  4. **边界：`"none"` 原样放过**（Codex 哨兵）⇒ 不抛、不改写。
      ⚠️⚠️ **这条用例必须让条目声明一个非空子集**，否则**没有牙**：工厂的回退判定是 `if declared and level not in declared` ⇒ 子集为空时**短路、回退根本不被调用**，去掉前置判断照样绿。实测：

      ```
      declared=[]            → 回退不被调用        → 去掉前置判断仍绿（无牙）
      declared=['low','high'] → 回退被调用 → KeyError → 红 ✅
      ```

      （neuter ② 靠的就是这条 ⇒ 子集写空的等于 neuter 静默失效。）
  5. **边界：声明缺省 ⇒ 两条腿都不回退**；
  6. **warning 只在替换时出现**：越界 ⇒ **恰好一条**且含**请求档 / 实发档 / 声明子集**三件；未越界 ⇒ **零**（照 `test_reasoning_effort_on_openai_draws_no_warning` 的 caplog 写法）。
      ⚠️ **观测口径照上一对**：不看构造参数，看**真实请求体** —— 真实 `ChatAnthropic` / `ChatOpenAI`（entry 自带 dummy `api_key`）+ `instance._get_request_payload([], stop=None)`；helper 沿用 `_effort_entry(...)` / `_built_payload(...)`。
      **实测 RED = 3 红 / 96 绿**（**整文件**，`--basetemp=.pytest-tmp`）：
      - `test_openai_effort_outside_the_declared_subset_falls_back` ⇒ `assert 'medium' == 'low'`（`:1844`）
      - `test_both_legs_fall_back_to_the_same_level` ⇒ `assert 'medium' == 'low'`（`:1861`）
      - `test_effort_fallback_emits_one_warning` ⇒ `assert 0 == 1`（`:1900`）
      **三条都是 `assert`、不是 `Unable to find`** ⇒ 按判据是**真功能红**，不是驱动问题。
      ⚠️ **踩坑**：首次用 `-k "effort or codex"` 跑得到"2 红"，**漏了 `test_both_legs_...`**（名字里既没 `effort` 也没 `codex`）⇒ **窄面取证要跑整文件**，别按词过滤。
      ⚠️ **两条"绿"要标性质**：`test_effort_outside_our_vocabulary_is_passed_through` 与 `test_openai_effort_with_no_declared_subset_is_not_falled_back` 现在绿**只是因为回退还不存在** ⇒ 它们的牙由 **neuter ②** 提供，不是本轮功能。
- [x] **GREEN**：
  - `config/model_config.py` 新增 **`resolve_effective_effort(model_config, level) -> tuple[str | None, bool]`**（闸 → 回退 → 原样；**"只认四档"的前置判断**），`_nearest_declared_effort` 从 `factory.py` 搬来（改名 `nearest_declared_effort`，去掉 `_`）；
      ⚠️ **连带一处**（Task 0#1 查出）：`factory.py:8` 的 `REASONING_EFFORT_LEVELS` **搬走后会变 unused**（全文件只被 `:105` 用）⇒ 那行 import 要一起改，否则 **ruff F401**。
  - `factory.py`：`_translate_reasoning_effort` **拆两段** —— 回退段（两条腿共用，调新函数）与翻译段（**家族门保留**）；**这里不打 warning**。
      ⚠️⚠️ **回退段的落点要点名，这是本对最容易做错的地方**：它必须在**家族门之外**、且在 **`:364` 那道闸之后**（`:364` 是 `if not model_config.supports_reasoning_effort: pop(...)`，**保留不动**）。**别把回退段塞进 `_translate_reasoning_effort` 里** —— 那样它就在家族门之内，**openai 腿永远拿不到回退，用例 1 会一直红**。
      ⚠️ **最容易写崩的一处**：`rank[level]` 是直接下标（搬过去后在 `model_config.py:30`），`"none"` / `"xhigh"` / `"max"` 会 **`KeyError` 当场崩**。今天不崩只是因为翻译段先筛了一道 —— **提成共用函数就绕过去了** ⇒ 前置判断必须在**进 `nearest_declared_effort` 之前**。
      **实测 GREEN = 窄面 99 绿 / 0 红**；`ruff check` + `format --check` 双净。
      ⚠️ **就地更正计划的一处措辞（如实记）**：上面写的"**这里不打 warning**"**不准确**。按 spec §D2 甲，`resolve_effective_effort` 的**每个调用方**都按 `substituted` 打日志；工厂的回退段**也是调用方**，所以它**要打**（只是正常路径上 `substituted` 恒为 `False`、不会重复）。真正不许打的是**翻译段**（spec 原话"不能是工厂的翻译段"）。**这条 RED 用例 6 就住在 `test_model_factory.py`** ⇒ 不这样读它永远绿不了。
      ⚠️ **warning 的写法**：初版写成**相邻 f-string 拼接**（两行），`ruff format` 要求**并成一行 192 字符**；改用本文件既有的 **%-style + 参数**（同 `:775` 那条 `logger.info`）⇒ 既过 formatter 又是惰性求值。
- [x] **neuter 两条（都要有牙）**：① 把回退段的家族门加回去（只让 anthropic 回退）⇒ 用例 1、3 红；② 去掉 `"none"` 的前置判断 ⇒ 用例 4 红（**并且是 `KeyError`**，如实记失败形态）。
      **实测**：① **3 红**（计划预测 2）—— 多的是 `test_effort_fallback_emits_one_warning`，**它本身也跑在 openai 腿上**，所以家族门一并把它打红（三条都仍是有牙的真红）。② **1 红**，失败形态**正是预测的 `KeyError: 'none'`**（`model_config.py:30`），**无附带损伤**。两条都**回退后复跑确认回到 99 绿**，且 `grep NEUTER` 归零。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`test_model_factory.py`）绿。
      **实测**：ruff 双净；窄面 **99 passed**。**加跑更宽面**（`test_model_factory` + `test_lead_agent_model_resolution` + `test_constitution_record` + `test_models_config`）= **231 例**：首跑 **219 passed / 12 errors**，12 个 ERROR 全是**已知环境条件**（`PermissionError: [WinError 5] … Temp\pytest-of-h7242`，即记忆里的"第六形态"）⇒ 换 `--basetemp=.pytest-tmp` 后 **ERROR 归零**，只剩 **1 红** = `test_models_config.py::test_missing_models_file_falls_back_to_config_yaml`（**已知环境红**，仓库根真实 `models_config.json`）。⇒ **本轮零回归**。`.pytest-tmp` 已删。
      ⚠️ **全量后端仍留给 Task 2**（计划的分工）：Task 1 改的 `factory.py` 行为面已由窄面覆盖，但 `model_config.py` 是共享模块 ⇒ **Task 2 的全量门禁要照跑、别省**。

## Task 2 — 记录跟随实发值 + 补传引导腿参数（D3 / D4）

> 动到的文件：`agents/lead_agent/agent.py`（`:773` 后调纯函数 + 打 warning、`:874` 补传参数）、`tests/test_lead_agent_model_resolution.py`、`tests/test_constitution_record.py`。

- [x] **RED**（`backend/tests/test_lead_agent_model_resolution.py` + `test_constitution_record.py`）：
  1. **四格"记录 == 实发"**（spec §1.2 那张表就是要断言的东西）：
     - **A 引导腿**：请求传 `high`、条目默认 `low` ⇒ 记录 `high`、**实发 `high`**（今天记录 `high`、实发 `low`）；
     - **B 闸关**：`supports_reasoning_effort=false` + 条目手写默认档 ⇒ 记录 `None`、**实发 `None`**（今天记录 `medium`、实发 `None`）；
     - **C 越界**：声明 `['low','high']` + 传 `medium` ⇒ 记录 `low`、**实发 `low`**（今天记录 `medium`）；
     - **D 命中**：声明 `['low','medium','high']` + 传 `medium` ⇒ 记录 `medium`、实发 `medium`（**控制组**）。
      ⚠️⚠️ **观测载体要分三件，别只用一个桩**（`_fake_create_chat_model` 捕获的是**传给工厂的参数**，**不是记录**）：
      | 要证明的 | 载体 |
      | --- | --- |
      | 传给工厂的值 == 请求体里的值 | `test_lead_agent_model_resolution.py` 的 `_fake_create_chat_model` 桩 |
      | **记录（logger）== 那个值** | **`caplog`** 抓 `Create Agent(...) reasoning_effort: %s` 那条（照 `test_reasoning_effort_on_openai_draws_no_warning` 的写法） |
      | **记录（constitution）== 那个值** | **`test_constitution_record.py`** 断言 `record["model"]["reasoning_effort"]` |
      ⚠️ `config["metadata"]` 那处（LangSmith 追踪标签）**没有便宜的观测口** ⇒ 用"它读的是同一个局部变量"来收口（实施时核一眼代码即可），**不假装测过**。
      ⚠️ **B 格的前提**：`supports_reasoning_effort=false` + 条目手写默认档，**界面正常路径造不出来**（布尔由"子集非空"推导，`capability.ts:170`）⇒ **只能在 `config.yaml` 手写、或测试里直接构造 `ModelConfig`**。它是**真实可达**的：`ModelConfig` 的校验器在 `supported_reasoning_efforts` 为 `None` 时**整段跳过**，不看 `reasoning_effort`。
  2. **三处记录都跟着走**：logger / trace metadata / constitution record **读同一个值**（按上表：caplog + constitution 各一条实断言，metadata 用代码核对收口）。
  3. **D4 那一处例外要被钉住**：声明 `['minimal','low','high']` + 请求 `minimal`（anthropic）⇒ **记录写 `minimal`**、**线上是 `output_config: {'effort': 'low'}`** ⇒ 断言两件事**同时成立**（用例名与注释写明"**有意的拼写差异，不是记录不准**"）。
      ⚠️ `test_constitution_record.py` 现有两条（`:190` / `:310`）钉的是 `reasoning_effort: None` 的**字面值**，**不覆盖回退路径** ⇒ 它们会**保持绿**但**证明不了本对**，新用例必须另写。
      **实测 RED = 3 红 / 50 绿**（`test_lead_agent_model_resolution.py`，`--basetemp=.pytest-tmp`）：
      - **A** `test_bootstrap_records_the_level_it_hands_to_the_model` ⇒ `assert None == 'high'`（工厂收到的就是 `None`：引导腿没传参）
      - **B** `test_gated_entry_records_no_level_because_it_sends_none` ⇒ `assert 'medium' is None`（记录 `medium`、实发 `None`）
      - **C** `test_out_of_subset_level_is_recorded_as_the_one_that_is_sent` ⇒ `assert 'medium' == 'low'`
      **两个对照组首跑即绿**（`-k` 单独复跑确认 **2 passed**、不是被跳过）：**D** `test_declared_level_is_recorded_unchanged`；**D4 守卫** `test_anthropic_level_is_recorded_in_our_vocabulary_not_the_protocol_spelling`（它**今天是绿的**，因为它钉的是"记录用我们的档名"——那条今天本来就成立；**它的价值是防将来被改成线上拼写**，不是本轮的功能红）。
      ⚠️ **观测载体落成三件**（照上面那张表）：
      - 桩 `_fake_create_chat_model` ⇒ `captured["sent"]`（**传给工厂的值**）；
      - `caplog` + `_logged_effort()` 解析 `Create Agent(...)` 那条 ⇒ `captured["logged"]`（**logger 记的值**）；
      - **`monkeypatch.setattr(lead_agent_module, "publish_constitution", …)`** ⇒ `captured["constitution"]`（**constitution 记的值**）—— 它是**模块级导入**（`agent.py:36`）所以可截，**比计划里"去 `test_constitution_record.py` 断言"更直接**（后者只测记录器本身、测不到 `lead_agent` 传了什么）。
      ⚠️ `config["metadata"]`（LangSmith 标签）**仍无便宜观测口** ⇒ 用"它读的是同一个局部变量"收口，**不假装测过**（Task 0#2 已核五处读同一变量）。
      ⚠️ **夹具扩了两个参数**（保留默认值 = 今天的行为，不动既有用例）：`_make_model` 新增 `supports_reasoning_effort: bool = False` 与 `use: str = "langchain_openai:ChatOpenAI"`。
      ⚠️ **7 条既有用例此刻还没红**（实现未落地）—— 它们会在 GREEN 落地后红，**那正是 Task 0#4 预判的面**，修法见 GREEN。
- [x] **GREEN**：
  - `lead_agent/agent.py`：`:773` 之后调一次 `resolve_effective_effort` ⇒ 三处记录自动拿到实发值；**`substituted` 为真时在这里打 warning**（措辞照 `:762` 那条的形状，见 Task 0#3）；
  - **`:874`（引导腿）补传 `reasoning_effort=reasoning_effort`**。
  - ⚠️⚠️ **给 7 条既有夹具补 `supports_reasoning_effort=True`**（Task 0#4 查出来的面，**不做这一步 Task 2 会多 6 条红**）：`test_lead_agent_model_resolution.py` 的 `_make_model` 从不设那个布尔（默认 `False`），而它的桩**整个替换掉工厂** ⇒ 今天闸不可见；D3 把闸搬进 `lead_agent` 后闸突然生效。补的是**夹具**（那 7 条用例的意图是解析链、不是闸），**不是放宽断言**。
      **实测 GREEN = 53 绿 / 0 红**（`test_lead_agent_model_resolution.py`，从 RED 的 3 红 / 50 绿 转来）；`ruff check` + `format --check` 双净。
      **实现形态**：`agent.py` 在 `:773` 之后取 `requested_effort = reasoning_effort` 再 `reasoning_effort, substituted = resolve_effective_effort(...)`，`substituted` 时打一条 warning；`:874` 补传参数。**五处读的仍是同一个局部变量**（Task 0#2 已核）⇒ 三处记录一起变准，**没有分别改三处**。
      ⚠️ **7 条夹具的补法是显式逐条**（`_make_model` 的 `supports_reasoning_effort` 默认仍是 `False`，**既有用例一行未动**）：`context-model` / `agent-model`（`:1241` 那条）/ 两条 `reasoning-model` / `plain-model`（带默认档那条）/ `agent-model`（带默认档那条）/ `plain-model`（无默认档那条）。
      ⚠️ **同一条句子只写一处**：工厂与解析点都要打这条 warning（D2 甲），所以措辞抽成 `model_config.py::effort_substitution_note(...)`，两处都 `logger.warning("%s", note)`。**顺带一个 lint 三角**：相邻 f-string 拼接 → `ruff format` 要并成一行；改 `%`-style → `ruff check` 报 **UP031**；**最终落成单行 f-string**（与 `:762` 同形，177 字符 —— 那是 formatter 自己的输出，它不拆字符串字面量）。
- [x] **neuter 两条（都要有牙）**：① 去掉 `:874` 的补传 ⇒ **A 格红**；② 把 `lead_agent` 那次调用去掉（只留工厂那处）⇒ **B、C 两格红**（工厂那次看到的是已解析值 / 被闸后的值，记录又变回解析值）。
      ⚠️ **判据**：neuter ① 与 ② 的受害者**必须不同**（一个治漏传、一个治记录），否则说明两半互相顶替。
      **实测**：① **1 红** = `test_bootstrap_records_the_level_it_hands_to_the_model`（正是 A 格，与计划逐字一致）；② **2 红** = `test_gated_entry_records_no_level_because_it_sends_none`（B）+ `test_out_of_subset_level_is_recorded_as_the_one_that_is_sent`（C）。⇒ **两条的受害者集合互不相交**（① 只打 A、② 只打 B/C）⇒ **两半可分辨**，没有互相顶替。两条都**回退后复跑确认回到 53 绿**，`grep NEUTER` 归零。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`test_lead_agent_model_resolution.py` + `test_constitution_record.py` + `test_model_factory.py` + `test_models_config.py`）绿；**全量后端后台跑** + 抽 FAILED/ERROR 的 node id 去 HEAD 跑同一批、**双向 diff**（`xargs -d '\n'`，别 pipe 长跑；HEAD 那棵树要先 `cp` 仓库根本地环境文件进去 —— 四个 gitignored 文件：`config.yaml` / `models_config.json` / `extensions_config.json` / `rag_config.json`；**两侧同一个 `PYTHONPATH`**）。
      **实测（本轮零回归）**：ruff 双净；窄面（4 文件）**236 例 → 235 passed / 1 failed**，那 1 条是**已知环境红** `test_models_config.py::test_missing_models_file_falls_back_to_config_yaml`（仓库根真实 `models_config.json`，属基线）。
      **全量**：**145 failed / 12425 passed / 109 skipped**（17m28s，后台跑）。抽 **145 个 node id**（`tr -d '\r'`，**这次全是合法 node id、无续行垃圾**）⇒ `git worktree add --detach` 出 HEAD 树（**HEAD = `3ecee352`，不含本轮代码改动**；`cp` 进四个本地环境文件；`UV_PROJECT_ENVIRONMENT` 指主仓 `.venv`，worktree 不新建空 venv）⇒ 跑同一批 = **144 failed / 1 passed**。
      **双向 diff**：先得到 `只在工作树红` **1 条** = `test_detector_repo_root.py::test_unmarked_location_raises_instead_of_scanning_nothing`，`只在 HEAD 红` 2 条（**逐行核出两条都不是 node id** —— `lark_broker` / `invoke_acp_agent_tool` 的失败摘要续行，老问题）⇒ 实质只有那 1 条。
      ⚠️⚠️ **那 1 条是 basetemp 造成的，不是回归**（**双向都验过**）：该用例的 `tmp_path` 断言"探测器被搬到 repo 外时报错"，而我全量跑用的是**仓内** `--basetemp=.pytest-tmp` ⇒ `tmp_path` 落在 `backend/.pytest-tmp`、**向上能找到 `.git`** ⇒ 不抛 ⇒ 红；HEAD 那批用的是**仓外** basetemp ⇒ 绿。**判据**：`工作树 + 仓外 basetemp ⇒ passed`、`HEAD + 仓内 basetemp ⇒ failed`，两个方向都复现 ⇒ **与代码无关**。
      ⇒ **改用一个统一的仓外 basetemp 重跑工作树那一批 = 144 failed / 1 passed**，与 HEAD **逐行一致** ⇒ **双向 diff 为空**。
      **⇒ Task 2 无新增红。** 收尾：worktree 已 `remove`、`_t2` 与 `.pytest-tmp` 已删、仓库里无新增残留。
      ⚠️ **两条留给后来者的判据**：① **`--basetemp` 的位置会改变结果** —— 仓内 basetemp 会让 `test_detector_repo_root` 这类"往上找 `.git`"的用例变红；**两侧对比必须用同一个仓外 basetemp**，否则会误报一条回归。② 抽 id 出来的清单**仍可能混进失败摘要的续行**（行首无 `::`）⇒ diff 完要**逐行核是不是 node id**。

## Task 3 — 文档同步与真栈验收

> 动到的文件：`backend/AGENTS.md`（那条回退 invariant 改成两条腿 + 补"记录的是实发值"）；真栈**不动仓库里任何文件**（隔离实例 + 本机 recorder，全在仓库外）。

- [x] `backend/AGENTS.md`：那条 "**A level outside the entry's declared subset falls back to the closest declared one**" 今天写的是通用语气，但**实现只在 anthropic 腿** ⇒ 改成**两条腿都回退**；并补一句"**记录的是实发值**"（含 `minimal` 那处拼写例外的说明）。
      **实测**：那条 invariant 改成 **"…on every leg"**，并写清**为什么必须在家族门之外**（读在门内**正是**当年让 openai 腿原样发的原因）+ 补了 `none` 那条边界；**新增一条** **"What is recorded equals what is sent"**（三处记录读同一个变量、变量在解析点解析、三个成因、`minimal` 那处**有意例外**及理由）。
      ⚠️ **计划没点名、我核出来的第三处**（**必须一起改，否则文档自相矛盾**）：同一条 invariant 里的 **"the `openai` leg is an identity: byte for byte what it always was"** —— 本对之后**不再成立**（名字仍是恒等，但**值会被回退改写**）⇒ 改成 "needs no table at all … **an in-range level** on that leg is byte for byte what it always was"。
      ⚠️ **两处自查出来的错**：① 我初稿写 **"Two of the three disagreed with the wire"** —— 读作"三处记录里两处"，**事实错**（三处**彼此始终一致**，不一致的是**记录 vs 线上**）⇒ 改成 **"Three of the four cases disagreed with the wire"**（A/B/C 三格）；② 我新写的行 **108–110 字符**、而**邻居 bullet 是 102–103** ⇒ 重新折行到 **102–105**。
      **逐条对着代码核过**：`_apply_declared_effort` 里 `issubclass` **出现 0 次**（协议无关 ✓）；家族门只在 `_translate_reasoning_effort`（`:149` ✓）；三处记录读同一变量（Task 0#2 ✓）；`minimal` 例外由 Task 2 的专属守卫用例钉住 ✓。全文 grep 过，**无其它地方**还说"回退只在 anthropic 腿"或"记录的是请求值"。
- [x] **真栈验收（口径照上一对：只验请求体形状，不声称回话）**：**隔离实例**（`DEER_FLOW_PROJECT_ROOT` / `DEER_FLOW_CONFIG_PATH` / `DEER_FLOW_MODELS_CONFIG_PATH` 三个环境变量指向**仓库外 scratch 根** + `DEER_FLOW_AUTH_DISABLED=1` + `:8099`）+ **本机 recorder 端点**（Anthropic/OpenAI 形状应答 + 落盘请求体）⇒ **零出网、未打任何云端点**。两条腿各建一条**声明了子集**的条目 ⇒ 请求层传一个**越界档** ⇒ 断言 recorder 抓到的请求体是**回退值**。
      ⚠️ **触发路径要点名**（上一对的教训）：**越界档从 run 请求的 `context.reasoning_effort` 传** —— `cfg = dict(config.get("configurable", {}))`（`agent.py:122`），**gateway 的 `context` 是自由 dict、全链路不做 Literal 校验**（已核）⇒ 条目声明 `['low','high']` 而请求传 `"medium"` 即构成越界。**别指望从界面传**：界面只列声明子集，选不出越界值（spec §1.1）。
      ⚠️ **启动隔离实例前把 `rag.qdrant_url` 也改到 scratch 或指向空**（上一对实测：它会连本机 `:6333` 做幂等的 `PUT …/index`；虽无害，但没必要碰共享服务）。
      **实测**：**触发路径落成** `POST /api/threads`（建线程）→ `POST /api/threads/{id}/runs/wait`，body 带 `context: {model_name: <条目>, reasoning_effort: "medium"}`；两条条目都**声明 `['low','high']`、默认 `low`**，端点 `127.0.0.1:8098`。**零出网**（recorder 应答）、**未打 `api.anthropic.com` 或任何云端点**。
      | 腿 | 路径 | 请求层传 | 抓到的请求体 |
      | --- | --- | --- | --- |
      | anthropic | `/v1/messages` | `medium` | **`output_config: {'effort': 'low'}`** |
      | openai | `/v1/chat/completions` | `medium` | **`reasoning_effort: 'low'`** |
      | 对照 anthropic | `/v1/messages` | `high`（子集内） | `output_config: {'effort': 'high'}` |
      | 对照 openai | `/v1/chat/completions` | `high`（子集内） | `reasoning_effort: 'high'` |

      ⚠️⚠️ **第一版不具区分度，是补了对照组才有意义的**：条目**默认档也是 `low`** ⇒ "发出 `low`"**也可能是"请求层被完全忽略"**。对照组（传 `high` ⇒ 线上 `high`）证明**请求层值确实被采纳** ⇒ 前面那个 `low` **只能是回退**。**这是本腿的关键判据，别省对照组。**
      ⭐ **顺带在真栈验到了记录侧**（计划只要求验请求体形状）：日志里 **warning 恰好 2 条**（`'medium'` → `'low'`，Declared levels `['low', 'high']`）⇒ **每次替换一条、不重复**（正是 D2 甲的设计）；`Create Agent(...)` 那条 info 对越界那两次记 **`low`（实发值）**、对对照组记 `high` ⇒ **记录 == 实发** 在真栈成立。
- [x] **收尾**：**零改动他的配置**（写入全落 scratch 根 ⇒ `models_config.json` md5 与动手前相同，**不欠还原**）、密钥不落盘（scratch 用现造的假值）、隔离实例与 recorder 停掉（`taskkill /T`，确认端口释放）、**scratch 目录删净**。
      **实测**：他的 `models_config.json` **md5 = `b8b729ddd624e7ea1587efb6466e70b6` 未变**；**共享 Qdrant 仍 18 collections**（`rag.qdrant_url` 已改到死端口 `127.0.0.1:6399` ⇒ 启动时只记了一条连接异常，**没碰共享服务**）；他的 `:8001`（PID 80924）仍在听；我的 gateway + recorder 已 `taskkill /T`，`:8098`/`:8099` 已释放；`_t3` scratch **已删净**；**密钥不落盘**（scratch 里那把是现造的假值 `t3-local-key`）。
- [x] **门禁**：`backend/AGENTS.md` **没有 prettier 门禁**（上一对已查实：仓库根无 prettier 配置；pre-commit 那条只管 `frontend/` 且 `types_or` 不含 markdown）⇒ 只核内容；`models_config.json` md5 未变。
      **实测**：内容已逐条对代码核过（见上）；`models_config.json` md5 未变（见收尾）。⚠️ **`frontend/AGENTS.md` 本对不动**（constitution 那个字段前端零渲染）⇒ 无需量它的 prettier。
- [x] **交付后回写**：spec 的 `**Status:**` 与 plan 本文件的 `**Status:**` 一起更新（交付的提交号 + 关键门禁数字），并把各 Task 的 `**实测**` 行补齐 —— **未回写的 plan 不算交付**。
      **实测**：本文件的 `Status` 与 spec 的 `Status` 已改成"**三个 Task 全部交付**"并带上提交号与关键数字；Task 0–3 的 `实测` 行**全部回填**（`grep '实测 = *$'` 归零）。

---

## 提交切分

| 提交 | 内容 |
| ---- | ---- |
| 0    | **本计划 + 它的 spec 成对** |
| 1    | Task 1（纯函数 + 两条腿回退 + warning） |
| 2    | Task 2（记录跟随实发值 + 补传引导腿参数 + 用例） |
| 3    | Task 3（文档 + 真栈结论） |

**依赖**：**上一对（`2026-09-19-model-effort-probe-and-translation`）已经落地**（`bb137237` 翻译 / `8849dc9c` 前端 / `ed8b30bb` 文档+真栈）——本对**扩**它：把回退铺到两条腿、并把记录侧跟上。**不改表、不改 schema、不动默认值、不动界面、不做探测。**

**摘出本对的那一半**：**配置期探测**（`ModelInfo.capabilities.effort`）仍登记在上一对 spec §6，等拿到会填能力块的端点再另起一对。

**第三条待办线（明确不并进本对）**：**opencode 的 `x-opencode-session` 请求头** —— 它是"客户端与那家的用法约定"，不是本轴的缺口；正式修法要给条目加自定义头字段（动 `ManagedModelInput` allowlist + 界面），**另立一对**。
