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
- **scope fence（本对不做）**：对话主模型治理 · 模型目录增删编辑 · 评测域菜单皮肤统一（§6 登记）· 菜单次序微调（Task 1 复看）· A 组审计其余未落候选（各留待裁）。

**依赖顺序**：Task 0（只读核实）→ Task 1（菜单重构＋设置面批 1＝骨架/读取/重建索引/迁移）→ Task 2（嵌入段）→ Task 3（多模态段）→ Task 4（解析/裁判/抽取段＋收口）。Task 1 单独立验（菜单可先上真栈）。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（核实记录回填本节）。
> **验收对应**：spec §3 落点＋ §2 M2/M3/M5。

- [ ] ①**设置视图逐段清单**：读工作台 `settings/functional-models-view.tsx`（1998 行）＋`core/rag/{config-form,api,hooks,types,migration-status}`（≈3.6k 行）——段/字段/默认值/守卫（维度变更、稀疏未配、ASR 探针阻塞）/文案键，落成四批的工作分单；
- [ ] ②**图标真值提取**：从 `dsh-web-frontend/dist/assets/index-5SrrfWpU.js` 提取菜单所需 Regular 号原路径（Ellipsis/Refresh/Edit/Trash/Settings/Plus…）＋viewBox/stroke 真值；缺件确认（上传/书形无原生）；
- [ ] ③**host op 映射表**：既有 41 op 对齐；新增清单定名（createKb/renameKb/deleteKb/ragConfigGet/ragConfigPut/ragMigration/probe×5/models 目录——端点以工作台 `core/rag/api.ts`＋`core/models/hooks` 为准）；
- [ ] ④**菜单件改造差异清单**：现行 `EvalMenu`（描边紧凑形）→ DSH 真值参数的差异点；触发器与行的替换面；评测域不受影响的隔离方式。

**实测**（Task 0，执行后回填）：

---

## Task 1 — 菜单重构＋设置面批 1（骨架/读取/重建索引/迁移）

> 动到的文件：`client.js`（顶栏段＋设置面骨架）＋`src/kb_proxy.ts`（新 op）。
> **验收对应**：spec §4.1＋§4.2＋§2 M1–M4 批 1。

- [ ] **菜单件**：按 M2 参数落 `hrag` 命名族菜单（可抽通用件）；`[select][⋯]` 顶栏；八项条目＋三段分隔＋图标（M3 表）；
- [ ] **行内三钮退役**：刷新/上传→菜单；**重建索引→设置面批 1**（同 Task 内闭环）；上传在飞禁用＋「上传中…」；刷新＝「刷新界面」（行为＝原刷新：重载库/文档并放行子视图刷新）；
- [ ] **管理闸**：重命名知识库＝单字段弹层（顶栏/库选中态同步）；删除知识库＝确认框（级联文案照工作台键；删后选中回退到剩余首个/空态）；
- [ ] **设置面批 1**：Sheet 骨架＋`GET /api/rag/config` 全景只读展示＋重建索引入口（在飞态/状态行/提交双补拍＝现有行为平移）＋迁移状态（`…/migration`）；
- [ ] **host 半**：`createKb`/`renameKb`/`deleteKb`/`ragConfigGet`/`ragMigration`（＋模型目录读取若需）——守卫与错误规范化照既有惯例；
- [ ] **探针**：`probe-menu.mjs`（仓外）——新 op method/path/body/守卫/失败路径；桥契约照实断言；
- [ ] **真跑**：整重启桌面端——菜单八项逐项（含删除库走一遍）；设置面读取与工作台同库对照；重建索引入口行为一致。

**实测**（Task 1，执行后回填）：

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

## 提交链（滚动记实，本对）

- [ ] 待 Task 1 起逐笔记（host／client／docs 三笔式；英文 conventional）。
