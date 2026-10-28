# 功能模型设置：厂商入口与智能识别配置 —— plan

**Status:** 已完成并提交（2026-10-27；Task 0–5 与 10-27 视觉修订 4–9；提交链 `699cb2c` / `299f1ee` / `4a6a0c6` / `49307a9`（lib 重建）；349/349＋`tsc` 0＋`node --check` 0；构建态识别路由 400/502 复验；真栈真实视觉模型已跑通（图文 17 项 / 纯图 16 项）；按真栈发现修复提示词与 DashScope rerank URL 兜底并重建 lib（`cebbcc1`）；固定维度过滤已补客户端集成测试（`tests/client_smart_dimension.test.ts`）；结果表按他裁 B 重构（命令栏/分组计数；行内去掉控制台与无变化，始终展开；`8806d9d`）；真实厂商控制台截图未跑；OCR 8080→8880、401/429 分类、focus ring 留作残差）
**Date:** 2026-10-27
**配套 spec:** [2026-10-27-settings-vendor-links-smart-fill-spec.md](../specs/2026-10-27-settings-vendor-links-smart-fill-spec.md)（D1–D13；§4.3 字段表；§5 验收 1–19）

**Architecture:** 宿主侧新增 `src/config_recognize.ts`：在既有 `webServer` 上注册独立 route，复用模型代理的 catalog / `buildGenerateOptions` / `collectCompletion` / `mapFailure` 与宿主附件准入；浏览器侧只改 `client.js`：四处 provider 行尾静态控制台链接、功能模型设置顶部固定展开的识别卡；engine 与 runtime pack 零改动。

## 范围与交接

- 本笔文件：`src/config_recognize.ts`（新增）、`src/index.ts`（一行注册）、`tests/config_recognize.test.ts`（新增）、`client.js`（链接、卡片、CSS、i18n）、本对 spec/plan、`2026-10-18-tier3-polish-spec.md` / `2026-10-21-rag-leg-effort-spec.md` 的追加注。
- 不动：`engine/`、`scripts/build-runtime-pack.mjs`、`src/runtime/*`、`src/kb_proxy.ts`、`src/model_proxy.ts`（只复用其导出）、配置 schema、provider 选项。
- 基线：HEAD `f9ef9d9`，工作区本 spec/plan、`src/config_recognize.ts`、`tests/config_recognize.test.ts` 未跟踪；`package.json` 0.1.2；R2/R3/R5 已提交，v0.1.3 发布面已撤回。
- 并行交接：Task 0 期间出现的快速开始工作区改动已退出（未提交）；Task 3–4 开工前复核工作树；Task 4 验收期间并行「快速开始」重设计（编号行、页脚厂商行、右缘窄按钮）已整体落进同一 `client.js`，本笔未改该区域，Task 6 提交链须按 hunk 拆分，不卷入本笔。
- 验收环境：隔离 DSH 沙箱（独立 `DSH_HOME`、端口、fake provider）；fake provider 声明 `inputModalities` 含 `image`，返回固定 JSON 与可控错误；不调用真实付费模型、不把真实 Key 写入任何文件。
- 工作树交接：开工前复核 `git status --short`；若出现并行改动，先停并列出，不带入本笔。

## 硬约束（执行期注意）

- **UI 形态**：识别卡固定展开、无折叠控件；粘贴框最小 3 行、随内容增高、最大 8 行/160px 后内部滚动；文本上限 20,000 字符；材料盒累加、固定发本轮。
- **计数口径**：累计 20 张 = 待识别 + 已包含；`清空输入` 只清待识别材料并释放槽位；`清除全部` 材料、结果、计数一起归零，3s 二次确认。
- **叠加口径**：只发本轮新材料；结果合并；旧字段不清空；同字段不同值保留旧值，`改用本次` 才替换；无全量重跑、无单独清结果。
- **模型口径**：只列 `dsh:` 且宿主 `inputModalities` 含 `image` 的模型；默认当前 `vlm_model`，否则第一个视觉模型；纯文本也走同一视觉模型；无视觉模型禁用，不退回文本模型。
- **路由口径**：`POST /dsh-harness-rag/config/recognize`；24 MiB body；同源校验；单次 3 图/5 MiB/10 MiB；只发本轮材料；temperature 0、maxTokens 3000、可选 `reasoning_effort`（off/档位；跟随不发）、无 tools；客户端 60s 超时。
- **安全口径**：文本在客户端本地打码（前缀/键值上下文，不泛化打码 Model ID/URL/哈希）；截图无法打码，UI 明示不要粘贴含 Key/令牌的截图；模型输出 schema 无密钥字段；不把模型原文、粘贴内容或 Key 写日志/落盘。
- **落盘口径**：截图走宿主附件库，与聊天同库；无 durable delete/GC；识别文本/结果/UI 预览状态不落盘、不写 localStorage。
- **提交候令**：英文 Conventional ASCII；不推送；只 add 本笔文件；提交前核 `git status` 与 `git diff --cached --stat`；不卷入 R2/R3/R5 与 v0.1.3 发布面回退。
- **版本**：本 plan 不 bump `package.json`、不打 tag、不发布；版本与发布另按窗口处理。

**校验口径**：宿主纯逻辑与 route 用 `tests/config_recognize.test.ts`（RED→GREEN＋neuter）；全量 `node --test tests/*.test.ts`（Task 0 基线 314，Task 1 后 334）＋`node --check client.js`＋`tsc -p tsconfig.json`；浏览器侧用仓外 hostless probe 与隔离 DSH 沙箱（fake provider）验收。

---

## Task 0 — 落点核实（只读＋回填）

> 动到的文件：无。
> **验收对应**：spec §2 全部现状引用、§5.3 19。

- [x] 工作树基线：HEAD `f9ef9d9`；Task 0 期间出现并行 `client.js` 改动，随后从工作区退出；最终为本 spec/plan 未跟踪；`package.json` 0.1.2；R2/R3/R5 已在 HEAD；v0.1.3 发布面已撤回。
- [x] 设置抽屉落点：`dshGroup` 之前的插入位置、`hrag-set-body` gap 12、settings 关闭即卸载（`settingsOpen ? ModelSettingsPanel`）、`update`/`updateVideo` 的函数式 setState。
- [x] 四处 provider 行：向量/重排 `legBlock`、解析 `pickerControl`、ASR 的 `DshMenu`；`fieldRow` 当前为 132px + 1fr grid；确认 `trail` 变体的实际插入点和 ASR 包装方式。
- [x] 面板拖拽冲突：panel root 的 `onDragOver`/`onDrop`、`handleUpload` 触发条件、`dragActive`/`dragProbe` 状态；确认卡片全链 `stopPropagation` 后不会残留遮罩。
- [x] 模型与视觉筛选：`modelsConfigQ` 的 `managedModels`、`supports_vision`、`dsh:` 别名；`buildCatalog` 的 `inputModalities`；确认 route 与客户端筛选同源。
- [x] 宿主 route 面：`registerModelProxy` 的 `whenReady`/`getCatalog`/`refresh`、`ProxyModel`、`buildGenerateOptions`/`collectCompletion`/`mapFailure` 导出；`checkPrivilegedRequest` 从 `kb_proxy` 导出、`HarnessRagError` 从 `src/http.ts` 导出——改为直接复用，不逐条复刻。
- [x] 附件面：宿主运行时 `admitPromptContent`（`model_proxy` 已在用）与本地 `@deepseek-ai/dsh-attachment` 类型缺口；`ImageBlock`；host 默认 20 MiB/20 张/200 MiB/8192px、归一化 ≤4 MP/≤4 MiB；无 durable delete。
- [x] 路由限制：`kb_proxy` 1 MiB、`model_proxy` 64 MiB、`webServer.register({kind:'prefix'})`；确认新 route 24 MiB 的读体实现不复用 `callOp`。
- [x] 词条/样式底座：`set.*`/`guide.*` 现有键、`--hrag-surface`/`--dsw-alias-border-l3`/`--dsw-radius-md`、`.hrag-ev-linkbtn` 11px（不复用）、`hrag-btn-primary`、focus ring。
- [x] 测试底座：`tests/model_proxy.test.ts` 的 fake `webServer`/`llm`/res/req 写法；补 fake `attachments`；基线 `node --test tests/*.test.ts` 数字与 `tsc` 结果。
- [x] 沙箱与证据：确认 fake provider 声明视觉能力的方法、隔离 `DSH_HOME`/端口、截图与日志落到仓外 `E:/hrag-settings-*`；不碰用户正在运行的实例。
- [x] 基线测量：198px 面板下设置抽屉宽度、576px 抽屉、provider 行当前 control 宽、textarea 现有样式；确认 198px 档既有 baseline（实测 body clientWidth 161 / scrollWidth 223，已有溢出，只记录不扩修）。

**实测（2026-10-27）**：

- **工作树/版本**：HEAD `f9ef9d9`；`package.json` 0.1.2；Task 0 期间短暂出现快速开始并行改动，随后从工作区退出；Task 0 收尾与 Task 1 期间 `client.js` 干净；本笔未触碰该文件。
- **设置抽屉落点（当前工作树行号）**：`update`/`updateVideo` 18680/18683、`fieldRow` 18756、`pickerControl` 18768、`legBlock` 18813、`dshGroup` 18968、`hrag-set-body` 19598、`settingsOpen ?` 22918；CSS `.hrag-set-body` gap 12 在 2788、`.hrag-set-row` 132px + 1fr 在 2800；`settingsOpen` 关闭即卸载成立；`update` 为函数式 `setValues`。
- **四处 provider 行**：向量/重排行 18832-18841（`legBlock` 内 `fieldRow`+`pickerControl`）；解析 19290-19296（`pickerControl`）；ASR 19424-19453（`DshMenu` 直接挂在 `.hrag-set-field`，无 `.hrag-set-controlwrap`）；`fieldRow` 目前只认 `nested`/`info`，`trail` 需新增。
- **解析条件与枚举**：`mineru-local` 分支 19297-19325（tier 生效、language/version/token 锁定）；云分支 19326-19369（tier 锁定、language/version/token 生效）；`RAG_PARSE_LANGUAGE_OPTIONS` 19713 全 16 值、`RAG_PARSE_VERSION_OPTIONS` 19717 `['', 'pipeline', 'vlm']`。
- **拖拽冲突**：`handleUpload` 21580；`panelDragOver` 21724、`panelDragLeave` 21742、`panelDrop` 21748（drop 直接 `handleUpload`）；根节点 22599-22601 挂三件；`dragFeedbackOn` 22525/`hrag-root-drag` 22597。卡片只 `stopPropagation` 会绕过根 `panelDrop` 的 `dragActive` 复位——Task 4 必须同时清根拖拽态（回调或 root 目标判定），否则遮罩可能残留。
- **模型/视觉筛选**：`modelsConfigQ` 18284、`managedModels` 18287、`hasVisionModel` 19389、`ragIsCaptionCapable` 20140；数据源自 `listModelsConfig`（引擎 `/api/models/config`），`model_sync` 把 `inputModalities.includes('image')` 写成 `supports_vision`；宿主 `ProxyModel.inputModalities` 同源。沙箱 fake provider 声明 `input: [text, image]`，设置页 VLM 行显示「使用配置默认」而非「没有视觉模型」，DSH 组显示「已发布 1 个模型」。
- **宿主 route 面**：`registerModelProxy` 返回 `{token, whenReady}`；runtime 有 `getOrigin/getBaseUrl/refresh/getCatalog`；`buildGenerateOptions`/`collectCompletion`/`mapFailure` 均导出；`checkPrivilegedRequest` 导出；`HarnessRagError` 在 `src/http.ts` 导出（不是从 `kb_proxy` 导出），可直接复用。
- **附件面**：本地 `@deepseek-ai/dsh-attachment` 类型只有 `validateImage/saveImage/readImage`，无 `admitPromptContent`；宿主 `app.asar` 检出 `admitPromptContent` 9 次及 `maxImagesPerMessage`/`maxImageBytes`/`maxMessageImageBytes` 字段；`model_proxy` 以本地 `AttachmentsLike` 接口 + `ctx.get('attachments')` 兜住类型缺口；无 durable delete。
- **路由限制**：`kb_proxy` 1 MiB（348）、`model_proxy` 64 MiB（635），两者均 `kind:'prefix'`；新 route 24 MiB 自读 body，不复用 `callOp`。
- **样式/词条**：`--hrag-surface`/`--dsw-alias-border-l3`/`--dsw-radius-md`/focus ring 均在；`.hrag-ev-linkbtn` 11px（不复用）；`.hrag-set-row-trail`/`.hrag-set-controlwrap`/`.hrag-set-consoles` 尚不存在；设置页当前无 textarea，底座 `.hrag-ev-textarea` 为 52px 下限/`resize:vertical`/6×8 padding/12px。
- **测试基线**：`node --test tests/*.test.ts` 314/314 通过（14.4s）；`tsc -p tsconfig.json` exit 0；`node --check client.js` exit 0；日志 `E:/hrag-settings-task0/tests.log`、`tsc.log`。
- **沙箱**：`DSH_HOME=E:/hrag-settings-task0/dsh-home`（external，fake KB 18080，3081，Chrome CDP 9225）；不碰用户实例。实测 198px 面板：modal 168、body rect 166/clientWidth 161/scrollWidth 223、provider 行 control 0（既有横向溢出）；576px 面板：modal 546、body client 539/scroll 539、行 485、control 343；757px 面板：modal 602、body client 595/scroll 595。结论：spec 原写「150px 抽屉」偏小，实际 198 档 body clientWidth 161 且本已溢出；Task 5 只验不新增溢出。
- **行号**：并行改动退出后，当前工作树行号与 spec 头部（HEAD `f9ef9d9`）一致。

## Task 1 — 宿主识别纯逻辑与单测（RED→GREEN）

> 动到的文件：`src/config_recognize.ts`（纯逻辑部分）、`tests/config_recognize.test.ts`。
> **验收对应**：spec §4.3、§4.4 请求校验、§4.5 输出校验、§5.2 8/13/14。

- [x] 先写失败用例：provider/URL/维度/enum 校验；`parse_tier` 仅 `mineru-local`；`parse_language` 全 16 值；`parse_model_version` `pipeline/vlm`；条件字段丢弃并 warning；ASR 本地引擎菜单外 warning；`dimensionVerdict` 不可用时保留 + warning；未知键丢弃；`null`/空值跳过；URL userinfo/长度；`no_fields` 返回空 fields。
- [x] 先写失败用例：请求体边界（文本 20k、3 图、5 MiB/图、10 MiB/轮、PNG/JPEG/WebP/GIF、canonical base64、24 MiB body）与模型输出 JSON 容错（围栏、前后说明、截断、非 JSON）。
- [x] 实现 `src/config_recognize.ts` 的纯函数：`buildSystemPrompt`、`parseModelOutput`、`validateRecognizedFields`、`buildPromptContent`、`normalizeModelAlias`；不接 `webServer`、不调 `llm`。
- [x] 让 RED 变 GREEN；补 `config_recognize` 的错误码与 warning 结构单测；确保 `provider_credential`/`empty_response`/`image_admission_failed`/`catalog_unavailable`/`model_call_failed` 映射有覆盖。
- [x] neuter 一次：临时去掉 `parse_tier` local 条件或 `parse_language` 全枚举，确认对应用例失败；恢复后全绿。
- [x] 门禁：`node --test tests/config_recognize.test.ts`。

**实测（2026-10-27）**：

- **RED**：模块未建时 `ERR_MODULE_NOT_FOUND`，20 用例未进入执行。
- **GREEN**：`node --test tests/config_recognize.test.ts` 20/20；全量 `node --test tests/*.test.ts` 334/334（14.2s）；`tsc -p tsconfig.json` exit 0。
- **neuter**：把 `parse_tier` 的 `mineru-local` 条件临时放开为任意 provider，test 13「parse conditions」失败（19/20）；还原后 20/20。
- **文件**：`src/config_recognize.ts` 621 行、`tests/config_recognize.test.ts` 463 行；纯逻辑未引用 `webServer`/`llm`，仅复用 `mapFailure` 与 `model_proxy` 的导出。
- **边界**：文本 20,000 恰过/20,001 拒、3 图恰过/4 拒、单图 5 MiB 恰过/+1 拒、本轮 10 MiB 恰过/+8 B 拒、24 MiB body 恰过/+1 拒、PNG/JPEG/WebP/GIF 接受、SVG 拒、`abc` 非 canonical 拒。
- **附加**：`validateRecognizeRequest`、`mapRecognitionFailure`、`mapImageAdmissionFailure`、`catalogUnavailableError`、`attachmentsUnavailableError`、`unknownModelError`、`modelNotVisionError` 已在 Task 1 落地，Task 2 直接接 route。

## Task 2 — 宿主识别 route 与注册（RED→GREEN）

> 动到的文件：`src/config_recognize.ts`（route/注册）、`src/index.ts`、`tests/config_recognize.test.ts`。
> **验收对应**：spec §4.4、§4.5、§5.2 9/13/15、§5.3 17。

- [x] 先写 fake host route 用例：`webServer.register`、`llm.stream`、fake `attachments.admitPromptContent`；覆盖成功、纯文本、图片准入、模型不存在、非视觉模型、attachments 缺失、跨域 403、非 JSON 415、body 24 MiB 413、3 图/5 MiB/10 MiB、canonical base64、空 fields 200。
- [x] 实现 `registerConfigRecognize(ctx, modelProxy)`：`ctx.inject(['webServer','llm'])`；route `POST /dsh-harness-rag/config/recognize`；自读 24 MiB body；直接复用 `checkPrivilegedRequest`（content-type / sec-fetch-site / origin-host）与 `HarnessRagError`（`src/http.ts`）；method 405。
- [x] 模型解析：等待 `modelProxy.whenReady`，用 `getCatalog()`/`refresh()` 找 `dsh:` alias；检查 `inputModalities` 含 `image`；缺失/非视觉分别返回 `unknown_model`/`model_not_vision`。
- [x] 调用：构造 system/user 消息与 `image_url` data URL；`buildGenerateOptions(..., admit)`；`sessionId` 固定一次；`temperature:0`、`max_tokens:3000`、可选 `reasoning_effort`（复用代理的 `selectEffort` 校验/就近映射；跟随不发）、无 tools；`collectCompletion(llm.stream)`；`finish=error/aborted` 走 `mapFailure`；空响应返回 200 空 fields。
- [x] 输出：校验后的 `{fields,warnings}`；不返回模型原文/reasoning/usage；不写日志；不把粘贴内容或 Key 写入错误 detail。
- [x] 注册：`src/index.ts` 在 `registerModelProxy` 之后一行 `registerConfigRecognize(...)`；不改 `kb_proxy`。
- [x] 门禁：`node --test tests/config_recognize.test.ts tests/model_proxy.test.ts`；neuter `model_not_vision` 或同源检查，确认失败后恢复。
- [x] `tsc -p tsconfig.json` 零错。

**实测（2026-10-27 已回填）**：路由用例 10 条（`tests/config_recognize.test.ts` 21–30）全过，fake host 覆盖 register / `llm.stream` / attachments 与成功、纯文本、图片准入、模型缺失/非视觉、attachments 缺失、405/415/403/413、3 图与大小上限、canonical base64、空 fields 200（用例随实现落盘、未单独留首跑 RED 日志；敏感点红证据由 neuter 提供）；neuter `model_not_vision`（`src/config_recognize.ts:750`）后 30 中 29 过、用例 25 失败，恢复后 `config_recognize + model_proxy` 47/47；`tsc` 零错；全量 344/344（首跑 343/344 为 `runtime_supervisor.test.ts:793` 端口重试抖动，单跑 37/37、复跑全量 344/344）；文件 822 / 805 行。证据：`E:/hrag-settings-task0/{task2-green.log,task2-neuter.log,task2-restore.log,task2-tsc.log,task2-full.log,task2-runtime-rerun.log,task2-full2.log}`。

## Task 3 — 浏览器厂商链接（spec 段 A）

> 动到的文件：`client.js`（静态表、四处 provider 行、CSS/i18n）。
> **验收对应**：spec §4.1、§5.1 1–4。

- [x] 加静态表 `RAG_PROVIDER_CONSOLES`：`dashscope`/`volcengine-ark`/`mineru-cloud`，URL 按 spec §4.1.2；只接受 https，不读配置、不拼 URL。
- [x] `fieldRow` 加可选 `trail`；新增 `.hrag-set-row-trail` / `.hrag-set-controlwrap` / `.hrag-set-consoles`，只在有链接的行启用；不改全局 `.hrag-set-row`。
- [x] 向量/重排（`legBlock`）、解析（`pickerControl`）、ASR（`DshMenu`）四处接入；12px secondary 下划线、hover label-primary、focus ring、`window.open(url,'_blank','noopener')`、`title`/`aria-label`。
- [x] 识别结果 provider 行复用同一链接表（卡片内唯一厂商链接位置）。（Task 4 已接线：结果行显示「控制台 ↗」，沙箱复核 aria-label 与跳转地址）
- [x] 词条：`set.providerConsole`、`set.providerConsoleOpen`、`vendor.*` 及 aria/title 模板。
- [x] 探针：四行按 provider 显隐、URL 正确、窄/宽档换行不压扁、键盘可达；`node --check client.js`。

**实测（2026-10-27 已回填）**：显隐——向量/重排 dashscope、向量 volcengine-ark、解析 mineru-cloud、ASR dashscope 显示；向量 openai-compatible、解析 mineru-local、ASR funasr 隐藏；点击 URL 捕获为三个静态 https 地址。几何——576px：链接 48×20 与 picker 同行、右缘 gap 0、body 538/538 无溢出；360px：链接换到下一行右对齐、gap 0，picker 宽 126（省略号来自既有列宽，非链接挤压）；198px：modal 167、body client 160/scroll 223（Task 0 基线 161/223，scrollWidth 持平；控件列 0 宽为既有退化，链接随同一裁切，无新增横向溢出）。键盘——picker 焦点后 Tab 落到 `.hrag-set-console`，`:focus-visible` 为真；本沙箱宿主的 `--dsw-focus-ring-color` 为空，box-shadow 计算为 none（与既有 `.hrag-guide-action` 同变量同现象）。`node --check client.js` 0。10-27 裁定：指南次入口不用，指南区不做链接改动；裁掉后浏览器复核指南 0 个厂商链接、设置页仍 3 个 `控制台 ↗`。证据：`E:/hrag-settings-task0/{task3-probe.json,task3-measure-576.json,task3-measure-360.json,task3-measure-198.json,task3-settings-576.png,task3-settings-360.png,task3-settings-198.png}`。

## Task 4 — 智能识别卡与客户端请求（spec 段 B）

> 动到的文件：`client.js`（卡片组件/状态、结果表、请求、打码、CSS/i18n）。
> **验收对应**：spec §4.2、§4.5、§4.6、§4.7、§5.2 6–16。

- [x] 卡片：`hrag-set-body` 顶部、`dshGroup` 前，固定展开、无折叠；标题/说明；配置 loading/error 不渲染。
- [x] 输入：textarea 最小 3 行、随内容增高到 8 行/160px、超出内部滚动、`maxLength=20000`（10-27 他裁去掉右下角字符计数）；`onPaste` 文本+图片；`选择图片` 文件选择器；缩略图 ×；拖拽全链 `preventDefault`+`stopPropagation`，并把根 `dragActive`/`dragProbe` 复位（`stopPropagation` 会绕过 `panelDrop` 的既有复位，否则遮罩可能残留），不触发面板上传/toast/遮罩。
- [x] 材料状态：pending/included、轮次、累计 20（A 口径）、单轮 3/5 MiB/10 MiB、类型；`清空输入` 只清 pending；`清除全部` 3s 二次确认并归零；已包含只读可展开，无单条删除。
- [x] 模型：复用设置页同一枚 `LegPicker`（根页「模型 / 推理等级」两格 → 模型页/档位页）；只列 `dsh:` + `supports_vision`；默认 `vlm_model` 或首个视觉模型；档位本地状态并随请求下发（`Off`→`"off"`、`Default`→不带、档位→id）；无视觉模型禁用并提示。
- [x] 请求：独立 `fetch('/dsh-harness-rag/config/recognize')`，不经过 `callOp`；只发本轮；60s `AbortController`；错误映射；图片转 canonical base64；发前本地打码（前缀/键值上下文；保留 Model ID/URL/哈希）；不发 Key、不写日志。
- [x] 结果：合并规则（新字段/相同/冲突/未提及）、`改用本次`、按当前表单值重算勾选、空 fields 空态、warnings 行、`第 N 轮`/`本轮`、provider 链接；应用选中（provider 先写，model/地址后写，无菜单副作用，滚到首个改动字段）；provider 有值而 model 无值时保留旧 Model ID + warning。
- [x] 词条：spec §4.7 全表（含 `form`/`warning`/`roundPrev`；`chars` 已于 10-27 修订 3 删除，`sent`/`expand`/`collapse` 于 10-27 结果表续修订删除）；不写 localStorage；关闭抽屉状态清空。
- [x] 探针/沙箱：固定展开、无折叠控件；textarea 增高与上限；材料累加；清空两档；结果合并/冲突；应用后表单草稿与右上角保存；`node --check client.js`。

**实测（2026-10-27，隔离沙箱 fake vision provider；证据 `E:/hrag-task4/evidence`）**：
- 卡片几何：576 档 body 538/538 无横向溢出；360 档 322/322、行自动换行；198 档 body 223（Task 0 基线同为 223）、卡片 scrollWidth=clientWidth=130、结果区 106。修 `.hrag-smart-rowmeta`（`min-width:0`＋`overflow-wrap:anywhere`）前 198 档长 URL 冲突行把溢出顶到 241，修后回基线。
- textarea：1 行 88px（min-height）；30 行封顶 160px、内部滚动（scrollHeight 630/clientHeight 158，overflow auto）；`maxLength=20000`（10-27 起不显示字符计数）。
- 材料上限：单轮第 4 张 →「本轮最多 3 张截图，累计最多 20 张。」且只收 3；5 MiB+1 →「单张不能超过 5 MiB。」；`text/plain` →「只支持 PNG / JPEG / WebP / GIF。」；6 轮×3 张后 included=18，再加 2 → 20，再添 1 被同一文案拦下。
- 粘贴/拖拽：同时含图片与文本的 paste → 图片进待识别、文本进文本域（修 onPaste：带文件时读取 clipboard text 并在 20000 处截断）；拖入时仅卡片描边、根 `.hrag-root` 无 `hrag-root-drag`、无 toast；dragleave/drop 后卡片描边与根拖拽态均复位。
- 清空两档：`清空输入` 清文本与待识别图片，结果/已包含不动；`清除全部` 首点变「再点一次清除全部」，3s 内二点后结果、已包含、计数归零。
- 合并/冲突：两轮合并 11 行（单轮 9 行）；同字段不同值保留旧值并显示「上次/表单：X；本次：Y 改用本次」，点击后行值替换、meta 清除、勾选保留；表单当前值不同则默认不勾（向量/ASR provider），表单为空则勾；同值行无勾选框并标「无变化」；未提及字段原样保留。
- 应用：勾选项写入草稿——provider 先写、model/地址后写（ASR `funasr`→`dashscope` 后 model=`paraformer-v2` 仍在）；维度 2048 在高级区可见；状态行「已填入 9 项；还需手动填写：API Key（向量）、API Key（重排）、MinerU 解析令牌、API Key（语音识别）」；应用后滚到首个改动字段（embedding_model 在视口内）；右上角保存未受影响。
- 请求体：fake provider 收到 `stream:true`、`temperature:0`、`max_completion_tokens:3000`；带图轮为 text + 附件说明（本地附件库 `.../attachments/v1/objects/c4/...`）+ `image_url` canonical base64；打码后请求文本含 `sk-***`/`api_key=***`，原密钥串不存在。
- 其他：关闭抽屉/重载后卡片状态归零（组件态、无 localStorage）；`node --check client.js` exit 0。
- 10-27 视觉修订（用户裁）：卡片标题改为灰底分组头带（12/600 secondary，与设置分组头同款并左对齐）；说明正文收进标题 `title` 悬浮提示；删除模型/附件隐私行（no-vision 文案保留）；沙箱截图 `E:/hrag-task5b/card-new.png`。
- 10-27 视觉修订 2（用户裁，输入区改 DSH 会话输入框同款）：宿主 composer 属 `dsh-client-ui-conversation` 的会话内部组件（`SessionInputShell`/`DraftEditor`，不对外导出，插件模块表只有 `react` + `dsh-client-ui-primitives`），故按宿主源码几何用插件元素复刻：composer 壳体 `--dsw-radius-panel` 28px＋`--dsw-specific-input-major` 白底＋`--dsw-elevation-soft` 软阴影；文本框透明无边框、padding 4/8/22/14、caret business primary；底部工具行左 `+` 28×28（`--dsw-specific-selector` 底）→ 右模型 chip（13/400、chevron 12、max-width 220）+ 清空 28×28（垃圾桶）+ 识别 34×34 蓝底箭头（`--dsw-alias-button-info-fill`、translateY(-2)、disabled .4）；原「选择图片」文字钮与「清空输入」文字链退役，选择图片改由 `+` 承担 aria/title；识别钮只显图标，aria/title 带材料数（如「识别新增（1）」），识别中工具行显示「识别中…」并禁用输入/上传/清空。
- 10-27 composer 实测（隔离沙箱 `E:/hrag-task5c`，已清理；证据 `E:/hrag-task5/evidence/task5-composer-*.png`、`composer-geometry-20261027.json`）：576 档卡片 567、composer 541×138（radius 28、白底、elevation-soft 阴影）、textarea 88（min）、`+` 28px/底色 `rgb(245,246,247)`、send 34/`rgb(65,118,230)`/translateY(-2)；真面板最小 299（设置面 269、卡 234）时工具行单行（+28、chip 76、清空 28、识别 34、无溢出）；模拟卡 198 时 chip 收至 44px（省略号）仍单行、无横向溢出；有图时缩略图行在文本框与工具行间（卡 257）；busy 时「识别中…」在工具行左端且输入/上传/清空/识别四件全禁用；send title「识别新增（1）」。本轮沙箱按发布态 `lib/` 启动（未重建），点识别下发请求即 405（旧宿主无新路由），识别链路沿用 Task 5 的 `src` 入口验收；形态与状态机为本轮结论。
- 10-27 视觉修订 3（他裁：样式问题只限智能识别容器，其他容器只改文案；识别卡下拉照设置页「完全同款」）：识别模型改用与腿选择器同一枚 `LegPicker`（不再是平坦列表，也不是只开模型页的 `modelsOnly` 快捷形态）——点开先见根页「模型 / 推理等级」两格，再下钻模型页（搜索/厂商分组/打勾）与档位页；模型与档位都是识别卡本地状态（不写 VLM 腿/表单），档位随识别请求下发（`Off`→`"off"`、`Default`→不带、具体档→档位 id），宿主 `config_recognize` 新增可选 `reasoning_effort` 并复用代理的 `selectEffort` 校验/就近映射。同时去掉文本框右下角 `0 / 20000` 字符计数与其 i18n（`maxLength=20000` 仍在，textarea padding 改 4/8/0/14）。其他容器仅「思考档位→推理等级」文案，LegPicker 样式/菜单/等宽未改（前一轮对齐宿主的改动已整体回退，`2026-10-21` spec 样式段落已还原、只留文案修订）。实测（隔离沙箱 `E:/hrag-task5g`，已清理）：576 档 chip 213×28（长模型名，模型名＋档位＋chevron、13/400、`rgb(97,102,107)`、padding 0 2 0 8、radius 8），根页 320×76（两格 312×34：「模型 DeepSeek V4 Flash Vision Exp」「推理等级 Default」）；档位页 320×206（Off/Default/Low/Medium/High）；模型页 320×391（搜索框、两组厂商、9 项）；选 High→chip/aria「High」且请求体 `reasoning_effort:"high"`，选 Off→`"off"`，选 Default→请求体无该字段；560 视口根页 x207–527 不越界；模拟 198 卡 chip 收窄、工具行单行无溢出；设置页 provider 选择器 343/343 等宽、leg 根页仍两格。宿主用例：带 `reasoning_effort:"high"` 透传到 `GenerateOptions.reasoningEffort`；非法档位 400 `invalid_request`。证据：`E:/hrag-task5/evidence/task5-smart-picker-{composer,root,effort,model,root-560}.png`、`smart-picker-geometry-20261027.json`。
- 10-27 视觉修订 4（他裁：圆角对齐设置卡并换按钮）：输入区从宿主会话 composer 形态改为设置卡族——`--dsw-radius-md`（当前主题实测 12px，与 `.hrag-smart`／`.hrag-set-group` 同值）、0.5px `--dsw-alias-border-l3`、`--dsw-alias-bg-layer-1`、去 `--dsw-elevation-soft`；`+` 28 圆钮→26×26 方形 ghost；清空从工具行 28 圆垃圾桶→文本区右上角 20×20 ×（有文本或待识别图时出现，点掉清空文本+待识别图）；识别 34 圆箭头→26px 文字主钮「识别」（`hrag-btn hrag-btn-primary hrag-btn-sm`，宽 40；新增词条 `set.smart.recognize`）；窄档档位文字先收、模型名保留（`.hrag-smart-trailing .hrag-legpick-effort` flex-shrink 8＋min-width 0＋省略号）。实测（隔离沙箱 `E:/hrag-task5h`，已清理；证据 `E:/hrag-task5h/evidence/smart-composer-{final-wide,final-card198,clear-576,560}.png`）：宽档卡 500.5、composer 475.5×133（radius 12、border 0.5、shadow none、白底）、chip 135.9（模型名 71.6／档位 38.3）、`+` 26、识别 40×26、× 20；560 视口 composer 469.5、工具行无溢出；模拟 198 卡（composer 173、bar 172）chip 74（模型名 48／档位 0）、识别 40、× 20、无横向溢出；点 × 后文本清空、× 消失、识别禁用；模型弹层根页仍 320×76 两格、仍挂在 trailing 内但无 `.hrag-legpick-effort` 列表元素受影响。门禁：`node --check client.js` 0、`tsc` 0、`node --test` 347/347。
- 10-27 视觉修订 5（他裁：厂商控制台链接统一移入识别卡尾栏，样式参考快速开始）：设置页向量/重排/解析/ASR 四处行尾 `控制台 ↗` 全部撤销，`fieldRow` 的 `trail` 机制与 `.hrag-set-row-trail`/`.hrag-set-controlwrap`/`.hrag-set-consoles` 一并删除（`.hrag-set-console` 保留给识别结果行动态链接）；`.hrag-smart` 末尾新增 `.hrag-smart-foot`（label「厂商控制台」＋阿里百炼/火山方舟/MinerU 三枚胶囊，与指南页脚共用同一组 chip CSS 选择器、20px/11px/radius 999/border-l3/无下划线），负边距贴齐卡片左右下缘、无分割线、上下各 8px（卡片 gap 8；尾栏 `padding: 0 12px 8px`；原 16/12 已收紧到 8/8）；尾栏始终渲染。实测（隔离沙箱 `E:/hrag-task5k`，已清理；证据 `E:/hrag-task5k/evidence/smart-footer-8-8-{wide,card198}.png`、`smart-footer-geometry-20261027.json`）：宽档卡 500.5×208.5、尾栏 499.5×28（x=724 贴齐内缘；label 55×16、三 chips 72.1/72.1/64 ×20；composer 底到 chips 8px、chips 底到卡底 8.5px、border-top 0）；四处 provider 行 `.hrag-set-console` 计数=0、卡片外计数=0、行内控件 333.5 宽无回归；三 chips 点击 URL/`_blank`/`noopener` 全对；模拟 198 卡尾栏 197×54 换两行（label+阿里百炼 / 火山方舟+MinerU）、前后仍 8/8.5、`scrollWidth=clientWidth=197` 无溢出；chips 计算样式 20px/11px/999/0.5px l3/无下划线。同时 spec §5.1 指南条回写为「页脚胶囊保留且与尾栏同款」，原 Task 5 记录的冲突消除。门禁：`node --check` 0、`tsc` 0、347/347。
- 10-27 视觉修订 6（他裁：合并「DSH 模型」与「RAG 默认模型」两个容器）：`defaultModelGroup` 退役，默认模型改为 `dshGroup` 内一行——`fieldRow` 标签「RAG 默认模型」＋原 `modelsOnly` LegPicker，`data-hrag-field=default_model`，默认模型说明挂标签 `title`；组顺序变为 `dshGroup（含默认模型行）→ retrievalGroup → … → servicesGroup → saveStatus`，`set.group.default` 词条（zh/en）随之删除，组标题仍为「DSH 模型」。实测（隔离沙箱 `E:/hrag-task5m`，已清理；证据 `E:/hrag-task5m/evidence/merged-models-wide.png`、`merged-default-menu.png`、`merged-models-20261027.json`）：设置页 6 个组；DSH 卡片 567×121（标题 565×29 → 10px → 状态行 541×26 → 10px → 默认模型行 541×32），标签 132×20、picker 399×32；picker 菜单 399×269，选项「使用配置默认＋sbx-pro/sbx-flash/sbx-reasoner/sbx-mini」，两个厂商分组；改选 `sbx-flash` 后字段值即时更新、菜单关闭；198 档 body scrollWidth 223＝既有基线，无新增整体溢出（行内 132px 标签溢出与既有设置行同款，不重排）。同一轮确认「RAG 默认模型」保持单档（`modelsOnly`，无根页/档位格）：引擎 `RagConfigFile` 没有 `default_thinking` / `default_reasoning_effort`，档位只在五条腿各自行上，第二格没有保存落点；2026-10-27 他拍定保持单档。门禁：`node --check` 0、`tsc` 0、347/347。
- 10-27 视觉修订 7（他裁：粘贴图片应显示在输入区上方）：`pending` 缩略图行从「文本域之后、工具行之前」移到「文本域之前、输入区顶部」，DOM 顺序改为缩略图→textarea→清空 ×→工具行；`.hrag-smart-pending` padding 由 `8px 12px 0 14px` 改为 `0 30px 6px 14px`（顶部由 composer 的 8px 承担，底部 6px 与文本域分隔，右侧 30px 避让清空 ×）。实测（隔离沙箱 `E:/hrag-task5m`，已清理；证据 `E:/hrag-task5m/evidence/composer-image-top-{wide,3-wide,198}.png`）：宽档 composer 541×198，缩略图行 539×64（3 张 58×58，首张 x=841.5/y=164），距 composer 顶 9px，缩略图底到文本域 6px，文本域 539×88，工具行 539×36；清空 × 20×20 在右上角、与第三张缩略图不重叠；198 模拟档每张缩略图单行换行、pending 105×192、composer 105×326，`scrollWidth=clientWidth` 无横向溢出，body scrollWidth 223＝既有基线。门禁 347/347＋tsc 0＋`node --check` 0。
- 10-27 小件（他提：⋯ 菜单加「项目仓库」）：`DshMenu` 最后一项（「功能模型设置」之后）加 `id:'repository'`，图标 `dshRightUpIcon`（右上箭头＝跳转语义），点击 `window.open(RAG_REPOSITORY_URL, '_blank', 'noopener')`；地址为静态常量 `https://github.com/chenzhiya77/dsh-harness-rag`，不读配置、不拼 URL；zh/en 词条 `menu.repository`。实测（隔离沙箱 `E:/hrag-task5m`，已清理；证据 `E:/hrag-task5m/evidence/menu-repository.png`、`menu-repository-20261027.json`）：菜单 8 项、项目仓库在末项；点击捕获 URL/`_blank`/`noopener`，菜单收起；页面不跳走。门禁 347/347＋tsc 0＋`node --check` 0。
- 10-27 视觉修订 9（他裁：项目仓库移到「功能模型设置」上方）：底部末项保留「功能模型设置」以维持底部肌肉记忆，避免想点设置却误开外链；`repository` 与 `settings` 交换顺序，分隔线、图标与点击行为不变。随附文档同步：README ⋯ 菜单顺序改为「… / 项目仓库 / 功能模型设置」，手册改为「菜单里『功能模型设置』上方的『项目仓库』」。实测（隔离沙箱 `E:/hrag-realstack`，已清理；证据 `menu-order-20261027.png`）：菜单 8 项，项目仓库第 7、功能模型设置第 8（末项）；`node --check client.js` 0。
- 10-27 真栈冒烟（真实视觉模型，非 fake provider）：隔离 `E:/hrag-realstack`，真 DSH web 3087 + fake backend 18080（仅提供设置配置与真实别名清单），provider 凭据从 `~/.dsh` 复制、跑完删除；模型 `dsh:xiaomi/mimo-v2.6-flash`。图文一轮（公开 Chatbox/Bailian 截图 + YAML）6s / 17 项；纯图一轮（合成控制台截图，字段清晰）9s / 16 项，证明图片准入与视觉识别链路；应用 5 项并提示缺重排/稀疏 Key。发现：稀疏 base_url `8080` 被 OCR 成 `8880`；截图未给重排地址时，模型把 embedding 的 compatible-mode 地址推断成 rerank base_url，并默认勾选应用。证据 `E:/hrag-realstack/evidence/real-stack-summary-20261027.json`、`real-recognize-20261027.json`、`real-recognize-image-20261027.json`、`recognize-result-20261027.png`、`recognize-applied-20261027.png`。
- 10-27 真栈修复（他裁：按发现修）：提示词新增「缺 URL 就省略、禁止跨组复用、逐字复制数字」；宿主 `validateRecognizedFields` 新增 DashScope 兜底——`rerank.provider=dashscope` 且 `rerank.base_url` 与 embedding 的 compatible-mode 地址相同（忽略尾部 `/` 与大小写）时丢弃并给 `rerank_base_url_reused` warning；新增单测覆盖复用丢弃、显式 rerank 地址保留、generic-rerank 同址保留。门禁：348/348＋`tsc` 0＋`node --check client.js/lib` 0＋`npm run build:plugin`。OCR 数字误读不设规则，保留逐项确认。修复后真栈复跑（同一合成控制台截图，直打构建态 route）：200，rerank 只剩 provider/model、无 base_url；稀疏 `8080` 仍被 OCR 成 `8880`；证据 `E:/hrag-realstack/evidence/direct-recognize-after-fix-20261027.json`。
- 10-27 固定维度过滤集成测试（他提「补一条固定维度过滤的集成测试」）：把 SmartFillCard 里内联的维度判定抽成 `client.js` 顶层纯函数 `ragSmartDimensionDecision`，行为不变——同 provider 且 verdict 为 `status=ok/type=fixed/native!=null` ⇒ 丢弃识别值并给 `fixed_dimension`；verdict 缺失、`unreachable` 或识别到的 provider 与表单当前 provider 不同 ⇒ 保留并给 `dimension_unverified`；tiered/range ⇒ 原样应用。新增 `tests/client_smart_dimension.test.ts`：用 Node `vm` 加载真实 `client.js`（只桩 `window.__ModuleLoader__`），断言引擎 `probe-dimensions` 的 `fixed 768`、`unreachable`、`null`、`tiered`、`range`、`fixed` 但无 native 与空维度门共 13 个断言。门禁：349/349＋`tsc` 0＋`node --check client.js` 0。
- 10-27 结果表修订（他裁 B；`8806d9d`）：结果头右侧改为命令栏——`全选`/`取消全选` + `应用选中项（N）`（N＝勾选且可应用行数，0 时禁用并显示 0）；组头由 11px tertiary 改为 12/600 secondary＋`{0} 项` 计数；行尾取消逐行「本轮」，仅更早批次标「第 N 轮」；冲突说明移到值列下方第二行（不再占全宽）；行改为固定四列（勾选 14 / 字段 96 / 值 flex / 行尾动作），值列等宽单行省略＋title、窄档保底 120px 换行；行内去掉「控制台 ↗」与「无变化」，一致项不做折叠、全部行始终展开；`set.smart.apply` 改带计数，新增 `groupCount` / `selectAll` / `selectNone` 三键（zh/en），删除 `roundNew` / `unchanged` / `unchangedCount`。门禁：349/349＋`tsc` 0＋`node --check client.js` 0；静态复刻 660/300px 核对（临时文件已清理）；真实 DSH 窗口未驱动（Web UI 401），待他刷新页面复验。
- 10-27 结果表修订续（他裁：去掉第二条状态行、缩小应用钮；`8806d9d`）：删除主体区底部独立「已包含：N 张截图 · M 段文本 展开查看 清除全部」行，已含计数与 `清除全部` 并入卡片标题栏右侧（`.hrag-smart-headmeta`，11px tertiary；`title` 悬浮列出每张图类型/大小与文本段数；`已含 {0} 张截图` · `{0} 段文本`）；`includeOpen` 状态、`set.smart.sent`/`expand`/`collapse` 三键与 `.hrag-smart-included*` CSS 全部删除。结果头标题简化为 `识别结果 · {0} 项`，轮次 > 1 时用 `resultRounds` 显示 `识别结果 · {0} 项 · {1} 轮`（不再固定带「已识别/轮」）；应用钮文案 `应用选中项（{0}）`→`应用（{0}）`→`应用`（纯文字、不显示计数，仍为 `hrag-btn-primary hrag-btn-sm`，无可应用行时禁用）。门禁：`node --check client.js` 0、349/349、`tsc` 0；client.js 24,158 行。

## Task 5 — 门禁与沙箱验收（spec §5 1–19）

> 动到的文件：无（探针/证据在仓外）。
> **验收对应**：spec §5 全部。

- [x] `node --check client.js`；`node --test tests/*.test.ts`（基线 314，Task 0 复核）；`node node_modules/typescript/bin/tsc -p tsconfig.json` 零错。
- [x] fake provider 抓请求：文本已打码、无 `sk-`/`Bearer`/Key；model 为 `dsh:` alias；只含本轮图片；`temperature=0`、`max_tokens=3000`、无 tools；`Default` 轮无 `reasoning_effort`、`High`/`Off` 轮分别带 `"high"`/`"off"`；无旧材料/旧结果；空 fields/warnings/错误码可读。
- [x] 隔离沙箱 UI：四处厂商链接（指南不带链接）；固定展开；textarea 3→8 行/160px；粘贴/Ctrl+V/拖入/选择图片；拖入不触发文档上传；单轮/累计限制；清空两档；模型筛选/无视觉禁用；叠加识别；冲突/改用本次；应用/滚动/保存；关闭抽屉清空。
- [x] 窄/宽档：198px 面板（实测设置抽屉 body clientWidth 161、既有 scrollWidth 223）只验“不新增横向溢出”；576px 面板（modal 546）验链接右挂与结果表换行；不做既有设置行重排。
- [x] 真栈：有可用视觉模型时跑一张 DashScope 控制台截图 + 一段 YAML；无视觉模型时用 fake provider 覆盖并记录残差；不调用真实付费 Key。
- [x] engine `harness-rag` 与主树 `deer-flow` 零 diff；runtime pack 不重建；不夹带 R2/R3/R5 或 v0.1.3 发布面。
- [x] 收尾：杀测试进程树、删临时 `DSH_HOME`/staging/Chrome profile，核端口与磁盘；证据落 `E:/hrag-settings-*`。

**实测（2026-10-27，隔离沙箱 `E:/hrag-task5/dsh-home`，证据 `E:/hrag-task5/evidence`）**：
- 门禁：`node --check client.js` 0；全量 `node --test tests/*.test.ts` 347/347（含识别档位透传与非法档位拒绝 2 条新用例）；`tsc -p tsconfig.json` 0。
- 厂商链接：12 个 provider 状态全对（三家带链接、七家无链接）；URL/`_blank`/`noopener`/面板不跳走；12px secondary 下划线；360 换行 gap 0、198 退化为既有 160/223 不新增溢出；键盘可达。结果表只给识别到的 provider 链接（2 条），无静态目录。
- 指南：10-27 并行重设计已把「厂商控制台」页脚行落进工作树（三链接动作/URL 全对，三步正文未变）——**与 spec §5.1-3「指南不带链接」旧裁定冲突，待 Task 6/指南线回写**。
- 识别卡：固定展开；textarea 88→160px 内滚；配置 500 时只显示「设置加载失败」不渲染卡片；关闭抽屉状态清空。四条输入路径、四种限制（3 张/5 MiB/10 MiB/类型）、累计 18+2=20 禁用添加、超量拦截、20,000 字符截断、两档清空、拖入不上传/无 toast/无遮罩均过。
- 模型：默认 fake-vlm；仅 `dsh:` 视觉模型；纯文本可识别；text-only 配置下显示「无视觉模型」并禁用识别。
- 识别流程：一次点击一次请求；`识别中…` 禁用；成功材料移入已包含；超时 60.2s 后「识别超时，请重试或手动填写。」且文本保留；空 fields 空态；非法/截断 JSON 提示；401/429 归为通用「模型调用失败」（可读、无原文）——列为残差。
- 合并/回填：两轮 9→11 行、未提及字段保留；冲突保留旧值 + `改用本次`；表单空勾/异值不勾/同值无变化；轮间手改表单会重算勾选；应用只写草稿（配置 GET 未变）、provider 先写、切换后 model 保留、滚到首个改动字段、缺失 Key 状态正确；provider-without-model 保留旧 Model 并给 warning。
- 密钥：请求体 4 处 `***`、无原始 `sk-`/`Bearer`/`api_key`/`token`；UI 与表单无密钥；模型返回的 key 字段不出现（隐私行在 10-27 视觉修订中已裁掉，见 Task 4 实测末条）。
- 条件字段：cloud 丢 tier、local 丢 language/model_version、bm25 丢 sparse_*、funasr/whisper 丢 asr_base_url、菜单外 ASR model 给 warning；维度探针不可用时保留识别值并 warning。固定维度 provider 过滤未实跑（无固定维度样本），列残差（10-27 已补客户端集成测试，见 Task 4 末条）。
- 图片/持久化：图片轮只发本轮 1 张（附件说明 + canonical base64），落 `attachments/v1/objects`；抽屉关闭清 UI、附件保留；无识别历史/结果落盘。
- 文案/键盘：zh 与 en 均渲染（Smart fill/Choose images/Results…）；两份字典各 974 键无缺；文本域/按钮/链接/复选框 Tab 可达且 `:focus-visible` 为真；沙箱主题 `--dsw-focus-ring-color` 为空致 box-shadow ring 不可见（复选框为原生 outline；picker `outline:none`）——环境同既有控件，列残差。
- 范围：`engine/`、`scripts/` 零 diff；未重建 runtime pack；工作区只本笔文件。Task 5 当时 `lib/` 未随 src 重建；10-27 晚已补 `npm run build:plugin` 并提交 `49307a9`（见 Task 6）。
- 残差：真实厂商控制台截图未跑（已用公开真实截图 + 合成控制台截图跑真实视觉模型）；OCR `8080→8880`（无可靠规则，保留逐项确认）；401/429 分类码未透出；focus ring 依赖宿主主题变量。
- 快照时点：浏览器验收用 09:27 的 `client.js` 副本（`E:/hrag-task5/plugin`）；并行快速开始线在 09:30 又改指南 go 按钮几何（28×stretch、8px 圆角），本笔卡片/厂商链接区未变（当前文件 `node --check` 仍 0）；Task 6 在指南线稳定后复跑指南相关项。

## Task 6 — 文档、实测回填与提交链

> 动到的文件：本 spec/plan（状态、勾选、实测、行数）、`2026-10-18-tier3-polish-spec.md` / `2026-10-21-rag-leg-effort-spec.md` 的追加注。
> **验收对应**：spec §5.3 17–19。

- [x] 回填 spec Status、plan Status 与各 Task 实测；勾选与 Status 不滞后。
- [x] 量 `git diff --stat`，回填 spec §6 的实际行数（`client.js +1119/−68`；宿主 877＋870＋2 行）。
- [x] 提交前核：`git status --short` 只含本笔文件；`git diff --cached --stat` 与预期一致；不推送。
- [x] 提交后核：Status 不写“未提交”；工作区零残留；不重开 R2/R3/R5 与发布面。

**实测（2026-10-27 提交）**：
- 提交：host `699cb2c`；panel `299f1ee`；docs `4a6a0c6`；build `49307a9`；docs 状态回填＝本次提交。
- 行数：`client.js` +1119/−68；`src/config_recognize.ts` 877；`tests/config_recognize.test.ts` 870；`src/index.ts` +2；`lib/config_recognize.js` 686。
- 构建态：`npm run build:plugin` 通过；`lib/index.js` +2 注册；沙箱以构建态 `lib/` 启动，`POST /dsh-harness-rag/config/recognize` 缺 model → 400 `invalid_request`，带 `dsh:sbxalpha/sbx-pro` → 502 `model_call_failed`（fake provider 未起）——405 消失，路由与模型解析链路已通；`node --check lib/index.js`、`node --check lib/config_recognize.js` 0。
- 对外文档（2026-10-27）：README 与 `docs/plugin-manual.md` 补「智能识别配置」（识别范围 / 分批叠加 / 文本打码与截图风险 / 限制 / 不自动保存）、⋯「项目仓库」入口与「推理等级」措辞；`docs/equivalence.md` 补两条插件增量；README 规模表按当前仓刷新（29 个 TS 文件 / 7,989 行、`client.js` 24,122 行、21 个测试文件）。
- 状态：Task 0–5 与视觉修订 4–9 完成；真栈真实视觉模型已跑通（图文 17 / 纯图 16），并按发现修复提示词与 DashScope rerank URL 兜底；固定维度过滤已补客户端集成测试（349/349）；修复后真栈复跑 rerank 不再带 base_url；真实厂商控制台截图、OCR 偏差、401/429 分类、focus ring 留作残差；`lib/` 已重建（`49307a9` 及本轮宿主修复 `cebbcc1`）。

## 提交链

> 已实施；英文 Conventional ASCII；不推送；哈希随落随记。

1. `feat(host): add the config recognition endpoint` —— `src/config_recognize.ts`、`src/index.ts`、`tests/config_recognize.test.ts` —— `699cb2c`。
2. `feat(panel): add vendor links and smart configuration fill` —— `client.js` —— `299f1ee`。
3. `docs(settings): record the vendor links and smart fill contract` —— 本 spec/plan、两份 tracked spec 注、状态回填 —— `4a6a0c6`。
4. `chore(build): rebuild the plugin lib for config recognition` —— `lib/index.js`、`lib/config_recognize.js` —— `49307a9`。
5. `docs(settings): record the rebuilt lib` —— 本 spec/plan 状态回填 —— 本次提交（哈希见 `git log -1`）。

## 风险与回退

- **宿主类型缺口**：本地 `@deepseek-ai/dsh-attachment` 类型没有 `admitPromptContent`；在 `config_recognize.ts` 声明最小本地接口，运行时缺失时返回 `attachments_unavailable`，route 测试先失败而不是等真机。
- **并行改动**：Task 0 期间出现的快速开始工作区改动已退出（未提交），当前 `client.js` 干净；Task 3–4 开工前照常复核工作树。
- **模型输出不稳定**：maxTokens 3000、可选 reasoning_effort（跟随不发）、JSON 容错；截断/非法 JSON 提示重试，不重试自动。
- **图片成本/隐私**：默认 fake provider；真实模型只在用户实例有视觉模型且授权时跑；截图落附件库无 GC，UI 明示；证据不含真实 Key。
- **拖拽冲突**：卡片全链 `stopPropagation` 并复位面板根拖拽态；沙箱明确验收“拖入不触发面板上传、不残留遮罩”。
- **窄档基线**：198px 面板实测设置抽屉 body clientWidth 161、scrollWidth 223（既有 132px 标签已撑出横向溢出，provider 行 control 为 0）；本笔只保证卡片与链接不新增溢出，不重排既有设置行。
- **外部链接**：`window.open` 失败静默；URL 静态表不拼配置。
- **版本/并行**：本笔不 bump、不发布、不碰 R2/R3/R5 与 v0.1.3 回退；开工前复核工作树。
