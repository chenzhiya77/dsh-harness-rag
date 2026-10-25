# RAG 评估指标总览与趋势图可视化设计（评测 Tab 数据可视化子设计）

> 状态：✅ 已落地（2026-08-26，plan Task 0a–7 全部完成；布局定案为 §5 单列垂直布局，双栏工作台方案随父 spec §9 二期另议） · 日期：2026-08-24 · 范围：评测 Tab 的数据可视化细化设计——指标总览（Layer 1 表格 + Layer 2 卡片）与趋势图（ECharts 多线时间序列）；冻结指标展示与趋势图的具体视觉/交互/API 契约 · 关联：`2026-08-23-rag-retrieval-evaluation-design.md`（指标体系定义、后端实现与 §9 评测 Tab 契约意图）
>
> **v2 修订记录（2026-08-24 代码核查后）**：
> 1. 修正数据契约归因：Layer 1 指标来自 `runner.py`（Layer 1 报告），Layer 2 指标来自 `ragas_eval.py`（Layer2Report）——v1 误将两者都挂在 Layer2Report 上（§3.1 字段映射表）；
> 2. 补齐数据供给链路设计：`eval_runs` 行语义、双 CLI 写入、`is_baseline` 机制、`GET /eval-runs/latest` 端点契约（v1 缺失，见 §3.1/§4.2）；
> 3. echarts 集成从 `echarts-for-react`（项目无此依赖）改为 vector-canvas 手写适配层模式（§4.5）；
> 4. UI 着色从裸色板改为主题语义 CSS 变量（项目无 amber/rose/gray 裸色板先例，§3.5）；
> 5. 文案全量 i18n（§3.6）；数据获取改 TanStack Query + keep-alive lazy 门控（§5）；
> 6. 下钻从新路由改为 drawer（对齐 ChunkDrawer/WikiEntryDrawer 先例，§4.4/§5）；
> 7. 修正 E2E 路由（`/workspace/knowledge?kb=...`，§6.2）；删除「点击数据缺口下钻」不可实现交互（§4.2）。
>
> **v3 修订记录（2026-08-24 设计复审后）**：
> 1. **运行环境隔离**：`eval_runs` 加 `environment` 列（`local`/`ci`/`nightly`），CI 运行留痕但不进 latest/trend 默认取数——防止每个 PR 的 CI 运行污染趋势图（§3.1.1/§4.2）；
> 2. **聚合语义统一**：week/month 从「均值」改为「该周期末次运行」——均值会掩盖回退且与 day 粒度语义不一致；每个点恒等于一次真实运行，下钻语义统一（§4.2）；
> 3. **回退标红与门禁对齐**：标红判定从「summary 低于阈值线」改为 `baseline_diff.regression_detected`（per-category 门禁口径），tooltip 列出回退 category；阈值线保留为 summary 级参考线（§4.3.3/§4.3.4）；
> 4. **补详情端点**：`GET /eval-runs/{run_id}`——drawer 数据源（v2 遗漏）（§4.2/§5）；
> 5. **时钟单一事实源**：`created_at` 显式写报告 `generated_at`（不用 DB default），聚合与展示统一时钟（§3.1.1）；
> 6. **baseline 双轨合一**：CLI 支持 `--baseline auto` 直接读 DB 的 is_baseline 行做 diff，CI 与趋势图共用同一 baseline（§3.1.3）。

---

## 1. 背景

评测 Tab 的整体框架已在父 spec（2026-08-23 §9）冻结契约意图，但**指标数据的可视化呈现**需要进一步细化：

- **指标总览**：Layer 1（确定性 IR 指标）与 Layer 2（RAGAS + 架构专属指标）的数据结构、视觉层次、状态语义需要冻结——它们直接影响用户「一眼判断质量健康度」的效率
- **趋势图**：多指标时间序列的展示策略（哪些指标上线、颜色/线型如何区分、阈值线如何标记、时间粒度如何切换）需要与后端 API 契约同步设计——避免前端渲染逻辑与后端聚合逻辑脱节

**设计目标**：
1. **3 秒判断**：用户打开评测 Tab，3 秒内通过颜色与布局判断「当前质量是否健康」
2. **30 秒定位**：发现异常后，30 秒内通过趋势图确认「是单日抖动还是持续趋势」
3. **3 分钟下钻**：点击趋势图数据点打开单次运行详情 drawer，完成根因分析

**架构事实核查（v2，2026-08-24 代码核查）**：

1. **后端数据结构已落地，但两层分离**：
   - Layer 1（`backend/packages/harness/deerflow/knowledge/eval/runner.py`，CLI `backend/scripts/run_rag_eval.py`）：报告含 `overall: {count, hit_rate, recall, mrr, path_accuracy}` + `by_category: {category: {...同四指标}}` + `diff`（baseline 对比）——注意键名是 `recall` 而非 `recall_at_k`；
   - Layer 2（`backend/packages/harness/deerflow/knowledge/eval/ragas_eval.py::Layer2Report`）：`aggregate` 含 `path_accuracy / citation_precision / citation_recall / graph_entity_hit_rate / ragas{四指标} / by_category{仅 path_accuracy}`，另有 `ragas_available / ragas_skip_reason / langfuse / generated_at`——**不含 hit_rate/recall/mrr**；
   - 前端指标总览的数据契约必须**同时**对齐这两份报告，字段映射见 §3.1。
2. **ECharts 适配层先例**：`frontend/src/components/workspace/knowledge/vector-canvas.tsx` 是**手写适配层**（`echarts/core` 模块化注册 + `echarts.init/setOption` + ResizeObserver + MutationObserver 主题感知），由父组件 `vector-tab.tsx` 经 `next/dynamic ssr:false` 懒加载。项目依赖仅有 `echarts` + `echarts-gl`，**无 `echarts-for-react`**——趋势图复用同一手写模式，不新增依赖。
3. **UI 组件库**：`frontend/src/components/ui/` 已有 `card.tsx / badge.tsx / progress.tsx / tabs.tsx / dialog.tsx / select.tsx / checkbox.tsx`——**缺 `table.tsx`**。`ui/` 组件由 shadcn registry 生成（frontend/AGENTS.md：不手写），新增走 `pnpm dlx shadcn add table`。
4. **趋势图与总览 API 均需新增**：当前后端无 `/eval-runs` 任何端点，需新增 `GET /eval-runs/latest`（总览）与 `GET /eval-runs/trend`（趋势）两个；时间戳取自各报告的 `generated_at`。
5. **指标颜色语义与 CI 门禁对齐**：Layer 1 的 per-category recall 回退超 `--fail-threshold`（默认 `DEFAULT_FAIL_THRESHOLD = 0.03`，小数）触发 CI 红（`run_rag_eval.py` exit 1）。前端红色阈值线与该阈值同源——trend API 返回 `threshold_percent = DEFAULT_FAIL_THRESHOLD * 100`（百分数单位换算在后端完成），前端不硬编码。
6. **ragas 可选依赖**：`uv sync --extra ragas` 安装，未装时标准指标显式 skipped（`Layer2Report.ragas_available: false` + `ragas_skip_reason`）——前端指标卡片需处理「skipped」状态。
7. **Langfuse 集成可选**：`Layer2Report.langfuse: Mapping[str, Any]` 含推送状态——前端「查看 trace」链接仅在 trace URL 存在时显示。
8. **前端图表懒加载**：echarts 走 `next/dynamic ssr:false` 由 eval-tab 挂载（对齐 vector-tab 先例），不进首屏 chunk。`performance-budgets.json` 当前无 `/workspace/knowledge` 路由条目，懒加载组件不进 `pnpm perf:check` 测量面——**无需新增预算条目**（v1 所谓「vector-canvas 预算先例」不存在，已核实）。
9. **eval_runs 表已落地（Task 0a，`d5952f1c`）**：`backend/packages/harness/deerflow/knowledge/models.py::EvalRunRow` + migration `0017_eval_runs_table.py`，字段 `id / kb_id / status / layer1_metrics JSON / layer2_metrics JSON / created_at / completed_at / langfuse_trace_url / baseline_diff JSON`。
10. **baseline 现状**：目前仅是 CLI `--baseline <prev report.json>` 参数，无持久化「当前 baseline」概念——trend API 的 baseline 块需要新增机制（§3.1.3 冻结）。

---

## 2. 交付项与建议顺序

| # | 交付项 | 依赖与理由 |
|---|---|---|
| P0 | **数据供给链路**（双 CLI 持久化 + `is_baseline` 列 + latest/trend 端点） | 一切可视化的前置；行语义与聚合规则在 §3.1/§4.2 冻结 |
| P0 | **指标总览组件**（`eval-metrics-overview.tsx`：Layer 1 表格 + Layer 2 卡片网格） | 依赖 latest 端点契约；评测 Tab 的「首屏内容」 |
| P0 | **趋势图组件**（`eval-trend-chart.tsx`：ECharts 折线图 + 粒度切换 + 阈值线） | 依赖 trend API；与指标总览共享同一存储 |
| P1 | **单次运行详情 drawer**（`eval-run-drawer.tsx`，趋势图点击下钻目标） | 依赖趋势图交互；本 spec 冻结 drawer 壳契约（run_id 定位 + 元信息 + 两层指标只读摘要），逐题明细 UI 另立 spec |
| P2 | **异常标记增强**（回退红色填充点、基线更新竖线） | 依赖趋势图 MVP；提升异常可读性 |

建设顺序纪律：**先数据供给（写入+读取契约），再指标总览（静态展示），再趋势图（动态交互）**——没有持久化就没有趋势；总览是「当前状态」，趋势图是「历史视角」。

---

## 3. 指标总览设计

### 3.1 数据供给链路（v2 新增，冻结）

#### 3.1.1 eval_runs 行语义

**一行 = 一次 CLI 运行**。两个 CLI 各自写入：

| CLI | 层 | 写入 |
|---|---|---|
| `run_rag_eval.py`（Layer 1） | 确定性 IR | `layer1_metrics` = §3.1.2 映射结果；`layer2_metrics = {}` |
| `run_ragas_eval.py`（Layer 2） | RAGAS + 架构专属 | `layer2_metrics` = §3.1.2 映射结果；`layer1_metrics = {}` |

- **空对象 `{}` = 该层本次未执行**（0017 表 NOT NULL 约束不变，无需改表）。
- `status`：`completed`（exit 0；**Layer 1 回退红 exit 1 也算 completed**——门禁信号已落在 `baseline_diff`，趋势图需要回退运行的数据点）/ `error`（exit 2，用法/IO 错误）/ `skipped`（exit 3，缺 key 显式跳过）。
- skipped/error 行照常写库（留下「何时尝试过」的痕迹），但**不进** latest/trend 的取数集合（见 §4.2）。
- **`environment` 列（v3，migration 0018 一并加）**：`local` / `ci` / `nightly`。CLI 加 `--environment` 标志，`--environment` 显式指定优先，否则按环境推断（`CI=true` → `ci`，nightly workflow 显式传 `nightly`，缺省 `local`）。CI 运行**留痕但默认不进** latest/trend 取数集合（`?include_ci=true` 可含）——否则每个 PR 的 CI 运行会污染趋势图。
- **时钟单一事实源（v3）**：`created_at` 不用 DB default，持久化时显式写入报告的 `generated_at`（评测发生时间）；聚合与展示一律读 `created_at`，禁止混用两个时钟。

#### 3.1.2 字段映射（报告 → JSON 列）

Layer 1 报告 → `layer1_metrics`：

| 报告字段 | 存储字段 | 说明 |
|---|---|---|
| `overall` | `summary` | 全量加权汇总 |
| `overall.recall` | `summary.recall_at_k` | **键名映射**（报告内叫 `recall`） |
| `overall.count` | `summary.question_count` | 题目数 |
| `by_category` | 顶层各 category 键 | 原样透传（`hit_rate/recall→recall_at_k/mrr/path_accuracy/count→question_count`）；**只含本批次出现的 category** |
| `diff` | `baseline_diff` 列 | 含 `recall_at_k_delta / regression_detected / threshold_percent` |

Layer 2 报告（`Layer2Report.aggregate` + 顶层字段）→ `layer2_metrics`：

| 报告字段 | 存储字段 | 说明 |
|---|---|---|
| `aggregate.ragas` | `ragas` | `{faithfulness, answer_relevancy, context_precision, context_recall}`，NaN 已归一化为 null |
| `aggregate.citation_precision` | `arch_specific.citation_precision` | 引用精准率 |
| `aggregate.citation_recall` | `arch_specific.citation_recall` | 引用召回率 |
| `aggregate.graph_entity_hit_rate` | `arch_specific.seed_hit_rate` | 图谱落点命中率 |
| `ragas_available / ragas_skip_reason` | `ragas_available / ragas_skip_reason` | 放 `layer2_metrics` JSON 内 |
| `has_graph_questions` | `has_graph_questions` | 保存时计算：`any(q.relevant_entities)`，决定 seed_hit_rate 卡片是否显示 |
| `langfuse` 推送状态 | `langfuse_trace_url` 列 | 有 trace 时填 URL |

#### 3.1.3 baseline 机制（v2 新增，冻结）

现状只有 CLI `--baseline` 临时传入，trend 图需要的「当前 baseline」必须持久化：

- **migration 0018**：`eval_runs` 加 `is_baseline` Boolean（默认 `false`，NOT NULL）+ 部分唯一索引（`sqlite_where: is_baseline = true`，每 KB 至多一行 baseline，索引兜底）。
- **CLI**：两个 eval CLI 新增 `--mark-baseline` 标志；保存运行后在**同一事务**内清掉该 KB 旧标记再置新标记（代码层保证 + 索引兜底）。仅 `status=completed` 的运行生效（exit 0/1——回归红灯运行也是 completed，仍可作基线，门禁信号在 `baseline_diff`）；error/skipped 运行忽略标记并打 warning 日志 + stderr 提示，既有基线保持不动。
- **`--baseline auto`（v3）**：`run_rag_eval.py` 的 `--baseline` 接受特殊值 `auto`——从 eval_runs 读该 KB 的 is_baseline 行直接做 diff（文件传入仍保留兼容）；无 baseline 行时按无 diff 运行（exit 0 语义不变）。
- **索引跨方言（v3）**：部分唯一索引在 Alembic 同时声明 `sqlite_where` 与 `postgresql_where`，避免将来迁 PostgreSQL 时静默丢失。
- **trend API 的 baseline 块**：
  - `recall_at_k` = 该 KB baseline 行的 `layer1_metrics.summary.recall_at_k`；
  - `threshold_percent` = `DEFAULT_FAIL_THRESHOLD * 100`（与 CI `--fail-threshold` 默认值同源；未来 CI 改阈值时同步改常量，不引入新配置）；
  - 无 baseline 行时返回 `baseline: null`，前端不画阈值线、总览不着色。

### 3.2 数据契约（与 latest 端点对齐）

```typescript
// frontend/src/core/knowledge/types.ts

/** 单个 category 的 Layer 1 指标（键名已与 §3.1.2 存储映射对齐） */
export interface Layer1CategoryMetrics {
  hit_rate: number;           // 0-1，标注 chunk 是否出现在 top-k
  recall_at_k: number;        // 0-1，标注 chunk 命中比例
  mrr: number;                // 0-1，首个正确结果排名倒数
  path_accuracy: number;      // 0-1，路径选择准确率
  question_count: number;     // 该 category 题目数
}

/** Layer 1 汇总：summary + 动态 category 键（题库含哪些 category 就有哪些键） */
export interface Layer1Metrics {
  summary: Layer1CategoryMetrics;
  by_category: Partial<Record<"fact" | "relation" | "concept" | "global", Layer1CategoryMetrics>>;
}

/** Layer 2 RAGAS 标准指标（null = 该指标本次未产出或 ragas 未安装） */
export interface RagasMetrics {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  context_recall: number | null;
}

/** Layer 2 架构专属指标 */
export interface ArchSpecificMetrics {
  citation_precision: number | null;
  citation_recall: number | null;
  seed_hit_rate: number | null;
}

export interface BaselineDiff {
  recall_at_k_delta: number;    // 负数表示回退
  regression_detected: boolean;
  threshold_percent: number;    // 百分数（后端已完成 ×100 换算）
}

/** 指标总览完整数据 = GET /eval-runs/latest 响应（两层可来自不同运行） */
export interface MetricsOverview {
  kb_id: string;
  /** 最近一次 status=completed 且 layer1_metrics 非空的运行；null = 从未跑过 Layer 1 */
  layer1: {
    run_id: string;
    created_at: string;          // ISO8601，对应报告 generated_at
    metrics: Layer1Metrics;
    baseline_diff?: BaselineDiff; // 仅当该次运行带了 --baseline
  } | null;
  /** 最近一次 status=completed 且 layer2_metrics 非空的运行；null = 从未跑过 Layer 2 */
  layer2: {
    run_id: string;
    created_at: string;
    ragas_available: boolean;
    ragas_skip_reason?: string;
    ragas: RagasMetrics;
    arch_specific: ArchSpecificMetrics;
    langfuse_trace_url?: string;
    has_graph_questions: boolean;
  } | null;
}
```

**设计要点**：
- 两层独立可空——Layer 1 每天 CI 跑、Layer 2 每周 nightly 跑，两者时间戳天然错位，合并视图必须保留各自来源（`run_id` + `created_at` 分开展示）。
- `by_category` 是动态键：冷启动题库（20 题）可能缺 category，前端对缺失 category 的表格行灰显「本批次无此类题目」（§3.3）。
- skipped/error 运行不进 latest（只在历史列表可见——历史列表属父 spec §9 范围，不在本 spec）。

### 3.3 Layer 1 展示：表格

**布局**：全宽表格，5 行（4 个 category + 1 行汇总），5 列（category 名 + 4 个指标）

```
┌──────────┬──────────┬───────────┬───────┬──────────────┐
│ Category │ Hit Rate │ Recall@k  │  MRR  │ 路径准确率    │
├──────────┼──────────┼───────────┼───────┼──────────────┤
│ fact     │  95.2%   │   92.3%   │ 0.876 │    98.5%     │
│ relation │  88.1%   │   85.4%   │ 0.654 │    92.3%     │
│ concept  │  91.7%   │   89.2%   │ 0.789 │    95.8%     │
│ global   │  76.3%   │   72.1%   │ 0.543 │    81.2%     │
├──────────┼──────────┼───────────┼───────┼──────────────┤
│ **汇总** │ **92.8%**│ **89.7%** │**0.812│   **94.6%**  │
└──────────┴──────────┴───────────┴───────┴──────────────┘
```

**单元格着色规则**（与 CI 门禁阈值同源，颜色用语义 CSS 变量，见 §3.5）：

| 条件 | 颜色 | 语义 |
|------|------|------|
| `recall_at_k_delta >= 0` | 默认色（无背景） | 无回退或提升 |
| `-threshold% < recall_at_k_delta < 0` | `bg-(--eval-warn-bg) text-(--eval-warn-fg)` | 轻微回退（警告） |
| `recall_at_k_delta <= -threshold%` | `bg-(--eval-danger-bg) text-(--eval-danger-fg) font-semibold` | 显著回退（触发 CI 门禁） |
| 无 baseline_diff | 默认色 | 该次运行无对比基准 |

注意：着色阈值用 `baseline_diff.threshold_percent`（后端值），**不写死 3%**。

**特殊处理**：
- 汇总行加粗 + 顶部边框线（`border-t-2`），视觉上与 category 行区分
- category 单元格带题量后缀（如 `fact (n=12)`），一眼看出该行权重
- 缺失 category 行（`by_category` 无此键）：整行 `text-muted-foreground` 灰显并标注「本批次无此类题目」
- `layer1 === null`（从未跑过）：表格区整区空态「尚无 Layer 1 运行」，非灰显表格

### 3.4 Layer 2 展示：卡片网格

**布局**：两行卡片网格
- 第一行：RAGAS 四指标（4 列等宽）
- 第二行：架构专属三指标（3 列等宽）

**单卡片结构**：

```
┌─────────────────────┐
│  Faithfulness       │  ← 指标名（text-sm text-muted-foreground）
│                     │
│      0.933          │  ← 原始值（text-2xl font-bold）
│   ████████░░        │  ← 进度条（h-2 rounded-full）
│      93.3%          │  ← 百分比（text-sm text-muted-foreground）
│                     │
│  [查看 trace →]     │  ← 可选链接（仅 langfuse_trace_url 存在时）
└─────────────────────┘
```

**卡片状态规则**：

| 状态 | 视觉表现 | 触发条件 |
|------|---------|---------|
| 正常 | 默认卡片 | 指标值正常产出 |
| 缺失 | `bg-muted` + 值显示 `-` | 指标为 null（NaN 归一化后） |
| ragas 未安装 | 卡片整体 `bg-muted` + 顶部 Badge「ragas 未安装」 | `ragas_available === false` |
| 无 graph 题 | 卡片整体 `bg-muted` + 底部提示「本批次无 graph 类题目」 | `has_graph_questions === false` 且指标为 seed_hit_rate |
| Langfuse 未启用 | 不显示「查看 trace」链接 | `langfuse_trace_url` 为空 |
| 从未运行 | 整个 Layer 2 区空态「尚无 Layer 2 运行」 | `layer2 === null` |

**进度条颜色**（语义 CSS 变量，与 Layer 1 门禁语义一致）：
- 值 ≥ 0.8：`bg-(--eval-ok)`
- 0.6 ≤ 值 < 0.8：`bg-(--eval-warn)`
- 值 < 0.6：`bg-(--eval-danger)`
- 值为 null：`bg-muted`

### 3.5 语义色与主题规范（v2 新增，冻结）

项目前端无 `amber-/rose-/gray-` 裸色板先例（全仓 grep 实证），全部走主题 token。评测语义色按既有 CSS 变量覆盖规范落地：

- **新建** `frontend/src/styles/eval-metrics.css`，定义语义变量并在 `globals.css` 末尾 `@import`（不改动 globals.css 原有变量）：

```css
/* eval-metrics.css：评测指标三态语义色，亮暗双主题 */
:root {
  --eval-ok: var(--chart-2, #10b981);
  --eval-warn: #d97706;
  --eval-warn-bg: #fef3c7;
  --eval-warn-fg: #92400e;
  --eval-danger: #e11d48;
  --eval-danger-bg: #ffe4e6;
  --eval-danger-fg: #9f1239;
}
.dark {
  --eval-warn-bg: rgb(120 53 15 / 0.3);
  --eval-warn-fg: #fbbf24;
  --eval-danger-bg: rgb(136 19 55 / 0.3);
  --eval-danger-fg: #fb7185;
}
```

- 组件内用 Tailwind v4 的 `bg-(--eval-warn-bg)` / `text-(--eval-warn-fg)` 语法消费；中性色一律用 `text-muted-foreground` / `bg-muted` / `border` 等既有 token。
- **图表内数据色**（6 条指标线）保留 hex——数据色是编码不是主题装饰（vector-canvas 先例）；但轴线/图例/tooltip 等装饰层必须主题感知（复用 vector-canvas 的 `isDarkTheme()` / `ink()` 模式 + MutationObserver 监听 `.dark`）。

### 3.6 i18n 规范（v2 新增，冻结）

知识库 UI 文案全量走 `useI18n`（middle-tabs / recall-test-panel 先例），本特性新增 `tk.eval.*` 分组，三处同步（`core/i18n/locales/types.ts` / `zh-CN.ts` / `en-US.ts`）：

- `tabs.eval`：Tab 名（评测 / Evaluation）
- `eval.layer1Title` / `eval.layer2Title`：两个 section 标题
- `eval.regressionBadge` / `eval.ragasMissingBadge` / `eval.noGraphQuestions`：状态徽章与提示
- `eval.emptyLayer1` / `eval.emptyLayer2` / `eval.emptyTrend`：三个空态
- `eval.viewTrace` / `eval.granularity.{day,week,month}` / `eval.trendTitle` / `eval.drawerTitle` 等
- echarts canvas 内的 tooltip/阈值线标签同属 UI 文案，经 props 传入或 option 构建函数参数注入（canvas 组件不直接调 `useI18n`，保持纯渲染可测）。

### 3.7 组件结构（props 驱动，不内置 fetch）

```typescript
// frontend/src/components/workspace/knowledge/eval-metrics-overview.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/core/i18n/hooks";

interface EvalMetricsOverviewProps {
  overview: MetricsOverview;   // 数据由 eval-tab 经 useMetricsOverview 注入
  onViewTrace?: (url: string) => void;
}

export function EvalMetricsOverview({ overview, onViewTrace }: EvalMetricsOverviewProps) {
  const { t } = useI18n();
  const tk = t.knowledge.eval;
  const { layer1, layer2 } = overview;

  return (
    <div className="space-y-6">
      {/* Layer 1 表格 */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">
          {tk.layer1Title}
          {layer1?.baseline_diff?.regression_detected && (
            <Badge variant="destructive" className="ml-2">{tk.regressionBadge}</Badge>
          )}
        </h3>
        {layer1 ? (
          <Layer1MetricsTable metrics={layer1.metrics} diff={layer1.baseline_diff} />
        ) : (
          <EmptyHint text={tk.emptyLayer1} />
        )}
      </section>

      {/* Layer 2 卡片 */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">
          {tk.layer2Title}
          <span className="text-muted-foreground ml-2 text-xs font-normal">{tk.layer2Note}</span>
          {layer2 && !layer2.ragas_available && (
            <Badge variant="secondary" className="ml-2">{layer2.ragas_skip_reason || tk.ragasMissingBadge}</Badge>
          )}
        </h3>
        {layer2 ? (
          <>
            <div className="grid grid-cols-4 gap-4">
              <RagasMetricCard title="Faithfulness" value={layer2.ragas.faithfulness} onViewTrace={onViewTrace} />
              <RagasMetricCard title="Answer Relevancy" value={layer2.ragas.answer_relevancy} />
              <RagasMetricCard title="Context Precision" value={layer2.ragas.context_precision} />
              <RagasMetricCard title="Context Recall" value={layer2.ragas.context_recall} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <ArchMetricCard title={tk.citationPrecision} value={layer2.arch_specific.citation_precision} />
              <ArchMetricCard title={tk.citationRecall} value={layer2.arch_specific.citation_recall} />
              <ArchMetricCard
                title={tk.seedHitRate}
                value={layer2.arch_specific.seed_hit_rate}
                disabled={!layer2.has_graph_questions}
                disabledReason={tk.noGraphQuestions}
              />
            </div>
          </>
        ) : (
          <EmptyHint text={tk.emptyLayer2} />
        )}
      </section>
    </div>
  );
}
```

着色逻辑（`getCellColorClass(delta, thresholdPercent)`）与进度条颜色（`getProgressBarColor(value)`）提取为纯函数放 `eval-metrics-overview.utils.ts`（jsdom 可测，对齐 graph-utils.ts 先例）。

---

## 4. 趋势图设计

### 4.1 数据契约

```typescript
/** 趋势图单个数据点：两层指标独立取数，各自可空 */
export interface TrendPoint {
  date: string;                    // ISO8601 日期（聚合粒度决定精度）
  // Layer 1（当日末次 / 周期均值；该层该周期无数据则 null）
  recall_at_k: number | null;
  hit_rate: number | null;
  mrr: number | null;
  // Layer 2 RAGAS（同粒度，独立取数）
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  /** 下钻用来源行：点击 Layer 1 线数据点用 layer1_run_id，Layer 2 线用 layer2_run_id */
  layer1_run_id: string | null;
  layer2_run_id: string | null;
  /** 该点 Layer 1 来源运行的门禁判定（透传其 baseline_diff）；该运行无 diff 为 null */
  regression: { detected: boolean; categories: string[] } | null;
  /** 该点对应的 Layer 1 运行是否被 --mark-baseline 标记 */
  is_baseline_update: boolean;
}

/** 趋势图 API 响应 */
export interface TrendResponse {
  points: TrendPoint[];
  granularity: "day" | "week" | "month";
  /** 窗口回显：只含当前粒度匹配的键（day→days_back / week→weeks_back / month→months_back） */
  days_back?: number;
  weeks_back?: number;
  months_back?: number;
  /** 当前 baseline；无 baseline 行时为 null（前端不画阈值线） */
  baseline: {
    recall_at_k: number;           // baseline 行 layer1_metrics.summary.recall_at_k
    threshold_percent: number;     // DEFAULT_FAIL_THRESHOLD * 100，与 CI 门禁同源
  } | null;
  /** 该时间范围内是否有数据（任一层有即为 true） */
  has_data: boolean;
}
```

**指标集说明（冻结取舍）**：趋势图不含 `context_recall` 与三个架构专属指标——RAGAS 四指标中 context_recall 与 context_precision 同族、趋势同向，为控制线数只上 context_precision；架构专属指标的关注入口在总览卡片与详情 drawer。总览卡片仍展示全部七项（§3.2）。

### 4.2 API 契约（两个新端点）

| Method | Endpoint | Query Params | Response |
|--------|----------|--------------|----------|
| GET | `/api/knowledge-bases/{kb_id}/eval-runs/latest` | 无 | `MetricsOverview`（§3.2） |
| GET | `/api/knowledge-bases/{kb_id}/eval-runs/trend` | `granularity=day\|week\|month`<br>`days_back=30`（day）/ `weeks_back=12`（week）/ `months_back=6`（month）<br>`include_ci=false` | `TrendResponse` |
| GET | `/api/knowledge-bases/{kb_id}/eval-runs/{run_id}` | 无 | `EvalRunDetail`（单行完整 JSON：status + environment + 两层 metrics + baseline_diff + 元信息），drawer 数据源 |

路由挂载在 `backend/app/gateway/routers/knowledge_bases.py`（与 `/{kb_id}/vector-projection` 同一 router 形态）；未知 kb 返回 404（对齐 vector-projection 先例）。

**latest 取数规则**：每层各取最近一次 `status=completed` 且对应 `*_metrics != {}` 且 `environment != 'ci'` 的运行；无则该层为 `null`。

**trend 聚合规则（按层独立，v3 冻结）**：
- 取数集合：`status=completed` 且对应层 `*_metrics != {}` 的行（skipped/error 行不进集合）；默认排除 `environment = 'ci'`（`include_ci=true` 时含）；
- **统一末次语义**：day / week / month 均为「按自然日/自然周/自然月分组，取该周期**最后一次**含该层数据的 completed 运行」（两层独立，两条线可来自不同运行，`layer1_run_id`/`layer2_run_id` 各自记录来源）。v2 的 week/month 均值已废弃——均值会掩盖回退且与 day 语义不一致；每个点恒等于一次真实运行，下钻语义统一；
- 某层该周期无数据：该层指标为 `null`，ECharts 渲染为缺口（`connectNulls: false` 默认行为）；
- 若将来需要平滑视角，以移动平均**另加一条线**实现，不改变点的「真实运行」语义。

**后端实现要点**：
- 数据源：`eval_runs` 表（单 KB 历史通常 <100 条）；
- 聚合逻辑抽纯函数 `aggregate_trend_points(rows, granularity)` 放 harness 层（`deerflow/knowledge/eval/trend.py`）直测，service 只做薄壳（对齐 `metrics.py` 纯函数先例）；读全量行内存计算，全量 <10ms；
- 服务层方法放 `knowledge_service.py`（`get_latest_eval_metrics` / `get_eval_trend` / `get_eval_run`），对齐既有 service 分层；
- 参数校验：非法 `granularity` → 422；窗口参数按粒度配对（day→`days_back` 后端 clamp 到 ≤90 / week→`weeks_back` / month→`months_back`），响应只回显当前粒度匹配的那个键；
- 聚合与展示一律用行 `created_at`（= 报告 `generated_at`，§3.1.1 时钟纪律）。

### 4.3 视觉规范

#### 4.3.1 整体布局

```
┌────────────────────────────────────────────────────────────────┐
│  📈 指标趋势                        [Day] [Week] [Month] 切换   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  100% ┤                                               ╭──      │
│       │          ╭─╮                     ╭──╮        ╱         │
│   90% ┤     ╭──╯   ╰──╮             ╭──╯  ╰───────╯            │
│       │    ╱          ╰──╮       ╭──╯                            │
│   80% ┤───╯──────────────╰────╯─────────────────────────       │ ← Recall@k（蓝实线）
│       │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │ ← 回退阈值线（红虚线）
│   70% ┤                                                        │
│       │                                                        │
│       └────────────────────────────────────────────────────    │
│         08-01      08-08      08-15      08-22       今天      │
│                                                                │
│  [图例] ──Recall@k ──Hit Rate ──MRR ┄┄Faithfulness ┄┄Answer... │
│                                                                │
│  💡 点击任意数据点查看单次运行详情                                │
└────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 指标线型与颜色（与 Layer 1/Layer 2 门禁语义对齐）

| 指标 | 颜色 | 线型 | 点样式 | 默认显示 | 说明 |
|------|------|------|--------|---------|------|
| Recall@k | `#3B82F6`（蓝） | 实线 2px | 实心圆 6px | ✅ | Layer 1 核心，CI 门禁指标 |
| Hit Rate | `#10B981`（绿） | 实线 2px | 实心圆 6px | ✅ | Layer 1 |
| MRR | `#8B5CF6`（紫） | 实线 2px | 实心圆 6px | ❌ | Layer 1，默认隐藏避免拥挤 |
| Faithfulness | `#F59E0B`（橙） | 虚线 2px | 空心圆 6px | ❌ | Layer 2 RAGAS |
| Answer Relevancy | `#EC4899`（粉） | 虚线 2px | 空心圆 6px | ❌ | Layer 2 RAGAS |
| Context Precision | `#06B6D4`（青） | 虚线 2px | 空心圆 6px | ❌ | Layer 2 RAGAS |

**设计意图**：
- **实线 = Layer 1（确定性，进 CI 门禁）**：视觉上更「实」，暗示这些指标是硬约束
- **虚线 = Layer 2（概率性，只报告）**：视觉上更「虚」，暗示这些指标有 judge 方差，仅供参考
- **默认只显示 Layer 1 三指标中的两条**（Recall@k + Hit Rate）：避免图表过度拥挤；用户可通过图例点击开启其余线
- 数据色 hex 是编码可保留（§3.5）；轴线/图例文字/tooltip 底色走主题感知（`ink()` 模式）

#### 4.3.3 阈值线

```typescript
// ECharts markLine 配置（buildChartOption 内）
{
  name: labels.thresholdLine,   // i18n 注入
  type: "line",
  markLine: {
    silent: true,  // 不响应鼠标事件（点击穿透不到阈值线，避免 dataIndex 歧义）
    symbol: "none",
    lineStyle: {
      color: "#EF4444",
      type: "dashed",
      width: 1,
    },
    data: [{ yAxis: baseline.recall_at_k - baseline.threshold_percent / 100 }],
    label: {
      position: "insideEndTop",
      formatter: labels.thresholdLabel(baseline.threshold_percent),
      color: "#EF4444",
      fontSize: 11,
    },
  },
}
```

**视觉表现**：红色虚线横贯整个图表，标签位于线右端上方。`baseline === null` 时整个 markLine series 不生成。

**语义边界（v3 冻结）**：阈值线是 **summary 级参考线**；CI 门禁的真实判定是 **per-category** recall 回退（`--fail-threshold` 口径）。两者可能不一致（某 category 掉 5% 触发 CI 红，summary 只掉 1% 不破线）——因此回退标红不由阈值线驱动，改由 `regression.detected` 驱动（§4.3.4）。图上「线未破但点红」= category 级回退，这是有意保留的信号。

#### 4.3.4 异常标记

| 异常类型 | 视觉表现 | ECharts 实现 |
|---------|---------|-------------|
| 数据缺口（该层该周期无 completed 运行） | 该日期该线断开 | 值为 `null`，`connectNulls: false`（默认）自然断开 |
| 回退点（`regression.detected`，per-category 门禁口径） | 红色填充圆点 + tooltip 列出回退 category | 数据项级 `itemStyle.color` 覆盖（挂在 datum 上） |
| 基线更新点（`is_baseline_update`） | 竖线标记 + 顶部标签 | 垂直 `markLine`（`xAxis: date`） |

**已删除的 v1 交互**：「skipped/error 缺口可点击下钻」不可实现（null 点在 ECharts 中不存在、不可点击）——失败运行的查看入口在历史列表（父 spec §9 范围），不在趋势图。

### 4.4 交互行为

| 交互 | 触发方式 | 响应 | 实现要点 |
|------|---------|------|---------|
| **Hover 数据点** | 鼠标悬停 | Tooltip 显示完整信息 | 自定义 `tooltip.formatter`；插值一律 `escapeHtml`（vector-canvas 先例） |
| **点击数据点** | 鼠标点击 | 打开单次运行详情 drawer | 从 datum 取 runId（`params.data.runId`，不依赖 `dataIndex`——阈值线/多 series 下索引不对齐）；`onPointClick(runId)` 回调由 eval-tab 开 drawer |
| **图例切换** | 点击图例项 | 显示/隐藏对应指标线 | ECharts 内置 `legend.selected` |
| **粒度切换** | 点击 Day/Week/Month 按钮 | 切换 queryKey 重新请求 | 粒度 state 在 eval-tab；TanStack Query 按 queryKey 自动缓存/去重，无需手写防抖 |
| **框选放大** | 鼠标拖拽框选 | 局部放大查看细节 | ECharts `dataZoom`（`type: "inside"` + slider） |
| **双指缩放**（触摸板） | 双指捏合 | 缩放时间轴 | `dataZoom` 内置支持 |

**Tooltip 内容模板**（文案经 option 构建参数注入，见 §3.6）：

```
━━━━━━━━━━━━━━━━━━━━━
  2026-08-15
━━━━━━━━━━━━━━━━━━━━━
  ● Recall@k        89.7%  ↓2.3%
  ● Hit Rate        92.1%  ↑0.5%
  ● MRR             0.812  ↓0.023
  ○ Faithfulness    0.933  ↑0.012
  ○ Answer Relevancy 0.877 ↓0.008
━━━━━━━━━━━━━━━━━━━━━
  [点击查看详情 →]
━━━━━━━━━━━━━━━━━━━━━
```

### 4.5 组件结构（手写 echarts 适配层，复用 vector-canvas 模式）

**职责划分**：canvas 组件纯渲染（props 驱动、不 fetch、不直接调 i18n hook——文案经 props 注入），数据与状态归 eval-tab；懒加载由 eval-tab 经 `next/dynamic ssr:false` 完成（对齐 vector-tab 挂载 vector-canvas 的先例）。

```typescript
// frontend/src/components/workspace/knowledge/eval-trend-chart.tsx
"use client";

/**
 * 指标趋势画布（2026-08-24 spec §4）：echarts 手写适配层。
 * 经 next/dynamic(ssr:false) 由 eval-tab 懒加载——不进首屏 chunk。
 * jsdom 不可运行 echarts，DOM 测试中整体 mock；option 组装在
 * eval-trend-chart.utils.ts 纯函数（可测，对齐 graph-utils.ts 先例）。
 */
import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

import type { TrendChartLabels, TrendPoint, TrendResponse } from "@/core/knowledge/types";
import { buildChartOption } from "./eval-trend-chart.utils";

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

export interface EvalTrendChartProps {
  points: TrendPoint[];
  granularity: TrendResponse["granularity"];
  baseline: TrendResponse["baseline"];
  /** i18n 文案包（eval-tab 注入；保持本组件纯渲染） */
  labels: TrendChartLabels;
  onPointClick?: (runId: string) => void;
}

export default function EvalTrendChart({ points, granularity, baseline, labels, onPointClick }: EvalTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);
  // 回调经 ref 穿透，避免 identity 变化触发 setOption（vector-canvas 先例）
  const clickRef = useRef(onPointClick);
  clickRef.current = onPointClick;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container);
    chartRef.current = chart;
    chart.on("click", (params) => {
      // 从 datum 取 runId（不依赖 dataIndex——多 series / markLine 下索引不对齐）
      const runId = (params as { data?: { runId?: string } }).data?.runId;
      if (runId) clickRef.current?.(runId);
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    // 主题切换（<html> .dark）→ 全量重建（装饰层主题感知）
    const themeObserver = new MutationObserver(() => {
      chart.setOption(buildChartOption({ points, granularity, baseline, labels }), { notMerge: true });
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // init 只跑一次；数据更新走下方 merge effect
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(
      buildChartOption({ points, granularity, baseline, labels }),
      { notMerge: false },
    );
  }, [points, granularity, baseline, labels]);

  return <div className="h-[280px] w-full" data-testid="eval-trend-chart" ref={containerRef} />;
}
```

外层卡片壳（标题 + 粒度切换按钮组 + loading/空态）在 `eval-tab.tsx` 内，按钮组样式用主题 token（`bg-muted` / `bg-background shadow-sm`）。

### 4.6 ECharts 配置生成函数（纯函数，jsdom 可测）

```typescript
// frontend/src/components/workspace/knowledge/eval-trend-chart.utils.ts
// 纯函数组装 option——不 import echarts 运行时，只用类型（对齐 graph-utils.ts 先例）

export function buildChartOption(input: {
  points: TrendPoint[];
  granularity: "day" | "week" | "month";
  baseline: TrendResponse["baseline"];
  labels: TrendChartLabels;
  dark?: boolean;
}): EChartsOption {
  const { points, baseline, labels, dark } = input;
  const thresholdValue = baseline ? baseline.recall_at_k - baseline.threshold_percent / 100 : null;

  // y 轴下界动态：取数据最小值与阈值线的较低者再让 0.05，下限 0；上界恒 1
  const allValues = points
    .flatMap((p) => [p.recall_at_k, p.hit_rate, p.mrr, p.faithfulness, p.answer_relevancy, p.context_precision])
    .filter((v): v is number => v !== null);
  const yMin = Math.max(0, Math.floor((Math.min(...allValues, thresholdValue ?? 1) - 0.05) * 10) / 10);

  const layer1Series = (name: string, key: "recall_at_k" | "hit_rate" | "mrr", color: string): LineSeriesOption => ({
    name,
    type: "line",
    // datum 携带 runId——click 从 params.data 取，不依赖 dataIndex
    data: points.map((p) => ({ value: [p.date, p[key]], runId: p.layer1_run_id })),
    lineStyle: { color, width: 2 },
    itemStyle: { color },
    symbol: "circle",
    symbolSize: 6,
    emphasis: { scale: 1.5 },
  });
  // Layer 2 系列同理（虚线 + emptyCircle + runId: p.layer2_run_id），略。

  // 回退标红：Recall@k 系列的项级覆写——由 regression.detected 驱动
  //（per-category 门禁口径，§4.3.3 语义边界），与阈值线解耦
  const recallSeries = layer1Series("Recall@k", "recall_at_k", "#3B82F6");
  recallSeries.data = points.map((p) => ({
    value: [p.date, p.recall_at_k],
    runId: p.layer1_run_id,
    ...(p.regression?.detected ? { itemStyle: { color: "#EF4444" } } : {}),
  }));

  return {
    grid: { left: 60, right: 40, top: 40, bottom: 60 },
    legend: {
      data: ["Recall@k", "Hit Rate", "MRR", "Faithfulness", "Answer Relevancy", "Context Precision"],
      bottom: 0,
      selected: { "Recall@k": true, "Hit Rate": true, "MRR": false, "Faithfulness": false, "Answer Relevancy": false, "Context Precision": false },
      textStyle: { color: ink(0.75, dark) },  // 主题感知（vector-canvas ink() 先例）
    },
    xAxis: {
      type: "time",
      axisLabel: { formatter: input.granularity === "day" ? "{MM}-{dd}" : "{yyyy}-{MM}", color: ink(0.55, dark) },
    },
    yAxis: {
      type: "value",
      min: yMin,
      max: 1,
      axisLabel: { formatter: (v: number) => `${(v * 100).toFixed(0)}%`, color: ink(0.55, dark) },
      splitLine: { lineStyle: { type: "dashed" } },
    },
    series: [
      recallSeries,
      // ... 其余 5 条
      // 阈值线仅 baseline 存在时生成；silent: true 不吃点击（无 dataIndex 歧义）
      ...(thresholdValue !== null
        ? [{
            name: labels.thresholdLine,
            type: "line" as const,
            markLine: {
              silent: true,
              symbol: "none",
              lineStyle: { color: "#EF4444", type: "dashed" as const, width: 1 },
              data: [{ yAxis: thresholdValue }],
              label: { position: "insideEndTop" as const, formatter: labels.thresholdLabel(baseline!.threshold_percent), color: "#EF4444", fontSize: 11 },
            },
          }]
        : []),
      // 基线更新竖线：is_baseline_update 点的垂直 markLine
    ],
    tooltip: {
      trigger: "axis",
      formatter: (params) => buildTrendTooltipHtml(params, points, labels),  // 内部一律 escapeHtml
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "slider", xAxisIndex: 0, height: 20, bottom: 30 },
    ],
  };
}
```

---

## 5. 两个组件的联动

指标总览和趋势图在评测 Tab 中形成**垂直布局**（`eval-tab.tsx`）：

```
┌─────────────────────────────────────────────────────────────┐
│  评测 Tab                                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  运行配置 + 控制按钮（父 spec §9 范围，本 spec 占位）  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  【指标总览】（eval-metrics-overview.tsx）            │   │
│  │  Layer 1 表格 + Layer 2 卡片网格                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  【趋势图】（eval-trend-chart.tsx，dynamic 懒加载）    │   │
│  │  ECharts 折线图 + 粒度切换                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  【EvalRunDrawer】点击数据点打开（覆盖式 drawer）            │
└─────────────────────────────────────────────────────────────┘
```

**数据流（TanStack Query + lazy 门控，冻结）**：

知识库中栏六个 pane 全部 `forceMount` keep-alive 常驻——评测 Tab 的请求**必须** `enabled: activeTab === "eval"` 门控（`useWikiEntries` / `useVectorProjection` 先例），否则打开知识库页就白拉评测数据。

```typescript
// eval-tab.tsx（数据层）
const overviewQuery = useMetricsOverview(kbId, /* enabled */ active);        // GET /eval-runs/latest
const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
const trendQuery = useEvalTrend(kbId, granularity, /* enabled */ active);    // GET /eval-runs/trend
const [drawerRunId, setDrawerRunId] = useState<string | null>(null);
```

1. Tab 首次激活：两个查询同时发出（各自 queryKey 缓存，切走再切回不重复请求）；
2. 用户点击趋势图数据点 → `onPointClick(runId)` → `setDrawerRunId(runId)` → `EvalRunDrawer` 打开（数据走 `useEvalRun(kbId, runId)` → `GET /eval-runs/{run_id}`，`enabled: runId !== null`）；
3. 用户切换粒度 → queryKey 变化 → 自动重新请求（TanStack Query 去重/缓存，无需手写防抖）。

**下钻形式（v2 冻结）**：用 **drawer** 而非新路由——知识库详情视图的既有模式是 drawer（ChunkDrawer / WikiEntryDrawer / ManualCardDrawer），且知识库页是 `/workspace/knowledge?kb=<id>` 单页（tab 是本地 state，不可深链），`/workspace/kb/{kbId}/...` 路由不存在。`EvalRunDrawer` 最小契约：`run_id` 定位 + 运行元信息（environment / created_at / status）+ 两层指标只读摘要——**含 Layer 2 的 `path_accuracy`**（真实对话链路选路准确率，与 Layer 1 同名指标口径不同，只在 drawer 展示并标注口径）；逐题明细 UI 另立 spec。

---

## 6. 测试策略

### 6.1 单元测试（前端）

| 目标 | 测试点 | 文件 |
|------|--------|------|
| `Layer1MetricsTable` | 单元格三态着色（阈值来自 props 非硬编码）、缺失 category 灰显、layer1=null 空态 | `eval-metrics-overview.dom.test.tsx` |
| `RagasMetricCard` / `ArchMetricCard` | null 值显示 `-`、进度条颜色阈值、ragas_available=false Badge、has_graph_questions=false 禁用态 | 同上 |
| `getCellColorClass` / `getProgressBarColor` | 纯函数边界（delta=0 / ±threshold / 无 diff） | `eval-metrics-overview.unit.test.ts` |
| `EvalTrendChart` | canvas 整体 mock（jsdom 不可运行 echarts），断言 props 透传 | `eval-trend-chart.dom.test.tsx` |
| `buildChartOption` | 6 条 series 配置、阈值线计算与 baseline=null 时不生成、图例默认选中、regression.detected 驱动标红、yMin 动态计算、tooltip escapeHtml | `eval-trend-chart.unit.test.ts` |
| `useMetricsOverview` / `useEvalTrend` | queryKey、enabled 门控（active=false 不发出请求） | `hooks.dom.test.tsx` 扩充 |

测试基建对齐 `graph-tab.dom.test.tsx` / `vector-canvas.unit.test.ts` 先例（echarts 画布 mock、纯函数直测）。

### 6.2 E2E 测试（Playwright）

```typescript
// frontend/tests/e2e/eval-metrics.spec.ts
// 路由：知识库页是 /workspace/knowledge?kb=<id>，tab 为本地 state（不可深链）
test("指标总览正确显示 Layer 1 和 Layer 2", async ({ page }) => {
  // page.route() mock /api/knowledge-bases/* （含 eval-runs/latest + trend）
  await page.goto("/workspace/knowledge?kb=test-kb");
  await page.getByRole("tab", { name: "评测" }).click();

  // Layer 1 表格
  await expect(page.getByRole("cell", { name: "fact" })).toBeVisible();
  // Layer 2 卡片
  await expect(page.getByText("Faithfulness")).toBeVisible();
});

test("趋势图点击打开单次运行详情 drawer", async ({ page }) => {
  await page.goto("/workspace/knowledge?kb=test-kb");
  await page.getByRole("tab", { name: "评测" }).click();

  await page.getByTestId("eval-trend-chart").locator("canvas").click({ position: { x: 100, y: 100 } });
  await expect(page.getByTestId("eval-run-drawer")).toBeVisible();
});
```

### 6.3 后端测试

| 端点/单元 | 测试点 | 文件 |
|------|--------|------|
| 双 CLI 持久化 | Layer 1 CLI 写 layer1_metrics（含 recall→recall_at_k 映射）、layer2 为 `{}`；Layer 2 CLI 反之；skipped/error 行 status 正确；`environment` 推断（`CI=true`→ci）；`created_at` = 报告 generated_at；`--baseline auto` 读 is_baseline 行做 diff | `test_eval_persistence.py` |
| `--mark-baseline` | 标记后同 KB 旧 baseline 被清；唯一索引兜底（双方言 where 声明）；非 completed 运行忽略标记（旧标记保留）；`environment` 列默认值回填存量行 | 同上 |
| `aggregate_trend_points` 纯函数 | 三粒度统一末次语义、跨周/跨年/空周期边界、两层独立取数、双 run_id 来源、ci 过滤、regression 透传 | `tests/knowledge/eval/test_trend.py` |
| `GET /eval-runs/latest` | 两层独立取最近 completed 非 ci 行；无数据层为 null；skipped/error 行被排除；未知 kb 404 | `test_eval_runs_api.py` |
| `GET /eval-runs/trend` | 三粒度聚合（纯函数薄壳）、include_ci 开关、baseline 块（threshold_percent = 常量×100、无 baseline 为 null）、has_data、days_back clamp 回显、非法 granularity 422 | 同上 |
| `GET /eval-runs/{run_id}` | 单行完整 JSON；跨 kb 访问 404 | 同上 |

API 测试基建对齐 `backend/tests/knowledge/test_vector_projection_api.py`。

---

## 7. 风险与边界

| 风险 | 影响 | 缓解 |
|------|------|------|
| 趋势图数据点过多导致渲染卡顿 | 性能下降 | 限制 day 粒度最多 90 天，超出自动切换 week |
| 两层运行时间错位导致同日两条线来源不同运行 | 用户困惑 | TrendPoint 双 run_id 分开展示；tooltip 标注各层来源运行时间 |
| baseline 被误标（任何人跑 CLI 都可 `--mark-baseline`） | 阈值线漂移 | MVP 接受（CLI 本就是运维工具）；后续可加 API 侧管理 |
| echarts 进首屏预算 | 性能预算超限 | `next/dynamic ssr:false` 由 eval-tab 挂载（vector-tab 先例），不进首屏 chunk；`pnpm perf:check` 测量面无 knowledge 路由条目，无需新增预算 |
| 粒度频繁切换 | 服务器压力 | TanStack Query queryKey 缓存去重（切回已看粒度不发请求），无需手写防抖 |

**Out of Scope**：
- 多 KB 对比趋势图（单 KB 内多指标已足够，跨 KB 对比另立 spec）
- 自定义阈值线（阈值与 `DEFAULT_FAIL_THRESHOLD` 同源，前端只读展示）
- 导出趋势图为 PNG/SVG（ECharts 内置工具栏可开启，但非核心需求）
- 单次运行的逐题明细 UI（本 spec 仅冻结 drawer 壳契约，详细设计另立 spec）
- 题库 CRUD / 评测触发按钮（父 spec §9 范围）
- 评测历史运行列表（父 spec §9 范围）

---

## 附录 A：User Stories（验收视角）

| 角色 | 诉求 | 对应章节 |
|------|------|----------|
| 平台开发者 | 打开评测 Tab 3 秒内判断当前质量是否健康 | §3（指标总览） |
| 平台开发者 | 发现 Recall@k 下降后，30 秒内确认是单日抖动还是持续趋势 | §4（趋势图） |
| 平台开发者 | CI 跑 Layer 1、nightly 跑 Layer 2，总览各取最近成功运行合并展示 | §3.1/§3.2 |
| 质量负责人 | 查看 RAGAS 四指标与三个专属指标的当前值 | §3.4（Layer 2 卡片） |
| 质量负责人 | 看到回退超阈值时，一眼识别（语义色高亮） | §3.3（单元格着色） |
| 质量负责人 | 点击趋势图数据点打开单次运行详情 drawer，完成根因分析 | §4.4（点击交互） |
| 质量负责人 | 标记某次运行为 baseline 后，阈值线随之更新 | §3.1.3（baseline 机制） |
| 运维人员 | 切换 Day/Week/Month 粒度查看不同时间范围的趋势 | §4.4（粒度切换） |
| 题库维护者 | 看到「本批次无 graph 类题目」提示，理解为何 seed_hit_rate 为空 | §3.4（卡片状态） |

---

## 附录 B：TypeScript 类型定义汇总

```typescript
// 指标总览（GET /eval-runs/latest，与 §3.1 存储映射对齐）
export interface MetricsOverview { /* 见 §3.2 */ }
export interface Layer1Metrics { /* 见 §3.2 */ }
export interface Layer1CategoryMetrics { /* 见 §3.2 */ }
export interface RagasMetrics { /* 见 §3.2 */ }
export interface ArchSpecificMetrics { /* 见 §3.2 */ }
export interface BaselineDiff { /* 见 §3.2 */ }

// 趋势图（GET /eval-runs/trend）
export interface TrendPoint { /* 见 §4.1 */ }
export interface TrendResponse { /* 见 §4.1 */ }

// 单次运行详情（GET /eval-runs/{run_id}，drawer 数据源）
export interface EvalRunDetail { /* status + environment + 两层 metrics + baseline_diff + 元信息，见 §4.2 */ }

// API 请求参数
export interface TrendQueryParams {
  granularity: "day" | "week" | "month";
  days_back?: number;   // day 粒度用，默认 30（上限 90）
  weeks_back?: number;  // week 粒度用，默认 12
  months_back?: number; // month 粒度用，默认 6
}
```

---

**结束**：本 spec（v3）冻结数据供给链路（双 CLI 写入 + environment 隔离 + baseline 机制 + latest/trend/run_id 三端点）、指标总览与趋势图的数据契约、视觉规范、交互行为，与 `runner.py`（Layer 1 报告）和 `ragas_eval.py`（Layer2Report）的真实结构对齐。实施时以本文档为唯一来源，任何视觉/契约调整需先更新本文档。
