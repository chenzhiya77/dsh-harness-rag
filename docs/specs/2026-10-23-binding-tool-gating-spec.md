# 会话绑定的工具挂载（绑定即启用） —— spec

**Status:** 已实施·真栈验收（2026-10-24；Task 0–4b 全落，§5 第 1–7、9 项已取证、第 8 项回归待手验；D1 甲＝绑定即挂载、D2 甲＝默认零挂载、D3 `defaultKbId` 退场、D4 子代理不继承、D5 去预设、D6 下一请求生效；Task 4b 修「新建会话不在 workspace」缺口——`create({workspaceId})`）
**Date:** 2026-10-23
**来源:** 10-23 他问「解除绑定是什么效果，将工具暂时剔除吗」——现状是工具全局常驻、解绑只回默认库；他提出「正常情况下不应该每个会话都加上知识库工具，只有绑定后才加」，并在甲/乙/丙三案中选甲（绑定即挂载）。
**承接:** 同日 [2026-10-23-conversation-binding-spec.md](2026-10-23-conversation-binding-spec.md)（实现笔 `ec58a41`、收口 `6867222`）：绑定存储、面板抽屉、四个 op、工具解析链已就位；本对只改「工具可见性」这一层，不动绑定数据与面板结构。

## 1. 目标

1. 未绑定会话的模型**看不到**任何 `hrag_*` 工具（默认零挂载）。
2. 绑定成功即对**存活会话**挂上五工具，解绑即卸载；冷会话在它下次创建/恢复时补挂。
3. 绑定仍是「这个会话用哪个库」的唯一来源；显式 `kb_id` 仍可覆盖绑定。
4. 过渡期不打破已完成的对：`bindings.json` 结构、四个 op 契约、面板抽屉与列表照旧。

## 2. 现状与问题

- 现状：`registerTools(ctx, config, bindings)` 在 **apply 期用插件全局 ctx** 注册五工具（`src/tools.ts:70-206`）⇒ 所有会话都可见；`kb()` 解析链为「参数 ＞ 绑定 ＞ `defaultKbId`」（`src/tools.ts:75-90`、`src/bindings.ts:65-80`）。
- 问题：①每个会话白背五个工具（schema＋提示占位），模型可能在不该用时调用；②「解绑＝回默认库」与「知识库按会话启用」的产品预期不符；③`defaultKbId` 只在未绑定会话里才有意义，而那正是新设计里不该有工具的会话。

## 3. 设计（甲）

### 3.1 挂载器

- host 半新增 `src/tool_gating.ts`：持 `Map<sessionId, Array<() => void>>`。
  - `mountAgent(agent)`：把五个工具**逐个**用 `agent.ctx.tools.register(definition)` 注册进该会话的 scope（宿主规则：`agent.ctx` 注册只对该 agent 可见，反注册函数随 agent scope 回收）。已挂则跳过（幂等）。
  - `unmountSession(sessionId)`：调用反注册函数并清表；agent 销毁时 scope 自动回收，另监听 `agent/disposed` 清表。
- 工具定义拆成纯函数 `buildToolDefinitions(config, bindings)`（`defineTool` 定义可按 scope 重复注册，闭包只捕获 config/bindings）。

### 3.2 接线

- `src/index.ts`：不再调 `registerTools`（全局注册退场）；改调 `registerToolGating(ctx, config, bindings)`：
  - `ctx.on('agent/created', ({ agent }) => { if (bindings.get(agent.id)) mountAgent(agent) })`——`agent/created` 在 `AgentRegistry.register → announce` 路径发出，含 resume（宿主 `dsh-agent/lib/index.js:585-590/660-676`）。
  - 激活时对 `ctx.agents.list()` 兜底挂一遍（HMR/插件后加载场景）。
- `src/kb_proxy.ts`：`conversations/bind` 写盘成功后 `mountAgent(agents.get(sessionId))`（不在则等 `agent/created`）；`conversations/unbind` 先 `unmountSession` 再删绑定。
- 解析链收窄：`resolveKbId` 只留「arg ＞ session」；`kb()` 的 not_configured 分支改文案（工具只在已绑定会话可见，正常不可达）。
- `conversations/create`：不再传 `agentPreset`（本机没装预设时白跑一次 not-found 重试；装了也与「绑定开关」重复）。`KNOWLEDGE_PRESET` 常量随之退场。
- `presets/knowledge.patch.yml`：保留为「可选预设级隔离」装法（想进一步限制只有某预设会话能用时用），README 改写说明；不再被面板默认使用。

### 3.3 生效时机与文案

- 挂/卸发生在绑定 op 内；模型侧从**下一请求**起看到新工具表（活注册表语义，与 skills 缓存失效同源）。
- 抽屉提示：「选择后，本会话将获得知识库工具」；解绑 Toast：「已移除绑定，本会话不再具备知识库工具」。

## 4. 决策

- **D1（拍定）**：甲——绑定即挂载，作用于 live agent 的 `agent.ctx` scope。
- **D2（拍定）**：默认零挂载——apply 期不再全局注册 `hrag_*`。
- **D3（预置·待确认）**：`defaultKbId` 退场——`Config` 删项、`defaultConfig` 删默认、`cordis.patch.yml`/`presets` 同步、README 配置表删行。理由：只挂载已绑定会话后，该格没有可达路径；留着就是死配置。
- **D4（预置·待确认）**：子代理不继承绑定——子代理是独立 agent、无绑定 ⇒ 无工具。代价：绑定会话派出的子代理查不了知识库。替代是「导出时把根会话绑定带进子会话」，留 §8。
- **D5（拍定随之）**：`conversations/create` 不再传 `agentPreset`；op 的 `agentPreset` 入参保留兼容。
- **D6（拍定）**：生效边界＝下一模型请求；回合进行中解绑不打断当前回合，后续步骤即无工具（文案沿用「下一条消息生效」）。

## 5. 验收

1. **默认无工具**：新建/现有的 standard 会话，模型工具表无 `hrag_*`（真栈看轨迹或请求日志）。
2. **绑定即挂载**：绑定后下一次请求工具表出现五件；检索正常且结果回显 `kb_id`/`kb_name`。
3. **解绑即卸载**：解绑后下一请求工具表消失；面板文案与顶栏状态同步。
4. **冷会话**：绑定后重启 DSH，打开该会话即挂载；解绑后重启不挂。
5. **新建**：面板「新建」建出的会话（不传预设）绑定后工具可用。
6. **覆盖**：显式传 `kb_id` 仍覆盖绑定库。
7. **子代理**：绑定会话派生子代理，其工具表无 `hrag_*`（D4 若确认）。
8. **回归**：面板六 tab、上传、切片/Wiki 抽屉、召回/评测/图谱面零变化；绑定/解绑/列表/跳转照旧。
9. **门禁**：`node --check client.js`；`node --test tests/*.test.ts` 全绿；`tsc`；strip-types；引擎 `harness-rag` 与主树 `deer-flow` 零 diff。

## 6. 影响面

**改的**：`src/tools.ts`（拆 definitions）、新增 `src/tool_gating.ts`、`src/index.ts`、`src/kb_proxy.ts`（bind/unbind 挂卸）、`src/conversations.ts`（去预设）、`src/settings.ts`（D3）、`client.js`（两处文案）、`tests/`（挂载器新测＋解析链改测）、`README.md`、`cordis.patch.yml`、`presets/knowledge.patch.yml`。

**不改的**：`bindings.json` 结构与清洗规则、四个 op 的请求/响应契约（`create.agentPreset` 仅不再由面板传）、面板抽屉结构与列表、引擎 `harness-rag`、主树 `deer-flow`。

## 7. 不做

- 不做「工具在场但按会话遮蔽」（乙案）：全局层留在进程里，headless 或监听失效时会漏出。
- 不做按问题意图动态挂载、不做按库内容自动开关。
- 不做权限/安全边界——宿主明确 scope 是组合可见性，不是授权面。
- 不做绑定继承（除非 D4 改判）。
- 不改解绑的过渡文案与「不弹确认框」的既有裁决。

## 8. 升级路径

- **子代理继承**：若将来要，在 `agent/created` 里查父会话绑定（`agents.isOwnedBy` / 父 agent id 随事件上下文）并挂到子会话；本对不做。
- **回退**：若活注册表在某宿主版本不刷新模型工具表，退回「全局注册＋`agent.ctx.tools.restrict({deny:['hrag_*']})`」的乙案，接口不变。
- **预设级隔离**：需要「只有某预设会话能绑」时，把预设行作为父 scope 装入，挂载器仍按绑定判断。
