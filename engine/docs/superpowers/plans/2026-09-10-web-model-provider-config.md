# Web 端模型 Provider 配置实施 plan（2026-09-10）

对应 spec：`docs/superpowers/specs/2026-09-10-web-model-provider-config-design.md`（章节引用以
「spec §N」标记）。任务按序执行；每任务 RED → GREEN → revert proof → 提交。

验证基线：后端 `cd backend && uv run pytest tests/test_models_config.py
tests/test_models_config_api.py tests/test_app_config_reload.py tests/test_support_bundle.py -q`
（Windows/沙箱需 Makefile 同款 `--basetemp=.pytest-tmp/<sub>` + PYTHONPATH/PYTHONIOENCODING/
PYTHONUTF8 三 env）+ `uv run ruff check` / `ruff format --check` 双净；前端
`python ../scripts/pnpm.py check`（eslint+tsc 为门禁，**勿跑 prettier --write**）+
`python ../scripts/pnpm.py test run tests/unit/settings`（node/dom 分环境）。

架构基调（spec §2/§5）：独立 API 可写文件 `models_config.json`（**不碰 config.yaml 写入**）+
AppConfig 按 `name` 合并（**UI 文件覆盖 config.yaml**）+ provider 白名单→固定 `use:`（**永不接受
自由文本 `use:`**）+ admin 门控 `GET/PUT /api/models/config` + 原子写/锁/双文件 mtime 热重载 +
批量添加为**客户端展开**（后端契约不变）。**无 per-user key、无凭证分组实体、无测试连接按钮**。

## Task 1: models_config 存储层 + AppConfig 合并/热重载（seam B，spec §5.1/§5.2/§5.6）

**Files:**
- Create: `backend/packages/harness/deerflow/config/models_config.py`（`ModelsConfig` 解析、
      `resolve_config_path`（`DEER_FLOW_MODELS_CONFIG_PATH` 覆盖）、`atomic_write_models_config`
      + `models_config_write_lock`、provider↔`use:` 白名单映射 + 端点键规则、api_key 哨兵保留）
- Modify: `backend/packages/harness/deerflow/config/app_config.py`（`from_file` 在 extensions
      合并**之后**追加加载+合并 `models_config.json`：按 `name` 并集、同名文件覆盖、来源标记
      `config_file`/`ui` 派生（不写回文件）；对新文件同样跑 `resolve_env_variables`；
      `get_app_config` mtime 热重载**同时 stat 两个文件**）
- Modify: `.gitignore`（忽略 `models_config.json`）；Create: `models_config.example.json`
- Test: `backend/tests/test_models_config.py`（seam B，spec §7.3：config.yaml∪文件并集 / 同名
      **文件覆盖** / 来源标记 / 文件缺失或空→回退纯 config.yaml / **仅改 models 文件 mtime 也
      重载** / 原子写无残留 .tmp / 并发写不丢改（锁））

- [x] RED：新用例 failed（`ModuleNotFoundError: deerflow.config.models_config`，11 用例 collection error；12 条纯函数用例先绿）。
- [x] Implement：models_config 模块 + app_config 合并/双文件热重载 + gitignore + example。
- [x] GREEN + revert proof + ruff 双净。—— `test_models_config.py` **23 passed**；回归
      `test_app_config_reload`+`test_support_bundle` 合计 **93 passed**、`test_runtime_paths`
      **12 passed**；ruff check **All checks passed** + format 3 files clean。
      revert proof：①neuter `_get_models_config_signature`→恒 None ⇒
      `reloads_when_only_models_file_changes` **RED**；②neuter `merge_ui_models`→忽略 ui ⇒
      union/override **RED**（source_tag 恒绿：源自 ui 名字集合、不依赖 merge，符合预期）；恢复后全绿。
- [x] Commit: `feat(config): add API-writable models_config.json merged into AppConfig`（`b225abb1`，5 files, +576/-4）

### 交付纪要（2026-09-10）

- **实现落点**：新增 `deerflow/config/models_config.py`（`ModelsConfig` / `resolve_config_path`
  （`DEER_FLOW_MODELS_CONFIG_PATH`）/ `atomic_write_models_config` + `models_config_write_lock` /
  provider 白名单↔`use:`+端点键 / `MASKED_API_KEY`+`preserve_api_key` / `merge_ui_models`）；
  `app_config.py` 在 extensions 合并后、`model_validate` 前合并 models 文件 + `_ui_model_names`
  PrivateAttr + `is_ui_managed_model()` + `_get_models_config_signature()` 并入 reload 判定 +
  reset/set 复位；`.gitignore` += `models_config.json`；新增 `models_config.example.json`。
- **两个冻结的结构决策**：①来源标记放 AppConfig **PrivateAttr**（不进 `ModelConfig` 字段）——
  `ModelConfig` 是 `extra="allow"` 且 `create_chat_model` 会把未排除字段当构造 kwargs 转发，
  加字段会污染 provider 构造；②models_config 自带 env 解析且**未解析 `$VAR` 抛错**（对齐
  config.yaml 语义；区别于 extensions_config 的置空降级）。
- **Windows 陷阱**：`tmp_path` 走系统 Temp 报 `WinError 5`，需 `--basetemp=.pytest-tmp/models`
  （Makefile 同款）；pytest_cache 的 WinError 5 为预存无害告警。
- **遗留（未动）**：`GET/PUT /api/models/config`、support-bundle redact、doctor、前端均在后续 Task。

## Task 2: admin 管理 API + 脱敏 + support-bundle（seam A，spec §5.3/§5.4/§5.5）

**Files:**
- Modify: `backend/app/gateway/routers/models.py`（新增 `GET/PUT /api/models/config`，
      `require_admin_user`；GET 回管理视图：`source`/`editable`/api_key 脱敏哨兵 `********`/
      provider 由 `use:` 反查（反查不到标 `custom`+只读）；PUT 整体集合写**只动
      models_config.json**：校验白名单与形状（422）、映射固定 `use:`、按 provider 写端点键
      （deepseek=`api_base`，其余=`base_url`）、api_key 传哨兵→保留原值；**拒绝自由 `use:`**）
- Modify: `scripts/support_bundle.py`（`redact_data` 覆盖 `models_config.json` 的 api_key）
- Test: `backend/tests/test_models_config_api.py`（seam A，spec §7.2：非 admin 403 / 白名单与
      形状 422 / 自由 `use:` 被拒且落盘 `use:` 恒为映射值 / DeepSeek 落 `api_base` 其余
      `base_url` / GET 脱敏 / 哨兵保留（读盘断言原 key 不变）/ PUT 后 `GET /api/models` 反映
      （热重载）/ 原子写无 .tmp）

- [x] RED：路由不存在 → 404/403 断言 failed（7 failed；temp 负向用例恒绿）。
- [x] Implement：GET/PUT 路由 + 校验/映射/脱敏/哨兵 + support-bundle redact。
- [x] GREEN + revert proof + ruff 双净。—— `test_models_config_api.py` **9 passed**；回归
      support_bundle **32** + models_config **23** + app_config_reload **38** +
      models_authorization **28** passed；ruff check/format 双净。
      revert proof：neuter `preserve_api_key` + `_managed_response` 脱敏 + 白名单 or-fallback ⇒
      **3 安全用例 RED**（sentinel/masking/allowlist）；恢复后全绿。
- [x] Commit: `feat(gateway): admin models config API with provider allowlist and key masking`（`4cc8aaa2`，3 files, +503/-2）

### 交付纪要（2026-09-10）

- **实现落点**：`app/gateway/routers/models.py` 新增 admin `GET/PUT /api/models/config`
  （`ManagedModelInput` `extra="forbid"` 拒自由 `use:`；白名单映射 `use:`+端点键；哨兵保留；
  原子写+`models_config_write_lock`；GET 回 `provider`/`endpoint_key`/`endpoint`/脱敏 key/
  `source`/`editable`）；`scripts/support_bundle.py` 新增 `collect_models_summary` +
  `models-summary.json` + `--models-config`。
- **两个陷阱（已修/已记）**：①**FastAPI 注册顺序遮蔽**——`GET /models/{model_name}` 抢匹配
  `/models/config`（model_name="config" → 404）；config 路由必须声明在 `{model_name}` 之前
  （已加 NOTE 注释防回归）。②测试夹具 config.yaml 必须带 `sandbox`（AppConfig 必填字段）。
- **遗留（未动）**：`make doctor` 合并集（Task 3）、前端（Task 4）。

## Task 3: make doctor 读合并集（spec §5.8）

**Files:**
- Modify: `scripts/doctor.py`（「至少配置一个模型」检查改读**合并后**模型集 config.yaml ∪
      models_config.json）
- Test: doctor 对应测试（两来源任一有模型即通过；都无才报缺）

- [x] RED → Implement → GREEN + revert proof。—— `test_doctor_models.py` **2 passed**（新增）；
      回归 `test_doctor.py` **60 passed**（既有 `TestCheckModelsConfigured` 三例不动）；ruff 双净。
      revert proof：neuter `_merged_models`（忽略 ui + 吞错误）⇒ 2 新用例 RED；恢复全绿。
- [x] Commit: `feat(doctor): count merged model set so UI-only models pass the models check`（`1c25256b`，2 files, +97/-12）

### 交付纪要（2026-09-10）

- **实现落点**：`scripts/doctor.py` 新增 `_merged_models(config_path)` 并重写
  `check_models_configured`。合并集 = config.yaml `models` ∪ `models_config.json`
  （经 `merge_ui_models`），仅 UI 添加模型也能通过「至少一个模型」检查。
- **关键决策（偏离原计划）**：不走 `AppConfig.from_file()`——它要求整份 config 合法
  （含必填 `sandbox`），会击穿既有 `test_one_model`（无 sandbox 夹具）。doctor 层改为
  **只读两份模型列表**并合并（容错、不要求整份 config 可加载）。
- **降级语义**：`models_config.json` 形状错误 ⇒ `ModelsConfig.from_file()` 抛错 ⇒
  降级为 config.yaml 集并**记录错误**（有 yaml 模型→warn，无→fail），doctor 绝不崩。
- **遗留（未动）**：前端（Task 4）、收官+文档+浏览器实测（Task 5）。

## Task 4: 前端「模型」设置分区 + 批量添加（seam C，spec §5.7/§5.3.1）

**Files:**
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`（`sections` +=
      `models`（`CpuIcon`，插在「集成」后、「记忆」前）+ `{activeSection === "models" &&
      <ModelsSettingsPage />}` 分支 + **admin-only** 可见）
- Create: `frontend/src/components/workspace/settings/models-settings-page.tsx`（`SettingsSection`
      外壳 + 三态镜像 `ToolSettingsPage` + `Item variant="outline"` 卡片列表（`ItemTitle`=
      display_name??name、`ItemDescription`=`{provider}·{model}`、`ItemActions`=来源 `Badge`+
      编辑/删除（仅 editable））+ 批量添加弹窗（共享凭证块 + 可重复 Model ID 行 + 共享能力默认）
      + 单模型编辑弹窗（身份字段不可改））
- Create/Modify: `frontend/src/core/models/`（api/hooks：`GET/PUT /api/models/config`；**批量
      展开**纯函数：共享块 + N 个 Model ID → N 条 entry，命名=`Model ID`、重名 `-2/-3`、
      `display_name` 默认=Model ID、各带同 api_key/端点/provider）
- Modify: i18n `types.ts` / `en-US.ts` / `zh-CN.ts`（`settings.sections.models` +
      `settings.models.*`）
- Test: `frontend/tests/unit/settings/`（node：批量展开/命名去重/端点键随 provider；dom：
      admin 见分区非 admin 不见 / 列表来源徽章+只读行无删除 / 批量添加两行→PUT payload 两条
      entry 各带同 key / API 类型仅 openai-compatible 显 / 全空 Model ID 提交被阻 / 空态引导）

- [x] RED：dom/node 用例 failed（3 文件 failed：分区/组件/展开函数不存在）。
- [x] Implement：settings 接线 + models-settings-page + 增/改弹窗 + core/models + i18n。
- [x] GREEN + revert proof + `pnpm check` 双净。—— 新增 **15 passed**（batch node 6 +
      nav dom 2 + page dom 7）；`pnpm check`（eslint+tsc）**EXITCODE=0** 双净；
      回归 `agent-settings-dialog-helpers` **10 passed**（`Model` 类型未动）。
      revert proof：`git stash -u` 所有实现文件（留测试）⇒ 3 文件 RED；`stash pop` 恢复 15 passed。
- [x] Commit: `feat(frontend): admin Models settings section with batch add (one key, N models)`（`34cf3d85`）

### 交付纪要（2026-09-10）

- **实现落点**：
  - `core/models/`：`types.ts`（`ManagedModel`/`ManagedModelInput`/`ProviderId`）、`api.ts`
    （`loadModelsConfig`/`saveModelsConfig` + `ModelsConfigRequestError.isAdminRequired` +
    `MASKED_API_KEY`，走 `@/core/api/fetcher` 带 CSRF）、`batch.ts`（`expandBatchToEntries`/
    `uniqueModelName` 纯函数）、`hooks.ts`（`useModelsConfig`/`useSaveModelsConfig`，成功后
    同时 invalidate `["modelsConfig"]` 与 `["models"]` 以刷新聊天选择器）。
  - 组件：`models-settings-page.tsx`（三态镜像 `ToolSettingsPage` + `Item variant="outline"`
    卡片列表 + 来源 `Badge` + 仅 editable 行显编辑/删除）、`models-add-dialog.tsx`（批量：
    共享凭证块 + 可重复 Model ID 行 + API 类型仅 openai-compatible）、`models-edit-dialog.tsx`
    （单模型，身份字段只读，空 key → 哨兵保留）。
  - `settings-dialog.tsx`：`CpuIcon` + `models` 分区（插在「集成」后「记忆」前）+ 渲染分支；
    **admin-only** 由 `useAuth().user?.system_role === "admin"` 控制导航可见性（服务端为准）。
  - i18n：`types.ts`/`en-US.ts`/`zh-CN.ts` 同步新增 `settings.sections.models` + `settings.models.*`。
- **关键决策 / 陷阱**：
  - **PUT 是整体集合写**：添加/编辑/删除都重建「UI 管理集」全量提交（`uiModels.map(toManagedInput)`
    ± 变更项），config.yaml 模型不入 PUT；未改的 key 以哨兵保留。
  - **批量 = 客户端展开**：`expandBatchToEntries` 把共享块 + N 个 Model ID 展为 N 条扁平 entry
    （name=Model ID、重名 -2/-3、display_name 默认=Model ID、`use_responses_api` 仅 openai-compatible+Responses）。
  - **Radix Select 在 happy-dom 开合不可靠**（与已有记忆一致）：DOM 测试不驱动 provider 下拉切换，
    「API 类型仅 openai-compatible」的规则由 node `batch.test.ts`（use_responses_api 门控）钉死。
  - 眼睛切换按钮需独立 `aria-label`（`apiKeyToggle`），否则与 key 输入框同 label → `getByLabelText` 命中多个。
- **遗留（未动）**：Task 5 收官（全量回归 + README/AGENTS 文档同步 + 浏览器实测）。

## Task 5: 收官——回归 + 文档同步 + 浏览器实测

- [x] 后端全量相关子集 GREEN + ruff check/format 双净；前端 `pnpm check` 双净 + settings 套件
      对基线。—— 后端 `test_models_config`+`test_models_config_api`+`test_doctor_models`+`test_doctor`+
      `test_support_bundle`+`test_app_config_reload`+`test_models_authorization` **192 passed**；
      ruff check/format **8 文件双净**。前端 `pnpm check`（eslint+tsc）**EXITCODE=0**；
      `tests/unit/models`+`tests/unit/settings` **15 passed**。
- [x] Modify: `README.md`（用户面：网页配模型/批量添加）+ `backend/AGENTS.md`（架构面：新增
      API 可写 models_config.json、合并语义、provider 白名单安全边界；orientation-layer 口径，
      不含 commit hash/RED-GREEN/验收清单）。
- [x] Commit: `docs: sync README and agent guide for web model provider config`（`aff1b18b`，2 files, +32/-1）
- [x] 浏览器实测：**2026-09-11 完成**——用户 admin 登录后在真实栈手动走查（设置 → 模型：添加模型两步向导，
  故意填错的 key/Model ID 被拦在第一步、改正后进入第二步并保存；一个 key 批量多个 Model ID；模型列表出现后
  发消息热重载生效），**未报异常**。本条属**用户侧确认**：登录不可自动化，agent 无法独立复核。
  <details><summary>原「延后」记录（2026-09-10）</summary>
  （用户选择「延后并记录」）。原因：本地栈未运行
  （2026/3000/8001 均未监听），且实测需 admin 账号 + 一个真实 provider key 才能验证
  「发消息热重载」；按纪律不擅自起栈/改 config/注入 key。
  </details>

### 交付纪要（2026-09-10）

- **自动化部分全部完成并锁定**：后端 192 passed + ruff 双净；前端 check 双净 + 15 passed；
      文档同步 `aff1b18b`。三 seam（B 存储/A API/doctor）+ 前端批量添加均已 TDD 落地。
- **浏览器实测接续清单（环境就绪时）**：
  1. 起栈：`make dev`（或 `make up`），浏览器开 `http://localhost:2026`；`make doctor` 确认「models configured」。
  2. 以 **admin** 账号登录 → 设置 → 左导航「模型」分区（非 admin 不见）。
  3. 点「添加模型」→ 选 provider（如 OpenAI 兼容）+ 填端点/一把 API Key + 两个 Model ID
     （「+ 添加 Model ID」）→ 添加。
  4. 核对：列表出现两行（来源徽章「UI·可编辑」）；`GET /api/models` / 聊天模型下拉出现两项；
     磁盘 `models_config.json` 两条 entry 各带同 key、端点键随 provider（deepseek=`api_base`）。
  5. 发一条消息验证热重载生效（无需重启）；编辑一行改 display_name/能力→保存→生效；删除一行→集合更新。
  6. 截图落 `pr-build/`（列表/批量弹窗/聊天下拉）作为 evidence。
- **非目标（未动，符合 spec §10）**：per-user BYO key/多租户、自由 `use:`、测试连接按钮、
      `make setup` 写 models_config.json、前端配后端地址。

## 风险登记（实施期新增即补此行下表）

| 风险 | 触发任务 | 缓解 |
|---|---|---|
| 双文件 mtime 热重载漏重载/竞态 | T1 | stat 两文件取较新 mtime；seam B 钉「仅改 models 文件也重载」 |
| PUT 整体集合写与并发/手改互相丢改 | T2 | `models_config_write_lock` + 原子读-改-写；测试钉并发不丢改 |
| api_key 明文落盘 | T2 | 文件 gitignored + support-bundle redact + GET 脱敏哨兵 + 哨兵保留语义 |
| provider 白名单过窄挡用户 | T2/T4 | 白名单为可扩展常量；新增 provider = 加映射 + 测试，不放开自由 `use:` |
| 批量命名去重（`-2/-3`）造成困惑 | T4 | 命名规则冻结于 spec §5.3.1；node 测试钉死去重与 display_name 默认 |
| 前端设置上下文缺 admin 信号 | T4 | 复用现有 admin/role 信号，若无则补；安全以服务端 `require_admin_user` 为准（纵深防御） |
| 端点键写错（`base_url` vs `api_base`）触发 factory 归一告警/请求期报错 | T2 | 按 provider 映射表落盘；seam A 钉 DeepSeek=`api_base`、其余=`base_url` |
