# 插件操作手册

> 原根 README，现作为安装、运行与契约的操作手册保留；产品介绍见根 [README](../README.md)。

现状：工具面（三检索＋文档两件＋百科清单）、右栏管理面板、摄取后台任务、子槽声明契约、单一下载分发（运行时准备/就绪/重试/嵌入模型引导）与版本化升级/回滚/旧版清理均已实装；`backendUrl` 为空即内置本地服务，非空仍走外部服务。npm 与 GitHub 安装入口待首次发布（见「安装」）。

## 安装

本仓尚未发布（npm 包与 GitHub 仓库地址在发布前不可用）；当前从本地目录安装：

```sh
# 本地目录（开发安装，改码即被读取）
dsh plugin --profile <name> add link:<本仓绝对路径>

# 发布后：npm 包名
dsh plugin --profile <name> add dsh-harness-rag

# 发布后：GitHub 仓库地址（建议钉 tag 或 commit，不要跟 main）
dsh plugin --profile <name> add git+https://github.com/<owner>/dsh-harness-rag.git#<tag-or-commit>
```

三种方式装的是同一份插件代码，首次运行面完全一致。装完重启该 profile 的 DSH，打开右栏「知识库」tab：

1. **确认位置** — 默认 `<DSH_HOME>/harness-rag`（`DSH_HOME` 缺省 `~/.dsh`），可点「更改…」选父目录，实际根为 `<父目录>/harness-rag`。
2. **开始准备** — 下载运行时包（约 315 MB）并解压（约 840 MB），随后启动内置 Qdrant 与知识服务；首次约 1–2 分钟，之后启动为秒级。
3. **配置嵌入模型** — 未配置时点上传或拖入文件会被拦下并提示「去配置」；在「功能模型设置」里选嵌入模型后即可上传文档。

平台：首期只提供 **Windows x64** 运行时包；其他平台安装后会在面板明确报「没有可用的运行时包」，此时改用外部服务（见下）。

## 本地服务与数据

内置服务由插件托管，全部落在一个运行根里（跨插件升级与重装保留）：

```text
<root>/
├─ runtime/<version>/     # 便携 Python、site-packages、engine 源码、qdrant（按版本存放；成功切换后保留当前与上一版，更老版本自动清理）
├─ state/                 # data（sqlite 等）、logs、qdrant 存储、service.json、current.json、lease.json
├─ config/                # config.yaml、models_config.json、rag_config.json
└─ downloads/             # 运行时包下载缓存（.part 可续传）
```

- **端口**：默认 8020（知识服务）/ 6333、6334（Qdrant），被占用时自动换口，不会杀占用进程。开发机已有 Qdrant 时，托管仍会另起一个实例，不影响既有服务。
- **位置**：只在尚未安装运行时之前可以改。已有运行时想换位置，需要手工迁移：退出 DSH，把整个运行根拷到新位置，改好 `<DSH_HOME>/harness-rag/location.json` 里的 `root`（或删掉该锚点让它回到默认根）。
- **清理**：先删 `state/`，再删 `runtime/`（所有版本与知识库数据都会丢失）。
- **卸载**：DSH 卸载只删插件包；运行根（含知识库数据）原样保留，需要时手工删除。
- **升级**：插件升级不改 `runtime.json` 版本时不动运行时；换版本时，旧服务仍健康则只后台准备，下一次 DSH 启动才切换；失败自动回旧版并留横幅/失败记录；配置版本变化需确认。升级前**先备份 `state/` 与 `config/`**；回滚不保证数据兼容（新引擎可能已迁移存储）。详见下节「升级与回滚」。
- **旧数据**：旧部署的 `backend/.deer-flow` 不会自动迁入托管实例；要沿用它，请继续走外部模式，或手工拷贝。
- **杀软**：运行时里的 `python.exe`/`qdrant.exe` 未签名，可能被 SmartScreen 或杀软拦截；把运行根加入信任即可。
- **代理**：下载与引擎出网都跟随宿主/系统代理（`HTTPS_PROXY` 等），插件不覆盖宿主的 dispatcher。

## 升级与回滚

运行时的目标版本来自插件包的 `runtime.json`，当前运行版本记在 `<root>/state/current.json`。两者不同时：

1. **准备**：旧服务仍健康时，插件只在后台下载、校验、解压新版本，面板提示「新版本已就绪，重启 DSH 后启用」；本次不切换，也不改数据。
2. **切换**：下一次 DSH 启动（旧服务已退出、租约空闲）时启动新版。新版 Qdrant 与 knowledge 共享 90 秒健康门，成功后才把 `current.json` 指向新版并记下 `previousVersion`。
3. **失败回滚**：新版 90 秒内起不来或提前退出 ⇒ 停掉新版，有旧版时重新启动旧版；写 `state/failed-<version>.json`（`rolledBack=true`），面板显示失败横幅。后续启动不自动重试，直到点「下次启动重试」或 `runtime.json` 换目标。
4. **配置版本**：目标包与当前版本的 `configVersion` 不同（或当前版本缺失/为 0）⇒ 不自动切，面板要求确认；点「确认升级（重启后生效）」后才在下一次启动切换。确认只对当前目标版本与当前 `configVersion` 有效。
5. **保留与清理**：成功切换后保留当前与上一版；更老的、带 `runtime-manifest.json` 的版本目录及其 `failed-<version>.json` 会被删除。`.tmp`、未知名字、没有 manifest 的目录不动；`downloads/` 里的旧 zip 不自动删。
6. **备份**：升级前先退出 DSH，备份 `<root>/state/` 与 `<root>/config/`。回滚只保证服务回到旧版，不保证数据可回退（新引擎可能已迁移 SQLite/向量）。

面板横幅只读状态、不新增 tab：

- `正在准备新版本 …`：后台准备中，有进度时带百分比。
- `新版本 x 已就绪，重启 DSH 后启用。`：可关闭。
- `新版本 x 会改变配置格式；升级前请备份 state/ 与 config/。`：不可关闭；主按钮「确认升级（重启后生效）」。
- `升级到 x 失败，已回到 y。`：不可关闭；主按钮「下次启动重试」，可复制日志路径。
- `新版本 x 暂时无法启用。`：附原因（租约被占用、下载/校验/空间不足等）；可关闭。

**被占用、残留与锁**：

- 租约被另一个存活 DSH 宿主/profile 持有时状态为 `blocked`；停掉对方或等它退出后重启本宿主或点重试，不要手工杀不属于本运行根的进程。
- `service.json` 的 `pid` 为 null 或无法核验时，插件不会猜 pid、也不强杀。先确认端口（默认 8020/6333/6334）上的进程属于本运行根，再手工停止；然后重启 DSH 或点重试。本版没有对「端口仍应答但 pid 为 null」的自动 blocked 判定，遇到这种残留按手工流程处理。
- `state/provision.lock` 的持有者已退出但锁仍在（例如 pid 无法判定）：确认没有其他宿主正在准备后删除该文件，再重试。

**开发态本地包**：仅开发/验收用 `DSH_HARNESS_RAG_PACK=<本地 zip 绝对路径>` 覆盖下载，发布版不启用；本地包同样做空间检查与 manifest 的 `runtimeVersion`/`configVersion` 校验。`runtime.json` 的 `urls` 为空表示“未发布”，正式发布前必须回填下载地址、`size` 与 `sha256`。

## 外部模式（自带 Harness RAG 服务）

`backendUrl` 非空时完全走外部服务，行为与旧版一致（不下载、不起进程）。插件只需要 **Harness RAG knowledge 服务**（`harness-rag` 仓）：只挂知识库 API 的单进程服务。

```sh
# 最小形态：只起 knowledge 服务（端口 8020）；会先同步依赖（含 UMAP 投影 extra）
cd <harness-rag>/backend && make gateway
# 它跑的就是（backend/Makefile）：
# uvicorn app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020
```

- 服务侧需自备：Python 3.12 ＋ 依赖同步（`make gateway` 内置 `uv sync --inexact --extra umap`）、外部 Qdrant（默认 `127.0.0.1:6333`）、`config.yaml`／`models_config.json`／`rag_config.json`／`backend/.env`；数据在 `backend/.deer-flow/`。
- 面板或插件配置里填 `backendUrl`（如 `http://127.0.0.1:8020`）与 `apiToken`（引擎开了鉴权时必填，与服务端 `DEER_FLOW_API_TOKEN` 一致）。托管模式的 token 由插件生成，只存 `state/service.json`，面板不显示。
- 远程部署把 `backendUrl` 指过去即可。

## 市场索引

DSH 没有内置官方插件市场。发布后会提供一份只列本插件的 format 1 索引：在「插件 → 实验性插件」启用「自定义插件市场」，把索引 URL 加到 `indexes` 即可看到。

## 形态

DSH 插件跑在两个世界，本包各有一个半：

```text
src/index.ts   Host 半（TS）──inject:['tools']── 六工具＋面板数据桥＋摄取 job ──HTTP──> knowledge 服务
                （默认由插件托管的本地实例；backendUrl 非空时为外部服务）
client.js      Client 半（JS 工厂）──inject:['slots','sidebarRightTabs','locale']── 右栏「知识库」tab（完整面板）
```

Host 半在宿主世界注册模型可见工具，并负责运行时的准备、启动与守护；Client 半在浏览器世界注册右栏 tab 类型（右栏「+」→ 引导页 → 「知识库」胶囊）。两半各自声明依赖，不能互吃对面世界的服务。

右栏「知识库」tab 的文档面支持本地文件夹分组：新建/改名/折叠/移动/删除，归属键为 per-kb localStorage（`hrag-doc-folders.<kbId>.v1`），与 Wiki 卡片抽屉同口径；只影响视图，不改变检索范围与检索结果。

本包不含 RAG 逻辑；解析、切片、图谱、wiki、评测、存储全部在 knowledge 服务侧（运行根里的 `runtime/<version>/engine`）。

## 隔离与 kb_id 解析

- **隔离（默认）**：工具不做全局注册。会话在面板里绑定知识库后，六件 `hrag_*` 只挂进该会话（下一模型请求生效）；解绑即从该会话的工具表消失，未绑定的会话没有这些工具。
- **可选隔离件（预设）**：要把插件实例本身（如另一套 `backendUrl` / `apiToken`）按会话隔离，可用 `presets/knowledge.patch.yml` 的 `harness-rag-knowledge` 预设。用法：把该文件的 `insert` 行并入 profile 的 `cordis.patch.yml`，在该行 `config.plugins` 里写本包 **`link:` 安装路径**（官方 preset 行的同款写法）。
- **kb_id 解析次序**：工具参数 ＞ 会话绑定。两者都没有时返回结构化错误（`not_configured`）。会话绑定在面板顶栏「会话」入口里切换（每个会话至多一个库），工具结果回显 `kb_id`（绑定来源还带 `kb_name`）。
- **会话绑定**：面板顶栏（库选择器与 ⋯ 之间）的「会话」按钮打开抽屉——给当前会话绑定/切换/移除知识库，并列出已绑定会话（可跳转、可按当前浏览库新建）。绑定存 host 侧 `<DSH_HOME>/harness-rag/bindings.json`（`DSH_HOME` 缺省 `~/.dsh`）。
- **防同名遮蔽**：工具名统一 `hrag_` 命名空间；宿主按「视图（scope）」解析工具（`get(name, scope)`），agent 视角存在遮蔽面——命名空间是现状下的主防线。

## RAG 功能模型来自 DSH

面板里的功能模型列表由 DSH 当前可用的模型发布而来。插件宿主半在本机起一个 OpenAI 兼容代理（`/dsh-harness-rag/llm/v1`），引擎为每个 DSH 模型只保存一条指向该代理的别名（`dsh:<provider>/<model>`）；provider 的 endpoint 与 key 留在 DSH 内，引擎侧只拿代理地址和本地 token。

- DSH 需在运行。DSH 停止时别名调用返回可读错误；引擎侧仍配置的手动模型条目不受影响。
- 账号模型（`deepseek-account`）与 API-key provider 都能发布；视觉、思考与档位子集随别名同步。
- 模型目录变化或插件激活时自动同步，也可在「功能模型设置」的「DSH 模型」卡片手动同步。
- 功能模型是全局作用域：设置对所有知识库生效。
- 逐腿思考档位（Off / Default / 六档）取该模型声明的档位子集；不选档位即跟随 DSH 默认。
- 托管运行时与 `make gateway` 同依赖，**不含本地视频 ASR 依赖**（funasr/torch）：视频默认档需另装，或在设置里改用 ASR 服务档。

## 模型可见工具（`hrag_` 命名空间）

| 工具 | 说明 |
|---|---|
| `hrag_hybrid_search` | 混合检索：向量+稀疏融合、重排；参数 `query` / `top_k` / `doc_id`，结果含 `doc_id` / `chunk_index` / 实体 / 分数 |
| `hrag_graph_search` | 图谱检索：`query` 或 `entity` 精确实体直取，`hops` 1–2；证据片带 `doc_id` / `chunk_id` |
| `hrag_wiki_search` | wiki 检索：预消化条目+手动知识卡，返回完整正文；`query` 或 `title` 精确直取，`top_k` 默认 3 |
| `hrag_list_documents` | 文档清单：`doc_id` / 名称 / 状态 / 切片数 + 就绪 / 处理中 / 失败计数 |
| `hrag_read_document` | 按 `doc_id` 分页读切片，或只给 `chunk_id` 读中心窗；超长片 `truncated`、拒绝走 200 + message |
| `hrag_list_wiki_entries` | 百科条目清单（标题 / 状态 / 更新时间 + 诚实计数） |

六件工具提交到 `POST /api/knowledge-bases/{kb_id}/tools`，由引擎按 `name` 分派到与主树同名的实现；`citation_no` 仍按会话回合连续分配、三路共用一套编号，但 message 里的模型注记由插件剥离，纪律段不写引用或呈现规则。绑定会话同时挂一段检索纪律（`harness-rag:retrieval-discipline`：向量保底 / 图谱路 / 语料边界 / 读取上限 / 拒答 / 不解释过程）；人格与呈现仍由宿主决定，SOUL 的其余段落不移植。

完整的功能面等价对照（工作台原型 ↔ 本插件，含差异理由）见 [equivalence.md](equivalence.md)。

## 子槽声明契约

界面以「右栏 tab」形态挂入宿主（不新开槽位、不占其他槽）。以下为稳定承诺（重命名＝破坏性变更）：

| 层 | 内容 |
|---|---|
| 槽名 | 宿主槽 `sidebar.right.pane.tab`；本插件标识＝tab 类型 id `dsh-harness-rag`、kind `harness-rag`、tab 体 key `dsh-harness-rag`、guide 条目 id `open`、locale 命名空间 `harnessRag` |
| props | 不消费框架注入的 tab props（`useTabInfo`）；仅依赖 locale 注入与宿主 DOM 标记 `[data-sidebar-right-session]`（会话 id 采集；取不到＝软降级） |
| 生命周期 | 三件注册（字典/tab 类型/tab 体）全在 `ctx.effect` 内（插件卸载即注销）；tab 体未设 `keepMounted`——按访问挂载、切走/折叠即卸载；持久状态只落服务端与 localStorage；普通↔全屏切换不重挂 |
| 冲突语义 | 工具同名＝宿主按视图（scope）遮蔽；槽位同位＝keyed 替换点；往未声明槽注册＝激活期失败；tab 类型 id 重复＝抛；kind 冲突（超出 builtin+extension 一对）＝抛 |

命名空间四防（与其他插件零冲突面）：工具名 `hrag_*`；槽位标识 `dsh-harness-rag` / `harness-rag` / `harnessRag`；配置行 id `harness-rag`；localStorage 键 `hrag-last-kb` / `hrag-kb-order` / `hrag-doc-table-prefs.<kbId>` / `hrag-card-drawers.<kbId>.v1` / `hrag-doc-folders.<kbId>.v1`；代理路由 `/dsh-harness-rag/api`；后台任务 kind `hrag-ingest` / `hrag-reindex`。

## 开发

```sh
pnpm install
pnpm run typecheck
```

改动后重载：Client 半（`client.js`）随窗口重开即生效；Host 半（`src/`）须桌面端托盘完整退出重启才换代（`link:` 开发安装无须重装，改码即被读取）。

运行时包由仓内脚本构建：`pnpm run build:runtime -- --engine-commit "$(git rev-parse --short=9 HEAD)"`（或直接 `node scripts/build-runtime-pack.mjs --engine ./engine --engine-commit <sha>`）；默认输出 `dist/`，加 `--update-manifest` 回填 `runtime.json` 的 size/sha256（pnpm 下写作 `pnpm run build:runtime -- --update-manifest`）。冷构建固定 Python 3.12.13、Qdrant 1.20.0，要求 `uv` 0.11.2 与 `gh` ≥ 2.40。`engine/` 是本仓的后端目录、自身没有 `.git`，builder 不会向上找仓根，因此必须显式传 `--engine-commit`；`engine/UPSTREAM.md` 只记分叉基准，不作为构建来源。构建前可加 `--print-inputs` 核对解析结果。产物是 `harness-rag-runtime-win32-x64-<version>.zip`。开发时可用 `DSH_HARNESS_RAG_PACK=<本地 zip>` 跳过下载、直接解压该包。

面板文案走内联字典（`ctx.locale.register('harnessRag', …)`，三方插件官方模式）；`locale/*.json` 只承载清单显示元数据（title/description），不是词条文件。

## License

MIT。RAG 能力（解析、切片、三路检索、图谱、wiki、评测与面板）由本项目自行实现；插件基于 DeepSeek Harness（MIT）的插件 API。引擎源码树内含第三方 MIT 框架代码，其版权声明见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。
