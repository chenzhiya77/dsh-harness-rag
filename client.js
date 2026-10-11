// Browser half of dsh-harness-rag. Loaded by the Web Client through the
// deployment module factory format (see DSH cordis-plugin-development skill,
// templates/decoration/client.js). No TypeScript here: the factory table
// consumes plain JS, so T3 build tooling is a later decision.
window.__ModuleLoader__.load({
  id: 'dsh-harness-rag',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'harnessRag'
    const zh = {
      'tab.title': '知识库',
      'tab.description': 'Harness RAG：三路检索、文档续读、知识库管理',
      'panel.placeholder': '知识库面板（骨架占位，T3 实装）',
    }
    const en = {
      'tab.title': 'Knowledge Base',
      'tab.description': 'Harness RAG: three-path retrieval, document continuation, knowledge-base management',
      'panel.placeholder': 'Knowledge base panel (skeleton placeholder; real UI ships in T3)',
    }

    function KnowledgePanel({ t }) {
      return h('div', { style: { padding: '12px' } }, t('panel.placeholder'))
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
