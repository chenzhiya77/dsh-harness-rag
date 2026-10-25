# RAG caption 思考截断修法小对 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-02-rag-caption-thinking-truncation-fix-design.md](../specs/2026-10-02-rag-caption-thinking-truncation-fix-design.md)
**Status:** ✅ **D1=甲′ / D2=甲 / D3=修正版 v2 已裁（2026-10-03）；Task 0/1 已交付**——Task 0 实测（端点**不认** `enable_thinking`/`thinking_budget`〔静默忽略〕、**认** `reasoning_effort:"none"` 与 vLLM 形状）→ 裁定：D1=按条目声明分发（四行分发表见 spec §2.1）、D2=读 reasoning 草稿兜底常开、D3=mimo 条目三格（用户亲手设置页，③待交互补测）。Task 2 复验待跑。

**Architecture:** Task 0 用带外探针打四变体（基线 1024 / `enable_thinking=false` / `thinking_budget` / 4096）测端点认不认参数与空返率；D1 主修法（关思考/独立预算/涨预算/兜底）+ D2 兜底叠加拍板后走 TDD，修点在 `caption_client.py` 单处，失败语义不放宽。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 主修法 | 待拍（甲=关思考 / 乙=thinking_budget / 丙=涨 4096 / 丁=兜底） | caption prompt/质量调优；抽取腿/wiki 思考口径 |
| D2 兜底叠加 | 待拍（甲=常开推荐 / 乙=主修法失效才上） | 重试策略重构 |

## 硬约束

- 修点单处（`caption_client.py`，两腿共用出站口）；失败语义不放宽（兜底也空才降级）。
- 零/一旋钮（D1=丙 才动 `caption_max_tokens` 默认值）；实测先行（拍板依据=Task 0 能力表）。
- 探针与产物在仓外 `E:\app-model\deer-flow-scratch\caption-knee\`，key 脱敏、config 不改。

## Task 0 — 端点能力实测（开工即跑，回填后拍 D1/D2）

- [x] ① **四变体探针**（`fix_probe.py`，同 640px 夹具、每变体 6 发）+ **补三个别名变体**（`fix_probe2.py`，各 3 发）实测判读：

| 变体 | 请求体附加 | 200 | 空返 | 思考 | 判读 |
|---|---|---|---|---|---|
| 基线 | `max_tokens=1024` | 6/6 | **3/6 (50%)** | 6/6 有 | 复现膝点对的空返 |
| `enable_thinking=false`（DashScope 名） | +该字段 | 6/6 | 2/6 | **6/6 照跑**（rtok 172–1024） | **静默忽略**——不 400 也不生效 |
| `thinking_budget=256`（DashScope 名） | +该字段 | 6/6 | 2/6 | **照跑**（rtok 最高 1028 ≫ 256） | **静默忽略** |
| `max_tokens=4096` | 改预算 | 6/6 | **0/6** | 6/6（rtok 最高 2083） | **有效但贵**：空返归零、思考跑更远、单发 8–49s |
| **`reasoning_effort: "none"`** | +该字段 | 3/3 | **0/3** | **0/3（rtok=0）** | ✅ **完全关思考**，正文 64–632 字符全出 |
| `reasoning_effort: "minimal"` | +该字段 | 0/3 | — | — | **400 拒**（枚举不含 minimal） |
| `chat_template_kwargs.enable_thinking=false`（vLLM 形状） | +该字段 | 3/3 | **0/3** | **0/3** | ✅ 同样完全关思考（第二条可用路） |

- [x] ② **判读表结论**：端点认 **`reasoning_effort`（OpenAI 式枚举，含 `none`）与 vLLM 形状 `chat_template_kwargs`**，**不认 DashScope 的 `enable_thinking`/`thinking_budget`**（静默忽略）。⇒ **甲可行**（两条参数路任选）、**乙不可行**、丙有效但成本高、丁可行。
- [x] ③ **兜底样本**（空返发 reasoning_preview 抽查）：**草稿里就有正文级转录**（逐字在转录界面文字，如「设置、账号、外观、通知、宠物、模型…」）⇒ 兜底取回的质量**不差**，D2=甲 有据。产物：`fix_probe.json` / `fix_probe2.json`（含逐发 reasoning_preview）。

## Task 1 — 依 D1/D2 裁定 TDD ✅（2026-10-03 交付）

- [x] RED：空返桩 + 分发桩用例写红（7 红/38 绿：分发 3〔effort 臂/形状臂换臂/Anthropic 不发〕+ 兜底 2〔reasoning_content/thinking 块〕+ 声明传递 2；阴性对照 3 常绿=未声明不发参数、正文优先于草稿、byte-identical 旧体）。红因=丢图（空返降级占位）。
- [x] GREEN：`caption_client.py` 落 `_apply_thinking_off`（分发表四行：形状优先不双发 / `effort:"none"` 默认臂 / 未声明不发=守卫行 / Anthropic 不发）+ `_openai_caption`/`_anthropic_caption` 兜底；声明经 `VlmTarget.disable_shape`/`supports_reasoning_effort` 随目标带入 ⇒ 45 绿。
- [x] neuter：反证①拆形状臂 ⇒ 恰 1 红（换臂用例）；反证②拆两兜底 ⇒ 恰 2 红；还原后 45 绿。门禁实测（2026-10-03）：`tests/knowledge` 全量 **2 failed / 1470 passed / 2 skipped / 0 errors**（2＝缺 key 环境红对 `test_embed_missing_api_key`/`test_rerank_missing_api_key`，与本改动无关；爆炸半径 worker+video+wiki+caption+vlm **293/293 绿**）+ ruff check/format **双净**（4 文件）。

## Task 2 — 复验与收尾 ✅（2026-10-03 交付）

- [x] 修后同夹具同档位空返率复验（`caption-knee/t2_recheck.py`→`t2_recheck.json`，走应用 `request_caption` 真出站口、形状臂）：**单图 0/6 空、三帧 0/6 空＝双形状 0%**（对照修前 30–52%、三帧最高 79%）；延迟单图 2.7–9.0s、三帧 4.3–6.9s（修前单发 ~11s 带思考）；正文最短 63/629 字符。
- [x] spec/plan 数字回填、提交链回填：`be529c83`（起草成对）→ `596ff3ad`（Task 0 能力表回填）→ `97f48ceb`（Task 1 TDD）→ 本笔（Task 2 复验+收尾）；scratch 留档（`fix_probe*.json`/`effort_probe.json`/`d3_verify.json`/`t2_recheck.json` 全在仓外 caption-knee\）。

## D3 三格（用户亲手设置页，零产品代码）+ 补测 ✅（2026-10-03 全验完）

- [x] ① mimo 条目思考开关写法——**终态=选 `chat_template_kwargs（vLLM / SGLang）` 格**（他两轮：先选 `extra_body.thinking` 格实测也有效〔2/2 reasoning=0，推翻「未测、别选」旧注〕，后换推荐格）。端点侧 `chat_template_kwargs.enable_thinking=false`+medium 同发 2/2 reasoning=0；离线换臂核对 body 带该形状、无 `reasoning_effort`。
- [x] ② mimo 子集去 `minimal` ✅（`[low,medium,high]`）；deepseek/qwen 的 minimal **补测 200 接受**（不 400）⇒ 两台保留合法，全对照只有 mimo 不收 minimal。
- [x] ③ 默认档 `medium` **留**——交互格实测：形状关 + medium 同发 2/2 reasoning=0 ⇒ medium 无害，留作思考开时的默认深度。
- [x] 补测三发（`caption-knee/d3_verify.py`→`d3_verify.json`）：deepseek-flash/deepseek-v4-flash/qwen3.8-flash-2 的 minimal 均 200；mimo 交互格两形状各 2 发全 0 reasoning。
- [x] 换臂复核：应用代码离线组体=**形状臂**（`thinking:{type:disabled}` 入 body、无 `reasoning_effort` 不双发）✅；同形状真调 4 发 0 空返（正文 222–362 字符）。

## 收尾

- [x] plan 复选框全勾 + 提交号回填（`be529c83`/`596ff3ad`/`97f48ceb`/Task 2 本笔，均未推送）；spec/plan 成对提交（起草 `be529c83` 起）。
