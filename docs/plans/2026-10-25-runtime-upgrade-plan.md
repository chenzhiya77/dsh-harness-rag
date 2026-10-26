# 运行时版本化升级、回滚与旧版清理 —— plan

**Status:** 已实施（2026-10-26；Task 0–8 全落；Task 9 真机覆盖进行中——横幅实点已完成，五项待做）
**Date:** 2026-10-25
**配套 spec:** [../specs/2026-10-25-runtime-upgrade-spec.md](../specs/2026-10-25-runtime-upgrade-spec.md)

**硬约束**：只改 `E:\app\python\agent\dsh-harness-rag`；`engine/` 与主树 `deer-flow` 零改动；token 与任何 `api_key` 不落日志、不进面板、不进失败文件、不进提交面；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。`node_modules/`、`dist/`、运行时 zip、`runtime/` 下的实测产物不纳入提交。测试用 `node --test tests/*.test.ts` 与 `node node_modules/typescript/bin/tsc -p tsconfig.json --pretty false`（本机 `pnpm run typecheck` 会先联网安装，不作为门禁）。

## Task 0 — 落点核实（不改代码）

> 目的：把 spec 依赖的行号、现有行为、测试缝和现场状态钉死；发现与 spec 冲突先停下登记，不带旧前提写代码。

- [x] 核对版本接线：`src/runtime/bridge.ts:76`（单一 `version`）、`src/runtime/supervisor.ts:190-193`（`readyTimeoutMs` 默认 120000）、`:247-249`（`markCurrent` 不写 `previousVersion`）、`:473-493`（`adopt` 不校验版本，并在 `:480` 回写 current）、`:562-577`（`ensureRuntime` 在 `acquireLease` 之前）、`:600-609`（先 service 后 current）、`:690-709`（单例键 `root+runtimeVersion`）。
- [x] 核对旧实例身份：`src/runtime/process.ts:24-33`（`pid` 可为 null 的注释）、`:58-87`（`sanitizeService`/`sanitizeLease`）、`src/runtime/supervisor.ts:190-191`（`executablePath` 默认返回 null）、`:497-505`（`cleanStale` 的杀进程条件）。
- [x] 核对 current/upgrade 预留：`src/runtime/manifest.ts:29-35`（`RuntimeCurrent.previousVersion`）、`:147-158`（`sanitizeCurrent`）、`src/runtime/ops.ts:19-41`（payload 字段）、`:103`（`installed` 只看文件存在）、`:186-212`（`retryRuntime`/`panelStatus`）。
- [x] 核对运行时包：`scripts/build-runtime-pack.mjs:312-322`（`runtime-manifest.json` 带 `configVersion`）、`src/runtime/download.ts:175-177`（下载前空间检查）、`src/runtime/zip.ts:146-163`（`.tmp` 后 rename；`:144`/`:153` 只判 manifest 存在）、`src/runtime/provision.ts:28`（已装 manifest 直接复用；`:29-36` 本地包只判存在）。
- [x] 核对面板：`client.js:20959-21017`（runtime gate/轮询/停轮询条件；`:21017` 在 `ready`/`error`/`needs_location` 停）、`:21420-21720`（设置卡/错误卡/进度卡/重试）、`:21950-22010`（锚点与嵌入横幅槽位）、`:83-88`/`:988-992`（阶段词条）、`:3262`（`runtimeStageKey`）。
- [x] 核对 op 注册：`src/kb_proxy.ts:391`（`PRIVILEGED_OPS` 现有三项）、`:432-435`（runtime op 表四项）；`runtime/upgrade` 不存在，无冲突。
- [x] 现场取证（只读）：
  - `D:\hrag-t6\dsh-root\harness-rag\state\current.json` = `0.1.0-1`；
  - `state/service.json` = `0.1.0-1`、ports 8021/6334/6335、pid/qdrantPid null；
  - `state/lease.json` owner `2f7b3b10f04feb20`、pid 75512（当前 DSH 宿主）；8021 由 pid 65544 持有；
  - `runtime/0.1.0-1/runtime-manifest.json` = `configVersion 44`，与 `0.1.0-2` 相同；
  - `dist/harness-rag-runtime-win32-x64-0.1.0-2.zip` 330,283,067 B、sha `05cc423b…`；
  - `runtime.json` 的 `urls` 为空。
- [x] 确认「DSH 正常退出会带走旧服务」的既有证据（分发 §5.11 退出清理实测）；若本机需要重验，只在用户批准重启后做，并记录 8021 是否消失、lease 是否陈旧。未验前不假设。
- [x] **手册现状修正（2026-10-25 已改）**：`docs/plugin-manual.md:36` 改为「按版本存放；当前不自动清理旧版」；`:46` 改为「旧服务仍在运行则继续认领旧版；旧服务退出后重启/重试才准备并启动新版本；旧版目录当前保留；当前没有自动回滚」。Task 7 实施完成后再升级为完成态。
- [x] 核对 pack 不可用分支：`src/runtime/bridge.ts:75-76` 的 `0.0.0-0` 退化、`:118` pack 为空时返回 `pack_missing`；Task 2 改成「有当前版本时 `blocked` + `pack_missing`/`platform_unsupported`，不写 bogus target」。
- [x] 核对 current/service 写入顺序：`src/runtime/supervisor.ts:600-609` 先写 service 再写 current；崩溃窗口规则落 Task 1/2。
- [x] 核对首次 `runtime/status` 在 `ensure()` 前的 `version` 来源：`src/runtime/ops.ts:77` 先填目标版本，只有存在 view 时才被 `:112` 覆盖；Task 1 改成优先读 current。
- [x] 确认落点：新增 `src/runtime/upgrade.ts` 成立——`getSupervisor` 仅 `bridge.ts:103` 引用，`ops.supervisor()` 只消费 `{status,ensure,retry}`；备选（bridge 内控制器）不启用。
- [x] 确认测试缝：supervisor 的 `spawn`/`fetchImpl`/`timers`/`readyTimeoutMs`/`isAlive`/`executablePath` 可注入；provision 的 `extract` 可注入；coordinator 的时钟与 FS 可注入。
- [x] 记录「不改 engine」的核对结论：spec §6 改动面全在 host 与面板；引擎从 `runtime/<version>/engine` 启动，回滚＝启旧目录，无需引擎配合。

**实测（实施期回填）**：2026-10-25 只读核对完成，未发现与 spec 冲突项，Task 0 全部闭合（手册修正已于 `ce6b327` 落盘）。
- 代码事实：`bridge.ts:76` 目标为空时退化为 `0.0.0-0`，`:118` 才返回 `pack_missing`；`supervisor.ts:480` 在 `adopt` 内回写 current、`:609` 在启动成功后回写，`:600-608` 的 service 写入先于 `:609` 的 current ⇒ 崩溃窗口真实存在；`zip.ts:144`/`:153` 与 `provision.ts:28` 都只判 `runtime-manifest.json` 存在、不校验内容；`process.ts` 的 pid 可空与 `supervisor.ts:191` 的 `executablePath=null` 一致；`kb_proxy.ts:391` 三个特权 op、`:432-435` 四个 runtime op。
- 现场：`current.json`=0.1.0-1；`service.json`=0.1.0-1、ports 6334/6335/8021、pid/qdrantPid null；`lease.json` owner `2f7b3b10f04feb20`/pid 75512（本 DSH）；8021 由 pid 65544 持有；`0.1.0-1` 与 `0.1.0-2` 的 `configVersion` 均 44；0.1.0-2 zip 330,283,067 B / sha `05cc423b…`；`runtime.json.urls=[]` ⇒ 本机验收必须带 `DSH_HARNESS_RAG_PACK` 绝对路径。
- 退出清理：沿用分发 plan §5.11 的 10-25 真机证据（Task 8 行 187/264：退出后 DSH 与 qdrant/engine 全消失，宿主 Job 回收）；本轮不重验，切换后的实况由 Task 6 重启覆盖。
- 落点/测试缝：`src/runtime/upgrade.ts` 无生命周期冲突（supervisor 仅 bridge 引用，ops 只消费三方法）；supervisor 六个注入缝、provision `extract` 均已在现有测试中使用。
- 并行会话（G11）只动 `src/index.ts`（仅注释）、`src/tool_gating.ts`、`tests/tool_gating.test.ts`、`src/retrieval_discipline.ts` 与两份 rag-soul-section 文档，不碰 runtime 接线与面板。

## Task 1 — 版本状态模型与 current 所有权

> 动到的文件：`src/runtime/manifest.ts`、`src/runtime/supervisor.ts`、`src/runtime/ops.ts`、`tests/runtime_manifest.test.ts`、`tests/runtime_supervisor.test.ts`、`tests/runtime_ops.test.ts`。

- [x] `manifest.ts` 增加 `UpgradeRecord` 与 `FailedRecord` 的类型/校验：版本字段走 `isRuntimeVersion`，时间戳非空，`state` 只接受 `pending|ready|needs_confirmation|blocked`，失败记录 `rolledBack` 布尔；坏记录降级为 null，不抛。
- [x] `current.json` 所有权移交：新增 `readCurrent`（`sanitizeCurrent`）与 `writeCurrent({runtimeVersion, previousVersion?})`；supervisor 不再在 `adopt`/`start` 里直接 `markCurrent`，改由协调者写。首次成功启动或首次认领且文件缺失时写 `{runtimeVersion}`；普通重启/认领不改；切换成功写 `{runtimeVersion: 目标, previousVersion: 原当前}`。
- [x] current/service 一致性：健康 `service.json` 的版本优先于 current；不一致时回写 current；service 版本没有对应已装 runtime 时 `blocked`（`state_version_conflict`），不启动第二套栈。补崩溃窗口（先写 service、后写 current 之间失败）测试。
- [x] `adopt()` 增加期望版本参数：`record.runtimeVersion !== expectedVersion` 时拒绝认领（返回 null，不杀、不删、不释放租约），由协调者决定是 `blocked` 还是另起目标。
- [x] `RuntimeStatusView` 增加 `targetVersion?`、`previousVersion?` 与 `upgrade?`（字段形状按 spec §3.6）；`ops.ts` 从 `current.json` 读 `previousVersion`，`version` 仍表示正在运行的版本；首次 `runtime/status`（`ensure()` 之前）有 current 时必须先填 current，不能填目标版本。
- [x] 单测：坏 current/upgrade/failed 记录降级；首次写 current 不带 previous；普通重启不覆盖 previous；切换写 previous；版本不匹配的 service 不被认领；首次 status 版本是 current；current/service 冲突按上述规则回写或 blocked。
- [x] 门禁：`tsc` 0 错；相关测试全绿；现有 231 条无回归。

**实测（实施期回填）**：2026-10-25 实施完成，已提交 `36865c9`。
- 模型：`manifest.ts` 增 `UpgradeState`/`UpgradeRecord`/`FailedRecord` 与 `sanitizeUpgrade`/`sanitizeFailed`；版本字段走 `isRuntimeVersion`，时间戳非空，坏记录降级 null。失败记录的 `fromVersion` 允许空串——只用于首次安装没有旧版可回滚的情形。
- current：新增 `readCurrent`/`writeCurrent`（tmp+rename 原子写）与纯函数 `planCurrent`（`first|keep|rewrite|conflict`）。supervisor 去掉无条件 `markCurrent`：current 缺失/损坏时首次写 `{runtimeVersion}`；同版本 keep；健康 service 与 current 不一致且该版本已装 ⇒ 回写并记 `previousVersion`（崩溃窗口）；该版本无 `runtime-manifest.json` ⇒ 不回写、adopt 照常可用，`status.upgrade` 标 `blocked`/`state_version_conflict`，不启动第二套栈。
- `adopt(expectedVersion)` 版本不匹配直接返回 null，探测前拒绝（不杀、不删、不释放租约）。
- 视图/载荷：`RuntimeStatusView` 增 `targetVersion?`/`previousVersion?`/`upgrade?`；`RuntimeStatusPayload` 增 `previousVersion?` 与 `targetVersion?`（后者待 Task 2/5 填值）；`statusPayload` 在有 current 且无 ready view 时用 current 的版本，ready view 以实际运行版本为准。
- 门禁：`tsc` 0 错；三组相关测试 78/78；全量 256/256（含 G11 新增 tool_gating 用例），无回归。
- 与 plan 的差异：首次写与崩溃窗口回写仍由 supervisor 在确认 service 健康后执行；协调者（Task 2）接管决策与完整 `blocked` 状态，Task 2 接线时再决定是否把 `applyCurrent` 收回协调者。`blocked` 的 `configVersionChanged`/`requiresConfirmation` 暂为 false，由协调者覆盖。

## Task 2 — 升级协调者与激活决策

> 动到的文件：新增 `src/runtime/upgrade.ts`、`src/runtime/bridge.ts`、`src/runtime/ops.ts`、`tests/runtime_upgrade.test.ts`、`tests/runtime_bridge.test.ts`。

- [x] 新增 `createUpgradeCoordinator`，接口至少 `status()`、`ensure()`、`retry()`、`confirm()`、`dispose()`；内部持有 current/target、旧版 supervisor、目标 supervisor、升级记录与后台准备的 AbortController。
- [x] `ensure()` 单飞：轮询/面板重复调用只复用同一个 in-flight promise；`dispose()`/`configureRoot` 中止后台下载并释放 provision 锁。
- [x] 实现 spec §3.2 的八行决策表（从上到下先命中先执行）：
  - 目标 == 当前，或既无 current 也无 service 且无失败记录 ⇒ 原逻辑；
  - 失败记录存在：有 current 时保持/启动旧版，无 current 时 `phase=error`（`upgrade_failed`）；状态 `failed`，不自动重试；
  - 旧实例健康 + 租约被另一个存活宿主持有 ⇒ 认领旧版、后台准备、`blocked`，不切；
  - 旧实例健康 + 租约空闲/本宿主 + 配置相同/已确认 ⇒ 认领旧版、后台准备、`pending`→`ready`，本次不切；
  - 旧实例健康 + 租约空闲/本宿主 + 配置不同且未确认 ⇒ 认领旧版、后台准备、`needs_confirmation`，本次不切；
  - 旧实例不健康 + 租约被另一个存活宿主持有 ⇒ `blocked`，不启动、不杀；
  - 旧实例不健康 + 租约空闲 + 配置版本不同且未确认 ⇒ `needs_confirmation`；
  - 旧实例不健康 + 租约空闲 + 包就绪 + 配置相同/已确认 + 无失败记录 ⇒ 启动目标（Task 3）。
- [x] current 缺失但 `service.json` 合法时，以 `service.json.runtimeVersion` 作为当前版本；两者都缺才按首次安装处理。
- [x] 目标清单不可用：pack 缺失/非法/平台不支持 ⇒ 目标为空；有 current 时 `blocked` + `pack_missing`/`platform_unsupported`，无 current 时 `error`；不把 `0.0.0-0` 写进 `upgrade.json`/`current.json`。
- [x] current/service 冲突：健康 service 的版本优先并回写 current；service 版本无对应已装 runtime 时 `blocked`（`state_version_conflict`），不启动第二套栈。
- [x] 决策阶段旧版只读探测：给 supervisor 增加 `probe()` 或 `ensure({adoptOnly:true})`，不复用会在探测失败后自动 `start()` 的路径；只有回滚/明确运行旧版时才启动旧版。`getSupervisor` 现有单例的 `ensure()` 也要避开这条探测路径。
- [x] 按版本构造 supervisor：`ensureRuntime` 闭包必须绑定该 supervisor 的 `runtimeVersion`；旧版只复用已装 manifest，缺失时回滚失败，绝不能拿目标版本的 pack 回调去准备旧版。
- [x] 后台准备：目标包缺失时调现有 `ensureRuntime`（下载源 `urls` 或 `DSH_HARNESS_RAG_PACK`），进度写入 `upgrade.progress`；下载/校验/解压/锁等待失败保持旧版，状态 `blocked` + `upgrade.error`，**不写** `failed-<version>.json`（该文件只给健康门失败），下一次激活自动重试。
- [x] 「不热切换」：同一宿主内的插件重载即使旧服务健康也只准备包，不拆旧 supervisor、不换版本；用注册表里是否已有当前版本的 supervisor 单例来区分重载与新进程。旧服务已不在且租约空闲时，本进程可启动目标作为恢复；不允许先停健康旧版再起目标。横幅提示重启 DSH。
- [x] headless：配置版本相同允许切换；不同则停在旧版并把 `needs_confirmation` 写入状态与日志；外部模式完全绕过。
- [x] bridge 接线：`ensureSupervisor` 不再直接把 `version` 当唯一版本；`ops.supervisor()` 返回协调者 facade，面板的 `runtime/status`、`runtime/retry` 仍走原入口；`configureRoot` 换根时释放协调者与旧 supervisor。
- [x] 单测：决策表八行各一例（含旧实例健康 + 配置版本不同 ⇒ `needs_confirmation`）；旧实例健康时不启动目标、不改 current；租约占用不杀；headless/外部分支；插件重载不切换；pack 缺失/平台不支持；current/service 冲突；旧版已死 + 租约空闲时本进程恢复启动目标；旧版健康时绝不主动停。
- [x] 门禁：`tsc` 0 错；`runtime_upgrade` 全绿；现有 supervisor/bridge 测试无回归。

**实测（实施期回填）**：2026-10-25 实施完成，已提交 `946d192`。
- 新增 `src/runtime/upgrade.ts`：`createUpgradeCoordinator` 持有按版本 supervisor 表、current/target、`upgrade.json` 读写、后台准备与 `AbortController`；`ensure()` 单飞，`dispose(forget?)` 中止准备并按需注销单例。
- 决策表八行全部落地：同版本/首次走原 supervisor；失败文件优先；旧版健康时只 `probe()`+`adopt()`（新增公开只认领接口），按租约/配置给 `blocked|pending→ready|needs_confirmation`，绝不 `ensure()` 起第二套；旧版不健康时按租约→配置→包就绪顺序，最后交给 `activate`（Task 3 注入，bridge 暂不传）。current 缺失回退 service 版本；current 落后于健康 service 时回写并记 `previousVersion`。
- 准备：目标包缺失时后台 `ensureRuntime`，进度写 `upgrade.progress`；失败写 `upgrade.error` + `blocked`，不写失败文件；`dispose` 中止下载。`UpgradeRecord` 按 spec §3.1 补了 `error` 字段与校验。
- supervisor 增 `probe()`（只读）、`adopt()`（只认领不启动）、`leaseHeldByOther()`；`RuntimePhase` 提前加入 `switching`。bridge 改为按版本工厂（旧版无 `ensureRuntime` 闭包），`ops.supervisor()` 返回协调者，`configureRoot` 调 `dispose(true)`。
- 门禁：`tsc` 0 错；`runtime_upgrade` 14/14；非 G11 测试 241/241；全量里唯一失败是并行会话 G11 的 `tests/tool_gating.test.ts`（run_id 用例），与本任务无关。
- 与 plan 的差异：①「用注册表单例区分重载与新进程」未单独实现——旧版健康一律不切已覆盖 spec 补充规则，区分只影响能否停健康旧版，而本对禁止停；②provision 锁的释放随 Task 4，本任务先保证中止下载；③为保持插件重载语义，协调者构造时即持有目标 supervisor 单例，`stop()` 照旧只 dispose 不注销。

## Task 3 — 切换、90 秒共享预算、回滚与失败记录

> 动到的文件：`src/runtime/supervisor.ts`、`src/runtime/upgrade.ts`、`src/runtime/manifest.ts`、`tests/runtime_supervisor.test.ts`、`tests/runtime_upgrade.test.ts`。

- [x] 目标 supervisor 支持整栈 90 秒预算：`readyTimeoutMs=90_000` 作为 Qdrant + knowledge 的**总截止时间**，不是每个角色各 90 秒；`waitFor`/`runRound` 接受共享 deadline 或按已用时间递减。
- [x] 成功路径：目标 `runRound` 成功 ⇒ 写目标 `service.json` ⇒ 协调者写 `current.json`（目标 + previous）⇒ 删 `upgrade.json` 与 `failed-<target>.json` ⇒ Task 4 清理 ⇒ `phase=ready`。
- [x] `upgrade.json` 只记 `pending|ready|needs_confirmation|blocked`；健康门失败时删除它，由 `failed-<target>.json` 作为唯一失败记录；重试时删失败文件并重建 `pending`。
- [x] 失败路径：目标提前退出或 90 秒超时 ⇒ 停本轮目标子进程 ⇒ 删目标 `service.json` ⇒ 写 `failed-<target>.json`（先 `rolledBack:false`）⇒ 存在 `current` 时启动旧版 supervisor（正常 120 秒/角色）⇒ 旧版健康则 `phase=ready`、`upgrade.state=failed`、`rolledBack:true`；旧版也失败则 `phase=error`、`error.code='rollback_failed'`、`rolledBack:false`；没有 `current` 则不启动旧版、`phase=error`、`rolledBack:false`。准备阶段失败不走这条路径（见 Task 2）。
- [x] 90 秒预算只在有 `current` 的升级里启用；首次安装仍用现有 120 秒/角色。旧服务已不在、本进程恢复启动目标时同样走 90 秒门；成功后 `previousVersion` 取 `current.json` 的版本（若有）。
- [x] 失败不自动重试：后续激活见失败记录就停在旧版；`runtime/upgrade {action:'retry'}` 删记录、状态回 `pending`；有旧服务时等下次 DSH 启动，没有旧服务时本次可直接启动目标。
- [x] 切换中 `phase='switching'`；不允许并发第二个切换（升级记录 + 租约）。
- [x] 失败记录含 `runtimeVersion`、`fromVersion`、`failedAt`、`error{phase,code,detail}`、`rolledBack`；不写 token、日志全文、环境变量。
- [x] 单测：Qdrant 50 s + engine 30 s 成功；总 91 s 超时失败；目标 Qdrant 起不来；目标 engine 起不来；旧版回滚成功/失败（含旧版目录缺失 ⇒ `rollback_failed`）；失败记录抑制自动重试；retry 清记录。
- [x] 门禁：`tsc` 0 错；supervisor/upgrade 测试全绿；现有崩溃、端口重试、看门狗测试无回归。

**实测（实施期回填）**：2026-10-25 实施完成，已提交 `37b6095`。
- 共享预算：`SupervisorOptions.nowMs` 可注入；`start(budgetMs)` 在租约/端口准备后算一次 deadline，`runRound(ports, deadline)` 把同一截止时间传给 Qdrant 与 knowledge 两次 `waitFor`，绑定重试也共用。`ensure({readyTimeoutMs})` 只影响本次启动；默认仍 120000。
- 切换：协调者新增 `switchTo`——`target.ensure({readyTimeoutMs:90_000})`；成功时写 `current.json`（目标 + `previousVersion`）、删 `upgrade.json` 与 `failed-<target>.json`、`phase=ready`。失败时先写 `failed-<target>.json`（`rolledBack:false`）、删 `upgrade.json`、`dispose` 目标，再以 120 秒/角色启动旧版；旧版健康则把失败记录改 `rolledBack:true` 并回 `phase=ready`，否则 `phase=error` + `rollback_failed`。无旧版时不回滚、直接 `phase=error`。
- 重试：`retry()` 删目标失败文件、清 `upgrade.json`/`prepError` 后重跑决策；旧版健康则只认领并回 `pending/ready`，旧版不在则本次走 `switchTo`。
- 并发：`ensure()` 单飞；切换期间 `phase='switching'`；租约仍由目标 supervisor 在启动时获取。
- 门禁：`tsc` 0 错；`runtime_upgrade`+`runtime_supervisor` 52/52；非 G11 247/247；全量 275/275（G11 的 run_id 用例已恢复）。
- 说明：①50 s+30 s 的成功长跑与 91 s 超时用可注入时钟按比例验证（总 90 被共享截止截断、单角色时间也够），未做真实分钟级等待；②「旧版目录缺失」以旧版 `ensure()` 报错等价覆盖，未单独删目录；③Task 4 的旧版清理未接，成功切换暂不删更老版本。

## Task 4 — provision 锁、旧版清理、配置版本确认

> 动到的文件：`src/runtime/provision.ts`、`src/runtime/upgrade.ts`、`src/runtime/manifest.ts`、`tests/runtime_provision.test.ts`、`tests/runtime_upgrade.test.ts`。

- [x] `state/provision.lock`：拿锁前先 `mkdir state/`；独占创建；owner pid 存活时，后台（旧服务可用、为下一版准备）不等待、直接 `provision_held`（状态保持 `pending`，下一次轮询/激活复用）；前台（首装或没有旧服务可用的恢复启动）最多等 10 分钟（常量可调），出现目标 manifest 即复用，超时 `provision_held`；pid 不存在或已不存活 ⇒ 陈旧；pid 无法判定时 `startedAt` 超过 15 分钟 ⇒ 陈旧，删锁重试一次。
- [x] `ensureRuntime` 在检查已安装之前拿锁，`finally` 释放；锁只包下载/解压，不影响服务启动的 `lease.json`；`.part` 续传与 `.tmp` 原子改名保持。
- [x] 本地 `DSH_HARNESS_RAG_PACK` 分支：解压前用 `statfsSync` 做与下载相同的空间检查。目标版本的下载/本地、解压/复用两条路径都校验 manifest 的 `runtimeVersion` 等于目标、`configVersion` 等于 `runtime.json` 目标条目（若后者有值），不符报 `manifest_mismatch`，不写成功状态；旧版回滚只校验 `runtimeVersion` 等于旧版，不拿目标的 `configVersion` 比旧版。
- [x] 清理函数：成功后保留 current 与 previous；删 `runtime/` 下名字通过 `isRuntimeVersion`、含 `runtime-manifest.json`、不在保留集合的目录，并删对应 `failed-<version>.json`；`.tmp`、未知目录、无 manifest 目录不动；删除失败只记日志，不挡 `ready`；下一次成功切换再试。目标版本变化时删旧目标的失败文件。
- [x] 配置版本：只在存在当前版本（升级）时比较；从 `runtime/<current>/runtime-manifest.json` 与目标包读取 `configVersion`；两者为正整数且相等 ⇒ 自动；缺失/0/不同 ⇒ `needs_confirmation`；首次安装不比较，直接按目标建种子。
- [x] 确认：`runtime/upgrade {action:'confirm'}` 仅在 `needs_confirmation` 时写 `upgrade.json.confirmedConfigVersion`；目标版本或目标 `configVersion` 变化后确认失效；headless 不自动跨配置版本切换。
- [x] 空间：下载路径沿用 `downloadPack` 的空闲空间检查；本地 pack 分支也先查；不足保持旧版、`no_space`，不删旧包。
- [x] 单测：两个并发 `ensureRuntime` 只下载/解压一次；后台锁占用直接 `provision_held`、首装等待复用；陈旧锁接管；清理保留集合与跳过规则；`configVersion` 首次安装不比较、升级相同/不同、当前缺失 ⇒ `needs_confirmation`、目标缺失 ⇒ `manifest_mismatch`；确认失效；空间不足不删旧版；目标复用的 manifest 版本/configVersion 不符 `manifest_mismatch`；旧版回滚只校验版本；目标变化删旧失败文件。
- [x] 门禁：`tsc` 0 错；provision/upgrade 测试全绿；现有 provision 测试无回归。

**实测（实施期回填）**：2026-10-25 实施完成，已提交 `8a1732c`。
- 锁：`state/provision.lock` 用 `wx` 独占创建（owner/pid/startedAt）；pid 不存活、时间戳不可解析或超过 15 分钟视为陈旧，删锁重试一次；后台持有者存活时直接 `provision_held`，前台最多等 10 分钟（每 500 ms 查一次目标 manifest），出现即复用；`ensureRuntime` 全路径 `finally` 释放，不影响 `lease.json`。协调者把后台 `provision_held` 保持为 `pending` 且不落 `prepError`，下一次轮询会再试。
- 校验/空间：复用与解压后都校验 `runtimeVersion`+`configVersion`，不符 `manifest_mismatch`（解压出的坏目录会删掉）；本地 pack 解压前用 `statfsSync`（`freeBytesAt` 已导出）做与下载相同的空间检查，`no_space` 不动旧目录。
- 清理：`cleanOldVersions(root, keep)` 保留 current+previous，删更老的已装版本及其 `failed-<v>.json`；`.tmp`、未知目录、无 manifest 目录跳过；删除失败只回日志。成功切换后调用；目标变化时另删其他版本的失败文件。
- 配置确认：沿用 Task 2 的比较与确认；补测首次安装不比较、当前 manifest 缺 `configVersion` ⇒ `needs_confirmation`、确认后目标 `configVersion` 变化 ⇒ 重新确认。
- 门禁：`tsc` 0 错；provision+upgrade 35/35；全量 286/286。
- 与 plan 的差异：①锁等待按 spec §3.3 落为「后台不等/前台 10 分钟」，plan 原句的 30 秒不再使用；②目标 manifest 的 `configVersion` 为 0 会在 `runtime.json` 校验阶段判 `manifest_invalid`（不是 `manifest_mismatch`），属于既有 schema；③旧版回滚不经 provision，直接从已装目录启动，因此只以目录可用性兜底、不比对 `configVersion`；④顺带导出 `download.freeBytesAt`、bridge 透传 `background`，`tests/runtime_config.test.ts` 的已装夹具改为合法 manifest。

## Task 5 — 状态载荷、op 与面板

> 动到的文件：`src/runtime/ops.ts`、`src/kb_proxy.ts`、`client.js`、`tests/runtime_ops.test.ts`、`tests/runtime_upgrade.test.ts`；必要时 `src/runtime/bridge.ts`。

- [x] `RuntimeStatusPayload` 增加 `upgrade`、`targetVersion?`、`previousVersion?`；`phase` 接受 `switching`；`statusPayload` 在 `ready` 时也带 `upgrade`（失败/待启用/待确认/阻塞）；首次 `runtime/status`（`ensure()` 之前）的 `version` 先读 current，不能先填目标版本。
- [x] 注册 `runtime/upgrade`，只接受 `confirm|retry`，加入 `PRIVILEGED_OPS`（与 `runtime/configure`/`pickDirectory`/`retry` 同等待遇）；非法 action 返回 `bad_request`（HTTP 400），`confirm`/`retry` 的前置状态不满足时返回 `upgrade_state`（HTTP 409），不改文件；在 `kb_proxy` 的 `errorStatus` 落映射，或用带 `status` 的 `HarnessRagError`。有旧服务时动作只改状态等下次启动，没有旧服务时可让本次激活直接启动目标。
- [x] 面板：升级横幅只在 `phase==='ready'` 时显示，放在锚点告警与嵌入引导之前；文案按 spec §3.6；`ready`/`blocked` 可关闭，`needs_confirmation`/`failed` 不可关闭；`failed` 提供「下次启动重试」与日志路径复制；`pending` 有进度时显示百分比。
- [x] 轮询：`phase==='ready'` 且 `upgrade.state` 不在 `pending|blocked` 才停；否则继续每秒拉。
- [x] `runtimeStageKey` 增加 `switching`；zh/en 词条：`rt.phase.switching`、`rt.upgradePending`、`rt.upgradeReady`、`rt.upgradeConfirm`、`rt.upgradeConfirmAction`、`rt.upgradeFailed`、`rt.upgradeRetry`、`rt.upgradeBlocked`；不新增 tab。
- [x] `ready` + 升级失败仍显示六 tab，只用横幅；只有 `phase='error'`（含回滚失败）走现有错误卡。
- [x] 单测/检查：op 前置状态、400/409 映射与文件副作用；payload 字段；首次 status 版本是 current；`node --check client.js`；浏览器/沙箱能起时实点横幅与按钮，不能起时如实记录「仅静态/单测覆盖」。
- [x] 门禁：`tsc` 0 错；`node --test` 全绿；`node --check client.js` 通过。

**实测（实施期回填）**：2026-10-25 实施完成，已提交 `8135daa`。
- 载荷：`RuntimeStatusPayload` 增 `upgrade`/`targetVersion`/`previousVersion`；`statusPayload` 把协调者 view 的 `upgrade` 原样带出（ready 下的 failed/ready/needs_confirmation/blocked 都会显示），`version` 仍先读 current、ready view 为准；`switching` 相位在 Task 2 已入 `RuntimePhase`。
- op：`runtime/upgrade` 加入 `PRIVILEGED_OPS` 与 runtime op 表；只接受 `confirm|retry`，非法 action 抛 `bad_request`；协调者的 `upgrade_state` 被转成 `RuntimeOpError`，`kb_proxy` 的 `RuntimeOpError` 分支按 `upgrade_state→409`、其余 `→400` 返回。`confirm` 只写 `confirmedConfigVersion`；`retry` 清失败记录并重跑决策（旧服务在则不切，旧服务不在可本次启动目标）。
- 面板：zh/en 增 `rt.phase.switching` 与 8 条升级词条＋原因映射；`runtimeStageKey` 认 `switching`；轮询在 `ready` 且升级状态非 `pending/blocked` 时停；横幅置于锚点告警之前，ready/blocked 可关，needs_confirmation/failed 不可关，failed 带「下次启动重试」与复制日志，pending 带百分比。
- 检查：`tsc` 0 错；`runtime_ops` 26/26；全量 290/290；`node --check client.js` 通过。
- 未做：没有起浏览器实点横幅/按钮（需要重启 DSH 加载新 `client.js`，候令），本轮只到静态检查与单测；`runtime/upgrade` 返回 `statusPayload`，不触发嵌入探针。

## Task 6 — 真机验收

> 证据落 `D:\hrag-t6\acceptance-2026-10-25-upgrade`（仓外）；不把运行时目录、zip、日志全文带进提交。

- [x] 每段测试前重置：恢复 `runtime.json`，删 `state/upgrade.json`/`state/failed-*.json`/坏包/坏版本目录，停掉测试 DSH，确认 `current.json`/`service.json`/`lease.json` 与本段前置一致；token 脱敏。
- [x] 基线：确认 `D:\hrag-t6\dsh-root\harness-rag` 当前 `0.1.0-1`、8021 健康、lease owner 是当前 DSH；记录 `current.json`/`service.json`（token 脱敏）。
- [x] 正常升级：设 `DSH_HARNESS_RAG_PACK=E:\app\python\agent\dsh-harness-rag\dist\harness-rag-runtime-win32-x64-0.1.0-2.zip`（绝对路径），启动 DSH；两边 `configVersion` 都是 44，应自动切换、不要求确认；旧服务仍健康时只准备包、状态 `pending`→`ready`，`current.json` 不变；重启 DSH（候令）后确认旧服务退出、`0.1.0-2` 启动、`current.json={0.1.0-2, previousVersion:0.1.0-1}`、库列表与检索可用。
- [x] 失败回滚：做一个坏的目标包（复制 `0.1.0-2` zip，删/坏一个 engine 运行必需文件，改 manifest 版本为 `0.1.0-3`），临时把 `runtime.json` 指到它并设本地 pack；启动 → 90 秒内失败 → 旧版回来、`failed-0.1.0-3.json` 存在、`rolledBack=true`、面板失败横幅；再次启动不自动重试。测试后恢复 `runtime.json`，清理坏包、`runtime/0.1.0-3` 与失败文件，不提交测试值。
- [x] 手动重试：点「下次启动重试」→ 失败文件消失、状态回 `pending`；换回好包后重启 → 成功、失败/升级记录清理、current 更新。
- [x] 配置版本确认：把目标包 manifest 与 `runtime.json` 目标条目的 `configVersion` **同时**改成 45（只改一处会先报 `manifest_mismatch`）→ `needs_confirmation`、不自动切；有旧服务时点确认后重启才切；headless 分支记录。
- [x] 目标清单不可用：临时把 `runtime.json` 改成缺当前平台条目/非法 JSON → 有当前版本时 `blocked` + `pack_missing`/`platform_unsupported`，当前版本照用；不写 `0.0.0-0`，不起新栈；恢复清单后再验。
- [x] 版本记录冲突：正常升级到 `0.1.0-2` 后停 DSH，把 `current.json` 手改回 `0.1.0-1`，保留健康的 `service.json=0.1.0-2`；启动 → 以 service 为准回写 current，不启动第二套栈；若把 service 版本改成无对应 runtime 的值 → `blocked`（`state_version_conflict`）。
- [x] 租约/旧实例：先停当前 DSH（候令）；用第二个 DSH profile 指向同一运行根（确认 `backendUrl` 为空、托管模式）并启动、持有 lease；再启动原 profile → `blocked`、不杀、不换；停掉持有者后下一次启动或旧服务已死时的轮询恢复再切换。
- [x] 清理：在升级到新版本前，在 `runtime/` 放一个带 manifest 的假 `0.0.9` 目录；成功切换后确认被删、对应失败文件被删；`<version>.tmp` 与无 manifest 目录保留。
- [x] 同版本零动作：`runtime.json` 目标等于当前 → 不下载、不写升级记录、不清理。
- [x] 门禁：`tsc` 0；`node --test tests/*.test.ts` 全绿；`node --check client.js`；`engine/` 与主树零 diff；全仓扫 token/api_key 不出现在新状态文件与日志样例。
- [x] 记录每条验收的证据文件、命令、时间；未跑到的项如实写「未覆盖」，不宣称通过。

**实测（实施期回填）**：2026-10-26 01:13–01:43 UTC 实施。证据全部落 `D:\hrag-t6\acceptance-2026-10-25-upgrade`（含 `README.md`、`snap-00…13`、`full-tests.log`）；浏览器未实点，UI 结论只到 payload/单测层。
- 环境差异：为不重启桌面 DSH（8021），改用隔离 `DSH_HOME=D:\hrag-t6\dsh-home-upgrade` + 同根 root + CLI profile `upg`/`upg2`（3081/3082）；桌面根仅做基线读取（`0.1.0-1`、8021 健康、lease pid 75512），未改其状态。
- **正常升级**：真实 0.1.0-2 zip（330,283,067 B / `05cc423b…`）经本地覆盖解压；`pending(17→100%)→switching→ready 0.1.0-2`，`current={0.1.0-2, previousVersion:0.1.0-1}`；建库上传 6 片，recall 的 vector/graph/wiki 三路均命中。旧服务健康时用同环境手工常驻 0.1.0-2 栈模拟 adopted 旧实例：target 0.1.0-3 只准备、`upgrade=ready`、current 与服务 startedAt 不变；停宿主后该 adopted 服务仍存活。
- **失败/重试**：合成 0.1.0-3 坏包（仅 manifest，无 qdrant/python）→ `qdrant_exited`，旧版回滚 ready，`failed-0.1.0-3.json rolledBack=true`，current 不变；再次启动 `failedAt` 不变、无 switching；`runtime/upgrade {retry}` 200，失败文件删除并回 ready；换好已装 0.1.0-3 后重启切换成功。清理删 0.1.0-1、假 0.0.9 及其失败文件，保留 `0.0.9.tmp`、无 manifest 目录与非法名 `@keep`。
- **配置确认**：target 0.1.0-4/config 45 vs 当前 0.1.0-3/config 44 → `needs_confirmation`（phase ready、不切）；`confirm` 写 `confirmedConfigVersion:45` 并转 ready；重启后切到 0.1.0-4。headless 未实跑。
- **清单/冲突/租约/同版本**：非法 JSON → `blocked`/`manifest_invalid`，当前 0.1.0-4 照用；current 手改 0.1.0-3 + 健康 service 0.1.0-4 → 回写 current/previous，无第二套栈；service 改 0.1.0-9（无 runtime）→ `blocked`/`state_version_conflict`，进程不变；A(upg) 持 lease、B(upg2) target 0.1.0-5 → `blocked`/`upgrade_blocked_by_instance`，A 与 current 不变；target==current==0.1.0-4 → 无 `upgrade.json`、不清理、current 不变。
- **验收中发现并修复**：`selectPack` 在 `urls=[]` 时先判 `pack_missing`，本地 `DSH_HARNESS_RAG_PACK` 覆盖无法生效，正常升级路径起不来；`selectPack`/`loadPack` 增 `allowUnpublished`（仅本地覆盖时接受已构建未发布条目，仍拒 `0.0.0-0` 与 0 size），bridge 在覆盖非空时传入；`tests/runtime_manifest.test.ts` 增 3 例。另记一条环境边角：陈旧 `lease.json` 的 pid 被无关 `bash.exe` 复用，曾误报 `upgrade_blocked_by_instance`，删陈旧租约后 `retry` 恢复；未改代码。
- **门禁**：`tsc` 0 错；`node --check client.js` 过；`node --test tests/*.test.ts` **296/296**、fail 0；`engine/` `git status` 0 行；主树 `deer-flow` 脏面 mtime 为 10-06/10-10，属既有未提交面、本轮零新增；证据启动 token/auth cookie 已删除或脱敏，快照 token 为 `<redacted>`。
- **未覆盖**：浏览器实点横幅/按钮（browser-use 被 DSH web 鉴权挡）；headless 实跑；无主残留（端口仍应答 + pid null；Task 8 已实现）；90 秒超时真机（本轮走的是 `qdrant_exited` 立即失败）；`platform_unsupported`、并发 provision、`no_space`、清理删除失败的真机分支（均有单测，不宣称真机通过）。plan 原写的“复制 0.1.0-2 zip 改坏”以合成坏包替代；0.1.0-3/4/5 的“好版本”用已装目录复制/硬链接，正常 0.1.0-2 升级仍用真实 zip 与解压。
- 代码修复与 plan 回填按“修复/回填”两次提交收口；Task 7 的文档与提交链见下。

## Task 7 — 文档、回写与提交链

> 动到的文件：`README.md`、`docs/plugin-manual.md`、分发 spec/plan、本对 spec/plan。

- [x] README/手册：Task 0 已先把 `plugin-manual.md:36/46` 的超前描述改回现状；这里只把现状升级为完成态，写升级步骤（先备份 `state/` 与 `config/`，重启 DSH，失败会回旧版）、面板横幅含义、配置版本确认、`blocked` 与无主残留的手工清理、保留/清理规则、本地 `DSH_HARNESS_RAG_PACK` 仅开发态。
- [x] 分发 spec §4.7 与 plan Task 6 未闭合②/归位行已加「另立本对」承接线（2026-10-25 已做，见两文件的链接）；本对实施完成后把「未实现」改为已实现/闭合。
- [x] 回写本 spec Status（已实施 + 实测值）、plan 各 Task 实测与验收表。
- [x] 工作区已有未提交文件不纳入本对：`THIRD_PARTY_NOTICES.md`、`client.js`、`package.json`、`scripts/build-runtime-pack.mjs`，以及并行会话的 G11 文件（`src/index.ts`、`src/tool_gating.ts`、`tests/tool_gating.test.ts`、`src/retrieval_discipline.ts`、`docs/{specs,plans}/2026-10-25-rag-soul-section-*`）。`client.js` 的升级 UI 改动与其中的既有产品面清理同文件，提交面板笔时必须按 hunk 筛出，不能把 `emptyHint`/legacy 注释裹进升级笔；G11 文件一律不碰。如需先给这些文件一个提交位，另议。
- [x] Task 0 的手册现状修正如果单独提交，先落 `docs(manual): correct the upgrade description to current behavior`，不混进代码笔；以下为实现笔。
- [x] 提交链（英文 Conventional ASCII；逐文件核 hunk；排除并行会话文件、`node_modules/`、`dist/`、zip、运行时产物）：
  1. `36865c9` `feat(runtime): add versioned upgrade state and current ownership`
  2. `946d192` `feat(runtime): add the upgrade coordinator and activation decisions`（Task 2，计划外拆分）
  3. `37b6095` `feat(runtime): switch runtime versions with rollback`
  4. `8a1732c` `feat(runtime): lock pack provisioning and clean old versions`
  5. `8135daa` `feat(panel): surface runtime upgrade state`
  6. `98523c1` `fix(runtime): accept a local pack before the manifest is published`（Task 6 修复）
  7. `233071e` `docs(plan): record the runtime upgrade acceptance`（Task 6 验收）
  8. `ea3fef9` `docs(runtime): document versioned upgrades`（README/手册）
  9. `8e19766` `docs(plan): close out the runtime upgrade pair`（本 spec/plan 与分发回写）
- [x] 提交后回填提交链；仓无 remote，不推送。

**实测（实施期回填）**：2026-10-26 完成文档回写，已提交 `ea3fef9`（README/手册）+ `8e19766`（本对 spec/plan 与分发回写）。
- README/手册：README 增「版本化升级/回滚」段落与状态行；手册把「升级」改成完成态并新增「升级与回滚」节，覆盖准备/切换/回滚、配置确认、保留与清理、备份口径、五类横幅、租约/残留/provision 锁的手工处理、本地 pack 仅开发态。
- 分发回写：spec §4.7 改为最终行为（不再写「先停旧版」），§7 的「不做版本化升级」改为已交付；plan Task 6 未闭合②标已闭合，归位行与历史回写行同步。
- 本对回写：spec Status → 已实施；§5 增实测段；§8 的「无主残留」「手册超前」两行按实际更新；§3.2 的无主残留自动 blocked 标为实现偏差。
- **偏差/未覆盖**：§5.8「端口仍应答但 pid 为 null ⇒ `upgrade_blocked_stale_instance`」当时未实现（2026-10-26 Task 8 已实现：健康实例照常 adopt、升级 blocked；单测覆盖、未真机）；Task 6 的浏览器实点、headless、90 秒超时真机、`platform_unsupported`/并发/`no_space`/清理删除失败真机仍未覆盖。手册已改为自动判定 + 手工清理。
- **提交链实际**：Task 1 `36865c9`、Task 2 `946d192`、Task 3 `37b6095`、Task 4 `8a1732c`、Task 5 `8135daa`、Task 6 修复 `98523c1`、Task 6 验收 `233071e`、Task 7 文档 `ea3fef9`/`8e19766`。原计划的 6 笔不含 Task 2 协调者与 Task 6 修复/验收，按实际拆分为 9 笔。
- **门禁**：文档改动后复跑 `tsc` 0、`node --test tests/*.test.ts` 296/296、`node --check client.js`；`engine/` 零 diff。Task 0 手册笔已单独提交 `ce6b327`。

## Task 8 — 无主残留判定（2026-10-26 增量）

> 动到的文件：`src/runtime/supervisor.ts`、`src/runtime/upgrade.ts`、`tests/runtime_upgrade.test.ts`、本对 spec/plan、`docs/plugin-manual.md`。

- [x] `supervisor.ts` 导出 `probeTcpPort` 与 `leaseOwner`（`none|ours|foreign|stale`）；`leaseHeldByOther` 复用后者，语义不变。
- [x] 协调者在准备/启动目标前判定：`service.json` 属于当前版本、`pid` 为 null、租约不存在或陈旧、知识服务端口仍应答 ⇒ 状态 `blocked`（`upgrade_blocked_stale_instance`），不准备、不切换；健康旧实例照常 `adopt` 保用，不猜 pid、不杀。
- [x] 反例：租约属于本宿主（插件重载）、租约被存活的其他宿主持有（仍走 `upgrade_blocked_by_instance`）、`service.json` 带 pid、端口已关闭 ⇒ 不按无主残留处理。
- [x] 单测 5 例（健康残留阻塞、不健康残留阻塞、端口关闭放行、本宿主租约不阻塞、带 pid 不误判）；禁用判定后前两例转红。
- [x] spec §3.2/§5/§6/§7/§8 与手册同步：删「实现偏差」与「本版没有自动判定」。
- [x] 门禁：`tsc` 0；`node --test tests/*.test.ts` **304/304**；`node --check client.js` 通过；`engine/` 零 diff。（Task 9 探活修复后 **305/305**）

**实测（实施期回填）**：2026-10-26 实施完成。
- 判定链：健康旧实例 `adopt` 后升级仍 `blocked`，库继续可用；不健康且端口应答时只置 `blocked`，不启动任何栈。仅当 pid 为空、端口应答、租约无存活持有者三者同时成立才阻塞；本宿主租约、外来活租约、带 pid、端口关闭均放行。
- 单测：`tests/runtime_upgrade.test.ts` 增 5 例；neuter（`if (false && staleAnswer)`）后 2 例阻塞用例转红、3 例反例保持绿；还原后升级+supervisor 66/66。
- 门禁：`tsc` 0；全量 **304/304**、fail 0；`node --check client.js` 通过；`engine/` 零 diff。
- 真机：2026-10-26 在隔离宿主把 `service.json` 的 pid 置 null、保留真实监听后启动，API 返回 `upgrade_blocked_stale_instance`，面板显示「旧实例残留」并可关闭（Task 9；证据 `D:\hrag-t6\acceptance-2026-10-26-banner`）。真孤儿（宿主崩溃残留）仍未复现。
- 实点修复：默认探活误用了「端口空闲探测」（bind），判定永远不触发；新增 `probePortAnswer`（connect）与单测，修复后同场景阻塞成立。

## Task 9 — 真机覆盖（2026-10-26 进行中）

> 动到的文件：`src/runtime/supervisor.ts`（探活修复）、`tests/runtime_supervisor.test.ts`、本对 spec/plan。

- [x] 升级横幅实点：就绪关闭、配置确认、失败重试＋复制日志、租约被占关闭、旧实例残留关闭；刷新后就绪横幅重现。
- [x] 实点发现并修复：默认端口探活用了 bind（判空闲）当「应答」，`probePortAnswer`（connect）替换；+1 单测。
- [x] 门禁：`tsc` 0；全量 **305/305**；`node --check client.js` 通过；`engine/` 零 diff。
- [ ] headless 实跑。
- [ ] 90 秒整栈超时真机。
- [ ] `platform_unsupported`、并发 provision、`no_space`、清理删除失败真机。
- [ ] `pending` 横幅实点（准备中瞬时态）。

**实测（实施期回填）**：2026-10-26 完成横幅实点。
- 环境：隔离 `DSH_HOME=D:\hrag-t6\dsh-home-banner`（profile `bnr`，3090）；插件为 `git archive HEAD` 副本 link 安装；旧版/目标版硬链接克隆；旧服务手工常驻（8030/6340/6341）；Chrome headless＋CDP 9223 打开 `?token=` 驱动 DOM 与截图。
- 结果：五类横幅（就绪/配置确认/失败/租约被占/旧实例残留）全部按 spec 显示；关闭、确认（写 `confirmedConfigVersion=45`）、重试（清失败文件）、复制日志（`writeText` 捕获 `state/logs`）均生效；就绪横幅关闭后刷新重现。
- 缺陷：探活方向反了（bind 判空闲）；修复后 API 由 `needs_confirmation` 转为 `upgrade_blocked_stale_instance`。
- 未覆盖：`pending` 瞬时态、剪贴板读取（headless 权限拒，改用 `writeText` 钩子）、真孤儿进程。
- 证据：`D:\hrag-t6\acceptance-2026-10-26-banner`（README＋11 张截图＋日志＋探针脚本）。

## 验收对应

| spec §5 | 覆盖 Task | 实测/证据 |
| --- | --- | --- |
| 1 正常升级 | Task 6 | 真机 `snap-01` |
| 2 本次不切换 | Task 2 / Task 6 | 真机 `snap-02`、`snap-06` |
| 3 同版本零动作 | Task 2 / Task 6 | 真机 `snap-09` |
| 4 失败回滚 | Task 3 / Task 6 | 真机 `snap-03`；90 秒超时单测 |
| 5 手动重试 | Task 3 / Task 5 / Task 6 | 真机 `snap-04`、`snap-05` |
| 6 配置版本确认 | Task 4 / Task 6 | 真机 `snap-06/07/08`；headless 未跑 |
| 7 租约与旧实例 | Task 2 / Task 6 | 真机 `snap-13` |
| 8 无主残留 | Task 8 / Task 9 | 单测 5 例；隔离宿主实点横幅（Task 9） |
| 9 清理 | Task 4 / Task 6 | 真机 `snap-05/08` |
| 10 并发准备 | Task 4 / Task 6 | 单测 |
| 11 空间不足与本地包 | Task 4 / Task 6 | 本地包真机；`no_space` 单测 |
| 12 目标清单不可用 | Task 2 / Task 6 | 非法 JSON 真机；`platform_unsupported` 单测 |
| 13 版本记录冲突 | Task 1 / Task 2 / Task 6 | 真机 `snap-11/12` |
| 14 门禁 | 每个 Task / Task 6 | `tsc` 0、296/296、`node --check` 过、`engine/` 0 |

证据根：`D:\hrag-t6\acceptance-2026-10-25-upgrade`（`README.md` + `snap-00…13` + `full-tests.log`）。

## 风险与回退

- **切换期间无服务**：旧版退出到新版就绪之间是停机窗口；正常发生在 DSH 启动阶段，面板显示 `switching`；旧服务已死时本进程恢复启动也会短暂中断。若用户不能接受，回退方案是保留旧服务并只准备包（本对的默认行为），切换留到重启。
- **回滚不保证数据**：新版可能已迁移 SQLite/向量；失败记录只保证服务回到旧版，不保证数据回退。文档明确先备份；不做自动备份。
- **无主残留阻塞**：不猜 pid、不杀；状态 `blocked` 并给端口/日志，用户手工停。若后续要自动化，另立对做端口→pid 发现与所有权核验。
- **current/service 冲突**：崩溃窗口或手工改文件会让两处版本不一致；以健康 service 为准回写，无对应 runtime 时 `blocked`，不启动第二套栈。
- **目标清单不可用**：`runtime.json` 缺失/平台不支持时保持当前，`blocked` `pack_missing`/`platform_unsupported`；不写 `0.0.0-0`。
- **本地 pack 绕过下载校验**：本地分支先查空间，解压后校验 manifest 版本/configVersion；不符报 `manifest_mismatch`。
- **手册超前描述**：`plugin-manual.md:36/46` 在 Task 0 先改回现状，实施完成后再升级为完成态。
- **90 秒误判**：慢机器可能把正常启动判失败；失败会回旧版，不丢服务。实测后再决定是否调常量。
- **provision 锁死**：用 pid 存活 + 15 分钟陈旧判定；仍死锁时删 `state/provision.lock` 后重试，文档记录。
- **面板信息过多**：升级横幅与锚点/嵌入横幅同槽位；升级状态互斥，只在 `phase==='ready'` 显示一条；非 ready 时用整块状态卡，不叠横幅。
