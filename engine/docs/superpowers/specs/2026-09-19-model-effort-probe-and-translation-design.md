# 推理档位：按协议翻译 —— 设计

> ⚠️ **本文件只做「翻译」这一半**（原稿是"翻译 + 配置期探测"）。探测那一半（原 D1）**已摘出并完整登记在 §6**，等拿到会填能力块的端点再另起一对。**文件名里的 "probe" 已名不副实**，之所以不改名：已交付的上一对 spec 里有一条链接指向它，改名要去动那份已交付文档（内容准确 > 文件名准确）。

**Status:** ✅ **本对（翻译这一半）三个 Task 全部交付（2026-09-19）** —— 翻译 `bb137237` / 前端 `8849dc9c` / 文档+真栈 见同名 plan 的 Task 3 纪要；**探测那一半仍未做**，完整登记在 §6。（2026-09-19 起草；**同日第四轮：按"先翻译、后探测"把本对收成「翻译」一期**。原稿把 D1（配置期探测）与 D2（按协议翻译）装在同一份 spec 里；实测发现**探测在本机所有可用端点上都拿不到数据**（见 §6 的登记），而**翻译不依赖探测、单独就能成立**（手填的档位照样会被正确翻译并发出）⇒ **D1 摘出本对**，它的全部发现（`capabilities.effort` 的形状、回落顺序、三种"探不到"、空交集的分辨、以及实测数字）**原样登记在 §6**，等拿到会填能力块的端点（官方 `api.anthropic.com`，或纯转发它的端点）再另起一对。**文件名保留旧名**（里面那个 "probe" 已名不副实）——因为已交付的上一对 spec 里有一条链接指向它，改名要去动那份已交付文档；判断依据：内容准确 > 文件名准确。）

**Task 1 已交付（2026-09-19）**：翻译（`_ANTHROPIC_EFFORT_NAMES` + `_nearest_declared_effort` + `_translate_reasoning_effort`，落点在 reconcile 之后）+ 删掉上一对那条 422 + 撤掉它那条 lint；窄面 130 绿、全量对 HEAD 零新增红。

**Task 0 已核实（2026-09-19）**：三项只读核实做完，结论就地更正本文件 3 处 —— D2 的**实现落点**（顶层构造参数、非 `model_kwargs`，并补"合并而非覆盖"与"只认我们那四档"）；D3 的**入参可直接删掉**；§5 正文计数改成 **12 个使用点**。详见同名 plan 的 Task 0。

**Parent:** [2026-09-10-model-capability-config-design.md](2026-09-10-model-capability-config-design.md)（声明层）· [2026-09-19-model-capability-protocol-check-design.md](2026-09-19-model-capability-protocol-check-design.md)（**它已落地**：把"发错名字"的组合挡在写入口；本 spec 把那条拒绝**删掉**、并撤掉它那条 lint，因为字段从此会被翻译而不是原样转发）

## 1. 问题

能力声明层只认**一套词汇**：`supported_reasoning_efforts` / `reasoning_effort`（`minimal/low/medium/high`）。工厂按条目字段名**原样转发**，于是：

1. **名字对不上协议**：同一件事在两家叫两个名字——OpenAI 形状 `reasoning_effort`（今天恰好同名，所以"看起来没翻译"），Anthropic 形状 **`output_config.effort`**（`anthropic` 0.97.0 稳定版 `types/message_create_params.py:138`，值域 `low/medium/high/xhigh/max`）。今天 anthropic 条目上声明档位 ⇒ 原样发 `reasoning_effort` ⇒ 本地 SDK `TypeError`（上一对 spec 处理的就是这个）。
2. ~~**档位集合只能靠人预填，而协议给了可探的元数据**~~ ⇒ **已摘出本对**，整段登记在 §6（原第 2 条：`ModelInfo.capabilities.effort` 与它的三个"探不到"）。
3. **两边的档位值域不重合**：我们 `minimal/low/medium/high`，它 `low/medium/high/xhigh/max` ⇒ 只有三档同名，`minimal` 与 `xhigh/max` 必须**显式决定**，不能靠同名直传糊过去。
4. ~~**市面对照**（`models.dev` / `zcode` 靠人写表；Trae / WorkBuddy / Qoder 都打 `/v1/models` 但不解析 `capabilities`）~~ ⇒ 那是"这个能力块为什么没人用"的证据，**随 D1 一并摘出**，见 §6。

⇒ **本对要治的是 1 与 3**：把条目声明的档位**按协议翻译**，值域不重合处显式给映射与回退。两件事都不需要网络、不需要端点配合。

## 2. 决定

> **本对只有一个"能用哪些档"的来源：条目声明的 `supported_reasoning_efforts`（下称**声明子集**）。** 原稿里那个"探测集合"（配置期一次性、只有界面读得到、不落盘）已随 D1 摘出本对（§6）；**别再往本对里引它**——运行期本来就读不到它。

### D1 —— 档位集合：**配置期探测（本期不做）**

**本对不做探测。** 原设计（扩 `POST /api/models/config/validate` 的响应、读 `ModelInfo.capabilities.effort`、探不到静默回落声明、以及"交集为空"与"探不到"的分辨）**完整登记在 §6**，等有能填能力块的端点再另起一对。

本对里"能发哪些档"**只有声明子集这一个来源**（见 D2）。

### D2 —— 发送：**按协议翻译**（两侧都要，且对声明子集越界回退）

工厂在转发前把条目声明的档位翻译成该协议的名字：

| 我们声明的档 | openai 形状 → `reasoning_effort` | anthropic 形状 → `output_config.effort` |
| ------------ | -------------------------------- | --------------------------------------- |
| `minimal`    | `"minimal"`                      | **`"low"`**（对方没有这一档，取最低）   |
| `low`        | `"low"`                          | `"low"`                                 |
| `medium`     | `"medium"`                       | `"medium"`                              |
| `high`       | `"high"`                         | `"high"`                                |

- **为什么 `minimal → low`**：值域不重合（§1.3），必须显式给一条；取最低是"最接近的语义"，且不会凭空发明对方不认的值。
- **`xhigh` / `max`（对方多出的）本期不产生**：我们这边造不出来 ⇒ 不需要正向映射。（"端点说只支持这两档怎么办"是探测那一侧的问题，见 §6。）
- **越界回退（对齐 Claude Code 的既有行为）：对着"声明子集"回退**。要发的档不在**该条目声明的 `supported_reasoning_efforts`** 里 ⇒ **回退到声明子集里最接近的一档**（同强度优先，否则取不高于它的最高档），**不是原样发、也不是报错**。
  - ⚠️ **触发面只有两处，且都在界面之外**：`request > agent > model > None` 这条链里，**界面上选不出越界值**（能力编辑器与输入栏列的都是声明子集）⇒ 真正能造出越界值的只有 **① 调用方从请求层传入**、**② 自定义 agent 的 `config.yaml` 写了越界档**。别把它写成"用户可能选错"。
  - ⚠️ **声明子集为空时怎么办**：语义是"未声明"（`supported_reasoning_efforts` 缺省 ⇒ 既有兜底"每个档都可用"）。此时**不做任何回退**、按名翻译即可——这正是今天 OpenAI 路径的行为，不要在这里新造一种"拒绝发送"。
  - **默认档本来就在子集内**（`ModelConfig._validate_capability_subsets` 在载入期就保证了），所以回退只由上面那两条外部入口触发。
- **`openai` 方言逐字节不变**（名字相同 ⇒ 翻译是恒等映射）；认不出的 `use` 仍按 OpenAI 形状走（既有兜底不变）。
- 实现落点：`knowledge/` 之外的那条模型工厂（`models/factory.py` 的 `reasoning_effort` 处理处）——**一处翻译，两条腿共用**（与 caption 腿共用一个出网入口同思路）。**位置 = `:370-373` 那处 reconcile 之后、两条警告之前**：reconcile 之后 `reasoning_effort` **只剩一处**持有（要么 `kwargs`、要么 `model_settings_from_config`），所以一处就够。
- **翻译的落点是"顶层构造参数"，不是 `model_kwargs`**（Task 0 实测更正）：`output_config` **本来就是 `ChatAnthropic` 的声明字段**（`langchain-anthropic` 1.4.1，`dict[str, Any] | None`）—— 对照 `reasoning_effort` **不是**字段（这正是上一对那场崩的根）。三种写法实测：

  | 写法 | 请求体里有 `output_config` | LangChain 警告 |
  | --- | --- | --- |
  | **顶层 `output_config={...}`** | ✅ | **无** ← 选它 |
  | `model_kwargs={"output_config": …}` | ✅ | ⚠️ 有（"should be specified explicitly"） |
  | 只给别的 `model_kwargs` 键 | — | 无 |

- ⚠️ **合并而非覆盖**：`output_config` 里除 `effort` 还有 **`format`**（`OutputConfigParam = {effort, format}`，都 optional）⇒ 条目若已声明 `format`，翻译必须**并进同一个 dict**，不能整体替换。
- ⚠️ **翻译表只认我们那四档**：Codex 分支会写 `"none"`（不是我们的档名）⇒ 认不出的一律**原样放过**。Codex 走 Responses API、按协议算 `openai` ⇒ 恒等，翻译不碰它（用一条回归用例钉住）。

### D3 —— 界面：那两格对 anthropic **恢复显示**，候选 = 声明子集

- **依赖上一对 spec 的 D3 反向**：上一对落地后是"anthropic ⇒ 不渲染 + 提交时清空"，本对要**撤掉**（因为字段从此发得出去了）；改回按**声明子集**渲染（集合为空才不渲染）。
  - ⚠️ **"撤掉"要撤干净：上一对落了 12 个使用点、5 个文件**（`canSendEffortLevels` / `withoutEffortAxis` / `capabilityValueForProvider`）。逐处清单见 §5，**其中两处最容易漏**：`models-settings-page.tsx::toManagedInput`（整集合 PUT 的必经之路，漏了就等于"清空"没撤掉）与 `core/models/capability.ts`（三个 helper 的归宿）。
  - **判据从"这条腿能不能发"换成"声明子集是不是空"**——注意不是"provider 是不是 anthropic"。
  - ⚠️ **那个入参可以直接删掉（Task 0 核实结论）**：编辑器**已经拿到 `value`**，而新判据恰恰就是 `value.supportedEfforts.length > 0` ⇒ 不必"换成另一个布尔"，**删掉入参**改成纯由 `value` 驱动即可（少 1 处声明、1 处解构、3 处传参）。
  - ⚠️ **“集合为空才不渲染”只对“默认档”那一行成立**（Task 2 实测更正）：**「可用推理深度」那一行必须一直渲染** —— 它是**唯一的声明入口**，藏掉就等于让没有预填建议的模型**永远填不上档位**。空声明只让默认档那行消失，这是上一对之前就有的行为（`git show bf6fd39e^` 可证）。
- **候选就是声明子集**，**本期没有"来源标注"**（那是探测那一侧才有的事，见 §6）：没有第二个来源，标注一个恒定的"来自声明"没有信息量。
- **本对里界面没有回退场景**：候选即声明子集 ⇒ 用户选不出越界值（D2 那条回退的触发面在界面之外）。别为它写界面逻辑，也别在文案里承诺"会自动纠正你的选择"。
  - 唯一的边界情形是**声明子集变窄之后**（如从四档改成 `{low}`）：那时旧的默认档会被载入期校验拒绝，属于既有行为，不是本对新增。
- 能力**向导**的建议同样按 provider 过滤（与上一对 spec 的向导过滤一条线）；**composer 那条深度菜单不在本期**——它读的就是公开列表里的声明子集（`GET /api/models` 带这两个字段），本对不改它。

### D4 —— 不做

- **不做"预算"这一维**（`thinking.budget_tokens`）：它是同一张表上另一行；本期只做 effort 的名字对齐。
- **不扩我们自己的档位值域**（不加 `xhigh`/`max`）：那要改 `ModelConfig` 的 Literal + 前端档位表 + i18n 四份文案，属于另一条。
- **不动 `thinking` 的启用/禁用路径、不动任何默认值、不动 RAG 那几条腿。**
- **不做探测、不进 `GET /api/models` 加任何东西**：都随 D1 摘出，见 §6。

## 3. 接口契约

| 契约                                        | 变化                                                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `PUT /api/models/config`                    | 上一对那条"`anthropic` 不许带 effort 三件套"的 422 **整条删除**（连同它的用例）；**不换成**"值不在可译集合里 ⇒ 422"——见下                                                                 |
| 工厂                                        | 新增**一处**按协议的档位翻译 + 对**声明子集**的越界回退；`openai` 路径逐字节不变；**同时处理上一对新加的那条 Anthropic lint**（见 §5）                                                            |
| `models_config.json` / `config.yaml` schema | **无新增字段、无新增语义**（档位仍用既有三个字段声明）                                                                  |
| 界面                                        | 那两格按**声明子集**渲染（本对落地前是"anthropic 全不渲染"）                                                  |
| `POST /api/models/config/validate`          | **本对不动**（探测那一半摘出，见 §6）                                                                       |

⚠️ **为什么 PUT 那条是"删"而不是"换成另一条"**：能替换成的判据只有"值不在**可译集合**里"——可按 D2 的映射表，我们那四档**全都可译**（`minimal→low`、其余同名）⇒ 这条判据**恒真、什么都不拦**；而"默认档必须在子集里"早由 `ModelConfig._validate_capability_subsets` 在**载入期**管着。**所以这一条没有可写的替代形态，删掉即闭环**（翻译落地后它本来就没有存在理由）。

## 4. 验收

**后端**

1. ~~探测成功~~ ⇒ **摘出本对**，见 §6 的登记。
2. ~~探不到静默回落（三条）~~ ⇒ **摘出本对**，见 §6 的登记。
3. **翻译**：`use=langchain_anthropic:ChatAnthropic` + 声明 `[low, medium, high]` ⇒ 请求体出现 **`output_config: {effort: "medium"}`**，且**不出现** `reasoning_effort`；同一份声明换 `ChatOpenAI` ⇒ 出现 `reasoning_effort: "medium"`（**逐字节等于今天的行为**）。
4. **`minimal` 那一行**：声明 `minimal` + anthropic ⇒ 请求体是 `output_config: {effort: "low"}`（映射表逐行有牙）。
5. **越界回退（触发条件已更正）**：条目**声明** `{low, high}`、而**调用方从请求层传入 `medium`**（`request > agent > model` 的最外层；**界面选不出这个值**）⇒ 发出去的是**回退值**（`low`），且**不抛**。⚠️ 原稿写的是"声明的默认档不在可用集合里"——**那条不可能发生**：载入期校验就保证了默认档属于声明的子集，所以回退的实际触发面只有请求层与 **agent 配置**。
6. **认不出的 `use` 仍走 OpenAI 形状**（既有兜底不回归）。
7. **回归**：`openai-compatible` / `deepseek` 的请求体与今天**逐字节相同**（形状守卫既有用例全绿）。
8. **上一对那条 422 已删净**：`_reject_anthropic_effort_levels` 与其调用点都不在了；它的 4 条参数化用例**删除**，而**控制组**（`openai-compatible` / `deepseek` + 同样三字段 ⇒ 200）与"清干净就放行"那条**保留**（它们验的是别的规矩，顺手删掉会丢掉回归面）。
9. **上一对新加的那条 lint 已处理**：翻译落地后，`_warn_anthropic_reasoning_effort` 不能再对"会被翻译走的 `reasoning_effort`"报警 ⇒ 要么删掉它、要么把判据改成"到构造期还剩未翻译的 `reasoning_effort`"；对应地，`tests/test_model_factory.py` 里那条警告用例**必须跟着改**（否则它会在本对落地后变成"钉住假警告"的用例）。

**前端**

10. anthropic 条目的那两格**重新出现**，候选就是**声明子集**（对照组：声明子集为空时不出现）。
    ✅ **已交付**（`8849dc9c`）。⚠️ 对照组的判据**已就地更正**：**「可用推理深度」那一行恒在**（它是唯一声明入口，藏掉等于让无预填建议的模型永远填不上档位），**空声明只让「默认推理深度」那行消失**——依据是上一对之前那份原形（`git show bf6fd39e^`）。用例按此写成"空声明时可用那行在、默认那行不在"。
11. **撤回上一对**：anthropic 条目的三个字段**不再被清空**（那是上一对的行为）；§5 列的 9 处、5 个文件逐处核过——尤其 `models-settings-page.tsx::toManagedInput`（整集合 PUT 的必经之路）。
    ✅ **已交付**（`8849dc9c`）。§5 表格逐项核过（**5 个文件、12 个使用点**；那个入参**整个删掉**，判据改由 `value.supportedEfforts.length > 0` 承担）；编辑器与上一对之前那份**逐字节一致**（`git diff acc23f4f` 为空）。
12. **`openai-compatible` 那条腿一字未变**（对照组：既有的"改能力子集"用例仍绿）。
    ✅ **已交付**（`8849dc9c`）。

**真栈**

13. 起真栈 ⇒ 给一条 `use=langchain_anthropic:ChatAnthropic` 的条目填上档位 ⇒ 保存 ⇒ 打一次真实调用，确认请求体是 `output_config.effort` 且模型正常回话。**写清用的是哪个端点、未打 `api.anthropic.com`**（如果没打）。
    ✅ **已交付**（甲案：**只验请求体形状，不声称回话**）。**隔离实例**（仓库外 scratch 根 + `DEER_FLOW_AUTH_DISABLED=1` + `:8099`）**未打 `api.anthropic.com`、未打任何云端点**：写入期 `PUT` **200**（就是上一对被 422 的那份载荷，三件套原样落盘、CRLF）；发送期 recorder 抓到的请求体是 **`output_config: {"effort": "medium"}`、无 `reasoning_effort`、无 `model_kwargs`**；对照组（同声明换 OpenAI 腿）是 **`reasoning_effort: "medium"`、无 `output_config`**。详见 plan Task 3。
14. 收尾：配置**逐字节还原**（动手前 `cp` 原始字节；网关在 Windows 上写 **CRLF + 2 空格**；**`cp` 的落点别只放系统临时目录**——上一轮我的快照被清理过，见 §6）、密钥不落盘、不新建残留文件。
    ✅ **已交付**，且这次**不欠还原**：写入全落在 scratch 根，他的 `models_config.json` **md5 从头到尾未变**（`b8b729ddd624e7ea1587efb6466e70b6`）；scratch 里那把 key 是我现造的假值。⚠️ **一条已知副作用**：scratch 实例启动时连了本机 `:6333` 的 Qdrant，只做了既有的 `GET collections` 与 `PUT …/index`（幂等），**没有新建集合、没有写入点**。

## 5. 影响面

**后端**

- `backend/app/gateway/routers/models.py`（**删掉**上一对那条 422 函数 `_reject_anthropic_effort_levels` 与它的调用点；validate 那条路由**本对不动**）
- `backend/packages/harness/deerflow/models/factory.py`（① 一处按协议翻译 + 对**声明子集**的回退；② **上一对新加的 `_warn_anthropic_reasoning_effort` 要跟着处理**——删掉，或把判据改成"到构造期还剩未翻译的 `reasoning_effort`"，见 §4#9）
- `backend/tests/test_models_config_api.py`（**删掉**上一对那 4 条"必须 422"的参数化用例，保留控制组与"清干净就放行"）
- `backend/tests/test_model_factory.py`（翻译逐行 + 回退 + OpenAI 回归；**改掉**上一对那条"anthropic 的 `reasoning_effort` 会警告"的用例）

**前端（撤回上一对要动 5 个文件、12 个使用点，逐处点名；漏一处就等于没撤干净）**

| 文件 | 落点 | 本对要做什么 |
| --- | --- | --- |
| `core/models/capability.ts` | `canSendEffortLevels` / `withoutEffortAxis` / `capabilityValueForProvider` | 三个 helper 的归宿：判据从"provider 是不是 anthropic"换成"**声明子集是不是空**" |
| `components/.../model-capability-editor.tsx` | 入参 `canSendEffortLevels`（**必填**） | **直接删掉它**（新判据 = `value.supportedEfforts.length > 0`，编辑器手上就有 `value`），渲染条件改成看 `value` |
| `components/.../models-edit-dialog.tsx` | 传参 + payload 里的 `capabilityValueForProvider` | 撤回清空（候选本来就只有声明子集） |
| `components/.../models-add-dialog.tsx` | 传参 + payload + **种子过滤** + **provider 切换时清空** + `setSuggested` 读过滤后的值（共 5 处） | 撤回清空与种子过滤（种子本就是"模型 id 的建议"，不再需要按 provider 抹掉） |
| **`components/.../models-settings-page.tsx`** | **`toManagedInput`**（上一对在这里按 provider 清空三个字段） | **最容易漏的一处**：它是整集合 PUT 的必经之路，撤回后这里要回到"原样带上字段" |
- `frontend/src/core/models/reasoning-effort.ts`：**不动**——composer 读的就是声明子集，本对不改它
- `frontend/tests/unit/settings/{models-capability-wizard,models-settings-page}.dom.test.tsx`（两格恢复 + 撤回清空 + 对照组）

**文档**

- `backend/AGENTS.md`：记"档位**按协议翻译**（`output_config.effort` / `reasoning_effort`）、越界按**声明子集**回退"；**并改掉上一对写下的两处**——① 那条"写入期对账"里的"**这条拒绝是暂时的**"（本对已删掉它）；② 那条"Anthropic 家族通用表有意留空 + 工厂那条 `reasoning_effort` lint"（**lint 本对已撤**，翻译之后它没有理由存在）
- `frontend/AGENTS.md`：那两格**按声明子集渲染**（不再按 provider 隐藏、也不再在提交时清空）；同样要改掉上一对写下的那句

- **无迁移、无 schema 变更、不动默认值、不给 `openai` 方言加任何新行为**

## 6. 已知缺口（写在案上）

### 【登记】配置期探测档位集合 —— **本期不做**（原 D1，2026-09-19 第四轮摘出）

这一段是**已验证的发现 + 未做的设计**，不是待办；**等拿到会填能力块的端点再据此另起一对**（起草时直接搬这一段，不必重查）。

- **要探什么**：`GET {base}/v1/models` 的返回对象 `ModelInfo` 里有 `capabilities`，其中 **`effort: EffortCapability{supported, low, medium, high, max, xhigh}`**（同一块还有 `thinking{supported, types}` / `image_input` / `pdf_input` / `structured_outputs` / `context_management`）⇒ 对 Anthropic 形状的端点，"这个模型支持哪些档"是**问得出来的**（只读、不推理、不花钱）。**读法用 `model_dump()` 而不是属性**（老版本 SDK 属性拿不到但 dump 里还在，本仓 09-19 已定这条）。
- **落点（设计）**：**扩既有那条探针的响应**（`POST /api/models/config/validate`），不新开端点——它已经按 provider 打对了路径与头（anthropic 走 `/v1/models` + `x-api-key` + `anthropic-version`，OpenAI 形状走 `{base}/models` + Bearer）。新增字段**缺省而非 null**（路由上已有 `response_model_exclude_none=True`，`warning` 就是先例）。**时机＝配置期那一次，不是每次请求**；**结果不落盘**（本仓探针族的纪律：只读不落盘、只报不拦）。
- **三种"探不到"，一律静默回落**：HTTP 404 / 返回里没有 `capabilities` / 网络或鉴权失败。
- **回落顺序（界面用）**：探测集合 ∩ 我们的档名 ⇒ **非空则用它**；空或探不到 ⇒ 用**声明子集**；两者都没有 ⇒ 控件不出现。
  - ⚠️ **"交集为空"与"探不到"要分两句**：探不到 ⇒ 回落声明；**探到了但交集为空**（如只支持 `xhigh/max`）⇒ 这**不是**"探不到"，是"探到了但这一侧没有可用档"⇒ 同样回落声明。两者观感相同、理由不同，文案/日志别写成同一句。（`None` 会被 `exclude_none` 剔掉、`[]` 会留下 ⇒ 两种状态在线上是可分辨的。）
- **实测：本机可用端点一个都拿不到**（2026-09-19 一手核，不带 key 只看状态码）：

  | 端点 | 形状 | 实测 | 说明 |
  | --- | --- | --- | --- |
  | `api.anthropic.com/v1/models` | Anthropic | **403** | 路由**在**（要 key）。能力块按官方 SDK 类型表存在，**没 key 验不到** |
  | `dashscope.aliyuncs.com/apps/anthropic/v1/models` | Anthropic | **404** | 百炼的 anthropic 形状**没有这个路由** |
  | `opencode.ai/zen/go/v1/models` | （被当中 Anthropic 用） | **200** | 37 条、**0 条带 `capabilities`**（它自己造的目录，字段是 `created/id/object/owned_by`） |
  | `ark.cn-beijing.volces.com/api/v3/models` | OpenAI | **401** | 火山那条要 key；且那是 OpenAI 形状的目录（按形状判断不会有能力块，**未实测**） |
  | `dashscope.aliyuncs.com/compatible-mode/v1/models` | OpenAI | **401** | 同上，要 key |

  ⇒ **判据不是"是不是官方"，而是"这个端点肯不肯把 Anthropic 的目录原样给你"**：官方一定有；**纯转发/反代**的也会有；**自己重造目录的聚合网关**（opencode）与**压根没这个路由的**（百炼 anthropic 形状）没有。**本机在用的三家全都不给** ⇒ 探测在本机零收益，这是把它摘出本期、先做翻译的直接原因。
- **市面对照（同一把尺子）**：`models.dev` 用"逐模型声明机制 + 值集合"、`zcode` 把 `{路径, 值}` 写成数据（`reasoning.levels.<档>.<协议>.set`）——**都靠人写表**；Trae / WorkBuddy / Qoder **都打 `/v1/models` 拿模型清单，但四家没有一家解析 `capabilities`**（本机 bundle 实测）⇒ 这个能力块是"**协议给了、没人用**"的那种。
- **不做的那几条（也随本期一起登记）**：不为 OpenAI 形状做探测（那侧目录只给 id/owned_by）；不给编辑对话框加探测入口（validate 是向导 step 1 的探针，给编辑路径也探要动打开即发请求的时序）；不把探测结果塞进公开列表（等于落盘，且 composer 会跟着变成"端点说了算"）；不每次请求探测。⇒ **若哪天发现某家 OpenAI 形状的目录也填了类似元数据，上面这条"不为 OpenAI 形状做探测"值得重议**——它是基于"协议没给"下的，不是基于"我们不做"。

### 本期仍然开着的

- **收尾用的一次性快照要放在不会被清理的位置**：上一轮我把 `models_config.json` 的原始字节 `cp` 到**系统临时目录**，中途被清理，而工作树当时正处在"被改过"的状态 —— 靠条目提交时用的是**哨兵**（服务端保留了原密钥）才按"删掉多写的条目 + 还原被清的字段 + 用应用自己的 `json.dump(indent=2)` + CRLF 重放"重建回原字节（md5 验过）。**教训**：快照别只放 temp；或先用一次演练验好重建配方再动配置。
- **我们的档位值域不扩**：`xhigh`/`max` 只能被折叠/回退消化，界面上出现不了这两个名字（要出现就得扩 Literal + i18n，另一条）。
- **`minimal → low` 是"我们的映射"**：不是官方等价关系（Claude Code 文档自己说"努力尺度按模型校准"，同名档跨模型不等强度）；文案里要写成我们的对应关系，别写成协议规定。
- **翻译只在 `models/factory.py` 这一处**：`claude_provider.py`（那条自研 Anthropic 客户端）有它自己的预算逻辑，**不在本 spec 的翻译范围内**（它的 `output_config` 取值要保持原样，别被这处翻译顺手改掉）。
