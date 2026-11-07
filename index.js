import { join } from 'node:path'
import {
  WORKBENCH_DIR,
  addIndexEntry,
  clamp,
  displayPath,
  jsonSafe,
  listArtifacts,
  readCsvFile,
  readJson,
  resolveInside,
  timestampId,
  toCsv,
  toNumber,
  truncate,
  workbenchRoot,
  writeJson,
  writeText,
} from './lib/io.js'
import {
  analyzeRecords,
  buildReview,
  literatureMarkdown,
  screenRecords,
  searchLiterature,
} from './lib/lit.js'
import { generateIdeas, ideasMarkdown } from './lib/ideas.js'
import { designMarkdown, designStudy } from './lib/design.js'
import {
  formatNumber,
  formatP,
  runStats,
} from './lib/math.js'
import { analyzeQualitative, qualitativeMarkdown } from './lib/qual.js'
import { downloadData, inspectData } from './lib/data.js'

export const name = 'research-workbench'
export const inject = ['tools', 'systemPrompt']

const RESEARCH_PROMPT = `## Research workbench (fast path)

Use the \`research_*\` tools for research tasks. Prefer one tool call per step over long internal deliberation.

- Default loop: pick one stage → call one tool → show a 3–6 bullet synthesis → offer one next decision. Do not restate the full tool output.
- Literature: \`research_lit\`; one call can search, screen, analyze, or draft a review. Citations must come from returned records.
- Discussion/brainstorm: \`research_idea\`. Treat absurd ideas as candidates, never dismiss them: restate as a falsifiable claim, then give the cheapest kill test. Wildness is a parameter, not a failure.
- Design: \`research_design\`; report sample size, power, conditions, and the falsifier.
- Data: \`research_data\`; download or inspect first, then analyze.
- Statistics: \`research_stats\`; report effect size and 95% CI before p-values. Check assumptions.
- Qualitative: \`research_qual\`; code segments, show code frequency and representative quotes, and separate description from interpretation.
- Artifacts live under \`${WORKBENCH_DIR}/\` in the workspace. Mention the path when a file is produced.
- If a required input is missing, ask one short question; otherwise make a reasonable default and state it. Keep the user in the loop; do not run a long autonomous pipeline without a checkpoint.
- Never claim a download, analysis, or citation is verified unless the tool actually returned it.`

function cwdOf(exec) {
  return exec?.agent?.session?.header?.cwd || process.cwd()
}

function toolResult(value, meta) {
  return jsonSafe(value)
}

async function saveArtifact(cwd, kind, prefix, value, { ext = 'json', title = '', summary = '' } = {}) {
  const id = timestampId(prefix)
  const dir = join(workbenchRoot(cwd), kind)
  const file = join(dir, `${id}.${ext}`)
  if (ext === 'json') await writeJson(file, value)
  else await writeText(file, String(value))
  await addIndexEntry(cwd, {
    id,
    kind,
    title: title || prefix,
    summary: truncate(summary, 300),
    path: displayPath(cwd, file),
    format: ext,
  })
  return { id, file, relativePath: displayPath(cwd, file) }
}

async function saveJsonAndMarkdown(cwd, kind, prefix, value, markdown, { title = '', summary = '' } = {}) {
  const id = timestampId(prefix)
  const dir = join(workbenchRoot(cwd), kind)
  const jsonFile = join(dir, `${id}.json`)
  const mdFile = join(dir, `${id}.md`)
  await writeJson(jsonFile, { ...value, artifactId: id })
  await writeText(mdFile, markdown)
  await addIndexEntry(cwd, {
    id,
    kind,
    title: title || prefix,
    summary: truncate(summary, 300),
    path: displayPath(cwd, jsonFile),
    markdownPath: displayPath(cwd, mdFile),
    format: 'json+md',
  })
  return { id, jsonFile, mdFile, jsonPath: displayPath(cwd, jsonFile), markdownPath: displayPath(cwd, mdFile) }
}

function ensureId(id) {
  const value = String(id || '').trim()
  if (!/^[a-z0-9-]{6,80}$/i.test(value)) throw new Error('无效的记录 id')
  return value
}

async function loadSearch(cwd, searchId) {
  if (searchId) {
    const id = ensureId(searchId)
    const file = join(workbenchRoot(cwd), 'searches', `${id}.json`)
    const data = await readJson(file)
    if (!data) throw new Error(`找不到检索记录：${id}；请先执行 action="search"`)
    return { id, data, file }
  }
  const entries = await listArtifacts(cwd, 100)
  const latest = entries.find(entry => entry.kind === 'searches' || entry.kind === 'search')
  if (!latest) throw new Error('还没有检索记录；请先执行 action="search"')
  const file = resolveInside(cwd, latest.path)
  const data = await readJson(file)
  if (!data) throw new Error('最近的检索记录无法读取')
  return { id: latest.id, data, file }
}

function litMeta(action, result) {
  const records = (result.records || []).slice(0, 8).map(record => ({
    title: record.title,
    year: record.year,
    venue: record.venue,
    authors: (record.authors || []).slice(0, 4),
    citations: record.citations,
    doi: record.doi,
    url: record.url,
    sources: record.sources,
    oa: record.oa,
  }))
  const analysis = result.analysis ? {
    total: result.analysis.total,
    years: result.analysis.years,
    venues: result.analysis.venues?.slice(0, 6),
    themes: result.analysis.themes?.slice(0, 10),
    recentShare: result.analysis.recentShare,
    oaShare: result.analysis.oaShare,
    citations: result.analysis.citations,
    gaps: result.analysis.gaps,
    evidence: result.analysis.evidence?.slice(0, 6),
  } : undefined
  return {
    card: 'lit',
    action,
    title: action === 'search' ? '文献检索' : action === 'screen' ? '文献筛选' : action === 'analyze' ? '文献分析' : '综述初稿',
    query: result.query,
    searchId: result.searchId,
    count: result.count ?? result.records?.length,
    sourceCounts: result.sourceCounts,
    errors: result.errors,
    records,
    analysis,
    review: result.review ? {
      outline: result.review.outline,
      wordCount: result.review.wordCount,
      preview: truncate(result.review.markdown, 1400),
      references: result.review.references?.slice(0, 8),
    } : undefined,
    screening: result.screening,
    artifacts: result.artifacts,
    summary: result.summary,
  }
}

function ideaMeta(result) {
  return {
    card: 'idea',
    title: '头脑风暴',
    seed: result.seed,
    wildness: result.wildness,
    wildest: result.wildest,
    ideas: result.ideas,
    summary: result.summary,
    protocol: result.protocol,
    artifact: result.artifact,
  }
}

function designMeta(result) {
  return {
    card: 'design',
    title: '实验设计',
    hypothesis: result.hypothesis,
    designType: result.designType,
    alpha: result.alpha,
    power: result.power,
    sample: result.sample,
    conditions: result.conditions,
    primaryOutcome: result.primaryOutcome,
    secondaryOutcomes: result.secondaryOutcomes,
    powerCurve: result.powerCurve,
    threats: result.threats,
    timeline: result.timeline,
    falsifier: result.falsifier,
    artifact: result.artifact,
  }
}

function statsMeta(test, result, extra = {}) {
  return {
    card: 'stats',
    title: '统计分析',
    test,
    ...extra,
    result,
    summary: result.summary,
  }
}

function qualMeta(result) {
  return {
    card: 'qual',
    title: '质性编码',
    codes: result.codes?.slice(0, 10),
    matrix: result.matrix,
    cooccurrence: result.cooccurrence?.slice(0, 8),
    totalSegments: result.totalSegments,
    codedSegments: result.codedSegments,
    uncodedSegments: result.uncodedSegments,
    coverage: result.coverage,
    sources: result.sources,
    summary: result.summary,
    artifact: result.artifact,
  }
}

function dataMeta(result) {
  return {
    card: 'data',
    title: '数据',
    action: result.action,
    relativePath: result.relativePath,
    bytes: result.bytes,
    sha256: result.sha256,
    contentType: result.contentType,
    sourceUrl: result.sourceUrl,
    previewKind: result.previewKind,
    headers: result.headers,
    columns: result.columns,
    rows: result.rows,
    rowCountPreview: result.rowCountPreview,
    preview: result.preview,
    size: result.size,
    summary: result.summary,
  }
}

function litRender(result, action) {
  return [{ type: 'text', text: literatureMarkdown(result, action) }]
}

function statsMarkdown(result) {
  const lines = [`统计方法：${result.test}`]
  if (result.test === 'descriptive') {
    if (result.groups) {
      lines.push('', '| 组 | n | 均值 | SD | 95% CI |', '|---|---|---|---|---|')
      for (const group of result.groups) lines.push(`| ${group.name} | ${group.n} | ${formatNumber(group.mean)} | ${formatNumber(group.sd)} | [${formatNumber(group.ci95?.[0])}, ${formatNumber(group.ci95?.[1])}] |`)
    } else if (result.columns) {
      lines.push('', '| 变量 | n | 均值 | SD | 中位数 |', '|---|---|---|---|---|')
      for (const column of result.columns) lines.push(`| ${column.name} | ${column.n} | ${formatNumber(column.mean)} | ${formatNumber(column.sd)} | ${formatNumber(column.median)} |`)
    }
    return lines.join('\n')
  }
  if (result.test?.includes('t')) {
    lines.push(
      `均值差 = ${formatNumber(result.meanDifference)}，95% CI [${formatNumber(result.ci95?.[0])}, ${formatNumber(result.ci95?.[1])}]`,
      `t(${formatNumber(result.df, 2)}) = ${formatNumber(result.t, 2)}，p = ${formatP(result.p)}`,
      `效应量 ${result.effectSize?.name} = ${formatNumber(result.effectSize?.value, 2)}${result.effectSize?.hedgesG !== undefined ? `；Hedges g = ${formatNumber(result.effectSize.hedgesG, 2)}` : ''}`,
    )
    return lines.join('\n')
  }
  if (result.test === 'one-way-anova') {
    lines.push(
      `F(${result.dfBetween}, ${result.dfWithin}) = ${formatNumber(result.f, 2)}，p = ${formatP(result.p)}`,
      `η² = ${formatNumber(result.effectSize?.value, 3)}；ω² = ${formatNumber(result.effectSize?.omegaSquared, 3)}`,
      '',
      '| 组 | n | 均值 | SD |',
      '|---|---|---|---|',
      ...(result.groups || []).map(group => `| ${group.name} | ${group.n} | ${formatNumber(group.mean)} | ${formatNumber(group.sd)} |`),
    )
    return lines.join('\n')
  }
  if (result.test === 'chi-square-independence') {
    return [
      `χ²(${result.df}) = ${formatNumber(result.chi2, 2)}，p = ${formatP(result.p)}`,
      `Cramér's V = ${formatNumber(result.effectSize?.value, 3)}；最小期望频数 = ${formatNumber(result.minExpected, 2)}`,
      result.lowExpectedCells ? `注意：${result.lowExpectedCells} 个单元格期望频数 < 5。` : '期望频数检查通过。',
    ].join('\n')
  }
  if (result.test?.includes('correlation')) {
    return [
      `${result.method === 'spearman' ? 'Spearman' : 'Pearson'} r = ${formatNumber(result.r, 3)}，95% CI [${formatNumber(result.ci95?.[0], 3)}, ${formatNumber(result.ci95?.[1], 3)}]`,
      `t(${result.df}) = ${formatNumber(result.t, 2)}，p = ${formatP(result.p)}；n = ${result.n}`,
    ].join('\n')
  }
  if (result.test === 'ols-regression') {
    return [
      `R² = ${formatNumber(result.r2, 3)}；调整 R² = ${formatNumber(result.adjustedR2, 3)}；F(${result.dfModel}, ${result.dfResidual}) = ${formatNumber(result.f, 2)}，p = ${formatP(result.p)}`,
      '',
      '| 项 | 估计 | SE | t | p | 95% CI |',
      '|---|---|---|---|---|---|',
      ...(result.coefficients || []).map(coefficient => `| ${coefficient.name} | ${formatNumber(coefficient.estimate)} | ${formatNumber(coefficient.se)} | ${formatNumber(coefficient.t, 2)} | ${formatP(coefficient.p)} | [${formatNumber(coefficient.ci95?.[0])}, ${formatNumber(coefficient.ci95?.[1])}] |`),
    ].join('\n')
  }
  return JSON.stringify(result, null, 2)
}

function normalizeStatsData(args) {
  if (args.data && typeof args.data === 'object') {
    if (Array.isArray(args.data.groups) || args.data.columns || args.data.table || Array.isArray(args.data.rows)) {
      if (Array.isArray(args.data.rows)) {
        return rowsToStatsData(args.data.rows, args.options || {})
      }
      return args.data
    }
  }
  if (args.path) {
    // The caller cannot await here; this branch is replaced by loadStatsInput.
  }
  return args.data
}

function rowsToStatsData(rows, options) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('数据为空')
  const headers = Object.keys(rows[0] || {})
  if (options.groupColumn && options.outcomeColumn) {
    const groups = new Map()
    for (const row of rows) {
      const group = String(row[options.groupColumn] ?? '未分组')
      const value = toNumber(row[options.outcomeColumn])
      if (value === null) continue
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group).push(value)
    }
    return { groups: [...groups.entries()].map(([name, values]) => ({ name, values })) }
  }
  const columns = {}
  for (const header of headers) {
    const values = rows.map(row => toNumber(row[header]))
    if (values.filter(value => value !== null).length >= Math.max(2, rows.length * 0.5)) columns[header] = values
  }
  if (!Object.keys(columns).length) throw new Error('没有识别到数值列')
  return { columns }
}

async function loadStatsData(args, cwd) {
  if (args.path) {
    const file = resolveInside(cwd, args.path)
    const parsed = await readCsvFile(file)
    return rowsToStatsData(parsed.rows, args.options || {})
  }
  return normalizeStatsData(args)
}

function statsExtra(result) {
  const groups = result.groups
    ? (Array.isArray(result.groups) ? result.groups : Object.entries(result.groups).map(([name, value]) => ({ name, ...value })))
    : result.columns || []
  return {
    groups: groups.map(group => ({
      name: group.name,
      n: group.n,
      mean: group.mean,
      sd: group.sd,
      ci95: group.ci95,
    })),
    labels: result.labels,
    effectSize: result.effectSize,
    p: result.p,
    df: result.df,
    r: result.r,
    r2: result.r2,
    coefficients: result.coefficients,
  }
}

function makeTool(def) {
  return {
    name: def.name,
    description: def.description,
    parameters: def.parameters,
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => def.render(value),
      presentationMeta: (_args, value) => def.meta(value),
    },
    async execute(args, exec) {
      return jsonSafe(await def.execute(args, exec))
    },
  }
}

function parseJsonArg(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { throw new Error('JSON 参数格式错误') }
  }
  return value
}

export function apply(ctx) {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'research-workbench:fast-path',
    order: 62,
    text: RESEARCH_PROMPT,
  }), 'research-workbench: prompt section')

  const registerTool = tool => ctx.effect(
    () => ctx.tools.register(tool),
    `research-workbench: tool ${tool.name}`,
  )

  registerTool(makeTool({
    name: 'research_lit',
    description: 'Literature pipeline: search OpenAlex/Crossref/PubMed/arXiv, screen records, analyze metadata/themes/gaps, or draft a cited review scaffold. One call per stage. Results are saved under research-workbench/.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: { type: 'string', enum: ['search', 'screen', 'analyze', 'review'], description: 'Stage to run.' },
        query: { type: 'string', description: 'Search query (for action=search) or topic label.' },
        searchId: { type: 'string', description: 'Search artifact id from a previous call; omit to use the latest search.' },
        sources: { type: 'array', items: { type: 'string', enum: ['openalex', 'crossref', 'pubmed', 'arxiv'] }, description: 'Sources; default openalex+crossref for speed.' },
        limit: { type: 'number', description: 'Records to keep, 5-50.' },
        yearFrom: { type: 'number', description: 'Earliest publication year.' },
        yearTo: { type: 'number', description: 'Latest publication year.' },
        include: { type: 'array', items: { type: 'string' }, description: 'Screen: required terms.' },
        exclude: { type: 'array', items: { type: 'string' }, description: 'Screen: excluded terms.' },
        minCitations: { type: 'number', description: 'Screen: minimum citation count.' },
        topic: { type: 'string', description: 'Review topic.' },
        notes: { type: 'string', description: 'Review notes or angle.' },
        style: { type: 'string', enum: ['narrative', 'systematic', 'scoping'], description: 'Review style.' },
        wordLimit: { type: 'number', description: 'Approximate target length.' },
      },
      required: ['action'],
    },
    async execute(args, exec) {
      const cwd = cwdOf(exec)
      const action = args.action
      if (action === 'search') {
        const found = await searchLiterature({
          query: args.query,
          sources: args.sources || ['openalex', 'crossref'],
          limit: args.limit || 15,
          yearFrom: args.yearFrom,
          yearTo: args.yearTo,
        })
        const record = {
          query: found.query,
          sources: found.sources,
          sourceCounts: found.sourceCounts,
          errors: found.errors,
          records: found.records,
          createdAt: new Date().toISOString(),
        }
        const artifact = await saveArtifact(cwd, 'searches', 'lit', record, {
          title: `检索：${found.query}`,
          summary: `${found.records.length} 条记录`,
        })
        // Make the generated id match the artifact id so follow-up calls use it.
        const searchId = artifact.id
        const stored = { ...record, id: searchId }
        await writeJson(artifact.file, stored)
        return {
          ok: true,
          action,
          searchId,
          query: found.query,
          sources: found.sources,
          sourceCounts: found.sourceCounts,
          errors: found.errors,
          count: found.records.length,
          records: found.records,
          summary: `检索到 ${found.records.length} 条去重记录；${Object.entries(found.sourceCounts).map(([source, count]) => `${source} ${count}`).join('，')}。`,
          artifacts: [{ label: '检索结果', path: artifact.relativePath }],
        }
      }
      const loaded = await loadSearch(cwd, args.searchId)
      const search = loaded.data
      if (action === 'screen') {
        const screening = screenRecords(search.records || [], {
          include: args.include || [],
          exclude: args.exclude || [],
          minYear: args.yearFrom,
          maxYear: args.yearTo,
          minCitations: args.minCitations || 0,
        })
        const artifact = await saveArtifact(cwd, 'searches', 'screen', {
          query: search.query,
          sources: search.sources,
          sourceCounts: search.sourceCounts,
          errors: [],
          records: screening.kept,
          screening: { include: args.include || [], exclude: args.exclude || [], rejected: screening.rejected },
          createdAt: new Date().toISOString(),
        }, { title: `筛选：${search.query}`, summary: `保留 ${screening.kept.length} 条` })
        return {
          ok: true,
          action,
          searchId: artifact.id,
          sourceSearchId: loaded.id,
          query: search.query,
          records: screening.kept,
          count: screening.kept.length,
          screening: { include: screening.include, exclude: screening.exclude, rejected: screening.rejected.slice(0, 12), rejectedCount: screening.rejected.length },
          summary: `筛选后保留 ${screening.kept.length} 条（排除 ${screening.rejected.length} 条）。`,
          artifacts: [{ label: '筛选结果', path: artifact.relativePath }],
        }
      }
      if (action === 'analyze') {
        const analysis = analyzeRecords(search.records || [], search.query)
        const artifact = await saveJsonAndMarkdown(cwd, 'analysis', 'analysis', { searchId: loaded.id, ...analysis }, [
          `# 文献分析：${search.query}`,
          '',
          `- 记录数：${analysis.total}`,
          `- 近三年占比：${Math.round(analysis.recentShare * 100)}%`,
          `- 开放获取：${Math.round(analysis.oaShare * 100)}%`,
          '',
          '## 主题',
          ...analysis.themes.map(theme => `- ${theme.term}（${theme.count}）`),
          '',
          '## 可检验空白',
          ...analysis.gaps.map(gap => `- ${gap}`),
          '',
          '## 证据表',
          ...analysis.evidence.map((item, index) => `${index + 1}. ${item.title} (${item.year || 'n.d.'}) — ${item.venue || ''} — 引用 ${item.citations ?? 0}`),
        ].join('\n'), { title: `分析：${search.query}`, summary: `${analysis.total} 条；${analysis.gaps[0] || ''}` })
        return {
          ok: true,
          action,
          searchId: loaded.id,
          query: search.query,
          count: search.records.length,
          records: search.records,
          analysis,
          summary: `分析完成：${analysis.total} 条；近三年 ${Math.round(analysis.recentShare * 100)}%；${analysis.gaps[0] || ''}`,
          artifacts: [{ label: '分析 JSON', path: artifact.jsonPath }, { label: '分析报告', path: artifact.markdownPath }],
          artifactId: artifact.id,
        }
      }
      if (action === 'review') {
        const analysis = analyzeRecords(search.records || [], args.topic || search.query)
        const review = buildReview({
          records: search.records || [],
          analysis,
          topic: args.topic || search.query,
          notes: args.notes || '',
          style: args.style || 'narrative',
          wordLimit: args.wordLimit || 1800,
        })
        const artifact = await saveJsonAndMarkdown(cwd, 'reviews', 'review', {
          searchId: loaded.id,
          query: search.query,
          analysis,
          review,
          createdAt: new Date().toISOString(),
        }, review.markdown, { title: `综述：${review.topic}`, summary: `${review.wordCount} 字，${review.references.length} 条参考文献` })
        return {
          ok: true,
          action,
          searchId: loaded.id,
          query: search.query,
          count: search.records.length,
          records: search.records,
          analysis,
          review,
          topic: review.topic,
          outline: review.outline,
          sections: review.sections,
          markdown: review.markdown,
          references: review.references,
          wordCount: review.wordCount,
          summary: `综述初稿完成：${review.outline.join(' / ')}；约 ${review.wordCount} 字。`,
          artifacts: [{ label: '综述包（JSON）', path: artifact.jsonPath }, { label: '综述正文（Markdown）', path: artifact.markdownPath }],
        }
      }
      throw new Error(`未知 action：${action}`)
    },
    render: value => litRender(value, value.action),
    meta: value => litMeta(value.action, value),
  }))

  registerTool(makeTool({
    name: 'research_idea',
    description: 'Generate falsifiable research ideas from a seed, including deliberately absurd ideas. Every idea gets a claim, cheapest kill test, falsifier, and novelty/feasibility/absurdity scores.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        seed: { type: 'string', description: 'Research seed: phenomenon, question, or absurd idea. Keep it verbatim.' },
        count: { type: 'number', description: '4-12 ideas; default 8.' },
        wildness: { type: 'number', description: '0-100; higher means more absurd but still testable.' },
        constraints: { type: 'string', description: 'Real-world constraints, resources, ethics.' },
        domain: { type: 'string', description: 'Optional domain label.' },
      },
      required: ['seed'],
    },
    async execute(args, exec) {
      const cwd = cwdOf(exec)
      const result = generateIdeas({
        seed: args.seed,
        count: args.count,
        wildness: args.wildness,
        constraints: args.constraints,
        domain: args.domain,
      })
      const artifact = await saveJsonAndMarkdown(cwd, 'ideas', 'ideas', result, ideasMarkdown(result), {
        title: `头脑风暴：${result.seed}`,
        summary: result.summary,
      })
      return { ...result, artifact: { id: artifact.id, path: artifact.jsonPath, markdownPath: artifact.markdownPath } }
    },
    render: value => [{ type: 'text', text: ideasMarkdown(value) }],
    meta: value => ideaMeta(value),
  }))

  registerTool(makeTool({
    name: 'research_design',
    description: 'Turn a hypothesis into a runnable design: sample-size/power calculation, conditions, randomization, analysis plan, threats, timeline, and a preregistration draft.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        hypothesis: { type: 'string', description: 'Falsifiable hypothesis.' },
        options: {
          type: 'object',
          additionalProperties: true,
          description: 'designType (between|within|paired|anova|correlation|mixed|qualitative), effectSize, correlation, alpha, power, groups, primaryOutcome, secondaryOutcomes, manipulation, smallestMeaningfulEffect, falsifier, risk.',
        },
      },
      required: ['hypothesis'],
    },
    async execute(args, exec) {
      const cwd = cwdOf(exec)
      const options = parseJsonArg(args.options, {})
      const result = designStudy({ hypothesis: args.hypothesis, options })
      const markdown = designMarkdown(result)
      const artifact = await saveJsonAndMarkdown(cwd, 'designs', 'design', result, markdown, {
        title: `设计：${truncate(result.hypothesis, 80)}`,
        summary: `${result.sample.total || result.sample.n} 样本；${result.designType}`,
      })
      return { ...result, artifact: { id: artifact.id, path: artifact.jsonPath, markdownPath: artifact.markdownPath } }
    },
    render: value => [{ type: 'text', text: designMarkdown(value) }],
    meta: value => designMeta(value),
  }))

  registerTool(makeTool({
    name: 'research_stats',
    description: 'Run descriptive statistics, t-test, one-way ANOVA, chi-square, Pearson/Spearman correlation, or OLS regression. Returns effect sizes and 95% CIs; accepts inline data or a CSV path.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        test: { type: 'string', enum: ['describe', 'ttest', 'anova', 'chi2', 'correlation', 'regression'], description: 'Statistical test.' },
        data: {
          type: 'object',
          additionalProperties: true,
          description: 'Either {groups:[{name,values}]}, {columns:{name:[...]}}, {table:[[...]]}, or {rows:[...]}.',
        },
        path: { type: 'string', description: 'CSV path relative to the workspace; alternative to data.' },
        options: {
          type: 'object',
          additionalProperties: true,
          description: 'paired, equalVar, alpha, method (pearson|spearman), x, y, outcome, predictors, groupColumn, outcomeColumn.',
        },
      },
      required: ['test'],
    },
    async execute(args, exec) {
      const cwd = cwdOf(exec)
      const options = parseJsonArg(args.options, {})
      const data = await loadStatsData(args, cwd)
      if (!data) throw new Error('请提供 data 或 path')
      const result = runStats(args.test, data, options)
      const artifact = await saveArtifact(cwd, 'stats', 'stats', { test: args.test, options, data, result, createdAt: new Date().toISOString() }, {
        title: `统计：${args.test}`,
        summary: result.test,
      })
      return {
        ...result,
        ok: true,
        requestedTest: args.test,
        summary: `${result.test} 完成`,
        artifact: { id: artifact.id, path: artifact.relativePath },
      }
    },
    render: value => [{ type: 'text', text: statsMarkdown(value) }],
    meta: value => statsMeta(value.test, value, statsExtra(value)),
  }))

  registerTool(makeTool({
    name: 'research_qual',
    description: 'Qualitative coding. Split text or CSV rows into segments, match a codebook (or auto-generate codes), and return code frequencies, co-occurrence, coverage, and representative quotes. No interpretation is invented.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string', description: 'Raw text; sentences become segments.' },
        path: { type: 'string', description: 'CSV path relative to workspace; each row is a document/segment.' },
        codebook: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              code: { type: 'string' },
              keywords: { type: 'array', items: { type: 'string' } },
              definition: { type: 'string' },
            },
          },
          description: 'Optional codebook. Omit to auto-generate codes from frequent terms.',
        },
        textColumn: { type: 'string', description: 'CSV text column; default is the first non-numeric column.' },
        options: { type: 'object', additionalProperties: true, description: 'maxCodes (auto codebook size).' },
      },
    },
    async execute(args, exec) {
      const cwd = cwdOf(exec)
      let rows
      if (args.path) {
        const parsed = await readCsvFile(resolveInside(cwd, args.path))
        rows = parsed.rows
      }
      const result = analyzeQualitative({
        text: args.text,
        rows,
        codebook: parseJsonArg(args.codebook, []),
        textColumn: args.textColumn,
        options: parseJsonArg(args.options, {}),
      })
      const id = timestampId('qual')
      const jsonFile = join(workbenchRoot(cwd), 'qual', `${id}.json`)
      const csvFile = join(workbenchRoot(cwd), 'qual', `${id}-segments.csv`)
      await writeJson(jsonFile, { ...result, id })
      await writeText(csvFile, toCsv(['source', 'codes', 'text'], result.segments.map(segment => ({ source: segment.source, codes: segment.codes.join('|'), text: segment.text }))))
      await addIndexEntry(cwd, {
        id,
        kind: 'qual',
        title: '质性编码',
        summary: result.summary,
        path: displayPath(cwd, jsonFile),
        csvPath: displayPath(cwd, csvFile),
      })
      return {
        ...result,
        artifact: { id, path: displayPath(cwd, jsonFile), csvPath: displayPath(cwd, csvFile) },
      }
    },
    render: value => [{ type: 'text', text: qualitativeMarkdown(value) }],
    meta: value => qualMeta(value),
  }))

  registerTool(makeTool({
    name: 'research_data',
    description: 'Download a public dataset (CSV/TSV/JSON/text/binary, max 80 MB) into research-output/data, or inspect a local CSV/JSON file. Returns checksum, columns, and preview.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: { type: 'string', enum: ['download', 'inspect'], description: 'Download a URL or inspect a local path.' },
        url: { type: 'string', description: 'http(s) URL for action=download.' },
        filename: { type: 'string', description: 'Optional output filename.' },
        path: { type: 'string', description: 'Workspace-relative path for action=inspect.' },
      },
      required: ['action'],
    },
    async execute(args, exec) {
      const cwd = cwdOf(exec)
      if (args.action === 'download') {
        if (!args.url) throw new Error('action=download 需要 url')
        const result = await downloadData({ url: args.url, filename: args.filename, cwd })
        await addIndexEntry(cwd, {
          id: timestampId('data'),
          kind: 'data',
          title: `数据：${result.relativePath.split('/').pop()}`,
          summary: `${result.bytes} bytes`,
          path: result.relativePath,
        })
        return { ...result, action: 'download', summary: `已下载 ${result.relativePath}（${result.bytes} bytes）。` }
      }
      const result = await inspectData({ path: args.path, cwd })
      return { ...result, action: 'inspect', summary: `已检查 ${result.relativePath}。` }
    },
    render: value => [{
      type: 'text',
      text: value.action === 'download'
        ? `已下载：${value.relativePath}\n大小：${value.bytes} bytes\nSHA-256：${value.sha256}\n来源：${value.sourceUrl}\n${value.headers?.length ? `列：${value.headers.join(', ')}` : ''}`
        : `已检查：${value.relativePath}\n${value.headers?.length ? `列：${value.headers.join(', ')}` : ''}\n${truncate(value.preview, 600)}`,
    }],
    meta: value => dataMeta(value),
  }))

  registerTool(makeTool({
    name: 'research_board',
    description: 'List the current research artifacts and their paths. Use it to recover state after a long discussion or before drafting.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        limit: { type: 'number', description: 'Number of recent artifacts; default 20.' },
      },
    },
    async execute(args, exec) {
      const cwd = cwdOf(exec)
      const entries = await listArtifacts(cwd, clamp(args.limit || 20, 1, 100))
      return {
        ok: true,
        cwd,
        workbench: displayPath(cwd, workbenchRoot(cwd)),
        entries,
        summary: entries.length ? `共 ${entries.length} 个近期产物；最新：${entries[0].title}` : '还没有科研产物。',
      }
    },
    render: value => [{
      type: 'text',
      text: value.entries.length
        ? `科研产物（${value.entries.length}）：\n${value.entries.map(entry => `- [${entry.kind}] ${entry.title} — ${entry.path}`).join('\n')}`
        : '还没有科研产物。',
    }],
    meta: value => ({ card: 'board', title: '科研产物', entries: value.entries, workbench: value.workbench, summary: value.summary }),
  }))
}
