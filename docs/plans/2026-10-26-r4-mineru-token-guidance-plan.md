# R4 MinerU 令牌首用指引 —— plan

**Status:** 已拍·待实施（2026-10-26 R4=甲·完整；只覆盖 spec §9 R4，R2/R3/R5 仍待裁）
**Date:** 2026-10-26
**配套 spec:** [2026-10-24-single-download-distribution-spec.md §9 R4](../specs/2026-10-24-single-download-distribution-spec.md)

**硬约束**：只改单仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 零改动；`engine/` 零 diff——R4 只动插件 host/client，不重建运行时包（保持 `0.1.0-3`）；发布候令；token 与任何 `api_key` 不落日志、不进提交面；不把“请联系管理员”留给单用户桌面；提交信息英文 Conventional ASCII。

## Task 0 — 落点核实（只读）

> 目的：钉死配置判据、上传分支、失败卡与设置深链；发现与 spec 冲突先停下登记。

- [ ] 配置响应：确认 `/api/rag/config` 的 `config.parse_provider` 恒为生效值（缺省 `mineru-cloud`），`sources.mineru_api_token` 恒为 `ui`/`env`/`unset` 之一（`rag_config.py:298-313`）；确认 env 提供 token 时 `config.mineru_api_token` 为空串但 source 为 `env`，不能用“输入框非空”当判据。
- [ ] 格式面：确认 MinerU 格式＝`.pdf/.doc/.docx/.ppt/.pptx/.png/.jpg/.jpeg`；`.md/.markdown/.txt/.csv/.tsv/.xlsx/.xls` 本地解析、不受令牌影响（`parser.py:69-102`、`parser.py:1031-1048`）。
- [ ] host 探针：确认 `needsEmbeddingConfig` 的现有路径（`bridge.ts:189-203`、`ops.ts:250-255`）与测试缝；确定把嵌入/ MinerU 两个判断合并到同一次 `/api/rag/config` 读取，避免每次状态轮询发两次请求；确认 `runtime/status` 只在 `managed + ready` 探测，external 模式不探测。
- [ ] client 上传：确认三个入口（文件输入/拖拽/⋯ 上传）都汇入 `handleUpload`，且现有嵌入拦截在 `handleUpload`/`panelDrop`/菜单三处（`client.js:21225-21230`、`21399-21401`、`21946-21948`）；确认可在白名单过滤后按后缀分流，只拦 MinerU 格式。
- [ ] 失败卡：确认失败条目由 `foldDocFailures` 生成（`client.js:3411-3431`），`DocFailureCard` 只渲染重试/关闭（`client.js:9534-9598`）；确认可给条目加动作标记并在卡片里加「去配置」，且能打开设置。
- [ ] 设置深链：确认「MinerU 解析令牌」位于 `ModelSettingsPanel` 的高级设置折叠区（`client.js:18253`、`19161-19239`）；确认从面板外打开设置并展开高级设置需要的最小 prop/状态改动。
- [ ] 零 diff 基线：记录 `git diff -- engine` 为空；若实现需要任何引擎改动，立即停止并回报。

**实测（实施期回填）**：

## Task 1 — host 配置探针

> 动到的文件：`src/runtime/bridge.ts`、`src/runtime/ops.ts`、`tests/runtime_bridge.test.ts`、`tests/runtime_ops.test.ts`。

- [ ] `bridge.ts` 新增纯函数 `needsMineruFrom(payload)`：当 `config.parse_provider === 'mineru-cloud'` 且 `sources.mineru_api_token === 'unset'` 时为 true；`mineru-local`、`ui`、`env`、字段缺失一律 false。
- [ ] 把 `needsEmbeddingConfig` 改成一次配置读取返回 `{ needsEmbedding, needsMineru }`（命名按实现定）；保留 ready 门与失败时“不拦”的语义（fetch 失败/非 200 返回双 false）。
- [ ] `RuntimeStatusPayload` 增加 `needsMineruConfig?: boolean`；`panelStatus` 只在 managed + ready 写入两个旗标；external 模式不新增字段。
- [ ] 测试：`needsMineruFrom` 覆盖云+unset、云+ui、云+env、local+unset、缺字段；`panelStatus` 覆盖 ready 两个旗标、starting 不写、external 不探测；已有嵌入探针用例同步改成合并返回。

**实测（实施期回填）**：

## Task 2 — 上传前拦截、失败卡动作与文案

> 动到的文件：`client.js`。

- [ ] 文案：`doc.err.serviceUnconfigured` 中英改为可操作路径——中文“MinerU 解析令牌未配置——到「功能模型设置 → 高级设置 → 解析提供方」填写后再试”，英文同义；新增 `upload.needMineru` 与复用现有「去配置」动作词，不再出现“请联系管理员/contact your admin”。
- [ ] 上传前拦截：按格式把候选文件分成 MinerU 组与本地组；仅当 managed + ready + `runtime.needsMineruConfig` 时，拦住 MinerU 组并弹同款 toast（带「去配置」），本地组照常入队；不得整批拦掉 `.md/.csv`。
- [ ] 失败卡动作：`foldDocFailures` 给 `serviceUnconfigured` 条目带动作标记；`DocFailureCard` 在该条目渲染「去配置」，点击打开设置并展开高级设置；external 模式的失败卡同样可用（不依赖 runtime 探针）。
- [ ] 设置深链：`ModelSettingsPanel` 接受“初始展开高级设置”的信号（prop/状态二选一），关闭后复位；不新造设置入口，不把解析设置搬出原分组。
- [ ] 回归面：拖拽高亮不因 MinerU 旗标关闭（否则本地文件也失去落点反馈）；菜单「上传」仍先开文件选择器，由 `handleUpload` 按格式分流；混合批次不产生 MinerU 的 failed 行。

**实测（实施期回填）**：

## Task 3 — 隔离验收

> 动到的文件：无（夹具与证据在仓外 `D:\hrag-r4`）。

- [ ] 起隔离 DSH 沙箱（按 `reference-dsh-cli-sandbox` 配方；fake 提供方只服务嵌入/LLM，不冒充 MinerU），托管运行时用已发布的 `0.1.0-3`。
- [ ] 无 token：选择 `.pdf` 被上传前拦截，toast 有「去配置」，点击后设置打开且高级设置已展开；库内不新增 failed 行。
- [ ] 无 token：`.md` 与 `.csv` 正常上传到 ready；`.pdf + .md` 混合批次只有 `.md` 入队。
- [ ] 失败卡动作：绕过面板预检（直接调 `/api/knowledge-bases/{kb}/documents` 上传 PDF，或 external 模式）制造 `serviceUnconfigured` 失败行；面板失败卡显示「去配置」，点击落到同一设置位置。
- [ ] 配置后：填一个假 token，PDF 不再被预检拦截；用本地 MinerU v4 stub（`parse_provider=mineru-cloud` + `parse_base_url` 指向 stub）跑到 ready，证明“配置后可解析”。若无 stub，记录覆盖边界并至少证明预检放行与引擎发起 MinerU 调用。
- [ ] 回归：`mineru-local` 不拦截；env 提供 `MINERU_API_TOKEN`（source=`env`）不拦截；`engine/` 零 diff；证据写 `D:\hrag-r4\evidence`。

**实测（实施期回填）**：

## Task 4 — 收口与发布（候令）

> 动到的文件：本对 spec/plan、`package.json`（若发布）、README/手册（若发布）。

- [ ] 门禁：`node --check client.js`、`tsc -p tsconfig.json`、`node --test tests/*.test.ts`；`engine/` 零 diff；主树 `deer-flow` 本 plan 零写入。
- [ ] spec 回填：§9.2 R4 标“已实施”，补证据路径；§9.5 5.23 按甲改写；Status 与 §9.6 同步；R2/R3/R5 仍待裁。
- [ ] 发布（候令）：R4 只改插件，运行时保持 `0.1.0-3`；若发布，按插件 patch `v0.1.2` 走“提交 → draft → 无新运行时资产 → 发布 → `git+https#v0.1.2` 安装复验”，不重建 pack、不动 `runtime.json` 的 pack 字段；README/手册只改与 R4 有关的文案，`market/index.json` 仍不因 npm 未发布而同步。
- [ ] 发布前确认：token 不出现在日志/证据/提交；无 failed 文档残留依赖；提交按线分笔（host 探针/测试、client UI、文档）。
- [ ] 若不发布：停在 Task 3，plan 记录“已实施未发布”，不把 v0.1.2 写成完成态。

**实测（实施期回填）**：

## 验收对应

| spec §9 R4 | 覆盖 Task | 证据 |
| --- | --- | --- |
| 未配置时上传 PDF 得到可操作的指向 | Task 2 / Task 3 | PDF 被预检拦截、toast「去配置」 |
| 配置后解析成功 | Task 3 | 假 token + MinerU stub 到 ready |
| 本地格式不受影响 | Task 2 / Task 3 | `.md/.csv` 照常；混合批次只放行本地件 |
| 失败卡可直接去配置 | Task 2 / Task 3 | API 绕过预检后的 failed 行动作 |
| `engine/` 零 diff | Task 0 / Task 4 | `git diff -- engine` 为空 |
| 无“请联系管理员” | Task 2 | 中英文案与实际设置位置一致 |

## 风险与回退

- **误拦 token 已在环境**：判据必须用 `sources.mineru_api_token === 'unset'`，不能看输入框是否为空；env 来源放行。
- **误拦本地服务**：`parse_provider === 'mineru-local'` 不拦；本地格式永不按 MinerU 处理。
- **混合批次**：只拦 MinerU 组、不整批拒绝；上传后的失败卡只针对真正入队的文件。
- **状态探针失败**：配置读取失败时双旗标为 false（宁可不拦，不回退到“联系管理员”文案）；失败卡动作仍可用。
- **external 模式**：没有 runtime 探针，只有失败卡「去配置」；验收分开写，不把托管结论套过去。
- **令牌失效**：`A0202/A0211` 目前不带 `mineru_api_token` 字样，会落 `unknown`；本 plan 不扩引擎错误码，登记为边界。
- **设置深链过深**：只保证打开设置并展开高级设置；若无法稳定滚到解析分组，记录“已展开、需人工下滚”，不为此改设置信息架构。
- **发布体积**：插件 patch 无新运行时资产；不覆盖 `v0.1.1` 的运行时包，也不改 `runtime.json` 的 `runtimeVersion/urls/size/sha256`。
