# 运行时版本化升级、回滚与旧版清理 —— spec

**Status:** 已定稿（2026-10-25；待实施）
**Date:** 2026-10-25
**来源:** 分发 spec §4.7 的后续对。现场已具备跨版本条件：`0.1.0-1` 已安装并在运行，`0.1.0-2` 包已构建且 `runtime.json` 已指向它；本对把 §4.7 从文字落成实现。
**承接:** [2026-10-24-single-download-distribution-spec.md](2026-10-24-single-download-distribution-spec.md) §4.2 步 4、§4.3、§4.6、§4.7；[2026-10-24-single-download-distribution-plan.md](../plans/2026-10-24-single-download-distribution-plan.md) Task 6 未闭合②与 §7「不做版本化升级/回滚」；[2026-10-25-runtime-resilience-spec.md](2026-10-25-runtime-resilience-spec.md) 的认领看门狗与锚点横幅。
**配套 plan:** [../plans/2026-10-25-runtime-upgrade-plan.md](../plans/2026-10-25-runtime-upgrade-plan.md)

## 1. 范围

四件，全部落在 host 半（`src/runtime/*`、`src/kb_proxy.ts`）与面板的提示位：

1. **版本化切换**：`runtime.json` 的目标版本与 `state/current.json` 的当前版本分开；新包在旧版仍运行时后台准备，下一次 DSH 启动才切换。切换成功才把 `current.json` 指向新版，并记下 `previousVersion`。
2. **90 秒健康门与回滚**：新版 Qdrant 与 knowledge 服务共享 90 秒启动预算；超时或起不来就停掉新版，有旧版时重新起旧版，写 `state/failed-<version>.json`，后续启动不自动重试，直到用户手动重试或目标版本变化。
3. **旧版保留与清理**：保留当前版与上一版；下一次成功切换后，删掉 `runtime/` 下既不是当前也不是上一版的、带 `runtime-manifest.json` 的版本目录。
4. **状态与确认面**：`runtime/status` 增加升级状态；面板复用现有横幅位显示「正在准备 / 已就绪待重启 / 需确认 / 已回退 / 被占用」，提供确认与重试动作；不新增 tab。

**不包含**：自动备份、自动迁移配置/数据、增量下载、孤儿进程的端口→pid 发现、跨宿主强制停服务、引擎代码改动、G11 回答纪律。

## 2. 现状与依据

### 2.1 当前只有单版本接线

- `bridge.ts:76` 只从包取一个 `version`，把它同时当作 supervisor 版本与 `ensureRuntime` 版本；没有「正在运行的版本」与「目标版本」之分。
- `supervisor.ts:690` 的单例键是 `root + runtimeVersion`；旧版与新版会各建一个 supervisor，但没有协调者决定该用哪个。
- `ensure()` 先 `adopt()`（`supervisor.ts:642-645`），`adopt()` 只要 `service.json` 健康就认领，不比对 `record.runtimeVersion`（`supervisor.ts:473-493`）。当前换版本的行为就是：旧实例还活着就永远认领旧版。
- `state/current.json` 只写不读：`markCurrent` 写 `{version, runtimeVersion, updatedAt}`（`supervisor.ts:247-249`），`ops.ts:103` 的 `installed` 只判断文件存在；`RuntimeCurrent.previousVersion` 与 `sanitizeCurrent` 已存在（`manifest.ts:29-35`、`:147-158`），但没有代码写它。
- 面板只有 `idle/preparing/starting/ready/error` 五相（`RuntimeStatusView`，`supervisor.ts:19-31`）；`client.js:83-88` 与 `:988-992` 只有下载/校验/解压/检查/启动五条阶段文案，没有升级待启用或已回退的出口。

### 2.2 旧实例身份与租约

- `service.json` 的 `pid`/`qdrantPid` 按设计可以是 null：host seam 不暴露子进程身份（`process.ts:24-33`），`executablePath` 默认返回 null（`supervisor.ts:190-191`）。因此 §4.7 写的「先停旧版（核对 pid）」在当前实现里没有可靠对象。
- 跨进程只有 `state/lease.json` 一个单写者租约：`acquireLease` 在 owner 不同且 pid 存活时返回 `held`（`supervisor.ts:255-266`）。
- 现场 `D:\hrag-t6\dsh-root\harness-rag` 的 `service.json` 是 `0.1.0-1`、knowledge 8021，租约 owner 是当前 DSH 宿主（pid 75512）；旧服务由宿主进程树持有，不是无主进程。正常退出 DSH 时宿主 job 应带走整棵树，下一次启动才轮得到新版。

### 2.3 准备发生在租约之前

- `start()` 先调 `ensureRuntime`（下载/解压，`supervisor.ts:562-568`），之后才 `acquireLease`（`supervisor.ts:577`）。两个宿主同时升级时，会并发写同一个 `downloads/*.part` 与 `runtime/<version>.tmp`；现有 `.part` 续传与 `.tmp` 改名没有跨进程锁。
- `extractPack` 解到 `<version>.tmp`，成功后 rename（`zip.ts:146-163`）；目标已有 `runtime-manifest.json` 时直接复用（`zip.ts:148`）。

### 2.4 配置版本与数据

- 运行时包的 `runtime-manifest.json` 带 `configVersion`（`scripts/build-runtime-pack.mjs:312-322`），当前 `0.1.0-2` 是 44；`runtime.json` 也带同一个值。
- 首启才从 `engine/config.example.yaml` 整份拷贝配置；之后每次启动只重写 `sqlite_dir` 与 `qdrant_url`（`seed.ts`）。配置版本变化时没有迁移逻辑，也没有备份动作。
- 数据（SQLite、Qdrant storage）不在版本目录内，跨版本共用；新版引擎可能就地迁移数据，回滚不保证数据可读。父 spec 因此要求 README 明写「先备份再升级」。

### 2.5 现场条件（2026-10-25 复核）

- `runtime.json` 目标 `0.1.0-2`，`dist/harness-rag-runtime-win32-x64-0.1.0-2.zip` 330,283,067 B / sha `05cc423b…` 与清单一致。
- 运行根只装了 `0.1.0-1`，`current.json` 是 `0.1.0-1`；其 `runtime-manifest.json` 的 `configVersion` 也是 44，与 `0.1.0-2` 相同 ⇒ 正常升级走自动切换，不需要配置确认。
- `runtime.json` 的 `urls` 仍为空。因此本对的真机验收用 `DSH_HARNESS_RAG_PACK` 指向本地 `0.1.0-2` zip（Task 6 用绝对路径）；真实下载源属发布外部条件，不在本对。
- 手册两行已按现状修正（2026-10-25）：`docs/plugin-manual.md:36` 改为「按版本存放；当前不自动清理旧版」，`:46` 改为「旧服务仍在运行则继续认领旧版；旧服务退出后重启/重试才准备并启动新版本；当前没有自动回滚」。实施完成后再升级为完成态。

## 3. 设计

### 3.1 状态文件

- **`state/current.json`**（沿用现有类型）：`{version:1, runtimeVersion, previousVersion?, updatedAt}`。`current.json` 由升级协调者独占写入；成功切换时写 `{runtimeVersion: 目标, previousVersion: 原当前}`，首次安装只写 `runtimeVersion`。它与健康的 `service.json` 版本不一致时，以健康 service 的版本为运行版本并回写 current；若该版本没有可用的已装 runtime，状态 `blocked`（`state_version_conflict`），不启动第二套栈。
- **`state/upgrade.json`**：`{version:1, targetVersion, fromVersion, configVersion, state:'pending'|'ready'|'needs_confirmation'|'blocked', confirmedConfigVersion?, error?:{phase,code,detail}, requestedAt, updatedAt}`。目标版本首次与当前不同且包开始准备时写入；包就绪且无需确认时置 `ready`；准备失败写 `state=blocked` 与 `error`；成功切换、目标回到当前版本或健康门失败时删除（失败记录另存）。
- **`state/failed-<targetVersion>.json`**：`{version:1, runtimeVersion, fromVersion, failedAt, error:{phase,code,detail}, rolledBack:boolean}`。切换失败时写入；存在即抑制该目标的自动重试；用户重试或目标版本变化后删除。目标版本变化时由协调者删除旧目标的失败文件；与当前目标不匹配的失败文件只忽略，不影响别的版本。
- 版本只做**相等比较**，不做 semver 排序；`runtime.json` 指向更旧或更新的版本都算一次版本变化。`previousVersion` 表示「切换前的运行版本」，不是字典序上的上一版。
- 目标版本变化时重写 `upgrade.json`；`runtime.json` 目标等于当前时，同版本失败文件视为陈旧，下一次状态读取或成功启动时删除。

### 3.2 激活时的决策

当前版本取 `current.json.runtimeVersion`；`current.json` 缺失但 `service.json` 有合法记录时，以 `service.json.runtimeVersion` 作为当前版本（兼容旧状态）；两者都在但版本不一致时，以健康 `service.json` 的版本为准并回写 current，service 版本没有对应已装 runtime 时 `blocked`（`state_version_conflict`）；两者都没有才是首次安装。

先判目标清单：`runtime.json` 缺失、非法、平台条目缺失或 pack 不可用 ⇒ 目标版本为空，不进入版本比较；有当前版本时保持当前并记 `blocked` + `pack_missing`/`platform_unsupported`，没有当前版本时走现有 `error`；不得把 `0.0.0-0` 写进 `upgrade.json` 或 `current.json`。

每次插件激活（新 DSH 进程或面板首次 `ensure`）按下表**从上到下匹配，先命中先执行**：

| # | 条件 | 动作 |
| --- | --- | --- |
| 1 | 目标 == 当前，或既无 `current.json` 也无 `service.json` 且无失败记录 | 走现有首次/重启逻辑；不读升级状态 |
| 2 | 目标 != 当前；`failed-<target>.json` 存在 | 有 `current` 时：旧版健康则保持，不健康则启动旧版；无 `current` 时直接 `phase=error`（`upgrade_failed`）。状态 `failed`；不自动重试 |
| 3 | 目标 != 当前；旧版健康；租约被另一个存活宿主持有 | 认领旧版；后台准备目标包；状态 `blocked`（即使包已就绪也不切） |
| 4 | 目标 != 当前；旧版健康；租约空闲或属于本宿主；配置版本相同或已确认 | 认领旧版；后台准备目标包；状态 `pending` → `ready`；**本次不切换** |
| 5 | 目标 != 当前；旧版健康；租约空闲或属于本宿主；配置版本不同且未确认 | 认领旧版；后台准备目标包；状态 `needs_confirmation`；**本次不切换** |
| 6 | 目标 != 当前；旧版不健康；租约被另一个存活宿主持有 | 不启动、不杀；状态 `blocked`（`upgrade_blocked_by_instance`） |
| 7 | 目标 != 当前；旧版不健康；租约空闲；配置版本不同且未确认 | 状态 `needs_confirmation`；不启动目标；不自动切换 |
| 8 | 目标 != 当前；旧版不健康；租约空闲；包已就绪；配置版本相同或已确认；无失败记录 | 启动目标；成功写 `current.json` 与 `previousVersion`；失败走 3.4 回滚 |

第 8 行要求包已就绪；若未就绪，先把包准备完（有旧版时后台，没有旧版时前台并显示进度），再按第 8 行启动；准备失败按 3.3 记 `blocked`，不写失败文件。本进程启动目标只发生在旧版不健康/不运行且租约空闲时；不允许先停健康旧版再起目标。

补充规则：

- **不主动停止健康的旧服务；正常升级只在一个新的 DSH 进程里发生**。同一宿主内的插件重载不切换：旧服务仍健康就只准备包，横幅提示「重启 DSH 后启用」。旧服务已经不在（崩溃/退出）且租约空闲时，本进程可以启动目标作为恢复；这不属于热切换，因为已经没有健康旧服务可停。
- 决策阶段对旧版只做**只读探测**（`adopt()`/`probe()`），不调用会「探测失败就启动」的 `ensure()`；只有回滚或明确要运行旧版时才启动旧版。认领必须校验 `record.runtimeVersion` 等于要运行的版本，避免第三个版本的残留实例被误认。
- 每个版本的 supervisor 必须持有**该版本**的 `ensureRuntime` 闭包；旧版只复用已装 `runtime/<old>/runtime-manifest.json`，缺失时回滚失败，不能拿目标版本的 pack 回调去准备旧版。
- 旧服务不健康、租约空闲时，先用 `service.json` 的端口做一次只读探活（不依赖 `adopt`），再清理陈旧记录（现有 `cleanStale` 只删记录，不杀进程）；如果端口仍在应答但 pid 为 null，说明是无主残留，状态置 `blocked`（`upgrade_blocked_stale_instance`），不猜测 pid、不杀；文档给手工清理办法。
- headless 没有确认通道：配置版本不同且未确认时保持旧版并把 `needs_confirmation` 写进状态与日志；相同则按上表自动切换。运维可先在面板确认一次，或在 `state/upgrade.json` 写入 `confirmedConfigVersion`。

### 3.3 包准备与跨进程 provision 锁

- 目标包不在 `runtime/<target>/runtime-manifest.json` 时，后台调用现有 `ensureRuntime`；下载源沿用 `runtime.json.urls`，开发态沿用 `DSH_HARNESS_RAG_PACK`。
- 新增 `state/provision.lock`：`{version:1, owner, pid, startedAt}`。`ensureRuntime` 在检查已安装之前以独占方式创建锁，结束后释放；锁存在且 owner pid 存活时：后台（旧服务可用、为下一版准备）不等待，直接返回 `provision_held`，状态保持 `pending`，下一次轮询/激活复用；前台（首次安装或没有旧服务可用的恢复启动）最多等 10 分钟（常量可调），期间显示准备进度，超时仍 `provision_held`。owner pid 不存在或已不存活视为陈旧；pid 无法判定时 `startedAt` 超过 15 分钟视为陈旧，删锁重试一次。
- 锁只保护下载/解压；服务启动仍由 `lease.json` 保护。两者分开，旧宿主运行时也能为下一版准备包。
- 下载前仍用现有 `downloadPack` 的空闲空间检查（`size + unpackedSize × 1.1`）；空间不足保持旧版并报 `no_space`，不删旧包腾空间。
- 本地 `DSH_HARNESS_RAG_PACK` 分支不经过 `downloadPack`：解压前用 `statfsSync` 做同样的空间检查。目标版本的下载/本地、解压/复用两条路径都要校验 `runtime-manifest.json` 的 `runtimeVersion` 等于目标版本、`configVersion` 等于 `runtime.json` 目标条目（若后者有值），不一致报 `manifest_mismatch`，不写成功状态；旧版回滚只校验 `runtimeVersion` 等于旧版，不拿目标的 `configVersion` 比旧版。
- 后台准备的进度写入升级状态（`upgrade.progress`），面板横幅显示百分比；解压/校验显示不确定态。
- **准备失败不写 `failed-<version>.json`**：该文件只记录「包已就绪但健康门失败」。下载/校验/解压/锁等待/本地 manifest 校验失败写入 `upgrade.error`，状态 `blocked`，下一次激活自动重试；空间不足同理，不删旧版。

### 3.4 切换、90 秒门与回滚

1. 仅在 3.2 的「可以切换」条件下进入；先把 `phase` 置 `switching`，状态记录 `fromVersion` 与目标版本。
2. 不再启动旧 supervisor；目标 supervisor 使用 `readyTimeoutMs = 90_000` 的**整栈共享预算**（Qdrant 与 knowledge 合计 90 秒，不是每个角色各 90 秒），目标 supervisor 的 `adopt` 期望版本是目标版本。90 秒门只在存在 `current`（升级）时生效；首次安装仍用现有 120 秒/角色预算。
3. 目标 `runRound` 成功：写 `service.json`（目标版本）、`current.json`（目标 + `previousVersion=原当前`）、删除 `upgrade.json` 与 `failed-<target>.json`；执行 3.5 清理；`phase=ready`。
4. 目标失败或 90 秒超时：停掉本轮目标子进程，删除目标 `service.json`，写 `failed-<target>.json`（`rolledBack` 先记 false）；存在 `current` 时启动旧版 supervisor（正常 120 秒/角色预算）。旧版健康 ⇒ `current.json` 保持原当前，`phase=ready`，`upgrade.state=failed`，`error` 为升级失败原文，`rolledBack=true`（回写失败文件）。旧版也起不来 ⇒ `phase=error`，`error.code='rollback_failed'`，`rolledBack=false`。没有 `current`（首次安装失败）⇒ 不启动旧版，`phase=error`，`rolledBack=false`。
5. 失败不自动重试：后续激活看到 `failed-<target>.json` 就停在旧版；只有用户执行 `runtime/upgrade {action:'retry'}`（删失败文件、状态回 `pending`）或 `runtime.json` 目标变化才重新尝试。重试仍不主动停健康旧服务：有旧服务时等下次 DSH 启动，没有旧服务时本次可直接启动目标。
6. 切换期间不并发第二个切换：`state/upgrade.json` 与租约共同保证；第二个宿主看到租约被持有就停在 `blocked`。

### 3.5 旧版保留与清理

- 成功切换后保留 `current` 与 `previousVersion` 两个版本目录。
- 删除 `runtime/` 下满足以下全部条件的目录：名字通过 `isRuntimeVersion`、含 `runtime-manifest.json`、不在保留集合内。`.tmp`、未知目录、没有 manifest 的目录一律不动。
- 删除失败（文件被占用）只记日志，不影响 `ready`；下一次成功切换再试。删版本目录时一并删对应的 `failed-<version>.json`。
- 不自动删 `downloads/` 里的旧 zip；文档给手工清理路径。

### 3.6 状态载荷与面板

`RuntimeStatusPayload` 增加：

```ts
upgrade?: {
  state: 'pending' | 'ready' | 'needs_confirmation' | 'failed' | 'blocked'
  fromVersion: string
  targetVersion: string
  configVersionChanged: boolean
  requiresConfirmation: boolean
  progress?: { phase: 'download' | 'verify' | 'extract'; received: number; total: number }
  error?: { phase: string; code: string; detail?: string }
}
```

- `version` 仍是**正在运行**的版本，包括首次 `runtime/status`（`ensure()` 之前）：有 `current.json` 时先读 current，不能先填目标版本。新增 `targetVersion`、`previousVersion` 可选字段。`installed` 仍是 `current.json` 存在。
- 切换中新增 `phase='switching'`，面板走现有整块进度卡，文案「正在切换运行时版本…」。
- 升级横幅只在 `phase==='ready'`（旧服务可用）时显示；`phase` 非 ready 时用现有整块状态卡，避免横幅与进度卡重复。
- 面板复用 `.hrag-rt-banner` 槽位，放在锚点告警与嵌入引导之前：
  - `pending`：`正在准备新版本 {0}…`（有进度时带百分比）。
  - `ready`：`新版本 {0} 已就绪，重启 DSH 后启用。` 可关闭。
  - `needs_confirmation`：`新版本 {0} 会改变配置格式；升级前请备份 state/ 与 config/。` 主按钮「确认升级（重启后生效）」，不可关闭。
  - `failed`：`升级到 {0} 失败，已回到 {1}。` 主按钮「下次启动重试」，附日志路径可复制；不可关闭。
  - `blocked`：`新版本 {0} 暂时无法启用。` 附原因（租约被占用/旧实例残留/下载失败）与日志路径；可关闭。
- 新 op `runtime/upgrade`，body `{action:'confirm'|'retry'}`，加入 `PRIVILEGED_OPS`：
  - `confirm`：仅在 `needs_confirmation` 时接受，把目标 `configVersion` 写入 `upgrade.json.confirmedConfigVersion`；有旧服务时等下次 DSH 启动，没有旧服务时本次激活可直接启动目标。
  - `retry`：仅在 `failed` 时接受，删除 `failed-<target>.json`，状态回 `pending`；有旧服务时等下次 DSH 启动，没有旧服务时本次激活可直接启动目标。
- `bad_request` 映射 400，`upgrade_state` 映射 409；在 `kb_proxy` 的 `errorStatus` 落映射，或使用带 `status` 的 `HarnessRagError`。
- 轮询：当前在 `phase==='ready'` 时停止；改为 `ready` 且 `upgrade.state` 不在 `pending/blocked` 时才停，否则继续每秒拉，直到包就绪或阻塞解除。
- 不新增 tab；`ready` 但升级失败时面板仍可用，失败只占横幅，不整页报错；只有回滚也失败或没有旧版可回时才走现有 `error` 卡。

### 3.7 配置版本确认与备份口径

- 配置版本比较只在存在当前版本（升级）时进行；首次安装没有旧配置可迁移，直接按目标 `configVersion` 建种子。目标与当前运行时 manifest 的 `configVersion` 都是正整数且相等 ⇒ 自动切换；当前版本缺失/为 0，或两者不同 ⇒ `needs_confirmation`；目标包自身缺失/为 0 ⇒ `manifest_mismatch`（包无效）。
- `needs_confirmation` 的文案明确「升级可能迁移数据，先备份 `state/` 与 `config/`」；插件**不自动备份**。父 spec 的备份要求仍由 README/手册承载。
- 确认只对当前目标版本与当前 `configVersion` 有效；目标版本或配置版本变化后重新确认。
- 配置迁移失败由新版启动失败覆盖：90 秒内起不来就走 3.4 回滚，失败文件记录原文。

### 3.8 不改变的行为

- 外部模式（`backendUrl` 非空）完全不进入本对逻辑。
- 首次安装、同版本重启、认领现有实例、换端口重试、看门狗、锚点告警、退出清理、租约语义保持现状；本对只在其上增加版本判断与升级状态。
- 引擎、工具面、六 tab、Qdrant/引擎参数、运行时包内容不改。

## 4. 取舍

- **不主动停健康旧服务；正常升级只在新 DSH 进程里发生**：同一宿主插件重载只准备包；旧服务已不在且租约空闲时，本进程可启动目标作为恢复，这不属于热切换。代价是旧服务健康时必须重启一次 DSH 才能换版本。
- **不杀无法核验的旧实例**：`service.json` pid 可为 null，跨宿主强制停服务风险高；代价是无主残留会阻塞升级，需要用户手工清理。端口→pid 发现放后续。
- **90 秒整栈预算**：比现有 120 秒/角色更紧，换更短停机与更早回滚；代价是慢机器上可能误判，失败会回旧版，不丢服务。
- **不自动备份**：`state/` 里的 Qdrant 数据可能很大，自动拷贝会翻倍占用且拖慢切换；代价是用户必须按文档先备份，回滚不保证数据兼容。
- **配置版本不同要确认**：多一次点击，但避免悄悄迁移用户数据；同配置版本的常规升级仍自动。
- **只保留当前与上一版**：足够回滚一次，磁盘只多一份运行时；更老版本在成功切换后清理。
- **不做增量更新**：整包替换，逻辑简单、校验路径与首装一致。

## 5. 验收

1. **正常升级**：`0.1.0-1` 已装且运行、`0.1.0-2` 包已就绪（两边 `configVersion` 都是 44）；新 DSH 启动 → 旧版已退出、租约空闲 → 启动 `0.1.0-2` → `current.json={runtimeVersion:0.1.0-2, previousVersion:0.1.0-1}`；库列表、检索与上传可用；旧目录保留。
2. **本次不切换**：旧服务仍健康、租约空闲或属于本宿主、配置版本相同或已确认时激活 → 只准备包，状态 `pending` → `ready`；`current.json` 仍是旧版；面板出现「重启后启用」；重启前不改数据。配置版本不同且未确认时状态是 `needs_confirmation`，同样不切。
3. **同版本零动作**：目标 == 当前 → 不下载、不写升级状态、不清理，行为与今天一致。
4. **失败回滚**：让目标包起不来（缺文件或坏配置）→ 90 秒内失败 → 目标子进程停止；有旧版时旧版重新就绪、`current.json` 仍指旧版、`failed-<target>.json` 存在且 `rolledBack=true`；面板显示失败横幅；后续激活不自动重试。
5. **手动重试**：点「下次启动重试」→ 失败文件删除、状态回 `pending`；下一次 DSH 启动重新尝试；成功则删除失败文件并更新 `current.json`。
6. **配置版本确认**：把目标包的 manifest 与 `runtime.json` 目标条目的 `configVersion` 同时改成 45（只改一处会先报 `manifest_mismatch`）→ 状态 `needs_confirmation`，不自动切；有旧服务时点「确认升级」后重启才切；headless 下保持旧版并在日志/状态里记 `needs_confirmation`。
7. **租约与旧实例**：另一个存活宿主持有租约 → 状态 `blocked`，不杀、不启动新栈、不改 `current.json`；对方退出、租约释放后，下一次启动或旧服务已死时的下一次轮询恢复才切换。旧服务仍健康但租约属于本宿主（插件重载）⇒ 认领旧版、只准备包，本次不切。
8. **无主残留**：`service.json` pid 为 null 但端口仍应答、租约已陈旧 → `blocked`（`upgrade_blocked_stale_instance`），不猜测 pid；手工停掉后下一次启动或轮询恢复可切换。
9. **清理**：连续升级到第三个版本 → 只保留当前与上一版，最老版本目录被删；`.tmp`、未知目录、无 manifest 目录不动；删除失败不挡 `ready`。
10. **并发准备**：两个宿主同一运行根同时准备目标包 → 只有一个下载/解压；后台第二个保持 `pending` 并在后续轮询/激活复用已装 manifest，首装前台等待并复用；不出现半个 `runtime/<version>` 或并发 rename 冲突。
11. **空间不足与本地包**：目标包所需空间超过剩余空间 → 保持旧版、`no_space`、状态 `blocked`，不写 `failed-<version>.json`，不删旧包，不切换；下一次激活自动重试。本地 pack 同样先查空间；manifest 的 `runtimeVersion`/`configVersion` 不符报 `manifest_mismatch`，不切换。
12. **目标清单不可用**：`runtime.json` 缺失/非法/平台不支持 → 有当前版本时保持当前，`blocked` + `pack_missing`/`platform_unsupported`；没有当前版本时 `error`；不写 `0.0.0-0`，不起新栈。
13. **版本记录冲突**：手工把 `current.json` 改成旧版、`service.json` 保持新版且健康 → 启动后以 service 为准回写 current，不启动第二套栈；service 版本无对应 runtime ⇒ `blocked`（`state_version_conflict`），不启动。
14. **门禁**：`tsc` 0 错；`node --test tests/*.test.ts` 全绿；`node --check client.js` 通过；`engine/` 与主树零 diff；token 不出现在日志、状态、面板与失败文件。

## 6. 影响面

**改的**：`src/runtime/manifest.ts`（current/upgrade/failed 记录的类型与校验）；`src/runtime/supervisor.ts`（`adopt` 期望版本、current 写入移交、90 秒共享预算、失败结果可回写）；`src/runtime/provision.ts`（provision 锁）；新增 `src/runtime/upgrade.ts`（根级协调者与决策表）；`src/runtime/bridge.ts`（current/target 与协调者接线）；`src/runtime/ops.ts`（状态字段与 `runtime/upgrade`）；`src/kb_proxy.ts`（注册新 op）；`client.js`（横幅、确认/重试、`switching` 文案、轮询条件，zh/en 词条）；`tests/runtime_upgrade.test.ts` 与相关 supervisor/provision/ops 测试；`README.md`、`docs/plugin-manual.md` 的升级与备份段；本对 spec/plan。

**不改的**：`engine/`、`src/tools.ts`、六 tab 功能面、`runtime.json` 的包内容与构建器、Qdrant/引擎参数、外部模式、G11。

## 7. 不做

- 不自动备份 `state/`/`config/`；插件不新增配置/数据迁移（新版引擎自身可能就地迁移，不在本对控制范围）；不保证回滚后数据可读。
- 不做增量/差分下载，整包替换。
- 不做孤儿/null-pid 旧实例的端口→pid 发现与强制终止；不做跨宿主强制停服务。
- 不做同一宿主内对健康旧服务的热切换；插件重载只准备包，不换版本。旧服务已不在时的恢复启动不算热切换。
- 不做版本 semver 排序、降级保护或兼容矩阵；只按相等/不等处理。
- 不做 macOS/Linux 运行时包；不复活 Docker 路线。
- 不改引擎、工具契约、面板六 tab；不做 G11 回答纪律。

## 8. 风险与后续

| 风险 | 现状/触发 | 处置 |
| --- | --- | --- |
| 新版迁移了 SQLite/向量，回滚后旧版读不了 | 配置版本变化或引擎自带迁移 | 确认文案与 README 要求先备份；失败文件记原文；不宣称回滚数据安全 |
| 无主旧实例阻塞升级 | pid 为 null、端口仍应答 | 状态 `blocked` + 原因/日志；文档给手工停进程办法；后续做端口→pid 发现 |
| 90 秒误判慢机器 | Qdrant/引擎首次索引恢复慢 | 失败会回旧版，不丢服务；实测值可再调单个常量 |
| 两个宿主同时准备 | 同一运行根、同一目标版本 | `provision.lock`；后台不等待、下次轮询/激活复用；首装前台最长 10 分钟；超时 `provision_held` |
| 旧版目录删不掉 | 文件被占用/杀软扫描 | 只记日志，不挡 `ready`；下次成功切换再清 |
| 目标源为空 | `runtime.json.urls=[]` | 开发态用本地 `DSH_HARNESS_RAG_PACK`；发布前填 urls，属外部条件 |
| 切换停机 | 旧版退出到新版就绪之间 | 面板 `switching` 状态；正常路径只发生在 DSH 启动阶段，用户已在等待启动 |
| current/service 版本记录冲突 | 崩溃窗口/手工改文件 | 以健康 service 为准回写；无对应 runtime 则 `blocked`；测试覆盖 |
| 目标清单不可用 | `runtime.json` 缺失/平台不支持 | 保持当前，`blocked` `pack_missing`/`platform_unsupported`；不写 `0.0.0-0` |
| 本地 pack 绕过下载校验 | 开发/验收路径 | 解压前空间检查、解压后 manifest 版本/configVersion 校验 |
| 手册超前描述升级 | `plugin-manual.md:36/46` | 已于 2026-10-25 改回现状；实施完成后再升级为完成态 |
