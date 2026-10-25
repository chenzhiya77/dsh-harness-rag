# 运行时韧性收尾 Plan

**Spec:** [2026-10-25-runtime-resilience-spec.md](../specs/2026-10-25-runtime-resilience-spec.md)
**Status:** 待实施（2026-10-25 已拍；D1＝10 s／连续 2 次，D2＝只认日志特征）
**Date:** 2026-10-25
**Architecture:** 四件都落在 host 半的 `src/runtime/`，加面板一处横幅：认领看门狗接在 supervisor 的 adopt 之后（复用现有 `timers` 缝与 `probe()`）；端口抢占重试把 `start()` 的「选口→落配置→起两个子进程」抽成可重入的一轮，失败时按日志特征换口重跑一次；锚点告警把 `resolveRoot` 已有的 `warning` 透到 `runtime/status`，面板用现有 `.hrag-rt-banner` 槽位显示；嵌入判定删掉环境变量近似，只看 `embedding_model`。

**硬约束**：只改 `E:\app\python\agent\dsh-harness-rag`；引擎 `engine/` 与主树 `deer-flow` 零改动；token 与任何 `api_key` 不落日志、不进面板、不进提交面；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。`node_modules/`、`dist/`、运行时 zip 不纳入提交。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无（探针在仓外）。

- [x] **看门狗接入点**：确认 `SupervisorOptions.timers` 可承载递归调度（当前只用于 dispose 的单次计时）；列出四个状态转换点（`adopt` 成功、`ensure` 进入 start、`fail*`、`dispose`）各自该起停看门狗；确认 `probe()` 的 4×`probeIntervalMs` 超时对看门狗够用（要求 ≤2 s）。
- [x] **看门狗不得动盘**：确认 `fail()` 会 `killChildren()`＋删 `service.json`＋释放租约（`src/runtime/supervisor.ts:225-233`），因此认领实例必须走单独路径；记录认领状态下 `killChildren()` 为空的现状。
- [x] **端口重试的日志原文**：用真实 Qdrant 与 uvicorn 各起一次并预先占住端口，把 Windows 上的报错原文抄下来（期望 `os error 10048` 与 `[Errno 10048]`），钉死匹配串；确认子进程退出时 `state/logs/*.log` 已落盘（tail 能读到 bind 错误）。
- [x] **重试的清理面**：确认重跑一轮前必须 `killChildren()`（Qdrant 已起、engine 失败时）；确认 `seedRuntimeConfig` 的 `qdrant_url` 随新端口重写；确认日志文件追加不会让第二轮误判（只在未重试时读 tail）。
- [x] **告警槽位**：确认面板 `.hrag-rt-banner` 的层级（`.hrag-root` 级）与关闭态写法；确认 `statusPayload` 里 `resolved.warning` 的读取点（`src/runtime/ops.ts:89-107`）。
- [x] **嵌入判定消费面**：全仓确认 `needsEmbeddingConfig` 只有 `panelStatus` 一处消费；确认移除环境变量后 `env` 参数仍被 `sourceZip`/`defaultRoot` 使用（`createRuntimeBridge` 签名不变）。

**实测（实施期回填）**：

- **看门狗接入点**：`timers` 是 `{ set(fn, ms): unknown; clear(handle) }`，递归调度无阻碍（目前只用于 dispose 的单次计时）。四个转换点：`adopt()` 成功 `supervisor.ts:338-356`、`ensure()`→`start()` `:458-472`（`start()` 入口 `:370`）、`fail()` `:225-233`、`dispose()` `:485-503`。`probe()` 超时＝`max(1_000, probeIntervalMs × 4)`＝**1 s**（默认 250 ms），满足 ≤2 s。
- **认领实例动盘面**：`fail()` 会 `killChildren()`＋删 `service.json`＋释放租约（`:225-233`）；认领路径没有子句柄（`killChildren()` `:245-256` 为空操作），且 `adopt()` 从不取租约（`:212-218`）⇒ `failAdopted` 必须单独实现，不能复用 `fail()`。
- **真机 bind 原文**（中文 Windows 10；Qdrant 1.20.0、uvicorn 0.46.0；证据 `D:\hrag-t0b\qdrant-probe.out`、`uvicorn-probe.out`）：
  - Qdrant：`ERROR qdrant: Error while starting REST server: 通常每个套接字地址(协议/网络地址/端口)只允许使用一次。 (os error 10048)`，随后 `Error: … (os error 10048)`，退出码 1。
  - uvicorn：`ERROR:    [Errno 10048] error while attempting to bind on address ('127.0.0.1', 26440): [winerror 10048] 通常每个套接字地址(协议/网络地址/端口)只允许使用一次。`，退出码 1。
  - **英文 `address already in use` 在本机不出现**，只有数值码；裸 `10048` 又会撞日志里的端口号 ⇒ 匹配收窄为 `/(os error|Errno|winerror)\s*10048|EADDRINUSE|address already in use/i`（spec §3.2 已同步）。
  - 落盘时序：`spawn.ts` 的 `finish()` 先 `drain()` 再触发 exit 监听（`spawn.ts:80-87`），`fail()` 在 `waitFor` 返回后才读 tail（≥1 个 poll 周期）⇒ 退出时 bind 文本已在盘上。
- **重试清理面**：`seedRuntimeConfig` 每次都重写 `rag_config.json:qdrant_url`（`seed.ts:95-110`），换口后必须重跑；Qdrant 已起而 engine 失败时必须 `killChildren()`（`:245-256`）。日志逐块 append（`:111-129`），`tailOf` 读整文件最后 40 行（`:131-138`）⇒ 旧轮/旧会话的 bind 文本会假命中；改为 spawn 后记 `statSync(log).size`、失败时只读该偏移之后（sink 的 2 MB 轮转发生在创建时、`spawnChild` 返回前）。另：旧 exit 回调没有代际校验，`crash()` 只看 `phase==='ready'`（`:237-240`），第二轮 ready 后旧子进程的迟到 exit 会误翻状态 ⇒ Task 2 用本轮句柄校验。
- **告警槽位**：横幅是 `.hrag-root` 的直接子节点、在 `HragBoundary` 之前（`client.js:21957-21993`），关闭钮 `.hrag-rt-bannerclose` 已有；词条 zh `client.js:99-101`、en `:1003-1005`。`statusPayload` 从 `currentRoot(deps)`（`ops.ts:89`）拿 `resolved`；external 在 `:78-87` 早退、`needs_location` 在 `:104-107` 写 `previousRoot/reason` ⇒ `warning` 只走 `kind==='ok' && warning` 分支。
- **嵌入消费面**：实现只有 `bridge.ts:150-165`，唯一消费点 `panelStatus`（`ops.ts:206`），面板读 payload 字段（`client.js:21969`）；`env` 在 `bridge.ts:72/73/76/127` 仍用于 `DSH_HARNESS_RAG_PACK`、`defaultRoot` 与 deps ⇒ 签名不变。
- **认领卸载的看门狗寿命**：`dispose()` 对「ready 且 adopted」直接早退（`:485-486`），`disposed` 不置位、单例留给重载；若在 `dispose()` 停表，重载后 `ensure()` 因 `phase==='ready'` 直接返回（`:458-464`），服务已死也会永远显示就绪 ⇒ 停止条件改为「`disposed` 置位或 `phase` 离开 ready」，认领实例跨插件卸载继续探活（spec §3.1 已同步）。

---

## Task 1 — 认领看门狗（TDD）（spec §3.1）

> 动到的文件：`src/runtime/supervisor.ts`、`tests/runtime_supervisor.test.ts`。

- [x] 测试先行（6 条）：单次探测失败不翻状态；连续 2 次失败 ⇒ `phase=error`、`code=adopted_unreachable`、`service.json` 仍在、他方租约逐字节未动；健康探测清零计数；卸载（adopted 的 `dispose` 早退）后仍继续探测；重试重新 `adopt()` 回到 `ready/adopted` 并重排看门狗；自管实例不排表。
- [x] 选项：`watchdogIntervalMs`（默认 10_000）、`watchdogFailures`（默认 2）；用 `timers.set` 递归调度，不引入 `setInterval`。
- [x] `adopt()` 成功后起看门狗；`start()` 成功（自管实例）不起——崩溃由 `crash()` 覆盖。
- [x] 新增 `failAdopted(code, detail)`：只改 `status`（`error/adopted_unreachable`）与 `logTail`，不杀子进程、不删 `service.json`、不释放租约（认领路径本就没有租约：`adopt()` 不写 lease，`:212-218`）。
- [x] 停止条件：达到阈值、`disposed` 置位、`ensure()` 进入新一轮、`status.phase !== 'ready'`。**不要**在 `dispose()` 的认领早退路径停表（`:485-486`）：认领实例跨插件卸载继续探活，否则重载后 `ensure()` 因 `phase==='ready'` 直接返回，死服务会永远显示就绪。
- [x] 门禁：`node --test tests/runtime_supervisor.test.ts`；`tsc`。

**实测（实施期回填）**：

- **实现**：`supervisor.ts` 新增 `watchdogIntervalMs`/`watchdogFailures` 选项与 `stopWatchdog`/`scheduleWatchdog`/`probeAdopted`/`failAdopted`；`adopt()` 成功后 `stopWatchdog()`＋`scheduleWatchdog()`，`start()` 与 `retry()` 入口停表，退出条件每次探测前后各查一遍（探测期间 retry/拆除会改变 `phase`）。探测走既有 `probe()`（1 s 超时），读 `service.json` 的端口与 token；记录缺失按一次失败计。重排前先清旧句柄，旧探测晚到不会叠加计时器。
- **`dispose()` 守卫修正（实施期发现）**：原守卫只挡 `ready && adopted`；看门狗引入「adopted＋error」后，卸载会走拆除路径删掉他方的 `service.json` 并释放租约。改为 `if (status.adopted) return`——认领实例任何阶段都不拆，看门狗随单例继续。
- **测试驱动方式**：看门狗在探测完成后才排下一次，测试用假 timers 逐跳 `fire(10_000)`，以「10_000 句柄重新出现」判定一次探测结束；健康/失败交替验证计数清零。
- **门禁**：`node --test tests/runtime_supervisor.test.ts` **21/21**；`tsc` 0 错；全量 `node --test tests/*.test.ts` **210/210**（原 204＋新增 6）。neuter（取掉 `adopt()` 里的 `stopWatchdog()`＋`scheduleWatchdog()`）⇒ 5 条 watchdog 测试转红、其余 16 条仍绿；还原后 21/21。

---

## Task 2 — 端口抢占重试（TDD）（spec §3.2）

> 动到的文件：`src/runtime/supervisor.ts`、`tests/runtime_supervisor.test.ts`。

- [x] 测试先行：真实 `net` server 占住首选口、`isFree` 一律返回 true（模拟探空后被抢）⇒ 第一轮 spawn 撞 `EADDRINUSE` 退出 ⇒ 换口重跑一轮 ⇒ `ready`；`spawned.requests` 记录到两次 Qdrant spawn 且端口不同；两个候选口都被占 ⇒ 重试一次后按 `qdrant_exited` 失败，不无限重试。
- [x] 触发：子进程在就绪前退出且本轮新追加的该角色日志命中 `/(os error|Errno|winerror)\s*10048|EADDRINUSE|address already in use/i`，且本轮尚未重试。检测按偏移：建 sink 后、spawn 前记 `statSync(log).size`，失败时只读该偏移之后（按字节切，中文报错不截断；旧轮/旧会话的 bind 文本不得假命中）。
- [x] 动作：`killChildren()` → 等本轮子进程真正退出（≤3 s）→ 仅失败角色端口 +1（qdrant→`qdrantHttp`、engine→`knowledge`）重新 `planPorts` → 重新 seed → 重跑一轮（Qdrant 与 engine 共用同一条重试路径）。
- [x] 代际校验：exit 回调判「本轮句柄是否仍是当前 `qdrant`/`engine`」，不是则忽略——`crash()` 只看 `phase==='ready'`，第二轮 ready 后旧子进程的迟到 exit 会误翻状态。
- [x] 失败详情：第二轮失败时 `detail` 带 `after one retry`；非绑定原因的提前退出不重试。
- [x] 门禁：`node --test tests/runtime_supervisor.test.ts`；`tsc`。

**实测（实施期回填）**：

- **实现**：`start()` 拆成「`planPorts` → seed → `runRound`」的可重入循环；`runRound(ports)` 返回 `ready` / `exited`（带失败角色与本轮日志）/ `timeout`。`spawnChild` 改为返回 `{ child, appended() }`：建 sink（含 2 MB 轮转）后、spawn 前取字节偏移，`readFrom` 用 `Buffer.subarray(offset).toString('utf8')` 按字节切——直接对字符串 `slice` 会因中文报错（UTF-16 码元与字节不等）截错。
- **重试路径**：条件是「未重试 ＋ 就绪前退出 ＋ 本轮该角色日志命中 bind 特征」；`killChildren()` 后 `whenExited()` 等本轮句柄真正退出（每句柄一个 waiter，兜底 3 s、已退出立即返回），再只把失败角色端口 +1、重跑整轮。第二轮失败时 `detail` 形如 `exit 1 after one retry`。
- **代际校验**：exit 包装先判 `qdrant !== qdrantSpawn.child`（engine 同理），旧轮被 kill 的迟到 exit 不会触发 `crash()`；`whenExited` 的退出状态挂在 `WeakMap<ChildHandle>` 上。
- **测试**：4 条（qdrant 换口后 ready、两口都被占只重试一次、engine 换口只动 `knowledge` 且 qdrant 原口重启、非 bind 的 `process.exit(3)` 不重试）；占口用真实 `net` 监听，`probePort` 恒 true 模拟「探空到 spawn 之间被抢」。
- **实施期修正**：重试的 `preferred` 键必须是 `qdrantHttp`/`knowledge`，不能用角色名；第一版 `{ ...ports, [outcome.role]: … }` 生成 `{ qdrant: … }` 被 `planPorts` 忽略，测试 14/16 转红后改正。
- **门禁**：单文件 **25/25**；`tsc` 0 错；全量 `node --test tests/*.test.ts` **214/214**。neuter（重试分支短路 `false &&`）⇒ 3 条 retry 测试转红、其余 22 条仍绿；还原后 25/25。

---

## Task 3 — 锚点告警上屏（TDD）（spec §3.3）

> 动到的文件：`src/runtime/ops.ts`、`client.js`、`tests/runtime_ops.test.ts`。

- [x] 测试先行：`resolveRoot` 返回 `warning` 时 `statusPayload.warning` 透出；`needs_location` 时不下发 `warning`；external 模式不下发。
- [x] `RuntimeStatusPayload` 增加可选 `warning`，仅在 `resolved.kind === 'ok' && resolved.warning` 时写入。
- [x] 客户端：`runtime.warning` 存在时在 `.hrag-root` 级渲染 `.hrag-rt-banner`（与嵌入横幅同槽位，排在它上面），文案新键 `rt.warnAnchor`（zh/en）＋原始原因，右侧关闭钮复用 `.hrag-rt-bannerclose`；关闭仅本次挂载，不持久化。
- [x] 门禁：`node --test tests/runtime_ops.test.ts`；`node --check client.js`；`tsc`。

**实测（实施期回填）**：

- **服务端**：`RuntimeStatusPayload` 新增可选 `warning`；`statusPayload` 在 `resolved.kind === 'ok' && resolved.warning` 时透出。external 在 `ops.ts:78-87` 早退、`needs_location` 走 `previousRoot/reason` 另一支，两者都不会带 `warning`。
- **面板**：`.hrag-root` 的直接子节点、嵌入横幅之前渲染 `.hrag-rt-banner`，内容＝`rt.warnAnchor`＋括号内的原始原因；关闭钮复用 `.hrag-rt-bannerclose` 与 `rt.dismiss`；`anchorWarnOff` 只在本挂载内有效。
- **测试**：3 条（坏 JSON ⇒ `warning` 含 `not valid JSON`、root 回退默认、无 `previousRoot`；`needs_location` 不带 `warning`；external 不带 `warning`）。
- **门禁**：`node --test tests/runtime_ops.test.ts` **20/20**；`node --check client.js` 过；`tsc` 0 错；全量 **216/216**。neuter（注释掉 `payload.warning` 赋值）⇒ 1 条转红，还原后 20/20。客户端横幅无单测，观感与真机行为留给 Task 5 的锚点验收。

---

## Task 4 — 嵌入就绪判定收紧（TDD）（spec §3.4）

> 动到的文件：`src/runtime/bridge.ts`、`tests/runtime_bridge.test.ts`。

- [x] 测试先行：`needsEmbeddingFrom({config:{embedding_model:''}})` 为 true；有模型为 false；缺键/坏 payload 也为 true（没有可用模型，沿用 `embeddingModelOf` 的解析口径）。
- [x] 抽出纯函数 `needsEmbeddingFrom(payload)` ＝ `!embeddingModelOf(payload)`，`needsEmbeddingConfig` 只调用它；删除三个环境变量名。
- [x] 门禁：`node --test tests/runtime_bridge.test.ts`；`tsc`。

**实测（实施期回填）**：

- **实现**：`bridge.ts` 新增导出 `needsEmbeddingFrom(payload)`；`needsEmbeddingConfig` 的返回改为它，删除 `DASHSCOPE_API_KEY`/`EMBEDDING_API_KEY`/`RAG_EMBEDDING_API_KEY` 近似（全仓 `src/` 已无这三个名字）。`env` 仍用于 `DSH_HARNESS_RAG_PACK`、`defaultRoot` 与 deps，`createRuntimeBridge` 签名不变。
- **实施期修正**：plan 原写「坏 payload 为 false」有误——坏/缺 payload 意味着没有可用模型，按引擎口径应为 true；测试按 true 写。
- **测试**：1 条 6 个断言（有模型 false；空串、纯空白、null、缺键、`null` payload 均 true）。
- **门禁**：`node --test tests/runtime_bridge.test.ts` **6/6**；`tsc` 0 错；全量 **217/217**。neuter（`needsEmbeddingFrom` 恒 false）⇒ 1 条转红，还原后 6/6。三个环境变量的删除本身无单测守护，由 Task 5 真机「设 `DASHSCOPE_API_KEY` 仍出横幅」验证。

---

## Task 5 — 门禁、真机验收与回写（spec §5）

> 动到的文件：本对 spec/plan。

- [ ] 门禁：`node --check client.js`；`tsc` 0 错；`node --test tests/*.test.ts` 全绿（Task 1 起 210 条，Task 2 后 214 条，Task 3 后 216 条，Task 4 后 217 条）。
- [ ] 真机看门狗：外部模式或第二实例下认领一个服务，kill 掉 ⇒ ≤20 s 内 `runtime/status` 变 `error/adopted_unreachable`、`service.json` 仍在；重启服务后点重试回到 `ready/adopted`。
- [ ] 真机锚点告警：写坏 `location.json` ⇒ 启动后 root 为默认根、`warning` 非空、面板出现横幅，库可读。
- [ ] 真机嵌入判定：清空 `embedding_model` 且宿主环境设 `DASHSCOPE_API_KEY` ⇒ 横幅仍出现；配好模型后消失。
- [ ] 端口被抢：以单测为准（真机很难卡住探空与 spawn 之间的窗口），在实测段写明理由。
- [ ] 回写 spec Status 与各 Task 实测；未做项归位；提交链回填。

**实测（实施期回填）**：

---

## 提交链（滚动记实）

- 待提交。
