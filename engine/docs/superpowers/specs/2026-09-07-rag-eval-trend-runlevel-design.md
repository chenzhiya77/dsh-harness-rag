# RAG 评测趋势图 run 级连续时间轴设计（contract v4）

日期：2026-09-07
状态：已实施
修订对象：spec 2026-08-24 §4.2（周期末次聚合，v3）——本 spec 将其退役。

## 1. 背景与根因

用户报告评测 tab 趋势图三类缺陷：

1. **时间错**：`aggregate_trend_points` 把点定在**周期起点**（week=ISO 周一、
   month=月初一），且 `date` 仅日期无时刻；day 档按 `row.created_at.date()`
   分桶——SQLite 读回为 naive UTC，UTC+8 环境本地凌晨 0–8 点的运行落进前一
   天的桶；echarts 又把纯日期串按本地午夜画点。三层误差叠加。
2. **同日多次运行被吞**：周期末次语义下每自然周期每层只留最后一次运行。
3. **日/周/月按钮语义错**：按钮 = 服务端聚合粒度（切档 refetch 换一组桶），
   而非视图密度——「点日」得到的不是「时间密集」而是「按天吞点」。

## 2. 数据平面（contract v4，冻结）

- **一个点 = 一次真实运行**：`GET /eval-runs/trend` 的 `points[]` 为读集
  （completed + 任一层 metrics 非空 + 默认排除 ci）内每行一点，按
  `(created_at, id)` 升序。
- 点 schema：`ts`（`coerce_iso` 完整时间戳，naive 假定 UTC 补 `+00:00`——
  时区标准，禁裸 `isoformat()`）+ 10 指标键（取**本 run**：L1 summary 四键 /
  ragas 三键 / arch_specific 三键；缺层对应键 null）+ `run_id`（单键，退役
  `layer1_run_id`/`layer2_run_id`）+ `regression`（本 run 门禁判定透传）+
  `is_baseline_update`。
- **固定窗口 = 近 90 天**（`TREND_WINDOW_DAYS`，复用旧 `MAX_DAYS_BACK` 冻结
  上限语义），亦为滚轮缩小上限；退役 `granularity`/`days_back`/
  `weeks_back`/`months_back` 请求参数与回显；保留 `include_ci`。
- 响应 = `{ points, baseline, has_data, sparks }`；`sparks` 仍取全量行
  （spec §6.2 不变，与趋势窗口解耦）。
- 后端实现：`trend.py::build_run_points` 替代 `aggregate_trend_points`；
  `_period_start` / `window_cutoff` / `Granularity` 退役。

## 3. 前端交互（冻结）

- **连续时间轴**：xAxis `type: "time"` 且无固定 formatter 覆写——echarts 按
  可见跨度自动切标签粒度（HH:mm ↔ MM-DD ↔ YYYY-MM）；时间连续性由轴自身保证。
- **逐序列点集**：每指标序列只取「该指标非空的 run」——快速档缺 layer2 不打
  假缺口；线连接相邻实跑 run。
- **缩放密度档**：dataZoom inside（滚轮）常驻；可见 run 数 ≤80
  （`SYMBOL_DENSITY_MAX`）出符号点（放大看每次测试点，实心/空心圆 layer 语义
  保留），>80 隐符号只留线（缩小看总体趋势）。隐符号**不降采样**——hover 的
  axis snap 仍命中真实 run（「缩小后悬浮仍出具体数据，只是不如放大精确」）。
  密度 patch 仅 setOption 各 series `showSymbol`，不整表重建。
- **视窗预设（原日/周/月按钮）**：= 客户端视窗 24h/7d/30d
  （`presetToSpanMs`），点击经 `spanRequest {preset, nonce}` 移 dataZoom
  窗口（右缘 2% 边距），**不 refetch**（服务端一次给 90d，queryKey 无粒度
  维度）。滚轮自由缩放后按可见跨度回算档位（`spanToPreset`：≤36h=day /
  ≤14d=week / 其余=month）上抛 `onSpanChange`——按钮高亮为**密度指示器**；
  回算高亮不回灌窗口（nonce 机制防与用户缩放抢控制权）。默认预设 = month
  （与旧默认 days_back=30 初始视野等价）。
- **tooltip 头** = 命中 run 的本地 `MM-DD HH:mm`（`formatPointTime`）；行/
  环比箭头/回退题型/点击下钻语义不变（环比 backward scan 在 run 级点天然成立）。
- y 轴自适应维持 spec §4.6（可见指标集），不随缩放窗重算（防轴跳）。
- i18n：`granularityLabel`「时间粒度」→「时间窗口」（en: "Time window"）；
  日/周/月三词保留（语义 = 最近 1 日/1 周/1 月视窗）。

## 4. 否案记录

- **保留周期聚合仅修时间戳**：否——同日吞点与按钮语义问题仍在。
- **echarts `sampling: 'lttb'` 降采样**：否——采样会改变 tooltip 命中数据，
  破坏「缩小悬浮仍出真实 run 数据」承诺；百级点数无需采样。
- **y 轴随缩放窗重算**：否——滚轮过程中轴范围跳动干扰读数；维持可见指标集口径。
- **HTML 图例/自定义缩放控件**：否——echarts 原生 dataZoom + 段控已覆盖，
  不引入第二套交互词汇。

## 5. 测试契约

- 后端：`build_run_points` 纯函数（ts 偏移/同日多点/缺层 null/读集/透传）+
  API 契约（legacy 参数被忽略不 422、90d 窗、空历史 body 精确形状、sparks
  含窗外 run）。
- 前端：utils 纯函数三档钉桩 + time 轴无 formatter + 逐序列过滤；dom：
  mock echarts 的 `getOption` 支撑密度 patch 断言、datazoom → showSymbol +
  onSpanChange、spanRequest → dataZoom 窗口跨度；eval-tab：预设点击不
  refetch + spanRequest 转发；hooks：单键 queryKey。
