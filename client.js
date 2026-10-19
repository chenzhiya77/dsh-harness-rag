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

    // 宿主设计系统（批 2 起新写控件直用宿主件）：种子表基线包，旗舰样板同款。
    // require 失败回退原生元素——插件不该因宿主换一个名字就整个客户端半失效。
    let hostPrimitives = null
    try {
      hostPrimitives = require('@deepseek-ai/dsh-client-ui-primitives')
    } catch (cause) {
      hostPrimitives = null
    }
    const HostInput = hostPrimitives && hostPrimitives.Input ? hostPrimitives.Input : 'input'
    // Task 6：菜单/图标/Toast 直用宿主件（缺件才回退——图标回退＝既有手刻路径，菜单回退＝极简列表）。
    const HostMenu = hostPrimitives && hostPrimitives.Menu ? hostPrimitives.Menu : null
    const HostToast = hostPrimitives && hostPrimitives.Toast ? hostPrimitives.Toast : null
    const HostTooltip = hostPrimitives && hostPrimitives.Tooltip ? hostPrimitives.Tooltip : null
    const HostSwitch = hostPrimitives && hostPrimitives.Switch ? hostPrimitives.Switch : null
    const hostIcon = (name) => (hostPrimitives && hostPrimitives[name] ? hostPrimitives[name] : null)
    // 转圈件＝宿主 StateDot(ongoing)：自带旋转/相位同步/reduced-motion；自绘 CSS 环（粗边方头）退役；缺件＝不渲染。
    const HostStateDot = hostIcon('StateDot')
    const stateDot = (size) => (HostStateDot ? h(HostStateDot, { state: 'ongoing', size, className: 'hrag-statedot' }) : null)
    // 切片面（②档乙对 Task 2）：MarkdownText 渲染器与 SegmentedControl 两态钮直用宿主件；
    // 缺件回退＝pre-wrap 正文／自绘两钮（本常量在 factory 求值期捕获一次）。
    const HostMarkdownText = hostPrimitives && hostPrimitives.MarkdownText ? hostPrimitives.MarkdownText : null
    const HostSegmentedControl = hostPrimitives && hostPrimitives.SegmentedControl ? hostPrimitives.SegmentedControl : null
    // 剪贴板（②档乙对 Task 3）：宿主 writeClipboard 有件直用（含 execCommand 兜底）；缺件回退 navigator.clipboard。
    const HostWriteClipboard = hostPrimitives && hostPrimitives.writeClipboard ? hostPrimitives.writeClipboard : null

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
      'reindex.kbLabel': '目标知识库',
      'reindex.kbPlaceholder': '选择知识库',
      'shell.kbLabel': '知识库',
      'shell.tab.docs': '文档',
      'shell.tabs.more': '更多标签页',
      'shell.tab.recall': '召回',
      'shell.tab.vectors': '投影',
      'shell.tab.graph': '图谱',
      'shell.viewPending': '此分区实装中',
      'doc.loading': '正在加载文档…',
      'doc.empty': '上传或拖拽文件开始构建索引',
      'doc.dropToUpload': '释放以上传到当前知识库',
      'doc.dropUnsupported': '该格式暂不支持',
      // 状态六腿悬停分解（小件批 Task 4，照工作台 pathStatus 字典逐字）。
      'doc.path.asr': '语音',
      'doc.path.segment': '分镜',
      'doc.path.caption': '配文',
      'doc.path.vector': '向量',
      'doc.path.graph': '图谱',
      'doc.path.wiki': '百科',
      'doc.path.libraryHint': '（库级）',
      'doc.path.state.pending': '待处理',
      'doc.path.state.indexing': '索引中',
      'doc.path.state.done': '已完成',
      'doc.path.state.degraded': '部分降级',
      'doc.path.state.failed': '失败',
      'doc.path.state.generating': '生成中',
      'doc.path.state.ready': '已生成',
      'doc.search': '搜索文档…',
      'doc.searchClear': '清空搜索',
      'doc.noMatch': '没有匹配的文档',
      'doc.sort': '排序方式',
      'doc.sortCreatedAt': '上传时间',
      'doc.sortName': '名称',
      'doc.sortSize': '大小',
      'doc.sortChunks': '切片数',
      'doc.sortAsc': '升序',
      'doc.sortDesc': '降序',
      // 列体系（doc-columns 对 Task 1）：表头列名（照工作台 table.* 逐字）。
      'doc.thName': '名称',
      'doc.thStatus': '状态',
      'doc.thUploader': '上传者',
      'doc.thTime': '时间',
      'doc.thSize': '大小',
      'doc.thChunks': '切片数',
      // 底栏统计行（doc-columns 对 Task 1 修订＝B3 收编，照工作台 statsDocuments/
      // statsChunks 逐字）：文档 N · 切片 N · 总大小。
      'doc.statsDocuments': '文档',
      'doc.statsChunks': '切片',
      // 列设置与行菜单（doc-columns 对 Task 2/3，照工作台 table.*／行 ⋯ 词汇逐字）：
      // 表头 chevron「列选项」菜单、表头右键与「列」总控同项集、行 ⋯/右键双入口。
      'doc.colMenu': '列选项',
      'doc.colHide': '隐藏列',
      'doc.columns': '列',
      'doc.colShowAll': '全部显示',
      'doc.colTimeFormat': '时间格式',
      'doc.colAbsolute': '绝对',
      'doc.colRelative': '相对',
      'doc.colSizeUnit': '单位',
      'doc.openChunks': '查看切片',
      'doc.downloadOriginal': '下载原文',
      'doc.listFailed': '文档列表加载失败',
      'doc.status.uploaded': '待解析',
      'doc.status.parsing': '解析中',
      'doc.status.chunking': '切片中',
      'doc.status.indexing': '索引中',
      'doc.status.ready': '就绪',
      'doc.status.failed': '失败',
      'doc.degraded': '部分降级',
      'doc.uploaderMe': '我',
      'doc.retry': '重试',
      'doc.retrySubmitted': '已提交重试',
      'doc.degradedRetryHint': '部分产物未成功，可重试补齐',
      'doc.generateQuestion': '生成考题',
      'doc.genQuestionBatch': '生成考题（联合）',
      'doc.selectedCount': '已选 {0} 项',
      'doc.selectAll': '全选',
      'doc.selectDocument': '选择文档',
      'doc.deleteSelected': '删除所选',
      'doc.cancelSelection': '取消选择',
      'doc.err.empty': '文件内容为空',
      'doc.err.unsupported': '不支持的文件类型',
      'doc.err.retryLimit': '解析服务多次重试仍失败，请检查文件是否损坏或稍后重试',
      'doc.err.serviceUnconfigured': '文档解析服务未配置，请联系管理员',
      'doc.err.timeout': '解析超时，请重试',
      'doc.err.indexIncomplete': '文档索引不完整，部分切片未能入库，请重试',
      'doc.err.noIndexableContent': '文档没有可索引的内容，请检查文件内容',
      'doc.err.unknown': '处理失败，请重试',
      'doc.err.title': '文档处理失败',
      'doc.err.dismissAll': '全部关闭',
      'doc.err.dismiss': '关闭',
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
      'chunk.tickAria': '切片',
      'chunk.notLoaded': '未加载',
      'chunk.current': '当前',
      'chunk.prevChunk': '上一切片',
      'chunk.nextChunk': '下一切片',
      'chunk.deletePreviewTitle': '删除预览',
      'chunk.orphanedEntities': '将失格删除的实体',
      'chunk.affectedEntities': '将受影响的实体',
      'chunk.relationDeletions': '将删除的关系数',
      'chunk.deleteWarning': '删除不可恢复',
      'chunk.confirmDelete': '确认删除',
      'chunk.deleteSuccess': '切片已删除',
      'chunk.deleteFailed': '删除失败',
      'chunk.timecode': '时间码',
      'chunk.entities': '实体',
      'chunk.tokens': 'tokens',
      'chunk.edited': '已编辑',
      // 渲染/原始两态钮（②档乙对 Task 2，逐字照工作台 chunk-card viewRendered/viewRaw）。
      'chunk.viewRendered': '渲染视图',
      'chunk.viewRaw': '原始文本',
      // 宿主 MarkdownText 代码块/脚注 chrome（逐字照宿主 locale 六键：copy/copied/codeBlock.*/markdown.footnotes）。
      'markdown.copy': '复制',
      'markdown.copied': '复制成功',
      'markdown.codeTitle': '代码块',
      'markdown.wrap': '自动换行',
      'markdown.unwrap': '取消自动换行',
      'markdown.footnotes': '脚注',
      // 视频镜头条＋播放器（②档乙对 Task 3，逐字照工作台 chunkDrawer 时间码/播放器族）。
      'chunk.playShot': '播放此镜头',
      'chunk.copyTimecode': '复制时间码',
      'chunk.copiedTimecode': '时间码已复制',
      'chunk.copyTimecodeFailed': '复制失败',
      'chunk.frameMissing': '关键帧缺失',
      'chunk.playerHint': '点击镜头时间码或缩略图即可跳转播放',
      // 切片编辑＋重抽（②档乙对 Task 4，逐字照工作台 chunkDrawer 编辑族）。
      'chunk.edit': '编辑',
      'chunk.save': '保存',
      'chunk.editHint': '实体与 Wiki 不会自动更新，如需以新内容重建实体请使用『重新抽取』',
      'chunk.updateSuccess': '切片已更新',
      'chunk.updateFailed': '更新失败',
      'chunk.reExtract': '重新抽取',
      'chunk.reExtractCost': '将消耗 1 次 LLM 抽取调用',
      'chunk.reExtracting': '抽取中…',
      'chunk.reExtractHint': '正在抽取实体，请稍候…',
      'chunk.reExtractSuccess': '重抽取完成，实体已更新',
      'chunk.reExtractFailed': '重抽取失败',
      'chunk.reExtractProcessing': '文档正在处理中，请稍后重试',
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
      // ③档批 G 组（照工作台 vectorSpace 逐字）：全量搜索＋范围＋更多选项＋索引提示。
      'vec.searchAll': '搜索…',
      'vec.searchScopeLabel': '搜索范围',
      'vec.searchScopes.all': '全部',
      'vec.searchScopes.chunks': '文档',
      'vec.searchScopes.entities': '实体',
      'vec.searchScopes.wiki': '百科',
      'vec.searchScopes.cards': '条目',
      'vec.moreOptions': '更多选项',
      'vec.indexingHint': '{0} 个文档索引中，投影可能不完整',
      'recall.viewInGraphSpace': '在知识图谱查看',
      'recall.evidenceView': '证据 {0}',
      'recall.entitiesView': '实体 {0}',
      'recall.slicePosition': '切片 #{0}',
      'recall.wikiAnchorTooltip': '人工卡片无源切片：勾选仅记录预期路径，不产生切片锚定',
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
      'sort.asc': '升序',
      'sort.desc': '降序',
      'sort.title': '排序',
      // ── 评测（Task 8）：词汇照工作台 tk.eval / recallTest.saveAsQuestion ──
      'shell.tab.eval': '评测',
      'ev.viewsLabel': '评测视图切换',
      'ev.view.overview': '总览',
      'ev.view.questions': '题库',
      'ev.view.history': '历史',
      'ev.tierQuick': '快速评测',
      'ev.tierFull': '完整评测',
      'ev.tierMenuAria': '评测档位',
      'ev.runPhase': '{0} {1}/{2}',
      'ev.phaseLayer1': '检索评测',
      'ev.phaseQuestions': '答题评测',
      'ev.phaseRagas': '质量评估',
      'ev.failedCount': '失败 {0}',
      'ev.etaEstimating': '估算中…',
      'ev.etaMinutes': '预计剩余 ~{0} 分钟',
      'ev.etaSeconds': '预计剩余 ~{0}s',
      'ev.logWaiting': '评测已启动，等待首个进度事件…',
      'ev.logPhase': '进入{0}',
      'ev.logItem': '{0} {1}/{2}',
      'ev.logFail': '{0} {1}/{2}，累计失败 {3}',
      'ev.bannerAria': '{0}，整体完成 {1}%',
      'ev.loading': '加载中…',
      'ev.loadFailed': '评测数据加载失败',
      'ev.moreOptions': '更多选项',
      'ev.neverRan': '尚未评测',
      'ev.slotSummary': '{0} · 耗时 {1}',
      'ev.slotSummaryFailed': '评测失败',
      'ev.slotSummaryCancelled': '评测已终止',
      'ev.slotViewHistory': '查看历史',
      'ev.durSeconds': '{0}s',
      'ev.durMinutes': '{0}m',
      'ev.durMinutesSeconds': '{0}m {1}s',
      'ev.runStartedToast': '评测已开始',
      'ev.alreadyRunningToast': '已有评测正在运行',
      'ev.runFailedToast': '评测触发失败',
      'ev.cancelRun': '终止评测',
      'ev.cancelConfirm': '确认终止?',
      'ev.cancelToast': '评测已终止',
      'ev.cancelFailedToast': '终止评测失败',
      'ev.fullRun.dialogTitle': '运行完整评测',
      'ev.fullRun.dialogBody':
        '完整评测会先跑检索质量指标，再让 Agent 实跑每道题并由独立 Judge 打分（含 RAGAS 指标）。耗时与 token 成本远高于快速评测，运行期间不可重复触发。',
      'ev.fullRun.scopeAll': '运行范围：全库所有考题。',
      'ev.fullRun.scopeSelected': '运行范围：所选 {0} 题。',
      'ev.fullRun.confirm': '开始完整评测',
      'ev.fullRun.cancel': '取消',
      'ev.layer1Title': '检索质量',
      'ev.layer2Title': '生成质量',
      'ev.layer1Note':
        '检索阶段的确定性指标，结果可复现。\n命中率：正确内容进入检索结果的问题占比\n召回率@k：前 k 条结果覆盖正确内容的比例\nMRR：首条正确结果越靠前得分越高\n路径准确率：图谱检索路径选择正确的占比',
      'ev.layer2Note': '生成阶段指标；RAGAS 为概率性指标（judge 方差），仅供参考',
      'ev.regressionBadge': '检测到回退',
      'ev.ragasMissingBadge': 'ragas 未安装',
      'ev.ragasErrorBadge': 'ragas 运行异常',
      'ev.emptyLayer1': '尚无检索质量数据',
      'ev.emptyLayer2': '尚无生成质量数据',
      'ev.viewTrace': '查看 trace →',
      'ev.tableCategory': '分类',
      'ev.tableHitRate': '命中率',
      'ev.tableRecallAtK': '召回率@k',
      'ev.tableRecallAtKv': '召回率@{0}',
      'ev.tableMrr': 'MRR',
      'ev.tablePathAccuracy': '路径准确率',
      'ev.category.fact': '事实',
      'ev.category.relation': '关系',
      'ev.category.concept': '概念',
      'ev.category.global': '全局',
      'ev.category.summary': '汇总',
      'ev.noGraphQuestions': '本批次无 graph 类题目',
      'ev.ragasGroupLabel': 'RAGAS 概率性指标',
      'ev.archGroupLabel': '引用与图谱指标',
      'ev.ragasCard.faithfulness': '忠实度',
      'ev.ragasCard.answerRelevancy': '相关性',
      'ev.ragasCard.contextPrecision': '精确率',
      'ev.ragasCard.contextRecall': '召回率',
      'ev.cardNote.faithfulness': '忠实度（Faithfulness）：答案是否有检索内容支撑、有无编造，0–1 越高越好',
      'ev.cardNote.answerRelevancy': '答案相关性（Answer Relevancy）：答案与问题的相关程度，0–1 越高越好',
      'ev.cardNote.contextPrecision': '上下文精确率（Context Precision）：检索结果中相关内容排在前列的比例，0–1 越高越好',
      'ev.cardNote.contextRecall': '上下文召回率（Context Recall）：检索内容覆盖答案所需信息的程度，0–1 越高越好',
      'ev.citationPrecision': '引用准确率',
      'ev.citationRecall': '引用召回率',
      'ev.seedHitRate': '实体命中率',
      'ev.routingHitRate': '路由命中率',
      'ev.cardNote.citationPrecision': '引用准确率（Citation Precision）：被引用的切片中真正支撑答案的比例',
      'ev.cardNote.citationRecall': '引用召回率（Citation Recall）：答案中应当引用的内容被实际引用的比例',
      'ev.cardNote.seedHitRate': '实体命中率（Seed Entity Hit Rate）：命中预设种子实体的图谱类问题占比',
      'ev.cardNote.routingHitRate':
        '路由命中率（Routing Hit Rate）：真实对话链路中 agent 实际调用的检索工具命中题目预期路径的问题占比；与检索质量的路径准确率（离线检索选路）口径不同',
      'ev.trendTitle': '指标趋势',
      'ev.granularityLabel': '时间窗口',
      'ev.granularity.day': '日',
      'ev.granularity.week': '周',
      'ev.granularity.month': '月',
      'ev.emptyTrend': '暂无评测趋势数据',
      'ev.trend.thresholdLabel': '回退阈值 -{0}%',
      'ev.trend.baselineUpdate': '基线更新',
      'ev.trend.clickForDetail': '点击查看详情',
      'ev.trend.regressionPrefix': '回退题型',
      'ev.trend.notRunInTier': '该档未跑',
      'ev.trend.pickerTrigger': '指标',
      'ev.trend.pickerAria': '选择趋势指标',
      'ev.trend.fullTierOnly': '仅完整档',
      'ev.selection.selectAllAria': '全选',
      'ev.selection.rowSelectAria': '选择「{0}」',
      'ev.selection.selected': '已选 {0} 题',
      'ev.selection.clear': '清除选择',
      'ev.questions.columnQuery': '问题',
      'ev.questions.columnCategory': '分类',
      'ev.questions.columnRefChunks': '参考切片',
      'ev.questions.columnRecallNote': '该题在最近一次包含它的评测中，参考切片被命中的比例（跨运行合并）；未测题为 —',
      'ev.questions.sortDefault': '默认顺序',
      'ev.questions.sortDocsCount': '文档数',
      'ev.questions.recallTip': '召回 {0} · 实际 {1}',
      'ev.questions.recallUntested': '未测或上次运行未包含',
      'ev.questions.unanchored': '未锚定',
      'ev.questions.danglingBadge': '悬空',
      'ev.questions.danglingHint': '参考切片 {0} 个，悬空 {1} 个',
      'ev.questions.mismatchBadge': '存疑',
      'ev.questions.addQuestion': '添加考题',
      'ev.questions.emptyBank': '题库为空——在召回测试面板勾选正确切片可一键存为考题',
      'ev.questions.emptyBankSynthesis': '或从文档合成候选题，审核后采纳入题库',
      'ev.questions.searchPlaceholder': '搜索问题…',
      'ev.questions.searchClear': '清空搜索',
      'ev.questions.noMatch': '无匹配的题目，换个关键词试试',
      'ev.questions.rowReproduce': '在召回测试面板复现',
      'ev.questions.rowDelete': '删除考题',
      'ev.questions.saveFailed': '考题保存失败',
      'ev.questions.deleteFailed': '考题删除失败',
      'ev.questions.addTitle': '添加考题',
      'ev.questions.queryLabel': '问题',
      'ev.questions.categoryLabel': '分类',
      'ev.questions.expectedPathLabel': '预期路径',
      'ev.questions.referenceAnswerLabel': '参考答案（可选）',
      'ev.questions.unanchoredNote': '未锚定切片的题只参与路径选择与生成质量评测',
      'ev.questions.submit': '添加',
      'ev.questions.cancel': '取消',
      'ev.questions.deleteConfirmDesc': '删除后不可恢复。确定删除这道考题吗？',
      'ev.questions.deletedToast': '考题已删除',
      'ev.questions.drawerTitle': '考题详情',
      'ev.questions.noReferenceAnswer': '未填写',
      'ev.questions.answerSection': '参考答案',
      'ev.questions.entitiesSection': '实体',
      'ev.questions.drawerChunksCount': '{0} 切片',
      'ev.questions.anchorEditButton': '编辑锚定',
      'ev.questions.anchorEditSelected': '已选 {0}/{1}',
      'ev.questions.loadMore': '加载更多',
      'ev.questions.save': '保存',
      'ev.questions.addedToast': '考题已添加',
      'ev.questions.reproducePrefill': '已带入问题——点「检索」查看',
      'ev.syn.entryButton': '生成考题',
      'ev.syn.dialogTitle': '合成考题',
      'ev.syn.docLabel': '来源文档（可多选）',
      'ev.syn.docPlaceholder': '勾选要出题的已索引文档，多篇可联合出题',
      'ev.syn.countLabel': '候选题数量',
      'ev.syn.generate': '生成',
      'ev.syn.generating': '生成中…',
      'ev.syn.reviewTitle': '候选题审核',
      'ev.syn.accept': '采纳',
      'ev.syn.reject': '忽略',
      'ev.syn.acceptAll': '全部采纳',
      'ev.syn.rejectAll': '全部忽略',
      'ev.syn.metaLine': '锚定越界或字段违例被丢弃 {0} 条',
      'ev.syn.reviewCount': '{0} 条待审',
      'ev.syn.droppedChip': '丢弃 {0} 条',
      'ev.syn.reviewMetaTip': '来自 {0} · 生成于 {1}',
      'ev.syn.docsSep': '、',
      'ev.syn.docsMore': '{0} 等 {1} 篇',
      'ev.syn.empty': '暂无待审核的候选题',
      'ev.syn.triggerFailed': '合成触发失败',
      'ev.syn.acceptFailed': '候选题采纳失败',
      'ev.syn.rejectFailed': '候选题忽略失败',
      'ev.history.envLocal': '本地',
      'ev.history.envCi': 'CI',
      'ev.history.envNightly': '定时',
      'ev.history.statusCompleted': '完成',
      'ev.history.statusError': '失败',
      'ev.history.statusSkipped': '跳过',
      'ev.history.statusCancelled': '已终止',
      'ev.history.emptyHistory': '尚无评测运行——点右上角运行评测发起首次评测',
      'ev.history.colTime': '运行时间',
      'ev.history.colEnv': '环境',
      'ev.history.colScope': '评测内容',
      'ev.history.colStatus': '状态',
      'ev.history.colDuration': '时长',
      'ev.history.durFormatLabel': '时长格式',
      'ev.history.durFormatCompact': '紧凑',
      'ev.history.durFormatSeconds': '按秒',
      'ev.history.selectedCount': '已选 {0} 条',
      'ev.selection.deleteSelected': '删除所选',
      'ev.history.scopeQuick': '快速',
      'ev.history.scopeFull': '完整',
      'ev.history.scopeGeneration': '生成',
      'ev.history.rowSelectAria': '选择 {0} 的运行',
      'ev.history.rowDelete': '删除此次运行',
      'ev.history.deleteConfirmTitle': '删除运行历史',
      'ev.history.deleteConfirmDesc': '将删除 {0} 条运行记录，总览、趋势图与题库召回列会同步收敛，删除后不可恢复',
      'ev.history.baselineWarn': '所选包含基线运行：删除后后续运行的回退门禁将失去对比参照。',
      'ev.history.deletedToast': '运行历史已删除',
      'ev.history.deleteFailed': '运行删除失败',
      'ev.drawer.title': '评测运行详情',
      'ev.drawer.statusCompleted': '已完成',
      'ev.drawer.statusError': '出错',
      'ev.drawer.statusSkipped': '已跳过',
      'ev.drawer.statusCancelled': '已终止',
      'ev.drawer.baselineBadge': '基线',
      'ev.drawer.runInfoSection': '运行信息',
      'ev.drawer.runIdLabel': '运行 ID',
      'ev.drawer.createdAtLabel': '运行时间',
      'ev.drawer.layer1Section': '检索质量',
      'ev.drawer.layer2Section': '生成质量',
      'ev.drawer.contextRecallLabel': '上下文召回率',
      'ev.drawer.notRun': '本次运行未执行该层',
      'ev.copied': '已复制',
      'ev.copyFailed': '复制失败',
      'ev.anchorBlock.title': '机器核验：答案与锚定切片对不上',
      'ev.anchorBlock.missing': '锚定切片不存在，需修正锚定后重新保存',
      'ev.anchorBlock.missTerms': '缺失术语',
      'ev.anchorBlock.suggest': '建议锚',
      'ev.anchorBlock.hits': '命中',
      'ev.anchorBlock.confirmSave': '仍要入库',
      'ev.anchorBlock.confirmAccept': '仍要接受',
      'ev.anchorBlock.confirmUpdate': '仍要保存',
      'recall.saveAs.button': '存为考题',
      'recall.saveAs.selectedCount': '已选 {0} 项',
      'recall.saveAs.queryLabel': '问题',
      'recall.saveAs.categoryLabel': '分类',
      'recall.saveAs.expectedPathsLabel': '预期路径（可多选）',
      'recall.saveAs.anchorHint': '勾选的切片与百科词条的源切片将记为本题锚定',
      'recall.saveAs.referenceAnswerLabel': '参考答案（可选）',
      'recall.saveAs.submit': '保存',
      'recall.saveAs.cancel': '取消',
      'recall.saveAs.savedToast': '已存为考题',
      'recall.saveAs.saveFailed': '存为考题失败',
      'recall.saveAs.selectLabel': '存为考题：{0}',
      // ── 百科（Task 9）：词汇照工作台 tk / t.knowledge.wikiPanel / wikiDrawer / manualCards ──
      'shell.tab.wiki': '百科',
      'wk.search': '搜索百科条目与卡片…',
      'wk.clearSearch': '清空搜索',
      'wk.more': '百科操作',
      'wk.updateWiki': '更新百科',
      'wk.rebuildWiki': '重建百科',
      'wk.rebuildTitle': '全部重建百科？',
      'wk.rebuildDesc': '将按当前图谱重写所有合格条目（包括未变化的），LLM 调用成本较高，仅在生成规则升级后使用。',
      'wk.rebuildConfirm': '确认重建',
      'wk.enqueued': '百科生成任务已提交，完成后条目可查',
      'wk.updated': '百科已更新',
      'wk.updateFailed': '百科更新失败，部分条目可能仍待更新，请重试',
      'wk.alreadyRunning': '百科正在更新中，无需重复提交',
      'wk.loadFailed': '百科数据加载失败',
      'wk.loading': '加载中…',
      'wk.entries': '生成条目',
      'wk.entriesEmpty': '百科条目会自动沉淀、逐步出现',
      'wk.entriesNoMatch': '没有匹配的条目',
      'wk.dirty': '待更新',
      'wk.updating': '更新中',
      'wk.updatedAt': '更新于',
      'wk.selectEntry': '选择条目',
      'wk.openEntry': '打开详情',
      'wk.editEntry': '编辑条目',
      'wk.wikiEditTitle': '编辑百科条目',
      'wk.wikiEditDesc': '主内容区可被下次生成覆盖；补充层永久保留，并作为每次生成的方向',
      'wk.wikiEditMainLabel': '主内容区（自动生成）',
      'wk.wikiEditMainPlaceholder': 'AI 生成的内容将在此显示，您可以手动编辑',
      'wk.wikiEditMainHint': '⚠️ 此内容会在下次重新生成时被覆盖',
      'wk.wikiEditSupplementLabel': '补充层（AI 生成方向）',
      'wk.wikiEditSupplementPlaceholder': '写下你希望 AI 怎么改这篇条目，等同于给生成用的提示词。例如：语气严谨些，多介绍相关概念',
      'wk.wikiEditSupplementHint': '✅ 永久保留；每次重新生成都会作为你的要求带给 AI',
      'wk.wikiEditSave': '保存',
      'wk.wikiEditSaving': '保存中…',
      'wk.wikiEditLastEdited': '最后编辑时间',
      'wk.wikiEntryUpdated': 'Wiki 条目已更新',
      'wk.wikiEntryUpdateFailed': '更新 Wiki 条目失败',
      'wk.updateEntry': '更新条目',
      'wk.updateSelected': '更新所选',
      'wk.deleteEntry': '删除条目',
      'wk.deleteSelected': '删除所选',
      'wk.deleteBatchTitle': '删除 {0} 条百科条目？',
      'wk.deleteConfirmTitle': '删除这条百科条目？',
      'wk.deleteConfirmDesc': '将删除条目正文与检索向量，实体本身保留。若实体仍符合生成资格，下次生成时会按最新材料重新创建该条目。',
      'wk.selectedCount': '已选 {0} 项',
      'wk.cancelSelection': '取消选择',
      'wk.entryNotFound': '条目不存在或已删除',
      'wk.sourceChunks': '个源切片',
      'wk.deletedSources': '个源切片已删除',
      'wk.openInTab': '在百科 tab 中查看',
      'wk.cards': '我的条目',
      'wk.cardsEmpty': '新建卡片，记录属于你的知识',
      'wk.cardsNoMatch': '没有匹配的卡片',
      'wk.includeInSearch': '混入搜索',
      'wk.cardType': '我的卡片',
      'wk.openCard': '打开详情',
      'wk.cardNotFound': '卡片不存在或已删除',
      'wk.cardNew': '新建卡片',
      'wk.cardIncludeHint': '开启后参与百科检索，与 AI 条目共享名额，按相关性纯质量竞争',
      'wk.cardEdit': '编辑卡片',
      'wk.cardDelete': '删除卡片',
      'wk.cardDeleteTitle': '删除这张知识卡片？',
      'wk.cardDeleteDesc': '将删除卡片内容与其检索向量，删除后不可恢复。',
      'wk.cardDeleteBatchTitle': '删除 {0} 张知识卡片？',
      'wk.cardEditorCreate': '新建知识卡片',
      'wk.cardEditorEdit': '编辑知识卡片',
      'wk.cardEditorDesc': '人工卡片永不自动更新，与 AI 生成内容隔离',
      'wk.cardTitleLabel': '标题',
      'wk.cardTitlePlaceholder': '一句话概括这条知识',
      'wk.cardContentLabel': '内容',
      'wk.cardContentPlaceholder': '记录你的经验、结论或注意事项',
      'wk.cardTagsLabel': '标签（可选）',
      'wk.cardTagsPlaceholder': '用逗号分隔，如：运维, 发布',
      'wk.cardSave': '保存',
      'wk.cardSaving': '保存中…',
      'wk.cardCreateSuccess': '卡片已创建',
      'wk.cardUpdateSuccess': '卡片已更新',
      'wk.cardDeleteSuccess': '卡片已删除',
      'wk.cardSaveFailed': '保存卡片失败',
      'wk.cardDeleteFailed': '删除卡片失败',
      'wk.cardSelect': '选择卡片',
      'wk.cardIncludeOn': '开启混入搜索',
      'wk.cardIncludeOff': '关闭混入搜索',
      'wk.cardMoreActions': '更多操作',
      'wk.selectAllCards': '全选卡片',
      'wk.drawerNew': '新建抽屉',
      'wk.drawerEdit': '编辑抽屉',
      'wk.drawerNameLabel': '名称',
      'wk.drawerNamePlaceholder': '输入名称…',
      'wk.drawerIconLabel': '图标',
      'wk.drawerColorLabel': '颜色',
      'wk.drawerCreate': '创建',
      'wk.drawerSave': '保存',
      'wk.drawerDelete': '删除抽屉',
      'wk.drawerClose': '收起',
      'wk.drawerAll': '全部抽屉',
      'wk.drawerMoveTo': '移动到抽屉',
      'wk.drawerUnfiled': '未分组',
      'wk.drawerNewFromMenu': '新建抽屉…',
      'crash.title': '视图渲染出错（{0}）',
      'crash.hint': '该视图已隔离，其他分区可继续使用；点「重试」重新挂载。',
      'crash.retry': '重试',
      'menu.more': '更多操作',
      'menu.upload': '上传文档',
      'menu.uploading': '上传中…',
      'menu.refreshUi': '刷新界面',
      'menu.renameKb': '重命名知识库',
      'menu.deleteKb': '删除知识库',
      'menu.modelSettings': '功能模型设置',
      'renameKb.title': '重命名知识库',
      'renameKb.nameLabel': '知识库名称',
      'renameKb.save': '保存',
      'renameKb.done': '已重命名',
      'deleteKb.title': '删除知识库？',
      'deleteKb.desc': '将同时删除全部文档、切片、向量、图谱与百科条目，且不可恢复。',
      'createKb.title': '新建知识库',
      'createKb.created': '知识库已创建',
      'createKb.namePlaceholder': '知识库名称',
      'createKb.descPlaceholder': '描述（可选）',
      'createKb.create': '创建',
      'upload.rejected': '已跳过不支持的文件：{0}',
      'upload.needKb': '知识库暂不可接收：请先创建知识库',
      'upload.busy': '知识库暂不可接收：上传中，请稍候',
      'upload.dirSkipped': '已跳过文件夹（仅支持文件上传）',
      'dup.identicalTitle': '内容完全一致',
      'dup.identicalDescription': '「{0}」与库中已有文档内容完全相同，无需重复上传。',
      'dup.conflictTitle': '同名文件已存在',
      'dup.conflictDescription': '「{0}」与库中已有文档同名但内容不同。',
      'dup.copyNamePreview': '保留两份将以上传为「{0}」。',
      'dup.skipUpload': '跳过上传',
      'dup.keepCopy': '仍上传副本',
      'dup.keepBoth': '保留两份',
      'dup.replaceOld': '替换旧文档',
      'dup.skipped': '已跳过重复文件：{0}',
      'dup.uploadedAsCopy': '已作为副本上传：{0}',
      'dup.replaced': '已替换旧文档：{0}',
      'set.form.save': '保存',
      'set.form.saved': '功能模型配置已保存',
      'set.form.noChanges': '没有需要保存的改动',
      'set.form.defaultHint': '用于图谱抽取、评测裁判、图片与视频配文未单独指定模型时的选择，不影响聊天主模型及其他功能；此项留空时使用配置中的 RAG 默认，配置也未指定则使用模型列表第一项。',
      'set.form.defaultNone': '（使用配置默认）',
      'set.form.thinkingMenuLabel': '思考跟随对话模型',
      'set.form.thinkingMenuState': '思考跟随对话模型（已选 {0} 项）',
      'set.form.thinkingMenuStateNone': '思考跟随对话模型（未选择）',
      'set.form.retrievalHint': '检索时使用：向量模型与重排模型。更换向量模型、提供方、接口地址或稀疏来源后，已用旧配置入库的知识库需要重建索引，否则检索质量会下降。',
      'set.form.provider': '提供商',
      'set.form.model': 'Model ID',
      'set.form.apiKey': 'API Key',
      'set.form.endpoint': '接口地址',
      'set.form.embeddingApiKey': 'API Key（向量）',
      'set.form.rerankApiKey': 'API Key（重排）',
      'set.form.endpointHint': '必填。以下三种写法均可：主机名（https://host）、带 /v1 的 base（https://host/v1）或整段端点（https://host/v1/embeddings）；与固定段重复的一节不会重复拼接。',
      'set.form.secretHint': '留空表示不再覆盖，改用环境变量。',
      'set.form.secretFromEnvBadge': '环境变量已提供',
      'set.form.endpointRequired': '请填写接口地址',
      'set.form.advanced': '高级设置（6 项）',
      'set.form.dimensionHint': '该项决定向量库的宽度（留空为 1024）。修改后将触发全库重建，且修改前后需使用同一模型。',
      'set.form.dimensionProbeHint': '更改提供商 / Model / 地址后，会自动检测该模型支持的维度，无需手动发起。',
      'set.form.dimensionProbing': '探测中…',
      'set.form.dimensionUnprobed': '未探明',
      'set.form.dimensionNoTiers': '未检测到常用档位，可手动填写；保存时将实发验证。',
      'set.form.dimensionNativeHint': '该模型原生宽度为 {0} 维，可填写不大于它的任意值。',
      'set.form.dimensionFixedHint': '该模型不接受维度参数，固定为 {0} 维。',
      'set.form.dimensionTierHint': '已检测到的档位：',
      'set.form.sparseSourceProvider': '跟随向量模型',
      'set.form.sparseSourceExternal': '独立稀疏服务',
      'set.form.sparseSourceBm25': '本地 BM25',
      'set.form.sparseSourceHint': '百炼的向量模型单次调用同时返回稠密与稀疏向量；换成仅输出稠密向量的提供方后，这里必须改为「独立稀疏服务」或「本地 BM25」，否则该配置无法启用。',
      'set.form.sparseProbeHint': '选中「跟随向量模型」将发起一次真实嵌入调用（只读、不保存），用于确认所选模型确能返回稀疏向量。',
      'set.form.sparseProbing': '检测中…',
      'set.form.sparseUnverified': '未验证',
      'set.form.sparseProviderDenseOnly': '该向量模型只输出稠密向量',
      'set.form.sparseProviderUnsupported': '当前选择的向量模型无法提供稀疏向量；请把「稀疏向量来源」改为「独立稀疏服务」或「本地 BM25」。',
      'set.form.sparseServiceUnconfigured': '「独立稀疏服务」需要一个提供商（TEI 稀疏服务）——未选择时这份配置无法启用。',
      'set.form.sparseProviderNone': '（未选择）',
      'set.form.sparseModelHint': '该项会写入配置，但不会随请求发送：TEI 一个实例只服务一个模型，故请求中不带 model 字段。',
      'set.form.sparseApiKeyLabel': '稀疏 API Key',
      'set.form.sparseServiceUnreachable': '连不上',
      'set.form.sparseServiceEmpty': '没返回词项',
      'set.form.lockedExternalOnly': '仅「独立稀疏服务」时可用',
      'set.form.legUntested': '尚未检测。点击标题可发起一次连通检测。',
      'set.form.legProbing': '检测中…',
      'set.form.legNeedsConfig': '请先填写提供商 / Model / 地址 / 钥匙',
      'set.form.providerDashscope': '阿里百炼 (DashScope)',
      'set.form.providerVolcengineArk': '火山方舟 (Ark)',
      'set.form.providerOpenAIChat': 'OpenAI-compatible',
      'set.form.providerGenericRerank': '通用重排 (Cohere / Jina 形状)',
      'set.form.providerTeiRerank': 'TEI 重排',
      'set.form.providerTeiSparse': 'TEI 稀疏服务',
      'set.form.dimensionConfirmTitle': '修改维度将触发全库重建？',
      'set.form.dimensionConfirmDescription': '新宽度通过重建生效：每个知识库的向量都会重新生成，期间检索仍使用旧向量。全部完成后才切换；中途失败则保持不变。',
      'set.form.dimensionConfirmAction': '开始迁移',
      'set.form.multimodalHint': '图片描述将图片与关键帧转为文字；语音识别仅服务视频入库。',
      'set.form.captionHint': '接口地址与 API Key 取自所选模型条目；留空表示移除本行的覆盖值，配置文件中为它指定的值仍然生效；两处都为空时由 RAG 默认模型接管。仅列出支持视觉的条目——Anthropic 条目按其 Messages 协议调用，其余按 OpenAI 兼容协议调用。',
      'set.form.vlmNoVision': '尚无视觉模型',
      'set.form.asrRowLabel': '语音识别模型',
      'set.form.asrProviderFunasr': 'funasr（本地）',
      'set.form.asrProviderWhisper': 'whisper（本地）',
      'set.form.asrProviderOpenaiAudio': 'openai-audio（通用协议）',
      'set.form.asrProviderDashscope': 'dashscope（百炼）',
      'set.form.asrGroupLocal': '本地引擎',
      'set.form.asrGroupProtocol': '通用协议',
      'set.form.asrGroupNative': '原生协议',
      'set.form.asrModelCandidates': '常用模型：',
      'set.form.asrModelFunasrHint': '可填写 ModelScope 模型 id 或本地目录。逐句时间戳：paraformer-zh 支持，paraformer-en 未验证；口述按 VAD 分段落到镜头卡，连续语音可能整段只落一张。',
      'set.form.asrModelWhisperHint': '内置档位，越大越准越慢；常用 small。也可填写任意合法名（如 large-v2、turbo，或本地 .pt 文件）。',
      'set.form.asrModelServiceHint': '填写服务侧的模型名（如 qwen-audio-3.1-asr-flash）；候选菜单仅对本地引擎可用。',
      'set.form.asrApiKey': 'ASR API Key',
      'set.form.lockedServiceOnly': '仅服务档需要',
      'set.form.asrProbe': '检测分段时间戳',
      'set.form.asrProbeBlocksSave': '该服务没有给出可用的段级时间戳：换一个服务，或改回本地引擎。',
      'set.loadFailed': '设置加载失败',
      'set.migrationRunning': '维度迁移中',
      'set.migrationSucceeded': '维度迁移已完成，新宽度已生效。',
      'set.migrationFailed': '维度迁移失败：',
      'set.group.default': 'RAG 默认模型',
      'set.group.retrieval': '检索',
      'set.group.extraction': '图谱抽取',
      'set.group.evaluation': '评测裁判',
      'set.group.multimodal': '多模态与视频',
      'set.group.services': '服务与令牌',
      'set.field.defaultModel': 'RAG 默认模型',
      'set.field.embeddingProvider': '向量提供方',
      'set.field.embeddingModel': '向量模型',
      'set.field.dimension': '维度',
      'set.field.embeddingBaseUrl': '向量接口地址',
      'set.field.sparseSource': '稀疏向量来源',
      'set.field.sparseProvider': '稀疏服务提供方',
      'set.field.sparseModel': '稀疏模型',
      'set.field.sparseBaseUrl': '稀疏服务地址',
      'set.field.rerankProvider': '重排提供方',
      'set.field.rerankModel': '重排模型',
      'set.field.rerankBaseUrl': '重排接口地址',
      'set.field.extractModel': '图谱抽取模型',
      'set.field.wikiModel': '百科生成模型',
      'set.field.synthesisModel': '考题合成模型',
      'set.field.judgeModel': '裁判模型',
      'set.field.captionModel': '图片描述模型 (VLM)',
      'set.field.asrProvider': '语音识别 (ASR)',
      'set.field.asrModel': 'ASR 模型',
      'set.field.asrBaseUrl': 'ASR 接口地址',
      'set.field.parseProvider': '解析提供方',
      'set.field.parseBaseUrl': '服务地址',
      'set.field.parseTier': '解析档位',
      'set.field.parseLanguage': '解析语种',
      'set.field.parseModelVersion': '模型版本',
      'set.field.qdrantUrl': 'Qdrant 地址',
      'set.field.mineruToken': 'MinerU 解析令牌',
      'set.form.providerMineruCloud': 'MinerU 官方云',
      'set.form.providerMineruLocal': '本地 MinerU 服务',
      'set.form.parseTierAuto': '（由服务决定）',
      'set.form.parseLanguageDefault': '（使用配置默认）',
      'set.form.parseModelVersionDefault': '（使用配置默认）',
      'set.form.lockedCloudOnly': '仅云 API 需要',
      'set.form.lockedLocalOnly': '仅本地服务需要',
      'set.form.groupServicesHint': '仅当 Qdrant / MinerU 不在默认位置时才需要修改。',
      'set.form.groupEvaluationHint': '用于评估检索质量（ragas），与对话所选模型无关。留空表示移除本行的覆盖值，配置文件中为它指定的值仍然生效；两处都为空时由 RAG 默认模型接管。',
      'set.form.extractModelHint': '用于从文档构建知识图谱的模型，建议选择参数规模小、成本低、输出稳定 JSON 的模型。留空表示移除本行的覆盖值，配置文件中为它指定的值仍然生效；两处都为空时由 RAG 默认模型接管。',
      'set.form.wikiModelHint': '用于生成知识库百科条目的模型。留空表示移除本行的覆盖值，配置文件中为它指定的值仍然生效；两处都为空时由 RAG 默认模型接管。',
      'set.form.synthesisModelHint': '用于从文档合成评测候选题的模型。留空表示移除本行的覆盖值，配置文件中为它指定的值仍然生效；两处都为空时由 RAG 默认模型接管。',
      'set.form.parseBaseUrlHint': 'MinerU 云 API 留空时使用官方地址 https://mineru.net；本地 MinerU 服务必填——该服务不带鉴权，只应部署在内网。',
      'set.form.parseTierHint': '档位由 MinerU 服务端定义：flash / basic 为轻量档，standard / advanced 需要服务端安装 torch；留空表示由服务端决定（服务端默认 standard）。',
      'set.form.parseLanguageHint': 'MinerU 云 API 的文档语言包；ch 同时覆盖中英文。',
      'set.form.parseModelVersionHint': 'MinerU 云 API 的模型版本；本部署默认发送 vlm。',
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
      'reindex.kbLabel': 'Target library',
      'reindex.kbPlaceholder': 'Choose a library',
      'shell.kbLabel': 'Knowledge base',
      'shell.tab.docs': 'Documents',
      'shell.tabs.more': 'More tabs',
      'shell.tab.recall': 'Recall',
      'shell.tab.vectors': 'Projection',
      'shell.tab.graph': 'Graph',
      'shell.viewPending': 'This section is under construction',
      'doc.loading': 'Loading documents…',
      'doc.empty': 'Upload or drop files to build the index',
      'doc.dropToUpload': 'Drop to upload into this knowledge base',
      'doc.dropUnsupported': "This format isn't supported yet",
      'doc.path.asr': 'Speech',
      'doc.path.segment': 'Shots',
      'doc.path.caption': 'Caption',
      'doc.path.vector': 'Vector',
      'doc.path.graph': 'Graph',
      'doc.path.wiki': 'Wiki',
      'doc.path.libraryHint': ' (library-wide)',
      'doc.path.state.pending': 'Pending',
      'doc.path.state.indexing': 'Indexing',
      'doc.path.state.done': 'Done',
      'doc.path.state.degraded': 'Degraded',
      'doc.path.state.failed': 'Failed',
      'doc.path.state.generating': 'Generating',
      'doc.path.state.ready': 'Ready',
      'doc.search': 'Search documents…',
      'doc.searchClear': 'Clear search',
      'doc.noMatch': 'No documents match',
      'doc.sort': 'Sort documents',
      'doc.sortCreatedAt': 'Upload time',
      'doc.sortName': 'Name',
      'doc.sortSize': 'Size',
      'doc.sortChunks': 'Chunks',
      'doc.sortAsc': 'Ascending',
      'doc.sortDesc': 'Descending',
      'doc.thName': 'Name',
      'doc.thStatus': 'Status',
      'doc.thUploader': 'Uploader',
      'doc.thTime': 'Uploaded',
      'doc.thSize': 'Size',
      'doc.thChunks': 'Chunks',
      'doc.statsDocuments': 'Documents',
      'doc.statsChunks': 'Chunks',
      'doc.colMenu': 'column options',
      'doc.colHide': 'Hide column',
      'doc.columns': 'Columns',
      'doc.colShowAll': 'Show all',
      'doc.colTimeFormat': 'Date format',
      'doc.colAbsolute': 'Absolute',
      'doc.colRelative': 'Relative',
      'doc.colSizeUnit': 'Unit',
      'doc.openChunks': 'View chunks',
      'doc.downloadOriginal': 'Download original',
      'doc.listFailed': 'Failed to load documents',
      'doc.status.uploaded': 'Uploaded',
      'doc.status.parsing': 'Parsing',
      'doc.status.chunking': 'Chunking',
      'doc.status.indexing': 'Indexing',
      'doc.status.ready': 'Ready',
      'doc.status.failed': 'Failed',
      'doc.degraded': 'Degraded',
      'doc.uploaderMe': 'Me',
      'doc.retry': 'Retry',
      'doc.retrySubmitted': 'Retry submitted',
      'doc.degradedRetryHint': 'Some outputs did not succeed — retry to complete them',
      'doc.generateQuestion': 'Generate question',
      'doc.genQuestionBatch': 'Generate question (joint)',
      'doc.selectedCount': '{0} selected',
      'doc.selectAll': 'Select all',
      'doc.selectDocument': 'Select document',
      'doc.deleteSelected': 'Delete selected',
      'doc.cancelSelection': 'Cancel selection',
      'doc.err.empty': 'The file is empty',
      'doc.err.unsupported': 'Unsupported file type',
      'doc.err.retryLimit':
        'The parsing service failed after several retries — check the file for corruption or try again later',
      'doc.err.serviceUnconfigured': 'The document parsing service is not configured — contact your admin',
      'doc.err.timeout': 'Parsing timed out — please retry',
      'doc.err.indexIncomplete': 'The document index is incomplete — some chunks were not indexed; please retry',
      'doc.err.noIndexableContent': 'The document had no indexable content — check the file and retry',
      'doc.err.unknown': 'Processing failed — please retry',
      'doc.err.title': 'Document processing failed',
      'doc.err.dismissAll': 'Close all',
      'doc.err.dismiss': 'Close',
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
      'chunk.tickAria': 'Chunk',
      'chunk.notLoaded': 'Not loaded',
      'chunk.current': 'current',
      'chunk.prevChunk': 'Previous chunk',
      'chunk.nextChunk': 'Next chunk',
      'chunk.deletePreviewTitle': 'Delete Preview',
      'chunk.orphanedEntities': 'Entities to be orphaned',
      'chunk.affectedEntities': 'Entities to be affected',
      'chunk.relationDeletions': 'Relations to be deleted',
      'chunk.deleteWarning': 'Deletion is irreversible',
      'chunk.confirmDelete': 'Confirm Delete',
      'chunk.deleteSuccess': 'Chunk deleted',
      'chunk.deleteFailed': 'Failed to delete chunk',
      'chunk.timecode': 'Timecode',
      'chunk.entities': 'Entities',
      'chunk.tokens': 'tokens',
      'chunk.edited': 'Edited',
      'chunk.viewRendered': 'Rendered view',
      'chunk.viewRaw': 'Raw text',
      'markdown.copy': 'Copy',
      'markdown.copied': 'Copied',
      'markdown.codeTitle': 'Code block',
      'markdown.wrap': 'Wrap lines',
      'markdown.unwrap': 'Do not wrap lines',
      'markdown.footnotes': 'Footnotes',
      'chunk.playShot': 'Play this shot',
      'chunk.copyTimecode': 'Copy timecode',
      'chunk.copiedTimecode': 'Timecode copied',
      'chunk.copyTimecodeFailed': 'Copy failed',
      'chunk.frameMissing': 'Keyframe missing',
      'chunk.playerHint': "Click a shot's timecode or thumbnail to seek and play",
      'chunk.edit': 'Edit',
      'chunk.save': 'Save',
      'chunk.editHint': "Entities and Wiki will not auto-update. Use 'Re-extract' to rebuild entities with new content",
      'chunk.updateSuccess': 'Chunk updated',
      'chunk.updateFailed': 'Update failed',
      'chunk.reExtract': 'Re-extract',
      'chunk.reExtractCost': 'Costs 1 LLM extraction call',
      'chunk.reExtracting': 'Extracting…',
      'chunk.reExtractHint': 'Extracting entities, please wait…',
      'chunk.reExtractSuccess': 'Re-extract done; entities updated',
      'chunk.reExtractFailed': 'Re-extract failed',
      'chunk.reExtractProcessing': 'Document is being processed, please retry later',
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
      // ③档批 G 组（照工作台 vectorSpace 逐字）。
      'vec.searchAll': 'Search…',
      'vec.searchScopeLabel': 'Search scope',
      'vec.searchScopes.all': 'All',
      'vec.searchScopes.chunks': 'Documents',
      'vec.searchScopes.entities': 'Entities',
      'vec.searchScopes.wiki': 'Wiki',
      'vec.searchScopes.cards': 'Entries',
      'vec.moreOptions': 'More options',
      'vec.indexingHint': '{0} document(s) still indexing — the projection may be incomplete',
      'recall.viewInGraphSpace': 'View in the knowledge graph',
      'recall.evidenceView': 'Evidence {0}',
      'recall.entitiesView': 'Entities {0}',
      'recall.slicePosition': 'Chunk #{0}',
      'recall.wikiAnchorTooltip': 'Manual cards have no source chunks: ticking records the expected path only, without chunk anchors',
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
      'sort.asc': 'Ascending',
      'sort.desc': 'Descending',
      'sort.title': 'Sort',
      // ── Eval (Task 8): copy mirrors the workbench tk.eval / recallTest.saveAsQuestion ──
      'shell.tab.eval': 'Evaluation',
      'ev.viewsLabel': 'Switch eval view',
      'ev.view.overview': 'Overview',
      'ev.view.questions': 'Questions',
      'ev.view.history': 'History',
      'ev.tierQuick': 'Quick evaluation',
      'ev.tierFull': 'Full evaluation',
      'ev.tierMenuAria': 'Evaluation tier',
      'ev.runPhase': '{0} {1}/{2}',
      'ev.phaseLayer1': 'Retrieval',
      'ev.phaseQuestions': 'Answering',
      'ev.phaseRagas': 'RAGAS',
      'ev.failedCount': '{0} failed',
      'ev.etaEstimating': 'Estimating…',
      'ev.etaMinutes': '~{0} min left',
      'ev.etaSeconds': '~{0} s left',
      'ev.logWaiting': 'Run started, waiting for the first progress event…',
      'ev.logPhase': 'Starting {0}',
      'ev.logItem': '{0} {1}/{2}',
      'ev.logFail': '{0} {1}/{2}, {3} failed so far',
      'ev.bannerAria': '{0}, {1}% complete overall',
      'ev.loading': 'Loading…',
      'ev.loadFailed': 'Failed to load evaluation data',
      'ev.moreOptions': 'More options',
      'ev.neverRan': 'Not yet evaluated',
      'ev.slotSummary': '{0} · took {1}',
      'ev.slotSummaryFailed': 'Eval failed',
      'ev.slotSummaryCancelled': 'Eval cancelled',
      'ev.slotViewHistory': 'View history',
      'ev.durSeconds': '{0}s',
      'ev.durMinutes': '{0}m',
      'ev.durMinutesSeconds': '{0}m {1}s',
      'ev.runStartedToast': 'Evaluation started',
      'ev.alreadyRunningToast': 'An evaluation is already running',
      'ev.runFailedToast': 'Failed to start the evaluation',
      'ev.cancelRun': 'Cancel run',
      'ev.cancelConfirm': 'Confirm cancel?',
      'ev.cancelToast': 'Eval run cancelled',
      'ev.cancelFailedToast': 'Failed to cancel the run',
      'ev.fullRun.dialogTitle': 'Run full evaluation',
      'ev.fullRun.dialogBody':
        'A full evaluation first runs the retrieval-quality metrics, then lets the agent answer every question with an independent judge scoring it (including RAGAS metrics). It takes much longer and costs far more tokens than the quick tier, and cannot be triggered again while running.',
      'ev.fullRun.scopeAll': 'Scope: every question in the bank.',
      'ev.fullRun.scopeSelected': 'Scope: the {0} selected question(s).',
      'ev.fullRun.confirm': 'Start full evaluation',
      'ev.fullRun.cancel': 'Cancel',
      'ev.layer1Title': 'Retrieval Quality',
      'ev.layer2Title': 'Generation Quality',
      'ev.layer1Note':
        'Deterministic retrieval-stage metrics, reproducible.\nHit Rate: share of questions where correct content appears in retrieved results\nRecall@k: share of correct content covered by the top-k results\nMRR: higher when the first correct result ranks earlier\nPath Accuracy: share of graph retrieval paths chosen correctly',
      'ev.layer2Note':
        'Generation-stage metrics; RAGAS scores are probabilistic (judge variance) — reference only',
      'ev.regressionBadge': 'Regression detected',
      'ev.ragasMissingBadge': 'ragas not installed',
      'ev.ragasErrorBadge': 'ragas error',
      'ev.emptyLayer1': 'No retrieval-quality data yet',
      'ev.emptyLayer2': 'No generation-quality data yet',
      'ev.viewTrace': 'View trace →',
      'ev.tableCategory': 'Category',
      'ev.tableHitRate': 'Hit Rate',
      'ev.tableRecallAtK': 'Recall@k',
      'ev.tableRecallAtKv': 'Recall@{0}',
      'ev.tableMrr': 'MRR',
      'ev.tablePathAccuracy': 'Path Accuracy',
      'ev.category.fact': 'Fact',
      'ev.category.relation': 'Relation',
      'ev.category.concept': 'Concept',
      'ev.category.global': 'Global',
      'ev.category.summary': 'Summary',
      'ev.noGraphQuestions': 'No questions of this category in the batch',
      'ev.ragasGroupLabel': 'RAGAS probabilistic metrics',
      'ev.archGroupLabel': 'Citation & graph metrics',
      'ev.ragasCard.faithfulness': 'Faithfulness',
      'ev.ragasCard.answerRelevancy': 'Answer Relevancy',
      'ev.ragasCard.contextPrecision': 'Context Precision',
      'ev.ragasCard.contextRecall': 'Context Recall',
      'ev.cardNote.faithfulness':
        'Faithfulness: whether the answer is grounded in retrieved context, without fabrication (0–1, higher is better)',
      'ev.cardNote.answerRelevancy':
        'Answer Relevancy: how relevant the answer is to the question (0–1, higher is better)',
      'ev.cardNote.contextPrecision':
        'Context Precision: share of relevant chunks ranked near the top of retrieval results (0–1, higher is better)',
      'ev.cardNote.contextRecall':
        'Context Recall: how much of the information needed by the answer is covered by retrieved context (0–1, higher is better)',
      'ev.citationPrecision': 'Citation Precision',
      'ev.citationRecall': 'Citation Recall',
      'ev.seedHitRate': 'Seed Entity Hit Rate',
      'ev.routingHitRate': 'Routing Hit Rate',
      'ev.cardNote.citationPrecision': 'Citation Precision: share of cited chunks that actually support the answer',
      'ev.cardNote.citationRecall': 'Citation Recall: share of content that should have been cited that actually was',
      'ev.cardNote.seedHitRate': 'Seed Entity Hit Rate: share of graph questions that hit the preset seed entities',
      'ev.cardNote.routingHitRate':
        'Routing Hit Rate: share of questions whose expected paths were hit by the retrieval tools the agent actually called in the live conversation chain; different semantics from the retrieval-quality path accuracy (offline retrieval routing)',
      'ev.trendTitle': 'Metric Trends',
      'ev.granularityLabel': 'Time window',
      'ev.granularity.day': 'Day',
      'ev.granularity.week': 'Week',
      'ev.granularity.month': 'Month',
      'ev.emptyTrend': 'No evaluation trend data yet',
      'ev.trend.thresholdLabel': 'Regression threshold -{0}%',
      'ev.trend.baselineUpdate': 'Baseline updated',
      'ev.trend.clickForDetail': 'Click for details',
      'ev.trend.regressionPrefix': 'Regressed categories',
      'ev.trend.notRunInTier': 'Not run in this tier',
      'ev.trend.pickerTrigger': 'Metrics',
      'ev.trend.pickerAria': 'Select trend metrics',
      'ev.trend.fullTierOnly': 'Full tier only',
      'ev.selection.selectAllAria': 'Select all',
      'ev.selection.rowSelectAria': 'Select "{0}"',
      'ev.selection.selected': '{0} selected',
      'ev.selection.clear': 'Clear selection',
      'ev.questions.columnQuery': 'Question',
      'ev.questions.columnCategory': 'Category',
      'ev.questions.columnRefChunks': 'Ref chunks',
      'ev.questions.columnRecallNote':
        'Share of this question\u2019s reference chunks hit in the most recent run that included it (merged across runs); untested questions show —',
      'ev.questions.sortDefault': 'Default order',
      'ev.questions.sortDocsCount': 'Docs',
      'ev.questions.recallTip': 'Recall {0} · actual {1}',
      'ev.questions.recallUntested': 'Not tested or not in the latest run',
      'ev.questions.unanchored': 'Unanchored',
      'ev.questions.danglingBadge': 'Dangling',
      'ev.questions.danglingHint': '{0} reference chunk(s), {1} dangling',
      'ev.questions.mismatchBadge': 'Suspect',
      'ev.questions.addQuestion': 'Add question',
      'ev.questions.emptyBank':
        'No questions yet — tick the right chunks in the recall test panel to save one in a click',
      'ev.questions.emptyBankSynthesis':
        'Or synthesize candidates from a document and accept them after review',
      'ev.questions.searchPlaceholder': 'Search questions…',
      'ev.questions.searchClear': 'Clear search',
      'ev.questions.noMatch': 'No matching questions — try another keyword',
      'ev.questions.rowReproduce': 'Reproduce in recall test panel',
      'ev.questions.rowDelete': 'Delete question',
      'ev.questions.saveFailed': 'Failed to save the question',
      'ev.questions.deleteFailed': 'Failed to delete the question',
      'ev.questions.addTitle': 'Add question',
      'ev.questions.queryLabel': 'Question',
      'ev.questions.categoryLabel': 'Category',
      'ev.questions.expectedPathLabel': 'Expected path',
      'ev.questions.referenceAnswerLabel': 'Reference answer (optional)',
      'ev.questions.unanchoredNote':
        'Questions without chunk anchors only contribute path selection and generation quality',
      'ev.questions.submit': 'Add',
      'ev.questions.cancel': 'Cancel',
      'ev.questions.deleteConfirmDesc': 'This cannot be undone. Delete this question?',
      'ev.questions.deletedToast': 'Question deleted',
      'ev.questions.drawerTitle': 'Question details',
      'ev.questions.noReferenceAnswer': 'Not provided',
      'ev.questions.answerSection': 'Reference answer',
      'ev.questions.entitiesSection': 'Entities',
      'ev.questions.drawerChunksCount': '{0} chunks',
      'ev.questions.anchorEditButton': 'Edit anchors',
      'ev.questions.anchorEditSelected': 'Selected {0}/{1}',
      'ev.questions.loadMore': 'Load more',
      'ev.questions.save': 'Save',
      'ev.questions.addedToast': 'Question added',
      'ev.questions.reproducePrefill': 'Question prefilled — hit Search to run it',
      'ev.syn.entryButton': 'Generate questions',
      'ev.syn.dialogTitle': 'Synthesize questions',
      'ev.syn.docLabel': 'Source documents (multi-select)',
      'ev.syn.docPlaceholder': 'Pick indexed documents to draw from — several can be combined',
      'ev.syn.countLabel': 'Number of candidates',
      'ev.syn.generate': 'Generate',
      'ev.syn.generating': 'Generating…',
      'ev.syn.reviewTitle': 'Candidate review',
      'ev.syn.accept': 'Accept',
      'ev.syn.reject': 'Ignore',
      'ev.syn.acceptAll': 'Accept all',
      'ev.syn.rejectAll': 'Ignore all',
      'ev.syn.metaLine': '{0} candidate(s) dropped for invalid anchors or fields',
      'ev.syn.reviewCount': '{0} pending review',
      'ev.syn.droppedChip': '{0} dropped',
      'ev.syn.reviewMetaTip': 'From {0} · generated {1}',
      'ev.syn.docsSep': ', ',
      'ev.syn.docsMore': '{0} and {1} total',
      'ev.syn.empty': 'No candidates awaiting review',
      'ev.syn.triggerFailed': 'Failed to trigger synthesis',
      'ev.syn.acceptFailed': 'Failed to accept candidate',
      'ev.syn.rejectFailed': 'Failed to ignore candidate',
      'ev.history.envLocal': 'Local',
      'ev.history.envCi': 'CI',
      'ev.history.envNightly': 'Nightly',
      'ev.history.statusCompleted': 'Completed',
      'ev.history.statusError': 'Failed',
      'ev.history.statusSkipped': 'Skipped',
      'ev.history.statusCancelled': 'Cancelled',
      'ev.history.emptyHistory': 'No runs yet — click Run evaluation to start the first one',
      'ev.history.colTime': 'Run time',
      'ev.history.colEnv': 'Environment',
      'ev.history.colScope': 'Eval content',
      'ev.history.colStatus': 'Status',
      'ev.history.colDuration': 'Duration',
      'ev.history.durFormatLabel': 'Duration format',
      'ev.history.durFormatCompact': 'Compact',
      'ev.history.durFormatSeconds': 'Seconds',
      'ev.history.selectedCount': '{0} selected',
      'ev.selection.deleteSelected': 'Delete selected',
      'ev.history.scopeQuick': 'Quick',
      'ev.history.scopeFull': 'Full',
      'ev.history.scopeGeneration': 'Generation',
      'ev.history.rowSelectAria': 'Select run {0}',
      'ev.history.rowDelete': 'Delete this run',
      'ev.history.deleteConfirmTitle': 'Delete run history',
      'ev.history.deleteConfirmDesc':
        'This deletes {0} run record(s). Overview, trends and the bank recall column converge accordingly; this cannot be undone',
      'ev.history.baselineWarn':
        'Selection includes baseline runs: after deletion, later runs lose the regression-gate reference.',
      'ev.history.deletedToast': 'Run history deleted',
      'ev.history.deleteFailed': 'Failed to delete runs',
      'ev.drawer.title': 'Eval Run Details',
      'ev.drawer.statusCompleted': 'Completed',
      'ev.drawer.statusError': 'Failed',
      'ev.drawer.statusSkipped': 'Skipped',
      'ev.drawer.statusCancelled': 'Cancelled',
      'ev.drawer.baselineBadge': 'Baseline',
      'ev.drawer.runInfoSection': 'Run info',
      'ev.drawer.runIdLabel': 'Run ID',
      'ev.drawer.createdAtLabel': 'Run time',
      'ev.drawer.layer1Section': 'Retrieval Quality',
      'ev.drawer.layer2Section': 'Generation Quality',
      'ev.drawer.contextRecallLabel': 'Context Recall',
      'ev.drawer.notRun': 'This layer was not executed in this run',
      'ev.copied': 'Copied',
      'ev.copyFailed': 'Copy failed',
      'ev.anchorBlock.title': "Machine check: reference answer doesn't match the anchored chunk",
      'ev.anchorBlock.missing': "Anchored chunk doesn't exist — fix the anchor and save again",
      'ev.anchorBlock.missTerms': 'Missing terms',
      'ev.anchorBlock.suggest': 'Suggested anchor',
      'ev.anchorBlock.hits': 'hits',
      'ev.anchorBlock.confirmSave': 'Save anyway',
      'ev.anchorBlock.confirmAccept': 'Accept anyway',
      'ev.anchorBlock.confirmUpdate': 'Save anyway',
      'recall.saveAs.button': 'Save as question',
      'recall.saveAs.selectedCount': '{0} selected',
      'recall.saveAs.queryLabel': 'Question',
      'recall.saveAs.categoryLabel': 'Category',
      'recall.saveAs.expectedPathsLabel': 'Expected paths (multi-select)',
      'recall.saveAs.anchorHint':
        'Ticked chunks and wiki entry source chunks are recorded as this question\u2019s anchors',
      'recall.saveAs.referenceAnswerLabel': 'Reference answer (optional)',
      'recall.saveAs.submit': 'Save',
      'recall.saveAs.cancel': 'Cancel',
      'recall.saveAs.savedToast': 'Saved as a question',
      'recall.saveAs.saveFailed': 'Failed to save as question',
      'recall.saveAs.selectLabel': 'Save as question: {0}',
      // ── Wiki (Task 9): copy mirrors the workbench wiki strings ──
      'shell.tab.wiki': 'Wiki',
      'wk.search': 'Search wiki entries and cards…',
      'wk.clearSearch': 'Clear search',
      'wk.more': 'Wiki actions',
      'wk.updateWiki': 'Update wiki',
      'wk.rebuildWiki': 'Rebuild wiki',
      'wk.rebuildTitle': 'Rebuild all wiki entries?',
      'wk.rebuildDesc':
        'This rewrites every eligible entry from the current graph — including unchanged ones — at full LLM cost. Use only after generation rules change (e.g. prompt or template upgrades).',
      'wk.rebuildConfirm': 'Rebuild',
      'wk.enqueued': 'Wiki generation queued — entries become searchable when ready',
      'wk.updated': 'Wiki updated',
      'wk.updateFailed': 'Wiki update failed — some entries may still be stale, please retry',
      'wk.alreadyRunning': 'Wiki update already in progress',
      'wk.loadFailed': 'Failed to load wiki data',
      'wk.loading': 'Loading…',
      'wk.entries': 'Generated Entries',
      'wk.entriesEmpty': 'Wiki entries accumulate automatically and appear over time',
      'wk.entriesNoMatch': 'No matching entries',
      'wk.dirty': 'Stale',
      'wk.updating': 'Updating',
      'wk.updatedAt': 'Updated',
      'wk.selectEntry': 'Select entry',
      'wk.openEntry': 'Open details',
      'wk.editEntry': 'Edit entry',
      'wk.wikiEditTitle': 'Edit Wiki Entry',
      'wk.wikiEditDesc': 'Main content can be replaced by regeneration; the supplement layer persists and steers every generation',
      'wk.wikiEditMainLabel': 'Main Content (Auto-generated)',
      'wk.wikiEditMainPlaceholder': 'AI-generated content will be displayed here, you can manually edit',
      'wk.wikiEditMainHint': '⚠️ This content will be replaced on next regeneration',
      'wk.wikiEditSupplementLabel': 'Supplement Layer (Generation Direction)',
      'wk.wikiEditSupplementPlaceholder': 'Describe how you want the AI to rewrite this entry — it works like a prompt for generation. e.g. Keep the tone rigorous and cover more related concepts',
      'wk.wikiEditSupplementHint': '✅ Persists permanently; it is passed to the AI as your requirement on every regeneration',
      'wk.wikiEditSave': 'Save',
      'wk.wikiEditSaving': 'Saving…',
      'wk.wikiEditLastEdited': 'Last edited',
      'wk.wikiEntryUpdated': 'Wiki entry updated',
      'wk.wikiEntryUpdateFailed': 'Failed to update wiki entry',
      'wk.updateEntry': 'Update entry',
      'wk.updateSelected': 'Update selected',
      'wk.deleteEntry': 'Delete entry',
      'wk.deleteSelected': 'Delete selected',
      'wk.deleteBatchTitle': 'Delete {0} wiki entries?',
      'wk.deleteConfirmTitle': 'Delete this wiki entry?',
      'wk.deleteConfirmDesc':
        'Deletes the entry text and its search vector; the entity itself stays. If the entity is still eligible, the next generation run recreates the entry from current material.',
      'wk.selectedCount': '{0} selected',
      'wk.cancelSelection': 'Clear selection',
      'wk.entryNotFound': 'Entry missing or deleted',
      'wk.sourceChunks': 'source chunks',
      'wk.deletedSources': 'source chunks deleted',
      'wk.openInTab': 'Open in the Wiki tab',
      'wk.cards': 'My Entries',
      'wk.cardsEmpty': 'Create a card to capture your own knowledge',
      'wk.cardsNoMatch': 'No matching cards',
      'wk.includeInSearch': 'Mixed into search',
      'wk.cardType': 'My Card',
      'wk.openCard': 'Open details',
      'wk.cardNotFound': 'Card missing or deleted',
      'wk.cardNew': 'New Card',
      'wk.cardIncludeHint': 'When on, the card joins wiki retrieval and competes for the shared top-k slots purely by relevance',
      'wk.cardEdit': 'Edit card',
      'wk.cardDelete': 'Delete card',
      'wk.cardDeleteTitle': 'Delete this knowledge card?',
      'wk.cardDeleteDesc': 'The card content and its retrieval vector will be removed. This cannot be undone.',
      'wk.cardDeleteBatchTitle': 'Delete {0} knowledge cards?',
      'wk.cardEditorCreate': 'New Knowledge Card',
      'wk.cardEditorEdit': 'Edit Knowledge Card',
      'wk.cardEditorDesc': 'Manual cards never auto-update and stay isolated from AI-generated content',
      'wk.cardTitleLabel': 'Title',
      'wk.cardTitlePlaceholder': 'Sum up this piece of knowledge in one line',
      'wk.cardContentLabel': 'Content',
      'wk.cardContentPlaceholder': 'Capture your experience, conclusions, or caveats',
      'wk.cardTagsLabel': 'Tags (optional)',
      'wk.cardTagsPlaceholder': 'Comma-separated, e.g.: ops, release',
      'wk.cardSave': 'Save',
      'wk.cardSaving': 'Saving…',
      'wk.cardCreateSuccess': 'Card created',
      'wk.cardUpdateSuccess': 'Card updated',
      'wk.cardDeleteSuccess': 'Card deleted',
      'wk.cardSaveFailed': 'Failed to save the card',
      'wk.cardDeleteFailed': 'Failed to delete the card',
      'wk.cardSelect': 'Select card',
      'wk.cardIncludeOn': 'Include in search',
      'wk.cardIncludeOff': 'Exclude from search',
      'wk.cardMoreActions': 'More actions',
      'wk.selectAllCards': 'Select all cards',
      'wk.drawerNew': 'New Drawer',
      'wk.drawerEdit': 'Edit Drawer',
      'wk.drawerNameLabel': 'Name',
      'wk.drawerNamePlaceholder': 'Enter a name…',
      'wk.drawerIconLabel': 'Icon',
      'wk.drawerColorLabel': 'Color',
      'wk.drawerCreate': 'Create',
      'wk.drawerSave': 'Save',
      'wk.drawerDelete': 'Delete Drawer',
      'wk.drawerClose': 'Hide',
      'wk.drawerAll': 'All drawers',
      'wk.drawerMoveTo': 'Move to Drawer',
      'wk.drawerUnfiled': 'Unfiled',
      'wk.drawerNewFromMenu': 'New Drawer…',
      'crash.title': 'View render failed ({0})',
      'crash.hint': 'The view is isolated; other sections keep working. Retry remounts it.',
      'crash.retry': 'Retry',
      'menu.more': 'More actions',
      'menu.upload': 'Upload document',
      'menu.uploading': 'Uploading…',
      'menu.refreshUi': 'Refresh panel',
      'menu.renameKb': 'Rename knowledge base',
      'menu.deleteKb': 'Delete knowledge base',
      'menu.modelSettings': 'Functional model settings',
      'renameKb.title': 'Rename knowledge base',
      'renameKb.nameLabel': 'Knowledge base name',
      'renameKb.save': 'Save',
      'renameKb.done': 'Renamed',
      'deleteKb.title': 'Delete this knowledge base?',
      'deleteKb.desc':
        'All documents, chunks, vectors, graph data and wiki entries will be cascade-deleted. This cannot be undone.',
      'createKb.title': 'New knowledge base',
      'createKb.created': 'Knowledge base created',
      'createKb.namePlaceholder': 'Knowledge base name',
      'createKb.descPlaceholder': 'Description (optional)',
      'createKb.create': 'Create',
      'upload.rejected': 'Skipped unsupported files: {0}',
      'upload.needKb': 'The knowledge base cannot take files yet: create one first',
      'upload.busy': 'The knowledge base cannot take files yet: an upload is in progress',
      'upload.dirSkipped': 'Skipped folders (only files can be uploaded)',
      'dup.identicalTitle': 'Identical content',
      'dup.identicalDescription': '"{0}" is byte-identical to an existing document — no need to upload again.',
      'dup.conflictTitle': 'Same-name file exists',
      'dup.conflictDescription': '"{0}" shares its name with an existing document but the content differs.',
      'dup.copyNamePreview': 'Keeping both uploads it as "{0}".',
      'dup.skipUpload': 'Skip upload',
      'dup.keepCopy': 'Upload copy anyway',
      'dup.keepBoth': 'Keep both',
      'dup.replaceOld': 'Replace old document',
      'dup.skipped': 'Skipped duplicate file: {0}',
      'dup.uploadedAsCopy': 'Uploaded as copy: {0}',
      'dup.replaced': 'Replaced old document: {0}',
      'set.form.save': 'Save',
      'set.form.saved': 'Functional model configuration saved',
      'set.form.noChanges': 'No changes to save',
      'set.form.defaultHint':
        'Used when graph extraction, evaluation judging, image captioning or video captioning has no separate model selection. It does not affect chat models or other features. Leave this unset to inherit the configured RAG default, or the first model in the list if none is configured.',
      'set.form.defaultNone': '(config default)',
      'set.form.thinkingMenuLabel': 'Thinking follows the chat model',
      'set.form.thinkingMenuState': 'Thinking follows the chat model ({0} selected)',
      'set.form.thinkingMenuStateNone': 'Thinking follows the chat model (none selected)',
      'set.form.retrievalHint': 'Used at retrieval time: the embedding model and the rerank model. Changing the embedding model, provider, endpoint or sparse source requires re-indexing the knowledge bases already ingested with the previous one, or their retrieval quality will degrade.',
      'set.form.provider': 'Provider',
      'set.form.model': 'Model ID',
      'set.form.apiKey': 'API key',
      'set.form.endpoint': 'Endpoint',
      'set.form.embeddingApiKey': 'API key (embedding)',
      'set.form.rerankApiKey': 'API key (rerank)',
      'set.form.endpointHint':
        'Required. Any of the three forms is accepted: the host (https://host), a base ending in /v1 (https://host/v1), or the full endpoint (https://host/v1/embeddings); a segment already covered by the leg\u2019s fixed path is never joined twice.',
      'set.form.secretHint': 'Leaving it blank stops the override and falls back to the environment variable.',
      'set.form.secretFromEnvBadge': 'From env',
      'set.form.endpointRequired': 'Enter the endpoint address',
      'set.form.advanced': 'Advanced settings (6)',
      'set.form.dimensionHint':
        'This field sets the vector library\u2019s width (blank means 1024). Changing it triggers a full rebuild, and both sides of the change must use the same model.',
      'set.form.dimensionProbeHint':
        'Editing the provider / model / endpoint probes the widths the model supports; no manual step is needed.',
      'set.form.dimensionProbing': 'Probing\u2026',
      'set.form.dimensionUnprobed': 'Unknown',
      'set.form.dimensionNoTiers': 'No common tier was detected. Enter a value manually; saving verifies it for real.',
      'set.form.dimensionNativeHint': 'This model is natively {0} wide; any value up to it is accepted.',
      'set.form.dimensionFixedHint': 'This model ignores the dimension parameter; it is fixed at {0} wide.',
      'set.form.dimensionTierHint': 'Detected tiers:',
      'set.form.sparseSourceProvider': 'Follow the embedding model',
      'set.form.sparseSourceExternal': 'A separate sparse service',
      'set.form.sparseSourceBm25': 'Local BM25',
      'set.form.sparseSourceHint':
        'A Bailian embedding model returns both the dense and the sparse half in one call. After switching to a dense-only provider, set this to the separate sparse service or local BM25, or the configuration cannot be enabled.',
      'set.form.sparseProbeHint':
        'Selecting \u201cFollow the embedding model\u201d makes one real embedding call (read-only, nothing is saved) to confirm the model actually returns the sparse half.',
      'set.form.sparseProbing': 'Checking\u2026',
      'set.form.sparseUnverified': 'Unverified',
      'set.form.sparseProviderDenseOnly': 'this embedding model emits dense vectors only',
      'set.form.sparseProviderUnsupported':
        'The selected embedding model cannot supply the sparse half. Set the sparse source to a separate sparse service or local BM25.',
      'set.form.sparseServiceUnconfigured':
        'A separate sparse service needs its provider chosen (TEI sparse service) \u2014 without one this configuration cannot be enabled.',
      'set.form.sparseProviderNone': '(not chosen)',
      'set.form.sparseModelHint':
        'The value is stored in the configuration but is never sent with a request: a TEI instance serves one model, so the request carries no model field.',
      'set.form.sparseApiKeyLabel': 'Sparse API key',
      'set.form.sparseServiceUnreachable': 'unreachable',
      'set.form.sparseServiceEmpty': 'no terms returned',
      'set.form.lockedExternalOnly': 'Only when using a separate sparse service',
      'set.form.legUntested': 'Not tested yet. Click the heading to run a connectivity check.',
      'set.form.legProbing': 'Testing\u2026',
      'set.form.legNeedsConfig': 'Fill in provider / model / endpoint / key first',
      'set.form.providerDashscope': 'Aliyun Bailian (DashScope)',
      'set.form.providerVolcengineArk': 'Volcengine Ark',
      'set.form.providerOpenAIChat': 'OpenAI-compatible',
      'set.form.providerGenericRerank': 'Generic rerank (Cohere / Jina shape)',
      'set.form.providerTeiRerank': 'TEI rerank',
      'set.form.providerTeiSparse': 'TEI sparse service',
      'set.form.dimensionConfirmTitle': 'Changing the width rebuilds every library?',
      'set.form.dimensionConfirmDescription':
        'The new width takes effect through a rebuild: every library\u2019s vectors are regenerated while search keeps using the old ones. The switch happens only after all of it is complete; a failure leaves everything unchanged.',
      'set.form.dimensionConfirmAction': 'Start migration',
      'set.form.multimodalHint': 'Image captioning turns images and keyframes into text; speech recognition only serves video ingest.',
      'set.form.captionHint':
        'The endpoint and API key come from the selected model entry; leaving it empty withdraws this row\u2019s override, so a value set for it in the configuration still applies, and only when neither is set does the RAG default model take over. Only vision-capable entries are listed \u2014 an Anthropic entry is called over its Messages protocol, and every other entry over the OpenAI-compatible protocol.',
      'set.form.vlmNoVision': 'No vision model',
      'set.form.asrRowLabel': 'Speech recognition model',
      'set.form.asrProviderFunasr': 'funasr (local)',
      'set.form.asrProviderWhisper': 'whisper (local)',
      'set.form.asrProviderOpenaiAudio': 'openai-audio (generic protocol)',
      'set.form.asrProviderDashscope': 'dashscope (DashScope)',
      'set.form.asrGroupLocal': 'Local engines',
      'set.form.asrGroupProtocol': 'Generic protocol',
      'set.form.asrGroupNative': 'Native protocol',
      'set.form.asrModelCandidates': 'Common models:',
      'set.form.asrModelFunasrHint':
        'A ModelScope model id, or a local directory. Sentence timestamps: paraformer-zh provides them, paraformer-en is unverified; speech is split per VAD segment across the shot cards, and continuous speech may still land on a single one.',
      'set.form.asrModelWhisperHint':
        'Built-in tiers \u2014 larger is more accurate and slower; small is the common choice. Any valid name also works (large-v2, turbo, or a local .pt file).',
      'set.form.asrModelServiceHint':
        'The model name the service itself uses (e.g. qwen-audio-3.1-asr-flash); the candidate menu is available for the local engines only.',
      'set.form.asrApiKey': 'ASR API key',
      'set.form.lockedServiceOnly': 'Service tiers only',
      'set.form.asrProbe': 'Check segment timestamps',
      'set.form.asrProbeBlocksSave':
        'This service gave no usable segment timestamps: pick another service, or switch back to a local engine.',
      'set.loadFailed': 'Failed to load the settings',
      'set.migrationRunning': 'Dimension migration in progress',
      'set.migrationSucceeded': 'Dimension migration finished; the new width is in effect.',
      'set.migrationFailed': 'Dimension migration failed:',
      'set.group.default': 'RAG default model',
      'set.group.retrieval': 'Retrieval',
      'set.group.extraction': 'Graph extraction',
      'set.group.evaluation': 'Evaluation judge',
      'set.group.multimodal': 'Multimodal & video',
      'set.group.services': 'Services & tokens',
      'set.field.defaultModel': 'RAG default model',
      'set.field.embeddingProvider': 'Embedding provider',
      'set.field.embeddingModel': 'Embedding model',
      'set.field.dimension': 'Dimension',
      'set.field.embeddingBaseUrl': 'Embedding endpoint',
      'set.field.sparseSource': 'Sparse source',
      'set.field.sparseProvider': 'Sparse provider',
      'set.field.sparseModel': 'Sparse model',
      'set.field.sparseBaseUrl': 'Sparse service endpoint',
      'set.field.rerankProvider': 'Rerank provider',
      'set.field.rerankModel': 'Rerank model',
      'set.field.rerankBaseUrl': 'Rerank endpoint',
      'set.field.extractModel': 'Graph extraction model',
      'set.field.wikiModel': 'Wiki generation model',
      'set.field.synthesisModel': 'Question synthesis model',
      'set.field.judgeModel': 'Judge model',
      'set.field.captionModel': 'Caption model (VLM)',
      'set.field.asrProvider': 'Speech recognition (ASR)',
      'set.field.asrModel': 'ASR model',
      'set.field.asrBaseUrl': 'ASR endpoint',
      'set.field.parseProvider': 'Parse provider',
      'set.field.parseBaseUrl': 'Service endpoint',
      'set.field.parseTier': 'Parse tier',
      'set.field.parseLanguage': 'Parse language',
      'set.field.parseModelVersion': 'Model version',
      'set.field.qdrantUrl': 'Qdrant URL',
      'set.field.mineruToken': 'MinerU parsing token',
      'set.form.providerMineruCloud': 'MinerU cloud API',
      'set.form.providerMineruLocal': 'Local MinerU service',
      'set.form.parseTierAuto': '(let the service decide)',
      'set.form.parseLanguageDefault': '(use the configured default)',
      'set.form.parseModelVersionDefault': '(use the configured default)',
      'set.form.lockedCloudOnly': 'Cloud API only',
      'set.form.lockedLocalOnly': 'Local service only',
      'set.form.groupServicesHint': 'Only change these when Qdrant or MinerU is not at its default location.',
      'set.form.groupEvaluationHint':
        "Evaluates retrieval quality with ragas, independently of the chat model in use. Leaving it empty withdraws this row's override, so a value set for it in the configuration still applies; only when neither is set does the RAG default model take over.",
      'set.form.extractModelHint':
        "Builds the knowledge graph from documents. Prefer a model with a small parameter count, low cost and stable JSON output. Leaving it empty withdraws this row's override, so a value set for it in the configuration still applies; only when neither is set does the RAG default model take over.",
      'set.form.wikiModelHint':
        "Writes the knowledge-base wiki entries. Leaving it empty withdraws this row's override, so a value set for it in the configuration still applies; only when neither is set does the RAG default model take over.",
      'set.form.synthesisModelHint':
        "Synthesizes candidate evaluation questions from documents. Leaving it empty withdraws this row's override, so a value set for it in the configuration still applies; only when neither is set does the RAG default model take over.",
      'set.form.parseBaseUrlHint':
        'Empty means the official https://mineru.net for the cloud API; the local MinerU service needs it - that service ships without auth, so keep it internal.',
      'set.form.parseTierHint':
        'Tiers are defined by the MinerU service: flash / basic are light, while standard / advanced need torch installed on the service; empty means the service decides (its own default is standard).',
      'set.form.parseLanguageHint': "The MinerU cloud API's document language pack; ch covers Chinese and English.",
      'set.form.parseModelVersionHint': "The MinerU cloud API's model version; this deployment sends vlm by default.",
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

    // ── T4 摄取通道：面板会话 id 采集（宿主后台任务归属） ─────────────────────
    /** 宿主把面板挂进 `[data-sidebar-right-session]` 容器（dockkit 的事实来源）；
     * 从自己的根节点读会话 id。任何缺失/异常＝空串（host 半会回退「无主」尝试）。 */
    let panelSessionValue = ''
    function capturePanelSession(element) {
      let value = ''
      try {
        const holder =
          element && typeof element.closest === 'function' ? element.closest('[data-sidebar-right-session]') : null
        if (holder && typeof holder.getAttribute === 'function') {
          value = String(holder.getAttribute('data-sidebar-right-session') || '')
        }
      } catch (cause) {
        value = ''
      }
      panelSessionValue = value
    }
    function panelSessionId() {
      return panelSessionValue
    }

    /** Multipart upload: the file posts raw to the host route (the JSON op
     * envelope does not fit file payloads); the host streams the body through. */
    async function callUpload(kbId, file) {
      const form = new FormData()
      form.append('file', file, file.name)
      const session = panelSessionId()
      const query = '?kb_id=' + encodeURIComponent(kbId) + (session ? '&session_id=' + encodeURIComponent(session) : '')
      let response
      try {
        response = await fetch(PROXY_ROUTE + '/uploadDocument' + query, {
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

    // ── Task 5（甲档小件）：上次打开库记忆 ＋ 文档下载（raw 中继） ─────────
    const LAST_KB_KEY = 'hrag-last-kb'
    function readLastKbId() {
      try {
        return String(window.localStorage.getItem(LAST_KB_KEY) || '')
      } catch (cause) {
        return ''
      }
    }
    function writeLastKbId(kbId) {
      try {
        window.localStorage.setItem(LAST_KB_KEY, String(kbId))
      } catch (cause) {
        /* best effort */
      }
    }
    // ── 库排序拖拽（照工作台 `kb-order.ts`）：localStorage 本地序——存量按用户序
    // 在前、新库尾随服务端序；越界/失效/坏值静默回退（排序是锦上添花，不值班崩溃）。
    const KB_ORDER_KEY = 'hrag-kb-order'
    function readKbOrderIds() {
      try {
        const raw = window.localStorage.getItem(KB_ORDER_KEY)
        const parsed = raw ? JSON.parse(raw) : null
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
      } catch (cause) {
        return []
      }
    }
    function writeKbOrderIds(ids) {
      try {
        window.localStorage.setItem(KB_ORDER_KEY, JSON.stringify(ids))
      } catch (cause) {
        /* best effort */
      }
    }
    /** 服务端序 + 本地序合成（照工作台 useKbLocalOrder.ordered）。 */
    function kbOrderApply(storedIds, list) {
      if (!storedIds || storedIds.length === 0) return list
      const rank = new Map(storedIds.map((id, index) => [id, index]))
      const known = list
        .filter((kb) => rank.has(String(kb.id)))
        .sort((a, b) => rank.get(String(a.id)) - rank.get(String(b.id)))
      const fresh = list.filter((kb) => !rank.has(String(kb.id)))
      return [...known, ...fresh]
    }
    /** source 拼入 target 槽位（照工作台 commitMove）；无效 id/同位＝原样返回。 */
    function kbOrderCommit(ids, sourceId, targetId) {
      if (sourceId === targetId) return ids
      const from = ids.indexOf(sourceId)
      const to = ids.indexOf(targetId)
      if (from === -1 || to === -1) return ids
      const next = ids.slice()
      next.splice(to, 0, ...next.splice(from, 1))
      return next
    }
    /** 文档源文件名优取 Content-Disposition（FileResponse 的 filename=）。 */
    async function downloadDocumentFile(kbId, doc) {
      const response = await fetch(
        PROXY_ROUTE +
          '/downloadDocument?kb_id=' +
          encodeURIComponent(kbId) +
          '&doc_id=' +
          encodeURIComponent(doc.id),
        { method: 'POST' },
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const info =
          (payload && payload.error) || { kind: 'http', status: response.status, detail: 'HTTP ' + response.status }
        const error = new Error(info.detail || 'HTTP ' + response.status)
        error.info = info
        throw error
      }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition)
      let fileName = String((doc && doc.name) || (doc && doc.id) || 'download')
      if (match) {
        try {
          fileName = decodeURIComponent(match[1] || match[2] || fileName)
        } catch (cause) {
          /* keep the document name */
        }
      }
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = fileName
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000)
    }

    const SECTIONS = [
      { id: 'docs', label: 'shell.tab.docs' },
      { id: 'wiki', label: 'shell.tab.wiki' },
      { id: 'recall', label: 'shell.tab.recall' },
      { id: 'vectors', label: 'shell.tab.vectors' },
      { id: 'graph', label: 'shell.tab.graph' },
      { id: 'eval', label: 'shell.tab.eval' },
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
          '.hrag-kbtrigger { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; min-width: 0; padding: 2px 4px; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; }',
          '.hrag-kbtrigger:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-kbtrigger-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          // 库下拉拖拽排序（库排序拖拽件）：拖拽源＝行 label 内自绘 span（宿主行件
          // 不动）——空闲态无光标改色（行是点击目标，照工作台），拖拽中显 grabbing。
          '.hrag-kbdrag { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-kbdrag-dragging { cursor: grabbing; }',
          '.hrag-kbtrigger-chev { display: inline-flex; flex-shrink: 0; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-iconbare { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }',
          '.hrag-iconbare:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; padding: 0 12px; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font-size: 14px; font-family: inherit; cursor: pointer; white-space: nowrap; }',
          '.hrag-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-btn:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }',
          '.hrag-btn:disabled { cursor: not-allowed; opacity: 0.4; }',
          '.hrag-btn:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); }',
          '.hrag-btn-outline { border: 0.5px solid var(--dsw-alias-border-l3); }',
          '.hrag-btn-primary { background: var(--dsw-alias-button-primary-fill, var(--dsw-alias-label-primary)); color: var(--dsw-alias-label-primary-foreground, #fff); }',
          '.hrag-btn-primary:hover:not(:disabled) { opacity: 0.9; }',
          // tab 行溢出降级（A⑦，照工作台 tab-strip）：平铺行收进滚动容器（滚动
          // 条藏起、遮罩是唯一溢出暗示）；底缘发丝线改走 inset 阴影——滚动容器会
          // 裁 padding 盒，加 1px 下垫后激活下划线（bottom:-1px）仍压在发丝线上，
          // 与改造前逐位同观感（border-bottom 会被下垫推到下划线之外）。
          '.hrag-tabswrap { position: relative; }',
          // 遮罩宿主包裹层（DshMenu 两径）：贴 tabswrap 右缘 40px 全高。宿主
          // Menu 的原生根 span（relative/inline-flex）会把遮罩的包含块抢到 0×0
          // 上并留出行盒——定死为静态块（照 .hrag-set-field 结构化覆写先例）。
          '.hrag-tabswrap > .hrag-mmhost, .hrag-tabswrap > .hrag-mm-wrap { position: absolute; top: 0; right: 0; bottom: 0; width: 40px; }',
          '.hrag-tabswrap > .hrag-mmhost > span { position: static; display: block; }',
          '.hrag-tabs { display: flex; overflow-x: auto; padding-bottom: 1px; scrollbar-width: none; box-shadow: inset 0 -0.5px 0 var(--dsw-alias-border-l3); }',
          // 六 tab 首行统一工具条（照工作台 px-4 py-2 + h-7 = 44px）：搜索行高与
          // 纵向位置跨 tab 一致；行内控件一律 28px 垂直居中，行尾按钮不再撑行。
          '.hrag-tabbar { display: flex; align-items: center; gap: 8px; min-height: 44px; flex-shrink: 0; min-width: 0; }',
          '.hrag-tabs::-webkit-scrollbar { display: none; }',
          '.hrag-tabs-list { display: flex; gap: 0 36px; flex-shrink: 0; }',
          // 尾垫＝遮罩宽：没有它滚动到不了有效可见区落点（照工作台）。
          '.hrag-tabs-tail { width: 40px; flex-shrink: 0; }',
          '.hrag-tabs-mask { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-end; padding: 0 4px 0 0; border: none; background: linear-gradient(to left, color-mix(in srgb, var(--dsw-alias-bg-base) 70%, transparent) 25%, transparent); color: var(--dsw-alias-label-secondary); cursor: pointer; }',
          '.hrag-tabs-mask:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); }',
          // 箭头只在悬停/聚焦时现身（照工作台 2026-09-28 裁定）——平时只留渐隐遮罩本体。
          '.hrag-tabs-mask-chev { display: inline-flex; opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-tabs-mask:hover .hrag-tabs-mask-chev, .hrag-tabs-mask:focus-visible .hrag-tabs-mask-chev { opacity: 1; }',
          '.hrag-tab { position: relative; flex-shrink: 0; padding: 0 0 9px; border: none; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 13px; font-weight: 500; line-height: 16px; font-family: inherit; cursor: pointer; }',
          '.hrag-tab::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px; background: transparent; }',
          ".hrag-tab[aria-selected='true'] { color: var(--dsw-alias-state-business-primary); }",
          ".hrag-tab[aria-selected='true']::after { background: var(--dsw-alias-state-business-primary); }",
          '.hrag-tab:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); border-radius: 4px; }',
          '.hrag-pane { padding: 8px 2px; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; }',
          '.hrag-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 12px; text-align: center; }',
          // 空态照工作台 recall-test-panel（FlaskConical size-5 + text-sm muted，gap-2 居中）。
          '.hrag-state-empty { flex: 1; justify-content: center; gap: 8px; padding: 16px; }',
          '.hrag-state-empty .hrag-state-title { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-state-icon { display: inline-flex; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-state-title { color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; }',
          '.hrag-state-detail { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; word-break: break-word; }',
          '.hrag-state-error .hrag-state-title { color: var(--dsw-alias-state-error-primary); }',
          // 文档表骨架（doc-columns 对 Task 1）：滚动区横滚保护列宽（min-w 544px
          // ＝工作台 34rem 同款），内容列撑满余高。10-16 他截图对照修订：顶部
          // 「就绪 N」汇总行撤除，改挂工作台同款底栏统计行（document-stats-row
          // 同构——左总量可缩省略号、右端仅可动作态彩点，永不换行）。
          '.hrag-docs { display: flex; flex-direction: column; }',
          // 10-16 第五轮：统计行是文档面板的收尾行（工作台同姿），以 -12px 抵消
          // 壳层下衬，让统计行底缘贴到面板底缘，不再拖一条空带。
          '.hrag-docsbody { display: flex; flex-direction: column; min-width: 0; min-height: 0; flex: 1; margin-bottom: -12px; }',
          '.hrag-docscroll { flex: 1; min-height: 0; overflow: auto; }',
          '.hrag-docsbody > .hrag-docempty { flex: 1; }',
          // 统计行横向内衬同 docbar（10-16 第四轮复测）——与表格/工具栏同左轴。
          // 行高 16（10-16 第五轮）：对齐工作台 text-xs 口径（12/16、py-2 → 32px 高），
          // 原 18 会让横条比工作台高一档。
          '.hrag-docstats { display: flex; flex-shrink: 0; align-items: center; gap: 12px; padding: 8px 0; border-top: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 16px; }',
          '.hrag-docstats-volume { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-docstats-alert { display: flex; flex-shrink: 0; align-items: center; gap: 8px; margin-left: auto; white-space: nowrap; }',
          '.hrag-docstats-item { display: inline-flex; align-items: center; gap: 4px; }',
          // 失败通知卡（小件批 Task 3，照工作台 doc-failure-panel：底右浮卡 w-80 口径 320px、
          // 纯底面色面 + 浮层阴影；皮肤映射 DSH token——bg-base / elevation-prominent 与 tickrail 弹层同档）。
          '.hrag-docfail { position: absolute; right: 12px; bottom: 12px; z-index: 20; width: 320px; max-width: calc(100% - 24px); overflow: hidden; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-base); box-shadow: var(--dsw-elevation-prominent); }',
          '.hrag-docfail-head { display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 12px; }',
          '.hrag-docfail-summary { display: flex; min-width: 0; flex: 1; align-items: center; gap: 8px; }',
          '.hrag-docfail-icon { display: inline-flex; flex-shrink: 0; color: var(--dsw-alias-state-error-primary); }',
          '.hrag-docfail-body { min-width: 0; flex: 1; }',
          '.hrag-docfail-name { margin: 0; font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-docfail-reason { margin: 0; font-size: 12px; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-docfail-count { min-width: 0; flex: 1; font-size: 12px; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-docfail-retry { display: inline-flex; height: 24px; flex-shrink: 0; align-items: center; gap: 4px; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; cursor: pointer; }',
          '.hrag-docfail-retry:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-docfail-close { display: inline-flex; flex-shrink: 0; padding: 4px; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }',
          '.hrag-docfail-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-docfail-list { max-height: 160px; overflow-y: auto; border-top: 0.5px solid var(--dsw-alias-border-l2); }',
          '.hrag-docfail-row { display: flex; align-items: center; gap: 6px; padding: 6px 8px 6px 12px; }',
          // 文档工具栏（小件批 Task 1，照工作台 h-11 行）：搜索＝宿主 Input 前置
          // 图标（icon 属性，控件照宿主真值）；清空钮绝对定位右缘、检索词非空才渲染；
          // 排序＝28px 图标钮（hrag-iconbare）挂宿主 Menu。
          // 10-16 第四轮复测（他报「搜索框看起来不融洽，左右都有大的空的地方」）：横向
          // 内衬 16→0——壳已含内容轴内缩，此处再 +16 拉得检索框比表格窄一圈（复原面板内
          // 所有内容同一左轴）。统计行同修（下方）。
          '.hrag-docbar { display: flex; align-items: center; gap: 8px; height: 44px; padding: 0; flex-shrink: 0; }',
          '.hrag-docsearch { position: relative; flex: 1; min-width: 0; display: flex; }',
          // 宿主 Input 根高 32/字号 14/图标 16——压到六 tab 统一搜索档（28/12/14）。
          '.hrag-docsearch .hrag-docsearch-field { flex: 1; min-width: 0; height: 28px; padding: 0 6px 0 8px; gap: 4px; border-color: var(--dsw-alias-border-l3); box-sizing: border-box; }',
          '.hrag-docsearch .hrag-docsearch-field input { font-size: 12px; line-height: 20px; }',
          '.hrag-docsearch .hrag-docsearch-field svg { width: 14px; height: 14px; }',
          '.hrag-docsearch input { padding-right: 24px; }',
          '.hrag-docsearch-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
          '.hrag-docsearch-clear:hover { color: var(--dsw-alias-label-primary); }',
          '.hrag-docsearch-clear svg { width: 14px; height: 14px; }',
          '.hrag-docnomatch { padding: 32px 16px; text-align: center; color: var(--dsw-alias-label-tertiary); font-size: 13px; }',
          // 拖拽反馈（小件批 Task 2，照工作台）：根拖入＝淡灰底；空态九宫格里
          // 可落类放大点亮、其余降灰（全拒＝整体降灰）；放置层＝虚线框/70% 实底
          // 双态（空库留框让九宫格透出，非空库实底居中胶囊）。
          '.hrag-root-drag { background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 50%, transparent); }',
          '.hrag-docempty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; padding: 40px 16px; text-align: center; }',
          '.hrag-docempty-grid { display: grid; grid-template-columns: repeat(3, auto); gap: 12px; }',
          '.hrag-docempty-badge { width: 32px; height: 32px; cursor: default; transition: all 150ms; opacity: 0.6; }',
          '.hrag-docempty-badge:hover:not(.hrag-docempty-dim):not(.hrag-docempty-lit) { transform: translateY(-4px); opacity: 1; }',
          '.hrag-docempty-lit { transform: scale(1.25); opacity: 1; }',
          '.hrag-docempty-dim { opacity: 0.25; }',
          '.hrag-docempty-copy { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 14px; line-height: 22px; }',
          '.hrag-dropframe { pointer-events: none; position: absolute; inset: 8px; z-index: 10; border: 2px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg); }',
          '.hrag-dropframe-hint { position: absolute; left: 0; right: 0; bottom: 12px; margin: 0; display: flex; justify-content: center; }',
          '.hrag-droppill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 999px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; font-weight: 500; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }',
          '.hrag-dropdim { pointer-events: none; position: absolute; inset: 8px; z-index: 20; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg); background: color-mix(in srgb, var(--dsw-alias-bg-base) 70%, transparent); }',
          '.hrag-dropdim-hint { margin: 0; display: flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-secondary); font-size: 14px; line-height: 22px; font-weight: 500; }',
          // 文档表（doc-columns 对 Task 1，照工作台 document-panel 表形态）：表头
          // 吸顶（sticky 于滚动区）·h-9 ；名列表承载类型徽章＋名；数值列右对齐
          // tabular-nums。10-16 他截图对照修订：行去分隔线——工作台结构线只留表头
          // 与统计行两条（分隔靠留白＋悬停底色 bg-muted/50→hover token）；单元格
          // px-2（同工作台，首末列不再 2px 特例）。10-16 复测修订：列宽自适应——
          // fixed 布局＋表头定宽（真浏览器实测：auto 布局下名称列的 min-content＝全文，
          // 表面宽 738 溢出 570 面板 168px；fixed 后 573 面板零溢出、999 加宽时名称列
          // 吃余宽）；min-w 552 只作超窄兜底（含复选框列 32px），名称超宽时省略号。
          '.hrag-doctable { width: 100%; min-width: 552px; table-layout: fixed; border-collapse: separate; border-spacing: 0; }',
          '.hrag-doctable th, .hrag-docrow td { box-sizing: border-box; }',
          '.hrag-doctable th { position: sticky; top: 0; z-index: 10; height: 36px; padding: 0 8px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-tertiary); font-size: 12px; font-weight: 500; line-height: 18px; text-align: left; white-space: nowrap; box-shadow: inset 0 -0.5px 0 var(--dsw-alias-border-l2); }',
          '.hrag-doccolhead { display: inline-flex; align-items: center; gap: 2px; }',
          // 列宽（fixed 布局的定宽面；内容宽＝定宽−16 内衬）：状态/上传者/时间/大小/
          // 切片数照各列最长字面定；名称列 auto＝吃余宽。10-16 复测再配平（他报
          // 「名称太短、其余偏长」）：时间列随格式档双值（相对式字面短——相对 88／
          // 绝对 124）；上传者/大小/切片数各收 4-6px 让给名称列。
          '.hrag-docth-status { width: 80px; }',
          '.hrag-docth-uploader { width: 52px; }',
          '.hrag-docth-createdAt { width: 124px; }',
          '.hrag-docth-createdAt-rel { width: 88px; }',
          '.hrag-docth-size { width: 74px; }',
          '.hrag-docth-chunks { width: 56px; }',
          '.hrag-docrow { cursor: pointer; }',
          '.hrag-docrow:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-docrow td { padding: 8px; vertical-align: middle; }',
          // 复选框列（Task 3.6 批量版收编，照工作台 w-8）：行 checkbox 悬停/勾选/有选中
          // 项时显形（照 wk 行先例）；选中行加底色（工作台 bg-muted/60 与悬停同档）。
          // 24px（10-16 第五轮「名称以及文档离框有点远」）：工作台 w-8=32 装 16px 框留
          // 零余；本插件框 13px，32 会多攒一格余量——收成 8+13+3，名称列内容左移 8px，
          // 框到徽章间距 19→11（≈一枚框宽）。
          '.hrag-docth-check { width: 24px; }',
          '.hrag-docrow .hrag-ev-check { opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-docrow:hover .hrag-ev-check { opacity: 1; }',
          '.hrag-docrow .hrag-ev-check:checked { opacity: 1; }',
          '.hrag-doctable-selecting .hrag-ev-check { opacity: 1; }',
          // 表头选框垂直对齐（10-16 第四轮复测「表头的选框有点没有和表头对齐」）：th
          // 内容居中而输入框默认基线锚（底贴基线）——真链路测值中心高 2.2px；middle 后
          // 落 ±1px 带内（行内选框维持现状：本就只偏 0.5px）。
          '.hrag-docth-check .hrag-ev-check { vertical-align: middle; }',
          '.hrag-docrow-selected { background: var(--dsw-alias-interactive-bg-hover); }',
          // 行尾窄列（w-10＝工作台）：行 ⋯ 与表头「列」总控同列对位（内衬走 th/td 基准
          // 规则——表头 0 8px 居中、行 8px）；按钮悬停淡入（行/表头 hover、键盘聚焦、
          // 菜单展开常亮）。
          '.hrag-docops { width: 40px; }',
          '.hrag-docopscell { display: flex; align-items: center; justify-content: flex-end; }',
          '.hrag-docrow-more, .hrag-doccolbtn, .hrag-doccolchev { display: inline-flex; align-items: center; justify-content: center; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-docrow-more, .hrag-doccolbtn { width: 24px; height: 24px; }',
          '.hrag-doccolchev { width: 18px; height: 18px; }',
          '.hrag-docrow:hover .hrag-docrow-more, .hrag-docrow-more:focus-visible, .hrag-docrow-more[aria-expanded="true"] { opacity: 1; }',
          '.hrag-doctable th:hover .hrag-doccolbtn, .hrag-doccolbtn:focus-visible, .hrag-doccolbtn[aria-expanded="true"] { opacity: 1; }',
          '.hrag-doctable th:hover .hrag-doccolchev, .hrag-doccolchev:focus-visible, .hrag-doccolchev[aria-expanded="true"] { opacity: 1; }',
          '.hrag-docrow-more:hover, .hrag-doccolbtn:hover, .hrag-doccolchev:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-docnamecell { display: flex; align-items: center; gap: 8px; min-width: 0; }',
          '.hrag-docrow-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; }',
          // 20px＝九枚的 S 档下限（16px 折角细节糊成发丝，工作台同款）
          '.hrag-docrow-ftype { flex-shrink: 0; width: 20px; height: 20px; }',
          '.hrag-btn-sm { height: 26px; padding: 0 8px; font-size: 12px; border-radius: var(--dsw-radius-sm); }',
          '.hrag-doccell { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
          // 状态格不吃裁剪面（10-16 复测：悬挂点跨出内边 2px，被 td 的 overflow:hidden
          // 裁成半月）——文本省略号由内层 .hrag-docrow-statustext 自持。
          '.hrag-doccell-status { overflow: visible; }',
          '.hrag-doccell-time { font-variant-numeric: tabular-nums; }',
          '.hrag-doccell-right { text-align: right; font-variant-numeric: tabular-nums; }',
          '.hrag-docrow-status-failed { color: var(--dsw-alias-state-error-primary); }',
          // 状态点（10-16 他截图对照补，照工作台 DocumentStatusCell/STATUS_DOT_CLASS）：
          // 6px 圆点悬挂在文字左缘外 10px（＝点 6px＋间隙 4px，与 td px-2 配对，文字左缘
          // 压住表头线）；色＝待解析 tertiary/60 混、在飞 amber-500、就绪 green-500/45
          // 混、失败 error。统计行内为静态小点（无悬挂定位）。
          '.hrag-docrow-status { position: relative; display: inline-flex; align-items: center; max-width: 100%; min-width: 0; }',
          '.hrag-docrow-statustext { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-docdot { display: inline-block; flex-shrink: 0; width: 6px; height: 6px; border-radius: 999px; }',
          '.hrag-docrow-status .hrag-docdot { position: absolute; left: -10px; top: 50%; transform: translateY(-50%); }',
          '.hrag-docdot-idle { background: color-mix(in srgb, var(--dsw-alias-label-tertiary) 60%, transparent); }',
          '.hrag-docdot-active { background: var(--dsw-static-amber-500); }',
          '.hrag-docdot-ready { background: color-mix(in srgb, var(--dsw-static-green-500) 45%, transparent); }',
          '.hrag-docdot-failed { background: var(--dsw-alias-state-error-primary); }',
          // 六腿分解（小件批 Task 4）：宿主 Tooltip 暗泡内两列小行（腿名淡、状态全彩；
          // degraded 着琥珀——泡内暗底取 amber-500 档，工作台 text-amber-600/dark:500 同族）。
          '.hrag-pathst { display: flex; flex-direction: column; gap: 4px; }',
          '.hrag-pathst-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 12px; line-height: 18px; }',
          '.hrag-pathst-name { opacity: 0.75; }',
          '.hrag-pathst-degraded { color: var(--dsw-static-amber-500); }',
          '.hrag-notice { padding: 6px 2px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; word-break: break-word; }',
          '.hrag-notice-error { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-reindex-status { padding: 0 2px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          '.hrag-btn-icon { width: 32px; padding: 0; }',
          '.hrag-vec-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-vec { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          // ③档批 G1/G2（照工作台）：搜索栏独立一行，范围下拉在右；命中强调由画布承载。
          '.hrag-vec-searchrow { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }',
          // 下拉统一走 EvalMenu（宿主菜单触发件），不用原生 select——与面板其余下拉同语汇。
          '.hrag-vec-scopemenu { flex-shrink: 0; }',
          '.hrag-vec-scopemenu .hrag-ev-menu-btn { height: 28px; max-width: 108px; padding: 0 8px; border-radius: var(--dsw-radius-md); display: inline-flex; align-items: center; gap: 4px; font-size: 12px; background: var(--dsw-alias-bg-layer-1); }',
          '.hrag-vec-algomenu { flex-shrink: 0; }',
          '.hrag-vec-algomenu .hrag-ev-menu-btn { height: 24px; padding: 0 8px; border-radius: var(--dsw-radius-md); display: inline-flex; align-items: center; gap: 4px; font-size: 12px; background: var(--dsw-alias-bg-layer-1); }',
          '.hrag-vec-dropchev { display: inline-flex; align-items: center; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-vec-dropchev svg { width: 12px; height: 12px; }',
          // ③档批 G3：工具栏不换行，档位由 useToolbarTier 逐级降级（档 2 维度/算法入 ⋯）。
          // 控件统一 24px（照工作台 h-6）；档 0 chip 自动宽并带色点，档 1 收成图标钮。
          '.hrag-vec-bar { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; overflow: hidden; min-height: 24px; }',
          '.hrag-vec-bar .hrag-chip { flex-shrink: 0; width: auto; height: 24px; padding: 0 8px; gap: 6px; }',
          '.hrag-vec-bar .hrag-chip-icon { width: 24px; padding: 0; gap: 0; }',
          '.hrag-vec-bar .hrag-chip .hrag-chip-dot { flex-shrink: 0; }',
          '.hrag-vec-bar .hrag-seg button { height: 24px; }',
          '.hrag-vec-bar .hrag-vec-iconbtn { width: 24px; height: 24px; }',
          '.hrag-vec-bar .hrag-vec-sampled { flex-shrink: 0; white-space: nowrap; }',
          '.hrag-chip { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: transparent; cursor: pointer; }',
          '.hrag-chip:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-chip:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); }',
          '.hrag-chip-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }',
          '.hrag-vec-sampled { color: var(--dsw-alias-label-tertiary); font-size: 11px; }',
          '.hrag-vec-bar-right { display: flex; align-items: center; gap: 6px; margin-left: auto; }',
          '.hrag-seg { display: inline-flex; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); overflow: hidden; }',
          '.hrag-seg button { height: 26px; padding: 0 8px; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; font-family: inherit; cursor: pointer; }',
          ".hrag-seg button[aria-pressed='true'] { background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); font-weight: 600; }",
          '.hrag-vec-body { position: relative; display: flex; flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-vec-canvas { position: relative; flex: 1; min-height: 180px; overflow: hidden; }',
          '.hrag-vec-canvas canvas { display: block; width: 100%; height: 100%; }',
          '.hrag-vec-tip { position: absolute; z-index: 20; max-width: 210px; padding: 5px 8px; border: 0.5px solid rgba(255, 255, 255, 0.14); border-radius: var(--dsw-radius-md); background: #1f1f1f; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24); color: #fff; font-size: 11px; line-height: 1.5; white-space: normal; pointer-events: none; }',
          '.hrag-vec-tip-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }',
          '.hrag-vec-tip-label { font-weight: 500; }',
          '.hrag-vec-tip-preview { display: block; color: rgba(255, 255, 255, 0.68); }',
          // 图例照 ECharts legend(type:scroll)：不换行、不压缩；窄栏横向滚动（滚动条隐藏）。
          '.hrag-vec-legend { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); z-index: 5; display: flex; flex-wrap: nowrap; max-width: 94%; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; gap: 8px; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 68%, transparent); backdrop-filter: blur(4px); }',
          '.hrag-vec-legend::-webkit-scrollbar { display: none; }',
          '.hrag-vec-legend-item { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11px; font-family: inherit; white-space: nowrap; cursor: pointer; }',
          '.hrag-vec-legend-item .hrag-chip-dot { flex-shrink: 0; }',
          '.hrag-vec-legend-item:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-vec-legend-off { opacity: 0.45; }',
          '.hrag-vec-overlay-badge { position: absolute; top: 6px; left: 6px; z-index: 10; display: inline-flex; align-items: center; gap: 6px; max-width: 82%; padding: 3px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-size: 11px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }',
          '.hrag-vec-overlay-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); }',
          '.hrag-vec-overlay-hits { flex-shrink: 0; }',
          '.hrag-vec-overlay-close { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; flex-shrink: 0; padding: 0; border: none; border-radius: 50%; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 1; cursor: pointer; }',
          '.hrag-vec-overlay-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          // ③档批 G4：索引在飞提示（工作台琥珀文字行）。
          '.hrag-vec-indexhint { flex-shrink: 0; color: var(--dsw-static-amber-500); font-size: 11px; line-height: 16px; }',
          '.hrag-spin { animation: hrag-rotate 900ms linear infinite; }',
          '@keyframes hrag-rotate { to { transform: rotate(360deg); } }',
          '@media (prefers-reduced-motion: reduce) { .hrag-spin { animation-duration: 1ms; } }',
          '.hrag-graph-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-graph { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-graph-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }',
          '.hrag-graph-bar .hrag-seg { height: 28px; box-sizing: border-box; }',
          '.hrag-graph-bar .hrag-seg button { height: 100%; }',
          '.hrag-graph-search { flex: 1; min-width: 120px; display: flex; }',
          '.hrag-graph-body { position: relative; display: flex; flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-graph-canvas { position: relative; flex: 1; min-height: 220px; overflow: hidden; }',
          '.hrag-graph-canvas canvas { display: block; width: 100%; height: 100%; }',
          '.hrag-graph-stats { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); z-index: 5; padding: 3px 10px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 68%, transparent); backdrop-filter: blur(4px); color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap; }',
          '.hrag-graph-guide { position: absolute; top: 6px; right: 6px; z-index: 5; max-width: 55%; padding: 3px 10px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 78%, transparent); backdrop-filter: blur(4px); border: 1px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 20%, transparent); color: var(--dsw-alias-label-tertiary); font-size: 11px; }',
          '.hrag-gcard-graph { height: 220px; display: flex; flex-direction: column; }',
          '.hrag-graph-drawer .hrag-drawer-overlay { z-index: 56; }',
          '.hrag-graph-drawer .hrag-drawer { z-index: 57; }',
          '.hrag-wk-drawer .hrag-drawer-overlay { z-index: 56; }',
          '.hrag-wk-drawer .hrag-drawer { z-index: 57; }',
          '.hrag-wk-drawer-body { display: flex; flex-direction: column; gap: 10px; }',
          '.hrag-wk-drawer-body > * { flex-shrink: 0; }',
          '.hrag-wk-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-docs-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-recall-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-wk-canvas { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-wk-sect { display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }',
          '.hrag-wk-sect-open { flex: 1 1 0; min-height: 0; }',
          '.hrag-wk-secthead { display: flex; align-items: center; gap: 4px; padding: 2px 8px 2px 2px; flex-shrink: 0; }',
          '.hrag-wk-secthead:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-secttoggle { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; padding: 6px 6px 6px 0; border: none; background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; font-family: inherit; cursor: pointer; text-align: left; }',
          // 与「我的条目」头对齐：箭头槽同为 22px（居中）＋2px 补距，图标/标题同 x。
          '.hrag-wk-secttoggle .hrag-ev-caret { width: 22px; text-align: center; margin-right: 2px; }',
          '.hrag-wk-secticon { display: inline-flex; color: var(--dsw-alias-label-secondary); flex-shrink: 0; }',
          '.hrag-wk-secttitle { font-weight: 500; }',
          '.hrag-wk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; flex: 1; padding: 16px; color: var(--dsw-alias-label-tertiary); font-size: 12px; text-align: center; }',
          '.hrag-wk-empty p { margin: 0; }',
          '.hrag-wk-empty-icon { display: inline-flex; opacity: 0.4; }',
          '.hrag-wk-inset { margin: 6px; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }',
          // 列表是纵向单轴：横向内容一律裁掉。卡片行 width:100% 叠加左右内边距，
          // 页内没有全局 border-box，缺了它就会多出 12px 横向滚动条。
          // 行几何照工作台（h-10／text-sm／8px）：10-18 真跑嫌 36px＋13px 偏挤。
          '.hrag-wk-list { display: flex; flex-direction: column; overflow-y: auto; overflow-x: hidden; min-height: 0; flex: 1; padding: 8px; }',
          '.hrag-wk-row { display: flex; align-items: center; gap: 8px; padding: 0 8px; height: 40px; border-radius: var(--dsw-radius-sm); min-width: 0; box-sizing: border-box; }',
          '.hrag-wk-row:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-row-on { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-row .hrag-ev-check { opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-wk-row:hover .hrag-ev-check { opacity: 1; }',
          '.hrag-wk-row .hrag-ev-check:checked { opacity: 1; }',
          '.hrag-wk-list-selecting .hrag-ev-check { opacity: 1; }',
          '.hrag-wk-row-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; height: 100%; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-primary); font-size: 14px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-wk-rowicon { display: inline-flex; color: var(--dsw-alias-label-tertiary); flex-shrink: 0; }',
          '.hrag-wk-rowtitle { max-width: 45%; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }',
          '.hrag-wk-rowsummary { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-wk-dirty { flex-shrink: 0; }',
          '.hrag-wk-dirtydot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }',
          '.hrag-wk-rowtime { flex-shrink: 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-wk-cardrow { width: 100%; border: none; background: transparent; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px; text-align: left; cursor: pointer; }',
          // 我的条目管理面（②档丙对）：头部走横向标签条（照工作台），标签溢出裁切、
          // 不横滚；右侧控件由垫片顶到最右。批量走右键菜单（无批量条）。
          '.hrag-wk-cardhead { gap: 2px; overflow: hidden; }',
          '.hrag-wk-cardcaret { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 22px; height: 28px; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
          '.hrag-wk-cardcaret:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-cardhome { display: flex; align-items: center; gap: 6px; flex-shrink: 0; min-width: 0; height: 28px; padding: 0 6px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; font-family: inherit; cursor: pointer; }',
          '.hrag-wk-cardhome:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-cardhome-dim { opacity: 0.55; }',
          '.hrag-wk-cardhome-dim:hover { opacity: 0.9; }',
          '.hrag-wk-drawers { display: flex; align-items: center; min-width: 0; overflow: hidden; }',
          '.hrag-wk-drawersep { flex-shrink: 0; width: 1px; height: 14px; margin: 0 4px; background: var(--dsw-alias-border-l3); }',
          '.hrag-wk-drawertab { display: flex; align-items: center; flex-shrink: 0; width: 112px; height: 28px; border-radius: var(--dsw-radius-sm); }',
          '.hrag-wk-drawertab:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-drawertabmain { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; height: 100%; padding: 0 2px 0 6px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; text-align: left; cursor: pointer; opacity: 0.55; }',
          '.hrag-wk-drawertab:hover .hrag-wk-drawertabmain { opacity: 0.9; }',
          '.hrag-wk-drawertab-on .hrag-wk-drawertabmain { opacity: 1; font-weight: 500; }',
          '.hrag-wk-drawertablabel { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: clip; }',
          '.hrag-wk-drawertabclose { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 18px; height: 18px; margin-right: 2px; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1; cursor: pointer; opacity: 0; }',
          '.hrag-wk-drawertab:hover .hrag-wk-drawertabclose, .hrag-wk-drawertabclose:focus-visible { opacity: 1; }',
          '.hrag-wk-drawertabclose:hover { color: var(--dsw-alias-label-primary); }',
          '.hrag-wk-draweradd { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 24px; height: 24px; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
          '.hrag-wk-draweradd:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-wk-drawerspacer { flex: 1; min-width: 0; align-self: stretch; }',
          '.hrag-wk-cardctl { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }',
          '.hrag-wk-cardctlbtn { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-wk-cardhead:hover .hrag-wk-cardctlbtn, .hrag-wk-cardctlbtn[aria-expanded="true"], .hrag-wk-cardctlbtn:focus-visible { opacity: 1; }',
          '.hrag-wk-cardctlbtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-wk-cardbody { display: flex; flex-direction: column; flex: 1; min-height: 0; }',
          '.hrag-wk-cardrow { cursor: default; }',
          '.hrag-wk-cardtime { width: 72px; text-align: right; }',
          '.hrag-cardrow-more { opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-wk-cardrow:hover .hrag-cardrow-more, .hrag-wk-cardrow[data-selected="true"] .hrag-cardrow-more, .hrag-cardrow-more[aria-expanded="true"], .hrag-cardrow-more:focus-visible { opacity: 1; }',
          '.hrag-dialog-card { width: min(520px, 100%); max-height: 100%; overflow-y: auto; }',
          '.hrag-dialog-drawer { width: min(560px, 100%); max-height: 100%; overflow-y: auto; }',
          '.hrag-dialog-wiki { width: min(600px, 100%); max-height: 100%; overflow-y: auto; }',
          '.hrag-wiki-editarea { min-height: 200px; font-family: ui-monospace, monospace; font-size: 12px; field-sizing: content; resize: vertical; }',
          '.hrag-wiki-edithint { font-size: 11px; line-height: 16px; }',
          '.hrag-wiki-editmeta { padding-top: 8px; border-top: 0.5px solid var(--dsw-alias-border-l2); font-size: 12px; }',
          '.hrag-cardcontent { min-height: 128px; field-sizing: content; resize: vertical; }',
          '.hrag-card-switchrow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }',
          '.hrag-card-switchlabel { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); }',
          '.hrag-card-switchhint { flex: 1 1 240px; min-width: 0; font-size: 11px; line-height: 16px; }',
          '.hrag-switch { position: relative; flex-shrink: 0; width: 32px; height: 18px; padding: 0; border: none; border-radius: 999px; background: var(--dsw-alias-border-l3); cursor: pointer; }',
          '.hrag-switch-on { background: var(--dsw-alias-state-business-primary); }',
          '.hrag-switch-thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform 120ms ease; }',
          '.hrag-switch-on .hrag-switch-thumb { transform: translateX(14px); }',
          '.hrag-drawer-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 6px; }',
          '.hrag-drawer-cell { display: flex; aspect-ratio: 1; align-items: center; justify-content: center; width: 100%; padding: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }',
          '.hrag-drawer-cell:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-drawer-cell-on { border-width: 2px; }',
          '.hrag-drawer-colorwrap { display: flex; aspect-ratio: 1; align-items: center; justify-content: center; width: 100%; }',
          '.hrag-drawer-colorcell { width: 22px; height: 22px; padding: 0; border: none; border-radius: 50%; cursor: pointer; }',
          '.hrag-hitbadge { flex-shrink: 0; display: inline-flex; align-items: center; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; padding: 0 5px; font-size: 10px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-wk-metarow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 8px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-wk-srcbtn { height: 24px; padding: 0 8px; font-size: 11px; }',
          '.hrag-wk-metaline { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-wk-lin { display: flex; flex-direction: column; gap: 6px; }',
          '.hrag-wk-linitem { border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); overflow: hidden; }',
          '.hrag-wk-linhead { display: flex; width: 100%; align-items: center; gap: 6px; padding: 5px 8px; border: none; border-bottom: 0.5px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-wk-linhead:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-linhead:disabled { cursor: default; }',
          '.hrag-wk-linname { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }',
          '.hrag-wk-linpos { flex-shrink: 0; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-wk-linchev { flex-shrink: 0; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-wk-lintext { padding: 6px 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }',
          '.hrag-wk-tags { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 8px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }',
          '.hrag-crash { display: flex; flex-direction: column; gap: 6px; margin: 8px 2px; padding: 10px 12px; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent); border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 6%, transparent); }',
          '.hrag-crash-title { margin: 0; color: var(--dsw-alias-state-error-primary); font-size: 13px; font-weight: 600; }',
          '.hrag-crash-hint { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.6; }',
          '.hrag-crash-pre { margin: 0; max-height: 220px; overflow: auto; padding: 8px; border-radius: 6px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-family: ui-monospace, monospace; font-size: 11px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }',
          '.hrag-mm-wrap { position: relative; display: inline-flex; }',
          // ⋯ 靠右：宿主路径包裹层＝span.hrag-mmhost（缺件回退用 wrap）——两个选择器都留。
          '.hrag-bar > .hrag-mm-wrap + .hrag-mm-wrap { margin-left: auto; }',
          '.hrag-bar > .hrag-mmhost + .hrag-mmhost { margin-left: auto; }',
          '.hrag-mm-backdrop { position: fixed; inset: 0; z-index: 40; }',
          // 宿主子菜单恒向右（left:100%+10px）且不随视口翻转：靠近右缘时镜像到左侧。
          '.hrag-ctxmenu-subflip [role="menu"] { left: auto; right: calc(100% + 10px); }',
          '.hrag-ctxmenu-subflip [role="menu"]::before { left: auto; right: -10px; }',
          // 宿主 Menu（Task 6）：触发器包层。field 直用时整框占满（宿主 root 为 inline-flex 会收内容宽——
          // 宽链＝mmhost(flex,100%) > 宿主 root(flex:1) > 按钮(width:100%)）；trail/顶栏内不套此规则。
          '.hrag-set-field > .hrag-mmhost { display: flex; width: 100%; }',
          '.hrag-set-field > .hrag-mmhost > span { flex: 1 1 auto; min-width: 0; display: flex; }',
          // 框内下拉等宽（Task 6）：宿主 list 在 body portal 下——宽经根变量传入（box-sizing 已在宿主件内）。
          '.hrag-mm-eqw { width: var(--hrag-menu-eq-w) !important; max-width: var(--hrag-menu-eq-w) !important; }',
          // box-sizing：框内下拉走等宽内联 width（anchor:'field'）——不设 border-box 会超出 8px（padding）。
          '.hrag-mm { position: fixed; z-index: 41; box-sizing: border-box; min-width: 144px; padding: 4px; border: none; border-radius: var(--dsw-radius-lg); background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-1)); backdrop-filter: var(--dsw-menu-backdrop-filter); -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter); box-shadow: var(--dsw-elevation-prominent); }',
          '.hrag-mm-item { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 34px; padding: 6px 8px; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-mm-item:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-mm-item:disabled { opacity: 0.5; cursor: not-allowed; }',
          '.hrag-mm-item-danger { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-mm-sub { padding-left: 18px; }',
          '.hrag-mm-sep { height: 1px; margin: 4px 0; background: var(--dsw-alias-border-l2); }',
          '.hrag-mm-label { padding: 4px 8px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }',
          // 思考跟随菜单行（10-15 他复跑调参）：勾选盒**移进角色格内**（绝对定位＋28px 头距＝勾文距 12px）——
          // 网格只留两列（角色｜该槽当前模型，subgrid 共享列＝逐行对齐）；独立勾选列在 subgrid 下
          // 首轨间距不可控（浏览器实测钉死）。行高＝宿主 item 34px。
          '.hrag-mm-tgrid { display: grid; grid-template-columns: max-content minmax(0, 1fr); column-gap: 12px; row-gap: 0; }',
          '.hrag-mm-checkrow { grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: center; column-gap: 12px; row-gap: 0; }',
          '.hrag-mm-tcheck { position: absolute; left: 0; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; box-sizing: border-box; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 5px; color: var(--dsw-alias-label-primary-foreground); }',
          '.hrag-mm-tcheck-on { background: var(--dsw-alias-state-business-primary); border-color: var(--dsw-alias-state-business-primary); }',
          '.hrag-mm-trole { position: relative; padding-left: 28px; white-space: nowrap; }',
          '.hrag-mm-tmodel { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-set-thinkingwrap { margin-top: 0; }',
          // 设置表单纵距：12px 节间距、14px 侧衬（覆盖 drawer-body 的 8/12），底部留 16。
          '.hrag-drawer-body.hrag-set-body { display: flex; flex-direction: column; gap: 12px; padding: 12px 14px 16px; }',
          // 滚动体是 flex 列时，子项必须禁缩——否则带 overflow:hidden 的卡（自动最小
          // 尺寸保护被摘）会在内容超出视口时被压成 1px（10-14 重建索引卡"消失"案）。
          '.hrag-set-body > * { flex-shrink: 0; }',
          '.hrag-set-hint { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-set-migration { padding: 6px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-secondary); font-size: 12px; }',
          '.hrag-set-migration-failed { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent); }',
          '.hrag-set-card { border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); overflow: hidden; }',
          '.hrag-set-cardhead { padding: 8px 12px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); font-size: 12px; }',
          '.hrag-set-cardbody { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding: 10px 12px; }',
          '.hrag-set-group { display: flex; flex-direction: column; gap: 10px; padding: 10px 12px 12px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); }',
          '.hrag-set-grouptitle { margin-bottom: 0; padding-bottom: 6px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; }',
          '.hrag-set-row { display: grid; grid-template-columns: 132px minmax(0, 1fr); align-items: center; gap: 10px; min-height: 32px; font-size: 12px; line-height: 20px; }',
          '.hrag-set-label { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-set-value { color: var(--dsw-alias-label-primary); word-break: break-word; }',
          // 下拉选择器＝与 Model ID 输入框同款外观（宿主 Input 真值：l4 边框／layer-1 底／32 高／
          // 8 左距／14px；右侧 chevron 12px 同轨）——整盒可点开菜单；选项与更新逻辑不变（10-14 他令）。
          '.hrag-set-picker { display: flex; width: 100%; box-sizing: border-box; align-items: center; justify-content: space-between; gap: 6px; height: 32px; padding: 0 12px 0 8px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 14px; line-height: 22px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-set-picker:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }',
          '.hrag-set-picker > svg { flex: none; }',
          '.hrag-set-picker-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          // DshMenu 自带一层 `.hrag-mm-wrap`（inline-flex・内容宽）——与 Model ID 的 trail 用法不同，
          // 选择器把 DshMenu 直接挂在 field 下，内容宽的壳会让 width:100% 的钮回退成内容宽
          // （10-14 六轮复跑「都变短了」实证：178px vs 284px）。仅命中「壳即 field 直子」的选择器
          // 用法；维度/Model ID 的 wrap 在 `.hrag-set-trail` 内，不受此规则影响。
          '.hrag-set-field > .hrag-mm-wrap { display: flex; width: 100%; }',
          // box-sizing：宿主 Input 的外壳是 span（页内无全局 border-box）——width:100% 会被
          // padding+border 顶出字段约 17px（10-14 复跑「Model ID 溢出容器」实证；原生 select/input
          // 吃 UA border-box 所以不受影响）。同一属性也兜住 primitives 缺件时的原生 input 回退。
          '.hrag-set-control { width: 100%; min-width: 0; box-sizing: border-box; }',
          '.hrag-set-field { position: relative; width: 100%; min-width: 0; }',
          // 10-14 复跑案：trail 上的 transform 会成为固定位菜单（DshMenu `.hrag-mm`）的
          // 包含块——菜单被放到「trail 左上 + 按钮视口坐标」的错位处（面板内不可见、还把
          // 滚动体撑出横竖滚动条）。改 top/bottom 拉伸 + flex 居中：几何等价、不产生包含块。
          '.hrag-set-trail { position: absolute; top: 0; bottom: 0; right: 28px; display: flex; align-items: center; pointer-events: none; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          // 穿透壳里的可点件必须显式取回事件（工作台 pointer-events-auto 同款）——按钮自身
          // 也要带上：pointer-events 系继承属性，只给包裹层不覆盖 ASR 那枚无包裹类的菜单。
          // outer button reset：免得吃 UA/宿主 preflight 差异，露出默认描边。
          '.hrag-set-tierwrap { pointer-events: auto; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; background: none; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
          '.hrag-set-tierbtn { pointer-events: auto; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; background: none; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
          '.hrag-set-tierbtn:hover { color: var(--dsw-alias-label-secondary); }',
          '.hrag-set-role { display: flex; align-items: center; margin: 10px 0 2px; padding: 0; border: 0; background: none; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; cursor: pointer; }',
          '.hrag-set-role:disabled { color: var(--dsw-alias-label-secondary); cursor: default; }',
          '.hrag-set-dot { display: inline-block; width: 8px; height: 8px; margin-left: 7px; border-radius: 999px; background: rgba(128, 128, 128, 0.45); }',
          '.hrag-set-dot-probing { animation: hrag-dot-pulse 1.2s ease-in-out infinite; }',
          '.hrag-set-dot-ok { background: #10b981; }',
          '.hrag-set-dot-bad, .hrag-set-dot-bad-dimension, .hrag-set-dot-bad-half { background: #f59e0b; }',
          '@keyframes hrag-dot-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }',
          // 嵌套行的缩进照工作台 NESTED_GUTTER（ml-3 border-l pl-3）——**只落在标题格**：
          // 缩进是给标题看的，值列必须与父行同列对齐（10-14 复跑实证：整行 padding 会连框一起推动）。
          '.hrag-set-row-nested > .hrag-set-label { margin-left: 12px; border-left: 1px solid var(--dsw-alias-border-l2); padding-left: 12px; }',
          '.hrag-set-locked { display: flex; align-items: center; min-height: 32px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: rgba(128, 128, 128, 0.08); color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-set-adv { display: inline-flex; align-items: center; gap: 6px; margin-top: 0; padding: 0; border: 0; background: none; color: var(--dsw-alias-label-tertiary); font-size: 12px; cursor: pointer; }',
          '.hrag-set-adv:hover { color: var(--dsw-alias-label-secondary); }',
          '.hrag-set-adv-chev { display: inline-flex; transform: rotate(-90deg); transition: transform 0.15s ease; }',
          '.hrag-set-adv-chev-open { transform: rotate(0deg); }',
          '.hrag-set-saverow { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }',
          '.hrag-set-savehint { color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-set-saveerr { color: var(--dsw-alias-state-error-primary); font-size: 12px; }',
          '.hrag-set-savewarn { color: var(--dsw-alias-label-secondary); font-size: 12px; }',
          '.hrag-secret-wrap { position: relative; width: 100%; min-width: 0; }',
          '.hrag-secret-badge { position: absolute; top: 50%; left: 10px; transform: translateY(-50%); pointer-events: none; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
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
          '.hrag-dialog-error { color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; word-break: break-word; }',
          '.hrag-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }',
          '.hrag-btn-danger { background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); }',
          '.hrag-btn-danger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger); }',
          '.hrag-chunkrow { display: flex; flex-direction: column; gap: 4px; padding: 8px 2px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); min-width: 0; }',
          '.hrag-chunkrow:last-child { border-bottom: none; }',
          '.hrag-chunkrow-top { display: flex; align-items: center; gap: 6px; min-width: 0; }',
          '.hrag-chunkrow-idx { font-family: ui-monospace, monospace; color: var(--dsw-alias-label-tertiary); font-size: 12px; flex-shrink: 0; }',
          '.hrag-chunkrow-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-chunkrow-text { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; white-space: pre-wrap; word-break: break-word; }',
          // 实体徽章行＋页脚度量（小件批 Task 6，照工作台 chunk-card）：徽章＝
          // textchip 词汇（软底实体件/裸底 +N）；页脚 border-t 分层（tokens＋已编辑）。
          '.hrag-chunkrow-entities { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          '.hrag-chunkrow-entities-label { flex-shrink: 0; }',
          '.hrag-entitymore { display: inline-flex; padding: 0; border: none; background: transparent; font-family: inherit; cursor: pointer; }',
          // 页脚（Task 4 重构，照工作台 chunk-card 页脚）：列向＝度量/动作行＋抽取提示行；
          // 行内＝度量左、动作族右（动作 margin-left:auto 推右，空度量不塌）。
          '.hrag-chunkrow-foot { display: flex; flex-direction: column; gap: 4px; border-top: 0.5px solid var(--dsw-alias-border-l2); padding-top: 6px; }',
          '.hrag-chunkrow-footrow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }',
          '.hrag-chunkrow-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          '.hrag-chunkrow-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }',
          '.hrag-chunkrow-actions .hrag-btn svg { width: 12px; height: 12px; }',
          '.hrag-chunkrow-extracting { display: flex; align-items: center; gap: 4px; margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          // 就地编辑（Task 4，照工作台卡编辑态）：等宽正文域 min-h 100＋提示行＋保存/取消。
          '.hrag-chunkrow-edit { display: flex; flex-direction: column; gap: 8px; }',
          // 照宿主 Textarea 基类 `field-sizing-content`：编辑域随内容增高，100px 只是下限。
          '.hrag-chunkrow-editarea { width: 100%; min-height: 100px; field-sizing: content; box-sizing: border-box; padding: 8px 10px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-family: ui-monospace, monospace; font-size: 12px; line-height: 18px; resize: vertical; }',
          '.hrag-chunkrow-editarea:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }',
          '.hrag-chunkrow-edithint { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }',
          '.hrag-chunkrow-editbtns { display: flex; gap: 8px; }',
          '.hrag-chunkrow-flash { background: var(--dsw-alias-interactive-bg-hover); }',
          // 渲染/原始两态钮（②档乙对 Task 2）：宿主 SegmentedControl 直用（居行尾）；
          // 缺件回退＝outline 边框双钮（工作台 h-7 形态），按下＝宿主 hover 底＋主色。
          '.hrag-chunkrow-view { display: inline-flex; align-items: center; margin-left: auto; flex-shrink: 0; }',
          '.hrag-viewseg { display: inline-flex; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); overflow: hidden; flex-shrink: 0; }',
          '.hrag-viewseg-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 28px; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-tertiary); font-family: inherit; cursor: pointer; }',
          ".hrag-viewseg-btn[aria-pressed='true'] { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }",
          '.hrag-viewseg-btn:focus-visible { outline: none; box-shadow: inset 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); }',
          // 渲染态 Markdown 容器（②档乙对 Task 2）：宿主 MarkdownText 为文档级排版
          // （--dsw-font-markdown-*：h1 32/16 边距、p 16px 边距）——收进行内 12px 档，
          // 边距照工作台 chunk-card 紧凑覆盖（p/列表 6、li 2、pre 8、引用 6）；`> div`
          // 抬一档特异度压宿主 .markdown 规则（无需依赖样式表注入顺序）。
          '.hrag-chunkrow-render { min-width: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }',
          '.hrag-chunkrow-render > div { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }',
          '.hrag-chunkrow-render > div h1 { font-size: 14px; font-weight: 600; margin: 8px 0 4px; }',
          '.hrag-chunkrow-render > div h2, .hrag-chunkrow-render > div h3 { font-size: 12px; font-weight: 600; margin: 8px 0 4px; }',
          '.hrag-chunkrow-render > div h4, .hrag-chunkrow-render > div h5, .hrag-chunkrow-render > div h6 { font-size: 12px; font-weight: 500; margin: 8px 0 4px; }',
          '.hrag-chunkrow-render > div p { margin: 6px 0; }',
          '.hrag-chunkrow-render > div :where(ul, ol) { margin: 6px 0; }',
          '.hrag-chunkrow-render > div li:not(:first-child) { margin-top: 2px; }',
          '.hrag-chunkrow-render > div pre { margin: 8px 0; }',
          '.hrag-chunkrow-render > div blockquote { margin: 6px 0 0; }',
          '.hrag-chunkrow-render > div hr { margin: 8px 0; }',
          '.hrag-chunkrow-render > div :first-child { margin-top: 0; }',
          '.hrag-chunkrow-render > div :last-child { margin-bottom: 0; }',
          // 视频镜头条（②档乙对 Task 3，照工作台 VideoShotBar）：缩略图 64×36＋
          // 等宽时间码芯片整体为 seek 触发器；缺帧＝虚线缺框；复制钮＝iconbare 词汇。
          '.hrag-shotbar { display: flex; align-items: center; gap: 8px; min-width: 0; }',
          '.hrag-shotbar-seek { display: inline-flex; align-items: center; gap: 8px; min-width: 0; padding: 0; border: none; background: transparent; font-family: inherit; cursor: pointer; }',
          '.hrag-shotbar-thumb { width: 64px; height: 36px; flex-shrink: 0; border-radius: var(--dsw-radius-sm); border: 0.5px solid var(--dsw-alias-border-l2); object-fit: cover; display: block; }',
          '.hrag-shotbar-missing { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 36px; flex-shrink: 0; border: 0.5px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); color: var(--dsw-alias-label-tertiary); }',
          '.hrag-shotbar-chip { color: var(--dsw-alias-label-tertiary); font-family: ui-monospace, monospace; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }',
          '.hrag-shotbar-copy { width: 26px; height: 26px; flex-shrink: 0; }',
          // 播放头命中镜头行（Task 3）：琥珀环（宿主静态色板 amber-500，照工作台
          // ring-amber-500/70）——box-shadow 只改边框不占布局、不抢滚动。
          '.hrag-chunkrow-shot-active { box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-static-amber-500) 70%, transparent); }',
          // 抽屉内嵌播放器（Task 3，照工作台头内视频块）：aspect-video / max-h-56 /
          // 黑底圆角；提示行 11px 三级字。
          '.hrag-drawer-video { flex-shrink: 0; display: flex; flex-direction: column; gap: 4px; padding: 8px 12px 10px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }',
          '.hrag-drawer-video-el { display: block; width: 100%; max-height: 224px; aspect-ratio: 16 / 9; background: #000; border-radius: var(--dsw-radius-md); }',
          '.hrag-drawer-video-hint { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }',
          // 刻度轨（A⑫ 照工作台 chunk-tick-rail）：叠加层不入滚动流；行高=间距 26，
          // 行槽与刻度槽逐一对齐；hover/active 用 :not() 守护（active 不被 hover 压色）。
          '.hrag-tickrail { position: absolute; top: 0; bottom: 0; right: 4px; z-index: 10; display: flex; width: 40px; align-items: center; justify-content: flex-end; pointer-events: none; }',
          '.hrag-tickrail-popup { position: absolute; right: 0; top: 50%; transform: translateY(-50%); z-index: 10; width: 288px; border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-base); box-shadow: var(--dsw-elevation-prominent); pointer-events: auto; }',
          '.hrag-tickrail-scroll { height: 100%; overflow-y: auto; }',
          '.hrag-tickrail-rows { display: flex; flex-direction: column; padding: 4px; }',
          '.hrag-tickrail-row { display: flex; align-items: center; gap: 8px; padding: 0 32px 0 8px; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 16px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-tickrail-row:hover:not(.hrag-tickrail-row-active) { background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 60%, transparent); }',
          '.hrag-tickrail-row-active { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-tickrail-idx { width: 32px; flex-shrink: 0; text-align: right; font-family: ui-monospace, monospace; opacity: 0.7; }',
          '.hrag-tickrail-text { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-tickrail-text-unloaded { font-style: italic; opacity: 0.7; }',
          '.hrag-tickrail-ticks { pointer-events: auto; position: relative; z-index: 20; width: 24px; overflow: hidden; -webkit-mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent); mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent); }',
          '.hrag-tick-tick { position: absolute; right: 4px; display: flex; width: 16px; align-items: center; justify-content: flex-end; border: none; padding: 0; background: transparent; cursor: pointer; transition: top 180ms ease; }',
          '.hrag-tick-bar { height: 2px; width: 10px; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 30%, transparent); transition: width 180ms ease, background 180ms ease; }',
          '.hrag-tick-tick:hover .hrag-tick-bar:not(.hrag-tick-bar-active) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 50%, transparent); }',
          '.hrag-tick-bar-active { width: 14px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 80%, transparent); }',
          '.hrag-chip { flex-shrink: 0; padding: 0 6px; height: 18px; display: inline-flex; align-items: center; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap; }',
          '.hrag-dialog-section { display: flex; flex-direction: column; gap: 4px; }',
          '.hrag-dialog-section-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }',
          '.hrag-dialog-section-title-error { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-dialog-section-title-warn { color: var(--dsw-alias-state-warn-primary); }',
          '.hrag-dialog-badges { display: flex; flex-wrap: wrap; gap: 4px; }',
          '.hrag-badge { padding: 0 6px; height: 20px; display: inline-flex; align-items: center; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); font-size: 11px; color: var(--dsw-alias-label-secondary); }',
          '.hrag-badge-error { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }',
          '.hrag-badge-warn { border-color: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-state-warn-primary); }',
          '.hrag-recall-bar { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 0; }',
          // 主树召回工具栏全锁 h-7（28px）：按钮与搜索框同高，不再高出 4px。
          '.hrag-recall-run { height: 28px; padding: 0 12px; font-size: 12px; }',
          '.hrag-input { flex: 1; min-width: 0; height: 28px; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; }',
          // 六 tab 统一搜索框（照工作台 Input h-7 + Search size-3.5 left-2 + pl-7）：
          // 28px 高、左 8px 14px 放大镜、文字内衬 28px；带清除钮的容器右衬 26px。
          '.hrag-searchwrap { position: relative; flex: 1; min-width: 0; display: flex; }',
          '.hrag-searchicon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); display: inline-flex; color: var(--dsw-alias-label-tertiary); pointer-events: none; }',
          '.hrag-searchicon svg { width: 14px; height: 14px; }',
          '.hrag-searchinput { width: 100%; height: 28px; padding: 0 8px 0 28px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; box-sizing: border-box; }',
          '.hrag-searchwrap-clear .hrag-searchinput { padding-right: 26px; }',
          '.hrag-searchclear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
          '.hrag-searchclear:hover { color: var(--dsw-alias-label-primary); }',
          '.hrag-searchclear svg { width: 14px; height: 14px; }',
          '.hrag-input:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }',
          '.hrag-input-num { flex: none; width: 56px; border-color: var(--dsw-alias-border-l3); box-sizing: border-box; }',
          // 召回面（小件批 Task 7，照工作台 three-path panel）：三路并列各占 1/3 高
          // （flex 均分＋行区内滚）；整栏点击收起（收起路 shrink 让高位）；图谱路
          // 段控＋内嵌迷你图；耗时档色三档（宿主静态色板最邻近色）；存为考题悬浮栏。
          '.hrag-recall-section { display: flex; flex-direction: column; flex: 1 1 0; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); min-width: 0; min-height: 0; overflow: hidden; }',
          '.hrag-recall-section-collapsed { flex: 0 0 auto; }',
          '.hrag-recall-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px; min-width: 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); flex-shrink: 0; }',
          '.hrag-recall-section-collapsed .hrag-recall-head { border-bottom: none; }',
          '.hrag-recall-toggle { display: inline-flex; align-items: center; gap: 6px; min-width: 0; padding: 2px 6px; margin: -2px -6px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: inherit; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-recall-toggle:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-recall-name { color: var(--dsw-alias-label-primary); font-size: 12px; font-weight: 600; flex-shrink: 0; }',
          '.hrag-recall-meta { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }',
          '.hrag-recall-seg { display: inline-flex; align-items: center; flex-shrink: 0; padding: 1px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-recall-segbtn { padding: 1px 6px; border: none; border-radius: 4px; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 16px; font-family: inherit; cursor: pointer; }',
          '.hrag-recall-segbtn:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }',
          '.hrag-recall-segbtn:disabled { opacity: 0.4; cursor: not-allowed; }',
          ".hrag-recall-segbtn[aria-pressed='true'] { background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); box-shadow: var(--dsw-elevation-prominent); }",
          // 逐字照工作台 ELAPSED_RANK_CLASSES（跨路排名）：emerald/lime/orange，
          // 10% 底 + light 700 文字 / dark 300 文字。500 级文字在浅底上会发白，
          // 绿与黄绿分不开（2026-10-18 真跑反馈）。宿主暗色钩子＝body[data-ds-dark-theme]。
          '.hrag-elapsed-fast { border-color: transparent; background: color-mix(in srgb, #10b981 10%, transparent); color: #047857; }',
          '.hrag-elapsed-mid { border-color: transparent; background: color-mix(in srgb, #84cc16 10%, transparent); color: #4d7c0f; }',
          '.hrag-elapsed-slow { border-color: transparent; background: color-mix(in srgb, #f97316 10%, transparent); color: #c2410c; }',
          'body[data-ds-dark-theme] .hrag-elapsed-fast { color: #6ee7b7; }',
          'body[data-ds-dark-theme] .hrag-elapsed-mid { color: #bef264; }',
          'body[data-ds-dark-theme] .hrag-elapsed-slow { color: #fdba74; }',
          '.hrag-elapsed-plain { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-recall-rows { display: flex; flex-direction: column; padding: 4px; flex: 1; min-height: 0; overflow-y: auto; }',
          '.hrag-recall-mini { display: flex; flex-direction: column; flex: 1; min-height: 160px; }',
          '.hrag-mini { position: relative; flex: 1; min-height: 0; overflow: hidden; }',
          '.hrag-mini canvas { display: block; width: 100%; height: 100%; }',
          '.hrag-recall-arearel { position: relative; display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }',
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
          '.hrag-textchip { display: inline-flex; align-items: center; flex-shrink: 0; max-width: 240px; padding: 1px 7px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
          '.hrag-hitrow-row .hrag-hitselect { opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-hitrow-row:hover .hrag-hitselect { opacity: 1; }',
          '.hrag-hitselect:focus-visible { opacity: 1; }',
          '.hrag-hitselect-on { opacity: 1; }',
          '.hrag-recall-rows-selecting .hrag-hitselect { opacity: 1; }',
          '.hrag-recall-sections { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }',
          '.hrag-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 100%; }',
          // 原生 title 已由 NativeTipLayer 接管；这是统一暗泡（主树/DSH 同款黑底白字）。
          '.hrag-native-tip { position: fixed; z-index: 2147483000; max-width: min(340px, calc(100vw - 24px)); max-height: 60vh; overflow: hidden; padding: 6px 8px; border-radius: 6px; background: #1f1f1f; color: #fff; font-family: inherit; font-size: 12px; line-height: 18px; white-space: pre-line; word-break: break-word; pointer-events: none; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24); }',
          '@keyframes hrag-fade-in { from { opacity: 0; } to { opacity: 1; } }',
          '@keyframes hrag-slide-in { from { transform: translateX(24px); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }',
          '.hrag-drawer-overlay { position: absolute; inset: 0; z-index: 70; background: var(--dsw-alias-bg-mask-1); animation: hrag-fade-in 160ms ease; }',
          '.hrag-drawer { position: absolute; top: 0; right: 0; bottom: 0; z-index: 71; width: min(576px, calc(100% - 48px)); display: flex; flex-direction: column; background: var(--dsw-alias-bg-base); border-left: 0.5px solid var(--dsw-alias-border-l3); box-shadow: var(--dsw-elevation-panel); animation: hrag-slide-in 160ms ease; }',
          // 设置面＝弹窗（宿主设置同款形态，限在 RAG 面板空间内）。遮罩与面板体是
          // **兄弟**（Fragment 相邻），故弹窗必须自锚——flex/居中类写法只有父子结构
          // 才生效（10-14「只灰不见窗」两轮根因：兄弟弹窗落进正文列尾滚出可视区）。
          '.hrag-modal-overlay { position: absolute; inset: 0; z-index: 70; padding: 16px; background: var(--dsw-alias-bg-mask-1); animation: hrag-fade-in 160ms ease; }',
          '.hrag-modal { position: absolute; top: 16px; bottom: 16px; left: 16px; right: 16px; margin: 0 auto; width: min(600px, calc(100% - 32px)); max-width: 100%; z-index: 71; display: flex; flex-direction: column; overflow: hidden; background: var(--dsw-alias-bg-base); border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-panel); box-shadow: var(--dsw-elevation-panel); animation: hrag-fade-in 160ms ease; }',
          '@media (prefers-reduced-motion: reduce) { .hrag-drawer, .hrag-drawer-overlay { animation: none; } }',
          '.hrag-drawer-close { flex-shrink: 0; width: 26px; height: 26px; padding: 0; font-size: 13px; line-height: 1; }',
          '.hrag-drawer-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); flex-shrink: 0; }',
          // 设置面头部不要划分线（10-15 他点名「功能模型设置下面」）——抽屉们的头线照旧。
          '.hrag-modal .hrag-drawer-head { border-bottom: none; }',
          '.hrag-drawer-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 13px; font-weight: 600; }',
          // 抽屉头部徽章族＋↑↓（小件批 Task 5，照工作台 chunk-drawer 头行）：类型徽章
          // 20px＝S 档下限；徽章＝textchip 词汇（软底变体承「切片预览」类标）；跳片钮
          // 26px＝与关闭钮同格（幽灵底、悬停亮、边界禁）。
          '.hrag-drawer-ftype { flex-shrink: 0; width: 20px; height: 20px; }',
          '.hrag-headbadge-soft { border-color: transparent; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-secondary); }',
          '.hrag-drawer-nav { display: flex; flex-shrink: 0; gap: 2px; }',
          '.hrag-drawer-navbtn { flex-shrink: 0; width: 26px; height: 26px; padding: 0; color: var(--dsw-alias-label-secondary); }',
          '.hrag-drawer-navbtn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-drawer-reveal { flex-shrink: 0; }',
          '.hrag-drawer-panel { position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column; }',
          '.hrag-drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 12px; }',
          // ── 评测域（Task 8）──────────────────────────────────────────────
          '.hrag-btn-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }',
          '.hrag-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }',
          '.hrag-ev-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-ev { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-ev-bar { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; min-width: 0; }',
          // 工具栏控件同档 28px（主树 h-7）：搜索框加高后，段控/运行钮/⋯ 不留在 22/26。
          '.hrag-ev-bar .hrag-searchwrap { min-width: 90px; }',
          // 段控外框含 0.5px 边框，锁 28 border-box、按钮吃满内容高——外高与搜索框一致。
          '.hrag-ev-bar .hrag-seg { height: 28px; box-sizing: border-box; }',
          '.hrag-ev-bar .hrag-seg button { height: 100%; }',
          '.hrag-ev-bar .hrag-ev-run, .hrag-ev-bar .hrag-ev-chev, .hrag-ev-bar .hrag-ev-runbtns .hrag-ev-menu-btn { height: 28px; }',
          // 首行里的图标钮（百科 ⋯）同档 28×28，不再用 22px 的正文图标档。
          '.hrag-tabbar .hrag-ev-iconbtn { width: 28px; height: 28px; min-width: 28px; padding: 0; }',
          '.hrag-ev-runbtns { margin-left: auto; display: inline-flex; align-items: stretch; flex-shrink: 0; }',
          '.hrag-ev-graybtn { background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-graybtn:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-module-platform)); }',
          '.hrag-ev-run { height: 26px; font-size: 12px; padding: 0 10px; border-radius: var(--dsw-radius-sm) 0 0 var(--dsw-radius-sm); white-space: nowrap; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-run:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-module-platform)); }',
          '.hrag-ev-chev { height: 26px; padding: 0 6px; font-size: 11px; border-radius: 0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0; border: none; border-left: 0.5px solid color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); white-space: nowrap; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-chev:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-module-platform)); }',
          '.hrag-ev-chev-armed { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-scroll { display: flex; flex-direction: column; gap: 10px; min-height: 0; flex: 1; overflow-y: auto; padding-right: 2px; }',
          '.hrag-ev-card { background: var(--dsw-alias-bg-layer-1); border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); overflow: hidden; flex-shrink: 0; }',
          '.hrag-ev-cardhead { display: flex; align-items: center; gap: 6px; padding: 6px 10px; color: var(--dsw-alias-label-secondary); font-size: 12px; min-width: 0; }',
          '.hrag-ev-cardhead-open { border-bottom: 0.5px solid var(--dsw-alias-border-l2); }',
          '.hrag-ev-cardhead-side { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }',
          '.hrag-ev-cardtoggle { border: none; background: transparent; color: inherit; font: inherit; font-weight: 600; cursor: pointer; padding: 0; }',
          '.hrag-ev-cardbody { padding: 8px 10px; }',
          '.hrag-ev-cardnote { padding: 4px 0; }',
          '.hrag-ev-callout { display: flex; align-items: flex-start; gap: 6px; margin: 8px 0 0; font-size: 11px; line-height: 16px; }',
          '.hrag-ev-banner { display: flex; flex-direction: column; gap: 8px; padding: 8px 10px; }',
          '.hrag-ev-banner-idle { flex-direction: row; align-items: center; }',
          '.hrag-ev-slottext { font-size: 13px; color: var(--dsw-alias-label-secondary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }',
          '.hrag-ev-slottext-failed { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-banner-side { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }',
          '.hrag-ev-progrow { display: flex; align-items: center; gap: 10px; }',
          '.hrag-ev-track { position: relative; flex: 1; min-width: 0; height: 6px; border-radius: 999px; background: var(--dsw-alias-bg-module-platform); overflow: hidden; }',
          '.hrag-ev-track-span { position: absolute; top: 0; bottom: 0; background: color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent); }',
          '.hrag-ev-track-fill { position: absolute; top: 0; bottom: 0; left: 0; background: var(--dsw-alias-label-primary); opacity: 0.75; }',
          '.hrag-ev-track-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--dsw-alias-bg-layer-1); opacity: 0.8; }',
          '.hrag-ev-eta { font-size: 11px; color: var(--dsw-alias-label-tertiary); flex-shrink: 0; }',
          '.hrag-ev-logrow { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary); min-width: 0; }',
          '.hrag-ev-logtext { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; animation: hrag-fade-in 200ms ease; }',
          '.hrag-ev-failedchip { flex-shrink: 0; background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color: var(--dsw-alias-state-error-primary); border-radius: 4px; padding: 0 5px; font-size: 10px; }',
          '.hrag-ev-muted { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-tabnums { font-variant-numeric: tabular-nums; }',
          '.hrag-ev-hint { border: 1px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); padding: 14px 10px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-hint-error { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-badge { display: inline-flex; align-items: center; gap: 4px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; padding: 0 6px; font-size: 10px; line-height: 16px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }',
          '.hrag-ev-badge-danger { border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent); color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-badge-amber { border-color: color-mix(in srgb, #f59e0b 45%, transparent); color: #b45309; }',
          '.hrag-ev-badge-baseline { border-color: color-mix(in srgb, #f59e0b 45%, transparent); color: #b45309; }',
          '.hrag-ev-capsule { display: inline-flex; align-items: center; border-radius: 6px; padding: 1px 6px; }',
          '.hrag-ev-sum-ok { background: color-mix(in srgb, #10b981 12%, transparent); color: #047857; }',
          '.hrag-ev-sum-warn { background: color-mix(in srgb, #84cc16 14%, transparent); color: #4d7c0f; }',
          '.hrag-ev-sum-low { background: color-mix(in srgb, #f97316 12%, transparent); color: #c2410c; }',
          '.hrag-ev-table { width: 100%; border-collapse: collapse; font-size: 12px; }',
          '.hrag-ev-table th { text-align: left; font-weight: 500; color: var(--dsw-alias-label-tertiary); padding: 4px 6px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); white-space: nowrap; }',
          '.hrag-ev-table td { padding: 5px 6px; color: var(--dsw-alias-label-primary); vertical-align: middle; }',
          '.hrag-ev-th-num { text-align: right; }',
          '.hrag-ev-th-numlabel { display: inline-flex; align-items: center; gap: 2px; }',
          '.hrag-ev-th-withnote { display: inline-flex; align-items: center; gap: 4px; }',
          // 行选框＝瞬态件（照文档表/工作台）：悬停/勾选/有选中项时显形；表头常亮。
          // 宽 1%＝auto 表格里「收到最窄」的固定技法：26px 只是最小值，剩余宽度
          // 会被表格灌进这一列，选框与问题列之间被拉出大空档（10-19 真跑反馈）。
          '.hrag-ev-th-check { width: 1%; padding-left: 6px; padding-right: 8px; white-space: nowrap; vertical-align: middle; }',
          '.hrag-ev-th-check .hrag-ev-check { vertical-align: middle; }',
          '.hrag-ev-tr .hrag-ev-check { opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-ev-tr:hover .hrag-ev-check { opacity: 1; }',
          '.hrag-ev-tr .hrag-ev-check:checked { opacity: 1; }',
          '.hrag-ev-bank-selecting .hrag-ev-check { opacity: 1; }',
          '.hrag-ev-th-sort { width: 30px; text-align: right; }',
          '.hrag-ev-tr-muted td { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-tr-summary { border-top: 1.5px solid var(--dsw-alias-border-l3); font-weight: 600; }',
          '.hrag-ev-tr { cursor: pointer; }',
          '.hrag-ev-tr:hover td { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-ev-tr-on td { background: var(--dsw-alias-interactive-bg-active); }',
          '.hrag-ev-td-query { max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-ev-time { font-family: ui-monospace, monospace; font-size: 11px; font-variant-numeric: tabular-nums; border-radius: 999px; padding: 1px 7px; }',
          '.hrag-ev-time-regression { background: color-mix(in srgb, #ef4444 10%, transparent); color: #b91c1c; }',
          '.hrag-ev-time-baseline { background: color-mix(in srgb, #f59e0b 12%, transparent); color: #b45309; }',
          '.hrag-ev-status { font-size: 12px; }',
          '.hrag-ev-status-error { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-status-skipped, .hrag-ev-status-cancelled { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-recall { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; }',
          '.hrag-ev-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }',
          '.hrag-ev-dot-ok { background: #10b981; }',
          '.hrag-ev-dot-part { background: #84cc16; }',
          '.hrag-ev-dot-miss { background: #ef4444; }',
          '.hrag-ev-refchunks { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; }',
          '.hrag-ev-danglingicon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-check { accent-color: var(--dsw-alias-button-primary-fill); width: 13px; height: 13px; margin: 0; flex-shrink: 0; }',
          '.hrag-ev-checkrow { display: inline-flex; align-items: center; gap: 12px; padding-top: 5px; }',
          '.hrag-ev-checklabel { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }',
          '.hrag-ev-checklabel-block { display: flex; align-items: flex-start; padding: 2px 0; }',
          '.hrag-ev-menuwrap { position: relative; display: inline-flex; }',
          '.hrag-ev-menu-btn { border: 0.5px solid var(--dsw-alias-border-l3); background: transparent; color: var(--dsw-alias-label-secondary); border-radius: var(--dsw-radius-sm); height: 22px; padding: 0 7px; font-size: 11px; cursor: pointer; font-family: inherit; }',
          '.hrag-ev-segtrack { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }',
          '.hrag-ev-segtrack button { border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11px; height: 18px; padding: 0 8px; border-radius: 6px; cursor: pointer; font-family: inherit; }',
          '.hrag-ev-cardhead-tight { padding: 4px 10px; }',
          ".hrag-ev-segtrack button[aria-pressed='true'] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08); }",
          '.hrag-ev-banner-empty { align-items: center; justify-content: center; padding: 6px 10px; }',
          '.hrag-ev-emptytext { font-size: 12px; }',
          '.hrag-ev-hint-full { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }',
          '.hrag-ev-menudrop { display: inline-flex; }',
          '.hrag-ev-menudrop .hrag-ev-menu-btn { border-radius: 0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0; border: none; border-left: 0.5px solid color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); height: 26px; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-menudrop .hrag-ev-menu-btn:hover { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-module-platform)); }',
          '.hrag-ev-rowmenu .hrag-ev-menu-btn { border: none; width: 22px; height: 22px; padding: 0; }',
          '.hrag-ev-rowmenu-wrap { display: inline-flex; justify-content: flex-end; }',
          '.hrag-ev-menu-backdrop { position: fixed; inset: 0; z-index: 40; }',
          '.hrag-ev-menu { position: fixed; z-index: 41; min-width: 148px; padding: 4px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1); border: 0.5px solid var(--dsw-alias-border-l3); box-shadow: var(--dsw-elevation-panel); }',
          '.hrag-ev-menu-item { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left; padding: 5px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 12px; font-family: inherit; cursor: pointer; white-space: nowrap; }',
          '.hrag-ev-menu-item-icon { display: inline-flex; flex-shrink: 0; color: var(--dsw-alias-label-secondary); }',
          '.hrag-ev-menu-item-danger .hrag-ev-menu-item-icon { color: currentColor; }',
          '.hrag-ev-menu-item:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-ev-menu-item:disabled { opacity: 0.5; cursor: not-allowed; }',
          '.hrag-ev-menu-item-danger { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-menu-check { margin-left: auto; }',
          '.hrag-ev-menu-sep { height: 0.5px; background: var(--dsw-alias-border-l2); margin: 4px 2px; }',
          '.hrag-ev-menu-note { margin-left: auto; color: var(--dsw-alias-label-tertiary); font-size: 10px; padding-left: 8px; }',
          '.hrag-ev-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }',
          '.hrag-ev-grid4 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }',
          '.hrag-ev-grouphead { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500; color: var(--dsw-alias-label-tertiary); margin: 6px 0 6px; }',
          '.hrag-ev-grouphead:first-child { margin-top: 0; }',
          '.hrag-ev-tile { background: color-mix(in srgb, var(--dsw-alias-bg-module-platform) 55%, transparent); border-radius: var(--dsw-radius-md); padding: 8px 10px; min-width: 0; }',
          '.hrag-ev-tile-dim { opacity: 0.6; }',
          '.hrag-ev-tile-title { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--dsw-alias-label-tertiary); min-width: 0; }',
          '.hrag-ev-tile-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-ev-tile-note { cursor: help; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-tracelink { margin-left: auto; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 10px; cursor: pointer; text-decoration: underline; padding: 0; }',
          '.hrag-ev-tile-valuerow { display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 3px; }',
          '.hrag-ev-tile-value { font-size: 16px; font-weight: 600; font-variant-numeric: tabular-nums; }',
          '.hrag-ev-spark { color: var(--dsw-alias-label-tertiary); height: 12px; width: 28px; flex-shrink: 0; }',
          '.hrag-ev-progress { margin-top: 5px; height: 4px; border-radius: 999px; overflow: hidden; background: var(--dsw-alias-bg-module-platform); }',
          '.hrag-ev-progress-fill { height: 100%; border-radius: 999px; }',
          '.hrag-ev-bar-ok { background: #10b981; }',
          '.hrag-ev-bar-warn { background: #f59e0b; }',
          '.hrag-ev-bar-danger { background: #ef4444; }',
          '.hrag-ev-bar-muted { background: var(--dsw-alias-border-l3); }',
          '.hrag-ev-tile-reason { margin-top: 4px; font-size: 10px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-chartwrap { position: relative; min-width: 0; display: flex; flex-direction: column; }',
          '.hrag-ev-chart { display: block; width: 100%; height: 240px; }',
          '.hrag-ev-chart-hover { cursor: pointer; }',
          // ③档批 H1：dataZoom 细滑条（照工作台 slider 14px 细带；左右缘与绘图区同轴）。
          '.hrag-ev-zoom { position: relative; height: 14px; margin: 0 16px 0 46px; flex-shrink: 0; cursor: grab; }',
          '.hrag-ev-zoom-track { position: absolute; left: 0; right: 0; top: 6px; height: 2px; border-radius: 1px; background: var(--dsw-alias-border-l3); }',
          '.hrag-ev-zoom-win { position: absolute; top: 1px; height: 12px; border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 80%, transparent); border: 0.5px solid var(--dsw-alias-border-l3); cursor: grab; }',
          '.hrag-ev-tip { position: absolute; z-index: 5; max-width: 228px; padding: 6px 8px; border-radius: 8px; background: #1f1f1f; border: 0.5px solid rgba(255, 255, 255, 0.14); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24); font-size: 11px; line-height: 16px; color: rgba(255, 255, 255, 0.82); pointer-events: none; }',
          '.hrag-ev-tip-head { font-weight: 600; color: #fff; margin-bottom: 2px; }',
          '.hrag-ev-tip-row { display: flex; align-items: center; gap: 4px; }',
          '.hrag-ev-tip-delta { opacity: 0.6; }',
          '.hrag-ev-tip-regression { margin-top: 2px; color: #fca5a5; }',
          '.hrag-ev-tip-meta { margin-top: 2px; opacity: 0.7; }',
          '.hrag-ev-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px; }',
          '.hrag-ev-legend-item { display: inline-flex; align-items: center; gap: 5px; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11px; cursor: pointer; padding: 1px 2px; font-family: inherit; }',
          '.hrag-ev-legend-off { opacity: 0.45; text-decoration: line-through; }',
          '.hrag-ev-legend-line { width: 12px; height: 2px; border-radius: 2px; flex-shrink: 0; }',
          '.hrag-ev-legend-line-dashed { background-image: linear-gradient(90deg, currentColor 60%, transparent 40%); background-size: 5px 2px; }',
          '.hrag-ev-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }',
          '.hrag-ev-bank { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-ev-bankscroll { min-height: 0; flex: 1; overflow: auto; }',
          '.hrag-ev-banktable { min-width: 480px; }',
          '.hrag-ev-review { display: flex; flex-direction: column; flex-shrink: 0; }',
          '.hrag-ev-review-open { min-height: 0; flex: 1; max-height: 45%; }',
          '.hrag-ev-review-static { font-weight: 600; color: inherit; }',
          '.hrag-ev-reviewlist { min-height: 0; flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }',
          '.hrag-ev-spin-text { display: inline-flex; align-items: center; gap: 4px; }',
          // StateDot 覆盖：宿主件固定 label-tertiary（中性点设计）；语义色语境随容器色（贴工作台 currentColor 口径）。
          '.hrag-statedot { color: inherit; }',
          '.hrag-ev-linkbtn { border: none; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11px; cursor: pointer; padding: 0 2px; text-decoration: underline; font-family: inherit; }',
          '.hrag-ev-linkbtn:disabled { opacity: 0.5; cursor: not-allowed; }',
          '.hrag-ev-cand { display: flex; flex-direction: column; gap: 6px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); padding: 8px 10px; }',
          '.hrag-ev-cand-query { margin: 0; font-size: 13px; color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-cand-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }',
          '.hrag-ev-cand-answer { margin: 0; font-size: 11px; white-space: pre-wrap; word-break: break-word; }',
          '.hrag-ev-cand-actions { display: flex; gap: 6px; }',
          '.hrag-ev-form { display: flex; flex-direction: column; gap: 10px; }',
          '.hrag-ev-formrow { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; }',
          '.hrag-ev-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }',
          '.hrag-ev-fieldlabel { font-size: 12px; font-weight: 500; color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-textarea { min-height: 52px; resize: vertical; padding: 6px 8px; font-size: 12px; font-family: inherit; }',
          '.hrag-ev-select { height: 28px; font-size: 12px; padding: 0 6px; }',
          '.hrag-ev-formnote { margin: 0; font-size: 11px; }',
          '.hrag-ev-anchor { display: flex; flex-direction: column; gap: 6px; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); color: var(--dsw-alias-state-error-primary); border-radius: 8px; padding: 8px 10px; font-size: 12px; }',
          '.hrag-ev-anchor p { margin: 0; }',
          '.hrag-ev-anchor-title { font-weight: 600; }',
          '.hrag-ev-anchor-btn { align-self: flex-start; border: 0.5px solid color-mix(in srgb, #f59e0b 45%, transparent); background: color-mix(in srgb, #f59e0b 15%, transparent); color: #b45309; border-radius: var(--dsw-radius-sm); padding: 3px 10px; font-size: 12px; cursor: pointer; font-family: inherit; }',
          '.hrag-ev-anchor-btn:disabled { opacity: 0.5; cursor: not-allowed; }',
          '.hrag-ev-anchorgroup { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }',
          '.hrag-ev-anchordoc { font-size: 11px; font-weight: 500; color: var(--dsw-alias-label-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-ev-anchorchunk { display: flex; flex-direction: column; gap: 4px; }',
          '.hrag-ev-anchorchunk-trigger { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; border: none; background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer; padding: 2px 0; text-align: left; width: 100%; font-family: inherit; }',
          '.hrag-ev-anchorchunk-preview { font-size: 11px; color: var(--dsw-alias-label-tertiary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-left: 16px; }',
          '.hrag-ev-anchorchunk-body { font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: pre-wrap; word-break: break-word; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 6px 8px; max-height: 180px; overflow-y: auto; margin-left: 16px; }',
          '.hrag-ev-danglingrow { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-caret { display: inline-block; font-size: 10px; color: var(--dsw-alias-label-tertiary); transition: transform 120ms ease; flex-shrink: 0; }',
          '.hrag-ev-caret-open { transform: rotate(180deg); }',
          // 百科两容器的收起箭头改用工作台同款 lucide chevron：展开朝下、收起朝右，
          // 不再用 ▾/▴ 文本小三角（10-18 他对照设置页下拉判为不同件）。
          '.hrag-wk-chev { display: inline-flex; align-items: center; justify-content: center; }',
          '.hrag-wk-chev.hrag-ev-caret-open { transform: none; }',
          '.hrag-wk-chev:not(.hrag-ev-caret-open) { transform: rotate(-90deg); }',
          '.hrag-ev-editgroup { border: 0.5px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 4px 8px; margin-bottom: 6px; }',
          '.hrag-ev-editgroup-head { display: flex; align-items: center; gap: 6px; width: 100%; border: none; background: transparent; cursor: pointer; padding: 3px 0; font-family: inherit; }',
          '.hrag-ev-editgroup-name { flex: 1; min-width: 0; font-size: 11px; font-weight: 500; color: var(--dsw-alias-label-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }',
          '.hrag-ev-editgroup-body { display: flex; flex-direction: column; gap: 2px; padding-left: 16px; padding-bottom: 4px; }',
          '.hrag-ev-editgroup-preview { font-size: 11px; color: var(--dsw-alias-label-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-width: 0; flex: 1; }',
          '.hrag-ev-editactions { display: flex; gap: 8px; margin-top: 4px; }',
          '.hrag-ev-loadmore { align-self: flex-start; margin-top: 2px; }',
          '.hrag-ev-doclist { max-height: 190px; overflow-y: auto; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm); padding: 4px; display: flex; flex-direction: column; gap: 2px; }',
          '.hrag-ev-doclist-empty { margin: 4px 6px; font-size: 11px; }',
          '.hrag-ev-docrow { display: flex; align-items: center; gap: 8px; padding: 5px 6px; border-radius: 6px; cursor: pointer; }',
          '.hrag-ev-docrow:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-ev-docrow-on { background: var(--dsw-alias-interactive-bg-active); }',
          '.hrag-ev-docrow-name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }',
          '.hrag-ev-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }',
          '.hrag-ev-chipwrap { display: flex; flex-wrap: wrap; gap: 5px; }',
          '.hrag-ev-inforow { display: grid; grid-template-columns: 64px 1fr auto; align-items: center; gap: 8px; margin-bottom: 6px; }',
          '.hrag-ev-inforow:last-child { margin-bottom: 0; }',
          '.hrag-ev-infolabel { font-size: 11px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-runidbox { font-family: ui-monospace, monospace; font-size: 11px; background: color-mix(in srgb, var(--dsw-alias-bg-module-platform) 55%, transparent); border-radius: 6px; padding: 3px 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
          '.hrag-ev-fulltime { font-family: ui-monospace, monospace; font-size: 11px; }',
          '.hrag-ev-iconbtn { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; border: none; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; border-radius: 6px; font-size: 12px; padding: 0 4px; }',
          '.hrag-ev-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-iconbtn-text { font-size: 10px; border: 0.5px solid var(--dsw-alias-border-l3); }',
          '.hrag-ev-drawer-qtitle { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }',
          '.hrag-ev-drawerbody { display: flex; flex-direction: column; gap: 10px; }',
          '.hrag-ev-footer { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-top: 0.5px solid var(--dsw-alias-border-l2); flex-shrink: 0; }',
          '.hrag-ev-danger-text { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-ev-pre { margin: 0; font-size: 12px; white-space: pre-wrap; word-break: break-word; }',
          // 召回补面（存为考题）：行勾选与底栏。
          '.hrag-hitrow-row { display: flex; align-items: stretch; gap: 4px; min-width: 0; }',
          '.hrag-hitrow-row .hrag-hitrow { flex: 1; min-width: 0; }',
          // 16px：照工作台 Checkbox（size-4），不再用 22px 撑高召回行。
          '.hrag-hitselect { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; flex-shrink: 0; width: 16px; height: 16px; padding: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 4px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 10px; line-height: 1; cursor: pointer; align-self: center; }',
          '.hrag-hitselect-on { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); border-color: transparent; }',
          '.hrag-hitselect:disabled { opacity: 0.35; cursor: not-allowed; }',
          // 悬浮存为考题栏（小件批 Task 7）：外层不吃交互（pointer-events 双档），
          // 胶囊＝圆角满、底中悬浮、卡片底＋模糊＋阴影（照工作台配方）。
          '.hrag-recall-savebar { position: absolute; left: 0; right: 0; bottom: 12px; z-index: 10; display: flex; justify-content: center; pointer-events: none; }',
          '.hrag-recall-savepill { pointer-events: auto; display: inline-flex; align-items: center; gap: 12px; padding: 5px 16px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-bg-base) 95%, transparent); backdrop-filter: blur(4px); box-shadow: var(--dsw-elevation-prominent); }',
          '.hrag-recall-savecount { margin-left: auto; font-size: 12px; color: var(--dsw-alias-label-secondary); }',
        ].join('\n'),
      )
    }

    /** Failure display: the service's own detail, else the Error text. The host
     * wraps upstream failures as "{status} {body}" (src/http.ts) — unwrap the
     * body's `detail` so the panel reads like the workbench's error surface (a
     * clean sentence, no envelope); anything unparseable stays as-is. */
    function errorDetail(error) {
      const info = error && error.info
      const detail = (info && info.detail) || String(error)
      if (info && info.kind === 'http') {
        const match = /^\d{3}\s+(\{[\s\S]*\})$/.exec(detail)
        if (match) {
          try {
            const body = JSON.parse(match[1])
            if (body && typeof body.detail === 'string' && body.detail) return body.detail
          } catch (cause) {
            // truncated / non-JSON body: keep the original envelope
          }
        }
      }
      return detail
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

    /** 照工作台右键门槛（`document-panel.tsx:1174`「仅就绪文档可选」）：非就绪
     * 文档出题必被后端 409 挡（`SynthesisDocNotReady`，无切片可合成）。 */
    function canGenerateQuestion(doc) {
      return Boolean(doc) && doc.status === 'ready'
    }

    /** 文档失败分类（照工作台 `doc-errors.ts` 逐条移植：模式序、大小写不敏感
     * substring；两枚中文终态串优位——它们才是 failed 的直接解释）。 */
    function classifyDocError(error) {
      const text = String(error == null ? '' : error).toLowerCase()
      if (text.includes('向量索引不完整')) return 'indexIncomplete'
      if (text.includes('无可索引内容')) return 'noIndexableContent'
      if (text.includes('file is empty')) return 'empty'
      if (text.includes('unsupported file type')) return 'unsupported'
      if (text.includes('retry limit reached')) return 'retryLimit'
      if (text.includes('mineru_api_token')) return 'serviceUnconfigured'
      if (text.includes('timed out') || text.includes('timeout')) return 'timeout'
      return 'unknown'
    }

    /** 失败折叠（小件批 Task 3，照工作台 `useDocFailureNotifier` 语义逐条移植）：
        仅入 failed 转变播报／首屏不补播（预标记）／episode 去重（离 failed 清记、
        再 failed 重报）／离 failed 或删行撤条（rejection-* 保留）。纯函数＝可冒烟。 */
    function foldDocFailures(state, docs, reasonOf) {
      const byId = new Map(docs.map((doc) => [doc.id, doc]))
      const entries = state.entries.filter(
        (entry) => entry.key.indexOf('rejection-') === 0 || (byId.get(entry.key) && byId.get(entry.key).status === 'failed'),
      )
      const notified = new Set(state.notified)
      for (const doc of docs) {
        if (doc.status !== 'failed') notified.delete(doc.id)
      }
      if (!state.initialized) {
        for (const doc of docs) {
          if (doc.status === 'failed') notified.add(doc.id)
        }
        return { entries, notified, initialized: true }
      }
      const fresh = docs.filter((doc) => doc.status === 'failed' && !notified.has(doc.id))
      if (fresh.length === 0) return { entries, notified, initialized: true }
      for (const doc of fresh) notified.add(doc.id)
      return {
        entries: entries.concat(
          fresh.map((doc) => ({ key: doc.id, name: doc.name, reason: reasonOf(doc), retryable: true })),
        ),
        notified,
        initialized: true,
      }
    }

    /** 文件后缀规范化（照工作台 `supported-formats.ts` fileSuffix：小写虚线后缀，
     * 点文件与无点返回空串）。 */
    function fileSuffix(name) {
      const text = String(name)
      const dot = text.lastIndexOf('.')
      return dot <= 0 ? '' : text.slice(dot).toLowerCase()
    }

    /** 后缀 → 徽章类（照工作台 `file-type-badge.tsx` KIND_BY_SUFFIX 逐条移植）。
     * 未接受解析的类别（压缩包/音视频/多数图片）也照映射——解析支持后图标即亮。 */
    const KIND_BY_SUFFIX = {
      // 文档 #2563EB
      '.doc': 'word', '.docx': 'word', '.wps': 'word', '.pages': 'word', '.rtf': 'word', '.txt': 'word',
      // 表格 #16A34A
      '.xls': 'sheet', '.xlsx': 'sheet', '.csv': 'sheet', '.tsv': 'sheet', '.numbers': 'sheet', '.et': 'sheet',
      // 演示 #F97316
      '.ppt': 'ppt', '.pptx': 'ppt', '.key': 'ppt', '.dps': 'ppt',
      // PDF #DC2626
      '.pdf': 'pdf',
      // 代码与数据 #0891B2 — Markdown 归此类，不与 .docx 共用蓝色文档图标
      '.md': 'code', '.markdown': 'code', '.json': 'code', '.yaml': 'code', '.xml': 'code', '.py': 'code', '.js': 'code', '.sql': 'code',
      // 图片 #8B5CF6
      '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image', '.svg': 'image', '.bmp': 'image',
      // 音视频 #EC4899
      '.mp4': 'media', '.mov': 'media', '.avi': 'media', '.mkv': 'media', '.mp3': 'media', '.wav': 'media',
      // 压缩包 #B45309
      '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive', '.gz': 'archive',
    }

    /** 文件名 → 徽章类；未映射后缀与无后缀名走 unknown 兜底。 */
    function fileTypeKind(fileName) {
      return KIND_BY_SUFFIX[fileSuffix(fileName)] || 'unknown'
    }

    /** 文档行类型徽章（10-15 D1 更裁乙：照工作台 `file-type-badge.tsx` 整件移植）
     * ——几何＝Ardot「56 网格」母版原样（含逐节点 transform，重导出可对照），色族
     * 按设计稿、后缀映射＝上表；形状载类型、颜色载族，徽章不渲染文字。改色或挪
     * 后缀先改设计稿（它是权威）再同步此处。 */
    const FT_SHEET_D = 'M7 0L28 0L39.6667 11.6667L39.6667 39.6667C39.6667 43.54 36.54 46.6667 32.6667 46.6667L7 46.6667C3.1267 46.6667 0 43.54 0 39.6667L0 7C0 3.1267 3.1267 0 7 0Z'
    const FT_FOLD_D = 'M0 0L11.6667 11.6667L0 11.6667L0 0Z'

    /** 折角页骨架——九枚里七枚共用。 */
    function ftSheet(fold, shell) {
      return [
        h('path', { key: 'sheet', d: FT_SHEET_D, fill: shell, transform: 'matrix(1 0 0 1 4.66667 4.66667)' }),
        h('path', { key: 'fold', d: FT_FOLD_D, fill: fold, transform: 'matrix(1 0 0 1 32.6667 4.66667)' }),
      ]
    }

    const FT_ICON_BY_KIND = {
      pdf: ftSheet('#B91C1C', '#DC2626').concat([
        // 字母 P，Sarasa Gothic SC Bold 24 已在画布转成轮廓
        h('path', { key: 'p', d: 'M1.584 21L1.584 3.528L8.4 3.528Q10.392 3.528 11.784 4.296Q13.176 5.04 13.896 6.384Q14.64 7.704 14.64 9.432Q14.64 11.16 13.896 12.48Q13.152 13.8 11.736 14.544Q10.32 15.288 8.304 15.288L5.16 15.288L5.16 21L1.584 21M5.16 12.408L7.728 12.408Q9.384 12.408 10.152 11.592Q10.944 10.752 10.944 9.432Q10.944 8.112 10.152 7.32Q9.384 6.504 7.728 6.504L5.16 6.504L5.16 12.408Z', fill: '#FFF', transform: 'matrix(1 0 0 1 17 24)' }),
      ]),
      word: ftSheet('#1E40AF', '#2563EB').concat([
        h('rect', { key: 'l1', fill: '#FFF', height: 3.9667, rx: 1.9833, width: 24.7333, x: 12.1333, y: 26.6 }),
        h('rect', { key: 'l2', fill: '#FFF', height: 3.9667, rx: 1.9833, width: 24.7333, x: 12.1333, y: 34.7667 }),
        h('rect', { key: 'l3', fill: '#FFF', height: 3.9667, rx: 1.9833, width: 14.9333, x: 12.1333, y: 42.9333 }),
      ]),
      sheet: ftSheet('#15803D', '#16A34A').concat([
        h('rect', { key: 'l1', fill: '#FFF', height: 3.5, rx: 1.75, width: 24.7333, x: 12.1333, y: 25.6667 }),
        h('rect', { key: 'l2', fill: '#FFF', height: 3.5, rx: 1.75, width: 24.7333, x: 12.1333, y: 34.0667 }),
        h('rect', { key: 'l3', fill: '#FFF', height: 3.5, rx: 1.75, width: 24.7333, x: 12.1333, y: 42.4667 }),
        h('rect', { key: 'v1', fill: '#FFF', height: 20.3, rx: 1.75, width: 3.5, x: 20.0667, y: 25.6667 }),
        h('rect', { key: 'v2', fill: '#FFF', height: 20.3, rx: 1.75, width: 3.5, x: 28.4667, y: 25.6667 }),
      ]),
      ppt: ftSheet('#C2410C', '#F97316').concat([
        h('rect', { key: 'card', fill: '#FFF', height: 20.5333, rx: 3.2667, width: 27.5333, x: 10.7333, y: 24.2667 }),
        h('rect', { key: 't1', fill: '#F97316', height: 3.7333, rx: 1.8667, width: 10.7333, x: 14.4667, y: 28.4667 }),
        h('rect', { key: 't2', fill: '#F97316', height: 2.8, opacity: 0.45, rx: 1.4, width: 20.0667, x: 14.4667, y: 34.7667 }),
        h('rect', { key: 't3', fill: '#F97316', height: 2.8, opacity: 0.45, rx: 1.4, width: 14, x: 14.4667, y: 39.4333 }),
      ]),
      code: ftSheet('#0E7490', '#0891B2').concat([
        h('path', { key: 'lt', d: 'M7.2333 0L0 6.5333L7.2333 13.0667L9.5667 10.7333L4.2 6.5333L9.5667 2.3333L7.2333 0Z', fill: '#FFF', transform: 'matrix(1 0 0 1 14.2333 24.2667)' }),
        h('path', { key: 'gt', d: 'M2.3333 0L9.5667 6.5333L2.3333 13.0667L0 10.7333L5.3667 6.5333L0 2.3333L2.3333 0Z', fill: '#FFF', transform: 'matrix(1 0 0 1 25.2 24.2667)' }),
      ]),
      image: [
        h('rect', { key: 'bg', fill: '#8B5CF6', height: 37.3333, rx: 7, width: 44.3333, x: 5.8333, y: 9.3333 }),
        h('circle', { key: 'sun', cx: 18.4333, cy: 20.0667, fill: '#FFF', r: 4.2 }),
        h('path', { key: 'hill', d: 'M0 17.0333L12.6 0L23.3333 12.6L28.4667 7L36.4 17.0333L0 17.0333Z', fill: '#FFF', transform: 'matrix(1 0 0 1 9.8 28.4667)' }),
      ],
      media: [
        h('rect', { key: 'bg', fill: '#EC4899', height: 37.3333, rx: 7, width: 44.3333, x: 5.8333, y: 9.3333 }),
        h('path', { key: 'play', d: 'M0 0L12.6 6.5333L0 13.0667L0 0Z', fill: '#FFF', transform: 'matrix(1 0 0 1 23.3333 21.4667)' }),
      ],
      archive: ftSheet('#92400E', '#B45309').concat([
        h('rect', { key: 'z1', fill: '#FFF', height: 21.9333, rx: 1.8667, width: 3.7333, x: 24.9667, y: 22.4 }),
        h('rect', { key: 'z2', fill: '#FFF', height: 3.7333, rx: 1.8667, width: 16.3333, x: 17.7333, y: 30.3333 }),
        h('rect', { key: 'z3', fill: '#FFF', height: 3.7333, rx: 1.8667, width: 16.3333, x: 17.7333, y: 37.3333 }),
      ]),
      // 未知类型：只有折角页轮廓，不假装有类型信息
      unknown: ftSheet('#475569', '#64748B'),
    }

    /** 设计稿徽章；尺寸走 className（20px 是 S 档下限——16px 折角细节糊成发丝）。 */
    function FileTypeBadge({ fileName, className }) {
      const kind = fileTypeKind(fileName)
      return h(
        'svg',
        { 'aria-hidden': 'true', className: className, 'data-filetype': kind, viewBox: '0 0 56 56' },
        FT_ICON_BY_KIND[kind],
      )
    }

    /** Hand-built confirm dialog (the plugin styling contract forbids Harness
     * Client imports): Escape closes, cancel holds the initial focus, and the
     * caller passes the cascade copy. */
    function ConfirmDialog({ t, title, description, error, busy, onCancel, onConfirm, cancelKey, confirmKey, danger = true }) {
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
              {
                type: 'button',
                className: danger ? 'hrag-btn hrag-btn-danger' : 'hrag-btn hrag-btn-primary',
                disabled: busy,
                onClick: onConfirm,
              },
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
    /** 抽屉抽取轮询节拍（照工作台 chunk-drawer refetchInterval 3000）：仅当
        任一切片仍在抽取（extract_status==='pending'）时武装。 */
    const CHUNK_POLL_MS = 3000
    /** 实体徽章展示上限（照工作台 chunk-card ENTITY_CAP）：超出折成 +N。 */
    const ENTITY_CAP = 6
    /** Poll cadence for the documents list and the reindex status — the
     * workbench's library pipelines share this 3s cadence. */
    const PIPELINE_POLL_MS = 3000
    /** Bar-notice auto-dismiss (toast semantics in the workbench: brief
     * acknowledgment; the durable truth lives in the list and status line).
     * Errors get a longer read. */
    const NOTICE_DISMISS_MS = 4000
    const NOTICE_DISMISS_ERROR_MS = 8000

    /** 瞬时提示总线（Task 6）：任一视图 `showToast(text, { error })` → 面板级 ToasterHost
        挂载宿主 `Toast`（portal、逐发 seq 重启周期；错误 8s／常规 4s＝旧口径）。缺件回退
        旧行内行（挂在顶栏行内，位置同旧 barNotice 行）。 */
    const toastBus = {
      current: null,
      listeners: new Set(),
      show(text, options) {
        this.current = { text: text, options: options || {}, seq: (this.current ? this.current.seq + 1 : 1) }
        this.listeners.forEach((fn) => fn(this.current))
      },
    }
    const showToast = (text, options) => toastBus.show(text, options)
    function ToasterHost({ anchorRef }) {
      const [item, setItem] = React.useState(toastBus.current)
      React.useEffect(() => {
        const fn = (value) => setItem(value)
        toastBus.listeners.add(fn)
        return () => {
          toastBus.listeners.delete(fn)
        }
      }, [])
      if (!item) return null
      const isError = !!(item.options && item.options.error)
      if (!HostToast) {
        return h('div', { className: isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice', role: 'status' }, item.text)
      }
      const ErrorIcon = hostIcon('IconCloseCircleOutlineRegular')
      return h(HostToast, {
        key: item.seq,
        text: item.text,
        tone: isError ? undefined : 'success',
        icon: isError && ErrorIcon ? h(ErrorIcon, {}) : undefined,
        anchor: (anchorRef && anchorRef.current) || undefined,
        holdMs: isError ? NOTICE_DISMISS_ERROR_MS : NOTICE_DISMISS_MS,
        onDone: () => setItem((current) => (current && current.seq === item.seq ? null : current)),
      })
    }

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

    /** 包围盒拟合视口（自动全览，2026-10-13）：八折留边、只缩不放（上限 1）、
        下限夹取；需要缩放时再压到标签隐藏阈下（全览态零标签）。力场步进与
        初载预拟合共用同一纯函数——初载在撒点后即刻拟合，防「首帧全图一闪
        再缩」。容器未挂尺寸（0×0）或空 → null（调用方保持原视口）。 */
    function graphFitViewport(wrap, items) {
      if (!wrap || !items || items.length === 0) return null
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (!(w > 0) || !(h > 0)) return null
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
      const rawFit = Math.min(w / boxW, h / boxH) * 0.8
      const fit = rawFit >= 1 ? 1 : Math.min(rawFit, GRAPH_LABEL_HIDE_BELOW * 0.96)
      const zoom = Math.max(GRAPH_MIN_SCALE, Math.min(GRAPH_MAX_SCALE, fit))
      return { zoom, ox: -((minX + maxX) / 2) * zoom, oy: -((minY + maxY) / 2) * zoom }
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

    // ── 评测（Task 8）：纯函数层照工作台 eval-run-status / eval-trend-chart.utils
    // / eval-sparkline / format 逐条移植；参数化文案走 {0} 占位符（宿主 locale
    // 只收纯串，参数在客户端拼）。 ────────────────────────────────────────────

    /** 占位符插值：{0}/{1}…；缺参保留原占位。 */
    function evText(text, args) {
      if (typeof text !== 'string' || !args || args.length === 0) return text
      return text.replace(/\{(\d+)\}/g, (match, index) => {
        const value = args[Number(index)]
        return value === undefined ? match : String(value)
      })
    }

    /** 轮询节奏（照 eval-run-status）：在飞 3s，空闲不轮询。 */
    const EVAL_RUNS_POLL_MS = 3000
    /** 完整档流水线段数（layer1 → questions → ragas）。 */
    const EVAL_PHASE_COUNT = 3
    const EVAL_PHASE_ORDER = ['layer1', 'questions', 'ragas']
    /** 先验时长占比（冷启动猜测；照 PHASE_WEIGHT_PRIOR）。 */
    const EVAL_PHASE_PRIOR = {
      l1_l2: { layer1: 0.1, questions: 0.35, ragas: 0.55 },
      l1: { layer1: 1 },
    }
    const EVAL_MIN_PHASE_SECONDS = 1
    const EVAL_ETA_WARMUP_SECONDS = 5

    function evPhaseStep(progress) {
      if (progress && progress.phase === 'questions') return 2
      if (progress && progress.phase === 'ragas') return 3
      return 1
    }

    function evPhasesFor(tier) {
      return tier === 'l1' ? ['layer1'] : EVAL_PHASE_ORDER
    }

    function evParseMs(timestamp) {
      if (!timestamp) return null
      const ms = Date.parse(timestamp)
      return Number.isFinite(ms) ? ms : null
    }

    function evCurrentPhase(progress, phases) {
      const fallback = phases[0] || 'layer1'
      return progress && phases.indexOf(progress.phase) >= 0 ? progress.phase : fallback
    }

    /** 各段跨度时长权重（照 adaptiveWeights：已完成段实测、剩余段先验缩放到
        已观测速率；当前段超时取期望与已跑的较大者）。 */
    function evAdaptiveWeights(progress, tier, nowMs) {
      const phases = evPhasesFor(tier)
      const prior = tier === 'l1_l2' ? EVAL_PHASE_PRIOR.l1_l2 : EVAL_PHASE_PRIOR.l1
      const current = evCurrentPhase(progress, phases)
      const measured = (progress && progress.phase_durations) || {}
      const currentIndex = phases.indexOf(current)
      let measuredSum = 0
      let priorCompletedSum = 0
      for (const phase of phases.slice(0, currentIndex)) {
        const observed = measured[phase]
        if (typeof observed === 'number' && Number.isFinite(observed)) {
          measuredSum += Math.max(observed, EVAL_MIN_PHASE_SECONDS)
          priorCompletedSum += prior[phase] || 0
        }
      }
      const scale = priorCompletedSum > 0 && measuredSum > 0 ? measuredSum / priorCompletedSum : 1
      const calibrated = priorCompletedSum > 0 && measuredSum > 0
      const startedMs = evParseMs(progress && progress.phase_started_at)
      const currentElapsed = startedMs === null ? null : Math.max((nowMs - startedMs) / 1000, 0)
      const durations = {}
      phases.forEach((phase, index) => {
        const observed = measured[phase]
        if (index < currentIndex && typeof observed === 'number' && Number.isFinite(observed)) {
          durations[phase] = Math.max(observed, EVAL_MIN_PHASE_SECONDS)
          return
        }
        const expected = (prior[phase] || 0) * scale
        durations[phase] =
          index === currentIndex && calibrated && currentElapsed !== null
            ? Math.max(expected, currentElapsed)
            : expected
      })
      const total = phases.reduce((sum, phase) => sum + (durations[phase] || 0), 0)
      if (total <= 0) {
        const even = 1 / phases.length
        const out = {}
        for (const phase of phases) out[phase] = even
        return out
      }
      const out = {}
      for (const phase of phases) out[phase] = (durations[phase] || 0) / total
      return out
    }

    /** 加权整体完成度 0..1（照 overallFraction）。 */
    function evOverallFraction(progress, tier, nowMs) {
      if (!progress) return 0
      const phases = evPhasesFor(tier)
      const weights = evAdaptiveWeights(progress, tier, nowMs)
      const current = evCurrentPhase(progress, phases)
      let completed = 0
      for (const phase of phases) {
        if (phase === current) break
        completed += weights[phase] || 0
      }
      const within = progress.total > 0 ? Math.min(1, Math.max(0, progress.done / progress.total)) : 0
      return Math.min(1, Math.max(0, completed + (weights[current] || 0) * within))
    }

    /** 预计剩余秒数（照 etaSeconds：按段速率外推 + warmup 门控；永不负）。 */
    function evEtaSeconds(progress, tier, nowMs) {
      if (!progress) return null
      const phases = evPhasesFor(tier)
      const current = evCurrentPhase(progress, phases)
      const within = progress.total > 0 ? Math.min(1, Math.max(0, progress.done / progress.total)) : 0
      const startedMs = evParseMs(progress && progress.phase_started_at)
      const elapsed = startedMs === null ? null : Math.max((nowMs - startedMs) / 1000, 0)
      if (within <= 0 || elapsed === null || elapsed < EVAL_ETA_WARMUP_SECONDS) return null
      const phaseFull = elapsed / within
      const prior = tier === 'l1_l2' ? EVAL_PHASE_PRIOR.l1_l2 : EVAL_PHASE_PRIOR.l1
      const currentPrior = prior[current] || 0
      let future = 0
      if (currentPrior > 0) {
        for (const phase of phases.slice(phases.indexOf(current) + 1)) {
          future += ((prior[phase] || 0) / currentPrior) * phaseFull
        }
      }
      return Math.max(0, phaseFull * (1 - within) + future)
    }

    /** 在飞那次运行的档位（照 runningTier）。 */
    function evRunningTier(progress, triggeredTier, selectedTier) {
      if (progress && progress.phase !== 'layer1') return 'l1_l2'
      return triggeredTier || selectedTier
    }

    /** 历史行档位（照 tierOfRun）：has_layer2 即完整档。 */
    function evTierOfRun(run) {
      return run && run.has_layer2 ? 'l1_l2' : 'l1'
    }

    /** 历史行耗时（秒）；缺戳/倒序 → null。 */
    function evRunDurationSeconds(run) {
      if (!run || !run.created_at || !run.completed_at) return null
      const created = Date.parse(run.created_at)
      const completed = Date.parse(run.completed_at)
      if (Number.isNaN(created) || Number.isNaN(completed)) return null
      const seconds = (completed - created) / 1000
      return seconds >= 0 ? seconds : null
    }

    /** 时长结构（照 durationParts）→ 文案（dur* 词表）。 */
    function evDurationText(t, seconds) {
      const total = Math.max(0, Math.round(seconds))
      if (total < 60) return evText(t('ev.durSeconds'), [total])
      const minutes = Math.floor(total / 60)
      const rest = total % 60
      return rest === 0 ? evText(t('ev.durMinutes'), [minutes]) : evText(t('ev.durMinutesSeconds'), [minutes, rest])
    }

    /** 行内时间 MM-DD HH:mm（照 formatRunTime）；缺失/非法 → '-'。 */
    function evFmtRunTime(iso) {
      if (!iso) return '-'
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return '-'
      const pad = (value) => String(value).padStart(2, '0')
      return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
    }

    /** 完整时间 YYYY-MM-DD HH:mm:ss（tooltip / 详情行用）。 */
    function evFmtFullTime(iso) {
      if (!iso) return '-'
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return '-'
      const pad = (value) => String(value).padStart(2, '0')
      return (
        date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        ' ' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds())
      )
    }

    /** 百分数 1 位小数（全评测面统一数值语言）；null → '-'。 */
    function evPercent(value) {
      return value == null ? '-' : (value * 100).toFixed(1) + '%'
    }

    /** 进度条色档（照 getProgressBarColor）：≥0.8 ok／≥0.6 warn／其余 danger。 */
    function evBarClass(value) {
      if (value == null) return 'hrag-ev-bar-muted'
      if (value >= 0.8) return 'hrag-ev-bar-ok'
      if (value >= 0.6) return 'hrag-ev-bar-warn'
      return 'hrag-ev-bar-danger'
    }

    /** 汇总行胶囊色档（照 getSummaryBandClass）：≥0.9／≥0.8／<0.8。 */
    function evSummaryClass(value) {
      if (value == null) return ''
      if (value >= 0.9) return 'hrag-ev-sum-ok'
      if (value >= 0.8) return 'hrag-ev-sum-warn'
      return 'hrag-ev-sum-low'
    }

    /** ragas 跳过原因分档（照 classifyRagasSkipReason）：未安装前缀归 not-installed。 */
    function evClassifyRagasSkip(reason) {
      if (!reason || String(reason).indexOf('ragas 未安装') === 0) return 'not-installed'
      return 'error'
    }

    /** 去重保序文档 id 集（照 refDocIds：`{doc}#NNNN` 前缀）。 */
    function evRefDocIds(chunkIds) {
      const seen = []
      const set = new Set()
      for (const chunkId of chunkIds || []) {
        const docId = String(chunkId).split('#')[0]
        if (docId && !set.has(docId)) {
          set.add(docId)
          seen.push(docId)
        }
      }
      return seen
    }

    /** B′ 锚定拦截识别（照 parseAnchorBlockDetail）：结构化 detail（对象 +
        reason 枚举 + miss_terms 数组）→ 详情；其余 null。 */
    function evAsAnchorBlockDetail(error) {
      const info = error && error.info
      const detail = info && info.detail
      if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null
      const reason = detail.reason
      if (reason !== 'mismatch' && reason !== 'zero_hit' && reason !== 'missing_chunk') return null
      if (!Array.isArray(detail.miss_terms) || !detail.miss_terms.every((term) => typeof term === 'string')) {
        return null
      }
      return detail
    }

    // ── 趋势图数学（照 eval-trend-chart.utils，冷链冻结口径）─────────────────
    /** 6 图例指标（颜色/线型/默认显隐照 spec §4.3.2 冻结表）。 */
    const EVAL_TREND_METRICS = [
      { key: 'recall_at_k', labelKey: 'ev.tableRecallAtK', color: '#3B82F6', layer: 1, defaultOn: true },
      { key: 'hit_rate', labelKey: 'ev.tableHitRate', color: '#10B981', layer: 1, defaultOn: true },
      { key: 'mrr', labelKey: 'ev.tableMrr', color: '#8B5CF6', layer: 1, defaultOn: false },
      { key: 'faithfulness', labelKey: 'ev.ragasCard.faithfulness', color: '#F59E0B', layer: 2, defaultOn: false },
      { key: 'answer_relevancy', labelKey: 'ev.ragasCard.answerRelevancy', color: '#EC4899', layer: 2, defaultOn: false },
      { key: 'context_precision', labelKey: 'ev.ragasCard.contextPrecision', color: '#06B6D4', layer: 2, defaultOn: false },
    ]
    /** picker 5 稀疏候选（不进图例；颜色冻结与六色不撞）。 */
    const EVAL_PICKER_METRICS = [
      { key: 'path_accuracy', labelKey: 'ev.tablePathAccuracy', color: '#84CC16', layer: 1 },
      { key: 'citation_precision', labelKey: 'ev.citationPrecision', color: '#F97316', layer: 2 },
      { key: 'citation_recall', labelKey: 'ev.citationRecall', color: '#14B8A6', layer: 2 },
      { key: 'seed_hit_rate', labelKey: 'ev.seedHitRate', color: '#A855F7', layer: 2 },
      { key: 'routing_hit_rate', labelKey: 'ev.routingHitRate', color: '#64748B', layer: 2 },
    ]
    const EVAL_REGRESSION_COLOR = '#EF4444'
    /** 视窗预设三档（contract v4）：日/周/月 = 客户端视窗 24h/7d/30d。 */
    const EVAL_SPAN_MS = { day: 24 * 3600000, week: 7 * 24 * 3600000, month: 30 * 24 * 3600000 }
    /** 分段加权纵轴折点（contract v5 冻结）：真值 → 图高。 */
    const EVAL_WARP_STOPS = [
      [0, 0],
      [0.4, 0.2],
      [0.8, 0.4],
      [0.9, 0.6],
      [0.95, 0.8],
      [1, 1],
    ]
    /** 六等分刻度标签表（不等间距即非线性披露）。 */
    const EVAL_WARP_TICKS = [
      [0, '0%'],
      [0.2, '40%'],
      [0.4, '80%'],
      [0.6, '90%'],
      [0.8, '95%'],
      [1, '100%'],
    ]

    function evWarpValue(value) {
      const v = Math.min(1, Math.max(0, value))
      for (let i = 1; i < EVAL_WARP_STOPS.length; i += 1) {
        const [x0, y0] = EVAL_WARP_STOPS[i - 1]
        const [x1, y1] = EVAL_WARP_STOPS[i]
        if (v <= x1) return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0)
      }
      return 1
    }

    /** dataZoom 初始索引窗（照工作台 presetToIndexWindow）：日/周/月 → 首个
        ts ≥ 末点 − 跨度的索引。切档只移窗口，不重新取数。 */
    function evTrendWindow(points, preset) {
      const n = points ? points.length : 0
      if (n === 0) return { start: 0, end: 0 }
      const last = n - 1
      const span = EVAL_SPAN_MS[preset] || EVAL_SPAN_MS.month
      const lastTs = Date.parse(points[last].ts)
      if (!Number.isFinite(lastTs)) return { start: 0, end: last }
      const cutoff = lastTs - span
      let start = last
      for (let i = 0; i <= last; i += 1) {
        const ts = Date.parse(points[i].ts)
        if (Number.isFinite(ts) && ts >= cutoff) {
          start = i
          break
        }
      }
      return { start, end: last }
    }

    /** 火花线（照 EvalSparkline 28×12）：min-max 归一 + 末点实心圆；<2 值 null。 */
    function evSparkline(values) {
      if (!Array.isArray(values) || values.length < 2) return null
      const width = 28
      const height = 12
      const pad = 1.5
      const min = Math.min(...values)
      const max = Math.max(...values)
      const span = max - min
      const innerW = width - pad * 2
      const innerH = height - pad * 2
      const lastIndex = values.length - 1
      const pts = values.map((value, index) => {
        const x = pad + (index / lastIndex) * innerW
        const y = span === 0 ? pad + innerH / 2 : pad + innerH - ((value - min) / span) * innerH
        return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
      })
      const end = pts[lastIndex]
      return h(
        'svg',
        { className: 'hrag-ev-spark', viewBox: '0 0 28 12', 'aria-hidden': 'true', fill: 'none' },
        h('polyline', {
          points: pts.map((p) => p.x + ',' + p.y).join(' '),
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fill: 'none',
        }),
        h('circle', { cx: end.x, cy: end.y, r: 1.5, fill: 'currentColor' }),
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

    /** 切片刻度轨（照工作台 `chunk-tick-rail.tsx` 整件移植，10-15 A⑫）：刻度列
     * 是主体——窗口化刻度列（x/尺寸/间距两态恒定），悬停在其左侧开标签层，行高
     * 与刻度 1:1、其滚动驱动同一窗口偏移（刻度随动）；点刻度或行跳片。叠加层：
     * 不入抽屉滚动流。 */
    const TICK_VISIBLE = 11 // 可见刻度槽数（奇数 → active 居中；弹窗可见行数同值）
    const TICK_MIN = 5 // 渲染门槛：刻度总数 ≥5（低于门槛跳转价值低，短带只是噪音）
    const TICK_GAP = 26 // 刻度间距 == 弹窗行高（下限被热区 16px 留隙与 12px 行高夹住）
    const TICK_HIT = 16 // 刻度按钮热区高度（小于间距，热区之间留隙不粘连）

    /** 刻度渲染窗口（纯函数，冒烟钉）：以 active 为中心夹取，永在 [0,total) 内，
     * 且在文档两端各保至少一档可见刻度（遮罩列不出现空半截）。 */
    function tickRange(active, total, radius = 10) {
      if (total <= 0) return { end: 0, start: 0 }
      const a = Math.min(Math.max(active, 0), total - 1)
      const r = Math.max(radius, Math.floor(TICK_VISIBLE / 2))
      const start = Math.max(0, Math.min(a - r, total - 1))
      const end = Math.min(total, Math.max(a + r + 1, start + Math.min(total, TICK_VISIBLE)))
      return { end: end, start: start }
    }

    function ChunkTickRail({ total, active, entries, onJump, tickLabel, unloadedLabel }) {
      const [open, setOpen] = React.useState(false)
      const [scrollTop, setScrollTop] = React.useState(0)
      const openTimer = React.useRef(null)
      const closeTimer = React.useRef(null)
      const popupScrollRef = React.useRef(null)

      const clearTimers = () => {
        if (openTimer.current) window.clearTimeout(openTimer.current)
        if (closeTimer.current) window.clearTimeout(closeTimer.current)
      }
      // 悬停意图：进轨 150ms 后开弹窗；离轨且离弹窗（跨缝宽限）200ms 关。
      const scheduleOpen = () => {
        clearTimers()
        openTimer.current = window.setTimeout(() => setOpen(true), 150)
      }
      const scheduleClose = () => {
        clearTimers()
        closeTimer.current = window.setTimeout(() => setOpen(false), 200)
      }
      React.useEffect(() => clearTimers, [])

      const previews = React.useMemo(
        () => new Map(entries.map((entry) => [entry.index, entry.preview])),
        [entries],
      )
      const clampedActive = total > 0 ? Math.min(Math.max(active, 0), total - 1) : 0

      // 共享窗口偏移（可为小数行）：弹窗打开时由其 scrollTop 驱动；收起时让
      // active 居中。两种状态共用同一套刻度定位公式 → 几何恒定。
      const maxOffset = Math.max(0, total - TICK_VISIBLE)
      const offset = open
        ? Math.min(scrollTop / TICK_GAP, maxOffset)
        : Math.min(Math.max(clampedActive - (TICK_VISIBLE - 1) / 2, 0), maxOffset)
      const base = Math.floor(offset)
      const frac = offset - base
      const band = tickRange(base + (TICK_VISIBLE - 1) / 2, total)
      const ticks = []
      for (let index = band.start; index < band.end; index += 1) ticks.push(index)

      // 打开时把 active 行滚到弹窗可见带中心；scroll 事件随后同步 offset。
      React.useEffect(() => {
        if (!open) return
        const viewport = popupScrollRef.current
        if (!viewport) return
        const max = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
        viewport.scrollTop = Math.min(
          Math.max((clampedActive - (TICK_VISIBLE - 1) / 2) * TICK_GAP, 0),
          max,
        )
        setScrollTop(viewport.scrollTop)
      }, [open, clampedActive])

      // 弹窗滚动 → 共享窗口偏移（rAF 节流）。
      React.useEffect(() => {
        const viewport = popupScrollRef.current
        if (!open || !viewport) return
        let frame = 0
        const onScroll = () => {
          if (frame) return
          frame = requestAnimationFrame(() => {
            frame = 0
            setScrollTop(viewport.scrollTop)
          })
        }
        viewport.addEventListener('scroll', onScroll, { passive: true })
        return () => {
          if (frame) cancelAnimationFrame(frame)
          viewport.removeEventListener('scroll', onScroll)
        }
      }, [open])

      if (total < TICK_MIN) return null

      const bandHeight = Math.min(total, TICK_VISIBLE) * TICK_GAP

      return h(
        'div',
        { className: 'hrag-tickrail', onMouseEnter: scheduleOpen, onMouseLeave: scheduleClose },
        // 标签层：行高 == TICK_GAP，行槽与刻度槽逐一对齐；其滚动驱动共享窗口。
        open
          ? h(
              'div',
              { className: 'hrag-tickrail-popup', style: { height: bandHeight + 'px' } },
              h(
                'div',
                { className: 'hrag-tickrail-scroll', ref: popupScrollRef },
                h(
                  'div',
                  { className: 'hrag-tickrail-rows' },
                  Array.from({ length: total }, (_, index) => {
                    const preview = previews.get(index) ?? null
                    return h(
                      'button',
                      {
                        type: 'button',
                        key: index,
                        className:
                          index === clampedActive ? 'hrag-tickrail-row hrag-tickrail-row-active' : 'hrag-tickrail-row',
                        style: { height: TICK_GAP + 'px' },
                        onClick: () => {
                          onJump(index)
                          setOpen(false)
                        },
                      },
                      h('span', { className: 'hrag-tickrail-idx' }, '#' + String(index + 1)),
                      h(
                        'span',
                        { className: preview ? 'hrag-tickrail-text' : 'hrag-tickrail-text hrag-tickrail-text-unloaded' },
                        preview ?? unloadedLabel,
                      ),
                    )
                  }),
                ),
              ),
            )
          : null,
        // 刻度主体：两态同一公式定位（(i−base)·gap − frac·gap），几何恒定；
        // overflow + mask 截断窗口外刻度。z 压标签层上。
        h(
          'div',
          { className: 'hrag-tickrail-ticks', style: { height: bandHeight + 'px' } },
          ticks.map((index) =>
            h(
              'button',
              {
                type: 'button',
                key: index,
                className: 'hrag-tick-tick',
                style: {
                  top: String((index - base) * TICK_GAP - frac * TICK_GAP + (TICK_GAP - TICK_HIT) / 2) + 'px',
                  height: TICK_HIT + 'px',
                },
                'aria-label': tickLabel + ' #' + String(index + 1),
                onClick: () => onJump(index),
              },
              h('span', {
                className: index === clampedActive ? 'hrag-tick-bar hrag-tick-bar-active' : 'hrag-tick-bar',
              }),
            ),
          ),
        ),
      )
    }

    /** Chunk drawer (the workbench's right-side Sheet): whole-document list
     * with the same load mechanics — first page, auto full load under the cap,
     * jump-to-chunk by expanding the limit + flash highlight — plus per-chunk
     * delete behind the delete-preview dialog (spec §6 keeps direct windowing
     * out for now). Opens over the panel from doc rows / recall hits. */
    // ── 切片面渲染段（②档乙对 Task 2）：行渲染器＋图片通道 ─────────────────
    /** 宿主 MarkdownText 的 chrome 字典（照宿主 markdownLabels 六键；t 换 locale 即新对象）。 */
    function markdownLabelsFor(t) {
      return {
        code: {
          copyLabel: t('markdown.copy'),
          copiedLabel: t('markdown.copied'),
          toolbarLabels: {
            codeLabel: t('markdown.codeTitle'),
            wrapLabel: t('markdown.wrap'),
            unwrapLabel: t('markdown.unwrap'),
          },
        },
        footnotes: t('markdown.footnotes'),
      }
    }

    /** 文本内相对图片引用扫描（渲染态图片通道预取表）：inline `![alt](dest)`（含
        `<...>` 角括号形）与引用定义 `[label]: dest` 两类 dest；相对＝无 scheme、非
        `/` 起始（照工作台 ChunkImage 判据）。 */
    function relativeImageRefs(text) {
      const refs = new Set()
      const push = (dest) => {
        if (typeof dest !== 'string') return
        const trimmed = dest.trim()
        if (!trimmed || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(trimmed)) return
        refs.add(trimmed)
      }
      const src = String(text || '')
      const inline = /!\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)/g
      let match
      while ((match = inline.exec(src)) !== null) {
        const dest = match[1]
        push(dest.startsWith('<') ? dest.slice(1, -1) : dest)
      }
      const definition = /^ {0,3}\[[^\]]+\]:[ \t]*(<[^>]*>|\S+)/gm
      while ((match = definition.exec(src)) !== null) {
        const dest = match[1]
        push(dest.startsWith('<') ? dest.slice(1, -1) : dest)
      }
      return Array.from(refs)
    }

    /** 文档资产相对 URL（照工作台 documentFileUrl）：走 host 半 documentFile 中继回门，
        页 origin 直载；ref 整体作 query 值编码（host 半按段编码回斜杠）。 */
    function documentFileRelayUrl(kbId, docId, ref) {
      return (
        PROXY_ROUTE +
        '/documentFile?kb_id=' + encodeURIComponent(kbId) +
        '&doc_id=' + encodeURIComponent(docId) +
        '&ref=' + encodeURIComponent(ref)
      )
    }

    /** 关键帧相对 URL（②档乙对 Task 3）：直载（原生 img 经壳全量转发），非预取通道。 */
    function shotFrameRelayUrl(kbId, docId, shotIndex) {
      return (
        PROXY_ROUTE +
        '/shotFrame?kb_id=' + encodeURIComponent(kbId) +
        '&doc_id=' + encodeURIComponent(docId) +
        '&shot_index=' + String(shotIndex)
      )
    }

    /** 视频流相对 URL（②档乙对 Task 3）：原生 <video> 直载，Range 由壳透传（206 实测）。 */
    function videoStreamRelayUrl(kbId, docId) {
      return (
        PROXY_ROUTE +
        '/videoStream?kb_id=' + encodeURIComponent(kbId) +
        '&doc_id=' + encodeURIComponent(docId)
      )
    }

    /** 镜头时间码 HH:MM:SS（照工作台 formatShotTimecode，与后端镜头卡 format_timecode 同口径：去毫秒）。 */
    function formatShotTimecode(ms) {
      const totalSeconds = Math.floor(ms / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const pad = (value) => String(value).padStart(2, '0')
      return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds)
    }

    /** 镜头时间码区间 HH:MM:SS–HH:MM:SS（en dash，照工作台 formatTimecodeRange）。 */
    function formatTimecodeRange(startMs, endMs) {
      return formatShotTimecode(startMs) + '–' + formatShotTimecode(endMs)
    }

    /** 渲染/原始两态钮（②档乙对 Task 2，照工作台 chunk-card 头行）：宿主
        SegmentedControl（icon 段）直用；缺件回退自绘 outline 双钮。 */
    function ChunkViewToggle({ t, chunkId, value, onChange }) {
      const options = [
        { value: 'rendered', label: dshEyeIcon(), title: t('chunk.viewRendered') },
        { value: 'raw', label: dshCodeIcon(), title: t('chunk.viewRaw') },
      ]
      if (HostSegmentedControl) {
        return h(
          'span',
          { className: 'hrag-chunkrow-view' },
          h(HostSegmentedControl, {
            id: 'hrag-chunkview-' + String(chunkId).replace(/[^a-zA-Z0-9_-]/g, '-'),
            value,
            options,
            onChange,
          }),
        )
      }
      return h(
        'span',
        { className: 'hrag-chunkrow-view' },
        h(
          'span',
          { className: 'hrag-viewseg', role: 'group' },
          options.map((option) =>
            h(
              'button',
              {
                key: option.value,
                type: 'button',
                className: 'hrag-viewseg-btn',
                'aria-pressed': value === option.value,
                'aria-label': option.title,
                title: option.title,
                onClick: () => {
                  if (value !== option.value) onChange(option.value)
                },
              },
              option.label,
            ),
          ),
        ),
      )
    }

    /** 视频镜头条（②档乙对 Task 3，照工作台 VideoShotBar）：缩略图＋`#K · 时间码`芯片
        整体为 seek 触发器（点击 → 播放器跳到 start_ms 并播放）；缺帧降级虚线缺框；
        复制钮走宿主 writeClipboard（缺件回退 navigator.clipboard），toast 照工作台文案。 */
    function VideoShotBar({ t, kbId, docId, chunk, onSeek }) {
      const [frameFailed, setFrameFailed] = React.useState(false)
      const shotIndex = chunk.shot_index == null ? 0 : chunk.shot_index
      const startMs = chunk.start_ms == null ? 0 : chunk.start_ms
      const endMs = chunk.end_ms == null ? 0 : chunk.end_ms
      const timecode = formatTimecodeRange(startMs, endMs)
      const hasFrame = Boolean(chunk.frame_url) && !frameFailed
      const handleCopy = async () => {
        try {
          let ok = false
          if (HostWriteClipboard) {
            ok = await HostWriteClipboard(timecode)
          } else {
            const clipboard = navigator.clipboard
            if (clipboard && typeof clipboard.writeText === 'function') {
              ok = await clipboard.writeText(timecode).then(() => true, () => false)
            }
          }
          if (ok) showToast(t('chunk.copiedTimecode'))
          else showToast(t('chunk.copyTimecodeFailed'), { error: true })
        } catch (cause) {
          showToast(t('chunk.copyTimecodeFailed'), { error: true })
        }
      }
      return h(
        'div',
        { className: 'hrag-shotbar' },
        h(
          'button',
          {
            type: 'button',
            className: 'hrag-shotbar-seek',
            'aria-label': t('chunk.playShot'),
            title: t('chunk.playShot'),
            onClick: () => onSeek(startMs),
          },
          hasFrame
            ? h('img', {
                className: 'hrag-shotbar-thumb',
                src: shotFrameRelayUrl(kbId, docId, shotIndex),
                alt: '',
                loading: 'lazy',
                decoding: 'async',
                onError: () => setFrameFailed(true),
              })
            : h('span', { className: 'hrag-shotbar-missing', title: t('chunk.frameMissing') }, dshImageOffIcon()),
          h(
            'span',
            { className: 'hrag-shotbar-chip', title: t('chunk.timecode') },
            '#' + String(shotIndex + 1) + ' · ' + timecode,
          ),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'hrag-iconbare hrag-shotbar-copy',
            'aria-label': t('chunk.copyTimecode'),
            title: t('chunk.copyTimecode'),
            onClick: () => {
              void handleCopy()
            },
          },
          dshCopyIcon(),
        ),
      )
    }

    /** 编辑域高度：宿主 Textarea 基类带 `field-sizing-content`（CSS 已照抄）；
        老内核不认时退回按 scrollHeight 撑开，避免内容锁在 100px 里滚动。 */
    function growTextarea(el) {
      if (!el) return
      const supported =
        typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('field-sizing', 'content')
      if (supported) return
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }

    /** 切片行（②档乙对 Task 2 起自治件，照工作台 chunk-card）：自持视图态与图片
        blob 映射；抽屉只传数据与回调（行内联渲染退役）。 */
    function ChunkRow({
      t,
      kbId,
      docId,
      chunk,
      flash,
      shotActive,
      busy,
      expanded,
      reExtracting,
      reExtractDisabled,
      onExpand,
      onDelete,
      onEdit,
      onReExtract,
      onSeekShot,
      rowRef,
    }) {
      const [viewMode, setViewMode] = React.useState('rendered')
      const [imageTick, setImageTick] = React.useState(0)
      const imageUrlsRef = React.useRef(new Map())
      // 就地编辑（Task 4，照工作台 chunk-card）：卡自治编辑态＋原始文本暂存；
      // 保存中转圈禁入，失败停留编辑态（抽屉层已 toast）。
      const [isEditing, setIsEditing] = React.useState(false)
      const [editedText, setEditedText] = React.useState(chunk.text)
      const [isSaving, setIsSaving] = React.useState(false)

      // 图片通道（D1 甲）：渲染态扫描相对引用 → documentFile 预取 → blob URL 映射 →
      // pathImages.resolve 同步查表；切原始/卸载/文本变更即 revoke（blob 生命周期
      // 随行；失败无映射 → 宿主落 alt）。缺件（无 MarkdownText）不预取。
      React.useEffect(() => {
        if (!HostMarkdownText || viewMode !== 'rendered') return undefined
        const refs = relativeImageRefs(chunk.text)
        if (refs.length === 0) return undefined
        let cancelled = false
        const created = []
        const prefetch = async () => {
          for (const ref of refs) {
            if (imageUrlsRef.current.has(ref)) continue
            try {
              const response = await fetch(documentFileRelayUrl(kbId, docId, ref))
              if (!response.ok) continue
              const blob = await response.blob()
              if (cancelled) return
              const url = URL.createObjectURL(blob)
              created.push(url)
              imageUrlsRef.current.set(ref, url)
              setImageTick((value) => value + 1)
            } catch (cause) {
              /* 缺图/网络失败 → 无映射 → alt 面（spec §6 登记） */
            }
          }
        }
        prefetch()
        return () => {
          cancelled = true
          for (const url of created) URL.revokeObjectURL(url)
          for (const ref of refs) imageUrlsRef.current.delete(ref)
        }
      }, [kbId, docId, chunk.text, viewMode])

      // pathImages 身份随 blob 到达换新（MarkdownText 为 memo：同身份不重渲，
      // 新映射渲不进旧元素）；resolve 同步查表、未到达即 undefined。
      const pathImages = React.useMemo(
        () => ({ resolve: (dest) => imageUrlsRef.current.get(String(dest || '').trim()) }),
        [imageTick],
      )
      const labels = React.useMemo(() => markdownLabelsFor(t), [t])

      const handleSave = async () => {
        if (!onEdit) return
        setIsSaving(true)
        try {
          await onEdit(chunk.chunk_id, editedText)
          setIsEditing(false)
        } catch (cause) {
          /* 停留编辑态：失败不落新文（照工作台），文案由抽屉层 toast */
        } finally {
          setIsSaving(false)
        }
      }

      const handleCancel = () => {
        setEditedText(chunk.text)
        setIsEditing(false)
      }

      const timecode = chunkTimecode(chunk)
      const entities = Array.isArray(chunk.entities) ? chunk.entities : []
      const badges = entityBadges(entities, expanded)
      const isVideo = chunk.media === 'video'
      // 抽取出力面（Task 4，照工作台）：本行在飞或后端 pending → 转圈＋「抽取中…」＋
      // 提示行；重抽钮每文档互斥（在飞禁余卡——按工作台 prop 文档意图实现，其字面
      // `??` 令 reExtractDisabled 失效，此处取 OR）。
      const extracting = Boolean(reExtracting) || chunk.extract_status === 'pending'
      return h(
        'div',
        {
          className:
            'hrag-chunkrow' +
            (flash ? ' hrag-chunkrow-flash' : '') +
            (shotActive ? ' hrag-chunkrow-shot-active' : ''),
          ref: rowRef,
        },
        // 镜头条（Task 3）：视频行顶置（照工作台镜头条在卡上方）；播放头命中行由抽屉
        // 经 shotActive 传回（琥珀环，只改边框不抢滚动）。
        isVideo ? h(VideoShotBar, { t, kbId, docId, chunk, onSeek: onSeekShot }) : null,
        h(
          'div',
          { className: 'hrag-chunkrow-top' },
          h('span', { className: 'hrag-chunkrow-idx' }, '#' + String(Number(chunk.chunk_index) + 1)),
          h(
            'span',
            { className: 'hrag-chunkrow-path' },
            Array.isArray(chunk.heading_path) && chunk.heading_path.length > 0 ? chunk.heading_path.join(' / ') : '',
          ),
          timecode ? h('span', { className: 'hrag-textchip', title: t('chunk.timecode') }, timecode) : null,
          chunk.page != null
            ? h('span', { className: 'hrag-textchip' }, t('chunk.page') + ' ' + String(chunk.page))
            : null,
          // 两态钮编辑态隐藏（照工作台 chunk-card：`{!isEditing && <ToggleGroup .../>}`）。
          isEditing ? null : h(ChunkViewToggle, { t, chunkId: chunk.chunk_id, value: viewMode, onChange: setViewMode }),
        ),
        isEditing
          ? h(
              'div',
              { className: 'hrag-chunkrow-edit' },
              h('textarea', {
                className: 'hrag-chunkrow-editarea',
                ref: growTextarea,
                value: editedText,
                onChange: (event) => {
                  growTextarea(event.currentTarget)
                  setEditedText(event.target.value)
                },
              }),
              h('p', { className: 'hrag-chunkrow-edithint' }, t('chunk.editHint')),
              h(
                'div',
                { className: 'hrag-chunkrow-editbtns' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-btn-sm hrag-btn-primary',
                    disabled: isSaving || !String(editedText).trim(),
                    onClick: handleSave,
                  },
                  t('chunk.save'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-btn-sm hrag-btn-outline',
                    disabled: isSaving,
                    onClick: handleCancel,
                  },
                  t('chunk.cancel'),
                ),
              ),
            )
          : viewMode === 'rendered' && HostMarkdownText
            ? h(
                'div',
                { className: 'hrag-chunkrow-render' },
                h(HostMarkdownText, { text: String(chunk.text || ''), labels, pathImages, variant: 'body' }),
              )
            : h('div', { className: 'hrag-chunkrow-text' }, String(chunk.text || '')),
        !isEditing && entities.length > 0
          ? h(
              'span',
              { className: 'hrag-chunkrow-entities' },
              h('span', { className: 'hrag-chunkrow-entities-label' }, t('chunk.entities') + ':'),
              badges.visible.map((entity) =>
                h('span', { className: 'hrag-textchip hrag-headbadge-soft', key: entity }, String(entity)),
              ),
              badges.hidden > 0
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'hrag-entitymore',
                      title: entities.slice(ENTITY_CAP).join(', '),
                      onClick: () => onExpand(chunk.chunk_id),
                    },
                    h('span', { className: 'hrag-textchip' }, '+' + String(badges.hidden)),
                  )
                : null,
            )
          : null,
        // 页脚（照工作台 chunk-card :245-300）：度量左（tokens/已编辑；页码在顶行 chip 位
        // 照旧）、动作右（编辑/重新抽取/删除——Task 4 起动作族入页脚，删除钮随迁）；
        // 抽取在飞/后端 pending 时下方挂提示行。编辑态整页脚隐藏（照工作台）。
        !isEditing
          ? h(
              'div',
              { className: 'hrag-chunkrow-foot' },
              h(
                'div',
                { className: 'hrag-chunkrow-footrow' },
                h(
                  'span',
                  { className: 'hrag-chunkrow-meta' },
                  chunk.token_count != null
                    ? h('span', null, String(chunk.token_count) + ' ' + t('chunk.tokens'))
                    : null,
                  chunk.last_edited_at ? h('span', { className: 'hrag-textchip' }, t('chunk.edited')) : null,
                ),
                h(
                  'span',
                  { className: 'hrag-chunkrow-actions' },
                  onEdit
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'hrag-btn hrag-btn-sm',
                          disabled: busy || Boolean(reExtracting),
                          onClick: () => setIsEditing(true),
                        },
                        dshEditIcon(),
                        t('chunk.edit'),
                      )
                    : null,
                  onReExtract
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'hrag-btn hrag-btn-sm',
                          title: t('chunk.reExtractCost'),
                          disabled: busy || Boolean(reExtracting) || Boolean(reExtractDisabled),
                          onClick: () => onReExtract(chunk.chunk_id),
                        },
                        extracting ? stateDot(12) : dshRefreshIcon(),
                        extracting ? t('chunk.reExtracting') : t('chunk.reExtract'),
                      )
                    : null,
                  onDelete
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'hrag-btn hrag-btn-sm',
                          disabled: busy || Boolean(reExtracting),
                          onClick: () => onDelete(chunk),
                        },
                        dshTrashIcon(),
                        t('chunk.delete'),
                      )
                    : null,
                ),
              ),
              extracting
                ? h(
                    'p',
                    { className: 'hrag-chunkrow-extracting' },
                    stateDot(12),
                    t('chunk.reExtractHint'),
                  )
                : null,
            )
          : null,
      )
    }

    function ChunkDrawer({ t, kbId, doc, refreshToken, focusChunkId, onClose }) {
      const [phase, setPhase] = React.useState('loading')
      const [items, setItems] = React.useState([])
      const [total, setTotal] = React.useState(0)
      const [limit, setLimit] = React.useState(CHUNK_PAGE_SIZE)
      const [failure, setFailure] = React.useState(null)
      const [flashId, setFlashId] = React.useState(null)
      const [activeIndex, setActiveIndex] = React.useState(0)
      const [previewOpen, setPreviewOpen] = React.useState(false)
      const [preview, setPreview] = React.useState(null)
      const [previewTarget, setPreviewTarget] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [dialogError, setDialogError] = React.useState(null)
      // 实体徽章 +N 展开集（小件批 Task 6）：按 chunk_id 记展开态（工作台为每卡
      // 自治 state；插件行内联渲染，故由抽屉统一持有）。
      const [expandedEntities, setExpandedEntities] = React.useState(() => new Set())
      // 重抽在飞（Task 4，照工作台 chunk-drawer）：每文档互斥——在飞禁余卡；也是
      // 条件轮询的第二源（服务端置 pending 亦覆盖，双保险）。
      const [reExtractingChunkId, setReExtractingChunkId] = React.useState(null)
      const rowRefs = React.useRef({})
      const hasDataRef = React.useRef(false)
      // Focus hand-off guard (workbench focusedIdRef parity): marks the focus
      // id as handled so the flash timeout cannot re-trigger the jump.
      const focusedIdRef = React.useRef(null)
      const pendingJumpRef = React.useRef(null)
      const bodyRef = React.useRef(null)
      // 内嵌播放器（②档乙对 Task 3，照工作台 chunk-drawer）：抽屉单例 <video>，
      // 仅视频文档渲染；播放头命中行高亮 + 引用定位暂停 seek。
      const videoRef = React.useRef(null)
      const pendingPausedSeekRef = React.useRef(null)
      const [activeShotIndex, setActiveShotIndex] = React.useState(null)

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
            // 后台刷新（轮询/refreshToken 重载）失败保留旧数据——react-query
            // refetch 语义；无数据时才落到错误整页（初始加载失败面不变）。
            if (hasDataRef.current) return
            setFailure(error)
            setPhase('error')
          })
      }, [kbId, docId, limit])

      React.useEffect(() => {
        load()
      }, [load, refreshToken])

      // 抽取进行中条件轮询（照工作台 refetchInterval）：pending 存在或重抽在飞即武装
      // 3s 轮询，全落定自动停（谓词变化才换 interval，节拍不被每次回包重置）。
      const pendingExtract = hasPendingExtraction(items) || reExtractingChunkId !== null
      React.useEffect(() => {
        if (phase !== 'ready' || !pendingExtract) return undefined
        const timer = window.setInterval(load, CHUNK_POLL_MS)
        return () => window.clearInterval(timer)
      }, [phase, pendingExtract, load])

      // Doc switch resets the pane (first page again).
      React.useEffect(() => {
        hasDataRef.current = false
        setItems([])
        setTotal(0)
        setLimit(CHUNK_PAGE_SIZE)
        setActiveIndex(0)
        setExpandedEntities(new Set())
        setReExtractingChunkId(null)
        pendingJumpRef.current = null
        pendingPausedSeekRef.current = null
        setActiveShotIndex(null)
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

      /** 闪环 + 居中（focus 通路与刻度轨跳转共用的同一原语；守卫/时序留在各自调用点）。 */
      const flashAndCenter = (chunkId) => {
        setFlashId(chunkId)
        const node = rowRefs.current[chunkId]
        if (node && typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ block: 'center', behavior: 'smooth' })
        }
        window.setTimeout(() => setFlashId((value) => (value === chunkId ? null : value)), 1200)
      }

      // Focus hand-off (recall row -> this pane): expand the limit until the
      // target chunk is loaded, then flash-highlight it. The guard must be the
      // persistent ref, not flash state — the flash timeout's own setState
      // re-runs this effect, and a state guard re-arms it every 1.2s, yanking
      // the reader back to the chunk (2026-10-15 实报).
      React.useEffect(() => {
        if (!focusChunkId || phase !== 'ready') return
        if (focusedIdRef.current === focusChunkId) return
        const position = items.findIndex((chunk) => chunk.chunk_id === focusChunkId)
        if (position >= 0) {
          focusedIdRef.current = focusChunkId
          // 头部「当前 #K」同步置位：smooth 滚动落定前先显示正确位次（照工作台）。
          setActiveIndex(position)
          // 引用闪环定位：视频镜头把播放器载到 start_ms 但保持暂停（不惊喜自动播，照工作台）；
          // 播放器可能尚未挂载 → 暂存，attachVideo 补 seek。
          const target = items[position]
          if (target && target.media === 'video') {
            const seekTo = (target.start_ms == null ? 0 : target.start_ms) / 1000
            if (videoRef.current) videoRef.current.currentTime = seekTo
            else pendingPausedSeekRef.current = seekTo
          }
          flashAndCenter(focusChunkId)
        } else if (items.length < total && limit < total) {
          setLimit((value) => Math.min(total, value + CHUNK_PAGE_SIZE))
        }
      }, [focusChunkId, phase, items, total, limit])

      // ── 视频播放器（Task 3，照工作台 chunk-drawer）：单例 video 挂载回调（补暂存
      // 暂停 seek）＋镜头条 seek 播放（点缩略图/芯片 → 跳到起点并播放）＋timeupdate
      // 命中镜头行高亮（浏览器 ~4Hz 节流；仅变化时 setState，只改边框不抢滚动）。──
      const attachVideo = React.useCallback((node) => {
        videoRef.current = node
        if (node && pendingPausedSeekRef.current != null) {
          node.currentTime = pendingPausedSeekRef.current
          pendingPausedSeekRef.current = null
        }
      }, [])

      const seekShot = (startMs) => {
        const video = videoRef.current
        if (!video) return
        video.currentTime = startMs / 1000
        if (typeof video.play === 'function') {
          const played = video.play()
          if (played && typeof played.catch === 'function') played.catch(() => {})
        }
      }

      const handleTimeUpdate = () => {
        const video = videoRef.current
        if (!video) return
        const ms = video.currentTime * 1000
        const active = items.find(
          (chunk) =>
            chunk.media === 'video' &&
            chunk.start_ms != null &&
            chunk.end_ms != null &&
            ms >= chunk.start_ms &&
            ms < chunk.end_ms,
        )
        const next = active && active.shot_index != null ? active.shot_index : null
        setActiveShotIndex((prev) => (prev === next ? prev : next))
      }

      // ── 切片导航（A⑫ 照工作台 2026-09-05 切片导航）：位置序跳片 + 滚动打卡 ──
      // active = 顶部越过视口上 35% 带的最后一张卡；rAF 节流 scroll 监听挂抽屉主体。
      React.useEffect(() => {
        if (phase !== 'ready') return
        const viewport = bodyRef.current
        if (!viewport) return
        let frame = 0
        const measure = () => {
          frame = 0
          const line = viewport.getBoundingClientRect().top + viewport.clientHeight * 0.35
          let current = 0
          for (let position = 0; position < items.length; position += 1) {
            const node = rowRefs.current[items[position].chunk_id]
            if (!node || node.getBoundingClientRect().top > line) break
            current = position
          }
          setActiveIndex(current)
        }
        const onScroll = () => {
          if (!frame) frame = requestAnimationFrame(measure)
        }
        measure()
        viewport.addEventListener('scroll', onScroll, { passive: true })
        return () => {
          if (frame) cancelAnimationFrame(frame)
          viewport.removeEventListener('scroll', onScroll)
        }
      }, [phase, items])

      const scrollToPosition = (position) => {
        const chunk = items[position]
        if (!chunk) return
        flashAndCenter(chunk.chunk_id)
      }

      const jumpTo = (index) => {
        if (index < 0 || index >= total) return
        if (index >= items.length) {
          // 目标尚未加载：先扩 limit，数据到位后由下方 pending effect 续跳。
          pendingJumpRef.current = index
          setLimit((value) => Math.max(value, Math.ceil((index + 1) / CHUNK_PAGE_SIZE) * CHUNK_PAGE_SIZE))
          return
        }
        scrollToPosition(index)
      }

      React.useEffect(() => {
        const pending = pendingJumpRef.current
        if (pending === null || pending >= items.length) return
        pendingJumpRef.current = null
        requestAnimationFrame(() => scrollToPosition(pending))
      }, [items])

      const startDelete = (chunk) => {
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
            showToast(t('chunk.deleteSuccess'))
            load()
          })
          .catch((error) => {
            setBusy(false)
            setDialogError(errorDetail(error))
          })
      }

      // 就地编辑保存（Task 4，照工作台 handleEditChunk）：成功 toast＋reload（行元数据
      // 刷出「已编辑」徽章/新 tokens）；失败 toast 后原样抛出——行件停留编辑态。
      const handleEditChunk = async (chunkId, newText) => {
        try {
          await callOp('updateChunk', { kb_id: kbId, chunk_id: chunkId, body: { text: newText } })
          showToast(t('chunk.updateSuccess'))
          load()
        } catch (error) {
          showToast(errorDetail(error) || t('chunk.updateFailed'), { error: true })
          throw error
        }
      }

      // 重抽（Task 4，照工作台 handleReExtractChunk）：在飞禁余卡（每文档互斥）；
      // 成功 toast＋reload；409（文档非终态）走警告 toast（宿主 Toast 无 warn 档 ⇒
      // 中性色），其余错误红字。
      const handleReExtractChunk = async (chunkId) => {
        setReExtractingChunkId(chunkId)
        try {
          await callOp('reExtractChunk', { kb_id: kbId, chunk_id: chunkId })
          showToast(t('chunk.reExtractSuccess'))
          load()
        } catch (error) {
          const message = errorDetail(error) || t('chunk.reExtractFailed')
          if (String(message).includes('being processed')) showToast(t('chunk.reExtractProcessing'))
          else showToast(message, { error: true })
        } finally {
          setReExtractingChunkId(null)
        }
      }

      if (!doc) return null

      // 视频文档判据（Task 3）：任一切片带 media==='video'（后端 chunks 端点注入）。
      const hasVideo = items.some((chunk) => chunk && chunk.media === 'video')

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
            items.map((chunk) =>
              h(ChunkRow, {
                key: chunk.chunk_id,
                t,
                kbId,
                docId,
                chunk,
                flash: flashId === chunk.chunk_id,
                shotActive:
                  activeShotIndex != null && chunk.media === 'video' && chunk.shot_index === activeShotIndex,
                busy,
                expanded: expandedEntities.has(chunk.chunk_id),
                reExtracting: reExtractingChunkId === chunk.chunk_id,
                reExtractDisabled: reExtractingChunkId !== null && reExtractingChunkId !== chunk.chunk_id,
                onExpand: (chunkId) =>
                  setExpandedEntities((prev) => {
                    const next = new Set(prev)
                    next.add(chunkId)
                    return next
                  }),
                onDelete: startDelete,
                onEdit: handleEditChunk,
                onReExtract: handleReExtractChunk,
                onSeekShot: seekShot,
                rowRef: (node) => {
                  rowRefs.current[chunk.chunk_id] = node
                },
              }),
            ),
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
            // 头部徽章族＋↑↓（小件批 Task 5，照工作台 chunk-drawer 头行）：类型徽章／
            // 切片数／「当前 #K」（total>0）＋逐片跳转钮（边界禁；跳片走 jumpTo 通路，
            // 未加载目标先扩 limit 由 pending effect 续跳）。
            h(FileTypeBadge, { fileName: String(doc.name), className: 'hrag-drawer-ftype' }),
            h('span', { className: 'hrag-drawer-title', title: String(doc.name) }, String(doc.name)),
            h('span', { className: 'hrag-textchip hrag-headbadge-soft' }, t('chunk.drawerTitle')),
            h(
              'span',
              { className: 'hrag-textchip', style: { fontVariantNumeric: 'tabular-nums' } },
              String(total) + ' ' + t('chunk.unit'),
            ),
            total > 0
              ? h(
                  'span',
                  { className: 'hrag-textchip', style: { fontVariantNumeric: 'tabular-nums' } },
                  t('chunk.current') + ' #' + String(activeIndex + 1),
                )
              : null,
            h(
              'div',
              { className: 'hrag-drawer-nav' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'hrag-btn hrag-drawer-navbtn',
                  'aria-label': t('chunk.prevChunk'),
                  title: t('chunk.prevChunk'),
                  disabled: activeIndex <= 0,
                  onClick: () => jumpTo(activeIndex - 1),
                },
                dshChevronUpIcon(),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'hrag-btn hrag-drawer-navbtn',
                  'aria-label': t('chunk.nextChunk'),
                  title: t('chunk.nextChunk'),
                  disabled: activeIndex >= total - 1,
                  onClick: () => jumpTo(activeIndex + 1),
                },
                dshChevronDownIcon(),
              ),
            ),
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
            { className: 'hrag-drawer-panel' },
            // 内嵌播放器（Task 3）：抽屉头下固定区（同工作台「头内视频块」语义——
            // 浏览镜头卡时始终可见）；原生 controls/preload=metadata、不自动播。
            hasVideo
              ? h(
                  'div',
                  { className: 'hrag-drawer-video' },
                  h('video', {
                    className: 'hrag-drawer-video-el',
                    controls: true,
                    preload: 'metadata',
                    ref: attachVideo,
                    src: videoStreamRelayUrl(kbId, docId),
                    onTimeUpdate: handleTimeUpdate,
                  }),
                  h('p', { className: 'hrag-drawer-video-hint' }, t('chunk.playerHint')),
                )
              : null,
            h('div', { className: 'hrag-drawer-body', ref: bodyRef }, body),
            phase === 'ready'
              ? h(ChunkTickRail, {
                  total: total,
                  active: activeIndex,
                  entries: items.map((chunk) => ({ index: chunk.chunk_index, preview: firstLine(chunk.text) })),
                  onJump: jumpTo,
                  tickLabel: t('chunk.tickAria'),
                  unloadedLabel: t('chunk.notLoaded'),
                })
              : null,
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

    /** 耗时排名三档色（照工作台 ELAPSED_RANK_CLASSES 逐字取色：emerald/lime/orange；
        样式见 .hrag-elapsed-*，暗色主题走宿主 body[data-ds-dark-theme] 钩子）。 */
    const ELAPSED_RANK_CLASSES = ['hrag-elapsed-fast', 'hrag-elapsed-mid', 'hrag-elapsed-slow']

    /** 耗时档色（照工作台）：跨路去重排序下标——同值共享较快档色（平局不误导）；
        缺席/非数走中性档。 */
    function elapsedRankClass(elapsedMs, path) {
      if (!elapsedMs) return 'hrag-elapsed-plain'
      const values = RECALL_PATHS.map((item) => elapsedMs[item]).filter((value) => typeof value === 'number')
      const sorted = [...new Set(values)].sort((a, b) => a - b)
      const rank = sorted.indexOf(elapsedMs[path])
      return rank >= 0 && rank < ELAPSED_RANK_CLASSES.length ? ELAPSED_RANK_CLASSES[rank] : 'hrag-elapsed-plain'
    }

    /** Score display mirrors the workbench: null (degraded reranker) renders
     * an em dash; the label string itself is computed server-side per request. */
    function formatScore(score) {
      return score == null ? '—' : Number(score).toFixed(3)
    }

    /** 抽取出力判定（照工作台 chunk-drawer refetchInterval 谓词）：任一切片
        仍在抽取即为真——插件无重抽在飞源（②档裁减项）。 */
    function hasPendingExtraction(items) {
      return (Array.isArray(items) ? items : []).some((chunk) => chunk && chunk.extract_status === 'pending')
    }

    /** 实体徽章截断（照工作台 chunk-card）：展开态全量、+N 消失；未展开截
        CAP 前段并报余名数（title/计数用）。 */
    function entityBadges(entities, expanded) {
      const list = Array.isArray(entities) ? entities : []
      return {
        visible: expanded ? list : list.slice(0, ENTITY_CAP),
        hidden: !expanded && list.length > ENTITY_CAP ? list.length - ENTITY_CAP : 0,
      }
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

    // 召回迷你图参数（照工作台 recall-graph-mini 的 force 配置）：斥力 140、理想边
    // 80（edgeLength [60,100] 中值＝大图常量）、重力 0.1；节点 symbolSize 16 → 半径 8。
    const MINI_REPULSION = 140
    const MINI_NODE_RADIUS = 8

    /** 召回迷你图（小件批 Task 7·D1 甲，照工作台 recall-graph-mini）：当次召回的
        实体/关系渲染为力导向子图——typeColor 按 type 稳定取色、全画布 roam（滚轮
        缩放锚光标＋拖拽平移）、节点可拖（拖动中钉住＋近邻沉降）、节点悬停 tooltip
        （名＋描述）、边标签＝关系名与节点名随缩放档隐藏；无 LOD/叠加/搜索（迷你
        语义）。力场内核与大图共用（graphForceStep，参数迷你化）。 */
    function RecallGraphMini({ entities, relations }) {
      const wrapRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const simRef = React.useRef(null)
      const rafRef = React.useRef(null)
      const viewRef = React.useRef({ zoom: 1, ox: 0, oy: 0 })
      const dragRef = React.useRef(null)
      const hoverRef = React.useRef(null)
      const projectedRef = React.useRef([])
      const [tip, setTip] = React.useState(null)
      const [grabbing, setGrabbing] = React.useState(false)

      const nodeById = React.useMemo(() => {
        const map = new Map()
        for (const entity of entities || []) map.set(entity.name, entity)
        return map
      }, [entities])

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
        const sim = simRef.current
        if (!sim) return
        const view = viewRef.current
        const inkColor = getComputedStyle(wrap).color || '#3c3c3c'
        const cx = w / 2 + view.ox
        const cy = h / 2 + view.oy
        const toScreen = (x, y) => ({ sx: cx + x * view.zoom, sy: cy + y * view.zoom })
        const showEdgeLabels = view.zoom >= GRAPH_LABEL_HIDE_BELOW
        // 边层：色＝源节点色（echarts lineStyle color:'source'）、弧 0.12 防并行边
        // 重叠、箭头贴目标端点边界（同大图裁帽；线体终点收在箭头底边）。
        for (const link of sim.links) {
          const a = sim.byId.get(link.source)
          const b = sim.byId.get(link.target)
          if (!a || !b) continue
          const pa = toScreen(a.x, a.y)
          const pb = toScreen(b.x, b.y)
          const dx = pb.sx - pa.sx
          const dy = pb.sy - pa.sy
          const len = Math.hypot(dx, dy) || 1
          const trim = MINI_NODE_RADIUS + 2
          if (len <= trim * 2 + 4) continue
          const ux = dx / len
          const uy = dy / len
          const ax = pa.sx + ux * trim
          const ay = pa.sy + uy * trim
          const bx = pb.sx - ux * trim
          const by = pb.sy - uy * trim
          const mx = (pa.sx + pb.sx) / 2 + (-dy / len) * len * 0.12
          const my = (pa.sy + pb.sy) / 2 + (dx / len) * len * 0.12
          const angle = Math.atan2(by - my, bx - mx)
          const baseX = bx - 6 * Math.cos(angle)
          const baseY = by - 6 * Math.sin(angle)
          const sourceColor = graphTypeColor((nodeById.get(link.source) || {}).type)
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.quadraticCurveTo(mx, my, baseX, baseY)
          ctx.strokeStyle = sourceColor
          ctx.lineWidth = 1
          ctx.globalAlpha = 0.7
          ctx.stroke()
          // 箭头（照工作台 edgeSymbol arrow size 6）。
          ctx.beginPath()
          ctx.moveTo(baseX + 3.2 * Math.sin(angle), baseY - 3.2 * Math.cos(angle))
          ctx.lineTo(bx, by)
          ctx.lineTo(baseX - 3.2 * Math.sin(angle), baseY + 3.2 * Math.cos(angle))
          ctx.closePath()
          ctx.fillStyle = sourceColor
          ctx.fill()
          ctx.globalAlpha = 1
          // 边标签＝关系名（9px ink 0.6；缩放档下与节点名同隐——只判 hidden 档，
          // 迷你语义不设 important 档）。
          if (showEdgeLabels && link.label) {
            ctx.font = '9px sans-serif'
            ctx.fillStyle = inkColor
            ctx.globalAlpha = 0.6
            ctx.fillText(link.label, mx, my - 3)
            ctx.globalAlpha = 1
          }
        }
        // 节点层：半径 8（symbolSize 16）、typeColor 填充；悬停＝蓝描边＋标签常显。
        const hover = hoverRef.current
        const projected = []
        for (const item of sim.items) {
          const entity = nodeById.get(item.id)
          if (!entity) continue
          const p = toScreen(item.x, item.y)
          ctx.beginPath()
          ctx.arc(p.sx, p.sy, MINI_NODE_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = graphTypeColor(entity.type)
          ctx.fill()
          const hovered = hover != null && hover.id === item.id
          if (hovered) {
            ctx.strokeStyle = GRAPH_HOVER_BORDER
            ctx.lineWidth = 2
            ctx.stroke()
          }
          // 标签：10px 右侧 ink 0.85；zoom < 0.6 隐藏（照 labelTierForZoom），悬停常显。
          if (hovered || view.zoom >= GRAPH_LABEL_HIDE_BELOW) {
            ctx.font = '10px sans-serif'
            ctx.fillStyle = inkColor
            ctx.globalAlpha = 0.85
            ctx.fillText(entity.name, p.sx + MINI_NODE_RADIUS + 3, p.sy + 3.5)
            ctx.globalAlpha = 1
          }
          projected.push({ sx: p.sx, sy: p.sy, r: MINI_NODE_RADIUS + 3, node: entity })
        }
        projectedRef.current = projected
      }, [nodeById])

      /** 力场启动（friction 冷却至阈下停——同大图节奏）。 */
      const startSim = React.useCallback(() => {
        const step = () => {
          const sim = simRef.current
          if (!sim) return
          graphForceStep(sim.items, sim.links, sim.byId, sim.friction, {
            edgeLength: GRAPH_EDGE_LENGTH,
            gravity: GRAPH_GRAVITY,
            repulsion: MINI_REPULSION,
          })
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

      // 数据重建：视口复位（zoom 1 居中——迷你无自动全览，照 echarts 初始态）、
      // 画布内随机撒点、力场从头跑（friction 0.6）。
      React.useEffect(() => {
        const wrap = wrapRef.current
        const initW = (wrap && wrap.clientWidth) || 320
        const initH = (wrap && wrap.clientHeight) || 220
        const names = new Set((entities || []).map((entity) => entity.name))
        const items = []
        const byId = new Map()
        for (const entity of entities || []) {
          const x = initW * (Math.random() - 0.5)
          const y = initH * (Math.random() - 0.5) * 0.7
          const item = { id: entity.name, x, y, ppx: x, ppy: y, fixed: false }
          items.push(item)
          byId.set(entity.name, item)
        }
        const links = (relations || [])
          .filter((relation) => names.has(relation.source) && names.has(relation.target))
          .map((relation) => ({ source: relation.source, target: relation.target, label: relation.relation }))
        simRef.current = { items, byId, links, friction: GRAPH_FRICTION }
        viewRef.current = { zoom: 1, ox: 0, oy: 0 }
        hoverRef.current = null
        setTip(null)
        startSim()
        return () => {
          if (rafRef.current !== null) {
            window.cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
        }
      }, [entities, relations, startSim])

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

      // 滚轮缩放（0.3–3，锚光标；迷你无 LOD 档切换）。
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
          const next = Math.min(GRAPH_MAX_SCALE, Math.max(GRAPH_MIN_SCALE, view.zoom * factor))
          const real = next / view.zoom
          view.ox = mx - rect.width / 2 - (mx - rect.width / 2 - view.ox) * real
          view.oy = my - rect.height / 2 - (my - rect.height / 2 - view.oy) * real
          view.zoom = next
          draw()
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
      }, [draw])

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
          drag.x = event.clientX
          drag.y = event.clientY
          if (drag.kind === 'pan') {
            viewRef.current.ox += dx
            viewRef.current.oy += dy
          } else if (drag.item) {
            drag.item.x += dx / viewRef.current.zoom
            drag.item.y += dy / viewRef.current.zoom
            // 拖动中钉住该点（力场豁免），warmUp 并确保迭代在跑——邻居随拉力沉降。
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
          const prev = hoverRef.current
          hoverRef.current = { id: found.entry.node.name }
          setTip({ x: found.mx + 12, y: found.my + 12, node: found.entry.node })
          if (!prev || prev.id !== found.entry.node.name) draw()
        } else if (tip) {
          hoverRef.current = null
          setTip(null)
          draw()
        }
      }

      const handleDown = (event) => {
        if (event.button !== 0) return // 仅左键起拖拽（照大图/工作台）。
        const found = pick(event)
        dragRef.current = {
          kind: found ? 'node' : 'pan',
          item: found && simRef.current ? simRef.current.byId.get(found.entry.node.name) : null,
          x: event.clientX,
          y: event.clientY,
        }
        setGrabbing(true)
      }

      const releaseDrag = () => {
        const drag = dragRef.current
        dragRef.current = null
        setGrabbing(false)
        if (drag && drag.item) {
          // 解钉并把 pp 同步到当前位（同大图；固定期间积分跳过，pp 滞留会弹跳）。
          drag.item.fixed = false
          drag.item.ppx = drag.item.x
          drag.item.ppy = drag.item.y
        }
      }

      const handleLeave = () => {
        releaseDrag()
        if (tip) setTip(null)
        if (hoverRef.current) {
          hoverRef.current = null
          draw()
        }
      }

      return h(
        'div',
        { className: 'hrag-mini', ref: wrapRef },
        h('canvas', {
          ref: canvasRef,
          style: { cursor: grabbing ? 'grabbing' : tip ? 'pointer' : 'grab' },
          onMouseDown: handleDown,
          onMouseMove: handleMove,
          onMouseUp: releaseDrag,
          onMouseLeave: handleLeave,
        }),
        tip
          ? h(
              'div',
              { className: 'hrag-vec-tip', style: { left: String(tip.x) + 'px', top: String(tip.y) + 'px' } },
              h('span', { className: 'hrag-vec-tip-label' }, vecTruncate(tip.node.name, VEC_TOOLTIP_MAX)),
              tip.node.description
                ? h('span', { className: 'hrag-vec-tip-preview' }, vecTruncate(tip.node.description, 40))
                : null,
            )
          : null,
      )
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

    function RecallView({ t, kbId, onOpenChunk, onViewInVectorSpace, onViewInGraphSpace, prefill, onOpenWikiEntry, onOpenManualCard }) {
      const [query, setQuery] = React.useState('')
      const [topK, setTopK] = React.useState(5)
      const [pending, setPending] = React.useState(false)
      const [result, setResult] = React.useState(null)
      const [failure, setFailure] = React.useState(null)
      // 「存为考题」（Task 8 补面，照工作台 §7.1）：命中行勾选 → 底部动作条。
      const [selectedChunks, setSelectedChunks] = React.useState(() => new Map())
      // 人工卡片勾选（小件批 Task 7·D1①）：卡片无源切片——勾选只记录预期路径
      // （wiki）与计数，不进锚定集（照工作台 selectedCards 语义）。
      const [selectedCards, setSelectedCards] = React.useState([])
      // 路容器收起态（小件批 Task 7，照工作台）：标题栏点击折叠，收起路只留头行。
      const [collapsedPaths, setCollapsedPaths] = React.useState({ vector: false, graph: false, wiki: false })
      // 图谱路容器视图（小件批 Task 7·D1②）：证据行 ↔ 实体/关系迷你图段控。
      const [graphView, setGraphView] = React.useState('evidence')
      const [saveOpen, setSaveOpen] = React.useState(false)

      React.useEffect(() => {
        setResult(null)
        setFailure(null)
        setSelectedChunks(new Map())
        setSelectedCards([])
        setCollapsedPaths({ vector: false, graph: false, wiki: false })
        setGraphView('evidence')
        setSaveOpen(false)
      }, [kbId])

      // ↗ 复现预填（评测题库/详情 → 召回面板，§7.2）。
      React.useEffect(() => {
        if (prefill && typeof prefill.query === 'string' && prefill.query) setQuery(prefill.query)
      }, [prefill])

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
        { className: 'hrag-recall-bar hrag-tabbar' },
        h(
          'span',
          { className: 'hrag-searchwrap' },
          h('span', { className: 'hrag-searchicon' }, h(dshSearchIcon)),
          h('input', {
            type: 'text',
            className: 'hrag-searchinput',
            placeholder: t('recall.placeholder'),
            value: query,
            onChange: (event) => setQuery(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') run()
            },
          }),
        ),
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
            className: 'hrag-btn hrag-btn-outline hrag-recall-run',
            disabled: pending || !query.trim(),
            onClick: run,
          },
          pending ? t('recall.running') : t('recall.run'),
        ),
        // 两枚「在向量空间 / 在知识图谱查看」入口钮已撤（10-15 他令先去掉）；链路与图标保留（照 ASR 探针休眠先例），再接入时在此排末尾补回。
      )

      // 勾选总量（照工作台）：切片锚定 + 人工卡片；卡片贡献 wiki 路径、不进锚定集。
      const selectedList = [...selectedChunks.values()]
      const selectionPaths = []
      for (const item of selectedList) {
        if (selectionPaths.indexOf(item.path) < 0) selectionPaths.push(item.path)
      }
      if (selectedCards.length > 0 && selectionPaths.indexOf('wiki') < 0) selectionPaths.push('wiki')
      const selectionCount = selectedList.length + selectedCards.length
      const anySelected = selectionCount > 0

      let body
      if (!result) {
        body = h(
          'div',
          { className: 'hrag-state hrag-state-empty' },
          h('span', { className: 'hrag-state-icon' }, lucideFlaskIcon()),
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
        const toggleSelected = (chunkId, path) => {
          setSelectedChunks((current) => {
            const next = new Map(current)
            if (next.has(chunkId)) next.delete(chunkId)
            else next.set(chunkId, { id: chunkId, path })
            return next
          })
        }
        // 词条行勾选（小件批 Task 7·D1①，照工作台 :233-253）：源切片整体进锚定集
        // （已选不重）；全在＝整体撤。无源切片词条不可锚定（勾选禁）。
        const wikiEntryChecked = (hit) => {
          const sourceIds = Array.isArray(hit.source_chunk_ids) ? hit.source_chunk_ids : []
          if (sourceIds.length === 0) return false
          return sourceIds.every((id) => selectedChunks.has(id))
        }
        const toggleWikiEntry = (hit) => {
          const sourceIds = Array.isArray(hit.source_chunk_ids) ? hit.source_chunk_ids : []
          if (sourceIds.length === 0) return
          setSelectedChunks((current) => {
            if (sourceIds.every((id) => current.has(id))) {
              const next = new Map(current)
              for (const id of sourceIds) next.delete(id)
              return next
            }
            const next = new Map(current)
            for (const id of sourceIds) {
              if (!next.has(id)) next.set(id, { id, path: 'wiki' })
            }
            return next
          })
        }
        const toggleManualCard = (cardId) => {
          setSelectedCards((current) =>
            current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
          )
        }
        // 勾选描述子（三种行共用的形态）：{checked, label, onToggle, disabled?}——
        // vector/graph 行＝切片锚定；wiki 词条行＝源切片整体；manual 卡＝记录路径。
        const hitRow = (key, entry, onOpen, select) => {
          const rowButton = h(
            'button',
            {
              type: 'button',
              className: onOpen ? 'hrag-hitrow' : 'hrag-hitrow hrag-hitrow-static',
              onClick: onOpen || undefined,
              title: entry.rowTitle || (!HostTooltip && entry.sliceLabel ? entry.sliceLabel : undefined),
            },
            entry.rank != null ? h('span', { className: 'hrag-hitrank' }, '#' + String(entry.rank)) : null,
            h('span', { className: 'hrag-hitdoc', title: entry.docName }, String(entry.docName || '')),
            entry.badge ? h('span', { className: 'hrag-hitbadge' }, entry.badge) : null,
            h('span', { className: 'hrag-hitlead' }, entry.lead),
            entry.page != null ? h('span', { className: 'hrag-hitpage' }, 'p.' + String(entry.page)) : null,
            h('span', { className: 'hrag-hitscore' }, formatScore(entry.score)),
          )
          return h(
            'div',
            {
              className: 'hrag-hitrow-row',
              key,
              // 右键 = 勾选/取消（小件批 Task 7，照工作台）：容器级 preventDefault；
              // 不可锚定/无勾选面不切换。
              onContextMenu:
                select && !select.disabled
                  ? (event) => {
                      event.preventDefault()
                      select.onToggle()
                    }
                  : undefined,
            },
            select
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-hitselect' + (select.checked ? ' hrag-hitselect-on' : ''),
                    'aria-label': select.label,
                    'aria-pressed': select.checked,
                    title: select.label,
                    disabled: select.disabled || false,
                    onClick: select.onToggle,
                  },
                  select.checked ? '✓' : '',
                )
              : null,
            // 「切片 #K」位次气泡（小件批 Task 7，照工作台 slicePosition）：宿主
            // Tooltip 包裹；缺件回退行按钮原生 title（上 title 分支）。
            entry.sliceLabel && HostTooltip
              ? h(HostTooltip, { label: entry.sliceLabel, side: 'top', delayMs: 150, portal: true }, rowButton)
              : rowButton,
          )
        }
        const rowsFor = (path) => {
          if (path === 'vector') {
            return (result.paths.vector.hits || []).map((hit) =>
              hitRow(
                hit.chunk_id,
                {
                  rank: hit.rank,
                  docName: hit.doc_name,
                  lead: firstLine(hit.text),
                  page: hit.page,
                  score: hit.score,
                  sliceLabel: hit.chunk_position != null ? t('recall.slicePosition', { 0: hit.chunk_position }) : null,
                },
                onOpenChunk ? () => onOpenChunk(hit.chunk_id, hit.doc_name) : null,
                {
                  checked: selectedChunks.has(hit.chunk_id),
                  label: t('recall.saveAs.selectLabel', { 0: hit.doc_name }),
                  onToggle: () => toggleSelected(hit.chunk_id, 'vector'),
                },
              ),
            )
          }
          if (path === 'graph') {
            return (result.paths.graph.evidence || []).map((hit, index) =>
              hitRow(
                hit.chunk_id,
                {
                  rank: index + 1,
                  docName: hit.doc_name,
                  lead: firstLine(hit.text),
                  page: hit.page,
                  score: hit.score,
                  sliceLabel: hit.chunk_position != null ? t('recall.slicePosition', { 0: hit.chunk_position }) : null,
                },
                onOpenChunk ? () => onOpenChunk(hit.chunk_id, hit.doc_name) : null,
                {
                  checked: selectedChunks.has(hit.chunk_id),
                  label: t('recall.saveAs.selectLabel', { 0: hit.doc_name }),
                  onToggle: () => toggleSelected(hit.chunk_id, 'graph'),
                },
              ),
            )
          }
          return (result.paths.wiki.hits || []).map((hit) => {
            const manual = hit.source_type === 'manual'
            const anchorable = !manual && Array.isArray(hit.source_chunk_ids) && hit.source_chunk_ids.length > 0
            const open = manual
              ? onOpenManualCard
                ? () => onOpenManualCard(hit.entry_id)
                : null
              : onOpenWikiEntry
                ? () => onOpenWikiEntry(hit.entry_id)
                : null
            return hitRow(
              hit.entry_id,
              {
                rank: hit.rank,
                docName: hit.title,
                lead: stripSummaryHeading(hit.summary),
                page: null,
                score: hit.score,
                badge: manual ? t('wk.cardType') : null,
                rowTitle: manual ? t('recall.wikiAnchorTooltip') : null,
              },
              open,
              {
                checked: manual ? selectedCards.includes(hit.entry_id) : wikiEntryChecked(hit),
                disabled: !manual && !anchorable,
                label: t('recall.saveAs.selectLabel', { 0: hit.title }),
                onToggle: () => (manual ? toggleManualCard(hit.entry_id) : toggleWikiEntry(hit)),
              },
            )
          })
        }
        const graphEntityCount = (result.paths.graph.entities || []).length
        const graphRelationCount = (result.paths.graph.relations || []).length
        const section = (path) => {
          const collapsed = collapsedPaths[path]
          const scoreType = String((result.score_type && result.score_type[path]) || '')
          return h(
            'div',
            { className: 'hrag-recall-section' + (collapsed ? ' hrag-recall-section-collapsed' : ''), key: path },
            h(
              'div',
              { className: 'hrag-recall-head' },
              // 整栏点击收起（小件批 Task 7，照工作台）：chevron 退役；左簇（名＋
              // 分数语义芯片）即 toggle；收起＝只留头行，高度让给其余路。
              h(
                'button',
                {
                  type: 'button',
                  className: 'hrag-recall-toggle',
                  'aria-expanded': !collapsed,
                  onClick: () =>
                    setCollapsedPaths((current) => Object.assign({}, current, { [path]: !current[path] })),
                },
                h('span', { className: 'hrag-recall-name' }, t('recall.path.' + path)),
                h('span', { className: 'hrag-textchip', title: scoreType }, scoreType),
              ),
              // 段控（小件批 Task 7·D1②，照工作台 :580-615）：图谱路右挂证据↔实体
              // 两枚 10px 钮；实体钮 entities+relations 空时禁。
              path === 'graph'
                ? h(
                    'span',
                    { className: 'hrag-recall-seg' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-recall-segbtn',
                        'aria-pressed': graphView === 'evidence',
                        onClick: () => setGraphView('evidence'),
                      },
                      t('recall.evidenceView', { 0: counts.graph }),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-recall-segbtn',
                        'aria-pressed': graphView === 'entities',
                        disabled: graphEntityCount + graphRelationCount === 0,
                        onClick: () => setGraphView('entities'),
                      },
                      t('recall.entitiesView', { 0: graphEntityCount }),
                    ),
                  )
                : null,
              h(
                'span',
                { className: 'hrag-recall-meta' },
                // 耗时档色（小件批 Task 7，照工作台）：跨路排名取色——绿/黄/橙。
                h(
                  'span',
                  { className: 'hrag-textchip ' + elapsedRankClass(result.elapsed_ms, path) },
                  String((result.elapsed_ms && result.elapsed_ms[path]) || 0) + ' ms',
                ),
                h('span', { className: 'hrag-textchip' }, String(counts[path])),
              ),
            ),
            collapsed
              ? null
              : path === 'graph' && graphView === 'entities'
                ? // 实体视图＝内嵌力导向迷你图（D1 甲，照 recall-graph-mini）；图自
                  // 漫游缩放，不进滚动容器。
                  h(
                    'div',
                    { className: 'hrag-recall-mini' },
                    h(RecallGraphMini, {
                      entities: result.paths.graph.entities || [],
                      relations: result.paths.graph.relations || [],
                    }),
                  )
                : h(
                    'div',
                    {
                      className: 'hrag-recall-rows' + (anySelected ? ' hrag-recall-rows-selecting' : ''),
                    },
                    counts[path] === 0
                      ? h('div', { className: 'hrag-recall-empty' }, messages[path])
                      : rowsFor(path),
                  ),
          )
        }
        body = h(
          'div',
          { className: 'hrag-recall-arearel' },
          result.embedding_mismatch ? h('div', { className: 'hrag-notice hrag-notice-error' }, t('recall.mismatch')) : null,
          h('div', { className: 'hrag-recall-sections' }, RECALL_PATHS.map(section)),
          // 存为考题悬浮栏（小件批 Task 7，照工作台 §7.1 2026-09-05 改造）：勾选 ≥1
          // 浮出——absolute 底中、不占流（旧在流条浮出时压缩三路高度产生抖动）；
          // pointer-events 双档（外层不吃画布交互，胶囊可点）。
          anySelected
            ? h(
                'div',
                { className: 'hrag-recall-savebar' },
                h(
                  'div',
                  { className: 'hrag-recall-savepill' },
                  h(
                    'span',
                    { className: 'hrag-recall-savecount hrag-ev-tabnums' },
                    t('recall.saveAs.selectedCount', { 0: selectionCount }),
                  ),
                  h(
                    'button',
                    { type: 'button', className: 'hrag-btn hrag-btn-primary hrag-btn-sm', onClick: () => setSaveOpen(true) },
                    t('recall.saveAs.button'),
                  ),
                ),
              )
            : null,
        )
      }

      return h(
        React.Fragment,
        null,
        bar,
        failure ? h('div', { className: 'hrag-notice hrag-notice-error' }, t('recall.failed') + '：' + errorDetail(failure)) : null,
        body,
        h(EvalSaveAsQuestionDialog, {
          t,
          kbId,
          open: saveOpen,
          onClose: () => setSaveOpen(false),
          prefillQuery: result ? result.query : query,
          defaultPaths: selectionPaths,
          selectedChunkIds: selectedList.map((item) => item.id),
          selectionCount: selectionCount,
          onSaved: () => {
            setSelectedChunks(new Map())
            setSelectedCards([])
            showToast(t('recall.saveAs.savedToast'))
          },
        }),
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

    /** 搜索命中谓词（照工作台）：四类 label 子串；范围限定类别。 */
    function vecSearchMatches(point, needle, scope) {
      const collection = VEC_COLLECTION_OF_SOURCE[point.source_type]
      if (!collection) return false
      if (scope !== 'all' && collection !== scope) return false
      return String(point.label || '').toLowerCase().includes(needle)
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
    function VectorCanvas({ t, dims, points, groups, opacities, hiddenTypes, activeOverlay, searchedPointIds, onPick }) {
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
          const matched = searchedPointIds === null || searchedPointIds.has(point.id)
          const alpha =
            searchedPointIds !== null
              ? matched
                ? 1
                : 0.2
              : hit
                ? 1
                : dimmed
                  ? VEC_DIMMED_OPACITY
                  : baseOpacity
          const size = (group.size || 8) * (searchedPointIds !== null && matched ? 1.4 : 1)
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
      }, [dims, groups, opacities, hiddenTypes, activeOverlay, searchedPointIds, hitById, hitRange])

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
            if (drag.button === 2) {
              // ③档批 G5（照工作台 3D viewControl 默认 panMouseButton=right）：
              // 右键拖拽平移；左键仍是抓取旋转。
              view.ox += dx
              view.oy += dy
            } else {
              // 抓取语义（他实跑点名「拖拽反了」）：拖向右＝近侧跟随向右。
              view.yaw -= dx * 0.008
              view.pitch = Math.max(-1.45, Math.min(1.45, view.pitch + dy * 0.008))
            }
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
        dragRef.current = {
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          button: event.button,
        }
        setGrabbing(true)
      }
      const handleUp = (event) => {
        const drag = dragRef.current
        dragRef.current = null
        setGrabbing(false)
        if (drag && !drag.moved && drag.button === 0) {
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
          onContextMenu: (event) => event.preventDefault(),
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
      const [recomputing, setRecomputing] = React.useState(false)
      const [hiddenTypes, setHiddenTypes] = React.useState({})
      const [activeOverlay, setActiveOverlay] = React.useState(null)
      // ③档批 G 组：搜索/范围、工具栏档位、索引在飞计数。
      const [searchQuery, setSearchQuery] = React.useState('')
      const [searchScope, setSearchScope] = React.useState('all')
      const [toolbarTier, setToolbarTier] = React.useState(0)
      const [indexingCount, setIndexingCount] = React.useState(0)
      const toolbarRef = React.useRef(null)
      const tierRef = React.useRef(0)
      const tierRestoreRef = React.useRef([0, 0, 0])
      const collectionsKey = collections.join(',')
      const projectionRef = React.useRef(null)
      projectionRef.current = projection

      React.useEffect(() => {
        setProjection(null)
        setPhase('idle')
        setFailure(null)
        setActiveOverlay(null)
        setSearchQuery('')
        setSearchScope('all')
        setIndexingCount(0)
      }, [kbId])

      // 工具栏档位（照工作台 useToolbarTier）：溢出逐级升档；回落到本档精确触发点。
      const evaluateTier = React.useCallback(() => {
        const element = toolbarRef.current
        if (!element) return
        const width = element.clientWidth
        const overflow = element.scrollWidth > width + 1
        const current = tierRef.current
        if (overflow && current < 2) {
          tierRestoreRef.current[current + 1] = element.scrollWidth + 4
          tierRef.current = current + 1
          setToolbarTier(current + 1)
        } else if (!overflow && current > 0 && width >= tierRestoreRef.current[current]) {
          tierRef.current = current - 1
          setToolbarTier(current - 1)
        }
      }, [])
      React.useEffect(() => {
        evaluateTier()
      })
      React.useEffect(() => {
        const element = toolbarRef.current
        if (!element || typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(evaluateTier)
        observer.observe(element)
        return () => observer.disconnect()
      }, [evaluateTier])

      // 索引中提示（照工作台 indexingCount）：有在飞文档时 3s 续拍，空闲 15s 慢拍。
      React.useEffect(() => {
        if (!enabled) return undefined
        let cancelled = false
        let timer = null
        const tick = () => {
          callOp('listDocuments', { kb_id: kbId })
            .then((rows) => {
              if (cancelled) return
              const list = Array.isArray(rows) ? rows : []
              const count = list.filter((doc) => doc.status !== 'ready' && doc.status !== 'failed').length
              setIndexingCount(count)
              timer = window.setTimeout(tick, count > 0 ? PIPELINE_POLL_MS : 15000)
            })
            .catch(() => {
              if (!cancelled) timer = window.setTimeout(tick, 15000)
            })
        }
        tick()
        return () => {
          cancelled = true
          if (timer !== null) window.clearTimeout(timer)
        }
      }, [enabled, kbId])

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
            showToast(errorDetail(error), { error: true })
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
          if (isNew) showToast(t('vec.overlayPcaOnly'))
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
              showToast(t('vec.overlayStale'))
              return
            }
            setActiveOverlay({
              query: { x: result.x, y: result.y, z: result.z, label: overlayRequest.text },
              hits: Array.isArray(overlayRequest.hits) ? overlayRequest.hits : [],
              fingerprint: result.fingerprint,
            })
          })
          .catch(() => {
            if (!cancelled) showToast(t('vec.overlayFailed'))
          })
        return () => {
          cancelled = true
        }
      }, [enabled, overlayRequest, projectionFp, algo, kbId, collectionsKey, dims, t]) // eslint-disable-line react-hooks/exhaustive-deps

      const points = React.useMemo(() => (projection ? projection.points : []), [projection])
      const groups = React.useMemo(() => groupVectorPoints(points), [points])
      const opacities = React.useMemo(() => vectorGroupOpacities(groups), [groups])
      // 搜索命中集（照工作台）：四类 label 子串；范围限定类别；空查询＝不启用。
      const searchedPointIds = React.useMemo(() => {
        const needle = searchQuery.trim().toLowerCase()
        if (!needle) return null
        const ids = new Set()
        for (const point of points) {
          if (vecSearchMatches(point, needle, searchScope)) ids.add(point.id)
        }
        return ids
      }, [searchQuery, searchScope, points])
      const overlayHitCounts = React.useMemo(() => {
        if (!activeOverlay) return null
        const ids = new Set(points.map((point) => point.id))
        const matched = activeOverlay.hits.filter((hit) => ids.has(hit.pointId)).length
        return { matched, total: activeOverlay.hits.length }
      }, [activeOverlay, points])

      const searchRow = h(
        'div',
        { className: 'hrag-vec-searchrow hrag-tabbar' },
        h(
          'div',
          { className: 'hrag-searchwrap' },
          h('span', { className: 'hrag-searchicon' }, h(dshSearchIcon)),
          h('input', {
            type: 'search',
            className: 'hrag-searchinput',
            placeholder: t('vec.searchAll'),
            'aria-label': t('vec.searchAll'),
            value: searchQuery,
            onChange: (event) => setSearchQuery(event.target.value),
          }),
        ),
        h(EvalMenu, {
          className: 'hrag-vec-scopemenu',
          label: h(
            React.Fragment,
            null,
            h('span', null, t('vec.searchScopes.' + searchScope)),
            h('span', { className: 'hrag-vec-dropchev' }, lucideChevronDownIcon(1)),
          ),
          title: t('vec.searchScopeLabel'),
          align: 'end',
          render: (close) =>
            ['all', 'chunks', 'entities', 'wiki', 'cards'].map((key) =>
              h(
                EvalMenuItem,
                {
                  key,
                  selected: searchScope === key,
                  onSelect: () => {
                    setSearchScope(key)
                    close()
                  },
                },
                t('vec.searchScopes.' + key),
              ),
            ),
        }),
      )

      const bar = h(
        'div',
        { className: 'hrag-vec-bar', ref: toolbarRef },
        VEC_COLLECTIONS.map((key) => {
          const active = collections.includes(key)
          const color = VEC_COLORS[VEC_SOURCE_OF_COLLECTION[key]]
          return h(
            'button',
            {
              key,
              type: 'button',
              className: 'hrag-chip' + (toolbarTier === 0 ? '' : ' hrag-chip-icon'),
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
            toolbarTier === 0 ? h('span', null, t('vec.chips.' + key)) : null,
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
          toolbarTier < 2
            ? h(
                React.Fragment,
                null,
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
                h(EvalMenu, {
                  className: 'hrag-vec-algomenu',
                  label: h(
                    React.Fragment,
                    null,
                    h('span', null, algo.toUpperCase()),
                    h('span', { className: 'hrag-vec-dropchev' }, lucideChevronDownIcon(1)),
                  ),
                  title: t('vec.algoLabel'),
                  align: 'end',
                  render: (close) =>
                    ['pca', 'umap'].map((value) =>
                      h(
                        EvalMenuItem,
                        {
                          key: value,
                          selected: algo === value,
                          onSelect: () => {
                            setAlgo(value)
                            close()
                          },
                        },
                        value.toUpperCase(),
                      ),
                    ),
                }),
              )
            : h(EvalMenu, {
                icon: dshEllipsisIcon(),
                title: t('vec.moreOptions'),
                align: 'end',
                render: (close) => [
                  h('div', { key: 'dims', className: 'hrag-ev-menu-note' }, t('vec.dimsLabel')),
                  [2, 3].map((value) =>
                    h(
                      EvalMenuItem,
                      {
                        key: 'dims-' + value,
                        selected: dims === value,
                        onSelect: () => {
                          setDims(value)
                          close()
                        },
                      },
                      String(value) + 'D',
                    ),
                  ),
                  h('div', { key: 'sep', className: 'hrag-ev-menu-sep' }),
                  h('div', { key: 'algo', className: 'hrag-ev-menu-note' }, t('vec.algoLabel')),
                  ['pca', 'umap'].map((value) =>
                    h(
                      EvalMenuItem,
                      {
                        key: 'algo-' + value,
                        selected: algo === value,
                        onSelect: () => {
                          setAlgo(value)
                          close()
                        },
                      },
                      value.toUpperCase(),
                    ),
                  ),
                ],
              }),
          h(
            'button',
            {
              type: 'button',
              className: 'hrag-btn hrag-btn-outline hrag-btn-icon hrag-vec-iconbtn',
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
        body = h(
          'div',
          { className: 'hrag-state hrag-state-empty' },
          h('span', { className: 'hrag-state-icon' }, lucideChartScatterIcon()),
          h('div', { className: 'hrag-state-title' }, t('vec.empty')),
        )
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
            searchedPointIds,
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
        searchRow,
        bar,
        indexingCount > 0
          ? h('div', { className: 'hrag-vec-indexhint' }, evText(t('vec.indexingHint'), [indexingCount]))
          : null,
        body,
      )
    }

    /** 图谱画布（手写 canvas＋自研力导向，照工作台语义）：节点/边/缩放分级标签/
        hover 邻域蓝描边（加法）／三层路径叠加；拖节点、拖空白平移、滚轮缩放。
        LOD 分层（2026-10-13）：滚轮跨档重建渲染子集（照工作台 rebuildSeriesAtTier）。 */
    /** 力场一步（逐公式照工作台 echarts forceHelper，2026-10-13 二轮口径）：先弹簧
        （逐边）、再重力（逐点）、再斥力（两两累计进 pp）、最后 Verlet 积分
        （p += (p−pp)·friction）。大图与召回迷你图共用同一内核（参数注入）。 */
    function graphForceStep(items, links, byId, friction, opts) {
      const n = items.length
      const edgeLength = opts.edgeLength
      const gravity = opts.gravity
      const repulsion = opts.repulsion
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
        const push = ((dist - edgeLength) * friction) / dist
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
        item.x -= item.x * gravity * friction
        item.y -= item.y * gravity * friction
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
          const repFact = (repulsion + repulsion) / (dist * dist)
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
    }

    function GraphCanvas({ t, nodes, edges, communities, colorBy, overlayTrace, focusNode, onNodeClick, onRenderTierChange, colorMap: providedColorMap, deltaIds }) {
      const wrapRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const viewRef = React.useRef({ zoom: 1, ox: 0, oy: 0 })
      const simRef = React.useRef(null)
      // 本代视口上限（只缩不放，2026-10-13 三报·帧迹实证）：重建预拟合值＝上限；
      // 收敛早期的重力坍缩会让瞬时包围盒缩小、fit 经 rawFit≥1 分支跳回 1——正是
      // 「进入一瞬全图（含文字）再变缩略」的根因，钳上限后全程只减不增。
      const fitCeilingRef = React.useRef(null)
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
          const friction = sim.friction
          // 力场一步＝共享内核（graphForceStep）；大图参数：理想边 80（edgeLength
          // [40,120] 中值）、斥力 120、重力 0.1（照工作台口径）。
          graphForceStep(items, links, byId, friction, {
            edgeLength: GRAPH_EDGE_LENGTH,
            gravity: GRAPH_GRAVITY,
            repulsion: GRAPH_REPULSION,
          })
          // 自动全览（2026-10-13 他报「默认缩放偏大」——初始应为全图入画的
          // 缩略态）：收敛期间每帧按当前包围盒拟合视口（八折留边、只缩不放、
          // 下限夹取；需要缩放时压标签阈下＝全览零标签）。首帧由数据 effect 预
          // 拟合；本代视口上限＝预拟合值——收敛早期的重力坍缩会让瞬时包围盒缩
          // 小、fit 经 rawFit≥1 分支跳回 1（「一瞬全图再缩」根因·帧迹实证），
          // 钳上限后全程只减不增。
          if (autoFitRef.current) {
            const fitted = graphFitViewport(wrapRef.current, items)
            if (fitted) {
              const ceiling = fitCeilingRef.current
              if (ceiling != null && fitted.zoom > ceiling) {
                const k = ceiling / fitted.zoom
                viewRef.current = { zoom: ceiling, ox: fitted.ox * k, oy: fitted.oy * k }
              } else {
                viewRef.current = fitted
              }
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
        // 首帧预拟合（2026-10-13 他报「进入一瞬是全图、随后变缩略」）：撒点后、
        // 首绘前先按包围盒拟合一次——首帧即全览态；收敛期间仍逐帧跟随（步进内）。
        // colorBy 切换走同一 effect（重建）——同享此预拟合，不再闪一帧。
        fitCeilingRef.current = null
        if (autoFitRef.current && simRef.current) {
          const fitted = graphFitViewport(wrapRef.current, simRef.current.items)
          if (fitted) {
            viewRef.current = fitted
            fitCeilingRef.current = fitted.zoom
          }
        }
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
          showToast(t('graph.overlayStale'))
        }
      }, [graphFp, activeOverlay, t])

      const handleSearch = (event) => {
        event.preventDefault()
        const needle = query.trim().toLowerCase()
        if (!needle || !graph) return
        const hit = graph.nodes.find((node) => String(node.id).toLowerCase().includes(needle))
        if (!hit) {
          showToast(t('graph.searchNoMatch'))
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
          showToast(t('graph.focusHidden'))
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
        { className: 'hrag-graph-bar hrag-tabbar' },
        h(
          'form',
          { className: 'hrag-graph-search', onSubmit: handleSearch },
          h(
            'span',
            { className: 'hrag-searchwrap' },
            h('span', { className: 'hrag-searchicon' }, h(dshSearchIcon)),
            h('input', {
              type: 'text',
              className: 'hrag-searchinput',
              placeholder: t('graph.searchEntities'),
              'aria-label': t('graph.searchEntities'),
              value: query,
              onChange: (event) => setQuery(event.target.value),
            }),
          ),
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
        body = h(
          'div',
          { className: 'hrag-state hrag-state-empty' },
          h('span', { className: 'hrag-state-icon' }, lucideWaypointsIcon()),
          h('div', { className: 'hrag-state-title' }, t('graph.empty')),
        )
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
        body,
        entityDrawer,
      )
    }

    /** 指针位菜单（行右键/表头右键，doc-columns 对 Task 3 由「仅出题」升级为通用
        项集：照工作台——行 ⋯ 镜像右键、表头右键＝列设置）。宿主 Menu 挂在 0 尺寸
        fixed 锚上（getAnchorRect 直供指针位，wrapper 不上测）；无宿主件走 .hrag-mm
        兜底面板（照 DshMenu 无宿主分支语汇）。 */
    let ctxMenuSeq = 0
    // 宿主子菜单最小宽 163＋10 间距＋12 视口边距；宿主只夹父菜单，不夹子菜单。
    const CTX_SUBMENU_RESERVE = 163 + 10 + 12
    function useCtxListClass() {
      return React.useMemo(() => 'hrag-ctxmenu-' + ++ctxMenuSeq, [])
    }
    /** 宿主子菜单恒向右展开（left:100%+10px）；父菜单最终右缘留给子菜单不足
        时加翻转类，把子菜单镜像到左侧。anchorLeft/anchorRight 二选一：前者是
        align=start 的锚点左缘，后者是 align=end 的锚点右缘（宿主的夹取口径）。 */
    function useCtxSubmenuFlip(listClass, hasSubmenu, anchorLeft, anchorRight) {
      const [flip, setFlip] = React.useState(false)
      React.useLayoutEffect(() => {
        if (!HostMenu) return
        if (!hasSubmenu) {
          setFlip(false)
          return
        }
        if (anchorLeft === null && anchorRight === null) return
        const list = document.querySelector('.' + listClass)
        const width = list === null ? 0 : list.offsetWidth
        const viewport = window.innerWidth
        if (width <= 0 || viewport <= 0) return
        const left = anchorRight === null ? anchorLeft : anchorRight - width
        const right = Math.min(left + width, viewport - 12)
        setFlip(right + CTX_SUBMENU_RESERVE > viewport - 12)
      }, [listClass, hasSubmenu, anchorLeft, anchorRight])
      return flip
    }
    function DocContextMenu({ t, x, y, items, onSelect, onClose }) {
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      const listClass = useCtxListClass()
      const hasSubmenu = items.some((entry) => entry && Array.isArray(entry.submenu) && entry.submenu.length > 0)
      const submenuFlip = useCtxSubmenuFlip(listClass, hasSubmenu, x, null)
      if (HostMenu) {
        // 宿主 Menu 的根是普通 span：直接挂在 flex column 容器里会多出一个
        // 参与 gap 的 flex 项（菜单开关瞬间上下区块收缩→抖动）。零尺寸
        // fixed 包裹把整棵锚点移出文档流；菜单本体仍由宿主 portal 到 body。
        return h(
          'span',
          {
            className: 'hrag-ctxmenu-flowless',
            style: { position: 'fixed', left: 0, top: 0, width: 0, height: 0 },
          },
          h(HostMenu, {
            open: true,
            anchor: h('span', {
              className: 'hrag-ctxanchor',
              style: { position: 'fixed', left: x + 'px', top: y + 'px', width: '0px', height: '0px' },
            }),
            items,
            onSelect: (id) => {
              onClose()
              onSelect(id)
            },
            onClose,
            align: 'start',
            portal: true,
            listClassName:
              'hrag-ctxmenu-list ' + listClass + (submenuFlip ? ' hrag-ctxmenu-subflip' : ''),
            getAnchorRect: () => ({ x: x, y: y, left: x, top: y, width: 0, height: 0, right: x, bottom: y }),
          }),
        )
      }
      return h(
        React.Fragment,
        null,
        h('div', { className: 'hrag-mm-backdrop', onMouseDown: onClose }),
        h(
          'div',
          {
            className: 'hrag-mm',
            role: 'menu',
            onContextMenu: (event) => event.stopPropagation(),
            style: { position: 'fixed', left: x + 'px', top: y + 'px' },
          },
          fallbackMenuRows(items, (id) => {
            onClose()
            onSelect(id)
          }),
        ),
      )
    }

    /** 文档面板：列表＋行内动作（重试只对 failed/降级出现；删除走级联确认）。
        照工作台词汇；随 kb 或壳刷新重载。 */
    // ── 文档工具栏（小件批 Task 1，照工作台 `document-view.ts`）：过滤＝trim＋小写
    // 包含（纯客户端——清单端点本就返回全量）；排序＝四键，null 恒沉底不随方向
    // （chunk_count 未定态不参与排名），字符串 localeCompare、数字差。
    const DOC_SORT_DEFAULT = { key: 'created_at', direction: 'desc' }
    const DOC_SORT_OPTIONS = [
      { key: 'created_at', labelKey: 'doc.sortCreatedAt' },
      { key: 'name', labelKey: 'doc.sortName' },
      { key: 'size_bytes', labelKey: 'doc.sortSize' },
      { key: 'chunk_count', labelKey: 'doc.sortChunks' },
    ]
    function docsFilter(list, query) {
      const needle = String(query || '').trim().toLowerCase()
      if (!needle) return list
      return list.filter((doc) => String(doc.name || '').toLowerCase().includes(needle))
    }
    function docsSort(list, key, direction) {
      const sign = direction === 'asc' ? 1 : -1
      return list.slice().sort((a, b) => {
        const av = a[key]
        const bv = b[key]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (typeof av === 'string' && typeof bv === 'string') return sign * av.localeCompare(bv)
        return sign * (Number(av) - Number(bv))
      })
    }

    // 列格式化（doc-columns 对 Task 1，照工作台 format.ts / document-stats.ts 口径）：
    // 绝对时间走 Intl（locale 取宿主 <html lang>——dsh-client-locale 维护它，
    // zh→zh-CN、余 en-US，与工作台 locale 映射同式）；KB 千分位整数、子 1KB 进位 1
    // （Windows 口径），精确字节留悬停 Tooltip。不可解析值原样返回（同工作台）。
    function docTableLangTag() {
      try {
        const lang =
          (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang) || ''
        return String(lang).toLowerCase().indexOf('zh') === 0 ? 'zh-CN' : 'en-US'
      } catch (error) {
        return 'en-US'
      }
    }
    function docFmtTimestamp(value) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return new Intl.DateTimeFormat(docTableLangTag(), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    }
    function docFmtKb(bytes) {
      if (bytes <= 0) return '0'
      if (bytes < 1024) return '1'
      return Math.round(bytes / 1024).toLocaleString()
    }

    // 底栏统计行（doc-columns 对 Task 1 修订＝B3 收编，照工作台 document-stats.ts
    // ＋document-stats-row）：总数走未过滤全集；右端仅「在飞/失败」计数彩点
    // （就绪＝静默默认，两者皆零时整段不渲染）；格式＝1024 进制一位小数。
    const DOC_DOT_CLASS = {
      uploaded: 'hrag-docdot-idle',
      parsing: 'hrag-docdot-active',
      chunking: 'hrag-docdot-active',
      indexing: 'hrag-docdot-active',
      ready: 'hrag-docdot-ready',
      failed: 'hrag-docdot-failed',
    }
    function docDotClass(status) {
      return DOC_DOT_CLASS[status] || 'hrag-docdot-idle'
    }
    function docStats(docs) {
      let failed = 0
      let inProgress = 0
      let totalBytes = 0
      let totalChunks = 0
      for (const doc of docs) {
        if (doc.status === 'failed') failed += 1
        else if (doc.status !== 'ready') inProgress += 1
        totalBytes += Number(doc.size_bytes) || 0
        totalChunks += Number(doc.chunk_count) || 0
      }
      return { total: docs.length, failed, inProgress, totalBytes, totalChunks }
    }
    function docFmtBytes(bytes) {
      const value = Number(bytes) || 0
      if (value < 1024) return value + ' B'
      const kib = value / 1024
      if (kib < 1024) return kib.toFixed(1) + ' KB'
      const mib = kib / 1024
      if (mib < 1024) return mib.toFixed(1) + ' MB'
      return (mib / 1024).toFixed(1) + ' GB'
    }
    function docStatsRow(t, docs) {
      const stats = docStats(docs)
      return h(
        'div',
        { className: 'hrag-docstats' },
        h(
          'span',
          { className: 'hrag-docstats-volume' },
          t('doc.statsDocuments') +
            ' ' +
            stats.total +
            ' · ' +
            t('doc.statsChunks') +
            ' ' +
            stats.totalChunks +
            ' · ' +
            docFmtBytes(stats.totalBytes),
        ),
        stats.inProgress > 0 || stats.failed > 0
          ? h(
              'span',
              { className: 'hrag-docstats-alert' },
              stats.inProgress > 0
                ? h(
                    'span',
                    { className: 'hrag-docstats-item' },
                    h('span', { className: 'hrag-docdot hrag-docdot-active' }),
                    t('doc.status.indexing') + ' ' + stats.inProgress,
                  )
                : null,
              stats.failed > 0
                ? h(
                    'span',
                    { className: 'hrag-docstats-item' },
                    h('span', { className: 'hrag-docdot hrag-docdot-failed' }),
                    t('doc.status.failed') + ' ' + stats.failed,
                  )
                : null,
            )
          : null,
      )
    }

    // ── 列偏好（doc-columns 对 Task 2，照工作台 use-doc-table-prefs.ts）：per-kb
    // localStorage（插件 hrag- 键族先例 hrag-kb-order）；脏数据/缺失一律回退默认
    // （本地 UI 偏好是锦上添花，永不崩）；名称列钉死不可隐（行身份标识）。
    const DOC_PREFS_KEY_PREFIX = 'hrag-doc-table-prefs.'
    const DOC_HIDEABLE_COLUMNS = ['status', 'uploader', 'createdAt', 'size', 'chunks']
    const DOC_COLUMN_LABEL_KEYS = {
      status: 'doc.thStatus',
      uploader: 'doc.thUploader',
      createdAt: 'doc.thTime',
      size: 'doc.thSize',
      chunks: 'doc.thChunks',
    }
    const DOC_PREFS_DEFAULT = { hidden: [], timeFormat: 'absolute', sizeUnit: 'kb' }
    function docPrefsSanitize(parsed) {
      if (!parsed || typeof parsed !== 'object') return DOC_PREFS_DEFAULT
      const hidden = Array.isArray(parsed.hidden)
        ? parsed.hidden.filter((id) => DOC_HIDEABLE_COLUMNS.indexOf(id) !== -1)
        : []
      return {
        hidden,
        timeFormat: parsed.timeFormat === 'relative' ? 'relative' : 'absolute',
        sizeUnit: parsed.sizeUnit === 'mb' ? 'mb' : 'kb',
      }
    }
    function readDocPrefs(kbId) {
      try {
        const raw = window.localStorage.getItem(DOC_PREFS_KEY_PREFIX + kbId)
        return raw ? docPrefsSanitize(JSON.parse(raw)) : DOC_PREFS_DEFAULT
      } catch (cause) {
        return DOC_PREFS_DEFAULT
      }
    }
    function writeDocPrefs(kbId, prefs) {
      try {
        window.localStorage.setItem(DOC_PREFS_KEY_PREFIX + kbId, JSON.stringify(prefs))
      } catch (cause) {
        /* best effort */
      }
    }
    // 相对时间（Task 2，照工作台 formatKnowledgeRelativeTime）：Intl.RelativeTimeFormat
    // numeric auto（「昨天/3天前」）；<1 分钟硬编码「刚刚」（Intl 对亚分钟无自然词）；
    // 不可解析值原样返回（同绝对式）。now 可注入便于测试。
    const DOC_RELATIVE_UNITS = [
      ['year', 1000 * 60 * 60 * 24 * 365],
      ['month', 1000 * 60 * 60 * 24 * 30],
      ['day', 1000 * 60 * 60 * 24],
      ['hour', 1000 * 60 * 60],
      ['minute', 1000 * 60],
    ]
    function docFmtRelative(value, now) {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      const lang = docTableLangTag()
      const diff = date.getTime() - (now == null ? Date.now() : now)
      if (Math.abs(diff) < 60000) return lang === 'zh-CN' ? '刚刚' : 'just now'
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
      for (const [unit, ms] of DOC_RELATIVE_UNITS) {
        if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit)
      }
      return rtf.format(Math.round(diff / 60000), 'minute')
    }
    // 固定 MB（Task 2，照工作台 formatMb）：≥0.1 一位小数、以下两位（避免误读 0.0）；
    // 精确字节仍走悬停 Tooltip（同 KB 档）。
    function docFmtMb(bytes) {
      if (bytes <= 0) return '0'
      const mib = bytes / 1048576
      return mib >= 0.1 ? mib.toFixed(1) : mib.toFixed(2)
    }
    // 行 ⋯ 菜单项（Task 3.5，照工作台行 ⋯ 逐项）：查看切片/下载原文/重试〔failed 或
    // 降级〕/分隔/删除。生成考题不在 ⋯——工作台该入口只在右键选择态菜单（10-16 批量
    // 版收编随改）；危险项殿后。
    function docRowMenuItems(t, doc, opts) {
      const items = [
        { id: 'open-chunks', label: t('doc.openChunks'), icon: dshTextFileIcon() },
        { id: 'download', label: t('doc.downloadOriginal'), icon: dshDownloadIcon() },
      ]
      if (doc.status === 'failed' || opts.degraded) {
        items.push({ id: 'retry', label: t('doc.retry'), icon: dshRetryIcon(), disabled: opts.busy })
      }
      items.push({ type: 'separator', id: 'row-sep' })
      items.push({ id: 'delete', label: t('doc.delete'), icon: dshTrashIcon(), danger: true, disabled: opts.busy })
      return items
    }
    // 行右键菜单项（Task 3.6 批量版，照工作台 ContextMenuContent 两态）：选中 >1 →
    // 批量态〔已选 N 标签／生成考题（联合）〔选中集全就绪才亮〕／取消选择／分隔／删除
    // 所选〕；否则单行态＝⋯ 项＋生成考题〔就绪〕＋取消选择＋分隔＋删除所选（右键即选中
    // 该行，措辞随选择态改「删除所选」——工作台同款）。
    function docContextMenuItems(t, doc, opts) {
      if (opts.selectedCount > 1) {
        const items = [{ type: 'label', id: 'sel-label', text: evText(t('doc.selectedCount'), [opts.selectedCount]) }]
        if (opts.allSelectedReady) {
          items.push({ id: 'gen-question-batch', label: t('doc.genQuestionBatch'), icon: dshSparkleIcon() })
        }
        items.push({ id: 'cancel-select', label: t('doc.cancelSelection'), icon: dshCloseIcon() })
        items.push({ type: 'separator', id: 'bulk-sep' })
        items.push({ id: 'delete-selected', label: t('doc.deleteSelected'), icon: dshTrashIcon(), danger: true, disabled: opts.busy })
        return items
      }
      const items = [
        { id: 'open-chunks', label: t('doc.openChunks'), icon: dshTextFileIcon() },
        { id: 'download', label: t('doc.downloadOriginal'), icon: dshDownloadIcon() },
      ]
      if (opts.canGenerate) items.push({ id: 'gen-question', label: t('doc.generateQuestion'), icon: dshSparkleIcon() })
      if (doc.status === 'failed' || opts.degraded) {
        items.push({ id: 'retry', label: t('doc.retry'), icon: dshRetryIcon(), disabled: opts.busy })
      }
      items.push({ id: 'cancel-select', label: t('doc.cancelSelection'), icon: dshCloseIcon() })
      items.push({ type: 'separator', id: 'row-sep' })
      items.push({ id: 'delete-selected', label: t('doc.deleteSelected'), icon: dshTrashIcon(), danger: true, disabled: opts.busy })
      return items
    }
    // 列菜单项（Task 3，照工作台「列」总控/表头右键同项集）：勾选＝该列可见
    // （hidden 不含它）；末尾「全部显示」＝仅清 hidden（格式/单位档不动）。
    function docColumnsMenuItems(t, prefs) {
      return [
        { type: 'label', id: 'col-label', text: t('doc.columns') },
        ...DOC_HIDEABLE_COLUMNS.map((id) => ({
          id: 'col-' + id,
          label: t(DOC_COLUMN_LABEL_KEYS[id]),
          icon: prefs.hidden.indexOf(id) === -1 ? dshCheckIcon() : null,
        })),
        { type: 'separator', id: 'col-sep' },
        { id: 'col-show-all', label: t('doc.colShowAll'), icon: dshEyeIcon() },
      ]
    }

    // 文档空态（小件批 Task 2，照工作台 EmptyDocumentsState）：降调九宫格＋一句
    // 短文案；九格同时是「这些格式都欢迎」的安静提示——`readme` 无后缀落 unknown
    // 软收尾。拖入双态：可落类放大点亮、其余降灰（全拒＝整体降灰）。
    const DOC_EMPTY_SAMPLES = [
      'report.pdf',
      'notes.docx',
      'data.xlsx',
      'deck.pptx',
      'app.py',
      'photo.png',
      'video.mp4',
      'bundle.zip',
      'readme',
    ]

    function DocsEmptyState({ t, probe }) {
      const lit = probe ? probe.litKinds : []
      const dimAll = probe !== null && !probe.anyAccepted
      return h(
        'div',
        { className: 'hrag-docempty' },
        h(
          'div',
          { className: 'hrag-docempty-grid', 'data-testid': 'empty-doc-icons' },
          DOC_EMPTY_SAMPLES.map((name) => {
            const isLit = lit.indexOf(fileTypeKind(name)) !== -1
            const state = probe === null ? '' : dimAll || !isLit ? ' hrag-docempty-dim' : ' hrag-docempty-lit'
            return h(FileTypeBadge, {
              key: name,
              fileName: name,
              className: 'hrag-docempty-badge' + state,
            })
          }),
        ),
        h('p', { className: 'hrag-docempty-copy' }, t('doc.empty')),
      )
    }

    // ── 状态六腿悬停分解（小件批 Task 4，照工作台 `path-status.ts` 逐条）：视频
    // 预处理腿（asr/segment/caption）按 payload 有无键前置，检索腿 vector/graph/wiki
    // 恒在；图谱「索引中」合入进度百分比（「图谱 索引中 87%」不再另处重复）；
    // `path_status` 空＝null（legacy 行不出悬停，兼容契约同工作台）。
    const DOC_PATH_KEYS = {
      asr: 'doc.path.asr',
      segment: 'doc.path.segment',
      caption: 'doc.path.caption',
      vector: 'doc.path.vector',
      graph: 'doc.path.graph',
      wiki: 'doc.path.wiki',
    }
    const DOC_PATH_STATE_KEYS = {
      pending: 'doc.path.state.pending',
      indexing: 'doc.path.state.indexing',
      done: 'doc.path.state.done',
      degraded: 'doc.path.state.degraded',
      failed: 'doc.path.state.failed',
      generating: 'doc.path.state.generating',
      ready: 'doc.path.state.ready',
    }

    function pathStatusLines(doc) {
      const status = doc.path_status
      if (!status) return null
      const indexingGraph = doc.status === 'indexing' && status.graph === 'indexing'
      const lines = []
      for (const leg of ['asr', 'segment', 'caption']) {
        if (status[leg] !== undefined) lines.push({ path: leg, state: status[leg] })
      }
      lines.push({ path: 'vector', state: status.vector })
      lines.push({
        path: 'graph',
        state: status.graph,
        percent: indexingGraph ? doc.progress_percent : undefined,
      })
      lines.push({ path: 'wiki', state: status.wiki })
      return lines
    }

    function docPathStateLabel(t, state) {
      const key = DOC_PATH_STATE_KEYS[state]
      return key ? t(key) : String(state)
    }

    /** 无宿主 Tooltip 时铺平成原生 title 文本（缺件回退面）。 */
    function docPathLineText(t, line) {
      const name = t(DOC_PATH_KEYS[line.path]) + (line.path === 'wiki' ? t('doc.path.libraryHint') : '')
      const state = docPathStateLabel(t, line.state) + (line.percent !== undefined ? ' ' + line.percent + '%' : '')
      return name + '：' + state
    }

    /** 分解卡（照工作台 `PathStatusBreakdown`）：左腿名（wiki 带库级提示）/右状态
        文案；degraded 着琥珀（按状态而非腿着色——图谱腿 degraded 与视频腿同处理）。 */
    function PathStatusBreakdown({ t, doc }) {
      const lines = pathStatusLines(doc)
      if (!lines) return null
      return h(
        'div',
        { className: 'hrag-pathst', 'data-testid': 'path-status-breakdown' },
        lines.map((line) =>
          h(
            'div',
            { className: 'hrag-pathst-row', key: line.path, 'data-path': line.path },
            h(
              'span',
              { className: 'hrag-pathst-name' },
              t(DOC_PATH_KEYS[line.path]) + (line.path === 'wiki' ? t('doc.path.libraryHint') : ''),
            ),
            h(
              'span',
              {
                className: line.state === 'degraded' ? 'hrag-pathst-state hrag-pathst-degraded' : 'hrag-pathst-state',
                'data-state': line.state,
              },
              docPathStateLabel(t, line.state) + (line.percent !== undefined ? ' ' + line.percent + '%' : ''),
            ),
          ),
        ),
      )
    }

    /** 失败通知卡（小件批 Task 3，照工作台 `doc-failure-panel.tsx`）：底右浮卡、
        双行制（名/因）、悬停展开（感应区不含 ✕）、逐条 ✕、重试钮、不自动消退。 */
    function DocFailureCard({ t, failures, onDismiss, onDismissAll, onRetry }) {
      const [expanded, setExpanded] = React.useState(false)
      if (failures.length === 0) return null
      const multiple = failures.length > 1
      const first = failures[0]
      const entryBody = (entry) =>
        h(
          'div',
          { className: 'hrag-docfail-body' },
          h('p', { className: 'hrag-docfail-name', title: entry.name }, entry.name),
          h('p', { className: 'hrag-docfail-reason', title: entry.reason }, entry.reason),
        )
      const retryButton = (entry) =>
        h(
          'button',
          { type: 'button', className: 'hrag-docfail-retry', onClick: () => onRetry(entry.key) },
          hostIcon('IconRefreshOutlineRegular') ? h(hostIcon('IconRefreshOutlineRegular'), { size: 12 }) : null,
          t('doc.retry'),
        )
      const closeButton = (label, onClick) =>
        h(
          'button',
          { type: 'button', className: 'hrag-docfail-close', 'aria-label': label, title: label, onClick },
          hostIcon('IconCloseOutlineRegular') ? h(hostIcon('IconCloseOutlineRegular'), { size: 14 }) : '✕',
        )
      const alertIcon = hostIcon('IconWarningOutlineRegular')
      return h(
        'div',
        { className: 'hrag-docfail', 'data-testid': 'doc-failure-panel', onMouseLeave: () => setExpanded(false) },
        h(
          'div',
          { className: 'hrag-docfail-head' },
          h(
            'div',
            {
              className: 'hrag-docfail-summary',
              'data-testid': 'doc-failure-summary',
              onMouseEnter: () => {
                if (multiple) setExpanded(true)
              },
            },
            alertIcon ? h('span', { className: 'hrag-docfail-icon' }, h(alertIcon, { size: 16 })) : null,
            multiple
              ? h('span', { className: 'hrag-docfail-count', title: t('doc.err.title') }, t('doc.err.title') + '（' + failures.length + '）')
              : entryBody(first),
          ),
          !multiple && first.retryable && onRetry ? retryButton(first) : null,
          closeButton(t('doc.err.dismissAll'), onDismissAll),
        ),
        multiple && expanded
          ? h(
              'div',
              { className: 'hrag-docfail-list' },
              failures.map((entry) =>
                h(
                  'div',
                  { className: 'hrag-docfail-row', key: entry.key },
                  entryBody(entry),
                  entry.retryable && onRetry ? retryButton(entry) : null,
                  closeButton(t('doc.err.dismiss'), () => onDismiss(entry.key)),
                ),
              ),
            )
          : null,
      )
    }

    function DocsView({ t, kbId, kbOwnerId, refreshToken, onOpenChunks, dragProbe, setDocsEmpty, docFailures, onDocFailuresSnapshot, onDocFailureReport, onDocFailureDismiss, onDocFailureDismissAll }) {
      const [phase, setPhase] = React.useState('loading')
      const [docs, setDocs] = React.useState([])
      const [failure, setFailure] = React.useState(null)
      // 批量版选择集（Task 3.6，照工作台）：行复选框/全选/右键选中共享；删除目标改
      // 列表（单删＝单元素列表——工作台 deleteTargets 同构）。
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [selectedIds, setSelectedIds] = React.useState(() => new Set())
      const [dialogError, setDialogError] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [ctxMenu, setCtxMenu] = React.useState(null)
      const [colCtxMenu, setColCtxMenu] = React.useState(null)
      // 工具栏（小件批 Task 1）：检索词/排序均为会话态（照工作台 useState，不持久）。
      const [query, setQuery] = React.useState('')
      const [sort, setSort] = React.useState(DOC_SORT_DEFAULT)
      // 列偏好（doc-columns 对 Task 2）：per-kb 持久（照工作台 useDocTablePrefs——
      // kbIdRef 锁最新库，避免切换库时「用旧库偏好写新库键」的 race）。
      const [prefs, setPrefs] = React.useState(() => readDocPrefs(kbId))
      const kbIdRef = React.useRef(kbId)
      React.useEffect(() => {
        kbIdRef.current = kbId
        setPrefs(readDocPrefs(kbId))
      }, [kbId])
      React.useEffect(() => {
        writeDocPrefs(kbIdRef.current, prefs)
      }, [prefs])

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

      // 空态上报（小件批 Task 2）：拖拽放置层双态取此——非就绪（空/载/错，
      // 区域无列表）用虚线框（让九宫格透出），就绪（列表在场）用 70% 实底。
      React.useEffect(() => {
        if (setDocsEmpty) setDocsEmpty(phase !== 'ready')
      }, [phase, setDocsEmpty])

      // 失败快照上报（小件批 Task 3）：只在有效清单阶段交给壳的 fold 状态机——首载前
      // 的空数组不得预标记，否则首屏已有的 failed 会被当转变播报（「首屏不补播」语义）。
      React.useEffect(() => {
        if ((phase === 'ready' || phase === 'empty') && onDocFailuresSnapshot) onDocFailuresSnapshot(docs)
      }, [docs, phase])

      // 选择集随清单修剪（工作台只在删除后移除；插件 3s 自刷——被他处删除的行若留在
      // 选择集，会挂在「已选 N」里却打不中行）。
      React.useEffect(() => {
        setSelectedIds((current) => {
          if (current.size === 0) return current
          const alive = new Set(docs.map((doc) => doc.id))
          const next = new Set()
          current.forEach((id) => {
            if (alive.has(id)) next.add(id)
          })
          return next.size === current.size ? current : next
        })
      }, [docs])

      // 可见集（过滤＋排序）与选择态派生（Task 3.6，照工作台）：全选/缩进/联合出题
      // 判据随可见集与选择集现算。
      const visibleDocs = docsSort(docsFilter(docs, query), sort.key, sort.direction)
      const visibleIds = visibleDocs.map((doc) => doc.id)
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
      const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id))
      const allSelectedReady =
        selectedIds.size > 0 &&
        [...selectedIds].every((id) => {
          const doc = docs.find((item) => item.id === id)
          return Boolean(doc && doc.status === 'ready')
        })
      const toggleSelect = (id, checked) => {
        setSelectedIds((current) => {
          const next = new Set(current)
          if (checked) next.add(id)
          else next.delete(id)
          return next
        })
      }
      const toggleSelectAll = () => setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds))

      // A④ 快捷出题（照工作台 page.tsx:452-466）：单篇 count=1、合并进暂存审核；
      // 工作台 enqueued=success／already_running=info 两档同文案，插件总线无 info 档、合一。
      const generateQuestion = (doc) => {
        callOp('triggerSynthesis', { kb_id: kbId, body: { doc_ids: [doc.id], count: 1 } })
          .then(() => showToast(t('ev.syn.generating')))
          .catch((error) => showToast(errorDetail(error), { error: true }))
      }

      // 批量快捷出题（Task 3.6，照工作台）：选中集联合出一条（合并进待审候选）；
      // 就绪门槛在菜单项层（allSelectedReady——任一篇未就绪后端整批 409）。
      const generateQuestionBatch = () => {
        callOp('triggerSynthesis', { kb_id: kbId, body: { doc_ids: [...selectedIds], count: 1 } })
          .then(() => showToast(t('ev.syn.generating')))
          .catch((error) => showToast(errorDetail(error), { error: true }))
      }

      const retry = (doc) => {
        setBusy(true)
        callOp('retryDocument', { kb_id: kbId, doc_id: doc.id })
          .then(() => {
            setBusy(false)
            showToast(t('doc.retrySubmitted'))
            load()
          })
          .catch((error) => {
            setBusy(false)
            // 重试请求失败（照工作台 page：状态仍停在 failed，hook 不会重新提醒）——
            // 收编进同一面板，不走 toast。
            if (onDocFailureReport) onDocFailureReport(doc.name, errorDetail(error))
          })
      }

      // 删除确认（Task 3.6，照工作台 deleteTargets 语义）：单删＝单元素列表；批量走
      // allSettled 逐删——部分失败时弹层收窄为失败集（重按只重试失败项）。
      const confirmDelete = () => {
        if (!deleteTargets || deleteTargets.length === 0) return
        const targets = deleteTargets
        setBusy(true)
        setDialogError(null)
        Promise.allSettled(targets.map((id) => callOp('deleteDocument', { kb_id: kbId, doc_id: id }))).then((results) => {
          setBusy(false)
          const removed = []
          const failed = []
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') removed.push(targets[index])
            else failed.push(targets[index])
          })
          if (removed.length > 0) {
            setSelectedIds((current) => {
              const next = new Set(current)
              removed.forEach((id) => next.delete(id))
              return next
            })
          }
          load()
          if (failed.length > 0) {
            const first = results.find((result) => result.status === 'rejected')
            setDialogError(errorDetail(first.reason))
            setDeleteTargets(failed)
          } else {
            setDeleteTargets(null)
          }
        })
      }

      // 列偏好动作（Task 2）：显隐互切／全部显示（仅清 hidden）；格式/单位档随表头菜单。
      const toggleColumn = (id) => {
        setPrefs((current) => ({
          ...current,
          hidden:
            current.hidden.indexOf(id) === -1
              ? [...current.hidden, id]
              : current.hidden.filter((entry) => entry !== id),
        }))
      }
      const showAllColumns = () => setPrefs((current) => ({ ...current, hidden: [] }))
      const handleColumnsMenu = (id) => {
        if (id === 'col-show-all') {
          showAllColumns()
          return
        }
        if (id.indexOf('col-') === 0) toggleColumn(id.slice(4))
      }
      // 行 ⋯ 与右键两入口（Task 3.6 分流）：⋯＝行内动作（查看切片/下载/重试/删除）；
      // 右键＝选择态菜单（单行态带生成考题＋取消选择；批量态带联合出题＋删除所选）。
      const handleRowMenu = (doc, id) => {
        if (id === 'open-chunks') {
          if (onOpenChunks) onOpenChunks(doc)
          return
        }
        if (id === 'download') {
          downloadDocumentFile(kbId, doc).catch((error) => showToast(errorDetail(error), { error: true }))
          return
        }
        if (id === 'gen-question') {
          generateQuestion(doc)
          return
        }
        if (id === 'gen-question-batch') {
          generateQuestionBatch()
          return
        }
        if (id === 'retry') {
          retry(doc)
          return
        }
        if (id === 'cancel-select') {
          setSelectedIds(new Set())
          return
        }
        if (id === 'delete') {
          setDialogError(null)
          setDeleteTargets([doc.id])
          return
        }
        if (id === 'delete-selected') {
          setDialogError(null)
          setDeleteTargets([...selectedIds])
        }
      }

      // 工具行（小件批 Task 2，照工作台 h-11 稳定容器常驻）：空态与就绪态共用；
      // 加载/错误态维持全屏状态页（插件既有词汇）。
      const docbar = h(
        'div',
        { className: 'hrag-docbar hrag-tabbar' },
        h(
          'div',
          { className: 'hrag-docsearch' },
          h(HostInput, {
            className: 'hrag-docsearch-field',
            type: 'text',
            // icon 仅宿主 Input 接受（回退到原生 input 时传元素会落成非法属性）。
            icon: hostPrimitives && hostPrimitives.Input ? dshSearchIcon() : undefined,
            value: query,
            placeholder: t('doc.search'),
            'aria-label': t('doc.search'),
            // 检索即清选择集（照工作台 updateQuery）：批量删除不得命中看不见的行。
            onChange: (event) => {
              setQuery(event.target.value)
              setSelectedIds(new Set())
            },
          }),
          query
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'hrag-docsearch-clear',
                  'aria-label': t('doc.searchClear'),
                  title: t('doc.searchClear'),
                  onClick: () => {
                    setQuery('')
                    setSelectedIds(new Set())
                  },
                },
                hostIcon('IconCloseOutlineRegular') ? h(hostIcon('IconCloseOutlineRegular'), {}) : '✕',
              )
            : null,
        ),
        h(DshMenu, {
          title: t('doc.sort'),
          align: 'end',
          className: 'hrag-iconbare',
          trigger: dshChevronsUpDownIcon(),
          items: [
            { type: 'label', id: 'sort-label', text: t('doc.sort') },
            ...DOC_SORT_OPTIONS.map((option) => ({
              id: 'sort-key-' + option.key,
              label: t(option.labelKey),
              icon: sort.key === option.key ? dshCheckIcon() : null,
            })),
            { type: 'separator', id: 'sort-sep' },
            ...[
              { id: 'sort-dir-asc', label: t('doc.sortAsc'), direction: 'asc' },
              { id: 'sort-dir-desc', label: t('doc.sortDesc'), direction: 'desc' },
            ].map((entry) => ({
              id: entry.id,
              label: entry.label,
              icon: sort.direction === entry.direction ? dshCheckIcon() : null,
            })),
          ],
          onSelect: (id) => {
            if (id.indexOf('sort-key-') === 0) {
              setSort((current) => ({ ...current, key: id.slice('sort-key-'.length) }))
            } else if (id.indexOf('sort-dir-') === 0) {
              const direction = id.slice('sort-dir-'.length)
              setSort((current) => ({ ...current, direction }))
            }
          },
        }),
      )

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
        // 空态也挂底栏统计行（工作台同款：统计行常驻，空库显「文档 0 · 切片 0 · 0 B」）；
        // .hrag-docsbody > .hrag-docempty 吃 flex:1（CSS 侧）居中九宫格。
        body = h('div', { className: 'hrag-docsbody' }, docbar, h(DocsEmptyState, { t, probe: dragProbe || null }), docStatsRow(t, []))
      } else {
        // 文档表（doc-columns 对 Task 1/2/3，照工作台 document-panel 表形态）：吸顶
        // 表头＋按偏好显隐列；行点开切片抽屉、行尾 ⋯/右键＝行菜单、表头 chevron/右键
        // /「列」总控＝列设置；底栏统计行＝工作台 document-stats-row 同构。10-16 他
        // 复测修订：列宽自适应（去 min-w 强制横滚——面板内六列全显，超窄才横滚）。
        const colVisible = (id) => prefs.hidden.indexOf(id) === -1
        const columnMenuItems = (columnId) => {
          const items = []
          if (columnId === 'createdAt') {
            items.push({ type: 'label', id: 'fmt-label', text: t('doc.colTimeFormat') })
            items.push({ id: 'fmt-absolute', label: t('doc.colAbsolute'), icon: prefs.timeFormat === 'absolute' ? dshCheckIcon() : null })
            items.push({ id: 'fmt-relative', label: t('doc.colRelative'), icon: prefs.timeFormat === 'relative' ? dshCheckIcon() : null })
            items.push({ type: 'separator', id: 'fmt-sep' })
          }
          if (columnId === 'size') {
            items.push({ type: 'label', id: 'unit-label', text: t('doc.colSizeUnit') })
            items.push({ id: 'unit-kb', label: 'KB', icon: prefs.sizeUnit === 'kb' ? dshCheckIcon() : null })
            items.push({ id: 'unit-mb', label: 'MB', icon: prefs.sizeUnit === 'mb' ? dshCheckIcon() : null })
            items.push({ type: 'separator', id: 'unit-sep' })
          }
          items.push({ id: 'col-hide', label: t('doc.colHide'), icon: dshEyeOffIcon() })
          return items
        }
        const handleColumnMenu = (columnId, id) => {
          if (id === 'fmt-absolute' || id === 'fmt-relative') {
            setPrefs((current) => ({ ...current, timeFormat: id.slice(4) }))
          } else if (id === 'unit-kb' || id === 'unit-mb') {
            setPrefs((current) => ({ ...current, sizeUnit: id.slice(5) }))
          } else if (id === 'col-hide') {
            toggleColumn(columnId)
          }
        }
        const columnHeader = (columnId, label) =>
          h(
            'th',
            {
              scope: 'col',
              className:
                'hrag-docth-' +
                columnId +
                (columnId === 'createdAt' && prefs.timeFormat === 'relative' ? ' hrag-docth-createdAt-rel' : ''),
            },
            h(
              'div',
              { className: 'hrag-doccolhead' },
              h('span', null, label),
              h(DshMenu, {
                title: label + ' ' + t('doc.colMenu'),
                className: 'hrag-doccolchev',
                trigger: dshChevronDownIcon(),
                items: columnMenuItems(columnId),
                onSelect: (id) => handleColumnMenu(columnId, id),
              }),
            ),
          )
        body = h(
          'div',
          { className: 'hrag-docsbody' },
          docbar,
          h(
            'div',
            { className: 'hrag-docscroll' },
            visibleDocs.length === 0
              ? h('div', { className: 'hrag-docnomatch' }, t('doc.noMatch'))
              : h(
                  'table',
                  { className: 'hrag-doctable' + (selectedIds.size > 0 ? ' hrag-doctable-selecting' : '') },
                  h(
                    'thead',
                    null,
                    h(
                      'tr',
                      {
                        onContextMenu: (event) => {
                          event.preventDefault()
                          setColCtxMenu({ x: event.clientX, y: event.clientY })
                        },
                      },
                      // 复选框列（Task 3.6，照工作台 w-8）：全选/缩进随可见集。
                      h(
                        'th',
                        { scope: 'col', className: 'hrag-docth-check' },
                        h('input', {
                          type: 'checkbox',
                          className: 'hrag-ev-check',
                          'aria-label': t('doc.selectAll'),
                          checked: allVisibleSelected,
                          ref: (element) => {
                            if (element) element.indeterminate = !allVisibleSelected && someVisibleSelected
                          },
                          onChange: toggleSelectAll,
                        }),
                      ),
                      h('th', { scope: 'col' }, t('doc.thName')),
                      colVisible('status') ? columnHeader('status', t('doc.thStatus')) : null,
                      colVisible('uploader') ? columnHeader('uploader', t('doc.thUploader')) : null,
                      colVisible('createdAt') ? columnHeader('createdAt', t('doc.thTime')) : null,
                      colVisible('size') ? columnHeader('size', t('doc.thSize')) : null,
                      colVisible('chunks') ? columnHeader('chunks', t('doc.thChunks')) : null,
                      h(
                        'th',
                        { scope: 'col', className: 'hrag-docops' },
                        h(
                          'div',
                          { className: 'hrag-docopscell' },
                          h(DshMenu, {
                            title: t('doc.columns'),
                            align: 'end',
                            className: 'hrag-doccolbtn',
                            trigger: dshColumnsIcon(),
                            items: docColumnsMenuItems(t, prefs),
                            onSelect: handleColumnsMenu,
                          }),
                        ),
                      ),
                    ),
                  ),
                  h(
                    'tbody',
                    null,
                    visibleDocs.map((doc) => {
            const degraded = isDegraded(doc)
            const statusKey = DOC_STATUS_KEYS[doc.status]
            let meta = statusKey ? t(statusKey) : String(doc.status)
            if (doc.status === 'indexing') meta += ' ' + String(doc.progress_percent) + '%'
            if (degraded) meta += ' · ' + t('doc.degraded')
            // 状态悬停（小件批 Task 4；10-18 他点名修正）：凡有 path_status 的行
            // （含 failed）一律挂宿主 Tooltip 出六腿分解——失败行也要看各阶段状态；
            // 无 path_status 的老行回退原生 title（分类错误文案）。
            const statusClass = doc.status === 'failed' ? 'hrag-docrow-status hrag-docrow-status-failed' : 'hrag-docrow-status'
            // 状态点（10-16 他截图对照补，照工作台 DocumentStatusCell）：6px 悬挂在
            // 文字左缘外 10px（点 6px＋间隙 4px；与 td px-2 配对，文字左缘同表头线）。
            const dotNode = h('span', { className: 'hrag-docdot ' + docDotClass(doc.status), 'aria-hidden': 'true' })
            // 状态文本吃省略号（fixed 布局窄档：长态「就绪 · 部分降级」不撑列；点在外，
            // 不被文本裁剪面影响）。
            const metaNode = h('span', { className: 'hrag-docrow-statustext' }, meta)
            const pathLines = pathStatusLines(doc)
            let statusNode
            if (!pathLines) {
              statusNode = h(
                'span',
                { className: statusClass, title: doc.error ? t('doc.err.' + classifyDocError(doc.error)) : undefined },
                dotNode,
                metaNode,
              )
            } else if (HostTooltip) {
              statusNode = h(
                HostTooltip,
                { label: h(PathStatusBreakdown, { t, doc }), side: 'top', delayMs: 150, portal: true },
                h('span', { className: statusClass }, dotNode, metaNode),
              )
            } else {
              statusNode = h(
                'span',
                { className: statusClass, title: pathLines.map((line) => docPathLineText(t, line)).join('\n') },
                dotNode,
                metaNode,
              )
            }
            const rowItems = docRowMenuItems(t, doc, { degraded, busy })
            const isSelected = selectedIds.has(doc.id)
            return h(
              'tr',
              {
                className: 'hrag-docrow' + (isSelected ? ' hrag-docrow-selected' : ''),
                key: String(doc.id),
                onClick: () => {
                  if (onOpenChunks) onOpenChunks(doc)
                },
                // 右键即选中（照工作台文件管理器惯例）：未选中的行改为单选它；已选中的
                // 行保留批量上下文。
                onContextMenu: (event) => {
                  event.preventDefault()
                  setSelectedIds((current) => (current.has(doc.id) ? current : new Set([doc.id])))
                  setCtxMenu({ x: event.clientX, y: event.clientY, doc })
                },
              },
              h(
                'td',
                { onClick: (event) => event.stopPropagation() },
                h('input', {
                  type: 'checkbox',
                  className: 'hrag-ev-check',
                  'aria-label': t('doc.selectDocument') + ': ' + String(doc.name),
                  checked: isSelected,
                  onChange: (event) => toggleSelect(doc.id, event.target.checked),
                }),
              ),
              h(
                'td',
                null,
                h(
                  'div',
                  { className: 'hrag-docnamecell' },
                  h(FileTypeBadge, { fileName: String(doc.name), className: 'hrag-docrow-ftype' }),
                  h('span', { className: 'hrag-docrow-name', title: String(doc.name) }, String(doc.name)),
                ),
              ),
              colVisible('status') ? h('td', { className: 'hrag-doccell hrag-doccell-status' }, statusNode) : null,
              colVisible('uploader')
                ? h(
                    'td',
                    { className: 'hrag-doccell', title: doc.uploader_id == null ? undefined : String(doc.uploader_id) },
                    doc.uploader_id === kbOwnerId ? t('doc.uploaderMe') : doc.uploader_id,
                  )
                : null,
              colVisible('createdAt')
                ? h(
                    'td',
                    { className: 'hrag-doccell hrag-doccell-time' },
                    prefs.timeFormat === 'relative' ? docFmtRelative(doc.created_at) : docFmtTimestamp(doc.created_at),
                  )
                : null,
              colVisible('size')
                ? h(
                    'td',
                    { className: 'hrag-doccell hrag-doccell-right' },
                    HostTooltip
                      ? h(
                          HostTooltip,
                          {
                            label: Number(doc.size_bytes || 0).toLocaleString() + ' B',
                            side: 'top',
                            delayMs: 150,
                            portal: true,
                          },
                          h('span', null, (prefs.sizeUnit === 'mb' ? docFmtMb(doc.size_bytes) + ' MB' : docFmtKb(doc.size_bytes) + ' KB')),
                        )
                      : h(
                          'span',
                          { title: Number(doc.size_bytes || 0).toLocaleString() + ' B' },
                          prefs.sizeUnit === 'mb' ? docFmtMb(doc.size_bytes) + ' MB' : docFmtKb(doc.size_bytes) + ' KB',
                        ),
                  )
                : null,
              colVisible('chunks')
                ? h(
                    'td',
                    { className: 'hrag-doccell hrag-doccell-right' },
                    doc.chunk_count == null ? '—' : String(doc.chunk_count),
                  )
                : null,
              h(
                'td',
                { className: 'hrag-docops', onClick: (event) => event.stopPropagation() },
                h(
                  'div',
                  { className: 'hrag-docopscell' },
                  h(DshMenu, {
                    title: t('menu.more'),
                    align: 'end',
                    className: 'hrag-docrow-more',
                    trigger: dshEllipsisIcon(),
                    items: rowItems,
                    onSelect: (id) => handleRowMenu(doc, id),
                  }),
                ),
              ),
            )
          }),
                  ),
                ),
          ),
          docStatsRow(t, docs),
        )
      }

      return h(
        React.Fragment,
        null,
        body,
        docFailures && docFailures.length > 0
          ? h(DocFailureCard, {
              t,
              failures: docFailures,
              onDismiss: onDocFailureDismiss,
              onDismissAll: onDocFailureDismissAll,
              onRetry: (key) => {
                const doc = docs.find((item) => item.id === key)
                if (doc) retry(doc)
              },
            })
          : null,
        deleteTargets && deleteTargets.length > 0
          ? h(ConfirmDialog, {
              t,
              title: t('doc.deleteTitle'),
              description: t('doc.deleteDescription'),
              error: dialogError,
              busy,
              onCancel: () => setDeleteTargets(null),
              onConfirm: confirmDelete,
            })
          : null,
        ctxMenu
          ? h(DocContextMenu, {
              t,
              x: ctxMenu.x,
              y: ctxMenu.y,
              items: docContextMenuItems(t, ctxMenu.doc, {
                degraded: isDegraded(ctxMenu.doc),
                canGenerate: canGenerateQuestion(ctxMenu.doc),
                busy,
                selectedCount: selectedIds.has(ctxMenu.doc.id) ? selectedIds.size : 0,
                allSelectedReady,
              }),
              onSelect: (id) => handleRowMenu(ctxMenu.doc, id),
              onClose: () => setCtxMenu(null),
            })
          : null,
        colCtxMenu
          ? h(DocContextMenu, {
              t,
              x: colCtxMenu.x,
              y: colCtxMenu.y,
              items: docColumnsMenuItems(t, prefs),
              onSelect: handleColumnsMenu,
              onClose: () => setColCtxMenu(null),
            })
          : null,
      )
    }

    // ── 评测视图（Task 8）────────────────────────────────────────────────────

    /** 终止评测两步 inline 确认的回退窗口（照工作台 CANCEL_CONFIRM_MS）。 */
    const EVAL_CANCEL_CONFIRM_MS = 3000

    /** 评测域取数（enabled 门控；pollWhile 判真时 3s 续拍——照工作台
        refetchInterval 语义；轮询判定经 ref 取最新，避免 identity 漂移重启）。 */
    function useEvalCall(kbId, enabled, op, params, pollWhile) {
      const [data, setData] = React.useState(null)
      const [failure, setFailure] = React.useState(null)
      const [tick, setTick] = React.useState(0)
      const refresh = React.useCallback(() => setTick((value) => value + 1), [])
      const pollRef = React.useRef(pollWhile)
      pollRef.current = pollWhile
      const paramsKey = params ? JSON.stringify(params) : ''
      React.useEffect(() => {
        if (!enabled) return undefined
        let cancelled = false
        let timer = null
        const load = () => {
          const args = Object.assign({ kb_id: kbId }, params || {})
          callOp(op, args)
            .then((payload) => {
              if (cancelled) return
              setData(payload)
              setFailure(null)
              if (pollRef.current && pollRef.current(payload)) {
                timer = window.setTimeout(load, EVAL_RUNS_POLL_MS)
              }
            })
            .catch((error) => {
              if (cancelled) return
              setFailure(error)
            })
        }
        load()
        return () => {
          cancelled = true
          if (timer !== null) window.clearTimeout(timer)
        }
      }, [enabled, kbId, op, paramsKey, tick])
      return { data, failure, refresh, setData }
    }

    /** 运行列表查询（轮询源）：in_flight 为真 3s 续拍；kick() 开 12s 强制轮询窗
        ——触发→后端标志翻转之间的缝隙靠它接上（工作台乐观置位的等价物；
        插件无共享查询缓存，以强制窗代替）。 */
    function useEvalRunsQuery(kbId, enabled) {
      const [data, setData] = React.useState(null)
      const [failure, setFailure] = React.useState(null)
      const [tick, setTick] = React.useState(0)
      const forceUntilRef = React.useRef(0)
      const refresh = React.useCallback(() => setTick((value) => value + 1), [])
      const kick = React.useCallback(() => {
        forceUntilRef.current = Date.now() + 12000
        setTick((value) => value + 1)
      }, [])
      React.useEffect(() => {
        if (!enabled) return undefined
        let cancelled = false
        let timer = null
        const load = () => {
          callOp('listEvalRuns', { kb_id: kbId })
            .then((payload) => {
              if (cancelled) return
              setData(payload)
              setFailure(null)
              if ((payload && payload.in_flight) || Date.now() < forceUntilRef.current) {
                timer = window.setTimeout(load, EVAL_RUNS_POLL_MS)
              }
            })
            .catch((error) => {
              if (cancelled) return
              setFailure(error)
            })
        }
        load()
        return () => {
          cancelled = true
          if (timer !== null) window.clearTimeout(timer)
        }
      }, [enabled, kbId, tick])
      return { data, failure, refresh, setData, kick }
    }

    /** 轻量弹层（评测工具栏档位/行菜单共用）：按钮＋**fixed 定位** popover——
        逃脱卡/滚动容器的 overflow 裁剪（2026-10-13 报「弹层被容器截断」）；
        开拍测位：默认朝下、下方空间不足且上方更宽裕时朝上；背板点收；
        render(close) 返回菜单子节点。传 icon 时触发器为图标钮（title 承载语义）。 */
    function EvalMenu({ className, label, icon, title, align, render }) {
      const [open, setOpen] = React.useState(false)
      const [pos, setPos] = React.useState(null)
      const btnRef = React.useRef(null)
      const toggle = () => {
        if (open) {
          setOpen(false)
          return
        }
        const el = btnRef.current
        if (el) {
          const rect = el.getBoundingClientRect()
          const spaceBelow = window.innerHeight - rect.bottom
          const openUp = spaceBelow < 180 && rect.top > spaceBelow
          setPos({
            top: openUp ? null : rect.bottom + 4,
            bottom: openUp ? window.innerHeight - rect.top + 4 : null,
            left: rect.left,
            right: window.innerWidth - rect.right,
          })
        }
        setOpen(true)
      }
      return h(
        'div',
        { className: 'hrag-ev-menuwrap' + (className ? ' ' + className : '') },
        h(
          'button',
          {
            type: 'button',
            ref: btnRef,
            className: icon ? 'hrag-ev-iconbtn' : 'hrag-ev-menu-btn',
            'aria-label': title || label,
            title: title || label,
            'aria-expanded': open,
            onClick: toggle,
          },
          icon || label,
        ),
        open
          ? h(
              React.Fragment,
              null,
              h('div', { className: 'hrag-ev-menu-backdrop', onMouseDown: () => setOpen(false) }),
              h(
                'div',
                {
                  className: 'hrag-ev-menu',
                  style: pos
                    ? {
                        top: pos.top !== null ? pos.top + 'px' : 'auto',
                        bottom: pos.bottom !== null ? pos.bottom + 'px' : 'auto',
                        left: align === 'end' ? 'auto' : pos.left + 'px',
                        right: align === 'end' ? pos.right + 'px' : 'auto',
                      }
                    : undefined,
                },
                render(() => setOpen(false)),
              ),
            )
          : null,
      )
    }

    /** 弹层菜单项（可选前置图标；选中态尾置 ✓；danger 红字）。 */
    function EvalMenuItem({ danger, disabled, selected, icon, onSelect, children }) {
      return h(
        'button',
        {
          type: 'button',
          className:
            'hrag-ev-menu-item' +
            (danger ? ' hrag-ev-menu-item-danger' : '') +
            (selected ? ' hrag-ev-menu-item-on' : ''),
          disabled,
          onClick: () => onSelect && onSelect(),
        },
        icon ? h('span', { className: 'hrag-ev-menu-item-icon' }, icon) : null,
        children,
        selected ? h('span', { className: 'hrag-ev-menu-check' }, '✓') : null,
      )
    }

    /** 菜单图标：DSH 真值原路径（16 视窗・stroke 1・currentColor——menu-batch
        Task 0 自宿主 web bundle 提取，证据 hrag-probe/dsh-icons-extract.json）。 */
    function dshMenuIcon(paths) {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', strokeWidth: 1, 'aria-hidden': 'true' },
        paths.map((path, index) =>
          h('path', {
            key: index,
            d: path.d,
            fill: path.fill ? 'currentColor' : 'none',
            stroke: path.fill ? 'none' : 'currentColor',
          }),
        ),
      )
    }
    /** Task 6：图标直用宿主件（缺件回退手刻路径——旧真值原路径保留为回退面）。 */
    const dshIconOr = (name, fallback) => {
      const Icon = hostIcon(name)
      return () => (Icon ? h(Icon, {}) : fallback())
    }
    const dshEllipsisIcon = dshIconOr('IconEllipsisOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M3 9C3.55228 9 4 8.55228 4 8C4 7.44772 3.55228 7 3 7C2.44772 7 2 7.44772 2 8C2 8.55228 2.44772 9 3 9Z', fill: true },
        { d: 'M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z', fill: true },
        { d: 'M13 9C13.5523 9 14 8.55228 14 8C14 7.44772 13.5523 7 13 7C12.4477 7 12 7.44772 12 8C12 8.55228 12.4477 9 13 9Z', fill: true },
      ]),
    )
    const dshRefreshIcon = dshIconOr('IconRefreshOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1' },
        { d: 'M14.4999 1.5V5.1H10.8999' },
      ]),
    )
    const dshEditIcon = dshIconOr('IconEditOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z', fill: true },
        { d: 'M7.7849 8.23878L13.888 2.13574' },
      ]),
    )
    const dshTrashIcon = dshIconOr('IconTrashOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M1.28149 3.88831H14.7187' },
        { d: 'M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842 2.47962V3.88833' },
        { d: 'M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502 12.8064 13.2943L13.4266 3.88831' },
        { d: 'M6.44946 6.98926V11.1238' },
        { d: 'M9.55054 6.98926V11.1238' },
      ]),
    )
    const dshSettingsIcon = dshIconOr('IconSettingsOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M8 9.75012C8.9665 9.75012 9.75 8.96662 9.75 8.00012C9.75 7.03362 8.9665 6.25012 8 6.25012C7.0335 6.25012 6.25 7.03362 6.25 8.00012C6.25 8.96662 7.0335 9.75012 8 9.75012Z' },
        { d: 'M13.0107 7.79377C12.9505 7.89401 12.9205 7.94413 12.9205 7.99951C12.9205 8.0549 12.9505 8.10502 13.0106 8.20528L13.9849 9.83006C14.045 9.93029 14.0751 9.9804 14.0751 10.0358C14.0751 10.0911 14.045 10.1413 13.9849 10.2415L13.0037 11.8777C12.9468 11.9726 12.9184 12.0201 12.8725 12.0461C12.8267 12.072 12.7713 12.072 12.6607 12.072H10.6704C10.5598 12.072 10.5045 12.072 10.4586 12.098C10.4128 12.1239 10.3843 12.1714 10.3274 12.2662L9.33825 13.9142C9.28133 14.009 9.25287 14.0564 9.20703 14.0823C9.16118 14.1083 9.10588 14.1083 8.99529 14.1083H7.00486C6.89426 14.1083 6.83896 14.1083 6.79312 14.0823C6.74727 14.0564 6.71881 14.009 6.6619 13.9142L5.67273 12.2662C5.61581 12.1714 5.58735 12.1239 5.54151 12.098C5.49566 12.072 5.44036 12.072 5.32977 12.072H3.33945C3.2288 12.072 3.17347 12.072 3.12761 12.0461C3.08176 12.0201 3.0533 11.9726 2.9964 11.8777L2.0152 10.2415C1.9551 10.1413 1.92505 10.0911 1.92505 10.0358C1.92505 9.9804 1.9551 9.93029 2.0152 9.83006L2.98951 8.20528C3.04963 8.10502 3.07969 8.0549 3.07969 7.99951C3.07968 7.94413 3.04961 7.89401 2.98946 7.79377L2.01529 6.17011C1.95514 6.06987 1.92507 6.01975 1.92507 5.96437C1.92506 5.90899 1.95512 5.85886 2.01524 5.7586L2.9964 4.1224C3.0533 4.0275 3.08176 3.98005 3.12761 3.95408C3.17347 3.92811 3.2288 3.92811 3.33945 3.92811H5.32977C5.44036 3.92811 5.49566 3.92811 5.54151 3.90216C5.58735 3.87621 5.61581 3.82879 5.67273 3.73397L6.6619 2.08599C6.71881 1.99116 6.74727 1.94375 6.79312 1.9178C6.83896 1.89185 6.89426 1.89185 7.00486 1.89185H8.99529C9.10588 1.89185 9.16118 1.89185 9.20703 1.9178C9.25287 1.94375 9.28133 1.99116 9.33825 2.08599L10.3274 3.73397C10.3843 3.82879 10.4128 3.87621 10.4586 3.90216C10.5045 3.92811 10.5598 3.92811 10.6704 3.92811H12.6607C12.7713 3.92811 12.8267 3.92811 12.8725 3.95408C12.9184 3.98005 12.9468 4.0275 13.0037 4.1224L13.9849 5.7586C14.045 5.85886 14.0751 5.90899 14.0751 5.96437C14.0751 6.01975 14.045 6.06987 13.9849 6.17011L13.0107 7.79377Z' },
      ]),
    )
    const dshPlusIcon = dshIconOr('IconPlusOutlineRegular', () => dshMenuIcon([{ d: 'M8 2V14' }, { d: 'M2 8H14' }]))
    const dshSparkleIcon = dshIconOr('IconSparkleRegular', () =>
      dshMenuIcon([{ d: 'M8 1.6L9.65 6.35L14.4 8L9.65 9.65L8 14.4L6.35 9.65L1.6 8L6.35 6.35Z' }]),
    )
    // 关闭（X）——批量菜单「取消选择」用（宿主 IconCloseOutlineRegular；回退＝交叉两笔）。
    const dshCloseIcon = dshIconOr('IconCloseOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M3.5 3.5L12.5 12.5' },
        { d: 'M12.5 3.5L3.5 12.5' },
      ]),
    )

    /** 知识库标题下拉的 chevron 与菜单选中勾——Task 6 起直用宿主件（旧原路径为回退）；
        小件批 Task 5 起上/下 chevron 还供抽屉逐片跳转钮（回退＝下行镜像）。 */
    const dshChevronUpIcon = dshIconOr('IconChevronUpOutlineRegular', () =>
      dshMenuIcon([{ d: 'M4 10L7.29289 6.70711C7.68342 6.31658 8.31658 6.31658 8.70711 6.70711L12 10' }]),
    )
    const dshChevronDownIcon = dshIconOr('IconChevronDownOutlineRegular', () =>
      dshMenuIcon([{ d: 'M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6' }]),
    )
    const dshCheckIcon = dshIconOr('IconCheckOutlineRegular', () =>
      dshMenuIcon([{ d: 'M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4' }]),
    )
    /** 搜索图标（六 tab 统一搜索框）/双箭头排序（回退路径＝宿主 primitives 提取真值）。 */
    const dshSearchIcon = dshIconOr('IconSearchOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M6.58727 11.8586C9.55061 11.8586 11.9529 9.45637 11.9529 6.49304C11.9529 3.5297 9.55061 1.12744 6.58727 1.12744C3.62394 1.12744 1.22168 3.5297 1.22168 6.49304C1.22168 9.45637 3.62394 11.8586 6.58727 11.8586Z' },
        { d: 'M10.2991 10.3933L14.7783 14.8725' },
      ]),
    )
    const dshChevronsUpDownIcon = dshIconOr('IconChevronsUpDownOutlineRegular', () =>
      dshMenuIcon([
        { d: 'M5.1 6L8 3.1L10.9 6' },
        { d: 'M5.1 10L8 12.9L10.9 10' },
      ]),
    )
    /** 「在百科 tab 中查看」导航图标（小件批 Task 8）：宿主最近邻 IconRightUp（右上
        箭头＝跳转语义）；缺件回退工作台原形 lucide ExternalLink。 */
    const dshRightUpIcon = dshIconOr('IconRightUpOutlineRegular', () =>
      lucideMenuIcon(['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']),
    )
    /** 行 ⋯ 菜单与列设置图标（doc-columns 对 Task 3）：宿主件优先、缺件回退工作台
        同款 lucide 原形（行 ⋯＝FileText/Download/RotateCcw；列设置＝EyeOff/Eye/Columns）。 */
    const dshTextFileIcon = dshIconOr('IconFileTextOutlineRegular', () =>
      lucideMenuIcon(['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M10 9H8', 'M16 13H8', 'M16 17H8']),
    )
    const dshDownloadIcon = dshIconOr('IconDownloadOutlineRegular', () =>
      lucideMenuIcon(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3']),
    )
    const dshRetryIcon = dshIconOr('IconRotateCcwOutlineRegular', () =>
      lucideMenuIcon(['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5']),
    )
    const dshEyeOffIcon = dshIconOr('IconEyeOffOutlineRegular', () =>
      lucideMenuIcon(['M9.88 9.88a3 3 0 1 0 4.24 4.24', 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68', 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61', 'M2 2l20 20']),
    )
    const dshEyeIcon = dshIconOr('IconEyeOutlineRegular', () =>
      lucideMenuIcon(['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z']),
    )
    /** 原始文本视图图标（②档乙对 Task 2）：宿主最近邻 IconInspectOutline＝CodeBrackets
        真值（`</>`）；缺件回退工作台同款 lucide Code2。 */
    const dshCodeIcon = dshIconOr('IconInspectOutlineRegular', () =>
      lucideMenuIcon(['m18 16 4-4-4-4', 'm6 8-4 4 4 4', 'm14.5 4-5 16']),
    )
    /** 视频镜头条图标（②档乙对 Task 3）：复制＝宿主 IconCopyOutline；缺帧＝宿主无件，
        直用工作台同款 lucide ImageOff 原形（六形全量）。 */
    const dshCopyIcon = dshIconOr('IconCopyOutlineRegular', () =>
      lucideMenuIcon([
        'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z',
        'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
      ]),
    )
    const dshImageOffIcon = dshIconOr('IconImageOffOutlineRegular', () =>
      lucideMenuIcon([
        'M2 2L22 22',
        'M10.41 10.41a2 2 0 1 1-2.83-2.83',
        'M13.5 13.5L6 21',
        'M18 12L21 15',
        'M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59',
        'M21 15V5a2 2 0 0 0-2-2H9',
      ]),
    )
    const dshColumnsIcon = dshIconOr('IconColumnsOutlineRegular', () =>
      lucideMenuIcon(['M3 3h18v18H3z', 'M9 3v18', 'M15 3v18']),
    )

    /** 菜单图标：工作台同款（lucide 24 视窗・stroke 2・圆头——宿主无对应件档，
        spec M3「相同语言」）。 */
    function lucideMenuIcon(paths) {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        paths.map((d, index) => h('path', { key: index, d, stroke: 'currentColor' })),
      )
    }
    function lucideUploadIcon() {
      return lucideMenuIcon(['M12 3v12', 'm17 8-5-5-5 5', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'])
    }
    function lucideBookOpenIcon() {
      return lucideMenuIcon([
        'M12 7v14',
        'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
      ])
    }
    function lucideRefreshCwIcon() {
      return lucideMenuIcon([
        'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8',
        'M21 3v5h-5',
        'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16',
        'M8 16H3v5',
      ])
    }

    /** 框内下拉触发器 chevron：工作台同款（lucide ChevronDown size-4 opacity-50——
        维度档位与 ASR 候选两处逐字对照 functional-models-view）。与菜单行图标
        （lucideMenuIcon 14px）分开：这是值域控件的件，尺寸/透明度跟工作台走。
        百科两容器的收起箭头也用它：传 1（不再叠 50%），颜色随头的 tertiary。 */
    function lucideChevronDownIcon(opacity = 0.5) {
      return h(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', opacity, 'aria-hidden': 'true' },
        h('path', { d: 'm6 9 6 6 6-6', stroke: 'currentColor' }),
      )
    }

    /** 评测表头排序钮（照工作台 ArrowUpDown；图标钮＝无边框，与行 ⋯ 同语汇）。 */
    function lucideSortIcon() {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        h('path', { d: 'm21 16-4 4-4-4', stroke: 'currentColor' }),
        h('path', { d: 'M17 20V4', stroke: 'currentColor' }),
        h('path', { d: 'm3 8 4-4 4 4', stroke: 'currentColor' }),
        h('path', { d: 'M7 4v16', stroke: 'currentColor' }),
      )
    }

    function lucidePlayIcon() {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        h('path', { d: 'M6 3l14 9-14 9V3z', stroke: 'currentColor' }),
      )
    }

    function lucideLayersIcon() {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        h('path', { d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', stroke: 'currentColor' }),
        h('path', { d: 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', stroke: 'currentColor' }),
        h('path', { d: 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65', stroke: 'currentColor' }),
      )
    }

    /** 空态烧瓶（照工作台 recall-test-panel 的 lucide FlaskConical size-5）。 */
    function lucideFlaskIcon() {
      return h(
        'svg',
        { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        h('path', { d: 'M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2', stroke: 'currentColor' }),
        h('path', { d: 'M6.453 15h11.094', stroke: 'currentColor' }),
        h('path', { d: 'M8.5 2h7', stroke: 'currentColor' }),
      )
    }

    /** 空态散点（lucide ChartScatter，投影 tab 词汇）。 */
    function lucideChartScatterIcon() {
      const dot = (cx, cy) => h('circle', { cx, cy, r: 1.5, fill: 'currentColor', stroke: 'none' })
      return h(
        'svg',
        { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M3 3v16a2 2 0 0 0 2 2h16', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        dot(7.5, 7.5),
        dot(18.5, 5.5),
        dot(11.5, 11.5),
        dot(7.5, 16.5),
        dot(17.5, 14.5),
      )
    }

    /** 空态实体图（lucide Waypoints，图谱 tab 词汇）。 */
    function lucideWaypointsIcon() {
      return h(
        'svg',
        { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        h('circle', { cx: 12, cy: 4.5, r: 2.5 }),
        h('path', { d: 'm10.2 6.3-3.9 3.9' }),
        h('circle', { cx: 4.5, cy: 12, r: 2.5 }),
        h('path', { d: 'M7 12h10' }),
        h('circle', { cx: 19.5, cy: 12, r: 2.5 }),
        h('path', { d: 'm13.8 17.7 3.9-3.9' }),
        h('circle', { cx: 12, cy: 19.5, r: 2.5 }),
      )
    }

    /** 悬空标记：红色禁止通行（圆＋斜杠）；计数/缺失明细交给 title 悬浮提示。 */
    function lucideBanIcon() {
      return h(
        'svg',
        { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
        h('circle', { cx: 12, cy: 12, r: 10, stroke: 'currentColor' }),
        h('path', { d: 'm4.9 4.9 14.2 14.2', stroke: 'currentColor' }),
      )
    }

    /** 宿主菜单件（Task 6）：薄适配——触发器按钮＋受控 open＋宿主 `Menu`（定位/视口钳制/
        外点关闭/键盘导航/焦点归还全交宿主，portal 视口层）。调用面＝items/children/
        selectedId/onSelect（onSelect 后自动收起＝旧行为）。`anchor:'field'`＝整框等宽
        （宿主 list 在 body portal 下——宽经根变量 `--hrag-menu-eq-w` 传入）。缺件回退＝
        极简 fixed 列表（无键盘导航；保证不因宿主换名整体失效）。 */
    /** 极简菜单行（宿主 Menu 缺件回退）：label/separator/submenu/danger 全支持；
        子菜单在回退面平铺（父项作标签、子项缩进）。 */
    function fallbackMenuRows(items, onPick) {
      const rows = []
      for (const entry of items || []) {
        if (!entry) continue
        if (entry.type === 'separator') {
          rows.push(h('div', { key: entry.id, className: 'hrag-mm-sep' }))
          continue
        }
        if (entry.type === 'label') {
          rows.push(h('div', { key: entry.id, className: 'hrag-mm-label' }, entry.text))
          continue
        }
        if (Array.isArray(entry.submenu) && entry.submenu.length > 0) {
          rows.push(h('div', { key: entry.id, className: 'hrag-mm-label' }, entry.label))
          for (const sub of entry.submenu) {
            if (!sub) continue
            const subKey = entry.id + '-' + sub.id
            if (sub.type === 'separator') {
              rows.push(h('div', { key: subKey, className: 'hrag-mm-sep' }))
              continue
            }
            if (sub.type === 'label') {
              rows.push(h('div', { key: subKey, className: 'hrag-mm-label' }, sub.text))
              continue
            }
            rows.push(
              h(
                'button',
                {
                  key: subKey,
                  type: 'button',
                  className: 'hrag-mm-item hrag-mm-sub' + (sub.danger ? ' hrag-mm-item-danger' : ''),
                  disabled: sub.disabled,
                  onClick: () => onPick(sub.id),
                },
                sub.label,
              ),
            )
          }
          continue
        }
        rows.push(
          h(
            'button',
            {
              key: entry.id,
              type: 'button',
              className: 'hrag-mm-item' + (entry.danger ? ' hrag-mm-item-danger' : ''),
              disabled: entry.disabled,
              onClick: () => onPick(entry.id),
            },
            entry.label,
          ),
        )
      }
      return rows
    }

    function DshMenu({ title, trigger, align, className, anchor, items, children, selectedId, onSelect, footer }) {
      const [open, setOpen] = React.useState(false)
      const [anchorBox, setAnchorBox] = React.useState(null)
      const btnRef = React.useRef(null)
      const listClass = useCtxListClass()
      const hasSubmenu = (items || []).some((entry) => entry && Array.isArray(entry.submenu) && entry.submenu.length > 0)
      const submenuFlip = useCtxSubmenuFlip(
        listClass,
        open && hasSubmenu,
        align === 'end' || anchorBox === null ? null : anchorBox.left,
        align === 'end' && anchorBox !== null ? anchorBox.right : null,
      )
      const close = () => setOpen(false)
      const toggle = () => {
        if (open) {
          setOpen(false)
          return
        }
        if (anchor === 'field' && btnRef.current && btnRef.current.closest) {
          const fieldEl = btnRef.current.closest('.hrag-set-field')
          if (fieldEl) {
            const rect = fieldEl.getBoundingClientRect()
            document.documentElement.style.setProperty('--hrag-menu-eq-w', Math.round(rect.width) + 'px')
          }
        }
        const rect = btnRef.current ? btnRef.current.getBoundingClientRect() : null
        setAnchorBox(rect ? { left: rect.left, right: rect.right } : null)
        setOpen(true)
      }
      const anchorButton = h(
        'button',
        {
          type: 'button',
          ref: btnRef,
          className: className || 'hrag-btn hrag-btn-outline hrag-btn-icon',
          'aria-label': title,
          title,
          'aria-haspopup': 'menu',
          'aria-expanded': open,
          onClick: toggle,
        },
        trigger,
      )
      if (HostMenu) {
        return h(
          'span',
          { className: 'hrag-mmhost' },
          h(HostMenu, {
            open,
            anchor: anchorButton,
            items: items || [],
            children,
            selectedId,
            onSelect: (id) => {
              setOpen(false)
              if (onSelect) onSelect(id)
            },
            onClose: close,
            align: align === 'end' ? 'end' : 'start',
            portal: true,
            listClassName:
              (anchor === 'field' ? 'hrag-mm-eqw ' : '') +
              listClass +
              (submenuFlip ? ' hrag-ctxmenu-subflip' : ''),
            footer,
          }),
        )
      }
      const rect = btnRef.current ? btnRef.current.getBoundingClientRect() : null
      return h(
        'div',
        { className: 'hrag-mm-wrap' },
        anchorButton,
        open
          ? h(
              React.Fragment,
              null,
              h('div', { className: 'hrag-mm-backdrop', onMouseDown: close }),
              h(
                'div',
                {
                  className: 'hrag-mm',
                  role: 'menu',
                  onContextMenu: (event) => event.stopPropagation(),
                  style: rect
                    ? {
                        top: rect.bottom + 4 + 'px',
                        left: align === 'end' ? 'auto' : rect.left + 'px',
                        right: align === 'end' ? window.innerWidth - rect.right + 'px' : 'auto',
                      }
                    : undefined,
                },
                fallbackMenuRows(items, (id) => {
                  close()
                  if (onSelect) onSelect(id)
                }),
                children,
              ),
            )
          : null,
      )
    }

    /** 趋势指标选择图标（滑杆三条＋旋钮，照工作台 SlidersHorizontal 语汇）。 */
    function evalSlidersIcon() {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': 'true' },
        h('line', { x1: 2, y1: 4, x2: 14, y2: 4, stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('line', { x1: 2, y1: 8, x2: 14, y2: 8, stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('line', { x1: 2, y1: 12, x2: 14, y2: 12, stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('circle', { cx: 5.5, cy: 4, r: 1.9, fill: 'currentColor' }),
        h('circle', { cx: 10.5, cy: 8, r: 1.9, fill: 'currentColor' }),
        h('circle', { cx: 7, cy: 12, r: 1.9, fill: 'currentColor' }),
      )
    }

    /** B′ 锚定拦截红块（照 AnchorBlockNotice）：缺失术语/建议锚/命中计数；
        missing_chunk 不可覆盖（无确认钮）。 */
    function EvalAnchorNotice({ tk, detail, confirmLabel, confirming, onConfirm }) {
      const canConfirm = detail.reason !== 'missing_chunk' && Boolean(onConfirm)
      const hitsLine = tk('ev.anchorBlock.hits') + ' ' + String(detail.hits) + '/' + String(detail.best_hits)
      return h(
        'div',
        { className: 'hrag-ev-anchor', role: 'alert' },
        h(
          'p',
          { className: 'hrag-ev-anchor-title' },
          detail.reason === 'missing_chunk' ? tk('ev.anchorBlock.missing') : tk('ev.anchorBlock.title'),
        ),
        detail.miss_terms && detail.miss_terms.length > 0
          ? h('p', null, tk('ev.anchorBlock.missTerms') + ' ' + detail.miss_terms.join(' '))
          : null,
        h(
          'p',
          null,
          detail.suggested_chunk
            ? tk('ev.anchorBlock.suggest') + ' ' + detail.suggested_chunk + ' (' + hitsLine + ')'
            : hitsLine,
        ),
        canConfirm
          ? h(
              'div',
              null,
              h(
                'button',
                { type: 'button', className: 'hrag-ev-anchor-btn', disabled: confirming, onClick: onConfirm },
                confirmLabel,
              ),
            )
          : null,
      )
    }

    /** 评测视图（Task 8）：三视图分段（总览/题库/历史）＋常驻工具栏（运行分体
        按钮：主键执行勾中档位、次槽空闲＝档位下拉/运行中＝终止两步确认）＋
        弹层族；keep-alive（照投影/图谱）；数据源＝运行列表（轮询源）＋总览/
        趋势/题库三查询；drain 边（in_flight 落闸）一次性刷新总览/趋势。 */
    function EvalView({ t, kbId, enabled, onReproduce }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [view, setView] = React.useState('overview')
      const [tier, setTier] = React.useState('l1')
      const [runTier, setRunTier] = React.useState(null)
      const [drawerRunId, setDrawerRunId] = React.useState(null)
      const [bankAddOpen, setBankAddOpen] = React.useState(false)
      const [bankSynthOpen, setBankSynthOpen] = React.useState(false)
      const [bankSearch, setBankSearch] = React.useState('')
      const [bankSelected, setBankSelected] = React.useState(() => new Set())
      const [fullRunOpen, setFullRunOpen] = React.useState(false)
      const [fullRunScope, setFullRunScope] = React.useState(undefined)
      const [pendingRun, setPendingRun] = React.useState(false)
      const [cancelArmed, setCancelArmed] = React.useState(false)
      const cancelTimerRef = React.useRef(null)

      React.useEffect(() => {
        setView('overview')
        setRunTier(null)
        setDrawerRunId(null)
        setBankAddOpen(false)
        setBankSynthOpen(false)
        setBankSearch('')
        setBankSelected(new Set())
      }, [kbId])

      const notify = React.useCallback((text, isError) => showToast(text, { error: Boolean(isError) }), [])

      const runsQ = useEvalRunsQuery(kbId, enabled)
      const overviewQ = useEvalCall(kbId, enabled, 'evalRunLatest')
      const trendQ = useEvalCall(kbId, enabled, 'evalRunTrend')
      const questionsQ = useEvalCall(kbId, enabled, 'listEvalQuestions')

      const inFlight = Boolean(runsQ.data && runsQ.data.in_flight)
      const running = pendingRun || inFlight
      const progress = (runsQ.data && runsQ.data.progress) || null
      const bannerTier = evRunningTier(progress, runTier, tier)
      const lastRun =
        runsQ.data && runsQ.data.runs && runsQ.data.runs.length > 0 ? runsQ.data.runs[0] : null
      const phaseName =
        progress && progress.phase === 'questions'
          ? tk('ev.phaseQuestions')
          : progress && progress.phase === 'ragas'
            ? tk('ev.phaseRagas')
            : tk('ev.phaseLayer1')
      const runStep = evPhaseStep(progress)
      const showCounter = bannerTier === 'l1_l2' || runStep > 1
      const runButtonLabel = running
        ? showCounter
          ? tk('ev.runPhase', phaseName, runStep, EVAL_PHASE_COUNT)
          : phaseName
        : tier === 'l1_l2'
          ? tk('ev.tierFull')
          : tk('ev.tierQuick')

      // drain 边（照工作台）：in_flight true→false 一次性刷新总览/趋势。
      const prevInFlight = React.useRef(false)
      React.useEffect(() => {
        const drained = prevInFlight.current && !inFlight
        prevInFlight.current = inFlight
        if (!drained) return
        overviewQ.refresh()
        trendQ.refresh()
      }, [inFlight, overviewQ, trendQ])

      const disarmCancel = React.useCallback(() => {
        if (cancelTimerRef.current !== null) {
          window.clearTimeout(cancelTimerRef.current)
          cancelTimerRef.current = null
        }
        setCancelArmed(false)
      }, [])
      React.useEffect(() => {
        if (!running) disarmCancel()
      }, [running, disarmCancel])
      React.useEffect(() => disarmCancel, [disarmCancel])

      const handleCancelClick = () => {
        if (!cancelArmed) {
          setCancelArmed(true)
          cancelTimerRef.current = window.setTimeout(() => {
            cancelTimerRef.current = null
            setCancelArmed(false)
          }, EVAL_CANCEL_CONFIRM_MS)
          return
        }
        disarmCancel()
        callOp('cancelEvalRun', { kb_id: kbId })
          .then(() => notify(tk('ev.cancelToast')))
          .catch(() => notify(tk('ev.cancelFailedToast'), true))
      }

      const handleTrigger = (input) => {
        setPendingRun(true)
        callOp('triggerEvalRun', { kb_id: kbId, body: input })
          .then((response) => {
            if (response && response.status === 'enqueued') {
              notify(tk('ev.runStartedToast'))
              if (input.layers) setRunTier(input.layers)
              runsQ.kick()
            } else {
              notify(tk('ev.alreadyRunningToast'))
            }
            if (input.question_ids) setBankSelected(new Set())
          })
          .catch(() => notify(tk('ev.runFailedToast'), true))
          .finally(() => setPendingRun(false))
      }

      const requestRun = (layers, questionIds) => {
        const scope =
          questionIds !== undefined
            ? questionIds
            : view === 'questions' && bankSelected.size > 0
              ? [...bankSelected]
              : undefined
        if (layers === 'l1_l2') {
          setFullRunScope(scope)
          setFullRunOpen(true)
          return
        }
        handleTrigger(scope ? { layers, question_ids: scope } : { layers })
      }

      const toolbar = h(
        'div',
        { className: 'hrag-ev-bar hrag-tabbar' },
        h(
          'span',
          { className: 'hrag-seg', role: 'group', 'aria-label': tk('ev.viewsLabel') },
          ['overview', 'questions', 'history'].map((id) =>
            h(
              'button',
              { key: id, type: 'button', 'aria-pressed': view === id, onClick: () => setView(id) },
              tk('ev.view.' + id),
            ),
          ),
        ),
        view === 'questions'
          ? h(
              'span',
              { className: 'hrag-searchwrap hrag-searchwrap-clear' },
              h('span', { className: 'hrag-searchicon' }, h(dshSearchIcon)),
              h('input', {
                type: 'text',
                className: 'hrag-searchinput',
                placeholder: tk('ev.questions.searchPlaceholder'),
                'aria-label': tk('ev.questions.searchPlaceholder'),
                value: bankSearch,
                onChange: (event) => setBankSearch(event.target.value),
              }),
              bankSearch
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'hrag-searchclear',
                      'aria-label': tk('ev.questions.searchClear'),
                      onClick: () => setBankSearch(''),
                    },
                    h(dshCloseIcon),
                  )
                : null,
            )
          : null,
        h(
          'span',
          { className: 'hrag-ev-runbtns' },
          h(
            'button',
            {
              type: 'button',
              className: 'hrag-btn hrag-ev-run',
              disabled: running,
              onClick: () => requestRun(tier),
            },
            running ? stateDot(16) : null,
            runButtonLabel,
          ),
          running
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'hrag-btn hrag-btn-outline hrag-ev-chev' + (cancelArmed ? ' hrag-ev-chev-armed' : ''),
                  title: tk('ev.cancelRun'),
                  'aria-label': cancelArmed ? undefined : tk('ev.cancelRun'),
                  onClick: handleCancelClick,
                },
                cancelArmed ? tk('ev.cancelConfirm') : '✕',
              )
            : h(
                EvalMenu,
                {
                  className: 'hrag-ev-menudrop',
                  label: '▾',
                  align: 'end',
                  render: (close) => [
                    h(
                      EvalMenuItem,
                      { key: 'l1', selected: tier === 'l1', onSelect: () => { setTier('l1'); close() } },
                      tk('ev.tierQuick'),
                    ),
                    h(
                      EvalMenuItem,
                      { key: 'full', selected: tier === 'l1_l2', onSelect: () => { setTier('l1_l2'); close() } },
                      tk('ev.tierFull'),
                    ),
                    view === 'questions'
                      ? h('div', { key: 'sep', className: 'hrag-ev-menu-sep' })
                      : null,
                    view === 'questions'
                      ? h(
                          EvalMenuItem,
                          { key: 'add', onSelect: () => { setBankAddOpen(true); close() } },
                          tk('ev.questions.addQuestion'),
                        )
                      : null,
                    view === 'questions'
                      ? h(
                          EvalMenuItem,
                          { key: 'syn', onSelect: () => { setBankSynthOpen(true); close() } },
                          tk('ev.syn.entryButton'),
                        )
                      : null,
                  ],
                },
              ),
        ),
      )

      let body
      if (view === 'overview') {
        body = h(EvalOverview, {
          t,
          tk,
          enabled,
          kbId,
          overviewQ,
          trendQ,
          runsQ,
          running,
          progress,
          bannerTier,
          lastRun,
          onOpenRun: setDrawerRunId,
          onViewHistory: () => setView('history'),
          notify,
        })
      } else if (view === 'questions') {
        body = h(EvalBank, {
          t,
          tk,
          kbId,
          enabled,
          questionsQ,
          overviewData: overviewQ.data,
          search: bankSearch,
          selected: bankSelected,
          onSelectedChange: setBankSelected,
          addOpen: bankAddOpen,
          onAddOpenChange: setBankAddOpen,
          synthOpen: bankSynthOpen,
          onSynthOpenChange: setBankSynthOpen,
          onTrigger: (input) => requestRun(input.layers || 'l1', input.question_ids),
          onReproduce,
          notify,
        })
      } else {
        body = h(EvalHistory, {
          t,
          tk,
          kbId,
          runsQ,
          onOpenRun: setDrawerRunId,
          notify,
        })
      }

      return h(
        'div',
        { className: 'hrag-ev' },
        toolbar,
        body,
        h(EvalRunDrawer, { t, tk, kbId, runId: drawerRunId, onClose: () => setDrawerRunId(null), notify }),
        fullRunOpen
          ? h(ConfirmDialog, {
              t,
              title: tk('ev.fullRun.dialogTitle'),
              description:
                tk('ev.fullRun.dialogBody') +
                ' ' +
                (fullRunScope !== undefined
                  ? tk('ev.fullRun.scopeSelected', fullRunScope.length)
                  : tk('ev.fullRun.scopeAll')),
              busy: false,
              danger: false,
              cancelKey: 'ev.fullRun.cancel',
              confirmKey: 'ev.fullRun.confirm',
              onCancel: () => setFullRunOpen(false),
              onConfirm: () => {
                const scope = fullRunScope
                setFullRunOpen(false)
                setFullRunScope(undefined)
                handleTrigger(scope ? { layers: 'l1_l2', question_ids: scope } : { layers: 'l1_l2' })
              },
            })
          : null,
      )
    }

    /** 评估摘要行（总览状态槽，照 EvalRunBanner）：运行中＝单轨加权进度条＋
        ETA＋单行日志＋失败计；空闲＝上次评测摘要（失败/终止红字）/尚未评测。 */
    function EvalBanner({ t, tk, running, progress, bannerTier, lastRun, onViewHistory }) {
      if (!running) {
        if (lastRun === null) {
          return h(
            'div',
            { className: 'hrag-ev-card hrag-ev-banner hrag-ev-banner-empty' },
            h('span', { className: 'hrag-ev-muted hrag-ev-emptytext' }, tk('ev.neverRan')),
          )
        }
        const failed = lastRun.status !== 'completed'
        const secs = evRunDurationSeconds(lastRun)
        const durationText = secs === null ? null : evDurationText(t, secs)
        const tierName = evTierOfRun(lastRun) === 'l1_l2' ? tk('ev.tierFull') : tk('ev.tierQuick')
        return h(
          'div',
          { className: 'hrag-ev-card hrag-ev-banner hrag-ev-banner-idle' },
          h(
            'span',
            { className: 'hrag-ev-slottext' + (failed ? ' hrag-ev-slottext-failed' : '') },
            failed
              ? lastRun.status === 'cancelled'
                ? tk('ev.slotSummaryCancelled')
                : tk('ev.slotSummaryFailed')
              : durationText
                ? tk('ev.slotSummary', tierName, durationText)
                : tierName,
          ),
          h(
            'span',
            { className: 'hrag-ev-banner-side' },
            h('span', { className: 'hrag-ev-muted hrag-ev-tabnums' }, evFmtRunTime(lastRun.created_at)),
            h(
              'button',
              {
                type: 'button',
                className: 'hrag-ev-iconbtn',
                title: tk('ev.slotViewHistory'),
                'aria-label': tk('ev.slotViewHistory'),
                onClick: onViewHistory,
              },
              '⟲',
            ),
          ),
        )
      }
      const phases = bannerTier === 'l1' ? ['layer1'] : EVAL_PHASE_ORDER
      const weights = evAdaptiveWeights(progress, bannerTier)
      const fraction = evOverallFraction(progress, bannerTier)
      const etaSecs = evEtaSeconds(progress, bannerTier)
      const etaText =
        etaSecs === null
          ? tk('ev.etaEstimating')
          : etaSecs < 60
            ? tk('ev.etaSeconds', Math.max(1, Math.round(etaSecs)))
            : tk('ev.etaMinutes', Math.max(1, Math.round(etaSecs / 60)))
      const current = progress && phases.indexOf(progress.phase) >= 0 ? progress.phase : phases[0]
      const boundaries = []
      let cursor = 0
      let spanStart = 0
      for (let index = 0; index < phases.length; index += 1) {
        if (phases[index] === current) spanStart = cursor
        cursor += weights[phases[index]] || 0
        if (index < phases.length - 1) boundaries.push(cursor)
      }
      const tail = (progress && progress.tail) || null
      const phaseWord = (phase) =>
        phase === 'layer1' ? tk('ev.phaseLayer1') : phase === 'ragas' ? tk('ev.phaseRagas') : tk('ev.phaseQuestions')
      const logText = !tail
        ? tk('ev.logWaiting')
        : tail.kind === 'phase'
          ? tk('ev.logPhase', phaseWord(tail.phase))
          : tail.kind === 'fail'
            ? tk('ev.logFail', phaseWord(tail.phase), tail.done, tail.total, tail.failed)
            : tk('ev.logItem', phaseWord(tail.phase), tail.done, tail.total)
      const logKey = tail ? tail.kind + ':' + tail.phase + ':' + tail.done + ':' + tail.failed : 'waiting'
      return h(
        'div',
        { className: 'hrag-ev-card hrag-ev-banner' },
        h(
          'div',
          { className: 'hrag-ev-progrow' },
          h(
            'div',
            {
              className: 'hrag-ev-track',
              role: 'progressbar',
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': Math.round(fraction * 100),
              'aria-label': tk('ev.bannerAria', phaseWord(current), Math.round(fraction * 100)),
            },
            h('div', {
              className: 'hrag-ev-track-span',
              style: { left: (spanStart * 100).toFixed(1) + '%', width: ((weights[current] || 0) * 100).toFixed(1) + '%' },
            }),
            h('div', { className: 'hrag-ev-track-fill', style: { width: (fraction * 100).toFixed(1) + '%' } }),
            boundaries.map((boundary) =>
              h('div', { key: boundary, className: 'hrag-ev-track-tick', style: { left: (boundary * 100).toFixed(1) + '%' } }),
            ),
          ),
          h('span', { className: 'hrag-ev-eta hrag-ev-tabnums' }, etaText),
        ),
        h(
          'div',
          { className: 'hrag-ev-logrow', 'aria-live': 'polite' },
          h('span', { key: logKey, className: 'hrag-ev-logtext' }, logText),
          progress && progress.failed > 0
            ? h('span', { className: 'hrag-ev-failedchip hrag-ev-tabnums' }, tk('ev.failedCount', progress.failed))
            : null,
        ),
      )
    }

    /** 指标瓦片（照 MetricTile 词汇）：名称＋ⓘ（title 承载）/大数字/进度条/
        火花线（28×12 SVG）。trace 链接仅忠实度瓦片（URL 存在时）。 */
    function EvalMetricTile({ tk, label, note, value, disabled, disabledReason, spark, traceUrl, onTrace }) {
      const isNull = value == null
      return h(
        'div',
        { className: 'hrag-ev-tile' + (disabled === true || isNull ? ' hrag-ev-tile-dim' : '') },
        h(
          'div',
          { className: 'hrag-ev-tile-title' },
          h('span', { className: 'hrag-ev-tile-label', title: label }, label),
          note ? h('span', { className: 'hrag-ev-tile-note', title: note, 'aria-label': note }, 'ⓘ') : null,
          traceUrl && onTrace
            ? h(
                'button',
                { type: 'button', className: 'hrag-ev-tracelink', onClick: () => onTrace(traceUrl) },
                tk('ev.viewTrace'),
              )
            : null,
        ),
        h(
          'div',
          { className: 'hrag-ev-tile-valuerow' },
          h('span', { className: 'hrag-ev-tile-value hrag-ev-tabnums' }, isNull ? '-' : evPercent(value)),
          evSparkline(spark),
        ),
        !isNull
          ? h(
              'div',
              { className: 'hrag-ev-progress hrag-ev-tabnums' },
              h('div', {
                className: 'hrag-ev-progress-fill ' + evBarClass(value),
                style: { width: (Math.min(100, value * 100)).toFixed(1) + '%' },
              }),
            )
          : null,
        disabled === true && disabledReason
          ? h('div', { className: 'hrag-ev-tile-reason' }, disabledReason)
          : null,
      )
    }

    /** 总览视图（照工作台）：状态槽＋检索质量表卡＋生成质量瓦片卡＋趋势卡。 */
    function EvalOverview({ t, tk, enabled, kbId, overviewQ, trendQ, runsQ, running, progress, bannerTier, lastRun, onOpenRun, onViewHistory, notify }) {
      const [layer1Collapsed, setLayer1Collapsed] = React.useState(false)
      const [layer2Collapsed, setLayer2Collapsed] = React.useState(false)
      const overview = overviewQ.data
      const layer1 = overview ? overview.layer1 : null
      const layer2 = overview ? overview.layer2 : null
      const traceUrl = layer2 && layer2.langfuse_trace_url ? layer2.langfuse_trace_url : null
      const openTrace = (url) => {
        try {
          window.open(url, '_blank', 'noopener')
        } catch (error) {
          notify(String(error), true)
        }
      }
      const categories = ['fact', 'relation', 'concept', 'global', 'summary']
      const layer1Table =
        layer1 === null
          ? h('div', { className: 'hrag-ev-hint' }, tk('ev.emptyLayer1'))
          : h(
              'table',
              { className: 'hrag-ev-table' },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  h('th', null, tk('ev.tableCategory')),
                  h('th', { className: 'hrag-ev-th-num' }, tk('ev.tableHitRate')),
                  h(
                    'th',
                    { className: 'hrag-ev-th-num' },
                    layer1.metrics.top_k != null ? tk('ev.tableRecallAtKv', layer1.metrics.top_k) : tk('ev.tableRecallAtK'),
                  ),
                  h('th', { className: 'hrag-ev-th-num' }, tk('ev.tableMrr')),
                  h('th', { className: 'hrag-ev-th-num' }, tk('ev.tablePathAccuracy')),
                ),
              ),
              h(
                'tbody',
                null,
                categories.map((category) => {
                  const metric = category === 'summary' ? layer1.metrics.summary : layer1.metrics[category] || null
                  const isSummary = category === 'summary'
                  if (!metric) {
                    return h(
                      'tr',
                      { key: category, className: 'hrag-ev-tr-muted' },
                      h('td', { colSpan: 5 }, tk('ev.category.' + category) + ' (n=0)'),
                    )
                  }
                  const cell = (value) =>
                    isSummary
                      ? value == null
                        ? h('span', { className: 'hrag-ev-muted' }, '-')
                        : h('span', { className: 'hrag-ev-capsule ' + evSummaryClass(value) }, evPercent(value))
                      : evPercent(value)
                  return h(
                    'tr',
                    { key: category, className: isSummary ? 'hrag-ev-tr-summary' : null },
                    h(
                      'td',
                      null,
                      tk('ev.category.' + category) + ' ',
                      h('span', { className: 'hrag-ev-muted' }, '(n=' + String(metric.question_count) + ')'),
                    ),
                    h('td', { className: 'hrag-ev-th-num hrag-ev-tabnums' }, cell(metric.hit_rate)),
                    h('td', { className: 'hrag-ev-th-num hrag-ev-tabnums' }, cell(metric.recall_at_k)),
                    h('td', { className: 'hrag-ev-th-num hrag-ev-tabnums' }, cell(metric.mrr)),
                    h('td', { className: 'hrag-ev-th-num hrag-ev-tabnums' }, cell(metric.path_accuracy)),
                  )
                }),
              ),
            )
      const ragasTile = (label, noteKey, value, sparkKey, testId) =>
        h(EvalMetricTile, {
          key: testId,
          tk,
          label,
          note: tk(noteKey),
          value,
          spark: trendQ.data && trendQ.data.sparks ? trendQ.data.sparks[sparkKey] : undefined,
        })
      const layer2Body =
        layer2 === null
          ? h('div', { className: 'hrag-ev-hint' }, tk('ev.emptyLayer2'))
          : h(
              React.Fragment,
              null,
              h('div', { className: 'hrag-ev-grouphead' }, tk('ev.ragasGroupLabel')),
              h(
                'div',
                { className: 'hrag-ev-grid4' },
                ragasTile(tk('ev.ragasCard.faithfulness'), 'ev.cardNote.faithfulness', layer2.ragas.faithfulness, 'faithfulness', 'faithfulness'),
                ragasTile(tk('ev.ragasCard.answerRelevancy'), 'ev.cardNote.answerRelevancy', layer2.ragas.answer_relevancy, 'answer_relevancy', 'answer_relevancy'),
                ragasTile(tk('ev.ragasCard.contextPrecision'), 'ev.cardNote.contextPrecision', layer2.ragas.context_precision, 'context_precision', 'context_precision'),
                ragasTile(tk('ev.ragasCard.contextRecall'), 'ev.cardNote.contextRecall', layer2.ragas.context_recall, 'context_recall', 'context_recall'),
              ),
              h('div', { className: 'hrag-ev-grouphead' }, tk('ev.archGroupLabel')),
              h(
                'div',
                { className: 'hrag-ev-grid4' },
                h(EvalMetricTile, {
                  key: 'citation_precision',
                  tk,
                  label: tk('ev.citationPrecision'),
                  note: tk('ev.cardNote.citationPrecision'),
                  value: layer2.arch_specific.citation_precision,
                  spark: trendQ.data && trendQ.data.sparks ? trendQ.data.sparks.citation_precision : undefined,
                }),
                h(EvalMetricTile, {
                  key: 'citation_recall',
                  tk,
                  label: tk('ev.citationRecall'),
                  note: tk('ev.cardNote.citationRecall'),
                  value: layer2.arch_specific.citation_recall,
                  spark: trendQ.data && trendQ.data.sparks ? trendQ.data.sparks.citation_recall : undefined,
                }),
                h(EvalMetricTile, {
                  key: 'seed_hit_rate',
                  tk,
                  label: tk('ev.seedHitRate'),
                  note: tk('ev.cardNote.seedHitRate'),
                  value: layer2.arch_specific.seed_hit_rate,
                  disabled: !layer2.has_graph_questions,
                  disabledReason: tk('ev.noGraphQuestions'),
                  spark: trendQ.data && trendQ.data.sparks ? trendQ.data.sparks.seed_hit_rate : undefined,
                }),
                h(EvalMetricTile, {
                  key: 'routing_hit_rate',
                  tk,
                  label: tk('ev.routingHitRate'),
                  note: tk('ev.cardNote.routingHitRate'),
                  value: layer2.routing_hit_rate,
                  spark: trendQ.data && trendQ.data.sparks ? trendQ.data.sparks.routing_hit_rate : undefined,
                }),
              ),
            )
      const ragasBadge =
        layer2 !== null && !layer2.ragas_available
          ? evClassifyRagasSkip(layer2.ragas_skip_reason) === 'error'
            ? h('span', { className: 'hrag-ev-badge', title: layer2.ragas_skip_reason || '' }, tk('ev.ragasErrorBadge'))
            : h('span', { className: 'hrag-ev-badge' }, tk('ev.ragasMissingBadge'))
          : null
      return h(
        'div',
        { className: 'hrag-ev-scroll' },
        h(EvalBanner, { t, tk, running, progress, bannerTier, lastRun, onViewHistory }),
        overviewQ.failure
          ? h('div', { className: 'hrag-ev-hint hrag-ev-hint-error' }, tk('ev.loadFailed'))
          : overviewQ.data === null
            ? h('div', { className: 'hrag-ev-hint' }, tk('ev.loading'))
            : h(
                React.Fragment,
                null,
                h(
                  'section',
                  { className: 'hrag-ev-card' },
                  h(
                    'div',
                    { className: 'hrag-ev-cardhead' + (layer1Collapsed ? '' : ' hrag-ev-cardhead-open') },
                    h(
                      'button',
                      { type: 'button', className: 'hrag-ev-cardtoggle', onClick: () => setLayer1Collapsed((value) => !value) },
                      tk('ev.layer1Title'),
                    ),
                    h('span', { className: 'hrag-ev-tile-note', title: tk('ev.layer1Note'), 'aria-label': tk('ev.layer1Note') }, 'ⓘ'),
                    layer1 && layer1.baseline_diff && layer1.baseline_diff.regression_detected
                      ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-danger' }, tk('ev.regressionBadge'))
                      : null,
                  ),
                  layer1Collapsed ? null : h('div', { className: 'hrag-ev-cardbody' }, layer1Table),
                ),
                h(
                  'section',
                  { className: 'hrag-ev-card' },
                  h(
                    'div',
                    { className: 'hrag-ev-cardhead' + (layer2Collapsed ? '' : ' hrag-ev-cardhead-open') },
                    h(
                      'button',
                      { type: 'button', className: 'hrag-ev-cardtoggle', onClick: () => setLayer2Collapsed((value) => !value) },
                      tk('ev.layer2Title'),
                    ),
                    h('span', { className: 'hrag-ev-tile-note', title: tk('ev.layer2Note'), 'aria-label': tk('ev.layer2Note') }, 'ⓘ'),
                    ragasBadge,
                  ),
                  layer2Collapsed ? null : h('div', { className: 'hrag-ev-cardbody' }, layer2Body),
                ),
              ),
        h(EvalTrendCard, { t, tk, trendQ, onOpenRun }),
      )
    }

    /** 趋势卡（照工作台容器化）：头部行＝收起 toggle＋阈值红芯片＋picker 多选
        （稀疏指标线，不进图例）＋粒度段控；体＝手绘趋势图＋图例开关行。 */
    function EvalTrendCard({ t, tk, trendQ, onOpenRun }) {
      const [collapsed, setCollapsed] = React.useState(false)
      const [span, setSpan] = React.useState('month')
      const [pickerSelected, setPickerSelected] = React.useState([])
      const [legendSelected, setLegendSelected] = React.useState({})
      const data = trendQ.data
      const baseline = data ? data.baseline : null
      const head = h(
        'div',
        { className: 'hrag-ev-cardhead hrag-ev-cardhead-tight' + (collapsed ? '' : ' hrag-ev-cardhead-open') },
        h(
          'button',
          { type: 'button', className: 'hrag-ev-cardtoggle', onClick: () => setCollapsed((value) => !value) },
          tk('ev.trendTitle'),
        ),
        baseline
          ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-danger hrag-ev-tabnums' }, tk('ev.trend.thresholdLabel', baseline.threshold_percent))
          : null,
        h(
          'span',
          { className: 'hrag-ev-cardhead-side' },
          h(EvalMenu, {
            icon: evalSlidersIcon(),
            title: tk('ev.trend.pickerAria'),
            align: 'end',
            render: () =>
              EVAL_PICKER_METRICS.map((metric) =>
                h(
                  EvalMenuItem,
                  {
                    key: metric.key,
                    selected: pickerSelected.indexOf(metric.key) >= 0,
                    onSelect: () =>
                      setPickerSelected((current) =>
                        current.indexOf(metric.key) >= 0
                          ? current.filter((key) => key !== metric.key)
                          : [...current, metric.key],
                      ),
                  },
                  h('span', { className: 'hrag-ev-legend-dot', style: { backgroundColor: metric.color } }),
                  tk(metric.labelKey),
                  metric.layer === 2 ? h('span', { className: 'hrag-ev-menu-note' }, tk('ev.trend.fullTierOnly')) : null,
                ),
              ),
          }),
          h(
            'span',
            { className: 'hrag-ev-segtrack', role: 'group', 'aria-label': tk('ev.granularityLabel') },
            ['day', 'week', 'month'].map((id) =>
              h(
                'button',
                { key: id, type: 'button', 'aria-pressed': span === id, onClick: () => setSpan(id) },
                tk('ev.granularity.' + id),
              ),
            ),
          ),
        ),
      )
      let body = null
      if (!collapsed) {
        if (trendQ.failure) {
          body = h('div', { className: 'hrag-ev-hint hrag-ev-hint-error' }, tk('ev.loadFailed'))
        } else if (data === null) {
          body = h('div', { className: 'hrag-ev-hint' }, tk('ev.loading'))
        } else if (!data.has_data) {
          body = h('div', { className: 'hrag-ev-hint' }, tk('ev.emptyTrend'))
        } else {
          const points = data.points
          body =
            points.length === 0
              ? h('div', { className: 'hrag-ev-hint' }, tk('ev.emptyTrend'))
              : h(
                  React.Fragment,
                  null,
                  h(EvalTrendChart, { tk, points, baseline, span, pickerSelected, legendSelected, onOpenRun }),
                  h(
                    'div',
                    { className: 'hrag-ev-legend' },
                    EVAL_TREND_METRICS.map((metric) => {
                      const name = tk(metric.labelKey)
                      const on = legendSelected[name] !== undefined ? legendSelected[name] : metric.defaultOn
                      return h(
                        'button',
                        {
                          key: metric.key,
                          type: 'button',
                          className: 'hrag-ev-legend-item' + (on ? '' : ' hrag-ev-legend-off'),
                          'aria-pressed': on,
                          onClick: () =>
                            setLegendSelected((current) => Object.assign({}, current, { [name]: !on })),
                        },
                        h('span', {
                          className:
                            'hrag-ev-legend-line' + (metric.layer === 2 ? ' hrag-ev-legend-line-dashed' : ''),
                          style: { backgroundColor: metric.color },
                        }),
                        name,
                      )
                    }),
                  ),
                )
        }
      }
      return h(
        'section',
        { className: 'hrag-ev-card' },
        head,
        collapsed ? null : h('div', { className: 'hrag-ev-cardbody' }, body),
      )
    }

    /** 手绘趋势图（照工作台合同）：序号轴（每 run 等距槽）＋分段加权纵轴
        （六等分刻度 0/40/80/90/95/100%）＋阈值红虚线＋基线更新竖线＋按图例/
        picker 的指标线（L1 实线实心圆、L2 虚线空心圆、回退点红）＋最近点
        tooltip（环比箭头）＋点击下钻 run。③档批 H1：dataZoom 索引窗（滚轮
        缩放＋拖拽平移＋点数 >8 的细滑条；日/周/月只设初始窗）。 */
    function EvalTrendChart({ tk, points, baseline, span, pickerSelected, legendSelected, onOpenRun }) {
      const wrapRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const [hover, setHover] = React.useState(null)
      const hoverRef = React.useRef(null)
      hoverRef.current = hover
      const layoutRef = React.useRef({ xs: [] })
      // ③档批 H1（照工作台 dataZoom）：全量点入场，日/周/月只设初始索引窗；
      // 滚轮/拖拽/滑条改窗口，切窗不重新取数。
      const [win, setWin] = React.useState(() => evTrendWindow(points, span))
      const sliderRef = React.useRef(null)
      const panRef = React.useRef(null)
      const sliderDragRef = React.useRef(null)
      React.useEffect(() => {
        setWin(evTrendWindow(points, span))
      }, [points, span])

      const visibleSeries = React.useCallback(() => {
        const list = []
        for (const metric of EVAL_TREND_METRICS) {
          const name = tk(metric.labelKey)
          const on = legendSelected[name] !== undefined ? legendSelected[name] : metric.defaultOn
          if (on) list.push(metric)
        }
        for (const metric of EVAL_PICKER_METRICS) {
          if (pickerSelected.indexOf(metric.key) >= 0) list.push(metric)
        }
        return list
      }, [tk, legendSelected, pickerSelected])

      const draw = React.useCallback(() => {
        const wrap = wrapRef.current
        const canvas = canvasRef.current
        if (!wrap || !canvas) return
        const width = wrap.clientWidth
        const height = wrap.clientHeight
        if (!width || !height) return
        const dpr = window.devicePixelRatio || 1
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr)
          canvas.height = Math.round(height * dpr)
        }
        const ctx = canvas.getContext('2d')
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, width, height)
        // 描边/文字色＝继承文本色（本插件画布族既定口径：读 computed style；
        // 宿主无 next-themes 的 .dark 钩子，工作台 isDarkTheme 不能照抄——
        // 2026-10-15 崩溃修复：此前逐字移植遗留未定义引用，评测渲染必炸）。
        const inkColor = getComputedStyle(wrap).color || '#3c3c3c'
        const inkMatch = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(inkColor)
        const ink = (alpha) =>
          inkMatch ? 'rgba(' + inkMatch[1] + ',' + inkMatch[2] + ',' + inkMatch[3] + ',' + alpha + ')' : inkColor
        // 衬底色＝页面底色（L2 空心点中心；照投影画布衬底先例）。
        const bodyBg = typeof document === 'undefined' ? '' : getComputedStyle(document.body).backgroundColor
        const bgFill = bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)' ? bodyBg : '#ffffff'
        const padL = 46
        const padR = 16
        const padT = 18
        const padB = 24
        const plotW = width - padL - padR
        const plotH = height - padT - padB
        const total = points.length
        const start = Math.max(0, Math.min(total - 1, win.start))
        const end = Math.max(start, Math.min(total - 1, win.end))
        const count = end - start + 1
        const xAt = (index) =>
          padL + (count === 1 ? plotW / 2 : ((index - start) / (count - 1)) * plotW)
        const yAt = (value) => padT + (1 - evWarpValue(value)) * plotH
        const xs = new Array(total)
        for (let index = start; index <= end; index += 1) xs[index] = xAt(index)
        layoutRef.current = { xs, start, end }
        ctx.font = '10px sans-serif'
        for (const entry of EVAL_WARP_TICKS) {
          const y = padT + (1 - entry[0]) * plotH
          ctx.strokeStyle = ink(0.08)
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(padL, y)
          ctx.lineTo(width - padR, y)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = ink(0.55)
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.fillText(entry[1], padL - 6, y)
        }
        ctx.fillStyle = ink(0.5)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const step = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(plotW / 48))))
        const pad2 = (value) => String(value).padStart(2, '0')
        // 轴格式随可见跨度（照工作台 presetRef 回算）：≤2 天看时分，否则看日期。
        const firstTs = Date.parse(points[start] ? points[start].ts : '')
        const lastTs = Date.parse(points[end] ? points[end].ts : '')
        const visibleMs = Number.isFinite(firstTs) && Number.isFinite(lastTs) ? lastTs - firstTs : 0
        const useTimeLabel = count <= 1 || visibleMs <= 2 * 86400000
        for (let index = start; index <= end; index += step) {
          const date = new Date(points[index].ts)
          if (Number.isNaN(date.getTime())) continue
          const label = useTimeLabel
            ? pad2(date.getHours()) + ':' + pad2(date.getMinutes())
            : pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
          ctx.fillText(label, xs[index], height - padB + 6)
        }
        if (baseline) {
          const threshold = baseline.recall_at_k - baseline.threshold_percent / 100
          const y = yAt(threshold)
          ctx.strokeStyle = EVAL_REGRESSION_COLOR
          ctx.setLineDash([5, 4])
          ctx.beginPath()
          ctx.moveTo(padL, y)
          ctx.lineTo(width - padR, y)
          ctx.stroke()
          ctx.setLineDash([])
        }
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        for (let index = start; index <= end; index += 1) {
          if (!points[index].is_baseline_update) continue
          ctx.strokeStyle = ink(0.3)
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(xs[index], padT)
          ctx.lineTo(xs[index], padT + plotH)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = ink(0.55)
          ctx.fillText(tk('ev.trend.baselineUpdate'), xs[index], padT - 4)
        }
        const hoverIndex = hoverRef.current ? hoverRef.current.index : null
        if (hoverIndex != null && xs[hoverIndex] !== undefined) {
          ctx.strokeStyle = ink(0.25)
          ctx.beginPath()
          ctx.moveTo(xs[hoverIndex], padT)
          ctx.lineTo(xs[hoverIndex], padT + plotH)
          ctx.stroke()
        }
        const dotRadius = count <= 20 ? 2.6 : count <= 40 ? 1.8 : 0
        for (const metric of visibleSeries()) {
          const pts = []
          for (let index = start; index <= end; index += 1) {
            const value = points[index][metric.key]
            if (value == null) continue
            pts.push({ index, x: xs[index], y: yAt(value) })
          }
          if (pts.length === 0) continue
          ctx.strokeStyle = metric.color
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.9
          if (metric.layer === 2) ctx.setLineDash([6, 4])
          ctx.beginPath()
          pts.forEach((point, order) => (order === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)))
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1
          for (const point of pts) {
            const highlighted = hoverIndex === point.index
            if (!highlighted && dotRadius === 0) continue
            const regression =
              metric.key === 'recall_at_k' &&
              points[point.index].regression &&
              points[point.index].regression.detected
            ctx.beginPath()
            ctx.arc(point.x, point.y, highlighted ? 4 : dotRadius, 0, Math.PI * 2)
            if (regression) {
              ctx.fillStyle = EVAL_REGRESSION_COLOR
              ctx.fill()
            } else if (metric.layer === 1) {
              ctx.fillStyle = metric.color
              ctx.fill()
            } else {
              ctx.fillStyle = bgFill
              ctx.fill()
              ctx.strokeStyle = metric.color
              ctx.lineWidth = 1.4
              ctx.stroke()
            }
          }
        }
      }, [points, baseline, span, tk, visibleSeries, win])

      React.useEffect(() => {
        draw()
      }, [draw])
      React.useEffect(() => {
        const wrap = wrapRef.current
        if (!wrap) return undefined
        const observer = new ResizeObserver(() => draw())
        observer.observe(wrap)
        return () => observer.disconnect()
      }, [draw])

      const total = points.length
      const clampCount = (count) => Math.max(2, Math.min(total, count))
      const moveWindow = (start, count) => {
        const next = Math.max(0, Math.min(total - count, start))
        setWin({ start: next, end: next + count - 1 })
      }

      // dataZoom inside（照工作台）：滚轮围绕光标缩放索引窗。≥2 点即接管滚轮
      // （2 点不可再缩＝无视觉变化，但与工作台一致地不把滚动漏给页面）。
      React.useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || total < 2) return undefined
        const onWheel = (event) => {
          event.preventDefault()
          const rect = canvas.getBoundingClientRect()
          if (!rect.width) return
          const fraction = Math.max(
            0,
            Math.min(1, (event.clientX - rect.left - 46) / Math.max(1, rect.width - 46 - 16)),
          )
          setWin((current) => {
            const count = current.end - current.start + 1
            const nextCount = clampCount(Math.round(count * Math.exp(-event.deltaY * 0.0015)))
            if (nextCount === count) return current
            const anchor = current.start + fraction * (count - 1)
            const nextStart = Math.max(
              0,
              Math.min(total - nextCount, Math.round(anchor - fraction * (nextCount - 1))),
            )
            return { start: nextStart, end: nextStart + nextCount - 1 }
          })
        }
        canvas.addEventListener('wheel', onWheel, { passive: false })
        return () => canvas.removeEventListener('wheel', onWheel)
      }, [total])

      const onMouseDown = (event) => {
        if (event.button !== 0) return
        panRef.current = { x: event.clientX, win, moved: false }
      }
      const onMouseMove = (event) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const pan = panRef.current
        if (pan) {
          const dx = event.clientX - pan.x
          if (Math.abs(dx) > 3) pan.moved = true
          const count = pan.win.end - pan.win.start + 1
          const slot = Math.max(1, (rect.width - 46 - 16) / Math.max(1, count - 1))
          const delta = Math.round(-dx / slot)
          if (delta !== 0) moveWindow(pan.win.start + delta, count)
          return
        }
        const mx = event.clientX - rect.left
        const layout = layoutRef.current
        let best = null
        let bestDistance = 18
        for (let index = layout.start; index <= layout.end; index += 1) {
          const distance = Math.abs(layout.xs[index] - mx)
          if (distance <= bestDistance) {
            bestDistance = distance
            best = index
          }
        }
        if (best === null) {
          if (hover) setHover(null)
          return
        }
        setHover({ index: best, x: mx, y: event.clientY - rect.top })
      }
      const onMouseUp = () => {
        const pan = panRef.current
        panRef.current = null
        if (pan && !pan.moved) {
          const current = hoverRef.current
          if (current && points[current.index]) onOpenRun(points[current.index].run_id)
        }
      }
      const onMouseLeave = () => {
        panRef.current = null
        setHover(null)
      }

      // dataZoom slider（照工作台：点数 > 8 出 14px 细带；拖窗平移）。
      const onSliderDown = (event) => {
        const track = sliderRef.current
        if (!track) return
        const rect = track.getBoundingClientRect()
        if (!rect.width) return
        const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
        const count = win.end - win.start + 1
        const startF = win.start / Math.max(1, total - 1)
        const endF = win.end / Math.max(1, total - 1)
        if (fraction < startF || fraction > endF) {
          moveWindow(Math.round(fraction * (total - 1) - count / 2), count)
        }
        sliderDragRef.current = { x: event.clientX, win }
        if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId)
      }
      const onSliderMove = (event) => {
        const drag = sliderDragRef.current
        const track = sliderRef.current
        if (!drag || !track) return
        const rect = track.getBoundingClientRect()
        if (!rect.width) return
        const count = drag.win.end - drag.win.start + 1
        const delta = Math.round(((event.clientX - drag.x) / rect.width) * Math.max(1, total - 1))
        moveWindow(drag.win.start + delta, count)
      }
      const onSliderUp = () => {
        sliderDragRef.current = null
      }

      const buildTooltip = (index) => {
        const point = points[index]
        if (!point) return null
        const rows = []
        for (const metric of visibleSeries()) {
          const value = point[metric.key]
          if (value == null) {
            if (pickerSelected.indexOf(metric.key) >= 0) {
              rows.push(
                h(
                  'div',
                  { key: metric.key, className: 'hrag-ev-tip-row' },
                  h('span', { className: 'hrag-ev-legend-dot', style: { backgroundColor: metric.color } }),
                  tk(metric.labelKey) + ' ',
                  h('span', { className: 'hrag-ev-muted' }, tk('ev.trend.notRunInTier')),
                ),
              )
            }
            continue
          }
          let delta = null
          for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
            const prev = points[cursor][metric.key]
            if (prev != null) {
              delta = value - prev
              break
            }
          }
          rows.push(
            h(
              'div',
              { key: metric.key, className: 'hrag-ev-tip-row' },
              h('span', { className: 'hrag-ev-legend-dot', style: { backgroundColor: metric.color } }),
              tk(metric.labelKey) + ' ',
              h('b', null, evPercent(value)),
              delta != null
                ? h('span', { className: 'hrag-ev-tip-delta' }, (delta >= 0 ? '↑' : '↓') + (Math.abs(delta) * 100).toFixed(1) + '%')
                : null,
            ),
          )
        }
        return h(
          React.Fragment,
          null,
          h('div', { className: 'hrag-ev-tip-head' }, evFmtRunTime(point.ts)),
          rows,
          point.regression && point.regression.detected && point.regression.categories.length > 0
            ? h(
                'div',
                { className: 'hrag-ev-tip-regression' },
                tk('ev.trend.regressionPrefix') + ': ' + point.regression.categories.join(', '),
              )
            : null,
          point.is_baseline_update
            ? h('div', { className: 'hrag-ev-tip-meta' }, tk('ev.trend.baselineUpdate'))
            : null,
          h('div', { className: 'hrag-ev-tip-meta' }, tk('ev.trend.clickForDetail') + ' →'),
        )
      }

      const wrapWidth = wrapRef.current ? wrapRef.current.clientWidth : 320
      const tipLeft = hover ? Math.max(6, Math.min(hover.x + 12, Math.max(6, wrapWidth - 236))) : 0
      const zoomVisible = total > 8
      const zoomCount = win.end - win.start + 1
      const zoomLeftRaw = total > 1 ? (win.start / (total - 1)) * 100 : 0
      const zoomWidth = total > 1 ? Math.max(4, ((zoomCount - 1) / (total - 1)) * 100) : 100
      const zoomLeft = Math.min(zoomLeftRaw, 100 - zoomWidth)
      return h(
        'div',
        { className: 'hrag-ev-chartwrap', ref: wrapRef },
        h('canvas', {
          ref: canvasRef,
          className: 'hrag-ev-chart' + (hover ? ' hrag-ev-chart-hover' : ''),
          onMouseDown,
          onMouseMove,
          onMouseUp,
          onMouseLeave,
        }),
        zoomVisible
          ? h(
              'div',
              {
                className: 'hrag-ev-zoom',
                ref: sliderRef,
                onPointerDown: onSliderDown,
                onPointerMove: onSliderMove,
                onPointerUp: onSliderUp,
                onPointerCancel: onSliderUp,
              },
              h('div', { className: 'hrag-ev-zoom-track' }),
              h('div', {
                className: 'hrag-ev-zoom-win',
                style: { left: zoomLeft + '%', width: zoomWidth + '%' },
              }),
            )
          : null,
        hover
          ? h('div', { className: 'hrag-ev-tip', style: { left: tipLeft + 'px', top: '8px' } }, buildTooltip(hover.index))
          : null,
      )
    }

    /** 单次运行详情抽屉（照 EvalRunDrawer）：sticky 头＝运行时间＋芯片行；
        运行信息卡（run_id 复制）＋检索质量卡（4 瓦片）＋生成质量卡（8 瓦片＋
        路由口径 callout）；层未执行显「未执行」提示。 */
    function EvalRunDrawer({ t, tk, kbId, runId, onClose, notify }) {
      const [state, setState] = React.useState({ phase: 'idle', data: null, failure: null })
      React.useEffect(() => {
        if (runId === null) return undefined
        let cancelled = false
        setState({ phase: 'loading', data: null, failure: null })
        callOp('evalRunDetail', { kb_id: kbId, run_id: runId })
          .then((payload) => {
            if (!cancelled) setState({ phase: 'ready', data: payload, failure: null })
          })
          .catch((error) => {
            if (!cancelled) setState({ phase: 'error', data: null, failure: error })
          })
        return () => {
          cancelled = true
        }
      }, [runId, kbId])
      if (runId === null) return null
      const run = state.data
      const envLabel = run
        ? run.environment === 'ci'
          ? tk('ev.history.envCi')
          : run.environment === 'nightly'
            ? tk('ev.history.envNightly')
            : tk('ev.history.envLocal')
        : ''
      const statusLabel = run
        ? run.status === 'error'
          ? tk('ev.drawer.statusError')
          : run.status === 'skipped'
            ? tk('ev.drawer.statusSkipped')
            : run.status === 'cancelled'
              ? tk('ev.drawer.statusCancelled')
              : tk('ev.drawer.statusCompleted')
        : ''
      const hasL1 = Boolean(run && run.layer1_metrics && run.layer1_metrics.summary)
      const hasL2 = Boolean(run && run.layer2_metrics && run.layer2_metrics.ragas)
      const scopeLabel = run
        ? hasL1 && hasL2
          ? tk('ev.history.scopeFull')
          : hasL1
            ? tk('ev.history.scopeQuick')
            : hasL2
              ? tk('ev.history.scopeGeneration')
              : null
        : null
      const copyRunId = () => {
        if (!run) return
        const clipboard = navigator.clipboard
        if (!clipboard || typeof clipboard.writeText !== 'function') {
          notify(tk('ev.copyFailed'), true)
          return
        }
        clipboard
          .writeText(run.run_id)
          .then(() => notify(tk('ev.copied')))
          .catch(() => notify(tk('ev.copyFailed'), true))
      }
      const tile = (key, label, note, value, disabled, disabledReason) =>
        h(EvalMetricTile, { key, tk, label, note, value, disabled, disabledReason })
      const l1Body = hasL1
        ? h(
            'div',
            { className: 'hrag-ev-grid2' },
            [
              tile('hit', tk('ev.tableHitRate'), null, run.layer1_metrics.summary.hit_rate),
              tile(
                'recall',
                run.layer1_metrics.top_k != null
                  ? tk('ev.tableRecallAtKv', run.layer1_metrics.top_k)
                  : tk('ev.tableRecallAtK'),
                null,
                run.layer1_metrics.summary.recall_at_k,
              ),
              tile('mrr', tk('ev.tableMrr'), null, run.layer1_metrics.summary.mrr),
              tile('path', tk('ev.tablePathAccuracy'), null, run.layer1_metrics.summary.path_accuracy),
            ],
          )
        : h('div', { className: 'hrag-ev-hint' }, tk('ev.drawer.notRun'))
      const l2Body = hasL2
        ? h(
            React.Fragment,
            null,
            h(
              'div',
              { className: 'hrag-ev-grid2' },
              [
                tile('faithfulness', tk('ev.ragasCard.faithfulness'), tk('ev.cardNote.faithfulness'), run.layer2_metrics.ragas.faithfulness),
                tile('answer_relevancy', tk('ev.ragasCard.answerRelevancy'), tk('ev.cardNote.answerRelevancy'), run.layer2_metrics.ragas.answer_relevancy),
                tile('context_precision', tk('ev.ragasCard.contextPrecision'), tk('ev.cardNote.contextPrecision'), run.layer2_metrics.ragas.context_precision),
                tile('context_recall', tk('ev.drawer.contextRecallLabel'), tk('ev.cardNote.contextRecall'), run.layer2_metrics.ragas.context_recall),
                tile('citation_precision', tk('ev.citationPrecision'), tk('ev.cardNote.citationPrecision'), run.layer2_metrics.arch_specific.citation_precision),
                tile('citation_recall', tk('ev.citationRecall'), tk('ev.cardNote.citationRecall'), run.layer2_metrics.arch_specific.citation_recall),
                tile(
                  'seed_hit_rate',
                  tk('ev.seedHitRate'),
                  tk('ev.cardNote.seedHitRate'),
                  run.layer2_metrics.arch_specific.seed_hit_rate,
                  !run.layer2_metrics.has_graph_questions,
                  tk('ev.noGraphQuestions'),
                ),
                tile(
                  'routing_hit_rate',
                  tk('ev.routingHitRate'),
                  null,
                  run.layer2_metrics.path_accuracy != null ? run.layer2_metrics.path_accuracy : null,
                ),
              ],
            ),
            h('p', { className: 'hrag-ev-muted hrag-ev-callout' }, tk('ev.cardNote.routingHitRate')),
          )
        : h('div', { className: 'hrag-ev-hint' }, tk('ev.drawer.notRun'))
      return h(
        'div',
        { className: 'hrag-graph-drawer' },
        h('div', { className: 'hrag-drawer-overlay', onClick: onClose }),
        h(
          'div',
          { className: 'hrag-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': tk('ev.drawer.title') },
          h(
            'div',
            { className: 'hrag-drawer-head' },
            h('span', { className: 'hrag-drawer-title hrag-ev-tabnums' }, run ? evFmtRunTime(run.created_at) : tk('ev.drawer.title')),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline hrag-drawer-close', 'aria-label': t('chunk.close'), onClick: onClose },
              '✕',
            ),
          ),
          h(
            'div',
            { className: 'hrag-drawer-body hrag-ev-drawerbody' },
            run
              ? h(
                  React.Fragment,
                  null,
                  h(
                    'div',
                    { className: 'hrag-ev-chips' },
                    h('span', { className: 'hrag-ev-badge' }, envLabel),
                    h('span', { className: 'hrag-ev-badge' }, statusLabel),
                    scopeLabel ? h('span', { className: 'hrag-ev-badge' }, scopeLabel) : null,
                    run.is_baseline
                      ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-baseline' }, tk('ev.drawer.baselineBadge'))
                      : null,
                    run.baseline_diff && run.baseline_diff.regression_detected
                      ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-danger' }, tk('ev.regressionBadge'))
                      : null,
                  ),
                  h(
                    'section',
                    { className: 'hrag-ev-card' },
                    h('div', { className: 'hrag-ev-cardhead hrag-ev-cardhead-open' }, tk('ev.drawer.runInfoSection')),
                    h(
                      'div',
                      { className: 'hrag-ev-cardbody' },
                      h(
                        'div',
                        { className: 'hrag-ev-inforow' },
                        h('span', { className: 'hrag-ev-infolabel' }, tk('ev.drawer.runIdLabel')),
                        h('span', { className: 'hrag-ev-runidbox', title: run.run_id }, run.run_id),
                        h(
                          'button',
                          { type: 'button', className: 'hrag-ev-iconbtn', title: tk('ev.copied'), onClick: copyRunId },
                          '⧉',
                        ),
                      ),
                      h(
                        'div',
                        { className: 'hrag-ev-inforow' },
                        h('span', { className: 'hrag-ev-infolabel' }, tk('ev.drawer.createdAtLabel')),
                        h('span', { className: 'hrag-ev-tabnums hrag-ev-fulltime' }, evFmtFullTime(run.created_at)),
                      ),
                    ),
                  ),
                  h(
                    'section',
                    { className: 'hrag-ev-card' },
                    h(
                      'div',
                      { className: 'hrag-ev-cardhead hrag-ev-cardhead-open' },
                      tk('ev.drawer.layer1Section'),
                      hasL1
                        ? h(
                            'span',
                            { className: 'hrag-ev-badge hrag-ev-tabnums' },
                            'n=' + String(run.layer1_metrics.summary.question_count),
                          )
                        : null,
                    ),
                    h('div', { className: 'hrag-ev-cardbody' }, l1Body),
                  ),
                  h(
                    'section',
                    { className: 'hrag-ev-card' },
                    h('div', { className: 'hrag-ev-cardhead hrag-ev-cardhead-open' }, tk('ev.drawer.layer2Section')),
                    h('div', { className: 'hrag-ev-cardbody' }, l2Body),
                  ),
                )
              : state.phase === 'error'
                ? h('div', { className: 'hrag-ev-hint hrag-ev-hint-error' }, tk('ev.loadFailed'))
                : h('div', { className: 'hrag-ev-hint' }, tk('ev.loading')),
          ),
        ),
      )
    }

    /** B′ 锚定拦截共享状态机（照 useAnchorConfirm）：keyed 红块；首击提交不带
        anchor_ack（盲双击不绕过），422 结构化 detail 落红块；红块内「仍要…」
        才以 anchor_ack=true 重提；missing_chunk 不可覆盖。其他错误上抛留 toast。 */
    function useAnchorBlocks() {
      const [blocks, setBlocks] = React.useState({})
      const clear = React.useCallback((key) => {
        setBlocks((current) => {
          if (!(key in current)) return current
          const next = Object.assign({}, current)
          delete next[key]
          return next
        })
      }, [])
      const runGuarded = React.useCallback(
        (key, ack, run) =>
          Promise.resolve()
            .then(() => run(ack))
            .then(() => {
              clear(key)
              return true
            })
            .catch((error) => {
              const detail = evAsAnchorBlockDetail(error)
              if (detail !== null) {
                setBlocks((current) => Object.assign({}, current, { [key]: detail }))
                return false
              }
              throw error
            }),
        [clear],
      )
      const submit = React.useCallback((key, run) => runGuarded(key, false, run), [runGuarded])
      const confirm = React.useCallback((key, run) => runGuarded(key, true, run), [runGuarded])
      const blockFor = React.useCallback((key) => blocks[key] || null, [blocks])
      return { blockFor, submit, confirm, clear }
    }

    /** 题库视图（照工作台）：表格（选择集/参考切片数＋悬空/存疑徽章/召回率
        三态点/行菜单）＋考题抽屉＋添加/合成弹层＋底部候选题审核停靠。
        选中集动作只在行右键菜单（工作台 2026-09-02 批量运行栏退役），不再插底条。 */
    function EvalBank({ t, tk, kbId, enabled, questionsQ, overviewData, search, selected, onSelectedChange, addOpen, onAddOpenChange, synthOpen, onSynthOpenChange, onTrigger, onReproduce, notify }) {
      const [sortKey, setSortKey] = React.useState('default')
      const [sortDir, setSortDir] = React.useState('asc')
      const [drawerQuestionId, setDrawerQuestionId] = React.useState(null)
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [docTitles, setDocTitles] = React.useState(null)
      const [ctxMenu, setCtxMenu] = React.useState(null)
      // 合成触发信号（照工作台触发后失效合成缓存）：递增即唤醒审核停靠重拉。
      const [synthWake, setSynthWake] = React.useState(0)

      React.useEffect(() => {
        setDrawerQuestionId(null)
        setDeleteTargets(null)
        setCtxMenu(null)
      }, [kbId])

      // 文档标题映射（参考切片 tooltip 与抽屉组头共用；文档 tab 同端点）。
      React.useEffect(() => {
        if (!enabled || docTitles !== null) return
        callOp('listDocuments', { kb_id: kbId })
          .then((rows) => {
            const map = new Map()
            for (const doc of Array.isArray(rows) ? rows : []) map.set(String(doc.id), String(doc.name))
            setDocTitles(map)
          })
          .catch(() => setDocTitles(new Map()))
      }, [enabled, kbId, docTitles])

      const allQuestions = questionsQ.data && Array.isArray(questionsQ.data.questions) ? questionsQ.data.questions : []
      const trimmedSearch = String(search || '').trim().toLowerCase()
      const visibleQuestions = trimmedSearch
        ? allQuestions.filter((question) => String(question.query).toLowerCase().indexOf(trimmedSearch) >= 0)
        : allQuestions
      const questionMetrics = React.useMemo(() => {
        const list = overviewData && overviewData.question_results ? overviewData.question_results : []
        return new Map(list.map((metric) => [metric.id, metric]))
      }, [overviewData])
      const docTitle = (docId) => {
        const name = docTitles ? docTitles.get(docId) : null
        return name || String(docId).slice(0, 8)
      }
      const drawerQuestion =
        drawerQuestionId !== null
          ? allQuestions.find((question) => question.id === drawerQuestionId) || null
          : null

      // 数据刷新后剔除已不存在的选中（同工作台幽灵选择纪律）。
      React.useEffect(() => {
        const alive = allQuestions.filter((question) => selected.has(question.id))
        if (alive.length !== selected.size) {
          onSelectedChange(new Set(alive.map((question) => question.id)))
        }
      }, [allQuestions, selected, onSelectedChange])

      const sortedQuestions = React.useMemo(() => {
        if (sortKey === 'default') return visibleQuestions
        const sign = sortDir === 'asc' ? 1 : -1
        const value = (question) => {
          if (sortKey === 'query') return String(question.query).toLowerCase()
          if (sortKey === 'category') return tk('ev.category.' + question.category)
          if (sortKey === 'refDocs') return evRefDocIds(question.relevant_chunk_ids).length
          if (sortKey === 'recall') {
            const metric = questionMetrics.get(question.id)
            return metric && metric.recall != null ? metric.recall : null
          }
          return null
        }
        return [...visibleQuestions].sort((a, b) => {
          const av = value(a)
          const bv = value(b)
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          if (typeof av === 'string' && typeof bv === 'string') return sign * (av < bv ? -1 : av > bv ? 1 : 0)
          return sign * (Number(av) - Number(bv))
        })
      }, [visibleQuestions, sortKey, sortDir, questionMetrics, tk])

      const toggleQuestion = (questionId, checked) => {
        const next = new Set(selected)
        if (checked) next.add(questionId)
        else next.delete(questionId)
        onSelectedChange(next)
      }
      const allVisibleSelected = visibleQuestions.length > 0 && visibleQuestions.every((question) => selected.has(question.id))
      const toggleSelectAll = () => {
        const next = new Set(selected)
        if (allVisibleSelected) visibleQuestions.forEach((question) => next.delete(question.id))
        else visibleQuestions.forEach((question) => next.add(question.id))
        onSelectedChange(next)
      }
      // 工作台惯例：右键未选中行只选中该行；右键已选中行保持批量上下文。
      const handleRowContextMenu = (question, event) => {
        event.preventDefault()
        event.stopPropagation()
        const already = selected.has(question.id)
        if (!already) onSelectedChange(new Set([question.id]))
        setCtxMenu({
          x: event.clientX,
          y: event.clientY,
          question,
          batch: already && selected.size > 1,
        })
      }

      const handleDeleteConfirm = () => {
        if (deleteTargets === null) return
        setBusy(true)
        const removed = new Set(deleteTargets.map((question) => question.id))
        Promise.allSettled(
          deleteTargets.map((question) => callOp('deleteEvalQuestion', { kb_id: kbId, question_id: question.id })),
        )
          .then((results) => {
            const failed = results.some((result) => result.status === 'rejected')
            if (failed) notify(tk('ev.questions.deleteFailed'), true)
            else notify(tk('ev.questions.deletedToast'))
            onSelectedChange(new Set([...selected].filter((id) => !removed.has(id))))
            setDeleteTargets(null)
            questionsQ.refresh()
          })
          .finally(() => setBusy(false))
      }

      const rowMenu = (question) =>
        h(EvalMenu, {
          className: 'hrag-ev-rowmenu',
          label: '⋯',
          align: 'end',
          render: (close) => [
            h(
              EvalMenuItem,
              {
                key: 'l1',
                onSelect: () => {
                  close()
                  onTrigger({ layers: 'l1', question_ids: [question.id] })
                },
              },
              tk('ev.tierQuick'),
            ),
            h(
              EvalMenuItem,
              {
                key: 'full',
                onSelect: () => {
                  close()
                  onTrigger({ layers: 'l1_l2', question_ids: [question.id] })
                },
              },
              tk('ev.tierFull'),
            ),
            h('div', { key: 'sep', className: 'hrag-ev-menu-sep' }),
            h(
              EvalMenuItem,
              {
                key: 'del',
                danger: true,
                onSelect: () => {
                  close()
                  setDeleteTargets([question])
                },
              },
              tk('ev.questions.rowDelete'),
            ),
          ],
        })

      const recallCell = (question) => {
        const metric = questionMetrics.get(question.id)
        const recall = metric && metric.recall != null ? metric.recall : null
        if (recall === null) {
          return h('span', { className: 'hrag-ev-muted' }, '—')
        }
        const dotClass = recall >= 1 ? 'hrag-ev-dot-ok' : recall > 0 ? 'hrag-ev-dot-part' : 'hrag-ev-dot-miss'
        return h(
          'span',
          {
            className: 'hrag-ev-recall hrag-ev-tabnums',
            title: tk('ev.questions.recallTip', evPercent(recall), metric.actual_path || '-'),
          },
          h('span', { className: 'hrag-ev-dot ' + dotClass }),
          evPercent(recall),
        )
      }

      let table = null
      if (questionsQ.failure) {
        table = h('div', { className: 'hrag-ev-hint hrag-ev-hint-full hrag-ev-hint-error' }, tk('ev.loadFailed'))
      } else if (questionsQ.data === null) {
        table = h('div', { className: 'hrag-ev-hint hrag-ev-hint-full' }, tk('ev.loading'))
      } else if (allQuestions.length === 0) {
        table = h(
          'div',
          { className: 'hrag-ev-hint hrag-ev-hint-full' },
          h('p', null, tk('ev.questions.emptyBank')),
          h('p', null, tk('ev.questions.emptyBankSynthesis')),
        )
      } else if (visibleQuestions.length === 0) {
        table = h('div', { className: 'hrag-ev-hint hrag-ev-hint-full' }, tk('ev.questions.noMatch'))
      } else {
        table = h(
          'table',
          { className: 'hrag-ev-table hrag-ev-banktable' + (selected.size > 0 ? ' hrag-ev-bank-selecting' : '') },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h(
                'th',
                { className: 'hrag-ev-th-check' },
                h('input', {
                  type: 'checkbox',
                  className: 'hrag-ev-check',
                  'aria-label': tk('ev.selection.selectAllAria'),
                  checked: allVisibleSelected,
                  onChange: () => toggleSelectAll(),
                }),
              ),
              h('th', null, tk('ev.questions.columnQuery')),
              h('th', null, tk('ev.questions.columnCategory')),
              h(
                'th',
                { className: 'hrag-ev-th-num' },
                h('span', { className: 'hrag-ev-th-withnote' },
                  overviewData && overviewData.layer1 && overviewData.layer1.metrics.top_k != null
                    ? tk('ev.tableRecallAtKv', overviewData.layer1.metrics.top_k)
                    : tk('ev.tableRecallAtK'),
                  h('span', { className: 'hrag-ev-tile-note', title: tk('ev.questions.columnRecallNote'), 'aria-label': tk('ev.questions.columnRecallNote') }, 'ⓘ'),
                ),
              ),
              h('th', { className: 'hrag-ev-th-num' }, tk('ev.questions.columnRefChunks')),
              h(
                'th',
                { className: 'hrag-ev-th-sort' },
                h(EvalMenu, {
                  icon: lucideSortIcon(),
                  title: tk('sort.title'),
                  align: 'end',
                  render: (close) => [
                    h(EvalMenuItem, { key: 'default', selected: sortKey === 'default', onSelect: () => { setSortKey('default'); close() } }, tk('ev.questions.sortDefault')),
                    h(EvalMenuItem, { key: 'query', selected: sortKey === 'query', onSelect: () => { setSortKey('query'); close() } }, tk('ev.questions.columnQuery')),
                    h(EvalMenuItem, { key: 'category', selected: sortKey === 'category', onSelect: () => { setSortKey('category'); close() } }, tk('ev.questions.columnCategory')),
                    h(EvalMenuItem, { key: 'refDocs', selected: sortKey === 'refDocs', onSelect: () => { setSortKey('refDocs'); close() } }, tk('ev.questions.sortDocsCount')),
                    h(
                      EvalMenuItem,
                      { key: 'recall', selected: sortKey === 'recall', onSelect: () => { setSortKey('recall'); close() } },
                      overviewData && overviewData.layer1 && overviewData.layer1.metrics.top_k != null
                        ? tk('ev.tableRecallAtKv', overviewData.layer1.metrics.top_k)
                        : tk('ev.tableRecallAtK'),
                    ),
                    h('div', { key: 'sep', className: 'hrag-ev-menu-sep' }),
                    h(EvalMenuItem, { key: 'asc', selected: sortDir === 'asc', onSelect: () => { setSortDir('asc'); close() } }, t('sort.asc')),
                    h(EvalMenuItem, { key: 'desc', selected: sortDir === 'desc', onSelect: () => { setSortDir('desc'); close() } }, t('sort.desc')),
                  ],
                }),
              ),
            ),
          ),
          h(
            'tbody',
            null,
            sortedQuestions.map((question) => {
              const isSelected = selected.has(question.id)
              const docIds = evRefDocIds(question.relevant_chunk_ids)
              const refTotal = question.relevant_chunk_ids.length
              const refMissing = question.missing_chunk_ids ? question.missing_chunk_ids.length : 0
              const refAllDangling = refTotal > 0 && refMissing >= refTotal
              return h(
                'tr',
                {
                  key: question.id,
                  className: 'hrag-ev-tr' + (isSelected ? ' hrag-ev-tr-on' : ''),
                  onClick: () => setDrawerQuestionId(question.id),
                  onContextMenu: (event) => handleRowContextMenu(question, event),
                },
                h(
                  'td',
                  { className: 'hrag-ev-th-check' },
                  h('input', {
                    type: 'checkbox',
                    className: 'hrag-ev-check',
                    'aria-label': tk('ev.selection.rowSelectAria', question.query),
                    checked: isSelected,
                    onClick: (event) => event.stopPropagation(),
                    onChange: (event) => toggleQuestion(question.id, event.target.checked),
                  }),
                ),
                h('td', { className: 'hrag-ev-td-query', title: question.query }, question.query),
                h('td', null, h('span', { className: 'hrag-ev-badge' }, tk('ev.category.' + question.category))),
                h('td', { className: 'hrag-ev-th-num' }, recallCell(question)),
                h(
                  'td',
                  { className: 'hrag-ev-th-num hrag-ev-tabnums' },
                  h(
                    'span',
                    { className: 'hrag-ev-refchunks' },
                    refTotal > 0 && !refAllDangling
                      ? h(
                          'span',
                          { title: docIds.map(docTitle).join('\n') },
                          String(refTotal),
                        )
                      : null,
                    refMissing > 0
                      ? h(
                          'span',
                          {
                            className: 'hrag-ev-danglingicon',
                            role: 'img',
                            'aria-label': tk('ev.questions.danglingBadge'),
                            title: tk('ev.questions.danglingHint', refTotal, refMissing),
                          },
                          lucideBanIcon(),
                        )
                      : null,
                    question.anchor_mismatch != null
                      ? h(
                          'span',
                          { className: 'hrag-ev-badge hrag-ev-badge-amber', title: question.anchor_mismatch.miss_terms.join(' ') },
                          tk('ev.questions.mismatchBadge'),
                        )
                      : null,
                  ),
                ),
                h(
                  'td',
                  { className: 'hrag-ev-th-sort' },
                  h(
                    'span',
                    { className: 'hrag-ev-rowmenu-wrap', onClick: (event) => event.stopPropagation() },
                    rowMenu(question),
                  ),
                ),
              )
            }),
          ),
        )
      }

      return h(
        'div',
        { className: 'hrag-ev-bank' },
        h('div', { className: 'hrag-ev-bankscroll' }, table),
        // 批量动作只在行右键菜单（照工作台 2026-09-02 批量运行栏退役）；底部不再插条。
        ctxMenu !== null
          ? h(DocContextMenu, {
              t,
              x: ctxMenu.x,
              y: ctxMenu.y,
              items: ctxMenu.batch
                ? [
                    { id: 'count', label: tk('ev.selection.selected', selected.size), disabled: true },
                    { id: 'quick', label: tk('ev.tierQuick'), icon: lucidePlayIcon() },
                    { id: 'full', label: tk('ev.tierFull'), icon: lucideLayersIcon() },
                    { id: 'cancel', label: tk('ev.selection.clear'), icon: dshCloseIcon() },
                    { type: 'separator', id: 'sep' },
                    { id: 'delete', label: tk('ev.selection.deleteSelected'), icon: dshTrashIcon(), danger: true },
                  ]
                : [
                    { id: 'quick', label: tk('ev.tierQuick'), icon: lucidePlayIcon() },
                    { id: 'full', label: tk('ev.tierFull'), icon: lucideLayersIcon() },
                    { id: 'cancel', label: tk('ev.selection.clear'), icon: dshCloseIcon() },
                    { type: 'separator', id: 'sep' },
                    { id: 'delete', label: tk('ev.questions.rowDelete'), icon: dshTrashIcon(), danger: true },
                  ],
              onClose: () => setCtxMenu(null),
              onSelect: (id) => {
                if (id === 'quick' || id === 'full') {
                  onTrigger({
                    layers: id === 'quick' ? 'l1' : 'l1_l2',
                    question_ids: ctxMenu.batch ? [...selected] : [ctxMenu.question.id],
                  })
                } else if (id === 'cancel') {
                  onSelectedChange(new Set())
                } else if (id === 'delete') {
                  setDeleteTargets(
                    ctxMenu.batch ? allQuestions.filter((question) => selected.has(question.id)) : [ctxMenu.question],
                  )
                }
              },
            })
          : null,
        h(EvalSynthReview, {
          t,
          tk,
          kbId,
          enabled,
          notify,
          docTitle,
          wake: synthWake,
          onBankChanged: () => questionsQ.refresh(),
        }),
        h(EvalAddQuestionDialog, {
          t,
          tk,
          kbId,
          open: addOpen,
          onClose: () => onAddOpenChange(false),
          notify,
          onSaved: () => questionsQ.refresh(),
        }),
        h(EvalSynthDialog, {
          t,
          tk,
          kbId,
          open: synthOpen,
          onClose: () => onSynthOpenChange(false),
          notify,
          onTriggered: () => setSynthWake((value) => value + 1),
        }),
        h(EvalQuestionDrawer, {
          t,
          tk,
          kbId,
          question: drawerQuestion,
          docTitle,
          onClose: () => setDrawerQuestionId(null),
          onDelete: (question) => {
            setDrawerQuestionId(null)
            setDeleteTargets([question])
          },
          onReproduce,
          notify,
          onSaved: () => questionsQ.refresh(),
        }),
        deleteTargets !== null
          ? h(ConfirmDialog, {
              t,
              title: tk('ev.questions.rowDelete'),
              description:
                (deleteTargets.length === 1 && deleteTargets[0]
                  ? deleteTargets[0].query
                  : tk('ev.selection.selected', deleteTargets.length)) +
                ' ' +
                tk('ev.questions.deleteConfirmDesc'),
              busy,
              cancelKey: 'doc.cancel',
              confirmKey: 'doc.confirmDelete',
              onCancel: () => setDeleteTargets(null),
              onConfirm: handleDeleteConfirm,
            })
          : null,
      )
    }

    /** 添加考题弹层（照工作台简化表单）：query＋分类＋预期路径（≥1）＋参考
        答案；不暴露锚定输入（锚的正源＝召回「存为考题」）；B′ 红块同接线。 */
    function EvalAddQuestionDialog({ t, tk, kbId, open, onClose, notify, onSaved }) {
      const [query, setQuery] = React.useState('')
      const [category, setCategory] = React.useState('fact')
      const [paths, setPaths] = React.useState(['vector'])
      const [referenceAnswer, setReferenceAnswer] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const anchor = useAnchorBlocks()
      const anchorBlock = anchor.blockFor('form')
      React.useEffect(() => {
        if (!open) return
        setQuery('')
        setCategory('fact')
        setPaths(['vector'])
        setReferenceAnswer('')
        anchor.clear('form')
      }, [open])
      if (!open) return null
      const togglePath = (path) =>
        setPaths((current) =>
          current.indexOf(path) >= 0 ? current.filter((item) => item !== path) : [...current, path],
        )
      const canSubmit = query.trim().length > 0 && paths.length > 0 && !busy
      const submitQuestion = (ack) =>
        callOp('createEvalQuestion', {
          kb_id: kbId,
          body: {
            query: query.trim(),
            category,
            expected_paths: paths,
            reference_answer: referenceAnswer.trim() ? referenceAnswer.trim() : null,
            anchor_ack: ack,
          },
        })
      const run = (mode) => {
        setBusy(true)
        const guarded = mode === 'ack' ? anchor.confirm('form', submitQuestion) : anchor.submit('form', submitQuestion)
        guarded
          .then((saved) => {
            if (!saved) return
            notify(tk('ev.questions.addedToast'))
            onSaved()
            onClose()
          })
          .catch((error) => notify(errorDetail(error), true))
          .finally(() => setBusy(false))
      }
      return h(
        'div',
        {
          className: 'hrag-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onClose()
          },
        },
        h(
          'div',
          { className: 'hrag-dialog hrag-dialog-wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': tk('ev.questions.addQuestion') },
          h('div', { className: 'hrag-dialog-title' }, tk('ev.questions.addTitle')),
          h(
            'div',
            { className: 'hrag-ev-form' },
            h(
              'label',
              { className: 'hrag-ev-field' },
              h('span', { className: 'hrag-ev-fieldlabel' }, tk('ev.questions.queryLabel')),
              h('textarea', {
                className: 'hrag-input hrag-ev-textarea',
                'aria-label': tk('ev.questions.queryLabel'),
                value: query,
                onChange: (event) => setQuery(event.target.value),
              }),
            ),
            h(
              'div',
              { className: 'hrag-ev-formrow' },
              h(
                'label',
                { className: 'hrag-ev-field' },
                h('span', { className: 'hrag-ev-fieldlabel' }, tk('ev.questions.categoryLabel')),
                h(
                  'select',
                  {
                    className: 'hrag-input hrag-ev-select',
                    'aria-label': tk('ev.questions.categoryLabel'),
                    value: category,
                    onChange: (event) => setCategory(event.target.value),
                  },
                  ['fact', 'relation', 'concept', 'global'].map((id) =>
                    h('option', { key: id, value: id }, tk('ev.category.' + id)),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'hrag-ev-field' },
                h('span', { className: 'hrag-ev-fieldlabel' }, tk('ev.questions.expectedPathLabel')),
                h(
                  'span',
                  { className: 'hrag-ev-checkrow' },
                  ['vector', 'graph', 'wiki'].map((path) =>
                    h(
                      'label',
                      { key: path, className: 'hrag-ev-checklabel' },
                      h('input', {
                        type: 'checkbox',
                        className: 'hrag-ev-check',
                        checked: paths.indexOf(path) >= 0,
                        onChange: () => togglePath(path),
                      }),
                      path,
                    ),
                  ),
                ),
              ),
            ),
            h(
              'label',
              { className: 'hrag-ev-field' },
              h('span', { className: 'hrag-ev-fieldlabel' }, tk('ev.questions.referenceAnswerLabel')),
              h('textarea', {
                className: 'hrag-input hrag-ev-textarea',
                'aria-label': tk('ev.questions.referenceAnswerLabel'),
                value: referenceAnswer,
                onChange: (event) => {
                  setReferenceAnswer(event.target.value)
                  anchor.clear('form')
                },
              }),
            ),
            h('p', { className: 'hrag-ev-muted hrag-ev-formnote' }, tk('ev.questions.unanchoredNote')),
          ),
          anchorBlock !== null
            ? h(EvalAnchorNotice, {
                tk,
                detail: anchorBlock,
                confirmLabel: tk('ev.anchorBlock.confirmSave'),
                confirming: busy,
                onConfirm: () => run('ack'),
              })
            : null,
          h(
            'div',
            { className: 'hrag-dialog-actions' },
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: busy, onClick: onClose },
              tk('ev.questions.cancel'),
            ),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: !canSubmit, onClick: () => run('submit') },
              tk('ev.questions.submit'),
            ),
          ),
        ),
      )
    }

    /** 合成考题弹层（照工作台）：已索引文档多选（勾选序即提交序）＋候选题数
        （1–10，默认 5）→ 202 幂等；enqueued 关窗，already_running 留窗。
        触发成功（不论 enqueued/already_running）经 onTriggered 唤醒审核停靠
        ——照工作台 useTriggerSynthesis.onSuccess 失效合成缓存（其注释记载
        「旧缓存 in_progress=false 会让轮询永不启动（触发后审核面板不现）」，
        2026-09-02 实测发现；插件 2026-10-15 补上同一环）。 */
    function EvalSynthDialog({ t, tk, kbId, open, onClose, notify, onTriggered }) {
      const [docIds, setDocIds] = React.useState([])
      const [count, setCount] = React.useState(5)
      const [docs, setDocs] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      React.useEffect(() => {
        if (!open) return undefined
        setDocIds([])
        setCount(5)
        setDocs(null)
        let cancelled = false
        callOp('listDocuments', { kb_id: kbId })
          .then((rows) => {
            if (!cancelled) setDocs(Array.isArray(rows) ? rows.filter((doc) => doc.status === 'ready') : [])
          })
          .catch(() => {
            if (!cancelled) setDocs([])
          })
        return () => {
          cancelled = true
        }
      }, [open, kbId])
      if (!open) return null
      const readyDocs = docs || []
      const toggle = (docId) =>
        setDocIds((current) =>
          current.indexOf(docId) >= 0 ? current.filter((id) => id !== docId) : [...current, docId],
        )
      const submit = () => {
        if (docIds.length === 0 || busy) return
        setBusy(true)
        callOp('triggerSynthesis', { kb_id: kbId, body: { doc_ids: docIds, count } })
          .then((response) => {
            notify(tk('ev.syn.generating'))
            if (response && response.status === 'enqueued') onClose()
            if (onTriggered) onTriggered()
          })
          .catch((error) => notify(errorDetail(error), true))
          .finally(() => setBusy(false))
      }
      return h(
        'div',
        {
          className: 'hrag-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onClose()
          },
        },
        h(
          'div',
          { className: 'hrag-dialog hrag-dialog-wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': tk('ev.syn.dialogTitle') },
          h('div', { className: 'hrag-dialog-title' }, tk('ev.syn.dialogTitle')),
          h('div', { className: 'hrag-dialog-body' }, tk('ev.syn.docPlaceholder')),
          h(
            'div',
            { className: 'hrag-ev-form' },
            h(
              'div',
              { className: 'hrag-ev-field' },
              h('span', { className: 'hrag-ev-fieldlabel' }, tk('ev.syn.docLabel')),
              h(
                'div',
                { className: 'hrag-ev-doclist', role: 'group', 'aria-label': tk('ev.syn.docLabel') },
                readyDocs.length === 0
                  ? h('p', { className: 'hrag-ev-muted hrag-ev-doclist-empty' }, tk('ev.syn.empty'))
                  : readyDocs.map((doc) =>
                      h(
                        'label',
                        {
                          key: doc.id,
                          className: 'hrag-ev-docrow' + (docIds.indexOf(doc.id) >= 0 ? ' hrag-ev-docrow-on' : ''),
                        },
                        h('input', {
                          type: 'checkbox',
                          className: 'hrag-ev-check',
                          checked: docIds.indexOf(doc.id) >= 0,
                          onChange: () => toggle(doc.id),
                        }),
                        h('span', { className: 'hrag-ev-docrow-name', title: doc.name }, String(doc.name)),
                      ),
                    ),
              ),
            ),
            h(
              'label',
              { className: 'hrag-ev-field' },
              h('span', { className: 'hrag-ev-fieldlabel' }, tk('ev.syn.countLabel')),
              h(
                'select',
                {
                  className: 'hrag-input hrag-ev-select',
                  'aria-label': tk('ev.syn.countLabel'),
                  value: String(count),
                  onChange: (event) => setCount(Number(event.target.value)),
                },
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => h('option', { key: value, value: String(value) }, String(value))),
              ),
            ),
          ),
          h(
            'div',
            { className: 'hrag-dialog-actions' },
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: busy, onClick: onClose },
              tk('ev.questions.cancel'),
            ),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: docIds.length === 0 || busy, onClick: submit },
              tk('ev.syn.generate'),
            ),
          ),
        ),
      )
    }

    /** 候选题审核停靠（照工作台底部常驻容器）：无候选＝单行头（空态/生成中）；
        有候选＝展开与表格分高，卡内采纳/忽略（B′ 逐候选红块）＋头部批量动作；
        in_progress 时 3s 轮询（useEvalCall pollWhile）。wake（弹层触发信号）
        ＝工作台「触发后失效合成缓存」的等价物（见 EvalSynthDialog 头注）；
        onBankChanged 随采纳/忽略回调＝工作台 accept/reject hook 双失效题库
        （「新题即时可见」；2026-10-15 补，此前采纳后须切 tab 才见新题）。 */
    function EvalSynthReview({ t, tk, kbId, enabled, notify, docTitle, wake, onBankChanged }) {
      const statusQ = useEvalCall(kbId, enabled, 'synthesisStatus', null, (payload) =>
        Boolean(payload && payload.in_progress),
      )
      React.useEffect(() => {
        if (wake > 0) statusQ.refresh()
      }, [wake]) // eslint-disable-line react-hooks/exhaustive-deps
      const [collapsed, setCollapsed] = React.useState(false)
      const [busyId, setBusyId] = React.useState(null)
      const [headCtx, setHeadCtx] = React.useState(null)
      const anchor = useAnchorBlocks()
      const data = statusQ.data
      const candidates = data && Array.isArray(data.candidates) ? data.candidates : []
      const hasCandidates = candidates.length > 0
      const inProgress = Boolean(data && data.in_progress)
      const expanded = hasCandidates && !collapsed
      const acceptCandidate = (candidateId, ack) =>
        callOp('acceptSynthesis', { kb_id: kbId, candidate_id: candidateId, anchor_ack: ack })
      const handleAccept = (candidateId) => {
        setBusyId(candidateId)
        anchor
          .submit(candidateId, (ack) => acceptCandidate(candidateId, ack))
          .then((accepted) => {
            if (accepted) {
              notify(tk('ev.questions.addedToast'))
              statusQ.refresh()
              if (onBankChanged) onBankChanged()
            }
          })
          .catch((error) => notify(errorDetail(error), true))
          .finally(() => setBusyId(null))
      }
      const handleAcceptConfirmed = (candidateId) => {
        setBusyId(candidateId)
        anchor
          .confirm(candidateId, (ack) => acceptCandidate(candidateId, ack))
          .then((accepted) => {
            if (accepted) {
              notify(tk('ev.questions.addedToast'))
              statusQ.refresh()
              if (onBankChanged) onBankChanged()
            }
          })
          .catch((error) => notify(errorDetail(error), true))
          .finally(() => setBusyId(null))
      }
      const handleReject = (candidateId) => {
        setBusyId(candidateId)
        callOp('rejectSynthesis', { kb_id: kbId, candidate_id: candidateId })
          .then(() => {
            anchor.clear(candidateId)
            statusQ.refresh()
            // 忽略只动暂存；题库一并重拉（口径统一，代价一次空刷——照工作台）。
            if (onBankChanged) onBankChanged()
          })
          .catch((error) => notify(errorDetail(error), true))
          .finally(() => setBusyId(null))
      }
      const handleAcceptAll = () => {
        Promise.allSettled(
          candidates.map((candidate) =>
            anchor.submit(candidate.candidate_id, (ack) => acceptCandidate(candidate.candidate_id, ack)),
          ),
        ).then((results) => {
          const accepted = results.some((result) => result.status === 'fulfilled' && result.value)
          if (accepted) notify(tk('ev.questions.addedToast'))
          else notify(tk('ev.syn.acceptFailed'), true)
          statusQ.refresh()
          if (accepted && onBankChanged) onBankChanged()
        })
      }
      const handleRejectAll = () => {
        Promise.allSettled(
          candidates.map((candidate) =>
            callOp('rejectSynthesis', { kb_id: kbId, candidate_id: candidate.candidate_id }),
          ),
        ).then(() => {
          statusQ.refresh()
          if (onBankChanged) onBankChanged()
        })
      }
      const docIds = data && Array.isArray(data.doc_ids) ? data.doc_ids : []
      const docsLine =
        docIds.length <= 2
          ? docIds.map(docTitle).join(tk('ev.syn.docsSep'))
          : tk('ev.syn.docsMore', docIds.slice(0, 2).map(docTitle).join(tk('ev.syn.docsSep')), docIds.length)
      const metaTip =
        data && data.generated_at != null ? tk('ev.syn.reviewMetaTip', docsLine, docFmtRelative(data.generated_at)) : null
      const busy = busyId !== null
      return h(
        'section',
        { className: 'hrag-ev-card hrag-ev-review' + (expanded ? ' hrag-ev-review-open' : '') },
        h(
          'div',
          {
            className: 'hrag-ev-cardhead' + (expanded ? ' hrag-ev-cardhead-open' : ''),
            onContextMenu: (event) => {
              event.preventDefault()
              setHeadCtx({ x: event.clientX, y: event.clientY })
            },
          },
          hasCandidates
            ? h(
                'button',
                { type: 'button', className: 'hrag-ev-cardtoggle', onClick: () => setCollapsed((value) => !value) },
                tk('ev.syn.reviewTitle'),
              )
            : h('span', { className: 'hrag-ev-review-static' }, tk('ev.syn.reviewTitle')),
          inProgress
            ? h('span', { className: 'hrag-ev-muted hrag-ev-spin-text' }, tk('ev.syn.generating'))
            : hasCandidates
              ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-amber hrag-ev-tabnums' }, tk('ev.syn.reviewCount', candidates.length))
              : h('span', { className: 'hrag-ev-muted' }, tk('ev.syn.empty')),
          h(
            'span',
            { className: 'hrag-ev-cardhead-side' },
            data && data.dropped > 0
              ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-amber hrag-ev-tabnums', title: tk('ev.syn.metaLine', data.dropped) }, tk('ev.syn.droppedChip', data.dropped))
              : null,
            metaTip ? h('span', { className: 'hrag-ev-tile-note', title: metaTip, 'aria-label': metaTip }, 'ⓘ') : null,
          ),
        ),
        headCtx !== null
          ? h(DocContextMenu, {
              t,
              x: headCtx.x,
              y: headCtx.y,
              items: hasCandidates
                ? [
                    { id: 'accept-all', label: tk('ev.syn.acceptAll'), icon: dshCheckIcon(), disabled: busy },
                    { id: 'reject-all', label: tk('ev.syn.rejectAll'), icon: dshCloseIcon(), disabled: busy },
                  ]
                : [{ id: 'empty', label: tk('ev.syn.empty'), disabled: true }],
              onClose: () => setHeadCtx(null),
              onSelect: (id) => {
                if (id === 'accept-all') handleAcceptAll()
                else if (id === 'reject-all') handleRejectAll()
              },
            })
          : null,
        expanded
          ? h(
              'div',
              { className: 'hrag-ev-reviewlist' },
              candidates.map((candidate) => {
                const candidateDocIds = evRefDocIds(candidate.relevant_chunk_ids)
                const candidateBlock = anchor.blockFor(candidate.candidate_id)
                return h(
                  'div',
                  { key: candidate.candidate_id, className: 'hrag-ev-cand' },
                  h('p', { className: 'hrag-ev-cand-query' }, candidate.query),
                  h(
                    'div',
                    { className: 'hrag-ev-cand-chips' },
                    h('span', { className: 'hrag-ev-badge' }, tk('ev.category.' + candidate.category)),
                    candidate.expected_paths.map((path) => h('span', { key: path, className: 'hrag-ev-badge' }, path)),
                    candidate.relevant_chunk_ids.length > 0
                      ? h(
                          'span',
                          { className: 'hrag-ev-muted hrag-ev-tabnums', title: candidateDocIds.map(docTitle).join('\n') },
                          String(candidate.relevant_chunk_ids.length),
                        )
                      : null,
                  ),
                  candidate.reference_answer !== null
                    ? h('p', { className: 'hrag-ev-muted hrag-ev-cand-answer' }, candidate.reference_answer)
                    : null,
                  h(
                    'div',
                    { className: 'hrag-ev-cand-actions' },
                    h(
                      'button',
                      { type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: busy, onClick: () => handleAccept(candidate.candidate_id) },
                      tk('ev.syn.accept'),
                    ),
                    h(
                      'button',
                      { type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: busy, onClick: () => handleReject(candidate.candidate_id) },
                      tk('ev.syn.reject'),
                    ),
                  ),
                  candidateBlock !== null
                    ? h(EvalAnchorNotice, {
                        tk,
                        detail: candidateBlock,
                        confirmLabel: tk('ev.anchorBlock.confirmAccept'),
                        confirming: busy,
                        onConfirm: () => handleAcceptConfirmed(candidate.candidate_id),
                      })
                    : null,
                )
              }),
            )
          : null,
      )
    }

    /** 考题详情抽屉（照 EvalQuestionDrawer）：sticky 头（query 承载身份＋
        分类/路径芯片）；参考答案卡＋参考文档卡（读态＝逐片折叠预览（chunksByIds
        一次两用：预览＋悬空判定）/ 编辑态＝按文档分组勾选改锚，50/页加载更多）＋
        实体卡（仅有值显）；底部动作＝复现/删除。改锚只动锚；B′ 红块拦截。 */
    function EvalQuestionDrawer({ t, tk, kbId, question, docTitle, onClose, onDelete, onReproduce, notify, onSaved }) {
      const questionId = question ? question.id : null
      const [chunks, setChunks] = React.useState(null)
      const [openChunks, setOpenChunks] = React.useState(() => new Set())
      const [editing, setEditing] = React.useState(false)
      const [draft, setDraft] = React.useState([])
      const [docs, setDocs] = React.useState(null)
      const [expandedDocs, setExpandedDocs] = React.useState(() => new Set())
      const [docPages, setDocPages] = React.useState({})
      const [busy, setBusy] = React.useState(false)
      const anchor = useAnchorBlocks()
      const anchorBlock = questionId !== null ? anchor.blockFor(questionId) : null

      React.useEffect(() => {
        setChunks(null)
        setOpenChunks(new Set())
        setEditing(false)
        setDraft([])
        setExpandedDocs(new Set())
        setDocPages({})
      }, [questionId])

      const anchorIds = question && Array.isArray(question.relevant_chunk_ids) ? question.relevant_chunk_ids : []
      const anchorIdsKey = anchorIds.join('\n')
      React.useEffect(() => {
        if (questionId === null || anchorIds.length === 0) return undefined
        let cancelled = false
        callOp('chunksByIds', { kb_id: kbId, chunk_ids: anchorIds })
          .then((payload) => {
            if (cancelled) return
            const items = payload && Array.isArray(payload.items) ? payload.items : []
            setChunks(items)
          })
          .catch(() => {
            if (!cancelled) setChunks([])
          })
        return () => {
          cancelled = true
        }
      }, [questionId, kbId, anchorIdsKey])
      const chunkById = new Map((chunks || []).map((chunk) => [String(chunk.chunk_id), chunk]))
      const danglingIds = new Set(chunks !== null ? anchorIds.filter((id) => !chunkById.has(id)) : [])
      const groups = []
      for (const chunkId of anchorIds) {
        const parts = String(chunkId).split('#')
        const docId = parts[0]
        if (!docId) continue
        let group = groups.find((entry) => entry.docId === docId)
        if (!group) {
          group = { docId, sequences: [] }
          groups.push(group)
        }
        group.sequences.push(parts[1] || '')
      }
      const concern = question ? question.anchor_mismatch || null : null
      const preview = (text) => {
        const line = String(text || '')
          .split(/\r?\n/)
          .find((entry) => entry.trim().length > 0)
        return (line || text || '').trim()
      }
      const loadDocPage = (docId, offset) => {
        setDocPages((current) => {
          const prev = current[docId] || { items: [], total: 0, loading: false }
          return Object.assign({}, current, { [docId]: Object.assign({}, prev, { loading: true }) })
        })
        callOp('listChunks', { kb_id: kbId, doc_id: docId, offset, limit: 50 })
          .then((page) => {
            const items = page && Array.isArray(page.items) ? page.items : []
            const total = page && typeof page.total === 'number' ? page.total : items.length
            setDocPages((current) => {
              const prev = current[docId] || { items: [], total: 0, loading: false }
              const seen = new Set(prev.items.map((item) => item.chunk_id))
              return Object.assign({}, current, {
                [docId]: {
                  items: prev.items.concat(items.filter((item) => !seen.has(item.chunk_id))),
                  total,
                  loading: false,
                },
              })
            })
          })
          .catch(() => {
            setDocPages((current) => {
              const prev = current[docId] || { items: [], total: 0, loading: false }
              return Object.assign({}, current, { [docId]: Object.assign({}, prev, { loading: false }) })
            })
          })
      }
      const enterEdit = () => {
        const anchors = question ? question.relevant_chunk_ids : []
        setDraft([...anchors])
        const initialDocs = new Set(anchors.map((id) => String(id).split('#')[0]).filter(Boolean))
        setExpandedDocs(initialDocs)
        setDocPages({})
        anchor.clear(questionId)
        setEditing(true)
        if (docs === null) {
          callOp('listDocuments', { kb_id: kbId })
            .then((rows) => setDocs(Array.isArray(rows) ? rows : []))
            .catch(() => setDocs([]))
        }
        for (const docId of initialDocs) loadDocPage(docId, 0)
      }
      const exitEdit = () => {
        setEditing(false)
        anchor.clear(questionId)
      }
      const toggleDoc = (docId) => {
        setExpandedDocs((current) => {
          const next = new Set(current)
          if (next.has(docId)) next.delete(docId)
          else next.add(docId)
          return next
        })
        if (expandedDocs.has(docId) === false && !docPages[docId]) loadDocPage(docId, 0)
      }
      const toggleDraft = (chunkId) => {
        setDraft((current) =>
          current.indexOf(chunkId) >= 0 ? current.filter((id) => id !== chunkId) : [...current, chunkId],
        )
        anchor.clear(questionId)
      }
      const toggleChunk = (chunkId) => {
        setOpenChunks((current) => {
          const next = new Set(current)
          if (next.has(chunkId)) next.delete(chunkId)
          else next.add(chunkId)
          return next
        })
      }
      const submitAnchors = (ack) =>
        callOp('updateEvalQuestion', {
          kb_id: kbId,
          question_id: questionId,
          body: ack ? { relevant_chunk_ids: [...draft], anchor_ack: true } : { relevant_chunk_ids: [...draft] },
        })
      const save = (mode) => {
        setBusy(true)
        const guarded =
          mode === 'ack' ? anchor.confirm(questionId, submitAnchors) : anchor.submit(questionId, submitAnchors)
        guarded
          .then((saved) => {
            if (!saved) return
            setEditing(false)
            onSaved()
          })
          .catch((error) => notify(errorDetail(error), true))
          .finally(() => setBusy(false))
      }
      if (question === null) return null
      const cardHead = (label, extra) =>
        h('div', { className: 'hrag-ev-cardhead hrag-ev-cardhead-open' }, label, extra || null)
      const readBody =
        groups.length === 0
          ? h('p', { className: 'hrag-ev-muted hrag-ev-cardnote' }, tk('ev.questions.unanchored'))
          : groups.map((group) =>
              h(
                'div',
                { key: group.docId, className: 'hrag-ev-anchorgroup' },
                h('div', { className: 'hrag-ev-anchordoc', title: docTitle(group.docId) }, docTitle(group.docId)),
                group.sequences.map((sequence) => {
                  const chunkId = group.docId + '#' + sequence
                  const chunk = chunkById.get(chunkId)
                  const dangling = chunks !== null && chunk === undefined
                  if (dangling) {
                    return h(
                      'div',
                      { key: chunkId, className: 'hrag-ev-danglingrow' },
                      h('span', { className: 'hrag-ev-badge hrag-ev-badge-danger hrag-ev-tabnums' }, '#' + sequence),
                      h('span', null, tk('ev.questions.danglingBadge')),
                    )
                  }
                  const open = openChunks.has(chunkId)
                  const suspect = concern !== null && concern.chunk_ids.indexOf(chunkId) >= 0
                  return h(
                    'div',
                    { key: chunkId, className: 'hrag-ev-anchorchunk' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-ev-anchorchunk-trigger',
                        'aria-expanded': open,
                        title: suspect && concern ? concern.miss_terms.join(' ') : null,
                        onClick: () => toggleChunk(chunkId),
                      },
                      h('span', { className: 'hrag-ev-caret' + (open ? ' hrag-ev-caret-open' : '') }, '▾'),
                      h('span', { className: 'hrag-ev-badge hrag-ev-tabnums' }, '#' + sequence),
                      suspect
                        ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-amber' }, tk('ev.questions.mismatchBadge'))
                        : null,
                      !open && chunk !== undefined
                        ? h('span', { className: 'hrag-ev-anchorchunk-preview' }, preview(chunk.text))
                        : null,
                    ),
                    open && chunk !== undefined
                      ? h('div', { className: 'hrag-ev-anchorchunk-body' }, String(chunk.text))
                      : null,
                  )
                }),
              ),
            )
      const editBody = h(
        React.Fragment,
        null,
        (docs || []).map((doc) => {
          const page = docPages[doc.id] || { items: [], total: 0, loading: false }
          const total = docPages[doc.id] !== undefined ? page.total : doc.chunk_count || 0
          const selectedCount = draft.filter((id) => String(id).indexOf(doc.id + '#') === 0).length
          const expanded = expandedDocs.has(doc.id)
          return h(
            'div',
            { key: doc.id, className: 'hrag-ev-editgroup' },
            h(
              'button',
              { type: 'button', className: 'hrag-ev-anchordoc hrag-ev-editgroup-head', 'aria-expanded': expanded, onClick: () => toggleDoc(doc.id) },
              h('span', { className: 'hrag-ev-caret' + (expanded ? ' hrag-ev-caret-open' : '') }, '▾'),
              h('span', { className: 'hrag-ev-editgroup-name', title: String(doc.name) }, String(doc.name)),
              h('span', { className: 'hrag-ev-muted hrag-ev-tabnums' }, tk('ev.questions.anchorEditSelected', selectedCount, total)),
            ),
            expanded
              ? h(
                  'div',
                  { className: 'hrag-ev-editgroup-body' },
                  page.items.map((chunk) =>
                    h(
                      'label',
                      { key: chunk.chunk_id, className: 'hrag-ev-checklabel hrag-ev-checklabel-block' },
                      h('input', {
                        type: 'checkbox',
                        className: 'hrag-ev-check',
                        checked: draft.indexOf(chunk.chunk_id) >= 0,
                        onChange: () => toggleDraft(chunk.chunk_id),
                      }),
                      h('span', { className: 'hrag-ev-editgroup-preview' }, preview(chunk.text)),
                    ),
                  ),
                  draft
                    .filter((id) => String(id).indexOf(doc.id + '#') === 0 && danglingIds.has(id))
                    .map((id) =>
                      h(
                        'label',
                        { key: id, className: 'hrag-ev-checklabel hrag-ev-checklabel-block' },
                        h('input', {
                          type: 'checkbox',
                          className: 'hrag-ev-check',
                          checked: true,
                          onChange: () => toggleDraft(id),
                        }),
                        h('span', { className: 'hrag-ev-badge hrag-ev-badge-danger hrag-ev-tabnums' }, '#' + String(id).split('#')[1]),
                        h('span', { className: 'hrag-ev-danger-text' }, tk('ev.questions.danglingBadge')),
                      ),
                    ),
                  page.items.length < page.total
                    ? h(
                        'button',
                        {
                          type: 'button',
                          className: 'hrag-btn hrag-btn-outline hrag-ev-loadmore',
                          disabled: page.loading,
                          onClick: () => loadDocPage(doc.id, page.items.length),
                        },
                        tk('ev.questions.loadMore'),
                      )
                    : null,
                )
              : null,
          )
        }),
        h(
          'div',
          { className: 'hrag-ev-editactions' },
          h(
            'button',
            { type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: busy, onClick: () => save('submit') },
            tk('ev.questions.save'),
          ),
          h(
            'button',
            { type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: busy, onClick: exitEdit },
            tk('ev.questions.cancel'),
          ),
        ),
        anchorBlock !== null
          ? h(EvalAnchorNotice, {
              tk,
              detail: anchorBlock,
              confirmLabel: tk('ev.anchorBlock.confirmUpdate'),
              confirming: busy,
              onConfirm: () => save('ack'),
            })
          : null,
      )
      return h(
        'div',
        { className: 'hrag-graph-drawer' },
        h('div', { className: 'hrag-drawer-overlay', onClick: onClose }),
        h(
          'div',
          { className: 'hrag-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': tk('ev.questions.drawerTitle') },
          h(
            'div',
            { className: 'hrag-drawer-head' },
            h('span', { className: 'hrag-drawer-title hrag-ev-drawer-qtitle', title: String(question.query) }, String(question.query)),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline hrag-drawer-close', 'aria-label': t('chunk.close'), onClick: onClose },
              '✕',
            ),
          ),
          h(
            'div',
            { className: 'hrag-drawer-body hrag-ev-drawerbody' },
            h(
              'div',
              { className: 'hrag-ev-chips' },
              h('span', { className: 'hrag-ev-badge' }, tk('ev.category.' + question.category)),
              question.expected_paths.map((path) => h('span', { key: path, className: 'hrag-ev-badge' }, path)),
            ),
            h(
              'section',
              { className: 'hrag-ev-card' },
              cardHead(tk('ev.questions.answerSection')),
              h(
                'div',
                { className: 'hrag-ev-cardbody' },
                question.reference_answer
                  ? h('p', { className: 'hrag-ev-pre' }, question.reference_answer)
                  : h('p', { className: 'hrag-ev-muted' }, tk('ev.questions.noReferenceAnswer')),
              ),
            ),
            h(
              'section',
              { className: 'hrag-ev-card' },
              cardHead(
                tk('ev.questions.columnRefChunks'),
                h(
                  'span',
                  { className: 'hrag-ev-cardhead-side' },
                  question.relevant_chunk_ids.length > 0
                    ? h('span', { className: 'hrag-ev-badge hrag-ev-tabnums' }, tk('ev.questions.drawerChunksCount', question.relevant_chunk_ids.length))
                    : null,
                  h(
                    'button',
                    { type: 'button', className: 'hrag-ev-iconbtn hrag-ev-iconbtn-text', onClick: editing ? exitEdit : enterEdit },
                    tk('ev.questions.anchorEditButton'),
                  ),
                ),
              ),
              h('div', { className: 'hrag-ev-cardbody' }, editing ? editBody : readBody),
            ),
            question.relevant_entities && question.relevant_entities.length > 0
              ? h(
                  'section',
                  { className: 'hrag-ev-card' },
                  cardHead(
                    tk('ev.questions.entitiesSection'),
                    h('span', { className: 'hrag-ev-badge hrag-ev-tabnums hrag-ev-cardhead-side' }, String(question.relevant_entities.length)),
                  ),
                  h(
                    'div',
                    { className: 'hrag-ev-chipwrap' },
                    question.relevant_entities.map((entity) => h('span', { key: entity, className: 'hrag-ev-badge' }, entity)),
                  ),
                )
              : null,
          ),
          h(
            'div',
            { className: 'hrag-ev-footer' },
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => onReproduce && onReproduce(question.query) },
              '↗ ' + tk('ev.questions.rowReproduce'),
            ),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline hrag-ev-danger-text', onClick: () => onDelete(question) },
              tk('ev.questions.rowDelete'),
            ),
          ),
        ),
      )
    }

    /** 历史视图（照 EvalRunHistory）：五列表（时间胶囊：回退红/基线琥珀｜
        环境｜评测内容｜状态｜时长右对齐）＋行右键两态（单删/批删）＋行级删除
        确认（含基线警示）；行点击＝run 详情抽屉。时长紧凑/按秒下拉；选中动作
        只在右键菜单，底条已按工作台退役。 */
    function EvalHistory({ t, tk, kbId, runsQ, onOpenRun, notify }) {
      const [selectedIds, setSelectedIds] = React.useState(() => new Set())
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [sortKey, setSortKey] = React.useState('default')
      const [sortDir, setSortDir] = React.useState('asc')
      // ③档批 H2/H3：时长格式下拉＋行右键两态菜单。
      const [durationFormat, setDurationFormat] = React.useState('compact')
      const [ctxMenu, setCtxMenu] = React.useState(null)
      React.useEffect(() => {
        setSelectedIds(new Set())
        setDeleteTargets(null)
        setCtxMenu(null)
      }, [kbId])
      const runs = runsQ.data && Array.isArray(runsQ.data.runs) ? runsQ.data.runs : []
      React.useEffect(() => {
        const alive = runs.filter((run) => selectedIds.has(run.run_id))
        if (alive.length !== selectedIds.size) setSelectedIds(new Set(alive.map((run) => run.run_id)))
      }, [runs, selectedIds])
      const envLabel = (run) =>
        run.environment === 'ci'
          ? tk('ev.history.envCi')
          : run.environment === 'nightly'
            ? tk('ev.history.envNightly')
            : tk('ev.history.envLocal')
      const scopeLabel = (run) =>
        run.has_layer1 && run.has_layer2
          ? tk('ev.history.scopeFull')
          : run.has_layer1
            ? tk('ev.history.scopeQuick')
            : run.has_layer2
              ? tk('ev.history.scopeGeneration')
              : null
      const statusLabel = (run) =>
        run.status === 'error'
          ? tk('ev.history.statusError')
          : run.status === 'skipped'
            ? tk('ev.history.statusSkipped')
            : run.status === 'cancelled'
              ? tk('ev.history.statusCancelled')
              : tk('ev.history.statusCompleted')
      const statusGlyph = (run) => (run.status === 'error' ? '✕' : run.status === 'skipped' ? '‣' : run.status === 'cancelled' ? '⊘' : '✓')
      const durationText = (run) => {
        const secs = evRunDurationSeconds(run)
        if (secs === null) return null
        return durationFormat === 'seconds'
          ? evText(t('ev.durSeconds'), [Math.round(secs)])
          : evDurationText(t, secs)
      }
      const sortedRuns = React.useMemo(() => {
        if (sortKey === 'default') return runs
        const sign = sortDir === 'asc' ? 1 : -1
        const value = (run) => {
          if (sortKey === 'time') return run.created_at ? Date.parse(run.created_at) : null
          if (sortKey === 'env') return envLabel(run)
          if (sortKey === 'scope') return scopeLabel(run)
          if (sortKey === 'status') return statusLabel(run)
          if (sortKey === 'duration') return evRunDurationSeconds(run)
          return null
        }
        return [...runs].sort((a, b) => {
          const av = value(a)
          const bv = value(b)
          if (av == null && bv == null) return 0
          if (av == null) return 1
          if (bv == null) return -1
          if (typeof av === 'string' && typeof bv === 'string') return sign * (av < bv ? -1 : av > bv ? 1 : 0)
          return sign * (Number(av) - Number(bv))
        })
      }, [runs, sortKey, sortDir])
      const toggleRun = (runId, checked) => {
        const next = new Set(selectedIds)
        if (checked) next.add(runId)
        else next.delete(runId)
        setSelectedIds(next)
      }
      const allSelected = runs.length > 0 && runs.every((run) => selectedIds.has(run.run_id))
      const toggleSelectAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(runs.map((run) => run.run_id)))
      }
      const handleDeleteConfirm = () => {
        if (deleteTargets === null) return
        setBusy(true)
        const removed = new Set(deleteTargets)
        callOp('deleteEvalRuns', { kb_id: kbId, body: { run_ids: deleteTargets } })
          .then(() => {
            notify(tk('ev.history.deletedToast'))
            setSelectedIds((current) => new Set([...current].filter((id) => !removed.has(id))))
            setDeleteTargets(null)
            runsQ.refresh()
          })
          .catch(() => notify(tk('ev.history.deleteFailed'), true))
          .finally(() => setBusy(false))
      }
      const targetRuns = (deleteTargets || []).map((id) => runs.find((run) => run.run_id === id)).filter(Boolean)
      const targetsIncludeBaseline = targetRuns.some((run) => run.is_baseline)
      const rowMenu = (run) =>
        h(EvalMenu, {
          className: 'hrag-ev-rowmenu',
          label: '⋯',
          align: 'end',
          render: (close) => [
            h(
              EvalMenuItem,
              {
                key: 'del',
                danger: true,
                onSelect: () => {
                  close()
                  setDeleteTargets([run.run_id])
                },
              },
              tk('ev.history.rowDelete'),
            ),
          ],
        })
      let table = null
      if (runsQ.failure) {
        table = h('div', { className: 'hrag-ev-hint hrag-ev-hint-full hrag-ev-hint-error' }, tk('ev.loadFailed'))
      } else if (runsQ.data === null) {
        table = h('div', { className: 'hrag-ev-hint hrag-ev-hint-full' }, tk('ev.loading'))
      } else if (runs.length === 0) {
        table = h('div', { className: 'hrag-ev-hint hrag-ev-hint-full' }, tk('ev.history.emptyHistory'))
      } else {
        table = h(
          'table',
          { className: 'hrag-ev-table hrag-ev-banktable' + (selectedIds.size > 0 ? ' hrag-ev-bank-selecting' : '') },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h(
                'th',
                { className: 'hrag-ev-th-check' },
                h('input', {
                  type: 'checkbox',
                  className: 'hrag-ev-check',
                  'aria-label': tk('ev.selection.selectAllAria'),
                  checked: allSelected,
                  onChange: toggleSelectAll,
                }),
              ),
              h('th', null, tk('ev.history.colTime')),
              h('th', null, tk('ev.history.colEnv')),
              h('th', null, tk('ev.history.colScope')),
              h('th', null, tk('ev.history.colStatus')),
              h(
                'th',
                { className: 'hrag-ev-th-num' },
                h(
                  'span',
                  { className: 'hrag-ev-th-numlabel' },
                  tk('ev.history.colDuration'),
                  h(EvalMenu, {
                    icon: dshChevronDownIcon(),
                    className: 'hrag-ev-th-menu',
                    title: tk('ev.history.durFormatLabel'),
                    align: 'end',
                    render: (close) => [
                      h('div', { key: 'label', className: 'hrag-ev-menu-note' }, tk('ev.history.durFormatLabel')),
                      h(
                        EvalMenuItem,
                        {
                          key: 'compact',
                          selected: durationFormat === 'compact',
                          onSelect: () => {
                            setDurationFormat('compact')
                            close()
                          },
                        },
                        tk('ev.history.durFormatCompact'),
                      ),
                      h(
                        EvalMenuItem,
                        {
                          key: 'seconds',
                          selected: durationFormat === 'seconds',
                          onSelect: () => {
                            setDurationFormat('seconds')
                            close()
                          },
                        },
                        tk('ev.history.durFormatSeconds'),
                      ),
                    ],
                  }),
                ),
              ),
              h(
                'th',
                { className: 'hrag-ev-th-sort' },
                h(EvalMenu, {
                  icon: lucideSortIcon(),
                  title: tk('sort.title'),
                  align: 'end',
                  render: (close) => [
                    h(EvalMenuItem, { key: 'default', selected: sortKey === 'default', onSelect: () => { setSortKey('default'); close() } }, tk('ev.questions.sortDefault')),
                    h(EvalMenuItem, { key: 'time', selected: sortKey === 'time', onSelect: () => { setSortKey('time'); close() } }, tk('ev.history.colTime')),
                    h(EvalMenuItem, { key: 'env', selected: sortKey === 'env', onSelect: () => { setSortKey('env'); close() } }, tk('ev.history.colEnv')),
                    h(EvalMenuItem, { key: 'scope', selected: sortKey === 'scope', onSelect: () => { setSortKey('scope'); close() } }, tk('ev.history.colScope')),
                    h(EvalMenuItem, { key: 'status', selected: sortKey === 'status', onSelect: () => { setSortKey('status'); close() } }, tk('ev.history.colStatus')),
                    h(EvalMenuItem, { key: 'duration', selected: sortKey === 'duration', onSelect: () => { setSortKey('duration'); close() } }, tk('ev.history.colDuration')),
                    h('div', { key: 'sep', className: 'hrag-ev-menu-sep' }),
                    h(EvalMenuItem, { key: 'asc', selected: sortDir === 'asc', onSelect: () => { setSortDir('asc'); close() } }, t('sort.asc')),
                    h(EvalMenuItem, { key: 'desc', selected: sortDir === 'desc', onSelect: () => { setSortDir('desc'); close() } }, t('sort.desc')),
                  ],
                }),
              ),
            ),
          ),
          h(
            'tbody',
            null,
            sortedRuns.map((run) => {
              const isSelected = selectedIds.has(run.run_id)
              const timeTone = run.regression_detected
                ? ' hrag-ev-time-regression'
                : run.is_baseline
                  ? ' hrag-ev-time-baseline'
                  : ''
              const scope = scopeLabel(run)
              return h(
                'tr',
                {
                  key: run.run_id,
                  className: 'hrag-ev-tr' + (isSelected ? ' hrag-ev-tr-on' : ''),
                  onClick: () => onOpenRun(run.run_id),
                  onContextMenu: (event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    const already = selectedIds.has(run.run_id)
                    const next = already ? selectedIds : new Set([run.run_id])
                    if (!already) setSelectedIds(next)
                    setCtxMenu({
                      x: event.clientX,
                      y: event.clientY,
                      run,
                      batch: already && next.size > 1,
                    })
                  },
                },
                h(
                  'td',
                  { className: 'hrag-ev-th-check' },
                  h('input', {
                    type: 'checkbox',
                    className: 'hrag-ev-check',
                    'aria-label': tk('ev.history.rowSelectAria', evFmtRunTime(run.created_at)),
                    checked: isSelected,
                    onClick: (event) => event.stopPropagation(),
                    onChange: (event) => toggleRun(run.run_id, event.target.checked),
                  }),
                ),
                h(
                  'td',
                  null,
                  h('span', { className: 'hrag-ev-time' + timeTone, title: evFmtFullTime(run.created_at) }, evFmtRunTime(run.created_at)),
                ),
                h('td', null, h('span', { className: 'hrag-ev-badge' }, envLabel(run))),
                h('td', { className: scope === null ? 'hrag-ev-muted' : null }, scope === null ? '—' : scope),
                h(
                  'td',
                  null,
                  h('span', { className: 'hrag-ev-status hrag-ev-status-' + run.status }, statusGlyph(run) + ' ' + statusLabel(run)),
                ),
                h('td', { className: 'hrag-ev-th-num hrag-ev-muted hrag-ev-tabnums' }, durationText(run) || '—'),
                h(
                  'td',
                  { className: 'hrag-ev-th-sort' },
                  h('span', { className: 'hrag-ev-rowmenu-wrap', onClick: (event) => event.stopPropagation() }, rowMenu(run)),
                ),
              )
            }),
          ),
        )
      }
      return h(
        'div',
        { className: 'hrag-ev-bank' },
        h('div', { className: 'hrag-ev-bankscroll' }, table),
        ctxMenu !== null
          ? h(DocContextMenu, {
              t,
              x: ctxMenu.x,
              y: ctxMenu.y,
              items: ctxMenu.batch
                ? [
                    { id: 'count', label: tk('ev.history.selectedCount', selectedIds.size), disabled: true },
                    { id: 'cancel', label: tk('ev.selection.clear'), icon: dshCloseIcon() },
                    { type: 'separator', id: 'sep' },
                    { id: 'delete', label: tk('ev.selection.deleteSelected'), icon: dshTrashIcon(), danger: true },
                  ]
                : [
                    { id: 'cancel', label: tk('ev.selection.clear'), icon: dshCloseIcon() },
                    { type: 'separator', id: 'sep' },
                    { id: 'delete', label: tk('ev.history.rowDelete'), icon: dshTrashIcon(), danger: true },
                  ],
              onClose: () => setCtxMenu(null),
              onSelect: (id) => {
                if (id === 'cancel') setSelectedIds(new Set())
                else if (id === 'delete') {
                  setDeleteTargets(ctxMenu.batch ? [...selectedIds] : [ctxMenu.run.run_id])
                }
              },
            })
          : null,
        deleteTargets !== null
          ? h(ConfirmDialog, {
              t,
              title: tk('ev.history.deleteConfirmTitle'),
              description:
                (deleteTargets.length === 1 && targetRuns[0]
                  ? evFmtRunTime(targetRuns[0].created_at) + ' · ' + envLabel(targetRuns[0])
                  : tk('ev.selection.selected', deleteTargets.length)) +
                ' ' +
                tk('ev.history.deleteConfirmDesc', deleteTargets.length) +
                (targetsIncludeBaseline ? ' ' + tk('ev.history.baselineWarn') : ''),
              busy,
              cancelKey: 'doc.cancel',
              confirmKey: 'doc.confirmDelete',
              onCancel: () => setDeleteTargets(null),
              onConfirm: handleDeleteConfirm,
            })
          : null,
      )
    }

    /** 存为考题弹层（照 EvalSaveQuestionDialog，Task 8 补面）：召回面板勾选
        切片后一键入题库——query 预填可改、分类默认事实、预期路径默认＝勾选
        来源路径集合（混路即多选）、参考答案可选；锚定集＝selectedChunkIds。
        B′ 红块同接线；普通错误内联（面板无 toast 面）。 */
    function EvalSaveAsQuestionDialog({ t, kbId, open, onClose, prefillQuery, defaultPaths, selectedChunkIds, selectionCount, onSaved }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [query, setQuery] = React.useState('')
      const [category, setCategory] = React.useState('fact')
      const [paths, setPaths] = React.useState([])
      const [referenceAnswer, setReferenceAnswer] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [errorText, setErrorText] = React.useState(null)
      const anchor = useAnchorBlocks()
      const anchorBlock = anchor.blockFor('save')
      const openPrevRef = React.useRef(false)
      // 升沿重置（props 派生数组每渲染新引用——仅 open 翻真那拍重置，防编辑中被打断）。
      React.useEffect(() => {
        if (open && !openPrevRef.current) {
          setQuery(prefillQuery || '')
          setCategory('fact')
          setPaths([...(defaultPaths || [])])
          setReferenceAnswer('')
          setErrorText(null)
          anchor.clear('save')
        }
        openPrevRef.current = open
      }, [open, prefillQuery, defaultPaths])
      if (!open) return null
      const togglePath = (path) =>
        setPaths((current) =>
          current.indexOf(path) >= 0 ? current.filter((item) => item !== path) : [...current, path],
        )
      const canSubmit = query.trim().length > 0 && paths.length > 0 && !busy
      const submitQuestion = (ack) =>
        callOp('createEvalQuestion', {
          kb_id: kbId,
          body: {
            query: query.trim(),
            category,
            expected_paths: paths,
            relevant_chunk_ids: [...selectedChunkIds],
            reference_answer: referenceAnswer.trim() ? referenceAnswer.trim() : null,
            anchor_ack: ack,
          },
        })
      const run = (mode) => {
        setBusy(true)
        setErrorText(null)
        const guarded = mode === 'ack' ? anchor.confirm('save', submitQuestion) : anchor.submit('save', submitQuestion)
        guarded
          .then((saved) => {
            if (!saved) return
            onSaved()
            onClose()
          })
          .catch((error) => setErrorText(errorDetail(error)))
          .finally(() => setBusy(false))
      }
      return h(
        'div',
        {
          className: 'hrag-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onClose()
          },
        },
        h(
          'div',
          { className: 'hrag-dialog hrag-dialog-wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': tk('recall.saveAs.button') },
          h('div', { className: 'hrag-dialog-title' }, tk('recall.saveAs.button')),
          h('div', { className: 'hrag-dialog-body' }, tk('recall.saveAs.selectedCount', selectionCount)),
          h(
            'div',
            { className: 'hrag-ev-form' },
            h(
              'label',
              { className: 'hrag-ev-field' },
              h('span', { className: 'hrag-ev-fieldlabel' }, tk('recall.saveAs.queryLabel')),
              h('textarea', {
                className: 'hrag-input hrag-ev-textarea',
                'aria-label': tk('recall.saveAs.queryLabel'),
                value: query,
                onChange: (event) => setQuery(event.target.value),
              }),
            ),
            h(
              'div',
              { className: 'hrag-ev-formrow' },
              h(
                'label',
                { className: 'hrag-ev-field' },
                h('span', { className: 'hrag-ev-fieldlabel' }, tk('recall.saveAs.categoryLabel')),
                h(
                  'select',
                  {
                    className: 'hrag-input hrag-ev-select',
                    'aria-label': tk('recall.saveAs.categoryLabel'),
                    value: category,
                    onChange: (event) => setCategory(event.target.value),
                  },
                  ['fact', 'relation', 'concept', 'global'].map((id) =>
                    h('option', { key: id, value: id }, tk('ev.category.' + id)),
                  ),
                ),
              ),
              h(
                'div',
                { className: 'hrag-ev-field' },
                h('span', { className: 'hrag-ev-fieldlabel' }, tk('recall.saveAs.expectedPathsLabel')),
                h(
                  'span',
                  { className: 'hrag-ev-checkrow' },
                  ['vector', 'graph', 'wiki'].map((path) =>
                    h(
                      'label',
                      { key: path, className: 'hrag-ev-checklabel' },
                      h('input', {
                        type: 'checkbox',
                        className: 'hrag-ev-check',
                        checked: paths.indexOf(path) >= 0,
                        onChange: () => togglePath(path),
                      }),
                      path,
                    ),
                  ),
                ),
              ),
            ),
            h('p', { className: 'hrag-ev-muted hrag-ev-formnote' }, tk('recall.saveAs.anchorHint')),
            h(
              'label',
              { className: 'hrag-ev-field' },
              h('span', { className: 'hrag-ev-fieldlabel' }, tk('recall.saveAs.referenceAnswerLabel')),
              h('textarea', {
                className: 'hrag-input hrag-ev-textarea',
                'aria-label': tk('recall.saveAs.referenceAnswerLabel'),
                value: referenceAnswer,
                onChange: (event) => {
                  setReferenceAnswer(event.target.value)
                  anchor.clear('save')
                },
              }),
            ),
          ),
          errorText ? h('div', { className: 'hrag-dialog-error' }, errorText) : null,
          anchorBlock !== null
            ? h(EvalAnchorNotice, {
                tk,
                detail: anchorBlock,
                confirmLabel: tk('ev.anchorBlock.confirmSave'),
                confirming: busy,
                onConfirm: () => run('ack'),
              })
            : null,
          h(
            'div',
            { className: 'hrag-dialog-actions' },
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: busy, onClick: onClose },
              tk('recall.saveAs.cancel'),
            ),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: !canSubmit, onClick: () => run('submit') },
              tk('recall.saveAs.submit'),
            ),
          ),
        ),
      )
    }

    /** 百科书页图标（16 视窗、stroke 1.2、currentColor；工作台 BookOpen 等价物）。 */
    function wikiBookIcon(size) {
      return h(
        'svg',
        { width: size || 14, height: size || 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M2 2.5h3.5A2.5 2.5 0 0 1 8 5v8.5a2 2 0 0 0-2-1.5H2z',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M14 2.5h-3.5A2.5 2.5 0 0 0 8 5v8.5a2 2 0 0 1 2-1.5h4z',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
      )
    }

    /** 便签图标（16 视窗、stroke 1.2；工作台 StickyNote 等价物）。 */
    function wikiNoteIcon(size) {
      return h(
        'svg',
        { width: size || 14, height: size || 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('path', {
          d: 'M10.5 1.5h-7A1.5 1.5 0 0 0 2 3v10a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 13V5z',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M10.5 1.5V5H14',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
      )
    }

    // ── 我的条目管理面（②档丙对，2026-10-18）：抽屉分组模型 ──────────────
    // 照工作台 core/card-drawers.ts：localStorage 分区、每卡至多一屉；
    // 无归属/归属指向已删抽屉 ⇒ 未分组（首页）。后端只存卡片本身。
    const CARD_DRAWER_ICON_KEYS = ['folder', 'star', 'layers', 'briefcase', 'target', 'zap', 'flag', 'heart', 'bookmark', 'clock', 'message', 'grid']
    const CARD_DRAWER_COLOR_KEYS = ['emerald', 'teal', 'sky', 'blue', 'indigo', 'violet', 'purple', 'pink', 'rose', 'orange', 'amber', 'lime']
    const CARD_DRAWER_COLORS = {
      emerald: { accent: '#10B981' },
      teal: { accent: '#14B8A6' },
      sky: { accent: '#0EA5E9' },
      blue: { accent: '#3B82F6' },
      indigo: { accent: '#6366F1' },
      violet: { accent: '#8B5CF6' },
      purple: { accent: '#A855F7' },
      pink: { accent: '#EC4899' },
      rose: { accent: '#F43F5E' },
      orange: { accent: '#F97316' },
      amber: { accent: '#F59E0B' },
      lime: { accent: '#84CC16' },
    }
    const CARD_DRAWER_DEFAULT_ICON = 'folder'
    const CARD_DRAWER_DEFAULT_COLOR = 'emerald'
    const CARD_DRAWER_ICON_SET = new Set(CARD_DRAWER_ICON_KEYS)
    const CARD_DRAWER_COLOR_SET = new Set(CARD_DRAWER_COLOR_KEYS)

    /** 工作台 drawer-icon.tsx 的 lucide 节点逐字（v0.562）；含 circle/rect 的
        四枚不能只走 path——通用渲染器按 node[0] 分发。 */
    const CARD_DRAWER_ICON_NODES = {
      folder: [['path', { d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' }]],
      star: [['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }]],
      layers: [
        ['path', { d: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z' }],
        ['path', { d: 'M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12' }],
        ['path', { d: 'M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17' }],
      ],
      briefcase: [
        ['path', { d: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }],
        ['rect', { width: 20, height: 14, x: 2, y: 6, rx: 2 }],
      ],
      target: [
        ['circle', { cx: 12, cy: 12, r: 10 }],
        ['circle', { cx: 12, cy: 12, r: 6 }],
        ['circle', { cx: 12, cy: 12, r: 2 }],
      ],
      zap: [['path', { d: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' }]],
      flag: [['path', { d: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528' }]],
      heart: [['path', { d: 'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5' }]],
      bookmark: [['path', { d: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z' }]],
      clock: [
        ['path', { d: 'M12 6v6l4 2' }],
        ['circle', { cx: 12, cy: 12, r: 10 }],
      ],
      message: [['path', { d: 'M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z' }]],
      grid: [
        ['rect', { width: 7, height: 7, x: 3, y: 3, rx: 1 }],
        ['rect', { width: 7, height: 7, x: 14, y: 3, rx: 1 }],
        ['rect', { width: 7, height: 7, x: 14, y: 14, rx: 1 }],
        ['rect', { width: 7, height: 7, x: 3, y: 14, rx: 1 }],
      ],
    }

    function cardDrawersKey(kbId) {
      return 'hrag-card-drawers.' + String(kbId) + '.v1'
    }

    /** 旧键（T5 前；工作台 `card-drawers.ts` 串逐字复制）——仅一次性迁移读用，勿删。 */
    function legacyCardDrawersKey(kbId) {
      return 'deerflow.knowledge.card-drawers.' + String(kbId) + '.v1'
    }

    function newCardDrawerId() {
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
      } catch (error) {
        // Fall through to the timestamp id.
      }
      return 'drawer-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    }

    /** 解析＋消毒；任何坏形降级为空态（分组是锦上添花，永不崩）。 */
    function sanitizeCardDrawers(parsed) {
      if (!parsed || typeof parsed !== 'object') return { drawers: [], membership: {} }
      const drawers = Array.isArray(parsed.drawers)
        ? parsed.drawers.flatMap((item) => {
            if (!item || typeof item !== 'object') return []
            if (typeof item.id !== 'string' || typeof item.name !== 'string') return []
            const icon = CARD_DRAWER_ICON_SET.has(item.icon) ? item.icon : CARD_DRAWER_DEFAULT_ICON
            const color = CARD_DRAWER_COLOR_SET.has(item.color) ? item.color : CARD_DRAWER_DEFAULT_COLOR
            return [{ id: item.id, name: item.name, icon: icon, color: color, ...(item.hidden === true ? { hidden: true } : {}) }]
          })
        : []
      const membership = {}
      if (parsed.membership && typeof parsed.membership === 'object' && !Array.isArray(parsed.membership)) {
        for (const [cardId, drawerId] of Object.entries(parsed.membership)) {
          if (typeof drawerId === 'string') membership[cardId] = drawerId
        }
      }
      return { drawers: drawers, membership: membership }
    }

    function readCardDrawers(kbId) {
      try {
        let raw = window.localStorage.getItem(cardDrawersKey(kbId))
        if (!raw) {
          // 一次性迁移（T5）：新键缺＋旧键在 ⇒ 旧值原样搬入新键、旧键删净
          // （坏值走既有容错回退空态；写失败则旧键保留、下次读重试）。
          const legacy = window.localStorage.getItem(legacyCardDrawersKey(kbId))
          if (legacy) {
            raw = legacy
            try {
              window.localStorage.setItem(cardDrawersKey(kbId), legacy)
              window.localStorage.removeItem(legacyCardDrawersKey(kbId))
            } catch (error) {
              // Best effort; the legacy key stays readable and is retried next read.
            }
          }
        }
        if (!raw) return { drawers: [], membership: {} }
        return sanitizeCardDrawers(JSON.parse(raw))
      } catch (error) {
        return { drawers: [], membership: {} }
      }
    }

    function writeCardDrawers(kbId, state) {
      try {
        window.localStorage.setItem(cardDrawersKey(kbId), JSON.stringify(state))
      } catch (error) {
        // Best effort only; the in-memory state still applies this session.
      }
    }

    function useCardDrawers(kbId) {
      const [state, setState] = React.useState(() => readCardDrawers(kbId))
      const [loadedKb, setLoadedKb] = React.useState(kbId)
      if (loadedKb !== kbId) {
        setLoadedKb(kbId)
        setState(readCardDrawers(kbId))
      }
      const persist = React.useCallback(
        (next) => {
          setState(next)
          writeCardDrawers(kbId, next)
        },
        [kbId],
      )
      const createDrawer = React.useCallback(
        (input) => {
          const drawer = {
            id: newCardDrawerId(),
            name: String(input.name || '').trim(),
            icon: input.icon,
            color: input.color,
          }
          persist({ ...state, drawers: state.drawers.concat([drawer]) })
          return drawer.id
        },
        [state, persist],
      )
      const updateDrawer = React.useCallback(
        (id, patch) => {
          persist({
            ...state,
            drawers: state.drawers.map((drawer) =>
              drawer.id === id
                ? {
                    ...drawer,
                    ...patch,
                    name: patch.name !== undefined ? String(patch.name).trim() : drawer.name,
                  }
                : drawer,
            ),
          })
        },
        [state, persist],
      )
      const deleteDrawer = React.useCallback(
        (id) => {
          const membership = {}
          for (const [cardId, drawerId] of Object.entries(state.membership)) {
            if (drawerId !== id) membership[cardId] = drawerId
          }
          persist({ drawers: state.drawers.filter((drawer) => drawer.id !== id), membership: membership })
        },
        [state, persist],
      )
      const setDrawerHidden = React.useCallback(
        (id, hidden) => {
          persist({
            ...state,
            drawers: state.drawers.map((drawer) => (drawer.id === id ? { ...drawer, hidden: hidden } : drawer)),
          })
        },
        [state, persist],
      )
      // 从「全部抽屉」找回：取消收起＋置顶；重建对象时不带 hidden 键（读写往返保真）。
      const revealDrawerToFront = React.useCallback(
        (id) => {
          const target = state.drawers.find((drawer) => drawer.id === id)
          if (!target) return
          const revealed = { id: target.id, name: target.name, icon: target.icon, color: target.color }
          persist({
            ...state,
            drawers: [revealed].concat(state.drawers.filter((drawer) => drawer.id !== id)),
          })
        },
        [state, persist],
      )
      const applyMove = React.useCallback(
        (cardIds, drawerId, baseState) => {
          const membership = { ...baseState.membership }
          for (const cardId of cardIds) {
            if (drawerId === null) delete membership[cardId]
            else membership[cardId] = drawerId
          }
          persist({ ...baseState, membership: membership })
        },
        [persist],
      )
      const moveCard = React.useCallback(
        (cardId, drawerId) => applyMove([cardId], drawerId, state),
        [applyMove, state],
      )
      // 批量移动单次 persist（逐张 moveCard 会各读同一 stale state 相互覆盖）。
      const moveCards = React.useCallback(
        (cardIds, drawerId) => applyMove(cardIds, drawerId, state),
        [applyMove, state],
      )
      return {
        drawers: state.drawers,
        membership: state.membership,
        createDrawer: createDrawer,
        updateDrawer: updateDrawer,
        deleteDrawer: deleteDrawer,
        setDrawerHidden: setDrawerHidden,
        revealDrawerToFront: revealDrawerToFront,
        moveCard: moveCard,
        moveCards: moveCards,
      }
    }

    /** 标签输入按中英文逗号切分（工作台 parseTags 同式）。 */
    function parseCardTags(input) {
      return String(input == null ? '' : input)
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    }

    /** 归属抽屉 id：无映射或映射指向已不存在的抽屉 ⇒ null（未分组）。 */
    function cardOwnerDrawerId(membership, drawerIds, cardId) {
      const owner = membership[cardId]
      return owner !== undefined && drawerIds.has(owner) ? owner : null
    }

    /** 当前标签的卡片（首页＝未分组；抽屉＝归属该抽屉）。 */
    function cardsForDrawer(cards, membership, drawerIds, activeDrawerId) {
      return cards.filter((card) => {
        const owner = cardOwnerDrawerId(membership, drawerIds, card.id)
        return activeDrawerId === null ? owner === null : owner === activeDrawerId
      })
    }

    /** 选中集是否已全部落在目标条目（目标项置灰判据；null＝未分组）。 */
    function allCardsInDrawer(cardIds, membership, drawerIds, drawerId) {
      return (
        cardIds.length > 0 &&
        cardIds.every((cardId) => cardOwnerDrawerId(membership, drawerIds, cardId) === drawerId)
      )
    }

    /** 抽屉/菜单图标：lucide 节点（path/circle/rect）通用渲染，默认 16px。 */
    function renderLucideNodes(nodes, size, color) {
      return h(
        'svg',
        {
          width: size || 16,
          height: size || 16,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          style: color ? { color: color } : undefined,
          'aria-hidden': 'true',
        },
        nodes.map((node, index) => h(node[0], { ...node[1], key: index })),
      )
    }

    /** 卡片管理面自用图标（工作台 lucide 真值；宿主无对应件档）。 */
    const CARD_UI_ICON_NODES = {
      layoutList: [
        ['rect', { width: 7, height: 7, x: 3, y: 3, rx: 1 }],
        ['rect', { width: 7, height: 7, x: 3, y: 14, rx: 1 }],
        ['path', { d: 'M14 4h7' }],
        ['path', { d: 'M14 9h7' }],
        ['path', { d: 'M14 15h7' }],
        ['path', { d: 'M14 20h7' }],
      ],
      searchCheck: [
        ['path', { d: 'm8 11 2 2 4-4' }],
        ['circle', { cx: 11, cy: 11, r: 8 }],
        ['path', { d: 'm21 21-4.3-4.3' }],
      ],
      searchX: [
        ['path', { d: 'm13.5 8.5-5 5' }],
        ['path', { d: 'm8.5 8.5 5 5' }],
        ['circle', { cx: 11, cy: 11, r: 8 }],
        ['path', { d: 'm21 21-4.3-4.3' }],
      ],
      folderPlus: [
        ['path', { d: 'M12 10v6' }],
        ['path', { d: 'M9 13h6' }],
        ['path', { d: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z' }],
      ],
      folderInput: [
        ['path', { d: 'M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1' }],
        ['path', { d: 'M2 13h10' }],
        ['path', { d: 'm9 16 3-3-3-3' }],
      ],
    }

    function cardUiIcon(name, size) {
      return renderLucideNodes(CARD_UI_ICON_NODES[name] || CARD_UI_ICON_NODES.folderPlus, size)
    }

    /** 抽屉图标：12 键之一；未知键回退 folder。 */
    function cardDrawerIcon(key, size, color) {
      return renderLucideNodes(
        CARD_DRAWER_ICON_NODES[CARD_DRAWER_ICON_SET.has(key) ? key : CARD_DRAWER_DEFAULT_ICON],
        size,
        color,
      )
    }

    /** 百科视图（Task 9）：统一搜索＋「生成条目」「我的条目」双卡分高（照工作台
        wiki-tab 定高分屏语义：都展开各半、收起一个让位另一个）；⋯ 承接更新/重建
        （重建走确认闸）；条目状态轮询（generating 3s＋触发后 12s 力度窗）；drain 边
        按 last_run 出真话提示；行级/批量更新与删除（编辑档不做＝富文本编辑另案）。 */
    function WikiView({ t, kbId, enabled, onOpenEntry, onOpenCard, command, onBusyChange }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [query, setQuery] = React.useState('')
      const [entriesCollapsed, setEntriesCollapsed] = React.useState(false)
      const [selectedIds, setSelectedIds] = React.useState(() => new Set())
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [entryCtx, setEntryCtx] = React.useState(null)
      const [editingEntry, setEditingEntry] = React.useState(null)
      const [entrySaving, setEntrySaving] = React.useState(false)
      const entryEditRef = React.useRef(0)
      const [regeneratingIds, setRegeneratingIds] = React.useState([])
      const [pending, setPending] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [rebuildOpen, setRebuildOpen] = React.useState(false)
      const [cardCommand, setCardCommand] = React.useState(null)
      const pollUntilRef = React.useRef(0)
      const manualRunRef = React.useRef(false)
      const cardCommandNonceRef = React.useRef(0)

      React.useEffect(() => {
        setQuery('')
        setSelectedIds(new Set())
        setDeleteTargets(null)
        setEntryCtx(null)
        entryEditRef.current += 1
        setEditingEntry(null)
        setEntrySaving(false)
        setRegeneratingIds([])
        manualRunRef.current = false
      }, [kbId])

      const notify = (text, isError) => showToast(text, { error: Boolean(isError) })
      const sendCardCommand = (kind) => setCardCommand({ kind: kind, nonce: ++cardCommandNonceRef.current })

      const entriesQ = useEvalCall(kbId, enabled, 'listWikiEntries', null, (payload) =>
        Boolean(payload && (payload.generation === 'generating' || Date.now() < pollUntilRef.current)),
      )
      const cardsQ = useEvalCall(kbId, enabled, 'listManualCards', { offset: 0, limit: 200 })

      const entries = entriesQ.data && Array.isArray(entriesQ.data.entries) ? entriesQ.data.entries : []
      const generation = entriesQ.data ? entriesQ.data.generation : null

      // drain 边（照工作台 page.tsx）：generating→idle；清局部目标；手动 run 真话提示。
      const prevGenerationRef = React.useRef(null)
      React.useEffect(() => {
        const prev = prevGenerationRef.current
        prevGenerationRef.current = generation
        const drained = prev === 'generating' && generation === 'idle'
        if (!drained) return
        setRegeneratingIds([])
        cardsQ.refresh()
        if (!manualRunRef.current) return
        manualRunRef.current = false
        if (entriesQ.data && entriesQ.data.last_run === 'failed') notify(tk('wk.updateFailed'), true)
        else notify(tk('wk.updated'))
      }, [generation, entriesQ.data, cardsQ, tk])

      const updating = pending || generation === 'generating'

      const triggerWiki = (mode, entryIds) => {
        setPending(true)
        const request =
          mode === 'entries'
            ? callOp('regenerateWikiEntries', { kb_id: kbId, entry_ids: entryIds })
            : callOp('generateWiki', { kb_id: kbId, mode })
        request
          .then((ack) => {
            if (ack && ack.status === 'already_running') {
              if (mode === 'entries') setRegeneratingIds([])
              notify(tk('wk.alreadyRunning'))
              return
            }
            manualRunRef.current = true
            pollUntilRef.current = Date.now() + 12000
            notify(tk('wk.enqueued'))
            entriesQ.refresh()
          })
          .catch((error) => {
            if (mode === 'entries') setRegeneratingIds([])
            notify(errorDetail(error), true)
          })
          .finally(() => setPending(false))
      }
      const handleRegenerateEntries = (entryIds) => {
        if (entryIds.length === 0) return
        setRegeneratingIds(entryIds)
        triggerWiki('entries', entryIds)
      }
      // 条目编辑（E3 收口）：列表只有摘要，先取详情再开弹层（请求防串）。
      const openEditEntry = (entry) => {
        const requestId = ++entryEditRef.current
        callOp('wikiEntry', { kb_id: kbId, entry_id: entry.id })
          .then((data) => {
            if (entryEditRef.current !== requestId) return
            if (!data) {
              notify(tk('wk.loadFailed'), true)
              return
            }
            setEditingEntry(data)
          })
          .catch((error) => {
            if (entryEditRef.current !== requestId) return
            notify(errorDetail(error) || tk('wk.loadFailed'), true)
          })
      }
      const closeEditEntry = () => {
        entryEditRef.current += 1
        setEditingEntry(null)
        setEntrySaving(false)
      }
      const handleSaveEntry = (content, supplementContent) => {
        if (!editingEntry) return Promise.resolve()
        setEntrySaving(true)
        return callOp('updateWikiEntry', {
          kb_id: kbId,
          entry_id: editingEntry.id,
          body: { content: content, supplement_content: supplementContent },
        })
          .then(() => {
            notify(tk('wk.wikiEntryUpdated'))
            closeEditEntry()
            entriesQ.refresh()
          })
          .catch((error) => {
            notify(errorDetail(error) || tk('wk.wikiEntryUpdateFailed'), true)
            throw error
          })
          .finally(() => setEntrySaving(false))
      }

      // 壳级菜单指令线（菜单批 Task 1）：菜单项先切百科、再以 nonce 发令，同令只消费一次。
      const commandNonceRef = React.useRef(0)
      React.useEffect(() => {
        if (!command || !command.nonce || commandNonceRef.current === command.nonce) return
        commandNonceRef.current = command.nonce
        triggerWiki(command.mode)
      }, [command])
      // 在飞态上报壳级（菜单「更新百科」行 spinner/禁用）。
      React.useEffect(() => {
        if (onBusyChange) onBusyChange(updating)
      }, [updating, onBusyChange])

      // 过滤（照工作台：条目标题+摘要；卡片过滤在 ManualCardsSection 内，仍限当前标签）。
      const needle = query.trim().toLowerCase()
      const visibleEntries = needle
        ? entries.filter(
            (entry) =>
              String(entry.title).toLowerCase().indexOf(needle) >= 0 ||
              String(entry.summary).toLowerCase().indexOf(needle) >= 0,
          )
        : entries
      const searching = needle.length > 0
      const entriesExpanded = !entriesCollapsed || (searching && visibleEntries.length > 0)

      // 过滤即清选择（照工作台：批量动作不触达看不见的行）。
      const lastQueryRef = React.useRef(query)
      if (lastQueryRef.current !== query) {
        lastQueryRef.current = query
        if (selectedIds.size > 0) setSelectedIds(new Set())
      }

      const toggleEntry = (entryId, checked) => {
        const next = new Set(selectedIds)
        if (checked) next.add(entryId)
        else next.delete(entryId)
        setSelectedIds(next)
      }
      const allVisibleSelected =
        visibleEntries.length > 0 && visibleEntries.every((entry) => selectedIds.has(entry.id))
      const toggleSelectAll = () => {
        setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleEntries.map((entry) => entry.id)))
      }
      const handleDeleteConfirm = () => {
        if (deleteTargets === null) return
        setBusy(true)
        const removed = new Set(deleteTargets.map((entry) => entry.id))
        Promise.allSettled(
          deleteTargets.map((entry) => callOp('deleteWikiEntry', { kb_id: kbId, entry_id: entry.id })),
        )
          .then(() => {
            setSelectedIds((current) => new Set([...current].filter((id) => !removed.has(id))))
            setDeleteTargets(null)
            entriesQ.refresh()
          })
          .finally(() => setBusy(false))
      }
      const rowUpdating = (entryId) =>
        regeneratingIds.indexOf(entryId) >= 0 || (updating && regeneratingIds.length === 0)

      // 生成条目右键两态（照工作台 wiki-panel 10-16 前形态）：未选中行＝单选它；
      // 已选中且多选＝批量态；批量条退役，更新/删除/取消全由右键承载。
      const openEntryContextMenu = (event, entry) => {
        event.preventDefault()
        event.stopPropagation()
        const already = selectedIds.has(entry.id)
        const next = already ? selectedIds : new Set([entry.id])
        if (!already) setSelectedIds(next)
        setEntryCtx({
          x: event.clientX,
          y: event.clientY,
          entry: entry,
          batch: already && next.size > 1,
        })
      }
      const entryContextItems = () => {
        if (!entryCtx) return []
        if (entryCtx.batch) {
          return [
            { type: 'label', id: 'sel', text: tk('wk.selectedCount', selectedIds.size) },
            {
              id: 'update-selected',
              label: tk('wk.updateSelected'),
              icon: refreshIcon(),
              disabled: updating,
            },
            { id: 'cancel', label: tk('wk.cancelSelection'), icon: dshCloseIcon() },
            { type: 'separator', id: 'batch-sep' },
            { id: 'delete-selected', label: tk('wk.deleteSelected'), icon: dshTrashIcon(), danger: true },
          ]
        }
        const items = [
          { id: 'open', label: tk('wk.openEntry'), icon: wikiBookIcon() },
          { id: 'edit', label: tk('wk.editEntry'), icon: dshEditIcon() },
          { id: 'update', label: tk('wk.updateEntry'), icon: refreshIcon(), disabled: updating },
        ]
        if (selectedIds.has(entryCtx.entry.id)) {
          items.push({ id: 'cancel', label: tk('wk.cancelSelection'), icon: dshCloseIcon() })
        }
        items.push({ type: 'separator', id: 'row-sep' })
        items.push({ id: 'delete', label: tk('wk.deleteEntry'), icon: dshTrashIcon(), danger: true })
        return items
      }
      const handleEntryContextAction = (id) => {
        if (!entryCtx) return
        const entry = entryCtx.entry
        if (id === 'open') onOpenEntry(entry.id)
        else if (id === 'edit') openEditEntry(entry)
        else if (id === 'update') handleRegenerateEntries([entry.id])
        else if (id === 'update-selected') handleRegenerateEntries([...selectedIds])
        else if (id === 'cancel') setSelectedIds(new Set())
        else if (id === 'delete') setDeleteTargets([entry])
        else if (id === 'delete-selected') {
          setDeleteTargets(entries.filter((item) => selectedIds.has(item.id)))
        }
      }

      const entryRowMenu = (entry) =>
        h(EvalMenu, {
          className: 'hrag-ev-rowmenu',
          label: '⋯',
          align: 'end',
          render: (close) => [
            h(
              EvalMenuItem,
              {
                key: 'open',
                icon: wikiBookIcon(),
                onSelect: () => {
                  close()
                  onOpenEntry(entry.id)
                },
              },
              tk('wk.openEntry'),
            ),
            h(
              EvalMenuItem,
              {
                key: 'edit',
                icon: dshEditIcon(),
                onSelect: () => {
                  close()
                  openEditEntry(entry)
                },
              },
              tk('wk.editEntry'),
            ),
            h(
              EvalMenuItem,
              {
                key: 'update',
                icon: refreshIcon(),
                disabled: updating,
                onSelect: () => {
                  close()
                  handleRegenerateEntries([entry.id])
                },
              },
              tk('wk.updateEntry'),
            ),
            h('div', { key: 'sep', className: 'hrag-ev-menu-sep' }),
            h(
              EvalMenuItem,
              {
                key: 'del',
                icon: dshTrashIcon(),
                danger: true,
                onSelect: () => {
                  close()
                  setDeleteTargets([entry])
                },
              },
              tk('wk.deleteEntry'),
            ),
          ],
        })

      const sectionEmpty = (icon, text) =>
        h('div', { className: 'hrag-wk-empty' }, h('span', { className: 'hrag-wk-empty-icon' }, icon), h('p', null, text))

      const entriesSection = h(
        'section',
        { className: 'hrag-wk-sect' + (entriesExpanded ? ' hrag-wk-sect-open' : '') },
        h(
          'div',
          { className: 'hrag-wk-secthead' },
          h(
            'button',
            {
              type: 'button',
              className: 'hrag-wk-secttoggle',
              'aria-expanded': entriesExpanded,
              onClick: () => setEntriesCollapsed((value) => !value),
            },
            h('span', { className: 'hrag-ev-caret hrag-wk-chev' + (entriesExpanded ? ' hrag-ev-caret-open' : '') }, lucideChevronDownIcon(1)),
            h('span', { className: 'hrag-wk-secticon' }, wikiBookIcon()),
            h('span', { className: 'hrag-wk-secttitle' }, tk('wk.entries')),
            h('span', { className: 'hrag-ev-badge hrag-ev-tabnums' }, String(entries.length)),
            updating
              ? h(
                  'span',
                  { className: 'hrag-ev-badge hrag-ev-badge-amber hrag-ev-spin-text' },
                  stateDot(14),
                  tk('wk.updating'),
                )
              : null,
          ),
          entriesExpanded && visibleEntries.length > 0
            ? h('input', {
                type: 'checkbox',
                className: 'hrag-ev-check',
                'aria-label': tk('wk.selectEntry'),
                checked: allVisibleSelected,
                onChange: toggleSelectAll,
              })
            : null,
        ),
        entriesExpanded
          ? entriesQ.failure
            ? h(
                'div',
                { className: 'hrag-ev-hint hrag-ev-hint-error hrag-wk-inset' },
                tk('wk.loadFailed'),
              )
            : entriesQ.data === null
              ? h('div', { className: 'hrag-ev-hint hrag-wk-inset' }, tk('wk.loading'))
              : visibleEntries.length === 0
                ? sectionEmpty(wikiBookIcon(28), entries.length === 0 ? tk('wk.entriesEmpty') : tk('wk.entriesNoMatch'))
                : h(
                    'div',
                    {
                      className:
                        'hrag-wk-list' + (selectedIds.size > 0 ? ' hrag-wk-list-selecting' : ''),
                    },
                    visibleEntries.map((entry) => {
                      const isSelected = selectedIds.has(entry.id)
                      const rowBusy = rowUpdating(entry.id)
                      return h(
                        'div',
                        {
                          key: entry.id,
                          className: 'hrag-wk-row' + (isSelected ? ' hrag-wk-row-on' : ''),
                          'data-selected': isSelected,
                          onContextMenu: (event) => openEntryContextMenu(event, entry),
                        },
                        h('input', {
                          type: 'checkbox',
                          className: 'hrag-ev-check',
                          'aria-label': tk('wk.selectEntry') + ': ' + entry.title,
                          checked: isSelected,
                          onChange: (event) => toggleEntry(entry.id, event.target.checked),
                        }),
                        h(
                          'button',
                          { type: 'button', className: 'hrag-wk-row-main', onClick: () => onOpenEntry(entry.id) },
                          h('span', { className: 'hrag-wk-rowicon' }, wikiBookIcon()),
                          h('span', { className: 'hrag-wk-rowtitle', title: entry.title }, entry.title),
                          h('span', { className: 'hrag-wk-rowsummary' }, stripSummaryHeading(entry.summary)),
                        ),
                        entry.status === 'dirty'
                          ? h(
                              'span',
                              {
                                className:
                                  'hrag-ev-badge hrag-ev-badge-amber hrag-wk-dirty' +
                                  (rowBusy ? ' hrag-ev-spin-text' : ''),
                              },
                              rowBusy
                                ? stateDot(14)
                                : h('span', { className: 'hrag-wk-dirtydot' }),
                              rowBusy ? tk('wk.updating') : tk('wk.dirty'),
                            )
                          : null,
                        h(
                          'span',
                          { className: 'hrag-wk-rowtime hrag-ev-tabnums', title: evFmtFullTime(entry.updated_at) },
                          evFmtRunTime(entry.updated_at),
                        ),
                        h('span', { className: 'hrag-ev-rowmenu-wrap' }, entryRowMenu(entry)),
                      )
                    }),
                  )
          : null,
      )

      const cardsSection = h(ManualCardsSection, {
        t: t,
        kbId: kbId,
        cardsQ: cardsQ,
        query: query,
        onOpenCard: onOpenCard,
        command: cardCommand,
        notify: notify,
      })

      return h(
        'div',
        { className: 'hrag-ev' },
        h(
          'div',
          { className: 'hrag-ev-bar hrag-tabbar' },
          h(
            'span',
            { className: 'hrag-searchwrap hrag-searchwrap-clear' },
            h('span', { className: 'hrag-searchicon' }, h(dshSearchIcon)),
            h('input', {
              type: 'text',
              className: 'hrag-searchinput',
              placeholder: tk('wk.search'),
              'aria-label': tk('wk.search'),
              value: query,
              onChange: (event) => setQuery(event.target.value),
            }),
            query
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-searchclear',
                    'aria-label': tk('wk.clearSearch'),
                    onClick: () => setQuery(''),
                  },
                  h(dshCloseIcon),
                )
              : null,
          ),
          h(
            'span',
            { className: 'hrag-ev-runbtns' },
            h(EvalMenu, {
              icon: '⋯',
              title: tk('wk.more'),
              align: 'end',
              render: (close) => [
                h(
                  EvalMenuItem,
                  {
                    key: 'update',
                    disabled: updating,
                    onSelect: () => {
                      close()
                      triggerWiki('incremental')
                    },
                  },
                  updating
                    ? h(
                        'span',
                        { className: 'hrag-ev-spin-text' },
                        stateDot(16),
                        tk('wk.updating'),
                      )
                    : h(React.Fragment, null, wikiBookIcon(), tk('wk.updateWiki')),
                ),
                h(
                  EvalMenuItem,
                  {
                    key: 'rebuild',
                    disabled: updating,
                    onSelect: () => {
                      close()
                      setRebuildOpen(true)
                    },
                  },
                  h(React.Fragment, null, refreshIcon(), tk('wk.rebuildWiki')),
                ),
                h('div', { key: 'sep', className: 'hrag-ev-menu-sep' }),
                h(
                  EvalMenuItem,
                  {
                    key: 'newDrawer',
                    onSelect: () => {
                      close()
                      sendCardCommand('drawer')
                    },
                  },
                  h(React.Fragment, null, cardUiIcon('folderPlus', 14), tk('wk.drawerNew')),
                ),
                h(
                  EvalMenuItem,
                  {
                    key: 'newCard',
                    onSelect: () => {
                      close()
                      sendCardCommand('card')
                    },
                  },
                  h(React.Fragment, null, dshPlusIcon(), tk('wk.cardNew')),
                ),
              ],
            }),
          ),
        ),
        h(
          'div',
          { className: 'hrag-wk-canvas' },
          entriesSection,
          cardsSection,
        ),
        entryCtx
          ? h(DocContextMenu, {
              t: t,
              x: entryCtx.x,
              y: entryCtx.y,
              items: entryContextItems(),
              onSelect: handleEntryContextAction,
              onClose: () => setEntryCtx(null),
            })
          : null,
        editingEntry
          ? h(WikiEditDialog, {
              key: editingEntry.id,
              t: t,
              entry: editingEntry,
              saving: entrySaving,
              onClose: closeEditEntry,
              onSave: handleSaveEntry,
            })
          : null,
        rebuildOpen
          ? h(ConfirmDialog, {
              t,
              title: tk('wk.rebuildTitle'),
              description: tk('wk.rebuildDesc'),
              busy: false,
              danger: false,
              cancelKey: 'doc.cancel',
              confirmKey: 'wk.rebuildConfirm',
              onCancel: () => setRebuildOpen(false),
              onConfirm: () => {
                setRebuildOpen(false)
                triggerWiki('full')
              },
            })
          : null,
        deleteTargets !== null
          ? h(ConfirmDialog, {
              t,
              title:
                deleteTargets.length > 1
                  ? tk('wk.deleteBatchTitle', deleteTargets.length)
                  : tk('wk.deleteConfirmTitle'),
              description: tk('wk.deleteConfirmDesc'),
              busy,
              cancelKey: 'doc.cancel',
              confirmKey: 'doc.confirmDelete',
              onCancel: () => setDeleteTargets(null),
              onConfirm: handleDeleteConfirm,
            })
          : null,
      )
    }

    /** 表单弹层壳（面板内自绘；Esc/遮罩关闭，busy 时锁住）。 */
    function CardDialog({ title, description, wide, busy, onClose, footer, children }) {
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape' && !busy) onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [busy, onClose])
      return h(
        'div',
        {
          className: 'hrag-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget && !busy) onClose()
          },
        },
        h(
          'div',
          {
            className:
              'hrag-dialog ' +
              (wide === 'drawer' ? 'hrag-dialog-drawer' : wide === 'wiki' ? 'hrag-dialog-wiki' : 'hrag-dialog-card'),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': title,
          },
          h('div', { className: 'hrag-dialog-title' }, title),
          description ? h('div', { className: 'hrag-dialog-body' }, description) : null,
          children,
          h('div', { className: 'hrag-dialog-actions' }, footer),
        ),
      )
    }

    /** 混搜开关：宿主 Switch 直用；缺件回退同形自绘（无 portal）。 */
    function CardSwitch({ checked, onChange, label }) {
      if (HostSwitch) return h(HostSwitch, { checked: checked, onChange: onChange, label: label })
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': checked,
          'aria-label': label,
          className: 'hrag-switch' + (checked ? ' hrag-switch-on' : ''),
          onClick: () => onChange(!checked),
        },
        h('span', { className: 'hrag-switch-thumb' }),
      )
    }

    /** 卡片新建/编辑弹层（照工作台 ManualCardEditor；标题+正文非空才可存）。 */
    function CardEditorDialog({ t, initial, saving, onClose, onSave }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [title, setTitle] = React.useState(initial ? initial.title : '')
      const [content, setContent] = React.useState(initial ? initial.content : '')
      const [tagsInput, setTagsInput] = React.useState(initial && Array.isArray(initial.tags) ? initial.tags.join(', ') : '')
      const [include, setInclude] = React.useState(Boolean(initial && initial.include_in_wiki_search))
      const canSave = title.trim().length > 0 && content.trim().length > 0 && !saving
      const submit = () => {
        if (!canSave) return
        Promise.resolve(
          onSave({
            title: title.trim(),
            content: content.trim(),
            tags: parseCardTags(tagsInput),
            include_in_wiki_search: include,
          }),
        ).catch(() => {})
      }
      return h(
        CardDialog,
        {
          title: initial ? tk('wk.cardEditorEdit') : tk('wk.cardEditorCreate'),
          description: tk('wk.cardEditorDesc'),
          busy: saving,
          onClose: onClose,
          footer: [
            h(
              'button',
              { key: 'cancel', type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: saving, onClick: onClose },
              t('doc.cancel'),
            ),
            h(
              'button',
              { key: 'save', type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: !canSave, onClick: submit },
              saving ? tk('wk.cardSaving') : tk('wk.cardSave'),
            ),
          ],
        },
        h(
          'div',
          { className: 'hrag-ev-form' },
          h(
            'label',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.cardTitleLabel')),
            h('input', {
              type: 'text',
              className: 'hrag-input',
              autoFocus: true,
              'aria-label': tk('wk.cardTitleLabel'),
              placeholder: tk('wk.cardTitlePlaceholder'),
              value: title,
              onChange: (event) => setTitle(event.target.value),
            }),
          ),
          h(
            'label',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.cardContentLabel')),
            h('textarea', {
              className: 'hrag-input hrag-ev-textarea hrag-cardcontent',
              'aria-label': tk('wk.cardContentLabel'),
              placeholder: tk('wk.cardContentPlaceholder'),
              value: content,
              onChange: (event) => setContent(event.target.value),
            }),
          ),
          h(
            'label',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.cardTagsLabel')),
            h('input', {
              type: 'text',
              className: 'hrag-input',
              'aria-label': tk('wk.cardTagsLabel'),
              placeholder: tk('wk.cardTagsPlaceholder'),
              value: tagsInput,
              onChange: (event) => setTagsInput(event.target.value),
            }),
          ),
          h(
            'div',
            { className: 'hrag-card-switchrow' },
            h(CardSwitch, { checked: include, onChange: setInclude, label: tk('wk.includeInSearch') }),
            h('span', { className: 'hrag-card-switchlabel' }, tk('wk.includeInSearch')),
            h('span', { className: 'hrag-ev-muted hrag-card-switchhint' }, tk('wk.cardIncludeHint')),
          ),
        ),
      )
    }

    /** 抽屉新建/编辑弹层（照工作台 DrawerEditor：名称+12 图标+12 色）。 */
    function CardDrawerEditorDialog({ t, initial, onClose, onSubmit }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [name, setName] = React.useState(initial ? initial.name : '')
      const [icon, setIcon] = React.useState(initial ? initial.icon : CARD_DRAWER_DEFAULT_ICON)
      const [color, setColor] = React.useState(initial ? initial.color : CARD_DRAWER_DEFAULT_COLOR)
      const canSave = name.trim().length > 0
      const submit = () => {
        if (!canSave) return
        onSubmit(name.trim(), icon, color)
      }
      const accent = CARD_DRAWER_COLORS[color].accent
      return h(
        CardDialog,
        {
          title: initial ? tk('wk.drawerEdit') : tk('wk.drawerNew'),
          wide: 'drawer',
          onClose: onClose,
          footer: [
            h(
              'button',
              { key: 'cancel', type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: onClose },
              t('doc.cancel'),
            ),
            h(
              'button',
              { key: 'save', type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: !canSave, onClick: submit },
              initial ? tk('wk.drawerSave') : tk('wk.drawerCreate'),
            ),
          ],
        },
        h(
          'div',
          { className: 'hrag-ev-form' },
          h(
            'label',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.drawerNameLabel')),
            h('input', {
              type: 'text',
              className: 'hrag-input',
              autoFocus: true,
              'aria-label': tk('wk.drawerNameLabel'),
              placeholder: tk('wk.drawerNamePlaceholder'),
              value: name,
              onChange: (event) => setName(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter') submit()
              },
            }),
          ),
          h(
            'div',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.drawerIconLabel')),
            h(
              'div',
              { className: 'hrag-drawer-grid' },
              CARD_DRAWER_ICON_KEYS.map((key) =>
                h(
                  'button',
                  {
                    key: key,
                    type: 'button',
                    className: 'hrag-drawer-cell' + (icon === key ? ' hrag-drawer-cell-on' : ''),
                    'aria-label': key,
                    'aria-pressed': icon === key,
                    style:
                      icon === key
                        ? { backgroundColor: accent + '1F', borderColor: accent, color: accent }
                        : undefined,
                    onClick: () => setIcon(key),
                  },
                  cardDrawerIcon(key, 18),
                ),
              ),
            ),
          ),
          h(
            'div',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.drawerColorLabel')),
            h(
              'div',
              { className: 'hrag-drawer-grid' },
              CARD_DRAWER_COLOR_KEYS.map((key) =>
                h(
                  'div',
                  { key: key, className: 'hrag-drawer-colorwrap' },
                  h('button', {
                    type: 'button',
                    className: 'hrag-drawer-colorcell',
                    'aria-label': key,
                    'aria-pressed': color === key,
                    style: {
                      backgroundColor: CARD_DRAWER_COLORS[key].accent,
                      outline: color === key ? '2px solid ' + CARD_DRAWER_COLORS[key].accent : undefined,
                      outlineOffset: color === key ? '2px' : undefined,
                    },
                    onClick: () => setColor(key),
                  }),
                ),
              ),
            ),
          ),
        ),
      )
    }

    /** 条目编辑弹层（照工作台 wiki-edit-dialog，E3）：主内容区可被下次生成覆盖；
        补充层永久保留并作为每次生成的方向。 */
    function WikiEditDialog({ t, entry, saving, onClose, onSave }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [content, setContent] = React.useState(entry ? entry.content : '')
      const [supplement, setSupplement] = React.useState(entry && entry.supplement_content ? entry.supplement_content : '')
      const canSave = content.trim().length > 0 && !saving
      const submit = () => {
        if (!canSave) return
        Promise.resolve(onSave(content.trim(), supplement.trim() || null)).catch(() => {})
      }
      return h(
        CardDialog,
        {
          title: tk('wk.wikiEditTitle'),
          description: tk('wk.wikiEditDesc'),
          wide: 'wiki',
          busy: saving,
          onClose: onClose,
          footer: [
            h(
              'button',
              { key: 'cancel', type: 'button', className: 'hrag-btn hrag-btn-outline', disabled: saving, onClick: onClose },
              t('doc.cancel'),
            ),
            h(
              'button',
              { key: 'save', type: 'button', className: 'hrag-btn hrag-btn-primary', disabled: !canSave, onClick: submit },
              saving ? tk('wk.wikiEditSaving') : tk('wk.wikiEditSave'),
            ),
          ],
        },
        h(
          'div',
          { className: 'hrag-ev-form' },
          h(
            'label',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.wikiEditMainLabel')),
            h('textarea', {
              className: 'hrag-input hrag-ev-textarea hrag-wiki-editarea',
              'aria-label': tk('wk.wikiEditMainLabel'),
              placeholder: tk('wk.wikiEditMainPlaceholder'),
              value: content,
              onChange: (event) => setContent(event.target.value),
            }),
            h('span', { className: 'hrag-ev-muted hrag-wiki-edithint' }, tk('wk.wikiEditMainHint')),
          ),
          h(
            'label',
            { className: 'hrag-ev-field' },
            h('span', { className: 'hrag-ev-fieldlabel' }, tk('wk.wikiEditSupplementLabel')),
            h('textarea', {
              className: 'hrag-input hrag-ev-textarea hrag-wiki-editarea',
              'aria-label': tk('wk.wikiEditSupplementLabel'),
              placeholder: tk('wk.wikiEditSupplementPlaceholder'),
              value: supplement,
              onChange: (event) => setSupplement(event.target.value),
            }),
            h('span', { className: 'hrag-ev-muted hrag-wiki-edithint' }, tk('wk.wikiEditSupplementHint')),
          ),
          entry.updated_at
            ? h(
                'div',
                { className: 'hrag-ev-muted hrag-wiki-editmeta' },
                tk('wk.wikiEditLastEdited') + ': ' + evFmtFullTime(entry.updated_at),
              )
            : null,
        ),
      )
    }

    /** 我的条目管理面（②档丙对，2026-10-18）：列表＋CRUD＋抽屉分组。
        照工作台 manual-card-panel 的逻辑与文案；批量走右键（无批量条）；
        弹层留在面板内。cardsQ 由 WikiView 持有（百科 drain 时统一刷新）。 */
    function ManualCardsSection({ t, kbId, cardsQ, query, onOpenCard, command, notify }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [expanded, setExpanded] = React.useState(true)
      const [activeTab, setActiveTab] = React.useState(null)
      const [selectedIds, setSelectedIds] = React.useState(() => new Set())
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [editorOpen, setEditorOpen] = React.useState(false)
      const [editingId, setEditingId] = React.useState(null)
      const [editingCard, setEditingCard] = React.useState(null)
      const [saving, setSaving] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [drawerEditor, setDrawerEditor] = React.useState({ open: false, editing: null })
      const [ctxMenu, setCtxMenu] = React.useState(null)
      const selectAllRef = React.useRef(null)
      const editRequestRef = React.useRef(0)
      const {
        drawers,
        membership,
        createDrawer,
        updateDrawer,
        deleteDrawer,
        setDrawerHidden,
        revealDrawerToFront,
        moveCard,
        moveCards,
      } = useCardDrawers(kbId)

      // 切库：清局部交互态（卡片数据与抽屉存储各自重载）。
      const [loadedKb, setLoadedKb] = React.useState(kbId)
      if (loadedKb !== kbId) {
        setLoadedKb(kbId)
        setActiveTab(null)
        setSelectedIds(new Set())
        setDeleteTargets(null)
        setEditorOpen(false)
        setEditingId(null)
        setEditingCard(null)
        setDrawerEditor({ open: false, editing: null })
        setCtxMenu(null)
      }

      const cards = cardsQ.data && Array.isArray(cardsQ.data.items) ? cardsQ.data.items : []
      const total = cardsQ.data && Number.isFinite(cardsQ.data.total) ? cardsQ.data.total : cards.length
      const drawerIds = new Set(drawers.map((drawer) => drawer.id))
      const activeDrawerId = activeTab !== null && drawerIds.has(activeTab) ? activeTab : null
      const visibleDrawers = drawers.filter((drawer) => !drawer.hidden)
      const searching = String(query || '').trim().length > 0
      const effectiveExpanded = expanded || searching
      const needle = String(query || '').trim().toLowerCase()
      const matchingCards = needle
        ? cards.filter(
            (card) =>
              String(card.title).toLowerCase().indexOf(needle) >= 0 ||
              String(card.summary).toLowerCase().indexOf(needle) >= 0 ||
              (card.tags || []).some((tag) => String(tag).toLowerCase().indexOf(needle) >= 0),
          )
        : cards
      const activeCards = cardsForDrawer(matchingCards, membership, drawerIds, activeDrawerId)
      const visibleIds = activeCards.map((card) => card.id)
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
      const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id))

      React.useEffect(() => {
        if (selectAllRef.current) {
          selectAllRef.current.indeterminate = !allVisibleSelected && someVisibleSelected
        }
      }, [allVisibleSelected, someVisibleSelected, effectiveExpanded])

      // 过滤即清选择（照工作台：批量动作不触达看不见的行）。
      const [lastQuery, setLastQuery] = React.useState(query)
      if (lastQuery !== query) {
        setLastQuery(query)
        if (selectedIds.size > 0) setSelectedIds(new Set())
      }

      const closeEditor = () => {
        editRequestRef.current += 1
        setEditorOpen(false)
        setEditingId(null)
        setEditingCard(null)
      }
      const openCreateFor = (drawerId) => {
        editRequestRef.current += 1
        setActiveTab(drawerId)
        setSelectedIds(new Set())
        setEditingId(null)
        setEditingCard(null)
        setEditorOpen(true)
        setExpanded(true)
      }
      const openEdit = (card) => {
        const requestId = ++editRequestRef.current
        setEditingId(card.id)
        callOp('manualCard', { kb_id: kbId, card_id: card.id })
          .then((data) => {
            if (editRequestRef.current !== requestId) return
            if (!data) {
              notify(tk('wk.loadFailed'), true)
              setEditingId(null)
              return
            }
            setEditingCard(data)
            setEditorOpen(true)
          })
          .catch((error) => {
            if (editRequestRef.current !== requestId) return
            notify(errorDetail(error) || tk('wk.loadFailed'), true)
            setEditingId(null)
          })
      }

      // 壳级 ⋯ 的新建指令（卡片/抽屉）；只消费一次。
      const commandRef = React.useRef(0)
      React.useEffect(() => {
        if (!command || !command.nonce || commandRef.current === command.nonce) return
        commandRef.current = command.nonce
        if (command.kind === 'drawer') {
          setDrawerEditor({ open: true, editing: null })
          setExpanded(true)
        } else {
          openCreateFor(activeDrawerId)
        }
      }, [command])

      const selectTab = (next) => {
        setActiveTab(next)
        setSelectedIds(new Set())
      }
      const toggleSelect = (cardId, checked) => {
        const next = new Set(selectedIds)
        if (checked) next.add(cardId)
        else next.delete(cardId)
        setSelectedIds(next)
      }
      const toggleSelectAll = () => {
        setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds))
      }
      const selectedCards = () => cards.filter((card) => selectedIds.has(card.id))
      const removeFromSelection = (cardIds) => {
        setSelectedIds((current) => {
          const next = new Set(current)
          for (const cardId of cardIds) next.delete(cardId)
          return next
        })
      }

      const handleSave = (body) => {
        setSaving(true)
        const request =
          editingId !== null
            ? callOp('updateManualCard', { kb_id: kbId, card_id: editingId, body: body })
            : callOp('createManualCard', { kb_id: kbId, body: body })
        return request
          .then((created) => {
            if (editingId !== null) {
              notify(tk('wk.cardUpdateSuccess'))
            } else {
              if (activeDrawerId !== null && created && created.id) moveCard(created.id, activeDrawerId)
              notify(tk('wk.cardCreateSuccess'))
            }
            closeEditor()
            cardsQ.refresh()
          })
          .catch((error) => {
            notify(errorDetail(error) || tk('wk.cardSaveFailed'), true)
            throw error
          })
          .finally(() => setSaving(false))
      }

      const handleToggle = (card, next) => {
        callOp('updateManualCard', {
          kb_id: kbId,
          card_id: card.id,
          body: { include_in_wiki_search: next },
        })
          .then(() => cardsQ.refresh())
          .catch((error) => notify(errorDetail(error) || tk('wk.cardSaveFailed'), true))
      }

      const handleDeleteConfirm = () => {
        if (!deleteTargets || deleteTargets.length === 0) return
        setBusy(true)
        const removed = new Set(deleteTargets.map((card) => card.id))
        Promise.allSettled(deleteTargets.map((card) => callOp('deleteManualCard', { kb_id: kbId, card_id: card.id })))
          .then((results) => {
            notify(
              results.some((result) => result.status === 'rejected') ? tk('wk.cardDeleteFailed') : tk('wk.cardDeleteSuccess'),
              results.some((result) => result.status === 'rejected'),
            )
            setSelectedIds((current) => new Set([...current].filter((id) => !removed.has(id))))
            setDeleteTargets(null)
            cardsQ.refresh()
          })
          .finally(() => setBusy(false))
      }

      const handleHideDrawer = (drawerId) => {
        setDrawerHidden(drawerId, true)
        if (activeDrawerId === drawerId) selectTab(null)
      }
      const handleDeleteDrawer = (drawerId) => {
        deleteDrawer(drawerId)
        if (activeDrawerId === drawerId) selectTab(null)
      }
      const doMove = (cardIds, drawerId) => {
        moveCards(cardIds, drawerId)
        removeFromSelection(cardIds)
      }

      const moveTargetItems = (cardIds) => {
        const items = [
          {
            id: 'move-none',
            label: tk('wk.drawerUnfiled'),
            icon: allCardsInDrawer(cardIds, membership, drawerIds, null) ? dshCheckIcon() : null,
            disabled: allCardsInDrawer(cardIds, membership, drawerIds, null),
          },
        ]
        for (const drawer of drawers) {
          const on = allCardsInDrawer(cardIds, membership, drawerIds, drawer.id)
          items.push({
            id: 'move-' + drawer.id,
            label: drawer.name,
            icon: on ? dshCheckIcon() : cardDrawerIcon(drawer.icon, 14, CARD_DRAWER_COLORS[drawer.color].accent),
            disabled: on,
          })
        }
        items.push({ type: 'separator', id: 'move-sep' })
        items.push({ id: 'move-new', label: tk('wk.drawerNewFromMenu'), icon: cardUiIcon('folderPlus', 14) })
        return items
      }

      const cardMenuItems = (card, batch) => {
        if (batch) {
          const ids = selectedCards().map((item) => item.id)
          return [
            { type: 'label', id: 'sel', text: tk('wk.selectedCount', ids.length) },
            { id: 'move', label: tk('wk.drawerMoveTo'), icon: cardUiIcon('folderInput', 14), submenu: moveTargetItems(ids) },
            { id: 'cancel', label: tk('wk.cancelSelection'), icon: dshCloseIcon() },
            { type: 'separator', id: 'batch-sep' },
            { id: 'delete', label: tk('wk.deleteSelected'), icon: dshTrashIcon(), danger: true },
          ]
        }
        return [
          { id: 'open', label: tk('wk.openCard'), icon: wikiNoteIcon() },
          { id: 'edit', label: tk('wk.cardEdit'), icon: dshEditIcon() },
          {
            id: 'toggle',
            label: card.include_in_wiki_search ? tk('wk.cardIncludeOff') : tk('wk.cardIncludeOn'),
            icon: card.include_in_wiki_search ? cardUiIcon('searchX', 14) : cardUiIcon('searchCheck', 14),
          },
          { id: 'move', label: tk('wk.drawerMoveTo'), icon: cardUiIcon('folderInput', 14), submenu: moveTargetItems([card.id]) },
          { type: 'separator', id: 'row-sep' },
          { id: 'delete', label: tk('wk.cardDelete'), icon: dshTrashIcon(), danger: true },
        ]
      }

      const handleCardAction = (id, card, batch) => {
        const targets = batch ? selectedCards() : [card]
        const ids = targets.map((item) => item.id)
        if (id === 'open') onOpenCard(card.id)
        else if (id === 'edit') openEdit(card)
        else if (id === 'toggle') handleToggle(card, !card.include_in_wiki_search)
        else if (id === 'cancel') setSelectedIds(new Set())
        else if (id === 'delete') setDeleteTargets(targets)
        else if (id === 'move-none') doMove(ids, null)
        else if (id === 'move-new') setDrawerEditor({ open: true, editing: null })
        else if (id.indexOf('move-') === 0) doMove(ids, id.slice(5))
      }

      const openRowContextMenu = (event, card) => {
        event.preventDefault()
        event.stopPropagation()
        const already = selectedIds.has(card.id)
        const next = already ? selectedIds : new Set([card.id])
        if (!already) setSelectedIds(next)
        setCtxMenu({
          x: event.clientX,
          y: event.clientY,
          kind: 'card',
          card: card,
          batch: already && next.size > 1,
        })
      }

      const contextItems = () => {
        if (!ctxMenu) return []
        if (ctxMenu.kind === 'card') return cardMenuItems(ctxMenu.card, ctxMenu.batch)
        if (ctxMenu.kind === 'drawer') {
          return [
            { id: 'new-card', label: tk('wk.cardNew'), icon: dshPlusIcon() },
            { id: 'edit-drawer', label: tk('wk.drawerEdit'), icon: dshEditIcon() },
            { type: 'separator', id: 'drawer-sep' },
            { id: 'delete-drawer', label: tk('wk.drawerDelete'), icon: dshTrashIcon(), danger: true },
          ]
        }
        if (ctxMenu.kind === 'spacer') {
          return [{ id: 'new-drawer', label: tk('wk.drawerNew'), icon: cardUiIcon('folderPlus', 14) }]
        }
        return [{ id: 'new-card', label: tk('wk.cardNew'), icon: dshPlusIcon() }]
      }

      const handleContextAction = (id) => {
        if (!ctxMenu) return
        if (ctxMenu.kind === 'card') {
          handleCardAction(id, ctxMenu.card, ctxMenu.batch)
          return
        }
        if (id === 'new-card') openCreateFor(ctxMenu.kind === 'drawer' ? ctxMenu.drawer.id : ctxMenu.kind === 'home' ? null : activeDrawerId)
        else if (id === 'new-drawer') setDrawerEditor({ open: true, editing: null })
        else if (id === 'edit-drawer') setDrawerEditor({ open: true, editing: ctxMenu.drawer })
        else if (id === 'delete-drawer') handleDeleteDrawer(ctxMenu.drawer.id)
      }

      const allDrawerItems = () => {
        const items = drawers.map((drawer) => ({
          id: 'reveal-' + drawer.id,
          label: drawer.name,
          icon:
            activeDrawerId === drawer.id
              ? dshCheckIcon()
              : cardDrawerIcon(drawer.icon, 14, CARD_DRAWER_COLORS[drawer.color].accent),
        }))
        items.push({ type: 'separator', id: 'all-sep' })
        items.push({ id: 'all-new', label: tk('wk.drawerNew'), icon: cardUiIcon('folderPlus', 14) })
        return items
      }
      const handleAllDrawerAction = (id) => {
        if (id === 'all-new') {
          setDrawerEditor({ open: true, editing: null })
          return
        }
        if (id.indexOf('reveal-') === 0) {
          const drawerId = id.slice(7)
          revealDrawerToFront(drawerId)
          selectTab(drawerId)
        }
      }

      const header = h(
        'div',
        { className: 'hrag-wk-secthead hrag-wk-cardhead' },
        h(
          'button',
          {
            type: 'button',
            className: 'hrag-wk-cardcaret',
            'aria-expanded': effectiveExpanded,
            'aria-label': tk('wk.cards'),
            onClick: () => setExpanded((value) => !value),
          },
          h('span', { className: 'hrag-ev-caret hrag-wk-chev' + (effectiveExpanded ? ' hrag-ev-caret-open' : '') }, lucideChevronDownIcon(1)),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'hrag-wk-cardhome' + (activeDrawerId !== null ? ' hrag-wk-cardhome-dim' : ''),
            'aria-label': tk('wk.cards'),
            onClick: () => selectTab(null),
            onContextMenu: (event) => {
              event.preventDefault()
              setCtxMenu({ x: event.clientX, y: event.clientY, kind: 'home' })
            },
          },
          h('span', { className: 'hrag-wk-secticon' }, wikiNoteIcon()),
          h('span', { className: 'hrag-wk-secttitle' }, tk('wk.cards')),
          total > 0 ? h('span', { className: 'hrag-ev-badge hrag-ev-tabnums' }, String(total)) : null,
        ),
        effectiveExpanded
          ? h(
              'div',
              { className: 'hrag-wk-drawers' },
              visibleDrawers.map((drawer) =>
                h(
                  React.Fragment,
                  { key: drawer.id },
                  h('span', { className: 'hrag-wk-drawersep', 'aria-hidden': 'true' }),
                  h(
                    'div',
                    {
                      className: 'hrag-wk-drawertab' + (activeDrawerId === drawer.id ? ' hrag-wk-drawertab-on' : ''),
                      'data-active': activeDrawerId === drawer.id,
                      onContextMenu: (event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setCtxMenu({ x: event.clientX, y: event.clientY, kind: 'drawer', drawer: drawer })
                      },
                    },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-wk-drawertabmain',
                        style:
                          activeDrawerId === drawer.id
                            ? { color: CARD_DRAWER_COLORS[drawer.color].accent }
                            : undefined,
                        onClick: () => selectTab(activeDrawerId === drawer.id ? null : drawer.id),
                      },
                      cardDrawerIcon(drawer.icon, 16, CARD_DRAWER_COLORS[drawer.color].accent),
                      h('span', { className: 'hrag-wk-drawertablabel', title: drawer.name }, drawer.name),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-wk-drawertabclose',
                        'aria-label': tk('wk.drawerClose'),
                        onClick: (event) => {
                          event.stopPropagation()
                          handleHideDrawer(drawer.id)
                        },
                      },
                      '✕',
                    ),
                  ),
                ),
              ),
            )
          : null,
        effectiveExpanded
          ? h(
              'button',
              {
                type: 'button',
                className: 'hrag-wk-draweradd',
                'aria-label': tk('wk.drawerNew'),
                onClick: () => setDrawerEditor({ open: true, editing: null }),
              },
              dshPlusIcon(),
            )
          : null,
        effectiveExpanded
          ? h('div', {
              className: 'hrag-wk-drawerspacer',
              onContextMenu: (event) => {
                event.preventDefault()
                setCtxMenu({ x: event.clientX, y: event.clientY, kind: 'spacer' })
              },
            })
          : null,
        effectiveExpanded
          ? h(
              'div',
              { className: 'hrag-wk-cardctl' },
              h(DshMenu, {
                title: tk('wk.drawerAll'),
                className: 'hrag-wk-cardctlbtn',
                align: 'end',
                trigger: cardUiIcon('layoutList', 16),
                items: allDrawerItems(),
                onSelect: handleAllDrawerAction,
              }),
              cards.length > 0
                ? h('input', {
                    type: 'checkbox',
                    className: 'hrag-ev-check',
                    ref: selectAllRef,
                    'aria-label': tk('wk.selectAllCards'),
                    checked: allVisibleSelected,
                    onChange: toggleSelectAll,
                  })
                : null,
            )
          : null,
      )

      let body = null
      if (effectiveExpanded) {
        if (cardsQ.failure) {
          body = h(
            'div',
            { className: 'hrag-ev-hint hrag-ev-hint-error hrag-wk-inset' },
            tk('wk.loadFailed'),
          )
        } else if (cardsQ.data === null) {
          body = h('div', { className: 'hrag-ev-hint hrag-wk-inset' }, tk('wk.loading'))
        } else if (activeCards.length === 0) {
          body = h(
            'div',
            { className: 'hrag-wk-empty' },
            h('span', { className: 'hrag-wk-empty-icon' }, wikiNoteIcon(28)),
            h('p', null, cards.length > 0 && searching ? tk('wk.cardsNoMatch') : tk('wk.cardsEmpty')),
          )
        } else {
          body = h(
            'div',
            { className: 'hrag-wk-list' + (selectedIds.size > 0 ? ' hrag-wk-list-selecting' : '') },
            activeCards.map((card) => {
              const isSelected = selectedIds.has(card.id)
              const ownerId = cardOwnerDrawerId(membership, drawerIds, card.id)
              const owner = ownerId === null ? null : drawers.find((drawer) => drawer.id === ownerId)
              const timeLabel = tk('wk.updatedAt') + ' ' + evFmtFullTime(card.updated_at)
              const timeNode = h(
                'span',
                { className: 'hrag-wk-rowtime hrag-wk-cardtime hrag-ev-tabnums', title: HostTooltip ? undefined : timeLabel },
                evFmtRunTime(card.updated_at),
              )
              return h(
                'div',
                {
                  key: card.id,
                  className: 'hrag-wk-row hrag-wk-cardrow' + (isSelected ? ' hrag-wk-row-on' : ''),
                  'data-selected': isSelected,
                  onContextMenu: (event) => openRowContextMenu(event, card),
                },
                h('input', {
                  type: 'checkbox',
                  className: 'hrag-ev-check',
                  'aria-label': tk('wk.cardSelect') + ': ' + card.title,
                  checked: isSelected,
                  onClick: (event) => event.stopPropagation(),
                  onChange: (event) => toggleSelect(card.id, event.target.checked),
                }),
                h(
                  'button',
                  { type: 'button', className: 'hrag-wk-row-main', onClick: () => onOpenCard(card.id) },
                  h(
                    'span',
                    { className: 'hrag-wk-rowicon' },
                    owner ? cardDrawerIcon(owner.icon, 16, CARD_DRAWER_COLORS[owner.color].accent) : wikiNoteIcon(),
                  ),
                  h('span', { className: 'hrag-wk-rowtitle', title: card.title }, card.title),
                  h('span', { className: 'hrag-wk-rowsummary' }, stripSummaryHeading(card.summary)),
                ),
                card.include_in_wiki_search
                  ? h('span', { className: 'hrag-ev-badge' }, tk('wk.includeInSearch'))
                  : null,
                HostTooltip
                  ? h(HostTooltip, { label: timeLabel, side: 'top', delayMs: 150, portal: true }, timeNode)
                  : timeNode,
                h(
                  'span',
                  { className: 'hrag-ev-rowmenu-wrap' },
                  h(DshMenu, {
                    title: tk('wk.cardMoreActions'),
                    className: 'hrag-ev-iconbtn hrag-cardrow-more',
                    align: 'end',
                    trigger: '⋯',
                    items: cardMenuItems(card, false),
                    onSelect: (id) => handleCardAction(id, card, false),
                  }),
                ),
              )
            }),
          )
        }
      }

      return h(
        React.Fragment,
        null,
        h(
          'section',
          {
            className: 'hrag-wk-sect hrag-wk-cardsect' + (effectiveExpanded ? ' hrag-wk-sect-open' : ''),
          },
          header,
          effectiveExpanded
            ? h(
                'div',
                {
                  className: 'hrag-wk-cardbody',
                  onContextMenu: (event) => {
                    event.preventDefault()
                    setCtxMenu({ x: event.clientX, y: event.clientY, kind: 'content' })
                  },
                },
                body,
              )
            : null,
        ),
        editorOpen && (editingId === null || editingCard !== null)
          ? h(CardEditorDialog, {
              key: editingId === null ? 'create' : editingId,
              t: t,
              initial: editingCard,
              saving: saving,
              onClose: closeEditor,
              onSave: handleSave,
            })
          : null,
        drawerEditor.open
          ? h(CardDrawerEditorDialog, {
              key: drawerEditor.editing ? drawerEditor.editing.id : 'drawer-new',
              t: t,
              initial: drawerEditor.editing,
              onClose: () => setDrawerEditor({ open: false, editing: null }),
              onSubmit: (name, icon, color) => {
                if (drawerEditor.editing) updateDrawer(drawerEditor.editing.id, { name: name, icon: icon, color: color })
                else createDrawer({ name: name, icon: icon, color: color })
                setDrawerEditor({ open: false, editing: null })
              },
            })
          : null,
        deleteTargets !== null
          ? h(ConfirmDialog, {
              t: t,
              title:
                deleteTargets.length > 1
                  ? tk('wk.cardDeleteBatchTitle', deleteTargets.length)
                  : tk('wk.cardDeleteTitle'),
              description: tk('wk.cardDeleteDesc'),
              busy: busy,
              cancelKey: 'doc.cancel',
              confirmKey: 'doc.confirmDelete',
              onCancel: () => {
                if (!busy) setDeleteTargets(null)
              },
              onConfirm: handleDeleteConfirm,
            })
          : null,
        ctxMenu
          ? h(DocContextMenu, {
              t: t,
              x: ctxMenu.x,
              y: ctxMenu.y,
              items: contextItems(),
              onSelect: handleContextAction,
              onClose: () => setCtxMenu(null),
            })
          : null,
      )
    }

    /** 剥同名 H1（照工作台 stripTitleHeading，显示层去重）：正文首行 `# 标题`
        与头部标题同名时剥掉，避免「标题出现两次」。 */
    function stripTitleHeading(content, title) {
      const value = String(content == null ? '' : content)
      const match = /^#\s+(.+)\r?\n/.exec(value)
      if (match && match[1].trim() === String(title == null ? '' : title).trim()) {
        return value.slice(match[0].length)
      }
      return value
    }

    /** 百科条目抽屉（Task 9，照工作台 wiki-entry-drawer）：头部书页图标＋标题＋
        待更新徽章；正文卡（剥同名 H1、pre-wrap）；元信息行＝来源切片展开钮
        （chunksByIds 惰取）＋更新时间；来源切片行可点 → 切片续读（照图谱实体
        抽屉：本层 z 帧 56/57 垫在续读抽屉下，关掉续读回本条）；404 按不存在。
        Escape 不接（照图谱抽屉——续读抽屉在上时单次 Esc 只关顶层）。 */
    function WikiEntryDrawer({ t, kbId, entryId, onClose, onOpenChunk, onRevealInTab }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [entry, setEntry] = React.useState(null)
      const [phase, setPhase] = React.useState('loading')
      const [failure, setFailure] = React.useState(null)
      const [lineageOpen, setLineageOpen] = React.useState(false)
      const [lineage, setLineage] = React.useState(null)
      const [lineageLoading, setLineageLoading] = React.useState(false)
      const [lineageFailure, setLineageFailure] = React.useState(null)

      React.useEffect(() => {
        let cancelled = false
        setEntry(null)
        setPhase('loading')
        setFailure(null)
        setLineageOpen(false)
        setLineage(null)
        setLineageLoading(false)
        setLineageFailure(null)
        callOp('wikiEntry', { kb_id: kbId, entry_id: entryId })
          .then((data) => {
            if (cancelled) return
            setEntry(data || null)
            setPhase(data ? 'ready' : 'missing')
          })
          .catch((error) => {
            if (cancelled) return
            if (error && error.info && error.info.status === 404) setPhase('missing')
            else {
              setFailure(error)
              setPhase('error')
            }
          })
        return () => {
          cancelled = true
        }
      }, [kbId, entryId])

      const sourceIds = entry && Array.isArray(entry.source_chunk_ids) ? entry.source_chunk_ids : []

      const toggleLineage = () => {
        if (lineageOpen) {
          setLineageOpen(false)
          return
        }
        setLineageOpen(true)
        if (lineage !== null || lineageLoading || sourceIds.length === 0) return
        setLineageLoading(true)
        setLineageFailure(null)
        callOp('chunksByIds', { kb_id: kbId, chunk_ids: sourceIds })
          .then((data) => {
            setLineage(data && Array.isArray(data.items) ? data.items : [])
            setLineageLoading(false)
          })
          .catch((error) => {
            setLineageFailure(error)
            setLineageLoading(false)
          })
      }

      let body
      if (phase === 'loading') {
        body = h('div', { className: 'hrag-pane' }, tk('wk.loading'))
      } else if (phase === 'error') {
        body = h(
          'div',
          { className: 'hrag-state hrag-state-error' },
          h('div', { className: 'hrag-state-title' }, tk('wk.loadFailed')),
          h('div', { className: 'hrag-state-detail' }, errorDetail(failure)),
        )
      } else if (phase === 'missing') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, tk('wk.entryNotFound')))
      } else if (entry) {
        body = h(
          'div',
          { className: 'hrag-drawer-body hrag-wk-drawer-body' },
          h(
            'div',
            { className: 'hrag-gcard' },
            h('div', { className: 'hrag-gcard-body' }, stripTitleHeading(entry.content, entry.title)),
          ),
          h(
            'div',
            { className: 'hrag-wk-metarow' },
            sourceIds.length > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-btn-outline hrag-wk-srcbtn',
                    'aria-expanded': lineageOpen,
                    onClick: toggleLineage,
                  },
                  String(sourceIds.length) + ' ' + tk('wk.sourceChunks'),
                  h('span', { className: 'hrag-ev-caret' + (lineageOpen ? ' hrag-ev-caret-open' : '') }, '▾'),
                )
              : null,
            h('span', null, tk('wk.updatedAt') + ' ' + evFmtFullTime(entry.updated_at)),
          ),
          lineageOpen
            ? h(
                'div',
                { className: 'hrag-wk-lin' },
                lineageLoading ? h('div', { className: 'hrag-ev-hint' }, tk('wk.loading')) : null,
                lineageFailure
                  ? h('div', { className: 'hrag-ev-hint hrag-ev-hint-error' }, tk('wk.loadFailed'))
                  : null,
                (lineage || []).map((chunk) => {
                  const chunkId = chunk.chunk_id
                  const docName = chunk.doc_name || String(chunkId).split('#')[0]
                  const heading = Array.isArray(chunk.heading_path) && chunk.heading_path.length > 0
                    ? chunk.heading_path.join(' / ')
                    : ''
                  const pos = heading || (chunk.page != null ? 'p.' + String(chunk.page) : '')
                  return h(
                    'div',
                    { className: 'hrag-wk-linitem', key: chunkId },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-wk-linhead',
                        disabled: !onOpenChunk,
                        onClick: () => onOpenChunk && onOpenChunk(chunkId, docName),
                      },
                      h('span', { className: 'hrag-wk-linname', title: docName }, docName),
                      pos ? h('span', { className: 'hrag-wk-linpos', title: pos }, pos) : null,
                      h('span', { className: 'hrag-wk-linchev' }, '›'),
                    ),
                    h('div', { className: 'hrag-wk-lintext' }, String(chunk.text || '')),
                  )
                }),
                lineage && sourceIds.length > lineage.length
                  ? h(
                      'p',
                      { className: 'hrag-wk-metaline' },
                      String(sourceIds.length - lineage.length) + ' ' + tk('wk.deletedSources'),
                    )
                  : null,
              )
            : null,
        )
      }

      return h(
        'div',
        { className: 'hrag-wk-drawer' },
        h('div', {
          className: 'hrag-drawer-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        }),
        h(
          'div',
          {
            className: 'hrag-drawer',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': entry ? String(entry.title) : tk('wk.entries'),
          },
          h(
            'div',
            { className: 'hrag-drawer-head' },
            h('span', { className: 'hrag-wk-secticon' }, wikiBookIcon()),
            h('span', { className: 'hrag-drawer-title', title: entry ? String(entry.title) : '' }, entry ? String(entry.title) : tk('wk.loading')),
            entry && entry.status === 'dirty'
              ? h('span', { className: 'hrag-ev-badge hrag-wk-dirty' }, tk('wk.dirty'))
              : null,
            // 「在百科 tab 中查看」导航钮（小件批 Task 8·E1①，照工作台 :99-109）：
            // 头行右侧 outline 小钮（entry 在才现）；点击＝切百科 tab＋关抽屉
            //（列表未分页——切过去即可见，照工作台 revealWikiEntry 语义）。
            entry && onRevealInTab
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-btn-outline hrag-btn-sm hrag-drawer-reveal',
                    onClick: () => onRevealInTab(entry.id),
                  },
                  dshRightUpIcon(),
                  tk('wk.openInTab'),
                )
              : null,
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
          body,
        ),
      )
    }

    /** 人工卡片抽屉（Task 9，照工作台 manual-card-drawer）：头部归属图标＋标题＋
        「我的卡片」/抽屉名/「混入搜索」徽章；正文卡（标签行 border-b 分隔 ＋
        pre-wrap 正文）；更新时间行。阅读档（编辑在列表管理面）。 */
    function ManualCardDrawer({ t, kbId, cardId, onClose }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [card, setCard] = React.useState(null)
      const [phase, setPhase] = React.useState('loading')
      const [failure, setFailure] = React.useState(null)

      React.useEffect(() => {
        let cancelled = false
        setCard(null)
        setPhase('loading')
        setFailure(null)
        callOp('manualCard', { kb_id: kbId, card_id: cardId })
          .then((data) => {
            if (cancelled) return
            setCard(data || null)
            setPhase(data ? 'ready' : 'missing')
          })
          .catch((error) => {
            if (cancelled) return
            if (error && error.info && error.info.status === 404) setPhase('missing')
            else {
              setFailure(error)
              setPhase('error')
            }
          })
        return () => {
          cancelled = true
        }
      }, [kbId, cardId])

      // 归属抽屉（②档丙对）：打开时直读 localStorage（与列表管理面同源）。
      const ownerDrawer = React.useMemo(() => {
        if (!card) return null
        const state = readCardDrawers(kbId)
        const ownerId = state.membership[card.id]
        if (!ownerId) return null
        return state.drawers.find((drawer) => drawer.id === ownerId) || null
      }, [kbId, card])

      let body
      if (phase === 'loading') {
        body = h('div', { className: 'hrag-pane' }, tk('wk.loading'))
      } else if (phase === 'error') {
        body = h(
          'div',
          { className: 'hrag-state hrag-state-error' },
          h('div', { className: 'hrag-state-title' }, tk('wk.loadFailed')),
          h('div', { className: 'hrag-state-detail' }, errorDetail(failure)),
        )
      } else if (phase === 'missing') {
        body = h('div', { className: 'hrag-state' }, h('div', { className: 'hrag-state-title' }, tk('wk.cardNotFound')))
      } else if (card) {
        const tags = Array.isArray(card.tags) ? card.tags : []
        body = h(
          'div',
          { className: 'hrag-drawer-body hrag-wk-drawer-body' },
          h(
            'div',
            { className: 'hrag-gcard' },
            tags.length > 0
              ? h(
                  'div',
                  { className: 'hrag-wk-tags' },
                  tags.map((tag) => h('span', { className: 'hrag-gchip', key: tag }, tag)),
                )
              : null,
            h('div', { className: 'hrag-gcard-body' }, String(card.content || '')),
          ),
          h('p', { className: 'hrag-wk-metaline' }, tk('wk.updatedAt') + ' ' + evFmtFullTime(card.updated_at)),
        )
      }

      return h(
        'div',
        { className: 'hrag-wk-drawer' },
        h('div', {
          className: 'hrag-drawer-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        }),
        h(
          'div',
          {
            className: 'hrag-drawer',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': card ? String(card.title) : tk('wk.cards'),
          },
          h(
            'div',
            { className: 'hrag-drawer-head' },
            h(
              'span',
              { className: 'hrag-wk-secticon' },
              ownerDrawer
                ? cardDrawerIcon(ownerDrawer.icon, 16, CARD_DRAWER_COLORS[ownerDrawer.color].accent)
                : wikiNoteIcon(),
            ),
            h('span', { className: 'hrag-drawer-title', title: card ? String(card.title) : '' }, card ? String(card.title) : tk('wk.loading')),
            card ? h('span', { className: 'hrag-ev-badge hrag-wk-dirty' }, tk('wk.cardType')) : null,
            ownerDrawer ? h('span', { className: 'hrag-ev-badge hrag-headbadge-soft' }, ownerDrawer.name) : null,
            card && card.include_in_wiki_search
              ? h('span', { className: 'hrag-ev-badge' }, tk('wk.includeInSearch'))
              : null,
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
          body,
        ),
      )
    }

    /** 崩溃隔离（Task 10 护栏，2026-10-13 白屏实证——全屏 + 召回测试后整流白）：
        视图级错误边界。某视图渲染/effect 抛错不再带崩整面板——就地显示错误摘要
        与栈（桌面端读不到 console，栈直接上界面留证）+「重试」重挂子树。React
        错误边界仅类组件可实现（componentDidCatch），无 hooks。 */
    class HragBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null, stack: '' }
      }
      static getDerivedStateFromError(error) {
        return { error }
      }
      componentDidCatch(error, info) {
        this.setState({ stack: (info && info.componentStack) || '' })
      }
      retry() {
        this.setState({ error: null, stack: '' })
      }
      render() {
        if (this.state.error) {
          const t = this.props.t
          const detail =
            String((this.state.error && this.state.error.stack) || this.state.error || '') +
            (this.state.stack ? '\n--- component stack ---' + this.state.stack : '')
          return h(
            'div',
            { className: 'hrag-crash' },
            h('p', { className: 'hrag-crash-title' }, evText(t('crash.title'), [this.props.name || ''])),
            h('p', { className: 'hrag-crash-hint' }, t('crash.hint')),
            h('pre', { className: 'hrag-crash-pre' }, detail),
            h(
              'button',
              { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => this.retry() },
              t('crash.retry'),
            ),
          )
        }
        return this.props.children
      }
    }

    function ModelSettingsPanel({ t, kbId, kbs, onClose }) {
      const configQ = useEvalCall(kbId, true, 'ragConfigGet', null)
      const migrationQ = useEvalCall(kbId, true, 'ragMigration', null, (payload) =>
        Boolean(payload && payload.state === 'running'),
      )
      const modelsQ = useEvalCall(kbId, true, 'listModels', null)
      // caption 选择器的合规源＝配置条目面（带声明能力，如 supports_vision）——解析后的
      // 目录面（models）不带该字段，照工作台 modelsConfig 分开取。
      const modelsConfigQ = useEvalCall(kbId, true, 'listModelsConfig', null)
      const view = configQ.data && typeof configQ.data === 'object' ? configQ.data : null
      const models = modelsQ.data && Array.isArray(modelsQ.data.models) ? modelsQ.data.models : []
      const managedModels =
        modelsConfigQ.data && Array.isArray(modelsConfigQ.data.models) ? modelsConfigQ.data.models : []
      const config = view && view.config ? view.config : {}
      const migration =
        (migrationQ.data && typeof migrationQ.data === 'object' ? migrationQ.data : null) ||
        (view && view.migration ? view.migration : null)

      const [values, setValues] = React.useState(null)
      const [saveBusy, setSaveBusy] = React.useState(false)
      const [saveError, setSaveError] = React.useState(null)
      const [saveWarning, setSaveWarning] = React.useState(null)
      const [savedNotice, setSavedNotice] = React.useState(false)
      const [dimensionConfirmOpen, setDimensionConfirmOpen] = React.useState(false)
      // Rebuild-index card (10-15: add the target-library picker, per the workbench
      // ReindexDialog): pick a library -> confirm -> rebuild that one; the status line
      // follows the picked library (3s poll while in flight, immediate + 1s re-sample).
      const [reindexKbId, setReindexKbId] = React.useState('')
      const [reindexBusy, setReindexBusy] = React.useState(false)
      const [reindexError, setReindexError] = React.useState(null)
      const [reindexState, setReindexState] = React.useState(null)
      const [reindexKick, setReindexKick] = React.useState(0)
      const [reindexConfirmOpen, setReindexConfirmOpen] = React.useState(false)
      const reindexRunning = reindexBusy || (reindexState !== null && reindexState.in_progress === true)
      React.useEffect(() => {
        if (!reindexKbId) return undefined
        let cancelled = false
        let timer = null
        const tick = () => {
          callOp('reindexStatus', { kb_id: reindexKbId })
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
      }, [reindexKbId, reindexBusy, reindexRunning, reindexKick])
      const confirmReindex = () => {
        if (!reindexKbId) return
        setReindexBusy(true)
        setReindexError(null)
        // T4 摄取通道：携带面板会话 id 与库名（宿主半据此登记后台任务）。
        const kbEntry = (kbs || []).find((item) => String(item.id) === reindexKbId)
        callOp('reindex', {
          kb_id: reindexKbId,
          session_id: panelSessionId(),
          kb_label: kbEntry ? String(kbEntry.name || kbEntry.id) : reindexKbId,
        })
          .then((data) => {
            setReindexBusy(false)
            setReindexConfirmOpen(false)
            const status = data && data.status
            showToast(status === 'already_running' ? t('reindex.alreadyRunning') : t('reindex.enqueued'))
            setReindexKick((value) => value + 1)
            window.setTimeout(() => setReindexKick((value) => value + 1), 1000)
          })
          .catch((error) => {
            setReindexBusy(false)
            setReindexError(errorDetail(error))
          })
      }
      let reindexLine = null
      if (reindexRunning) {
        const progress = reindexState && reindexState.progress
        reindexLine = progress
          ? t('reindex.running') +
            ' ' + String(progress.documents_done) + '/' + String(progress.documents_total) +
            ' \u00b7 ' + t('reindex.chunksWritten') +
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
      const [advancedOpen, setAdvancedOpen] = React.useState(false)
      // 探针结论各自跟着取值键走（Task 2）：编辑后旧结论即失效，绝不张冠李戴。
      const [capabilityProbe, setCapabilityProbe] = React.useState(null)
      const [serviceProbe, setServiceProbe] = React.useState(null)
      const [dimensionProbe, setDimensionProbe] = React.useState(null)
      const [embeddingProbe, setEmbeddingProbe] = React.useState(null)
      const [rerankProbe, setRerankProbe] = React.useState(null)
      const [probeBusy, setProbeBusy] = React.useState({})
      const requestedRef = React.useRef({ capability: null, service: null, dimension: null })

      // 表单只在首次取到配置时播种：保存后刷新视图不回填表单——迁移在飞时视图里的
      // 宽度仍是旧值，回填会把用户刚选的目标宽度改回去。
      React.useEffect(() => {
        if (!view || values !== null) return
        setValues(ragFormValuesFromConfig(view))
      }, [view, values])

      // 设置面＝全窗大弹窗（照宿主设置形态）：Esc 关闭。
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])

      const probeFailure = (kind, key, detail) => {
        if (kind === 'capability') return { key: key, status: 'unverifiable', detail: detail }
        if (kind === 'service') return { key: key, status: 'unreachable', detail: detail }
        if (kind === 'dimension') {
          return { key: key, status: 'unreachable', type: null, native: null, values: [], candidates: [], detail: detail }
        }
        return { key: key, status: 'unreachable', detail: detail, measured_dimension: null }
      }

      const applyProbe = (kind, verdict) => {
        if (kind === 'capability') setCapabilityProbe(verdict)
        else if (kind === 'service') setServiceProbe(verdict)
        else if (kind === 'dimension') setDimensionProbe(verdict)
        else if (kind === 'embedding') setEmbeddingProbe(verdict)
        else setRerankProbe(verdict)
      }

      /** 探针是真实调用（只读、零写入）；失败不弹错，就地成为行上状态。 */
      const runProbe = (kind, key, op, params) => {
        setProbeBusy((prev) => Object.assign({}, prev, { [kind]: key }))
        callOp(op, params)
          .then((data) => applyProbe(kind, Object.assign({ key: key }, data || {})))
          .catch((error) => applyProbe(kind, probeFailure(kind, key, errorDetail(error))))
          .then(() => {
            setProbeBusy((prev) => (prev[kind] === key ? Object.assign({}, prev, { [kind]: null }) : prev))
          })
      }

      // ── 三条自动探测（改动即问、防抖、按候选键只发一次）＋定宽回填 ──
      const embeddingKeyPresent = Boolean(view && view.sources && view.sources.embedding_api_key !== 'unset')
      const rerankKeyPresent = Boolean(view && view.sources && view.sources.rerank_api_key !== 'unset')

      React.useEffect(() => {
        if (!view || !values) return undefined
        const applies =
          values.embedding_sparse_source === 'provider' &&
          values.embedding_model.trim() !== '' &&
          view.sources &&
          view.sources.embedding_api_key !== 'unset' &&
          Array.isArray(view.embedding_providers) &&
          view.embedding_providers.some(
            (entry) => entry && entry.provider_id === values.embedding_provider && entry.emits_sparse,
          )
        if (!applies) return undefined
        const key = ragSparseProbeKey(values)
        if (requestedRef.current.capability === key) return undefined
        const timer = window.setTimeout(() => {
          requestedRef.current.capability = key
          runProbe('capability', key, 'probeEmbedding', {
            body: {
              embedding_provider: values.embedding_provider,
              embedding_model: values.embedding_model.trim(),
              embedding_base_url: values.embedding_base_url.trim() || null,
              embedding_api_key: values.embedding_api_key.trim() || null,
            },
          })
        }, RAG_PROBE_DEBOUNCE_MS)
        return () => window.clearTimeout(timer)
      }, [view, values])

      React.useEffect(() => {
        if (!view || !values) return undefined
        if (!ragShouldProbeSparseService(values)) return undefined
        const hasKey =
          values.sparse_api_key.trim() !== '' ||
          Boolean(view.sources && view.sources.sparse_api_key !== 'unset')
        const key = ragSparseServiceProbeKey(values, hasKey)
        if (requestedRef.current.service === key) return undefined
        const timer = window.setTimeout(() => {
          requestedRef.current.service = key
          runProbe('service', key, 'probeSparse', {
            body: {
              sparse_provider: values.sparse_provider,
              sparse_base_url: values.sparse_base_url.trim() || null,
              sparse_api_key: values.sparse_api_key.trim() || null,
            },
          })
        }, RAG_PROBE_DEBOUNCE_MS)
        return () => window.clearTimeout(timer)
      }, [view, values])

      React.useEffect(() => {
        if (!view || !values) return undefined
        const applies =
          values.embedding_model.trim() !== '' &&
          values.embedding_base_url.trim() !== '' &&
          Boolean(view.sources && view.sources.embedding_api_key !== 'unset')
        if (!applies) return undefined
        const key = ragDimensionProbeKey(values)
        if (requestedRef.current.dimension === key) return undefined
        const timer = window.setTimeout(() => {
          requestedRef.current.dimension = key
          runProbe('dimension', key, 'probeDimensions', {
            body: {
              embedding_provider: values.embedding_provider,
              embedding_model: values.embedding_model.trim(),
              embedding_base_url: values.embedding_base_url.trim() || null,
              embedding_api_key: null,
            },
          })
        }, RAG_PROBE_DEBOUNCE_MS)
        return () => window.clearTimeout(timer)
      }, [view, values])

      // ③ 型（不吃维度参数）只有唯一可取值 ⇒ 必须把值填进表单，留空会把用户锁在保存门外。
      React.useEffect(() => {
        if (!values || !dimensionProbe) return
        if (dimensionProbe.key !== ragDimensionProbeKey(values)) return
        if (dimensionProbe.type !== 'fixed' || dimensionProbe.native == null) return
        const native = String(dimensionProbe.native)
        setValues((prev) =>
          prev && prev.embedding_dimension !== native
            ? Object.assign({}, prev, { embedding_dimension: native })
            : prev,
        )
      }, [values, dimensionProbe])

      const payload = view && values ? ragBuildInput(values, view) : {}
      const hasChanges = Boolean(view && values && ragHasChanges(values, view))
      const sparseCapability = values
        ? ragResolveSparseCapability(values, view ? view.embedding_providers : null, capabilityProbe)
        : 'unknown'
      const sparseUnsupported = values
        ? ragSparseSourceUnsupported(values, view ? view.embedding_providers : null, capabilityProbe)
        : false
      const sparseBlockReason = sparseUnsupported
        ? t('set.form.sparseProviderUnsupported')
        : values && ragSparseServiceUnconfigured(values)
          ? t('set.form.sparseServiceUnconfigured')
          : null
      const endpointRequiredReason =
        values && (!values.embedding_base_url.trim() || !values.rerank_base_url.trim())
          ? t('set.form.endpointRequired')
          : null
      // ASR 探针照工作台零入口休眠：判定与门留着（verdict 无来源），兜底＝保存期构造拒绝＋入库期 asr=failed。
      const asrServiceApplies = Boolean(values && ragAsrServiceApplies(values))
      const asrVerdict = null
      const asrBlockReason =
        asrServiceApplies && ragAsrProbeBlocksSave(asrVerdict) ? t('set.form.asrProbeBlocksSave') : null
      const saveBlockReason = sparseBlockReason || endpointRequiredReason || asrBlockReason || null
      const sparseUnverified = Boolean(
        values &&
          values.embedding_sparse_source === 'provider' &&
          capabilityProbe &&
          capabilityProbe.key === ragSparseProbeKey(values) &&
          capabilityProbe.status === 'unverifiable',
      )
      const serviceHasKey = values
        ? values.sparse_api_key.trim() !== '' ||
          Boolean(view && view.sources && view.sources.sparse_api_key !== 'unset')
        : false
      const serviceVerdict = values
        ? ragSparseServiceVerdictFor(values, serviceHasKey, serviceProbe)
        : null
      const serviceStatus = probeBusy.service
        ? { text: t('set.form.sparseProbing'), error: false }
        : serviceVerdict && serviceVerdict.status === 'unreachable'
          ? { text: t('set.form.sparseServiceUnreachable'), error: true }
          : serviceVerdict && serviceVerdict.status === 'empty'
            ? { text: t('set.form.sparseServiceEmpty'), error: true }
            : null
      const dimensionKey = values ? ragDimensionProbeKey(values) : ''
      const dimensionVerdict =
        dimensionProbe && dimensionProbe.key === dimensionKey ? dimensionProbe : null
      const dimensionProbing = Boolean(values && probeBusy.dimension === dimensionKey)
      const dimensionState = dimensionProbing
        ? { state: 'probing', reason: t('set.form.dimensionProbing') }
        : dimensionVerdict === null
          ? null
          : dimensionVerdict.status === 'unreachable'
            ? { state: 'unprobed', reason: t('set.form.dimensionUnprobed') + '：' + String(dimensionVerdict.detail || '') }
            : dimensionVerdict.type === 'tiered' &&
                Array.isArray(dimensionVerdict.values) &&
                dimensionVerdict.values.length === 0
              ? { state: 'no-tiers', reason: t('set.form.dimensionNoTiers') }
              : null
      const dimensionTiers = ragDimensionTiersFor(dimensionVerdict)
      const dimensionFixed = Boolean(
        dimensionVerdict && dimensionVerdict.type === 'fixed' && dimensionVerdict.native != null,
      )

      /** 一条腿的连通点：坐标齐了才可点；结论只认「点过的那一发」。 */
      const legProps = (leg) => {
        const provider = leg === 'embedding' ? values.embedding_provider : values.rerank_provider
        const model = (leg === 'embedding' ? values.embedding_model : values.rerank_model).trim()
        const baseUrl = (leg === 'embedding' ? values.embedding_base_url : values.rerank_base_url).trim()
        const hasKey = leg === 'embedding' ? embeddingKeyPresent : rerankKeyPresent
        const ready = model !== '' && baseUrl !== '' && hasKey
        const key = ragConnectivityProbeKey(leg, values, hasKey)
        const raw = leg === 'embedding' ? embeddingProbe : rerankProbe
        const verdict = raw && raw.key === key ? raw : null
        const probing = probeBusy[leg] === key
        const status = probing
          ? 'probing'
          : !ready || !verdict
            ? 'untested'
            : verdict.status === 'ok'
              ? 'ok'
              : verdict.status === 'dimension_unavailable'
                ? 'bad-dimension'
                : verdict.status === 'half_missing'
                  ? 'bad-half'
                  : 'bad'
        const reason = probing
          ? t('set.form.legProbing')
          : !ready
            ? t('set.form.legNeedsConfig')
            : verdict
              ? String(verdict.detail || '')
              : t('set.form.legUntested')
        return {
          label: leg === 'embedding' ? t('set.field.embeddingModel') : t('set.field.rerankModel'),
          status: status,
          reason: reason,
          disabled: !ready || probing,
          onProbe: () => {
            const rawDimension = values.embedding_dimension.trim()
            runProbe(leg, key, 'probeConnectivity', {
              body: {
                leg: leg,
                provider: provider,
                model: model,
                base_url: baseUrl || null,
                api_key: null,
                embedding_dimension:
                  leg === 'embedding' && rawDimension !== '' ? Number(rawDimension) : null,
              },
            })
          },
        }
      }

      const update = (key, value) =>
        setValues((prev) => (prev ? Object.assign({}, prev, { [key]: value }) : prev))

      const updateVideo = (key, value) =>
        setValues((prev) =>
          prev
            ? Object.assign({}, prev, { video: Object.assign({}, prev.video, { [key]: value }) })
            : prev,
        )

      const submitSave = () => {
        setSaveBusy(true)
        setSaveError(null)
        callOp('ragConfigPut', { body: payload })
          .then((saved) => {
            setSaveBusy(false)
            setSavedNotice(true)
            window.setTimeout(() => setSavedNotice(false), 4000)
            setSaveWarning(saved && typeof saved.warning === 'string' ? saved.warning : null)
            const pending = saved ? saved.migration : null
            if (pending && pending.state === 'running' && pending.target_dimension != null) {
              setValues((prev) =>
                prev
                  ? Object.assign({}, prev, { embedding_dimension: String(pending.target_dimension) })
                  : prev,
              )
            }
            configQ.refresh()
          })
          .catch((error) => {
            setSaveBusy(false)
            setSaveError(errorDetail(error))
          })
      }

      const handleSave = () => {
        if (!view || !values || !hasChanges) return
        if (ragChangesDimension(values, view)) {
          setDimensionConfirmOpen(true)
          return
        }
        submitSave()
      }

      let migrationLine = null
      if (migration && migration.state === 'running') {
        migrationLine = h(
          'div',
          { className: 'hrag-set-migration' },
          t('set.migrationRunning') +
            (migration.target_dimension != null ? ' → ' + String(migration.target_dimension) : ''),
        )
      } else if (migration && migration.state === 'failed') {
        migrationLine = h(
          'div',
          { className: 'hrag-set-migration hrag-set-migration-failed' },
          t('set.migrationFailed') + ' ' + String(migration.detail || ''),
        )
      } else if (migration && migration.state === 'succeeded') {
        migrationLine = h('div', { className: 'hrag-set-migration' }, t('set.migrationSucceeded'))
      }

      const providerLabel = (id) => {
        const keys = {
          dashscope: 'providerDashscope',
          'volcengine-ark': 'providerVolcengineArk',
          'openai-compatible': 'providerOpenAIChat',
          'generic-rerank': 'providerGenericRerank',
          'tei-rerank': 'providerTeiRerank',
          'tei-sparse': 'providerTeiSparse',
          'mineru-cloud': 'providerMineruCloud',
          'mineru-local': 'providerMineruLocal',
        }
        return keys[id] ? t('set.form.' + keys[id]) : id
      }

      const fieldRow = (label, control, options) =>
        h(
          'div',
          { className: options && options.nested ? 'hrag-set-row hrag-set-row-nested' : 'hrag-set-row' },
          h('span', { className: 'hrag-set-label', title: options ? options.info : undefined }, label),
          control,
        )

      /** 下拉选择器共用件（与 Model ID 同款外观，10-14 他令「统一同款·逻辑不变」）：
          盒＝宿主 Input 真值样式＋工作台 chevron（CSS `.hrag-set-picker`）；整盒即 DshMenu
          触发钮、`anchor:'field'` 菜单等宽。签名＝（值数组／标签函数／onChange），
          `disabledFor` 供稀疏来源的「仅稠密」禁选项。 */
      const pickerControl = (ariaLabel, value, options, labels, onChange, disabledFor) =>
        h(
          'div',
          { className: 'hrag-set-field' },
          h(DshMenu, {
            title: ariaLabel,
            align: 'end',
            anchor: 'field',
            className: 'hrag-set-picker',
            trigger: h(
              React.Fragment,
              null,
              h('span', { className: 'hrag-set-picker-label' }, labels(value)),
              lucideChevronDownIcon(),
            ),
            items: [
              { type: 'label', id: 'label', text: ariaLabel },
              ...options.map((option, index) => ({
                id: String(index),
                label: labels(option),
                disabled: disabledFor ? disabledFor(option) : false,
              })),
            ],
            selectedId: options.indexOf(value) >= 0 ? String(options.indexOf(value)) : undefined,
            onSelect: (id) => onChange(options[Number(id)]),
          }),
        )

      const secretControl = (secretField, value, ariaLabel, onChange) =>
        h(
          'div',
          { className: 'hrag-secret-wrap' },
          h(HostInput, {
            className: 'hrag-set-control',
            type: 'password',
            value: value,
            'aria-label': ariaLabel,
            title: t('set.form.secretHint'),
            onChange: (event) => onChange(event.target.value),
          }),
          view && view.sources && view.sources[secretField] === 'env' && value === ''
            ? h('span', { className: 'hrag-secret-badge' }, t('set.form.secretFromEnvBadge'))
            : null,
        )

      const legBlock = (leg) => {
        const info = legProps(leg)
        const embedding = leg === 'embedding'
        return h(
          React.Fragment,
          { key: leg },
          h(
            'button',
            {
              type: 'button',
              className: 'hrag-set-role',
              disabled: info.disabled,
              title: info.reason,
              'aria-label': info.label + ' · ' + info.reason,
              onClick: info.onProbe,
            },
            info.label,
            h('span', { className: 'hrag-set-dot hrag-set-dot-' + info.status }),
          ),
          fieldRow(
            t('set.form.provider'),
            pickerControl(
              embedding ? t('set.field.embeddingProvider') : t('set.field.rerankProvider'),
              embedding ? values.embedding_provider : values.rerank_provider,
              embedding ? RAG_EMBEDDING_PROVIDER_OPTIONS : RAG_RERANK_PROVIDER_OPTIONS,
              providerLabel,
              (next) => update(embedding ? 'embedding_provider' : 'rerank_provider', next),
            ),
          ),
          fieldRow(
            t('set.form.model'),
            h(HostInput, {
              className: 'hrag-set-control',
              spellCheck: false,
              value: embedding ? values.embedding_model : values.rerank_model,
              'aria-label': info.label,
              onChange: (event) => update(embedding ? 'embedding_model' : 'rerank_model', event.target.value),
            }),
          ),
          fieldRow(
            t('set.form.apiKey'),
            secretControl(
              embedding ? 'embedding_api_key' : 'rerank_api_key',
              embedding ? values.embedding_api_key : values.rerank_api_key,
              embedding ? t('set.form.embeddingApiKey') : t('set.form.rerankApiKey'),
              (next) => update(embedding ? 'embedding_api_key' : 'rerank_api_key', next),
            ),
          ),
          fieldRow(
            t('set.form.endpoint'),
            h(HostInput, {
              className: 'hrag-set-control',
              spellCheck: false,
              value: embedding ? values.embedding_base_url : values.rerank_base_url,
              placeholder: ragEndpointPlaceholderFor(
                view ? (embedding ? view.embedding_providers : view.rerank_providers) : null,
                embedding ? values.embedding_provider : values.rerank_provider,
              ),
              'aria-label': embedding ? t('set.field.embeddingBaseUrl') : t('set.field.rerankBaseUrl'),
              onChange: (event) => update(embedding ? 'embedding_base_url' : 'rerank_base_url', event.target.value),
            }),
            embedding ? { info: t('set.form.endpointHint') } : undefined,
          ),
        )
      }

      /** 模型引用选择器（工作台 modelReferenceOptions 口径）：无值＝（使用配置默认）、
          孤儿值列尾；选「默认」即清空本行覆盖。 */
      const referencePicker = (ariaLabel, field, current) =>
        pickerControl(
          ariaLabel,
          current || RAG_MODEL_NONE,
          ragModelReferenceOptions(models, current, t('set.form.defaultNone')).map((option) => option.value),
          (option) => {
            const found = ragModelReferenceOptions(models, current, t('set.form.defaultNone')).find(
              (o) => o.value === option,
            )
            return found ? found.label : option
          },
          (next) => update(field, next === RAG_MODEL_NONE ? '' : next),
        )

      /** 思考跟随菜单（工作台 default 组，spec §6 登记后他裁「做」）：五槽位（抽取/百科/
          裁判/合成/VLM）勾选；菜单常开不关（连点五项＝一个决定）、两列对齐（角色｜该槽位
          当前指向的模型）；勾选即写 `*_thinking`（保存链早已全程携带）。 */
      const thinkingRows = values
        ? [
            ['extract_thinking', 'set.field.extractModel', 'extract_model'],
            ['wiki_thinking', 'set.field.wikiModel', 'wiki_model'],
            ['judge_thinking', 'set.field.judgeModel', 'judge_model'],
            ['synthesis_thinking', 'set.field.synthesisModel', 'synthesis_model'],
            ['vlm_thinking', 'set.field.captionModel', 'vlm_model'],
          ].map(([key, labelKey, modelField]) => {
            const modelValue = values[modelField]
            const options =
              modelField === 'vlm_model'
                ? ragVisionReferenceOptions(managedModels, modelValue, t('set.form.defaultNone'))
                : ragModelReferenceOptions(models, modelValue, t('set.form.defaultNone'))
            const found = options.find((option) => option.value === (modelValue || RAG_MODEL_NONE))
            return {
              key: key,
              label: t(labelKey),
              modelLabel: found ? found.label : modelValue || t('set.form.defaultNone'),
              checked: Boolean(values[key]),
            }
          })
        : []
      const thinkingCount = thinkingRows.filter((row) => row.checked).length
      const thinkingMenu = values
        ? h(
            'div',
            { className: 'hrag-set-field hrag-set-thinkingwrap' },
            h(DshMenu, {
              title: t('set.form.thinkingMenuLabel'),
              align: 'start',
              anchor: 'field',
              className: 'hrag-set-picker',
              trigger: h(
                React.Fragment,
                null,
                h(
                  'span',
                  { className: 'hrag-set-picker-label' },
                  thinkingCount > 0
                    ? t('set.form.thinkingMenuState', { 0: thinkingCount })
                    : t('set.form.thinkingMenuStateNone'),
                ),
                lucideChevronDownIcon(),
              ),
              children: h(
                'div',
                { className: 'hrag-mm-tgrid' },
                thinkingRows.map((row) =>
                  h(
                    'button',
                    {
                      key: row.key,
                      type: 'button',
                      role: 'menuitemcheckbox',
                      'aria-checked': row.checked,
                      'aria-label': row.label + ' · ' + row.modelLabel,
                      className: 'hrag-mm-item hrag-mm-checkrow',
                      onClick: () => update(row.key, !row.checked),
                    },
                    h(
                      'span',
                      { className: 'hrag-mm-trole' },
                      h('span', { className: 'hrag-mm-tcheck' + (row.checked ? ' hrag-mm-tcheck-on' : '') }, row.checked ? dshCheckIcon() : null),
                      row.label,
                    ),
                    h('span', { className: 'hrag-mm-tmodel', title: row.modelLabel }, row.modelLabel),
                  ),
                ),
              ),
            }),
          )
        : null

      const defaultModelGroup = view && values
        ? h(
        'div',
        { className: 'hrag-set-group' },
        h('div', { className: 'hrag-set-grouptitle', title: t('set.form.defaultHint') }, t('set.group.default')),
        referencePicker(t('set.field.defaultModel'), 'default_model', values.default_model),
        thinkingMenu,
      )
        : null

      const retrievalAdvanced = advancedOpen && view && values
        ? h(
            React.Fragment,
            null,
            fieldRow(
              t('set.field.dimension'),
              h(
                'div',
                { className: 'hrag-set-field' },
                h(HostInput, {
                  className: 'hrag-set-control',
                  inputMode: 'numeric',
                  value: values.embedding_dimension,
                  readOnly: dimensionFixed,
                  placeholder:
                    dimensionVerdict && dimensionVerdict.native != null ? String(dimensionVerdict.native) : undefined,
                  'aria-label': t('set.field.dimension'),
                  onChange: (event) => update('embedding_dimension', event.target.value),
                }),
                h(
                  'span',
                  // 12px＝与全部选择器盒内 chevron 同轴（盒内 padding-right 12）；28px 旧轴只剩本行。
                  { className: 'hrag-set-trail', style: { right: '12px' } },
                  dimensionState
                    ? h('span', { className: 'hrag-set-dot hrag-set-dot-' + (dimensionState.state === 'probing' ? 'probing' : 'untested'), title: dimensionState.reason })
                    : null,
                  dimensionTiers.length > 0
                    ? h(DshMenu, {
                        title: t('set.form.dimensionTierHint'),
                        align: 'end',
                        anchor: 'field',
                        className: 'hrag-set-tierwrap',
                        trigger: h(
                          'button',
                          { type: 'button', className: 'hrag-set-tierbtn', 'aria-label': t('set.form.dimensionTierHint') },
                          lucideChevronDownIcon(),
                        ),
                        items: [
                          ...(dimensionVerdict && dimensionVerdict.native != null
                            ? [{ type: 'label', id: 'native', text: t('set.form.dimensionNativeHint', { 0: dimensionVerdict.native }) }]
                            : []),
                          { type: 'separator', id: 'sep' },
                          { type: 'label', id: 'label', text: t('set.form.dimensionTierHint') },
                          ...dimensionTiers.map((width) => ({ id: String(width), label: String(width) })),
                        ],
                        selectedId: String(values.embedding_dimension),
                        onSelect: (id) => update('embedding_dimension', String(id)),
                      })
                    : null,
                ),
              ),
              {
                info: [
                  t('set.form.dimensionHint'),
                  t('set.form.dimensionProbeHint'),
                  dimensionFixed ? t('set.form.dimensionFixedHint', { 0: dimensionVerdict.native }) : null,
                ]
                  .filter(Boolean)
                  .join(' '),
              },
            ),
            fieldRow(
              t('set.field.sparseSource'),
              h(
                'div',
                { className: 'hrag-set-field' },
                pickerControl(
                  t('set.field.sparseSource'),
                  values.embedding_sparse_source,
                  ['provider', 'external', 'bm25'],
                  (option) => {
                    const base =
                      ({
                        provider: t('set.form.sparseSourceProvider'),
                        external: t('set.form.sparseSourceExternal'),
                        bm25: t('set.form.sparseSourceBm25'),
                      })[option] || option
                    // 原「禁选」文案后缀照带（原生 select 的 disabled 选项同款措辞）。
                    return option === 'provider' && ragSparseProviderOptionDisabled(sparseCapability)
                      ? base + ' · ' + t('set.form.sparseProviderDenseOnly')
                      : base
                  },
                  (next) => update('embedding_sparse_source', next),
                  (option) => option === 'provider' && ragSparseProviderOptionDisabled(sparseCapability),
                ),
                probeBusy.capability
                  ? h('span', { className: 'hrag-set-trail' }, t('set.form.sparseProbing'))
                  : sparseUnverified
                    ? h('span', { className: 'hrag-set-trail' }, t('set.form.sparseUnverified'))
                    : null,
              ),
              { info: t('set.form.sparseSourceHint') + ' ' + t('set.form.sparseProbeHint') },
            ),
            values.embedding_sparse_source === 'external'
              ? h(
                  React.Fragment,
                  null,
                  fieldRow(
                    t('set.form.provider'),
                    pickerControl(
                      t('set.field.sparseProvider'),
                      values.sparse_provider,
                      RAG_SPARSE_PROVIDER_OPTIONS,
                      (id) => (id === '' ? t('set.form.sparseProviderNone') : providerLabel(id)),
                      (next) => update('sparse_provider', next),
                    ),
                    { nested: true },
                  ),
                  fieldRow(
                    t('set.form.model'),
                    h(HostInput, {
                      className: 'hrag-set-control',
                      spellCheck: false,
                      value: values.sparse_model,
                      'aria-label': t('set.field.sparseModel'),
                      onChange: (event) => update('sparse_model', event.target.value),
                    }),
                    { nested: true, info: t('set.form.sparseModelHint') },
                  ),
                  fieldRow(
                    t('set.form.apiKey'),
                    secretControl('sparse_api_key', values.sparse_api_key, t('set.form.sparseApiKeyLabel'), (next) =>
                      update('sparse_api_key', next),
                    ),
                    { nested: true },
                  ),
                  fieldRow(
                    t('set.form.endpoint'),
                    h(
                      'div',
                      { className: 'hrag-set-field' },
                      h(HostInput, {
                        className: 'hrag-set-control',
                        spellCheck: false,
                        value: values.sparse_base_url,
                        'aria-label': t('set.field.sparseBaseUrl'),
                        onChange: (event) => update('sparse_base_url', event.target.value),
                      }),
                      serviceStatus
                        ? h(
                            'span',
                            { className: 'hrag-set-trail' + (serviceStatus.error ? ' hrag-set-saveerr' : '') },
                            serviceStatus.text,
                          )
                        : null,
                    ),
                    { nested: true },
                  ),
                )
              : h(
                  React.Fragment,
                  null,
                  [t('set.form.provider'), t('set.form.model'), t('set.form.apiKey'), t('set.form.endpoint')].map((label) =>
                    // key 挂 Fragment（fieldRow 的 options 不落到元素上，旧的 options.key 不会生效）。
                    h(
                      React.Fragment,
                      { key: label },
                      fieldRow(label, h('div', { className: 'hrag-set-locked' }, t('set.form.lockedExternalOnly')), { nested: true }),
                    ),
                  ),
                ),
          )
        : null

      const retrievalGroup = view && values
        ? h(
        'div',
        { className: 'hrag-set-group' },
        h('div', { className: 'hrag-set-grouptitle', title: t('set.form.retrievalHint') }, t('set.group.retrieval')),
        legBlock('embedding'),
        legBlock('rerank'),
        h(
          'button',
          {
            type: 'button',
            className: 'hrag-set-adv',
            'aria-expanded': advancedOpen,
            onClick: () => setAdvancedOpen((prev) => !prev),
          },
          h('span', { className: 'hrag-set-adv-chev' + (advancedOpen ? ' hrag-set-adv-chev-open' : '') }, dshChevronDownIcon()),
          t('set.form.advanced'),
        ),
        retrievalAdvanced,
      )
        : null

      const extractionGroup = view && values
        ? h(
            'div',
            { className: 'hrag-set-group' },
            h('div', { className: 'hrag-set-grouptitle', title: t('set.form.extractModelHint') }, t('set.group.extraction')),
            fieldRow(t('set.field.extractModel'), referencePicker(t('set.field.extractModel'), 'extract_model', values.extract_model)),
            fieldRow(t('set.field.wikiModel'), referencePicker(t('set.field.wikiModel'), 'wiki_model', values.wiki_model), {
              info: t('set.form.wikiModelHint'),
            }),
          )
        : null

      const evaluationGroup = view && values
        ? h(
            'div',
            { className: 'hrag-set-group' },
            h('div', { className: 'hrag-set-grouptitle', title: t('set.form.groupEvaluationHint') }, t('set.group.evaluation')),
            fieldRow(t('set.field.judgeModel'), referencePicker(t('set.field.judgeModel'), 'judge_model', values.judge_model)),
            fieldRow(
              t('set.field.synthesisModel'),
              referencePicker(t('set.field.synthesisModel'), 'synthesis_model', values.synthesis_model),
              { info: t('set.form.synthesisModelHint') },
            ),
          )
        : null

      const servicesGroup = view && values
        ? h(
            'div',
            { className: 'hrag-set-group' },
            h('div', { className: 'hrag-set-grouptitle', title: t('set.form.groupServicesHint') }, t('set.group.services')),
            fieldRow(
              t('set.field.qdrantUrl'),
              h(HostInput, {
                className: 'hrag-set-control',
                spellCheck: false,
                type: 'url',
                value: values.qdrant_url,
                'aria-label': t('set.field.qdrantUrl'),
                onChange: (event) => update('qdrant_url', event.target.value),
              }),
            ),
            fieldRow(
              t('set.field.parseProvider'),
              pickerControl(t('set.field.parseProvider'), values.parse_provider, RAG_PARSE_PROVIDER_OPTIONS, providerLabel, (next) =>
                update('parse_provider', next),
              ),
              { info: t('set.form.parseBaseUrlHint') },
            ),
            values.parse_provider === 'mineru-local'
              ? h(
                  React.Fragment,
                  null,
                  fieldRow(
                    t('set.field.parseBaseUrl'),
                    h(HostInput, {
                      className: 'hrag-set-control',
                      spellCheck: false,
                      value: values.parse_base_url,
                      'aria-label': t('set.field.parseBaseUrl'),
                      onChange: (event) => update('parse_base_url', event.target.value),
                    }),
                  ),
                  fieldRow(
                    t('set.field.parseTier'),
                    pickerControl(
                      t('set.field.parseTier'),
                      values.parse_tier,
                      RAG_PARSE_TIER_OPTIONS,
                      (option) => (option === '' ? t('set.form.parseTierAuto') : option),
                      (next) => update('parse_tier', next),
                    ),
                    { info: t('set.form.parseTierHint') },
                  ),
                  fieldRow(t('set.field.parseLanguage'), h('div', { className: 'hrag-set-locked' }, t('set.form.lockedCloudOnly'))),
                  fieldRow(t('set.field.parseModelVersion'), h('div', { className: 'hrag-set-locked' }, t('set.form.lockedCloudOnly'))),
                  fieldRow(t('set.field.mineruToken'), h('div', { className: 'hrag-set-locked' }, t('set.form.lockedCloudOnly'))),
                )
              : h(
                  React.Fragment,
                  null,
                  fieldRow(
                    t('set.field.parseBaseUrl'),
                    h(HostInput, {
                      className: 'hrag-set-control',
                      spellCheck: false,
                      value: values.parse_base_url,
                      placeholder: 'https://mineru.net',
                      'aria-label': t('set.field.parseBaseUrl'),
                      onChange: (event) => update('parse_base_url', event.target.value),
                    }),
                  ),
                  fieldRow(t('set.field.parseTier'), h('div', { className: 'hrag-set-locked' }, t('set.form.lockedLocalOnly'))),
                  fieldRow(
                    t('set.field.parseLanguage'),
                    pickerControl(
                      t('set.field.parseLanguage'),
                      values.parse_language,
                      RAG_PARSE_LANGUAGE_OPTIONS,
                      (option) => (option === '' ? t('set.form.parseLanguageDefault') : option),
                      (next) => update('parse_language', next),
                    ),
                    { info: t('set.form.parseLanguageHint') },
                  ),
                  fieldRow(
                    t('set.field.parseModelVersion'),
                    pickerControl(
                      t('set.field.parseModelVersion'),
                      values.parse_model_version,
                      RAG_PARSE_VERSION_OPTIONS,
                      (option) => (option === '' ? t('set.form.parseModelVersionDefault') : option),
                      (next) => update('parse_model_version', next),
                    ),
                    { info: t('set.form.parseModelVersionHint') },
                  ),
                  fieldRow(
                    t('set.field.mineruToken'),
                    secretControl('mineru_api_token', values.mineru_api_token, t('set.field.mineruToken'), (next) =>
                      update('mineru_api_token', next),
                    ),
                  ),
                ),
          )
        : null

      const asrProviderLabel = (id) => {
        const keys = {
          funasr: 'asrProviderFunasr',
          whisper: 'asrProviderWhisper',
          'openai-audio': 'asrProviderOpenaiAudio',
          dashscope: 'asrProviderDashscope',
        }
        return keys[id] ? t('set.form.' + keys[id]) : id
      }
      const asrModelHint = values
        ? values.video.asr_provider === 'whisper'
          ? t('set.form.asrModelWhisperHint')
          : values.video.asr_provider === 'funasr'
            ? t('set.form.asrModelFunasrHint')
            : t('set.form.asrModelServiceHint')
        : ''
      const hasVisionModel = managedModels.some((model) => ragIsCaptionCapable(model))
      const captionOptions = values
        ? ragVisionReferenceOptions(managedModels, values.vlm_model, t('set.form.defaultNone'))
        : []
      const captionLabel = (value) => {
        if (value === RAG_MODEL_NONE) {
          // 共用同一个框（10-14 他定）：有视觉条目＝「使用配置默认」；没有＝简写提示
          // （两态互斥）——框中与下拉同一处，不再另起一行提示。
          return hasVisionModel ? t('set.form.defaultNone') : t('set.form.vlmNoVision')
        }
        const found = captionOptions.find((option) => option.value === value)
        return found ? found.label : value
      }

      const multimodalGroup = view && values
        ? h(
            'div',
            { className: 'hrag-set-group' },
            h('div', { className: 'hrag-set-grouptitle', title: t('set.form.multimodalHint') }, t('set.group.multimodal')),
            fieldRow(
              t('set.field.captionModel'),
              h(
                'div',
                { className: 'hrag-set-field' },
                h(DshMenu, {
                  title: t('set.field.captionModel'),
                  align: 'end',
                  anchor: 'field',
                  className: 'hrag-set-picker',
                  trigger: h(
                    React.Fragment,
                    null,
                    h('span', { className: 'hrag-set-picker-label' }, captionLabel(values.vlm_model || RAG_MODEL_NONE)),
                    lucideChevronDownIcon(),
                  ),
                  items: [
                    { type: 'label', id: 'label', text: t('set.field.captionModel') },
                    ...captionOptions.map((option, index) => ({
                      id: String(index),
                      label: captionLabel(option.value),
                    })),
                  ],
                  selectedId:
                    captionOptions.findIndex((option) => option.value === (values.vlm_model || RAG_MODEL_NONE)) >= 0
                      ? String(captionOptions.findIndex((option) => option.value === (values.vlm_model || RAG_MODEL_NONE)))
                      : undefined,
                  onSelect: (id) => {
                    const option = captionOptions[Number(id)]
                    if (option) update('vlm_model', option.value === RAG_MODEL_NONE ? '' : option.value)
                  },
                }),
              ),
              { info: t('set.form.captionHint') },
            ),
            fieldRow(
              t('set.form.asrRowLabel'),
              h(
                'div',
                { className: 'hrag-set-field' },
                h(DshMenu, {
                  title: t('set.field.asrProvider'),
                  align: 'end',
                  anchor: 'field',
                  className: 'hrag-set-picker',
                  trigger: h(
                    React.Fragment,
                    null,
                    h('span', { className: 'hrag-set-picker-label' }, asrProviderLabel(values.video.asr_provider)),
                    lucideChevronDownIcon(),
                  ),
                  items: RAG_ASR_PROVIDER_GROUPS.flatMap((group) => [
                    { type: 'label', id: 'g-' + group.labelKey, text: t(group.labelKey) },
                    ...group.ids.map((id) => ({ id: id, label: asrProviderLabel(id) })),
                  ]),
                  selectedId: values.video.asr_provider,
                  onSelect: (id) => {
                    updateVideo('asr_provider', id)
                    // 切换即改值：另一引擎跑不了的名字换成目标首行（服务档名字是服务侧的、原样带过）。
                    const kept = ragAsrModelForProviderSwitch(id, values.video.asr_model)
                    if (kept !== values.video.asr_model) updateVideo('asr_model', kept)
                  },
                }),
              ),
            ),
            fieldRow(
              t('set.form.model'),
              h(
                'div',
                { className: 'hrag-set-field' },
                h(HostInput, {
                  className: 'hrag-set-control',
                  spellCheck: false,
                  value: values.video.asr_model,
                  'aria-label': t('set.field.asrModel'),
                  placeholder: asrServiceApplies ? undefined : RAG_ASR_MODEL_MENU[values.video.asr_provider][0],
                  onChange: (event) => updateVideo('asr_model', event.target.value),
                }),
                asrServiceApplies
                  ? null
                  : h(
                      'span',
                      { className: 'hrag-set-trail', style: { right: '12px' } },
                      h(DshMenu, {
                        title: t('set.form.asrModelCandidates'),
                        // 框内下拉照工作台（10-14 图2 对照）：等宽于输入框、贴着其左右缘开。
                        align: 'end',
                        anchor: 'field',
                        // 同维度行：className 换掉 DshMenu 默认的描边钮（hrag-btn-outline）——
                        // 漏传会在框内多出一枚带边框的外壳按钮（10-14 复跑点名）。
                        className: 'hrag-set-tierwrap',
                        trigger: h(
                          'button',
                          {
                            type: 'button',
                            className: 'hrag-set-tierbtn',
                            'aria-label': t('set.form.asrModelCandidates'),
                          },
                          lucideChevronDownIcon(),
                        ),
                        items: [
                          { type: 'label', id: 'label', text: t('set.form.asrModelCandidates') },
                          ...RAG_ASR_MODEL_MENU[values.video.asr_provider].map((name) => ({ id: name, label: name })),
                        ],
                        selectedId: values.video.asr_model,
                        onSelect: (id) => updateVideo('asr_model', id),
                      }),
                    ),
              ),
              { nested: true, info: asrModelHint },
            ),
            asrServiceApplies
              ? fieldRow(
                  t('set.form.apiKey'),
                  secretControl('asr_api_key', values.asr_api_key, t('set.form.asrApiKey'), (next) =>
                    update('asr_api_key', next),
                  ),
                  { nested: true },
                )
              : fieldRow(
                  t('set.form.apiKey'),
                  h('div', { className: 'hrag-set-locked' }, t('set.form.lockedServiceOnly')),
                  { nested: true },
                ),
            asrServiceApplies
              ? fieldRow(
                  t('set.form.endpoint'),
                  h(HostInput, {
                    className: 'hrag-set-control',
                    spellCheck: false,
                    value: values.asr_base_url,
                    placeholder: ragEndpointPlaceholderFor(view ? view.asr_providers : null, values.video.asr_provider),
                    'aria-label': t('set.field.asrBaseUrl'),
                    onChange: (event) => update('asr_base_url', event.target.value),
                  }),
                  { nested: true },
                )
              : fieldRow(
                  t('set.form.endpoint'),
                  h('div', { className: 'hrag-set-locked' }, t('set.form.lockedServiceOnly')),
                  { nested: true },
                ),
          )
        : null

      // Save button in the header (10-15, DSH settings shape: actions on the title row);
      // the status line stays at the form tail.
      const saveButton = h(
        'button',
        {
          type: 'button',
          className: 'hrag-btn hrag-btn-primary hrag-btn-sm',
          disabled: !hasChanges || saveBusy || Boolean(saveBlockReason),
          title: saveBlockReason || (!hasChanges ? t('set.form.noChanges') : undefined),
          onClick: handleSave,
        },
        t('set.form.save'),
      )
      // 保存按钮已上标题栏（10-15）；无反馈时不再占一行「没有需要保存的改动」。
      // 只有错误/已保存/阻断原因/校验警告才在表单尾留状态行。
      const saveStatus =
        saveError || savedNotice || saveWarning || saveBlockReason
          ? h(
              'div',
              { className: 'hrag-set-saverow' },
              saveError
                ? h('span', { className: 'hrag-set-saveerr' }, saveError)
                : savedNotice
                  ? h('span', { className: 'hrag-set-savehint' }, t('set.form.saved'))
                  : saveBlockReason
                    ? h('span', { className: 'hrag-set-savehint' }, saveBlockReason)
                    : null,
              saveWarning ? h('span', { className: 'hrag-set-savewarn', role: 'status' }, saveWarning) : null,
            )
          : null

      return h(
        React.Fragment,
        null,
        h('div', {
          className: 'hrag-modal-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose()
          },
        }),
        h(
          'div',
          { className: 'hrag-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('menu.modelSettings') },
          h(
            'div',
            { className: 'hrag-drawer-head' },
            h('span', { className: 'hrag-wk-secticon' }, dshSettingsIcon()),
            h('span', { className: 'hrag-drawer-title' }, t('menu.modelSettings')),
            view && values ? h('span', { style: { marginLeft: 'auto' } }) : null,
            view && values ? saveButton : null,
            h(
              'button',
              {
                type: 'button',
                className: 'hrag-iconbare',
                'aria-label': t('chunk.close'),
                title: t('chunk.close'),
                onClick: onClose,
              },
              hostIcon('IconCloseOutlineRegular') ? h(hostIcon('IconCloseOutlineRegular'), {}) : '✕',
            ),
          ),
          h(
            'div',
            { className: 'hrag-drawer-body hrag-set-body' },
            migrationLine,
            configQ.failure
              ? h('div', { className: 'hrag-ev-hint hrag-ev-hint-error hrag-wk-inset' }, t('set.loadFailed'))
              : !view || !values
                ? h('div', { className: 'hrag-ev-hint hrag-wk-inset' }, t('wk.loading'))
                : h(
                    React.Fragment,
                    null,
                    defaultModelGroup,
                    retrievalGroup,
                    extractionGroup,
                    evaluationGroup,
                    multimodalGroup,
                    servicesGroup,
                    saveStatus,
            h(
              'div',
              { className: 'hrag-set-card' },
              h('div', { className: 'hrag-set-cardhead' }, t('reindex.button')),
              h(
                'div',
                { className: 'hrag-set-cardbody' },
                h(
                  'div',
                  { style: { width: '100%' } },
                  fieldRow(
                    t('reindex.kbLabel'),
                    pickerControl(
                      t('reindex.kbLabel'),
                      reindexKbId,
                      (kbs || []).map((kb) => String(kb.id)),
                      (id) => {
                        if (!id) return t('reindex.kbPlaceholder')
                        const kb = (kbs || []).find((item) => String(item.id) === id)
                        return kb ? String(kb.name || kb.id) : id
                      },
                      (next) => {
                        setReindexError(null)
                        setReindexState(null)
                        setReindexKbId(next)
                      },
                    ),
                  ),
                ),
                h(
                  'div',
                  { className: 'hrag-set-saverow', style: { width: '100%', justifyContent: 'flex-end' } },
                  reindexLine ? h('span', { className: 'hrag-reindex-status' }, reindexLine) : null,
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'hrag-btn hrag-btn-outline hrag-btn-sm',
                      disabled: !reindexKbId || reindexBusy || reindexRunning,
                      title: t('reindex.button'),
                      onClick: () => {
                        setReindexError(null)
                        setReindexConfirmOpen(true)
                      },
                    },
                    t('reindex.button'),
                  ),
                ),
              ),
            ),
                ),
          ),
        ),
        dimensionConfirmOpen
          ? h(ConfirmDialog, {
              t: t,
              title: t('set.form.dimensionConfirmTitle'),
              description: t('set.form.dimensionConfirmDescription'),
              busy: saveBusy,
              danger: false,
              cancelKey: 'doc.cancel',
              confirmKey: 'set.form.dimensionConfirmAction',
              onCancel: () => setDimensionConfirmOpen(false),
              onConfirm: () => {
                setDimensionConfirmOpen(false)
                submitSave()
              },
            })
          : null,
        reindexConfirmOpen
          ? h(ConfirmDialog, {
              t,
              title: t('reindex.confirmTitle'),
              description: t('reindex.confirmDescription'),
              error: reindexError,
              busy: reindexBusy,
              cancelKey: 'doc.cancel',
              confirmKey: 'reindex.confirmAction',
              onCancel: () => setReindexConfirmOpen(false),
              onConfirm: confirmReindex,
            })
          : null,
      )
    }

    // ── 设置面批 2（Task 2）：功能模型表单纯逻辑，照工作台 core/rag/config-form.ts 逐条移植 ──
    const RAG_MASKED_SECRET = '********'
    const RAG_MODEL_NONE = '__none__'
    const RAG_DEFAULT_DIMENSION = 1024
    const RAG_ENDPOINT_PLACEHOLDER_FALLBACK = 'https://api.example.com/v1'
    const RAG_PROBE_DEBOUNCE_MS = 400
    const RAG_EMBEDDING_PROVIDER_OPTIONS = ['dashscope', 'volcengine-ark', 'openai-compatible']
    const RAG_SPARSE_SOURCE_OPTIONS = ['provider', 'external', 'bm25']
    const RAG_SPARSE_PROVIDER_OPTIONS = ['', 'tei-sparse']
    const RAG_RERANK_PROVIDER_OPTIONS = ['dashscope', 'generic-rerank', 'tei-rerank']
    const RAG_ASR_PROVIDER_OPTIONS = ['funasr', 'whisper', 'openai-audio', 'dashscope']
    const RAG_PARSE_PROVIDER_OPTIONS = ['mineru-cloud', 'mineru-local']
    const RAG_PARSE_TIER_OPTIONS = ['', 'flash', 'basic', 'standard', 'advanced']
    const RAG_PARSE_LANGUAGE_OPTIONS = [
      '', 'ch', 'ch_server', 'en', 'japan', 'korean', 'chinese_cht', 'ta', 'te', 'ka',
      'el', 'th', 'latin', 'arabic', 'cyrillic', 'east_slavic', 'devanagari',
    ]
    const RAG_PARSE_VERSION_OPTIONS = ['', 'pipeline', 'vlm']
    const RAG_TEXT_FIELDS = [
      'qdrant_url', 'embedding_model', 'rerank_model', 'vlm_model', 'extract_model',
      'judge_model', 'default_model', 'wiki_model', 'synthesis_model', 'embedding_base_url',
      'sparse_base_url', 'sparse_model', 'rerank_base_url', 'parse_base_url', 'asr_base_url',
    ]
    const RAG_SECRET_FIELDS = ['embedding_api_key', 'rerank_api_key', 'mineru_api_token', 'sparse_api_key', 'asr_api_key']
    const RAG_NUMERIC_FIELDS = ['embedding_dimension']
    const RAG_SELECT_FIELDS = [
      'embedding_provider', 'embedding_sparse_source', 'sparse_provider', 'rerank_provider',
      'parse_provider', 'parse_tier', 'parse_language', 'parse_model_version',
    ]
    const RAG_THINKING_FIELDS = ['extract_thinking', 'wiki_thinking', 'judge_thinking', 'synthesis_thinking', 'vlm_thinking']

    function ragAsEnum(value, options, fallback) {
      return typeof value === 'string' && options.indexOf(value) !== -1 ? value : fallback
    }

    /** 生效视图 → 表单值；存量密钥保持掩码原样（输入框显示「已设置」）。 */
    function ragFormValuesFromConfig(view) {
      const config = view && view.config && typeof view.config === 'object' ? view.config : {}
      const video = config.video && typeof config.video === 'object' ? config.video : {}
      const values = {
        qdrant_url: String(config.qdrant_url || ''),
        embedding_model: String(config.embedding_model || ''),
        embedding_api_key: String(config.embedding_api_key || ''),
        rerank_model: String(config.rerank_model || ''),
        rerank_api_key: String(config.rerank_api_key || ''),
        vlm_model: String(config.vlm_model || ''),
        extract_model: String(config.extract_model || ''),
        judge_model: String(config.judge_model || ''),
        default_model: String(config.default_model || ''),
        wiki_model: String(config.wiki_model || ''),
        synthesis_model: String(config.synthesis_model || ''),
        mineru_api_token: String(config.mineru_api_token || ''),
        embedding_provider: ragAsEnum(config.embedding_provider, RAG_EMBEDDING_PROVIDER_OPTIONS, 'dashscope'),
        embedding_base_url: String(config.embedding_base_url || ''),
        embedding_dimension: config.embedding_dimension == null ? '' : String(config.embedding_dimension),
        embedding_sparse_source: ragAsEnum(config.embedding_sparse_source, RAG_SPARSE_SOURCE_OPTIONS, 'provider'),
        sparse_provider: ragAsEnum(config.sparse_provider, RAG_SPARSE_PROVIDER_OPTIONS, ''),
        sparse_base_url: String(config.sparse_base_url || ''),
        sparse_model: String(config.sparse_model || ''),
        sparse_api_key: String(config.sparse_api_key || ''),
        rerank_provider: ragAsEnum(config.rerank_provider, RAG_RERANK_PROVIDER_OPTIONS, 'dashscope'),
        rerank_base_url: String(config.rerank_base_url || ''),
        parse_provider: ragAsEnum(config.parse_provider, RAG_PARSE_PROVIDER_OPTIONS, 'mineru-cloud'),
        parse_base_url: String(config.parse_base_url || ''),
        parse_tier: ragAsEnum(config.parse_tier, RAG_PARSE_TIER_OPTIONS, ''),
        parse_language: ragAsEnum(config.parse_language, RAG_PARSE_LANGUAGE_OPTIONS, ''),
        parse_model_version: ragAsEnum(config.parse_model_version, RAG_PARSE_VERSION_OPTIONS, ''),
        asr_base_url: String(config.asr_base_url || ''),
        asr_api_key: String(config.asr_api_key || ''),
        video: {
          asr_provider: ragAsEnum(video.asr_provider, RAG_ASR_PROVIDER_OPTIONS, 'funasr'),
          asr_model: String(video.asr_model || ''),
        },
      }
      for (const key of RAG_THINKING_FIELDS) values[key] = Boolean(config[key])
      return values
    }

    function ragLoaded(view, key) {
      const value = view && view.config ? view.config[key] : null
      return typeof value === 'string' ? value : ''
    }

    function ragLoadedNumber(view, key) {
      const value = view && view.config ? view.config[key] : null
      return typeof value === 'number' ? String(value) : ''
    }

    /** 该字段是否由配置文件（ui 覆盖）持有——决定「原样携带」还是「显式清除」。 */
    function ragOwned(view, key) {
      return Boolean(view && view.sources && view.sources[key] === 'ui')
    }

    /** PUT 全量替换：文件持有的字段原样携带，只有真正编辑过的字段才改写。 */
    function ragBuildInput(values, view) {
      const input = {}
      for (const key of RAG_TEXT_FIELDS) {
        const next = values[key].trim()
        const previous = ragLoaded(view, key)
        if (next === previous) {
          if (next !== '' && ragOwned(view, key)) input[key] = next
          continue
        }
        if (next !== '' || ragOwned(view, key)) input[key] = next
      }
      for (const key of RAG_NUMERIC_FIELDS) {
        const raw = values[key].trim()
        const previous = ragLoadedNumber(view, key)
        if (raw === previous) {
          if (raw !== '' && ragOwned(view, key)) input[key] = Number(raw)
          continue
        }
        if (raw === '') {
          if (ragOwned(view, key)) input[key] = null
          continue
        }
        const parsed = Number(raw)
        if (!Number.isInteger(parsed) || parsed <= 0) continue
        input[key] = parsed
      }
      for (const key of RAG_SECRET_FIELDS) {
        const next = values[key].trim()
        if (next === RAG_MASKED_SECRET) {
          if (ragOwned(view, key)) input[key] = RAG_MASKED_SECRET
          continue
        }
        if (next === '') {
          if (ragOwned(view, key)) input[key] = ''
          continue
        }
        input[key] = next
      }
      for (const key of RAG_SELECT_FIELDS) {
        const next = values[key]
        const previous = ragLoaded(view, key)
        if (next === previous) {
          if (next !== '' && ragOwned(view, key)) input[key] = next
          continue
        }
        if (next !== '' || ragOwned(view, key)) input[key] = next === '' ? null : next
      }
      for (const key of RAG_THINKING_FIELDS) {
        const next = values[key]
        const previous = Boolean(view && view.config ? view.config[key] : false)
        if (next === previous) {
          if (ragOwned(view, key)) input[key] = next
          continue
        }
        input[key] = next
      }
      const video = {}
      const loadedVideo = view && view.config && view.config.video ? view.config.video : {}
      const nextModel = values.video.asr_model.trim()
      const previousModel = typeof loadedVideo.asr_model === 'string' ? loadedVideo.asr_model : ''
      if (nextModel === previousModel) {
        if (nextModel !== '' && ragOwned(view, 'video.asr_model')) video.asr_model = nextModel
      } else if (nextModel !== '' || ragOwned(view, 'video.asr_model')) {
        video.asr_model = nextModel
      }
      const provider = ragAsEnum(values.video.asr_provider, RAG_ASR_PROVIDER_OPTIONS, 'funasr')
      const loadedProvider = ragAsEnum(loadedVideo.asr_provider, RAG_ASR_PROVIDER_OPTIONS, 'funasr')
      if (provider !== loadedProvider || ragOwned(view, 'video.asr_provider')) video.asr_provider = provider
      if (Object.keys(video).length > 0) input.video = video
      return input
    }

    /** 是否真编辑过（携带不算编辑）：没有改动时保存保持禁用。 */
    function ragHasChanges(values, view) {
      const seeded = ragFormValuesFromConfig(view)
      const edited = (a, b) => String(a).trim() !== String(b).trim()
      if (RAG_TEXT_FIELDS.some((key) => edited(values[key], seeded[key]))) return true
      if (RAG_NUMERIC_FIELDS.some((key) => edited(values[key], seeded[key]))) return true
      if (RAG_SECRET_FIELDS.some((key) => edited(values[key], seeded[key]))) return true
      if (RAG_SELECT_FIELDS.some((key) => values[key] !== seeded[key])) return true
      if (RAG_THINKING_FIELDS.some((key) => values[key] !== seeded[key])) return true
      return edited(values.video.asr_provider, seeded.video.asr_provider) ||
        edited(values.video.asr_model, seeded.video.asr_model)
    }

    function ragEffectiveDimension(raw) {
      const parsed = Number.parseInt(typeof raw === 'number' ? String(raw) : String(raw == null ? '' : raw).trim(), 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : RAG_DEFAULT_DIMENSION
    }

    /** 宽度按「生效值」比对：把空字段写成 1024 不算改动，而清掉声明算。 */
    function ragChangesDimension(values, view) {
      return ragEffectiveDimension(values.embedding_dimension) !==
        ragEffectiveDimension(view && view.config ? view.config.embedding_dimension : null)
    }

    /** 结论跟着取值走：编辑后旧结论即失效（键不含稀疏来源本身——它是要问的问题）。 */
    function ragSparseProbeKey(values) {
      return [values.embedding_provider, values.embedding_model.trim(), values.embedding_base_url.trim()].join('|')
    }

    /** allowlist 定方言、探针定模型；未证实一律 unknown（不拦不锁）。 */
    function ragResolveSparseCapability(values, providers, probe) {
      const capability = Array.isArray(providers)
        ? providers.find((entry) => entry && entry.provider_id === values.embedding_provider)
        : null
      if (capability && capability.emits_sparse === false) return 'unsupported'
      if (!probe || probe.key !== ragSparseProbeKey(values)) return 'unknown'
      if (probe.status === 'supported') return 'supported'
      if (probe.status === 'unsupported') return 'unsupported'
      return 'unknown'
    }

    /** 由表单当前的 provider 判定（一切换就即时告警，不等保存）。 */
    function ragSparseSourceUnsupported(values, providers, probe) {
      if (values.embedding_sparse_source !== 'provider') return false
      return ragResolveSparseCapability(values, providers, probe) === 'unsupported'
    }

    function ragSparseProviderOptionDisabled(capability) {
      return capability === 'unsupported'
    }

    /** external 但没选具体提供方——运行时明确拒绝的组合，编辑期即拦。 */
    function ragSparseServiceUnconfigured(values) {
      return values.embedding_sparse_source === 'external' && values.sparse_provider === ''
    }

    function ragShouldProbeSparseService(values) {
      return (
        values.embedding_sparse_source === 'external' &&
        values.sparse_provider !== '' &&
        values.sparse_base_url.trim() !== ''
      )
    }

    function ragSparseServiceProbeKey(values, hasKey) {
      return [values.sparse_provider, values.sparse_base_url.trim(), hasKey ? 'key' : 'nokey'].join('|')
    }

    function ragSparseServiceVerdictFor(values, hasKey, probe) {
      if (!probe) return null
      return probe.key === ragSparseServiceProbeKey(values, hasKey) ? probe : null
    }

    /** 维度结论的取值坐标（宽度本身不在键里——它是要问的问题）。 */
    function ragDimensionProbeKey(values) {
      return [values.embedding_provider, values.embedding_model.trim(), values.embedding_base_url.trim()].join('|')
    }

    /** 一条腿连通结论的坐标：向量腿带上生效宽度（换了宽度就是新问题）。 */
    function ragConnectivityProbeKey(leg, values, hasKey) {
      const coordinates = leg === 'embedding'
        ? [values.embedding_provider, values.embedding_model.trim(), values.embedding_base_url.trim(), values.embedding_dimension.trim()]
        : [values.rerank_provider, values.rerank_model.trim(), values.rerank_base_url.trim()]
      return [leg].concat(coordinates, [hasKey ? 'key' : 'nokey']).join('|')
    }

    /** 端点占位＝能力块的 vendor 地址；没有就用兜底示例（永远是灰提示、不是值）。 */
    function ragEndpointPlaceholderFor(providers, providerId) {
      const entry = Array.isArray(providers)
        ? providers.find((item) => item && item.provider_id === providerId)
        : null
      return (entry && entry.default_endpoint) || RAG_ENDPOINT_PLACEHOLDER_FALLBACK
    }

    /** 模型引用选项：显式「不设」项＋已配置模型（显示名优先）＋存量孤儿值。 */
    function ragModelReferenceOptions(models, current, noneLabel) {
      const options = [{ value: RAG_MODEL_NONE, label: noneLabel }]
      for (const model of models) {
        if (!model || typeof model.name !== 'string') continue
        const display = typeof model.display_name === 'string' ? model.display_name.trim() : ''
        options.push({ value: model.name, label: display !== '' ? display : model.name })
      }
      if (current && !options.some((option) => option.value === current)) {
        options.push({ value: current, label: current })
      }
      return options
    }

    /** 档位快捷项：① 型＝探到的有效档；② 型＝≤ 原生的候选；③ 型没有档位区。 */
    function ragDimensionTiersFor(verdict) {
      if (!verdict || verdict.status !== 'ok') return []
      if (verdict.type === 'tiered') return Array.isArray(verdict.values) ? verdict.values : []
      if (verdict.type === 'range' && verdict.native != null) {
        return Array.isArray(verdict.candidates)
          ? verdict.candidates.filter((width) => width <= verdict.native)
          : []
      }
      return []
    }

    // ── 设置面批 3（Task 3）：多模态纯逻辑，照工作台移植（caption 视觉筛选＋ASR 引擎切换）──
    const RAG_ASR_LOCAL_ENGINES = ['funasr', 'whisper']
    const RAG_ASR_PROVIDER_GROUPS = [
      { labelKey: 'set.form.asrGroupLocal', ids: RAG_ASR_LOCAL_ENGINES },
      { labelKey: 'set.form.asrGroupProtocol', ids: ['openai-audio'] },
      { labelKey: 'set.form.asrGroupNative', ids: ['dashscope'] },
    ]
    const RAG_ASR_MODEL_MENU = {
      funasr: ['paraformer-zh', 'paraformer-en'],
      whisper: ['small', 'tiny', 'base', 'medium', 'large-v3', 'large-v3-turbo'],
    }
    const RAG_WHISPER_MODEL_NAMES = new Set([
      'tiny.en', 'tiny', 'base.en', 'base', 'small.en', 'small', 'medium.en', 'medium',
      'large-v1', 'large-v2', 'large-v3', 'large', 'turbo', 'large-v3-turbo',
    ])

    function ragIsCaptionCapable(model) {
      return Boolean(model && model.supports_vision)
    }

    /** caption 选择器：只列视觉条目＋「使用配置默认」＋存量孤儿值（照工作台口径）。 */
    function ragVisionReferenceOptions(models, current, noneLabel) {
      return ragModelReferenceOptions(models.filter(ragIsCaptionCapable), current, noneLabel)
    }

    /** 服务档＝两个协议层；本地引擎＝进程内两个（决定锁定态与候选菜单）。 */
    function ragAsrServiceApplies(values) {
      return values.video.asr_provider === 'openai-audio' || values.video.asr_provider === 'dashscope'
    }

    /** 切换引擎即改值：另一引擎跑不了的名字换成目标首行；服务档名字是服务侧的、原样带过。 */
    function ragAsrModelForProviderSwitch(next, value) {
      const name = String(value || '').trim()
      if (next === 'openai-audio' || next === 'dashscope') return value
      if (next === 'funasr') {
        return RAG_WHISPER_MODEL_NAMES.has(name) ? RAG_ASR_MODEL_MENU.funasr[0] : value
      }
      return RAG_WHISPER_MODEL_NAMES.has(name) ? value : RAG_ASR_MODEL_MENU.whisper[0]
    }

    /** 唯一能拦 ASR 保存的判定（照工作台探针休眠：门留着，verdict 无来源）。 */
    function ragAsrProbeBlocksSave(verdict) {
      return Boolean(verdict && verdict.status === 'no_timestamps')
    }

    // Text drags inside the panel must stay untouched — only file drags are ours.
    function isFileDrag(transfer) {
      const types = transfer ? transfer.types : null
      if (!types) return false
      return Array.prototype.indexOf.call(types, 'Files') !== -1
    }

    // ── 拖拽类型探针（小件批 Task 2，照工作台 `file-type-badge.tsx` 逐条移植）：
    // dragover 的 items 带各文件 MIME（永不暴露内容），落前判定可落/全拒，驱动
    // 空态九宫格点亮与横幅文案。未知 MIME 计拒（点亮了又拒比不亮更糟）。
    const DRAG_MIME_SPECS = [
      { kind: 'pdf', mimes: ['application/pdf'], suffixes: ['.pdf'] },
      {
        kind: 'word',
        mimes: [
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.apple.pages',
          'application/rtf',
          'text/plain',
        ],
        suffixes: ['.doc', '.docx', '.wps', '.pages', '.rtf', '.txt'],
      },
      {
        kind: 'sheet',
        mimes: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'text/tab-separated-values',
          'application/vnd.apple.numbers',
        ],
        suffixes: ['.xls', '.xlsx', '.csv', '.tsv', '.numbers', '.et'],
      },
      {
        kind: 'ppt',
        mimes: [
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.apple.keynote',
        ],
        suffixes: ['.ppt', '.pptx', '.key', '.dps'],
      },
      {
        kind: 'code',
        mimes: [
          'text/markdown',
          'text/x-markdown',
          'application/json',
          'application/xml',
          'text/xml',
          'text/yaml',
          'text/x-yaml',
          'text/x-python',
          'application/javascript',
          'text/javascript',
          'application/sql',
        ],
        suffixes: ['.md', '.markdown', '.json', '.yaml', '.xml', '.py', '.js', '.sql'],
      },
      {
        kind: 'archive',
        mimes: [
          'application/zip',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
          'application/x-tar',
          'application/gzip',
        ],
        suffixes: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      },
    ]

    function dragSpecForMime(mime) {
      if (!mime) return null
      const direct = DRAG_MIME_SPECS.find((spec) => spec.mimes.indexOf(mime) !== -1)
      if (direct) return direct
      if (mime.indexOf('image/') === 0) {
        return { kind: 'image', mimes: [], suffixes: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'] }
      }
      if (mime.indexOf('audio/') === 0 || mime.indexOf('video/') === 0) {
        return { kind: 'media', mimes: [], suffixes: ['.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav'] }
      }
      return null
    }

    /** DataTransferItemList（或测试夹具）→ 可落判词；非 file 项（拖文本/链接）忽略。 */
    function probeDraggedItems(items, supportedSuffixes) {
      const allowed = (supportedSuffixes || []).map((suffix) => String(suffix).toLowerCase())
      const lit = []
      let anyAccepted = false
      let anyRejected = false
      const list = items ? Array.from(items) : []
      for (const item of list) {
        if (!item || item.kind !== 'file') continue
        const spec = dragSpecForMime(item.type)
        const accepted = spec ? spec.suffixes.some((suffix) => allowed.indexOf(suffix) !== -1) : false
        if (accepted && spec) {
          if (lit.indexOf(spec.kind) === -1) lit.push(spec.kind)
          anyAccepted = true
        } else {
          anyRejected = true
        }
      }
      return { litKinds: lit, anyAccepted: anyAccepted, anyRejected: anyRejected }
    }

    /** 判词指纹——dragover 高频，只有变化才重渲（照工作台 `probeSignature`）。 */
    function probeSignature(probe) {
      if (!probe) return ''
      return probe.litKinds.join(',') + '|' + (probe.anyAccepted ? 1 : 0) + '|' + (probe.anyRejected ? 1 : 0)
    }

    function splitDroppedFiles(transfer) {
      const files = []
      let dirs = 0
      const items = transfer && transfer.items ? transfer.items : null
      if (items && items.length) {
        for (let index = 0; index < items.length; index += 1) {
          const item = items[index]
          if (!item || item.kind !== 'file') continue
          const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
          if (entry && entry.isDirectory) {
            dirs += 1
            continue
          }
          const file = typeof item.getAsFile === 'function' ? item.getAsFile() : null
          if (file) files.push(file)
        }
      } else if (transfer && transfer.files) {
        for (let index = 0; index < transfer.files.length; index += 1) files.push(transfer.files[index])
      }
      return { files: files, dirs: dirs }
    }

    // ── 重复上传拦截（Task 8）：判同/改名/哈希，照工作台 duplicate-check 逐条移植 ──
    function dupBaseName(filename) {
      const name = String(filename)
      const dot = name.lastIndexOf('.')
      return dot <= 0 ? name : name.slice(0, dot)
    }

    function dupSuffix(filename) {
      const name = String(filename)
      const dot = name.lastIndexOf('.')
      return dot <= 0 ? '' : name.slice(dot).toLowerCase()
    }

    // ── 白名单兜底（Task 4，D2＝甲）：白名单未取（未加载 null／取失败空返）时照拦——
    // 常量照工作台 `supported-formats.ts` FALLBACK_SUPPORTED_SUFFIXES 逐条（15 项）。
    const FALLBACK_SUPPORTED_SUFFIXES = ['.md', '.markdown', '.txt', '.csv', '.tsv', '.xlsx', '.xls', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg']

    /** 工作台同款派生（`page.tsx: data?.suffixes ?? FALLBACK`）：未取两窗回退常量。 */
    function supportedSuffixesFor(fetched) {
      return Array.isArray(fetched) && fetched.length > 0 ? fetched : FALLBACK_SUPPORTED_SUFFIXES
    }

    /** 同名预检：基名精确（显示名不是归一化键），后缀大小写不敏感。 */
    function dupFindByName(filename, documents) {
      const wantedBase = dupBaseName(filename)
      const wantedSuffix = dupSuffix(filename)
      return documents.find(
        (document) => dupBaseName(document.name) === wantedBase && dupSuffix(document.name) === wantedSuffix,
      )
    }

    /** 同名命中后再看哈希：同哈希＝identical，异哈希或旧行无哈希（无法自证）＝conflict。 */
    function dupVerdict(duplicate, fileHash) {
      if (!duplicate) return { kind: 'clean' }
      if (duplicate.content_hash != null && duplicate.content_hash === fileHash) {
        return { kind: 'identical', doc: duplicate }
      }
      return { kind: 'conflict', doc: duplicate }
    }

    /** 分配不冲突的副本名：`name (2).ext` 递增；existingNames 含本批已分配的副本。 */
    function dupNextCopyName(filename, existingNames) {
      const base = dupBaseName(filename)
      const suffix = dupSuffix(filename)
      let counter = 2
      let candidate = base + ' (' + String(counter) + ')' + suffix
      while (existingNames.has(candidate)) {
        counter += 1
        candidate = base + ' (' + String(counter) + ')' + suffix
      }
      return candidate
    }

    /** 上传前判同用：SHA-256 hex（WebCrypto；非安全上下文会抛，调用方降级直传）。 */
    async function dupComputeSha256(file) {
      const buffer = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buffer)
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
    }

    /** 重复上传确认弹层（Task 8）：形制照面板既有对话框，文案照工作台逐字。 */
    function DuplicateUploadDialog({ t, pending, onResolve }) {
      React.useEffect(() => {
        if (!pending) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') onResolve('cancel')
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [pending, onResolve])
      if (!pending) return null
      const identical = pending.kind === 'identical'
      return h(
        'div',
        {
          className: 'hrag-overlay',
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onResolve('cancel')
          },
        },
        h(
          'div',
          {
            className: 'hrag-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': identical ? t('dup.identicalTitle') : t('dup.conflictTitle'),
          },
          h('div', { className: 'hrag-dialog-title' }, identical ? t('dup.identicalTitle') : t('dup.conflictTitle')),
          h(
            'div',
            { className: 'hrag-dialog-body' },
            identical
              ? t('dup.identicalDescription', { 0: pending.fileName })
              : t('dup.conflictDescription', { 0: pending.fileName }) +
                  (pending.copyName ? ' ' + t('dup.copyNamePreview', { 0: pending.copyName }) : ''),
          ),
          h(
            'div',
            { className: 'hrag-dialog-actions' },
            identical
              ? [
                  h(
                    'button',
                    { key: 'copy', type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => onResolve('copy') },
                    t('dup.keepCopy'),
                  ),
                  h(
                    'button',
                    { key: 'skip', type: 'button', className: 'hrag-btn hrag-btn-primary', autoFocus: true, onClick: () => onResolve('skip') },
                    t('dup.skipUpload'),
                  ),
                ]
              : [
                  h(
                    'button',
                    { key: 'cancel', type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => onResolve('cancel') },
                    t('doc.cancel'),
                  ),
                  h(
                    'button',
                    { key: 'copy', type: 'button', className: 'hrag-btn hrag-btn-primary', onClick: () => onResolve('copy') },
                    t('dup.keepBoth'),
                  ),
                  h(
                    'button',
                    { key: 'replace', type: 'button', className: 'hrag-btn hrag-btn-danger', onClick: () => onResolve('replace') },
                    t('dup.replaceOld'),
                  ),
                ],
          ),
        ),
      )
    }

    /** tab 行折叠边界（纯函数，冒烟钉；照工作台 tab-strip.utils）：未滚动态下
        「完整放得下」的前缀留平铺侧、其余进下拉——边界只随宽度变、滚动永不改它。
        itemEnds[i] = 第 i 枚 tab 的 offsetLeft + offsetWidth（天然含间隔）。 */
    const TABS_MASK_WIDTH = 40

    function computeFoldCount(containerWidth, itemEnds, maskWidth) {
      const overflow = itemEnds.some((end) => end > containerWidth)
      const effective = overflow ? containerWidth - maskWidth : containerWidth
      let count = 0
      for (const end of itemEnds) {
        if (end > effective) break
        count += 1
      }
      return count
    }

    /** tab 行溢出降级（A⑦）：宽档＝原平铺（零行为变化）；窄档＝放不下的 tab
        折入右缘遮罩下拉（固定折点——下拉成员只随宽度变、滚动永不改），激活项
        滚入有效可见区（栏宽−遮罩宽，避右缘遮罩）＋尾垫。六枚 tab 永在行内 DOM。 */
    function TabsStrip({ t, section, onSelect }) {
      const scrollRef = React.useRef(null)
      const [foldCount, setFoldCount] = React.useState(SECTIONS.length)
      const [overflowing, setOverflowing] = React.useState(false)

      const measure = React.useCallback(() => {
        const element = scrollRef.current
        if (!element) return
        const ends = Array.from(element.querySelectorAll('.hrag-tab')).map(
          (node) => node.offsetLeft + node.offsetWidth,
        )
        const width = element.clientWidth
        const nextFold = computeFoldCount(width, ends, TABS_MASK_WIDTH)
        // 遮罩条件＝有 tab 放不完整（⟺ 下拉非空）。不用 scrollWidth：尾垫会把它撑大。
        const nextOverflow = ends.some((end) => end > width)
        setFoldCount((prev) => (prev === nextFold ? prev : nextFold))
        setOverflowing((prev) => (prev === nextOverflow ? prev : nextOverflow))
      }, [])

      // 每次渲染后量一次（换语言等标签宽变化而容器没变时也兜住）；RO 兜拖宽。
      React.useLayoutEffect(() => {
        measure()
      })
      React.useEffect(() => {
        const element = scrollRef.current
        if (!element || typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(() => measure())
        observer.observe(element)
        return () => observer.disconnect()
      }, [measure])

      // 激活项滚入有效可见区——含从下拉切回的同一路径（activeTab 变化即滚）。
      React.useEffect(() => {
        const element = scrollRef.current
        if (!element) return
        const active = element.querySelector('.hrag-tab[aria-selected="true"]')
        if (!active) return
        const viewWidth =
          element.clientWidth - (element.scrollWidth > element.clientWidth ? TABS_MASK_WIDTH : 0)
        const start = active.offsetLeft
        const end = start + active.offsetWidth
        if (start < element.scrollLeft) {
          element.scrollLeft = start
        } else if (end > element.scrollLeft + viewWidth) {
          element.scrollLeft = end - viewWidth
        }
      }, [section])

      return h(
        'div',
        { className: 'hrag-tabswrap' },
        h(
          'div',
          { className: 'hrag-tabs', role: 'tablist', ref: scrollRef },
          h(
            'div',
            { className: 'hrag-tabs-list', role: 'presentation' },
            SECTIONS.map((entry) =>
              h(
                'button',
                {
                  key: entry.id,
                  type: 'button',
                  role: 'tab',
                  'aria-selected': section === entry.id,
                  className: 'hrag-tab',
                  onClick: () => onSelect(entry.id),
                },
                t(entry.label),
              ),
            ),
          ),
          overflowing ? h('div', { className: 'hrag-tabs-tail', 'aria-hidden': 'true' }) : null,
        ),
        overflowing
          ? h(DshMenu, {
              title: t('shell.tabs.more'),
              align: 'end',
              className: 'hrag-tabs-mask',
              trigger: h('span', { className: 'hrag-tabs-mask-chev' }, dshChevronDownIcon()),
              items: SECTIONS.slice(foldCount).map((entry) => ({
                id: entry.id,
                label: t(entry.label),
              })),
              selectedId: section,
              onSelect: (id) => onSelect(id),
            })
          : null,
      )
    }

    /** 库下拉拖拽排序（库排序拖拽件，D3 甲；spike `kb-drag-spike.html` 实证）：拖拽源
        ＝行 label 内自绘 draggable span（宿主菜单件不动）；跨行即挪槽（sortable 口径，
        照工作台 kb-list-panel），drop 只落地；窗口级 dragover 委托——宿主行钮无 id
        属性，行身份读自源 span 的 `data-kbid`（elementFromPoint → closest 行钮）。
        拖拽中宿主菜单不关（外点 pointerdown 才关；spike 实证）。 */
    function useKbDragReorder(onMove) {
      const [dragId, setDragId] = React.useState(null)
      const overRef = React.useRef(null)

      React.useEffect(() => {
        if (!dragId) return undefined
        const finish = () => {
          setDragId(null)
          overRef.current = null
        }
        const onDragOver = (event) => {
          event.preventDefault()
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
          const node = document.elementFromPoint(event.clientX, event.clientY)
          const row = node && node.closest ? node.closest('button') : null
          const holder = row ? row.querySelector('[data-kbid]') : null
          const targetId = holder ? holder.getAttribute('data-kbid') : null
          if (!targetId || targetId === dragId || targetId === overRef.current) return
          overRef.current = targetId
          onMove(dragId, targetId)
        }
        const onDrop = (event) => {
          event.preventDefault()
          finish()
        }
        window.addEventListener('dragover', onDragOver)
        window.addEventListener('drop', onDrop)
        window.addEventListener('dragend', finish)
        return () => {
          window.removeEventListener('dragover', onDragOver)
          window.removeEventListener('drop', onDrop)
          window.removeEventListener('dragend', finish)
        }
      }, [dragId, onMove])

      const dragLabel = (id, name) =>
        h(
          'span',
          {
            className: 'hrag-kbdrag' + (dragId === id ? ' hrag-kbdrag-dragging' : ''),
            draggable: true,
            'data-kbid': id,
            onDragStart: (event) => {
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', id)
              }
              overRef.current = null
              setDragId(id)
            },
          },
          name,
        )
      return dragLabel
    }

    /** 原生 title 统一换暗泡（主树/DSH 同款黑底白字）：捕获层只作用于
        `.hrag-root`；悬停期间暂存 title 并让位给暗泡，离开时原样还原。 */
    function NativeTipLayer() {
      React.useEffect(() => {
        const bubble = document.createElement('div')
        bubble.className = 'hrag-native-tip'
        bubble.id = 'hrag-native-tip-' + Math.random().toString(36).slice(2)
        bubble.setAttribute('role', 'tooltip')
        bubble.style.display = 'none'
        document.body.appendChild(bubble)
        let current = null
        let savedTitle = null
        let savedDescribedBy = null
        let showTimer = null
        let titleObserver = null
        let point = { x: 0, y: 0 }
        const hide = () => {
          if (showTimer !== null) {
            clearTimeout(showTimer)
            showTimer = null
          }
          bubble.style.display = 'none'
          bubble.textContent = ''
        }
        const restore = () => {
          hide()
          if (titleObserver) {
            titleObserver.disconnect()
            titleObserver = null
          }
          if (current) {
            if (savedTitle !== null) current.setAttribute('title', savedTitle)
            if (savedDescribedBy === null) current.removeAttribute('aria-describedby')
            else current.setAttribute('aria-describedby', savedDescribedBy)
            current.removeAttribute('data-hrag-tip')
          }
          current = null
          savedTitle = null
          savedDescribedBy = null
        }
        const place = () => {
          bubble.style.display = 'block'
          const rect = bubble.getBoundingClientRect()
          const pad = 8
          let left = point.x + 12
          let top = point.y + 16
          if (left + rect.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - rect.width - pad)
          if (top + rect.height > window.innerHeight - pad) top = Math.max(pad, point.y - rect.height - 10)
          bubble.style.left = left + 'px'
          bubble.style.top = top + 'px'
        }
        const onOver = (event) => {
          const target = event.target
          if (!target || !target.closest) return
          const root = target.closest('.hrag-root')
          if (!root) {
            restore()
            return
          }
          const el = target.closest('[title], [data-hrag-tip]')
          if (!el || !root.contains(el) || el === current) return
          restore()
          const text = el.getAttribute('title')
          if (text === null || text === '') return
          current = el
          savedTitle = text
          savedDescribedBy = el.getAttribute('aria-describedby')
          el.setAttribute('data-hrag-tip', text)
          el.removeAttribute('title')
          el.setAttribute('aria-describedby', bubble.id)
          point = { x: event.clientX, y: event.clientY }
          bubble.textContent = text
          bubble.style.display = 'none'
          showTimer = setTimeout(() => {
            showTimer = null
            if (current === el) place()
          }, 180)
          // 轮询/状态刷新会把 title 写回来——悬停期间持续移除，避免原生白泡抢先出现。
          titleObserver = new MutationObserver(() => {
            if (current === el && el.hasAttribute('title')) el.removeAttribute('title')
          })
          titleObserver.observe(el, { attributes: true, attributeFilter: ['title'] })
        }
        const onMove = (event) => {
          if (current) point = { x: event.clientX, y: event.clientY }
        }
        const onOut = (event) => {
          if (!current) return
          if (event.relatedTarget && current.contains(event.relatedTarget)) return
          restore()
        }
        const onEscape = (event) => {
          if (event.key === 'Escape') restore()
        }
        document.addEventListener('mouseover', onOver, true)
        document.addEventListener('mousemove', onMove, true)
        document.addEventListener('mouseout', onOut, true)
        window.addEventListener('scroll', restore, true)
        window.addEventListener('blur', restore)
        document.addEventListener('keydown', onEscape)
        return () => {
          document.removeEventListener('mouseover', onOver, true)
          document.removeEventListener('mousemove', onMove, true)
          document.removeEventListener('mouseout', onOut, true)
          window.removeEventListener('scroll', restore, true)
          window.removeEventListener('blur', restore)
          document.removeEventListener('keydown', onEscape)
          restore()
          bubble.remove()
        }
      }, [])
      return null
    }

    function KnowledgePanel({ t }) {
      const [phase, setPhase] = React.useState('loading')
      const [kbs, setKbs] = React.useState([])
      const [failure, setFailure] = React.useState(null)
      const [kbId, setKbId] = React.useState('')
      const [section, setSection] = React.useState('docs')
      const [refreshToken, setRefreshToken] = React.useState(0)
      const [drawer, setDrawer] = React.useState(null)
      // 百科抽屉壳（Task 9）：百科 tab 行点击与召回 wiki 命中共用；组件级渲染
      // 在面板根（同 ChunkDrawer 层位，z 帧 56/57 垫在续读抽屉下）。
      const [wikiDrawer, setWikiDrawer] = React.useState(null)
      const [uploading, setUploading] = React.useState(false)
      const toastAnchorRef = React.useRef(null)
      // T4 摄取通道：面板根 ref＋会话 id 采集（宿主后台任务归属；失败＝空串软着陆）。
      const panelRootRef = React.useRef(null)
      React.useEffect(() => {
        capturePanelSession(panelRootRef.current)
      }, [])
      const [pendingDuplicate, setPendingDuplicate] = React.useState(null)
      const [acceptedSuffixes, setAcceptedSuffixes] = React.useState(null)
      // 白名单兜底（Task 4）：三消费点（上传拦截/accept/probe）一律持派生值——未取两窗
      // （未加载 null／取失败空返）回退 15 常量；原「空⇒放行／不设／全拒」三处分歧作废。
      const supportedSuffixes = supportedSuffixesFor(acceptedSuffixes)
      // 拖拽反馈（小件批 Task 2）：根拖入态＋判词（指纹去重，dragover 高频只重渲
      // 变化）＋文档空态上报（放置层双态用；先按空库＝虚线框的安全默认）。
      const [dragActive, setDragActive] = React.useState(false)
      const [dragProbe, setDragProbe] = React.useState(null)
      const [docsEmpty, setDocsEmpty] = React.useState(true)
      // 失败通知（小件批 Task 3，照工作台 page 层 useDocFailureNotifier）：fold 状态机在壳
      // （数据快照出自 DocsView），收编族（上传请求失败／重试请求失败）直接 report 进卡；
      // notified/initialized 随 state 走——updater 保持纯，严格模式双调安全。
      const [docFailState, setDocFailState] = React.useState({ entries: [], notified: new Set(), initialized: false })
      const reportSeqRef = React.useRef(0)
      const snapshotDocFailures = (list) => {
        setDocFailState((prev) => foldDocFailures(prev, list, (doc) => t('doc.err.' + classifyDocError(doc.error))))
      }
      const reportDocFailure = (name, reason) => {
        reportSeqRef.current += 1
        const key = 'rejection-' + reportSeqRef.current
        setDocFailState((prev) => ({
          entries: prev.entries.concat([{ key, name, reason, retryable: false }]),
          notified: prev.notified,
          initialized: prev.initialized,
        }))
      }
      const dismissDocFailure = (key) => {
        setDocFailState((prev) => ({
          entries: prev.entries.filter((entry) => entry.key !== key),
          notified: prev.notified,
          initialized: prev.initialized,
        }))
      }
      const dismissAllDocFailures = () => {
        setDocFailState((prev) => ({ entries: [], notified: prev.notified, initialized: prev.initialized }))
      }
      const probeKeyRef = React.useRef('')
      // 菜单批 Task 1：库级 ⋯ 菜单状态——重命名弹层/删除确认/设置面/百科指令线。
      const [menuRenameOpen, setMenuRenameOpen] = React.useState(false)
      const [renameValue, setRenameValue] = React.useState('')
      const [kbDeleteOpen, setKbDeleteOpen] = React.useState(false)
      const [kbDeleteBusy, setKbDeleteBusy] = React.useState(false)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [shellRebuildOpen, setShellRebuildOpen] = React.useState(false)
      const [wikiCommand, setWikiCommand] = React.useState(null)
      const [wikiBusy, setWikiBusy] = React.useState(false)
      const currentKb = kbs.find((item) => String(item.id) === kbId) || null
      const [createKbOpen, setCreateKbOpen] = React.useState(false)
      const [createKbName, setCreateKbName] = React.useState('')
      const [createKbDesc, setCreateKbDesc] = React.useState('')
      const [createKbBusy, setCreateKbBusy] = React.useState(false)
      // 检索联动叠加（照工作台「在向量空间查看」）：召回触发 → 切投影分区并投影。
      const [overlayRequest, setOverlayRequest] = React.useState(null)
      // 复现预填（评测 → 召回，§7.2）：{query, nonce}——切分区并预填检索框。
      const [recallPrefill, setRecallPrefill] = React.useState(null)
      // 图谱联动叠加（Task 7「在图谱中查看」）：召回触发 → 切图谱分区并高亮路径。
      const [graphOverlayRequest, setGraphOverlayRequest] = React.useState(null)
      const fileInputRef = React.useRef(null)
      // 库排序拖拽：本地序 → 下拉库序；跨行挪槽即持久（照工作台 kb-order）。
      const [kbOrder, setKbOrder] = React.useState(() => readKbOrderIds())
      const kbOrderRef = React.useRef(kbOrder)
      kbOrderRef.current = kbOrder
      const kbsRef = React.useRef(kbs)
      kbsRef.current = kbs
      const orderedKbs = kbOrderApply(kbOrder, kbs)
      const commitKbMove = React.useCallback((sourceId, targetId) => {
        const current = kbOrderApply(kbOrderRef.current, kbsRef.current).map((kb) => String(kb.id))
        const next = kbOrderCommit(current, sourceId, targetId)
        if (next === current) return
        kbOrderRef.current = next
        writeKbOrderIds(next)
        setKbOrder(next)
      }, [])
      const kbDragLabel = useKbDragReorder(commitKbMove)

      const load = React.useCallback(() => {
        setPhase('loading')
        setFailure(null)
        callOp('listKbs')
          .then((rows) => {
            const list = Array.isArray(rows) ? rows : []
            setKbs(list)
            setKbId((current) => {
              const ids = list.map((kb) => String(kb.id))
              if (ids.indexOf(String(current)) >= 0) return String(current)
              const remembered = readLastKbId()
              if (remembered && ids.indexOf(remembered) >= 0) return remembered
              return String((list[0] && list[0].id) || '')
            })
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
        setOverlayRequest(null)
        setGraphOverlayRequest(null)
        setWikiDrawer(null)
      }, [kbId])

      // 上次打开库记忆（Task 5）：切换即记，载入优先恢复（失效回退首个）。
      React.useEffect(() => {
        if (kbId) writeLastKbId(kbId)
      }, [kbId])

      const handleUpload = (fileList) => {
        if (!kbId || uploading) return
        const files = Array.from(fileList || [])
        if (files.length === 0) return
        // 白名单前置拦截（Task 5，照工作台 partitionFilesBySuffix 语义）：accept 只是
        // 建议，用户可经「所有文件」绕过——被拒项先行提示、仅合规项入队。白名单未取
        // 时由 supportedSuffixes 兜底常量照拦（Task 4）。
        const accepted = []
        const rejectedNames = []
        const allowed = new Set(supportedSuffixes.map((suffix) => String(suffix).toLowerCase()))
        for (const file of files) {
          if (allowed.has(dupSuffix(file.name))) accepted.push(file)
          else rejectedNames.push(file.name)
        }
        if (rejectedNames.length > 0) {
          showToast(t('upload.rejected', { 0: rejectedNames.join(', ') }), { error: true })
        }
        if (accepted.length === 0) return
        setUploading(true)
        const results = []
        const seenNames = new Set()
        let knownDocs = null

        const finish = () => {
          const ok = results.filter((entry) => entry.ok).length
          setUploading(false)
          // 失败明细不再走 toast（小件批 Task 3）：逐条已由 doUpload catch 收编进失败卡
          // （照工作台——失败不进汇总提示；白名单预拒 toast 维持工作台同款不动）。
          if (ok > 0) {
            showToast(String(ok) + ' ' + t('upload.submittedUnit'))
          }
          setRefreshToken((value) => value + 1)
        }

        // 重复上传拦截（Task 8，照工作台 uploadFilesWithCheck）：逐文件先算哈希、对照
        // 当前库清单判同；命中则弹层等决定——替换＝先删后传（顺序冻结）、并存＝改名上传。
        // 清单取数失败或 WebCrypto 不可用（非安全上下文）都降级直传，不拦上传。
        const doUpload = (file) => {
          const entry = { ok: false, detail: '' }
          results.push(entry)
          return callUpload(kbId, file)
            .then(() => {
              entry.ok = true
            })
            .catch((error) => {
              entry.detail = errorDetail(error)
              // 上传请求失败（含服务端即拒 400）收编进失败卡（照工作台 doUpload catch）。
              reportDocFailure(file.name, entry.detail)
            })
        }

        const chooseDuplicateAction = (info) =>
          new Promise((resolve) => {
            setPendingDuplicate(
              Object.assign({}, info, {
                resolve: (chosen) => {
                  setPendingDuplicate(null)
                  resolve(chosen)
                },
              }),
            )
          })

        const processFile = (file) =>
          dupComputeSha256(file)
            .catch(() => null)
            .then((hash) => {
              if (hash === null || knownDocs === null) return doUpload(file)
              const verdict = dupVerdict(dupFindByName(file.name, knownDocs), hash)
              if (verdict.kind === 'clean') return doUpload(file)
              const copyName = dupNextCopyName(file.name, seenNames)
              return chooseDuplicateAction({
                fileName: file.name,
                kind: verdict.kind,
                doc: verdict.doc,
                copyName: copyName,
              }).then((action) => {
                if (action === 'cancel') return undefined
                if (action === 'skip') {
                  showToast(t('dup.skipped', { 0: file.name }))
                  return undefined
                }
                if (action === 'replace') {
                  return callOp('deleteDocument', { kb_id: kbId, doc_id: verdict.doc.id })
                    .then(() => {
                      // 先删后传：删成功才上传（后置级联不许冲掉新上传的派生状态）。
                      if (knownDocs) {
                        knownDocs = knownDocs.filter((doc) => doc.id !== verdict.doc.id)
                        seenNames.delete(String(verdict.doc.name))
                      }
                      return doUpload(file).then(() => {
                        showToast(t('dup.replaced', { 0: file.name }))
                      })
                    })
                    .catch((error) => {
                      results.push({ ok: false, detail: errorDetail(error) })
                    })
                }
                const copy = new File([file], copyName, { type: file.type })
                return doUpload(copy).then(() => {
                  seenNames.add(copyName)
                  if (knownDocs) knownDocs.push({ id: '', name: copyName, content_hash: null })
                  showToast(t('dup.uploadedAsCopy', { 0: copyName }))
                })
              })
            })

        callOp('listDocuments', { kb_id: kbId })
          .then((payload) => {
            if (Array.isArray(payload)) {
              knownDocs = payload.slice()
              for (const doc of knownDocs) seenNames.add(String(doc.name))
            }
          })
          .catch(() => {
            knownDocs = null
          })
          .then(() => {
            const runNext = (index) => {
              if (index >= accepted.length) return finish()
              processFile(accepted[index]).then(() => runNext(index + 1))
            }
            runNext(0)
          })
      }

      // 面板内拖拽上传（Task 7）：落在面板上的文件归当前知识库。宿主手势是
      // document 级冒泡监听，这里的 stopPropagation 让 drop 不进会话附件；
      // dragenter/dragleave 不拦，宿主全窗遮罩的计数与显隐零变化。
      const panelDragOver = (event) => {
        if (!isFileDrag(event.dataTransfer)) return
        event.preventDefault()
        event.stopPropagation()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        // 判词探针（小件批 Task 2）：dragover 每次鼠标移动都触发——指纹不变不重渲。
        setDragActive(true)
        const probe = probeDraggedItems(event.dataTransfer.items, supportedSuffixes)
        const verdict = probe.anyAccepted || probe.anyRejected ? probe : null
        const key = probeSignature(verdict)
        if (key !== probeKeyRef.current) {
          probeKeyRef.current = key
          setDragProbe(verdict)
        }
      }
      // 只有真正离开面板才复位——在子元素间穿梭时子元素会向根冒泡 dragleave，
      // 照单全收会与 dragover 逐帧震荡（遮罩与九宫格闪烁）。宿主计数不受影响
      // （不 stopPropagation，照 Task 7 注释）。
      const panelDragLeave = (event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return
        setDragActive(false)
        probeKeyRef.current = ''
        setDragProbe(null)
      }
      const panelDrop = (event) => {
        if (!isFileDrag(event.dataTransfer)) return
        event.preventDefault()
        event.stopPropagation()
        setDragActive(false)
        probeKeyRef.current = ''
        setDragProbe(null)
        // 吞掉 drop 后宿主自己的 reset 不会跑，补发 dragend 走它的既有清理口。
        try {
          window.dispatchEvent(new Event('dragend'))
        } catch (cause) {
          /* best effort */
        }
        if (!kbId) {
          showToast(t('upload.needKb'), { error: true })
          return
        }
        if (uploading) {
          showToast(t('upload.busy'), { error: true })
          return
        }
        const split = splitDroppedFiles(event.dataTransfer)
        if (split.dirs > 0 && split.files.length === 0) {
          showToast(t('upload.dirSkipped'), { error: true })
          return
        }
        if (split.files.length > 0) handleUpload(split.files)
      }

      const openRename = () => {
        const kb = kbs.find((item) => String(item.id) === kbId)
        setRenameValue(kb ? String(kb.name || '') : '')
        setMenuRenameOpen(true)
      }
      const confirmRename = () => {
        const name = renameValue.trim()
        if (!name || !kbId) return
        callOp('renameKb', { kb_id: kbId, name })
          .then(() => {
            setMenuRenameOpen(false)
            setKbs((list) => list.map((item) => (String(item.id) === kbId ? Object.assign({}, item, { name }) : item)))
            showToast(t('renameKb.done'))
          })
          .catch((error) => showToast(errorDetail(error), { error: true }))
      }
      const confirmDeleteKb = () => {
        if (!kbId) return
        setKbDeleteBusy(true)
        callOp('deleteKb', { kb_id: kbId })
          .then(() => {
            setKbDeleteBusy(false)
            setKbDeleteOpen(false)
            setKbId('')
            load()
            setRefreshToken((value) => value + 1)
          })
          .catch((error) => {
            setKbDeleteBusy(false)
            setKbDeleteOpen(false)
            showToast(errorDetail(error), { error: true })
          })
      }
      const confirmCreateKb = () => {
        const name = createKbName.trim()
        if (!name || createKbBusy) return
        setCreateKbBusy(true)
        callOp('createKb', { name, description: createKbDesc.trim() })
          .then((created) => {
            setCreateKbBusy(false)
            setCreateKbOpen(false)
            setCreateKbName('')
            setCreateKbDesc('')
            if (created && created.id) {
              setKbs((list) => list.concat([created]))
              setKbId(String(created.id))
            }
            showToast(t('createKb.created'))
          })
          .catch((error) => {
            setCreateKbBusy(false)
            setCreateKbOpen(false)
            showToast(errorDetail(error), { error: true })
          })
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
            { className: 'hrag-bar', ref: toastAnchorRef },
            h(DshMenu, {
              title: t('shell.kbLabel'),
              align: 'start',
              className: 'hrag-kbtrigger',
              trigger: h(
                React.Fragment,
                null,
                h(
                  'span',
                  { className: 'hrag-kbtrigger-name' },
                  currentKb ? String(currentKb.name || currentKb.id) : '',
                ),
                h('span', { className: 'hrag-kbtrigger-chev' }, dshChevronDownIcon()),
              ),
              items: [
                ...orderedKbs.map((kb) => {
                  const id = String(kb.id)
                  return { id, label: kbDragLabel(id, String(kb.name || kb.id)) }
                }),
                { type: 'separator', id: 'kb-menu-sep' },
                { id: 'create-kb', label: t('createKb.title'), icon: dshPlusIcon() },
              ],
              selectedId: kbId,
              onSelect: (id) => {
                if (id === 'create-kb') {
                  setCreateKbName('')
                  setCreateKbDesc('')
                  setCreateKbOpen(true)
                  return
                }
                setKbId(id)
              },
            }),
            h(DshMenu, {
              title: t('menu.more'),
              align: 'end',
              className: 'hrag-iconbare',
              trigger: dshEllipsisIcon(),
              items: [
                {
                  id: 'upload',
                  label: uploading ? t('menu.uploading') : t('menu.upload'),
                  icon: lucideUploadIcon(),
                  disabled: uploading,
                },
                { id: 'refresh', label: t('menu.refreshUi'), icon: dshRefreshIcon() },
                { type: 'separator', id: 'sep-1' },
                {
                  id: 'update-wiki',
                  label: wikiBusy ? t('wk.updating') : t('wk.updateWiki'),
                  icon: wikiBusy ? stateDot(16) || lucideBookOpenIcon() : lucideBookOpenIcon(),
                  disabled: wikiBusy,
                },
                { id: 'rebuild-wiki', label: t('wk.rebuildWiki'), icon: lucideRefreshCwIcon(), disabled: wikiBusy },
                { type: 'separator', id: 'sep-2' },
                { id: 'rename', label: t('menu.renameKb'), icon: dshEditIcon() },
                { id: 'delete', label: t('menu.deleteKb'), danger: true, icon: dshTrashIcon() },
                { type: 'separator', id: 'sep-3' },
                { id: 'settings', label: t('menu.modelSettings'), icon: dshSettingsIcon() },
              ],
              onSelect: (id) => {
                if (id === 'upload') {
                  const input = fileInputRef.current
                  if (input) input.click()
                  return
                }
                if (id === 'refresh') {
                  load()
                  setRefreshToken((value) => value + 1)
                  return
                }
                if (id === 'update-wiki') {
                  setWikiCommand({ mode: 'incremental', nonce: Date.now() })
                  setSection('wiki')
                  return
                }
                if (id === 'rebuild-wiki') {
                  setShellRebuildOpen(true)
                  return
                }
                if (id === 'rename') {
                  openRename()
                  return
                }
                if (id === 'delete') {
                  setKbDeleteOpen(true)
                  return
                }
                if (id === 'settings') setSettingsOpen(true)
              },
            }),
            h(ToasterHost, { anchorRef: toastAnchorRef }),
          ),
          h('input', {
            type: 'file',
            multiple: true,
            ref: fileInputRef,
            style: { display: 'none' },
            accept: supportedSuffixes.join(','),
            onChange: (event) => {
              handleUpload(event.target.files)
              event.target.value = ''
            },
          }),
          h(TabsStrip, { t, section, onSelect: (id) => setSection(id) }),
          // 文档视图 keep-alive（10-15 顺带同源修；照工作台六 tab forceMount）：切走不卸载。
          h(
            'div',
            { className: 'hrag-docs-slot', style: { display: section === 'docs' ? 'flex' : 'none' } },
            h(HragBoundary, { t, name: t('shell.tab.docs') }, h(DocsView, {
              t,
              kbId,
              kbOwnerId: currentKb ? currentKb.owner_id : null,
              refreshToken,
              onOpenChunks: (doc) => setDrawer({ doc, focus: null }),
              dragProbe,
              setDocsEmpty,
              docFailures: docFailState.entries,
              onDocFailuresSnapshot: snapshotDocFailures,
              onDocFailureReport: reportDocFailure,
              onDocFailureDismiss: dismissDocFailure,
              onDocFailureDismissAll: dismissAllDocFailures,
            })),
          ),
          // 召回视图 keep-alive（10-15 他报「切走回来结果消失」＝缺陷修正）：query/结果/选择集切走不丢。
          h(
            'div',
            { className: 'hrag-recall-slot', style: { display: section === 'recall' ? 'flex' : 'none' } },
            h(HragBoundary, { t, name: t('shell.tab.recall') }, h(RecallView, {
              t,
              kbId,
              prefill: recallPrefill,
              onOpenWikiEntry: (entryId) => setWikiDrawer({ kind: 'entry', id: entryId }),
              onOpenManualCard: (cardId) => setWikiDrawer({ kind: 'card', id: cardId }),
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
            })),
          ),
          // 百科视图 keep-alive（同口径）：搜索/折叠/选择切走不丢；抽屉壳在面板级
          //（召回命中同样开它），本槽只承载双卡列表。
          h(
            'div',
            { className: 'hrag-wk-slot', style: { display: section === 'wiki' ? 'flex' : 'none' } },
            h(HragBoundary, { t, name: t('shell.tab.wiki') }, h(WikiView, {
              t,
              kbId,
              enabled: section === 'wiki',
              command: wikiCommand,
              onBusyChange: setWikiBusy,
              onOpenEntry: (entryId) => setWikiDrawer({ kind: 'entry', id: entryId }),
              onOpenCard: (cardId) => setWikiDrawer({ kind: 'card', id: cardId }),
            })),
          ),
          // 投影视图 keep-alive（照工作台 forceMount 语义）：切走不丢配置与叠加；
          // enabled 门控首次取数——没打开过投影就不发请求。
          h(
            'div',
            { className: 'hrag-vec-slot', style: { display: section === 'vectors' ? 'flex' : 'none' } },
            h(HragBoundary, { t, name: t('shell.tab.vectors') }, h(VectorView, {
              t,
              kbId,
              enabled: section === 'vectors',
              overlayRequest,
              onOpenChunk: (docId, chunkId, docName) => {
                setDrawer({ doc: { id: docId, name: docName || docId }, focus: chunkId })
              },
            })),
          ),
          // 图谱视图 keep-alive（同投影口径）：切走不丢视口与叠加。
          h(
            'div',
            { className: 'hrag-graph-slot', style: { display: section === 'graph' ? 'flex' : 'none' } },
            h(HragBoundary, { t, name: t('shell.tab.graph') }, h(GraphView, {
              t,
              kbId,
              enabled: section === 'graph',
              overlayRequest: graphOverlayRequest,
              onOpenChunk: (docId, chunkId, docName) => {
                setDrawer({ doc: { id: docId, name: docName || docId }, focus: chunkId })
              },
            })),
          ),
          // 评测视图 keep-alive（同口径）；「复现」通道：题库/详情 ↗ → 召回预填。
          h(
            'div',
            { className: 'hrag-ev-slot', style: { display: section === 'eval' ? 'flex' : 'none' } },
            h(HragBoundary, { t, name: t('shell.tab.eval') }, h(EvalView, {
              t,
              kbId,
              enabled: section === 'eval',
              onReproduce: (query) => {
                setRecallPrefill({ query, nonce: Date.now() })
                setSection('recall')
              },
            })),
          ),
        )
      }

      // 拖拽反馈只在可落时亮（有库且面板就绪；无库落下＝先建库 toast，不亮）。
      const dragFeedbackOn = dragActive && phase === 'ready' && Boolean(kbId)

      return h(
        React.Fragment,
        null,
        h(Styles),
        h(NativeTipLayer),
        h(
          'div',
          {
            className: 'hrag-root' + (dragFeedbackOn ? ' hrag-root-drag' : ''),
            ref: panelRootRef,
            onDragOver: panelDragOver,
            onDragLeave: panelDragLeave,
            onDrop: panelDrop,
          },
          h(HragBoundary, { t, name: t('tab.title') }, content),
          // 放置层（小件批 Task 2，照工作台双态）：空库＝虚线框＋底缘胶囊（全拒换
          // 「该格式暂不支持」），让九宫格判词透出；非空库＝70% 实底＋居中胶囊。
          dragFeedbackOn
            ? docsEmpty
              ? h(
                  'div',
                  { className: 'hrag-dropframe', 'data-testid': 'document-drop-overlay' },
                  h(
                    'p',
                    { className: 'hrag-dropframe-hint' },
                    h(
                      'span',
                      { className: 'hrag-droppill' },
                      lucideUploadIcon(),
                      dragProbe && dragProbe.anyRejected && !dragProbe.anyAccepted ? t('doc.dropUnsupported') : t('doc.dropToUpload'),
                    ),
                  ),
                )
              : h(
                  'div',
                  { className: 'hrag-dropdim', 'data-testid': 'document-drop-overlay' },
                  h('p', { className: 'hrag-dropdim-hint' }, lucideUploadIcon(), t('doc.dropToUpload')),
                )
            : null,
          drawer
            ? h(
                HragBoundary,
                { t, name: t('chunk.drawerTitle') },
                h(ChunkDrawer, {
                t,
                kbId,
                doc: drawer.doc,
                focusChunkId: drawer.focus,
                refreshToken,
                onClose: () => setDrawer(null),
              }),
              )
            : null,
          wikiDrawer
            ? wikiDrawer.kind === 'entry'
              ? h(
                  HragBoundary,
                  { t, name: t('wk.entries') },
                  h(WikiEntryDrawer, {
                  t,
                  kbId,
                  entryId: wikiDrawer.id,
                  onClose: () => setWikiDrawer(null),
                  // 导航（小件批 Task 8·E1①）：切百科 tab＋关抽屉（列表未分页，
                  // 切过去即可见；照工作台 revealWikiEntry）。
                  onRevealInTab: () => {
                    setSection('wiki')
                    setWikiDrawer(null)
                  },
                  onOpenChunk: (chunkId, docName) => {
                    const docId = String(chunkId).split('#')[0]
                    setDrawer({ doc: { id: docId, name: docName || docId }, focus: chunkId })
                  },
                }),
                )
              : h(
                  HragBoundary,
                  { t, name: t('wk.cards') },
                  h(ManualCardDrawer, {
                  t,
                  kbId,
                  cardId: wikiDrawer.id,
                  onClose: () => setWikiDrawer(null),
                }),
                )
            : null,
          menuRenameOpen
            ? h(
                'div',
                {
                  className: 'hrag-overlay',
                  onMouseDown: (event) => {
                    if (event.target === event.currentTarget) setMenuRenameOpen(false)
                  },
                },
                h(
                  'div',
                  {
                    className: 'hrag-dialog',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': t('renameKb.title'),
                    onKeyDown: (event) => {
                      if (event.key === 'Escape') setMenuRenameOpen(false)
                    },
                  },
                  h('div', { className: 'hrag-dialog-title' }, t('renameKb.title')),
                  h('input', {
                    className: 'hrag-input',
                    value: renameValue,
                    autoFocus: true,
                    'aria-label': t('renameKb.nameLabel'),
                    onChange: (event) => setRenameValue(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter') confirmRename()
                    },
                  }),
                  h(
                    'div',
                    { className: 'hrag-dialog-actions' },
                    h(
                      'button',
                      { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => setMenuRenameOpen(false) },
                      t('doc.cancel'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-btn hrag-btn-outline',
                        disabled: !renameValue.trim(),
                        onClick: confirmRename,
                      },
                      t('renameKb.save'),
                    ),
                  ),
                ),
              )
            : null,
          createKbOpen
            ? h(
                'div',
                {
                  className: 'hrag-overlay',
                  onMouseDown: (event) => {
                    if (event.target === event.currentTarget && !createKbBusy) setCreateKbOpen(false)
                  },
                },
                h(
                  'div',
                  {
                    className: 'hrag-dialog',
                    role: 'dialog',
                    'aria-modal': 'true',
                    'aria-label': t('createKb.title'),
                    onKeyDown: (event) => {
                      if (event.key === 'Escape' && !createKbBusy) setCreateKbOpen(false)
                    },
                  },
                  h('div', { className: 'hrag-dialog-title' }, t('createKb.title')),
                  h('input', {
                    className: 'hrag-input',
                    value: createKbName,
                    autoFocus: true,
                    placeholder: t('createKb.namePlaceholder'),
                    'aria-label': t('createKb.namePlaceholder'),
                    onChange: (event) => setCreateKbName(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter') confirmCreateKb()
                    },
                  }),
                  h('textarea', {
                    className: 'hrag-input hrag-ev-textarea',
                    value: createKbDesc,
                    rows: 3,
                    placeholder: t('createKb.descPlaceholder'),
                    'aria-label': t('createKb.descPlaceholder'),
                    onChange: (event) => setCreateKbDesc(event.target.value),
                  }),
                  h(
                    'div',
                    { className: 'hrag-dialog-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-btn hrag-btn-outline',
                        disabled: createKbBusy,
                        onClick: () => setCreateKbOpen(false),
                      },
                      t('doc.cancel'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'hrag-btn hrag-btn-outline',
                        disabled: !createKbName.trim() || createKbBusy,
                        onClick: confirmCreateKb,
                      },
                      t('createKb.create'),
                    ),
                  ),
                ),
              )
            : null,
          h(DuplicateUploadDialog, {
            t: t,
            pending: pendingDuplicate,
            onResolve: (action) => {
              if (pendingDuplicate) pendingDuplicate.resolve(action)
            },
          }),
          kbDeleteOpen
            ? h(ConfirmDialog, {
                t,
                title: t('deleteKb.title'),
                description: t('deleteKb.desc'),
                busy: kbDeleteBusy,
                cancelKey: 'doc.cancel',
                confirmKey: 'doc.confirmDelete',
                onCancel: () => setKbDeleteOpen(false),
                onConfirm: confirmDeleteKb,
              })
            : null,
          shellRebuildOpen
            ? h(ConfirmDialog, {
                t,
                title: t('wk.rebuildTitle'),
                description: t('wk.rebuildDesc'),
                busy: false,
                danger: false,
                cancelKey: 'doc.cancel',
                confirmKey: 'wk.rebuildConfirm',
                onCancel: () => setShellRebuildOpen(false),
                onConfirm: () => {
                  setShellRebuildOpen(false)
                  setWikiCommand({ mode: 'full', nonce: Date.now() })
                  setSection('wiki')
                },
              })
            : null,
          settingsOpen
            ? h(
                HragBoundary,
                { t, name: t('menu.modelSettings') },
                h(ModelSettingsPanel, {
                  t,
                  kbId,
                  onClose: () => setSettingsOpen(false),
                  kbs,
                }),
              )
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
