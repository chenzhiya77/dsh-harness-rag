# 收口四条：字面默认模型名 ＋ 错误文案语言 ＋ 示例占位 ＋ 文档载体 —— 设计

**Status:** **2026-09-30 起草，待开工。** **五项待裁**（§6.1：① A-1 的收口形状；② C-1 的语言策略；③ C-2 的占位与"活跃/注释"形态；④ `B-1` 搭不搭车；⑤ `config_version` 升不升）。**本轮只产出文档，未实现、未提交**；不读改真实 `config.yaml` / `rag_config.json` / `models_config.json`。**起草前已对 HEAD `fed54dc5` 逐条核现状，并在 HEAD `75f3a186` 复核**（他线两笔 `e86005a1`／`75f3a186` 全为前端 ＋ plan 文档、**零后端重叠** ⇒ 核实结论成立；账本行会漂移——`A-1` 行号已随对 3 移位、`vlm_model` 字面量已退役、`B-1` 两处行号已移位），核出的现状写进本文件；与账本不符处已就地注明。**同日起草后审查（7 条）已就地修正 5 条**（① 基线复核、③ C-2 补漏行、④ 起点句标注、⑤ A-1 前端结论、⑥ ASR 收口点）。**2026-09-30 用户裁定：②＝乙（中英双语）**；**审查 ② 按同一口径落地＝「全家族双语」——已英文的成员（`Model … not found in config` 等）补中文半边，不再保留单语成员**（否则 C-1 的「两种语言策略」投诉在家族内部原样留着）。**其余四项（①③④⑤）仍按推荐组合起草**（①甲 已随 Task 1 落地 `72b58d10`；③甲 ④甲 ⑤乙 待各自 Task 时按推荐执行、用户可随时改口）。**已交付（2026-10-01）**：Task 0–6 全部完成、plan **33／33** 全勾；实施 `a8a39423`（T0 成对入库）／`72b58d10`（T1 A-1）／`d501dc58`（T2 C-1）／`4f005aff`（T3 C-2 ＋ B-1 描述）／`7ee7a9a9`（T4 B-2）／`332b3db7`（T5 真栈），T6 交付回写为本批文档提交（均未推送）。**交付纪要**：本对唯一的行为变化＝未声明 `embedding_model`／`rerank_model`／`video.asr_model` 的部署从"静默用厂商默认"变"**响亮报错**"（构建期 `RagConfigurationError`／保存期 400，文案双语、含字段名）；**逃逸路径＝在 `config.yaml` 的 `rag:` 段声明三个模型名**（示例文件已带注释行与占位）。裁定终态：①甲 ②乙（审查②＝全家族双语）③甲 ④甲 ⑤乙。

**Plan:** [2026-09-30-rag-closeout.md](../plans/2026-09-30-rag-closeout.md)

**相关记录**：

- [发布前写死项盘点](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 4」＝本对（`B-2` 剩余 + `A-1` + `C-2` + `C-1`；`B-1` 描述修正可搭车）；四条完整证据在那里，本文件只写改法。**本对做完 ⇒ 本仓自己待修归零**（只剩门 B 六项与上游的 `A-10`）。
- `knowledge/model_target.py` 的 `RagConfigurationError` ＋ 保存期 400（D10，2026-09-23 那一对交付）—— A-1「缺项即配置错误」的**现成形状**。
- 对 3（2026-09-30 已交付）：同文件 `app_config.py` / `config.example.yaml` / `backend/AGENTS.md` ⇒ 全是加法/文案、无语义冲突；`config_version` 从它落下的 **42** 起跳（若裁升版 ⇒ 43）。
- 2026-09-23 那一对的 **Task 9**：`B-2` 按载体删行/删项的先例（本对只接剩余三处说明 ＋ 一处 live 门禁）。

## 1. 目标与边界

把盘点档里本仓最后四条清掉。**本对有一条已登记的行为变化**（`A-1`，见 D1/§6.2）——其余三条不破坏部署。

| 本期做 | 本期不做 |
| --- | --- |
| `A-1`：三处字面默认模型名去掉 ＋「缺项即配置错误」收口（`embedding_model` / `rerank_model` / `video.asr_model`） | 动 `models[0]` 位置默认（G-9，上游机制）；动门 B 六项；动 `A-10`（上游） |
| `C-1`：配置类错误文案的语言统一（清单在 Task 0 冻结）＋ 受影响的测试断言同批改 | 造后端 i18n 框架（若裁丙则只到"返回 code、前端渲染"这一层）；改界面侧 i18n（前端已有） |
| `C-2`：两个示例文件的厂商型号换中性占位 | 改 `rag_config.example.json` 的**结构**（键集不动）；动真实配置文件 |
| `B-2`：剩余三处文档载体（删行/删项、不改名）＋ 一处 live 门禁 | 重命名 `SILICONFLOW_VLM_API_KEY` 家族（Task 9 已定"删载体不改名"） |
| `B-1`（若搭车）：`app_config.py` / `rag_config_file.py` 两处描述修正 | 动维度迁移机制、界面、golden |

**为什么值得做**（三条属盘点档 §1.2 的"坏"，性质各不同）：

- **A-1（坏-A：替用户决定）**：用户什么都不写时，系统替他选了**某一家厂商的某一个型号**（`qwen3.7-text-embedding` / `qwen3-rerank` / `paraformer-zh`）；名字里带版本号 ⇒ 平台侧一改名就全断，且断点在**第一次 ingest**、不在配置期。对照 G-6 的 `qdrant_url` 缺省 `localhost`——那是中性的（谁的部署都长这样）。
- **C-1（坏-C：两种语言策略）**：界面文案走 i18n 双语，后端抛出的字符串**不经任何翻译层**直接到用户眼前（前端 `core/rag/api.ts:51` 原样渲染 `detail`）——而这些字符串是维度不符/稀疏缺失这类故障的**唯一线索**。
- **C-2（坏-C）**：示例文件的**形式是对的**（模板就是给人改的），坏在**内容是开发者在用的厂商选择**——克隆者会以为那是推荐值。
- **B-2（坏-B）**：`SILICONFLOW_VLM_API_KEY` 六处文档叫用户设、**零处代码读它**；Task 9 已处理大部分，余三处说明 ＋ 一处 live 门禁仍自相矛盾。

## 2. 决定

### D1 A-1：三处字面默认去掉 ＋「缺项即配置错误」（① 待裁：收口形状；字段范围＝账本已定三处）

| 字段（现状，核于 `fed54dc5`；`75f3a186` 复核零后端重叠） | 今天 | 改成 |
| --- | --- | --- |
| `rag.embedding_model`（`app_config.py:187`） | `str`，默认 `"qwen3.7-text-embedding"` | `str \| None = None` ＋ 构建/保存期拒绝（① 待裁：甲 用/构建时 / 乙 pydantic 必填） |
| `rag.rerank_model`（`:189`） | `str`，默认 `"qwen3-rerank"` | 同上 |
| `rag.video.asr_model`（`:157`） | `str`，默认 `"paraformer-zh"` | 同上 |

- **消费点全表（起草期已核，Task 0 复核）**：`embedder.py:167`、`embedder_ark.py:69`、`embedder_openai.py:91`（各带自家兜底分支）、`embedder_factory.py:178-179`（`if rag.embedding_model:`）、`reranker.py:63`、`reranker_generic.py:63`、`worker.py:607`（`model=cfg.asr_model`）。收口落在**单一构建点**：`build_embedder` / `build_reranker`（嵌入/重排），＋ **worker 的 ASR 腿入口**（`knowledge/worker.py`，`cfg.asr_model is None` ⇒ 拒绝——`transcribe_video(model=…)` 经对 3 已是**必填 `str`**，把 `None` 传进去只会在 provider 内部炸、不可读）。一律照 D10 的 `RagConfigurationError` 形状。
- **已核的账本漂移**：账本 `A-1` 行写的 `:189/:191/:157` 与 `:194 vlm_base_url` —— 现状是 `:187` / `:189` / `:157`，且 **`vlm_model` 字面量已随 Task 9 退役**（现为 `None`）、`vlm_base_url` 已不存在 ⇒ 本对只收三处。
- **行为变化（本对唯一，登记进 §6.2）**：没声明模型名的部署，从"静默用 DashScope 的型号"变"**响亮的配置错误**"（保存期 400 / 构建期 `RagConfigurationError`，文案含缺哪个字段）。这是 A-1 的目的，不是副作用。

### D2 C-1：配置类错误文案的语言（**② 已裁＝乙**：中英双语一行）

- **范围＝配置类错误文案**：`RagConfigurationError` 家族（`embedder_factory.py` 的维度/稀疏半缺等）＋ 保存期 400 的 `detail`（`rag_config.py` 的「提交后的配置仍不可用：…」族）＋ 两个探针的 `detail`。**Task 0 逐处枚举、冻结清单**（账本 C-1 行列了 8 处起点——**账本口径：行号与部分文案已漂移**（`_REBUILD_HINT` 现文案已含维度行、行号全移）；实施时以 Task 0 重取的清单为准，不扩大）。
- **证据锚**：前端 `core/rag/api.ts:51` `typeof error.detail === "string" ? error.detail : fallback` ⇒ **后端文案就是管理员看到的文案**；同时文件里已有一半报错是英文（`Unknown embedding provider` / `rag_config.json is invalid`）⇒ "两种语言策略"是同文件内的。
- **破坏面**：4 个后端测试文件 6 行断言（2 处逐字全文常量）随文案同批改——Task 0 逐处列出。

### D3 C-2：示例文件的厂商型号换中性占位（③ 待裁：占位与"活跃/注释"形态）

| 文件 | 现状 | 改成 |
| --- | --- | --- |
| `rag_config.example.json` | `embedding_model: qwen3.7-text-embedding` / `rerank_model: qwen3-rerank` / `extract_model: deepseek-v4-flash` / `video.asr_model: paraformer-zh` | 中性占位（③ 待裁：甲 语义化 `your-embedding-model` 家族 / 乙 统一 `<your-model-name>`） |
| `config.example.yaml` 的 rag 段 | 活跃两行 `embedding_model: qwen3.7-text-embedding`（`:2574`）/ `rerank_model: qwen3-rerank`（`:2576`）；注释示例含 `qwen3-vl-plus`（`:2581`）/ `deepseek-v4-flash` ×3（`:2589`/`:2592`/`:2596`）；**video 块活跃一行 `asr_model: paraformer-zh`（`:2681`）** | 同上（③ 待裁含"活跃 vs 注释"：见下；video 块那行同理） |

- **与 A-1 的联动（③ 的核心）**：`config.example.yaml` 的这两行若**保持活跃**，`make config-upgrade` 会把占位值**注入**存量用户的配置（他们若原本没声明，就得到一个假模型名——第一次 ingest 才炸）；若**改成注释**（照 `embedding_base_url` 的"required（no provider fallback）"先例），则 `make config-upgrade` 什么都不补、缺项由 A-1 的响亮报错兜住，但"拷贝示例即得可用配置"这条惯例被打破（示例本身在声明模型前不可用）。
- `rag_config.example.json` 是**纯模板**（不入运行链、无 config-upgrade 语义）⇒ 直接换占位即可。

### D4 B-2：三处文档载体 ＋ 一处 live 门禁（处置＝删行/删项、不改名，Task 9 先例）

| 载体（HEAD `fed54dc5`） | 现状 | 改成 |
| --- | --- | --- |
| `.env.example:44` | `# SILICONFLOW_VLM_API_KEY=your-siliconflow-vlm-key`（注释行） | 删该行 |
| `README.md:221` | `export SILICONFLOW_VLM_API_KEY=...       # 图片说明` | 删该项 |
| `UPSTREAM_README.md:152` | 句子里点名该变量 | 从列举里删名 |
| `tests/knowledge/test_e2e_smoke.py:53` | live 门禁的环境变量清单项 | 删该项 |

- **碰撞（§5.2）**：`README.md` 正被他线（多模态角色标题）编辑中 ⇒ 本对**必须排在其落地之后**；其余三处当前干净。**（更正 2026-10-01：见 §5.2——多模态线已落地且未碰 README；在飞 4 行另有其主，Task 4 以部分暂存避让。）**

### D5 B-1（若搭车）：两处描述修正（④ 待裁）

| 位置（现状行号） | 现状 | 改成 |
| --- | --- | --- |
| `app_config.py:209` | `embedding_dimension` 描述尾部 "Must be 1024 — the Qdrant collections are created at that size."（**陈旧**：宽度早已可配、改值触发迁移） | 改成与现状一致（空＝1024；声明值＝生效宽度；改值触发全库重建） |
| `rag_config_file.py:141` | "Dense dimension override; None probes the provider at enable time."（基本对、没写全） | 补全（空＝1024、改＝重建） |

### D6 文档与版本（⑤ 待裁：`config_version` 42 → 43 升不升）

- 若裁升版：`config.example.yaml` ＋ chart 两件同批（照对 2/对 3 节奏）；若不升：仅示例注释变化。
- `backend/AGENTS.md`：A-1 的"缺项即配置错误"句（RAG 段）、C-1 的语言策略、C-2 的占位说明（各一处，实施时定句）。
- 盘点档：`A-1` / `C-1` / `C-2` / `B-2`（＋ `B-1` 若搭车）在交付时标已交付（Task 6）。

## 3. 接口与实施归属

| 接口／对象 | 本期契约 |
| --- | --- |
| `RagConfig.embedding_model` / `.rerank_model`、`RagVideoConfig.asr_model` | `str \| None = None`（D1） |
| `build_embedder` / `build_reranker` / `worker.py` 的 ASR 腿入口 | 缺项 ⇒ `RagConfigurationError`（可读文案；保存期自动 400，走既有映射） |
| `embedder_factory.py` / `rag_config.py` 的配置类文案 | 按 D2 的语言策略逐条改（清单 Task 0 冻结） |
| `rag_config.example.json` / `config.example.yaml` | 厂商型号 ⇒ 中性占位（D3） |
| `.env.example` / `README.md` / `UPSTREAM_README.md` / `test_e2e_smoke.py` | `SILICONFLOW_VLM_API_KEY` 载体删行/删项（D4） |
| `app_config.py:209` / `rag_config_file.py:141` | 描述修正（D5，若搭车） |

## 4. 验收清单

1. **A-1 加载链**：无声明 ⇒ 构建期 `RagConfigurationError`（含字段名）＋ 保存期 400；声明后照常；**三处字段各自一条**。
2. **C-1 文案**：冻结清单逐条改毕；受影响的 6 行断言同批改；全量零新增。
3. **C-2 示例**：`RagConfigFile.model_validate` 仍通过；两文件 grep 零厂商型号（`qwen3.7-text-embedding` / `qwen3-rerank` / `deepseek-v4-flash` / `qwen3-vl-plus`）。
4. **B-2 载体**：四载体 grep 零命中（历史/轮次快照文档除外——账本自身的记录不动）。
5. **B-1 描述**（若搭车）：两处与现状一致、零用例风险（已核：测试不钉这两段文字）。
6. **门禁**：ruff 双净、窄面、后端全量（共享加载路径）；模板契约用例（若动示例）；`check_config_version.sh`（若升版）。
7. **真栈**（Task 5）：临时清掉 `rag.embedding_model` ⇒ 保存/构建路径给**新文案**的硬报错；还原逐字节。

## 5. 文件影响

### 5.1 本期修改面

| 文件 | 修改 |
| --- | --- |
| `config/app_config.py`、`config/rag_config_file.py` | 三字段类型/默认（D1）；两处描述（D5 若搭车） |
| `knowledge/embedder_factory.py`、`knowledge/reranker.py`（或对应构建点）、`knowledge/video/asr.py` 或 worker 入口 | 缺项收口（D1） |
| `knowledge/embedder_factory.py`、`app/gateway/routers/rag_config.py` | 文案（D2） |
| `rag_config.example.json`、`config.example.yaml`（＋ chart 两件若升版） | 占位（D3/D6） |
| `.env.example`、`README.md`、`UPSTREAM_README.md`、`backend/tests/knowledge/test_e2e_smoke.py` | B-2 载体（D4） |
| `backend/AGENTS.md`、盘点档 | D6 / Task 6 |
| `backend/tests/…` | A-1 三处硬报错、C-1 断言同批、B-2 门禁清单 |

**明确不改**：`models[0]` 位置默认与公共工厂；界面 i18n；`vlm_target.py` 的解析；维度迁移机制；门 B 六项。**（更正 2026-09-30：`providers/__init__.py` 的既有英文报错原列此处——②乙 ＋ 审查②「全家族双语」落地后**已改**（补中文半边），随 Task 2 `d501dc58`。）**

### 5.2 碰撞面

- **多模态角色标题那一对（在飞）**：`README.md` 正被它编辑（本对 D4 要改 `README.md:221`）⇒ **本对排在其落地之后**；落地后重扫它是否也碰过 `.env.example` / `UPSTREAM_README.md`（预计零）。**（更正 2026-10-01：该对已落地 `77debea3`（05:42）且**未碰** `README.md`；在飞的 4 行 intro 改写（09-30 03:54）**另有其主**。经用户裁定，Task 4 按**部分暂存**执行——提交只入本对删的那一行，他线 4 行原样留在工作树；重扫已做：`.env.example` / `UPSTREAM_README.md` 干净。）**
- **对 3（2026-09-30 已交付）**：同文件 `app_config.py` / 模板 / `AGENTS.md` ⇒ 加法/文案、无冲突；`config_version` 从 **42** 起跳。
- **2026-09-23 那一对（已交付）**：`B-2` 的删行先例、`RagConfigurationError` 形状的来源。

## 6. 裁定记录与已知代价

### 6.1 裁定记录（五项待裁，各附四件套）

| # | 在问什么 | 选项 | 推荐与理由 | 选错后果 |
| --- | --- | --- | --- | --- |
| **①** | A-1 的收口形状 | 甲 用/构建时拒绝（`None` ＋ `RagConfigurationError`，保存期 400）；乙 pydantic 必填（配置加载即失败） | **甲** —— D10 先例（`model_target.py` 的 `RagConfigurationError` ＋ 保存期 400 已落地）；配置仍可加载、不用 RAG 的部署不受影响；报错文案可带"该在哪个界面/字段填" | 选乙：`AppConfig.from_file()` 对所有部署硬失败（连从不碰 RAG 的也炸），且错误出现在加载期、离"该改哪儿"更远 |
| **②** | C-1 的语言策略 | 甲 全英文；乙 中英双语一行（`中文 / English`）；丙 后端返回 code、前端 i18n 渲染（真解，工程大） | **✅ 已裁＝乙（2026-09-30）** —— 前端原样渲染 `detail`（`api.ts:51`）⇒ 双语对 zh/en 两个 locale 都成立、零 i18n 框架成本；与同文件既有的英文报错也不冲突（英文半边一致） | 选甲：中文管理员读英文（这些是维度/稀疏故障的唯一线索）；选丙：本对变成前端工程（新契约、新渲染、新用例），与"收口"体量不符 |
| **③** | C-2 的占位与形态 | 甲 语义化占位（`your-embedding-model` 家族）＋ `config.example.yaml` 的两行**改注释**（照 `embedding_base_url` 的"required"先例）；乙 占位值保持活跃 | **甲** —— 活跃占位会被 `make config-upgrade` **注入**存量用户配置（假模型名、第一次 ingest 才炸）；注释 + A-1 响亮报错是正确路径（代价：示例拷完须先声明模型才可用，这正是 A-1 要教的） | 选乙：config-upgrade 变成"注入假值"的通道，与 A-1 的收口目的相抵 |
| **④** | `B-1` 搭不搭车 | 甲 搭（两处描述）；乙 不搭 | **甲** —— 本盘最后一批、两行零代码零用例风险（已核测试不钉这两段文字）；不搭则它又要单独立对 | 选乙：`B-1` 成为唯一的孤儿条目，下一对为两行描述再起 spec/plan |
| **⑤** | `config_version` 升不升（42 → 43） | 甲 升（示例 ＋ chart 两件同批）；乙 不升 | **乙** —— 没有新键、`make config-upgrade` 无物可补（三行改注释）；唯一效果是给所有用户加一条"无操作可做"的警告；A-1 的收口本身就是最响的提示（缺项时） | 选甲：每个部署加载时多一条过时警告，而它引导的 `config-upgrade` 什么都不做——警告贬值 |

### 6.2 已知代价与登记不改

- **A-1 是本对唯一的行为变化（已登记）**：未声明 `embedding_model` / `rerank_model` / `asr_model` 的部署，升级后从"静默用厂商默认"变"硬报错"（保存期 400 / 构建期 `RagConfigurationError`）。交付纪要须像对 2 的 `parse_base_url` 那样**点名**这条变化与逃逸路径（在 `config.yaml` 的 `rag:` 段声明模型名）。
- **C-1 的文案改动会动既有测试断言**（**起草后审查已更正计数**：账本写"4 文件 6 行"，HEAD 实测为 **3 个文件**——`test_rag_configuration_error.py:18` 逐字常量；`test_rag_config_api.py` 8 处，其中 `:527/:560/:569/:581` 是**逐字全文等值且尾巴为英文** `Model … not found in config`；`test_rag_config_save_probe.py:67` 逐字常量 ＋ `:179` 等值；精确清单由 Task 0 冻结）——同批改，不算破坏面扩大。
- **A-1 对前端零改动（审查后已核）**：wire 类型已可空（`frontend/src/core/rag/types.ts:18/:20` 为 `string | null`）、`config-form.ts:231` 用 `asText` 落空串 ⇒ 缺项时设置界面显示为空；**但保存期 400 会成为"未声明模型时保存被拒"的 UX**——这正是 A-1 要的响亮，且该 400 的文案就是 C-1 改后的新文案（两件事在同一个响应里会合）。
- **不动的**：`vlm_target.py` 的「文档图片配文：」前缀（不在 C-1 清单，登记不改）；界面 i18n；门 B 六项；`A-10`。**（更正 2026-09-30：`providers/__init__.py` 的英文报错原列此处——②乙 ＋ 审查②「全家族双语」下**不再"不动"**：已补中文半边，随 Task 2 `d501dc58`。）**

后续不再重开本对的四项改法；实施中若确遇新事实，按本文件的更正惯例**追加**一条（不改写已裁的行）。
