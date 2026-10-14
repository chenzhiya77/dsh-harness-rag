# 面板 ⋯ 菜单与功能模型设置 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-14-menu-model-settings-spec.md](../specs/2026-10-14-menu-model-settings-spec.md)（M1–M7 决定＋落点＋验收）
**Status:** 执行中——Task 0–1 已落地（`7b5c73c`／`884b422`／`03da3ee`；Task 1 真跑已过）；**Task 5 已收官**（真跑过，10-14）；**Task 7 已收官**（真跑过；④未实操记录）；**Task 2 已收官**（真跑过，10-14）；**Task 8 已收官**（真跑过，10-14）；**Task 3 已收官**（真跑过，10-14；含表现层六轮＋三续）；**Task 4 已收官**（真跑过，10-15）；**Task 6 已收官**（复验过，10-15）——**本对全收官**（Task 0–8 全交付）。
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

- [x] **表单**：provider/稀疏来源/维度（逐字段照工作台 `config-form` 口径——含选项表、禁用档、占位）；保存（`PUT config`）＋脏态/失败呈现；
- [x] **守卫**：维度变更提醒（`changesEmbeddingDimension` 语义）；稀疏未配/不支持档的保存阻塞（照工作台 `asrProbeBlocksSave` 同族的稀疏守卫）；
- [x] **探测**：`probe-embedding`/`probe-dimensions`/`probe-connectivity`/`probe-sparse` 的触发钮与结果呈现（照工作台）；
- [x] **host 半**：`ragConfigPut`＋四探针 op；
- [x] **真跑**：同库对照改-存-读闭环；探测各一枚。

**实测**（Task 2，2026-10-14；**全交付·真跑过**）：

- **落码·host 半**：五 op（`ragConfigPut`＝PUT 全量替换＋`probeEmbedding`/`probeDimensions`/`probeConnectivity`/`probeSparse`＝POST 只读），统一 `bodyOf` 对象守卫（缺 body 400 不触后端）。
- **落码·client 半**：纯逻辑层照 `config-form.ts` 逐条移植——`ragFormValuesFromConfig`／`ragBuildInput`（全字段携带规则：文件持有原样携带、掩码哨兵往返、清空 owned 选择＝`null`、config_file 字段不被冻结）／`ragHasChanges`／`ragChangesDimension`（按生效宽度，空白＝1024）／`ragIsEmbeddingChange`（整个提供方维度）／稀疏能力三态 `ragResolveSparseCapability`＋`ragSparseProviderOptionDisabled`／`ragShouldProbeSparseService`／各 probe 键族（结论跟取值走）／`ragModelReferenceOptions`（none＋display_name＋孤儿值）／`ragDimensionTiersFor`。表单 UI：默认模型组＝引用选择；检索组＝两腿块（通点标题钮＋四问：提供商／Model／API Key〔env 徽章骑字段内〕／接口地址〔占位＝capability `default_endpoint`〕）＋「高级设置（6 项）」折叠（维度〔框内状态点＋档位下拉；③型自动回填〕＋稀疏来源〔三选；「跟随向量模型」已知不支持时禁用并带因、状态「检测中…／未验证」骑字段〕＋external 四问嵌套〔服务探针状态骑地址字段〕或非 external 四条锁定行）＋两处红警示（换嵌入警示／稀疏阻塞，折叠外可见）＋保存行（脏态禁用：原因随行／保存后 warning 行）＋维改确认弹层（工作台文案逐字）。
- **新写控件照裁直用宿主件**：`Input`（require 种子表基线包＋缺件回退原生元素；本批采用此一件——宿主无 Select，选择器维持原生样式）。
- **探测（无手动钮，照工作台）**：稀疏能力／稀疏服务／维度三条自动探测（debounce 400ms、条件齐才发、按候选键只发一次）＋两腿连通点（点标题即发、按腿各一实例）；失败不弹错，就地成为行上状态（未验证／连不上／未探明）。
- **自检**：`node --check` 过；冒烟**全绿**（面板批 2 渲染断言 12 条＋纯逻辑用例 11 断言）；`probe-menu` 扩至 **7/7**（五 op 逐条 method/path/body 中继＋缺 body 400 不触后端）。
- **偏差登记**：①窄档腿标题也带连通点（工作台窄档不渲染该控件；插件恒窄档，为保四探测可达保留）；②行提示走 `title`（宿主 `Tooltip` 未引入——与面板现状一致，归收口轮统看）；③档位下拉用 `DshMenu`（工作台 Radix DropdownMenu）；④保存成功走行内文案（工作台 toast——Task 6 换 Toast 后可顺势）。
- **真跑首轮（10-14）**：点「功能模型设置」→ **整窗白屏**（重启 DSH 方复）。**根因**＝表单三块（默认模型组／高级区／检索组）在渲染前无条件求值，首帧 `values` 为 `null`（播种在 effect）→ `legProps` 读 null 即抛；且设置面此前不在 `HragBoundary` 内，异常逃逸掀整棵树。**修复**＝三块改条件求值（`view && values ? … : null`）；**顺手加固**＝设置面纳入 `HragBoundary`（照三抽屉惯例）；冒烟加「未播种首帧」回归用例（`values=null` 必须只渲染加载行）。复跑全绿。
- **真跑二轮（10-14）：「重建索引」卡「消失」案破案**——现象：面板顶部看不到该卡（新开/滚顶均无）。DevTools 三连探针：① `document.querySelector('.hrag-set-card')` 在 DOM（正文第一子项、`scrollTop:0`）；② **盒高仅 1px**（`cardBottom−cardTop=1`）；③ 子项完好（`kids:2, heights:[29,42]`，卡头/按钮俱在）＋ `Sources` 全局搜索确认**运行包含完整卡代码**。⇒ 根因＝设置面正文是 **flex 列滚动体**，`.hrag-set-card` 因 `overflow: hidden` 失去 flex 自动最小尺寸保护，内容总高（1092px）超出视口（697px）时被 flex 压到 1px、内容裁掉（批 1 内容未越界故潜伏）。**修＝`.hrag-set-body > * { flex-shrink: 0; }`**（保自然高度、交容器滚动）＋**同类审计**＝`hrag-wk-drawer-body` 同款守卫（其 sect 已有 `flex-shrink:0`，补子项级兜底）。此前「滚动过」「被宿主栏遮挡」两推断均作废，以探针输出为准。附带观察：DevTools 见 `/plugins/events` 持续 `ERR_FAILED`（桌面端页面插件事件流断连，非本插件；留意）。复跑冒烟全绿；真跑复验（重开面板顶部见卡）待他确认。
- **形态改判（10-14 两轮，随修）**：一轮——他指「DSH 自己的设置就是长的」且形态＝居中大弹窗（截图实证）⇒ 原「面板内 Sheet」系内容面抽屉定式的惯性误用，改为**弹窗**；二轮——他定「**弹窗只放在 rag 的界面中**」⇒ 遮罩与弹窗收进 `absolute` 于面板根。**「只灰不见窗」两轮同一根因（本轮定案）**＝遮罩与面板体自抽屉时代起是 **Fragment 兄弟**（非父子），抽屉靠 `absolute` 自锚所以无恙；弹窗的 flex/居中/百分比高写法**以父容器为前提**，全落空——兄弟弹窗成了 `hrag-root`（relative＋flex 列）流里的普通项，被推到正文列尾滚出可视区。**修＝弹窗自锚**（`absolute; top/right/bottom/left: 16px; margin: 0 auto; width: min(600px, calc(100% - 32px))`——照抽屉配方，不依赖父容器）；本地复现页 `modal-repro.html` 改**真结构（兄弟）**后实测：`modal 589×688 @(17,17)、opacity 1、absolute` ✓（数字为准，截图曾误读）。**内容面**（切片/百科/续读）仍守 10-13「弹层只在所属空间内」裁决；spec M4 批 1 措辞同步改判。冒烟复跑全绿。
- **真跑（过，10-14 他复「验收过了」）**：**面板内大弹窗形态**／表单可编辑＋保存闭环（同库对照读回）／四探测出结果（连通点／维度档位／稀疏状态／服务状态）／守卫两条（地址必填＋稀疏未配）——全过。三案随本轮真跑揪出并修复（白屏孤立、flex 压扁、弹窗自锚），分别记录于上两条与「形态改判」条。

---

## Task 3 — 设置面批 3（多模态段：caption＋ASR）

> 动到的文件：`client.js`（设置面多模态段）＋`src/kb_proxy.ts`（`probeAsr`）。
> **验收对应**：spec §2 M4 批 3。

- [x] **caption 段**：可配项/模型选择（照工作台 `isCaptionCapable` 口径）；
- [x] **ASR 段**：引擎（本地引擎菜单）/模型/provider 切换口径＋`probe-asr`（含「先探针后保存」的阻塞语义照工作台）；
- [x] **host 半**：`probeAsr` op；
- [x] **真跑**：同库对照——改-存-读；ASR 段（引擎切换/锁定/候选菜单）真跑过（10-14 他复「过了」；含表现层六轮＋三续复跑）。

**实测**（Task 3，2026-10-14；编码＋自检就绪，**真跑待整重启**）：

- **caption 段**：视觉筛选选择器——`ragIsCaptionCapable`（`supports_vision`）过滤后走 `ragModelReferenceOptions`（默认项＋display_name＋孤儿值）；无视觉条目时显示工作台同句提示。**取数源勘误（真跑同轮，他当场提问「当前没有模型声明了视觉吗」）**：caption 的合规源＝**配置条目面** `/api/models/config`（带声明能力）——解析后的目录面 `/api/models` 不带该字段；我首版接错源（用目录面）⇒ 全部滤空、列表只剩孤儿，被他一问戳破。实核本实例**4/5 声明视觉**（qwen3.8-flash／qwen3.7-flash／deepseek-flash／mimo-v2.6-flash＝true；deepseek-v4-flash＝false）。**修**＝host 补 `listModelsConfig` op＋caption/视觉判定改用 `managedModels`（照工作台 `useModelsConfig` 与 `useModels` 分源：目录面管默认模型选择、配置面管视觉筛选）。
- **表现层一轮（10-14 他定）**：caption 的无视觉提示**不再另起一行**（太长太占地方）——**与「（使用配置默认）」共用同一个框**（两态互斥）：有视觉条目＝显示默认项文案；无＝把**简写提示**（「尚无视觉模型」/「No vision model」）当该选项标签，**框中与下拉同一处**；下方独立提示行与对应 CSS 均撤。
- **ASR 段**（四行块照工作台）：主行「语音识别模型」＝`<optgroup>` 三组（本地引擎／通用协议／原生协议）；**切换即改值** `ragAsrModelForProviderSwitch`（whisper 名→funasr 首行、非 whisper 名→whisper 首行、funasr 开放集原样、服务档原样带过）；嵌套 Model ID＝自由填＋框内候选菜单（仅本地引擎；`ASR_MODEL_MENU`，占位＝菜单首行）；嵌套 API Key／接口地址＝服务档可编辑（厂商端点占位）／本地引擎两条锁定行「仅服务档需要」。
- **探针照工作台零入口休眠**：host 补 `probeAsr` op（链路完整、无 UI）；`ragAsrProbeBlocksSave` 门接进保存阻塞链（verdict 无来源 ⇒ 恒不触发；兜底仍为保存期构造拒绝＋入库期 `asr=failed`）。
- **结构**：多模态组从只读转可编辑（`SET_GROUPS` 拆前段＋`SET_TAIL_GROUPS`〔服务组〕；渲染序＝默认模型→检索→抽取/评测→**多模态**→服务→保存）。
- **自检**：`node --check` 过；冒烟**全绿**——新增：面板多模态断言（视觉条目入列／非视觉滤出／声明在位时无提示／服务档不锁）＋**空表提示用例**（配置面无视觉条目 ⇒ 提示回归）＋**本地引擎锁定态渲染用例**（恰两条「仅服务档需要」）＋助手 7 断言（视觉过滤／孤儿／引擎切换四分支）；`probe-menu` 扩 **8/8**（`probeAsr`＋`listModelsConfig` 中继＋守卫）。
- **回归防线首次实战**：本轮新常量 `asrModelHint`／`captionOptions` 又犯「首帧 `values=null` 无条件求值」——被白屏案新增的「未播种首帧」冒烟用例**当场拦下**，修＝补 `values` 守卫（同族第三例；该防线有效）。
- **表现层二轮（10-14 他复跑点名两处，事后判为不完整）**：①ASR Model ID 箭钮 `pointer-events:auto`（`.hrag-set-tierbtn` 本体补；首修只补了包裹层，而 `pointer-events` 系继承属性、ASR 箭钮无包裹类 ⇒ 漏网）；②六个 `HostInput`（嵌入/重排/稀疏/ASR 的模型与地址）补 `spellCheck:false`（红波浪线）。**教训**：当轮命中验证页（`trail-repro.html`）没带真祖先链（无 transform）——过了但真机仍坏；**复现页必须用真结构全链**。
- **表现层三轮（10-14 复跑「还是错误的」案破案，三根因定案）**：①**点击没效果＋滑条会动**——根因＝**`.hrag-set-trail` 的 `transform: translateY(-50%)` 成了固定位菜单（`.hrag-mm`）的包含块**：菜单被放到「trail 左上＋按钮视口坐标」的错位处，面板 `overflow:hidden` 裁掉 ⇒ 不可见；且菜单尺寸撑进滚动体（复现页实测：旧链菜单落 `[420,431]`〔应在按钮正下〕、`scrollWidth 249→527`、`clientHeight −15`＝横条现身——「上下/左右滑条会动」机制吻合）。**修＝trail 去 transform，改 `top:0;bottom:0` 拉伸＋flex 居中**（几何等价、不产生包含块；同页修复链实测菜单落 `[219,259]`＝按钮正下、滚动条零变化）。②**点的是带边框的壳**——ASR 的 `DshMenu` 漏传 `className`，外层按钮吃默认 `hrag-btn-outline` 描边（维度行传了 `hrag-set-tierwrap` 故无恙）；修＝补同款 `className`（另把 `tierwrap` 补按钮复位式样，免依赖宿主 preflight；候选菜单改 `align:'end'` 左向展开、留在面板内——工作台靠 Radix 碰撞回退才没伸出右缘，我们无回退）。③**嵌套行不对齐**——原缩进是整行 padding（标签/值列同推 +11）；工作台 `NESTED_GUTTER`（`ml-3 border-l pl-3`）**只作用于标题格**（标题文字 +25、值列 ±0）；修＝CSS 改 `.hrag-set-row-nested > .hrag-set-label`（复现页三组坐标实核：parent label 70/box 206、旧 nested 81/217、新 nested 82〔文字 95〕/206）。
- **表现层四轮（10-14 复跑「对照图2 完善」三处）**：框内下拉照工作台（源码逐字核：`DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-0"`＋触发器 `<ChevronDown className="size-4 opacity-50" />`＋`pr-3`；维度与 ASR 两处同规格）——①**菜单等宽输入框、贴其左右缘开**：`DshMenu` 加 `anchor:'field'`（按 `.hrag-set-field` 整框测位＋取等宽；`.hrag-mm` 补 `box-sizing:border-box` 免 +8px 溢出）——原「按钮锚＋min-width 144」菜单右缘短一截且短于框宽；②**触发器 chevron 换工作台同款**（新 `lucideChevronDownIcon`＝16px・stroke2・opacity .5；维度/ASR 两处同换——原 DSH chevron 14px 描边 1）；③触发器右距 10→12px（工作台 `pr-3`）。**复现页实测**（修复链）：菜单宽 247＝框宽 247、左缘 206＝206、下沿间距 4px、滚动条零变化（右缘 1px 内＝亚像素舍入）。
- **表现层五轮（10-14 复跑「Model ID 溢出容器」案破案）**：现象＝输入框右缘越过容器约 17px、chevron 却仍在字段缘内（＝**盒比字段宽**）。根因＝**盒模型混用**：宿主 `Input` 外壳是 `<span>`（页内无全局 border-box ⇒ content-box），我方 `width:100%` 被其 padding+border 顶出 +17px；原生 `select`/`input` 吃 **UA border-box** 所以 select 行无恙（引擎实测钉死：input content-box 335/300 溢出、select border-box 300/300 含住、同构 span 旧 317→新 300）。修＝`.hrag-set-control` 补 `box-sizing:border-box`（一处覆盖全部 8 处 HostInput＋primitives 缺件时的原生 input 回退）。**教训承接三轮**：复现页此前用裸 `input`（恰吃 UA border-box）——控件本身也是「真结构」的一部分。
- **同类待核（登记，未目视复现）**：`.hrag-input` 家族走 `width:100%`＋padding 的两处原生 input（图搜索 `.hrag-graph-search .hrag-input`、评测搜索 `.hrag-ev-search`）——同型 content-box 隐患；其余 `.hrag-input` 为 `flex:1`（flex 分配含 padding，安全）。
- **表现层六轮（10-14 他令「这两个下拉也改成 Model ID 同款·逻辑不变」）**：caption＋provider 两条原生 `<select>` 换**与 Model ID 同款的选择器外观**——`hrag-set-picker`＝宿主 Input 真值样式盒（l4 边/layer-1 底/32 高/8 左距/14px）＋右侧 workbench chevron（12px），**整盒即 DshMenu 触发钮**（`anchor:'field'` 菜单等宽同缘）。**选项与更新逻辑原样**：provider 三组→菜单组标签＋选中✓（切换即改值 `ragAsrModelForProviderSwitch` 照跑）；caption 两态标签照旧共用框、孤儿值照旧。**同轮续（他补令「默认模型、引用、稀疏来源三处也统一」）**：余下原生 `<select>` 全数换同款——默认模型组／检索两腿提供商（×2）／稀疏向量来源／稀疏提供商（external 嵌套）——抽共用件 `pickerControl`（签名照 selectControl；`disabledFor` 保留「仅稠密」禁选项＋后缀文案）；**`selectControl` 与 `.hrag-set-select` 全族退役**（零引用删除）。顺带修一条旧潜伏：高级区「外部未启用」四条锁定行的 map key 挂在 options 上不生效（本次首次渲染高级区现形）——key 改挂 Fragment。引擎实测：盒宽 300＝字段宽、chevron 右距 12.5px、长标签 ellipsis、height 32；冒烟补「高级区展开」两渲染用例（含 external 分支；五/六/七枚 picker 计数断言在案，无 key 警告）。**统一后复跑「都变短了」案**：根因＝`DshMenu` 自带 `.hrag-mm-wrap`（inline-flex・内容宽）——选择器把 DshMenu 直接挂在 field 下（区别于 Model ID 的 trail 用法），内容宽的壳令 `width:100%` 的钮回退为内容宽；修＝`.hrag-set-field > .hrag-mm-wrap { display:flex; width:100% }`（只命中「壳即 field 直子」的选择器用法；trail 内的 wrap 不触）。复现页（**这次带全真结构＝grid 行＋field＋mm-wrap 壳**）实测：无修 178px → 有修 284＝字段宽。**教训第三次同族**：复现必须带真组件自带壳层——前两次＝缺 transform 祖先、裸 input 代宿主件。**同轮续②（他复跑点名「按钮图标没有对齐其他输入框」）**：全部选择器换盒内 chevron（padding-right 12）后，**维度行的 chevron 还挂在 trail 的 28px 旧轴上**（唯一残留；他截图实测该行 chevron 距框缘 ≈30px、其余 ≈12px）——修＝该 trail 加 `style:{right:'12px'}`（照 ASR Model ID 行先例）；引擎复核两轴重合（trail 13＝picker 13＝12px＋0.5 边框）。**同轮续③（他令「这段提示去掉，太占位置」）**：高级区底部两段行内提示（`embeddingChangeWarning` 段＋`sparseBlockReason` 段）**撤除**——承接位＝**检索组标题 ⓘ**（`set.form.retrievalHint` 追加「更换向量模型/提供方/地址/稀疏来源后需重建索引」句，中英同步）＋**保存行**（存后服务端 `warning`、阻止原因原样照显）；`ragIsEmbeddingChange`＋`embeddingChanged`＋`.hrag-set-warn` 全链退役（零引用删除；工作台原为行内段、本条为有意分叉）。**续④（10-15 他令「功能模型设置下面不要有这条划分线」）**：设置面头部去划分线——`.hrag-modal .hrag-drawer-head { border-bottom: none }`（只作于弹窗；抽屉们的头线照旧）。**此笔落于 Task 3 收官之后、待随下一站提交**。
- **真跑（过，10-14 他复「过了」；含表现层六轮＋续① ② ③ 复跑）**：关面板重开——①多模态组可编辑：caption 列表应见四个声明视觉的模型（mimo 常驻；「尚无视觉模型」仅在配置面无声明时出现）；②ASR 切「funasr（本地）」→ Model ID 框内箭头**可点开候选菜单**（工作台同款 chevron、菜单与输入框等宽同缘、点击不带动滚动条）＋两条「仅服务档需要」，且 Model ID 输入框与其它框**右缘齐平**（不再越界）；切「dashscope（百炼）」→ 两行变可编辑、地址占位＝厂商端点；③改-存-读闭环与工作台同库对照；④嵌套行标题缩进＋值列与父行对齐；⑤框内无红波浪线；⑥设置面全部下拉＝Model ID 同款选择器（多模态两行＋默认模型＋两腿提供商＋稀疏来源/提供商；点开菜单选值，行为与改前一致）**且全部 chevron 同轴**（距框右缘 12px，含维度行的档位菜单）——全过。

---

## Task 4 — 设置面批 4（解析＋裁判/抽取段）＋收口

> 动到的文件：`client.js`（设置面剩余段）。
> **验收对应**：spec §2 M4 批 4＋§4 全量。

- [x] **解析段**：MinerU 档/版本/provider/语言（照工作台 `PARSE_*` 口径）；
- [x] **裁判/抽取模型段**：模型引用选择（`modelReferenceOptions` 口径）；
- [x] **收口**：设置面四批全景复读——与工作台逐段对照表（段/字段/守卫/文案）；残留登记。

**实测**（Task 4，10-15；编码＋自检就绪，**真跑待复跑**）：

- **解析段**（服务组转可编辑）：七行照工作台逐条——Qdrant 地址（url 输入）；解析提供方（picker；`providerLabel` 补 `mineru-cloud`/`mineru-local`）；**local/cloud 分支**（`mineru-local`：服务地址无占位＋档位 picker〔空＝（由服务决定）〕＋语种/版本/令牌三行「仅云 API 需要」锁定；云：服务地址占位 `https://mineru.net`＋档位「仅本地服务需要」锁定＋语种/版本 picker＋令牌 secret＋env 徽章）；行 ⓘ 四条＋组 ⓘ 照搬。
- **裁判/抽取段**（抽取组＋评测组转可编辑）：四行＝新共用件 `referencePicker`（工作台 `modelReferenceOptions` 口径：无值＝（使用配置默认）、孤儿值列尾、选「默认」清覆盖）；default 组同件重构（去重复实现）。**分组错放修正（10-15 他贴图对照）**：首版把「考题合成模型」放进抽取组，工作台实为**抽取组＝图谱抽取模型＋百科生成模型；评测组＝裁判模型＋考题合成模型**——已归位。
- **只读机制全退役**：`SET_GROUPS`／`SET_TAIL_GROUPS`／`readonlyGroup`／`setValueAt` 零引用删除；渲染序＝默认→检索→抽取→评测→多模态→服务→保存。
- **自检**：`node --check` 过；冒烟绿（picker 计数随新组更新 11/11/12/13＋新断言：本地分支三条「仅云 API 需要」、抽取/评测组标题、解析提供方标签）；`probe-menu` 8/8；全真渲染量布局=13 行控件 over 全 0。
- **收口（逐段对照表）**：工作台七段全对照——default（选择器✓；**思考跟随菜单☒→spec §6 登记待裁**）／retrieval✓／extraction✓／evaluation✓／multimodal✓（批 3）／services✓／reindex（**形态有意差异**：面板上下文直重建当前库、无选库行，已登记）。守卫/文案抽检：none 标签、两类锁定行、行 ⓘ/组 ⓘ 逐字一致。
- **真跑（过，10-15 他复「测试过了」）**：①抽取/评测四行选择器——选值与保存闭环 + 归属修正（抽取＝extract＋wiki；评测＝judge＋synthesis）复看无误；②服务组两分支（本地：档位可选＋三条「仅云 API 需要」；云：地址占位/档位锁定/语种+版本可选/令牌）切换正常；③Qdrant 地址可编辑；④整表单改-存-读闭环——全过。**本段同时携 Task 3 收官后的「设置面头部去划分线」（续④）一并落笔。**

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

- [x] **菜单换件**：`DshMenu`/`DshMenuItem` → 宿主 `Menu`（items API：`selectedId` 勾选/`align`/键盘导航）＋`MenuItemButton`（`icon`/`danger`/`disabled`/`separatorBefore`）＋`MenuSurface`/`MenuGroup`（按需）；覆盖 `DshMenu` 现全部调用点（顶栏 ⋯、库下拉等）；定位/外点关闭/键盘导航交宿主件（`anchor`/`getAnchorRect`/`useDismissOnOutsidePointer`）；**评测域两枚 `EvalMenu` 不动**（M2 冻结）。
- [x] **图标换件**：盘点 `client.js` 手刻 SVG → 凡 `primitives` 有件者换宿主 `Icon*`（Ellipsis/Refresh/Edit/Trash/Settings/Plus/ChevronDown/Check 等）；宿主无件者（Upload/BookOpen/RefreshCw 等）维持 M3 三档（lucide 同款）。
- [x] **提示位换 Toast（10-14 裁：并入本轮）**：行内提示（`barNotice` 族：撤占流提示行渲染＋ `.hrag-notice` 相关 CSS）→ 宿主 `Toast` 原件——语义映射（成功/失败 → `tone`/警示图标）、自动消退交宿主（`holdMs` 缺省；旧 4s/8s 口径对照核一遍）、可选 `anchor` 锚面板顶栏（执行时定夺）；盘点其余自绘瞬时提示一并收口。
- [x] **思考跟随菜单（10-15 他裁「做」：随本轮）**：default 组五槽位菜单（extract/wiki/judge/synthesis/vlm；常开不关＝连点五项一个决定；两列 subgrid 对齐＝角色｜该槽当前模型；勾选即写 `*_thinking`，保存链本就全程携带）——**实现已落码**（位于 Task 4 后、本轮前）；本项＝换件后随一轮复验重对（菜单长相/开合/勾选态）。
- [x] **require 接线**：`require('@deepseek-ai/dsh-client-ui-primitives')`（基线种子表；`dsh.client.external` 无需改）；冒烟桩补 primitives 供给（宿主提取件或手桩）。
- [x] **门禁**：`node --check`＋冒烟回归（含 t 裸参静检）＋探针回归。
- [x] **一轮复验**：整重启桌面端——菜单逐项（顶栏 ⋯ 八项＋库下拉＋勾选态）＋图标逐枚对照＋提示位（建库/重命名/上传拒项的 Toast 出位与消退）；**一轮即可**（不复跑各批）——**10-15 他复「过了」**（含复验中途三轮修补：⋯ 靠右／思考菜单调参／重建卡选择框）。

**实测**（Task 6，10-15；编码＋自检就绪，**一轮复验待整重启**）：

- **取证**：asar 读宿主 `primitives`（282 导出）——`Menu` 受控件（open／anchor 节点／items／children／selectedId／onSelect／onClose／align／portal，内置视口钳制 12px、外点关、Esc、键盘游走、焦点归还）、`MenuSurface`、`MenuItemButton`、`Toast`（text／tone／anchor／holdMs=3s＋fade 1s／onDone 呼叫方管理）、图标族 `Icon*Outline{Regular,Medium}({size=14,className})`。
- **菜单换件**：`DshMenu` 重写为宿主 `Menu` 适配器（触发器按钮＋受控 open；8 个调用点全迁 items/children：⋯ 八项、库下拉、设置面五处 picker、维度档位、ASR 候选、思考菜单）＋`DshMenuItem` 退役；`anchor:'field'` 整框等宽经 `--hrag-menu-eq-w`＋`listClassName`（宿主 list 在 body portal 下）；缺件回退＝极简 fixed 列表；**EvalMenu 两枚冻结未动**。
- **图标换件**：Ellipsis／Refresh／Edit／Trash／Settings／Plus／ChevronDown／Check 八族直用宿主 `Icon*`（旧手刻原路径留作回退）；Upload／BookOpen／RefreshCw 宿主无件、picker chevron＝图2 口径，均维持 M3。
- **Toast 换件**：新增面板级 `toastBus`＋`ToasterHost`（anchor 顶栏、错误 8s／常规 4s＝旧口径、逐发 seq 重启周期；缺件回退旧行内行）；shell `barNotice` 族（15 处）＋六个视图瞬时 notice（chunk／recall-saved／vector／graph／doc／eval／wiki）全改挂总线；持久错误行（召回 mismatch/failed）与设置面保存行内状态不动；**顺带修**：图视图 notice 原为裸字符串（`notice.text` 恒空）——换总线后修复。
- **自检**：`node --check`；冒烟桩升契约级（Menu 受控桩＋Icon* 代理＋Toast）全绿（DshMenu 用例改 items 断言）；`probe-menu` 8/8；**真宿主件本地集成实测**（asar 提取整包 primitives＋依赖桩、esbuild 打包浏览器跑）：菜单开→四行（图标/危险/禁用）→选中勾→点选关菜单→Toast「已选 b」现身，全程零错；全真渲染 13 行 over 全 0。
- **复验首轮追加（10-15 他问「新建库时也没有提示」）**：核实＝**建库从来无成功提示**（旧代码与工作台同款：成功＝自动切库；只有失败有提示）——非本轮回归；按他点名**加「知识库已创建」成功 toast**（有意加成，登记）。顺带加固：`ToasterHost` 锚点改传 ref（渲染时取当前值，免首帧 null 致窗口居中）；冒烟补「总线→宿主 Toast」用例（`showToast`＋`ToasterHost` 暴露）。
- **复验首轮抓「⋯ 未靠右」**：宿主路径包裹层类名更替（`hrag-mm-wrap`→`span.hrag-mmhost`），旧对齐选择器失配——修＝补 `.hrag-bar > .hrag-mmhost + .hrag-mmhost { margin-left: auto; }`（回退选择器一并保留）。
- **复验二轮修（10-15 他贴图两处）**：①**思考跟随菜单**——勾选盒移进角色格内（`position:absolute`＋角色格 `padding-left:28px`＝勾文距恒 12px；独立勾选列在 subgrid 下首轨间距不可控，浏览器实测钉死）；网格只留两列（角色｜该槽当前模型、subgrid 共享列对齐）、列距 12、行高＝宿主 item 34。②**重建索引卡补「目标知识库」选择框逻辑**（照工作台 `ReindexDialog` 实读）：选库（占位「选择知识库」）→ 确认弹窗 → 重建**所选库**；状态行跟随所选库（3s 轮询/202 后立即＋1s 双补拍）；未选库按钮禁用；host 半零改动，**壳半重建机制退役**（状态/轮询/确认/弹窗全收进设置面；shell 只传 `kbs`）。与图2 逐项对位：卡头/目标知识库行/右下按钮。
- **一轮复验（过，10-15 他复「过了」）**：菜单逐项（顶栏 ⋯ 八项＋库下拉勾选态＋设置面五处 picker 开合与等宽＋维度/ASR 候选＋思考菜单开合勾选）＋图标逐枚对照＋提示位（建库/重命名/上传拒项 Toast 出位与消退；错误 8s）——全过；复验中途三轮修补（⋯ 靠右回归／思考菜单间距调参／重建卡选择框逻辑＋头部保存按钮＋重建卡置底）一并收官。

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

- [x] **判同**：上传前置（菜单/拖拽/选择器三入口同链）——先查同名（基名精确＋后缀大小写不敏感），命中才算 SHA-256（`crypto.subtle`）比文档清单 `content_hash`（清单带该字段，已实查）：同哈希＝identical（默认跳过／可留副本）、哈希不同或无哈希＝conflict（替换／并存）、无同名＝clean。判同数据＝当前库文档清单（取数方式落码时定：上传时惰取 `listDocuments` 或共享缓存）。
- [x] **弹层**：三动作选择照工作台（跳过／替换／并存；identical 另可留副本），多个重复**排队逐个决定**；文案照工作台 `duplicateUpload` 逐字移植。
- [x] **流程**：替换＝**先删后传**（顺序冻结——防后置级联冲掉新上传的派生状态）；并存＝自动改名 `name (2).ext`（已存在则递增）。
- [x] **门禁＋真跑**：冒烟（判同纯函数用例：同名同哈希／同名异哈希／无同名／无哈希）；真跑——同文件再传→弹层（默认跳过）；改内容同名→替换（列表只留新件）／并存（出现 `(2)`）。

**实测**（Task 8，2026-10-14；**全交付·真跑过**）：

- **落码**：纯函数照工作台 `duplicate-check` 逐条移植——`dupBaseName`／`dupSuffix`（后缀大小写不敏感、dotfile 无后缀）／`dupFindByName`（基名精确＋后缀不敏感）／`dupVerdict`（同哈希＝identical；异哈希或旧行无哈希＝conflict）／`dupNextCopyName`（`name (2).ext` 递增）／`dupComputeSha256`（WebCrypto hex）。弹层件 `DuplicateUploadDialog`（identical＝［仍上传副本／跳过上传］；conflict＝［取消／保留两份／替换旧文档］；Esc／点遮罩＝cancel；文案照工作台逐字）。壳接线＝`handleUpload` 重写为 `processFile` 链：逐文件 hash → 对当前库清单判同 → 命中弹层等决定 → 执行；**换入点＝上传链前置**（菜单/拖拽/选择器三入口同链）；替换＝**先删后传**（`deleteDocument` 成功才传，本地清单同步剔除）；并存＝`new File([file], copyName)` 改名上传（`seenNames` 含本批已分配副本）；去向提示走 barNotice（已跳过／已作为副本上传／已替换旧文档，照工作台语义）；**降级**＝清单取数失败或 WebCrypto 不可用（非安全上下文）→ 直传不拦；全跳过不出「0 已提交」汇总。
- **自检**：`node --check` 过；冒烟**全绿**（新增 Task 8 用例 10 断言：精确/大小写/后缀边界/末点 stem/三态判定/无哈希 conflict/副本递增/内点 stem）。host 半零改动（`deleteDocument` 已有）⇒ 探针不扩。
- **真跑（过，10-14 他复「测试过了」）**：①同文件再传 → 弹层「内容完全一致」→ 默认「跳过上传」→「已跳过重复文件」✓；②同名改内容 → 弹层「同名文件已存在」→「保留两份」出现 `name (2).ext`／「替换旧文档」列表只留新件 ✓；③菜单与拖拽两入口同链 ✓。

---

## 提交链（滚动记实，本对）

- [x] Task 1 三笔（10-14）：`7b5c73c` host 六 op／`884b422` client（顶栏重做＋设置面批 1＋三迭代）／`03da3ee` docs（Task 0/1 实测＋A 组终裁）。**全部未推**（仓暂无 remote）。
- [x] Task 5 三笔（10-14）：`a72df3c` host（`downloadDocument` raw 中继）／`7652aad` client（建库弹层·下载·白名单前置·上次库记忆＋`upload.rejected` 裸参修复）／`3e95f9a` docs（Task 5 实测收官＋Task 6/7 立项＋§6 三行裁定登记）。**全部未推**（仓暂无 remote）。
- [x] Task 7 两笔（10-14）：`c86a852` client（面板内拖拽：拦截/吞掉提示/目录拒/遮罩收尾）／`9e8786e` docs（Task 7 实测收官＋Task 8 立项＋§6 A② 改裁）。**全部未推**（仓暂无 remote）。
- [x] Task 2 三笔（10-14）：`5fb0629` host（`ragConfigPut`＋四探针 op）／`93b9ecc` client（设置面批 2 全量＋形态改判〔面板内大弹窗〕＋三案修复〔白屏护栏/flex 压扁/弹窗自锚〕）／`01d0de2` docs（Task 2 实测收官＋形态两轮改判记录）。**全部未推**（仓暂无 remote）。
- [x] Task 8 两笔（10-14）：`71e8fbe` client（判同三件＋弹层＋上传链前置接线）／`7112e1b` docs（Task 8 实测收官）。**全部未推**（仓暂无 remote）。
- [x] Task 3 三笔（10-14）：`e80601f` host（`probeAsr`＋`listModelsConfig` op）／`9b351fb` client（多模态组可编辑＋设置面全量下拉统一＋表现层六轮及三续修复）／`609a9cb` docs（Task 3 实测收官）。**全部未推**（仓暂无 remote）。
- [x] Task 4 两笔（10-15）：`091984c` client（解析段＋裁判/抽取段＋只读机制退役＋分组归位＋头部去线〔续④随携〕）／`dda65b8` docs（实测收官＋收口对照＋§6 登记两行）。**全部未推**（仓暂无 remote）。
- [x] Task 6 两笔（10-15）：`47d4d71` client（菜单/图标/Toast 换宿主件＋思考菜单＋重建卡选择框＋头部保存钮/无框 ✕＋卡置底）／`3e2dbab` docs（Task 6 实测＋三轮复验修补）**＋本 sync 笔**。**全部未推**（仓暂无 remote）。
