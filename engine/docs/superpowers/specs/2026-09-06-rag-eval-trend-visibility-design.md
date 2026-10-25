# RAG 评测趋势可见性设计(11 指标分层展示)

- 日期:2026-09-06
- 状态:定稿(对齐轮:F1–F3 + L1 sparkline 落点纠正)
- 关联:specs/plans 2026-08-24 评测可视化(本 spec 是其趋势部分的增补定稿);实现切分见 §8

## 1. 背景与目标

总览共 11 个指标(L1 检索 4 + RAGAS 4 + 引用与图谱 3)。用户问题:"趋势图要不要 11 个全画?"
结论:**不全画**。单图 11 线 = spaghetti;主流产品(Grafana/Datadog/W&B/Confident AI)的共识是
"默认决策指标 + opt-in 诊断 + 小图扫描 + 详情归档"四层分离。本 spec 冻结该分层与各指标落点。

## 2. 术语:五个展示面

| 面 | 载体 | 交互 | 回答的问题 |
|---|---|---|---|
| 主图默认 | 趋势卡大折线图 | 无需操作 | "系统在变坏吗"(决策) |
| 图例 | 主图底部彩色标签(echarts legend) | 点标签开关线 | "是哪个指标在动"(诊断) |
| picker | 趋势卡头 DropdownMenu 多选 | 勾选加线 | 稀疏指标不脏图例的加线入口 |
| sparkline | 生成质量 7 个 L2 瓦片内迷你线 | 无交互 | 不打开主图扫 L2 走势 |
| drawer | 点趋势点/历史行滑出详情抽屉 | 点开 | "这次 run 到底怎样"(归档) |

## 3. 展示面矩阵(冻结)

| 指标 | 主图默认 | 图例 | picker | sparkline | drawer |
|---|:-:|:-:|:-:|:-:|:-:|
| recall_at_k / hit_rate | ✓ | ✓ | – | – | ✓ |
| mrr | – | ✓ | – | – | ✓ |
| path_accuracy | – | – | ✓ | – | ✓ |
| faithfulness / answer_relevancy / context_precision | – | ✓ | – | ✓ | ✓ |
| context_recall | – | – | –(退役) | ✓ | ✓ |
| citation_precision / citation_recall / seed_hit_rate | – | – | ✓(注"仅完整档") | ✓ | ✓ |

- 主图可选范围 = 10 指标(除 context_recall);默认仅 2 条线。
- context_recall 退役范围 = **主图候选**(与 context_precision 同族同向冗余);sparkline/drawer 保留。

## 4. 主图规则

1. 默认线:recall_at_k + hit_rate;recall_at_k 挂阈值红虚线(baseline.recall_at_k − threshold)
   与回退红点(regression.detected)——红色只服务门禁信号,不散撒。
2. 图例候选 6(现状不变):L1 实线实心圆 / L2 虚线空心圆(线型=确定性/概率性语义)。
3. picker 候选 4:path_accuracy(L1 实线)+ 引用三指标(L2 虚线),项尾注"仅完整档";
   状态会话级不持久化(与图例同款);不设硬上限(全开是用户显式行为)。
4. 稀疏语义:仅完整档产出的指标在快速档周期为 null——**空点断开不连线**(connectNulls=false),
   tooltip 该行标"该档未跑";阈值红虚线保留作 zoom 视图内的门禁锚点。
5. **y 轴随可见序列自适应(2026-09-06 增补)**:yMin/yMax 只按当前可见序列(默认 ∪ 图例开启 ∪
   picker 开启)计算;图例开关经 echarts `legendselectchanged` 回流 React state 触发 option
   重建(自适应跟随可见集)。修复旧实现"下界取全部候选指标(含隐藏) + 上界恒 1"
   导致 80–95 高分簇压成直线的问题(用户实测)。
6. 轴程规则:seeds = 可见值 ∪ 阈值线值;yMin = max(0, floor((min−0.05)×10)/10);
   yMax = min(1, ceil((max+0.05)×10)/10);**最小轴程 10 个百分点**(不足时以中点为中心
   对称扩)防过度放大抖动;yMin>0 时趋势卡头加芯片"Y轴 xx%–yy%"(阈值红芯片同款
   词汇)——缩放诚实提示,避免被误读成从 0 起。

## 5. sparkline 规则

1. 落点 = **7 个 L2 瓦片**(RAGAS 4 + 引用 3,含 context_recall);**L1 四指标不放**:
   检索质量是表格无瓦片表面,且其趋势入口已被主图候选位全覆盖(2 默认+图例+picker)。
   表格单元格/列头/新增瓦片行三案均否( clutter / 破 h-8 密度定稿 / 与汇总胶囊重复)。
2. 数据 = 该指标 **run 级近 10 个非空值**(保"每点=一次真实运行"语义),与粒度段控解耦。
3. 形态:纯 SVG polyline(不引 echarts,jsdom 可直测),**缩档 28×12(w-7 h-3)、与数值
   同行右置**(数值行 `flex items-center justify-between gap-1`,数字左/迷你线右,用户
   定案 B 案);中性 muted-foreground 线 + 端点实心圆(不引入第 11 套颜色词汇);
   null 断开;全 null 不画(数值行保持原样);进度条 h-1 保留在瓦片底部。
4. 无交互(纯扫描);精查走 picker/drawer。

## 6. 数据契约(后端 trend)

1. 周期点 `TrendPoint` 键 6 → **10**:补 `path_accuracy`、`citation_precision`、
   `citation_recall`、`seed_hit_rate`(服务 picker);取值口径=该层周期末次行,缺则 null。
2. 趋势响应新增顶层 **`sparks`**:7 个 L2 键各一条 run 级近 10 非空值数组(升序),
   独立于 granularity(服务瓦片 sparkline,不随 day/week/month 切换)。
3. 前端 `TrendPoint` / `TrendResponse` 同步扩型;契约冻结后不得增删键。

## 7. 被否替代方案

- 11 线同图(spaghetti,不可读)。
- context_recall 进主图候选(同族冗余)。
- L1 sparkline:表格单元格级(每格迷你图=严重 clutter)/列头嵌线(破 h-8 密度定稿)/
  表上加汇总瓦片行(与汇总胶囊数值重复)。
- 图例塞 11 项(图例两行脏);picker 覆盖全 11(高频 6 项图例直达更快)。
- y 轴固定 0–100(高分簇压成直线,用户实测 2026-09-06);delta/相对视图切换(多模式
  心智,门禁语义已有阈值线+红点);log 轴(百分比不适用)。
- sparkline 数值行下独立一行(瓦片 +16px;定案为同行右置缩档:26rem 下限数学
  52+4+28=84 ≤ 87 放得下);sparkline 替换进度条(丢档位色 cue)。

## 8. 实施切分与测试计划

1. 后端 `trend.py`:周期点扩 10 键 + `sparks`(7 键)+ 单测(键集合/sparks 窗口与 null 语义)。
2. 前端 types:`TrendPoint` 扩键 + `TrendResponse.sparks`。
3. sparkline SVG 组件 + 7 瓦片接入(全 null 不画)+ overview dom 测试。
4. picker DropdownMenu(4 候选、会话级)+ 图表 option 稀疏语义 + tooltip"该档未跑"
   + y 轴可见序列自适应(legendselectchanged 回流 + 最小轴程 + 卡头诚实芯片)
   + i18n(zh/en)+ trend utils unit / eval-tab dom 测试。
5. knowledge 套件全量回归 + `pnpm check`。

验收:刷新评测 tab——7 个 L2 瓦片**数值行右侧**出现 28×12 迷你线;picker 勾"引用准确率"
主图加虚线且快速档空点断开;context_recall 不在图例/picker 但瓦片有迷你线;L1 表格零
视觉变化;80–95 高分簇铺满图高(y 轴自适应),zoom 时卡头芯片显示"Y轴 xx%–yy%"。
