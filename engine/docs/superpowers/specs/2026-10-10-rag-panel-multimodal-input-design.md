# RAG 面板多模态输入（图片提问 · 语音听写） —— 设计

**Status:** 已裁（D1–D6 全甲，2026-10-10）；**主树已全落**（Task 0–4 交付，2026-10-11；前端全量 251 files/2863 tests 全绿＋`pnpm check` 零诊断；后端仅 SOUL ⇒ 窄面 `test_rag_agent_assembly.py` 9 passed；真栈 W22 服务端＋真浏览器手验均过——见 plan 纪行与提交链）；**手验后修复一笔**（2026-10-11 `02ca38f86`：回答内图片 artifacts 解析＋听写中止对齐主对话）；**手验后修订（2026-10-11）：修复两格已落（见 §6.1）；同类渲染排查已裁已实施（§6.3）；视觉对齐 D7–D10 已裁全甲并全部已实施；窄档跟进 D11–D14 已裁全甲并已实施（D14 判据二改：行内空裕 free，真栈复验过——见 §6.4；随窗待放行）**；**树归属**：主树（切片随带＝另议）。载体＝成对（本文件＋`../plans/2026-10-10-rag-panel-multimodal-input.md`）。来源：他问「主对话能传图/语音，RAG 面板呢」→ 本日现场核实（全部锚点为实读行）＋他令「**语音随批一起**」。**终审 2026-10-10：勘误两处已写回（chat-panel Textarea 行号 `:684`、SOUL 不点名 `view_image` 口径）＋受害者面实名（`chat-panel.dom.test.tsx` 878 行钉 composer ⑤＋⑬；`input-box-helpers.ts` 职责=slash/goal、语音 hook 不塞入；input-box 语音接线无直接用例）＋`include_uploads` 归属实核（lead wrapper `:289` 起=True）。**

**本对一件事：把主对话已有的两种输入能力补进 RAG 问答面板——①图片作为提问素材（附件/粘贴→线程 uploads→vision 模型 `view_image`）②语音听写（浏览器 STT→草稿框）。后端看图链与消息渲染层已在且两面板共用；缺的只在 RAG 面板的输入层。**

## 1. 现状与缺口（锚点，实读）

- **主对话两种输入已全有**：粘贴/选文件→附件（`input-box.tsx:1905/1914`；composer 缩略图 `prompt-input.tsx:304/322/356`）；**发送时上传**（`core/threads/hooks.ts:2222` `uploadFiles(threadId, files)` → `/api/threads/{id}/uploads`，`core/uploads/api.ts:51-62`）；语音听写（上游 `be637163a` PR #4036：接线状态机 `input-box.tsx:361-449/1379-1450+`、mic 钮 `:2563`、纯工具层 `core/voice-input/speech-recognition.ts`〔`getSpeechRecognitionConstructor:78`／`getSpeechRecognitionLanguage:87`／`shouldRestart…:100`〕、错误文案 `t.inputBox.voiceInput*` `:1385-1397`、模块测试 `frontend/tests/unit/core/voice-input/speech-recognition.test.ts`）。
- **后端看图链已在**：`view_image` 仅当所选模型 `supports_vision` 时挂（`tools.py:116-120`）；工具限 `/mnt/user-data/{workspace,uploads,outputs}` 三根、20MB、魔数判型（`view_image_tool.py`）；`ViewImageMiddleware` 调用前注入 base64 隐藏消息、调用后 `RemoveMessage` 清理。**uploads 注入＝lead 家族 True**（`tool_error_handling_middleware.py:299`；subagent 才 False `:328`）⇒ rag 助手（custom agent 走 lead 链）已有。
- **展示层两面板共用**：RAG 面板消息渲染用共享 `MessageList`（`chat-panel.tsx:37`）；`MessageImage`＋`resolveMessageImageURL`（`core/artifacts/utils.ts:94+`：`/mnt/…`→artifacts API、相对产出路径、外部 http(s) 直渲）⇒ 图进了线程就会渲染，**无需新做**。
- **缺的只在 RAG 面板输入层**：`chat-panel.tsx` composer＝自建小容器（Textarea `:684` 起、`draft` 受控、Enter 守卫至 `:704`；注释自述 "styled after the home-page InputBox" `:680-681`；面板已同域引用 `t.inputBox.*` 先例 `:694`）；**无附件、无 mic**（本日 grep 零命中；无附件 state/上传调用）；composer 另有**流式中换发送/停止**行为（问题包 ⑤＋⑬）——加附件/ mic 不得破。
- **门槛**：rag 助手模型需 `supports_vision`（t6 默认模型 qwen3.8-flash ✓）；不满足时 `view_image` 不挂——口径见 D3。

## 2. 方案

### 2.1 图片提问（面板附件，后端零改）
- composer 增附件区：选文件＋粘贴（复用 `splitUnsupportedUploadFiles`／`validateUploadLimits`／`useUploadLimits` 同款校验与文案）；
- pending 文件**随发送走、发送时上传**（与主对话同款）：`uploadFiles(threadId, files)` 后照现有 submit 发 run（面板线程已存在，无新建路径）；
- 后端不动：图进线程 uploads → 清单注入 → 模型（有 vision 时）自行 `view_image`；面板**不做前端能力门控**（按 D3）。

### 2.2 语音听写（面板移植，按 D1 定形态）
- 复用：支持检测（`getSpeechRecognitionConstructor`）、语言（`getSpeechRecognitionLanguage(locale)`）、错误 i18n（`t.inputBox.voiceInput*`，面板已同域引用 `t.inputBox.*`——`chat-panel.tsx:694` 先例）；
- 行为对齐主对话：连续听写／停止请求／重启定时／错误态文案；听写文本并入同一 `draft/setDraft`；
- mic 钮落 composer 尾部（与深度检索开关同排）；不支持时按 D2 实读口径（禁用＋tooltip 提示）。

### 2.3 引导（按 D5）
- SOUL 加半句：**用户随消息附了图时的作答口径**——图＝用户提供的问题语境，先理解图再按检索工作流用知识库佐证/补充；图上内容不标 `[n]`，知识库结论照常标 `[n]`。
- ⚠️ 句内**不点名 `view_image`**：该工具仅 vision 模型下挂载，点名会给非 vision 模型造悬空引用（与「文档级/百科级」同款教训）。

### 2.4 不碰面
- 音频文件上传/转写（≠语音输入；不做）；图片"入库"对话入口（管理面已有）；回复带图（已支持）；主对话既有行为（除 D1 甲 的等价抽 hook 外零改）；后端代码（除 SOUL 半句外零改）。

## 3. 决策点（已裁：2026-10-10 全甲——即各点首选项）

- **D1 语音工程形态**：**甲**＝抽共享 `useVoiceInput` hook 于 `core/voice-input/`、input-box 与面板共用（单一实现防漂；动主对话 composer，需复核其既有用例与前端全量）／乙＝面板内复制接线（零动主对话，两份实现有漂移风险）。
- **D2 语音可用性口径**：**甲**＝与主对话一致（浏览器不支持时按钮**呈禁用＋提示**——实读 `VoiceInputButton`：`disabled … || !supported`、tooltip 转「不支持」文案；语言按 locale 取）／乙＝面板另加不可用说明。
- **D3 图片的模型口径**：**甲**＝不做前端门控；模型无 vision 时后端如实（`view_image` 不挂、按工具返回提示照实）／乙＝前端按模型能力禁用附件（需把模型能力引入面板，多一层耦合）。
- **D4 附件 UI 形态**：**甲**＝复用 ai-elements 附件条组件（`PromptInputAttachment(s)`，与主对话同观感）／乙＝面板内轻量 chips。
- **D5 引导面**：**甲**＝SOUL 半句同批／乙＝不动 SOUL。
- **D6 验收面**：**甲**＝前端 dom 用例＋`pnpm check`＋真浏览器手验（附件/mic 两态）＋真栈 W22（REST 级：上传图→提问→审 `view_image` 与回答融合）／乙＝仅 dom（不跑真栈）。

## 4. 验收（判据）
- 前端：`pnpm check`（eslint+tsc）零诊断；前端测试全量（口径=0 失败）；新增 dom 用例（附件 pending→`uploadFiles` 调用；mic 钮态与不支持（禁用＋提示）口径）。
- 后端：仅 SOUL 半句 ⇒ `test_rag_agent_assembly.py` 钉句族复核（不出红）；后端代码零改（不跑后端全量，理由入纪行）。
- 真栈 W22（t6 实例）：REST 上传探针图到线程 → 提问（图内容＋知识库）→ transcript 证 `view_image` 被调、回答融合；**前端 UI 两态手验**（真浏览器截图）。
- 树复核：切片零改动（随带另议）。

## 5. 明确不做（另案）
- 音频文件上传/转写；图片经对话入库；回复带图新机制；主对话语音行为改动（除 D1 甲 的等价重构）；切片随带（另议）。

## 6. 手验后修订（2026-10-11，追加）

> 来源：真浏览器手验（代理模式）＋他的实测与观感评审。修复两格已落（修复一笔 `02ca38f86`，纪行见 plan「交付后修复」）；视觉对齐四格为追加决策点 **D7–D10（D10 已裁已实施；D7–D9 待裁）**。

### 6.1 已修（记录）
- **回答内图片**：面板 `renderMessageContent` → `KbAssistantContent` **整体替换**默认 `MarkdownContent`，而它只带 `sup` override ⇒ 丢默认路径的 `img`（`MessageImage`：/mnt→artifacts API）与 `a` override；助手 markdown 图（`![…](/mnt/user-data/uploads/…)`）按原始 src 渲染 → 404 → streamdown 占位「Image not available」（同线程对照：用户附件图走 MessageImage 不受影响）。修法：`MessageImage` 抽共享模块 `messages/message-image.tsx`；`KbAssistantContent` 补 `threadId`＋`artifactPaths` 并同带 `img`/`a`；面板传 `extractArtifactsFromThread(thread)`。真浏览器复验：占位 0、两 img 均 artifacts URL 且加载成功。
- **听写中止对齐**：面板补主对话同款「提交即中止」（handleSubmit 守卫后 abort）＋「切会话中止」（`[threadId]` 清理 effect）。

### 6.2 视觉对齐（D7–D10 已裁全甲，全部已实施）

口径基准＝**主树主对话（input-box）现值**，逐项同值（真浏览器实测）：

- **D7 附件/语音/发送钮**：面板现值 32×32 全圆＋图标 16px＋foreground 近黑；主对话 28×32 圆角 8px＋图标 12px＋muted 中灰；发送钮面板实心黑圆 vs 主对话 outline 圆（发送钮为核实中一并发现的同类差异，他未点名）。**甲＝逐项对齐主对话**（`PromptInputButton` 口径：h-8／px-2／size-3 图标／muted 色／圆角方；发送改 outline 圆）／乙＝维持现值。**✅ 已裁（2026-10-11 全甲）：已实施**——三钮换 `PromptInputButton`（`px-2!`＋size-3 图标）；行级加 `text-muted-foreground`（对齐主对话 `InputGroupAddon` 的继承色）；发送钮 `variant="outline"`。用例 2 条（D7 按钮口径＋D8 位置）；neuter 恰红（并抓出首版断言空转：`border` 在 Button 基类里，改判别式 `bg-background`／非 `bg-primary`）。
- **D8 模型选择位置**：面板在左组（深度检索之后）；主对话在右组（模型→发送）。**甲＝挪到右组**（发送键左侧）／乙＝维持。**✅ 已裁（2026-10-11 全甲）：已实施**——ModelPicker 移入右组（`data-testid="panel-composer-actions"`，与发送同排、在其左）。
- **D9 picker 同框（轻档）**：面板触发钮与弹窗与主对话完全同框——触发钮统一 `PromptInputButton` 风格（去自绘 chevron 与 `title` 差异），弹窗本体不动。**甲＝同框**／乙＝维持现值。**✅ 已裁（2026-10-11 全甲）：已实施**——触发钮换 `PromptInputButton`＋主对话同款内层（`flex min-w-0 flex-col`＋`flex-1 truncate…` span），去自绘 chevron；overflow 测试扩至三文件（input-box／sidecar／面板）钉触发钮标记。

### 6.4 窄档行为跟进（2026-10-11 他裁全甲，已实施）

> 来源：D7–D9 落地后的真栈窄档观察（三张实测截图）。根因各不同：

- **D11 左组间距**：面板行 `gap-2`（8px）vs 主对话 `PromptInputTools gap-1`（4px）——附件↔语音显得过大。**甲＝左右两组均 `gap-2`→`gap-1`**（同主对话先例）／乙＝维持。
- **D12 模型触发钮缩略**（**D9 引入的回归，认账**）：换装前是自绘 `<button>`（无 shrink-0）→ 文字可截断；换 `PromptInputButton` 后吃到 Button 基类的 **`shrink-0`** ⇒ 不再收缩、把右组（模型+发送）向右挤。**甲＝触发钮 className 加 `shrink`**（twMerge 覆盖基类；文字按既有 `truncate` 省略）／乙＝维持。
- **D13 深度检索窄档缩略**：label（Switch＋文字）现为 `shrink-0`＋`whitespace-nowrap`、无窄档处理——窄栏时顶出溢出。**甲＝行加 `@container`（抄 sidecar 先例 `:612`／`:624`）＋label 文字 span `@max-[≈380px]:hidden`**（只留 Switch；Tooltip 保留可读）——阈值以真机三档校准（实施时给 340/380/420 实测）／乙＝维持。
- **可选兜底（不裁）**：若还要更窄，可照 sidecar 给触发钮加 `@max-[240px]:hidden`（连模型选择一起隐）——默认不做。

**✅ 已裁（2026-10-11 全甲）：已实施**——行／左组／右组三处 `gap-1`＋行加 `@container`；触发钮加 `shrink`（twMerge 覆盖基类 `shrink-0`）；深度检索文字 span `@max-[380px]:hidden`。用例＋3（gap 口径／`shrink` 精确 token／`@container`＋`@max` 标记，RED 3 恰红后转绿）；真栈三档校准（拖分隔条实测）：**容器查询按内容盒判**——行 390（内容 374）标签已隐、行 401（内容 385）仍显，与 380 阈值吻合；行 353 窄档：标签隐后左组 96、模型全名保留、行零溢出（scrollWidth==clientWidth）、发送在行内；栏宽随后还原。**保留 380 无需调整**（紧凑点≈内容 366，380 且对长名留余量）。**（2026-10-11 D14：此固定阈值已退役——行 `@container`／文字 `@max-[380px]` 均撤除，改内容驱动判据，见下条。）**

- **D14 深度检索隐藏改内容驱动（2026-10-11 他指陈旧设计）**：现 `@max-[380px]:hidden` 为**固定阈值**——长名/短名模型一刀切，与「按当前模型长度判断」相悖。**✅ 已裁（2026-10-11 他裁「甲」×2）：已实施（随窗待放行）**——甲＝挤压/空裕驱动（抄仓内 `useToolbarTier` 同思想先例）；撤固定 `@container`／`@max`。**判据二改（真栈读数为据）**：初版「span 空裕（client−scroll）判恢复」在真栈暴露两缺陷——①恢复判不出（content-sized 触发钮的 span 空裕恒 0，row 307 标签隐后 scroll==client=94）②长名撞 `max-w` 上限的"名义挤压"（无空间压力）会误隐；改为**行内空裕 free 判据**：`free = row.clientWidth − 16（px-2）− tools.offsetWidth − 4（gap-1）− actions.offsetWidth`；**隐藏**＝模型名被挤（span.scrollWidth > clientWidth+1）**且 free ≤ 2**（空间性挤压守门，排名义截断）；**恢复**＝隐藏时刻记录的 `文字宽 + 6（gap-1.5）+ 8（滞回）`（隐后 span 的 offsetWidth 为 0，故必须隐前记录）；每渲染后校准（换模型自动重判）＋ `ResizeObserver` **观测行**（拖宽即触发恢复）。挂钩点：行＋左组＋右组三个 ref、行/左组补 `data-testid`（`panel-composer-row`／`panel-composer-tools`）。用例 3（默认可见／挤压隐＋放宽恢复／名义截断不隐——第三条为旧两版都会红的判别用例），happy-dom 钉 offset/clientWidth 按 testid 模拟（eval-tab 先例）；neuter（回归旧判据）恰红两用例；**全量首跑抓出 `model-selector-overflow` 抽取正则失配**（span 上 ref/testid 使「一键字面量」正则判不出 ⇒ 放宽为容许属性段，断言未动）。**真栈复验（2026-10-11，t6 栈）**：row 307＋mimo⇒隐（free 41 < 阈值 62）；拖分隔条至 row 340（折叠列表栏当杠杆，列表栏展开时 documents 已到 min 320 拖不动——约束正确行为）⇒恢复（文字宽实测 48）；**同一 row 340 仅换模型**：长名 DeepSeek/deepseek-v4-flash（174px）⇒隐、短名 deepseek-flash（86px）⇒显——「按当前模型长度判断」成立；收尾还原（模型/列宽/折叠态；列宽 2px 拖拽边界漂移）。名义截断分支 t6 无法自然触发（最长名 174+16 < 上限 224），由用例三覆盖。证据 `acceptance-t6/d14-ui-evidence.md`。
- **D10 上游新 picker（重档）**：上游 bytedance/deer-flow 已为 Popover＋收藏版（`model-picker-content.tsx`：Star／`useModelFavorites`／favorites 排序；主对话＋sidecar 均在用）；切片树（上游基座）自带、且其 RAG 面板已同框；主树（fork 点之后）两处均为旧 ai-elements Dialog。移植＝连主对话（及 sidecar）一起换＋favorites 数据层／i18n／测试。**✅ 已裁（2026-10-11）：乙＝做（对齐上游）**——他令「还是需要对齐一下，因为 RAG 中只有这个和主会话有联系」。落法（实核切片＝上游逐字节同版）：拷贝 5 件（`core/models/{favorites,favorites-store,use-model-favorites}.ts`＋`components/workspace/model-picker-content.tsx`＋两测试）；三处换装（input-box／sidecar-panel／知识面板）；**保主树特有两件**——①三处 models 传参保留 `chatPickerOptions` 过滤（models-list-grouping §2④）②面板的 per-kb 记忆与触发钮形态不动（D7–D9 另裁）；旧 `ai-elements/model-selector` 保留（上游同样留用未删）；收藏层＝纯前端 localStorage（无后端）。**已实施（2026-10-11，随窗待放行）**：6 件拷贝＋i18n `modelPicker` 三件（zh／en／types）＋新依赖 `@radix-ui/react-popover@^1.1.15`；面板测试补 `useAuth` mock＋收藏 picker 用例；overflow 测试改断言 `models={chatPickerOptions(models)}`（§2④ 分叉，注记在案）；`searchModels` 键保留（上游同留）。门禁：定向 3 文件绿、`check` 零诊断、全量 **253 files／2890 tests 全绿**。

### 6.3 同类问题排查（2026-10-11，已裁＝收窄版）

> 由「Image not available」举一反三：`MarkdownContent` 的解析 override 靠**调用点自传**——img 默认完全无解析（仅 `a: createMarkdownLinkComponent()` 无 threadId＋code/pre）；凡「另起 `MarkdownContent`／替换渲染器」处，漏传即断。全量清点（`<MarkdownContent` 共 13 处）：

- **风险中高**：`message-group`（处理步骤·助手文本／reasoning／最后思考，3 处）——模型把图 markdown 写进中间步骤时同样断，`/mnt` 链接同；`subtask-card`（子代理步骤文本／结果，2 处）。
- **风险低**：`message-list` 两处特殊组正文（`assistant:clarification` `:1221`／`assistant:present-files` `:1247`）、`wiki-entry-drawer`（wiki 正文）、`human-input-card`（context／question，2 处）。
- **已自带**：`chunk-card`（`ChunkImage`：kb/doc 语境重写＋失败降级；`a` 未带 threadId 为轻差）；`message-list-item` 默认路径（img＋a ✓）；`kb-assistant-content`（本日已修 ✓）。
- **RAG 对话适用面（实核）**：真正落在 RAG 对话流里的只有 **处理步骤（message-group，中高）＋澄清回合（`assistant:clarification`／human-input-card，低）**；`subtask`／`present-files` 属主对话（rag agent `tool_groups:[rag]`、无子代理白名单、无文件产出面 ⇒ 两类回合在 RAG 不出现）；`wiki-entry-drawer`／`chunk-card` 属知识页展示面、非对话渲染。
- **切片树复刻**：其 `kb-assistant-content`＋`chat-panel.renderMessageContent` 与主树修复前**逐字同款** ⇒ 同缺陷存在（随带与否随树归属另议）。
- **修法两档（待裁）**：**甲＝逐点补**（各调用点补 img／a override＋用例；`message-group` 已有 threadId，其余按各自上下文引入）／**乙＝下沉管道**（`MarkdownContent` 默认 components 参数化／上下文化，一处修全链兜底；动共享渲染核心，需全量回归）。
- **✅ 已裁（2026-10-11）**：**甲（收窄版）＝只补步骤区（`message-group`，img＋a override）**；其余四点（澄清卡／子任务卡／呈现文件／wiki 抽屉）登记为**「已知潜在·随上游」不修**；**乙（下沉管道）不做**。裁据：上游主路已补（`message-list-item` 自传 `img: MessageImage`）、旁路同裸——"上游没补"不构成不补理由，判断标准＝本功能是否现实触发；步骤区＝「同一内容换个落点」的近邻（知识库面板把回答带图变常态），故补；其余点触发面太低或不在 RAG 对话面，随上游零分叉。**已实施（2026-10-11，随窗待放行）：见 plan「交付后修复」同类排查条。**
