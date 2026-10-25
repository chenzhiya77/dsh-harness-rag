# 界面「OpenAI 兼容」格的默认推理回放 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-22-reasoning-replay-default-design.md](../specs/2026-09-22-reasoning-replay-default-design.md)
**Status:** ✅ **已交付（2026-09-23）** —— Task 1 `69601777`（通用类 + D7 搬家）/ Task 2 + Task 5 `dcdcdb09`（config 三处 + 文档）/ Task 6 **真栈全过**（12–14 / 16–17b，**零代码改动**，随设计文档本笔一并提交）/ **门禁全量（2026-09-24）**：ruff 净、A/B 双向仅差 1 条（已归因环境，见文末）。spec 已定稿（**D1–D8 全部已裁**：**D5 乙**（2026-09-22 改判 —— 向导不进本对）/ D6 甲 / D8 甲 且进本对；**逃生舱已整体取消 —— 五补**；**缺口 5 的 vLLM 请求侧归一并入通用类（复用同一函数）—— 六补，2026-09-23**；**名表加第三个名字 `reasoning_text`（照 pi 抄全）—— 七补，2026-09-23**；见 spec 文首）。
**Parent:** [2026-09-21-model-entry-field-parity-design.md](../specs/2026-09-21-model-entry-field-parity-design.md)（同表面、已交付；唯一接触点是 `backend/AGENTS.md` 同文件 ⇒ **串行落笔**）· [2026-09-10-web-model-provider-config-design.md](../specs/2026-09-10-web-model-provider-config-design.md)（界面模型管理与 `PROVIDER_ALLOWLIST` 的出处）。

**Architecture:** 四件事 —— **① 新通用类** `deerflow/models/reasoning_replay.py`（三个钩子全部「包一层 super()」：捕获两条路（流式 delta / 非流式整包）+ 回放（D8 甲：按捕获记录的名字同名回放）+ 展示键固定 `reasoning_content`；**外加归一一行** —— **复用** `vllm_provider._normalize_vllm_chat_template_kwargs`，2026-09-23 并入、该文件一个字节不改）；**② 共享助手** `assistant_payload_replay.py` 收编 `_restore_tool_call_signatures`（`patched_openai.py` 改为 import，行为零变化；D7）；**③ `models_config.py` 三处**（allowlist 换行 / `_LEGACY_USE_TO_PROVIDER` 别名 / `from_file` 载入归一；D2/D3）；~~**④ 工厂 guard**~~（**已取消 2026-09-22**：逃生舱不做 ⇒ 键不存在）；**⑤ 文档 + 真栈隔离实例**（`backend/AGENTS.md` + `docs/CONFIGURATION.md`；验收 12–17b）。向导**不在内**（D5 乙）。

**硬约束（spec 已裁，实现时不许自行放松）**：
- **回放名 = 捕获时记录的实际用过的名字**（D8 甲：逐 chunk「首个非空」，名表 `("reasoning_content", "reasoning", "reasoning_text")` 序 —— **三个名字：第三个照 pi 抄全，七补 2026-09-23**）。**展示别名（派生副本）永不外发**；**没见过的字段什么都不发**（⇒ 对无推理端点出站与普通类**逐字节等价** —— 这是验收 3/14 的判定线）。
- ~~**`off` = 捕获仍做（展示不变）、回放不做** ⇒ 出站与普通类逐字节相同（验收 4/15）。不造第三档。~~ **已取消（2026-09-22：不做逃生舱，spec D4）**
- **别名与真收的分开靠捕获时记来源**：消息上记 `_wire_reasoning_field`（wire 真收的名字）；只有它参与回放。
- **请求侧归一并入（2026-09-23 六补）**：通用类在 `_get_request_payload` 的 `super()` 之后调 `vllm_provider._normalize_vllm_chat_template_kwargs(payload)` —— **复用同一个函数、不复制**，`vllm_provider.py` **一个字节不改**（函数 self-guard：无旧键时早退、连 `extra_body` 容器都不重建）。判定线：旧拼写 `chat_template_kwargs.thinking` ⇒ 出站变 `enable_thinking`（已有 `enable_thinking` 时**不覆盖**）；新拼写 / 无该键 ⇒ **逐字节不变**（验收 3b）。
- **responses 腿（`use_responses_api: true`）零改动**（两条已核事实：payload 无 `messages` ⇒ 回放取空表；该模式不走 `_create_chat_result` / `_convert_chunk_to_generation_chunk`）。
- **provider id 不变** ⇒ 前端、`routers/models.py` 一个字节不动（D2）。
- **7 个厂商补丁类的行为一个字不变** —— `patched_openai` 只换 import（共享助手提升后行为零变化，由既有用例钉住）。
- **`use:` 路径串** = `deerflow.models.reasoning_replay:ReasoningReplayChatOpenAI`（D6 甲）。

**Global Constraints:**
- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **后端窄面命令**：`cd backend && PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync pytest tests/<file>.py -q`；**全量** `cd backend && make test`（≈23 分钟 ⇒ **后台跑**）。跨树 A/B 两侧用**同一个仓外 basetemp**（自己新建一个**仓外**目录即可、两侧共用；别落仓内 —— 否则凭空多一条 `test_detector_repo_root` 类红；跑完删净）。
- **不碰真实密钥**：真栈=隔离实例（三个 `DEER_FLOW_*` 指向仓外 scratch 根 + 本机 recorder、假 key、零出网）；跑完 `models_config.json` / `config.yaml` **md5 必须与动手前相同**。
- **每个 Task 的 `**实测**` 行必须回填**（RED 几条红 / GREEN 几条绿 / neuter 受害者 / 门禁数字）——未回写的 plan 不算交付。
- **scope fence（明确不做）**：不加界面控件，**逃生舱 `off` 整体取消（2026-09-22 五补）**（缺口 6；判据见 spec D4）· 不并 MiniMax 请求侧两件（缺口 4）· **vLLM 请求侧归一经裁「已并」（2026-09-23 六补）**、只剩累计 usage 换算不并（缺口 5 剩余）· 不剥内联标签（缺口 3）· 不做 MindIE / Codex / Claude（缺口 7）· 不加 vLLM 格（缺口 9）· 不清理 `is_lc_serializable` 库存不一致。

**依赖顺序**：Task 0（只读核实）→ Task 1（通用类）→ Task 2（models_config）→ ~~Task 3（工厂 guard，已取消）~~ → ~~Task 4（向导，已取消）~~ → Task 5（文档）→ Task 6（真栈）。

---

## Task 0 — 开工前的核实（只读）· **第 1 / 6 项已取消（2026-09-22：不做逃生舱）；⑧ 追加于 2026-09-23**

> 动到的文件：**无**。第 7 项允许一次性探针，跑完即删、仓里无残留。

- [x] 1. ~~**`ModelConfig` 里 `reasoning_replay` 的声明形状**~~ —— **已取消（2026-09-22：逃生舱不做，键不存在）**，原核实点留档：核 `backend/packages/harness/deerflow/config/model_config.py` 的字段风格（`Literal` 的既有先例、`Field(description=…)` 有没有在用）⇒ 决定 `reasoning_replay: Literal["auto","off"] | None = None` 的写法；并核 `model_dump(exclude=…)` 的排除集**不含**它（它要进构造参数 ⇒ 不能进排除集）。
- [x] 2. **捕获钩子的插入点与既有类的形状对照**：`patched_mimo.py:25`（delta 侧）、`patched_stepfun.py:28`、`patched_minimax.py:31`（message 侧）逐处看形状（dict / Pydantic / `model_extra` 三处找的写法）；核 `_convert_chunk_to_generation_chunk` 签名与 `super()` 返回值（None 情形）。
- [x] 3. **`additional_kwargs` 的非标键会不会被丢**：核 LangChain **chunk 合并**（`merge_dicts`）对 `additional_kwargs` 里任意键的行为；核 `_convert_input(x).to_messages()` 往返后 `additional_kwargs` 完整（`_WIRE_FIELD_KEY` 靠它活到下一轮）。⚠️ 与 vLLM `cumulative_stream_usage` 的实现对照（字段声明在 `vllm_provider.py:185`；其账务记录落在 `usage_metadata` / 实例字典、**不是 `additional_kwargs`**）—— "ak 里放私有键"的真实先例是补丁类自己（`patched_mimo` 写 `ak["reasoning_content"]`）。
- [x] 4. **既有断言扫描**（动手前必做）：把**将被改动**的测试里所有相关断言列出来，逐条判"会不会红"：`test_models_config.py:221-230` / `:250-260`（allowlist 断言）· `test_models_config_api.py:194`（PUT 落盘 `use:`）· `test_model_factory.py`（构造 kwargs 形状断言）。（`test_setup_wizard.py` **已出列**：D5 改判乙 ⇒ 向导不进本对。）⚠️ 判据：断言**逐键**的沿用现成写法（"不填就不写：键不存在"）。
- [x] 5. ~~**向导 8 处行号核实**~~ —— **已取消（2026-09-22 D5 改判乙：向导不进本对）**，原核实点留档：`scripts/wizard/providers.py` 的 `openai` / `openai_responses` / `novita` / `minimax` / `minimax_cn` / `openrouter` / `orcarouter` / `other` 各处的 `use=` 行号（计划写的是 `182/199/359/378/401/424/441/537`，逐处核对；⚠️ 同文件还有 gemini/mimo/deepseek 等**不换**的预设，别误伤）。
- [x] 6. ~~**工厂 guard 的插入点核实**~~ —— **已取消（2026-09-22：不做逃生舱，Task 3 一并取消）**，原核实点留档：`factory.py:379-380`（两个 normalizer 调用点）与 `_warn_unknown_model_settings`（`:431`）之间；核 `model_settings_from_config` 那个 local dict 的生命周期（pop 要改到它、且在被 dump/排除之前或之后的位置关系）。
- [x] 7. **（一次性探针，跑完即删）签名回放无回归**：把 `_restore_tool_call_signatures` 提升到 `assistant_payload_replay.py` 之后，`patched_openai` 的既有用例仍绿（探针 = 先只做 import 调整跑既有用例；确实绿则不留探针文件）。
- [x] 8. **（一次性探针，2026-09-23）归一函数可复用且 self-guard**（六补的前置核实）：`from deerflow.models.vllm_provider import _normalize_vllm_chat_template_kwargs` 在**独立进程**里可导入（`vllm_provider.py` 顶层只 import `openai` / `langchain_core` / `langchain_openai` / `pydantic`，**零 `deerflow.*` ⇒ 无循环风险**）；四例行为见实测 ⑧。

**实测（2026-09-23，四项逐条）**：

- **② 钩子形状（照 MiMo 抄）**：三个补丁类都是**同三件**（`_get_request_payload` 回放 / `_convert_chunk_to_generation_chunk` 流式捕获 / `_create_chat_result` 非流式捕获）。**流式钩子的签名与形状**（`patched_mimo.py:88-113`，最短最纯、逐行照抄）：`def _convert_chunk_to_generation_chunk(self, chunk: dict, default_chunk_class: type, base_generation_info: dict | None) -> ChatGenerationChunk | None` ⇒ 先 `super()`；**`if generation_chunk is None: return None`**（None 情形必须先挡）；再 `choices = chunk.get("choices", [])`；有 choice 时取 `choices[0].get("delta") or {}`，用抽取器拿 `str | _MISSING`；命中时**重建** `ChatGenerationChunk(message=_with_x(generation_chunk.message, value), generation_info=generation_chunk.generation_info)`（`_with_x` = `model_copy(update={"additional_kwargs": …})`，且**值没变就不写** —— 见 ③ 的 concat 语义）。`_create_chat_result` 里逐 choice 读 message 侧，抽取器三处找（dict / Pydantic 属性 / `model_extra`）**照 `patched_mimo._extract_reasoning_content:25-41` 抄**；MiniMax 多一步读 `reasoning_details`（列表→文本，`:31`/`:223`）。⚠️ StepFun / MiniMax 的流式钩子更长（含自写转换 / 帧修正）—— 那部分**已裁不搬**（D1 的"包 super()"表）。

- **③ `additional_kwargs` 会不会丢（一次性探针，`langchain_core` 实测）**：**不会丢** —— 键在**任一** chunk 上（左或右）合并后都保留；`_convert_input([...]).to_messages()` **返回同一批对象**（探针打 `same object? True`）⇒ ak 逐字保真、`_WIRE_FIELD_KEY` 能活到下一轮。⚠️ **但合并是"值级联"**：**字符串会 concat**（`{"reasoning_content":"abc"} + {"reasoning_content":"xyz"}` ⇒ `"abcxyz"`）、**列表会 extend**（`[{"a":1}] + [{"b":2}]` ⇒ 两项）。⇒ **实现注两条**：① **记录键（`_wire_reasoning_field`）必须"首见即写、之后不再写"**（每 chunk 都写会被拼成 `reasoning_contentreasoning_content`）；② 展示/原名键沿用补丁类现状"有值才写"，**累加交给合并语义**（MiMo 的 `_with_reasoning_content` 正是这么做的）。**旁证**：本仓今天已依赖 ak 一路活到前端（思考内容能显示 ⇒ 跨 state/SSE 保真已有生产证据），与探针结论一致。

- **④ 既有断言扫描（会红的清单，Task 2 的 RED 照此写）**：**确凿 2 处** —— ① `tests/test_models_config.py:224`：`("openai-compatible", "langchain_openai:ChatOpenAI")` ⇒ 改行后**必红**（改断言成新类）；② `tests/test_models_config_api.py:194`：`assert stored["oa"]["use"] == "langchain_openai:ChatOpenAI"`（PUT 落盘的 `use:`）⇒ **必红**。**需补新 case 1 处** —— `tests/test_models_config.py:253` 的 `reverse_lookup_provider` 参数表**只覆盖旧类**（靠别名保住 ✔）⇒ 要**加一行"新类 → openai-compatible"**，否则新路径没被反查钉住。**其余不受影响**：全仓 `langchain_openai:ChatOpenAI` 出现 ~60 处，但除上述三处外**全是夹具/文本**（`use=` 构造 `ModelConfig`、config.yaml 文本、`_entry()`/`_cap_model()` helper、`test_model_factory.py` 的构造点）—— 不走 allowlist、不写 UI 文件 ⇒ 不红；`test_models_config.py:55-134` 那组（union / 覆盖 / source tag / env 变量）只断言 **name 集合 / api_key / is_ui_managed_model**、**不断言 `use`** ⇒ 归一段碰不到它们；`:269` 的 `from_file` 形状校验用例喂 `{"name": "missing-use-and-model"}` ⇒ **不匹配归一条件**（`use == 旧类`）⇒ 仍按预期 `ValueError`。⚠️ `test_model_factory.py` **本对不再碰**（guard 已取消）⇒ 从窄面出列（spec §4 已标）。

- **⑦ 签名回放搬家探针（一次性，已删）**：把 `_restore_tool_call_signatures` 临时搬进 `assistant_payload_replay.py`（改名 `restore_tool_call_signatures`）+ 改 `patched_openai.py` 的 import 与调用点 + 改测试 import ⇒ **`tests/test_patched_openai.py` 8 passed**、**`tests/test_model_factory.py` 102 passed**（零回归）。**产出（计划没点名的改动面）**：`tests/test_patched_openai.py:13` **直接 import 了私有名** ⇒ 搬家必须**连这一行一起改**（其余 8 处是同文件内的调用点、用本地名不用改）。**还原证据**：三个文件复原后 `git status` / `git diff --stat` 均空、复跑 `test_patched_openai.py` 8 passed（对照组）。

- **⑧ 归一函数可复用（一次性探针，2026-09-23，独立进程，`uv run --no-sync`）**：导入成功 ⇒ 并入条件成立。**四例实测**：`{"thinking": False}` ⇒ `{"enable_thinking": False}`（旧键删、值搬过去）；`{"enable_thinking": True, "thinking": True}` ⇒ `{"enable_thinking": True}`（**`setdefault` 语义：已有新键不被覆盖**）；`{"enable_thinking": True}` ⇒ **原样**（无旧键 ⇒ 早退）；`{"messages": []}` ⇒ **原样**。⇒ Task 1 的 RED 第 8 条按这四例写、neuter ⑤ 按"删掉归一调用"做。

---

## Task 1 — 通用类本体（新文件 + 新测试文件）

> 动到的文件：`backend/packages/harness/deerflow/models/reasoning_replay.py`（**新增**）、`backend/packages/harness/deerflow/models/assistant_payload_replay.py`（+`_restore_tool_call_signatures` / `restore_tool_call_signatures` 提升）、`backend/packages/harness/deerflow/models/patched_openai.py`（改 import）、测试 `backend/tests/test_reasoning_replay.py`（**新增**）、`backend/tests/test_patched_openai.py`（**+1 行 import** —— 它直接 `from …patched_openai import _restore_tool_call_signatures`，搬家必须连这行一起改；见 Task 0-⑦ 实测）。
> ⚠️ **`backend/packages/harness/deerflow/models/vllm_provider.py` 只被 import、不进改动面**（2026-09-23 六补：归一函数原地复用 —— `git diff` 里不该出现这个文件）。
> **验收对应**：spec §4 的 1 / 2 / 3 / **3b** / 5 / 10 / 11（~~4~~ 随逃生舱取消 —— 2026-09-22）。

- [x] **RED**：新建 `test_reasoning_replay.py`，先红：
      1. **捕获两条路**（验收 1）：流式 delta 与非流式 message 各喂 `reasoning_content` / `reasoning` / `reasoning_text`（**三个名字**，七补）⇒ ak 里**原名存原值**、文本落 `additional_kwargs["reasoning_content"]`、**空串保留**、`_wire_reasoning_field` == 实际名。
      2. **回放按记录名**（验收 2 + D8 甲）：wire=`reasoning_content` ⇒ 出站 payload 是 `reasoning_content`；wire=`reasoning` ⇒ 是 `reasoning`；wire=`reasoning_text` ⇒ 是 `reasoning_text`；三者都**不多出** `reasoning_content`（展示别名不外发）；**双名同现**（同 chunk 两名非空）⇒ 回放名 = 记录名（首非空）。
      3. **没见过的字段不发 / 对照组**（验收 3）：端点没回推理字段 ⇒ 出站 payload 与普通 `ChatOpenAI` **逐字节相同**（同一输入两模型各 dump 比对）。
      4. ~~**`off`**（验收 4）：出站与普通类逐字节相同；捕获仍在（ak 仍有 `reasoning_content` 与记录键）；⚠️ **并钉住 tool-call 签名也不回放** —— 喂一条带 `thought_signature` 的消息 ⇒ 断言 payload 的 tool-call 里**没有**它。~~ **已取消（2026-09-22：不做逃生舱，验收 4 作废）**
      5. **responses 腿零改动**（验收 5）：`use_responses_api=True` 的 payload 过 `_get_request_payload` 逐字节不变；该模式下另外两个钩子**不被调用**（桩钉住）。
      6. **`reasoning_details` 展示变体**（验收 10）：非流式列表 → `ak["reasoning_content"]` 文本（空行拼接）、**不被回放**。
      7. **tool-call 级签名**（验收 11）：`thought_signature` 回填（沿用 `patched_openai` 既有用例，提升后行为不变）。
      8. **请求侧归一**（验收 3b，2026-09-23 六补）：payload 带旧拼写 `extra_body.chat_template_kwargs.thinking` ⇒ 出站 `enable_thinking`（旧键删、值搬过去）；**已有 `enable_thinking` 时不覆盖**（`setdefault`）；新拼写 / 无该键 ⇒ **逐字节不变**（含 `extra_body` 容器）。四例的字面量见 Task 0-⑧ 实测。
- [x] **GREEN**：实现三个钩子（全部「包 super()」）+ `_WIRE_FIELD_KEY` 记录 + `_restore_assistant_fields`（spec §3.1 草案语义，D8 甲）。实现注：记录键**每条消息一个名字**（首见即定 —— pi 是每块 signature，这里简化为每条消息；多 chunk 混合名时以**首个非空**为准）。⚠️ **Task 0-③ 的硬事实**：LangChain 的 chunk 合并对**字符串做 concat**、对**列表做 extend** ⇒ **记录键必须"首见即写、之后不再写"**（每 chunk 都写会把它拼成 `reasoning_contentreasoning_content`）；展示/原名键沿用补丁类现状"**值没变就不写**"（`_with_reasoning_content` 的写法），**累加交给合并语义**。**归一**：`_get_request_payload` 里 `super()` 之后、回放之前调 `_normalize_vllm_chat_template_kwargs(payload)`（从 `deerflow.models.vllm_provider` import —— **复用不复制**；位置与 `vllm_provider.py:230` 一致）。窄面转绿。
- [x] **neuter ①（回放名记录）**：把回放改回"有 `reasoning` 就回 `reasoning`"（旧写法）⇒ **双名用例必须红**、单名两条保持绿。改回。
- [x] ~~**neuter ②（off 短路）**：删掉 `reasoning_replay == "off"` 早退 ⇒ 验收 4 转红。改回。~~ **已取消（2026-09-22：不做逃生舱）**
- [x] **neuter ③（别名不外发）**：把回放源从"记录名"改成"总是 `reasoning_content`" ⇒ wire=`reasoning` 用例转红（别名外发）。改回。
- [x] **neuter ⑤（归一）**：删掉归一调用 ⇒ **第 8 条转红**、其余保持绿。改回。
- [x] ~~**neuter ④（early return 位置）**：把 `off` 的早退挪到 `restore_assistant_payloads(...)` **之后**（即"只关推理字段、签名照回"）⇒ 第 4 条里**签名那一钉转红**（证明它咬得住）。改回。~~ **已取消（2026-09-22：不做逃生舱 —— 第 4 条与 early return 一并取消）**
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`test_reasoning_replay.py` + `patched_openai` 既有用例所在文件）绿。

**实测（2026-09-23，Task 1 已交付代码、未提交）**：

- **RED**：新建 `test_reasoning_replay.py`（当时 21 例）⇒ `ModuleNotFoundError: No module named 'deerflow.models.reasoning_replay'` ⇒ **整文件 1 error**（采集期红，符合"新模块"预期）。
- **GREEN**：窄面 **30 绿**（新文件 22 + `test_patched_openai.py` 8 —— 含搬家后的 import/调用改名）⇒ 扩到 **7 个相关文件 83 绿**（另含 mimo / stepfun / minimax / vllm / `test_assistant_payload_replay`）；`test_model_factory.py` **102 绿**（零回归）。
- **neuter ①（回放名记录）**：回放改回"有 `reasoning` 就回 `reasoning`" ⇒ **5 红 / 17 绿**。受害者：`[reasoning_text]`、"display 别名不外发"、**双名同现**、"多轮回放"、**`reasoning_details` 不外发**（它靠"未记录 ⇒ 不外发"兜底，旧写法会把展示键发出去）；**单名 `[reasoning]` / `[reasoning_content]` 两条保持绿** —— 与计划预测一致。改回。
- **neuter ③（别名不外发）**：回放源改成"总是 `reasoning_content`" ⇒ **4 红 / 18 绿**（`[reasoning]`、`[reasoning_text]`、合并那条、多轮那条；`[reasoning_content]` 保持绿）。改回。
- **neuter ⑤（归一）**：注掉归一调用 ⇒ **2 红 / 20 绿**（两条 `chat_template_kwargs` 用例），**无其他受害者**。改回。
- **门禁**：`ruff check` **All checks passed**；`ruff format --check` 净（对两个新文件跑过一次 `ruff format` —— 只补末行换行 + 折叠一行，无逻辑改动）；窄面 83 绿、工厂 102 绿。
- ⚠️ **与 Task 0-③ 预案的偏差（重要，已在代码里注释）**：预案"记录键首见即写、之后不再写"**挡不住分块转换** —— 每次 `_convert_chunk_to_generation_chunk` 都从**新消息**起步 ⇒ 每块都会写一次，合并后键值被拼成 `reasoningreasoning`（首跑 **1 failed** 正是这条；已核 `merge_dicts`：**字符串一律 `+=`**，非字符串等值才保留）。落法改为**读侧容忍**：新增 `_recorded_wire_name()` —— 只接受"**单一名字的整次重复**"，其余（含混名、半截）视为**未记录、不外发**；相应用例从"断言只写一次"改成"**合并后仍能正确回放**"（合并结果里键值确实是 `reasoningreasoning`，断言照实记录）。
- **改动面**：新 `reasoning_replay.py` **222 行** + 新 `test_reasoning_replay.py` **311 行**；`assistant_payload_replay.py` **+37**（`restore_tool_call_signatures` 提升为公开助手）；`patched_openai.py` **−46/+3**（本地 def 删、改 import；顺带删掉不再使用的 `AIMessage` import）；`test_patched_openai.py` **22 行改写**（import + 8 处调用改名 + 散文一句）。`vllm_provider.py` 未被触碰（`git diff` 里没有它）。

---

## Task 2 — `models_config.py` 三处（allowlist / 别名 / 载入归一）

> 动到的文件：`backend/packages/harness/deerflow/config/models_config.py`；测试 `backend/tests/test_models_config.py` / `test_models_config_api.py`。
> **验收对应**：spec §4 的 7 / 8 / 9。

- [x] **RED**：更新/新增断言，先红：
      1. allowlist（验收 7）：`resolve_provider_use("openai-compatible")` == 新类；`reverse_lookup_provider(新类)` == `"openai-compatible"`；**旧路径**（`langchain_openai:ChatOpenAI`）反查仍 == `"openai-compatible"`（别名）。
      2. 载入归一（验收 8）：含普通类的 `models_config.json` 经 `ModelsConfig.from_file` ⇒ `use` 变新类（每载入一条 `logger.info` 一次）；**未知类不动**；`config.yaml` 条目不经此路（`merge_ui_models` 直通）。
      3. PUT 落盘（验收 9）：界面建条 ⇒ 文件里 `use:` == 新类。
- [x] **GREEN**：三处按 spec §3.3 落；模块 docstring「provider id → 类路径」那句跟着改。窄面（`test_models_config.py` + `test_models_config_api.py`）转绿。
- [x] **neuter（归一）**：把 `from_file` 的归一段删掉 ⇒ 验收 8 转红、7/9 保持绿。改回。
- [x] **门禁**：ruff 双净；更宽面（`test_model_config.py` + `test_doctor_models.py` 等既有消费者）跑一遍无新增红（已知环境红 `test_missing_models_file_falls_back_to_config_yaml` 除外）。

**实测（2026-09-23，Task 2 已交付代码、未提交）**：

- **RED**：改/加断言后跑两文件 ⇒ **4 红**（`test_resolve_provider_use_allowlist[openai-compatible-…]`、`test_reverse_lookup_provider[新类行]`、**新增** `test_from_file_normalizes_the_legacy_openai_class`、`test_put_maps_endpoint_key_per_provider`）+ 1 条已知环境红（`test_missing_models_file_falls_back_to_config_yaml` —— **在源码未改的首跑里就红**）。另外两条新用例（未知类不动 / `merge_ui_models` 直通）**首跑即绿** ⇒ 它们是**钉子**、不是红。
- **GREEN**：两文件 **84 绿 / 1 环境红** ⇒ 扩到 **10 个消费者文件 235 绿 / 4 环境红**（见门禁）。
- **neuter（归一）**：把 `from_file` 的归一段换成直通 ⇒ **恰好 1 红**（`test_from_file_normalizes_the_legacy_openai_class`）+ 那条环境红；**allowlist / 反查 / PUT 三组保持绿** —— 与计划预测一致。改回。
- **门禁**：`ruff check` **All checks passed** + `ruff format --check` 净（3 文件）。更宽面 4 条红**全是环境条件、零回归**：
  - 3 条**已登记**（`test_missing_models_file_falls_back_to_config_yaml` + `test_app_config_reload` 两条 —— 本机仓库根真实 `models_config.json` 所致）；
  - 第 4 条 `test_doctor.py::TestCheckModelsConfigured::test_no_models`（**同族、此前未登记**）—— **A/B 证明**：把 `DEER_FLOW_MODELS_CONFIG_PATH` 指向一个**空的** UI 文件后，doctor 与 reload 两条**齐变绿**（`1 failed, 3 passed`）；它读的是**合并后**的 AppConfig，真文件让集合非空 ⇒ 与本次改动无关。
- **落地形态**：allowlist 换行（`reasoning_replay:ReasoningReplayChatOpenAI`）+ `_LEGACY_USE_TO_PROVIDER` 别名（`reverse_lookup_provider` = 新表 `.get()` **或** 旧表 `.get()`）+ `from_file` 内 `_normalize_legacy_use()`（内存里改 `use`、每条 `logger.info` 一次；**非 dict / 未知类原样通过** ⇒ 既有「形状非法 ⇒ ValueError」行为不变）。
- ⚠️ **环境红新增一员**（已记进记忆）：`test_doctor.py::TestCheckModelsConfigured::test_no_models` 也属「本机真文件」族。

---

## Task 3 — ~~工厂 guard（`reasoning_replay` 落到不声明的类）~~ **已取消（2026-09-22：不做逃生舱）**

> ⛔ **已取消**：`reasoning_replay` 键本身随"不做逃生舱"一并取消（spec D4 四补）⇒ **没有键需要 guard**，工厂 `factory.py` 回到零改动。**下方原计划内容留档备查、不执行**；真撞上"回带被拒"时按 spec D4 / §3.2 原样恢复（含本节的 RED/neuter/门禁）。

> 动到的文件：`backend/packages/harness/deerflow/models/factory.py`；测试 `backend/tests/test_model_factory.py`。
> **验收对应**：~~spec §4 的 6~~ —— **随本 Task 取消作废（2026-09-22）**。

- [ ] **RED**：构造 kwargs 里带 `reasoning_replay="off"` 但目标类不声明它（`ChatAnthropic` 等）⇒ **被 pop + 一条 warning**；目标类是通用类 ⇒ **原样进构造参数**（`ChatOpenAI` 的 kwargs 里能读到）。今天前者会把键带进 `model_kwargs` ⇒ 红。
- [ ] **GREEN**：`_normalize_reasoning_replay`（spec §3.2 草案）+ 调用点插在 `:379-380` 之后、`_warn_unknown_model_settings`（`:431`）之前。窄面转绿。
- [ ] **neuter**：删掉 guard 调用 ⇒ RED 条转红。改回。
- [ ] **门禁**：ruff 双净；窄面（`test_model_factory.py`）绿。

**实测（待回填）**：

---

## Task 4 — ~~向导 8 处 `use=` 并换~~ **已取消（2026-09-22，D5 改判乙）**

> 动到的文件：`scripts/wizard/providers.py`（8 处）；测试 `backend/tests/test_setup_wizard.py`。
> **验收对应**：~~spec §4 的 18（`test_setup_wizard.py` 的窄面部分）~~ —— **随本次取消作废**（spec 的 18 已不含该文件）。
>
> ⛔ **取消原因（operator 判定）**：本对只对**界面写入 / 载入归一**的条目生效；向导是**另一条写入路径**（装机期、`config.yaml` 属 operator 域），一并换会把范围从"界面默认"扩到"装机默认"。**下方原计划内容留档备查、不执行**；想要回放的替代路径（手改 `use:` / 界面建同名条目覆盖）见 spec D5 节。

- [ ] **RED**：在 `test_setup_wizard.py` 给那 8 个预设补断言（今天只钉 gemini / mimo / deepseek 三条 `use:`，`:54-56`；普通类未被断言）⇒ 断言新类 ⇒ **红**。
- [ ] **GREEN**：`scripts/wizard/providers.py` 8 处 `use=` 换成新类（**只换 openai 兼容那 8 个预设**；gemini/mimo/deepseek 等**不动**）。窄面转绿。
- [ ] **neuter**：把其中 1 处改回普通类 ⇒ 对应断言转红。改回。
- [ ] **门禁**：ruff 双净；窄面（`test_setup_wizard.py` + `test_models_config.py`）绿。

**实测（待回填）**：

---

## Task 5 — 文档

> 动到的文件：`backend/AGENTS.md`（模型工厂 / 适配器段 + allowlist 段）、`backend/docs/CONFIGURATION.md`（OpenAI 兼容段）。
> ⚠️ **与 field-parity 线串行**（同文件）——动手前先确认那边已落笔（它已交付 `46b69ea5` + `27267d91`）。

- [x] 1. `backend/AGENTS.md`：allowlist 段补「`openai-compatible` 默认类是通用回放类（捕获 + 同名回放）；旧类路径保留在反查别名里」；~~模型工厂段补 guard 一句~~（**已取消 2026-09-22**：工厂零改动）；**vLLM Provider 段**那句「accepting the older `thinking` alias」补一句：归一同一个函数，现在**两个类共用**（2026-09-23 六补）。
- [x] 2. `backend/docs/CONFIGURATION.md`：OpenAI 兼容段写明「界面默认走新类；手写旧类仍可用（无回放）；**旧拼写 `chat_template_kwargs.thinking` 仍被归一成 `enable_thinking`**（发送前改写）」；~~`off` 的写法~~（**已取消 2026-09-22**：逃生舱不做）。
- [x] 3. **相邻句扫描**：改完把两处前后相邻句读一遍（防与既有描述矛盾），有矛盾就修。

**实测（2026-09-23，Task 5 已交付、未提交）**：

- **改了三处（计划点名两处 + 扫描查出的一处）**：① `AGENTS.md` allowlist 段 —— 补「默认类 = `reasoning_replay:ReasoningReplayChatOpenAI`（捕获 + 同名回放）、换默认前的条目**载入时在内存里升级**、旧类路径留在 `reverse_lookup_provider` 的别名表里」；② `AGENTS.md` **vLLM Provider 段** —— 「accepting the older `thinking` alias」后补：该归一是 `_normalize_vllm_chat_template_kwargs`，现在被 `ReasoningReplayChatOpenAI` **原样复用** ⇒ 两个类都收旧拼写；③ `docs/CONFIGURATION.md` OpenAI 兼容段（OpenRouter 示例之后、`**Thinking Models**` 之前）加一段 **Reasoning replay** 注：界面建的条目走新类 / 手写条目**保留**它写的类（普通类 = 无回放，要回放就把 `use:` 指过去）/ 两个类都仍把旧拼写改写成 `enable_thinking`。
- **相邻句扫描（逐处读了前后文，并全文件 grep 了 `langchain_openai:ChatOpenAI` 与「Settings → Models」）**：查出**一处会变成矛盾** —— `AGENTS.md:545` 原写「`use_responses_api` / `output_version` … 让 responses 腿能**仍用 `langchain_openai:ChatOpenAI`**」；界面那格现在指向回放子类 ⇒ 改成「仍用 **一个 `ChatOpenAI` 客户端** —— 界面那格用回放子类，它的 responses 腿与普通类**逐字节相同**（无 `messages` 可回放、两个捕获钩子都不被调用）」。
- **未改（读过判为不矛盾）**：`CONFIGURATION.md` 的各处 `use: langchain_openai:ChatOpenAI` 示例（**手写条目**本来就不换类，示例仍有效）、「For Gemini … the plain `langchain_openai:ChatOpenAI` … is sufficient」、`AGENTS.md` 的 `VllmChatModel subclasses langchain_openai:ChatOpenAI` 一句（局部类名描述）。
- **门禁**：本 Task 只动两个 md ⇒ 按惯例**不跑**测试套件（纯文档）。

---

## Task 6 — 真栈隔离实例（验收 12–14 / 16–17 + 17b；~~15~~ 已取消 2026-09-22）

> 动到的文件：**无仓库文件**（scratch 根在仓外）。三个 `DEER_FLOW_*` 环境变量指向 scratch 根 + 本机 recorder（假 key、零出网）。

- [x] 12. 假端点回 `reasoning_content`（流式 + 非流式各一遍）⇒ 第二轮请求体里**同名字段原样出现**（recorder 抓两次请求比对）。
- [x] 13. 假端点回 `reasoning` ⇒ 第二轮回放 `reasoning`、**无** `reasoning_content`。
- [x] 14. **对照组**：假端点从不回推理字段 ⇒ 请求体与「普通类基线」逐字节相同。
- [x] ~~15. **`off` 组**：带 `reasoning_replay: off` 的 **`config.yaml` 条目**（⚠️ 界面写不进这个键 —— 缺口 6；UI 条目做不了这一组）⇒ 与基线逐字节相同。~~ **已取消（2026-09-22：不做逃生舱，验收 15 作废）**
- [x] 16. **迁移与落盘**：预置一条普通类的旧 `models_config.json` 条目 ⇒ 载入后 GET `provider` 仍 `openai-compatible`（**归一后的新类命中 allowlist**；"别名"只兜手写旧类那一格）、行为已切到通用类（recorder 可见捕获/回放）；新条目 PUT 后文件里是新类。
- [x] 17. **两格回归**：`anthropic` / `deepseek` 条目请求体不变。
- [x] 17b. **旧拼写归一**（验收 3b 的真栈面，2026-09-23 六补）：scratch 的 `config.yaml` 放一条**指向新类**、配方写**旧拼写** `extra_body.chat_template_kwargs.thinking: false` 的条目 ⇒ recorder 抓到的请求体里是 **`enable_thinking: false`**（旧键不出现）—— unit 已钉住，这条只证"真请求体上也是它"。
- [x] **收尾**：进程 `taskkill /T`、scratch 删净；`models_config.json` / `config.yaml` md5 与动手前相同。

**实测（2026-09-23，Task 6 已交付）**：

- **装置**：仓外 scratch `E:/app/python/agent/df-t6`（**已删净**）＝ `config.yaml`（7 条条目，全部指向 `127.0.0.1:8098`；`rag.qdrant_url` 指向死端口 `:6399`，不碰共享 Qdrant）+ `models_config.json`（**预置一条旧类条目** `t6-ui-legacy`）+ `extensions_config.json` + `recorder.py`（OpenAI/Anthropic 双形状应答 + 逐条落盘请求体）+ `legs.py`（模型级两轮腿）。**假 key `t6-local-key`**。
- **12（两条捕获路各有真请求体）**：`t6-rc` 两轮。捕获侧 ak = `{reasoning_content: "think-rc", _wire_reasoning_field: "reasoning_content"}`（非流式与流式**各一遍**，流式那遍是**真 chunk 合并**出来的）；**第二轮请求体的 assistant 带 `reasoning_content: "think-rc"`、无 `reasoning`**。
- **13**：捕获侧 ak = `{refusal, reasoning_content: "think-r", reasoning: "think-r", _wire_reasoning_field: "reasoning"}` ⇒ **第二轮只回 `reasoning`（`reasoning_content` 不出现）** —— 展示别名不外发，在真请求体上成立。
- **14（对照组）**：`t6-plain`（普通类）与 `t6-replay-control`（回放类，**同 model / 同端点**）各两轮 ⇒ **第一轮两份请求体逐字节相同、第二轮也逐字节相同**（`turn1_identical=True, turn2_identical=True`）。
- **16（迁移与落盘，三格）**：① 盘上文件仍是 `langchain_openai:ChatOpenAI`，而 `ModelsConfig.from_file()` 出来的 `use` 已是 `deerflow.models.reasoning_replay:ReasoningReplayChatOpenAI`、`reverse_lookup_provider` = `openai-compatible`；② **网关**（隔离实例 `:8099`）`GET /api/models/config` 该条目 `provider = openai-compatible`、`source = ui`、`editable = True`，且**两轮真 agent run**（`POST /api/threads` → `/runs/wait`，`context.model_name = t6-ui-legacy`）的第二轮请求体里 assistant 带 `reasoning_content: "think-ui"` ⇒ **行为确实切到了通用类**；③ `PUT /api/models/config` 后盘上 `"use": "deerflow.models.reasoning_replay:ReasoningReplayChatOpenAI"`。
- **17**：`t6-anthropic`（`langchain_anthropic:ChatAnthropic`）请求体 = `{max_tokens, messages, model}`、`t6-deepseek`（`PatchedChatDeepSeek`）= `{messages, model, stream}` ⇒ **两轮键集合稳定、全文无 `_wire_reasoning_field` / `reasoning` / `reasoning_content`**（判据从"逐字节相同"改成"键集合稳定 + 无回放痕迹"：两轮**本来就**该差在 messages 上，原口径写错了）。
- **17b**：条目 `t6-legacy-spelling`（指向新类 + `extra_body.chat_template_kwargs.thinking: false`）⇒ 出站请求体是**顶层** `chat_template_kwargs: {"enable_thinking": false}`、`thinking` 不出现（⚠️ 记一处口径：该键在**真实 HTTP 体里是顶层**，不是嵌套在 `extra_body` 下 —— 归一发生在嵌套阶段，随后由 SDK 摊平）。
- **零出网证据**：网关日志里**没有任何外部主机**（`api.openai.com` / `api.anthropic.com` / `dashscope*` / `openrouter.ai` / `minimax.io` 全 0 命中），模型调用只出现 `127.0.0.1:8098/v1/chat/completions`。
- **收尾**：他的 `models_config.json` md5 = `1fbfd8019d45ea317a07c81aa1494972`、`config.yaml` = `96af3c540c67cd32093bbb57490eb254` —— **均与动手前相同**；他的 `:8001` 仍在听（200）；我的 `:8098` / `:8099` 已释放；scratch **已删净**；`backend/.deer-flow` 未新增用户记忆/线程文件。
- ⚠️ **一处如实登记的残留（不是漏删）**：隔离实例用的是共享 `backend/.deer-flow/data/deerflow.db`（我的 scratch `config.yaml` **没覆盖 `database:` 段**，所以 SQLite 落回仓库默认路径）⇒ 我建的那 1 个线程经 `DELETE /api/threads/{id}` 清掉后：`threads_meta` / `checkpoints` / `run_events` **均 0 行**，但 `runs` 里**还剩 2 条** —— **这是删除路由的自身契约**（它只删线程目录 + checkpoint + thread_meta，**从不碰 `runs`**，见 `routers/threads.py:620-659`）⇒ 未做裸 SQL 删除，留档。**下次真栈要在 scratch `config.yaml` 里把 `database:` 指到 scratch**（本条已记进记忆）。

---

## 门禁（全量）

- [x] `ruff check` + `ruff format --check` 干净；全量后端 `cd backend && make test`（后台）双向 A/B 已跑 —— **判据口径就地更正**：本对代码**已提交**，对照当前 HEAD 是空转，参照物取**配对前一笔 `d9aebc48`**；两侧同一仓外 basetemp。
- [x] 前端**不跑**（provider id 不变、零改动；按惯例纯后端线不跑前端全量）。
- [x] 全部 `**实测**` 行已回填；三个 commit 按线拆分（`69601777` 类本体 + D7 搬家 / `dcdcdb09` config 三处 + 两处文档 / **本笔** spec + plan 回填），设计文档（spec+plan）跟最后一笔。

**实测（2026-09-24，门禁已跑）**：

- **ruff**：`ruff check .` = All checks passed；`ruff format --check .` 唯一非净项 = `tests/knowledge/tools/test_graph_search.py`（**配对前就在**：`acabd069` 2026-09-05，属知识库线；A/B 两侧一致，未动）。本对 8 个文件单独 `--check` = **8 files already formatted**。
- **全量 A/B**（同一仓外 basetemp `E:/app/python/agent/df-gate-tmp`；命令 = `PYTHONPATH=. … pytest -m "not live" tests/ -q --tb=short -rfE`）：
  - A 侧（工作树，含本对）：**148 failed / 12456 passed / 109 skipped / 0 error（1354s）**。
  - B 侧（`d9aebc48`，仓外 worktree `E:/app/python/agent/df-gate-head` + **该树自己的 venv**）：**149 failed / 12429 passed / 109 skipped / 0 error（1331s）**。
  - **双向 diff：A-only 0；B-only 1** = `tests/knowledge/test_rag_agent_assembly.py::test_builtin_rag_config_loads_with_rag_tool_group`（**B 红 / A 绿**）。
- **那 1 条的归因（环境性，不是本对）**：worktree 少了**被 gitignore 的内置资产** `deerflow/agents/assets/rag/config.yaml`（`backend/.gitignore:22` 的 `config.yaml` 通配把它挡在版本控制外；同目录 `SOUL.md` 是 tracked）⇒ `_load_builtin_agent_asset` 返回 None、兜底 re-raise（`agents_config.py:32-37` / `:336`）。**把该文件镜像进 worktree 后**两侧同文件各跑一遍：**B 9 passed、A 9 passed** ⇒ 差集完全解释。
- **环境红两侧一致**：4 条 models/config 类（本机仓库根真件 `models_config.json`）＋ 1 条 PYTHONPATH 正斜杠类都在**两侧**；`test_detector_repo_root` 类**两侧都无**（仓外 basetemp）；本对新增用例（`test_reasoning_replay.py` 22 条 + `test_models_config.py` 新增等）在 A 侧**全绿**。
- **两侧环境对齐证据**：Python 3.12.13；`uv pip freeze` 剔除两个 deerflow editable 后 **288 包逐条版本相同**（B 侧 venv 由 `uv sync --inexact` 新建后，按 A 侧版本补装 15 个非 lock 包 + 6 个降版）；A/B 之间不同步的那批 gitignored 根配置文件（`config.yaml` / `models_config.json` / `extensions_config.json` / `rag_config.json` / 两个 `.env`）已 `cp` 进 worktree（跑完随 worktree 一并删）。
- **前端不跑**：provider id 不变、零前端改动（按惯例纯后端线不跑前端全量）。