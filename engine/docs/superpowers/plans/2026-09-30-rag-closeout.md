# 收口四条 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 每个 Task 走完 RED → GREEN → neuter → revert proof → 门禁 再进下一个；「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-09-30-rag-closeout-design.md](../specs/2026-09-30-rag-closeout-design.md)
**Status:** **2026-09-30 起草，待开工。五项待裁**（spec §6.1：① A-1 收口形状；② C-1 语言策略；③ C-2 占位与形态；④ `B-1` 搭不搭车；⑤ `config_version` 升不升）。**本计划按推荐组合起草（①甲 ②乙 ③甲 ④甲 ⑤乙），每个受裁项影响的步骤都标了另一分支的落点**；裁完只动被裁的那几行。**未实现任何生产代码、未提交**；起草轮的核实全部只读。**同日起草后审查（7 条）已就地修正 5 条**：① 基线在 HEAD `75f3a186` 复核（他线两笔全前端、零后端重叠）；③ C-2 补 `config.example.yaml` 的 `video.asr_model` 一行；④ C-1 起点句标注"账本口径、已漂移"；⑤ A-1 前端零改动结论进 spec §6.2；⑥ ASR 收口点定为 **worker 的 ASR 腿入口**。**审查 ②（C-1 家族内已英文成员的处置）已随 ②＝乙 落定＝「全家族双语」（已英文的成员补中文半边）**。**Task 0（只读核实）已完成（2026-09-30，HEAD `a8a39423`）**：8 框全勾（1 框标不适用）、实测已回填（收口点 3 ＋ 两陷阱／受害者 5／C-1 清单 13 中＋5 英／碰撞面）。**Task 2 已实施（2026-09-30 提交）**：新建零依赖 `messages.py`（`bilingual`）＋ 约 41 处消息双语化；RED 14 红 → 窄面 282 passed → neuter ①11②10（逐次字节还原）→ 全量 **161/12835/109/0**（零新增、并修掉两条 save_probe 基线红）；上游工厂句不在范围（漂移钉改比 EN 半边）。**Task 1 已实施（2026-09-30 提交）**：RED 10 红 → 窄面 123 passed → neuter ①5②4（逐次字节还原 md5）→ 全量 **163/12831/109/0** 与基线集合对照零新增（唯一差异＝已知抖动 `test_run_manager`；+57 passed ＝ 4 新用例 ＋ 2 对 3 模板用例 ＋ 51 条 Qdrant 集成用例转真跑）；并发 basetemp 自伤与漏改受害者（`test_embedder_ark`）两条已如实记入实测。**Task 3 已实施（2026-10-01 提交）**：示例两文件中性占位（YAML 两行 ＋ `asr_model` 行改注释＋"required — no default" 注记、其余注释示例 → `<your-model-name>`；JSON 四值 `your-*-model` 家族）＋ B-1 两处描述 ＋ `backend/AGENTS.md` 一句三事；RED 4 红 → 契约 13 passed → neuter ①2②0（描述零受害者＝ spec §6.1 ④ 预判的"零用例风险"，如实记负结果）→ 全量 **160/12840/109/0** 与 Task 2 集合对照零新增（唯一差异＝ `test_delta_channel_state` 由红转绿：Hypothesis `too_slow` 负载敏感、预基线集合内）；**spec 两处 ② 落尘随批更正**（§5／§6.2 原列 `providers/__init__.py`「不改」——②乙 ＋ 审查② 下 Task 2 已改，就地补更正注）。**Task 4 已实施（2026-10-01 提交）**：四载体删行/删项/删名（`.env.example`／`README.md`／`UPSTREAM_README.md`／`test_e2e_smoke.py` 的 `REQUIRED_KEYS`）＋ 新守卫用例（零命中 ＋ 在役键正向对照）；RED 1 红 → 守卫 2 passed → neuter ①1②1（md5 还原）→ revert proof 2 passed → 四载体 grep 零命中、`test_e2e_smoke.py` 仍可收集；**README 前置的归属漂移已核并就地更正 spec**（多模态线已落地 `77debea3` 且未碰 README；在飞 4 行另有其主），经裁定**部分暂存**避让（提交时只入本对那一行）；全量 **161/12841/109/0** 与 Task 3 集合零新增（唯一差异＝ delta 抖动翻面：单跑绿、无存留反例）。**Task 5 已实施（2026-10-01 提交）**：真栈两腿一次命中——临时注释 `config.yaml` 的 `embedding_model` ⇒ 保存期 **400**（detail 双语、含字段名，全文见 Task 5 实测）；三配置逐字节还原（`rag_config.json` 探针后未变＝拒绝即未写）；gateway 旧树（16:31 起、`--reload` 从未生效）经裁定杀＋同款命令重启、前端随死已连带拉起（均如实记）。**全对已交付（2026-10-01）**：Task 0–6 全部完成、plan **33／33** 全勾；实施 `a8a39423`（T0 成对入库）／`72b58d10`（T1 A-1）／`d501dc58`（T2 C-1）／`4f005aff`（T3 C-2＋B-1）／`7ee7a9a9`（T4 B-2）／`332b3db7`（T5 真栈），T6 交付回写为本批文档提交（**均未推送**）。**本对唯一的行为变化**＝未声明模型名的部署从"静默用厂商默认"变"响亮报错"（构建期 `RagConfigurationError`／保存期 400，文案双语、含字段名；**逃逸路径＝在 `config.yaml` 的 `rag:` 段声明三个模型名**）——spec §6.2 已登记；盘点档「本仓自己待修」归零。
**相关基线:** [盘点档](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 4」＝本对（`B-2` 剩余 + `A-1` + `C-2` + `C-1`；`B-1` 可搭车）；`knowledge/model_target.py`（D10 的 `RagConfigurationError` 形状先例）；[对 3 计划](2026-09-30-rag-caption-params-asr-default.md)（同文件、刚交付）。

**Architecture:** `config.yaml → RagConfig`（三字段 `str | None = None`）＋ **单一构建点收口**（`build_embedder` / `build_reranker` / **worker 的 ASR 腿入口** ⇒ `RagConfigurationError`，保存期自动 400）；文案改动只动字符串（语言策略见 ②）；示例只动值/注释形态。**本对唯一行为变化＝未声明模型名的部署从"静默用厂商默认"变"响亮报错"**（spec D1/§6.2）。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| A-1 | `embedding_model` / `rerank_model` / `video.asr_model` 三处去默认 ＋ 缺项收口 | 动默认值（已无默认）；动 `models[0]` 位置默认；探针化 |
| C-1 | 配置类错误文案语言统一（清单 Task 0 冻结）＋ 6 行断言同批 | 后端 i18n 框架；界面侧 i18n；`vlm_target.py` 的「文档图片配文：」前缀（登记不改） |
| C-2 | 两示例文件换中性占位（③ 甲：`config.example.yaml` 两行改注释） | 改键集/结构；动真实配置 |
| B-2 | 四载体删行/删项（Task 9 先例） | 改名；动轮次快照文档 |
| ④ ✅ 按推荐＝搭车 | `app_config.py:209` ＋ `rag_config_file.py:141` 两处描述（④ 乙则整段移出） | 动迁移机制/界面/golden |
| ⑤ ✅ 按推荐＝不升版 | 示例注释变化、`config_version` 保持 **42**（⑤ 甲则 ＋ chart 两件同升 43） | —— |

**待裁：五项**（spec §6.1）。全文按 **①甲 ②乙 ③甲 ④甲 ⑤乙** 起草；② 的甲/丙分支落点：Task 2 的文案表与断言改动量；③ 的乙分支落点：Task 3 的两行"注释 vs 活跃"；④ 乙分支：删 Task 3 的描述段；⑤ 甲分支：Task 3 的版本同批。

## 硬约束

- **A-1 是本对唯一行为变化**：收口必须**响亮且可操作**（文案含缺哪个字段、去哪填）；不许"静默回退到某个内置型号"。
- **只动"值从哪来"与文案**：`models[0]` 位置默认、公共工厂、`providers/__init__.py` 既有英文报错、维度迁移机制、界面 i18n **一行不动**。
- **C-1 清单不扩大**：以 Task 0 冻结的清单为准；账本未列的字符串（如 `vlm_target.py` 的角色前缀）留作登记不改。
- **不新增机制**：收口用现成的 `RagConfigurationError` ＋ 保存期映射；不造新错误类型、不造探针。
- **共享组件（`app_config.py`）改完必须跑全量**；示例/模板改动跑模板契约用例 ＋ 示例读取面。

## 执行纪律

- 当前分支 `feat/rag-knowledge-base`。实施按 **RED → GREEN → neuter（行为还原并记录受害者）→ revert proof → 门禁** 执行；提交／推送按届时明确授权，使用 Conventional Commits。
- 后端在 `backend/` 用 `PYTHONIOENCODING=utf-8 .venv/Scripts/python -m pytest <path> --basetemp=.pytest-tmp`（本机 `Temp\pytest-of-h7242` 拒访——环境条件；跑完删 `.pytest-tmp`）；ruff 用 `uv run --no-sync ruff check` 与 `uv run --no-sync ruff format --check`。
- **A-1 的 RED 要钉"响亮"**：断言错误类型（`RagConfigurationError`）、断言文案含字段名、断言保存期 400；负向对照＝声明后逐字节照旧。
- 真栈只允许临时改 **RAG 配置**；`config.yaml` / `rag_config.json` / `models_config.json` 先存档字节/md5，结束逐字节还原；只清理本次创建且可确定 ID 的资源。
- **找会被影响的既有断言按关键词子串 ＋ 界面词汇两把扫**（`qwen3.7-text-embedding` / `qwen3-rerank` / `paraformer-zh` / `deepseek-v4-flash` / 文案片段）。

**依赖顺序**：Task 0（只读核实）→ Task 1（A-1）→ Task 2（C-1）→ Task 3（C-2 ＋ 文档 ＋ B-1）→ Task 4（B-2 载体）→ Task 5（真栈）→ Task 6（回写）。**与多模态角色标题那一对的串行（spec §5.2）**：它正编辑 `README.md`（Task 4 要改 `README.md:221`）⇒ **Task 4 必须排在它落地之后**；其余 Task 与它零碰撞。

---

## Task 0 — 只读核实与清单冻结

- [x] **A-1 消费点全表（起草期已核，此处复核并冻结）**：`embedder.py:167` / `embedder_ark.py:69` / `embedder_openai.py:91` 的兜底分支（删默认后它们会拿到 `None`——逐处定"收口点在哪、兜底分支留不留"）、`embedder_factory.py:178-179`、`reranker.py:63`、`reranker_generic.py:63`、`worker.py:607`；产出**收口点清单**（几处、各在哪个函数）。
- [x] **A-1 的既有断言扫描**：按 `qwen3.7-text-embedding` / `qwen3-rerank` / `paraformer-zh` 扫 `backend/tests` 与 `frontend/tests`，逐条记录"会不会被删默认影响"（已知候选：`test_rag_config.py` 的 `test_loads_defaults`、`test_rag_config_file.py`、video 侧用例）。
- [x] **C-1 文案清单冻结**：逐处枚举（`embedder_factory.py` 的维度/稀疏半缺族、`rag_config.py` 的「提交后的配置仍不可用：…」族与两个探针 `detail`），产出**逐条清单**（文件:符号 × 现文案 × 新文案）；同时列出**受影响的 6 行断言**（4 个测试文件，标出 2 处逐字全文常量）。
- [x] **C-2 现状取样**：两示例文件的厂商型号逐处（`rag_config.example.json` 4 处、`config.example.yaml` **活跃 3**（embedding / rerank / **video.asr_model**）＋ 注释 4）；核 `embedding_base_url` 的"required"注释先例句（Task 3 照抄句式）。
- [x] **B-2 四载体复核**：`.env.example:44` / `README.md:221` / `UPSTREAM_README.md:152` / `test_e2e_smoke.py:53` 逐处记录现状行与删法（删行 vs 删项 vs 删名）。
- [x] **B-1 两处复核**（④ 甲时）：`app_config.py:209` / `rag_config_file.py:141` 现状逐字；核"测试不钉这两段文字"（`grep "Must be 1024"` / `grep "Dense dimension override"` 全仓零命中）。
- [x] **碰撞面**：核多模态角色标题那一对是否已落地（`README.md` 的 diff 是否还在树上、其 spec/plan 状态）；落地后重扫它的 `README.md` 改动面（只这一步）。
- [x] ~~**（⑤ 甲时）版本基线**：`config.example.yaml` / chart 两件的 `config_version` 现值（42）与 `check_config_version.sh` 的现状。~~ **⑤＝乙 ⇒ 不适用**（不升版）。

**实测（2026-09-30，HEAD `75f3a186`；全部只读）**：

- **A-1 收口点清单（冻结，3 处）**：① `embedder_factory.py::build_embedder`（`rag.embedding_base_url` 拒绝之后，照 :176 同款句式）；② `reranker_factory.py::build_reranker`（:38 的 base_url 拒绝之后；**条件陷阱：`spec.takes_model` 为假时（TEI）不得要求 `rerank_model`**——现有代码正是按该开关条件传参的）；③ `worker.py` 的 ASR 腿入口（`transcribe_video` 调用之前；**该 try 只捕 `AsrError`** ⇒ `RagConfigurationError` 会穿透、响亮失败，正合 A-1 目的）。
- **A-1 消费点复核（7 处）**：三个嵌入适配器在 `model is None` 时**回读 `get_app_config().rag.embedding_model`**（`embedder.py:165-167`／`embedder_ark.py:67-69`／`embedder_openai.py:89-91`）——即"只删默认不配收口"会让 `None` 一路进 `self._model`（静默坏）；另 `embedder_factory.py:178-179`（`if rag.embedding_model:`）、`reranker.py:60-63`（同款回读）、`reranker_factory.py:53-55`（无条件传 `section.rerank_model`）、`worker.py:607`。**兜底分支处置**：适配器的 `model is None` 回读分支**保留**（它们是适配器自己的 API、直接调用方仍可用；收口保证工厂路径不再送 `None`）。
- **A-1 断言扫描（12 文件命中；受害者 5 条）**：`test_rag_config.py` 的 `test_loads_defaults`（`:15`/`:16`）、`TestAppConfigRagSection::test_rag_section_has_defaults`（`:146`/`:147`）、`::test_rag_section_overridable_from_dict`（`:168` 的"Untouched fields keep their defaults"）、`TestRagVideoConfig`（`:201`，`asr_model == "paraformer-zh"`）＋ `test_embedder_ark.py:270`；其余命中皆**显式传参/夹具**（不受影响）。
- **C-1 清单冻结（配置类错误文案）**：**中文 13 处**——`embedder_factory.py` `:44`（`_REBUILD_HINT`）／`:66`（维度不符，经 `:93` 抛）／`:151`（稠密-only）／`:176`（缺 base_url）／`:211`（缺 sparse_provider）；`model_target.py` `:54`（缺 key）／`:59`（缺地址）／`:129`（无可用模型）；`parse_local.py` `:139`／`:141`；`sparse.py:111`；`asr.py:202`；`rag_config.py` `:401`/`:404`/`:435`/`:483`/`:495`（「提交后的配置仍不可用：…」）／`:598`（`_SPARSE_ALTERNATIVES`）／`:715`/`:738`/`:744`（探针 detail）。**英文 5 处**（＝审查 ② 待裁的对象）——`reranker_factory.py:38-40`、`model_target.py:43-50`（`Model … not found in config`）、`providers/__init__.py:215/222/225`、`rag_config.py:262`、`:709`。**受影响断言＝3 文件**：`test_rag_configuration_error.py:18`（逐字常量）；`test_rag_config_api.py` `:480`/`:1036`/`:1169`/`:1193`（`startswith`）＋ `:527`/`:560`/`:569`/`:581`（逐字等值、尾巴英文）；`test_rag_config_save_probe.py:67`（逐字常量）＋ `:179`（等值）。
- **C-2 取样**：`rag_config.example.json` 4 处（embedding / rerank / extract / asr_model）；`config.example.yaml` 活跃 3（`:2574`/`:2576`/`:2681`）＋ 注释 4（`:2581`/`:2589`/`:2592`/`:2596`）；先例句＝`# embedding_base_url:                  # endpoint; required (no provider fallback)`（Task 3 照抄句式）。
- **B-2 四载体**：`.env.example:44`（整行注释）／`README.md:221`（`export … # 图片说明`）／`UPSTREAM_README.md:152`（句子列举里点名）／`test_e2e_smoke.py:53`（live 门禁清单项）。
- **B-1 两处**：`app_config.py:209`（"Must be 1024…" 尾句）／`rag_config_file.py:141`（未写全）；**测试零钉**（`grep "Must be 1024\|Dense dimension override"` 在 `backend/tests` ＋ `frontend/{src,tests}` **零命中**）✅。
- **碰撞面**：多模态角色标题那一对的两份文档**已落地**（其 plan 已入库、HEAD `75f3a186`）；**`README.md` 仍带 4 行未提交的在飞改动**（intro 重写，非本对）⇒ **Task 4 待其落地**（B-2 的 `README.md:221` 未被该 diff 触及，但同文件不得混改）。
- **（⑤ 甲时）版本基线**：不适用（⑤＝乙，不升版）。

---

## Task 1 — 后端 A-1：三处去默认 ＋ 缺项收口

> 文件：`config/app_config.py`、`knowledge/embedder_factory.py`、`knowledge/reranker.py`（或对应构建点）、**worker 的 ASR 腿入口**（`knowledge/worker.py`：`cfg.asr_model is None` ⇒ 拒绝；`transcribe_video(model=…)` 经对 3 已是必填 `str`，把 `None` 传进去只会在 provider 内部炸）、`backend/tests/…`。
> **验收对应**：spec §4 的 1。

- [x] **RED：加载链与收口**：三字段各自一条——`RagConfig()` 不再有字面默认（`is None`）；`build_embedder` / `build_reranker` / **worker 的 ASR 腿入口**在缺项时抛 `RagConfigurationError`、**文案含字段名**；负向对照＝声明后构建照常（与今天的构造参数逐字相同）。
- [x] **RED：保存期 400**：PUT 一条缺 `embedding_model` 的配置 ⇒ 400 且 detail 是新文案（走既有 `RagConfigurationError` 映射）。
- [x] **GREEN**：三字段改 `str | None = None`；收口落在 Task 0 冻结的收口点（一处一份文案，照 `model_target.py` 的句式）；兜底分支按 Task 0 结论处置（删或留，留则注释说明为何不可达）。
- [x] **neuter：整体还原旧行为**，逐项独立还原并证明 GREEN 恢复、各有对应用例转红：① 三字段默认放回；② 收口点去掉 ⇒ 缺项用例转红。
- [x] **门禁**：ruff 双净；窄面（配置链 ＋ 三条腿的构建用例）绿；`app_config.py` 是共享加载路径 ⇒ **跑后端全量**（后台执行，结果未回不回绿），与基线集合对照零新增。

**实测（2026-09-30，开工 HEAD `a8a39423`）**：

- **RED（10 红，窄面）**：预期 8 条——`test_rag_config.py` 四条受害者（改断言 `is None`）＋ 四条新收口用例（嵌入/重排/ASR/保存期 400）；另 2 条为**已知基线环境红**（`test_rag_config_save_probe.py` 的 `test_a_wrong_dense_width_is_refused_in_the_runtime_wording` 与 `test_the_save_time_refusal_says_what_the_runtime_would_say`，在 09-30 全量集合内）。
- **GREEN**：`app_config.py` 三字段改 `str | None = None`（描述含 "required — no default"）；三处收口——`embedder_factory.py::build_embedder`（`embedding_base_url` 拒绝之后，**中文**照邻居句式）、`reranker_factory.py::build_reranker`（**条件化** `spec.takes_model`，**英文**照邻居句式）、`worker.py` 的 ASR 腿入口（try 之外，**中文**）；`worker.py` 的 import 行扩为 `EmbeddingResult, RagConfigurationError`。
- **窄面（最终）**：**123 passed / 2 pre-existing red**（即上述两条基线红）。**加宽面首轮**（15 个文件）**307 passed / 5 red**：4 条基线（save_probe ×2 ＋ `test_reranker.py::test_rerank_missing_api_key` ＋ `test_indexer.py::test_embed_missing_api_key`，后两条亦在基线集合内）＋ **1 条真回归＝`test_embedder_ark.py::test_the_default_provider_is_still_dashscope`**——Task 0 扫描已把它列为受害者（`:270`），RED 时我只改了 `test_rag_config.py` 的四处、**漏改这一处**；加宽面逮住后已修（`is None`）、该文件复跑绿。
- **neuter（脚本一张表，两条独立跑、逐次字节还原）**：① 三字段默认放回（`str` ＋ 字面量）⇒ **5 红**（`test_rag_config.py` 四处 ＋ `test_embedder_ark.py` 一处）；② 三处收口点去掉 ⇒ **4 红**（嵌入/重排/ASR/保存期四条新用例；两条基线红在两种状态下都红、不算受害者）。**还原**：四个文件 md5 逐字节一致（`app_config.py 60c2c3b8…`／`embedder_factory.py 9cadabc2…`／`reranker_factory.py 8ee67027…`／`worker.py d6a1e491…`）。
- **revert proof**：还原后再跑窄面 ⇒ **123 passed / 2 pre-existing red**（与 GREEN 相同）。
- **ruff**：双净（修掉一条 E501——`asr_model` 描述超 240，裁去 "Whisper tier example: small; " 半句）。
- **门禁（全量）**：**163 failed / 12831 passed / 109 skipped / 0 error**（17:42）。与 09-30 基线（162 / 12774 / 160 / **1 error**）**逐条集合对照零新增**：唯一差异＝`test_run_manager.py::test_list_by_thread[asyncio]`（已知抖动——在对 2 基线内、对 3 那轮绿，**单跑复现红**）；**passed +57 ＝ 本对 4 条新用例 ＋ 对 3 T3 的 2 条模板用例 ＋ 51 条此前被跳过的 Qdrant 集成用例**（skipped 160 → 109、error 1 → 0——本机 Qdrant 已起，集成面真跑且全过）。
- **实施期记录（如实记）**：① **并发 basetemp 自伤**：全量与 neuter 扫描共用仓内 `.pytest-tmp`（pytest 每次会话会清建同名 basetemp）⇒ 首轮全量被污染、已杀；neuter 改用**仓外独立 basetemp**（`Temp\pytest-pair4-neuter`，跑完删）后重跑，两条 neuter 结果如上；全量随后**干净重跑**（同一时刻不再跑第二个 pytest）。② `test_worker_pipeline.py` 的 `_video_config(**overrides)` 与硬编码同名参数相撞（`SimpleNamespace` 重复 kwarg）⇒ 改为 defaults 字典合并（顺带让该助手可覆盖任意键）。③ 三条新收口文案的语言**照各自文件邻居**（嵌入/worker 中文、重排英文）——② 若裁乙，Task 2 的清扫须把它们一并纳入（它们是 A-1 新增、不在 Task 0 冻结的 13＋5 清单里，实施时补）。

---

## Task 2 — 后端 C-1：配置类文案统一（**② 已裁＝乙**：中英双语一行）

> 文件：`knowledge/embedder_factory.py`、`knowledge/model_target.py`、`knowledge/parse_local.py`、`knowledge/sparse.py`、`knowledge/video/asr.py`、`knowledge/reranker_factory.py`、`knowledge/providers/__init__.py`、`app/gateway/routers/rag_config.py`、受影响的 3 个测试文件。**清单以 Task 0 冻结为准（13 中 ＋ 5 英）＋ Task 1 新增的三条收口文案**。
> **验收对应**：spec §4 的 2。
> **审查 ② 的口径（已随 ② 乙 落定）**：**全家族双语**——已英文的成员（`Model … not found in config`、`Unknown embedding provider`、`rerank_provider=… requires …` 等）**补中文半边**，不再保留单语成员（否则 C-1 的「两种语言策略」在家族内部原样留着）。

- [x] **RED：文案形状**：清单逐条一条用例，断言「中文半边 ＋ ` / ` ＋ 英文半边」的形状（② 已裁＝乙，甲/丙分支作废）——先写 1–2 条代表性的（含一条**已英文成员补中文**的，如 `model_not_found_message`），全量在 GREEN 同批。
- [x] **RED：既有断言同批**：把 Task 0 冻结的断言清单改成新文案（**3 文件、含 2 处逐字全文常量 ＋ 4 处英文尾巴等值**），改前逐处记录"原文 → 新文"。
- [x] **GREEN**：清单逐条改毕（中文 13 ＋ 英文 5 ＋ Task 1 新增 3）；`vlm_target.py` 的角色前缀**不动**（登记不改）；`providers/__init__.py` 的报错**改**（补中文半边——与 ② 甲 下"不动"相反，按已裁的乙执行）。
- [x] **neuter**：① 把一条文案还原成旧单语 ⇒ 对应用例转红；② 把 400 的 detail 还原 ⇒ 保存期用例转红。
- [x] **门禁**：ruff 双净；窄面（`test_rag_configuration_error.py` / `test_rag_config_api.py` / `test_rag_config_save_probe.py` ＋ 探针用例 ＋ 本轮新增的收口用例）绿；全量与基线集合对照零新增（与 Task 1 的全量可合并跑）。

**实测（2026-09-30，开工 HEAD `72b58d10`）**：

- **格式裁定（实施时定）**：新建**零依赖**的 `knowledge/messages.py`，一个 `bilingual(cn, en) -> f"{cn} / {en}"`（providers 那份是 import-light，不能拉 httpx ⇒ helper 必须无依赖）；全部消息改走它，格式只此一处。**组合式消息**（保存期 400 的 wrapper ＋ 内层句子）＝ `bilingual('提交后的配置仍不可用：', 'The configuration is still unusable after the save: ')` ＋ 内层（内层本身已双语）——CN 前缀原样保留，故 4 处 `startswith("提交后的配置仍不可用：")` 断言**不动**。
- **RED（14 红）**：2 条新形状用例（`bilingual` 的格式 ＋ `model_not_found_message` 补了中文半边）＋ 12 处更新的钉点（api：6 参数化共享一条 ＋ 3 名单例；save_probe：陈旧常量与 wrapper 等值；eval_factory 等值）。
- **GREEN**：**约 41 处消息**改毕（harness 20 ＋ router 21，含 Task 1 新增的三条收口）；`providers/__init__.py` 的 leg 消息**两处同文**（`:215`/`:222`）一并改；`Unknown embedding provider` **两处**（`:709`/`:867`）一并改。**实施时补进的清单**（Task 0 冻结清单是下限）：`_SAVED_BUT_UNVERIFIED` 家族（3 处）、迁移两条（`:539`/`:555`）、稀疏探针判定（`:788`/`:804`/`:811`）、`:744`/`:750`/`:754`、`rag_config.json 无效`（`:262`）。
- **窄面（最终）**：**282 passed / 0 failed**（含**两条原基线红已修**——save_probe 的陈旧常量随本轮更新为现行双语文本）。
- **实施期两处如实记**：① **`models/factory.py:302`（上游模型工厂自己的句子）不在 C-1 范围**——`test_the_not_found_sentence_equals_the_factorys_own` 的漂移钉改为比 **EN 半边**（`model_not_found_message(...).split(" / ")[-1] == 工厂句`）；`eval_factory` 那条我曾误改（它抛的是上游工厂的句子、不经过我们的 helper）⇒ **已撤回**。② 清单外站点（ASR 探针/维度探针/连通探针/迁移以外的文案）**登记不改**。
- **neuter（两条独立跑、逐次字节还原）**：① `model_not_found_message` 还原为单语英文 ⇒ **11 红**；② 保存期 wrapper 还原为单语中文（5 处）⇒ **10 红**；两文件 md5 逐字节一致（`model_target.py d8c99c19…`／`rag_config.py 25730944…`）。
- **revert proof**：还原后再跑窄面 ⇒ **282 passed**。
- **ruff**：双净（自动修 5 处 import 排序 ＋ 手改 6 处 E501——CN/EN 两半提成局部变量）。
- **门禁（全量）**：**161 failed / 12835 passed / 109 skipped / 0 error**（17:38）。与 Task 1 的集合（163 ids）逐条对照：**only-T2 ＝ 0（零新增）**；**only-T1 ＝ 2 ＝ 两条 save_probe 基线红被本轮修掉**（陈旧常量更新为现行双语文本）⇒ 净效果＝修掉两条、零新增。

---

## Task 3 — 示例 C-2 ＋ 文档 ＋（④ 甲时）B-1 两处描述

> 文件：`rag_config.example.json`、`config.example.yaml`、（⑤ 甲时）`deploy/helm/deer-flow/values.yaml` ＋ `README.md`、`backend/AGENTS.md`、（④ 甲时）`config/app_config.py` ＋ `config/rag_config_file.py`。
> **验收对应**：spec §4 的 3 / 5。

- [x] **RED：示例契约**：模板契约用例扩——两文件 grep 零厂商型号（`qwen3.7-text-embedding` / `qwen3-rerank` / `deepseek-v4-flash` / `qwen3-vl-plus`）；`rag_config.example.json` 仍过 `RagConfigFile.model_validate`；（③ 甲时）`config.example.yaml` 的 embedding/rerank 两行**不活跃**（照 `embedding_base_url` 先例）；（⑤ 甲时）版本底线 42 → 43。
- [x] **GREEN**：占位按 ③ 的裁定（甲：`your-embedding-model` / `your-rerank-model` / `your-extract-model` / `your-asr-model` 语义化家族；乙：统一 `<your-model-name>`）；`backend/AGENTS.md` 三处句（A-1 收口、C-1 语言、C-2 占位）；（④ 甲时）两处描述照 spec D5 表；（⑤ 甲时）版本同批。
- [x] **neuter**：① 把一处占位还原成厂商型号 ⇒ grep 用例转红；② （④ 甲时）把一处描述还原 ⇒ 若无用例则记"零用例风险已核"（spec §6.1 ④ 的已知代价）；（⑤ 甲时）版本回 42 ⇒ 底线用例转红。
- [x] **门禁**：模板契约用例绿；示例读取面绿；（⑤ 甲时）`bash scripts/check_config_version.sh` OK；grep 复核两文件零厂商型号。

**实测（2026-09-30，开工 HEAD `d501dc58`）**：

- **RED（4 红）**：四条新契约用例——两文件 grep 零厂商型号（五名清单：四个厂商型号 ＋ `paraformer-zh`）；`config.example.yaml` 的 embedding/rerank 两行不活跃（照 `embedding_base_url` 先例）；`asr_model` 行同样不活跃；JSON 占位家族。既有 9 条保持绿。
- **GREEN**：`config.example.yaml` **7 处**（两行活跃模型改注释＋占位、"required — no default (A-1)" 注记；`vlm_model`/`extract_model`/`judge_model`/`default_model` 的注释示例 → `<your-model-name>`；`graph_rerank` 的注释去掉型号名；video 块的 `asr_model` 改注释＋占位）；`rag_config.example.json` **4 处**（`your-embedding-model`/`your-rerank-model`/`your-extract-model`/`your-asr-model`——JSON 是纯模板、无 config-upgrade 语义，占位直接落在值上）；**B-1 两处描述**（④甲：`app_config.py` 的 "Must be 1024…" 陈旧尾句 → "None means 1024 / 声明的宽度即写入宽度、改值重建"；`rag_config_file.py` 补全）；`backend/AGENTS.md` 一句三事（A-1 收口、C-1 双语、C-2 占位）。**⑤乙 ⇒ 版本保持 42、chart 两件不动**。
- **门禁**：契约文件 **13 passed**；`check_config_version.sh` **OK（42 = 42）**；grep 两文件**零命中**；示例读取面 **196 passed / 4 pre-existing red**（`test_config_version` ×1、`test_app_config_reload` ×2、`test_doctor` ×1——逐条在基线集合内）；ruff 双净（修一条 E501：app_config 的描述超 240，删去括注）。
- **neuter（两条独立跑、逐次字节还原）**：① JSON 占位还原成厂商型号 ⇒ **2 红**（grep 用例 ＋ JSON 占位用例）；② `app_config` 描述还原为旧文案 ⇒ **零受害者**（＝ spec §6.1 ④ 预判的"零用例风险"，如实记为负结果）。两文件 md5 逐字节一致（`app_config.py f4fc86a6…`／`rag_config.example.json fe22db24…`）。
- **revert proof**：还原后再跑示例读取面 ⇒ **196 passed / 4 pre-existing red**（与 GREEN 相同）。
- **门禁（全量）**：**160 failed / 12840 passed / 109 skipped / 0 error**（23:59）。与 Task 2 的集合（161 ids）逐条对照：**only-T3 ＝ 0（零新增）**；**only-T2 ＝ 1 ＝ `test_delta_channel_state.py::test_merge_message_writes_randomized_differential` 由红转绿**——定性＝Hypothesis `FailedHealthCheck: too_slow`（输入生成挂钟超时；两轮旧日志同因两 seed、记录 seed 空闲机重放即绿、预基线集合内）⇒ **负载敏感的已知抖动，非本对引入**。

---

## Task 4 — B-2 四载体（**前置：多模态角色标题那一对已落地**）

> 文件：`.env.example`、`README.md`、`UPSTREAM_README.md`、`backend/tests/knowledge/test_e2e_smoke.py`。
> **验收对应**：spec §4 的 4。

- [x] **RED：载体守卫**：一条守卫用例——四载体 grep `SILICONFLOW_VLM_API_KEY` 零命中（历史/轮次快照文档排除在外，白名单按 Task 0 的结论）。
- [x] **GREEN**：四处按 D4 表删行/删项/删名；**不改名**（Task 9 先例）。
- [x] **neuter**：把 `.env.example` 那行放回 ⇒ 守卫用例转红。
- [x] **门禁**：守卫用例绿；live 门禁文件仍可收集（`test_e2e_smoke.py` 不因删项而 import 失败）；grep 复核四载体零命中。

**实测（2026-10-01，开工 HEAD `4f005aff`）**：

- **RED（1 红）**：新建 `backend/tests/test_retired_vlm_env_carriers.py`——① 四载体逐文件断言退休名零命中；② **正向对照**＝三枚在役键（`DASHSCOPE_EMBEDDING_API_KEY` / `DASHSCOPE_RERANK_API_KEY` / `MINERU_API_TOKEN`）在每个载体仍在（防"删错行"式空洞绿）。RED 时 ① 红于 `.env.example`、② 绿（预期）。
- **GREEN**：四处——`.env.example` 删整行；`README.md` 删 `export … # 图片说明` 行；`UPSTREAM_README.md` 从列举里删名（保留 `MINERU_API_TOKEN` 尾巴）；`test_e2e_smoke.py` 的 `REQUIRED_KEYS` 删项。**不改名**（Task 9 先例）。
- **门禁**：守卫用例 **2 passed**；`test_e2e_smoke.py` **仍可收集**（1 test collected——不因删项 import 失败）；四载体 `git grep` **零命中**（rc=1；全仓余 6 命中＝白名单：账本 ＋ 2026-08-07 plan ＋ 2026-09-23 spec/plan ＋ 本对 spec/plan；**全盘裸扫**〔含忽略规则外〕多出的仅为工具缓存 `.qoder/`／`.mimosa/`、`__pycache__` 与守卫自身，**零新增载体**）；ruff 双净（含新守卫文件）。
- **neuter（脚本一张表，改→跑→逐字节还原）**：① 退休行放回 `.env.example` ⇒ **1 红**（零命中用例）；② 删掉一枚在役键行 ⇒ **1 红**（正向对照用例）。`.env.example` md5 逐字节一致（`aa4b1f12…`）。
- **revert proof**：还原后再跑守卫 ⇒ **2 passed**（与 GREEN 相同）。
- **门禁（全量，按纪律加跑）**：**161 failed / 12841 passed / 109 skipped / 0 error**（00:52，20:27）。与 Task 3 的集合（160 ids）逐条对照：**only-T4 ＝ 0（零新增）**；**only-T3 ＝ 1 ＝ `test_delta_channel_state` 抖动翻面（T3 绿 → T4 红）**——单跑复验**即绿**、`.hypothesis/examples` **无存留反例** ⇒ 负载敏感 `too_slow` 而非真反例（与 T1/T2 同因）。**总数 13000 → 13002（+2 ＝ 本对守卫两条新用例）**：passed +1 ＝ ＋2 新用例 − 1 抖动翻面，逐项归因。
- **实施期记录（如实记）**：① **前置归属漂移已核实**：多模态角色标题那一对**已落地**（`77debea3`，09-30 05:42，plan/spec/前端全套）且**未碰 README**；`README.md` 的在飞 4 行（intro 重写＋工作分支行，09-30 03:54，约 21h 未动）**另有其主**——spec §5.2／D4 的「多模态线在编辑」归属已就地补更正注。② 经用户裁定（2026-10-01）**按部分暂存执行**：提交时只入本对删的那一行（`git apply --cached`），他线 4 行原样留在工作树、两边互不扫（我的 hunk 与其 4 行分属不同区：其 diff 只碰 1–33 行）。③ 顺带更正 Task 3 落下的一处 docstring 相抵（`test_rag_config_example.py` 还写「不刻意钉厂商型号」而 Task 3 已加该用例）。

---

## Task 5 — 真栈：A-1 缺项硬报错 ＋ C-1 新文案现场

> 前提：服务运行且已加载本对代码；`config.yaml` / `rag_config.json` / `models_config.json` 先存档字节/md5，结束逐字节还原。
> **验收对应**：spec §4 的 7。

- [x] **腿一（A-1 硬报错）**：临时把 `rag.embedding_model` 行注释掉 ⇒ 触发一次构建/保存路径（如 `POST /api/rag/config` 的保存期检查或一次入库）⇒ 拿到 **`RagConfigurationError` 的新文案**（保存期则 400，detail 可读、含字段名）。
- [x] **腿二（C-1 文案现场）**：同一响应里核对 C-1 改过的文案形状（② 乙：双语；② 甲：英文）——这是"文案真的到达用户"的唯一真栈证据（前端原样渲染 `detail`）。
- [x] **还原**：三份配置逐字节还原（md5 一致）；只清理本次创建且可确定 ID 的资源（若有）。
- [x] **B-2 / C-2**：无真栈面（文档/示例），在实测里注明。

**实测（2026-10-01，开工 HEAD `7ee7a9a9`）**：

- **腿一（A-1 硬报错）**：临时注释 `config.yaml:270` 的 `embedding_model` 行（`get_config()` 按 mtime 热重载生效）⇒ 经浏览器在用户 `:3000` 上同源 `PUT /api/rag/config`（payload＝GET 现值减 `embedding_model` 键，密钥用 sentinel；JS 里零密钥）⇒ **400**，detail 全文：`提交后的配置仍不可用： / The configuration is still unusable after the save: 嵌入 provider 'dashscope' 需要 rag.embedding_model（没有默认值，请在 rag: 段声明） / Embedding provider 'dashscope' requires rag.embedding_model (no default; declare it in the rag: section)`——**含字段名、可读，且是新代码才有的文案**（旧代码该字段有字面默认、注释掉不报错）。
- **腿二（C-1 文案现场）**：同一响应里**外层 wrapper 与内层均为双语**（`中文 / English`，② 乙的形状）⇒「文案真的到达用户」的真栈证据成立（前端原样渲染 `detail`）。
- **还原**：三份逐字节——`config.yaml ec1b49ae…`（还原后复核一致）、`rag_config.json 323f9046…`（**探针后仍未变＝拒绝即未写**）、`models_config.json ff8d1d5b…`（未碰）；备份目录（含密钥）已删；还原后再 GET ⇒ **200**、有效值不变。
- **B-2 / C-2**：无真栈面（文档/示例），不适用。
- **实施期记录（如实记）**：① 前置核实＝gateway worker 自 16:31 未重启、`--reload` 从未生效（worker 进程始终同一 PID）⇒ 经用户裁定杀旧树（WINPID 28116/31868/28368/30056/36764）并以同款 `uv run --no-sync uvicorn … --port 8001` 重启（日志 `Temp\pair4t5-gateway.log`；runtime home 经启动日志核实＝`backend\.deer-flow\data\deerflow.db` ✓）。② 该杀导致**前端随死**（serve.sh 联动退出；前端不在被杀名单内）⇒ 按 serve.sh 同款命令 `python scripts/pnpm.py run dev` 拉起（`:3000` 200；日志 `logs/frontend.log`）。③ **有效值两层**：`embedding_model` 的 ui 层（rag_config.json）盖过 config.yaml ⇒ 只注释 config.yaml 而不动 payload 不会触发（探针 payload 主动去掉该键）；`pending` 只吃 payload ＋ config.yaml 两层。④ 拒绝发生在**写之前**（`_reject_unusable_after_save` 先于 `_probe_after_save` 与 `write_rag_config`）⇒ 零出网调用、零写入，md5 佐证。

---

## Task 6 — 交付回写

- [x] **spec／plan Status** 改为已交付，记录 ①②③④⑤ 的裁定；**把 A-1 的行为变化与逃逸路径写进交付纪要**（未声明模型名的部署升级后会硬报错——在 `config.yaml` 的 `rag:` 段声明即可）；逐 Task 的「实测」补齐。
- [x] **盘点档**：`A-1` / `C-1` / `C-2` / `B-2` 标已交付并指向本对；（④ 甲时）`B-1` 标已交付；§4 可做清单与 §4.1「共 5 条」随之调整（**本仓自己待修归零**）；计数句同批（坏写死现存 6 → 2？——按各条归属重数，别照抄）。
- [x] 提交按届时授权，Conventional Commits；不推送除非明确要求。

**实测（2026-10-01，开工 HEAD `332b3db7`）**：

- **计数（按各条归属重数，未照抄）**：16 坏 ＝ 已闭合/取代 5（`B-3`／`A-9`／`A-7`／`A-8`／`A-3`）＋ 已交付 10（`A-2`／`A-5`／`A-6`／`A-4`／`C-3`／`A-1`／`C-1`／`C-2`／`B-2`／`B-1`）＋ 上游 1（`A-10`）⇒ **现存 1 条（仅 `A-10`）／本仓自己待修 0 条**（计划里猜的"6 → 2"偏一——按归属重数是 1）。分档：坏-B 现存 **0**、坏-A 现存 **1**（`A-10`）、坏-C 现存 **0**。
- **回写面（18 笔编辑／23 个落点）**：新「交付登记（2026-10-01）」段；「一句话结论」；§3／§3.1／§3.2／§3.3 四个表头；§4 可做清单（8 条那行）＋「门 A 之后」组引言与五条（各加 ✅）＋排期状态；§4.1「共 5 条 → **0 条**」与门 B 引言计数；§4.2「对 4」行与尾行；条目行 **5 处**（`A-1`／`C-1`／`C-2`／`B-2`／`B-1` 各加 ✅ 行，表格结构已校验：每行 2 格、`str \| None` 已转义）。逐条与各轮历史快照不动。
- **交付纪要（A-1 的行为变化与逃逸路径）**：未声明 `embedding_model`／`rerank_model`／`video.asr_model` 的部署，升级后从"静默用厂商默认"变"**响亮报错**"（构建期 `RagConfigurationError`／保存期 400，文案双语、含字段名）；**逃逸路径＝在 `config.yaml` 的 `rag:` 段声明三个模型名**（示例文件已带注释行与占位）。落点：spec Status、plan Status、盘点档交付登记三处。
- **spec／plan Status**：均改「已交付（2026-10-01）」；五项裁定 ①甲 ②乙 ③甲 ④甲 ⑤乙 记全；plan **33／33** 全勾。
