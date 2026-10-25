# 题库标注锚定核验门禁 —— 实施计划

## 范围与交接

一对一件事 = 写入口「锚定核验」机械门禁 + 存量 q008 修锚。成对 spec 同名（`../specs/2026-10-05-rag-golden-anchor-guard-design.md`），决策点 D1–D5 见 spec §3（D5 前端已裁零控件）。**不碰** dataset schema、评测指标口径、前端组件。TDD 必做（backend/AGENTS.md）；提交按线拆（工作树有别线未提交内容）。

## 硬约束（执行期注意）／Global Constraints

- **TDD 命令**（照 `backend/Makefile` 的 RUN 变量）：`RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync`；单测 = `$(RUN) pytest tests/knowledge/eval/… -q`（basetemp 用仓外隔离目录、跑完删）；门禁 = `$(RUN) pytest -m "not live" tests/` + `$(RUN) ruff check .` + `$(RUN) ruff format --check .`；前端 = `python ../scripts/pnpm.py test` + `check`。

- 分词复用 `knowledge/sparse.py::_tokenize`，**不引 jieba**（spec §2 先例）；若 `_tokenize` 是模块私有，导出或提共享助手，**不复制第二份**。
- 两条豁免（无参考答案跳过 / 多片题只拦单片零命中）写死进判据，用例钉住。
- 拦截响应必须带机器判定明细（术语命中表 + 建议锚）。
- q008 修锚两份同步：运行库 `backend/.deer-flow/data/knowledge/8581c87b…/golden.jsonl` + git fixture `backend/tests/fixtures/rag_eval/golden.jsonl`。
- 审计脚本留 scratch 不进仓；改锚前留旧值对照。

## Task 0 — 落点核实

> 动到的文件：只读核实 + 本 plan/spec 回填

- [x] ① `question_bank.add_question(path, *, query, category, expected_paths, relevant_chunk_ids=(), relevant_entities=(), reference_answer=None)`（`question_bank.py:69`）；两调用方核实无误：`knowledge_service.py:1543`（create）/ `synthesis.py:399`（在 `accept_candidate(bank_path, staging_path, candidate_id)`，`synthesis.py:384`）⇒ guard 需给 `accept_candidate` 加透传参数。注入形状定为 **keyword-only 可选参数（默认 None=不拦）** ⇒ 直接调 `add_question` 的既有用例（`test_question_bank` / `test_ondemand` / `test_video_eval` / `test_table_eval`）零扰动。
- [x] ② `_tokenize` 在 `knowledge/sparse.py:57`（模块私有）⇒ 提共享导出、不复制第二份。二元组口径实测复核（14 有答案题 20 锚）：q008 锚 `#0002` h=5 vs 同文档最佳 B=8（差 3 ⇒ 被「B−h≥2 且锚非最佳」拦，`#0001` 是最佳片）；单片 10 锚全 h==B 零误报、多片 5 处压制全被豁免 ⇒ **1 拦 0 误杀**（注意：`#0002` 二元组口径不是零命中，「h=0」那半不触发，判据靠差值半拦住）。
- [x] ③ `KnowledgeStore.get_chunk(chunk_id) -> dict | None`（`store.py:342`）取单片正文；create 路复用既有 `get_chunks_by_ids(chunk_ids, *, kb_id=None)`（`store.py:326`，与实体派生同一次取数）。guard 的 fetch 注入形状=async callable（拿 chunk id 列表回正文）。
- [x] ④ 受害者扫描：直调 `add_question` 的用例族=`test_question_bank` / `test_ondemand` / `test_video_eval` / `test_table_eval`；accept 链=`test_synthesis.py` + API 层 `test_eval_questions_api.py` / `test_synthesis_api.py`。guard 默认关 ⇒ 预期零受害者（Task 1 门禁实测复核）。错误形状：`QuestionBankInvalidQuestion` → `knowledge_bases.py:767` `HTTPException(422, detail=str(exc))` 纯字符串 ⇒ 拦截走**独立异常类 + 结构化 detail**（`miss_terms`/`suggested_chunk`/`hits`/`best_hits`），router 加 except 分支映射 422，4xx 选型随 D1=甲′。

## Task 1 — 核验函数 + 收口挂载 TDD

> 动到的文件：`eval/anchor_check.py`（新）/ `question_bank.py` / `synthesis.py` / `knowledge_service.py` / `knowledge_bases.py`（结构化 detail）/ 前端 `eval-add-question-dialog.tsx` + `eval-save-question-dialog.tsx` + `eval-synthesis-review.tsx`（B′ 三处、逻辑一份 hook）/ 对应测试

- [x] RED：**11 用例**（`test_anchor_check.py` 6 单元 + create/accept 双口 4 + 零受害者钉 1）。红因：6 单元=`anchor_check` 未建（ImportError）；双口 4=今天贴错题直接 201（bug 路径）；零受害者钉首日即绿。
- [x] GREEN：`eval/anchor_check.py`（`check_anchor` 纯判定 + `guard_from_fetch`/`store_fetch`/`build_anchor_guard`）+ `add_question(anchor_guard, anchor_ack)` 注入 + `synthesis.accept_candidate` 透传 + service 双口传 guard（create 路一次取行喂实体派生+核验）+ router `anchor_ack` 字段 / accept 可选 body / 结构化 422。**实测受害者 2 处（皆假锚 fixture，断言不动）**：`test_get_returns_full_question_fields`（假 chunk id ⇒ 补种声明的那片）/ `test_synthesis_api` 夹具答案「综合。」与锚零词面重叠 ⇒ 被正确拦（夹具答案改接地）——「抽象短答案拦一次、点『仍要接受』」属设计内，登记 §6 观察。
- [x] neuter：①拆空答案豁免 ⇒ 1 红（受害 0）②拆 accept 收口 ⇒ 1 红（受害 0）③放宽判定阈值 ⇒ 2 红（受害 0）。
- [x] 前端交互 B′（spec §2 末细则）：共享 hook `use-anchor-confirm.ts`（keyed：dialog="form"、合成审核=candidate_id）+ 共享红块 `anchor-block-notice.tsx` + 三面接线 + i18n 三件（`eval.anchorBlock`）+ dom 三钉 7 用例（首击落红块不入库无 error toast / 原按钮重提恒无 ack / 确认钮携 `anchor_ack=true` / `missing_chunk` 无确认钮 / save 面清块钉）。前端全量 **2805 绿/0 红**、`pnpm check` 双净。
- [x] 门禁：eval 面 + knowledge API 面 41 绿 + knowledge 全面 **1583 绿/4 环境红**（预存账，零新增）+ 前端 2805 绿 + `ruff check`/`ruff format --check` 双净 + `pnpm check` 双净。

## Task 2 — 存量修复（q008 修锚）

> 动到的文件：运行库 `golden.jsonl` + `backend/tests/fixtures/rag_eval/golden.jsonl`（只动 q008 行）

- [x] 按 D3 裁定修锚（运行库 + git fixture 两份，各只动 q008 一行）：旧值 `e1b9e365…#0002`（Integer 缓存/包装类表，零「装箱」提及）→ 新值 `e1b9e365…#0001`（「什么是自动拆箱/装箱？」正文片）。审计复跑 **✓14 ⚠0 ✗0 —5**（q008 由 ✗ 翻 ✓）。
- [x] L1 口径处置：已登记——q008 改锚后其 L1 分数与 2026-10-05 前的历史运行不可比（golden 口径变了）；`eval_runs` 基线如需重标直接重跑 Layer 1（确定性零成本）刷新。

## Task 3 — 门禁 + 回填 + 登记

> 动到的文件：spec/plan 回填 + `backend/AGENTS.md`

- [x] 全量门禁：后端 `pytest -m "not live" tests/` **152 failed / 13019 passed / 109 skipped（18:57）**——红为历史环境红带（145–164 之间）内根级测试族，波及面零新增（eval 面 41 绿、knowledge 全面 1583 绿/4 预存环境红）；前端全量 2805 绿/0 红；`ruff check`+`ruff format --check`+`pnpm check` 三净。提交链（本对 8 笔，均未推）：`b02b51c45`（spec+plan 起草）→ `65cf786cc`（D1=甲′）→ `8f94f827a`（B′ 细则）→ `2ba19cb0a`（裁决记录）→ `08ccd53ea`（审查 ①–⑧）→ `fce400c94`（Task 0）→ `41bc01b95`（Task 1）→ `8959b6a3b`（Task 2）。`backend/AGENTS.md`「Retrieval quality evaluation」段已补锚定核验一行（合成出题条目之后，2026-10-05 收尾）。
- [x] 登记项落 spec §6 定稿（徽章 / 重入库重验 / rel=0 坏题 / 无答案覆盖缺口 / q009 提示级 / 新增观察项「抽象短答案拦一次」）。

## Task 4 — 真栈验收

> 动到的文件：零（真栈只读验证 + 临时题收尾）

- [x] 真栈验收（2026-10-05，测试2 / kb `5f532d37…`，网络状态 [422,422,201,201]）：误锚首击 422 落红块（`role="alert"`、按钮行正下方、无 error toast）+ 原「保存」盲重复点再 422 不入库 + 红块内「仍要入库」201 入库；改正锚首击 201 直接入库；合成 accept 过闸 201 直过（红块分支同 hook、dom 钉覆盖）；`missing_chunk` 无确认钮=代码+dom 钉覆盖、真栈未触发。收尾：3 道临时题删净（题库回原有 2 题、暂存空）、配置零改动。harness 态两条：隐藏窗口 Radix 退出动画不 unmount 留幽灵节点（非产品缺陷）；miss_terms 显示二元组原词（机器依据原样）。
