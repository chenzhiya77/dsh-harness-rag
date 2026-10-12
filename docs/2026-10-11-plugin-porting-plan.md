# Harness RAG → DSH 插件线（dsh-harness-rag）· 步骤记录

- Status: T1 ✅ 收官（冒烟复验三条 10-11 实测全过）· T2 ✅ 收官（2026-10-12 真栈两半全过）· 未提交
- Date: 2026-10-11
- 形态（10-11 他拍）：**spec↔plan 一一配对**——`docs/specs/*-spec.md` 与 `docs/plans/*-plan.md` 同名成对（T2 对=`2026-10-11-equivalence-freeze-{spec,plan}.md`）；本档=全线路**步骤记录**（落 `docs/` 根），只记进度与决策，执行步骤进各配对 plan、不重复。
- 每步一个复选框；Status 随交付更新。

## 0. 定位与边界（已拍，不重开）

- 形态=**乙+丙′**：原生 dsh 插件（乙）+ 子槽契约化（丙′）。甲=MCP 桥不做；丙=TS 全重写不做（跨语言重写+评测全废，RAGAS/UMAP/torch 视频腿搬不动）。
- 拓扑=**最小 Python 服务**（现有 harness RAG 后端单进程，不带 nginx/前端/IM 全家桶）+ 独立新仓 TS 插件；**一个后端、两个前端**（DeerFlow 工作台原样保留，DSH 侧走 slot API 新写）。
- 首期=**现有能力等价移植**：三检索+续读骨架+管理面板+摄取+子槽声明+命名空间四防御，行为口径不动。**优化另案不进首期**（证据窗四细节 / 零配置降级链 / 中英桥）——基线先行才能归因。
- 两分账：移植基线=T2 开工日点名冻结清单；功能新增走跟进账增量移植。
- 定名 `dsh-harness-rag`（一名三用=包名/仓名/插件 id；npm 404 已核）。仓=`E:\app\python\agent\dsh-harness-rag`（独立 git，未提交）。
- 命名空间四防=工具名/槽名/设置 id/存储路径全命名空间化（防同名遮蔽与文件端口互抢）。

## 1. 进度总览

| Task | 内容 | 状态 |
| --- | --- | --- |
| T1 | 插件骨架（门面六件+安装冒烟） | ✅ 收官（三修+复验三条 10-11 全过） |
| T2 | 工具面等价移植（端点对齐+召回测试缝） | ✅ 收官（2026-10-12；两笔后端跟进笔＋Task 3–6＋真栈两半；含真栈咬出的 list_documents 形状修复） |
| T3 | 管理面板（功能面＝工作台知识库页全部：管理＋可视化） | 执行中（Task 0–5 已收官；10-13 补百科面＝新 Task 9；10-12 冻清单 D1–D6，详见 T3 plan） |
| T4 | 摄取通道（`ctx.jobs`） | 未开工 |
| T5 | 丙′ 子槽契约化+命名空间四防 | 未开工 |
| T6 | 验收（等价移植对照表+文档+icon） | 未开工 |

**待排（未编 T 号，2026-10-13 登记）**：
- **模型面归属与分项目治理**——T3 期间现场提出的题：设置→「模型」页（对话模型｜功能模型双视图）的归属重整——功能模型视图＋重建索引入口移入知识库详情 ⋯ 菜单为候选方案；对话主模型＝各自宿主治理（DSH 对话用 DSH 配置），功能模型（嵌入/重排/抽取/裁判/多模态）归 deer-flow 服务侧（现状切分的显式化）。**程序＝先占位，到位再立 spec/plan 对**；未到位前 T3 入口维持现状（顶栏）。

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

## 4. T3 管理面板（执行中 2026-10-13；10-12 冻结）

配对件：spec=`docs/specs/2026-10-12-t3-panel-spec.md`（10-12 整批冻结：D1 全做/D2 甲/D3 甲/D4 乙/D5 全保留/D6 延后）＋ plan=`docs/plans/2026-10-12-t3-panel-plan.md`（Task 0–12；轻面先行、重型后上；10-13 补面 Task 9 百科）。

- [ ] 面板功能面＝工作台知识库页的全部（管理＋可视化）——**D5 全保留**（10-12 翻案：右栏可拖宽/分栏/全屏/浮动，空间可达；重型视图在 DSH 内新建）
- [ ] settings 表单（可走自家依赖 `@deepseek-ai/schemastery` 3.18.4）
- [ ] 10-13 补面：百科视图（读＋管理档；原「不进面板」留档收编——A 裁定）——见 plan Task 9

## 5. T4 摄取通道（未开工）

- [ ] `ctx.jobs` 后台摄取接入（上传→解析→分块→嵌入的进度与失败呈现）

## 6. T5 丙′ 子槽契约化+命名空间四防（未开工）

- [ ] 子槽声明对外契约化：槽名/props/生命周期/**冲突语义**四层稳定承诺（冲突语义三层已核：同名 scoped 遮蔽/槽位 priority 替换或 list 并排/未声明注册激活期失败）
- [ ] 命名空间四防落地核对（工具名/槽名/设置 id/存储路径）

## 7. T6 验收（未开工）

- [ ] 真 DSH 会话跑三检索工具（原甲档价值验证并入乙验收）
- [ ] 等价移植对照表（harness RAG 现面 ↔ 插件面逐项）+ 文档
- [ ] icon 原创（现缺=回退默认图）

## 8. 环境与安装面（速查）

- 验收面=官方 **DeepSeek Harness Desktop 0.2.0-rc.2** @ `E:\appdevelop\deepseek`；本地路径安装已通（桌面按 `link:` 装进 `~/.dsh/profiles/desktop`，改码即生效但需整重启换模块代）。
- **安装两通道语义（2026-10-12 实测，踩坑记）**：`link:`＝链接，源目录改码在整重启后即生效（现用通道）；**`file:`＝拷贝**到 profile 的 `node_modules`——改源不随动，须 `dsh plugin --profile desktop remove <名>` 后再 `add` 刷新副本，否则装载器照旧件执行（症状：改完仍报旧文件错）。
- **插件装载触发**：host 半**不在 app 启动时装载**，由**启用开关/激活**触发；开关态持久化在 profile 层补丁（`disabled:false`）；apply 执行后可用 `process.execPath` 定位 DSH 安装目录、spawn 自带 Python（实测 3.12.14 可调）。
- **模块代体检法（10-12 二实证：T1 一次、T2 收官一次）**：报错/行为像旧码时，**先比对「进程 CreationDate vs 源码 mtime」＋报错里的工具描述文案 vs 现在源码**——对不上＝旧模块代在跑，整重启桌面端即可，别改代码。桌面端进程可用 `wmic process get CreationDate` 一对就明。
- profile `~/.dsh/profiles/desktop/pnpm-workspace.yaml` 已配 `allowBuilds`+fetch 旋钮（备份 `.bak-1011`；两闸=pnpm 并发下载中断+构建脚本许可）。
- 源码取证通道=`gh api`（DSH 默认分支 **master**；raw 直连不稳）。
- 本地 `pnpm install` 装不通 @deepseek-ai 依赖图是设计使然（`dsh-type-meta` 未公开、仅随 DSH 发行）；typecheck/冒烟须在 DSH profile 语境。

## 9. 明确不做 / 另案

- 甲 MCP 桥、丙 TS 全重写：不做（编号外=不做）。
- 优化另案（不进首期，吸收前逐项单独指定）：证据窗四细节（Token 预算组装/句子级 anchor 裁剪/命中自带窗口/跨章节约束+去重）、零配置降级链、中英查询桥。
- 换底座/换前端风格：不换（已判）。
