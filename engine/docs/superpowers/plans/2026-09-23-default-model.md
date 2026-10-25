# RAG 默认模型（功能模型未指定时的落点）—— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-23-default-model-design.md](../specs/2026-09-23-default-model-design.md)
**Status:** **2026-09-26 按用户确认收窄为 RAG 范围；同日开工，Task 0–2 已交付，Task 3–9 待做**。本版替代原全局默认实施方案：字段迁至 RAG 配置，控件移入功能模型视图，默认解析与目标检查只接 RAG 角色。公共模型系统、聊天偏好、记忆改造和旧 Task 10 全部移出本期，不算已解决。Task 8 归一与 Task 9 删字段仍背靠背交付、同批发布。**同日第二轮按符号核对真实源码后修订 R1–R10**（编号见 spec 的 Status 表，与上一轮审查的 ①—⑭ 不是同一套）：R1 协议格地址按 provider 分裁、R2 严格检查只打显式声明的目标、R3 字段名 `default_model`、R4 空白归一载体、R5 阈值单一常量、R6 not-found 文案等值钉子、R7 `get_extract_llm()` 形参、R8 graph 标记换生产者、R9 默认选择器候选源、R10 error 可见性表述。**第三轮 R11–R17**（把退役连带面与 `get_extract_llm()` / `caption_images()` 的全部调用点扫完后补）：R11 `backend/AGENTS.md:703-723` 随退役同批改、R12 `graph_search_tool.py:199` 是抽取角色的第二个消费者（检索期）、R13 `caption_images()` 返回形状定形为 dataclass ＋受害者清单、R14 `vlm_target.py` 条目分支也吃退役字段、R15 `UPSTREAM_README.md:957-958` 归 Task 9 而非 B-2、R16 `config.example.yaml:2578-2584` 另两处、R17 §6.2 补登四条既有行为变化／代价。**第四轮 R18–R26＝Task 0 只读核实的结论**：R18 用户裁定退役 `video.caption_model`（视频配文永远跟随 `rag.vlm_model`；删除面 29 处／16 文件，视频优先级由四层塌成三层，空白 validator 由五字段收成四字段，Task 8 的剥离必须扩到嵌套）、R19 `_assert_pure_addition()` 的白名单是**顶层**的 ⇒ 嵌套新键只能改 golden、R20 三个此前未点名的载体（第三份 dom 测试、`wiki/generator.py` 与 `eval/synthesis.py` 两个无名选模点、`backend/AGENTS.md:1211`）、R21 配文生命周期四处实测、R22 夹具与断言的实测修正（**`config_env` 零模型条目 ⇒ Task 9 会把既有 200 打成 400**）、R23 D10.2 三条读法复核通过＋anthropic 只能走 `default_factory()`、R24 撤回"无模型空态"待裁点＋非 RAG 选模基线共 7 处、R25 judge 退役的受害者细化到**用例级**（并点名 `test_ondemand.py` 是 Task 2 的受害者）、R26 `nightly.yaml:303` 传的就是被退役的前缀本身，按现文实施会让该 job **静默假绿**（带出 D9 的一条【待裁】）。**第五轮 R27–R28**：**R27＝同日用户裁决（不是核实结论）＝乙**——CLI 错名不抛穿，改走 stderr 一句可读原因 + 落一行 `status="error"` + 退 `EXIT_ERROR`(2)，让上游 nightly 红而不是假绿；库层 `build_judge_llm()` 仍精确抛 `ValueError`，映射只在 CLI 边界。**R28＝把该裁决落进两份文档时连带查出的五处细化**：① persist 那行要专属断言与专属 neuter（现有夹具下它会静默失败成一行 stderr note ⇒ 空洞绿）；② 两处"静默假绿"是 R27 之前的反事实链、已各加尾巴；③ spec §6.2 补登 CLI 的 `skipped`+退 3 → `error`+退 2；④ `:207-210` 注释的 "without touching persistence" 半句同样失效、要整段重写；⑤ 捕获按消息收窄，宽捕 `ValueError` 会打掉 `:86 test_config_value_error_maps_to_skipped`。本轮（R27／R28）只改这对文档；**提交状态（截至 2026-09-27，均未推送）**：文档本体含 Task 0 回填＝`23ca85be`、R27／R28＝`54815ad6`、Task 1＝`bfed5529`、Task 2＝`fcb58d0c`、状态刷新＝`0bcc818d`、Task 3＝`72a3db6e`、Task 4＝`a64d27df`、Task 6＝`095bec22`、Task 7＝`3bf049cf`（另有用户两笔：Task 5 真栈记录＝`8f118475`、图表版本修正＝`c9b01522`；旁支：写死项盘点首次入库＝`aa36e675`）。**进度：Task 0–9 全部交付、复选框 82／82 已勾**（Task 0 是只读核实、不伪造 RED／neuter 数字；Task 1–8 的 RED／neuter／门禁数字各见其「实测」段。Task 8／9 已实施并自证，**两笔提交待授权**；它们必须背靠背同批发布，中间态不得单独发布）。
**相关基线:** [模型提供商分组](../specs/2026-09-22-provider-grouping-design.md)、[RAG 功能模型配置](../specs/2026-09-10-rag-functional-model-config-design.md)。不再依赖修改整个模型页标题或模型管理保存逻辑；若其他工作仍在修改功能视图或 locales，实施前核对最新文件并串行编辑同文件。**这不是假设：本文档第三轮修订时 HEAD 已从 `860dbf25` 前进到 `090bbcbc`（“unlock the retrieval endpoint rows and require an address”），它重排了 `functional-models-view.tsx`、`config-form.ts`、`test_rag_config_api.py` 与两份前端测试，本 plan 引用的前端／该测试文件行号已按新 HEAD 就地更新。**开工前再核一次 HEAD，别假定本轮行号仍然有效。旧行号仅供定位，以符号和当前源码为准，历史已交付文档不原地改写。

**Architecture:** `rag_config.json → RagConfigFile → merge_rag_config → AppConfig.rag`；新增 `knowledge/model_target.py` 承载 RAG 默认解析与纯缺项判定。抽取／裁判先解析和检查，再把明确名称及同一配置快照交给未修改的公共工厂；图片／视频配文沿用 VLM target 与原 HTTP 客户端。前端只扩 RAG 表单，沿用原保存按钮、mutation 和来源继承，不新增模型目录或即时保存接口。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 / D6 | 抽取、裁判、文档图片及视频配文 | 普通聊天、知识库聊天主模型、sidecar、agent、IM、定时任务、记忆、摘要、goal 与能力判断 |
| D2 / D3 | RAG 字段、整对象保存、角色→RAG 默认→首项 | `ModelsConfig`／`AppConfig` 顶层默认、公共模型 API 的新字段 |
| D4 / D5 | 功能视图内部顶部、RAG 文案、原保存按钮 | 全局标题常驻控件、模型管理即时保存 |
| D7 / D8 | VLM 继承、配文降级标记与恢复边界 | 视觉能力硬守卫、自动重建历史产物 |
| D9 / D10 | judge 直连退役、VLM legacy 退役、RAG 目标检查及用户入口收尾 | 公共工厂校验／厂商端点注入、全站目标一致性改造 |
| D11 | 仅登记后续对齐边界 | 全 UI 条目写入必填、`has_api_key`、临时修复编辑器、旧 Task 10 |

### 上一轮审查的去向

收窄范围不等于关闭原问题；以下替代原“①—⑭全部按全局方案实施”的映射。

| 原审查项 | 本版处置 | 执行归属 |
| --- | --- | --- |
| ① 配置加载链 | 改验 RAG 链，不修模型目录加载 | Task 1 / 3 |
| ② 自动选择被固化 | 聊天偏好改造移出；只验不受 RAG 字段影响 | Task 2 / 5 / 9 隔离守卫 |
| ③ `$VAR` 保存与解析 | 模型保存修复移出；RAG 消费已解析条目，不声称已修引用回写 | Task 9 正向对照；spec D10.3 / §6 登记 |
| ④ 记忆缓存不跟随 | 改造移出，不更新 manager／updater | Task 2 隔离守卫 |
| ⑤ 公共默认权限 | 不向公共模型 API 增字段；沿用 RAG admin 权限 | Task 3 形状／权限守卫 |
| ⑥ caption 顺序与重解析 | 保留 | Task 6 |
| ⑦ 外层捕获吞配置错 | 保留 RAG 用户入口收尾 | Task 9 |
| ⑧ 前端类型与入口差异 | 聊天／agent 接线移出；只扩 RAG 表单类型 | Task 3 / 4；其他入口只作隔离对照 |
| ⑨ goal 既有差异 | 仍只登记，不修模型传递链 | spec §6 |
| ⑩ 两种保存竞争 | 模型列表／默认即时保存方案取消；不改原模型事务 | 仅复用 RAG 原保存链，不另建改造任务 |
| ⑪ 多条旧配置修复 | 移出，不引入临时批量修复流程 | spec D11 |
| ⑫ Task 8 / 9 测试交接 | 保留 | 密钥载体前移 Task 8；响应删键归 Task 9 |
| ⑬ MinerU 既有归一 | 保留 | Task 8 / 9 |
| ⑭ 热重载验收方法 | 保留并改用 RAG 文件签名 | Task 1 / 3 / 8 / 9 |

## 硬约束

- **存储仅在 RAG**：字段名 **`default_model`**（`RagConfig.default_model` / `RagConfigFile.default_model`），不向模型配置文件或 `AppConfig` 顶层加同名字段。**不许写成 `default_model_name`**：兄弟字段全是 `*_model`，而 `default_model_name` 在 harness 里已经是“`models[0]`”的私有叫法（`lead_agent/agent.py:133`、`subagents/config.py:45`、`summarization_middleware.py:158`、`models/factory.py:298`）。RAG GET 的 `config` / `sources` 同步增加字段；公共模型 API、模型管理 API 形状不变。
- **整对象保存**：非空名称写 UI 覆盖；省略／`null`／空串／纯空白都撤销该字段的 UI 覆盖，再继承 YAML 的 `rag.default_model`。不沿用“缺字段＝不变”。其他字段编辑要带回已有 UI 默认，不把未编辑的 YAML 值固化；能否保存用 `hasFormChanges()`，不能拿 `{}` 直接判未编辑。
- **空白归一的载体是 validator，不是 resolver**：`_prune_empty()`（`rag_config.py:157-167`）只丢 `None` 与 `""`，`" "` 会被写进文件并让 `sources` 谎报 `ui`、GET 原样回显。归一落在 `RagConfigFile` 的字段 validator（空白→`None`），**一处实现覆盖四个模型引用字段**（`default_model` / `extract_model` / `judge_model` / `vlm_model`，全部在 `RagConfigFile` 同一个类上，用同一个共享 validator 或注解类型）。**R18 之后不含 `video.caption_model`**——该字段本期退役，不要为它加 validator、也不要把它算进"五个字段"的旧口径。这会顺带改掉三个既有角色的行为（手写 `" "` 从炸成 `Model   not found in config` 变成视为未设置），属已登记代价，实施时不得只做新字段。
- **四条角色、三条不同的优先级链（R18 后图片与视频同链）**：抽取 `extract_model → RAG 默认 → 首项`；裁判 `调用／CLI 参数 → judge_model → RAG 默认 → 首项`；图片 `显式参数 → vlm_model → RAG 默认 → 首项`；视频 `显式参数 → vlm_model → RAG 默认 → 首项`（**与图片完全相同**——`video.caption_model` 那一层随 R18 退役，视频不再有自己的角色字段）。角色空值按合并后的有效配置判断；清 UI 覆盖不等于抹掉 YAML 角色。**实施时别再写"视频先自身再图片"**：那句话在 R18 之后是假的，Task 6／9 里所有这类表述同批改。
- **失效语义**：只有 RAG 默认字段失效才回首项＋warning 点名；显式角色错名不回落，无模型在 RAG 入口报配置错，不将 `None` 传给工厂制造隐式选择。显式 judge 错名保留 D9 的普通 `ValueError` 契约；缺字段统一为 `RagConfigurationError`，两类文案不混用。
- **严格检查只打用户显式声明的目标**：范围＝UI 来源 × 协议格 × **四个**字段（`default_model` / `extract_model` / `judge_model` / `vlm_model`，R18 后不含 `video.caption_model`）里合并后非空的那些。**`models[0]` 兜底出来的目标不检查**——保存不 400、运行不抛错，保留今天各腿的降级（配文占位符、抽取／裁判请求期失败），只 warning 点名条目。理由：那是系统替用户挑的，拿它当拒绝理由会让一次无关的模型列表编辑弄坏 RAG。
- **地址与钥匙分开裁**：缺**钥匙**（含空白）对范围内目标一律拒绝，SDK 隐式环境凭据不能补齐。缺**地址**只拒 `openai-compatible`；`anthropic` / `deepseek` 缺地址是合法常态（模型管理 API 的 `endpoint` 本就可选：`models.py:187`，PUT 只校验重名／空名／空 model id／未知 provider，`:648-657`），按 spec D10.2 的表惰性读该 SDK 自己的默认值，不抄 URL 字面量、不为检查构造客户端、不出网、不回写条目，各配一条与 SDK 值相等的钉子。`openai-compatible` 保留缺项的理由是它的 SDK 没有可读默认常量（`openai._constants` 只有 timeout/retry/header 项），空白只能落到 OpenAI 公有云——把用户文档图片悄悄送去第三方比拒绝更糟。运行检查接在 RAG 构建入口，不接公共工厂，不在全站加载阶段校验角色存在性；`knowledge/model_target.py` 复用既有来源／provider 只读判定。
- **界面与权限**：仅功能视图顶部显示“RAG 默认模型”；**候选源钉为抽取／裁判那一份**——`useModels()` 的 `models` + `modelReferenceOptions()`，不是配文行的 `managedModels` + `visionReferenceOptions()`。**认符号不认行号**：抽取行是 `modelReferenceOptions(models, values.extract_model, F.extractModelNone)`、裁判行是 `modelReferenceOptions(models, values.judge_model, F.judgeModelNone)`，配文行是 `visionReferenceOptions(managedModels, values.vlm_model, F.vlmModelDefault)` + `hasVisionModel = managedModels.some(isCaptionCapable)`（行号随 HEAD `090bbcbc` 为 `:926` / `:953` vs `:527-532`，该提交刚重排过这个文件，实施前按符号重扫）。理由是默认值喂四个角色，其中抽取／裁判不过滤视觉，候选集必须与它们一致。不按视觉声明过滤默认候选；已有 VLM 显式选择器的过滤不变，且从宽列表选出的默认可能不出现在配文行候选里（配文行此时仍显示“（使用配置默认）”，不拦保存）。不扩大模型读取权限；无模型／无权限沿用表单状态。选值只改草稿，原保存按钮提交完整 RAG 对象。
- **传输与旁路不动**：`caption_client.py` 及两条 captioner 的 HTTP 请求构造不改；embedding／sparse／rerank／parse／ASR 各走原配置。知识库聊天和评测答题 agent 不使用 RAG 默认；其他未列出的 RAG 调用不批量接入。
- **不增加出网**：默认改选／保存不新增探针、SDK 构造或鉴权请求；已有 embedding 保存探针仍只按自身签名触发。用计数桩证明零新增，不仅靠源码推断。
- **退役保留（本期共三项）**：① judge `dashscope:` 直连删除；② VLM 退 `RagConfig` 三字段、JSON／前端两字段，`vlm_model` 保留但去字面量默认；③ **`video.caption_model` 整个退役（R18，用户裁定）**——`RagVideoConfig.caption_model`（`app_config.py:158`）、`RagVideoFileConfig.caption_model`（`rag_config_file.py:71`）、`_VIDEO_FIELDS` 里的该项（`routers/rag_config.py:65`）、生产读取点（`video/captioner.py:83`）与前端类型／来源映射全删，视频配文永远跟随 `rag.vlm_model`。Task 8 只剥离旧文件的键，Task 9 才删声明；必须背靠背、同批发布，其他未知键仍拒绝，保留 `parse_backend` 归一。
- **R18 的剥离必须扩到嵌套，且两个载体失效方式不同**：`rag_config_file.py:169-175` 那个剥离循环今天是**顶层的**（`for key in _RETIRED_KEYS: if key in raw: raw.pop(key)`），而 `video.caption_model` 在**嵌套的 `video` 块里**。不扩到嵌套的话：`RagVideoFileConfig` 是 `extra="forbid"`（`:67`）⇒ 存量 `rag_config.json` 写过该键就**整个 RAG 配置加载失败**（硬失败，不是忽略）。而 YAML 那侧的 `RagVideoConfig` **没有 `model_config`**（`app_config.py:143-160`）⇒ pydantic 默认 `extra="ignore"` ⇒ 静默忽略、不报错。所以 Task 8 必须做嵌套剥离＋warning（**只报字段名、绝不报值**），Task 9 之后 YAML 侧的静默忽略是已登记代价（spec §6.2）。
- **厂商边界与一致性**：缺地址的解析只在 RAG VLM 目标层做，不改公共工厂或 SDK 的环境端点规则。`anthropic` / `deepseek` 两格因此与聊天腿解析到同一个地址，旧版“不承诺 raw HTTP 与 SDK 端点一致”的免责声明**收回**；只剩 `openai-compatible` 一格是 RAG 更严（拒绝而非默认去公有云），这条差异明确登记，不写成全站一致。范围外 VLM 缺钥匙仍降级，不能再借退役字段。
- **30% 阈值只许一份常量**：图片腿复用 `graph/indexer.py:31` 的 `DEGRADED_FAILURE_THRESHOLD`；`video/captioner.py:44` 的 `_DEGRADE_THRESHOLD` 是既存的第二份，**不得出现第三份 `0.3` 字面量**。若判断跨包导入不合适，可在同一 Task 把该常量提到中性位置并同步改两个既有消费者，份数仍不得增加。
- **graph 降级标记换生产者**：`index_document_graph()` 不再自己写 `error`（今天 `graph/indexer.py:209` 是覆盖写，会抹掉先写的 caption 标记），改由 worker 的 `_append_error_marker()`（`worker.py:404-413`：读-改-写、`; ` 拼接、幂等）追加；worker 在 `:362` 已有 `stats.degraded`，`stats.failed_chunk_ids` / `stats.total` 同对象可取，无需新管线。钉住旧生产者的既有用例随写入点迁移，不留在 indexer 侧。
- **not-found 文案单一来源 + 等值钉子**：原句出自 `models/factory.py:302`，工厂本期冻结、不能提共享常量，所以 RAG 侧只允许一处常量／helper 产出逐字相同的一句，并加钉子：真实触发工厂那句，断言 `str(exc)` 与 RAG helper 输出完全相同。任一侧改词都要红。
- **`get_extract_llm()` 要加可选配置形参**：它今天不接参数、内部自己 `get_app_config()`（`graph/extractor.py:112-117`），而 Task 2 要求检查与构造用同一份快照。形参必须可选（默认 `None` → `get_app_config()`），`extract_graph(llm=None)`（`:120-123`）与 `index_document_graph(llm=…)` 的既有调用点和用例不必改；`build_judge_llm(judge_model, *, config)` 已有该形参，不动签名。
- **`get_extract_llm()` 的调用点有两处，第二处在检索期（R12）**：`extractor.py:123`（`extract_graph` 内部；入库期经 `indexer.py:82/147` 到达，worker 构造默认 `llm=None`，所以生产路径确实走它）与 **`tools/builtins/graph_search_tool.py:199`** 的 `llm = llm or get_extract_llm()`（聊天工具 `graph_search` 抽查询实体）。后者**本期不改一行**（形参可选即生效），但它跟着换模型、跟着受 Task 9 的严格检查 ⇒ 属**生效面**而非隔离面。Task 2 的守卫必须对它做正向断言，不能按“普通聊天不变”一句话带过；该文件不在 `knowledge/` 下，是最容易漏的一处。
- **`caption_images()` 的返回形状定形（R13）**：`dict[str, str]` → dataclass（`captions: dict[str, str]` / `failed: int` / `degraded: bool`），与 `video/captioner.py:47-53` 的 `CaptionOutcome` 同族；`degraded` **在 captioner 内用那一份共享常量算**，worker 只读、不自己比阈值（这是 R5 在图片腿的落法）。破坏性变更 ⇒ `worker.py:443`（取 `outcome.captions` 再交 `apply_captions()`）与既有把返回值当映射用的夹具 `test_worker.py:156/183/206`、`test_parser.py:215/241/251/328/349`、`test_vlm_target.py:148/207/283/301/324` 同批改完；实施前按符号重扫全部调用点，不以这份清单为上限。
- **退役连带面包括模块指南与上游说明（R11 / R15 / R16 / R20）**：`backend/AGENTS.md:703-723` 的 “Caption target resolution” 整段、**`backend/AGENTS.md:1211` 的 Layer 2 评测段（R20，Task 7 的交接面：其"config primary model"半句已于 2026-09-27 提前改掉，只剩 `dashscope:` 半句）**、`UPSTREAM_README.md:957-958` 的裸 id 那半句、`config.example.yaml:2578-2584` 的注释段与注释掉的 `vlm_base_url` 行，都随对应 Task 同批改，**不推给 B-2**——B-2 只接 `SILICONFLOW_VLM_API_KEY` 这类**旧环境变量名单**。根 `AGENTS.md` 的文档更新约定要求架构改动在同一个变更集里改对应模块指南，否则交付后指南会描述一条已不存在的路径。
- **`vlm_target.py` 的条目分支也吃退役字段（R14）**：不只删 legacy 分支——`:71` 的 `endpoint or config.rag.vlm_base_url` 改按 D10.2 取 provider 默认，`:72` 的 `or config.rag.vlm_api_key or _environment_key(config)` 只剩条目自己的 `api_key`，`_environment_key()`（`:52-54`）删除。删掉它＝同时抽走**条目分支**的环境变量兜底，而这正是 D10.1 严格钥匙检查不可绕的前提；只删 legacy、留着条目分支 env 兜底的话检查形同虚设，所以要有一条专属钉子（条目内无钥匙＋宿主环境有同名变量 ⇒ 仍判缺项）。
- **golden 的白名单是顶层的，嵌套新键只能改 golden（R19）**：形状守卫是 `_assert_pure_addition()`（`test_rag_config_api.py:478-486`）配 `_ADDED_FIELDS = {embedding_providers, rerank_providers, warning}`（`:477`），断言 `set(body) == set(golden) \| _ADDED_FIELDS` **且**去掉这三个键后与 golden **逐值相等**；调用点 `:537`（GET）与 `:545`（PUT）。`default_model` 是 `config` / `sources` 里的**嵌套**键 ⇒ 往 `_ADDED_FIELDS` 加名字**过不了关**（逐值比对仍不等），Task 1 必须同批改 `response_golden.json`。基线现状：`get.config` **25 键**、`get.sources` **27 键**、`put.payload` **12 键**；Task 1 各 +1，Task 9 各 −2（VLM 两键）再 −1（`video.caption_model`，R18）。
- **默认行不需要"无模型空态"（R24，撤回的待裁点）**：`modelReferenceOptions()`（`config-form.ts:483-500`）**永远**先塞一个空选项（`:489`），且把一个指不到任何条目的已存值保留成额外一项（`:496-498`，注释写明"so opening the form cannot silently clear it"）。所以 D4 那句"无模型／无权限沿用表单状态"本来就是"不加东西"，**不要新造空态组件或新 i18n key**。
- **测试与文案**：用例钉结构／行为／形状，不钉几何；D5 文案以 spec 表为唯一来源，新增 RAG 默认标签／空选项／说明与相关角色解释同步 locales 三文件，不扫全站同词文案。

## 执行纪律

- 当前分支 `feat/rag-knowledge-base`。本轮只修文档，不能据本计划擅自开工、提交或推送。实施获授权后，代码任务按 **RED → GREEN → neuter（行为还原并记录受害者）→ revert proof → 门禁** 执行；提交／推送按届时明确授权，提交使用 Conventional Commits。Task 0 为只读核实，Task 5 为真栈验收，不伪造这两类任务的 RED／neuter 数字。
- 后端在 `backend/` 用 `PYTHONIOENCODING=utf-8 .venv/Scripts/python -m pytest <path>`；ruff 用 `uv run --no-sync ruff check` 与 `uv run --no-sync ruff format --check`。不用裸 `uv run`／`uv sync`，不 prune 视频依赖。
- 前端在 `frontend/` 用 `PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`；门禁为 `check`、对应窄面与 `test`。全量长跑后台执行，结果未回不报绿；环境失败与同基线对照，不顺手修无关失败。
- 单测／集成测试显式绑定临时配置与测试环境变量，不读取真实 `config.yaml` / `models_config.json` / `rag_config.json`，不调用外部模型；需要模型来源时使用真实临时加载或显式标明来源，不能依赖 PrivateAttr 自动补齐。
- 真栈开始前确认服务实际运行并已加载待验收代码，使用隔离浏览器上下文与授权测试数据。仅允许临时修改 **RAG 配置**，不改／删用户模型条目，不写 `config.yaml`、`models_config.json`、扩展配置。模型候选取已授权脱敏元数据，不输出钥匙。若无可用第二条目标，记录阻塞，不创建／修改用户模型来凑测试。
- 真栈每轮先保存 RAG 文件原字节、存在状态与 md5；成功／失败均逐字节还原，原本不存在则恢复不存在。对其余配置仅核字节指纹不变，不回显内容；只清理本次创建且可确定 ID 的测试资源。当前文档修订不做任何真实配置读取或上述备份。
- RAG 角色合并后仍有 YAML 值时，不能声称 UI 清空已进入默认；真栈可临时将对应 RAG 角色设为本次目标以验调用，但“空角色继承”必须由可满足前提的隔离配置验证并标明，不能把显式指定冒充默认验收。
- 每个 Task 的“实测”回填命令、数量、受害者、还原证明及门禁结果；纯守卫初始为绿如实记载，用 neuter 证明有牙。新配置的示例／版本规则在 Task 0 核实，实施时只改模板与必要说明，不运行用户配置升级。

**依赖顺序**：Task 0（RAG 边界核实）→ Task 1（字段与 resolver）→ Task 2（抽取／裁判及隔离守卫）→ Task 3（RAG API／表单契约）→ Task 4（功能视图控件）→ Task 5（阶段真栈）→ Task 6（VLM 继承与配文状态）→ Task 7（judge 直连退役）→ **Task 8（旧键读取归一）→ Task 9（VLM 退役、RAG 目标检查与最终验收）** → 交付回写。旧 Task 10 不再是待实施任务。Task 5 不是最终验收；Task 9 后重跑真栈。Task 8／9 之间不发布、不部署中间态。

---

## Task 0 — RAG 接缝与隔离基线（只读）

- [x] **角色调用清单**：核 `graph/extractor.py::get_extract_llm()`（**今天不接参数、内部自己 `get_app_config()`**，Task 2 要加可选形参）、`eval/factory.py::build_judge_llm()`（已有 `*, config`）、CLI／按需评测传参、`vlm_target.py` 及文档／视频 captioner／worker 调用；列出“谁选择角色、谁传配置、谁捕获错误”。视频确认 `video.caption_model → vlm_model` 层级（**该层级本期随 R18 退役，核实结果与去向见下方实测 ①／⑥**）。同时记录两处 Task 6 的接缝事实：graph 降级标记今天由 `graph/indexer.py:209` 覆盖写、追加 helper 在 `worker.py:404-413`；30% 阈值现存两份（`graph/indexer.py:31`、`video/captioner.py:44`）。单列答题模型及其他不接入的新默认调用，不能按目录全局替 `models[0]`。
- [x] **按符号扫全部调用点，不以文件目录推断范围（R12 / R13 / R14）**：三组事实要落成清单——① `get_extract_llm()` 有**两处**调用点：`extractor.py:123`（入库期，经 `indexer.py:82/147` 到达；worker 构造默认 `llm=None` 所以生产路径走这条）与 **`tools/builtins/graph_search_tool.py:199`（检索期聊天工具，不在 `knowledge/` 下）**；两处都不需要改代码，但第二处属生效面，Task 2 要正向断言。② `caption_images()` 的全部调用点：生产 `worker.py:443`，夹具 `test_worker.py:156/183/206`、`test_parser.py:215/241/251/328/349`、`test_vlm_target.py:148/207/283/301/324`；返回形状一改这些全红，Task 6 同批改完。③ `vlm_target.py` 里退役字段出现在**两个分支**：条目分支 `:71`（`endpoint or config.rag.vlm_base_url`）、`:72`（`or config.rag.vlm_api_key or _environment_key(config)`），legacy 分支 `:77-83`，加上 `_environment_key()` 本身 `:52-54`。三组都以“grep 到的清单”为准，行号只作定位。
- [x] **配置与保存链**：核 `RagConfigFile.from_file()`、`merge_rag_config()`、AppConfig 的 RAG 合并／签名重载、router `_pending_rag()`／`_prune_empty()`／`_build_response()`／响应来源、前端 `buildRagConfigInput()`／`hasFormChanges()`。确认三件事实：① pending 来自 YAML RAG 原值＋本次 payload，不复用模型管理 PUT 的缺字段保留规则；② `_prune_empty()`（`rag_config.py:157-167`）只丢 `None` 与 `""`，**纯空白必须由 Task 1 的 validator 承重**，router 侧不另加 strip；③ `_build_response()` 按 `RagConfigFile.model_fields` 迭代，所以新字段与来源**在 Task 1 就会出现在 GET／PUT 响应里**，golden 必须同批改。并确认删除最后一个 UI 覆盖能否提交 `{}`。
- [x] **形状与权限基线**：捕获 RAG GET／PUT 与 `sources` golden；同时留公共模型／管理接口原形状的隔离守卫。确认 RAG admin 权限、现有模型候选来源及未知名称显示；本期新增默认字段只进 RAG，不扩普通用户可读面。
- [x] **前端与现有断言**：定位 `functional-models-view.tsx`、RAG hook／wire／form、locale 三文件和功能视图 dom 测试，按字段和界面词汇两种方式扫相关用例。记录现有无模型／失败／保存中处理，不改模型 add/edit 弹窗和全局标题；D5 必要角色说明由 Task 4 同步。
- [x] **退役与失败收尾**：按 spec §5.2 逐项复核 VLM 模块级密钥常量、五处 legacy 断言、同值夹具、旧字段载体、`parse_backend` 归一、caption→graph 顺序、store 清理语义、recaption 和按需评测宽捕获。另复核 spec D10.2 表里三条地址读法在**本机实装版本**上仍成立（`anthropic` 的字段 default_factory、`deepseek` 的模块常量、`openai-compatible` 确无可读常量）；SDK 升级会让读法失效，所以钉子断言"RAG 侧的值 == SDK 自己的值"，不写死期望 URL 字符串。Task 6 接配文生命周期，Task 8 接密钥测试载体，Task 9 接退役／终态，不能删完字段再找受害者。
- [x] **隔离、模板与真栈前提**：记录非 RAG 选模基线，明确只加守卫、不修其既有问题；核模块指南要求的示例／版本与说明更新位置。**退役会连带文档，先按符号定位、别只按文件名（R11 / R15 / R16；核实后是"VLM 四处 ＋ R18／R20 三处"共七处）**：`backend/AGENTS.md:703-723` 的 “Caption target resolution” 整段（逐字描述了 `rag.vlm_base_url` 兜底、rag 文件钥匙／环境变量兜底、裸 id legacy 路径、“only two endpoint sources”）、`UPSTREAM_README.md:957-958` 的 `or a bare model id to use rag.vlm_base_url with the caption API key`、`config.example.yaml:2578-2584` 的 `vlm_model` 注释段与注释掉的 `# vlm_base_url:` 行、`config.example.yaml:2564` 的 `SILICONFLOW_VLM_API_KEY` 独立注释行；**R18 另加两处**——`config.example.yaml:2667` 的 `caption_model: ""`（与前两处是同一文件的**第三个**不同段）与 `docs/PRE_RELEASE_HARDCODE_INVENTORY.md:426`（把 `rag.video.caption_model` 当现行字段描述其继承规则）；**R20 另加一处**——`backend/AGENTS.md:1211` 的 Layer 2 评测段（Task 7 的交接面）。前三处归 Task 9（描述的是被删的**配置字段**），第四处与 `app_config.py:184`／`backend/AGENTS.md:1188` 的变量名单同批；`.env.example`／README 的**旧环境变量名单**与 e2e smoke live 门禁仍归 B-2，两条线不要并成一项。当前不读真实配置；实施验收时再确认运行服务、授权测试数据与可用候选，不沿用历史模型名、模型数量或“已经启动”的假定。

**实测（2026-09-26 完成，只读核实）**：

**性质与基线**：本 Task 是只读核实，**没有 RED／GREEN／neuter 数字可回填，也不该有**。核实基线＝HEAD `090bbcbc`（`feat/rag-knowledge-base`，2026-09-26）。全程**未修改任何生产文件、未运行测试、未读取真实 `config.yaml` / `models_config.json` / `rag_config.json`**；手段是 `Read` / `Grep` 按符号定位，加一次**离线**的 SDK 内省（不建客户端、不出网、不读钥匙）。产出是 R18–R26 九条修订，已写回 spec 与本 plan。

**① 角色调用清单（含 R12 / R13 的接缝事实）**：四条角色的选模点、传参方式与错误捕获方逐个核过。`get_extract_llm()`（`graph/extractor.py:112-117`）**确实不接参数**、内部自己 `get_app_config()`，Task 2 必须加可选形参（R7 成立）；`build_judge_llm(judge_model, *, config)`（`eval/factory.py:66`）已有该形参，签名不动。两处 Task 6 接缝事实核实：graph 降级标记今天由 `graph/indexer.py:209` **覆盖写**（会抹掉先写的 caption 标记），追加 helper 在 `worker.py:404-413`（读-改-写、`; ` 拼接）；30% 阈值现存**两份**（`graph/indexer.py:31` 的 `DEGRADED_FAILURE_THRESHOLD`、`video/captioner.py:44` 的 `_DEGRADE_THRESHOLD`）⇒ R5 的"不得出现第三份"成立。答题模型与其他不接入的选模点单列见 ④。

**② 按符号扫全部调用点（R12 / R13 / R14 三组清单全部落地）**：① `get_extract_llm()` **两处**调用点已核实——`extractor.py:123`（入库期，经 `indexer.py:82/147`；worker 构造默认 `llm=None` 所以生产路径确实走它）与 `tools/builtins/graph_search_tool.py:199` 的 `llm = llm or get_extract_llm()`（**检索期聊天工具，不在 `knowledge/` 下**）。两处都不需要改代码，但第二处属生效面 ⇒ 已写进 Task 2 的正向断言与 Task 9 的运行侧入口。② `caption_images()` 的调用点清单核实无误（生产 `worker.py:443`；夹具 `test_worker.py:156/183/206` 三处 `AsyncMock(return_value={...})`、`test_parser.py:215/241/251/328/349`、`test_vlm_target.py:148/207/283/301/324`）⇒ R13 的破坏性变更受害者清单成立。③ `vlm_target.py` 的退役字段**确实在两个分支**：条目分支 `:71`（`endpoint or config.rag.vlm_base_url`）、`:72`（`or config.rag.vlm_api_key or _environment_key(config)`），legacy 分支 `:77-83`，加 `_environment_key()` 本身 `:52-54` ⇒ R14 成立，且"删掉 `_environment_key()` ＝同时抽走条目分支的 env 兜底"这条推理已核过源码、不是推断。

**③ 配置与保存链（三件事实全部确认，并带出 R19）**：① pending 确实来自 YAML RAG 原值 ⊕ 本次 payload（`_pending_rag():287-295`＝`RagConfig.model_validate(merge_rag_config(config.yaml_rag, RagConfigFile.model_validate(payload)))`），**不复用**模型管理 PUT 的缺字段保留规则。② `_prune_empty():157-167` **只丢 `None` 与 `""`**，纯空白会被写进文件 ⇒ R4"归一必须由 validator 承重、router 侧不另加 strip"成立。③ `_build_response():195` 按 `RagConfigFile.model_fields` 迭代，非密钥分支 `:220-221` 是 `sources[name] = "ui" if name in written else "config_file"` ⇒ 新字段**在 Task 1 就会出现在 GET／PUT 响应里**，golden 必须同批改。**新发现（R19）**：形状守卫 `_assert_pure_addition()`（`test_rag_config_api.py:478-486`）配 `_ADDED_FIELDS`（`:477`）是**顶层**白名单，而 `default_model` 是 `config` / `sources` 里的嵌套键 ⇒ 往白名单加名字过不了关，只能改 golden。基线键数已记录：`get.config` 25、`get.sources` 27、`put.payload` 12。**`{}` 那个问题有了确定答案**：`buildRagConfigInput()` 的 TEXT 循环（`config-form.ts:200-213`）在 `:210-212` 是 `if (next !== "" || owned(view, key)) input[key] = next` ⇒ 只有**没有任何 UI 覆盖字段**时载荷才是 `{}`；有覆盖时被清空的字段会以 `""` 送出，不是靠省略。Task 3 的表述已按此收窄。

**④ 形状与权限基线**：RAG GET／PUT 与 `sources` 的 golden 基线已捕获（`tests/fixtures/rag_config/response_golden.json`，5186 字节，顶层四键 `_captured` / `_precondition` / `get` / `put`）。RAG admin 权限核实（`test_rag_config_api.py:142 test_rag_config_requires_admin`）。**`sources` 今天只有两态、没有 `default`**：`vlm_base_url` 明明是 `app_config.py:194` 的代码字面量，golden 里却报 `config_file` ⇒ 这条既有谎报已登记进 spec §6.1，本期不新增第三态。候选源核实为抽取／裁判那一份（`useModels()` 的 `models` + `modelReferenceOptions()`），配文行是 `managedModels` + `visionReferenceOptions()` ⇒ R9 成立。

**⑤ 前端与现有断言（带出 R20 的第三份测试与 R24 的撤回）**：`functional-models-view.tsx`、`core/rag/{types,config-form,hooks}.ts`、locale 三文件与 dom 测试逐个定位。**按界面词汇扫（不只按数据字段）时发现第三份测试**：`frontend/tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`（369 行／12 例，直接渲染该视图、i18n 用 Proxy mock），此前两份文档只写了 `unit/settings/functional-models.dom.test.tsx`（1533 行／65 例）⇒ 已补进 Task 4／9 的门禁面。locale 三文件 `settings.functionalModels` 各 **99 键、键集完全相同**，"（使用配置默认）"现有三处（`extractModelNone` / `judgeModelNone` / `vlmModelDefault`），**没有 `video.caption_model` 的键**（与 R18 一致：该字段前端零控件）。**R24 撤回一个待裁点**：`modelReferenceOptions()`（`config-form.ts:483-500`）永远先塞空选项（`:489`），且把指不到条目的已存值保留成一项（`:496-498`）⇒ "无模型空态"本就不需要新东西，我此前把它抬成待裁点是过度升级。另核到保存失败**不在视图里渲染**，而是 `hooks.ts:52-53` 的 `toast.error` ⇒ Task 4 的"失败保留草稿"要按这个机制断言。

**⑥ 退役与失败收尾（带出 R18 的删除面核实与 R21 / R22 / R23 / R25 / R26，本项产出最多）**：spec §5.2 逐项复核完，并**推翻／细化了六条原有描述**——
- **R18（用户裁定的第三个退役）：删除面实数为 29 处／16 文件，且剥离机制有一个此前没发现的缺口**。用户给的口径是"19 处"，按符号逐层重数后是 **29 处／16 文件**（后端 schema 3／生产读取 1／docstring 3／测试与 golden 9、前端生产 6／测试 5、模板 1、**活文档 1**＝`PRE_RELEASE_HARDCODE_INVENTORY.md:426`；3+1+3+9+6+5+1+1=29），**全部行号已逐个回源核过**，且**找不到任何能得出 19 的划法**——已按实数写进 spec §5.2 与 Task 9 交接表。（第一版清单漏了"活文档"那一格，分层加起来只有 28／15，是回源重数时抓出来的。）**机制缺口**：`rag_config_file.py:169-175` 的退役键剥离循环是**顶层的**，而 `video.caption_model` 在嵌套的 `video` 块里、`RagVideoFileConfig` 又是 `extra="forbid"`（`:67`）⇒ 不扩到嵌套就是**整个 RAG 配置硬加载失败**；对照 YAML 侧的 `RagVideoConfig` **没有 `model_config`**（`app_config.py:143-160`）⇒ pydantic 默认 `extra="ignore"` ⇒ 静默忽略。两个载体失效方式不同，已分别登记（Task 8 做嵌套剥离、spec §6.2 记 YAML 侧静默忽略为代价）。另核实该字段**前端零控件**（`functional-models-view.tsx` 全文 `caption_model` 出现 0 次；三份 locale 各 99 键、无该字段的键）⇒ 爆炸半径只覆盖手写 YAML／直接编辑 JSON 的部署。
- **R22（最重要）：`config_env` 夹具是零模型条目的**（`test_rag_config_api.py:55-81` 写 `models_config.json = {"models": []}`、`_write_config_yaml()` `:39-43` 也写 `"models": []`），而 golden 的 `put.payload` 与 `test_judge_model_round_trips_as_a_regular_field`（`:264-280`）都声明 `judge_model: "judge-entry"` ⇒ **Task 9 的保存期错名映射会把既有的 200 打成 400**。修法照今天刚落地的先例：`_EndpointSeededClient`（`:90-101`）——**给夹具补条目，不放宽检查**。
- **R22：`parse_backend` 那条"warning 不含值"的断言其实不存在**：`test_rag_provider_config.py:114-127` 的 `:127` 只有 `assert "parse_backend" in caplog.text`，没有任何"值不出现"的断言 ⇒ Task 8 的保密要求是**新建**一条钉子，不是复跑既有的。
- **R21：配文生命周期四处实测**——重解析有**两处**残留（`_reparse_and_chunk():437` 的 `path_status` 只写 `{"vector":"pending","graph":"pending"}`、**不含 caption**；而 `_wipe_doc_chunks():414-431` 根本不动 `documents.error`）；`_append_error_marker()` 的幂等是**子串**比较（`marker in (document.get("error") or "")`），而标记文本含计数 `M/N` ⇒ 计数变了就不幂等；硬失败落盘 `:395-401` 是**覆盖写** `error=str(exc)[:500]`，会抹掉已追加的标记；`recaption_document():677-707` **没有 `finally`**，in-flight 释放靠 `:251-252` 的 `add_done_callback`，与 `eval/ondemand.py` 的 `_release_run()`（`:198-209`）是**两种不同机制**。
- **R23：D10.2 三条地址读法在本机实装版本上复核通过**（`langchain-anthropic 1.4.1` / `langchain-deepseek 1.0.1` / `langchain-openai 1.2.1`、`openai 2.32.0`、`anthropic 0.97.0`）：`ChatAnthropic.model_fields["anthropic_api_url"].default_factory()` → `https://api.anthropic.com`（**必须走 `default_factory()`，`.default` 是 `PydanticUndefined`**）、`langchain_deepseek.chat_models.DEFAULT_API_BASE` → `https://api.deepseek.com/v1`、`openai._constants` 的全部成员只有 timeout/retry/header 项、确无可读地址常量，`ChatOpenAI.model_fields["openai_api_base"].default` 与 `OpenAI.__init__` 的 `base_url` 默认都是 `None` ⇒ R1 的三格分裁站得住。
- **R25：judge 退役的受害者从"两个文件名"细化到用例级**，并排除两个假受害者——`test_eval_factory.py` 8 例中删／反转 3、重装 2（两条都传 `config=object()`，D3 之后要读 `config.rag`）；`test_ragas_eval_cli.py` 17 例中删／反转 4、重装 2，其中 `:86 test_config_value_error_maps_to_skipped` 走的是 `get_app_config()` 抛错的另一条 skip 路、**不是受害者**；`test_eval_cli.py` **零命中**（那是第一层 CLI），Task 7 的文件清单不含它是对的。另点名 **`test_ondemand.py:93-123` 是 Task 2 的受害者**（docstring `:94` 逐字写着"未配置为 None → 主模型"），此前两份文档都没写。
- **R26：`nightly.yaml:303` 传的就是被退役的 `--judge-model dashscope:qwen3.8-max` 本身**，不只是死 secret。失效链逐级核过（不是推测）：删掉 `JudgeKeyMissingError` 与 `run_ragas_eval.py:213-216` 的捕获后，`:212` 抛的 `ValueError` 无人接（`:187` 的 `except ValueError` 只包 `get_app_config()`；`_run()` `:252-260` 只有 stdout 重配那个 `except (AttributeError, OSError)`；`main()` `:279-292` 与 `sys.exit(main())` `:296` 都没捕获）⇒ traceback、退出码 1；而 nightly `:294` 是 `set -uo pipefail`（**无 `-e`**）、`:306` 只认 3、`:310` 只认 2 ⇒ 走到 `:314 exit 0`，**job 静默假绿**。**（R28②：这条链是 R27 之前、即"未加映射"时的反事实；已裁乙之后 Task 7 同批加映射 ⇒ 实际退 2、命中 `:310-313` 的 `::error::` ⇒ job 红着提醒。本条保留作那条裁决的证据，不改写。）**顺带核实 `REQUIRED_ENV_KEYS`（`run_ragas_eval.py:144`）只有嵌入／重排两把，不含 judge 钥匙 ⇒ `:266` 那个门禁是 nightly 自己的。

**⑦ 隔离、模板与真栈前提**：非 RAG 选模基线**按点数清为 7 处**（R24）：`lead_agent/agent.py:133`、`summarization_middleware.py:162` 与 `:716`、`tool_error_handling_middleware.py:361`、`client.py:301`、`models/factory.py:299`、`runtime/context_compaction.py:88`；另 `tools/tools.py:114` 也读 `config.models[0].name`。本期一处都不改，只加守卫。**R20 另点名两个"无名的 RAG 内部选模点"**：`knowledge/wiki/generator.py:210-212` 的 `_default_llm()` 与 `knowledge/eval/synthesis.py:141-143` 的 `_default_llm_factory()`，都是 `create_chat_model()` **不带 name** ⇒ `models[0]`，注释自称"uses the main model (first configured)"；本期**不接** RAG 默认，但 Task 2 的隔离守卫要点名它们，否则 D6 那句"其他未列 RAG 调用保留各自行为"无法验证。模板／文档的更新位置已按符号定位（`config.example.yaml:2564` / `:2578-2584` / `:2667`、`backend/AGENTS.md:703-723` / `:1188` / `:1211`、`UPSTREAM_README.md:957-958`、`rag_config.example.json:9`），**未运行任何用户配置升级**。**真栈前提本轮未确认**（服务未起、未选目标 A/B），按纪律留到 Task 5／9 当场核，不沿用历史模型名或"已经启动"的假定。

**已裁（乙，2026-09-26 用户拍；spec R27）**：CLI 错名不抛穿，同批加一条"错名 → stderr 一句可读原因 + 落一行 `status="error"` + `EXIT_ERROR`(2)"的映射（同文件 `:194-199` 的 `GoldenDatasetError` 已是这个语义，不是新造），理由是假绿比红贵；副作用是上游 nightly 会红而不是假绿——这正是想要的（D9 已写明不得声称上游已兼容）。**Task 7 据此实施。**

**遗留（不属本 Task）**：Task 0 是只读核实，所以"生产代码零改动"这一条本轮天然成立、无需 revert proof；后续每个实施 Task 仍要各自给 RED／neuter／还原证明与门禁数字。

---

## Task 1 — RAG 默认字段、加载链与纯 resolver

> 文件：`backend/packages/harness/deerflow/config/app_config.py` 的 `RagConfig`、`config/rag_config_file.py`、新增 `knowledge/model_target.py`；测试就近放 `test_rag_config*.py` / `test_app_config_reload.py` 与 RAG 模型目标测试，另含 `tests/fixtures/rag_config/response_golden.json`。现有 router 按 `RagConfigFile.model_fields` 自动生成响应，新增字段及来源的 golden 必须同批更新，不能留到 Task 3 让中途全量门禁失败。配置模板按 Task 0 核实的规则同步。本 Task 不改 `config/models_config.py`、公共模型工厂或顶层默认字段。
> **验收对应**：spec §4 的 1 / 2（解析单测）/ 3 / 13；PUT 冷热加载归 Task 3。

- [x] **RED：字段与加载**：无 RAG 文件、旧文件、空字段得到无 UI 覆盖；临时 YAML 的 `rag.default_model=A` 与临时 JSON 的 B 经真实加载得到 B，撤销 UI 覆盖得到 A，两者都无则为 None。显式 null／空串／**纯空白**都按 D2 归一为未声明：落盘文件里不出现该键，GET 的 `sources` 不报 `ui`、`config` 不回显空白值；不只构造 `AppConfig(...)` 验证。同一条 validator 对**三个**既有角色字段生效（`extract_model` / `judge_model` / `vlm_model`；`extract_model: " "` 视为未设置，不再炸成 `Model   not found in config`。**R18 后不含 `video.caption_model`**）。模型列表顺序及顶层模型配置不变。
- [x] **RED：响应形状**：以 Task 0 捕获的 RAG golden 为基线，GET／PUT 的 `config` / `sources` 仅新增默认字段，其余形状不变；测试默认值、UI／YAML 来源。新字段会随 schema 自动暴露，本条随字段落地，不等前端接线；VLM 删键仍归 Task 9。
- [x] **RED：resolver**：`resolve_rag_model_name(config, name=None, *, rag=None)` 接受明确角色名；有显式名则原样交下游检查，不用默认替换。无角色时依次取有效 RAG 默认／首项；仅默认失效回首项并 warning 点名，无模型返回 None 留 RAG 入口报错。`rag=` 对照使用 pending 而非旧 `config.rag`；helper 不构造 SDK／不出网。
- [x] **RED：自动热加载**：仅改变临时 RAG 默认字段及文件签名，`get_app_config()` 返回新配置，经真实 resolver 得到 B；用 loader 增次／新对象和 RAG 变更日志证明，不以强制 reload 代替。未改文件命中缓存；避开 ContextVar／custom 配置短路。其他模型配置文件不变。
- [x] **GREEN**：两层 RAG 模型声明字段；**空白归一用 `RagConfigFile` 上的字段 validator（空白→`None`），一处实现覆盖四个模型引用字段**（`default_model` / `extract_model` / `judge_model` / `vlm_model`，全在同一个类上，用同一个共享 validator／注解类型；**R18 后不含 `video.caption_model`**），在 `_prune_empty()` 之前生效，因此 PUT 不落键、GET 不报 `ui`；只在 resolver 里 strip 不算达标。实现 RAG resolver，同批更新默认字段与来源的响应 golden（**R19：`_ADDED_FIELDS` 是顶层白名单，嵌套新键只能改 golden，加名字进白名单不管用**），不改变原模型列表合并或宿主的 `create_chat_model(name=None)` 行为。缺省 YAML 无该项时为 None，不写用户文件。
- [x] **neuter：解析与加载**：依次还原为首项优先、忽略 `rag=`、丢弃 JSON 默认字段、去掉失效 warning，各有对应断言转红；把显式错名改成自动回落时，显式优先守卫转红；响应遗漏默认字段或来源时，形状守卫转红；**把 validator 换成 resolver 内的 strip**（文件仍存 `" "`、`sources` 仍报 `ui`）时，空白归一断言转红。每次独立还原并证明 GREEN 恢复，不以结构删除冒充旧行为。
- [x] **门禁**：ruff 双净；RAG 配置／API 形状／resolver／自动热加载窄面。配置共享加载路径有改动时跑后端全量，零新增失败。

**实测（2026-09-26 完成，RED→GREEN→七条 neuter→门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `54815ad6`（`feat/rag-knowledge-base`，2026-09-26）。**工作树并不干净**：`config.example.yaml` 的 provider 清单 3 行、`knowledge/endpoint_url.py`／`embedder_openai.py` 等属另一条线（rag-endpoint-dedup）的未提交改动，本轮门禁在那棵共享树上跑，**一处都没纳入本 Task**（提交时按 hunk 分开）。环境：Windows 10＋`uv run --no-sync`；`--basetemp=.pytest-tmp`（默认 `%TEMP%\pytest-of-h7242` 对本用户拒访、凡用 `tmp_path` 的用例成批 ERROR——既有环境条件），跑完即删。

**RED（新用例 26 条，红因三类、全部是"字段／模块不存在"而不是别的）**：`test_rag_config_file.py` 16 条红——`extra="forbid"` 拒未知键（加载直接 `ValueError`），且三个既有角色字段的空白当时也未归一（文件里的 `" "` 覆盖了 YAML 值）；`test_rag_config_api.py` 6 条红——4 条新用例的 PUT 收 422，另两条是**既有形状守卫**（`test_get_response_only_gained_the_capability_field` / `test_put_response_only_gained_the_capability_field`）被 golden 的嵌套新键翻红，这正是 R19 的设计（顶层白名单管不到嵌套键，只能改 golden；改完守卫仍能证明"其余字段一格没动"）；`test_model_target.py` 收集期 `ModuleNotFoundError`。

**GREEN**：三份测试文件 85 passed。生产改动＝`RagConfig.default_model`、`RagConfigFile.default_model` ＋ 单类 validator（`MODEL_REFERENCE_FIELDS` 四字段、`mode="before"`，在 `_prune_empty()` 之前生效）、新模块 `knowledge/model_target.py`（`resolve_rag_model_name` ＋ `_declared()` 空白判定；`rag=` 同时接受对象与 Mapping，因为保存期 pending 是 dict）、`response_golden.json` 四处嵌套注册、模板两处（`config.example.yaml` 的注释行与 `config_version` 38→39、`rag_config.example.json` 一行）。

**neuter（七条，逐条独立还原；每次还原后用 md5 证明四个文件逐字节回到 GREEN 态，跑完 grep 无 `NEUTER-` 残留）**：

| # | 还原的旧行为 | 转红条数 |
| --- | --- | --- |
| 1 | 链上不看 RAG 默认（回到首项优先） | 6（resolver 5＋加载 1） |
| 2 | 忽略 `rag=` | 2（两条快照用例） |
| 3 | `merge_rag_config` 丢掉文件里的默认字段 | 2（合并侧；API 侧走 payload 路径**不该红、也没红**） |
| 4 | 去掉失效默认的 warning | 1 |
| 5 | 显式错名自动回落 | 1（`…is_not_replaced_even_when_it_names_no_entry`） |
| 6 | 响应遗漏默认字段／来源 | 6（4 条新用例＋2 条形状守卫） |
| 7 | 去掉 validator、只留 resolver 内 strip | 14（12 个空白参数化＋无 YAML 兜底＋API 空白） |

第 7 条里 **`""` 那个参数保持绿**，正好佐证 `""` 由 `_prune_empty()` 兜住、纯空白才是 validator 的活。

**门禁**：ruff `check` 与 `format --check` 双净（7 个文件）。窄面（`tests/knowledge` ＋ `test_rag_config*` ＋ `test_app_config_reload`）**8 failed／1409 passed／2 skipped**，8 条**全部**证明为既有红、零新增——`test_app_config_reload` 的 2 条＝仓库根真实 `models_config.json`（把 `DEER_FLOW_MODELS_CONFIG_PATH` 指向空文件后转绿）；`test_indexer`／`test_reranker` 的 missing-key 2 条＝仓库根真实 `rag_config.json` 供了钥匙（`monkeypatch.delenv` 挡不住，隔离 `DEER_FLOW_RAG_CONFIG_PATH` 后转绿）；`test_rag_config_probe.py` 的 4 条**不是环境红**，用隔离法排除环境后又在 **detached 工作树（只有已提交代码）** 上复现同样 4 红——是上游 `090bbcbc` 把地址改为必填后该文件没跟上。（工作树那次对照第一次是**无效**的：venv 里 `_editable_impl_deerflow_harness.pth` 指向主仓，必须把工作树的 `packages/harness` 放到 `PYTHONPATH` 最前并先验 `deerflow.__file__`。）**全量：151 failed／12540 passed／109 skipped（18 分 19 秒）＝既有基线 145 ＋ 6 条仓库根配置条件红，零新增。** 方法是「抽 node id → HEAD 跑同一批 → 双向 diff 集合」：把 151 个 id 在 detached 工作树上复跑，**145 个在 HEAD 上同样红**（反向 diff 为空，即没有一条是"HEAD 红而我不红"）；剩下 6 条全属本机仓库根真实配置文件那一族，工作树里因为没有那些 gitignored 文件而通过——`test_app_config_reload` ×2／`test_doctor` ×1／`test_models_config` ×1＝根 `models_config.json`（前三条把 `DEER_FLOW_MODELS_CONFIG_PATH` 指向空文件即转绿；第四条自己 **删掉**该环境变量 ⇒ `resolve_config_path()` 走项目根搜索、绕不过去，只能靠工作树对照），`test_indexer`／`test_reranker` 的 missing-key ×2＝根 `rag_config.json` 供了钥匙（隔离后转绿）。这一族在历史记录里是 3 条，随 HEAD 前进长到 6 条。

**发现（本轮新出，四条）**：
- **PUT 响应里 `config` 与 `sources` 会自相矛盾**（既有、非本期引入）：`rag_config.py:418` 把 `Depends(get_config)` 的**写入前**快照交给 `_build_response`，于是载荷省略的字段回落成旧值，而 `sources` 已按新文件报 `config_file`。**不是用户可见缺陷**：唯一消费者 `useSaveRagConfig` 的 `onSuccess` 只 `invalidateQueries(["ragConfig"])`（`core/rag/hooks.ts:49-50`），表单从 GET 重新播种。影响所有字段、不止新字段；**未改**（超出本 Task）。
- **空白脚枪的覆盖面要分开说**：spec §6.2 把"炸成 `Model   not found in config`"的修复记在 validator 名下——**对 `rag_config.json` 成立**；直接写在 `config.yaml` 里的 `" "` 要等 Task 2／6／9 把 resolver 接上才成立（`_declared()` 把纯空白当未声明）。两个载体、同一结局，单独看本 Task 时 YAML 侧那条仍会炸。
- **`config_version` 38→39，连带查出一条既有红**：`scripts/check_config_version.sh` **今天就是红的**（chart `deploy/helm/deer-flow/values.yaml:243` 停在 37，而 example 已是 38）——`03d10dca` 升 example 时漏了 chart（chart 与 chart README 两处）。本轮升到 39 不改变该门禁的判定（仍同一处、同一个修法：chart 一并升）。**未动 chart**：它不在本期任何 Task 的文件清单里。
- **本 Task 只交付 resolver，尚无消费者**：抽取／裁判在 Task 2 接、配文在 Task 6 接，所以"改 RAG 默认真的换来换目标"要到那两个 Task 才可验；本轮能验的是 resolver 本身的七条行为。

**遗留（不属本 Task）**：① 发现①（PUT 响应回显旧值）与发现③（chart 版本落后）待裁定归属；② `test_rag_config_probe.py` 的 4 条预存红需要归属——上游 rag-endpoint-dedup 线正在改 `embedder_openai.py`／`endpoint_url.py`，可能正是它的收尾面；③ 本机新增一条环境条件红 `test_config_version.py::test_version_26_config_upgrades_to_checkpoint_channel_mode`（`bash` 被解析到 WSL 空壳、`execvpe(/bin/bash) failed`；在 HEAD 工作树上同样红），已计入全量的 145。

---

## Task 2 — 抽取／裁判接线与非 RAG 隔离

> 文件：`knowledge/graph/extractor.py`、`knowledge/eval/factory.py` 及确有需要的 RAG 调用接缝；测试抽取／评测及非 RAG 隔离，**含既有的 `tests/knowledge/eval/test_ondemand.py`（R25，见下）**。公共 factory、聊天组件、agent、IM／scheduler、memory／摘要／goal 生产文件不改；**`knowledge/wiki/generator.py` 与 `knowledge/eval/synthesis.py` 也不改**（R20，它们是两个"无名选模点"，只作隔离对照）。VLM 继承归 Task 6，judge 直连删除归 Task 7，严格缺项检查归 Task 9。
> **验收对应**：spec §4 的 2 / 3 / 7，以及 9 的答题模型隔离。

- [x] **RED：抽取／裁判真实入口**：模型列表首项 A、RAG 默认 B、角色 C、显式裁判参数 D 互不相同。经 `get_extract_llm()` 与 `build_judge_llm()` 验证 D3 各层优先级、默认失效和无模型；普通未知条目名不被回落掩盖。观察传入真实工厂的名称与配置，桩放 SDK 边界，不把 resolver 整体换常量。暂保留的 `dashscope:` 直连例外由 Task 7 单独反转。**既有用例 `test_ondemand.py:93-123 test_layer2_deps_judges_with_the_configured_judge_model` 是本 Task 的受害者（R25）**：它用 `SimpleNamespace(rag=SimpleNamespace(judge_model=None))`（`:119`）断言"未配置 → 主模型"、docstring `:94` 逐字写着 `未配置为 None → 主模型`，而 D3 之后是 RAG 默认 → 首项 ⇒ 同批改断言与 docstring；`:116`（有 `judge_model`）仍有效，`:123`（空串）要连同 D2 的 validator 一起核。别等 RED 写完才发现它红。
- [x] **RED：检索期第二个消费者（R12）**：经 `graph_search` 的核心实现（`tools/builtins/graph_search_tool.py:199` 的 `llm = llm or get_extract_llm()`）验证同一套优先级——A→B 后它拿到 B，且**该文件一行未改**（形参可选即生效，用源码级钉子或 diff 断言）。它不在 `knowledge/` 下，最容易被漏；不能只测 `extract_graph()` 就宣称抽取角色已全覆盖。桩放 SDK 边界与检索 IO，不跑真实向量库。
- [x] **RED：配置快照与后续任务**：默认 A→B 后新构建的 RAG 角色用 B，已构建调用目标不变；检查和构建使用同一配置快照，不让工厂自行重读全局配置。不新增跨任务缓存、不自动重跑旧文档或评测。
- [x] **守卫：答题与宿主隔离**：只改变 RAG 默认、其他配置完全相同，RAG 目标必须改变；配对检查普通聊天、知识库聊天**主模型**、sidecar、引导、IM／定时任务、记忆、摘要／goal、能力判断的实际选择接缝保持 Task 0 基线。**基线已按点数清为 7 处（R24），逐点断言、不笼统写"聊天不变"**：`lead_agent/agent.py:133`（`_resolve_model_name`）、`summarization_middleware.py:162`（`_default_model_name`）与 `:716`、`tool_error_handling_middleware.py:361`、`client.py:301`、`models/factory.py:299`（`name is None` 分支）、`runtime/context_compaction.py:88`；另 `tools/tools.py:114` 也读 `config.models[0].name`。可在隔离测试中用同一配置快照驱动入口，不需要真实 IM 或定时执行；明确记录各断言覆盖的调用点，不把只测工厂说成已测完所有入口。已知旧差异不在本 Task 修复。**`graph_search` 的内部小模型不属这份隔离清单（R12）**：它走 `get_extract_llm()`，属上一条的正向生效面；把它写进“聊天不变”会钉死一个假断言，Task 9 的严格检查一上线就自相矛盾。
- [x] **守卫：其他功能模型隔离**：同一 A→B 场景下，embedding／sparse／rerank／parse／ASR 的目标与参数保持不变；评测中 judge 改变而答题 agent／CLI 答题模型不变。**R20 另点名两个"无名的 RAG 内部选模点"，各一条负向断言（A→B 后它们的构建目标不变）**：`knowledge/wiki/generator.py:210-212` 的 `_default_llm()` 与 `knowledge/eval/synthesis.py:141-143` 的 `_default_llm_factory()`，都是 `create_chat_model()` **不带 name** ⇒ 落到 `models[0]`，注释自称 "uses the main model (first configured)"。本期**不接** RAG 默认，但没有这两条断言，D6 那句"其他未列 RAG 调用保留各自行为"就无法验证——而它们在 `knowledge/` 里，最容易被当成"已经接了"。各负向对照与一个真实 RAG 正向断言配对，不只断言“调用次数为零”。
- [x] **GREEN**：抽取用有效 `extract_model`，裁判先取显式参数再取 `judge_model`，随后由 RAG resolver 选定明确名称，处理无模型后传原工厂与同一配置。**`get_extract_llm()` 今天不接参数**（`graph/extractor.py:112-117` 内部自己 `get_app_config()`），为把同一快照交给工厂需新增**可选**形参（默认 `None` → `get_app_config()`）并透传 `create_chat_model(app_config=…)`；`extract_graph(llm=None)`（`:120-123`）与 `index_document_graph(llm=…)` 的既有调用点／用例因此不必改，**`tools/builtins/graph_search_tool.py:199` 同样不必改但会跟着变（R12）**——不改它是形参可选的结果，不是它被排除在本期之外。`build_judge_llm(judge_model, *, config)` 已有该形参，不动签名。只改 RAG 角色调用链，不接线其他消费者。
- [x] **neuter：接线与隔离**：分别恢复抽取／裁判旧首项回落、让显式参数被 RAG 默认覆盖、让构建重新读另一份配置，记录各自受害者。仅在临时行为变异中让一个宿主选择接缝误吃 RAG 默认，配对隔离测试必须转红，随后完整还原；不能把这类变异当作扩大实施范围的许可。
- [x] **门禁**：ruff 双净；抽取／评测／配置及隔离窄面、后端全量零新增失败。前端无生产改动，相关聊天 dom 守卫按 Task 0 实际测试入口执行。

**实测（2026-09-26 完成，RED→GREEN→五条 neuter→门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `bfed5529`（`feat/rag-knowledge-base`，Task 1 那笔）。工作树同样带着别线的 ` M docs/superpowers/specs/2026-09-12-…`（未纳入）。环境同 Task 1（`--basetemp=.pytest-tmp`，跑完即删）。**本 Task 落地前先跑了 7 个入口的探针**（`AppConfig(models=[A,B])` ＋ `rag.default_model` 合成快照），确认哪些能便宜地直接驱动——结论见「隔离覆盖表」，这条不做的话隔离守卫会写成一片猜。

**RED（13 条红，全部是"接线不存在"）**：`tests/knowledge/test_rag_model_wiring.py` 的优先层级、同快照、无模型拒绝对（抽取 4＋裁判 4＋快照 2＋拒绝 2）全红，红因是 `get_extract_llm()` 当时**完全忽略传入的配置**（内部自己 `get_app_config()`）、`build_judge_llm(None)` 把 `None` 直接交给工厂。同期新建的 `tests/test_default_model_isolation.py` **初始即绿**（14 条）——按本 plan 的口径，纯守卫初始为绿如实记载，牙由 neuter N5 给。

**GREEN**：`tests/knowledge/test_rag_model_wiring.py`（17 条）＋ `tests/test_default_model_isolation.py`（15 条）＋ `tests/knowledge/eval/` ＋ `tests/knowledge/graph/` 共 **445 passed**。生产改动＝`model_target.py` 新增 `require_rag_model_name()`（无模型 → `RagConfigurationError`，类型从 `embedder.py` 惰性导入以保持本模块纯净）、`get_extract_llm(app_config=None)` 接可选快照并透传 `create_chat_model(app_config=…)`、`build_judge_llm` 改走 resolver（`dashscope:` 直连分支原样保留给 Task 7）、外加**三处 docstring**（见发现②）。

**neuter（五条，逐条独立还原；每次还原后用 md5 证明五个文件逐字节回到 GREEN 态，跑完 grep 无 `NEUTER-` 残留）**：

| # | 还原的旧行为 | 转红条数 |
| --- | --- | --- |
| 1 | 抽取回到旧首项回落（拿掉 resolver） | 5（4 个优先级里除显式名外的 3 个＋快照＋拒绝） |
| 2 | 裁判回到旧首项回落 | 6（含**刚修好的那两条**受害者用例 ⇒ 修复不是化妆） |
| 3 | RAG 默认盖过显式参数 | 3（`[D-C-B-D]` ＋ 两条既有 `test_config_model_name_delegates_to_factory`） |
| 4 | 构建重读全局而非传入快照（两个入口都变异） | 14（快照断言＋所有依赖传入配置的期望） |
| 5 | **宿主接缝误吃 RAG 默认**（`_resolve_model_name`） | 1（**正是配对的那条隔离断言**） |

第 1 条里"显式名"两个参数保持绿——它们本来就不经过回落，这正好说明断言是按层分开的。**一条过程教训（记下来免得下次再踩）**：N1 的还原我图快用了 Python 文本往返（`read_text`／`write_text`），而 `extractor.py` 在工作树里是 **CRLF** ⇒ 往返把它静默归一成 LF，md5 基线当场对不上。判定方式是**从 HEAD 重建**（HEAD 字节 ＋ 我预期的三处替换）再逐字节比对：重建结果与当前文件完全相同 ⇒ 内容没问题、没有残留 neuter，差的只是换行。**结论：neuter 的还原一律用 Edit 工具，别用 Python 文本往返**（`.gitattributes` 是 `eol=lf`，提交时 git 反正会归一，所以这只是一次不影响产物的绕路）。

**隔离覆盖表（`tests/test_default_model_isolation.py`，15 条）**：两份快照只差 `rag.default_model`，模型 `[A(视觉), B]` 且 A 是首项，于是每个接缝"有没有被 RAG 默认带跑"都是一行比较。

| 点 | 驱动方式 | 观测 | 结果 |
| --- | --- | --- | --- |
| `lead_agent/agent.py:133` | `_resolve_model_name(None, app_config=…)` | 返回值 | 两份都快照 → `A` |
| `models/factory.py:299` | `create_chat_model(name=None, app_config=…)` | 客户端 `model_name` | 都是 `A-wire` |
| `tools/tools.py:114` | `get_available_tools(None, False, None, False, app_config=…)` | `view_image` 是否在表里 | 都在 |
| `tool_error_handling_middleware.py:361` | `build_subagent_runtime_middlewares(app_config=…)` | 链里有无 `ViewImageMiddleware` | 都有 |
| `summarization_middleware.py:162` | 未绑定调用 `_default_model_name(SimpleNamespace(_app_config=…))` | 返回值 | 两份都 → `A` |
| `runtime/context_compaction.py:88` | `asyncio.run(_aresolve_thread_model_name(None, None, None, …))` | 返回值 | 两份都 → `A` |
| `summarization_middleware.py:716`、`client.py:301` | **源码钉子**（无法便宜驱动：前者要 enabled 的摘要配置走完整工厂、后者要构造活客户端） | 两文件都有 `models[0].name` 且**不出现 `default_model` 字段** | 通过 |
| embedding／sparse／rerank／parse／ASR | 5 个文件的源码钉子（`embedder_factory` / `reranker_factory` / `providers/__init__` / `parse_local` / `video/asr`） | 不出现 `default_model` 字段 | 通过 |

两点措辞更正：**`tool_error_handling_middleware.py:361` 在 `build_subagent_runtime_middlewares` 里**（:307 起），即**subagent 链**的能力判断，不是 lead 链（lead 的那份在别处）；钉子的正则必须用 `\bdefault_model\b`，因为 `_default_model_name` 含该子串，纯 `grep default_model` 会把 3＋5 处变量名当成泄漏。

**发现（本轮新出，四条）**：
- **R25 把两条受害者归错了 Task**：`test_eval_factory.py::test_default_none_uses_primary_model` 与 `test_ragas_eval_cli.py::test_default_none_uses_primary_model` 在 R25 里记作 **Task 7** 的受害者，但它们的红因是"D3 之后 `judge_model=None` 要读 `config.rag`"——那是**本 Task** 的改动（Task 7 只退役 `dashscope:` 分支）。已在本 Task 按 R25 预写的修法修掉（换成带 `.rag`/`.models` 的临时配置、改名为 `…_falls_back_to_the_rag_default`），并用 N2／N3 证明修好的用例真的有牙。
- **三处 docstring 在本 Task 之后就成假话，已同批改**：`eval/factory.py` 模块头的 ``None`` 用 config 主模型、`eval/ondemand.py:400` 的"由工厂回退到 config 主模型（既有行为）"、`tests/knowledge/eval/test_ondemand.py:94` 的"未配置为 None → 主模型"。**但 `backend/AGENTS.md:1211` 的同款句子没有改**——plan 把它排在 **Task 7**（R20），而它从本 Task 起就已过期；Task 7 实施时要知道它是**现在已经错**，不是"届时才失效"。
- **`test_ondemand.py:93-123` 的机械断言不用改**：它断言 `seen == ["judge-entry", None, None]`（角色声明被原样转交），本 Task 之后照样成立——真正过期的是那句话的**含义**（docstring），不是 `seen` 的内容。R25 说"同批改断言与 docstring"，落地时只有后者需要动。
- **`graph_search` 的第二消费者按 R12 零改动成立**：驱动 `_graph_search_impl(..., llm=None)`（检索 IO 全打桩、查询实体那步抛哨兵）证明它取的 llm 来自 `get_extract_llm()`，且**调用时不带任何参数**；再加一条源码钉子钉住 `llm = llm or get_extract_llm()` 与"该文件不出现 `default_model`"。

**门禁**：ruff `check` 与 `format --check` 双净（`knowledge/` 全树 ＋ 两处测试面）。窄面（`tests/knowledge` ＋ 隔离 ＋ lead/compaction/summarization/view-image）**2 failed／1393 passed／3 skipped**——两条都是 Task 1 已定性的仓库根 `rag_config.json` 条件红（`test_indexer`／`test_reranker` 的 missing-key），零新增。**全量：152 failed／12574 passed／109 skipped（19 分 29 秒）**。passed 比 Task 1 那次 +34 ＝本 Task 新增 32 条（17 接线 ＋ 15 隔离）＋修好的那两条受害者；failed 152 ＝ Task 1 的 151 条集合**逐条不变**＋**1 条随机化 flake**（`test_delta_channel_state.py::test_merge_message_writes_randomized_differential`，差分随机数测试，与模型选择无关；连跑 3 次全过。**这条是"老熟人"**：本线之前两次全量也各撞到它一次，本机 failed 数在两者间浮动）⇒ **零新增真失败**。

**遗留（不属本 Task）**：① `backend/AGENTS.md:1211` 的句子归属与时机待裁（见发现②）——**2026-09-27 已收口：那半句随 Task 3 的收尾批改掉，Task 7 只剩 `dashscope:` 那半句**；② RED ⑤ 的"评测中 judge 改变而答题模型不变"由**点 1**（`_resolve_model_name` 两份快照都选 A）＋ CLI 的 `--agent-model` 是操作者显式字符串共同覆盖，没有单独驱动一次完整评测运行。

---

## Task 3 — RAG API 与表单整对象契约

> 文件：`backend/app/gateway/routers/rag_config.py`、必要的 RAG 配置字段元数据；`frontend/src/core/rag/{types,config-form,hooks}.ts` 按实际所需修改。测试 RAG API／reload／golden、`unit/rag/config-form.test.ts` 和现有 hook 测试。本 Task 不改公共模型 API、管理 API、`core/settings` 或聊天模型偏好。
> **验收对应**：spec §4 的 1 / 4 / 5 / 6（表单状态）/ 13。

- [x] **RED：RAG 往返与整对象语义**：PUT 新名称→落盘→GET 的 `config` / `sources` 可见；省略／null／空串／纯空白撤销 UI 默认，分别验证 YAML 有／无同名 RAG 默认。空白归一由 **Task 1 的 validator** 承重，本 Task 只验端到端结果（文件里不落该键、`sources` 不报 `ui`），不在 router 里另加一层 strip。PUT 后真实冷加载、只改 RAG 文件后的自动热加载均通过 Task 1 resolver／Task 2 入口观察目标；字段不会出现在模型配置文件中。
- [x] **RED：来源带回与清空**：`formValuesFromConfig()` 读取新字段；编辑另一个 RAG 设置保留 UI 所有的默认，但不固化未编辑 YAML 默认。**`{}` 那条要按 Task 0 核到的机制写准，别写成"清空就发 `{}`"**：`buildRagConfigInput()` 的 TEXT 循环（`config-form.ts:200-213`）在 `:210-212` 是 `if (next !== "" || owned(view, key)) input[key] = next` ⇒ **只有当没有任何字段是 UI 覆盖时载荷才是 `{}`**；还有覆盖时，被清空的那个字段会以 `""` 送出（靠空串撤销覆盖），不是靠省略。所以两条断言分开写：① 被清空的字段**以 `key: ""` 送出**（文件拥有它时；`owned` 为真 ⇒ 走 `:210-212` 的 `next !== "" || owned` 分支），**不是 `{}`——`{}` 只在"什么也没改、且文件什么都不拥有"时出现，Task 3 的实测已把 2026-09-26 那句写反的措辞改正**；② 还有其他 UI 覆盖时被清空的那个 ⇒ 载荷含 `key: ""` 且不含其他未编辑字段。能否保存用 `hasFormChanges()`（`:506-520`，判据在 `:513-518`），不拿 `{}` 直接判未编辑。覆盖“清 UI 默认后重新继承 YAML”与“清角色 UI 值后 YAML 角色仍优先”，不把空选择器等同最终空角色。
- [x] **守卫：权限、形状与钥匙**：复用 Task 1 已增加默认字段及来源的 golden，本 Task 不再增加响应键，**也不提前删 Task 9 的三个退役键**（两个顶层 VLM 键＋嵌套的 `video.caption_model`）。RAG admin 权限不变；公共／管理模型 API 形状不新增默认字段。复跑原秘密掩码保留，载荷不新增钥匙或模型数组；本期不保证修复宿主模型保存的 `$VAR` 引用问题。
- [x] **RED／守卫：文件与网络隔离**：临时模型配置／YAML／扩展配置在 RAG 保存前后字节不变；默认变更不改 embedding 签名，探针和 SDK 构造计数为零。以真实嵌入字段变更触发既有探针作正向对照，不用全局空桩吞掉探针。新增目标检查留 Task 9，届时复跑零新增网络守卫。
- [x] **GREEN**：把默认字段接入 RAG wire／form 的明确字段列表、加载映射、来源带回和原保存链；复用 RAG 原子写入、锁、掩码与刷新机制，不新建即时保存 mutation 或改造模型目录事务。仅在新字段确实需要处调整 hook。
- [x] **neuter：保存语义**：把省略字段改成保留旧 UI 默认、遗漏默认的 carry-forward、把未编辑 YAML 值写成 UI、把 `{}` 一律当无变化，分别令对应断言转红；让默认被错误列入 embedding 签名时零探针守卫转红。逐个还原并复跑。
- [x] **门禁**：后端 ruff 双净、RAG router／reload 窄面；前端 `check`、RAG form／hook 窄面及全量。涉及共享配置路径的后端全量零新增失败；响应形状维持 Task 1 基线。

**实测（2026-09-27 完成，RED→GREEN→五条 neuter→门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `0bcc818d`。**本 Task 的红只在前端**：后端那半在 Task 1／2 之后已经通了（字段早在响应里、PUT 早就能收、入口早就能读），所以后端的两条是**纯守卫、初始即绿**（按本 plan 的口径如实记载，牙由 neuter 5 给）。工作树同样带着别线的 ` M docs/superpowers/specs/2026-09-12-…`（未纳入）。

**RED（前端 7 红／1 绿，红因全是"字段不在表单里"）**：`tests/unit/rag/config-form.test.ts` 新增 `describe("RAG default model")` 8 条：7 条红（`formValuesFromConfig` 不映射该字段、不在 `TEXT_FIELDS` ⇒ 取值 `undefined`、提交载荷缺键、`hasFormChanges` 看不见它），1 条**天然绿**（"不固化 YAML 来源的默认"——该字段根本不在循环里，所以"什么都不做"恰好等于期望；它的牙由 neuter 3／4 给）。

**GREEN**：生产改动 3 个文件、共 4 处——`types.ts` 的 `RagConfigValues.default_model`、`config-form.ts` 的 `RagConfigFormValues.default_model` ＋ **`TEXT_FIELDS` 一项** ＋ `formValuesFromConfig` 一行。**只有这些**：进 `TEXT_FIELDS` 之后，"新建覆盖／带出文件覆盖／空串撤销覆盖／`hasFormChanges` 判改动"四条全部由既有循环自动获得（spec D2 的 R4 结论），本 Task **没有**为它另写一套保存逻辑，也没碰 hook 与视图。前端 `config-form.test.ts` **64 passed**；后端 `test_rag_config_api.py` ＋ `test_rag_config_save_probe.py` **55 passed**。

**neuter（五条，逐条独立还原；每次还原后用 md5 证明三个文件逐字节回到 GREEN 态）**：

| # | 还原的旧行为 | 转红条数 |
| --- | --- | --- |
| 1 | 清空写成"省略该键"（＝后端读作保留旧 UI 默认） | 4（含我两条撤销用例与既有两条清空用例） |
| 2 | 丢掉文件自有覆盖的 carry-forward | 4 |
| 3 | 把未编辑的 YAML 值也写成 UI 覆盖（carry-forward 不再看 `owned`） | 14（最宽的一条，连"什么也没改就不该有载荷"都红） |
| 4 | 只写文件拥有的字段（`owned` 之外的挑选被丢掉） | 8（含"为操作者字段挑一个值"与"不固化 YAML 默认"） |
| 5 | 把 `default_model` 错列进 `_WATCHED_EMBEDDING_FIELDS` | 1（**正是那条零探针守卫**） |

**门禁**：后端 ruff `check`＋`format --check` 双净、RAG router／reload 窄面绿（`test_rag_config_api.py`／`test_rag_config_save_probe.py` 55 passed，响应形状维持 Task 1 基线）。前端 `pnpm check` **零诊断**；RAG form／hook 窄面 **129 passed**；**前端全量 243 文件／2636 passed**。

**发现（本轮新出，三条）**：
- **plan 这条 RED 的 ① 写错了**：「唯一那个 UI 覆盖被清空 ⇒ 载荷是 `{}`」——代码不是这样，**既有用例**（`clears a file-owned field explicitly` 断言 `{ rerank_model: "" }`）、**Task 0 自己的结论**（"只有**没有任何 UI 覆盖字段**时载荷才是 `{}`；有覆盖时被清空的字段会以 `""` 送出"）与它三处冲突。按实况写用例：撤销唯一的文件覆盖 ⇒ `{ default_model: "" }`；`{}` 只出现在"什么也没改且文件什么都不拥有"。**本条 RED 的其余部分（`{key: ""}` 那条分法）是对的**，所以只错在 ①。
- **prettier 的 printWidth 是默认 80**（`prettier.config.js` 只挂 tailwind 插件、无覆盖），而这两个源文件与测试文件的历史行是按 ~100 手写的 ⇒ 文件本身有预存格式债（**HEAD 版本就被 flag**）。按纪律**只重排我自己新写的 6 处**（`git show HEAD:` 取出的副本作对照，确认剩余 flag 全部落在历史行），历史行一处未动。
- **`_WATCHED_EMBEDDING_FIELDS` 不含 `default_model`** 这件事本来就是对的，所以"改默认不出网"这条守卫初始即绿——但它值得留着：neuter 5 证明它一旦被加进去就会红。

**全量：152 failed／12578 passed／109 skipped（22 分 20 秒）**。判据是**集合**不是条数：与 Task 2 那次的 152 条失败**逐条相同**（双向 diff 皆空）⇒ **零新增真失败**；passed +4（本轮新增 3 条用例，另 1 条差额未定位——两次运行与 `--collect-only` 之间 collected 数在 **12834／12835／12839** 间浮动，而 collect-only 连跑三次都是 12834、失败集合又完全一致，所以这条差额既不是新增缺陷也不是缺失用例，**原因未查明、留待观察**）。

**遗留（不属本 Task）**：① ~~**plan 那条 RED 的 ① 措辞待改**~~——**2026-09-27 已改**（原文已按实况重写：被清空的文件覆盖以 `{key: ""}` 送出，`{}` 只在"没改动且文件什么都不拥有"时出现）；② collected 数的浮动（12834／12835／12839）原因未查明。

---

## Task 4 — 功能视图顶部控件与 RAG 文案

> 文件：`frontend/src/components/workspace/settings/functional-models-view.tsx`、locales `types.ts` / `zh-CN.ts` / `en-US.ts`；测试 **两份** dom 文件——`tests/unit/settings/functional-models.dom.test.tsx`（1533 行／65 例）与 **`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`（369 行／12 例，R20：直接渲染该视图、i18n 用 Proxy mock，此前两份文档都漏了它）**——及现有模型页组合测试。`models-settings-page.tsx` 的全局标题结构与模型管理保存逻辑不改。
> **验收对应**：spec §4 的 6；几何归 Task 5 / 9 真浏览器。

- [x] **RED：位置与候选**：功能视图内部顶部有“RAG 默认模型”；切到对话视图后不存在，总标题没有第二个控件。**候选源钉死**：用 `useModels()` 的 `models` + `modelReferenceOptions()`，与抽取行 `modelReferenceOptions(models, values.extract_model, F.extractModelNone)`、裁判行 `modelReferenceOptions(models, values.judge_model, F.judgeModelNone)` 同源；**不是**配文行的 `managedModels` + `visionReferenceOptions(managedModels, values.vlm_model, F.vlmModelDefault)`。断言按符号定位，不按行号（HEAD `090bbcbc` 刚重排过该文件，行号为 `:926` / `:953` vs `:527-532`）。断言含只读（config.yaml）条目、含不声明视觉的条目，即不按视觉过滤。现有 VLM 选择器过滤不变；从宽列表选出的默认不出现在配文行候选里时，配文行仍显示“（使用配置默认）”。无模型、加载、无权限、未知已存名称均沿用表单处理，不隐瞒未知值或扩大权限。**这里不需要新造"无模型空态"（R24，已撤回的待裁点）**：`modelReferenceOptions()`（`config-form.ts:483-500`）**永远**先塞一个空选项（`:489` 的 `{value: MODEL_REFERENCE_NONE, label: noneLabel}`），且把一个指不到任何条目的已存值保留成额外一项（`:496-498`，注释写明 "so opening the form cannot silently clear it"）⇒ 无模型时候选里就是那一个空选项，未知已存值也不会被打开表单悄悄清掉。所以"沿用表单处理"的字面意思就是**一行生产代码都不加**；不要新增空态组件、不要新增 i18n key。视图已有的三态处理核过位置：loading `:512-514`、无权限 `:515-517`、error `:518-520`。
- [x] **RED：草稿与原保存按钮**：改选只改草稿、未点击保存不发 PUT；点击既有保存后仅发 RAG 整对象载荷，带 `default_model` 和其他 UI 覆盖，不带 `models` 数组，不调用模型管理 API。重开读回；清空按 D2 继承；无变化／保存中不能重复提交，失败仍保留草稿与错误。**"失败"的呈现机制已核实（R20）**：保存失败**不在视图里渲染**，而是 `core/rag/hooks.ts:52-53` 的 `useSaveRagConfig` `onError: toast.error(error.message)`；视图侧只有保存前的 warning／阻断文案（`functional-models-view.tsx:1191-1195` 的 save-warning、`:1200-1202` 的 block reason、`:1203-1205` 的 no-changes hint、`:1209/1211` 的 saving 态）。所以"失败保留草稿"要断言**草稿状态没被回滚**＋ mutation 进了 error 态，不要去视图里找一句错误文本。
- [x] **RED：i18n 与角色解释**：三条默认行文案逐字按 spec D5 表，中英文与类型齐全；相关角色说明写明“有效角色为空才继承”，**视频与图片是同一条链（R18）**——都写 `vlm_model → RAG 默认 → 首项`，**不要再写"视频先图片 VLM 再 RAG 默认"**（那句话依赖已退役的 `video.caption_model`）。原“（使用配置默认）”保持（现有三处：`extractModelNone` / `judgeModelNone` / `vlmModelDefault`，三份 locale 各 99 键、键集相同，**没有 `video.caption_model` 的键**，所以退役它不产生 i18n 缺口）；不改聊天选择器用词，不修改历史已交付文档。
- [x] **GREEN**：复用功能视图原标签／值布局、Select 与提示组件，接 Task 3 的草稿字段和既有保存状态。新增默认文案及必要角色说明同步三份 locale，不另建服务或编辑入口。
- [x] **neuter：位置／保存／隔离**：把控件移出功能视图或让两个视图常驻、改回即时 PUT、改发模型管理载荷、过滤掉非视觉默认候选、**把候选源换成 `managedModels`／`visionReferenceOptions()`**，各有对应结构／行为断言转红；D5 文案改动使相关文本断言转红。不得用像素断言代替这些行为。
- [x] **门禁**：`check`、RAG form 窄面、**两份功能视图 dom 文件都要跑**（`tests/unit/settings/functional-models.dom.test.tsx` 与 `tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`，R20：只跑前一份会漏掉直接渲染视图的那 12 例）、模型页组合窄面、前端全量通过。后端无新增改动，不以重复后端门禁代替浏览器验收。

**实测（2026-09-27 完成，RED→GREEN→七条 neuter→门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `1cbc340e`。前端首次动到"用户看得见"的层：`functional-models-view.tsx` ＋ 三份 locale（`types.ts` / `zh-CN.ts` / `en-US.ts`）。**后端零改动、也没跑后端门禁**（本 Task 没有后端面）。

**RED（8 红／2 绿，红因全是"行或键不存在"）**：新增 11 条用例——小文件（Proxy i18n，结构类）6 条、大文件（真 locale，文案与保存类）5 条。红的 8 条是"找不到 label `defaultModel`"与"D5 键是 `undefined`"；**两条初始即绿**：大文件的"保存失败不回收草稿"（它只用既有字段，属守卫）与小文件的"只改草稿"（源码钉子，见下）。

**GREEN**：`functional-models-view.tsx` 在视图根部（既有 Groups 之前）插入一个 **`Group`**——`title={F.defaultModel}` ＋ `info={F.defaultModelHint}`，内容区放 `Select`（候选 `modelReferenceOptions(models, values.default_model, F.defaultModelNone)`、`onValueChange` 只 `update("default_model", …)`）。**形态由用户当场改过一次**：初版照 D4 草图做成裸 `ROW`（标签＋ⓘ＋控件一行），用户裁定「先包 Card 再看观感」⇒ 改成与其他分区同款的 `Group`（Card ＋ 标题 ＋ ⓘ），冻结的三条文案一条没变（标签成了卡片标题、说明成了它的 ⓘ）。三份 locale 加 `defaultModel` / `defaultModelNone` / `defaultModelHint`（D5 逐字）**并把三条角色说明改成 D3 口径**（原文→改成见下）。两份 dom 文件 **88 passed**。

**D5 文案（逐字落盘，测试硬编码钉住）**：`RAG 默认模型`／`（使用配置默认）`／"用于图谱抽取、评测裁判、图片与视频配文未单独指定模型时的选择，不影响聊天主模型及其他功能；此项留空时使用配置中的 RAG 默认，配置也未指定则使用模型列表第一项。"（en 对应 `RAG default model` / `(config default)` / D5 英文句）。

**三条角色说明的改动（D5 第 142 行要求"就近说明须对齐 D3"，措辞由本轮起草、可撤）**：

| key | 原文（zh，节选） | 改成（zh，节选） |
| --- | --- | --- |
| `groupEvaluationHint` | "…与对话里选的模型无关；**留空则用配置里的主模型**。" | "…与对话里选的模型无关。**留空先撤掉本行的覆盖，配置里为它指定的值仍然生效；两边都空才由 RAG 默认模型接手**。" |
| `captionModelHint` | "…取自所选模型条目；**留空则用配置里的默认 VLM**。仅列出支持视觉的条目…" | "…取自所选模型条目；**留空先撤掉本行的覆盖，配置里为它指定的值仍然生效，两边都空才由 RAG 默认模型接手**。仅列出支持视觉的条目…" |
| `extractModelHint` | "…建议选小、便宜、输出稳定 JSON 的模型。"（**未说明留空行为**） | 原文 ＋ "**留空先撤掉本行的覆盖，配置里为它指定的值仍然生效；两边都空才由 RAG 默认模型接手。**" |

en 三处同批（同句式）。判据：`groupEvaluationHint` 的旧句从 **Task 2** 起就是假话（那是一句"留空 → 主模型"的断言）；另两处是补上 D3 的先后关系。

**neuter（七条，逐条独立还原；每次还原后用 md5 证明五个文件逐字节回到 GREEN 态）**：

| # | 还原的旧行为 | 转红条数 |
| --- | --- | --- |
| 1 | 把整行从功能视图里删掉 | 7（6 条 DOM ＋ 那条源码钉子）；**包 Card 之后重放过一次，仍是 7** |
| 2 | 让功能视图常驻（`view === "functional" \|\| true`） | 2（我的"仅功能视图"＋既有视图切换用例） |
| 3 | 改选即保存（`onValueChange` 里调 `save.mutate`） | 1（**正是那条源码钉子**） |
| 4 | 保存时改发模型目录（`save.mutate({ models })`） | 2（我的载荷用例＋既有保存用例） |
| 5 | 候选按视觉过滤 | 2（两条候选用例） |
| 6 | 候选源换成 `managedModels` ＋ `visionReferenceOptions()` | 2（同上） |
| 7 | 改 D5 文案（label 少一个字） | 1（逐字钉子） |

**门禁**：`pnpm check` **零诊断**；窄面（两份功能视图 dom ＋ 模型页组合）**3 文件／105 passed**；**前端全量 243 文件／2647 passed**（比 Task 3 的 2636 多 11，正是本轮新增用例数——这次 collected 数与新增数对得上）。

**发现（本轮新出，三条）**：
- **Radix Select 在 dom 里驱动不了 ⇒ 两条规则改用别的锚**：仓库约定是"候选列表在 node 侧钉、dom 侧只断言 trigger 文本"（既有用例的注释就这么写），所以"改选只改草稿、未点击保存不发 PUT"这条**没有行为锚**——happy-dom 下打不开那个下拉。加了一条**源码钉子**（`update("default_model"` 存在 ＋ `save.mutate(` 只出现一次），neuter 3 证明它有牙。这是本轮唯一一条以源码钉替代行为断言的规则，理由记在这里。
- **"不按视觉过滤"要用 `display_name` 判别，不能只看"值在不在"**：`modelReferenceOptions` 会把"指不到条目的已存值"保留成一项（R24／D4），所以一个被视觉过滤掉的值**仍然显示**——只是显示原始 id 而不是 display name。最初那条用例用 `display_name: null` 的条目 ⇒ 抓不到差别；改成给条目真实 `display_name` 并断言它出现，neuter 5／6 才转红。
- **既有注释里有个不存在的符号**：`functional-models.dom.test.tsx:438` 写"the option list itself is pinned by **extractionModelOptions** in the node suite"，而全仓没有 `extractionModelOptions`（实际是 `modelReferenceOptions`）。属陈旧注释，未改（不在本 Task 面内），登记备查。

**遗留（不属本 Task）**：① 视觉观感与几何**归 Task 5／9 真浏览器**（包装形态已按用户裁定落成 `Group`，剩下的是"看着顺不顺眼"）；② `functional-models.dom.test.tsx:438` 的陈旧注释待改。

---

## Task 5 — 阶段真栈：RAG 选择生效、聊天不跟随

> 前置 Task 1–4 GREEN，确认现有前端与 Gateway 已加载新代码。本轮只验已完成的字段／抽取／裁判／界面，不提前验收 Task 6–9 的配文、退役或严格检查。Task 9 后必须重跑最终真栈。
> **验收对应**：spec §4 的 1 / 2（抽取／裁判）/ 5 / 6 / 7 / 15 的阶段部分。

- [x] **开始前保护**：按执行纪律保存 RAG 文件原字节／存在状态／md5，记录其他配置指纹不变；从脱敏元数据确定首项 A 与另一条可用目标 B，记录有效角色和 YAML 继承前提。使用授权测试数据及隔离浏览器上下文，不清用户真实偏好、不编辑模型条目。
- [x] **腿 1：未设 RAG 默认**：在有效抽取／裁判角色也为空的前提下验其取首项；有角色覆盖则先记录覆盖生效，不拿该结果冒充空角色兜底。记录普通聊天与知识库聊天当前有效目标和显示，作为腿 2 的同条件对照；不能强行假定二者都等于 A。
- [x] **腿 2：只改 RAG 默认**：在功能视图选 B，未保存前无 PUT；点原保存后重开读回，并从实际抽取／裁判构建目标核实 B。保持角色、聊天选择及 agent 配置不变，新普通聊天／知识库聊天仍按腿 1 规则选择，聊天偏好不因 RAG 保存新增变化。API／日志只显示条目名，不显示钥匙。
- [x] **界面与回归**：仅功能视图顶部显示默认控件，对话视图和总标题无该控件；窄屏布局、清空继承、失败保留草稿用真浏览器检查，核 console／network。原功能模型其他字段可编辑，默认变更不触发额外探针；IM／scheduler 等未实际跑的入口只报告 Task 2 自动化覆盖，不冒称真栈全部跑过。

- [x] **还原与交接**：无论成功／失败，逐字节恢复 RAG 文件及存在状态，核 md5 与其他配置指纹；仅清理本次明确 ID 的测试资源。标清本轮尚未验收 VLM 最终默认、legacy 退役与缺项检查，交 Task 9 重验。

**实测（2026-09-27 完成，真栈阶段验收）**：

**性质与基线**：真栈＝用户以 `scripts/serve.sh --dev --daemon` 起的栈（`:8001` Gateway ＋ `:3000` 前端，本机无 nginx）。**关键前提：daemon 模式把后端日志落到 `logs/gateway.log`，我能读它** —— 这决定了本 Task 的观测办法（`httpx` 出网请求按 URL 记 INFO、应用层 `WARNING` 全量在，且**不含请求体**⇒ 不涉密钥）。基线 HEAD `c9b01522`。**开始前保护**已做：`rag_config.json`（723B）、`models_config.json`（590B）、`config.yaml`（7199B）三份复制到仓库外并记 md5；全程未读它们的内容。

**前提（脱敏元数据，经 API/UI）**：模型表 4 项——首项 **A＝`qwen3.8-flash`**、备选 **B＝`deepseek-v4-flash`**（DeepSeek 端点）、C＝`mimo-v2.6-flash`（Xiaomi 端点）、另有 `qwen3.7-flash`；**四条都不声明视觉**。RAG 侧 `default_model` 初始为 **null**（config_file），而 **`extract_model`／`judge_model`／`vlm_model` 三项都被 UI 覆盖成 C** ⇒ **腿 1 的"角色也为空"前提在本机不成立**，按 plan 纪律记为"角色覆盖生效"，并另加一步专门撤掉抽取覆盖来验空角色那一级（下面腿 1′）。

**观测载体（不照 plan 字面做入库，改用检索测试）**：抽取角色的活体证据走 **`recall-test` 的 graph 腿**（它内部 `llm = llm or get_extract_llm()`，即 R12 那个第二消费者），失败时响应里给 `RagConfigurationError` 并点到日志，**日志里有完整句子**；这样不产生文档、不动数据、也不烧嵌入调用。**裁判角色在真栈上没有单独驱动**（唯一入口是按需评测＝一次完整评测，代价不成比例；它与抽取共用同一 helper 与同一段 resolver，Task 2 的自动化套件覆盖两条链）——这是本轮**如实标注的未跑项**。

**三级链的活体证据（正向端点判别，不靠"没报错"）**：

| 步 | 配置 | 出网端点的实测 | 结论 |
| --- | --- | --- | --- |
| 腿 1 | 角色＝C ＋ 默认＝`ghost-not-an-entry` | 04:08:51 `POST https://api.xiaomimimo.com/v1/chat/completions` | **角色覆盖生效**：抽取打的是 C 的端点，默认**没被读**（同期 `model_target` 无 warning） |
| 腿 1′ | 撤销抽取覆盖 ＋ 默认仍＝ghost | 04:09:19 `WARNING - RAG default model 'ghost-not-an-entry' is not a configured model; using the first configured model 'qwen3.8-flash' instead.` ＋ 04:09:24 `POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | **默认失效 → 回落首项并点名**：默认被读了，实际打的是 A |
| 腿 2 | 覆盖仍撤 ＋ 默认＝B | 04:13:39 `POST https://api.deepseek.com/v1/chat/completions`（同期 `model_target` 无 warning） | **RAG 默认就是抽取目标**：打的是 B 的端点；B 被解析器接受 |

（A/C/嵌入/重排都在 DashScope 或各自厂商端点，所以"打去哪个 host"是**具名**证据，不是"没报错"推断。）

**界面与回归（真浏览器，同一窗口）**：功能视图**第一张卡片**就是「RAG 默认模型 ⓘ」（其后依次是既有的检索／图谱抽取／评测裁判／多模态与视频／服务与令牌／重建索引）✓；切到**对话模型**视图后该文案**全页不再出现**（⇒ 视图与总标题都没有第二个控件）✓；空状态显示「（使用配置默认）」✓（与 API 的 `default_model=null` 一致）；**下拉候选＝空选项＋4 个已配置条目＋`ghost-not-an-entry`**——最后一项正是 D4／R24 说的"指不到条目的已存值被保留成一项、打开表单不会悄悄清掉"，**在真栈上直接看到了** ✓。三条角色说明的**新 D3 文案**也在真栈渲染 ✓。

**腿 2 的保存侧**：装 `fetch` 记录器后，下拉选 B ⇒ **非 GET 请求零新增**（选值不发 PUT）✓，保存按钮解禁 ✓；等 1.5s（跨过防抖）仍无新请求 ⇒ **默认变更不触发额外探针** ✓。点原「保存」⇒ **恰好一次 `PUT /api/rag/config`** ✓，文件落到 `default_model=deepseek-v4-flash`（来源 ui），而**抽取覆盖保持撤销、judge／vlm 被原样带出**（整对象 carry-forward 生效）✓。**重开读回**：重新深链打开设置 ⇒ 默认行显示 `DeepSeek / deepseek-v4-flash`、保存按钮因无改动而禁用 ✓。

**聊天隔离（同一次保存之后）**：普通聊天的模型按钮仍是 **`DashScope / qwen3.8-flash`（A）** ✓；知识库页聊天的模型按钮同样仍是 A ✓ ——**"改 RAG 默认、聊天不跟随"在真栈成立**。IM／scheduler 等未实际跑的入口**只算 Task 2 的自动化覆盖**，不冒称真栈跑过 ✓。

**还原与交接**：`rag_config.json` 从仓库外备份**逐字节还原**，三份指纹（`rag_config.json` `323f9046…`、`models_config.json` `ff8d1d5b…`、`config.yaml` `7b32d281…`）**全部 OK** ✓。**本会话没有创建任何需要清理的资源**（走检索测试而非入库 ⇒ 无文档、无评测行；`测试2` 未新增内容）。**本轮明确未验收**：VLM 最终默认（Task 6）、legacy 退役与严格缺项检查（Task 9）——**Task 9 之后必须重跑本 Task 的真栈**。

**一条过程更正（我自己的）**：我原以为"把 RAG 默认设成不存在的名字"会让抽取构建**报错**，于是用它当探针；实际按 D3 那是**默认字段本身失效**⇒**回落首项并 warning**（这正是 Task 1 实现的语义）。所以该探针的产出不是"失败点名"，而是那条 warning ＋ 打到 A 的调用 —— 证据反而更强（它同时证到"默认被读"与"回落首项"两级）。

---

## Task 6 — VLM 继承链与文档配文状态

> 文件：`knowledge/vlm_target.py`、文档／视频 captioner 的选模接缝、`knowledge/captioner.py` 的 `caption_images()` **公开返回类型**、`knowledge/worker.py`、`knowledge/graph/indexer.py`、`knowledge/store.py`；测试 VLM target／captioner／worker／graph／store，含 `test_worker.py` / `test_parser.py` / `test_vlm_target.py` 里把 `caption_images()` 返回值当映射用的夹具（R13）。HTTP 请求构造不改。旧字段、显式未知名的最终报错和厂商字面量默认删除归 Task 9。
> **前端"零改动"已核实并收窄为"生产代码零改动"**：文本文档从今天起会新增 `path_status.caption` 键（视频文档早就发这个键，`worker.py:309/636`），而 `path-status.ts::pathStatusLines()` 是按"payload 里带哪个键就显示哪一腿"组装的（`status[leg] !== undefined`，`:36-38`），所以新键会自动渲染成「配文」一行、复用视频的标签与状态词——不需要新前端代码、不需要新 i18n key。**要改的是两处前端文本**（它们描述的是改前的事实，不会红但会变成假话）：`path-status.ts:33-35` 的注释 “text documents write vector/graph/wiki alone”，与 `document-panel.dom.test.tsx:1051` 那条「文本文档仍只返回 vector/graph/wiki」——改成"带哪个键显示哪一腿"，并补一条"文本文档带 caption 键"的正向用例。另外新 error 标记会出现在文档列表的 error 列（同族 `graph degraded` / `entity-resolution failed` 已经这样露出），属既有约定。
> **验收对应**：spec §4 的 2（图片／视频）/ 3（空目标）/ 8。此时只在隔离配置中验证有效空角色；旧字面量默认尚在，不宣称真实 UI 清空就已进入 RAG 默认。VLM 完整真栈放 Task 9，避免在中间态作最终结论。

- [x] **RED：图片／视频继承（R18 后两条腿同链）**：条目名、wire id、首项、RAG 默认互不相同；分别验证显式参数、`vlm_model`、RAG 默认与首项。**图片与视频现在走完全相同的链**（`显式参数 → vlm_model → RAG 默认 → 首项`）——`video.caption_model` 那一层已退役，所以**不要再写"视频不能越过图片角色"这类断言**（它依赖一个已不存在的字段，写出来是一条永真的空断言）。要验的是：视频腿的选模点（`video/captioner.py:83` 今天是 `model = cfg.rag.video.caption_model or cfg.rag.vlm_model`）在本 Task 之后只剩 `cfg.rag.vlm_model`，与图片腿读到同一个目标；RAG 默认改变只影响无有效 `vlm_model` 的新目标；默认失效才 warning＋首项，无模型不能发空 `model`。显式裸 id 的 legacy 最终反转留 Task 9。
- [x] **RED：计数、返回形状与阈值**：**`caption_images()` 的返回形状先定形（R13）**：`dict[str, str]` → dataclass（`captions: dict[str, str]` 键仍是 `image.ref`、`failed: int`、`degraded: bool`），与 `video/captioner.py:47-53` 的 `CaptionOutcome` 同族；`degraded` 由 captioner 算，worker 只读 `outcome.degraded`、不自己比阈值。有图成功／≤30% 失败为 done，>30% 为 degraded 并追加 `image caption degraded: M/N images failed`；无图没有 caption 键。**这是破坏性变更，同批改完全部受害者**：`worker.py:443`（改成取 `outcome.captions` 再交 `apply_captions()`）、`test_worker.py:156/183/206`（三处 `AsyncMock(return_value={"images/p1.jpg": "图注"})`）、`test_parser.py:215/241/251/328/349`、`test_vlm_target.py:148/207/283/301/324`；实施前按符号重扫，不以这份清单为上限。**阈值只许一份常量**：源码级钉子断言图片腿用的是 `graph/indexer.py:31` 的 `DEGRADED_FAILURE_THRESHOLD`（或本 Task 提升后的那一个中性常量），新腿里不出现 `0.3` 字面量；`video/captioner.py:44` 的既存第二份要么被同批收敛、要么原样保留，份数不得增加。完整目标的 HTTP 失败／空回答按计数处理，不用模型视觉声明推断失败。
- [x] **RED：真实流水线顺序**：由真实 `process_document()` 按配文→向量→图谱执行，两条腿同时降级后 error 保留两种标记、两个 path_status 都在；不只测试“已有 graph 标记再写 caption”。**标记生产者已移动**：另加两条钉子——只调 `index_document_graph()` 不产生任何 `error` 写入（今天它在 `graph/indexer.py:209` 覆盖写），跑完整流水线时两类标记由 worker 的 `_append_error_marker()` 按 `; ` 叠加，顺序为配文在前、graph 在后（配文腿先跑），断言写这个顺序而不是"两者都在"。桩放外部 LLM／向量边界，不替掉要验证的状态写入链。
- [x] **RED：恢复生命周期（R21 的四条实测事实要各自成钉子）**：有旧配文降级的文本在 uploaded／parsing／chunking 重解析，新一轮成功／无图都清掉旧 caption 状态和标记；indexing 仅恢复索引则不调用配文、保留原结果。真实 store 读取证明删除发生，不能用把 None 当删除的假 store；未重跑腿的状态不被统一 pending 覆盖。**四条已核实的机制事实，别只写"清掉旧结果"**：① **重解析有两处残留，不是一处**——`_reparse_and_chunk():437` 写的 `path_status` 是 `{"vector":"pending","graph":"pending"}`、**不含 `caption`**，而 `_wipe_doc_chunks():414-431` 根本不动 `documents.error` ⇒ 旧的 caption 状态与旧标记各自需要显式清理，少清一处就留一条假状态。② **`_append_error_marker()` 的幂等是子串比较**（`worker.py:404-413` 的 `marker in (document.get("error") or "")`），而标记文本含计数（`image caption degraded: M/N images failed`）⇒ **计数变了就不幂等**，会追加第二条；断言要覆盖"同计数不重复"与"异计数怎么办"两面，别只测前者。③ **硬失败落盘是覆盖写**（`:395-401` 的 `update_document_status(..., error=str(exc)[:500], ...)`）⇒ 会抹掉已追加的标记；这条与 ②③ 的交互要有用例，不能假定 error 只会增长。④ `store.update_document_status():168-186` 的 docstring 明确 "`None` leaves a field unchanged" 且 `path_status` **按 key 部分合并** ⇒ "清除某一腿"必须写显式值，写 `None` 是"不变"而不是"删掉"，这正是不能用假 store 的原因。
- [x] **GREEN**：有效空角色通过 RAG resolver，**调用方按 D3 走图片／视频同一条链**——视频腿的 `video/captioner.py:83` 从 `cfg.rag.video.caption_model or cfg.rag.vlm_model` 收成 `cfg.rag.vlm_model`（**本 Task 只改这个读取点，字段声明的删除与嵌套剥离归 Task 8／9**，中间态是一个已不被读取但仍存在的字段，本序列不发布所以可接受）；`caption_images()` 改回 dataclass（`captions` / `failed` / `degraded`），`degraded` 在 captioner 内用**复用的那一份阈值常量**算出，worker 只读它写 `path_status.caption` 与追加 error，不在 worker 里第二次比阈值；`worker.py:443` 取 `outcome.captions` 交 `apply_captions()`，上条列出的既有夹具同批适配（R13）。**graph 标记的写入点从 `index_document_graph()` 移到 worker 的 `_append_error_marker()`**，indexer 不再写 `error`（worker 在 `:362` 已有 `stats.degraded`，计数同对象可取，无需新管线）。重解析显式清理旧配文结果（**两处残留都要清**，R21 ①），仅索引恢复保留；不改变其他视频恢复策略，不加 UI 状态词或 hover 原因。
- [x] **neuter：继承**：恢复旧空值 legacy 回落、让视频直接跳到 RAG 默认（越过 `vlm_model`），分别让对应优先级断言转红，完整还原后 GREEN。**R18 的一条专属 neuter**：把 `video/captioner.py:83` 改回 `cfg.rag.video.caption_model or cfg.rag.vlm_model`（即恢复那一层覆盖）时，"视频与图片读到同一个目标"那条断言转红——**这条必须有牙**，否则"两条腿同链"只是一句写在文档里的话；夹具要把 `video.caption_model` 与 `vlm_model` 设成**不同**的条目，同值夹具测不出这个还原（R22 的同值陷阱）。
- [x] **neuter：状态与恢复**：将阈值改为任意失败或从不 degraded、恢复 graph 覆盖 error、**让 indexer 重新自己写 `error`（恢复旧生产者）**、去掉重解析清理、把清理误用于 indexing，分别记录阈值／双标记／生产者迁移／无图清理／保留结果受害者，不用一条阈值测试代替生命周期覆盖。**R13 另加两条**：把 `caption_images()` 改回返回裸 `dict[str, str]` 时，返回形状与 `failed` / `degraded` 字段的断言转红；把 `degraded` 的判定挪回 worker 并在那里写第二份 `0.3` 字面量时，"新腿里不出现 `0.3`"的源码级钉子转红（只挪位置、不写字面量则不红——那说明钉子钉的是常量份数而不是归属，如实记录）。
- [x] **门禁**：ruff 双净；VLM／caption／worker／graph／store 窄面及 `tests/knowledge/`，共享 store 改动后后端全量零新增失败。**前端也要跑**（生产代码不动，但有注释与用例两处文本改动）：`check` + `tests/unit/knowledge/document-panel.dom.test.tsx` 窄面。复跑 Task 2 的其他功能模型隔离。

**实测（2026-09-27 完成，RED→GREEN→10 条 neuter→门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `63f3c448`（提交前重核）。**只动这 6 个生产文件**：`knowledge/captioner.py`（新 `CaptionOutcome` ＋ 判定）、`knowledge/vlm_target.py`（链路）、`knowledge/video/captioner.py`（`video.caption_model` 那层撤销）、`knowledge/worker.py`（配文状态／两类标记／重解析清理）、`knowledge/graph/indexer.py`（不再写 `error`）、`knowledge/store.py`（`path_status` 的删键通道）；测试 4 个文件 ＋ 前端两处文本。HTTP 请求构造零改动。真栈归 Task 9，本 Task 不在中间态下最终结论。

**RED**：本轮新增 16 条用例 ＋ 2 条钉子。RED 期实跑记录（各自红因＝目标行为不存在）：重解析清理与标记刷新组 **7 红**（`test_reparse_clears_the_previous_caption_verdict_and_marker`／`…even_when_the_new_pass_fails`／`…refreshes_a_counted_marker_instead_of_stacking`／`test_a_counted_marker_is_refreshed_in_place_not_stacked`／`test_a_hard_failure_still_overwrites_the_caption_marker`／`test_the_store_deletes_a_path_key_only_for_an_explicit_none_value`／`test_pipeline_appends_caption_then_graph_markers_in_that_order`），索引器侧 **1 红**（`test_a_degraded_run_writes_no_error_itself`，红因＝`graph degraded: 1/2 chunks failed extraction` 仍由 indexer 写入）。两条**初始即绿**的是守卫（索引恢复保留配文；它的牙由 neuter 第 8 条给出）。继承链组与返回形状组（R13／R18）的代码早于本轮落地，其牙全部由下方 neuter 逐条证明，不重复声称 RED。

**GREEN（关键点）**：① `caption_images()` 返回 `CaptionOutcome(captions, failed, degraded)`，`degraded` 在 captioner 内用 **`DEGRADED_FAILURE_THRESHOLD`**（`graph/indexer.py:31`）算出，worker 只读；② 有图时写 `path_status.caption`＝`degraded`／`done`，降级追加 `image caption degraded: M/N images failed`；③ **生产者迁移**：indexer 删掉那段 `update_document_status(error=…)`，worker 在 `:362` 拿到 `stats.degraded` 后用 `_append_error_marker()` 写同一句，两条标记按 `; ` 叠加、配文在前（实测 exact 断言 `"image caption degraded: 1/1 images failed; graph degraded: 1/2 chunks failed extraction"`）；④ 计数的幂等选择＝**按前缀刷新**（`_append_error_marker(..., replace_prefix=…)` 先 `_drop_error_markers()` 再追加，同计数不重复、异计数替换而非叠加）——R21② 要求的那次「选一种」落在这里；⑤ **重解析两处残留显式清理**：`_reparse_and_chunk()` 在 parse **之前**清旧标记（`_clear_error_markers()`，只在真的删掉了东西时才写回）＋把 `path_status.caption` 以**删键**写入（`store.update_document_status()` 新增：`path_status` 里**值为 `None` 即删除该键**，与调用级 `None`＝不改区分，docstring 已写）；⑥ indexing 恢复不调用配文、不清理；⑦ `video/captioner.py:83` 收成 `cfg.rag.vlm_model`（字段声明与嵌套剥离仍归 Task 8／9，中间态不发布）。

**10 条 neuter（逐条独立还原并复跑，GREEN 恢复后复跑全绿）**：① 恢复 `video.caption_model or vlm_model`（R18 专属）→ 1 红＝`test_both_caption_legs_read_the_same_target`（夹具把两字段指向**不同**条目，同值夹具测不出——R22）；② 视频越过 `vlm_model` 直取「RAG 默认／首项」→ 同 1 红；③ `vlm_target` 恢复旧空值 legacy 回落 → 4 红（RAG 默认生效／首项兜底／失效 warning／无模型拒绝）；④ 阈值改「任意失败」→ 2 红（1/4、exactly-30%）；⑤ 恢复 indexer 自写 `error` → 2 红（indexer 侧钉子 ＋ 流水线标记串被覆盖）；⑥ 去掉重解析清理 → 2 红（两条清理用例；计数刷新那条不红，它的牙在 ⑦）；⑦ 去掉前缀刷新（纯追加）→ 1 红（`test_a_counted_marker_is_refreshed_in_place_not_stacked`）；⑧ 清理误用于 indexing 恢复 → 2 红（索引保留守卫 ＋ 流水线标记串）；⑨ 返回裸 `dict` → 7 红（形状／计数／顺序）；⑩ 判定挪回 worker 并写第二份 `0.3` → **源码钉子不红、由 captioner 级行为用例 1 红**（`test_one_failure_in_three_is_degraded`）——如实记录：`"0.3" not in captioner_source` 钉的是「新腿自己模块里不出现字面量」，判定归属由行为钉（`outcome.degraded`）承重，计划预判的那条「源钉转红」在本实现下不成立。

**门禁**：后端 `ruff check` ＋ `ruff format --check` 双净（format 只重排本轮新增行）。`tests/knowledge/` **1290 passed／2 failed（两条既有环境红）**：`test_embed_missing_api_key`／`test_rerank_missing_api_key`——本机真实 RAG 配置供了钥匙、`MockTransport` 回空响应，红因与本 Task 无关（用例体不碰本 Task 代码）。功能模型隔离组复跑 **36 passed**。**后端全量 161 failed／12592 passed／109 skipped（18:22）**，判据用失败集合：把这次 161 条涉及的 **63 个文件**在「本 Task 6 个生产文件还原到 HEAD」的状态下重跑（`~/.qoder/tmp` 内 A/B，非仓内 basetemp），得 **159 failed**；**双向差集＝HEAD-only 0 条、工作树独有 2 条**（`test_delta_channel_state::test_merge_message_writes_randomized_differential`、`test_detector_repo_root::test_unmarked_location_raises_instead_of_scanning_nothing`），这 2 条单跑即绿 ⇒ 判为 flake，**零新增失败**。全量日志里没有任何失败 traceback 触碰本 Task 的 6 个文件；63 个失败文件与 92 个 knowledge 栈导入者求交集也只剩上面那两条环境红。A/B 后 6 个文件逐字节还原（md5 与备份清单一致）。前端 `check` 零诊断、`document-panel.dom.test.tsx` **69 passed**、两份功能视图 dom **88 passed**。

**前端两处文本（D8）**：`path-status.ts` 的注释改成「带哪个键就显示哪一腿」（视频三腿／文本文档有图时带 `caption`），`document-panel.dom.test.tsx` 那条「文本文档仍只返回 vector/graph/wiki」改名成「不带 caption 键时仍是…」并**补一条正向用例**（文本带 `caption` 键 ⇒ 多出「配文」一行、状态 `degraded`），复用视频标签与状态词、不加 i18n 键。

**自审纠错**：流水线用例最初把假图注写成与正文 alt 相同的「图注」⇒ 证不了 `outcome.captions` 真的进了 `apply_captions()`；已把假图注改成「VLM 图注」并断言它出现在切片正文里（补跑通过）。

**未做／交接**：真栈各腿（字段退役后的最终验收）归 Task 9；`recaption` 的 `caption: failed` 落盘、按需评测终态归 Task 8／9；`knowledge_service.py:257` 那句「stored `path_status` carries vector/graph only」在本 Task 后对文本文档也不再准确（视频腿早就让它不精确），**未改**，交 Task 9 的文档批次或由用户裁；`tests/test_rag_config_probe.py` 的 4 条红属嵌入探针线自己的 fixture 未带 `rag.embedding_base_url`（报错句即证据），不经本 Task 代码路径。

---

## Task 7 — judge 的 `dashscope:` 直连退役

> 文件：`knowledge/eval/factory.py`、`backend/scripts/run_ragas_eval.py` 的说明／help／专用异常捕获；测试 `tests/knowledge/eval/test_eval_factory.py`、`test_ragas_eval_cli.py`；**文档同批改 `backend/AGENTS.md:1211`（R20）**。公共 factory、ragas 传输、历史设计文档与 `nightly.yaml` 不改；上游 job 旧参数适配仍待真正拆分时处理（**但它不是"死配置"那么轻，见下**）。
> **受害者已细化到用例级（R25），别只按文件名找**：`test_eval_factory.py` 共 8 例——**删／反转 3**（`:19 test_dashscope_prefix_builds_openai_compatible_client`、`:28 …_falls_back_to_dashscope_api_key`、`:36 …_without_key_raises`），**重装 2**（`:43 test_config_model_name_delegates_to_factory`、`:57 test_default_none_uses_primary_model`：都传 `config=object()`，而 D3 之后 `judge_model=None` 要读 `config.rag` ⇒ 必须换成带 `.rag` 的临时配置；`:57` 的**名字与断言本身**"primary model"也过期），`:4` 模块 docstring 提到 `dashscope:`；其余 3 例（`:68`/`:75`/`:101`）不受影响。`test_ragas_eval_cli.py` 共 17 例——**删／反转 4**（`:107`、`:116`、`:124`、`:154 test_missing_judge_key_maps_to_skipped_before_engine`；最后这条断言 exit 3，本 Task 之后同一输入是普通 `ValueError` ⇒ 不是 3），**重装 2**（`:131`、`:145`，同为 `config=object()`），`:51 test_explicit_values` 的 `dashscope:qwen3.8-max` 只是字符串透传可留、但 `:157` 的 help 文案要改。**两个假受害者别顺手删**：`:86 test_config_value_error_maps_to_skipped` 走的是 `get_app_config()` 抛错的另一条 skip 路（`:187`），与本项无关；`test_eval_cli.py` **零命中**（那是第一层 `run_rag_eval.py` 的 CLI），文件清单不含它是对的。另：`test_ondemand.py:93-123` 是 **Task 2** 的受害者、不在本 Task。
> **验收对应**：spec §4 的 2（裁判层级）/ 9。

- [x] **RED：显式旧参数**：其余 CLI 前置条件满足、无 `dashscope:qwen3.8-max` 同名条目时，四段都要断言：① 调 `build_judge_llm()` ⇒ `type(exc.value) is ValueError` 且消息 `Model dashscope:qwen3.8-max not found in config`（库层不吞）；② 调进程内 CLI `main()` ⇒ **不抛穿**、返回 `EXIT_ERROR`(2)、stderr 含同一句；③ 子进程退出码 **2**（不是 1、不是 `EXIT_SKIPPED`）；④ **对 `cli._persist_eval_run`（或 `eval_persistence.save_eval_run`）装 spy，断言恰好调用一次且 `status="error"`（R28①）**。**④ 不能按现有夹具风格顺手带过**：`_persist_eval_run` 自带 `own_engine` 分支（`run_ragas_eval.py:110-112`），而本 Task 的既有夹具把 `get_app_config` monkeypatch 成 `object()`（`test_ragas_eval_cli.py:157`）⇒ 它会在 `:112` 取 `object().database` 抛 `AttributeError`、被 `:127` 的宽捕获吞成一行 stderr note ⇒ **一行没写、①②③ 照样全绿**；没有 spy 这条要求就是空洞绿。**按乙实施（R27）**：删掉 `JudgeKeyMissingError` 那个捕获（`run_ragas_eval.py:213-216`）后 `:212` 抛的 `ValueError` 一路无人接（`:187` 的 `except ValueError` 只包 `get_app_config()`，`_run()` `:252-260` 只有 stdout 重配那个 `except (AttributeError, OSError)`，`main()` `:279-292` 与 `sys.exit(main())` `:296` 都没捕获）⇒ 默认就是 traceback/1，会被 `nightly.yaml` 的 `:314 exit 0` 吞成假绿。所以同批照 `:194-199` 的先例加映射：stderr 一句 + **落一行 `status="error"`**（`:81-82` 的 docstring 已把这条写成不变量——"Every CLI run writes exactly one row"⇒ 漏写是违背它自己的契约，评测历史还会留空洞：跑过、失败、没记录）+ 返回 `EXIT_ERROR`。**捕获按消息收窄到那条 not-found 等值句、其余 `ValueError` 照旧抛穿（R28⑤）**：宽捕会把工厂的真 bug 洗成一次"干净退 2"（看日志像用户输错名字），而**把 `try` 扩到 `_build_judge_llm()` 之外**还会打掉 `:86 test_config_value_error_maps_to_skipped`（`get_app_config()` 抛错 → 退 3、走 `:187`），R25 已判定它不是本 Task 的受害者；窄捕本身不动 `:86`（两个 `try` 互不相干）。映射点（`:211-216`）在 `init_engine_from_config`（`:218`）**之前**，写库仍可行——`_persist_eval_run` 按需自建引擎并在 `finally` 关闭（`:110-112`／`:124-126`）。测试不发真实请求。
- [x] **RED／守卫：条目与答题分离**：完整同名条目按其 name／wire id 构建而非走前缀直连；普通条目、空参数先 `rag.judge_model` 再 RAG 默认／首项均有效。CLI 答题模型及按需评测答题 agent 不变；缺 ragas 可选依赖的合法跳过保留（`REQUIRED_ENV_KEYS`（`:144`）只有嵌入／重排两把，不含 judge 钥匙 ⇒ 那条 skip 路不受本 Task 影响）。补源码钉子确认直连常量／异常类不再存在。
- [x] **GREEN**：删除直连分支、`DASHSCOPE_COMPATIBLE_BASE_URL`、`JudgeKeyMissingError` 与 CLI 对应捕获／三处文案（模块 docstring `:30-32`、`--judge-model` 的 help `:157`、`:207-210` 那段注释）；**`:207-210` 要整段重写，它有两处过期、别只删一半（R28④）**——`supports a direct DashScope model` 那半句描述的是本 Task 删掉的分支；`Built BEFORE the engine so a missing judge key fails fast without touching persistence` 那半句在乙之后**后半失效**（映射点就在 `init_engine_from_config`（`:218`）之前、而我们恰恰要在那里写库），重写时要写明它仍然可行的原因＝`_persist_eval_run` 的 `own_engine` 分支（`:110-112`）与 `finally` 关闭（`:124-126`）。保留 Task 2 的 RAG 裁判优先级与原工厂的普通错名异常，不把前缀错名吞成默认；**并把 `:213-216` 的专用捕获换成"错名 → 可读原因 + `status="error"` + `EXIT_ERROR`"的映射（乙／R27）**，映射只加在 CLI 边界、库层与工厂都不动，**捕获按消息收窄到那条 not-found 等值句、其余 `ValueError` 照旧抛穿（R28⑤，宽捕的两笔代价见本 Task 的 RED）**，且 `status="error"` 那行要真的被 ④ 的 spy 断言到（R28①）。**`backend/AGENTS.md:1211` 同批改（R20）**：那段 Layer 2 说明里 `--judge-model dashscope:<model>` talks to the DashScope OpenAI-compatible endpoint using `DASHSCOPE_JUDGE_API_KEY` (falling back to `DASHSCOPE_API_KEY`) 正是本 Task 删掉的分支；**同一句还有第二处过期**——它说按需评测 "passes `None` when it is unset, which falls back to the config primary model"，而本期之后是"RAG 默认 → 首项"（D3）：**这半句已提前改掉**（从 Task 2 起就是假话，2026-09-27 随 Task 3 的收尾批落地），所以本 Task 只剩 `dashscope:` 那半句要动。属本 Task 的交接面、不属 B-2。
- [x] **neuter**：完整恢复旧直连分支行为，旧参数拒绝与同名条目选择断言转红；另让空参数忽略 `rag.judge_model`，角色优先断言转红；**第三条专属 neuter（R28①）**：只删掉映射里 `_persist_eval_run(...)` 那一行、其余保持不动 ⇒ RED 的 ④ 必须转红，若仍全绿说明 ④ 写成了空洞断言，当场改强再继续。**R28⑤ 那条（宽捕）不需要专属 neuter**：把 `try` 扩宽会直接打掉 `:86`，而 `:86` 就在本 Task 门禁的窄面 `tests/knowledge/eval/` 里，门禁会当场逮住。还原并复跑，不通过真的联网制造红。
- [x] **门禁**：ruff 双净、`tests/knowledge/eval/` 窄面与 `tests/knowledge/` 零新增失败；复跑答题模型隔离，不修改上游 nightly 来掩盖旧参数不兼容。**`nightly.yaml` 的处置已核实并登记（R26）**：`:303` 传的就是被退役的 `--judge-model dashscope:qwen3.8-max`，`:266/280/290` 传的 `DASHSCOPE_JUDGE_API_KEY` 本 Task 之后没人读，`:296-298` 的注释描述的是被删掉的直连。该 job 有 `if: github.repository == 'bytedance/deer-flow'`（`:241`）⇒ 本仓永不执行、不构成本期回归；**但真正拆上游 PR 时必须同批改**，已登记进 spec §6.1，不在本 Task 冒领、也不声称上游已兼容（R27 之后它会**红着提醒**这行参数还没换）。**同批还会改 eval_runs 的历史语义（R28③）**：同一个错名输入从 `status="skipped"`+退 3（nightly `:306-309` 当"显式跳过"并 `exit 0`）变 `status="error"`+退 2（`:310-313` 报 `::error::` 并 `exit 1`），行数不变（`:81-82` 的不变量仍守住），已登记进 spec §6.2。

**实测（2026-09-27 完成，RED→GREEN→4 条 neuter（＋R28⑤ 一条加测）→门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `095bec22`（Task 6 提交后重核）。**生产改动 2 个文件**：`knowledge/eval/factory.py`（删直连分支、`DASHSCOPE_COMPATIBLE_BASE_URL`、`JudgeKeyMissingError` 与 `import os`；模块与函数 docstring 同步）、`backend/scripts/run_ragas_eval.py`（删专用捕获与 import、换窄捕映射、help／模块 docstring／`:207-210` 注释重写）；**文档 `backend/AGENTS.md` 三处**（Layer 2 用法串、`dashscope:` 那半句、末尾 "judge keys"→"credentials"）；测试 2 个文件重装 ＋ **`tests/knowledge/test_rag_model_wiring.py` 那颗 Task 2 立的钉子按它自己的 docstring 反转**（R25 清单没点名它，但它写着「Task 7 删掉时本用例要转红」）。公共 factory、ragas 传输、`nightly.yaml` 与历史设计文档零改动。

**RED（8 红／2 绿）**：红因全部是「目标行为不存在」——① `test_a_missing_name_raises_the_factorys_plain_not_found` 与 ② `test_a_complete_entry_named_like_the_prefix_is_built_by_name`：旧分支抢先返回客户端（DID NOT RAISE／spy 为空）；③④ 两条源码钉子：常量与异常类还在（`factory.py`／脚本各一条）；⑤ 进程内映射：跑到 store 桩上（`the run must stop at the judge mapping`）；⑥ 识别器 `cli._is_model_not_found` 尚不存在；⑦ 子进程：stderr 里没有那句 not-found，而是 `knowledge base not found`（说明错名没被拦、一路跑到查库）；⑧ wiring 反转：同名前缀仍走直连（`factory_spy` 为空）。**两条初始即绿是守卫**：`test_a_non_not_found_value_error_is_not_mapped`（R28⑤ 的反例，牙在下方加测）与 `test_empty_parameter_prefers_the_role_declaration_over_the_default`（Task 2 已把 D3 优先级接好，牙在 neuter ③）。

**GREEN（关键点）**：① **库层契约**：`build_judge_llm("dashscope:qwen3.8-max", config)` 现在走 `require_rag_model_name` → `create_chat_model`，错名抛**普通** `ValueError("Model dashscope:qwen3.8-max not found in config")`（`type(...) is ValueError`，库层不吞、不改写；前缀不再是特殊形状）；② **CLI 边界按乙（R27）**：`except ValueError` ＋ 窄判 `_is_model_not_found(exc)`（模块级 `_NOT_FOUND_HEAD/_NOT_FOUND_TAIL` 两个常量 ＋ 一句话判定）⇒ 不抛穿、stderr 打 `ragas-eval error: <同一句>`、**落一行 `status="error"`**、返回 `EXIT_ERROR`(2)；其余 `ValueError` 原样抛穿（R28⑤）；③ **`_persist_eval_run` 的行是真写的**：映射点在 `init_engine_from_config` **之前**，靠 `_persist_eval_run` 的 `own_engine` 分支（`:110-112`）自建引擎、`finally` 关闭（`:124-126`）——`:207-210` 那段注释按 R28④ 整段重写（旧文两处过期：`supports a direct DashScope model` 与 `without touching persistence`）；④ 文案面同批改准：help（不再是 `dashscope:<model>` 与两把 env 名）、模块 docstring 的用法串与「Model selection」整段、退出码图例补 `unknown judge model`；⑤ 答题侧零改动：`--agent-model` 解析与传递未动，`REQUIRED_ENV_KEYS` 仍是嵌入／重排两把（judge 钥匙不在其中，缺 ragas 的合法 skip 保留）——顺带核对：`REQUIRED_ENV_KEYS` 旁那条注释（“The judge/agent LLM key resolves through config.yaml model profiles”）在 D9 后由"半真"变"全真"，未改；⑥ `backend/AGENTS.md:1211`：用法串 `[--judge-model <name>]`；「`--judge-model dashscope:<model>` talks to …用 `DASHSCOPE_JUDGE_API_KEY`」整句换成条目名 ＋ 错名＝用法错（stderr 一句／一行 `error`／退 2）＋「judge 独立性＝换个条目，不是第二条连接路径」；末尾 "judge keys can live in either file"→"credentials"。

**4 条 neuter ＋1 条加测（逐条独立还原、复跑、逐字节还原）**：① 完整恢复旧直连分支行为（分支 ＋ env 钥匙 ＋ 内联端点）→ **6 红**（工厂 3、CLI 映射 2、wiring 反转 1）；② 映射恢复 `skipped`／退 3（即 R28③ 的前一版语义）→ 2 红（进程内映射 ＋ 子进程退出码）；③ 空参数忽略 `rag.judge_model`（删 `judge_model or config.rag.judge_model` 的前半）→ 2 红（工厂优先级 ＋ wiring 的 `test_judge_priority[None-C-B-C]`）；④ **R28① 专属**：只删映射里 `_persist_eval_run(...)` 那一行 → **1 红**，正是 ④ 的 spy 断言（子进程那条不红是对的：它只钉 stderr 与退出码）⇒ spy 有牙、不是空洞绿。**R28⑤ 加测**（计划说无需专属 neuter，这里补一次）：去掉窄判（`if False and ...`）→ 1 红＝`test_a_non_not_found_value_error_is_not_mapped`；**与计划预判的差异如实记**：计划说「把 `try` 扩宽会直接打掉 `:86`」，但本实现的窄判是**先判消息、不匹配就 `raise`**，所以即使有人把 `try` 扩到 `get_app_config()` 之外，`:86`（配置错 → 退 3）仍被 `raise` 保住——R28⑤ 的承重件是这条守卫而不是两个 `try` 的边界，`test_a_..._is_not_mapped` 是它的唯一受害者。还原后两文件 md5 与 GREEN 态逐字节一致。

**门禁**：后端 `ruff check` ＋ `ruff format --check` 双净（format 只重排本轮新增行）。`tests/knowledge/` **1292 passed／2 failed**（两条既有环境红，同 Task 6：`test_embed_missing_api_key`／`test_rerank_missing_api_key`，红因是本机真实 RAG 配置供了钥匙）。答题模型隔离 ＋ 裁判接线 ＋ `tests/knowledge/eval/` 复跑 **365 passed**。**后端全量 161 failed／12594 passed（17:10）——与 Task 6 那次的失败集合逐条相同（`comm` 双向查零新增、零消失），所以这次不需要 A/B**：新增的 4＋4 条用例全绿，两条既有环境红（本机真实 RAG 配置）不变。

**未做／交接**：`nightly.yaml` **未改**（R26：`:303` 的旧参数会让该 job 在真正拆分上游 PR 时红着提醒；本仓 `if: github.repository == ...` 使其永不执行）；`docs/PRE_RELEASE_HARDCODE_INVENTORY.md` 的 **A-9 行与总数句未回写**——该档自己声明「不在 2026-09-23 那一对范围内、也未排期」，行内已写「归那一对的 Task 7」，但它按自身惯例（B-3 那样）会记闭合与总数 ⇒ 需要一条两行的闭合批注时我再做；`_is_model_not_found` 的等值文案暂放 CLI 局部，**Task 9 的保存期映射**会把它收进 `knowledge/model_target.py` 一处 helper（spec §4.3 的「两处生产者等值钉子」届时与保存期共用）。

---

## Task 8 — 旧 RAG 文件的读取期归一

> 文件：`config/rag_config_file.py::from_file()`、`tests/test_rag_config*.py`，含 API 不回显密钥测试的载体调整。**新增三个退役键的剥离（R18 后是三个，不是两个），且剥离循环必须从顶层扩到嵌套**，保留既有 `parse_backend` 归一。本 Task 不删字段、不动前端／示例 JSON／`SECRET_ENV_VARS`，响应删键及 golden 归 Task 9。
> **验收对应**：spec §4 的 12（读取部分）/ 13。**必须与 Task 9 背靠背、同批发布**：此时仍可写旧字段却已不从文件读值，不是可单独部署状态；反序则会使旧文件因未知键加载失败。
> **为什么必须扩到嵌套（R18，已核过源码）**：`rag_config_file.py:169-175` 今天的循环是**顶层的**——`for key in _RETIRED_KEYS: if key in raw: raw.pop(key)`。而三个退役键不在同一层：`vlm_base_url` / `vlm_api_key` 在顶层，`video.caption_model` 在**嵌套的 `video` 块里**，且 `RagVideoFileConfig` 是 `extra="forbid"`（`:67`）⇒ 不扩到嵌套的话，存量 `rag_config.json` 写过 `video.caption_model` 就会**整个 RAG 配置加载失败**（硬失败，不是忽略）。对照：YAML 那侧的 `RagVideoConfig` **没有 `model_config`**（`app_config.py:143-160`）⇒ pydantic 默认 `extra="ignore"` ⇒ 静默忽略、不报错。两个载体失效方式不同，别用一侧的结果推另一侧。

- [x] **夹具交接前置**：把 `test_get_never_returns_a_stored_secret`（HEAD `090bbcbc` 下 `test_rag_config_api.py:177-184`，旧行号 159/165 已失效）的 VLM 密钥载体换成 `embedding_api_key` 等有效字段——`_write_rag_json(...)` 的载荷与 `assert … == MASKED_SECRET` 两处一起改，保留 GET 返回掩码、不回显真实值的断言；同类读取依赖一并盘点，不等 Task 9 才修。**不删除也不改写 `test_support_bundle_redacts_rag_config`（`:309`，夹具 `:318` 写 `"vlm_api_key"`）**：它直接读原始 JSON，保留旧键正是它要守的东西。不提前改响应形状。
- [x] **RED：剥离与日志**：临时文件带**三个**退役键（两个顶层 VLM 键＋嵌套的 `video.caption_model`）、可辨识地址／钥匙哨兵及有效 `vlm_model` / `default_model` / `video.asr_model`。有效覆盖不含退役键、**同层的其他 `video.*` 有效字段仍在**（嵌套剥离不能顺手清空整个 `video` 块）；warning 只含键名不含值，不把 VLM 解释为 `parse_tier`。**"不含值"这条断言今天要新建、不是复跑既有的（R22）**：`test_rag_provider_config.py:114-127` 的 `:127` 只有 `assert "parse_backend" in caplog.text`，**没有任何"值不出现"的断言**——生产代码本身是卫生的（`:169-175` 的 warning 只格式化键名与路径），但没被钉住，所以本 Task 要为三个键各补一条"哨兵值不出现在日志里"的断言。长期断言不得读取 Task 9 将删的 `AppConfig.rag` 属性。
- [x] **RED：自动热加载**：冷加载后只改变临时 RAG 文件签名，可追加合法 JSON 空白并改变大小；调用 `get_app_config()`，以 loader 增次／新对象和 `Rag config file changed, reloading AppConfig` 日志证明重载，再验剥离与保密。未改文件命中缓存；强制 reload／reset 另测调用和结果，不套自动分支日志断言。
- [x] **守卫：只读与原兼容**：每次读取前后字节／md5 不变，主动改签名的空白单独计入基线；`vlm_typo`、坏 JSON、非对象继续拒绝；`parse_backend` 单独存在、与三个退役键共存都被正确归一，其他有效字段保留，**顶层与 `RagVideoFileConfig` 两处 `extra="forbid"` 都不放宽**（放宽 extra 会让"剥离"变成"忽略"，Task 9 删字段后就再也测不出漏剥）。
- [x] **GREEN**：在现有归一中新增三个退役键，**剥离循环从顶层扩到嵌套的 `video` 块**（只剥那一个键、不动同层其他字段），只剥不认、不恢复 fallback、不回写；VLM 与 `video.caption_model` 都使用中性退役原因，MinerU 既有行为保留。字段声明继续保留到 Task 9，长期测试不依赖它们继续存在。
- [x] **neuter：剥离与边界**：分别去掉 VLM 剥离／warning、**去掉嵌套剥离（只留顶层循环）**、误删 MinerU 归一、放宽 extra、日志带值、归一回写、**嵌套剥离误清整个 `video` 块**，记录对应受害者并逐个还原。此时字段仍在，剥离测试红的原因是有效覆盖含旧键，不是加载失败；**"去掉嵌套剥离"那一条要靠"存量文件仍能加载"的守卫转红**，因为字段未删时 `extra="forbid"` 还没开始拒绝它。
- [x] **门禁**：ruff 双净、RAG 配置／API／热加载窄面与后端全量零新增失败。完成后接 Task 9，不能把本 Task 的中间态发布；不跑无关前端门禁。

**实测（2026-09-27 完成，RED→GREEN→8 条 neuter→门禁）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `aa36e675`（Task 7 与那笔文档提交之后重核）。**生产改动只有 `config/rag_config_file.py`**；测试 `tests/test_rag_config_file.py`（新增 6 例、改 1 例）＋ `tests/test_rag_config_api.py` 的密钥载体换成 `embedding_api_key`（夹具与断言两处同批，保留"GET 不回显真实值"）。前端／示例 JSON／`SECRET_ENV_VARS`／YAML 侧一律未动；**中间态不发布**（字段仍可写、读时已剥离），Task 9 背靠背接上。

**RED（2 红／4 绿）**：红因＝剥离尚不存在——① `test_retired_keys_are_stripped_from_a_legacy_file`（有效覆盖里三个退役键仍在）；② `test_a_legacy_file_reloads_through_the_real_loader_and_is_stripped_again`（同一断言）。**四条初始即绿是守卫**，牙在下方 neuter：`test_retired_keys_coexist_with_the_mineru_normalization`（neuter ③）、`test_reading_a_legacy_file_does_not_write_it_back`（⑥）、`test_near_miss_and_nested_unknown_keys_are_still_rejected`（④／⑤）、`test_non_object_json_is_rejected`（`from_file` 的既有非对象判定，不在 neuter 清单里）。

**GREEN（关键点）**：`_RETIRED_KEYS` 由 tuple 变成**名字→原因表**（`parse_backend` 保留自己的 MinerU 原因；两个 VLM 键用中性原因「caption 的端点／钥匙现在来自配置的模型条目」），新增 `_RETIRED_VIDEO_KEYS = {"caption_model": "the video caption leg follows rag.vlm_model now"}` 与共享 helper `_drop_retired_keys(raw, keys, *, path, prefix="")`：**先剥后验**、每个键一条 warning、**只报字段名（嵌套报成 `video.caption_model` 这样的带前缀名）绝不带值**、不回写磁盘。调用点两处——顶层循环 ＋「`raw["video"]` 是 dict 时」进一层；**只剥那一个键**，同层 `asr_provider`／`asr_model` 原样保留，两处 `extra="forbid"` 都不动。

**8 条 neuter（逐条独立还原、复跑、最后 md5 逐字节还原）**：① 去掉两个 VLM 键（剥离与 warning 一起没）→ 2 红（剥离例 ＋ 热加载例）；② 去掉嵌套剥离（只留顶层循环）→ 2 红，失守的断言是**有效覆盖仍含 `caption_model`**——**如实记一处与计划措辞的差异**：计划写"要靠'存量文件仍能加载'的守卫转红"，但字段还没删，"仍能加载"那半截此刻本来就是绿的，红的是同一条用例的"不携带"断言（Task 9 删字段后，同一处才变成加载失败）；③ 误删 MinerU 归一（`parse_backend` 出表）→ 2 红（既有 `test_a_retired_parse_backend_key_is_stripped_with_a_warning` ＋ 新的共存例）；④ 嵌套 `extra="ignore"` → 1 红（近名／嵌套未知键例的嵌套半）；⑤ 顶层 `extra="ignore"` → 2 红（既有未知字段例 ＋ 近名半）；⑥ warning 带值（先打日志后 pop、`%r` 带上值）→ 1 红（哨兵值不入日志的三条断言，R22 要求的新断言）；⑦ 归一回写（`from_file` 把剥完的 raw 写回磁盘）→ 2 红（只读守卫 ＋ 热加载例的"未改文件命中缓存"断言被自己的回写打破）；⑧ 嵌套剥离误清整个 `video` 块 → 1 红（同层字段仍在的断言）。

**门禁**：ruff `check` ＋ `format --check` 双净。RAG 配置／API／热加载窄面（`test_rag_config_file.py`／`test_rag_config_api.py`／`test_rag_config.py`／`test_rag_config_save_probe.py`／`knowledge/test_rag_provider_config.py`）**147 passed**；`test_rag_config_file.py` 单跑 **40 passed**（含全量开跑后补的非对象守卫例，用仓外 basetemp 单跑）。**后端全量 161 failed／12599 passed（16:33）——与 Task 7 那次的失败集合逐条相同（`comm` 双向零新增、零消失），不需 A/B**。

**未做／交接**：删字段、删响应键与 golden、`test_rag_config.py:181` 的 `video.caption_model` 断言、`config.example.yaml` 的旧行／前端两字段／`SECRET_ENV_VARS` 条目——**全部归 Task 9，必须与本 Task 背靠背同批发布**；`test_support_bundle_redacts_rag_config` 按计划**不改写**（它直接读原始 JSON，保留旧键正是它要守的东西）；YAML 侧 `RagVideoConfig`（`extra="ignore"`）行为不变，`config.yaml` 里的旧键仍是被静默忽略而非剥离。

---

## Task 9 — VLM 退役、RAG 目标检查与最终验收

> 文件：`knowledge/model_target.py` 的纯缺项判定；抽取／裁判的 RAG 构建入口、`vlm_target.py`、两条 captioner；`RagConfig`／`RagVideoConfig`／`RagConfigFile`／`RagVideoFileConfig`／RAG router；`worker.py::recaption_document()`、`eval/ondemand.py::run_full_eval_for_kb()`；前端 RAG wire／form 退役项、golden 与相关测试、示例及必要使用说明；**文档同批（R11 / R15 / R16）**：`backend/AGENTS.md:703-723`、`UPSTREAM_README.md:957-958`、`config.example.yaml:2564`、`:2578-2584` 与 **`:2667`（R18 的 `caption_model: ""`）**。**不改** `config/models_config.py`、公共 `models/factory.py`、模型管理 API／编辑器、聊天生产接线，**也不改 `tools/builtins/graph_search_tool.py`**（它经 `get_extract_llm()` 共享抽取角色，形参可选即生效，行为变化由 RED 正向断言覆盖，R12）。Task 8 必须先完成，字段删掉后其归一继续承重（**含 R18 的嵌套剥离**）。
> **验收对应**：spec §4 的 3 / 5 / 7 / 10 / 11 / 12 / 13 / 14 / 15；最终真栈复验 1 / 2 / 6 / 8 / 9。

### 退役交接清单

以 spec §5.2 为完整定位表，以下是本 Task 不得漏掉的同批处理项；旧行号实施前按符号重读。

| 载体 | 同批动作 |
| --- | --- |
| schema／模板 | `RagConfig` 删 `vlm_base_url` / `vlm_api_key` / `vlm_api_key_env`；JSON 模型／示例删前两项；`vlm_model` 保留但去厂商字面量默认，不改 Task 1 的 RAG 默认。**R18 的第三个退役见下一行** |
| **`video.caption_model` 删除面 29 处／16 文件（R18）** | 逐层清点（排除历史文档与本期这对）：**后端 schema 3**（`app_config.py:158` 的 `RagVideoConfig.caption_model`、`rag_config_file.py:71` 的 `RagVideoFileConfig.caption_model`、`routers/rag_config.py:65` 的 `_VIDEO_FIELDS` 里那一项）；**后端生产读取 1**（`video/captioner.py:83`，读取点本身已在 Task 6 改掉，这里是删字段）；**后端 docstring 3**（`video/captioner.py:5`／`:74`、`vlm_target.py:61`）；**后端测试与 golden 9**（`response_golden.json` 的 `:33/63/112/142`、`test_rag_config.py:181`、`test_rag_config_file.py:98/103`、`test_recaption.py:91`、`test_worker_pipeline.py:121`）；**前端生产 6**（`types.ts:13`、`config-form.ts:55/127/170/248/516`）；**前端测试 5**（`config-form.test.ts:78/107/135`、`functional-models.dom.test.tsx:166/186`）；**模板 1**（`config.example.yaml:2667` 的 `caption_model: ""`）；**活文档 1**（`docs/PRE_RELEASE_HARDCODE_INVENTORY.md:426` 把 `rag.video.caption_model` 当现行字段描述其继承规则 ⇒ 退役后成假话；与 `backend/AGENTS.md` 同类，归本 Task 而非 B-2）。合计 **3+1+3+9+6+5+1+1 = 29 处／16 文件**，上述行号已逐个回源核过。历史文档留档不改：`specs/2026-09-08-video-ingest-design.md:187`、`specs/2026-09-10-rag-functional-model-config-design.md:54`、`specs/2026-09-14-rag-model-provider-adaptation-design.md:59`、`plans/2026-09-10-rag-functional-model-config.md:29`。**行号截至 HEAD `090bbcbc`，实施前按符号重扫、不以这份清单为上限**（用户当时口径是"19 处"，实数为 29 处／16 文件，找不到任何能得出 19 的划法） |
| **`vlm_target.py` 条目分支（R14）** | 不只删 legacy 分支（`:77-83`）与 `_environment_key()`（`:52-54`）：条目分支的 `base_url=endpoint or config.rag.vlm_base_url`（`:71`）改按 spec D10.2 的表取 provider 默认，`api_key=dumped.get("api_key") or config.rag.vlm_api_key or _environment_key(config)`（`:72`）只剩条目自己的 `api_key`。**删掉 `_environment_key()` ＝同时抽走条目分支的环境变量兜底**，这正是 D10.1 严格钥匙检查不可绕的前提；只删 legacy、留着条目分支 env 兜底的话检查形同虚设，所以要有一条专属钉子（条目内无钥匙＋宿主环境有同名变量 ⇒ 仍判缺项）。模块 docstring `:10-12` 描述 legacy 回退的那段同批改 |
| 模块级密钥引用 | 删除 `SECRET_ENV_VARS["vlm_api_key"]` 时同步处理两条 captioner 的 `VL_API_KEY_ENV` 和缺钥匙分支，先确认模块可 import，不能留下收集期 KeyError |
| RAG router | 删 `_SECRET_FIELDS` 的 VLM 项、`_secret_env_name()` 特例及 `_SECRET_LEGS` 注释末句；响应／来源两键与 golden 同批删，保留默认字段 |
| 前端 form | 删 wire／表单类型、`TEXT_FIELDS` / `SECRET_FIELDS` 项及 `formValuesFromConfig()` 两个显式映射；写入循环与读取字面量不是同一结构，不能只改清单 |
| 旧 VLM 断言 | 反转借 RAG 地址（**改为按 provider 借 SDK 默认值，只有 `openai-compatible` 才报错**，R1）、借 RAG／env 钥匙、裸 id legacy、空参数借字面量默认、未知名判 legacy 方言五处；条目名／wire id／默认值设成不同值，不能只 grep `source == legacy` |
| 其他测试与说明 | 补齐“只有角色名无模型列表”的 API 夹具（`test_rag_config_api.py` 的模块级 `YAML_RAG` `:29-36` ＋ `_write_config_yaml()` `:39-43` 写 `"models": []` ＋ `config_env` 里的 `{"models": []}`，旧行号 29–41 已失效）、视频裸 id／环境钥匙夹具（**`video/test_captioner.py` 的六条实为 `:33-94`，不是旧写的 `:37-91`**，全部是 `model="test-vlm"` ＋ `DASHSCOPE_API_KEY`，R22）；同步 VLM／video captioner／test_vlm_target 模块说明；Task 8 的 GET 密钥载体仅复验 |
| **零模型条目夹具 ⇒ 既有 200 会变 400（R22，最容易漏的一条）** | `config_env`（`test_rag_config_api.py:55-81`）写的是 `models_config.json = {"models": []}`、`_write_config_yaml()`（`:39-43`）也写 `"models": []` ⇒ **夹具里一个模型条目都没有**。而 golden 的 `put.payload` 与 `test_judge_model_round_trips_as_a_regular_field`（`:264-280`，PUT `{"judge_model": "judge-entry"}` 期待 200）都声明了一个不存在的条目名 ⇒ **本 Task 的保存期错名映射会把这些既有的 200 打成 400**。**修法是给夹具补条目、不是放宽检查**：照今天刚落地的先例 `_EndpointSeededClient`（`:90-101`，docstring 写明 "Both endpoints are required (spec 2026-09-25 rag-endpoint-unlock D1/D3)"）——它就是为了同一类"新校验打掉旧夹具"而加的。同批要核的还有 `test_judge_model_falls_back_to_config_yaml`（`:284-289`）与所有走 `config_env` 的 PUT 用例；**别把这条当成"新校验有 bug"去改生产代码** |
| 旧变量说明 | `config.example.yaml:2564` 的独立 `SILICONFLOW_VLM_API_KEY` 注释删行；`app_config.py:184`／`backend/AGENTS.md:1188` 的名单只删该项和分隔符，保留其他变量；不改名为另一厂商专属变量 |
| **`config.example.yaml:2578-2584`（R16）** | 与上一条是**同一文件的两个不同段**，别只改一处：`vlm_model` 上方注释里的 `A bare model id keeps the legacy path: rag.vlm_base_url (DashScope's compatible endpoint by default) plus DASHSCOPE_API_KEY`（`:2578-2581`），以及注释掉的 `# vlm_base_url: …` 与其引导句 `Endpoint used when vlm_model names no models: entry`（`:2583-2584`）。`:2582` 的出厂值 `vlm_model: qwen3.7-flash` 随字面量默认一起处理 |
| **模块指南与上游说明（R11 / R15）** | `backend/AGENTS.md:703-723` 的 “Caption target resolution” 整段重写：删掉 `falling back to rag.vlm_base_url when the entry declares none`（`:707-708`）、`then the rag file key, then the environment`（`:709`）、`the legacy bare-id path below, keep the OpenAI shape`（`:714-715`）、`A value that names no entry is a legacy bare model id and keeps the old path (…)`（`:717-720`）、`rag.vlm_base_url as the only two endpoint sources`（`:721-723`），改成“条目提供三元组；条目缺地址时按 provider 惰性取该 SDK 自己的默认值；命名不到条目即配置错”。`UPSTREAM_README.md:957-958` 删掉 `or a bare model id to use rag.vlm_base_url with the caption API key` 那半句。**这两处不属 B-2**：根 `AGENTS.md` 的文档更新约定要求架构改动在同一个变更集里改对应模块指南。**另补一段 RAG 默认模型（2026-09-26 用户裁定并进本 Task）**：`rag.default_model` 的语义、D3 的四条角色链、`knowledge/model_target.py` 的 resolver 与"只有默认本身失效才回首项并 warning"、以及空白即未声明的归一规则——`knowledge/` 的模块描述里今天没有这层，Task 1 交付后一直没写；并进本 Task 是为了与上面那段同文件同批改，避开与在飞那条线三方相撞 |
| parser／原始 JSON | `test_parser.py` 改模块说明、去掉旧变量的无效 setenv，保留用例及有效断言，夹具改条目；support-bundle 对旧原始 JSON 的脱敏仍保留。返回形状的适配已归 Task 6（R13），两件事不要混在一处改 |
| 外部交接 | B-2 的 `.env.example`、README／UPSTREAM_README 中的**旧环境变量名单**和 e2e smoke live 门禁清理仍归发布前清单，不在本 Task 冒领；本功能的新使用说明按模块指南同步。**边界（R11 / R15）**：B-2 接的是 `SILICONFLOW_VLM_API_KEY` 这类**环境变量名**，`rag.vlm_base_url` 是本 Task 删掉的**配置字段**——描述它的模块指南段落与上游说明那半句归本 Task，不因“也在 README 里”就顺延，否则交付后指南会描述一条已不存在的路径 |

### 实施与验证

- [x] **夹具前置：来源与隔离**：UI 夹具走临时 `AppConfig.from_file()` 或明确设置 `_ui_model_names`；调用前断言 `is_ui_managed_model()` 为 True，非 UI 对照为 False。`AppConfig(...)`／列表合并不会自动填 PrivateAttr，不改生产代码来补假来源。拒绝测试精确断言类型、条目和缺项，不把 SDK 自己的异常或“没出网”算成功。
- [x] **RED：纯判定范围**：范围＝UI 来源 × 协议格（`openai-compatible` / `anthropic`，含 OpenAI Chat／Responses、同名 UI 覆盖）× **用户显式声明的目标**。**钥匙**缺失／空白一律算缺项，SDK 隐式环境凭据不能补齐；**地址**只对 `openai-compatible` 算缺项，`anthropic` / `deepseek` 缺地址按 R1 走 SDK 默认值、不是缺项。**由 `models[0]` 兜底出来的目标完全不进判定**：断言纯函数对它返回"无缺项"，且保存／运行都不因它拒绝。纯函数只返回同一脱敏原因，不创建 SDK／不出网；完整条目、非 UI、厂商格三类有正向／范围对照。
- [x] **RED：RAG 保存有效目标**：分别覆盖 `default_model`、`extract_model`、`judge_model`、`vlm_model` **四个**字段（**R18 后不含 `video.caption_model`**）的选用与继承，最终 UI 协议目标缺钥匙（或 `openai-compatible` 缺地址）时 400、前缀为 `提交后的配置仍不可用：`，文件字节不变。检查 pending 而非旧 UI 配置；**图片与视频是同一条链**（`vlm_model → RAG 默认 → 首项`），**不要再写"视频先自身再图片再默认"**——那句话依赖已退役的字段，写出来是永真空断言；要验的是视频腿与图片腿读到同一个目标（Task 6 已改读取点，这里验保存期检查也覆盖到它）。只有默认失效可首项＋warning，显式错名不回落；存在显式角色覆盖时也不能漏检所提交的默认目标。**兜底首项缺钥匙／缺地址的正向对照必须能保存成功**（只 warning），这是 R2 的牙。校验零出网，已有 embedding 探针按原条件独立工作。
- [x] **RED：保存期错名映射**：四个角色分别提交不存在的名称，judge 另测无同名条目的 `dashscope:qwen3.8-max`；均返回 400，detail 精确为 `提交后的配置仍不可用：Model <名称> not found in config`，不落成 500。无模型亦为 400＋前缀及配置原因；文件不变、SDK 构造／出网为零，默认失效但存在可用首项可保存作对照。复跑 Task 7，运行／CLI 错名仍为普通 ValueError，不因保存边界改动而变成 RAG 异常。**先修夹具、别改生产代码（R22）**：`config_env` 是**零模型条目**的（`test_rag_config_api.py:55-81` 与 `_write_config_yaml()` `:39-43` 都写 `"models": []`），而 golden 的 `put.payload` 与 `test_judge_model_round_trips_as_a_regular_field`（`:264-280`）都声明 `judge_model: "judge-entry"` ⇒ 本条一上线这些既有的 200 就变 400。按 `_EndpointSeededClient`（`:90-101`）的先例**给夹具补一个真实条目**，同时核 `test_judge_model_falls_back_to_config_yaml`（`:284-289`）与所有走 `config_env` 的 PUT。**等值钉子（R6）**：这句文案本期有两个生产者（`models/factory.py:302` 与 RAG 侧 helper），工厂冻结不许改，所以另加一条断言——真实触发工厂的 not-found，比较 `str(exc)` 与 RAG helper 的输出**逐字相同**；helper 的实现只允许一处常量／函数，不许在保存与运行两侧各写一遍字面量。
- [x] **RED：抽取／裁判运行检查**：经真实 `get_extract_llm()`、`build_judge_llm()` 在调用公共工厂之前拒绝**显式声明**目标的 UI 协议缺项；精确 `RagConfigurationError`，消息与纯判定完全相同，零 SDK 构造。合法条目仍经真实工厂构建，传入明确名称及同一快照；显式 `$TEST_MODEL_KEY` 经宿主临时加载解析成功的对照可用。**兜底首项缺钥匙的对照不在 RAG 层抛错**：它照常进工厂，失败发生在请求期（与今天相同），只留 warning——这是 R2 在运行侧的牙。D9 错名仍是普通 `ValueError("Model <名称> not found in config")`，不能用它描述“存在但缺字段”。
- [x] **RED：检索期入口与条目分支 env 兜底（R12 / R14）**：两条专属钉子。① 经 `graph_search` 的核心实现（`tools/builtins/graph_search_tool.py:199`）用一个缺钥匙的**显式声明**目标，同样在调用工厂前抛 `RagConfigurationError`，且**该文件未被修改**（diff／源码级断言）；这条失败面是本期新增的，必须显式钉住而不是靠“抽取入口已测”推出来。② `_environment_key()` 删除后，一个条目内不写 `api_key`、而宿主环境里有同名变量的 UI 协议条目，纯判定仍报缺钥匙——只删 legacy 分支、把条目分支的 env 兜底留着的话这条会红，而其余用例可能全绿。
- [x] **RED：两条配文入口**：`caption_images()` / `caption_shots()` 的配置检查位于可恢复逐项捕获之外，**显式声明目标**缺项时抛相同 `RagConfigurationError`，不返回占位符／degraded；新文档配置错误落 failed，无 HTTP 请求。**兜底首项缺钥匙时保留今天的占位符降级**（`captioner.py:69-71` 的既有行为），不抛错、不落 failed——与上一条合成 R2 在配文侧的两面。完整目标用 MockTransport 成功；象征性钥匙可用于无鉴权测试服务，HTTP 失败／空回答仍按 Task 6／原视频规则计失败，不扩大硬失败范围。
- [x] **RED：视频 recaption 终态**：通过真实 `recaption_document()`，检查发生在镜头重置／物化／重嵌前；配置错后旧 caption／chunks／向量不变，文档 ready／100、本次 caption=failed、error 追加脱敏原因、不留 indexing，in-flight 释放。不能只断言底层 captioner 抛错，ready 不代表本次重新配文成功。**in-flight 的释放机制与评测那条不同，别照抄"finally"（R22）**：视频侧是 `worker.py:250-252` 的 `asyncio.create_task(...)` ＋ `self._inflight.add(task)` ＋ `task.add_done_callback(self._inflight.discard)`——**done-callback，不是 finally**，`_run_recaption_guarded()`（`:254-256`）与 `recaption_document()`（`:677-707`）**都没有 `finally`**。所以断言要写成"配置错被 `recaption_document` 内部捕获、终态写完后任务正常结束 ⇒ 回调把它从 `_inflight` 摘掉"，而不是"finally 释放"；**顺带钉一条**：若让异常冒出 `recaption_document`，`_inflight` 虽然仍会被摘（done-callback 对异常任务同样触发），但那个异常无人 retrieve ⇒ 会出现 "Task exception was never retrieved"，这也是它必须在内部收尾的理由。`error` 那条走 `_append_error_marker()`（`:707`），注意它是**子串**幂等而标记含计数（R21 ②）。
- [x] **RED：按需评测终态**：真实 `run_full_eval_for_kb()` 第一层完成后裁判目标构造失败，保存 error、第一层指标和 baseline_diff、空第二层与脱敏原因；不吞成 completed（今天被 `eval/ondemand.py:369-370` 的宽捕获吞成"评测成功、第二层为空"，`:372-382` 写 `status="completed"`），不交给丢第一层的 `_save_error_row`。**in-flight 释放**：这一侧**确实是 `finally`**——`_release_run(kb_id)`（`:198-209`，减 `_IN_FLIGHT` 计数并在归零时丢 `_PROGRESS`）在 `:300-302` 与 `:392-394` 两处 `finally:` 里，另有 `:270`／`:338` 两处提前返回时的显式释放；所以新增的错误分支必须落在这些 `finally` 的保护范围内，别新开一条绕过它的返回路。配正常结果／合法可选依赖跳过／普通网络失败原语义对照，答题 agent 不变。**两侧机制不同（计数＋finally vs 任务集＋done-callback），断言分别写，不要合并成一条"释放了 in-flight"**。
- [x] **RED：地址边界与非 UI 边界**：按 spec D10.2 的表逐格验（2026-09-26 本机实测的读法）——① UI `anthropic` 条目仅缺地址、带测试钥匙时，VLM 惰性读 `ChatAnthropic.model_fields["anthropic_api_url"].default_factory()`（离线、不建客户端、不要钥匙，返回 `https://api.anthropic.com`，且本身走 `ANTHROPIC_API_URL`）并完成 MockTransport 请求；② UI `deepseek` 同情形读 `langchain_deepseek.chat_models.DEFAULT_API_BASE`（`https://api.deepseek.com/v1`）；③ 两格各一条钉子断言 RAG 侧读到的值与该 SDK 自己的值相等（SDK 换默认地址时红），做法与 `knowledge/providers/__init__.py` 的 `default_endpoint` 用测试保持相等同族；④ UI `openai-compatible` 仅缺地址则被拒（该 SDK 无可读默认常量，`openai._constants` 只有 timeout/retry/header 项），错误句点名缺地址；⑤ 显式地址在四格都优先；⑥ 不构造 SDK 客户端、不出网探测、不回写条目。范围外缺钥匙仍降级、不借旧 RAG 字段；非 UI 协议完整条目可调用。公共工厂／厂商 SDK 的原环境端点规则保持原样；旧“chat 与 VLM 必须同端点”的断言按 D10.2 收回，改成 ①②③ 的同值钉子。
- [x] **RED：角色与字段退役**：图片／视频有效空角色按 Task 6 的**同一条链**进入 RAG 默认，显式未知名／裸 id 报配置错，不发空 model。删除**三项退役**的字段（`RagConfig` 三字段、`RagConfigFile`／示例 JSON／前端两字段、**`video.caption_model` 的两处 schema 声明与 `_VIDEO_FIELDS` 那一项**）及 `vlm_model` 的字面量默认，并反转交接表五处旧 VLM 断言；旧字段分别回送 PUT 得 422、文件不变，合法载荷有成功对照。**回送 `video.caption_model` 也要单独测一条 422**（它是嵌套键，与两个顶层 VLM 键的拒绝路径不同：前者靠 `RagVideoFileConfig` 的 `extra="forbid"`，后者靠 `RagConfigFile` 的）。模型条目仍能显式引用任意测试环境变量，RAG JSON 本身不新增 `$VAR` 展开。
- [x] **守卫：归一承重与整对象清理**：Task 8 的存量文件在删字段后仍可冷／自动热加载，默认与有效角色保留、退役值不参与目标，MinerU 共存不变。**三个退役键都要覆盖，且嵌套那个单独一条**：存量文件同时含 `vlm_base_url`、`vlm_api_key` 与 `video.caption_model` 时仍能加载、**同层其他 `video.*` 字段（`asr_provider` / `asr_model`）保留**——这条只有 Task 8 的嵌套剥离真的做了才绿，是 R18 在删除侧的牙。合法 PUT 不含旧键时清掉磁盘旧键；此行为已有整对象替换即可成立，不冒充 Task 9 RED。只有字段删后移除读取剥离才以加载失败转红。
- [x] **GREEN：RAG 检查接线**：纯判定只放 `knowledge/model_target.py`；RAG 保存／抽取／裁判／VLM 复用，缺项统一抛 `RagConfigurationError` 并由保存映射 400。**判定只对显式声明的目标生效**：兜底出来的首项不判定，走 warning 点名 + 今天各腿的降级（配文占位符、抽取／裁判请求期失败）。保存边界另用纯条目查找将显式错名／无模型映射为 400，**not-found 文案在 `model_target.py` 里只有一处常量／helper**，不构造 SDK、不泛化捕获整个 PUT 的任意 ValueError；运行／CLI 的普通 judge 错名仍保留原 ValueError。显式名称和配置快照传给未修改的工厂，不从全站加载器或公共工厂增加检查。`anthropic` / `deepseek` 的默认地址读取只在缺地址时惰性 import 该 SDK 的常量／字段默认，不把 URL 抄进本仓、不改 HTTP 构造；`openai-compatible` 不读默认值。
- [x] **GREEN：退役与用户入口收尾**：按交接表同批删字段／密钥引用／前端映射／示例／golden，先核两个 captioner 可 import；保留 Task 8 归一（**含嵌套剥离**）和范围外缺钥匙降级。`vlm_target.py` 的**两个分支**都改（条目分支 `:71` 取 provider 默认、`:72` 只剩条目钥匙，legacy 分支与 `_environment_key()` 删除，R14），不只删 legacy。**R18 的删除面按交接表那行逐层做**（29 处／16 文件），其中 `config.example.yaml:2667` 的 `caption_model: ""` 容易漏——它与 `:2564`／`:2578-2584` 是**同一文件的第三个不同段**。**文档同批（R11 / R15 / R16）**：重写 `backend/AGENTS.md:703-723` 的 “Caption target resolution” 段、删 `UPSTREAM_README.md:957-958` 的裸 id 半句、改 `config.example.yaml:2578-2584` 的注释段与注释掉的 `vlm_base_url` 行、删 `:2564` 的 `SILICONFLOW_VLM_API_KEY` 注释行并同步 `app_config.py:184`／`backend/AGENTS.md:1188` 的变量名单、**改 `docs/PRE_RELEASE_HARDCODE_INVENTORY.md:426` 那行（R18：它把 `rag.video.caption_model` 当现行字段描述其继承规则）**；改完 grep 一遍 `vlm_base_url` / `vlm_api_key` / `SILICONFLOW_VLM_API_KEY` / **`caption_model`**，确认**生产代码**里零残留。**残留白名单要写进实测记录，不能笼统宣称“文档也干净”**：`docs/superpowers/` 下的历史设计文档留档不算残留（`caption_model` 那条是 `specs/2026-09-08-video-ingest-design.md:187`）；`.env.example:44`、`README.md:221`、`UPSTREAM_README.md:152` 的 `SILICONFLOW_VLM_API_KEY` 与 `test_e2e_smoke.py:53` 属 **B-2 发布前清单**，Task 9 之后仍会存在，是预期而非漏改；**`.github/workflows/nightly.yaml` 的 `DASHSCOPE_JUDGE_API_KEY`（`:266/280/290`）与 `--judge-model dashscope:qwen3.8-max`（`:303`）也属预期残留**（Task 7 已登记，R26）。recaption 先验目标后动旧内容；按需评测将模型配置错误从可选第二层宽捕获中分离，保存含第一层结果的 error 行，**评测侧沿用 `_release_run()` 的 `finally`（`:300-302`／`:392-394`）、视频 recaption 侧沿用 done-callback（`worker.py:252`），两种机制不要互相搬**，不新增表／状态枚举。
- [x] **neuter：范围／角色／保存**：去掉 UI 来源限制、漏检默认或某个角色、保存误用旧 `config.rag`、绕过抽取／裁判 RAG 检查、将 VLM 缺项改回降级、未知名改回 legacy，各自对应入口断言转红；把缺项文案换成找不到条目时同文与类型断言转红。撤掉保存期错名映射、只留下 RagConfigurationError 捕获时，错名 HTTP 400 断言转红；运行／CLI 异常若被一并改掉，Task 7 的精确类型断言转红。**把严格检查扩到兜底首项（去掉 R2 的豁免）时，"首项缺钥匙仍可保存 + 只 warning"那条正向对照转红**；把 not-found 文案在保存与运行两侧各写一份字面量时，等值钉子仍绿但源码级"只有一处常量"的钉子转红。**R12 / R14 / R18 各一条**：把条目分支的环境变量兜底加回来（即只删 legacy 分支、保留 `_environment_key()`）时，"条目内无钥匙＋宿主环境有同名变量仍判缺项"那条钉子转红；让检索期入口绕过检查（例如在 `graph_search_tool.py` 里另建一条不走 `get_extract_llm()` 的取模型路径）时，检索期那条 `RagConfigurationError` 断言转红，且"该文件未被修改"的断言也转红；**把 Task 8 的嵌套剥离改回只做顶层时，"存量文件含 `video.caption_model` 仍能加载且同层 `asr_*` 保留"那条守卫转红**（字段已删，所以这次是加载失败而不是覆盖含旧键）。公共工厂保持不改，不用“恢复公共工厂旧行为”作本期 neuter。
- [x] **neuter：厂商／归一**：去掉 `anthropic` 或 `deepseek` 任一条默认地址读取分支，使对应那格的正向对照转红（两格分别验，不合并成一条）；把默认地址改成写死在本仓的 URL 字面量，使与 SDK 值相等的钉子失去意义 ⇒ 需另有一条断言 RAG 侧不存在独立 URL 常量；恢复 legacy 地址／钥匙借用使退役对照转红；字段已删后移除 Task 8 剥离使真实加载守卫红；把旧磁盘键合回合法 PUT 使清理守卫红。逐次完整还原，不放宽 unknown-key 验证凑绿。
- [x] **neuter：用户入口**：恢复 recaption catch 只写 ready／error、不收尾 caption，或恢复先重置再验证，分别使终态／旧内容守卫红；恢复裁判错误吞成 completed 或改走 `_save_error_row`，分别使评测终态／第一层保留断言红，记录独立受害者。
- [x] **门禁**：ruff 双净；配置／RAG 保存／抽取／judge／两条 captioner／worker／评测／隔离窄面及后端全量零新增失败。前端 `check`、RAG form 窄面、**两份功能视图 dom 文件（R20：`tests/unit/settings/functional-models.dom.test.tsx` 与 `tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`）**、模型页组合窄面与全量通过；golden 只删本 Task 退役的**三个键及来源**（两个顶层 VLM 键＋嵌套的 `video.caption_model`），不放宽整份形状守卫。复跑 Task 2 的非 RAG 与其他功能模型隔离（**含 R20 那两个无名选模点与 R24 的 7 处基线**）。
- [x] **最终真栈：字段与聊天隔离**：重跑 Task 5 的控件／草稿／原保存按钮／抽取／裁判与聊天不跟随对照；字段变更不改模型文件、不出额外探针。说明本轮在字段退役后执行，不能引用 Task 5 的旧结果代替最终验收。
- [x] **最终真栈：配文继承与状态**：按执行纪律只临时改 RAG 配置，图片／视频有效角色为空时默认 B 的实际目标可核对；有覆盖时验证覆盖优先，**图片与视频此时是同一条链（R18），所以"视频保留图片一层"这类说法已作废——要验的是两条腿读到同一个目标**。跑授权带图文档／视频，记录实际 HTTP 成功或失败；若选完整但未声明视觉的条目，不预判必失败。文档全失败时核 caption degraded 和 `image caption degraded: N/N images failed`，无失败时如实记成功；严格错误与阈值边界由隔离用例保证，不修改用户模型制造故障。
- [x] **最终还原与说明**：成功／失败都还原 RAG 文件原字节／存在状态／md5，确认模型／YAML／扩展配置指纹不变，清理本次明确 ID 的测试资源。记录 console／network、未满足的真栈前提及阻塞，不虚报完成；同步本功能使用说明和必要模块指南，原已交付设计不重写，B-2 仍独立交接。

**实测（2026-09-27，检查面＋退役面＋终态＋neuter 已交付；真栈两腿待重启后执行）**：

**性质与基线**：实施 Task，数字全部来自实际运行。基线 HEAD `aa36e675`（Task 7 与盘点入库之后重核）。**生产改动 9 个文件**：`knowledge/model_target.py`（纯判定＋共享文案＋`require_usable_rag_target`）、`knowledge/vlm_target.py`（借址＋legacy 删除）、`knowledge/graph/extractor.py`／`knowledge/eval/factory.py`（入口接检查）、两条 captioner（钥匙来源与告警）、`knowledge/worker.py`（recaption 终态）、`knowledge/eval/ondemand.py`（裁判配置错的行状态）、`config/app_config.py`／`config/rag_config_file.py`／`app/gateway/routers/rag_config.py`（退役面）；前端 2 个生产文件 ＋ 2 个测试；模板／示例／盘点档／`backend/AGENTS.md`／`UPSTREAM_README.md` 同批。**未改**：公共工厂、`models/factory.py`、模型管理 API／编辑器、聊天生产接线、`tools/builtins/graph_search_tool.py`（R12 的正向面靠它未被修改的断言钉住）。

**RED（各簇红因逐条记录）**：① 纯判定 10 红（`rag_target_missing` 尚不存在 ⇒ ImportError 型红，其余 11 例保持绿）；② 保存期 9 红（缺项不拦、错名不拦）；③ 运行期入口 5 红（抽取／裁判／检索期／配文四处不拒 ＋ 一条兜底对照）；④ 地址边界 3 红（两条 SDK 借址分支与 openai-compatible 的拒绝尚不存在）；⑤ 退役面 26 红（配文链夹具仍走 env／裸 id、golden 仍含三个键、默认值断言仍写字面量）；⑥ 两个终态 2 红（recaption 留下腿自己的 `indexing`；裁判配置错被吞成 `completed`）。

**GREEN（关键点）**：`rag_target_missing`（纯、UI×协议格、钥匙只认条目、地址只 `openai-compatible` 必填）＋ `require_usable_rag_target` 接四处入口；保存期 `_reject_unusable_role_targets` 判四个字段、两类错误分开（错名 → `Model X not found in config`，缺项 → 共享原因），前缀 `提交后的配置仍不可用：`；**一处措辞**：`model_not_found_message`／`is_model_not_found_error` 落在 `model_target.py`，Task 7 的 CLI 改为 import 共享识别器；D10.2 的两格借址（`ChatAnthropic.model_fields["anthropic_api_url"].default_factory()`／`langchain_deepseek.chat_models.DEFAULT_API_BASE`）惰性读取、不落 URL 字面量；三项字段与两处环境兜底删除、Task 8 的剥离继续承重；recaption 失败分支补 `path_status={"caption": "failed"}`；按需评测把 `RagConfigurationError` 从宽捕获中分出、行记 `error` 且保留层一与 diff。

**读法两处（本 Task 的裁量，可撤）**：① **保存期对四个字段一律拒错名，默认字段也不放行**——§4.3 写"保存期四种角色错名…均为 400"，D3 的 warning＋首项回落属**运行期**（模型被删后旧默认变陈）。② **openai-compatible 条目无地址时，配文入口直接拒**（含兜底目标）——该格没有可借的 SDK 默认，静默落到 OpenAI 公有云比拒绝更糟；"兜底仍降级"只针对**钥匙**（R2 的牙）。③ **脱敏原因进日志、行内不加列**：`eval_runs` 无 error 列，计划亦禁新增表／状态枚举，与 Task 7 的 CLI 处置一致。

**13 条 neuter（逐条改→跑→逐字节还原，13×md5 一致）**，受害者数：① 去掉 UI 来源限制 1（`test_entries_outside_the_grid_are_out_of_scope`）｜② 漏检默认字段 2｜③ 撤掉保存期错名映射 8（四条角色 400＋无模型＋前缀名＋失效默认＋"一处措辞"源码钉）｜④ 去掉 R2 豁免 2（纯判定＋抽取兜底对照）｜⑤ 条目分支 env 兜底加回 3（含 R14 专属钉）｜⑥ recaption 不收尾 1｜⑦ 裁判错吞成 completed 2（新终态＋既有层二降级用例）｜⑧ 嵌套剥离回退到只做顶层 4（字段已删 ⇒ 这次是**加载失败**，正是 R18 在删除侧的牙）｜⑨/⑩ 两条地址读取分支分别 2／1｜⑪ 厂商 URL 写进本仓 1（字面量钉）｜⑫ 放宽顶层 `extra` 3（含新 422 守卫）。**一条负结果**：511 的"把旧磁盘键合回合法 PUT"两种打法（读取剥离／PUT 载荷预剥）都不红——422 由载荷校验（`extra="forbid"`＋字段已删）直接承重，计划自己也写明"此行为已有整对象替换即可成立，不冒充 Task 9 RED"；该族的牙由 ⑫ 给出。

**夹具与受害者改载体（R22 的坑两处都踩到）**：`test_rag_config_api.py`／`test_rag_config_save_probe.py` 的 fixture 原本零模型条目，新保存期检查会把既有 200 打成 400 ⇒ 按 `_EndpointSeededClient` 先例给 `config.yaml` 的 `models:` 补上用例声明的条目（YAML 来源不进严格格），`_seed_two_models` 的 UI 条目补 `base_url`；**没有放宽检查**。配文链的夹具全部条目化（`_VLM_ENTRY`／autouse 夹具），裸 id 与 env setenv 去掉；golden 只删本 Task 退役的三个键与来源（守卫代码未放宽，`_registered_additions` 记了这次撤下）。

**门禁**：ruff `check` ＋ `format --check` 双净。RAG／VLM／knowledge 窄面 **1461 passed**（只剩两条既有环境红：本机真实 RAG 配置供了钥匙）。前端 `check` 零诊断、RAG form ＋ **两份功能视图 dom** ＋ 模型页窄面 152 passed、**前端全量 243 文件／2648 passed**。**后端全量 160 failed／12641 passed（21:04）——失败集合与上一次逐条相同（`comm` 双向零新增、零消失），另有一条 setup 期 ERROR：`test_recall_test_api::test_recall_test_matches_direct_impl_results` 的夹具外呼失败，单跑即过 ⇒ 环境瞬态，不计回归**。Task 2 的隔离面（含 R20 两个无名选模点与 R24 的 7 处基线）在窄面里复跑通过。

**最终真栈（2026-09-27 晚，后端 20:03 重启后的新代码；只临时改 RAG 配置、逐字节还原）**：

**腿一：字段与聊天隔离**——功能模型视图里 `RAG 默认模型（使用配置默认）` 在位、保存按钮旁「没有需要保存的改动」；**VLM 行只剩模型选择器，「接口地址／API Key」两行已消失**；GET 响应 24 键且 **`vlm_base_url`／`vlm_api_key`／`video.caption_model` 全不在**（退役端到端生效）；聊天页选择器仍 `DashScope / qwen3.8-flash`（对话模型），**≠ RAG 链目标 `mimo-v2.6-flash`** ⇒ 隔离成立。**保存往返**：PUT `vlm_model: ""` ⇒ **200**，GET 回来 `vlm_model=qwen3.7-flash`、来源 `config_file`（清空覆盖后由 `config.yaml` 的声明接手；R2 的正向面＝非 UI 兜底目标不进严格检查，保存不被拒）。**一处如实记录**：Radix 下拉在隐藏窗口里无法合成驱动（点击/按键都发不出，既有约束），"点原保存按钮"这一步用**按钮背后的同一个 PUT 端点**在页面内同源 fetch 完成（带 `X-CSRF-Token`）——链路上等价，但"由按钮触发"未亲验。

**腿二：配文继承与状态**——继承两面都在真栈核到：原态 `vlm_model` 来源 `ui`＝`mimo-v2.6-flash`，三条角色行都显示它（**有覆盖 ⇒ 覆盖优先**）；清空后来源变 `config_file`、目标变 `qwen3.7-flash`（**有效角色为空 ⇒ 下一条链接手**）；图片与视频同一条链（视频侧已无自己的字段）。**真跑带图文档**：往「测试2」传一张 1.7KB 的 PNG（图片即整页）⇒ 202 受理，轮询到 `ready/100`，`path_status = {vector: done, graph: done, **caption: done**, wiki: ready}` ⇒ **文本文档带上了 `caption` 键**（Task 6 的行为在线）、`error = null`（无 `image caption degraded` 标记）；网关日志同刻三条 `POST https://api.xiaomimimo.com/v1/chat/completions → 200 OK`（该条目就是三条角色共用的 `mimo-v2.6-flash`）⇒ **配文 HTTP 成功**。**还原与清理**：RAG 文件临时态 md5 `0a7ccd1e…` → **逐字节还原 `323f9046…`（与快照一致）**，`config.yaml`／`models_config.json`／`extensions_config.json` 指纹未动；探针文档按**明确 id** `5eec91de…` 删除（DELETE 204），「测试2」回到 10 个文档、探针目录已清。

**未做／交发布前清单**：`nightly.yaml` 仍按 R26 不动；B-2 的环境变量名单与 e2e smoke 清理不在本期。

---

## 移出本期的旧 Task 10

不再实施全 UI 条目的地址／钥匙写入必填、admin `has_api_key`、多条旧配置的临时修复草稿；连同原模型保存原始 `$VAR`／完整锁事务、公共／管理缓存连续刷新等需求一起，留待真正拆分时对齐上游模型目录。无实施复选框，不作为本期验收前置，也不算已解决；RAG 仍可在自己的保存／运行入口拒绝不完整目标。

- [x] **交付后回写**：全部实施／门禁／最终真栈完成后同步 spec 与 plan 的 Status，逐 Task 补命令、数量、neuter 受害者、还原证据与已获授权的提交号；保留明确的范围外事项和未完成真栈条件，不把文档修订写成代码交付。

**实测（待回填）**：
