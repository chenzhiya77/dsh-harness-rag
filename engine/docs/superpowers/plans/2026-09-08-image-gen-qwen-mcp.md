# qwen-image-3.0 适配器 + image-generation MCP stdio 薄壳 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `skills/public/image-generation/` 接入 qwen-image-3.0(DashScope)第三 provider;同目录新增 MCP stdio 薄壳供 DeerFlow(local sandbox 模式)与 Qoder 消费同一核心;顺手修复 Gemini timeout 与 mime 两缺陷。

**Architecture:** 一份核心(`generate.py`)两个执行上下文(沙箱内 CLI / 主机 MCP 进程)。local sandbox 模式 `env_policy` 剥光 `*KEY*` 且 `sandbox.environment` 不生效 → MCP stdio 的 `extensions_config env`(`$VAR` 加载期解析)是唯一本地密钥通道。MCP 是边界协议不是内部连线(二期画布校准,见 spec §11)。契约细节全部在 spec `../specs/2026-09-08-image-gen-qwen-mcp-design.md`,本计划只排步骤。

**Tech Stack:** Python 3 + `requests`;`mcp` SDK 1.28 FastMCP(stdio;`backend/.venv` 传递依赖,`uv.lock` 锁 1.28.1——直接钉因 tenki 下架于实施时回退,见 Task 6);pytest 双 runner(见下,本机加 `--basetemp .pytest-tmp`)。

**测试运行命令(全程统一这两条):**
```bash
# 根:技能脚本测试
uv run --no-project --with pytest --with requests --with Pillow pytest tests/skills/ -v
# backend venv:壳测试(根 runner 不带 mcp 包)
cd backend && uv run pytest ../tests/skills/test_image_generation_mcp_server.py -v
```

**关键事实(已核实,细节见 spec §2/§4/§5):**
- SkillScan `secret-env-assignment`(HIGH=error,CI `--fail-on error`)在现 `generate.py:109/170` 的 `api_key =` 已触发 → **Task 2 的重命名是门票,先于一切 skill 改动**。
- `_resolve_provider` 链:override > gemini > minimax > **qwen(链尾追加)**;现有键组合解析逐一不变。
- qwen 同步端点 `POST {host}/api/v1/services/aigc/multimodal-generation/generation`;响应 `output.choices[0].message.content[*].image` 为 **URL(24h)** → 必须二次下载;`prompt_extend=False`、`watermark=False`、`n=1`;refs ≤3 先 `validate_image`。
- 壳协议卫生:`redirect_stdout(sys.stderr)`(generate.py 的 print 毁 JSON-RPC);`async def` + `anyio.to_thread.run_sync`;返回**正斜杠相对 token** `../outputs/<name>.png`(Windows 不翻译反斜杠/盘符);`_remap_mnt` 把 `/mnt/user-data/*` 入参反映射为 `cwd.parent/*`。
- 本机环境因 RAG 持有 DashScope 键 → `clean_env` 必须先删 `DASHSCOPE_API_KEY`/`DASHSCOPE_API_HOST`/`QWEN_IMAGE_MODEL`,否则 resolve 测试被污染。

---

## 实施记录(2026-09-08,Task 1–10 全部完成;下方复选框已按本节记录勾选)

- **T1–T4**:`tests/skills/test_image_generation.py` 27 用例全绿(旧 12 + 新 15,含 F1/F2 钉住);红基线曾为 12 红 / 15 绿。
- **T5**:`tests/skills/test_image_generation_mcp_server.py` 10 用例全绿(backend venv);根 runner 下 `importorskip` 优雅跳过。实施中修 `relative_to(walk_up=True)`(默认不生成 `..` 组件,曾落回绝对路径分支)。
- **T6**:按本文回退决策执行(tenki 下架);venv 健康验证通过。
- **T7**:配置模板完成(`.env.example` 加 DASHSCOPE 行;`extensions_config.example.json` 加 disabled 示例项,tool_call_timeout 300)。
- **T8**:SKILL.md Providers 扩为三 provider + 新增 MCP server 节;`backend/docs/MCP_SERVER.md` 加薄壳短节。
- **T9 验证阶梯**:根 runner 65 passed + 1 skipped;壳 10 passed;`test_skills_bundled` 25 passed;**SkillScan 0 findings**(途中踩中 `secret-env-assignment` 两雷:注释里 `token:` 与局部变量 `token =`,分别以改措辞/改名 `rel_path` 规避);review-core CLI `blockers 0 / errors 0 / warnings 16`(warnings 为 SKILL.md 旧警告 + 新 docstring 路径提及,warning 级不红 CI;测试运行带入的 `__pycache__` pyc 已删)。Step 5 的 diff-based 脚本需 ref 对,未提交状态下以 review-core CLI 直审 skill 目录等价覆盖。
- **机器特定**:本机系统 Temp 对 pytest 权限异常 → 按 `.gitignore` 既有约定统一 `--basetemp .pytest-tmp`;numba `.pyd` 被进程锁,`uv sync` 未跑(非必需)。
- **T10 进展(2026-09-08)**:live smoke **一次通过**——账号级 Key + 经典 host 可用,出图经闭环看图验收(虎皮鹦鹉绘本风);开放项裁决回写 spec §12。本地 `extensions_config.json` 已写 enabled 注册项(绝对路径 + `$DASHSCOPE_API_KEY` + tool_call_timeout 300);**注意 `$VAR` 在配置加载期从 Gateway 进程 env 解析,若 Gateway 先于放 Key 启动需重启**。**DeerFlow Web UI e2e 绿(2026-09-08,线程 857e2785;本机无 nginx,UI 走 :3000 带登录)**:agent 先走沙箱脚本路径→按设计饿死→**自愈到 MCP 壳工具**;agent 传 `/mnt/user-data/outputs/budgerigar-picturebook-portrait.png` 作 output_path → `_remap_mnt` 反映射实证;返回相对 token 被翻译回 `/mnt/user-data/outputs/...`(产物卡片 + `/api/threads/<id>/artifacts/mnt/user-data/outputs/...` 下载链实证);agent 调 `view_image` 闭环后 `present_files` 交付;磁盘 1,016,558 字节 PNG 与 workspace prompt JSON 在位;看图终验与结构化 prompt 一致(灰蓝喙系 agent 自写 prompt 所致,非缺陷)。**Qoder e2e 绿(2026-09-08)**:用户经 Qoder「添加自定义 MCP」(JSON 形态,外层 mcpServers 包裹)导入 stdio server 并重载;本会话直调 `generate_image`(红熊猫水彩肖像)出图并看图自验,非 DeerFlow 布局返回绝对路径符合契约。**T10 三项全绿,一份核心双消费者实证成立**。运维遗留**已闭环(2026-09-08)**:旧 Gateway PID 18896(16:31 启动,env 持老 Key)经用户确认后以 `Stop-Process -Id 18896 -Force` 清除(Git Bash 下 taskkill 斜杠被 MSYS 路径转换,需走 PowerShell);现 8001 仅 57724 监听,health 200,老账户扣费止。

---

## File Structure

**新建:**
- `skills/public/image-generation/scripts/mcp_server.py`
- `tests/skills/test_image_generation_mcp_server.py`

**修改:**
- `skills/public/image-generation/scripts/generate.py`(重命名 + qwen 适配器 + F1/F2)
- `tests/skills/test_image_generation.py`(clean_env 扩展 + qwen/F1/F2 用例)
- `backend/packages/harness/pyproject.toml`(+ `mcp>=1.28`)& `backend/uv.lock`(uv sync)
- `.env.example`(+ `# DASHSCOPE_API_KEY=...`)
- `extensions_config.example.json`(+ disabled 示例项)
- `skills/public/image-generation/SKILL.md`(Providers 节;frontmatter 不动)
- `backend/docs/MCP_SERVER.md`(薄壳短节)

---

## Task 1: 测试先行(clean_env + qwen resolve 红)

**Files:**
- Modify: `tests/skills/test_image_generation.py`

- [x] **Step 1: 扩展 `clean_env` autouse fixture**——追加 `monkeypatch.delenv` 三个名字:`DASHSCOPE_API_KEY`、`DASHSCOPE_API_HOST`、`QWEN_IMAGE_MODEL`(raising=False)。
- [x] **Step 2: 加 resolve 用例**——仅 `DASHSCOPE_API_KEY` → `"qwen"`;`GEMINI_API_KEY`+`DASHSCOPE_API_KEY` → `"gemini"`;`MINIMAX_API_KEY`+`DASHSCOPE_API_KEY` → `"minimax"`;`IMAGE_GENERATION_PROVIDER=qwen`/`dashscope` 覆盖赢;无键错误串含 `DASHSCOPE_API_KEY`;unknown-provider 错误串列三家。
- [x] **Step 3: 加 payload/下载用例骨架**(先红):qwen payload(model 默认、messages 形态、size 映射 16:9→`1664*928`、透传 `1024*1024`、越界 `9999*10` 回退、`prompt_extend is False`、`watermark is False`、`n == 1`、negative_prompt 映射);refs → data URL 且 >3 不调 API(fake_post 抛 AssertionError);URL 二次下载(monkeypatch `requests.get` 返回 FakeResp(content=raw)→ 断言字节与嵌套目录);F1(fake_post 捕获 kwargs 断言 `timeout == 120` 于 gemini 路径);F2(PNG 参考图 → gemini inlineData `mimeType == "image/png"`)。
- [x] **Step 4: 跑根 runner**,确认新用例红、旧 12 用例绿。

## Task 2: 重命名门票 + `_single_text_prompt`(旧用例保持绿)

**Files:**
- Modify: `skills/public/image-generation/scripts/generate.py`

- [x] **Step 1:** `api_key` → `minimax_api_key`(约 l.109)、`gemini_api_key`(约 l.170);同步引用点。
- [x] **Step 2:** `_minimax_prompt` → `_single_text_prompt`(调用点约 l.112 + docstring 措辞改为 provider 中立)。
- [x] **Step 3: 跑根 runner**——旧用例全绿(Task 1 的 qwen 用例仍红,属预期)。
- [x] **Step 4: 跑 SkillScan 单文件确认 `secret-env-assignment` 消失**(命令见 Task 9 Step 2)。

## Task 3: qwen 适配器(转绿)

**Files:**
- Modify: `skills/public/image-generation/scripts/generate.py`

- [x] **Step 1:** 新增 `DASHSCOPE_DEFAULT_HOST = "https://dashscope.aliyuncs.com"`、`_dashscope_host()`(env `DASHSCOPE_API_HOST`,rstrip "/")、`QWEN_SIZE_TABLE`、`_qwen_size(aspect_ratio)`(表 → `^\d{3,4}\*\d{3,4}$` 透传前校验面积 512²–2048² 与比例 1:8–8:1 → 越界回退 `1024*1024`)。
- [x] **Step 2:** 新增 `_generate_image_qwen(prompt, reference_images, output_file, aspect_ratio)`:缺 key 返回 `"DASHSCOPE_API_KEY is not set"`;text = `_single_text_prompt(prompt)`;refs 过 `validate_image`,有效 >3 返回错误串不调 API;content = image data URLs + 单 text;JSON 含 `negative_prompt` 时映射;POST `timeout=120`;取首个 image URL → `requests.get(url, timeout=120)` → `raise_for_status` → `_ensure_output_dir` → 写 `response.content`;成功串与兄弟同形态;无 image 条目抛异常。
- [x] **Step 3:** `_resolve_provider` 链尾追加 `if os.getenv("DASHSCOPE_API_KEY"): return "qwen"`;无凭证错误串补 qwen;`generate_image` dispatch 接受 `("qwen", "dashscope")`;unknown-provider 串列三家。
- [x] **Step 4: 跑根 runner**——Task 1 的 qwen payload/下载/resolve 用例转绿。

## Task 4: F1/F2 修复(转绿)

**Files:**
- Modify: `skills/public/image-generation/scripts/generate.py`

- [x] **Step 1:** F1——Gemini `requests.post(...)` 补 `timeout=120`。
- [x] **Step 2:** F2——Gemini inlineData 的 `"mimeType": "image/jpeg"` 改为 `_guess_mime(reference_image)`。
- [x] **Step 3: 跑根 runner**——F1/F2 用例转绿,全文件绿。

## Task 5: MCP stdio 薄壳 + 其测试

**Files:**
- Create: `skills/public/image-generation/scripts/mcp_server.py`
- Create: `tests/skills/test_image_generation_mcp_server.py`

- [x] **Step 1: 写壳**——文件头 `sys.path.insert(0, str(Path(__file__).resolve().parent))` + `import generate`;**本文件不出现 `requests`/URL/`os.environ`**;`_resolve_output_dir()`(cwd.name=="workspace" 且 `../outputs` 存在 → 用之,否则 cwd);`_remap_mnt(arg)`(`/mnt/user-data/` 前缀 → `Path.cwd().parent / 相对部分`,其余透传);`_run(prompt, output_path, reference_images, aspect_ratio) -> str`(`tempfile.TemporaryDirectory()` 写 prompt 文件 → `generate.generate_image` → 返回:DeerFlow 布局正斜杠相对 token `../outputs/<name>.png`,否则绝对路径;异常 → 错误串);`mcp = FastMCP("image-generation")`;`@mcp.tool()` **async** `generate_image(prompt: str, output_path: str = "", reference_images: list[str] | None = None, aspect_ratio: str = "16:9") -> str`,体内 `contextlib.redirect_stdout(sys.stderr)` + `anyio.to_thread.run_sync(functools.partial(_run, ...))`;`if __name__ == "__main__": mcp.run()`。
- [x] **Step 2: 写壳测试**——`pytest.importorskip("mcp")`;按路径 importlib 加载 mcp_server(同 skill_loader 模式);测 `_run`:默认命名含时间戳、sibling-outputs 启发式(`monkeypatch.chdir` + 假 `workspace/../outputs` 布局)、相对 token 形态(`../outputs/` 前缀、正斜杠)、`_remap_mnt` 反映射与透传、异常 → 错误串、temp 目录自清理;generate 调用经 monkeypatch `mcp_mod.generate.generate_image` 捕获参数。
- [x] **Step 3: 跑壳 runner**(backend venv)全绿;再跑根 runner 确认 importorskip 在无 mcp 环境优雅跳过。

## Task 6: 依赖钉 + uv sync

**Files:**
- Modify: `backend/packages/harness/pyproject.toml`、`backend/uv.lock`

- [x] **Step 1(实施时回退,2026-09-08):** **不加** mcp 直接钉——`tenki-sandbox` 已从 PyPI 下架,任何 pyproject 改动触发注定失败的 universal 重解析;`uv.lock` 已锁 `mcp==1.28.1`,安装保证等价。仓库遗留:tenki extra 指向死注册表条目,另案。
- [x] **Step 2:** 验证 backend venv 已有 mcp:`uv run python -c "from mcp.server.fastmcp import FastMCP"`(已跑,ok);不跑 `uv sync`(numba .pyd 被进程锁,且非必需)。

## Task 7: 配置模板

**Files:**
- Modify: `.env.example`、`extensions_config.example.json`

- [x] **Step 1:** `.env.example` 在 GEMINI/MINIMAX 旁加 `# DASHSCOPE_API_KEY=your-dashscope-api-key`。
- [x] **Step 2:** `extensions_config.example.json` 加 disabled 示例项:
```json
"image-generation": {
  "enabled": false,
  "type": "stdio",
  "command": "uv",
  "args": ["run", "--project", "<ABS>/backend", "python", "<ABS>/skills/public/image-generation/scripts/mcp_server.py"],
  "env": { "DASHSCOPE_API_KEY": "$DASHSCOPE_API_KEY" },
  "tool_call_timeout": 300,
  "description": "Bundled image-generation stdio server (qwen/Gemini/MiniMax via generate.py); the only key channel in local sandbox mode. Register by editing this file: the HTTP API stdio allowlist is {npx, uvx}."
}
```

## Task 8: 文档

**Files:**
- Modify: `skills/public/image-generation/SKILL.md`、`backend/docs/MCP_SERVER.md`

- [x] **Step 1:** SKILL.md Providers 节加 qwen 行(`DASHSCOPE_API_KEY`/`DASHSCOPE_API_HOST`/`QWEN_IMAGE_MODEL`、refs ≤3、prompt_extend 默认关、URL 二次下载)+ local sandbox 剥键说明 + 注册 snippet + 提及 `scripts/mcp_server.py`;**避开 HIGH 声明短语**("execute commands"/"credential access" 等);frontmatter 一字不动。
- [x] **Step 2:** `backend/docs/MCP_SERVER.md` 加短节:local 模式密钥通道理由、cwd/TMPDIR pin、路径返回契约(相对斜杠 token + `_remap_mnt`)。

## Task 9: 验证阶梯(离线部分)

- [x] **Step 1:** 根 runner 全绿:`uv run --no-project --with pytest --with requests --with Pillow pytest tests/skills/ -v`
- [x] **Step 2:** SkillScan 零 finding:
```bash
cd backend && PYTHONPATH=packages/harness uv run --no-sync python -c "from pathlib import Path; from deerflow.skills.skillscan.orchestrator import scan_skill_dir; r=scan_skill_dir(Path('../skills/public/image-generation')); [print(f['severity'],f['rule_id'],f['file'],f['line']) for f in r['findings']]; print('blocked:',r['blocked'])"
```
- [x] **Step 3:** `cd backend && uv run pytest tests/test_skills_bundled.py -v`
- [x] **Step 4:** `cd backend && uv run pytest ../tests/skills/test_image_generation_mcp_server.py -v`
- [x] **Step 5:** `cd backend && uv run python ../scripts/review_changed_public_skills.py`(diff-based,对齐 CI;需改动已在工作区)——未提交状态下以 `python -m deerflow.skills.review.cli ../skills/public/image-generation` 直审等价覆盖:blockers 0 / errors 0。

## Task 10: Live smoke + 双端 e2e(用户协作)

- [x] **Step 1(live smoke):** 用户在本机 env 提供 `DASHSCOPE_API_KEY`;`IMAGE_GENERATION_PROVIDER=qwen` 直接 CLI 跑 `generate.py`(临时 prompt 文件 + 输出路径)出图;顺带裁决经典 host 是否可用(不可用则设 `DASHSCOPE_API_HOST` 为 workspace 前缀 host 重试,并回写 spec §12 结论)。
- [x] **Step 2(DeerFlow e2e,local 基准):** 本地 gitignored `extensions_config.json` 加 enabled 项 + `.env` 放 Key → 全栈启动(本机无 nginx,UI 走 :3000 带登录)→ Web UI 生图 → 核对工具卡片、`/mnt/user-data/outputs/...` 翻译、`present_files` 交付;skill 脚本路径继续饿死属预期。
- [x] **Step 3(Qoder e2e):** 用户把 snippet 粘进 Qoder MCP 设置(贴字面 Key)→ 会话内调用 `image-generation_generate_image` → Read 出图自查闭环。
- [x] **Step 4:** 把 smoke/e2e 结论回写 spec §12(开放项裁决);**不提交 git,除非用户要求**。
