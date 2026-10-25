# 生成参数与 ASR 默认的代码卫生 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 每个 Task 走完 RED → GREEN → neuter → revert proof → 门禁 再进下一个；「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-09-30-rag-caption-params-asr-default-design.md](../specs/2026-09-30-rag-caption-params-asr-default-design.md)
**Status:** **✅ 已交付（2026-09-30）** —— plan **23／23**（Task 2 的 6 框为「② 甲 ⇒ 不适用」留档、按计划不勾选）；实施 `46cfaf23`（Task 0 成对入库）／`7aa70c59`（T1 后端）／`e07802c6`（T3 模板与文档）／`b29ef532`（T4 真栈），Task 5 回写为同批文档提交（**均未推送**）。**交付纪要**：A-4 只把两个参数变成"可调"、**不给"该多大"的答案**（1024 够不够、temperature 该不该更低仍是产品决定，本对留白，spec §6.2）；C-3 是一次**调用面收紧**（新调用方必须显式给 model，配置层成为唯一来源）。**四项已裁（2026-09-30）：①甲 ②甲 ③甲 ④乙**（spec §6.1）。**受裁项已按裁定收窄**：**Task 2 标「不适用」**（② 甲 ⇒ 无文件层/无界面/无 golden）、Task 1／Task 3 里带「② 裁乙时」的项不适用、**`B-1` 不搭车**（④ 乙）。**Task 0（只读核实）已完成（2026-09-30，HEAD `075b3b5b`）**：7 个复选框全勾、实测已回填；**D2 按实测就地修正**（值由两条腿在既有 `cfg` 点读取后传入，不在 `request_caption` 里现取——18 处既有桩的理由）；`transcribe_video` 补参清单实为 **7 处**（原写"约 6 处"）。**Task 1 已实施（2026-09-30 提交）**：RED 12 红 → GREEN 234 passed → neuter 2/4/3 红（逐次字节还原）→ 全量 162/12774/160/1 error 与基线集合对照零新增（1 error 已原地 A/B 判为环境条件）。**Task 3 已实施（2026-09-30 提交）**：契约 3 红 → 9 passed、版本 41→42（示例 ＋ chart 两件）、`AGENTS.md` 两处；示例读取面 192 passed / 4 pre-existing red（逐条在基线集合）；**Task 2 不适用（② 甲）**。**Task 4 已实施（2026-09-30 提交）**：真栈三次抓包（2048/0.15 → 1024/0.7 → 1024/0.15）；三份配置逐字节还原（md5 一致）、5 张探针文档按 id 删除、抓包服务停止；环境两折（旧网关经授权处置、前端由用户重启）与一次真 VLM 调用如实记入实测。**同日起草后审查（5 条）已就地修正**：必改＝Task 4 抓包腿按**甲**（探针 `models:` 条目 ＋ `models_config.json` 逐字节还原、需逐次授权）；应改 2 条（`transcribe_video` 锚点写法、清空腿"抓包条目不动"的措辞）；**可选项 2 条未加（可撤）**。
**相关基线:** [盘点档](../../PRE_RELEASE_HARDCODE_INVENTORY.md) §4.2「对 3」＝本对（`A-4` + `C-3`）；`agents_config.py:194-203`（A-4 的形状先例）；[2026-09-28 ASR 服务档](../specs/2026-09-28-rag-asr-service-tier-design.md)（`asr.py` 的最近大改）。

**Architecture:** `config.yaml → RagConfig`（**② 裁甲 ⇒ 无文件层**）；`caption_client` 的两个请求体函数与 `request_caption` 各收两参数（**值由两条腿在既有 `cfg = get_app_config()` 点现取后传入**——Task 0 修正，见 Task 0 实测）；`video/asr.py` 三处签名默认去掉（③ 甲）。**默认值全部保持现状**（1024 / 0.15 / `paraformer-zh`），不声明时行为逐字节不变。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| A-4 | `rag.caption_max_tokens` / `rag.caption_temperature`（默认 1024 / 0.15）＋ `caption_client` 两方言收参数填体（值由两条腿现取） | 改默认值；若 ① 甲，不做 per-腿拆分；探针化 |
| C-3 | `asr.py` 三处签名默认去掉（`FunAsrProvider` / `WhisperProvider` / `transcribe_video`） | 动 `rag.video.asr_model` 默认；动 `resolve_provider` / `resolve_leg_provider` |
| ② ✅ 已裁＝甲 | **只配置层**（无文件层、无界面、无 golden） | 乙分支：文件层两字段 ＋ 视频区两行 ＋ golden（未采用） |
| ④ ✅ 已裁＝乙 | **不搭**（`B-1` 不在本对） | 甲分支：＋ `B-1` 描述两处修正（未采用） |

**待裁：无**（spec §6.1 四项已裁＝①甲 ②甲 ③甲 ④乙）。受裁项落点已收窄：Task 2 标「不适用」、Task 1／Task 3 带「② 裁乙时」的项不适用、`B-1` 不搭车。

## 硬约束

- **默认值全部保持现状**：1024 / 0.15 / `paraformer-zh` 一个都不动；负向对照（不声明 ⇒ 逐字节相同）要有正向执行证据。
- **只改"值从哪来"与"默认从哪来"**：两条 caption 腿**只多传两个值**（在既有 `cfg` 点读取；prompt、target 解析、并发/降级语义一行不动）；`vlm_target`、`worker.py`、prompt、`ANTHROPIC_VERSION` 一行不动。
- **C-3 是调用面收紧**：实施前逐处核 `transcribe_video` 的调用点（fake provider 的要补 `model=`），构造器测试已显式传参（`test_asr.py:232`/`:247`）。
- **不新增机制**：范围校验用 pydantic `ge`/`le`；不造探针、不动保存期检查。
- **共享组件（`app_config.py`）改完必须跑全量**（② 裁甲 ⇒ 不碰 `rag_config_file.py`）。

## 执行纪律

- 当前分支 `feat/rag-knowledge-base`。实施按 **RED → GREEN → neuter（行为还原并记录受害者）→ revert proof → 门禁** 执行；提交／推送按届时明确授权，使用 Conventional Commits。
- 后端在 `backend/` 用 `PYTHONIOENCODING=utf-8 .venv/Scripts/python -m pytest <path>`；ruff 用 `uv run --no-sync ruff check` 与 `uv run --no-sync ruff format --check`。
- ~~前端（② 裁乙时）在 `frontend/` 用 `PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`~~（② 裁甲 ⇒ 本对无前端面）。
- 单测显式绑定临时配置；**caption 请求体用例用 `MockTransport` 拦网**（不真发 VLM）。
- 真栈只允许临时改 **RAG 配置**；`config.yaml` 与 `rag_config.json` 先存档字节/md5，结束逐字节还原；只清理本次创建且可确定 ID 的资源。**Task 4 的抓包腿例外（须经用户逐次授权）**：caption 端点由 `models:` 条目携带（`vlm_target.py:10`）⇒ 需临时增删一条探针条目，`models_config.json` 同样先存档字节/md5、结束逐字节还原。
- **找会被影响的既有断言按界面词汇与数据字段两把扫**（`caption`／`max_tokens`／`temperature`／`paraformer`）。

**依赖顺序**：Task 0（只读核实）→ Task 1（后端：A-4 字段＋消费点＋C-3 签名）→ ~~Task 2（前端，仅 ② 裁乙）~~ **Task 2 不适用（② 裁甲）** → Task 3（示例/版本/文档）→ Task 4（真栈）→ Task 5（回写）。**与多模态角色标题那一对（spec §5.2）**：**② 裁甲 ⇒ 本对不碰前端、与它零碰撞**（原串行约束不适用）。`config_version` 从对 2 的 **41** 起跳 ⇒ 本对 **42**。

---

## Task 0 — 只读核实与基线捕获

- [x] **落点复核（按符号，不按行号）**：`caption_client.py` 的两个模块常量与两个请求体函数、`request_caption` 的签名；`knowledge/captioner.py` 与 `knowledge/video/captioner.py` 的调用形状（**Task 0 修正：两值确实要经过它们**——见实测）；`asr.py` 的 `FunAsrProvider.__init__` / `WhisperProvider.__init__` / `transcribe_video` / `resolve_provider` / `resolve_leg_provider` 五处签名与各自调用点。
- [x] **既有形状取样（逐字）**：`agents_config.py:194-203` 的两个字段（类型/范围/描述句式）；`RagConfig` 里 caption 相关字段（`vlm_model`）的位置与句式；~~（② 裁乙时）`parse_tier` 的两层关系与前端 `SELECT_FIELDS` 形状~~（② 裁甲 ⇒ 不适用）。
- [x] **调用点全表**：`transcribe_video(` 的每一个调用点（生产 ＋ 测试）逐处记录"传没传 model / 用的 provider 是什么"；`FunAsrProvider(` / `WhisperProvider(` 的构造点同理。产出：③ 甲要补参数的**确切清单**。
- [x] **断言扫描（两把扫）**：按数据字段（`max_tokens`／`temperature`／`paraformer`／`asr_model`）与界面词汇（`图片描述`／`VLM`／`屏幕文字`）各扫 `backend/tests` 与 `frontend/tests`，列出会被影响的既有用例（已知候选：`test_asr.py` 的 fake 调用点、`tests/knowledge/video/test_captioner.py`、`test_worker.py`）。
- [x] **碰撞面**：核多模态角色标题那一对是否已落地（`frontend/src/components/workspace/settings/functional-models-view.tsx` 的 diff 是否还在树上、其 spec/plan 是否仍未跟踪）；落地后重扫它的 i18n 键与 DOM 断言（只这两步）。
- [x] ~~**（② 裁乙时）响应 golden 基线**：当场重数 `response_golden.json` 的键集（`get.config`／`get.sources`／`put.*`），作为双向差集基线。~~ **② 裁甲 ⇒ 不适用**（无响应形状变化）。
- [x] **caption 请求形状的现行证据**：用临时配置 ＋ `MockTransport` 捕一次今天的两个请求体（OpenAI 方言 ＋ Messages 方言，`max_tokens`/`temperature` 的现值），存作 Task 1 的"逐字节相同"负向对照。

**实测（2026-09-30，HEAD `075b3b5b`；全部只读，未改任何生产/配置文件）**：

- **落点复核（按符号）**：`caption_client.py`——`_MAX_TOKENS = 1024`（`:27`）／`_TEMPERATURE = 0.15`（`:30`）／`_openai_request`（`:44`，请求体 `:47`）／`_anthropic_request`（`:52`，请求体 `:56`，`:55` 注释）／`request_caption(client, *, target, prompt, images)`（`:70`）。`asr.py` 五处签名与 spec 一致：`:115 def __init__(self, model: str = "paraformer-zh")`、`:137 def __init__(self, model: str = "small")`、`:396 async def transcribe_video(`（`model` 默认在 `:401`）、`resolve_provider(name, *, model: str, ...)`（`:379`，已必填）、`resolve_leg_provider`（`:171`，不收 model）。
- **既有形状取样（逐字）**：`agents_config.py:194-199` `temperature: float | None = Field(default=None, ge=0.0, le=2.0, description="Sampling temperature override (0.0-2.0). …")`；`:200-205` `max_tokens: int | None = Field(default=None, ge=1, le=MAX_AGENT_OUTPUT_TOKENS, …)`（`le` 不收——agent 侧池子上限）。`RagConfig` 的 caption 族在 `app_config.py:191-193`（`vlm_model` / `vlm_timeout` / `vlm_connect_timeout`，全为 `Field(default=…, description="…")` 句式）⇒ 两个新字段照此句式、插在该族附近；与 A-4 先例的差异＝**默认是字面值（非 `None`）**，`description` 无需 "None = …" 尾句。
- **`request_caption` 全仓调用点（两个生产、零测试直调）**：`captioner.py:57`（`_caption_one`，文档图腿）与 `video/captioner.py:100`（`run_shot_prompt`，视频帧腿）；两条腿**都已持有** `cfg = get_app_config()`（`captioner.py:81`、`video/captioner.py:75`）⇒ Task 0 修正的落点现成。
- **调用点全表（③ 甲要补 `model=` 的确切清单＝7 处）**：`test_asr.py` 的 `:117` / `:126` / `:133` / `:177` / `:189` / `:200` / `:434`（全为 `provider=fake` 只传 provider）；已传 model 的 `:142` / `:147` / `:452` 不动；构造器测试 `FunAsrProvider(model=...)`（`:232` / `:247`）显式传 ✅；测试无裸 `WhisperProvider(` 构造（只经 `resolve_provider(..., model=...)`，`:84` / `:273`）。生产唯一 `transcribe_video` 调用点 `worker.py:604` 已传 `model=cfg.asr_model`（`:607`）✅；`resolve_provider` 构造两 provider 时都传（`asr.py:386` / `:388`）✅。**原写"约 6 处"⇒ 实为 7 处**（spec D3 测试面已同步更正）。
- **断言扫描（两把扫）**：数据字段——`test_parser.py:300`（`test_caption_request_allows_transcription_length`）钉 `body["max_tokens"] == 1024`（默认不变 ⇒ 保持绿）；`test_vlm_target.py:283` 只断言 `> 0`；`paraformer`／`asr_model`／`WhisperProvider`／`FunAsrProvider` 命中 13 文件 49 处，其中 9 个 `test_rag_config*.py` 钉的是**配置字段默认**（`app_config.py:157`，D3 边界内不动）⇒ 不受影响。界面词汇——`图片描述`／`屏幕文字` 是两条腿的角色/日志文案，无断言与本次改动相交。前端扫（② 甲下无面，仍扫过）：`paraformer` 只出现在表单自身的 `ASR_MODEL_MENU`／`asrModelForProviderSwitch`（`config-form.ts:421` 及其用例）——那是**表单切换助手**的平行默认，与后端签名默认（C-3）无关；`caption_max_tokens`／`caption_temperature` 全仓（前后端）零命中（新键）。
- **碰撞面**：多模态角色标题那一对**仍未落地**（其 spec 仍未跟踪、`functional-models-view.tsx` 的 diff 仍在树上）⇒ **② 甲下零碰撞**（原乙分支的"排在其后"不适用，无需重扫）。
- **caption 请求形状的现行证据（负向对照，已存）**：临时目录探针（`capture_caption_bodies.py`）＋ `MockTransport`：直调两个构建函数 ＋ 走 `request_caption` 全路各捕一次（不发网）。规范化 JSON（`sort_keys`、无空格）：
  - OpenAI：`{"max_tokens":1024,"messages":[{"content":[{"image_url":{"url":"data:image/png;base64,…"},"type":"image_url"},{"text":"…","type":"text"}],"role":"user"}],"model":"probe-model","temperature":0.15}`
  - Messages：`{"max_tokens":1024,"messages":[{"content":[{"source":{"data":"…","media_type":"image/png","type":"base64"},"type":"image"},{"text":"…","type":"text"}],"role":"user"}],"model":"probe-model","temperature":0.15}`
  - **上线体与直调逐字节相同**；`anthropic-version: 2023-06-01` == 模块常量。Task 1 的"不声明 ⇒ 逐字节相同"以此两份为基线。
- **Task 0 修正（已就地落进 spec D2／§3／§5.1 与本 plan 头部）**：值**不在 `request_caption` 里现取配置**——既有用例里钉住**两条腿** `get_app_config` 的桩共 **18 处**（`test_parser.py` 8、`test_vlm_target.py` 9、`test_recaption.py` 1），若改在 `caption_client` 里现取，这些桩全部失效、用例会去读真实仓根配置（隔离破坏）；且 `caption_client` 的定位是纯传输（模块 docstring）。**改为**：两条腿在各自既有 `cfg` 点读取两值（`captioner.py:81`、`video/captioner.py:75`），经 `_caption_one`（加两参数）与 `request_caption`（收两参数、原样传入）落到请求体。

**复现命令**：`cd backend && PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe <临时目录>/capture_caption_bodies.py`（探针脚本在系统临时目录，不入仓）。

---

## Task 1 — 后端：A-4 两字段＋消费点，C-3 签名默认

> 文件：`config/app_config.py`、~~`config/rag_config_file.py`（② 裁乙时）~~、`knowledge/caption_client.py`、`knowledge/video/asr.py`、`backend/tests/…`、~~`tests/fixtures/rag_config/response_golden.json`（② 裁乙时）~~（② 裁甲 ⇒ 后两项不适用）。
> **验收对应**：spec §4 的 1 / 2 / 3 / 4（第 6 条 ② 裁甲 ⇒ 不适用）。

- [x] **RED：加载链**：无覆盖 ⇒ 两字段取字面默认（`1024`／`0.15`）；范围外取值硬报错；~~（② 裁乙时）文件层覆盖生效、撤销回 config.yaml~~（不适用）。
- [x] **RED：caption 请求体（`MockTransport`，两方言）**：改配置 ⇒ OpenAI 与 Messages 两个请求体的 `max_tokens`/`temperature` 跟着变；不声明 ⇒ 与 Task 0 捕的两个请求体**逐字节相同**。两条腿（文档图／视频帧）各一条正向用例。
- [x] **RED：C-3 的签名形状**：`inspect.signature` 断言三处 `model` 的默认是 `inspect.Parameter.empty`（三处各一条）＋ 行为断言 `FunAsrProvider()` 抛 `TypeError`；`resolve_provider` / `resolve_leg_provider` 的既有形状有守卫。
- [x] **GREEN**：`RagConfig` 加两字段（照 `agents_config` 逐字）；`caption_client` 两个请求体函数与 `request_caption` 各收两参数、**删两个模块常量**；两条腿在既有 `cfg` 点读取两值传入（`_caption_one` 加两参数）——Task 0 修正的形状；`asr.py` 三处签名默认去掉（③＝甲）；给 Task 0 列出的调用点补 `model=`（7 处）；~~（② 裁乙时）`RagConfigFile` 两字段 ＋ golden 更新 ＋ `_registered_additions` 记一句~~（不适用）。
- [x] **neuter：整体还原旧行为**，逐项独立还原并证明 GREEN 恢复、各有对应用例转红：① 两条腿的传值整体还原（`request_caption` 回到只收 target/prompt/images 并读模块常量，值还原为字面 1024/0.15）；② 两方言的请求体函数回到读常量；③ 三个签名默认放回；~~（② 裁乙时）④ 文件层两字段去掉 ⇒ 形状守卫转红~~（不适用）。
- [x] **门禁**：ruff 双净；窄面（caption 两腿 ＋ asr ＋ 配置链）绿；`app_config.py` 是共享加载路径 ⇒ **跑后端全量**（后台执行，结果未回不报绿），与基线集合对照零新增。

**实测（2026-09-30，开工 HEAD `46cfaf23`；实施期间他线落地 `77debea3`——仅前端面，与 Task 1 零重叠）**：

- **RED（12 红 / 164 绿，窄面）**：新增 12 条按预期全红——配置链 3（`test_rag_config.py`：默认／覆盖／越界）、请求体 4（`tests/knowledge/test_caption_client.py` 新建：两方言逐字节负向对照 ＋ 两方言取值——RED 期因构建函数还不收参而 TypeError）、两条腿 2（`test_parser.py` 与 `video/test_captioner.py` 各一条「配置值上线上」）、签名形状 3（`test_asr.py` 三处）。**按设计保持绿的 4 条**：两条腿的默认值负向对照（今天就是 1024/0.15）＋ `resolve_provider`／`resolve_leg_provider` 两条既有形状守卫。
- **GREEN（234 passed / 0 failed）**：窄面扩到含邻接面（`test_vlm_target.py` 两方言既有用例、`video/test_worker_pipeline.py`、`video/test_recaption.py` 的 fake 调用点）。命令：`PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe -m pytest <上述文件> -q --basetemp=.pytest-tmp`。
- **neuter（脚本一张表，三条独立跑、逐次字节还原）**：
  - ① 两条腿的传值整体还原（`request_caption` 回读模块常量、两条腿停传）⇒ **2 红**：两条腿的「配置值上线上」；两条负向对照保持绿（常量即 1024/0.15）。
  - ② 两方言的请求体函数回读常量（签名保留、值取常量）⇒ **4 红**：两方言「取值」用例 ＋ 两条腿的「配置值上线上」（值在构建层被常量顶掉）。
  - ③ 三个签名默认放回 ⇒ **3 红**：三条形状用例（含两条 `TypeError` 行为断言）。
  - **还原**：四个文件 md5 逐字节一致——`caption_client.py 137b6615…`／`captioner.py ef07ce11…`／`video/captioner.py 7f5dc617…`／`video/asr.py cceb3d1f…`。
- **revert proof**：还原后再跑同一窄面 ⇒ **234 passed**（与 GREEN 相同）。
- **ruff**：`ruff check` All checks passed；`ruff format --check` 1310 files already formatted（格式化期就地修掉两条 E501：负向对照串拆成隐式拼接，字符串内容不变）。
- **实施期记录**：① 本机 `Temp\pytest-of-h7242` 拒访（环境条件）⇒ 测试一律加 `--basetemp=.pytest-tmp`（仓内既有 gitignore 名，跑完即删）；② `captioner.py`／`video/captioner.py`／`video/asr.py` 是 CRLF ⇒ neuter 脚本按文件探行尾、模式逐文件转换；③ 他线 `77debea3`（多模态角色标题：前端 ＋ 其两份文档）在本 Task 进行中落地——与 Task 1 的九个文件**零重叠**，`② 甲` 的零碰撞结论不受影响（Task 0 实测的「仍未落地」是当时快照）；④ **A/B 备份同名互覆（如实记）**：为核全量那条 ERROR，备份五个生产文件时两个 `captioner.py` 用同一 basename 互相覆盖 ⇒ `knowledge/captioner.py` 一度被写成视频腿内容；随即以 HEAD ＋ 三处已知编辑**确定性重建**，md5 与 GREEN 记录（`ef07ce11…`）逐字节一致后写回，五个文件 md5 全部复核（`12701e5f…`／`137b6615…`／`ef07ce11…`／`cceb3d1f…`／`7f5dc617…`）、窄面复跑 207 passed。A/B 结论不受影响（ERROR 在 HEAD 同样复现）。
- **门禁（全量）**：**162 failed / 12774 passed / 160 skipped / 1 error**（14:30）。与 09-30 基线（162 / 12756 / 160 / 1 error）**逐条集合对照零新增**：唯一差异是抖动族一换一——基线红·本轮绿 `test_run_manager.py::test_list_by_thread[asyncio]`（单跑复现红）、本轮红·单跑即过 `test_delta_channel_state.py::test_merge_message_writes_randomized_differential`（两条都不碰本对改动面：run 管理／checkpoint 机制）；`passed +18` ＝ 本对 16 条新用例 ＋ 对 2 Task 3 的 2 条模板用例（该基线早于它落地）。**1 error 是环境条件**：`tests/knowledge/wiki/test_generator.py::test_only_dirty_prune_removes_vector_point` setup 期 Qdrant 拒连（本机未运行，`curl localhost:6333` exit 7）；**已原地 A/B**——五个生产文件 `git checkout HEAD --` 后单跑同一用例仍 ERROR ⇒ 非本对引入。

---

## Task 2 — 前端两行 —— **不适用（② 已裁甲，2026-09-30）**

> **本 Task 不执行**：两个参数只进 `RagConfig`（无文件层字段、无界面、无 golden），本对与多模态角色标题那一对零碰撞。以下保留原乙分支的步骤（**留档，不勾选**）。
>
> 文件（原乙分支）：`core/rag/types.ts`、`core/rag/config-form.ts`、`components/workspace/settings/functional-models-view.tsx`、`core/i18n/locales/{types,zh-CN,en-US}.ts`；用例 `tests/unit/rag/config-form.test.ts`、`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`。

- [ ] **RED：保存不丢字段**（B-1 形状的反向守卫）：两个新字段任一有文件层覆盖时，编辑无关字段后 `buildRagConfigInput()` 仍带它。
- [ ] **RED：读取映射**：`formValuesFromConfig()` 把两项（含 `null`/缺键）正确落成表单值。
- [ ] **RED：界面结构**：视频区新增两行（数字行形状，照 `embedding_dimension` 行的既有形状；用 `aria-label` 与分组标题断言，不断言几何）。
- [ ] **GREEN**：触点四处（`types.ts` 两项／`config-form.ts` 表单值类型两行＋`NUMERIC_FIELDS` 或 `TEXT_FIELDS` 归类／`formValuesFromConfig` 两行）＋ 视频区两行 ＋ i18n 新 4 键（两标签两提示）× 3 文件；`hasFormChanges` 随清单自动覆盖。
- [ ] **neuter**：① 从各清单去掉两个新字段 ⇒ 保存不丢转红；② 从 `formValuesFromConfig` 去掉两行 ⇒ 读取映射转红；③ 删掉视频区两行 ⇒ 界面结构转红。
- [ ] **门禁**：`pnpm check` 零诊断；窄面绿；**前端全量**（共享组件，后台执行）。

**实测（待回填）**：

---

## Task 3 — 示例文件、版本与文档

> 文件：`config.example.yaml`、`deploy/helm/deer-flow/values.yaml`、`deploy/helm/deer-flow/README.md`、~~（② 裁乙时）**仓根 `README.md`**~~（② 裁甲 ⇒ 不适用）、`backend/AGENTS.md`、[盘点档](../../PRE_RELEASE_HARDCODE_INVENTORY.md)。**不运行 `make config-upgrade`、不读改用户真实配置。**

- [x] **RED**：模板契约用例扩**两条**（两键的注释示例存在＋不激活；键序插在 parse 族之后或 caption 相关处，按 Task 0 实测的段内位置）＋版本底线 41 → **42**。
- [x] **GREEN**：示例按各段风格（rag 段两处注释示例；`caption_max_tokens: 1024`／`caption_temperature: 0.15`）／版本同批（`config_version` 41 → 42 ＋ chart 两件同升）；`backend/AGENTS.md` RAG 段补两个旋钮 ＋ ASR 段补"模型名必须由调用方给"；~~（② 裁乙时）仓根 `README.md` 补一句~~（不适用）；盘点档 A-4 / C-3 行按 Task 5 统一回写。
- [x] **门禁**：示例契约用例绿；`bash scripts/check_config_version.sh` OK；grep 复核两处新增键出现。

**实测（2026-09-30）**：

- **RED（3 红 / 6 绿，契约文件）**：两条新用例红（注释示例存在＋不激活；键序）＋版本底线改 42 后红；既有 6 条保持绿——**parse 族顺序用例不受影响**（两键没有插进 parse 族）。
- **GREEN**：`config.example.yaml` 在 `# vlm_model: qwen3-vl-plus` 之后加两处注释示例（`# caption_max_tokens: 1024`／`# caption_temperature: 0.15`，注释语义取自字段描述）；`config_version` 41 → 42（`config.example.yaml` ＋ chart 两件同批）；`backend/AGENTS.md` 两处（Caption target resolution 段末补两旋钮句；Video Legs 的 ASR 句后补「模型名必须由调用方给」）。
- **落点裁定（就地记）**：计划给的是"parse 族之后**或** caption 相关处"——选 **caption 相关处**（紧跟 `vlm_model`），理由：两键是 caption 腿的生成参数、配置层也把它们排在 vlm 族旁（`app_config.py:194-195`）；parse 族保持原样（其顺序用例原样绿）。
- **门禁**：契约文件 **9 passed**；`check_config_version.sh` **OK（42 = 42）**；grep 命中 `config.example.yaml:2583` / `:2586`；**示例读取面**（7 个引用 `config.example.yaml` 的测试文件 ＋ 契约文件）**192 passed / 4 pre-existing red**——四条（`test_app_config_reload` ×2、`test_config_version` ×1、`test_doctor` ×1）**逐条都在 09-30 基线集合内**；ruff 对改动的测试文件双净。
- **未跑全量**：本 Task 零生产代码改动（模板/版本/文档 ＋ 契约用例），与对 2 Task 3 同口径只跑示例读取面；`make config-upgrade` 未运行、用户真实配置未读改。

---

## Task 4 — 真栈验收

> 前提：服务运行且已加载本对代码；`config.yaml` 与 `rag_config.json` 先存档字节/md5，结束逐字节还原；**抓包腿另需 `models_config.json` 存档/还原，且动它前须经用户逐次授权**（caption 端点由 `models:` 条目携带，见执行纪律）。

- [x] **腿一（max_tokens）**：**抓包接法（审查后按甲）**：经授权后临时加一条探针 `models:` 条目（`base_url=http://127.0.0.1:8899`），把 `rag.vlm_model` 指向它 ⇒ 改 `caption_max_tokens=2048` ⇒ 入库一张图，抓包显示 `max_tokens: 2048`；清空该字段（**抓包条目不动**）⇒ 抓包回 `1024`。
- [x] **腿二（temperature）**：同上（**抓包条目不动**），`caption_temperature=0.7` ⇒ 抓包 `temperature: 0.7`；清空 ⇒ 回 `0.15`。
- [x] **还原**：**三份**配置逐字节还原（`config.yaml`／`rag_config.json`／`models_config.json`，md5 一致）；删除探针条目与本次创建的测试文档（按 id）；抓包服务停止。
- [x] **C-3**：无真栈面（纯签名形状），在实测里注明。

**实测（2026-09-30，真栈；用户逐次授权已获）**：

- **前置（环境两折）**：① 运行中的 :8001 起初是 **15:07 启的旧实例**（无本对代码、reload 已死——socket 属主核实 PID 10668 ＋ touch 探针无重启）；**经用户授权**精确杀 9576/10668 后，15:41 栈（PID 4244，含本对代码）接管（socket 属主复核为 4244）。② 前端一度下线，**用户重启**后恢复（浏览器会话仍在）。
- **抓包接法（甲）**：探针 `models:` 条目 `task4-caption-probe`（`use=ReasoningReplayChatOpenAI`、`base_url=http://127.0.0.1:8899`、自带 key、`supports_vision`）加进 `models_config.json`；`rag.vlm_model` 指向它。**首次只改了 config.yaml ⇒ 未生效**：`rag_config.json` 的 `vlm_model: mimo-v2.6-flash`（文件层）覆盖了它，第一张图走了真 VLM（**如实记：一次真实配文调用**，无碍后续）；把文件层也指向探针后生效。
- **三次抓包**（每次入库一张 PNG；caption 腿触发 `POST /chat/completions`，`host=127.0.0.1:8899`、`auth_header=yes`、`model=task4-caption-probe-wire`）：

  | # | config.yaml 旋钮状态 | 抓包 `params` |
  | --- | --- | --- |
  | 1（16:42:52） | `caption_max_tokens: 2048`；temperature 未声明 | `max_tokens=2048, temperature=0.15` |
  | 2（16:43:27） | max_tokens 清空；`caption_temperature: 0.7` | `max_tokens=1024, temperature=0.7` |
  | 3（16:44:03） | 两者都清空 | `max_tokens=1024, temperature=0.15` |

  ⇒ 两旋钮各自「改配置跟着变 / 清空回默认」两个方向都具名（抓包日志：`task4_pair3_capture.log`；首轮截断日志 `task4_pair3_capture_round1.log`）。
- **还原**：三份配置逐字节还原、md5 一致（`config.yaml ec1b49ae…`／`rag_config.json 323f9046…`／`models_config.json ff8d1d5b…`）；探针条目随还原消失（`GET /api/models` 复核 false）；5 张探针文档按 id 删除（204×5、残留 0）；抓包服务停止（:8899 已释放）。
- **C-3 无真栈面**：纯签名形状，单测已钉（三处形状 ＋ 两条既有守卫）。
- **实施期记录**：① `rag.vlm_model` 是**两层**字段（config.yaml 被 rag_config.json 覆盖）——只改一层不生效（首轮实证，见上）；② 本机 **Qdrant 未运行** ⇒ 5 张文档的 `vector`／`graph` 腿 `failed`（`caption` 腿 `done`），与全量套件那条 ERROR 同源、非本对引入；证据是 caption 请求体，抓包已具名，文档终态不影响。
- **2026-09-30 补跑（增量记；用户令「起 Qdrant 再跑一次真栈探针」）**：Qdrant 容器 `StartedAt` **16:52:30** 本地（在首轮抓包之后 ⇒ 首轮 `vector`／`graph` 失败属实、非误判）；探针**两层同时**指向（config.yaml ＋ rag_config.json，一次命中）＋ `caption_max_tokens: 2048` ⇒ 入库一张 PNG（doc `45ccc08c…`）：抓包 **18:49:13** `max_tokens=2048, temperature=0.15`；文档终态 **`ready` / 100%**（`path_status: vector done / graph done / caption done / wiki ready`），chunk 正文逐字含探针配文（`![task4 capture: caption](…)`）⇒ **端到端闭环**。还原/清理同纪律：三份配置 md5 逐字节一致（`ec1b49ae…`／`323f9046…`／`ff8d1d5b…`）、探针文档按 id 删（204、残留 0）、探针条目随还原消失（`GET /api/models` 复核）、抓包服务停止。

---

## Task 5 — 交付回写

- [x] **spec／plan Status** 改为已交付，记录 ①②③④ 的裁定；**把两个参数的"只可调、不给答案"边界写进交付纪要**；逐 Task 的「实测」补齐。
- [x] **盘点档**：`A-4` / `C-3` 标已交付并指向本对；~~（④ 若搭车）`B-1` 标已交付~~（④ 裁乙 ⇒ 不搭）；§4.2「对 3」标已交付；计数随 §4 与 §4.1 可做清单调整（「对 3」移出，余「对 4」）。
- [x] 提交按届时授权，Conventional Commits；不推送除非明确要求。

**实测（2026-09-30）**：

- **spec／plan Status**：均改「✅ 已交付（2026-09-30）」；**交付纪要含边界句**——「A-4 只把参数变成可调、不给"该多大"的答案（1024 够不够、temperature 该不该更低仍是产品决定，本对留白）」（spec §6.2 既有条目，交付时重申）。
- **盘点档**：`A-4`／`C-3` 行各加「✅ 已交付」行（指向本对与实施提交）；§4 第 4 条、§4.2「对 3」行、§4.1 可做清单、排期状态、交付登记与「一句话结论」的计数句同批改准——坏写死 **16 − 已闭合/取代 5 − 已交付 5 ＝ 现存 6 条**、**本仓自己待修 5 条**（再减属上游的 `A-10`）；§4「无任何门」组余 **0 条**（原列表 8 条全数交付/移出）、§4.1 可做清单 **7 条 → 5 条**（余 `A-1`／`C-1`／`C-2`／`B-1` 描述修正／`B-2` 剩余载体）。
- **plan 复选框**：**23／23 已执行项全勾**；Task 2 的 6 框为「② 甲 ⇒ 不适用」留档、按计划不勾选（plan 总框数 29）。
- **提交**：按届时授权逐笔提交（Conventional Commits）；**未推送**。
