# RAGAS 评测预算修正与提速 —— 实施计划

- 成对 spec：`docs/superpowers/specs/2026-10-04-rag-eval-budget-and-speed-design.md`
- 日期：2026-10-04
- 状态：执行中（Task 5 丙 已完成；Task 0–4 + Task 6 待「开工」）

## 范围与交接

六决策：D1 `recursion_limit` 60→300（已改在工作树 `ragas_eval.py:839`、已实测，本对正式提交）/ D2 每题答题墙钟 180s（兜底，**与 D5 互为条件、同批落**）/ D3 ragas `RunConfig` 重试 10→2+超时 600→120s（兜底）/ D4 逐 LLM 调用计时日志（观测）/ **丙 judge 并行化（结构修，✅ 已完成见 Task 5）** / **D5 答题题间并发 W=4（结构修，基准 3.3× 已背书，见 Task 6）**。乙‴ 不做（spec §2.7 翻案）。修法分类：D1/丙/D5=结构修、D2/D3=兜底、D4=观测。**并发口径他拍「统一 4」**：`_JUDGE_CONCURRENCY` 8→4（已改）与 `_ANSWER_CONCURRENCY=4` 同值、全局一个旋钮。改动面全在评测链（`knowledge/eval/` + 测试）；chat/gateway 零改动。数字 180s/2/120s/4=初值跑一阵校准。

## 硬约束

- 不动 chat/gateway/channels/subagent 的 recursion 配置。
- `eval_runs` 语义不变（超时=question 级 `failure`）。
- 计时日志 debug 级、无正文无密钥。
- 门禁用 `backend/.venv/Scripts/python.exe`（见 [[env-induced-test-failures]]）；basetemp 用仓外隔离目录、跑完删。

## Task 0 — 落点核实（✅ 2026-10-04 核完）

- [x] ① `build_lead_agent_runner` run config 零漂移：diff 恰一行 60→300。⚠️ 行号漂移：现 `ragas_eval.py:875`（丙并行改动 +36 行，旧号 839 作废，spec/plan 已改引用为函数名）。
- [x] ② D2 落点钉住：`run_layer2_evaluation` 逐题循环（现 :737–745）= `try: outcomes[qid] = await agent_runner(q) / except Exception → failures[qid]`，progress 每题毕回调。最小改面=包 `asyncio.wait_for(..., 180)`（TimeoutError 落同一 except）；`_failure_result` 的 failure 串=`"{type(exc).__name__}: {exc}"` ⇒ 精确记 `failure="timeout"` 需抛 `TimeoutError("timeout")` 或特判（Task 1 拍一个）。D5 改 gather 时记账/progress 语义可直接搬。
- [x] ③ D3 落点 `ragas_eval.py:568`（旧号 543 作废）：**代码只写 `RunConfig(timeout=600)`、`max_retries` 未写**（=ragas 默认 10，源码确认：默认 timeout 180/max_retries 10/exception_types=(Exception,) 任何异常都重试）⇒ D3 的「10→2」实为「显式写 2」。⚠️ **待他重拍**：代码注释明记「ragas 默认 180s 对慢 judge（qwen-max 长 faithfulness prompt）太紧 ⇒ 故意抬 600」，spec 的 120s 低于上游默认 180 ⇒ 会复触发注释里的「太紧」；甲=120（spec 原裁）/乙=180（上游默认、比 600 紧 3.3×、2.6× 于观测最大 70s），推荐乙。max_retries 2 无冲突。
- [x] ④ D4 落点：`build_lead_agent_runner` 不显式挂 callbacks——langfuse handler 由 `make_lead_agent(config)` 内挂（`_langfuse_trace_id_from_callbacks` 读 `config["callbacks"]` 可证）⇒ 计时 handler 也是挂 config["callbacks"] 列表追加，与 langfuse 共存。`on_llm_end` 可拿：`LLMResult.generations[0][0].message.usage_metadata`（token）+ `invocation_params`/`serialized`（模型名）；耗时由 start/end 自记。
- [x] ⑤ 受害者扫描（`tests/knowledge/eval/` 全部 + `test_eval_*`）：**零受害者**——无用例断言 recursion_limit/RunConfig/runner config 值；唯二引用 `build_lead_agent_runner` 的用例（`test_eval_persistence.py:490`、`test_ondemand.py:113`）monkeypatch 整体替换 runner 不碰内部；`test_ragas_eval_cli.py:283` 的 timeout=180 是 subprocess 墙钟无关。RED 全新增、无需给夹具补值。

## Task 1 — D1+D2 TDD：预算钉 300 + 答题墙钟（✅ 2026-10-04，提交 `202ba7465`）

- [x] RED：`TestAnswerPhaseBudget` 两例——钉 `recursion_limit == 300`（工作树已有 300 ⇒ 属「已改+反证」型，直接绿）；慢题 >墙钟 ⇒ `failure` 含 timeout 且下一题续跑（先红后绿）。
- [x] GREEN：`_ANSWER_TIMEOUT_S = 180` 常量 + 逐题 `asyncio.wait_for(agent_runner(question), 180)`，超时抛 `TimeoutError("timeout")` ⇒ failure 串「TimeoutError: timeout」（Task 0-② 的拍点：抛 TimeoutError 方案）。
- [x] neuter：①还原 60 ⇒ 恰红钉 300 那条；②拆墙钟 ⇒ 恰红超时续跑那条；受害者不相交，还原复绿。
- [x] 门禁：knowledge/eval 面 336 例全绿 + ruff 双净。

## Task 2 — D3+D4 TDD：RunConfig 收紧 + 计时日志（✅ 2026-10-04）

- [x] RED：`TestRunConfigAndTiming` 三例——工厂钉 `max_retries == 2`/`timeout == 180` / runner config 挂计时 handler / handler 逐调用打 debug 行（模型名+dur+usage）⇒ 现状 3 红（工厂与 handler 都不存在）。
- [x] GREEN：`_ragas_run_config()` 工厂（`RunConfig(max_retries=2, timeout=180)`，常量 `_RAGAS_MAX_RETRIES`/`_RAGAS_TIMEOUT_S`）+ `EvalCallTimingHandler`（`on_llm_start/end` 记耗时、`usage_metadata` 记 token、**不记正文**）挂 `build_lead_agent_runner` config["callbacks"]（langfuse 由 `make_lead_agent` 追加同一列表）。
- [x] neuter：①工厂还原 `timeout=600` ⇒ 恰红钉值那条；②摘挂载 ⇒ 恰红挂载那条；受害者不相交，还原复绿。
- [x] 门禁：knowledge/eval 面 343 例全绿 + ruff 双净。

## Task 3 — 门禁 + 文档（✅ 2026-10-04）

- [x] 全量门禁：`tests/knowledge/` **1506 绿 / 4 红 / 2 跳**（4 红全为已知环境条件、与本线零交集：`test_embed_missing_api_key`+`test_rerank_missing_api_key`=本机真 key 在场使缺 key 负向断言失效、`test_parser` 两条=真 MinerU token 覆盖假 token + DNS 网络态；照既有账登记、不修）；ruff check（backend 全量）双净。
- [x] 文档：`backend/AGENTS.md` Layer 2 评测段补「Budgets, concurrency & timing」段（recursion 300=super-step 单位 ≈20 轮刻度 + 每题墙钟 180s + 答题/judge 并发统一 4 + `RunConfig(2, 180)` + `EvalCallTimingHandler` 逐调用计时，四旋钮标「初值待校准」）。
- [x] spec/plan 回填提交链：Task 0=`bb975b45e` → Task 1=`202ba7465` → Task 6=`e08fc415e`（实测回填 `e4932c7dd`）→ Task 2=`4d3fae94f` → Task 3=本笔。

## Task 4 — 真评测复测 + 收尾（✅ 2026-10-04，全程 `run_task4_full.log`）

- [x] 测试1 全 17 题 L1+L2 复测（mimo，六决策全套生效）：**A1 = 17/17 出分、零 `GraphRecursionError`、零超时**；**A5 = debug 计时行 51 条可见**（其中暴露 `model=?` 瑕疵——模型名要从 `serialized.kwargs` 在 `on_llm_start` 取，已修并补真实形状用例）；**A7 = 答题段 184.5s**（对串行基线 576s = **3.1×**，进度刻度 3 题一批同刻落下=并发实证）；L1 59.7s / hit 0.47 recall 0.33（与基线同档）。
- [x] 时间账：全程 1134s vs 基线 985s——答题省 390s、评分段 872s（**端点又慢：单次 p50 7.1s vs 基线 3.0s（2.4×）× judge cap 8→4**；结构收益被端点漂移淹没，与「答题段那次赶上快端点」互为镜像）；⚠️ 口径注：scratch CALL 记录器本跑漏记答题窗（只 patch 四个调用口），产品级 D4 全量抓到 51 次答题调用 ⇒ 分段归因以墙钟+D4 为准。
- [x] 收尾：scratch 脚本留 `ragas-perf/` 不进仓；本对提交链=`bb975b45e`→`202ba7465`→`e08fc415e`→`e4932c7dd`→`4d3fae94f`→`c037da09d`→复测/D4 修=本笔；其他线未提交内容零入提交。

## Task 5 — 丙（结构修）：citation judge 并行化（✅ 2026-10-04 先行完成）

他拍「跑并行改造验证耗时」→「补 TDD 落成结构修，同时更新 spec+plan」，故先于 Task 0–4 执行。

- [x] GREEN：`citation_precision_recall` 题内 `asyncio.gather` 并发（按入参序收割）+ `run_layer2_evaluation` 题间全任务共享 `Semaphore(_JUDGE_CONCURRENCY=8)` 按题序收割（`ragas_eval.py`）。
- [x] RED/TDD：`test_ragas_eval.py::TestJudgeParallelism` 四例（题内 3 并发 / semaphore=2 截流 / 题间 12 任务共享上限恰 8 / 并行下 `unsupported` 序不变），绿基线 54 例全绿。
- [x] neuter：①题内改串行 ⇒ 3 红（顺序例不红=正确）；②信号量失效 ⇒ 2 红（恰限流两例）；受害者不相交，还原复绿。
- [x] 门禁：`tests/knowledge/eval/` 334 例全绿 + ruff check/format 双净。
- [x] 实测（17 题 mimo，scratch `ragas-perf/run_parallel_judge.log`）：judge 尾巴 57.2s vs 工作量 462.9s = **8.1×**（打满 8）；评分段 564→**281s（2.0×）**；总 1078→985s（答题段赶上端点慢 455→576s 吃掉差额）；17/17 出分零失败。
- [x] spec 回填：§1.1-6 实测证据 + §2.5 丙=结构修 + D3 改标兜底 + 验收 A6 + 非目标换「指标削减待拍」。
- [x] 追记（2026-10-04）：他拍「统一 4」⇒ `_JUDGE_CONCURRENCY` 8→4（与 D5 同值，用例钉符号值零改动、334 例仍绿）；§1.1-6 的 8.1× 为 8 路时代数字，4 路预期尾巴 ~110s/17 题。

## Task 6 — D5（结构修）：L2 答题题间并发 W=4（✅ 2026-10-04 TDD 完，提交 `e08fc415e`；实测跑数中）

他拍「按甲落地」（并入同一对、不另起）+「统一 4」；基准已背书（spec §1.1-7）。与 Task 1 的 D2 同一循环区域、同批执行完毕。

- [x] RED：`TestAnswerConcurrency` 四例——题间并发（3 题 peak==3）/ 截流（monkeypatch 2、4 题 peak==2）/ 题序+progress 计数不变（守卫例，全程绿）/ 超时不拖累（q1 超时仍与其他题重叠、q2/q3 正常）⇒ 现状串行 3 红 1 绿（其中「题序」例初版期望漏算了 ragas 段入口事件、已修）。
- [x] GREEN：`run_layer2_evaluation` 答题段全任务一次启动、共享 `Semaphore(_ANSWER_CONCURRENCY=4)`（与 `_JUDGE_CONCURRENCY` 同值），按题序收割进 `outcomes`/`failures`，progress 逐字同串行时代。
- [x] neuter：⑤答题改串行 ⇒ 并发/截流/超时组 3 红（序例不红=正确）；⑥信号量失效 ⇒ 恰红截流 1 条；受害者面如实交叉在截流例（它同时测两件事），还原复绿。
- [x] 门禁：knowledge/eval 面 340 例全绿 + ruff 双净。
- [x] 实测（2026-10-04，`repro_full.py` 4 题真实 `run_layer2_evaluation`，scratch `run_d5_verify.log`）：答题段 34.9s（4 题四个 progress 刻度**同一时刻落下**=真重叠；对照基准串行 146.4s）；全程 124.6s、L2 99.7s、评分段 64.8s（20 job）、4/4 出分零失败零超时。⚠️ 归因边界：本跑端点 p50 2.7s vs 基准跑 14.8–17.5s（快 5 倍）⇒ 34.9s 里并发与端点快慢混杂，「重叠真实发生」由刻度同刻钉死、精确倍数以 Task 4 的 17 题同场对照为准。
