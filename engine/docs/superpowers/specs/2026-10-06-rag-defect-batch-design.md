# 首期缺陷批（对话隔离回归 + 知识库上传路由） —— 设计

**Status:** ✅ 完工（2026-10-06）：D1–D4 全甲；前端/后端已落（30/30、128/128 绿、ruff 净）；nginx 三处＋守卫测试（工作区既有，随本批提交，6/6 绿）；真栈两毕（nginx 探针 502/413/502；行为两项 403/200 双态）。提交链：`62019263b`→`f2e1689dd`→`e0ee6e01e`→`8547bc7d0`→（本笔回填）。成对 plan：`../plans/2026-10-06-rag-defect-batch.md`。

**本批一件事：把清单核实出的两条既有缺陷修平——① 切库隔离回归（前端切库不重置会话＋后端不校验线程既有绑定）；② 知识库上传路由未过 nginx 门面（经 :2026 传 >1MB 必 413）。不含任何新增功能、不含切片工作。**

来源：2026-10-06 工作项清单（`docs/plans/2026-10-06-rfc-v3-eval-workitems.md`）逐项核实＋既定原则「先修缺陷；RFC 与代码同发（说了没做＝重大错误）；范围＝已完成上裁剪」。

## 1. 问题（机制与证据链）

### 缺陷一：切库隔离（回归；A4/A6）

1. **前端**。切换重置 effect 首发即有（`2711a35a2`）：

```js
// Switching knowledge bases always starts a fresh conversation: threads are
// bound to exactly one kb via metadata.kb_id and must never bleed across.
useEffect(() => {
  setThreadId(uuid()); setIsNewThread(true); setDraft("");
}, [kbId]);
```

`52b0dd76d`（「…RAG session isolation」）把该 effect 整块删除（提交信息未列此项；模型恢复随之改派生实现，重置半没有再补）；注释留存至今（`chat-panel.tsx` L124–126 仍宣称该行为）。现状：`page.tsx:584` 面板无 `key`、面板各 effect 无一在 `kbId` 变化时重置、`handleNewChat` 只挂新建按钮与删除 ⇒ 切库后上一库会话仍在，下一条消息带新库 `context.kb_id` 在同一会话内检索。

2. **后端**。`knowledge/access.py::resolve_kb_scope`（L29–38）只认当次 `context.kb_id`；`can_access`（L23–26）只查所有权；线程既有绑定（`metadata.kb_id`，由前端 onCreated 写入 `threads_meta`）服务端不读 ⇒ 请求与线程绑定不一致时不拒。

后果：同一用户拥有 A、B 两库时，A 库会话切到 B 后继续提问 ⇒ 会话内查 B、引用混库（违反 A4「切库不复用上一库的会话」、A6「新建、续聊、历史恢复保持同一绑定」）。

### 缺陷二：知识库上传路由未过 nginx（部署面）

三处配置均只有 `location ~ ^/api/threads/[^/]+/uploads`（100M＋`proxy_request_buffering off`）：`docker/nginx/nginx.conf:171`、`docker/nginx/nginx.local.conf:172`、`deploy/helm/deer-flow/templates/configmap-nginx.yaml:134`；`knowledge-bases` 零 location ⇒ 知识上传（`POST /api/knowledge-bases/{id}/documents`）落通用 `/api/`＝nginx 默认 1m ⇒ 经 :2026 上传 >1MB 文档被拒。验收一直走 :3000 直连、未经过门面；上游对同类路由已有独立 location 先例（RFC §7 部署材料）。

开工核销（2026-10-06 05:36）：三处 location 与守卫测试 `backend/tests/test_nginx_knowledge_uploads.py` **已在工作区**（未提交/未跟踪，非本批产出）——本批对此只剩验货（6/6 绿）与提交归属。

## 2. 决策（待裁）

- **D1 前端重置落法**：甲＝恢复切换重置 effect（`[kbId]` 上 `setThreadId(uuid()); setIsNewThread(true); setDraft("")`；声明位序必须在 `requestedThreadId` 深链 effect 之前，保证深链选中胜出）｜乙＝页面层给面板加 `key={selectedKbId}` 重挂。推荐甲：最小、与首发机制一致、深链用例可保。
- **D2 后端校验口径**：甲＝不一致即拒（请求带 `kb_id` 且线程有绑定且不等 ⇒ 拒绝；线程有绑定而请求无 `kb_id` ⇒ 维持现状「不检索」）｜乙＝服务端以线程绑定为准（缺失补齐＋冲突拒绝）。推荐甲：合 A6 字面「被拒绝」，不动补齐语义。
- **D3 拒绝形态**：甲＝403＋明确文案（「对话与知识库绑定不一致」，与 owner 拒绝同族）｜乙＝409。推荐甲。
- **D4 nginx 守卫测试**：甲＝加（仿 `backend/tests/test_compose_default_bind_host.py`：断言三处配置含知识上传 location 与放开的上限）｜乙＝不加。推荐甲。

## 3. 方案（按裁定回填）

### ① 前端：切库即新对话（D1=甲）

恢复切换重置 effect：`[kbId]` 变化时 `setThreadId(uuid()); setIsNewThread(true); setDraft("")`（与 `handleNewChat` 同款三条）；**声明位序必须在 `requestedThreadId` 深链 effect 之前**（同一提交内先重置、后选中，深链胜出）；不加 `key`、不动其他 effect。**深链用例＝新增**：现状 `requestedThreadId` 在 `frontend/tests/` 零引用（`52b0dd76d` 提交信息所称的面板深链测试已不在现文件），位序风险须由新用例钉住。

### ② 后端：线程既有绑定校验（D2=甲 / D3=甲）

落点候选：网关线程级 run 创建（`app/gateway/services/__init__.py::start_run`，L1055）读线程绑定（`persistence/thread_meta/`，`metadata.kb_id`）与 `body.context.kb_id` 比对。规则：请求带 `kb_id` 且线程有绑定且不等 ⇒ **403＋文案「对话与知识库绑定不一致」**；线程有绑定而请求无 `kb_id` ⇒ 维持「不检索」；无绑定线程不拦。Task 0 钉具体读取助手与插入位。

### ③ nginx：知识库上传路由（三处同步）

三处各加（与 threads 上传同款）：

```
location ~ ^/api/knowledge-bases/[^/]+/documents {
    # 转发头与通用 /api/ 一致
    client_max_body_size 100M;
    proxy_request_buffering off;
}
```

守卫测试（D4=甲）：仿 `backend/tests/test_compose_default_bind_host.py` 断言三处含该 location 与放开的上限，防漂移。

## 4. 验收

- A4：切库不再复用上一库会话（前端用例＋真栈一次切库提问）；
- A6：请求 `kb_id` 与线程绑定不一致 ⇒ 被拒（后端用例）；一致 ⇒ 放行；
- nginx：经 :2026 上传 >1MB 样例成功（真栈；:3000 直连为对照）；
- 回归：chat-panel 既有用例（绑定/历史过滤/删除重置/新建重置/深链）与网关既有用例全绿。

## 5. 边界（不做）

- 不加任何新功能（评测/契约/可选启停/裁剪归切片 plan）；§10.2 四行不动。
- RFC 无需改：本批使实现回到 §2.2/§4.1 与 A4/A6 的既有表述。
- 子代理绑定（本就不带 kb 绑定）与「禁用不检索」现状保持不动。
