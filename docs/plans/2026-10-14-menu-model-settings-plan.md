# 面板 ⋯ 菜单与功能模型设置 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-10-14-menu-model-settings-spec.md](../specs/2026-10-14-menu-model-settings-spec.md)（M1–M6 决定＋落点＋验收）
**Status:** 未开工；编码起于 Task 1（Task 0 为只读核实）。
**Parent:** T3 plan（[2026-10-12-t3-panel-plan.md](2026-10-12-t3-panel-plan.md)）「RAG 前端全域覆盖审计」A 组裁定行；步骤记录：[2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md)（「模型面归属」条转正）。

**Architecture:** 两件事——**① 顶栏 ⋯ 菜单**（`client.js` 顶栏段：`[库 select][⋯]`；菜单件按宿主 `Menu.module.css` 真值参数实现，图标取宿主 `index-5SrrfWpU.js` 原路径、缺件沿用工作台同款；行内「刷新/上传/重建索引」退役——重建索引落设置面）；**② 功能模型设置面**（面板内 Sheet；照工作台 `functional-models-view` 全量、四批落地：读取展示/重建索引入口/迁移状态 → 嵌入段 → 多模态段 → 解析/裁判/抽取段）。**数据缝不变**：host 半 `kb_proxy.ts` 薄代理补 op（createKb/renameKb/deleteKb/ragConfig 读写/migration/五探针/模型目录）；**deer-flow 零改动**。

**硬约束（spec 已裁，不许自行放松）**：
- **皮肤＝宿主真值**（M2）：Menu 面板/行/危险行/分隔线全参照实；触发器 `IconEllipsisOutlineRegular` 原路径。评测域两枚菜单**不改**。
- **图标三档**（M3）：宿主原生 ≻ 工作台同款 ≻ 相关合适；原路径从 web bundle 提取、逐条留证（不得手绘近似）。
- **重建索引落设置面**（M1/M4）：不进菜单；设置面批 1 交付前不裁撤原行内钮——**同一 Task 内完成位移**（Task 1 含批 1，无「入口悬空」窗口）。
- **数据缝（承 T3）**：面板不直连后端；新 op 一函数一动作、守卫造句照既有惯例；**缺路由停下待裁**。
- **先一致后另案（承 T3）**：设置面逐段以工作台为底本；形态创新一律登记。
- **桌面端铁律**：改 `client.js` 验收须整重启（模块代体检法）。

**Global Constraints:**
- 分支：插件仓（dsh-harness-rag）；每 Task 落地随手提交（英文 Conventional；deer-flow 零代码）。
- **每 Task 的 `**实测**` 行必须回填**（探针输出/真跑结论/提交哈希）。
- **插件侧验证**（同 T3 口径，有意不做单测）：host 半编译探针（仓外一次性）＋冒烟回归＋桌面端整重启真跑。
- **scope fence（本对不做）**：对话主模型治理 · 模型目录增删编辑 · 评测域菜单皮肤统一（§6 登记）· 菜单次序微调（Task 1 复看）· **A 组审计乙档**（②重复上传/④右键出题/⑤docErrors/⑦tab 溢出/⑪类型图标/⑫刻度轨/库排序拖拽——10-14 裁决「照建议登记」→ spec §6，不执行）。

**依赖顺序**：Task 0（只读核实）→ Task 1（菜单重构＋设置面批 1＝骨架/读取/重建索引/迁移）→ **Task 5（甲档小件批，10-14 并入）** → Task 2（嵌入段）→ Task 3（多模态段）→ Task 4（解析/裁判/抽取段＋收口）。Task 1 单独立验（菜单可先上真栈）；Task 5 与菜单同面、紧随 Task 1 验后即可做。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点＋ §2 M2/M3/M5。

- [x] ①**设置视图逐段清单**（10-14）：**七组实读**——①默认模型（`defaultModel`：MODEL_REFERENCE_NONE/modelReferenceOptions 引用选择）②检索（`groupRetrieval`：嵌入四问〔provider/model/apiKey（SecretInput：env 徽章＋覆盖警示）/endpoint（占位符族）〕＋维度〔默认 1024、`changesEmbeddingDimension` 守卫、探测点＋档位下拉〕＋稀疏〔源三选 provider/external/bm25、外置四问、三守卫、`sparseServiceVerdictFor`〕＋重排 provider＋高级区 6 项）③抽取（`extractModel`）④评测（`judgeModel`）⑤多模态（caption〔`isCaptionCapable`〕＋ASR〔provider/本地引擎/模型菜单/`asrProbeBlocksSave` 阻塞/`probe-asr`〕）⑥服务（parse：provider/tier/version/language/base_url＋`qdrant_url`）⑦重建索引（在飞/状态行＋迁移行〔`useRagMigrationStatus`/`isMigrationRunning`；宽度迁移跨保存存活〕）。伴随件＝`dimension-migration-dialog`（批 2 维度变更弹层）/`reindex-dialog`（既有确认弹窗已等价，对照可选）；**非目标面**＝models-settings-page＋models-add/edit-dialog＋model-capability-editor（模型目录增删编辑，spec §7）。**四批分单落定**（批 2＝默认模型＋检索组＋探测四枚＋维度迁移弹层；批 3＝多模态组；批 4＝抽取＋评测＋服务组）；
- [x] ②**图标真值提取**（10-14）：从 `index-5SrrfWpU.js` 提取六枚 Regular 号原路径（Ellipsis 3 路径／Refresh 2／Edit 2／Trash 5／Settings 2／Plus 2）——证据 `hrag-probe/dsh-icons-extract.json`；结构真值＝`svg(16 视窗,fill=none,strokeWidth 1)`＋path `stroke=currentColor`（与 Task 8 chevron/check 配方同源）；缺件确认：无上传件、无书形件（→ 工作台同款档）；
- [x] ③**host op 映射表**（10-14）：KB CRUD＝`/api/knowledge-bases`（POST）＋`/{id}`（PATCH/DELETE，Task 1 逐条核 verb）；rag 配置＝`/api/rag/config`（GET/PUT）＋`/config/migration`＋探针五枚（embedding/dimensions/connectivity/asr/sparse）；模型目录＝`GET /api/models`（只读面）——新增 op 定名照 spec M5；
- [x] ④**菜单件改造差异清单**（10-14）：现行 `EvalMenu`＝描边紧凑形（Task 8 回退定稿）；目标＝DSH 真值参数（padding4/min-w144/radius-lg/半透明面＋backdrop/prominent 无边框；行 34px/13px/6·8/gap6；危险双色；分隔 0.5px l2）——**新抽 `DshMenu` 通用件供顶栏**，评测域两枚**零改动**（隔离＝互不复用触发器样式）。

**实测**（Task 0，2026-10-14，全四格）：

- ①见上（七组清单＋四批分单）；②图标六枚原路径（证据 `hrag-probe/dsh-icons-extract.json`；缺件＝上传/书形→工作台同款档）；③端点面（KB CRUD `/api/knowledge-bases`＋`/{id}`；rag 配置 GET/PUT＋migration＋探针五枚；模型目录 `GET /api/models`——**Task 1 op 集含 `listModels` 读面**，批 1 展示用其解析模型名）；④`DshMenu` 新抽、评测域零改动。
- 阅读范围：`functional-models-view` 1998＋`config-form` 885＋`api/hooks/types/migration` ≈3.6k 行，段/字段/守卫/文案键已录（见①）；bundle 探测＝`dsh-web-frontend/dist/assets/index-5SrrfWpU.js`（图标 map→基础组件→path 三段解析）。

---

## Task 1 — 菜单重构＋设置面批 1（骨架/读取/重建索引/迁移）

> 动到的文件：`client.js`（顶栏段＋设置面骨架）＋`src/kb_proxy.ts`（新 op）。
> **验收对应**：spec §4.1＋§4.2＋§2 M1–M4 批 1。

- [x] **菜单件**：按 M2 参数落 `hrag` 命名族菜单（`DshMenu`/`DshMenuItem`：无边框半透明面＋prominent、34px 行/13px/6·8/危险双色/0.5px 分隔；fixed 测位同 EvalMenu 配方）；`[select][⋯]` 顶栏（`hrag-btn-outline hrag-btn-icon` 32×32 触发器＋宿主 Ellipsis 原路径）；八项条目＋三段分隔＋图标（M3 表：宿主原生五枚＋工作台同款三枚，原路径入库）；
- [x] **行内三钮退役**：刷新/上传→菜单（上传在飞禁用＋「上传中…」）；**重建索引→设置面批 1**（同 Task 内闭环，顶栏钮与状态行同步移入）；「刷新」文案＝「刷新界面」；
- [x] **管理闸**：重命名知识库＝单字段弹层（Enter/Esc/遮罩，顶栏 store 同步 +「已重命名」提示）；删除知识库＝确认框（工作台级联文案逐字；删后选中回退首个/空态）；
- [x] **设置面批 1**：`ModelSettingsPanel` Sheet 骨架（抽屉件同款）＋七组只读主行（27 字段标签照工作台逐字）＋重建索引入口（在飞禁用＋状态行同源）＋迁移状态行（running/succeeded/failed，`ragMigration` 在飞 3s 轮询）；
- [x] **host 半**：`createKb`/`renameKb`/`deleteKb`/`ragConfigGet`/`ragMigration`/`listModels`（守卫：createKb/renameKb 的 name 非空 400 不触后端；`node` 直载过）；
- [x] **探针**：`probe-menu.mjs`（仓外，mock 后端）**5/5 PASS**——createKb（trim/缺省描述/守卫）、renameKb（PATCH/trim/守卫）、deleteKb（204 中继＋404 透传）、三 GET 透传、死后端 502；
- [ ] **真跑**：整重启桌面端——菜单八项逐项（含删除库走一遍）；设置面读取与工作台同库对照；重建索引入口行为一致。

**实测**（Task 1，2026-10-14；编码＋探针＋冒烟就绪，**真跑待整重启**）：

- **落码**：host 半六 op（见上）；client 半＝`DshMenu`/`DshMenuItem`（DSH 真值菜单）＋顶栏 `[select][⋯]`（刷新/上传退役入菜单、重建索引移入设置面）＋重命名弹层/删除确认/壳级重建确认＋`ModelSettingsPanel`（批 1 只读七组＋重建索引入口＋迁移行）＋WikiView 指令线（菜单切百科＋nonce 发令＋在飞态上报 `wikiBusy`）。图标＝宿主原路径五枚（Ellipsis/Refresh/Edit/Trash/Settings，Task 0 提取）＋lucide 同款三枚（Upload/BookOpen/RefreshCw）；菜单件与评测域 `EvalMenu` 互不复用（spec M2 注钉）。
- **自检**：`node --check` 过；`kb_proxy.ts` node 直载过；冒烟**全绿**（新增 DshMenu 触发＋设置面批 1 夹具渲染两项：组题/行标值/空值「—」/迁移行/重建状态行）；字典键审计（menu/set/renameKb/deleteKb 族 18 键＋27 字段键）零缺零余。
- **真跑（待）**：整重启桌面端——菜单八项逐项（上传在飞禁用、刷新界面、更新百科 spinner+禁用+切百科、重建百科确认闸、重命名、删除库走一遍、设置面开面）；设置面读取与工作台同库对照；重建索引入口行为（在飞态/状态行/提交双补拍）与原顶栏钮一致。
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

- [ ] **建库入口**：库下拉（DshMenu）底部「＋ 新建知识库」项 → 名称+描述弹层（照工作台 `createKB` 对话框：两字段、名称非空才可创建）→ `createKb`（op 已有）→ 建成后即时选中；
- [ ] **文档下载**：文档行加「下载」动作 → host 补 `downloadDocument` **raw GET 透传**（字节流，照上传的 raw 通道；文件名取响应头/文档名）；
- [ ] **上传白名单前置拦截**：选择文件时本地分区（`supportedSuffixes` 现取）——被拒项先行提示、仅合规项入队（照工作台 `partitionFilesBySuffix` 语义）；
- [ ] **上次打开库记忆**：`localStorage` 记所选 kbId；载入优先选它（失效回退首个）；
- [ ] **探针＋真跑**：`probe-menu` 扩（下载 raw）；下载一枚／建库一枚／拒档一枚／记忆复开。

**实测**（Task 5，执行后回填）：

---

## 提交链（滚动记实，本对）

- [ ] 待 Task 1 起逐笔记（host／client／docs 三笔式；英文 conventional）。
