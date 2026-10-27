# R4 MinerU 令牌首用指引 —— plan

**Status:** 已拍·实施完成并发布（2026-10-26 Task 0–4 完成；`v0.1.2` 已发布并复验 `git+https#v0.1.2` 安装；运行时仍 `0.1.0-3`；只覆盖 spec §9 R4，R2/R3/R5 仍待裁）
**Date:** 2026-10-26
**配套 spec:** [2026-10-24-single-download-distribution-spec.md §9 R4](../specs/2026-10-24-single-download-distribution-spec.md)

**硬约束**：只改单仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 零改动；`engine/` 零 diff——R4 只动插件 host/client，不重建运行时包（保持 `0.1.0-3`）；发布候令；token 与任何 `api_key` 不落日志、不进提交面；不把“请联系管理员”留给单用户桌面；提交信息英文 Conventional ASCII。

## Task 0 — 落点核实（只读）

> 目的：钉死配置判据、上传分支、失败卡与设置深链；发现与 spec 冲突先停下登记。

- [x] 配置响应：确认 `/api/rag/config` 的 `config.parse_provider` 恒为生效值（缺省 `mineru-cloud`），`sources.mineru_api_token` 恒为 `ui`/`env`/`unset` 之一（`rag_config.py:298-313`）；确认 env 提供 token 时 `config.mineru_api_token` 为空串但 source 为 `env`，不能用“输入框非空”当判据。
- [x] 格式面：确认 MinerU 格式＝`.pdf/.doc/.docx/.ppt/.pptx/.png/.jpg/.jpeg`；`.md/.markdown/.txt/.csv/.tsv/.xlsx/.xls` 本地解析、不受令牌影响（`parser.py:69-102`、`parser.py:1031-1048`）。
- [x] host 探针：确认 `needsEmbeddingConfig` 的现有路径（`bridge.ts:189-203`、`ops.ts:250-255`）与测试缝；确定把嵌入/ MinerU 两个判断合并到同一次 `/api/rag/config` 读取，避免每次状态轮询发两次请求；确认 `runtime/status` 只在 `managed + ready` 探测，external 模式不探测。
- [x] client 上传：确认三个入口（文件输入/拖拽/⋯ 上传）都汇入 `handleUpload`，且现有嵌入拦截在 `handleUpload`/`panelDrop`/菜单三处（`client.js:21225-21230`、`21399-21401`、`21946-21948`）；确认可在白名单过滤后按后缀分流，只拦 MinerU 格式。
- [x] 失败卡：确认失败条目由 `foldDocFailures` 生成（`client.js:3411-3435`），`DocFailureCard` 只渲染重试/关闭（`client.js:9534-9598`）；确认可给条目加动作标记并在卡片里加「去配置」，且能打开设置。
- [x] 设置深链：确认「MinerU 解析令牌」位于 `ModelSettingsPanel` 的高级设置折叠区（`client.js:18253`、`19161-19239`）；确认从面板外打开设置并展开高级设置需要的最小 prop/状态改动。
- [x] 零 diff 基线：记录 `git diff -- engine` 为空；若实现需要任何引擎改动，立即停止并回报。

**实测（2026-10-26，只读）**：

- **配置响应**：`_build_response` 对非 secret 用 `written.get(name, getattr(config.rag, name))`，`RagConfig` 的 `parse_provider` 缺省 `mineru-cloud`（`app_config.py:233`）；secret 只写 `MASKED_SECRET` 或空串，`sources` 只落 `ui`/`env`/`unset`（`rag_config.py:304-313`）。golden 响应里 GET 为 `config.parse_provider=mineru-cloud`、`sources.mineru_api_token=unset`；PUT/local 段为 `parse_provider=mineru-local` 与 `sources=unset/ui`（`engine/backend/tests/fixtures/rag_config/response_golden.json:29`、`:63`、`:104`、`:170`）。未跑引擎 pytest（`engine/backend/.venv` 不存在）；以响应构造代码 + 仓内 golden 为据。
- **secret 来源边界**：`_build_response` 对 secret 只看 `rag_config.json` 与 env，不看 `config.yaml` 里的同名值；默认 `config.example.yaml` 没有 `mineru_api_token`。因此“手改 config.yaml 填 token”会被预检误拦；文档按既有口径写“在功能模型设置填写/用 env”，不扩后端 sources 语义。
- **格式面**：`SUPPORTED_UPLOAD_SUFFIXES` 与 `_LOCAL_READ_SUFFIXES`/`_DELIMITED_SUFFIXES`/`_EXCEL_SUFFIXES` 在 `parser.py:69-102`；`parse_document` 先分流 `.csv/.tsv`、`.xlsx/.xls`、本地文本，再走 MinerU（`parser.py:1031-1048`）。客户端兜底白名单 15 项与 `.pdf` 等完全对齐（`client.js:20190`）。
- **host 探针**：`needsEmbeddingConfig` 是插件内唯一的配置探针（`bridge.ts:189-203`），`panelStatus` 只在 managed+ready 调用（`ops.ts:250-255`）；external 在 `statusPayload` 提前返回（`ops.ts:77-98`），不会探测。`RuntimeOpsDeps` 只有该依赖，改成一次读取返回双旗标无第二调用方。
- **上传**：三个入口最终都到 `handleUpload`——文件 input `onChange`（`client.js:21988`）与 drop（`client.js:21412`），菜单只负责触发 input（`client.js:21946-21952`）。`handleUpload` 先查嵌入（`:21227-21230`），白名单过滤在 `:21236-21246`，之后才 `setUploading`；按后缀分流可插在过滤后，不误伤本地件。拖拽高亮只由 `!needsEmbedding` 控制（`:22103`），不得把 MinerU 旗标并进去。
- **失败卡**：`foldDocFailures` 生成 `{key,name,reason,retryable}`（`client.js:3411-3435`），`DocFailureCard` 只渲染原因与重试/关闭（`:9534-9598`），由 `DocsView` 在 `:11103-11113` 挂载；新增动作需把回调从面板根（`:22005-22009`）穿过 `DocsView`。`classifyDocError` 的 `serviceUnconfigured` 只由 `mineru_api_token` 触发（`:3403`），动作映射安全。
- **设置深链**：`ModelSettingsPanel` 的 `advancedOpen` 是组件内 state（`client.js:18253`），高级折叠按钮在 `:19102-19113`，解析字段在 `:19161-19239`；父层在 `:22473-22483` 只传 `t/kbId/onClose`。最小改法是新增 `initialAdvancedOpen`（或等价信号），失败卡动作打开时置 true，菜单/嵌入 toast 打开时置 false。
- **零 diff**：`git diff --stat -- engine` 与 `git status --short -- engine` 均为空；本轮只读，除本 plan 回填外未改文件。

## Task 1 — host 配置探针

> 动到的文件：`src/runtime/bridge.ts`、`src/runtime/ops.ts`、`tests/runtime_bridge.test.ts`、`tests/runtime_ops.test.ts`。

- [x] `bridge.ts` 新增纯函数 `needsMineruFrom(payload)`：当 `config.parse_provider === 'mineru-cloud'` 且 `sources.mineru_api_token === 'unset'` 时为 true；`mineru-local`、`ui`、`env`、字段缺失一律 false。
- [x] 把 `needsEmbeddingConfig` 改成一次配置读取返回 `{ needsEmbedding, needsMineru }`（命名按实现定）；保留 ready 门与失败时“不拦”的语义（fetch 失败/非 200 返回双 false）。
- [x] `RuntimeStatusPayload` 增加 `needsMineruConfig?: boolean`；`panelStatus` 只在 managed + ready 写入两个旗标；external 模式不新增字段。
- [x] 测试：`needsMineruFrom` 覆盖云+unset、云+ui、云+env、local+unset、缺字段；`panelStatus` 覆盖 ready 两个旗标、starting 不写、external 不探测；已有嵌入探针用例同步改成合并返回。

**实测（2026-10-26）**：

- **纯函数**：`needsMineruFrom`（`src/runtime/bridge.ts:59-66`）只认 `parse_provider === 'mineru-cloud'` + `sources.mineru_api_token === 'unset'`；非字符串 provider、缺 `sources`、`null` 均 false。
- **合并探针**：`createRuntimeBridge` 的 `configNeeds`（`bridge.ts:200-214`）保留 ready 门与 fetch 失败双 false；一次 `/api/rag/config` 同时算 `needsEmbeddingFrom` 与 `needsMineruFrom`；原 `needsEmbeddingConfig` 依赖已移除，无第二调用方。
- **status 面**：`RuntimeConfigNeeds`（`ops.ts:19-22`）、`needsMineruConfig?`（`:46`）、`RuntimeOpsDeps.configNeeds`（`:68`）；`panelStatus` 在 managed+ready 一次调用并写两旗标（`:257-263`）；external 提前返回、不探测。
- **测试**：`runtime_bridge.test.ts:44-72` 覆盖 cloud+unset/ui/env、local+unset、缺字段/非法类型/null；`runtime_ops.test.ts:360-393` 覆盖 ready 双 true、starting 双 undefined、external 探针 0 次。全量 `node --test tests/*.test.ts` 310/310；`npm run typecheck` exit 0；`node --check client.js`、`node --check scripts/build-runtime-pack.mjs` 通过。
- **反向验证**：临时把 `needsMineruFrom` 改成恒 false，`MinerU readiness: cloud without a token needs one` 变红（8/9）；还原后 9/9。证明测试咬住“云 + unset”这条判据。

## Task 2 — 上传前拦截、失败卡动作与文案

> 动到的文件：`client.js`。

- [x] 文案：`doc.err.serviceUnconfigured` 中英改为可操作路径——中文“MinerU 解析令牌未配置——到「功能模型设置 → 高级设置 → 解析提供方」填写后再试”，英文同义；新增 `upload.needMineru` 与复用现有「去配置」动作词，不再出现“请联系管理员/contact your admin”。
- [x] 上传前拦截：按格式把候选文件分成 MinerU 组与本地组；仅当 managed + ready + `runtime.needsMineruConfig` 时，拦住 MinerU 组并弹同款 toast（带「去配置」），本地组照常入队；不得整批拦掉 `.md/.csv`。
- [x] 失败卡动作：`foldDocFailures` 给 `serviceUnconfigured` 条目带动作标记；`DocFailureCard` 在该条目渲染「去配置」，点击打开设置并展开高级设置；external 模式的失败卡同样可用（不依赖 runtime 探针）。
- [x] 设置深链：`ModelSettingsPanel` 接受“初始展开高级设置”的信号（prop/状态二选一），关闭后复位；不新造设置入口，不把解析设置搬出原分组。
- [x] 回归面：拖拽高亮不因 MinerU 旗标关闭（否则本地文件也失去落点反馈）；菜单「上传」仍先开文件选择器，由 `handleUpload` 按格式分流；混合批次不产生 MinerU 的 failed 行。

**实测（2026-10-26）**：

- **文案**：中英 `doc.err.serviceUnconfigured` 均改为指向「功能模型设置 → 高级设置 → 解析提供方」；新增中英 `upload.needMineru`；全文件已无“文档解析服务未配置 / 请联系管理员 / contact your admin”。
- **上传拦截**：`MINERU_SUFFIXES`（`client.js:20206`）固定 8 个 MinerU 后缀；`needsMineru` 只读 managed+ready 的 `runtime.needsMineruConfig`（`:21055`）；`handleUpload` 在白名单过滤后分组（`:21294-21305`），MinerU 组只触发 6 秒 toast、本地组继续 `runNext(uploadable)`；拖拽高亮仍只由 `!needsEmbedding` 控制，未把 MinerU 旗标并进去。
- **失败卡**：`foldDocFailures` 接受 `actionOf`（`client.js:3413-3435`），`snapshotDocFailures` 只给 `serviceUnconfigured` 条目写 `action='mineru-token'`（`:20949-20956`）；`DocFailureCard` 对该条目渲染「去配置」（`:9555-9562`、`:9590`、`:9603`），回调由 `DocsView` 穿到面板根（`:22069`）。external 没有 runtime 探针时，失败卡动作仍可用。
- **设置深链**：面板根新增 `openSettings(advanced)` / `closeSettings()`（`:20981-20992`），菜单与嵌入 toast 走 false，MinerU toast 与失败卡走 true；`ModelSettingsPanel` 新增 `initialAdvancedOpen` 并以它初始化 `advancedOpen`（`:18160`、`:18266`、`:22560-22563`），关闭复位。
- **校验**：`node --check client.js`、`npm run typecheck` 通过；全量 `node --test tests/*.test.ts` 310/310；`engine/` 零 diff。UI 实机验收留 Task 3（本 Task 只做代码与静态回归）。

## Task 3 — 隔离验收

> 动到的文件：无（夹具与证据在仓外 `E:\hrag-r4`）。

- [x] 起隔离 DSH 沙箱（按 `reference-dsh-cli-sandbox` 配方；fake 提供方只服务嵌入/LLM，不冒充 MinerU），托管运行时用已发布的 `0.1.0-3`。
- [x] 无 token：选择 `.pdf` 被上传前拦截，toast 有「去配置」，点击后设置打开且高级设置已展开；库内不新增 failed 行。
- [x] 无 token：`.md` 与 `.csv` 正常上传到 ready；`.pdf + .md` 混合批次只有 `.md` 入队。
- [x] 失败卡动作：绕过面板预检（直接调 `/api/knowledge-bases/{kb}/documents` 上传 PDF，或 external 模式）制造 `serviceUnconfigured` 失败行；面板失败卡显示「去配置」，点击落到同一设置位置。
- [x] 配置后：填一个假 token，PDF 不再被预检拦截；用本地 MinerU v4 stub（`parse_provider=mineru-cloud` + `parse_base_url` 指向 stub）跑到 ready，证明“配置后可解析”。若无 stub，记录覆盖边界并至少证明预检放行与引擎发起 MinerU 调用。
- [x] 回归：`mineru-local` 不拦截；env 提供 `MINERU_API_TOKEN`（source=`env`）不拦截；`engine/` 零 diff；证据写 `E:\hrag-r4\evidence`。

**实测（2026-10-26，`E:\hrag-r4\evidence\r4-task3.md`）**：

- **沙箱**：`DSH_HOME=E:\hrag-r4\dsh-home`，托管运行时 `0.1.0-3`（本地 pack），Qdrant 6335/6336、knowledge 8021；fake 提供方在 9100 只服务嵌入/重排。D: 已满，证据从 plan 原定的 `D:\hrag-r4` 改落 `E:\hrag-r4`。
- **无 token 拦截**：runtime 状态 observed `managed/ready`、`needsEmbeddingConfig=false`、`needsMineruConfig=true`；原生文件输入选 `.pdf` 后 0 行、0 次 `uploadDocument`，toast「PDF / Office / 图片解析需要 MinerU 令牌，先去配置」+「去配置」（`shot-02`）；点「去配置」打开功能模型设置且高级折叠区 `aria-expanded=true`，解析提供方与 MinerU 解析令牌可见（`shot-03`）。
- **本地格式与混合批次**：`.md`+`.csv` 两行到 `就绪 · 部分降级`（graph 腿因沙箱宿主 LLM 代理 401 降级，与 R4 无关；向量腿就绪）；`.pdf + .md` 批次只有 `.md` 入队并到 ready，PDF 无行且 toast 出现（`shot-04`）。
- **失败卡**：直接 POST 引擎 `/api/knowledge-bases/{kb}/documents` 上传 PDF；因首屏已预标记，改为“新 `.md` 维持 3s 轮询 + 第二枚 PDF 由 API 进入失败”制造实时转变，卡片显示「MinerU 解析令牌未配置——到「功能模型设置 → 高级设置 → 解析提供方」填写后再试」+「去配置」「重试」（`shot-05`）；点「去配置」落到同一设置位置且高级已展开（`shot-06`）。
- **配置后放行**：UI 保存假 token 后 `/api/rag/config` 的 `sources.mineru_api_token=ui`、`needsMineruConfig=false`；保存未丢 `qdrant_url`（仍是 `http://127.0.0.1:6335`，source=`ui`）。再选 PDF 不再拦截，行进入 `待解析` 并发出 `uploadDocument`（`shot-07`）；引擎真实调用 MinerU 云得 `HTTP 401 A0202 user authenticate failed`——按 plan 回退口径记录为“预检放行 + 引擎发起 MinerU 调用”的覆盖边界，未搭 MinerU stub。
- **回归与零 diff**：`runtime_bridge`/`runtime_ops` 36/36（含 cloud+unset/ui/env、local+unset、缺字段；ready/starting/external）；`git diff/status -- engine` 为空。
- **环境插曲（已修复）**：搭建期一次带外 PUT 省了 `qdrant_url`，`rag_config.json` 失去该键后引擎回落到 **遗留测试 Qdrant 6333**（`D:\hrag-t6` 测试栈，非用户正式实例）；已停宿主、恢复 6335 并重启。窗口内两条上传失败、修复后重跑；该测试 Qdrant、其宿主与引擎（8020）随后在 D 盘清理时一并停掉并删除。未发现对 6333 的成功写入。后续 UI 保存经核携带 `qdrant_url`，6335 未再丢。
- **密钥**：证据与仓内无真实 token/API key；假 token 值不入证据。

## Task 4 — 收口与发布（候令）

> 动到的文件：本对 spec/plan、`package.json`（若发布）、README/手册（若发布）。

- [x] 门禁：`node --check client.js`、`tsc -p tsconfig.json`、`node --test tests/*.test.ts`；`engine/` 零 diff；主树 `deer-flow` 本 plan 零写入。
- [x] spec 回填：§9.2 R4 标“已实施”，补证据路径；§9.5 5.23 按甲改写；Status 与 §9.6 同步；R2/R3/R5 仍待裁。
- [x] 发布（候令）：R4 只改插件，运行时保持 `0.1.0-3`；若发布，按插件 patch `v0.1.2` 走“提交 → draft → 无新运行时资产 → 发布 → `git+https#v0.1.2` 安装复验”，不重建 pack、不动 `runtime.json` 的 pack 字段；README/手册只改与 R4 有关的文案，`market/index.json` 仍不因 npm 未发布而同步。
- [x] 发布前确认：token 不出现在日志/证据/提交；无 failed 文档残留依赖；提交按线分笔（host 探针/测试、client UI、文档）。
- [x] 若不发布：不执行发布动作，plan 记录“已实施未发布”，不把 v0.1.2 写成完成态。

**实测（2026-10-26）**：

- **门禁**：`node --check client.js` exit 0；`npm run typecheck`（`tsc -p tsconfig.json`）exit 0；`node --test tests/*.test.ts` **310/310**（14.3s，输出 `E:\hrag-r4\evidence\task4-tests.txt`）；`npm run build:plugin` 后 `lib/` 无新 diff；`git diff/status -- engine` 为空。
- **主树**：本 plan 未写 `deer-flow`；该树现有 `README.md` 修改与 4 份研究文档为并行工作，不属 R4。
- **spec 回填**：§9.2 R4 行标“已定甲·已实施”并新增实施结果段与证据路径；§9.4 标“已实施·未发布”；§9.5 5.23 改为“已验 2026-10-26”；发布后（2026-10-27）Status/§9 引子/§9.2/§9.4/§9.6 改为“已随 `v0.1.2` 发布”，并补发布证据与 R4 门禁行。
- **提交线**：host 探针/测试 `c67bbe7`、client UI `680190a`、lib 构建 `367d379`、Task 0–2 记录 `674ee05`、文档收口 `b395ffd`；版本提交 `b877623`。
- **发布**：`v0.1.2` 于 2026-10-27T02:41:31Z 发布，tag → `b877623`，**无运行时资产**；`runtime.json` 保持 `0.1.0-3`、URL 仍指 `v0.1.1` 资产。`git+https#v0.1.2` 隔离安装复验通过（`DSH_HOME=E:\hrag-r4\install-check-home`，装出 `dsh-harness-rag 0.1.2`，profile bundles 含插件、`--dump-config` 有 `harness-rag`、安装后 `runtime.json` 与仓内一致）。证据 `E:\hrag-r4\evidence\release-v0.1.2.md`。
- **密钥面**：证据、plan/spec 与提交面只有字段名与假 token 的说明，无真实 token/API key；假 token 值未落盘。

## 验收对应

| spec §9 R4 | 覆盖 Task | 证据 |
| --- | --- | --- |
| 未配置时上传 PDF 得到可操作的指向 | Task 2 / Task 3 | PDF 被预检拦截、toast「去配置」 |
| 配置后解析成功 | Task 3 | 假 token 预检放行 + 引擎发起 MinerU（dummy 401/A0202 为覆盖边界） |
| 本地格式不受影响 | Task 2 / Task 3 | `.md/.csv` 照常；混合批次只放行本地件 |
| 失败卡可直接去配置 | Task 2 / Task 3 | API 绕过预检后的 failed 行动作 |
| `engine/` 零 diff | Task 0 / Task 4 | `git diff -- engine` 为空 |
| 无“请联系管理员” | Task 2 | 中英文案与实际设置位置一致 |

## 风险与回退

- **误拦 token 已在环境**：判据必须用 `sources.mineru_api_token === 'unset'`，不能看输入框是否为空；env 来源放行。
- **config.yaml 手写 token**：`/api/rag/config` 的 secret `sources` 不覆盖 `config.yaml`；手改该文件填 token 会被预检误拦。默认种子无此键，文档统一指向「功能模型设置」/ env，不为此改后端。
- **误拦本地服务**：`parse_provider === 'mineru-local'` 不拦；本地格式永不按 MinerU 处理。
- **混合批次**：只拦 MinerU 组、不整批拒绝；上传后的失败卡只针对真正入队的文件。
- **状态探针失败**：配置读取失败时双旗标为 false（宁可不拦，不回退到“联系管理员”文案）；失败卡动作仍可用。
- **external 模式**：没有 runtime 探针，只有失败卡「去配置」；验收分开写，不把托管结论套过去。
- **令牌失效**：`A0202/A0211` 目前不带 `mineru_api_token` 字样，会落 `unknown`；本 plan 不扩引擎错误码，登记为边界。
- **设置深链过深**：只保证打开设置并展开高级设置；若无法稳定滚到解析分组，记录“已展开、需人工下滚”，不为此改设置信息架构。
- **发布体积**：插件 patch 无新运行时资产；不覆盖 `v0.1.1` 的运行时包，也不改 `runtime.json` 的 `runtimeVersion/urls/size/sha256`。
