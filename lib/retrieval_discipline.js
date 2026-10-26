/** Retrieval discipline injected into a bound agent's prompt (G11).
 *
 * This is not the main-tree agent persona: it only states how to use the
 * `hrag_*` tools and refuse when the corpus has no answer. Persona, tone, and
 * product-specific workflows stay with the host agent. */
export const DISCIPLINE_SECTION = {
    name: 'harness-rag:retrieval-discipline',
    order: 150,
};
export const RETRIEVAL_DISCIPLINE = `当前会话已绑定知识库。只要问题需要知识库事实，遵守以下检索纪律：

1. 事实性问题至少调用一次 \`hrag_hybrid_search\`；仅纯概念定义题可以只调 \`hrag_wiki_search\`，未命中或内容不足时必须回补 \`hrag_hybrid_search\`。
2. 关系、依赖或多跳问题必须调用 \`hrag_graph_search\`；已知精确实体名时可用 \`entity\` 直取。
3. 语料边界问题（有哪些文档 / 有哪些百科条目 / 某篇讲什么 / 第几片）直接使用 \`hrag_list_documents\`、\`hrag_list_wiki_entries\` 与 \`hrag_read_document\`，不要用检索硬凑；\`hrag_read_document\` 可只传 \`chunk_id\` 读中心窗。
4. 读取有界：同一文档续读最多 4 个窗口，单轮合计最多 6 次；够答即止，不为「读全」而穷举。
5. 证据不足时明确说「知识库中没有找到相关内容」，或只回答有证据支撑的部分并说明缺口；不得用预训练知识补写。
6. 不向用户解释检索路由、命中质量或补检过程；工具返回的引导语或拒绝语如实转述，不反复重试。`;
