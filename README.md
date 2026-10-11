# dsh-harness-rag

**Harness RAG for DeepSeek Harness (DSH)** — 三路检索（混合/图谱/wiki）+ 文档续读 + 知识库管理面板，后端为 Harness RAG knowledge 服务（最小 Python 服务）。

> Status: **tool surface live (T2, Tasks 0–5)** — 三检索与文档两件套已按等价口径接通（单路 recall-test / 中心窗续读 / 半开输出）；隔离提供「知识预设」可选件。管理面板实装（T3）、摄取通道（T4）未实装。未配后端时返回结构化错误。

## 隔离与 kb_id 解析

- **隔离（可选，推荐）**：`presets/knowledge.patch.yml` 定义了一个 DSH Agent 预设 `harness-rag-knowledge`——挂载本插件的工具包，**选中该预设的会话才有 `hrag_*`**（未用时工具在全局视图中仍可见，等于当前测试态）。用法：把该文件的 `insert` 行并入 profile 的 `cordis.patch.yml`，在该行 `config.plugins` 里写本包 **`link:` 安装路径**（官方 preset 行的同款写法），并按需加 `defaultKbId` 配置。
- **kb_id 解析次序**：工具参数 ＞ 会话上下文 ＞ `defaultKbId`。会话级（现面 per-thread 绑库的对应物）由知识预设/面板（T3）持有，本阶段该级缺席、链条按原序降级（参数或默认）。
- **防同名遮蔽**：工具名统一 `hrag_` 命名空间；宿主按「视图（scope）」解析工具（`get(name, scope)`），agent 视角存在遮蔽面——命名空间是现状下的主防线。

## 形态

DSH 插件跑在两个世界，本包各有一个半：

```text
src/index.ts   Host 半（TS）──inject:['tools']── 五工具壳 ──HTTP──> Harness RAG knowledge 服务（Python，独立部署）
client.js      Client 半（JS 工厂）──inject:['slots','sidebarRightTabs','locale']── 右栏「知识库」tab（占位）
```

Host 半在宿主世界注册模型可见工具；Client 半在浏览器世界注册右栏 tab 类型（右栏「+」→ 引导页 → 「知识库」胶囊）。两半各自声明依赖，不能互吃对面世界的服务。

本包不含 RAG 逻辑；解析、切片、图谱、wiki、评测、存储全部在 Python 服务侧。

## 安装

前置：DSH（Node `^22.19.0 || >=24.0.0`）；Harness RAG knowledge 服务已起（默认 `http://127.0.0.1:8001`）。

```sh
dsh plugin --profile <name> add link:<本仓绝对路径>
# 或发布后：dsh plugin --profile <name> add dsh-harness-rag
```

重启该 profile 的 web 服务后生效。在 Plugins 页或 bundle 配置里填：

| 配置 | 说明 |
|---|---|
| `backendUrl` | knowledge 服务地址（默认 `http://127.0.0.1:8001`） |
| `apiToken` | 可选 Bearer token；空=不带鉴权头 |
| `defaultKbId` | 默认知识库 id；空=每次调用必须传 `kb_id` |

## 模型可见工具（`hrag_` 命名空间）

| 工具 | 说明 |
|---|---|
| `hrag_hybrid_search` | 混合检索：向量+稀疏融合、重排 |
| `hrag_graph_search` | 图谱检索：实体种子、跨章节结构证据 |
| `hrag_wiki_search` | wiki 检索：预消化条目+手动知识卡 |
| `hrag_list_documents` | 文档清单与状态计数 |
| `hrag_read_document` | 按 doc_id 分页读切片，或围绕 chunk_id 开窗续读 |

## 开发

```sh
pnpm install
pnpm run typecheck
```

改动后重装/重载插件（`link:` 开发安装的重建与重启要求见 DSH 插件管理文档）。Client 半是浏览器代码，改动后建议整重启桌面端生效。

已知占位件（T3/T6 收口）：插件清单 icon 未随包（回退默认图）；面板文案暂内嵌中英字典，正式 locale 命名空间随面板实装走。

## License

Apache-2.0
