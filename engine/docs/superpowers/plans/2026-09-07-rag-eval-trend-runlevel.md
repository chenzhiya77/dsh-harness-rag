# RAG 评测趋势图 run 级连续时间轴实施计划（contract v4）

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking。本计划
> 已于 2026-09-07 实施完毕：实施项勾 `[x]`，手动验收项保留 `[ ]` 待用户自测。

日期：2026-09-07
配对 spec：`docs/superpowers/specs/2026-09-07-rag-eval-trend-runlevel-design.md`
状态：已实施完毕（全测试绿）

## Phase 1：后端数据平面

- [x] Task 1：`backend/packages/harness/deerflow/knowledge/eval/trend.py`
  - 新增 `build_run_points(rows, *, include_ci=False)`：读集内每行一点、
    `(created_at, id)` 升序、`ts=coerce_iso(created_at)`、10 键取本 run、
    `run_id` 单键、regression/is_baseline_update 透传。
  - 退役 `aggregate_trend_points` / `_period_start` / `window_cutoff` /
    `Granularity`；`MAX_DAYS_BACK` 改名 `TREND_WINDOW_DAYS = 90`。
  - `build_sparks` 不动（docstring 措辞同步）。
- [x] Task 2：`knowledge_service.get_eval_trend(kb_id, *, include_ci)` 与 router
  `GET /{kb_id}/eval-runs/trend`：退役 granularity/窗口参数与回显；
  cutoff = now - 90d；响应 `{points, baseline, has_data, sparks}`。

## Phase 2：后端测试

- [x] Task 3：`tests/knowledge/eval/test_trend.py` 重写为 build_run_points 语义
  （sparks 段保留）；naive/aware 不混排约束以两次独立调用钉桩。
- [x] Task 4：`tests/knowledge/test_eval_runs_api.py` trend 段重写：run 级升序 +
  ts 偏移、legacy 参数忽略（不 422）、90d 窗、空历史 body 精确形状、sparks
  含窗外 run。

## Phase 3：前端契约与图表

- [x] Task 5：`types.ts`（TrendPoint.ts/run_id、TrendResponse 退役回显、退役
  TrendQueryParams）、`api.ts::getEvalTrend(kbId)`、`hooks.ts`
  （knowledgeEvalTrendKey 单键、useEvalTrend(kbId, enabled)）。
- [x] Task 6：`eval-trend-chart.utils.ts`：buildChartOption 退役 granularity；
  xAxis 无 formatter 覆写；逐序列 flatMap 过滤 null；tooltip 头
  `formatPointTime` 本地 MM-DD HH:mm；新增 `SpanPreset`/`SpanRequest`/
  `presetToSpanMs`/`spanToPreset`/`SYMBOL_DENSITY_MAX`/`resolveShowSymbol`。
- [x] Task 7：`eval-trend-chart.tsx`：退役 granularity prop；新增
  `spanRequest`/`onSpanChange`；tsRef + applyDensity（datazoom → 可见 run 数
  → patch showSymbol + 回算上抛）；spanRequest effect 移 dataZoom 窗口
  （右缘 2% 边距）；主题重建后同步密度。
- [x] Task 8：`eval-tab.tsx`：SPAN_PRESETS 段控（span 高亮 + spanRequest nonce
  点击请求，默认 month）；useEvalTrend 去粒度；invalidate 单键；i18n
  granularityLabel「时间窗口」/ "Time window"。

## Phase 4：前端测试

- [x] Task 9：`eval-trend-chart.unit.test.ts` 重写（run 级 fixture、逐序列过滤、
  time 轴无 formatter、三纯函数钉桩、tooltip 本地时刻正则）。
- [x] Task 10：`eval-trend-chart.dom.test.tsx` 重写：mock 补 `getOption`（浅合并
  state）；新增 datazoom→showSymbol/onSpanChange、dense 隐点、spanRequest→
  dataZoom 跨度三钉桩；lastOption 取含 legend 的末次整表调用。
- [x] Task 11：`eval-tab.dom.test.tsx`（key factory 单键、TREND fixture ts/run_id、
  预设点击不 refetch + spanRequest 转发、tier 菜单断言改 spanRequest、
  hook 调用两参）；`hooks.dom.test.tsx`（单键缓存钉桩）；
  `eval-tab-trigger-live.dom.test.tsx`（TREND 去回显字段）。

## Phase 5：验证

- [x] backend：`pytest tests/knowledge/eval/test_trend.py tests/knowledge/
  test_eval_runs_api.py` 65 passed（Windows 临时目录权限问题用
  `--basetemp=.pytest-tmp/<run>` 绕开，环境问题非代码）。
- [x] frontend：定向 5 文件 133 passed；`pnpm check`（eslint + tsc）clean。
- [x] 收尾：backend `tests/knowledge/eval` 全目录 + ruff；frontend knowledge
  全目录回归（预存 chat-panel 失败为唯一允许项）。

## 尾注（验收结论）

- 三根因（周期起点定日 / 同日吞点 / 按钮=聚合粒度）均被 contract v4 模型
  一次性消除：点=run、轴=time、按钮=视窗预设。
- 密度档与视窗预设的「控制权分离」经 nonce 机制钉桩：滚轮回算只改高亮，
  点击才移窗口——dom 测试覆盖。

## 验收

- [x] 后端定向 65 passed + `tests/knowledge/eval` 全目录绿 + ruff 双净。
- [x] 前端定向 133 passed + `pnpm check` clean；knowledge 全目录 943 passed |
  1 预存（chat-panel 模型选择器，基线同款）。
- [x] 手动验收：重启 gateway → 滚轮放大逐次测试出点 / 缩小看趋势线且 hover
  仍出该次运行数据；日/周/月切换瞬时移窗不闪加载态。（用户 2026-09-07 自测通过）
