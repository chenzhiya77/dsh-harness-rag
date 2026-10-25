# 本地 MinerU 解析腿:迁到上游 4.x 契约 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** [2026-09-24-mineru-4x-parse-adaptation-design.md](../specs/2026-09-24-mineru-4x-parse-adaptation-design.md)
**Status:** ✅ **已交付（2026-09-24）** —— Task 0–5 全部达成（**Task 5 那半条 `ready` 同日由甲收掉**：设置页把向量提供方临时切 `dashscope` 原生腿 → 富样本上传即 `ready`，随后 `rag_config.json` 逐字节还原）；**Final verification 五条全勾（2026-09-25）**：① 复跑 = `make lint` 双净 + 全量 **158 红**按当次口径收、**A/B（pre-pair 工作树 `e66a3334`，同一 basetemp）双向差集仅 2 条既有环境条件 ⇒ 零回归**；② 复跑 = `pnpm check` 净 + 前端全量 243 文件 / 2621 例 0 失败；③ Task 2 的旧键用例钉住；④ 证据齐（Task 1 六步 + Task 5 应用级两轮 + 两条负向）；⑤ 即本行 + spec 那处。**仍开着的一条另行线**：两条嵌入腿的批上限都是写死的（原生腿查表 10 / 兼容腿固定 20），换端点/模型还会踩——建议另起一对按「声明或探测」做掉（丙）。三项已裁（D1 替换 / D2 `parse_tier` / D3 新起一对），**两项同日改判：① 部署 + 原始 curl 契约实证提前到 Task 1（甲）；② 客户端重写与配置面合并为 Task 2 的单个提交**（工厂 kwarg 与客户端构造签名是同一条链，拆开必留已知红的中间提交）。**✅ Task 0 已核（2026-09-24）——六项全勾、`实测` 已回填；两处更正：zip 图片前缀定案（`images/`，`_unpack_zip` 零改动）、API 侧没有「档位×扩展名」校验（真规则见 spec D8）。✅ Task 1 已实测（2026-09-24）——本机起 4.0.7（`127.0.0.1:8000 --tier flash`，**保持运行**），原始 curl 六步全通，zip 图片前缀与「引用名 == 条目名」两项在真 zip 上验到；证据落 `pr-build/mineru-4x-smoke-2026-09-24/`。✅ **Task 2 已交付（2026-09-24）** —— 后端 9 文件（5 源 + 4 测试/夹具）：RED 27 红 → GREEN 82 绿、neuter 5/5 均有红、`make lint` 双净；更宽面 sweep 的 3 红为环境性预存（A/B 已证）。✅ **Task 3 已交付（2026-09-24）** —— 前端 9 文件（6 源 + 3 测试）：RED 4 红 → GREEN 69 绿、neuter 2 红、`pnpm check` 净、前端全量 243 文件 / 2621 例 0 失败、前端面旧键零残留、prettier 新债 0。✅ **Task 4 已交付（2026-09-24）** —— 文档 3 文件（README 两处 / backend AGENTS 一段 / example yaml 一行）+ 未提交研究档四处引用（不入本笔）：`frontend/AGENTS.md` 复核＝无需改、全仓文档面三类残留之外的旧键已归零。** 开工顺序：Task 0 → 1 → 2 → 3 → 4 → 5。
**Parent:** [2026-09-14-rag-model-provider-adaptation.md](2026-09-14-rag-model-provider-adaptation.md)（本对收它的**腿2**；该 plan :197 的挂起行已加本对注记）

**Architecture:** 一条腿四块 —— **① 客户端 + 配置面（Task 2，一个提交）**（`parse_local.py`：三步上传 → `POST /v1/parse/jobs` → 轮询 → 文件注册表取 zip → `_unpack_zip` → 归一化；`parse_backend` → `parse_tier`：`RagConfig` / `RagConfigFile` / 工厂 / allowlist 行，旧键剥离不建模）**② 前端**（表单字段/选项/「解析档位」行/i18n 三文件）**③ 文档**（README / backend AGENTS / example yaml / 研究档）**④ 部署 + 验收**（Task 1：本机起 4.x 服务 + 原始 curl 契约实证；Task 5：应用级端到端 + 两条负向）。

**硬约束（spec 已裁，实现时不许自行放松）：**

- **替换而非并存**（D1）：`mineru-local` 的 3.4.5 形状整体删掉，不留双实现、不留开关。
- **`mineru-cloud` 零改动**（云腿 `/api/v4` 流程一行不碰；既有守护用例继续绿）。
- **不引入上游依赖**：`mineru` 不进 pyproject；`mineru/parser/api_client.py` 只作调用序列参照。
- **结果只走 zip 一份**（D3）：`output_formats:["zip"]`，解包复用 `_unpack_zip`（`parser.py:658-671`）。
- **旧键处理**：`RagConfigFile.from_file()` 剥离 `parse_backend` + warning；**不**把它留成模型字段（`_build_response` 按 `model_fields` 反射，死字段会连带 `getattr(config.rag, …)` 炸）。
- **tier 值域**：`flash | basic | standard | advanced` + 空（空 = 服务端决定）；不做 `vlm/hybrid` 值映射（4.x 无语义对应）。
- **错误三件套沿用**（`MineruError` / `MineruParseFailedError` / `MineruTimeoutError`）；服务不可达带地址；401 带 `status`。

**Global Constraints:**

- 分支 `feat/rag-knowledge-base`；每个 Task：**RED → GREEN → neuter（带 revert proof）→ 门禁 → commit**（Conventional Commits）。
- **后端命令**：`cd backend && uv run pytest <paths>`（窄面）；`make lint`（ruff check + format）。全量跑法按既有口径（`.pytest-tmp` basetemp、后台跑）。
- **前端命令**：`cd frontend && PYTHONIOENCODING=utf-8 python ../scripts/pnpm.py <script>`；门禁 = `pnpm check` + `pnpm test`。
- **与 [2026-09-24-rag-retrieval-followups](../specs/2026-09-24-rag-retrieval-followups-design.md)（未开工）在 i18n 三文件上同文件 ⇒ 串行**（谁先开工谁先改；另一对开工前重读）。
- **每个 Task 的 `**实测**` 行必须回填**（RED 几条红 / GREEN 几条绿 / neuter 受害者 / 门禁数字）——未回写的 plan 不算交付。
- **不推送**（除非 operator 发话）。
- **scope fence（明确不做）**：服务端 `--api-key` 支持 · `local`/`url`/`inline` 源 · 多文件 job / `page_range` / `callback` · `html/latex/docx` · 上游包依赖 · 3.4.5 形状保留 · `_unpack_zip` 无谓重写（**Task 0 已定案：图片在 `images/` 前缀下 ⇒ 零改动**）。

**依赖顺序**：Task 0（只读核实）→ **Task 1（部署 + 原始 curl 契约实证；装不动 ⇒ 回落到 Task 5 由 operator 环境做，代码侧不受影响）** → Task 2（后端：客户端 + 配置面，一个提交）→ Task 3（前端）→ Task 4（文档）→ Task 5（应用级端到端验收）→ 交付后回写。

---

## Task 0 — 开工前核实（只读）

- [x] 1. **zip 图片前缀**（spec §4.4 开放项）：下载 `docvortex`（上游依赖 `>=0.4.24,<1`）读 `assets.validate_image_sidecar_path` 与 `export.materialize_middle` 的路径约定；确认 4.x zip 的图片条目在 `images/` 前缀下。若与云端不同 ⇒ 最小扩展 `_unpack_zip` 的收集条件（按官方客户端 `api_client.py:953-990` 的双候选规则），并在本 Task 记下结论。
- [x] 2. **job 校验层与 400 文案**：读 `mineru/parser/api_server.py` 里 `ensure_tier_supported_for_parse_extension` 的调用点，记下「tier × 扩展名不匹配」的实际 400 文案（Task 5 负向要用）；确认 `tier` 非法值也由服务端拒（我们的 Literal 只做本地防御）。
- [x] 3. **`parse_backend` 影响面全清单复核**：后端 `app_config.py:219-222` / `rag_config_file.py:103` / `parser.py:744` / `providers/__init__.py:127` / `test_parse_local.py`（**4 处**：:154/:257/:258/:259）/ `test_rag_provider_config.py:96/:124/:134/:245-251` / `test_rag_config_api.py:345/:352/:367` / `fixtures/rag_config/response_golden.json`（5 处）；前端 `config-form.ts:52/:108/:153` / `types.ts:49` / `functional-models-view.tsx:509/:1031-1040/:1057` / `locales` 三文件 `:1741-1742`(types) `:1729-1730`(zh) `:1823-1824`(en) / 测试 2 文件（`config-form.test.ts:76/:103/:449`、`functional-models-view.dom.test.tsx:236/:246`）；文档 `README.md:46/:113`、`backend/AGENTS.md:1176`、`config.example.yaml:2607`、`docs/PRE_RELEASE_HARDCODE_INVENTORY.md:167/:305/:343`。**逐条核一遍有没有漏掉的消费者**（support bundle / i18n manifest / 其它测试夹具），把差异回报。（已预扫：`MineruLocalParseProvider` 只出现于 allowlist + 本测试；support bundle 不露该字段；`contracts/` 无关——复核时确认即可。）
- [x] 4. **前端解析行现状复核**：条件渲染（`mineru-local` 才显示地址/档位行，`:1017`）、`OptionSelect` 的 `labels[option] ?? option` 兜底（`:146-147`）、`:236/:246` 两条 dom 断言的写法（`labelCount("parseBackend")`）。
- [x] 5. **部署条件探针（只探不装）**：磁盘余量、`uv`/Docker 可用性、网络可达性（**已实测 2026-09-24：HuggingFace 不通（HTTP 000）/ ModelScope 通（200）**；小模型包体积 ≈858 MB(ONNX) / ≈895 MB(torch)，ModelScope 上量的）；确认 `--tier flash` 的依赖预检要点（默认档 `standard` 需 torch/VLM 模块，基础包不给 `--tier` 会起不来——`mineru/parser/tier.py:63-77`）⇒ 结论写进 Task 1。
- [x] 6. **`upload_headers` 真实形态**：读官方客户端 `_same_origin_upload_headers`（`mineru/parser/api_client.py`）与上传内容处理（`mineru/parser/api_server.py:1743` 一带），确认 PUT 的目标 origin 与我们该带的头（我们无凭据，预计 = 响应给的 `upload_headers` 原样）。

**实测（2026-09-24 逐条回填；上游 clone `/tmp/mineru-407` @ tag `mineru-4.0.7-released`，docvortex 0.4.25 wheel 从 PyPI 解包读源）：**

- **① zip 图片前缀 = `images/`，已定；`_unpack_zip` 零改动。** 两条独立证据：`docvortex/export/_images.py:58` `path = validate_image_sidecar_path(f"images/{stem}{duplicate}.{extension}")`（stem = `page_{page_idx}_{kind}_{owner.index}`，即 `materialize_middle` → `ParseResult.save()` 这条、也就是 zip 用的那条）；`docvortex/export/bundle.py:38` `path = f"images/{sha256(payload).hexdigest()}.{extension}"`（model_output 外置）。markdown 侧的链接文本 = `join_asset_base_url("", image_path)` 逐字返回 `image_path`（`docvortex/render/_internal/markdown/assets.py`；再做一次 URL quote，而 `page_0_image_1.png` 全在 safe 集合内 ⇒ 恒等）⇒ **zip 条目名 == markdown 链接 == `ParsedImage.ref`**。官方客户端那条「不在 `images/` 下就再试 `images/{path}`」的双候选（`api_client.py:959-962`）是给**旧写法**兜底的，我们**不需要**；`_MEDIA_TYPES` 覆盖 png/jpg/jpeg/webp…（`parser.py:111-118`）与 docvortex 的 `_IMAGE_EXTENSIONS` 同族。
- **② ⚠️ 推翻了 spec/plan 的原判断：API 侧根本没有「tier × 扩展名」这条校验。** `ensure_tier_supported_for_parse_extension`（`mineru/filetypes.py:179`）**只有一个调用点 = CLI**（`mineru/kit/commands/parse.py:94`）；API 走的是 `batch_effective_parse_tier`（`filetypes.py:186-189`）：**扩展名是 flash-only 时静默改成 `flash`，其余原样**（不是报错）。API 侧**真实的** tier 错误只有三条（`mineru/parser/api_server.py:1921-1955`）：**503 `quality_tier_unavailable`**（请求不带 tier + 服务端没有默认质量档 + 整批不是 flash-only ⇒ 文案「No basic, standard, or advanced tier available in this server. Pass tier='flash' explicitly for flash parsing.」）、**400 `Tier 'X' not available in this server`**（显式档该服务端服务不了、且该批不能回落 flash）、**400「Flash parsing is disabled in this server…」**（`--no-flash` + 有 flash-only 输入）。另两条事实：**`--tier` 只收 `flash|basic|standard`（`SERVER_TIERS`，`types.py:114`）——`advanced` 不是启动档**，它由 `--tier standard` 一并服务（`TIERS_BY_SERVER_TIER`，`:120-124`）；**`--tier flash` 的服务端 `default_tier=None`**（`select_default_quality_tier` 只在 standard/basic 里挑，`:157-163`）⇒ **空 `parse_tier` + PDF = 503**（只有整批 flash-only 输入才能落 flash）。非法 tier 取值由 pydantic 拦（`CreateJobRequest.tier: Tier | None`）⇒ 422。
- **③ 影响面清单与 plan 一致，三处补记 + 三处否定**。补记：`parse_local.py:53`（注释点名 `rag.parse_backend`）/ `:116`（错误文案「未知的 parse_backend …」）在重写范围内，**新文案要改成 tier**；`providers/__init__.py` 里**没有** `parse_backend`（那行只改 `path`，plan 口径正确）。否定：**support bundle 无字段消费者**（`scripts/support_bundle.py:246-248` `collect_rag_summary` = `redact_data(_read_json(...))` 结构无关 dump）；**i18n manifest 不覆盖本命名空间**（只有 constitution/delivery/pulse/run-status 四个实例）⇒ 本线唯一的网仍是 `types.ts` 的编译期约束；**`README.md` 里 `parse_backend` 零命中** ⇒ Task 4 的 README 两处是**纯增补**（4.x 序列 + 档位口径），不是换键。
- **④ 前端解析行与 plan 逐条对上**：条件渲染 `:1017`（`values.parse_provider === "mineru-local"`，本地支三行 = 地址 Input / 档位 OptionSelect / token LockedBox，云端支反之）、兜底 `:146-147`、`PROVIDER_LABELS[""] = F.parseBackendAuto` 在 `:509`、dom 两条正是 `labelCount("parseBackend")`（`:236` =0 / `:246` >0；`labelCount` = `queryAllByLabelText(label).length`，`:131`，而 i18n mock 回**key 名**作文案 ⇒ 改键就得改这三处字符串）。**新发现**：`PROVIDER_LABELS` 被 **5 个下拉共用**（嵌入 `:595` / 重排 `:607` / 解析 provider `:1007` / 解析档位 `:1036`；sparse 另有自己的 map `:521-524`，注释点名「shared one borrows the parse backend's wording」）⇒ **改 key 名安全，改 `""` 的值会连带影响另外三行**（Task 3 里别顺手改文案）。
- **⑤ 部署条件（含一条会挡路的）**：`uv 0.11.2` ✓、`docker 29.6.2` ✓、**PyPI 通（200 / 0.86s）**、**ModelScope 通（302 / 0.20s）**、**HuggingFace 不通（000 / 12s 超时）** ⇒ 必须 `MINERU_MODEL_SOURCE=modelscope`。⚠️ **磁盘：C: 仅剩 4.8 GB（98% 满），E: 27 GB** —— 而 MinerU 的模型**不落 HF/ModelScope 缓存**，落 **`model.base_dir` = `$MINERU_HOME/models`（`mineru/config.py:37-44` / `:502`，`MINERU_HOME` 默认 `~/.mineru`）** ⇒ **Task 1 必须把 `MINERU_HOME`（连同 venv、`UV_CACHE_DIR`）放 E:**，否则 C: 会被撑爆。预检要点更正：`_preflight_tier_dependencies`（`api_server.py:2158-2168`）**`--tier flash` 直接 return（完全免预检）**；`basic` 要 `onnxruntime`（+ torch 模块，若小模型后端解析成 torch）；`standard` 要 `onnxruntime` + VLM 模块（除非配了远端 `vlm.server_url`）——**默认 `_DEFAULT_API_SERVER_TIER="standard"`（`:81`）**，所以基础包不带 `--tier` 会起不来。可用现成命令预热/校验：`mineru-kit models download|verify|show`（`docs/en/usage/model_source.md:33-40`），`MINERU_MODEL_SMALL_BACKEND` / `MINERU_MODEL_VLM_ENGINE` 可显式钉后端。
- **⑥ `upload_headers` = 服务端给的字符串映射，原样发。** 本地 `FileStore.create_upload`（`api_server.py:687-712`）→ `_make_upload_response`（`:858-877`）在 `pending` 时给 `upload_url = {base}/v1/uploads/{id}/content`、`upload_method="PUT"`、**`upload_headers = {"Content-Type": <mime>}`**；`status=="completed"` 只出现在 **sha256 去重命中**那条路（我们不发 `sha256sum` ⇒ 恒 `pending`，三步上传是必需的）。官方客户端 `_same_origin_upload_headers`（`api_client.py:1099-1112`）**只在同源时把鉴权头并进去**（`_http_origin` 比较 scheme/host/有效端口）——我们无凭据 ⇒ 用响应里的头即可。另记：官方 `_complete_upload`（`:401+`）对 `upload_already_terminal` 有重试 + `GET /v1/uploads/{id}` 回查，**薄客户端不做这套**（单次 POST，≥400 即报错），与 plan 的客户端骨架一致。

**⇒ 由 ② 引出的文档修订（本轮已改）：spec D8 重写为 API 侧真规则、§4.5 启动档口径 + flash-only 服务端要显式档的告诫、§5 负向② 换成可复现的那条（`tier=standard` 打 `--tier flash` 服务端 ⇒ 400 `Tier 'standard' not available in this server`）、§8 增一条登记；plan Task 5 负向② 同步。**

---

## Task 1 — 起本地 4.x 服务（部署 + 原始 curl 契约实证）

> **有副作用的一步**（已裁「甲」＝部署提前）：独立 venv 或 Docker，**不动主 venv、不碰 `config.yaml`**。约 **2 GB±** 下载（pip 依赖 + 小模型包；ONNX ≈858 MB / torch ≈895 MB，ModelScope 实测）。**本机实测（Task 0.5）：HuggingFace 不通（HTTP 000）、ModelScope 通（200/0.2s）、PyPI 通** ⇒ 必须 `MINERU_MODEL_SOURCE=modelscope`；**C: 仅余 4.8 GB、E: 27 GB ⇒ venv / `UV_CACHE_DIR` / `MINERU_HOME`（模型落 `$MINERU_HOME/models`）一律放 E:**。**若本机装不动 ⇒ 回落到 Task 5 由 operator 环境部署，Task 2–4 不受影响。**
> **验收对应**：spec §4.4 的实证答案（zip 布局）＋ §5 的 6 的前置条件。

- [x] 装：`uv pip install "mineru>=4.0,<5"`（独立 venv，路径在**仓外** scratch，且**放 E:**——Task 0.5 实测 C: 仅余 4.8 GB；`UV_CACHE_DIR` 也指到 E:）；或 Docker（`docker/global/Dockerfile`）；**记下版本号与实际路径**。
- [x] 起：`MINERU_MODEL_SOURCE=modelscope MINERU_HOME=E:\… mineru-api --host 127.0.0.1 --port 8000 --tier flash`（基础包必须带 `--tier`；`--tier` 只收 `flash|basic|standard`，`advanced` 由 `--tier standard` 一并服务）；`GET /v1/health` 通。**建议先 `mineru-kit models download --tier basic --source modelscope` 预热再起**（Task 0.5：`--tier flash` 免预检、模型落 `$MINERU_HOME/models`）。
- [x] **原始 curl 六步**（完全不经我们的代码）：① `POST /v1/uploads`（JSON `{filename, bytes, mime_type, purpose:"parse"}`）→ ② `PUT` 上传内容（**记下 `upload_headers` 的实际形态**）→ ③ `POST …/complete` → ④ `POST /v1/parse/jobs`（`source.type=file_id` + `output_formats:["zip"]` + `tier:"flash"`）→ ⑤ 轮询到终态（记下 `output_files.zip.file_id`）→ ⑥ 下载 zip。
- [x] **看 zip 内容**：确认 `markdown.md` 在、图片在 `images/` 前缀下（与 Task 0.1 的源码结论交叉验证）——**这是 spec §4.4 的实证答案**。
- [x] 服务**保持运行**（供 Task 2 的客户端 smoke 与 Task 5 用）；证据落 `pr-build/mineru-4x-smoke-2026-09-24/`（版本/命令/health/六步请求响应片段/zip 清单）。

**实测（2026-09-24 逐条回填；全部在仓外 `E:\app-mode\mineru-4x`，不动主 venv、未碰 `config.yaml`）：**

- **装**：`uv pip install "mineru>=4.0,<5"` → `E:\app-mode\mineru-4x\venv`（CPython **3.12.13**，uv 托管；`UV_CACHE_DIR` 同根）⇒ **mineru `4.0.7` + docvortex `0.4.25`**。
- **模型**：`MINERU_HOME=E:\app-mode\mineru-4x\home` + `MINERU_MODEL_SOURCE=modelscope`，`mineru-kit models download --tier basic --source modelscope` ⇒ **819 MB** 落 `home\models\MinerU-4_models_onnx`（`models verify --tier basic` = 正常）；`models show` 实测 `model.base_dir = $MINERU_HOME/models`、小模型后端 auto→**onnx**（省掉 torch ≈895 MB）。⚠️ 模型侧档位只收 `basic|standard`（`DEPLOYMENT_TIERS`）⇒ flash 服务端用 `--tier basic` 预热。
- **起**：`mineru-api --host 127.0.0.1 --port 8000 --tier flash --upload-dir …\uploads` ⇒ `GET /v1/health` = `{"status":"ok","version":"4.0.7",…,"sources":["file_id","url","inline"]}`。
- **六步**（`pr-build/mineru-4x-smoke-2026-09-24/smoke.sh`，零我们代码）：① `POST /v1/uploads` ⇒ `status:"pending"`、`upload_url={base}/v1/uploads/{id}/content`、`upload_method:"PUT"`、**`upload_headers={"Content-Type":"application/pdf"}`**（= Task 0.6 预言）、`file:null`；② `PUT` 该 url 带该头 ⇒ **200**；③ `POST …/complete`（body `{}`）⇒ `completed` + `file.id`（服务端回填 `sha256sum`）；④ `POST /v1/parse/jobs`（`file_id` + `["zip"]` + `tier:"flash"`）⇒ **202** `queued`；⑤ 轮询 4 次约 8 s ⇒ `completed`（`duration_ms=7827`、`parser_version=4.0.7`），取 `output_files.zip.file_id`；⑥ `GET /v1/files/{zip}/content` ⇒ 149,849 B。
- **看 zip**：`markdown.md` 在 ✓；图片条目在 **`images/`** 前缀下（`images/page_0_table_2.jpg`）✓ ⇒ **spec §4.4 的实证答案落地，`_unpack_zip` 零改动**。**新增两个非预期但无害的成员**：根级 `model_output.json`（121 KB）与 `middle_json.json` / `structured_content.json`——我们只认 `.md` 与 `images/` 前缀，全部忽略。
- **补一个带真图的样本**（`figure.pdf`：文字 + 栅格图，Chrome headless 印成）：markdown 里 `![](images/page_0_image_3.jpg)` **与 zip 条目名逐字一致**（`identity-check.txt` 的 `identity = True`）⇒ `ParsedImage.ref` 与 markdown 引用同源，解包后链接不会 404。**第一个样本没有图片引用（表格被渲染成 GFM 管道表、那张 jpg 是内部裁片），验不到这条，故补第二个样本。**
- 服务**保持运行**（`127.0.0.1:8000`），供 Task 2 的客户端 smoke 与 Task 5；证据落 `pr-build/mineru-4x-smoke-2026-09-24/`（`notes.md` + `sample/` + `figure/` + `identity-check.txt` + 两个脚本）。

---

## Task 2 — 后端一并交付：4.x 客户端重写 + `parse_backend` → `parse_tier`（**一个提交**）

> 动到的文件：`packages/harness/deerflow/knowledge/parse_local.py`（重写）、`knowledge/parser.py`（工厂那两行）、`config/app_config.py`、`config/rag_config_file.py`、`knowledge/providers/__init__.py`、`tests/knowledge/test_parse_local.py`（重写）、`tests/knowledge/test_rag_provider_config.py`、`tests/test_rag_config_api.py`、`tests/fixtures/rag_config/response_golden.json`。
> **验收对应**：spec §5 的 1 / 2 / 3。
>
> ⚠️ **为什么客户端与配置面必须是同一个提交**：工厂 `build_parse_provider` 传下去的 kwarg 与客户端的构造签名是**一条链**：客户端改收 `tier` 而工厂还传 `backend`（或反过来），保存期构造检查（`_reject_unusable_after_save` → `build_parse_provider`）当场 `TypeError`，`test_rag_config_api.py:343/:426` 两条 PUT 用例立刻红。拆两个提交就必然留一个**已知红的中间提交**；合并是一个用户可见行为变更（「这条腿按 4.x 说话、按档位配置」）的原子切法。RED/GREEN 在任务内部仍**分两波**做。

- [x] **RED（波 A · 客户端契约）**：按 spec §4.2 的序列写契约用例（MockTransport）：① 上传三步（JSON 字段集 = `filename/bytes/mime_type/purpose`、**无 `sha256sum`**；PUT 带 `upload_headers`；complete 路径）；② job 请求体（`files[0].source == {"type":"file_id","file_id":…}`、`output_formats == ["zip"]`、**`tier` 仅在配置非空时出现**）；③ 轮询序列 queued → running → completed；④ zip 解包（`markdown.md` 被 `.md` 兜底接住、`images/*` → `ParsedImage`、ref 逐字一致）；⑤ 归一化两步仍在（文末标题搬迁 + HTML 表→GFM）；⑥ 错误面（不可达带地址 / `failed` 带原文 / `partial` 判失败 / 超时 / 缺 zip 或缺 markdown 报错 / 401 带 status）；⑦ 防御：未知 tier ⇒ `RagConfigurationError`；⑧ **两个照抄官方客户端的防御分支**——create 响应已是 `status:"completed"` 时短路取 `file.id`、`upload_url` 以 `/` 开头时前缀 `base_url`（我们不发 sha256sum，前者大概率不触发，但照抄更稳）。此刻实现还是 3.4.5 形状 ⇒ 红。
- [x] **RED（波 B · 配置面）**：① 新用例 —— 含旧键的 `rag_config.json`（`{"parse_backend": "hybrid", …}`）**仍可载**且 `caplog` 里有 warning（剥离而非报错）；② `parse_tier` 收四值 + 空、拒 `vlm`/`hybrid`/`pipeline`；③ `PUT /api/rag/config` 带 `parse_tier: "flash"` round-trip 且 `sources` 标 `ui`；④ PUT 带旧键 `parse_backend` ⇒ **422**（extra_forbidden）；⑤ golden 夹具换键。此刻模型还是旧字段 ⇒ 红。
- [x] **GREEN**：重写 provider（构造参数：`base_url` 必填、`tier` 可选、`client` / `poll_interval_seconds` / `timeout_seconds`；`_request` 的 JSON 包法沿用，二进制下载另走一条）；改 `RagConfig`（删 `parse_backend`、加 `parse_tier`）、`RagConfigFile`（同上 + `from_file()` 剥离旧键并 `logger.warning`）、`build_parse_provider` 传 `tier=`、allowlist 行 `path` 改 `/v1/parse/jobs`；同步 `response_golden.json`（该夹具是**「纯增」守卫**（`test_rag_config_api.py:443-470` 的 `_assert_pure_addition`）——**字段改名属有意的形状变更、不是违规**，夹具按新键更新即可）。
- [x] **neuter ①（zip）**：把 `output_formats` 改回 `["markdown"]` ⇒ 波 A 的 zip 解包那组断言红。
- [x] **neuter ②（tier）**：`tier` 无条件写进 job 体（空值也发）⇒ 波 A 的「仅配置时出现」红。
- [x] **neuter ③（终态）**：终态判定放宽成「非 failed 即成功」⇒ 波 A 的 `partial` 那条红。
- [x] **neuter ④（剥离）**：`from_file()` 去掉剥离步骤 ⇒ 波 B ① 转红（`extra_forbidden` 把文件判死）。
- [x] **neuter ⑤（值域）**：`parse_tier` 的 Literal 加回 `"vlm"` ⇒ 波 B ② 转红。
- [x] **门禁**：`cd backend && uv run pytest tests/knowledge/test_parse_local.py tests/knowledge/test_rag_provider_config.py tests/test_rag_config_api.py` 全绿；`make lint` 双净。
- [x] **Commit**：`feat(rag): retarget the local MinerU client to 4.x and retire parse_backend`

**实测（2026-09-24 逐条回填；9 文件：5 源 + 4 测试/夹具）：**

- **RED**：三文件同跑 = **27 failed / 55 passed**（波 A 19 红、波 B 8 红；含 golden 的两条「纯增」守卫——字段改名正是它们的形状变更）。
- **GREEN**：同三文件 = **82 passed**。`parse_local.py` 整体重写（三步上传 → `POST /v1/parse/jobs` → 轮询 → 文件注册表取 zip → `_unpack_zip` → 归一化）；`parser.py` 工厂改传 `tier=`；两处 Literal 换 `parse_tier`；`build_parse_provider` 的 kwarg 与客户端构造签名同步落地（这就是合并成一个提交的理由）。
- **neuter（5/5 均有红，均还原后复绿）**：① `output_formats:["markdown"]` ⇒ 大契约用例 1 failed；② `tier` 无条件下发 ⇒ 1 failed（未配置时那条精确体断言）；③ 终态放宽成只认 `failed` ⇒ `partial`/`canceled` **2 failed**；④ 去掉旧键剥离 ⇒ 剥离用例 1 failed（`extra_forbidden` 把文件判死——计划预测的那条）；⑤ Literal 放回 `vlm` ⇒ 值域用例 1 failed。
- **门禁**：`uv run pytest`（三文件）= **82 passed**；**`make lint` 双净**——首次 `ruff format --check` 逮到两个新文件**文末缺换行**，就地 `ruff format` 后 1290 文件全净；`--basetemp=.pytest-tmp` 用完即删。
- **更宽面 sweep**（`tests/knowledge` + `test_rag_config_api` + 两个 probe 文件）= **1195 passed / 50 skipped / 3 failed / 1 error**。那 3 failed 与 1 error **全是环境性预存红**：**路径限定 A/B 证明**（把那 5 个源文件 `git stash push -- <paths>` 回到 HEAD 跑同样三条 ⇒ **同样 3 failed**，随即 `stash pop` 还原并核过 diff 无行尾 churn）；Qdrant 那条是「本机 Qdrant 没起」（setup 期 `httpx.ConnectError`）。
- **顺手钉住的两条既有事实**：`RagConfig` 对旧键是 pydantic 默认忽略（config.yaml 侧静默，新增用例钉住）、`RagConfigFile` 是 `extra="forbid"` ⇒ PUT 带旧键 **422**（用例钉住）；`/file_parse` 全仓**无代码消费者**（只有 allowlist 一行 + 文档），改 `path` 零副作用。

---

## Task 3 — 前端：`parse_tier` 字段、「解析档位」行、i18n 三文件

> 动到的文件：`src/core/rag/config-form.ts`、`src/core/rag/types.ts`、`src/components/workspace/settings/functional-models-view.tsx`、`src/core/i18n/locales/{types,zh-CN,en-US}.ts`、`tests/unit/rag/config-form.test.ts`、`tests/unit/components/workspace/settings/functional-models-view.dom.test.tsx`、`tests/unit/settings/functional-models.dom.test.tsx`（**顺手**：`:1234` 注释里的「解析后端」措辞改「解析档位」，非断言）。
> **验收对应**：spec §5 的 4。

- [x] **RED**：① `config-form.test.ts` 换键（seed 空值 / 提交 `parse_tier` / **断言 `PARSE_TIER_OPTIONS` = 5 项、顺序 `""` + `flash|basic|standard|advanced`**）；② dom 用例 `labelCount("parseTier")`（`:236/:246` 改成新 key）；③ i18n 三文件加 `parseTier` / `parseTierAuto` / `parseTierHint`（zh 值按 spec §4.6 表）——`types.ts` 缺 key 时 tsc 当场红。
- [x] **GREEN**：`config-form.ts`（字段类型 / `PARSE_TIER_OPTIONS = ["", "flash", "basic", "standard", "advanced"]` / `SELECT_FIELDS` / seed）、`types.ts`、`functional-models-view.tsx`（`PROVIDER_LABELS[""] = F.parseTierAuto`、行标签 `F.parseTier` + `info={F.parseTierHint}`、`update("parse_tier", …)`）、locale 三文件。
- [x] **neuter（行条件）**：把档位行的条件渲染反转为「只在 mineru-cloud 下显示」⇒ dom 用例 :236/:246 红。
- [x] **门禁**：`pnpm check` 净；前端全量 `pnpm test` 0 失败；全仓前端面 `parse_backend` 零残留（`Grep` 复核）。
- [x] **Commit**：`feat(rag): expose the MinerU parse tier in the functional-model settings`

**实测（2026-09-24 逐条回填；9 文件：6 源 + 3 测试）：**

- **RED**：两文件同跑 = **`Test Files 2 failed / Tests 4 failed | 65 passed (69)`**（可见的两条：`config-form.test.ts` 的提交断言 `input.parse_tier` 得 `undefined`、dom 本地支 `labelCount("parseTier")` 得 0）；i18n 三文件的 key 在 RED 阶段就先加齐。
- **GREEN**：同两文件 = **69 passed**。除上面五项，另有两点落在实现里：`PROVIDER_LABELS[""]` 是**改 key 名不改值**（那个 map 被 5 个下拉共用——Task 0 记的风险点）；`PARSE_TIER_OPTIONS` 的位置带一段注释，写明退役的 `vlm`/`hybrid` 为什么没有 4.x 对应物（spec D2）。
- **neuter（行条件）**：把档位行的条件渲染反转为「只在 mineru-cloud 下显示」⇒ dom 文件 **`Tests 2 failed | 5 passed (7)`**，正是计划预测的 `:236`/`:246` 那一对；还原后复绿。
- **门禁**：`pnpm check` 净（eslint + tsc，exit 0）；前端全量 `pnpm test` = **`Test Files 243 passed / Tests 2621 passed`，0 失败**（2m24s）；`frontend/src` + `frontend/tests` 里 `parse_backend|parseBackend|PARSE_BACKEND` **零命中**。
- **prettier 内容合规**（本机 `pnpm format` 受 autocrlf CRLF 恒红，故用「`tr -d '\r'` 归一后与 prettier 输出逐行比、再与 HEAD 做 A/B」法）：我新写的两行超 80 列（`config-form.ts` 的单行 `PARSE_TIER_OPTIONS`、`config-form.test.ts` 的单行 `toEqual([...])`）已按 prettier 输出折行 ⇒ **9 文件新债 = 0**（`config-form.ts` HEAD 10 → WT 10 行、`config-form.test.ts` 38 → 38 行，其余 7 个文件的偏离计数逐字未变）。

---

## Task 4 — 文档同步

> 动到的文件：`README.md`（:46 / :113）、`backend/AGENTS.md`（:1176「Parse provider dimension」段）、`frontend/AGENTS.md`（核 :266 一带是否引旧字段）、`config.example.yaml`（:2607）、`docs/PRE_RELEASE_HARDCODE_INVENTORY.md`（未提交档，:167/:305/:343，顺手）。
> **验收对应**：spec §5 的 7。

- [x] README 两处：轻客户端形态仍成立；补「上游 4.x」与 `parse_tier`（档位）口径。
- [x] `backend/AGENTS.md:1176`：把「`POST /tasks` multipart → poll → `/result`」与 `parse_backend` 换掉，改成 4.x 序列（上传三步 / `/v1/parse/jobs` / 文件注册表 zip）+ `parse_tier`。
- [x] `config.example.yaml:2607`：`# parse_tier:   # flash | basic | standard | advanced; empty lets the local service decide`。
- [x] `frontend/AGENTS.md`：核一遍，如需改则改。
- [x] `docs/PRE_RELEASE_HARDCODE_INVENTORY.md`：三处引用同步（该档未提交，属于顺手，不做阻塞）。
- [x] **Commit**：`docs(rag): document the MinerU 4.x local parser`

**实测（2026-09-24 逐条回填；本提交 3 文件：`README.md` / `backend/AGENTS.md` / `config.example.yaml`，研究档未提交不入本笔）：**

- **README 两处**（`:46` 摄取段 / `:113` provider 段）：轻客户端形态一字未动，补的是「对接上游 4.x 的 HTTP 契约（本仓按 4.0.7 验证）」与 `rag.parse_tier` 四档 + 留空 = 服务端定（服务端自身默认 `standard`；`standard`/`advanced` 要服务端装 torch）。两处口径同源，`:113` 只留一句指针。`README_zh/fr/ja/ru.md` 都不含 MinerU 内容（grep 零命中）⇒ 无需跟随。
- **`backend/AGENTS.md:1176`**：`POST /tasks` 那一串换成 4.x 序列，**逐条对 `parse_local.py` 核过**（`:181` `/v1/uploads` → `:203` `/v1/uploads/{id}/complete` → `:216` `/v1/parse/jobs` → `:225` `GET /v1/parse/jobs/{id}` → `:244` `GET /v1/files/{file_id}/content`；中间的原始 `PUT` 用服务返回的 `upload_url` + `upload_headers`），`*-http-client` backend ids 那句随 3.x 一起删（4.x 没有这族 id），`parse_backend` → **`parse_tier` 作为 job 的 `tier` 下发**。
- **`config.example.yaml:2607`**：注释行换键换值域；**注释列仍对齐**（第二列 `#` 与相邻 `parse_provider` / `parse_base_url` 两行同列，实测三行一致）。
- **`frontend/AGENTS.md`：已核＝无需改**（与 spec `:206` 结论一致，本轮复核成立）：`:266` 那句讲的是解析行**锁的是模式、不是厂商地址**，不含字段名也不含旧契约；该文件对 `parse_backend` / `解析后端` 均零命中。
- **`docs/PRE_RELEASE_HARDCODE_INVENTORY.md`（未提交档，顺手）**：**计划写的「三处」与行号 `:167/:305/:343` 都已漂移**——实际是 **4 处实质引用**（`:171` A-5 对照行 / `:269` §4 第 7 条 / `:312` §5「第二版→第三版」表 / `:361` §6.2 附录「文档解析（云）」行）+ **3 处说明性提及**（`:175` 自指、`:370` 相关记录，加上本轮在 `:171` 补的「原名」注记），四处实质引用一次性改名 `parse_tier`（四档 + 空 = 服务端定）；`:175` 那条「等那一对落地后一次性改名、现在不预先改」的待办**按它自己写的前提（代码已交付）改成「已于 2026-09-24 同步」**；`:171` 的字段描述改写成现行文字（原「`pipeline` 有意排除」随 3.x 退役，换成 flash-only 服务端 503 那半句），`app_config.py:219-222` 的**行号范围恰好未变**。该档 untracked ⇒ **不进本笔提交**（与 Task 2 同一处置）。
- **门禁（两层核：模板可加载性 + 旧键残留 grep）**：① **配置模板的「cp 后能起」由既有用例守着**——`backend/tests/test_rag_config.py` + `test_app_config_reload.py` + `test_config_version.py` = **69 passed / 3 failed**，三条**逐条读出成因、均与本次改动无关**：两条断言 `config.models == []` / caplog 里 “No models are configured”，而本机仓库根有真实的 `config.yaml` + `models_config.json`（5 条模型）⇒ 长期存在的环境红；第三条是 `bash` 在本机不可达（`WSL … execvpe(/bin/bash) failed`，`scripts/config-upgrade.sh` 根本没跑起来）⇒ 同为环境条件。我改的是 `rag:` 段里**一行注释**，而这三条用例在 `config.example.yaml` 上断言的是 `rag.table` 与 `version` 两处（后者断言已通过）。`--basetemp=.pytest-tmp` 用完即删。② `*.md` + `*.yaml` 全仓残留 `parse_backend` 只剩三类——**① 本对 spec/plan（18 + 13 处，都是「退役」这一事实的设计叙述）；② 冻结的已交付档**（spec `:209` 点名三份：0814 spec 3 处 / 0817 spec 2 处 / 0817 plan 2 处；同类还有**母 plan 0814 的 3 处**——它记的是 3.4.5 时代的 D2/D4-B 决策，按「已交付文档冻结、修订另起新版」的既定做法**不原地改**，本对就是它的新版）；**③ 本档的 3 处说明性提及**。**除这三类外零残留**（`backend/AGENTS.md` 与 `config.example.yaml` 已各自归零）。

---

## Task 5 — 应用级端到端验收（设置页 → 上传 → 解析）

> 服务应在 Task 1 已起好；**若 Task 1 回落**（本机装不动）⇒ 按 Task 1 的口径先在本机或 operator 环境部署再走本任务。**无鉴权 ⇒ 只绑回环/内网**。
> **验收对应**：spec §5 的 6。

- [x] 前提：`GET /v1/health` 通（Task 1 的服务仍在跑；版本号 / 启动命令 / 模型来源沿用 Task 1 记录）。
- [x] 设置页切 `mineru-local` + `parse_base_url` + `tier=flash`（终态路由 `/workspace/chats/new?settings=models`）→ 保存 200。
- [x] 端到端：上传一份 PDF → 文档状态 `ready` → 图片落盘并就地渲染 → HTML 表归一 GFM（切片抽屉里看行卡/正文）。**（✅ 半条已收：同日用户裁定走「甲」，把向量提供方临时切到 `dashscope` 原生腿后，富样本上传即 `ready`（graph/vector/wiki 三腿全 done）；解析面的三项证据在两轮里都各自取到。）。**
- [x] 负向 ①：服务停掉再上传 ⇒ 错误里带服务地址（`MineruError`）。
- [x] 负向 ②：把设置页的 `parse_tier` 切到 `standard`（服务端是 `--tier flash`）→ 上传 PDF ⇒ 服务端 400 原文 `Tier 'standard' not available in this server`（Task 0.2 实测更正：**没有**「档位×扩展名」那条 400——那是 CLI 的规则，API 侧对 flash-only 扩展名是**静默归一到 flash**）。
- [x] 证据落 `pr-build/mineru-4x-smoke-2026-09-24/`（本任务的日志片段 / 结果快照 / 负向输出；版本与命令沿用 Task 1 证据；按 `jina_`/`sk-` 正则做泄漏自检）。

**实测（2026-09-24 逐条回填；证据落 `pr-build/mineru-4x-smoke-2026-09-24/task5/`：`notes.md` + `doc-records.json` + `ui-snapshots.txt` + `service-log-excerpt.txt` + 两个脚本）：**

- **前提**：`/v1/health` = 200 / `4.0.7`；目标库 = 可写库 **测试2**（`5f532d37…`，测试1 未触碰）。负向①停服务、取完错误后按原命令重启，收尾时仍在运行。
- **设置页 → 保存**：终态路由 `/workspace/chats/new?settings=models`。隐藏窗口下真实点击不可用（`click` 报 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`，视口 0x0），全程用 `evaluate_script` 合成事件；Radix 的条目要「pointerover→pointerenter→pointermove→pointerdown→pointerup + click」并**先把条目 focus 到、再对该元素发 Enter** 才落值（这条已记进 `ui-snapshots.txt`）。`PUT /api/rag/config` 三次保存（`flash` → `standard` → `flash`）**均 200**，文件精确新增三键、原十键逐字未动，重载页面回读与文件一致。
- **正样本（解析腿）**：夹具 `acceptance-small.pdf`（表 + 图同页）；服务端日志留下我们客户端的完整六步（`POST /v1/uploads` → `PUT` → `…/complete` → `POST /v1/parse/jobs 202` → `GET /v1/parse/jobs/{id}` → `GET /v1/files/{id}/content`）；切片 3 条，含 **GFM 管道表**（表头 + 分隔 + 数据行）与 `![](images/page_0_image_6.jpg)`；图片落盘 134109 B 且应用文件端点回 `200 / image/jpeg / 134109 B`。⇒ **spec §5-6 的「解析成功、图片落盘/就地渲染、HTML 表归一 GFM」三项在解析面上全部达成。**
- **⚠ 未达成的那半条（`ready`）**：`path_status = {vector: done, graph: failed}`，`error` = `embedding endpoint HTTP 400: … batch size is invalid, it should not be larger than 10.`。**根因（实测钉死）**：本机 `embedding_provider = openai-compatible` 的 `OpenAICompatibleEmbedder` 默认 **20 行/批**（`embedder_openai.py:42`，无配置旋钮），而 `text-embedding-v4` 在 DashScope **兼容端点**硬上限 **10 行**——拿它自己的 key 直打实测：**10 行 → 200（1024 维）/ 11 行 → 400 / 20 行 → 400**；graph 腿一次调用就嵌整批实体（`graph/indexer.py:92`/`:163` 一次嵌一组抽取结果、`:187` 一次嵌本次触达的全部实体）⇒ 必然 >10 行 ⇒ `worker.py:396-401` 把文档判 `failed`，而 `rag.graph` 没有可跳过的开关。**与本线无关**：本对一行未碰嵌入面；KB 里 5 份 `ready` 文档的摄入时间（09-23 00:16 / 09-13）都早于 `rag_config.json` 的 mtime（**09-23 03:47**）⇒ 换到 openai-compatible 之后这套配置还没成功跑过一次摄入。**三个选项（待裁）**：甲 = 临时把 `embedding_provider` 切 `dashscope`（原生腿按 `dashscope_batch_size` 走 10 行/批）把 `ready` 跑出来再逐字节还原；乙 = 就此登记为既有缺口（openai-compatible 腿的批上限对 DashScope 端点是错的），`ready` 半条留待该缺口修好；丙 = 把「按端点声明/探测批上限」另起一对做掉（本对不动）。
- **✅ 甲 已执行（同日，用户裁定）**：设置页「向量提供方」`OpenAI 兼容 → 阿里百炼 (DashScope)`（`PUT` 200）+ **顺手踩到的坑**——切完那一格仍带文件里存的旧地址，而 `embedder_factory.py:161` 的规则是「存了的 `embedding_base_url` 永远优先」（厂商固定端点的行也一样）⇒ 原生腿会把自家路由拼到 `…/compatible-mode/api/v1/services/…` 上（必 404）；点那一行的「恢复默认」清掉覆盖后重存，文件里 `embedding_base_url` 消失、provider = `dashscope`。**换腿前先量了空间**：同模型（`text-embedding-v4`）同文本两路向量 **cosine = 1.00000000** ⇒ 不换空间、不用重建索引；同一把 key 在原生路 200。**结果**：富样本 `acceptance.pdf`（sha256 `ef85f5f5…c55e`）上传 ⇒ **`ready` / 100% / {vector: done, graph: done, wiki: ready}**；3 切片（chunk 2 = 6 行 GFM 表、chunk 3 = `![图片 page_0_image_6.jpg](images/page_0_image_6.jpg)`，alt 文本是 VLM 说明），图片端点 `200 / image/jpeg / 134109 B`。**机制闭环**：这份文档的切片引用 **27 个实体** ⇒ 兼容腿的「20 行/批」正是死因，原生腿按 `dashscope_batch_size("text-embedding-v4")` = 10 行/批 ⇒ 3 批全过。**还原**：用动手前备份覆盖 ⇒ 622 B / md5 `b0cc81b51c409225e26a737ee78f50b8` 逐字节一致。**乙/丙 仍开着**：那两条腿的批上限写死（20 vs 表）没改，换个端点/模型还会踩；丙（按端点/模型声明或探测批上限）建议另起一对。
- **负向 ①（服务不可达）**：`error` = `本地 MinerU 服务不可达（http://127.0.0.1:8000/v1/uploads）：All connection attempts failed` ⇒ **带地址**；服务停时端口实测 `000`、日志无新行。
- **负向 ②（档位服务不了）**：`error` = `本地 MinerU HTTP 400: {"error":{…"message":"Tier 'standard' not available in this server"…}}` ⇒ **服务端原文**；服务端日志同时有 `POST /v1/parse/jobs … 400 Bad Request`。
- **收尾**：`rag_config.json` 已**逐字节还原** = `622 B / md5 b0cc81b51c409225e26a737ee78f50b8`（与首次保存前读到的一致；甲那一轮直接用动手前备份 `rag_config.original.json` 覆盖，结果同上）；4.x 服务保持运行；KB 测试2 里留了五份验收文档当现场证据（四份 `failed` + 一份 `ready`，未删）；`jina_`/`sk-`/`csrf_token=` 泄漏自检**零命中**；两个夹具 PDF 按 Task 1 先例放仓外 `E:\app-mode\mineru-4x\evidence\task5\`，仓内只留脚本 + 文本证据，sha256 记在 `notes.md`。
- **UI 观察（顺手记，另线决定）**：失败文档在界面上只有「失败」徽章 + hover 卡片 `处理失败，请重试 | 重试`，**不显示原始原因**（地址 / 服务端 400 只在文档记录的 `error` 里）；点行打开的抽屉在解析失败时是 `0 个切片`。

---

## Final verification

- [x] `cd backend && make lint` 双净 + 窄面全绿；全量按**当次基线**口径收（环境红条数随线走、不写死；判据 = **失败集合逐行 diff 不变**）。**（2026-09-25 复跑：`make lint` = `ruff check` All checks passed + `ruff format --check` `1290 files already formatted`；全量 = **158 failed / 12455 passed / 109 skipped / 0 error（21m05s）**。取当次 158 个 node id 到 **pre-pair 工作树（`e66a3334`，两侧同一 basetemp）** 复跑 ⇒ **156 红**、双向差集只有 **2 条既有环境条件**（随机差分 flake——主树复跑即绿；`test_review_changed_public_skills…`——正是那个正斜杠 `PYTHONPATH` confound，A/B 侧设了才绿）⇒ **本对零回归**；窄面全绿由 Task 2 门禁覆盖且此后代码面零改动。）**
- [x] `cd frontend && pnpm check` 净 + 前端全量套件 0 失败。**（2026-09-25 复跑：`pnpm check`（eslint + tsc）零诊断；`pnpm test` = **243 文件 / 2621 例 / 0 失败**（4m03s），与 Task 3 门禁同数。）**
- [x] 老配置守护：`config.yaml` 只有旧字段可载；`rag_config.json` 含 `parse_backend` 可载 + warning（Task 2 用例覆盖）。**（波 B ① 钉住：`from_file()` 剥离 + `caplog` warning；neuter ④ 撤掉剥离时该条转红 ⇒ 守卫有效。）**
- [x] 真服务证据齐：Task 1 的原始 curl 契约实证（六步 + zip 清单）+ Task 5 的应用级端到端与两条负向（并记录实际走的路径：独立 venv / Docker）。**（实际路径 = 独立 venv（仓外 `E:\app-mode\mineru-4x`，`--tier flash`）；证据全在 `pr-build/mineru-4x-smoke-2026-09-24/`：`sample/`（六步）+ `figure/` + `task5/`（两轮 + 两条负向），泄漏自检零命中。）**
- [x] 本对 spec/plan 的 `Status` 翻「已实现 / 已交付」并回填全部 `**实测**` 行 —— 未回写的 plan 不算交付。**（2026-09-25：spec 与 plan 两处 `Status` 均已翻「已交付」，Task 0–5 的 `实测` 行全数回填。）**

## 运行期遗留（不属本 plan 交付，供后续决策）

- **服务端 `--api-key`**：本客户端不支持（401 会以 `MineruError` 呈现）；要支持就是加一个可选 `parse_api_key`（加性）。
- **服务端并发默认 1**（`--concurrency`）：超出排队；我们的 `worker_concurrency=2` 不撞闸但可能排队——本 plan 只保持默认。
- **4.x 迭代快**（8 天 8 个稳定版）：契约钉在 `4.0.7`；升级时按 spec §4.1 重新核（路由 / 请求字段 / 终态集合 / zip 布局）。
- **`partial` 单文件语义**：按失败处理；验收时若发现单文件也会 `partial` 且带可用结果，回报再定。
- **`config.yaml` 里的旧 `parse_backend` 静默忽略**（pydantic 对未知键的既有行为，知情选择）。