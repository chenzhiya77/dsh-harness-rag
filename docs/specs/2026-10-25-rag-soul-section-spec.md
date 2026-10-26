# RAG 回答纪律注入（G11）Spec

**Status:** 已实施并提交（2026-10-25；验收 1–7 已证；代码 `3eb0414` + `623a79a`，文档 `4fd7653`）；D6 呈现面（不向模型提出引用要求）已实施、未提交
**Date:** 2026-10-25
**来源:** 2026-10-25 工具面对齐（[tool-parity-spec](2026-10-25-tool-parity-spec.md) §1 等价边界）登记的 G11：主树 RAG agent 有 `agents/assets/rag/SOUL.md` 承载回答纪律，插件只挂工具、未注入等价纪律。
**配套 plan:** [../plans/2026-10-25-rag-soul-section-plan.md](../plans/2026-10-25-rag-soul-section-plan.md)

## 1. 目标

绑定知识库的会话在获得六件 `hrag_*` 工具的同时，获得一段**检索纪律**：事实性问题向量保底、关系问题走图谱、语料边界用只读工具、读取有界、证据不足如实拒答。解绑即撤销；不绑定不注入。

**不包含**：人格/身份替换、整篇 SOUL 搬运、深度检索模式、附图处理、面板 UI、检索算法、引擎改动、宿主全局提示。

## 2. 现状与根因

插件 Host 半在 `agent.ctx.tools` 注册六件工具（[tool_gating.ts](../../src/tool_gating.ts)），但从未调用 `agent.ctx.systemPrompt.section`。宿主 `@deepseek-ai/dsh-system-prompt` 提供 agent-scoped 的 section 注册/释放，本来就不是平台限制；「没有注入」是能力缺口，不是 DSH 与主树的合理差异。

## 3. 决策

### 3.1 D1 注入面：agent-scoped `systemPrompt.section`（甲）

- 在 `tool gating` 挂载同一个 agent 时，向 `agent.ctx.systemPrompt.section({...})` 注册一段；
- section 名 `harness-rag:retrieval-discipline`，`order: 150`（tool guidance 100–199 约定内）；
- 不设 `complete: true`，不覆盖宿主人格；宿主 persona 仍是唯一身份面。
- 乙（全局 section + 靠工具是否可见自行判断）会让未绑定会话也读纪律，排除。

### 3.2 D2 生命周期：与工具同挂同卸（甲）

- `mountAgent`：工具注册 + section 注册同一事务；section 注册失败要回滚已注册工具；
- `unmountSession`：倒序释放；`agent/disposed` → `forgetAgent` 不重复释放（agent scope 已 unwind）；
- 重新绑定后重新挂载；section 不跨会话共享。

### 3.3 D3 文本范围：只写检索纪律（甲）

使用 `hrag_*` 工具名，覆盖：

1. 事实性问题至少一次 `hrag_hybrid_search`；纯概念定义可只 `hrag_wiki_search`，未命中回补 hybrid；
2. 关系/多跳问题调用 `hrag_graph_search`；
3. 语料边界（有哪些文档/条目、某篇讲什么、第几片）用 `hrag_list_documents` / `hrag_read_document` / `hrag_list_wiki_entries`，不用检索硬凑；
4. 读取有界：同篇最多 4 个窗口、单轮最多 6 次；
5. 证据不足明确说「知识库中没有找到相关内容」，不用预训练知识补写；
6. 不向用户解释检索路由/来源质量等过程元信息。

**不写**：人格/语气/身份、深度检索模式、图片处理、工作台专属行为——这些属于宿主或主树产品面。

### 3.4 D4 文本落点：独立常量模块（甲）

纪律文本放 `src/retrieval_discipline.ts`，常量 `RETRIEVAL_DISCIPLINE` + `DISCIPLINE_SECTION`；`tool_gating.ts` 只负责注册/释放。文本可测试、可评审，不与挂载逻辑混在一起。

### 3.5 D5 冒烟附带修复：`run_id` 改取实时回合相位（已实施）

首轮托管冒烟里六件工具都成功执行，但三路引用编号各自从 [1] 起：`run_id` 没有上送。真宿主取证表明 `session.events` 取不到 —— 随包 dsh-session 为 0.2.1-rc.2，运行时 `Session` 只暴露 `eventAt / snapshotEvents / ownEvents / seq / surface…`（同步事件读取已标弃用），而本仓 `node_modules` 里的类型停在 0.0.1-rc.5，旧实现按那份类型写。

`run_id` 改为取工具执行期可读的 `exec.agent.phase.turn`：回合内恒定、跨回合递增、无 turn 时照旧省略（引擎从 1 起）。定位与证据见 plan Task 5；本项不改变 §3.1–§3.4 的注入决策。

### 3.6 D6 呈现面：不向模型提出引用要求（已实施）

- **背景**：主树在独立 RAG 会话里用来源区承载出处；DSH 会话没有这层界面。要求模型标注编号、篇名、片序，只会留下没有落点的裸标记；反向禁令同样会把「引用」这个概念带进上下文，因此一律不写。
- **纪律**：不写任何引用或呈现规则——既不要求标注，也不要求不标注；检索路由、读取上限与拒答规则不变。
- **工具描述**：三路检索不再列举 `citation_no`。
- **宿主剥离**：引擎在每次检索的 `message` 末尾写「（引用编号 [n]，标注时照抄 citation_no）」；`callTool` 返回前用 `CITATION_NOTE` 删除该括注，其余文字（降级说明等）原样保留。测试同时锁定引擎三处注记原文，引擎改词会转红。
- **不动**：`citation_no` 字段、per-run 计数器与 `run_id` 语义保留（工具结果与核对仍可用）；输出 schema、引擎代码、运行时包、面板、数据库零改动，无需重建或重启。

## 4. 验收

1. **绑定**：有 binding 的 agent 挂载后，工具与 section 各注册一次；section 名为 `harness-rag:retrieval-discipline`、order 150、非 complete。
2. **未绑定**：不注册工具，也不注册 section。
3. **解绑**：工具与 section 的 disposer 都执行；再次绑定可重新挂载。
4. **agent 销毁**：`forgetAgent` 不手动释放（scope 已 unwind），再建同 id agent 可重新挂载。
5. **文本**：含六件 `hrag_*` 工具名、4/6 读取上限、拒答口径；不含任何引用措辞（`citation_no` / 引用编号 / 标注 / `[n]` / 片序 / 参考清单）、主树裸工具名（`hybrid_search` 等六件去掉 `hrag_` 前缀后作为独立词出现）与人格措辞。
6. **门禁**：`node --test tests/tool_gating.test.ts`、全量 `tests/*.test.ts`、`tsc -p tsconfig.json`。
7. **托管冒烟**：fake 模型驱动绑定会话依次调用六件工具，确认工具注册、`run_id` 上送、引用编号连续（与 G11 同批或随后执行）。
8. **呈现面**：纪律不含引用规则；三路检索消息剥离引用注记且降级说明保留；三路描述不含 `citation_no`；`citation_no` 字段仍在结果里。

**实测（2026-10-25）**：

| # | 项 | 结果 |
| --- | --- | --- |
| 1 | 绑定挂载 | ✅ `section: a bound agent gets the discipline section appended…`：name / order 150 / text 全等常量 / `!('complete' in section)`；六件工具同轮注册一次 |
| 2 | 未绑定 | ✅ `section: an unbound agent gets no section`（`registered` 亦为空） |
| 3 | 解绑 | ✅ `section: unbinding disposes the section with the tools`；重绑 `section: rebinding after unbind re-registers the section` |
| 4 | agent 销毁 | ✅ `section: agent disposal runs no disposer…`；`forget:` 用例证同 id 重建可再挂 |
| 5 | 文本 | ✅ `discipline text: names the six tools…` / `…no bare main-tree tool names, no persona`（负向后顾正则 + 人格词黑名单） |
| 6 | 门禁 | ✅ 定向 28/28、全量 269/269、`tsc` exit 0、`node --check client.js` |
| 7 | 托管冒烟 | ✅ 隔离宿主 + 运行时包 0.1.0-2 + 本地 fake 提供方：模型驱动六件依次执行（`chunk_id` 取自前一步结果），回合 A 引用 [1]-[6]/[7]-[8]/[9] 连续、回合 B 回到 [1]；绑定会话系统提示含纪律段，未绑定会话无纪律段且无 `hrag_*` |
| 8 | 呈现面 | ✅ `discipline text…`（无任何引用措辞）/ `hybrid…` / `graph…` / `wiki…`（消息剥离、字段保留）/ `message: only the citation note…`（降级说明保留）/ `message: the engine still emits…` / `descriptions…`；定向 31/31；neuter 去剥句 ⇒ 4 例转红 |

补充：`section: a rejected section unwinds the tools and rethrows` 覆盖 D2 的回滚分支；neuter 两轴（删注册 / 改文本）分别令 6 例、2 例转红，还原后全绿。冒烟另查出并修复 `run_id` 取源缺陷，见 §3.5。

## 5. 影响面

- `src/retrieval_discipline.ts`（新增；D6 改第 5 条）、`src/tool_gating.ts`、`tests/tool_gating.test.ts`。
- `src/tools.ts`（D5：`run_id` 取源；D6：剥离 message 引用注记、三路描述去 `citation_no`）与其用例。
- `src/index.ts` 仅改挂载处注释；inject 仍为 `['tools']`（`systemPrompt` 从 `agent.ctx` 取，不新增 host inject）。
- 不改引擎、运行时包版本、面板。
