# RAGAS 评测预算修正与提速 —— 设计

- 日期：2026-10-04
- 状态：**已完工（✅ 2026-10-04 全对收官）**——Task 0–6 全交付、31 勾 0 空框、验收 A1–A7 全过（A1=17/17 零撞墙、A5=计时行、A7=答题 3.1×）、neuter ①–⑥ 全反证；提交链 `bb975b45e`→`202ba7465`→`e08fc415e`→`e4932c7dd`→`4d3fae94f`→`c037da09d`→`c1c0880ec`（未推送）。裁决史：D1=300 他拍+实测；丙=结构修 他拍拉回+实测；D5=他拍「按甲并入」+基准；**并发「统一 4」**（judge 8→4 与答题 W=4 同值）；D3 timeout 重拍乙=180；乙‴ 翻案不做。常驻注脚：指标 4→2 待拍（非目标）、四旋钮初值待校准。
- 成对计划：`docs/superpowers/plans/2026-10-04-rag-eval-budget-and-speed.md`
- 修订（2026-10-04 二轮）：他纠「D3 是兜底、不是修问题，ragas 为什么这么慢」⇒ 评分段慢的**结构修=丙（judge 并行化）**，D3（RunConfig 收紧）改标**兜底**；丙从「二期不做」拉回本对并已实测（见 §2.5）。
- 修订（2026-10-04 三轮）：L2 答题题间并发基准（4 题两遍 3.3×）出来后，他裁「按甲落地」⇒ D5 并入**同一对**（同落点 `run_layer2_evaluation`、与 D2 互为条件），不另起新对。

## 1. 问题

他报「RAGAS 评测两三个问题要一两个小时」，且答题随机失控。排查后是**两个独立问题**，本对一起收：

| 问题 | 机制 | 代价 |
|---|---|---|
| **A. 随机失控丢答案** | `recursion_limit=60` 的单位是 super-step（图节点执行数），而 lead 图每轮「模型→工具」实际烧 **13–15 步**（每个中间件钩子是独立图节点）⇒ 60 只够 **4 条 AI 消息**，需要第 5 轮的题 100% 撞 `GraphRecursionError` | 该题答案作废 + 白烧 4 轮调用（30–60s/题） |
| **B. 评分段慢** | **结构因**：citation judge 逐（论断×引用号）**两层串行**（题间×题内），17 题尾巴累计 ~463s 调用工作量排队成墙钟（结构修=丙）；**放大器（兜底=治标）**：ragas `RunConfig` 重试 10 次×600s 超时的最坏放大 × 端点慢时段（p50 2.7→10.2s 现场抓到） | 全程的 50–79%（3 题 804s/1019s） |

### 1.1 机制证据（2026-10-03/04 实测，scratch `E:\app-model\deer-flow-scratch\ragas-perf\`）

1. **铁律（96 跑 5 失控样本）**：凡需要第 5 条 AI 消息的运行 100% 死于 `GraphRecursionError`（v1 4 例全「after 4 turns」+ v2 1 例）；4 条以内的 91 跑全部正常收尾。随机性只在「模型会不会重试到第 5 轮」（空检索结果→换措辞重查是主诱因）。
2. **步数计费实证**：v2 updates 流逐节点计数——每轮 = 3×`before_model` + `model` + 8×`after_model` + `tools` ≈ 13–15 步；失控样本精确烧到 60 步即断（4 AI×15=60 整除）。死前「静默空转」是钩子节点不产消息的假象，实际都是真实模型调用。
3. **300 够用实证（2026-10-04，mimo-v2.6-flash，`recursion_limit=300`，测试1 全 17 题 L1+L2）**：**17/17 全部完成、零 `GraphRecursionError`**（60 时代同题库挂 q012/q014）；最贪题 4 次工具调用 ≈ ≤5 条 AI 消息 ≈ **≤75 步，300 用了 ~25%、余量 4 倍**；q008/q_5995e590 两题 4 次工具调用（旧预算下必死）正常出分。全程 18.3min（L1 59s + 答题 455s + 评分 564s），584 调用 p50 3.3s。
4. **误报排除**：排查中「权限门拒访库主」是探针假象（`sqlite_dir` 相对路径 + 追踪进程 cwd 在 scratch ⇒ 空库 `get_kb→None`），产品权限门正确（真库探针 `can_access: True`）；「模型 60 跳循环」表述作废——无模型重试循环、无工具死循环，`LoopDetectionMiddleware` 盲区不是本病灶。
5. **归因拆分**：300 提额治 A 不治 B（实测 18.3min 里评分段仍占 52%）；B 由 D3 治。此前「失控=慢的大头」叙事作废。
6. **丙 实测背书（2026-10-04，mimo，同 17 题，串行→8 路并行）**：judge 尾巴 **57.2s 墙钟 vs 462.9s 累计工作量 = 8.1×**（正好打满 `_JUDGE_CONCURRENCY=8`）；评分段 **564s → 281s（2.0×）**；评分段内部此消彼长：ragas 指标段 224s 不受丙影响、升为大头（80%），砍指标数量（甲/乙）是下一个待拍杠杆。总时长 1078→985s 只快 8.6%，因答题段这次赶上端点慢（455→576s）把省下的时间吃掉。
7. **D5 基准背书（2026-10-04，mimo，4 题 q001/q002/q006/q011 同进程两遍，scratch `bench_l2_concurrency.py`）**：串行墙钟 **146.4s → W=4 并发 44.8s = 3.3×**（墙钟≈最慢题 44.6s，已到该批上限）；逐题合计 146.4 vs 144.5s（工作量不减、只是重叠）；并发下端点单次 p50 反而 +18%（14.8→17.5s，压力可控、34 调用零失败）⇒ 3.3× 是偏保守下界。外推 17 题答题段 576→~150–190s、全程 ~16.4→~10min。

### 1.2 谁写的 60、影响面

- `build_lead_agent_runner` run config 里的 `60` 是本仓 RAG 评测线 2026-08-24 引入（`936b8e0bd`，scheduled RAGAS 评测）；上游 DeerFlow 无 knowledge/eval 模块。
- **chat 零影响**：chat 走 gateway `build_run_config`（默认 100、上限 `max_recursion_limit`=1000 钳制）、IM 100/GitHub 250、TUI 250，与本对改动面不相交。
- 同款「次数当步数」换算坑还有一处：`subagents/executor.py:851` 拿 `max_turns` 当 `recursion_limit`（#3875 有 `turn_capped` 兜底语义）——**登记观察、本对不动**。

## 2. 设计（六决策，修法逐项标「结构修 / 兜底」；唯一待拍=指标削减）

### 2.1 D1 = 甲：`recursion_limit` 60 → 300（结构修；✅ 他拍「跑一下评测看看 300」+ 实测背书）

- 落点：`build_lead_agent_runner` 的 run config 一行（现 `ragas_eval.py:875`，行号随并行化漂移过、以函数名为准）。
- 刻度口径写进注释：**recursion_limit 单位是 super-step，≈15 步/轮 ⇒ 300 ≈ 20 轮**，观测最贪 ≤75 步 ⇒ 4 倍余量。
- 已在工作树验证（2026-10-04 实测见 §1.1-3），随 Task 1 正式提交。
- 不动 chat/gateway/subagent 各处的值。

### 2.2 D2 = 乙′：评测答题每题墙钟 180s（兜底／保证项——封顶不是修问题）

- 落点：`run_layer2_evaluation` 的逐题循环（`ragas_eval.py`），`asyncio.wait_for(agent_runner(question), timeout=180)`。
- 超时 ⇒ 该题记 `failure="timeout"`（report-only 降级契约不变，整题不挂死、续跑下一题），不写 `eval_runs` 语义变化。
- 初值 180s（实测正常题 20–50s、失控题上限 ~60s 的 3 倍），跑一阵校准。
- **与 D5 互为条件**：答题并发后，一题失控会和同批正常题抢端点、拖慢别人 ⇒ 墙钟从「可选保证」升为「并发的前提」，两者必须同批落。

### 2.3 D3 = 甲：ragas `RunConfig` 收紧（兜底——治最坏放大，不是修慢的结构因）

> 2026-10-04 他纠：「D3 是现在应该修改的问题的反面——是兜底」。慢的结构修见 §2.5（丙）。本条保留但降格为兜底：防的是重试 10×600s 的最坏尾部，不是串行结构本身。

- 落点：`compute_ragas_scores` 的 `_ragas_run_config()` 工厂（D3 已落）：`max_retries` 10 → 2、`timeout` 600 → **180**（✅ 他拍乙）。
- 依据：单次调用实测 p50 2.7–3.3s/max ≤70s，600s×10 重试的最坏 1.8h 是「1–2 小时」的放大器；180s=ragas 上游默认、2.6× 于观测最大值，仍比 600 紧 3.3×。
- 初值跑一阵校准。
- **Task 0 冲突已拍（2026-10-04 他拍乙=180s）**：代码注释明记「ragas 默认 180s 对慢 judge（qwen-max 长 faithfulness prompt）太紧 ⇒ 故意抬 600」⇒ 甲=120 会复触发「太紧」，故取乙=180（=上游默认，收紧与历史教训的平衡点）。`max_retries` 10→2 无冲突（10 是 ragas 默认、代码未显式写，D3=显式写 2；`exception_types=(Exception,)` 任何异常都重试）。

### 2.4 D4 = 甲：逐 LLM 调用计时日志（观测项）

- 落点：`build_lead_agent_runner` 的 run config 挂计时 callback（langchain callback handler，`on_llm_end` 记 模型名/耗时/token），`debug` 级日志，仅评测链生效。
- 格式一行一调用，供「慢在哪」的后续取证；不改模型类、不进 chat 链。

### 2.5 丙 = 甲：citation judge 并行化（结构修；✅ 他拍「补 TDD 落成结构修」+ 实测背书）

- 落点两处（`ragas_eval.py`）：
  1. `citation_precision_recall` 题内：逐（论断×引用号）判定改 `asyncio.gather` 并发，按入参序收割——`unsupported` 顺序、幻觉计账语义不变。
  2. `run_layer2_evaluation` 题间：所有题的 judge 任务一次全启动、共享一个 `asyncio.Semaphore(_JUDGE_CONCURRENCY)`，按题序收割，`progress_hook` 结算顺序不变。
- `_JUDGE_CONCURRENCY = 4`：全局并发上限（所有题共享）。**2026-10-04 他拍「统一 4」**⇒ 与 D5 答题并发同值（端点是评测+聊天共用的，统一低档留邻居余量；代价=尾巴对 8 路翻倍 ~57→~110s/17 题，可接受）。§1.1-6 的 8.1× 是 8 路时代的实测，4 路预期 ~4×、数字可调。
- 实测（§1.1-6）：judge 尾巴 8.1×（462.9s 工作量 → 57.2s 墙钟）、评分段 2.0×（564→281s）。
- TDD（`test_ragas_eval.py::TestJudgeParallelism`）：题内 3 并发、semaphore=2 截流、题间 12 任务共享上限恰 8、并行下 `unsupported` 序不变；反证①题内改串行 ⇒ 3 红、反证②信号量失效 ⇒ 2 红，受害者不相交。
- 丙之后评分段大头变为 ragas 指标段（224s/80%）——砍指标数量（甲/乙）是下一个待拍杠杆，本对不裁。

### 2.6 D5 = 甲：L2 答题题间并发 W=4（结构修；✅ 他拍「按甲落地」+ 基准背书）

- 落点：`run_layer2_evaluation` 的答题循环（与 D2 同一区域）——逐题 `agent_runner(question)` 改 `asyncio.gather` 并发、共享 `asyncio.Semaphore(_ANSWER_CONCURRENCY)`，**按题序收割**：`outcomes`/`failures` 记账、`progress_hook` 语义不变（done 按完成数推进，题序结果不变）。
- `_ANSWER_CONCURRENCY = 4`（✅ 他拍「统一 4」）：与 judge 并发同值、全局一个旋钮。基准 4 题全并发墙钟=最慢题 ⇒ W=4 对小批已饱和；对 17 题批=4 路一波波推。数字可调。
- 基准（§1.1-7）：4 题两遍 146.4s → 44.8s = **3.3×**（端点压力 +18% 仍在、零失败 ⇒ 下界）；外推 17 题答题段 ~3×。
- 前提=D2 墙钟同批落（§2.2）；端点压力注意事项=失控题并发抢端点，靠 D2 封顶。
- 不动 chat 链的并发形态（chat 是单会话串行，天然不同构）。

### 2.7 翻案记录：乙‴（`tool_freq_overrides` 工具频次护栏）= 不做

10-03 修法集曾推荐乙‴（hybrid/graph/wiki_search 各 `{warn: 6, hard_limit: 10}`）。机制查明后作废：失控是**预算烧穿**不是工具循环（LoopDetection 两层防重复不防换花样与本病灶无关），加频次护栏只会截断正常多轮检索、对 A 无收益。~~丙（judge 并行）维持不做（二期候选）~~ ⇒ 10-04 他纠「D3 是兜底、要修问题本身」，丙 拉回并落地（§2.5）。

## 3. 硬约束

- chat/gateway/channels/subagent 的 recursion 配置**一律不动**（观察项另立）。
- `eval_runs` 落库语义不变：超时题=completed 行里的 question 级 `failure`，不新增状态值。
- 计时日志 debug 级、默认不输出；不得含题干/答案正文与任何密钥。
- 复现/验收脚本放 scratch（`ragas-perf/`），不进仓。

## 4. 验收

1. **A1 零撞墙**：测试1 全 17 题 L1+L2 零 `GraphRecursionError`、17/17 出分（实现后复测；基线=§1.1-3 已跑）。
2. **A2 钉 300**：用例断言 runner run config 的 `recursion_limit == 300`（防回退成 60）。
3. **A3 墙钟**：假 runner 拖 >180s ⇒ 该题 `failure="timeout"` 且后续题继续跑。
4. **A4 RunConfig**：用例钉 `max_retries == 2`、`timeout == 180`。
5. **A5 计时**：跑一次评测、debug 日志可见逐调用计时行。
6. **A6 并行 judge（已过，2026-10-04）**：`TestJudgeParallelism` 四例钉 题内并发 / semaphore 截流 / 题间共享上限恰 `_JUDGE_CONCURRENCY` / 并行下序不变；真跑 17 题 judge 尾巴 57.2s vs 工作量 462.9s = 8.1×、评分段 281s（对基线 564s）。
7. **A7 答题并发**：用例钉 题间并发（多题重叠）/ `_ANSWER_CONCURRENCY` 截流 / 超时题与其他题互不拖累（D2 同批）/ 结果按题序、progress 计数不变；真跑 4 题基准 3.3×（§1.1-7 已给基线）。
8. **neuter 反证**：①还原 60 ⇒ A2 红；②拆墙钟 ⇒ A3 红；③题内改串行 ⇒ A6 三红；④信号量失效 ⇒ A6 限流两红（③④ 已做，受害者不相交）；⑤答题改串行 ⇒ A7 并发红、⑥答题信号量失效 ⇒ A7 截流红。
9. 门禁：knowledge/eval 面全绿 + ruff 双净；受害者按「给夹具补值」处置。

## 5. 非目标

- ragas 指标数量削减（甲=四指标全留 / 乙=只留 faithfulness+answer_relevancy）——丙 落地后的下一个杠杆，待拍。
- chat 侧 recursion 换算（gateway 100 等）——观察项，另立待拍。
- `subagents/executor.py` 的 `max_turns`→`recursion_limit` 换算坑——登记不动。
- 检索质量（graph_search 恒空回）——独立问题，不进本对。
- 评测答题思考开关——他已裁不改（=chat 链默认开，见 [[rag-leg-thinking-follow-chat]]）。
