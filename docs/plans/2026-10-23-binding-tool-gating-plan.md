# 会话绑定的工具挂载（绑定即启用） Plan

**Spec:** [2026-10-23-binding-tool-gating-spec.md](../specs/2026-10-23-binding-tool-gating-spec.md)
**Status:** 实施完成（2026-10-24；甲已拍，D3/D4 按推荐；Task 0–4b 已完成并过门禁，Task 5 收口中；§5#8 回归待手验）
**Architecture:** 工具定义拆成纯函数，apply 期不再全局注册；新增挂载器在 `agent/created`／绑定 op 时把五工具注册进 `agent.ctx`（宿主 scope 注册，随 agent 回收），解绑时调反注册。绑定仍是取库唯一来源，`defaultKbId` 退场。

**硬约束**：只改插件仓 `E:\app\python\agent\dsh-harness-rag`；引擎 `harness-rag` 与主树 `deer-flow` 只读零改动；DSH 整重启候令；提交候令；提交信息英文 Conventional ASCII；仓无 remote 不推送。`node_modules/` 不触碰、不纳入提交。不往会话记录写事件。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 核宿主 scope 注册语义：`ctx.tools.register` 的层＝调用 ctx 的 scope——全局 ctx 注册全员可见，`agent.ctx` 注册只对该 agent 可见；返回精确反注册（`@deepseek-ai/dsh-tools/lib/index.js:2713`，README:20-24）；`restrict` 需 scoped ctx（`2723`）。
- [x] 核 agent 生命周期事件：`AgentRegistry.register → enter + announce`，`announce` 以 `scopeTarget(agent, agent)` 发 `agent/created`（`dsh-agent/lib/index.js:585-590/660-676`）；resume 走同一发布序列（`dsh-agent/README.md:43`）⇒ 冷会话恢复同样触发。
- [x] 核读取面：`ctx.agents.get(id)`（`:688`）与 `ctx.agents.list()`（`:706`）可拿活 agent；插件可按 `ctx.inject(['agents'])` 取。
- [x] 核 scope 生命周期：`Scope.ctx` 注册「scope 可见＋scope 生命周期」，随 agent 销毁自动回收；未打标的事件监听器收全体事件（`dsh-scope/README.md`）。
- [x] 核生效时机：工具 README 写明注册/注销/遮蔽使 schema 缓存从变更点失效（`:143`）⇒ 活注册表在下一模型请求生效。
- [x] 探针实证（真栈小件，临时探针已回滚）：`agent/created` 在启动恢复时触发；对活会话注册试探工具后 scope 视图出现、反注册后消失；模型侧能真实调用并拿到哨兵值。
- [x] 复读锚点：工具注册 `src/tools.ts:70/105/129/162/186/206`；入口 `src/index.ts:14-24`；op 接线 `src/kb_proxy.ts:572-590/641-646`；创建去预设 `src/conversations.ts:7/82-95/140-146`；解析链 `src/bindings.ts:65-80`；配置 `src/settings.ts:1-21`；面板文案 `client.js:20557-20559`（hint）／`20763-20792`（绑定/解绑）。
- [x] 工作区核对：插件 HEAD `6867222`，工作区干净（`node_modules/` 未跟踪除外）；引擎零 diff；主树零本仓改动。

**实测**：Task 0 只读部分已完成（2026-10-23）。结论：①宿主原生支持按会话挂载（scope 注册＋精确反注册）；②`agent/created` 对新建与 resume 都发，可用于冷会话补挂；③`agents.get/list` 可支撑绑定 op 与激活兜底；④活注册表在下一模型请求生效。

探针实证（同日，临时探针 `src/__probe_gating.ts`＋`index.ts` 一行接线，验后已删除并 `git checkout` 回滚；日志在 `%TEMP%\hrag-gating-probe.log`）：

- 启动恢复：`probe wired, live agents (none)` → `agent/created session-a59b4afa-…` ⇒ resume 路径确认触发，payload 里 `agent.id` 可直接用；未打标（全局）的 `ctx.on('agent/created')` 能收到。
- 挂载：对活会话 `agent.ctx.tools.register(probe)` 后 `scope schemas` 末尾出现 `hrag_probe_ping`；模型侧随后发「如果你有 hrag_probe_ping 就调用」，模型真实调用并返回 `{"pong":"gating-probe-ok"}`。
- 卸载：调反注册后同一 scope 视图里 `hrag_probe_ping` 消失；模型侧下一轮拿不到返回值（如实报「调不动」）。
- **坑**：`ctx.tools.schemas()` 不传 scope 读的是**全局视图**（探针不在其中）；读某会话必须 `agent.ctx.tools.schemas(agent)`（`dsh-tools/lib/index.js:2787-2834`，doc 明写 omitted = global view）。实施与验收都用带 agent 的读法。
- 回滚后 `git status` 仅剩本对 spec/plan 与既有 `node_modules/`；DSH 已无探针重启。

## Task 1 — 挂载器与工具定义拆分（TDD）

> 动到的文件：`src/tool_gating.ts`（新增）、`src/tools.ts`、`tests/tool_gating.test.ts`（新增）。

- [x] 先写测试（fake agent ctx：`{ tools: { register: fn } }` 记录定义名与反注册）：
  - `mountAgent` 注册五件且幂等（重复调用不重复注册）。
  - `unmountSession` 调反注册并从表里清掉；未挂时无操作。
  - `agent/disposed` 清表；`agents.list()` 兜底只挂有绑定的会话。
  - `buildToolDefinitions(config, bindings)` 返回五件、名字与现有 schema 一致（名字集合对比）。
- [x] `src/tools.ts`：`registerTools` 改为导出 `buildToolDefinitions(config, bindings)`（纯函数，返回 `defineTool` 定义数组）；`kb()` 解析链收窄为「arg ＞ session」，not_configured 文案改为「本会话没有绑定知识库」。
- [x] `src/bindings.ts`：`resolveKbId` 删 `defaultKbId` 档（随 D3；若 D3 不拍则本项回退）。
- [x] 门禁：`node --test tests/*.test.ts`；`tsc`；strip-types。

**实测**（2026-10-23）：先落 `tests/tool_gating.test.ts`（七件：五件定义名集合、绑定挂五件、幂等、未绑定零注册、卸载反序全跑＋清表、卸载只影响本会话、`forgetAgent` 不跑反注册且可重挂），首跑因 `src/tool_gating.ts` 未实现整组红；实现后 7/7 绿。`src/tools.ts` 拆成 `buildToolDefinitions(config, bindings)`（纯函数，五件 `defineTool`，函数体未改），`kb()` 只认 arg／session 两档，缺失时文案 `kb_id was not given and this session has no knowledge-base binding.`；`src/bindings.ts` 的 `KbResolution.source` 收窄为 `'arg' | 'session'`（D3）。门禁：`tests/*.test.ts` 63/63、`tsc --noEmit` 干净、strip-types 全过（同日复跑）。注：Task 1 改完时 `tsc` 因 `src/index.ts` 仍调已删除的 `registerTools` 而红，随 Task 2 接线消解。

## Task 2 — 事件与 op 接线

> 动到的文件：`src/index.ts`、`src/kb_proxy.ts`、`src/conversations.ts`、`src/settings.ts`（D3）。

- [x] `src/index.ts`：`registerToolGating(ctx, config, bindings)`（内部 `inject(['agents'])` 兜底挂载＋`agent/created` 监听）；删 `registerTools` 全局调用。
- [x] `src/kb_proxy.ts`：`conversations/bind` 成功后 `mountAgent(agents.get(sessionId))`；`unbind` 先卸后删；`conversations/create` 不再传 `agentPreset`，`KNOWLEDGE_PRESET` 删除。
- [x] `src/settings.ts`（D3）：`Config`/`defaultConfig` 删 `defaultKbId`；`cordis.patch.yml` 与 `presets/knowledge.patch.yml` 同步删项。
- [x] 探针实证（真栈）：Task 0 已完成挂/卸与可见性；本 Task 只需复核「绑定 op → 挂载」与「解绑 op → 卸载」两条真实路径（看 `%TEMP%` 日志不可用，改为面板操作＋轨迹/注册表读数）。
- [x] 门禁：单测＋tsc＋strip-types；`node --check client.js`。

**实测**（2026-10-23）：`src/tool_gating.ts` 的 `registerToolGating` 在 `apply` 期 `inject(['agents'])`：先对 `agents.list()` 中已有绑定的活 agent 兜底挂载，再监听 `agent/created` 挂载、`agent/disposed` 清表；`index.ts` 改为 `const gating = registerToolGating(ctx, merged, bindings)`，全局 `registerTools` 调用删除。`kb_proxy.ts` 把 `gating` 传入 `conversationOps`；`conversations.ts` 删除 `KNOWLEDGE_PRESET`，`create` 不再传 `agentPreset`（D5），`bind`→`onBound`、`unbind`→先删表后 `onUnbound`。`settings.ts`／`cordis.patch.yml`／`presets/knowledge.patch.yml` 的 `defaultKbId` 同步删除。门禁：单测 63/63、`tsc` 干净、strip-types 全过。

真栈实证（DSH 整重启后，同一会话 `session-a59b4afa…`；判据取宿主自留的请求头，不是模型自述）——会话 transcript `~/.dsh/sessions/…/session.v4.jsonl.zstd` 可 `zstd -d` 解出 447 行 JSONL，其中 `request/header` 事件逐次记录实际下发的工具表：

| 时刻 | reason | 工具数 | `hrag_*` |
| --- | --- | --- | --- |
| 21:15:13 | resume | 38 | 6（含 Task 0 探针 `hrag_probe_ping`，已回滚） |
| 21:17:35 | change | 37 | 5 |
| 21:35:58 | resume | 37 | 5（带绑定冷启动即挂） |
| 21:53:02 | change | 32 | **0**（解绑 op 后首个请求即卸） |
| 22:03:46 | change | 37 | 5（重绑 op 后首个请求即挂） |

- 绑定态真调：让模型直接调 `hrag_list_documents`（不带 `kb_id`），宿主返回 `{"kb_id":"48a492c8…","kb_name":"测试","documents":[]}`（绑定解析生效）。
- 解绑态：同一句要求再发一次，请求头无该工具，模型如实回「工具不存在」。
- **坑**：轨迹页的工具清单与模型自述都会被历史上下文污染（模型曾复述早已删除的 `hrag_probe_ping`，并猜测「bindings 空了应报错」）；验收只认 `request/header` 与真实 `tool/call` 记录。
- 收尾已把绑定恢复原样（`kbId=48a492c8…`、`kbName=测试`），`bindings.json` 与测试前一致。

## Task 3 — 面板文案与文档面

> 动到的文件：`client.js`、`README.md`、`docs/equivalence.md`。

- [x] `client.js`：抽屉提示改「选择后，本会话将获得知识库工具」；解绑 Toast 改「已移除绑定，本会话不再具备知识库工具」；zh/en 同步。
- [x] `README.md`：删「kb_id 解析次序」里的 `defaultKbId` 档与配置表行；「隔离」节改写为「工具随绑定挂载；预设只作可选隔离」。
- [x] `docs/equivalence.md`：会话绑库行补「工具随绑定挂/卸」；§12 预设相关表述同步。
- [x] 门禁：`node --check client.js`；仓外 hostless 探针（zh/en 键集与占位）。

**实测**（2026-10-23）：`client.js` 改 `session.pickHint`／`session.unboundToast` 两键×zh/en（`选择后，本会话将获得知识库工具。` / `Once picked, this chat gains the knowledge tools.`；`已移除绑定，本会话不再具备知识库工具` / `Binding removed; this chat no longer has the knowledge tools`）。README 的「隔离」节拆成三条：默认隔离＝工具只挂绑定会话、可选隔离件＝预设（保留用法）、`kb_id` 解析两档＋`not_configured`；Status 行与配置表同步去掉默认库口径。equivalence §11 会话绑库行改为「arg ＞ 绑定；五件随绑定挂/卸（未绑定不挂）」并把末次核对说明改为「会话绑定收口＋工具随绑定挂/卸」；§12 无预设相关表述，未动。历史 plan/spec（10-11 freeze、10-23 conversation-binding）里的三级链记载按当时事实保留。

门禁：`node --check client.js` 通过。仓外探针 `%TEMP%\hrag-copy-parity.mjs`（从源码抽出 `const zh` / `const en` 字面量求值）：键集 838/838 对齐、`{0}` 占位逐键一致、两处新文案逐字断言、全表无「默认知识库／default knowledge base／defaultKbId」残留。**顺带修一处既有缺口（非本议题引入）**：`set.form.modelPickerAria` 只有 zh 键，en 缺键会回落中文；补 `'Choose a model; current: {0}'` 后键集才对齐——该缺口在本次改动前的 HEAD 已存在（`git show HEAD:client.js` 实核）。

## Task 4 — 门禁与真栈验收

> 动到的文件：无（探针/截图仓外）。

- [x] `node --check client.js`；`node --test tests/*.test.ts` 全绿；`tsc`；五个 TS strip-types。
- [x] 真栈按 spec §5 逐条手验（1–7、9 已取证；8 待手验），证据见下表。
- [ ] 回归：六 tab、上传、切片/Wiki 抽屉、召回/评测/图谱面零变化。
- [x] 引擎与主树零 diff；提交面只含本对文件。

**真跑清单（他手验）**：

1. 默认：standard 会话工具表无 `hrag_*`。
2. 绑定：绑定后下一请求出现五件并能检索。
3. 解绑：工具消失、文案正确。
4. 冷会话：绑定↔重启↔打开会话的挂载/不挂。
5. 新建：面板建会话不依赖预设即可用。
6. 覆盖：显式 `kb_id` 覆盖绑定。
7. 子代理：无工具（D4 若确认）。
8. 回归：面板与既有面零变化。

**实测**（§5 逐条证据汇总，Task 2 已证项＋10-24 复验）：

| §5 项 | 判据 | 证据 | 状态 |
| --- | --- | --- | --- |
| 1 默认无工具 | standard 会话请求头无 `hrag_*` | Task 2：解绑后 `request/header` 32 件／`hrag_*`=0 | 过 |
| 2 绑定即挂载 | 绑定后下一请求五件＋检索回显 | Task 2：`change` 37/5；`hrag_list_documents` 回 `kb_id`/`kb_name` | 过 |
| 3 解绑即卸载 | 解绑后下一请求 0 件 | Task 2：`change` 32/0；文案已验 | 过 |
| 4 冷会话 | 绑定↔重启的挂载 | Task 2：重启后 `resume` 37/5 | 过（「解绑后重启」未单跑） |
| 5 新建 | 面板「新建」→ 消息 → 五件 | 10-24 `session-42663300…`：成员＋绑定＋`initial` 37/5＋真调工具 | 过（随 Task 4b 修复） |
| 6 覆盖 | 显式 `kb_id` 覆盖绑定 | Task 2：`query+t3` 调用回显 t3 库 | 过 |
| 7 子代理 | 子代理无 `hrag_*` | Task 2：子代理请求头 0 件 | 过（D4 预置） |
| 8 回归 | 面板六 tab／上传／抽屉／召回评测图谱 | 本对未改 UI；待他手验 | 待验 |
| 9 门禁与零 diff | 四门禁＋两树零改 | Task 4 勾选＋Task 5 | 过 |

## Task 4b — 「新建」缺口修复（TDD，Task 4 验收前置）

> 动到的文件：`src/conversations.ts`、`src/kb_proxy.ts`、`tests/conversations.test.ts`。

**缺口（2026-10-23 复核）**：面板「新建」建出的会话不在任何 workspace 里 ⇒ 打开它落回 workspace 草稿页，首条消息另起一个 session id，绑定与工具挂载留在空会话上。§5#5 因此不可达。

- [x] 复核宿主链路（只读，asar 取证）：`SessionCommandController.create` 收 `workspaceId` XOR `cwd`，仅当点名 workspace 时才 `workspace.attachSession(sessionId)`（`dsh-session-controller.js:753-790`）；`attachSession` 校验 header.cwd 归一后逐字等于 workspace path（`dsh-workspace.js:111-123`）；UI `openSession` 只是导航，`connectBlank` 只复用 `workspace.sessionIds.includes(id)` 的空会话 ⇒ 非成员会话必然落草稿。
- [x] 现网证据：`~/.dsh/storages/workspace.json` 仅一个 workspace（`b1196018…`，path=`…\Documents\deepseek-harness\default-workspace`），其 `sessionIds` 含首条消息形成的 `46ca1627…`，**不含**面板建出的 `5d244ea4…`；而 `5d244ea4…` 的 header cwd 本就等于该 path ⇒ 症状根因是「没 attach」，不是「没 cwd」。
- [x] 测试先行：`createSession` 去预设回落保留 `workspaceId`；`conversations/create` 按 cwd 归到 workspace 时只传 `{ workspaceId }`；查不到／`resolveByPath` 抛错时回落 `{ cwd }`。RED：2 例红（16 例中），GREEN：66/66。
- [x] 修法：`SessionControllerLike.create` 增 `workspaceId`；`ConversationsHost` 增可选 `workspaces`（`WorkspaceRegistryLike.resolveByPath`）；`kb_proxy.ts` 新增 `inject(['workspaceRegistry'])` 注入（无此服务的宿主保持 cwd 老路）。`conversations/create` 先按 cwd 找 workspace，命中则走 workspace 建会话（cwd 由 workspace 携带，宿主随后 attach）；未命中或路径已不可解析则维持 `{ cwd }`。面板端无需改动（本就把当前会话 cwd 传下来）。
- [x] 门禁：`node --test tests/*.test.ts` 66/66；`tsc -p tsconfig.json` 0；`--experimental-strip-types --check` 两文件过。
- [x] 真栈（2026-10-24，DSH 整重启后他手点「新建」）：新会话 `session-42663300-a233-40e6-bd0e-290af25f80db` 进入 `workspace.json` 的 `sessionIds`（第 14 位），绑定 `9141e58d → t3-panel-acceptance`；首条消息落在该 id，header `agentPreset=standard`、`cwd`=workspace path；`request/header`（reason=initial）37 件工具中 `hrag_*` 恰为五件，模型真实调用 `hrag_list_documents` 并拿到 `kb_id=9141e58d…`／`kb_name=t3-panel-acceptance`。

**实测**（2026-10-23／24）：`workspaceIdForCwd` 只在拿到 cwd 且注入到 registry 时调用；`resolveByPath` 归一化后按 path 相等匹配，`attachSession` 的 cwd 校验因此天然成立。宿主侧 `create({ workspaceId })` 与旧路径的差别只有两处：cwd 来源改为 workspace.path、创建后 attach；`agentPreset` 回落路径同样保留 `workspaceId`。真栈一步已于 10-24 补齐（见上条）：同一 op 先以 curl 复现（`session-e1126f86…` 同样入册），再由面板按钮走完整链路（`session-42663300…`）。

## Task 5 — 收口

> 动到的文件：本对＋`README.md`＋`docs/equivalence.md`。

- [x] 回写 spec Status 与本 plan 各 Task 实测。
- [x] 逐文件核 hunk，排除 `node_modules/`；提交信息英文 Conventional ASCII；回填提交链。
- [x] 提交后回填提交链；仓无 remote，不推送。

**实测**（2026-10-24）：修复笔 `babb66b`（5 文件，153+/12−：`src/conversations.ts`、`src/kb_proxy.ts`、`tests/conversations.test.ts`、本 plan、spec Status）；提交前门禁复跑 66/66／`tsc` 0／strip-types 两文件过。`node_modules/` 未纳入。本笔为提交链回填。

---

## 提交链（滚动记实）

- `babb66b` fix(panel): attach panel-created sessions to their workspace —— Task 4b（workspaceId 建会话＋三例测试）＋spec/plan 回写。
- 提交链回填笔（docs，紧随 `babb66b`；仓无 remote，未推送）。
