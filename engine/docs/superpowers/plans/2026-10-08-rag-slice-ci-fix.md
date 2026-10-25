# 切片树 CI 合规修复（提交前四门清零） —— 实施计划

## 范围与交接

一对一件事＝把切片树已提交内容修到**提交前四门**全绿（后端 ruff 2 文件／前端 prettier 69 文件／AGENTS 链 3 条超限）＋记录对账（切片 plan 勘误＋追记；`rag-doc-tools` plan Task 8 加四门行）＋**第四修＝无云工作流修复（GitHub 侧一行；spec §2.4）**＋**主树 1 件 format 债伴修（复审并入；spec §2.1）**。成对 spec 同名（`../specs/2026-10-08-rag-slice-ci-fix-design.md`）；决策点 D1–D3 见 spec §3（**已裁全甲**：D1 指针＋模块 guide〔新件 `knowledge-extension/AGENTS.md`〕／D2 主树登记不修／D3 勘误式补注）。**执行面**＝切片树（`E:\app\python\agent\deer-flow-slice`，分支 `slice/knowledge-local-vector-retrieval`，起点 HEAD `5cc0197b4`）＋主树（记录面＋1 件格式债）。**不碰**：代码语义/接口/用例行为、上游文件内容、主树前端 prettier／CRLF 面（D2 登记）、推送与 PR。**状态（2026-10-08）：已完工**——切片四修合笔 `b9989c8c2`＋主树伴修 `f048b3344`＋主树记录批 → 回填 `f048b3344`（本提交）；**推送与 PR 更新＝待令**。

## 硬约束（执行期注意）／Global Constraints

- **四门命令与口径**（spec §2.5）：① `cd backend && make lint`（＝`uv run ruff check .`＋`uv run ruff format --check .`）② 仓库根 `PYTHONIOENCODING=utf-8 python scripts/check_agent_guidance.py --base-ref e325c90b2 --head-ref HEAD`（只看 `errors=` 归零；warnings 只记录）③ `cd frontend && pnpm format`（＝`prettier --check .`）④ 后端定向 pytest（`RUN = PYTHONPATH=. PYTHONIOENCODING=utf-8 PYTHONUTF8=1 uv run --no-sync`；basetemp 用仓外隔离目录、跑完删）；前端全量单测＝后台跑。
- **prettier 只动清单**：对 `--list-different` 清单内 69 件执行 `--write`；禁裸 `prettier --write .`；写完即 `--check` 复零。
- **AGENTS 净增预算 ≤177B**（硬账）：改后必须 guidance 复跑 errors=0；不得顺手扩节。**guidance 复核顺序**：改后先跑工作区模式（不带 `--base-ref/--head-ref`、读工作区），提交③ 后再以 `--base-ref e325c90b2 --head-ref HEAD` 复核（`--head-ref` 读 git ref、不读工作区，提交前跑会读到旧 HEAD）。
- **提交拆分**（切片树四笔，全英文 conventional）：① 后端 ruff ② 前端 prettier ③ AGENTS 链 ④ 无云工作流；主树＝伴修一件一笔＋记录批一笔；发现清单外其它红（如 `pnpm build`）→ 停手上报、不擅自扩面。
- 只 stage 本线文件；推送与 PR 更新**待令**。

## Task 0 — 基线复核（红清单落盘）

> 动到的文件：零（只读核实＋清单落仓外临时件）

- [x] 重跑四门抓红基线：`make lint`（预期 2 错/2 件）／guidance（预期 3 errors；记三链字节 99159/99505/98473）／`pnpm format`（69 件清单落仓外临时文件）／`uv lock --check`（预期 exit 0）。
- [x] 底账复核：`git show e325c90b2:backend/AGENTS.md | wc -c`（28751）vs `git show HEAD:backend/AGENTS.md | wc -c`（30129）⇒ 净增 1378 实证；确认三链 base 余量（523/177/1209）与 ≤177B 预算成立。
- [x] 钉死切片 HEAD（引修复前的 `5cc0197b4`；若已漂移，先报告再继续）。
- [x] （备忘）GitHub 侧现况取证：fork run `37675627281`（10-07 push、0 jobs／failure、行 48:23）＝Task 4 修复对象；本机无 actionlint/go ⇒ 该修复的自证留推送首跑。

**实测（2026-10-08）**：HEAD `5cc0197b4` 钉死（无漂移、工作区干净）；`make lint`＝`Found 2 errors`（均在 `make_samples.py`）＋`2 files would be reformatted, 1968 files already formatted`；guidance（ref 模式）＝**3 errors／11 warnings**（链 99159／99505／98473）；`uv lock --check` exit 0；prettier `--list-different`＝69 件（落 `/tmp/pret-fix.txt`；33 `tests/unit`＋18 `src/components`＋17 `src/core`＋1 `src/app`）；bytes `e325c90b2` 28751 → HEAD 30129（+1378 实证）。

## Task 1 — 后端 ruff 清零

> 动到的文件：`tests/fixtures/knowledge_acceptance/make_samples.py`＋`tests/test_gateway_services.py`（切片树）＋（伴修）主树 `backend/tests/test_nginx_knowledge_uploads.py`

- [x] 修：去引号注解（L62 UP037）＋删 `Pt`（L147 F401）＋对两件过 `ruff format`（`test_gateway_services.py` 预计即 122 行 hunk）。
- [x] 复绿：`uv run --no-sync ruff check .`（0 错）＋`uv run --no-sync ruff format --check .`（0 件待格式化）；knowledge 面定向 pytest 复跑。
- [x] **主树伴修（复审并入）**：主树 `backend` 下 `uv run ruff format tests/test_nginx_knowledge_uploads.py`；复验主树全树 `ruff format --check .`（1 件→0）＋`ruff check .` 保持全绿；单独一笔主树提交（例：`style(backend): collapse the wrapped upload-route assertion`）。
- [x] 提交①（例：`style(backend): clear the ruff findings on the ported knowledge tests`）＋哈希回填。
- [x] 实测回填（本 Task 下）。

**实测（2026-10-08）**：切片＝`make_samples.py` 三处（L62 UP037 去引号／L147 删未用 `Pt`／format 折叠，5+/12−）；`test_gateway_services.py` 复跑后 clean 过滤哈希＝`5d6a7a79…`＝HEAD blob ⇒ 工件层为工作区行尾混排、**提交面零改动**（该文件不入提交）。复绿＝`ruff check .` All checks passed＋`ruff format --check .` 1970 files already formatted；knowledge 定向 pytest＝**751 passed／2 skipped／1 failed**（唯一红 `test_embed_missing_api_key`＝已登记环境条件红、与 T7-F／T8 基线一致）。提交①＝**`b9989c8c2`**。主树伴修＝`test_nginx_knowledge_uploads.py` L91 单 hunk 折叠（1+/4−）；复验＝全树 `format --check` 1327 files already formatted＋`check .` All checks passed；该文件 6 passed；提交＝**`f048b3344`**。

## Task 2 — 前端 prettier 清零

> 动到的文件：Task 0 清单 69 件（切片树 frontend）

- [x] 按清单 `--write`（69 件全覆盖；写后重跑 `--list-different` 预期 0）。
- [x] 复绿：`pnpm format` 零 diff；`pnpm lint`／`typecheck` 零诊断；`pnpm test` 全量绿（后台跑；防 class 串字面断言）。
- [x] 提交②（例：`style(frontend): apply the repository prettier config to the ported knowledge surface`）＋哈希回填。
- [x] 实测回填。

**实测（2026-10-08）**：69 件 `--write` 后 `--list-different`＝0；改动面与清单逐件相符（外无清单文件）；`pnpm format`＝All matched files use Prettier code style!；`pnpm check`（eslint＋tsc）零诊断；`pnpm test`＝**304 文件／2895 用例全绿**（3m55s）；`pnpm build`＝10-08 审计复跑 exit 0（本批纯格式面未复跑）。提交②＝**`b9989c8c2`**（69 文件，+3389/−1643）。

## Task 3 — AGENTS 链压缩（D1=甲）

> 动到的文件：`backend/AGENTS.md`＋新件 `backend/packages/knowledge-extension/AGENTS.md`（切片树）

- [x] 新件接收原节开发面细则（包名与导入/dist 名、`plugins:` 记录、宿主接缝清单、routers 挂载、私有 MetaData＋`kb_alembic_version` 链、tests 落点）；核对新件自身链无违规（实测口径：root `AGENTS.md` 14527B＋backend 条链＋新件 ≈ 4.4 万字节级，远低于 81920 soft）。
- [x] `backend/AGENTS.md`：原「Local Knowledge Base (Knowledge Extension)」节替换为一行指针（≤~150B，含 guide 落点）；净增 ≤177B。
- [x] 复绿（工作区模式）：不带 `--base-ref/--head-ref` 跑 guidance（该模式读工作区）→ **errors=0**（三链回限内、migrations warning 消失）；记录 sandbox 链余量与 AG001 残余 warning（登记）。
- [x] 提交③（例：`docs(backend): keep the knowledge extension guide inside the AGENTS chain budget`）＋哈希回填。
- [x] 复核（正式口径）：`--base-ref e325c90b2 --head-ref HEAD` → errors=0（残留 warnings＝spec §1 清单、非 errors）。
- [x] 实测回填。

**实测（2026-10-08）**：新件 `backend/packages/knowledge-extension/AGENTS.md`＝1713B（LOCAL 区间、自身零 finding；链＝root 14527＋backend 28901＋新件 1713＝**45141B**＜81920 soft）；指针净增＝**150B**（≤177 硬预算；`backend/AGENTS.md`＝28901B≤28928 硬线）；三链回限内＝middlewares 97931／sandbox 98277（**余 27B**）／subagents 97245；migrations 80860＜81920（warning 消）。工作区模式＝40 件、**0 errors**／12 warnings；提交③＝**`b9989c8c2`**；ref 模式复核＝**0 errors／13 warnings**、exit 0（第 13 条＝`frontend/src/AGENTS.md` 链 88504，其链含 backend/AGENTS.md 故居相关集；全为软警）。**措辞校正**：原节「rag 资产经 `tools:` 入口 opt-in」与码不符——实为 `tool_groups: [rag]`（`knowledge_scope_admission.py` 谓词），新 guide 已按码改书并补 admission 一环。

## Task 4 — 无云工作流修复（GitHub 侧，一行）

> 动到的文件：`.github/workflows/rag-eval-nocloud.yml`（切片树）

- [x] 修：Row 48 job 级 `env` 的 `${{ runner.temp }}` → `${{ github.workspace }}/rag-eval-nocloud-home`（`jobs.<job_id>.env` 允许 `github`、不允许 `runner`；官方 contexts 表已核）。备选（不取）＝删该行、checkout 后以 `$GITHUB_ENV` 写入 `$RUNNER_TEMP` 路径。
- [x] 本地可做：YAML 解析通过＋全文复查无其它 job env 级 `runner` 上下文；本机无 actionlint/go，GitHub schema 校验不可本地代跑（勿以本地「通过」代替）。
- [x] 提交④（例：`fix(ci): make the no-cloud workflow valid on GitHub`）＋哈希回填。
- [x] 实测回填（含「推送后首跑＝最终自证（待令）」一句）。

**实测（2026-10-08）**：仅一行改（L48 `runner.temp`→`github.workspace`）；YAML 解析通过（PyYAML `safe_load`）；全文复查余 `runner.` 仅在 step 级（L121-122 `with.path`，合法）；本机无 actionlint/go——GitHub schema 校验不可本地代跑。提交④＝**`b9989c8c2`**。**推送后首跑＝最终自证（待令）**。

## Task 5 — 记录对账＋口径＋回填

> 动到的文件：主树 `../plans/2026-10-06-rag-first-phase-slice.md`（勘误＋追记＋提交链append）＋`../plans/2026-10-08-rag-doc-tools.md`（Task 8 加四门行）＋本对回填

- [x] 切片 plan L177（T7-F）勘误补注（点时点差：T7 当刻已红＝`test_gateway_services.py`、`make_samples.py` 系 T8-B 后入树）＋T8 实测节追记（三 job 复核三类红＋工作流无效、修复指向本对）＋提交链行附录修复哈希。
- [x] `rag-doc-tools` plan Task 8 加「提交前四门复核」行（口径引本 spec §2.5）。
- [x] 本对 spec/plan 状态回填（D1–D3 裁定、实测、哈希）。
- [x] 主树提交：伴修一笔（Task 1 的 `style(backend): …`）＋记录批一笔（例：`docs(rag): reconcile the slice CI findings and pin the four-gate rubric`）；可同发、独立提交。
- [ ] 推送与 PR 更新（含工作流修复的推送首跑复核）：**待令**（不擅自推送）。

**实测（2026-10-08）**：切片 plan L177 勘误补注＋T8 实测追记＋提交链行修复链 append 已落；`rag-doc-tools` plan Task 8「提交前四门复核」行已加；本 spec/plan 回填完成（D1–D3 裁定＋实测＋哈希）；主树伴修 `f048b3344`＋记录批 → 回填 `f048b3344`（本提交）；收尾四门联跑＝ruff 0 错／0 件、guidance（ref）**0 errors**、`pnpm format` 零 diff、tests/knowledge 751／2／1（已登记环境红）、`uv lock --check` exit 0、`pnpm check` 零诊断、`pnpm test` 304／2895 全绿。**推送与 PR 更新＝待令（未执行）**。
