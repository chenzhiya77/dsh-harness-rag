# Plan: RAG 功能模型配置 — 2026-09-10

**Spec**: `docs/superpowers/specs/2026-09-10-rag-functional-model-config-design.md`
**前置**: `2026-09-10-web-model-provider-config.md`（Task 1–5）与 `2026-09-10-model-capability-config.md`（Task 1–5 + T3' + 回归修复）
已交付；本增量**只复用**其 seam（旁路可写文件 / admin API / 设置页外壳），不重做。

## 验证基线

- 后端：`cd backend && uv run --no-sync pytest <files> -q --basetemp=.pytest-tmp/ragcfg`；
  `uv run --no-sync ruff check <files>` + `ruff format --check <files>` 双净。
- 前端：`cd frontend && python ../scripts/pnpm.py check`（eslint+tsc）双净；`python ../scripts/pnpm.py test <paths>`。
- Windows：pytest 必须带 `--basetemp`；本机仓库根真实 `models_config.json` 会让
  `test_missing_models_file_falls_back_to_config_yaml` 等环境性用例恒红——判环境性别当回归。
- 后端 `--reload` 在本机不可靠（uvicorn win32 分支无硬杀兜底）：改后端后**手动重启网关**（用户自持进程，用 `make gateway`）。

## 架构基调

- **两套数据模型，一个页面外壳**：对话模型（`models_config.json`）与功能模型（`rag_config.json`）各走自己的文件/契约；
  设置页「模型」分区内用 segmented 切视图。
- **文件优先、env 回退**：`rag_config.json` 覆盖 config.yaml 的 `rag:`；密钥未落盘时仍读原 env 常量 ⇒ 既有部署零改动。
- **不探测**：v1 无测试连接/校验端点（embedding/rerank 是 DashScope 专用 RPC，没有统一的「列模型」口径）。
- **全局单套**：不做 per-KB；换 embedding 只做告警，不做自动重建索引。

## Task 1: `rag_config.json` 存储层 + AppConfig 合并/热重载 + 消费者读密钥（seam B）

**Files:**
- Create: `backend/packages/harness/deerflow/config/rag_config_file.py`（`RagConfigFile`（`extra="forbid"`，字段全可选：
  `embedding_model/embedding_api_key/rerank_model/rerank_api_key/vlm_model/vlm_base_url/vlm_api_key/`
  `extract_model/qdrant_url/mineru_api_token/video{asr_provider,asr_model,caption_model}`）、
  `resolve_config_path`（`DEER_FLOW_RAG_CONFIG_PATH` 覆盖）、`from_file`（缺失→空、形状错误→ValueError）、
  `merge_rag_config(yaml_rag, ui)`（逐字段覆盖 + `video` 深合并）、`atomic_write_rag_config` + `rag_config_write_lock`、
  `MASKED_SECRET` + `preserve_secret`）
- Modify: `backend/packages/harness/deerflow/config/app_config.py`（`RagConfig` 定义在 **app_config.py:176**，不是独立文件；
  在 `from_file` 的 models 合并之后合并 rag 文件；`_get_rag_config_signature()` 并入 get_app_config 热重载判定；
  reset/set 复位；`RagConfig` 增 `embedding_api_key`/`rerank_api_key`/`vlm_api_key`/`mineru_api_token`（`str | None`））
- Modify: 消费者 key 解析改为 `config 值 ?? env`（env 常量名保留为回退）：
  `knowledge/embedder.py`（`DASHSCOPE_EMBEDDING_API_KEY`）、`knowledge/reranker.py`（`DASHSCOPE_RERANK_API_KEY`）、
  `knowledge/captioner.py` + `knowledge/video/captioner.py`（`vlm_api_key_env`）、
  `knowledge/parser.py:46`（`MINERU_API_TOKEN`）
- Modify: `.gitignore`（`rag_config.json`）；Create: `rag_config.example.json`
- Test: `backend/tests/test_rag_config_file.py`（文件优先/深合并/回退/形状错误/原子写/哨兵/仅改 rag 文件也重载）

- [x] RED → Implement → GREEN + revert proof + ruff 双净。（新增 `tests/test_rag_config_file.py` **16 例**：
  文件逐字段覆盖（未声明字段保留 config.yaml 值）/ `video` 深合并（`enabled`、`max_size_mb` 存活）/ 空文件等同未声明 /
  显式 `DEER_FLOW_RAG_CONFIG_PATH` 缺失=运维断言报错（镜像 models 语义）/ 搜索模式无文件→回退 config.yaml /
  形状错误与未知字段→`ValueError` / 合并纯函数不改输入 / **只改 rag 文件也触发 `get_app_config()` 重载** /
  原子写无残留 / 哨兵保留 / 密钥解析四例（文件 > env、文件无密钥→env、显式构造参数 > 文件、都缺→带 env 提示的 `EmbedderAuthError`）。
  回归 `test_app_config_reload`+`test_models_config`+`knowledge/test_reranker`+`knowledge/test_parser` **171 绿**
  （3 例失败仍是已复证的环境性：仓库根真实 `models_config.json` 被搜到）；ruff check+format **双净**。
  revert proof：neuter ①`merge_rag_config` 忽略文件 ②热重载签名去掉 rag ③`configured_rag_secret` 恒 None
  ⇒ **5 红**（逐字段覆盖 / video 深合并 / 合并纯度 / 仅改 rag 文件重载 / 文件密钥胜出），恢复后 16 绿）
- [x] Commit: `feat(config): add API-writable rag_config.json merged into AppConfig`

#### Task 1 交付纪要（2026-09-10）

- **实现落点**：`config/rag_config_file.py`（`RagConfigFile` + `RagVideoFileConfig`（`extra="forbid"`，全字段可选）、
  `resolve_config_path`（镜像 `ModelsConfig`）、`from_file`、`merge_rag_config`（逐字段 + `video` 深合并）、
  `preserve_secret`、`configured_rag_secret`、`atomic_write_rag_config` + `rag_config_write_lock`、
  `MASKED_SECRET`（与 `models_config.MASKED_API_KEY` 同一个哨兵值））；`app_config.py`（`RagConfig` 增 4 个密钥值字段 +
  文档串改写；`from_file` 在 models 合并后合并 rag 文件；`_get_rag_config_signature()` 并入热重载判定与 reset/set 复位）；
  消费者密钥解析改为 **显式参数 > 文件 > env**（`embedder.py`/`reranker.py` 保留惰性读取，
  `captioner.py` + `video/captioner.py` 用已加载的 `cfg.rag.vlm_api_key`，`parser.py` 的 MinerU token 走 `configured_rag_secret`）；
  `.gitignore` += `rag_config.json`；新增 `rag_config.example.json`。
- **决策 / 偏离**：
  1. **测试口径按 spec 修正**（我最初写错）：spec 规定「显式参数或 env 路径缺失 = 运维断言 → 报错，只有搜索模式文件可选」，
     故拆为 `test_env_asserted_path_must_exist`（报错）与 `test_no_file_configured_keeps_config_yaml_values`（patch resolve 隔离搜索模式）。
  2. **示例文件用空串而不是 `$VAR`**：本模块取值是**字面量**（env 是回退，不是模板展开），用 `$DASHSCOPE_...` 会误导；
     空串即「未声明 → 用 env」。
  3. **`configured_rag_secret` 对不可用配置 fail-open 返回 None**（带 debug 日志）：这是凭证解析路径，
     在无 config 文件的环境里抛异常会直接打断 env-only 调用方；已在 docstring 写明是刻意降级。
  4. **原子写独立实现**（未跨模块重构 `models_config`/`extensions_config`）：沿用仓库既有的两份重复惯例，保持本任务边界干净。
  5. `RagConfig` 原文档串「never from config.yaml」已改写为新语义（文件优先、env 回退）。
- **遗留（未动）**：Task 2（admin API + 脱敏 + support-bundle）、Task 3/4（前端）、Task 5（收官）。

## Task 2: admin API `GET/PUT /api/rag/config` + 脱敏 + support-bundle（seam A）

**Files:**
- Create: `backend/app/gateway/routers/rag_config.py`（`GET/PUT /api/rag/config`，`require_admin_user`；
  GET 回逐字段值 + `source`（`config_file`/`ui`）+ 密钥哨兵；PUT 整集合写**只动 `rag_config.json`**，
  `extra="forbid"` 拒未知字段（422）、`null` 不写、哨兵保留原值）
- Modify: `backend/app/gateway/app.py`（挂载路由）
- Modify: `scripts/support_bundle.py`（新增 `rag-summary.json`，密钥脱敏）
- Test: `backend/tests/test_rag_config_api.py`（403 / 掩码 + source / 422 / 只写 non-None / 哨兵保留 / PUT 后热重载生效 / 不写 config.yaml）

- [x] RED → Implement → GREEN + revert proof + ruff 双净。（新增 `tests/test_rag_config_api.py` **10 例**：
  非 admin 403（GET+PUT）/ GET 回「生效值 + 密钥掩码/空 + 逐字段来源（`ui`/`config_file`/`env`/`unset`）」/
  响应体绝不含已存密钥原文 / PUT 未知字段 422 且文件不变 / 非法 `video.asr_provider` 422 /
  PUT 只写 `rag_config.json`（config.yaml 字节不变）/ 哨兵保留已存密钥（再传新值可轮换）/
  **省略字段即从文件移除并回退 config.yaml**（整对象替换语义）/ PUT 后热重载生效 / support-bundle 脱敏 + 产物登记。
  回归 `test_rag_config_file`+`test_support_bundle`+`test_models_config_api`+`knowledge/test_reranker`+`knowledge/test_parser`
  +`test_app_config_reload` **203 绿**（2 例失败为已复证的环境性）；ruff check+format **双净**。
  revert proof：neuter ①admin 门控 ②密钥原样回显 ③PUT 当补丁合并 ⇒ **4 红**（requires_admin / 来源与掩码 /
  绝不含密钥 / 省略字段被清除），恢复后 10 绿）
- [x] Commit: `feat(gateway): admin rag config API with key masking`

#### Task 2 交付纪要（2026-09-10）

- **实现落点**：`app/gateway/routers/rag_config.py`（`GET/PUT /api/rag/config`，`require_admin_user`；
  GET = 生效值（密钥掩码/空）+ 展平 `sources` 映射（非密钥 `ui`/`config_file`，密钥 `ui`/`env`/`unset`）；
  PUT = body 即 `RagConfigFile`（`extra="forbid"` + 嵌套 `video` 字面量校验 ⇒ 未知字段/非法 provider 自动 422），
  哨兵保留已存密钥、空串与空块**剔除**（省略=清除=回退 config.yaml/env），原子写走 `asyncio.to_thread` + 写锁，
  只写 `rag_config.json`）；`app/gateway/app.py` 挂载；`scripts/support_bundle.py` 新增 `collect_rag_summary` +
  `rag-summary.json` 产物与 `--rag-config` 参数。
- **顺带收敛**：新增 `SECRET_ENV_VARS`（harness）作为「密钥字段 → 回退 env 名」的**唯一来源**，
  `embedder/reranker/captioner/video-captioner/parser` 的 env 常量改为从它取值 ⇒ API 报告「当前由哪个 env 提供」
  与客户端实际读取的名字不可能漂移。
- **决策 / 偏离**：
  1. **PUT = 整对象替换**（不是补丁）：提交的对象就是新文件内容，省略某字段即从文件移除、回退到 config.yaml（密钥则回退 env）。
     这样「清除」可用；代价是客户端必须整表单回传（与 `models` 的整体集合写同款契约，Task 4 的表单会照此实现）。
     计划里写的「`null` 不写」据此细化为「`null` 与空串都视为未声明 → 从文件剔除」。
  2. **密钥来源三态**（`ui`/`env`/`unset`）比计划多一档：UI 需要显示「当前使用环境变量」，且只报**存在性**不报值。
  3. **路由自测挂载 + 生产同时挂载**：测试自己 `include_router`，另外在 `app.py` 真实挂载并实测 `create_app()` 后
     `/api/rag/config` 已注册（避免「测试绿但生产没接上」）。
  4. `_load_stored()` 对损坏文件回 500 而不是静默重置（不吞错误）。
- **遗留（未动）**：Task 3（前端 client/纯函数）、Task 4（设置页视图 + i18n）、Task 5（收官）。

## Task 3: 前端类型/客户端/组装纯函数（seam C node）

**Files:**
- Create: `frontend/src/core/rag/types.ts`（`RagConfigView`（GET 形状）/ `RagConfigInput`（PUT 形状））
- Create: `frontend/src/core/rag/api.ts`（`loadRagConfig` / `saveRagConfig`，走 `@/core/api/fetcher` 带 CSRF，
  错误映射复用 `ModelsConfigRequestError` 的形态）
- Create: `frontend/src/core/rag/config-form.ts`（**纯函数**：视图 → 表单初值；表单 → PUT payload，
  未改动的密钥提交哨兵、空值不提交；`isEmbeddingChange()` 判定换 embedding 需告警）
- Create: `frontend/src/core/rag/hooks.ts`（TanStack Query：`useRagConfig` / `useSaveRagConfig`）
- Test: `frontend/tests/unit/rag/config-form.test.ts`（哨兵保留、空值不提交、embedding 变更判定、掩码回显）

- [x] RED → Implement → GREEN + `pnpm check` 双净。（新增 `tests/unit/rag/config-form.test.ts` **15 例**：
  表单初值（掩码回显 / 空视图兜底）/ 未改动且文件无所属 ⇒ **空 payload**（调用方须视为「无可保存」）/
  **文件已拥有字段带出**（只改一个字段不会删掉文件里其它覆盖值）/ 文件拥有字段显式清空 ⇒ `""` /
  operator 拥有字段新填 ⇒ 只提交该字段 / 未动的已存密钥提交哨兵 / 清空已存密钥 ⇒ `""` / 轮换密钥 /
  env 与 unset 密钥不动则不提交、填了才提交 / 嵌套 `video` 带出+更新 / 提交前 trim /
  `isEmbeddingChange` 判定（含 trim）/ 客户端 GET URL / PUT 方法+body / 403 ⇒ `isAdminRequired`。
  `pnpm check`（eslint+tsc）**双净**（一轮修正：两处多余类型断言 + 一处改用可选链）。
  revert proof：neuter ①文件所属字段带出 ②哨兵重提交 ③`isEmbeddingChange` ⇒ **恰好 3 红**（各对应一条），恢复后 15 绿）
- [x] Commit: `feat(frontend): rag functional-model config client and form mapping`

#### Task 3 交付纪要（2026-09-10）

- **实现落点**：`core/rag/types.ts`（`RagConfigValues`/`RagVideoValues`/`RagConfigSource`/`RagConfigView`（GET+PUT 回包，
  含 `config` + 展平 `sources`）/`RagConfigInput`（PUT body = 扁平对象））；`core/rag/api.ts`
  （`loadRagConfig`/`saveRagConfig`，走 `@/core/api/fetcher`；`MASKED_RAG_SECRET`；`RagConfigRequestError` 带
  `isAdminRequired`）；`core/rag/config-form.ts`（**纯函数** `formValuesFromConfig`/`buildRagConfigInput`/`isEmbeddingChange`
  + `RagConfigFormValues`）；`core/rag/hooks.ts`（`useRagConfig({enabled})` + `useSaveRagConfig`，403 不重试、成功 invalidate）。
- **关键语义（比计划一句话更细，已由用例钉住）**：后端 PUT 是**整对象替换**（省略即从文件移除、回退 config.yaml/env），
  所以 payload 必须 = **「文件已拥有的字段带出」+「本次改动」**：
  1. 不这么做的话，只改一个字段会把文件里其它覆盖值一并删掉（有专门用例）；
  2. 未动的**已存密钥**必须回提交哨兵，否则会被删；
  3. 清空：文件拥有的字段 ⇒ 提交 `""`（显式回退到 env/config.yaml）；operator 拥有的字段 ⇒ no-op（UI 本就无法"清空"一个非覆盖值）；
  4. **空 payload = 什么都没改**，调用方必须据此禁用保存（一次空 PUT 会把整个文件清空）——Task 4 的保存按钮按此处理；
  5. operator 拥有的字段只有被真正覆盖时才写进文件，避免"保存一次就把今天的 config.yaml 值冻结成覆盖"、此后操作员改 config.yaml 失效。
- **命名/边界**：GET 形状叫 `RagConfigView`（含 `config` + `sources`）；错误类 `RagConfigRequestError` 与 models 的
  `ModelsConfigRequestError` **同形但独立**（两个配置域互不依赖），403 供视图渲染拒绝态而非 toast。
- **遗留（未动）**：Task 4（设置页视图切换 + 表单 + i18n）、Task 5（收官）。

## Task 4: 设置页「模型」分区视图切换 + 功能模型表单 + i18n（seam C dom）

**Files:**
- Modify: `frontend/src/components/workspace/settings/models-settings-page.tsx`（顶部 segmented：对话模型 / 功能模型；
  功能模型视图复用 `SettingsSection` 外壳与三态镜像）
- Create: `frontend/src/components/workspace/settings/functional-models-view.tsx`（字段分区：
  图谱抽取=**下拉选已配模型**（来自 `useModels`）、caption VLM（模型 + base_url + key）、embedding（模型 + key + 变更告警）、
  rerank（模型 + key）、ASR（provider + 模型）、服务（qdrant_url / MinerU token）；密钥输入=掩码展示 + 「留空即保留」）
- Modify: i18n `types.ts`/`en-US.ts`/`zh-CN.ts`（`settings.functionalModels.*`：视图标签、各字段名与占位、
  `embeddingChangeWarning`、掩码提示、保存/校验文案）
- Test: `frontend/tests/unit/settings/functional-models.dom.test.tsx`（视图切换；抽取模型下拉来自已配模型；
  掩码 + 留空保留；embedding 变更告警出现/不出现；保存 payload 断言；403 三态）

- [x] RED → Implement → GREEN + revert proof + `pnpm check` 双净。（新增 dom `tests/unit/settings/functional-models.dom.test.tsx` **7 例**：
  视图切换（两个选项 + 默认对话视图）/ 生效值 + 已存密钥掩码 + `secretFromEnv` 提示 / 抽取模型下拉取自已配模型（触发器文案）/
  **无改动时保存禁用**、编辑后可保存 / 换 embedding 模型才出「需重建索引」告警 / 保存 payload =
  「文件拥有字段带出（哨兵保留密钥）+ 本次改动」/ 非 admin 拒绝态。node 侧补 **7 例**：
  `extractionModelOptions`（未配置项在前、display_name 回退、已删模型的存量值保留、不重复）+ `hasFormChanges`
  （种子态为 false、编辑后 true、改回 false、清空文件拥有字段为 true、纯空白改动忽略）。
  `tests/unit/rag`+`tests/unit/settings` **52 绿**；`settings`+`rag`+`models`+`components/workspace` **300 绿**；
  `pnpm check`（eslint+tsc）**双净**（修掉两处：`||` → 显式布尔判定；`video.asr_provider` 的类型化写法）。
  revert proof：neuter ①保存守卫恒可保存 ②embedding 告警恒关 ⇒ **恰好 2 红**；再单独 neuter ③视图切换（两端都渲染对话视图）
  ⇒ 功能视图不可达、7 红；恢复后 7 绿）
- [x] Commit: `feat(frontend): functional-model settings view for RAG roles`

#### Task 4 交付纪要（2026-09-10）

- **实现落点**：`functional-models-view.tsx`（**新建**：图谱抽取=已配模型下拉、caption VLM（模型+端点+key）、
  embedding（模型+key+换模型告警）、rerank（模型+key）、ASR（provider 分段 + 模型名）、服务（qdrant_url / MinerU token）；
  密钥为密码框并带「已保存/当前由环境变量提供/留空即不再覆盖」提示；保存按钮在**无改动时禁用**并显示
  `noChanges`）；`models-settings-page.tsx`（顶部 `ToggleGroup` 视图切换，功能视图复用 `SettingsSection` 外壳与三态镜像）；
  i18n 三文件（`settings.models.view*` + 新增 `settings.functionalModels.*` 22 键）；
  `core/rag/config-form.ts` 增 `extractionModelOptions`/`hasFormChanges`；`core/rag/hooks.ts` 关掉 focus 重取
  （避免重取覆盖表单编辑）；非密钥输入用 `AUTOFILL_OFF_INPUT_PROPS`、密钥用 `SECRET_INPUT_AUTOFILL_PROPS`（沿用 Task 4′ 的自动填充防御）。
- **决策 / 偏离**：
  1. **「无改动」按表单是否被编辑判定**（`hasFormChanges`），而不是「payload 是否为空」：带出文件已拥有字段会让 payload 恒非空，
     按 payload 判会永远可保存。这条是 Task 3 那条「空 payload 禁保存」的正确落地方式。
  2. **三个密钥的可见标签加了后缀**（向量/重排/图片描述）：zh 下都叫「API Key」会让 `getByLabelText` 命中多个，也不利于用户分辨。
  3. **抽取模型下拉**用 Radix Select（其开合在 happy-dom 不可靠）⇒ 选项列表的规则（未配置项、display_name 回退、已删模型存量值保留）
     下沉到 node 的 `extractionModelOptions`，dom 侧只断言触发器文案。
- **⚠ 流程自纠**：Task 3 我报「`pnpm check` 双净」时，实际那次门禁在 **eslint 阶段就失败**（修完 eslint 后只跑了单文件 eslint + 测试，
  没有重跑完整 `pnpm check`），因此 `tsc` 的一个类型错误（`video.asr_provider` 的联合类型赋值）被漏到本任务才暴露。已修，并在本轮
  跑完整门禁确认双净。教训：**修完门禁报错必须重跑同一命令**，不能只跑子集。
- **顺带修（另一条线的遗留）**：`lazy-panels.test.ts` 的动态导入计数停在 10，而宠物线的 `ec5e8766` 已把设置分区加到第 11 个
  （导航 + 渲染都已接上，合法）⇒ 单独提交 `0a23203d` 把计数改为 11。
- **遗留（未动）**：Task 5（收官：文档同步 README/AGENTS + 浏览器实测）。

## Task 5: 收官——回归 + 文档同步 + 浏览器实测

- [x] 后端相关子集 GREEN + ruff 双净；前端 `pnpm check` 双净 + `tests/unit/rag` + `tests/unit/settings` 对基线。
  （后端 `test_rag_config_file`+`test_rag_config_api`+`test_support_bundle`+`test_app_config_reload`+`test_models_config`+
  `test_models_config_api` **160 绿**，3 例失败仍是已复证的环境性（仓库根真实 `models_config.json`）；ruff 双净。
  前端 `pnpm check`（eslint+tsc）**双净**；`tests/unit/rag`+`tests/unit/settings` **52 绿**（Task 4 收尾时更大范围
  `settings`+`rag`+`models`+`components/workspace` 为 **300 绿**）。）
- [x] Modify: `README.md` + `backend/AGENTS.md` + `frontend/AGENTS.md`（三段分别覆盖：用户面的入口/env 回退/重建索引告警；
  架构面的 field-level 合并（`video` 深合并）、密钥 `显式 > 文件 > env` 与 `SECRET_ENV_VARS` 单一来源、admin API 的掩码/`sources`
  与整对象写语义、热重载路径、support-bundle 脱敏、仓库地图与路由表各一行；前端面的两视图归属 + 「保存守卫按是否被编辑」的理由）。
- [x] Commit: `docs: sync guides for rag functional-model config`（`b25cbecf`）
- [x] **浏览器实测：2026-09-11 完成**（原「延后」记录保留在下方）。用户 admin 登录后在真实栈手动走查
  （设置 → 模型 → 功能模型：5 组卡片 / 检索组提示行 / 评测裁判与图谱抽取下拉 / 模态组只剩一个下拉 / 掩码与来源提示 /
  换 embedding 告警 / 未改动时保存禁用），**未报异常**；本条属**用户侧确认**，agent 无法独立复核（登录不可自动化）。
  agent 独立判读的一手证据（`GET /api/rag/config` 响应 + 仓库根文件）另记两条：
  ① 四个密钥值全空、来源全 `env` ⇒ 文件未落盘、全走 `.env`，与"空框 + 当前由环境变量提供"的设计一致；
  ② `extract_model: "qwen3.8-flash"` 来源 `ui`，且 `rag_config.json` 已生成（40 B，内容即该条）⇒ **保存落盘与回读一致**已验。
  已知口径小问题：`vlm_base_url` 来源被报成 `config_file`，而它实为**代码默认值**（`config.yaml` 无此行）——`sources` 缺 `default` 态。
  <details><summary>原「延后」记录（2026-09-10）</summary>
  （需 admin 登录，自动化无法穿越）。已就地确立的两条活证据：① 运行中的网关
  **OpenAPI 里已列出 `/api/rag/config`**（对照同时列出 `/api/models/config`、`/api/models/config/validate`）⇒ 新代码已加载；
  ② 未认证请求该路由返回 401（auth 门控生效）。
  ⚠️ **过程纠正**：一开始我拿「`/api/rag/config` → 401」推断「路由存在」，但对照探针显示 `/api/rag/config/nope` **同样是 401**
  ——auth 中间件在路由之前拦截，401 不携带路由存在性信息。结论最终由 OpenAPI 探针给出（证据强度与结论匹配）。
  **留给用户的实测清单**：① 登录 admin → 设置 → 模型 → 切到「功能模型」；
  ② 填 VLM/embedding/rerank 的 key（或留空走 env）→ 保存 → 重开页面确认密钥显示为掩码、来源提示正确；
  ③ 改 embedding 模型 → 确认出现「需重建索引」告警；④ 保存后重传一篇文档，确认新配置被入库腿采用
  （或至少 `rag_config.json` 出现且 `GET /api/rag/config` 回读一致）；⑤ 非 admin 账号确认看不到该视图且 API 403。
  </details>

## 浏览器实测发现（2026-09-10，功能模型视图）——版式与可理解性

用户在真实栈上打开「模型 → 功能模型」后报三件事（均已修，一个提交）：

1. **排版无边界、看不出怎么填**：字段是一条扁平列表，模型名与密钥混排、没有分组；
2. **「向量模型 / 重排模型」下面各有一个说不出用途的方框**——那其实是它们的 API Key 输入，
   **只有 `aria-label` 没有可见标签**（`functional-models-view.tsx` 的 embedding/rerank 密钥，以及 ASR 模型名，共 3 处）⇒ **我的缺陷**；
3. **图片描述模型（VLM）本质是多模态模型**，应该能直接选已配的视觉模型。

**修法（用户拍板：4 组卡片 + VLM 下拉选视觉模型 + 自定义兜底）**：

- **按职责分 4 组卡片**（`Item/Card` 的 `Card`，组标题 + 一句用途）：检索（向量 + 重排）、图谱抽取、多模态与视频、服务与令牌；
  组内统一两列网格。组标题下的说明就是「不知道填什么」的解药。
- **每个输入都有可见标签**，密钥标签写明归属（`API Key（向量/重排/图片描述）`，键早已存在）。
- **VLM 行改为下拉**：只列 `supports_vision` 的已配模型（值 = **厂商模型 id**，因为 `vlm_model` 存的是 id，不是 `models:` 条目名），
  选中即带出该模型声明的端点（不声明就不覆盖当前端点），密钥仍手填/走 env；未匹配到任何视觉模型时落回「自定义端点」并显示模型 ID 输入框。
  规则下沉为纯函数（`visionModelOptions`/`visionModelSelection`/`vlmPrefillFromModel`）以避开 Radix Select 在 happy-dom 的开合限制。
- **明确不做**：把 `vlm_model` 改成 `models:` 条目引用（运行时按工厂解析）——那要改 captioner 的客户端构造，建议另立增量（用户选了本期纯前端方案）。

- [x] RED → Implement → GREEN + revert proof + `pnpm check` 双净。（新增 dom 4 例（4 组标题+说明 / 3 处补标签 / 下拉落回自定义 / 匹配到视觉模型时显示其名且无模型 ID 输入框）
  与 node 3 例（`visionModelOptions` 过滤+`display_name` 回退、`visionModelSelection` 匹配与非视觉模型落回自定义、`vlmPrefillFromModel` 只带出条目声明的端点）。
  `tests/unit/rag`+`settings` **59 绿**；`rag`+`settings`+`models`+`components/workspace` **307 绿**；`pnpm check`（eslint+tsc）**双净**。
  revert proof：neuter ①去掉两处密钥可见标签 ②组卡片退回裸 div ③下拉钉死为自定义 ⇒ **恰好 3 红**、各对应一条；恢复后 59 绿）
- [x] Commit: `fix(frontend): group the functional-model form, label its inputs and pick the caption model`

## 增量（2026-09-11）：评测 judge 选择器 + 检索端点说明

用户在真实栈上看过功能模型视图后问了三件事，已就代码取证并由用户拍板：

1. **检索组的向量/重排要不要 Base URL？** → **不要**：两个客户端都是 DashScope 专用协议
   （`embedder.py:36-37` 原生 RPC 路径、`reranker.py:31-32` compatible rerank 路径），`base_url` 是构造函数入参、
   默认值就是这两个常量，`RagConfig` 里根本没有 endpoint 字段 ⇒ UI 无可绑定的目标。
   （另注：换 endpoint 与换 embedding 模型等价——向量空间随之改变，老库需重建索引。）
   **用户决策：只加一行提示文案，不开输入框。**
2. **VLM 既然能选已配模型，为什么还要 endpoint + key？** → 因为 `vlm_model` 存的是**裸模型 id**，不是 `models:` 条目引用，
   captioner 借不到条目的 client/endpoint/key，只能自带凭据。彻底解法是改成条目引用（captioner 两处解析 + 配置形状 +
   脱敏 + `sources` 语义都要动，且会改变下拉 value 的语义）。
   **用户决策：本期保持现状**（继续显示 endpoint + key）。
3. **有没有 judge 模型？是当前对话模型吗？要不要加选择器？** → 有，但**不是**对话模型：`factory.build_judge_llm`
   支持 `dashscope:<id>`（key 取 `DASHSCOPE_JUDGE_API_KEY` / `DASHSCOPE_API_KEY`）或 `models:` 条目名，`None` ⇒ 配置里第一个模型；
   CLI 有 `--judge-model`，而 UI 触发的评测（`ondemand.py:408`）传 `None`（= 主模型），且 `rag` 里没有 judge 字段。
   **用户决策：加选择器。**

### 交付

- **后端**（`rag.judge_model`，取值 = `models:` 条目名）：`RagConfigFile.judge_model` + `RagConfig.judge_model`
  两处声明即可打通既有通用管线（`merge_rag_config` 逐字段合并、admin API 的 `_build_response`/`_declared_flat`
  按 `model_fields` 泛化、热重载签名已覆盖整个 rag 文件）；
  `knowledge/eval/ondemand.py::_build_layer2_deps` 改为 `build_judge_llm(config.rag.judge_model or None, config=config)`
  —— `or None` 让手写文件里的空串等同「未配置」（否则会去解析名为 `""` 的模型并抛错）。CLI 的 `--judge-model` 口径不变。
- **前端**：`core/rag/types.ts`（`judge_model`）、`core/rag/config-form.ts`（表单值 + `TEXT_FIELDS`，随既有「带出/清空」规则自动生效）、
  `functional-models-view.tsx` 新增「评测裁判」卡片（下拉 = 已配 chat 模型 + 「（使用主模型）」项）+ 检索组端点提示行；
  i18n 三文件（`groupEvaluation*` / `judgeModel*` / `retrievalEndpointHint`）；
  顺带把 `EXTRACTION_MODEL_NONE` / `extractionModelOptions` 改名为 `MODEL_REFERENCE_NONE` / `modelReferenceOptions`
  —— judge 与图谱抽取是同一类「条目名下拉」，用通用名避免第二处误导性命名。
- **文档**：README 角色清单 + `backend/AGENTS.md`（功能模型角色清单 + Layer 2 段落注明按需评测读 `rag.judge_model`）+
  `config.example.yaml` 注释项 + `rag_config.example.json` 键。

- [x] RED → Implement → GREEN + revert proof + 双门禁。
  后端：`test_rag_config_file` 2 例（文件覆盖 / 缺省为 None）+ `test_rag_config_api` 2 例（PUT 回读 + `source=ui` / 缺省回退 `config_file`）
  + `test_ondemand` 1 例（judge 取值 `judge-entry` → `None` → `""`（空串也归 `None`））；相关子集 **61 绿**；ruff check+format 双净。
  revert proof：neuter ①`merge_rag_config` 跳过 `judge_model` ②eval 传 `None` ⇒ **恰好 2 红**，恢复后全绿。
  前端：node 4 例（种子值 / operator 覆盖 / 文件拥有字段带出+清空 / `hasFormChanges`）+ dom 2 例（检索端点提示 / judge 触发器文案）
  + 布局用例纳入「评测裁判」组；两文件 **42 绿**；`pnpm check`（eslint+tsc）双净。
  全量 `pnpm test`：**2238 绿 / 1 红**，红的恰是已登记的环境性预存失败（`knowledge/chat-panel.dom.test.tsx`
  的「restores the remembered model per kb」），与本轮改动无关。
  revert proof：neuter `TEXT_FIELDS` 去掉 `judge_model` ⇒ **恰好 3 红**（提交覆盖 / 带出+清空 / 变更判定），恢复后 42 绿。
- [x] Commit: 与「增量（2026-09-11 之二）」合并为 **`0d6bd5d5 feat(rag): pick the eval judge and the caption VLM from configured models`**（用户选一起提交）。

#### 遗留 / 观察

- **`vlm_model` → `models:` 条目引用**：曾列为挂起项，**当日即由「增量（2026-09-11 之二）」实现**（见下）。
- **judge 与作答模型同源**：选择器未做「必须不同」的校验（CLI 文档也只是建议），自我偏好偏差仍在；已记录，不拦。
- **陈旧断言已修（用户拍板 2026-09-11，与本次一并提交）**：`test_rag_config.py` 的两条默认值断言原写
  `Qwen/Qwen3-VL-30B-A3B-Instruct`，与代码类默认（HEAD `app_config.py:193` = `qwen3.7-flash`）不符 ⇒ 恒红。
  按「以代码默认为准」改成 `qwen3.7-flash`（`tests/test_rag_config.py` **23 绿**），并把 README 的 `rag:` 示例片段
  （`README.md:957`）同步改成 `qwen3.7-flash` 且注明「条目名 or 裸 id」两种语义。
  注：`docs/superpowers/plans/2026-09-09-table-ingest.md:92` 早前已记过同一处不一致 ⇒ 这是历史陈旧，不是本轮引入；
  环境性失败清单里那两条后端红自此消掉。

#### 待实测（浏览器，与功能模型视图同一批）

切到「功能模型」→ 看到 5 组卡片（检索 / 图谱抽取 / 评测裁判 / 多模态与视频 / 服务与令牌）→
评测裁判下拉能选到已配模型、留空即「（使用主模型）」→ 保存后重开仍显示；检索组下方出现端点说明。

## 增量（2026-09-11 之二）：caption VLM 改为 `models:` 条目引用（去掉 endpoint / key 两个框）

**触发**：用户在真实 UI 上追问「多模态与视频里为什么还要留着接口地址、API Key 这两个框」——
`qwen3.7-flash` 本来就配在对话模型里、下拉也能选到，为什么还要再填一遍凭据？

**取证（三处，全部核对过）**：

1. `captioner.py:35` 的 `VL_BASE_URL` 是**模块常量**（env `DASHSCOPE_VL_BASE_URL` 或 DashScope 默认），
   `_caption_one` 直接 `post(VL_BASE_URL + "/chat/completions")` ⇒ **UI 里的接口地址对图片腿完全不生效**；
2. `video/captioner.py:93` 却读 `cfg.rag.vlm_base_url` ⇒ 只有视频腿认这个框（两条腿行为不一致 = 半接线）；
3. `vlm_model` 存的是**裸模型 id**，captioner 因此拿不到条目里的 `base_url`/`api_key`；
   而 `/api/models/config` 对 key 永远只回 `********`（`ManagedModelResponse.api_key = MASKED_API_KEY`）
   ⇒ 前端**在技术上也无法**替你回填 ⇒ 框只能手填。

**用户决策**：两个框（含「自定义端点」兜底分支）**全部去掉**，只留一个模型下拉。

### 交付

- **后端**：新增 `knowledge/vlm_target.py::resolve_vlm_target(config, model=None) -> VlmTarget(model, base_url, api_key, source)`。
  取值顺序：`vlm_model` 命名到 `models:` 条目 ⇒ 模型 id 取 `entry.model`、endpoint 取条目的 `base_url`/`api_base`
  （条目没写则回退 `rag.vlm_base_url`）、key 取条目 `api_key`（`$ENV` 在 config 载入时已解析）→ 回退
  `rag.vlm_api_key` → 回退 `vlm_api_key_env`/`SECRET_ENV_VARS` 指定的环境变量；命名不到条目 ⇒ **legacy 裸 id 路径**
  （同旧行为：`rag.vlm_base_url` + 文件 key/env）。两条 caption 腿（`captioner.py`、`video/captioner.py`）都改走它，
  `VL_BASE_URL` 常量与 `DASHSCOPE_VL_BASE_URL` 因此**退役**（config / 条目成为 endpoint 的唯一来源）。
- **前端**：删除 `VISION_MODEL_CUSTOM` / `visionModelOptions` / `visionModelSelection` / `vlmPrefillFromModel`，
  改为 `visionReferenceOptions(models, current, noneLabel)` + `isCaptionCapable(model)`（要求 `supports_vision`
  且 provider ≠ `anthropic`——caption 走 OpenAI 兼容 `/chat/completions`，Anthropic 条目永远不可用）。
  模态组只剩一个下拉（value = **条目名**，与抽取/judge 行同款），i18n 删 5 键（`vlmPickModel`/`vlmCustom`/`vlmModelId`/
  `vlmBaseUrl`/`vlmApiKey`）、增 2 键（`captionModelHint`/`vlmModelDefault`）。三个模型引用行至此完全同构。
- **保留但不再渲染**：`RagConfigFile.vlm_base_url` / `vlm_api_key` 仍在（`TEXT_FIELDS`/`SECRET_FIELDS` 照旧带出，
  保存不会误删），作为 config.yaml / env 层面的 legacy 兜底；手工 API 写入也仍然有效。
- **文档**：README 角色清单 + `backend/AGENTS.md`（caption 段改为条目解析 + legacy 回退 + env 退役）+
  `config.example.yaml` 的 `vlm_base_url` 注释 + `rag_config.example.json`（`vlm_model` 改成 `qwen3.7-flash`，
  顺手清掉那个没人配置的 `Qwen/Qwen3-VL-30B-A3B-Instruct`）。

- [x] RED → Implement → GREEN + revert proof + 双门禁。
  后端新增 `tests/knowledge/test_vlm_target.py` **7 例**：条目引用给全三元组 / 条目无 endpoint 回退 `rag.vlm_base_url` /
  条目无 key 回退文件再回退 env / 命名不到条目走 legacy 裸 id / 缺省取 `rag.vlm_model` / 图片腿与视频腿都打到条目 endpoint 且带条目 key。
  相关子集 `tests/knowledge` + `test_rag_config_file` + `test_rag_config_api` **1089 绿 / 2 skip**；ruff check+format 双净。
  revert proof：neuter `resolve_vlm_target` 不查条目 ⇒ **恰好 4 红**（条目三元组 / 条目无 endpoint / 两条腿的 endpoint+key
  四条），恢复后全绿。⚠️ **首次 neuter 写在真赋值之前被下一行覆盖 ⇒ 207 全绿（假绿）**——neuter 写错会伪装成
  「用例无牙」，必须先确认 neuter 真的生效再下结论。
  前端：node 改 3 例 + dom 改 2 例（下拉取条目名、行内**没有任何 input**、未匹配条目名保持原值、过滤器排除 anthropic/非视觉）；
  两文件 **43 绿**；`pnpm check`（eslint+tsc）双净；全量 `pnpm test` **2239 绿 / 1 红**（红仍是已登记的环境性预存失败
  `chat-panel.dom.test.tsx`）。revert proof：neuter ①`isCaptionCapable` 去掉 provider 判定 ②选择器恒显默认项
  ⇒ **恰好 5 红**（3 node + 2 dom），恢复后 43 绿。
- [x] Commit: 与上面的 judge 增量合并为 **`0d6bd5d5 feat(rag): pick the eval judge and the caption VLM from configured models`**（26 文件，含陈旧断言修复）。

#### 影响 / 遗留

- **`DASHSCOPE_VL_BASE_URL` 退役**：此前只有 `captioner.py` 的代码注释提到它（workspace 专用域名用）。改后 endpoint 的来源是
  条目 → `rag.vlm_base_url`；要在 workspace 域名上跑 caption 的部署应改用这两处配置。
- **`vlm_base_url` / `vlm_api_key` 变成「文件里可能存着、UI 看不见」**：不做数据迁移（改 `extra="forbid"` 的字段集会让既有文件
  直接报错），保存时照旧带出。将来要彻底删这两个文件字段，需要兼容分支或迁移步骤。
- **条目指向 Anthropic 时**：UI 已过滤；config.yaml 手工指到 anthropic 条目仍会走原始 `/chat/completions` 而失败
  （降级为 placeholder，与非硬依赖设计一致），未加后端校验。

## 风险登记

| 风险 | 触发任务 | 缓解 |
|---|---|---|
| 密钥落盘后被日志/dump 带出 | T1/T2 | 读接口只回哨兵；support-bundle 脱敏；文件 gitignored；消费点只读值不打印 |
| `rag_config.json` 与 config.yaml 的 `rag:` 合并语义漂移（如 `video` 嵌套被整体覆盖） | T1 | `video` 深合并 + seam B 钉住深合并用例 |
| 旧部署未设文件却因合并逻辑破坏既有 env 行为 | T1 | 文件缺失 → 空配置；key 解析 `config ?? env`；回退用例钉住 |
| 改 embedding 模型后老库检索失真/维度不匹配 | T4 | UI 行内告警「需重建索引」；v1 不做自动迁移（明写 Out of Scope） |
| 把非 chat 模型（embedding/rerank）混进对话模型列表 | 全局 | 两套数据模型；功能模型视图不做 provider 白名单，也不进聊天模型选择器 |
| 前端 `--reload`/后端重启节奏误判导致「改了没生效」 | T5 | 后端改完手动重启（`make gateway`）；规格里写明 `rag` 非 startup-only |
| 路由挂载顺序/前缀与其他 router 冲突 | T2 | 沿用 `APIRouter(prefix="/api", tags=[...])` 与既有 router 同构；403 用例先钉 |

## 开口（执行中如遇冲突以此为准）

- 若 `RagConfig` 增密钥字段会破坏既有 config.yaml 反序列化/`extra="allow"` 行为 → 改为**只从文件注入**
  （`from_file` 合并阶段写入 dict），字段仍可选，保证旧文件零影响。
- 若 `extract_model` 下拉引用的模型被删除 → 后端保留原值不静默清空（前端下拉提供「(未配置)」项）。
