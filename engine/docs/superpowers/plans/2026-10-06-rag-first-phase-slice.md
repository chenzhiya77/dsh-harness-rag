# RAG 首期切片（裁剪移植到上游基座）—— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-06-rag-first-phase-slice-design.md](../specs/2026-10-06-rag-first-phase-slice-design.md)
**基座：** `E:/app/python/agent/deer-flow-slice`（主仓 worktree）@ `e325c90b2`；**源：** `feat/rag-knowledge-base` @ `a343b8b03`。
**Status:** D1–D7 全甲（2026-10-06）＋D8 全甲（甲，10-07）；**Task 0 ①–⑨ 全核实；Task 1 已落（`cbdaec70c`→`d2b422f2b`）；Task 2 已落（`14ea2f93a`）；Task 3 已落（`e6df6edb8`）；Task 4 已落（`f47f5c618`）；Task 5 已落（`29b43cec2`）；Task 6 已落（`a630a3b3f`）；Task 7 已落（`b45eb9c02`）**；逐 Task 回填实测与提交链。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 载体落点 | ✅ 已裁=甲：新包 `backend/packages/knowledge-extension/` | app/extensions / 留 harness |
| D2 表前缀 | ✅ 已裁=甲：`kb_`＋新链建名 | `knowledge_` / 原名不声明 |
| D3 扩展链切分 | ✅ 已裁=甲：2 条（业务 / 评测与支撑） | 1 条全建 |
| D4 包内布局 | ✅ 已裁=甲：原目录原样搬 | core/legs 重分层 |
| D5 契约适配落点 | ✅ 已裁=甲：服务层 adapter | tool 直读 |
| D6 前端形态 | ✅ 已裁=甲：原骨架删减 | 重写轻量页 |
| D7 评测保留面 | ✅ 已裁=甲：kernel 剔 synthesis/ragas/trend（切面 7 子块，以 §2.2 为准） | 全留 / 只留 runner＋metrics |
| D8 模块命名与导入 | ✅ 已裁=甲（10-07）：顶层 `deerflow_knowledge`＋全量导入重写 | 沿用 `deerflow.knowledge` 命名空间 / shim 转发 |

## 硬约束

- 复制源＝`a343b8b03` 一处；`comm -23` 核对后才动刀；删只在 worktree 副本；不提前重构。（唯一例外：`agents/assets/rag/config.yaml`——被 `backend/.gitignore` 吞掉的未跟踪件、不在 `a343b8b03`；随 `.gitignore` 例外放行、由 Task 1 落盘）
- 不落宿主迁移链；前缀过 collision 检查；未启用零建表/零 worker/零探测/前端入口关闭且不轮询扩展端点；Qdrant 缺席可启动。
- 核心侧改动限四类（来源接入/范围映射/引用/前端适配）；后置能力整块移除，不保留半腿。
- **工作项清单兜底**：每 Task 完成即回 `docs/plans/2026-10-06-rfc-v3-eval-workitems.md` 回填对应行状态列（映射见文末）。

## Task 0 — 落点核实（只读）

- [x] ① 源清点：`git ls-files` 取首期相关面全表（模块/外围/工具/agent 面〔SOUL、config、opt_in、中间件〕/前端/测试/nginx/依赖/AGENTS），逐文件出「留/裁」清单（含删改面行数），存 plan 附录；**定位 `[rag]` tool_groups 真实来源**（内置资产回落 `agents_config.py:29` 读 `agents/assets/rag/config.yaml`——该文件被 `backend/.gitignore:22` 吞掉、未跟踪，须放行并补提交进源分支，或切片重建）；**功能模型接入面清点**——`rag_config_file.py`/`vlm_target.py` 的 `deerflow.config.models_config` 依赖 vs 基座 `managed-models`（`/api/managed-models`，admin GET/PUT）；前端 `useModelsConfig`/`useSaveModelsConfig` 缺口（基座 0 命中；源 `core/models/hooks.ts:39`）——由 Task 3 依赖/适配清单承接。
- [x] ② 上游接缝复核：`ExtensionSpec.table_prefix`＋collision 检查；`install(registry, config)`/`ExtensionService`/`registry.routers`/`ExtensionRuntimeDeps.session_factory`（contracts.py:164/:169；全库无裸名 `RuntimeDeps`）；contributed routers 的 auth/CSRF 基线；`__deerflow_api__` 兼容窗口（已核 `0.2.5`，extension-api `__init__.py:102`）；输出 `kb_` 撞名清单一行（机制：启动即校验、冲突恒中止）。
- [x] ③ 依赖审计：harness `pyproject.toml` 依赖审计（`qdrant-client>=1.19.0` 入包；tiktoken 为核心既有不动；`networkx`/`numpy` 随图与投影腿整删）→ 包内依赖清单＋核心清单删面；**`python-calamine`**（`parser.py:391-393` 延迟 import、不在 lock——表格门默认开启后 .xlsx/.xls 链必需）声明入扩展包或部署说明安装步骤。
- [x] ④ 核心侧四类改动面：来源接入（tool 注册/scope 读点/`opt_in` 改造）、范围映射（scope→kb）、引用（artifact/来源证据）、前端适配（消息携带 scope）逐项落文件行；**worker 逐腿接线**：vector/graph 无条件、video `_is_video_path` 分支（`:491`）、wiki 库级后置（`:440`/`:1078`）、projection 零引用；**持久机制点名**（幂等写入/防重入/重建状态与切换——设计结论照录项，挂此）。
- [x] ⑤ 前端裁留表：src 80（其中 `components/workspace/knowledge/` 54）＋tests 71 文件逐项（留五块/删五标签页/eval 全套/卡片/编辑类〔**保留：库重命名与设置界面编辑**〕）；会话导入入口按文件级清点（`importThreadToKnowledgeBase` 11 处/4 文件，含 tests 6 处）；设置面（functional-models、重建对话框）归属。
- [x] ⑥ 评测面：kernel 读法（`persistence.py`＋`eval_runs`＝CLI 基线链〔`--baseline auto`/`--mark-baseline`〕，留；`trend.py`/`ondemand.py`/评测 UI 端点后置）；分组轴现状（`aggregate_by_category` 现行轴）；现有 rag-eval workflow 与种子库依赖现状。
- [x] ⑦ 迁移合并基线：`0011`–`0019`＋`77df30935788`（video_shots 建表，Alembic revision id、`down_revision=0018_eval_runs_baseline`、0019 挂其后；git 提交 `8c3868f1e`）列级合并成扩展链 2 条的对照表；`0019` 身份列并法。
- [x] ⑧ 工作树环境：自建 venv（按主 venv freeze 对齐，免 PYTHONPATH confound）＋`pnpm install`；记录基线命令。
- [x] ⑨ 文档集落档（开工前置）：**只 add 这 5 个路径**——`docs/superpowers/specs/2026-10-06-rag-first-phase-slice-design.md`／`docs/superpowers/plans/2026-10-06-rag-first-phase-slice.md`／`docs/plans/2026-10-06-rfc-v3-eval-workitems.md`／`docs/plans/2026-09-22-local-knowledge-base-rfc-v3.md`／`docs/plans/2026-10-06-rfc-v3-audit-findings.md`（audit-findings 至今未跟踪）——提交一笔；**v2 两件**（`2026-09-14-…-rfc-v2.md`／`…-review-replies.md`）维持未跟踪、处置另行；**提交那一刻同步刷新审计档头部（现稿 346 行/md5 `5f9eeaab`；其行号引用将整体 +4，或改按节/文字）**；**审计档 E1 复核注同步**（云腿两行已随 `a343b8b03` 入库）——与头部刷新同批。

**实测（2026-10-06，Task 0 · 只读＋环境）**：

- ① 源清点：**见附录 A**（模块 70/15,919＝切 32/6,585＋留 38/9,334；后端测试 107→切 53（＋`test_chunk_delete_api`、graph/ 9）；前端 src 80→切 41；tests 71→切约 32）。两处新发现：(a) **eval 切面由「三子块」扩为 7 子块**（＋ondemand/question_bank/anchor_check/factory——调用面核实 `knowledge_service.py:35/37`、`knowledge_bases.py:28/30`、factory=Layer 2 共用，全属界面/后置侧；`run_rag_eval.py` 另构造 GraphStore/WikiStore〔`:200-203/:225-226`〕，kernel 收窄改写见 Task 7）；(b) `[rag]` tool_groups 来源＝被 gitignore 吞的 `agents/assets/rag/config.yaml`（盘上有：name rag / tool_groups [rag] / temperature 0.1）。
- ② 接缝复核：table_prefix（`loader.py:56`／`_env_filters.py:61`／`env.py:52` 双进程）✓；`contracts.py:164/:169/:214/:217` ✓；`auth.py:41/:56` ✓；`API_VERSION=0.2.5`（`__init__.py:102`）✓；**`kb_` 撞名零**（上游宿主表无 kb 前缀）✓；宿主链 head `0030` ✓。
- ③ 依赖：harness 知识专属＝`qdrant-client>=1.19.0`（:49）＋`networkx`（:50）＋`numpy`（:53，投影用）；tiktoken/markitdown 为核心既有（上游同名在）不动。
- ④ 改动面：来源接入＝`tool_config.opt_in`（:24）＋`tools.py`（dev :74／上游 :147 改造点，:154-159 组门）；范围映射＝`hybrid_search_tool.py:42 resolve_kb_scope` → 目标 execution_scope（`knowledge_scope.py:16`／ragflow 正典 :535）；引用＝`citation_counter.py`＋前端 citations.ts/kb-citation-sources.tsx＋上游 #5551 artifact；前端适配＝KB 对话发送 scope＋scope.ts。worker 逐腿＝vector/graph 无条件、video `_is_video_path`（:491）、wiki 库级（:440/:1078）、projection 零引用。
- ⑤ 前端裁留：见附录 A5/A6（src 80＝切 41/留 39；tests 71＝切约 32；**设置面 9 文件/3,784 行＋6 用例单列于 A5/A6**——命名面之外，登记已回填不再掉）。
- ⑥ 评测面：kernel＝dataset/metrics/persistence/runner（CLI 依赖核实）；`--baseline auto` 读 `eval_runs.is_baseline`（留）；分组轴＝`aggregate_by_category` 现行 fact/concept/global/relation；CI＝rag-eval.yml 对种子库（`vars.RAG_EVAL_KB_ID`）、缺凭据 exit 3。
- ⑦ 迁移：链序 0011→0012→0013→0014→0015→0016→0017→0018→`77df30935788`→0019（0019 down=77df）；列级：0012 `documents.path_status`、0013 `documents.content_hash`、0015 `chunks.last_edited_at`、0019 `knowledge_bases.embedding_identity`（均 `safe_add_column` 幂等式）；0017/0018 `eval_runs`（表＋基线列＋部分唯一索引）；0014/0016/77df 随裁。**合并＝0001 业务三表（0011 三表＋0012/0013/0015/0019 四列内联）、0002 eval_runs（0017＋0018 全量）**。
- ⑧ 环境：slice 树 venv 已建（Python 3.12.13，按主 venv freeze 对齐 **290 包**，exit 0）＋`pnpm install` 完成（pnpm 10.26.2，1m59.6s，node_modules 83 项）。
- F11（判读题）：RFC L98「解析内容」维持原文（可选收口不采纳，避免临发帖改文）。
- ⑨ 落档：✅ 已提交 `f94bab1fc`（5 路径＋632/−11；审计档头部复钉 346 行/md5 `5f9eeaab`、引用按「原 L≥25 者 +4」整体折算、E1 复核注同步；v2 两件维持未跟踪）。

## Task 1 — 复制落盘＋漏项核对

- [x] 从 `a343b8b03` 复制首期相关面进 slice worktree（模块/router/service/工具/前端/测试/依赖/AGENTS 节；前端 e2e 不复制——见 A6；`core/knowledge/` 逐文件合并——基座 4 上游文件〔`index`/`scope-api`/`scope`/`sources.ts`〕保留、comm 只对本批复制件）；**nginx 三配置按增量改**（在基座既有配置上加 knowledge-bases documents location，保留 skills/projects 上传 location 与 loopback 301——整文件复制会退掉基座新增并弄红其守卫测试）。
- [x] `comm -23` 源清单 vs 落盘清单：零漏项；落盘多出即回退；**基座撞名核对**：复制面 ∩ 基座树＝∅（除声明的修改件）——本次揪出并修复 2 处漂移（见实测）。
- [x] 基线留证：以源仓已记录套件结果为底色；slice 内首跑放在装配打通后（Task 2 尾：模块尚在原路径可直接跑；Task 3 搬家后复跑）——基座（e325c90b2）与源 fork 基座不同源，过早跑含漂移噪声。

**实测（2026-10-07）**：复制 **375 文件**（模块 70／外围 11〔routers 2＋services 3＋tools 3＋rag_config_file＋run_rag_eval＋SOUL〕／后端测试 127＋fixtures 1／前端 src 89〔2＋54＋22＋4＋5＋submenu＋import helper〕／前端测试 77〔70＋1＋3＋2＋1〕）＋`config.yaml`（`.gitignore` 加例外放行）＋nginx 三处增量（源块 verbatim、插在 projects 与 browser-stream 之间）；`comm -23` 双向零差（375＝375）。**基座撞名核对揪出并修复 2 处漂移**：`test_gateway_lifespan_shutdown.py`（源版丢基座 542 行新版内容）、`test_monocle_tracing.py`（源版多 2 行 prewarm patch——切片无投影腿、不需要）——恢复基座版（`d2b422f2b`）。全量 `diff vs e325c90b2` 分类＝**374 A＋4 M**（M＝`backend/.gitignore`＋nginx×3），零漂移。提交链：`cbdaec70c`（落盘）→`d2b422f2b`（修复）。A6 一处路径修正：`functional-models-view.dom.test.tsx` 真身位于 `tests/unit/components/workspace/settings/`（非 `tests/unit/settings/`）。

## Task 2 — 后端裁剪（真切链路）

- [x] 按腿拆（vector/graph 无条件执行、video `_is_video_path` 分支（`:491`/`:992` 两调用点）、wiki 库级后置带阈值门、projection 零引用）：切 `graph/`、`wiki/`、`video/`、`projection/` 及对应 worker 段与状态字段（`path_status` 保留字段与 vector/caption 键，只删 graph/asr/segment 键）、删卡片/编辑类方法；表集随之收窄；**删除级联同步拆**（现行 向量→图谱→wiki→业务行→文件 ⇒ 首期 向量→业务行→文件）；**保留 `worker.recover` 中断恢复路径**（非终态重入队不拆）；**留存文件跨腿引用拆解**（captioner 阈值常量迁址〔graph.indexer 依赖〕；sweep 四集合→chunks、`_KINDS` 收窄〔否则 `sweep_generations` stand down，`sweep.py:259-262`〕；reindex 去 entity/wiki/card 三 pass；dimension_migration 去 GraphStore/WikiStore；rag_migration/rag_reembed 签名去 graph/wiki；eval `runner.py` 去 graph/wiki searcher 与配置读点〔见 Task 7〕；`providers/__init__.py` 去 `asr` 腿〔`:169-210` 四字符串引用 `video.asr`〕；**视频门面**：`parser.py` 去门助手 `:106/:140-177`（读 `rag.video.*`）＋后缀并集视频半、`knowledge_service.py` 去上传体积门 `:406-411`、`knowledge_bases.py:203` 串同步；**四集合机制面**：`vector_store.py` 去实体/wiki/卡片面（`_KINDS:65`、Upsert 类 `:102/:117/:132`、集合属性 `:199-208`、方法 `:355-467/:499+`、payload index `:306-308`）；**切表 ORM**：`models.py` 去 5 类（graph_entities `:98`/graph_relations `:113`/wiki_entries `:125`/manual_knowledge `:152`/video_shots `:236`；均指 `__tablename__` 行）；**卡片段与 wiki 读时增强**：`store.py` 去 manual 段 `:437+`＋video_shots 级联 `:240`、`knowledge_service.py` 去 wiki 读时增强 `:271-286`/`_wiki_path_status :376+`；`rag_config.py:415` 六字段遍历收至 default/vlm、worker 构造 `extract_concurrency` 参数随腿去；**宿主元数据摘挂**：`persistence/models/__init__.py:17-25` 摘 knowledge 导入块（七类）＋`__all__` 七条目〔私有 MetaData 隔离——防 `kb_` 前缀对宿主表名判定〕；retry 受理清腿同构拆〔`knowledge_service.py:511-541`、`worker.py:692`〕）；trim 细目含 `app.py:376-383` UMAP prewarm 与 `routers/knowledge_bases.py:34/710-741` vector-projection 端点（含模块级 import）。
- [x] 端点段与配置面裁剪：`knowledge_service.py`（wiki `:622-712/:1812-1865`、video `:290-346/:1285-1330`、recall-test `:1097-1283`、graph/projection `:1331-1462`、切腿 import `:41-58`）、`knowledge_bases.py`（`:28-35/:474-758` wiki/manual/recall/chunk-edit/video/graph 端点）、`rag_config` 视频 ASR（`:52-58/:139/:367-375/:447-455/:1137-1268`）、功能模型行（六字段留 `default_model`/`vlm_model`，切 图谱抽取/wiki/judge/synthesis 四行＋对应 `*_thinking` 开关〔`:138-141`〕；`rag_config_file.py:75/130-135`；保存期 ASR 校验 `:451-456`）；**AppConfig `rag:` 段后置腿字段面**（`app_config.py`：graph 旋钮×11 `:255-267`＋`entity_merge_similarity:268`＋`extract_concurrency:250`＋`video:` 块 `:270`〔类体 `:143-159` 八字段〕＋ASR 两字段 `:246-247`＋模型行/thinking 四组 `:196-197/:199-200/:204-207`（`:198` `default_model` 留、勿整段删）；`config.example.yaml` 示例面同步（graph×11 `:2650-2678`＋`extract_concurrency:2641`＋`entity_merge_similarity:2681`＋`video:`/asr 键 `:2687/:2699`＋注释级模型行与 thinking `:2590-2614`）；**旧键处置**：config.yaml 层随收窄自然忽略〔`RagConfig` 未设 `extra=forbid`〕、rag_config.json 层被切字段进退役名单〔先例 `_drop_retired_keys`；含 asr 四字段 `:111-112/:165-166`〕）。
- [x] 工具收至 1：删 `graph_search_tool.py`/`wiki_search_tool.py`（连带其 `tools:` 条目不移植）；**装配面**（非注册面——`use:` 直解析、不经 `builtins/__init__.py`）：config `tools:` 条目 `{name: knowledge_search, group: rag, use: deerflow.tools.builtins.hybrid_search_tool:hybrid_search, opt_in: true}`（源 `config.example.yaml:697-700` 形状）＋`tool_config.opt_in` 字段＋`tools.py` 过滤语义改造（`:147` → 源 `:74` 形状：groups=None 只加载非 opt_in）；**工具对象名（@tool）随 Task 5 同改 `knowledge_search`**（否则 `tools.py:86-93` name-mismatch 警告＋按名绑定失效）。
- [x] agent 面：SOUL 裁剪（去 wiki/graph 升级与深研句；`agents/assets/` 为新建目录树，`config.yaml` 随 Task 0① 处置后落位）；`deep_research_middleware.py` 不移植（dev 专属）；rag agent 装配与 `opt_in` 准入随移植（**净新**：新增 `tool_config.opt_in` 字段＋上游 `tools.py:147` 装配语义改造；base 既有 knowledge 组门 `:154-159` 一并纳入）；`agents_config.py` 记「**上游文件＋移植内置回落块**」（两树 69 行差异，整文件复制会带 fork 漂移）；源 `config.yaml` description 随 SOUL 同批改（三路→混合检索口径）。
- [x] 配置默认：`rag.table.enabled` 首期默认开启（工作项行）。
- [x] TDD：以源仓基线为准做减法——全量用例跑通数只应因「后置用例被删」下降，其余零新增红。

**实测（2026-10-07，Task 2 · 后端裁剪）**：

- **按腿拆**：切 **94 文件**（graph/ 8＋wiki/ 3＋video/ 10＋projection/ 4＋eval 7 子块＋工具 2＋对应测试〔含 migration 6＋asr probe〕）；留存拆解全落：captioner 阈值常量就地（`DEGRADED_FAILURE_THRESHOLD=0.3`，graph.indexer 依赖解除）、providers 去 asr 腿、sweep 单集合（`_COLLECTION_KEYS=("chunks",)`）、reindex 去三 pass、dimension_migration/rag_migration/rag_reembed 签名去 graph/wiki、vector_store 收 chunks（`_KINDS=("chunks",)`）、models 收四表、store 去 manual 段、worker 向量单腿重写（**`recover` 保留**）、eval/runner `build_default_searchers` 收 `{"vector"}`、knowledge_service 1,873→277、knowledge_bases 962→290、rag_config 1,269→1,134。
- **配置面**：`RagConfig` 移植缩版（32 字段；graph×11/extract_concurrency/entity_merge_similarity/video/ASR×2/四模型行/四 thinking 全去；**`table.enabled` 默认 True**）；`config.example.yaml` rag 段 +106 行（注释示例、门开）；**旧键处置**：`_RETIRED_KEYS` +11 键（四模型＋四 thinking＋asr×2＋video 整块）、`_RETIRED_VIDEO_KEYS` 随删；`models_config.py` 移植缩版（MASKED_API_KEY／PROVIDER_ALLOWLIST 适配〔openai-compatible→`langchain_openai:ChatOpenAI`，与源测试夹具同形〕／resolve_provider_use／reverse_lookup_provider／ModelsConfig.from_file／merge_ui_models）；`app_config.py` 接 models/rag 双文件合并＋`is_ui_managed_model`＋`yaml_rag`＋双热重载签名＋reload 日志三支。
- **工具/agent**：config `tools:` 条目（hybrid_search／group rag／opt_in: true）＋tool_groups 加 rag＋`tool_config.opt_in`＋`tools.py` 过滤语义（groups=None 只加载非 opt_in；base knowledge 组门保留）；**对象名暂 `hybrid_search`（与条目名一致；Task 5 同改 `knowledge_search`——不预改以免 name-mismatch 警告）**；SOUL 裁至单路（1,388→1,338 字节）；`agents_config.py` 移植内置回落块；asset `config.yaml` description 已是混合检索口径（与源逐字节相同——零改）。
- **环境面（Task 1 遗漏补齐，7 项）**：①slice venv 两 editable 原指向主仓（freeze 克隆的 .pth）⇒ 重指 slice 树（extension-api 0.1.0→0.2.5）；②`services.py`→`services/__init__.py` 包化（同名模块与源包布局撞名、**包优先于模块**；基座内容保真、两向导入兼容——spec §2.5 与 A8 引用已同步改指）；③slice 根 `config.yaml` 新建（gitignored；最小件）——无它则解析类用例恒红（主仓有真实件）；④根 `rag_config.json` 新建（gitignored、无真钥）——ark/embedder 用例从环境继承 rag 字段（主仓同款）；⑤`pyproject.toml` 加 `asyncio_mode="auto"`（移植 async 用例依赖；基座显式 mark 不受影响）；⑥`scripts/support_bundle.py` 移植 rag/models 摘要＋脱敏（保留用例 `test_support_bundle_redacts_rag_config` 需要）；⑦nginx 守卫测试 `test_nginx_knowledge_uploads.py` 格式债（源自带、源仓同件亦红）修平。另两处 base 测试随新契约小改：`test_local_bash_tool_loading`/`test_mcp_cache_tool_assembly` 假 ToolConfig 补 `opt_in=False`；`test_input_sanitization_middleware` 守卫豁免表加 `"table"`（chunker 残留 HTML 文档字面量，非框架权威块）。
- **测试改**：107 内 24 改（worker 46→27、api 57→27、smoke×2 各留 1、reindex 21→13、sweep 19→13、models 19→17、wiring 26→9、vlm_target 30→27、provider 26→22、citation 7→4、eval_persistence 44→39、table_eval 2 重接）＋根面改 7（rag_config_api 81→69＋golden fixture 新建〔48 键裁〕、rag_config、rag_config_file、rag_config_example、save_probe；lifespan/monocle 基座原样）；fixture 新建 `tests/fixtures/rag_config/response_golden.json`。
- **TDD 全量首跑**（干净盘）：**127 failed／24,888 passed／864 skipped／14 errors**（32:58；run-1 因 E 盘 pagefile 涨至 42.5G 致盘满作废〔40 处 `disk is full`、197F/210E 留档不用〕、run-2 干净盘（138F/0 disk-full）为中间态、随 11 项修正由本轮取代——重跑前清 basetemp＋落 C 盘）。knowledge 面专跑 **916 passed／8 failed，8 条全为已分类**：probe×4＋`test_embed_missing_api_key`（**源仓同红**——两树操作文件均声明 ambient key/缺 base_url，双向实测）、`test_rag_configuration_error`×3（网关未注册 handler——app 装配属 Task 3）。其余红全为**机器环境类**（uv 构建子进程 SRE mismatch／stripped-env winsock＋GBK 解码／docker 镜像与符号链接特权／readability／pnpm／LangGraph dev server 超时／CRLF 等，均逐簇取证）＋2 条 flake（`test_delta_channel_state` 随机差分、`test_scheduled_goal_handoff` 时序——3× 复跑混合通过）。**零未归因新红**。
- **已知交后续 Task**：`runner._fanout`×`PATH_ORDER` 三路骨架 vs 单路 searcher（CLI 端到端 KeyError；Task 7 按计划收窄）；`test_create_all_and_alembic_upgrade_produce_same_schema`（kb_ 表在宿主 create_all、不在宿主链——Task 3 私有 MetaData 收口）；`create_rag_chat_model` 无调用点（死代码候选，待裁）。
- 提交链：`14ea2f93a`（165 文件，+1,330/−31,673；services 重命名 100% 识别）→ 回填 `f94bab1fc`。

## Task 3 — 扩展包装（install/service/routers/表/加载）

- [x] **搬移＋导入重写（D8=甲）**：模块名＝顶层 `deerflow_knowledge`（分发名 `deerflow-knowledge-extension`、目录 `backend/packages/knowledge-extension/`）；包内 `deerflow_knowledge/`＝原 `knowledge/` 留件（38＋eval 5）内容原样（仅顶层名改）；routers 2＋services 3 进包（包内 `routers/`/`services/`）；入口 `install.py`（`install(registry, config)`＋ExtensionService）。**留宿主**：`tools/builtins/hybrid_search_tool.py`（来源接入类；`deerflow_knowledge.*` 引用改**函数级懒引用**——未装包时宿主注册面可导入）、`config/rag_config_file.py`＋`config/app_config.py`（配置面；宿主与包内双向被引）、agent 资产 `agents/assets/rag/`（宿主新建目录树）、CLI `backend/scripts/run_rag_eval.py`（仅导入重写）。**导入重写**＝机械替换 `deerflow.knowledge` → `deerflow_knowledge`：模块内＋routers/services＋tests＋CLI＋非 py 引用（`config.example.yaml:2617`、`rag_config_file.py:145` 注释；`backend/AGENTS.md:923` 随 Task 8）——源树引用面 168 文件为上限、切件随删不重写。
- [x] 新包骨架（D1/D4）：pyproject（依赖清单；**安装按基座机制**：`uv add --project … --group extensions --no-workspace`〔`manager.py:220-234`〕或根 Makefile `extension-install`〔`:113-139`〕；`extensions = []` `:59`＋`default-groups` `:91/:93`；`--all-packages` 三处：`docker/dev-entrypoint.sh:145/:155`、`scripts/serve.sh:418/:421`、`manager.py:1110`）＋`install(registry, config)`＋`__deerflow_api__`（对齐 `0.2.5` 窗口）；service `start(deps)` 内构造 store/vector_store/worker（原 `app.py:337-364` 逻辑迁入）并绑定 `session_factory`；`stop()` 停 worker。
- [x] routers 经 `registry.routers` 注册（`knowledge_bases.py`/`rag_config.py`，含 admin 门）；CSRF/认证走宿主基线；**挂载语义**（`include_contributed_routers`）：确定遮蔽＝原子拒该 router〔diagnostic〕、挂载失败＝fail-open 继续；路由/入口点撞名对基座已双清（零 `knowledge-bases`/`rag-config`；`plugins:` 示例注释仅 `deerflow_extension_example:install`）。
- [x] 适配清单承接（与 Task 0① 清点对表）：AppConfig `rag:` 段＋rag_config.json 热重载签名、`models_config` 面（masking sentinel／`reverse_lookup_provider`）、`/api/models` 补 `supports_vision`、前端 `useModelsConfig` 缺件（源 `core/models/hooks.ts:39` 附近；基座同名件增量加）。
- [x] 私有 `MetaData`＋表前缀（D2）＋独立 Alembic 链与版本表（配方＝`migrations/AGENTS.md:102-140`：`<prefix>alembic_version` 由 `ExtensionService.start()` 执行＋Postgres advisory lock）；补「首个消费者」测试（版本表名/并发锁/未启用零建表）；`plugins:` 条目样例写进部署说明。（附注：collision 只比对宿主表名，扩展间同前缀仅静默去重——单扩展可不处理。）
- [x] TDD：未启用启动零动作（无表/无 worker/零探测）；启用后服务与路由可达；停用保留数据；**再启用检查扩展与 `extension-api` 版本兼容并恢复未完成任务**（判据＝`_compatible`：pre-1.0 同 major.minor、host ≥ declared、补丁叠加——宿主 `0.2.5` 下声明 `"0.2"`/`"0.2.5"` 均过、`"0.3"` 拒；声明值即 `__deerflow_api__`）。

**实测（2026-10-07，Task 3 · 扩展包装）**：

- **搬移＋导入重写（D8=甲）**：`deerflow/knowledge`（38＋eval 5）→ `backend/packages/knowledge-extension/deerflow_knowledge/`（git 识别重命名 94–100%）；routers 2＋services 3 进包（包内 `routers/`/`services/`）；机械替换 `deerflow.knowledge`→`deerflow_knowledge`＋`app.gateway.{services,routers}.{knowledge_service,rag_migration,rag_reembed,knowledge_bases,rag_config}`→`deerflow_knowledge.*`（**118 文件**，含 tests/CLI/非 py 引用 `config.example.yaml` 注释）；**过匹配回修**：`deerflow.knowledge_scope`（基座另一模块，17 处）被误改已全部回退；hybrid_search_tool 改**函数级懒引用**（＋TYPE_CHECKING 类型＋docstring 去已切工具句——模型可见面不留悬空指令）。
- **新包骨架**：pyproject（`deerflow-knowledge-extension`；deps＝extension-api==0.2.5＋alembic/fastapi/httpx/pydantic/qdrant-client/sqlalchemy[asyncio]/tiktoken；entry point `knowledge = deerflow_knowledge.install:install`）；workspace members ＋`knowledge-extension`；`uv lock` 更新（+qdrant-client 1.19.1/portalocker；`--all-packages` 三处脚本零改即随生效）；editable 装进 slice venv。
- **install/service/routers**：`install.py`（`@extension(api="0.2", name="knowledge")`；`enabled=false` 零注册实测）；`service.py` `KnowledgeExtensionService.start(deps)`＝先跑扩展链→构造 store/vector_store/worker→app 层 KnowledgeService（`session_factory` 缺＝RuntimeError 明确拒）；`stop()` 停 worker 并摘引用（端点回 503）；**routers 工厂化** `build_router(service)` 闭包——模型类必须留模块级（实测：函数内定义 pydantic 模型＋`from __future__ import annotations` ⇒ FastAPI 把 body 当 query、422），rag_config 8 个探针模型类上提；11 个测试文件同步改挂载式（含 `knowledge_extension` 状态 stash）。
- **私有 MetaData＋表前缀（D2）**：`db.py`（私有 `Base`＋`TABLE_PREFIX="kb_"`＋镜像 to_dict/__repr__）；models 换基＋表名 `kb_knowledge_bases`/`kb_documents`/`kb_chunks`/`kb_eval_runs`（**宿主 metadata 零 kb_ 表**实测）；独立链 `migrations/`：`env.py`（`version_table=kb_alembic_version`＋include_object 只认自家表＋pg schema pin＋sqlite busy_timeout）、`runner.py`（`session_factory.kw["bind"]`＋PG advisory lock〔自持 key〕＋`asyncio.to_thread(upgrade)`）、`script.py.mako`、`versions/0001_business_tables`（三表＋0012/0013/0015/0019 四列内联）、`0002_eval_runs`（＋0018 两列与部分唯一索引；索引名保持模型声明 `uq_eval_runs_kb_baseline`）；tmp sqlite 端到端：四表＋版本表＋索引齐、幂等二跑。
- **适配清单承接**：`/api/models` ModelResponse ＋`supports_vision`；**网关 `RagConfigurationError` handler**（`app.py`：懒 import＋ImportError 兜底——未装扩展宿主照常启动；400＋消息保真）⇒ `test_rag_configuration_error` 3 条红转绿；`plugins:` 样例（config.example.yaml 注释条目＋包 README 部署说明：安装/启停/表前缀/停用卸载与遗留表处置/python-calamine 预置/密钥来源）。前端 `useModelsConfig` 归 Task 6。
- **连带修复（跨 Task 尾巴）**：knowledge conftest 的 `session_factory` 补跑扩展链；`run_rag_eval.py` 两处 init 后补链（CLI 自开引擎场景）；eval `_read_runs` 补链；captioner 常量测试改读模块 `__file__`；`test_default_model_isolation` 的 NOT_ROLE_LEGS 改指扩展包根（原 5 参数含已切 `video/asr.py`——Task 2 分类漏项，run-4 抓出）；新测试 `tests/test_knowledge_extension_packaging.py`（7 条：注册/禁用零动作/api 窗口〔0.2 过、0.3 拒〕/未启用零建表/start 迁移＋可达＋停用留数据/二启/无 session_factory 拒）。
- **TDD 搬家后复跑（run-4）**：**129 failed／24,917 passed／840 skipped／14 errors**（46:38）。对 run-3 差分：**修好 5**（schema-drift 红随私有 MetaData 消、configuration_error×3、时序 flake×1）；**新 7**＝`test_default_model_isolation`×5（已当场修，见上）＋2 条时序 flake（`test_extension_task_lifecycle` 复跑过、`test_jina_retries` 浮点时序簇〔1.8e-13 溢出〕）；复跑后隔离文件 15 绿、eval 面 51 绿。残留红＝既分类集合（probe×4＋`test_embed_missing_api_key` 源仓同红；环境类簇不变）。
- 提交链：`e6df6edb8`（125 文件，+2,792/−1,909）→ 回填 `f94bab1fc`。

## Task 4 — 迁移收窄

- [x] 扩展链 2 条（D3）；表名带前缀；未启用不建表、启用即迁移；版本表独立。
- [x] 与宿主链互不干扰实测（宿主 `alembic upgrade` 前后扩展表/前缀登记行为）。

**实测（2026-10-07，Task 4 · 迁移收窄）**：

- **链内容（D3 映射，Task 3 已建、本 Task 列级核）**：`0001_business_tables`＝0011 三表＋**四列内联**（0012 `documents.path_status`／0013 `documents.content_hash`／0015 `chunks.last_edited_at`／0019 `knowledge_bases.embedding_identity`）；`0002_eval_runs`＝0017 表＋**0018 全量**（`is_baseline`/`environment` 两列＋部分唯一索引 `uq_eval_runs_kb_baseline`，索引名保持模型声明）；0014/0016/`77df` 随切不入链。**列级保真链**：revision 逐列取自源迁移文件＋模型（Task 1 拷贝、零列改）⇒ 新测试以**模型为权威**做 `create_all` vs 链 的逐列等价（含 nullable／两个 server_default／部分索引）——三方一致。
- **互不干扰实测**（`tests/test_knowledge_migrations_isolation.py`，4 条）：①create_all 与扩展链产出逐列一致（表集＝四张 kb_、nullable 零漂移、eval_runs 部分唯一索引两路径俱在）；②宿主 bootstrap **复跑**（其 versioned 分支的 upgrade head 路径）后：kb_ 五表（四表＋`kb_alembic_version`）原样、行数原样（1 行存活）、**两本版本账各自为政**（`alembic_version`＝宿主 head、`kb_alembic_version`＝`0002_eval_runs`）；③`kb_` 前缀注册**零撞名**（`register_extension_table_prefix` 不抛）；④注册后宿主 autogenerate 的 `include_object` 对四张 kb_ 表全部 False、对 `runs` 等宿主表仍 True。
- 未启用零建表／启用即迁移／版本表独立 的运行时面由 Task 3 的 `test_knowledge_extension_packaging.py`（7 条）承载；本 Task 补的是**链与宿主链的接缝**。无产品代码改动（纯测试一笔）。
- 提交链：`f47f5c618`（1 文件，+134）→ 回填 `f94bab1fc`。

## Task 5 — 契约适配（#5238/#5551）

- [x] scope→kb adapter（D5）：**双载体**——主载体 runtime context `__knowledge_scope_execution`（`knowledge_scope.py:16`），消息 `additional_kwargs.knowledge_scope` 为候选回落（middleware `:67-71` 校验、`:74-75` 注入）；读 `execution_scope`（mode=`selected`/`dataset_ids`）落 `kb_id`；`metadata.kb_id` 仅选择信息；绑定缺失/库删/越权报错面。
- [x] admission 适配（五条＋旁路）：`knowledge_scope_admission.py::assistant_supports_knowledge_scope` 逐门处置——① `assistant_id` 非空 ② `knowledge_base.enabled` ③ tool config `use` 字面 RAGFlow 常量 ④（非 lead）`agent_config` 非 None ⑤ `tool_groups` 含 `"knowledge"`（rag agent 现为 `[rag]`——**扩列**：③ `use` 常量接受集扩为「RAGFlow∪本地 provider」、⑤ 组名接受集加 `"rag"`；rag agent 组名与资产零改）；旁路＝`lead_agent` 直 True。
- [x] 配套收口四处：`routers/features.py:112/117-124` 同一 RAGFlow 常量谓词（恢复同门 `services/__init__.py:1867→1898`〔基座 `services.py` 于 Task 2 包化，行号不变〕）；工具名对齐 `knowledge_search`（**对象名（@tool）与 `tools:` 条目名同改**；基座按名生效四处：middleware `:25/83/90-99`、budget `:665`、`sources.py:79`、前端 `sources.ts:29`）；引用双轨收口（`sources.py:27/31/79`、`task_tool.py:651`、前端 `sources.ts:7/15/69`）；`document_filters`/`all`/空列表收窄。
- [x] hybrid_search `get_chunks_by_ids` 显式传 `kb_id`（`:63`）。
- [x] 消息携带与前端发送面（含 display 块；本体＝agent thread page `:36/:88-117` kb_id 注入改造）；禁用即停用工具。
- [x] 来源 artifact/引用适配（本地 provider 核心适配）。
- [x] rag agent 装配验证：`opt_in` 准入生效（默认 lead agent 不装配检索工具；rag 组显式请求才装配）。
- [x] TDD：单库范围、越权拒绝、切库隔离、禁用不检索。

**实测（2026-10-07，Task 5 · 契约适配）**：

- **scope→kb adapter（D5=甲，扩展服务层一处收口）**：`deerflow_knowledge/access.py::resolve_kb_scope` 重写为三返回 `(kb_id, user_id, refusal)`——只读 runtime context 键 `__knowledge_scope_execution`（`execution_scope(canonicalize_knowledge_scope(...))` 正典形状）；mode 分派：`selected` 单库→解 provider-qualified dataset id；`disabled`→停用拒；`all`/无 scope→无绑定指引；非法→Invalid 拒；**多库/外来 provider/带 document_filters 逐类明确拒**（一期检索仅 kb 过滤，收下过滤＝静默放大⇒拒；空列表由上游 canonicalize 直接拒）。库删与越权分面：新增 `KB_MISSING_MESSAGE`（get_kb 空）vs 既有 `ACCESS_DENIED_MESSAGE`（owner 不符）。`metadata.kb_id` 仅前端选择信息（建线程写点），服务端读取面＝绑定校验一处。
- **资源 ID 编码（共享契约）**：`deerflow/knowledge_scope.py` ＋`LOCAL_DATASET_ID_PREFIX="local:"`＋`local_dataset_id()`/`parse_local_dataset_id()`/`local_dataset_ids()`——kb_id（uuid4().hex）与 RAGFlow 32-hex 同形、必须 provider 限定（RFC §4.1「具体编码与共享契约一起确定」落此）；前端 `core/knowledge/scope.ts` 同镜像。
- **admission 扩列（③⑤）**：`LOCAL_KNOWLEDGE_SEARCH_PROVIDER="deerflow.tools.builtins.hybrid_search_tool:knowledge_search"`＋`KNOWLEDGE_SEARCH_PROVIDERS`（RAGFlow∪本地）接受集；⑤ 组名接受集加 `"rag"`；`routers/features.py` 谓词同换接受集（同门对齐）；rag agent 组名/资产零改；旁路不动。LightRAG 不在接受集（其工具不读 scope，fail closed）。
- **工具名对齐**：@tool 对象 `hybrid_search`→`knowledge_search`＋`tools:` 条目名/use 同笔改（否则 tools.py name-mismatch 警告＋按名绑定失效）＋SOUL 单处引用；**基座按名生效四处实测全部自然生效**（middleware 禁用处 `:25/83/90-99`、budget `:665`、`sources.py:79`、前端 `sources.ts:29`——名集本就含 `knowledge_search`）；fork 侧按名点连带：前端 `citations.ts` RETRIEVAL_TOOLS＋键映射、两测试文件 20 处夹具名。
- **引用双轨收口（实测三处改、两处无需改）**：`sources.py:31` provider 硬编码→`{ragflow, local}` 集；前端 `sources.ts` provider 联合＋校验集（＋新增 local 接受/未知拒绝用例）；**ID 正则（sources.py:27／前端 sources.ts:15）零改**——本地源 id 沿用 `<uuid4().hex>-<n>` provider-无关形状；**task_tool.py:651 零改**——`cited_source_artifact` 以 `](#knowledge-…)` 链接引用为准，marks 方言不产链接⇒一期子代理不转发本地来源（与源仓现状一致，登记边界）。
- **来源 artifact（本地 provider 核心适配）**：工具改 `response_format="content_and_artifact"`——content 保持源仓 JSON（results/message/citation_no，前端 marks 轨零改），artifact 新增 `knowledge_sources` v1：每切片一条（id `<call-uuid>-<n>`、provider `local`、dataset_id=kb_id、document_id 取行内 doc_id、chunk_id、dataset_name=库名、document_name/text/pages/truncated）；模型可见面零新增字段；`get_chunks_by_ids` 显式传 kb_id。
- **前端发送面**：chat-panel 每次发送（含 human-input 回填）带 `additional_kwargs.knowledge_scope`＝`selected`＋`local:<kb.id>`＋display 块（context.kb_id 保留为建线程 metadata 写点）；agent thread page「KB 线程注入」改 scope 形态（thread metadata.kb_id→快照，不经选择器门控，KB 名取 `useKnowledgeBases(enabled)` 缓存列表）；`buildThreadCreatedMetadata`（utils/hooks）随带恢复——`metadata.kb_id` 由 onCreated 写回；禁用即停用工具（middleware 按名，基座用例覆盖）。
- **切库隔离 403（缺陷批 D2=甲/D3=甲 的 scope 形态）**：`services/__init__.py::_validate_local_kb_binding`——scope 含内置库 id 且线程有绑定且 ≠ [bound]（含多库＝扩大）⇒ 403「对话与知识库绑定不一致」；无绑定/无此行/无 scope 不拦（「不检索」维持）。
- **TDD（run-5b 全量＋定向）**：**121 failed／24,940 passed／840 skipped／14 errors（37:43）**；红集**逐条分类零未归因、零触及本 Task 改动面**（唯一 knowledge 红＝既有源仓同红 `test_indexer::test_embed_missing_api_key`）：uv 簇 33（extension_manager 31／dependency_sync 1〔CPython 3.14.3〕／uv_extras 1）、readability/web_fetch 22、Windows 子进程+控制台 15（deploy_dotenv 7／client_live 4／gateway_startup 2／file_outline 1／doctor 1）、沙箱 tmp 11（setup_sandbox 8／mounts 2／timeout 1）、docker 10（dev_entrypoint 7／docker_sandbox 3）、CRLF/文本模式 7（read_file 系）、GBK 默认编码 5（thread_id 1／mcp_client_config 1／delta_channel 1／parallel_mcp 2）、Windows 权限/symlink 4（channel_file 3／view_image 1）、pnpm 2、路径分隔符 1（detect_blocking_io）、非便携名 1（skill_storage）、studio/channels 2F+14E、源仓同红 5（probe×4＋embed_missing）、时序 flake 1（scheduled_goal 同刻时间戳）；**本 Task 修 2**（`test_tool_deduplication`／`test_plugin_tools` 假配置补 opt_in=False——Task 2 家族漏网，复跑 16/16 绿）。对 run-4（129F）净差 −8＝本修 2＋环境簇跑间漂移（同树 run-5 123F vs run-5b 121F 即 ±2 非确定；web_fetch/uv 簇带网依赖）。
- **顺带修复**：eval kernel `build_default_searchers` 仍用旧载体＋dict 返回（随 adapter/元组改造同笔修，160 条 eval 用例复绿）；**Task 1 拷贝漏件** `frontend/src/components/ai-elements/model-selector.tsx`（fork 自其基座 #5441、Task 1 只拷 fork 相对其分叉点的改动⇒漏；chat-panel 依赖，补拷）；slice `.gitignore` 补 `rag_config.json`（主仓分支 :38 已有）。
- 前端面：`pnpm check` 现态＝**346 条诊断全属 Task 6 边界**（i18n 键未摘／`pathOfKnowledgeThread`／activity-context 未拷等，HEAD 同样红）；本 Task 触及件零新增诊断（tsc/eslint 实测）；citations/sources 测试 37 绿，chat-panel.dom 红待 Task 6 i18n 键（HEAD 同红）。
- 提交链：`29b43cec2`（32 文件，+939/−135）→ 回填 `f94bab1fc`。

## Task 6 — 前端最小集

- [x] 按 Task 0⑤ 裁留表执行：删五标签页/eval 全套/卡片/编辑类（**保留：库重命名与设置界面编辑**）/会话导入入口（两处 UI 入口 `export-trigger`/`recent-chat-list`，连带 helper 与用例——全量按文件级清点，`importThreadToKnowledgeBase` 11 处/4 文件；`recent-chat-list` 的 KB 线程路由保留面随删同批保留）；保留五块（库管理/文档〔含删除与原件下载〕/切片只读/对话栏〔回答模型选择沿用现有交互〕/设置〔功能模型及服务配置＝全站部署级 operator 入口〕）；**切留引用同步**（`chat-panel:56/633`、`chunk-drawer:35-36/587`、`middle-tabs:33/310` 引用被切组件；`hooks`/`api`/`types` 含后置客户端需收窄；**命名面之外增量**：`workspace-nav-chat-list.tsx:80-85`（知识 nav 入口）、`core/threads/utils.ts`（KB 线程路由）；**漂移删调用（乙）**：`chat-panel.tsx:50`＋thread page `:47` 删 `useRegisterActivity`）；**设置面切腿**：`functional-models-view.tsx` 的 ASR 三组四值＋探针（`ASR_PROVIDER_GROUPS:123`、`useProbeAsrService:83`、`asrProbeBlocksSave:49`、`shouldProbeAsr:74`）与四行功能模型行（图谱抽取/wiki/judge/synthesis——视图侧 `:1413/:1440/:1470/:1494`、四 thinking 开关 `:931-934`；:464 注释自证）同批裁；`core/rag/config-form.ts` 的 `RagVideoValues:9`、四组模型键（`extract_model:37`/`judge_model:38`/`wiki_model:40`/`synthesis_model:41`）与四 thinking 键（`:44`/`:45`/`:46`/`:47`）及键表 :189/:190/:221 同批裁——两侧对称（防视图残留行引用已删键出 TS 红、防保存期 422/静默丢字段），与 Task 2 后端 ASR/probe/功能模型行裁面对齐。
- [x] 未启用门控：知识入口不可达、不轮询扩展端点（核心侧「前端适配」类；RFC §6.2 四项之四）。
- [x] 设置面挂载（写死）：上游 `model-settings-page.tsx` 内挂 `FunctionalModelsView`（**不复制 dev 页**；operator 门复用 `canManage` :36）；i18n 按键摘取（`core/i18n/locales/` 三文件不整复制）。
- [x] 切库隔离三件套复验（重置/绑定校验/用例）；重建入口与进度保留。
- [x] **随带两处 10-07 UI 修**（复制源例外：两笔在 `a343b8b03` 之后，随移植带上并留档）：① `fa48e0740`：`ui/resizable.tsx` 手柄加 `focus-visible:z-30`（焦点环不被 sticky 表头/全幅底衬盖住——文档表在保留面，eval/wiki 半已切）＋新件 `tests/unit/components/ui/resizable.dom.test.tsx`；② `96e11a64a`：`knowledge/middle-tabs.tsx` 库头行 `py-3`→`h-12`＋`data-testid="knowledge-middle-header"`（与会话栏头部底线同排）＋`middle-tabs.dom.test.tsx` 同步（该用例现挂在评测 tab describe 内——切 tab 时保留/移位）。两处 diff 与 slice 现状上下文逐字吻合、可直接套用。
- [x] `pnpm check`＋前端用例（裁剪后基线为准；单测口径——`pnpm test`，`test:e2e` 不在门禁）。

**实测（2026-10-07，Task 6 · 前端最小集）**：

- **裁件（138 文件 = 77 删＋57 改＋4 新，+2711/−34615）**：五标签页组件树整删（wiki 5／eval 16／graph 3／vectors 2／recall 2）＋manual 卡 2＋编辑类 4（drawer-editor／use-anchor-confirm／anchor-block-notice／delete-preview-dialog）＋chunk-tick-rail＋drawer-icon＋scrollable-textarea＋会话导入（`knowledge-base-import-submenu`＋`import-to-knowledge-base`）＋core 四件（card-drawers／eval-run-status／synthesis-status／wiki-status）；连带测试 34 个整删。`middle-tabs` 重写为单「文档」tab（h-12 头部＋`knowledge-middle-header` testid 承接 96e11a64a）；`chat-panel` 收窄 props 为 `{kb, requestedThreadId}`（切库重置＋深链位序用例过）；`chunk-drawer`/`chunk-card`/`kb-citation-sources`/`citations.ts` 读侧重写（chunk-only，`knowledge_search` 单工具解析，wiki/manual 分支全去）；`hooks`/`api`/`types`/`path-status`/`document-stats` 收窄（`path_status` 只余 vector/caption；api 只余保留面）。**api.ts 重写曾引入两处 URL 回归**（`files?ref=` 与 `/file` 端点），对照 HEAD 修回（`files/${逐段 encodeURIComponent}` 与 `/source`）——chunk-image.dom 2 红当场转绿。
- **切留引用同步**：`renderMessageContent`/`renderMessageFooter` 双 seam（message-list／message-list-item 新增）；`markdown-content` 补 StreamingTable＋`controls={{table:{fullscreen:false}}}`；`scroll-area`（viewportRef／horizontal／max-h-inherit）、`tooltip`（contentClassName）、`checkbox`／`context-menu`／`input-autofill` 随件拷入（radix checkbox/context-menu 两依赖入 package.json＋lock）；`pathOfKnowledgeThread`＋`pathOfThread` kb 分支、`recent-chat-list` KB 线程排除、侧栏知识入口（旗门控）；`useRegisterActivity` 全清（0 引用）。
- **设置面切腿＋挂载**：`functional-models-view.tsx` 1998→1681 行（裁 ASR 三组四值/探针、四行功能模型行、四 thinking 开关；改读上游 `loadManagedModels` 共享查询 key `["managed-models", user.id]`＋`useAuth`）；`model-settings-page.tsx` 内挂 `FunctionalModelsView`（canManage 分支内，不复制 dev 页）；`core/rag/{config-form,types,hooks,api}` 两侧对称裁（四模型键＋四 thinking 键＋`RagVideoValues` 全清，键表同步）；i18n 按键摘取落三文件（knowledge 54 键＋settings.models 33＋functionalModels 112，含切片事实修正：defaultModelHint 只余图片配文、reindex 文案只余切片向量）。
- **未启用门控（RFC §6.2 四项之四）**：后端 `features.py` `KnowledgeBaseFeature` 加 `enabled`（`getattr(config.knowledge_base, "enabled", False)`）；前端 `fetchKnowledgeBaseFeature`／`useKnowledgeBaseEnabled` 返回 `{enabled, scopeSelectionEnabled}`；知识页三查询全旗门控（`useKnowledgeBases(enabled)`／`useDocuments(enabled ? kb : null)`／`useSupportedFormats(enabled)`）＋禁用早退页（`knowledge-page-disabled`＋`disabledHint`）；侧栏入口旗门控；**新增门控用例**：useKnowledgeBases(false)／useSupportedFormats(false) 零 fetch＋features 读值 enabled 两态。
- **随带两处 10-07 UI 修**：`resizable.tsx` 手柄 `focus-visible:z-30`＋新件 `resizable.dom.test.tsx`（fa48e0740 逐字套用）；`middle-tabs.tsx` `py-3`→`h-12`＋testid＋用例（96e11a64a；原挂评测 tab describe 的用例随 tab 裁掉后以新 describe 承接）。
- **切库隔离三件套复验**：重置（切库即新对话）、绑定（context agent_name+kb_id＋scope 快照 `local:<id>`）、深链位序（先重置后选中）三用例全绿；重建入口与进度保留（行内计数=chunks_indexed 单类，四类合计用例改写为切片单类）。
- **门禁与用例**：`pnpm check`＝eslint（`. --ext .ts,.tsx` 零输出）＋`tsc --noEmit`（零诊断）；前端全量 **304 文件／2892 用例全绿**（唯一文件级标记＝`sidecar-delete-gating` happy-dom teardown flake，单跑 3/3 绿——既有环境类，非回归）；后端 `test_features_router.py` 14/14。测试口径修正：`document-panel` 九宫格去 media 格（切片不收 .mp4）、路径悬停改 vector+caption 两腿、批量菜单去联合出题、rebuild 计数单类、config-form 两处夹具键换 vlm。
- 提交链：`a630a3b3f`（138 文件，+2711/−34615）→ 回填 `f94bab1fc`。

## Task 7 — 评测三件＋材料行

- [x] CLI kernel 保留（D7 剔后置 7 子块——切面见附录 A1）；**kernel 收至单工具**：`run_rag_eval.py` 去 GraphStore/WikiStore 构造（`:200-203/:225-226`）、`eval/runner.py` 去 graph/wiki 必填入参与 searcher（`:343-348` 必填入参、`:373-404` graph_fn/wiki_fn、配置读点 `:375/:386-395`）、惰性 import 改写（`:361-365`）、`metrics.PATH_ORDER` 收窄 vector、golden 重标（12/20 题含 graph/wiki）——**显式破例「只删不改」**；`run_ragas_eval.py`（Layer 2 CLI）随切；报告分组轴（文字/表格/依赖图片）；候选数量与 `top_k` 一并固定并进报告；报告 meta 扩展（解析/切分版本、嵌入模型及宽度、稀疏方式、重排模型/服务版本）。
- [x] 稳定来源/切片标识：`doc_id=uuid4`（`knowledge_service.py:398`）→ 确定性 doc_id 或备料记录 id 映射；分组轴改 `dataset.py` schema（`:17/:30/:93` 枚举即报错）＋重标。
- [x] 无云 CI 交付物新建：workflow＋SQL/Qdrant＋config fixture＋回放客户端；现有 rag-eval.yml 切片后失效、去留定（删或重写）。
- [x] 无云 CI：从固定材料建测试库与向量索引；备料保存外部输出＋按指纹取用；现场真实执行（切分/索引写入/召回/RRF/重排应用/权限与 scope/来源 artifact/指标计算）；CI 自备 SQL/Qdrant；缺凭据不 skip 当通过。
- [x] 真栈冒烟：固定组合单独报告；材料行（可分发语料＋索引输入指纹＋首份基线）。
- [x] 门禁：CI 完整跑通留证。

**实测（2026-10-08，Task 7 · 评测三件＋材料行）**：

- **kernel 收至单工具（显式破例）**：`eval/runner.py` 去 graph/wiki searcher、必填入参与配置读点、惰性 import 改写；`build_default_searchers` 单路收口并硬传 `candidate_limit=DEFAULT_CANDIDATE_LIMIT(20)`；`metrics.PATH_ORDER`＝`("vector",)`；`dataset` 分组轴＝`("text","table","image")`（枚举即报错，golden 全量重标）；`run_rag_eval.py` 去 GraphStore/WikiStore 构造，新增 `--candidate-limit`（默认 20 并进报告）＋**配置感知凭据门**（循环端点 `127.0.0.1/localhost/::1` 免凭据；rag 配置不可读时保守要求；缺凭据仍显式 skip＝exit 3，不伪绿）；报告 meta 八键（parse_provider/parse_tier/chunker/embedding_model/embedding_dimension/embedding_sparse_source/rerank_model/rerank_provider）＋`top_k/candidate_limit/题目数` 进汇总头。
- **稳定来源/切片标识**：`doc_id=sha256(relpath+b"\0"+content)[:32]`；`upload_document` 增可选 `doc_id`（缺省 uuid4 不变）；fixture kb＝`e8ef9a58b07245c3a27ff6e2a64452ea`。**实测**：真栈冒烟独立重建的 `chunks.jsonl` 与 CI fixture 逐字节相同（8 文档 24 切片）⇒ chunk_id 锚定跨运行稳定。
- **无云 CI 交付物**：`rag-eval-nocloud.yml`（PR 路径触发＋workflow_dispatch；自备 Qdrant v1.19.0:6333 与 sqlite；uv 钉 0.11.1＝Dockerfile 同版——`test_ci_uv_version_pin.py` 5/5；非零即 fail、skip 不算通过）；回放三件＝`tests/rag_eval_ci/replay.py`（语义键：embed=(kind,model,texts)／rerank 不含 documents／caption=(kind,model,prompt,image_sha,max_tokens)；材料指纹＝文件 sha＋chunker 常量；rerank 响应按文本重映射＋重叠 <0.8 响亮拒；`round_floats` 1e-6）＋`capture.py`（进程内 `httpx.AsyncClient.send` 观察器，存 key/digest/response——零头部零凭据）＋`scripts/rag_eval_replay_server.py`（三方言；miss/漂移＝500 明拒）；备料 `rag_eval_record.py`＋`rag_eval_ci_seed.py`。**rag-eval.yml 去留定**：源仓有（a343b8b03）／切片基座无（e325c90b2）——触发路径指向移植前布局且依赖云凭据与预置 KB，与「无云 CI」矛盾 ⇒ 不带入，以本 workflow 替代（非重写）。
- **无云 CI 实执行（本地全序列）**：replay healthz `{ok,57}` → seed kb `e8ef9a58…`（8 文档全 ready）→ baseline 门控 eval：overall 24｜1.000｜1.000｜0.979｜1.000；text/table/image 三组齐（image MRR 0.750）；`diff: ok` → exit 0。录制：57 条、gz 2.09MB、指纹 `b433ff21…`；真栈录制 3 遍、回放 0 miss（rerank 平局成员抖动＝17/18 一例，经「键不含 documents＋文本重映射＋0.8 下限」收口）。**判据**：CLI 以 replay 假键离线跑通＝凭据零参与。
- **真栈冒烟（A12 单独报告）**：组合＝`qwen3.7-text-embedding-flash`/1024/provider＋`qwen3.7-text-rerank`＋caption `qwen3.7-flash`/1024tok/0.15/非思考；真实服务全链、无回放；隔离存储（scratch sqlite＋Qdrant :6399）；结果与基线同值；产物 `ci/smoke/{report.json,report.md,manifest.json}`（`executed=true`、`eval_exit_code=0`、材料指纹与 CI 同件——「未执行不计通过」以字段留痕）。
- **材料行**：语料 `tests/fixtures/rag_eval/materials/`（8 件＋README 许可声明〔MIT 自著〕＋`make_xlsx.py`）；索引输入指纹 `ci/manifest.json`（`b433ff21…`，回放服务启动即校验）；首份基线 `ci/baseline.json`（24 题全指标；golden 锚全量对照 chunks.jsonl 复核）。
- **门禁**：tests/knowledge **751 passed／2 skipped／1 failed**——唯一红 `test_indexer::test_embed_missing_api_key`＝环境条件红（机器本地 gitignored slice 根 `rag_config.json` 供 key ⇒「缺 key」前提翻转；A/B：`DEER_FLOW_RAG_CONFIG_PATH` 指无 key 副本即绿；任务前已红——Task 5 已录、mtime 早于 Task 7、本 Task 改动不触嵌入键路径）；eval 套件 **184 全绿**（含新增 replay 19）；`test_ci_uv_version_pin.py` 5/5；ruff check/format 全净。GitHub 侧 workflow 实跑留待 fork/PR（fork 未建，Task 8 前置）。**〔勘误补注（2026-10-08）〕**：「ruff check/format 全净」仅对当次所跑定向面成立——整树口径下当刻已红＝`test_gateway_services.py`（T5 `29b43cec2` 追加块；`ruff format --check` 整树即告警），`make_samples.py` 系其后 T8-B `9bb4ea9cb` 入树新增 ⇒ 实况＝check 2 错／format 2 件（修复与全部取证见 T8 实测追记）。
- 提交链：`b45eb9c02`（42 文件，+4993/−360）→ 回填 `f94bab1fc`。

## Task 8 — 真栈验收＋门禁＋文档收尾

- [x] 真栈：新环境安装启用→建库→15 后缀上传→检索→引用核验；未启用相（含前端入口不可达）/Qdrant 缺席启动/**中断恢复相（处理中断后重启续跑）**三相。**环境**＝slice 树＋venv（T0⑧ 已备）；**隔离实例**：`DEER_FLOW_*` 指向仓外 scratch 根、独立端口——与常驻开发栈（:8001/:3000/:2026）互不干扰；开工时钉死端口与数据根并记录。
- [x] 验收点名补全：A3（VLM 故障→恢复→重试图片完整）/A4（浏览器相＋operator 拒绝）/A5（非 operator＋宽度切换期旧索引＋密钥）/A7（预算裁剪＋自造来源）/A9（Qdrant 故障访问阻断）/A2 负例/A10/A11＋**A1（L124 真栈）/A6（切库隔离复验·Task 5/6）/A8（重试·移植用例）/A12（评测·Task 7）**——多数由移植的源测试承载，点名单列。
- [x] 验收材料钉死：15 后缀样例材料随备料一并钉（可分发；与 A2 对应——来源与语料包同批定）；A4/A5 非 operator 相＝临时造非 admin 账号（`system_role=user`，验收后清理）。
- [x] 恢复验收相：先备份→删除→恢复旧备份，核对权限/查询与引用/未完成处理三项。
- [x] 全量门禁（后端＋前端单测；`test:e2e` 不在门禁）与源基线对比零新增红。
- [x] 文档：AGENTS/部署说明（安装启停/表前缀/停用卸载与遗留表及前缀登记处置/备份保留期/恢复核对＋组件部署位置与离开环境内容清单/分词缓存与 `python-calamine` 需预置/备份内容与一致时间点；在线清理与历史聊天、历史备份边界、恢复重建耗时与成本说明、重建排除已删除〔A9/恢复验收〕）/README 相关节；spec/plan 状态行与实测回填。
- [x] 提交链回填；工作项 25 条状态列核对（后加随带组 1 条 → 26，见并入表）。
- [x] PR 面：分支名定死 `slice/knowledge-local-vector-retrieval`（开工前在 worktree 改名，零提交——**前置已核：与 upstream/main 平齐、0 领先，可直接执行**）；fork 未建需先建（2026-10-06 实查：`chenzhiya77/deer-flow` 不存在、DeepDuck `isFork:false`；本地 origin=DeepDuck 已推源分支，新 fork 建后 push 落点写一行）；PR 用 `Refs #5391`（不用 `Fixes`，发布前网络核实一次）。

**实测（2026-10-08，Task 8 · 真栈验收＋门禁＋文档收尾）**：

- **隔离实例（钉死）**：gateway `:8101`（slice venv）／frontend `:3100`／Qdrant 容器 `rag-eval-ci-qdrant` `:6399`；数据根 `E:/app-model/deer-flow-scratch/acceptance-8`（`home/`／`db/`／`logs/gateway-N.log`／`backup-T0/`）；与常驻 :8001/:3000/:2026 互不干扰；逐窗证据 `acceptance-8/acceptance-evidence.md`（W1–W17，含每步日志行与计数）。
- **真栈四相**：①启用相＝W1 15 后缀矩阵（各自标记入片、xlsx 内嵌图 `IMG-8841` 经 caption 入片）＋W2 检索引用核验（引用 chip＋参考来源卡含标记原文）＋W4 A2 负例（bin 客户端拦截无 POST／corrupt.pdf 失败可见可重试／empty.txt 400 空文件提示）＋W6 删除 UI／下载原文 200／重建索引 UI 全链（对话框＋轮询＋「上次重建已完成」）；②未启用相＝W14（双开关：`Extensions loaded: 0/1`、零 worker／零探测、`features` 关、入口不可达、零扩展轮询、数据保留、普通聊天不受影响、再启用全恢复）＋W17（全新数据根「零建表」实测：无 `kb_*` 表）；③Qdrant 缺席相＝W13（启动完成＋worker 明报 `until Qdrant is reachable`；上传 202 后按篇可见失败；Qdrant 恢复→重试→ready 同 doc id）；④中断恢复相＝W3（杀进程→stuck 241 片→重启 re-enqueue 续跑→241/241、零重复）＋W15（备份时非终态 big2 重启后续跑完成）。
- **恢复验收相（RFC §6.3 三件）**：备份 T0（含非终态 big2）→删除 qabs→恢复旧备份（qabs 如期带回＝「恢复带回删除后内容」）→重启续跑→重建 42 次嵌入调用（19 文档/265 片；批＝Σ⌈chunks/10⌉，实例模型 `qwen3.7-text-embedding-flash` 不在封顶表⇒安全批 10）——**权限**（user2 仅见自有库；kbA detail/documents/chunks/source/rag_config 403）／**查询与引用**（「哪份文件包含 QABS-9417？」→引用 1 `qabs-probe.txt`＋正文转述）／**未完成处理**（big2 续跑至 ready）三项全过。边界复执行：operator 再删 qabs（204；chunks/source 404；点 265→264 即时回收）；删后两次重建（41 调用/次）**均不含已删文档**（264/0）＝「重建排除已删除」。备份/恢复步骤与成本口径落扩展 README。
- **检索行为观察（非缺陷）**：全标记中文问句在对抗语料（16 文档共享 `ACCEPT8-<KIND>-####` 族＋big2 241 标记节）下低于两路各 20 候选截断；fresh-vs-stored 向量 cos=1.000000、参数与源 fork 一致（candidate_limit=20/top_k=5）⇒机制无误；短标记 `QABS-9417` 命中 fused rank 2→重排→引用。记入验收证据，不改码。
- **门禁（零新增红）**：后端全量 **89F／2E／24780P／833S（42:02）** vs 基线 run-4 129F/14E——新集 3 条**零归属切片**（`test_env_file` 假红＝门禁壳 `PYTHONUTF8=1` 令父进程按 UTF-8 读子进程 GBK 破折号字节爆读线程；默认壳复跑 1 passed；另两条孤立重跑通过）；知识面唯一红 `test_embed_missing_api_key` 两侧同在（缺 key 环境对）；56 条基线红未复现（带内漂移）。前端全量 **304 文件／2895 用例全绿**（4m36s；＋本次 chunk-drawer 3 条）。
- **文档（slice 树）**：README 新节「Local Knowledge Base (built-in)」（惰性启用/owner 作用域/15 后缀/混合检索与引用/重试与重建/无云 CI/首期边界）；backend AGENTS 新增「Local Knowledge Base (Knowledge Extension)」＋frontend AGENTS 新增「Local knowledge base UI」；扩展 README 补：双开关端到端停用、备份与恢复（内容/一致时间点与哈希核对/恢复核对三件/RFC §6.3 边界/重建排除已删除）、重建成本、部署位置与出域清单、分词缓存（tiktoken）预置与 `python-calamine`、host-bash 沙箱姿态（上游守卫）。
- **随带缺陷修复**：chunk-drawer 单请求 300 > 服务端 `le=200` ⇒ 422 假空态——改为分页取窗（200/页）＋`loadFailed` 显式态＋3 用例（源分支同缺陷 `f94bab1fc`）。
- **验收材料**：15 后缀生成器入 slice 树 `backend/tests/fixtures/knowledge_acceptance/`（新格式直写＋旧二进制经 `convert_legacy.ps1`；README 记标记表）；非 operator 账号临时造删（`user2@acceptance.dev`，验收末已清理）；doc-tools 随带批次验收材料＝`acceptance-t6/docs/` 五件自著可分发语料（测试10／鹦鹉提示词／部署手册／旅行清单／长文样章）——见下补充相。
- **A1–A12 载体点名**：A1＝W1/W2/W15（真栈全链）｜A2＝W1＋W4（负例）｜A3＝W2（caption 入片）＋移植用例（`test_worker` 降级/重解析清判/续跑保 caption、`test_caption_concurrency`、`test_vlm_target`）｜A4＝W6＋W12（admin 门）＋浏览器相｜A5＝W12（403/掩蔽/UI 门）＋宽度迁移用例（`test_dimension_migration` 等）｜A6＝W5＋W12＋W15＋T5/T6 复验｜A7＝W2/W5（引用真伪/不混库）＋`test_citation_numbering`＋上游预算用例｜A8＝W13/W4（同 id 重试）＋`test_worker`/`test_api`｜A9＝W6/W7/W15｜A10＝W3/W15｜A11＝W13/W14/W17＋部署说明｜A12＝Task 7（CI 全序列＋`ci/smoke` 单独报告）。
- **PR 面**：分支 `slice/knowledge-local-vector-retrieval`（零改名，e325c90b2 起 11 笔）；新 fork `chenzhiya77/deer-flow`（push 落点＝fork remote `https://github.com/chenzhiya77/deer-flow.git`，`-c http.https://github.com.proxy=` 空值直连）；#5391 联网核实 OPEN（「RFC: 内置本地知识库（Harness RAG）」）；PR **#6479**（`Refs #5391`，base `main`）＝https://github.com/bytedance/deer-flow/pull/6479——**⚠️ 用户令「先不要 PR」⇒ 创建后即关闭（2026-10-07T19:35:34Z→19:38:28Z，未合并、无后续；可随时按指示重开）；复核（10-08 gh api）：fork 分支保留（`5cc0197b4`）、上游零分支推送、仅存标准镜像 `refs/pull/6479/head` @ `5cc0197b4`（关单页 11 笔／328 文件／+57,600−190 完整 diff 与 #5391 时间线卡片同为留痕；10-08 正文按令缩为占位 `Not yet approved — pending review.`，标题保留；旧版全文留档，可随时取回）。**
- **上游 CI 三 job 复核追记（2026-10-08；修复对＝`2026-10-08-rag-slice-ci-fix`；对 L177「ruff 全净」与 L167「CI 完整跑通留证」的勘误与补证）**：按上游 `lint-check.yml` 三 job 对 `e325c90b2..5cc0197b4` 本机逐项重跑＋GitHub 侧取证，实况＝三类红＋一类工作流无效：① `lint-backend` ruff check 2 错（`make_samples.py` UP037／F401）＋format 2 件（`test_gateway_services.py` 系工作区行尾混排触发、clean 过滤哈希与 HEAD blob 同 ⇒ 提交面零改动）；② `agent-guidance` 3 条链越硬限 98304（middlewares 99159／sandbox 99505／subagents 98473；根因＝T8-E `backend/AGENTS.md` +1378B）；③ `lint-frontend` `pnpm format` 69 件未过；④ `.github/workflows/rag-eval-nocloud.yml` 在 GitHub 侧**从未有效**——job 级 `env` 用 `${{ runner.temp }}`（fork run `37675627281`＝0 jobs／failure）⇒「CI 完整跑通」实为本地全序列口径、平台侧首条 run 即红、T8 未登记。四类已全修（提交链行附录），四门复跑全绿：ruff 0 错／0 件；tests/knowledge **751 passed／2 skipped／1 failed**（唯一红＝已登记 `test_embed_missing_api_key` 环境条件红、两侧同在）；guidance **0 errors**（ref 模式；残留 13 warnings 全为软警＝AG001＋12 链，含原三链降级、含 `frontend/src` 88504；migrations 消）；`pnpm format` 零 diff＋`pnpm check` 零诊断＋`pnpm test` 304 文件／2895 用例全绿。工作流修复的最终自证＝推送后首跑（**待令**）。
- 提交链：`619c24586`（修复）／`9bb4ea9cb`（材料）／`5cc0197b4`（文档）→ 回填 `f94bab1fc` → pin（本提交） → 修复链（10-08、未推）：四修合笔 `b9989c8c2`（后端 ruff／前端 prettier 69 件／AGENTS 链压缩＋新 guide／无云工作流一行）→ 回填 `f048b3344`（本提交）。
- **补充相（10-08 晚，doc-tools 随带批次）**：切片随带 4 笔（`b8d584554` 结果字段＋篇内检索／`d4542a355` list/read 模块／`13e97ddc1` 门控集合＋文案＋AGENTS 行／`0ffefc916` SOUL＋断言）＋四门全过（ruff **1970 files** 双净／guidance **0 errors**〔1 条 diff-scoped AG002：`middlewares` 链 97,988B、hard 98,304〕／prettier 全过／定向 **62 passed**；联跑 `uv lock --check`・`pnpm lint`・`typecheck`・`build` 全过）；验收相＝隔离实例（gateway `:8101` slice venv＋Qdrant `:6399`；`DEER_FLOW_AUTH_DISABLED=1`；实例 config `tools[]` 补注册两件）跑七轮全 `wait=200`：A1 list→read→枚举／B1 list 边界枚举／B2 四连 read（含分页）／C1 检索（结果含 `doc_id`/`chunk_index`）＋引用／C2 窗口「第 1/共 1 片」／C3 整篇／F 篇内检索（`doc_id` 过滤命中第五章）——记录 `acceptance-8/acceptance-evidence.md` **W18**（转写 `evidence-slice-t8.txt`）。设计对＝`../specs/2026-10-08-rag-doc-tools-design.md`＋同名 plan（Task 8 交接单）。

## 工作项并入表（26 条 → Task）

| 组 | 条数 | 落点 |
| --- | --- | --- |
| 评测（工作项 §8） | 11 | Task 7（+Task 0⑥ 核实） |
| 对话隔离（§9 A4/A6） | 3 | 已在源分支（缺陷批）——Task 1 随带、Task 8 真栈复验 |
| 交付形态/部署/接入/裁剪 | 6 | 可选启停→T3/T4；最小 UI→T6；nginx→T1；表格门→T2；契约接入→T5；首期裁剪→T2/T3 |
| 文档级只读工具组（随带组；2026-10-08-rag-doc-tools） | 1 | 随带批次（主树先；与 ② 刻度轨恢复同批） |
| §10.2 五行 | 5 | 设计结论（无动作，照录） |

## 附录 A — 源清单（Task 0①，留/裁＋行数；行数对源 a343b8b03）

**A1 知识模块（70 文件 / 15,919 行 → 切 32 / 6,585；留 38 / 9,334）**
- **切（32 / 6,585）**：`graph/` 8（communities 84、extractor 181、indexer 229、normalizer 299、resolver 136、retrieval 251、store 336、init 1）｜`wiki/` 3（generator 536、store 136、init 1）｜`video/` 10（asr 429、captioner 127、frames 148、ocr 56、probe 125、segmentation 85、shot_card 97、store 104、streaming 43、init 7）｜`projection/` 4（cache 110、fetcher 180、reducer 144、init 7）｜eval **7 子块**（synthesis 460、ragas_eval 1158、trend 167、ondemand 484、question_bank 189、anchor_check 170、factory 105）——后四者经调用面核实（`knowledge_service.py:35/37`、`knowledge_bases.py:28/30`、factory=Layer 2 共用）全属界面/后置侧，随评测界面整切（`run_rag_eval.py` 另构造 GraphStore/WikiStore，kernel 收窄见 Task 7）。
- **留（38 / 9,334）**：根 32（access 38、caption_client 170、captioner 156、chunker 377、citation_counter 32、dimension_migration 205、dimension_probe 227、embed_identity 67、embed_texts 26、embedder 277、embedder_ark 157、embedder_factory 238、embedder_openai 224、endpoint_url 22、indexer 97、messages 13、model_target 212、models 258、parse_local 245、parser 1076、reindex 344、reranker 151、reranker_factory 61、reranker_generic 146、reranker_tei 143、sparse 185、store 585、sweep 357、vector_store 653、vlm_target 128、worker 1109、init 11）｜eval 5（dataset 152、metrics 240、persistence 300、runner 413、init 6）｜providers 1（init 233，**带切腿引用**：`:169-210` asr 腿四字符串 `video.asr`）。

**A2 外围（留 6 / 4,582；切 2 / 567）**
- 留·改：`routers/knowledge_bases.py` 962（裁评测端点段）、`routers/rag_config.py` 1,269、`services/knowledge_service.py` 1,873（裁卡片/编辑/评测端点段）、`services/rag_migration.py` 125、`services/rag_reembed.py` 227、`tools/builtins/hybrid_search_tool.py` 126（scope 读点 `:42 resolve_kb_scope` → 接 execution_scope）、`tools/builtins/__init__.py`（源注册面——随切不随移植；装配走 `tools:` 条目，见 Task 2）
- 切：`tools/builtins/graph_search_tool.py` 430、`tools/builtins/wiki_search_tool.py` 137
- 配置面（留·改）：`config/rag_config_file.py` 384（`MODEL_REFERENCE_FIELDS` 六字段）；连带 `app_config.py` `rag:` 段（后置腿字段面随裁——见 Task 2）与 `models_config` 适配（源→基座 managed-models）——A1 宇宙（knowledge/ 内）不含此件，复制清单以此行为准。

**A3 agent 面**
- 留·改：`agents/assets/rag/SOUL.md` 51（裁三路/深研）、`config/agents_config.py` 397（内置回落）、`config/tool_config.py` 25（＋opt_in）、`tools/tools.py` 185（过滤语义）、`agents/lead_agent/agent.py` 1032（中间件挂载段）、`config.example.yaml` 2,721（rag 工具 opt_in 条目）
- 切：`agents/middlewares/deep_research_middleware.py` 48（dev 专属）

**A4 后端测试（107 文件 → 切 53；留 54；tests 根面另账）**
- 切：`graph/` 9（含 init/conftest＋7 test）｜`wiki/` 4｜`video/` 10｜`projection/` 4｜eval 9（test_anchor_check、test_ondemand、test_ragas_eval、test_ragas_eval_cli、test_synthesis、test_trend、test_video_eval、test_eval_factory、test_question_bank）｜tools 3（test_graph_search、test_wiki_search、test_wiki_search_manual_merge）｜根 14（test_graph_api、test_manual_knowledge_api、test_chunk_edit_api、test_chunk_re_extract、test_delete_preview、test_projection_prewarm、test_vector_projection_api、test_video_citations_api、test_video_stream_api、test_recall_test_api、test_eval_questions_api、test_eval_runs_api、test_synthesis_api、test_chunk_delete_api〔`:22-23/:25` 引用切腿〕）
- 留·改（107 内 24＝原 5＋R1 补 12＋R2 补 7）：test_worker、test_rag_agent_assembly、test_leg_thinking_toggle、test_e2e_smoke、test_phase2_smoke；**R1 反扫补（均「改」）**：test_sweep、test_api、test_reembed_window_delta、test_dimension_migration、test_caption_concurrency〔双腿共用常量断言→单腿〕、test_vlm_target〔:169/:220/:298 三处 video caption 用例〕、test_rag_provider_config〔asr 用例〕、test_rag_model_wiring〔全腿接线→收 vlm/default〕、test_eval_persistence〔ragas 用例〕、test_table_eval〔question_bank 用例〕、test_citation_numbering〔收单工具〕、test_runner〔graph 配置读点用例〕；**R2 补（均「改」）**：test_models〔graph 键夹具〕、test_parser〔:473/:495 视频门〕、test_vector_store〔:221 卡片〕、test_vector_store_dimensions〔4 集合〕、test_store_refresh〔:54〕、test_file_reconcile〔:108-111〕、test_sweep_generations〔4 集合〕；其余留（含 test_eval_runs_model——eval_runs 表保留）
- **tests 根面（不属 107 宇宙）**：改 7〔test_rag_config_api、test_gateway_lifespan_shutdown＋test_monocle_tracing〔**基座原样**——prewarm patch 不需移植（投影腿已切）；Task 1 撞名修复改判〕、test_rag_config〔:20-199 字段断言〕、test_rag_config_file、test_rag_config_example、test_rag_config_save_probe〕；切 7〔迁移 6：`test_migration_0012/0013/0014/0016/0018/0019_*`——随主链裁、覆盖由 Task 4 链测试承接；＋`test_rag_config_asr_probe`〕；待核/留〔`test_rag_config_{dimension,sparse}_probe`／`test_rag_config_probe`／`test_rag_configuration_error` 逐件复核倾向留；`test_nginx_knowledge_uploads` 留——随 nginx 增量改同批跑〕

**A5 前端 src（80 → 切 41；留 39；＋设置面 9 单列＝复制面 89〔Task 1 计数〕；执行时逐项复核）**
- 切 41：`components/workspace/knowledge/` 35（eval-* 16、graph-* 3、vector-* 2、wiki-* 5、manual-card-* 2、recall-test-panel、recall-graph-mini、delete-preview-dialog、drawer-editor、anchor-block-notice、chunk-tick-rail、use-anchor-confirm）＋`components/workspace/knowledge-base-import-submenu.tsx`＋`core/threads/import-to-knowledge-base.ts`＋`core/knowledge/` 4（card-drawers、eval-run-status、synthesis-status、wiki-status）
- 留 39：`app/workspace/knowledge/` 2（layout、page；改：删五页）＋`components/workspace/knowledge/` 19（chat-panel、kb-assistant-content、kb-citation-sources、citation-mark、chunk-card、chunk-drawer、document-panel、doc-failure-panel、duplicate-upload-dialog、kb-list-panel、kb-toast、middle-tabs、tab-strip、tab-strip.utils、panels-shell、drawer-icon、file-type-badge、scrollable-textarea、run-after-menu-close）＋`core/knowledge/` 18（api、citations、doc-errors、document-stats、document-view、duplicate-check、duplicate-upload-flow、format、hooks、kb-order、kb-threads、path-status〔改：删后置腿键〕、rehype-citation-marks、reindex-status、supported-formats、types、use-doc-failure-notifier、use-doc-table-prefs）
- **设置面（命名面之外，单列；D6/A4/A5 必需）**：9 文件 / 3,784 行——`settings/functional-models-view.tsx` 1,998、`settings/reindex-dialog.tsx` 55、`settings/dimension-migration-dialog.tsx` 51、`settings/info-tip.tsx` 39、`core/rag/` 5 件 1,641（api 225、config-form 885、hooks 209、migration-status 24、types 298）；挂载链单一（`model-settings-page〔上游〕→ FunctionalModelsView → {两 dialog, info-tip, @/core/rag/*}`）；**i18n 按键摘取**（`core/i18n/locales/{en-US,zh-CN,types}` 2,303/2,184/2,105——不整文件复制）。
- **命名面之外集成点（R1 复核补）**：同名件增量改 4——`core/threads/utils.ts`（KB 增量 `:3`/`:32-33`/`:42-49`/`:97`）、`components/workspace/workspace-nav-chat-list.tsx`（知识 nav 入口 `:80-85`）、`app/workspace/agents/[agent_name]/chats/[thread_id]/page.tsx`（kb_id 注入 `:36`/`:88-117`；另按乙删 `:47`）、`components/workspace/recent-chat-list.tsx`（KB 线程路由保留面）；dev 独有 activity 线（`core/threads/activity*.ts*`）按乙不带入。

**A6 前端 tests（71 → 切约 32；留约 39；执行时逐项复核）**
- 切：eval-* 14、graph-* 2、vector-* 2、wiki-* 6（含 wiki-status）、manual-card-* 3、recall-test-panel、card-drawers、chunk-tick-rail、import-to-knowledge-base、hover-focus-heartbeat〔待核〕
- 留：其余约 39（api、chat-panel、chunk-drawer/chunk-image/chunk-table、citation-ux、citations、doc-*、document-*、duplicate-*、file-type-badge、format、hooks、kb-*、middle-tabs、nav-entry、panels-shell、recent-chat-list、rehype-citation-marks、reindex-status、supported-formats、tab-strip×2、use-doc-table-prefs）
- **e2e（单列）**：不随复制——源独有件＝`eval-tab-phase2.spec.ts`（259 行，dev 专属、属切面）；同名件基座更新（`chat.spec.ts` 基座 1,452 行 vs 源 1,188——整文件复制会回退，同 nginx 类）。基座 64 件／源 29 件；基座另有上游 knowledge 面用例（`knowledge-scope`／`knowledge-citations`／`agent-knowledge-binding` 等，上游自有、非本对事）。
- **设置面用例 6 个（单列）**：`unit/rag/{config-form, migration-settle.dom, migration-status}`＋`settings/{functional-models.dom, functional-models-view.dom, models-settings-page.dom}`（后两者随 ② 挂载决定复核）。
- **命名面之外测试（R1 复核补）**：`core/threads/utils.test.ts`（基座已有、源版含 KB 增量——落时 diff 判定）；`core/threads/activity.test.ts`＋`activity-context.dom.test.tsx`（activity 线——按乙不进本对）；`settings-dialog-models-nav.dom.test.tsx`（模型配置线 spec 2026-09-10——不进本对，判定已记）。

**A7 nginx / scripts / 依赖 / AGENTS**
- nginx 三处**增量改**（行数 源→基座：`docker/nginx/nginx.conf` 324→383、`nginx.local.conf` 356→418、`deploy/helm/.../configmap-nginx.yaml` 242→300——差值 59/62/58 行即「整文件复制会退掉基座新增」的硬证据；保留基座 skills/projects location 与 loopback 301）
- scripts：`run_rag_eval.py` 留·改（kernel 收窄）；`run_ragas_eval.py` 切（Layer 2 CLI，引用 `factory` `:49-55`）
- 依赖：qdrant-client 入扩展包；tiktoken/markitdown 核心既有不动；networkx/numpy 随图/投影腿整删
- AGENTS：backend/AGENTS.md 知识节改（随 Task 8）、frontend/AGENTS.md 相关节

**A8 短名→全路径对照（spec/plan 裸短名统一按此解析，防 `find` 撞同名文件；基座＝slice 树 `E:/app/python/agent/deer-flow-slice`，源＝主仓工作树）**

| 短名 | 全路径（树） |
| --- | --- |
| `routers/models.py` | `backend/app/gateway/routers/models.py`（基座） |
| `app.py`（宿主接线） | `backend/app/gateway/app.py`（源；基座同名同址） |
| `services/knowledge_service.py` | `backend/app/gateway/services/knowledge_service.py`（源） |
| `services.py` | `backend/app/gateway/services.py`（基座；Task 2 包化为 `services/__init__.py`——包优先于同名模块，两向导入兼容） |
| `rag_config.py` | `backend/app/gateway/routers/rag_config.py`（源） |
| `rag_config_file.py` | `backend/packages/harness/deerflow/config/rag_config_file.py`（源） |
| `auth.py` | `backend/app/gateway/routers/auth.py`（基座） |
| `sources.py` | `backend/packages/harness/deerflow/community/ragflow/sources.py`（基座） |
| `ragflow/tools.py` | `backend/packages/harness/deerflow/community/ragflow/tools.py`（基座） |
| `task_tool.py` | `backend/packages/harness/deerflow/tools/builtins/task_tool.py`（基座） |
| `tools.py` | `backend/packages/harness/deerflow/tools/tools.py`（源·dev `:74`／基座·上游 `:147`） |
| `tool_config.py` | `backend/packages/harness/deerflow/config/tool_config.py`（源） |
| `manager.py` | `backend/packages/harness/deerflow/extensions/manager.py`（基座） |
| `loader.py` | `backend/packages/harness/deerflow/extensions/loader.py`（基座） |
| `contracts.py` | `backend/packages/extension-api/deerflow_extension_api/contracts.py`（基座） |
| `_env_filters.py` / `env.py` | `backend/packages/harness/deerflow/persistence/migrations/{_env_filters,env}.py`（基座） |
| `migrations/AGENTS.md` | `backend/packages/harness/deerflow/persistence/migrations/AGENTS.md`（基座） |
| `knowledge_scope.py` | `backend/packages/harness/deerflow/knowledge_scope.py`（基座） |
| `knowledge_scope_middleware.py` | `backend/packages/harness/deerflow/agents/middlewares/knowledge_scope_middleware.py`（基座） |
| `knowledge_scope_admission.py` | `backend/app/gateway/knowledge_scope_admission.py`（基座） |
| `metrics.py`/`dataset.py`/`persistence.py`/`runner.py` | `backend/packages/harness/deerflow/knowledge/eval/*.py`（源） |

**附录 B — 十节代理审查发现处置表（F1–F25／净 23 条；2026-10-07 全落）**

首轮报告口径「21 条」；复核轮修正为**净 23 条**＝F1–F25 减 F14/F24 两处重复（并入 F5）。其中 F11 降可选、F19/F23 降建议、F20 归「验收点名补全」；F4 坐标与 F12 行号按修正版执行。逐条处置＝已落（spec＋plan 双面）。

| 编号 | 发现（要点） | 处置 | 落点 |
| --- | --- | --- | --- |
| F1 | nginx 三配置整文件复制会退掉基座新增（两 location＋loopback 301） | 已落＝增量加入 | spec §2.8＋plan Task 1＋A7 |
| F2 | 评测 kernel 非自足（GraphStore/WikiStore 构造、三路 golden） | 已落＝kernel 收至单工具（显式破例） | spec §2.7＋plan Task 7＋Task 0 实测注 |
| F3 | 留存文件跨腿引用拆解清单缺 | 已落＝逐文件「改」清单 | spec §2.2＋plan Task 2 |
| F4 | 扩展装法误认（cli.py）；真装法＝`uv add --group extensions` | 已落＝按基座机制（坐标修正版） | spec §2.3＋plan Task 3 |
| F5（含 F14/F24） | 上游缺 rag 配置整面（AppConfig.rag／rag_config.json 热重载／models_config 面／supports_vision／useModelsConfig） | 已落＝配置面移植＋适配清单承接 | spec §2.3＋plan Task 3 |
| F6 | admission features 谓词/工具名/引用双轨/document_filters 未收口 | 已落＝配套收口四处 | spec §2.5＋plan Task 5 |
| F7 | 无云 CI 交付物须新建；现有 rag-eval.yml 去留 | 已落＝交付物新建清单 | plan Task 7 |
| F8 | python-calamine 缺依赖声明 | 已落＝声明入扩展包/部署说明 | spec §2.3＋plan Task 0③＋Task 8 |
| F9 | agents_config.py 上游/源 69 行差异 | 已落＝记「上游文件＋移植块」 | plan Task 2 |
| F10 | 工作树分支名 slice/… vs feat/… | 已落＝开工前改名定死 | plan Task 8 PR 面 |
| F11 | RFC L98 口径判读（「解析内容」） | 已落＝维持原文（可选收口不采纳） | plan Task 0 实测记录 |
| F12 | 漏切 test_chunk_delete_api | 已落＝入切清单 | 附录 A4＋Task 1 实测 |
| F13 | 前端切留引用自相矛盾（chat-panel/chunk-drawer/middle-tabs） | 已落＝切留引用同步拆 | spec §2.6＋plan Task 6 |
| F15/F16/F25 | 功能模型行/端点段清单欠全/视频 ASR 配置面 | 已落＝「端点段与配置面裁剪」bullet | plan Task 2 |
| F17/F18 | doc_id 稳定性＋分组轴 schema 重标 | 已落＝稳定标识＋重标 | plan Task 7 |
| F19 | 持久机制点名 | 已落＝挂 Task 0④ | plan Task 0④ |
| F20/F21 | 验收点名补全＋恢复验收相 | 已落＝点名与恢复相 | plan Task 8 |
| F22 | hybrid_search 显式传 kb_id | 已落 | plan Task 5 |
| F23 | §6 非目标字面列 | 已落 | spec §6 |
