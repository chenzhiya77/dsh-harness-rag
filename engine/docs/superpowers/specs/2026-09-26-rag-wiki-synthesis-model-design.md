# RAG 的两个无字段角色：百科生成与考题合成 —— 设计

**Status:** **2026-09-29 已交付**：Task 0–5 全部实施、真栈六条腿与交付回写完成（实施提交 `7d517757` 后端／`7ba229eb` 前端／`9ffae7c3` 模板与文档，真栈验收与交付回写另成一笔文档提交；均未推送）。来源是 [发布前写死项盘点](../../PRE_RELEASE_HARDCODE_INVENTORY.md) 的 **A-7**（wiki 生成没有任何字段能指定模型）与 **A-8**（考题合成同样没有字段，且 `backend/AGENTS.md` 已登记为 open point 却没进任何清单）。这两条是 [2026-09-23 RAG 默认模型那一对](2026-09-23-default-model-design.md) **收窄之后留下的孤儿**：其 spec `:27` 明写「同在 `knowledge/` 下但未通过上述角色选模的其他调用，也不批量接入」，D6 `:106` 把「其他未列 RAG 调用」列为不改造 ⇒ 那一对落地后这两个角色**仍然裸调 `create_chat_model()`**。上游也不会管：它不知道 RAG 有这两个角色。

**2026-09-28 更正与裁定（核对 HEAD `47c35ca0`）**：本文件起草时以「门 A（2026-09-23 那一对）尚未落地」为前提；**门 A 已于 2026-09-27 全部交付**（plan 82/82，`bfed5529` → `305f4fa2`）⇒ `rag.default_model`（`app_config.py:196`；**真名不是本文原写的 `default_model_name`**）与 `knowledge/model_target.py` 已在 HEAD 里，抽取／裁判／图片／视频四条角色链已经接上它。为此分两步改本文件：

- **第一步（事实更正）**：改了八处 —— 本更正段、相关记录、§1 的「本期做／不做」表、D4、§4 第 2 项、§5.2、§6.1、§6.2。
- **第二步（同日裁定 ④＝甲）**：**本对一并接 `rag.default_model`** —— 兜底链写成 `wiki_model → rag.default_model → models[0]`，三个调用点改用既有 `require_usable_rag_target()`（与 `graph/extractor.py:111-125` 的 `get_extract_llm()` 同一形状）。据此又改了七处：D2 的调用点表与其后的说明、D4（改为已裁定）、§4 第 2 项、§5.1、§5.2、§6.1（④ 移出待裁、新增 ⑤）、§6.2。
- **第三步（同日裁定 ③＝乙：惰性化进本对）**：worker 那条腿**不再用启动期建好的实例** —— `_maybe_generate_wiki` 每次触发时自己现解析（照 `get_extract_llm()` 的形状），`app.py` 的 boot 注入与它的静默失败语义一并退场。据此改了六处：D2 的 worker 行与其后的两条说明、**D3 整节重写**、D4 的连带结论①、§4 第 2／3／9 项、§5.1（`knowledge/worker.py` 移进修改面）、§6.1（③ 标已裁）、§6.2。**这是本对唯一与"字段是否声明"无关的行为变化** —— §1 的"逐字节不变"保证据此收窄，见 D3。
- **第四步（2026-09-29 裁定 ①②⑤）**：① 字段名＝**甲**（`wiki_model` / `synthesis_model`）；② **界面不新开卡片** —— 百科那行进既有「图谱抽取」、考题那行进既有「评测裁判」（据此改 D5、§3、§4 第 6 项、§5.1，并把 i18n 由"四键 × 两角色"的写法**重数为六个键**）；⑤ **保存期检查扩到六个字段**（据此改 §1 表、D8、§5.1 的「明确不改」、§4 新增第 10 项，plan Task 1／Task 4 各加一处）。**至此 §6.1 无待裁项。**
- **第五步（2026-09-29，按实码复核十处）**：逐条对 HEAD `4bec69b4` 核过后落的十处 —— 示例文件断言收窄（1）、⑤甲 的落点符号（2）、三处行号漂移与"按符号重读"（3）、`config_version` 按门 A 先例升 40（4）、`_registered_additions` 补记（5）、`AGENTS.md` 实为三处（6）、`main_llm` 只作测试注入的约定（7）、⑤甲 只动 `_reject_unusable_role_targets` 一处（8）、`synthesize_for_docs` 复数（9）、`app.py` 局部 import 同批删（10）。**行号约定：本文行号截至 HEAD `4bec69b4`，实施前按符号重读，不以行号代替。**
- **交付纪要（2026-09-29）**：Task 0–5 全部实施、真栈六条腿已过，逐 Task 的实测数字见 plan。① **③＝乙 的三条取值**（D3 末）已全部落地 —— **不新增开关**（"没有可用模型 ⇒ 本次不生成"的形态自然保留，只是从 boot 一次变每次触发）、**失败沿用既有 `logger.exception`**（不加 `path_status` 键、不加界面状态词）、**boot 段退场**（`app.py` 不再建模型、不再记 `Main model unavailable…`）；② **"不破坏"保证的例外**如实登记为该腿的模型生命周期变化（与字段是否声明无关）：没有可用模型时从"启动期一条一次性日志＋之后静默关闭"变成"每次触发各一条日志"，收益是配置修好即自愈、不用重启（§6.2 首条）；③ 实施期两处更正 —— `MODEL_REFERENCE_FIELDS` 漏项（Task 0 查出，已进 D1）与 D3 片段漏外层 `create_chat_model(...)`（Task 1 惰性用例抓出，已同批修回 D3）；④ **六角色同链复核**（plan Task 5）确认交付后 RAG 六个角色共用 `require_usable_rag_target` 一套解析、一套兜底顺序，§6.2 的「两套兜底」代价项随之兑现消失。

**Plan:** [2026-09-26-rag-wiki-synthesis-model.md](../plans/2026-09-26-rag-wiki-synthesis-model.md)

**相关记录**：

- [发布前写死项盘点](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 1」＝本对；A-7 / A-8 两条的完整证据在那里，本文件不重复盘点，只写改法。
- [RAG 功能模型配置](2026-09-10-rag-functional-model-config-design.md)：`extract_model` / `judge_model` 的「条目选择器」形状是本对**逐字照抄**的模板。
- [2026-09-23 RAG 默认模型](2026-09-23-default-model-design.md)：**门 A**，**已于 2026-09-27 全部交付**（plan 82/82）。本对与它同文件不同语义；顺序问题因此消失（不存在"谁先落地"），碰撞面与随之而来的事实更正见 §5.2。

## 1. 目标与边界

给这两个角色各加一个**模型条目引用字段**，形状与 `rag.extract_model` / `rag.judge_model` 完全一致：可空、空＝沿用今天的行为、界面是一个下拉、后端从被点名的条目里取模型。**默认值全部为 `None`，所以不声明时"用哪个模型"逐字节不变；唯一的例外是 worker 那条腿的模型生命周期（D3，③＝乙），它与字段是否声明无关。**

| 本期做 | 本期不做 |
| --- | --- |
| `rag.wiki_model` / `rag.synthesis_model` 两个字段（YAML + UI 文件两层） | 视觉能力过滤、`A-1` 的字面量默认、`embedding_dimension` |
| 三个调用点接线（wiki 两处、合成一处），**并接上 `rag.default_model`**（D4，2026-09-28 裁定甲） | 改 `knowledge/model_target.py` 本身（只消费它的既有契约） |
| **worker 腿惰性化**：自动生成每次触发时现解析模型，不再用启动期实例（D3，2026-09-28 裁定乙） | 为"自动生成不可用"新增显式开关或其他配置项（沿用现有短路语义，见 D3） |
| 功能模型视图**两行**（分别并入既有「图谱抽取」／「评测裁判」，D5）＋ i18n 六个键 | 为这两个角色新开卡片；改既有卡片标题与卡片 ⓘ |
| 响应 golden、示例文件、模块指南同步；**保存期检查扩到六个字段**（§6.1 ⑤＝甲） | 重跑历史百科的入口（改设置不重写已有条目） |

**为什么值得做**（两条都不是"整齐"，是真实危害）：

- **A-7**：百科条目是**用户直接阅读的内容**，今天用哪个模型写它由 `models[0]` 决定 —— 也就是聊天主模型。运维想换一个便宜/稳定的模型写百科，**没有任何位置可以表达**。更糟的是 `app/gateway/app.py:351` 在**启动期**建这个模型，失败就 `except → None →` 整条自动生成关掉（日志 `Main model unavailable; wiki auto-generation disabled`）：一个与百科无关的主模型配置问题会静默关掉百科自动生成。**（据 D3 ③＝乙，本对把这段启动期建模型与它的 `except` 一起删掉；上面描述的是改前的事实。）**
- **A-8**：合成出来的题目会进**候选题暂存**，被采纳后写入 golden bank，而 golden bank 是 CI 门 `.github/workflows/rag-eval.yml` 的判据基线。**出题的模型没有任何配置通路**，等于让一个没人选过的模型去产出衡量检索质量的标尺。

## 2. 决定

### D1 —— 两个字段，照抄既有形状

在 `RagConfig`（`config/app_config.py`）与 `RagConfigFile`（`config/rag_config_file.py`）**两层**各声明：

```python
wiki_model: str | None = Field(default=None, description="Name of the config `models:` entry used to write wiki entries; None uses the first configured model.")
synthesis_model: str | None = Field(default=None, description="Name of the config `models:` entry used to synthesize eval questions; None uses the first configured model.")
```

描述句式照现有邻居写（**按各自那一层的邻居，不跨层**）：`RagConfig` 的 `extract_model`（实测 `:194`，本文原写 `:199` 已漂）结尾就是 `None uses the first configured model.`；而 `RagConfigFile` 同名字段（`:130`）只写 `used for graph extraction.`，它的 `judge_model`（`:131`）结尾是 `None uses the config primary model.` —— **两层今天就不一样**，所以"逐字对齐"以上面给的这段为准（把兜底语义写在字段上，别留给读者去翻工厂）。两层都要声明：只声明 YAML 层，字段就进不了 API 可写文件；只声明 UI 层，`config.yaml` 就表达不了它。

**必须同时进 `MODEL_REFERENCE_FIELDS`**（Task 0 本轮查出的漏项）：`rag_config_file.py:74` 的 `MODEL_REFERENCE_FIELDS = ("default_model", "extract_model", "judge_model", "vlm_model")` 是门 A 建的**共享空白归一 validator**（`:152` 的 `@field_validator(*MODEL_REFERENCE_FIELDS, mode="before")`）。两个新字段不进这个元组，存进文件的 `"wiki_model": "   "` 就**不会被归一成 `None`**，会以"声明了一个空白名字"的身份活到运行期（`_prune_empty()` 只吃 `""`，**纯空白是 validator 的活** —— 门 A Task 1 的 neuter 7 正是这条）⇒ 该元组由四个扩到六个。

**不新造机制**：加载链沿用 `rag_config.json → RagConfigFile → merge_rag_config → AppConfig.rag`，字段级合并、`extra="forbid"`、掩码、原子写、锁与热加载全部不动。

### D2 —— 三个调用点，缺一个就造出新的假旋钮

| 角色 | 调用点 | 现状 | 改成（2026-09-28 起按 D4 接默认链） | 生效时机 |
| --- | --- | --- | --- | --- |
| 百科（手动／逐条重生成） | `knowledge/wiki/generator.py:208-212` `_default_llm()` | `create_chat_model()` | `create_chat_model(require_usable_rag_target(config, config.rag.wiki_model, role="百科生成"), app_config=config)`，其中 `config = get_app_config()` | **每次调用**读配置 ⇒ 热加载生效 |
| 百科（worker 自动生成） | `knowledge/worker.py:831-850` `_maybe_generate_wiki`（`app.py:351` 的 boot 实例与它那条 `except` 退场，见 D3） | `create_chat_model()` | **同一句**，`config = get_app_config()`、`role="百科生成"` | **每次触发**读配置 ⇒ 热加载生效（与手动腿一致） |
| 考题合成 | `knowledge/eval/synthesis.py:139-143` `_default_llm_factory()`（生产调用点是 `knowledge_service.py:1562` 的 **`synthesize_for_docs`——复数**，它不传 `llm_factory` ⇒ 恒走默认工厂） | `create_chat_model()` | **同一句**，`role="考题合成"` | **每次合成**调用一次工厂（`:332-333` 的 `factory = llm_factory or _default_llm_factory`）⇒ 热加载生效 |

**两条 wiki 腿必须同批改**。只改 `generator.py`（手动腿）会让「设了 `rag.wiki_model`」对 worker 的自动生成无效 —— 那正是一个只对一条腿生效的假旋钮（盘点档 §3.1 判为最危险的一类）；反过来只改 worker 腿，手动生成与逐条重生成就不认这个字段。本对取"**两条腿走同一条路**"：每次现取配置 → 经 `require_usable_rag_target()` → 把明确名字交给工厂。

三条腿都**照抄 `graph/extractor.py:111-125` 的 `get_extract_llm()`**（函数内 import、每次取当前配置、经 `require_usable_rag_target()` 解析出**明确名字**再交给未修改的 `create_chat_model(..., app_config=config)`）。不改 `models/factory.py`，不改 `create_chat_model(name=None)` 的行为；`knowledge/model_target.py` 一行不改（只消费它的 `require_usable_rag_target` —— 门 A 交付时它已是四个角色的公共入口）。

### D3 —— worker 那条腿：惰性化，与手动腿同一条路（2026-09-28 裁定乙）

**先纠正本节原写的事实**：行号已变（HEAD `47c35ca0` 上 `_maybe_generate_wiki` 在 `worker.py:831-850`；`_main_llm` 存于 `:204`、读于 `:833`、传给 `generate_wiki` 于 `:845`），而且本节原写的"明确不做"**现在反过来做了** —— 2026-09-28 裁定 ③＝乙。

**改法（最小面）**：`_maybe_generate_wiki` 不再依赖构造时注入的实例，改成

```python
config = get_app_config()
llm = self._main_llm or create_chat_model(require_usable_rag_target(config, config.rag.wiki_model, role="百科生成"), app_config=config)
```

（函数内 import，与另两条腿同一形状。⚠ **2026-09-29 实施期更正**：本节原来只写到 `require_usable_rag_target(...)` 就结束 —— 那返回的是**条目名字符串**，而 `generate_wiki(llm=…)` 要的是模型对象（它调 `llm.ainvoke`）。必须像另两条腿一样外面套 `create_chat_model(...)`；这个缺口是 Task 1 的惰性用例抓出来的，已同批修回本段与 plan。）**构造参数 `main_llm` 保留作测试注入口**：生产路径不再传它 —— `app.py:350-354` 的 boot 建模型与它那条 `except` 一并退场，`:355` 的 `main_llm=` 实参连带 `:347` 那行局部 `create_chat_model` import 同批删掉（否则留一个未使用 import，ruff 红）—— 于是 4 个既有测试调用点（`test_worker.py:503/568`、`test_e2e_smoke.py:116`、`test_phase2_smoke.py:98`）**不用改**，仍可用假 LLM 驱动 wiki 生成。**约定：这个参数只给测试用** —— `llm = self._main_llm or …` 是短路，生产里任何**新增**调用点若传了它，就会静默绕过 `wiki_model` → RAG 默认整条链（不报错、不 warning），所以生产调用点一律不得传。

| | 改前（今天） | 改后（本对） |
| --- | --- | --- |
| 取模型的时刻 | `app.py:351` 在**启动时**建一次，实例被 worker 持有（`worker.py:204`），之后每次自动生成都复用它 | **每次 `_maybe_generate_wiki` 现解析** |
| 改了设置之后 | 手动腿即时生效，自动腿等到重启 | **两条腿都即时生效**（不对称消失） |
| 没有可用模型时 | boot 那句抛错 ⇒ `app.py:352-354` 记一条 exception、`main_llm` 置 `None`；`worker.py:833` 见 `None` 就**静默跳过**（这个进程整条自动生成不发生，直到重启） | 每次触发时解析失败 ⇒ 落进**既有**的 `except Exception`（`worker.py:849-850`）记一条 `wiki generation trigger failed for kb …`；本次不生成，文档照样 `ready` |
| 配置修好之后 | 要重启才恢复 | **下一次触发即自愈** |

**三条随之而来的取值（本对新定，可撤）**：

1. **不新增开关**：今天"没有模型 ⇒ 自动生成不发生"是一个**隐性**总开关（靠 boot 失败 ＋ `main_llm=None` 实现）。改后它自然保留（解析失败 ⇒ 本次不生成），形态从"boot 一次、之后静默"变成"每次触发、每次记一条日志"；不为此新增配置项。
2. **失败呈现沿用既有机制**：只走 `worker.py:849-850` 的 `logger.exception`，不加 `path_status` 键、不加界面状态词 —— 配置错不是文档的产物质量问题。
3. **boot 那段退场，代价如实登记**：`app.py` 的 boot 段（实测 `:347` 局部 import、`:350-354` try/except、`:355` 的 `main_llm=` 实参）不再建模型、不再记 `Main model unavailable; wiki auto-generation disabled`；代价是"这个进程有没有自动生成能力"不再是启动期已知事实（见 §6.2）。

### D4 —— 兜底语义：接 `rag.default_model`（2026-09-28 裁定甲）

本对的解析是 **`rag.wiki_model → rag.default_model → config.models[0]`**（`synthesis_model` 同）—— 与门 A 交付后四个既有角色（图谱抽取／评测裁判／图片配文／视频配文）**完全同一条链、同一个 helper**：三个调用点改用 `require_usable_rag_target(config, config.rag.<角色字段>, role=…)`，形状逐字照抄 `graph/extractor.py:111-125` 的 `get_extract_llm()`。RAG 六个角色因此只有一套兜底语义，不存在"四个走 RAG 默认、两个走首项"的第二套；用户在功能模型视图里设的「RAG 默认模型」对这两行同样有效。

**契约（`knowledge/model_target.py` 的既有行为，本对只消费、不修改）**：

| 输入 | 结果 |
| --- | --- |
| 角色字段非空（`wiki_model` 有值） | **原样返回**，不被 RAG 默认替换；指向不存在的条目 ⇒ 仍由工厂抛普通 `ValueError("Model <名称> not found in config")`（D8 不变） |
| 角色字段空 ＋ `rag.default_model` 有效 | RAG 默认 |
| 角色字段空 ＋ `rag.default_model` 指不到条目 | **warning 点名 ＋ 回落首项**（`RAG default model %r is not a configured model; using the first configured model %r instead.`）—— 只有默认字段自己失效才回落 |
| 角色字段空 ＋ 无 RAG 默认 | `models[0]` ⇒ **与今天逐字节相同**（本对"默认不声明就不变"的保证仍在） |
| 一个模型条目都没有 | `RagConfigurationError`（`require_rag_model_name` 的缺模型错误）；今天是裸 `create_chat_model()` 在工厂里索引空列表 |
| 角色字段非空、且指向 **UI 来源 × 协议格** 里缺钥匙／缺地址的条目 | `RagConfigurationError`（与四个既有角色同一道运行期检查，D10.1 的既有语义） |

**两条连带结论**：① worker 那条腿**也从启动快照改成每次现解析**（D3，③＝乙）⇒ 六个角色的模型生命周期与兜底链都统一了；② **保存期检查的字段数**要不要从四个扩到六个，是本对唯一新开的岔口，见 §6.1 **⑤**。

### D5 —— 界面：两行分别并入既有分组（2026-09-29 裁定 ②）

功能模型视图的既有约定是**一张卡片装一个角色**（`functional-models-view.tsx:1281` `groupExtraction`「图谱抽取」只装 `extract_model`、`:1311` `groupEvaluation`「评测裁判」只装 `judge_model`）。**裁定 ②：不新开卡片** —— 两行分别追加到这两张既有卡片里：

| 卡片（标题与卡片 ⓘ 都不动） | 既有行 | 新增行 |
| --- | --- | --- |
| 「图谱抽取」 | 图谱抽取模型 | **百科生成模型** |
| 「评测裁判」 | 裁判模型 | **考题合成模型** |

- **行形状逐字照抄既有行**（`:1282-1308` 的 `ROW` + `RowLabel` + `Select`）：`Select` 值为 `values.x || MODEL_REFERENCE_NONE`、`onValueChange` 把哨兵换回 `""`、候选用 `modelReferenceOptions(models, values.x, F.xNone)`。新增行把自己的解释放在**行内**（`RowLabel info={F.wikiModelHint}`），因为卡片 ⓘ 已经是 `extractModelHint` / `groupEvaluationHint`（已发布文案，本对不动）。
- **候选用 `modelReferenceOptions`，不是 `visionReferenceOptions`**：这两个角色是纯文本生成，不做视觉能力过滤（与 `extract_model` / `judge_model` 一致；只有 caption 那一行才过滤）。
- **界面词汇复用页面已有的词**：wiki 在本产品界面里一律叫**「百科」**（`zh-CN.ts:523`/`:596`/`:851` `wiki: "百科"`、`:478`「百科生成任务已提交」），合成一律叫**「考题」/「合成」**（`:457` `generateQuestion: "生成考题"`、`:717`「或从文档合成候选题」）。⇒ **行标签取「百科生成模型」「考题合成模型」**，不引入「wiki」「synthesis」这类英文概念词。
- **i18n 六个 key × 三文件 ＝ 18 处**（`types.ts` / `zh-CN.ts` / `en-US.ts`）：`wikiModel` / `wikiModelNone` / `wikiModelHint` ＋ `synthesisModel` / `synthesisModelNone` / `synthesisModelHint`。**不再需要 `groupWiki` / `groupSynthesis`**（② 的直接结果）。⚠ 本节原写的"四处 × 三文件共 12 个 key"与它自己列出的八个键不符（8 × 3 ＝ 24）；已按 ② 之后的实况**重数为 18**，实施时以本表为准。空选项文案**逐字沿用** 2026-09-17 统一后的口径：`（使用配置默认）` / `(use the configured default)`（实测 2026-09-29：`zh-CN.ts:1762`/`1771`/`1775`/`1777`、`en-US.ts:1856`/`1864`/`1868` 已是这个值 —— 本文原写 `:1736`/`:1830` **已漂**，实施时按字符串搜、不按行号）。
- `wikiModelHint` **不再写"要重启"**（③＝乙，两条腿都即时生效，不对称已消失）：只写继承口径 —— 留空先撤掉本行的覆盖、配置里为它指定的值仍然生效、两边都空才由 RAG 默认接手。**不要**再写"自动生成那条腿在启动时定模型"——那是改前的事实（D3）。
- **已知取舍（② 的直接代价，登记不改）**：卡片标题（「图谱抽取」「评测裁判」）与新行不完全同名 —— 百科生成不是图谱抽取、考题合成不是裁判。改名要动已发布文案，本对不做；若日后要改，连同卡片 ⓘ 一并评估。

### D6 —— 后端响应是反射的，golden 必须同批

`routers/rag_config.py:206-222` 的 `_build_response` **遍历 `RagConfigFile.model_fields`** ⇒ 在 `RagConfigFile` 声明字段的**同一个提交**里，GET／PUT 响应的 `config` 与 `sources` 就会各多两键，**不需要改 router**。

⇒ `backend/tests/fixtures/rag_config/response_golden.json` 必须同批更新，否则中途全量门禁会红：

| golden 位置 | 现在（2026-09-28 实测 HEAD `47c35ca0`） | 改后 |
| --- | --- | --- |
| `get.config` | **24 键** | **26 键** |
| `get.sources` | **25 键** | **27 键** |
| `put.response.config` / `put.response.sources` | 同上 | 各多两键 |
| `put.payload` | 12 键 | **不变**（本对不改那个 PUT 载荷） |

⚠ 本表原写「25 → 27」「27 → 29」，那是**门 A 交付前**的数：门 A 的 Task 1 加了 `default_model`、Task 9 删了三个 VLM 键，实测已是 24／25。实施当天再重数一次为准。

新字段的 `sources` 值按既有规则：不在 `written` 里 ⇒ `config_file`。

**别忘 `_registered_additions`**：那份 fixture 里有一段记录字符串。门 A 的 R19 就在里面记了"这两个键是**嵌套**新键、`_ADDED_FIELDS` 白名单只管**顶层**响应键、所以嵌套新键必须登记于此，否则守卫会在每个无关字段上误报"。本对的两个键同为嵌套（`config.wiki_model` / `sources.wiki_model`）⇒ 同批补一句（不补不会红，但下一任实施者会少一条线索）。

### D7 —— 前端有四个触点，漏一个就复刻 `embedding_dimension` 那个缺陷

盘点档 B-1 第四轮查出的缺陷是：`embedding_dimension` 在 `RagConfigFile` 里，但**不在 `config-form.ts` 的任何字段清单里**，而 PUT 是整对象替换 ⇒ 任何一次保存都会把它从 `rag_config.json` 删掉。**本对的两个新字段绝不能重演**：

| 触点 | 位置 | 现状参照 |
| --- | --- | --- |
| wire 类型 | `core/rag/types.ts` 的 `RagConfigValues`（`:26`/`:27` 旁） | `extract_model?: string \| null;`（`RagConfigInput = RagConfigValues`，`:110`，只此一处） |
| 表单值类型 | `core/rag/config-form.ts:38`/`:39` | `extract_model: string;` |
| 带回清单 | `config-form.ts` 的 `TEXT_FIELDS`（`:106`/`:107`） | `"extract_model", "judge_model"` |
| 读取映射 | `config-form.ts` 的 `formValuesFromConfig()`（`:153`/`:154`） | `extract_model: asText(config.extract_model)` —— **读取侧是显式逐字段映射、不是清单循环**，漏改不会报错，只会让字段永远显示为空 |

`TEXT_FIELDS` 那一项是**功能性的**，不是整齐问题：`buildRagConfigInput()`（`:201-214`）靠它把「文件自己已有的覆盖」带回下一次 PUT。不进清单 ⇒ 保存即丢。

### D8 —— 校验：运行期沿用工厂，保存期并入既有检查（⑤＝甲）

声明一个**不存在**的条目名时，运行期行为沿用 `create_chat_model(name)` 今天的语义（`ValueError: Model <name> not found in config`）：wiki worker 那条腿落 `worker.py:849-850` 的 `logger.exception`（每次触发一条，本次不生成，文档仍 `ready`；D3），wiki 手动腿在点按钮时当次报错，合成那条腿会让 `POST …/synthesize` 的任务失败。

**保存期（2026-09-29 裁定 ⑤＝甲）**：这两个字段**并入门 A 的 D10.1 那道既有检查** —— `RagConfigurationError` + 400 + 共享文案，字段表由四个扩到六个（`default_model` / `extract_model` / `judge_model` / `vlm_model` / `wiki_model` / `synthesis_model`）。**落点只有一处**：`app/gateway/routers/rag_config.py:316` 的 `_reject_unusable_role_targets` —— 把 `:332` 那行硬编码元组 `("default_model", "extract_model", "judge_model", "vlm_model")` 加两个字，并把它 docstring 里的 "the RAG default and the **three** role fields" 改成五个。**同文件的 `_reject_unusable_after_save` 不用动**（它构造的是三条管道腿，不看角色字段）。于是：

- **显式声明的目标不可用**（指向不存在的条目 ⇒ `Model <名称> not found in config`；指向 UI 来源 × 协议格里缺钥匙／缺地址的条目 ⇒ 缺项原因）⇒ **保存当场 400**，前缀仍是 `提交后的配置仍不可用：`，文件字节不变。
- **兜底出来的目标不检查**（门 A 的 R2 规则不变）⇒ 这两个字段留空的部署**不会**因此多出任何拒绝；"默认不声明就不变"的保证不受影响。
- 实现落点是 `backend/app/gateway/routers/rag_config.py` 的角色字段表 —— 本对**因此不再"不改 router"**（§5.1 已改口）；不新造机制，沿用同一套异常与文案。
- `wikiModelHint` / `synthesisModelHint` 仍**不承诺**保存期检查：提示只讲"留空时怎么继承"，不在那里枚举校验行为。

## 3. 接口与实施归属

| 接口／对象 | 本期契约 |
| --- | --- |
| `RagConfig.wiki_model` / `.synthesis_model` | `str \| None`，默认 `None`；YAML 层 |
| `RagConfigFile.wiki_model` / `.synthesis_model` | 同上；UI 层，声明即自动进 GET／PUT 响应与 `sources` |
| `generator._default_llm()` / `worker.py::_maybe_generate_wiki` / `synthesis._default_llm_factory()` | 三处改为读字段（worker 那处同时惰性化，D3）；`generator`／`synthesis` 的签名与返回类型不变，`worker` 的 `main_llm` 构造参数保留作测试注入口 |
| `RagConfigValues` / `RagConfigFormValues` / `TEXT_FIELDS` / `formValuesFromConfig` | 前端四个触点，见 D7 |
| `functional-models-view.tsx` | 两行并入既有分组（D5），沿用既有保存按钮与 mutation |
| `response_golden.json` | 与后端字段同一个提交更新，见 D6 |
| 公共模型 API、模型管理 API、`models/factory.py`、`config/models_config.py` | **不新增字段、不改形状、不改默认行为** |

## 4. 验收清单

1. **加载链**：无 RAG 文件／旧文件／空字段均可加载；临时 YAML 的 `rag.wiki_model=A` 与临时 JSON 的 `B` 经**真实加载**得到 `B`，撤销 UI 覆盖得到 `A`，两者都无则 `None`。不靠直接构造 `AppConfig(...)` 代替。
2. **三个调用点**：wiki 手动生成、wiki worker 自动生成、考题合成，各覆盖「声明了 ⇒ 真的用那个条目」与「未声明 ⇒ 落到兜底」。**正向与负向必须配对**，不能只写「没有发生变化」的空洞断言。按 D4 的链逐层钉：① 声明 `X` ⇒ 拿到 `X`（不被 RAG 默认替换）；② 角色为空、`rag.default_model` 指到有效条目 ⇒ **这三条腿跟着换**（与抽取／裁判同链的正向证据）；③ 角色与默认都为空 ⇒ `models[0]`（与今天逐字节相同）；④ 默认指不到条目 ⇒ **回落首项 ＋ 一条点名 warning**（不是报错）；⑤ 一个模型条目都没有 ⇒ `RagConfigurationError`（不把 `None` 交给工厂）。**worker 腿与手动腿逐字同链**（同一次 `require_usable_rag_target` 调用形状、同一份 `get_app_config()`），且代码里**不再有任何读启动期快照的地方**。
3. **worker 腿的惰性语义（③＝乙）**：改 `rag.wiki_model` 后**不重启**，下一次自动生成即用新目标；解析失败落既有 `except`（`worker.py:849-850`）、本次不生成、文档仍 `ready`、不新增 `path_status` 键；配置修好后**下一次触发即自愈**。另断言 `main_llm` 注入口仍然有效（4 个既有测试调用点不改），且 `app.py` 不再建模型、不再有那条 `Main model unavailable…`。
4. **响应形状**：GET／PUT 的 `config` 与 `sources` **仅**各多两键，其余逐字不变；`put.payload` 不变。以 Task 0 捕获的 golden 为基线做双向差集。
5. **保存不丢字段（沿用 B-1 那条守卫的形状）**：`rag_config.json` 里已有 `wiki_model` 覆盖时，编辑任一**无关**字段再保存，该覆盖仍在文件里。这条用例同时钉住 D7 的 `TEXT_FIELDS` 触点 —— 把它从清单里去掉，用例必须转红。**先例说明（Task 0 实测）**：`embedding_dimension` 的"保存即丢"缺陷**已被别的会话修好**（`config-form.ts:124` 的 `NUMERIC_FIELDS` 专类会带出文件覆盖、清空写 `null` 撤销；`formValuesFromConfig:167` 读它、`hasFormChanges` 覆盖它）⇒ 本条是"沿用一条**已闭合**缺陷的守卫形状"，不是"复刻一个还活着的缺陷"。
6. **界面**：这两行**只**出现在功能模型视图，且分别在既有「图谱抽取」「评测裁判」卡片内（D5）；对话模型视图与设置总标题没有。选值不发 PUT，点既有保存才写；重开读回、清空、无模型、无权限、保存中、保存失败均沿用既有表单处理。i18n 三文件**六个键**齐全（D5），`pnpm check` 零诊断。
7. **非 RAG 隔离**：普通聊天、知识库聊天主模型、摘要、记忆、标题、goal、追问建议、子代理的选模**不变**；`extract_model` / `judge_model` / `vlm_model` / `video.caption_model` 的解析**不变**；embedding／sparse／rerank／parse／ASR **不变**。
8. **不增加出网**：改选／保存这两个字段不新增探针、SDK 构造或鉴权请求；已有 embedding 保存探针仍只按自身签名触发（`_embedding_signature` 不含这两个字段）。用计数桩证明，不只靠源码推断。
9. **门禁**：后端 ruff 双净、RAG 窄面与全量零新增失败；前端 `check`、`config-form` / `functional-models` 窄面与全量通过。真栈验两条腿（手动生成即时生效、**自动生成改完即生效——不重启**）与聊天隔离。
10. **保存期检查扩到六个字段（§6.1 ⑤＝甲，列在末尾只为不重排既有编号引用；它在本对 Task 1 落地）**：提交一个不存在的 `wiki_model` / `synthesis_model` ⇒ **400**、detail 以 `提交后的配置仍不可用：` 开头、`rag_config.json` 字节不变；提交一个合法值 ⇒ 200（正向对照）。四个既有字段的行为不变；兜底出来的目标仍不检查（留空部署不受影响）。

## 5. 文件影响

### 5.1 本期修改面

| 文件 | 修改 |
| --- | --- |
| `backend/packages/harness/deerflow/config/app_config.py` | `RagConfig` 加两字段（`:199`/`:200` 旁） |
| `backend/packages/harness/deerflow/config/rag_config_file.py` | `RagConfigFile` 加两字段 |
| `backend/packages/harness/deerflow/knowledge/wiki/generator.py` | `_default_llm()` 读字段 |
| `backend/packages/harness/deerflow/knowledge/worker.py` | `_maybe_generate_wiki` 每次现解析（D3）；**`main_llm` 构造参数保留作测试注入口** |
| `backend/app/gateway/app.py` | 删掉 boot 段：`:347` 局部 import ＋ `:350-354` 建模型与它那条 `except` ＋ `:355` 的 `main_llm=` 实参（D3） |
| `backend/packages/harness/deerflow/knowledge/eval/synthesis.py` | `_default_llm_factory()` 读字段 |
| `backend/tests/fixtures/rag_config/response_golden.json` | 与字段同批（D6） |
| `backend/tests/test_rag_config*.py`、`tests/knowledge/…`、`tests/knowledge/eval/test_synthesis.py` | 加载链、三调用点（含 `test_worker.py` 的惰性断言）、形状、保存不丢；**4 个既有 `main_llm=` 调用点不改** |
| `backend/app/gateway/routers/rag_config.py` | **只改一处**：`_reject_unusable_role_targets`（`:316`）的字段元组 `:332` 由四个扩到六个 ＋ 它 docstring 的 "three role fields"（§6.1 ⑤＝甲，D8）；响应侧仍反射、不另改 |
| `frontend/src/core/rag/types.ts`、`config-form.ts` | D7 的四个触点 |
| `frontend/src/components/workspace/settings/functional-models-view.tsx` | 两行并入既有分组（D5） |
| `frontend/src/core/i18n/locales/{types,zh-CN,en-US}.ts` | 六个 key × 三文件 ＝ 18 处（D5） |
| `frontend/tests/unit/rag/config-form.test.ts`、`unit/settings/functional-models.dom.test.tsx` | 表单契约与界面结构 |
| `rag_config.example.json`、`config.example.yaml` 的 rag 段、`backend/AGENTS.md` | 见 §5.3 |

**明确不改**：`models/factory.py`、`config/models_config.py`、`routers/models.py`、`core/settings` 偏好系统、模型 add/edit 弹窗、聊天侧任何选模逻辑，以及 `knowledge/model_target.py`（**只消费**它的 `require_usable_rag_target()`，不改它）。**`knowledge/worker.py` 与 `app/gateway/app.py` 不在"不改"之列**（③＝乙，见 D3）；**`routers/rag_config.py` 也不在**（⑤＝甲，只扩那张角色字段表，响应仍是反射的，见 D6／D8）。

### 5.2 与门 A（2026-09-23 那一对）的碰撞面

两对都要改：`config/app_config.py`（`RagConfig`）、`config/rag_config_file.py`、`core/rag/types.ts`、`core/rag/config-form.ts`（`TEXT_FIELDS` 与 `formValuesFromConfig`）、`functional-models-view.tsx`、三个 locale 文件、`response_golden.json`、`test_rag_config_api.py`、`rag_config.example.json`、`config.example.yaml` 的 rag 段。

**全部是加法、无语义冲突**。**顺序问题已消失**：门 A 已于 2026-09-27 全部交付，本对是**在它之上**再加两个字段，不存在"谁先落地"。据此原写的两句已重写：① 「建议本对先落地（那一对状态是「暂不开工」）」⇒ 那一对已交付，「先落地」不再成立；② 「门 A 落地时按 D4 把这两个角色接进 `resolve_rag_model_name`」⇒ **已随 §6.1 ④ 选甲并入本对**（接线是 Task 1 的一部分，不再是"届时"的跟进项）。

**落地时的两条要求**：① 本对要 rebase 到已交付的门 A 之上，按其现有 golden 重算增量（那份 golden 已含 `default_model`、已删三个 VLM 键，见 D6）；② 不再需要"在那一对的 plan Task 1／Task 3 补一句" —— 那两份文档已交付冻结，按惯例不回改。

### 5.3 示例与文档

- `rag_config.example.json`：加 `"wiki_model": ""` 与 `"synthesis_model": ""`（空串＝不覆盖，与既有 `"judge_model": ""` 同形），**紧跟在既有 `default_model` 之后**（现键序：`… judge_model` → `default_model` → `mineru_api_token`）。**"空串/中性"只约束这两个新键** —— 该文件里 `embedding_model` / `rerank_model` / `extract_model` 三处**今天就是真实在用名**（实测 2026-09-29），换掉它们属盘点档 **C-2**，不在本对；用一句"整个文件不含真实模型名"去钉它必红。
- `config.example.yaml`：在 `# judge_model:`（实测 **`:2587`**，本文原写 `:2590` 已漂）附近加两行注释掉的示例，值用中性占位；**`config_version` 按门 A 先例升一位**（38 → 39 就是加 `default_model` 时做的）⇒ 本对应为 **40**（现为 39）。
- `backend/AGENTS.md`：**三处同批，不是一处** —— ① "RAG Functional-Model Configuration" 段的角色清单（`:685` 附近）② "**RAG model targets**" 段（`:725` 附近；它今天只写四个角色 `extract_model` / `judge_model` / `vlm_model` + `default_model`，本对之后是六个，不改会与 ③④ 后的实况自相矛盾）③ 撤掉 A-8 那条 open point（`:1273`，「no dedicated config knob (spec §10 open point 1, deferred)」）——本对交付后它不再是待办。
- 盘点档：A-7 / A-8 两条标为已交付，§4.2「对 1」勾掉，计数随之调整。

## 6. 待裁与已知代价

### 6.1 待裁与已裁

**无待裁项**：① ② ③ ④ ⑤ 五项全部已裁（①＝甲；②＝用户裁定"两行分别进既有「图谱抽取」「评测裁判」"；③＝乙；④＝甲；⑤＝甲）。本对**已于 2026-09-29 交付**（交付纪要见本文件开头）。
**已裁记录**：③ 落进 D3（三条随之而来的取值见 D3 末）、④ 落进 D4、① 落进 D1、② 落进 D5、⑤ 落进 D8。下表保留五行只为留痕。

| # | 在问什么 | 选项 | 推荐与理由 | 选错后果 |
| --- | --- | --- | --- | --- |
| **①** ✅ **已裁（2026-09-29，甲）** | 字段名 | ~~甲 `wiki_model` / `synthesis_model`；乙 `wiki_generation_model` / `question_synthesis_model`~~ | **已裁甲** —— 与 `extract_model` / `judge_model` / `vlm_model` 同长同形，且已核实这几个词在全仓零占用 | 乙的"自解释"不值得打破既有命名节奏；改名成本全在实施期（进 schema／前端／i18n／示例／golden），落地后再改要动退役机制 |
| **②** ✅ **已裁（2026-09-29，用户裁定：两行分别进既有「图谱抽取」「评测裁判」）** | 界面分组 | ~~甲 两个新 `Group`；乙 塞进既有 `groupEvaluation`~~ | **已裁（不是原推荐甲）** —— 不新开卡片：百科那行进既有「图谱抽取」、考题那行进既有「评测裁判」，两行各带自己的行内 ⓘ（D5）；i18n 因此由"含两个 `group*` 的八个键"缩为**六个键** | 取"少两张卡片、两两同域"的读法；登记的直接代价是**卡片标题与新行不完全同名**（D5 末条）—— 改名要动已发布文案，本对不做 |
| **③** ✅ **已裁（2026-09-28，乙）** | D3 的不对称怎么处理 | ~~甲 登记 + 写进 `wikiModelHint`；乙 本对顺手把 worker 的 boot 注入改成惰性~~ | **已裁乙** —— 用户取"改了就该生效"：两条腿都即时生效，不对称消失；三条随之而来的取值（不新增开关／失败沿用既有 `logger.exception`／boot 段退场）见 D3 | 代价是"没有可用模型"从启动期一条一次性的日志变成每次触发各一条，且不再有"这个进程没有自动生成能力"的启动期事实（§6.2）；收益是配置修好即自愈、不用重启 |
| **④** ✅ **已裁（2026-09-28，甲）** | 要不要一并接 `rag.default_model` | ~~甲 接线；乙 不接，保持 `wiki_model → models[0]`~~ | **已裁甲** —— 门 A 已交付、helper 就在手边、四个既有角色都已接；选乙会让同一张功能模型视图里出现两套兜底 | 选乙会把两套兜底留成缺陷（"为什么设了默认还是走第一个"）；甲已落地，代价见 D4 与 §6.2 |
| **⑤** ✅ **已裁（2026-09-29，甲）** | 保存期检查要不要从四个字段扩到六个 | ~~甲 扩；乙 不扩，这两个字段的错误只在运行期出现~~ | **已裁甲** —— 六个角色同链，保存期只查四个会让这两个字段成为二等公民；而写错的 `wiki_model` 很难自查（D8、§6.2）。落点是 `routers/rag_config.py` 的角色字段表，复用同一套 `RagConfigurationError` 与文案 | 代价：多改一个生产文件、既有 PUT 夹具可能要补模型条目（门 A 的 Task 9 踩过同一个坑：零条目夹具会让既有 200 变 400 —— 修法是补夹具、不是放宽检查） |

### 6.2 本期保留的代价

- **worker 那条腿的行为变了，且与"字段是否声明"无关**（D3，③＝乙）：这是本对唯一一处不依赖新字段的行为变化。今天"没有可用模型"＝ boot 那一刻一条一次性 exception ＋ 之后**静默**关闭自动生成；改后＝**每次触发**各记一条 `wiki generation trigger failed for kb …`（`worker.py:849-850`），本次不生成、文档仍 `ready`。收益是**配置修好即自愈、不用重启**；代价是这类日志从 1 条变 N 条，且"这个进程有没有自动生成能力"不再是启动期已知的事实。若一个部署本来就"没有模型、也不想要自动生成"，它会从安静变成每次入库一条日志 —— 想彻底安静就得给它配一个可用模型（本对不新增开关，见 D3 取值①）。
- **错名的两层行为（⑤＝甲）**：**运行期**沿用工厂语义 —— 显式声明指向 UI 协议格里缺钥匙／缺地址的条目 ⇒ `RagConfigurationError`；指向不存在的条目 ⇒ 普通 `ValueError(Model X not found in config)`，wiki 自动腿落既有 `logger.exception`（每次触发一条）、手动腿与合成腿当次报错。**保存期**这两个字段已并入 D10.1 的既有检查 ⇒ **显式声明不可用就当场 400**，不必等到运行期才发现（这是 ⑤ 选甲的收益）。**兜底出来的目标两类都不查**（门 A 的 R2 规则）：留空的部署不受影响。⇒ 本对引入的**新失败面**只剩"没声明、运行时缺模型"这一档，与既有四个角色同形。
- **原列的「RAG 内部两套兜底」代价已消失**：那一条只在 §6.1 ④ 选乙时存在；2026-09-28 裁定甲 ⇒ 六个角色同一套链（`角色字段 → rag.default_model → 首项`）。
- **一个模型条目都没有时的失败形状变了**：今天无参 `create_chat_model()` 只在"一个模型条目都没有"时于工厂里索引空列表；本对之后三条腿都经 `require_usable_rag_target()` ⇒ 抛点名的 `RagConfigurationError`（手动腿与合成腿当次可见；worker 腿按 D3 落既有 `logger.exception`）。注意这条属**兜底档**，⑤＝甲 的保存期检查**不覆盖**它（R2 规则：只查显式声明）。
- **不做视觉／能力过滤**：下拉列出全部条目，选到一个不适合写长文的模型不会被拦（与 `extract_model` / `judge_model` 一致）。

后续不再重开本对的五项裁定；实施中若确遇新事实，按本文件的更正惯例**追加**一条（不改写已裁的行），也不把本对的两个字段暗中扩成别的东西。
