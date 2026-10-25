# RAG 首期切片（裁剪移植到上游基座）—— 设计

**Status:** 草案（2026-10-06）；**D1–D7 已裁（全甲）＋D8 已裁（甲，10-07）**；起草时零实现→执行中：**Task 0 ①–⑨ 全核实；Task 1 已落（`cbdaec70c`→`d2b422f2b`）；Task 2 已落（`14ea2f93a`）；Task 3 已落（`e6df6edb8`）；Task 4 已落（`f47f5c618`）；Task 5 已落（`29b43cec2`）；Task 6 已落（`a630a3b3f`）；Task 7 已落（`b45eb9c02`）；Task 8 已落（`619c24586`／`9bb4ea9cb`／`5cc0197b4`）**。
**基座：** `E:/app/python/agent/deer-flow-slice`（主仓 worktree）@ `e325c90b2`（upstream/main，2026-10-06 12:16）。
**源：** `feat/rag-knowledge-base` @ `a343b8b03`（开发分支，已推送）。
**输入：** RFC v3 §2–§10（`docs/plans/2026-09-22-local-knowledge-base-rfc-v3.md`，已提交）；首期切片工作项 26 条（`docs/plans/2026-10-06-rfc-v3-eval-workitems.md`，含 2026-10-08 随带组加行 1 条）；审计发现清单（`docs/plans/2026-10-06-rfc-v3-audit-findings.md`——E1〔云腿回写，已随 `a343b8b03` 入库〕／D9〔前缀登记，已落 §2.3 与 Task 8〕）——本对 plan 并入或作为其输入，切完回填状态列。

**本对一件事：把开发分支的知识库模块搬上上游基座，并裁到首期口径。** 载体＝仓内可选扩展（RFC §6）；首期＝一个完整文档闭环：向量腿 + 一个检索工具 + 文档级只读工具组（随带） + 最小 UI + 基础评测。开发分支模块实测 **70 文件 / 15,919 行**（另有 **107 测试文件 / 31,816 行**、前端 **80 文件**〔另 71 测试文件〕），其中四条后置腿（`graph/` 8、`wiki/` 3、`video/` 10、`projection/` 4）与 eval **7 个子块**要真切——**worker 对 vector/graph 两腿无条件执行；video 按文件类型分支（`_is_video_path`）、wiki 为库级后置（`_spawn_wiki`/`_maybe_generate_wiki` 带阈值门）、projection 零引用——删文件不够、必须按真实接线拆**。迁移现挂宿主主链（`0011_knowledge` 一次 6 表 + `0012–0019` + `77df30935788`〔Alembic revision id，video_shots 建表〕）。上游侧已备：#5238 scope 契约（`knowledge_scope.py:99`：mode `Literal["all","selected","disabled"]` + `dataset_ids`）、#5551 引用、扩展接缝（`contracts.py`：`install(registry, config)` / `ExtensionService.start(deps)` / `registry.routers` / `ExtensionRuntimeDeps.session_factory`）与表前缀排除（`loader.py` `ExtensionSpec.table_prefix`＋迁移 `_env_filters` 双进程注册＋collision 检查）。

## 1. 现状与缺口（锚点）

| 面 | 源分支（a343b8b03） | 基座（e325c90b2） | 首期缺口 |
| --- | --- | --- | --- |
| 模块 | `backend/packages/harness/deerflow/knowledge/` 70 文件/15,919 行 | 零知识面 | 裁四腿＋eval 7 子块；移出 harness 成可选包 |
| 外围 | routers 2（`knowledge_bases.py`/`rag_config.py`）、services 3（`knowledge_service.py`/`rag_migration.py`/`rag_reembed.py`） | 无 | 挂扩展 router/service 接缝 |
| 工具 | 3：`hybrid_search_tool.py`（留）＋`graph_search_tool.py`/`wiki_search_tool.py`（后置） | 无 | 收至 1 个；`deep_research_middleware.py`（dev 专属）不移植 |
| agent 面 | `agents/assets/rag/SOUL.md`（同目录 `config.yaml` 被 `backend/.gitignore:22` 吞掉、未跟踪；内置资产回落＝`config/agents_config.py`〔目录 `:29`／函数 `:32`／读 config `:336`／读 SOUL `:373`〕——`lead_agent/` 全树无资产回落）＋`tool_config.opt_in`（源 `tools.py:74`）＋`deep_research_middleware.py` | 无 | SOUL 按三路写需裁剪；`config.yaml` 须先放行 gitignore 并补提交（或切片重建）；opt_in 准入与 rag agent 装配随移植 |
| 前端 | 80 文件（含五额外标签页全套、eval 全套、卡片、编辑类） | 无 | 收至五块最小集（RFC §2.2/A4） |
| 表/迁移 | 9 表在宿主 `Base`＋主链（`0011`–`0019`＋video_shots）——未启用也建表 | 宿主链 head `0030`（对基座核实） | 私有 MetaData＋前缀＋独立链（D2/D3） |
| 接线 | 宿主 `app.py:337-364` 直接构造 store/vector_store/worker/service | 扩展机制在位 | `install()`＋service 生命周期＋`plugins:` 条目 |
| 对话绑定 | 自有 `context.kb_id`（fork 不含 #5238） | #5238 契约在位 | 新写 scope→kb 适配（RFC §4.1/§4.2，工作项「上游契约接入与内置库适配」行） |
| 评测 | CLI kernel（`knowledge/eval/` 12 文件） | 无 | 剔 7 后置子块；无云 CI 三件＋材料行（工作项 §8 共 11 条） |
| 随带 | 缺陷批 5 笔（nginx 三处/切库重置/绑定 403）已在源分支 | 无 | 随移植带上 |

## 2. 方案

### 2.1 移植形状（复制 → 核对 → 删）

从 `a343b8b03` 把「首期相关面」复制进 slice worktree（模块、routers/services、工具、agent 面、前端、测试、nginx 三配置、依赖、AGENTS 相关节）——**复制只是起点、主体是删**。复制后做 `comm -23` 漏项核对（源清单 vs 落盘清单，文件级）；**删只在 worktree 副本上做**，主仓与源分支不动。源分支其余 fork 漂移一律不带入。

### 2.2 裁剪清单

- **切**：`graph/`、`wiki/`、`video/`、`projection/`；eval **7 子块**（`synthesis` 出题 / `ragas_eval` judge / `trend` 历史 / `ondemand` 界面触发 / `question_bank` 题库写入 / `anchor_check` 锚定门禁 / `factory` Layer 2 构建——后四者随评测界面后置，调用面已核）；graph/wiki 两工具；SOUL 的三路与深研表述（wiki/graph 升级、深研双模式）；`deep_research_middleware.py`（dev 专属，上游无此文件——不移植）；后置表（`graph_entities`/`graph_relations`/`wiki_entries`/`manual_knowledge`/`video_shots`）；`path_status` 只删 graph/asr/segment 键（字段与 vector/caption 键保留——RFC §5.2 的图片说明与索引结果状态靠它承载，解析态走文档级状态）；卡片 UI/API；五标签页与 eval 前端全套；切片编辑/删除预览/会话导入入口；**留存文件的跨腿引用随裁同步拆解**（captioner 常量、sweep/reindex/dimension_migration、eval runner〔graph/wiki searcher 与配置读点〕、providers `asr` 腿、**工具装配面**（`tools:` 条目＋`opt_in`——非注册面）、视频门面〔`parser.py` 门助手/上传体积门/后缀并集视频半〕、四集合机制面〔`vector_store.py` 实体/wiki/卡片〕、切表 ORM〔`models.py` 五类〕、宿主元数据摘挂〔`persistence/models/__init__.py` 摘 knowledge 导入〕、卡片段与 wiki 读时增强〔`store.py` manual 段＋`knowledge_service.py:271-286/:376+`〕、retry 清腿——逐文件清单见 Task 2）；**配置面收窄**（双层同裁：`rag_config` 视频 ASR 字段/校验/probe 端点；后置腿功能模型行与 thinking 开关——图谱抽取/wiki/judge/synthesis；AppConfig `rag:` 段后置腿字段面——graph 检索旋钮、`entity_merge_similarity`、`extract_concurrency`、`video:` 块；`config.example.yaml` 示例面同步。旧键处置：config.yaml 层随 schema 收窄自然忽略〔`RagConfig` 未设 `extra=forbid`〕，rag_config.json 层走退役名单〔先例 `rag_config_file._drop_retired_keys`〕）。
- **留**：文本与表格本地转换、PDF/Office＋图片解析链（MinerU 客户端）、图片说明（caption）、结构化切分、稠密/稀疏/RRF/重排、retry/ready 与就绪判定、中断恢复（非终态重入队）、清扫轮（孤儿向量/文件/代次）、宽度迁移与重嵌（§2.3 四规则）、管理 API（库/文档/切片只读/原件/重试/删除）、每库对话栏、设置页功能模型＋按库重建、评测 CLI kernel（含 `eval_runs` 基线链，`--baseline auto`/`--mark-baseline` 依赖）＋无云 CI 三件、rag 定制 agent（SOUL 裁版＋config.yaml〔先处置 gitignore〕）与 `opt_in` 工具准入（默认 lead agent 不装配检索工具）。

### 2.3 扩展包装（RFC §6.2 逐条落地）

- **载体**：仓内新包（D1；模块名＝顶层 `deerflow_knowledge`——D8）；**安装按基座既有机制**——`uv add --project … --group extensions --no-workspace`（`manager.py:220-234`）或根 Makefile `extension-install`（`:113-139`），pyproject `extensions = []`（`:59`）＋`[tool.uv] default-groups`（`:91/:93`）；`--all-packages` 三处证据：`docker/dev-entrypoint.sh:145/:155`（其 :12 注释自证设计意图）、`scripts/serve.sh:418/:421`、`manager.py:1110`；entry `install(registry, config)`；service 由宿主在基础设施就绪后 `start(deps)`、在此绑定 `session_factory`；routers 经 `registry.routers` 注册——宿主认证与 CSRF 基线自动适用，资源所有权校验在扩展业务代码；**挂载语义**：确定遮蔽（与宿主路由撞路径）＝原子拒该 router、挂载失败＝fail-open 继续（路由/入口点撞名对基座已双清）。
- **加载**：`plugins:` 一条（operator 控制）；启用/停用/配置变更随宿主重启生效。
- **停用与再启用**：停用或卸载保留数据（永久删除为独立的显式操作）；再启用检查扩展与 `extension-api` 的版本兼容（判据＝同 major.minor、host ≥ declared）并恢复未完成任务。
- **表**：私有 `MetaData`＋统一表前缀（D2）＋独立 Alembic 链与版本表；停用或卸载后保留前缀登记（防宿主迁移误处理；卸载＝条目移除后声明消失、两侧注册不再发生——遗留表与登记的处置进部署说明）。
- **依赖**：qdrant-client 随可选包（tiktoken 为核心既有，不动）；`networkx`/`numpy` 随图与投影腿裁后整删；`python-calamine` 为表格链延迟依赖（不进 lock——声明入扩展包或部署说明安装步骤）；核心 harness 清单逐项 Task 0 核。
- **核心侧改动**：限来源接入、范围映射、引用及前端适配四类（RFC §1）——来源接入含**新增 `tool_config.opt_in` 字段＋`tools.py:147` 装配语义改造**（净新概念），并纳入 base 既有 knowledge 组门（`tools.py:154-159`，受 `knowledge_base.enabled` 控）与 rag agent 内置资产（SOUL 裁版）；**配置面移植**：AppConfig `rag:` 段＋rag_config.json 热重载签名（源 `app_config.py:455`、`rag_config_file.py` 384 行、非测试 `.rag.<字段>` 读点 17〔含 6 后置腿随裁 ⇒ 首期 11〕）、`models_config` 面（masking sentinel／`reverse_lookup_provider`）、`/api/models` 补 `supports_vision`（基座 `routers/models.py:40-49` 现无）、前端 `useModelsConfig` 缺件（源 `core/models/hooks.ts:39`）——由 Task 3/6 适配清单承接；**功能模型接入面**＝三处（`rag_config` 字段引用 `models:` 条目名／`resolve_vlm_target` 运行时解析／设置页 `useModels` picker）随移植保持，源 `models_config` 体系与基座 `managed-models` 的差异列入适配面；**归类**：配置面移植归「来源接入」类（RFC §4.3 的「自管」指参数管理权归扩展、不并入通用开关；读取与设置面经宿主 AppConfig/设置页）；逐项 Task 0 列面。

### 2.4 迁移收窄

扩展链自建（D3＝2 条：业务表 / 评测与支撑表），表名带前缀（D2；`kb_` 对上游宿主表零撞名，已核）；不触碰宿主链、不参与其父级关系；未启用不建任何表。

### 2.5 契约适配（#5238/#5551）

- 消息携带 `knowledge_scope`：mode=`selected`、`dataset_ids` 只含当前绑定库的资源 ID（带可区分 provider 的编码）。**双载体**：主载体＝runtime context 键 `__knowledge_scope_execution`（`knowledge_scope.py:16`）；消息 `additional_kwargs.knowledge_scope` 为候选回落（`knowledge_scope_middleware.py:67-71` 校验：仅 HumanMessage、至多一条，违反即 raise；:74-75 注入 execution scope）。扩展侧工具照 `ragflow/tools.py:532-559` 正典形状读 `execution_scope(canonicalize_knowledge_scope(...))` 落 `kb_id`（落点 D5），`metadata.kb_id` 仅承载选择信息。
- **admission 适配（五条＋旁路）**：上游 `knowledge_scope_admission.py::assistant_supports_knowledge_scope` 逐门——① `assistant_id` 非空；② `knowledge_base.enabled` 开；③ `get_tool_config("knowledge_search").use` 字面等于 RAGFlow 常量；④（非 lead 时）`agent_config` 非 None；⑤ `tool_groups` 为 None 或含 `"knowledge"`；**旁路＝`assistant_id == "lead_agent"` 直 True**。本地 provider 与 rag agent（现为 `[rag]`）逐门处置＝**扩列**：③ 的 `use` 常量接受集扩为「RAGFlow∪本地 provider」、⑤ 的组名接受集加 `"rag"`；rag agent 组名与资产零改（对齐式重命名会波及 gitignored 资产/示例/用例三面，不取）。
- **配套收口（四处）**：`routers/features.py:112/117-124` 的同一 RAGFlow 常量谓词（`services/__init__.py:1867→1898` 恢复同门〔基座 `services.py` 于 Task 2 包化，行号不变〕）；工具名对齐 `knowledge_search`（基座按名生效四处：`knowledge_scope_middleware.py:25/83/90-99`、`tool_output_budget_middleware.py:665`、`sources.py:79`、前端 `core/knowledge/sources.ts:29`）；引用双轨收口（`sources.py:27/31/79`、`task_tool.py:651`、前端 `sources.ts:7/15/69` 的 provider 硬编码/ID 正则）；`document_filters`/`all`/空列表按上游契约收窄（`vector_store.py:332-350` 现仅 kb 过滤）。
- 总开关沿用上游 `knowledge_base` 体系；禁用即停用工具；绑定缺失/库已删除/越权明确报错。
- 来源 artifact 与引用适配：本地 provider 插入所需核心适配含在首期（RFC §4.2）。

### 2.6 前端最小集（D6）

留五块：库管理（含重命名）、文档（上传/列表/状态、失败/降级重试、删除与原件下载）、切片与来源（只读）、每库对话栏（回答模型选择沿用现有交互）、设置界面（功能模型及服务配置〔全站部署级 operator 入口，非 operator 不可改〕＋按库重建）。切库隔离三件套（重置/绑定校验/用例）随移植验证在位。未启用时知识入口不可达、不轮询扩展端点（门控计入核心侧「前端适配」类；RFC §6.2 四项）。**切留引用同步拆**：`chat-panel`/`chunk-drawer`/`middle-tabs` 引用了被切组件（`chat-panel:56/633`、`chunk-drawer:35-36/587`、`middle-tabs:33/310`）；`hooks`/`api`/`types` 含后置客户端（eval/wiki/卡片/投影/召回）需收窄。**设置面挂载（写死）**：功能模型视图挂在上游 `model-settings-page.tsx`（#5596 `8ef58eaa9`）之内（前端适配类），**不复制 dev 的 `models-settings-page.tsx`**（会覆盖 #5596 页并拖入别对漂移件）；operator 门复用该页已有 `canManage`（`system_role === "admin" && !isStaticWebsiteOnly()`）。**e2e 随基座不动**（源独有件属切面、不复制；同名件基座版本更新，整文件复制会回退——同 nginx 类）。**命名面之外集成点（R1 复核补）**：同名件增量改——`core/threads/utils.ts`（KB 线程路由）、`workspace-nav-chat-list.tsx`（知识入口）、agent thread page（kb_id 注入）、`recent-chat-list.tsx`（KB 路由保留面）；dev 独有 activity 线按乙裁——`useRegisterActivity` 两处调用删除、模块不带入。

### 2.7 评测三件与材料

- CLI kernel 保留（剔后置 7 子块，D7；切面见附录 A1——**kernel 收至单工具**：`run_rag_eval.py` 去 GraphStore/WikiStore 构造、`runner` 强制入参/惰性 import 改写、`PATH_ORDER`/golden 收窄 vector，与「只删不改」冲突**显式破例**）；报告新增文字/表格/依赖图片分组轴；候选数量（融合后进入精排的上限）与 `top_k` 一并固定并进报告；报告 meta 扩展（解析/切分版本、嵌入模型及宽度、稀疏方式、重排模型/服务版本）。
- 无云 CI：从固定材料建测试库与向量索引；备料阶段真实跑一遍并保存外部输出 → 按输入指纹与配置版本取用；现场真实执行（切分/索引写入/召回/RRF/重排应用/权限与 scope/来源 artifact/指标计算）；CI 自备 SQL/Qdrant；真栈冒烟单独报告、未执行不计通过。
- 材料行：可分发许可清晰语料＋索引输入指纹＋首份基线（工作项 §8）。

### 2.8 随带修复与文档

nginx 三处上传路由**在基座配置上增量加入**（保留基座既有 skills/projects 上传 location 与 loopback 301——整文件复制会退掉基座新增并弄红其守卫测试）、切库重置、后端绑定 403 随移植带上并留用例；AGENTS/部署说明（安装启停/表前缀/停用卸载与遗留表处置/备份保留期/恢复核对＋组件部署位置与离开环境内容清单/分词缓存与 `python-calamine` 需预置/备份内容与一致时间点；在线清理与历史聊天、历史备份边界、恢复重建耗时与成本、重建排除已删除〔A9/恢复验收〕）随 Task 收尾。

## 3. 决策点（D1–D7 全甲：2026-10-06；D8 甲：10-07）

- **D1 载体落点 = 甲：新包 `backend/packages/knowledge-extension/`**（对齐「依赖随可选包」，与 `packages/` 布局一致）。未选：乙（`backend/app/extensions/knowledge/`）、丙（留 harness 原地收窄）。
- **D2 表前缀 = 甲：`kb_`＋新链按前缀建名。** 未选：乙（`knowledge_`）、丙（原名不声明）。
- **D3 扩展链切分 = 甲：2 条（业务表 / 评测与支撑表）。** 未选：乙（1 条全建）。
- **D4 包内布局 = 甲：原目录原样搬（最小 diff）。** 未选：乙（按 core/legs 重分层）。
- **D5 契约适配落点 = 甲：扩展服务层 adapter（tool 与 API 共用，一处收口）。** 未选：乙（hybrid tool 直读）。
- **D6 前端形态 = 甲：原骨架删减。** 未选：乙（重写轻量页）。
- **D7 评测保留面 = 甲：kernel 剔 synthesis/ragas/trend。**（实测切面扩为 7 子块，以 §2.2 为准）未选：乙（全留）、丙（只留 runner＋metrics）。
- **D8 模块命名与导入 = 甲：顶层 `deerflow_knowledge`＋全量导入重写。**（包内＝原 `knowledge/` 留件原样；routers/services 进包；hybrid 工具、配置面、agent 资产、CLI 留宿主；hybrid 引用改懒）未选：乙（沿用 `deerflow.knowledge` 命名空间——安装/卸载脆弱）、丙（新名＋harness shim——宿主留知识痕迹）。

## 4. 硬约束

- 复制源＝`a343b8b03` 一处；`comm -23` 核对后才动刀；只删不改，不提前重构。（唯一例外：`agents/assets/rag/config.yaml`——被 `backend/.gitignore` 吞掉的未跟踪件、不在 `a343b8b03`；随 `.gitignore` 例外放行、由 Task 1 落盘）
- 不落宿主迁移链；表前缀须过 collision 检查；**未启用零建表、零 worker、零探测、前端入口关闭且不轮询扩展端点**（RFC §6.2 四项）；Qdrant 缺席仍可启动。
- 核心侧改动限四类；复用 `rag.sweep_*` 等既有配置面，不新增运维/部署开关（工具准入 `opt_in` 属移植自带字段，不在其列）；密钥不在读接口/日志/评测产物暴露。
- 后置能力整块移除、不保留半腿；**按真实接线拆**：vector/graph 两腿无条件执行，video 按文件类型分支，wiki 为库级后置（带阈值门），projection 零引用。
- 源分支其余 fork 漂移不带入；扩展声明 `__deerflow_api__` 并对齐宿主兼容窗口。

## 5. 验收

- RFC A1–A12 全过；25 条工作项逐项回填状态列（后加随带组 1 条，随批回填）；`git diff vs e325c90b2` 只含首期面。
- 专项：未启用启动零动作（无表/无 worker/无探测/前端入口不可达）＋ Qdrant 缺席可启动；启用后 15 后缀上传→解析→索引→（对话）检索→引用闭环；切库隔离；无云 CI 完整跑通＋真栈冒烟单独报告；门禁全量零新增（前端按单测口径，`test:e2e` 不在门禁）。

## 6. 非目标

- 图谱/wiki/视频/卡片/切片编辑与重抽/复杂删除影响预览/出题与 LLM 评分与评测历史趋势/可视化与多标签工作区/会话或 agent 记忆导入/每库独立模型配置/局部图片重跑（RFC §10.1 全列；与 §2.2 切单同列）。
- 不改上游其他模块；不做通用扩展框架改造（含动态前端插件系统）；不迁 fork 其余历史差异。
