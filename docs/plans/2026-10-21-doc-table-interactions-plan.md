# 面板 · 文档表交互收口 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Spec:** [2026-10-21-doc-table-interactions-spec.md](../specs/2026-10-21-doc-table-interactions-spec.md)
**Status:** ✅ 收官（2026-10-21，**D1–D4 已拍：全甲**；Task 0–5 全毕；他手验真栈全过；实现／文档两笔已提交 `0fc9a32`／`3f85613`，收口回写为本笔；仓无 remote，未推）。
**Architecture:** 纯前端。列头修＝定宽与 chevron 几何；行拖拽＝排序状态增加「手动」模式＋per-kb localStorage＋HTML5 DnD（照库下拉拖拽先例）；零后端、零 API、零 host 半改动。

**硬约束**：只改插件仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 只读零改动；后端零改动；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。工作区并行未提交件（`src/model_sync.ts`、`tests/model_sync.test.ts`、`2026-10-21-dsh-model-proxy-*`）不触碰、不纳入。几何以真浏览器实测为准，不靠估算。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 真浏览器量列头：面板 570／740／满宽三档，逐个量可隐藏列的「标签实际宽／gap／chevron 盒／左右内衬／相邻列起点」，记录上传者与切片数的溢出像素；同时截图对照当前截断态。
- [x] 复读并记录锚点：定宽与 sticky（`client.js:1931-1944`）、chevron（`client.js:1970`）、排序默认与键集合（`client.js:8104-8110`）、排序状态（`client.js:8567`）、轮询（`client.js:8619-8626`）、选择集修剪（`client.js:8642-8652`）、可见集（`client.js:8656-8657`）、排序菜单（`client.js:8836-8866`）、行元素（`client.js:9045-9060`）。
- [x] 核实存储先例与键族：列偏好读取／写入／清洗（`client.js:8238-8276`）、库排序 `hrag-kb-order`（`client.js:1705-1721`＋拖拽钩子 `17621-17680`）、内联 zh/en 文案位（`client.js:96-123` / `client.js:865-887`）。
- [x] 核实工作台无文档拖拽（`frontend/src/components/workspace/knowledge/document-panel.tsx` 无 `draggable`／DnD）与自动布局参照（同文件 `:778`）；确认本功能按插件自有偏离登记。
- [x] 复看 D1–D4（已拍全甲）并给出 Task 0 建议数值（列宽、`min-width`、chevron 盒），数值停点待钉。

**实测**（Task 0，2026-10-21；只读，未提交）：
- **量具**：Chromium 同款 CSS/DOM 复刻页（仓外临时件），zh 标签 12px/500；本环境截图不可读，截断态改用几何＋绘制序（同层 `z-index:10` 的后绘制 sticky th 覆盖前列溢出）。
- **现状几何**（570／740／1000 三档同值，fixed 布局）：上传者列盒 52、内容宽 36；标签 36＋gap 2＋chevron 盒 18＝56，溢出 **20px**；切片数列盒 56、内容宽 40，同式 56，溢出 **16px**。570 档：上传者 chevron 盒 294–312，下一列 th 起点 300 ⇒ 18px 中 12px 压在时间列盒下、仅 6px 可见；切片数 chevron 盒 544–562，下一列 th 起点 554 ⇒ 仅 10px 可见。状态／时间／大小三列余量 −20／−64／−14（不溢出）；相对时间档时间列余量 −28。
- **建议数值**：上传者 `52→72`、切片数 `56→72`；chevron 盒 `18→16`（内层 svg 14）、gap 保持 2。复刻页代入后内容宽 56 vs 需求 52，**余 2px**，三档零溢出。
- **停点（待钉）**：`min-width` 建议**维持 552**——按 D1 的「同步加 20~32」会到 588，570 档反而出 18px 横滚；维持时名称列在 570 档由内容 104 收窄到 68（徽章 20＋gap 8 后约 5 字），552 档到 50。是否接受名称列收窄／是否改抬 min-width 待他挑。
- **en 口径**：同字体量 `Uploader` 52.98、`Chunks` 42.3 —— 72 列在英文界面仍分别溢出约 15／4px（现状 52 列本就溢出约 17px）；按英文配足需上传者 88、切片数 78（名称列再让 22px），或改英文标签（会偏离工作台 `Uploader` 用词）。是否纳入本对一并修待裁。
- **锚点勘正**：本对 spec §2.2／§4.3 的旧行号（8062/8525/8614/9006/17579/8196）已按上列现值改正。
- **工作台**：`document-panel.tsx` 全文零 `draggable`／DnD 命中；表格为自动布局 `w-full min-w-[34rem]`（`:778`）⇒ 行拖拽属插件自有能力，收口时登记等价表偏离。

## Task 1 — 列头溢出修（D1）

> 动到的文件：`client.js`（表头定宽／chevron 尺寸／`min-width`／必要注释）。

- [x] 按 D1 甲重配：上传者／切片数列宽含「标签＋间距＋chevron＋内衬」；chevron 缩到 14~16px、间距 0~2px；`min-width` 同步（以 Task 0 实测数值为准）。
- [x] chevron 保持常驻占位、仅 opacity 变化；悬停/展开不引起列宽跳动；表头右键、「列」总控、列偏好行为逐字不变。
- [x] 若选定兜底：表头悬停提升 z-index 仅作防御，不替代空间修；若无必要不加。
- [x] 门禁：`node --check client.js`；冒烟默认与 `SMOKE_HOSTLESS=1`；真浏览器三档截图（chevron 完整、菜单可开、名称省略正常）。

**实测**（Task 1，2026-10-21；未提交）：
- **落点**（`client.js` Styles() 文档表段）：`.hrag-docth-uploader` 52→72、`.hrag-docth-chunks` 56→72；`.hrag-doccolchev` 18→16 并新增内层 `svg{14px}`（宿主件默认与回退件统一）；`min-width` 维持 552。z-index 兜底**未加**（空间已够，不叠防御）。
- **几何**（同款复刻页 552／570／740／1000，含绝对／相对时间两档）：上传者与切片数 chevron 盒右缘距内容右缘**余 2px**；svg 实量 14×14；表 `scrollWidth−clientWidth＝0` 四档全零；名称列内容宽 570 档 **68**（相对时间档 104）、552 档 50。
- **门禁**：`node --check client.js` 过；`src/*.ts` strip-types 全过（未改动）；冒烟默认 **79 PASS／0 FAIL**、`SMOKE_HOSTLESS=1` **79 PASS／0 FAIL**。
- **未做**：真机菜单点开与悬停观感留 Task 4 真跑；en 标签截断按裁定维持现状。

**Task 1 后补修 · 紧凑档＋平滑（2026-10-21，他令「只先做紧凑档」→「680 断点台阶改平滑」；未提交）**：
- **动因**：fixed 布局下缩宽全部由名称列吸收；570 档名称内容仅 68（552 档 50）。按数据硬下限量：状态 80、大小 74 不能再压；时间绝对可到 120、相对到 72；短列在 chevron 14／gap 0 时可到 68。
- **落点**：`.hrag-docscroll` 加 `container-type: inline-size`；短列常驻 68（chevron 盒 14／svg 12、gap 0）；时间列 `clamp(120px, calc(102.75px + 3.125cqw), 124px)`、相对 `clamp(72px, calc(3px + 12.5cqw), 88px)`。原 680px 断点紧凑档已拆（无台阶）。
- **几何**（复刻页）：679／680／681 名称内容 **185.0／186／187**（逐像素连续，无台阶）；570 档 **79.4**（原 68）／相对 **125.8**（原 104）；740 档 246／282；552–1000 横向溢出全零；两短列 chevron 余量 2px、svg 12。
- **代价**：chevron 由 16/14 全局收到 14/12、短列 72→68（宽档名称反而 +8）；时间列在 680 以上封顶 124／88，行为与旧值一致。
- **门禁**：`node --check` 过；冒烟默认与 hostless 各 **79 PASS／0 FAIL**。
- **未做**：A（短列去 chevron）按令不做；真机拖宽观感留 Task 4。

## Task 2 — 手动排序模式＋持久化（D2／D3）

> 动到的文件：`client.js`（排序状态／菜单／存储助手／文案）。

- [x] 排序模型扩展为字段模式＋`manual`；默认仍是 `created_at desc`；`manual` 不出现在字段方向组里。
- [x] 排序菜单新增「手动排序」项（zh/en），勾选态随模式；手动模式下方向项置灰或隐藏。
- [x] 存储助手：`hrag-doc-order.{kbId}`＝`{ mode, ids }`；读取做脏数据清洗，写入 best-effort；per-kb 切换时同步读取（照 `kbIdRef` 先例，避免旧库写新库）。
- [x] 合并助手（纯函数）：按 ids 序取仍存在的行；未登记的新文档按默认序排末尾；删除的 id 剔除；`manual` 从未拖过时以当前默认序为基。
- [x] 切换到字段排序＝立即重排、保留手动 ids；切回「手动排序」＝恢复；重挂载／切 tab 从本地恢复 mode＋order。
- [x] 门禁：`node --check client.js`；仓外小探针覆盖合并／清洗／模式往返（含空 ids、脏 JSON、已删 id、新文档）；冒烟默认与 hostless 全绿。

**实测**（Task 2，2026-10-21；未提交）：
- **落点**（`client.js`）：助手四件＋键族 `hrag-doc-order.`（`:8142` 起）；状态改 `docOrder`＋`direction`（`:8628`）；切库重读与写侧 `kbIdRef`（`:8641-8648`）；可见集分支（`:8728-8732`）；菜单「手动排序」与方向置灰（`:8925`／`:8930-8938`）；zh/en 文案（`:103`／`:873`）。
- **行为**：字段模式照旧即时重排、方向不落盘；手动模式显示序＝ids 序取现存行，未登记新文档按 `created_at desc` 排末尾；ids 里的已删项显示时自然忽略（存储里的失效 id 在下一次拖动写盘时被整表覆盖）；选「手动排序」但从未拖过＝默认序。
- **探针**（仓外 `probe-doc-order.mjs`，从 client.js 抽取函数源码执行，非副本）：**11/11 PASS**——空/脏 JSON、mode 白名单、ids 去重与数字 id、读写往返 per-kb、空 ids 默认序、手动序含已删 id、新文档尾随、搜索子集保序、模式往返。
- **门禁**：`node --check client.js` 过；冒烟默认与 `SMOKE_HOSTLESS=1` 各 **79 PASS／0 FAIL**（冒烟 runner 的 DocsView query fixture 锚点随状态行改动同步更新，仓外文件）。
- **未做**：拖动入口与落点重排属 Task 3；真栈留 Task 4。

## Task 3 — 行拖拽（D4）

> 动到的文件：`client.js`（行元素／拖拽处理／插入线 CSS／轮询暂停）。

- [x] 行挂 `draggable`；checkbox、⋯、列菜单、链接等交互件上不启动拖拽；行悬停 `cursor: grab`；拖拽中行降透明度。
- [x] `dragstart` 记录 doc id，`dragover` 按行上／下半区判前后并画 2px 插入线，`drop` 提交重排；拖到表头／空白处不落地。
- [x] 首次拖拽自动切 `manual`（以当前可见全集为基），落点即时生效并写入；排序菜单同步勾「手动排序」。
- [x] 边界：搜索词非空、多选非空时禁止拖动；拖动期间暂停／排队 3s 轮询，落点后合并；拖拽后的 click 被抑制且有兜底；切库／重挂载不残留拖拽态。
- [x] 门禁：`node --check client.js`；冒烟默认与 hostless；仓外小探针覆盖重排索引（上移／下移／首尾）；真 DSH 手验（drag 与 click/checkbox/右键不串）。— 2026-10-21 实落：探针 14/14、冒烟 79/79×2、`node --check` 过；真栈手验随 Task 4 全过。

**实测**（Task 3，2026-10-21；未提交）：
- **落点**（`client.js`）：拖拽态与 ref（`:8649-8657`）；轮询挂起（`:8713-8717`）；`canDrag`／交互件守卫／`finishDrag`／`moveDoc`（`:8773-8801`）；行 props（`:9190-9245` 区段）；CSS 四条（`:1955-1958`）；纯函数 `moveDocId`（`:8196-8206`）。
- **行为**：整行可拖（`draggable` 只在可拖时挂）；从 checkbox／⋯／菜单触发器／链接上按下不启动；拖动源 45% 透明，落点行上／下半区出 2px 插入线（逐 td inset 阴影，不改行高）；drop 以当前可见全集为基重排并切 `manual`＋写盘；表头／空白处无 drop 处理器，自然不落地；切库清空拖拽态。
- **边界**：搜索词非空或选择集非空（含右键单选）→ `draggable` 不挂、无抓手指针；拖动期间 3s 轮询只记 pending，`finishDrag` 补一拍；落点后 300ms 内行 click 被抑制（防拖动结束误开抽屉）。
- **探针**：`probe-doc-order.mjs` 扩至 **14/14 PASS**——新增 `moveDocId` 上移／下移／首／尾、同 id 与缺失 id 返回同一引用、不改输入。
- **门禁**：`node --check` 过；冒烟默认与 hostless 各 **79 PASS／0 FAIL**。
- **未做**：真 DSH 手验（拖动与 click／checkbox／右键不串）留 Task 4 整批真跑。

## Task 4 — 门禁与真栈验收

> 动到的文件：无（探针与截图仓外）。

- [x] `node --check client.js`；全部 `src/*.ts` 跑 `--experimental-strip-types --check`；冒烟默认与 `SMOKE_HOSTLESS=1` 全绿。
- [x] DSH 整重启（候令）后真跑：570／740／满宽逐个开列菜单；拖动一行→重开面板／切 tab／切库；字段排序→手动恢复；手动模式上传新文档；删除后顺序；搜索／多选禁用；轮询期间拖动。
- [x] 回归：列偏好持久、表头右键、「列」总控、行 ⋯／右键、批量选择／删除、抽屉点击、上传链。
- [x] 确认 `git status` 仅含本对文件；deer-flow 主树与后端零 diff。

**实测**（Task 4 门禁＋真跑，2026-10-21；未提交）：
- **语法**：`node --check client.js` 过；`src/*.ts` 六件 strip-types 全过。
- **冒烟**：默认与 `SMOKE_HOSTLESS=1` 各 **79 PASS／0 FAIL**；`probe-doc-order.mjs` **14/14 PASS**。
- **工作区**：插件仓本对只动 `client.js`＋本对 spec/plan；`src/*.ts`、`package.json`、`tests/*`、模型代理/rag-leg-effort 未跟踪文档均为他线未提交件，未触碰（`git diff --stat` 与常量清单逐一核对）。
- **主树**：`deer-flow` 代码零 diff——唯一 `M README.md` 的 mtime＝**2026-10-10 21:20**（早于本对，为他线存货）；其余为未跟踪研究/计划稿，均未动。
- **模块代**：真跑时进程启动 10:47、最终码 mtime 11:04（client 半随窗口重载，非整启换代）；若拖宽观感与清单不符，整重启后复核。

**真跑（他手验，2026-10-21）**：他复「都过了」——按下方清单 1–6 全过（三档列头、拖拽即时生效＋菜单同步、重开／切 tab／切库持久、字段↔手动往返、新旧文档增删、搜索／选择集禁拖、行点击与 ⋯／右键不串、轮询不跳序、拖宽无台阶、回归项）。本环境无截图/CDP，证据为他复述。

**真跑清单（他手验）**：
1. 文档 tab 三档（570／740／满宽）逐个悬停可隐藏列表头：chevron 完整可见、可点开菜单；悬停/展开无列宽跳动；名称列省略正常。
2. 拖一行到新位：立即生效，排序菜单勾「手动排序」，方向两项置灰；重开面板／切 tab／切库顺序保持。
3. 点任一字段排序→再点「手动排序」恢复；手动模式下方向不可点。
4. 手动模式上传新文档：排末尾、既有相对顺序不变；删除一篇：其余顺序不变。
5. 搜索词非空／勾选任一行（含右键选中）后不可拖；行点击仍开抽屉；⋯／右键菜单／批量删除正常；拖动结束不会误开抽屉。
6. 库内有在飞文档时拖动：3s 轮询不跳行序；落点后补一拍。

## Task 5 — 收口

> 动到的文件：本对＋`docs/equivalence.md`。

- [x] 回写 spec Status 与各 Task 实测；plan 勾选与实测回填。
- [x] `docs/equivalence.md` 增行：文档行拖拽＝插件自有能力，工作台无对应功能（有意偏离）。
- [x] 逐文件核 hunk，排除并行工作区与仓外探针；提交链候令后执行（拟两笔：实现＋收口，或按实测合并）。— 2026-10-21 实落：收口 diff 仅 spec/plan/equivalence 三件，并行件与探针未入；实现／文档 `0fc9a32`／`3f85613`，收官回写 `b7dc3bb`。

**实测**（Task 5，2026-10-21；收口回写＝本笔）：
- **回写**：spec Status→✅ 收官；plan Task 0–5 勾选与各 Task 实测、真跑清单与代际备注齐。
- **等价表**：`docs/equivalence.md` §2 增两行——「排序」插件面补手动排序；新增「行拖拽／手动排序＝插件增加（有意偏离，工作台无此能力）」。
- **收口 diff**：仅 `docs/specs/2026-10-21-doc-table-interactions-spec.md`、`docs/plans/2026-10-21-doc-table-interactions-plan.md`、`docs/equivalence.md` 三件；并行工作区（`src/*`、`package.json`、`tests/*`、model-proxy/rag-leg-effort 文档）与仓外探针均未入。
- **提交**：实现/文档两笔已落（`0fc9a32`／`3f85613`）；本笔为收官回写。

---

## 提交链（滚动记实）

- `0fc9a32` feat(panel): reorder document rows and rebalance table columns（实现：列头修＋手动排序＋行拖拽＋连续列宽；未推）
- `3f85613` docs(panel): add the document table interaction plan（spec/plan 与实测；未推）
- 本笔 docs(panel): close out the document table interaction pair（收官回写：spec Status＋plan 勾选/实测＋equivalence 行）
