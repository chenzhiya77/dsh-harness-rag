# RAG 评测趋势图演进视图设计（contract v5：序号轴 + 分段加权纵轴 + 平滑）

日期：2026-09-07
状态：已实施（frontend-only；后端 contract v4 点 schema 不变）
前序：spec 2026-09-07-rag-eval-trend-runlevel-design.md（contract v4）、spec 2026-08-24（§4.6 y 轴自适应）

## 1. 根因（三条观感缺陷）

1. **横向空转**：contract v4 的 time 轴按时间等比布点。评测是不规则采样序列
   （数日一跑 + 单日连跑混合），稀疏段拉出大片空白、密集段挤在右缘互叠
   （实测截图：8-27~9-5 占约 75% 宽仅 3 点，9-7 六次运行挤右缘 10%）。
   时间等比间距在该数据形态下是纯噪声。
2. **纵向空转 + 轴程跳变**：spec 2026-08-24 §4.6 的 y 轴自适应（seeds = 可见值
   ∪ 阈值线，±0.05 padding）使轴程随数据与图例开关浮动（截图 20% 起轴），
   0–100 全量程不恒现；且数据密集 band（90–100）只占很小图高，回归幅度难比。
3. **硬拐点**：line series 默认线性插值，折线拐角尖锐；低值断崖呈硬 V，观感差。

## 2. 设计（评测演进视图）

### 2.1 横轴：运行序号 category 轴（翻转 contract v4 time 轴冻结项）

- `xAxis.type = "category"`，`data = points.map(p => p.ts)`，`boundaryGap: false`
  （首末点贴边，延续 time 轴观感；边缘符号半裁接受）。
- 每 run 一等距槽：横向空间利用率最大化；滚轮放大逐点 / 缩小看线机制全保留。
- **时间可读性承载面**（序号轴不编码时间间距后的补偿）：
  - 轴标签按密度档切换：`formatAxisTime(ts, preset)`——day 档 `HH:mm`、
    week/month 档 `MM-DD`（formatPointTime 切片）；组件持 `presetRef` 活读，
    formatter 闭包在轴重渲染时读最新档（datazoom patch 触发重渲染）。
  - tooltip 头仍为命中 run 的本地 `MM-DD HH:mm`（contract v4 不变）。
  - 长间歇表现为标签跳变（27 → 31 → 07），而非大片空白。
- dataZoom（inside + slider）在 category 轴上 startValue/endValue = **索引**
  （可小数）；密度档与视窗预设全部换索引域（§2.3）。

### 2.2 纵轴：固定全量程 + 分段线性 warp（退役 §4.6 自适应）

- 冻结折点表 `WARP_STOPS`（真值 → 图高）：
  `(0,0) (0.4,0.2) (0.8,0.4) (0.9,0.6) (0.95,0.8) (1,1)`。
  权重：0–40 → 20%、40–80 → 20%、80–100 → 60%（其中 90–95 / 95–100 再各占
  20% 二次放大——数据最密 band 得最大分辨率）。
- `yAxis = { min: 0, max: 1, interval: 0.2 }`：六等分刻度恰落冻结标签表
  `0% / 40% / 80% / 90% / 95% / 100%`（`WARP_TICK_LABELS`，缺键回退
  `unwarpValue` 取整百分数）。刻度间距不等本身即非线性披露（log 轴惯例）。
- 系列 datum：`value = [pointIndex, warpValue(v)]`（序号轴坐标），新增
  `raw = v` 真值字段；tooltip / 环比箭头一律报 `raw`，不报 warp 值。
- 阈值 markLine 纵坐标过 `warpValue`（与数据点同映射才贴合）；基线更新竖线
  `xAxis = ts`（category 值）不变。
- 退役：`computeYAxisRange` / `MIN_Y_SPAN` / `round2` / `resolveVisibleKeys`
  （y 固定全量程后无消费方）。`legendSelected` 回流环保留但只服务
  `legend.selected` 回显（防 refetch 重建重置图例开关），不再驱动轴程。

### 2.3 交互：索引域密度档与视窗预设（nonce 控制权分离不变）

- 密度档：`applyDensity` 读 dataZoom[0] 索引窗 → `lo/hi = clamp(round(...))` →
  `visible = hi − lo + 1` → `resolveShowSymbol(visible)`（≤80 出点）patch 各
  series `showSymbol`；跨度回算 `spanToPreset(ts[hi] − ts[lo])` 上抛作按钮
  密度指示，并同步 `presetRef`（横轴标签格式）。
- 视窗预设：`presetToIndexWindow(tsMsList, preset)`——`start` = 首个
  `ts ≥ 末点 − presetToSpanMs(preset)` 的索引；`end = last + max(0.5, (last−start) × 0.02)`
  （索引域右缘边距；孤点至少半槽防贴死）。点击经 `spanRequest{preset, nonce}`
  apply；滚轮回算高亮不回灌窗口（contract v4 机制不变）。
- 不变：`resolveShowSymbol` / `SYMBOL_DENSITY_MAX=80` / `presetToSpanMs` /
  `spanToPreset`（36h/14d 阈值）/ `DATA_ZOOM_MIN_POINTS=8` / legend scroll /
  grid 40·60 两档 / 默认预设 month。

### 2.4 平滑

- 6 图例线 + 4 picker 线全部 `smooth: true`（echarts 贝塞尔默认张力）消硬拐点。
- 极值过冲边界：贝塞尔在局部极值处可略超真值；series 默认 clip 到 grid →
  100% 顶边偶见「平头削顶」，接受。不引 monotone 自定义插值（复杂度不对价）。

## 3. 诚实边界（写入实现注释与验收预期）

1. warp 压缩的是**低值之间的差异**（33 vs 40 几乎贴底重合 → 减轻意外低值
   抖动）；但 95→33 的真实断崖仍占约 64% 图高——真回退信号不该被埋。
2. 跨段斜率失真：95 处掉 2pp 的视觉幅度 ≈ 60 处掉 6pp。回归检测视图可接受
   （刻度标签已披露非线性）；幅度精读靠 tooltip 真值与卡头回退芯片。
3. 序号轴下两次运行的真实时间间隔不再编码进间距；节奏信息靠轴标签跳变与
   tooltip 时刻读取。

## 4. 否案

- **保留 time 轴仅修标签**：横向空转根因在等比间距本身，标签修不了。
- **log / symlog 纵轴**：非线性形态与「80–100 占 60%」的目标权重不匹配，且
  0 值不可表。
- **y 轴自适应保留 + warp 叠加**：轴程浮动与「0–100 恒全现」直接冲突。
- **d3 monotone 立方插值自定义 series**：过冲收益不对价实现与测试复杂度。

## 5. 测试契约

- unit（eval-trend-chart.unit.test.ts）：warp/unwarp 折点与 clamp 钉桩；y 轴
  min0/max1/interval0.2 + 六刻度标签表；x 轴 category + data = ts 列表 +
  boundaryGap false + formatter 月档 MM-DD / formatAxisTime day 档 HH:mm；
  datum `[idx, warp] + raw`；smooth true；阈值线 warp(0.87)=0.54；
  presetToIndexWindow 三用例（day start / month 全覆 / 孤点与空集）。
- dom（eval-trend-chart.dom.test.tsx）：整表 option 透传（category 轴 + datum
  形态 + warp 阈值线）；datazoom 索引域密度档（单点出点 + day 上抛 / 100 run
  隐点）；spanRequest 三日点集 day 档索引窗 {start:1, end:2.5}。

## 6. 修订记录（2026-09-07 验收视觉修订）

1. **滑条遮轴标签 + 细带化（二段修订）**：一段修遮字——grid.bottom 滑条档
   60 → 80（60 档下标签带 38–52 与滑条带 30–50 重叠）；二段降视觉权重——
   滑条 height 20 → 14 细带（与 sparkline 28×12、进度条 h-1 同细带词汇）、
   bottom 30 → 28，grid.bottom 80 → 74 回收绘图高。终态各带：轴线 74 →
   标签 ≈52–66 → 滑条 28–42 → 图例 0–≈20，互不重叠。稀疏档（无滑条）40 不变。
2. **符号降档**：symbolSize 6 → 4（6 图例线 + 4 picker 线）；密集序号轴下
   减视觉噪声；emphasis scale 1.5 不变（hover 仍易命中）。
3. **基线更新文案改顶部水平小字旗标（三段修订终态）**：一段退役 insideEndTop
   标签（随竖线旋转 90° 压 y 轴刻度，实测截图）；二段改纯 tooltip 行承载
   （用户实测一眼语义不足）；终态 = 保留四字文案但改**顶部留白带水平小字**：
   markLine label `position: "end" + rotate: 0 + distance: 6 + align: center +
   verticalAlign: bottom + fontSize: 10`——文字居中线顶上方（grid.top 40 空
   带），不碰 y 轴刻度与数据；四字小字半宽 ≈20px，左右 margin 60/40 容得下，
   边缘 run 无需额外对齐。竖线（ink 虚线）与 tooltip 行（`labels.baselineUpdate`）
   保留作双载体。否案：纯 tooltip 行（一眼语义不足，用户否决）、轴标签旗标/
   点环（用户选择保留原文字方案）。
