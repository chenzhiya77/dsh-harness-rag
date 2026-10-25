# 实体↔wiki 收口（graph 实体直参 · wiki 条目枚举） —— 设计

**Status:** 已裁（D1–D7 全甲，2026-10-10）；**主树已全落**（Task 0–4 交付，2026-10-10；ruff 双净＋定向/全量（知识面零新增；15 条浏览器族红＝在案瞬态、复跑全绿）＋真栈两轮 W21 过——见 plan 纪行与提交链）；**主树独有**（切片无实体/wiki 模块与 wiki/graph 工具，不随带）。载体＝成对（本文件＋`../plans/2026-10-10-rag-entity-wiki-closure.md`）。来源：感知链矩阵（2026-10-09 两树现场核）＋余口三格交付（2026-10-10，`52dabf2b6`）后本日现场复核（全部锚点为实读行）。**终审 2026-10-10：勘误三处已写回（example 行号域 `:697-708`/`:712-718`、`builtins/__init__` 面描述、短路缝行号补齐 `:211-245`）＋精度两处（扩张邻居门同用打分尺 `:257`；直参未命中文案照抄现有样式）；example 外部消费者受害扫描已做（零钉工具名）。**

**本对一件事：把实体↔wiki 两侧最后两格补上——①`graph_search` 加实体名直参（wiki→实体从"语义走"变"按键跳"，对称余口批 ①）；②新增 `list_wiki_entries`（模型面枚举"库里有哪些百科条目"，对称文档侧的 `list_knowledge_documents`）。**

## 1. 现状与缺口（锚点，实读）

- **① wiki→实体仅"信息级"**：wiki 条目 title==实体名（余口批已可 `title` 直取），但展开邻域须再发 `graph_search(query=title)`——**语义路**：`_extract_query_entities` LLM 抽取（`graph_search_tool.py:211`）→ `kb_entities` 向量匹配＋分门槛 `ENTITY_MATCH_MIN_SCORE=0.3`（`:44`/`:240-243`）→ 扩张（`:257-266`，种子＝`entity_scores: dict[str,float]`）→ trace 复用该 map（`:332`）。@tool 壳只有 `query`/`hops` 两参（`:395-396`）——**无实体直参**。空态先例 `:221`（"未能从问题中识别出可检索的实体…"）。
- **② wiki 枚举缺**：模型面 wiki 工具只有 `wiki_search`（builtins 实核独苗）；"库里有哪些条目"不可枚举。文档侧对称先例＝`list_knowledge_documents`（`knowledge_documents_tool.py`：清单＋诚实计数消息「共 N 篇文档（就绪 x · …）。」）；数据口现成＝`wiki_store.list_entries(kb_id)`（`wiki/store.py:91-97`，按 updated_at desc、无筛选时全量）。
- **GraphStore 查名口**：`_entity_id(kb_id,name)`＝uuid5（`graph/store.py:29-30`）现成、**无按名 getter**；`list_entities` 全表扫描在（`:107-111`）。
- **注册面（新工具特有）**：rag 组工具由配置声明——`config.example.yaml:697-708`（三检索）＋`:712-718`（两文档工具），均 `group: rag`/`opt_in: true`；仓内 `config.yaml:70-83`（同款实名条目）＋`builtins/__init__.py`（导入 11 行＋`__all__` 两处，实读）；装配钉句 `test_rag_group_tools_are_exactly_the_three_retrieval_tools`＝**`<=` 子集断言＋排除核心工具**（`test_rag_agent_assembly.py:74-79` 实读：加第 6 个工具**不破**，可扩一行钉新工具）；example 外部消费者已扫（`test_local_registration_gate`/`test_config_version`/`test_doctor` 等零钉工具名 ⇒ 加条目安全）。
- **SOUL 落点**：语料边界节（`:13-21`，枚举先例在 `:17`）／`:34` 第三步（实体入口句）／`:9` 图谱路句；钉句族 `test_rag_agent_assembly.py:58-:71`（执行期复核）。

## 2. 方案

### 2.1 ① `graph_search` 加实体名直参（薄壳入口，对称余口批 ①）
- 新参 `entity: str | None`：提供时**短路"抽取＋向量匹配"两步**（LLM 调用一并省下），按键命中图节点（按 D3），以该实体作 hop-0 种子（score=1.0）**汇入现有扩张链**（扩张→候选→打分→caps→选证→引用，全部复用）；缺失＝如实空态（按 D2）。短路缝实读：抽取 `:211-219`／空态 `:221`／一次查询嵌入 `:224-226`（直取路改为嵌实体名）／匹配循环 `:232-243`／未命中空态 `:244-245`（消息样式照抄「知识图谱中未找到…」）。
- `query` 变可选（默认 None）；两者皆缺＝如实引导文案（两个参数名各出现一次；空串 entity 视同未提供）——与余口批 ① 同款口径。
- 口径：**精确串**；直取**绕 `ENTITY_MATCH_MIN_SCORE`**（精确名＝确定性；该门槛是向量路的防噪件，不适用于按键路）；trace（`seed_entities`/`expanded_nodes`）由现有 `_build_trace` 自然填（种子即实体）。
- **下游打分尺（精度口径，执行期钉）**：直取路省的是 **LLM 抽取**，不是嵌入——候选切片仍按余弦打分排序，尺＝**嵌入（实体名）一次**（与 query 路同尺；`_score_candidates` 需要 query 向量），**且扩张的邻居语义门同用该尺**（`query_vector=query_dense`，`:257`）。⇒ 直参路＝零 LLM，但含一次嵌入前向。

### 2.2 ② 新工具 `list_wiki_entries`（薄读枚举，对称 `list_knowledge_documents`）
- 读取＝`wiki_store.list_entries(kb_id)`（现成口，零查询改动）；item＝`title`/`status`/`updated_at`（title 可消费：`wiki_search(title=…)` 直取；status 如实；updated_at 信息级）；消息＝诚实计数（照文档先例样式：就绪/待更新）；空库＝如实空态（照文档先例「当前知识库中还没有…」句式）。
- 门控三分支（无绑定/无权限/跨库）与三路检索同款；有界按 D5。
- **注册面随批三件**：`builtins/__init__` 导出＋`config.example.yaml` 条目＋装配钉句扩一行（pin 新工具在 rag 组、且不在默认组）。
- **启用面（本批唯一配置面动作，明示为例外）**：t6 实例配置补一条（供 W21）；仓内 gitignored `config.yaml` 补一条（同 doc-tools 先例，否则本地栈不出现该工具）。

### 2.3 引导（按 D7）
- docstring 两处：`graph_search` 加 `entity` Args＋用法句；新工具 docstring 写用法与覆盖面（「只覆盖过门槛的头部实体；未命中不等于库中无此主题」）。
- SOUL：语料边界节加「有哪些百科条目」条（进 list 工具）＋`:34` 第三步扩 entity 直参半句。

### 2.4 不碰面
- 不碰：三路检索链本体（召回/重排/扩张/引用编号）、wiki 生成与脏标记、图谱抽取/合并、注入面、前端、recall-test 投影、切片树。

## 3. 决策点（已裁：2026-10-10 全甲——即各点首选项）

- **D1 ① 直参形态**：甲＝单实体 `entity`／乙＝`entities` 列表。
- **D2 ① 未命中行为**：甲＝如实空态（"图谱中没有名为「X」的实体…"）／乙＝回退整句语义（query 未传时无处回退，形态更绕）。
- **D3 ① 命中口径**：甲＝`_entity_id` 主键查（store 加一行 `get_entity` getter，对称余口批 ① 复用 `get_entry` 的形态）／乙＝`list_entities` 全表扫描精确匹配（零 store 改动）。
- **D4 ② 覆盖面**：甲＝只列生成条目（题目原意"哪些实体有 wiki"；manual 是用户自管、语义并入搜索即可）／乙＝条目＋人工卡片两族（带 `source_type`）。
- **D5 ② 有界**：甲＝全量照 `list_knowledge_documents` 先例＋诚实计数／乙＝cap N。
- **D6 ② 工具形态**：甲＝新独立工具（无天然宿主；注册面见 §2.2）／乙＝并入现有工具（契约会搅浑）。
- **D7 引导面**：甲＝docstring＋SOUL 同批／乙＝仅 docstring。

## 4. 验收（判据）
- 单测：① entity 命中（种子＝该实体、扩张与引用编号正常）／未命中空态／两者皆缺引导／门控三分支／（D3 甲）getter 主键查命中；② list 命中（清单＋计数）／空库／门控三分支／有界按 D5。
- 回归：既有 graph 用例（query 路）逐条不破；全量红集与基线逐行 diff 为空。
- 真栈小相（W21，t6 实例）：① 对话令模型 `graph_search(entity="证件")` 直取邻域；② 「知识库里有哪些百科条目？」→ `list_wiki_entries` 清单。
- 注册面核对：example 条目随批；t6 实例补条目（证据留档）；仓内 gitignored `config.yaml` 补启用条目（例外明示）。
- 树复核：切片零落差（不随带）。

## 5. 明确不做（另案）
- 多实体批量直参（D1 乙 若裁不做）；人工卡片的独立枚举工具；wiki 内容编辑族；实体→wiki 的反向其他面。
