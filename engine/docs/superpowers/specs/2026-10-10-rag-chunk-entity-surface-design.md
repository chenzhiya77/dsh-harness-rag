# 切片→实体 模型面通路（感知链断点补强） —— 设计

**Status:** 已裁（D1–D5 全甲，2026-10-10）；**主树已全落**（Task 0–4 交付，2026-10-10；ruff 双净＋定向/全量（知识面零新增红）＋真栈两跳 W19 过——见 plan 纪行与提交链）；**主树独有**（切片无实体模块与图谱工具，不随带；切片 example 零落点）。载体＝成对（本文件＋`../plans/2026-10-10-rag-chunk-entity-surface.md`）。来源：感知链矩阵（2026-10-09 两树现场核）＋本日代码实钉（全部锚点为实读行）。**终审 2026-10-10：勘误两处已写回（SOUL 措辞、测试消费方路径与受害者面）＋精度两处（去重责任面、回填锚点）。**

**本对一件事：把「命中切片」到「它提到的实体」这一跳补上——两处工具结果各带实体名，纯薄壳，零查询改动。** 感知链现状：doc↔chunk 通、实体→切片通（`source_chunk_ids`）、实体→邻域通；**唯独「这片提到哪些实体」模型面没有**——这是链上唯一断点。补齐后：命中切片可钻到实体、再经 `graph_search` 横向扩展（关系/多跳问题的第二跳），「这片里提到哪些实体」也可直接答。

## 1. 现状与缺口（锚点，实读）

- **数据面全齐（零改动）**：`ChunkRow.entities`＝规范化实体名（`backend/packages/harness/deerflow/knowledge/models.py:76` 类内，字段 `:89`；图谱腿回填＝`knowledge/graph/indexer.py` 写行、`resolver.py` 合并后经 `store.rewrite_chunk_entities` 双镜像改写；`extract_status` pending→done/empty/failed 状态机）；store 三读取口返回**整行 dict（含 entities）**——`get_chunks_by_ids`（`knowledge/store.py:326`）、`get_chunk`、`list_chunks`（`:282`）；序列化经 `_row_to_dict`＝`row.to_dict()`（`:45`，无 exclude；`to_dict` 实义＝全列导出，本日实读）。
- **模型面缺（两处小改点）**：
  - `hybrid_search` 结果 item（`tools/builtins/hybrid_search_tool.py:80-94`）：现有七键 `chunk_id/text/doc_id/chunk_index/doc_name/page/heading_path`（＋score/citation_no）——**无 entities**；
  - read 工具 item 塑形 `_shape_items`（`tools/builtins/knowledge_documents_tool.py:76`）：五键 `chunk_id/chunk_index/heading_path/page/text`（超长截断标 truncated）——**无 entities**；
  - SOUL **未提切片实体字段**（`agents/assets/rag/SOUL.md`：仅 `:9` 有泛化的「实体关系→`graph_search`」路由句；新增半句落点＝补检节 `:32-33`，避开「回补」钉句）。
- **同族未通项（不在本批，见 §5）**：实体→wiki 直取、wiki→切片模型面、`graph_search` 证据片补 `doc_id`。

## 2. 方案

### 2.1 两处结果补 `entities` 字段（薄壳）
- `hybrid_search` item 与 read item 各增 `entities`：取行上 `row["entities"]`（输出侧去重保序；上游写入未承诺去重），**零查询改动**（整行已在手）；
- 空/未回填/失败：按 D5（荐＝空数组照常，不引入新状态）；
- 上限：按 D3（荐＝cap 10）。

### 2.2 引导（按 D4）
- 两工具 docstring 各补一句：结果含本片实体名（规范化），可作 `graph_search` 的入口；
- SOUL 补检节半句：从命中切片沿实体扩展（与「第一步换路/第二步换问法」并列的第三小步）。
- ⚠️ 主树 SOUL 独有改动（切片不动）；SOUL 句改须扫用例面（`test_rag_agent_assembly.py` 的钉句族，Task 0 复核清单）。

### 2.3 树归属与不碰面
- **主树独有**：切片无实体模块与 `graph_search`，本批不随带、example 不注册（例外语）；
- **不碰**：召回/重排/引用编号链、注入面、前端（切片抽屉已在展示 entities，UI 零改动）、图谱/wiki 腿、recall-test 白名单投影（新键不入其响应，可由 Task 0 复核确认）。

## 3. 决策点（已裁 2026-10-10：全甲）

**✅ 裁定：D1=甲（`entities` 数组）／D2=甲（hybrid＋read 两处）／D3=甲（cap 10 静默）／D4=甲（docstring 各一句＋SOUL 半句）／D5=甲（空数组照常）；乙/丙各案均不取。**

- **D1 字段形状？** 甲｜`entities: [名…]` 数组（荐）：名字直接可用；乙｜只给计数（模型拿不到名字，等于没用）；丙｜并入 text（污染正文，弃）。
- **D2 覆盖面？** 甲｜`hybrid_search`＋read 两处（荐）：覆盖「命中」与「原文读」两条入口；乙｜仅 hybrid（read 路断半截）；丙｜再扩 `graph_search` 证据片／wiki（另案，见 §5）。
- **D3 上限口径？** 甲｜cap 10 静默、docstring 注明「up to 10」（荐）：schema 不膨胀；乙｜cap 10＋`entities_total` 计数（多一键）；丙｜全量（token 风险）。
- **D4 引导落点？** 甲｜docstring 各一句＋SOUL 半句（荐）：不然模型不知道这字段能钻；乙｜仅 docstring；丙｜不动。
- **D5 未回填/失败态？** 甲｜空数组照常（荐）：数据面诚实即可；乙｜显式 `entities` 状态标记（新概念，不值）。

## 4. 验收（草案）

- 定向：两工具各 RED→GREEN（含 cap 截断、空数组两态）＋neuter 恰红还原；SOUL 用例族通过；
- 门禁：ruff 双净＋定向 pytest；改动含检索工具（共享面）⇒ 加跑主树全量；
- 真栈小相（W19）：实例造「这片里提到了哪些实体？和 X 有什么关系？」两跳追问——观察模型是否用 entities 作 `graph_search` 入口；
- 回填：plan 纪行＋本 spec 状态行。

## 5. 明确不做（另案）

- 实体→wiki 的确定性入口（wiki_search 语义查询维持）；
- wiki→切片模型面通路（`source_chunk_ids` 仅 recall-test API 露出——维持）；
- `graph_search` 证据片补 `doc_id`（一处小修，与上两项同属 ③ 小件，另行立项）。
