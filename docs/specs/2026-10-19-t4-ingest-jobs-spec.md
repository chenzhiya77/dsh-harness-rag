# 插件 T4 —— 摄取通道（宿主后台任务）Spec

**Status:** ✅ 实施完成（2026-10-19 他令「都做」＝最小＋完整两案合一整做）——Task 0–4 全落（host `src/jobs.ts`＋`kb_proxy.ts` 两接线＋client 会话采集）；门禁：双语法全过＋冒烟默认/hostless 各 **78 PASS/0 FAIL**＋`probe-t4` 6/6＋`probe-menu` 13/13；真跑候他手验（整重启 DSH 换 host 模块代）；定稿一笔候令（未提交）。
**Date:** 2026-10-19
**配套 plan:** [2026-10-19-t4-ingest-jobs-plan.md](../plans/2026-10-19-t4-ingest-jobs-plan.md)

## 1. 范围与来源

来源＝步骤记录 [2026-10-11-plugin-porting-plan.md](../2026-10-11-plugin-porting-plan.md) §5 T4：「`ctx.jobs` 后台摄取接入（上传→解析→分块→嵌入的进度与失败呈现）」。

落法＝**观察型 job**：后端（Harness RAG 服务）照旧干摄取的重活；插件 host 半在每次「上传文档」「重建索引」发起后，向 DSH 宿主任务系统注册一个后台任务，跟踪到终态，在会话头部的「后台任务」名册里呈现进度/失败；用户可在名册里停止跟踪。**不把摄取搬进宿主进程**；零后端改动、零新面板 op、面板现有自轮询零回归（job 为叠加面）。

## 2. 宿主契约（2026-10-19 asar 实查）

`ctx.jobs`＝宿主后台任务注册表（`@deepseek-ai/dsh-jobs-local`）；浏览器名册＝`dsh-client-ui-jobs`（会话头部控件）；Remote 投影＝`dsh-api-job-controller`；模型侧控制＝`dsh-tool-jobs`（在 agent 预设作用域内挂载，即它属下的 agent 才「有控制器」）。

- `start({kind, label, owner?, run})` 同步返回 id（`<kind>-<16hex>`），预检不过**同步抛**：`owner`＝**会话 id**（注册表 `agents.get(session)` 解析成活体 Agent；会话无活体 agent 即拒）；省略 owner＝**无主**（可见集＝「自己的＋全部无主」，但需要全局层控制器——桌面组合未见，仅作回退尝试）。
- `run(handle)` 同步返回 `{done, cancel}`；handle＝`{id, append(text, {channel:'stdout'|'stderr'|'log'}), updateProgress(line)}`；done 解析 `{status:'completed'|'killed'|'failed', detail?}`。名册两击停止 → `cancel(reason)` 被调，原因并入终态 detail（`<detail>; cancelled by the user`）。
- 名册行＝kind 芯片（原样字符串）＋label＋实时 progress 行（或终态 detail）＋时长；进行中/留有输出的行可展开终端面（读保留环）；结算行折叠进「已结束」组（客户端可清空）。
- **结算通知**：tool-jobs 会把「未被 wait 收走」的**有主** job 结算投递给拥有者 agent（忙碌注入下一步、空闲可唤醒一轮）。⇒ 插件对每个 job 内部发起一次长时 `wait` 收走结算（契约明说「无论哪个插件在等待」皆不播报），摄取完成**不打扰对话**。
- 容量：每 owner（无主共桶）并发上限默认 10；销毁：会话 agent 释放/会话归档会取消其名下任务（cancel→我们停跟踪，D4 同义）。

## 3. 决策表

| # | 点 | 决定 | 理由 |
| --- | --- | --- | --- |
| D1 | 载体 | **观察型 job**（kind `hrag-ingest` / `hrag-reindex`，宿主半） | 重活在服务端；宿主侧只需「进度/失败呈现＋可停止」 |
| D2 | 归属 | owner＝面板所在会话 id；采集不到/启动被拒→回退「无主」尝试；两路皆拒→静默跳过（面板行为不变） | 有主才进本会话名册；无主需全局控制器（未见） |
| D3 | 粒度 | 上传＝一文档一 job（label＝文件名）；重建＝一库一 job（label＝库名；仅 `enqueued` 起，`already_running` 不起） | 自然对应；避免重复登记 |
| D4 | kill | ＝**停止跟踪**：停轮询、结算 killed，detail 注明后端摄取继续 | 后端无取消端点；不假装能停服务端工作 |
| D5 | 文本 | 英文机器态词汇（`queued`/`parsing`/`chunking`/`indexing 40%`/`ready · N slices`/`rebuilding N/M · K vectors`/`failed · <腿>`）；label 用用户数据（文件名/库名）；**原始 error 串零出口**（沿 A⑤） | 名册是宿主 chrome（bash 先例＝进程内容原样）；A⑤「原始串全 UI 零出口」不破 |
| D6 | 节奏与护栏 | 3s 轮询（对齐 `PIPELINE_POLL_MS`）；连续 5 次拉取失败→failed「knowledge service unreachable」；观察上限 2h→failed「watch timed out」；文档从清单消失→failed「document was removed」；重建「先见 `in_progress:true` 再转 false」才按 `last_run` 结算，未见启动（3 轮≈6s）同样按 `last_run` 判、`None` 则 failed「the rebuild did not start」 | 与面板同源取数；结算只认观察到的翻转，防陈旧 `last_run` |

## 4. 落点

- host 半（新 `src/jobs.ts`）：`registerIngestJobs(ctx, config)` → `{noteDocument, noteReindex}`；惰性 `ctx.get('jobs')`；结构型最小接口（不 import 宿主类型包）；一切失败软着陆（catch ＋ 每进程一次性 warn）。job 内核＝注册（含 D2 回退链）＋静默结算 wait＋两观察循环（D6）。
- host 半（`src/kb_proxy.ts`）：`forwardUpload` 2xx 后解析响应 JSON（取 `id`/`name`）→ `noteDocument`（`session_id` 从 query 取）；`reindex` op 包 async：成功后 `{status:'enqueued'}` 时 `noteReindex`（`session_id`/`kb_label` 从 args 取）。
- client 半（`client.js`）：面板根 ref → `capturePanelSession`（`closest('[data-sidebar-right-session]').getAttribute('data-sidebar-right-session')`）→ 模块级 `panelSessionId()`；`callUpload` query 增 `&session_id=`；`confirmReindex` 参数增 `session_id`＋`kb_label`（`kb.name || kb.id`）。
- 零新 op：`session_id`/`kb_label` 经既有载荷（query / JSON args）传递。

## 5. 失败/边界语义

- 上传 HTTP 失败（本 op 即错）＝无 job（面板照旧报错）。上传 2xx 但响应非 JSON/缺 `id`＝无 job（不猜）。
- 无 `ctx.jobs`（组合未载 jobs-local）＝无 job，面板零回归；启动抛错＝同上（一次性 warn）。
- job 采样失败 N 次＝结算 failed；不影响后台真实摄取（job 只是观察者）。
- 结算文本组装（文档）：`ready · N slices`（`chunk_count` 缺则 `ready`）＋任一路 `degraded` 追加 ` · some paths degraded`；`failed · <腿1, 腿2>`（`path_status` 值＝`failed` 的腿名，无则 `failed`）。
- 重建结算：`last_run='succeeded'`→completed「rebuild succeeded」；`'failed'`→failed「rebuild failed」；其它→completed「rebuild finished」。

## 6. 非目标与另案登记

- 不引入后端取消端点；不搬摄取（D1）。kill 只停跟踪。
- 不把 job 呈现搬进面板（名册在宿主头部；面板自轮询零改动）。
- 不做 job 的历史持久化/重连恢复（宿主契约本就进程本地：宿主重启丢名册与环）。
- 不接 wiki 腿：document `ready` 即终态；wiki 继续库级后台跑（出 T4 线）。
- **残差登记**：①多面板实例（多会话同开）＝模块级单值、后挂载者胜——最坏情形＝job 归属到用户另一活体会话的名册（同人可见，无害）；②无双轮询前的陈旧 `last_run` 理论窗（任务派发在毫秒级，6s 宽限下不可达，登记不处置）。

## 7. 验收

1. **上传**：新文档入库→会话头部出现「hrag-ingest · 文件名」行，progress 逐阶段推进（queued→parsing→chunking→indexing N%），终态 `ready · N slices`（或 `failed · <腿>`）。
2. **停止**：名册行两击停止→行转 stopping→已结束，detail 含「cancelled by the user」；后端摄取不受影响（面板照常走到 ready）。
3. **重建**：设置面触发重建→出现「hrag-reindex · 库名」行，progress＝`rebuilding N/M · K vectors`；终态 `rebuild succeeded`/`rebuild failed`。
4. **失败面**：断后端→约 15s 后 failed「knowledge service unreachable」；文档被删→failed「document was removed」。
5. **无回归**：面板上传/重建/文档自刷行为逐字不变；宿主无 job 服务时同样不崩（软着陆）。
6. **门禁**：`node --check client.js`＋`node --experimental-strip-types --check src/*.ts`；冒烟默认/hostless 全绿（新增面板会话采集块）。

## 8. 等价对照（宿主先例＝bash job）

| 面 | bash job 先例 | 本文 |
| --- | --- | --- |
| kind / label | `bash` / 原命令 | `hrag-ingest`·`hrag-reindex` / 文件名·库名 |
| 进度线 | 无（命令输出即进度） | `updateProgress` 阶段/百分比行 |
| 输出环 | stdout/stderr 原始流 | `log` 通道阶段行（模型不可见） |
| 结算 detail | `exit code: N` / signal | ready 摘要 / failed·腿 / cancelled |
| 通知 | 模型自己发起⇒收通知 | 插件内部 wait 收走⇒不打扰对话 |
