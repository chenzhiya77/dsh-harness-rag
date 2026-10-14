# 面板 ⋯ 菜单与功能模型设置 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-14-menu-model-settings-spec.md](../specs/2026-10-14-menu-model-settings-spec.md)（M1–M7 决定＋落点＋验收）
**Status:** 执行中——Task 0–1 已落地（`7b5c73c`／`884b422`／`03da3ee`；Task 1 真跑已过）；**Task 5 已收官**（真跑过，10-14）；**Task 7 已收官**（真跑过；④未实操记录）；Task 2–4 未开；**Task 6 已立**（收口统换宿主件，10-14 裁）；**Task 8 已立**（重复上传拦截 A②，10-14 裁：Task 2 之后）。
**Parent:** T3 plan（[2026-10-12-t3-panel-plan.md](2026-10-12-t3-panel-plan.md)）「RAG 前端全域覆盖审计」A 组裁定行；步骤记录：[2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)（「模型面归属」条转正）。

**Architecture:** 两件事——**① 顶栏 ⋯ 菜单**（`client.js` 顶栏段：`[裸粗体库名＋chevron 下拉][⋯ 裸钮靠右]`（v2/v3 终态）；菜单件＝`DshMenu`（宿主 `Menu.module.css` 真值），图标宿主原路径（路径级属性：Ellipsis `fill`／Edit `fill`+`stroke`／余 `stroke`）、缺件沿用工作台同款；行内「刷新/上传/重建索引」退役——重建索引落设置面；**六 tab 改对话头设计**）；**② 功能模型设置面**（面板内 Sheet；照工作台 `functional-models-view` 全量、四批落地：读取展示/重建索引入口/迁移状态 → 嵌入段 → 多模态段 → 解析/裁判/抽取段）。**数据缝不变**：host 半 `kb_proxy.ts` 薄代理补 op（createKb/renameKb/deleteKb/ragConfig 读写/migration/五探针/模型目录）；**deer-flow 零改动**。

**硬约束（spec 已裁，不许自行放松）**：
- **皮肤＝宿主真值**（M2）：Menu 面板/行/危险行/分隔线全参照实；触发器 `IconEllipsisOutlineRegular` 原路径。评测域两枚菜单**不改**。
- **图标三档**（M3）：宿主原生 ≻ 工作台同款 ≻ 相关合适；原路径从 web bundle 提取、逐条留证（不得手绘近似）。
- **宿主件统换（10-14 追加裁定 → Task 6）**：菜单件与手刻图标于本对收口统一换为宿主 `primitives` 原件（`Menu`/`MenuItemButton`/`MenuSurface`/`MenuGroup`/`Icon*`；基线种子表可 require，无需 `dsh.client.external`）；**行内提示位换宿主 `Toast` 一并入同轮**（10-14 裁）；M2/M3 由「复刻真值」升格「直用真值」；**评测域两枚维持冻结**；宿主无件者（Upload/BookOpen/RefreshCw 等）维持 M3 三档。
- **重建索引落设置面**（M1/M4）：不进菜单；设置面批 1 交付前不裁撤原行内钮——**同一 Task 内完成位移**（Task 1 含批 1，无「入口悬空」窗口）。
- **数据缝（承 T3）**：面板不直连后端；新 op 一函数一动作、守卫造句照既有惯例；**缺路由停下待裁**。
- **先一致后另案（承 T3）**：设置面逐段以工作台为底本；形态创新一律登记。
- **桌面端铁律**：改 `client.js` 验收须整重启（模块代体检法）。

**Global Constraints:**
- 分支：插件仓（dsh-harness-rag）；每 Task 落地随手提交（英文 Conventional；deer-flow 零代码）。
- **每 Task 的 `**实测**` 行必须回填**（探针输出/真跑结论/提交哈希）。
- **插件侧验证**（同 T3 口径，有意不做单测）：host 半编译探针（仓外一次性）＋冒烟回归＋桌面端整重启真跑。
- **scope fence（本对不做）**：对话主模型治理 · 模型目录增删编辑 · 评测域菜单皮肤统一（§6 登记）· 菜单次序微调（Task 1 复看）· **A 组审计乙档余项**（④右键出题/⑤docErrors/⑦tab 溢出/⑪类型图标/⑫刻度轨/库排序拖拽——10-14 裁决「照建议登记」→ spec §6，不执行；**②重复上传已提入本对 Task 8**）。

**依赖顺序**：Task 0（只读核实）→ Task 1（菜单重构＋设置面批 1＝骨架/读取/重建索引/迁移）→ **Task 5（甲档小件批，10-14 并入）** → **Task 7（面板内拖拽上传，10-14 立）** → Task 2（嵌入段）→ **Task 8（重复上传拦截 A②，10-14 裁：并入本对）** → Task 3（多模态段）→ Task 4（解析/裁判/抽取段＋收口）→ **Task 6（收口统一换件：菜单/图标/Toast→宿主原件＋一轮复验）**。Task 1 单独立验（菜单可先上真栈）；Task 5 与菜单同面、紧随 Task 1 验后即可做；Task 7 紧随 Task 5 验后执行（与 Task 6 无依赖：提示暂走现提示机制，Task 6 换 Toast 时自然覆盖）；Task 8 于 Task 2 之后；Task 6 随 Task 4 收口执行（10-14 裁）。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点＋ §2 M2/M3/M5。

- [x] ①**设置视图逐段清单**（10-14）：**七组实读**——①默认模型（`defaultModel`：MODEL_REFERENCE_NONE/modelReferenceOptions 引用选择）②检索（`groupRetrieval`：嵌入四问〔provider/model/apiKey（SecretInput：env 徽章＋覆盖警示）/endpoint（占位符族）〕＋维度〔默认 1024、`changesEmbeddingDimension` 守卫、探测点＋档位下拉〕＋稀疏〔源三选 provider/external/bm25、外置四问、三守卫、`sparseServiceVerdictFor`〕＋重排 provider＋高级区 6 项）③抽取（`extractModel`）④评测（`judgeModel`）⑤多模态（caption〔`isCaptionCapable`〕＋ASR〔provider/本地引擎/模型菜单/`asrProbeBlocksSave` 阻塞/`probe-asr`〕）⑥服务（parse：provider/tier/version/language/base_url＋`qdrant_url`）⑦重建索引（在飞/状态行＋迁移行〔`useRagMigrationStatus`/`isMigrationRunning`；宽度迁移跨保存存活〕）。伴随件＝`dimension-migration-dialog`（批 2 维度变更弹层）/`reindex-dialog`（既有确认弹窗已等价，对照可选）；**非目标面**＝models-settings-page＋models-add/edit-dialog＋model-capability-editor（模型目录增删编辑，spec §7）。**四批分单落定**（批 2＝默认模型＋检索组＋探测四枚＋维度迁移弹层；批 3＝多模态组；批 4＝抽取＋评测＋服务组）；
- [x] ②**图标真值提取**（10-14）：从 `index-5SrrfWpU.js` 提取六枚 Regular 号原路径（Ellipsis 3 路径／Refresh 2／Edit 2／Trash 5／Settings 2／Plus 2）——证据 `hrag-probe/dsh-icons-extract.json`；结构真值＝`svg(16 视窗,fill=none,strokeWidth 1)`＋**path 属性逐条**（Ellipsis＝`fill`／Edit＝`fill`+`stroke`／Refresh・Trash・Settings・Plus・Chevron・Check＝`stroke`——v3 实核修正）；**提取法**＝图标 map→**就近**基础组件解析（token 跨模块重名，全局首配会错作用域）；缺件确认：无上传件、无书形件（→ 工作台同款档）；
- [x] ③**host op 映射表**（10-14）：KB CRUD＝`/api/knowledge-bases`（POST）＋`/{id}`（PATCH/DELETE，Task 1 逐条核 verb）；rag 配置＝`/api/rag/config`（GET/PUT）＋`/config/migration`＋探针五枚（embedding/dimensions/connectivity/asr/sparse）；模型目录＝`GET /api/models`（只读面）——新增 op 定名照 spec M5；
- [x] ④**菜单件改造差异清单**（10-14）：现行 `EvalMenu`＝描边紧凑形（Task 8 回退定稿）；目标＝DSH 真值参数（padding4/min-w144/radius-lg/半透明面＋backdrop/prominent 无边框；行 34px/13px/6·8/gap6；危险双色；分隔 0.5px l2）——**新抽 `DshMenu` 通用件供顶栏**，评测域两枚**零改动**（隔离＝互不复用触发器样式）。

**实测**（Task 0，2026-10-14，全四格）：

- ①见上（七组清单＋四批分单）；②图标六枚原路径＋**路径级属性**（v3 实核：Ellipsis fill 实心／Edit 混合／余 stroke；证据 `hrag-probe/dsh-icons-extract.json`；缺件＝上传/书形→工作台同款档）；③端点面（KB CRUD `/api/knowledge-bases`＋`/{id}`；rag 配置 GET/PUT＋migration＋探针五枚；模型目录 `GET /api/models`——**Task 1 op 集含 `listModels` 读面**（批 1 展示＝raw 直显；模型名解析/选择器归批 2））；④`DshMenu` 新抽、评测域零改动。
- 阅读范围：`functional-models-view` 1998＋`config-form` 885＋`api/hooks/types/migration` ≈3.6k 行，段/字段/守卫/文案键已录（见①）；bundle 探测＝`dsh-web-frontend/dist/assets/index-5SrrfWpU.js`（图标 map→基础组件→path 三段解析）。

---

## Task 1 — 菜单重构＋设置面批 1（骨架/读取/重建索引/迁移）

> 动到的文件：`client.js`（顶栏段＋设置面骨架）＋`src/kb_proxy.ts`（新 op）。
> **验收对应**：spec §4.1＋§4.2＋§2 M1–M4 批 1。

- [x] **菜单件**：按 M2 参数落 `hrag` 命名族菜单（`DshMenu`/`DshMenuItem`：无边框半透明面＋prominent、34px 行/13px/6·8/危险双色/0.5px 分隔；fixed 测位同 EvalMenu 配方）；`[裸库名＋chevron 下拉]＋[⋯ 裸钮靠右]` 顶栏（v2/v3 迭代后终态——见实测；触发器＝宿主 Ellipsis 原路径 `fill` 实心点）；八项条目＋三段分隔＋图标（M3 表：宿主原生五枚＋工作台同款三枚，原路径入库）；
- [x] **行内三钮退役**：刷新/上传→菜单（上传在飞禁用＋「上传中…」）；**重建索引→设置面批 1**（同 Task 内闭环，顶栏钮与状态行同步移入）；「刷新」文案＝「刷新界面」；
- [x] **管理闸**：重命名知识库＝单字段弹层（Enter/Esc/遮罩，顶栏 store 同步 +「已重命名」提示）；删除知识库＝确认框（工作台级联文案逐字；删后选中回退首个/空态）；
- [x] **设置面批 1**：`ModelSettingsPanel` Sheet 骨架（抽屉件同款）＋七组只读主行（27 字段标签照工作台逐字）＋重建索引入口（在飞禁用＋状态行同源）＋迁移状态行（running/succeeded/failed，`ragMigration` 在飞 3s 轮询）；
- [x] **host 半**：`createKb`/`renameKb`/`deleteKb`/`ragConfigGet`/`ragMigration`/`listModels`（守卫：createKb/renameKb 的 name 非空 400 不触后端；`node` 直载过）；
- [x] **探针**：`probe-menu.mjs`（仓外，mock 后端）**5/5 PASS**——createKb（trim/缺省描述/守卫）、renameKb（PATCH/trim/守卫）、deleteKb（204 中继＋404 透传）、三 GET 透传、死后端 502；
- [x] **真跑**：整重启桌面端——菜单八项逐项（含删除库走一遍）；设置面读取与工作台同库对照；重建索引入口行为一致（10-14 他手点全过，含三轮表现层迭代）。

**实测**（Task 1，2026-10-14；**真跑（他手点）已过**——含 v2/v3/贯穿线三迭代收口）：

- **落码**：host 半六 op（见上）；client 半＝`DshMenu`/`DshMenuItem`（DSH 真值菜单）＋顶栏（v1 `[select][⋯]`→ v2/v3 终态＝裸库名＋chevron 下拉、⋯ 裸钮靠右；刷新/上传退役入菜单、重建索引移入设置面）＋重命名弹层/删除确认/壳级重建确认＋`ModelSettingsPanel`（批 1 只读七组＋重建索引入口＋迁移行）＋WikiView 指令线（菜单切百科＋nonce 发令＋在飞态上报 `wikiBusy`）。图标＝宿主原路径五枚（Ellipsis/Refresh/Edit/Trash/Settings，Task 0 提取）＋lucide 同款三枚（Upload/BookOpen/RefreshCw）；菜单件与评测域 `EvalMenu` 互不复用（spec M2 注钉）。
- **自检**：`node --check` 过；`kb_proxy.ts` node 直载过；冒烟**全绿**（新增 DshMenu 触发＋设置面批 1 夹具渲染两项：组题/行标值/空值「—」/迁移行/重建状态行）；字典键审计（menu/set/renameKb/deleteKb 族 18 键＋27 字段键）零缺零余。
- **真跑（他手点，10-14 过）**：菜单八项逐项（上传在飞禁用、刷新界面、更新百科 spinner+禁用+切百科、重建百科确认闸、重命名、删除库走一遍、设置面开面）、设置面读取与工作台同库对照、重建索引入口行为（在飞态/状态行/提交双补拍）均已过；三轮表现层迭代（v2/v3/贯穿线）全收口；无遗留口径。
- **表现层迭代 v2（10-14 他复跑点名两处）**：①**⋯ 去边框**——触发器改裸图标钮（透明无框、悬停淡底，照 DSH 裸钮）；②**库选择去框**——`<select>` 全退（连框/线一起），改「知识库名（15px semibold）＋DSH chevron」裸触发钮，点击出 DSH 真值菜单（库列表、选中行尾 DSH 勾）；`hrag-kbtrigger`/`hrag-iconbare` 两族样式入册，原 `.hrag-bar select` 两规则删除。
- **表现层迭代 v3（10-14 二复跑点名两处）**：①**⋯ 空心＋未靠右**——图标改按**路径级属性**重刻（宿主真值逐条实读：Ellipsis＝`fill` 实心点、Edit＝fill 主体＋stroke 笔线、Refresh/Trash/Settings/Plus/Chevron/Check＝stroke——原「全 stroke」致点成空心）；`.hrag-bar > .hrag-mm-wrap + .hrag-mm-wrap { margin-left:auto }` 使 ⋯ 靠右。②**六 tab 改「对话头」设计**（宿主机源码实读 `ConversationRoot_module.css`：文本 tab——inactive `label-tertiary`／active `state-business-primary` 蓝＋`::after` 2px 圆角下划线（bottom −1px、inactive 预留透明）／13px・500・line16／padding 0 0 9px／gap 36）；**贯穿线补记（他三问）**：宿主真值＝header 容器 `border-bottom: .5px solid var(--dsw-alias-border-l3)`（蓝下划线 bottom −1px 即压此线）——已补至 `.hrag-tabs` 底缘。偏差登记：分栏窄档允许换行（flex-wrap）＋容器左距归零（对齐本地栏缘）。

---

## Task 2 — 设置面批 2（嵌入段）

> 动到的文件：`client.js`（设置面嵌入段）＋`src/kb_proxy.ts`（`ragConfigPut`/`probe*`）。
> **验收对应**：spec §2 M4 批 2。

- [ ] **表单**：provider/稀疏来源/维度（逐字段照工作台 `config-form` 口径——含选项表、禁用档、占位）；保存（`PUT config`）＋脏态/失败呈现；
- [ ] **守卫**：维度变更提醒（`changesEmbeddingDimension` 语义）；稀疏未配/不支持档的保存阻塞（照工作台 `asrProbeBlocksSave` 同族的稀疏守卫）；
- [ ] **探测**：`probe-embedding`/`probe-dimensions`/`probe-connectivity`/`probe-sparse` 的触发钮与结果呈现（照工作台）；
- [ ] **host 半**：`ragConfigPut`＋四探针 op；
- [ ] **真跑**：同库对照改-存-读闭环；探测各一枚。

**实测**（Task 2，执行后回填）：

---

## Task 3 — 设置面批 3（多模态段：caption＋ASR）

> 动到的文件：`client.js`（设置面多模态段）＋`src/kb_proxy.ts`（`probeAsr`）。
> **验收对应**：spec §2 M4 批 3。

- [ ] **caption 段**：可配项/模型选择（照工作台 `isCaptionCapable` 口径）；
- [ ] **ASR 段**：引擎（本地引擎菜单）/模型/provider 切换口径＋`probe-asr`（含「先探针后保存」的阻塞语义照工作台）；
- [ ] **host 半**：`probeAsr` op；
- [ ] **真跑**：同库对照——改-存-读；ASR 探针一枚。

**实测**（Task 3，执行后回填）：

---

## Task 4 — 设置面批 4（解析＋裁判/抽取段）＋收口

> 动到的文件：`client.js`（设置面剩余段）。
> **验收对应**：spec §2 M4 批 4＋§4 全量。

- [ ] **解析段**：MinerU 档/版本/provider/语言（照工作台 `PARSE_*` 口径）；
- [ ] **裁判/抽取模型段**：模型引用选择（`modelReferenceOptions` 口径）；
- [ ] **收口**：设置面四批全景复读——与工作台逐段对照表（段/字段/守卫/文案）；残留登记。

**实测**（Task 4，执行后回填）：

---

## Task 5 — 甲档小件批（10-14 A 组裁定并入）

> 动到的文件：`client.js`（库下拉/文档行）＋`src/kb_proxy.ts`（下载 raw GET）。
> **验收对应**：A 组审计 ①③⑩＋「上次打开库记忆」小尾巴（裁定行「甲档并入」）。

- [x] **建库入口**：库下拉（DshMenu）底部「＋ 新建知识库」项（dshPlus 原路径）→ 名称+描述弹层（照工作台 `createKB` 对话框：两字段、名称非空才可创建、Enter/Esc/遮罩）→ `createKb`（op 已有）→ 建成后即时选中（追加进列表 + setKbId）；
- [x] **文档下载**：文档行首位加「下载」动作 → host 补 `downloadDocument` **raw GET 透传**（字节流＋content-type/disposition 中继，失败=JSON envelope 保上游状态；照上传的 raw 通道）＋客户端 blob→锚点下载（文件名优先取 Content-Disposition，UTF-8 与引号两式）；
- [x] **上传白名单前置拦截**：选择文件时本地分区（小写后缀集合，照工作台 `partitionFilesBySuffix`/`fileSuffix` 语义）——被拒项先行提示（照工作台 `unsupportedFilesSkipped` 逐字）、仅合规项入队；白名单未取时放行不拦；
- [x] **上次打开库记忆**：`localStorage['hrag-last-kb']`——载入优先恢复（失效回退首个）、切换即记（try/catch 兜底）；
- [x] **探针＋真跑**：`probe-menu` 扩（下载 raw：字节＋双头中继/缺 doc_id 守卫 400 不触后端/上游 404 透传/死后端 502）**6/6 PASS**；`node --check`＋冒烟回归绿。

**实测**（Task 5，2026-10-14；**全交付·真跑过**）：

- **落码**：host 半＝`forwardDownload`（raw 中继，仿 `forwardUpload`；参数守卫/未配置 503/不可达 502/失败 envelope）；client 半＝建库下拉项＋创建弹层（两字段）、文档行「下载」、上传白名单前置分区（被拒提示）、库记忆（读/写两助手＋load 选择链）。
- **自检**：`node --check`；`kb_proxy.ts` node 直载；冒烟回归全绿；`probe-menu` **6/6**（新下载中继三测：字节与双头中继/守卫/404 透传）。
- **真跑（过，10-14 他复「测试好了」）**：整重启桌面端——四项清单过：建库一枚（兼验删除闸）／文档行下载（文件名＝原上传名）／混选不支持后缀＋合规文件（拒项提示＋合规项照传）／切库后重开默认回到上次库。**首轮咬出并已修**：宿主 locale 裸参复发（`upload.rejected` 直传字符串 ⇒ 事件处理器静默 TypeError，不入列不报错）——修＝参数改 `{ 0: … }`；冒烟加「t 裸参静检＋canary 自证」；全仓扫描 212 处 `t(` 仅 4 处带参、0 裸参。

---

## Task 6 — 收口统一换件（菜单/图标→宿主原件）＋一轮复验（10-14 裁）

> 动到的文件：`client.js`（`DshMenu`/`DshMenuItem` 族与手刻图标全量替换）＋冒烟脚本（仓外，补 primitives 供给）。
> **验收对应**：spec §6「宿主原件直用」裁定行；换件后菜单/图标逐条重对（§4.1 口径）。

- [ ] **菜单换件**：`DshMenu`/`DshMenuItem` → 宿主 `Menu`（items API：`selectedId` 勾选/`align`/键盘导航）＋`MenuItemButton`（`icon`/`danger`/`disabled`/`separatorBefore`）＋`MenuSurface`/`MenuGroup`（按需）；覆盖 `DshMenu` 现全部调用点（顶栏 ⋯、库下拉等）；定位/外点关闭/键盘导航交宿主件（`anchor`/`getAnchorRect`/`useDismissOnOutsidePointer`）；**评测域两枚 `EvalMenu` 不动**（M2 冻结）。
- [ ] **图标换件**：盘点 `client.js` 手刻 SVG → 凡 `primitives` 有件者换宿主 `Icon*`（Ellipsis/Refresh/Edit/Trash/Settings/Plus/ChevronDown/Check 等）；宿主无件者（Upload/BookOpen/RefreshCw 等）维持 M3 三档（lucide 同款）。
- [ ] **提示位换 Toast（10-14 裁：并入本轮）**：行内提示（`barNotice` 族：撤占流提示行渲染＋ `.hrag-notice` 相关 CSS）→ 宿主 `Toast` 原件——语义映射（成功/失败 → `tone`/警示图标）、自动消退交宿主（`holdMs` 缺省；旧 4s/8s 口径对照核一遍）、可选 `anchor` 锚面板顶栏（执行时定夺）；盘点其余自绘瞬时提示一并收口。
- [ ] **require 接线**：`require('@deepseek-ai/dsh-client-ui-primitives')`（基线种子表；`dsh.client.external` 无需改）；冒烟桩补 primitives 供给（宿主提取件或手桩）。
- [ ] **门禁**：`node --check`＋冒烟回归（含 t 裸参静检）＋探针回归。
- [ ] **一轮复验**：整重启桌面端——菜单逐项（顶栏 ⋯ 八项＋库下拉＋勾选态）＋图标逐枚对照＋提示位（建库/重命名/上传拒项的 Toast 出位与消退）；**一轮即可**（不复跑各批）。

**实测**（Task 6，执行后回填）：

---

## Task 7 — 面板内拖拽上传（10-14 裁）

> 动到的文件：`client.js`（面板根拖拽处理器＋复用现有上传链＋提示文案）。
> **验收对应**：spec §6「面板拖拽」裁定行（遮罩不动、范围仅面板、C 口径）。

- [x] **主路径**：面板内容区根挂 `dragover`（仅当 `dataTransfer.types` 含 `Files`；`preventDefault`＋`dropEffect='copy'`＋`stopPropagation`）与 `drop`（`stopPropagation`＋`preventDefault`，取 `dataTransfer.files` → **直接复用现有上传链** `handleUpload`——白名单前置拦截等逐字同）；**不清 `dragenter`/`dragleave`**（宿主遮罩计数/显隐零变化）；目录项拒（`webkitGetAsEntry().isDirectory`，提示一条）。
- [x] **接不了处置（C 口径）**：没选库／上传中 → **吞掉 drop＋就地提示**（「知识库暂不可接收：请先创建知识库」／「上传中，请稍候」）；**不回落会话**（照宿主「接不了就吞、不转移目的地」惯例）。提示暂走现提示机制，Task 6 换 `Toast` 后自然覆盖。
- [x] **遮罩收尾**：吞 drop 后宿主自己的 `reset()` 不跑 → 补 `window.dispatchEvent(new Event('dragend'))` 走其既有清理口；真跑核「落下后遮罩即消」。
- [x] **范围**：仅面板内容区（全部 tab）；对话区/其他面板/窗口其余位置零改动（宿主默认＝对话附件）。
- [x] **冒烟＋真跑**：冒烟结构项已以纯助手用例落（`isFileDrag`／`splitDroppedFiles`，目录不排队/无 items 回退/文本拖拽不拦）；真跑——面板投放与宿主默认面随测未见异常；④「上传中」按**未实操**记录（提交窗极短）。

**实测**（Task 7，2026-10-14；**全交付·真跑过**）：

- **落码**：`isFileDrag`／`splitDroppedFiles` 两纯助手（模块级）＋`hrag-root` 挂 `onDragOver`／`onDrop`（仅 Files 类拖拽；`preventDefault`＋`stopPropagation`＋`dropEffect='copy'`；吞 drop 后补发 window `dragend` 走宿主 reset 口）；接不了＝吞掉＋提示（`upload.needKb`／`upload.busy`，不回落会话）；目录仅收文件（dirs-only 提示 `upload.dirSkipped`；混选时静默丢弃目录、文件照传）；`dragenter`/`dragleave` 不拦（遮罩计数零变化）。字典 zh/en 各三键。
- **自检**：`node --check` 过；冒烟**全绿**（新用例 6 断言：目录计数不排队／无 items 回退／文本拖拽不拦／空 transfer 不拦）。
- **真跑（过，10-14 他令落笔）**：①面板内投放→传当前库（测试痕迹＝库内三份同名 jpg）；②③⑤（对话区仍为附件／其他面板维持默认／遮罩落下即消）随测未见异常；**④「上传中」＝未实操记录**——小文件提交 <1s 即入「解析中」，窗太短无法复现（该守卫实际覆盖大文件 POST 期间）。附带发现：重复上传可传＝A② 已知缺口（工作台有哈希判同三件），已立 Task 8。

---

## Task 8 — 重复上传拦截（A②）（10-14 裁：并入本对，Task 2 之后）

> 动到的文件：`client.js`（上传链前置判同＋弹层）；（host 半零改动——`deleteDocument` 已有）。
> **验收对应**：spec §6「重复上传拦截（A②）」裁定行；照工作台三件移植（`duplicate-check`／`duplicate-upload-flow`／`duplicate-upload-dialog`）。

- [ ] **判同**：上传前置（菜单/拖拽/选择器三入口同链）——先查同名（基名精确＋后缀大小写不敏感），命中才算 SHA-256（`crypto.subtle`）比文档清单 `content_hash`（清单带该字段，已实查）：同哈希＝identical（默认跳过／可留副本）、哈希不同或无哈希＝conflict（替换／并存）、无同名＝clean。判同数据＝当前库文档清单（取数方式落码时定：上传时惰取 `listDocuments` 或共享缓存）。
- [ ] **弹层**：三动作选择照工作台（跳过／替换／并存；identical 另可留副本），多个重复**排队逐个决定**；文案照工作台 `duplicateUpload` 逐字移植。
- [ ] **流程**：替换＝**先删后传**（顺序冻结——防后置级联冲掉新上传的派生状态）；并存＝自动改名 `name (2).ext`（已存在则递增）。
- [ ] **门禁＋真跑**：冒烟（判同纯函数用例：同名同哈希／同名异哈希／无同名／无哈希）；真跑——同文件再传→弹层（默认跳过）；改内容同名→替换（列表只留新件）／并存（出现 `(2)`）。

**实测**（Task 8，执行后回填）：

---

## 提交链（滚动记实，本对）

- [x] Task 1 三笔（10-14）：`7b5c73c` host 六 op／`884b422` client（顶栏重做＋设置面批 1＋三迭代）／`03da3ee` docs（Task 0/1 实测＋A 组终裁）。**全部未推**（仓暂无 remote）。
- [x] Task 5 三笔（10-14）：`a72df3c` host（`downloadDocument` raw 中继）／`7652aad` client（建库弹层·下载·白名单前置·上次库记忆＋`upload.rejected` 裸参修复）／`3e95f9a` docs（Task 5 实测收官＋Task 6/7 立项＋§6 三行裁定登记）。**全部未推**（仓暂无 remote）。
