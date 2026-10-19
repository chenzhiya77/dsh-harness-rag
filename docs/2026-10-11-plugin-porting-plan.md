# Harness RAG → DSH 插件线（dsh-harness-rag）· 步骤记录

- Status: T1 ✅ 收官（冒烟复验三条 10-11 实测全过）· T2 ✅ 收官（2026-10-12 真栈两半全过）· T3 ✅ 收官（10-15 真栈验收全过）· 菜单对 ✅ 收官（10-15，Task 0–8 全交付）· A 对 ✅ 收官（10-15，A 档余项六件全交付）· B–K 小件批 ✅ 收官（10-15 开跑，10-16 全交付：①档全量；D1–D3 已拍＝全甲；Task 0–8 全毕、八组真跑全过；代码九笔全落〔`9a36851`…`687c214`，含 spinner 插队 `864f15c`〕＋定稿一笔〔本提交〕；宿主遮罩定性＝甲〔潜伏层保留〕；销定已落＝T3 plan B–K 审计节补销＋E1③ 勘误〔注记早已落，`0007c03`〕）· T4 ✅ 收官（10-19：观察型 job——host `src/jobs.ts`＋kb_proxy 上传/重建两接线＋client 会话采集；`probe-t4` 6/6＋冒烟各 78 PASS＋`probe-menu` 13/13；真跑已过（10-19 他手验四格）；定稿提交 `af6bb38`）· T5 ✅ 实施完成＋真跑通过（10-19：子槽契约化＋命名空间四防；Task 0–4 全落；双语法＋冒烟双 78＋neuter 三针恰红；真跑已过（10-19 他手验）；定稿 `ef2d564`）· T6 ✅ 实施完成＋真跑通过（10-20：等价对照表＋原创 icon＋三检索真跑；Task 0–4 全落；双语法＋冒烟双 78；D5 四条全过；定稿笔为本笔）· 全部未推（仓暂无 remote）
- Date: 2026-10-11
- 形态（10-11 他拍）：**spec↔plan 一一配对**——`docs/specs/*-spec.md` 与 `docs/plans/*-plan.md` 同名成对（T2 对=`2026-10-11-equivalence-freeze-{spec,plan}.md`）；本档=全线路**步骤记录**（落 `docs/` 根），只记进度与决策，执行步骤进各配对 plan、不重复。
- 每步一个复选框；Status 随交付更新。

## 0. 定位与边界（已拍，不重开）

- 形态=**乙+丙′**：原生 dsh 插件（乙）+ 子槽契约化（丙′）。甲=MCP 桥不做；丙=TS 全重写不做（跨语言重写+评测全废，RAGAS/UMAP/torch 视频腿搬不动）。
- 拓扑=**最小 Python 服务**（现有 harness RAG 后端单进程，不带 nginx/前端/IM 全家桶）+ 独立新仓 TS 插件；**一个后端、两个前端**（DeerFlow 工作台原样保留，DSH 侧走 slot API 新写）（10-13 更新：引擎载体＝主体二 `harness-rag`，实况见 §8）。
- 首期=**现有能力等价移植**：三检索+续读骨架+管理面板+摄取+子槽声明+命名空间四防御，行为口径不动。**优化另案不进首期**（证据窗四细节 / 零配置降级链 / 中英桥）——基线先行才能归因。
- 两分账：移植基线=T2 开工日点名冻结清单；功能新增走跟进账增量移植。
- 定名 `dsh-harness-rag`（一名三用=包名/仓名/插件 id；npm 404 已核）。仓=`E:\app\python\agent\dsh-harness-rag`（独立 git，未提交）。
- 命名空间四防=工具名/槽名/设置 id/存储路径全命名空间化（防同名遮蔽与文件端口互抢）。

## 1. 进度总览

| Task | 内容 | 状态 |
| --- | --- | --- |
| T1 | 插件骨架（门面六件+安装冒烟） | ✅ 收官（三修+复验三条 10-11 全过） |
| T2 | 工具面等价移植（端点对齐+召回测试缝） | ✅ 收官（2026-10-12；两笔后端跟进笔＋Task 3–6＋真栈两半；含真栈咬出的 list_documents 形状修复） |
| T3 | 管理面板（功能面＝工作台知识库页全部：管理＋可视化） | ✅ 收官（2026-10-15 真栈验收全过：Task 0–12 全毕；一条龙他手点走完；10-12 冻清单 D1–D6，详见 T3 plan） |
| T4 | 摄取通道（`ctx.jobs`） | ✅ 收官（2026-10-19；[spec](specs/2026-10-19-t4-ingest-jobs-spec.md)＋[plan](plans/2026-10-19-t4-ingest-jobs-plan.md) 对；Task 0–4 全落；`probe-t4` 6/6＋冒烟双 78；真跑已过（10-19 他手验）） |
| T5 | 丙′ 子槽契约化+命名空间四防 | ✅ 实施完成＋真跑通过（2026-10-19；[spec](specs/2026-10-19-t5-slot-contract-spec.md)＋[plan](plans/2026-10-19-t5-slot-contract-plan.md) 对；Task 0–4 全落；双语法＋冒烟双 78＋neuter 三针恰红；真跑已过（10-19 他手验）；定稿 `ef2d564`（未推）） |
| T6 | 验收（等价移植对照表+文档+icon） | ✅ 实施完成＋真跑通过（10-20；[spec](specs/2026-10-19-t6-acceptance-spec.md)＋[plan](plans/2026-10-19-t6-acceptance-plan.md) 对；Task 0–4 全落；`docs/equivalence.md` 12 节 76 行；原创 icon 母题 A＋manifest；三检索真跑 D5 四条全过；双语法＋冒烟双 78；定稿笔为本笔） |

**待排（未编 T 号，2026-10-13 登记）**：
- **模型面归属与分项目治理**——T3 期间现场提出的题：设置→「模型」页（对话模型｜功能模型双视图）的归属重整——功能模型视图＋重建索引入口移入知识库详情 ⋯ 菜单为候选方案；对话主模型＝各自宿主治理（DSH 对话用 DSH 配置），功能模型（嵌入/重排/抽取/裁判/多模态）归 deer-flow 服务侧（现状切分的显式化）。**程序＝先占位，到位再立 spec/plan 对**。**10-13 他令动工（到位）**：面板顶栏加 DSH 同款 ⋯ 菜单——工作台库级菜单项落脚（更新/重建百科、重命名/删除库）＋**功能模型设置并入**＋顶栏「刷新/上传/重建索引」三钮移入菜单（**重建索引进一步落入功能模型设置界面中**，工作台同构）；host 半需补 `createKb`/重命名/删除库/`ragConfig`/模型目录 op。**10-14 四拍已定、已立对**：`docs/specs/2026-10-14-menu-model-settings-spec.md`＋`docs/plans/2026-10-14-menu-model-settings-plan.md`（结构照拟稿〔刷新→刷新界面、每项带图标〕／皮肤＝DSH 真值 Menu／设置面＝照工作台全量拆四批／新对；Task 0 只读核实起）。**10-15 收官（Task 0–8 全交付；A 组乙档余项另转 A 对，四方并至此收清）**。
- **B–K 余项 · ① 小件批**（2026-10-15 他圈「①全要，攒一批照 A 对规格立对」）：14 行（文档面搜索/排序/拖拽反馈＋空态/失败卡/六腿分解；切片面抽屉三件＋卡两件；召回面 wiki 锚定/变形小件/段控＋迷你图；百科面导航钮＋血缘注记）。**已立对、10-16 收官**：`docs/specs/2026-10-15-bk-smalls-spec.md`＋`docs/plans/2026-10-15-bk-smalls-plan.md`（八 Task＋Task 0 只读核实起；**D1–D3 已拍＝全甲**，10-15 他拍；Task 0–8 全过＋代码九笔＋定稿一笔全落）。②③档当时维持挂账（② 后于 10-16 转正——见下条）。
- **②档批（② 档五面 → 逐对立）**（2026-10-16 他令「都做」）：②档五面全开——列体系／视频镜头条＋播放器／渲染切换／切片编辑＋重抽／卡片管理面；按面拆三对逐对立（到位再立）：**甲＝文档列体系＋白名单兜底（已立：`docs/specs/2026-10-16-doc-columns-spec.md`＋`docs/plans/2026-10-16-doc-columns-plan.md`；10-16 拍定 D1＝甲／D2＝甲，Task 0 已毕〔五格全核〕，**Task 0–5 全落、全对收官（10-16）**〔实现＋门禁过＋10-16 他五轮复测/增补修订（截图对照＋复测两条＋第三令「按甲」批量版＋第四轮「表头选框对齐/工具栏·统计行同轴」＋第五轮「名称列收紧（复选列 32→24）/统计行 32px 贴底」——第五轮他评「过了」）；Task 4＝白名单兜底常量（冒烟 64＋neuter 恰红＋真跑过〔坏后缀拦截〕）；Task 5 收口（门禁终跑 64 绿＋T3 审计节补销 14 处〔已计划 7＋顺带核补 7〕；定稿一笔已落）；B3 统计行＋③档「行菜单双入口」「批量版」随令收编/转正入本对（Task 1/3.5/3.6）；D1 窄档口径改判=列宽自适应〕）**；乙＝切片面三件（渲染切换／视频镜头条＋播放器／切片编辑＋重抽）**已立对（10-16 他令「开②档乙对」）**：`docs/specs/2026-10-16-chunk-items-spec.md`＋`docs/plans/2026-10-16-chunk-items-plan.md`（**10-16 他令「按甲方案直接开跑」⇒ D1＝甲拍定；Task 0–5 全落〔Task 0 五格全核；Task 1 host 五 op 门禁 11/11＋真栈 5/5；Task 2–4 client 三件冒烟 69 PASS＋缺件二跑全绿；Task 5 收口：门禁/销定/真跑全过〕；真跑整批已过（10-18 他手验：渲染/原始、图片、真视频 seek、编辑/重抽）〕）、**丙＝卡片管理面已立 spec**（10-18 他令「立项『我的条目管理面』并写 spec」：`docs/specs/2026-10-18-my-entries-spec.md`；D1＝甲、D2＝甲（均 10-18 拍定）、plan：`docs/plans/2026-10-18-my-entries-plan.md`；**Task 0–5.5 全落**〔host 四 op＋probe 13/13；client 存储/CRUD/抽屉体系/阅读归属；冒烟默认＋缺件各 73 PASS；真栈 6/6（建/列/开关/编辑/取/删＋清理）＋检索生命周期 3/3（开→wiki 命中 rank 1／关→零命中）；生成条目批量条随令退役改右键两态；E3 条目编辑并入（双栏编辑＋两入口）；10-18 二轮真跑两修：右缘子菜单镜像翻转（DocContextMenu/DshMenu 共用）＋我的条目列表横向滚动条（border-box＋overflow-x hidden）；他问「生成条目是否紧凑」后行几何照工作台收口（40/14/8，两列表共用）＋生成条目 ⋯ 菜单补图标（EvalMenuItem 可选 icon，同右键图标源）＋两容器头部同轴对齐（22px 箭头槽/8px 右边距）＋收起箭头换工作台同款 lucide chevron（展开下/收起右；10-18 他对照设置页下拉）〕；Task 6 收口：自动项全绿＋10-18 他手验真跑全过（10-18 已提交））。③档已实施（10-18 他令「先盘点,都做了」：F 组零待办、G×5＋H×5 全落〔搜索/范围/工具栏三档＋⋯/索引提示/3D 平移/趋势 dataZoom/时长格式/历史右键/合成头部右键/相对时间〕，spec/plan `docs/specs/2026-10-18-tier3-polish-spec.md`＋`docs/plans/2026-10-18-tier3-polish-plan.md`；门禁双语法过＋冒烟各 77 PASS＋probe-menu 13/13；已定稿提交（2026-10-19）、真跑已过（10-19 他手验）；10-18 复测修订：投影下拉/胶囊/重算/图例对齐工作台、题库历史底条退役改右键、排序钮无边框、参考切片悬空改禁行图标、悬浮提示统一黑底白字暗泡、评测行选框改瞬态并垂直居中、模型设置去冗余保存行并统一表单纵距、召回选框收 16px、耗时胶囊逐字照主树 emerald/lime/orange（10% 底＋700/300 文字、暗色走宿主钩子）、召回空态补 flask 图标并垂直居中、六 tab 首行统一 44px 工具条＋搜索框统一 28px/左 8px 放大镜（文档宿主 Input 同参覆盖）、评测选框列收至内容宽、投影/图谱空态补图标并居中、搜索行按钮统一 28px（百科 ⋯ 22→28、段控外框 29→28）；行菜单双入口已随 10-16 复测转正、批量版已随 10-16 第三令「按甲」转正——均入甲），白名单兜底已收编入甲。

## 2. T1 已落清单（含冒烟三修）

落齐文件（`E:\app\python\agent\dsh-harness-rag`）：

| 文件 | 职责 |
| --- | --- |
| `package.json` | `dsh.bundle.patch` 清单 + `dsh.client` 块（`platform:web`/`immediately:true`/client 包面）+ `"./client"` 导出；peers 只剩 `@deepseek-ai/dsh-tools`+`cordis` |
| `cordis.patch.yml` | insert 行 + config 三键（backendUrl/apiToken/defaultKbId） |
| `src/index.ts` | Host 半：`inject:['tools']`，`registerTools` |
| `src/tools.ts` | 五工具壳 `hrag_*`（execute 已发真实请求，端点映射标 TODO(T2)） |
| `src/http.ts` | 透传单一出入口 `api()` + `HarnessRagError` |
| `src/settings.ts` | config 三键（bundle 配置直传） |
| `client.js` | 浏览器半：`__ModuleLoader__.load` 工厂（纯 JS），注册右栏 tab+locale |
| `locale/{en,zh}.json` | 显示元数据 meta.title/description |
| `README.md` | 双半形态图+如实标 skeleton 状态 |

冒烟三修（全部已落盘）：

1. **schemastery 导入**：砍运行时导入——加载器供给面铁律=运行时只许 `@deepseek-ai/dsh-tools`+`cordis`（`@deepseek-ai/schemastery` npm 有售 3.18.4，可作自家真依赖，留 T3 settings 表单）。
2. **跨世界注入**（`pending (waiting for service: slots)`）：单 entry 跨 Host/浏览器两世界注入永远等不到对方服务 ⇒ **双半拆分**（官方 `templates/decoration` 同款）。右栏 tab 契约=同 id 双注册（`sidebarRightTabs.register` + keyed 座 `sidebar.right.pane.tab`，key=定义 id，非 list id+order）；可达入口=右栏「+」→引导页胶囊→`openTab(kind)`。
3. **schema additionalProperties**（`JsonSchemaError`）：value-schema DSL 要求每个 `type:'object'` 节点显式 `additionalProperties: true|false` ⇒ output 补 `true`（透传开放对象，T2 收窄）。已用本地编译探针（拉 DSH schema 编译器源码+两桩包）验证五工具 spec 全量过、旧写法复现逐字同款错误。

铁律（模块代缓存）：`link:` 插件**改码后拨开关只重跑 apply、不换模块代**——改码必须整个关掉桌面端再启动；「改完没生效」先核报错行号与现文件对不对得上。

- [x] T1 门面六件+八件文件落齐
- [x] 冒烟三修（schemastery 导入 / 跨世界注入 / additionalProperties）
- [x] **冒烟复验三条**（10-11 桌面端实测全过）：①Plugins 页已安装区单卡「知识库」、无 pending/问题标记、显示元数据正常；②轨迹→事件详情→工具出现 `hrag_*` 五工具；③右栏「开始」引导页「知识库」胶囊→点开渲染占位面板

## 3. T2 工具面等价移植（✅ 收官 2026-10-12）

配对件：spec=`docs/specs/2026-10-11-equivalence-freeze-spec.md`（10-11 整批冻结：D1乙/D2乙/D3丙/D4三级序/D5甲/D6进）＋ plan=`docs/plans/2026-10-11-equivalence-freeze-plan.md`（Task 0–7 全勾）。

收官纪要：两笔 DeerFlow「只加不改」跟进笔（`8f118c64d` `b650e2496`）＋插件侧 Task 3–6（`acdac16` `e208807` `96f0481` 与 plan 各笔）；真栈验收两半全过（REST 逐项＋DSH 会话他实跑两轮），**真栈咬出并修复** `hrag_list_documents` 输出形状缺陷（`23a3b61` `b8eb29a`）；trace 待核项真机定论＝不带、不加后端。零区别判据见 plan Task 7 实测（单路＝缺省同题逐条相同＋同后端同 impl）。

## 4. T3 管理面板（✅ 收官 2026-10-15；10-12 冻结）

配对件：spec=`docs/specs/2026-10-12-t3-panel-spec.md`（10-12 整批冻结：D1 全做/D2 甲/D3 甲/D4 乙/D5 全保留/D6 延后）＋ plan=`docs/plans/2026-10-12-t3-panel-plan.md`（Task 0–12；轻面先行、重型后上；10-13 补面 Task 9 百科）。

- [x] 面板功能面＝工作台知识库页的全部（管理＋可视化）——**D5 全保留**（10-12 翻案：右栏可拖宽/分栏/全屏/浮动，空间可达；重型视图在 DSH 内新建）
- [x] settings 表单（10-14/15 随菜单对落——《功能模型设置》Sheet 四批；见菜单对 spec/plan）
- [x] 10-13 补面：百科视图（读＋管理档；原「不进面板」留档收编——A 裁定）——见 plan Task 9
- [x] T3 尾巴两对收官（10-15）：菜单对（[spec](specs/2026-10-14-menu-model-settings-spec.md)＋[plan](plans/2026-10-14-menu-model-settings-plan.md)；Task 0–8 全交付，含 A② 重复上传）＋ A 对（[spec](specs/2026-10-15-a-items-spec.md)＋[plan](plans/2026-10-15-a-items-plan.md)；A 组审计乙档余项六件——④右键出题/⑪类型图标/⑫刻度轨/⑤docErrors/⑦tab 溢出/库排序拖拽，真跑全过）；B–K 组余项维持登记

## 5. T4 摄取通道（✅ 收官 2026-10-19）

配对件：spec=`docs/specs/2026-10-19-t4-ingest-jobs-spec.md`（10-19 他令「都做」＝最小＋完整合一）＋ plan=`docs/plans/2026-10-19-t4-ingest-jobs-plan.md`（Task 0–4 全勾）。

落法＝**观察型 job**：后端照旧干摄取重活；host 半在上传（2xx 且响应为文档记录）与重建（`enqueued`）两处向 `ctx.jobs` 注册后台任务（kind `hrag-ingest`／`hrag-reindex`，label＝文件名/库名），3s 轮询既有 REST 面呈现进度（`queued`→阶段→`indexing N%`；`rebuilding N/M · K vectors`）与终态（`ready · N slices`／`failed · <腿>`／`rebuild succeeded|failed`）；名册停止＝停跟踪（结算 killed 注明服务端继续）；owner＝面板会话 id（采集自 `[data-sidebar-right-session]`，回退无主）；静默 `wait` 收走结算不打扰对话；原始 error 串零出口（沿 A⑤）。零后端改动、零新 op、面板自轮询零回归。

- [x] `ctx.jobs` 后台摄取接入（上传→解析→分块→嵌入的进度与失败呈现）

**真跑（2026-10-19 他手验，整重启 DSH 换 host 代后）**：①上传→`hrag-ingest` 行、终态 `ready · 1 slices`；②两击停止→`tracking stopped; the ingest continues on the server; cancelled by the user`，文档随后仍 ready；③重建→`hrag-reindex`、`rebuilding 5/10 · 9 vectors`→`rebuild succeeded`；④停网关 25s→`knowledge service unreachable`（24s），重启后面板恢复、worker 自动重排被中断文档。

## 6. T5 丙′ 子槽契约化+命名空间四防（✅ 实施完成 2026-10-19；真跑待验）

- [x] 子槽声明对外契约化：槽名/props/生命周期/**冲突语义**四层稳定承诺（冲突语义三层已核＋本包补两条：tab 类型 id 重复＝抛／kind 冲突超 builtin+extension 一对＝抛）
- [x] 命名空间四防落地核对（工具名/槽名/设置 id/存储路径）——唯一实修＝card-drawers 键入 `hrag-` 族＋一次性迁移

**立对（2026-10-19）**：[spec](specs/2026-10-19-t5-slot-contract-spec.md)＋[plan](plans/2026-10-19-t5-slot-contract-plan.md) 已成对（D1–D6 已拍＝全甲 10-19）。侦察结论：四防三件已命名空间化，唯一实修＝card-drawers 存储键族外（工作台逐字复制；他 leveldb 实查有真实抽屉数据 ⇒ 带一次性迁移）；README 五处陈旧（Status/形态/占位件/开发）同轮修正；四层承诺配冒烟「契约标识」断言块作机械保证。

**实施（2026-10-19，Task 0–4 全落）**：①`client.js`——`cardDrawersKey` → `hrag-card-drawers.<kbId>.v1`（旧串入 `legacyCardDrawersKey` 仅迁移读用）＋读路一次性迁移（新键缺＋旧键在 ⇒ 旧值原样写新键、删旧键、写失败保旧键下次重试；新键在 ⇒ 无视旧键；坏值 ⇒ 既有容错回退）；②`README.md`——新「子槽声明契约」节（四层承诺表＋命名空间四防清单）＋Status/形态/占位件/开发四处陈旧修正；③仓外冒烟——`sidebarRightTabs` 桩改捕获＋「T5 契约标识」8 断言（id/kind/guide id/NS/slot name/key/body locale）＋三键行为探＋`cardDrawersKey` 新串＋迁移三例＋旧键 fixtures 迁移；④门禁：`node --check client.js`＋全部 6 个 `src/*.ts` strip-types 过；冒烟默认 **78 PASS/0 FAIL**、`SMOKE_HOSTLESS=1` **78 PASS/0 FAIL**；neuter 三针（`SMOKE_SRC` 换件法）恰红——`kind` 坏→`tab kind`／`LAST_KB_KEY` 坏→`T5 contract: last-kb key`／迁移 `removeItem` 拆→`legacy key is removed after adoption`。RED→GREEN：Task 1 后旧键断言（1738）恰红，Task 3 迁断言后复绿。**真跑（2026-10-19 他手验，Task 4 清单）**：①迁移保真——基线＝旧键 3 抽屉（`1` target/emerald、`1` star/teal、`测试` star/emerald hidden）＋2 条归属；DSH 21:58 整启（client 半已新），面板重连后端后 **22:44:01** 新键写入（值**逐字节相同**：457 字符 JSON、UTF-16 跨 32KB 块记录重建核过）＋旧键删除记录落地；22:44:40 百科数据加载（entries＋manual cards 200）；他截图核「我的条目（3）」三枚抽屉 chip 名称/图标/色逐一吻合、选中抽屉空态正确；**22:55:20** 一笔 UI 写入（`测试` hidden 标记清除）落**新键**——写路同证。②README「子槽声明契约」节他核读**通过**。真跑期间 :8001 起 auth-off 实例（我起，跑完停）。定稿一笔已落（`ef2d564`，未推）；真跑回写一笔（本笔，未推）。

## 7. T6 验收（✅ 实施完成＋真跑通过）

- [x] 真 DSH 会话跑三检索工具（原甲档价值验证并入乙验收）
- [x] 等价移植对照表（harness RAG 现面 ↔ 插件面逐项）+ 文档
- [x] icon 原创（现缺=回退默认图）

**立对（2026-10-19）**：[spec](specs/2026-10-19-t6-acceptance-spec.md)＋[plan](plans/2026-10-19-t6-acceptance-plan.md) 成对；D1＝记录形对照表（四状态、不做带理由）／D2＝`docs/equivalence.md`＋README 指路／D3＝原创 SVG 母题 A「一路三检」／D4＝他手跑固定题面／D5＝四条判据（hybrid＝vector 基线、graph 实体证据非空、wiki 带 source_type、同库）／D6＝表→icon→真跑→收口。

**实施（2026-10-19，Task 0–2）**：①Task 0 侦察——icon 契约（manifest `icon`／`./icon`，缺失回退默认；官方 36×36 描边 SVG；行 40px／卡 48px）、工作台 56 件组件与插件面清点、三检索端点（recall-test `path=vector|graph|wiki`）；②Task 1——`docs/equivalence.md` 12 节 76 行、四状态（等价/精简/不做/宿主侧），9 处精简带差异说明、4 处不做带理由；README 指路＋`files` 收录；③Task 2——`icon.svg`（36×36，渐变源点＋三分支＋三绿端点，纯 XML）＋`package.json` `icon` 字段与 `files`；门禁（XML/JSON/files）过；Plugins 页「已安装插件」行实测显示新图。

**真跑（2026-10-20，Task 3–4）**：①auth-off :8001（`GET /api/threads` 405 证绕过），库 `t3-panel-acceptance`＝`9141e58dee8a4a08a32c5758395d720a`；基线三路 vector 3／graph 8 实体＋2 证据／wiki 3（manual 1＋wiki 2）。②他手跑新会话（`session-cde7ccda…`）按固定题面三调用（query／kb_id／top_k=3 逐字一致），后端日志 01:02:38／01:02:40／01:02:42 三条 recall-test 均 200，下游分别落 chunks＋rerank／entities／wiki_entries＋manual_cards。③判据：hybrid 三命中 `chunk_id`＋分数与基线全等；graph 8 实体与 2 证据逐名逐 id 全等＋1 条关系；wiki 3 条 source_type＝manual 1／wiki 2（wiki 带 `source_chunk_ids`）；三调用同库。缺陷登记：无；跑完已停 :8001。④门禁：`node --check client.js`＋6 个 `src/*.ts` strip-types 过；冒烟默认/hostless 各 **78 PASS/0 FAIL**；README Status 改 T2–T6、删 icon 占位句；spec/plan Status 同步。收口笔为本笔。

## 8. 环境与安装面（速查）

- 验收面=官方 **DeepSeek Harness Desktop 0.2.0-rc.2** @ `E:\appdevelop\deepseek`；本地路径安装已通（桌面按 `link:` 装进 `~/.dsh/profiles/desktop`，改码即生效但需整重启换模块代）。
- **安装两通道语义（2026-10-12 实测，踩坑记）**：`link:`＝链接，源目录改码在整重启后即生效（现用通道）；**`file:`＝拷贝**到 profile 的 `node_modules`——改源不随动，须 `dsh plugin --profile desktop remove <名>` 后再 `add` 刷新副本，否则装载器照旧件执行（症状：改完仍报旧文件错）。
- **插件装载触发**：host 半**不在 app 启动时装载**，由**启用开关/激活**触发；开关态持久化在 profile 层补丁（`disabled:false`）；apply 执行后可用 `process.execPath` 定位 DSH 安装目录、spawn 自带 Python（实测 3.12.14 可调）。
- **模块代体检法（10-12 二实证：T1 一次、T2 收官一次）**：报错/行为像旧码时，**先比对「进程 CreationDate vs 源码 mtime」＋报错里的工具描述文案 vs 现在源码**——对不上＝旧模块代在跑，整重启桌面端即可，别改代码。桌面端进程可用 `wmic process get CreationDate` 一对就明。
- profile `~/.dsh/profiles/desktop/pnpm-workspace.yaml` 已配 `allowBuilds`+fetch 旋钮（备份 `.bak-1011`；两闸=pnpm 并发下载中断+构建脚本许可）。
- 源码取证通道=`gh api`（DSH 默认分支 **master**；raw 直连不稳）。
- 本地 `pnpm install` 装不通 @deepseek-ai 依赖图是设计使然（`dsh-type-meta` 未公开、仅随 DSH 发行）；typecheck/冒烟须在 DSH profile 语境。
- **主体二（插件引擎仓，2026-10-13 已立；2026-10-20 裁剪＋接管）**：`E:\app\python\agent\harness-rag`。最小入口＝`backend/app/gateway/knowledge_app.py`（只挂知识三 router＋`/health`）@ `127.0.0.1:8020`，插件默认 `backendUrl` 已指 8020；数据＝主体一 SQLite backup 快照＋路径改写＋`knowledge/` 拷贝，Qdrant 仍共享 `127.0.0.1:6333`。裁剪 2,025 件（frontend/docker/skills/contracts/channels/scheduler/gateway-github/非知识 routers/monolith/非知识测试/部署与产品文档），保留 harness 依赖。真栈验收过；两项现场发现已修：①DocsView 同库刷新翻 loading 造成白屏（照切片抽屉 `hasDataRef` 改静默）；②`qwen3.8-flash` 在 DashScope 默认开思考、抽取腿每片烧数千 reasoning token（4–5 分钟），模型条目补 `enable_thinking: false` 后同文本 27.8 秒。提交候令。

## 9. 明确不做 / 另案

- 甲 MCP 桥、丙 TS 全重写：不做（编号外=不做）。
- 优化另案（不进首期，吸收前逐项单独指定）：证据窗四细节（Token 预算组装/句子级 anchor 裁剪/命中自带窗口/跨章节约束+去重）、零配置降级链、中英查询桥。
- 换底座/换前端风格：不换（已判）。
