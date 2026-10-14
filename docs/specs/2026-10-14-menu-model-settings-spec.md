# 面板 ⋯ 菜单与功能模型设置 —— spec

**Status:** 🟢 已裁（2026-10-14 四拍：①结构照拟稿、「刷新」改「刷新界面」、每项带图标／②皮肤＝DSH 真值 Menu／③设置面＝照工作台全量（拆批）／④立新对）；**执行中**——Task 0–1 已落地（三笔 `7b5c73c`／`884b422`／`03da3ee`；Task 1 真跑已过，含三轮表现层迭代）；**Task 5／7／2／8 已收官**（真跑过）；**Task 3 已收官**（真跑过，10-14；含表现层六轮＋三续）；**Task 4 已收官**（真跑过，10-15）；**Task 6 落码完毕**（换件＋思考菜单；一轮复验待整重启）。
**来源:** 10-13 他令——「选择库的右侧加上 deepseekharness 中同款的三点菜单：工作台库级菜单项落脚＋功能模型设置并入；行内『刷新/上传文档/重建索引』移入菜单（重建索引落入功能模型设置界面中）」。承接：T3 plan「RAG 前端全域覆盖审计」A 组裁定行＋步骤记录「模型面归属与分项目治理」条（待排→转正）。
**配套 plan:** [../plans/2026-10-14-menu-model-settings-plan.md](../plans/2026-10-14-menu-model-settings-plan.md)（同批成对）。

## 1. 范围

两件事，一个形态来源：

1. **顶栏 ⋯ 菜单（IA 重构）**：面板顶栏由 `[库 select] [刷新] [上传] [重建索引]` 收敛为 `[裸粗体库名 ▾] [⋯]`（v2/v3 迭代后终态：库名＋DSH chevron 下拉、⋯ 裸钮靠右——见 M1 补记）；菜单条目与分段（照拟稿拍定）：

   ```
   上传文档                     ← 在飞时禁用＋「上传中…」（工作台同款）
   刷新界面
   ────────────
   更新百科                     ← 在飞时 spinner＋禁用
   重建百科                     ← 走共享确认弹窗
   ────────────
   重命名知识库                  ← 单字段弹层（照工作台）
   删除知识库                    ← 确认框（级联文案照工作台键）
   ────────────
   功能模型设置                  ← 打开设置面（重建索引入口落于其内）
   ```

2. **功能模型设置面（面板内）**：照工作台 `settings/functional-models-view`（1998 行）**全量**移植、拆批落地——功能模型（嵌入/稀疏/重排/抽取/裁判/多模态/解析/ASR）的查看与编辑、各探测（连通/维度/嵌入/ASR/稀疏）、重建索引入口、迁移状态。**重建索引不落菜单、落此面**（工作台同构）。

**形态来源（硬引用）**：菜单皮肤＝宿主真值（`Menu.module.css` 全参，见 §2 M2）；菜单图标＝宿主真值优先（web bundle `index-5SrrfWpU.js` 内含全图标库，Regular/Medium 两号；Task 0 提取原路径）。

## 2. 决定表（M1–M7）

### M1 —— 菜单结构与条目（**已拍：照拟稿**）
条目/分段见 §1.1。**「刷新」文案改「刷新界面」**；**每个按钮前都要有图标**。行内三钮退役：上传/刷新→菜单；重建索引→设置面（非菜单项）。
**10-14 表现层三迭代（他复跑点名，验收已过）**：①⋯ 去外框（裸图标钮、悬停淡底）＋**图标按路径级属性**（Ellipsis＝`fill` 实心点／Edit＝`fill`+`stroke`——原「全 stroke」致点空心）；②库选择去框（`<select>` 全退，裸粗体库名＋DSH chevron 触发；下拉＝DSH 真值菜单、选中行尾 DSH 勾）；③**六 tab 改「对话头」设计**（宿主机源码实读：文本 tab／inactive `label-tertiary`・active `state-business-primary`／`::after` 2px 圆角下划线 bottom −1px 压 0.5px `border-l3` 贯穿线／13px・500・line16／gap 36；偏差登记：窄档允许换行、容器左距归零对齐本地栏缘）。

### M2 —— 菜单皮肤（**已拍：DSH 真值 ⓑ**）
按宿主 `Menu.module.css` 真值（Task 8 已取证一次）：面板 padding 4 / min-width 144 / radius-lg / 半透明面 `--dsw-menu-surface-fill`＋`--dsw-menu-backdrop-filter` / `--dsw-elevation-prominent` 阴影 / **无边框**；行 min-height 34px / 13px 字・行高 20 / radius-md / 6px 8px 内边距 / gap 6；危险行 `--dsw-alias-state-error-primary`＋hover `--dsw-alias-interactive-bg-hover-danger`；分隔线 0.5px `--dsw-alias-border-l2`、margin 3px 2px；触发器＝ ⋯ **裸**图标钮（`IconEllipsisOutlineRegular` 原路径、路径级 `fill` 实心点；无外框、悬停淡底）。
**评测域现行两枚菜单维持现状**（Task 8 终态＝描边紧凑形，经他复看定稿；本次未点名统一——如需统一另议，见 §6 登记）。

### M3 —— 菜单图标（**已拍：宿主原生 ≻ 相同语言 ≻ 相关合适**）
缺件沿用工作台同款（lucide 线条款，Task 7 边箭头「DSH 无件⇒沿用工作台」先例）。拟表（Task 0 提取原路径后终核）：

| 条目 | 图标 | 来源 |
| --- | --- | --- |
| ⋯ 触发器 | `IconEllipsisOutlineRegular`（`fill` 实心点） | 宿主原生命中 |
| 上传文档 | lucide `Upload` | 宿主无上传件→工作台同款 |
| 刷新界面 | `IconRefreshOutlineRegular` | 宿主原生命中 |
| 更新百科 | lucide `BookOpen` | 宿主无书形件→工作台同款 |
| 重建百科 | lucide `RefreshCw` | 工作台同款（复看已过：维持本组合——与「刷新界面」异族两枚并存，§6 行销定） |
| 重命名知识库 | `IconEditOutlineRegular` | 宿主原生命中（工作台＝Pencil 同义） |
| 删除知识库 | `IconTrashOutlineRegular` | 宿主原生命中 |
| 功能模型设置 | `IconSettingsOutlineRegular` | 宿主原生命中 |

**原路径提取法**（Task 0/1 实证）：bundle 内 token 跨模块重名——须以「图标 map → **就近**基础组件」解析，全局首配会错作用域；path 属性逐条实读（见 M1 补记）。

### M4 —— 设置面范围与批次（**已拍：乙·全量拆批**）
| 批 | 内容 |
| --- | --- |
| 批 1（随 Task 1） | 设置面骨架（**面板内大弹窗**——宿主设置同款形态收进 RAG 面板空间；10-14 两轮改判：原「面板内 Sheet」作废，设置面＝弹窗、内容面＝抽屉，且遮罩只盖面板〔他定「弹窗只放在 rag 的界面中」〕）＋**读取展示**（`GET /api/rag/config` 全景，值直显；模型名解析与选择器归批 2）＋**重建索引入口**（含在飞态/状态行，复用既有 `reindex`/`reindexStatus` op）＋**迁移状态**（`GET …/migration`） |
| 批 2 | 默认模型组＋检索组：嵌入四问（env 徽章/覆盖警示/端点占位）＋维度（守卫＋探测点＋档位下拉）＋稀疏（源三选/外置四问/三守卫）＋重排＋高级区六项＋保存（`PUT …/config`）＋探测四枚（embedding/dimensions/connectivity/sparse）＋维度迁移弹层（`dimension-migration-dialog`） |
| 批 3 | 多模态组：caption（`isCaptionCapable` 口径；**无视觉提示＝与「（使用配置默认）」共用同一框**〔两态互斥）——简写「尚无视觉模型」/「No vision model」当该选项标签，不另起行；10-14 真跑勘误：取数源＝配置条目面 `listModelsConfig`，非解析目录面〕＋ASR（provider/本地引擎/模型菜单/探针阻塞保存/`probe-asr`）；**框内下拉（维度档位＋ASR 候选）＝工作台规格**：菜单等宽输入框（`anchor:'field'`）＋lucide `ChevronDown` size-4 opacity-50 触发器；**设置面全部下拉＝与 Model ID 同款选择器外观**（盒＋chevron＋菜单；选项与更新逻辑不变；10-14 他令两轮——先多模态两行、再默认模型/检索提供商/稀疏来源及提供商全数） |
| 批 4 | 抽取组＋评测组（judge）＋服务组（parse：MinerU provider/tier/version/language/base_url＋`qdrant_url`）＋收口 |

每批以工作台同段为逐句对照底本；文案键取工作台 `core/rag`＋设置视图现文案。

### M5 —— 数据缝（不变式）
面板仍不直连后端：新增 host op（薄透传）：`createKb`／`renameKb`／`deleteKb`／`ragConfigGet`／`ragConfigPut`／`ragMigration`／`probeEmbedding`／`probeDimensions`／`probeConnectivity`／`probeAsr`／`probeSparse`（模型目录两读面：`listModels`＝`GET /api/models` 解析目录〔默认模型选择源〕；`listModelsConfig`＝`GET /api/models/config` 配置条目〔caption 视觉筛选源，带 `supports_vision` 声明〕——10-14 真跑勘误补建）。凭证/基址仍只留 host 半。**deer-flow 零代码改动**。

### M6 —— 管理动作带闸
重命名＝单字段弹层；删除知识库＝确认框（**级联影响如实展示**，文案照工作台 `deleteKbConfirmTitle/Description`）；重建百科沿用既有共享确认弹窗——五闸口径不因移位而变。

### M7 —— 甲档小件并入（**10-14 裁：并入本对**）
承 A 组审计终裁——**甲档**（①建库入口／③文档下载／⑩上传白名单前置拦截＋上次打开库记忆）并入本对（Task 5，与菜单同面）；**乙档**照建议登记（§6，不执行）。建库入口拟定落库下拉底部「＋ 新建知识库」；**文档下载需 host 补 raw GET 透传**（照上传的 raw 通道）。

## 3. 落点

- `client.js`：顶栏段（按钮退役＋⋯ 菜单件）＋设置面（新段）：四批分段落 `hrag-set-*` 命名族；菜单件按 M2 参数实现（**已抽 `DshMenu` 通用件**）。
- `src/kb_proxy.ts`：新 op 表（M5 清单；每 op 一函数、守卫造句照既有惯例）。
- **无后端改动**——全部走既有 REST/BFF 面。

## 4. 验收

1. **菜单逐项**（真栈他手点）：上传（在飞禁用+文案）／刷新界面／更新百科（spinner+禁用）／重建百科（确认弹窗）／重命名（弹层+顶栏/store 名同步）／删除库（确认框→列表移除、选中回退）／功能模型设置（开面）；图标与皮肤与宿主真值核对（Task 0 提取的路径/参数逐条对；含 10-14 三迭代终态——裸钮/实心点/对话头 tab＋贯穿线）。
2. **设置面批 1**：读取展示与工作台同库同值对照；重建索引入口行为（在飞态 3s/状态行/提交双补拍）与原顶栏钮逐项一致；迁移状态文案对照。
3. **探针**：`probe-menu`（仓外）——新 op 的 method/path/body/守卫逐项（create/rename/delete/ragConfig/migration/models **已过 5/5**；probes 随批 2 扩）；桥契约照实断言。
4. **门禁**：`node --check`＋冒烟回归＋桌面端整重启真跑（模块代体检法）。

## 5. 影响面

- 顶栏形态变化＝面板首行控件重排（`[裸库名 ▾][⋯]`）＋**六 tab 行改对话头设计**；上传/刷新/重建索引的入口位移＝**本对验收面**。
- 评测域菜单皮肤维持现状（M2 注）；若他日要统一，登记 §6。
- 与 T3「覆盖审计」其余未落候选（建库入口/重复上传/下载/邮件出题等）**互不并入**——那些仍待逐条裁（审计节）。

## 6. 缺口登记（优化另案）

| 项 | 说明 | 出口 |
| --- | --- | --- |
| 评测域菜单皮肤统一 | 本对新菜单＝DSH 真值；评测域两枚＝描边紧凑（Task 8 定稿） | 若要求统一，另议 |
| 「重建百科 vs 刷新界面」图标撞形 | 两枚 refresh 系图标并存 | **已随 Task 1 视觉验收维持**（销定） |
| 重复上传拦截（A②） | hash 判同＋两选/三选弹层（替换＝先删后传） | **已裁（10-14）：并入本对 Task 8（Task 2 之后）**——照工作台 `duplicate-check`／`duplicate-upload-flow`／`duplicate-upload-dialog` 三件移植；后端 `content_hash` 已实查在案（清单字段） |
| 文档右键快捷出题（A④） | 文档行 → 合成 count=1 | 另案（同上） |
| 文件类型图标体系（A⑪） | Ardot 9 类 56-grid 重导（权威在库外） | 另案（同上） |
| 切片刻度轨（A⑫） | Kimi 式导航（门槛≥5/间距 26 参数现成） | 另案/后调（同上） |
| docErrors 错误分类文案（A⑤） | 分类映射表移植 | 后调（同上） |
| tab 行溢出降级（A⑦） | 遮罩下拉；现状＝窄档换行缓解 | 后调（归 D6 窄档清单） |
| 库列表排序拖拽 | 拖拽重排（上次打开记忆已并入 Task 5） | 后调（同上） |
| 面板拖拽上传（宿主全局手势冲突） | 宿主 `ui-attachment`＝**document 级**监听＋全窗 DropOverlay（`pointer-events:none` 纯装饰层），拖拽入窗＝对话附件为应用级设计；工作台有拖拽上传（`document-panel`）⇒ 一致缺口 | **已裁（10-14）：做面板内拖拽上传（plan Task 7）**——遮罩原样不动、范围仅面板内容区、其余区域维持宿主默认；接不了＝吞掉＋就地提示（**C 口径，不回落会话**）；目录拒 |
| 行内提示位（顶栏下、占流抖动） | T3 A4「观感差记」的升级诉求；宿主 `Toast` 原件可 require（`primitives` 基线：portal／top 40px 居中／深色面双主题／3s 渐隐／可 `anchor` 锚面板顶栏） | **已裁（10-14）：换宿主 `Toast`，并入 Task 6 统一换件轮**（共享同一次复验） |
| 宿主原件直用候选（`primitives` 282 导出） | `Menu`／`MenuSurface`／`MenuGroup`／`Tooltip`／`Input`／`Button`＋全图标集均在 `@deepseek-ai/dsh-client-ui-primitives`（`PLATFORM_MODULES` 静态基线 ⇒ 插件可 require；旗舰样板同款 require）；现菜单/图标＝按真值复刻（M2/M3 口径） | **已实施（10-15，Task 6 落码）**：`DshMenu`→宿主 `Menu` 适配器（8 调用点迁 items/children）、图标八族直用 `Icon*`、行内提示→`Toast` 总线；评测域两枚冻结；宿主无件者维持 M3；一轮复验待整重启 |
| 宿主件采纳候选·有用未用（10-14 对账） | **换皮级**：`Button`（≈`.hrag-btn` 136 引用）／`Input`（手写 19 处）／`Checkbox`／`Tag`·`Pill`·`StateDot`（自绘芯片/状态）／`DisclosureRow`；**行为级**：`Tooltip`（≈80 处原生 `title=`）／`Modal`·`RiskConfirmation`（自绘对话框与确认闸）／`MarkdownText`（切片正文现纯文本 pre-wrap——T3 观感缺口）／`FileTypeIcon`＋`classifyFileType`（＝A⑪ 另案本体）／`ImageLightbox`·`CodeBlock`·`JsonTree`（无渲染）；**小件**：`relativeTime`·`fileSizeText`·`writeClipboard`·`HoverCard`·`SegmentedControl`·`Switch` | 待裁：换皮级可并入收口轮；行为级单项裁；设置面控件批 2–4 自然直用 |
| 思考跟随菜单（工作台 default 组） | 五槽位（extract/wiki/judge/synthesis/vlm）勾「跟随对话思考」的下拉菜单；我方表单值已全程携带（`RAG_THINKING_FIELDS`＝播种/保存/变更检测全通） | **已裁（10-15）：做——并入 Task 6 同轮**；**已落码并随换件重对**（宿主 Menu 承载；常开不关、subgrid 两列对齐、勾选即写） |
| 重建索引组形态 | 工作台设置页＝选库＋重建（全局页需要选库）；我方＝面板内直接重建当前库（无选库行） | **有意差异（面板上下文）**——随 Task 1 定稿，收口复核维持 |

## 7. 非目标

- **对话主模型**不在此面（各自宿主治理：DSH 对话用 DSH 配置）。
- 模型目录的**增删编辑**（若目录端点只读则维持只读；编辑归模型配置既有面）。
- 菜单条目次序的进一步微调、设置面批 2–4 的段内细节——前者 Task 1 复看，后者归各批。
