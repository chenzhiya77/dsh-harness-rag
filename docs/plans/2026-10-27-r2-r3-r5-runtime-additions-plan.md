# R2/R3/R5 运行时补齐 —— plan

**Status:** 已拍·实施完成（2026-10-27；R2 乙 / R3 甲 / R5 乙；只覆盖 spec §9 R2/R3/R5）；Task 0–4 完成，Task 5 发布候令
**Date:** 2026-10-27
**配套 spec:** [2026-10-24-single-download-distribution-spec.md §9 R2/R3/R5](../specs/2026-10-24-single-download-distribution-spec.md)

**硬约束**：只改单仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 零写入；`engine/` 零 diff——三项都走运行时 pack 的 extra 依赖/构建步骤与宿主 env，不改引擎源码或锁；新运行时 `0.1.0-4`、插件版本 `0.1.3`；发布候令；token/API key 不落日志与提交面；构建与证据落 `E:\hrag-r5`（D: 只剩约 15GB）；提交信息英文 Conventional ASCII。

## 决策

- **R2 乙**：把 ffmpeg/ffprobe 打进托管运行时 pack；**R3 甲**：tiktoken 直连依赖语义 + BPE 缓存随包；**R5 乙**：恢复 Langfuse 依赖与配置入口。三项同进 `0.1.0-4`。
- 依赖落法：`langfuse==4.5.1` 与 `backoff==2.2.1` 加入 `scripts/runtime-extra-requirements.txt`（其余 langfuse 依赖 `httpx/pydantic/packaging/opentelemetry-*`、`wrapt` 已在引擎锁内）；tiktoken 已在锁内（0.12.0），不重复加 extra，改由构建冒烟钉版本与 BPE 缓存。
- Langfuse 配置入口本周期只做**宿主环境变量透传**（`LANGFUSE_TRACING/PUBLIC_KEY/SECRET_KEY/BASE_URL`）+ 手册说明，不新增设置页控件；推送依赖用户自备 Langfuse 服务。

## Task 0 — 落点核实（只读）

- [x] **R2**：`0.1.0-3` pack 内 ffmpeg/ffprobe 文件数 0；引擎 `probe.py`/`frames.py` 直接调 PATH；deer-flow Dockerfile/依赖也不打包，缺 ffprobe 报可操作错误。选乙即由 pack 提供二进制，宿主把 `<runtime>/ffmpeg` 注入引擎 PATH。
- [x] **R3**：`chunker.py` 顶层 `import tiktoken`，`cl100k_base` 无缓存；`engine/backend/uv.lock` 已有 `tiktoken==0.12.0`（传递依赖）。extra 不支持重复名，故用构建冒烟 + 随包缓存；`TIKTOKEN_CACHE_DIR` 由宿主注入。
- [x] **R5**：`deerflow/tracing/factory.py` 懒 import `langfuse`（v4 API：`Langfuse(...)` + `langfuse.langchain.CallbackHandler`）；`tracing_config.py` 读 `LANGFUSE_TRACING/PUBLIC_KEY/SECRET_KEY/BASE_URL`；当前锁内无 `langfuse`/`backoff`，其余依赖齐。deer-flow 锁为 `langfuse 4.5.1`、`backoff 2.2.1`，直接沿用。
- [x] **宿主 env**：`src/runtime/supervisor.ts` 的 `engineRequest.env` 固定字段，宿主在 spawn 时叠加进程 env；新增 `PATH`、`TIKTOKEN_CACHE_DIR` 与 `LANGFUSE_*` 透传不会破坏现有代理/no_proxy 处理。
- [x] **构建面**：`scripts/build-runtime-pack.mjs` 已有 extra requirements（`uv pip sync`）与 Qdrant 下载/校验步骤，可照搬加 ffmpeg 资产步骤与 BPE 生成步骤；`notices()` 可补三方声明。
- [x] **资产**：BtbN `ffmpeg-n9.0-latest-win64-lgpl-9.0.zip`，171,481,203 B，sha256 `c1044833f3e9b30de2e3d80faef815998624d568fee0493eb49ecb13e5ef0980`；LGPL 构建，包内附 LICENSE 与源码链接。
- [x] **磁盘**：D: 15.25GB、E: 37.5GB；构建/解包/证据统一放 `E:\hrag-r5`，不碰 D:。

**实测（2026-10-27，只读）**：

- 运行时包条目：`ffmpeg/ffprobe` 0 个；`runtime.json` 当前 `0.1.0-3`。
- 引擎版本：`tiktoken==0.12.0`、无 `langfuse`、无 `backoff`；`opentelemetry-api/sdk/exporter-otlp-proto-http` 与 `wrapt` 已在锁内。
- 宿主：`engineRequest` 只在 `runtime/*`；`spawn()` 把 `request.env` 交给宿主，宿主叠加进程 env（supervisor 注释：our env merges last）。
- deer-flow：`backend/packages/harness/pyproject.toml` 有 `langfuse>=3.4.1`，锁解析 `4.5.1`；README_zh 有 `LANGFUSE_*` 配置段。ffmpeg 不在 Dockerfile/依赖中。

## Task 1 — 构建输入

> 动到的文件：`scripts/runtime-extra-requirements.txt`、`scripts/build-runtime-pack.mjs`。

- [x] extra 依赖：加 `langfuse==4.5.1`、`backoff==2.2.1`（保持一包一精确 pin）。
- [x] ffmpeg 步骤：`gh release download latest -R BtbN/FFmpeg-Builds -p ffmpeg-n9.0-latest-win64-lgpl-9.0.zip`，校验 size 与 sha256，解出 `ffmpeg.exe`/`ffprobe.exe` 到 `pack/ffmpeg/`，运行时 `-version` 冒烟。
- [x] BPE 步骤：用 pack 内 Python + `TIKTOKEN_CACHE_DIR=pack/tiktoken-cache` 调 `tiktoken.get_encoding('cl100k_base')`，断言缓存文件落盘、版本 0.12.0。
- [x] 站点冒烟：`import langfuse`、`import tiktoken`、`from langfuse import Langfuse` 均在 pack site-packages 内解析。
- [x] notices：补 ffmpeg（LGPL、BtbN 源码链接）、tiktoken BPE、langfuse/backoff；`runtime-manifest.json` 增 `ffmpegVersion`（若无 schema 约束）。

## Task 2 — 宿主 env

> 动到的文件：`src/runtime/supervisor.ts`、`tests/runtime_ops.test.ts`（或 supervisor 相关测试）。

- [x] `engineRequest.env` 增：`PATH = <runtime>/ffmpeg;<process.env.PATH>`、`TIKTOKEN_CACHE_DIR = <runtime>/tiktoken-cache`。
- [x] `LANGFUSE_TRACING/PUBLIC_KEY/SECRET_KEY/BASE_URL` 仅当宿主进程设置时透传；未设置不写空值。
- [x] 测试：构建 env 的纯函数或 supervisor 测试覆盖 PATH 拼接、缓存目录、LANGFUSE 有/无两种情形；不把真实 key 落测试。

## Task 3 — 构建 `0.1.0-4`

> 产物：`E:\hrag-r5\dist\harness-rag-runtime-win32-x64-0.1.0-4.zip`。

- [x] `node scripts/build-runtime-pack.mjs --engine ./engine --out E:\hrag-r5\dist --runtime-version 0.1.0-4`（未加 `--clean`，保留 `.work/python` 便于重跑）；记录体积、sha256、包内条目。
- [x] 包内核对：`ffmpeg/ffmpeg.exe`、`ffmpeg/ffprobe.exe`、`tiktoken-cache/`、`site-packages/langfuse`、`site-packages/backoff`。
- [x] 不改 `runtime.json`（发布时再回填 URL/size/sha）；本地验收用 `DSH_HARNESS_RAG_PACK`。

## Task 4 — 隔离验收

> 动到的文件：无（夹具/证据在 `E:\hrag-r5`）。

- [x] 干净沙箱：`DSH_HOME=E:\hrag-r5\dsh-home`，`DSH_HARNESS_RAG_PACK` 指新包；宿主 PATH 去掉系统 ffmpeg。
- [x] R2：用包内 ffmpeg 生成短视频；开视频门控上传，probe 通过（不再报“未找到 ffprobe”）；抽帧/ASR 按配置自然降级。
- [x] R3：清空/指向空缓存目录，断网或禁网，上传 `.md` 到 ready；证明切分用的是包内 BPE 缓存。
- [x] R5：设 `LANGFUSE_TRACING=true` + 假 keys/base；引擎能 import langfuse、`get_enabled_tracing_providers()` 含 langfuse、`build_tracing_callbacks()` 能构造 handler；评分推送按“无真实 Langfuse 服务”记边界。
- [x] 回归：R4 PDF 拦截、本地格式上传、表格门控；`engine/` 零 diff；全量 314/314；`tsc`/`node --check`。
- [x] 证据：`E:\hrag-r5\evidence\r2-r3-r5.md` + 日志/截图；收尾杀进程树并删临时 home/构建 staging。

**实测（2026-10-27）**：

- **构建**：`0.1.0-4` zip 447,481,687 B（426.8 MiB），sha256 `feec4ffbc346d97108d758137959780ee7e5311364cf1b101b3dfc1d7ff64814`，解包 1,158,919,528 B（1105.2 MiB）、21,108 条目；extra 14 项（calamine + langfuse/backoff + 11 个 opentelemetry/wrapt 闭包），`uv pip sync` 后 `tiktoken 0.12.0`、`langfuse 4.5.1`、`backoff 2.2.1` 冒烟通过；BPE 缓存 1 个文件 1,681,126 B；`ffmpeg` 为 BtbN `n9.0-lgpl`（`ffprobe version n9.0.2-36-g6882969ce9-20261026`），`ffmpeg/` 三项齐全；Qdrant 用本地 1.20.0 资产覆盖。日志 `E:\hrag-r5\evidence\build-0.1.0-4.log`。
- **沙箱**：`DSH_HOME=E:\hrag-r5\dsh-home`（profile `sbx`），插件用测试副本（`runtime.json` 已改 0.1.0-4、`urls=[]`）经 `DSH_HARNESS_RAG_PACK` 装本地 zip；宿主启动时 PATH 剔除系统 ffmpeg 目录，设 `HTTP(S)_PROXY=http://127.0.0.1:9`、`NO_PROXY=127.0.0.1,localhost`，`LANGFUSE_TRACING=true` + 假 keys + 本地抓取端；runtime `0.1.0-4` ready（Qdrant 6333/6334、knowledge 8020）。
- **R2**：2 秒 MP4 到 ready（`duration_ms=2000`、`shot_count=1`、切片 `media=video` 且带 `frame_url`）；`asr=failed`、`segment=degraded`（funasr/scenedetect 未随包，K1），`caption/vector/graph=done`。负控：改名包内 `ffprobe.exe` 后上传同一视频 → failed，错误为「未找到 ffprobe 可执行文件…确保其在服务进程的 PATH 中」；恢复后再次 ready。证据 `r2-neg-docs.json`、`r2-pos-docs.json`、`chunks-video.json`、`engine-log-excerpts.txt`。
- **R3**：停宿主、改名包内 BPE 缓存后重启（死代理）→ `.md` 首次切分 failed，栈落在 `tiktoken.load.read_file` → `openaipublic.blob.core.windows.net` → 代理拒绝；恢复缓存并重启 → 同一路径 ready（`token_count=16`），缓存 mtime 保持安装时的 `00:12:46` 未变。证据 `r3-neg-docs.json`、`r3-pos-docs.json`、`chunks-r3-pos.json`、`engine-log-excerpts.txt`。
- **R5**：pack Python 探针（`r5-probe.py`）输出 `providers=["langfuse"]`、`callbacks=["langfuse.langchain.CallbackHandler.LangchainCallbackHandler"]`、`flushed`；抓取端累计收到 10 次 `/api/public/otel/v1/traces`（引擎摄入与探针 flush 合计，均带 auth，含重启前后）。边界：无真实 Langfuse 服务，trace URL/页面跳转未验。证据 `r5-probe.log`、`langfuse-capture.log`。
- **回归与门禁**：面板无 MinerU token 上传 PDF → 上传前拦截（toast「PDF / Office / 图片解析需要 MinerU 令牌，先去配置」、0 次 `uploadDocument` 请求、文档行数不变），截图 `shot-01-pdf-blocked.png`、`ui-gate.txt`；本地 `.md` 到 ready、`.csv`/`.xlsx` 到 ready（表格门控开着，xlsx 1 chunk）；`engine/` 零 diff；`tsc` exit 0、`node --check`（client/构建脚本/`lib/runtime/engine_env.js`/`lib/runtime/supervisor.js`）全过、`node --test tests/*.test.ts` 314/314（含既有未提交升级修复的 1 条用例）。证据 `task4-tsc.txt`、`task4-tests.txt`、`docs-final.json`、`runtime-status-final.json`。


## Task 5 — 发布（候令）

- [ ] `package.json` 0.1.3；`runtime.json` `runtimeVersion=0.1.0-4`、urls 指新 release 资产、size/unpackedSize/sha256。
- [ ] README/手册：视频前置（随包 ffmpeg、默认门控关）、Langfuse 环境变量、tiktoken 离线说明。
- [ ] draft `v0.1.3` → 上传 pack → 发布 → `git+https#v0.1.3` 安装复验；`v0.1.1/v0.1.2` 资产不动。
- [ ] 发布后补 spec §9.2/§9.4/§9.6 的发布结果与 Status（实施结果与决策已回填）；plan 收尾。

## 风险与回退

- **ffmpeg 资产滚动**：BtbN `latest` tag 会更新；size+sha 钉住，漂移即构建失败，需显式改 pin。LGPL 声明与源码链接进 notices。
- **langfuse 依赖冲突**：4.5.1 的其余依赖锁内已有；若 `uv pip sync` 冲突，退回“只装 `langfuse` 无 backoff”不可行——backoff 是硬依赖，需再核对版本后改 pin。
- **Langfuse 无真实服务**：本周期只验 import/启用/handler 构造与推送边界，不承诺端到端 trace 页面。
- **PATH 覆盖**：宿主进程 PATH 为空或带引号时，拼接口径要单测；Windows 用 `;`。
- **pack 体积**：ffmpeg 解包约 +200MB；构建前核 E: 空间，ZIP 体积预计 480–520MB。
- **engine 零 diff**：tiktoken 未加回 pyproject 直接依赖，靠构建冒烟钉版本；若后续锁移除 tiktoken，构建期失败而不是等到用户摄入时。
