# dsh-harness-rag

**Harness RAG for DeepSeek Harness (DSH)** — 三路检索（混合/图谱/wiki）+ 文档续读 + 知识库管理面板，后端为 Harness RAG knowledge 服务（最小 Python 服务）。

> Status: **T2–T6 已实装并在真栈验收** — 工具面（三检索＋文档两件套：单路 recall-test / 中心窗续读 / 半开输出）、右栏管理面板（T3）、摄取通道后台任务（T4）、子槽声明契约＋命名空间四防（T5）、等价对照表＋原创图标＋三检索真跑（T6）；隔离提供「知识预设」可选件。后端已切到主体二 `harness-rag` 最小知识服务（`127.0.0.1:8020`）。未配后端时返回结构化错误。

## 隔离与 kb_id 解析

- **隔离（可选，推荐）**：`presets/knowledge.patch.yml` 定义了一个 DSH Agent 预设 `harness-rag-knowledge`——挂载本插件的工具包，**选中该预设的会话才有 `hrag_*`**（未用时工具在全局视图中仍可见，等于当前测试态）。用法：把该文件的 `insert` 行并入 profile 的 `cordis.patch.yml`，在该行 `config.plugins` 里写本包 **`link:` 安装路径**（官方 preset 行的同款写法），并按需加 `defaultKbId` 配置。
- **kb_id 解析次序**：工具参数 ＞ 会话上下文 ＞ `defaultKbId`。会话级（现面 per-thread 绑库的对应物）由知识预设/面板（T3）持有，本阶段该级缺席、链条按原序降级（参数或默认）。
- **防同名遮蔽**：工具名统一 `hrag_` 命名空间；宿主按「视图（scope）」解析工具（`get(name, scope)`），agent 视角存在遮蔽面——命名空间是现状下的主防线。

## 形态

DSH 插件跑在两个世界，本包各有一个半：

```text
src/index.ts   Host 半（TS）──inject:['tools']── 五工具＋面板数据桥＋摄取 job ──HTTP──> Harness RAG knowledge 服务（Python，独立部署）
client.js      Client 半（JS 工厂）──inject:['slots','sidebarRightTabs','locale']── 右栏「知识库」tab（完整面板）
```

Host 半在宿主世界注册模型可见工具；Client 半在浏览器世界注册右栏 tab 类型（右栏「+」→ 引导页 → 「知识库」胶囊）。两半各自声明依赖，不能互吃对面世界的服务。

右栏「知识库」tab 的文档面支持本地文件夹分组：新建/改名/折叠/移动/删除，归属键为 per-kb localStorage（`hrag-doc-folders.<kbId>.v1`），与百科卡片抽屉同口径；只影响视图，不改变检索范围与检索结果。

本包不含 RAG 逻辑；解析、切片、图谱、wiki、评测、存储全部在 Python 服务侧。

## RAG 功能模型来自 DSH

面板里的功能模型列表由 DSH 当前可用的模型发布而来。插件宿主半在本机起一个 OpenAI 兼容代理（`/dsh-harness-rag/llm/v1`），引擎为每个 DSH 模型只保存一条指向该代理的别名（`dsh:<provider>/<model>`）；provider 的 endpoint 与 key 留在 DSH 内，引擎侧只拿代理地址和本地 token。

- DSH 需在运行。DSH 停止时别名调用返回可读错误；引擎侧仍配置的手动模型条目不受影响。
- 账号模型（`deepseek-account`）与 API-key provider 都能发布；视觉、思考与档位子集随别名同步。
- 模型目录变化或插件激活时自动同步，也可在「功能模型设置」的「DSH 模型」卡片手动同步。
- 功能模型是全局作用域：设置对所有知识库生效。
- 逐腿思考档位（Off / Default / 六档）取该模型声明的档位子集；不选档位即跟随 DSH 默认。

## 安装

前置：DSH（Node `^22.19.0 || >=24.0.0`）；Harness RAG knowledge 服务已起（默认 `http://127.0.0.1:8020`）。

```sh
dsh plugin --profile <name> add link:<本仓绝对路径>
# 或发布后：dsh plugin --profile <name> add dsh-harness-rag
```

重启该 profile 的 web 服务后生效。在 Plugins 页或 bundle 配置里填：

| 配置 | 说明 |
|---|---|
| `backendUrl` | knowledge 服务地址（默认 `http://127.0.0.1:8020`） |
| `apiToken` | Bearer token；引擎开启鉴权时必填（与服务端 `DEER_FLOW_API_TOKEN` 一致）；空=仅对 auth-off 引擎有效 |
| `defaultKbId` | 默认知识库 id；空=每次调用必须传 `kb_id` |

## 后端最小形态（部署）

本插件只需要 **Harness RAG knowledge 服务**（主体二 `harness-rag` 仓）：只挂知识库 API 的单进程服务，不含 agent 运行时、IM 通道、调度器与前端。

```sh
# 最小形态：只起 knowledge 服务（端口 8020）
cd <harness-rag>/backend && make gateway
# 它跑的就是（backend/Makefile）：
# uvicorn app.gateway.knowledge_app:app --host 127.0.0.1 --port 8020
```

- 服务启动前需就绪：Python 3.12 ＋ `uv sync --inexact`；外部 Qdrant（默认 `127.0.0.1:6333`）；`config.yaml`／`models_config.json`／`rag_config.json`／`backend/.env`。数据在 `backend/.deer-flow/`。
- 本机验收态可用 `DEER_FLOW_AUTH_DISABLED=1`（只绑回环）；引擎开启 token 鉴权时，插件 `apiToken` 填与服务端一致的 token；远程部署把 `backendUrl` 指过去即可。
- 部署姿势不变：知识库数据在服务侧本地（Qdrant/存储）；插件只是它的一个客户端。

## 模型可见工具（`hrag_` 命名空间）

| 工具 | 说明 |
|---|---|
| `hrag_hybrid_search` | 混合检索：向量+稀疏融合、重排 |
| `hrag_graph_search` | 图谱检索：实体种子、跨章节结构证据 |
| `hrag_wiki_search` | wiki 检索：预消化条目+手动知识卡 |
| `hrag_list_documents` | 文档清单与状态计数 |
| `hrag_read_document` | 按 doc_id 分页读切片，或围绕 chunk_id 开窗续读 |

完整的功能面等价对照（DeerFlow 工作台 ↔ 本插件，含差异理由）见 [docs/equivalence.md](docs/equivalence.md)。

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

面板文案走内联字典（`ctx.locale.register('harnessRag', …)`，三方插件官方模式）；`locale/*.json` 只承载清单显示元数据（title/description），不是词条文件。

## License

Apache-2.0
