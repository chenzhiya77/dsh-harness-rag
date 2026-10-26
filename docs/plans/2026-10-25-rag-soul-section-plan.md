# RAG 回答纪律注入（G11）Plan

**Spec:** [2026-10-25-rag-soul-section-spec.md](../specs/2026-10-25-rag-soul-section-spec.md)
**Status:** 实施完成（2026-10-25；Task 0–5；未提交）
**Date:** 2026-10-25

**硬约束**：只改本仓插件面；不碰引擎、运行时包、面板；不碰并行会话文件；提交候令；英文 Conventional ASCII。

**TDD 通用要求**：Task 2 先 RED（fake agent 无 section 记录）/ GREEN，再做 neuter；门禁全绿后回填实测。

---

## Task 0 — 落点核实（只读）

> 动到的文件：无。

- [x] 宿主 API：`agent.ctx.systemPrompt.section({ name, order, text, complete? })` 返回 disposer；重复名在同层抛；scope 随 agent 生命周期 unwind。
- [x] 文本来源：主树 `engine/backend/packages/harness/deerflow/agents/assets/rag/SOUL.md` 的检索工作流 / 语料边界 / 引用规范 / 拒答策略。
- [x] 挂载点：`src/tool_gating.ts` 的 `mountAgent` / `unmountSession` / `forgetAgent`；现有 fake agent 只有 `ctx.tools`，需扩展。
- [x] 工具名：插件六件 `hrag_*`；文本不得出现主树裸名。

**实测**：
- `SystemPrompt.section` 定义见 `node_modules/@deepseek-ai/dsh-system-prompt/lib/types/index.d.ts:180-188`；section 以调用方 context 为 scope，agent scope 由 `agent.ctx` 承载。
- `agent.ctx.tools.register` 已是现有挂载面，说明 `agent.ctx` 可继续挂 `systemPrompt`，无需新增 host `inject`。

---

## Task 1 — 纪律文本模块

> 动到的文件：`src/retrieval_discipline.ts`（新增）。

- [x] 新增 `RETRIEVAL_DISCIPLINE`（中文，短段，含任务路由 / 读取上限 / 引用 / 拒答 / 不解释过程）与 `DISCIPLINE_SECTION = { name: 'harness-rag:retrieval-discipline', order: 150 }`。
- [x] 文本只写检索纪律，不写人格/身份；工具名用 `hrag_*`。

**实测**：
- 七条：向量保底（含概念题例外与回补）、图谱路、语料边界三件、读取有界（4 窗 / 单轮 6 次）、引用（`citation_no` 照抄、连续编号、一句一标、不出末尾清单）、拒答、不解释路由。
- 未搬主树 SOUL 的人格段（「知识库问答专家」）、深度检索模式、附图问题、作答前自查补检限次——宿主 agent 身份与产品工作流不在插件面覆盖。
- 工具名全部带 `hrag_` 前缀；`tests/tool_gating.test.ts` 用边界正则（负向后顾 `(?<![_A-Za-z])`）证明无裸主树名。

---

## Task 2 — 挂载事务与测试（TDD）

> 动到的文件：`src/tool_gating.ts`、`tests/tool_gating.test.ts`。

- [x] 测试先行：fake agent 增 `systemPrompt.section` 记录；断言绑定挂载注册工具 + section、未绑不注册、解绑两者都释放、agent 销毁不手动释放、重绑可再挂。
- [x] `GatingAgent.ctx` 增 `systemPrompt.section`；`mountAgent` 在同一回滚事务内先注册工具再注册 section；`unmountSession` 倒序释放。
- [x] 文本断言：含六件 `hrag_*` / `citation_no` / 4 / 6 / 拒答句；不含裸 `hybrid_search` 等主树名。
- [x] neuter：去掉 section 注册 ⇒ 挂载/卸载 section 用例转红；还原后全绿。

**实测**：
- RED：新增 10 例（8 例 section 生命周期 + 2 例文本），首轮 `node --test tests/tool_gating.test.ts` = 23 pass / 6 fail（未绑、forget、两例文本本就绿，属预期）。
- GREEN：`mountAgent` 在既有 try 事务尾部 `agent.ctx.systemPrompt.section({ ...DISCIPLINE_SECTION, text: RETRIEVAL_DISCIPLINE })`（不带 `complete`，即追加而非接管 prompt）；disposer 与六件工具同入 `live`，`unmountSession` 倒序释放 ⇒ 29/29。
- neuter 两轴：删 section 注册 ⇒ 同 6 例转红；改文本（`最多 4 个窗口`→`窗口不限`、`citation_no`→`cite_id`、去 `hrag_` 前缀）⇒ 2 例文本转红；均还原后 29/29。
- 回滚一例：`section()` 抛错 ⇒ 六件工具全部释放、`mounted()` 为空、异常上抛（`registerToolGating` 的 `mount()` 转 `logger.warn`）。
- 宿主可用性核实：`dsh-tools` 的 `tools.presentAs()` 同样在 agent scope 上调 `ctx.systemPrompt.section(...)`（`node_modules/@deepseek-ai/dsh-tools/lib/index.js:2650`），证明 `agent.ctx.systemPrompt` 可解析全局 service 且以 agent 为 scope；无需新增 host `inject`，`src/index.ts` 仍为 `inject = ['tools']`（仅改注释）。

---

## Task 3 — 门禁

- [x] `node --test tests/tool_gating.test.ts`；`node --test tests/*.test.ts`；`node_modules/.bin/tsc -p tsconfig.json --pretty false`。
- [x] `node --check client.js`（未改，仅回归）。
- [x] 不重建运行时包（G11 只改 Host TS，随插件分发；托管冒烟用工作树链接）。

**实测**：定向 29/29；全量 241/241（此前 231，+10）；`tsc` exit 0；`node --check client.js` 通过。`pnpm run typecheck` 仍因私有包 `@deepseek-ai/dsh-type-meta` 404 不可用，沿用直调 `tsc`。运行时包未重建（`runtime.json` 未动）。


---

## Task 4 — Fake 模型托管冒烟

> 动到的文件：无（探针与配置在仓外）。

- [x] 本地 OpenAI-compatible fake 模型：按请求次序返回六件工具调用，最后给终答；不读取真实密钥、不耗额度。
- [x] 隔离 DSH web/headless 宿主 + `DSH_HARNESS_RAG_PACK=0.1.0-2` + 绑定已知 session id；
- [x] 验证：六件工具真实注册并执行、tool body 带 `run_id`、同一回合 `citation_no` 连续、下一回合从 1 起；G11 section 在绑定会话 prompt 中出现、解绑消失。
- [x] 记录限制：fake 模型验机制不验判断力；真实模型冒烟另案。

**实测**：
- **环境**：隔离 DSH 家目录 `E:\app\python\agent\dsh-harness-rag-sbx`（profile `sbx`），`DSH_HARNESS_RAG_PACK` 指向 `dist/harness-rag-runtime-win32-x64-0.1.0-2.zip`；托管引擎 ready（Qdrant 6336 / knowledge 8022，`runtimeVersion 0.1.0-2`）。插件按工作树链接加载。
- **fake 提供方**（仓外 `_scratch\hrag-smoke\fake-provider.mjs`，127.0.0.1:9100）：`/v1/embeddings` 返回 1024 维确定性哈希词袋向量；`/rerank` 返回词重叠分；`/v1/chat/completions` 按 `model` 分三腿（`sbx-agent` 回合脚本 / `sbx-extract` 图谱抽取 / `sbx-wiki` 百科撰写）；`/v1/models` 供目录探测。全程无真实密钥、无外网、无额度。
- **入库走真管线**：上传 `doc.md`（3.4 KB）→ 进程内解析 → 6 片 → 嵌入（fake）+ BM25 稀疏 → Qdrant；图谱腿与百科腿同样由 fake 应答。终态 `ready`，`path_status {vector: done, graph: done, wiki: ready}`，6 片、2 条百科条目（Gateway / Qdrant）。
- **绑定会话** `session-26889977-…`：系统提示含纪律段原文（`sysChars 6374`，紧接宿主身份句之后、人格未被替换）；工具集 37 件，六件 `hrag_*` 齐全。
- **回合 A（模型驱动）**：`hrag_list_documents` → `hrag_hybrid_search` **引用 [1]-[6]** → `hrag_graph_search` **[7]-[8]** → `hrag_wiki_search` **[9]** → `hrag_read_document`（`chunk_id` 取自前一步结果，第 2/共 6 片中心窗）→ `hrag_list_wiki_entries` → 终答。三路共用一套连续编号。
- **回合 B**：单次 `hrag_hybrid_search` 重新从 **[1]-[6]** 起 —— 新回合换 `run_id`。
- **对照（未绑定会话）** `session-aed6bdae-…`：工具 31 件、无 `hrag_*`，系统提示无纪律段（`sysChars 5770`，差 604 字符即纪律段长度）。
- **引擎侧直连复核**（同一托管运行时，`/tools` + 固定 `run_id`）：run C hybrid [1]-[6] → wiki [7] → graph [8]-[9]；run D 从 [1] 起。证明编号语义在包内实现成立，问题若出现在插件侧可被单独定位。
- **限制**：fake 模型只验机制（注册、分派、`run_id`、引用编号、prompt 注入），不验判断力与检索相关性；图谱实体与百科正文由脚本返回，非真实抽取质量；嵌入为哈希词袋，不具语义性；单文档、无 MinerU、无真实供应商密钥。

---

## Task 5 — 冒烟附带修复：`run_id` 来源（实测缺陷）

> 动到的文件：`src/tools.ts`、`tests/tool_gating.test.ts`。

- [x] 用真宿主取证 `exec` 形状；确认 `run_id` 未上送的原因；改为取实时回合相位。
- [x] 测试随契约改写；门禁复跑。

**实测**：
- **缺陷**：Task 4 首轮六件工具全部执行成功，但三路引用编号各自从 [1] 起 —— `run_id` 从未上送。探针（临时写入 `exec-debug.jsonl`）显示：`exec.agent` 与 `agent.id` 正常（KB 绑定解析依赖它），而运行时 `Session` **没有 `events`**：其原型只有 `surface / id / eventAt / snapshotEvents / ownEvents / isOwnSeq / seq / append / …`。随包 dsh-session 为 **0.2.1-rc.2**，本仓 `node_modules` 里的类型是 **0.0.1-rc.5**，两者不同代；旧实现按类型写的 `session.events` 在真宿主恒为 `undefined`。
- **修法**：`citationRunId` 改读 `exec.agent.phase.turn` —— 探针显示工具执行期 `agent.phase = {kind, abort, turn, step, wakeRequested}`，turn 在回合内恒定、跨回合递增；无 turn 或非数字时仍省略 `run_id`。删去 `SessionCursor` / `WeakMap` 与事件扫描，不再触碰宿主已标注弃用的同步事件读取（`snapshotEvents` / `eventAt` 均标 deprecated）。
- **测试**：`execWithTurn(events)` → `execInTurn(turn)`；原「回合结束后省略」用例随实现消失，合并进「无 turn / 无 agent ⇒ 省略」；同回合复用、跨回合换号两例保留。定向 28/28。
- **托管复验**：同一沙箱、同一会话再跑两回合 ⇒ 回合 A [1]-[6]/[7]-[8]/[9] 连续，回合 B 回到 [1]；未绑定会话仍无工具、无纪律段。
- **需要记住的宿主事实**：本仓 `node_modules/@deepseek-ai/*` 的类型版本落后于随包运行时；凡依赖宿主对象形状的代码，须以 `--dump-config` / 运行时探针为准，不能只按类型写。

---

## 收口

- [x] spec Status / plan 实测回填。
- [ ] 提交链候令（预计 3 笔：`feat(soul)` 纪律注入、`fix(tools)` run_id 改取实时回合相位、`docs(soul)` spec/plan）。
