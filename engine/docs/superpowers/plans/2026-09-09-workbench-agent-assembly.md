# 工作台丙1:Agent 装配台 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给自定义 agent 资产补一个装配面:后端加一个**只读**的能力清单派生端点,前端加 agent 详情页(装配面板 + SOUL 面板 + 能力清单视图),把 `PUT /api/agents/{name}` 已能写、但今天**没有任何 UI** 的 `soul` / `tool_groups` / `skills` 三个字段暴露出来。零新引擎、零新依赖、零 schema 变更。

**Architecture:** 丙1 是工作台三层的第一层(见 `../specs/2026-09-09-workbench-agent-assembly-design.md` §1)。写路径**全部复用既有 REST**(`POST`/`PUT`/`DELETE /api/agents`),不走对话侧的 `setup_agent`/`update_agent` 工具(那是给 LLM 的通道,绑定依赖 `is_bootstrap`/`agent_name` 运行时上下文)。唯一新后端能力是派生只读端点,它同时是甲层"可编排节点清单"的雏形,响应形状必须按可复用设计。契约细节全在 spec,本计划只排步骤。

**Tech Stack:** 后端 FastAPI + 既有 `get_available_tools()` / skill 注册表 / `create_chat_model` 配置查询(**复用枚举,不新造解析**);前端 Next.js 16 App Router + TanStack Query + `@xyflow/react ^12.10.0`(已在 `package.json:60`,业务代码零使用)+ `components/ai-elements/` 七个 React Flow 包装组件(已存在、零消费者、**registry 生成物不可手改**)。

**测试运行命令(全程统一):**
```bash
# 后端(离线全量 + 新端点)
cd backend && make test
cd backend && PYTHONPATH=. uv run pytest tests/test_agent_capabilities.py -v
# 前端
cd frontend && pnpm check      # lint + typecheck,提交前必跑
cd frontend && pnpm test       # Rstest:*.test.ts 走 node,*.dom.test.tsx 走 happy-dom
cd frontend && pnpm perf:check # 路由资产预算,新页面引 React Flow 后必跑
```

**关键事实(已核实,细节与行号见 spec §2):**
- `PUT /api/agents/{name}` 的 config 是**字段级 patch**(`model_fields_set` 区分省略 vs 显式 null,`routers/agents.py:405-432`),但 `soul` 非 None 时是**整份替换**(:448-449),**无修订令牌** → Task 0 必须先裁决并发保护。
- `agents.py` 内**无 admin-only、无 owner_check、无 SkillScan**;隔离仅 `get_effective_user_id()`;门控 `agents_api.enabled` **默认 false**,而前端 `resolveAgentsApiEnabled` 在从未拿到答案时 **fail open = true**(`core/agents/feature-cache.ts:46-51`)→ 新页面要显式处理这个组合。
- `skills` 是**三态**:`None`=全部启用、`[]`=全部禁用、列表=白名单(`config/agents_config.py:215-220`)。前端 `Agent.skills: string[]|null` 只有两态可辨,UI 必须显式区分 `[]` 与"未设置"。
- `ai-elements/` **不可手改**(`frontend/AGENTS.md:281`、`eslint.config.js:15` ignore 该目录、`components.json` 配了 registry 来源)。要扩展就在 `components/workspace/agents/` 下写自有包装。
- **无 agent 详情页**:`app/workspace/agents/` 下仅 5 个文件,`[agent_name]/` 层只有 chats 路由。
- SKILL.md 编辑**不在本期**(spec §5:权限模型不同 / 无创建端点 / 门禁不同 / 产物不同)→ 另立丙1b。**用户 2026-09-09 已确认**;同时确认**能力清单视图为必做项**(spec §7 风险 6 已裁决)。
- 术语已定死(spec §3):菜单与文案**禁用 Canvas / 构成 / Studio / 单用 Flow**;丙1 的派生视图叫**能力清单**(Capabilities),不叫"构成"——后者已被 harness 观测台那条线占用。

**机器特定(沿用上一轮实施记录):** 本机系统 Temp 对 pytest 权限异常 → 需要临时目录时统一 `--basetemp .pytest-tmp`(`.gitignore` 既有约定);host 侧 pnpm 一律经 `scripts/pnpm.py`;**本计划不新增任何 Python 依赖**——`tenki-sandbox` 已从 PyPI 下架,任何 `pyproject.toml` 改动都会触发注定失败的 universal 重解析。

---

## File Structure

**新建:**
- `backend/tests/test_agent_capabilities.py`
- `frontend/src/app/workspace/agents/[agent_name]/page.tsx`
- `frontend/src/components/workspace/agents/assembly-panel.tsx`
- `frontend/src/components/workspace/agents/soul-panel.tsx`
- `frontend/src/components/workspace/agents/capability-graph.tsx`(React Flow,`next/dynamic` + `ssr:false` 懒加载)
- `frontend/src/components/workspace/agents/capability-card.tsx`(甲层复用的节点卡片视觉语言)
- `frontend/src/core/agents/capabilities.ts`(响应 → 图数据的纯转换)
- `frontend/tests/unit/core/agents/capabilities.test.ts`
- `frontend/tests/unit/components/workspace/agents/*.dom.test.tsx`
- `frontend/tests/e2e/agent-assembly.spec.ts`

**修改:**
- `backend/app/gateway/routers/agents.py`(+ `GET /api/agents/{name}/capabilities`,含 `available_tool_groups`)
- `frontend/src/core/agents/{api.ts,hooks.ts,types.ts,index.ts}`(+ capabilities 函数/hook/类型)
- `frontend/src/components/workspace/agents/agent-card.tsx`(+ 详情页入口,既有三按钮不动)
- `frontend/src/core/i18n/locales/{types.ts,en-US.ts,zh-CN.ts}`(`agents` 组新增文案;**不动 `sidebar` 组**)
- `backend/AGENTS.md`(routers 表加新端点)、`frontend/AGENTS.md`(routes 清单 + Interaction Ownership)

---

## Task 0: 三项前置核实与裁决(**阻塞后续所有任务**)

- [ ] **Step 1(并发保护,spec §7 风险 1):** 读 `persistence/agents/base.py:124` 的 `signature()` 与 file/sql 两后端实现,判定它能否作乐观并发令牌(是否随内容变化、是否稳定可比较、跨后端语义是否一致)。产出裁决写回 spec §7 风险 1:①可用 → 详情页加载时记录 signature、提交前比对、不一致拒绝并提示刷新;②不可用 → 本期接受 last-write-wins,但**必须**在 SOUL 面板显示 `updated_at` 与"对话里 agent 可能同时自改"的提示,并把契约变更另立为开放项。
- [ ] **Step 2(React Flow 组件能力,spec §7 风险 3):** 写一个最小 spike(可临时、不提交)验证 `ai-elements/node.tsx` 的 `handles:{target:boolean; source:boolean}`(:14-18)能否支撑"一个 agent 节点连多个能力节点"的二部图。不够用 → 走 spec §4 的自有包装层分支(在 `components/workspace/agents/` 下直接引 `@xyflow/react` 原语),**不改 ai-elements**。
- [ ] **Step 3(capabilities 解析成本,spec §7 风险 4):** 实测 `get_available_tools(groups=…)` 冷启动耗时,并确认它**不触发** MCP discovery、不实例化模型、不起子进程。若 MCP 部分会有副作用 → 按 spec §6.1 只返回配置声明并标 `source: "mcp_config"`。
- [x] **Step 4(范围确认,spec §7 风险 6)——已完成(2026-09-09,用户裁决):** 能力清单视图为丙1 **必做项**;SKILL.md 编辑踢出丙1、另立丙1b。Task 5 的范围门已解除,但 Step 1-3 的三项核实仍是前置。

## Task 1: 后端能力清单端点(TDD)

**Files:** Modify `backend/app/gateway/routers/agents.py`;Create `backend/tests/test_agent_capabilities.py`

- [ ] **Step 1(先写红测试):** 覆盖 ① `tool_groups` 展开成具体工具且带 `opt_in` 与 `source`;② `skills` 三态各自产出正确清单(`None` → 全部启用项、`[]` → 空、列表 → 白名单),每项带 `enabled`/`allowed_tools`/`required_secrets`;③ `model` 为 None 时 `inherits_default: true` 并给出默认模型的 `supports_vision`/`supports_thinking`;④ 枚举不到的项进 `unresolved` 而非静默消失(fail-closed);⑤ `available_tool_groups` 返回全量清单且与 agent 当前选择分开;⑥ `agents_api.enabled=false` 时与 `GET /api/agents/{name}` 同样的门控结果;⑦ 跨用户隔离(A 读 B 的 agent → 404);⑧ 桩断言未触发 MCP discovery。
- [ ] **Step 2:** 实现端点:鉴权与门控**照抄** `GET /api/agents/{name}`(:257 的 `agents_api.enabled` 检查 + `get_effective_user_id()` 隔离 + 404 分支),复用 `load_agent_config`/`load_agent_soul`,派生走既有枚举函数。响应字段名按 spec §11 的可复用形状(`name`/`source`/`group`/`opt_in`),不写 agent 专属嵌套。
- [ ] **Step 3:** 转绿 + `cd backend && make lint`。

## Task 2: 前端数据层

**Files:** Modify `frontend/src/core/agents/{api.ts,hooks.ts,types.ts,index.ts}`

- [ ] **Step 1:** `types.ts` 加 `AgentCapabilities` / `CapabilityTool` / `CapabilitySkill` / `CapabilityModel` / `UnresolvedItem`,字段与 Task 1 响应对齐。
- [ ] **Step 2:** `api.ts` 加 `getAgentCapabilities(name)` → `GET /api/agents/{name}/capabilities`,沿用既有错误类(`AgentsApiDisabledError` :28)与 fetch 约定。
- [ ] **Step 3:** `hooks.ts` 加 `useAgentCapabilities(name)`;query key 沿用现有内联字面量风格(`["agents", name, "capabilities"]`)——**收敛成 key 工厂不是本期强制项**(spec §8)。
- [ ] **Step 4:** `capabilities.ts` 纯函数:响应 → React Flow 的 nodes/edges(含 `unresolved` 渲染为警示节点);配 `capabilities.test.ts`(node 环境,纯逻辑)。

## Task 3: 装配面板

**Files:** Create `frontend/src/components/workspace/agents/assembly-panel.tsx`

- [ ] **Step 1:** 覆盖 `description` / `model` + `model_settings`(temperature、max_tokens——**复用 `agent-settings-dialog-helpers.ts` 的常量与换算,不复制**) / `thinking_enabled` / `reasoning_effort` / `tool_groups`(多选,选项来自 capabilities 的 `available_tool_groups`)。
- [ ] **Step 2:** `skills` **三态控件**:`None`(全部启用)/ `[]`(全部禁用)/ 显式列表(多选,选项来自既有 `loadSkills`)。三态必须在视觉上可辨,提交 payload 严格区分 `null` 与 `[]`(PUT 是字段级 patch,`model_fields_set` 语义靠 JSON 里"有没有这个键"传递)。
- [ ] **Step 3:** 提交经既有 `useUpdateAgent` → PUT;**只发被改动的字段**(避免把未管理字段如 `github:` 覆盖掉——后端有 `preserve_non_managed_fields`,但前端不应依赖它兜底)。
- [ ] **Step 4:** `*.dom.test.tsx` 覆盖三态渲染与提交 payload 形状。

## Task 4: SOUL 面板

**Files:** Create `frontend/src/components/workspace/agents/soul-panel.tsx`

- [ ] **Step 1:** Markdown 文本编辑 `soul`,整份替换语义(PUT :448-449);未保存变更提示 + 离开拦截。
- [ ] **Step 2:** 按 Task 0 Step 1 的裁决实现并发保护(signature 比对或 `updated_at` + 提示)。
- [ ] **Step 3:** 面板内一句说明:这段文字会被 html-escape 后包进 `<soul>` 注入系统提示词(`lead_agent/prompt.py:890,501`),custom agent 还会追加 `<self_update>` 块(:894-912)——让用户知道它不是普通备注,且 agent 在对话里可能自改它。
- [ ] **Step 4:** `*.dom.test.tsx` 覆盖未保存提示、整份替换 payload、冲突拒绝路径。

## Task 5: 能力清单视图(**2026-09-09 已确认为必做项**;前置是 Task 0 Step 2 的组件 spike)

**Files:** Create `capability-graph.tsx`、`capability-card.tsx`

- [ ] **Step 1:** `capability-card.tsx` 按 spec §6.3 的四要素实现(图标 + 名称 + 来源徽章 `tool_group`/`skill`/`mcp`/`builtin` + 状态条 `opt_in`/`allowed_tools 收窄`/`unresolved`),并**预留确定性标记位**(甲层的「⚡可缓存」/「🎲 非确定性」徽标),丙1 阶段该位置渲染为空占位而非删除。
- [ ] **Step 2:** `capability-graph.tsx` 用 `Canvas`/`Node`/`Edge`/`Controls`(或 Task 0 Step 2 裁定的自有包装)渲染二部关系;经 `next/dynamic(..., {ssr:false})` 懒加载(照 `knowledge/graph-tab.tsx:53-55` 先例),容器用 `ResizeObserver` 处理尺寸(照 `graph-canvas.tsx:289-294`)。
- [ ] **Step 3:** **不手改 `ai-elements/` 任何文件**;若需扩展一律在自有包装层。
- [ ] **Step 4:** `*.dom.test.tsx` 覆盖节点数、来源徽章、`unresolved` 警示渲染。

## Task 6: 详情页路由与卡片入口

**Files:** Create `frontend/src/app/workspace/agents/[agent_name]/page.tsx`;Modify `agent-card.tsx`

- [ ] **Step 1:** 新路由门控照 `agents/layout.tsx:11-23`(`useAgentsApiEnabled()` → loading 文案 → `AgentsFeatureDisabled`);显式处理 fail-open 组合(前端 hook 可能返回 true 而后端默认 false → 首个请求吃错误,要有降级文案而不是白屏)。
- [ ] **Step 2:** 页面三块布局:装配面板 / SOUL 面板 / 能力清单视图。若采用多栏骨架,**注意知识页的教训**:全局 Toaster 会盖住 composer,需要列作用域 toast 时照 `knowledge/kb-toast.ts` + `panels-shell.tsx` 的 `Toaster id` 模式。
- [ ] **Step 3:** `agent-card.tsx` 加入口(卡片本体可点跳详情,或加第四个图标按钮),**既有 Chat / 设置 / 删除三按钮与其行为不动**。
- [ ] **Step 4:** E2E `agent-assembly.spec.ts`(`page.route()` 桩后端):卡片进详情、改 `skills` 三态后 PUT payload 正确、capabilities 渲染预期节点数、`agents_api` 关闭时降级。

## Task 7: i18n 文案

**Files:** Modify `frontend/src/core/i18n/locales/{types.ts,en-US.ts,zh-CN.ts}`

- [ ] **Step 1:** 新增文案落在 **`agents` 组**,`sidebar` 组一字不动(丙1 不加顶级入口)。三个文件同步(类型 + en-US + zh-CN)。
- [ ] **Step 2:** 文案遵守 spec §3 术语表:出现"装配""能力清单";**不得出现** Canvas / 构成 / Studio / 单用 Flow。

## Task 8: 验证阶梯

- [ ] **Step 1:** `cd backend && make test` 全绿 + `make lint`。
- [ ] **Step 2:** `cd frontend && pnpm check`(lint + typecheck)。
- [ ] **Step 3:** `cd frontend && pnpm test`(注意 node / happy-dom 两环境的文件后缀约定)。
- [ ] **Step 4:** `cd frontend && pnpm perf:check` —— React Flow 进入新路由后核对 `performance-budgets.json`;若超预算,修路由归属或拆分点,**不要直接抬上限**(frontend/AGENTS.md 明令)。
- [ ] **Step 5:** `cd frontend && pnpm test:e2e`(Playwright Chromium)。
- [ ] **Step 6:** 手工验收(需用户在浏览器里跑,`make dev` 后 UI 在 :3000,本机无 nginx):详情页装配一个真实 agent → 改 `skills` 三态 → 对话里验证行为随之变化 → 能力清单与真实工具集一致。**这一步不能跳过:类型检查与单测验证的是代码正确性,不是功能正确性。**

## Task 9: 文档同步(仓库强制约定)

- [ ] **Step 1:** `backend/AGENTS.md` 的 Routers 表:`Agents` 行加 `GET /api/agents/{name}/capabilities`(只读派生,门控同 `/api/agents`)。
- [ ] **Step 2:** `frontend/AGENTS.md`:Source Layout 的 routes 清单加 `/workspace/agents/[agent_name]`;Interaction Ownership 节加新页面的归属(谁拥有提交、谁拥有并发保护状态)。
- [ ] **Step 3:** 把实施结果与 Task 0 三项裁决回写 `../specs/2026-09-09-workbench-agent-assembly-design.md` §7(开放项裁决),并在 `../../WORKBENCH_CANVAS_RESEARCH.md` §7.1 的丙1 行标注实施状态。
- [ ] **Step 4:** **不提交 git,除非用户要求。**
