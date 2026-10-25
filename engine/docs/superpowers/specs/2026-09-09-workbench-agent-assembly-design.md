# 工作台丙1:Agent 装配台(能力清单 + 资产编辑面)— 设计文档

- 日期:2026-09-09
- 分支:实施时定(沿用当前分支或新切,听用户指令)
- 上游调研:`../../WORKBENCH_CANVAS_RESEARCH.md`(§7.1 分期、§7.5 SOP-vs-程序、§7.6 三层边界与入口裁决)
- 相邻产品线:`../../AGENT_HARNESS_VISUALIZATION_RESEARCH.md`(harness 构成观测台,**不是本 spec 的对象**,术语避让见 §3)
- 计划文档:`../plans/2026-09-09-workbench-agent-assembly.md`

## 1. 目标

丙1 是工作台三层(丙1 → 甲 → 乙 → 丙2)的第一层,**零新引擎**。它做两件事:

1. **补齐 agent 资产的可视编辑面**:后端 `PUT /api/agents/{name}` 已能写 9 个字段,前端只暴露了 5 个中的模型相关项;`soul`(提示词正文)、`tool_groups`、`skills` 三个字段**没有任何 UI**(`AgentSettingsDialog` 只覆盖 model/temperature/max_tokens/thinking/reasoning_effort)。丙1 把它们补全,并新增 agent 详情页作为承载面。
2. **新增「能力清单」派生视图**:回答"这个 agent 实际能用什么工具"——今天**任何 UI 都回答不了**,因为 `GET /api/agents/{name}` 返回的是**存储的配置声明**(`load_agent_config` 读 store/磁盘),不是解析后的真实工具集。这是本 spec 唯一的新后端能力,且是**只读**的。

同时,丙1 承担调研文档 §7.6 判定必须"一次定、三层共用"的**外壳**:术语表(§3)与节点卡片视觉语言(§6.3)。

**明确不做**:workflow JSON、DAG 引擎、图 CRUD、SKILL.md 编辑器(§5 范围裁决)、harness 构成观测。

## 2. 背景与现状(2026-09-09 代码核查,全部带行号)

### 2.1 后端写路径已完整存在

`backend/app/gateway/routers/agents.py`(574 行,已通读):

| 端点 | 行号 | 语义 |
|---|---|---|
| `GET /api/agents` | :199 | 列表,响应含 `soul`(:220) |
| `GET /api/agents/check?name=` | :229 | 名称可用性 → `{available, name}`(:254) |
| `GET /api/agents/{name}` | :257 | 详情,**返回存储的配置声明 + soul 原文**(`load_agent_config` :282、`load_agent_soul` :184),404(:288) |
| `POST /api/agents` | :294 → 201 | `AgentCreateRequest`(:58-69,`soul` 默认 `""`);name 422(:314)、model 422(:315)、冲突 409(:343) |
| `PUT /api/agents/{name}` | :350 | `AgentUpdateRequest` 全字段可选(:72-82);config 走**字段级 patch**(`model_fields_set` 区分"省略"与"显式 null",:405-432);`soul` 非 None 时**整份替换**(:448-449);非管理字段结转(:442-443);404(:376)、legacy 布局 409(:394) |
| `DELETE /api/agents/{name}` | :532 → 204 | 404/409(:561-572) |
| `GET/PUT /api/agents/user-profile` | :479 / :504 | `USER.md` 整份写(:524) |

**关键事实**:该路由文件内**无 admin-only、无 owner_check、无 SkillScan、无 allowed-tools 介入**(对全文做大小写不敏感 grep `require_admin|owner_check|admin|skillscan|scan_skill|allowed.tools`,零命中);用户隔离**仅**靠 `get_effective_user_id()`(:213,278,317,372,551)。全仓**无 `PATCH /api/agents*`**(全量 grep `@router\.patch` 覆盖 `routers/` 全目录,8 处命中均在 knowledge_bases/mcp/memory/scheduled_tasks/threads)。

> 事实性不一致(不在本 spec 修复范围,仅记录):`update_agent_tool.py:231` 与 `agents_config.py:264` 的注释写 "PATCH /api/agents/{name}",实际路由是 PUT(`agents.py:350`)。

门控:`agents_api.enabled` **默认 false**(`harness/deerflow/config/agents_api_config.py:9-13`),路由内逐端点检查(:211,246)。

### 2.2 agent 资产的数据形状

`AgentConfig`(`harness/deerflow/config/agents_config.py:208-233`):

| 键 | 类型 | 默认 | 校验 |
|---|---|---|---|
| `name` | str | 必填(:211) | 从目录名重发,**未知键被剥离**(`persistence/agents/base.py:45-46`);正则 `^[A-Za-z0-9-]+$`(:40,165-173) |
| `description` | str | `""`(:212) | — |
| `model` | str\|None | None(:213) | 必须存在于 `models`(工具与路由两侧都查) |
| `tool_groups` | list[str]\|None | None(:214) | — |
| `skills` | list[str]\|None | None=全部启用,`[]`=禁用(:215-220) | — |
| `model_settings` | 对象\|None | None(:223) | temperature 0-2、max_tokens 1-200000、`extra="forbid"`(:192-205,41) |
| `thinking_enabled` | bool\|None | None(:226) | — |
| `reasoning_effort` | low/medium/high\|None | None(:229) | — |
| `github` | 对象\|None | None(:233) | bindings repo 去重(:141-162) |

`SOUL.md`:**无 frontmatter 约定**(唯一内置资产 `harness/agents/assets/rag/SOUL.md` 以 `# 知识库问答专家` 开头)。消费链:`load_agent_soul`(agents_config.py:346-377)→ `lead_agent/prompt.py:1073` `soul=get_agent_soul(...)` → html-escape 后包进 `<soul>` 块(:890)→ 模板 `{soul}` 占位(:501);custom agent 额外追加 `<self_update>` 块(:894-912,1074)。

持久化(`harness/deerflow/persistence/agents/`):抽象方法 `get(:65) exists(:74) get_soul(:83) list(:87) list_all(:91) create(:99) update(:110) delete(:120) **signature(:124)**`;file 后端路径 `{base_dir}/users/{user_id}/agents/{name.lower()}/config.yaml|SOUL.md`(`config/paths.py:229-231`),写入为 temp 文件 + `os.replace`(file.py:224-259);db 后端 `agents` 表 `UNIQUE(user_id,name)`(model.py:24-42,sql.py:85-87),单事务(:152-182)。默认 file(`config/agent_storage_config.py:28-29`)。legacy `{base_dir}/agents/{name}/` 只读回退(agents_config.py:281-305)。

### 2.3 对话内组装(丙1 的"载体")已上线

- 工具:`setup_agent`(`tools/builtins/setup_agent_tool.py`,`soul:str` 必填 + `description:str` 必填 + `skills:list[str]|None`,:17-28;空 soul 拒绝 :38-48)、`update_agent`(同目录,全字段可选,"null/none/undefined" 字符串归一为 None :46,63-83;github 渠道拒绝 :54,124-125;全字段省略拒绝 :127-128;未知 model 拒绝 :157-158;legacy-only 布局拒绝 :171-172;`preserve_non_managed_fields` 保留 `github:` 等未管理字段 :235-237;无变化不落盘 :248-250)。
- 挂载条件:`is_bootstrap=cfg.get("is_bootstrap",False)`(`agents/lead_agent/agent.py:713`)、`agent_name=validate_agent_name(cfg.get("agent_name"))`(:715);`setup_agent` **仅** bootstrap 分支追加(:801,811),`update_agent` 条件为 `agent_name and not is_webhook_channel`(:887-889),`_WEBHOOK_CHANNELS={"github"}`(:82)。
- 来源:Gateway 白名单把 `body.context` 的 `agent_name`/`is_bootstrap` 转发进 configurable 与 context(`app/gateway/services/__init__.py:291-309`);IM 侧 `/bootstrap` 命令置 is_bootstrap(`app/channels/manager.py:2364`)。
- 前端创建流程:`app/workspace/agents/new/page.tsx` **两步**(`type Step = "name" | "chat"`,:52)。第 1 步只收 name(正则 :55,`checkAgentName` → `GET /api/agents/check` :142);第 2 步是**对话式引导,不调 `createAgent`**,流上下文 `{mode:"flash", is_bootstrap:true}`(:97-100),首次发送即 bootstrap 消息(:184-193),保存走隐藏消息 `t.agents.saveCommandMessage`(:269-274)由后端 `setup_agent` 落盘;`onFinish` 检测 `setup_agent` 工具结果(:105)后 `getAgentWithRetry`(重试 0/200/500/1000/2000ms,:57,63-77)。成功后**不自动跳转**,渲染成功卡片 + 两个按钮(:417-430)。

**结论**:调研文档 §7.5 说的"主对话作为组装载体,本仓已在做"——核实为**已上线且仅覆盖创建**;更新侧工具(`update_agent`)也在,但**没有任何 UI 告知用户它存在**。

### 2.4 前端现状

- 路由:`app/workspace/agents/` 下**仅 5 个文件**——`page.tsx`、`layout.tsx`、`new/page.tsx`、`[agent_name]/chats/[thread_id]/{page,layout}.tsx`。**无 `[agent_name]/page.tsx`,即无 agent 详情页**。
- 列表页只渲染 `<AgentGallery/>`(page.tsx:3-5);`agent-gallery.tsx:14` 用 `useAgents()`,卡片网格 1/2/3/4 列(:60-64),新建按钮 push `/workspace/agents/new`(:18)。
- `agent-card.tsx`:**卡片本体不可点**,三个按钮——Chat(:117-119)、设置图标开 `AgentSettingsDialog`(:198-224)、删除(:121-129,:227-250)。无下拉操作菜单。
- `agent-settings-dialog.tsx`:编辑 model/temperature/max_tokens/thinking/reasoning_effort → `useUpdateAgent` → PUT(:47-50)。
- `core/agents/`:`api.ts` 六函数(listAgents:39 / getAgent:46 / createAgent:52 / updateAgent:68 / deleteAgent:84 / checkAgentName:91)+ 错误类(:9,:28);`hooks.ts` 六 hook(:19,:58,:66,:75,:85,:102),**query key 为内联字面量,无 key 工厂**;`types.ts` 的 `Agent`(:8-18)字段与后端 `AgentConfig` 对齐;`feature-cache.ts` localStorage key `deerflow.features.agents_api`(:9),**`resolveAgentsApiEnabled` 在从未拿到答案时 fail open = true**(:46-51)。
- i18n:`sidebar` 组 9 键,定义于 `core/i18n/locales/en-US.ts:304-314`、`zh-CN.ts:287-297`、类型 `locales/types.ts:229-239`。**新增一个 sidebar 项要改 4 个文件**(types/en-US/zh-CN + `components/workspace/workspace-nav-chat-list.tsx`)。
- React Flow:`@xyflow/react ^12.10.0` 在 `package.json:60`;`components/ai-elements/` 的七个包装组件(`canvas.tsx:9` `Canvas`,默认 `fitView`/`panOnScroll`/`selectionOnDrag` + `<Background>`;`node.tsx:21` `Node` + 六个子组件,props 含 `handles:{target:boolean; source:boolean}`(:14-18);`edge.tsx:137` `Edge.Temporary`/`Edge.Animated`;`connection.tsx:5`;`controls.tsx:9`;`panel.tsx:7`;`toolbar.tsx:7`)**零外部消费者**(bash 全量 grep `frontend/src` + `frontend/tests`,无截断,count=0),且业务代码零处 import `@xyflow/react`。
  **这七个文件不可手改**:`frontend/AGENTS.md:281` 明文 "`ui/` and `ai-elements/` are generated from registries … don't manually edit these"、:54 "auto-generated, ESLint-ignored";`eslint.config.js:15` ignores `src/components/ai-elements/**`;`components.json` 配置了 `@ai-elements → https://registry.ai-sdk.dev/{name}.json`。
- 画布先例:`knowledge/graph-canvas.tsx` 用 **ECharts**(:8-11,:70)不是 React Flow;懒加载在消费方 `graph-tab.tsx:53-55`(`dynamic(..., {ssr:false})`);`ResizeObserver → chart.resize()`(:289-294);数据变更 `setOption(..., {notMerge:true})` 全量重建(:330-361),overlay-only 走 merge 保留布局/视口(:372-387),回调经 ref 穿透避免重绑(:194-211)。

### 2.5 SKILL.md 侧的事实(决定 §5 的范围裁决)

- HTTP 能写正文,**但仅限已存在的 custom skill 且 admin-only**:`PUT /api/skills/custom/{name}`(`routers/skills.py:264-301`,admin 门 :266,body `CustomSkillUpdateRequest.content` :93-94,`ensure_custom_skill_is_editable` :270),另有 `POST .../rollback`(:360-406,admin :362)与 `GET .../history`(:334)。**全文件无 `POST /skills/custom` 创建端点**(561 行通读)。
- agent 侧唯一写 skill 的内置工具是 `skill_manage`(`tools/skill_manage_tool.py:262-293`,action=create/edit/patch/delete/write_file/remove_file :143-252),**仅当 `skill_evolution.enabled`**,默认 **False**(`tools/tools.py:101-105`;`config/skill_evolution_config.py:7-10`)。`skills/public/skill-creator/SKILL.md:36-65` 本身不写文件,只指示模型调 `skill_manage`。
- 沙箱侧**不可行**:`/mnt/skills/*` 全部 `read_only=True`(`sandbox/local/local_sandbox_provider.py:259,342-352`;`sandbox/tools.py:867-868,887-893`;`local_sandbox.py:740,796`);即便直写投影树,hardlink 无写隔离(`skills/projection.py:97-106`),下次 acquire 签名不符即整树重建覆盖(:169-186,429-458)。
- 门禁:SkillScan 的 `enforce_static_scan` 在 HTTP PUT/rollback 前置(`skills.py:131`)、`skill_manage` 每个写 action(`skill_manage_tool.py:101`)、install 解压后(`installer.py:297`,经 :311)介入;**仅 CRITICAL 阻断**(`skillscan/orchestrator.py:40,162-168`),HIGH 及以下只记 warning 并作为 `static_findings` 传给 LLM 扫描器(:171-174;`skills.py:273`);kill switch `skill_scan.enabled` 默认 True(`config/skill_scan_config.py:9-12`)。frontmatter 白名单 10 键(`skills/frontmatter.py:15-26`),未知键拒绝(`validation.py:36-38`),校验入口 `validate_skill_markdown_content`(`storage/skill_storage.py:65-75`)。
- 前端:`core/skills/api.ts` 只有 loadSkills(:27)/enableSkill(:36)/installSkill(:69);**无任何 SKILL.md 创建或编辑页面**(全量 grep,head_limit=0,结果完整);唯一消费面是 `skill-settings-page.tsx` 的列表 + 开关(:28,71)。

## 3. 外壳:术语表(三层共用,本 spec 一次定死)

调研文档 §7.6 判定外壳必须一次定。术语裁决如下,甲/乙/丙2 立项时**不得另造**:

| 术语 | 含义 | 用在哪 |
|---|---|---|
| **工作台**(Workbench) | 整条产品线的名字,**不是路由名、不是菜单标签** | 文档、spec 标题 |
| **装配**(Assemble) | 把能力(tool_groups / skills / model)挂到一个 agent 上 | 丙1 的 UI 文案 |
| **能力清单**(Capabilities) | 从一个 agent 的配置**派生**出的实际可用工具集 | 丙1 的只读端点与视图 |
| **节点**(Node) | 甲层概念:图里一个可执行单元 | 甲/乙;**丙1 只定它的卡片视觉语言,不引入节点实体** |
| **工作流**(Workflow) | 甲/乙 的产物(workflow JSON)与其顶级菜单标签 | 甲/乙 |

**禁用词**:

- **Canvas** —— 本仓已占用两次(`components/workspace/knowledge/graph-canvas.tsx` 是 ECharts 知识图谱、`components/ai-elements/canvas.tsx` 是 React Flow 包装组件),且调研文档 §5 记录该词在 2026 产品语境至少三义(选项面板 / agent 成果物界面 / 流程本体)。只允许作为**实现词**出现在代码里(如 `Canvas` 组件名),不得出现在菜单、文案、路由。
- **构成**(Constitution)—— 已被相邻产品线(harness 观测台)占用,丙1 的派生视图必须叫**能力清单**,否则两条线术语撞车、日后数据模型会被诱导合并(违反 §2 的不合并原则)。
- **Studio** —— LangSmith Studio / Coze Studio / AutoGen Studio 三家占用。
- **Flow** 单用 —— 与 workflow 混淆;需要时写全 `workflow`。

**菜单与路由**(依 §7.6 裁决):丙1 **不新增顶级 sidebar 项**;新增 agent 详情页路由 `app/workspace/agents/[agent_name]/page.tsx`,与既有 `[agent_name]/chats/[thread_id]` 同级。甲层的顶级项(`/workspace/workflows`)留到甲立项时加,届时按 i18n 4 文件约定改。

## 4. 形态裁决:面板为主,图为辅,且图只用在派生关系上

**裁决**:丙1 的编辑面主体是**结构化面板**(Markdown 编辑 + 多选 + 数值表单),不是画布。理由:`AgentConfig` 九个字段里八个是标量或扁平列表,表单比图更准确、更可达、更便宜;把配置画成图是装饰(本项目已有"canvas mock 被否"的先例)。

**唯一用图的地方是能力清单**,因为它表达的是**派生的二部关系**,表格说不清:

```
agent ──(tool_groups)──> 工具组 ──(展开)──> 具体工具(标 opt_in)
agent ──(skills 白名单)──> skill ──(allowed-tools)──> 激活后对工具集的收窄
agent ──(model)──> 模型(标 supports_vision / supports_thinking)
```

这张图有真实功能,不是好看:它回答"我给这个 agent 勾了 `skills: []`,它到底还能用什么"——`skills: None` 是全部启用、`[]` 是全部禁用(agents_config.py:215-220),这个语义今天没有任何 UI 呈现,而它直接决定 agent 行为。

**技术选型**:用 `@xyflow/react` + 既有七个 ai-elements 包装组件(`Canvas`/`Node`/`Edge`/`Controls`/`Panel`),**不手改这些文件**(§2.4 证据)。若其 props 不够用(已知风险:`Node` 的 `handles` 只有 `{target: boolean, source: boolean}`,没有多端口/带 id 的 handle),则在 `components/workspace/agents/` 下写自有包装层引用 `@xyflow/react` 原语,**而不是改 ai-elements**。

选 React Flow 而非 ECharts 的第二理由(风险前移):这七个组件是甲层画布的地基,却零消费者、从未在真实页面里跑过。丙1 是唯一一个"便宜到可以承受失败"的场景,用它先验证这套组件,把甲层的前端风险提前暴露。

## 5. 范围裁决:SKILL.md 编辑**不进丙1**

`PUT /api/skills/custom/{name}` 能写正文,但丙1 不包含它,四条理由:

1. **权限模型不同**:skill 写端点是 **admin-only**(skills.py:266),agent 写端点**只按 user 隔离**(§2.1)。混在一个页面里会让非 admin 用户看到能点但会 403 的控件。
2. **能力不完整**:**无创建端点**(只能 install `.skill` 压缩包,或开 `skill_evolution.enabled` 走 `skill_manage`)。一个"能改不能建"的编辑器是半成品。
3. **门禁不同**:skill 写路径强制过 SkillScan(`enforce_static_scan`,skills.py:131),agent 写路径完全不过。两套校验反馈要两套 UI。
4. **产物不同**:SKILL.md 是给 LLM 读的说明书,`allowed-tools`/`required-secrets` 是**策略**;agent config 是**装配声明**。调研文档 §7.5 已判定两者不合并 schema。

→ 另立 **丙1b**(skill 编辑面),前置条件是后端补 `POST /api/skills/custom` 创建端点 + 决定 SkillScan findings 在 UI 上如何呈现(CRITICAL 阻断 vs HIGH warning)。丙1 的能力清单视图**只读地引用** skill 的 `allowed-tools`,不编辑它。

**本条裁决已由用户于 2026-09-09 确认**(SKILL.md 编辑踢出丙1、另立丙1b)。

## 6. 设计

### 6.1 后端:一个只读端点

新增 `GET /api/agents/{name}/capabilities`,返回派生的能力清单。**只读、无写入、无新表**。

```jsonc
{
  "agent_name": "rag",
  "resolved_from": { "tool_groups": ["rag"], "skills_mode": "disabled_all" },
  "tools": [
    { "name": "hybrid_search", "group": "rag", "opt_in": true, "source": "tool_group" }
  ],
  "skills": [
    { "name": "image-generation", "enabled": true, "allowed_tools": null,
      "required_secrets": ["DASHSCOPE_API_KEY"] }
  ],
  "model": { "name": null, "inherits_default": true,
             "supports_vision": false, "supports_thinking": false },
  "unresolved": [ "…" ]      // fail-closed:枚举不到的显式标注,不静默省略
}
```

三条设计约束:

- **复用既有枚举函数,不新造解析逻辑**:`get_available_tools(groups=…)`(`tools/tools.py`)、skill 注册表(`skills/` 的 load 路径)、`create_chat_model` 的模型配置查询。派生结果必须与 agent 真实装配时**同源**,否则视图会说谎。
- **fail-closed**:枚举不到的项进 `unresolved` 数组并说明原因,不允许静默消失(沿用 harness 调研文档 §3.3 采纳的原则)。
- **门控与鉴权照 `/api/agents/{name}`**:`agents_api.enabled` + `get_effective_user_id()` 隔离,不引入新权限模型。
- **性能**:该端点会触发工具装配的解析。必须确认它是纯解析(不实例化模型、不连 MCP)。若 MCP 工具枚举会触发网络/子进程,则 MCP 部分只返回**配置声明**并标 `source: "mcp_config"`,不做实时 discovery——`get_cached_mcp_tools()` 有缓存,但丙1 不应成为触发 MCP 初始化的路径。

### 6.2 前端:agent 详情页

新路由 `app/workspace/agents/[agent_name]/page.tsx`,门控照 `agents/layout.tsx:11-23`(`useAgentsApiEnabled()` → `AgentsFeatureDisabled`)。三块:

1. **装配面板**(主体):`description`、`model` + `model_settings`(复用 `agent-settings-dialog-helpers.ts` 的常量与换算,不复制)、`thinking_enabled`、`reasoning_effort`、`tool_groups`(多选,选项来源见 §6.4)、`skills`(三态:`None`=全部启用 / `[]`=全部禁用 / 显式列表——**必须三态可视,不能退化成"空=无"**)。
2. **SOUL 面板**:Markdown 编辑 `soul`,整份替换语义(PUT :448-449)。需要:未保存提示、与对话侧 `update_agent` 的并发处理(§7 风险 1)、以及一句说明"这段文字会被 html-escape 后包进 `<soul>` 注入系统提示词"(prompt.py:890,501)——让用户知道它不是普通备注。
3. **能力清单视图**:消费 §6.1 端点,React Flow 渲染二部关系;每个 skill 节点显示 `allowed_tools` 是否收窄、每个工具显示 `opt_in`;`unresolved` 显式渲染为警示节点。

`agent-card.tsx` 增加第四个入口(卡片本体可点 → 详情页,或加一个"装配"图标按钮),保留既有 Chat/设置/删除三按钮不动。

### 6.3 外壳:节点卡片视觉语言(甲层复用)

能力清单里的每张卡片按**甲层节点规格**设计,使甲层可直接复用:

- 卡片四要素:**图标(按能力来源分类)+ 名称 + 来源徽章(`tool_group` / `skill` / `mcp` / `builtin`)+ 状态条(`opt_in` / `allowed_tools 收窄` / `unresolved`)**;
- 确定性标记位预留:甲层要在卡片上显示「⚡可缓存」/「🎲 非确定性」徽标(调研文档 §3 边界表),丙1 的卡片布局**必须留出这个位置**(即使丙1 阶段全部是"非节点"),否则甲层要重排版式;
- 组件落在 `components/workspace/agents/capability-card.tsx`,**不放 ai-elements**(不可手改),不放 `ui/`。

### 6.4 选项来源(装配面板的多选选项从哪来)

- `tool_groups`:需要枚举 `config.yaml` 的 `tool_groups[]` 声明。**今天没有端点暴露它**(`GET /api/features` 只返回两个 UI 开关)。裁决:并入 §6.1 的 capabilities 端点,加一个 `available_tool_groups` 字段(全量清单,与 agent 当前选择分开),避免再开一个端点。
- `skills`:复用既有 `GET /api/skills`(前端已有 `loadSkills`,core/skills/api.ts:27)。
- `model`:复用既有 `GET /api/models`(前端已有 `core/models`)。

## 7. 风险与开放项

1. **并发写覆盖(最高优先)**:`PUT` 的 `soul` 是**整份替换**且**无修订令牌**(:448-449);同时 agent 自己的对话里 `update_agent` 工具在 `agent_name` 存在时是**挂载着的**(agent.py:887-889)。用户在详情页编辑 SOUL 的同时,agent 在对话里自改 → last-write-wins 静默覆盖。**开放项**:store 抽象已有 `signature(:124)` 方法,需核实它能否作为乐观并发令牌(If-Match 风格);若不能,丙1 至少要在页面加载时记录 signature、提交时比对、不一致则拒绝并提示刷新。**实施前必须裁决**,不能带着静默覆盖上线。
2. **`useAgentsApiEnabled` fail open**:`resolveAgentsApiEnabled` 在从未拿到答案时返回 **true**(feature-cache.ts:46-51),而 `agents_api.enabled` 后端默认 **false**。丙1 新页面沿用这个 hook 时,首屏可能对未启用的后端发请求并吃 403/404。需确认既有 `AgentsApiDisabledError`(api.ts:28)的降级路径够用,或在新页面显式处理。
3. **`Node` 组件的 handle 能力未知**:`handles:{target:boolean; source:boolean}`(node.tsx:14-18)看起来不支持多端口/命名 handle。二部图需要"一个 agent 节点连多个能力节点"——需先做一个 spike 验证;不行就走 §4 的自有包装层分支。
4. **capabilities 端点的解析成本**:若 `get_available_tools()` 会触发 MCP discovery 或模型实例化,该端点会变慢甚至有副作用。§6.1 已给约束,但**实施时必须实测**一次冷启动耗时。
5. **`skills` 三态的前端表达**:`None` vs `[]` vs 列表,后端语义明确(agents_config.py:215-220),但 `types.ts` 的 `skills: string[]|null` 只有两态可辨(null / 数组),`[]` 与"未设置"在 UI 上必须显式区分,否则用户会把"全部禁用"误改成"全部启用"。
6. ~~**开放项(需用户裁决)**:能力清单视图是必做还是可选~~ **已裁决(2026-09-09,用户确认为丙1 必做项)**。它是本 spec 唯一的新后端能力、唯一用到 React Flow 的地方,也是外壳(节点卡片视觉语言)的唯一落点——砍掉它甲层就要重新设计节点卡片。因此计划文档 Task 5 不再被"范围确认"阻塞;Task 0 的另两项核实(`signature()` 并发语义、`Node` 的 handle spike)与解析成本实测仍是前置。

## 8. 向后兼容与影响面

- **不改**任何既有端点的请求/响应形状;`PUT` 语义原样使用(字段级 patch + soul 整份替换)。
- **不改** `AgentConfig` schema,不 bump `config_version`。
- **不改** ai-elements / ui 目录下任何文件(registry 生成物)。
- **不改**既有创建流程(`new/page.tsx` 两步向导原样保留);丙1 只加详情页与卡片入口。
- **不新增**顶级 sidebar 项,故 i18n 的 `sidebar` 组不动;新增文案落在 `agents` 组(需核实其现有键位)。
- 新增:`GET /api/agents/{name}/capabilities` 端点 + 其测试;`app/workspace/agents/[agent_name]/page.tsx` + 组件;`core/agents/` 增 API 函数与 hook(并考虑补 query key 工厂——现状是内联字面量,新增第三个 key 时值得收敛,但**不作为丙1 的强制项**)。
- 路由资产预算:新页面若引入 React Flow,需过 `pnpm perf:check`(`performance-budgets.json`)。React Flow 应经 `next/dynamic` + `ssr:false` 懒加载(照 `graph-tab.tsx:53-55` 先例),避免进入首屏 chunk。

## 9. 测试(TDD)

- 后端(`backend/tests/`,TDD 强制):capabilities 端点的派生正确性(tool_groups 展开、skills 三态各自的清单、model 继承默认、`unresolved` 的 fail-closed)、鉴权与门控(`agents_api.enabled=false` 时 404/403 与既有一致)、跨用户隔离(A 用户读不到 B 用户的 agent)、不触发 MCP discovery(用桩断言)。
- 前端(`frontend/tests/unit/`,Rstest):纯逻辑走 `*.test.ts`(node 环境)——capabilities 响应到图数据的转换、skills 三态的 UI 状态推导、signature 冲突判定;组件走 `*.dom.test.tsx`(happy-dom)——装配面板的字段渲染与提交 payload、SOUL 面板的未保存提示与整份替换语义、卡片入口跳转。
- E2E(`frontend/tests/e2e/`,Playwright,`page.route()` 桩掉后端):详情页从卡片进入、改 `skills` 三态后 PUT payload 正确、capabilities 视图渲染出预期节点数、`agents_api` 关闭时降级到 `AgentsFeatureDisabled`。
- 验证阶梯:`cd backend && make test`(离线全量)+ `make lint`;`cd frontend && pnpm check`(lint + typecheck)+ `pnpm test` + `pnpm perf:check`;新端点需过既有 `tests/test_auth.py` / `test_auth_middleware.py` 一类鉴权套件的约定。

## 10. 否决备选

- **在丙1 就做 workflow JSON 与 DAG 引擎**:调研文档 §7.1 已判定甲层是周级新建工程,且 schema 的 `deterministic` 语义必须先冻结;混进丙1 会让"天级、零引擎"的成本判断失效。
- **把 SKILL.md 编辑并入丙1**:四条理由见 §5(权限模型 / 无创建端点 / 门禁不同 / 产物不同)。
- **用 ECharts 画能力清单**:仓内有先例(`graph-canvas.tsx`),但甲层画布必须用 React Flow(交互:拖拽连线、handle、节点工具栏),ECharts 的图系列不提供这套编辑原语;丙1 用 ECharts 会让甲层重做一遍,违反 §7.6"外壳一次定"。
- **手改 `ai-elements/` 七个组件以适配需求**:`frontend/AGENTS.md:281` 明令禁止,且 ESLint 已 ignore 该目录(改了不会被 lint 抓到,更危险)。需要扩展就在 `components/workspace/agents/` 下写自有包装。
- **新增顶级 sidebar 项承载丙1**:§7.6 已裁决——丙1 编辑的是 agent 资产,`/workspace/agents` 已是它的家;另开入口会造成"两个地方都能编辑同一个 agent"的分裂(同类问题见知识库三套文件类型系统)。
- **让丙1 直接调 `setup_agent`/`update_agent` 工具而非 HTTP 端点**:那两个工具是**给 LLM 用的**对话侧通道,绑定条件依赖 `is_bootstrap`/`agent_name` 运行时上下文(agent.py:713,715,887-889);前端有完整的 REST 写路径(§2.1),绕道工具会引入不必要的会话依赖。
- **给 `PUT` 加 PATCH 语义或修订令牌**:属于后端契约变更,影响既有对话侧 `update_agent` 与前端 `useUpdateAgent`。丙1 先用 store 已有的 `signature(:124)` 做**读取时比对 + 提交前校验**(§7 风险 1),不改契约;若核实 `signature` 不可用,再另案讨论。

## 11. 非目标与路线图

- **本期不做**:workflow JSON schema、DAG 引擎、图 CRUD 与执行端点、节点实体、SKILL.md 编辑器(丙1b)、`/workspace/workflows` 顶级入口(甲层)、harness 构成观测台(相邻产品线)、`skill_evolution.enabled` 的任何改动、`agents` 表的迁移。
- **为甲/乙预留的接口**(丙1 必须按此形状产出,否则甲层返工):
  1. **能力清单端点的响应形状**即甲层"可编排节点清单"的雏形(调研文档 §8 缺口 5)。甲层需要的是"全量可编排节点",丙1 需要的是"某个 agent 已装配的节点"——**同一套节点描述形状,两种过滤范围**。丙1 的 `tools[]`/`skills[]` 条目字段名必须按可复用设计(`name`/`source`/`group`/`opt_in`),不要写成 agent 专属的嵌套结构。
  2. **节点卡片视觉语言**(§6.3)含确定性标记位,甲层直接复用组件。
  3. **术语表**(§3)三层共用,甲/乙/丙2 立项时不得另造。
- **丙1b(skill 编辑面)前置条件**:后端补 `POST /api/skills/custom` 创建端点;裁决 SkillScan findings 的 UI 呈现(CRITICAL 阻断 / HIGH warning 如何展示);裁决 admin-only 与 per-user 隔离如何在一个界面里共存。
- **甲层前置条件**(调研文档 §7.1/§7.4):workflow JSON schema 冻结 `deterministic` 语义;执行派发复用既有 run 生命周期(`backend/AGENTS.md` 的 scheduler 治理先例);图执行从第一天起是后台 run,不做同步模式。