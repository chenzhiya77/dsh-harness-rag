# 交付层(⑩):"它说产出了,到底交出来了没" — 设计文档

- 日期:2026-09-12
- 分支:沿用 `feat/rag-knowledge-base`
- 上游:构成快照 spec `2026-09-10-harness-constitution-snapshot-design.md` **§12 第 3 项**;前端构成视图 spec `2026-09-12-harness-constitution-frontend-design.md`(同线,已交付)
- 相邻:`backend/AGENTS.md` 的 "Run delivery receipts" 与 "Run event stream changes must keep … in sync" 两节

## 1. 目标与范围

**一句话**:把已经存在、但今天**没有任何前端消费者**的终端交付回执 `run.delivery` 渲染出来,回答"agent 说它产出了东西,到底有没有交到我手里"。

**用户裁定(2026-09-12,用户批 "A+C")**:落在**既有的 workspace-change 文件卡上,加一行**,成功时**安静**、不一致/未交出时**同一行变醒目**。理由是这一项的全部价值在 §6.8 那句话——"它说产出了却没给我"——而一个顺利交出的 run,文件卡已经讲完了故事;再加一张卡只是噪声。

**本期做**:①补 `run.delivery` 的声明(用户 2026-09-12 明确选择"先补声明再建 UI",见 §3);②前端读回执、在文件卡上加那一行;③三种判定状态的文案与色调。

**本期不做**:环上的表示(§7 裁决不入环)、点击展开"哪些产出了没交出"的清单(§10 开放项)、任何判定逻辑的改动。

## 2. 已核实的前提(2026-09-12 代码核查,带行号)

### 2.1 回执有两个形状,只有一种值得渲染

- **基础形状** `{presented, paths, by_tool}`(`journal.py:898-910`)。它是"事实记录,不是判定"——正文自己写着 "This is a fact record, not a verdict: runs that produced no artifacts emit `presented: 0`"。
- **详细形状**:`worker.py:177-199` 的 `_delivery_content_with_outputs` **只在本次 run 确实产出了 outputs 时**才附加 `verification` / `produced_paths` / `presented_paths` / `matched_paths` / `stage` / `satisfied`;`produced_paths` 为空时**原样返回基础形状**。
- ⇒ **渲染开关必须是"有没有 `satisfied`",不是"有没有回执"**。否则多数 run 会显示一行"交出 0 个"的噪声。
- **判定不是前端能重算的**:`satisfied = bool(matched_paths)`,`matched_paths` 由产出快照与 `present_files` 归属**两次独立观测**交叉核对得出(`worker.py:186` 的 `_presented_path_covers_output` 还处理目录覆盖)。前端重算必然与后端漂移,所以只读不算。

### 2.2 三种判定状态(由 `stage` 区分,语义比字面窄)

| `stage` | 条件(`worker.py:187,197`) | 含义 |
|---|---|---|
| `presented` | `satisfied=true` | **至少有一个**产出被交出覆盖。**注意:matched 可以少于 produced**——`satisfied` 只要求非空 |
| `mismatched` | `satisfied=false` 且 `presented_paths` 非空 | 交出了东西,但**没有一个**对得上这次产出 |
| `not_started` | `satisfied=false` 且 `presented_paths` 为空 | 一个都没交出 |

> **`presented` 不等于"全部交出"** ——这一条直接决定文案怎么写(§6):不能写成 "N/N",否则 matched < produced 时在说谎。

### 2.3 判定会改变 run 的终态

`worker.py:202-206` 的 `_delivery_error`:只要**产出了却没 satisfied**,该 run 以 `RunStatus.error` 收尾,`error = _DELIVERY_INCOMPLETE_ERROR`("Artifact delivery incomplete: no produced output artifact was presented")。回执落库失败(`receipt_persisted=False`)在 `success` 且确有产出时也转 `error`(`worker.py:1167-1173`,理由 `_DELIVERY_RECEIPT_FAILED_ERROR`)。

⇒ **"不一致/未交出"这一侧不是纯展示问题,它和 run 的失败态是同一件事**(§8)。

### 2.4 `run.delivery` 有生产者,却**声明里没有它**(决策 a 的由来)

| 该声明的地方 | 现状 |
|---|---|
| `contracts/run_event_stream_contract.json` | 声明 12 个 `event_type`,**无 `run.delivery`**;`outputs` 类别已被 `run.end` 占用 |
| `runtime/events/catalog.py` | 全文 grep `delivery` **零命中** |
| `backend/docs/RUN_EVENT_STREAM.md` | 无 |
| 契约的 `known_gaps`(6 条) | **也没有登记它** ⇒ 不是有意留白 |
| `deerflow/constants.py` | 只有长度常量(32/16),**无需改动**(`run.delivery` 12 字符、`outputs` 7 字符) |

生产者三处:`worker.py:136`(主路径,`put_if_absent` 每 run 一条)、`manager.py:995`(孤儿恢复时补一条零投递)、`journal.py:912` 的 `record_delivery()`(**全仓无调用点**,是给直接使用 journal 的调用方留的)。

**不构成阻塞但必须处理**:契约自己的 `compatibility.consumer_rule` 写着"消费者必须忽略未知事件类型",且 `add_event_type` 被列为加性变更、`list_events` 的过滤是朴素字符串成员判断——所以今天就能读。但**这一项卖的就是"判定可信"**,把 UI 建在一个无人钉过的 `stage`/`satisfied` 上,等于把"下次 worker 重构静默失配"埋进去。用户 2026-09-12 选择 **a:先补声明**。

### 2.5 既有内联卡的形状与锚点(落点改造的对象)

- 组件:`components/workspace/changes/workspace-change-badge.tsx`;**渲染位** `components/workspace/messages/message-list-item.tsx:63` 引入、`:230` 传入 `showWorkspaceChanges`。
- **锚点规则已定** `core/messages/workspace-change-anchor.ts`:按 run 取**最后一条 assistant 组**(`#4555` 的"每条气泡重复同一张卡"就是这条规则要防的),且候选**只收 `assistant` 组**——该不对称是承重的(卡片由 `MessageListItem` 渲染,而它不被 `assistant:processing` 组调用),文件头注释明写"do not unify the two helpers"。
- **卡片内容**:`rounded-xl` 边框 + 40px 图标 + 标题 `editedTitle(count)`("已编辑 N 个文件")+ "查看更改"(开 `Sheet`)+ 右上 `+N -M` + **逐文件 +N -M**;由 `data.available && count > 0` 把关(任一不满足返回 `null`)。
- **它覆盖 `workspace` 与 `outputs` 两个前缀**(`formatWorkspacePath` 把 `/mnt/user-data/outputs/` 映成 `outputs/`),所以"产出的文件"本来就在这张卡的列表里——这正是"加一行"比"另开一张卡"更合理的原因:清单已在下方,判定只需一行。

### 2.6 三个 store 的 content 往返:前端拿到的是对象,不是字符串

`db.py:78-84` 的 `_content_to_db` 把 dict content 序列化并打 `metadata.content_is_json=true`;`db.py:55-64` 读时**还原成结构化对象**。JSONL 原样存 JSON、memory 原样留 dict。另外 `_truncate_trace` **只作用于 `trace` 类别**,`run.delivery` 是 `outputs` ⇒ 不截断。

⇒ 前端按对象解析即可,**不需要**防御"content 是 JSON 字符串"。(`run.end` 那个 `run-end-backend-serialization` 的已知缺口不适用于本事件。)

### 2.7 前端既有可复用的东西

- `core/workspace-changes/{types,api,hooks}.ts`:`useWorkspaceChanges({threadId, runId, includeFiles, includeDiff, enabled})`、`workspaceChangesQueryKey`。**但它的端点是 `/runs/{rid}/workspace-changes`**(一个专门的聚合路由),不是 events 端点。
- 回执要走 **events 端点 + `?event_types=run.delivery`**(⚠️ 定语:声明补齐后它才是一个"合法被依赖"的类型,见 §3)。
- 文案命名空间:本线已有 `constitution.*` 一块;本项另起 `delivery.*`。

## 3. 第 0 步:补声明(用户裁 a)

**四处 + 一处测试**,全部是加性变更(`add_event_type`),不触碰任何既有形状:

1. **`runtime/events/catalog.py`**:新增 `RUN_DELIVERY_EVENT = RunEventDefinition("run.delivery", "outputs")`,放在 `WORKSPACE_CHANGES_EVENT` 旁,并**自成一家** `DELIVERY_RUN_EVENT_DEFINITIONS` 后并入 `FIXED_RUN_EVENT_DEFINITIONS`——**不能进 `JOURNAL_RUN_EVENT_DEFINITIONS`**:那条列表的测试断言它**恰好等于 journal 自己观察到的事件**,而 `record_delivery()` 无调用点,进去必红。**类别必须沿用 `outputs`** ——运行时三处已经写死了它,而 `change_event_category` 是契约明列的**破坏性变更**。
2. **`contracts/run_event_stream_contract.json`** 的 `events[]`:新增条目,`event_type`/`category`/`producer`/`content_schema`/`metadata_schema`。content 按**对象**声明(`run.start` 是对象 content 的先例):`required: ["presented"]`,`produced_paths`/`presented_paths`/`matched_paths`/`stage`/`satisfied`/`verification` 全部 optional(基础形状没有它们),并写清"仅当该 run 产出过 outputs 才有判定字段"。`producer` 写 `runtime.runs.worker._persist_delivery_receipt`。
3. **`contracts/…json` 的 `categories.outputs` 描述**:现文是 `"Root graph completion output; not an authoritative run lifecycle status."`——那是**只按 `run.end` 写的**。补一句让它同时覆盖投递回执(否则类别描述与成员不符)。
4. **`backend/docs/RUN_EVENT_STREAM.md`**:补 `run.delivery` 一行 + 两个形状的字段说明,并点明"判定只在产出过 outputs 时出现"。
5. **`tests/test_run_event_stream_contract.py`**:加 ①两个形状各一条真事件过 `content_schema`(基础形状必须**也**通过——它是多数 run 的真实形状);②`stage` 三个取值被显式钉住(它今天靠代码里的三元表达式决定,`worker.py:197` 一改就静默少一档)。

**完成判据**:`test_contract_and_runtime_catalog_have_the_same_fixed_events` 绿(catalog 与契约同时更新,只改一边必红——这条既有测试就是这一步的安全网);`test_run_journal_observed_events_exactly_match_its_catalog` 保持绿(journal 的 catalog 断言不被 `run.delivery` 影响,因为 `record_delivery()` 无调用点;若这条因新增常量而红,说明我把常量放错了清单,应把它从 journal 的固定事件集里排除而不是改测试)。

## 4. 落点裁决:A+C(用户已批)

**形态**:在 `WorkspaceChangeBadge` 的头部区(标题行与"查看更改"所在那块)之下、文件列表之上,插**一行**。

| 判定 | 表现 |
|---|---|
| `presented`(satisfied) | **安静**:`text-muted-foreground` + 对勾图标 + 文案 |
| `mismatched` | **醒目**:警示色调 + 警示图标 + 文案 |
| `not_started` | **醒目**:同上 |

四条硬约束:

1. **不改锚点、不加卡**:复用 `getWorkspaceChangeAnchorGroupIndices` 与 `MessageListItem` 的现成渲染位。`frontend/AGENTS.md` 的 "Any future run-scoped display belongs in the same place — do not hang one off every message" 由此天然满足。
2. **不因判定而放宽卡的可见性门槛**:卡片仍由 `available && count > 0` 把关。**为什么这条是安全的(读码得出,不是假设)**:产出判定与文件变更事件**共用同一个比较基准**——`_produced_output_paths`(`worker.py:227-242`)与 `record_workspace_changes`(`worker.py:1130`)都拿同一个 `pre_run_workspace_snapshot`,都用同一套排除目录(`extra_excluded_dir_names`,两侧同源),前者取 `get_changed_output_paths`(只 outputs),后者取全部变化。所以"`produced_paths` 非空 ⇒ outputs 确实变了 ⇒ 文件变更事件记到了变化 ⇒ `count > 0`"。**两条腿的验收要各自确认一次**,而不是只在实现里相信它。
3. **正文之外只读回执**:产出/交出/匹配三个数直接来自回执字段,**不在前端做任何集合运算**(§2.1)。
4. **不新增可点区域**:v1 这一行是纯文本。展开"哪些产出了没交出"是 §10 的开放项。

## 5. 数据层

新建 `frontend/src/core/delivery/`:

- `types.ts`:`DeliveryReceipt` 镜像契约(基础字段必选、判定字段可选),**不含**任何推导。
- `parse.ts`:`parseDeliveryReceipt(rows)`——用与 `core/constitution/parse.ts` 同一套手法(逐字段重建、未知字段丢弃);**判定字段要么齐要么全无**,半套(`stage` 有而 `satisfied` 无)按"无判定"处理并记 `null`,避免渲染出一个悬空的判定。
- `api.ts`:`fetchDelivery(threadId, runId)` → `GET /api/threads/{tid}/runs/{rid}/events?event_types=run.delivery&limit=5`。**照抄 `core/constitution/api.ts` 的有界重问**(≤6 次 / 400ms):回执是 run 结束时写的,而按 run id 立即问同样会撞上"还没落库"的窗口——那处的实测数字(0.17–2.2s)与本项同源。
- `hooks.ts`:`useDelivery(threadId, runId)` —— 与 `useWorkspaceChanges` **同 key 维度**(`(threadId, runId)`)、`staleTime: Infinity`(终局事实,run 内不变)、同线程 `placeholderData`。

**消费点**:`WorkspaceChangeBadge` 内调用 `useDelivery(threadId, runId)`,与它已有的 `useWorkspaceChanges` 并列。**不新开数据通道、不动 `message-list-item.tsx` 的传参**。

## 6. 文案(2026-09-12 用户批"文案都批",与 §13 同级冻结)

命名空间 `delivery.*`,落 `zh-CN.ts` / `en-US.ts` / `types.ts` 三文件(与前一项同一套落盘口径),并按前一项的做法纳入 **checked-in 清单 + 三处 guard** 的对账范围。

| key | zh-CN | en-US |
|---|---|---|
| `delivery.presented` | `已交出 {matched}/{produced} 个产物` | `Handed over {matched} of {produced} artifacts` |
| `delivery.mismatched` | `交出了 {presented} 个，但都不是这次产出的` | `Handed over {presented}, none of which this run produced` |
| `delivery.not_started` | `产出了 {produced} 个，一个都没交出` | `Produced {produced} artifacts but handed over none` |

> **2026-09-12 标识符更正(用户批文案后、写 plan 时发现)**:第三条的键原写 `delivery.notStarted`,现改为 **`delivery.not_started`** —— **文案一字未改**,只让键**逐字对齐契约的 `stage` 枚举**(§3 刚钉死的那三个值)。理由:snake/camel 的对应关系会变成一张手写映射表,而那正是上一条线里 `guard`→`gate` 那处**用词错位**的同一种病(前端 spec §6.2 的修正框记的就是它);改成同名之后,`delivery.*` 的键集与契约枚举**集合相等**,guard 零映射,那处病在源头被消灭。

**两条措辞理由(要写进 spec 而不是留在实现里)**:

- 第一条**不写 "N/N"**:`satisfied` 只要求 matched 非空,所以 `1/3` 是**成功态**。写死 "全部" 会在 matching 部分成功时说谎(§2.2)。
- 第二条不写"没对上"而写"**都不是这次产出的**":`mismatched` 的定义是"交出了东西但没有一个覆盖本次产出",两者差别在于**交出的可能是旧文件**。原样说清楚才让用户知道该怀疑什么。

## 7. 环上表示:**不入环**(裁决)

§12 第 3 项原文写"按 §6.6.1 它渲染在 `epilogue` 出口弧内",而 §12.1(2026-09-11)已裁 **⑩ 留内联**。两句现在的正确读法是:

- **概念上**它属 `epilogue`(链的收尾),并且**不进 `stages[].members` 计数**——因为它的 producer 是 worker,不是 middleware。构成快照的 `Σ(members+gates+handoff_gates) == len(middlewares)` 关系不变量由 §10 的测试钉着,本项**不动那条式子的任何一项**。
- **显示上**它留在内联的交付卡里,**不在环上新增任何元素**。理由:环回答"harness 怎么装的",而这一行回答"东西交了没",后者只有在"不一致"时才需要被看见——那正是内联卡的位置,而不是一个需要用户主动打开的 Dialog。

⇒ 本项**对构成视图零改动**,`constitution-*` 一行不动。

## 8. 与失败呈现的边界(§12 第 4/5 项)

这是本项与相邻两项**共用的一片地**,必须一次说清,否则就是把构成视图上刚修好的"同一件事分裂在两处"种回去:

- **不重复呈现 run 的终态**。判定为 `mismatched`/`not_started` 时该 run **就是这个 run 的终态问题**(§2.3),而"run 怎么结束的"归 §12 第 4 项(⑤ 状态机外框)。本行**只陈述投递事实**(产出几个/交出几个),**不渲染 run 的状态徽标、不说"运行失败"**。
- **但错误消息必须能被找到**。后端在 `error` 字段里放了 `_DELIVERY_INCOMPLETE_ERROR`;第 4/5 项落地时,那条消息与这一行**必须能互相对上**(同一位置、同一套视觉语言)。**本项把这一行做成"失败时的醒目态",就是给第 4/5 项预留的锚点。**
- **顺序建议**:本项先落成功态 + 醒目态(纯前端 + 补声明),第 4/5 项落地时回头确认两者的视觉语言一致。**不把三项合并实施**——第 5 项还缺一个前置核实(spec 里记着),合并会让本项被它阻塞。
- **一处必须留白的**:`mismatched`/`not_started` 时**不要**在行内复述后端那句英文错误原文。错误原文是给开发者档/接口用的,面向用户的话由本项的文案给出(§6)。

## 9. 测试

**后端(TDD,`backend/AGENTS.md` 强制)**

- `tests/test_run_event_stream_contract.py`(增量):§3 第 5 条的三个断言。
- 复跑既有 `test_contract_and_runtime_catalog_have_the_same_fixed_events` / `test_record_envelope_accepts_every_json_content_type` / `test_dynamic_middleware_event_matches_pattern_contract`,确认 catalog 的改动没波及动态模式。
- 窄集合门禁(本机全量有环境红):契约测试 + `test_run_event_store*` + `test_run_events_endpoint` + `test_run_worker_delivery` + harness 边界。

**前端**

- `core/delivery/parse.test.ts`:`parseDeliveryReceipt` —— 基础形状(无判定)→ 判定为 `null`;详细形状三个 `stage` 各一条;半套判定字段 → 按无判定处理;未知字段丢弃而不抛。
- `core/delivery/api.test.ts`(照 `core/constitution/api.test.ts` 的 `rs.mock("@/core/api/fetcher")` 手法):已存在回执 → 一次问成;**尚未落库 → 有界重问**;真的没有 → 达到上限后放弃;500 → 抛。
- `workspace-change-badge.dom.test.tsx`(新增或增量):`satisfied` → **安静**行(断言色调类与图标)且文案逐字等于冻结值;`mismatched`/`not_started` → **醒目**行;`available=false` 或 `count=0` → 卡片整体仍为 `null`(门槛未被放宽);回执缺失 → 卡片照常渲染、**只是没有那一行**(不能因为回执没到就把文件卡也吞掉)。
- **revert 证明**:把 `parseDeliveryReceipt` 的判定字段判空逻辑改成"总是返回判定"→ 对应断言红;把安静/醒目两档色调对调 → 对应断言红。

**手工验收(真栈,沿用同一条纪律)**:私有 `:8099` + `DEER_FLOW_AUTH_DISABLED=1`,前端只设 `DEER_FLOW_INTERNAL_GATEWAY_BASE_URL`(设了 `NEXT_PUBLIC_*` 会把 `/api/*` 打成 404);真浏览器用 `chromium.launch({ channel: "chrome" })` 驱动系统 Chrome。两条腿:①让 agent 产出一个 outputs 文件并用 `present_files` 交出来 → **安静行**且文案逐字一致;②让它产出但**不交** → **醒目行**,且该 run 在后端以 `error` 收尾、`error` 字段含 `_DELIVERY_INCOMPLETE_ERROR`(即"界面说的和后端说的对得上")。

## 10. 风险与开放项

1. **卡的可见性与判定的可见性可能分叉(最高优先)。** 本项默认"产出 outputs ⇒ 文件卡可见"(§4 约束 2)。若实测出现"有判定但卡片为 `null`",那是下游口径分叉的**信号**——处置是先查 `workspace_changes` 的扫描排除项(`EXCLUDED_DIR_NAMES` / `tool_output.storage_subdir`)与投递判定的产出口径是否一致,而**不是在卡外另挂一个位置**。
2. **`presented` 的部分成功会被读成失败。** `已交出 1/3` 在成功态下也照样显示 1/3。这是**如实报数**的代价;若用户觉得误导,备选是把成功态收成"已交出"二字、把比例留给 tooltip——但那会削弱"到底交了几个"这个唯一的信息量。**先按如实显示落地,实战再看。**
3. **开放项:点击展开"哪些产出了没交出"。** 需要两列对照(produced 减 matched),而文件清单一已经列了全部变化文件。是否值得再做一个对照视图,等这一行上线后按真实使用判断。
4. **开放项:`verification.source` / `requirement` 两个字段本期不渲染。** 它们是机制说明(`outputs_changed` / `present_files_matches_produced_output`),面向开发者档;若日后要进构成视图的开发者档,应走 `constitution` 那条通道而不是这一行。
5. **`known_gaps` 未登记本事件** ⇒ 补声明时**不改 `known_gaps`**(它不是缺口,是漏登记)。

## 11. 非目标

- **不新增** event_type / category / 端点 / 表 / 迁移 / 依赖(补的是**已有**事件的声明,不是新事件)。
- **不改**投递判定逻辑、不改 `matched_paths` 的算法、不改 run 的终态语义。
- **不改**构成视图的任何文件(`constitution-*` 一行不动),不动 `stages[]` / 环几何。
- **不改** `workspace-change-anchor.ts` 与 `MessageListItem` 的传参形状。
- **不做** 多语言之外的文案扩展(§6 的 3 条就是这一期全部新文案)。
