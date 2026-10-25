# 运行时韧性收尾（认领看门狗 / 端口抢占重试 / 锚点告警 / 嵌入就绪判定） —— spec

**Status:** 已拍·待实施（2026-10-25；D1＝10 s／连续 2 次，D2＝只认日志特征）
**Date:** 2026-10-25
**来源:** 10-25 验收轮后的收口。真机验 §5.11 退出清理时发现「认领实例死了状态不会自己翻」；验 §5.13 搬迁与 §5.4 选择器时顺带确认「端口探空到 spawn 之间被抢」只有一句设计、没有实现；plan Task 5/6 记的「坏 `location.json` 的 `warning` 未上屏」「`needsEmbeddingConfig` 的环境变量钥匙仍是近似」也一起收。
**承接:** 分布 spec [2026-10-24-single-download-distribution-spec.md](2026-10-24-single-download-distribution-spec.md) §4.2 步 7（换口重试）、§4.3（服务守护）、§5.10；plan Task 3 未闭合③、Task 4 未闭合③、Task 5 未闭合②④、Task 6 未闭合③。
**配套 plan:** [../plans/2026-10-25-runtime-resilience-plan.md](../plans/2026-10-25-runtime-resilience-plan.md)

## 1. 范围

四件，全部落在 host 半（`src/runtime/*`）与面板的一处提示位：

1. **认领看门狗**：认领来的实例（`adopted`）在 ready 之后不再有任何探活；它死掉时面板仍显示就绪。改为后台周期探活，失败翻 `error`。
2. **端口抢占重试**：`planPorts` 探空到子进程 bind 之间的窗口被抢时，换下一个口重试一次，而不是直接报 `qdrant_exited` / `engine_exited`。
3. **锚点告警上屏**：`location.json` 非法（坏 JSON / 版本不对 / root 非绝对）时，`resolveRoot` 已经给出 `warning` 并回退默认根，但面板看不到；把这条提示送到界面。
4. **嵌入就绪判定**：`needsEmbeddingConfig` 目前用一个环境变量近似压制横幅，判定与引擎实际口径不符；改为只看 `embedding_model`。

**不包含**：自动重启认领实例、多端口/多轮重试、`location.json` 自动修复或备份、看门狗通知（系统通知/托盘）、面板六 tab 任何功能面改动。

## 2. 现状与依据

### 2.1 认领实例没有探活

- `adopt()` 只在 `ensure()` 时探一次（`src/runtime/supervisor.ts:338-356`）；成功后 `phase=ready, adopted=true`。
- `ensure()` 在 `phase === 'ready'` 时直接返回（`src/runtime/supervisor.ts:458-464`），之后不再探。
- 崩溃回调只挂在**自己 spawn** 的子进程上（`crash()`，`src/runtime/supervisor.ts:237-240`）；认领来的实例没有句柄，自然也没人报。
- 结果：另一个 profile（或用户手工起的服务）退出后，本面板继续显示就绪，库操作逐个失败，直到用户重启 DSH。plan Task 6 未闭合③即此。
- 真机旁证：10-25 外部模式验证中，外部服务被我手工 kill 后，若此时面板认领的是它，不会有任何状态变化。

### 2.2 换口重试只有设计

- spec 2026-10-24 §4.2 步 7 写了「探空到 spawn 之间若被抢端口（bind 失败），换下一个空闲口重试一次」，但实现里没有：`planPorts` 只负责探空（`src/runtime/ports.ts:17-45`），`start()` 起 Qdrant 后若就绪前退出即 `fail('qdrant','qdrant_exited')`（`src/runtime/supervisor.ts:406-419`），engine 同理（`:422-441`）。
- 端口被抢在实际使用里不罕见（开发机同时跑别的 Qdrant/uvicorn、端口扫描工具、另一份旧实例刚好退出前的占用）。当前表现是一个直接进错误卡、需要用户点重试的失败。

### 2.3 锚点 warning 没有出口

- `resolveRoot` 在 `location.json` 非法时返回 `{ kind: 'ok', source: 'default', root: 默认根, warning: 原因 }`（`src/runtime/location.ts:129-143`），也就是静默回退。
- `statusPayload` 只把 `needs_location` 的 `previousRoot`/`reason` 放进 payload（`src/runtime/ops.ts:104-107`），`warning` 从未出过 host 半；面板因此不知道文件坏了。plan Task 5 未闭合④即此。
- 这条与 `needs_location` 不同：后者是「用户选的位置没了」，前者是「文件本身坏了，已改用默认位置」——用户需要知道、但不该被打断。

### 2.4 嵌入判定的近似

- 现行 `needsEmbeddingConfig`（`src/runtime/bridge.ts:150-165`）：`/api/rag/config` 的 `config.embedding_model` 为空 **且** 环境里没有 `DASHSCOPE_API_KEY` / `EMBEDDING_API_KEY` / `RAG_EMBEDDING_API_KEY` 才认为「需要配置」。
- 引擎侧口径（只读核对 `engine/backend`）：
  - `embedding_model` **没有默认值**，为空时 `embedder_factory` 直接拒绝构建 embedder（`engine/backend/packages/harness/deerflow/knowledge/embedder_factory.py:192-199`）；
  - provider 的密钥环境变量按 provider 区分：`DASHSCOPE_EMBEDDING_API_KEY`（百炼）、`ARK_API_KEY`（火山）、`RAG_EMBEDDING_API_KEY`（OpenAI 兼容）（`engine/backend/packages/harness/deerflow/knowledge/providers/__init__.py:72/86/99`）。
- 所以现行的三个名字里有两个对不上真实变量，更重要的是：**环境里有密钥也替代不了模型**——判定的方向是错的，会让真正的「未配置」被藏起来。

## 3. 设计

### 3.1 D1 认领看门狗

- 认领成功（`adopt()` 里置 `ready/adopted`）后启动周期探活：每 **10 s** 探一次 `GET <service>/api/knowledge-bases`（带 `service.json` 的 token，超时 2 s）。
- 连续 **2 次**失败 ⇒ `phase=error`、`error.code='adopted_unreachable'`、`detail` 为最后一次错误；保留 `service.json` 与租约（不是我们的实例，不删、不释放、不杀）。
- 状态不自动回弹：服务恢复后仍停在错误卡，用户点「重试」⇒ 重新走 `adopt()`（或起栈）。
- 停止条件：`disposed` 置位（只发生在自管实例的真正拆除路径）、`phase` 离开 `ready`、重试进入新一轮 `ensure()`。认领实例的 `dispose()` 本就早退（不杀别人的服务、`disposed` 不置位），看门狗随单例跨插件卸载继续探活；否则重载后 `ensure()` 会因 `phase==='ready'` 直接返回，把已死的服务继续显示成就绪。自管实例不需要看门狗（`crash()` 已覆盖）。
- 探活与 `adopt()` 共用同一 URL/token 读法；探活失败不影响正在进行的其它 op。

### 3.2 D2 端口抢占重试

- 触发：Qdrant 或 engine 在就绪**之前**退出，且该角色日志尾部（只读本轮 spawn 之后追加的部分）命中绑定失败特征：`os error 10048` / `[Errno 10048]` / `[winerror 10048]`、`EADDRINUSE`、`address already in use`（大小写不敏感）。中文 Windows 实测英文原文不出现、只有数值码，裸 `10048` 会撞日志里的端口号，所以数值码必须带前缀。
- 动作：把该角色端口起点 +1 重新 `planPorts`（另外两个角色保持原值），杀掉本轮残留子进程，整轮重来，**只重试一次**。
- 第二次仍失败 ⇒ 按原错误上报（`qdrant_exited` / `engine_exited`），`detail` 标明 `after one retry`。
- 非绑定原因的提前退出（坏配置、缺文件）不触发重试，避免把真错误的失败时间翻倍。

### 3.3 D3 锚点告警上屏

- `RuntimeStatusPayload` 增加可选 `warning: string`：`resolveRoot` 返回的 `warning` 原样透出（仅托管模式、非 `needs_location` 时）。
- 面板在库视图顶部用现有横幅样式（`.hrag-rt-banner`，与「本地服务已就绪，配置嵌入模型」同槽位）显示：文案含原因，右侧可关闭；不阻断任何操作，不自动改写 `location.json`。
- 同时保留 `needs_location` 的设置卡路径：两者互斥（文件坏了 ⇒ 回退默认根并提示；指向的位置没了 ⇒ 设置卡）。

### 3.4 D4 嵌入就绪判定

- `needsEmbeddingConfig` 只判定 `config.embedding_model` 是否为空；删除三个环境变量名的近似。
- 理由见 §2.4：模型无默认值，密钥不能替代；改完逻辑更短，且不会再漏报。

## 4. 取舍

- **看门狗只报错不自动重启**：自动重启会与租约、双 profile 归属、端口占用互相踩；把决定权留给用户的「重试」，行为可解释。
- **10 s / 2 次**：面板在 ready 后不轮询，宿主必须自己发现；两次是抗抖动与延迟的折中（最坏 20 s 发现）。真机若觉得慢再调单个常量。
- **重试只依据日志特征**：比「无条件重试一次」保守，牺牲一点覆盖换「真崩溃不被掩盖、失败时间不翻倍」。
- **告警用横幅不用弹窗**：文件坏了但服务可用，属于「知道就好」，弹窗会打断正在做的事。
- **判定收紧可能多提示**：去掉环境变量近似后，只有密钥没有模型的部署会重新看到横幅——这正是应该提示的状态。

## 5. 验收

1. **看门狗**：真机认领一个外部实例（外部模式或第二个 profile），把它 kill ⇒ ≤ 20 s 内 `runtime/status` 变 `error` / `code=adopted_unreachable`，`service.json` 仍在；重启服务后点「重试」⇒ 回到 `ready/adopted`。
2. **换口重试**：单测里让 `isFree` 一律返回 true、实则用一个真实 net server 占住首选端口 ⇒ 日志出现一次换口重试，最终在本轮内 `ready`；把两个候选口都占住 ⇒ 重试一次后按 `qdrant_exited`/`engine_exited` 失败，不无限重试。
3. **锚点告警**：写入非法 `location.json` ⇒ 启动后 `root` 为默认根、`runtime/status.warning` 非空、面板顶部出现横幅且可关闭；库列表与上传照常。
4. **嵌入判定**：清空 `rag_config.json` 的 `embedding_model`、同时在宿主环境设 `DASHSCOPE_API_KEY` ⇒ 横幅仍出现；配置好模型后 ⇒ 横幅消失。
5. **门禁**：`tsc` 0 错；`node --test tests/*.test.ts` 全绿且现有 204 条不回归；`engine/` 与主树零 diff。

## 6. 不做

- 认领实例的自动重启、退避重试、健康恢复通知。
- 多轮换口、端口段预留、跨角色重排（只换失败角色的起点）。
- `location.json` 的自动修复、备份、迁移提示。
- 面板六 tab 的功能面改动；本对只加一条横幅与一处状态码。
