# 单一下载分发（插件自带本地运行环境） Plan

**Spec:** [2026-10-24-single-download-distribution-spec.md](../specs/2026-10-24-single-download-distribution-spec.md)
**Status:** 已拍·进行中（2026-10-25；Task 0–1 完成，Task 2–8 未开始）
**Date:** 2026-10-25
**Architecture:** **单仓**：仓库根就是插件包（npm 与 GitHub 仓库地址两种安装入口共用同一个根），后端源码在 `engine/`。薄 npm 包装插件两半＋`runtime.json`；host 半在首次激活时把平台运行时包（便携 Python＋`--target` site-packages＋`engine/` 源码＋Qdrant）下载到 `<DSH_HOME>/harness-rag/runtime/<版本>`（`DSH_HOME` 缺省 `~/.dsh`），配置与数据留在同级 `config/`、`state/`；host 以进程级单例托管 Qdrant 与 knowledge 服务，面板经 `runtime/status` 显示准备进度。`backendUrl` 为空即托管，非空仍是今天的外部模式。

**硬约束**：只改单仓 `E:\app\python\agent\dsh-harness-rag`；并入 `engine/` 时从现有 `harness-rag` 取只读副本、原引擎仓跟踪文件零改动；主树 `deer-flow` 零改动；不依赖 postinstall；不把运行时/数据写进 `node_modules`；token 与任何 `api_key` 不落日志、不进面板、不进提交面；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。`node_modules/`、`dist/`、运行时 zip 与解压物不纳入提交。

---

## Task 0 — 落点核实（只读）（spec §2、§4.8）

> 动到的文件：无（探针与解压物在仓外）。

- [x] **宿主能力**：从插件 host 半 `spawn` 子进程（`windowsHide`、`shell:false`）并拿到 stdout/stderr；`process.on('exit'/'SIGINT'/'SIGTERM')` 可注册；`globalThis` 跨 HMR 保留；`fetch` 流式下载走宿主出站代理（DSH 启动器安装的全局 dispatcher，不传自己的 `Agent`）；宿主的 `proxyEnvironmentForChild()` 是否可从插件侧调用/等价实现，供 Python/Qdrant 子进程继承 `.env` 代理。用小探针各跑一次。
- [x] **目录选择器**：host `ctx.inject(['directoryPicker'], …)` 在 desktop 组合可用；`capability()` 为 `{kind:'native', pick(signal)}`，`pick()` 返回绝对路径、取消返回 `null`；与工作区「添加工作区」同款。记录 browse-only/缺服务时的退化判据。
- [x] **headless 判定**：插件激活时如何区分「有客户端世界」与 headless/纯 CLI（`webServer` 注入、Electron 标志、`ctx.get` 任一可用判据）；GUI 出设置卡、headless 自动默认根的边界；`webServer` 晚到是否需要短暂宽限。
- [x] **盘符与空间**：`fs.statfs` 在 Windows 的可用性与返回字段；UNC/网络盘识别方式；OneDrive 等同步盘识别（环境变量/路径），供二次确认用；空间检查按 `size + unpackedSize × 1.1`，确认 `unpackedSize` 从清单读取。
- [ ] **插件安装面**：`dsh plugin --profile desktop add <本地 tgz>`、`link:`、以及 **GitHub 仓库地址**三种安装下包根解析（`import.meta.url` 到 `runtime.json`）一致；GitHub 地址安装用一个「根是插件包＋含 `engine/` 子目录」的测试仓验证 pnpm 只装包面、不因 `engine/` 失败；确认常规 `dependencies` 会被 pnpm 装进 profile，且 `yauzl` 无构建脚本；确认 `engines.dsh` 的 SemVer 范围对 `0.2.1-rc.2`（当前 DSH）通过，并记录正确范围。**实测缺口：GitHub 地址未测（仓无 remote）；tgz/link 与 engines 已过。**
- [x] **单仓迁移**：源分支是 `feat/rag-knowledge-base`（不是 `master`）。在临时克隆上试 `git subtree add --squash --prefix engine <harness-rag> feat/rag-knowledge-base`，记录耗时/冲突/路径长度与克隆体积；引擎 `.git` 172 MB，默认不保留完整历史，若 squash 仍太大则用「快照提交 + `engine/UPSTREAM.md`」；确认并入后 `npm pack` 不含 `engine/`。
- [x] **包管理器姿态**：复核 pnpm 11 对依赖脚本的拦截与 DSH 的批准流程（只读 README＋实装一次带 script 的假包），确认「不靠 postinstall」这条没有暗坑。
- [x] **引擎可搬运**：用 `uv python install --install-dir <tmp>/python 3.12`（产出 `<tmp>/python/cpython-3.12.x-windows-x86_64-none/python.exe`）；在 `backend/` 跑 `uv export --frozen --no-dev --extra umap --no-hashes --no-emit-project`（剔除两条 `-e`）后用 **`uv pip sync --python <py> --target <tmp>/site-packages`** 建一套（`uv pip install -r` 会重求解并失败）；以 `PYTHONPATH=site-packages;backend;backend/packages/harness;backend/packages/extension-api` 跑 `python -m uvicorn app.gateway.knowledge_app:app`。验证：能 import（含 UMAP）、用 `engine/config.example.yaml` 种出的 config 能被 `get_app_config()` 加载、`/health` 返回 `harness-rag-knowledge`、带 token 的 `/api/knowledge-bases` 200、缺 token 401。失败则记录首个坏包，评估 D3 丙退路。
- [x] **路径与配置**：五个环境变量（`DEER_FLOW_PROJECT_ROOT/HOME/CONFIG_PATH/MODELS_CONFIG_PATH/RAG_CONFIG_PATH`）全设到临时 home 时，配置写入、sqlite、data、Qdrant URL 实际落点；`config.yaml` 从 `engine/config.example.yaml` 整份种子化并**追加** `database:{backend: sqlite, sqlite_dir:<abs>}`（示例里该段是注释；只写 `config_version` + `database` 的种子会因 `sandbox.use` 必填而失败）；模型/rag 的显式 env 要求文件存在；记录 `config_version` 读取方式与 `resolve_config_path() or project_root()` 的优先级。
- [x] **Qdrant Windows**：下载 v1.20.0 `qdrant-x86_64-pc-windows-msvc.zip` 到仓外，验证 `QDRANT__SERVICE__HOST/HTTP_PORT/GRPC_PORT`、`QDRANT__STORAGE__STORAGE_PATH`、`QDRANT__STORAGE__SNAPSHOTS_PATH`、`QDRANT__TELEMETRY_DISABLED` 环境覆盖、`/readyz`、`taskkill /T` 后的再次启动（storage 可恢复）。
- [ ] **进程归属核对**：对 `service.json` 里的 pid 用 PowerShell `Get-CimInstance Win32_Process` 读 `ExecutablePath`，确认能判定「是否在本 home 的 runtime 下」；记录命令与耗时。另验证 `state/lease.json` 单写者：两个宿主同时启动时后启动者只认领、不杀别人的子进程；租约陈旧可接管。**实测缺口：ExecutablePath 已过（523 ms）；双宿主 lease 留 Task 3。**
- [x] **解压件**：比较 `yauzl` 与 `fflate` 的流式解压与 zip-slip 防护写法，定一个并记录依赖版本；实测运行时包内最长条目路径 + home 前缀是否触 Windows 260 字符上限。
- [ ] **宿主 UI 面**：面板现有居中状态块（`.hrag-state-fill`，`client.js` 样式段）、`ToasterHost`、设置入口（嵌入模型所在面）的实际打开方式；设置页「Qdrant 地址」的只读态是否可复用现有控件；`pluginNavigation.openBundle('dsh-harness-rag')` 是否可从 client 半注入、不可用时的退化文案；确认无需新槽位。**实测缺口：只读态需 Task 5 真面板验（primitives 包不在 asar 内）；其余已定位。**
- [x] **工作区基线**：插件 HEAD 与未提交面；引擎 `git status` 空；主树零改动；记录 `npm pack --dry-run` 当前内容，作为 Task 7 对照。

**实测**：2026-10-25（只读；探针与下载物在仓外 `D:\hrag-t0\`，已清理；三树零改动）。

- **宿主能力**：`@deepseek-ai/dsh-subprocess` 已在 dsh-base 组合（id `subprocess`）。`ctx.subprocess` 的 Windows 实现在 kill-on-close Job 里跑子进程（`windowsHide`、Job 关闭即清树），内部调 `proxyEnvironmentForChild()`；子环境先剥凭据形与 `DSH_*` 再并入**显式** `env`（`dsh-subprocess/lib/index.js`、`dsh-subprocess-local/README.md`）。插件运行面只提供 `dsh-tools` + `cordis` 两个 peer（`src/settings.ts:10-11`），**不能直接 import `dsh-http-proxy`** ⇒ 代理与进程树都走 `ctx.subprocess`，`DEER_FLOW_API_TOKEN` 必须作为显式 env 传入。本地探针：`windowsHide:true`+`shell:false` 可取 stdout/stderr；`exit/SIGINT/SIGTERM` 均可注册；HMR 只替换模块不重启进程 ⇒ `globalThis` 保留。
- **目录选择器**：`ctx.directoryPicker` 由 `@deepseek-ai/dsh-host-directory-picker-auto` 挂载（web-app id `directory-picker`）；win32 native 是自带 **Win32 COM 对话框 worker**（不是 Electron `showOpenDialog`），取消返回 `null`；auto 在远程授权/非 loopback/SSH 时退 `browse`，桌面 loopback 默认 `native`。
- **headless 判定**：`dsh-headless` patch 明写「mounts no Host, HTTP server, Web runtime」⇒ 激活时 `!ctx.get('webServer')` 即无客户端世界（web/desktop 均有 `webserver`）。给 1.5–2 s 宽限后仍无则按 headless 处理。
- **盘符与空间**：`fs.statfs('D:/')` 返回 number 字段 `{bsize,blocks,bfree,bavail}`；本机 D: 21.0 GB / C: 1.9 GB / E: 3.7 GB。UNC `\\localhost\c$` 也返回数字 ⇒ **statfs 识别不了网络盘**，须按前缀 `\\` 拒绝；映射网络盘用 `GetDriveType`（本机 C/D/E 均为 3=本地）；OneDrive 由 `OneDrive`/`OneDriveConsumer` 识别（本机已设）。
- **插件安装面**：桌面自带 CLI 在 `E:\appdevelop\deepseek\resources\runtime\cli\bin\dsh.cmd`（PATH 无 `dsh`）。tgz 装进临时 profile 成功（pnpm 11.28.5、`file:D:/…tgz`、硬链接 store、2.4 s）；`link:` 由现 desktop profile 证明；**GitHub 地址未实测**（仓无 remote；本地 `git+file://` 被 pnpm 归一成 `/D:/…` 失败，不能代表 GitHub）。`engines.dsh` 用 `semver.satisfies(..., {includePrerelease:true})`：`>=0.2.1-rc.2 <0.3.0` 与 `^0.2.1-rc.2` 对 rc.2 通过、0.3.0 拒绝；`^0.2.1` 对 rc.2 **不通过**。
- **单仓迁移**：`git subtree add --squash --prefix engine <harness-rag> feat/rag-knowledge-base` 在临时仓 42 s 完成；gc 后 `.git` **16 MB**（快照法同为 16 MB）。引擎跟踪面实测 **1082 文件 / 25.9 MB**（docs 18 MB、backend 11 MB）。并入后 `npm pack --dry-run` 只列包面、`engine/` 不出现（`files` 白名单）——用一个「根是插件包＋含 `engine/`」的临时仓验过。
- **包管理器姿态**：pnpm 11.28.5；profile `pnpm-workspace.yaml` 为 `packages:[.]`+`nodeLinker:hoisted`。本地目录假包带 `postinstall` 安装时**未执行**（无 marker），DSH 仅告警「无 dsh.bundle」；`yauzl` 无 scripts ⇒「不靠 postinstall」成立。
- **引擎可搬运**：`uv python install --install-dir D:\hrag-t0\python 3.12` 装出 **`python/cpython-3.12.13-windows-x86_64-none/python.exe`（下载 20.8 MiB、落盘 70 MB）**，不是 `<dir>/python.exe`，构建时需拍平。`uv export --frozen --no-dev --extra umap --no-hashes --no-emit-project` 得 613 行（2 条 `-e` 剔除）。**`uv pip install -r` 会重求解并失败**：锁里 `overrides websockets==16.0` 与 langgraph-sdk `<16` 冲突；改 `uv pip sync --python <py> --target <dir>` 成功——369 个顶层项 / **808 MB**，umap 0.5.12 / numba 0.67.0 可 import。`PYTHONPATH` 四段 + uvicorn 真启动：`/health` 200 `{"status":"healthy","service":"harness-rag-knowledge"}`、带 token `/api/knowledge-bases` 200、缺 token 401；建库落 `state/data/deerflow.db`、Qdrant storage 落 `state/qdrant`。D3 丙不需要。
- **路径与配置**：显式 `*_CONFIG_PATH` 优先（`rag_config_file.py:311-318`）；`write_rag_config()` 实写 `D:\hrag-t0\home\config\rag_config.json`；`get_app_config().config_version` = **44**；缺 `models_config.json` ⇒ `FileNotFoundError`。**`config.example.yaml` 的 `database:` 整段是注释**（`:1890-1928`）⇒ 种子必须**追加** `database:{backend: sqlite, sqlite_dir:<abs>}`，不能「改写既有键」；不加该块时 `sqlite_dir=.deer-flow/data`，`database_config.py:259-263` 按 **CWD** 解析。
- **Qdrant**：资产 30,801,664 B；直连 GitHub 两次截断（5.5 / 12.4 MB），`gh release download` 完整。解压 `qdrant.exe` 87,385,088 B；六 env 全生效（`listening on 16333/16334`、`Telemetry reporting disabled`、raft 在 `state/qdrant`）；`/readyz` 200；`taskkill /T` 后重启日志 `Loading raft state from …`、`/readyz` 200。
- **进程归属**：`Get-CimInstance Win32_Process` 的 `ExecutablePath` 可判「在 `D:\hrag-t0` 下」，单次 523 ms。双宿主 lease 未实测（Task 3 假宿主覆盖）。
- **解压件**：`yauzl` 3.4.0（依赖 `pend`、无 scripts）对 `../evil.txt` 报 `invalid relative path`、`C:/evil.txt` 报 `absolute path`、`sub\evil.txt` 归一 `sub/evil.txt`；`fflate` 0.8.3（零依赖）原样返回越界名。**选 yauzl**，自写越界校验仍保留。最长条目：site-packages 102、引擎 167（含应排除的 `.deer-flow`），加 `…\runtime\<v>\` 前缀 ≤199，未触 260。
- **宿主 UI 面**：`.hrag-state-fill` 在 `client.js:2084-2085`，状态块用点 `:7211/:7217/:8162/:8168`；`ToasterHost` `:3466`／挂载 `:21291`；「Qdrant 地址」是 `HostInput` `:18917-18923`（现无只读态；primitives 不在 asar 内，`readOnly` 留 Task 5 真面板验）。`pluginNavigation` 是插件管理 UI 的 **client 反射服务**（`ctx.reflect.provide("pluginNavigation",{openBundle})`；语音输入插件以 `inject:[…,"pluginNavigation"]` 消费）；我方 client `inject:['slots','sidebarRightTabs','locale']`，点击时 `ctx.get('pluginNavigation')` 懒取、缺件走可复制文案。
- **基线**：插件 `e9f5a79`（未提交：README/package.json 改、LICENSE/THIRD_PARTY_NOTICES/本对 docs 新增）；引擎 `b34b2d572`（`feat/rag-knowledge-base`，status 空）；主树 `372b2f4b0` 有既存未提交面（README + docs，非本对产生）。`npm pack --dry-run`：21 文件 / 307,565 B tarball / 1,243,418 B 解包。

**未闭合**：GitHub 地址安装（需真实 remote，Task 7）、双宿主 lease（Task 3）、设置页只读态（Task 5）。

## Task 1 — 运行时清单与路径（TDD）（spec §4.1）

> 动到的文件：`src/runtime/manifest.ts`（新增）、`src/runtime/paths.ts`（新增）、`src/runtime/location.ts`（新增）、`runtime.json`（新增）、`tests/runtime_manifest.test.ts`（新增）、`tests/runtime_paths.test.ts`（新增）。

- [x] 测试先行：清单校验（`format:1`、平台键、`https` URL 列表、64 位 hex sha256、size/unpackedSize 正整数、`runtimeVersion` 字符合法）；缺平台/占位 URL/0 size/坏 hash 的拒绝文案（占位统一报 `pack_missing`）；版本目录名与 `current.json` 结构。
- [x] `paths.ts`：`defaultRoot()`（`<DSH_HOME>/harness-rag`；`DSH_HOME` 空白串视同未设、缺省 `~/.dsh`，与 `bindings.ts:83-85` 同规则；测试把 `DSH_HOME` 指到临时目录）、`runtimeDir(root, version)`、`stateDir(root)`、`configDir(root)`、`logsDir(root)`、`downloadsDir(root)`；全部纯函数、不建目录。
- [x] `location.ts`：`readLocation()`（锚点固定在锚点根；坏 JSON/非绝对/相对路径 ⇒ 回落默认运行根并标记）、`writeLocation(root)`（原子写）、`resolveRoot()`（锚点优先，否则默认根；锚点存在但目标缺失/不可写 ⇒ 返回 `needs_location` + 原因，不静默改根）；测试覆盖锚点优先、坏锚点回落、目标缺失、空白 `DSH_HOME`。
- [x] 根校验纯函数：绝对路径、父目录可写探针、非系统目录、空间阈值（`size + unpackedSize × 1.1`）、Windows 路径长度、拒绝插件目录/node_modules、拒绝 UNC/网络盘、拒绝嵌套在锚点根内、同步盘二次确认标记、目标 `harness-rag` 非本插件数据时拒绝（本插件标记 = `bindings.json`/`location.json`/`runtime/<v>/runtime-manifest.json` 任一）。
- [x] `manifest.ts`：从包根读 `runtime.json`（`import.meta.url` 解析），按 `process.platform-process.arch` 取条目；返回结构化错误（`platform_unsupported`/`manifest_invalid`/`pack_missing`）。
- [x] `runtime.json` 初版：`win32-x64` 条目带占位 URL、0 size 与 0 unpackedSize（发布时回填），其余字段齐；0/空 URL 明确按 `pack_missing` 处理，单测覆盖，不违反「非占位条目 size 为正整数」。
- [x] 门禁：`node --test tests/runtime_manifest.test.ts`；`tsc -p tsconfig.json`。

**实测（实施期回填）**：

- 38 用例（manifest 16／paths 22）全绿；全量 `node --test tests/*.test.ts` **104/104**；`tsc` 0 错。
- 导出面：`manifest.ts`＝`validateManifest`/`selectPack`/`readManifest`/`loadPack`/`sanitizeCurrent`/`isRuntimeVersion`/`isUnpublished`；`paths.ts`＝七个纯 join；`location.ts`＝`LOCATION_FILE`/`locationPath`/`readLocation`/`writeLocation`/`resolveRoot`/`targetRoot`/`validateRootCandidate`/`probeWritable`。
- 判定口径：占位＝`urls.length===0 || size===0`（校验通过、`selectPack` 报 `pack_missing`，部分回填同理）；版本串在字符集外另拒 `.`/`..`（版本即目录名）；同步盘＝`OneDrive*` 环境变量包含父目录；系统目录默认取 `SystemRoot/windir/ProgramFiles/ProgramFiles(x86)/ProgramW6432/ProgramData`；可写探针＝写临时文件再删（ACL 也拦得住）；空间＝`ceil(size + unpackedSize×1.1)`；目标已存在须含三标记之一，**空目录也拒**。
- **Windows 根路径预算定 120 字符**（259 − `runtime\<version>\` ≈ 20 − 最长包内条目 ≤120；Task 0 实测最长 167 含将排除的 `.deer-flow`）。Task 6 打包路径检查时复核实测条目高度，必要时收窄。
- `resolveRoot` 的 `needs_location` 带 `{anchorRoot, previousRoot, reason}`；坏锚点回默认根时带 `warning`。目标目录存在但只缺运行时 ⇒ 仍 `ok`（下载失败归 `error`，Task 4/5）。
- **偏离**：`package.json` 的 `files` 增 `runtime.json`（清单必须进 npm 包，原 Task 1 清单未列该文件）。`npm pack --dry-run`：25 文件、312.8 kB tarball、`runtime.json` 336 B。
- `runtime.json` 初值：`runtimeVersion=0.1.0-1`、`engineVersion=0.1.0`、`engineCommit=b34b2d572`、`pythonVersion=3.12.13`、`qdrantVersion=1.20.0`、`configVersion=44`，`urls/size/sha256` 占位，Task 6 回填。
- neuter：①`isUnpublished` 恒 `false` ⇒ manifest 3 败；②目标可写判定短路 ⇒ 「不可写 ⇒ needs_location」1 败；均整体还原后复跑全绿。

## Task 2 — 下载、校验、解压（TDD）（spec §4.4）

> 动到的文件：`src/runtime/download.ts`（新增）、`src/runtime/zip.ts`（新增）、`tests/runtime_download.test.ts`（新增）、`package.json`（新增运行依赖）。

- [ ] 测试先行：本地 HTTP 服务（`node:http`）提供小 zip——正常下载、sha256 不符、size 不符、镜像 1 失败后镜像 2 成功、`.part` 断点（206 续写）、服务端回 200 时从头覆盖、3 次重试后报错、abort 后保留 `.part`。
- [ ] 下载器：`https:` 校验、镜像顺序、`Range` 续写、流式写 `.part`、进度回调（`{phase, received, total}`）、完成后 `sha256`+`size` 双校验、成功改名。
- [ ] 空间检查：下载前比较 `statfs`/可用空间与 `size + unpackedSize × 1.1`，不足即 `no_space`。
- [ ] 代理与中止：普通 `fetch`（不传自定义 dispatcher）走宿主全局 dispatcher；插件 dispose/DSH 退出时 abort 下载、保留 `.part`。
- [ ] 解压器：流式逐条；拒绝绝对路径、`..`、盘符、符号链接；先解到 `<version>.tmp`，成功原子改名；解压进度回调；`runtime/<version>` 已存在但缺 `runtime-manifest.json`（上次中断）时删除重解压。
- [ ] 测试覆盖 zip-slip（`../evil.txt`、`C:\evil`）与坏 zip 截断。
- [ ] 门禁：`node --test tests/runtime_download.test.ts`；`tsc`；`node --check` 不适用于 TS，跑 strip-types check。

**实测（实施期回填）**：

## Task 3 — 配置种子与服务守护（TDD）（spec §4.3、§4.5）

> 动到的文件：`src/runtime/seed.ts`（新增）、`src/runtime/ports.ts`（新增）、`src/runtime/supervisor.ts`（新增）、`src/runtime/process.ts`（新增）、`tests/runtime_supervisor.test.ts`（新增）、`tests/runtime_seed.test.ts`（新增）。

- [ ] 测试先行（纯函数）：端口规划（默认口空闲/占用/双占用，bind 失败换口重试）；配置种子内容（从 `engine/config.example.yaml` 拷贝出的 `config.yaml` 必须能被 `AppConfig` 加载，含 `sandbox.use`；绝对 `sqlite_dir`；`rag_config.json.qdrant_url`；空 `models_config.json`）；读-改-写只动 `sqlite_dir`/`qdrant_url` 两个键；`service.json`/`current.json`/`lease.json` 清洗与坏 JSON 处理。
- [ ] 守护（用 Node 桩子进程模拟 Qdrant/knowledge）：启动顺序、Qdrant 六个环境变量（host/HTTP/GRPC/storage/snapshots/telemetry）、**经 `ctx.subprocess.spawn` 起子进程**（Windows kill-on-close Job、`windowsHide`、`scrubbedParentEnv` 自带代理；`DEER_FLOW_API_TOKEN` 走显式 `env`，不靠环境继承）、就绪探测（`/readyz`、`/health`、带 token 的 `/api/knowledge-bases`）、超时、退出码→`error`、日志落盘与轮转、正常停止（尽力 + 下次清理）、认领（service.json + token 200）、`lease.json` 单写者、pid 归属核对失败不杀、bind 失败换口重试。
- [ ] 单例与去抖：`globalThis` 复用；dispose 后 5 秒内新实例接管则取消停止（假定时器）。
- [ ] `seed.ts`：`config.yaml` 首次从 `config.example.yaml` 整份拷贝，**再追加** `database:{backend: sqlite, sqlite_dir:<运行根>/state/data}`（示例里该段是注释，没有可改写的既有键）；`rag_config.json`/`models_config.json` 只在文件不存在时写；每次启动只按当前运行根改 `sqlite_dir`、按实际端口修补 `qdrant_url`，其余键保留（托管模式只拥有这两个键）。
- [ ] 门禁：`node --test tests/runtime_*.test.ts`；`tsc`；真机起一次 Qdrant+引擎（用 Task 0 的临时运行时）验证。

**实测（实施期回填）**：

## Task 4 — 有效地址接线、状态 op 与工具姿态（spec §4.2、§4.6）

> 动到的文件：`src/settings.ts`、`src/http.ts`、`src/kb_proxy.ts`、`src/model_sync.ts`、`src/index.ts`、`cordis.patch.yml`、`tests/runtime_config.test.ts`（新增）。

- [ ] `settings.ts`：默认 `backendUrl: ''`（托管）；`cordis.patch.yml` 插入行同改；注释写「空=内置本地服务，非空=外部服务」。
- [ ] 有效配置：`createEffectiveConfig(raw, supervisor)` 以 getter 提供 `backendUrl`/`apiToken`；外部模式原样；托管模式 token 只取 `service.json`（忽略 profile 遗留 `apiToken`），未就绪时 `api()` 抛 `runtime_not_ready`（带阶段），不静默连 8020。托管模式设置页 Qdrant 地址只读，`rag_config.json` 只重写 `qdrant_url` 一个键。
- [ ] `index.ts`：创建 supervisor（单例）、异步 `ensureRuntime()`；`registerTools`/`registerKbProxy`/`registerModelSync` 全拿有效配置；就绪回调触发一次 `syncNow()`；`ctx.inject(['directoryPicker'], …)` 捕获选择器（缺件时标记不可用）。
- [ ] `kb_proxy.ts` 增四 op：`runtime/status`（mode/phase/progress/version/root/defaultRoot/ports/paths/needsEmbeddingConfig/picker/logTail/error；phase 含 `needs_location`，带「目标不可用/校验失败」原因、旧路径与 `headless` 标志；`picker` 为 `native|browse|none`）、`runtime/retry`（重新走流水线）、`runtime/pickDirectory`（调宿主原生选择器，返回父目录或 null）、`runtime/configure({parent, confirmSync?})`（校验 + **先建运行根、`downloads/`、`config/`、`state/{data,logs,qdrant}`** + 写锚点 + 开始准备；同步盘二次确认；已装运行时拒绝换位，未生成 `current.json` 时允许）；错误信封沿用既有 `{error:{kind,detail}}`。headless 无位置时走默认根，不返回 `needs_location`；根可用但下载失败 ⇒ `error`/重试，不回 `needs_location`。`needsEmbeddingConfig` 口径见 spec §4.5。
- [ ] 工具：未就绪（含 `needs_location`）返回结构化 `runtime_not_ready`，文案含阶段与「打开知识库面板完成设置 / 稍后重试」；不就绪也不注册到未绑定会话（沿用现有 gating）。
- [ ] 特权 op 防护：`runtime/configure`/`pickDirectory`/`retry` 只接受 `application/json`，并校验 `Origin`/`Sec-Fetch-Site` 同源（与既有面板 op 的 JSON 预检口径一致），拒绝跨站触发的下载/换位。
- [ ] 测试：外部/托管切换、getter 取值、未就绪错误、status 形状（含 picker/needsEmbeddingConfig）、configure 校验分支、重试幂等、跨源拒绝。
- [ ] 门禁：`node --test tests/*.test.ts`；`tsc`。

**实测（实施期回填）**：

## Task 5 — 面板首次运行面（spec §4.6）

> 动到的文件：`client.js`（面板挂载、状态块、引导横幅、内联 zh/en 词条）。

- [ ] 挂载先拉 `runtime/status`：`external` 直接走原逻辑；`needs_location` 渲染设置卡，其余托管未就绪不拉库列表，渲染居中准备块（标题/阶段/进度条/体积说明）。
- [ ] 设置卡：位置行（`~/.dsh/harness-rag` 符号形式 + 绝对路径 tooltip）+「更改…」；锚点失效时显示原因与旧路径，并给「改回默认」；体积/磁盘说明；主按钮「开始准备」（默认根直接开始）、次按钮「连接已有服务」——优先 `pluginNavigation.openBundle('dsh-harness-rag')`，不可用时退回可复制说明「Plugins → Harness RAG → backendUrl」；校验错误在位置行下红字，不进下载态。
- [ ] 「更改…」调 `runtime/pickDirectory`：返回父目录则回填 `<parent>/harness-rag`（basename 已是 `harness-rag` 时确认后直接用）；`null`（取消）不改；`status.picker !== 'native'` ⇒ 原地切换为可编辑绝对路径。选择只回填，`runtime/configure` 在「开始准备」时才调用。`pluginNavigation` 是插件管理 UI 的 client 反射服务，点击时 `ctx.get('pluginNavigation')` 懒取（不写进 `inject`，免得缺件时整个面板挂不上）。
- [ ] `error`：标题、阶段、错误、`重试`、日志路径复制；尚未生成 `current.json` 时多给「更改位置」；`runtime/retry` 后回到进度态。
- [ ] `ready`：正常六 tab；`needsEmbeddingConfig` 为真时加可关闭横幅「本地服务已就绪；配置嵌入模型后即可上传文档」，按钮打开既有设置面；托管模式把设置页「Qdrant 地址」渲染为只读并注明「由内置服务管理」。
- [ ] 停止条件：`needs_location`/`ready`/`error` 停轮询；隐藏/卸载时清定时器。
- [ ] 词条 zh/en 成对；深浅色只走现有 token；198px 档不溢出。
- [ ] 门禁：`node --check client.js`；仓外 hostless 探针覆盖五态（设置/准备/错误/就绪/外部）、锚点失效原因、「更改位置」、更改回填、取消、手输、picker 退化、重试与托管 Qdrant 只读；真栈手验 Task 6。

**实测（实施期回填）**：

## Task 6 — 运行时包构建与真冷启动（spec §4.8）

> 动到的文件：`scripts/build-runtime-pack.mjs`（新增，构建期，不入 npm 包）、`.gitignore`（若需忽略 `dist/`）。

- [ ] 构建器：`--engine <path>`（默认 `./engine`，迁移必须先于本 Task 或显式指向源仓）`--out <dir>`；读单仓 tag/commit 与 `engine/config.example.yaml` 的 `config_version`；`uv` 钉 0.11.2（见 spec §2.4）；`uv python install --install-dir`；`uv export --frozen --no-dev --extra umap --no-hashes --no-emit-project`（剔除两条 `-e`）；**`uv pip sync --python <pack>/python/python.exe --target <pack>/site-packages`**（`uv pip install -r` 会重求解，撞锁里的 `websockets==16.0` override）；把 `uv python install --install-dir` 产出的 `cpython-3.12.x-windows-x86_64-none/` **拍平成 `<pack>/python/`**；下载 Qdrant 固定版本（资产 30,801,664 B）；拷 `engine/backend/` 源码、`engine/config.example.yaml` 与 LICENSE；生成 `runtime-manifest.json` 与 `THIRD_PARTY_NOTICES.md`（覆盖 Python/Qdrant/wheel 许可）；打 zip 并回填 `size`/`unpackedSize`/`sha256`/`runtimeVersion`。
- [ ] 构建产物不含 `node_modules`、`.venv`、`__pycache__`、测试数据、`backend/.env`、`backend/.deer-flow`、`logs/`、根 `config.yaml`/`models_config.json`/`rag_config.json`；路径长度检查。
- [ ] 冷启动（默认根）：`DSH_HOME=<空临时目录>`、`DSH_HARNESS_RAG_PACK=<zip>`（仅测试覆盖，指本地 zip）、PATH 去掉 Python/uv/Docker；起 DSH 或直接驱动 host 模块，验证设置卡→开始→下载（本地 file 覆盖）→解压→起两服务→`ready`；库列表可读。
- [ ] 冷启动（自定义根）：`runtime/configure({parent:'<另一临时目录>'})` ⇒ 实际根 `<parent>/harness-rag`，默认根保留 `location.json` 与既有 `bindings.json`；重启后从自定义根认领；取消选择与非法路径不启动下载。
- [ ] 二次启动认领：保留 home 重启，在实测预算内 `ready`（初始目标 ≤10 s，Task 6 回填实际值）；kill 引擎后状态 `error`，重启后恢复。
- [ ] 端口冲突：占 8020/6333 再起，自动改口；占用进程不被杀。
- [ ] 正常退出：DSH 退出后无 qdrant/python 子进程；HMR 重载不重启服务。
- [ ] 体积与耗时记录：zip 大小、解压后大小、首启总时长、二次启动时长；把 `size`/`unpackedSize` 回填到 `runtime.json`，并核对面板「约 400 MB / 1.1 GB」文案。

**实测（实施期回填）**：

## Task 7 — 发布件、文档与门禁（spec §4.7、§4.8）

> 动到的文件：`package.json`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`engine/`（并入）、`engine/UPSTREAM.md`（新增）、`market/index.json`（新增）、`README.md`、`docs/equivalence.md`（若需一句分发说明）。

- [ ] **并入引擎**：按 Task 0 选定的方式把 `harness-rag` 的 `feat/rag-knowledge-base` 放进 `engine/`（默认 `git subtree add --squash` 或快照提交，不保留 172 MB 完整历史）；确认 `engine/backend/uv.lock` 与 `engine/config.example.yaml` 随源结构进入；写 `engine/UPSTREAM.md`（源仓、源 commit、并入日期）；旧引擎仓归档；并入时逐字节保留后端行为。
- [ ] `package.json`：去 `private`；`publishConfig.access=public`；`engines.dsh`（建议 `>=0.2.1-rc.2 <0.3.0`，Task 0 定值）；`files` 增 `runtime.json`、`LICENSE`、`THIRD_PARTY_NOTICES.md`；`dependencies.yauzl`；`repository`/`homepage` 用实际发布地址（未定则留占位并在发布前替换）。
- [ ] `LICENSE`：MIT 全文（10-25 已补）；`THIRD_PARTY_NOTICES.md` 保留 DeerFlow 与 DeepSeek Harness 的 MIT 声明；`runtime.json` 指真实 release URL、`size`/`unpackedSize`/`sha256`（未发布则保持占位并在 Task 8 标明「发布前回填」）。
- [ ] `market/index.json`：形态 1；npm source；`engines.dsh` 对齐；内联 SVG 图标；用 DSH 校验器（仓外一次性）验证通过。
- [ ] README：安装改为「装插件→首启在面板选位置并开始准备（约 400 MB）→配置嵌入模型」；并列三种安装命令（npm 包名、`git+https://…`、本地 `link:`），注明 GitHub 安装建议用 tag/commit；保留外部模式一节；给出默认/自定义根、`DSH_HOME`、换位需手工迁移、清理顺序、平台限制、索引添加方法；明确「官方市场未内置索引」；补「开发机已有 Qdrant 时托管会另起一个」「旧 `backend/.deer-flow` 数据不自动迁入」「杀软可能拦未签名 exe，如何加白」「视频默认 ASR 档需另装或改用服务档」。
- [ ] `npm pack --dry-run` 对照 `files`：不含 `engine/`、`scripts/`、`market/`、`docs/specs`、`docs/plans`、`node_modules`；含 `runtime.json`、`LICENSE`、`THIRD_PARTY_NOTICES.md`、`client.js`、`src/`；记录包大小（基线 307.6 kB tarball / 1.2 MB 解包，预计仍约 1.5 MB）。
- [ ] 用 `git+https://<repo>.git` 在真实 DSH 装一次（仓库根是插件包），确认与 npm 安装等价、`runtime.json` 可读；记录 Git 安装的 `engines.dsh` 是装完后判定、失败会回滚 manifest/lock（与 registry 安装不同）。
- [ ] 门禁：`node --check client.js`；`tsc`；`node --test tests/*.test.ts`；`engine/` 相对源 commit 只含预期改动；主树零 diff；token/key 扫描（提交面与包内容）。

**实测（实施期回填）**：

## Task 8 — 收口（spec §5）

> 动到的文件：本对 spec/plan＋Task 7 文档面。

- [ ] 回写 spec Status 与本 plan 各 Task 实测；未做项按「不做/后续」归位，不留悬空勾。
- [ ] 真栈验收按 spec §5 逐条记录（1–19，含代理、种子可加载、退出中止下载），截图/日志路径仓外。
- [ ] 发布相关外部动作单列：创建 GitHub 单仓并首推、归档旧引擎仓、npm 发布、同仓 GitHub Release、索引上线、`runtime.json` 回填 `urls`/`size`/`unpackedSize`/`sha256`——未执行则明确标「待外部条件」。
- [ ] 逐文件核 hunk，排除 `node_modules/`、`dist/`、运行时 zip；提交信息英文 Conventional ASCII；回填提交链。

**实测（实施期回填）**：

---

## 提交链（滚动记实）

- 待实施。预计切分：①`chore(repo): vendor the harness-rag backend into engine/`（Task 7 迁移，**先于 Task 6 执行**）②`feat(runtime): provision and supervise the local knowledge service`（Task 1–4）③`feat(panel): show first-run runtime provisioning`（Task 5）④`build(runtime): add the platform pack builder`（Task 6）⑤`docs(distribution): document single-download install`（Task 7–8）；最终按实际 hunk 归属调整。
