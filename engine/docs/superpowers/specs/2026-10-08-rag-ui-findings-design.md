# 验收反馈记录（十三则）：文档表底部状态段 · 切片详情缺口 · 功能模型布局 · VLM 视觉声明 · RAG 会话缺终止键 · RAG 会话缺重新生成键 · 刻度轨间距与显示门槛 · 知识库文档感知缺口（会话侧） · 失败悬停卡「重试」按钮位置 · RAG 思考档位接线（核实） · RAG 模型选择器未对齐（收藏分区） · RAG 会话消息区滑条未隐式化 · RAG 会话流式中输入框禁用

- **状态：** 第一、二节已裁（2026-10-08）——① 乙（常态静默＋不折行加固）② 刻度轨随带恢复 ③ 编辑族仅记录为后置；第三、四节（同日续报）：③ 机制已澄清（＝乙 视图切换；控件形态**已定＝乙-b**〔10-08 用户裁〕）、④ **已裁＝甲**；第五、六节（同日续报，无图）：**已裁**——⑤ 甲（自绘 composer 原地加「流式中发送键变停止键」）、⑥ 乙（「重新生成」＋「编辑重发」；「分支」不取）；根因为「KB 面板未接树内既有能力」（停止／重新生成／编辑重发／分支的链路全在切片树，属纯前端接线）；第七节（同日续报，开发分支实操反馈，无图）：**已裁并已实施**——刻度轨间距 34→26、显示门槛 ≥5（并入压合提交 `624dd2967`；会话轨＋切片轨共用组件一次生效）。第一–六节**未动任何代码、未出执行计划**（用户令「先不要生成 plan」）；第七节已实施；其余待「开工」后另出执行计划；第八节（同日续报，验收实例会话取证，无图）：**核实为真缺口、已裁补**——载体乙（独立成对＋本账留痕）、**并进首期口径（A）**、实现序主树先；设计另立 `../specs/2026-10-08-rag-doc-tools-design.md`（＋同名 plan），本账仅留痕、无代码改动；**（2026-10-08 晚已开工：主树 Task 0–6 全落＋Task 7 收口，真栈两问回归＋追问链＋篇内检索全过，提交链见该 plan）**；第九节（同日续报，图 5）：**已裁并已实施**——甲（同排右收）＝文案与按钮同排两端、按钮收右缘（主仓侧并入压合提交 `624dd2967`；**切片侧改动已撤回**、待 A 批次重放；均未推送）；第十节（同日续报，无图）：**已核实**——RAG 腿无自有档位＝跟随模型条目声明、没声明不发（用户问的「就是默认」成立）；处置**已裁（2026-10-08）：甲＝维持现状**（不另加档位控件）；第十一–十三节（同日续报，本批随附图 3 帧＝用户口径图 1–3；用户所称图 4〔会话栏滑条〕未随附）：**新增核实、待裁**——⑪ RAG 模型选择器未对齐主会话（切片特有缝：上游基座自带收藏件、移植面未带；主仓零命中）⑫ RAG 会话消息区滑条未隐式化（fork `6df401c81` 未随带；主仓已带；全 RAG 面盘点唯一漏网）⑬ KB 会话流式中输入框禁用（⑤ 裁定文本不含「可输入」；主会话两树均可输入）；**同日裁定：三则全甲**（⑪ 换 `ModelPickerContent`／⑫ 随带 fork 隐式化／⑬ 并入⑤）——均未动工，待「开工」后实施。**执行载体＝成对 `../plans/2026-10-08-rag-ui-findings.md`（2026-10-08 已起草；Task 0–13，含两树归属与提交链）。**
- **执行（2026-10-08「开工」）：** 十三则＋§十五 **全部已实施**——主树 3 笔（`6a17e966e`／`24a819771`／`ab3515714`）＋切片 10 笔（`9e66ba1bb`…`548f54706`）＋本回填笔；门禁零新增归因、真栈验收全项过（逐条见 plan 文末「执行实测」；逐节映射见文末「执行记录」）。均未推送。
- **追加（同日）：第十五节「切片裁剪残留」（「少剪」全面核实新增，切片侧）并入本对**——①–④ 直接清理（删除文案 4 串＋断言／`embed_texts.py` 两件／chat-panel 测试死件／注释族 ~15 处），⑤ 销项（`GET /{kb_id}/chunks` 属留面「切片只读」），⑥ **已裁：削**（`chunk-card` 实体徽章行）。落点均＝plan Task 10。
- **来源：** 2026-10-08 用户实操验收隔离实例（acceptance-8）反馈（第一、二节：图 1／图 2；第三、四节：同日续报另两图，本档顺延记作图 3／图 4；第五、六节：同日口述反馈，无图；第七节：同上开发分支（全量版）实操反馈，无图，自本条起为「已实施」项；第九节：同日续报（本轮），图 5；第十节：同上，口述无图；第十一–十三节：同日续报（本轮），随附图 3 帧〔本档顺延记作图 6–图 8＝用户口径图 1–3〕；用户所称图 4（会话栏滑条）未随附）＋逐条代码核实（切片树 vs 全量版两树对照；第五、六节另含同族扫描；第九、十节逐层核至工厂/客户端一级；第十一–十三节含 git 血缘核〔e325c90b2／a343b8b03／6df401c81〕与全 RAG 面滑条盘点）。
- **日期：** 2026-10-08

---

## 一、文档表底部「状态统计段」窄栏折行（并疑似冗余）

### 现象（图 1）
文档列表底部统计行：左段体量「文档 18 · 切片 264 · 828.5 KB」；右段状态「● 就绪 17 ● 索引中 1」。**栏宽拖窄、且状态段出现 ≥2 枚芯片时，右段整体折到第二行（靠右）**。用户初步倾向：这段状态是否已多余、直接做减法删掉。

### 核实
- **代码位置**：`components/workspace/knowledge/document-panel.tsx` 底部统计行；切片树 L1163–1192（容器 L1167）、主仓 L1232–1261（容器 L1235），**两树同源同款**——属「原有项目就有」的既有实现（代码注释：`Two nowrap segments (spec 2026-09-24 §7.2 甲)`），非本次移植引入。
- **折行机制**：容器 `flex flex-wrap gap-x-3 px-4 py-2 text-xs`；两段各自 `whitespace-nowrap`，状态段挂 `ml-auto`。⇒ 段内永不折；**两段总宽超出栏宽时右段整段掉到第二行，由 ml-auto 靠右**。
- **宽度估算（12px 字号；供直觉，非实测）**：体量段 ≈160–180px；单枚芯片 ≈55–70px（标签 2–3 字＋数字）；含内边距与段间距 ⇒ **出现两枚芯片时约 320–350px 起触发**，芯片越多阈值越高。中栏可被拖至此宽度以下。
- **数据与标签**：`core/knowledge/document-stats.ts` 聚合 `ready / inProgress / failed`（`inProgress`＝非终态 uploaded/parsing/chunking/indexing 合一）；**零计数不渲染**（既有哲学）；芯片标签＝`knowledge.status`（就绪／索引中／失败；zh-CN.ts L723–725）。
- **冗余度**：「就绪」＝默认态、零信息（且与表内逐行状态列重复）；「索引中／失败」＝非默认态。失败另有兜底（文档失败面板＋行级红点＋重试），**但失败面板只在「转入失败」当次弹出、刷新不回填**——底部「失败 N」是刷新后唯一常驻的安静标记；「索引中」是后台仍在跑的一眼提示（无别处聚合）。

### 处置选项（✅ 已裁：乙）
- **甲｜整段删除**：页脚只剩体量段；最简、永不折行。代价＝非稳态少一眼聚合（转由行级状态与失败面板承担）。
- **乙｜常态静默＋布局加固（荐）**：仅渲染「索引中／失败」芯片（「就绪」不再渲染，把零计数静默推满到默认态静默）；容器改不折行、状态段 `shrink-0`、体量段 `min-w-0` 可截断 ⇒ 永不折行。等价于甲的观感收益，同时保住异常可见性。
- **丙｜全保留、仅治布局**：芯片集不变，同上加固——信息全量但页脚常态偏长。
- **推荐理由**：乙只比甲多一个条件，换回「异常一眼可见」；且与既有「0 不喊」同构。若认为异常态也可完全下沉到行级/失败面板 → 甲亦可。
- **落点**：两树同源件，修复应两树同步（沿用「落在 slice 保留面、主题属首期 ⇒ 随带进 slice」定则）——随执行计划细列。
- **✅ 裁定（2026-10-08）：乙**——仅渲染「索引中／失败」芯片，「就绪」不再渲染；容器不折行＋状态段 `shrink-0`＋体量段 `min-w-0` 可截断；**全就绪时状态段整体不渲染**（避免空段占位）。未动工，待「开工」后随执行计划实施。

## 二、切片详情（读侧）缺口：编辑功能与「位置刻度」

### 现象（图 2）
全量版切片抽屉：卡片脚部有「编辑／重抽取／删除」三键，右侧有 Kimi 式「位置刻度」轨（悬浮出 #N＋预览弹窗、点击跳转）。**切片版抽屉两者皆无**——现状为 sticky 头部「▲▼＋当前 #N」＋滚动位置指示。用户点名此两处缺失。

### 核实（两树对照）
- **切片版（现状）**：`chunk-drawer.tsx`（切片树）注释自证 `Read-only in the first phase — editing, re-extraction and deletion are post-phase`（L61–65）；`chunk-card.tsx` 仅「渲染／原始」切换＋页码/tokens 脚注，无动作键；无右侧刻度轨组件与接线。
- **全量版（对照）**：卡片脚部三键＝编辑（内联 Textarea → PATCH 更新，含「已编辑」徽标）／重抽取（pending 轮询、刷新实体）／删除（预览对话框→级联删）；右侧 `chunk-tick-rail.tsx`＝刻度轨（刻度槽几何两态恒定、悬浮弹窗逐行对齐、点击/行点击跳转）。
- **归属（为何没有）**：非缺陷，属既定范围裁剪——① 编辑族＝首期「切片只读」显式排除；后端 chunk 写端点连同其用例同批未带入（A4 切件：`test_chunk_edit_api`／`test_chunk_re_extract`／`test_delete_preview`／`test_chunk_delete_api`）；② `chunk-tick-rail` 与 `delete-preview-dialog` 等列在 A5/A6 裁留表切件侧（plan L235/L241），Task 6 执行切出。
- **对照佐证**：图 2 所示文档不在验收库、切片树亦无刻度轨组件 ⇒ 图 2 为含全量功能的实例截图，作为对照样本成立。
- **恢复代价（初核）**：
  - 刻度轨：**纯前端**——拷回 `chunk-tick-rail.tsx`＋抽屉接线（entries 预览用 `chunkPreview`，切片版仍在 `format.ts:114`）＋i18n 2 键（`tickAria`／`notLoaded`，切片版已无）＋对应用例。不动「切片只读」边界。
  - 编辑族：**前后端同批**——前端三键＋hooks（更新/重抽取/删除预览链）＋后端 chunk 写端点与测试＋i18n 束；涉「更新后重嵌入」等写语义，属 Phase-3 编辑族整体，恢复面显著大于刻度轨。

### 处置选项（✅ 已裁；两者互不依赖，分裁）
- **刻度轨**：甲｜随带恢复进 slice（荐：纯前端、不破只读边界）／乙｜仅记录为后置。
- **编辑族**：甲｜仅记录为后置（荐：随编辑族整体）／乙｜显式破例随带恢复（前后端同批、TDD 补齐）。
- **✅ 裁定（2026-10-08）：刻度轨＝甲（随带恢复进 slice）；编辑族＝甲（仅记录为后置）。** 刻度轨恢复面＝纯前端（组件＋抽屉接线＋2 i18n 键＋用例），不动「切片只读」边界；编辑族留在本 spec 记录，随 Phase-3 编辑族整体恢复。未动工。

## 三、功能模型布局：与对话模型同页堆叠（图 3）

### 现象（图 3＝用户本轮图 1）
模型设置页现状：对话模型列表（添加／重新加载＋模型行）之下，整块功能模型配置（检索／多模态／服务与令牌／重建四组＋自带保存钮）内联堆叠在同一页。用户要求：功能模型不与对话模型放在一起；提案＝在「添加模型」旁加「功能模型」按钮，功能模型放进该按钮打开的对话框。

### 核实
- **现状来源（切片特有）**：`model-settings-page.tsx:140-142`——Task 6（`a630a3b3f`）把 `FunctionalModelsView` 内联挂进上游模型页（同 `canManage` 门，注释 :140-141 自证）；上游基座 e325c90b2 的模型页原本 0 处功能视图（grep 计数 0）。
- **全量版对照（解法自 fork 切点 a343b8b03 起即有；行锚已按现行主仓重核）**：全量版 `models-settings-page.tsx` 用 **ToggleGroup 两视图切换**——view state `:95`、切换行 `:249-268`（「添加模型」按钮仅对话视图出现 `:272`）、`view === "functional" ? <FunctionalModelsView /> : 对话列表`（`:280-281`）。⇒ **全量版从不并排显示两视图；切片为不整体移植新模型系统，只搬了视图本体、未搬切换壳**。
- **选项对照（2026-10-08 两轮澄清后修订：机制＝乙，控件形态二选一）**：
  - **用户澄清**：本意＝**乙**（「像原版那样的两视图切换」）；原话「功能模型放在按钮的界面中」的「按钮的界面」＝切换后落入的**视图**，**非对话框**（此前系对「界面」一词的误读）。机制无分歧（视图切换），唯一可变量＝切换控件形态：
  - 乙-b｜**单枚「功能模型」按钮（用户口述形态）**：按钮行加一枚 → 列表区条件渲染为功能视图；回程＝同一枚钮原地变「对话模型」；进功能视图后「添加模型／重新加载」隐藏（它们属列表）。比 a 少 `viewSwitchLabel` 一键。
  - 乙-a｜**原版两枚 ToggleGroup 切换片**：「对话模型｜功能模型」，与全量版一字不差（i18n 3 键）。
  - 丙｜设置导航独立入口：不取——偏离全量版结构、失去与模型列表同页的引用上下文（功能模型的引用选项来自模型列表）。
- **推荐**：机制＝乙（已定）；控件形态开工时一口定（不指定则取 乙-b＝用户口述）。两形态落点同一处：`model-settings-page.tsx` 加 `view` 状态＋条件渲染，功能视图本体零改动、无对话框、无嵌套。
- **✅ 裁定（2026-10-08）：控件形态＝乙-b**（单枚「功能模型」按钮；用户裁）——按钮行加一枚，进入功能视图后同钮原地变「对话模型」回程、「添加模型／重新加载」隐藏；i18n 2 键（`viewChatModels`／`viewFunctionalModels`，不用 `viewSwitchLabel`）；乙-a（原版两枚切换片）不取。未动工，待「开工」后随执行计划实施。

## 四、VLM 视觉声明：下拉选择不了模型（图 4）

### 现象（图 4＝用户本轮图 2）
功能模型「多模态」卡：图片描述模型 (VLM) 下拉仅见当前值 qwen3.7-flash（另有「（使用配置默认）」项），选不到别的模型。用户三问：① 添加模型里没有视觉声明？② qwen3.7 是不是你强行加上去的？③ 是否应放行全部模型、只靠运行时结果（错误／模型自带 OCR）兜底？

### 核实（逐条）
- **① 半对**：切片添加／编辑模型对话框**有**视觉声明——勾选框「支持图片输入」（`model-settings-page.tsx:337-345`；文案 zh-CN.ts:1544）；但仅覆盖 UI 添加的模型（source=managed）；config.yaml 的模型在 UI 只读（:100-107「服务器配置 · 只读」），其视觉声明载体＝config.yaml 的 `supports_vision` 字段。用户或未滚到对话框底部，或按全量版新系统的「视觉」字样找（切片沿用上游旧文案「支持图片输入」）。
- **② 不是强加**：显示值是验收实例保存的配置数据（`rag_config.json:6` `"vlm_model": "qwen3.7-flash"`；config.yaml rag 块 :264 同值）；全树 grep 无设置面写死（命中皆为文档／测试／嵌入模型批量表）。它出现在下拉里是**防丢失回注**：`modelReferenceOptions` 把不在候选中的当前值补列一项（`config-form.ts:665-667`）——不是被放行。
- **③ 根因（切片特有缺口）**：下拉候选＝按 `supports_vision` 过滤（`config-form.ts:706-708` `isCaptionCapable`；候选组装 `visionReferenceOptions` L717-727；视图调用 `functional-models-view.tsx:772-776`）；候选来源＝`loadManagedModels` → `GET /api/managed-models`，其 **config.yaml 来源行不带 `supports_vision`**（`managed_models.py:32`，与上游 e325c90b2 逐字相同、零切片 delta；UI 添加的行经 `public()` 带上）⇒ 模型全在 config.yaml 的实例过滤后为空（acceptance 的 qwen3.8-flash :26、qwen3.7-flash :53 均声明 true，deepseek-v4-flash :35=false——UI 全看不到）⇒ 同时触发提示「还没有配置支持视觉的模型…」（zh-CN.ts:1662）。
- **全量版对照**：新模型系统 `GET /api/models/config` 对两个来源均序列化 `supports_vision`（`models.py:481`，双源经同一响应构造），全量版下拉正常。

### 处置选项（✅ 已裁：甲）
- 甲｜补链修复（荐）＝**后端一行**：`_catalog()` 的 config 行补 `supports_vision`（源字段在 harness `model_config.py:174`，必然可得）。**前端无必改项、零界面变化**——筛选代码经 `VisionModelSource` 结构类型早已按可选字段读它，`ConfigModel` 类型补一行 `supports_vision?: boolean` 只是如实声明、可省；**不加任何按钮/控件**。此后 config.yaml 声明 true 的条目即出现在下拉；保留「声明门」语义；与全量版行为一致。该文件目前零切片 delta——此修为对上游旧模型系统的最小适配增量。TDD：后端响应断言＋前端既有筛选用例核对。
- 乙｜全部放行＋运行时兜底（用户问法）：不取——`supports_vision` 是多处消费的声明字段（如 view_image 中间件按当前模型该位启用图片注入），放行全部＝声明降级为摆设；失败推迟到索引期（错误落在文档行、离选择点远）；「能吃图但未声明」的正解＝声明它（勾选／config 字段）。
- 丙｜不修，记入用户后续「模型系统优化」议题。
- **注**：用户已言「等后续我去提模型优化议题时再加上」——甲只对齐现状语义，不预做后续模型系统设计。
- **✅ 裁定（2026-10-08）：甲**——后端一行（`_catalog()` config 行补 `supports_vision`）＋前端零界面变化；TDD：后端响应断言＋前端既有筛选用例核对；未动工，待「开工」后随执行计划实施。

## 五、RAG 会话缺「终止」：发送后只能等

### 现象（口述，无图）
KB 会话（RAG 对话面板）流式回答期间没有任何停止入口——点发送后只能等它跑完。

### 核实（两树对照＋在树能力盘点）
- **现状（切片树）**：KB 面板 composer 为自绘（`chat-panel.tsx` L476–560：textarea L480–496＋模型选择器 L499–543＋发送键 L550–556），流式中发送键 `disabled={!canSend}`（L552；`canSend` L256 含 `!thread.isLoading` 与草稿非空），无「变停止」——`!kb || thread.isLoading` 是 Textarea 的条件（L482，详见第十三节）。
- **能力全在树内（只差接线）**：
  - hook：`useThreadStream` 返回 `stop`（`core/threads/hooks.ts` L3154 ← L2314 `stopThread` → `stopThreadAndInvalidateCaches(thread.stop())`）。
  - 后端：`POST /{thread_id}/runs/{run_id}/cancel` 已在切片树（`routers/thread_runs.py` L1251–1253；PAT 域 `auth/pat.py:116`；`extension_agent_runs.py:167` 复用 `cancel_run`）。
  - 主会话参照接线（slice 在树内即有）：`chats/chat-page.tsx` L362–364 `handleStop`＝`thread.stop()`、L657 `onStop`（＋L658 `canStopStreaming`）；`agents/[agent_name]/chats/[thread_id]/page.tsx` L321–323／L599 同款。
- **两树同源**：主仓 KB 面板（composer 位 `chat-panel.tsx` L655 起：Textarea `disabled` L657、选择器 L693–715、发送键 L724；MessageList 调用 L620）同为自绘、同样未接停止（grep 无 `onStop`）⇒ 修复应两树同步。

### 处置选项（✅ 已裁：甲）
- **甲｜自绘 composer 原地加停止（荐）**：保持面板尺寸与既有样式；发送键在流式中**原地变停止键**（主会话 InputBox 同款交互），点击调 `thread.stop()`。纯前端接线。
- **乙｜整块换共享 InputBox**：能力最全（停止＋附件＋上下文……），但面板 composer 系有意自绘（注释「styled after the home-page InputBox」）、布局变化大，面大。
- 推荐理由：甲以最小差对齐「可以终止」诉求，不引面板布局改动。
- **✅ 裁定（2026-10-08）：甲**——自绘 composer 原地加停止：流式中发送键原地变停止键＋点击调 `thread.stop()`；容器与布局不动；乙（整块换共享 InputBox）不取。纯前端接线；未动工，待「开工」后随执行计划实施。

## 六、RAG 会话消息动作行缺「重新生成」（附同族扫描）

### 现象（口述，无图）
RAG 会话每条回答下方动作行只有「复制」；主会话同位置另有「重新生成」。

### 核实
- **动作行本体已在（切片树）**：`message-list.tsx` 动作行＝复制（恒有）＋分支（`enableBranchForTurn && onBranchTurn`，L967）＋重新生成（`enableRegenerateForTurn && onRegenerateMessage`，L1001–1037）＋编辑重发（`canEdit && onEditAndRegenerateMessage`，L1254–1260）——四键代码齐备；**缺的只是父级 props**：KB 面板 MessageList 调用（`chat-panel.tsx` L455–465）未传 canRegenerate／onRegenerateMessage／canEdit／onEditAndRegenerateMessage（其余为数据类 props：className／threadId／thread／hasMoreHistory／loadMoreHistory／isHistoryLoading／renderMessageContent／renderMessageFooter／onSubmitHumanInput）。
- **能力全在树内**：hook 已返回 `regenerateMessage`（hooks.ts L3163；走 `/runs/regenerate/prepare`）与 `editAndRegenerateMessage`（L3164；`/runs/edit-regenerate/prepare`）；后端两路由已在切片树（`thread_runs.py` L930／L941）。
- **主会话参照接线**：`chats/chat-page.tsx` L524–556（canRegenerate／onRegenerateMessage／canEdit／onEditAndRegenerateMessage／canBranch／onBranchTurn 全套）；`agents/…/page.tsx` L478–479 已接重新生成＋编辑重发（**编辑重发带 knowledge-scope snapshot 先例**，L329–340，rag 场景直接可用）。
- **两树同源**：主仓 KB 面板（L620）同款调用、同样未接（grep 无 `onRegenerate`）⇒ 修复应两树同步。
- **同族扫描（本轮连带核出，供一并决策）**：同一条动作行上的「编辑重发」「分支」两键同样因缺 props 而不显示——链路与键本体均在切片树；其余会话面未见类似接线缺口（citation 合并胶囊等特性两树同在；wiki／graph／评测／deep research、编辑族、刻度轨为既有裁剪或已记录项）。

### 处置选项（✅ 已裁：乙）
- 对齐范围：**甲｜仅「重新生成」**（用户点名）／**乙｜＋「编辑重发」（荐）**（同动作行、同批接线；agents 页已有带 scope 的 rag 先例）／**丙｜＋「分支」**（新建会话＋跳转，面大，可后置）。
- **✅ 裁定（2026-10-08）：乙**——「重新生成」＋「编辑重发」都做（编辑重发带 knowledge-scope snapshot，照 agent 页 L329–340 先例）；「分支」（丙）不取、维持裁剪。纯前端接线；未动工，待「开工」后随执行计划实施。

## 七、刻度轨「间距偏空」与显示门槛（会话轨＋切片轨；已实施）

### 现象（口述，无图）
全量版两处刻度轨（库内对话会话轨、切片详情切片轨）：刻度间距偏空、观感别扭；再小又会偏密「连在一块」。用户提议：总数 ≥5 才显示刻度轨。

### 核实（两处共用同一组件）
- 两处均＝`chunk-tick-rail.tsx`（会话轨 `chat-panel.tsx` L634 复用切片刻度轨方案）；间距＝单一常量 `TICK_GAP`，同管三件事：刻度间距、弹窗行高（行槽与刻度槽刻意 1:1 对齐）、11 格窗口带高；热区 `TICK_HIT=16px`（注释：小于间距、热区留隙不粘连）。
- **可取值带 24–28**：下限被热区留隙（间距 ≤20 时点击区近粘连）与弹窗 12px 文字行高夹住；上限＝观感（34 偏空）。34 的来历＝2026-09-05 二改、回应「太密」反馈——本轮为回摆。
- 门槛：原 `total<=1` 才藏（≥2 即显）；上游先例＝conversation-outline 的 ≥5（`core/messages/conversation-outline.ts:7`）。

### 处置（✅ 已裁并已实施：间距 26＋门槛 ≥5）
- **间距 34→26**（带内取中）：11 格带高 374→286px、热区间隙 18→10px；弹窗行高随 1:1 设计一并变 26；窗口机制封顶 11 格 ⇒ 不回退「太密」。
- **门槛 ≥5**：不足 5 条整条不渲染（会话轨按问题数、切片轨按切片数）；对齐上游先例。
- 不取：动态间距（破坏「几何恒定」）、悬浮变距（hover 不位移为刻意设计）。
- 落点：两处共用组件，一处常量＋一处判断一次生效；随 ② 刻度轨恢复以新值带进切片。
- **✅ 已实施（2026-10-08）：`624dd2967`**（⑦⑨＋记账五笔压合）——`chunk-tick-rail.tsx`（`TICK_GAP=26`／`MIN_TICKS=5`）＋同步用例（`chat-panel.dom` ×2 改门槛夹具、`chunk-drawer.dom` ×1 注释）；定向 3 文件 57 用例全绿；未推送。

## 八、知识库文档感知缺口（会话侧；已裁补）

### 现象（会话侧，验收实例实证）
库内感知只有「按正文语义检索」一条通道：文档名不参与匹配（稠密/稀疏只对切片正文，过滤只看 kb_id）；无文档清单/读取工具 ⇒「库里有哪些文档」「这篇还有什么」不可枚举。基准会话（thread `c4af859d`）：「测试10中有哪些内容」拒答；末轮只能答"能召回的主要是上述两类"。

### 核实（两树同源；数据层就绪、缺口在模型面）
- 检索结果模型可见字段＝`{chunk_id, text, doc_name, page, heading_path}`（主仓 `hybrid_search_tool.py:81-87`，切片同段）——**doc_name 有、doc_id/chunk_index 无** ⇒ 追问链（切片→前后→整篇）断在第一环；两树均无任何文档级工具。
- 数据层全部已在：chunk payload `{…, doc_id, …}`＋索引 `(kb_id, doc_id, entities)`；`chunk_id="{doc_id}#{index:04d}"`（`chunker.py:369`）；有序分页 `list_chunks`＋`count_chunks`＋`chunk_positions`；服务面 `list_documents`／`list_document_chunks`（REST 已在、UI 在用）。⇒ 补＝薄壳。

### 去向（✅ 已裁）
补——范围＝`list_knowledge_documents`＋`read_knowledge_document`（只读、双寻址）＋检索结果补 `doc_id`/`chunk_index`＋门控扩列＋SOUL「语料边界问题」节；篇内检索（`doc_id` 过滤）＝D1（荐随）。**并进首期口径（A）**；实现序＝主树先、切片随带。设计另立成对 `../specs/2026-10-08-rag-doc-tools-design.md`＋`../plans/2026-10-08-rag-doc-tools.md`；本账仅留痕。

## 九、失败重试悬停卡：文案与按钮全靠左，「重试」应在右侧（图 5）

### 现象（图 5）
文档表失败行悬停卡＝两行文案（「解析服务多次重试仍失败，请检查文件是否损坏或稍后重试」）＋「⟳ 重试」按钮，全部靠左、按钮位于文案下方左角。用户：①文案有时只占左半边、右半边整片空；②按钮应在右侧才更符合直觉；③请给设计意见（最合理、好看）。

### 核实（两树同源同段）
- 组件＝`document-panel.tsx` `DocumentStatusCell`：失败态（主仓 L328–347）与降级态（L356–378）共用同款卡片——`HoverCardContent className="w-60 p-3"`（固定 240px）＋`<p>` 块级文案（自然折行）＋`<Button size="sm">`；切片树同段同 class（卡体 @L318／@L344）。
- 根因：**固定卡宽＋内容全左对齐，右缘没有任何锚点**。短文案（如「解析超时，请重试」8 字）只剩左边一条；长文案末行同样是短尾；按钮是块级流里的下一项、贴左 ⇒ 同一观感。**非渲染缺陷，是布局问题。**
- 影响面：两态共用一处 ⇒ 一次改动两态生效；两树同源 ⇒ 修复应两树同步（落点随执行计划细列）。

### 处置选项（✅ 已裁：甲——已实施）
- **甲｜同排右收（荐）**：卡片内容改 `flex items-center justify-between gap-3`——文案 `min-w-0 flex-1`、按钮 `shrink-0` 锚住右缘：短文案＝单行「文案 … 按钮」；长文案＝按钮垂直居中、文案绕行；降级态腿明细仍在下方整宽。卡更矮（27 字句估算 ≈75px，现状 ≈94px）。按钮垂直居中；若要「首行右角」改用 `items-start`，开工一口定。
- **乙｜底排右对齐**：文案保持整宽（长文案不额外折行），按钮另起一排 `flex justify-end`；短文案时底排左半仍空（只是按钮到了右角）。
- **丙｜卡片随内容收窄**（`w-fit max-w-60`＋按钮右收）：短文案整卡变窄、不存在「右半边」；代价＝卡片宽度随文案长短跳动（相邻行悬浮观感不一）。
- **推荐理由**：甲①实现「按钮到右侧」的直觉；②右半边永远有按钮锚着、观感不空；③与同页文档失败面板「文左·钮右」同构（复用页面既有词汇）；④比乙更矮；⑤两态一处改动。选乙的后果＝短句时下半卡仍偏左、卡更高；选丙的后果＝宽度跳动。
- **✅ 裁定（2026-10-08）：甲**——文案与按钮同排两端（`flex items-center justify-between gap-3`；文案 `min-w-0 flex-1`、按钮 `shrink-0`），按钮垂直居中；乙（底排右对齐）／丙（卡片随内容收窄）不取。**已实施**：主仓侧并入压合提交 `624dd2967`（原 `d8e336edd`）；**切片侧改动已撤回**（原 `51f2ee9f1` 不保留——PR 面不落未定稿 A 项；改动内容＝本节甲案：失败/降级两卡 `flex items-center justify-between gap-3`＋文案 `min-w-0 flex-1`＋按钮 `shrink-0`＋用例结构钉，待 A 批次按计划重放）。定向用例＝主树 73/73、切片 61/61（撤回前实测）；两树 `pnpm check` 零诊断；实机截图未取（自动化浏览器停在登录页、未输入任何凭据），观感以实机复看为准。

## 十、RAG 模型「思考档位」接线（核实；无图）

### 现象（口述）
用户：「当前新分支的模型配置中没有默认的模型思考档位」——RAG 里的模型是怎么接线的？也是没有思考档位地发，还是就是默认？

### 核实（两树对照；逐层核至工厂/客户端一级）
先拆两轴：**开关**（发不发思考）与**档位**（推理深度 minimal/low/medium/high；全量版 UI 里叫「推理深度」）。RAG 侧只有开关、没有档位选择。

- **哪些腿在用聊天模型（两树差异）**：全量版四条 LLM 腿走工厂——抽取 `graph/extractor.py:129`／百科 `wiki/generator.py:219`（＋`worker.py:1097`）／评测裁判 `eval/factory.py:71`／出题 `eval/synthesis.py:148`，均经 `create_rag_chat_model(名称, thinking=bool(flag))`（`model_target.py:195`）→ 与主对话**同一个工厂入口** `create_chat_model(thinking_enabled=…)`；条目声明不支持思考 ⇒ 在此降级为不思考＋警告（工厂本体对「思考开」是 raise，RAG 侧镜像同一道闸）。切片树四条 LLM 腿随子系统裁走（`rag_config_file.py` `_RETIRED_KEYS` L64–74 逐条列明）——`model_target.py:195` 该函数**保留但无调用点**；切片里进模型的 RAG 腿只有**配文 VLM 一条**，走原生 HTTP（切片入口 `captioner.py:110` → `caption_client.py`），不经工厂。
- **开关接线**：功能视图「思考跟随对话模型」勾选 → 各腿布尔（全量版四条 LLM 腿 `extract_thinking` 等〔`app_config.py` L204 起步〕＋VLM 腿 `vlm_thinking`；切片仅 `vlm_thinking`——`app_config.py:233`，开启时配文输出预算升到 ≥4096）→ 各腿按上述两路分发。思考菜单：全量版五槽（`functional-models-view.tsx` L931–935）；切片单槽 VLM（L895–896）。
- **档位接线（核心答案：「就是默认」＝条目自己声明的）**：RAG 各腿**从不携带调用级档位**（全部调用点只传 thinking 布尔）⇒ 线上档位只有两个来源：
  1. **条目自身声明**——LLM 四腿（全量版）走工厂：调用者未给档时，条目默认档原样保留（`factory.py` L420–423；前提＝条目声明支持档）；条目声明不支持档 ⇒ 该字段被剥离、一个不发（L373–375）。配文 VLM 腿（两树）走原生 HTTP（`caption_client.py`）：关 ⇒ 声明的 `when_thinking_disabled` 形状优先，否则条目声明支持档时显式发 `reasoning_effort: "none"`（L76–79）；开 ⇒ 只发声明的 `when_thinking_enabled` 形状（L88–89）；都没有 ⇒ 什么都不加（＝服务端默认）。
  2. **工厂自动规则**（LLM 四腿、旧写法条目）：gateway 型、关且未写关闭形状 ⇒ 自动 `reasoning_effort: "minimal"`（`factory.py` L353–363）；Codex 型 ⇒ 关＝`none`、开＝显式档或 `medium`（L385–396）。切片基于更新上游：带 `reasoning:` 契约的条目走 dialect 路径（关不合成档、档只在被请求时写，`factory.py` L244–290），对未带契约的普通条目两树行为一致。
- **「为什么用户看不到档位控件」**：切片的模型弹窗**没有任何思考/档位字段**（`settings.models` 键表＝接口类型／模型 ID／唯一名称／接口地址／API Key／上下文窗口／最大输出 Token／支持图片输入，`zh-CN.ts` L1507–1547）——思考声明只在 `config.yaml` 手写条目（`model_config.py` `reasoning:` 契约／旧式旗标 L155–171）。全量版档位声明面＝模型弹窗能力区「可用推理深度＋默认推理深度」（后者选 ≥1 档后才出现，`model-capability-editor.tsx` L221–277）＋对话输入框「推理深度」。**两树的 RAG 功能视图都只有 on/off 跟随键、没有档位。**
- **对话侧对照（两树同构）**：chat 档位链＝请求（输入框模式/推理深度）＞agent 声明＞条目默认（`agent.py` L738–781）；RAG 对话面板**不发档位**（`reasoning_effort: undefined`，主仓 `chat-panel.tsx` L172–173／切片 L159）⇒ 同样落条目默认。差异只在「请求面」：普通对话可逐条选档，RAG（索引腿＋KB 面板）不可选。

### 结论与处置选项（✅ 已裁：甲——维持现状）
- **结论**：不是「没档位地发」，也不是某处写死某一个档——是**跟随模型条目声明；没声明就不发**（个别条目被工厂自动补 minimal/none）。想让某腿带档 ⇒ 改该腿所指**模型条目的声明**（全量版＝模型弹窗能力区；切片＝`config.yaml` 条目字段）。
- **甲｜维持现状（荐）**：RAG 腿按条目默认档；不给 RAG 加档位控件。理由：市场惯例＝索引/后台腿走非思考快模型、思考只在查询侧（本仓对照：`2026-10-03-rag-leg-thinking-follow-chat-design.md`）；RAG 腿是批量任务，逐条档位收益低；切片哲学＝最小适配增量。
- **乙｜功能视图给腿加档位选择器**（全量版先行、切片随带）：新控件＋新配置面（每腿档位需进 RAG 配置与请求面）。
- **丙｜切片弹窗补思考/档位声明字段**：不取——偏离上游旧模型系统、delta 大。
- **✅ 裁定（2026-10-08）：甲（维持现状）**——RAG 腿按模型条目自己的默认档；不给 RAG 加档位控件；乙（功能视图加档位选择器）／丙（切片弹窗补声明字段）不取。无代码改动、无后续动作，本节至此收口。

## 十一、RAG 模型选择器未对齐主会话（收藏分区／其他模型）

### 现象（图 6＝本批图 1，验收库A 实例；图 7／图 8＝本批图 2／3，主会话对照）
KB 面板（RAG 会话）模型选择器＝扁平清单＋「搜索模型…」输入框；主会话模型选择器＝「收藏／其他模型」两分区＋逐行 ⭐（收藏项实心琥珀、聚焦行蓝环）。用户：这里没有对齐。

### 核实（两树对照＋git 血缘）
- **附图实例＝切片树**：「验收库A」与收藏选择器并存于同一实例（图 1 与图 2/3），而收藏件仅切片树具备（见下）——故此批反馈落在切片实例。
- **切片树内部即不对齐**：主会话选择器＝`ModelPickerContent`（`components/workspace/model-picker-content.tsx`；`renderGroup` 出「收藏／其他模型」两分区＋行尾 ⭐〔`favorites.canEdit` 门〕；**无搜索框**）——接线在 `input-box.tsx` L3472–3494、`sidecar-panel.tsx` L929；收藏数据＝`core/models/favorites.ts`（`projectModelChoices`）＋`use-model-favorites.ts`＋`favorites-store.ts`；i18n＝zh-CN L318–325。KB 面板＝`chat-panel.tsx` L499–544 沿用 `ai-elements/model-selector` 扁平壳：`ModelSelectorInput`（「搜索模型」）＋`models.map` 平铺、零分区零收藏。两处均为全表（切片无 `chatPickerOptions`／`visibility.ts`，过滤线未带入）。
- **血缘（缝从哪来）**：收藏件系**上游 e325c90b2 自带**（`git cat-file` 实测：e325c90b2 有、a343b8b03 无）；切片 `input-box.tsx` 原样沿用基座版（`e325c90b2..切片 HEAD` 对该文件零提交）⇒ 主会话自动带收藏选择器。KB 面板 `chat-panel.tsx` 是**从源（fork a343b8b03）移植**的文件，源彼时的主会话选择器仍是扁平壳（a343b8b03 `input-box.tsx:2435` `ModelSelectorContent`、无收藏）——移植面与基座面在此处「一新一旧」缝合 ⇒ 不对齐。
- **主仓（全量版）零命中、已对齐**：fork 系谱全链无收藏件（`收藏`／`favorites`／`ModelPickerContent` 在主仓 frontend/src 零命中）；主会话（`input-box.tsx` L2436–2459）与 KB 面板（`chat-panel.tsx` L693–715）同为扁平壳、同经 `chatPickerOptions` 过滤 ⇒ 主仓无此问题、零动作。

### 处置选项（待裁；荐甲）
- **甲｜KB 面板换用与主会话同款 `ModelPickerContent`（荐）**：触发器保留现按钮（aria-label「选择模型」）；弹层换两分区＋⭐，与主会话／sidecar 一字不差。纯前端、零新件（组件在切片树、已被两处使用）。**代价＝「搜索模型…」输入框随壳消失**（主会话同款亦无搜索；型号多时靠滚动）。
- **乙｜仅记录不修**：缝留档（切片实例主会话与 KB 观感不一致）。
- **丙｜保搜索＋加收藏（自绘混合）**：偏离主会话/上游件形态、维护再分叉，不荐。
- **推荐理由**：甲即用户诉求「对齐」且一件三处同款。选乙＝缝留在用户可见面；选丙＝切片再分叉出自绘件。
- **落点（切片）**：`chat-panel.tsx` 选择器块 → ModelPicker 接线；用例＝`chat-panel.dom.test.tsx` 三条选择器用例（触发 aria-label／选项文案／弹层关闭）结构照旧，需补 auth mock（`useAuth` 无 Provider 即 throw；样板＝`model-picker-content.dom.test.tsx`）。主仓零动作。TDD：选择器用例先行。
- **✅ 裁定（2026-10-08）：甲**——KB 面板换用与主会话同款 `ModelPickerContent`（切片侧；触发器保留现按钮；搜索框随壳消失，与主会话一字不差）；主仓零动作。未动工，待「开工」后随执行计划实施。

## 十二、RAG 会话消息区右侧滑条未走「隐式方案」＋全 RAG 面滑条盘点

### 现象（用户所称图 4〔未随附截图〕）
KB 会话栏右侧上下滑条＝常驻原生滑条，非项目「隐式方案」（overlay：滚动才浮现、停 2s 淡出、不占布局宽）。用户要求对齐＋盘点 RAG 其余滑条。

### 核实（两树对照＋全 RAG 面 grep）
- **切片树（缺口）**：KB 会话消息区＝`MessageList` → `ai-elements/conversation.tsx` 的 `Conversation`（`StickToBottom`＋`StickToBottom.Content`，L12–34）——库默认给 Content 挂 `overflow:auto`＋`scrollbar-gutter: stable both-edges` 的常驻原生滑条（fork 同段注释原文）。该 `message-list.tsx` 系上游基座版＋移植 2 个 render seam（`git diff e325c90b2` 实测 +20 行）——**fork 的隐式化未随带**。
- **源（对照）**：fork 提交 `6df401c81`（"restore overlay scrolling in auto-height dialogs and roll out overlay scrollbars"；a343b8b03 祖先）把 `message-list.tsx` 改 `useStickToBottom()`＋`<ScrollArea type="scroll" scrollHideDelay={2000} viewportRef={stick.scrollRef}>`＋内容 div `ref={stick.contentRef}`（注释「滚动条只滚动时浮现、停 2s 淡出、不占布局宽度」「主聊天页同用 MessageList，一并同款」）。**主仓现状＝已带**（`message-list.tsx` L336–342／L1012–1025／L1390–1393）⇒ 主仓此面已对齐、零动作。
- **全 RAG 面盘点（切片树）**：已 overlay＝文档表（`document-panel.tsx` L739）、失败面板（`doc-failure-panel.tsx` L113）、库列表（`kb-list-panel.tsx` L135）、切片抽屉（`chunk-drawer.tsx` L192）、历史弹层（`chat-panel.tsx` L386）、panels-shell 横滚（`panels-shell.tsx` L287）、刻度轨弹窗（`chunk-tick-rail.tsx` L148；主仓件，切片随 ② 带入）。**唯一漏网＝会话消息区（本则）**（口径＝原生常驻滑条类；`knowledge-scope-selector.tsx:406` 属 Radix 面、仅未带 `type="scroll"`／`scrollHideDelay`＝默认 hover 手感、非缺陷类，登记不改）；`ui/scroll-area.tsx` 本体已具备 overlay＋`viewportRef`（2026-09-04 注释），无需动。消息内部件（代码块 `overflow-x-auto`、工具详情 `pre` 内滚、选择器弹层内滚〔上游件〕）＝既有内件、非面板级滚动区——维持。
- 影响面：切片全部 `MessageList` 面（KB 面板＋主会话＋agent 页）一并生效（同 fork 注释口径）——切片实例的主会话同为旧滑条（用户先在 RAG 注意到）。

### 处置选项（待裁；荐甲）
- **甲｜切片随带 fork 的隐式化（荐）**：`message-list.tsx` 容器换 `useStickToBottom`＋`ScrollArea` 包裹（照主仓现行实现的 ref 交接；保留 `role="log"`；不动子结构／虚拟列表／粘底逻辑）。TDD：结构钉（滚动容器＝`data-slot="scroll-area-viewport"`）＋定向复跑。
- **乙｜仅记录**：滑条不一致留档。
- **丙｜改 `ai-elements/conversation.tsx`（组件级）**：影响面等同（仅 MessageList 用 Conversation）但动上游件本体、与 fork 成品不同构，不荐。
- **推荐理由**：甲与 `6df401c81` 成品逐字同构（主仓即参照实现）；一处改动三面生效。选乙＝切片全体会话面留旧滑条；选丙＝偏离主仓已验形态、后续对照失真。
- **落点（切片）**：`messages/message-list.tsx`（±30 行）；用例＝message-list 相关 DOM 定向；主仓零动作。
- **✅ 裁定（2026-10-08）：甲**——切片随带 fork 的隐式化（照主仓现行实现；保留 `role="log"`）；主仓零动作。未动工，待「开工」后实施。

## 十三、KB 会话流式中输入框禁用（主会话可输入）

### 现象（口述，无图）
用户：主对话执行时输入框可继续输入文字；RAG 会话回答中整个输入框打不了字。问：⑤（终止回答）落好后有这个效果吗？没有的话是否对齐主会话「可输入」。

### 核实（两树对照）
- **KB 面板（两树同款）**：自绘 composer 的 Textarea `disabled={!kb || thread.isLoading}`（切片 `chat-panel.tsx:482`／主仓 `:657`）⇒ 流式中禁输入。**⑤ 裁定文本**（本账第五节）＝「流式中发送键原地变停止键＋`thread.stop()`；容器与布局不动」——**不含**「输入框保持可输入」⇒ 答：没有；⑤ 按原文落不会自动获得该效果。
- **主会话（两树）**：`PromptInputTextarea disabled={composerLocked}`，而 `composerLocked`＝`isComposerDisabled || polishingInput`（＋mentionBusy，切片）——**不含 streaming**（切片 `input-box.tsx` L1786／L3141–3143；主仓 `:1359`）⇒ 流式中可打字；回车→`toast.info(pleaseWaitStreaming)` 拒发（切片 L1597–1600）；发送键流式中＝停止（`handleStopStreaming` L1575–1591；按钮门 `stopDenied`/`sendDenied` L2065–2069）。
- 结论：缺口成立（两树同源），且与⑤同属 composer 流式态一族——⑤ 只落「能停」，本则补「能打」。

### 处置选项（待裁；荐甲）
- **甲｜并入⑤（荐）**：⑤ 实施时把 KB composer 流式态一并对齐主会话——Textarea `disabled` 去掉 `thread.isLoading` 项（仅留 `!kb`）；回车照主会话口径（流式中提示等待、不发）；发送键=停止（⑤ 既有）。同一处 composer、同主题、一笔落完；「两树同步」口径沿用 ⑤。
- **乙｜单独立项**：⑤ 按原文落、本则另笔跟进（同一区域两笔连续改、易返工）。
- **丙｜不修**：维持流式中全文锁定（能停但不能预打下一句）。
- **推荐理由**：甲与主会话一字不差、避免同处两笔。选乙＝同区域连续两次动；选丙＝「对齐主会话」诉求不成立。
- **落点（两树）**：KB `chat-panel.tsx` Textarea disabled 项＋回车分支（「等待」提示键两树已有——主会话在用）；TDD：流式中可输入用例（两树 chat-panel.dom）。与⑤同批实施时合并为同一提交序列。
- **✅ 裁定（2026-10-08）：甲**——并入⑤：KB composer 流式态对齐主会话（两树同款，与⑤同批落）。未动工，待「开工」后实施。

## 十四、涉及位置
| 事项 | 切片树 | 全量版（主仓） |
| --- | --- | --- |
| 底部统计行 | `document-panel.tsx` L1163–1192 | `document-panel.tsx` L1232–1261（同款） |
| 状态聚合 | `core/knowledge/document-stats.ts` | 同 |
| 切片抽屉 | `chunk-drawer.tsx`（只读版） | `chunk-drawer.tsx`（编辑族＋刻度轨接线） |
| 切片卡片 | `chunk-card.tsx`（只读版） | `chunk-card.tsx`（编辑态＋三键） |
| 刻度轨 | —（无） | `chunk-tick-rail.tsx` |
| 刻度轨间距/门槛 | —（无组件；随 ② 恢复以 26/≥5 带入） | `chunk-tick-rail.tsx` `TICK_GAP=26`／`MIN_TICKS=5`（本次已改，并入 `624dd2967`） |
| i18n | `zh-CN.ts` L723–725（就绪/索引中/失败） | ＋`chunkDrawer.tickAria/notLoaded` 等 |
| 裁件登记 | plan A5 L235／A6 L241 | — |
| 功能模型挂载 | `model-settings-page.tsx` L140-142（内联挂载，Task 6 `a630a3b3f`） | `models-settings-page.tsx` view state L95＋ToggleGroup L249-268（两视图切换） |
| 视觉声明载体 | 勾选框「支持图片输入」`model-settings-page.tsx` L337-345 | 能力编辑器「视觉」芯片 `model-capability-editor.tsx` L132-135 |
| VLM 候选来源 | `/api/managed-models`（config 行缺字段）`managed_models.py` L32 | `/api/models/config`（双源带字段）`models.py` L481／L688·L716 |
| 视图切换 i18n | 未带入（乙-b 需补 `viewChatModels`／`viewFunctionalModels` 2 键，不需 `viewSwitchLabel`；组合 ⓘ 另需 `functionalModels.description`） | zh-CN.ts L1709-1711 |
| RAG 会话终止 | 缺：composer 无停止态（`chat-panel.tsx` L476–560）；链路在：`stop`（hooks.ts L3154←L2314）、后端 `/cancel`（`thread_runs.py` L1251） | 同缺（主仓同款 composer，L655 起）；参照接线 `chat-page.tsx` L657–658、`agents/…/page.tsx` L599 |
| RAG 会话重新生成 | 缺接线：键本体在 `message-list.tsx` L1001、父级未传；链路在 `regenerateMessage`／`editAndRegenerateMessage`（hooks.ts L3163–3164）、后端 L930·L941 | 同缺（主仓 KB 面板 L620 同款调用）；参照接线 `chat-page.tsx` L524–556、`agents/…/page.tsx` L478–479 |
| 文档感知·结果字段 | `hybrid_search_tool.py` 结果 item＝`{chunk_id,text,doc_name,page,heading_path}`（同段）；缺 `doc_id`/`chunk_index` | 同（`hybrid_search_tool.py:81-87`） |
| 文档感知·工具/门控 | 无文档级工具；门控＝单名常量 `knowledge_scope_middleware.py:25`（两处按名生效） | 无文档级工具；门控＝工具内 `resolve_kb_scope`（无中间件层） |
| 文档感知·数据层（两树同） | chunk payload 带 doc_id＋索引 `(kb_id,doc_id,entities)`；`chunk_id={doc_id}#{index:04d}`；`list_chunks`/`chunk_positions`；服务 `list_documents`/`list_document_chunks`（L268/L364） | 同 |
| 失败悬停卡（第九节） | `document-panel.tsx` L320–370（原改动已撤回；同款内容待随 A 批次重放，见第九节） | `document-panel.tsx` L328–378（失败态 L328–347／降级态 L356–378；本次已改＝同排右收，并入 `624dd2967`） |
| 思考档位声明面（第十节） | 模型弹窗无思考/档位字段（`settings.models` 键表）；思考菜单单槽（VLM，L895–896）；唯一聊天模型腿＝VLM（原生 HTTP，`captioner.py:110`） | 模型弹窗能力区「可用/默认推理深度」（`model-capability-editor.tsx` L221–277）；思考菜单五槽（L931–935） |
| 模型选择器（第十一节） | KB 面板＝扁平壳＋搜索（`chat-panel.tsx` L499–544，`ModelSelectorInput`＝「搜索模型」、`models.map`）；主会话＝收藏件 `ModelPickerContent`（`input-box.tsx` L3472–3494／`sidecar-panel.tsx` L929；core＝`core/models/favorites.ts`＋`use-model-favorites.ts`＋`favorites-store.ts`，上游 e325c90b2 自带；i18n zh-CN L318–325） | 全链无收藏件（零命中）；主会话＋KB 同为扁平壳＋`chatPickerOptions` 过滤（`input-box.tsx` L2442／`chat-panel.tsx` L697）——已对齐、零动作 |
| 会话消息区滑条（第十二节） | `message-list.tsx` 经 `Conversation`（`ai-elements/conversation.tsx` L12–34）＝库原生常驻滑条；fork `6df401c81` 未随带 | `message-list.tsx` L336–342／L1012–1025＝`useStickToBottom`＋overlay ScrollArea（已带） |
| KB composer 流式态（第十三节） | Textarea `disabled={!kb || thread.isLoading}`（`chat-panel.tsx` L482）；主会话可输入参照＝`input-box.tsx` L1786（composerLocked 不含 streaming）／L3141–3143／L1575–1591 | 同缺（`chat-panel.tsx` L657）；主会话参照＝`input-box.tsx` L1359 |

## 裁定记录（第一、二节，2026-10-08，用户逐条裁定）
1. 问题一处置：**乙**——常态静默（「就绪」不再渲染）＋不折行加固；索引中/失败保留；全就绪时状态段整体不渲染。
2. 问题二·刻度轨：**随带恢复进 slice**（纯前端，不动「切片只读」边界）。
3. 问题二·编辑族：**仅记录为后置**（随 Phase-3 编辑族整体恢复）。
4. 动工：用户令「先不要生成 plan」⇒ 暂不出执行计划、未动工；落点（两树同步/随带进 slice）、TDD、门禁待「开工」后在执行计划内细列。

## 裁定记录（第三–六节，2026-10-08；含同日澄清）
1. 第三节·功能模型布局：✅ **已澄清＋已定（10-08）**——机制＝乙（视图切换，非对话框）；控件形态**已裁＝乙-b**（单枚「功能模型」钮：按钮行加一枚；进入功能视图后同钮原地变「对话模型」回程、「添加模型／重新加载」隐藏；i18n 2 键）。乙-a（原版两枚切换片）／丙（设置独立入口）不取。未动工，待「开工」后随执行计划实施。
2. 第四节·VLM 视觉声明：✅ **已裁（10-08）：甲**——后端一行（`_catalog()` config 行补 `supports_vision`）＋前端零界面变化；乙（全放行＋兜底）／丙（不修）不取。待「开工」后随执行计划实施。
3. 动工口径（沿用第一、二节）：落点（随带进 slice＋全量版同步）、TDD、门禁——待「开工」后在执行计划内细列；当前未动工。
4. 第五节·RAG 会话终止：✅ **已裁（10-08）：甲**——自绘 composer 原地加「流式中发送键变停止键」＋`thread.stop()`；乙（整块换共享 InputBox）不取。纯前端接线；未动工，待「开工」后随执行计划实施。
5. 第六节·重新生成对齐范围：✅ **已裁（10-08）：乙**——「重新生成」＋「编辑重发」都做；甲（仅重新生成）／丙（＋分支）不取。纯前端接线；未动工，待「开工」后随执行计划实施。

## 裁定记录（第七节，2026-10-08）
1. 刻度轨间距：**26**——24–28 带内取中（34 偏空、24 以下受热区留隙与弹窗行高所限）。
2. 显示门槛：**≥5**——对齐上游 conversation-outline 先例；「>5」口径不取。
3. **已实施**：并入压合提交 `624dd2967`（开发分支 feat/rag-knowledge-base；两处刻度轨所在树）；定向用例 57/57 绿；未推送。切片侧随 ② 恢复以新值带入。

## 裁定记录（第八节，2026-10-08）
1. 缺口成立：两树同源；数据层关联已全、缺口在模型面（工具＋结果字段）——补＝薄壳。
2. 载体：**乙**——独立 spec+plan 成对（`2026-10-08-rag-doc-tools*`）＋本账留痕；设计与 D1–D4 见 spec（**同日已裁：全甲**——篇内检索随本对／read 双寻址／引用不进／限次宽松档）。
3. 口径：**A＝并进首期**——RFC v3 声明句、25 条清单加行、审计 re-pin、验收材料补充相＝随带组（挂切片移植批次、RFC 发布前完成）。
4. 实现序：**主树先**（顺流）；切片随带（与 ② 刻度轨恢复同批次机制）。
5. 量：主树 4–6 笔（小对）＋切片移植 3–5 笔＋验收 1 相；无 UI/迁移/新端点。
6. 未动工：待「开工」后按成对执行。

## 裁定记录（第九节，2026-10-08）
1. 案：**甲**（同排右收）——文案与按钮同排两端（`flex items-center justify-between gap-3`；文案 `min-w-0 flex-1`、按钮 `shrink-0`），按钮垂直居中；乙（底排右对齐）／丙（卡片随内容收窄）不取。
2. **已实施**：主仓侧并入压合提交 `624dd2967`（⑦⑨＋记账五笔压一）；**切片侧改动已撤回**（原 `51f2ee9f1` 不留——PR 面不落未定稿 A 项；改动内容已补记第九节，待 A 批次重放）。均未推送。
3. 门禁：定向用例＝主树 73/73、切片 61/61 全绿；两树 `pnpm check` 零诊断；prettier＝切片全净、主树新行全净（余 1 处既有登记债＝`hasDegradedLeg` 签名，按「登记不修」不动）。
4. 实机观感未由我截图核验：自动化浏览器停在登录页、未输入任何凭据；结构已由用例钉住（同排容器＋按钮右缘）。若嫌「按钮垂直居中」、想换「首行右角」＝`items-start`，一句话改。
5. 第十节（RAG 思考档位）：**已裁（同日）：甲＝维持现状**（见下）。

## 裁定记录（第十节，2026-10-08）
1. 案：**甲（维持现状）**——RAG 腿按模型条目自己的默认档；不给 RAG 加档位控件；乙（功能视图加档位选择器）／丙（切片弹窗补声明字段）不取。
2. 依据：市场惯例＝索引/后台腿走快模型、思考只在查询侧（`2026-10-03-rag-leg-thinking-follow-chat-design.md`）；RAG 腿为批量任务、逐条档位收益低；切片哲学＝最小适配增量。想让某腿带档 ⇒ 改该腿所指模型条目的声明（全量版弹窗／切片 `config.yaml`）。
3. 无代码改动；本节至此收口。

## 裁定记录（第十一–十三节，2026-10-08）
1. 三则全取**甲**：⑪ KB 选择器换 `ModelPickerContent`（与主会话／sidecar 一字不差；搜索框随壳消失）／⑫ `message-list.tsx` 随带 fork 隐式化（照主仓成品）／⑬ 并入⑤（KB composer 流式可输入，两树同款）。
2. 未动工：待「开工」后随执行计划实施。
3. 提交口径（10-08 用户令）：A 档此后**不逐轮提交**——改动只留工作区，**待 plan 生成后与 plan 成对提交**。⑦⑨ 两处已实施改动在开发分支压合为一笔 `624dd2967`；切片侧两处改动不保留（待 A 批次重放）。

## 十五、切片裁剪残留（2026-10-08「少剪」全面核实新增；切片侧）

### 由来
用户令对切片树做「有没有少剪不相关内容」的全面核实（点名宠物／可视化／后置 RAG）。以「切片 vs 上游基座 `e325c90b2`」全部 329 个变更路径为全集逐面过＋全树墓碑词扫描＋命中内容级定性：**宠物、可视化（构成快照）、后置 RAG 腿（图谱·百科·视频·ASR·OCR）、其余别线特性（模型列表分组、门禁埋点、activity 灯）全部零命中**；余下 6 条痕迹级残留并入本对处理。

### 各条
- ①【补·用户可见】删除确认文案仍带被裁特性词——`zh-CN.ts:608-613`／`en-US.ts:647-652`（「…切片、向量**与图谱贡献**」／「…向量、**图谱与百科条目**」；渲染于 `document-panel.tsx:1203`〔删文档〕与 `middle-tabs.tsx:233`〔删库〕）⇒ 对齐切片事实改写 4 串；`document-panel.dom.test.tsx:386` 逐字断言随改。⚠️ 主仓该文案成立（图/百科在 Fork 真实存在）——只动切片。
- ②【删·死代码】`embed_texts.py` 三函数（entity／wiki 条目／人工卡片向量文本）在切片零生产调用（切片向量集合只剩 chunks，`vector_store.py:60`）；仅同批新增的 `test_embed_texts.py` 在维系 ⇒ 两件删除。
- ③【清·测试残留】`chat-panel.dom.test.tsx:37-42` mock 了切片不存在的 `@/core/threads/activity-context`（死件；实测该件 19/19 绿）＋`:49-57`「刻度轨接线」假滚动层与 `data-human-turn` 脚手架、`§10.3`／agent-pet 注释（切片 `chat-panel.tsx` 零引用）。
- ④【扫·注释族】~15 处注释/文档串仍为 Fork 口径（后端 11＋前端 6；清单见 plan Task 10）——不影响运行。
- ⑤【销项】`GET /{kb_id}/chunks`（批量取切片）：前端零调用（消费方＝被裁的 wiki 抽屉）、后端有测试在管——复核留面明文「切片只读」⇒ **属首期范围，维持不动**。
- ⑥【削·已裁】`chunk-card.tsx` L190-210「实体」徽章行＋`entities` prop/state＋`ENTITY_CAP`（L13）：切片无图谱回填、`entities` 恒空 ⇒ 渲染实际休眠（用例 `chunk-drawer.dom.test.tsx:125-140`）。**✅ 裁定（2026-10-08）：削**——连同 `chunk-drawer.tsx:289` 传参行与上述用例一并删；`Chunk.entities` 类型（`types.ts:91`）与后端列保留（schema 对位）；并入 plan Task 10 同笔。

### 已核销（不处理）
`tab-strip.dom.test.tsx:23-39` 图谱/评测 tab 夹具＝有意自带（注释声明「标签自足」）；`entities` 列/Qdrant payload＝`models.py:81-83` 明文 schema 对位；TEI 稀疏/重排与方舟嵌入＝RFC v3 L240/L250/L251 范围；语音输入/输入优化键＝上游基座自带。

## 裁定记录（第十五节，2026-10-08）
1. 并联裁定：用户令「都放到 A 中」⇒ ①–④ 落本对（切片侧；执行载体＝plan Task 10）；⑤ 销项维持；⑥ **已裁（2026-10-08）：削**，并入 Task 10 同笔。
2. 未动工：待「开工」后按 plan 执行。

## 执行记录（2026-10-08「开工」全落）

| 节 | 实施 | 提交 |
| --- | --- | --- |
| ① footer 状态段 | 两树 | 主 `6a17e966e`／切 `9e66ba1bb` |
| ② 刻度轨恢复 | 切片 | `7d20d24b3` |
| ③ 视图切换·乙-b | 切片 | `1092f3143` |
| ④ VLM 补链 | 切片后端 | `183896c54` |
| ⑤＋⑬ composer 流式态 | 两树 | 主 `24a819771`／切 `bc7eaed26` |
| ⑥ 消息动作行 | 两树 | 主 `ab3515714`／切 `19527ee6f` |
| ⑦ 刻度轨间距/门槛 | 已随压合笔 | `624dd2967`（留档） |
| ⑨ 悬停卡右收 | 切片重放 | `87683069a` |
| ⑩ 档位维持现状 | 零动作 | — |
| ⑪ 选择器对齐 | 切片 | `889ae8d9d` |
| ⑫ 滑条隐式化 | 切片 | `cc7cc39a0` |
| ⑧ 文档感知缺口 | 另对 | `2026-10-08-rag-doc-tools*` |
| §十五 ①②③④⑥ | 切片清理 | `548f54706` |

门禁（零新增归因）与真栈验收（全项过；资源隔离于并行会话）逐条见 plan 文末「执行实测」；验收证据档＝`E:/app-model/deer-flow-scratch/acceptance-a12/acceptance-evidence.md`（截图 4 张随会话）。
