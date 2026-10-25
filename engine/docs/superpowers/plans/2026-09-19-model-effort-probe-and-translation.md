# 推理档位：按协议翻译 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-19-model-effort-probe-and-translation-design.md](../specs/2026-09-19-model-effort-probe-and-translation-design.md)
**Status:** ✅ **本对三个 Task 全部交付（2026-09-19）** —— Task 1 翻译（`bb137237`）/ Task 2 前端（`8849dc9c`）/ Task 3 文档 + 真栈（本笔）。**起草时**（2026-09-19；**同日两轮改动**：
**第三轮＝一次对当前代码的审查**（8 处，已全部落进 spec 与本计划）：①"可用集合"有两种、原稿混成了一个 ⇒ 后来只剩**声明子集**一个（见第四轮）；② 上一对那条 422 **不是"换成另一条"而是整条删除**（替代判据"值不在可译集合里"恒真）；③ 上一对刚落地的两个东西原稿没提 —— 工厂那条 anthropic lint（翻译后会变**假警告**）与界面 **9 处 / 5 个文件**的清空落点（原稿影响面漏了 `models-settings-page.tsx::toManagedInput` 与 `core/models/capability.ts`）；④ D3 的"探测优先"只在向导成立；⑤ composer 拿不到探测结果（原稿把它列进影响面是错的）；⑥ 探测在本机端点实测零收益；⑦ 补了两处边界（声明子集为空 / 交集为空≠探不到）；⑧ §4 编号理顺并记下**快照被临时目录清理**的教训。
**第四轮＝按"先翻译、后探测"拆**：实测本机所有可用端点都拿不到 `capabilities`（见 spec §6 的实测表），而翻译**不依赖探测、单独成立** ⇒ **探测（原 D1）整段摘出本对、登记在 spec §6**，等拿到会填能力块的端点再另起一对。本计划随之收成**三个 Task**（翻译 / 前端 / 文档+真栈），原来的"Task 1 探针"整条去掉。**文件名保留旧名**（`probe` 已名不副实）——已交付的上一对 spec 里有一条链接指向它。
**Task 2 已交付（2026-09-19）**：那两格恢复 + 按 5 文件撤回上一对（入参整个删掉）。RED 4 红 / 2 绿 → 全量 **238 文件 / 2570 用例 / 0 失败**、`pnpm check` 零诊断、prettier 零新增区块 → neuter **4 / 4**（独有受害者不同，两半可分辨）；编辑器已与上一对之前**逐字节一致**。
**Task 1 已交付（2026-09-19）**：翻译落地 + 删掉上一对那条 422 + 撤掉它那条 lint。RED **4 红 / 1 绿**（第 5 条是控制组）→ GREEN 窄面 **130 绿** → neuter **1 红 / 13 红**（都回退后复跑回 130 绿）→ 全量 **136 红全为基线**、双向 diff **零新增**。
**第五轮＝Task 0 三项核实已完成（2026-09-19）**，结论写回下方 Task 0，并**就地更正了 5 处**：① **翻译的落点是顶层构造参数、不是 `model_kwargs`**（`output_config` 是 `ChatAnthropic` 的声明字段；实测顶层写法**无警告**，走 `model_kwargs` 会打一句 should be specified explicitly）；② 补 **合并而非覆盖**（`output_config` 里还有 `format`）；③ 补 **翻译表只认我们那四档**（Codex 写 `none`，认不出的原样放过）；④ 界面那个入参**可以直接删掉**（新判据＝`value.supportedEfforts.length > 0`，编辑器手上就有 `value`）⇒ Task 2 从"换语义"变成"删入参 + 删三处传参"；⑤ §5 正文那个不准的"9 处"改成 **12 个使用点**（与其表格逐项计数一致）。）

**Parent:** [2026-09-19-model-capability-protocol-check-design.md](../specs/2026-09-19-model-capability-protocol-check-design.md)（**已经落地**（四个提交）——它把"发错名字"的组合挡在写入口；本对**删掉**那条 422、并**撤掉**它那条 lint，因为字段开始被翻译而不是原样转发）

**Architecture:** 只有两件事：**翻译**（`models/factory.py` 一处，把条目声明的档位翻成该协议的名字 `output_config.effort` / `reasoning_effort`，越界时对**声明子集**回退）+ **撤回上一对**（写入期 422、工厂 lint、界面 9 处清空）。那两格改回按**声明子集**渲染。**`openai` 路径逐字节不变**；**不引入任何网络调用**。

**依赖顺序**：Task 0（核实）→ Task 1（翻译 + 删 422 + 撤 lint）→ Task 2（前端恢复 + 撤回清空）→ Task 3（文档 + 真栈）。

---

## Task 0 — 开工前的三项核实（只读，不改代码）

- [x] 1. **工厂里 `reasoning_effort` 的全部落点 + 上一对那条 lint 的处置**：`models/factory.py` 中它被读/被放/被剔的每一处（含 `:278` 的剔除、Codex 分支、`:318-328` 的两处 reconcile），确认**只加一处翻译**就够、且 `openai` 路径不受影响。同时核 `model_kwargs` 的透传（`output_config` 经它进请求体，本机实测可通）。
      ⚠️ **上一对刚落了一条 `_warn_anthropic_reasoning_effort`**（`factory.py:137`，调用点在 kwargs 组装末尾）——**翻译落地后它会变成假警告**（合法的 `reasoning_effort` 被翻译走了却还在报警）。核实要定：**删掉它**，还是把判据改成"到构造期还剩未翻译的 `reasoning_effort`"；并列出 `tests/test_model_factory.py:1512` 那条用例要怎么改。
      **核实结果**：`reasoning_effort` 一共 **7 处**落点，按发生顺序 —— ① `:313` thinking-disabled 的 OpenAI 网关分支写 `"minimal"`；② `:323-325` 条目没声明 `supports_reasoning_effort` ⇒ **从 `kwargs` 与 `model_settings_from_config` 两处一起剔**；③ `:340` Codex 分支 `kwargs.pop("reasoning_effort")`；④ `:342/:344/:346` Codex 再写回 settings（`"none"` / explicit / `"medium"`）；⑤ **`:370-373` 的 reconcile**（caller 有值 ⇒ 剔 settings；caller 没有 ⇒ 剔 kwargs）；⑥ `:375-376` 两条警告；⑦ `:378` 构造。
      ⇒ **"一处翻译"的落点 = ⑤ 之后、⑥ 之前**（reconcile 之后**只剩一处**持有该键，所以一处就够；放早了要写两遍）。**两条边界**：**(a) `"none"` 不是我们四档**（Codex 写的哨兵）⇒ 翻译表**只认我们那四档，认不出的一律原样放过**；**(b) Codex 走 Responses API、按协议算 openai ⇒ 恒等**，不会被翻译改动（仍要一条回归用例钉住）。**③④ 的 pop/写回**说明 Codex 分支自己已经在做"取值 + 归一"，翻译**不碰它**。
      ⚠️ **连带更正 spec §D2 的一处措辞**：`output_config` **本来就是 `ChatAnthropic` 的声明字段**（`langchain-anthropic` 1.4.1，注解 `dict[str, Any] | None`）—— 与 `reasoning_effort` **不是**字段（这正是上一对那场崩的根）形成对照。实测三种写法：
      | 写法 | 请求体里有 `output_config` | LangChain 警告 |
      | --- | --- | --- |
      | **顶层 `output_config={...}`** | ✅ | **无** ← **选它** |
      | `model_kwargs={"output_config": …}` | ✅ | ⚠️ 有（"should be specified explicitly"） |
      | 只给别的 `model_kwargs` 键 | — | 无 |
      ⇒ spec 里"经 `model_kwargs` 进入请求体"这句**改成"作为顶层构造参数"**，并补一条**实现纪律：合并而非覆盖** —— `output_config` 里除 `effort` 还有 **`format`**（`OutputConfigParam = {effort, format}`，都 optional），条目若已声明 `format`，翻译必须并进同一个 dict 而不是整体替换。顺带确认 `effort` 的值域是 `low/medium/high/xhigh/max`（与 spec 的表逐字一致）。
- [x] 2. **界面那两格现在的门 + 要撤回的 12 处**：上一对落成后它们的入参形状（`ModelCapabilityEditor` 的 `canSendEffortLevels`）；确认改动是"**换一套入参语义**"（本对是把"这条腿能不能发"换成"**声明子集是不是空**"），不是"把假改真"。
      ⚠️ 按 `canSendEffortLevels` / `withoutEffortAxis` / `capabilityValueForProvider` 三个名字 grep，**上一对一共落了 5 个文件**（`core/models/capability.ts` 三个 helper；编辑器入参；编辑弹窗；添加弹窗；**`models-settings-page.tsx::toManagedInput`**）。**逐处点名列在 spec §5 的表格里**，核实就是照着那张表走一遍、确认没有第六个文件。
      **核实结果**：**确认 5 个文件、没有第六个**（grep 命中文件数 = 5）。使用点 **12 个**：`capability.ts` 3 个 helper 定义（`:227/:234/:245`）、编辑器（`:41` 声明 / `:59` 解构 / `:174` 条件渲染）、添加弹窗（`:153-155` 种子过滤 / `:175` payload / `:222-224` provider 切换清空 / `:360` 传参 / 另加 `setSuggested` 读过滤后的值 —— 这处按三个名字 grep 不到，spec §5 表里那条"共 5 处"是对的）、编辑弹窗（`:77` 算值 / `:94` payload / `:169` 传参）、设置页 `:46`（`toManagedInput`）。⚠️ **spec §5 正文那句"9 处"与它自己表格的逐项计数（3+1+2+5+1）对不上 ⇒ 以表格为准，正文改成"12 个使用点"。**
      ⚠️ **一个可简化点（核实才看出来）**：编辑器**已经拿到 `value`**（里面有 `supportedEfforts`），而新语义恰恰就是 `value.supportedEfforts.length > 0` ⇒ **那个入参可以整个删掉**，不必"换成另一个布尔"。⇒ 本对的动作从"换语义"变成"**删掉这个入参 + 删掉三处传参**"，编辑器改成纯由 `value` 驱动（少 1 个声明、1 个解构、3 处传参）。Task 2 的 GREEN 按这条写。
- [x] 3. **真栈前置**：网关 + 前端在跑（或用私有端口的免登录实例跑当前工作树代码）；**动手前 `cp` 一份 `models_config.json` 原始字节**。
      ⚠️ **快照别只放系统临时目录**——上一轮我的那份**被清理过**，而工作树当时正处在被改状态（spec §6 记了全过程）；落点选一个不会被清的地方，或先用一次演练验好重建配方（**网关写这个文件在 Windows 上是 CRLF + 2 空格**）。
      ⚠️ 真栈会用到一条 **anthropic 形状**的条目（`use=langchain_anthropic:ChatAnthropic`）——本机现成的那条是 `minimax-m3`（走 `https://opencode.ai/zen/go`），它另有自己的问题（缺 `x-opencode-session` 头，**与本对无关**）⇒ **要么只用它验证"请求体形状"、要么另起一条条目**，别把它的 400 算到本对头上。
      **核实结果**：**`:8001` 与 `:3000` 现在都在听**（上一轮做第一对验收时是关的）⇒ 真栈条件已具备；私有实例 `:8099` 未起。**快照已落仓库外**：`E:\app\python\agent\_snapshots\models_config.2026-09-19-task0.json`，md5 = **`b8b729ddd624e7ea1587efb6466e70b6`**（与工作树同一值；**收尾要删掉这个文件**，它不属于仓库）。
      **唯一那条 anthropic 条目**`minimax-m3` 现在：`supports_thinking=True` / `supports_vision=True` / **`supports_reasoning_effort=False`**（三件套已被保存清掉）/ `supported_context_windows=[200K,400K,1M]` / `context_window=200000` / `base_url=https://opencode.ai/zen/go` / **没有 `default_headers`**。UI 条目仍是 4 条。
      ⇒ **真栈验收的口径要按这条改**：它**没有 `x-opencode-session`**，所以"打一次真实调用让模型正常回话"这一句**在这条条目上做不到**（会 400，而那是**另一件已登记的事**）。两条路选一条，别把别人的 400 记成本对的失败：**(甲)** 本对真栈只验 **"请求体里是 `output_config.effort` 且不出现 `reasoning_effort`"**（用不出网的 MockTransport 或抓请求体），**不声称模型回话**；**(乙)** 先按已登记的那件事给条目加 `default_headers` 再验全程（那要动 `config.yaml`、且会让这条条目在界面里变成只读行）。**本对按甲**，乙留给那件已登记的事。

**门禁**：无（只读）。

---

## Task 1 — 翻译：按协议的名字发出去 + 对声明子集回退 + 删掉那条 422 + 撤掉那条 lint（D2）

- [x] **RED**（`backend/tests/test_model_factory.py`）：
  1. `ChatAnthropic` + 声明 `[low, medium, high]` ⇒ 请求体里 **`output_config: {effort: "medium"}`**，且**不出现** `reasoning_effort`；
  2. **`minimal` 那一行**：声明 `minimal` ⇒ `output_config: {effort: "low"}`；
  3. **回退（触发面在界面之外）**：条目**声明** `{low, high}`、调用方从**请求层**传入 `medium` ⇒ 发出去的是回退值 `low`，**不抛**。⚠️ 原稿写的"声明的默认档不在可用集合里"**不可能发生**（载入期校验保证默认档属于子集）；真正能造出越界值的只有**请求层**与**自定义 agent 的 `config.yaml`**（界面上选不出来，因为候选就是声明子集）；
  3b. **声明子集缺省时不回退**：条目没声明 `supported_reasoning_efforts` ⇒ 每个档都按名翻译、**不做任何回退**（这是既有 OpenAI 路径的行为，别在这里新造"拒绝发送"）；
  4. **对照组**：同一份声明换 `ChatOpenAI` ⇒ `reasoning_effort: "medium"`（**逐字节等于今天**）。
      **实测 RED = 4 红 / 1 绿**：四条全红在 `assert payload["output_config"] == {...}`（今天既没有 `output_config`、`reasoning_effort` 还被旁移进 `model_kwargs`——测试日志里那句 `reasoning_effort was transferred to model_kwargs` 就是要替换掉的那条路）；第 4 条对照组**首跑即绿**（**控制组**，不是本轮实现的功能）。
      **观测口径**：不是看构造参数，而是看**真实请求体**——用真实 `ChatAnthropic`/`ChatOpenAI`（entry 自带 dummy `api_key`）构造后读 `instance._get_request_payload([], stop=None)`，与 spec §4#3「请求体里出现 `output_config`」逐字对应。为此加了两个本地 helper：`_effort_entry(...)`（手搭一条带凭据、带档位声明的条目——`_make_model` 不收 `api_key`/`base_url`，而真实 provider 类必须有 key 才能构造）与 `_built_payload(...)`。
- [x] **GREEN**：在 `models/factory.py` 的 `reasoning_effort` 处理处加**一处**翻译（协议 → 名字/字段 + 映射表 + 对**声明子集**的回退），两条腿共用；认不出的 `use` 仍走 OpenAI 形状。
      **实测**：新增 `_ANTHROPIC_EFFORT_NAMES`（`minimal→low`、其余同名）+ `_nearest_declared_effort`（同强度优先，否则取不高于它的最高档；全都高于它时取最低的那档）+ `_translate_reasoning_effort`；调用点**落在 reconcile 之后、`_warn_unknown_model_settings` 之前**（Task 0 定的唯一落点）。写出去的是**顶层 `output_config`**（Task 0 实测：无警告），且**合并**进已有对象而不是覆盖（`output_config` 里还有 `format`）。**窄面 130 passed / 0 failed**；`ruff check` + `format --check` 双净。
- [x] **删掉上一对那条 422（不是"改成另一条"）**：`_reject_anthropic_effort_levels`（`routers/models.py:259`）与它的调用点（`:684`）**一齐删**；`tests/test_models_config_api.py` 里那 4 条参数化用例（`:585`）**删除**，而**控制组**（`:606`，`openai-compatible` / `deepseek` + 同样三字段 ⇒ 200）与**"清干净就放行"**（`:619`）**保留**——它们验的是别的规矩。
      ⚠️ **为什么不换成"值必须在可译集合里"**（spec §3 已写明）：我们四档**全都可译** ⇒ 那条判据恒真、什么都不拦；而"默认档属于子集"早由载入期校验管着。**提交信息里要写明这是有意放开**（理由：字段开始被翻译，不再原样转发）。
      **实测**：函数与调用点连同那 4 条参数化用例一齐删；**控制组与"清干净就放行"两条保留且仍绿**（`test_models_config_api.py` 现 4 条参数化 + 1 条 = 少 4 条）。⚠️ **删的时候踩了一个坑**：按区间切片时**把控制组自己的 `@pytest.mark.parametrize("provider", …)` 装饰器一起切掉了**，它当场以「缺 `provider` 形参」报 ERROR ⇒ 已补齐；**教训：按区间删除后要跑一遍窄面，别只看残留名字数**。
- [x] **同批撤掉上一对那条 lint**：`_warn_anthropic_reasoning_effort`（`factory.py:137`）在翻译落地后不能再对"会被翻译走的 `reasoning_effort`"报警 ⇒ **删掉它**（首选：那条警告存在的唯一理由是"这个键会被原样转发进 `model_kwargs`"，翻译之后理由消失），并同步改掉 `tests/test_model_factory.py:1512` 那条用例；连带 `_KWARG_DIVERT_CONSEQUENCE` 若因此只剩一处使用者，说明原委后再决定留不留。
      **实测**：删掉 `_warn_anthropic_reasoning_effort` 与它的调用点；它那条用例（"anthropic 的 `reasoning_effort` 会警告"）随之删除，而**同一段里那条"OpenAI + 档位不警告"的断言保留下来**、只把名字与 docstring 从"针对 anthropic 的 lint 的对照"改成实话（`test_reasoning_effort_on_openai_draws_no_warning`）——它钉的是**OpenAI 那条守卫的静默**，那是活的规矩，不是被删的行为。`_KWARG_DIVERT_CONSEQUENCE` **保留**（OpenAI 那条警告仍在用）。
      ⚠️ **又一次删多**：区间删除把 `_DEFAULT_STREAM_CHUNK_TIMEOUT_SECONDS` 常量连带它的注释块一起切了 ⇒ `ruff F821` 当场抓到，已按原文补回（**这是本轮第二次"切片切多了"，都与"删到下一个 def 为止"这个手法有关**）。
- [x] **neuter 两条（都要有牙）**：① 把 `openai` 也走新翻译（例如强行把 `minimal` 也改写成别的）⇒ 用例 4 红；② 把回退去掉（原样发越界值）⇒ 用例 3 红。
      **实测**：② 把回退那三行短路 ⇒ **1 红**，红的正是 `..._falls_back`（与计划逐字一致，无附带损伤）。① 去掉家族门（让翻译作用于所有 client）⇒ **13 红**，其中**包括计划点名的 `test_openai_effort_is_still_sent_under_its_own_name`**，另外 12 条也全是 OpenAI/Codex 那条腿的档位用例 ⇒ **这条 neuter 有牙、但牙比预期宽**：家族门护的是**整条 OpenAI 腿**，拆掉它不止倒一条。两条都**回退后复跑确认回到 130 绿**。
- [x] **门禁**：`ruff check` + `ruff format --check` 干净；窄面（`tests/test_model_factory.py` + `tests/test_models_config_api.py`）绿；**全量后端后台跑**
      **实测（本轮零回归）**：ruff 双净；窄面 **130 passed / 0 failed**；全量 = **136 failed / 12423 passed / 109 skipped**（16m54s）。抽 136 个 node id ⇒ `git worktree add --detach` 出 HEAD 树（**HEAD = `b1e88cea`，已含本对 Task 0 的文档提交**；`cp` 进四个本地环境文件），跑同一批 = **135 红 / 1 绿**。**两侧 `PYTHONPATH` 都是 `.`**（照上一对的纪要规避 confound；`UV_PROJECT_ENVIRONMENT` 指主仓 `.venv`，worktree 不新建空 venv）。
      **双向 diff**：`只在 HEAD 红` 看似 2 条，逐行核出**两条都不是 node id**（行首是空格、无 `::` —— 失败摘要的**换行续行**）⇒ **实质为空**；`只在工作树红` **1 条** = `test_delta_channel_state.py::test_merge_message_writes_randomized_differential`（上一对已定性的**同一条**顺序假象），**两侧单独复跑都 1 passed** ⇒ 与改动无关。
      ⇒ **Task 1 无新增红**。收尾：worktree 已 `remove`、`.pytest-tmp` 与四份日志/清单已删（**`models_config` 那份快照保留** —— Task 3 的收尾还要用）。
      ⚠️ **全量数字与上一对那次逐字相同**（136 failed / 12423 passed）—— 那是基线，**别读成"这轮又修好了什么"**。 + 抽 FAILED/ERROR 的 node id 去 HEAD 跑同一批、**双向 diff**（`xargs -d '\n'`，别 pipe 长跑；HEAD 那棵树要先 `cp` 仓库根本地环境文件进去 —— 四个 gitignored 文件：`config.yaml` / `models_config.json` / `extensions_config.json` / `rag_config.json`）。

## Task 2 — 前端：那两格恢复 + 撤回上一对（D3）

- [x] **RED**（`frontend/tests/unit/settings/models-capability-wizard.dom.test.tsx` / `models-settings-page.dom.test.tsx`）：
  1. anthropic 条目那两格**重新出现**，候选就是**声明子集**（对照组：声明子集为空时不出现）；
  2. **撤回清空**：一条 anthropic 条目带三件套 ⇒ 保存后这三个字段**照旧是提交上去的值**（不再被清空）；
  3. **对照组**：`openai-compatible` 那条腿一字未变（既有“改能力子集”用例仍绿）。
      **实测 RED = 4 红 / 2 绿**：四条红的正是“上一对留下、现在必须翻过来”的那几条（两条断言那两格**找不到**、两条断言 payload 被清成 `false`）；两条控制组（向导的建议、编辑弹窗里 openai 那侧）**首跑即绿**，且在新旧两界都成立。
      ⚠️ **计划里 RED case 1 的控制组写错了（就地更正）**：原文写“对照组：声明子集为空时**不出现**”。**那条不成立** —— 「可用推理深度」那一行是**唯一的声明入口**，藏掉它等于让“没有预填建议的模型”**永远填不上档位**；空声明只让**默认档那一行**消失（既有行为）。**依据**：`git show bf6fd39e^:…/model-capability-editor.tsx` 显示上一对**之前**就是“可用那一行不设门、只有默认档那行按子集判”。⇒ 用例改成“**空声明时可用那一行在、默认那一行不在**”，它同时成了“撤回是否到位”的一条正向断言。
- [x] **GREEN**：**删掉 `ModelCapabilityEditor` 的 `canSendEffortLevels` 入参**（Task 0 核实：新判据＝`value.supportedEfforts.length > 0`，编辑器手上就有 `value`），渲染条件改成看 `value`；三个调用点不再传这个 prop；**按 spec §5 那张表逐处撤回上一对**（**5 个文件、12 个使用点**）——`core/models/capability.ts` 的三个 helper、编辑器入参、编辑弹窗 2 处、添加弹窗 5 处（含种子过滤与 provider 切换时的清空）、**`models-settings-page.tsx::toManagedInput`**（最容易漏：整集合 PUT 的必经之路）。`reasoning-effort.ts`（composer）**不动**。
      **实测**：编辑器**去掉外层包裹**、三个调用点不再传 prop（入参整个删掉，判据由 `value.supportedEfforts.length > 0` 承担）；`capability.ts` 的三个 helper 与 `ProviderId` 导入一并删除（`src/` 里三个名字 grep 归零）；编辑弹窗、添加弹窗、设置页各自撤回。**编辑器与上一对之前那份逐字节一致**（`git diff acc23f4f -- <编辑器>` 为空 ⇒ “撤回”是可验证的，不是“看起来像”）。`pnpm check` 零诊断；全量前端 **238 文件 / 2570 用例 / 0 失败**。
- [x] **neuter 两条**：① 把判据改回"provider 是不是 anthropic"（anthropic ⇒ 不渲染）⇒ 用例 1 红；② **只恢复渲染、不撤回提交时的清空** ⇒ 用例 2 红（neuter 只回退“清空”这一半，别连渲染一起还原，否则分不清哪半有牙）。
      **实测：两条各 4 红，且“独有的那一条”互不相同** ⇒ 两半**可分辨**（不会互相顶替）：① 把判据改回“看 provider”（`canSendEffortLevels` 重新传进编辑器）⇒ 4 红，**独有**的是 `keeps the axis declarable…`（一条**渲染**断言）；② 只把清空放回来（编辑器保持正确、三个 payload 路径重新清）⇒ 4 红，**独有**的是页面那条 payload 用例。两条都**回退后复跑确认回到 2570 绿**。
- [x] **门禁**：`pnpm check`（eslint + tsc，**应为零诊断**）；prettier **逐文件与 HEAD 比"偏离区块数"**（不是行数——这些文件本来就有债、行数会随体量涨）；**全量前端**。
      **实测**：`pnpm check` **零诊断**；prettier **逐文件与 HEAD 比“偏离区块数”零新增**（`capability.ts` 1→1、编辑器 0→0、编辑弹窗 **2→0**、添加弹窗 6→6、设置页 0→0、两份测试 17→17 / 11→11）；**全量前端 238 文件 / 2570 用例 / 0 失败**。
      ⚠️ **prettier 这关拦住了我的第一版**：照抄“上一对之前的原形”会把**它自带的格式债**一起搬回来（`models-edit-dialog.tsx` 的 import 与 `useState` 折行、`models-settings-page.tsx` 那一行的折法、`capability.ts` 末尾多一个空行）⇒ 三个文件各多 1 个区块。**按 prettier 的排法写回同样的赋值/标签**（纯格式、零行为变化）后归零。
      ⚠️⚠️ **我在这一轮两次自己删多了，都记在这**：① 计划外的一次是把编辑器**外层包裹去掉后忘了“可用那行本来不设门”**（当时我按“集合为空才不渲染”改，那会破坏可声明性）⇒ 已按 `bf6fd39e^` 的原形纠正；② **回退 neuter ① 时我“按行名过滤”（把每一行 `      )}` 都删掉）**，把 `{suggested && (` 与 `cn(` 的闭合一起删了 ⇒ swc 直接拒绝该模块，报的是**文件级失败**（连无关的 `functional-models` 也挂）⇒ 只好**用 `acc23f4f` 那份整体覆盖**编辑器（它本来就该一模一样）。**教训：回退别按“行内容”过滤**（同一行在别处会合法地重复出现）；改用**小锚点替换 + 断言锚点唯一**，并且**长跑前先跑一次 tsc**（这次它 2 秒就指出了问题）。

## Task 3 — 文档同步与真栈验收

- [x] `backend/AGENTS.md`：记"**档位按协议翻译**（`output_config.effort` / `reasoning_effort`）、越界按**声明子集**回退"。
      ⚠️ **同时要改掉上一对写下的两处**（否则文档自相矛盾）：① 那条"写入期对账"的 invariant 里写着"**这条拒绝是暂时的** ⇒ 后续那对会放开"——本对已把它**删掉**，这句要改成过去式或直接删；② 那条"Anthropic 家族通用表有意留空 + 工厂那条只查 `reasoning_effort` 的 lint"——**lint 本对已撤**（翻译之后它没有理由存在），这条要重写。
      **实测**：上一对那条"写入期对账"整条**换成**两条新 invariant（翻译 + 回退），拒绝那句写成过去式（"was **removed** in the same change — the fields are translated now, so there is nothing left for that refusal to protect"）；"家族通用表留空"那条**重写**成"表仍留空、但**不再需要**那条针对性 lint"（并说明理由：唯一能进这个构造器的坏键现在被翻译走了），末尾那句"两条警告共用一句机制措辞"随之收成"OpenAI 那条仍嵌着它"。**该文件没有 prettier 门禁**（上一对 Task 4 已查实：仓库根无 prettier 配置），所以只核内容。
- [x] `frontend/AGENTS.md`：那两格**按声明子集渲染**；**同时改掉上一对写下的**"两格由 provider 决定渲不渲染、提交时清空"（本对已撤回）。
      **实测**：整段重写成"**按声明渲染、不按 provider**"，并写清那条容易搞反的边界（**可用那一行恒在**——它是唯一声明入口；只有默认档那行等非空子集）；上一对的三条 helper 名字、三条 payload 路径清空、`"can send"` 措辞**全部删掉**，代之以"撤回"的过去式一句 + 后端会翻译这条理由。`prettier` **HEAD 7 → 工作树 7 个偏离区块**（零新增；且 7 条全是我没碰的既有 `*x*` 强调行）。
- [x] **真栈验收**：起真栈 ⇒ 给一条 `use=langchain_anthropic:ChatAnthropic` 的条目填上档位 ⇒ 保存 ⇒ 打一次真实调用，确认请求体是 `output_config.effort` 且**不出现** `reasoning_effort`。⚠️ **口径按 Task 0 的核实收口（甲案）**：本机唯一那条 anthropic 条目缺 `x-opencode-session` ⇒ "模型正常回话"这一句**做不到**（会 400，那是另一件已登记的事）⇒ 本对真栈**只验请求体形状**（不出网的 MockTransport 或抓请求体），**不声称回话**；**写清用的是哪个端点、未打 `api.anthropic.com`**。
      ⚠️ 若用本机现成的 `minimax-m3`（opencode Go），它**另有**缺 `x-opencode-session` 头导致的 400 —— 那是**另一个已登记的问题**，别混进本对的结论（见 Task 0#3）。
      ⚠️ 探测那一半**不在本对验收范围**（已摘出，见 spec §6）。
      **实测（甲案，零出网、零改动他的配置）**：**没有**用他 :8001 上那条 `minimax-m3`，而是**另起一个隔离实例**跑当前工作树代码——`DEER_FLOW_PROJECT_ROOT` / `DEER_FLOW_CONFIG_PATH` / `DEER_FLOW_MODELS_CONFIG_PATH` 三个环境变量全指向仓库外的一个 scratch 根（`E:\app\python\agent\_snapshots\t3root`，`config.yaml` 由他的那份派生但**删掉 `models:` 块**、`sqlite_dir` 改到 scratch 里），`DEER_FLOW_AUTH_DISABLED=1` + `:8099`；条目 `t3-anthropic-probe`（`use=langchain_anthropic:ChatAnthropic`、声明 `[low, medium, high]` / 默认 `medium`）。**端点是一个本机 recorder**（`127.0.0.1:8098`，Anthropic 形状应答 + 落盘请求体）⇒ **未打 `api.anthropic.com`，也未打任何云端点**，全程不出网。
      - **腿①（写入期，就是上一对被 422 的那份载荷）**：`PUT /api/models/config` **200**（首次漏了 `provider` 字段 ⇒ 被 Pydantic 以 `missing provider` 挡回，补上即 200——**那不是本对的规矩**，是输入模型的必填项）；重读文件：三件套**原样落盘**（`supports_reasoning_effort=true` / `['low','medium','high']` / `medium`）、**CRLF**。⇒ **上一对那条 422 确实已经放开**。
      - **腿②（发送期）**：`POST /api/input-polish` ⇒ **200**（`{"rewritten_text":"ok","changed":true}`，回话来自 recorder）。recorder 抓到的请求体：**`output_config: {"effort": "medium"}`**、**无 `reasoning_effort`**、**无 `model_kwargs`**；顶层键 `['max_tokens','messages','model','output_config','system']`，路径 `/v1/messages`。⇒ 与 spec §4#3 逐字对应。
      - **对照组（同一份声明换 OpenAI 腿）**：另加一条 `t3-openai-control`（`use=langchain_openai:ChatOpenAI`，声明与默认**逐字相同**）⇒ 请求体是 **`reasoning_effort='medium'`**、**无 `output_config`**。⚠️ 这一格第一版**跑错了**：我先在内存里改 `cfg.models[0].use`，但 `AppConfig` 的**名字索引在载入时就建好了**（`get_model_config` 仍返回旧条目）⇒ 两次都造的 `ChatAnthropic`、两格都显示 `output_config`。**判据：要换腿就换文件再重新载入，别改内存里那份的 `use`**。
- [x] **收尾**：配置**逐字节还原**（动手前 `cp` 过原始字节；网关在 Windows 上写 **CRLF + 2 空格**；**快照别只放系统临时目录**——上一轮我的那份被清理过，见 spec §6）、密钥不落盘、不新建残留文件。
      **实测**：**他的 `models_config.json` 从头到尾没被碰过** —— md5 仍是 **`b8b729ddd624e7ea1587efb6466e70b6`**（与 Task 0 那份快照一致），因为本轮的写入全落在 scratch 根里；**不欠还原**。他的 `:8001`（PID 9368）与 `:3000` 全程未动、验收结束时仍在听。隔离实例与 recorder 均已 `taskkill /T`（`:8098`/`:8099` 已释放）；**密钥不落盘**：scratch 的 `config.yaml` / `models_config.json` 里那把是**我现造的假值**（`t3-local-key`），真实密钥一个字节都没复制出去。⚠️ 一条**已知副作用**：那个 scratch 实例启动时连了本机 `:6333` 的 Qdrant（`config.yaml` 里 `rag.qdrant_url` 指向它），只做了**既有的** `GET collections` 与 `PUT …/index`（索引创建，幂等）；它的集合清单与他的实例共用，**没有新建集合、没有写入点**。
- [x] **门禁**：`frontend/AGENTS.md` 的 prettier 与 HEAD 同数（**必须在 `frontend/` 里跑**）；`models_config.json` md5 未变。
      **实测**：`frontend/AGENTS.md` **HEAD 7 → 工作树 7** 个偏离区块（零新增；7 条全是既有的 `*x*` 强调行，**我新写的段落一条都不在里面**）；`models_config.json` md5 未变（见上）。
      ⚠️ **`backend/AGENTS.md` 没有 prettier 门禁**（上一对 Task 4 已查实：仓库根没有 prettier 配置；pre-commit 那条只管 `frontend/` 且 `types_or` 不含 markdown）⇒ 它的"与 HEAD 同数"只能看内容、不能用 prettier 数字衡量。

---

## 提交切分

| 提交 | 内容                                     |
| ---- | ---------------------------------------- |
| 0    | **本计划 + 它的 spec 成对**              |
| 1    | Task 1（翻译 + 对声明子集回退 + **删掉**上一对那条 422 + **撤掉**它那条 lint） |
| 2    | Task 2（前端恢复 + 按 5 文件撤回上一对 + 用例）     |
| 3    | Task 3（文档 + 真栈结论）                |

**依赖**：**上一对（`2026-09-19-model-capability-protocol-check`）已经落地**（`a9824e5b`/`56ebec1d`/`acc23f4f`/`bf6fd39e`/`3f5f0a5a`）——本对会**删掉**它那条 422、**撤掉**它那条 lint、并**撤回**它那 9 处界面清空。不改表、不改 schema、不动默认值；不做探测、不做预算那一维、不扩我们自己的档位值域。

**摘出本对的那一半去哪了**：**配置期探测**（原 D1）——它的设计、三种"探不到"、空交集的分辨、以及**本机五个端点的实测表**，全部登记在 spec §6，等拿到会填 `capabilities` 的端点再据此另起一对。
