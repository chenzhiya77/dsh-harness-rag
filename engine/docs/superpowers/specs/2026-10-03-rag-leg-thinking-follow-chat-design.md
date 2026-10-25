# RAG 功能腿思考「跟随 chat」勾选 —— 设计

**Status:** ✅ **D1=甲 / D2=甲 已裁并交付（2026-10-03）** —— UI 形态他已定（多选下拉框，勾=跟随 chat、不勾=现状）；D1=每角色一布尔、D2=caption 生效层联动 4096。Task 0–5 全交付（含真栈端到端验收四相）、触发器文案复审定甲（plan 有实测与提交链），**零待拍**。配套 plan：[2026-10-03-rag-leg-thinking-follow-chat.md](../plans/2026-10-03-rag-leg-thinking-follow-chat.md)。

本对一件事：把五个 RAG 功能腿的思考口径从**写死不思考**变成**用户可勾选「跟随 chat」**。UI 形态他已定（多选下拉框，勾=跟随 chat、不勾=现状），本对把机制、配置形状、caption 预算联动落定。

**⚠️ 翻案记录**：本对**推翻** D7/D8（[2026-10-01 图谱腿并发化](2026-10-01-rag-graph-extract-concurrency-design.md) 的「索引期不带思考、**不落旋钮**」）。翻案理由=用户控制权优先（他的产品裁定），且**默认全不勾=零行为变化**、市场默认（六家全关）被保留为 UI 默认值而非禁令。D7 的数据（T5 A/B +4.6pp 噪声级）仍作为「默认不开」的论据保留。

**相关记录**：

- `reference-kg-rag-thinking-market`（六家市场对照：处理腿全关、思考只在 QUERY 侧）
- `project-rag-chat-thinking`（chat 三层链 + 索引腿现状：抽取/wiki 真关、拼法探针 B=2/2）
- [2026-10-02-rag-caption-thinking-truncation-fix-design.md](2026-10-02-rag-caption-thinking-truncation-fix-design.md)（caption 思考截断空返前科 + D2 reasoning 兜底已常开）

## 1. 问题

### 1.0 一眼看懂

五个功能腿（图谱抽取/百科生成/裁判/考题合成/图片描述）的构造点裸调 `create_chat_model(name)`、吃签名默认 `thinking_enabled=False` ⇒ 想开思考没有任何通道，只能改代码。用户要的是：**在设置页勾一下，某条腿就像 chat 一样带思考**；不勾保持现状（不思考）。

### 1.1 机制证据

| 事实 | 位置 |
|---|---|
| 五角色模型字段齐备（`extract_model`/`wiki_model`/`judge_model`/`synthesis_model`/`vlm_model`） | `config/app_config.py:191-200`（RagConfig） |
| 抽取构造点裸调（默认 False） | `knowledge/graph/extractor.py:130` |
| wiki 构造点裸调 ×2（`generator.py:220` + `worker.py:962`） | 同左 |
| eval 裁判裸调（`build_judge_llm`）/考题合成裸调 | `knowledge/eval/factory.py:59,72`、`eval/synthesis.py:149` |
| 新布尔写入链是**双层**（漏一处=勾选静默无效）：独立 schema + 网关字段遍历 | `config/rag_config_file.py:74`（`MODEL_REFERENCE_FIELDS`）、`gateway/routers/rag_config.py:393` |
| caption 两腿走裸 HTTP 出站口，D1 甲′ 只做**关闭**分发 | `knowledge/caption_client.py`（`_apply_thinking_off`） |
| chat 恒发 true、条目闸在 `lead_agent/agent.py:762-764` | 提交公式 `core/threads/hooks.ts:2294` |
| 工厂两分支按 `thinking_enabled` 发开/关形状（条目声明的 `when_thinking_*`） | `models/factory.py:348-372` |

## 2. 设计

### 2.0 UI 定案（他已拍，无待拍）

设置页 RAG 默认模型配置区加**一个多选下拉框**：

- **行 = 五个角色位**（图谱抽取模型 / 百科生成模型 / 裁判模型 / 考题合成模型 / 图片描述模型），每行两列=角色名 + 该位当前所选模型名（2026-10-06 复审：由行内「角色名 · 模型名」改两列对齐，模型列跨行对齐）；同模型被两位选中=两行、各自独立勾。
- **勾 = 跟随 chat**：该腿 `thinking_enabled=True`，与 chat 完全一致的处理——含条目闸（条目 `supports_thinking: false` ⇒ 闸回不思考 + warning，同 chat）+ 条目默认档位照发。
- **不勾 = 现状**：`False`（发关闭形状/白烧防线），**默认全不勾 = 零行为变化**。
- **占位文案在框内背景、前置无标签**（文案 2026-10-03 复审定为甲：空闲「思考跟随对话模型（未选择）」→ 勾选后「（已选 N 项）」；初版「思考 · 跟随 chat（点击开启）」因中英混排+指令尾注退役），一动手就让位。

### 2.1 D1 配置形状（✅ 已裁=甲）

**在问什么**：勾选状态落进 `rag:` 配置块的形状是哪种？

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲（✅ 已裁）：每角色一布尔**（`extract_thinking`/`wiki_thinking`/`judge_thinking`/`synthesis_thinking`/`vlm_thinking`，默认 `False`） | 与 `*_model` 一格对一格并排命名 | 复用既有配置词汇（他的 UI 原则）；类型自明免校验；每个角色读写一处 | 5 个新字段，配置面略宽 |
| 乙：单列表字段（`thinking_roles: ["extract", …]`，默认空） | 勾=角色名进列表 | 一个字段装五个勾、与一个下拉框一一对应 | 列表值要校验合法角色名；与 `*_model` 的并排结构不一致 |

### 2.2 D2 caption 预算联动（✅ 已裁=甲）

**在问什么**：图片描述那行勾上（思考开）时，`caption_max_tokens`（1024）怎么办？——思考吃输出预算，1024 下空返 30–52%（前科实录）。

| 选项 | 含义 | 推荐理由 | 选错后果 |
|---|---|---|---|
| **甲（✅ 已裁）：生效层联动** | `vlm_thinking: true` 时 caption 腿实际发送 `max_tokens = max(用户 caption_max_tokens, 4096)`（保底 4096、不砍用户调高的值；配置字面不动） | 勾了就能用，空返前科从源头堵住；取消勾选即回 | 成本/时长升（输出预算保底×4） |
| 乙：只提示 | UI ⓘ「开思考建议同步调高 caption_max_tokens」 | 用户全权 | 多数人不调 ⇒ 空返换形态回来（兜底=reasoning 草稿、质量打折） |
| 丙：不联动 | 靠已常开的 D2 reasoning 兜底保命 | 零新机制 | 同乙且连提示都没有 |

### 2.3 修点与口径（定案，无待拍；含 2026-10-03 审查修正）

- **共享条目闸（审查①）**：五构造点不走 `lead_agent`，闸（`agent.py:762-764`：`supports_thinking` 假 ⇒ 降级 `False`+warning）不能"继承"、要**复刻**——工厂对裸传 `True` 的行为是 `factory.py:348-350` **raise**（条目有思考声明但 `supports_thinking: false`）或**静默不发**（零声明 ⇒ 端点默认照想），两者都≠chat、前者会把索引跑炸。落法=一个包装函数 `create_rag_chat_model(name, *, thinking: bool, …)`（落在 `knowledge/model_target.py`）：先过闸再调 `create_chat_model`，五构造点（wiki 两处）全走它。
- **写入链双层（审查③）**：新布尔同时进 `config/rag_config_file.py`（独立 schema）与 `gateway/routers/rag_config.py` 字段遍历，漏一处=勾选静默无效。
- **caption 开启分发（审查④）**：`VlmTarget`（`vlm_target.py:70-76`）扩 `enable_shape`（条目 `when_thinking_enabled`）与 `supports_thinking`；勾选且条目不支持 ⇒ 同款降级（发关闭形状+warning）。出站口加 `_apply_thinking_on` 对称于既有 `_apply_thinking_off`（无声明不发）。
- 工厂不动——开/关分发已在那里，本对只把"谁说开"的输入接出来。
- 「跟随 chat」的定义=**与 chat 完全一致**：条目闸、默认档位、warning 行为全对齐，不发明第三种语义。

## 3. 硬约束

1. **默认零行为变化**：全不勾时，五腿请求体与今天逐字节一致。
2. **跟随 chat 语义唯一**：勾选后与 chat 同款处理（含条目闸），不许出现"勾了但条目不认识"的第三态。
3. **行=角色位**：同模型多选互不干扰。
4. **翻案留痕**：D7/D8 的翻案记录进本 spec + 图谱并发化 spec 的状态行加一行指回。

## 4. 验收

- **RED→GREEN→neuter**：按 D1/D2 裁定写红（勾选角色 ⇒ 构造点带 `thinking_enabled=True`；默认全 False 零变化；**勾选 + 条目 `supports_thinking: false` ⇒ 降级 `False`+warning（审查⑥）**；caption 开启分发 + D2 联动）；门禁 `tests/knowledge` + models 面 + ruff 双净。
- **真栈**：勾一格 ⇒ 该腿请求体带开启形状（探针实录）；不勾 ⇒ 与基线逐字节一致；`vlm_thinking` 勾上后 caption 请求 `max_tokens` 按 D2 裁定。
- **UI**：下拉框五行/勾选保存热重载生效/占位文案在框内无前置标签。

## 5. 非目标

- 对话腿的思考开关（10-03 已结案「跟随条目」，本对不碰）。
- 档位（深度）选择面——勾选只带条目默认档，不开档位旋钮（档位不兼职开关）。
- 思考能力保存期探针（另一候选，已判搁置）。
