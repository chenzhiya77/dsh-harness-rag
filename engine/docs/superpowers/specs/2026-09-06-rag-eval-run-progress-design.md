# RAG 评测运行进度设计(轮询自锁修复 + 工具栏进度)

- 日期:2026-09-06
- 状态:定稿(表面选择:仅工具栏);**2026-09-06 修订**——验收缺口修复推翻 §2 修复手法与 §4 按钮文案,见各处「修订(2026-09-06)」标注;plan 尾注「验收缺口修复」记录根因与回归。
- 关联:plan `docs/superpowers/plans/2026-09-06-rag-eval-run-progress.md`

## 1. 背景:两个问题

1. **Bug(用户实测)**:点击运行评测后,总览/题库视图起初无运行态;切到历史视图再切回才出现。
2. **可见性缺口**:完整评测 20–40 分钟,运行期间 UI 仅有 in_flight 布尔,零中间进度。

## 2. Bug 根因与修复定案

根因三连环:
1. 轮询开关 = 缓存数据里的 `in_flight`(`evalRunsRefetchInterval`),挂载首查 false → 不轮询;
2. POST 触发按设计不 invalidate("避免与首次轮询双请求")——但首次轮询前提永不成立 → 死锁;
3. 历史视图自带第二个 `useEvalRuns` observer,挂载 refetch(staleTime=0)打破死锁 → 全域复活。

修复定案:trigger onSuccess 且 `status==="enqueued"` 时**乐观置位**
`setQueryData(knowledgeEvalRunsKey(kbId), old => old && {...old, in_flight: true})`;
无缓存数据时退化为 invalidate。轮询立即启动、三视图同步亮运行态;零额外请求;
drain 边 invalidate 与"POST 不 invalidate"其余语义保留。

**修订(2026-09-06)**:上述"无缓存退化 invalidate"是残留缺陷——空缓存时该即时 refetch
撞后端竞态(`trigger_eval_run` 用 `asyncio.create_task` 延迟启动 runner,`_IN_FLIGHT` 在
runner 内 `await load_questions` 之后才 +1,见 `ondemand.py`),refetch 命中窗口拿回
`in_flight=false` → 按钮不亮、`refetchInterval` 不启动 → 仍死锁,非切历史(挂第二个
observer 再 refetch)不复活——即 §1 问题 1 未真正修复。新定案:乐观置位改**无条件**
`setQueryData(key, old => ({runs:[], total:0, progress:null, ...(old ?? {}), in_flight:true}))`,
空缓存则**创建**最小条目而非 invalidate。但实测仍复现(按钮不亮/不推进/跳过 2/3),进一步
定位到**后端根因**:`_IN_FLIGHT` 原在 runner 内 `await load_questions` **之后**才 +1,
create_task 调度到 load 完成之间存在窗口,触发后早期 poll(3s)读到 in_flight=false →
覆盖前端乐观值、杀死轮询(refetchInterval 变 false)。终版修复:**后端**把 `_IN_FLIGHT`
自增前移到 runner 第一行(任何 await 之前,`ondemand.py`),空题库提前 raise 时先
`_release_run`;前端保留无条件乐观置位。窗口关闭后早期 poll 即见 true,乐观值不被
覆盖、轮询存活,按钮立即亮且随 progress 推进 1/3→2/3→3/3。

**触发入口统一纪律(缺口 3 追加)**:所有评测触发入口(头部运行按钮/右键菜单/行⋮菜单/
批量选择)必须委托 eval-tab 的 `handleTrigger`(bank 经必填 `onTrigger` prop 上收),
**禁止子组件自持 trigger mutation**——自持 mutation 的 onSuccess 会绕过乐观置位与
档位记档(pendingFullRun),导致该入口触发后头部按钮不转运行态、非切历史不复活。

## 3. 进度模型(后端,内存级)

- `ondemand._PROGRESS: dict[kb_id, Progress]`,单进程模块级(_IN_FLIGHT 同款模式);
  进程重启时运行任务本身亦丢,进度同丢,语义自洽,**不落库**。
- phase 三段:`layer1`(检索指标,不定长,秒级)→ `questions`(答题与判分,
  **determinate k/N**,耗时主体)→ `ragas`(RAGAS 指标,不定长,分钟级);落库/finally 清除。
- 更新点:`run_full_eval_for_kb` 每题(agent run + 引用 judge 完成)done++;单题失败
  failed++ 且 done 仍计(降级契约:单题不沉全 run);`run_layer1_for_kb` 仅 layer1 段瞬过。
- 透出:`GET /eval-runs` 响应顶层加 `progress`,**复用现有 3s 轮询,零新端点零新轮询**。

契约(冻结):

```json
"progress": {"run_id": "rag-…", "phase": "layer1|questions|ragas",
             "done": 7, "total": 17, "failed": 0,
             "started_at": "ISO8601", "updated_at": "ISO8601"}   // 非 in_flight 时 null
```

## 4. UI 表面(定稿:仅工具栏)

- **按钮文案**:questions 段 = "运行中… 7/17"(tabular-nums);layer1/ragas 段 = "运行中…"
  (不假数字);phase 词与 k/N 进按钮 aria-label(屏幕阅读器与悬浮可读)。
- **工具栏底缘细进度线**:`absolute bottom-0 inset-x-0 h-0.5`;questions 段 determinate
  (done/total 宽);layer1/ragas 段 indeterminate(pulse 动画);非运行态不渲染。
- 总览状态条 / 历史进度卡:**本期不做**(用户定案仅工具栏);趋势卡不加(无部分数据)。

**修订(2026-09-06)**:原按钮文案是"假状态"——layer1 与 ragas 都显裸"运行中…",用户
无法区分(§1 问题 2 观感缺口);phase 词只进 aria-label,肉眼不可见。新定案(用户拍板:
**4 字阶段名 + n/3**,与「运行评测/完整评测」等 4 字按钮对齐):
- **按钮文案**:`检索评测 1/3` → `答题评测 2/3` → `质量评估 3/3`(zh 三段 phase 词统一 4 字)。
  快速档(L1 单阶段)不显计数(只`检索评测`),避免"1/3 却到不了 3/3"的新假状态;完整档
  layer1 显 1/3,questions/ragas 恒显 2/3、3/3(step>1 与档位无关);档位由 `pendingFullRun`
  ref(触发时按 `input.layers==="l1_l2"` 置位)判定。
- **k/N 移出按钮**(破坏 4 字对齐)→ 保留在底缘 determinate 细线填充(视觉)+ progressbar
  `aria-valuenow/max`(读屏)。
- **纯函数**:`phaseStep(progress)`(layer1/null→1、questions→2、ragas→3)+ `EVAL_PHASE_COUNT=3`
  in `eval-run-status.ts`;i18n `runningPhase(phase,step,total)`,退役 `runningButton`/`runningProgress`。
- **底缘细线**:语义不变(questions determinate、layer1/ragas pulse,绝不假百分比)。注:n/3 是
  真实阶段序号,非假百分比,与 §6"ragas 段假百分比"被否方案不冲突。

## 5. 降级与边界

- `progress=null` 且 in_flight(旧进程窗口/竞态)→ 按钮按 layer1 降级(修订后:完整档
  `检索评测 1/3`、快速档`检索评测`)+ 不定长细线 pulse;(原:按钮裸"运行中…");
- `already_running` 触发不改写 progress;error 行落库时 finally 清除;
- L1 快速档:layer1 段秒级闪过 → drain,细线 pulse 一下即消,不扰;
- 选题运行:total = 过滤后题数(与运行口径一致)。

## 6. 被否替代方案

- 总览状态条 / 历史 in-progress 卡(表面扩散,用户本期仅选工具栏);
- 进度落库(重启语义复杂化,与 _IN_FLIGHT 内存模式分裂);
- 新端点 / 新轮询循环(复用 /eval-runs 3s 轮询已足);
- ragas 段假百分比(不定长阶段给确定进度条=撒谎)。

## 7. 实施切分与测试

1. 后端 ondemand:_PROGRESS + 三段更新点 + finally 清除;unit(递增/failed/清除/layer1-only)。
2. 后端 router:/eval-runs 响应 +progress;API test(in-flight mock 带 progress;idle 为 null)。
3. 前端 bug 修复:enqueued 乐观置位;eval-tab dom(触发后**不切视图**三视图运行态立现)。
4. 前端工具栏:按钮 k/N 文案 + aria + 底缘细线(determinate/indeterminate);
   eval-run-status 纯函数(progress 标签/不定长判定)unit;i18n 三处
   (`runningProgress(done,total)` / phase 词)。
5. 回归:knowledge 套件 + pnpm check + ruff。

验收:点击完整评测 → 工具栏立即"运行中…" + pulse 细线(无需切历史);进入答题段变
"运行中… k/N" + 定长细线随 3s 轮询推进;ragas 段回 pulse;落库瞬间按钮复原、细线消失。

**修订(2026-09-06)验收口径**:点击完整评测 → 按钮**立即**`检索评测 1/3` + pulse 细线
(无需切历史,验证无条件乐观置位);答题段 → `答题评测 2/3` + 底缘定长细线按 k/N 推进;
ragas 段 → `质量评估 3/3` + 细线回 pulse;落库瞬间按钮复原`运行评测`、细线消失;快速评测
(L1)→ `检索评测`(无计数)pulse 一下即消。自动化已覆盖(eval-tab 47/47、eval-run-status
10/10、knowledge 877 passed | 1 预存无关失败);仍需用户 UI 复核真实 LLM 链路观感。

## 8. 档位单选重设计(2026-09-06 追加,取代 §4 分体按钮的不对称结构)
- 动机:旧结构主键硬编码 L1、下拉仅完整档,且选中题目会把主按钮动词变脸为
  「快速评测/完整评测」(selection.runSelected/fullRunSelected)——一个动词同时编码
  "档位×范围"两个正交维度,反直觉。
- 新模型:chevron 下拉=**档位互斥单选**(快速评测/完整评测,勾中项尾置 Check,点选只
  勾选不运行);主按钮恒显**勾中档位名**并执行该档(运行态仍优先显阶段名+n/3);档位为
  会话内 state(默认快速档,不持久)。**完整档一律收口确认弹窗**(头部/⋯/题库右键·行⋮),
  弹窗新增范围行(全库/所选 N 题)作为"只跑所选"的唯一提醒器,主按钮不附加范围后缀。
- 退役文案:runButton(运行评测)、fullRun.menuItem、selection.runSelected/
  fullRunSelected;新增 tierQuick/tierFull 与 fullRun.dialogScopeAll/dialogScopeSelected。
  上文"落库复原`运行评测`"的表述由"复原为勾中档位名"取代。
- 连带简化:完整档 n/3 计数改由 tier state 判定(showCounter = tier==="l1_l2" || step>1),
  删除 pendingFullRun 触发瞬间推断。
- 追加工具栏收玫(2026-09-06):造题入口(添加考题/生成考题)从内联按钮收进档位下拉,
  以分割线与档位单选隔离(仅题库视图;窄栏 ⋯ 菜单仍保留);下拉 min-w-0 覆盖 ui 默认
  min-w-[8rem] 贴合内容宽度;弹窗与口径标注去用户不可懂代号(Layer 1 → 检索质量)。
- 回归:eval-tab 50/50、bank 28/28、knowledge 880 passed|1 预存无关、check 双净。

## 9. 进度表面重设计:运行进度容器(2026-09-06 追加,取代底缘细线)
- 动机:底缘细线只表征 questions 段(与旧按钮文案同款"假状态"),且视觉粗糙;用户定案**直接删除**,不修。
- 新表面:**总览视图**检索质量卡上方的进度容器(用户定案仅总览;题库/历史仍由按钮 4 字阶段名
  承载紧凑表面)。仅 in_flight 渲染,drain 后卸载。
- 第一行=**单轨时长加权整体条** + 右侧仅 ETA:轨道内按各段预计时长占比划跨度(短段窄/
  长段宽),phase 边界 1px 刻线,当前段跨度提亮,填充连续。权重=先验(完整档 10/35/55,
  快速档 100)+ 本 run 实测自适应(段完成后用实测时长替换先验并按先验比例重归一剩余段);
  无需历史字段/迁移。整体分数 f = 已完成段权重和 + 当前段权重×(段内 done/total)。
  自适应带**校准门控**(实施修正):仅当至少一段有实测——scale 具备「秒/先验占比」量纲——
  当前段才取 max(期望时长, 已跑时长)以应对超时;冷启动下先验是无量纲占比,与秒数比
  大小会让条一开跑就被拉宽、先验几何全失。
- ETA(2026-09-06 二次修订,用户实测投诉后):**按段**速率外推——本段
  `phaseFull = elapsed / within`、剩余 = `phaseFull×(1−within)`,后续段按「后续先验占比 /
  本段先验占比 × phaseFull」定价;warmup 门控 = 本段 done>0 且 elapsed≥5s(旧
  「f>6% 且 elapsed>20s」在快速档永远过不了,表现为恒「估算中…」);不足一分钟显秒
  (`etaRemainingSeconds`),否则取整分钟;右侧文案仍仅 ETA。旧「在整体分数 f 上外推」
  退役:它把廉价段(layer1/答题前几题)的速率当全程速率,早期 ETA 乐观到撒谎。
- **layer1 段逐题上报**(同轮修复,快速档空条的根因):`runner.run_evaluation` 增可选
  `progress_hook`,每题毕回调 `("layer1", done, 0, N)`;ondemand 两个 runner 传入且
  `_progress_start(total=N)`(旧 total=1 且零中间事件 → 快速档条全程 0%、完成即消失)。
- 第二行=**单行实时日志**:后端 progress 新增结构化 `tail` 事件({kind:phase|item|fail,
  phase,done,total,failed}),前端按 i18n 渲染单行 truncate、新事件淡入替换;failed>0 挂
  失败徽标;aria-live=polite。选结构化事件而非后端拼中文,保住 en locale。
- 后端契约增量(实施校正,Task 9 已落):
  - progress 由**七键扩为十键**(+`phase_started_at` 毫秒级 / `phase_durations` / 结构化 `tail`);
    阶段切换时结算上段实测耗时(前端加权自适应的数据源);`get_eval_progress` 对旧形状
    条目补默认值,恒透出十键(前端不必做存在性分支);§3 冻结契约由本节正式扩展。
  - ragas **无逐样本循环**(单次批量 `ragas.evaluate`,ragas Executor 按 (样本×指标) 提交 job)
    → 原计划"循环内补 hook"不成立;改为向 `evaluate(_pbar=...)` 传自定义鸭子对象接住
    每 job 的 `update(1)`:零并发/批量改动、零性能回归,顺带静默 ragas 控制台进度条。
    `expected_ragas_jobs(samples)` = 有参考×4 + 无参考×2,作为第三段诚实分母。
  - 第三段同时并入**逐题 citation judge**(此前完全静默,会让条在 ragas 结束后提前满格):
    `scoring_total = ragas_jobs + judge_jobs`;ragas 失败/跳过也按预期 job 数结算,保证单调。
  - evaluator 协议增可选 `on_progress`,仅在 `progress_hook` 存在时传入(CLI 与既有假件协议不变)。
- 退役:底缘细线 JSX 与 `progressFraction/isIndeterminatePhase/progressAriaLabel`
  (含 `EvalProgressPhaseLabels`)——细线退役后三者无生产消费者,连同其单测一并删除;
  按钮阶段文案保留。
- **在飞档位推断**(实施新增,纯函数 `runningTier`):档位单选表达的是「下一次运行」,
  不能拿来画当前这次运行的条几何——从题库右键/行⋮ 触发的完整档、以及刷新后接上的
  在飞 run,都可能与单选不一致。优先级:phase 已离开 layer1 → 必属完整档(快速档没有
  后两段);仍在 layer1 → 用触发时记录的 `runTier`(onSuccess enqueued 分支写入);
  两者都无从得知 → 回退当前单选。按钮计数 `showCounter` 同步改用该推断值。
- i18n 增量:etaRemaining/etaEstimating + 日志句模板(logPhase/logItem/logFail)+
  **logWaiting**(tail 未到的乐观窗口)/ **bannerAria**(progressbar 可读名);三处同步。
- 测试:eval-run-status 增 f/ETA 纯函数单测;eval-tab 删细线断言、增容器断言(总览运行态);
  后端增 ragas 逐样本 hook 与 tail/durations 单测。

## 10. 常驻评测状态槽(2026-09-06 三轮设计,用户实测后提出)

用户诉求:进度容器完成后直接消失,总览缺「这次评测的上下文」(何时跑/耗时/成败);
提议容器常驻、完成后换上下文内容或加切换按钮。定案(**用户拍板**):

- **容器升级为常驻「评测状态槽」**(仍仅总览、检索质量卡上方),三态自动 morph,
  **不加手动切换按钮**——drain 后进度注册表已清空、各段数据未落库,完成后的
  「进度页」无数据可画,切换按钮是空壳且白引入一个状态位;「看这次评测详情」的
  诉求由槽内**历史跳转按钮**桥接到历史视图/run 抽屉。
- 三态:
  1. running:§9 两行进度 UI,不变。
  2. idle 且有历史:**单行摘要** `{档位图标}{档位} · 耗时 {duration}`(2026-09-06 四轮
     用户定案:**去掉「上次评测」前缀**;档位图标沿用仓库语汇 Play=快速/Layers=完整;
     字号升档 text-sm;单位紧凑 s/m) + 右侧 `{相对时间}` + 历史跳转按钮;
     `status∈{error,skipped}` → destructive 色调 `评测失败` + 跳转。**不放题数**
     (用户定案:检索质量卡已有 n=K,重复即冗余)。
  3. idle 且无历史:muted 单行「尚未评测」(不重复工具栏触发按钮,避免双 CTA)。
- **数据源零迁移**(历史行 `_eval_run_summary` 已具备):档位 = `has_layer2`;
  耗时 = `completed_at − created_at`(缺 completed_at 则省耗时段);相对时间 =
  `created_at`;成败 = `status`。最新行 = runs 列表首行。**各段耗时不进摘要**:
  `phase_durations` 未落库,要显需给 eval_runs 加列走迁移——缓议。
- **时区校正**(2026-09-06 四轮,用户实测「刚刚评测却显 8 小时前」):SQLite 读回剥 tz
  → naive;`_eval_run_summary` 旧用裸 `isoformat()` 序列化无偏移,前端 `new Date()`
  当本地时间解析(UTC+8 偏 8 小时,历史行与槽相对时间同病)。改经 `coerce_iso`
  (naive 假定 UTC 补 `+00:00`),历史行/槽/latest 三处同源归一。
- 布局:常驻挂载顺带修掉「运行开始时 banner 插入顶下卡片」的跳动;运行态两行 /
  空闲态单行,接受完成瞬间一次 reflow(完成时刻本就是注意力锚点)。
- 过渡:drain 瞬间容器内容交叉淡入(复用 §9 日志行淡入词汇),容器本身不卸载。
- 新增纯函数(eval-run-status.ts,实施校正):**i18n 中立结构件**——`durationParts(seconds)`
  → {seconds|minutes|minutes-seconds}(文案由 i18n dur* 键渲染,纯函数不出中文)、
  `tierOfRun(run)`(has_layer2)、`runDurationSeconds(run)`(缺戳/倒序 → null)。
  **相对时间复用既有 `formatTimeAgo`**(@/core/utils/datetime,date-fns locale-aware,
  不另造纯函数与 rel 族键);不跑定时器 tick,随查询刷新重渲染。
- i18n 增量(实施校正):slotSummary(tier,duration)/ slotSummaryFailed /
  slotViewHistory(跳转按钮 aria+title)+ dur 三键(durSeconds/durMinutes/
  durMinutesSeconds);空历史文案**复用既有死键 `neverRan`**(改词「尚未评测」/
  「Not yet evaluated」),`lastRunLabel` 退役(无消费者,语义由 slotSummary 模板承载);
  三处同步。`slotSummary` 的 duration 参可空(Task 16 校正):缺戳时省耗时段
  (`上次评测 · 完整评测`)而非显假数字;摘要行相对时间传 `useI18n().locale`
  (跟 UI locale,不走 formatTimeAgo 的 cookie 兜底)。
- 测试:纯函数单测(durationParts 三档/tierOfRun/runDurationSeconds 含缺戳与倒序
  防御;相对时间由既有 formatTimeAgo 覆盖,不新增);slot dom 三态断言 +
  跳转按钮 + error 色调;eval-tab 断言容器常驻(空闲态也在、不再 `running &&`)。

## 11. 评测运行终止(2026-09-06 四轮设计,立项 Task 19-21)

用户提问:「评测一旦点击就不能停止了,终止功能有必要做吗,现有逻辑能实现吗」。
定案:**必要且可行**。

- 现状缺口:触发是 fire-and-forget `asyncio.create_task`,**任务句柄未留存** → 无取消
  抓手;`already_running` 幂等锁使误触发(错档/错范围)后整个 KB 锁到跑完(完整档
  10-20 分钟)——终止是唯一逃生舱。
- 机制(**零并发结构改动**):
  - `_TASKS[kb_id] = asyncio.current_task()` runner 首行自注册(与 `_IN_FLIGHT` 同步
    自增同词汇,先于任何 await);finally pop。
  - `POST /eval-runs/cancel`:非在飞 409;在飞 `task.cancel()` → 202。CancelledError
    注入最近 await 点——全链皆 await(三路检索 gather / agent 多轮 / judge HTTP /
    ragas executor gather),在飞 HTTP 随即中断。
  - 落行:`except asyncio.CancelledError` → `save_eval_run(status="cancelled")`,
    **layer1 已跑完则带其指标**(与「廉价层成果永不丢」同词汇)→ re-raise。status
    为自由字符串列**零迁移**;读集只认 completed → cancelled 自动排除出
    latest/trend;历史行是其唯一曝光面。
  - 清理复用 finally `_release_run`(弹 `_PROGRESS/_IN_FLIGHT`)+ `_TASKS.pop` →
    **cancel 后 already_running 锁立即释放,可再触发**。
- 前端表面:
  - **工具栏分体按钮次槽 morph**(2026-09-06 用户定案):运行态下 chevron 档位下拉
    本就 disabled 且无意义(档位只对下一次运行生效、触发被 already_running 锁) →
    次槽morph 为终止按钮:首态 X 幽灵按钮(同 h-7 分体视觉),**两步 inline 确认**:
    首击变 destructive 文本按钮「确认终止?」(3s 超时回退),再击才发——长跑误触
    代价高,不开 dialog。空闲态次槽还原为 chevron 下拉。
    选此位而非槽 running 态:工具栏三视图都在,**任何视图下终止可达**(槽仅总览);
    槽 running 态保持纯进度 + ETA,§9「右侧只放 ETA」冻结保持绝对。
  - 成功 toast;轮询见 in_flight false → 走 drain 边自动刷新(既有机制,零新增)。
  - 历史新增 cancelled 分支:`Ban` 图标 + muted + 「已终止」/「Cancelled」;槽空闲
    摘要 cancelled 行用非 completed 色调但文案「评测已终止」(区别 failed「评测失败」)。
    drawer 状态徽标同步补 cancelled 分支(Task 20 实施校正:原落入 skipped 兑底)。
- i18n 增量(Task 20 实施定稿):cancelRun/cancelConfirm/cancelToast/
  cancelFailedToast/slotSummaryCancelled + 历史与 drawer 各自的 statusCancelled;
  三处同步。Types:`EvalRunSummary.status` 与 `EvalRunDetail.status` 联合均加
  `"cancelled"`;新增 `EvalCancelResponse`。窄档(⋯ 菜单)运行态加「终止评测」项
  (onSelect preventDefault 保菜单不关,两步确认同款),可达性与次槽对齐。
- 不做:CLI 进程 run 的终止(异进程,出范围);undo(终止不可逆,toast 不带撤销);
  progress 契约变更。
- 实施校正(Task 19 发现):**questions 段入口 hook**——旧实现只在每题毕才回调,
  首题在飞期间(agent 多轮可达分钟级)phase 停 layer1、UI 一直显「检索评测」
  (与假进度同族缺陷);现补段入口事件 `("questions", 0, 0, N)`(与 ragas 段入口
  同词汇),hook 序列单测同步更新。
