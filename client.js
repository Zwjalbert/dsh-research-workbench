window.__ModuleLoader__.load({
  id: 'dsh-research-workbench',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const DICT_ZH = {
      'dock.title': '科研台',
      'dock.badge': '快路径',
      'dock.hint': '点击直接执行 · Alt+点击只填入 · 产物存到 research-output/',
      'dock.collapse': '收起',
      'dock.expand': '展开科研台',
      'dock.board': '产物',
      'stage.question': '定问题',
      'stage.lit': '检索',
      'stage.analyze': '分析',
      'stage.idea': '灵感',
      'stage.design': '设计',
      'stage.data': '数据',
      'stage.stats': '统计',
      'stage.qual': '质性',
      'stage.review': '综述',
      'card.running': '正在执行',
      'card.error': '执行失败',
      'card.records': '文献',
      'card.sources': '来源',
      'card.themes': '主题',
      'card.gaps': '可检验空白',
      'card.years': '年份分布',
      'card.evidence': '证据表',
      'card.artifact': '产物',
      'card.open': '打开',
      'card.step': '步骤',
      'card.idea.wildness': '荒诞度',
      'card.idea.novelty': '新颖',
      'card.idea.feasibility': '可行',
      'card.idea.testability': '可检验',
      'card.idea.killTest': '最小杀死测试',
      'card.idea.falsifier': '证伪条件',
      'card.idea.wildest': '最荒诞但可验证',
      'card.design.sample': '样本',
      'card.design.power': '检验力',
      'card.design.conditions': '条件',
      'card.design.timeline': '时间线',
      'card.design.threats': '威胁',
      'card.design.falsifier': '证伪',
      'card.design.curve': '检验力曲线',
      'card.stats.groups': '组间',
      'card.stats.effect': '效应量',
      'card.stats.coefficients': '回归系数',
      'card.qual.coverage': '编码覆盖',
      'card.qual.codes': '代码频次',
      'card.qual.quotes': '代表性引文',
      'card.qual.matrix': '共现矩阵',
      'card.qual.uncoded': '未编码',
      'card.data.file': '文件',
      'card.data.columns': '列',
      'card.data.preview': '预览',
      'card.board.empty': '还没有科研产物',
      'card.board.workbench': '工作台目录',
    }

    const DICT_EN = {
      'dock.title': 'Research desk',
      'dock.badge': 'Fast path',
      'dock.hint': 'Click to run · Alt+click to insert only · artifacts in research-output/',
      'dock.collapse': 'Collapse',
      'dock.expand': 'Open research desk',
      'dock.board': 'Artifacts',
      'stage.question': 'Question',
      'stage.lit': 'Search',
      'stage.analyze': 'Analyze',
      'stage.idea': 'Ideas',
      'stage.design': 'Design',
      'stage.data': 'Data',
      'stage.stats': 'Stats',
      'stage.qual': 'Qual',
      'stage.review': 'Review',
      'card.running': 'Running',
      'card.error': 'Failed',
      'card.records': 'Records',
      'card.sources': 'Sources',
      'card.themes': 'Themes',
      'card.gaps': 'Testable gaps',
      'card.years': 'Years',
      'card.evidence': 'Evidence',
      'card.artifact': 'Artifact',
      'card.open': 'Open',
      'card.step': 'Step',
      'card.idea.wildness': 'Absurdity',
      'card.idea.novelty': 'Novelty',
      'card.idea.feasibility': 'Feasibility',
      'card.idea.testability': 'Testability',
      'card.idea.killTest': 'Cheapest kill test',
      'card.idea.falsifier': 'Falsifier',
      'card.idea.wildest': 'Wildest testable idea',
      'card.design.sample': 'Sample',
      'card.design.power': 'Power',
      'card.design.conditions': 'Conditions',
      'card.design.timeline': 'Timeline',
      'card.design.threats': 'Threats',
      'card.design.falsifier': 'Falsifier',
      'card.design.curve': 'Power curve',
      'card.stats.groups': 'Groups',
      'card.stats.effect': 'Effect',
      'card.stats.coefficients': 'Coefficients',
      'card.qual.coverage': 'Coverage',
      'card.qual.codes': 'Code frequency',
      'card.qual.quotes': 'Representative quotes',
      'card.qual.matrix': 'Co-occurrence',
      'card.qual.uncoded': 'Uncoded',
      'card.data.file': 'File',
      'card.data.columns': 'Columns',
      'card.data.preview': 'Preview',
      'card.board.empty': 'No research artifacts yet',
      'card.board.workbench': 'Workbench',
    }

    const CSS = `
      .rw-dock { border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); border-radius:14px; padding:8px 10px; margin:6px 0 0; color:var(--dsw-alias-label-primary); font-size:12px; }
      .rw-dock-head { display:flex; align-items:center; gap:8px; }
      .rw-dock-title { font-weight:650; letter-spacing:.01em; }
      .rw-dock-badge { border:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); border-radius:999px; padding:1px 7px; font-size:11px; }
      .rw-dock-hint { color:var(--dsw-alias-label-secondary); margin-left:auto; font-size:11px; }
      .rw-dock-collapse { border:0; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; font-size:11px; padding:4px 6px; border-radius:6px; }
      .rw-dock-collapse:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
      .rw-chips { display:flex; gap:6px; overflow-x:auto; padding:7px 0 2px; scrollbar-width:thin; }
      .rw-chip { display:inline-flex; align-items:center; gap:5px; white-space:nowrap; border:1px solid var(--dsw-alias-border-l1); background:transparent; color:var(--dsw-alias-label-primary); border-radius:999px; padding:5px 9px; cursor:pointer; font-size:12px; line-height:1.2; }
      .rw-chip:hover { background:var(--dsw-alias-bg-layer-2); border-color:var(--dsw-alias-brand-primary); }
      .rw-chip-step { color:var(--dsw-alias-label-secondary); font-size:10px; font-variant-numeric:tabular-nums; }
      .rw-pill { border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-secondary); border-radius:999px; padding:5px 10px; cursor:pointer; font-size:12px; }
      .rw-pill:hover { color:var(--dsw-alias-label-primary); border-color:var(--dsw-alias-brand-primary); }
      .rw-card { border:1px solid var(--dsw-alias-border-l1); background:var(--dsw-alias-bg-layer-1); border-radius:12px; padding:12px 14px; margin:8px 0; color:var(--dsw-alias-label-primary); font-size:13px; line-height:1.55; overflow:hidden; }
      .rw-card-head { display:flex; align-items:flex-start; gap:9px; margin-bottom:8px; }
      .rw-icon { width:28px; height:28px; border-radius:9px; background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-brand-primary); display:flex; align-items:center; justify-content:center; font-weight:700; flex:0 0 auto; }
      .rw-card-title { font-weight:650; font-size:14px; }
      .rw-muted { color:var(--dsw-alias-label-secondary); }
      .rw-small { font-size:11px; }
      .rw-p { margin:5px 0; }
      .rw-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(108px,1fr)); gap:8px; margin:8px 0; }
      .rw-stat { border:1px solid var(--dsw-alias-border-l1); border-radius:9px; padding:7px 9px; background:var(--dsw-alias-bg-layer-2); }
      .rw-stat-label { color:var(--dsw-alias-label-secondary); font-size:11px; }
      .rw-stat-value { font-weight:650; font-size:15px; margin-top:2px; font-variant-numeric:tabular-nums; }
      .rw-table-wrap { overflow-x:auto; border:1px solid var(--dsw-alias-border-l1); border-radius:9px; margin:7px 0; }
      .rw-table { width:100%; border-collapse:collapse; font-size:12px; }
      .rw-table th { text-align:left; color:var(--dsw-alias-label-secondary); font-weight:600; padding:6px 7px; border-bottom:1px solid var(--dsw-alias-border-l1); white-space:nowrap; }
      .rw-table td { padding:6px 7px; border-bottom:1px solid var(--dsw-alias-border-l1); vertical-align:top; }
      .rw-table tr:last-child td { border-bottom:0; }
      .rw-link { color:var(--dsw-alias-brand-primary); text-decoration:none; }
      .rw-link:hover { text-decoration:underline; }
      .rw-chipline { display:flex; flex-wrap:wrap; gap:5px; margin:6px 0; }
      .rw-tag { border:1px solid var(--dsw-alias-border-l1); border-radius:999px; padding:2px 7px; color:var(--dsw-alias-label-secondary); font-size:11px; }
      .rw-warn { border-left:3px solid var(--dsw-alias-state-warn-primary); padding:6px 8px; background:var(--dsw-alias-bg-layer-2); border-radius:0 7px 7px 0; margin:7px 0; font-size:12px; }
      .rw-error { border-left:3px solid var(--dsw-alias-state-error-primary); padding:6px 8px; background:var(--dsw-alias-bg-layer-2); border-radius:0 7px 7px 0; margin:7px 0; font-size:12px; }
      .rw-pre { white-space:pre-wrap; word-break:break-word; background:var(--dsw-alias-bg-layer-2); border:1px solid var(--dsw-alias-border-l1); border-radius:8px; padding:8px; font-size:12px; max-height:280px; overflow:auto; }
      .rw-idea { border:1px solid var(--dsw-alias-border-l1); border-radius:10px; padding:9px 10px; margin:7px 0; background:var(--dsw-alias-bg-layer-2); }
      .rw-idea.wild { border-color:var(--dsw-alias-brand-primary); }
      .rw-scores { display:flex; flex-wrap:wrap; gap:5px; margin:4px 0 6px; }
      .rw-score { font-size:11px; color:var(--dsw-alias-label-secondary); border:1px solid var(--dsw-alias-border-l1); border-radius:999px; padding:1px 6px; }
      .rw-dot { width:7px; height:7px; border-radius:50%; background:var(--dsw-alias-brand-primary); display:inline-block; animation:rw-pulse 1.2s ease-in-out infinite; }
      @keyframes rw-pulse { 0%,100%{opacity:.35; transform:scale(.8)} 50%{opacity:1; transform:scale(1)} }
      .rw-scroll { max-height:620px; overflow:auto; scrollbar-width:thin; }
      .rw-artifacts { display:flex; flex-wrap:wrap; gap:6px; margin-top:7px; }
      .rw-artifact { border:1px solid var(--dsw-alias-border-l1); border-radius:7px; padding:4px 7px; font-size:11px; background:transparent; color:var(--dsw-alias-brand-primary); cursor:pointer; }
      .rw-artifact:hover { background:var(--dsw-alias-bg-layer-2); }
      .rw-matrix { display:grid; gap:2px; margin:6px 0; font-size:10px; }
      .rw-matrix-cell { min-height:20px; border-radius:3px; display:flex; align-items:center; justify-content:center; color:var(--dsw-alias-label-secondary); }
      .rw-quote { border-left:2px solid var(--dsw-alias-brand-primary); padding:3px 8px; margin:5px 0; color:var(--dsw-alias-label-secondary); font-size:12px; }
      @media (max-width: 720px) { .rw-dock-hint { display:none; } .rw-card { padding:10px 11px; } }
    `

    function applyThemeStyles() {
      return h('style', { dangerouslySetInnerHTML: { __html: CSS } })
    }

    function fmt(value, digits = 2) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
      return Number(value.toFixed(digits)).toString()
    }

    function pct(value) {
      return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—'
    }

    function pvalue(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      if (value < 0.001) return '< .001'
      return value.toFixed(3).replace(/^0/, '')
    }

    function truncate(value, length = 200) {
      const text = String(value || '').replace(/\s+/g, ' ').trim()
      return text.length > length ? `${text.slice(0, Math.max(0, length - 1))}…` : text
    }

    function parseArgs(block) {
      try {
        if (block?.call?.argsRaw) return JSON.parse(block.call.argsRaw)
        if (block?.argsRaw) return JSON.parse(block.argsRaw)
        if (block?.args?.value && typeof block.args.value === 'object') return block.args.value
      } catch {}
      return {}
    }

    function useT(ctx) {
      const snapshot = React.useSyncExternalStore(
        React.useCallback(callback => ctx.locale.subscribe(callback), [ctx]),
        React.useCallback(() => ctx.locale.getSnapshot(), [ctx]),
      )
      const t = ctx.locale.bind('research-workbench')
      return { t, lang: String(snapshot?.active || 'zh').startsWith('zh') ? 'zh' : 'en' }
    }

    function Header(props) {
      return h('div', { className: 'rw-card-head' },
        h('div', { className: 'rw-icon', 'aria-hidden': true }, props.icon || '研'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { className: 'rw-card-title' }, props.title),
          props.subtitle ? h('div', { className: 'rw-muted rw-small' }, props.subtitle) : null,
        ),
        props.right || null,
      )
    }

    function StatGrid({ items }) {
      if (!items?.length) return null
      return h('div', { className: 'rw-grid' }, ...items.map((item, index) => h('div', { className: 'rw-stat', key: `${item.label}-${index}` },
        h('div', { className: 'rw-stat-label' }, item.label),
        h('div', { className: 'rw-stat-value' }, item.value),
        item.hint ? h('div', { className: 'rw-muted rw-small' }, item.hint) : null,
      )))
    }

    function Bars({ items, valueKey = 'count', labelKey = 'term', max: maxValue, color = 'var(--dsw-alias-brand-primary)' }) {
      if (!items?.length) return null
      const max = maxValue || Math.max(...items.map(item => Number(item[valueKey]) || 0), 1)
      return h('div', { style: { display: 'grid', gap: 4, margin: '6px 0' } }, ...items.map((item, index) => {
        const value = Number(item[valueKey]) || 0
        return h('div', { key: `${item[labelKey]}-${index}`, style: { display: 'grid', gridTemplateColumns: 'minmax(58px, 28%) 1fr 34px', gap: 6, alignItems: 'center', fontSize: 11 } },
          h('span', { title: String(item[labelKey]), style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, String(item[labelKey] ?? '—')),
          h('div', { style: { height: 7, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 99, overflow: 'hidden' } },
            h('div', { style: { height: '100%', width: `${Math.max(2, (value / max) * 100)}%`, background: color, borderRadius: 99 } }),
          ),
          h('span', { className: 'rw-muted', style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, fmt(value, 0)),
        )
      }))
    }

    function YearChart({ years }) {
      if (!years?.length) return null
      const max = Math.max(...years.map(item => item.count), 1)
      const width = 320
      const height = 72
      const barWidth = Math.max(2, (width - 12) / years.length - 2)
      return h('div', { style: { margin: '6px 0' } },
        h('svg', { viewBox: `0 0 ${width} ${height + 16}`, width: '100%', height: 88, role: 'img', 'aria-label': 'year distribution' },
          h('line', { x1: 6, y1: height, x2: width - 6, y2: height, style: { stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1 } }),
          ...years.map((item, index) => {
            const barHeight = Math.max(2, (item.count / max) * (height - 8))
            const x = 6 + index * ((width - 12) / years.length)
            return h('rect', { key: item.year, x: x + 1, y: height - barHeight, width: Math.max(2, barWidth), height: barHeight, rx: 2, style: { fill: 'var(--dsw-alias-brand-primary)', opacity: 0.55 + 0.45 * (item.count / max) } })
          }),
          h('text', { x: 6, y: height + 12, style: { fill: 'var(--dsw-alias-label-secondary)', fontSize: 9 } }, String(years[0].year)),
          years.length > 1 ? h('text', { x: width - 6, y: height + 12, textAnchor: 'end', style: { fill: 'var(--dsw-alias-label-secondary)', fontSize: 9 } }, String(years[years.length - 1].year)) : null,
        ),
      )
    }

    function PowerCurve({ points }) {
      if (!points?.length) return null
      const width = 320
      const height = 92
      const maxN = Math.max(...points.map(point => point.n), 1)
      const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${8 + (point.n / maxN) * (width - 16)} ${height - 8 - point.power * (height - 20)}`).join(' ')
      return h('div', { style: { margin: '6px 0' } },
        h('svg', { viewBox: `0 0 ${width} ${height + 14}`, width: '100%', height: 106, role: 'img', 'aria-label': 'power curve' },
          h('line', { x1: 8, y1: height - 8, x2: width - 8, y2: height - 8, style: { stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1 } }),
          h('line', { x1: 8, y1: 8, x2: 8, y2: height - 8, style: { stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1 } }),
          h('path', { d: path, fill: 'none', style: { stroke: 'var(--dsw-alias-brand-primary)', strokeWidth: 2 } }),
          h('text', { x: 10, y: height + 8, style: { fill: 'var(--dsw-alias-label-secondary)', fontSize: 9 } }, `n=${points[0].n}`),
          h('text', { x: width - 8, y: height + 8, textAnchor: 'end', style: { fill: 'var(--dsw-alias-label-secondary)', fontSize: 9 } }, `n=${points[points.length - 1].n}`),
          h('text', { x: width - 8, y: 12, textAnchor: 'end', style: { fill: 'var(--dsw-alias-label-secondary)', fontSize: 9 } }, 'power'),
        ),
      )
    }

    function PaperTable({ records, onOpen }) {
      if (!records?.length) return null
      return h('div', { className: 'rw-table-wrap' },
        h('table', { className: 'rw-table' },
          h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, '文献'), h('th', null, '年份'), h('th', null, '来源'), h('th', null, '引用'))),
          h('tbody', null, ...records.map((record, index) => h('tr', { key: `${record.title}-${index}` },
            h('td', { className: 'rw-muted' }, index + 1),
            h('td', null,
              record.url ? h('a', { className: 'rw-link', href: record.url, target: '_blank', rel: 'noreferrer', title: record.title }, truncate(record.title, 88)) : truncate(record.title, 88),
              record.authors?.length ? h('div', { className: 'rw-muted rw-small' }, truncate(record.authors.join(', '), 68)) : null,
            ),
            h('td', null, record.year || '—'),
            h('td', { className: 'rw-muted' }, truncate(record.venue || '—', 34)),
            h('td', { className: 'rw-muted' }, fmt(record.citations, 0)),
          ))),
        ),
      )
    }

    function Artifacts({ artifacts, openFile }) {
      if (!artifacts?.length) return null
      return h('div', { className: 'rw-artifacts' }, ...artifacts.map((artifact, index) => {
        const path = typeof artifact === 'string' ? artifact : artifact.path
        const label = typeof artifact === 'string' ? artifact.split('/').pop() : (artifact.label || path)
        return h('button', {
          key: `${path}-${index}`,
          type: 'button',
          className: 'rw-artifact',
          title: path,
          onClick: () => { try { openFile?.(path) } catch {} },
        }, `${label} ↗`)
      }))
    }

    function Card({ icon, title, subtitle, right, children }) {
      return h('div', { className: 'rw-card' },
        applyThemeStyles(),
        h(Header, { icon, title, subtitle, right }),
        ...(Array.isArray(children) ? children : [children]).filter(Boolean),
      )
    }

    function RunningCard({ toolName, block }) {
      const args = parseArgs(block)
      const labels = {
        research_lit: '文献流水线',
        research_idea: '头脑风暴',
        research_design: '实验设计',
        research_stats: '统计分析',
        research_qual: '质性编码',
        research_data: '数据',
        research_board: '科研产物',
      }
      return h(Card, {
        icon: '…',
        title: labels[toolName] || '科研工具',
        subtitle: args.query || args.seed || args.hypothesis || args.action || '正在准备',
        right: h('span', { className: 'rw-muted rw-small' }, h('span', { className: 'rw-dot' }), ' 运行中'),
      }, h('div', { className: 'rw-muted rw-small' }, '结果返回后会在这里显示可视化卡片。'))
    }

    function RawCard({ block, toolName }) {
      const text = (block?.content || []).filter(part => part.type === 'text').map(part => part.text).join('\n')
      return h(Card, { icon: '!', title: '科研工具结果', subtitle: toolName },
        block?.isError ? h('div', { className: 'rw-error' }, block?.error?.reason || '执行失败') : null,
        h('pre', { className: 'rw-pre' }, truncate(text || '无内容', 5000)),
      )
    }

    function ErrorCard({ block, toolName }) {
      const content = (block?.content || []).filter(part => part.type === 'text').map(part => part.text).join('\n')
      return h(Card, { icon: '!', title: '执行失败', subtitle: toolName, right: h('span', { className: 'rw-muted rw-small' }, '未完成') },
        h('div', { className: 'rw-error' }, block?.error?.reason || content || '工具执行失败'),
      )
    }

    function LitCard({ meta, openFile }) {
      const records = meta.records || []
      const analysis = meta.analysis
      const review = meta.review
      return h(Card, {
        icon: meta.action === 'review' ? '综' : meta.action === 'analyze' ? '析' : '文',
        title: meta.title || '文献',
        subtitle: meta.query || (meta.searchId ? `记录 ${meta.searchId}` : ''),
        right: meta.count !== undefined ? h('span', { className: 'rw-tag' }, `${meta.count} 条`) : null,
      },
        meta.summary ? h('div', { className: 'rw-p' }, meta.summary) : null,
        meta.sourceCounts ? h('div', { className: 'rw-chipline' }, ...Object.entries(meta.sourceCounts).map(([source, count]) => h('span', { className: 'rw-tag', key: source }, `${source} ${count}`))) : null,
        meta.errors?.length ? h('div', { className: 'rw-warn' }, meta.errors.join('；')) : null,
        analysis ? h('div', null,
          h(StatGrid, { items: [
            { label: '记录', value: fmt(analysis.total, 0) },
            { label: '近三年', value: pct(analysis.recentShare) },
            { label: 'OA', value: pct(analysis.oaShare) },
            { label: '篇均引用', value: fmt(analysis.citations?.mean, 1) },
          ] }),
          h('div', { className: 'rw-small rw-muted', style: { marginTop: 8 } }, '年份分布'),
          h(YearChart, { years: analysis.years }),
          h('div', { className: 'rw-small rw-muted', style: { marginTop: 8 } }, '主题频次'),
          h(Bars, { items: analysis.themes || [] }),
          analysis.gaps?.length ? h('div', { style: { marginTop: 8 } },
            h('div', { className: 'rw-small rw-muted' }, '可检验空白'),
            ...analysis.gaps.map((gap, index) => h('div', { className: 'rw-warn', key: index }, gap)),
          ) : null,
        ) : null,
        records.length ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, `文献（${records.length}）`),
          h(PaperTable, { records }),
        ) : null,
        review ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, `综述结构 · ${review.wordCount || 0} 字`),
          h('div', { className: 'rw-chipline' }, ...(review.outline || []).map(section => h('span', { className: 'rw-tag', key: section }, section))),
          h('pre', { className: 'rw-pre' }, review.preview || ''),
        ) : null,
        meta.screening?.rejected?.length ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, `被排除 ${meta.screening.rejectedCount ?? meta.screening.rejected.length} 条`),
          ...meta.screening.rejected.slice(0, 4).map((item, index) => h('div', { className: 'rw-muted rw-small', key: index }, `· ${truncate(item.title, 72)} — ${item.reason}`)),
        ) : null,
        h(Artifacts, { artifacts: meta.artifacts, openFile }),
      )
    }

    function IdeaCard({ meta }) {
      const ideas = meta.ideas || []
      return h(Card, {
        icon: '想',
        title: '头脑风暴',
        subtitle: `种子：${truncate(meta.seed, 80)}`,
        right: h('span', { className: 'rw-tag' }, `荒诞度 ${meta.wildness ?? '—'}`),
      },
        h('div', { className: 'rw-p' }, meta.summary || ''),
        h('div', { className: 'rw-scroll' }, ...ideas.map((idea, index) => h('div', {
          className: `rw-idea${idea.id === meta.wildest ? ' wild' : ''}`,
          key: idea.id || index,
        },
          h('div', { style: { display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' } },
            h('strong', null, idea.title),
            idea.id === meta.wildest ? h('span', { className: 'rw-tag' }, '最荒诞但可验证') : null,
          ),
          h('div', { className: 'rw-scores' },
            h('span', { className: 'rw-score' }, `荒诞 ${idea.scores?.absurdity ?? '—'}`),
            h('span', { className: 'rw-score' }, `新颖 ${idea.scores?.novelty ?? '—'}`),
            h('span', { className: 'rw-score' }, `可行 ${idea.scores?.feasibility ?? '—'}`),
            h('span', { className: 'rw-score' }, `可检验 ${idea.scores?.testability ?? '—'}`),
            h('span', { className: 'rw-score' }, `信息增益 ${idea.scores?.informationGain ?? '—'}`),
          ),
          h('div', { className: 'rw-p' }, h('strong', null, '命题：'), idea.claim),
          h('div', { className: 'rw-p' }, h('strong', null, '最小杀死测试：'), idea.cheapestTest),
          h('div', { className: 'rw-muted rw-small' }, h('strong', null, '证伪：'), idea.falsifier),
        ))),
        meta.artifact ? h(Artifacts, { artifacts: [{ label: '想法 JSON', path: meta.artifact.path }, { label: '想法 Markdown', path: meta.artifact.markdownPath }] }) : null,
      )
    }

    function DesignCard({ meta }) {
      const sample = meta.sample || {}
      const conditions = meta.conditions || []
      return h(Card, {
        icon: '设',
        title: '实验设计',
        subtitle: truncate(meta.hypothesis, 100),
        right: h('span', { className: 'rw-tag' }, meta.designType || ''),
      },
        h(StatGrid, { items: [
          { label: '总样本', value: fmt(sample.total || sample.n, 0), hint: sample.nPerGroup ? `每组 ${sample.nPerGroup}` : sample.method },
          { label: '检验力', value: fmt(meta.power, 2) },
          { label: 'alpha', value: fmt(meta.alpha, 2) },
          { label: '效应量', value: `${fmt(sample.effect)} ${sample.effectLabel || ''}` },
        ] }),
        h('div', { className: 'rw-small rw-muted' }, '检验力曲线'),
        h(PowerCurve, { points: meta.powerCurve }),
        conditions.length ? h('div', { style: { marginTop: 6 } },
          h('div', { className: 'rw-small rw-muted' }, '条件'),
          h('div', { className: 'rw-table-wrap' }, h('table', { className: 'rw-table' },
            h('thead', null, h('tr', null, h('th', null, '条件'), h('th', null, '说明'), h('th', null, 'n'))),
            h('tbody', null, ...conditions.map((condition, index) => h('tr', { key: index }, h('td', null, condition.name), h('td', { className: 'rw-muted' }, condition.description), h('td', null, fmt(condition.n, 0))))),
          )),
        ) : null,
        h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, '时间线'),
          ...(meta.timeline || []).map((item, index) => h('div', { key: index, className: 'rw-p rw-small' }, h('strong', null, `${item.phase}：`), item.task)),
        ),
        h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, '主要威胁'),
          ...(meta.threats || []).map((threat, index) => h('div', { className: 'rw-muted rw-small', key: index }, `· ${threat}`)),
        ),
        h('div', { className: 'rw-warn', style: { marginTop: 8 } }, h('strong', null, '证伪：'), meta.falsifier),
        meta.artifact ? h(Artifacts, { artifacts: [{ label: '设计 JSON', path: meta.artifact.path }, { label: '设计 Markdown', path: meta.artifact.markdownPath }] }) : null,
      )
    }

    function MeanBars({ groups }) {
      if (!groups?.length) return null
      const max = Math.max(...groups.map(group => Math.max(group.mean || 0, group.ci95?.[1] || 0)), 1)
      return h('div', { style: { display: 'grid', gap: 6, margin: '7px 0' } }, ...groups.map((group, index) => {
        const width = Math.max(2, ((group.mean || 0) / max) * 100)
        const low = group.ci95?.[0] ?? group.mean
        const high = group.ci95?.[1] ?? group.mean
        return h('div', { key: group.name || index, style: { display: 'grid', gridTemplateColumns: 'minmax(64px, 22%) 1fr 54px', gap: 6, alignItems: 'center', fontSize: 11 } },
          h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, group.name),
          h('div', { style: { position: 'relative', height: 10, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 99 } },
            h('div', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: `${width}%`, background: 'var(--dsw-alias-brand-primary)', borderRadius: 99 } }),
            h('div', { title: `95% CI [${fmt(low)}, ${fmt(high)}]`, style: { position: 'absolute', left: `${Math.max(0, (low / max) * 100)}%`, right: `${Math.max(0, 100 - (high / max) * 100)}%`, top: -2, bottom: -2, borderLeft: '1px solid var(--dsw-alias-state-idle-primary)', borderRight: '1px solid var(--dsw-alias-state-idle-primary)' } }),
          ),
          h('span', { className: 'rw-muted', style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, fmt(group.mean)),
        )
      }))
    }

    function StatsCard({ meta }) {
      const result = meta.result || {}
      const groups = meta.groups || []
      const effect = meta.effectSize
      return h(Card, {
        icon: '统',
        title: '统计分析',
        subtitle: result.test || meta.test,
        right: effect?.value !== undefined ? h('span', { className: 'rw-tag' }, `${effect.name} ${fmt(effect.value, 2)}`) : null,
      },
        h(StatGrid, { items: [
          { label: 'p', value: pvalue(meta.p) },
          { label: 'n', value: fmt(result.n, 0) },
          { label: 'df', value: fmt(meta.df, 2) },
          { label: '95% CI', value: result.ci95 ? `[${fmt(result.ci95[0])}, ${fmt(result.ci95[1])}]` : '—' },
        ] }),
        groups.length ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, '组间均值与 95% CI'),
          h(MeanBars, { groups }),
        ) : null,
        result.coefficients?.length ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, '回归系数'),
          h('div', { className: 'rw-table-wrap' }, h('table', { className: 'rw-table' },
            h('thead', null, h('tr', null, h('th', null, '项'), h('th', null, '估计'), h('th', null, 'SE'), h('th', null, 'p'), h('th', null, '95% CI'))),
            h('tbody', null, ...result.coefficients.map((coefficient, index) => h('tr', { key: index },
              h('td', null, coefficient.name),
              h('td', null, fmt(coefficient.estimate)),
              h('td', null, fmt(coefficient.se)),
              h('td', null, pvalue(coefficient.p)),
              h('td', { className: 'rw-muted' }, `[${fmt(coefficient.ci95?.[0])}, ${fmt(coefficient.ci95?.[1])}]`),
            ))),
          )),
        ) : null,
        h('div', { className: 'rw-muted rw-small', style: { marginTop: 8 } }, result.summary || meta.summary || ''),
        result.test === 'chi-square-independence' && result.lowExpectedCells ? h('div', { className: 'rw-warn' }, `有 ${result.lowExpectedCells} 个单元格期望频数 < 5；考虑精确检验或合并类别。`) : null,
        h('div', { className: 'rw-muted rw-small', style: { marginTop: 6 } }, '假设提醒：正态性/方差齐性/独立性与缺失机制仍需结合设计判断。'),
        meta.artifact ? h(Artifacts, { artifacts: [{ label: '统计结果', path: meta.artifact.path }] }) : null,
      )
    }

    function QualCard({ meta }) {
      const codes = meta.codes || []
      const matrix = meta.matrix
      const maxCell = matrix?.values ? Math.max(...matrix.values.flat(), 1) : 1
      return h(Card, {
        icon: '质',
        title: '质性编码',
        subtitle: meta.summary,
        right: h('span', { className: 'rw-tag' }, `覆盖 ${pct(meta.coverage)}`),
      },
        h(StatGrid, { items: [
          { label: '片段', value: fmt(meta.totalSegments, 0) },
          { label: '已编码', value: fmt(meta.codedSegments, 0) },
          { label: '未编码', value: fmt(meta.uncodedSegments, 0) },
          { label: '来源', value: fmt(meta.sources, 0) },
        ] }),
        codes.length ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, '代码频次'),
          h(Bars, { items: codes.map(code => ({ term: code.code, count: code.count })) }),
        ) : null,
        codes.length ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, '代表性引文'),
          ...codes.slice(0, 4).map(code => h('div', { key: code.code },
            h('div', { className: 'rw-small', style: { marginTop: 4 } }, code.code),
            h('div', { className: 'rw-quote' }, `「${truncate(code.quotes?.[0]?.text || '（暂无）', 220)}」`),
          )),
        ) : null,
        matrix?.labels?.length && matrix.values ? h('div', { style: { marginTop: 8 } },
          h('div', { className: 'rw-small rw-muted' }, '共现矩阵（前 8 个代码）'),
          h('div', { className: 'rw-scroll' },
            h('div', { className: 'rw-matrix', style: { gridTemplateColumns: `84px repeat(${matrix.labels.length}, minmax(24px, 1fr))` } },
              h('div', null),
              ...matrix.labels.map(label => h('div', { key: `h-${label}`, className: 'rw-muted', style: { fontSize: 9, textAlign: 'center', overflow: 'hidden' } }, label)),
              ...matrix.labels.flatMap((rowLabel, rowIndex) => [
                h('div', { key: `r-${rowLabel}`, className: 'rw-muted', style: { fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis' } }, rowLabel),
                ...matrix.values[rowIndex].map((value, columnIndex) => h('div', {
                  key: `${rowLabel}-${columnIndex}`,
                  className: 'rw-matrix-cell',
                  title: `${rowLabel} × ${matrix.labels[columnIndex]}: ${value}`,
                  style: { background: `color-mix(in srgb, var(--dsw-alias-brand-primary) ${Math.round((value / maxCell) * 55)}%, var(--dsw-alias-bg-layer-2))` },
                }, value || '')),
              ]),
            ),
          ),
        ) : null,
        h(Artifacts, { artifacts: [{ label: '编码结果', path: meta.artifact?.path }, { label: '片段 CSV', path: meta.artifact?.csvPath }] }),
      )
    }

    function DataCard({ meta }) {
      return h(Card, {
        icon: '数',
        title: meta.action === 'download' ? '数据下载' : '数据检查',
        subtitle: meta.relativePath,
        right: meta.bytes ? h('span', { className: 'rw-tag' }, `${(meta.bytes / 1024).toFixed(1)} KB`) : null,
      },
        meta.summary ? h('div', { className: 'rw-p' }, meta.summary) : null,
        h('div', { className: 'rw-chipline' },
          meta.headers?.length ? h('span', { className: 'rw-tag' }, `${meta.headers.length} 列`) : null,
          meta.rowCountPreview ? h('span', { className: 'rw-tag' }, `预览 ${meta.rowCountPreview} 行`) : null,
          meta.sha256 ? h('span', { className: 'rw-tag', title: meta.sha256 }, `SHA ${meta.sha256.slice(0, 8)}…`) : null,
        ),
        meta.headers?.length && meta.rows?.length ? h('div', { className: 'rw-table-wrap' },
          h('table', { className: 'rw-table' },
            h('thead', null, h('tr', null, ...meta.headers.slice(0, 8).map(header => h('th', { key: header }, header)))),
            h('tbody', null, ...meta.rows.slice(0, 8).map((row, index) => h('tr', { key: index }, ...meta.headers.slice(0, 8).map(header => h('td', { key: header, className: 'rw-muted' }, truncate(row[header], 32)))))),
          ),
        ) : null,
        meta.columns?.length ? h('div', { className: 'rw-chipline' }, ...meta.columns.slice(0, 8).map(column => h('span', { className: 'rw-tag', key: column.name, title: `${column.type} · missing ${column.missing}` }, `${column.name} · ${column.type}`))) : null,
        meta.preview && !meta.headers?.length ? h('pre', { className: 'rw-pre' }, truncate(meta.preview, 1800)) : null,
      )
    }

    function BoardCard({ meta }) {
      return h(Card, { icon: '览', title: '科研产物', subtitle: meta.workbench || 'research-output/' },
        meta.entries?.length ? h('div', { className: 'rw-scroll' }, ...meta.entries.map((entry, index) => h('div', { className: 'rw-p', key: `${entry.id}-${index}` },
          h('span', { className: 'rw-tag', style: { marginRight: 6 } }, entry.kind),
          h('strong', null, entry.title || entry.id),
          h('div', { className: 'rw-muted rw-small' }, entry.path || ''),
        ))) : h('div', { className: 'rw-muted' }, '还没有科研产物。'),
      )
    }

    function ResearchToolView(props) {
      const { phase, block, toolName } = props
      if (phase !== 'result') return h(RunningCard, { toolName, block })
      if (block?.isError) return h(ErrorCard, { block, toolName })
      const meta = block?.meta
      if (!meta || typeof meta !== 'object') return h(RawCard, { block, toolName })
      if (meta.card === 'lit') return h(LitCard, { meta, openFile: props.openFile })
      if (meta.card === 'idea') return h(IdeaCard, { meta })
      if (meta.card === 'design') return h(DesignCard, { meta })
      if (meta.card === 'stats') return h(StatsCard, { meta })
      if (meta.card === 'qual') return h(QualCard, { meta })
      if (meta.card === 'data') return h(DataCard, { meta })
      if (meta.card === 'board') return h(BoardCard, { meta })
      return h(RawCard, { block, toolName })
    }

    function ResearchDock(props) {
      const { t } = useT(props.ctx)
      const [collapsed, setCollapsed] = React.useState(false)
      const inputActions = props.inputActions
      const stages = [
        {
          key: 'question',
          prompt: '进入科研工作台第 1 步：定问题。请读我上面的研究兴趣，用 5 句话给出：1 个可检验主问题、1 个反事实、1 个最小贡献、1 个主要结局、1 个最可能失败的边界。如果信息不足，只问我一个最关键的问题。先不要检索。',
        },
        {
          key: 'lit',
          prompt: '进入科研工作台第 2 步：文献检索。沿用我上一轮的研究问题（若没有，先问我一句）。调用 research_lit，action="search"，sources 用 ["openalex","crossref"]，limit 15，年份按需要设置；然后只给我 5 条要点、3 个主题和 1 个下一步建议。',
        },
        {
          key: 'analyze',
          prompt: '进入科研工作台第 3 步：文献分析。用 research_lit action="analyze" 分析最近的检索结果（searchId 用上一次返回的 id），输出年份/主题/证据表/可检验空白，并把最值得追的 1 个空白讲清楚。',
        },
        {
          key: 'idea',
          prompt: '进入科研工作台第 4 步：头脑风暴。以我当前的研究问题为 seed，调用 research_idea，wildness=80，count=8；不要过滤荒诞想法。把最荒诞的那个改写成可证伪命题，并给出 24 小时内可做的杀死测试。',
        },
        {
          key: 'design',
          prompt: '进入科研工作台第 5 步：实验设计。把上一轮最值得做的想法作为 hypothesis，调用 research_design；默认 between、alpha=.05、power=.8、effectSize=.4。给我样本量、条件、检验力曲线、最大威胁和证伪条件。',
        },
        {
          key: 'data',
          prompt: '进入科研工作台第 6 步：数据。先问我数据 URL 或本地 CSV 路径；拿到后调用 research_data 下载/检查，报告行数、列、缺失和预览。不要编造数据。',
        },
        {
          key: 'stats',
          prompt: '进入科研工作台第 7 步：统计。先确认主要结局与设计；然后调用 research_stats（有 CSV 就传 path，没有就传 data）。优先报告效应量和 95% CI，再报告 p 值，并检查假设。',
        },
        {
          key: 'qual',
          prompt: '进入科研工作台第 8 步：质性分析。先问我文本或 CSV 路径；调用 research_qual 做编码，报告覆盖、代码频次、共现和代表性引文。把描述与解释分开。',
        },
        {
          key: 'review',
          prompt: '进入科研工作台第 9 步：综述。用 research_lit action="review" 基于当前检索记录生成综述初稿；给出结构、证据表和可编辑 Markdown 路径。提醒我哪些断言仍需回原文核对。',
        },
      ]
      const run = (stage, alt) => {
        if (!inputActions) return
        const prompt = stage.prompt
        try {
          inputActions.setDraft(prompt)
          if (!alt) window.setTimeout(() => { try { inputActions.submit() } catch {} }, 40)
        } catch {}
      }
      if (collapsed) {
        return h('div', { className: 'rw-dock', style: { padding: '6px 8px' } },
          applyThemeStyles(),
          h('button', { type: 'button', className: 'rw-pill', onClick: () => setCollapsed(false) }, `研 · ${t('dock.title')} ▸`),
        )
      }
      return h('div', { className: 'rw-dock' },
        applyThemeStyles(),
        h('div', { className: 'rw-dock-head' },
          h('span', { className: 'rw-dock-title' }, `研 · ${t('dock.title')}`),
          h('span', { className: 'rw-dock-badge' }, t('dock.badge')),
          h('span', { className: 'rw-dock-hint' }, t('dock.hint')),
          h('button', { type: 'button', className: 'rw-dock-collapse', onClick: () => setCollapsed(true), title: t('dock.collapse') }, '收起'),
        ),
        h('div', { className: 'rw-chips' }, ...stages.map((stage, index) => h('button', {
          type: 'button',
          className: 'rw-chip',
          key: stage.key,
          title: '点击直接执行；按住 Alt 只填入输入框',
          onClick: event => run(stage, event.altKey),
        },
          h('span', { className: 'rw-chip-step' }, String(index + 1)),
          h('span', null, t(`stage.${stage.key}`)),
        )),
          h('button', {
            type: 'button',
            className: 'rw-chip',
            key: 'board',
            title: '查看已经生成的科研产物',
            onClick: () => run({ prompt: '调用 research_board 列出最近的科研产物，按阶段分组；给我最近 5 个产物、路径和下一步建议。' }),
          },
            h('span', { className: 'rw-chip-step' }, '·'),
            h('span', null, t('dock.board')),
          ),
        ),
      )
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register('research-workbench', 'zh', DICT_ZH), 'research-workbench: zh locale')
      ctx.effect(() => ctx.locale.register('research-workbench', 'en', DICT_EN), 'research-workbench: en locale')

      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'research-workbench-dock',
        order: 25,
      }, props => h(ResearchDock, { ...props, ctx })))

      ctx.slots.inject('tool.call.toolview', () => {
        const names = ['research_lit', 'research_idea', 'research_design', 'research_stats', 'research_qual', 'research_data', 'research_board']
        const disposers = names.map(key => ctx.slots.register({
          name: 'tool.call.toolview',
          key,
        }, ResearchToolView))
        return () => disposers.forEach(dispose => { try { dispose() } catch {} })
      })
    }

    return {
      inject: ['slots', 'locale'],
      apply,
    }
  },
})
