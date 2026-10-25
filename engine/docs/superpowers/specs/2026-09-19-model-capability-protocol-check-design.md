# 能力声明 × 协议：写入期核对（含 Anthropic 家族一条针对性 lint） —— 设计

**Status:** 未开工（2026-09-19 起草；**同日两轮更正**：① 按 10 条审查意见——D2 收窄成"只查 `reasoning_effort` 的针对性 lint"、D3 改为"**提交时强制清空**"，另补齐测试载体、去掉多余的 i18n 项、补上"向导建议按 provider 过滤"与"界面填不了预算"两处缺口；② **第二次核实推翻了一个前提**：Anthropic 协议**有** effort 档位，名字是 `output_config.effort`（值域 `low/medium/high/xhigh/max`），`reasoning_effort` 只是 OpenAI 的名字 ⇒ §1 的问题陈述、D1 的文案、D4/§6 里"丁"的形态都已更正——**D1 的结论不变，理由变了**）
**Parent:** [2026-09-10-model-capability-config-design.md](2026-09-10-model-capability-config-design.md)（能力声明层由那条线建立：条目声明 `supports_*` / 子集，界面按声明渲染、运行期按声明发参数；本 spec 补上它缺的第二道——**声明必须与协议对账**）

## 1. 问题

一条 `models:` 条目可以**按 OpenAI 的词汇声明一个能力**（`supported_reasoning_efforts` / `reasoning_effort`），而没有任何一层核过"**这条协议认不认这套名字**"——能力注册表按条目声明渲染、工厂按条目声明转发，声明与协议之间**没有任何对账**。现场（逐字复现过）：

| 现场                   | 事实                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 条目                   | `minimax-m3`，`use: langchain_anthropic:ChatAnthropic`，带 `supports_reasoning_effort: true` + `supported_reasoning_efforts: [minimal,low,medium,high]` + `reasoning_effort: "medium"`                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 现象                   | 选中它跑任何东西 ⇒ `AsyncMessages.create() got an unexpected keyword argument 'reasoning_effort'`，**请求没发出去**、不足 1 秒失败                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 链条                   | ① `models/factory.py:278` 的剔除条件是**条目自己那个布尔**（`if not model_config.supports_reasoning_effort`），不是"这家协议有没有这个参数" ⇒ 键被留下；② `ChatAnthropic` 不报错，把不认识的 kwarg **旁移进 `model_kwargs`**（本机实测：`model_kwargs: {'reasoning_effort': 'medium'}`，且它自己打了一条 `UserWarning`）；③ 该键被并进**每一次**请求体（实测 `['max_tokens','messages','model','reasoning_effort']`）；④ **这个键名对不上这条协议**——`anthropic` 0.97.0 的**稳定版**参数表里没有顶层 `reasoning_effort`，它的 effort 是嵌在 `output_config.effort` 里的（`types/message_create_params.py:138`）⇒ SDK 抛 `TypeError` |
| 为什么能存进去         | `app/gateway/routers/models.py::_validate_capabilities` 只是把条目丢给 `ModelConfig.model_validate`，而后者（`config/model_config.py:125-137`）**只看内部自洽**（子集非空/有序/默认档属于子集），**从不看 `use` / provider**                                                                                                                                                                                                                                                                                                                                                                                                        |
| 为什么连一句提示都没有 | 工厂**已经**有一条"未知键会被转进 `model_kwargs` 并在请求期崩"的警告（`_warn_unknown_model_settings`），但它**有意只覆盖 OpenAI 家族**——docstring 原话：_"**scoped to the OpenAI-compatible family** … Other providers (e.g. `ChatAnthropic`) route extra kwargs differently and would false-positive against this allow-list, so they are **intentionally left alone**."_ ⇒ Anthropic 家族这一侧是**空的**                                                                                                                                                                                                                         |

**这不是"Anthropic 没有档位"的问题——两家都有档位，只是名字不同。** 这条协议的 effort 叫 **`output_config.effort`**（`anthropic` 0.97.0 稳定版的 `OutputConfigParam.effort = Optional[Literal['low','medium','high','xhigh','max']]`，值域正是 Claude Code 文档那套），`reasoning_effort` 是 **OpenAI 的名字**。我们把它当成了通用维度、又照 OpenAI 的名字发出去，于是崩在本地 SDK。

而且**我们这条客户端今天就能发对**（本机实测，不出网）：`ChatAnthropic(..., model_kwargs={"output_config": {"effort": "high"}})` 构出的请求体里确实出现 `output_config: {'effort': 'high'}`，LangChain 只警告"应当显式传"、**不报错**。所以缺的不是能力，是**"声明没人核"**（既没在写入时核，也没在转发前核）＋**"界面没有那正确的一格"**（`ManagedModelInput` 白名单里没有 `model_kwargs`；这种写法目前只能落在 `config.yaml` 条目里）。

（同族的先例：本仓 caption 那条线处理的是"同一件事、两种协议"（`Authorization` vs `X-Api-Key`、`/chat/completions` vs `/v1/messages`）——本 spec 处理的是同一张表上的**参数名/层级**那一行。）

## 2. 决定

### D1 —— 写入期硬拦：`anthropic` 条目不许带推理档位三件套

`PUT /api/models/config` 在既有 `_validate_capabilities` 之后再加一条：`item.provider == "anthropic"` 且条目出现下列任一 ⇒ **422**：

- `supports_reasoning_effort` 为真；
- `supported_reasoning_efforts` 非空；
- `reasoning_effort` 非空。

文案要点名条目与原因，并给出可执行的下一步（清空「可用推理深度」「默认推理深度」），例如：

> `Model 'minimax-m3' cannot declare reasoning-effort levels: this protocol names effort `output_config.effort`, not `reasoning_effort`, so the value is forwarded into every request and rejected by the SDK before it is sent. Clear 可用推理深度 / 默认推理深度 for this entry.`

**为什么拦在写入期而不是校验器里**：`models_config.json` 的加载**没有 fallback**（网关每次热重载都会读它，一条坏数据会毁掉之后的每一次配置读取）。写入口拦是唯一能"在错误进入文件之前"挡住又不会反噬读取的地方。`config.yaml` 是操作者自担，那条路由 D2 覆盖（只警告）。

**这条拒绝是"暂时的"**：等"丁"把档位**映射成这条协议的名字**（`output_config.effort`）之后，同一批字段就应当被**翻译**而不是原样转发，那时这条 422 要放开。本 spec 拦它，只是因为今天它们会被**原样发出去**并当场崩。⇒ **那一对已经起草**：[2026-09-19-model-effort-probe-and-translation-design.md](2026-09-19-model-effort-probe-and-translation-design.md)（翻译 + 配置期探测，并在它落地时撤掉本条拒绝）。

### D2 —— 工厂只对"那一个键"发**针对性**警告（**不**补通用未知键表）

`_warn_unknown_model_settings` 现在只覆盖 OpenAI 家族，**那是有意的**，而且有一条带回归注释的既有用例守着它：
`backend/tests/test_model_factory.py:1473 test_no_unknown_key_warning_for_non_openai_class` 拿 `ChatAnthropic` 举例、喂 `frequency_penalty`、断言**不许**警告（docstring 逐字：_"previously tripped the 'not recognized' warning"_）——因为那家的 divert 语义不同，通用白名单对它**会误报**。

所以本决定**不**给 Anthropic 家族补"合法透传名"表，而是加一条**针对性 lint**：

- 当 `model_class` 属于 Anthropic 家族（`issubclass(model_class, ChatAnthropic)`）且 `model_settings_from_config` 里出现 `reasoning_effort`（`supported_reasoning_efforts` / `supports_reasoning_effort` 已被 dump 排除，所以实际只可能是前者）⇒ 打**一条**警告；
- 措辞与 OpenAI 家族那条**同源**（同一件事只留一处措辞 ⇒ 提共享常量或同一句模板），点明"该键会被转进 `model_kwargs`、并在请求期被 SDK 拒绝"；
- **只记日志、不阻断**（这一条只为 `config.yaml` 手写条目的可诊断性）；
- **既有那条 `..._for_non_openai_class` 用例必须保持绿**——它是这条收窄的看门人（`frequency_penalty` 在 Anthropic 下仍然沉默）。

### D3 —— 界面：`anthropic` 时那两格不渲染，**且提交时强制清空**

- `ModelCapabilityEditor` 增加一个入参，语义是"**这条腿能不能正确发送这套字段**"。⚠️ **语义要写对：不是"这家协议能不能表达 effort"**——协议**能**（`output_config.effort`，见 §1）；缺的是我们这一步**翻译**（那是"丁"）。写成"这家没有"会在明年的读者那里变成一句假话。
- 两个调用点（`models-add-dialog.tsx` / `models-edit-dialog.tsx`）按 provider 传值（它现在收不到 provider）；为假时**不渲染**那两格；
- **关键：为假时那三个字段在提交的 payload 里被清空——不是只在"切换 provider"时清**。理由：编辑对话框的 provider **只读**（`models-edit-dialog.tsx` docstring 逐字：_"Provider / model / name are identity fields and are read-only after creation"_）⇒ 一条**已经带三件套**的旧条目，若只是隐藏字段，管理员**永远清不掉**它（一保存就被 D1 的 422 拒），只能手改 json。提交时清空让"编辑一次并保存"顺手把旧数据修好。
- 新增向导那条路**仍然要**"切换 provider 到 anthropic 时清空表单值"（否则用户在 OpenAI 条目上选好的四档会跟着被带进 anthropic 的那一步）；
- **向导的建议表也按 provider 过滤**：能力向导现在按 registry 给建议，而 `capability-registry.ts` 的 `/^claude/` 规则**只匹配 claude 名字**（第三方名如 `minimax-m3` 不匹配、也就不受约束）⇒ anthropic provider 下不再给出 effort 建议。

### D4 —— 不做

- **不把规则放进 `ModelConfig` 校验器**：`config.yaml` 里的老条目会因为升级而**拒绝加载**，而 `models_config.json` 那条加载无 fallback 的路更会连锁——写入口拦就够。
- **不做"布尔为真但未声明子集"的硬拦**：核准后确认那是**设计**（`frontend/src/core/models/reasoning-effort.ts:58`：_"Levels the depth selector offers: the declared subset, **else every level**"_）——对 OpenAI 形状是合理的默认；它只在 anthropic 上有害，而那已被 D1 盖住。⇒ **先前把它算作口子是过虑，本 spec 不修它。**
- **不做"按协议映射参数 / 超范围回退"**（那次讨论里的"丁"）：它的正确形态**不是**再包一层 thinking 预算，而是**把档位映射到这条协议的名字**——`output_config.effort`（值域 `low/medium/high/xhigh/max`）。本机已核**这条路今天是通的**（`model_kwargs={"output_config": …}` 能进请求体、SDK 认），所以"丁"比原先估计的便宜得多：一条**映射**＋界面一格，不需要新机制。它仍另立（本 spec 只负责把错的挡在门口）。
- **不做"条目自定义请求头"**：它对应另一类失败（网关要求 `x-opencode-session` 之类的头），是**新配置维度**（界面一格 + 写盘 + 工厂透传），与"能力对账"不是同一主题，另立。
- **不动 `openai-compatible` / `deepseek` 的行为**：它们声明档位是**正确**的，本 spec 只保证不误伤。
- 不动 `thinking` 的启用/禁用路径、不动任何默认值。

## 3. 接口契约

| 契约                                        | 变化                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `PUT /api/models/config`                    | 新增一条 422（**仅** `provider=anthropic` + 三字段），其余条目一字不变 |
| 工厂日志                                    | Anthropic 家族新增"未知键"警告（只日志，不改行为）                     |
| `models_config.json` / `config.yaml` schema | **无变化**（不新增字段、不改默认值）                                   |
| 设置界面                                    | 「可用推理深度」「默认推理深度」在 anthropic 下不渲染、切换时清空      |
| 前端 i18n                                   | 新增一条错误/说明文案（键名新增，不改既有键）                          |

## 4. 验收

**后端**

1. **写入期拒绝**（写进 `backend/tests/test_models_config_api.py`，挨着既有 `:542` 那条参数化校验用例、风格照抄）：`PUT /api/models/config` 带 `provider="anthropic"` + 三字段任一 ⇒ **422**，且文案同时点名条目与原因；三种字段各来一次（分开测，证明不是"只看某一个"）。
2. **不误伤**（对照组）：同一次 PUT 里换成 `provider="openai-compatible"` + 同样的三字段 ⇒ **200**；`provider="deepseek"` 同样 ⇒ **200**（既有夹具 `_CAPABILITY_MODEL` 就是 `openai-compatible`，8 条既有参数化用例已核**不受影响**）。
3. **清干净就放行**：anthropic 条目去掉三字段 ⇒ **200**，且写回的条目里这三个键**不出现**。
4. **针对性 lint**（写进 `backend/tests/test_model_factory.py`）：`ChatAnthropic` 类 + 条目里带 `reasoning_effort` ⇒ 打**一条**警告且**不抛**（构造期）；同一个条目换 `ChatOpenAI` ⇒ **不**打这条（证明这条 lint 是**分家族**的，不是"一律警告"）。
5. **既有断言全绿（控制组，这条是本决定的看门人）**：`test_no_unknown_key_warning_for_non_openai_class`（`:1473`，`ChatAnthropic` + `frequency_penalty` 不许警告）与 OpenAI 家族那一族（`:1410` / `:1429` / `:1540`）**逐条不变**——证明"收窄成针对性 lint"没有把通用误报带回来。

**前端**

6. `provider=anthropic` 时那两格**不在 DOM 里**；**从 `openai-compatible` 切到 `anthropic` 后**，表单值里这三个键**被清空**（断言提交的 payload）。
7. **修旧数据**（D3 的核心）：加载一条**已经带三件套**的 anthropic 条目 ⇒ **不改任何字段直接保存** ⇒ **200**，且写回文件里这三个键**消失**（若只做"隐藏"不做"提交时清空"，这条必红）。
8. **向导的建议按 provider 过滤**：新增向导里 `provider=anthropic` 时**不给** effort 建议（对照组：`openai-compatible` 照旧给）。

**真栈**

9. 起真栈（网关 + 前端）⇒ 用真实 PUT 走两条路：① 一条**带三件套的 anthropic 条目** ⇒ 保存被 **422** 明确拒绝（读 `detail` 原文）；② 在**编辑对话框**里对那条旧条目**什么都不改直接保存** ⇒ **200**，重读配置文件确认那三个键**消失**（这条同时验 D3 的"提交时清空"在真界面上真的生效）。收尾把配置**逐字节还原**（动手前先 `cp` 原始字节；网关在 Windows 上写 CRLF），并确认既有 OpenAI 兼容条目一字未变。
10. 结论口径：本 spec 只验"拒绝 / 放行 / 能修旧数据"，**不验**真实 Claude 端点的推理行为（那需要真 key，且属于"丁"）。

## 5. 影响面

- `backend/app/gateway/routers/models.py`（新增一条写入期规则 + 文案；`item.provider` 在同一作用域可得，落点在既有 `_validate_capabilities` 调用（`:658`）之后）
- `backend/packages/harness/deerflow/models/factory.py`（新增一条**分家族**的针对性 lint；OpenAI 家族行为逐字不变）
- `backend/tests/test_models_config_api.py`（422/200 用例，挨着既有 `:542` 的 8 条参数化校验用例）
- `backend/tests/test_model_factory.py`（lint 用例 + **既有 `:1473` 控制组不许破**）
- `frontend/src/components/workspace/settings/model-capability-editor.tsx`（新增一个入参，语义"**这条腿能不能正确发送这套字段**"；为假时不渲染那两格）
- `frontend/src/components/workspace/settings/models-{add,edit}-dialog.tsx`（传值；**提交时清空**那三个字段；新增向导"切换 provider 时清空"）
- `frontend/src/core/models/capability-registry.ts`（向导的建议按 provider 过滤）
- `frontend/tests/unit/settings/models-capability-wizard.dom.test.tsx`（向导：隐藏 + 过滤建议）与 `models-settings-page.dom.test.tsx`（编辑对话框：**改旧条目能修好**、payload 断言）
- 文档：`backend/AGENTS.md`（能力声明那一节补"声明要过写入期对账"；并记 Anthropic 家族那条 lint 的存在与它**不是**通用未知键守卫）
- **无迁移、无 schema 变更、不动默认值、不给 `openai-compatible` / `deepseek` 加任何新行为**
- **i18n 不动**：422 的文案走服务端 `detail`，而 `hooks.ts:60` 的 toast 用的就是 `error.message`、`ModelsConfigRequestError` 优先取 `detail`（`typeof error.detail === "string" ? error.detail : fallback`）⇒ **不需要新增键**；隐藏字段本身也不需要说明文案。

## 6. 已知缺口（写在案上）

- **这条规则绑定在"我们这条客户端用错了参数名"上，不是"这家没有档位"**（这条在 2026-09-19 的第二次核实里被更正过一次）：`anthropic` 0.97.0 **稳定版**参数表里就有 `output_config.effort`，值域 `low/medium/high/xhigh/max`；`reasoning_effort` 只是 OpenAI 的名字。⇒ 将来要做"丁"，就是**把档位映射到 `output_config.effort`**（成本低，本机已核实这条路通），而不是"包一层 thinking 预算"。
- **两边的档位值域并不相同**：我们这边是 `minimal/low/medium/high`（`ModelConfig` 的 Literal），那条协议是 `low/medium/high/xhigh/max` ⇒ 只有 **low/medium/high 三档重叠**；映射时要定"我们的 minimal 落哪、它的 xhigh/max 收不收"。这条属于"丁"的设计输入，记在这里免得将来重算。
- **界面**仍然填不了这条协议的档位**:`ManagedModelInput` 的白名单里既没有 `model_kwargs`（`output_config` 的落点），也没有 `thinking` / `when_thinking_enabled`。所以今天要给 Claude 配档位只能写 `config.yaml` 的条目（例如 `model_kwargs: {output_config: {effort: high}}`——`model_kwargs` 在工厂的合法透传名里，本机实测能进请求体）。本 spec 只**关掉**"填出来就会崩"的那条路，**没有\*\*给出替代控制——那属于"丁"。
- **`config.yaml` 手写条目只警告、不阻断**：操作者自担，D2 只保证"有日志可查"（而且它只针对 `reasoning_effort` 这一个键，见 D2 的收窄）。
- **不覆盖"网关要求自定义请求头"这类用法**（如 opencode Go 要求 `x-opencode-session`）：那是另一条（"条目自定义请求头"），本 spec 不碰；今天只能 `config.yaml` 手写 `default_headers`。
- **不做按模型过滤 + 超范围回退**：参照实现（Claude Code）遇到不支持的档位会**回退**；我们仍然会是"发出去（或拒绝）"，因为回退属于"丁"的范围。
