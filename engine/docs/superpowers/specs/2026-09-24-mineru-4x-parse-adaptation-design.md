# 本地 MinerU 解析腿:迁到上游 4.x HTTP 契约 —— 设计

**Status:** ✅ **已交付（2026-09-24）** —— Task 0–5 全部达成（配套 plan 的 `Status` 与 `实测` 是收口的逐条账本）；**五项已裁（2026-09-24）：D1 换法=替换（甲）/ D2 `parse_backend` 退役为可选 `parse_tier`（甲）/ D3 落点=新起一对（甲）/ 排序=部署提前（甲）/ 后端客户端与配置面合并为一个提交（同日）**。**✅ Task 0 已核（2026-09-24）：zip 图片前缀定案（`images/`、`_unpack_zip` 零改动，§4.4）+ API 侧档位规则更正（D8 重写）**。本对收 [2026-09-14 provider 适配 plan](../plans/2026-09-14-rag-model-provider-adaptation.md) 的**腿2**（该 plan :197，2026-09-23 挂起）：operator 2026-09-24 裁定「**跟进最新版**」⇒ 把 `mineru-local` 从 3.4.5 代形状迁到上游 4.x。配套 plan：[2026-09-24-mineru-4x-parse-adaptation](../plans/2026-09-24-mineru-4x-parse-adaptation.md)（**排序已裁：部署 + 原始 curl 契约实证提前到 Task 1**）。

**Parent:**

- [2026-09-14-rag-model-provider-adaptation-design.md](2026-09-14-rag-model-provider-adaptation-design.md)（provider 维度；§8.1 的 3.4.5 契约、§6 的 D2-A 支持面都在那份）

**相关:**

- [2026-09-24-rag-retrieval-followups-design.md](2026-09-24-rag-retrieval-followups-design.md)（未开工）—— 与本文**在 i18n 三文件上同文件 ⇒ 串行**（谁先开工谁先改）；其余文件面零重叠。

## 1. 问题

### 1.0 一眼看懂

| 面       | 现状（3.4.5 形状）                                      | 本 spec 后（4.x 形状）                                       |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| 送文件   | `POST /tasks` multipart 一步                            | 三步上传：`POST /v1/uploads` → `PUT` → `POST …/complete`     |
| 解析请求 | `lang_list=ch` + `return_md/return_images` + 可选 `backend=…-http-client` | `POST /v1/parse/jobs`：`files[{source}]` + `output_formats:["zip"]` + 可选 `tier` |
| 轮询     | `GET /tasks/{id}`                                       | `GET /v1/parse/jobs/{id}`（`queued/running/completed/partial/failed/canceled`） |
| 拿结果   | `/result` JSON 内联 md + 图片 dataURI                   | 服务端文件注册表：下载 zip → `markdown.md` + `images/*`      |
| VLM 对接 | 请求参数 `backend`                                      | **服务端启动参数**（per-request 只剩 tier）                  |
| 配置字段 | `parse_backend: vlm\|hybrid`                            | `parse_tier: flash\|basic\|standard\|advanced`（空=服务端定） |

```
改什么（5 块）                                     不改什么
────────────                                       ─────────────
① parse_local.py 重写（三步上传/zip/错误映射）      mineru-cloud 腿、parse_document 签名
② 配置面：parse_backend → parse_tier（后端+前端）   归一化两步、集合/向量/检索、worker
③ 前端解析行（字段/选项/文案/i18n 三文件）          无鉴权、内网部署约束、图片 ref 契约
④ 文档 4 处 + adaptation plan 腿2 注记
⑤ 部署 + 真服务验收（Task 1 起 4.x 服务 + 原始 curl 契约实证；Task 5 应用级端到端）
```

### 1.1 上游跨代：钉住的那一代已经不是当前代

- 时间线（2026-09-24 核，GitHub releases + PyPI）：3.x 末班 `3.4.5`（2026-08-14）→ **`4.0.0` 稳定版 2026-09-16** → 8 天连发 8 个稳定版 → **最新 `4.0.7`（2026-09-23）**。`pip install mineru` 今天装到的就是 4.0.7。
- 我们钉契约是 **2026-09-14**（adaptation 线 Task 0，spec §8.1）——当时 3.4.5 还是最新稳定版，**pin 本身没错**；两天后上游跨代，而腿2 恰好挂着没接 ⇒ 一直没暴露。
- 4.x 里 3.x 的服务形状**整体消失**：`mineru/cli/fast_api.py` 不再存在（模块重构进 `mineru/kit`），`/tasks`、`/file_parse` 路由 **确定 404**（上游自己的测试断言 `tests/unittest/test_v1_router.py:365-368`）。

### 1.2 两代形状差在哪（一手，clone @ `mineru-4.0.7-released`）

| 面         | 3.4.5（我们钉的）                                            | 4.0.7（当前）                                                |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 上传       | `POST /tasks` multipart（`files` + Form）                    | `POST /v1/uploads`（JSON）→ `PUT` raw bytes → `POST …/complete`；`inline` 源默认上限 **1 MiB**（`mineru/parser/api_server.py:82`）⇒ 真实文档必须走上传 |
| 解析请求   | `lang_list=ch`、`return_md`、`return_images`、`backend`（`vlm\|hybrid`→补 `-http-client`） | `POST /v1/parse/jobs`：`files[{source,page_range?}]` + `output_formats`（本地集 `markdown\|middle_json\|structured_content\|zip`）+ `tier`（`flash\|basic\|standard\|advanced`，服务端默认 `standard`）+ `ocr_mode`。**语言位没了**；**`backend` 没了**（"对接 OpenAI 兼容 VLM" 变成服务端 `--vlm-server-url`） |
| 轮询       | `GET /tasks/{id}`：`pending/processing/completed/failed`     | `GET /v1/parse/jobs/{id}`：`queued/running/completed/partial/failed/canceled` |
| 结果       | `GET /tasks/{id}/result` → `{results:{stem:{md_content,images}}}`（内联 dataURI） | **只能从服务端文件注册表取**：`files[0].output_files{markdown\|zip}→{file_id}`，字节走 `GET /v1/files/{file_id}/content`；**图片只在 zip 里** |
| 鉴权       | 无                                                           | 默认无（`--api-key` 可选，CLI-only）—— **故事不变**          |
| 旧路由兼容 | —                                                            | **无**（`/tasks`、`/file_parse` 404，上游测试断言）          |

### 1.3 什么没变（所以不是重写整条腿）

- `parse_document` 的调用面：provider 解析、`.md/.txt/.csv/.tsv/.xlsx/.xls` 本地短路、`ParsedDocument(markdown, images)`、错误三件套（`MineruError` / `MineruParseFailedError` / `MineruTimeoutError`，`parser.py:321-339`）—— 全不动。
- 两步归一化（`normalize_mineru_markdown`，`parser.py:647-655`）与图片 ref 契约（ref 与 markdown 链接**逐字一致**，`test_parse_local.py:147` 钉过）—— 全不动。
- **4.x 的 zip 与云端腿同款**（`markdown.md` + `middle_json.json` + 图片 sidecar）⇒ `_unpack_zip`（`parser.py:658-671`）的「任意 `.md` 兜底 + `images/` 前缀收集」正好接得住；云端腿的 `_download_zip`/`_unpack_zip` 形状是现成参照。

## 2. 目标 / 非目标

目标：把 `mineru-local` 迁到上游 4.x（**钉 `4.0.7`**）的 HTTP 契约；配置面把 `parse_backend` 退役为可选 `parse_tier`；前端/测试/文档同步；并给出**可执行的本地部署 + 端到端验收**。

非目标（明确不做）：

- **`mineru-cloud` 零改动**（云腿 `/api/v4` 流程一行不碰，守护用例继续跑）。
- **不支持服务端 `--api-key`**：4.x 允许启动时配 key，但薄客户端不发凭据（沿用「无鉴权、只应内网暴露」的既有约束）。要用 key 的部署接不上——登记（§8）。
- **不做 4.x 的其它源**：`local`（同机路径，需服务端 `--allow-local-source`）、`url`、`inline`（1 MiB 上限）、多文件 job、`page_range`、`callback`、`html/latex/docx`（需 key）。
- **不引入上游 Python 包依赖**：`mineru` 不进 pyproject；官方客户端 `mineru/parser/api_client.py` 只作**参照**（调用序列照抄，代码自写）。
- **3.4.5 形状不保留**：替换而非并存（D1）。
- 不重写 `_unpack_zip` / 归一化（**Task 0 已据 docvortex 源码定案：图片在 `images/` 前缀下、`_unpack_zip` 零改动**——§4.4）。

## 3. 决策

### D1 换法 = 替换（已裁 2026-09-24）

3.4.5 从未部署（零存量），并存要多养一条代码路径 + 设置页加「版本」维度。裁前已摊开的代价：真有人跑 3.4.5 会失去支持——现状无此人；若将来需要，那是新增一格 provider，不是本对的工作。

### D2 `parse_backend` → `parse_tier`（已裁：退役为可选 tier）

- 新字段 `parse_tier: Literal["flash","basic","standard","advanced"] | None`，**空 = 服务端决定**（4.x 服务端默认档 `standard`，`mineru/parser/api_server.py:81`；**flash-only 服务端的例外见 D8**——那种部署空档位会被 503 拒，必须显式给档）。
- **不做值映射**：`vlm` / `hybrid` 在 4.x 无语义对应（后端选择移到服务端），不迁移、不猜。
- **旧键兼容**：`rag_config.json` 是 `extra="forbid"`、且该模块的契约是「老文件继续可载」（`rag_config_file.py:67-75` + `test_legacy_rag_json_without_new_fields_still_loads`）⇒ `from_file()` 对已知旧键 `parse_backend` **剥离 + warning**。**不把它留成模型字段**——`_build_response` 按 `RagConfigFile.model_fields` 逐字段反射（`rag_config.py:206-218`），留死字段会连带 `getattr(config.rag, "parse_backend")` 炸。PUT 载荷里带旧键 ⇒ 422（响亮、罕见）。
- `config.yaml` 侧：`RagConfig` 的 pydantic 默认忽略未知键 ⇒ 旧 `parse_backend` 静默忽略（与其它未知键一致，登记为知情选择）；`config.example.yaml:2607` 的注释行改成新键（操作者看得到）。

### D3 结果获取 = `output_formats:["zip"]`

一份 zip 里已有 markdown + 图片（§1.2 第 4 条），解包复用 `_unpack_zip`；不为「只取 markdown」单独走 `/v1/files` 逐个下载（多一次调用、且图片仍要 zip）。

### D4 上传 = 三步 + 不携带 `sha256sum`

`sha256sum` 是可选字段（`mineru/parser/api_server.py:361-369`）；我们不做整文件哈希（薄客户端纪律）。`purpose:"parse"`；`mime_type` 用本地小表（后缀 → MIME，与 `parser.py:111-118` 的 `_MEDIA_TYPES` 同族的写法；未知后缀回落 `application/octet-stream`）。

### D5 终态 = `completed` 才算成功

`partial`（单文件 job 理论不出现，按失败处理）、`failed`、`canceled` ⇒ `MineruParseFailedError`（带 per-file `error` 原文，缺则带 job 状态）；`queued|running` 继续轮询；未知状态 warning 后继续轮询（沿用现客户端的防御，`parse_local.py:173-174` 同一写法）。

### D6 错误语义不变

`MineruError`（HTTP ≥400 / 形状错，带 `status` 与响应前 200 字）/ `MineruParseFailedError`（文档级失败）/ `MineruTimeoutError`（超时）/ 服务不可达 → `MineruError` 带地址。401（服务端启了 key）也走 `MineruError`（带 `status=401`）。

### D7 轮询参数不变

`poll_interval_seconds` / `timeout_seconds` 保持现默认（5s / 1800s），仍由 `build_parse_provider` 构造时传入。

### D8 档位相关规则一律由服务端裁决（**2026-09-24 Task 0 更正**）

- **API 侧没有「档位 × 扩展名」这条校验**：`ensure_tier_supported_for_parse_extension`（`mineru/filetypes.py:179`，文案「Tier 'X' is only supported for PDF and image files…」）**只有 CLI 调用点**（`mineru/kit/commands/parse.py:94`）；API 走 `batch_effective_parse_tier`（`filetypes.py:186-189`）——**flash-only 扩展名静默归一成 `flash`**，其余原样，不报错。
- API 侧**真实**的档位错误只有三条（`mineru/parser/api_server.py:1921-1955`）：**503 `quality_tier_unavailable`**（请求不带 tier + 服务端无默认质量档 + 整批不是 flash-only；文案「No basic, standard, or advanced tier available in this server. Pass tier='flash' explicitly for flash parsing.」）/ **400 `Tier 'X' not available in this server`**（显式档该服务端服务不了且不能回落 flash）/ **400「Flash parsing is disabled in this server…」**（`--no-flash` + 有 flash-only 输入）。非法取值由 pydantic 拦（`CreateJobRequest.tier: Tier | None`）⇒ 422。
- ⇒ 我们**不镜像任何一条**——薄客户端不复制上游业务规则，服务端 4xx/5xx 时原文回报（D4-B「不把 MinerU 的档位知识搬进 UI」的同一纪律）。
- ⚠️ **连带事实（写进配置文案与文档）**：`--tier` 只收 **`flash|basic|standard`**（`SERVER_TIERS`，`types.py:114`；`advanced` 不是启动档，由 `--tier standard` 一并服务——`TIERS_BY_SERVER_TIER`，`:120-124`）；**flash-only 服务端的 `default_tier=None`**（`select_default_quality_tier` 只在 standard/basic 里挑）⇒ **空档位 + PDF = 503**（只有整批 flash-only 输入才落 flash）。「空 = 由服务端决定」仍成立，但要带上这句告诫。

## 4. 设计

### 4.1 4.x 契约（一手：clone @ `mineru-4.0.7-released`，逐文件核过）

| 端点 | 形状 | 证据 |
| --- | --- | --- |
| 启动 | `mineru-api`（= `mineru.kit.commands.api_server:main`），默认 `127.0.0.1:8000`，`--api-key` 可选 | `pyproject.toml:127`、`mineru/kit/commands/api_server.py:33-35` |
| `POST /v1/uploads` | JSON `{filename, bytes, mime_type, purpose:"parse", sha256sum?}` → `{id, upload_url, upload_headers, status}` | `mineru/parser/api_server.py:361-391`（请求模型）、`:1708`（路由） |
| `PUT /v1/uploads/{id}/content` | raw bytes（服务端按 declared bytes 校验） | `mineru/parser/api_server.py:1743`（路由） |
| `POST /v1/uploads/{id}/complete` | → `{file:{id, …}}` | `mineru/parser/api_server.py:757-822`（逻辑）、`:1760`（路由） |
| `POST /v1/parse/jobs` | `{files:[{source:{type:"file_id", file_id}, page_range?}], tier?, ocr_mode?, output_formats?}` → 202 `{job_id, status, files:[…]}` | `mineru/parser/api_server.py:473-482`（请求模型）、`:1866`（路由）、`:537-550`（响应模型） |
| `GET /v1/parse/jobs/{job_id}` | 终态 `completed\|partial\|failed\|canceled`；`files[0].output_files.zip.file_id`、`files[0].error` | `mineru/parser/api_server.py:137`（状态字面量）、`:526-536`（结果模型）、`:1999-2012`（路由） |
| `GET /v1/files/{file_id}/content` | 二进制（octet-stream） | `mineru/parser/api_server.py:1826-1844` |
| zip 内容 | `_build_self_contained_zip_output` → `ParseResult.save()` 写 `markdown.md` + `middle_json.json` + `structured_content.json` + 图片 sidecar | `mineru/parser/api_server.py:985-990`、`mineru/parser/base.py:105-119`；**图片条目名 = `images/…`**（docvortex 0.4.25：`export/_images.py:58`、`export/bundle.py:38`）；4.x 协议里 `image_path="images/a.png"`（`tests/unittest/test_docvortex_protocol.py:83`） |

> 路由与形状都在 **`mineru/parser/api_server.py`**（`mineru-api` 起的那个服务）；`mineru/kit/router/app.py` 是 `mineru-router`（多 worker 前置）的另一层镜像，**本对的薄客户端只打 `mineru-api`，不涉及**。

- **官方参照客户端**：`mineru/parser/api_client.py` —— `_build_source` :191-206、`_upload` :307-353、`_do_parse` :481-499、`_poll` :519-534、zip 侧车读取 :953-990。我们照抄调用序列。
- **鉴权**：默认无 key ⇒ 一切开放；`--api-key` 时除 `/v1/health` 等公开路径外全要 Bearer（`mineru/parser/api_server.py:1006-1009`、`:2450-2469`）。
- **部署**：flash/basic 用基础包（ONNX/llama.cpp），standard/advanced 需 `mineru[torch]`（`pyproject.toml:96-111`、`mineru/parser/tier.py:63-77`）；Dockerfile `docker/global/Dockerfile`、compose 服务 `mineru-api`（`docker/compose.yaml:32-58`）；Windows 安装 = `uv pip install -U "mineru>=4.0,<5"`（`docs/en/quick_start/index.md:28`）。
- **并发**：服务端 semaphore 默认 1（`mineru/parser/api_server.py:1114`、`:2532`；CLI `--concurrency`），超出的 job 排队不报错；上传默认 1h 过期。

### 4.2 客户端流程（新 `MineruLocalParseProvider`）

```
parse(path):
  1. 上传：POST /v1/uploads{filename, bytes=file size, mime_type, purpose="parse"}
            → PUT upload_url（raw bytes；headers = 响应里的 upload_headers）
            → POST /v1/uploads/{id}/complete → file_id
  2. 建 job：POST /v1/parse/jobs {files:[{source:{type:"file_id", file_id}}],
                                 output_formats:["zip"]（+ tier 仅当配置非空）} → job_id
  3. 轮询：GET /v1/parse/jobs/{job_id} 直到终态
  4. 取件：GET /v1/files/{zip_file_id}/content → bytes → _unpack_zip
  5. 归一：normalize_mineru_markdown(...)（与云端腿同一段）
```

- 构造参数：`base_url`（必填；缺 ⇒ `RagConfigurationError`）、`tier`（可选，值域四档；未知值 ⇒ `RagConfigurationError`——防御性，配置层 Literal 先拦，沿用 `parse_local.py:115-116` 的既有写法）、`client`、`poll_interval_seconds`、`timeout_seconds`。
- JSON 端点沿用现 `_request` 的包法（`httpx.HTTPError` → `MineruError` 带 URL；`>=400` → `MineruError` 带 status；非 JSON → `MineruError`）；zip 下载是二进制端点，不走 JSON 解析。
- 服务端地址拼接：`base_url.rstrip("/")` + 路径（现状不变）。

### 4.3 配置面变更表

| 文件 | 现在 | 改成 |
| --- | --- | --- |
| `config/app_config.py:219-222` | `parse_backend: Literal["vlm","hybrid"] \| None` | `parse_tier: Literal["flash","basic","standard","advanced"] \| None`（描述改「Optional tier hint for the local MinerU 4.x service; None lets the service decide (its default is standard)」） |
| `config/rag_config_file.py:103` | 同上（UI 文件层） | 同上 + `from_file()` 剥离旧键 `parse_backend`（一行 warning） |
| `knowledge/parser.py:742-744` | `kwargs["backend"] = section.parse_backend` | `kwargs["tier"] = section.parse_tier` |
| `knowledge/providers/__init__.py:127` | `path="/file_parse"` | `path="/v1/parse/jobs"`（登记形状；解析腿无 `path` 消费者） |
| `routers/rag_config.py` | —— | 无 capability / 保存期检查变化（解析腿没有 capability 块；`_reject_unusable_after_save` 的「缺 base_url ⇒ 400」守护不动） |
| `frontend/src/core/rag/config-form.ts` | `parse_backend` 字段 / `PARSE_BACKEND_OPTIONS` | `parse_tier` 字段 / `PARSE_TIER_OPTIONS = ["", "flash", "basic", "standard", "advanced"]` |
| `frontend/src/core/rag/types.ts:49` | `parse_backend?: "vlm" \| "hybrid" \| null` | `parse_tier?: "flash" \| "basic" \| "standard" \| "advanced" \| null` |
| `frontend/.../functional-models-view.tsx:1030-1044` | 「解析后端」行 + `PROVIDER_LABELS[""] = parseBackendAuto` | 「解析档位」行；labels 里 `""` 换 `parseTierAuto`；4 个档位 id 不加标签（`OptionSelect` 的 `labels[option] ?? option` 兜底，`:146-147`） |
| 测试 | `test_parse_local.py`（**13 例**，实测 collect-only）、`test_rag_provider_config.py:96/:124/:134/:245-251`、`test_rag_config_api.py:345/:352/:367`、`fixtures/rag_config/response_golden.json`（5 处；该夹具是**「纯增」守卫**（`test_rag_config_api.py:443-470`）——字段改名属**有意的形状变更**、不是违规，夹具按新键更新即可）、`frontend/tests/unit/rag/config-form.test.ts` | 全组重写/改键（见 plan Task 2–3 的文件清单） |

### 4.4 图片与 ref（不变的部分）

`ParsedImage.ref` 必须与 markdown 里的链接文本逐字一致（captioner 按 ref 改写 alt、worker 按 ref 落盘）——zip 里条目名即 ref（`images/xxx.png`）。**✅ 2026-09-24 Task 0 已从 docvortex 0.4.25 源码定案**（两条独立写入点都带前缀：`export/_images.py:58` `images/{page}_{kind}_{index}.{ext}`（= zip 用的 `materialize_middle`）、`export/bundle.py:38` `images/{sha256}.{ext}`（model_output）），且 markdown 的链接 = `join_asset_base_url("", image_path)` 逐字返回 + 一次 URL quote（对这些文件名恒等）⇒ **zip 条目名 == markdown 链接 == `ref`，`_unpack_zip` 零改动**。官方客户端那条「不在 `images/` 下再试 `images/{path}`」的双候选（`api_client.py:959-962`）是给旧写法兜底的，不需要。Task 1 的 curl 实证只作现场复核。

### 4.5 部署与验收路径

- 起服务（**plan Task 1 执行**）：`uv pip install -U "mineru>=4.0,<5"` → `mineru-api --host 127.0.0.1 --port 8000 --tier flash`（Windows 有官方安装路径；Docker 可走 `docker/global/Dockerfile` + compose 的 `mineru-api` 服务）。**无鉴权 ⇒ 只绑回环/内网**。
- ⚠️ **落盘位置（Task 0.5 实测）**：模型**不落 HF/ModelScope 缓存**，落 `model.base_dir` = **`$MINERU_HOME/models`**（`mineru/config.py:37-44`/`:502`；`MINERU_HOME` 默认 `~/.mineru`）⇒ **装的时候就把 `MINERU_HOME`（连同 venv、`UV_CACHE_DIR`）指到大盘**（本机 C: 仅余 4.8 GB、E: 27 GB）。可先 `mineru-kit models download|verify` 预热。
- 档位与依赖：`--tier` 只收 **`flash|basic|standard`**；`_preflight_tier_dependencies`（`api_server.py:2158-2168`）对 **`flash` 直接 return（免预检）**，`basic` 要 `onnxruntime`（+ torch 模块，若小模型后端解析成 torch），`standard` 还要 VLM 模块（除非配远端 `vlm.server_url`）——**默认启动档是 `standard`（`api_server.py:81`）**，所以基础包不带 `--tier` 起不来。客户端只发档位、不管服务端装没装。
- 模型来源：`MINERU_MODEL_SOURCE ∈ auto|huggingface|modelscope|local`（`auto` 先探 HuggingFace）——大陆网络直接用 `modelscope`（或先下好再 `local`），别等 HF 探测（`docs/en/usage/model_source.md:16-29`）。
- 验收（plan Task 5；部署与原始 curl 契约实证在 Task 1）：设置页切 `mineru-local` + `tier=flash` → 上传一份 PDF → 解析成功 → 图片落盘/就地渲染 + HTML 表归一 GFM；负向两条（服务未起 → 错误带地址；档位服务不了 → 服务端原文，见 §5.6）。

### 4.6 文案（原文 → 改成）

| 文件 | key | 原文 | 改成 |
| --- | --- | --- | --- |
| `locales/zh-CN.ts:1729` | `parseBackend` | 解析后端 | `parseTier` → **解析档位** |
| `locales/zh-CN.ts:1730` | `parseBackendAuto` | （由服务决定） | `parseTierAuto` → **（由服务决定）** |
| zh 新增 | `parseTierHint` | —— | 档位由 MinerU 服务端定义：flash / basic 轻量，standard / advanced 需要服务端装 torch。空 = 由服务端决定（默认 standard）。 |
| `locales/en-US.ts:1823` | `parseBackend` | Parsing backend | `parseTier` → **Parsing tier** |
| `locales/en-US.ts:1824` | `parseBackendAuto` | (let the service decide) | `parseTierAuto` → **(let the service decide)** |
| en 新增 | `parseTierHint` | —— | Tiers are defined by the MinerU service: flash / basic are light; standard / advanced need its torch extra. Empty lets the service decide (default: standard). |

`locales/types.ts` 同步加/改 key（tsc 双文件约束）。行标签仍挂 `info={F.parseTierHint}`（与 `parseBaseUrlHint` 的既有用法一致，`functional-models-view.tsx:1002`）。

## 5. 验收

1. **客户端契约钉（新 `test_parse_local.py`，MockTransport 全流程）**：① 上传三步的形状（`POST /v1/uploads` 的 JSON 字段集与值、**无 `sha256sum`**；`PUT` 带 `upload_headers`；complete 的调用）；② job 请求体（`files[0].source.type=="file_id"`、`output_formats==["zip"]`、**`tier` 仅在配置非空时出现**）；③ 轮询序列（queued → running → completed）；④ zip 解包（`markdown.md` 被 `.md` 兜底接住、`images/*` 收成 `ParsedImage`、ref 逐字一致）；⑤ 归一化两步仍在（文末标题搬迁 + HTML 表→GFM）。
2. **错误语义**：服务不可达（错误带地址）/ job `failed`（带服务端原文）/ `partial` 也判失败 / 超时 / 结果缺 zip 或缺 markdown 报错不静默 / 401 带 `status=401`。
3. **配置面**：`parse_tier` Literal 收四值 + 空；`parse_backend` 从两个模型删除；**含旧键的 `rag_config.json` 仍可载**（剥离 + warning 各一条断言）；PUT 载荷带旧键 ⇒ 422；`/api/rag/config` round-trip `parse_tier`；`response_golden.json` 换键；缺 `parse_base_url` 的保存期 400 守护不动（既有用例）。
4. **前端**：`PARSE_TIER_OPTIONS` 与表单 seed/提交；「解析档位」行只在 `mineru-local` 下出现（既有条件渲染不动）；i18n 三文件（key 改名 + 新 hint）后全仓 **`parse_backend` 零残留**（前端面）。
5. **门禁**：`pnpm check` 净；前端全量套件 0 失败；后端窄面绿 + 全量按**当次全量基线**口径收（环境红条数随线走、**不写死**；判据 = **失败集合逐行 diff 不变**）。
6. **真服务验收（4.x）**：Task 1 先在本机起 4.0.7 并跑原始 curl 六步实证契约（**若本机装不动 ⇒ 回落由 operator 环境部署，Task 2–4 不受影响**）；Task 5 在设置页切 `mineru-local` + `tier=flash` → 上传 PDF → 解析成功、图片落盘/就地渲染、HTML 表归一 GFM；负向：服务停 ⇒ 错误带地址；**档位服务不了 ⇒ 服务端 400 原文**（把 `parse_tier` 切到 `standard` 打 `--tier flash` 的服务端 ⇒ `Tier 'standard' not available in this server`；Task 0.2 更正：API 侧**没有**「档位×扩展名」那条 400，flash-only 扩展名是静默归一）。证据落 `pr-build/mineru-4x-smoke-2026-09-24/`。
7. **文档与状态**：§6 清单全部同步；本对 spec/plan 的 `Status` 翻「已实现/已交付」；adaptation plan 的腿2 行有改判注记。

## 6. 文档同步

- `README.md:46`「解析可接自建服务」段：轻客户端形态仍成立；补「上游 4.x」与档位口径（`parse_tier`）。
- `README.md:113`「三条外部依赖可选 provider」：解析那句同上。
- `backend/AGENTS.md:1176`「Parse provider dimension」段：换掉 `POST /tasks` 序列与 `parse_backend` 描述，改成 4.x 序列 + `parse_tier`。
- `frontend/AGENTS.md`：**已核＝无需改** —— `:266` 那句讲的是解析行的**锁定语义**（锁的是模式、不是厂商地址），不含字段名或旧契约，改名后仍成立。
- `config.example.yaml:2607`：注释行改成 `# parse_tier: … # flash | basic | standard | advanced; empty lets the local service decide`。
- `docs/PRE_RELEASE_HARDCODE_INVENTORY.md`（**未提交**的研究档，`docs/` 根）：`:167` / `:305` / `:343` 引了 `parse_backend`——顺手同步（不阻塞本对）。
- **留档不改（有意）**：`2026-09-14-rag-model-provider-adaptation-design.md`（:5/:157/:233）、`2026-09-17-rag-rerank-parse-alignment-design.md`（:17/:136）与 `2026-09-17-rag-rerank-parse-alignment.md`（:58/:68）里对 3.4.5 契约 / `parse_backend` 的描述属**已交付文档、冻结不动**——本对是它们的新版，不是漏改。

## 7. 证据

- 上游 clone：tag `mineru-4.0.7-released`（2026-09-24 浅克隆，`gh api` 逐 tag 复核过 3.4.5 与 4.0.x 的目录差异）。
- **Task 0（2026-09-24）补充的三条一手证据**：① **zip 侧车前缀** = docvortex **0.4.25** wheel（从 PyPI 取、只解包不安装）的 `docvortex/export/_images.py:58` 与 `export/bundle.py:38`，加上 `docvortex/render/_internal/markdown/assets.py::join_asset_base_url`（空 base ⇒ 逐字返回）；② **API 侧档位规则** = `mineru/parser/api_server.py:1921-1955`（三条错误）+ `mineru/filetypes.py:186-189`（静默归一）+ `mineru/types.py:114-124`（`SERVER_TIERS` / `TIERS_BY_SERVER_TIER`）+ `api_server.py:2158-2168`（`--tier flash` 免预检）；③ **上传响应形状** = `api_server.py:687-712` / `:858-877`（`pending` + `upload_headers={"Content-Type": …}`）+ `api_client.py:1099-1112`（同源才并鉴权头）。磁盘/网络实测见 plan Task 0 的 `**实测**`。
- 4.x 契约行号见 §4.1 表（`mineru/parser/api_server.py`、`mineru/parser/api_client.py`、`mineru/parser/base.py`、`mineru/filetypes.py`、`pyproject.toml`、`docker/compose.yaml`）。
- 旧路由 404：`tests/unittest/test_v1_router.py:365-368`。
- 我们侧现状行号：见 §1.0/§1.3/§4.3 各表（均在 `backend/packages/harness/deerflow/knowledge/`、`backend/app/gateway/routers/rag_config.py`、`frontend/src/core/rag/`、`frontend/src/components/workspace/settings/`）。

## 8. 边界与开放项

- **不支持 `--api-key`**（登记）：服务端启用 key 后本客户端会收到 401（`MineruError` 带 status）。将来若要支持，是加一个可选 `parse_api_key` 字段（加性），不在本对。
- **服务端并发默认 1**：超过的 job 排队（不报错）；我们的 `worker_concurrency=2` 不会撞闸，但可能排队——登记，不引入新配置。
- **4.x 迭代快**（8 天 8 个稳定版）：契约钉在 `4.0.7`；升级时按 §4.1 重新核（漂移检测点：路由、请求字段、终态集合、zip 布局）。
- **`partial` 的单文件语义未实测**：按失败处理（D5）；Task 1 的 curl 实证 / 验收时看一眼真实行为，若发现单文件也会 `partial` 且带可用结果，回报再定。
- **zip 图片前缀**：**Task 0 已定案（`images/` 前缀，`_unpack_zip` 零改动）**——见 §4.4 的证据；Task 1 的现场复核只作交叉验证。
- **flash-only 服务端的空档位会 503**（Task 0.2/§4.5）：配置文案「空 = 由服务端决定」仍成立，文档要带上这句告诫（这类部署必须显式给档）。
- **`config.yaml` 里的旧 `parse_backend` 静默忽略**（与其它未知键一致）——知情选择，登记。
- **档位依赖是服务端部署事实**（standard/advanced 要 torch），客户端不校验、不提示（只发档位）。