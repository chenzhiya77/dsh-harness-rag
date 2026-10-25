# 感知链余口补强（实体→wiki 直取 · wiki→切片回溯 · graph 证据 doc_id） —— 设计

**Status:** 已裁（D1–D6 全甲，2026-10-10）；**主树已全落**（Task 0–5 交付，2026-10-10；ruff 双净＋定向/全量（全量红集与基线逐行相同）＋真栈四轮 W20 过——见 plan 纪行与提交链）；**主树独有**（切片无实体/wiki 模块与 wiki/graph 工具，不随带）。载体＝成对（本文件＋`../plans/2026-10-10-rag-perception-handles.md`）。来源：感知链矩阵（2026-10-09 两树现场核）＋本日三处代码实钉（全部锚点为实读行）＋t6 实例数据实核（18/18 条目名命中实体、wiki ⊂ 实体＝18/63）。**终审 2026-10-10：勘误三处已写回（@tool 壳行号、空态行号 `:96-97`、recall 投影口径——wiki hit 已带同款 `source_chunk_ids` 为先例）＋精度两处（D1 乙的钉句波及、钉句族行域 `:58-:71`）。**

**本对一件事：把「实体」周围剩下的三格补上——①已知实体名→确定性直取 wiki 条目（不再靠语义撞）；②wiki 条目带出 `source_chunk_ids`→可回溯来源切片；③`graph_search` 证据片补 `doc_id`→与 hybrid 凭据对齐、可直达篇级。全部薄壳＋一个入口，零查询改动。**

## 1. 现状与缺口（锚点，实读）

- **① 实体→wiki 仅模糊**：
  - 条目 id 是 (kb_id, title) 的**纯函数**——`wiki_entry_id()`＝uuid5（`knowledge/wiki/store.py:23-24`）；`title`==实体名（t6 实核 18/18）；
  - 现行唯一模型入口 `wiki_search(query,…)`（`tools/builtins/wiki_search_tool.py:33` impl／`:114-115` @tool 壳）＝嵌入→`kb_wiki_entries`＋`kb_manual_cards` dense top-k→按 `entry_id` 从业务库取行（`:55-71`）——`get_entry` 返回**全列**（`:86-88`），item 却只取六键（`:72-79`：entry_id/title/content/score/updated_at/source_type）；
  - **无 title/实体名直取参数**；未命中即空（`:96-97`）；覆盖仅头部实体（docstring 自述 ~top 20%）。
- **② wiki→切片模型面缺**：`source_chunk_ids` 在 `wiki_entries` 行上（列实核）、`get_entry` 已全列返回，但 wiki item 不带（`:74-79`）；**服务层已有同款口径先例**——recall-test 百科锚定通道按 entry_id 读 `source_chunk_ids`、manual→None（`gateway/services/knowledge_service.py:1190-1199`），工具面照抄该口径即可。
- **③ graph 证据片缺 `doc_id`**：证据 item 六键 `chunk_id/text/doc_name/heading_path/page/score`（`tools/builtins/graph_search_tool.py:313-320`）——`doc_id` 就在上一行、且已被取作 doc 名缓存键（`:308-311`）却未外放；hybrid item 早有 `doc_id`/`chunk_index`（上批交付）⇒ 两路凭据不对齐（10-09 矩阵小断点）。
- **SOUL 落点**：`agents/assets/rag/SOUL.md:19`（切片级命中凭据句）／`:34`（第三步沿实体扩展）／`:8`（wiki 路由句）——引导半句落此三处附近；改句须扫钉句族 `backend/tests/knowledge/test_rag_agent_assembly.py`（`:58-:71` 钉句族，执行期复核）。
- **recall-test 投影**：vector hits 逐键挑选（新键不入为预期）；graph 证据为**透传**（`knowledge_service.py:1180-1182`）⇒ ③ 自动进入其响应；**wiki 命中同为逐键挑选，但其 hit 已按同款口径带 `source_chunk_ids`**（`:1216-1217`：改自行上的同一字段、manual→缺键）——② 键名与口径照抄它，服务层零改动；impl 调用点 `:1142` 为 kwargs（加可选参数不碰）。

## 2. 方案

### 2.1 ① `wiki_search` 加 `title` 直取参数（薄壳入口）
- 新参 `title: str | None`：提供时**跳过嵌入与向量路**，走 `wiki_store.get_entry(wiki_entry_id(kb_id, title))` 一次主键查（id 函数 `:23` 与 getter `:86` 均现成）；命中＝照条目 item 塑形（claim 引用号、message 同款句式）；未命中＝如实空态（按 D2）。
- `query` 改为可选（默认 `None`）：`title` 提供即走直取（query 忽略）；两者皆缺＝如实引导文案（两个参数名各出现一次，照本仓「空白＝未声明」惯例，空串 title 视同未提供）。
- 门控与语义路同款（无绑定/无权限/跨库文案一致）；直取路不建 embedder（执行期按 lazy 构造）。
- 匹配口径＝**精确串**（title 即规范化实体名）；不做模糊/大小写折叠。

### 2.2 ② wiki item 带 `source_chunk_ids`（薄壳字段）
- wiki 条目 item 补键（行已在手）；口径按 D4/D5；消费＝`read_knowledge_document(chunk_id=…)` 回溯来源切片（doc-tools 双寻址现成）。

### 2.3 ③ graph 证据片补 `doc_id`（薄壳字段）
- 证据 item 补 `"doc_id": doc_id`（变量现成）；效果＝与 hybrid 凭据对齐、`read(doc_id=…)` 直达篇级；recall-test graph 透传自动享受。

### 2.4 引导（按 D6）
- `wiki_search` docstring：title 参数说明（Args 行）＋「条目带 `source_chunk_ids` 可回溯来源切片」一句；
- `graph_search` docstring：证据片带 `doc_id` 半句；
- SOUL 半句（待裁后落，候选落点 `:19`/`:34`）。

### 2.5 不碰面
- 不碰：召回/重排/引用编号链、wiki 生成与脏标记、图谱抽取/扩张、注入面、前端、recall-test 投影键集、切片树。

## 3. 决策点（已裁：2026-10-10 全甲——即各点首选项）

- **D1 ① 入口形态**：甲＝`wiki_search` 加可选 `title` 参数（薄壳、零新工具）／乙＝独立 `wiki_get` 工具（还须新注册＋动工具组钉句 `test_rag_group_tools_are_exactly_the_three_retrieval_tools`）。
- **D2 ① 未命中行为**：甲＝如实空态（`entries=[]`＋"该实体没有百科条目"类文案；独立入口）／乙＝静默回退语义 query。
- **D3 ① 状态口径**：甲＝与语义路一致（不过滤、字段集同款，dirty 照返）／乙＝直取 item 加 `status` 如实。
- **D4 ② 有界**：甲＝全量照返（精确凭据、截断即丢跳点）／乙＝cap 10（与 entities 批一致）。
- **D5 ② manual 不对称**：甲＝manual 不带键（省略；与服务层锚定通道 manual→None 同款）／乙＝空数组。
- **D6 引导面**：甲＝docstring 两处＋SOUL 半句同批／乙＝仅 docstring（SOUL 不动）。

## 4. 验收（判据）
- 单测：① 直取命中（条目六键＋citation_no）／未命中空态／无绑定与无权限两分支；② wiki item 带 `source_chunk_ids`（与行一致）、manual 按 D5；③ 证据 `doc_id` 与业务行一致且与同片 hybrid item 一致。
- 门禁：ruff 双净＋知识面定向＋全量（知识面零新增红）。
- 真栈小相（W20，t6 实例）：三跳——「实体名 → `wiki_search(title=…)` 直取条目 → 条目 `source_chunk_ids` → `read(chunk_id)` 回溯来源切片；`graph_search` 证据带 `doc_id` → `read(doc_id)` 直达篇级」。
- 树复核：切片零落差（不随带）。

## 5. 明确不做（另案）
- wiki→实体的结构化直取（title 即实体名、现语义可走）；wiki 枚举（模型面 list 口）；wiki 生成/脏管改动；其余 wiki 面。
