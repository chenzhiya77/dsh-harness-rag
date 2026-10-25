# 功能模型「接口地址」解锁（去锁 / 去恢复默认 / 去回落 / 必填） —— 设计

**Status:** 🟡 **实现完成（2026-09-25）、hold 提交** —— **裁定已清：D1 乙（连回落删·必填报错）/ D2 乙（灰字占位=厂商默认、不落值）/ D3 必填**；落法 = 新小对。**本对推翻 2026-09-17 alignment ⑤-4 的 UI 半**（锁 + 恢复默认），运行期"存量地址优先"不动。**配套 plan `2026-09-25-rag-endpoint-unlock.md`：Task 0–3 全做完、实测回填；门禁 = 前端全量 243 文件 / 2628 例 / 0 失败 + 后端相关面（九文件）141/141 + `pnpm check` 净（2026-09-26 复核一致）；真浏览器只读复核见 plan Task 3。⚠️ hold 提交（他 2026-09-25 明令"先不要提交"，等他发话）。**

## 1. 问题

功能模型「检索」的两格**接口地址**当前：厂商固定端点时整格 **🔒 锁死不可编辑**，存过自定义地址时格内出现「恢复默认」。他的裁定（2026-09-25）：**同一家厂商可能有不同的接口地址**（如百炼 workspace 级端点），所以——

1. **不能锁**：用户必须能改；
2. **不要有"默认"的东西**：「恢复默认」按钮删掉、也不要有"空时回落厂商默认"这回事；
3. **必填**：地址是用户自己填的值，缺了不能存。

**与旧裁定的关系**（留档）：09-17 ⑤-4 裁的是"运行期不动（存量地址优先）+ 界面加锁 + 恢复默认"。本对删**后两件**；第一件（存量地址运行期优先于任何其他来源）**不变**。`has_fixed_endpoint` / `default_endpoint` 能力块**保留**，但用途收窄为**占位提示来源 + 后端/向导**，不再是 UI 的锁与回落依据。

## 2. 决定

### D1 —— 回落删除（**已裁：乙**，2026-09-25）

| 落法 | 做法 |
| --- | --- |
| 甲 · 只删按钮和锁 | 留空时运行期仍回落厂商默认 |
| **乙 · 连回落也删**（**已裁**） | **地址必填**：保存时缺地址 ⇒ 报错（可读原因）；**运行期回落删除**——`embedder_factory.py:161` 的 `or spec.default_endpoint` 与 `reranker_factory.py` 的 dashscope 内建回落删掉 ⇒ 存量文件里空地址 = **明确报错**（不再静默用默认） |

- 向导不写 rag 段、`config.yaml` 不含这两格 ⇒ 写入侧只有 UI/手改 `rag_config.json` 两条来路；手改文件缺地址按 D1 报错（与"缺地址·缺钥匙=报错"的既有原则一致）。
- ⚠️ 对 09-17 措辞的连带：`reranker_factory.py:39` 的错误句「only `dashscope` has a built-in endpoint」随内建回落一起作废（改为统一"requires rag.rerank_base_url"）。

### D2 —— 空格子的占位（**已裁：乙**，2026-09-25）

| 落法 | 做法 |
| --- | --- |
| 甲 · 纯空 | 用户不知道该填什么 |
| **乙 · 灰字占位 = 厂商默认地址**（**已裁**） | 能力块 `default_endpoint` **只作占位提示**（不落值、不回落）；无默认的 provider（`openai-compatible` / `generic-rerank`）占位用 `https://api.example.com/v1`（既有占位先例：不假装真值、不特指） |

### D3 —— 必填（**已裁**）

- 前端：两格任一为空 ⇒ Save 禁用并给原因（沿用 `sparseBlockReason` 同款"禁用+一句话原因"模式）；
- 后端：PUT 对 `embedding_base_url` / `rerank_base_url` 做必填校验，缺 ⇒ 可读 400/422（按现有错误风格），**不因 provider 是否"厂商固定"而豁免**（09-23 的"厂商格豁免"口径在本两格上被本裁定收回）。

## 3. 落点

| 面 | 改什么 |
| --- | --- |
| `functional-models-view.tsx` | 两格 endpoint 行**永远 `Input`**（`LockedBox` 该两腿退役；组件保留——稀疏 `:918`、解析 `:1128/:1135/:1139` 的锁**不在本裁定内、不动**）；「恢复默认」按钮与 `resetToDefault` 该消费点删；占位 = 当前 provider 的 `default_endpoint`（无则 example.com）；必填守卫 |
| `core/rag/config-form.ts` | `resolveEndpointRow` / `resolveFixedEndpointRow` / `resolveRerankEndpointRow` 的 locked/overridden 分支退役（保留取 `default_endpoint` 做占位的小查询） |
| `embedder_factory.py:161` | `or spec.default_endpoint` 删 ⇒ 空 = 明确报错 |
| `reranker_factory.py:36-39` | dashscope 内建回落删 ⇒ 统一"缺 `rag.rerank_base_url` 报错" |
| `app/gateway/routers/rag_config.py` | **零改动** —— 400 由既有「保存期构建校验」（无条件构建两条腿）自然产生：工厂删回落即生效，无需新增必填代码 |
| 用例 | 前端 dom（行可编辑/无恢复默认/占位/必填守卫）+ 后端（PUT 缺地址报错 ×2、工厂空地址报错 ×2） |

## 4. 验收

1. 两格 endpoint 行在任何 provider 下都是**可编辑 Input**（dom 钉：无 `LockedBox`、有 `aria-label`）。
2. 格内**无「恢复默认」**（`queryByText(F.resetToDefault)` 在该两行为 null；`resetToDefault` key 若无其他消费点一并删三文件）。
3. 空值占位 = 该 provider 的 `default_endpoint`（dashscope ⇒ `https://dashscope.aliyuncs.com` 等）；无默认 ⇒ `https://api.example.com/v1`（dom 钉 placeholder）。
4. 必填：前端任一为空 Save 禁用 + 原因一句话；后端 PUT 缺 `embedding_base_url` / `rerank_base_url` 各报可读错误（单元钉）。
5. 回落删除：工厂对空地址**报错**而非用默认（单元钉 ×2）；错误句不再提"dashscope has a built-in endpoint"。
6. 存量地址运行期优先**不变**（既有用例零改动全绿）。
7. 稀疏/解析行的锁**未受影响**（既有用例零改动全绿）。
8. 门禁：后端 `make test` 相关面 + 前端 `pnpm check` / 触碰面全绿；真浏览器两态复验（宽窄均两格可编辑、占位正确）。

## 5. 影响面与非目标

- **非目标**：能力块字段（`has_fixed_endpoint` / `default_endpoint`）的存废（保留）；向导/手写写入侧；稀疏/解析/MQ 等其他锁行；`providers.py` 的 allowlist 数据。
- **旧文引用**：09-17 alignment spec 的 §3 D4/验收 13（真栈腿①"留空保存 400"仍成立且更早触发）措辞以本对为准——本对**不改**冻结的旧 spec，只在 plan 里记引用关系。
