# 首期缺陷批（对话隔离回归 + 知识库上传路由） —— 实施 plan

**Status:** ✅ 完工（2026-10-06；D1–D4 全甲）。提交链：`62019263b` nginx＋守卫 → `f2e1689dd` 前端重置 → `e0ee6e01e` 网关校验 → `8547bc7d0` spec/plan/清单 → 本笔回填。Spec：`../specs/2026-10-06-rag-defect-batch-design.md`。

**交接表**

| 项 | 锚 |
| --- | --- |
| 前端重置原机制 | `2711a35a2`（effect 原文见 spec §1）；删除点 `52b0dd76d` |
| 面板/页面 | `frontend/src/components/workspace/knowledge/chat-panel.tsx`（无 key、无重置；注释 L124）／`frontend/src/app/workspace/knowledge/page.tsx:584` |
| 后端 | `knowledge/access.py:23–38`；run 创建 `app/gateway/services/__init__.py:1055`；线程绑定存储 `persistence/thread_meta/` |
| nginx 三处 | `docker/nginx/nginx.conf:171`／`docker/nginx/nginx.local.conf:172`／`deploy/helm/deer-flow/templates/configmap-nginx.yaml:134` |
| 风险点 | 深链 effect 位序（重置须在 `requestedThreadId` effect 之前）；拒绝码与文案（D3）；守卫测试仿 `backend/tests/test_compose_default_bind_host.py` |

## Task 0 核销（已跑）

- [x] effect 序列与深链位序已钉（重置 effect 装于状态块后、`requestedThreadId` effect 之前）；深链用例零引用、已补（Task 1）
- [x] 校验落点已钉：`start_run` 所有权块之后（`services/__init__.py`）；`thread_meta.get` 行含 `metadata` 键
- [x] **nginx 现状＝已在**：三处配置＋守卫测试 `tests/test_nginx_knowledge_uploads.py` 已在工作区（mtime 2026-10-06 05:36；未提交/未跟踪，非本批产出）——不重复添加；守卫测试 6/6 绿

## Task 1 前端：切库重置＋用例

- [x] RED：`chat-panel.dom.test.tsx` 加两条用例——①切库开新会话（选历史 → 重渲 kb=B → 新 uuid/isNewThread）；②深链不被重置打断（`requestedThreadId` 选中后，重置不覆盖所选线程）。**实落：两用例已落（`chat-panel.dom.test.tsx` L416 切库即新会话／L426 位序守卫）；提交 `f2e1689dd`。**
- [x] GREEN：按 D1 落重置；chat-panel 全用例（含新增两条）绿；`pnpm check` 零诊断。**实落：重置 effect 已按 D1 落（`chat-panel.tsx`，位序在深链 effect 前）；chat-panel 全用例绿（含新增两条）；`pnpm check` 当时受别线在途 TS2353 红波及、本批波及面绿（见 Task 4 备注）。**

## Task 2 后端：绑定校验＋用例

- [x] RED：网关用例三态——绑定线程＋不一致 ⇒ 拒（D3 码）；一致 ⇒ 放行；无绑定 ⇒ 不拦。**实落：三态用例已落（该提交共 4 用例）；提交 `e0ee6e01e`。**
- [x] GREEN：落校验；目标面测试绿。**实落：`start_run` 绑定校验已落（不一致 ⇒ 403「对话与知识库绑定不一致」；线程有绑定、请求不带 kb 维持「不检索」）；目标面测试绿；提交 `e0ee6e01e`。**

## Task 3 nginx：三处＋守卫测试（按 D4）——核销为「已在」

- [x] 三处知识上传 location 已在工作区（05:36 既有改动）：regex/100M/`proxy_request_buffering off` 与 spec 一致
- [x] 守卫测试已在（未跟踪文件）：三文件参数化＋括号深度提取＋尺寸区间＋缓冲断言，6/6 绿
- [x] 归属记入 Task 4 提交链（该笔工作与两处本批改动同在工作区，提交时一并认领）。**实落：nginx 三处＋守卫测试已随 `62019263b` 认领进 Task 4 提交链。**

## Task 4 收尾

- [x] 真栈·nginx 通道（探针，2026-10-06）：一次性 `nginx:alpine` 容器＋从 `nginx.local.conf` 逐字取的两个 location（upstream 换死端口，断言只看非 413）——2MB POST：知识库路由 **502≠413**（放行）／通用 `/api/` **413**（对照，1m 默认仍在）／threads 路由 502≠413；容器已停、scratch 已清
- [x] 真栈·行为两项（2026-10-06，浏览器＋页内 fetch）：①切到「测试1」面板重置为新会话（旧消息不跟随）→切回「测试2」历史重开 `a933d732…` 旧会话完好（消息/引用/来源/耗时全在、thread id 不变）；②旧线程＋他库 kb 的 run 请求 **403「对话与知识库绑定不一致」**；一致 kb 对照 **200 受理**（run `e71cbe11…`，防误杀）
- [x] 收尾：清单勾选已落（对话隔离 3＋nginx 1）；提交链 `62019263b`→`f2e1689dd`→`e0ee6e01e`→`8547bc7d0`→（本笔回填）；spec 状态行已更新。备注：前端 `pnpm check` 两处红（TS2353 `anchor_mismatch`）属**别线在途**文件（eval-question 两测试，非本批所碰），本批波及面绿

**检查项**：提交信息英文 conventional；后端 `make format`／前端 `pnpm check` 净；不改 RFC 与 §10.2。
