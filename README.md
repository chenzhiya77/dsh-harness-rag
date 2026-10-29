# Harness RAG · DSH 插件

> **DeepSeek Harness（DSH）插件**：一套内置本地知识库——从文档 / 表格 / 视频的解析与切分，到实体图谱、wiki 条目、三路检索、文档感知、知识库管理与检索质量评测；默认自带本地知识服务（便携 Python、Qdrant、引擎），`backendUrl` 非空时走外部服务。
>
> **Harness RAG 是一套全链路双向联动的知识库。** 它以一套完整的对象模型为基座——文档、切片、实体与 wiki 条目都带完整的身份、来源、关系、状态与生命周期；每个下游对象都能指回它的源切片，每个索引项都能落回它的对象。向量、图谱、wiki 是这套对象的三种表示：写入时，编辑 / 重抽 / 删除 / 新增沿派生关系向下传播；读取时，三路检索沿来源关系向上回溯，再由文档感知工具枚举、定位、读回。
>
> **为什么是三路**：向量负责内容匹配、图谱负责信息关系、wiki 负责条目级线索；库里的文档与 wiki 条目可以直接枚举，不拿检索硬凑。命中切片随工具结果返回；绑定知识库的会话还会收到检索纪律（向量保底 / 图谱路 / 读取上限 / 拒答），人格与呈现仍归宿主。

<img src="docs/assets/rag/overview.png" width="1000" alt="Harness RAG 全链路概览：摄取 → 加工 → 三路检索">

## 📋 目录

- [插件由什么组成](#-插件由什么组成)
- [Harness RAG 提供什么](#-harness-rag-提供什么)
- [效果展示](#-效果展示)
- [快速开始](#-快速开始)
- [规模（实测）](#-规模实测)
- [状态](#-状态)
- [归属与许可](#-归属与许可)
- [插件操作手册（安装与部署）](docs/plugin-manual.md)

---

## 🧩 插件由什么组成

三块：宿主工具、浏览器面板、knowledge 服务。

### DSH 插件（host 半 + client 半）

两半各自声明依赖，不能互吃对面世界的服务：Host 半持有 `hrag_*` 工具、面板数据桥与摄取后台任务（含运行时的准备、启动与守护），Client 半只做右栏「知识库」tab 的渲染。

### Harness RAG（内置引擎）

解析、切片、嵌入、索引、图谱、wiki、评测与存储全部在 knowledge 服务侧。默认由插件托管：运行时落在 `<root>/runtime/<version>/`，数据落在 `<root>/state/`；`backendUrl` 非空时改走外部服务，不下载、不起进程。托管运行时的准备、版本化升级与回滚见[操作手册](docs/plugin-manual.md)的「升级与回滚」。

### 访问与安全边界

- **工具按会话挂载**：六件 `hrag_*` 只在会话绑定知识库后挂进该会话；解绑即从该会话的工具表消失，未绑定的会话没有这些工具。
- **agent 只读**：不存在 agent 侧的写入工具——上传、删除、触发解析、生成 wiki 都是人类操作。
- **数据落点**：托管模式的数据与 token 落在运行根（`state/`），面板不显示 token；外部模式的数据由外部服务持有，用 `apiToken` 保护知识服务。
- **命名空间隔离**：工具名 `hrag_*`、槽位标识 `dsh-harness-rag` / `harness-rag`、localStorage `hrag-*`、代理路由 `/dsh-harness-rag/api`，与其他插件零冲突面。

---

## 🔍 Harness RAG 提供什么

六块：摄取与解析、加工与联动、检索与文档感知、面板与可视化、质量闭环、模型配置与智能识别。完整参数与边界见[操作手册](docs/plugin-manual.md)。

### 摄取与解析

- **多格式**：MinerU 解析 PDF / Word / PPT / 图片，本地直读 `.md` / `.markdown` / `.txt`；CSV / Excel / TSV 统一归一为 GFM 表格——全部开启共 19 种后缀。
- **表格与图片**：Excel 逐 sheet 一张表，表头随切片保留；文档内图片由 VLM 配文并就地渲染。`.xlsx` / `.xls` 需要 `python-calamine`（托管运行时自带），门控与外部模式装法见手册。
- **视频**：`.mp4` / `.mov` / `.mkv` / `.webm`；语音、关键帧屏幕文字与分镜卡一起进切片。ASR 默认本地 funasr（可切 whisper），也可改用转录服务档；托管运行时不带 funasr / torch，需另装或走服务档。
- **解析可自建**：默认 MinerU 云；改自建 MinerU 4.x 服务只需填地址（轻客户端、不跑推理），档位 / 语言 / 模型版本等参数见手册。

### 加工与联动

- **结构感知切分**：`heading_path` 随切片落库；表格按表头锚定行组，拆成多张卡片时每张自带表头。
- **归一化与 wiki**：别名表 + 嵌入阈值合并实体；wiki 条目按「卫生门槛 + 跨 ≥2 切片」生成，脏条目增量重生成并回填新合格条目。
- **全链路传导**：知识入库后不是静态的——上游改动沿图谱与 wiki 向下传导：

| 上游动作 | 下游传播 |
| --- | --- |
| 编辑切片 | 就地重嵌入；实体保持不变，需重新理解时显式「重抽」 |
| 重抽切片 | 撤旧抽取 → 清孤实体 → 按当前文本重抽（不重解析源文件）→ 归一化 → 标脏 |
| 删除切片 | 级联：图谱贡献 → 孤实体向量 → wiki 失格链 → 向量点 → 业务行 |
| 新增文档 | 图谱腿重解析 → 相关条目标脏 → 增量重生成（并回填新合格条目） |
| 删除文档 | 三存储级联；高频实体标脏、跌阈实体失格 |

读侧沿同一条链上行——枚举文档与条目、按篇 / 按片读回、按实体 / 条目直取。加工步骤、阈值与并发约束见手册的「RAG 加工与索引」。

### 检索与文档感知

六件 `hrag_*` 共用同一条知识库绑定——三件检索找内容，三件只读工具直接枚举、定位与读回：

| 工具 | 解决什么 | 关键点 |
| --- | --- | --- |
| `hrag_hybrid_search` | 内容匹配 | dense + sparse → RRF → 重排；重排故障自动降级 |
| `hrag_graph_search` | 信息关系 | 问题理解或实体直取，1–2 跳 |
| `hrag_wiki_search` | 条目线索 | 整条正文，含自建「我的条目」 |
| `hrag_list_documents` | 枚举文档 | 状态 / 切片数 / 就绪计数 |
| `hrag_read_document` | 读回原文 | 按篇分页或按片续读；超长标 `truncated` |
| `hrag_list_wiki_entries` | 枚举条目 | 就绪 / 待更新计数 |

- 命中切片自带 `chunk_id` / `doc_id` / `chunk_index`，可继续读回；工具级拒绝走可读 message，不抛 404。
- **引用口径**：不向模型注入引用要求；引擎编号注记由插件剥离，字段随结果返回仅供核对；绑定会话获得检索纪律（向量保底 / 图谱路 / 语料边界 / 读取上限 / 拒答），人格与呈现仍归宿主。

### 面板与可视化

- **面板**：顶栏＝库选择器 +「会话」绑定 + ⋯ 菜单（上传 / 刷新 / 重命名 / 删除 / 项目仓库 / 功能模型设置）；六个 tab＝文档 / 图谱 / Wiki / 召回 / 投影 / 评测。文档表支持本地文件夹分组；面板可拖宽、分栏、全屏或浮动，中英双语，不内置对话。
- **每层可看**：文档表的逐路径解析状态、切片抽屉的 tick 轨、图谱的社区上卷、wiki 的源切片回看、召回的三路并列、投影的 2D / 3D、评测的题库与趋势——详见[效果展示](#-效果展示)。
- **检索叠加**：本会话每轮检索实时叠加到向量空间与知识图谱（hybrid 命中 → 投影星标，graph_search 轨迹 → 种子 / 扩展 / 证据三层染色 + 邻居高亮），增量更新、不重排布局；图谱与投影各有一枚「跟随会话」开关（缺省开、按库记忆）。

### 质量闭环

- **两层评测**：Layer-1 确定性 IR 指标（命中率 / 召回@k / MRR / 路径准确率）可复现；Layer-2 LLM 评分（RAGAS 忠实度 / 答案相关性 / 引用精度）只出报告、不设门禁。
- **题目生成**：选一篇或多篇文档联合出题，一次 1–10 道（默认 5），逐条采纳 / 忽略后才入库；入库前锚定核验，锚可事后修正。
- **运行可见**：三阶段进度（检索评测 / 答题评测 / 质量评估）可中止；趋势图按运行序出图，缺一次运行不会把两个时段压成相邻点。

### 模型配置与智能识别

- **聊天模型来自 DSH**：宿主侧 OpenAI 兼容代理 + `dsh:<provider>/<model>` 别名，provider 的 endpoint 与 key 留在 DSH；目录变化或插件激活时自动同步。
- **RAG 功能模型**：图谱抽取 / 评测裁判 / 说明生成 VLM / wiki 生成 / 考题合成等角色按组配置，每个角色可选推理等级；嵌入 / 重排 / ASR / Qdrant / MinerU 同页。
- **智能识别**：粘贴厂商截图或配置文本，选一个 DSH 视觉模型，识别并回填非密钥字段；分批只合并不清空，冲突需「改用本次」，只写表单草稿、不自动保存；文本本地打码，截图无法打码且会落入附件库。
- 提供商矩阵、嵌入维度与重建索引、连通 / 维度探针等完整参数见[操作手册](docs/plugin-manual.md)的「RAG 功能模型与提供商」。

---

## 🖼️ 效果展示

七个界面入口，从解析、检索到评测与模型设置。

### 文档与解析

上传后逐路径解析状态（向量 / 图谱 / wiki 三条腿；视频文档另有「语音 / 分镜 / 配文」三条预处理腿），失败可就地重试；点开文档即进入切片抽屉。
<img src="docs/assets/screens/docs-overview.jpg" width="1000" alt="文档 tab：逐路径解析状态与文档全貌">

<details>
<summary>展开截图：文档入库 / 初始状态 / 逐路径状态 / 视频文档 / 文档切片 / PDF 解析 / 文档页设置（7 张）</summary>
<img src="docs/assets/screens/docs-ingest.jpg" width="1000" alt="文档入库">
<img src="docs/assets/screens/docs-initial.jpg" width="1000" alt="初始状态">
<img src="docs/assets/screens/docs-status.jpg" width="1000" alt="逐路径状态">
<img src="docs/assets/screens/docs-video.jpg" width="1000" alt="视频文档">
<img src="docs/assets/screens/docs-document.jpg" width="1000" alt="文档切片">
<img src="docs/assets/screens/docs-pdf.jpg" width="1000" alt="PDF 解析">
<img src="docs/assets/screens/docs-settings.jpg" width="1000" alt="文档页设置">
</details>

### Wiki：生成条目 / 我的条目

AI 按实体资格自动沉淀「生成条目」；用户自建的「我的条目」与 AI 完全隔离、永不自动更新，可一键「混入搜索」参与检索；条目编辑内容还会作为后续重生成的「生成方向」。
<img src="docs/assets/screens/wiki-showcase.jpg" width="1000" alt="Wiki tab：生成条目与我的条目">

<details>
<summary>展开截图：wiki 自动更新 / wiki 定向生成 / wiki 直接命中（3 张）</summary>
<img src="docs/assets/screens/wiki-auto-update.jpg" width="1000" alt="wiki 自动更新">
<img src="docs/assets/screens/wiki-targeted.jpg" width="1000" alt="wiki 定向生成">
<img src="docs/assets/screens/wiki-direct.jpg" width="1000" alt="wiki 直接命中">
</details>

### 检索测试：三路命中对比

一条查询同时跑向量 / 图谱 / wiki 三路，命中并列展示（含跨路耗时排名），结果可一键存为评测题。
<img src="docs/assets/screens/recall-overview.jpg" width="1000" alt="召回测试：三路命中对比">

<details>
<summary>展开截图：三路命中切换（1 张）</summary>
<img src="docs/assets/screens/recall-switch.jpg" width="1000" alt="三路命中切换">
</details>

### 向量空间

切片 / 实体 / wiki / 条目四类点的 2D / 3D 投影；检索命中实时叠加到图上。
<img src="docs/assets/screens/vector-2d.jpg" width="1000" alt="向量空间 2D 投影与检索叠加">

<details>
<summary>展开截图：3D 投影（1 张）</summary>
<img src="docs/assets/screens/vector-3d.jpg" width="1000" alt="向量空间 3D 投影">
</details>

### 知识图谱

实体关系力导向图，社区层可上卷看全局；检索路径按种子 / 扩展 / 证据三层染色，叠加不重排布局。
<img src="docs/assets/screens/graph-thumb-1.jpg" width="1000" alt="知识图谱与检索路径染色">

<details>
<summary>展开截图：图谱缩略 2 / 图谱缩略 3 / 实体详情（3 张）</summary>
<img src="docs/assets/screens/graph-thumb-2.jpg" width="1000" alt="图谱缩略 2">
<img src="docs/assets/screens/graph-thumb-3.jpg" width="1000" alt="图谱缩略 3">
<img src="docs/assets/screens/graph-entity.jpg" width="1000" alt="实体详情">
</details>

### 评测

题库（可由 AI 从文档生成候选、人工采纳）+ 指标总览 + 趋势图；运行中可见三阶段进度，支持中止。
<img src="docs/assets/screens/eval-overview.jpg" width="1000" alt="评测页指标总览与趋势">

<details>
<summary>展开截图：题库总览 / 题目生成 / 评测历史（3 张）</summary>
<img src="docs/assets/screens/eval-question-bank.jpg" width="1000" alt="题库总览">
<img src="docs/assets/screens/eval-generate.jpg" width="1000" alt="题目生成">
<img src="docs/assets/screens/eval-history.jpg" width="1000" alt="评测历史">
</details>

### 模型设置

聊天模型由 DSH 提供、自动同步；RAG 功能模型按角色分组（图谱抽取 / 评测裁判 / 说明生成 VLM / wiki 生成 / 考题合成），嵌入、重排、解析与重建索引都在「功能模型设置」里完成。
<img src="docs/assets/screens/models-quick-1.jpg" width="1000" alt="功能模型设置：模型快速配置">

<details>
<summary>展开截图：向量模型 / 功能模型 / 解析配置（3 张）</summary>
<img src="docs/assets/screens/models-quick-2-embedding.jpg" width="1000" alt="向量模型">
<img src="docs/assets/screens/models-quick-3-functional.jpg" width="1000" alt="功能模型">
<img src="docs/assets/screens/models-quick-4-parse.jpg" width="1000" alt="解析配置">
</details>

---

## 🚀 快速开始

GitHub 安装可用（钉 tag `v0.1.2`，不要跟 main）；npm 包尚未发布：

```sh
# 本地目录（开发安装，改码即被读取）
dsh plugin --profile <name> add link:<本仓绝对路径>

# GitHub（钉 tag；运行时包从同仓 Release 下载）
dsh plugin --profile <name> add git+https://github.com/chenzhiya77/dsh-harness-rag.git#v0.1.2

# npm（发布后可用）
dsh plugin --profile <name> add dsh-harness-rag
```

三种方式装的是同一份插件代码，首次运行面完全一致。装完重启该 profile 的 DSH，打开右栏「知识库」tab：

1. **确认位置** — 默认 `<DSH_HOME>/harness-rag`（`DSH_HOME` 缺省 `~/.dsh`），可点「更改…」选父目录，实际根为 `<父目录>/harness-rag`。
2. **开始准备** — 下载运行时包（约 471 MB）并解压（约 1.2 GB），随后启动内置 Qdrant 与知识服务；首次约 1–2 分钟，之后启动为秒级。
3. **配置嵌入模型** — 未配置时点上传或拖入文件会被拦下并提示「去配置」；在「功能模型设置」里选嵌入模型（或用顶部「智能识别配置」粘贴厂商控制台截图自动填入）后即可上传文档。

平台：首期只提供 **Windows x64** 运行时包；其他平台安装后会在面板明确报「没有可用的运行时包」，此时改用外部服务（见操作手册）。

完整部署、运行根、外部模式、升级回滚、清理卸载与运行时包构建见 [插件操作手册](docs/plugin-manual.md)。

---

## 📊 规模（实测）

| 项 | 数量 |
| --- | --- |
| 插件 Host 半 `src/` | 30 个 TS 文件、8,340 行 |
| 插件 Client 半 `client.js` | 24,300 行 |
| 插件测试 `tests/` | 23 个测试文件 |
| 引擎知识核心（知识库模块） | 72 个 Python 文件 |
| 引擎知识测试 `engine/backend/tests/knowledge/` | 104 个测试文件、1,587 个 `def test_`（静态计数） |

---

## ✅ 状态

| 部分 | 状态 |
| --- | --- |
| 工具面（三检索＋文档两件＋wiki 清单） | 已实装（六件契约与主树工具组对齐） |
| 右栏「知识库」管理面板 | 已实装 |
| 功能模型设置（智能识别 / 厂商入口 / 重建索引） | 已实装 |
| 摄取后台任务 | 已实装 |
| 运行时准备 / 就绪 / 重试 / 版本化升级 / 回滚 / 嵌入模型引导 | 已实装 |
| GitHub 安装入口 | 已发布（v0.1.2） |
| npm 安装入口 | 待发布 |

---

## ⚖️ 归属与许可

- 插件基于 **DeepSeek Harness**（<https://github.com/deepseek-ai/deepseek-harness>，MIT）的插件 API。
- 引擎内包含第三方 MIT 框架代码，其版权声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
- 本仓库为独立项目，非任何上游官方发布。
