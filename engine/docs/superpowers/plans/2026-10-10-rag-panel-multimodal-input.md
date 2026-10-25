# RAG 面板多模态输入（图片提问 · 语音听写） —— 实施计划

## 范围与交接

一对一件事＝①图片提问（面板附件＋发送时上传）②语音听写（按 D1 形态移植）。成对 spec 同名（`../specs/2026-10-10-rag-panel-multimodal-input-design.md`），决策点 D1–D6 见 spec §3（**已裁全甲**：①抽共享 `useVoiceInput` hook／②与主对话一致（不支持＝禁用＋提示）／③不做前端门控／④复用附件条组件／⑤SOUL 半句同批／⑥dom＋`check`＋真浏览器手验＋真栈 W22）。**树归属**：主树（切片随带＝另议）。**不碰**：后端看图链与 uploads 注入（已在）／消息渲染层（两面板共用）／音频转写／图入库对话入口／主对话既有行为（除 D1 甲 的等价抽 hook）。TDD：前端按 `frontend/AGENTS.md`（rstest dom 用例；新行为带测试）；提交信息英文 conventional；只 stage 本线文件。

## 硬约束（执行期注意）／Global Constraints

- **前端命令**（照 `frontend/AGENTS.md`）：`cd frontend && python ../scripts/pnpm.py check`（eslint+tsc）／`python ../scripts/pnpm.py test`（全量，口径=0 失败）；单文件＝`python ../scripts/pnpm.py test <路径>`（rstest 位置参数；**不要 `--run`**；多文件过滤用目录）。
- **复用不重造**：附件校验/上传/limits 全用 `core/uploads/*`；语音全用 `core/voice-input/*`＋`inputBox` i18n 键；**不新增后端接口**。
- **i18n**：优先沿用既有键（附件与语音文案均已有）；确需新键则 `zh-CN`/`en-US` 同笔。
- **dom 驱动注意**（在案坑）：Radix 菜单 aria-hide 查询加 `hidden: true`；happy-dom 合成 PointerEvent 无 `pointerType`（Select 用 `fireEvent.click`）；滚动落点断言会被 happy-dom 不 clamp 骗过——凡滚动/几何类另行真浏览器量。
- 真栈仅测试库；临时件收尾；`config.yaml`/`rag_config.json` 零改动。

## Task 0 — 落点核实

> 动到的文件：只读核实＋spec/plan 回填（本对文档）

- [x] ① 主对话上传链复核：`core/threads/hooks.ts:2222` 上下文（pending 附件→submit 的数据形状、optimistic 消息更新）；chat-panel composer 行域与 submit 链（`draft` 态、`handleSubmit`、threadId 来源）；附件组件 API（`PromptInputAttachment(s)`＋controller `files/add/remove` 表面）；② 语音接线行域（`input-box.tsx:361-449/1372-1450+/2563`）与 hook 抽取边界（依赖面：draft setter、refs、toast、i18n）；③ i18n 键清单（`t.inputBox.voiceInput*`、`t.uploads.*`）；④ SOUL 落点行；⑤ 受害者面实名：`frontend/tests/unit/knowledge/chat-panel.dom.test.tsx`（878 行；钉 composer 占位「向当前知识库提问…」、disabled 态、流式中换发送/停止 ⑤＋⑬——改 composer 必复核）／`frontend/tests/unit/components/workspace/input-box-helpers.test.ts`（纯 helpers：slash/goal 面）／`frontend/tests/unit/core/voice-input/speech-recognition.test.ts`（模块面，抽 hook 不许动它）；**input-box 语音接线本身无直接用例**（终审实核）⇒ D1 甲 回归网＝模块测试＋前端全量＋真浏览器手验；⑥ D1–D6 裁定值回填。

**Task 0 复核结果（2026-10-10 执行；终审已预扫、执行期实读）**：
- ① **面板 submit 链**：`threadId`＝客户端 uuid（`chat-panel.tsx:111`）、`useThreadStream({threadId: isNewThread ? undefined : threadId})`（`:203-204`）、`handleSubmit` 现硬编码 `files: []`（`:325-333`）＋同步 `setDraft("")`；`sendMessage(threadId, {text, files?}, extraContext?, options?)`（`hooks.ts:2122`；`onSent` 在"真正过了 in-flight 门"后触发 `:2135-2138`）；上传转换/乐观"上传中"消息/limits 全在钩子内**零改动可复用**（`hooks.ts:2170-2240`；`promptInputFilePartToFile` 认 `part.file`、url 仅作兜底——clear 撤 objectURL 不影响带 file 的部件）。
- ② **knowledge 布局已包 `<PromptInputProvider>`**（`app/workspace/knowledge/layout.tsx:18`）⇒ 面板内 `usePromptInputController/Attachments` 现成：附件 `add/remove/clear/openFileDialog`（prompt-input `:168-200`，部件形＝`{id,type:"file",url:objectURL,mediaType,filename,file}`）、列表 render-prop `PromptInputAttachments`（`:392-410`）＋条组件 `PromptInputAttachment data`（`:292+`）；input-box 三同款点位可照抄：按钮 `:2636-2663`（`openFileDialog`＋tooltip）、粘贴 `:1905-1922`、渲染 `:2234-2240`；submit 清理参照 prompt-input 表单 `:782/789`（clear attachments + textInput）。
- ③ **语音**：纯工具层全在模块（constructor `:78`／language `:87`／restart 判定 `:100`／transcript `:106`／append `:131`／error map `:149`）；接线在 input-box（refs `:361-370`／清理三件 `:406-455`／start `:1403-1488`（onresult→`textInput.setInput`、重启 150ms 环）／stop/toggle `:1504-1538`＋polish/history 复位为 input-box 专属（留宿主或回调）／mic 钮 `:2545-2569`：`PromptInputButton`、`aria-pressed`、`data-testid="voice-input-button"`、不支持禁用）；**下沉点＝`textInput.setInput`（两宿主同在 provider 内 ⇒ hook 无需宿主注入文本 sink）**；建议 hook 出参 `{supported, listening, toggle, stop}`＋选项 `{disabled?, onStarted?}`（focus 行为留宿主）。
- ④ i18n 键在案：`voiceInput*`（zh `:296+`／en `:328+`）、`uploads.*`（`uploadingFiles` zh `:1459`／en `:1549`；limits 文案样式照 `input-box:482-506`）。
- ⑤ 受害者面（终审实名）不变；另注：主树工作区现有一处**别线在飞** `M README.md`（感知链后补写）——**不碰、不进本线提交**。
- ⑥ D1–D6 全甲已回填 ✓。

## Task 1 — 图片提问（前端 TDD）

> 动到的文件：`frontend/src/components/workspace/knowledge/chat-panel.tsx`（＋按 D4 复用的附件组件）＋对应测试

- [x] RED：面板附件 pending（添加/移除）→ 发送时 `uploadFiles(threadId, files)` 被调；上传失败态文案；limit 校验文案（照 `t.uploads.*`）；GREEN：附件区＋submit 改造（发送时上传→照现有 run 调用；composer 既有「流式中换发送/停止」⑤＋⑬ 行为不得破）；neuter 一次（去上传恰红后还原）。
- [x] 门禁：`pnpm check`＋定向 dom 用例。

**实测（2026-10-10 执行）**：RED 2 例（附件→发送带 `files`＋`onSent` 后清行；空稿仅附件可发送）→ GREEN **37/37**。两个测试环境坑记档：happy-dom 自带 `createObjectURL` 但拒收其 File（无条件桩）；i18n `filesTooLarge` 首参＝文件名串（照 input-box 原形）。**连带修复（3 条既有轨迹用例）**：原测试夹具无 provider、且 trace 用例内联"旧一层包装"的 `rerender`——包出后包装深度不一致致 React 重挂面板、去重/事件 ref 复位（重复上报 2 次／丢失 0 次）；引入 `wrapPanel` 统一包装器（i18n＋react-query＋PromptInputProvider，与生产 layout 同形）并加防再犯注记后全绿。neuter（还原原始 canSend/发送块）恰红 2 例后还原。`pnpm check`（eslint+tsc）通过。

## Task 2 — 语音听写（按 D1 形态）

> 动到的文件：按 D1——甲：`core/voice-input/` 新 hook＋`input-box.tsx` 等价接线＋`chat-panel.tsx`；乙：仅 `chat-panel.tsx`。＋对应测试

- [x] RED：mic 钮渲染条件（不支持时**禁用＋提示**，按 D2 实读口径）；listening 态切换（点按开始/停止，stub 构造器）；转录入草稿；GREEN：按 D1 落实现（hook 落 `core/voice-input/`；**不塞 `input-box-helpers.ts`**——该模块职责=slash/goal）；neuter 一次（恰红后还原）。
- [x] 门禁：`pnpm check`＋定向 dom 用例＋（D1 甲）前端全量复跑（动主对话）。

**实测（2026-10-10 执行）**：抽取＝新 `core/voice-input/use-voice-input.ts`（ref-latest 防陈旧闭包；出参 `{supported, listening, toggle, stop, abort}`——`abort` 供宿主 `handleSubmit`/切会话沿用原语义；文本 sink 由宿主注入，**不动模块纯工具层**）；input-box 等价接线（原状态机 ~190 行删除；早段回调经 `voiceAbortRef` 桥接避开 TDZ；切会话中止挂 `[threadId]` 清理；行为零改）。面板：hook＋mic 钮（D2 实读口径＝不支持呈**禁用＋tooltip 提示**）＋草稿回流＋`onStarted` 聚焦。RED 2 例（不支持禁用；toggle→转写入稿→停止）→ GREEN **39/39**；neuter（去 `onClick`）恰红 1 例后还原。`pnpm check` 通过；抽取后既有受影响三文件（input-box-helpers／voice 模块／面板 878 行）**84/84**。两坑记档：假识别 `stop()` 须手动触发 `onend`（真浏览器异步收尾）；空箭头 ref 触 `no-empty-function`（改可空 `?.()`）。

## Task 3 — 引导（SOUL 半句，按 D5）

> 动到的文件：`backend/packages/harness/deerflow/agents/assets/rag/SOUL.md`（主树独有）

- [x] SOUL 加图问答半句（图＝用户提供的问题语境；先看图再按检索工作流用知识库佐证；图上内容不标 `[n]`、知识库结论照常标 `[n]`；**句内不点名 `view_image`**——仅 vision 模型挂载，点名给非 vision 模型造悬空引用）；`test_rag_agent_assembly.py` 复核（钉句族不分叉）。

**实测（2026-10-10 执行）**：SOUL 检索工作流追加第 6 条「附图问题」（原文：图是用户提供的问题语境／先理解图再按工作流用知识库佐证或补充／图上内容不标 `[n]`、知识库结论照常标／无法查看图片时如实告知；**未点名 `view_image`**）。`test_rag_agent_assembly.py` = **9 passed**（钉句族 `:58-:71` 不分叉）。

## Task 4 — 门禁＋真栈 W22＋真浏览器手验＋回填

- [x] 前端全量（`pnpm test`＋`check`，0 诊断/0 失败）；后端仅 SOUL ⇒ `test_rag_agent_assembly.py` 窄面（不跑后端全量，理由入纪行：零后端代码）。
- [x] 真栈 W22（t6 实例）：REST 上传探针图到线程 → 提问（图内容＋知识库）→ transcript 证 `view_image` 被调、回答融合；**真浏览器手验**（面板附件/mic 两态截图，10(a) 同款口径）。
- [x] 回填：本 plan 纪行（Task 0–4 逐格勾＋实测）＋spec 状态行；提交链落定。

**实测（2026-10-10/11 执行）**：前端全量 `pnpm test`＝**251 files / 2863 tests 全绿**（3m40s）＋`pnpm check` 零诊断（exit 0）；后端仅 SOUL ⇒ 窄面 `test_rag_agent_assembly.py`＝**9 passed**（零后端代码，不跑后端全量）。真栈 W22（t6）：REST 上传探针图→提问→transcript 证 uploads 注入（`list_uploaded_files` 见件）、`wiki_search(title="证件")` 直取、`hybrid_search` 命中、`view_image` 读到图、回答融合（红圆描述＋证件条目引用）——见 `w22-evidence.txt`。**真浏览器手验**（两环境坑排除后——①dev server 缺 `DEER_FLOW_DEV_ALLOWED_ORIGINS` ⇒ 页面不水合；②拆域 `NEXT_PUBLIC_*` 直连 ⇒ LangGraph SDK 跨域不带 cookie、CSRF 403/401；正解＝代理模式同源）：附件选图→chip（缩略图＋文件名＋Remove）→发送＝上传 POST→建线程→run 流→10 秒出答（图描述正确＋参考来源 6）；mic 钮 enabled→点击→本环境权限 not-allowed→本地化 toast「麦克风权限被拒绝…」＋态复位；截图面不可见（内置浏览器 surface hidden）⇒ 以结构快照＋DOM/网络/transcript 为证——见 `w22-ui-evidence.md`。

## 交付后修复（2026-10-11，手验后他实测）

- **缺陷①·回答内图片显示 "Image not available"**：面板对 AI 消息走 `renderMessageContent` → `KbAssistantContent` **整体替换**了默认 `MarkdownContent`，而它只带 `sup` override ⇒ 丢掉默认路径的 `img`（`MessageImage`，/mnt→artifacts API 解析）与 `a` override；助手 markdown 图（`![…](/mnt/user-data/uploads/…)`）按原始 src 渲染 → 浏览器按页面源拼 404 → streamdown 自带失败占位。用户附件图走 MessageImage 不受影响（同线程对照实证）。修法：`MessageImage` 抽共享模块 `messages/message-image.tsx`；`KbAssistantContent` 补 `threadId`＋`artifactPaths` 并同带 `img`/`a`；面板 renderMessageContent 传 `extractArtifactsFromThread(thread)`。真浏览器复验（本线程）：占位 0 条、两条 img 均 `…/artifacts/mnt/user-data/uploads/ui-probe-circle.png` 且 naturalWidth=64。
- **对齐补强②**：面板听写补主对话的「提交即中止」（handleSubmit 守卫后 `voiceAbortRef.current?.()`）与「切会话中止」（`[threadId]` 清理 effect）——原缺项致草稿清空后旧文本+新转写回填。
- **缺陷③·步骤区同类洞（他裁收窄版：只补步骤区）**：`message-group` 三处 `MarkdownContent`（处理步骤·中间文本／reasoning／最后思考）补 `img`/`a` artifacts 解析——新增 `artifactPaths` prop（默认稳定空集 `NO_ARTIFACT_PATHS`，防新数组击穿 memo 比较器）＋components memo（threadId 存在时构建）；比较器加 `artifactPaths` 恒等项；`message-list` 两处调用点透传（thinking-group 同时补 `threadId`）。用例＋1（步骤区图解析为 artifacts URL、原始 `src="/mnt/…"` 不再出现）；neuter 恰红。其余四点（澄清卡／子任务卡／呈现文件／wiki 抽屉）登记「已知潜在·随上游」不修；乙（下沉管道）不做——裁据见 spec §6.3。
- **D10·上游 picker 对齐（他裁：做）**：切片＝上游逐字节同版 ⇒ 拷贝 6 件（`core/models/{favorites,favorites-store,use-model-favorites}.ts`＋`components/workspace/model-picker-content.tsx`＋`model-picker-content.dom.test.tsx`＋`model-selector-overflow.test.ts`）＋i18n `modelPicker` 三件（zh-CN／en-US／types）＋新依赖 `@radix-ui/react-popover@^1.1.15`（store 复用零下载）；三处换装（input-box／sidecar-panel／知识面板）——均保留 `chatPickerOptions` 过滤（§2④），面板的 per-kb 记忆与触发钮形态不动；sidecar 顺删 `context` prop 与两处未用导入；面板测试补 `useAuth` mock（picker 无条件调）+ 收藏 picker 用例（⑪ 同款）；overflow 测试改断言 `models={chatPickerOptions(models)}`（§2④ 分叉注记在案）；旧 `ai-elements/model-selector` 与 `searchModels` 键保留（上游同留）。门禁：定向 3 文件绿；`check` 零诊断；全量复跑 **253 files / 2890 tests 全绿**。**视觉复验 ✅（2026-10-11 真栈：主对话触发钮 114×32 → 弹窗「其他模型」组＋每行收藏星＋当前项对勾，截图在案；面板侧同款弹窗亦开出）。**
- **D7–D9·composer 对齐（他裁全甲）**：行级 `text-muted-foreground`（对齐主对话 `InputGroupAddon` 的继承色）＋附件/语音钮换 `PromptInputButton`（`px-2!`＋size-3 图标）＋发送钮 `variant="outline"`（D7）；ModelPicker 移入右组 `data-testid="panel-composer-actions"`（发送左侧，D8）；触发钮换 `PromptInputButton`＋主对话同款内层、去自绘 chevron（D9）；overflow 测试扩至三文件（input-box／sidecar／面板）。用例＋4（D7 按钮口径、D8 位置、overflow 面板两格）；neuter 恰红——并抓出首版断言空转（`border` 在 Button 基类里，改判别式 `bg-background`／非 `bg-primary`）。门禁：定向绿；`check` 零诊断；全量复跑 **253 files / 2894 tests 全绿**。**视觉复验 ✅（2026-10-11 真栈实测：附件/语音钮 28×32＋圆角 8px＋muted lab(48.5)＋图标 12px（与主对话逐项同值）；发送钮 outline 浅底（原为实心黑）；触发钮 160×32 无 chevron、在 `panel-composer-actions` 内且位于发送左侧）。**
- **D11–D13·窄档行为（他裁全甲）**：行／左组／右组 `gap-2`→`gap-1`（附件↔语音 8→4px，同主对话 `PromptInputTools` 口径，D11）；触发钮加 `shrink`（twMerge 覆盖 Button 基类 `shrink-0`——D9 换装引入的回归，认账；文字回 `truncate` 省略，D12）；行加 `@container`＋深度检索文字 span `@max-[380px]:hidden`（窄档只留 Switch，Tooltip 保留，D13）。用例＋3（RED 3 恰红后转绿）；`check` 零诊断；全量复跑 **253 files / 2897 tests 全绿**。**真栈三档校准 ✅（拖分隔条实测）：容器查询按内容盒判——行 390（内容 374）标签已隐、行 401（内容 385）仍显，与 380 阈值吻合；行 353 窄档：左组 96、模型全名保留、行零溢出（scrollWidth==clientWidth）、发送在行内；栏宽还原；窄档截图在案。380 保留无需调整（紧凑点≈内容 366）。**
- **D14·深度检索隐藏改内容驱动（他裁甲×2）**：撤固定 `@container`／`@max-[380px]`（D13 的阈值部分）改**行内空裕 free** 判据——`free = row.clientWidth − 16 − tools.offsetWidth − 4 − actions.offsetWidth`；隐藏＝模型名被挤（span.scrollWidth > clientWidth+1）**且 free ≤ 2**（空间性挤压守门，排除 `max-w` 名义截断）；恢复＝隐前记录的 `文字宽 + 6 + 8`（滞回）；每渲染校准＋`ResizeObserver` 观测行。**判据二改**：初版「span 空裕判恢复」真栈暴露缺陷（content-sized 触发钮空裕恒 0 判不出；长名撞上限误隐）⇒ 改 free 判据（他回「甲」确认）。挂钩：行＋左组＋右组三 ref、行/左组补 `data-testid`。用例 3（默认可见／挤隐＋放宽恢复／名义截断不隐——第三条为判别用例）；neuter 回归旧判据恰红 2 用例；`check` 零诊断；**全量首跑抓出 `model-selector-overflow` 抽取正则失配**（初版 D14 给名字 span 上 `ref`/`data-testid` 后，其「一键字面量」正则判不出 ⇒ 放宽为 className 前容许属性段；断言未动）——定向 6/6 绿后全量复跑 **253 files / 2899 tests 全绿**。**真栈复验 ✅（t6 栈；证据 `acceptance-t6/d14-ui-evidence.md`）：row 307＋mimo⇒隐（free 41<62）；拖至 row 340⇒恢复（文字宽 48）；同一 row 340 仅换模型——长名 174px⇒隐、短名 86px⇒显；收尾还原（模型／列宽／折叠态全复原）。**
- 门禁：定向 3 文件 47/47（kb 解析 +3、面板语音 +2；neuter 恰红 3）；`pnpm check` 零诊断；前端全量复跑 **251 files / 2868 tests 全绿**；缺陷③补丁：定向 `message-group.test.ts` 绿（+1，neuter 恰红）、`check` 零诊断、全量复跑 **251 files / 2869 tests 全绿**。

## 提交链（落定，2026-10-11）

- 开工首笔 `5be1e419c`（spec+plan 成对）／前端一笔 `0a6d8d3d6`（Task 1＋2：面板附件＋语音 hook 抽取＋测试）／引导一笔 `9db7da791`（SOUL 检索工作流第 6 条「附图问题」）／修复一笔 `02ca38f86`（手验后：回答内图片 artifacts 解析＋听写中止对齐）／步骤区修复 `99ceb52d7`（缺陷③：message-group img/a override）／picker 移植 `41b1dc3ec`（D10 上游收藏版）／方框对齐 `0c0467983`（D7–D14：对齐＋窄档内容驱动）／回填并入文档笔（本笔）；均主树、不推（待令）。**（2026-10-11 未推窗压合：原两笔回填 `d415edc55`／`437d99840` 与窗口改动并为终笔，旧哈希作废；备份 ref `bak/pmi-fold-1011`。）**
