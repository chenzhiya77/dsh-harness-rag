# 生成参数与 ASR 默认的代码卫生：caption 的两个参数 ＋ ASR 模型名的单一来源 —— 设计

**Status:** **✅ 已交付（2026-09-30）** —— [plan](../plans/2026-09-30-rag-caption-params-asr-default.md) **23／23**（Task 2 的 6 框为「② 甲 ⇒ 不适用」留档）；实施 `46cfaf23`（Task 0 成对入库）／`7aa70c59`（T1 后端）／`e07802c6`（T3 模板与文档）／`b29ef532`（T4 真栈，三次抓包 2048/0.15 → 1024/0.7 → 1024/0.15、三份配置逐字节还原）（均未推送）。**交付纪要（边界重申）**：A-4 只把两个参数变成"可调"、**不给"该多大"的答案**——1024 够不够、temperature 该不该更低仍是猜测（产品决定留白，§6.2 首条）；C-3 是一次**调用面收紧**：任何**新**的直接调用方必须显式给 model，`rag.video.asr_model` 成为唯一来源（§6.2 第二条）。**四项已裁（2026-09-30）：①甲 ②甲 ③甲 ④乙**（§6.1）——② 甲 ⇒ 无文件层字段／无界面／无 golden，与多模态那对零碰撞；④ 乙 ⇒ 不搭 `B-1`。除已裁项外，**默认行为全部保持现状**（1024 / 0.15 / `paraformer-zh` 都不动）。**同日起草后审查（5 条：1 必改 2 应改 2 可选）已就地修正**：必改＝Task 4 抓包腿按**甲**（caption 端点由 `models:` 条目携带、无 RAG 字段可指 ⇒ 临时探针条目 ＋ `models_config.json` 逐字节还原，**需逐次授权**）；应改＝`transcribe_video` 锚点写法、清空腿"抓包条目不动"的措辞。**可选项 2 条（常量形状守卫、引用行号写法）未加——可撤。** **2026-09-30 Task 0（只读核实，HEAD `075b3b5b`）完成，D2 按实测就地修正**：值**不在 `request_caption` 里现取配置**，改由两条腿在既有 `cfg` 点读取后传入（18 处既有桩的理由见 D2）；`transcribe_video` 的补参清单实为 **7 处**（原写"约 6 处"）。**真栈实施期两处如实记录**：首轮只改 config.yaml 的 `vlm_model` 被 `rag_config.json` 文件层覆盖（一次真 VLM 调用，无碍后续）；运行中的网关起初是旧实例（无本对代码），经用户授权处置后由含本对代码的栈接管。

**Plan:** [2026-09-30-rag-caption-params-asr-default.md](../plans/2026-09-30-rag-caption-params-asr-default.md)

**相关记录**：

- [发布前写死项盘点](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 3」＝本对（`A-4` + `C-3`；**④ 已裁乙 ⇒ `B-1` 不搭车**）；两条完整证据在那里，本文件只写改法。**`B-1` 的内容已按第六轮（2026-09-30）更正**：＝「`app_config.py:207` 一处描述修正 ＋ `rag_config_file.py:141` 一处补全」（旧账本的"甲/乙"岔口已作废）。
- `config/agents_config.py:194-203`：**per-agent 的 `temperature` / `max_tokens`** —— A-4 的现成形状（含 #4336 的论证："不同 agent 能力不同，共享一个 temperature 不合适"），本对逐字照抄其字段与范围。
- [2026-09-28 ASR 服务档](2026-09-28-rag-asr-service-tier-design.md)：`knowledge/video/asr.py` 的最近一次大改（四档 provider）；C-3 动的是同一文件的**签名默认**，实施前按符号重读、不按行号。
- [2026-09-30 多模态角色标题](2026-09-30-multimodal-role-headings-design.md)（**在飞、未提交**）：同页视频区的分块重排 ⇒ 原乙分支的串行约束；**② 已裁甲 ⇒ 本对不碰前端、与它零碰撞**（§5.2）。
- [2026-09-29 解析旋钮](2026-09-29-rag-parse-knobs-design.md)（已交付）：同为「字段提成 ＋ 模板/版本同批」的形状，本对照它的节奏走。

## 1. 目标与边界

把盘点档里两条"不规范"清掉：`A-4` 把 caption 的两个生成参数（今天写死在 `caption_client.py` 的两个模块常量）提成 `rag` 字段；`C-3` 把 ASR 模型名的**签名默认**收掉，让配置层成为唯一来源。**默认值全部保持现状。**

| 本期做 | 本期不做 |
| --- | --- |
| `rag.caption_max_tokens`（默认 1024）—— A-4 | 改默认值；per-腿拆分（**① 已裁共用 ⇒ 不做**） |
| `rag.caption_temperature`（默认 0.15）—— A-4 | 动 caption 的 prompt；动 `ANTHROPIC_VERSION`（协议常量，G-2 已判好） |
| `caption_client` 两个请求体函数各收两参数（值由两条腿从 `cfg.rag` 现取后传入；**两种方言都填**）—— A-4 | 给请求体加别的字段；动 `vlm_target.py` 的目标解析 |
| `video/asr.py` 三处签名默认去掉（`FunAsrProvider` / `WhisperProvider` / `transcribe_video`）—— C-3 | 动 `rag.video.asr_model` 的默认值（`paraformer-zh` 不变）；动 `resolve_provider`（它早就必填） |
| ~~（② 若裁乙）界面两行 ＋ 文件层两字段 ＋ golden 同批~~ **2026-09-30 ② 裁甲 ⇒ 不适用** | 保存期新校验（沿用 pydantic 的 `ge`/`le`）；把两个参数做进任何探针 |

**为什么值得做**（两条都属盘点档 §1.2 的"坏"，但性质不同）：

- **A-4（坏-A：替用户决定＋够不着）**：`_MAX_TOKENS`（`caption_client.py:27`）决定**长图／密排页面的说明会不会被静默截断**——`:26` 的注释自述"给整页转录留了空间"（Task 15），但 1024 够不够没有任何出口；`_TEMPERATURE`（`:30`，"低温度让 OCR 式转录稳定"，Task 16）决定采样确定性。**同仓反例（最有力）**：agent 侧把这两个值做成了 per-agent 配置并论证过（#4336），caption 侧却钉死——是漏做，不是设计。
- **C-3（坏-C：双真值源）**：`"paraformer-zh"` 写在三处（`asr.py:115` 的构造默认、`:396` 签名里 `:401` 的 `model` 默认，以及 `app_config.py:157` 的字段默认）；`WhisperProvider` 的 `"small"`（`:137`）是**同类默认的第三处**（register 未数到，实施期一并收）。改一处忘两处就漂移；**不经配置、直接调函数**的路径拿到的是签名默认，与配置层可能不一致。它**不是够不着**——有旋钮、界面也能改。

## 2. 决定

### D1 A-4 的两个字段（照 `agents_config` 的形状）

| 字段（`config.yaml` 的 `rag:` 段） | 类型 | 默认 | 照谁 |
| --- | --- | --- | --- |
| `caption_max_tokens`（新） | `int`，`ge=1` | `1024` | `agents_config.py:200` 的 `max_tokens`（**去掉它的 `le`** —— 那是 agent 侧的池子上限，RAG 没有对应概念；保留 `ge=1`） |
| `caption_temperature`（新） | `float`，`ge=0.0`、`le=2.0` | `0.15` | `agents_config.py:194` 的 `temperature` 逐字（含范围） |

- **①＝甲（已裁 2026-09-30）**：两条腿**共用一组**——`vlm_model` 先例（两条 caption 腿今天就共用一个模型字段；同出口、同 prompt 家族）；~~乙（四字段分腿）~~ 未采用。
- **两层声明（②＝甲，已裁 2026-09-30）**：**只进 `RagConfig`**（照 `agents_config` 先例——它那两个字段就没有 UI、不进文件层）；~~乙分支的 `RagConfigFile` 两字段 ＋ 界面 ＋ golden~~ 未采用。**不进 `MODEL_REFERENCE_FIELDS`**（不是条目引用）。
- 描述文案带上原注释的语义（"给整页转录留的空间" / "低温度让转录稳定"）。

### D2 消费点（两条腿读值 → `caption_client` 收参数填体）

| 消费点 | 今天 | 改成 |
| --- | --- | --- |
| `caption_client.py::_openai_request`（`:47`）与 `_anthropic_request`（`:56`） | 直接读模块常量 `_MAX_TOKENS` / `_TEMPERATURE` | 两个函数各收 `max_tokens` / `temperature` 参数（必填、无字面默认）；`request_caption` 同样收两参数并原样传入；**值由两条腿在既有 `cfg = get_app_config()` 点读取后传入**（Task 0 修正：不放在 `request_caption` 里现取——见下） |
| `caption_client.py:27` / `:30` 两个模块常量 | 值的唯一来源 | **删除**（值改由 `RagConfig` 字段持有）；`:26` / `:29` 两句注释随行迁进字段描述 |

**形状纪律**：只改"值从哪来"。**两条腿只多传两个值**：在各自既有的 `cfg = get_app_config()` 点读取（`knowledge/captioner.py:81` 文档图、`knowledge/video/captioner.py:75` 视频帧），经 `_caption_one`（`captioner.py:56`，随之加两参数）与 `request_caption` 落到请求体；prompt、target 解析、并发与降级语义都不动。**两种方言都要填**（Messages 形状的 `max_tokens` 是 API 必填字段，`:55` 的注释已说明"用的是 OpenAI 腿的同一个值"）。

**Task 0 修正（2026-09-30，只读核实时发现）**：值**不在 `request_caption` 里现取配置**——既有用例里钉住**两条腿** `get_app_config` 的桩共 **18 处**（`test_parser.py` 8、`test_vlm_target.py` 9、`test_recaption.py` 1），若改在 `caption_client` 里现取，这些桩全部失效、用例会去读真实仓根配置（隔离破坏）；且 `caption_client` 的定位是纯传输（模块 docstring）。改为上述"腿读值 → 收参数传入"形状。

### D3 C-3 的修法（③＝甲，已裁 2026-09-30：签名必填）

**甲（已裁）——签名默认去掉，"必须由调用方给"**：

- `FunAsrProvider.__init__(self, model: str)`（`asr.py:115`）
- `WhisperProvider.__init__(self, model: str)`（`asr.py:137`——`"small"` 一并收掉，不只收 `paraformer-zh`）
- `transcribe_video(..., model: str, ...)`（签名 `asr.py:396`，`model` 默认在 `:401`）

~~**乙——共享常量**：在 config 层（照 `SECRET_ENV_VARS` 的"knowledge 向上引用 config"方向）定义 `DEFAULT_ASR_MODEL = "paraformer-zh"`，三处签名默认引用它 ⇒ 同值不再靠人肉同步（引用本身即单一来源）。~~（未采用。）

**两案共同的不动边界**：`resolve_provider(name, *, model: str, ...)`（`:379`）**早就必填、不动**；`resolve_leg_provider`（`:171`）不收 model、不动；`rag.video.asr_model` 的字段默认（`app_config.py:157`）**不动**；`worker.py` 的调用形状不动（它今天已传 `model=cfg.asr_model`）。

**测试面**：构造器现有测试都显式传 model（`test_asr.py:232` / `:247`）⇒ 甲只需给 `transcribe_video(..., provider=fake)` 的调用点补 `model=`（Task 0 已逐处核：**7 处**——`test_asr.py` 的 `:117` / `:126` / `:133` / `:177` / `:189` / `:200` / `:434`；清单在 plan Task 0 实测）。

### D4 不做与边界

- **不改默认值**：1024 / 0.15 / `paraformer-zh` 全部保持现状（"默认该不该更大/更低"是产品决定，本对留白）。
- **不新增机制**：范围校验用 pydantic 的 `ge`/`le`（照 `agents_config`）；不造探针、不动保存期检查、不动掩码/原子写。
- **不动**：caption 两条腿各自的 prompt；`ANTHROPIC_VERSION`；`vlm_target.py`；`asr.py` 的 provider 解析与降级语义。

### D5 文档与模板同批（照对 2 的节奏）

- `config.example.yaml` 的 rag 段：**两处注释示例**（`caption_max_tokens: 1024` / `caption_temperature: 0.15`，中性占位）；`config_version` **41 → 42**（对 2 刚落 41）＋ `deploy/helm/deer-flow/values.yaml` 与 `deploy/helm/deer-flow/README.md` 同批；**模板契约用例**扩两条新键断言 ＋ 版本底线 41 → 42（照 `test_rag_config_example.py` 的 `NEW_PARSE_KNOBS` 先例）。
- `backend/AGENTS.md`：RAG 段补两个旋钮（caption 腿的描述处）；ASR 段补一句"模型名必须由调用方给"。
- 盘点档：A-4 / C-3 在交付时标已交付（Task 5）。
- **②＝甲（已裁）⇒ 仓根 `README.md` 不动**（两个参数是调优旋钮，不是用户面能力）；~~乙分支的补句~~ 未采用。

## 3. 接口与实施归属

| 接口／对象 | 本期契约 |
| --- | --- |
| `RagConfig.caption_max_tokens` / `.caption_temperature`（**新**） | D1 表 |
| ~~`RagConfigFile` 同名两新字段~~（**② 裁甲 ⇒ 不适用**） | —— |
| `caption_client._openai_request` / `_anthropic_request` / `request_caption` | 各收两参数（必填）；**值由两条腿在既有 `cfg` 点读取后传入**（Task 0 修正——`caption_client` 保持无配置依赖）；两个模块常量删除 |
| `FunAsrProvider.__init__` / `WhisperProvider.__init__` / `transcribe_video` | 签名默认去掉（③＝甲） |
| ~~设置界面~~（**② 裁甲 ⇒ 不适用**） | —— |
| ~~`response_golden.json`~~（**② 裁甲 ⇒ 不适用**） | —— |

## 4. 验收清单

1. **加载链**：无覆盖 ⇒ 两字段取字面默认（`1024` / `0.15`）；~~（② 裁乙）文件层覆盖生效、撤销回 config.yaml~~（② 裁甲 ⇒ 不适用）；范围外取值（temperature > 2、max_tokens < 1）硬报错。
2. **caption 请求体**：临时配置 ＋ `MockTransport`（不真发网）观察**两种方言**：配置改了 ⇒ 请求体跟着变；不声明 ⇒ 与今天的请求**逐字节相同**（负向对照：1024 / 0.15）。
3. **C-3 的形状**：三个签名**没有默认**（③ 甲）——断言 `inspect.signature(...).parameters["model"].default is inspect.Parameter.empty`（三处各一条）＋ 行为断言 `FunAsrProvider()` 抛 `TypeError`；`resolve_provider` / `resolve_leg_provider` 的既有形状有守卫用例。
4. **两条腿同批**：文档图与视频帧两条腿的请求体**同值**（两条腿各自从 `cfg.rag` 的同一对字段现取）——各一条正向用例。
5. ~~**界面（仅 ② 裁乙）**：视频区两行可编辑、保存不丢（B-1 形状的反向守卫）、非 RAG 隔离不变。~~ **2026-09-30 ② 裁甲 ⇒ 不适用。**
6. ~~**响应形状（仅 ② 裁乙）**：以 goldens 为基线做**双向差集**，`config`／`sources` 仅各多两键。~~ **② 裁甲 ⇒ 不适用。**
7. **门禁**：后端 ruff 双净、窄面与全量（共享加载路径）；~~（② 裁乙）前端 `pnpm check`、窄面与全量~~（不适用）。
8. **真栈**：改 `caption_max_tokens` / `caption_temperature` ⇒ 入库一张图，抓包服务里的 VLM 请求体 `max_tokens` / `temperature` 跟着变（**抓包接法**：caption 端点由 `models:` 条目携带 ⇒ 临时增删一条指向本机抓包服务的探针条目，见 §6.2）；`config.yaml`、`rag_config.json` **与 `models_config.json`** 逐字节还原。（C-3 无真栈面——纯签名形状。）

## 5. 文件影响

### 5.1 本期修改面

| 文件 | 修改 |
| --- | --- |
| `config/app_config.py`（`RagConfig`） | 两个新字段（D1） |
| ~~`config/rag_config_file.py`（仅 ② 裁乙）~~ | **② 裁甲 ⇒ 不改**（两字段只进 `RagConfig`） |
| `knowledge/caption_client.py` | 消费点（D2）；删两个模块常量 |
| `knowledge/captioner.py`、`knowledge/video/captioner.py` | 在既有 `cfg` 点读取两值并传入（`_caption_one` 加两参数）——**仅此一处变化**（D2 Task 0 修正） |
| `knowledge/video/asr.py` | 三处签名默认（D3） |
| `app/gateway/routers/rag_config.py` | **不改**（② 裁甲 ⇒ 无文件层字段） |
| ~~`frontend/…`（仅 ② 裁乙）~~ | **② 裁甲 ⇒ 不改** |
| `backend/tests/…` | 加载链、请求体（两方言）、签名形状、调用点补参数 |
| `config.example.yaml`、chart 两件、`backend/AGENTS.md`、盘点档 | D5 |

**明确不改**：`knowledge/captioner.py` 与 `knowledge/video/captioner.py` 的**其余形状**（prompt、target 解析、并发与降级语义——只多传两个值，见 D2 Task 0 修正）；`knowledge/vlm_target.py`；`asr.py` 的 `resolve_provider` / `resolve_leg_provider`；`knowledge/worker.py`；caption 的 prompt；`ANTHROPIC_VERSION`。

### 5.2 碰撞面

- **多模态角色标题那一对（2026-09-30，在飞、未提交）**：文件面＝视频区 JSX ＋ i18n 三文件 ＋ `frontend/AGENTS.md` ＋ 同份 DOM 用例。**② 已裁甲 ⇒ 本对不碰前端、与它零碰撞**（~~原乙分支的"排在其后"串行约束不适用~~）。
- **对 2（2026-09-29，已交付）**：同文件 `app_config.py` / 模板（② 裁甲 ⇒ 不碰 `rag_config_file.py`／golden）⇒ 全是加法、无语义冲突；`config_version` 从它落下的 **41** 起跳。
- **ASR 服务档（已交付）**：`asr.py` 的最近一次大改；本对只动签名默认，`resolve_provider` 的形状不动。

## 6. 裁定记录与已知代价

### 6.1 裁定记录（**四项均已裁，2026-09-30：①甲 ②甲 ③甲 ④乙**；各附四件套）

| # | 在问什么 | 选项 | 裁定与理由 | 选错后果 |
| --- | --- | --- | --- | --- |
| **①** | A-4 两条腿共用还是分腿 | 甲 共用一组；乙 四字段分腿 | **✅ 已裁＝甲** —— `vlm_model` 先例（两条腿今天就共用一个模型字段）；同出口、同 prompt 家族；分腿是给"两种画面各自调优"留门，暂无需求 | 选乙：字段/界面/golden 面翻倍，且"文档图调完视频没跟上"成为新的双真值源 |
| **②** | 进不进设置界面 | 甲 只配置层；乙 进界面两行 | **✅ 已裁＝甲** —— `agents_config` 的对应字段就是配置层 only（形状对齐）；视频区正被他线重排（不搭车）；代价＝界面用户改不了，须手改 config.yaml | 选乙：前端面 ＋ golden ＋ i18n ＋ 串行等待；收益是两个低频调优旋钮 |
| **③** | C-3 的修法 | 甲 签名必填；乙 共享常量 | **✅ 已裁＝甲** —— "必须由调用方给"让配置层成为**唯一**来源；乙的引用也是单一来源、可接受，但常量位置与方向要再定一次 | 选乙：多一处常量归属决定；甲的实施面只是一把删默认＋补测试参数 |
| **④** | `B-1` 描述修正搭不搭车 | 甲 搭（**2026-09-30 第六轮更正后的内容**：`app_config.py:207` 一处描述修正 ＋ `rag_config_file.py:141` 一处补全；旧账本的"甲/乙"岔口已作废）；乙 不搭 | **✅ 已裁＝乙** —— 对 3 已是"两件小事"的拼车，第三件会让一句话范围失真；它随时可搭对 4 | 选甲：多两处描述改动与一次核对，无实质风险 |

### 6.2 已知代价与登记不改

- **A-4 只把参数变成"可调"，不给"该多大"的答案**：`max_tokens` 够不够、temperature 该不该更低仍是猜测（产品决定留白）。
- **C-3 的签名必填是一次调用面收紧**：任何**新**的直接调用方必须显式给 model；存量调用点已逐处核过（构造器测试显式传；`transcribe_video` 的 fake 调用补参）。
- **`WhisperProvider` 的 `"small"` 是 register 未数的同类默认（实施期发现）**：③ 按"所有签名默认"一把收，不只收 `paraformer-zh`。
- **真栈验收的边界**：A-4 的请求体证据走抓包服务（对 2 的先例），但 **caption 的端点由 `models:` 条目携带、没有 RAG 字段可指**（`vlm_target.py:10`：命名不到条目即配置错误）⇒ 抓包腿需要**临时增删一条探针 `models:` 条目**（经用户逐次授权；`models_config.json` 先存档、结束逐字节还原）；C-3 无真栈面。

后续不再重开本对的两项改法（A-4 / C-3；`B-1` 已裁不搭车、不在本对）；实施中若确遇新事实，按本文件的更正惯例**追加**一条（不改写已裁的行）。
