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
          '.hrag-shell { display: flex; flex-direction: column; gap: 10px; padding: 12px; min-width: 0; }',
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
    function RecallView({ t, kbId, onOpenChunk }) {
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

    /** Documents pane: list + row actions (retry gated to failed/degraded
     * documents; delete behind the cascade confirmation). Copy follows the
     * workbench; reloads on kb or shell-refresh changes. */
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
            : section === 'recall'
              ? h(RecallView, {
                  t,
                  kbId,
                  onOpenChunk: (chunkId, docName) => {
                    const docId = String(chunkId).split('#')[0]
                    setDrawer({ doc: { id: docId, name: docName || docId }, focus: chunkId })
                  },
                })
              : h('div', { className: 'hrag-pane' }, t('shell.viewPending')),
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
