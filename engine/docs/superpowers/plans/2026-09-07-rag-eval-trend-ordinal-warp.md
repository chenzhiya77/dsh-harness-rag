# RAG 评测趋势图演进视图实施计划（contract v5）

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking。本计划
> 已于 2026-09-07 实施完毕：实施项勾 `[x]`，手动验收项保留 `[ ]` 待用户自测。

日期：2026-09-07
Spec：docs/superpowers/specs/2026-09-07-rag-eval-trend-ordinal-warp-design.md
范围：frontend-only（后端 contract v4 点 schema 不变）

## Phase 1：纯函数层（eval-trend-chart.utils.ts）

- [x] Task 1：warp 映射——冻结折点表 `WARP_STOPS`（0/0.4/0.8/0.9/0.95/1 →
  0/0.2/0.4/0.6/0.8/1）；`warpValue` / `unwarpValue`（clamp [0,1] 分段线性）；
  `WARP_TICK_LABELS` + `formatWarpTick`（六等分刻度查表，缺键回退 unwarp 取整）。
- [x] Task 2：`formatAxisTime(ts, preset)`（day → HH:mm、其余 → MM-DD，formatPointTime 切片）。
- [x] Task 3：`presetToIndexWindow(tsMsList, preset)`（start = 首个 ts ≥ 末点−span 的
  索引；end = last + max(0.5, (last−start)×0.02)；空集 {0,0}）。
- [x] Task 4：`buildChartOption` 改造——xAxis category（data = ts 列表、boundaryGap
  false、axisLabel.formatter = 入参 `formatAxisTime?` 缺省月档）；yAxis 固定
  0/1/interval 0.2 + formatWarpTick；series datum `[idx, warpValue(v)] + raw`
  与 `smooth: true`（6 图例线 + picker 线）；阈值 markLine 过 warpValue；
  退役 `computeYAxisRange` / `MIN_Y_SPAN` / `round2` / `resolveVisibleKeys`
  （legendSelected 仅服务 legend.selected 回显）。
- [x] Task 5：`buildTrendTooltipHtml` 改索引直取（`pointIndex = first.value[0]`、
  行值取 `datum.raw`、头取 `points[pointIndex].ts`）；越界索引返回空串防御。

## Phase 2：适配层（eval-trend-chart.tsx）

- [x] Task 6：`presetRef`（默认 month）；`applyDensity` 换索引域（clamp round 索引 →
  visible = hi−lo+1 → showSymbol patch；`spanToPreset(ts[hi]−ts[lo])` 上抛并同步
  presetRef）。
- [x] Task 7：spanRequest effect 换 `presetToIndexWindow` 索引窗 + presetRef 同步。
- [x] Task 8：数据 effect 与主题重建两处 `buildChartOption` 传入
  `formatAxisTime: (ts) => formatAxisTime(ts, presetRef.current)`；退役组件内
  `presetToSpanMs` 导入。

## Phase 3：测试

- [x] Task 9：unit（eval-trend-chart.unit.test.ts）——退役 y 自适应六用例；新增 warp
  纵轴 describe（折点/clamp/回环 + 刻度标签表 + min/max/interval）；x 轴 category
  describe（data/boundaryGap/formatter 月档 + formatAxisTime day 档）；datum
  `[idx, warp] + raw` 与 smooth 断言；阈值线 warp(0.87)=0.54；tooltip fixture 改
  索引+raw；presetToIndexWindow 三用例。
- [x] Task 10：dom（eval-trend-chart.dom.test.tsx）——lastOption 类型改 category +
  datum 形态；整表透传断言（warp 阈值线 / category data / formatter 函数）；
  click datum 形态；datazoom 索引域密度档两用例保持语义；spanRequest 三日点集
  day 档索引窗 {start:1, end:2.5}。

## Phase 4：文档与验证

- [x] Task 11：spec + plan 成对落盘（本文件 + specs/2026-09-07-rag-eval-trend-ordinal-warp-design.md）。
- [x] Task 12：验证——定向 rstest 两文件；knowledge 全目录回归（基线 943 passed |
  1 预存 chat-panel 失败）；`pnpm check` clean；后端零改动不跑 pytest/ruff。
- [x] Task 13：验收视觉修订（spec §6）——滑条档 grid.bottom 74 + 滑条细带化
  14/bottom 28；symbolSize 6 → 4；基线更新文案改顶部水平小字旗标
  （rotate 0/fontSize 10）+ tooltip 行双载体。

## 验收尾注（手动）

- [x] 稀疏+密集混合历史等距排布，无大片空白与右缘互叠。
- [x] y 轴恒 0–100%，刻度 0/40/80/90/95/100；80–100 段占 60% 图高。
- [x] 折线平滑无硬拐点；100% 顶边偶见削顶为已知边界。
- [x] 滚轮放大逐次测试出点 / 缩小隐点看趋势；日/周/月移窗与按钮高亮回算照旧；
  day 档轴标签出 HH:mm、week/month 档出 MM-DD。
- [x] 滑条细带不遮轴标签、不压图例；节点直径降一档观感清爽。
- [x] 基线更新文案为顶部留白带水平小字（非旋转 90° 竖排），不压 y 轴刻度；
  hover 该 run 的 tooltip 出同名行。

> 以上六项用户 2026-09-07 自测通过，勾选关闭。
