# RAG 图谱腿 chunk 级并发 —— 设计

**Status:** ✅ **已定稿（2026-10-01）** —— **待拍清零：D1 已裁（结构性）/ D2 已裁 = 甲（`rag.extract_concurrency` 默认 8，实测膝点）/ D3 已裁 = 乙（瞬态重试 2 次后按 chunk 软失败）/ D4 已裁（gleaning 留 chunk 内）/ D5 已裁 = 二期（实体名 embed 不攒批）/ D6 非目标固定 / D7 已裁（抽取不带思考 + 选型三标准）/ D8 已裁 = 思考 A/B **并入本对**（用户裁「放一起」，2026-10-01）**。**2026-10-01 追补三笔**：§2.1 多模型膝点对照（含探针口径教训）、D7、D8。**2026-10-02：D8 结论已拍 = 甲+wiki**（不落思考旋钮、D7 转正为裁定、wiki 生成一并钉不带思考，见 §3.6 结论）；**本对已交付**（plan 32/32 框收官）。配套 plan：[2026-10-01-rag-graph-extract-concurrency.md](../plans/2026-10-01-rag-graph-extract-concurrency.md)（同批成对）。**⚠️ 翻案指回（2026-10-03）**：D8=甲+wiki 的「不落思考旋钮」半边已被 [2026-10-03 思考勾选小对](2026-10-03-rag-leg-thinking-follow-chat-design.md) 推翻——五个角色位各落一个默认关的「跟随 chat」勾选（用户控制权优先）；「默认不开」及 D7 的数据（T5 A/B +4.6pp 噪声级）保留为默认值论据。

本对一件事：**图谱抽取腿从"逐 chunk 串行"改为"chunk 级有界并发"**，并发数 N 由 2026-10-01 真调用实测定为 8。除执行顺序由"逐个"变"并发"外，**语义零变化**（同样的抽取结果、同样的落库、同样的断点续跑与软失败契约）。

**相关记录**：

- [2026-09-22-reasoning-replay-default-design.md](2026-09-22-reasoning-replay-default-design.md)（模型条目线；与本对**零文件重叠**）
- 限速旋钮 `rag.extract_rate_limit_rps` 已在 2026-10-01 由用户在子会话整体删除（8 文件 −25 行，未提交）——本对**不恢复它**，节流改由并发数本身承担（D2）。

## 1. 问题

### 1.0 一眼看懂

**现状**：图谱腿是全流水线最慢阶段，且**逐 chunk 严格串行**——每个 chunk 2 次串行 LLM 调用（抽取 + gleaning 补抽）外加 1 次实体名 embed，全部排队执行。单次抽取实测 ~11s（见 §2），13 chunk 的文档仅这一条腿就要 **~5 分钟**，100 chunk 的 PDF 要 **~37 分钟**。

**本对之后**：同一循环改成 N=8 路并发，墙钟 ≈ `ceil(C/8) × 2T`；13 chunk 篇从 ~290s 降到 **~40s（约 7 倍）**，100 chunk 篇从 ~37min 降到 **~4.5min**。

```
改的                                      不改的
──────────────────────────              ──────────────────
① graph/indexer.py 的 chunk 循环（并发化）  腿间顺序（向量腿 → 图谱腿仍串行）
② RagConfig 新字段 extract_concurrency     gleaning 语义（仍 1 轮、chunk 内串行）
③ 瞬态 LLM 错误兜底（D3）                  断点续跑 / 软失败 / 进度口径 / 落库结构
④ 文档三处（AGENTS.md / example / 用例）    wiki、解析缓存、实体名 embed（二期）
```

### 1.1 为什么慢（已核实的调用账）

图谱腿每 chunk：`extract_graph`（1 次 LLM）→ gleaning（1 次 LLM，对话式追问，`extractor.py:138-151`）→ 实体名 embed（1 次 HTTP，`graph/indexer.py:166`）。循环体在 `graph/indexer.py:146` 一个 `for chunk in pending` 里**全串行**。chunk 之间没有数据依赖（跨 chunk 实体合并本就在其后的 `resolve_entity_aliases` 统一做），**天然可并行**。

## 2. 实测基线（2026-10-01，真调用）

抽取模型 = `mimo-v2.6-flash`（`extract_model` 未声明 → RAG 默认 → 合并列表第一条，`require_usable_rag_target` 解析结果）；样本 = 库内真实 chunk（2178 字符，token_count≈1024）；探针脚本一次性用后已删。

| 形态 | 墙钟 | 单发延迟 | 吞吐 | 429/错误 |
|---|---|---|---|---|
| 串行 ×3 | 32.1s（9.67 / 11.15 / 11.27） | 中位 **11.15s** | 0.09 req/s | 0 |
| 并发 8 | **10.53s** | 7.19–10.53s | **0.76 req/s** | 0 |
| 并发 16 | 20.57s | 13.02–20.57s | 0.78 req/s | 0 |

token 成本：每调用 in=887 / out≈650–1400（中位 ~1000）≈ **1.9K tok**；输出 token 速率两次并发都是 **~760 tok/s**。

**膝点判定**：8 → 16 并发吞吐几乎不变（0.76 → 0.78 req/s，输出 tok/s 两次相同），单发延迟却翻倍 ⇒ **端点在 8 路附近已饱和**（处理吞吐上限 ~760 out-tok/s，疑似档位配额），再加并发只加延迟不加吞吐。**N = 8 是这台端点的膝点**，也是全局在飞上限 `worker_concurrency(2) × 8 = 16`（实测"不亏也不赚"档）的合取。

**换端点/换模型时的重推公式**（写入字段描述与 AGENTS.md）：

```
N = min( (RPM ÷ 60) × T ,  (TPM × T) ÷ (60 × K) ,  文档粒度需要 )   ← 本机实测膝点 8
T = 单次抽取延迟（本机 11.15s），K = 每次 token（本机 ~1.9K）
```

### 2.1 多模型膝点对照（2026-10-01 追加实测，同 chunk/同探针）

| 模型（端点） | 串行 T 中位 | 输出/次 | burst8 / burst16 吞吐 | 膝点 |
|---|---|---|---|---|
| mimo-v2.6-flash（`api.xiaomimimo.com/v1`，现用） | 11.15s | ~1K | 0.76 / 0.78 req/s（平） | **8**（唯一在 8 饱和的） |
| mimo-v2.6-pro（同端点） | 23.59s | ~1.3K | 0.16 / 0.28（仍涨） | >16（straggler 至 57s） |
| deepseek-flash **思考开**（`api.deepseek.com`，探针默认口径） | 7.73s | 1.6K–14K | 0.21 / 0.32（仍涨） | >16（思考 token 计入 completion） |
| deepseek-flash **思考关**（生产口径：条目 `when_thinking_disabled → thinking:{type:disabled}`） | **3.06s** | ~800 | **2.09 / 3.24（仍涨）** | >16（全场最快：比 flash 单发快 3.6×、吞吐高 4×） |

两条结论：**① N 是「模型×端点×档位」组合属性**——默认 8 只对现用 flash 成立，换 `extract_model` 必须重探（burst8/16 两发即可定膝点）；**② 探针必须带生产同款 thinking 开关**，否则数字口径全偏（deepseek 那行"输出爆炸/成本红旗"即探针误开思考所致，生产口径撤销）。deepseek-flash（思考关）是 `extract_model` 的现成提速选项，但 **JSON 可解析性未验**，换前须过解析成功率一关。

## 3. 设计

### 3.1 D1 并发结构（已裁：结构性）

`graph/indexer.py::index_document_graph` 的 `for chunk in pending`（`:146`）改为：

- `asyncio.Semaphore(N)` + `asyncio.gather`，每 chunk 一个协程任务，任务体 = 现循环体原样（`extract_graph` → 实体名 embed → `normalize_extraction` → `graph_store.upsert_entities/relations` → `store.update_chunk_extract`）；
- 每任务**返回**本 chunk 的结算（done/empty/failed + 实体名列表），主协程统一合并 `backfill` / `touched_entities` / `stats`，**按 `pending` 输入序归并**（Task 0 定形：输出与串行版逐项含顺序等价，`test_graph_indexer.py:185` 的列表序断言因此不动）；**结尾的两笔批写保持现状一次执行**（`set_chunk_entities` `:181-182`、实体向量批 `:186-202`）；
- 单 chunk 失败隔离与现在相同（`ExtractionError` → `extract_status=failed` + 继续），断点续跑的 `pending` 过滤（`:132`）不动。

### 3.2 D2 并发数来源（已裁 = 甲）

**甲：新配置项 `rag.extract_concurrency`，默认 8**（`ge=1, le=32`；32 是防呆上限）。理由：N 随抽取端点的档位/延迟而变（§2 公式），固定魔法数换端点就失真；默认 8 有本机实测背书。**读取时机跟 `table.card_mode` 先例**（`worker.py:518` 每次解析前 `get_app_config()` 现读）：worker 在进入图谱腿时现读，改配置**热生效**、免重启。乙（代码常量）已否：撞档位配额时无处可调。

### 3.3 D3 瞬态 LLM 错误兜底（已裁 = 乙）

**现状缺陷（并发会放大它）**：`index_document_graph` 只捕 `ExtractionError`（JSON 解析失败）；限流/超时这类 API 级错误会穿透到 `worker.py:416` 的 `except Exception`，把**整篇文档打成 failed**（靠 retry 端点恢复）。并发 N 路后撞 429 概率同倍增长。

**乙：`extract_graph` 内对 API 级瞬态错误退避重试 2 次（0.5s×2ⁿ，与 `embedder_openai.py:198-214` 同风格），仍失败则按 chunk 软失败**——记 `extract_status=failed` + `error` 原因、继续其余 chunk（与 `ExtractionError` 同路径）。甲（只软失败不重试）已否：偶发 429 会让 chunk 白丢一次抽取；丙（维持现状）已否：整篇打挂的失败面配不上并发化。注意 `factory.py:402` 的 `max_retries=1` 不动——重试预算收在抽取这一层，不放大到所有模型调用。

### 3.4 D4–D7 边界（已裁）

- **D4**：gleaning 那一轮**留在 chunk 内部串行**（对话式追问，第二问带第一答，不可并行）——每 chunk 仍 2 次调用，chunk 与 chunk 之间并行。
- **D5**：每 chunk 的实体名 embed（`:166`）**一期不攒批**（N 路下已是 N 个并行 embed 调用，够用）；攒批列二期。
- **D6 非目标**：不与向量腿并行（向量腿秒级，重叠收益小、进度模型要重写）；不动生成 wiki、解析缓存、`worker_concurrency`、`gleaning_rounds`；不恢复限速旋钮。
- **D7 抽取不带思考（已裁，2026-10-01 追补；2026-10-02 甲转正为"裁定"）**：图谱抽取是批量、高频、schema 明确的离线任务，**裁定保持 `thinking_enabled=false`**（现状即如此：`extractor.py:125` 不传该参、工厂默认 `False`，`factory.py:269`；条目关闭形态随请求下发——有 `when_thinking_disabled` 显式关 / 只有 enabled 形态工厂合成关 / 什么都没接则吃端点默认，`factory.py:353-372`）。依据 = 思考实测单发慢 2.5×、token 贵 2–17×（§2.1 deepseek 两行），而质量增量未证明。**`extract_model` 选型三标准**：① 不开思考 ② 严格 JSON 遵从好 ③ 解码快。**附注**：`reasoning_effort`（默认档）是另一轴、关思考也照发（实测 wire 可见），deepseek 无害但个别端点可能报错。**wiki 生成（`wiki_model` 腿）同裁定不带思考**（2026-10-02 随甲一并钉：机制同源=构造不传开关/条目形态/端点默认；市场同向=GraphRAG community reports、RAGFlow Wiki 模板均非思考模型；wiki 内容自图谱二手传递，思考增益更不可辨）。**二期候选（待裁）**：输出瘦身（description 可选/短化）、`gleaning_rounds` 可配——不动本期范围。（思考 A/B 已由 D8 提前进本对，结论见 §3.6。）

### 3.5 进度与并发安全（不变式）

`progress_callback` 的 `settled` 计数（`worker.py:348-350`）在并发下的安全性：`settled += 1` 与 `await _report()` 之间没有让出点竞争窗口（asyncio 协作式调度，单线程），计数保持**单调**；输出侧由主协程按 `pending` 输入序归并（D1，Task 0 核实定形）⇒ `stats`/落库与串行版**逐项含顺序**等价，现有顺序型断言**全部不动**（全文件仅 `:185` 一处真顺序断言，用保序合并化解，见 §4）。

### 3.6 D8 思考 A/B 并入本对（已裁 = 放一起，2026-10-01）

**目的**：用数据判断"抽取开思考"有没有质量价值，再决定要不要补思考旋钮（原二期候选，用户裁并入本对）。

**方法（零产品代码改动即可跑）**：同一批文档建**双库对照**——A 组 = 抽取思考关（现状口径），B 组 = 抽取思考开（`create_chat_model(..., thinking_enabled=True)`）；**除 thinking 外逐参相同**（同 `extract_model`、同 N、同 chunker、同 embedding）。`extract_graph` 本就接受 `llm=` 注入（`extractor.py:128`），用一次性脚本驱动两组抽取入库即可，不动生产代码。然后各跑 Layer-1 评测（`backend/scripts/run_rag_eval.py` + golden 集）对比 **Recall@k（分 category）**，顺带记抽取成本账（token / 墙钟）。

**判定**：结果交用户拍板。建议门槛：**提升 <3 个百分点 ⇒ 不值得**（成本实测单发慢 2.5×、token 贵 2–17×，且思考输出方差大伤 JSON 确定性）；≥3pp ⇒ 进落法。

**落法（条件）**：值得 ⇒ 新键 `rag.extract_thinking`（默认 false）+ `get_extract_llm` 传参一行 + 文档；不值得 ⇒ D7 从"约定"转正为"裁定"，候选关闭。

**已知代价提示**：B 组（思考开）抽取会显著慢（实测 out 5.3K–17.7K、T 20–62s），属预期，用同 N=8 并发摊平；两组都跑完才算一次完整 A/B。

**结论（2026-10-02 判定 = 甲+wiki，已交付）**：三列实测（39 chunk golden 语料、Layer-1 图谱路 Recall@5，n=20）——A 思考关 **0.725** / B1 思考开·条目原 8192 预算 **0.050**（35/39 片 JSON 被思考吃穿预算截断）/ B2 思考开·32K 预算 **0.767**；剔除 2 题无标注问（n=18）B2−A = **+4.6pp**，但逐题仅 3 题翻转（2 涨 1 跌、单题粒度 5.6pp）=**噪声级证据**，成本 4× token（completion 9.5×，reasoning 602K）· 13.6× 单发时延。**判定：不值得补 `rag.extract_thinking` 旋钮**——D7 转正为裁定、**wiki 生成一并钉不带思考**，Task 6 按替代路径关闭。**结构性注记**：① 生产抽取条目 `qwen3.8-flash` 无 thinking 形态，旋钮在今日配置上是空转（wire 两态逐字节相同），要开思考必须「换条目+预算随思考抬」两件同做；② 市场对照同向（LightRAG 明文"thinking mode disabled"、Graphiti 小模型+"no reasoning"、GraphRAG gpt-4.1+警告 o 系 CoT 伤抽取；全行业无抽取/摘要思考开关先例，思考只出现在 QUERY/回答侧）；③ 若将来要追"思考帮概念类抽取"假设，先扩 golden（每 category 20+ 题）再谈——查询侧思考是唯一保留的潜在落点（LightRAG 位置），不在本对范围。

## 4. 测试计划（TDD，先红后绿）

改造面：`backend/tests/knowledge/graph/test_graph_indexer.py`（现有用例先改集合语义）+ `backend/tests/test_rag_config.py`（新字段默认值/校验，沿用被删旋钮留下的用例位）。

**RED（并发化前先写）**：
1. **并发上限生效**：桩 LLM 记录在飞峰值，C=12、N=4 时峰值 >1 且 ≤4；
2. **结果等价**：混合 done/empty/failed 的 chunk 集，`stats`/落库内容与串行基线**逐项含顺序**相等（Task 0 定形：实现保序归并；`test_graph_indexer.py:185` 列表序断言**不动**，其余断言本就集合/计数语义）；
3. **进度单调**：`progress_callback` 序列单调不减且终值 = total；
4. **瞬态软失败**：桩 LLM 第 1 次抛 APIError、第 2 次成功 ⇒ chunk 照常 done；连续抛 ⇒ 该 chunk `failed`、其余 chunk 不受影响、文档不整体打挂。

**GREEN 后回归**：`tests/knowledge/graph/` 全套 + `make lint`。

## 5. 验收（真栈，前后对照）

同一篇 13 chunk 级 docx 重传（或 retry 复用），记图谱腿墙钟：

| 指标 | 验收线 |
|---|---|
| 图谱腿墙钟（13 chunk 篇） | **≤ 90s**（串行口径 ~290s；目标 ~40s） |
| `extract_status=failed` chunk 数 | 与串行基线持平（并发不新增失败） |
| 两文档并发上传（worker_concurrency=2） | 总时长不劣于两篇串行之和 |

## 6. 影响面

- 源文件 3 个：`knowledge/graph/indexer.py`（循环并发化）、`knowledge/graph/extractor.py`（D3 重试）、`config/app_config.py`（新字段）+ `knowledge/worker.py` 传参一处；
- 配置面 1 个新键：`rag.extract_concurrency`（默认 8，热生效）；`config.example.yaml` rag 块与 `backend/AGENTS.md` 旋钮表同步；
- 对外 API、表结构、Qdrant、检索三路：**零变化**。
