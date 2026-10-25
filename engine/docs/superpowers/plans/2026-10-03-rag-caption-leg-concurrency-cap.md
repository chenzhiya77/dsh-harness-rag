# RAG caption 腿限流口径统一小对 —— 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. 「实测」段回填真实命令与数字，不预填、不估算。

**Spec:** [2026-10-03-rag-caption-leg-concurrency-cap-design.md](../specs/2026-10-03-rag-caption-leg-concurrency-cap-design.md)
**Status:** ✅ **D1=甲 / D2=甲 已裁并交付（2026-10-03）** —— D1=固定共用常数 4（两腿同源）、D2=`worker_concurrency` 保持 2（零配置改动）；Task 0–2 全交付。

**Architecture:** 两腿锁收敛到单一共用常量（D1=甲 时 W=2 零行为差异）；W 值随 D2 裁定，是已有配置 `rag.worker_concurrency`。

## 范围与交接

| 决策 | 本期落点 | 明确移出 |
| --- | --- | --- |
| D1 口径统一 | 待拍（甲=常数 4 推荐 / 乙=W×2 / 丙=维持） | 抽取/wiki/图谱腿并发口径 |
| D2 W 值 | 待拍（甲=保持 2 推荐 / 乙=3 / 丙=4） | N=32 膝点补测（除 D2=丙） |

## 硬约束

- 单点定义（常量一处、两腿引用）；W=2 零行为差异；prompt/降级/失败语义不动；不新增旋钮。

## Task 0 — 落点核实 ✅

- [x] ① 两处 Semaphore 现址复核（`captioner.py:100` / `video/captioner.py:94`，行号未漂）+ 常量落点定 **`caption_client.py`**（两腿已共用的出站模块）+ 既有用例扫描：**零受害者**（无断言锁值的用例；video 两夹具 `worker_concurrency=2` 下新旧行为同）。

## Task 1 — TDD ✅

- [x] RED：两用例写红（`test_caption_concurrency.py`）：同源同值（W=1 实测 4 vs 2）/ 锁不随 W 放大（W=1 vs 3 实测 2 vs 6）——红因=公式分叉。
- [x] GREEN：`caption_client._CAPTION_CONCURRENCY = 4` 单点常量，两腿改引用 ⇒ 47 绿（含旧 45 例零回归）。
- [x] neuter：视频腿拆回 `W×2` ⇒ 恰 2 红、还原后全绿。门禁实测：caption+video+worker 面 **258/258 绿**（仓外隔离 basetemp）+ ruff check/format **双净**（4 文件）。

## Task 2 — W 裁定执行 + 收尾 ✅

- [x] D2=甲 ⇒ **W 保持 2、零配置改动**（4×2=8 在膝点背书区内）。
- [x] plan 复选框全勾 + 提交号回填：`7a33ac3f`（成对起草）→ 本笔（Task 0–2 交付）。
