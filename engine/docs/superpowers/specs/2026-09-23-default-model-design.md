# RAG 默认模型（功能模型未指定时的落点）—— 设计

**Status:** **2026-09-27 全部交付：Task 0–9 实施完毕，plan 复选框 82／82，两条真栈腿与最终还原已过**（代码改动未提交，Task 8／9 必须背靠背同批发布）。本次替代原全局默认方案的职责、存储、界面与实施范围，不再沿用“D1–D11 全部保持”的旧声明；保留 RAG 内部的配文标记、judge 直连退役、VLM legacy 退役与读取兼容。公共模型工厂、模型条目管理、聊天偏好和记忆改造退出本期，不能标为已解决。**交付时的三处读法裁量（可撤，详见 plan 的 Task 9 实测段）**：保存期对四个字段一律拒错名（D3 的 warning＋首项回落属运行期）、openai-compatible 条目无地址时配文入口直接拒（该格无可借的 SDK 默认）、按需评测的脱敏原因进日志而不加列（`eval_runs` 无 error 列）。

**同日第二／三／四／五轮修订（按符号核对真实源码后）**：以下用 **R1–R28** 标记，与上一轮审查的 ①—⑭ 不是同一套编号，不互相替代。R1–R10 是第二轮；R11–R17 是第三轮（扫完退役连带面与 `get_extract_llm()` / `caption_images()` 的全部调用点）；**R18–R26 是第四轮＝Task 0 只读核实的结论**，含用户裁定的第三个退役（`video.caption_model`）、两处撤回，以及 judge 退役的用例级受害者与 `nightly.yaml` 那条活调用点；**R27–R28 是第五轮**——R27 是 R26 带出的那条【待裁】的用户裁决（＝乙），R28 是把该裁决落进两份文档时连带查出的五处细化。

| 编号 | 修订 | 落点 |
| --- | --- | --- |
| R1 | 协议格地址不再一律必填：`anthropic` / `deepseek` 缺地址按各自 SDK 默认值解析，只有 `openai-compatible` 保留缺项 | D10.1 / D10.2 / 验收 10 / 11 |
| R2 | 严格检查只作用于用户显式声明的目标；`models[0]` 兜底不检查，保留今天各腿的降级 | D3 末条 / D10.1 / 验收 3 |
| R3 | 字段改名 `rag.default_model`（原 `default_model_name`） | D2 / D3 / §3 |
| R4 | 空白归一点名载体：`RagConfigFile` 字段 validator，覆盖模型引用字段（原写五个，R18 后为**四个**） | D2 / §3 |
| R5 | 30% 阈值复用既有常量，份数不得增加 | D8 / §3 |
| R6 | not-found 文案的第二个生产者 + 等值钉子 | D9 / §3 |
| R7 | `get_extract_llm()` 需新增可选配置形参 | §3 / §5.1 |
| R8 | graph 降级标记的写入点从 indexer 移到 worker | D8 / §3 / §5.1 |
| R9 | 默认选择器的候选源钉为抽取／裁判那一份（`models`，非 `managedModels`） | D4 |
| R10 | D8 关于 error 可见性的表述按 `graph/indexer.py:9-10` 改正 | D8 |
| R11 | `backend/AGENTS.md` 描述 caption 目标解析的整段随退役**同批改**，不推给发布前清单 | §5.1 / §5.2 |
| R12 | `get_extract_llm()` 有第二个生产调用点（检索期 `graph_search`），纳入范围声明、生效面与代价登记 | §1 / D6 / §3 / §6.2 |
| R13 | `caption_images()` 的返回形状定形为 dataclass，并列出既有受害者清单 | D8 / §3 / §5.2 |
| R14 | D10.3 点名 `vlm_target.py` **条目分支**的两处退役字段兜底，不只 legacy 分支 | D10.3 / §5.2 |
| R15 | `UPSTREAM_README.md` 描述裸 id ＋ `rag.vlm_base_url` 的那半句归 Task 9，不属 B-2 的"旧变量名单" | §5.1 / §5.2 |
| R16 | `config.example.yaml` 的 `vlm_model` 注释段与注释掉的 `vlm_base_url` 行归 Task 9（与 `:2564` 那行是两处） | §5.2 |
| R17 | §6.2 补登四条既有行为变化／代价：`vlm_model` 字面量默认删除＝换模型、检索期新失败面、评测终态 completed→error、英文标记观感 | §6.2 |
| **R18** | **用户裁定：退役 `video.caption_model`，视频配文永远跟随 `rag.vlm_model`**（删除面 29 处／16 文件）。连带：R4 的 validator 从五字段跨两类收窄为**四字段单类**、D3 视频行降一级、D5 那句视频继承说明**删除**（无 UI 行可挂）、Task 8 必须新增**嵌套**退役键剥离 | §1 / D1 / D2 / D3 / D5 / D10.1 / D10.3 / D10.4 / §3 / §4 / §5 / §6.2 |
| R19 | 保存链与 golden 的实测事实：`_assert_pure_addition` + `_ADDED_FIELDS` 只管**顶层**键 ⇒ 嵌套的 `default_model` 必然使 golden 红；`buildRagConfigInput:210-212` **已经**是 D2 要的语义；`{}` 是**有条件**的；`sources` 无 `default` 态 | §5.2 / §6.1 |
| R20 | 三个此前未被点名的载体：第三份 dom 测试、两个无名 RAG 选模点（`wiki/generator.py`、`eval/synthesis.py`）、`backend/AGENTS.md:1211` 的 judge 直连说明 | D6 / §5.1 / §5.2 |
| R21 | 配文生命周期四处实测：重解析有**两处**残留（`path_status` 与 `documents.error`）、`_append_error_marker` 的幂等是**子串**比较而标记含计数、硬失败落盘**覆盖写** `error` | D8 |
| R22 | 夹具与断言的实测修正：`config_env` **零模型条目** ⇒ Task 9 会把既有 200 打成 400（修法照今天刚落地的 `_EndpointSeededClient`）；`parse_backend` **没有**"warning 不含值"的断言；`video/test_captioner.py` 实为 `:33-94`；同值夹具比原描述更细；in-flight 释放**两种机制** | §5.2 / D10.5 |
| R23 | D10.2 三条读法在实装版本上复核通过，并补一条坑：anthropic 只能走 `default_factory()`（`.default` 是 `PydanticUndefined`） | D10.2 |
| R24 | **撤回**"默认行要不要加无模型空态"这个待裁点：`modelReferenceOptions()` 永远先塞空选项、且把指不到条目的已存值保留成一项，D4 的"沿用现有处理"本就是"不加东西"。另记非 RAG 选模基线共 **7 处** | D4 / §5.2 |
| R25 | judge 退役的受害者从"两个文件名"细化到**用例级**：`test_eval_factory.py` 8 例中删 3／重装 2、`test_ragas_eval_cli.py` 17 例中删 4／重装 2，并排除两个假受害者（`test_eval_cli.py` 零命中、`:86` 走另一条 skip 路）；另点名 `test_ondemand.py:93-123` 是 **Task 2** 的受害者，此前两份文档都没写 | §5.2 |
| R26 | `nightly.yaml:303` 传的正是被退役的 `dashscope:qwen3.8-max`，且失效链逐级核过 ⇒ 按现文实施会让该 job **静默假绿**（退 1 落进 `exit 0`），不是变红。由此带出 D9 的一条【待裁】（**R27 已裁＝乙**）：CLI 退 traceback(1) 还是干净的 `EXIT_ERROR`(2) | D9 / §5.2 / §6.1 |
| R27 | **R26 带出的【待裁】已裁＝乙**：CLI 错名不再抛穿，改为 stderr 一句可读原因 + 落一行 `status="error"` + 退 `EXIT_ERROR`(2)，让上游 nightly 红而不是假绿；库层 `build_judge_llm()` 仍精确抛 `ValueError`，映射只在 CLI 边界 | D9 / §4-9 / §6.1 |
| R28 | **把 R27 落进文档时连带查出的五处细化**：① 那行 `status="error"` 必须有**专属断言与专属 neuter**——按现有夹具风格（`get_app_config` monkeypatch 成 `object()`，`test_ragas_eval_cli.py:157`）写，`_persist_eval_run` 会在 `run_ragas_eval.py:112` 取 `object().database` 抛 `AttributeError`、被 `:127` 吞成一行 stderr note ⇒ 行根本没写而测试全绿；② §5.2 的 R26 行与 plan Task 0 实测的 R26 条仍以"静默假绿"作结，那只是**未加映射时**的反事实链，已各加尾巴；③ §6.2 补登 CLI 侧的既有行为变化（同一输入 `skipped`+3 → `error`+2）；④ `:207-210` 那段注释里 **"without touching persistence"** 这半句在乙之后同样失效，要整段重写而非只删 dashscope 那半句；⑤ CLI 边界的捕获要**按消息收窄**到那条 not-found 等值句，宽捕 `ValueError` 会连带打掉 `:86 test_config_value_error_maps_to_skipped`（R25 已判定它**不是**受害者） | D9 / §4-9 / §5.2 / §6.1 / §6.2 |

本轮（R1–R28 那几轮修订）只改文档、不读改真实配置；**其后已按本文件实施**。**提交状态（2026-09-26，四笔均未推送）**：本文件与 plan 的文档本体含 Task 0 回填＝`23ca85be`；R27／R28 这批细化＝`54815ad6`；Task 1（字段／validator／resolver／golden）＝`bfed5529`；Task 2（抽取／裁判接线与隔离守卫）＝`fcb58d0c`。实施进度以 plan 的复选框为准。

**Plan:** [2026-09-23-default-model.md](../plans/2026-09-23-default-model.md)。保留文件名与 D 编号以便已有引用定位；旧决策被替代的部分在本文件明确登记，不代表旧全局方案已交付。

**相关记录**：

- [RAG 功能模型配置](2026-09-10-rag-functional-model-config-design.md)：沿用功能模型表单、RAG 整对象保存与来源继承。
- [模型提供商分组](2026-09-22-provider-grouping-design.md)：现有模型页布局作为基线；本次控件在功能视图内部，不再修改整个模型节的标题控件。
- [模型条目字段对齐](2026-09-21-model-entry-field-parity-design.md)：只消费既有模型条目，不修改其写入契约。
- [检索端点解锁](2026-09-25-rag-endpoint-unlock-design.md)：**已先行落地**（HEAD `090bbcbc`），改的正是本期 Task 4 要动的 `functional-models-view.tsx` 与 Task 3／9 要动的 `config-form.ts`、三份 locale 与两份前端测试，开工前必须按新 HEAD 重读。它的“require an address”针对**嵌入／重排两条检索腿**（`embedder_factory.py` / `reranker_factory.py`，地址由 provider 能力块的 `has_fixed_endpoint` / `default_endpoint` 决定），**与 D10.1 的模型条目地址规则是两件事**——`routers/models.py:187` 的条目 `endpoint` 仍可选，别把那半边的结论搬过来。

## 1. 目标与隔离边界

先交付一个 **RAG 专属默认模型**：图谱抽取、评测裁判、文档图片配文及视频配文未单独指定模型时，使用同一个 RAG 默认条目。

上游已新增共享模型管理，其目录存储和保存接口与本分支不同；本期不统一两套模型管理、不迁移目录，等真正拆分时再对齐。RAG 继续消费当前宿主已经加载的模型列表，不自己存地址、钥匙或完整模型条目。

| 本期做 | 本期不做 |
| --- | --- |
| `rag.default_model` 与 RAG 内部解析 | 全站默认字段、公共工厂默认行为 |
| 功能模型视图内的选择器与既有保存按钮 | 整个模型节标题右侧的常驻控件 |
| 抽取、裁判、图片／视频配文接线 | 普通聊天、知识库聊天主模型、sidecar、agent 引导 |
| RAG 目标检查、配文失败标记、**三项退役**（VLM legacy 字段、judge `dashscope:` 直连、`video.caption_model`） | IM、定时任务、记忆、摘要、goal 与能力判断改造 |
| RAG 正向验收及其他系统不受影响的守卫 | 模型管理存储、条目编辑器、写入校验、偏好同步 |

**本期背三个退役，不是一个（R18）**：除了原有的 VLM legacy 字段与 judge 直连，用户裁定**同时退役 `video.caption_model`**——视频配文永远跟随 `rag.vlm_model`（从而也跟随 RAG 默认）。理由是图片与视频配文本就该用同一个模型，而这个字段**界面上零控件**（`functional-models-view.tsx` 里 `caption_model` 出现 0 次，视频那块只渲染 `asr_provider` / `asr_model`），只有手写 `config.yaml` 或直接 PUT API 的运维可能设过它。它顺带**净减少**本期复杂度：R4 的空白归一 validator 从"五字段跨两个类共享"退回"四字段单类"，D3 的视频行少一级，D5 里那句无处可挂的视频继承说明直接消失。代价与删除面见 D10.3 / §5.2 / §6.2。

**“功能模型”在本功能中的范围不是页面全部字段**：嵌入、稀疏向量、重排、解析和 ASR 各有自己的提供商／模型设置，不使用这个默认值；未通过上述角色选模的其他调用，也不批量接入。

**但“抽取角色”有两个消费者，不是一个（R12）**：`get_extract_llm()` 除了入库期的图谱抽取（`extract_graph(llm=None)` → `graph/indexer.py:82/147`；worker 构造时 `llm` 默认 `None`，所以生产路径确实落到这里），还有**检索期**的 `tools/builtins/graph_search_tool.py:199` 的 `llm = llm or get_extract_llm()`——聊天工具 `graph_search` 用它抽查询实体。该文件在 `tools/builtins/` 而不是 `knowledge/` 下，且**本期不需要改它一行**（R7 的新形参是可选的），但它会跟着抽取角色一起换模型、一起受 Task 9 的严格检查。所以它属本期**生效面**，不属上一段那句“其他调用”；隔离守卫按 D6 的新行处理，不能写成“聊天不受影响”。

**知识库聊天主模型不跟随 RAG 默认**：它仍由聊天选择、rag agent 配置及宿主原有兜底决定；一次评测中的答题 agent 也不因此换模型，只有裁判受本功能影响。这句说的是**主模型**——聊天工具 `graph_search` 内部那个抽查询实体的小模型走 `get_extract_llm()`，按上一条随抽取角色变化（R12）。

**“不改公共模型系统”不是零依赖**：RAG 仍读取宿主模型列表、来源判定与已有配置快照，抽取／裁判仍调用 `create_chat_model()`；隔离的是默认选择与校验的归属，不是复制 SDK 或再造模型目录。

## 2. 决定

### D1 —— 仅管 RAG 角色默认（替代原“全版”）

采用两套有明确边界的规则：RAG 的上述角色使用 RAG 默认；其他入口保留原有行为。本期不再把“两套默认”当成必须全站收口的理由，文案必须带上 RAG 范围。

角色覆盖优先，默认不是强制替换：已有 `extract_model` / `judge_model` / `vlm_model` 的有效显式选择继续生效（`video.caption_model` 按 R18 退役，视频配文不再有自己的一层覆盖）。空值是合并配置后的空值，不是仅看 UI 文件中有没有字段。

### D2 —— 存储与保存（替代模型管理 API 扩展）

- 在 `RagConfig` 与 `RagConfigFile` 声明 `default_model: str | None = None`；有效运行字段为 `AppConfig.rag.default_model`，JSON 载荷顶层为 `default_model`。
- **字段名定为 `default_model`，不是原方案的 `default_model_name`**：RAG 的每个兄弟角色字段都是 `*_model`（`extract_model` / `judge_model` / `vlm_model` / `video.caption_model`），而 `default_model_name` 在 harness 里已经是"`models[0]`"的私有叫法（`lead_agent/agent.py` 的 `_resolve_model_name`、`subagents/config.py::_default_model_name`、`summarization_middleware.py::_default_model_name`、`models/factory.py::create_chat_model` 的 `name is None` 分支）。这个名字会落盘、进 API、进 i18n，改起来贵，所以在本期开工前定死；实现时不得"顺手"改回带 `_name` 的写法。
- 复用 admin-gated `GET/PUT /api/rag/config`；字段值位于响应 `config.default_model`，来源位于 `sources.default_model`。不扩 `/api/models`、`/api/models/config` 或上游 managed-models API。
- 加载链是 **`rag_config.json → RagConfigFile → merge_rag_config → AppConfig.rag → RAG resolver`**；缺 UI 覆盖时继承 YAML 的同名 `rag` 字段，仍未声明则为 `None`。不新增 `AppConfig` 顶层默认字段，不改变模型列表合并规则。
- **沿用 RAG 整对象替换**：提交非空名称写入 UI 覆盖；省略、`null`、空串或纯空白均撤销该字段的 UI 覆盖，然后按 YAML 继承。这里不保留原模型管理方案的“缺字段＝不变”。若 YAML 自己指定了 RAG 默认，清空 UI 后会重新显示那个值，不等于强行覆盖 YAML 为 `None`。
- **空白归一必须有明确载体，不能只写在 resolver 里**：现有 `_prune_empty()`（`app/gateway/routers/rag_config.py:157-167`）只丢 `None` 和 `""`，所以 `" "` 会**被写进文件**、`sources` 报 `ui`、GET 原样回显、选择器显示一个未知值——只在 resolver 里 strip 无法让"纯空白撤销 UI 覆盖"成立。载体定为 `RagConfigFile` 上的字段 validator（空白→`None`，在 `_prune_empty` 之前生效），**一处实现覆盖四个模型引用字段**：`default_model` / `extract_model` / `judge_model` / `vlm_model`。**R18 之后这四个字段全在 `RagConfigFile` 一个类里**（`video.caption_model` 已退役），所以原方案"跨 `RagVideoFileConfig` 共享同一个 validator 或注解类型、不写第二份"的复杂度**消失**，不需要跨类接缝。顺带修掉既有脚枪：今天手写 `extract_model: " "` 会一路炸成 `Model   not found in config`，而 `eval/ondemand.py` 的注释早已按"空白即未配置"理解；另有一条同口径的既有先例可引——`_embedding_signature()`（`rag_config.py:330-338`）已经用 `.strip() or None` 把空白当未设。这项对三个既有角色的行为变化登记在 §6.2，不静默。
- 表单保存其他字段时，`buildRagConfigInput()` 必须带回现有 UI 所有的默认字段；未改的 YAML 来源字段不被复制成 UI 覆盖。整个对象空白不是“无变化”的同义词，仍用既有 `hasFormChanges()` 判断能否保存。**这条不需要新机制（R19）**：`buildRagConfigInput()` 的文本字段循环（`config-form.ts:200-213`，判定在 `:210-212`）今天就是 `if (next !== "" || owned(view, key)) input[key] = next` ——空串只在 `sources[key] === "ui"` 时写出（＝显式清除该覆盖），否则整个键省略。`default_model` 进 `TEXT_FIELDS`（`:99-112`）就自动获得"省略／空串撤销 UI 覆盖"，不要另写一套。
- 使用现有 RAG 的掩码保留、原子写入、锁与热加载链；只新增这一字段，不顺带改造 RAG 或公共模型目录的并发协议。
- 改默认名称不改变 embedding 签名，不新增模型能力探测、SDK 构造或网络请求；已有嵌入保存探针按原条件独立工作。

### D3 —— RAG 内部优先级

以下名称均为宿主模型条目的 `name`，不是厂商的原始模型 id：

| 角色 | 从左到右取第一个非空声明 |
| --- | --- |
| 图谱抽取 | `rag.extract_model → rag.default_model → config.models[0].name` |
| 评测裁判 | 显式调用／CLI 裁判名 → `rag.judge_model → rag.default_model → config.models[0].name` |
| 文档图片配文 | 显式配文参数 → `rag.vlm_model → rag.default_model → config.models[0].name` |
| 视频配文 | 显式配文参数 → `rag.vlm_model → rag.default_model → config.models[0].name`（**R18 后与图片配文同一条链**：`video.caption_model` 退役，视频不再有自己的一层） |

- `config.models` 是宿主已经合并出的有效列表；RAG 不重排、不根据收藏置顶、不另造启用状态。未来宿主过滤禁用项后，消费其有效列表即可，不在本期实现上游禁用功能。
- 非空的显式角色名不存在时按错误处理，不继续试下一级；只有 **RAG 默认字段本身失效**才回落第一项并 warning 点名，无模型时 RAG 入口报配置错误，不把 `None` 再交给工厂制造意外回落。
- **兜底出来的第一项不接受 D10 的严格缺项检查**：用户没有为 RAG 选过它，拿它当拒绝理由会让"别人改模型列表"变成"RAG 保存不了 / 入库失败"。派生目标缺地址／钥匙时保留今天各腿的行为（配文降级为占位符、抽取／裁判按既有语义），只 warning 点名条目；严格检查只作用于用户**显式声明**的目标，见 D10.1。
- 默认未设且角色也未设时，抽取／裁判仍取第一项；VLM 原 legacy 路径按 D7/D10 改变，不能宣称全部 RAG 行为逐字节不变。
- RAG resolver 接收有效配置快照；保存校验使用 `config.yaml` 的 RAG 原值与本次 payload 合成的 `pending`，不读取仍带旧 UI 覆盖的 `config.rag` 作为待写结果。
- 每次新建 RAG 角色目标读取当前配置，不引入跨任务模型缓存；已经开始的调用不被换目标，不自动重跑历史文档或评测。

### D4 —— 功能模型视图内部顶部（替代模型节标题右侧）

```text
模型
[对话模型 | 功能模型]

RAG 默认模型  ⓘ  [模型条目 ▾]

既有功能模型设置
...
[保存]
```

- 控件归 `functional-models-view.tsx`，复用该视图已有标签／值布局、选择器与提示组件；仅功能视图展示，不在对话模型视图或设置总标题中出现。
- **候选来源钉死为抽取／裁判那一套**：`useModels()` 的 `models` + `modelReferenceOptions()`（`functional-models-view.tsx` 的抽取行与裁判行就是这么取的），**不是**配文行的 `managedModels` + `visionReferenceOptions()`。理由：默认值喂的是四个角色，其中抽取／裁判不过滤视觉，候选集必须与它们一致，否则会出现"能当默认却选不到某个角色"的错配。含宿主提供的只读（config.yaml）条目，不新增目录接口、钥匙状态、编辑入口或视觉守卫。
- 已接受的后果：从这份宽列表选出的默认可能不出现在配文行按视觉过滤后的候选里。配文行此时仍显示"（使用配置默认）"，不显示一个过滤掉的值，也不因此拦保存（D7 已裁无视觉守卫）。已有 VLM 显式角色选择器的过滤规则不变。
- 改选仅改变 RAG 表单草稿，点击原有保存按钮才提交完整 RAG 载荷；无额外即时保存 mutation，无 `models` 数组，无 `useSaveModelsConfig()`。
- 保持加载、无权限、无模型、未知已存名称、无变化、保存中及保存失败的现有表单处理；保存失败不假装已生效。不能为了显示默认字段扩大模型读取权限。
- **"无模型"与"未知已存名称"这两条不需要新代码，实测已兜住（R24）**：`modelReferenceOptions()`（`config-form.ts:483-500`）**第一项永远是** `{ value: MODEL_REFERENCE_NONE, label: noneLabel }`（`:489`），模型条目只是往后追加 ⇒ 一个条目都没配时，抽取／裁判行（以及新的默认行）拿到的是**只有一项「（使用配置默认）」的下拉**，不是坏掉的控件；这就是这两行今天的"现有处理"，视图里**没有**、也不需要单独的无模型空态（配文行那句 `vlmNoVisionModel`（`functional-models-view.tsx:993-997`，条件是 `!hasVisionModel`，而 `isCaptionCapable` 就是 `Boolean(model.supports_vision)`，`config-form.ts:538-540`）是**视觉能力**的提示，与"零模型"是两件事，不要拿它当默认行的参照）。另外 `:496-498` 会把**指不到任何条目的已存值追加成它自己的一项**（注释原文 "so opening the form cannot silently clear it"），所以 D4 要求的"未知已存名称…不隐瞒未知值"新默认行**免费继承**。
- **保存失败不在视图里**：`useSaveRagConfig` 的 `onError` 走 `toast.error(error.message)`（`core/rag/hooks.ts:52-53`），视图内只有保存中（`:1209/1211`）、保存告警（`:1191-1195`）、无变化提示（`:1203-1205`）与阻断原因（`:1200-1202`）。所以"失败保留草稿"的断言要落在 hook／toast 与草稿状态上，不要去找一个不存在的行内错误元素。

### D5 —— 文案改为 RAG 范围

以下替代旧 D5 的全站说明；中英文同批更新，不改聊天选择器或模型管理页的用词。

| 位置 | 原文 | 改成（zh） | en |
| --- | --- | --- | --- |
| 默认行标签 | 默认模型 | RAG 默认模型 | RAG default model |
| 默认行空选项 | （使用配置默认） | （使用配置默认） | (config default) |
| 默认行说明 | 未指定模型的地方都用它，含新会话、引导、IM、定时任务等 | 用于图谱抽取、评测裁判、图片与视频配文未单独指定模型时的选择，不影响聊天主模型及其他功能；此项留空时使用配置中的 RAG 默认，配置也未指定则使用模型列表第一项。 | Used when graph extraction, evaluation judging, image captioning or video captioning has no separate model selection. It does not affect chat models or other features. Leave this unset to inherit the configured RAG default, or the first model in the list if none is configured. |

角色行已有“（使用配置默认）”可保留，但就近说明须对齐 D3：清空先撤掉该角色的 UI 覆盖；合并后的角色仍空才进入 RAG 默认。**原"视频说明须保留先继承图片 VLM 的一层"这句按 R18 删除**——`video.caption_model` 退役后没有视频层可描述；而且实测这句本来就**无处可挂**：`caption_model` 在 `functional-models-view.tsx` 里出现 0 次（视频那块只渲染 `video.asr_provider` `:1008` 与 `video.asr_model` `:1028`），三份 locale 里也没有它自己的键——标签叫 `captionModel` / `captionModelHint` 的那一行（`:970`）绑的是 **`values.vlm_model`**（`:974`），是**图片**配文行。图片配文行的 hint 只需说明它自己那一层（留空 → RAG 默认 → 首项）。只改相关角色说明的既有 i18n key，不扫全站同一句文案；历史已交付文档不原地改写。

### D6 —— 生效面与隔离面

| 面 | 本期行为 | 代码归属 |
| --- | --- | --- |
| 抽取、裁判 | 按 D3 解析后把明确名称交给既有工厂 | RAG extractor / eval factory |
| **检索期 `graph_search` 的查询实体抽取（R12）** | 与入库期图谱抽取共用 `get_extract_llm()`，按 D3 一起解析、一起受严格检查 | `tools/builtins/graph_search_tool.py:199`——**本期不改该文件**（形参可选），行为随抽取角色变化 |
| 文档图片、视频配文 | 按 D3 解析条目，再由既有 HTTP 客户端调用 | RAG VLM target / captioner |
| RAG 保存 | 检查本次待写结果的有效角色目标 | RAG router 与 RAG helper |
| 普通聊天、知识库聊天**主模型**、sidecar、引导、IM、定时任务 | 模型选择不变（`graph_search` 的内部小模型不在此列，见上） | 只做隔离验收，不接线 |
| 记忆、摘要、goal、能力判断、其他未列 RAG 调用 | 保留各自行为 | 不改造。**"其他未列 RAG 调用"点名两个（R20）**：`knowledge/wiki/generator.py:210-212` 的 `_default_llm()` 与 `knowledge/eval/synthesis.py:141-143` 的 `_default_llm_factory()`，都是 `create_chat_model()` **不带 name** ⇒ 落到 `models[0]`，注释自称 "uses the main model (first configured)"。两者本期都**不接** RAG 默认（评测出题与 wiki 写作都不是那四个角色），但 Task 2 的隔离守卫要点名它们，否则"不批量接入"只是一句无法验证的声明 |
| embedding / sparse / rerank / parse / ASR | 保留各自配置 | 不接入 RAG 默认 |

### D7 —— VLM 空值纳入 RAG 默认

保留不设视觉守卫的选择，但落点改为 D3 的 RAG 默认，不是全站默认。默认条目的视觉声明不代表实际能力，不能用“不声明视觉”推断调用必失败；完整目标的 HTTP 失败／空回答按 D8 计失败。

`rag.vlm_model` 字段保留，删除其厂商模型字面量默认；显式未知名／裸 id 的 legacy 回落在 D10 退役。传输层仍由 `caption_client.py` 提供既有 OpenAI／Anthropic 形状，不改走公共模型工厂，不改请求构造。

### D8 —— 文档配文状态与恢复

- **`caption_images()` 的返回形状定形（R13）**：从今天的 `dict[str, str]` 改为与视频 `CaptionOutcome`（`video/captioner.py:47-53`：`captions` / `failed` / `degraded`）同族的 dataclass——`captions: dict[str, str]`（键仍是 `image.ref`，保住“按输入顺序返回以对齐 Markdown 图片位置”的既有语义）、`failed: int`、`degraded: bool`。`degraded` **在 captioner 内用那一份共享常量算**（与视频腿同一做法），worker 只读 `outcome.degraded`、不再自己比阈值——这是 R5“份数不得增加”在图片腿的落法。worker 侧 `captions = await caption_images(parsed.images)`（`worker.py:443`）改成取 `outcome.captions` 再交给 `apply_captions()`。有图时写 `path_status.caption`：`degraded` 为真写 `degraded`，否则 `done`；无图不写该键。
- **这是破坏性签名变更，既有受害者必须在同一 Task 改完（R13）**：生产调用点 `worker.py:443`；把返回值当映射用的既有夹具 `test_worker.py:156/183/206`（三处 `AsyncMock(return_value={"images/p1.jpg": "图注"})`）、`test_parser.py:215/241/251/328/349`、`test_vlm_target.py:148/207/283/301/324`。旧行号仅供定位：实施前按符号重扫 `caption_images` 的**全部**调用点，不以这份清单为上限，也不靠“先删字段再找受害者”的顺序做事。
- **30% 阈值不许出现第三份字面量**：这条规则今天已经有两处——`graph/indexer.py:31` 的 `DEGRADED_FAILURE_THRESHOLD = 0.3` 与 `video/captioner.py:44` 的 `_DEGRADE_THRESHOLD = 0.30`（后者注释自称"对齐 graph 30% 规则"）。图片腿**复用 `DEGRADED_FAILURE_THRESHOLD`**；若实现时判断跨包导入不合适，允许在同一 Task 把这一个常量提到中性位置并同步改两个既有消费者，但**常量份数不得增加**，也不得在新腿里写 `0.3`。
- 降级时追加 `image caption degraded: M/N images failed`，不覆盖其他 error 标记。它写进 `documents.error`，**这一列文档列表本来就渲染**——同族的 `graph degraded: …`（`graph/indexer.py:9-10` 自述"visible on the document list"）与 `entity-resolution failed`（`worker.py:381`）都是用户可见的英文标记，所以新标记同样可见，属既有约定而非新增界面文案：不新增 UI copy、不新增 i18n key、不做病因分类。
- 真实顺序为 **配文 → 向量 → 图谱**，后执行的 graph 标记必须追加而不是覆盖，最终同时保留 caption 与 graph 的结果。**追加要换生产者，不是改措辞**：追加语义在 `worker.py:404-413` 的 `_append_error_marker()`（读-改-写、`; ` 拼接、幂等），而 `index_document_graph()` 今天是自己 `update_document_status(error=…)` 直接覆盖（`graph/indexer.py:209`），indexer 手里没有追加路径。定为：graph 标记的写入**移到 worker**（它在 `worker.py:362` 已经拿到 `stats.degraded`，`stats.failed_chunk_ids` / `stats.total` 也在同一对象上），`index_document_graph()` 不再写 `error`；钉住旧生产者的既有用例随写入点一起迁，不留在 indexer 侧。
- 文本 uploaded / parsing / chunking 恢复会重解析：开始前清理上一轮 caption 状态与旧配文错误；本轮成功／无图不得残留旧降级。indexing 仅恢复索引时不重跑配文，保留未重跑腿的结果。
- **两处残留都已定位，清理要真删语义（R21）**：① `_reparse_and_chunk()`（`worker.py:433-443`，docstring 自己写着 "Parse → caption → chunk"）在 `:437` 写的是 `path_status={"vector": "pending", "graph": "pending"}`——**不含 `caption`**，而 `update_document_status()` 是逐键合并（`store.py:168-186`），所以上一轮的 `caption` 子状态会原样留下；② `_wipe_doc_chunks()`（`:414-431`）只删 chunks／向量／实体，**完全不碰 `documents.error`**，所以旧的 `image caption degraded: …` 标记也会留下。两处都要显式清理，不能靠"传 `None`"（`None` 的语义是不改）。
- **`_append_error_marker()` 的幂等是子串比较，而新标记含计数（R21）**：判据是 `marker in (document.get("error") or "")`（`worker.py:404-413`），而 D8 定的文案是 `image caption degraded: M/N images failed`——`M/N` 一变，子串就不匹配，于是**叠加第二条**。Task 6 必须明确选一种：接受叠加（同一文档可能积累多条不同计数的标记），或把幂等判据改成按标记前缀（`image caption degraded:`）匹配后替换。不得留成"没想过"。
- **硬失败落盘是覆盖写，会抹掉先前的降级标记（R21）**：`worker.py:400-401` 的 `except Exception` 分支用 `error=str(exc)[:500]` **直接覆盖**，同时把未达终态的腿标 `failed`。所以 caption／graph 的降级标记只在成功／降级路径上存活，硬失败时会被异常文本替换。这是既有行为，D8 不改变它，也不把它当新 bug 修；登记在此以免 Task 6 误判。
- `update_document_status()` 是逐键合并、`None` 表示不改，不能把传 `None` 当成清理。重解析重置须有真实删除语义并经实际 store 读取验证，不扩大到视频其他恢复逻辑。
- UI 复用既有“配文／已完成／部分降级”，hover 不新增失败原因，不做病因分类；D8 本身不增加前端或 i18n 改动。**前端的组装规则已经按"出现才显示"写**：`path-status.ts::pathStatusLines()` 对 `asr/segment/caption` 三腿做的是 `status[leg] !== undefined` 过滤（`:36-38`），所以文本文档新增 `caption` 键会**自动**多出一行「配文」并复用视频那套标签与状态词，生产代码不需要改。但有两处前端**文本**会因此过期，Task 6 同批改准：`:33-35` 的注释 “text documents write vector/graph/wiki alone” 与 `document-panel.dom.test.tsx:1051` 那条用例名/前提「文本文档仍只返回 vector/graph/wiki」——它们描述的是改前的事实（该用例只构造 vector/graph/wiki 的 fixture，不会红，但会变成一句假话），应改成"带哪个键就显示哪一腿"并补一条"文本文档带 caption 键"的正向用例。

### D9 —— judge 的 `dashscope:` 直连退役

保留这项 RAG 内部清理：删除 `knowledge/eval/factory.py` 的直连分支、`DASHSCOPE_COMPATIBLE_BASE_URL`、`JudgeKeyMissingError`，以及 `scripts/run_ragas_eval.py` 的对应说明／help／专用捕获。

- 显式 `dashscope:<模型>` 作为完整条目名查找；不存在同名条目时仍抛普通 `ValueError`，消息为 `Model <名称> not found in config`，CLI 非零退出，不作为缺钥匙跳过；RAG 层不得把这个显式错误吞成默认回落。
- **CLI 错名以 `EXIT_ERROR`(2) 收尾，不抛 traceback（乙，2026-09-26 裁；R27）**：删掉 `JudgeKeyMissingError` 那个捕获（`run_ragas_eval.py:213-216`）后，`:212` 抛的 `ValueError` 一路无人接（`:187` 的 `except ValueError` 只包 `get_app_config()`）⇒ 默认落成 traceback + 退 **1**；而 `nightly.yaml` 只认 3 与 2（`:306` / `:310`），退 1 会走到 `:314 exit 0` ⇒ **静默假绿**。所以本项**同批**在 CLI 加一条映射：捕获错名错误 → stderr 打印可读原因（就是 not-found 那句）+ 按 `:196-199` 的同一形状落一行 `status="error"` 记录 + 返回 `EXIT_ERROR`(2)，命中 `:310-313` 的 `::error::` ⇒ 上游 nightly 变红而不是假绿。这不是新造语义：同文件的 `GoldenDatasetError`（`:194-199`）就是"坏输入 → 可读原因 + 记一行 + 退 2"，而 `:81-82` 的 docstring 已把"记一行"写成不变量（**"Every CLI run writes exactly one row"**）⇒ 漏写不是风格取舍，是违背它自己的契约。**层次要分清**：库层 `build_judge_llm()` 仍精确抛普通 `ValueError`，映射只发生在 CLI 边界；not-found 那句仍按下面那条等值钉子与工厂保持一致。
  - **捕获范围要按消息收窄，别宽捕（R28⑤）**：CLI 边界捕 `ValueError`，但**只**在消息等于那条等值钉子产出的 not-found 句时映射成退 2，其余 `ValueError` 照旧抛穿。宽捕有两笔代价：其一是工厂里的真 bug 被洗成一次"干净退 2"，看日志像用户输错了名字；其二是**一旦把 `try` 扩到 `_build_judge_llm()` 之外**就会打掉 `:187` 那条路——具名受害者 `test_ragas_eval_cli.py:86 test_config_value_error_maps_to_skipped`（`get_app_config()` 抛错 → 退 3），R25 已判定它**不是**本 Task 的受害者。（窄捕本身不动 `:86`：两个 `try` 互不相干。）
  - **那行 `status="error"` 必须有专属断言与专属 neuter（R28①）**：plan Task 7 的 RED 原本只有三段断言（库层抛错／`main()` 返 2／子进程退 2），都不涉及它，而按现有夹具风格写它**天然空洞绿**——`_persist_eval_run` 自带 `own_engine` 分支（`:110-112`），当 `get_app_config` 被 monkeypatch 成 `object()` 时（`test_ragas_eval_cli.py:157`）它会在 `:112` 取 `object().database` 抛 `AttributeError`、被 `:127` 的宽捕获吞成一行 stderr note ⇒ **一行没写、测试照绿**。所以要对 `cli._persist_eval_run`（或 `eval_persistence.save_eval_run`）装 spy，断言恰好调用一次且 `status="error"`；neuter 则只删映射里的 persist 那一行，令该断言转红。
  - **写库与引擎初始化的先后不成问题，但注释要改（R28④）**：映射点（`:211-216`）在 `init_engine_from_config`（`:218`）**之前**，写库仍然可行，因为 `_persist_eval_run` 按需自建引擎并在 `finally` 关闭（`:110-112`／`:124-126`）。代价是 `:209-210` 那句 "Built BEFORE the engine so a missing judge key fails fast without touching persistence" 的**后半句失效**——所以那段注释要整段重写，不是只删掉 "supports a direct DashScope model" 那半句。
- **这句文案本期起有两个生产者，必须钉住等值**：原句出自 `models/factory.py:302`，而 D10.1 的保存边界要在**不调用工厂**的前提下产出逐字相同的一句（工厂本期冻结，不能把常量提出来共享）。因此 RAG 侧只允许一处常量／helper 产出该句，并加一条等值钉子：真实触发工厂的 not-found 错误，断言其 `str(exc)` 与 RAG 侧 helper 的输出完全相同。任一侧改词都要红，不许靠"看起来一样"过关。
- 裁判参数为空时按 D3 先取角色配置，再取 RAG 默认；CLI 的答题模型参数与按需评测的答题 agent 不改变。
- 不改公共 `models/factory.py` 或 ragas 的传输实现；可选 ragas 依赖的合法跳过语义保留。
- 历史设计文档留档；`nightly.yaml` 的上游专用 job 本期不改，其旧参数适配等真正拆分时处理，不以本仓不执行为由声称上游已兼容。
- **`backend/AGENTS.md:1211` 随本项同批改（R20）**：那一整段 Layer 2 说明里逐字写着 `--judge-model dashscope:<model>` talks to the DashScope OpenAI-compatible endpoint using `DASHSCOPE_JUDGE_API_KEY` (falling back to `DASHSCOPE_API_KEY`)，正是本项删掉的分支。**同一句还有第二处过期**：它说按需评测 "passes `None` when it is unset, which falls back to the config primary model"，而本期之后是"RAG 默认 → 首项"（D3）——**这半句已提前改掉**（它从 Task 2 起就是假话，2026-09-27 随 Task 3 的收尾批落地，不是本项做的），所以本项只剩 `dashscope:` 那半句。这属 Task 7 的交接面、不属 B-2（B-2 只接环境变量名单）。附带登记：`nightly.yaml:266/280/290` 传的 `DASHSCOPE_JUDGE_API_KEY` 在本项之后成为死配置，但因 nightly 本期不改而保留，归 §6.1。**nightly 的问题不止死配置**：`:303` 还实际传着 `--judge-model dashscope:qwen3.8-max` 这个被退役的前缀本身，失效链与处置见 §5.2 的 R26 行。

### D10 —— VLM 退役与 RAG 目标检查（从原跨全站校验中拆出）

#### D10.1 仅在 RAG 入口检查

RAG 层新增轻量 `knowledge/model_target.py`，承载角色默认解析与纯缺项判定；这是 RAG 保存、抽取、裁判和配文的共用接缝，不迁入 `config/models_config.py`，不接到公共工厂。

- **严格检查只作用于用户显式声明的目标**：`rag.default_model` 与三个角色字段（`extract_model` / `judge_model` / `vlm_model`，**R18 后不含已退役的 `video.caption_model`**）合并后非空的那些。**由 `config.models[0]` 兜底出来的目标不检查**（D3 末条）：那是系统替用户挑的，拿它当拒绝理由会让一次无关的模型列表编辑变成"RAG 保存 400 / 入库失败"，而聊天照旧能跑。
- 复用当前 `AppConfig.is_ui_managed_model()` 与 `reverse_lookup_provider()` 的只读结果；严格规则仍仅限 **UI 来源且 provider 属协议格（OpenAI 兼容／Anthropic）**，含 OpenAI Chat／Responses 条目，不扩大到非 UI 与厂商格。
- **地址不再是"必须声明"**：`endpoint` 在模型管理 API 里本就可选（`app/gateway/routers/models.py:187`，PUT 只校验重名／空名／空 model id／未知 provider，见 `:648-657`），所以"只带钥匙、不带 `base_url` 的 anthropic 条目"是**合法且能聊天**的常态（SDK 自带官方地址）。因此对 `anthropic` / `deepseek` 两格，缺地址**不算缺项**，而是按 D10.2 惰性取该 SDK 自己的默认值；`openai-compatible` 是唯一例外（它的 SDK 没有可读默认常量，空白只能落到 OpenAI 公有云），仍算缺项——三格的具体处置与实测依据见 D10.2 的表。将来加入一家"SDK 无默认地址"的 provider，它同样进入地址必填。
- **钥匙仍然严格**：范围内条目必须有已解析的非空钥匙（空白算缺项），不做真实鉴权、不出网探测。理由与地址不同：配文腿是手写 HTTP，无法安全地猜"哪个环境变量属于哪个条目"，所以不能像 SDK 那样隐式兜底。已登记的代价：一个只靠 `OPENAI_API_KEY` 之类环境变量、条目内不写钥匙的 UI 条目，**聊天可用而被声明为 RAG 角色时会被拒**；这条差异只针对钥匙，不再针对地址。
- RAG 保存检查 pending 的默认声明与三个角色**已声明**的目标；相同条目只需重复使用纯判定结果。角色为空、由默认或首项兜出来的目标按上面两条处理（默认字段被显式声明 ⇒ 检查它；首项兜底 ⇒ 不检查）。**R18 之后视频不再是独立的一层**：视频配文与图片配文共用 `vlm_model`，所以检查 `vlm_model` 就同时覆盖了视频腿，不需要"视频有显式覆盖时也要检查"这条（原第五个目标已随字段退役消失）。
- 抽取／裁判在自己的构建入口检查后，把明确名称和同一配置快照交给未修改的 `create_chat_model()`；配文在 `resolve_vlm_target()` 检查后交给原 HTTP 客户端。配置检查放在逐图片／逐切片的可恢复异常捕获之外，不能降成占位符或普通逐项失败。
- **缺项错误统一为 RAG 层的 `RagConfigurationError(共享文案)`**，它仍是 `ValueError` 子类，点名条目与字段、不泄密、无额外补救说明；保存映射 400 与 `提交后的配置仍不可用：<原因>`。原 C 中“修改公共工厂使其抛普通 ValueError”的任务取消；条目不存在的 D9 普通 `ValueError` 与缺字段仍是两类错误，消息不得混用。
- **保存期显式角色错名／无可用模型也返回 400**，沿用上述前缀；错名原因为 `Model <名称> not found in config`，不回落、不写文件。保存边界用纯条目查找处理，不为检查调用工厂，也不能仅捕获 `RagConfigurationError` 而漏掉普通错名错误；不把整个 PUT 的任意 `ValueError` 泛化为角色配置错误。运行／CLI 的 D9 普通 `ValueError` 约定不变；默认字段失效按 D3 回落首项后，**不再对兜底出来的目标做缺项检查**（本节第一条），只有错名与无模型才 400。
- 无模型与 VLM 显式未知条目由 RAG 层报配置错误；不在全站配置加载阶段校验角色有效性，以免一个 RAG 设置阻断无关聊天启动。字段形状验证仍由配置模型负责。

#### D10.2 厂商与非 UI 的边界

厂商格（`deepseek`）不执行钥匙缺项检查；其鉴权、模型能力并不因此得到保证。非 UI SDK 条目的隐式取值行为不改。

**校验与解析是两件事，别混**：D10.1 的缺项判定是**校验**（决定保存／调用要不要拒绝）；下面这张表是配文腿拿到一个可用 URL 的**解析**——raw HTTP 必须有地址，所以无论该格受不受校验都要解析。厂商格因此不参与钥匙校验，但仍按表解析地址。

VLM 仍必须能得到 HTTP 目标：显式地址永远优先；缺地址时按 provider 分三种处置，判据是**这一格的语义里有没有"自己的那家厂商"**：

| provider | 缺地址时 | 依据（2026-09-26 本机实测，版本见下） |
| --- | --- | --- |
| `anthropic` | 惰性读 SDK 自己的默认地址 | `ChatAnthropic.model_fields["anthropic_api_url"].default_factory()` → `https://api.anthropic.com`，离线、不建客户端、不要钥匙，且本身就走 `ANTHROPIC_API_URL` 环境变量。**只能走 `default_factory()`（R23）**：同一个 field 的 `.default` 是 `PydanticUndefined`，读它会拿到哨兵而不是地址 |
| `deepseek` | 惰性读 SDK 自己的默认地址 | `langchain_deepseek.chat_models.DEFAULT_API_BASE` → `https://api.deepseek.com/v1`（模块级常量，直接读） |
| `openai-compatible` | **仍算缺项**（400 / 运行期配置错） | 该 SDK 没有可读的默认地址常量：`openai._constants` 的全部成员是 `DEFAULT_CONNECTION_LIMITS` / `DEFAULT_MAX_RETRIES` / `DEFAULT_TIMEOUT` / `INITIAL_RETRY_DELAY` / `MAX_RETRY_DELAY` / `OVERRIDE_CAST_TO_HEADER` / `RAW_RESPONSE_HEADER` / `httpx`，**没有 base URL**；`ChatOpenAI.model_fields["openai_api_base"].default` 与 `inspect.signature(OpenAI.__init__).parameters["base_url"].default` 都是 `None`；字面量 `https://api.openai.com/v1` 只在 `openai/_client.py` 内联出现两次，且只在构造出的 `root_client.base_url` 上可见 |

**这三条读法复核于实装版本 `langchain-anthropic 1.4.1` / `langchain-deepseek 1.0.1` / `langchain-openai 1.2.1` / `openai 2.32.0` / `anthropic 0.97.0`（R23）**。SDK 升级会让读法失效，所以钉子断言的是"RAG 侧取到的值 == 该 SDK 自己的值"，**不是**某个写死的 URL 字符串；`PROVIDER_ALLOWLIST` 当前恰为三家（端点键依次 `base_url` / `base_url` / `api_base`），与 `vlm_target.py` 的 `_ENDPOINT_KEYS = ("base_url", "api_base")` 对齐。

前两格的空白地址含义是明确的——"就打这家厂商自己的云"，与聊天腿今天的解析结果一致，所以 RAG 照抄这个结论而不是自造一个。第三格的语义是"某个 OpenAI 形状的端点，通常是你自己的"，空白只能落到 OpenAI 的公有云；**把用户的文档图片悄悄送去第三方公有云，比拒绝保存更糟**，所以这一格保留缺项判定，错误句点名缺地址，出路是填端点或改用厂商格。这也是本期唯一保留的地址必填，且按 D10.1 只对用户显式声明的目标生效。

实现约束：两个可读默认值**惰性 import、只在缺地址时读**，不把 URL 字面量抄进 RAG 代码、不为检查构造 SDK、不出网、不回写条目；各配一条钉子断言 RAG 侧取到的值与 SDK 自己的值相等（SDK 换默认地址时红），与 `knowledge/providers/__init__.py` 的 `default_endpoint` 用测试保持相等的既有做法同族。

原方案对公共工厂强制注入地址的改造移出；抽取／裁判的 SDK 取值规则不变。**由此本期反而收回了旧版的一条免责声明**：anthropic / deepseek 缺地址时，raw HTTP 的配文腿与 SDK 的聊天腿解析到同一个地址（都来自该 SDK 的默认值），不再"不承诺一致"；只有 `openai-compatible` 那一格是 RAG 更严（拒绝而非默认去公有云），这条差异明确登记，不写成全站一致。范围外 VLM 缺钥匙保留原降级语义，但不再从退役字段取钥匙。

#### D10.3 legacy 退役与变量名中性化

| 载体 | 删除 | 保留 |
| --- | --- | --- |
| `RagConfig` | `vlm_base_url`、`vlm_api_key`、`vlm_api_key_env` 三字段 | `vlm_model`，只去掉其厂商字面量默认 |
| `RagConfigFile`、示例 JSON、前端 wire／表单 | `vlm_base_url`、`vlm_api_key` 两字段 | `vlm_model`；这些载体从未声明 `vlm_api_key_env` |
| **`video.caption_model`（R18，第三个退役）** | `RagVideoConfig.caption_model`（`app_config.py:158`）、`RagVideoFileConfig.caption_model`（`rag_config_file.py:71`）、router 的 `_VIDEO_FIELDS` 项（`rag_config.py:65`）、前端 6 处（`types.ts:13`、`config-form.ts:55/127/170/248/516`）、`video/captioner.py:83` 的 `cfg.rag.video.caption_model or` 半段、三处 docstring（`video/captioner.py:5`/`:74`、`vlm_target.py:61`）、`config.example.yaml:2667` | `asr_provider` / `asr_model` 与全部运维闸门（`enabled` / `max_size_mb` / `card_text_mode` 等）；视频配文改由 `cfg.rag.vlm_model` 直接进 D3 的层级 |
| VLM 解析（`knowledge/vlm_target.py`） | **两个分支都要改，不只 legacy（R14）**：① 条目分支的 `base_url=endpoint or config.rag.vlm_base_url`（`:71`）改为按 D10.2 的表取该 provider 的 SDK 默认；② 条目分支的 `api_key=dumped.get("api_key") or config.rag.vlm_api_key or _environment_key(config)`（`:72`）只剩条目自己的 `api_key`；③ 整个 legacy 分支（`:77-83`）与 `_environment_key()`（`:52-54`）删除；④ 模块 docstring 里描述 legacy 回退的那段（`:10-12`） | 条目提供 wire model、地址（显式或按 D10.2 取 SDK 默认）、钥匙、协议 |

**删掉 `_environment_key()` 会同时抽走条目分支的环境变量兜底（R14）**，而这正是 D10.1“钥匙仍然严格”能成立的前提：只要那条兜底还在，“条目内不写钥匙、靠 `OPENAI_API_KEY` 之类环境变量”就能从后门绕过缺项判定，检查形同虚设。§6.2 登记的那条代价（同一个 UI 条目聊天可用、被声明为 RAG 角色时被拒）说的就是这件事。因此 ②③ 必须同批改，**不能只删 legacy 分支而把条目分支的 env 兜底留着**；改完要有一条钉子证明条目分支不再读环境变量（条目内无钥匙 ⇒ 判定为缺项，即使宿主环境里有同名变量）。

退役不因收窄范围撤销，依赖旧字段／裸 id 的配置仍需改用可提供目标的条目。自选环境变量名的能力保留在模型条目 `api_key: $任意名`，不再通过角色级 `vlm_api_key_env` 的厂商默认值提供；当前宿主模型加载器解析该引用，RAG 只消费解析结果，不更改加载器或模型文件写入流程。

`rag_config.json` 本身仍逐字取值、不增加 `$VAR` 展开。旧模型管理保存可能把引用展开落盘、变量缺失报错未定位到条目，这两项仍是已知外部问题，不能因“RAG 支持消费引用”而声称已修复。

#### D10.4 旧 RAG 文件读取归一

`RagConfigFile` 的 `extra="forbid"`（`rag_config_file.py:82`）会拒绝删字段后仍含旧键的文件，因此先在 `from_file()` 的验证前剥离退役键，再删除声明。**R18 之后要剥三个键，而它们不在同一层**：`vlm_base_url` / `vlm_api_key` 在**顶层**，`video.caption_model` 在**嵌套的 `video` 块里**。

- **嵌套剥离是新机制，不是复用现有循环（R18）**：今天的 `_RETIRED_KEYS` 循环是 `for key in _RETIRED_KEYS: if key in raw: raw.pop(key)`（`rag_config_file.py:169-171`），**只作用于顶层 `raw`，不进 `raw["video"]`**；而 `RagVideoFileConfig` 同样是 `extra="forbid"`（`:67`）。所以删掉 `caption_model` 之后，一个存量 `rag_config.json` 里若还有 `{"video": {"caption_model": "x"}}`，**加载会直接失败**，而不是被剥掉。Task 8 必须新增一份嵌套退役键（例如 `_RETIRED_VIDEO_KEYS = ("caption_model",)`）在 `raw["video"]` 上跑同一套"只剥不认、不回写、warning 只报字段名"，并配自己的 neuter。
- **YAML 侧不会硬断，只有 API 写出来的 JSON 需要归一（R18）**：`RagVideoConfig`（`app_config.py:143-160`）**没有 `model_config`**，即 Pydantic 默认 `extra="ignore"` ⇒ 运维 `config.yaml` 里留着 `rag.video.caption_model` 仍能加载，只是被静默忽略。`config.example.yaml:2667` 那行仍要删，留着是误导，但它不是加载故障源。
- 本次只新增上述退役键；保留已存在的 `parse_backend` 归一，其余未知键仍拒绝，JSON 语法／非对象错误不变。
- 只剥不认、不回写磁盘；warning 只报字段名，绝不包含地址或钥匙值，VLM 键不沿用 MinerU 专属“use parse_tier”原因。**注意"不含值"这条今天没有断言可继承（R22）**：`parse_backend` 的用例（`test_rag_provider_config.py:114-127`）只断 `"parse_backend" in caplog.text`，**没有任何用例断言值被排除**——实现（`rag_config_file.py:172-176`）确实只格式化键名与路径，但那是未被钉住的事实。Task 8 必须**新建**这条断言，plan 里"日志带值"那条 neuter 也依赖它才有牙。
- 下一次合法整对象 PUT 自然清掉磁盘旧键；退役字段回送 PUT 则 422，不增加服务端写入容忍。旧页面刷新后使用新表单。
- **Task 8 归一与 Task 9 删字段必须背靠背交付、同批发布**：Task 8 中间态仍可写字段但读时已忽略，不能单独部署；反序会让存量文件无法加载。
- GET 密钥不回显测试的载体调整归 Task 8；长期断言检查有效覆盖不含退役键、有效角色保留，不读取 Task 9 将删的属性。响应删键与 golden 归 Task 9。

#### D10.5 用户入口失败收尾

- 新文档入库的配文配置错落 `failed`，视频配文不能拿 `degraded` 冒充配置错误；完整目标的 HTTP 失败／空回答继续按 D8 和原视频规则计失败。
- 已有视频 `recaption_document()` 在重置镜头状态、物化或重嵌之前检查目标；配置错时旧 caption／chunks／向量不变，文档保留 `ready` / 100，本次 caption=`failed`，error 追加脱敏原因，不残留 `indexing`；ready 仅表示旧内容可用。**"本次 caption=`failed`" 是新增行为，不是搬位置（R22）**：今天 `worker.py:704-707` 的 `except Exception` 分支写 `ready` / 100 时**根本不传 `path_status`**，所以 `legs["caption"]` 停在 `"pending"` 且从不落盘；要落 `failed` 必须显式加这个参数。
- 完整按需评测的裁判配置构造错误不得被可选第二层的宽捕获吞成 `completed`；保存 `status="error"`、第一层已有指标／baseline_diff、空第二层与脱敏原因，不能改走会丢第一层结果的 `_save_error_row`。实测确认宽捕获在 `ondemand.py:369-370`，其后 `:372-382` 的 `save_eval_run(status="completed", layer1_metrics=…, layer2_metrics=layer2_metrics or None, baseline_diff=…)` **已经保留第一层与 baseline_diff**，所以要改的只是 `status` 与 error 原因，不必重排保存调用。
- 以上入口均释放 in-flight 注册，保留已有重试方式；不扩大可选依赖跳过或网络失败的硬失败范围，不新增表或状态枚举。**两处释放机制不同，别照抄（R22）**：`recaption_document()` **没有 `finally`**，它靠 `worker.py:251-252` 的 `self._inflight.add(task)` + `task.add_done_callback(self._inflight.discard)` 自动释放，所以不要给它加 `finally`；按需评测走 `ondemand.py:198-209` 的 `_release_run(kb_id)`（递减 `_IN_FLIGHT`、清 `_PROGRESS`），由两个 runner 各自的 `finally` 调用，`_IN_FLIGHT` 在 `:261` 自增——这一侧沿用 `finally` 是对的。

### D11 —— 模型条目管理移出本期

原 D11 的全部 UI 地址／钥匙写入校验、管理响应 `has_api_key`、多条旧配置修复草稿全部移出；原模型保存锁、`$VAR` 原始值回写与前端连续保存改造同样不做。这里只登记范围变化，不把这些需求判成已解决或永远不需要。

修复模型条目继续使用现有管理方式；RAG 不通过保存角色设置替用户补写地址、钥匙或模型参数。未来统一上游管理目录时重新评估，不在此处预造兼容层。

## 3. 接口与实施归属

| 接口／对象 | 本期契约 |
| --- | --- |
| `RagConfig.default_model` / `RagConfigFile.default_model` | 可空条目名；位于 RAG 配置，按 D2 合并。`RagConfigFile` 上的空白 validator 覆盖**四个**模型引用字段（`default_model` / `extract_model` / `judge_model` / `vlm_model`），**全在同一个类里**，一处实现（R18 后不再跨 `RagVideoFileConfig`） |
| RAG GET／PUT | 在 `config` 与 `sources` 内增加默认字段；沿用整对象保存与现有权限 |
| `resolve_rag_model_name(config, name=None, *, rag=None) -> str \| None` | 放 `knowledge/model_target.py`；调用方先按 D3 选角色声明，helper 再处理 RAG 默认／首项，`rag=` 接保存期 pending；显式名称不被替换 |
| RAG 缺项判定 | 同模块纯函数，由 RAG 保存／抽取／裁判／VLM 复用，只判用户显式声明的目标，不修改模型条目或公共工厂 |
| 条目 not-found 文案 | 原句出自 `models/factory.py:302`；RAG 侧一处常量／helper 产出逐字相同的一句，配等值钉子（D9）。工厂本期冻结，不提共享常量 |
| 抽取／裁判构建 | 先 RAG 解析／检查，再调用已有工厂；传递同一配置快照，避免检查一个目标却构造另一个。**`get_extract_llm()` 今天不接参数**（`graph/extractor.py:112-117`，内部自己 `get_app_config()`），需新增可选 `config`／`app_config` 形参并透传给 `create_chat_model(app_config=…)`；参数可选，`extract_graph(llm=None)`（`:120-123`）与 `index_document_graph(llm=…)` 的既有调用点与用例不必改。**它的调用点共两处（R12）**：`extractor.py:123`（入库期，经 `indexer.py:82/147` 到达）与 `tools/builtins/graph_search_tool.py:199`（检索期）；后者同样不必改，但会跟着换目标、跟着受严格检查，属生效面。`build_judge_llm(judge_model, *, config)` 已有该形参，不动签名 |
| `caption_images()` 返回形状 | **本期定形（R13）**：dataclass（`captions: dict[str, str]` / `failed: int` / `degraded: bool`），与视频 `CaptionOutcome`（`video/captioner.py:47-53`）同族；`degraded` 由 captioner 用那一份共享阈值常量算出，worker 只读不重算。破坏性变更，调用点清单见 D8 与 §5.2 |
| VLM 目标解析 | 角色层级、缺项检查与 legacy 退役；缺地址时按 D10.2 的表分 provider 处置；协议与 HTTP 请求构造不变 |
| `video.caption_model` 退役（R18） | 删 `RagVideoConfig.caption_model` / `RagVideoFileConfig.caption_model` / `_VIDEO_FIELDS` 项 / 前端 6 处 / `config.example.yaml:2667`；`video/captioner.py:83` 改成直接取 `cfg.rag.vlm_model`，层级交给 D3。**Task 8 需新增嵌套退役键剥离**（见 D10.4），删除面 29 处／16 文件见 §5.2 |
| 配文降级阈值 | 复用 `graph/indexer.py:31` 的 `DEGRADED_FAILURE_THRESHOLD`（或同批把它提到中性位置并改两个既有消费者）；**份数不得增加**，`video/captioner.py:44` 的 `_DEGRADE_THRESHOLD` 是既存的第二份，不许再出现第三份 |
| graph 降级标记 | 写入点从 `graph/indexer.py:209` 移到 worker 的 `_append_error_marker()`（`worker.py:404-413`）；indexer 不再写 `error`，钉住旧生产者的用例随写入点迁移 |
| `core/rag/types.ts` / `config-form.ts` | 增加默认字段读写与来源带回；同时承担后续 VLM 两字段退役 |
| `functional-models-view.tsx` | 功能视图顶部控件，复用原保存按钮／mutation／状态 |
| 公共模型 API、管理 API、偏好存储 | 本期不新增字段、不改输入输出形状 |

字段加载不改变公共模型工厂的 `name=None` 行为；RAG helper 不接管宿主的权限过滤、启停、密钥解密或环境解析。模型名称可见性沿用既有读取权限，新字段只由 admin RAG API 返回，不向普通聊天接口透传。

## 4. 验收清单

1. **RAG 加载链**：缺文件／旧文件／空字段可加载；YAML RAG 值与 UI 覆盖按 D2 生效，PUT 后真实冷加载与只改 RAG 默认字段后的自动热加载均通过真实 resolver 得到新目标。
2. **四条角色链**：抽取、裁判、图片、视频分别覆盖显式角色优先、角色空值继承 RAG 默认、默认也空取首项；**R18 之后视频与图片共用同一条链**（`vlm_model → default_model → 首项`），要断言的正是"视频不再有自己的一层"——设过 `video.caption_model` 的旧文件在归一后不影响视频目标；裁判显式 CLI 参数不被覆盖。
3. **错误与失效**：显式错误名不回落；默认字段失效才首项＋warning；无模型在 RAG 入口报配置错。保存期四种角色错名（含 judge 的 `dashscope:` 名称）及无模型均为 400，detail 带规定前缀和原因，文件不变、零 SDK 构造／出网；运行／CLI 的 D9 异常约定不变。**兜底出来的首项目标不进严格检查**：让它缺地址／钥匙，配文仍按今天降级、抽取／裁判按既有语义，只有 warning 点名，保存不 400。not-found 文案两处生产者有等值钉子（真实触发工厂那句，断言与 RAG helper 输出逐字相同）。不得发空 `model` 请求，正常全站配置加载不因角色目标不存在新增硬失败。
4. **整对象保存**：默认非空写入；省略／null／空白撤销 UI 覆盖，分别测 YAML 有／无 RAG 默认。编辑其他 RAG 字段保留 UI 默认但不复制 YAML 来源；拒绝时文件不变，不以 `{}` 等同未编辑。**"能不能发出 `{}`" 是有条件的，别写成无条件断言（R19）**：`buildRagConfigInput()` 的文本／密钥字段全空时确实不产键（`config-form.ts:203-207`、`:210`），但四个枚举 select 的 seed 值非空（`formValuesFromConfig` 的 `:155/157/162/164` 给 `dashscope` / `provider` / `dashscope` / `mineru-cloud`）且 `:241` 凡 `next !== ""` 就写 ⇒ 结果取决于 wire 里是否已带这些枚举值。两个方向今天都有钉子：`config-form.test.ts:156/215/327` 断 `toEqual({})`，而 `functional-models.dom.test.tsx:477-490` 的 golden 载荷**含**那四个枚举默认。新字段的用例要落在文本字段那一侧。
5. **文件与网络隔离**：保存 RAG 默认时模型配置、用户 YAML、扩展配置字节不变；请求中无模型条目数组或新钥匙。默认变更不触发额外出网，embedding 签名未变时探针计数为零，有真实嵌入变化的对照仍按原规则触发。
6. **功能视图 UI**：仅功能模型内有 RAG 默认控件，对话模型视图及总标题没有；选值不发 PUT，点击已有保存才写；重开读回、清空继承、无模型、无权限、失败保留草稿均覆盖，i18n 三文件齐全。
7. **非 RAG 隔离**：只把 RAG 默认 A 改为 B，真实 RAG 角色目标改变；普通聊天、知识库聊天**主模型**、sidecar、引导、IM／定时任务的既有选模、记忆、摘要／goal、能力判断不变；embedding／sparse／rerank／parse／ASR 不变。正向和负向必须配对，不能只写“没有发生”的空洞断言。**检索期 `graph_search` 属正向那一侧（R12）**：断言它的查询实体抽取 LLM 随 A→B 一起改变，且 `tools/builtins/graph_search_tool.py` 未被修改（形参可选即生效）；不得把它列进“聊天不变”的隔离项。
8. **文档配文状态**：有图 ≤30% 失败为 done，>30% 为 degraded＋规定 error；无图不留键；真实配文→向量→图谱后两类标记都在；重解析成功／无图清理旧结果，仅 indexing 恢复保留配文。**返回形状已定形（R13）**：`caption_images()` 回 dataclass（`captions` / `failed` / `degraded`），`degraded` 由 captioner 算、worker 只读；断言 `worker.py:443` 那条链把 `outcome.captions` 交给 `apply_captions()`，且既有把返回值当映射用的夹具已全部适配（清单见 §5.2）。**阈值只有一份常量**：断言图片腿与 `graph/indexer.py:31` 用的是同一个（源码级钉子：新腿里不出现 `0.3` 字面量）。**graph 标记的生产者已移动**：`index_document_graph()` 不再写 `error`，worker 用 `_append_error_marker()` 写；两条钉子——只跑 indexer 不产生 error 写入、跑完整流水线时两类标记按 `; ` 叠加。
9. **judge 退役**：无同名条目时 `build_judge_llm("dashscope:qwen3.8-max")` 精确抛普通 `ValueError`，消息 `Model dashscope:qwen3.8-max not found in config`（**库层契约**）；CLI **不把它抛穿**——把同一句写到 stderr、落一行 `status="error"`、以 `EXIT_ERROR`(2) 退出（**CLI 边界契约，乙／R27**），子进程退出码为 2，不是 1、也不是 `EXIT_SKIPPED`；完整同名条目走条目而非直连；空参数按 D3，答题模型不变。**那行记录要被断言、不是写下就算（R28①）**：对 `cli._persist_eval_run`（或 `eval_persistence.save_eval_run`）装 spy，断言恰好一次且 `status="error"`，并配一条只删 persist 那一行的专属 neuter——现有夹具下该写入会静默失败成一行 stderr note，没有 spy 就是空洞绿。**捕获按消息收窄**，宽捕 `ValueError` 会打掉 `:86 test_config_value_error_maps_to_skipped`（详见 D9 与 R28⑤）。
10. **RAG 缺项校验**：范围＝UI 来源 × 协议格 × **用户显式声明的目标**。缺钥匙／钥匙空白在保存与抽取／裁判／图片／视频四个入口拒绝，同一文案、`RagConfigurationError`、零 SDK 构造／HTTP 请求；测试环境给 SDK 隐式凭据也不能绕过。**RAG 自己的环境变量兜底也已抽走（R14）**：`_environment_key()` 删除后，条目内不写钥匙、而宿主环境里有同名变量时，判定仍是缺项——这条要有专属钉子，否则只删 legacy 分支、把条目分支的 env 兜底留着也能全绿。缺地址只对 `openai-compatible` 拒绝；`anthropic` / `deepseek` 缺地址是**正向对照**（能保存、能调用）。完整条目、显式 `$VAR` 解析结果、象征性钥匙有正向对照；非 UI 来源、厂商格、兜底首项三类对照不受严格规则约束。**运行侧入口包含检索期（R12）**：经 `graph_search` 的核心实现用一个缺钥匙的显式声明目标，同样在调用工厂前抛 `RagConfigurationError`。
11. **地址边界**：UI `anthropic` 与 UI `deepseek` 条目仅缺地址、带测试钥匙时，VLM 用各自 SDK 的默认地址完成 MockTransport 请求，且与聊天腿解析到的地址相同；显式地址始终优先，不出网探测、不回写条目。各有一条钉子断言 RAG 侧读到的默认值与该 SDK 自己的值相等。UI `openai-compatible` 仅缺地址则被拒，错误句点名缺地址。范围外 VLM 缺钥匙仍降级，不能保证其必成功。公共工厂源码与原 SDK 环境端点规则不变；旧版"不承诺 raw HTTP 与 SDK 端点一致"的免责声明按 D10.2 收回，只保留 `openai-compatible` 那一格的差异登记。
12. **旧文件归一**：两个顶层 VLM 键单独／与 `parse_backend` 共存可加载且从有效覆盖剥离，有效字段保留；**嵌套的 `video.caption_model` 同样要被剥离（R18）**，且要与 `video` 块里仍有效的 `asr_provider` / `asr_model` 共存时只掉退役那一个；其他未知键（含 `video` 块内的未知键）、坏 JSON、非对象仍拒绝。warning 无地址／钥匙哨兵——**这条要新建断言，`parse_backend` 的先例只断键名出现、没断值被排除（R22）**；读取前后字节相同；合法 PUT 清旧键，回送旧键 422（顶层与嵌套各一条）。
13. **热加载方法**：自动路径固定为“改变临时 RAG 文件签名→get_app_config”，用 loader 增次／新对象与 RAG 变更日志证明发生；不改文件的对照命中缓存，避开 ContextVar／custom 配置短路。强制 reload／reset 另测调用与结果，不共用自动分支日志断言。
14. **用户入口终态**：视频 recaption 的旧内容保留、caption failed 与 in-flight 释放；按需评测 error 行保留第一层／baseline_diff，合法可选跳过不变；不能只测底层函数抛错。
15. **门禁与真栈**：后端 ruff 双净、RAG 窄面及全量零新增失败；前端 check、功能模型／form 窄面与全量通过。真浏览器验功能设置与聊天隔离，最终验收在 Task 9 之后重跑；测试只临时改 RAG 配置并逐字节还原，不改／删用户模型条目。

## 5. 文件影响与退役交接

### 5.1 本期修改面

| 文件 | 修改归属 |
| --- | --- |
| `backend/packages/harness/deerflow/config/app_config.py` 的 `RagConfig` / `RagVideoConfig` | RAG 默认字段、VLM 三字段／字面量默认退役、`RagVideoConfig.caption_model`（`:158`）退役；不改顶层默认或通用加载器规则 |
| `backend/packages/harness/deerflow/config/rag_config_file.py` | 默认字段、**四个**模型引用字段的空白 validator（单类，R18）、**顶层两键＋嵌套 `video.caption_model`** 的读取归一、后续字段／密钥名单退役 |
| `backend/packages/harness/deerflow/knowledge/model_target.py`（新增） | RAG 默认解析、纯缺项判定、not-found 文案常量、per-provider 默认地址读取；不设全站接线 |
| `knowledge/graph/extractor.py`、`knowledge/eval/factory.py` | `get_extract_llm()` 增可选配置形参并明确传 RAG 有效模型；judge 直连退役 |
| `knowledge/vlm_target.py`、两条 captioner | RAG 继承、目标检查、配文计数／退役；图片腿复用既有阈值常量，不新增字面量。`video/captioner.py:83` 的 `cfg.rag.video.caption_model or cfg.rag.vlm_model` 收敛为单一来源（R18） |
| `knowledge/worker.py`、`knowledge/graph/indexer.py`、`knowledge/store.py` | graph 降级标记的写入点由 indexer 移到 worker 的追加 helper；配文标记追加与重解析边界；配置错收尾 |
| `knowledge/eval/ondemand.py`、`backend/scripts/run_ragas_eval.py` | 裁判与答题模型分离，错误终态／CLI 退役 |
| `backend/app/gateway/routers/rag_config.py` | pending 默认／角色校验，字段响应与退役 |
| `frontend/src/core/rag/{types,config-form,hooks}.ts` | RAG 字段读写、来源与原保存链，按实际所需修改 |
| `frontend/src/components/workspace/settings/functional-models-view.tsx` | 控件、草稿与现有保存按钮 |
| locales 的 `types.ts` / `zh-CN.ts` / `en-US.ts` | D5 标签／说明及相关角色解释，不动全站聊天文案 |
| RAG 配置／角色／worker／API／form／功能视图测试与 golden | 按 §4；公共模型／聊天测试仅作隔离守卫 |
| `rag_config.example.json`、`config.example.yaml` 的 rag 段 | 实施时同步 RAG 使用说明与退役字段，版本规则按模块指南；不修改真实配置。`config.example.yaml` 具体两处见 §5.2（R16） |
| `backend/AGENTS.md` 的 “Caption target resolution” 段（`:703-723`）**与 Layer 2 评测段（`:1211`）**、`UPSTREAM_README.md` 的 rag 配置样例（`:957-958`） | **随退役同批改，不推给发布前清单（R11 / R15 / R20）**：`:703-723` 逐字描述了将被删掉的 `rag.vlm_base_url` 兜底、rag 文件钥匙／环境变量兜底与裸 id legacy 路径（归 Task 9）；`:1211` 描述了 `--judge-model dashscope:<model>` 直连与 `DASHSCOPE_JUDGE_API_KEY` 回退，且说按需评测 unset 时 "falls back to the config primary model"（本期后是 RAG 默认→首项）——**后一句已提前改掉**（2026-09-27 随 Task 3 收尾批，因为它从 Task 2 起就已是假话），**只剩前一句过期**（归 Task 7）；`UPSTREAM_README.md:957-958` 那句 `or a bare model id to use rag.vlm_base_url with the caption API key` 同批失效。根 `AGENTS.md` 的文档更新约定本身就要求架构改动**在同一个变更集里**改对应模块指南 |

**明确不改生产文件**：`config/models_config.py`、`models/factory.py`、`routers/models.py`、模型 add/edit 弹窗、`core/models` 的管理契约、`core/settings` 偏好系统、input-box／sidecar／knowledge chat、agent／memory／channels／scheduler 的选模逻辑；`models-settings-page.tsx` 的全局标题结构不改。**`tools/builtins/graph_search_tool.py` 也不改**（新形参可选，`:199` 原样可用），但它经 `get_extract_llm()` 共享抽取角色，行为变化登记在 D6 与 §6.2，不因为“没改文件”就当作隔离面（R12）。需要 read-only 复用的类型／函数不算扩大修改范围。

### 5.2 保留的细项清单

以下行号是定位线索，**实施前一律按符号重读，不以行号代替当前代码**。第三轮已按 HEAD `090bbcbc` 重扫过一次：该提交（“unlock the retrieval endpoint rows and require an address”）重排了 `functional-models-view.tsx`（−120 行）、`config-form.ts`（−82 行）、`test_rag_config_api.py`（+60 行）与两份前端测试，所以**前端与 `test_rag_config_api.py` 的行号已就地更新，其余后端文件的行号在本轮逐个核过仍有效**。注意该提交的“require an address”说的是嵌入／重排两条检索腿（`embedder_factory.py` / `reranker_factory.py`），**不是模型条目的 `endpoint`**——`routers/models.py:187` 的 `endpoint` 仍可选，D10.1／D10.2 的前提未被它改动。

| 连带面 | 必须处理的事实与 Task |
| --- | --- |
| `SECRET_ENV_VARS["vlm_api_key"]` | Task 9 与 `knowledge/captioner.py`、`knowledge/video/captioner.py` 两处模块级 `VL_API_KEY_ENV` 同批删除／调整；否则 import 期 KeyError；缺钥匙分支随条目来源改写 |
| RAG router | Task 9 删除 `_SECRET_FIELDS` 的 VLM 项与 `_secret_env_name()` 特例；`_SECRET_LEGS` 上方“caption VLM key is deliberately absent…”末句删除，其余说明保留 |
| 前端 config-form | Task 3 增默认字段；Task 9 删 VLM 地址／钥匙类型、`SECRET_FIELDS`（`:91-97`）/ `TEXT_FIELDS`（`:99-112`）项及 `formValuesFromConfig()` 显式映射（`:150-153`）；读取侧不是清单循环，不能漏改。**R18 的 `video.caption_model` 另有 5 处**：`RagConfigFormValues:55`、source-key 映射 `:127`、`formValuesFromConfig:170`、`buildRagConfigInput` 的 video 循环 `:248`、`hasFormChanges` 的 video 比较 `:516`；其中 **`:127` 那个映射最容易漏**（它不在任何字段清单里）。`types.ts:13` 的 wire 字段同批删 |
| 同值夹具陷阱 | 实测比原描述更细（R22）：`VL_ENTRY.name` 是 `"vl-entry"`（`test_vlm_target.py:25`），wire `model` 是 `"qwen3.7-flash"`（`:27`），**名与 wire id 本来就不同名**；真正的陷阱是那个 wire id 与 `RagConfig.vlm_model` 的**字面量默认**同串，于是 `test_defaults_to_the_configured_vlm_model`（`:116-125`）里 `target.model` 在"条目解析"与"legacy 解析"两种实现下**都等于 `qwen3.7-flash`**，只有 `source == "legacy"`（`:125`）能区分 ⇒ 反转该用例时必须让条目名／wire id／RAG 默认值三者互不相同，并断言 `source` 与真实目标，否则行为没变也照样绿 |
| `test_vlm_target.py` 五处旧行为 | Task 9 反转：缺地址借 RAG（**改为按 provider 借 SDK 默认，`openai-compatible` 才报错**，R1）、缺钥匙借 RAG／env、裸 id legacy、空参数借厂商字面量默认、未知名按 legacy 判方言；对应旧行 75–86 / 89–99 / 102–113 / 116–125 / 195，不能只 grep `source == legacy` |
| GET 不回显密钥 | `test_get_never_returns_a_stored_secret`（HEAD `090bbcbc` 下 `test_rag_config_api.py:177-184`；旧行号 159/165 已失效）今天用 `{"vlm_api_key": "sk-super-secret"}` 当载体，Task 8 改用 `embedding_api_key` 等活字段承载，`_write_rag_json(...)` 与 `assert … == MASKED_SECRET` 两处一起改；保留测试，不能等删字段才改 |
| support-bundle 脱敏 | `test_support_bundle_redacts_rag_config`（`:309`，夹具 `:318` 写的是 `"vlm_api_key": "sk-vlm-secret"`）直接读**原始 JSON**，所以它保留存量 VLM 旧键是**正确的**，不因 schema 退役删除、也不要“顺手改成活字段”——它守的正是旧文件仍被脱敏这件事 |
| 其他旧夹具 | Task 9 处理 `test_rag_config.py:17/127` 的 `qwen3.7-flash` 字面量默认断言、`test_rag_config.py:181` 与 `test_rag_config_file.py:98/103` 的 `video.caption_model` 断言（R18）；`video/test_captioner.py` 的裸 id／环境钥匙实为 **`:33-94` 共 6 例**（原写 `:37–91` 偏窄，R22），全部用 `model="test-vlm"` + `DASHSCOPE_API_KEY`。补完整条目和明确来源，不放宽生产校验 |
| **零模型条目夹具 ⇒ Task 9 的 200 会变 400（R22，最重要的一条）** | `config_env`（`test_rag_config_api.py:55-81`）写 `models_config.json = {"models": []}`，`_write_config_yaml()`（`:39-43`）也写 `"models": []` ⇒ **一个模型条目都没有**。而 golden 的 `put.payload`（fixture `:78`）与 `test_judge_model_round_trips_as_a_regular_field`（`:264-280`）都声明 `judge_model: "judge-entry"`，这个名字**不指向任何条目**。所以 Task 9 的保存期错名映射会把这两处从 200 打成 400（`提交后的配置仍不可用：Model judge-entry not found in config`）。**修法是补夹具、不是放宽检查**，且本仓今天刚落下同款先例：`_EndpointSeededClient`（`:90-101`）就是为了"两个检索端点现在必填"而给每个 PUT 自动补键的 shim，docstring 还写明"不关心的用例自动补齐、关心空态的用例显式传 `""` 覆盖并**故意**让保存失败"。照这个形状给 `config_env` 补一个真实条目即可。`test_judge_model_falls_back_to_config_yaml`（`:284-289`）不声明角色，不受影响 |
| golden 与前端夹具 | Task 1 声明字段即由 router 自动增加响应默认字段及来源，`response_golden.json` 同批更新，不能留到 Task 3；Task 3 接前端默认字段与来源测试。Task 9 才删 VLM 两字段与来源，同批改 golden、`unit/rag/config-form.test.ts`、`unit/settings/functional-models.dom.test.tsx`，不放宽整个形状守卫。**为什么会红要说清机制（R19）**：守卫是 `_assert_pure_addition()`（`test_rag_config_api.py:478-486`）配 `_ADDED_FIELDS = {embedding_providers, rerank_providers, warning}`（`:477`），断言 `set(body) == set(golden) \| _ADDED_FIELDS` **且**去掉这三个键后与 golden 逐值相等；调用点 `:537`（GET）与 `:545`（PUT）。`_ADDED_FIELDS` 是**顶层**白名单，而 `default_model` 是 `config` / `sources` 里的**嵌套**键 ⇒ 整个字典按值比对必然不等，只能改 golden，不能靠往白名单里加名字过关。基线现状：`get.config` **25 键**、`get.sources` **27 键**（25 − 1 个 `video` + 3 个 `video.*`）、`put.payload` **12 键**；Task 1 各 +1，Task 9 各 −2（VLM 两键）再 −1（`video.caption_model`，R18） |
| **第三份前端测试（R20）** | `frontend/tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`（369 行／12 例）**直接渲染 `FunctionalModelsView`**、用 Proxy 假 i18n（断 key 名不断文案）、钉 provider 行的锁定／显示规则；与 `frontend/tests/unit/settings/functional-models.dom.test.tsx`（1533 行／65 例，渲染整个 `ModelsSettingsPage`、用真字典、含 `:477-490` 的载荷 golden）**覆盖同一个组件**。两份都被 `090bbcbc` 改过。Task 4／9 的前端窄面门禁必须**两份都跑**——按数据字段 grep 扫不到 Proxy 假 i18n 那一份 |
| **两个无名的 RAG 内部选模点（R20）** | `knowledge/wiki/generator.py:210-212` 的 `_default_llm()` 与 `knowledge/eval/synthesis.py:141-143` 的 `_default_llm_factory()`，都是 `create_chat_model()` **不带 name** ⇒ `models[0]`，注释自称 "uses the main model (first configured)"。本期**不接** RAG 默认，但 Task 2 的"其他功能模型隔离"守卫要点名它们（各一条：A→B 后它们的构建目标**不变**），否则 D6 那句"其他未列 RAG 调用保留各自行为"无法验证 |
| **非 RAG 选模基线共 7 处（R24）** | Task 2 的隔离守卫按点断言，不笼统写"聊天不变"：`lead_agent/agent.py:133`（`_resolve_model_name`）、`summarization_middleware.py:162`（`_default_model_name`）与 `:716`、`tool_error_handling_middleware.py:361`、`client.py:301`、`models/factory.py:299`（`name is None` 分支）、`runtime/context_compaction.py:88`；另 `tools/tools.py:114` 也读 `config.models[0].name`。本期一处都不改 |
| legacy 模块说明 | Task 9 同步 `vlm_target.py`（含 `:10-12` 的模块 docstring）、`video/captioner.py`（`:13` 那句回退描述）、`test_vlm_target.py` 的旧回退 docstring |
| **`backend/AGENTS.md:703-723`（R11）** | Task 9 重写 “Caption target resolution” 整段。今天它逐字写着将被删掉的行为：`falling back to rag.vlm_base_url when the entry declares none`（`:707-708`）、`then the rag file key, then the environment`（`:709`）、`the legacy bare-id path below, keep the OpenAI shape`（`:714-715`）、`A value that names no entry is a legacy bare model id and keeps the old path (rag.vlm_base_url plus the file key or the environment)`（`:717-720`）、`rag.vlm_base_url as the only two endpoint sources`（`:721-723`）。改成“条目提供三元组；条目缺地址时按 provider 惰性取该 SDK 自己的默认值；命名不到条目即配置错”。**不属 B-2**：根 `AGENTS.md` 的文档更新约定要求架构改动在同一个变更集里改对应模块指南 |
| **`UPSTREAM_README.md:957-958`（R15）** | Task 9 删掉 `or a bare model id to use rag.vlm_base_url with the caption API key` 那半句，只留“`models:` 条目名”。B-2 接的是**旧环境变量名单**，不覆盖这个**配置字段**说明，两件事不要并成一项 |
| `SILICONFLOW_VLM_API_KEY` 过期说明 | Task 9 删除 `config.example.yaml:2564` 的独立 VLM 注释行；`app_config.py:184`／`backend/AGENTS.md:1188` 的变量名单只删该项和分隔符，保留其他有效内容，不替换成另一厂商专属变量名。注意这与下一条是**同一文件的两个不同段**，别只改一处 |
| **`config.example.yaml:2578-2584`（R16）** | Task 9 另两处：`vlm_model` 上方注释里的 `A bare model id keeps the legacy path: rag.vlm_base_url (DashScope's compatible endpoint by default) plus DASHSCOPE_API_KEY`（`:2578-2581`），以及注释掉的 `# vlm_base_url: …` 与其引导句 `Endpoint used when vlm_model names no models: entry`（`:2583-2584`）。`:2582` 的出厂值 `vlm_model: qwen3.7-flash` 随 `app_config.py:193` 的字面量默认一起处理（后果见 §6.2） |
| **`video.caption_model` 删除面 29 处／16 文件（R18）** | Task 9 同批，逐层清点（排除历史文档与本期这对）：**后端 schema 3**（`app_config.py:158`、`rag_config_file.py:71`、`routers/rag_config.py:65` 的 `_VIDEO_FIELDS`）；**后端生产读取 1**（`video/captioner.py:83`）；**后端 docstring 3**（`video/captioner.py:5`/`:74`、`vlm_target.py:61`）；**后端测试与 golden 9**（golden `:33/63/112/142`、`test_rag_config.py:181`、`test_rag_config_file.py:98/103`、`test_recaption.py:91`、`test_worker_pipeline.py:121`）；**前端生产 6**（`types.ts:13`、`config-form.ts:55/127/170/248/516`）；**前端测试 5**（`config-form.test.ts:78/107/135`、`functional-models.dom.test.tsx:166/186`）；**模板 1**（`config.example.yaml:2667`）；**活文档 1**（`docs/PRE_RELEASE_HARDCODE_INVENTORY.md:426` 那行把 `rag.video.caption_model` 当作现行字段描述其继承规则，退役后成假话——它与 `backend/AGENTS.md` 同类，属 Task 9 而非 B-2，因为 B-2 接的是**环境变量名单**）。合计 **3+1+3+9+6+5+1+1 = 29 处／16 文件**。历史文档 `specs/2026-09-08-video-ingest-design.md:187`、`specs/2026-09-10-rag-functional-model-config-design.md:54`、`specs/2026-09-14-rag-model-provider-adaptation-design.md:59`、`plans/2026-09-10-rag-functional-model-config.md:29` 留档不改。行号截至 HEAD `090bbcbc`，实施前按符号重扫 |
| **`caption_images()` 全部调用点（R13）** | Task 6 同批改：生产 `worker.py:443`；夹具 `test_worker.py:156/183/206`（三处 `AsyncMock` 返回裸 dict）、`test_parser.py:215/241/251/328/349`、`test_vlm_target.py:148/207/283/301/324`（都把返回值当映射用）。实施前按符号重扫全部调用点，**不以本清单为上限** |
| **`get_extract_llm()` 全部调用点（R12）** | Task 0 登记两处：`extractor.py:123`（`extract_graph` 内部；入库期经 `indexer.py:82/147` 到达，worker 构造默认 `llm=None` 故生产路径走这条）与 `tools/builtins/graph_search_tool.py:199`（检索期聊天工具）。**两处都不需要改代码**（新形参可选），但第二处的行为变化必须进 Task 2 的**正向**断言，不能只写“聊天不变” |
| `test_parser.py` | Task 9 修改模块说明，去掉旧行 211/237/274 的无效 setenv，保留用例与有效断言，夹具改为条目目标；返回形状的适配归 Task 6（上两条），两件事不要混在一处改 |
| **judge 退役的用例级受害者（R25）** | 两份文档此前只写了文件名、没写用例，Task 7 会当场撞上：**`test_eval_factory.py` 共 8 例**——删／反转 **3**（`:19 test_dashscope_prefix_builds_openai_compatible_client`、`:28 …_falls_back_to_dashscope_api_key`、`:36 …_without_key_raises`），重装 **2**（`:43 test_config_model_name_delegates_to_factory`、`:57 test_default_none_uses_primary_model` 都传 `config=object()`，而 D3 之后 `judge_model=None` 要读 `config.rag` ⇒ 必须换成带 `.rag` 的临时配置；`:57` 的**名字与断言本身**"primary model"也过期），`:4` 模块 docstring 提到 `dashscope:`；其余 3 例（`:68`/`:75`/`:101`）不受影响。**`test_ragas_eval_cli.py` 共 17 例**——删／反转 **4**（`:107`、`:116`、`:124`、`:154 test_missing_judge_key_maps_to_skipped_before_engine`，最后这条断言 exit 3，Task 7 之后同一输入是普通 `ValueError` ⇒ 不是 3），重装 **2**（`:131`、`:145`，同为 `config=object()`），`:51 test_explicit_values` 的 `dashscope:qwen3.8-max` 只是字符串透传可留、但 `:157` 的 help 文案要改。**`:86 test_config_value_error_maps_to_skipped` 不是受害者**：它走 `get_app_config()` 抛错的另一条 skip 路，别顺手删。**`test_eval_cli.py` 零命中**（那是第一层 `run_rag_eval.py` 的 CLI），Task 7 的文件清单不含它是对的 |
| **`test_ondemand.py` 是 Task 2 的受害者，此前没点名（R25）** | `:93-123 test_layer2_deps_judges_with_the_configured_judge_model` 用 `SimpleNamespace(rag=SimpleNamespace(judge_model=None))`（`:119`）断言"未配置 → 主模型"，docstring `:94` 逐字写着 `未配置为 None → 主模型`；D3 之后是 RAG 默认 → 首项。`:116`（有 `judge_model`）与 `:123`（空串）两条仍有效，但空串那条要跟着 D2 的 validator 一起核（空白归一只改落盘，不改这里的合并语义）。Task 2 的文件清单要加上它，否则"裁判层级"RED 写完才发现既有用例红 |
| **`nightly.yaml:299-303` 传的就是被退役的那个前缀（R26）** | 比"死 secret"强一档：`:303` 的 `--judge-model dashscope:qwen3.8-max` 是**活调用点**。**失效链已逐级核过（不是推测）**：Task 7 删掉 `JudgeKeyMissingError` 与 `run_ragas_eval.py:213-216` 那个捕获后，`_build_judge_llm()`（`:212`）抛的普通 `ValueError` **无人接**——`:187` 的 `except ValueError` 只包 `get_app_config()`（`:183-189`），`_run()`（`:252-260`）只有 stdout 重配的 `except (AttributeError, OSError)`，`main()`（`:279-292`）与 `sys.exit(main())`（`:296`）都没有捕获 ⇒ 冒出 traceback、进程退出码 **1**。而 nightly `:294` 是 `set -uo pipefail`（**无 `-e`**），`:304 EXIT_CODE=$?` 收到 1，`:306` 只认 3、`:310` 只认 2，于是走到 `:314 exit 0` ⇒ **这个 job 会绿着通过，只留一段 traceback 和一份没生成的报告**（`:317` 的上传步骤是 `if: always()`，传的是空目录）。所以它不是"上游 nightly 会红"，而是**静默假绿**——比红更难发现。**（R28②：以上整条是 R27 之前、即"未加映射"时的反事实链，保留作那条裁决的证据；已裁乙之后 Task 7 同批加映射 ⇒ 实际退 2、命中 `:310-313` 的 `::error::` ⇒ job 红着提醒，不再假绿。）**另：`:296-298` 那段"judge 与答题模型不同族以避免自评偏差"的注释同批失效；`:266` 把 `DASHSCOPE_JUDGE_API_KEY` 列进 skip 门禁的必需钥匙、`:280`/`:290` 传该 secret，Task 7 之后没人读（`:289-291` 的缺钥匙 skip 仍在，因为嵌入／重排钥匙还在门禁里）。**处置：Task 7 不改 nightly**（该 job 有 `if: github.repository == 'bytedance/deer-flow'`，`:241`，本仓永不执行 ⇒ 不构成本期回归），但登记进 §6.1，且**真正拆上游 PR 时必须同批改**。别把这条和"死 secret"并成一项：一个是没人读，一个是会静默假绿 |

B-2 的 `.env.example`、README／UPSTREAM_README 中**旧环境变量名单**及 `test_e2e_smoke.py` live 门禁清理仍归 [发布前清单](../../PRE_RELEASE_HARDCODE_INVENTORY.md) 的独立工作，不在本次文档修订中修改，也不当作此 plan 已交付。它与 Task 9 的 RAG 退役交接保留；本期新增功能的使用说明仍按模块指南同步。**边界要说清（R11 / R15）**：B-2 接的是 `SILICONFLOW_VLM_API_KEY` 这类**环境变量名**的过期名单；`rag.vlm_base_url` 是本期删掉的**配置字段**，描述它的 `backend/AGENTS.md` 段落与 `UPSTREAM_README.md` 那半句属 Task 9，不因“也在 README 里”就顺延——否则 Task 9 交付后模块指南会描述一条已不存在的路径。

## 6. 暂缓事项与已知代价

### 6.1 主动移出，未修复

- 全站默认、上游模型目录／API 统一、模型保存锁及跨标签页竞争、UI 条目写入校验／`has_api_key`／修复草稿。
- 模型 `$VAR` 保存引用不变的修复、递归错误定位、聊天自动模型写入偏好、agent 设置能力回落与知识库聊天显示差异。
- memory 缓存跟随、goal 的实际模型传递、IM／定时任务的独立模型入口；本期不修改或清空历史偏好。
- `CODEX_BASE_URL` 属宿主模型实现而非本次 RAG 配置；不改、也不再把 D11 的全 UI 规则套到它。
- **`sources` 没有 `default` 这一态（R19 带出）**：`_build_response()`（`routers/rag_config.py:220-221`）对非密钥字段只在 `ui` / `config_file` 里二选一，所以**来自代码字面量的值会被报成 `config_file`**——今天 `vlm_base_url` 就是这样（golden 的 `get.sources` 里它是 `config_file`，而它其实是 `app_config.py:194` 的字面量）。`default_model` 的字段默认是 `None`、不命中这条，本期不新增第三态也不修它；VLM 两键退役后这个具体的谎报随之消失，但机制仍在。
- **`nightly.yaml` 的 Layer 2 job 本期不改（R26）**：`:303` 传着被 Task 7 退役的 `--judge-model dashscope:qwen3.8-max`，`:266/280/290` 传着退役后没人读的 `DASHSCOPE_JUDGE_API_KEY`，`:296-298` 的注释描述的是被删掉的那条直连。该 job 有 `if: github.repository == 'bytedance/deer-flow'`（`:241`），本仓永不执行 ⇒ 不构成本期回归；但**真正拆上游 PR 时必须同批改**：按 R27 已裁的乙，CLI 会以 `EXIT_ERROR`(2) 退出 ⇒ 该 job 会**红着提醒**"这行参数还没换"，不再是静默假绿（失效链见 §5.2 的 R26 行）。**同批改时别图省事直接删掉 `--judge-model`**：那条 job 的注释写明裁判要与答题模型**不同家族**（答题＝DeepSeek，裁判特意用 qwen）以避免自评偏差；删掉参数会让裁判按 D3 的裁判行往下走（`rag.judge_model → rag.default_model → config.models[0].name`），上游那两级都没设 ⇒ 落到主模型（＝答题同家族），偏差悄悄回来且无人提示。正解是把参数换成上游配置里真实存在的、**另一个家族**的裁判条目名。

### 6.2 本期保留的代价

- RAG 与聊天的默认来源暂时不同，这是有意隔离，不是遗漏；只有经 D3 的角色消费新字段。
- 旧 RAG VLM 字段／裸 id 退役仍是行为变化，需要运维将目标改为模型条目；不读取或替用户改真实配置，不声称“其他代码不动”就等于旧 RAG 配置完全无影响。
- RAG 保存仍是整对象替换，其他旧页面省略新字段会撤掉 UI 覆盖；不增加特殊兼容协议。旧页面回送退役字段会 422，刷新后再保存。
- 校验只在 RAG 保存／调用入口收紧，且只针对**钥匙**与 `openai-compatible` 的地址；因此同一个 UI 协议条目可能仍被普通聊天按原 SDK 语义处理（例如条目内不写钥匙、靠 `OPENAI_API_KEY` 环境变量），被显式声明为 RAG 角色时却在保存期被拒。不再宣称全站一致，也不再假装这条差异覆盖地址。
- **兜底首项不受严格检查**（D3 末条 / D10.1）：一个缺钥匙的条目仍可能被 RAG 调用到——只要它是从 `models[0]` 兜出来的。这是刻意的：拒绝的代价落在没为 RAG 做过任何选择的用户身上。表现与今天相同（配文降级为占位符、抽取／裁判在请求期失败），多一条 warning 点名条目。
- **三个**既有角色字段随 D2 的 validator 一起获得空白归一（`extract_model` / `judge_model` / `vlm_model`；R18 退役 `video.caption_model` 之后是三个，不是原先写的四个）：手写 `extract_model: " "` 从"炸成 `Model   not found in config`"变成"视为未设置"。这是修脚枪，但确属既有字段的行为变化，不静默。
- graph 降级标记的写入点从 indexer 移到 worker（D8）：单独调用 `index_document_graph()` 的路径（含既有脚本／用例）不再自己写 error 标记，标记改由流水线侧统一追加。
- **退役 `video.caption_model` ＝ 设过它的人静默换模型（R18）**：视频配文从此永远跟随 `rag.vlm_model`，任何写过 `video.caption_model` 的部署会失去那层覆盖。**爆炸半径窄**：该字段在功能视图里**零控件**（`functional-models-view.tsx` 全文 `caption_model` 出现 0 次；前端只有 `config-form.ts:127` 的来源键映射与 `:248` 的写回循环），所以只可能来自手写 `config.yaml` 或直接编辑 `rag_config.json`。**两个载体的失效方式不同，别混为一谈**：JSON 文件走 `RagVideoFileConfig`（`extra="forbid"`，`rag_config_file.py:67`）⇒ Task 8 若不把剥离扩到嵌套就是**硬加载失败**（整个 RAG 配置读不出来）；YAML 走 `RagVideoConfig`（**没有 `model_config`**，`app_config.py:143-160` ⇒ pydantic 默认 `extra="ignore"`）⇒ **静默忽略**。所以 Task 8 的嵌套剥离是必须的，而 Task 9 之后 YAML 那侧的静默忽略是本期接受的代价。旧 `rag_config.json` 回送该键会 422，刷新后再保存（同 VLM 两键）。
- **`vlm_model` 的厂商字面量默认被删（D7）＝换模型，不是“少一个默认值”（R17）**：今天没配过 VLM 的部署默认打 DashScope `qwen3.7-flash`（`app_config.py:193` 的字面量），删掉之后落点变成 RAG 默认 → 模型列表首项，配文实际打到**另一个模型**上。`config.example.yaml:2582` 出厂就写着 `vlm_model: qwen3.7-flash`，所以照模板部署的用户不会命中这条；命中它的是把该行删掉、只靠代码默认的人。
- **检索期 `graph_search` 会跟着抽取角色一起被严格检查（R12 / R17）**：`tools/builtins/graph_search_tool.py:199` 共用 `get_extract_llm()`，所以一个缺钥匙的**显式声明**目标会让聊天工具调用在检索期抛 `RagConfigurationError`。这与“不在全站加载阶段校验、不阻断聊天启动”不冲突（校验发生在 RAG 构建入口，不是配置加载期），但确实是一条新的用户可见失败面；而且这个文件不在 `knowledge/` 下，隔离守卫最容易把它漏成“聊天不变”。兜底首项按 R2 仍豁免，所以只有用户自己声明过的目标会触发。
- **按需评测的终态从 `completed` 变 `error`（D10.5）（R17）**：同一个坏裁判配置，今天被 `eval/ondemand.py:369-370` 的宽捕获吞成“评测成功、第二层为空”，改后落 `status="error"` 并保留第一层指标与 baseline_diff。这是修 bug，但确属既有行为变化；历史评测行的状态不回改。
- **Layer 2 CLI 的裁判错名从 `skipped`+退 3 变 `error`+退 2（R27／R28③）**：同一个 `--judge-model dashscope:<名>` 输入，今天走 `run_ragas_eval.py:213-216` 的 `JudgeKeyMissingError` 捕获 ⇒ 落一行 `status="skipped"` + 退 3，nightly `:306-309` 把它当"显式跳过、不是通过"并 `exit 0`；Task 7 之后同一输入是错名 ⇒ 落一行 `status="error"` + 退 2，命中 `:310-313` 的 `::error::` 并 `exit 1`。**行数不变**（仍是一次运行一行，`:81-82` 的不变量守住），变的是这一行的状态与进程退出码 ⇒ 运维看板上原本记作"跳过"的那类运行会改记"失败"。这正是乙刻意要的结果（假绿比红贵），但确属既有行为变化，不静默；历史行不回改。
- **英文 error 标记出现在中文界面（R17）**：`image caption degraded: M/N images failed` 与同族 `graph degraded: …`（`graph/indexer.py:9-10`）、`entity-resolution failed`（`worker.py:381`）一样是 `documents.error` 里的英文串，文档列表直接渲染。沿用既有约定、不新增 i18n key，代价是中文界面上这一列是英文——先例已在，不是本期新造。
- 无视觉守卫意味着可能调用不适合配文的模型；D8 记录调用失败，但不会自动评判“回答成功却描述错误”的质量。
- 改默认不重写历史产物；文档无轻量重新配文入口的问题继续登记，视频仍可用已有 recaption；不新增自动重建。
- RAG 模型文件、宿主配置及本机环境加载仍有各自既有错误语义；退役键归一不能修复一个仍在使用但解析失败的环境变量引用。

后续拆分时只重新评估宿主目录接入、默认层级与管理边界，不把本期 RAG 默认暗中扩为全局默认。
