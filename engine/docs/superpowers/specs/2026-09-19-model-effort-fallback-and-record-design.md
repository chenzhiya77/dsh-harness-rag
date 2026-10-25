# 推理档位：回退铺到两条腿 + 记录必须等于实发值 —— 设计

**Status:** ✅ **本对三个 Task 全部交付（2026-09-20）** —— 翻译与记录两半都已落地：`7414eeb1`（两条腿回退 + warning）/ `0725463d`（记录跟随实发值）/ Task 3 文档 + 真栈（见同名 plan）。**验收全过**：全量对 HEAD 双向 diff 为空；真栈隔离实例两腿 + 对照组 4 条、**零出网**。（2026-09-19 起草；**2026-09-20 按审查就地重写**——见下）

**Parent:** [2026-09-19-model-effort-probe-and-translation-design.md](2026-09-19-model-effort-probe-and-translation-design.md)（那一对把档位**按协议翻译**并给 anthropic 腿加了**对声明子集的回退**；本 spec 接在它后面，处理它**留下的不对称**：回退只铺了一条腿、以及记录侧没有跟着走。翻译本身**不动**。）

> **2026-09-20 重写说明（诚实记）**：初稿有两处**事实错误**，审查时对着代码核出并改掉：
> ① 初稿说"三处记录点**全部早于**构造"——**错的**：`_publish_constitution_snapshot` 的两个调用点在 `create_chat_model` **之后**（`:889` / `:997`，而构造在 `:874` / `:980`；初稿引的 `:653` 是那个辅助函数的**定义**行）。
> ② 初稿把 D3 写成"在记录前调一次回退函数 ⇒ 一个点覆盖三处"——**不够**：实测**四格里三格记录 ≠ 实发，且是三个不同的原因**（见 §1.2），回退函数只治其中一个。

## 1. 问题

### 1.1 回退只铺了 anthropic 腿

`_translate_reasoning_effort` 第一行就是家族门（`models/factory.py:137`）：

```python
if not issubclass(model_class, ChatAnthropic):
    return
```

⇒ **openai 腿连声明子集都不读**。实测（声明 `['low','high']`、调用方传 `medium`）：

| 腿 | 实发 | 回退了吗 |
| --- | --- | --- |
| anthropic | `output_config: {'effort': 'low'}` | ✅ |
| openai | `reasoning_effort: 'medium'` | ❌ **原样发** |

⚠️ **一句要纠正的话**：上一轮我曾把这里写成"openai 那侧本来就没有可以退的地方"。**那是错的** —— 回退是纯本地操作（"从我声明的集合里挑最接近的一个"），不需要协议提供任何东西。正确说法是"**我们没让它退**"。

### 1.2 ⭐ 记录 ≠ 实发值：**四个情形里三个不等，三个不同原因**

**本对的硬约束（2026-09-20 已定）：记录必须等于实发值。**

先说清三处记录点与构造点的**真实相对位置**（初稿在这里错过）：

| 落点 | 位置 | 与 `create_chat_model` 的关系 |
| --- | --- | --- |
| `logger.info("Create Agent(...) reasoning_effort: %s ...")` | `agents/lead_agent/agent.py:775` | **之前** |
| `config["metadata"]["reasoning_effort"]`（LangSmith 追踪标签） | `agents/lead_agent/agent.py:791` | **之前** |
| `_publish_constitution_snapshot(...)` → `constitution_record.py:394` | `agents/lead_agent/agent.py:**889** / **:997** | **之后**（初稿误写成 `:653`，那是定义行） |
| `create_chat_model(...)` | `agents/lead_agent/agent.py:**874**（引导腿）/ **:980**（正常腿） | — |

四个情形实测（记录值取"解析后、构造前"的那个局部变量，即今天三处记录真正会写的值）：

| 情形 | 成因 | 记录 | 实发 | 相等 |
| --- | --- | --- | --- | --- |
| **A 引导腿漏传** | `agent.py:874` 调工厂时**没传 `reasoning_effort`** | `high` | `low`（条目默认档） | ❌ |
| **B 闸关 + 手写默认档** | `supports_reasoning_effort=false` ⇒ 工厂 `:364` 把两个键一起剔 | `medium` | `None`（**一个档都没发**） | ❌ |
| **C 越界（本对 D1 要治的）** | 档不在声明子集里 | `medium` | `low`（回退后） | ❌ |
| **D 命中** | — | `medium` | `medium` | ✅ |

**三个成因彼此独立**：A 是**调用点漏传参数**、B 是**闸先于翻译剔掉**、C 是**回退改了值**。⇒ **只调一次回退函数治不了 A 和 B**（初稿的 D3 就漏在这里）。

⚠️ **A 与 B 都不是本对引入的**（上一对的翻译落地前它们就存在：那时 A 的记录也是 `high`、实发也是 `low`）。**C 是上一对引入的**。本对既然定了"记录必须等于实发值"，就**三个一起治**。

**A 的可达性**：引导腿是"新建自定义 agent"流程，界面那页**没有任何档位选择面**（写死 `mode:"flash"` + 裸输入框）⇒ 界面上碰不到；但**直接调 API 传 `reasoning_effort` 能碰到**。⇒ 属**潜伏**，不是活跃缺陷，但它是"记录必须等于实发值"这条约束的**反例**，不能留着。

### 1.3 为什么现在要处理：市面在这个问题上是分裂的

同一个问题上，四个实现**选了不同的路**（2026-09-19 一手取证）：

| | 表从哪来 | 越界时 |
| --- | --- | --- |
| **Claude Code**（官方文档） | 官方逐模型表 | **回退**：*"falls back to the highest supported level **at or below** the one you set"* |
| **MiniMax Code**（本机 asar 源码） | 随包 `thinkingLevelMap` | **回退**：`clampThinkingLevel`（先向上找、再向下找） |
| **DeepSeek Harness**（`deepseek-ai/deepseek-harness` 源码） | 随包目录 + adapter 声明 | **抛错**：`UNSUPPORTED_REASONING_EFFORT` |
| **Qoder**（bundle 实测） | **没有表** | **照发**，等上游 400 |

**DSH 是唯一明确反对回退的**，它的设计说明逐字写着：

> **Clamp unsupported levels.** Rejected because a **silent** substitution makes the user's selected control differ from the **logged request intent** and hides stale deployment configuration.

它列了两条指控：**静默**、**记录与意图不符**。⇒ **两条在我们这里都成立**（§1.1 与 §1.2 就是证据）。**所以本对不是"跟随主流"，而是把 DSH 反对的那两条理由消掉** —— 消掉之后我们站在"回退 + 说得清"这一侧，那一侧有 Claude Code 与 MiniMax。

⚠️ **另一条差别要写清**：三家退到的都是**随包的模型目录**（权威事实），我们退到的是**用户手填的声明**（输入）。**我们的表不是权威的** ⇒ 回退可能退到一个端点根本不支持的档。这一层**本对解决不了**（要探测），见 §6。

## 2. 决定

### D1 —— 回退从翻译里**拆出来**，两条腿共用；翻译仍只走 anthropic

⚠️ **不能简单地"去掉家族门"**：`_translate_reasoning_effort` 做的是**翻译**（`reasoning_effort` → `output_config.effort`）。openai 腿的名字**本来就是对的**，去掉家族门会把 `output_config` 也发给 OpenAI —— **那是新造一个错**。

正确形态是**拆成两段**，顺序固定：

```
① 回退（两条腿共用）：把越界的档对「声明子集」取最近的一档
② 翻译（仅 anthropic）：把档名换成该协议的名字（reasoning_effort → output_config.effort）
```

**两条边界沿用既有语义，不新造**：

- **声明子集为空 ⇒ 不回退**（"未声明" = 每个档都可用）。这正是 openai 腿今天的行为。
- **认不出的档名 ⇒ 原样放过**（Codex 分支会写 `"none"`，不是我们四档）。⚠️ **这条必须显式挡住，否则会当场崩** —— 实测：

  ```
  _nearest_declared_effort('minimal', ['low','medium','high'])  -> 'low'
  _nearest_declared_effort('none',    ['low','medium','high'])  -> RAISES KeyError: 'none'
  _nearest_declared_effort('xhigh',   ['low','medium','high'])  -> RAISES KeyError: 'xhigh'
  ```

  根因：`rank[level]` 是**直接下标**（`factory.py:108`），不认的档名直接 `KeyError`。
  **今天不炸**是因为 `_translate_reasoning_effort` 先过了一道 `_ANTHROPIC_EFFORT_NAMES.get(level)`（`"none"` 拿到 `None` ⇒ 提前 `return`）。**回退一旦被提成共用函数、且被工厂在翻译之前调用，这道保护就绕过去了** ⇒ 共用函数**必须自带"只认四档"的前置判断**，不能依赖调用方先筛。

### D2 —— 回退**必须说出来**：发生替换时打一条 warning（**跟着替换发生的那一处走**）

上一对留下的 `_translate_reasoning_effort` **全路径零 `logger` 调用**（已核）。DSH 的第一条指控就是"静默"。

⇒ 当且仅当**真的发生了替换**（请求档 ≠ 实发档）时，打一条 warning，内容三件：**请求的档 / 实际发的档 / 该条目声明的子集**。

⚠️ **只在替换时打**：命中声明子集是常态，每次请求都打会淹掉真正的问题。

⚠️⚠️ **落点必须是 `resolve_effective_effort`，不能是工厂的翻译段** —— 初稿把它写在 `factory.py`，**那样它一次都不会触发**（终审实测）：

```
请求 'medium'，声明子集 ['low','high']
  ① lead_agent 调 resolve_effective_effort  →  'low'    ← 替换发生在这里
  ② 记录写 'low'，并把 'low' 传给工厂
  ③ 工厂再调一次（幂等）→ 收到的是 'low'
  ④ 工厂的判定 `level not in declared` ⇒ 'low' 在子集里 ⇒ False  ⇒ 不打 warning
```

⇒ 工厂**无从知道**这次调用原本是 `'medium'`；再加上 §6 已核"四个非 `lead_agent` 调用方全都不传 effort"⇒ **按初稿的落点，这条 warning 没有任何一条现存路径能打出来**（而"消掉静默替换"正是本对立身的理由之一）。

**定形（甲）**：`resolve_effective_effort` **保持纯的**，把判定结果一起返回：

```python
def resolve_effective_effort(model_config, level) -> tuple[str | None, bool]:
    """返回 (实发档, 是否发生过替换)。纯函数，不打日志。"""
```

**由调用方打日志**。这样：`lead_agent` 那次 `substituted=True` ⇒ **恰好一条** warning；工厂那次 `substituted=False` ⇒ **不重复打**。

### D3 —— ⭐ **把"实发值"算在一个地方**：解析侧算一次、记录它、并传给工厂

**这是"记录必须等于实发值"的落地方式。** 三个成因（A 漏传 / B 闸 / C 回退）都发生在"解析 → 构造"之间，所以**不能靠事后补记录**，只能**把决定提前到记录之前**。

做法：新增一个**纯函数**，把"最终会用哪个档"一次算清：

```
resolve_effective_effort(model_config, level) -> (str | None, bool)
    ① 闸：not model_config.supports_reasoning_effort ⇒ (None, False)
    ② 回退：level 不在声明子集里 ⇒ (最近的声明档, True)
    ③ 否则：(level 原样（含 None）, False)
```

**两个调用点，职责不同**：

| 调用点 | 作用 |
| --- | --- |
| **`lead_agent`（`agent.py` 解析段，`:773` 之后）** | 算一次 + **打 warning（若 `substituted`）** ⇒ **三处记录自动拿到实发值**（logger `:775`、metadata `:791`、constitution `:889`/`:997` **都读同一个局部变量**）⇒ **不需要分别改三处** |
| **工厂（`models/factory.py`）** | 对**不经过 `lead_agent`** 的调用方兜底；**幂等**，且**不重复打 warning**（`substituted` 第二次必为 False） |

**并且必须补 A 那一格**：`agent.py:874`（引导腿）**要把 `reasoning_effort=reasoning_effort` 传给工厂** —— 否则解析侧算得再准，引导腿发出去的仍是条目默认档，记录照样对不上。

**为什么这样就相等**（四格逐一对）：

| 情形 | `resolve_effective_effort` 返回 | 记录 | 工厂收到 | 实发 | warning |
| --- | --- | --- | --- | --- | --- |
| A 引导腿 | `('high', False)` | `high` | `high`（**补传之后**） | `high` ✅ | 0 |
| B 闸关 | `(None, False)` | `None` | `None` | `None` ✅ | 0 |
| C 越界 | `('low', True)` | `low` | `low`（幂等） | `low` ✅ | **1** |
| D 命中 | `('medium', False)` | `medium` | `medium` | `medium` ✅ | 0 |

⚠️ **落点定在 `deerflow/config/model_config.py`**（与 `REASONING_EFFORT_LEVELS`、载入期校验器同文件）：它只吃 `ModelConfig` + 一个档名，是配置语义，放这里两侧都 import 得到且无循环依赖（工厂已经从这个模块 import `REASONING_EFFORT_LEVELS`）。`_nearest_declared_effort` **随之从 `factory.py` 搬过去**（现在带 `_` 前缀、模块私有，`lead_agent` 拿不到）。

### D4 —— "实发值"的**边界**：算到"档位"为止，不算到"协议拼写"（**本对唯一的一处例外，已裁**）

`minimal` 在 anthropic 腿上线上拼写是 `low`（翻译表的产物）。**记录写 `minimal`**，理由：字段语义是"**这一轮用了哪个档**"，不是"协议上那个字节"。若写 `low`，读者拿它去比声明子集 `['minimal']` 会得出"不在子集里" ⇒ 看起来像回退被触发过，**比不写还误导**。

实测：

```
条目声明 ['minimal','low','high']，请求 'minimal'
  记录写   : 'minimal'
  线上实际 : {'effort': 'low'}
  ⇒ 字面相等: False        ← 本对**已知且有意**保留的唯一一处不等
```

⚠️ **这是对"记录必须等于实发值"的一处让步，必须写明白**：约束的**精确表述**是"**记录必须等于这一轮实际采用的档位（我们词汇里的档位）**"，**不含**协议拼写。⇒ 除 `minimal` 这一个档在 anthropic 腿上的拼写外，四格全部严格相等。

⚠️ **要连拼写也逐字一致 ⇒ 加第二个字段**（如 `wire_effort`）：那会动 constitution 的 `SCHEMA_VERSION` 与前端 `types.ts` / `parse.ts`，**成本另算，本对不做**。**本对按"档位相等"处理，并配一条专属用例钉住这个例外**（§4#8），免得将来被当成 bug 修掉。

### D5 —— 不做

- **不做探测**（仍是上一对 spec §6 的那一半；本对不碰网络）。
- **不做"随包模型目录"**：我们已有 8 条 curated 规则（`capability-registry.ts`，给用户省事的**建议**），但那不是权威事实。**建议 ≠ 事实，界面上已经这么标了。**
- **不动预算那一维**（`thinking.budget_tokens`）。
- **不扩我们自己的档位值域**（不加 `xhigh`/`max`）。
- **不动 `supports_reasoning_effort` 那道闸本身**（`:364` 保留）—— 本对只让它**在记录侧也生效**，不改它的行为。
- **不动界面**（§1.2 已核：`reasoning_effort` 在 constitution 里**前端零渲染**，见 §4）。

## 3. 接口契约

| 契约 | 变化 |
| --- | --- |
| 工厂 `create_chat_model` | 内部把回退与翻译拆成两段；**签名不变、返回值不变** |
| 新增 `resolve_effective_effort` | **内部函数，不出 API**；返回 `(实发档, 是否替换)` |
| **两条腿的出网形状** | anthropic **逐字节不变**；**openai 腿在"档位越界"时改变**（从原样发改成回退值），**未越界时逐字节不变** |
| 记录（logger / trace metadata / constitution record） | 字段名与形状**不变**，**值**从"解析值"变成"**实发值（档位层）**"；⚠️ **anthropic 的 `minimal` 一处例外**（D4：记录写 `minimal`、线上是 `low`） |
| `agent.py:874`（引导腿） | **补传 `reasoning_effort`**（今天没传）⇒ 引导腿的行为**会变**（开始尊重请求档） |
| `ModelConfig` / `models_config.json` / `config.yaml` schema | **无新增字段、无新增语义** |
| `GET /api/models`、`PUT /api/models/config` | **无变化** |
| 界面 / i18n | **无变化**（constitution 那个字段前端不渲染） |
| 表 / 迁移 / 默认值 | **无** |

## 4. 验收

> ✅ **12 条全部通过（2026-09-20）**，逐条的实测数字见同名 plan 的 Task 0–3 纪要。**两处与原文有出入、单记在这里**：
> ① **#7 的观测载体落成三件**（桩捕获"传给工厂的值" / `caplog` 捕获 logger / **截 `publish_constitution`** 捕获 constitution）—— 原文写的"去 `test_constitution_record.py` 断言"**测不到 `lead_agent` 传了什么**，只能测记录器本身；`config["metadata"]`（LangSmith 标签）**无便宜观测口**，用"三处读同一个局部变量"收口、**不假装测过**。
> ② **#10 的真栈腿补了对照组**：条目**默认档也是 `low`** ⇒ 只看到"发出 `low`"**无法区分"回退"与"请求层被完全忽略"**；补跑一次子集内的 `high`（线上必须原样是 `high`）才让那一格有区分度。

**后端**

1. **openai 腿现在会回退**（D1 核心）：声明 `['low','high']` + 调用方传 `medium` ⇒ 请求体 **`reasoning_effort == 'low'`**（今天 `'medium'`）。
2. **openai 腿未越界时逐字节不变**（回归）：声明 `['low','medium','high']` + 传 `medium` ⇒ `reasoning_effort == 'medium'` 且**无 `output_config`** —— 既有 `test_openai_effort_is_still_sent_under_its_own_name` **保持绿**，但它的 docstring"byte for byte untouched"**要改**（它只覆盖"未越界"这一半）。
3. **anthropic 腿不变**：声明 `['low','medium','high']` + 传 `medium` ⇒ `output_config: {'effort': 'medium'}`、**无 `reasoning_effort`**（上一对那 5 条用例 —— `test_anthropic_effort_is_sent_as_output_config` / `test_anthropic_minimal_maps_to_the_lowest_level_it_knows` / `test_anthropic_effort_outside_the_declared_subset_falls_back` / `test_anthropic_effort_with_no_declared_subset_is_not_falled_back` / `test_openai_effort_is_still_sent_under_its_own_name` —— **全部保持绿**；直接钉回退的是**第 3、4 两条**）。
4. **两条腿的回退结果一致**：同一份声明、同一个越界输入 ⇒ 两条腿落到**同一个档**（只是名字不同）。
5. **边界**：声明缺省 ⇒ 两条腿都不回退；**Codex 的 `"none"` ⇒ 原样放过**（既有 3 条 Codex 用例 —— `test_codex_provider_disables_reasoning_when_thinking_disabled` / `..._preserves_explicit_reasoning_effort` / `..._defaults_reasoning_effort_to_medium` —— 保持绿，它们的 fixture **没声明子集**）；**`supports_reasoning_effort=false` ⇒ 仍然什么都不发**，且**不产生 warning**。
6. **warning 只在替换时出现，且跟着 `lead_agent` 那一处**（D2 甲）：越界 ⇒ **恰好一条**（含请求档、实发档、声明子集三件），且**不是零条** —— 这一条要**从 `lead_agent` 的路径上打**（`factory.py` 那处按 D2 是打不出来的，见 D2 的推演）；未越界 ⇒ **零**（照 `test_reasoning_effort_on_openai_draws_no_warning` 的 caplog 写法）。**并补一条"工厂单独调用时不重复打"**（`substituted` 第二次必为 False）。
7. **⭐ 记录 == 实发，四格逐一对**（本对第二个核心，§1.2 那张表就是要断言的东西）：A 引导腿 / B 闸关 / C 越界 / D 命中 —— 每格断言 `记录值 == 请求体里的值`。
   ⚠️⚠️ **载体要分三件，别只用一个桩**（`_fake_create_chat_model` 捕获的是**传给工厂的参数**，**不是记录**）：

   | 要证明的 | 载体 |
   | --- | --- |
   | 传给工厂的值 == 请求体里的值 | `test_lead_agent_model_resolution.py` 的 `_fake_create_chat_model` 桩 |
   | **记录（logger）== 那个值** | **`caplog`** 抓 `Create Agent(...) reasoning_effort: %s` 那条 |
   | **记录（constitution）== 那个值** | **`test_constitution_record.py`** 断言 `record["model"]["reasoning_effort"]` |

   ⚠️ `config["metadata"]`（LangSmith 追踪标签）**没有便宜的观测口** ⇒ 用"它读的是同一个局部变量"收口，**不假装测过**。
   ⚠️ **B 格的前提**：`supports_reasoning_effort=false` + 手写默认档，**界面正常路径造不出来**（布尔由"子集非空"推导）⇒ **只能 `config.yaml` 手写或测试里直接构造 `ModelConfig`**；它真实可达（校验器在子集为 `None` 时整段跳过）。
   ⚠️ `test_constitution_record.py` 现有两条断言（`:190` / `:310`）钉的是 `reasoning_effort: None` 的**字面值**，**它们不覆盖回退路径**，所以它们会**保持绿**但**证明不了本对**——新用例要另写，别把"它们还绿"当成证据。
8. **纯函数本身**（`resolve_effective_effort`）：返回**二元组** `(实发档, substituted)`；幂等（对已落子集的档调两次，第二次 `substituted=False`）；闸关返回 `(None, False)`；**`"none"` / `"xhigh"` / `"max"` 原样返回且不抛**（见 D1 那条 KeyError 警告 —— 这是本对最容易写崩的一处，**必须有专属用例**）。
9. **⭐ D4 那一处例外要被钉住，不能当成 bug 修掉**：声明 `['minimal','low','high']` + 请求 `minimal`（anthropic 腿）⇒ **记录写 `minimal`**、**线上是 `output_config: {'effort': 'low'}`** ⇒ 断言这两件事**同时成立**（用例名与注释要写清"这是有意的拼写差异，不是记录不准"）。

**真栈**

10. 用**隔离实例**（仓库外 scratch 根 + `DEER_FLOW_AUTH_DISABLED=1` + 本机 recorder 端点，跑当前工作树代码）跑两条腿：各建一条声明了子集的条目 ⇒ 请求层传一个**越界档** ⇒ 断言 recorder 抓到的请求体是**回退值**（anthropic 在 `output_config.effort`、openai 在 `reasoning_effort`）。**口径照上一对**：**只验请求体形状，不声称模型回话**；写清用的是哪个端点、**未打任何云端点**。
11. 收尾：**零改动他的配置**（写入全落 scratch 根，`models_config.json` md5 与动手前相同）、密钥不落盘（scratch 用现造的假值）、隔离实例与 recorder 停掉、scratch 目录删净。

**门禁**

12. `ruff check` + `ruff format --check` 干净；窄面（`test_model_factory.py` + `test_lead_agent_model_resolution.py` + `test_constitution_record.py` + `test_models_config.py`）绿；**全量后端后台跑**，抽 FAILED/ERROR 的 node id 去 HEAD 跑同一批、**双向 diff**（`xargs -d '\n'`，别 pipe 长跑；两侧同一个 `PYTHONPATH`）。

## 5. 影响面

**后端**

- `backend/packages/harness/deerflow/config/model_config.py`：**新增 `resolve_effective_effort(model_config, level) -> tuple[str | None, bool]`**（闸 + 回退 + **"只认四档"的前置判断**），`_nearest_declared_effort` 从工厂**搬来**（去掉 `_` 前缀或另起公开名）。⚠️ 搬运时**保留 `rank[level]` 的直接下标会留一个 KeyError**（D1）—— 前置判断必须在**进 `_nearest_declared_effort` 之前**。**函数保持纯的（不打日志）**，是否替换由返回值带出去（D2 甲）。
- `backend/packages/harness/deerflow/models/factory.py`：`_translate_reasoning_effort` **拆成两段**（回退共用 / 翻译仅 anthropic）；**家族门保留，只作用在翻译那一段**。⚠️ **这里不加 warning**（D2：加在这里打不出来）。
- `backend/packages/harness/deerflow/agents/lead_agent/agent.py`：
  - `:773` 之后调一次 `resolve_effective_effort` ⇒ **三处记录（`:775` / `:791` / `:889`+`:997`）读同一个变量，自动变准**；**`substituted` 为真时在这里打 warning**；
  - **`:874` 补传 `reasoning_effort=reasoning_effort`**（A 格）。
- `backend/tests/test_model_factory.py`：新增 openai 腿回退 + 纯函数边界 + warning；**改** `test_openai_effort_is_still_sent_under_its_own_name` 的 docstring（行为不变、语义收窄）。
- `backend/tests/test_lead_agent_model_resolution.py`：四格"记录 == 实发"。
- `backend/tests/test_constitution_record.py`：新增（现有两条不覆盖回退，见 §4#7）。

**前端**：**无**。理由要写清：constitution record 的 `reasoning_effort` 前端**只解析、不渲染**（`core/constitution/types.ts:66` / `parse.ts:176`；`constitution-developer-view.tsx:72` 只取 `model.name`）⇒ **改它界面上看不出来**。

**文档**

- `backend/AGENTS.md`：那条"**A level outside the entry's declared subset falls back to the closest declared one**"要改成**两条腿都回退**（今天写的是通用语气，实现只在 anthropic 腿）；并补"**记录的是实发值**"。

## 6. 已知缺口（写在案上）

- **声明仍然不是权威的**：回退退到的是"用户填的子集"，**可能退到一个端点不支持的档**。要真正解决必须探测（上一对 spec §6 已完整登记：`ModelInfo.capabilities.effort`、三种"探不到"、本机五个端点的实测表）。**本对不碰它。**
- **"工厂兜底"对多数调用方是空转**（已核）：`oneshot_llm` / `knowledge/graph/extractor` / `summarization_middleware` / `subagents/executor` **四处都不传 `reasoning_effort`**（grep 各 0 命中）⇒ 工厂走的是条目默认档，而**默认档在载入期保证属于子集** ⇒ 不会越界、回退不发生。⇒ 那句兜底**只在"未来有调用方传越界值"时才有意义**，本对保留它但**不声称它今天在治谁**。
- **`"none"` 与 `"xhigh"/"max"` 仍进不来**：值域不扩（D5），Codex 的哨兵只做"原样放过"。
- **openai 腿的回退仍然"闭眼"**：它读声明子集，但 openai 形状**没有可探的能力块**（`/v1/models` 只给 `id`/`owned_by`）⇒ 即使做了探测，这条腿的"真实可用档"也拿不到。
- **warning 是日志不是界面**：用户仍然不会在界面上看到"你的选择被替换了"。做成界面提示要动 UI 与 i18n，**另立**。
- **D4 的拼写层差异**：记录写 `minimal`、线上是 `low`。要逐字一致得加字段（动 `SCHEMA_VERSION` 与前端），**已按不加处理**。
