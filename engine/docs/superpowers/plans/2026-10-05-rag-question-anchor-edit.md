# 题库锚定可视、改锚与悬空标记 —— 实施计划

## 范围与交接

一对一件事 = ①锚定可见（抽屉逐片 ChunkCard 预览，只读态只显已锚片）②悬空标记（读时派生 `missing_chunk_ids`，行级+抽屉两面）③抽屉内改锚过同一道锚定核验（选片器=按文档折叠分组+组内分页，B′ 交互复用）。成对 spec 同名（`../specs/2026-10-05-rag-question-anchor-edit-design.md`），决策点 D1–D4 见 spec §3（已裁 D1–D3=甲、**D4=甲′ 跟锚收缩**〔审查改判：旧实体 ∩ 新锚词汇表、只删不增〕，D3 加折叠分组与分页细则）。**不碰**：`golden.jsonl` schema、评测指标口径、worker 重切片/删片路径、参考答案与题面编辑。TDD 必做（backend/AGENTS.md）；提交按线拆（工作树有别线未提交内容）。

## 硬约束（执行期注意）／Global Constraints

- **TDD 命令**（照 `backend/Makefile` 的 RUN 变量）：`RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync`；单测 = `$(RUN) pytest tests/knowledge/eval/… -q`（basetemp 用仓外隔离目录、跑完删）；门禁 = `$(RUN) pytest -m "not live" tests/` + `$(RUN) ruff check .` + `$(RUN) ruff format --check .`；前端 = `python ../scripts/pnpm.py test` + `check`。
- **检查函数不写第二份**：改锚复用 `eval/anchor_check.py` 族（`build_anchor_guard` / `guard_from_fetch`）与同一 422 结构化 detail 键；B′ 复用 `use-anchor-confirm.ts` + `anchor-block-notice.tsx`，**不新造第三套确认形态**（原按钮=复检键永不带 ack；确认钮=红块里变出来的那个；`missing_chunk` 无确认绕过）。
- `missing_chunk_ids` 是**响应派生字段**，不进 `golden.jsonl`；读时派生不落盘，worker 线零改动。
- 改锚只动 `relevant_chunk_ids`（+实体派生随锚，D4）；题面/分类/预期路径/参考答案不动。
- 真栈**仅测试2**（kb `5f532d371666482886453c62c4f13c1a`）；临时文档/临时题收尾删净；`rag_config.json` 零改动（触碰须逐字节还原）；探针/日志脱敏（key、token 两字段都掩）。
- 提交信息英文 conventional（backend/CONTRIBUTING.md）；只 stage 本线文件。

## Task 0 — 落点核实

> 动到的文件：只读核实 + 本 plan/spec 回填

- [x] ① `question_bank` 收口形状：`add_question`（`question_bank.py:69`）/ `delete_question`（:121）/ `_atomic_write`（:134）；`update_question` 与 `add_question` 并列新增，guard 注入形状一致（keyword-only、默认 None=不拦）。`dataset.validate_question` 空锚**合法**（`dataset.py:59` `_require_str_list` 只查类型、空表过；字段本身 required=必须在）⇒ 清空勾选=解除锚定口径成立；条目须过 `_CHUNK_ID_RE`（`<doc_id>#NNNN`），update 入参同约束。
- [x] ② 实体派生先例：`knowledge_service.create_eval_question`（`knowledge_service.py:1525`，派生在空标注分支 `synthesis.chunk_entities_union(rows)`〔`synthesis.py:118`〕；显式非空尊重原值）+ 合成候选实体=词汇表内**精选子集**（`synthesis.py:235`，幻觉过滤）⇒ update 口径（D4=甲′）：**跟锚收缩**=旧实体 ∩ 新锚 `chunk_entities_union` 词汇表、只删失去支撑的不新增；`update_question` 实体参数形状以 spec §2 ③ 为准（服务层把收缩结果显式传入）。
- [x] ③ `list_eval_questions`（`knowledge_service.py:1521` 返回 `{"questions": [...asdict], "total": n}` + `knowledge_bases.py:748`）⇒ `missing_chunk_ids` 按题加进 asdict 后的 dict（**不进 golden schema**）；批量取行：全部题锚 id 并集 → `store.get_chunks_by_ids`（`store.py:326`）一次查询（内部无 200 上限，HTTP 端点 `max_length=200` 不适用）。
- [x] ④ 受害者扫描：直调 `add_question` 用例族=`test_question_bank`/`test_ondemand`/`test_video_eval`/`test_table_eval`/`test_synthesis`/`test_anchor_check` + API 层 `test_eval_questions_api`/`test_synthesis_api`；guard 默认 None ⇒ 预期零扰动（Task 1 门禁实测复核）。前端 `EvalQuestion`（`types.ts:722`）加可选 `missing_chunk_ids?: string[]` ⇒ 既有 dom 用例零破坏；`EvalQuestionCreateInput` 不动。
- [x] ⑤ 前端复用件核实：`chunk-card.tsx:66` props——**只读=不传 `onEdit`/`onDelete`/`onReExtract`**（`:150` `hasFooterActions` 派生）；`listChunksByIds`（`api.ts:227`，缺片静默丢弃/调用方报差额）；`listDocumentChunks`（`api.ts:209` 分页）；`useAnchorConfirm`（`components/workspace/knowledge/use-anchor-confirm.ts`，keyed=**任意字符串** ⇒ 抽屉直接用 `question.id` 做 key，比"key=抽屉"更细）；`eval-question-drawer.tsx:43` `groupChunksByDoc`（稳定序号徽章保留）。CSRF 走 `core/api/fetcher` 共享 fetcher（`api.ts:7` import），PATCH 自动带。

## Task 1 — 后端：update 写入口 + 悬空派生 TDD

> 动到的文件：`eval/question_bank.py` / `app/gateway/services/knowledge_service.py` / `app/gateway/routers/knowledge_bases.py` / `tests/knowledge/eval/…` + `tests/knowledge/test_eval_questions_api.py`

- [x] RED 用例（红=今天无 update 口/无闸）：①贴错锚改锚被拦（422 结构化 detail）②`anchor_ack=true` 放行（术语级）③悬空锚提交被拦**且 ack 放不过** ④合法改锚 200、实体**跟锚收缩**（失去支撑者删、不新增——精选子集保住）⑤题面/分类/路径/参考答案原样钉死 ⑥question_id 不存在 → KeyError/404 ⑦list 响应 `missing_chunk_ids` 悬空/存活/无锚三态 ⑧清空勾选=解除锚定（落库为空数组）。**实测红 12**：API 7 红 + 单测收集红 1（`update_question` 未建，含 5 用例）；18 旧例过=零受害者。
- [x] GREEN：`question_bank.update_question`（同 `_lock` 读改写、`_atomic_write`、guard 用存库答案对新锚跑）+ `service.update_eval_question`（一次 `get_chunks_by_ids` 喂 `build_anchor_guard` + 实体收缩=旧实体∩新锚词汇表）+ router `PATCH /{kb_id}/eval/questions/{question_id}`（`EvalQuestionUpdateRequest` extra=forbid；过 `_require_kb_access`；404/422 结构化/422 字段串/500 四分支）+ `list_eval_questions` 派生 `missing_chunk_ids`（锚 id 并集一次取行）。**46 绿/0 红**。
- [x] neuter：①update 拆 guard ⇒ 贴错例+悬空例恰 2 红 ②拆实体收缩（改全覆盖）⇒ 精选被冲例恰 1 红 ③派生改恒空 ⇒ 标记例恰 1 红——各一次反证后还原复绿。
- [x] 门禁（eval 面 + knowledge API 面）：knowledge 全面 **1595 绿/4 环境红**（缺 key 对+parser 两条预存账，零新增）+ `ruff check`/`ruff format --check` 双净。

## Task 2 — 前端：抽屉可见 + 改锚面 + 行级标

> 动到的文件：`eval-question-drawer.tsx` / `eval-question-bank.tsx` / `core/knowledge/{api,hooks,types}.ts` / `locales/{types,en-US,zh-CN}.ts` / 对应 `*.dom.test.tsx`

- [x] RED（dom 钉）：①抽屉逐片 ChunkCard 渲染 + 悬空徽章 ②编辑保存被拦 ⇒ 红块变出「仍要保存」且**不落库**、原按钮盲重复点仍不落库 ③确认钮携 `anchor_ack=true` 落库 ④行级参考切片格：纯数字（无量词混排）+ 纯词「悬空」徽章仅悬空题显 ⑤问题列悬浮走项目 Tooltip（断言无原生 `title`）。（实现随写、各钉落前逐一验红——非独立红跑，如实记录）
- [x] GREEN：参考文档卡升级逐片 ChunkCard（只读态只显已锚片、**不传 `onEdit`/`onDelete`/`onReExtract`**；`listChunksByIds` 一次取数两用：预览+悬空差额）+「编辑锚定」入口 → **按文档折叠分组勾选区**（组头「已选 n/N」默认收起、含已锚片文档默认展开、组内切片行=内容摘要+勾选框、分页 50/页、勾后可整组收起）+ B′ 接线（keyed=question.id；**原「保存」请求体物理不带 `anchor_ack` 键**）+ api `updateEvalQuestion`/hooks/types 字段 + i18n（`columnRefChunks`/`sortDocsCount`/`danglingBadge`/`anchorEdit`/`anchorBlock.confirmUpdate`，`refDocsCount` 退役、`columnRefDocs` 留抽屉卡头）+ **列口径改造**（表头「参考切片」、格子纯数字=切片数、tooltip 文档名保留；合成候选卡同步纯数字）+ **排序保篇序**（比较器不动，label「文档数」）+ **警示徽章**（destructive 纯词「悬空」）+ **悬浮统一**（bank:419 + drawer 组头两处原生 `title` 换项目 Tooltip；`MetricTile title=` prop 未动）。
- [x] 门禁：前端全量 **248 文件 / 2816 绿 / 0 红**（+11 净增钉）+ `pnpm check`（eslint+tsc）双净。

## Task 3 — 门禁 + 文档回填 + 登记

> 动到的文件：spec/plan 回填 + `backend/AGENTS.md`

- [x] 全量门禁：后端 `pytest -m "not live" tests/`（basetemp 仓外 `E:\app-model\deer-flow-scratch\pytest-tmp-anchor-edit-full`、跑完删）**153 failed / 13030 passed / 109 skipped（20:49，2026-10-06）**——红全在历史环境红带（145–164）内且全为根级环境红族（provisioner/rag_config_probe/sandbox/skillscan/wechat…），波及面零新增（knowledge 全面 1595 绿/4 预存环境红、eval 面 46 绿）；前端全量 248 文件 / 2816 绿 / 0 红（Task 2 实测）；`ruff check`/`ruff format --check` 双净、`pnpm check` 双净。
- [x] `backend/AGENTS.md`「Write-path anchor verification」条目补「改锚口同闸」半句（`update_question` 同注入 guard、实体跟锚收缩、`missing_chunk_ids` 读时派生，引本对 spec）；spec/plan 状态行回填；§6 登记项定稿（改答案/自动改锚/添加框勾选区/合成暂存改锚/切片跳转五条登记，L1 悬空口径不改）。

## Task 4 — 真栈验收（仅测试2）

> 动到的文件：零（真栈验证 + 临时件收尾）

- [x] 真栈验收（2026-10-06，仅测试2 / kb `5f532d37…`）：临时文档入库（md 3 节 → 4 片，graph 实体回填）→ 召回面板存带锚题（向量通道 #1/#2 勾两片、POST 201 直过）+ 添加框造无锚题 → `DELETE /chunks/{id}` 删 `#0002` 造悬空 → **行级**（参考切片格「2 + 悬空」`bg-destructive` 纯词徽章，他行无）+ **抽屉**（`#0001` 逐片内容卡全文+实体+token 数、`#0002` destructive 徽章「悬空」行、无锚题不受影响）两面标出现。改锚四态全过：① 原样提交（草稿带缺片）→ 422 `missing_chunk` 红块 **零确认钮**、请求体物理无 `anchor_ack` 键；② 摘除悬空锚 → **200 直过**（无红块）+ 实体选择性收缩 **16→9**（恰丢 `#0002` 的 7 个、`#0001` 的 9 个全留）；③ 误锚（→`#0003` StringBuilder 片）首击 422 红块（`role="alert"`、缺失术语含「装箱/拆箱」、建议锚 `#0001（命中 0/17）」、变出「仍要保存」）→ 原「保存」盲重复点**再 422 不落库**（库里仍 `#0001`）→ 红块「仍要保存」携 `anchor_ack:true` 200 落库；④ 落库后行级切片数 2→1、悬空徽章即时消失。收尾：2 道临时题 + 临时文档删净（204×3）、题库回原有 2 题逐字未动、配置零改动。
- [x] **验收揪出的缺口当场修掉**：选片区只列存活片 ⇒ 悬空锚随草稿播种却无勾选行可摘除，悬空题死锁（`missing_chunk` 恒拦、只有清空全部一途）——RED 钉「编辑态悬空锚单列可摘除行」→ GREEN（悬空草稿行=读态警示行的可摘除版）→ 前端全量 2819 绿/0 红 + `pnpm check` 双净，提交 `d647f656f`；真栈复验四态即在修复后完成。
- [x] harness 态记录：浏览器面板隐藏（`visibilityState=hidden`）⇒ 截图/native click 不可用，全程 `evaluate_script` DOM 驱动 + fetch 钩子做 wire 级断言（网络状态证据全来自真实请求）；顶层 tab 合成点击要**验证 `aria-selected` 再走**（一次未挂上 ⇒ keep-alive 懒门控的 query disabled、v5 `isLoading=false` 落「题库为空」空态——隐藏面板不给用户看、非产品缺陷）；chunk id 带 `#` 的 URL 须百分号编码（裸 fetch 探针踩过，UI `api.ts` 本就正确）；Computer Use 探他 Chrome 时被 URL 策略停用一回合（既有登记同款）。

## Task 5（2026-10-06 追加）— 落空词面徽章（A1/A3 并入，B1=甲「存疑」/B2=乙照标）

> 范围来源：待办四连审计收编（落空=锚在、内容被换，三态表第三格）；判据/豁免/建议锚全部复用门禁件。动到的文件：`knowledge_service.py`（读时派生扩）/ `core/knowledge/{types,api}.ts` / `eval-question-bank.tsx` + `eval-question-drawer.tsx` / `locales`（`mismatchBadge`+明细键）/ 对应测试。

- [x] RED 用例（红=今天无派生判定无徽章）：①落空题（锚在、答案词面零命中/被压制）list 响应带派生判定 + `suggested_chunk` ②行级「存疑」徽章 + Tooltip 命中表与建议锚（项目 Tooltip）③好题零标 / 无参考答案不标 / 无锚不标 / 多片单片零命中才标 / 短答案 |K|<2 照标 ④抽屉疑片行内同款。**实测红**：后端 3 红（判定层 `chunk_ids` 钉 + 派生例 + 豁免/优先例；32 旧例过=零受害）+ 前端 2 红（bank 徽章/Tooltip 钉 + drawer 疑片行钉；49 过）。
- [x] GREEN：`list_eval_questions` 与 `missing_chunk_ids` **同一次取行**顺跑 `check_anchor`（`store_fetch` 一次取锚+同文档切片喂判据，豁免原样）→ 响应每题 `anchor_mismatch`（detail 五键 + 疑片 `chunk_ids`，不落盘）；`AnchorVerdict.chunk_ids` 判定层给出疑片集（**不进 detail wire 契约**）；前端行级第二徽章（纯词「存疑」、amber 档=可确认待人看）+ Tooltip 机器依据（内嵌 `AnchorBlockNotice` 只读形态=红块同款文案）+ 抽屉疑片行（徽章随折叠触发行）；i18n `mismatchBadge`。**35 绿**（后端两文件）/ **51 绿**（前端两文件）。
- [x] neuter：①拆豁免（无答案时以 query 代答案跑判定）⇒ 豁免/优先例恰 1 红 ②派生改恒 ok ⇒ 两徽章例恰 2 红——各一次反证后还原复绿 **35/35**。
- [x] 门禁：后端 knowledge 面 **1594 绿 / 2 skip / 6 红 3 error 全定性**（4 条=在案环境红带内：缺 key 对＋parser 两条；5 条=与前端全量并跑的负载 flake〔graph indexer 并发两条 + 3 error〕，串行复跑 **17/17 全绿**；零新增）+ `ruff check`/`ruff format --check` 我方四文件双净（`test_nginx_knowledge_uploads.py` 格式债=别线未跟踪新文件，不动）+ 前端全量 **248 文件 / 2824 绿 / 0 红**（净 +4 钉）+ `pnpm check` 双净（首跑 1 条 eslint prefer-optional-chain 当场修）。
- [x] 真栈（2026-10-06，仅测试2 / kb `5f532d37…`）：临时文档入库（md 两节 → 3 片）→ 落空题（锚贴 `#0002` StringBuilder 片=不含答案词面，`anchor_ack` 入库）→ **wire**：`anchor_mismatch` = `zero_hit`、命中 0/18、建议锚 `#0001`、疑片 `[#0002]`、缺失术语含「装箱/拆箱」；库内原有两题 `concern: null`（好题零标）→ **行级**：只落空题带「存疑」→ **Tooltip**：红块同款机器依据（缺失术语 + 建议锚 #0001（命中 0/18））→ **抽屉**：`#0002` 触发行带「存疑」（收起态可见）→ **改锚改对**（`#0001` 勾、`#0002` 摘）首击直过（无红块）→ 徽章两面归零（wire `concern: null` + 行级无徽章）。收尾：临时题 + 临时文档删净（204×2）、题库回原有 2 题、文档回原 10 篇、配置零改动。

## Task 6（2026-10-06 追加）— 参考文档片级折叠（C1=甲）

> 范围来源：真栈截图暴露——单片长文撑爆抽屉（参考答案/实体/动作栏被顶出视口）。动到的文件：`eval-question-drawer.tsx` / 对应 `*.dom.test.tsx` / spec §2⑤+§3 C1（后端零改动，不碰共享 `ChunkCard`）。

- [x] RED（dom 钉，红=今天正文全量渲染、无触发行）：①默认收起显 `chunkPreview` 摘要行、长正文段不渲染 ②触发行 `aria-expanded` false→true→false 往返，展开落整卡（正文可见、仍无编辑动作）、收起正文让位回摘要 ③悬空行无触发行不折；既有「逐片 ChunkCard」钉同步改造（先展开再断言全文）。
- [x] GREEN：`#序号` 徽章行升级折叠触发行（ChevronDown `rotate-180` + `aria-expanded`，勾选区组头同款）——收起态行下显 `chunkPreview` 两行摘要（与编辑勾选区逐字同口径）、**默认全收起**、展开才落整张 ChunkCard；折叠集按 chunk id 存抽屉本地 state；悬空行/编辑勾选区/共享 ChunkCard 零改动。**13 绿/0 红**。
- [x] 门禁：前端全量 **248 文件 / 2820 绿 / 0 红**（净 +1 钉：折叠往返钉；既有逐片钉改造为先展开再断言）+ `pnpm check`（eslint+tsc）双净。
- [x] 真栈一眼（2026-10-06，并入 Task 5 验收）：长文片抽屉**默认收起**（摘要行在、全文不在）→ 点触发行展开落整卡（正文 + token 页脚）→ 再点收起复位。
