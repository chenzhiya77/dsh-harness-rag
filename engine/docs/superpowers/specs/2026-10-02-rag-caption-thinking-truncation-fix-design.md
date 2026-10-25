# RAG caption 思考截断修法小对 —— 设计

**Status:** ✅ **已裁 D1=甲′ / D2=甲 / D3=修正版 v2（2026-10-03）** —— 2026-10-02 起草；Task 0 实测 → 2026-10-03 裁定；Task 1 已交付（分发+兜底 TDD）；D3 三格由用户亲手在设置页操作（①②可点、③待交互补测）；Task 2 复验待跑。配套 plan：[2026-10-02-rag-caption-thinking-truncation-fix.md](../plans/2026-10-02-rag-caption-thinking-truncation-fix.md)。

本对一件事：修掉 **caption 空返降级**——思考模型（`mimo-v2.6-flash`）的 reasoning 把 `caption_max_tokens=1024` 吃光、content 截空（`finish_reason: length`），`request_caption` 判空抛错，真管线把该图降级成文件名占位（>30% 整腿 degraded）。修法四选，**Task 0 先实测端点能力再拍**。

**相关记录**：

- [2026-10-02-rag-caption-knee-check.md](../plans/2026-10-02-rag-caption-knee-check.md) §6 发现 1/2（空返机制与空返率随并发升 0%→79%）
- `reference-max-tokens-thinking-budget` 市场取证（三协议口径 + 三公约数：宽松上界 / 分离保答案 / 小任务不开思考）

## 1. 问题

### 1.0 一眼看懂

`mimo-v2.6-flash` 是思考模型：响应带 `reasoning_content`，思考 token 计入输出预算。`caption_max_tokens=1024` 下，**思考写满 1024 就整体收卷**（OpenAI 兼容口径的「合并收卷」），正文一个字没有 ⇒ `request_caption` 抛 `VLM returned an empty caption` ⇒ 两条 caption 腿把该图/镜头降级成占位、计入 failed。实测空返率 30–52%（单图）/最高 79%（三帧 N=16）。

### 1.1 机制证据

| 事实 | 位置 |
|---|---|
| 请求体无任何思考控制参数（`max_tokens`/`temperature` 之外全无） | `caption_client.py:41`（`_openai_request`） |
| 解析只读 `message.content`，`reasoning_content` 直接丢弃 | `caption_client.py:56`（`_openai_caption`） |
| 空答案=显式失败（三选一失败语义之一），两腿降级占位 | `caption_client.py:85-86`、`captioner.py:108-111`、`video/captioner.py:104-106` |
| 诊断：同夹具 5 发 2 空，空返发 `finish_reason: length`、`reasoning_tokens≈1024/1024`、content len=0 | `caption-knee/diag.py` 实录（2026-10-02） |
| 生成参数两腿共用 `rag.caption_*`（修点单处可覆盖两腿） | `captioner.py:84-85`、`video/captioner.py:83-84` |

## 2. 设计

### 2.1 D1 主修法（✅ 已裁 2026-10-03：甲′——按条目声明分发）

**在问什么**：空返从源头怎么止？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲：关思考**（请求体带 `enable_thinking=false`，若端点认） | 思考归零，1024 全给正文 | 市场对照六家先例（处理腿=非思考快模型）；成本还降 | 端点不认 ⇒ 无效（Task 0 会判）；caption 质量对少数图可能降 |
| **乙：思考独立预算**（`thinking_budget` 小值，截断思考即转正文，若端点认） | 百炼官方语义「超预算截断思考、立刻生成最终回复」——保答案 | 保留思考对难图的加成 | 端点不认 ⇒ 无效；思考被截时质量降 |
| **丙：涨预算**（1024→4096 宽松档） | 降概率不归零 | Dify 4096/Qwen 2× 先例，一行默认值 | 思考仍可能吃 4096；成本/时长升；高并发空返更宽 |
| **丁：兜底读 `reasoning_content`**（content 空时取 reasoning 截断尾/或重试一次） | 把丢的图找回来 | 零协议依赖、总能做 | 无主流先例（属补救）；reasoning 是草稿，质量打折 |

**裁定＝甲′（甲的方向 + 拼法改为「按条目声明发」，Task 0 反转原判后细化）**。分发表（caption 请求体发什么）：

| 条目形态 | 发什么 |
|---|---|
| OpenAI 方言 + **声明了** `when_thinking_disabled` 形状 | 发声明的形状（`extra_body` 解包深合并进 body），**不发** `reasoning_effort` |
| OpenAI 方言 + 无形状 + **声明** `supports_reasoning_effort` | `reasoning_effort:"none"`（默认臂） |
| OpenAI 方言 + 无形状 + **未声明** effort 支持 | 什么都不发（**守卫行**：未声明即不发＝防带病请求，与工厂能力闸同一把尺） |
| Anthropic 方言 | 什么都不发（Messages 思考＝显式 opt-in，不写 `thinking` 字段即不思考） |

两条不双发、声明形状优先（叠参数是 `minimal` 400 的前车之鉴）。实测可移植性：`reasoning_effort:"none"` 在 mimo / dashscope(qwen3.8-flash) / deepseek 三家均真关思考（0 reasoning），vLLM 形状 `chat_template_kwargs.enable_thinking=false` 在 mimo ✅。D1=甲′ 改完后，mimo 条目经 D3 声明形状即自动**换臂**（默认臂→形状臂），Task 1 用例已钉。守卫行＝分发表第四行（从「对其他模型 `reasoning_effort` 就是带病请求」这一质疑推出）；不要它可去掉，一处改动。

### 2.2 D2 兜底叠加（✅ 已裁 2026-10-03：甲——常开）

**在问什么**：主修法之外，丁要不要**常开**当第二道网？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲（推荐）：常开** | 无论主修法是哪个，content 空时兜底取 reasoning | 空返=丢图，兜底把「丢」降为「质量打折」；成本≈0 | 草稿文本偶尔进索引（可在 prompt/清洗里再收） |
| 乙：只在主修法失败时上 | 甲/乙生效就不加 | 面更窄 | 甲/乙被端点静默忽略时无人兜底 |

**裁定＝甲（常开）**：content 空借 reasoning 草稿（OpenAI 形读 `message.reasoning_content`、Anthropic 形读 `thinking` 块），借到当 caption、借不到才降级占位；失败语义不放宽。兜底质量有据：Task 0 空返样本的草稿里就是正文级转录。

### 2.3 D3 条目配置（✅ 已裁 2026-10-03：并入本对，零产品代码，用户亲手设置页）

**在问什么**：mimo 条目声明与端点实测不符怎么修（零形状 ⇒ 工厂四条关闭臂全空转、抽取/wiki/对话白烧思考；子集含端点 400 的 `minimal`）？

| 格 | 处置 | 理由 |
|---|---|---|
| 「思考开关写法」选 `chat_template_kwargs` | **定** | 工厂 vLLM 关闭臂（`factory.py:364`，本来就有）命中 ⇒ 发 `enable_thinking:false` 真关（实测 ✅ reasoning=0） |
| 档位子集删 `minimal` | **定**（mimo）；deepseek/qwen 待各补 1 发 minimal 据实定 | mimo 实测 400＝带病声明；删出子集后越界由 `_apply_declared_effort`（`factory.py:103`，双协议就近）自动改 low。**不补 `none`**（原则：是否思考＝flash 按钮单轴走形状，档位只管思考深度、不兼职开关） |
| 默认档 `medium` 留/删 | **待交互补测** | `enable_thinking:false` 与 medium 同发还思考吗：0 reasoning ⇒ 无害留作思考开时默认深度；还有 ⇒ 必撤 |

**边界**：四档词表＝上游 `GENERIC_EFFORT_VALUES`（通用值语言）全局**不动**；子集是**端点级**声明、不给 vLLM/SGLang 家族判刑（逐端点实测各写各的）；D3 只动 mimo 一条目（deepseek/qwen 请求逐字节不变）。**落法**：设置页 mimo 条目弹窗，用户亲手操作。**换臂**：mimo 声明形状后，D1 分发表自动从默认臂切形状臂（两拼法均实测 ✅，Task 1 用例已钉）。

### 2.4 修点与口径（定案）

修点在 `caption_client.py`（两腿唯一出站口）：`_apply_thinking_off` 请求体分发（D1=甲′）+ `_openai_caption`/`_anthropic_caption` 解析兜底（D2=甲）；声明经 `VlmTarget`（`disable_shape`/`supports_reasoning_effort`）从条目随目标带入。`caption_max_tokens=1024` 不动（甲′不靠预算）。**失败语义不变**：兜底也拿不到正文才降级占位（三选一失败语义不放宽）。

## 3. 硬约束

1. **修点单处**：两腿共用 `request_caption`/`_openai_*`，不许在腿里各修一份。
2. **失败语义不放宽**：只有「请求失败 / 空答案且兜底也空」才降级；空返修复不得把真失败也吞掉。
3. **零旋钮**：D1=甲′ 不新增配置（读条目既有声明）；D3 只用既有设置面三格，不新增控件。
4. **实测先行**：D1 拍板依据 = Task 0 的端点能力实测（认不认参数、静默忽略还是 400、4096 对照空返率），不拍脑袋。

## 4. 验收

- **Task 0 能力表 ✅**：四变体 + 三别名实测 ⇒ 端点认 `reasoning_effort:"none"` 与 vLLM 形状（真关思考）、不认 `enable_thinking`/`thinking_budget`（静默忽略）；`minimal` 400；4096 有效但贵。产物 `fix_probe*.json`/`effort_probe.json`。
- **RED→GREEN→neuter ✅**（Task 1 `97f48ceb`）：RED 7 红/38 绿 → GREEN 45 绿 → neuter ①拆形状臂恰 1 红、②拆两兜底恰 2 红；门禁 `tests/knowledge` 2 缺 key 环境红外全绿（1470 passed）+ ruff 双净。
- **复验 ✅**（Task 2，`t2_recheck.json`，走应用 `request_caption` 真出站口）：修后同夹具同档位**空返率单图 0/6、三帧 0/6＝0%**（对照修前 30–52%、三帧最高 79%）；延迟 2.7–9.0s / 4.3–6.9s（修前单发 ~11s 带思考）。
- **D3 三格 ✅**（用户亲手 + 补测 `d3_verify.json`）：形状格两拼法 mimo 都真关（各 2/2 reasoning=0）；minimal 仅 mimo 不收（deepseek×2/qwen 200 接受）；形状关+默认档 medium 同发 0 reasoning ⇒ medium 留。

## 5. 非目标

- caption 质量调优（prompt 改写、双模式调整）。
- 新增思考开关旋钮/控件（D1=甲′ 读既有声明；D3 只在既有设置面点选）。
- 抽取腿/wiki 腿的思考口径本身（D3 只修 mimo 条目声明；wiki 腿 qwen3.8-flash 条目补声明、以及「思考能力保存期探针」新小对候选，均另线）。
