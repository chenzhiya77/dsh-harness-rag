# 主体二知识服务 Bearer Token 鉴权 —— Spec

**Status:** ✅ 实施完成（2026-10-20 D1–D6 全甲；Task 1–4 全落，真栈矩阵与插件真跑过；全量零新增代码红；已提交：`8b3271a34`／`0269d6342`／`7c22be33f`＋链回填 `ee4b5d7d0`）。
**Date:** 2026-10-20
**配套 plan:** [2026-10-20-knowledge-service-token-auth.md](../plans/2026-10-20-knowledge-service-token-auth.md)
**Parent:** [2026-10-20-engine-dependency-slimming-design.md](2026-10-20-engine-dependency-slimming-design.md) §6「不在此对补 8020 token 鉴权（另案）」；[2026-10-20-knowledge-service-trim-design.md](2026-10-20-knowledge-service-trim-design.md) D5「鉴权栈整体保留，作为 8020 token 鉴权的落点」。

## 1. 范围与目标

给主体二最小知识服务（`app.gateway.knowledge_app:app`，8020）加一层静态 Bearer token 鉴权，替换当前「`DEER_FLOW_AUTH_DISABLED=1` 全绕过」的验收态。

三件事：

1. **收口入口**：除 `/health` 与文档页外，所有请求必须携带正确的 `Authorization: Bearer <token>`；缺失/错误一律 401。
2. **复用既有栈**：token 命中的调用方按单租户 `default` admin 处理（与 auth-off 同一身份），`require_admin_user`、owner 过滤、路由权限零改动。
3. **插件零代码改动**：插件已具备 `apiToken` 配置并在 JSON、上传/媒体中继四条出站路径发送 Bearer 头，服务端接上即可。

行为口径：知识库/检索/摄取/百科/图谱/评测逻辑零改动；API 形状零改动；插件仓代码零改动。

## 2. Task 0 侦察结论（只读，2026-10-20）

### 2.1 服务现状

| 事实 | 落点 |
| --- | --- |
| 最小入口只挂 `AuthMiddleware` + `CSRFMiddleware` | `backend/app/gateway/knowledge_app.py:155-156`；CSRF 后加 ⇒ 在**外层**先跑 |
| 公开路径含 `/health`、`/docs`、`/redoc`、`/openapi.json` | `backend/app/gateway/auth_middleware.py:32-39` |
| 现有认证分支：internal 头 → session cookie → auth-off 合成用户 → 401 | `backend/app/gateway/auth_middleware.py:88-146` |
| auth-off 合成用户＝`default`／`system_role=admin` | `backend/app/gateway/auth_disabled.py:48-58` |
| 路由取用户时只认白名单里的 `auth_source` | `backend/app/gateway/accessors.py:70-84` |
| 写操作走 `require_admin_user`（读 `request.state.user`） | `backend/app/gateway/accessors.py:121-134` |
| CSRF 只对 cookie 双提交生效；auth-off 时跳过 | `backend/app/gateway/csrf_middleware.py:36-56` |
| 最小入口没有登录/注册 router，也没有 `app.gateway.app` | 本仓 `routers/` 只有 knowledge_bases／rag_config／models |
| 本机 `.env` 现有 `DEER_FLOW_AUTH_DISABLED` 键 | 值不落盘；token 模式需置空/移除该键 |

结论：**token 是启用鉴权后唯一可用的非浏览器入口**。若只去掉 auth-off 而不加 token，所有非公开路由都会 401，服务不可用。

### 2.2 插件现状（已就绪）

| 事实 | 落点 |
| --- | --- |
| 配置模型已有 `apiToken`，默认空 | `dsh-harness-rag/src/settings.ts:3,17` |
| JSON 请求带 `Authorization: Bearer` | `src/http.ts:47-48` |
| 上传/媒体中继三处同样带 Bearer | `src/kb_proxy.ts:370-373,425-426,523-525` |
| README 已写明 `apiToken`（空＝不带鉴权头） | `dsh-harness-rag/README.md:40` |

⇒ 插件侧不需要改代码；只需要在插件配置里填上与引擎一致的 token。

### 2.3 关键缝

- **中间件顺序**：CSRF 在外、Auth 在内。带 Bearer 的 POST 会先撞 CSRF（无 csrf cookie → 403），必须在 CSRF 层放行，否则插件所有写操作被挡。
- **身份白名单**：`get_current_user_from_request` 只认 `{session, auth_disabled, internal}` 三种 `auth_source`；新增 `api_token` 必须同步加入，否则 `get_optional_user_from_request`／`require_admin_user` 会忽略已 stamp 的用户并回落 cookie。
- **启动闸**：`test_projection_prewarm.py` 直接驱动 `lifespan`，新增的启动检查必须可 patch。
- **严格优先级**：请求带了 Bearer 就只认 Bearer，不回落 cookie/auth-off，避免「错误 token 被环境旁路掩盖」。

## 3. 目标形态

```text
# backend/.env（gitignored）
DEER_FLOW_API_TOKEN=<32+ 字节随机串>
# 不设 DEER_FLOW_AUTH_DISABLED，或置空

# 插件配置（Plugins 页 / bundle config）
apiToken = <同一串>
```

请求判定（非公开路径）：

| 请求形态 | 结果 |
| --- | --- |
| `Authorization: Bearer <正确>` | 200；身份＝`default` admin；`auth_source=api_token` |
| `Authorization: Bearer <错误/空>` | 401 TOKEN_INVALID（不回落 cookie/auth-off） |
| 无 Bearer，有有效 session cookie | 既有行为不变 |
| 无 Bearer，有 internal 头 | 既有行为不变 |
| 无 Bearer，`DEER_FLOW_AUTH_DISABLED=1` | 既有旁路不变 |
| 无 Bearer，以上皆无 | 401 NOT_AUTHENTICATED |
| `/health` | 永远公开 |

启动：未开 auth-off 且未配置 token ⇒ 启动失败，错误信息给出环境变量名与生成命令。

## 4. 决策表（D1–D6）

| # | 题 | 选项 | 建议 |
| --- | --- | --- | --- |
| D1 | token 来源 | 甲＝env `DEER_FLOW_API_TOKEN`（`backend/.env`，gitignored）；乙＝`config.yaml` 新增 `gateway.api_token`；丙＝首次启动自动生成并落 `.api_token` 文件 | **甲**（与 `DEER_FLOW_AUTH_DISABLED`／internal token 同口径；密钥不进出配置仓库） |
| D2 | 未配 token 且未开 auth-off | 甲＝启动即失败（fail-fast，错误信息带生成命令）；乙＝仅告警，全部非公开路由 401；丙＝回退 auth-off | **甲**（避免起一个「能起但完全不可用」的服务；auth-off 仍是显式逃生口） |
| D3 | token 身份 | 甲＝`default` admin（与 auth-off 同一身份，单租户）；乙＝独立 service 用户；丙＝只读角色 | **甲**（数据 owner 全是 `default`；乙会改 owner 过滤面，丙会挡写操作） |
| D4 | Bearer 与其它凭据优先级 | 甲＝Bearer 先判，带了就必须对，不回落 cookie/auth-off；乙＝auth-off 最高优先；丙＝Bearer 错了回落 cookie | **甲**（显式凭据必须校验；避免错误 token 被环境旁路静默接受） |
| D5 | CSRF | 甲＝带 Bearer 的请求豁免（Bearer 非环境凭据；无效 Bearer 仍被内层 Auth 拒）；乙＝不豁免（插件须额外发 CSRF 头，不现实）；丙＝仅在 token 匹配时豁免（CSRF 在外层，需重排中间件） | **甲**（保持中间件顺序，安全边界由内层 401 保证） |
| D6 | 落地范围 | 甲＝只动引擎（插件已发 Bearer，零代码改动；引擎 README/AGENTS 补配置说明）；乙＝顺带改插件 README 与设置表单；丙＝只改服务端不写文档 | **甲**（插件已有 `apiToken` 全链路；README 的「可选」在 auth-off 部署下仍然成立） |

## 5. 验收

- **单元/集成**（`tests/test_api_token_auth.py`，**11 passed**）：无 token/错误 Bearer 401、正确 Bearer 200 且身份＝`default` admin/`api_token`；Bearer POST 免 CSRF、无 Bearer POST 仍 403；auth-off 无 Bearer 200、auth-off＋错误 Bearer 401；`/health` 200；启动闸两条。
- **真栈**（2026-10-20）：token 模式冷启 18:43:23，`/health` 200；KB 无/错 token 401、对 token 200（id 与基线一致）；`POST /api/knowledge-bases` 无 token 403（CSRF）、错 token 401、对 token 空体 422；`/api/rag/config`、`/api/models` 401→200；`/docs` 200。缺 token 冷启退出码 3，日志含可读 `RuntimeError`。auth-off 回退：无 Bearer 200、错误 Bearer 401。
- **插件真跑（2026-10-20 代跑）**：DSH profile 配 `apiToken`、引擎去掉 auth-off 后重启；引擎日志出现 `GET /api/knowledge-bases`、`supported-formats`、`documents` 三条 200，面板显示 `t3-panel-acceptance` 与文档列表。无/错 token 的 401 由 curl 矩阵证明。
- **门禁**：定向 18 passed；`ruff check`＋`ruff format --check` 净（161 文件）。全量 **10 failed／1820 passed／60 skipped／1 error**，`FAILED` 集与 10-20 基线逐条相同；新增 1 error＋52 skip 均为 Qdrant 不可达环境态 ⇒ 零新增代码红。
- **回退**：删除/置空 `DEER_FLOW_API_TOKEN` 并设 `DEER_FLOW_AUTH_DISABLED=1` 即回到验收态；代码回退即恢复旧行为。

## 6. 不做

- 不做登录页/JWT/OAuth/注册、不做多用户与按库授权。
- 不做 token 轮换 UI、多 token、过期时间、速率限制/锁定。
- 不改检索/摄取/知识库逻辑与任何 API 形状。
- 不改插件仓代码（`apiToken` 发送链路已存在）。
- 不把 `/docs`、`/openapi.json` 纳入鉴权（无数据；保持现有公开口径）。

## 7. 安全边界

- 服务默认只绑 `127.0.0.1`；token 模式下即使绑定到共享网卡，未持 token 的请求也进不来。
- token 等价于单租户 admin：只发给 DSH 插件宿主，不发给浏览器用户。
- 比较用 `secrets.compare_digest`；token 不写入日志、不写进仓库；`.env` 已在 `.gitignore`。
- auth-off 仍会在启动时大声告警；token 模式下若同时设了 auth-off，仅无 Bearer 的请求会走旁路（D4 甲）。
- 远程部署仍需 TLS（反向代理）——本对不改传输层。
