// Browser half of dsh-harness-rag. Loaded by the Web Client through the
// deployment module factory format (see DSH cordis-plugin-development skill,
// templates/decoration/client.js). One self-contained plain-JS file by
// decision (T3 plan Task 0 ⑥): the host serves exactly one client.js per
// package and relative requires resolve against the platform module table.
window.__ModuleLoader__.load({
  id: 'dsh-harness-rag',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'harnessRag'
    // The host half's named route (src/kb_proxy.ts owns the other end).
    const PROXY_ROUTE = '/dsh-harness-rag/api'

    const zh = {
      'tab.title': '知识库',
      'tab.description': 'Harness RAG：三路检索、文档续读、知识库管理',
      'shell.loading': '正在加载知识库…',
      'shell.errorTitle': '知识库面板加载失败',
      'shell.retry': '重试',
      'shell.empty': '暂无知识库',
      'shell.emptyHint': '先在 DeerFlow 工作台创建知识库，再点「刷新」。',
      'shell.refresh': '刷新',
      'shell.upload': '上传',
      'upload.uploading': '上传中…',
      'upload.submittedUnit': '个文件已提交',
      'upload.failedUnit': '个文件失败',
      'reindex.button': '重建索引',
      'reindex.confirmTitle': '确认重建索引？',
      'reindex.confirmDescription': '将重新嵌入该知识库的全部向量（切片、实体、百科条目、人工卡片；不重解析源文件），期间检索结果可能不稳。',
      'reindex.confirmAction': '开始重建',
      'reindex.enqueued': '已开始重建索引',
      'reindex.alreadyRunning': '已有重建正在进行',
      'reindex.running': '重建中',
      'reindex.chunksWritten': '已写入向量',
      'reindex.lastSucceeded': '上次重建已完成。',
      'reindex.lastFailed': '上次重建失败，详见服务端日志。',
      'reindex.failed': '重建失败',
      'shell.kbLabel': '知识库',
      'shell.tab.docs': '文档',
      'shell.tab.recall': '召回',
      'shell.tab.vectors': '投影',
      'shell.tab.graph': '图谱',
      'shell.viewPending': '此分区实装中',
      'doc.loading': '正在加载文档…',
      'doc.empty': '暂无文档',
      'doc.listFailed': '文档列表加载失败',
      'doc.status.uploaded': '待解析',
      'doc.status.parsing': '解析中',
      'doc.status.chunking': '切片中',
      'doc.status.indexing': '索引中',
      'doc.status.ready': '就绪',
      'doc.status.failed': '失败',
      'doc.degraded': '部分降级',
      'doc.chunksUnit': '切片',
      'doc.retry': '重试',
      'doc.retrySubmitted': '已提交重试',
      'doc.degradedRetryHint': '部分产物未成功，可重试补齐',
      'doc.delete': '删除',
      'doc.deleteTitle': '删除文档？',
      'doc.deleteDescription': '将级联清理该文档的切片、向量与图谱贡献，且不可恢复。',
      'doc.deleteFailed': '删除文档失败',
      'doc.cancel': '取消',
      'doc.confirmDelete': '确认删除',
      'chunk.loading': '加载中…',
      'chunk.empty': '该文档还没有切片',
      'chunk.unit': '个切片',
      'chunk.page': '页码',
      'chunk.loadMore': '加载更多',
      'chunk.delete': '删除',
      'chunk.cancel': '取消',
      'chunk.drawerTitle': '切片预览',
      'chunk.close': '关闭',
      'chunk.deletePreviewTitle': '删除预览',
      'chunk.orphanedEntities': '将失格删除的实体',
      'chunk.affectedEntities': '将受影响的实体',
      'chunk.relationDeletions': '将删除的关系数',
      'chunk.deleteWarning': '删除不可恢复',
      'chunk.confirmDelete': '确认删除',
      'chunk.deleteSuccess': '切片已删除',
      'chunk.deleteFailed': '删除失败',
      'chunk.timecode': '时间码',
      'recall.placeholder': '输入测试问题…',
      'recall.run': '开始检索',
      'recall.running': '检索中…',
      'recall.topK': '每通道条数',
      'recall.path.vector': '向量通道',
      'recall.path.graph': '图谱通道',
      'recall.path.wiki': '百科通道',
      'recall.empty': '输入问题后开始检索，对比三通道命中与得分',
      'recall.failed': '检索测试失败',
      'recall.mismatch': '库向量空间与当前嵌入配置不一致，检索质量不保证',
      'recall.viewInVectorSpace': '在向量空间查看',
      'vec.loading': '计算投影中…',
      'vec.empty': '该知识库还没有向量数据——先上传文档',
      'vec.loadFailed': '投影加载失败',
      'vec.chips.chunks': '切片',
      'vec.chips.entities': '实体',
      'vec.chips.wiki': '百科',
      'vec.chips.cards': '条目',
      'vec.algoLabel': '算法',
      'vec.recompute': '重新计算',
      'vec.dimsLabel': '维度',
      'vec.sampled': '已抽样',
      'vec.pointsUnit': '点',
      'vec.overlayPcaOnly': '检索叠加仅支持 PCA 投影——请切回 PCA 后重试',
      'vec.overlayStale': '投影已更新，检索叠加已失效——请重新触发检索',
      'vec.overlayFailed': '检索叠加失败——请重试',
      'vec.hitsPrefix': '命中',
      'vec.clearOverlay': '清除叠加',
      'recall.viewInGraphSpace': '在知识图谱查看',
      'graph.loading': '正在加载知识图谱…',
      'graph.loadFailed': '知识图谱加载失败——请稍后重试',
      'graph.empty': '暂无可视化的实体——索引文档后自动构建',
      'graph.entitiesUnit': '实体',
      'graph.relationsUnit': '关系',
      'graph.communitiesUnit': '社区',
      'graph.mentionsPre': '被',
      'graph.mentionsPost': '个切片提及',
      'graph.relatedChunks': '关联切片',
      'graph.entityDescription': '描述',
      'graph.entityNoDescription': '暂无描述',
      'graph.entityNoChunks': '暂无关联切片',
      'graph.unknownDoc': '（文档已删除）',
      'graph.searchEntities': '搜索实体',
      'graph.searchNoMatch': '未找到匹配的实体',
      'graph.colorByType': '按类型',
      'graph.colorByCommunity': '按社区',
      'graph.communityBadgePre': '社区 #',
      'graph.slicePosPre': '切片 #',
      'graph.overlaySeeds': '种子',
      'graph.overlayExpanded': '扩展',
      'graph.overlayEvidence': '证据',
      'graph.overlayStale': '图谱内容已更新，检索路径高亮已清除',
      'graph.clearOverlay': '清除路径高亮',
      'graph.guideHint': '实体过多，已隐藏细节——放大查看，或点开实体查看其邻居',
      'graph.focusHidden': '实体过多，该实体未在当前层显示',
      'graph.neighborhoodTitle': '局部图',
      'graph.hop1': '1 跳',
      'graph.hop2': '2 跳',
    }
    const en = {
      'tab.title': 'Knowledge Base',
      'tab.description': 'Harness RAG: three-path retrieval, document continuation, knowledge-base management',
      'shell.loading': 'Loading knowledge bases…',
      'shell.errorTitle': 'The knowledge panel failed to load',
      'shell.retry': 'Retry',
      'shell.empty': 'No knowledge bases yet',
      'shell.emptyHint': 'Create one in the DeerFlow workbench, then hit Refresh.',
      'shell.refresh': 'Refresh',
      'shell.upload': 'Upload',
      'upload.uploading': 'Uploading…',
      'upload.submittedUnit': 'file(s) submitted',
      'upload.failedUnit': 'file(s) failed',
      'reindex.button': 'Rebuild index',
      'reindex.confirmTitle': 'Rebuild the index?',
      'reindex.confirmDescription': 'Every vector in this library will be re-embedded (chunks, entities, wiki entries and manual cards; source files are not re-parsed), and retrieval may be unstable while it runs.',
      'reindex.confirmAction': 'Start rebuild',
      'reindex.enqueued': 'Rebuild started',
      'reindex.alreadyRunning': 'A rebuild is already running',
      'reindex.running': 'Rebuilding',
      'reindex.chunksWritten': 'vectors written',
      'reindex.lastSucceeded': 'Last rebuild finished.',
      'reindex.lastFailed': 'Last rebuild failed — see the server logs.',
      'reindex.failed': 'Rebuild failed',
      'shell.kbLabel': 'Knowledge base',
      'shell.tab.docs': 'Documents',
      'shell.tab.recall': 'Recall',
      'shell.tab.vectors': 'Projection',
      'shell.tab.graph': 'Graph',
      'shell.viewPending': 'This section is under construction',
      'doc.loading': 'Loading documents…',
      'doc.empty': 'No documents yet',
      'doc.listFailed': 'Failed to load documents',
      'doc.status.uploaded': 'Uploaded',
      'doc.status.parsing': 'Parsing',
      'doc.status.chunking': 'Chunking',
      'doc.status.indexing': 'Indexing',
      'doc.status.ready': 'Ready',
      'doc.status.failed': 'Failed',
      'doc.degraded': 'Degraded',
      'doc.chunksUnit': 'chunks',
      'doc.retry': 'Retry',
      'doc.retrySubmitted': 'Retry submitted',
      'doc.degradedRetryHint': 'Some outputs did not succeed — retry to complete them',
      'doc.delete': 'Delete',
      'doc.deleteTitle': 'Delete this document?',
      'doc.deleteDescription': 'Its chunks, vectors and graph contributions will be cascade-deleted. This cannot be undone.',
      'doc.deleteFailed': 'Failed to delete the document',
      'doc.cancel': 'Cancel',
      'doc.confirmDelete': 'Confirm delete',
      'chunk.loading': 'Loading…',
      'chunk.empty': 'No chunks for this document yet',
      'chunk.unit': 'chunks',
      'chunk.page': 'Page',
      'chunk.loadMore': 'Load more',
      'chunk.delete': 'Delete',
      'chunk.cancel': 'Cancel',
      'chunk.drawerTitle': 'Chunk preview',
      'chunk.close': 'Close',
      'chunk.deletePreviewTitle': 'Delete Preview',
      'chunk.orphanedEntities': 'Entities to be orphaned',
      'chunk.affectedEntities': 'Entities to be affected',
      'chunk.relationDeletions': 'Relations to be deleted',
      'chunk.deleteWarning': 'Deletion is irreversible',
      'chunk.confirmDelete': 'Confirm Delete',
      'chunk.deleteSuccess': 'Chunk deleted',
      'chunk.deleteFailed': 'Failed to delete chunk',
      'chunk.timecode': 'Timecode',
      'recall.placeholder': 'Enter a test query…',
      'recall.run': 'Run',
      'recall.running': 'Running…',
      'recall.topK': 'Hits per path',
      'recall.path.vector': 'Vector',
      'recall.path.graph': 'Graph',
      'recall.path.wiki': 'Wiki',
      'recall.empty': 'Run a query to compare hits and scores across the three paths',
      'recall.failed': 'Recall test failed',
      'recall.mismatch': "This library's vectors do not match the current embedding config; retrieval quality is not guaranteed",
      'recall.viewInVectorSpace': 'View in vector space',
      'vec.loading': 'Computing projection…',
      'vec.empty': 'No vectors in this knowledge base yet — upload documents first',
      'vec.loadFailed': 'Failed to load projection',
      'vec.chips.chunks': 'Chunks',
      'vec.chips.entities': 'Entities',
      'vec.chips.wiki': 'Wiki',
      'vec.chips.cards': 'Entries',
      'vec.algoLabel': 'Algorithm',
      'vec.recompute': 'Recompute',
      'vec.dimsLabel': 'Dimensions',
      'vec.sampled': 'Sampled',
      'vec.pointsUnit': 'points',
      'vec.overlayPcaOnly': 'Retrieval overlays need a PCA projection — switch back to PCA and retry',
      'vec.overlayStale': 'The projection changed; the overlay is stale — rerun the query',
      'vec.overlayFailed': 'Overlay failed — please retry',
      'vec.hitsPrefix': 'Hits',
      'vec.clearOverlay': 'Clear overlay',
      'recall.viewInGraphSpace': 'View in the knowledge graph',
      'graph.loading': 'Loading the knowledge graph…',
      'graph.loadFailed': 'Failed to load the knowledge graph — please try again',
      'graph.empty': 'Nothing to visualize yet — entities appear after documents are indexed',
      'graph.entitiesUnit': 'entities',
      'graph.relationsUnit': 'relations',
      'graph.communitiesUnit': 'communities',
      'graph.mentionsPre': 'Mentioned by',
      'graph.mentionsPost': 'chunks',
      'graph.relatedChunks': 'Related chunks',
      'graph.entityDescription': 'Description',
      'graph.entityNoDescription': 'No description yet',
      'graph.entityNoChunks': 'No linked chunks',
      'graph.unknownDoc': '(document deleted)',
      'graph.searchEntities': 'Search entities',
      'graph.searchNoMatch': 'No matching entity',
      'graph.colorByType': 'By type',
      'graph.colorByCommunity': 'By community',
      'graph.communityBadgePre': 'Community #',
      'graph.slicePosPre': 'Chunk #',
      'graph.overlaySeeds': 'Seeds',
      'graph.overlayExpanded': 'Expanded',
      'graph.overlayEvidence': 'Evidence',
      'graph.overlayStale': 'The graph changed — the retrieval path highlight was cleared',
      'graph.clearOverlay': 'Clear path highlight',
      'graph.guideHint': 'Too many entities — details hidden; zoom in, or open an entity for its neighborhood',
      'graph.focusHidden': 'Too many entities — this one is hidden at the current detail level',
      'graph.neighborhoodTitle': 'Neighborhood',
      'graph.hop1': '1 hop',
      'graph.hop2': '2 hops',
    }

    /** Panel data seam: every panel request is a POST of JSON parameters to
     * the host half's named route; failures arrive as a JSON error envelope
     * carrying the service's own status and detail. */
    async function callOp(op, params) {
      let response
      try {
        response = await fetch(PROXY_ROUTE + '/' + op, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params || {}),
        })
      } catch (cause) {
        const error = new Error(String(cause))
        error.info = { kind: 'bridge', detail: String(cause) }
        throw error
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const info =
          (payload && payload.error) || { kind: 'http', status: response.status, detail: 'HTTP ' + response.status }
        const error = new Error(info.detail || 'HTTP ' + response.status)
        error.info = info
        throw error
      }
      return payload
    }

    /** Multipart upload: the file posts raw to the host route (the JSON op
     * envelope does not fit file payloads); the host streams the body through. */
    async function callUpload(kbId, file) {
      const form = new FormData()
      form.append('file', file, file.name)
      let response
      try {
        response = await fetch(PROXY_ROUTE + '/uploadDocument?kb_id=' + encodeURIComponent(kbId), {
          method: 'POST',
          body: form,
        })
      } catch (cause) {
        const error = new Error(String(cause))
        error.info = { kind: 'bridge', detail: String(cause) }
        throw error
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const info =
          (payload && payload.error) || { kind: 'http', status: response.status, detail: 'HTTP ' + response.status }
        const error = new Error(info.detail || 'HTTP ' + response.status)
        error.info = info
        throw error
      }
      return payload
    }

    const SECTIONS = [
      { id: 'docs', label: 'shell.tab.docs' },
      { id: 'recall', label: 'shell.tab.recall' },
      { id: 'vectors', label: 'shell.tab.vectors' },
      { id: 'graph', label: 'shell.tab.graph' },
    ]

    /** Component-owned styles (removed when the component unmounts), built
     * from host theme tokens only — the plugin styling contract. Rules and
     * measurements follow the host primitives (SegmentedTabs / Input /
     * Button); the `hrag-` prefix keeps copied classes namespaced. */
    function Styles() {
      return h(
        'style',
        null,
        [
          '.hrag-shell { display: flex; flex-direction: column; gap: 10px; padding: 12px; min-width: 0; box-sizing: border-box; min-height: 100%; }',
          '.hrag-bar { display: flex; align-items: center; gap: 8px; min-width: 0; }',
          ".hrag-bar select { flex: 1; min-width: 0; height: 32px; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 14px; font-family: inherit; }",
          '.hrag-bar select:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }',
          '.hrag-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; padding: 0 12px; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font-size: 14px; font-family: inherit; cursor: pointer; white-space: nowrap; }',
          '.hrag-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-btn:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }',
          '.hrag-btn:disabled { cursor: not-allowed; opacity: 0.4; }',
          '.hrag-btn:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); }',
          '.hrag-btn-outline { border: 0.5px solid var(--dsw-alias-border-l3); }',
          '.hrag-tabs { display: grid; grid-template-columns: repeat(var(--hrag-tabs, 3), 1fr); gap: 0; padding: 4px; border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-module-platform); }',
          ".hrag-tab { height: 34px; padding: 0 12px; border: none; background: transparent; border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-secondary); font-size: 14px; font-family: inherit; cursor: pointer; transition: color 180ms ease; }",
          ".hrag-tab:hover, .hrag-tab[aria-selected='true'] { color: var(--dsw-alias-label-primary); }",
          ".hrag-tab[aria-selected='true'] { font-weight: 600; }",
          '.hrag-tab:focus-visible { outline: none; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }',
          '.hrag-pane { padding: 8px 2px; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; }',
          '.hrag-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 12px; text-align: center; }',
          '.hrag-state-title { color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; }',
          '.hrag-state-detail { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; word-break: break-word; }',
          '.hrag-state-error .hrag-state-title { color: var(--dsw-alias-label-error); }',
          '.hrag-docs { display: flex; flex-direction: column; }',
          '.hrag-docsum { padding: 2px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          '.hrag-docrow { display: flex; flex-direction: column; gap: 4px; padding: 8px 2px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); min-width: 0; }',
          '.hrag-docrow:last-child { border-bottom: none; }',
          '.hrag-docrow-main { display: flex; align-items: center; gap: 8px; min-width: 0; cursor: pointer; }',
          '.hrag-docrow-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; }',
          '.hrag-docrow-actions { display: flex; gap: 4px; flex-shrink: 0; }',
          '.hrag-btn-sm { height: 26px; padding: 0 8px; font-size: 12px; border-radius: var(--dsw-radius-sm); }',
          '.hrag-docrow-meta { display: flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          '.hrag-docrow-status-failed { color: var(--dsw-alias-label-error); }',
          '.hrag-notice { padding: 6px 2px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; word-break: break-word; }',
          '.hrag-notice-error { color: var(--dsw-alias-label-error); }',
          '.hrag-reindex-status { padding: 0 2px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          '.hrag-btn-icon { width: 32px; padding: 0; }',
          '.hrag-vec-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-vec { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-vec-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }',
          '.hrag-chip { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: transparent; cursor: pointer; }',
          '.hrag-chip:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-chip:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); }',
          '.hrag-chip-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }',
          '.hrag-vec-sampled { color: var(--dsw-alias-label-tertiary); font-size: 11px; }',
          '.hrag-vec-bar-right { display: flex; align-items: center; gap: 6px; margin-left: auto; }',
          '.hrag-seg { display: inline-flex; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); overflow: hidden; }',
          '.hrag-seg button { height: 26px; padding: 0 8px; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; font-family: inherit; cursor: pointer; }',
          ".hrag-seg button[aria-pressed='true'] { background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); font-weight: 600; }",
          '.hrag-vec-algo { height: 26px; padding: 0 6px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; }',
          '.hrag-vec-body { position: relative; display: flex; flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-vec-canvas { position: relative; flex: 1; min-height: 180px; overflow: hidden; }',
          '.hrag-vec-canvas canvas { display: block; width: 100%; height: 100%; }',
          '.hrag-vec-tip { position: absolute; z-index: 20; max-width: 210px; padding: 5px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12); color: var(--dsw-alias-label-primary); font-size: 11px; line-height: 1.5; white-space: normal; pointer-events: none; }',
          '.hrag-vec-tip-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }',
          '.hrag-vec-tip-label { font-weight: 500; }',
          '.hrag-vec-tip-preview { display: block; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-vec-legend { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); z-index: 5; display: inline-flex; flex-wrap: nowrap; max-width: 94%; overflow: hidden; gap: 8px; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 68%, transparent); backdrop-filter: blur(4px); }',
          '.hrag-vec-legend-item { display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11px; font-family: inherit; cursor: pointer; }',
          '.hrag-vec-legend-item:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-vec-legend-off { opacity: 0.45; }',
          '.hrag-vec-overlay-badge { position: absolute; top: 6px; left: 6px; z-index: 10; display: inline-flex; align-items: center; gap: 6px; max-width: 82%; padding: 3px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-size: 11px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }',
          '.hrag-vec-overlay-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }',
          '.hrag-vec-overlay-hits { flex-shrink: 0; }',
          '.hrag-vec-overlay-close { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex-shrink: 0; padding: 0; border: none; border-radius: 50%; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 1; cursor: pointer; }',
          '.hrag-vec-overlay-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-spin { animation: hrag-rotate 900ms linear infinite; }',
          '@keyframes hrag-rotate { to { transform: rotate(360deg); } }',
          '@media (prefers-reduced-motion: reduce) { .hrag-spin { animation-duration: 1ms; } }',
          '.hrag-graph-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-graph { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-graph-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }',
          '.hrag-graph-search { flex: 1; min-width: 120px; display: flex; }',
          '.hrag-graph-search .hrag-input { width: 100%; height: 26px; font-size: 12px; }',
          '.hrag-graph-body { position: relative; display: flex; flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-graph-canvas { position: relative; flex: 1; min-height: 220px; overflow: hidden; }',
          '.hrag-graph-canvas canvas { display: block; width: 100%; height: 100%; }',
          '.hrag-graph-stats { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); z-index: 5; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 68%, transparent); backdrop-filter: blur(4px); color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap; }',
          '.hrag-graph-guide { position: absolute; top: 6px; right: 6px; z-index: 5; max-width: 55%; padding: 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 78%, transparent); backdrop-filter: blur(4px); border: 1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 20%, transparent); color: var(--dsw-alias-label-tertiary); font-size: 11px; }',
          '.hrag-gcard-graph { height: 220px; display: flex; flex-direction: column; }',
          '.hrag-graph-drawer .hrag-drawer-overlay { z-index: 56; }',
          '.hrag-graph-drawer .hrag-drawer { z-index: 57; }',
          '.hrag-graph-drawer-body { display: flex; flex-direction: column; gap: 10px; }',
          '.hrag-gchips { display: flex; flex-wrap: wrap; gap: 6px; }',
          '.hrag-gchip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; color: var(--dsw-alias-label-secondary); font-size: 11px; }',
          '.hrag-gcard { border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); overflow: hidden; }',
          '.hrag-gcard-head { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); font-size: 12px; }',
          '.hrag-gcard-count { margin-left: auto; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }',
          '.hrag-gcard-iconbtn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-left: auto; padding: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }',
          '.hrag-gcard-iconbtn:hover { color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }',
          '.hrag-gcard-body { padding: 8px 10px; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }',
          '.hrag-gcard-empty { color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-gchunk-list { display: flex; flex-direction: column; padding: 3px; }',
          '.hrag-gchunkrow { display: flex; width: 100%; align-items: center; gap: 6px; padding: 5px 7px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-gchunkrow:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-gchunkrow:disabled { cursor: default; opacity: 0.6; }',
          '.hrag-gchunkrow-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }',
          '.hrag-gchunkrow-pos { flex-shrink: 0; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }',
          '.hrag-gchunkrow-chevron { flex-shrink: 0; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-overlay { position: absolute; inset: 0; z-index: 80; display: flex; align-items: center; justify-content: center; padding: 16px; background: var(--dsw-alias-bg-mask-1); }',
          '.hrag-dialog { width: min(340px, 100%); display: flex; flex-direction: column; gap: 10px; padding: 16px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-1); box-shadow: var(--dsw-elevation-panel); }',
          '.hrag-dialog-wide { width: min(480px, 100%); }',
          '.hrag-dialog-title { color: var(--dsw-alias-label-primary); font-size: 14px; font-weight: 600; line-height: 22px; }',
          '.hrag-dialog-body { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }',
          '.hrag-dialog-error { color: var(--dsw-alias-label-error); font-size: 12px; line-height: 18px; word-break: break-word; }',
          '.hrag-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }',
          '.hrag-btn-danger { background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); }',
          '.hrag-btn-danger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger); }',
          '.hrag-chunkrow { display: flex; flex-direction: column; gap: 4px; padding: 8px 2px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); min-width: 0; }',
          '.hrag-chunkrow:last-child { border-bottom: none; }',
          '.hrag-chunkrow-top { display: flex; align-items: center; gap: 6px; min-width: 0; }',
          '.hrag-chunkrow-idx { font-family: ui-monospace, monospace; color: var(--dsw-alias-label-tertiary); font-size: 12px; flex-shrink: 0; }',
          '.hrag-chunkrow-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-chunkrow-text { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; white-space: pre-wrap; word-break: break-word; }',
          '.hrag-chunkrow-flash { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-chip { flex-shrink: 0; padding: 0 6px; height: 18px; display: inline-flex; align-items: center; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap; }',
          '.hrag-dialog-section { display: flex; flex-direction: column; gap: 4px; }',
          '.hrag-dialog-section-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }',
          '.hrag-dialog-section-title-error { color: var(--dsw-alias-label-error); }',
          '.hrag-dialog-section-title-warn { color: var(--dsw-alias-state-warn-primary); }',
          '.hrag-dialog-badges { display: flex; flex-wrap: wrap; gap: 4px; }',
          '.hrag-badge { padding: 0 6px; height: 20px; display: inline-flex; align-items: center; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); font-size: 11px; color: var(--dsw-alias-label-secondary); }',
          '.hrag-badge-error { border-color: var(--dsw-alias-label-error); color: var(--dsw-alias-label-error); }',
          '.hrag-badge-warn { border-color: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-state-warn-primary); }',
          '.hrag-recall-bar { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 2px; }',
          '.hrag-input { flex: 1; min-width: 0; height: 28px; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; }',
          '.hrag-input:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }',
          '.hrag-input-num { flex: none; width: 56px; }',
          '.hrag-recall-section { display: flex; flex-direction: column; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); min-width: 0; overflow: hidden; }',
          '.hrag-recall-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px; min-width: 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }',
          '.hrag-recall-name { color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 600; flex-shrink: 0; }',
          '.hrag-recall-meta { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }',
          '.hrag-recall-rows { display: flex; flex-direction: column; padding: 4px; }',
          '.hrag-recall-empty { padding: 12px; text-align: center; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-hitrow { display: flex; align-items: center; gap: 6px; width: 100%; padding: 4px 6px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; text-align: left; cursor: pointer; font-family: inherit; min-width: 0; }',
          '.hrag-hitrow:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-hitrow-static { cursor: default; }',
          '.hrag-hitrow-static:hover { background: transparent; }',
          '.hrag-hitrank { flex-shrink: 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; }',
          '.hrag-hitdoc { flex-shrink: 0; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 12px; }',
          '.hrag-hitlead { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 11px; }',
          '.hrag-hitpage { flex-shrink: 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; }',
          '.hrag-hitscore { flex-shrink: 0; margin-left: auto; color: var(--dsw-alias-label-tertiary); font-size: 11px; font-family: ui-monospace, monospace; }',
          '.hrag-recall-sections { display: flex; flex-direction: column; gap: 8px; }',
          '.hrag-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 100%; }',
          '@keyframes hrag-fade-in { from { opacity: 0; } to { opacity: 1; } }',
          '@keyframes hrag-slide-in { from { transform: translateX(24px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }',
          '.hrag-drawer-overlay { position: absolute; inset: 0; z-index: 70; background: var(--dsw-alias-bg-mask-1); animation: hrag-fade-in 160ms ease; }',
          '.hrag-drawer { position: absolute; top: 0; right: 0; bottom: 0; z-index: 71; width: min(576px, calc(100% - 48px)); display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); border-left: 0.5px solid var(--dsw-alias-border-l3); box-shadow: var(--dsw-elevation-panel); animation: hrag-slide-in 160ms ease; }',
          '@media (prefers-reduced-motion: reduce) { .hrag-drawer, .hrag-drawer-overlay { animation: none; } }',
          '.hrag-drawer-close { flex-shrink: 0; width: 26px; height: 26px; padding: 0; font-size: 13px; line-height: 1; }',
          '.hrag-drawer-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); flex-shrink: 0; }',
          '.hrag-drawer-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; }',
          '.hrag-drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 12px; }',
        ].join('\n'),
      )
    }

    /** Failure display: the service's own detail, else the Error text. */
    function errorDetail(error) {
      return (error && error.info && error.info.detail) || String(error)
    }

    const DOC_STATUS_KEYS = {
      uploaded: 'doc.status.uploaded',
      parsing: 'doc.status.parsing',
      chunking: 'doc.status.chunking',
      indexing: 'doc.status.indexing',
      ready: 'doc.status.ready',
      failed: 'doc.status.failed',
    }

    /** Mirrors the backend's has_degraded_leg: ready + any leg marked
     * degraded — the workbench's document-level retry gate. */
    function isDegraded(doc) {
      return doc.status === 'ready' && Object.values(doc.path_status || {}).some((state) => state === 'degraded')
    }

    /** Hand-built confirm dialog (the plugin styling contract forbids Harness
     * Client imports): Escape closes, cancel holds the initial focus, and the
     * caller passes the cascade copy. */
    function ConfirmDialog({ t, title, description, error, busy, onCancel, onConfirm, cancelKey, confirmKey }) {
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape' && !busy) onCancel()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [busy, onCancel])
      return h(
        'div',
        {
          className: 'hrag-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onCancel()
          },
        },
        h(
          'div',
          { className: 'hrag-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
          h('div', { className: 'hrag-dialog-title' }, title),
          description ? h('div', { className: 'hrag-dialog-body' }, description) : null,
          error ? h('div', { className: 'hrag-dialog-error' }, error) : null,
          h(
            'div',
            { className: 'hrag-dialog-actions' },
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: busy, autoFocus: true, onClick: onCancel },
              t(cancelKey || 'doc.cancel'),
            ),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-danger', disabled: busy, onClick: onConfirm },
              t(confirmKey || 'doc.confirmDelete'),
            ),
          ),
        ),
      )
    }

    /** Delete-preview dialog (chunk cascade): orphaned / affected entities and
     * the relation-deletion count, shown before the destructive confirm.
     * Mirrors the workbench dialog's sections and copy; empty sections drop. */
    function PreviewDialog({ t, preview, error, busy, onCancel, onConfirm }) {
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape' && !busy) onCancel()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [busy, onCancel])
      const orphaned = preview && Array.isArray(preview.orphaned_entities) ? preview.orphaned_entities : []
      const affected = preview && Array.isArray(preview.affected_entities) ? preview.affected_entities : []
      const relations = preview && Array.isArray(preview.relation_deletions) ? preview.relation_deletions : []
      const entitySection = (labelKey, list, badgeClass, titleClass) =>
        list.length > 0
          ? h(
              'div',
              { className: 'hrag-dialog-section' },
              h(
                'div',
                { className: 'hrag-dialog-section-title ' + titleClass },
                t(labelKey) + ' (' + String(list.length) + ')',
              ),
              h(
                'div',
                { className: 'hrag-dialog-badges' },
                list.map((name) => h('span', { className: 'hrag-badge ' + badgeClass, key: String(name) }, String(name))),
              ),
            )
          : null
      return h(
        'div',
        {
          className: 'hrag-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onCancel()
          },
        },
        h(
          'div',
          {
            className: 'hrag-dialog hrag-dialog-wide',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('chunk.deletePreviewTitle'),
          },
          h('div', { className: 'hrag-dialog-title' }, '⚠ ' + t('chunk.deletePreviewTitle')),
          h('div', { className: 'hrag-dialog-body' }, t('chunk.deleteWarning')),
          entitySection('chunk.orphanedEntities', orphaned, 'hrag-badge-error', 'hrag-dialog-section-title-error'),
          entitySection('chunk.affectedEntities', affected, 'hrag-badge-warn', 'hrag-dialog-section-title-warn'),
          relations.length > 0
            ? h(
                'div',
                { className: 'hrag-dialog-section-title' },
                t('chunk.relationDeletions') + ': ' + String(relations.length),
              )
            : null,
          error ? h('div', { className: 'hrag-dialog-error' }, error) : null,
          h(
            'div',
            { className: 'hrag-dialog-actions' },
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: busy, autoFocus: true, onClick: onCancel },
              t('chunk.cancel'),
            ),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-danger', disabled: busy || !preview, onClick: onConfirm },
              t('chunk.confirmDelete'),
            ),
          ),
        ),
      )
    }

    const CHUNK_PAGE_SIZE = 20
    const CHUNK_FULL_LOAD_CAP = 300
    /** Poll cadence for the documents list and the reindex status — the
     * workbench's library pipelines share this 3s cadence. */
    const PIPELINE_POLL_MS = 3000
    /** Bar-notice auto-dismiss (toast semantics in the workbench: brief
     * acknowledgment; the durable truth lives in the list and status line).
     * Errors get a longer read. */
    const NOTICE_DISMISS_MS = 4000
    const NOTICE_DISMISS_ERROR_MS = 8000

    // ── 向量投影（Task 6）────────────────────────────────────────────────────
    // 四类固定色（Material 400，工作台 2026-08-17 用户拍板）＋形状双编码；
    // 尺寸按类别固定梯度（点越少越大）、透明度按点数排名四档（点最多的最透）。
    const VEC_COLLECTIONS = ['chunks', 'entities', 'wiki', 'cards']
    const VEC_SOURCE_OF_COLLECTION = { chunks: 'chunk', entities: 'entity', wiki: 'wiki', cards: 'card' }
    const VEC_COLLECTION_OF_SOURCE = { chunk: 'chunks', entity: 'entities', wiki: 'wiki', card: 'cards' }
    const VEC_SOURCE_TYPES = ['chunk', 'entity', 'wiki', 'card']
    const VEC_COLORS = { chunk: '#42a5f5', entity: '#66bb6a', wiki: '#ab47bc', card: '#ff7043' }
    const VEC_SHAPES = { chunk: 'circle', entity: 'triangle', wiki: 'rect', card: 'diamond' }
    const VEC_SIZES = { chunk: 8, entity: 9, wiki: 10, card: 14 }
    const VEC_RANK_OPACITIES = [0.45, 0.5, 0.6, 0.7]
    const VEC_HALO_BOOST = 1.2
    const VEC_DIMMED_OPACITY = 0.12
    const VEC_OVERLAY_COLOR = '#f5222d'
    const VEC_SAMPLE_SIZE = 5000
    const VEC_TOOLTIP_MAX = 20
    // 3D 默认视角与投影（照工作台实测反推）：方位≈42°、仰角≈28.5°（地面菱形
    // 两缘近对称）；轻度透视（前缘/后缘≈1.24）；盒占 min 边 0.74（留透视近角余量）。
    const VEC_VIEW_YAW = 0.74
    const VEC_VIEW_PITCH = 0.5
    const VEC_SIDE_RATIO = 0.72
    const VEC_PERSPECTIVE_D = 8

    // ── 知识图谱（Task 7）────────────────────────────────────────────────────
    // 20 色板/尺寸/描边语汇照工作台 graph-utils（语义对齐，代码新写）。
    const GRAPH_PALETTE = [
      '#42a5f5', '#66bb6a', '#ffa726', '#ab47bc', '#26c6da',
      '#ec407a', '#9ccc65', '#ff7043', '#7e57c2', '#8d6e63',
      '#e57373', '#5c6bc0', '#29b6f6', '#26a69a', '#d4e157',
      '#78909c', '#ba68c8', '#4db6ac', '#aed581', '#ffb74d',
    ]
    const GRAPH_HIT_BORDER = '#f5222d'
    const GRAPH_EXPANSION_BORDER = '#ffd700'
    const GRAPH_HOVER_BORDER = '#1677ff'
    const GRAPH_SEED_SIZE_BOOST = 1.35
    const GRAPH_LABEL_HIDE_BELOW = 0.6
    const GRAPH_LABEL_FULL_ABOVE = 0.9
    const GRAPH_IMPORTANT_MENTION = 2
    const GRAPH_MIN_SCALE = 0.3
    const GRAPH_MAX_SCALE = 3
    const GRAPH_FOCUS_ZOOM = 1.6
    // 力参数（2026-10-13 二轮：逐公式对齐工作台 echarts forceHelper——layout:'force'
    // 的真身）。旧自研 FR（k²/d 斥力 + 无理想长弹簧 + 速度域微重力）把弱连接组件甩到
    // 画外、缩到底仍看不全（验收实测）；echarts 口径 = 位置域三力 + Verlet 积分 +
    // friction 冷却，重力强两个数量级 → 紧凑圆盘。
    // 理想边长：工作台 edgeLength [40,120]，边无 value → linearMap 中值 80。
    const GRAPH_EDGE_LENGTH = 80
    const GRAPH_REPULSION = 120
    const GRAPH_GRAVITY = 0.1
    // 冷却（照 forceHelper）：0.6 起步、每步 ×0.992、< 0.01 停（约 511 步）。
    const GRAPH_FRICTION = 0.6
    const GRAPH_FRICTION_DECAY = 0.992
    const GRAPH_FRICTION_MIN = 0.01

    // ── LOD 分层渲染（2026-10-13 点名补；照工作台 Task 7b 口径）──────────────
    // 缩放 = 地图层级三层（<0.6 hub 枢纽层／0.6–0.9 重要层／>0.9 全量层），
    // 全靠滚轮跨档；>2000 实体熔断 guide 档（右上角引导提示）。
    /** 激活门控：总数 ≤ 500 时 LOD 不激活（小库全量渲染零行为变化）。 */
    const GRAPH_LOD_MIN_NODES = 500
    /** zoom < 0.6 → hub（每社区 Top3 枢纽）。 */
    const GRAPH_LOD_ZOOM_HUB_BELOW = 0.6
    /** zoom ≤ 0.9 → all-important（mention≥2）；> 0.9 → all-full / guide。 */
    const GRAPH_LOD_ZOOM_FULL_ABOVE = 0.9
    /** all-full 硬上限：超出熔断 guide（不硬渲全量，防万级实体卡死）。 */
    const GRAPH_LOD_FULL_HARD_LIMIT = 2000
    /** hub 层每社区入选的枢纽数（Top N，与预算共同截断）。 */
    const GRAPH_LOD_HUB_TOP_PER_COMMUNITY = 3
    /** hub 层节点预算（微社区图上 Top3×社区数会爆；按社区规模降序累计截断）。 */
    const GRAPH_LOD_HUB_NODE_BUDGET = 200

    /** 缩放 + 总数 → 渲染档位（照工作台 renderTierForZoom）。边界：0.6 入
        all-important，> 0.9 才入 all-full；all-full 超 2000 熔断 guide。 */
    function graphRenderTierForZoom(zoom, totalNodes) {
      if (totalNodes <= GRAPH_LOD_MIN_NODES) return 'full'
      if (zoom < GRAPH_LOD_ZOOM_HUB_BELOW) return 'hub'
      if (zoom <= GRAPH_LOD_ZOOM_FULL_ABOVE) return 'all-important'
      return totalNodes <= GRAPH_LOD_FULL_HARD_LIMIT ? 'all-full' : 'guide'
    }

    /** 初始 zoom（照工作台 initialZoomForGraph）：大库从最缩略档（0.3 → hub）
        起步，小库恒 1（full + 全标签，行为不变）。 */
    function graphInitialZoomForGraph(nodeCount) {
      return nodeCount > GRAPH_LOD_MIN_NODES ? 0.3 : 1
    }

    /** 档位渲染子集（照工作台 tierNodeIds）：full / all-full 返 null（全量不裁）；
        hub = 每社区 Top3 枢纽（节点预算内按社区规模降序截断）；余档 = mention≥2。 */
    function graphTierNodeIds(nodes, communities, tier) {
      if (tier === 'full' || tier === 'all-full') return null
      const keep = new Set()
      if (tier === 'hub') {
        const bySize = [...communities].sort((a, b) => b.memberCount - a.memberCount || a.id - b.id)
        for (const community of bySize) {
          for (const member of community.topMembers.slice(0, GRAPH_LOD_HUB_TOP_PER_COMMUNITY)) {
            if (keep.size >= GRAPH_LOD_HUB_NODE_BUDGET) break
            keep.add(member.id)
          }
          if (keep.size >= GRAPH_LOD_HUB_NODE_BUDGET) break
        }
      } else {
        for (const node of nodes) {
          if (node.mention_count >= GRAPH_IMPORTANT_MENTION) keep.add(node.id)
        }
      }
      return keep
    }

    /** 局部图裁剪（照工作台 filterNeighborhood 逐句移植；入口＝右键「查看局部图」）：
        焦点 + N 跳邻居（BFS，边按无向扩展——对齐 graph_search 邻域语义）；
        返回引用原对象的裁剪子图。 */
    function graphNeighborhood(nodes, edges, focusId, hops) {
      const byId = new Map(nodes.map((node) => [node.id, node]))
      if (!byId.has(focusId)) return { nodes: [], edges: [] }
      const kept = new Set([focusId])
      let frontier = [focusId]
      for (let hop = 0; hop < hops && frontier.length > 0; hop += 1) {
        const next = []
        for (const edge of edges) {
          for (const endpoint of [edge.source, edge.target]) {
            const other = endpoint === edge.source ? edge.target : edge.source
            if (frontier.includes(endpoint) && !kept.has(other)) {
              kept.add(other)
              next.push(other)
            }
          }
        }
        frontier = next
      }
      return {
        nodes: nodes.filter((node) => kept.has(node.id)),
        edges: edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target)),
      }
    }

    /** 跳数切换的图标（局部图卡标题栏单枚钮，2026-10-13 再改案：两枚钮合一）：
        1 跳＝两节链、2 跳＝三节链；颜色随 currentColor。 */
    function graphHopIcon(hops) {
      const dots = hops === 2 ? [2.5, 8, 13.5] : [3.5, 12.5]
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
        h('line', {
          x1: dots[0],
          y1: 8,
          x2: dots[dots.length - 1],
          y2: 8,
          stroke: 'currentColor',
          strokeWidth: 1.2,
        }),
        dots.map((cx) => h('circle', { key: String(cx), cx, cy: 8, r: 2.4, fill: 'currentColor' })),
      )
    }

    /** FNV-1a 32 位（照工作台）：短字符串稳定着色。 */
    function graphFnv1a(text) {
      let hash = 0x811c9dc5
      for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
      }
      return hash >>> 0
    }

    /** 实体 type → 色板稳定取色。 */
    function graphTypeColor(type) {
      return GRAPH_PALETTE[graphFnv1a(String(type || '')) % GRAPH_PALETTE.length]
    }

    /** 社区邻接图贪心着色（Welsh-Powell，照工作台 graph-utils）：相邻社区
        异色优先、色号使用均匀（稀疏图孤立社区不聚同一色号）。 */
    function buildGraphColorMap(nodes, edges) {
      const communityOf = new Map()
      for (const node of nodes) communityOf.set(node.id, node.community)
      const neighbors = new Map()
      for (const node of nodes) {
        if (!neighbors.has(node.community)) neighbors.set(node.community, new Set())
      }
      for (const edge of edges) {
        const a = communityOf.get(edge.source)
        const b = communityOf.get(edge.target)
        if (a === undefined || b === undefined || a === b) continue
        neighbors.get(a).add(b)
        neighbors.get(b).add(a)
      }
      const ordered = [...neighbors.keys()].sort((a, b) => {
        const diff = neighbors.get(b).size - neighbors.get(a).size
        return diff !== 0 ? diff : a - b
      })
      const colorMap = new Map()
      const usage = new Array(GRAPH_PALETTE.length).fill(0)
      for (const community of ordered) {
        const used = new Set()
        for (const neighbor of neighbors.get(community)) {
          const assigned = colorMap.get(neighbor)
          if (assigned !== undefined) used.add(assigned)
        }
        let index = -1
        let bestUsage = Infinity
        for (let i = 0; i < GRAPH_PALETTE.length; i += 1) {
          if (used.has(i)) continue
          if (usage[i] < bestUsage) {
            bestUsage = usage[i]
            index = i
          }
        }
        if (index === -1) index = community % GRAPH_PALETTE.length
        colorMap.set(community, index)
        usage[index] += 1
      }
      return colorMap
    }

    /** 社区 → 色值（带 colorMap 走 Welsh-Powell，缺省取模）。 */
    function graphCommunityColor(community, colorMap) {
      const index =
        colorMap && colorMap.has(community) ? colorMap.get(community) : community % GRAPH_PALETTE.length
      return GRAPH_PALETTE[index]
    }

    /** 节点尺寸：√mention 映射 10–28（长尾压平）。 */
    function graphNodeSize(mention) {
      if (mention <= 0) return 10
      return Math.min(28, 10 + 6 * Math.sqrt(mention))
    }

    /** 邻接表（hover 邻域蓝描边数据源；有向边按无向）。 */
    function buildGraphAdjacency(edges) {
      const sets = new Map()
      const ensure = (key) => {
        let set = sets.get(key)
        if (!set) {
          set = new Set()
          sets.set(key, set)
        }
        return set
      }
      for (const edge of edges) {
        ensure(edge.source).add(edge.target)
        ensure(edge.target).add(edge.source)
      }
      const map = new Map()
      for (const [key, set] of sets) map.set(key, [...set])
      return map
    }

    /** trace → 三层查询表（种子/扩展 hop/证据；null 短路）。 */
    function graphOverlayLookup(trace) {
      if (!trace) return null
      const seeds = new Set(trace.seed_entities || [])
      const hops = new Map((trace.expanded_nodes || []).map((node) => [node.name, node.hop]))
      const evidence = new Set(trace.evidence_entities || [])
      const all = new Set([...seeds, ...hops.keys(), ...evidence])
      return { seeds, hops, evidence, all }
    }

    /** mm:ss timecode for video shot chunks (workbench chip convention). */
    function chunkTimecode(chunk) {
      if (chunk.media !== 'video' || chunk.start_ms == null || chunk.end_ms == null) return null
      const fmt = (ms) => {
        const totalSeconds = Math.floor(Number(ms) / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
      }
      return fmt(chunk.start_ms) + '–' + fmt(chunk.end_ms)
    }

    /** Chunk drawer (the workbench's right-side Sheet): whole-document list
     * with the same load mechanics — first page, auto full load under the cap,
     * jump-to-chunk by expanding the limit + flash highlight — plus per-chunk
     * delete behind the delete-preview dialog (spec §6 keeps direct windowing
     * out for now). Opens over the panel from doc rows / recall hits. */
    function ChunkDrawer({ t, kbId, doc, refreshToken, focusChunkId, onClose }) {
      const [phase, setPhase] = React.useState('loading')
      const [items, setItems] = React.useState([])
      const [total, setTotal] = React.useState(0)
      const [limit, setLimit] = React.useState(CHUNK_PAGE_SIZE)
      const [failure, setFailure] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [flashId, setFlashId] = React.useState(null)
      const [previewOpen, setPreviewOpen] = React.useState(false)
      const [preview, setPreview] = React.useState(null)
      const [previewTarget, setPreviewTarget] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [dialogError, setDialogError] = React.useState(null)
      const rowRefs = React.useRef({})
      const hasDataRef = React.useRef(false)

      const docId = doc ? doc.id : null

      const load = React.useCallback(() => {
        if (!docId) return
        if (!hasDataRef.current) setPhase('loading')
        setFailure(null)
        callOp('listChunks', { kb_id: kbId, doc_id: docId, offset: 0, limit })
          .then((page) => {
            const list = page && Array.isArray(page.items) ? page.items : []
            hasDataRef.current = list.length > 0
            setItems(list)
            setTotal(page && typeof page.total === 'number' ? page.total : list.length)
            setPhase(list.length === 0 ? 'empty' : 'ready')
          })
          .catch((error) => {
            hasDataRef.current = false
            setFailure(error)
            setPhase('error')
          })
      }, [kbId, docId, limit])

      React.useEffect(() => {
        load()
      }, [load, refreshToken])

      // Doc switch resets the pane (first page again).
      React.useEffect(() => {
        hasDataRef.current = false
        setItems([])
        setTotal(0)
        setLimit(CHUNK_PAGE_SIZE)
        setNotice(null)
      }, [kbId, docId])

      // Escape closes the drawer (the preview dialog owns Escape while open).
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape' && !previewOpen) onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [previewOpen, onClose])

      // Under the cap the whole document loads at once (workbench mechanics).
      React.useEffect(() => {
        if (total > 0 && total <= CHUNK_FULL_LOAD_CAP) {
          setLimit((value) => (value < total ? total : value))
        }
      }, [total])

      // Focus hand-off (recall row -> this pane): expand the limit until the
      // target chunk is loaded, then flash-highlight it.
      React.useEffect(() => {
        if (!focusChunkId || phase !== 'ready') return
        const position = items.findIndex((chunk) => chunk.chunk_id === focusChunkId)
        if (position >= 0) {
          if (flashId !== focusChunkId) {
            setFlashId(focusChunkId)
            const node = rowRefs.current[focusChunkId]
            if (node && typeof node.scrollIntoView === 'function') {
              node.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
            window.setTimeout(() => setFlashId((value) => (value === focusChunkId ? null : value)), 1200)
          }
        } else if (items.length < total && limit < total) {
          setLimit((value) => Math.min(total, value + CHUNK_PAGE_SIZE))
        }
      }, [focusChunkId, phase, items, total, limit, flashId])

      const startDelete = (chunk) => {
        setNotice(null)
        setDialogError(null)
        setPreview(null)
        setPreviewTarget(chunk)
        setPreviewOpen(true)
        setBusy(true)
        callOp('previewChunkDeletion', { kb_id: kbId, chunk_ids: [chunk.chunk_id] })
          .then((data) => {
            setPreview(data)
            setBusy(false)
          })
          .catch((error) => {
            setBusy(false)
            setDialogError(errorDetail(error))
          })
      }

      const confirmDelete = () => {
        if (!previewTarget) return
        setBusy(true)
        setDialogError(null)
        callOp('deleteChunk', { kb_id: kbId, chunk_id: previewTarget.chunk_id })
          .then(() => {
            setBusy(false)
            setPreviewOpen(false)
            setNotice({ text: t('chunk.deleteSuccess') })
            load()
          })
          .catch((error) => {
            setBusy(false)
            setDialogError(errorDetail(error))
          })
      }

      if (!doc) return null

      let body
      if (phase === 'loading') {
        body = h('div', { className: 'hrag-pane' }, t('chunk.loading'))
      } else if (phase === 'error') {
        body = h(
          'div',
          { className: 'hrag-state hrag-state-error' },
          h('div', { className: 'hrag-state-title' }, t('doc.listFailed')),
          h('div', { className: 'hrag-state-detail' }, errorDetail(failure)),
          h('button', { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: load }, t('shell.retry')),
        )
      } else if (phase === 'empty') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, t('chunk.empty')))
      } else {
        body = h(
          'div',
          null,
          h(
            'div',
            { className: 'hrag-docs' },
            items.map((chunk) => {
              const timecode = chunkTimecode(chunk)
              return h(
                'div',
                {
                  className: flashId === chunk.chunk_id ? 'hrag-chunkrow hrag-chunkrow-flash' : 'hrag-chunkrow',
                  key: chunk.chunk_id,
                  ref: (node) => {
                    rowRefs.current[chunk.chunk_id] = node
                  },
                },
                h(
                  'div',
                  { className: 'hrag-chunkrow-top' },
                  h('span', { className: 'hrag-chunkrow-idx' }, '#' + String(Number(chunk.chunk_index) + 1)),
                  h(
                    'span',
                    { className: 'hrag-chunkrow-path' },
                    Array.isArray(chunk.heading_path) && chunk.heading_path.length > 0 ? chunk.heading_path.join(' / ') : '',
                  ),
                  timecode ? h('span', { className: 'hrag-chip', title: t('chunk.timecode') }, timecode) : null,
                  chunk.page != null
                    ? h('span', { className: 'hrag-chip' }, t('chunk.page') + ' ' + String(chunk.page))
                    : null,
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'hrag-btn hrag-btn-sm hrag-btn-outline',
                      disabled: busy,
                      onClick: () => startDelete(chunk),
                    },
                    t('chunk.delete'),
                  ),
                ),
                h('div', { className: 'hrag-chunkrow-text' }, String(chunk.text || '')),
              )
            }),
          ),
          items.length < total
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'hrag-btn hrag-btn-outline',
                  onClick: () => setLimit((value) => Math.min(total, value + CHUNK_PAGE_SIZE)),
                },
                t('chunk.loadMore'),
              )
            : null,
        )
      }

      return h(
        React.Fragment,
        null,
        h('div', {
          className: 'hrag-drawer-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        }),
        h(
          'div',
          { className: 'hrag-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('chunk.drawerTitle') },
          h(
            'div',
            { className: 'hrag-drawer-head' },
            h('span', { className: 'hrag-drawer-title', title: String(doc.name) }, String(doc.name)),
            total > 0 ? h('span', { className: 'hrag-docrow-chunks' }, String(total) + ' ' + t('chunk.unit')) : null,
            h(
              'button',
              {
                type: 'button',
                className: 'hrag-btn hrag-btn-outline hrag-drawer-close',
                'aria-label': t('chunk.close'),
                title: t('chunk.close'),
                onClick: onClose,
              },
              '✕',
            ),
          ),
          h(
            'div',
            { className: 'hrag-drawer-body' },
            notice
              ? h('div', { className: notice.isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice' }, notice.text)
              : null,
            body,
          ),
        ),
        previewOpen
          ? h(PreviewDialog, {
              t,
              preview,
              error: dialogError,
              busy,
              onCancel: () => setPreviewOpen(false),
              onConfirm: confirmDelete,
            })
          : null,
      )
    }

    const RECALL_PATHS = ['vector', 'graph', 'wiki']

    /** Score display mirrors the workbench: null (degraded reranker) renders
     * an em dash; the label string itself is computed server-side per request. */
    function formatScore(score) {
      return score == null ? '—' : Number(score).toFixed(3)
    }

    /** First non-empty line of the chunk text (the workbench's row preview). */
    function firstLine(text) {
      const lines = String(text || '').split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) return trimmed
      }
      return ''
    }

    /** Wiki summaries carry a leading "# title" H1 — dropped for the row. */
    function stripSummaryHeading(summary) {
      return String(summary || '')
        .replace(/^#\s.*(\n|$)/, '')
        .trim()
    }

    /** Recall pane: query + top_k (clamped 1–20, same as the hrag tool) ran
     * against the three paths at once; results render as three stacked
     * sections (label / score_type badge / elapsed / count), chunk rows click
     * through to the chunks pane focused on the hit (the workbench's two-level
     * jump). Single-path selection and the wiki entry drawer are out of scope
     * (spec §6 registry). */
    /** 「在向量空间查看」图标（散点三连——工作台 ChartScatter 语义的手绘等价物）。 */
    function vectorSpaceIcon() {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true' },
        h('circle', { cx: 3.6, cy: 9.6, r: 1.7, fill: 'currentColor' }),
        h('circle', { cx: 7.6, cy: 4.8, r: 1.55, fill: 'currentColor', opacity: 0.72 }),
        h('circle', { cx: 10.9, cy: 9.9, r: 1.35, fill: 'currentColor', opacity: 0.5 }),
      )
    }

    /** 「在知识图谱查看」图标（三点连线＝图谱语义，照工作台 Waypoints 的手绘等价物）。 */
    function graphSpaceIcon() {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true' },
        h('path', {
          d: 'M3 10.4 L7 3.6 L11 9.8',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: 0.7,
        }),
        h('circle', { cx: 3, cy: 10.4, r: 1.6, fill: 'currentColor' }),
        h('circle', { cx: 7, cy: 3.6, r: 1.7, fill: 'currentColor' }),
        h('circle', { cx: 11, cy: 9.8, r: 1.6, fill: 'currentColor' }),
      )
    }

    function RecallView({ t, kbId, onOpenChunk, onViewInVectorSpace, onViewInGraphSpace }) {
      const [query, setQuery] = React.useState('')
      const [topK, setTopK] = React.useState(5)
      const [pending, setPending] = React.useState(false)
      const [result, setResult] = React.useState(null)
      const [failure, setFailure] = React.useState(null)

      React.useEffect(() => {
        setResult(null)
        setFailure(null)
      }, [kbId])

      const run = () => {
        const trimmed = query.trim()
        if (!trimmed || pending) return
        const clampedTopK = Math.min(20, Math.max(1, Math.trunc(topK) || 5))
        setPending(true)
        setFailure(null)
        callOp('recallTest', { kb_id: kbId, query: trimmed, top_k: clampedTopK })
          .then((data) => {
            setPending(false)
            setResult(data)
          })
          .catch((error) => {
            setPending(false)
            setFailure(error)
          })
      }

      const bar = h(
        'div',
        { className: 'hrag-recall-bar' },
        h('input', {
          type: 'text',
          className: 'hrag-input',
          placeholder: t('recall.placeholder'),
          value: query,
          onChange: (event) => setQuery(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter') run()
          },
        }),
        h('input', {
          type: 'number',
          className: 'hrag-input hrag-input-num',
          min: 1,
          max: 20,
          'aria-label': t('recall.topK'),
          title: t('recall.topK'),
          value: topK,
          onChange: (event) => setTopK(Number(event.target.value)),
        }),
        h(
          'button',
          {
            type: 'button',
            className: 'hrag-btn hrag-btn-outline',
            disabled: pending || !query.trim(),
            onClick: run,
          },
          pending ? t('recall.running') : t('recall.run'),
        ),
        result && onViewInVectorSpace
          ? h(
              'button',
              {
                type: 'button',
                className: 'hrag-btn hrag-btn-outline hrag-btn-icon',
                disabled: !(
                  result.paths &&
                  result.paths.vector &&
                  result.paths.vector.hits &&
                  result.paths.vector.hits.length > 0
                ),
                'aria-label': t('recall.viewInVectorSpace'),
                title: t('recall.viewInVectorSpace'),
                onClick: () => {
                  const hits = (result.paths && result.paths.vector && result.paths.vector.hits) || []
                  onViewInVectorSpace({
                    text: result.query,
                    hits: hits.map((hit) => ({ pointId: hit.chunk_id, score: hit.score })),
                  })
                },
              },
              vectorSpaceIcon(),
            )
          : null,
        result && onViewInGraphSpace
          ? h(
              'button',
              {
                type: 'button',
                className: 'hrag-btn hrag-btn-outline hrag-btn-icon',
                disabled: !(
                  result.paths &&
                  result.paths.graph &&
                  result.paths.graph.trace &&
                  ((result.paths.graph.trace.seed_entities || []).length +
                    (result.paths.graph.trace.expanded_nodes || []).length +
                    (result.paths.graph.trace.evidence_entities || []).length) >
                    0
                ),
                'aria-label': t('recall.viewInGraphSpace'),
                title: t('recall.viewInGraphSpace'),
                onClick: () => {
                  const trace = (result.paths && result.paths.graph && result.paths.graph.trace) || null
                  onViewInGraphSpace({ text: result.query, trace })
                },
              },
              graphSpaceIcon(),
            )
          : null,
      )

      let body
      if (!result) {
        body = h(
          'div',
          { className: 'hrag-state' },
          h('div', { className: 'hrag-state-title' }, t('recall.empty')),
        )
      } else {
        const counts = {
          vector: (result.paths && result.paths.vector && result.paths.vector.hits ? result.paths.vector.hits : []).length,
          graph: (result.paths && result.paths.graph && result.paths.graph.evidence ? result.paths.graph.evidence : []).length,
          wiki: (result.paths && result.paths.wiki && result.paths.wiki.hits ? result.paths.wiki.hits : []).length,
        }
        const messages = {
          vector: (result.paths && result.paths.vector && result.paths.vector.message) || '',
          graph: (result.paths && result.paths.graph && result.paths.graph.message) || '',
          wiki: (result.paths && result.paths.wiki && result.paths.wiki.message) || '',
        }
        const hitRow = (key, entry, onOpen) =>
          h(
            'button',
            {
              type: 'button',
              className: onOpen ? 'hrag-hitrow' : 'hrag-hitrow hrag-hitrow-static',
              key,
              onClick: onOpen || undefined,
            },
            entry.rank != null ? h('span', { className: 'hrag-hitrank' }, '#' + String(entry.rank)) : null,
            h('span', { className: 'hrag-hitdoc', title: entry.docName }, String(entry.docName || '')),
            h('span', { className: 'hrag-hitlead' }, entry.lead),
            entry.page != null ? h('span', { className: 'hrag-hitpage' }, 'p.' + String(entry.page)) : null,
            h('span', { className: 'hrag-hitscore' }, formatScore(entry.score)),
          )
        const rowsFor = (path) => {
          if (path === 'vector') {
            return (result.paths.vector.hits || []).map((hit) =>
              hitRow(
                hit.chunk_id,
                { rank: hit.rank, docName: hit.doc_name, lead: firstLine(hit.text), page: hit.page, score: hit.score },
                onOpenChunk ? () => onOpenChunk(hit.chunk_id, hit.doc_name) : null,
              ),
            )
          }
          if (path === 'graph') {
            return (result.paths.graph.evidence || []).map((hit, index) =>
              hitRow(
                hit.chunk_id,
                { rank: index + 1, docName: hit.doc_name, lead: firstLine(hit.text), page: hit.page, score: hit.score },
                onOpenChunk ? () => onOpenChunk(hit.chunk_id, hit.doc_name) : null,
              ),
            )
          }
          return (result.paths.wiki.hits || []).map((hit) =>
            hitRow(hit.entry_id, { rank: hit.rank, docName: hit.title, lead: stripSummaryHeading(hit.summary), page: null, score: hit.score }, null),
          )
        }
        const section = (path) =>
          h(
            'div',
            { className: 'hrag-recall-section', key: path },
            h(
              'div',
              { className: 'hrag-recall-head' },
              h('span', { className: 'hrag-recall-name' }, t('recall.path.' + path)),
              h('span', { className: 'hrag-chip' }, String((result.score_type && result.score_type[path]) || '')),
              h(
                'span',
                { className: 'hrag-recall-meta' },
                h('span', { className: 'hrag-chip' }, String((result.elapsed_ms && result.elapsed_ms[path]) || 0) + ' ms'),
                h('span', { className: 'hrag-chip' }, String(counts[path])),
              ),
            ),
            h(
              'div',
              { className: 'hrag-recall-rows' },
              counts[path] === 0
                ? h('div', { className: 'hrag-recall-empty' }, messages[path])
                : rowsFor(path),
            ),
          )
        body = h(
          'div',
          { className: 'hrag-recall-sections' },
          result.embedding_mismatch ? h('div', { className: 'hrag-notice hrag-notice-error' }, t('recall.mismatch')) : null,
          RECALL_PATHS.map(section),
        )
      }

      return h(
        React.Fragment,
        null,
        bar,
        failure ? h('div', { className: 'hrag-notice hrag-notice-error' }, t('recall.failed') + '：' + errorDetail(failure)) : null,
        body,
      )
    }

    // ── 向量投影视图（Task 6·DSH 内新写，语义照工作台；代码不搬）────────────
    /** 四类点按 source_type 分组：点数多的在前（垫底绘制序＝同序透明度排名）。 */
    function groupVectorPoints(points) {
      const buckets = new Map()
      for (const type of VEC_SOURCE_TYPES) buckets.set(type, [])
      for (const point of points || []) {
        const bucket = buckets.get(point.source_type)
        if (bucket) bucket.push(point)
      }
      return VEC_SOURCE_TYPES.filter((type) => buckets.get(type).length > 0)
        .map((type) => ({
          sourceType: type,
          color: VEC_COLORS[type] || '#73c0de',
          size: VEC_SIZES[type] || 8,
          points: buckets.get(type),
        }))
        .sort((a, b) => b.points.length - a.points.length)
    }

    /** 透明度四档按点数排名取档（点最多的最透；缺席类别从实端截取）。 */
    function vectorGroupOpacities(groups) {
      const slots = VEC_RANK_OPACITIES.slice(Math.max(0, VEC_RANK_OPACITIES.length - groups.length))
      const map = {}
      groups.forEach((group, rank) => {
        map[group.sourceType] = slots[rank] == null ? 0.7 : slots[rank]
      })
      return map
    }

    /** 命中色深（照工作台 overlayHitColor）：score 批内归一化 → alpha 0.45..1；
        null（rerank 降级）取中档、全等分取最深。 */
    function overlayHitColor(score, min, max) {
      const t = score == null ? 0.5 : max <= min ? 1 : (score - min) / (max - min)
      const alpha = 0.45 + 0.55 * Math.min(1, Math.max(0, t))
      return 'rgba(245, 34, 45, ' + alpha.toFixed(3) + ')'
    }

    /** tooltip 截断（照工作台口径：label/preview 各 20 字）。 */
    function vecTruncate(text, max) {
      const value = String(text == null ? '' : text)
      return value.length > max ? value.slice(0, max) + '…' : value
    }

    /** 坐标网格（照工作台/echarts 逻辑）：逐轴取 1/2/5 族步长、轴界取步长整
        （floor/ceil ⇒ 每格完整、盒缘即最外刻度线＝闭环）；轴界供逐轴归一映射
        到同一正方形盒面（GL 立方盒语义：列宽/行高各自均匀，盒恒正方）。 */
    function computeVectorGrid(points, dims) {
      const axisBounds = (min, max) => {
        const step = niceStep(max - min, 3)
        const lo = Math.floor(min / step) * step
        const hi = lo + Math.max(1, Math.ceil((max - lo) / step)) * step
        return [Math.round(lo * 1e12) / 1e12, Math.round(hi * 1e12) / 1e12, step]
      }
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      let minZ = Infinity
      let maxZ = -Infinity
      for (const point of points || []) {
        if (point.x < minX) minX = point.x
        if (point.x > maxX) maxX = point.x
        if (point.y < minY) minY = point.y
        if (point.y > maxY) maxY = point.y
        const z = point.z == null ? 0 : point.z
        if (z < minZ) minZ = z
        if (z > maxZ) maxZ = z
      }
      if (!Number.isFinite(minX)) {
        return { x: [0, 1], y: [0, 1], z: [0, 1], stepX: 1, stepY: 1, stepZ: 1 }
      }
      const gx = axisBounds(minX, maxX)
      const gy = axisBounds(minY, maxY)
      const gz = dims === 3 ? axisBounds(minZ, maxZ) : [0, 1, 1]
      return {
        x: [gx[0], gx[1]],
        y: [gy[0], gy[1]],
        z: [gz[0], gz[1]],
        stepX: gx[2],
        stepY: gy[2],
        stepZ: gz[2],
      }
    }

    /** 步长候选（1/2/5 族·**最近邻**取档——照 echarts nice 口径：更稀、更整）。 */
    function niceStep(span, count) {
      if (!(span > 0)) return 1
      const rough = span / count
      const pow = Math.pow(10, Math.floor(Math.log10(rough)))
      const norm = rough / pow
      return (norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * pow
    }

    /** 按固定步长生成 [min,max] 内的刻度（两端留浮点余量——盒缘刻度线不丢）。 */
    function ticksFor(min, max, step) {
      const ticks = []
      const start = Math.ceil(min / step - 1e-9)
      const end = Math.floor(max / step + 1e-9)
      for (let i = start; i <= end; i += 1) {
        ticks.push(Math.round(i * step * 1e12) / 1e12)
      }
      return ticks
    }

    /** 刻度文案（两位有效数字，去尾零）。 */
    function formatTick(value) {
      return String(Number(value.toPrecision(2)))
    }

    /** 投影画布（手写 canvas 2D，代码不搬）：2D＝拖拽平移/滚轮缩放，3D＝拖拽
        旋转/滚轮缩放；绘制照工作台语义——光晕衬底、聚焦淡化、叠加（query 星标
        ＋命中连线＋score 色深）。悬停拾取返回点级 tooltip；单击回调 onPick。 */
    function VectorCanvas({ t, dims, points, groups, opacities, hiddenTypes, activeOverlay, onPick }) {
      const wrapRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const viewRef = React.useRef({ zoom: 1, ox: 0, oy: 0, yaw: VEC_VIEW_YAW, pitch: VEC_VIEW_PITCH })
      const gridRef = React.useRef({ x: [0, 1], y: [0, 1], z: [0, 1], stepX: 1, stepY: 1, stepZ: 1 })
      const projectedRef = React.useRef([])
      const hoverRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const [tip, setTip] = React.useState(null)
      const [grabbing, setGrabbing] = React.useState(false)

      const hitById = React.useMemo(() => {
        const map = new Map()
        for (const hit of (activeOverlay && activeOverlay.hits) || []) map.set(hit.pointId, hit.score)
        return map
      }, [activeOverlay])
      const hitRange = React.useMemo(() => {
        const scores = ((activeOverlay && activeOverlay.hits) || [])
          .map((hit) => hit.score)
          .filter((score) => score != null)
        return { min: scores.length ? Math.min.apply(null, scores) : 0, max: scores.length ? Math.max.apply(null, scores) : 1 }
      }, [activeOverlay])

      /** 单一绘制函数（数据/视口/悬停/叠加变化都经它落画布）。 */
      const draw = React.useCallback(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const w = wrap.clientWidth
        const h = wrap.clientHeight
        if (!w || !h) return
        const dpr = window.devicePixelRatio || 1
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
        }
        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        const view = viewRef.current
        const box = gridRef.current
        // 正方形盒面（min 边 VEC_SIDE_RATIO，居中＋平移）——GL 立方盒语义：盒恒正方；
        // 各轴各自的 [lo,hi] 独立归一铺满盒面 ⇒ 列宽彼此均匀、行高彼此均匀，
        // 盒缘落最外刻度线（闭环、无残格）。
        const side = Math.min(w, h) * VEC_SIDE_RATIO * view.zoom
        // 水平/垂直各自居中（宽栏时盒仍居中——inset 分轴算，此前用 min 边导致靠左）。
        const insetX = (w - side) / 2
        const insetY = (h - side) / 2
        const boxLeft = insetX + view.ox
        const boxBottom = h - insetY + view.oy
        const cx = w / 2 + view.ox
        const cy = h / 2 + view.oy
        const spanX = box.x[1] - box.x[0] || 1
        const spanY = box.y[1] - box.y[0] || 1
        const spanZ = box.z[1] - box.z[0] || 1
        const project = (x, y, z) => {
          if (dims === 3) {
            // 逐轴归一到 [-0.5,0.5]³ 再旋转投影（照工作台：Z 朝上、x/y 铺地面）。
            const nx = (x - box.x[0]) / spanX - 0.5
            const ny = (y - box.y[0]) / spanY - 0.5
            const nz = ((z == null ? 0 : z) - box.z[0]) / spanZ - 0.5
            const cy1 = Math.cos(view.yaw)
            const sy1 = Math.sin(view.yaw)
            const cp = Math.cos(view.pitch)
            const sp = Math.sin(view.pitch)
            const x1 = nx * cy1 + ny * sy1
            const y1 = -nx * sy1 + ny * cy1
            const up = nz * cp + y1 * sp
            const depth = y1 * cp - nz * sp
            // 轻度透视（照工作台）：越远越小，前/后缘≈1.24。
            const power = VEC_PERSPECTIVE_D / (VEC_PERSPECTIVE_D + depth)
            return { sx: cx + x1 * side * power, sy: cy - up * side * power, depth }
          }
          return {
            sx: boxLeft + ((x - box.x[0]) / spanX) * side,
            sy: boxBottom - ((y - box.y[0]) / spanY) * side,
            depth: 0,
          }
        }
        // 坐标系（照工作台弱化口径）：网格垫底 → 三条轴脊线 → 刻度数字 → 轴名。
        {
          const inkColor = getComputedStyle(wrap).color || '#3c3c3c'
          ctx.strokeStyle = inkColor
          ctx.fillStyle = inkColor
          ctx.lineWidth = 1
          const xs = ticksFor(box.x[0], box.x[1], box.stepX)
          const ys = ticksFor(box.y[0], box.y[1], box.stepY)
          const zs = dims === 3 ? ticksFor(box.z[0], box.z[1], box.stepZ) : []
          // 3D 轴棱自动选位（照工作台＝echarts-gl 源码规则）：X/Y＝地板面（远侧面）的
          // 近侧边界棱——刻度边永远贴紧绘制面（不会悬空脱面）；Z＝远 x 面×近 y 面的
          // 竖棱；墙＋地板恒远侧。
          let xEdge = box.x[0]
          let yEdge = box.y[0]
          let xEdgeZ = box.z[0]
          let yEdgeZ = box.z[0]
          let zEdgeX = box.x[0]
          let zEdgeY = box.y[0]
          let yWall = box.y[1]
          let xWall = box.x[0]
          let zFloor = box.z[0]
          const boxMid = project((box.x[0] + box.x[1]) / 2, (box.y[0] + box.y[1]) / 2, (box.z[0] + box.z[1]) / 2)
          if (dims === 3) {
            const midX2 = (box.x[0] + box.x[1]) / 2
            const midY2 = (box.y[0] + box.y[1]) / 2
            const midZ2 = (box.z[0] + box.z[1]) / 2
            // 墙与地板按深度独立取「远侧面」（墙永远在后、地板永远在远侧）。
            yWall = project(midX2, box.y[0], midZ2).depth >= project(midX2, box.y[1], midZ2).depth ? box.y[0] : box.y[1]
            xWall = project(box.x[0], midY2, midZ2).depth >= project(box.x[1], midY2, midZ2).depth ? box.x[0] : box.x[1]
            zFloor = project(midX2, midY2, box.z[0]).depth >= project(midX2, midY2, box.z[1]).depth ? box.z[0] : box.z[1]
            // X/Y 轴棱＝地板面（z=zFloor）的**近侧边界棱**——刻度边永远跟紧面
            // （他纠：不能悬空脱面；上下翻时随地板面切到顶面同名棱，依旧贴面）。
            const ym0 = project(midX2, box.y[0], zFloor)
            const ym1 = project(midX2, box.y[1], zFloor)
            yEdge = ym0.depth <= ym1.depth ? box.y[0] : box.y[1]
            yEdgeZ = zFloor
            const xm0 = project(box.x[0], midY2, zFloor)
            const xm1 = project(box.x[1], midY2, zFloor)
            xEdge = xm0.depth <= xm1.depth ? box.x[0] : box.x[1]
            xEdgeZ = zFloor
            // Z 轴棱＝(远侧 x 面 × 近侧 y 面) 的竖棱——echarts-gl 原规则：
            // zAxisXOffset＝远 x、zAxisZOffset＝近 y（Grid3DView._updateAxisLinePosition）。
            zEdgeX = xWall
            zEdgeY = yEdge
          }
          // 网格：3D＝远侧双墙＋地板（面线更淡，照工作台「面浅边深」）；2D＝双轴格。
          ctx.globalAlpha = dims === 3 ? 0.045 : 0.07
          ctx.beginPath()
          const seg = (a, b) => {
            ctx.moveTo(a.sx, a.sy)
            ctx.lineTo(b.sx, b.sy)
          }
          if (dims === 2) {
            for (const tick of xs) seg(project(tick, box.y[0], 0), project(tick, box.y[1], 0))
            for (const tick of ys) seg(project(box.x[0], tick, 0), project(box.x[1], tick, 0))
          } else {
            // 墙甲 y=yWall：竖线随 x、横线随 z；墙乙 x=xWall：竖线随 y、横线随 z；地板 z=z0。
            for (const tick of xs) seg(project(tick, yWall, box.z[0]), project(tick, yWall, box.z[1]))
            for (const tick of zs) seg(project(box.x[0], yWall, tick), project(box.x[1], yWall, tick))
            for (const tick of ys) seg(project(xWall, tick, box.z[0]), project(xWall, tick, box.z[1]))
            for (const tick of zs) seg(project(xWall, box.y[0], tick), project(xWall, box.y[1], tick))
            for (const tick of xs) seg(project(tick, box.y[0], zFloor), project(tick, box.y[1], zFloor))
            for (const tick of ys) seg(project(box.x[0], tick, zFloor), project(box.x[1], tick, zFloor))
          }
          ctx.stroke()
          // 三条轴脊线（带刻度字母的三棱＝所选 X/Y 轴棱＋所选 Z 竖棱）——与最外圈面线
          // 同位置叠画，加重加粗以示「轴」。
          ctx.globalAlpha = 0.4
          ctx.lineWidth = 1.5
          ctx.beginPath()
          if (dims === 3) {
            seg(project(box.x[0], yEdge, yEdgeZ), project(box.x[1], yEdge, yEdgeZ))
            seg(project(xEdge, box.y[0], xEdgeZ), project(xEdge, box.y[1], xEdgeZ))
            seg(project(zEdgeX, zEdgeY, box.z[0]), project(zEdgeX, zEdgeY, box.z[1]))
          } else {
            seg(project(box.x[0], box.y[0], 0), project(box.x[1], box.y[0], 0))
            seg(project(box.x[0], box.y[0], 0), project(box.x[0], box.y[1], 0))
          }
          ctx.stroke()
          ctx.lineWidth = 1
          // 内侧背角三棱（无刻度字母的三条边）——只比面线深一点点（照工作台）。
          if (dims === 3) {
            ctx.globalAlpha = 0.08
            ctx.beginPath()
            seg(project(xWall, yWall, box.z[0]), project(xWall, yWall, box.z[1]))
            seg(project(box.x[0], yWall, zFloor), project(box.x[1], yWall, zFloor))
            seg(project(xWall, box.y[0], zFloor), project(xWall, box.y[1], zFloor))
            ctx.stroke()
          }
          // 刻度/轴名随选边：3D 一律朝盒外径向偏移（旋转自动换边也不进盒内）；
          // 2D X 在下缘 +6、Y 在左缘 −6。近角刻度去重：与已画标签 <13px 的不再画
          // （前角处 X/Y 尾首刻度只留一个）。boxMid 已在选边处算好。
          const radialAt = (p, dist) => {
            const dx = p.sx - boxMid.sx
            const dy = p.sy - boxMid.sy
            const len = Math.hypot(dx, dy) || 1
            return { x: p.sx + (dx / len) * dist, y: p.sy + (dy / len) * dist }
          }
          const drawnSpots = []
          const drawSpot = (x, y, text) => {
            for (const spot of drawnSpots) {
              if (Math.hypot(x - spot.x, y - spot.y) < 13) return
            }
            drawnSpots.push({ x, y })
            ctx.fillText(text, x, y)
          }
          ctx.globalAlpha = 0.45
          ctx.font = '11px sans-serif'
          for (const tick of xs) {
            const p = project(tick, yEdge, yEdgeZ)
            ctx.textAlign = 'center'
            if (dims === 3) {
              const at = radialAt(p, 9)
              ctx.textBaseline = 'middle'
              drawSpot(at.x, at.y, formatTick(tick))
            } else {
              ctx.textBaseline = 'top'
              drawSpot(p.sx, p.sy + 6, formatTick(tick))
            }
          }
          for (const tick of ys) {
            const p = project(xEdge, tick, xEdgeZ)
            if (dims === 3) {
              const at = radialAt(p, 9)
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              drawSpot(at.x, at.y, formatTick(tick))
            } else {
              ctx.textAlign = 'right'
              ctx.textBaseline = 'middle'
              drawSpot(p.sx - 6, p.sy, formatTick(tick))
            }
          }
          if (dims === 3) {
            for (const tick of zs) {
              const at = radialAt(project(zEdgeX, zEdgeY, tick), 9)
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              drawSpot(at.x, at.y, formatTick(tick))
            }
          }
          // 轴名（照工作台：沿轴中段、朝盒外径向偏移；2D 偏移更大以避开刻度行）。
          ctx.globalAlpha = 0.6
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const nameOffset = dims === 3 ? 20 : 26
          const placeName = (p, text) => {
            // 轴名不受近旁去重影响（此前被中段刻度标签误挤掉——X/Y 消失之因）。
            const at = radialAt(p, nameOffset)
            drawnSpots.push({ x: at.x, y: at.y })
            ctx.fillText(text, at.x, at.y)
          }
          placeName(project((box.x[0] + box.x[1]) / 2, yEdge, yEdgeZ), 'X')
          placeName(project(xEdge, (box.y[0] + box.y[1]) / 2, xEdgeZ), 'Y')
          if (dims === 3) {
            placeName(project(zEdgeX, zEdgeY, (box.z[0] + box.z[1]) / 2), 'Z')
          }
          ctx.globalAlpha = 1
        }
        // 全量投影缓存（绘制与拾取共用；拾取按绘制序逆序找最上层）。
        const projected = []
        // 衬底色＝页面底色（浅/暗主题自动；底上隐形，只在盖住散点处显形）。
        const bodyBg = typeof document === 'undefined' ? '' : getComputedStyle(document.body).backgroundColor
        const haloColor = bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : '#ffffff'
        const focus = hoverRef.current
        const isDimmed = (point) => {
          if (!focus) return false
          if (focus.sourceType === 'chunk') return point.source_type === 'chunk' && point.color_key !== focus.docId
          return point.source_type !== focus.sourceType
        }
        const list = []
        for (const group of groups) {
          if (hiddenTypes && hiddenTypes[group.sourceType]) continue
          const baseOpacity = opacities[group.sourceType] == null ? 0.7 : opacities[group.sourceType]
          for (const point of group.points) {
            const p = project(point.x, point.y, point.z)
            list.push({ p, point, group, baseOpacity })
          }
        }
        if (dims === 3) list.sort((a, b) => a.p.depth - b.p.depth)
        const drawMarker = (ctx2, sx, sy, size, shape) => {
          const r = size / 2
          ctx2.beginPath()
          if (shape === 'triangle') {
            ctx2.moveTo(sx, sy - r)
            ctx2.lineTo(sx + r, sy + r)
            ctx2.lineTo(sx - r, sy + r)
            ctx2.closePath()
          } else if (shape === 'rect') {
            ctx2.rect(sx - r, sy - r, r * 2, r * 2)
          } else if (shape === 'diamond') {
            ctx2.moveTo(sx, sy - r)
            ctx2.lineTo(sx + r, sy)
            ctx2.lineTo(sx, sy + r)
            ctx2.lineTo(sx - r, sy)
            ctx2.closePath()
          } else {
            ctx2.arc(sx, sy, r, 0, Math.PI * 2)
          }
        }
        for (const entry of list) {
          const { p, point, group, baseOpacity } = entry
          if (p.sx < -20 || p.sx > w + 20 || p.sy < -20 || p.sy > h + 20) continue
          const hit = hitById.has(point.id)
          const dimmed = isDimmed(point)
          const alpha = hit ? 1 : dimmed ? VEC_DIMMED_OPACITY : baseOpacity
          const size = group.size || 8
          // 光晕衬底（照工作台「白圈」语义）：底色大一圈先画，露出即描边。
          ctx.globalAlpha = alpha
          ctx.fillStyle = haloColor
          drawMarker(ctx, p.sx, p.sy, size + VEC_HALO_BOOST, VEC_SHAPES[group.sourceType])
          ctx.fill()
          ctx.fillStyle = hit ? overlayHitColor(hitById.get(point.id), hitRange.min, hitRange.max) : group.color
          drawMarker(ctx, p.sx, p.sy, size, VEC_SHAPES[group.sourceType])
          ctx.fill()
          projected.push({ sx: p.sx, sy: p.sy, r: size / 2 + 2, point })
        }
        ctx.globalAlpha = 1
        // 叠加层（照工作台：query→命中连线 + query 星标；命中点色深已在主pass）。
        const query = activeOverlay && activeOverlay.query
        if (query) {
          const qp = project(query.x, query.y, query.z)
          const byId = new Map(projected.map((entry) => [entry.point.id, entry]))
          ctx.strokeStyle = 'rgba(245, 34, 45, 0.55)'
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.8
          ctx.beginPath()
          for (const hit of activeOverlay.hits || []) {
            const target = byId.get(hit.pointId)
            if (!target) continue
            ctx.moveTo(qp.sx, qp.sy)
            ctx.lineTo(target.sx, target.sy)
          }
          ctx.stroke()
          ctx.globalAlpha = 0.85
          ctx.fillStyle = VEC_OVERLAY_COLOR
          const star = 9
          ctx.beginPath()
          for (let i = 0; i < 10; i += 1) {
            const angle = -Math.PI / 2 + (i * Math.PI) / 5
            const radius = i % 2 === 0 ? star : star * 0.45
            const px = qp.sx + Math.cos(angle) * radius
            const py = qp.sy + Math.sin(angle) * radius
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.fill()
          ctx.globalAlpha = 1
          projected.push({ sx: qp.sx, sy: qp.sy, r: star, point: null, query: true })
        }
        projectedRef.current = projected
      }, [dims, groups, opacities, hiddenTypes, activeOverlay, hitById, hitRange])

      // 数据/维度变化：重算网格（逐轴取整）& 视口归位（用户配置切换的稳定起点）。
      React.useEffect(() => {
        gridRef.current = computeVectorGrid(points, dims)
        viewRef.current = {
          zoom: 1,
          ox: 0,
          oy: 0,
          yaw: dims === 3 ? VEC_VIEW_YAW : 0,
          pitch: dims === 3 ? VEC_VIEW_PITCH : 0,
        }
        draw()
      }, [points, dims, draw])

      React.useEffect(() => {
        draw()
      }, [draw])

      React.useEffect(() => {
        const wrap = wrapRef.current
        if (!wrap) return
        const observer = new ResizeObserver(() => draw())
        observer.observe(wrap)
        return () => observer.disconnect()
      }, [draw])

      // 滚轮缩放（native 监听以 preventDefault 压住面板滚动）。
      React.useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const onWheel = (event) => {
          event.preventDefault()
          const rect = canvas.getBoundingClientRect()
          const mx = event.clientX - rect.left
          const my = event.clientY - rect.top
          const view = viewRef.current
          const factor = Math.exp(-event.deltaY * 0.0012)
          if (dims === 3) {
            view.zoom = Math.max(0.05, view.zoom * factor)
          } else {
            // 光标下的归一坐标保持不动（boxLeft = inset + ox；boxBottom = h − inset + oy）。
            const w0 = rect.width
            const h0 = rect.height
            const minSide = Math.min(w0, h0)
            const side0 = minSide * VEC_SIDE_RATIO * view.zoom
            const insetX0 = (w0 - side0) / 2
            const insetY0 = (h0 - side0) / 2
            const u = (mx - (insetX0 + view.ox)) / (side0 || 1)
            const v = (h0 - insetY0 + view.oy - my) / (side0 || 1)
            view.zoom = Math.max(0.05, view.zoom * factor)
            const side1 = minSide * VEC_SIDE_RATIO * view.zoom
            const insetX1 = (w0 - side1) / 2
            const insetY1 = (h0 - side1) / 2
            view.ox = mx - u * side1 - insetX1
            view.oy = my + v * side1 - (h0 - insetY1)
          }
          draw()
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
      }, [dims, draw])

      const pick = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const mx = event.clientX - rect.left
        const my = event.clientY - rect.top
        const projected = projectedRef.current
        for (let i = projected.length - 1; i >= 0; i -= 1) {
          const entry = projected[i]
          if (entry.query) continue
          const dx = mx - entry.sx
          const dy = my - entry.sy
          if (dx * dx + dy * dy <= entry.r * entry.r) return { entry, mx, my }
        }
        return null
      }

      const handleMove = (event) => {
        const drag = dragRef.current
        if (drag) {
          const dx = event.clientX - drag.x
          const dy = event.clientY - drag.y
          if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) drag.moved = true
          drag.x = event.clientX
          drag.y = event.clientY
          const view = viewRef.current
          if (dims === 3) {
            // 抓取语义（他实跑点名「拖拽反了」）：拖向右＝近侧跟随向右。
            view.yaw -= dx * 0.008
            view.pitch = Math.max(-1.45, Math.min(1.45, view.pitch + dy * 0.008))
          } else {
            view.ox += dx
            view.oy += dy
          }
          draw()
          return
        }
        const found = pick(event)
        if (found) {
          const point = found.entry.point
          const focus =
            point.source_type === 'chunk'
              ? { sourceType: 'chunk', docId: point.color_key }
              : { sourceType: point.source_type }
          const prev = hoverRef.current
          const changed = !prev || prev.sourceType !== focus.sourceType || prev.docId !== focus.docId
          hoverRef.current = focus
          setTip({
            x: found.mx + 12,
            y: found.my + 12,
            label: point.label,
            preview: point.preview,
            type: point.source_type,
          })
          if (changed) draw()
        } else if (tip) {
          hoverRef.current = null
          setTip(null)
          draw()
        }
      }

      const handleDown = (event) => {
        dragRef.current = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false }
        setGrabbing(true)
      }
      const handleUp = (event) => {
        const drag = dragRef.current
        dragRef.current = null
        setGrabbing(false)
        if (drag && !drag.moved) {
          const found = pick(event)
          if (found && found.entry.point && onPick) onPick(found.entry.point)
        }
      }
      const handleLeave = () => {
        dragRef.current = null
        setGrabbing(false)
        if (tip) setTip(null)
        if (hoverRef.current) {
          hoverRef.current = null
          draw()
        }
      }

      return h(
        'div',
        { className: 'hrag-vec-canvas', ref: wrapRef },
        h('canvas', {
          ref: canvasRef,
          style: { cursor: grabbing ? 'grabbing' : tip ? 'pointer' : 'crosshair' },
          onMouseDown: handleDown,
          onMouseMove: handleMove,
          onMouseUp: handleUp,
          onMouseLeave: handleLeave,
        }),
        tip
          ? h(
              'div',
              { className: 'hrag-vec-tip', style: { left: String(tip.x) + 'px', top: String(tip.y) + 'px' } },
              h('span', {
                className: 'hrag-vec-tip-dot',
                style: { backgroundColor: VEC_COLORS[tip.type] || '#999' },
              }),
              h('span', { className: 'hrag-vec-tip-label' }, vecTruncate(tip.label, VEC_TOOLTIP_MAX)),
              tip.preview
                ? h('span', { className: 'hrag-vec-tip-preview' }, vecTruncate(tip.preview, VEC_TOOLTIP_MAX))
                : null,
            )
          : null,
      )
    }

    /** 「重新计算」图标（循环箭头；pending 时自旋）。 */
    function refreshIcon(spinning) {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': 'true', className: spinning ? 'hrag-spin' : undefined },
        h('path', {
          d: 'M11.5 7 A4.5 4.5 0 1 1 7 2.5',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
        }),
        h('path', { d: 'M7 0.9 L7 4.1 L10.2 2.5 Z', fill: 'currentColor' }),
      )
    }

    /** 投影视图（Task 6）：工具栏（四类 chips／2D·3D／算法／重算）＋画布＋
        图例＋叠加徽标；三态与提示行照面板既有口径。keep-alive 挂载——enabled
        门控首次取数，切走不丢配置与叠加。 */
    function VectorView({ t, kbId, enabled, overlayRequest, onOpenChunk }) {
      const [collections, setCollections] = React.useState(VEC_COLLECTIONS)
      const [algo, setAlgo] = React.useState('pca')
      const [dims, setDims] = React.useState(2)
      const [phase, setPhase] = React.useState('idle')
      const [projection, setProjection] = React.useState(null)
      const [failure, setFailure] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [recomputing, setRecomputing] = React.useState(false)
      const [hiddenTypes, setHiddenTypes] = React.useState({})
      const [activeOverlay, setActiveOverlay] = React.useState(null)
      const collectionsKey = collections.join(',')
      const projectionRef = React.useRef(null)
      projectionRef.current = projection

      React.useEffect(() => {
        setProjection(null)
        setPhase('idle')
        setFailure(null)
        setActiveOverlay(null)
      }, [kbId])

      React.useEffect(() => {
        if (!notice) return
        const timer = window.setTimeout(
          () => setNotice(null),
          notice.isError ? NOTICE_DISMISS_ERROR_MS : NOTICE_DISMISS_MS,
        )
        return () => window.clearTimeout(timer)
      }, [notice])

      const load = React.useCallback(() => {
        setPhase((current) => (current === 'ready' ? 'ready' : 'loading'))
        setFailure(null)
        callOp('vectorProjection', {
          kb_id: kbId,
          collections,
          algo,
          dims,
          sample_size: VEC_SAMPLE_SIZE,
        })
          .then((data) => {
            const points = data && Array.isArray(data.points) ? data.points : []
            setProjection(points.length > 0 ? data : null)
            setPhase(points.length > 0 ? 'ready' : 'empty')
          })
          .catch((error) => {
            setFailure(error)
            setPhase('error')
          })
      }, [kbId, collectionsKey, algo, dims]) // eslint-disable-line react-hooks/exhaustive-deps

      React.useEffect(() => {
        if (!enabled) return
        load()
      }, [enabled, load])

      const handleRecompute = () => {
        if (recomputing) return
        setRecomputing(true)
        callOp('vectorProjection', {
          kb_id: kbId,
          collections,
          algo,
          dims,
          sample_size: VEC_SAMPLE_SIZE,
          refresh: true,
        })
          .then((data) => {
            setRecomputing(false)
            const points = data && Array.isArray(data.points) ? data.points : []
            setProjection(points.length > 0 ? data : null)
            setPhase(points.length > 0 ? 'ready' : 'empty')
            setFailure(null)
          })
          .catch((error) => {
            setRecomputing(false)
            setNotice({ text: errorDetail(error), isError: true })
          })
      }

      const toggleCollection = (key) => {
        setCollections((previous) => {
          if (previous.includes(key)) {
            if (previous.length <= 1) return previous
            return VEC_COLLECTIONS.filter((entry) => entry !== key && previous.includes(entry))
          }
          return VEC_COLLECTIONS.filter((entry) => entry === key || previous.includes(entry))
        })
      }

      // 叠加取数（照工作台语义）：新触发投影一次；投影指纹变化 → 重锚；
      // 非 PCA 拒绝（query 投影仅支持缓存 PCA 模型）；409/错位 → 提示并清除。
      const projectionFp = projection ? projection.fingerprint : null
      const overlayNonceRef = React.useRef(null)
      React.useEffect(() => {
        if (!enabled || !overlayRequest) return
        const current = projectionRef.current
        if (!current) return
        if (current.algo !== algo || current.dims !== dims) return // 等新参数投影落地
        const isNew = overlayNonceRef.current !== overlayRequest
        if (isNew) overlayNonceRef.current = overlayRequest
        if (algo !== 'pca') {
          if (isNew) setNotice({ text: t('vec.overlayPcaOnly') })
          return
        }
        let cancelled = false
        callOp('projectVectorQuery', {
          kb_id: kbId,
          text: overlayRequest.text,
          collections,
          algo,
          dims,
          sample_size: VEC_SAMPLE_SIZE,
        })
          .then((result) => {
            if (cancelled) return
            const latest = projectionRef.current
            if (!result || !latest || result.fingerprint !== latest.fingerprint) {
              setActiveOverlay(null)
              setNotice({ text: t('vec.overlayStale') })
              return
            }
            setActiveOverlay({
              query: { x: result.x, y: result.y, z: result.z, label: overlayRequest.text },
              hits: Array.isArray(overlayRequest.hits) ? overlayRequest.hits : [],
              fingerprint: result.fingerprint,
            })
          })
          .catch(() => {
            if (!cancelled) setNotice({ text: t('vec.overlayFailed') })
          })
        return () => {
          cancelled = true
        }
      }, [enabled, overlayRequest, projectionFp, algo, kbId, collectionsKey, dims, t]) // eslint-disable-line react-hooks/exhaustive-deps

      const points = React.useMemo(() => (projection ? projection.points : []), [projection])
      const groups = React.useMemo(() => groupVectorPoints(points), [points])
      const opacities = React.useMemo(() => vectorGroupOpacities(groups), [groups])
      const overlayHitCounts = React.useMemo(() => {
        if (!activeOverlay) return null
        const ids = new Set(points.map((point) => point.id))
        const matched = activeOverlay.hits.filter((hit) => ids.has(hit.pointId)).length
        return { matched, total: activeOverlay.hits.length }
      }, [activeOverlay, points])

      const bar = h(
        'div',
        { className: 'hrag-vec-bar' },
        VEC_COLLECTIONS.map((key) => {
          const active = collections.includes(key)
          const color = VEC_COLORS[VEC_SOURCE_OF_COLLECTION[key]]
          return h(
            'button',
            {
              key,
              type: 'button',
              className: 'hrag-chip',
              'aria-pressed': active,
              'aria-label': t('vec.chips.' + key),
              title: t('vec.chips.' + key),
              style: active ? { borderColor: color + '80', backgroundColor: color + '1f' } : undefined,
              onClick: () => toggleCollection(key),
            },
            h('span', {
              className: 'hrag-chip-dot',
              style: { backgroundColor: color, opacity: active ? 1 : 0.4 },
            }),
          )
        }),
        projection && projection.sampled
          ? h(
              'span',
              { className: 'hrag-vec-sampled' },
              t('vec.sampled') +
                ' ' +
                String(projection.shown_points) +
                '/' +
                String(projection.total_points) +
                ' ' +
                t('vec.pointsUnit'),
            )
          : null,
        h(
          'div',
          { className: 'hrag-vec-bar-right' },
          h(
            'span',
            { className: 'hrag-seg', role: 'group', 'aria-label': t('vec.dimsLabel') },
            [2, 3].map((value) =>
              h(
                'button',
                {
                  key: value,
                  type: 'button',
                  'aria-pressed': dims === value,
                  onClick: () => setDims(value),
                },
                String(value) + 'D',
              ),
            ),
          ),
          h(
            'select',
            {
              className: 'hrag-vec-algo',
              'aria-label': t('vec.algoLabel'),
              title: t('vec.algoLabel'),
              value: algo,
              onChange: (event) => setAlgo(event.target.value),
            },
            h('option', { value: 'pca' }, 'PCA'),
            h('option', { value: 'umap' }, 'UMAP'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'hrag-btn hrag-btn-outline hrag-btn-icon',
              'aria-label': t('vec.recompute'),
              title: t('vec.recompute'),
              disabled: recomputing,
              onClick: handleRecompute,
            },
            refreshIcon(recomputing),
          ),
        ),
      )

      let body
      if (phase === 'idle' || phase === 'loading') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, t('vec.loading')))
      } else if (phase === 'error') {
        body = h(
          'div',
          { className: 'hrag-state hrag-state-error' },
          h('div', { className: 'hrag-state-title' }, t('vec.loadFailed')),
          h('div', { className: 'hrag-state-detail' }, errorDetail(failure)),
          h('button', { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: load }, t('shell.retry')),
        )
      } else if (phase === 'empty') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, t('vec.empty')))
      } else {
        body = h(
          'div',
          { className: 'hrag-vec-body' },
          h(VectorCanvas, {
            t,
            dims,
            points,
            groups,
            opacities,
            hiddenTypes,
            activeOverlay,
            onPick: (point) => {
              if (point.source_type === 'chunk' && onOpenChunk) {
                onOpenChunk(point.color_key, point.id, point.label)
              }
              // wiki/card 点 → 条目/卡片抽屉随 Task 9 接线；entity 照工作台惰性。
            },
          }),
          activeOverlay && overlayHitCounts
            ? h(
                'div',
                { className: 'hrag-vec-overlay-badge' },
                h('span', { className: 'hrag-chip-dot', style: { backgroundColor: VEC_OVERLAY_COLOR } }),
                h(
                  'span',
                  { className: 'hrag-vec-overlay-label', title: activeOverlay.query.label },
                  activeOverlay.query.label,
                ),
                h(
                  'span',
                  { className: 'hrag-vec-overlay-hits' },
                  t('vec.hitsPrefix') + ' ' + String(overlayHitCounts.matched) + '/' + String(overlayHitCounts.total),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-vec-overlay-close',
                    'aria-label': t('vec.clearOverlay'),
                    title: t('vec.clearOverlay'),
                    onClick: () => setActiveOverlay(null),
                  },
                  '✕',
                ),
              )
            : null,
          h(
            'div',
            { className: 'hrag-vec-legend' },
            groups.map((group) =>
              h(
                'button',
                {
                  key: group.sourceType,
                  type: 'button',
                  className: hiddenTypes[group.sourceType]
                    ? 'hrag-vec-legend-item hrag-vec-legend-off'
                    : 'hrag-vec-legend-item',
                  onClick: () =>
                    setHiddenTypes((previous) => ({
                      ...previous,
                      [group.sourceType]: !previous[group.sourceType],
                    })),
                },
                h('span', { className: 'hrag-chip-dot', style: { backgroundColor: group.color } }),
                t('vec.chips.' + VEC_COLLECTION_OF_SOURCE[group.sourceType]) + ' ' + String(group.points.length),
              ),
            ),
          ),
        )
      }

      return h(
        'div',
        { className: 'hrag-vec' },
        bar,
        notice
          ? h('div', { className: notice.isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice' }, notice.text)
          : null,
        body,
      )
    }

    /** 图谱画布（手写 canvas＋自研力导向，照工作台语义）：节点/边/缩放分级标签/
        hover 邻域蓝描边（加法）／三层路径叠加；拖节点、拖空白平移、滚轮缩放。
        LOD 分层（2026-10-13）：滚轮跨档重建渲染子集（照工作台 rebuildSeriesAtTier）。 */
    function GraphCanvas({ t, nodes, edges, communities, colorBy, overlayTrace, focusNode, onNodeClick, onRenderTierChange, colorMap: providedColorMap, deltaIds }) {
      const wrapRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const viewRef = React.useRef({ zoom: 1, ox: 0, oy: 0 })
      const simRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const hoverRef = React.useRef(null)
      const projectedRef = React.useRef([])
      const rafRef = React.useRef(null)
      const focusRef = React.useRef(null)
      // LOD 渲染档位（跨档重建的门闩）；上报走穿透 ref 防闭包陈旧。
      const renderTierRef = React.useRef('full')
      // 自动全览门闩（2026-10-13 他报「默认缩放偏大」）：重建/换档后置真，力场
      // 收敛期间持续拟合视口；用户一动手（滚轮/按下/搜索定位）即置假交还控制权。
      const autoFitRef = React.useRef(true)
      const tierCbRef = React.useRef(onRenderTierChange)
      tierCbRef.current = onRenderTierChange
      // 身份漂移隔离：applyTier 经 ref 取最新闭包（数据 effect 只随数据身份重跑，
      // colorBy/叠加切换引起的 draw→startSim→applyTier 链式身份变化不得触发重建）；
      // 搜索定位防重放（同一次 focusNode 只处理一次）＋稳定窗计时器句柄。
      const applyTierRef = React.useRef(null)
      const focusTokenRef = React.useRef(null)
      const recenterRef = React.useRef(null)
      const [tip, setTip] = React.useState(null)
      const [grabbing, setGrabbing] = React.useState(false)

      const internalColorMap = React.useMemo(() => buildGraphColorMap(nodes, edges), [nodes, edges])
      // 配色源（2026-10-13 七轮修）：缺省按本图节点自算；提供外部映射时优先用——
      // 局部图卡传全图映射，与主画布/抽屉芯片恒同色（子集自算恒从色号 0 起发，
      // 单社区邻域全蓝且与全图色断开——实测 8/8 复现）。
      const colorMap = providedColorMap != null ? providedColorMap : internalColorMap
      const adjacency = React.useMemo(() => buildGraphAdjacency(edges), [edges])
      const lookup = React.useMemo(() => graphOverlayLookup(overlayTrace), [overlayTrace])
      const nodeById = React.useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

      /** 单帧绘制（交互/模拟/缩放都经它落画布）。 */
      const draw = React.useCallback(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return
        const w = wrap.clientWidth
        const h = wrap.clientHeight
        if (!w || !h) return
        const dpr = window.devicePixelRatio || 1
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
        }
        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        const view = viewRef.current
        const sim = simRef.current
        const inkColor = getComputedStyle(wrap).color || '#3c3c3c'
        const cx = w / 2 + view.ox
        const cy = h / 2 + view.oy
        const toScreen = (x, y) => ({ sx: cx + x * view.zoom, sy: cy + y * view.zoom })
        // 边层。命中路径边（两端均在并集）荧光金发光；其余 ink 0.35。
        const inkLine = wrap.style.getPropertyValue('--hrag-graph-line') || inkColor
        for (const edge of edges) {
          const a = sim && sim.byId.get(edge.source)
          const b = sim && sim.byId.get(edge.target)
          if (!a || !b) continue
          const pa = toScreen(a.x, a.y)
          const pb = toScreen(b.x, b.y)
          const onPath = lookup != null && lookup.all.has(edge.source) && lookup.all.has(edge.target)
          const dx = pb.sx - pa.sx
          const dy = pb.sy - pa.sy
          const len = Math.hypot(dx, dy) || 1
          // 端点裁到节点圆边界外（2026-10-13：原线到圆心、箭头也画在圆心，整段
          // 被节点圆盖住——工作台里箭头在符号边界外；种子按放大后半径裁）。
          const nodeA = nodeById.get(edge.source)
          const nodeB = nodeById.get(edge.target)
          const trimA = nodeA ? (graphNodeSize(nodeA.mention_count) / 2) * (lookup != null && lookup.seeds.has(nodeA.id) ? GRAPH_SEED_SIZE_BOOST : 1) + 2 : 0
          const trimB = nodeB ? (graphNodeSize(nodeB.mention_count) / 2) * (lookup != null && lookup.seeds.has(nodeB.id) ? GRAPH_SEED_SIZE_BOOST : 1) + 2 : 0
          if (len <= trimA + trimB + 4) continue // 短边两端裁帽重叠：整边被节点盖住，跳过
          const ux = dx / len
          const uy = dy / len
          const ax = pa.sx + ux * trimA
          const ay = pa.sy + uy * trimA
          const bx = pb.sx - ux * trimB
          const by = pb.sy - uy * trimB
          // 轻微弧线防并行边重叠（照工作台 curveness 0.1）。
          const mx = (pa.sx + pb.sx) / 2 + (-dy / len) * len * 0.1
          const my = (pa.sy + pb.sy) / 2 + (dx / len) * len * 0.1
          // 箭头切线（控制点→尖端）；线体终点收在箭头底边（尖端回退 7px）——线不
          // 垫进三角肚里，避免双半透明叠加透出线痕（2026-10-13 截图实证）。
          const angle = Math.atan2(by - my, bx - mx)
          const baseX = bx - 7 * Math.cos(angle)
          const baseY = by - 7 * Math.sin(angle)
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.quadraticCurveTo(mx, my, baseX, baseY)
          if (onPath) {
            ctx.strokeStyle = GRAPH_EXPANSION_BORDER
            ctx.lineWidth = 2
            ctx.globalAlpha = 0.8
            ctx.shadowColor = GRAPH_EXPANSION_BORDER
            ctx.shadowBlur = 8
          } else {
            ctx.strokeStyle = inkColor
            ctx.lineWidth = 1
            ctx.globalAlpha = 0.35
            ctx.shadowBlur = 0
          }
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
          // 箭头（照工作台 edgeSymbol arrow size 6）：尖端在目标端节点边界外。
          ctx.beginPath()
          ctx.moveTo(baseX + 3.2 * Math.sin(angle), baseY - 3.2 * Math.cos(angle))
          ctx.lineTo(bx, by)
          ctx.lineTo(baseX - 3.2 * Math.sin(angle), baseY + 3.2 * Math.cos(angle))
          ctx.closePath()
          ctx.fillStyle = onPath ? GRAPH_EXPANSION_BORDER : inkColor
          ctx.globalAlpha = onPath ? 0.8 : 0.35
          ctx.fill()
          ctx.globalAlpha = 1
        }
        // 节点层。
        const hover = hoverRef.current
        const hoverSet = hover ? new Set([hover.id, ...(adjacency.get(hover.id) || [])]) : null
        const tier =
          view.zoom < GRAPH_LABEL_HIDE_BELOW ? 'hidden' : view.zoom < GRAPH_LABEL_FULL_ABOVE ? 'important' : 'full'
        const projected = []
        const labelBoxes = []
        const list = sim ? sim.items : []
        for (const item of list) {
          const node = nodeById.get(item.id)
          if (!node) continue
          const p = toScreen(item.x, item.y)
          projected.push({ sx: p.sx, sy: p.sy, r: graphNodeSize(node.mention_count) / 2 + 3, node })
        }
        for (const entry of projected) {
          const { node } = entry
          const ownColor =
            colorBy === 'community' ? graphCommunityColor(node.community, colorMap) : graphTypeColor(node.type)
          const isSeed = lookup != null && lookup.seeds.has(node.id)
          const isHit = isSeed || (lookup != null && lookup.evidence.has(node.id))
          const isHop = !isHit && lookup != null && lookup.hops.has(node.id)
          let radius = entry.r - 3
          if (isSeed) radius *= GRAPH_SEED_SIZE_BOOST
          ctx.beginPath()
          ctx.arc(entry.sx, entry.sy, radius, 0, Math.PI * 2)
          ctx.fillStyle = ownColor
          ctx.fill()
          // 描边与发光：叠加层（红命中/金路径）优先，hover 蓝为临时聚焦。
          ctx.shadowBlur = 0
          if (isHit) {
            ctx.strokeStyle = GRAPH_HIT_BORDER
            ctx.lineWidth = 3
            ctx.shadowColor = GRAPH_HIT_BORDER
            ctx.shadowBlur = 12
          } else if (isHop) {
            ctx.strokeStyle = GRAPH_EXPANSION_BORDER
            ctx.lineWidth = 2
          } else if (deltaIds && deltaIds.has(node.id)) {
            // 二跳新增圈（金细边，与叠加「扩展金」同语言、无发光）：一跳→二跳
            // 的增量可视（10-13 报「一跳变二跳不易看出」）。
            ctx.strokeStyle = GRAPH_EXPANSION_BORDER
            ctx.lineWidth = 2
          } else if (hoverSet && hoverSet.has(node.id)) {
            ctx.strokeStyle = GRAPH_HOVER_BORDER
            ctx.lineWidth = 3
            ctx.shadowColor = GRAPH_HOVER_BORDER
            ctx.shadowBlur = 8
          } else {
            ctx.strokeStyle = inkColor
            ctx.lineWidth = 1
            ctx.globalAlpha = 0.35
          }
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
          // 标签：缩放分级 + 悬停单体常显 + 贪心防重叠（照工作台 hideOverlap）。
          const hovered = hover != null && hover.id === node.id
          let label = ''
          if (hovered) label = node.id
          else if (tier === 'full') label = node.id
          else if (tier === 'important' && node.mention_count >= GRAPH_IMPORTANT_MENTION) label = node.id
          if (label) {
            ctx.font = '11px sans-serif'
            const lx = entry.sx + radius + 4
            const ly = entry.sy + 4
            const width = ctx.measureText(label).width
            const box = { x: lx - 1, y: ly - 11, w: width + 2, h: 13 }
            let overlaps = false
            for (const other of labelBoxes) {
              if (
                box.x < other.x + other.w &&
                box.x + box.w > other.x &&
                box.y < other.y + other.h &&
                box.y + box.h > other.y
              ) {
                overlaps = true
                break
              }
            }
            if (!overlaps || hovered) {
              labelBoxes.push(box)
              ctx.fillStyle = inkColor
              ctx.globalAlpha = 0.75
              ctx.fillText(label, lx, ly)
              ctx.globalAlpha = 1
            }
          }
        }
        projectedRef.current = projected
      }, [nodes, edges, colorBy, adjacency, lookup, nodeById, colorMap, deltaIds])

      // 力导向模拟（2026-10-13 二轮：逐公式对齐工作台 echarts forceHelper）。
      // 位置域三力 + Verlet 积分，顺序与源码一致：先弹簧（逐边）、再重力（逐点）、
      // 再斥力（两两、只累计进「上一位置」pp）、最后积分（p += (p−pp)·friction）。
      const startSim = React.useCallback(() => {
        const step = () => {
          const sim = simRef.current
          if (!sim) return
          const { items, links, byId } = sim
          const n = items.length
          const friction = sim.friction
          // ① 弹簧（逐边）：p += 单位方向·(|Δ|−理想长)·w·friction——短于理想长反向
          // 推开（防重叠）；w = rep_b/(rep_a+rep_b) = 0.5（均匀权重）。
          for (const edge of links) {
            const a = byId.get(edge.source)
            const b = byId.get(edge.target)
            if (!a || !b || a === b) continue
            let dx = b.x - a.x
            let dy = b.y - a.y
            let dist = Math.hypot(dx, dy)
            if (dist === 0) {
              dx = Math.random() - 0.5
              dy = Math.random() - 0.5
              dist = Math.hypot(dx, dy) || 1
            }
            const push = ((dist - GRAPH_EDGE_LENGTH) * friction) / dist
            if (!a.fixed) {
              a.x += dx * push * 0.5
              a.y += dy * push * 0.5
            }
            if (!b.fixed) {
              b.x -= dx * push * 0.5
              b.y -= dy * push * 0.5
            }
          }
          // ② 重力（逐点）：p += (中心−p)·gravity·friction，中心 = 世界原点（画布
          // 中心；roam 平移不改布局）。线性强压实——旧速度域微重力的根因替身。
          for (const item of items) {
            if (item.fixed) continue
            item.x -= item.x * GRAPH_GRAVITY * friction
            item.y -= item.y * GRAPH_GRAVITY * friction
          }
          // ③ 斥力（两两）：位移 = 2·repulsion/d，累计进 pp（Verlet 口径——用「上一
          // 位置」制造反向速度）；fixed 节点整体豁免。
          for (let i = 0; i < n; i += 1) {
            const a = items[i]
            for (let j = i + 1; j < n; j += 1) {
              const b = items[j]
              let dx = b.x - a.x
              let dy = b.y - a.y
              let dist = Math.hypot(dx, dy)
              if (dist === 0) {
                dx = Math.random() - 0.5
                dy = Math.random() - 0.5
                dist = 1
              }
              const repFact = (GRAPH_REPULSION + GRAPH_REPULSION) / (dist * dist)
              if (!a.fixed) {
                a.ppx += dx * repFact
                a.ppy += dy * repFact
              }
              if (!b.fixed) {
                b.ppx -= dx * repFact
                b.ppy -= dy * repFact
              }
            }
          }
          // ④ 积分（逐点）：p += (p−pp)·friction；pp 同步为新 p。
          for (const item of items) {
            if (item.fixed) continue
            const vx = item.x - item.ppx
            const vy = item.y - item.ppy
            item.x += vx * friction
            item.y += vy * friction
            item.ppx = item.x
            item.ppy = item.y
          }
          // 自动全览（2026-10-13 他报「默认缩放偏大」——初始应为全图入画的
          // 缩略态）：收敛期间每帧按当前包围盒拟合视口（八折留边），只缩不放
          // （上限 zoom 1，小图行为不变）、下限受 GRAPH_MIN_SCALE 夹取。
          if (autoFitRef.current) {
            const wrap = wrapRef.current
            const w = wrap ? wrap.clientWidth : 0
            const h = wrap ? wrap.clientHeight : 0
            if (w > 0 && h > 0 && items.length > 0) {
              let minX = Infinity
              let maxX = -Infinity
              let minY = Infinity
              let maxY = -Infinity
              for (const item of items) {
                if (item.x < minX) minX = item.x
                if (item.x > maxX) maxX = item.x
                if (item.y < minY) minY = item.y
                if (item.y > maxY) maxY = item.y
              }
              const boxW = Math.max(80, maxX - minX)
              const boxH = Math.max(80, maxY - minY)
              // 全览态不露文字（10-13 他二报）：需要缩放的图把拟合值再夹到标签
              // 隐藏阈之下（strictly < 0.6 才 hidden，取 0.96 倍防边界）；本来就
              // 装得下（rawFit ≥ 1）的小图维持 zoom 1，行为不变。
              const rawFit = Math.min(w / boxW, h / boxH) * 0.8
              const fit = rawFit >= 1 ? 1 : Math.min(rawFit, GRAPH_LABEL_HIDE_BELOW * 0.96)
              const zoom = Math.max(GRAPH_MIN_SCALE, Math.min(GRAPH_MAX_SCALE, fit))
              viewRef.current = { zoom, ox: -((minX + maxX) / 2) * zoom, oy: -((minY + maxY) / 2) * zoom }
            }
          }
          sim.friction *= GRAPH_FRICTION_DECAY
          draw()
          if (sim.friction > GRAPH_FRICTION_MIN) {
            rafRef.current = window.requestAnimationFrame(step)
          } else {
            rafRef.current = null
          }
        }
        if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
        rafRef.current = window.requestAnimationFrame(step)
      }, [draw])

      // 换档重建（照工作台 rebuildSeriesAtTier，2026-10-13）：渲染子集 = 档位裁剪
      // （hub 枢纽层／重要层／full 全量）；幸存节点保位、新点画布内随机撒点；力场
      // 从 friction 0.6 重启（跨档 = 布局重跑的既定语义，与工作台 series 重建一致）。
      const applyTier = React.useCallback(
        (tier, refit = true) => {
          const sim = simRef.current
          const keep = graphTierNodeIds(nodes, communities, tier)
          const wrap = wrapRef.current
          const initW = (wrap && wrap.clientWidth) || 600
          const initH = (wrap && wrap.clientHeight) || 400
          const items = []
          const byId = new Map()
          for (const node of nodes) {
            if (keep !== null && !keep.has(node.id)) continue
            const prev = sim ? sim.byId.get(node.id) : null
            const x = prev ? prev.x : initW * (Math.random() - 0.5)
            const y = prev ? prev.y : initH * (Math.random() - 0.5)
            const item = { id: node.id, x, y, ppx: x, ppy: y, fixed: false }
            items.push(item)
            byId.set(node.id, item)
          }
          simRef.current = {
            items,
            byId,
            links: edges
              .filter((edge) => byId.has(edge.source) && byId.has(edge.target))
              .map((edge) => ({ source: edge.source, target: edge.target })),
            friction: GRAPH_FRICTION,
          }
          renderTierRef.current = tier
          if (tierCbRef.current) tierCbRef.current(tier)
          // refit：数据重建/初载＝真（自动全览）；滚轮跨档/搜索升档＝假（用户
          // 正在操作视口——不得夺回；搜索路径已先置假并自行居中）。
          if (refit) autoFitRef.current = true
          startSim()
        },
        [nodes, edges, communities, startSim],
      )
      applyTierRef.current = applyTier

      React.useEffect(() => {
        // 重建触发面（照工作台 notMerge 语义，2026-10-13 二改修正）：数据变化与
        // colorBy 切换都整图重建（视口复位＋布局重跑＋随机撒点——工作台 data
        // effect 的 deps 就含 colorBy，notMerge 下 preservedPoints 丢失即随机重排）；
        // 叠加切换走 merge 直绘不重建（照工作台 overlay effect 分工）。
        simRef.current = null
        const zoom = graphInitialZoomForGraph(nodes.length)
        viewRef.current = { zoom, ox: 0, oy: 0 }
        hoverRef.current = null
        applyTierRef.current(graphRenderTierForZoom(zoom, nodes.length))
        return () => {
          if (rafRef.current !== null) {
            window.cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
        }
      }, [nodes, edges, communities, colorBy])

      // 搜索定位：命中节点居中 + 高亮（zoom 1.6，照工作台 GRAPH_FOCUS_ZOOM）。
      // 命中不在当前渲染子集（hub/重要层）→ 升档重建（照工作台搜索升档）；重建后
      // 力场重启、坐标仍会漂——1000ms 稳定窗后再居中一次（近似 FOCUS_SETTLE_MS）。
      // 防重放：同一次 focusNode 只处理一次（draw/applyTier 身份漂移不重放定位）。
      React.useEffect(() => {
        if (!focusNode) return
        if (focusTokenRef.current === focusNode) return
        focusTokenRef.current = focusNode
        autoFitRef.current = false
        if (recenterRef.current !== null) {
          window.clearTimeout(recenterRef.current)
          recenterRef.current = null
        }
        const sim = simRef.current
        if (!sim) return
        let item = sim.byId.get(focusNode.id)
        if (!item) {
          applyTierRef.current(graphRenderTierForZoom(GRAPH_FOCUS_ZOOM, nodes.length), false)
          item = simRef.current.byId.get(focusNode.id)
          if (!item) return // guide 熔断兜底（tab 层已先行判定并提示）：无物可居中
          recenterRef.current = window.setTimeout(() => {
            recenterRef.current = null
            const current = simRef.current
            const moved = current && current.byId.get(focusNode.id)
            if (!moved) return
            viewRef.current = { zoom: GRAPH_FOCUS_ZOOM, ox: -moved.x * GRAPH_FOCUS_ZOOM, oy: -moved.y * GRAPH_FOCUS_ZOOM }
            draw()
          }, 1000)
        }
        viewRef.current = { zoom: GRAPH_FOCUS_ZOOM, ox: -item.x * GRAPH_FOCUS_ZOOM, oy: -item.y * GRAPH_FOCUS_ZOOM }
        hoverRef.current = { id: focusNode.id }
        focusRef.current = focusNode.id
        draw()
      }, [focusNode, draw, applyTier, nodes.length])

      React.useEffect(() => {
        draw()
      }, [draw])

      React.useEffect(() => {
        const wrap = wrapRef.current
        if (!wrap) return
        const observer = new ResizeObserver(() => draw())
        observer.observe(wrap)
        return () => observer.disconnect()
      }, [draw])

      // 滚轮缩放（0.3–3，照工作台 scaleLimit；锚光标）。
      React.useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const onWheel = (event) => {
          event.preventDefault()
          autoFitRef.current = false
          const rect = canvas.getBoundingClientRect()
          const mx = event.clientX - rect.left
          const my = event.clientY - rect.top
          const view = viewRef.current
          const factor = Math.exp(-event.deltaY * 0.0012)
          const next = Math.min(GRAPH_MAX_SCALE, Math.max(GRAPH_MIN_SCALE, view.zoom * factor))
          const real = next / view.zoom
          view.ox = mx - rect.width / 2 - (mx - rect.width / 2 - view.ox) * real
          view.oy = my - rect.height / 2 - (my - rect.height / 2 - view.oy) * real
          view.zoom = next
          // LOD 跨档（照工作台 roam 判定，2026-10-13）：档位变 → 子集重建＋力场
          // 重启；同档直绘（点成本）。≤500 小库恒 full，永不进重建分支。
          const nextTier = graphRenderTierForZoom(next, nodes.length)
          if (nextTier !== renderTierRef.current) {
            applyTier(nextTier, false)
          } else {
            draw()
          }
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
      }, [draw, applyTier, nodes.length])

      const pick = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const mx = event.clientX - rect.left
        const my = event.clientY - rect.top
        const projected = projectedRef.current
        for (let i = projected.length - 1; i >= 0; i -= 1) {
          const entry = projected[i]
          const dx = mx - entry.sx
          const dy = my - entry.sy
          if (dx * dx + dy * dy <= entry.r * entry.r) return { entry, mx, my }
        }
        return null
      }

      const handleMove = (event) => {
        const drag = dragRef.current
        if (drag) {
          const dx = event.clientX - drag.x
          const dy = event.clientY - drag.y
          if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) drag.moved = true
          drag.x = event.clientX
          drag.y = event.clientY
          if (drag.kind === 'pan') {
            viewRef.current.ox += dx
            viewRef.current.oy += dy
          } else if (drag.item) {
            drag.item.x += dx / viewRef.current.zoom
            drag.item.y += dy / viewRef.current.zoom
            // 拖动中钉住该点（照 GraphView：setFixed 令力场豁免），每个 drag 事件
            // warmUp（friction 回 0.6×0.8）并确保迭代在跑——邻居随拉力沉降。
            drag.item.fixed = true
            const sim = simRef.current
            if (sim) {
              sim.friction = GRAPH_FRICTION * 0.8
              if (rafRef.current === null) startSim()
            }
          }
          draw()
          return
        }
        const found = pick(event)
        if (found) {
          const id = found.entry.node.id
          const prev = hoverRef.current
          hoverRef.current = { id }
          setTip({ x: found.mx + 12, y: found.my + 12, node: found.entry.node })
          if (!prev || prev.id !== id) {
            draw()
          }
        } else if (tip) {
          hoverRef.current = null
          setTip(null)
          draw()
        }
      }

      const handleDown = (event) => {
        if (event.button !== 0) return // 仅左键起拖拽/点击（照工作台：右/中键不触发）
        autoFitRef.current = false
        const found = pick(event)
        dragRef.current = {
          kind: found ? 'node' : 'pan',
          item: found && simRef.current ? simRef.current.byId.get(found.entry.node.id) : null,
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
        }
        setGrabbing(true)
      }

      const handleUp = (event) => {
        const drag = dragRef.current
        dragRef.current = null
        setGrabbing(false)
        if (drag && drag.item) {
          // 解钉并把 pp 同步到当前位（照 echarts setUnfixed；pp 同步是本实现的
          // 补丁——固定期间积分被跳过，pp 滞留拖拽起点，不同步会以陈旧速度弹跳）。
          drag.item.fixed = false
          drag.item.ppx = drag.item.x
          drag.item.ppy = drag.item.y
        }
        if (drag && !drag.moved) {
          const found = pick(event)
          if (found && onNodeClick) onNodeClick(found.entry.node)
        }
      }

      const handleLeave = () => {
        const drag = dragRef.current
        dragRef.current = null
        setGrabbing(false)
        if (drag && drag.item) {
          drag.item.fixed = false
          drag.item.ppx = drag.item.x
          drag.item.ppy = drag.item.y
        }
        if (tip) setTip(null)
        if (hoverRef.current && focusRef.current !== (hoverRef.current && hoverRef.current.id)) {
          hoverRef.current = null
          draw()
        }
      }

      return h(
        'div',
        { className: 'hrag-graph-canvas', ref: wrapRef },
        h('canvas', {
          ref: canvasRef,
          style: { cursor: grabbing ? 'grabbing' : tip ? 'pointer' : 'grab' },
          onMouseDown: handleDown,
          onMouseMove: handleMove,
          onMouseUp: handleUp,
          onMouseLeave: handleLeave,
        }),
        tip
          ? h(
              'div',
              { className: 'hrag-vec-tip', style: { left: String(tip.x) + 'px', top: String(tip.y) + 'px' } },
              h('span', { className: 'hrag-vec-tip-label' }, vecTruncate(tip.node.id, VEC_TOOLTIP_MAX)),
              tip.node.description
                ? h('span', { className: 'hrag-vec-tip-preview' }, vecTruncate(tip.node.description, 40))
                : null,
            )
          : null,
      )
    }

    /** 图谱视图（Task 7）：工具栏（实体搜索／着色切换）＋画布＋统计/叠加徽标；
        点击实体开「实体抽屉」（描述＋关联切片 #K → 切片抽屉，链式复用）；召回
        「在图谱中查看」叠加三层路径高亮。keep-alive；enabled 门控首次取数。 */
    function GraphView({ t, kbId, enabled, overlayRequest, onOpenChunk }) {
      const [phase, setPhase] = React.useState('idle')
      const [graph, setGraph] = React.useState(null)
      const [failure, setFailure] = React.useState(null)
      const [colorBy, setColorBy] = React.useState('community')
      const [query, setQuery] = React.useState('')
      const [focusNode, setFocusNode] = React.useState(null)
      const [selected, setSelected] = React.useState(null)
      const [positions, setPositions] = React.useState(null)
      const [docNames, setDocNames] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [activeOverlay, setActiveOverlay] = React.useState(null)
      // LOD 渲染档位（画布上报；guide 档显示右上角引导提示）。
      const [renderTier, setRenderTier] = React.useState('full')
      // 局部图跳数（2026-10-13 六轮定形：详情「局部图」卡放抽屉最下、卡内直接
      // 显示邻居子图、去掉「查看局部图」行钮——标题栏图标钮一点，卡内图直接重裁）。
      const [hopDraft, setHopDraft] = React.useState(1)
      const overlayNonceRef = React.useRef(null)
      const graphFp = graph ? graph.stats.node_count + ':' + graph.stats.edge_count : null
      const communityColorMap = React.useMemo(
        () => (graph ? buildGraphColorMap(graph.nodes, graph.edges) : new Map()),
        [graph],
      )
      // 详情卡内直显的邻居子图（N 跳 BFS，照工作台 filterNeighborhood 口径）；
      // 仅实体抽屉打开时计算，跳数钮一动即重裁（六轮定形）。
      const drawerNeighborhood = React.useMemo(() => {
        if (!graph || !selected) return null
        return graphNeighborhood(graph.nodes, graph.edges, selected.id, hopDraft)
      }, [graph, selected, hopDraft])
      // 二跳新增圈（10-13 报「一跳变二跳不易看出」）：仅列 2 跳新增节点（2 跳
      // 子集 − 1 跳子集），卡内画布对它们描金细边（与叠加「扩展金」同语言）。
      const drawerDeltaIds = React.useMemo(() => {
        if (!graph || !selected || hopDraft !== 2 || !drawerNeighborhood) return null
        const oneIds = new Set(
          graphNeighborhood(graph.nodes, graph.edges, selected.id, 1).nodes.map((node) => node.id),
        )
        const delta = new Set()
        for (const node of drawerNeighborhood.nodes) {
          if (!oneIds.has(node.id)) delta.add(node.id)
        }
        return delta
      }, [graph, selected, hopDraft, drawerNeighborhood])

      React.useEffect(() => {
        setGraph(null)
        setPhase('idle')
        setSelected(null)
        setActiveOverlay(null)
        setDocNames(null)
        setRenderTier('full')
        overlayNonceRef.current = null
      }, [kbId])

      React.useEffect(() => {
        if (!notice) return
        const timer = window.setTimeout(() => setNotice(null), NOTICE_DISMISS_MS)
        return () => window.clearTimeout(timer)
      }, [notice])

      const load = React.useCallback(() => {
        setPhase((current) => (current === 'ready' ? 'ready' : 'loading'))
        setFailure(null)
        callOp('knowledgeGraph', { kb_id: kbId })
          .then((data) => {
            const nodes = data && Array.isArray(data.nodes) ? data.nodes : []
            setGraph(nodes.length > 0 ? data : null)
            setPhase(nodes.length > 0 ? 'ready' : 'empty')
          })
          .catch((error) => {
            setFailure(error)
            setPhase('error')
          })
      }, [kbId])

      React.useEffect(() => {
        if (!enabled) return
        load()
      }, [enabled, load])

      // 文档名映射（实体抽屉切片行用；静默拉取，失败不打扰）。
      React.useEffect(() => {
        if (!enabled || docNames !== null) return
        callOp('listDocuments', { kb_id: kbId })
          .then((rows) => {
            const map = new Map()
            for (const doc of Array.isArray(rows) ? rows : []) map.set(String(doc.id), String(doc.name))
            setDocNames(map)
          })
          .catch(() => setDocNames(new Map()))
      }, [enabled, kbId, docNames])

      // 叠加消费（召回跳转）：图就绪后应用；同一请求不重复（nonce 去重）。
      React.useEffect(() => {
        if (!enabled || !overlayRequest || !graph) return
        if (overlayNonceRef.current === overlayRequest.nonce) return
        overlayNonceRef.current = overlayRequest.nonce
        setActiveOverlay({ text: overlayRequest.text, trace: overlayRequest.trace, fingerprint: graphFp })
      }, [enabled, overlayRequest, graph, graphFp])

      // 指纹漂移（文档增删改）→ 旧叠加留在图上是误导：清除并提示（照工作台）。
      React.useEffect(() => {
        if (activeOverlay && graphFp && activeOverlay.fingerprint !== graphFp) {
          setActiveOverlay(null)
          setNotice(t('graph.overlayStale'))
        }
      }, [graphFp, activeOverlay, t])

      const handleSearch = (event) => {
        event.preventDefault()
        const needle = query.trim().toLowerCase()
        if (!needle || !graph) return
        const hit = graph.nodes.find((node) => String(node.id).toLowerCase().includes(needle))
        if (!hit) {
          setNotice(t('graph.searchNoMatch'))
          return
        }
        // 定位档可达性（照工作台 isNodeRenderedAtZoom）：熔断档（>2000）里长尾实体
        // 不在渲染子集时无法居中——直接提示，不派发注定落空的定位。
        const kept = graphTierNodeIds(
          graph.nodes,
          graph.communities || [],
          graphRenderTierForZoom(GRAPH_FOCUS_ZOOM, graph.nodes.length),
        )
        if (kept !== null && !kept.has(hit.id)) {
          setNotice(t('graph.focusHidden'))
          return
        }
        setFocusNode({ id: hit.id, token: Date.now() })
      }

      // 实体抽屉：拉关联切片位次（「切片 #K」同词表；失败静默空）。
      React.useEffect(() => {
        setPositions(null)
        if (!selected) return
        const ids = Array.isArray(selected.source_chunk_ids) ? selected.source_chunk_ids : []
        if (ids.length === 0) return
        let cancelled = false
        callOp('chunkPositions', { kb_id: kbId, chunk_ids: ids })
          .then((data) => {
            if (!cancelled) setPositions(data && data.positions ? data.positions : {})
          })
          .catch(() => {
            if (!cancelled) setPositions({})
          })
        return () => {
          cancelled = true
        }
      }, [selected, kbId])

      // 切片行排序：文档名 → #K 升序（照工作台；缺位次排末尾保持稳定序）。
      const orderedChunks = React.useMemo(() => {
        if (!selected) return []
        const ids = Array.isArray(selected.source_chunk_ids) ? selected.source_chunk_ids : []
        const docOf = (chunkId) => {
          const sep = String(chunkId).lastIndexOf('#')
          return sep > 0 ? String(chunkId).slice(0, sep) : ''
        }
        return ids
          .map((chunkId, index) => ({ chunkId, index }))
          .sort((a, b) => {
            const nameA = docNames ? docNames.get(docOf(a.chunkId)) || '' : ''
            const nameB = docNames ? docNames.get(docOf(b.chunkId)) || '' : ''
            if (nameA !== nameB) return nameA < nameB ? -1 : 1
            const posA = positions && positions[a.chunkId] != null ? positions[a.chunkId] : Number.MAX_SAFE_INTEGER
            const posB = positions && positions[b.chunkId] != null ? positions[b.chunkId] : Number.MAX_SAFE_INTEGER
            return posA - posB || a.index - b.index
          })
      }, [selected, docNames, positions])

      const bar = h(
        'div',
        { className: 'hrag-graph-bar' },
        h(
          'form',
          { className: 'hrag-graph-search', onSubmit: handleSearch },
          h('input', {
            type: 'text',
            className: 'hrag-input',
            placeholder: t('graph.searchEntities'),
            'aria-label': t('graph.searchEntities'),
            value: query,
            onChange: (event) => setQuery(event.target.value),
          }),
        ),
        h(
          'span',
          { className: 'hrag-seg', role: 'group', 'aria-label': t('graph.colorByCommunity') },
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': colorBy === 'community',
              onClick: () => setColorBy('community'),
            },
            t('graph.colorByCommunity'),
          ),
          h(
            'button',
            {
              type: 'button',
              'aria-pressed': colorBy === 'type',
              onClick: () => setColorBy('type'),
            },
            t('graph.colorByType'),
          ),
        ),
      )

      let body
      if (phase === 'idle' || phase === 'loading') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, t('graph.loading')))
      } else if (phase === 'error') {
        body = h(
          'div',
          { className: 'hrag-state hrag-state-error' },
          h('div', { className: 'hrag-state-title' }, t('graph.loadFailed')),
          h('div', { className: 'hrag-state-detail' }, errorDetail(failure)),
          h('button', { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: load }, t('shell.retry')),
        )
      } else if (phase === 'empty') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, t('graph.empty')))
      } else {
        const trace = activeOverlay ? activeOverlay.trace : null
        const layers = trace
          ? {
              seeds: (trace.seed_entities || []).length,
              expanded: (trace.expanded_nodes || []).length,
              evidence: (trace.evidence_entities || []).length,
            }
          : null
        const stats = graph.stats || { node_count: graph.nodes.length, edge_count: graph.edges.length, community_count: 0 }
        body = h(
          'div',
          { className: 'hrag-graph-body' },
          h(GraphCanvas, {
            t,
            nodes: graph.nodes,
            edges: graph.edges,
            communities: graph.communities || [],
            colorBy,
            overlayTrace: trace,
            focusNode,
            onNodeClick: (node) => setSelected(node),
            onRenderTierChange: setRenderTier,
          }),
          renderTier === 'guide'
            ? h('span', { className: 'hrag-graph-guide' }, t('graph.guideHint'))
            : null,
          activeOverlay && layers
            ? h(
                'div',
                { className: 'hrag-vec-overlay-badge' },
                h('span', { className: 'hrag-chip-dot', style: { backgroundColor: GRAPH_HIT_BORDER } }),
                h('span', { className: 'hrag-vec-overlay-label', title: activeOverlay.text }, activeOverlay.text),
                h(
                  'span',
                  { className: 'hrag-vec-overlay-hits' },
                  t('graph.overlaySeeds') +
                    ' ' + String(layers.seeds) +
                    ' · ' + t('graph.overlayExpanded') +
                    ' ' + String(layers.expanded) +
                    ' · ' + t('graph.overlayEvidence') +
                    ' ' + String(layers.evidence),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-vec-overlay-close',
                    'aria-label': t('graph.clearOverlay'),
                    title: t('graph.clearOverlay'),
                    onClick: () => setActiveOverlay(null),
                  },
                  '✕',
                ),
              )
            : null,
          h(
            'span',
            { className: 'hrag-graph-stats' },
            String(stats.node_count) + ' ' + t('graph.entitiesUnit') +
              ' · ' + String(stats.edge_count) + ' ' + t('graph.relationsUnit') +
              ' · ' + String(stats.community_count) + ' ' + t('graph.communitiesUnit'),
          ),
        )
      }

      const entityDrawer = selected
        ? h(
            'div',
            { className: 'hrag-graph-drawer' },
            h('div', { className: 'hrag-drawer-overlay', onClick: () => setSelected(null) }),
            h(
              'div',
              { className: 'hrag-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': String(selected.id) },
              h(
                'div',
                { className: 'hrag-drawer-head' },
                h('span', { className: 'hrag-drawer-title', title: String(selected.id) }, String(selected.id)),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-btn-outline hrag-drawer-close',
                    'aria-label': t('chunk.close'),
                    onClick: () => setSelected(null),
                  },
                  '✕',
                ),
              ),
              h(
                'div',
                { className: 'hrag-drawer-body hrag-graph-drawer-body' },
                h(
                  'div',
                  { className: 'hrag-gchips' },
                  selected.type
                    ? h(
                        'span',
                        { className: 'hrag-gchip' },
                        h('span', { className: 'hrag-chip-dot', style: { backgroundColor: graphTypeColor(selected.type) } }),
                        String(selected.type),
                      )
                    : null,
                  h(
                    'span',
                    { className: 'hrag-gchip' },
                    t('graph.mentionsPre') + ' ' + String(selected.mention_count) + ' ' + t('graph.mentionsPost'),
                  ),
                  h(
                    'span',
                    { className: 'hrag-gchip' },
                    h('span', {
                      className: 'hrag-chip-dot',
                      style: { backgroundColor: graphCommunityColor(selected.community, communityColorMap) },
                    }),
                    t('graph.communityBadgePre') + String(selected.community),
                  ),
                ),
                h(
                  'div',
                  { className: 'hrag-gcard' },
                  h('div', { className: 'hrag-gcard-head' }, t('graph.entityDescription')),
                  h(
                    'div',
                    { className: selected.description ? 'hrag-gcard-body' : 'hrag-gcard-body hrag-gcard-empty' },
                    selected.description || t('graph.entityNoDescription'),
                  ),
                ),
                h(
                  'div',
                  { className: 'hrag-gcard' },
                  h(
                    'div',
                    { className: 'hrag-gcard-head' },
                    t('graph.relatedChunks'),
                    h('span', { className: 'hrag-gcard-count' }, String((orderedChunks || []).length)),
                  ),
                  orderedChunks.length === 0
                    ? h('div', { className: 'hrag-gcard-body hrag-gcard-empty' }, t('graph.entityNoChunks'))
                    : h(
                        'div',
                        { className: 'hrag-gchunk-list' },
                        orderedChunks.map((entry) => {
                          const chunkId = entry.chunkId
                          const sep = String(chunkId).lastIndexOf('#')
                          const docId = sep > 0 ? String(chunkId).slice(0, sep) : ''
                          const docName = docNames
                            ? docNames.get(docId) || t('graph.unknownDoc')
                            : t('graph.unknownDoc')
                          const position = positions ? positions[chunkId] : null
                          return h(
                            'button',
                            {
                              key: chunkId,
                              type: 'button',
                              className: 'hrag-gchunkrow',
                              disabled: !docId,
                              onClick: () => {
                                if (docId && onOpenChunk) onOpenChunk(docId, chunkId, docName)
                              },
                            },
                            h('span', { className: 'hrag-gchunkrow-name' }, docName),
                            position != null
                              ? h('span', { className: 'hrag-gchunkrow-pos' }, t('graph.slicePosPre') + String(position))
                              : null,
                            h('span', { className: 'hrag-gchunkrow-chevron' }, '›'),
                          )
                        }),
                      ),
                ),
                h(
                  'div',
                  { className: 'hrag-gcard' },
                  h(
                    'div',
                    { className: 'hrag-gcard-head' },
                    t('graph.neighborhoodTitle'),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-gcard-iconbtn',
                        'aria-label': hopDraft === 2 ? t('graph.hop2') : t('graph.hop1'),
                        title: hopDraft === 2 ? t('graph.hop2') : t('graph.hop1'),
                        onClick: () => setHopDraft(hopDraft === 2 ? 1 : 2),
                      },
                      graphHopIcon(hopDraft),
                    ),
                  ),
                  drawerNeighborhood
                    ? h(
                        'div',
                        { className: 'hrag-gcard-graph' },
                        h(GraphCanvas, {
                          t,
                          nodes: drawerNeighborhood.nodes,
                          edges: drawerNeighborhood.edges,
                          communities: graph.communities || [],
                          colorBy,
                          colorMap: communityColorMap,
                          deltaIds: drawerDeltaIds,
                          overlayTrace: activeOverlay ? activeOverlay.trace : null,
                          focusNode: null,
                          onNodeClick: (node) => setSelected(node),
                        }),
                      )
                    : null,
                ),
              ),
            ),
          )
        : null

      return h(
        'div',
        { className: 'hrag-graph' },
        bar,
        notice
          ? h('div', { className: notice.isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice' }, notice.text)
          : null,
        body,
        entityDrawer,
      )
    }

    /** 文档面板：列表＋行内动作（重试只对 failed/降级出现；删除走级联确认）。
        照工作台词汇；随 kb 或壳刷新重载。 */
    function DocsView({ t, kbId, refreshToken, onOpenChunks }) {
      const [phase, setPhase] = React.useState('loading')
      const [docs, setDocs] = React.useState([])
      const [failure, setFailure] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [deleteTarget, setDeleteTarget] = React.useState(null)
      const [dialogError, setDialogError] = React.useState(null)
      const [busy, setBusy] = React.useState(false)

      const load = React.useCallback(() => {
        setPhase('loading')
        setFailure(null)
        callOp('listDocuments', { kb_id: kbId })
          .then((rows) => {
            const list = Array.isArray(rows) ? rows : []
            setDocs(list)
            setPhase(list.length === 0 ? 'empty' : 'ready')
          })
          .catch((error) => {
            setFailure(error)
            setPhase('error')
          })
      }, [kbId])

      React.useEffect(() => {
        load()
      }, [load, refreshToken])

      // 在飞自刷（照工作台 documentsRefetchInterval 谓词）：任一篇非终态，
      // 或任一篇的 wiki 腿仍 generating（库级镜像，索引结束后还会动），
      // 每 3s 静默重取；静默＝不翻 phase、失败保当前视图（下一拍重试）。
      const poll = React.useCallback(() => {
        callOp('listDocuments', { kb_id: kbId })
          .then((rows) => {
            const list = Array.isArray(rows) ? rows : []
            setDocs(list)
            setPhase(list.length === 0 ? 'empty' : 'ready')
          })
          .catch(() => {})
      }, [kbId])

      React.useEffect(() => {
        const moving =
          docs.some((doc) => doc.status !== 'ready' && doc.status !== 'failed') ||
          docs.some((doc) => doc.path_status && doc.path_status.wiki === 'generating')
        if (!moving) return
        const timer = window.setInterval(poll, PIPELINE_POLL_MS)
        return () => window.clearInterval(timer)
      }, [docs, poll])

      const retry = (doc) => {
        setNotice(null)
        setBusy(true)
        callOp('retryDocument', { kb_id: kbId, doc_id: doc.id })
          .then(() => {
            setBusy(false)
            setNotice({ text: t('doc.retrySubmitted') })
            load()
          })
          .catch((error) => {
            setBusy(false)
            setNotice({ text: errorDetail(error), isError: true })
          })
      }

      const confirmDelete = () => {
        setBusy(true)
        setDialogError(null)
        callOp('deleteDocument', { kb_id: kbId, doc_id: deleteTarget.id })
          .then(() => {
            setBusy(false)
            setDeleteTarget(null)
            load()
          })
          .catch((error) => {
            setBusy(false)
            setDialogError(errorDetail(error))
          })
      }

      let body
      if (phase === 'loading') {
        body = h('div', { className: 'hrag-pane' }, t('doc.loading'))
      } else if (phase === 'error') {
        body = h(
          'div',
          { className: 'hrag-state hrag-state-error' },
          h('div', { className: 'hrag-state-title' }, t('doc.listFailed')),
          h('div', { className: 'hrag-state-detail' }, errorDetail(failure)),
          h('button', { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: load }, t('shell.retry')),
        )
      } else if (phase === 'empty') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, t('doc.empty')))
      } else {
        const counts = {}
        for (const doc of docs) counts[doc.status] = (counts[doc.status] || 0) + 1
        const summary = Object.keys(counts)
          .map((key) => (DOC_STATUS_KEYS[key] ? t(DOC_STATUS_KEYS[key]) : key) + ' ' + counts[key])
          .join(' · ')
        body = h(
          'div',
          null,
          h('div', { className: 'hrag-docsum' }, summary),
          h(
            'div',
            { className: 'hrag-docs' },
            docs.map((doc) => {
            const degraded = isDegraded(doc)
            const statusKey = DOC_STATUS_KEYS[doc.status]
            let meta = statusKey ? t(statusKey) : String(doc.status)
            if (doc.status === 'indexing') meta += ' ' + String(doc.progress_percent) + '%'
            if (degraded) meta += ' · ' + t('doc.degraded')
            return h(
              'div',
              { className: 'hrag-docrow', key: String(doc.id) },
              h(
                'div',
                {
                  className: 'hrag-docrow-main',
                  onClick: () => {
                    if (onOpenChunks) onOpenChunks(doc)
                  },
                },
                h('span', { className: 'hrag-docrow-name', title: String(doc.name) }, String(doc.name)),
                h(
                  'span',
                  { className: 'hrag-docrow-actions' },
                  doc.status === 'failed' || degraded
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'hrag-btn hrag-btn-sm hrag-btn-outline',
                          disabled: busy,
                          title: degraded ? t('doc.degradedRetryHint') : String(doc.error || ''),
                          onClick: (event) => {
                            event.stopPropagation()
                            retry(doc)
                          },
                        },
                        t('doc.retry'),
                      )
                    : null,
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'hrag-btn hrag-btn-sm hrag-btn-outline',
                      disabled: busy,
                      onClick: (event) => {
                        event.stopPropagation()
                        setDialogError(null)
                        setDeleteTarget(doc)
                      },
                    },
                    t('doc.delete'),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'hrag-docrow-meta' },
                h(
                  'span',
                  {
                    className: doc.status === 'failed' ? 'hrag-docrow-status hrag-docrow-status-failed' : 'hrag-docrow-status',
                    title: doc.error || undefined,
                  },
                  meta,
                ),
                h(
                  'span',
                  { className: 'hrag-docrow-chunks' },
                  doc.chunk_count == null ? '—' : String(doc.chunk_count) + ' ' + t('doc.chunksUnit'),
                ),
              ),
            )
          }),
          ),
        )
      }

      return h(
        React.Fragment,
        null,
        notice
          ? h('div', { className: notice.isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice' }, notice.text)
          : null,
        body,
        deleteTarget
          ? h(ConfirmDialog, {
              t,
              title: t('doc.deleteTitle'),
              description: t('doc.deleteDescription'),
              error: dialogError,
              busy,
              onCancel: () => setDeleteTarget(null),
              onConfirm: confirmDelete,
            })
          : null,
      )
    }

    function KnowledgePanel({ t }) {
      const [phase, setPhase] = React.useState('loading')
      const [kbs, setKbs] = React.useState([])
      const [failure, setFailure] = React.useState(null)
      const [kbId, setKbId] = React.useState('')
      const [section, setSection] = React.useState('docs')
      const [refreshToken, setRefreshToken] = React.useState(0)
      const [drawer, setDrawer] = React.useState(null)
      const [uploading, setUploading] = React.useState(false)
      const [barNotice, setBarNotice] = React.useState(null)
      const [acceptedSuffixes, setAcceptedSuffixes] = React.useState(null)
      const [reindexOpen, setReindexOpen] = React.useState(false)
      const [reindexBusy, setReindexBusy] = React.useState(false)
      const [reindexError, setReindexError] = React.useState(null)
      // 重建状态（照工作台 useReindexStatus＋isReindexRunning）：在飞由端点
      // 派生（reindexBusy＝点击→首次轮询的缝隙），空闲示上次结果行。
      const [reindexState, setReindexState] = React.useState(null)
      const [reindexKick, setReindexKick] = React.useState(0)
      const reindexRunning =
        reindexBusy || (reindexState !== null && reindexState.in_progress === true)
      // 检索联动叠加（照工作台「在向量空间查看」）：召回触发 → 切投影分区并投影。
      const [overlayRequest, setOverlayRequest] = React.useState(null)
      // 图谱联动叠加（Task 7「在图谱中查看」）：召回触发 → 切图谱分区并高亮路径。
      const [graphOverlayRequest, setGraphOverlayRequest] = React.useState(null)
      const fileInputRef = React.useRef(null)

      const load = React.useCallback(() => {
        setPhase('loading')
        setFailure(null)
        callOp('listKbs')
          .then((rows) => {
            const list = Array.isArray(rows) ? rows : []
            setKbs(list)
            setKbId((current) => current || String((list[0] && list[0].id) || ''))
            setPhase(list.length === 0 ? 'empty' : 'ready')
          })
          .catch((error) => {
            setFailure(error)
            setPhase('error')
          })
      }, [])

      React.useEffect(() => {
        load()
      }, [load])

      // Upload accept list — the service's allowlist is the source of truth.
      React.useEffect(() => {
        if (phase !== 'ready' || acceptedSuffixes !== null) return
        callOp('supportedFormats')
          .then((data) => {
            const list = data && Array.isArray(data.suffixes) ? data.suffixes : []
            setAcceptedSuffixes(
              list.map((suffix) => (String(suffix).startsWith('.') ? String(suffix) : '.' + String(suffix))),
            )
          })
          .catch(() => setAcceptedSuffixes([]))
      }, [phase, acceptedSuffixes])

      // 切库清残留：旧库的提示行与重建状态不得跨库留存。
      React.useEffect(() => {
        setBarNotice(null)
        setReindexState(null)
        setOverlayRequest(null)
        setGraphOverlayRequest(null)
      }, [kbId])

      // 提示行自动消退（工作台 toast 语义：短确认；持久真值在列表与状态行）。
      React.useEffect(() => {
        if (!barNotice) return
        const timer = window.setTimeout(
          () => setBarNotice(null),
          barNotice.isError ? NOTICE_DISMISS_ERROR_MS : NOTICE_DISMISS_MS,
        )
        return () => window.clearTimeout(timer)
      }, [barNotice])

      // 重建状态取样（照工作台 useReindexStatus：in_progress 时 3s 轮询，
      // 空闲停拍；reindexKick 复刻「202 后立即＋1s 二次失效」的点击缝隙补拍）。
      React.useEffect(() => {
        if (phase !== 'ready' || !kbId) return
        let cancelled = false
        let timer = null
        const tick = () => {
          callOp('reindexStatus', { kb_id: kbId })
            .then((data) => {
              if (cancelled) return
              const state = data && typeof data === 'object' ? data : null
              setReindexState(state)
              if (state && state.in_progress === true) timer = window.setTimeout(tick, PIPELINE_POLL_MS)
            })
            .catch(() => {
              if (!cancelled) setReindexState(null)
            })
        }
        tick()
        return () => {
          cancelled = true
          if (timer !== null) window.clearTimeout(timer)
        }
      }, [phase, kbId, reindexBusy, reindexRunning, reindexKick])

      const handleUpload = (fileList) => {
        if (!kbId || uploading) return
        const files = Array.from(fileList || [])
        if (files.length === 0) return
        setUploading(true)
        setBarNotice(null)
        const results = []
        const runNext = (index) => {
          if (index >= files.length) {
            const ok = results.filter((entry) => entry.ok).length
            const failed = results.length - ok
            setUploading(false)
            if (failed === 0) {
              setBarNotice({ text: String(ok) + ' ' + t('upload.submittedUnit') })
            } else {
              const firstFailure = results.find((entry) => !entry.ok)
              setBarNotice({
                text:
                  String(ok) +
                  ' ' +
                  t('upload.submittedUnit') +
                  ' · ' +
                  String(failed) +
                  ' ' +
                  t('upload.failedUnit') +
                  '：' +
                  firstFailure.detail,
                isError: true,
              })
            }
            setRefreshToken((value) => value + 1)
            return
          }
          callUpload(kbId, files[index])
            .then(() => {
              results.push({ ok: true })
              runNext(index + 1)
            })
            .catch((error) => {
              results.push({ ok: false, detail: errorDetail(error) })
              runNext(index + 1)
            })
        }
        runNext(0)
      }

      const confirmReindex = () => {
        setReindexBusy(true)
        setReindexError(null)
        callOp('reindex', { kb_id: kbId })
          .then((data) => {
            setReindexBusy(false)
            setReindexOpen(false)
            const status = data && data.status
            setBarNotice({ text: status === 'already_running' ? t('reindex.alreadyRunning') : t('reindex.enqueued') })
            // 202 先于后台标志翻位返回：立即＋1s 二次取样（照工作台双重失效）。
            setReindexKick((value) => value + 1)
            window.setTimeout(() => setReindexKick((value) => value + 1), 1000)
          })
          .catch((error) => {
            setReindexBusy(false)
            setReindexError(errorDetail(error))
          })
      }

      // 重建状态行（照工作台 functional-models-view 的三态文本）。
      let reindexLine = null
      if (reindexRunning) {
        const progress = reindexState && reindexState.progress
        reindexLine = progress
          ? t('reindex.running') +
            ' ' + String(progress.documents_done) + '/' + String(progress.documents_total) +
            ' · ' + t('reindex.chunksWritten') +
            ' ' +
            String(
              (progress.chunks_indexed || 0) +
                (progress.entities_indexed || 0) +
                (progress.wiki_entries_indexed || 0) +
                (progress.cards_indexed || 0),
            )
          : t('reindex.running')
      } else if (reindexState && reindexState.last_run === 'succeeded') {
        reindexLine = t('reindex.lastSucceeded')
      } else if (reindexState && reindexState.last_run === 'failed') {
        reindexLine = t('reindex.lastFailed')
      }

      let content
      if (phase === 'loading') {
        content = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, t('shell.loading')))
      } else if (phase === 'error') {
        content = h(
          'div',
          { className: 'hrag-state hrag-state-error' },
          h('div', { className: 'hrag-state-title' }, t('shell.errorTitle')),
          h('div', { className: 'hrag-state-detail' }, (failure && failure.info && failure.info.detail) || String(failure)),
          h('button', { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: load }, t('shell.retry')),
        )
      } else if (phase === 'empty') {
        content = h(
          'div',
          { className: 'hrag-state' },
          h('div', { className: 'hrag-state-title' }, t('shell.empty')),
          h('div', { className: 'hrag-state-detail' }, t('shell.emptyHint')),
          h('button', { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: load }, t('shell.refresh')),
        )
      } else {
        content = h(
          'div',
          { className: 'hrag-shell' },
          h(
            'div',
            { className: 'hrag-bar' },
            h(
              'select',
              {
                value: kbId,
                'aria-label': t('shell.kbLabel'),
                onChange: (event) => setKbId(event.target.value),
              },
              kbs.map((kb) =>
                h('option', { key: String(kb.id), value: String(kb.id) }, String(kb.name || kb.id)),
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'hrag-btn hrag-btn-outline',
                onClick: () => {
                  load()
                  setRefreshToken((value) => value + 1)
                },
              },
              t('shell.refresh'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'hrag-btn hrag-btn-outline',
                disabled: uploading,
                title: t('shell.upload'),
                onClick: () => {
                  const input = fileInputRef.current
                  if (input) input.click()
                },
              },
              uploading ? t('upload.uploading') : t('shell.upload'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'hrag-btn hrag-btn-outline',
                disabled: reindexBusy || reindexRunning,
                title: t('reindex.button'),
                onClick: () => {
                  setReindexError(null)
                  setReindexOpen(true)
                },
              },
              t('reindex.button'),
            ),
          ),
          reindexLine
            ? h('div', { className: 'hrag-reindex-status' }, reindexLine)
            : null,
          h('input', {
            type: 'file',
            multiple: true,
            ref: fileInputRef,
            style: { display: 'none' },
            accept: acceptedSuffixes && acceptedSuffixes.length > 0 ? acceptedSuffixes.join(',') : undefined,
            onChange: (event) => {
              handleUpload(event.target.files)
              event.target.value = ''
            },
          }),
          barNotice
            ? h('div', { className: barNotice.isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice' }, barNotice.text)
            : null,
          h(
            'div',
            { className: 'hrag-tabs', style: { '--hrag-tabs': String(SECTIONS.length) }, role: 'tablist' },
            SECTIONS.map((entry) =>
              h(
                'button',
                {
                  key: entry.id,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': section === entry.id,
                  className: 'hrag-tab',
                  onClick: () => setSection(entry.id),
                },
                t(entry.label),
              ),
            ),
          ),
          section === 'docs'
            ? h(DocsView, {
                t,
                kbId,
                refreshToken,
                onOpenChunks: (doc) => setDrawer({ doc, focus: null }),
              })
            : null,
          section === 'recall'
            ? h(RecallView, {
                t,
                kbId,
                onOpenChunk: (chunkId, docName) => {
                  const docId = String(chunkId).split('#')[0]
                  setDrawer({ doc: { id: docId, name: docName || docId }, focus: chunkId })
                },
                onViewInVectorSpace: (request) => {
                  setOverlayRequest(Object.assign({}, request, { nonce: Date.now() }))
                  setSection('vectors')
                },
                onViewInGraphSpace: (request) => {
                  setGraphOverlayRequest(Object.assign({}, request, { nonce: Date.now() }))
                  setSection('graph')
                },
              })
            : null,
          // 投影视图 keep-alive（照工作台 forceMount 语义）：切走不丢配置与叠加；
          // enabled 门控首次取数——没打开过投影就不发请求。
          h(
            'div',
            { className: 'hrag-vec-slot', style: { display: section === 'vectors' ? 'flex' : 'none' } },
            h(VectorView, {
              t,
              kbId,
              enabled: section === 'vectors',
              overlayRequest,
              onOpenChunk: (docId, chunkId, docName) => {
                setDrawer({ doc: { id: docId, name: docName || docId }, focus: chunkId })
              },
            }),
          ),
          // 图谱视图 keep-alive（同投影口径）：切走不丢视口与叠加。
          h(
            'div',
            { className: 'hrag-graph-slot', style: { display: section === 'graph' ? 'flex' : 'none' } },
            h(GraphView, {
              t,
              kbId,
              enabled: section === 'graph',
              overlayRequest: graphOverlayRequest,
              onOpenChunk: (docId, chunkId, docName) => {
                setDrawer({ doc: { id: docId, name: docName || docId }, focus: chunkId })
              },
            }),
          ),
        )
      }

      return h(
        React.Fragment,
        null,
        h(Styles),
        h(
          'div',
          { className: 'hrag-root' },
          content,
          drawer
            ? h(ChunkDrawer, {
                t,
                kbId,
                doc: drawer.doc,
                focusChunkId: drawer.focus,
                refreshToken,
                onClose: () => setDrawer(null),
              })
            : null,
          reindexOpen
            ? h(ConfirmDialog, {
                t,
                title: t('reindex.confirmTitle'),
                description: t('reindex.confirmDescription'),
                error: reindexError,
                busy: reindexBusy,
                cancelKey: 'doc.cancel',
                confirmKey: 'reindex.confirmAction',
                onCancel: () => setReindexOpen(false),
                onConfirm: confirmReindex,
              })
            : null,
        ),
      )
    }

    return {
      inject: ['slots', 'sidebarRightTabs', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'harness-rag: dictionaries')
        const t = ctx.locale.bind(NS)
        ctx.effect(
          () =>
            ctx.sidebarRightTabs.register({
              id: 'dsh-harness-rag',
              kind: 'harness-rag',
              title: () => t('tab.title'),
              guide: [
                {
                  id: 'open',
                  order: 200,
                  title: () => t('tab.title'),
                  description: () => t('tab.description'),
                },
              ],
            }),
          'harness-rag: tab type',
        )
        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.right.pane.tab', () =>
              ctx.slots.register(
                { name: 'sidebar.right.pane.tab', key: 'dsh-harness-rag', locale: NS },
                KnowledgePanel,
              ),
            ),
          'harness-rag: tab body',
        )
      },
    }
  },
})
