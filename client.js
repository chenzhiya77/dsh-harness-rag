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
      'sort.asc': '升序',
      'sort.desc': '降序',
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
      'wk.cards': '我的条目',
      'wk.cardsEmpty': '新建卡片，记录属于你的知识',
      'wk.cardsNoMatch': '没有匹配的卡片',
      'wk.includeInSearch': '混入搜索',
      'wk.cardType': '我的卡片',
      'wk.openCard': '打开详情',
      'wk.cardNotFound': '卡片不存在或已删除',
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
      'set.readonlyHint': '当前为只读展示；编辑与探测将在后续批次开放。',
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
      'sort.asc': 'Ascending',
      'sort.desc': 'Descending',
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
      'wk.cards': 'My Entries',
      'wk.cardsEmpty': 'Create a card to capture your own knowledge',
      'wk.cardsNoMatch': 'No matching cards',
      'wk.includeInSearch': 'Mixed into search',
      'wk.cardType': 'My Card',
      'wk.openCard': 'Open details',
      'wk.cardNotFound': 'Card missing or deleted',
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
      'set.readonlyHint': 'Read-only view; editing and probes arrive in later batches.',
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
          '.hrag-kbtrigger-chev { display: inline-flex; flex-shrink: 0; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-iconbare { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }',
          '.hrag-iconbare:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }',
          '.hrag-mm-check { margin-left: auto; display: inline-flex; flex-shrink: 0; color: var(--dsw-alias-label-secondary); }',
          '.hrag-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; padding: 0 12px; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font-size: 14px; font-family: inherit; cursor: pointer; white-space: nowrap; }',
          '.hrag-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-btn:active:not(:disabled) { background: var(--dsw-alias-interactive-bg-active); }',
          '.hrag-btn:disabled { cursor: not-allowed; opacity: 0.4; }',
          '.hrag-btn:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); }',
          '.hrag-btn-outline { border: 0.5px solid var(--dsw-alias-border-l3); }',
          '.hrag-tabs { position: relative; display: flex; flex-wrap: wrap; gap: 0 36px; border-bottom: 0.5px solid var(--dsw-alias-border-l3); }',
          '.hrag-tab { position: relative; padding: 0 0 9px; border: none; background: transparent; color: var(--dsw-alias-label-tertiary); font-size: 13px; font-weight: 500; line-height: 16px; font-family: inherit; cursor: pointer; }',
          '.hrag-tab::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 2px; background: transparent; }',
          ".hrag-tab[aria-selected='true'] { color: var(--dsw-alias-state-business-primary); }",
          ".hrag-tab[aria-selected='true']::after { background: var(--dsw-alias-state-business-primary); }",
          '.hrag-tab:focus-visible { outline: none; box-shadow: 0 0 0 var(--dsw-focus-ring-width) var(--dsw-focus-ring-color); border-radius: 4px; }',
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
          '.hrag-wk-drawer .hrag-drawer-overlay { z-index: 56; }',
          '.hrag-wk-drawer .hrag-drawer { z-index: 57; }',
          '.hrag-wk-drawer-body { display: flex; flex-direction: column; gap: 10px; }',
          '.hrag-wk-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-wk-canvas { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-wk-sect { display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); }',
          '.hrag-wk-sect-open { flex: 1 1 0; min-height: 0; }',
          '.hrag-wk-secthead { display: flex; align-items: center; gap: 4px; padding: 2px 8px 2px 2px; flex-shrink: 0; }',
          '.hrag-wk-secthead:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-secttoggle { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; padding: 6px; border: none; background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; font-family: inherit; cursor: pointer; text-align: left; }',
          '.hrag-wk-secticon { display: inline-flex; color: var(--dsw-alias-label-secondary); flex-shrink: 0; }',
          '.hrag-wk-secttitle { font-weight: 500; }',
          '.hrag-wk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; flex: 1; padding: 16px; color: var(--dsw-alias-label-tertiary); font-size: 12px; text-align: center; }',
          '.hrag-wk-empty p { margin: 0; }',
          '.hrag-wk-empty-icon { display: inline-flex; opacity: 0.4; }',
          '.hrag-wk-inset { margin: 6px; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }',
          '.hrag-wk-list { display: flex; flex-direction: column; gap: 1px; overflow-y: auto; min-height: 0; flex: 1; padding: 4px 6px 6px; }',
          '.hrag-wk-row { display: flex; align-items: center; gap: 6px; padding: 0 6px; height: 36px; border-radius: var(--dsw-radius-sm); min-width: 0; }',
          '.hrag-wk-row:hover { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-row-on { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-wk-row .hrag-ev-check { opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-wk-row:hover .hrag-ev-check { opacity: 1; }',
          '.hrag-wk-row .hrag-ev-check:checked { opacity: 1; }',
          '.hrag-wk-list-selecting .hrag-ev-check { opacity: 1; }',
          '.hrag-wk-row-main { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; height: 100%; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-wk-rowicon { display: inline-flex; color: var(--dsw-alias-label-tertiary); flex-shrink: 0; }',
          '.hrag-wk-rowtitle { max-width: 45%; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }',
          '.hrag-wk-rowsummary { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-wk-dirty { flex-shrink: 0; }',
          '.hrag-wk-dirtydot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }',
          '.hrag-wk-rowtime { flex-shrink: 0; font-size: 12px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-wk-cardrow { width: 100%; border: none; background: transparent; color: var(--dsw-alias-label-primary); font-family: inherit; font-size: 13px; text-align: left; cursor: pointer; }',
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
          '.hrag-crash-title { margin: 0; color: var(--dsw-alias-label-error); font-size: 13px; font-weight: 600; }',
          '.hrag-crash-hint { margin: 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.6; }',
          '.hrag-crash-pre { margin: 0; max-height: 220px; overflow: auto; padding: 8px; border-radius: 6px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-family: ui-monospace, monospace; font-size: 11px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }',
          '.hrag-mm-wrap { position: relative; display: inline-flex; }',
          '.hrag-bar > .hrag-mm-wrap + .hrag-mm-wrap { margin-left: auto; }',
          '.hrag-mm-backdrop { position: fixed; inset: 0; z-index: 40; }',
          '.hrag-mm { position: fixed; z-index: 41; min-width: 144px; padding: 4px; border: none; border-radius: var(--dsw-radius-lg); background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-1)); backdrop-filter: var(--dsw-menu-backdrop-filter); -webkit-backdrop-filter: var(--dsw-menu-backdrop-filter); box-shadow: var(--dsw-elevation-prominent); }',
          '.hrag-mm-item { display: flex; align-items: center; gap: 6px; width: 100%; min-height: 34px; padding: 6px 8px; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; font-family: inherit; text-align: left; cursor: pointer; }',
          '.hrag-mm-item:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-mm-item:disabled { opacity: 0.5; cursor: not-allowed; }',
          '.hrag-mm-item-danger { color: var(--dsw-alias-state-error-primary); }',
          '.hrag-mm-item-danger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger); }',
          '.hrag-mm-sep { height: 0.5px; background: var(--dsw-alias-border-l2); margin: 3px 2px; }',
          '.hrag-mm-icon { display: inline-flex; flex-shrink: 0; color: inherit; }',
          '.hrag-set-body { display: flex; flex-direction: column; gap: 10px; }',
          '.hrag-set-hint { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; }',
          '.hrag-set-migration { padding: 6px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); color: var(--dsw-alias-label-secondary); font-size: 12px; }',
          '.hrag-set-migration-failed { color: var(--dsw-alias-label-error); border-color: color-mix(in srgb, var(--dsw-alias-label-error) 40%, transparent); }',
          '.hrag-set-card { border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); overflow: hidden; }',
          '.hrag-set-cardhead { padding: 6px 10px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); font-size: 12px; }',
          '.hrag-set-cardbody { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; padding: 8px 10px; }',
          '.hrag-set-group { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); }',
          '.hrag-set-grouptitle { margin-bottom: 4px; padding-bottom: 4px; border-bottom: 0.5px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); font-size: 12px; font-weight: 600; }',
          '.hrag-set-row { display: grid; grid-template-columns: 128px minmax(0, 1fr); gap: 8px; font-size: 12px; line-height: 20px; }',
          '.hrag-set-label { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-set-value { color: var(--dsw-alias-label-primary); word-break: break-word; }',
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
          '.hrag-textchip { display: inline-flex; align-items: center; flex-shrink: 0; max-width: 240px; padding: 1px 7px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
          '.hrag-hitrow-row .hrag-hitselect { opacity: 0; transition: opacity 120ms ease; }',
          '.hrag-hitrow-row:hover .hrag-hitselect { opacity: 1; }',
          '.hrag-hitselect:focus-visible { opacity: 1; }',
          '.hrag-hitselect-on { opacity: 1; }',
          '.hrag-recall-rows-selecting .hrag-hitselect { opacity: 1; }',
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
          // ── 评测域（Task 8）──────────────────────────────────────────────
          '.hrag-btn-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }',
          '.hrag-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }',
          '.hrag-ev-slot { flex-direction: column; min-height: 0; flex: 1; }',
          '.hrag-ev { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; }',
          '.hrag-ev-bar { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; min-width: 0; }',
          '.hrag-ev-searchwrap { position: relative; flex: 1; min-width: 90px; display: flex; }',
          '.hrag-ev-search { width: 100%; height: 26px; font-size: 12px; padding-left: 8px; padding-right: 22px; }',
          '.hrag-ev-searchclear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); border: none; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; font-size: 11px; padding: 2px; }',
          '.hrag-ev-runbtns { margin-left: auto; display: inline-flex; align-items: stretch; flex-shrink: 0; }',
          '.hrag-ev-graybtn { background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-graybtn:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-module-platform)); }',
          '.hrag-ev-run { height: 26px; font-size: 12px; padding: 0 10px; border-radius: var(--dsw-radius-sm) 0 0 var(--dsw-radius-sm); white-space: nowrap; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-run:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-module-platform)); }',
          '.hrag-ev-chev { height: 26px; padding: 0 6px; font-size: 11px; border-radius: 0 var(--dsw-radius-sm) var(--dsw-radius-sm) 0; border: none; border-left: 0.5px solid color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); white-space: nowrap; background: var(--dsw-alias-bg-module-platform); color: var(--dsw-alias-label-primary); }',
          '.hrag-ev-chev:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, var(--dsw-alias-bg-module-platform)); }',
          '.hrag-ev-chev-armed { color: var(--dsw-alias-label-error); }',
          '.hrag-ev-spinner { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid currentColor; border-top-color: transparent; display: inline-block; animation: hrag-rotate 800ms linear infinite; }',
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
          '.hrag-ev-slottext-failed { color: var(--dsw-alias-label-error); }',
          '.hrag-ev-banner-side { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }',
          '.hrag-ev-progrow { display: flex; align-items: center; gap: 10px; }',
          '.hrag-ev-track { position: relative; flex: 1; min-width: 0; height: 6px; border-radius: 999px; background: var(--dsw-alias-bg-module-platform); overflow: hidden; }',
          '.hrag-ev-track-span { position: absolute; top: 0; bottom: 0; background: color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent); }',
          '.hrag-ev-track-fill { position: absolute; top: 0; bottom: 0; left: 0; background: var(--dsw-alias-label-primary); opacity: 0.75; }',
          '.hrag-ev-track-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--dsw-alias-bg-layer-1); opacity: 0.8; }',
          '.hrag-ev-eta { font-size: 11px; color: var(--dsw-alias-label-tertiary); flex-shrink: 0; }',
          '.hrag-ev-logrow { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--dsw-alias-label-tertiary); min-width: 0; }',
          '.hrag-ev-logtext { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; animation: hrag-fade-in 200ms ease; }',
          '.hrag-ev-failedchip { flex-shrink: 0; background: color-mix(in srgb, var(--dsw-alias-label-error) 12%, transparent); color: var(--dsw-alias-label-error); border-radius: 4px; padding: 0 5px; font-size: 10px; }',
          '.hrag-ev-muted { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-tabnums { font-variant-numeric: tabular-nums; }',
          '.hrag-ev-hint { border: 1px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); padding: 14px 10px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-hint-error { color: var(--dsw-alias-label-error); }',
          '.hrag-ev-badge { display: inline-flex; align-items: center; gap: 4px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; padding: 0 6px; font-size: 10px; line-height: 16px; color: var(--dsw-alias-label-secondary); white-space: nowrap; }',
          '.hrag-ev-badge-danger { border-color: color-mix(in srgb, var(--dsw-alias-label-error) 40%, transparent); color: var(--dsw-alias-label-error); }',
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
          '.hrag-ev-th-withnote { display: inline-flex; align-items: center; gap: 4px; }',
          '.hrag-ev-th-check { width: 26px; }',
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
          '.hrag-ev-status-error { color: var(--dsw-alias-label-error); }',
          '.hrag-ev-status-skipped, .hrag-ev-status-cancelled { color: var(--dsw-alias-label-tertiary); }',
          '.hrag-ev-recall { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; }',
          '.hrag-ev-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }',
          '.hrag-ev-dot-ok { background: #10b981; }',
          '.hrag-ev-dot-part { background: #84cc16; }',
          '.hrag-ev-dot-miss { background: #ef4444; }',
          '.hrag-ev-refchunks { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; }',
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
          '.hrag-ev-menu-item:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
          '.hrag-ev-menu-item:disabled { opacity: 0.5; cursor: not-allowed; }',
          '.hrag-ev-menu-item-danger { color: var(--dsw-alias-label-error); }',
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
          '.hrag-ev-chartwrap { position: relative; min-width: 0; }',
          '.hrag-ev-chart { display: block; width: 100%; height: 240px; }',
          '.hrag-ev-chart-hover { cursor: pointer; }',
          '.hrag-ev-tip { position: absolute; z-index: 5; max-width: 228px; padding: 6px 8px; border-radius: 8px; background: var(--dsw-alias-bg-layer-1); border: 0.5px solid var(--dsw-alias-border-l3); box-shadow: var(--dsw-elevation-panel); font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); pointer-events: none; }',
          '.hrag-ev-tip-head { font-weight: 600; color: var(--dsw-alias-label-primary); margin-bottom: 2px; }',
          '.hrag-ev-tip-row { display: flex; align-items: center; gap: 4px; }',
          '.hrag-ev-tip-delta { opacity: 0.6; }',
          '.hrag-ev-tip-regression { margin-top: 2px; color: var(--dsw-alias-label-error); }',
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
          '.hrag-ev-bulkbar { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); flex-shrink: 0; }',
          '.hrag-ev-review { display: flex; flex-direction: column; flex-shrink: 0; }',
          '.hrag-ev-review-open { min-height: 0; flex: 1; max-height: 45%; }',
          '.hrag-ev-review-static { font-weight: 600; color: inherit; }',
          '.hrag-ev-reviewlist { min-height: 0; flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }',
          '.hrag-ev-spin-text { display: inline-flex; align-items: center; gap: 4px; }',
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
          '.hrag-ev-anchor { display: flex; flex-direction: column; gap: 6px; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-label-error) 40%, transparent); background: color-mix(in srgb, var(--dsw-alias-label-error) 8%, transparent); color: var(--dsw-alias-label-error); border-radius: 8px; padding: 8px 10px; font-size: 12px; }',
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
          '.hrag-ev-danglingrow { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--dsw-alias-label-error); }',
          '.hrag-ev-caret { display: inline-block; font-size: 10px; color: var(--dsw-alias-label-tertiary); transition: transform 120ms ease; flex-shrink: 0; }',
          '.hrag-ev-caret-open { transform: rotate(180deg); }',
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
          '.hrag-ev-danger-text { color: var(--dsw-alias-label-error); }',
          '.hrag-ev-pre { margin: 0; font-size: 12px; white-space: pre-wrap; word-break: break-word; }',
          // 召回补面（存为考题）：行勾选与底栏。
          '.hrag-hitrow-row { display: flex; align-items: stretch; gap: 4px; min-width: 0; }',
          '.hrag-hitrow-row .hrag-hitrow { flex: 1; min-width: 0; }',
          '.hrag-hitselect { flex-shrink: 0; width: 22px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 11px; cursor: pointer; align-self: center; height: 22px; padding: 0; }',
          '.hrag-hitselect-on { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); border-color: transparent; }',
          '.hrag-recall-savebar { display: flex; align-items: center; gap: 10px; padding: 6px 4px 2px; flex-shrink: 0; }',
          '.hrag-recall-savecount { margin-left: auto; font-size: 12px; color: var(--dsw-alias-label-secondary); }',
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

    /** 视窗过滤：ts ≥ 末点 − span 的点（插件版＝时间窗直滤；工作台为索引窗，
        用户可见行为等价——切换窗口不重新取数）。 */
    function evSpanPoints(points, preset) {
      if (!points || points.length === 0) return []
      const span = EVAL_SPAN_MS[preset] || EVAL_SPAN_MS.month
      const last = Date.parse(points[points.length - 1].ts)
      if (!Number.isFinite(last)) return points
      const cutoff = last - span
      return points.filter((point) => {
        const ts = Date.parse(point.ts)
        return Number.isFinite(ts) && ts >= cutoff
      })
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
                  timecode ? h('span', { className: 'hrag-textchip', title: t('chunk.timecode') }, timecode) : null,
                  chunk.page != null
                    ? h('span', { className: 'hrag-textchip' }, t('chunk.page') + ' ' + String(chunk.page))
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

    function RecallView({ t, kbId, onOpenChunk, onViewInVectorSpace, onViewInGraphSpace, prefill, onOpenWikiEntry, onOpenManualCard }) {
      const [query, setQuery] = React.useState('')
      const [topK, setTopK] = React.useState(5)
      const [pending, setPending] = React.useState(false)
      const [result, setResult] = React.useState(null)
      const [failure, setFailure] = React.useState(null)
      // 「存为考题」（Task 8 补面，照工作台 §7.1）：命中行勾选 → 底部动作条。
      const [selectedChunks, setSelectedChunks] = React.useState(() => new Map())
      const [saveOpen, setSaveOpen] = React.useState(false)
      const [savedNotice, setSavedNotice] = React.useState(null)

      React.useEffect(() => {
        setResult(null)
        setFailure(null)
        setSelectedChunks(new Map())
        setSaveOpen(false)
        setSavedNotice(null)
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
        const toggleSelected = (chunkId, path) => {
          setSelectedChunks((current) => {
            const next = new Map(current)
            if (next.has(chunkId)) next.delete(chunkId)
            else next.set(chunkId, { id: chunkId, path })
            return next
          })
        }
        const hitRow = (key, entry, onOpen, select) =>
          h(
            'div',
            { className: 'hrag-hitrow-row', key },
            select
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-hitselect' + (selectedChunks.has(select.chunkId) ? ' hrag-hitselect-on' : ''),
                    'aria-label': t('recall.saveAs.selectLabel', { 0: entry.docName }),
                    'aria-pressed': selectedChunks.has(select.chunkId),
                    title: t('recall.saveAs.selectLabel', { 0: entry.docName }),
                    onClick: () => toggleSelected(select.chunkId, select.path),
                  },
                  selectedChunks.has(select.chunkId) ? '✓' : '',
                )
              : null,
            h(
              'button',
              {
                type: 'button',
                className: onOpen ? 'hrag-hitrow' : 'hrag-hitrow hrag-hitrow-static',
                onClick: onOpen || undefined,
              },
              entry.rank != null ? h('span', { className: 'hrag-hitrank' }, '#' + String(entry.rank)) : null,
              h('span', { className: 'hrag-hitdoc', title: entry.docName }, String(entry.docName || '')),
              entry.badge ? h('span', { className: 'hrag-hitbadge' }, entry.badge) : null,
              h('span', { className: 'hrag-hitlead' }, entry.lead),
              entry.page != null ? h('span', { className: 'hrag-hitpage' }, 'p.' + String(entry.page)) : null,
              h('span', { className: 'hrag-hitscore' }, formatScore(entry.score)),
            ),
          )
        const rowsFor = (path) => {
          if (path === 'vector') {
            return (result.paths.vector.hits || []).map((hit) =>
              hitRow(
                hit.chunk_id,
                { rank: hit.rank, docName: hit.doc_name, lead: firstLine(hit.text), page: hit.page, score: hit.score },
                onOpenChunk ? () => onOpenChunk(hit.chunk_id, hit.doc_name) : null,
                { chunkId: hit.chunk_id, path: 'vector' },
              ),
            )
          }
          if (path === 'graph') {
            return (result.paths.graph.evidence || []).map((hit, index) =>
              hitRow(
                hit.chunk_id,
                { rank: index + 1, docName: hit.doc_name, lead: firstLine(hit.text), page: hit.page, score: hit.score },
                onOpenChunk ? () => onOpenChunk(hit.chunk_id, hit.doc_name) : null,
                { chunkId: hit.chunk_id, path: 'graph' },
              ),
            )
          }
          return (result.paths.wiki.hits || []).map((hit) => {
            const manual = hit.source_type === 'manual'
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
              },
              open,
            )
          })
        }
        const section = (path) =>
          h(
            'div',
            { className: 'hrag-recall-section', key: path },
            h(
              'div',
              { className: 'hrag-recall-head' },
              h('span', { className: 'hrag-recall-name' }, t('recall.path.' + path)),
              h('span', { className: 'hrag-textchip', title: String((result.score_type && result.score_type[path]) || '') }, String((result.score_type && result.score_type[path]) || '')),
              h(
                'span',
                { className: 'hrag-recall-meta' },
                h('span', { className: 'hrag-textchip' }, String((result.elapsed_ms && result.elapsed_ms[path]) || 0) + ' ms'),
                h('span', { className: 'hrag-textchip' }, String(counts[path])),
              ),
            ),
            h(
              'div',
              {
                className:
                  'hrag-recall-rows' + (selectedChunks.size > 0 ? ' hrag-recall-rows-selecting' : ''),
              },
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

      const selectedList = [...selectedChunks.values()]
      const selectionPaths = []
      for (const item of selectedList) {
        if (selectionPaths.indexOf(item.path) < 0) selectionPaths.push(item.path)
      }

      return h(
        React.Fragment,
        null,
        bar,
        failure ? h('div', { className: 'hrag-notice hrag-notice-error' }, t('recall.failed') + '：' + errorDetail(failure)) : null,
        savedNotice ? h('div', { className: 'hrag-notice' }, savedNotice) : null,
        body,
        // 「存为考题」动作条（照工作台 §7.1 底栏）：勾选才出现；计数＋主钮。
        selectedList.length > 0
          ? h(
              'div',
              { className: 'hrag-recall-savebar' },
              h(
                'span',
                { className: 'hrag-recall-savecount hrag-ev-tabnums' },
                t('recall.saveAs.selectedCount', { 0: selectedList.length }),
              ),
              h(
                'button',
                { type: 'button', className: 'hrag-btn hrag-btn-primary', onClick: () => setSaveOpen(true) },
                t('recall.saveAs.button'),
              ),
            )
          : null,
        h(EvalSaveAsQuestionDialog, {
          t,
          kbId,
          open: saveOpen,
          onClose: () => setSaveOpen(false),
          prefillQuery: result ? result.query : query,
          defaultPaths: selectionPaths,
          selectedChunkIds: selectedList.map((item) => item.id),
          selectionCount: selectedList.length,
          onSaved: () => {
            setSelectedChunks(new Map())
            setSavedNotice(t('recall.saveAs.savedToast'))
            window.setTimeout(() => setSavedNotice(null), NOTICE_DISMISS_MS)
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

    /** 弹层菜单项（选中态尾置 ✓；danger 红字）。 */
    function EvalMenuItem({ danger, disabled, selected, onSelect, children }) {
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
    function dshEllipsisIcon() {
      return dshMenuIcon([
        { d: 'M3 9C3.55228 9 4 8.55228 4 8C4 7.44772 3.55228 7 3 7C2.44772 7 2 7.44772 2 8C2 8.55228 2.44772 9 3 9Z', fill: true },
        { d: 'M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z', fill: true },
        { d: 'M13 9C13.5523 9 14 8.55228 14 8C14 7.44772 13.5523 7 13 7C12.4477 7 12 7.44772 12 8C12 8.55228 12.4477 9 13 9Z', fill: true },
      ])
    }
    function dshRefreshIcon() {
      return dshMenuIcon([
        { d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1' },
        { d: 'M14.4999 1.5V5.1H10.8999' },
      ])
    }
    function dshEditIcon() {
      return dshMenuIcon([
        { d: 'M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z', fill: true },
        { d: 'M7.7849 8.23878L13.888 2.13574' },
      ])
    }
    function dshTrashIcon() {
      return dshMenuIcon([
        { d: 'M1.28149 3.88831H14.7187' },
        { d: 'M5.41602 3.88833V2.47962C5.41602 2.29282 5.52492 2.11366 5.71876 1.98157C5.9126 1.84948 6.17551 1.77527 6.44964 1.77527H9.55053C9.82466 1.77527 10.0876 1.84948 10.2814 1.98157C10.4753 2.11366 10.5842 2.29282 10.5842 2.47962V3.88833' },
        { d: 'M2.57349 3.88831L3.19366 13.2943C3.21937 13.5502 3.33952 13.7872 3.53065 13.9593C3.72178 14.1313 3.97016 14.2259 4.22729 14.2246H11.7728C12.0299 14.2259 12.2783 14.1313 12.4694 13.9593C12.6605 13.7872 12.7807 13.5502 12.8064 13.2943L13.4266 3.88831' },
        { d: 'M6.44946 6.98926V11.1238' },
        { d: 'M9.55054 6.98926V11.1238' },
      ])
    }
    function dshSettingsIcon() {
      return dshMenuIcon([
        { d: 'M8 9.75012C8.9665 9.75012 9.75 8.96662 9.75 8.00012C9.75 7.03362 8.9665 6.25012 8 6.25012C7.0335 6.25012 6.25 7.03362 6.25 8.00012C6.25 8.96662 7.0335 9.75012 8 9.75012Z' },
        { d: 'M13.0107 7.79377C12.9505 7.89401 12.9205 7.94413 12.9205 7.99951C12.9205 8.0549 12.9505 8.10502 13.0106 8.20528L13.9849 9.83006C14.045 9.93029 14.0751 9.9804 14.0751 10.0358C14.0751 10.0911 14.045 10.1413 13.9849 10.2415L13.0037 11.8777C12.9468 11.9726 12.9184 12.0201 12.8725 12.0461C12.8267 12.072 12.7713 12.072 12.6607 12.072H10.6704C10.5598 12.072 10.5045 12.072 10.4586 12.098C10.4128 12.1239 10.3843 12.1714 10.3274 12.2662L9.33825 13.9142C9.28133 14.009 9.25287 14.0564 9.20703 14.0823C9.16118 14.1083 9.10588 14.1083 8.99529 14.1083H7.00486C6.89426 14.1083 6.83896 14.1083 6.79312 14.0823C6.74727 14.0564 6.71881 14.009 6.6619 13.9142L5.67273 12.2662C5.61581 12.1714 5.58735 12.1239 5.54151 12.098C5.49566 12.072 5.44036 12.072 5.32977 12.072H3.33945C3.2288 12.072 3.17347 12.072 3.12761 12.0461C3.08176 12.0201 3.0533 11.9726 2.9964 11.8777L2.0152 10.2415C1.9551 10.1413 1.92505 10.0911 1.92505 10.0358C1.92505 9.9804 1.9551 9.93029 2.0152 9.83006L2.98951 8.20528C3.04963 8.10502 3.07969 8.0549 3.07969 7.99951C3.07968 7.94413 3.04961 7.89401 2.98946 7.79377L2.01529 6.17011C1.95514 6.06987 1.92507 6.01975 1.92507 5.96437C1.92506 5.90899 1.95512 5.85886 2.01524 5.7586L2.9964 4.1224C3.0533 4.0275 3.08176 3.98005 3.12761 3.95408C3.17347 3.92811 3.2288 3.92811 3.33945 3.92811H5.32977C5.44036 3.92811 5.49566 3.92811 5.54151 3.90216C5.58735 3.87621 5.61581 3.82879 5.67273 3.73397L6.6619 2.08599C6.71881 1.99116 6.74727 1.94375 6.79312 1.9178C6.83896 1.89185 6.89426 1.89185 7.00486 1.89185H8.99529C9.10588 1.89185 9.16118 1.89185 9.20703 1.9178C9.25287 1.94375 9.28133 1.99116 9.33825 2.08599L10.3274 3.73397C10.3843 3.82879 10.4128 3.87621 10.4586 3.90216C10.5045 3.92811 10.5598 3.92811 10.6704 3.92811H12.6607C12.7713 3.92811 12.8267 3.92811 12.8725 3.95408C12.9184 3.98005 12.9468 4.0275 13.0037 4.1224L13.9849 5.7586C14.045 5.85886 14.0751 5.90899 14.0751 5.96437C14.0751 6.01975 14.045 6.06987 13.9849 6.17011L13.0107 7.79377Z' },
      ])
    }
    /** 知识库标题下拉的 chevron 与菜单选中勾（宿主原路径，Task 8 取证）。 */
    function dshChevronDownIcon() {
      return dshMenuIcon([
        { d: 'M4 6L7.29289 9.29289C7.68342 9.68342 8.31658 9.68342 8.70711 9.29289L12 6' },
      ])
    }
    function dshCheckIcon() {
      return dshMenuIcon([
        { d: 'M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4' },
      ])
    }

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

    /** DSH 真值菜单（菜单批 Task 1，spec M2）：面板/行/危险色/分隔全照宿主
        Menu.module.css；fixed 测位（同 EvalMenu 配方：开拍测位、下方不足朝上、
        背板点收）。与评测域 EvalMenu 互不复用（隔离由 spec M2 注钉）。 */
    function DshMenu({ title, trigger, align, className, render }) {
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
          const openUp = spaceBelow < 200 && rect.top > spaceBelow
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
        { className: 'hrag-mm-wrap' },
        h(
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
        ),
        open
          ? h(
              React.Fragment,
              null,
              h('div', { className: 'hrag-mm-backdrop', onMouseDown: () => setOpen(false) }),
              h(
                'div',
                {
                  className: 'hrag-mm',
                  role: 'menu',
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

    /** DSH 真值菜单行：34px 行高・13px・图标槽。 */
    function DshMenuItem({ danger, disabled, selected, icon, onSelect, children }) {
      return h(
        'button',
        {
          type: 'button',
          role: 'menuitem',
          className: 'hrag-mm-item' + (danger ? ' hrag-mm-item-danger' : ''),
          disabled,
          onClick: () => onSelect && onSelect(),
        },
        icon ? h('span', { className: 'hrag-mm-icon' }, icon) : null,
        children,
        selected ? h('span', { className: 'hrag-mm-check' }, dshCheckIcon()) : null,
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
      const [notice, setNotice] = React.useState(null)
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
        setNotice(null)
      }, [kbId])

      React.useEffect(() => {
        if (!notice) return undefined
        const timer = window.setTimeout(
          () => setNotice(null),
          notice.isError ? NOTICE_DISMISS_ERROR_MS : NOTICE_DISMISS_MS,
        )
        return () => window.clearTimeout(timer)
      }, [notice])

      const notify = React.useCallback((text, isError) => setNotice({ text, isError: Boolean(isError) }), [])

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
        { className: 'hrag-ev-bar' },
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
              { className: 'hrag-ev-searchwrap' },
              h('input', {
                type: 'text',
                className: 'hrag-input hrag-ev-search',
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
                      className: 'hrag-ev-searchclear',
                      'aria-label': tk('ev.questions.searchClear'),
                      onClick: () => setBankSearch(''),
                    },
                    '✕',
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
            running ? h('span', { className: 'hrag-ev-spinner', 'aria-hidden': 'true' }) : null,
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
        notice
          ? h('div', { className: notice.isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice' }, notice.text)
          : null,
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
          const points = evSpanPoints(data.points, span)
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
        tooltip（环比箭头）＋点击下钻 run。插件版＝时间窗直滤（工作台为
        dataZoom 索引窗，用户可见行为等价）。 */
    function EvalTrendChart({ tk, points, baseline, span, pickerSelected, legendSelected, onOpenRun }) {
      const wrapRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const [hover, setHover] = React.useState(null)
      const hoverRef = React.useRef(null)
      hoverRef.current = hover
      const layoutRef = React.useRef({ xs: [] })

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
        const dark = isDarkTheme()
        const ink = (alpha) => (dark ? 'rgba(235,238,245,' + alpha + ')' : 'rgba(60,60,60,' + alpha + ')')
        const padL = 46
        const padR = 16
        const padT = 18
        const padB = 24
        const plotW = width - padL - padR
        const plotH = height - padT - padB
        const count = points.length
        const xAt = (index) => padL + (count === 1 ? plotW / 2 : (index / (count - 1)) * plotW)
        const yAt = (value) => padT + (1 - evWarpValue(value)) * plotH
        const xs = []
        for (let index = 0; index < count; index += 1) xs.push(xAt(index))
        layoutRef.current = { xs }
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
        for (let index = 0; index < count; index += step) {
          const date = new Date(points[index].ts)
          if (Number.isNaN(date.getTime())) continue
          const label =
            span === 'day'
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
        for (let index = 0; index < count; index += 1) {
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
        for (const metric of visibleSeries()) {
          const pts = []
          for (let index = 0; index < count; index += 1) {
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
            const regression =
              metric.key === 'recall_at_k' &&
              points[point.index].regression &&
              points[point.index].regression.detected
            ctx.beginPath()
            ctx.arc(point.x, point.y, highlighted ? 4 : 2.6, 0, Math.PI * 2)
            if (regression) {
              ctx.fillStyle = EVAL_REGRESSION_COLOR
              ctx.fill()
            } else if (metric.layer === 1) {
              ctx.fillStyle = metric.color
              ctx.fill()
            } else {
              ctx.fillStyle = dark ? '#202127' : '#ffffff'
              ctx.fill()
              ctx.strokeStyle = metric.color
              ctx.lineWidth = 1.4
              ctx.stroke()
            }
          }
        }
      }, [points, baseline, span, tk, visibleSeries])

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

      const onMouseMove = (event) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mx = event.clientX - rect.left
        const xs = layoutRef.current.xs
        let best = null
        let bestDistance = 18
        for (let index = 0; index < xs.length; index += 1) {
          const distance = Math.abs(xs[index] - mx)
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
      return h(
        'div',
        { className: 'hrag-ev-chartwrap', ref: wrapRef },
        h('canvas', {
          ref: canvasRef,
          className: 'hrag-ev-chart' + (hover ? ' hrag-ev-chart-hover' : ''),
          onMouseMove,
          onMouseLeave: () => setHover(null),
          onClick: () => {
            if (hover && points[hover.index]) onOpenRun(points[hover.index].run_id)
          },
        }),
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
        三态点/行菜单）＋考题抽屉＋添加/合成弹层＋底部候选题审核停靠。 */
    function EvalBank({ t, tk, kbId, enabled, questionsQ, overviewData, search, selected, onSelectedChange, addOpen, onAddOpenChange, synthOpen, onSynthOpenChange, onTrigger, onReproduce, notify }) {
      const [sortKey, setSortKey] = React.useState('default')
      const [sortDir, setSortDir] = React.useState('asc')
      const [drawerQuestionId, setDrawerQuestionId] = React.useState(null)
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [docTitles, setDocTitles] = React.useState(null)

      React.useEffect(() => {
        setDrawerQuestionId(null)
        setDeleteTargets(null)
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
      const handleRowContextMenu = (questionId) => {
        if (!selected.has(questionId)) onSelectedChange(new Set([questionId]))
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
          { className: 'hrag-ev-table hrag-ev-banktable' },
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
                  label: '⇅',
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
              return h(
                'tr',
                {
                  key: question.id,
                  className: 'hrag-ev-tr' + (isSelected ? ' hrag-ev-tr-on' : ''),
                  onClick: () => setDrawerQuestionId(question.id),
                  onContextMenu: (event) => {
                    event.preventDefault()
                    handleRowContextMenu(question.id)
                  },
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
                    question.relevant_chunk_ids.length > 0
                      ? h(
                          'span',
                          { title: docIds.map(docTitle).join('\n') },
                          String(question.relevant_chunk_ids.length),
                        )
                      : null,
                    question.missing_chunk_ids && question.missing_chunk_ids.length > 0
                      ? h('span', { className: 'hrag-ev-badge hrag-ev-badge-danger' }, tk('ev.questions.danglingBadge'))
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
        // 选中集批量动作条（工作台为工具栏原位切换；插件版＝表下方浮条，精简档）。
        selected.size > 0
          ? h(
              'div',
              { className: 'hrag-ev-bulkbar' },
              h('span', { className: 'hrag-ev-muted hrag-ev-tabnums' }, tk('ev.selection.selected', selected.size)),
              h(
                'button',
                { type: 'button', className: 'hrag-btn hrag-ev-graybtn', onClick: () => onTrigger({ layers: 'l1', question_ids: [...selected] }) },
                tk('ev.tierQuick'),
              ),
              h(
                'button',
                { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => onTrigger({ layers: 'l1_l2', question_ids: [...selected] }) },
                tk('ev.tierFull'),
              ),
              h(
                'button',
                { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => onSelectedChange(new Set()) },
                tk('ev.selection.clear'),
              ),
            )
          : null,
        h(EvalSynthReview, { t, tk, kbId, enabled, notify, docTitle }),
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
        （1–10，默认 5）→ 202 幂等；enqueued 关窗，already_running 留窗。 */
    function EvalSynthDialog({ t, tk, kbId, open, onClose, notify }) {
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
        in_progress 时 3s 轮询（useEvalCall pollWhile）。 */
    function EvalSynthReview({ t, tk, kbId, enabled, notify, docTitle }) {
      const statusQ = useEvalCall(kbId, enabled, 'synthesisStatus', null, (payload) =>
        Boolean(payload && payload.in_progress),
      )
      const [collapsed, setCollapsed] = React.useState(false)
      const [busyId, setBusyId] = React.useState(null)
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
        })
      }
      const handleRejectAll = () => {
        Promise.allSettled(
          candidates.map((candidate) =>
            callOp('rejectSynthesis', { kb_id: kbId, candidate_id: candidate.candidate_id }),
          ),
        ).then(() => statusQ.refresh())
      }
      const docIds = data && Array.isArray(data.doc_ids) ? data.doc_ids : []
      const docsLine =
        docIds.length <= 2
          ? docIds.map(docTitle).join(tk('ev.syn.docsSep'))
          : tk('ev.syn.docsMore', docIds.slice(0, 2).map(docTitle).join(tk('ev.syn.docsSep')), docIds.length)
      const metaTip =
        data && data.generated_at != null ? tk('ev.syn.reviewMetaTip', docsLine, evFmtRunTime(data.generated_at)) : null
      const busy = busyId !== null
      return h(
        'section',
        { className: 'hrag-ev-card hrag-ev-review' + (expanded ? ' hrag-ev-review-open' : '') },
        h(
          'div',
          { className: 'hrag-ev-cardhead' + (expanded ? ' hrag-ev-cardhead-open' : '') },
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
            hasCandidates
              ? h(
                  'button',
                  { type: 'button', className: 'hrag-ev-linkbtn', disabled: busy, onClick: handleAcceptAll },
                  tk('ev.syn.acceptAll'),
                )
              : null,
            hasCandidates
              ? h(
                  'button',
                  { type: 'button', className: 'hrag-ev-linkbtn', disabled: busy, onClick: handleRejectAll },
                  tk('ev.syn.rejectAll'),
                )
              : null,
          ),
        ),
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

    /** 历史视图（照 EvalRunHistory 精简档）：五列表（时间胶囊：回退红/基线琥珀｜
        环境｜评测内容｜状态｜时长右对齐）＋选择集批量删除＋行级删除确认（含
        基线警示）；行点击＝run 详情抽屉。时长恒紧凑词汇（工作台另有按秒格式
        下拉——精简省略）。 */
    function EvalHistory({ t, tk, kbId, runsQ, onOpenRun, notify }) {
      const [selectedIds, setSelectedIds] = React.useState(() => new Set())
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [sortKey, setSortKey] = React.useState('default')
      const [sortDir, setSortDir] = React.useState('asc')
      React.useEffect(() => {
        setSelectedIds(new Set())
        setDeleteTargets(null)
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
        return secs === null ? null : evDurationText(t, secs)
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
          { className: 'hrag-ev-table hrag-ev-banktable' },
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
              h('th', { className: 'hrag-ev-th-num' }, tk('ev.history.colDuration')),
              h(
                'th',
                { className: 'hrag-ev-th-sort' },
                h(EvalMenu, {
                  label: '⇅',
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
        selectedIds.size > 0
          ? h(
              'div',
              { className: 'hrag-ev-bulkbar' },
              h('span', { className: 'hrag-ev-muted hrag-ev-tabnums' }, tk('ev.selection.selected', selectedIds.size)),
              h(
                'button',
                { type: 'button', className: 'hrag-btn hrag-btn-danger', onClick: () => setDeleteTargets([...selectedIds]) },
                tk('ev.history.rowDelete'),
              ),
              h(
                'button',
                { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => setSelectedIds(new Set()) },
                tk('ev.selection.clear'),
              ),
            )
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

    /** 百科视图（Task 9）：统一搜索＋「生成条目」「我的条目」双卡分高（照工作台
        wiki-tab 定高分屏语义：都展开各半、收起一个让位另一个）；⋯ 承接更新/重建
        （重建走确认闸）；条目状态轮询（generating 3s＋触发后 12s 力度窗）；drain 边
        按 last_run 出真话提示；行级/批量更新与删除（编辑档不做＝富文本编辑另案）。 */
    function WikiView({ t, kbId, enabled, onOpenEntry, onOpenCard, command, onBusyChange }) {
      const tk = (key, ...args) => evText(t(key), args)
      const [query, setQuery] = React.useState('')
      const [notice, setNotice] = React.useState(null)
      const [entriesCollapsed, setEntriesCollapsed] = React.useState(false)
      const [cardsCollapsed, setCardsCollapsed] = React.useState(false)
      const [selectedIds, setSelectedIds] = React.useState(() => new Set())
      const [deleteTargets, setDeleteTargets] = React.useState(null)
      const [regeneratingIds, setRegeneratingIds] = React.useState([])
      const [pending, setPending] = React.useState(false)
      const [busy, setBusy] = React.useState(false)
      const [rebuildOpen, setRebuildOpen] = React.useState(false)
      const pollUntilRef = React.useRef(0)
      const manualRunRef = React.useRef(false)

      React.useEffect(() => {
        setQuery('')
        setNotice(null)
        setSelectedIds(new Set())
        setDeleteTargets(null)
        setRegeneratingIds([])
        manualRunRef.current = false
      }, [kbId])

      React.useEffect(() => {
        if (!notice) return undefined
        const timer = window.setTimeout(
          () => setNotice(null),
          notice.isError ? NOTICE_DISMISS_ERROR_MS : NOTICE_DISMISS_MS,
        )
        return () => window.clearTimeout(timer)
      }, [notice])
      const notify = (text, isError) => setNotice({ text, isError: Boolean(isError) })

      const entriesQ = useEvalCall(kbId, enabled, 'listWikiEntries', null, (payload) =>
        Boolean(payload && (payload.generation === 'generating' || Date.now() < pollUntilRef.current)),
      )
      const cardsQ = useEvalCall(kbId, enabled, 'listManualCards', { offset: 0, limit: 200 })

      const entries = entriesQ.data && Array.isArray(entriesQ.data.entries) ? entriesQ.data.entries : []
      const generation = entriesQ.data ? entriesQ.data.generation : null
      const cards = cardsQ.data && Array.isArray(cardsQ.data.items) ? cardsQ.data.items : []

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

      // 过滤（照工作台：条目标题+摘要、卡片标题+摘要+标签，客户端包含匹配）。
      const needle = query.trim().toLowerCase()
      const visibleEntries = needle
        ? entries.filter(
            (entry) =>
              String(entry.title).toLowerCase().indexOf(needle) >= 0 ||
              String(entry.summary).toLowerCase().indexOf(needle) >= 0,
          )
        : entries
      const visibleCards = needle
        ? cards.filter(
            (card) =>
              String(card.title).toLowerCase().indexOf(needle) >= 0 ||
              String(card.summary).toLowerCase().indexOf(needle) >= 0 ||
              (card.tags || []).some((tag) => String(tag).toLowerCase().indexOf(needle) >= 0),
          )
        : cards
      const searching = needle.length > 0
      const entriesExpanded = !entriesCollapsed || (searching && visibleEntries.length > 0)
      const cardsExpanded = !cardsCollapsed || (searching && visibleCards.length > 0)

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
                key: 'update',
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
            h('span', { className: 'hrag-ev-caret' + (entriesExpanded ? ' hrag-ev-caret-open' : '') }, '▾'),
            h('span', { className: 'hrag-wk-secticon' }, wikiBookIcon()),
            h('span', { className: 'hrag-wk-secttitle' }, tk('wk.entries')),
            h('span', { className: 'hrag-ev-badge hrag-ev-tabnums' }, String(entries.length)),
            updating
              ? h(
                  'span',
                  { className: 'hrag-ev-badge hrag-ev-badge-amber hrag-ev-spin-text' },
                  h('span', { className: 'hrag-ev-spinner', 'aria-hidden': 'true' }),
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
                        { key: entry.id, className: 'hrag-wk-row' + (isSelected ? ' hrag-wk-row-on' : '') },
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
                                ? h('span', { className: 'hrag-ev-spinner', 'aria-hidden': 'true' })
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

      const cardsSection = h(
        'section',
        { className: 'hrag-wk-sect' + (cardsExpanded ? ' hrag-wk-sect-open' : '') },
        h(
          'div',
          { className: 'hrag-wk-secthead' },
          h(
            'button',
            {
              type: 'button',
              className: 'hrag-wk-secttoggle',
              'aria-expanded': cardsExpanded,
              onClick: () => setCardsCollapsed((value) => !value),
            },
            h('span', { className: 'hrag-ev-caret' + (cardsExpanded ? ' hrag-ev-caret-open' : '') }, '▾'),
            h('span', { className: 'hrag-wk-secticon' }, wikiNoteIcon()),
            h('span', { className: 'hrag-wk-secttitle' }, tk('wk.cards')),
            h('span', { className: 'hrag-ev-badge hrag-ev-tabnums' }, String(cards.length)),
          ),
        ),
        cardsExpanded
          ? cardsQ.failure
            ? h(
                'div',
                { className: 'hrag-ev-hint hrag-ev-hint-error hrag-wk-inset' },
                tk('wk.loadFailed'),
              )
            : cardsQ.data === null
              ? h('div', { className: 'hrag-ev-hint hrag-wk-inset' }, tk('wk.loading'))
              : visibleCards.length === 0
                ? sectionEmpty(wikiNoteIcon(28), cards.length === 0 ? tk('wk.cardsEmpty') : tk('wk.cardsNoMatch'))
                : h(
                    'div',
                    { className: 'hrag-wk-list' },
                    visibleCards.map((card) =>
                      h(
                        'button',
                        {
                          key: card.id,
                          type: 'button',
                          className: 'hrag-wk-row hrag-wk-cardrow',
                          title: tk('wk.openCard'),
                          onClick: () => onOpenCard(card.id),
                        },
                        h('span', { className: 'hrag-wk-rowicon' }, wikiNoteIcon()),
                        h('span', { className: 'hrag-wk-rowtitle', title: card.title }, card.title),
                        h('span', { className: 'hrag-wk-rowsummary' }, card.summary),
                        card.include_in_wiki_search
                          ? h('span', { className: 'hrag-ev-badge' }, tk('wk.includeInSearch'))
                          : null,
                        h(
                          'span',
                          { className: 'hrag-wk-rowtime hrag-ev-tabnums', title: evFmtFullTime(card.updated_at) },
                          evFmtRunTime(card.updated_at),
                        ),
                      ),
                    ),
                  )
          : null,
      )

      return h(
        'div',
        { className: 'hrag-ev' },
        h(
          'div',
          { className: 'hrag-ev-bar' },
          h(
            'span',
            { className: 'hrag-ev-searchwrap' },
            h('input', {
              type: 'text',
              className: 'hrag-input hrag-ev-search',
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
                    className: 'hrag-ev-searchclear',
                    'aria-label': tk('wk.clearSearch'),
                    onClick: () => setQuery(''),
                  },
                  '✕',
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
                        h('span', { className: 'hrag-ev-spinner', 'aria-hidden': 'true' }),
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
              ],
            }),
          ),
        ),
        notice
          ? h('div', { className: notice.isError ? 'hrag-notice hrag-notice-error' : 'hrag-notice' }, notice.text)
          : null,
        h(
          'div',
          { className: 'hrag-wk-canvas' },
          entriesSection,
          cardsSection,
          selectedIds.size > 0
            ? h(
                'div',
                { className: 'hrag-ev-bulkbar' },
                h('span', { className: 'hrag-ev-muted hrag-ev-tabnums' }, tk('wk.selectedCount', selectedIds.size)),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-ev-graybtn',
                    disabled: updating,
                    onClick: () => handleRegenerateEntries([...selectedIds]),
                  },
                  tk('wk.updateSelected'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-btn-danger',
                    onClick: () => setDeleteTargets(entries.filter((entry) => selectedIds.has(entry.id))),
                  },
                  tk('wk.deleteSelected'),
                ),
                h(
                  'button',
                  { type: 'button', className: 'hrag-btn hrag-btn-outline', onClick: () => setSelectedIds(new Set()) },
                  tk('wk.cancelSelection'),
                ),
              )
            : null,
        ),
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
    function WikiEntryDrawer({ t, kbId, entryId, onClose, onOpenChunk }) {
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

    /** 人工卡片抽屉（Task 9，照工作台 manual-card-drawer）：头部便签图标＋标题＋
        「我的卡片」/「混入搜索」徽章；正文卡（标签行 border-b 分隔 ＋ pre-wrap
        正文）；更新时间行。只读档（卡片编辑不做＝另案）。 */
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
            h('span', { className: 'hrag-wk-secticon' }, wikiNoteIcon()),
            h('span', { className: 'hrag-drawer-title', title: card ? String(card.title) : '' }, card ? String(card.title) : tk('wk.loading')),
            card ? h('span', { className: 'hrag-ev-badge hrag-wk-dirty' }, tk('wk.cardType')) : null,
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

    /** 功能模型设置面·批 1（菜单批 Task 1，spec M4）：Sheet 骨架＋只读七组
        主行＋重建索引入口（自顶栏移入，行为逐项一致）＋迁移状态行。批 2+ 逐组
        换完整表单（工作台 functional-models-view 对照）。 */
    const SET_GROUPS = [
      { title: 'set.group.default', rows: [['default_model', 'set.field.defaultModel']] },
      {
        title: 'set.group.retrieval',
        rows: [
          ['embedding_provider', 'set.field.embeddingProvider'],
          ['embedding_model', 'set.field.embeddingModel'],
          ['embedding_dimension', 'set.field.dimension'],
          ['embedding_base_url', 'set.field.embeddingBaseUrl'],
          ['embedding_sparse_source', 'set.field.sparseSource'],
          ['sparse_provider', 'set.field.sparseProvider'],
          ['sparse_model', 'set.field.sparseModel'],
          ['sparse_base_url', 'set.field.sparseBaseUrl'],
          ['rerank_provider', 'set.field.rerankProvider'],
          ['rerank_model', 'set.field.rerankModel'],
          ['rerank_base_url', 'set.field.rerankBaseUrl'],
        ],
      },
      {
        title: 'set.group.extraction',
        rows: [
          ['extract_model', 'set.field.extractModel'],
          ['wiki_model', 'set.field.wikiModel'],
          ['synthesis_model', 'set.field.synthesisModel'],
        ],
      },
      { title: 'set.group.evaluation', rows: [['judge_model', 'set.field.judgeModel']] },
      {
        title: 'set.group.multimodal',
        rows: [
          ['vlm_model', 'set.field.captionModel'],
          ['video.asr_provider', 'set.field.asrProvider'],
          ['video.asr_model', 'set.field.asrModel'],
          ['asr_base_url', 'set.field.asrBaseUrl'],
        ],
      },
      {
        title: 'set.group.services',
        rows: [
          ['parse_provider', 'set.field.parseProvider'],
          ['parse_base_url', 'set.field.parseBaseUrl'],
          ['parse_tier', 'set.field.parseTier'],
          ['parse_language', 'set.field.parseLanguage'],
          ['parse_model_version', 'set.field.parseModelVersion'],
          ['qdrant_url', 'set.field.qdrantUrl'],
          ['mineru_api_token', 'set.field.mineruToken'],
        ],
      },
    ]

    function setValueAt(config, path) {
      const parts = String(path).split('.')
      let value = config
      for (const part of parts) {
        if (value == null || typeof value !== 'object') return null
        value = value[part]
      }
      return value
    }

    function ModelSettingsPanel({ t, kbId, onClose, reindexLine, reindexBusy, reindexRunning, onReindex }) {
      const configQ = useEvalCall(kbId, true, 'ragConfigGet', null)
      const migrationQ = useEvalCall(kbId, true, 'ragMigration', null, (payload) =>
        Boolean(payload && payload.state === 'running'),
      )
      const config = configQ.data && configQ.data.config ? configQ.data.config : {}
      const migration =
        (migrationQ.data && typeof migrationQ.data === 'object' ? migrationQ.data : null) ||
        (configQ.data && configQ.data.migration ? configQ.data.migration : null)

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
          { className: 'hrag-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('menu.modelSettings') },
          h(
            'div',
            { className: 'hrag-drawer-head' },
            h('span', { className: 'hrag-wk-secticon' }, dshSettingsIcon()),
            h('span', { className: 'hrag-drawer-title' }, t('menu.modelSettings')),
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
            { className: 'hrag-drawer-body hrag-set-body' },
            h('p', { className: 'hrag-set-hint' }, t('set.readonlyHint')),
            migrationLine,
            h(
              'div',
              { className: 'hrag-set-card' },
              h('div', { className: 'hrag-set-cardhead' }, t('reindex.button')),
              h(
                'div',
                { className: 'hrag-set-cardbody' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'hrag-btn hrag-btn-outline hrag-btn-sm',
                    disabled: reindexBusy || reindexRunning,
                    title: t('reindex.button'),
                    onClick: onReindex,
                  },
                  t('reindex.button'),
                ),
                reindexLine ? h('div', { className: 'hrag-reindex-status' }, reindexLine) : null,
              ),
            ),
            configQ.failure
              ? h('div', { className: 'hrag-ev-hint hrag-ev-hint-error hrag-wk-inset' }, t('set.loadFailed'))
              : configQ.data === null
                ? h('div', { className: 'hrag-ev-hint hrag-wk-inset' }, t('wk.loading'))
                : SET_GROUPS.map((group) =>
                    h(
                      'div',
                      { className: 'hrag-set-group', key: group.title },
                      h('div', { className: 'hrag-set-grouptitle' }, t(group.title)),
                      group.rows.map(([path, labelKey]) => {
                        const raw = setValueAt(config, path)
                        const text = raw === null || raw === undefined || raw === '' ? '—' : String(raw)
                        return h(
                          'div',
                          { className: 'hrag-set-row', key: path },
                          h('span', { className: 'hrag-set-label' }, t(labelKey)),
                          h('span', { className: 'hrag-set-value', title: text }, text),
                        )
                      }),
                    ),
                  ),
          ),
        ),
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
      // 百科抽屉壳（Task 9）：百科 tab 行点击与召回 wiki 命中共用；组件级渲染
      // 在面板根（同 ChunkDrawer 层位，z 帧 56/57 垫在续读抽屉下）。
      const [wikiDrawer, setWikiDrawer] = React.useState(null)
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
      const reindexRunning =
        reindexBusy || (reindexState !== null && reindexState.in_progress === true)
      // 检索联动叠加（照工作台「在向量空间查看」）：召回触发 → 切投影分区并投影。
      const [overlayRequest, setOverlayRequest] = React.useState(null)
      // 复现预填（评测 → 召回，§7.2）：{query, nonce}——切分区并预填检索框。
      const [recallPrefill, setRecallPrefill] = React.useState(null)
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
        setWikiDrawer(null)
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
            setBarNotice({ text: t('renameKb.done') })
          })
          .catch((error) => setBarNotice({ text: errorDetail(error), isError: true }))
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
            setBarNotice({ text: errorDetail(error), isError: true })
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
              render: (close) =>
                kbs.map((kb) =>
                  h(
                    DshMenuItem,
                    {
                      key: String(kb.id),
                      selected: String(kb.id) === kbId,
                      onSelect: () => {
                        close()
                        setKbId(String(kb.id))
                      },
                    },
                    String(kb.name || kb.id),
                  ),
                ),
            }),
            h(DshMenu, {
              title: t('menu.more'),
              align: 'end',
              className: 'hrag-iconbare',
              trigger: dshEllipsisIcon(),
              render: (close) => [
                h(
                  DshMenuItem,
                  {
                    key: 'upload',
                    icon: lucideUploadIcon(),
                    disabled: uploading,
                    onSelect: () => {
                      close()
                      const input = fileInputRef.current
                      if (input) input.click()
                    },
                  },
                  uploading ? t('menu.uploading') : t('menu.upload'),
                ),
                h(
                  DshMenuItem,
                  {
                    key: 'refresh',
                    icon: dshRefreshIcon(),
                    onSelect: () => {
                      close()
                      load()
                      setRefreshToken((value) => value + 1)
                    },
                  },
                  t('menu.refreshUi'),
                ),
                h('div', { key: 'sep-1', className: 'hrag-mm-sep' }),
                h(
                  DshMenuItem,
                  {
                    key: 'update-wiki',
                    icon: wikiBusy ? h('span', { className: 'hrag-ev-spinner', 'aria-hidden': 'true' }) : lucideBookOpenIcon(),
                    disabled: wikiBusy,
                    onSelect: () => {
                      close()
                      setWikiCommand({ mode: 'incremental', nonce: Date.now() })
                      setSection('wiki')
                    },
                  },
                  wikiBusy ? t('wk.updating') : t('wk.updateWiki'),
                ),
                h(
                  DshMenuItem,
                  {
                    key: 'rebuild-wiki',
                    icon: lucideRefreshCwIcon(),
                    disabled: wikiBusy,
                    onSelect: () => {
                      close()
                      setShellRebuildOpen(true)
                    },
                  },
                  t('wk.rebuildWiki'),
                ),
                h('div', { key: 'sep-2', className: 'hrag-mm-sep' }),
                h(
                  DshMenuItem,
                  {
                    key: 'rename',
                    icon: dshEditIcon(),
                    onSelect: () => {
                      close()
                      openRename()
                    },
                  },
                  t('menu.renameKb'),
                ),
                h(
                  DshMenuItem,
                  {
                    key: 'delete',
                    danger: true,
                    icon: dshTrashIcon(),
                    onSelect: () => {
                      close()
                      setKbDeleteOpen(true)
                    },
                  },
                  t('menu.deleteKb'),
                ),
                h('div', { key: 'sep-3', className: 'hrag-mm-sep' }),
                h(
                  DshMenuItem,
                  {
                    key: 'settings',
                    icon: dshSettingsIcon(),
                    onSelect: () => {
                      close()
                      setSettingsOpen(true)
                    },
                  },
                  t('menu.modelSettings'),
                ),
              ],
            }),
          ),
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
            { className: 'hrag-tabs', role: 'tablist' },
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
            ? h(
                HragBoundary,
                { t, name: t('shell.tab.docs') },
                h(DocsView, {
                  t,
                  kbId,
                  refreshToken,
                  onOpenChunks: (doc) => setDrawer({ doc, focus: null }),
                }),
              )
            : null,
          section === 'recall'
            ? h(
                HragBoundary,
                { t, name: t('shell.tab.recall') },
                h(RecallView, {
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
              }),
              )
            : null,
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

      return h(
        React.Fragment,
        null,
        h(Styles),
        h(
          'div',
          { className: 'hrag-root' },
          h(HragBoundary, { t, name: t('tab.title') }, content),
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
            ? h(ModelSettingsPanel, {
                t,
                kbId,
                onClose: () => setSettingsOpen(false),
                reindexLine,
                reindexBusy,
                reindexRunning,
                onReindex: () => {
                  setReindexError(null)
                  setReindexOpen(true)
                },
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
