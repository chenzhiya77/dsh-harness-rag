# 验收反馈十三则（RAG 面）落两树 —— 实施计划

## 范围与交接

一对一件事＝把验收反馈十三则的裁定全部落进两树代码：① 文档表底部状态段（两树）② 切片刻度轨随带恢复（切片）③ 功能模型视图切换·乙-b（切片）④ VLM 声明补链（切片后端一行）⑤＋⑬ KB composer 流式态（两树）⑥ KB 消息动作行（两树）⑨ 悬停卡重放（切片）⑪ KB 模型选择器对齐（切片）⑫ 消息区滑条隐式化（切片）。**⑦ 已随主仓压合笔 `624dd2967`、⑩＝零动作、⑧ 另对（`2026-10-08-rag-doc-tools*`）——三者在两树均不再动。** **另：§十五「切片裁剪残留」（同日「少剪」全面核实新增 6 条，切片侧）并入本对——①–④ 直接清理、⑤ 销项、⑥ 已裁削（并入 Task 10）；裁定记录见 spec 第十五节。** 成对 spec＝`../specs/2026-10-08-rag-ui-findings-design.md`（十三则＋第十四节「涉及位置」＋第十五节「切片裁剪残留」＋裁定记录；十三则裁定已全落）。

**状态（2026-10-08）：已起草；未动工，待「开工」。** **树归属**：①⑤⑥⑬＝两树同步（主树先、切片随带）；②③④⑨⑪⑫＝切片侧；§十五①–④⑥＝切片侧（⑤ 销项）。**起点**：主树 `feat/rag-knowledge-base` @ `624dd2967`；切片 `slice/knowledge-local-vector-retrieval` @ `b9989c8c2`（自 `e325c90b2` 15 笔）。**不碰**：编辑族（② 后置项）、⑦⑩、⑧（另对）、检索主路与后端语义（除 ④ 一处响应字段、§十五②④ 的死件删除与注释清扫）、推送与 PR（待令）。**工作树纪律**：主树工作区有别线未提交内容（models 线 Task 7 的 `models-settings-page.tsx`＋测试、`models-list-grouping` 两份文档、`README.md`、`backend/AGENTS.md`、rfc-v2 两份、若干研究文档）——只 stage 本线文件、`git status` 逐名排除；切片树当前全净。

## 硬约束（执行期注意）／Global Constraints

- **TDD 必做**（frontend/AGENTS.md、backend/AGENTS.md）：先 RED（钉新行为）→ GREEN → neuter 恰红一次；定向后跑面。
- **切片树提交前「四门」**（口径＝`../specs/2026-10-08-rag-slice-ci-fix-design.md` §2.5）：① `cd backend && make lint`（ruff check＋format 双净）② 仓库根 `python scripts/check_agent_guidance.py --base-ref e325c90b2 --head-ref HEAD` → **errors=0** ③ `cd frontend && pnpm format`（prettier 零 diff）④ 后端定向 pytest；`uv lock --check`／`pnpm check` 随门联跑。本批不动 AGENTS 链文件，guidance 预期零影响（仍须实跑）。
- **前端定向跑法**：`cd <树>/frontend && python ../scripts/pnpm.py exec rstest run <paths>`；主树末批另跑 `pnpm check`＋前端全量 `pnpm test`（基线 304 文件／2895 例）。
- **提交纪律**：提交信息英文 conventional、按 Task 拆小笔；只 stage 本线文件；两树各自提交、互不混笔（见文末「提交链」）。
- **i18n 新增仅 4 键×2 locale**：③ `viewChatModels`／`viewFunctionalModels`（值照主仓 `zh-CN.ts:1710-1711`「对话模型／功能模型」、`en-US.ts:1807-1808`）；② `chunkDrawer.tickAria`／`notLoaded`（照主仓「切片／未加载」「Chunk／not loaded」）。其余一律复用既有键（⑤⑬ 用 `inputBox.pleaseWaitStreaming`，切片 `zh-CN.ts:516` 已核在；KB 面板内 toast 一律经 `./kb-toast` 门面——房规）。
- **文案/断言随件同步**：⑪ 后「搜索模型…」随壳消失——相关用例与断言同步；不写死将被删控件的文案。
- 真栈仅测试库；`rag_config.json` 零改动；临时产物收尾删净。

## Task 0 — 开工前复核（两树，只读）

> 动到的文件：零（核实＋必要时 spec/plan 勘误）

- [x] 两树分支/HEAD/工作区复核（主树 `624dd2967`＋别线脏清单；切片 `b9989c8c2` 全净）；切片 venv＋pnpm 就位。
- [x] 锚点抽样重核（防漂移）：① footer 两树（切片 L1163-1192／主仓 L1232-1261）；② 切片 `chunk-drawer.tsx` 头部与滚动结构（L188-316）＋主仓接线样板（`chunk-drawer.tsx:587-594`＋组件 `chunk-tick-rail.tsx`，`TICK_GAP=26`／`MIN_TICKS=5` 已带）；③ 切片 `model-settings-page.tsx:68-142`＋主仓 view i18n；④ 切片 `backend/app/gateway/routers/managed_models.py::_catalog()`（L26-34，config 行现无 `supports_vision`）＋harness `model_config.py` 源字段名重核；⑤ 两树 KB `chat-panel.tsx`（切片 L455-556／主仓 L620-745）；⑥ `useThreadStream` 三键（`stop`／`regenerateMessage`／`editAndRegenerateMessage`）两树均在；⑨ `git show 51f2ee9f1 | git apply --check`（起草时已过：parent＝现行 tip）；⑪ `model-picker-content.tsx` 导出与 props＋切片 `input-box.tsx:3472-3497` 接线样板；⑫ 主仓 `message-list.tsx:335-342／1012-1035` 成品；⑬ 切片 e2e 的 `getByRole("log")` 依赖（`thread-history.spec.ts:174/350`／`reasoning-duration.spec.ts:251`）——Task 9 保留 `role="log"` 的依据。
- [x] 受害者扫描（既有断言）：两树 `document-panel.dom.test.tsx`（footer 两条）／`chat-panel.dom.test.tsx`（composer 禁用 1 条＋选择器 3 条）／切片 `model-settings-page.dom.test.tsx`（功能视图常驻类）／切片 `chunk-drawer.dom.test.tsx`。
- [x] §十五 落点复核（切片）：i18n 两键现值＋`document-panel.dom.test.tsx:386` 断言原文；`embed_texts.py`／`test_embed_texts.py` 在位；`chat-panel.dom.test.tsx:37-57` 死件现行行号；`chunk-card.tsx:190-210` 徽章块＋`chunk-drawer.tsx:289` 传参行（⑥ 削的落点）；注释族清单现读现取（以 Task 10 所列行号为准）。

**Task 0 复核结果（2026-10-08 执行）**：
- 两树：主树 `3f536836c`（起点 `624dd2967` 之后另有 2 笔别线：`aca334119` models／`3f536836c` doc-tools spec——A 面文件零触碰，i18n 行锚已按现行 HEAD 重核）＋别线脏清单如旧；切片 `b9989c8c2` 全净（领先 fork 4 笔）；两树 venv／node_modules 就位。
- 锚点：13 项全核过（含终审 40+ 锚点；10 处勘误已就地落：§一／§四／§六／§九／§十四＋本 plan 硬约束／不碰／Task 3／Task 10）；`51f2ee9f1` 对象在位（message 对得上）。
- 受害者扫描（现行行号）：主树 `document-panel.dom.test.tsx` **L719（stats 行含「就绪」）＋L721（就绪点类 `.bg-emerald-500/45`）＝Task 1 必改**（同测 L698-700／L718／L720 不受影响；L225／L320-321 系行徽章断言、按 DTL 直文节点语义不受影响）；切片同款 **L649＋L651**。主树 `chat-panel.dom.test.tsx` L197-198（composer 禁用＝Task 2 必改）＋L741-774（选择器＝Task 8）；切片同款 L204-206＋L501-544。切片 `settings/functional-models.dom.test.tsx`（renderPage 渲染 `ModelSettingsPage` 后断言功能行）＝**Task 6 主受害者**（真身文件已修入 Task 6）。切片 `chunk-drawer.dom.test.tsx` L48／L98／L125-140＝Task 10 ⑥ 实删面（已更新 Task 10）。
- §十五 落点：全部在位（`zh-CN.ts:608-613`／`en-US.ts:647-652`、`document-panel.dom:386`、`embed_texts.py`＋其测试、`chat-panel.dom:37-42/49-57`、`chunk-card.tsx:190-210`、`chunk-drawer.tsx:289`）。

## Task 1 — ① 文档表底部状态段（两树；主树先→切片随带）

> 动到的文件（每树各自）：`frontend/src/components/workspace/knowledge/document-panel.tsx`＋`frontend/tests/unit/knowledge/document-panel.dom.test.tsx`

- [x] RED（主树）：ready 芯片不再渲染（ready>0 时行内无「就绪」）；全就绪（inProgress=failed=0）⇒ 状态段整段不渲染；结构钉＝容器无 `flex-wrap`、状态段含 `shrink-0`、体量段含 `min-w-0`。
- [x] GREEN（主树）：footer 块（L1232-1261；容器 L1235）——容器 `flex flex-wrap`→`flex`；体量段 `flex items-center gap-1 whitespace-nowrap`→`min-w-0 truncate`；状态段（`ml-auto`）加 `shrink-0`；chip 数组去 `ready` 项；`inProgress===0 && failed===0` ⇒ 不渲染状态段；`STATUS_DOT_CLASS.ready` 保留（表内行状态点仍用）。neuter×1（门槛拆掉恰红）。
- [x] 主树门：`pnpm check`＋定向 rstest（`document-panel.dom`／`-columns`／`-selection` 三件）。
- [x] 提交（主树·一）：`fix(knowledge): show only actionable states in the document stats row`（`6a17e966e`）。
- [x] 切片随带：同改动＋同用例落切片；四门（含 prettier）；提交同信息（`9e66ba1bb`；prettier 修正＝嵌套 `cn(...)` 折行一处）。

## Task 2 — ⑤＋⑬ KB composer 流式态（两树；主树先→切片随带）

> 动到的文件（每树各自）：`frontend/src/components/workspace/knowledge/chat-panel.tsx`＋`frontend/tests/unit/knowledge/chat-panel.dom.test.tsx`

- [x] RED（主树）：流式中 Textarea 可输入（disabled 不含 streaming）；流式中回车 → `pleaseWaitStreaming` 提示且不发送；流式中发送键＝停止态（`SquareIcon`）且点击调 `thread.stop()`（稿为空也可点）。
- [x] GREEN（主树）：**经 `thread.stop()`（两树 hook 均把 stop 挂在 mergedThread、无顶层键；与 chat-page 参照一致）**，无需改解构；Textarea `disabled={!kb || thread.isLoading}`→`disabled={!kb}`；onKeyDown 流式分支＝`preventDefault`＋`toast.info(t.inputBox.pleaseWaitStreaming)`（toast 经 `./kb-toast` 引入）；发送键单钮双态：`thread.isLoading` ⇒ 图标 `SquareIcon`、`disabled={!kb}`、onClick=`thread.stop()`；否则现行发送态（`canSend` 门不动）。aria-label 口径＝**保留 `aria-label={tc.send}` 两态同值**、不新增 i18n 键（勿照主会话硬编码 `aria-label="Submit"` 写法——chat-panel.dom 既有用例以 `getByRole("button", { name: "发送" })` 钉死）；另：`useThreadStream` 的 DOM 测试 mock（`chat-panel.dom.test.tsx` L169 面）随补 `stop`（默认 mock＋流式用例内 `thread.stop`）。
- [x] 主树门＋提交（主树·二）：`feat(knowledge): keep the kb composer typeable while streaming and offer stop`（`24a819771`）。
- [x] 切片随带（同改动；`pleaseWaitStreaming` 已核在）；四门；提交同信息（`bc7eaed26`）。

## Task 3 — ⑥ KB 消息动作行（两树；主树先→切片随带）

> 动到的文件（每树各自）：同 Task 2 两文件

- [x] RED（主树）：MessageList 收到 `onRegenerateMessage`／`onEditAndRegenerateMessage`；`canRegenerate`／`canEdit`（流式中为 false）；编辑重发回调第四参携带 `{[KNOWLEDGE_SCOPE_KEY]: snapshot}`；**开卡面（human-input 在场）时 `canEdit=false`——守卫专属用例（neuter＝拆守卫恰红）**。
- [x] GREEN（主树）：解构补 `regenerateMessage`／`editAndRegenerateMessage`；`handleRegenerate`／`handleEditAndRegenerate` **照主树自家页面三参口径**（`app/workspace/chats/[thread_id]/page.tsx:265-270`；⚠️ scope 快照为切片侧专有——主仓全前端零 `KNOWLEDGE_SCOPE_KEY`，切片随带时按切片 `chats/chat-page.tsx:363-380`＋面板 `knowledgeScopeSnapshot` 补第四参）；门控照 chat-page 口径裁剪到面板实有状态：`canRegenerate={!isNewThread && !thread.isLoading}`、`canEdit={!isNewThread && !thread.isLoading && !hasOpenHumanInputCard}`——**human-input 守卫必留**（面板已接 `onSubmitHumanInput`＝有卡面；派生照 `chat-page.tsx:418-425`，复用 `hasOpenHumanInputRequest`——面板已从 `@/core/messages/human-input` 导入）；上传/branch/goal/mock 项按面板实有裁剪；两回调传入 MessageList；DOM 测试 mock 随解构补 `regenerateMessage`／`editAndRegenerateMessage`。
- [x] 主树门＋提交（主树·三）：`feat(knowledge): wire regenerate and edit-and-rerun into the kb message actions`（`ab3515714`）。
- [x] 切片随带（同；**编辑重发第四参＝切片 scope 快照**，照切片 `chats/chat-page.tsx:365-380` 口径）；四门；提交同信息（`19527ee6f`；切片测试无 `humanTurns` 助手＝夹具内联）。

## Task 4 — ⑨ 悬停卡重放（切片）

> 动到的文件：`document-panel.tsx`＋`document-panel.dom.test.tsx`（随 pick 带入）

- [x] `git cherry-pick 51f2ee9f1`（对象仍在；parent＝`b9989c8c2`＝现行 tip；起草时 `git apply --check` 已过。次序不敏感：亦可排切片 ① 之前，排后落走 3-way）；改动＝失败/降级两卡同排右收＋用例结构钉（spec 第九节已补记；与主仓 `624dd2967` 内原 `d8e336edd` 同款）。**已落：`87683069a`**（自动合并两件、无冲突）。
- [x] 四门（定向）；若执行时对象已被 GC，改按 spec 第九节描述重做（同款改动＋结构钉）。**定向 62/62＋四门净。**
- [x] 提交即该笔（消息已英文，无需另写）。

## Task 5 — ② 切片刻度轨随带恢复（切片）

> 动到的文件：新件 `frontend/src/components/workspace/knowledge/chunk-tick-rail.tsx`＋`chunk-drawer.tsx`＋i18n 2 键×2 locale＋用例

- [x] 拷入 `chunk-tick-rail.tsx`（源＝主仓现行件；`TICK_GAP=26`／`MIN_TICKS=5`／`TICK_HIT=16` 与 `tickRange` 纯函数随件带入）。**经切片 prettier 归一（3 件 `--write`）。**
- [x] RED：抽屉右侧出刻度轨（`total≥5` 才渲染）；悬浮弹窗行与刻度 1:1；点击刻度/行 ⇒ `active` 变化＋容器滚动到该片；`total<5` 不渲染。GREEN：接线照主仓 `chunk-drawer.tsx:587-594`（`active`／`entries`（预览用切片 `format.ts:114` 的 `chunkPreview`）／`onJump`／`total`／`tickLabel`／`unloadedLabel`）＋ ScrollArea 与轨同排；i18n 补 `chunkDrawer.tickAria`／`notLoaded`（zh/en＋`types.ts` 两行）。**RED 实红 2（存在/悬浮）、门槛条由缺轨平凡绿；neuter（`total<MIN_TICKS`→`total<=0`）恰红 1。**
- [x] 用例：移植主仓 `chunk-tick-rail.unit.test.ts`（`tickRange`）＋切片 `chunk-drawer.dom.test.tsx` 补轨交互与门槛。
- [x] 四门；提交：`feat(knowledge): restore the chunk tick rail in the read-only drawer`（`7d20d24b3`，7 文件 +330）。

## Task 6 — ③ 功能模型视图切换·乙-b（切片）

> 动到的文件：`frontend/src/components/workspace/settings/model-settings-page.tsx`＋i18n 2 键×2 locale＋`frontend/tests/unit/settings/functional-models.dom.test.tsx`（真身：经 `renderPage` 渲染 `ModelSettingsPage` 后断言功能行——改版后改为「切换后断言」；另 `components/workspace/settings/model-settings-page.dom.test.tsx` 4 条 auth／保存用例开工时核一眼）

- [x] RED：默认对话视图＝列表＋「添加」「重新加载」＋一枚「功能模型」钮；点击 ⇒ 功能视图（`FunctionalModelsView`）渲染、「添加／重新加载」隐藏、同钮文案变「对话模型」；再点回程显列表。
- [x] GREEN：`view` state＋按钮行第三枚（outline 档、与「重新加载」同档，位序在其后；开工可按观感微调）；列表/功能视图条件渲染（功能视图本体零改动、无对话框、无嵌套）；i18n 2 键（zh/en）。
- [x] 既有断言随改版更新（「功能视图常驻」类改为经切换后断言）；四门；提交：`feat(settings): switch between chat and functional models on one page`（`1092f3143`；助手分叉 `renderPageRaw`＋`renderPage`＝先切后断、既有 96 例零改；neuter 恰红 1；98/98＋小件 4 例绿）。

## Task 7 — ④ VLM 声明补链（切片后端，TDD）

> 动到的文件：`backend/app/gateway/routers/managed_models.py`＋`backend/tests/test_managed_models.py`

- [x] RED：`GET /api/managed-models` 的 config 来源行含 `supports_vision`（值取自条目声明，true/false 各一）。GREEN：`_catalog()` config 行补该字段（源字段名以 harness `model_config.py` 重核为准）。前端零改动（`config-form.ts` 筛选经 `VisionModelSource` 结构类型已读可选字段；既有筛选用例核对）。
- [x] 四门（后端定向 `pytest tests/test_managed_models.py`）；提交：`fix(models): expose supports_vision for config entries in the catalog`（`183896c54`；20/20、ruff 净；neuter 恰红 1）。

## Task 8 — ⑪ KB 模型选择器对齐（切片）

> 动到的文件：`chat-panel.tsx`＋`chat-panel.dom.test.tsx`

- [x] RED：弹层出「收藏／其他模型」两分区＋行尾 ⭐（样板 `model-picker-content.dom.test.tsx`；需补 auth mock——`useAuth` 无 Provider 即 throw）；触发器仍为现按钮（aria-label「选择模型」）；选择/关闭行为保持。
- [x] GREEN：选择器块（`chat-panel.tsx:499-544`）`ModelSelector*` → `ModelPicker`／`ModelPickerTrigger`（asChild 包现按钮）／`ModelPickerContent`（props `open`／`models`／`selectedModelName`／`onModelSelect`；照 `input-box.tsx:3472-3497`）；搜索框随壳消失；清理未用导入。主仓零动作。
- [x] 四门；提交：`feat(knowledge): align the kb model picker with the main composer`（`889ae8d9d`；auth／favorites 两新 mock＋新⑪用例；neuter 2 红同因（弹层置空）；25/25）。

## Task 9 — ⑫ 消息区滑条隐式化（切片）

> 动到的文件：`frontend/src/components/workspace/messages/message-list.tsx`＋结构钉用例

- [x] RED：滚动容器＝`data-slot="scroll-area-viewport"`（overlay）；无 `scrollbar-gutter: stable both-edges`。
- [x] GREEN：`import { StickToBottom, useStickToBottom } from "use-stick-to-bottom"`（包已在）＋引入 `ScrollArea`；`const stick = useStickToBottom({ initial: initialScroll, resize: resizeScroll })`；容器换 `<StickToBottom … instance={stick}>`＋`<ScrollArea className="min-h-0 flex-1" type="scroll" scrollHideDelay={2000} viewportRef={stick.scrollRef}>`＋内容 div `ref={stick.contentRef}`（照主仓 L1012-1035 结构；切片现行 Conversation 已传 `data-testid`／`initial`／`resize`，逐一保留）；**在 StickToBottom 元素上保留 `role="log"`——主仓现行件已无该属性，「照抄」时勿误删：切片 e2e（`thread-history.spec.ts:174/350`、`reasoning-duration.spec.ts:251`）以 `getByRole("log")` 定位会话滚动器**；子结构/虚拟列表/粘底逻辑零改动。
- [x] 用例：结构钉并入 `chat-panel.dom.test.tsx`（面板内含 MessageList）或按需新小件；粘底相关用例回归。（落成新小件 `message-list-overlay.dom.test.tsx`——面板 mock 掉 MessageList，钉不到真结构。）
- [x] 四门；提交：`fix(knowledge): use overlay scrollbars in the message list`（`cc7cc39a0`；hook 从早退后挪回顶部 hooks 区（rules-of-hooks）；neuter 恰红 1；26/26）。

## Task 10 — §十五 切片裁剪残留清理（切片，审查新增）

> 动到的文件：切片 `frontend/src/core/i18n/locales/{zh-CN,en-US}.ts`＋`frontend/tests/unit/knowledge/document-panel.dom.test.tsx`＋`frontend/tests/unit/knowledge/chat-panel.dom.test.tsx`＋`frontend/tests/unit/settings/functional-models.dom.test.tsx`＋`frontend/src/components/workspace/knowledge/{chunk-card,chunk-drawer}.tsx`＋`frontend/tests/unit/knowledge/chunk-drawer.dom.test.tsx`；后端 `backend/packages/knowledge-extension/deerflow_knowledge/embed_texts.py`（删）＋`backend/tests/knowledge/test_embed_texts.py`（删）＋注释各件（`knowledge_service`／`knowledge_bases`／`chunker`／`citation_counter`／`captioner`／`vlm_target`／`worker`／`store`／`eval/dataset`）＋前端注释各件（`panels-shell`／`kb-list-panel`／`document-panel`／`doc-failure-panel`／`chunk-drawer`／`markdown-content`）

- [x] ① RED：先改 `document-panel.dom.test.tsx:386` 断言为新文案（现逐字钉「…切片、向量与图谱贡献」）→ 红；GREEN：`zh-CN.ts:608-613`／`en-US.ts:647-652` 两条删除确认描述去掉图谱/百科口径（按切片实际级联范围，只写切片与向量）；库删除一条无断言、直接改；主树零动作（该文案在主仓成立）。**目标串（拟稿）**：zh 文档＝「将级联清理该文档的切片与向量，且不可恢复。」／zh 库＝「将同时删除全部文档、切片与向量，且不可恢复。」／en 文档＝"Its chunks and vectors will be cascade-deleted. This cannot be undone."／en 库＝"All documents, chunks and vectors will be cascade-deleted. This cannot be undone."（开工可按观感微调，须保持两语言同义）。
- [x] ② 删 `embed_texts.py`（entity/wiki/卡片三函数零生产调用、切片 `_KINDS=("chunks",)`）＋`test_embed_texts.py`；删后 knowledge 定向复核零 import／零报错。
- [x] ③ `chat-panel.dom.test.tsx:37-42` 删 `@/core/threads/activity-context` 死 mock（模块在切片不存在）＋`:49-57` 假滚动层按切片事实最小化（面板零引用 `data-human-turn`／刻度轨）＋注释去 §10.3／agent-pet／刻度轨口径；跑该件确认仍绿（19 例）。
- [x] ④ 注释族清扫（~15 处、纯注释/文档串）：后端 `knowledge_service.py:5-6`／`knowledge_bases.py:136,191`／`chunker.py:56`／`citation_counter.py:4`／`captioner.py:32,40-41,79`／`vlm_target.py:85`／`worker.py:171,335`／`store.py:29`／`eval/dataset.py:91`；前端 `panels-shell.tsx:77`／`kb-list-panel.tsx:131`／`document-panel.tsx:737`／`doc-failure-panel.tsx:111`／`chunk-drawer.tsx:189`／`markdown-content.tsx:58`／`functional-models.dom.test.tsx:86-89`（行号现读现取）。
- [x] ⑤ 销项不动（`GET /{kb_id}/chunks` 属留面「切片只读」）；⑥ **已裁削**：删 `chunk-card.tsx` L190-210 渲染块＋`entities` prop/state＋`ENTITY_CAP`（L13）＋`chunk-drawer.tsx:289` 传参行＋`chunk-drawer.dom.test.tsx`（fixture `entities` 行 L48＋「renders text … entities」用例 L98 起＋折行用例 L125-140）三处；`Chunk.entities` 类型与后端列保留（schema 对位）；删后 `pnpm check`（TS）与 `chunk-drawer.dom` 定向确认零引用零报错。
- [x] 四门；提交：`chore(knowledge): drop first-phase leftovers from the slice`（`548f54706`，24 文件 +33/−165；RED 恰 1 红→4 串改绿；删件零引用＋collect 751；199/199＋guidance 0 errors）。

## Task 11 — 全量门禁（两树）

- [x] 主树：`pnpm check`＋前端全量 `pnpm test`；后端无改动（跑一次 knowledge 定向确认无涉及）。**实落：前端全量 **251 文件／2859 例全过**（exit 0，跑于本批提交后）；`pnpm check` 零诊断；后端零改动 ⇒ knowledge 定向无涉及。**
- [x] 切片：四门全跑——① ruff 双净 ② guidance errors=0 ③ prettier 零 diff ④ 后端全量 `pytest -m "not live" tests/`（后台、仓外隔离 basetemp、跑完查进程退净再删）＋前端全量 `pnpm test`；红带对比既有基线（唯一知识红＝`test_embed_missing_api_key` 环境条件红；零新增）。**实落：124F／24952P／840S／14E（38:17）——红名逐族＝环境簇（extension_manager 31／web_fetch 22／子进程·dotenv·CRLF·GBK…）；知识面仅 5 条＝已知环境条件族（`rag_config_probe`×4＋`test_embed_missing_api_key`），另 1 条（`test_a_second_save_mid_reembed_is_refused`）隔离复跑即绿＝重载时序 flake；**触及面零红 ⇒ 零新增归因**（对 run-5b 121F/24940P 的 ±3 属环境簇跑间漂移）。basetemp 删净（目录可删＝句柄已退）。前端全量 **306 文件／2913 例全绿**。**

## Task 12 — 真栈验收（切片隔离实例）

- [x] 起隔离实例（acceptance-8 配方）：gateway `:8101`（env 三件 `DEER_FLOW_CONFIG_PATH`／`DEER_FLOW_RAG_CONFIG_PATH`／`DEER_FLOW_HOME`）＋frontend `:3100`＋Qdrant `:6399`；启动前 `set -a; . <(tr -d '\r' < .env); set +a`；operator 账号登录。**实落：并行会话（doc-tools 真栈）占 :8101/:6398 与 acceptance-8 根 ⇒ 本批资源全隔离——gateway `:8102`／frontend `:3100`／Qdrant `a12-qdrant` :6397＋全新根 `acceptance-a12`（config 仅 qdrant_url/sqlite_dir 改指、rag_config 照拷），operator@acceptance.dev 经 /setup 新建。**
- [x] 逐项过：①（就绪不显／全就绪整段不显／窄栏不折行）②（≥5 显、悬浮/跳转、26 间距）③（乙-b 双向、按钮文案、按钮行隐藏）④（VLM 下拉出现 config 申报条目）⑤（流式中可停）⑥（重新生成＋编辑重发含 scope）⑨（重试右收）⑪（收藏/其他模型＋⭐、搜索框消失）⑫（滚动才浮现、不占宽）⑬（流式中可输入＋回车等待提示）。**全过（实况）：① 全就绪状态段整段消失＋删除文案新稿、② 13 刻度/13 行/26px/点击跳头部「当前 #5」、③ 双向切换＋钮文案换、④ 候选含 config 申报的 qwen3.8-flash、⑤ 点击停止即消 square、⑥ 两钮在＋重生成起新跑、⑨ justify-between＋按钮贴右缘(13px)/卡高 73、⑪ 其他模型组＋3 星＋搜索框消失＋选择联动、⑫ `[role=log]`→overlay 视口且 gutter=auto、⑬ 流式可打字＋回车提示＋草稿保留。① 真拖拽缩栏＝手验补过（2026-10-09 用户实拖窄↔宽来回：底部统计行全程单行、右端「失败 1」芯片常显）。**
- [x] 观感项（①②⑨⑫）留截图 3–4 张（同时可作 RFC 发布材料候选）；临时件收尾、配置零改动。**截图 4 张（③④ 设置×2／⑨ 悬停卡／② 抽屉轨）随会话呈现；`frontend/public/kb-a12-*` 夹具已删；实例保留运行供手验；证据档 `E:/app-model/deer-flow-scratch/acceptance-a12/acceptance-evidence.md`。**

## Task 13 — 回填＋提交链

- [x] spec：各节状态行补「已实施 `hash`」＋裁定记录补提交链；本 plan 回填「实测」与提交链。**实落：spec 尾部加「执行记录（2026-10-08）」成对表＋顶部状态续行；本 plan 各 Task 已逐笔回填、提交链附实测行。**
- [x] 文档同步面：`frontend/AGENTS.md`（两树）若含与改后行为矛盾的叙述（KB 面板 composer／选择器／滑条口径）随批修订；无则登记不改。**实落：两树逐面核对（composer/human-input/edit-and-rerun/picker/scroll 相关叙述）＝**无矛盾叙述，登记不改**。**
- [x] 两树未推；推送/PR 待令（口径沿用）。

## 提交链（预期：主树 3＋回填 1；切片 10）

| # | 树 | 内容 | 建议信息 |
| --- | --- | --- | --- |
| 1 | 主树 | ① footer | `fix(knowledge): show only actionable states in the document stats row` |
| 2 | 主树 | ⑤＋⑬ composer | `feat(knowledge): keep the kb composer typeable while streaming and offer stop` |
| 3 | 主树 | ⑥ 消息动作 | `feat(knowledge): wire regenerate and edit-and-rerun into the kb message actions` |
| 4 | 切片 | ① 随带 | 同 1 |
| 5 | 切片 | ⑤＋⑬ 随带 | 同 2 |
| 6 | 切片 | ⑥ 随带 | 同 3 |
| 7 | 切片 | ⑨ 重放 | `git cherry-pick 51f2ee9f1`（原信息） |
| 8 | 切片 | ② 刻度轨 | `feat(knowledge): restore the chunk tick rail in the read-only drawer` |
| 9 | 切片 | ③ 视图切换 | `feat(settings): switch between chat and functional models on one page` |
| 10 | 切片 | ④ VLM 声明 | `fix(models): expose supports_vision for config entries in the catalog` |
| 11 | 切片 | ⑪ 选择器 | `feat(knowledge): align the kb model picker with the main composer` |
| 12 | 切片 | ⑫ 滑条 | `fix(knowledge): use overlay scrollbars in the message list` |
| 13 | 切片 | §十五 清理 | `chore(knowledge): drop first-phase leftovers from the slice` |
| 14 | 主树 | 回填 | `docs(knowledge): record the acceptance UI findings execution`（spec/plan 状态＋文档同步面） |

**执行实测（2026-10-08，全部已落、均未推）**：主树＝`6a17e966e`（①）／`24a819771`（⑤⑬）／`ab3515714`（⑥）；切片＝`9e66ba1bb`（①随带）／`bc7eaed26`（⑤⑬随带）／`19527ee6f`（⑥随带）／`87683069a`（⑨ 重放）／`7d20d24b3`（② 刻度轨）／`1092f3143`（③ 视图切换）／`183896c54`（④ VLM）／`889ae8d9d`（⑪ 选择器）／`cc7cc39a0`（⑫ 滑条）／`548f54706`（§十五 清理）——**切片 10 笔恰合预期**；回填＝本笔。门禁：主树 2859 绿＋`pnpm check` 净；切片 2913 绿＋ruff/guidance/prettier 全绿＋后端全量 124F/24952P＝**零新增归因**。真栈：Task 12 全项过（资源隔离方案：并行会话占 :8101 ⇒ 本批 :8102/:3100/:6397＋全新根 `acceptance-a12`；证据档 `E:/app-model/deer-flow-scratch/acceptance-a12/acceptance-evidence.md`，截图 4 张随会话）。
