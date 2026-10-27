# 引擎 + 插件 —— RAG 腿思考档位 Spec

**Status:** 已交付（2026-10-21；Task 0–7 全过，真面板换模型清回已由用户实点复验；`minimal` 已裁 D1＝甲）。**2026-10-27 文案修订（用户裁）**：选择器内「思考档位」统一改称「推理等级」（与宿主 `menu.effort` 同词；内部字段仍 `*_thinking`/`*_reasoning_effort`；样式与菜单形态不变）。
**Date:** 2026-10-21
**配套 plan:** [2026-10-21-rag-leg-effort-plan.md](../plans/2026-10-21-rag-leg-effort-plan.md)

## 1. 范围与来源

RAG 面板现在只有五条腿的「思考开/关」布尔（`extract_thinking` 等），没有档位。档位实际来自模型条目的 `reasoning_effort`；对 `dsh:` 别名，代理不再写该字段，「跟随」＝不发值，由 DSH 在调用时用自己的默认档。DSH 会话里选的档位本身不持久，跳转后回到 Default，所以「让 RAG 跟随 DSH 的会话选择」不可行。

RAG 的生产搭配是多模型：抽取常用便宜快模型、裁判/百科用更强模型，思考开时还需要不同的深度。一个全局档位满足不了这种搭配；零改引擎的替代（同一模型 × 每个档位发一条别名）会把条目数放大到「模型数 × 档位数」，模型设置页和选择器都会被灌满。因此本项目接受一次引擎改动：

- **目标**：五条后台腿各自持久化一个思考档位；选项来自该腿当前模型声明的档位集合；思考关闭时不发档位。
- **形态**：RAG 配置新增五个可选字段；四条 LangChain 腿经 `create_rag_chat_model` 传入，caption 腿在两种 HTTP 协议下各写对应的档位字段。
- **持久化**：`rag_config.json`（UI 写）与 `config.yaml` 的 `rag:` 块（operator 写）双入口，三态语义与现有 `*_thinking` 一致。
- **边界**：只管五条后台腿；RAG 对话侧不变；不做 per-session；档位词表扩到 DSH 的六档（`xhigh`/`max` 各占一项），`off` 仍由思考开关表达。

## 2. 取证与现状

### 2.1 引擎侧

- 档位词表现状：`REASONING_EFFORT_LEVELS = ["minimal","low","medium","high"]`、`ReasoningEffort = Literal[...]`（`backend/packages/harness/deerflow/config/model_config.py:12-13`）。本项目把它扩成 `minimal/low/medium/high/xhigh/max`；`REASONING_EFFORT_LEVELS` 是排序与夹取的唯一来源（`nearest_declared_effort` 27、`resolve_effective_effort` 46、`ModelConfig` 校验 191），扩表后三处自动按六档排序。`off` 不是档位；关思考是 `*_thinking` 布尔 + `when_thinking_disabled` 形状。
- RAG 配置：`RagConfig` 的五个思考布尔在 `backend/packages/harness/deerflow/config/app_config.py:204-208`；UI 可写的三态副本在 `config/rag_config_file.py:138-142`（`None` = 文件未声明，config.yaml 说了算）。
- 工厂解析顺序（`models/factory.py`）：
  - 思考开且声明了 `when_thinking_enabled` 时先合并形状（341-352）；
  - 思考关时 `when_thinking_disabled` 覆盖条目默认（353-356）；
  - `supports_reasoning_effort=false` 时丢弃调用方档位（373-375）；
  - 调用方档位与条目默认的二选一在 420-423：调用方非 None 时赢；
  - `_apply_declared_effort` 在 428 行按条目声明子集就近夹取；随后翻译成 Anthropic 的 `output_config.effort`（129-164）。`_ANTHROPIC_EFFORT_NAMES`（90-95）目前只有四档，本项目补 `xhigh→high`、`max→high`；Codex 路径的显式档白名单（393，`low/medium/high/xhigh`）不在本期。
- 四条 LangChain 腿的构造入口：`knowledge/model_target.py:195` 的 `create_rag_chat_model`；调用点 `graph/extractor.py:129`、`wiki/generator.py:219`、`worker.py:1097`、`eval/factory.py:71`、`eval/synthesis.py:148`。它们目前只传 `thinking=`，不传档位。
- caption 腿不走工厂：`knowledge/caption_client.py` 的 `_apply_thinking_off`（68-79）与 `_apply_thinking_on`（82-89）只认条目声明的形状；OpenAI 请求体在 92-101，Anthropic 在 104 起。`knowledge/vlm_target.py:66-118` 目前只带 `supports_reasoning_effort` 与两个形状，不带声明子集。
- RAG 配置 API：`app/gateway/routers/rag_config.py` 的响应按 `RagConfigFile.model_fields` 生成值/来源（298-313）；`_pending_rag` 基于 config.yaml 的 `rag:` 与本次 payload 合并（395-402）；保存校验在 405 起；黄金文件在 `backend/tests/fixtures/rag_config/response_golden.json`。
- 引擎 `/api/models` 已返回 `supports_reasoning_effort`、`supported_reasoning_efforts`、`reasoning_effort`（`app/gateway/routers/models.py:45-50、155-157`），面板不需要新读口；同文件 48、204 两处描述写死「all four levels / minimal<low<medium<high」，随词表一起改。

### 2.2 插件与 DSH 侧

- 插件把每条 DSH 模型发布成 `dsh:<provider>/<model>` 薄别名，当前（未提交的工作区）写入 `supported_reasoning_efforts`、`when_thinking_disabled`，并在默认档可发布时写 `reasoning_effort`；`when_thinking_enabled` 已删，思考开时回落到 DSH 默认。
- 代理侧的 `EFFORT_ORDER` 与 `CANONICAL_EFFORT` 目前把 `xhigh`/`max` 折成 `high`（`src/model_proxy.ts:16-24`）；本项目改成六档原样，夹取仍按模型声明取最近档。
- 面板的五腿思考菜单在 `client.js:16009-16099`：两列网格（角色｜生效模型），勾选即写 `*_thinking`；模型行分别在抽取组（16395-16405）、评测组（16407-16419）、多模态组（16550-16589）。
- 表单种子在 `ragFormValuesFromConfig`（16902-16942），保存载荷在 `ragBuildInput`（16959-17030），脏检查在 `ragHasChanges`（17033-17043）；`RAG_THINKING_FIELDS` 在 16895。
- 「DSH 模型」组的只读「DSH 主模型」行（16128-16138）只读 `agentDefaultModel.currentSelection()` 并渲染，没有写入或解析路径依赖它。

### 2.3 为什么不是全局一行

| 形态 | 满足多模型搭配 | 存储 | 代价 |
| --- | --- | --- | --- |
| 全局一行 | 否：五腿共用一个档位 | 条目或插件配置 | 零改引擎，但解决不了「抽取低、裁判高」 |
| 每模型一行 | 部分：同一模型的两条腿不能分档 | 条目 | 零改引擎；仍不是行为粒度 |
| 每条腿一行（本方案） | 是 | RAG 配置 | 一次引擎改动（五个字段 + 传参 + 校验） |
| 按档位发别名 | 是 | 模型条目爆炸 | 5 模型 × 6 档 = 30 条（含 `off` 为 35 条），设置页与选择器被灌满 |

## 3. 决策表（D1–D8）

| # | 点 | 决定 | 理由 |
| --- | --- | --- | --- |
| D1 | 粒度 | 五条腿各一个档位字段 | 「多模型搭配」的行为粒度是腿；同一别名被两条腿复用时仍能分档 |
| D2 | 持久化 | `rag_config.json` + `config.yaml` 双入口，`None` = 文件未声明 | 与 `*_thinking` 完全同构；不改插件配置，不需要新的 host op |
| D3 | 值域 | 引擎词表扩到六档 `minimal/low/medium/high/xhigh/max`，与 DSH 一档一项；`off` 不进档位；代理不再把 `xhigh/max` 折成 `high`；Anthropic 协议仍把两者折成 `high` | 2026-10-21 晚用户裁定：DSH 模型档位因模型而异，RAG 要逐字显示；扩词表是共享面但本期只动引擎与插件，主树/切片树不同步；关思考继续由 `*_thinking` 表达 |
| D4 | 面板 | 每腿一个合并选择器「Off / Default / Minimal / Low / Medium / High / Xhigh / Max」，放在该腿模型行同一排；删除旧五勾选菜单与「DSH 主模型」只读行 | 一个控件一个决定；档位与模型同排；主模型行没有承接功能 |
| D5 | 解析顺序 | 腿显式档 > 条目默认档 > 不发值（协议/DSH 默认）；只在思考开启时把档位传下去 | 工厂的 reconcile 让调用方赢；思考关时传档位会覆盖 `when_thinking_disabled` 的 off 形状 |
| D6 | 校验 | 保存期严格，但只管**本次 payload 显式声明**的档位（不在子集即 400）；config.yaml 来源的档位不在保存期拒绝，留给运行期就近夹取/丢弃 + warning；换模型时就地清回本面板持有的「跟随」 | 写入时能给出可读错误；config.yaml 与 DSH 子集漂移不能阻断运行（与 §8 一致） |
| D7 | 选项来源 | 该腿生效模型的 `supported_reasoning_efforts`；`supports_thinking=false` = 只给「关」；`supports_reasoning_effort=false` = 「关 / 跟随」；两者为真且未声明子集 = 六档全开 | 选项就是模型能力；「跟随」= 开思考 + 不发档，不能开思考的模型只剩「关」；手动条目与 `dsh:` 别名同一口径 |
| D8 | 发布关系 | 插件停止写 `reasoning_effort` 默认档；条目只带能力子集与 disable 形状 | 「跟随」必须是活的 DSH 默认，而不是发布时抄下的快照；显式档位改由腿字段承担 |

## 4. 设计

### 4.1 数据模型

`RagConfig` 与 `RagConfigFile` 各加五个字段（类型为扩表后的六档 `ReasoningEffort | None`）：

| 字段 | 对应腿 | 关闭时 |
| --- | --- | --- |
| `extract_reasoning_effort` | 图谱抽取 | 发 `when_thinking_disabled`，档位不参与 |
| `wiki_reasoning_effort` | 百科生成 | 同上 |
| `judge_reasoning_effort` | 评测裁判 | 同上 |
| `synthesis_reasoning_effort` | 考题合成 | 同上 |
| `vlm_reasoning_effort` | 图片/视频描述 | 同上 |

- `None` = 跟随该腿当前模型的默认档：`dsh:` 别名没有条目默认，工厂不发值，DSH 用自己的默认；手动条目有 `reasoning_effort` 时用它。
- UI 选择 `Off` 时同时写 `*_thinking=false` 与档位空值（不留隐藏档位）；`Default`（跟随模型默认）写 `*_thinking=true`、档位空值；具体档位写 `*_thinking=true` + 该档。
- 三态：`rag_config.json` 省略该键 = `config.yaml` 的值生效；文件里写了 `null`/空 = 撤回覆盖。

### 4.2 解析与传参

| 腿 | 入口 | 思考开时 | 思考关时 |
| --- | --- | --- | --- |
| 抽取 | `create_rag_chat_model(..., reasoning_effort=level)` | 工厂把这档作为调用方值，覆盖条目默认并夹取 | **不传**（否则覆盖 disable 形状） |
| 百科 | 同上 | 同上 | 不传 |
| 裁判 | 同上（`attach_tracing=False` 保持） | 同上 | 不传 |
| 合成 | 同上 | 同上 | 不传 |
| caption | `request_caption(..., reasoning_effort=level)` | OpenAI 体写 `reasoning_effort`；Anthropic 体写 `output_config.effort`（`minimal→low`、`xhigh/max→high`） | 不写；`when_thinking_disabled` 照旧 |

- `create_rag_chat_model` 的门禁保持：模型不声明思考支持时把 `thinking` 降为 false 并 warning；档位只有在最终 `thinking=true` 时才下传。
- caption 的优先级：腿显式档 > 条目 `when_thinking_enabled` 形状；腿档为 None 时保持现有形状行为。
- caption 的 Anthropic 体对 `output_config` **合并写入**（保留 enable 形状里的其他键，如 `format`），不整体替换——与工厂 `_translate_reasoning_effort` 的写法一致（factory.py:163-164）。
- 夹取抽成 `clamp_declared_effort(level, *, supports, declared) -> (level | None, substituted)` 纯函数，`resolve_effective_effort` 委托它，factory 与 caption 共用；Anthropic 名表抽成 `anthropic_effort_name(level)`，两条腿共用，避免第二份排序表与第二份名表。
- 条目 `supports_reasoning_effort=false` 时工厂已丢弃档位（factory.py:373-375）；caption 侧同样丢弃并 warning。

### 4.3 API 与保存校验

- 响应：五个字段随 `RagConfigFile` 自动进入 `config`，来源按现有循环自动得到 `ui` / `config_file`；黄金文件同步。
- 保存期（`put_rag_config`）新增一条校验，**只针对本次 payload 显式设置了档位的腿**：按写入后的配置（`pending`）解析其生效模型（腿字段 → `default_model` → 首个模型），然后
  - 声明过的目标不存在 → 由现有 `_reject_unusable_role_targets` 先拒，本校验不重复报错；系统自选的首模型不因档位被拒（沿用 D3 的「自选目标不作拒绝理由」）；
  - 条目 `supports_reasoning_effort=false` → 400，句子指名腿、模型；
  - 条目声明了子集且档位不在子集 → 400，句子指名腿、模型、档位与可用档位。
- config.yaml 来源的档位不在保存期拒绝：operator 写下的值按运行期规则处理（就近夹取/丢弃 + warning），换模型因此不会被档案位拦住（与 §8 一致）。
- 运行期：config.yaml 被 operator 改坏或 DSH 收缩子集时，就近夹取并 warning；不阻断腿。
- 不需要新的面板 op：五个档位随现有 RAG 配置保存链提交。

### 4.4 面板

五条腿各一个「单框双配置」选择器（2026-10-21 按用户要求照 DSH 模型选择器定形，替换最初的两框并排）：

```
图谱抽取模型   [ MiMo-V2.6-Flash     High ⌄ ]
                 └ 根面板：模型 [MiMo-V2.6-Flash] › ／ 推理等级 [High] ›
```

- 触发盒＝模型名（不带厂商后缀）＋当前档位＋下箭头。点开先见根面板两格（「模型」/「推理等级」，左标签、右当前值、右侧右箭头）；点格下钻；下钻页顶部有返回箭头与页名，Escape 先退一页再关闭。
- 跟随态照 DSH 显示**宿主默认档的名字**（如 `High`）；模型未声明默认档时才显示 `Default`。该解析只用于显示，存档值仍是「跟随」；映射由 `dshModelStatus.defaults` 提供。
- 模型页：候选超过 4 条时出现搜索框（照 DSH 的阈值）；`dsh:<provider>/<model>` 条目按 provider 分组，组标题＝厂商显示名（`deepseek-account` 用本地化 `DeepSeek 账号`，其余用 provider id），条目名只用模型名（显示名去掉「 · provider」后缀），手动条目归末组，默认项单独置顶；选中项打勾，选中即写值并关闭。组标题样式取宿主 `MenuGroup`：11px/16px、`4px 7px 2px`、默认透明、滚到钉住时（`data-stuck`）填 `--dsw-alias-menu-group-header-fill`、组间 3px；每组包一层 section 以限定吸顶范围。
- 档位页：值域 `Off / Default / Minimal / Low / Medium / High / Xhigh / Max`（`off`/跟随/六档）；标签用宿主适配器给出的英文名（pi-ai 即首字母大写，不随界面语言翻译）。模型声明子集时只列子集；`supports_thinking=false` 时只留 `Off`，`supports_reasoning_effort=false` 时只留 `Off / Default`，页脚用「由模型能力决定」说明。
- 「RAG 默认模型」复用同一套模型菜单：触发盒只显示模型名；打开即模型页（无根页/无档位格），厂商分组、搜索、空值项与腿选择器一致；菜单宽度封顶 420px。
- 有效模型按现有思考菜单的口径解析：腿值 → 配置默认 → 列表首行；VLM 腿同一条链，**没有视觉过滤**（引擎的 `resolve_vlm_target` 也不滤）；视觉过滤只用于 `vlm_model` 的候选列表。
- 换模型时若已存档位不在新模型子集，就地清回本面板持有的 `Default`（跟随模型默认；config.yaml 声明的档位不动，选择器显示该值）；选择器本身显示新值，不额外弹提示。
- 默认项「使用配置默认」用次级文字色、下缘细分隔线与厂商组分隔；不是模型、不参与分组。
- 菜单定位按**当前页**的实际内容高度决定向上或向下展开（根页两格最矮），下钻与搜索改变高度后重放位置；不按固定 360px 预估，避免靠底部的腿把菜单甩到面板顶部。
- 旧五勾选菜单与「DSH 主模型」只读行删除；`dshModelStatus.mainModel` 保留为诊断字段（无 UI）。
- 「DSH 模型」卡片不再显示说明段落（同文已在组标题的悬停提示里，组标题保留 `title`）。
- 文案：`Off`、`Default`、`Minimal/Low/Medium/High/Xhigh/Max`（档位名固定英文，不进 zh/en 字典）、`由模型能力决定`（不可选时的说明）、`模型`、`推理等级`、`返回`、`搜索模型…`、`没有匹配的模型`、`手动条目`、`DeepSeek 账号`；其余 zh/en 内联字典同步（aria 用「模型 X，推理等级 Y」）。

### 4.5 与模型发布的关系

- 插件 `toEngineEntry` 不再写 `reasoning_effort`；保留 `supported_reasoning_efforts`、`supports_reasoning_effort`、`supports_thinking`、`when_thinking_disabled`。
- 「跟随模型默认」在 `dsh:` 别名上等于「不发值 → DSH 默认」，DSH 改默认或默认是 `xhigh/max` 时都能原样生效。
- 手动条目完全不受发布逻辑影响；其条目默认档就是「跟随」的目标。
- 代理目录保留 `defaultEffort`，只经 `dshModelStatus.defaults` 供面板把「跟随」显示成宿主默认档名；`buildGenerateOptions` 仍不读它，引擎条目也不写它。

## 5. 语义与边界

- **只管后台腿**：RAG 对话侧的思考与档位仍由对话模型/输入侧决定；本项目不改对话链。
- **词表是共享面**：扩表后引擎的 `ModelConfig`、models API、RAG 配置校验都接受 `xhigh/max`；主树/切片树不随本期改动，若日后回移需要同步它们的前端标签。
- **关思考优先**：`when_thinking_disabled` 的 off 形状始终赢过任何档位；这正是「思考关时不传档位」的原因。
- **一条腿一个值**：腿指向的模型被换掉时，档位不跟随模型走，只会被校验/重置；模型条目自身的默认仍可被其他腿使用。
- **config.yaml 的档位是固定值**：operator 在 `config.yaml` 的 `rag:` 块写下的档位，面板可以改成别的档，但清不回「跟随」（三态里没有「显式声明 None」）；换模型时只清回本面板（`rag_config.json`）持有的档位。要放开需 operator 改文件。
- **DSH 不可用**：别名条目仍在引擎里，保存校验照常能查到；调用失败仍是现有可读错误。手动条目不受影响。
- **存量配置**：没有档位字段的旧 `rag_config.json` / config.yaml 原样加载，五条腿都是「跟随模型默认」。
- **无隐藏档位**：选择「关」会清空档位，不保留上次选择。

## 6. 非目标

- 不改 Codex 路径的显式档白名单（`low/medium/high/xhigh`，不含 `max`）；RAG 腿不走 Codex。
- 不做全局 RAG 默认档位、不做每模型覆盖表、不做 per-session 档位。
- 不改 RAG 对话链、不改 DSH 会话的档位持久化行为。
- 不新增插件配置项、不新增面板 op、不写插件数据目录。
- 不做自动档位探测或按任务难度自动选档。
- 不把改动回移主树（`deer-flow`）或切片树；只落引擎与插件。

## 7. 验收

1. **引擎单测**：六档词表的排序/最近档夹取/ModelConfig 校验（含 `xhigh`/`max`）；配置双入口三态、五个字段的 API 往返与来源、黄金文件；保存期三条拒绝分支；四条 LangChain 腿收到档位且思考关时不收；caption 两协议的请求体与 `minimal→low`、`xhigh/max→high`；运行期夹取/丢弃；无档位旧配置零变化。
2. **插件门禁**：`node --check client.js`；代理与同步测试（`xhigh/max` 原样传递、发布不再写默认档）；仓外 `client-load-check.mjs` 默认与 `SMOKE_HOSTLESS=1`；五个选择器的 SSR/happy-dom 断言（六档值域与「极高/最高」标签、换模型重置、无档位模型只有两项、旧菜单消失）。
3. **真栈**：两条 `dsh:` 别名分别设不同档位（如抽取低、裁判高）各跑一条腿；若目录里有声明 `xhigh`/`max` 的模型，各跑一条确认代理原样交给 DSH——当前盘上（`hrag-probe/task4-models-config.json`）没有这样的条目，此时该项记「不可执行」，由代理单测证身份传递；在只声明到 `high` 的模型上请求 `max`，确认就近夹到 `high`；caption 腿设档位跑通；手动条目设档位跑通；思考关的腿确认不发档位；换模型后旧档位被清回（config.yaml 来源的档位除外）；DSH 停止时错误可读且手动条目可用。
4. **无回归**：引擎全量 `pytest -m "not live"` 与基线同集同数；插件既有模型代理/同步测试不退回；RAG 配置既有字段行为不变。
5. **安全**：新增字段不含密钥；错误句子不回显 provider body；面板与日志无 token。

## 8. 风险与残差

- **共享词表扩展的波及面**：`ReasoningEffort` 是引擎共享类型；扩表会改变 `ModelConfig` 校验与排序的合法集合。主树/切片树本期不动；若日后合入，它们的前端档位标签要同步补 `xhigh`/`max`。
- **`xhigh`/`max` 的 provider 接受度**：只有模型声明了这两档才出现在选择器里；若 DSH 声明了但上游拒绝，属 DSH/provider 侧，按错误映射处理，不静默降档。
- **Codex 白名单残差**：工厂的 Codex 路径仍只认到 `xhigh`，不含 `max`；RAG 走 openai-compatible，不受影响，属登记项。
- **`minimal` 的实测风险（2026-10-21 已验证，D1＝甲）**：xiaomi 在「思考开 + `reasoning_effort=minimal`」也实测被拒——引擎发 `minimal`，代理原样交给 DSH，返回 502 `model_call_failed`；同模型 `low` 正常 200。按甲保持现状：代理不静默改档，发布时也不剔除 `minimal`，面板照 DSH 声明展示，选中后由腿报可读失败。
- **引擎改动成本**：丙方案的「引擎零改动」在本项目不再成立；这是逐腿持久化的必要代价。主树/切片树不同步，后续若要回移另立一步。
- **Anthropic caption 翻译**：工厂已有 `minimal→low` 表；caption 直发体必须共用同一份映射，否则两条腿的档位语义会分叉。
- **保存期 vs 运行期**：保存期严格校验会拒绝「模型暂时从目录消失」时的显式档位；这是有意的（宁可让用户先选回跟随），需要在错误句子里说清。
- **DSH 默认显示**（2026-10-22 已修）：`dshModelStatus.defaults` 提供别名→默认档映射，跟随态在触发器显示该档名（未声明时仍显示 `Default`）；映射只用于显示，不写引擎条目。
- **配置漂移**：operator 直接改 config.yaml 可写入当前模型不支持的档位；运行期夹取 + warning 是兜底，不阻断。
- **升级次序**：两仓必须同批升级，**引擎先起、插件后起**——插件把六档子集写进 `models_config.json` 后，旧引擎的 `ReasoningEffort` Literal 会在加载期拒收整个文件，表现为模型配置整体不可用。回退时顺序相反：先回退插件（条目子集回到四档），再回退引擎。
- **选择器选项滞后于实时档位**：面板选项取自已发布条目（上次同步的快照），不是 DSH 的实时 `resolveModelInfo`；DSH 事后增删档位要等下一次同步（`llm/adapters-updated` 或手动同步）才进选择器，期间发出的越界档由代理就近夹取。

## 9. 对既有 spec 的修订

- [2026-10-21-dsh-model-proxy-spec.md](2026-10-21-dsh-model-proxy-spec.md) §4.2：`reasoning_effort` 一行（93）改为「不写」；`when_thinking_enabled` 一行（95）的「沿用条目默认档」改为「腿字段未选时不发，DSH 用默认」；`when_thinking_disabled` 规则（96）不变。§4.4 第 113 行的思考菜单置灰改为逐腿选择器。§8 第 156 行「开思考跟随 DSH 默认」的括号改为「档位由 RAG 腿字段提供，条目不再携带默认档」；第 155 行「thinking 限制」保持。
- 同 spec 的 D4 与 §4.2（93 行）：`xhigh`/`max` 由「折成 high」改为「原样发布/传递」；代理的 `EFFORT_ORDER`/`CANONICAL_EFFORT` 同步改为六档，`lowestEffort` 的顺序随之。
- 该修订在实现批次里随文档任务落盘，不单独提交。
