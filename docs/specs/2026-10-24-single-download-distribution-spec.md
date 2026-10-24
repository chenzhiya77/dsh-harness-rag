# 单一下载分发（插件自带本地运行环境） —— spec

**Status:** 已拍·实施中（2026-10-25；D1–D15 全甲，Task 0 落点核实完成）
**Date:** 2026-10-24
**来源:** 10-24 他问「当前的插件有两个文件夹……用户下载插件肯定是只下载一个插件，后端不能放在插件文件夹中吗」；随后明确目标是「用户只需要点击下载插件就能下载完全部的东西，可以直接使用」，并问 DSH 插件发布在哪、是否有官方市场；确认方向后令起 spec/plan。
**承接:** 现行部署两件式（[README.md](../../README.md) §安装/§后端最小形态，`README.md:40-69`）；配置默认值 `src/settings.ts:15-19`；后端地址的唯一消费面 `src/http.ts:29-48` 与 `src/kb_proxy.ts:395/450/543`；引擎路径环境变量 `engine/backend/packages/harness/deerflow/config/runtime_paths.py`（并入单仓后的位置）。
**配套 plan:** [../plans/2026-10-24-single-download-distribution-plan.md](../plans/2026-10-24-single-download-distribution-plan.md)

## 1. 范围

把「装插件 → 自己找引擎仓 → 装 Python/uv → 起 Qdrant → 填 backendUrl」收敛成「装一个插件，首次在面板里确认位置，由插件准备本地运行环境」。本对四件：

1. **薄 npm 包**：`dsh-harness-rag` 只带插件两半、配置模板与一份运行时清单（`runtime.json`）；不含 Python、依赖、Qdrant、引擎源码。
2. **平台运行时包**：Windows x64 一个 zip，内含便携 Python、预装 site-packages、引擎源码、Qdrant 二进制、许可证与清单；发在 GitHub Releases，首次在面板确认位置后由插件下载。
3. **host 半引导与守护**：位置选择、下载、校验、解压、落配置、选端口、起 Qdrant 与 knowledge 服务、健康检查、日志、退出清理、升级切换；全部在 Node 侧，不依赖 postinstall。
4. **面板首次运行面**：首次设置卡（默认位置＋更改＋开始）、准备进度/失败重试、就绪后「嵌入模型未配置」引导；不改六 tab 的功能面。

**不包含**：本地嵌入模型（真正零配置的摄入）、macOS/Linux 运行时包、系统级常驻服务、官方市场收录、把现有开发栈数据自动迁入托管实例。

## 2. 现状与依据

### 2.1 当前是两件式部署

- 迁移前是两个本地仓：插件仓 70 个跟踪文件 / 2.2 MB；引擎仓 1082 个跟踪文件 / **25.9 MB**（`docs/` 18 MB、`backend/` 11 MB）。两者都无 remote。本对把引擎并入插件仓的 `engine/`（§4.8）。
- 插件仓的 npm 包基线实测 21 个文件 / 307.6 kB tarball / 1.2 MB 解包（`npm pack --dry-run`，2026-10-25）；引擎跟踪面实测 1082 文件 / **25.9 MB**（docs 18 MB、backend 11 MB），而引擎仓 `.git` 为 172 MB（pack 135 MB / 7.5 万对象）。`git subtree add --squash` 实测 42 s、gc 后 `.git` 16 MB（快照提交同为 16 MB），并入方式见 §4.8，默认不保留完整历史。
- 引擎本机 `.venv` 953 MB、`site-packages` 896 MB；Task 0 用 `uv pip sync --target` 建的目录式站点包实测 **808 MB / 369 个顶层项**。大头 `llvmlite` 116 MB、`scipy` 98 MB、`pyarrow` 84 MB、`pandas` 45 MB、`speech_recognition` 43 MB、`sklearn` 33 MB、`onnxruntime` 33 MB。
- 现行 README 要求先 `cd <harness-rag>/backend && make gateway`（内含 `uv sync --inexact --extra umap`），并自备 Python 3.12、uv、外部 Qdrant、四份配置文件（`config.yaml`/`models_config.json`/`rag_config.json`/`.env`）。这对「只点一次下载」的用户不成立。

### 2.2 DSH 插件安装与市场（0.2.1-rc.2 实读）

| 事实 | 依据 | 对本案的含义 |
|---|---|---|
| 安装＝在 profile 目录跑 `pnpm add`，注册表目标 `saveExact` | `dsh-plugin-manager` README | npm 包名＋版本是稳定安装面 |
| 版本准入看 `engines.dsh` 与 peer 包；registry 名/本地路径**在 pnpm 运行前失败、不下载**；Git 地址/tarball 装完后才判断，失败回滚 manifest/lock | `dsh-plugin-manager` README §install | `engines.dsh` 是发布必填件，范围在 Task 0 钉；Git 安装的版本准入属事后回滚 |
| pnpm 11 拦依赖构建脚本；需用户在插件页批准后重试 | 同上 | **不能把首启准备放在 postinstall** |
| 插件 Host 代码在宿主进程内运行，不受工作区沙箱限制 | 同上 | `child_process`/`fs`/`fetch` 可用（Task 0 实证） |
| Desktop 的包管理操作由 Desktop shell 负责 | 同上 | 插件只能假设「装完即加载」，不能假设安装器会跑 |
| 市场是**用户配置的索引 URL**；默认 `indexes: []`，随附 profile 不启用该组合包 | `dsh-plugin-market` README | 没有「官方默认市场」可依赖；自建索引是可行路径 |
| 索引格式 1：`format/title/metadata/plugins`；版本带 `source{npm｜git}`、`engines`；安装目标由 `marketInstallTarget` 生成 | `dsh-plugin-market-index` 源码 | 索引可校验、可托管；不支持升级（先卸后装） |
| 索引不签名、不校验包内容 | 同上 | 完整性靠 npm 包自身与包内 sha256 |

补充：npm 名 `dsh-harness-rag` 在 2026-10-24 查为未占用（`registry.npmjs.org` 返回 404）；发布前需复核。

### 2.3 引擎的可搬运性

- 路径全部可被环境变量接管：`DEER_FLOW_PROJECT_ROOT`（运行时文件根）、`DEER_FLOW_HOME`（可写状态根）、`DEER_FLOW_CONFIG_PATH`、`DEER_FLOW_MODELS_CONFIG_PATH`、`DEER_FLOW_RAG_CONFIG_PATH`（`runtime_paths.py:9-33`；`app_config.py:517-544`；`models_config.py:109-150`；`rag_config_file.py:189-218`）。
- `models_config.json`/`rag_config.json` 的写目标优先 `*_CONFIG_PATH`，缺省回落 `project_root()`（`rag_config_file.py:311-318`、`routers/models.py:733`）；本设计三份路径都显式设置，所以配置能跨运行时升级保留。
- 状态库默认 `sqlite_dir: .deer-flow/data`，由 `DEER_FLOW_HOME` 决定（`get_paths().base_dir`）；knowledge 数据在 `get_paths().base_dir / "data"`（`knowledge_app.py` lifespan）。
- 健康面：`GET /health` 返回 `{"status":"healthy","service":"harness-rag-knowledge"}`（`knowledge_app.py:167-169`）。
- 鉴权：默认必须配置 token，只有显式 `DEER_FLOW_AUTH_DISABLED=1` 才允许免鉴权（`knowledge_app.py:63-64` 的启动闸；实现在 `api_token_auth.py`）。托管模式不能走 auth-off。
- Python 要求 `>=3.12`；`uv` 支持 `python install --install-dir` 与 `pip install --target`（本机 uv 0.11.2 实核帮助），可做「便携解释器 + 纯目录 site-packages」。
- DSH 自带的 `~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python`（3.12.14）只带宿主文档处理依赖，不装第三方包；本设计不复用它，避免污染宿主运行时（理由见 §2.6）。

### 2.4 平台件与体积（2026-10-24 实查）

| 件 | 版本 | 体积 | 许可 |
|---|---|---|---|
| Qdrant Windows x64 | v1.20.0 `qdrant-x86_64-pc-windows-msvc.zip` | 30,801,664 B（解压 `qdrant.exe` 87 MB） | Apache-2.0 |
| uv Windows x64 | 0.11.2（本机实核；构建脚本钉此版本） | 14.6 MB | Apache-2.0/MIT（构建期用，可不入包） |
| 便携 Python | 3.12.13（`uv python install` 实测：下载 20.8 MiB、落盘 70 MB） | 70 MB 解压 | PSF-2.0 |
| 预装 site-packages | `uv export --extra umap` + `uv pip sync --target` 实测 | 369 顶层项 / 808 MB（本机 `.venv` 953 MB），zip 约 300–450 MB | 各 wheel 自带许可 |
| 引擎源码 | 2.1.0（`feat/rag-knowledge-base` @ `b34b2d572`） | 25.9 MB / 1082 文件 | MIT |

结论：运行时包合理量级 **约 350–500 MB 下载 / 约 1.2 GB 落盘**（Python 70 MB + site-packages 808 MB + Qdrant 87 MB + 引擎 26 MB）；不应塞进 npm 包。构建机需 ≥3 GB 临时余量（本机实测 E: 3.7 GB、C: 1.8 GB、D: 21 GB）。

### 2.5 发布面

- 安装入口不只有 npm：DSH 的「添加插件」明确接受包名、GitHub 仓库地址或本地目录路径；**仓库根是合法 DSH 包时，可以直接从 GitHub 装**。市场索引是「发现」层，安装仍走 npm 或 git。
- DSH 目前**没有默认官方索引**；讨论区 #2004 是「Show Your Plugins」的展示规范（置顶/锁定、按 upvote 排序、非官方背书），不是发布或安装通道；GitHub `dsh-plugin` topic 是仓库聚合，不是市场。
- 因此本案的发布件是：npm 包 + 自建索引 JSON（形态 1）+ 同仓 GitHub Releases 运行时包；GitHub 仓库地址是 npm 之外的安装入口，官方收录与社区索引提交属外部动作。

### 2.6 为什么运行时不放进插件目录

插件目录是 profile 的 `node_modules` 依赖面：pnpm store 硬链接、卸载即删、升级整包替换、备份/杀软会反复扫描。往里写 1 GB 运行时与用户数据，会同时破坏「依赖可变」与「数据不可变」两条边界。正确切分是：

- **代码**（插件两半、清单）在插件包；
- **运行时**（Python、依赖、Qdrant、引擎源码）在按版本命名的 home 目录；
- **配置与数据**在 home 的稳定子目录，跨插件升级与重装保留。

引擎源码也不放进 npm 包：它 5 MB 且与运行时包同一构建批次；放进包里会让每次引擎小改都要求插件发版，且 npm 包不再平台中立。

DSH 自带的 Python 运行时（`~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python`，3.12.14）同样不复用：它只装宿主的文档处理依赖，不装第三方包；往里写约 810 MB 站点包会污染宿主升级面、牵连其他插件，也会让本服务与宿主 Python 版本绑死。独立运行时换来可预期的升级、卸载与回滚边界，代价是多一次下载（已在 §2.4 计入体积）。

## 3. 决策表

### D1 —— 分发形态（拍定：甲＝薄包＋自动下载运行时包）

- **甲（拍定）**：npm 包不带运行时；首次使用由插件下载平台包（300–450 MB），用户动作仍只有「安装插件」一次。
- 乙（不做）：引擎源码塞进 npm 包、其余仍下载——省不了运行时包，只多一条双版本同步线。
- 丙（不做）：全塞 npm（含 Python/依赖/Qdrant）——包过大、镜像与 pnpm store 不友好、安装超时面大。

### D2 —— 安装器落点（拍定：甲＝host 半首次激活）

- **甲（拍定）**：`apply()` 异步启动引导；不注册 postinstall、不要求用户批准构建脚本、不依赖 Desktop shell 的安装钩子。
- 乙（不做）：postinstall——pnpm 11 默认拦截，且 Desktop 包管理不由插件掌控。
- 丙（不做）：独立安装器 exe——多一次用户动作，还要自己解决分发与更新。

### D3 —— Python 运行方式（拍定：甲＝便携解释器＋纯目录 site-packages）

- **甲（拍定）**：运行时包内放便携 Python 与构建期 `uv pip install --target` 装好的 `site-packages/`；启动用 `PYTHONPATH`，不建 venv、不装 pip、不要求系统 Python。
- 乙（不做）：在线 `uv sync`——首启依赖网络与解析，失败面大。
- 丙（不做）：构建期 venv + 解压后改 `pyvenv.cfg`——可做但路径敏感，留作 Task 0 失败时的退路。

### D4 —— 向量库（拍定：甲＝内置 Qdrant Windows 二进制）

- **甲（拍定）**：包内 `qdrant.exe`，以回环地址与独立 storage 路径托管；不要求 Docker。
- 乙（不做）：依赖 Docker Desktop——重前置，与「直接使用」冲突。
- 丙（不做）：用户自备 Qdrant——回到手工部署。

### D5 —— 服务生命周期（拍定：甲＝插件托管、进程级单例）

- **甲（拍定）**：host 半起停 Qdrant 与 knowledge 服务；`globalThis` 单例跨 HMR 复用；正常退出停子进程，崩溃遗留下次启动按 token 认领，不按 pid 盲杀。
- 乙（不做）：文档教用户手动起服务。
- 丙（不做）：注册 Windows 系统服务/开机自启——范围外，且桌面应用不需要常驻。

### D6 —— 端口（拍定：甲＝默认口优先、占用自动改口、不接管外部进程）

- **甲（拍定）**：Qdrant 先试 6333/6334、knowledge 先试 8020；被占则取空闲口并把实际地址写入配置与 `service.json`。对**端口占用者**不认领、不终止；仅对 `service.json` 记录且 token 校验通过的本 home 实例才认领。
- 乙（不做）：固定口占用即报错。
- 丙（不做）：全随机口——日志与排障不友好。

### D7 —— 托管判定（拍定：甲＝`backendUrl` 为空即托管）

- **甲（拍定）**：`backendUrl === ''` ⇒ 托管；非空 ⇒ 外部模式（现行行为）。新装 `cordis.patch.yml` 默认写空；既有安装保留原值，不受影响。
- 乙（不做）：新增 `runtimeMode` 配置——多一个概念，收益为零。

### D8 —— 鉴权（拍定：甲＝随机 token，仅存 home）

- **甲（拍定）**：首启生成 32 字节随机 token，存 `<home>/state/service.json`（用户级目录，不写日志、不进配置、不进面板）；子进程以 `DEER_FLOW_API_TOKEN` 注入，host 请求自动带 Bearer。
- 乙（不做）：`DEER_FLOW_AUTH_DISABLED=1`——把「本机可用」降成无鉴权，且与引擎默认姿态冲突。
- 丙（不做）：固定 token——等于无鉴权。

### D9 —— 落点（拍定：甲＝`<DSH_HOME>/harness-rag`，首启可改父目录）

- **甲（拍定）**：分两层——**锚点根**固定 `<DSH_HOME>/harness-rag`（`DSH_HOME` 空白串视同未设、缺省 `~/.dsh`，照宿主 `dsh-home-paths` 规则），放 `location.json`（约 100 B）与既有 `bindings.json`；**运行根**默认等于锚点根，首启可在面板里改选父目录（插件追加 `harness-rag`），放 `runtime/`（按版本）、`state/`（数据、日志、service.json）、`config/`（三份配置）。锚点根不随运行根迁移。
- 乙（不做）：只认 `DSH_HOME`、不提供面板选择——换位置要改环境变量并整体迁移，不满足「打开面板时能选」。
- 丙（不做）：`%LOCALAPPDATA%` 或插件目录——前者与 DSH 主目录约定不一致，后者见 §2.6。

### D10 —— 首启触发（拍定：甲＝首次打开面板先设置、确认后准备）

- **甲（拍定）**：首次（无 `location.json` 且无已装运行时）在**有客户端世界**的宿主上不自动下载；面板显示设置卡——默认运行根已填、可改、显示体积与磁盘要求，点「开始准备」才下载。**无客户端世界（headless/纯 CLI）不显示也无法显示设置卡 ⇒ 首次直接用默认运行根准备**，位置写进工具错误与日志，不让用户卡住。已有配置的后续启动在激活时静默准备/认领，不阻塞 DSH 启动。
- 乙（不做）：激活即下载——用户没机会选位置，也不清楚 400 MB 去了哪。
- 丙（不做）：等首次工具调用——模型侧要等几分钟，体验更差。

### D11 —— 升级/回滚（拍定：甲＝版本化目录＋健康后切换）

- **甲（拍定）**：运行时按版本落目录，`state/current.json` 指当前；新包完整就绪且健康后才切；新版本起不来自动回上一版；更老的版本在下次成功升级后清理。
- 乙（不做）：原地覆盖——升级失败即无服务可用。

### D12 —— 发布（拍定：甲＝npm＋自建索引＋GitHub Releases）

- **甲（拍定）**：单仓发布——npm 包（薄）＋索引 JSON（形态 1，用户添加一次）＋同仓 GitHub Releases 运行时包。安装入口三种：npm 包名、GitHub 仓库地址（仓库根就是插件包）、本地目录；CLI 用 `dsh plugin add dsh-harness-rag` 或 `git+https://…`。
- 乙（不做）：只发 npm——发现面缺失。
- 丙（不做）：只发索引＋git 安装——插件升级与运行时包分发都更绕。

### D13 —— 平台（拍定：甲＝Windows x64 一期）

- **甲（拍定）**：清单按 `win32-x64` 提供；其他平台给出「暂不支持托管，请填 backendUrl」的明确错误。macOS/Linux 的 Qdrant/Python 资产存在，差的是 CI 与验证。
- 乙（不做）：三平台同期——验证面翻三倍，不解决当前问题。

### D14 —— 模型口径（拍定：甲＝服务就绪≠嵌入模型就绪）

- **甲（拍定）**：本对保证服务起得来、DSH 聊天模型自动同步、面板可管理；嵌入模型仍需在既有设置里选/填 key，未配置时面板给一条引导。真正零配置的摄入另立「本地嵌入」spec。
- 乙（不做）：本对内置本地嵌入模型——要新增引擎 provider、模型文件与下载链，范围翻倍。

### D15 —— 位置选择（拍定：甲＝复用宿主目录选择器）

- **甲（拍定）**：设置卡的「更改…」调 host 的 `ctx.directoryPicker.capability().pick(signal)`（工作区「添加工作区」同款原生选择器）；选父目录，插件追加 `harness-rag`。选择器不可用（远程 Web 只有 browse 能力）⇒ 退回手输绝对路径；两种入口做同一套校验。无客户端世界的纯 CLI/headless 不走设置卡，见 D10。
- 乙（不做）：自绘目录浏览器——重复宿主已有能力。
- 丙（不做）：只让用户改 `DSH_HOME`——要重启，且不是「打开面板时能选」。

## 4. 口径

### 4.1 目录布局

```text
<DSH_HOME>\harness-rag\             # DSH_HOME 缺省 ~/.dsh
├── location.json                   # 自定义根的锚点（仅约 100 B）
├── bindings.json                   # 既有会话绑定（不动）
├── runtime\
│   └── <runtimeVersion>\           # 解压即用的运行时包
│       ├── python\                 # 便携 Python 3.12
│       ├── site-packages\          # 构建期 --target 装好
│       ├── engine\backend\         # 引擎源码（PYTHONPATH）
│       ├── engine\config.example.yaml  # 首启 config.yaml 的种子
│       ├── qdrant\qdrant.exe
│       ├── runtime-manifest.json
│       └── THIRD_PARTY_NOTICES.md
├── state\
│   ├── data\                       # DEER_FLOW_HOME：sqlite、上传、知识库数据
│   ├── qdrant\                     # Qdrant storage
│   ├── qdrant-snapshots\           # Qdrant snapshots
│   ├── logs\{engine,qdrant}.log
│   ├── service.json                # 端口/token/runtimeVersion/启动时间
│   ├── lease.json                  # 跨进程单写者租约
│   └── current.json                # 当前版本 + 上一版
├── config\
│   ├── config.yaml
│   ├── models_config.json
│   └── rag_config.json
└── downloads\                      # *.part 断点文件
```

- 上树是「运行根 = 锚点根」的默认情形；自定义运行根时，锚点根只保留 `location.json` 与 `bindings.json`，`runtime/`、`state/`、`config/` 全在运行根。
- 根解析：`location.json.root`（存在、绝对、可写探针通过、非系统目录）优先，否则默认运行根 `<DSH_HOME>/harness-rag`；锚点**固定写在锚点根**，不随运行根移动；坏 JSON/读不到 ⇒ 回落默认运行根并提示一次。不做 Windows ACL 归属判定（只做路径与可写性校验）。
- **锚点存在但目标目录不存在/不可写 ⇒ `needs_location` 并说明原因**（「上次的位置不可用」），不静默回默认根；用户可重选或改回默认。**目标目录可用、只缺运行时（如下载失败）⇒ 留在 `error` + 重试，不重新弹设置卡。**
- 改 `DSH_HOME` 会换一个锚点根；旧的自定义运行根不会自动找回，需重选或手工拷 `location.json`。
- 位置选择在首次准备前开放；若尚未生成 `state/current.json`（如下载失败），`error` 卡仍可「更改位置」并改写锚点。已装运行时后换根 = 手工迁移（整体拷 `runtime/`、`state/`、`config/` 到新根并改锚点），本对不做自动迁移。每次启动重写 `database.sqlite_dir` 与 `qdrant_url` 两个键（其余键保留），所以整体拷贝不会留下旧绝对路径。
- **「本插件数据」的判据**：目标目录含 `bindings.json`、`location.json` 或 `runtime/<v>/runtime-manifest.json` 任一；都没有则视为外来目录并拒绝。
- 托管模式拥有 `config/config.yaml` 的 `database.sqlite_dir` 与 `config/rag_config.json` 的 `qdrant_url`；面板设置页在托管模式把「Qdrant 地址」锁为只读并注明「由内置服务管理」（设置页需为此加一个只读态）。
- `runtimeVersion` 形如 `2.1.0-1`，只允许 `[0-9A-Za-z._-]`；目录名即版本，升级不覆盖旧目录。
- `config/` 与 `state/` 不在版本目录内，重装/升级不丢。
- **拒绝** UNC/网络盘与嵌套在锚点根内的父目录；OneDrive 等同步盘给红字说明并要求二次确认（Qdrant/SQLite 在同步盘上易锁冲突），README 提醒放本地盘。

### 4.2 首次运行流水线

1. `backendUrl` 非空 ⇒ 直接外部模式，以下全跳过。
2. 解析根：有 `location.json` 且目标可用 ⇒ 用它（目标存在、可写、只缺运行时 ⇒ 直接走下载；失败进 `error`/重试，不弹设置卡）；锚点存在但目标缺失/不可写 ⇒ `phase:'needs_location'` + 原因；无锚点且无已装运行时 ⇒ 有客户端世界出设置卡（`needs_location`），无客户端世界直接用默认运行根准备。两种情况都不静默改根。
3. `runtime/configure({ parent })`：校验后**先创建运行根、`downloads/`、`config/`、`state/{data,logs,qdrant}`**、再写锚点（默认运行根不用写也能工作，写一次便于口径统一）；校验项——绝对路径、父目录可创建/可写（写探针文件）、剩余空间 ≥ `size + unpackedSize × 1.1`、Windows 路径长度、拒绝插件目录/node_modules、拒绝 UNC/网络盘与嵌套在锚点根内的父目录、同步盘二次确认。目标 `<parent>/harness-rag` 已存在且不含本插件标记（§4.1）⇒ 报错，不覆盖。
4. 读 `state/service.json`：有记录则用 token 请求 `GET /api/knowledge-bases`；200 即认领（当前会话直接可用），版本不同则本次先认领、下次启动再切。
5. 无可用实例 ⇒ 校验 `runtime.json` 的当前平台条目（URL、size、sha256、unpackedSize）；缺失/占位（URL 为空或 size 为 0）/平台不支持 ⇒ `error`，文案指向「填写 backendUrl」。
6. 运行时目录不存在 ⇒ 下载（支持 `.part` 断点与备用下载地址列表）→ 校验 sha256 → 解压到 `runtime/<version>.tmp` → 原子改名 → 写 `current.json`。若 `runtime/<version>` 已存在但缺 `runtime-manifest.json`（上次解压中断），删掉重解压，不直接复用半成品。
7. 选端口（Qdrant HTTP/GRPC、knowledge），生成/修补 `config/rag_config.json` 的 `qdrant_url` 与 `config/config.yaml` 的 `database.sqlite_dir`（只这两个键，其余保留）。探空到 spawn 之间若被抢端口（bind 失败），换下一个空闲口重试一次。
8. 起 Qdrant（回环、独立 storage；环境含 `QDRANT__SERVICE__HOST=127.0.0.1`、HTTP/GRPC 端口、`QDRANT__STORAGE__STORAGE_PATH=<root>/state/qdrant`、`QDRANT__STORAGE__SNAPSHOTS_PATH=<root>/state/qdrant-snapshots`、`QDRANT__TELEMETRY_DISABLED=true`），等 `/readyz`；起 knowledge 服务（回环、注入 token、五个路径环境变量与解析后的代理环境），等 `/health` 与带 token 的 `/api/knowledge-bases`。
9. 写 `service.json`；`runtime/status` 转 `ready`；触发一次 `modelSync.syncNow()`。
10. 任一步失败 ⇒ `error` + 阶段 + 日志尾部；面板可「重试」。

### 4.3 服务守护

- 单例：`globalThis.__hragRuntime` 持有 supervisor；HMR 重载复用，`dispose` 后 5 秒内无新实例接管才停服务，避免开发期反复重启。
- 起停：Qdrant 与 knowledge 都经 **`ctx.subprocess.spawn`**（Windows 用 kill-on-close Job、`windowsHide`；子环境由 `scrubbedParentEnv` 自动带代理并剥凭据/`DSH_*`，显式 `env` 最后并入）。插件不能直接 import `dsh-http-proxy`（loader 的 peer 面只有 `dsh-tools` + `cordis`），所以不要走裸 `child_process`，否则 `.env` 里的代理到不了子进程。
- 退出：Node `exit`/`SIGINT`/`SIGTERM` 时**尽力**终止（`ctx.subprocess` 的 Job 句柄关闭会带走整棵树；裸 `taskkill /T` 是异步子进程，不能保证在 exit 前完成）；下次激活按 `service.json` 认领/清理。认领来的实例不视为自己所有，正常退出不杀；只有确认 pid 与可执行路径都在本 home 的 `runtime/` 下、且没有其他宿主持有租约时才清理。核对失败不杀，只记日志。
- 跨进程：`state/lease.json` 单写者租约（pid/token/心跳）；第二个宿主发现租约有效则只认领、不启动、不杀别人的子进程；租约陈旧（pid 不存在/心跳超时）才接管。
- 下载：插件 dispose 或 DSH 退出时 abort 下载并保留 `.part`，下次续传。
- 日志：两服务 stdout/stderr 落 `state/logs/*.log`，单文件 5 MB、保留 2 份；`status` 只回路径与尾部 20 行。
- 崩溃：子进程退出即置 `error` 并记录退出码；下一次激活重新走流水线（认领或重启）。
- 不写注册表、不开机自启、不占系统服务。

### 4.4 下载、校验与空间

- URL 只接受 `https:`（开发覆盖除外）；按清单顺序尝试**下载地址**（主地址 + 备用镜像/对象存储），每个都校验 `size` 与 `sha256`。这里的「镜像」是运行时 zip 的直链，**不是**截图里 DSH 的 npm「安装源」。开发覆盖的唯一机制 = 环境变量 `DSH_HARNESS_RAG_PACK=<本地 zip>`（只读本地文件，发布版不启用）。
- 断点：`downloads/<name>.part` 存在时发 `Range: bytes=N-`；服务端回 200 则从头覆盖，回 206 则续写；完成后整体校验。
- 解压：**选 `yauzl` 3.4.0**（依赖仅 `pend`、无安装脚本）。它自带的校验会拒绝 `../evil.txt`（`invalid relative path`）与 `C:/evil.txt`（`absolute path`），并把 `sub\evil.txt` 归一为 `sub/evil.txt`；`fflate` 0.8.3 原样返回越界名，不选。我方仍保留逐条「解析后必须落在目标目录内」的守卫；先解到 `.tmp` 再改名。
- 空间：下载前检查空闲空间 ≥ `size + unpackedSize × 1.1`；不足则报明确错误，不先下后失败。`unpackedSize` 由清单提供（§4.8），面板的体积说明也读它。
- 代理：DSH 启动器已安装全局 dispatcher（`@deepseek-ai/dsh-http-proxy`），普通 `fetch()` 自动走宿主代理；下载器不得传入自己的 `Agent`/`dispatcher`。子进程（Python/Qdrant）用宿主的 `proxyEnvironmentForChild()` 注入解析后的代理环境，`$DSH_HOME/.env` 里的代理才到得了引擎；Task 0 实证两种来源。

### 4.5 配置种子与模型

- `config.yaml`：首启从运行时包的 `engine/config.example.yaml` **整份拷贝**（含必填的 `sandbox.use`；当前 `config_version: 44`），再**追加**一段 `database: {backend: sqlite, sqlite_dir: <运行根>/state/data}`；其余键保留。示例里的 `database:` 整段是注释（`config.example.yaml:1890-1928`），没有可改写的既有键；不加该块时 `sqlite_dir` 缺省 `.deer-flow/data`，引擎按 **CWD** 解析（`database_config.py:259-263`）。只写 `config_version` + `database` 的最小种子会被引擎拒绝（`sandbox.use` 必填），不可使用。**每次启动只重写 `sqlite_dir` 一个键**（托管模式拥有该键），保证整体搬迁后不指旧路径。
- `rag_config.json`：首次写 `{ "qdrant_url": "http://127.0.0.1:<port>" }`；每次启动读-改-写 `qdrant_url` 一个键（按当前端口），保留用户已配的模型/key。托管模式下面板设置页的「Qdrant 地址」只读。
- `models_config.json`：首次写 `{"models":[],"hidden_in_chat":[]}`（三个环境变量都要求文件存在）。
- 环境变量（子进程）：`DEER_FLOW_PROJECT_ROOT=<root>`（自定义根或默认根）、`DEER_FLOW_HOME=<root>/state`、三个 `*_CONFIG_PATH` 指到 `<root>/config/{config.yaml,models_config.json,rag_config.json}`、`DEER_FLOW_API_TOKEN=<token>`（必须作为**显式** `env` 传给 `ctx.subprocess`；凭据形环境名会被 `scrubbedParentEnv` 从环境继承里剥掉）、`PYTHONPATH=<pack>/site-packages;<pack>/engine/backend;<pack>/engine/backend/packages/harness;<pack>/engine/backend/packages/extension-api`、`PYTHONUTF8=1`、`PYTHONIOENCODING=utf-8`，再加 `proxyEnvironmentForChild()` 的解析结果；cwd 用该根。
- token 优先级：托管 = `state/service.json`；外部 = 用户配置。托管模式忽略 profile 里遗留的 `apiToken`，否则会 401。
- 嵌入模型未配置不是启动失败：服务照起，摄入/检索按引擎错误原文返回。`needsEmbeddingConfig` 的口径 = `/api/rag/config` 的生效 `embedding_model` 为空且没有环境变量钥匙；面板据此给一条「配置嵌入模型后即可上传」的引导。
- DSH 聊天模型由既有 `modelSync` 同步；就绪后主动同步一次，之后按既有机制。

### 4.6 面板首次运行面

- 面板挂载先调 `runtime/status`：
  - `phase:'needs_location'` ⇒ 设置卡（居中，复用 `.hrag-state-fill`）：标题「准备本地知识服务」；位置行「安装到」+ 默认根（`~/.dsh/harness-rag` 这类宿主符号形式，悬停给绝对路径）+「更改…」；若锚点存在但目标不可用，位置行上方显示原因与旧路径（「上次的位置不可用」），并给「改回默认」；说明「首次使用需下载约 400 MB，安装后约 1.1 GB」（数值读 `runtime.json` 的 `size`/`unpackedSize`）；主按钮「开始准备」，次按钮「连接已有服务」——点击时 `ctx.get('pluginNavigation')` 懒取（这是插件管理 UI 提供的 client 反射服务，不写进 `inject`，否则缺件时整个面板挂不上）再调 `openBundle('dsh-harness-rag')`；不可用时按钮改为可复制的说明「Plugins → Harness RAG → backendUrl」。**只选一个运行根**：运行时（Python/依赖/引擎/Qdrant）、`state/`、`config/` 都在其下，不提供「依赖」与「数据」分开选。
  - 「更改…」调 `runtime/pickDirectory`：宿主 `directoryPicker` 原生选择器返回**父目录**，插件追加 `harness-rag` 并回填；若 basename 已是 `harness-rag`，确认后直接用该目录。选择器不可用（远程 Web 只有 browse 能力）⇒ 同一行原地变为可编辑绝对路径。`runtime/status` 带 `picker: 'native'|'browse'|'none'`，客户端据此决定「更改…」还是直接可编辑。选完只回填不落盘；点「开始准备」才 `runtime/configure` 并开始下载；校验失败在位置行下给红字，不进入下载态。
  - `phase ∈ downloading|verifying|extracting|starting` ⇒ 整块居中状态：标题「正在准备本地知识服务」、副文案阶段、进度条（下载有百分比，其余为不确定态）、「首次使用需下载约 400 MB」。
  - `error` ⇒ 标题「本地知识服务未能启动」、阶段与错误、`重试`（`runtime/retry`）、日志路径可复制；若尚未生成 `state/current.json`，多给一个「更改位置」（回到设置卡并改写锚点）。
  - `ready` ⇒ 正常六 tab；若 `needsEmbeddingConfig` 为真，在内容上方加一条可关闭横幅「本地服务已就绪；配置嵌入模型后即可上传文档」。
- 轮询 1 秒，`needs_location`/`ready`/`error` 停（设置卡不轮询）；不新增 tab、不改顶栏。
- headless 判据：激活后 `ctx.get('webServer')` 缺失（web/desktop 组合都有 `webserver`；`dsh-headless` 明写不挂 Host/HTTP/Web 运行时）。服务晚到给 1.5–2 s 宽限，仍无才按 headless 处理（直接用默认根准备）。
- 特权 op（`runtime/configure`/`pickDirectory`/`retry`）只接受 `application/json` 并校验同源（`Origin`/`Sec-Fetch-Site`），跨站触发的下载/换位一律拒绝。
- 外部模式不显示任何新面（`mode:'external'` 直接走原逻辑）。

### 4.7 升级、回滚、卸载

- 插件升级若 `runtime.json` 版本不变 ⇒ 不动运行时；变了 ⇒ 后台下载新包，完成后**本次继续用旧版**，下次激活切换（避免运行中换数据面）。
- 切换：起新版 Qdrant/服务前先停旧版（核对 pid）；新版健康成功才把 `current.json` 指向它；90 秒内起不来 ⇒ 回旧版并报错，同时写 `state/failed-<version>.json`，后续启动停在旧版，直到 `runtime.json` 换版本或用户手动重试。升级前备份 `state/` 与 `config/`；回滚不保证数据兼容（新引擎可能已迁移 sqlite/向量），README 明写「先备份再升级」。
- 保留上一版；下一次成功切换后删更老的版本目录（`runtime/` 下不在 current/previous 的）。
- 卸载：DSH 卸载只删 npm 包；默认根（锚点与 `bindings.json`）与自定义根都原样保留（知识库数据不丢）。文档给出手动清理路径与「先删 state 再删 runtime」的顺序。

### 4.8 发布件

- `package.json`：去掉 `private`，`license: MIT`（与主树/引擎一致，10-25 已改），补 `LICENSE` 与 `THIRD_PARTY_NOTICES.md`（DeerFlow/DSH 的 MIT 声明；运行时包另生成一份覆盖 Python（PSF-2.0）/Qdrant（Apache-2.0）/关键 wheel 的 notices）、`repository`/`homepage`、`engines.dsh`（建议 `>=0.2.1-rc.2 <0.3.0`，Task 0 钉值）、`files` 含 `runtime.json`/`LICENSE`/`THIRD_PARTY_NOTICES.md`、运行依赖 `yauzl`。
- `runtime.json`（包根）：`format:1`、`packs["win32-x64"]={runtimeVersion, engineVersion, engineCommit, pythonVersion, qdrantVersion, configVersion, urls[], size, unpackedSize, sha256}`。`size`/`unpackedSize` 都用来做空间检查与面板体积说明；未发布时 `urls: []`/`size: 0` 是显式占位，按 `pack_missing` 处理。
- `market/index.json`：形态 1；`source: {type:"npm"}`；`engines.dsh` 与包一致；图标用内联 data URL（`icon.svg` 872 B < 32 KiB）；`publishTimestamp` 为 Unix 秒。
- 运行时包命名 `harness-rag-runtime-win32-x64-<runtimeVersion>.zip`，**发在同一仓库的 GitHub Releases**；清单里的 sha256 与 size 在构建末尾回填。
- 构建命令（Task 0 实测口径）：`uv python install --install-dir <tmp>` 产出 `cpython-3.12.x-windows-x86_64-none/`，**拍平成 `<pack>/python/`**；`uv export --frozen --no-dev --extra umap --no-hashes --no-emit-project` 后剔除两条 `-e`，用 **`uv pip sync --python <pack>/python/python.exe --target <pack>/site-packages`** 安装（`uv pip install -r` 会重求解，撞锁里的 `websockets==16.0` override 而失败）；`engine/config.example.yaml` 与 `engine/backend/uv.lock` 随包。
- 仓库形态：**单仓**。仓库根就是插件包（`package.json`、`client.js`、`src/`、`runtime.json`），引擎源码在 `engine/`（`engine/backend/` + `engine/backend/uv.lock` + `engine/config.example.yaml`）。`files` 明确排除 `engine/`、`scripts/`、`market/`、`docs/specs`、`docs/plans`、`tests/`，npm 包约 1.5 MB（基线 307.6 kB tarball / 1.2 MB 解包）；DSH「添加插件」填 GitHub 仓库地址时，根就是合法包，直接可装。**依赖不进仓**——Python wheel、便携 Python、Qdrant 二进制都在构建期下载并打进 Release 资产；git 里只有源码、清单与锁文件。`engine/` 也不进运行时包的意外文件：`backend/.env`、`backend/.deer-flow`、`logs/`、根 `config.yaml`/`models_config.json`/`rag_config.json` 一律排除。
- 迁移：源分支 `feat/rag-knowledge-base`（不是 `master`）；引擎 `.git` 172 MB，**默认不保留完整历史**——`git subtree add --squash` 实测 42 s、gc 后 `.git` 16 MB（快照提交同为 16 MB），或快照提交 + `engine/UPSTREAM.md` 记录源仓、源 commit 与并入日期。完整历史会让 GitHub 地址安装变成重克隆，与「只点一次」冲突。旧引擎仓归档，不再保留第二份权威副本。
- 发布顺序：npm 包 → 同仓 GitHub Release（运行时包）→ 索引 JSON 上线 → README 给索引 URL 与 GitHub 安装示例。前三步依赖 remote/凭据，属外部动作。
- npm、GitHub 仓库地址、本地目录三种安装装的是同一份插件代码，首次运行面完全一致；GitHub 安装建议用 tag/commit，从 `main` 装时该提交的 `runtime.json` 必须已指向已上传的 pack（发布顺序保证 tag 提交先有 pack 再发布）。

## 5. 验收

1. **全新环境**：无系统 Python、无 uv、无 Docker、无 Qdrant 的 Windows x64；装插件并重启 DSH ⇒ 首次打开面板出设置卡（默认位置已填）⇒ 点「开始准备」⇒ 下载进度 ⇒ 就绪 ⇒ 库列表可读（空态）；无手工命令。
2. **默认位置**：不改位置直接开始 ⇒ 运行时落 `<DSH_HOME>/harness-rag`；`runtime/`、`state/`、`config/` 齐全。
3. **自定义位置**：点「更改…」走宿主原生选择器，选 `D:\hrag-test` ⇒ 实际根 `D:\hrag-test\harness-rag`；运行时与数据都在该根；锚点根保留 `location.json`（及既有 `bindings.json`）指向它；重启 DSH 后仍从自定义根启动。
4. **选择器边界**：取消选择不改默认；只读/空间不足/选到插件目录/UNC 网络盘/嵌套在锚点根内 ⇒ 红字拒绝、不下载；同步盘二次确认后才继续；目标 `harness-rag` 已存在且非本插件数据 ⇒ 报错不覆盖；选择器不可用时手输路径同样可走通。
5. **headless 首启**：无客户端世界、无 `location.json`、无运行时 ⇒ 直接用默认运行根准备，工具可用；不出现也无法出现设置卡；日志写清实际位置。
6. **锚点失效与下载失败**：`location.json` 指向的目录被删/不可写 ⇒ `needs_location` 并写明「上次的位置不可用」，不静默改回默认根；重选或改回默认后能继续。若根目录可用、只是运行时下载失败 ⇒ `error` + 重试，不重新弹设置卡。
7. **二次启动**：不再下载；在 Task 6 实测预算内 `ready`（初始目标 ≤10 s）；数据与配置保留。
8. **外部模式**：`backendUrl` 非空 ⇒ 不下载、不起进程、行为与今天一致。
9. **端口冲突**：预先占用 8020/6333 ⇒ 自动改用空闲口；面板与工具照常；不杀占用进程。
10. **崩溃恢复与双实例**：kill 引擎或 Qdrant ⇒ 状态变 `error`；重启 DSH 后认领或重启成功；同机两个 DSH profile 同时运行时 `state/lease.json` 保证只有一个服务，后启动者只认领、不杀别人的子进程。
11. **退出清理**：正常退出 DSH ⇒ 两个子进程消失；HMR 重载插件 ⇒ 服务不重启。
12. **升级/回滚**：换新运行时版本 ⇒ 下载完成后下次启动切换；新版健康失败 ⇒ 自动回旧版并报错。
13. **整体搬迁**：手工把 `runtime/`、`state/`、`config/` 拷到新根并改锚点后启动 ⇒ 配置里的 `sqlite_dir`/`qdrant_url` 自动指向新根，数据可读。
14. **鉴权**：不带 token 访问引擎返回 401；token 不出现在日志、配置、面板与 `runtime/status`。
15. **完整性**：篡改 zip 一个字节 ⇒ sha256 校验失败、不落正式目录；zip 内 `../` 条目被拒。
16. **门禁**：`node --check client.js`；`tsc -p tsconfig.json`；`node --test tests/*.test.ts` 全绿；`npm pack --dry-run` 内容与 `files` 一致且不含 `engine/`；`engine/` 相对并入源 commit 只含预期改动；主树 `deer-flow` 零 diff。
17. **代理**：只设系统环境变量，或只在 `$DSH_HOME/.env` 设置 `HTTPS_PROXY`，两种情况下下载都能走代理，引擎的模型调用也能出网；下载器不覆盖宿主 dispatcher。
18. **种子可加载**：首启由 `engine/config.example.yaml` 生成的 `config/config.yaml` 能被引擎真实加载（`sandbox.use` 存在），`/health` 与带 token 的 `/api/knowledge-bases` 均 200。
19. **退出中止下载**：下载进行中退出 DSH 或重载插件 ⇒ 下载停止、`.part` 保留；再次启动从断点续传，不出现两个并发下载。

## 6. 影响面

**改的（单仓）**：`src/runtime/`（新增：manifest、根解析/锚点、下载校验、解压、配置种子、supervisor、状态机、跨进程租约 `lock.ts`）；`src/index.ts`（接线与单例，`ctx.inject(['directoryPicker'])`）；`src/settings.ts`（默认 `backendUrl` 改空）；`src/http.ts`、`src/kb_proxy.ts`（读有效地址/token，新增 `runtime/status`、`runtime/retry`、`runtime/pickDirectory`、`runtime/configure`）；`src/model_sync.ts`（就绪后同步一次）；`client.js`（首启设置卡、进度、引导横幅、托管模式锁定 Qdrant 地址、内联 zh/en 词条）；`package.json`、`cordis.patch.yml`、`runtime.json`（新增）、`market/index.json`（新增）、`scripts/build-runtime-pack.mjs`（新增，构建期）、`tests/runtime_*.test.ts`（新增）、`engine/`（从 `harness-rag` 并入，含 `engine/config.example.yaml`）、`engine/UPSTREAM.md`（新增）、`README.md`、本对 spec/plan。

**不改的**：`engine/` 的后端行为（并入时逐字节保留；除搬迁与 `UPSTREAM.md` 外不动，若 Task 0 发现必须加接口，另立对）、主树 `deer-flow`、六 tab 功能面、工具名与槽位契约、现有绑定/摄取/评测逻辑。

**工作区**：`node_modules/` 不触碰、不提交；`dist/`、下载的 zip 与解压物都在仓外。

## 7. 不做

- 不做本地嵌入模型与「零配置摄入」；不在本对动引擎的 embedding provider。
- 不做 macOS/Linux 运行时包；清单留位，平台不支持时明确报错。
- 不做系统服务、开机自启、托盘常驻。
- 不做官方市场收录与社区索引提交（外部动作，另行处理）。
- 不做现有 `backend/.deer-flow` 数据自动迁移；用户要沿用数据就保持外部模式或手工拷贝。
- 不做运行时包的增量更新/差分下载；整包替换。
- 不把 Qdrant 换成嵌入式向量库；不复活 Docker 路线。
- 不做已装后换位置的自动迁移（整体拷贝 + 改锚点由用户手工做）；不做自绘目录浏览器。
- 不把本地视频 ASR 依赖（funasr/torch）打进运行时包；托管包与 `make gateway` 同依赖，视频默认档需另装或改用服务档（登记，见 §8）。
- 不做杀软/SmartScreen 加白流程；README 给说明。
- 不做 `location.json` 的 Windows ACL 归属判定（§4.1 只做路径与可写性校验）。

## 8. 风险与后续

| 风险 | 现状 | 处置 |
|---|---|---|
| 目录式 site-packages 有包不兼容 | **已实证**：808 MB / 369 项，umap/numba/scipy import 与真启动全过 | 不需要 D3 丙；构建仍按 `uv pip sync --target` |
| 从导出的锁清单重装会重求解 | **已实证**：`uv pip install -r` 撞 `websockets==16.0` override 失败 | 构建固定用 `uv pip sync`（不求解） |
| 1.2 GB 落盘在部分用户机器上不可接受 | 实测 site-packages 808 MB + Python 70 MB + Qdrant 87 MB + 引擎 26 MB | 面板明示体积与路径；后续可做「精简包（去 ragas/UMAP）」 |
| 构建机临时空间不足 | 实测 E: 3.7 GB、C: 1.8 GB、D: 21 GB | 构建脚本先查 `size + unpackedSize × 1.1`；README 要求 ≥3 GB 余量 |
| GitHub 下载慢/被墙/截断 | Task 0 直连两次分别截断在 5.5 MB 与 12.4 MB | 清单支持多 URL（主地址 + 国内镜像/对象存储）；`.part` 断点 + sha256；失败给可复制的错误与外部模式出口 |
| 引擎升级改配置格式 | 版本化包 + 配置文件在 home | 包清单带 `configVersion`；升级前备份配置，失败回滚 |
| 宿主 HMR 反复触发准备 | 单例 + 5 秒去抖 | Task 3 用假定时器覆盖 |
| 卸载后残留 1 GB | 有意保留数据 | README 给清理路径与顺序；不做破坏性自动删 |
| 索引不签名 | DSH 现状 | 文档说明信任链＝npm 包内 sha256；不承诺索引防篡改 |
| 远程 Web 只有 browse 能力、无原生选择器 | 宿主分工如此 | 设置卡退化为手输绝对路径，校验同一套；不引入自绘浏览器 |
| 纯 CLI/headless 没有设置卡 | 无客户端世界 | D10：首次直接用默认运行根准备，不卡在无法操作的界面 |
| 用户把根选到同步盘/网络盘 | 无法完全阻止 | 网络盘直接拒绝；同步盘二次确认；README 说明体积与性能后果 |
| 子进程不走宿主代理 | DSH 的全局 dispatcher 只管本体 `fetch` | spawn 时注入 `proxyEnvironmentForChild()`；验收 17 覆盖系统环境与 `.env` 两种来源 |
| 两个 DSH 进程抢同一数据目录 | desktop/headless 共用 DSH_HOME，现状无锁 | `state/lease.json` 单写者租约；后启动者只认领；验收 10 覆盖 |
| 回滚踩到已迁移的数据 | 新引擎可能已升 sqlite/向量 | 升级前备份 `state/`/`config/`；失败版本记 `failed-<v>.json`；README 明写回滚不保证兼容 |
| 杀软/SmartScreen 拦 `qdrant.exe`/`python.exe` | 用户目录直接执行未签名二进制 | README 给加白说明；错误面原样上报，不吞 |
| 视频 ASR 默认档缺 funasr/torch | 二者不在 `uv.lock`，当前 venv 也没有 | 本对不改；README/§7 登记「默认档需另装或改用服务档」 |

后续（非本对）：本地嵌入 spec（让新装用户不填 key 也能摄入）；mac/Linux 运行时包与 CI 矩阵；精简运行时 profile；运行时包增量更新；官方/社区索引收录。
