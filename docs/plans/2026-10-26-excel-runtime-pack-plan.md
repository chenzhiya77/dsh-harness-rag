# R1 Excel 可选件随运行时包 —— plan

**Status:** 已拍·实施中（2026-10-26 Task 0–2 完成；Task 3–4 待做；只覆盖 spec §9 R1，R2–R5 仍待裁）
**Date:** 2026-10-26
**配套 spec:** [2026-10-24-single-download-distribution-spec.md §9 R1](../specs/2026-10-24-single-download-distribution-spec.md)

**硬约束**：只改单仓 `E:\app\python\agent\dsh-harness-rag`；主树 `deer-flow` 零改动；**本 plan 保持 `engine/` 零 diff**——走 pack-only 注入，不改引擎依赖/锁；若 Task 0 证明不可行，先停下报告，不在本 plan 内改引擎。不覆盖 `v0.1.0` 的既有 Release 资产；发布候令；token 与任何 `api_key` 不落日志、不进提交面；`node_modules/`、`dist/`、运行时 zip 与解压物不纳入提交；提交信息英文 Conventional ASCII。

## Task 0 — 落点核实（只读）

> 目的：钉死 wheel、注入点、门控与发布版本；发现与 spec 冲突先停下登记，不带旧前提写代码。

- [x] wheel 核实：`python-calamine==0.8.2` 的 win_amd64 cp312 wheel 可从 PyPI 取得；记录文件名、大小、sha256、许可证（MIT）与运行依赖（预期无）；确认它能在 Python 3.12.13 Windows x64 下 import。
- [x] 构建链核实：在临时 target 上复现 `uv export --frozen --no-dev --extra umap --no-hashes --no-emit-project`，把 `python-calamine==0.8.2` 追加到 requirements 后用 `uv pip sync --target` 安装；确认 import 与 `CalamineWorkbook.from_path` 对临时 `.xlsx` 可读。若 `uv pip sync` 不接受额外行或强依赖缺失，评估同 target 的 `uv pip install --no-deps` 第二段安装；仍不行则停下报告，不改引擎。
- [x] 构建脚本落点：确认 `scripts/build-runtime-pack.mjs:245-272` 的 requirements 生成/过滤/sync 顺序；确认新增的额外 requirements 在 lock 导出之后、sync 之前并入，且不绕过现有 `kept.length < 300` 守卫。
- [x] 版本与发布：当前 `runtime.json` 为 `0.1.0-2`（GitHub `v0.1.0`）；默认目标改为新 release `v0.1.1` + 运行时 `0.1.0-3`；核对 `package.json`、README/手册安装示例、`market/index.json` 的 `v0.1.0` 引用；确认 draft Release → 上传资产 → 发布 → tag 可见的顺序，不是只给 `v0.1.0` 追加资产。
- [x] 本地包匹配：确认 `DSH_HARNESS_RAG_PACK` 仍按 `runtime.json` 的目标版本校验（`provision.ts:137`）；准备 Task 2 的插件临时副本方案（副本清单改为 `0.1.0-3`，仓库清单不动）。
- [x] 门控与测试缝：确认 `rag.table.enabled` 默认 false（`config.example.yaml:2739-2740`）、上传 allowlist 与解析路由；准备临时 `.xlsx` fixture（openpyxl 生成）与 `.tsv`/`.csv` 对照；确认 `.xlsx/.xls` 走 `_parse_excel` + calamine。
- [x] 零 diff 基线：记录 `engine/` 当前 `git diff` 为空；若 pack-only 需要任何引擎改动，立即停止并回报。

**实测（2026-10-26）**：

- **wheel**：`python_calamine-0.8.2-cp312-cp312-win_amd64.whl`，774,599 B，sha256 `7a64237cc6b3d56b478686adff16502aecaf356543204bd6c70d754023a3d6aa`；PyPI `license_expression: MIT`、`requires_dist: null`（无运行依赖）；在 3.12.13 x64 便携解释器下 import 成功。wheel 存 `D:\hrag-r1-probe\`。
- **构建链**：`uv export --frozen --no-dev --extra umap --no-hashes --no-emit-project` 导出 613 行；按脚本同款规则过滤后 611 行（守卫 ≥300 通过）；追加 pin 后 176 条（含平台/版本 marker，win32+3.12 实际 172 包）。`uv pip sync --python <0.1.0-2 便携 python> --target D:\hrag-r1-probe\full\site-packages <requirements>` 成功：`Installed 172 packages`，含 `python-calamine==0.8.2`，target 809 MB；日志 `D:\hrag-r1-probe\full\sync.log`。
- **读表夹具**：同一解释器 + 完整 target，`python_calamine.__file__` 指向 target；openpyxl 生成的 `fixture-openpyxl.xlsx`（4,874 B）读出 `[['name','value'],['alpha',1.0],['beta',2.0]]`；`.tsv`/`.csv` 对照各 26 B，均在 `D:\hrag-r1-probe\full\`。
- **构建脚本**：导出/过滤/守卫在 `scripts/build-runtime-pack.mjs:246-264`，`:267` 以位置参数调用 `uv pip sync`；额外 pin 应插在 `:263` 守卫之后、`:264` 写回之前，不绕过守卫。
- **版本与发布**：`runtime.json` 仍为 `0.1.0-2`；GitHub 仅 `v0.1.0`（资产 `harness-rag-runtime-win32-x64-0.1.0-2.zip`，330,283,067 B），无 `v0.1.1`。`package.json` 为 `0.1.0`；README `:163`/`:170`/`:204`、手册 `:5`/`:9`/`:16`/`:76`、`market/index.json` 的 `0.1.0` 均待 Task 3 同步。
- **本地包**：`provision.ts:137` 要求 manifest `runtimeVersion` 与目标版本严格相等；`manifest.ts:168-171` 即使 `allowUnpublished` 也拒绝 `runtimeVersion=0.0.0-0`、`size=0`、`unpackedSize=0`。Task 2 副本必须填真实非零 `size`/`unpackedSize`，`sha256` 需 64 位 hex（本地 zip 不校验哈希，但清单校验要求格式）。
- **门控/路由**：`RagTableConfig.enabled` 默认 false（`app_config.py:171`；示例 `config.example.yaml:2739-2740`）；上传门 `knowledge_service.py:476-479`，`/supported-formats` 在 `knowledge_bases.py:271-282`；`.xlsx/.xls` 走 `parser.py:1035` 的 `_parse_excel`，惰性 import 在 `parser.py:391`；`.tsv` 走 `_DELIMITED_SUFFIXES`（`parser.py:94`），`.csv` 不门控。
- **零 diff/身份**：`git diff --exit-code -- engine` 为 0，`git status --short -- engine` 为空；`a4942966b..HEAD -- engine/backend` 无差异（仅 `engine/UPSTREAM.md` 在 688c369 加过 9 行）。Task 2 用 `--engine-commit a4942966b`；不要取 UPSTREAM 的 `Base commit`（它是 vendored 基线，且构建器只认 `Commit` 行，取不到会直接失败）。

## Task 1 — pack 注入与构建期冒烟

> 动到的文件：新增 `scripts/runtime-extra-requirements.txt`、`scripts/build-runtime-pack.mjs`。

- [x] 新增 `scripts/runtime-extra-requirements.txt`：只放 `python-calamine==0.8.2`，注明“不在 engine lock、由运行时 pack 额外安装”；一行一个 pin，便于审核。
- [x] 修改 `scripts/build-runtime-pack.mjs`：读取额外 requirements，追加到导出的 `kept` 行之后；拒绝重复包名；把额外行纳入 `uv pip sync`；失败时打印缺失文件/坏行并以非零退出。
- [x] 构建期冒烟：sync 完成后用 pack 的 `python/python.exe` 执行 `import python_calamine` 与一个临时 `.xlsx` 的 `CalamineWorkbook.from_path`；失败即构建失败，不产出 zip。
- [x] notices/元数据：确认 `python_calamine-0.8.2.dist-info` 随 site-packages 入包，`THIRD_PARTY_NOTICES.md` 的通用 wheel 说明仍覆盖它；如构建脚本有显式清单，补 calamine。
- [x] 轻量验证：`node --check scripts/build-runtime-pack.mjs`；临时 target 安装 + import；不跑完整 330 MB 构建（留 Task 2）。

**实测（2026-10-26）**：

- **额外 pin 文件**：`scripts/runtime-extra-requirements.txt` 仅 3 行注释 + `python-calamine==0.8.2`；解析器只接受 `name==version`（可带 marker），缺文件/坏行/自重复均在 `readExtraRequirements`（`build-runtime-pack.mjs:166-192`）exit 1。
- **注入**：`scripts/build-runtime-pack.mjs:302-308` 在 `kept.length < 300` 守卫后合并额外行；`:305` 拒绝已在 lock 导出中的同名包；合并后的文件交给 `:311` 的 `uv pip sync`。`--print-inputs` 会打印额外 pin（`:236-237`）。
- **构建期冒烟**：`:314-378` 在 sync 后用 pack 的 `python.exe` 生成最小 `.xlsx`（stdlib `zipfile`，不依赖 openpyxl），断言 `python_calamine.__file__` 位于 pack `site-packages` 且读回 `[['name','value'],['alpha',1.0]]`；失败即 `fail`，不会进入引擎复制与 zip。
- **失败路径**：缺文件/坏行/自重复/与 lock 重名（临时加 `aiohttp`）均 exit 1，最后一项在 export 后、`uv pip sync` 前被拒（证据 `D:\hrag-r1-probe\task1\{missing,badline,duplicate,lock-duplicate}.log`）；正常 `--print-inputs` exit 0 并打印 `python-calamine==0.8.2`。
- **轻量安装**：`D:\hrag-r1-probe\task1\calamine-only` 只装 `python-calamine==0.8.2`（含 dist-info），用脚本同款冒烟通过，`__file__` 指向该 target。
- **notices/元数据**：构建器无显式 wheel 清单；`notices()` 的“Python wheels (site-packages)”通用段（`:543`）覆盖 `python_calamine-0.8.2.dist-info/`（含 `licenses`、`sboms`），未改 notices。
- **未跑完整构建**；`node --check scripts/build-runtime-pack.mjs` 通过；`engine/` 仍零 diff。

## Task 2 — 真包构建与 Excel 端到端验收

> 动到的文件：无（构建产物在仓外 `D:\hrag-r1`；如临时夹具脚本放仓外）。

- [x] 构建完整 `0.1.0-3` 包：`node scripts/build-runtime-pack.mjs --engine ./engine --out D:\hrag-r1 --runtime-version 0.1.0-3 --engine-commit a4942966b`（R1 不改引擎；`engine/backend` 自该提交零 diff，沿用当前 `runtime.json.engineCommit`）；**不要带 `--update-manifest`**；记录 zip 大小、解压大小、sha256；核对 `runtime-manifest.json` 与 `site-packages/python_calamine-0.8.2.dist-info` 均在包内。
- [x] 本地包匹配：复制插件包到 `D:\hrag-r1\plugin-test`，只改副本 `runtime.json` 的 `packs.win32-x64.runtimeVersion` 为 `0.1.0-3`，并把 `size`/`unpackedSize`/`sha256` 填成刚构建 zip 的真实值（`urls: []` 可留空；`allowUnpublished` 仍拒绝 `size=0`/`unpackedSize=0`，`sha256` 需 64 位 hex）；确认 `loadPack` 目标版本与 zip manifest 一致。**不改仓库 `runtime.json`**。
- [x] 隔离运行：从 `plugin-test` 用隔离 `DSH_HOME` 启动，或直接把包解到临时运行根起 Qdrant 与 knowledge 服务；不碰桌面托管栈。
- [x] 开启表格门控：临时 `config.yaml` 设 `rag.table.enabled: true`；通过 API 建库、上传/解析一个真实 `.xlsx`，轮询到 `ready`，验证切片/表格内容可读；`.tsv` 与 `.csv` 做回归。`.xls` 若有夹具再验；没有则记录“同一 calamine 路径、未独立覆盖”。
- [x] 门控关闭对照：`rag.table.enabled: false` 时 `.xlsx` 仍在 allowlist 外，确认原有拒绝行为未被改宽。
- [x] 版本与身份：确认引擎实际 import 的是 pack 内的 `python_calamine`（不是宿主/系统环境）；日志无密钥；证据写 `D:\hrag-r1\...`（README、日志、请求/响应摘要、包内 dist-info 清单）。

**实测（2026-10-26）**：

- **构建**：命令 exit 0；zip `D:\hrag-r1\harness-rag-runtime-win32-x64-0.1.0-3.zip`，331,053,658 B，sha256 `90421f0f071bc2772cfe645af9eb48ecf1b33c5c61cba3139c360f6d93aca745`，20,086 entries，解压文件总字节 882,903,724；日志 `D:\hrag-r1\build-0.1.0-3.log`。未带 `--update-manifest`；仓库 `runtime.json` 仍为 `0.1.0-2`。
- **包内核对**：`runtime-manifest.json` 为 `0.1.0-3`/`a4942966b`/`configVersion 44`；`site-packages/python_calamine-0.8.2.dist-info/`、`python/python.exe`、`qdrant/qdrant.exe` 均在 zip；构建期冒烟打印包内 `python_calamine.__file__`。
- **本地包匹配**：`D:\hrag-r1\plugin-test\runtime.json` 目标 `0.1.0-3`、`urls: []`、真实 size/unpacked/sha；`loadPack({allowUnpublished:true})` ok 且版本与 zip manifest 一致；`allowUnpublished:false` → `pack_missing`。仓库 `runtime.json` 未改（`git diff` 空）。
- **隔离运行**：解压 zip 到 `D:\hrag-r1\run\pack-0.1.0-3`；Qdrant 6433/6434；knowledge 服务 8021；fake OpenAI-compatible 提供方 9101 仅用于让摄入到 `ready`（不属于 pack）。
- **门控开启**：`rag.table.enabled: true`；`/supported-formats` 含 `.csv/.tsv/.xls/.xlsx`；`fixture.xlsx`/`.tsv`/`.csv` 均 `ready`、1 chunk、vector/graph done；三份切片正文均为 `| name | qty | note | ... alpha ... beta ...`。`.xls` 无夹具，记录“同一 calamine 路径、未独立覆盖”。
- **门控关闭**：重启后 `/supported-formats` 不含 `.tsv/.xls/.xlsx`，`.csv` 保留；`.xlsx` 与 `.tsv` 上传均 400（`unsupported file type`）。
- **身份/安全**：服务进程 exe 为包内 `python.exe`；同 PYTHONPATH 下 `python_calamine.__file__` 指向包内 `site-packages`；日志中 token 与三个 fake key 出现次数均为 0，无 traceback/ImportError。
- **证据**：`D:\hrag-r1\evidence\zip\README.md` 及同目录 JSON/日志/哈希；本 plan/spec 的 Task 2 状态已回填。

## Task 3 — 版本、文档与发布（候令）

> 动到的文件：`runtime.json`、`package.json`、`README.md`、`docs/plugin-manual.md`、`market/index.json`（若启用索引）、本对 spec/plan（回填）。

- [ ] 版本策略（默认）：新插件/runtime release `v0.1.1`，运行时 `0.1.0-3`；`package.json` 升 `0.1.1`，README/手册安装示例改钉 `v0.1.1`；`runtime.json.engineCommit` 保持 `a4942966b`（引擎未改）；`market/index.json` 若上线则同步。若改走“现有 `v0.1.0` 追加资产＋新插件 tag”，先停下确认——两条路的 URL/清单不同，不混用。
- [ ] 发布顺序（默认 `v0.1.1`）：构建包 → 改 `runtime.json`（`runtimeVersion=0.1.0-3`、`engineCommit=a4942966b`、`urls` 指 `v0.1.1` 资产、`size/unpackedSize/sha256`）、`package.json`、README/手册 → 提交 → 建 **draft** `v0.1.1` Release 并上传资产 → 发布（tag 随发布可见）→ 用 `git+https#v0.1.1` 复验安装。**不要先推 tag 再补资产**；**不要用 `--update-manifest` 代替手改 `urls`**（它保留旧 `urls`）。不覆盖 `v0.1.0` 既有资产。
- [ ] 文档：README 表格条/手册写“托管运行时已带 `python-calamine`；`rag.table.enabled` 仍默认关，只能改 `config.yaml` 开启”；**外部模式不在本 plan**，`make gateway` 环境仍需自行安装，文档分开写，不能把托管结论套到外部模式。
- [ ] 已装用户：新 pack 只在新插件版本的 `runtime.json` 里可见；用户先升级插件到 `v0.1.1`，再由既有运行时升级链下载 `0.1.0-3`。不承诺仅换 pack 就自动升级。
- [ ] 若本轮不发布：停在 Task 2；`runtime.json`、`package.json`、README 保持 `0.1.0`/`v0.1.0`，在 plan 记录“已建包、未发布”，不把文档写成完成态。
- [ ] spec 回填：§9 R1 标“已实施/完成”，补证据路径；Status 行同步；R2–R5 仍待裁。
- [ ] 提交：按用户令分笔；建议一笔构建/脚本 + 一笔文档；提交前确认 `engine/` 零 diff、无 zip/解压物入库。

**实测（实施期回填）**：

## Task 4 — 收口

> 动到的文件：无（门禁与证据）。

- [ ] 门禁：`node --check client.js`、`node --check scripts/build-runtime-pack.mjs`、`tsc -p tsconfig.json`、`node --test tests/*.test.ts`；`engine/` 相对基线零 diff；主树 `deer-flow` 零 diff。
- [ ] 证据目录 `D:\hrag-r1`：构建日志、包清单、dist-info、`.xlsx` 解析结果、`.tsv/.csv` 回归、门控关闭对照。
- [ ] 未发布时在 spec/plan 明确“pack 已建、runtime.json 未动、发布候令”，避免把未上传资产写成完成态。
- [ ] 收口后向用户报告：包版本、体积/哈希、Excel 实测结果、是否已发布、剩余 R2–R5。

**实测（实施期回填）**：

## 验收对应

| spec §9 R1 | 覆盖 Task | 证据 |
| --- | --- | --- |
| `python-calamine` 随运行时可 import | Task 1 / Task 2 | 构建期冒烟 + 包内 dist-info |
| 开启表格门控后 `.xlsx` 可解析（`.xls` 有夹具才验） | Task 2 | 隔离运行时上传到 ready |
| 门控关闭时行为不变 | Task 2 | `.xlsx` 被 allowlist 拒绝 |
| `engine/` 零 diff | Task 0 / Task 4 | `git diff -- engine` 为空 |
| 发布件与清单一致 | Task 3 | Release 资产 + `runtime.json` 回填 |
| 不覆盖 `v0.1.0` | Task 3 | 新 runtimeVersion / 新 tag |

## 风险与回退

- **额外 wheel 不在锁**：靠 `scripts/runtime-extra-requirements.txt` 的固定 pin 与最终 zip sha256 保证可复现；不在锁内是已知取舍。
- **`uv pip sync` 不接受额外行**：改用同 target 的第二段 `uv pip install --no-deps python-calamine==0.8.2`；仍失败则停下报告，不在本 plan 内改 engine。
- **ABI/平台不符**：Task 0 先在 Python 3.12.13 win64 验 import 与读 xlsx；失败即停。
- **本地包版本不匹配/清单被拒**：Task 2 用临时插件副本把 `runtime.json` 目标版本改为 `0.1.0-3`，并填真实非零 `size`/`unpackedSize` 与 64 位 hex `sha256`；不改仓库清单，避免 `manifest_mismatch`/`pack_missing`。
- **engineCommit 写错**：R1 不改引擎，Task 2/3 沿用 `a4942966b`；不要取 UPSTREAM 的 `Base commit`（它是 vendored 基线，且构建器只认 `Commit` 行，取不到会失败）。
- **发布顺序错/tag 与资产不一致**：默认新 `v0.1.1` Release；draft → 上传资产 → 发布；`--update-manifest` 不替代 `urls` 手改；不覆盖 `v0.1.0`。
- **已装用户/外部模式**：已装用户先升级插件到新 tag，运行时升级链才会看到新 pack；外部模式 `make gateway` 仍需自行安装 calamine，文档分开写。
- **门控仍默认关**：本 plan 不加面板开关；文档写明开启方式。若要把表格功能暴露到面板，另立小项，不混入 R1。
- **体积/空间**：包增约 1.6 MB 解包；`size`/`unpackedSize` 重算，面板体积说明随之更新。
- **`.xls` 夹具缺失**：`.xlsx` 已覆盖同一 calamine 路径；若没有可用 `.xls` 夹具，记录覆盖边界，不伪造结果。
