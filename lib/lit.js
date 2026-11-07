import { clamp, mdCell, stripTags, truncate } from './io.js'
import { termCounts, topTermsFromRecords, words } from './text.js'

const USER_AGENT = 'dsh-research-workbench/0.1 (literature helper; local DSH plugin)'
const DEFAULT_TIMEOUT = 18_000

async function request(url, { timeout = DEFAULT_TIMEOUT, headers = {}, as = 'json' } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: as === 'json' ? 'application/json' : as === 'xml' ? 'application/atom+xml, application/xml, text/xml' : 'text/plain',
        ...headers,
      },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return as === 'json' ? await response.json() : await response.text()
  } finally {
    clearTimeout(timer)
  }
}

function yearOf(value) {
  const match = String(value || '').match(/(19|20)\d{2}/)
  return match ? Number(match[0]) : null
}

function normalizeDoi(value) {
  return String(value || '')
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .trim()
    .toLowerCase()
}

function titleKey(value) {
  return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function reconstructAbstract(inverted) {
  if (!inverted || typeof inverted !== 'object') return ''
  const positions = []
  for (const [word, indexes] of Object.entries(inverted)) {
    if (!Array.isArray(indexes)) continue
    for (const index of indexes) positions[Number(index)] = word
  }
  return positions.filter(Boolean).join(' ')
}

function baseRecord(source, raw) {
  return {
    source,
    sources: [source],
    sourceId: raw.sourceId || '',
    title: stripTags(raw.title || ''),
    abstract: truncate(stripTags(raw.abstract || ''), 2200),
    authors: Array.isArray(raw.authors) ? raw.authors.filter(Boolean).slice(0, 20) : [],
    year: Number.isFinite(raw.year) ? raw.year : yearOf(raw.date),
    date: raw.date || '',
    venue: raw.venue || '',
    doi: normalizeDoi(raw.doi),
    url: raw.url || '',
    citations: Number.isFinite(raw.citations) ? raw.citations : 0,
    type: raw.type || 'article',
    oa: Boolean(raw.oa),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(Boolean).slice(0, 12) : [],
  }
}

async function searchOpenAlex(query, limit, yearFrom, yearTo) {
  const params = new URLSearchParams({
    search: query,
    'per-page': String(Math.min(50, Math.max(limit, 10))),
    select: 'id,doi,title,display_name,publication_year,publication_date,authorships,primary_location,cited_by_count,type,open_access,abstract_inverted_index,keywords,is_retracted',
  })
  const filters = ['is_retracted:false']
  if (yearFrom) filters.push(`from_publication_date:${yearFrom}-01-01`)
  if (yearTo) filters.push(`to_publication_date:${yearTo}-12-31`)
  params.set('filter', filters.join(','))
  const json = await request(`https://api.openalex.org/works?${params}`)
  const items = Array.isArray(json.results) ? json.results : []
  return items.map(item => {
    const location = item.primary_location || {}
    const source = location.source || {}
    const doi = item.doi || ''
    return baseRecord('openalex', {
      sourceId: String(item.id || '').replace('https://openalex.org/', ''),
      title: item.display_name || item.title,
      abstract: reconstructAbstract(item.abstract_inverted_index),
      authors: (item.authorships || []).map(authorship => authorship.author?.display_name).filter(Boolean),
      year: item.publication_year,
      date: item.publication_date,
      venue: source.display_name || location.raw_source_name || '',
      doi,
      url: doi || item.id || '',
      citations: item.cited_by_count,
      type: item.type,
      oa: item.open_access?.is_oa === true,
      keywords: (item.keywords || []).map(keyword => keyword.display_name),
    })
  })
}

async function searchCrossref(query, limit, yearFrom, yearTo) {
  const params = new URLSearchParams({
    'query.bibliographic': query,
    rows: String(Math.min(40, Math.max(limit, 10))),
    select: 'DOI,title,author,published,container-title,is-referenced-by-count,type,abstract,URL,issued',
  })
  const filters = []
  if (yearFrom) filters.push(`from-pub-date:${yearFrom}-01-01`)
  if (yearTo) filters.push(`until-pub-date:${yearTo}-12-31`)
  if (filters.length) params.set('filter', filters.join(','))
  let json
  try {
    json = await request(`https://api.crossref.org/works?${params}`)
  } catch (error) {
    // Older Crossref deployments reject `select`; retry without it.
    if (!String(error?.message || '').includes('HTTP 400')) throw error
    params.delete('select')
    json = await request(`https://api.crossref.org/works?${params}`)
  }
  const items = json?.message?.items || []
  return items.map(item => {
    const date = item.published?.['date-parts']?.[0] || item.issued?.['date-parts']?.[0] || []
    return baseRecord('crossref', {
      sourceId: item.DOI || '',
      title: Array.isArray(item.title) ? item.title[0] : item.title,
      abstract: item.abstract || '',
      authors: (item.author || []).map(author => [author.given, author.family].filter(Boolean).join(' ')).filter(Boolean),
      year: date[0],
      date: date.filter(Boolean).join('-'),
      venue: Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'],
      doi: item.DOI,
      url: item.URL || '',
      citations: item['is-referenced-by-count'],
      type: item.type,
      oa: false,
    })
  })
}

async function searchPubMed(query, limit, yearFrom, yearTo) {
  const termParts = [query]
  if (yearFrom || yearTo) termParts.push(`${yearFrom || 1900}:${yearTo || 3000}[dp]`)
  const term = termParts.join(' AND ')
  const esearch = new URLSearchParams({ db: 'pubmed', term, retmode: 'json', retmax: String(Math.min(30, Math.max(limit, 10))), sort: 'relevance' })
  const search = await request(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${esearch}`)
  const ids = search?.esearchresult?.idlist || []
  if (!ids.length) return []
  const esummary = new URLSearchParams({ db: 'pubmed', id: ids.join(','), retmode: 'json' })
  const summary = await request(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?${esummary}`)
  const result = summary?.result || {}
  return ids.map(id => {
    const item = result[id]
    if (!item) return null
    const doi = (item.articleids || []).find(entry => entry.idtype === 'doi')?.value || ''
    return baseRecord('pubmed', {
      sourceId: id,
      title: item.title,
      abstract: '',
      authors: (item.authors || []).map(author => author.name).filter(Boolean),
      year: yearOf(item.pubdate),
      date: item.pubdate,
      venue: item.fulljournalname || item.source || '',
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      citations: 0,
      type: (item.pubtype || [])[0] || 'article',
      oa: false,
    })
  }).filter(Boolean)
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchArxiv(query, limit, yearFrom, yearTo) {
  const params = new URLSearchParams({
    search_query: `all:${query}`,
    start: '0',
    max_results: String(Math.min(30, Math.max(limit, 10))),
    sortBy: 'relevance',
    sortOrder: 'descending',
  })
  const xml = await request(`https://export.arxiv.org/api/query?${params}`, { as: 'xml' })
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(match => match[1])
  return entries.map(entry => {
    const title = decodeXml((entry.match(/<title>([\s\S]*?)<\/title>/) || [])[1])
    const abstract = decodeXml((entry.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1])
    const published = decodeXml((entry.match(/<published>([\s\S]*?)<\/published>/) || [])[1])
    const id = decodeXml((entry.match(/<id>([\s\S]*?)<\/id>/) || [])[1])
    const doiMatch = entry.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/)
    const authors = [...entry.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g)].map(match => decodeXml(match[1]))
    const journal = decodeXml((entry.match(/<arxiv:journal_ref[^>]*>([\s\S]*?)<\/arxiv:journal_ref>/) || [])[1])
    const year = yearOf(published)
    if (yearFrom && year && year < yearFrom) return null
    if (yearTo && year && year > yearTo) return null
    return baseRecord('arxiv', {
      sourceId: id,
      title,
      abstract,
      authors,
      year,
      date: published,
      venue: journal || 'arXiv',
      doi: doiMatch ? doiMatch[1] : '',
      url: id,
      citations: 0,
      type: 'preprint',
      oa: true,
      keywords: [...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map(match => match[1]),
    })
  }).filter(Boolean)
}

const SOURCE_FUNCS = {
  openalex: searchOpenAlex,
  crossref: searchCrossref,
  pubmed: searchPubMed,
  arxiv: searchArxiv,
}

function mergeRecord(existing, incoming) {
  existing.sources = [...new Set([...existing.sources, ...incoming.sources])]
  if ((incoming.abstract || '').length > (existing.abstract || '').length) existing.abstract = incoming.abstract
  if (!existing.venue && incoming.venue) existing.venue = incoming.venue
  if (!existing.doi && incoming.doi) existing.doi = incoming.doi
  if (!existing.url && incoming.url) existing.url = incoming.url
  if (!existing.year && incoming.year) existing.year = incoming.year
  if (incoming.citations > existing.citations) existing.citations = incoming.citations
  if (!existing.authors.length && incoming.authors.length) existing.authors = incoming.authors
  if (!existing.keywords.length && incoming.keywords.length) existing.keywords = incoming.keywords
  existing.oa = existing.oa || incoming.oa
  return existing
}

export function dedupeRecords(records) {
  const byDoi = new Map()
  const byTitle = new Map()
  const out = []
  for (const record of records) {
    if (!record?.title) continue
    const doi = normalizeDoi(record.doi)
    const key = titleKey(record.title)
    const existing = (doi && byDoi.get(doi)) || (key && byTitle.get(key))
    if (existing) {
      mergeRecord(existing, record)
      continue
    }
    out.push(record)
    if (doi) byDoi.set(doi, record)
    if (key) byTitle.set(key, record)
  }
  return out
}

function relevanceScore(record, queryTerms) {
  const title = String(record.title || '').toLowerCase()
  const abstract = String(record.abstract || '').toLowerCase()
  let matches = 0
  for (const term of queryTerms) {
    const needle = term.toLowerCase()
    if (title.includes(needle)) matches += 3
    else if (abstract.includes(needle)) matches += 1
  }
  const recency = record.year ? Math.max(0, 1 - (new Date().getFullYear() - record.year) / 25) : 0
  return matches * 10 + Math.log10((record.citations || 0) + 1) * 3 + recency * 2
}

export async function searchLiterature({ query, sources = ['openalex', 'crossref'], limit = 15, yearFrom, yearTo }) {
  const cleanQuery = String(query || '').trim()
  if (!cleanQuery) throw new Error('检索词不能为空')
  const cleanSources = [...new Set(sources.map(source => String(source).toLowerCase()))].filter(source => SOURCE_FUNCS[source])
  if (!cleanSources.length) throw new Error('没有可用的文献源')
  const count = clamp(limit, 5, 50)
  const settled = await Promise.allSettled(cleanSources.map(source => SOURCE_FUNCS[source](cleanQuery, count, Number(yearFrom) || null, Number(yearTo) || null)))
  const sourceCounts = {}
  const errors = []
  const records = []
  settled.forEach((result, index) => {
    const source = cleanSources[index]
    if (result.status === 'fulfilled') {
      sourceCounts[source] = result.value.length
      records.push(...result.value)
    } else {
      sourceCounts[source] = 0
      errors.push(`${source}: ${truncate(result.reason?.message || String(result.reason), 160)}`)
    }
  })
  if (!records.length) throw new Error(`检索没有返回结果${errors.length ? `（${errors.join('; ')}）` : ''}`)
  const queryTerms = words(cleanQuery).slice(0, 12)
  const deduped = dedupeRecords(records)
    .map(record => ({ ...record, relevance: Number(relevanceScore(record, queryTerms).toFixed(2)) }))
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, count)
  return { records: deduped, sourceCounts, errors, query: cleanQuery, sources: cleanSources }
}

export function screenRecords(records, { include = [], exclude = [], minYear, maxYear, minCitations = 0 } = {}) {
  const includeTerms = include.map(term => String(term).toLowerCase()).filter(Boolean)
  const excludeTerms = exclude.map(term => String(term).toLowerCase()).filter(Boolean)
  const kept = []
  const rejected = []
  for (const record of records) {
    const haystack = `${record.title} ${record.abstract} ${(record.keywords || []).join(' ')}`.toLowerCase()
    const missing = includeTerms.filter(term => !haystack.includes(term))
    const hitExclude = excludeTerms.find(term => haystack.includes(term))
    const year = record.year || 0
    let reason = ''
    if (missing.length) reason = `缺少纳入词：${missing.join(', ')}`
    else if (hitExclude) reason = `命中排除词：${hitExclude}`
    else if (minYear && year && year < Number(minYear)) reason = `早于 ${minYear}`
    else if (maxYear && year && year > Number(maxYear)) reason = `晚于 ${maxYear}`
    else if (Number(minCitations) && (record.citations || 0) < Number(minCitations)) reason = `引用数低于 ${minCitations}`
    if (reason) rejected.push({ title: record.title, year: record.year, reason })
    else kept.push(record)
  }
  return { kept, rejected, include, exclude }
}

export function analyzeRecords(records, query = '') {
  const years = new Map()
  const venues = new Map()
  const authors = new Map()
  const types = new Map()
  const citations = []
  let oaCount = 0
  for (const record of records) {
    if (record.year) years.set(record.year, (years.get(record.year) || 0) + 1)
    const venue = record.venue || '未标注'
    venues.set(venue, (venues.get(venue) || 0) + 1)
    for (const author of record.authors || []) authors.set(author, (authors.get(author) || 0) + 1)
    types.set(record.type || 'article', (types.get(record.type || 'article') || 0) + 1)
    if (Number.isFinite(record.citations)) citations.push(record.citations)
    if (record.oa) oaCount++
  }
  const sortedYears = [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }))
  const sortedVenues = [...venues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))
  const sortedAuthors = [...authors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))
  const sortedTypes = [...types.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
  const themes = topTermsFromRecords(records, 14)
  const now = new Date().getFullYear()
  const recent = records.filter(record => record.year && record.year >= now - 3)
  const older = records.filter(record => !record.year || record.year < now - 3)
  const recentShare = records.length ? recent.length / records.length : 0
  const citationStats = citations.length ? {
    n: citations.length,
    mean: citations.reduce((sum, value) => sum + value, 0) / citations.length,
    median: [...citations].sort((a, b) => a - b)[Math.floor(citations.length / 2)],
    max: Math.max(...citations),
    zeroShare: citations.filter(value => value === 0).length / citations.length,
  } : { n: 0, mean: 0, median: 0, max: 0, zeroShare: 0 }
  const topThemeNames = themes.slice(0, 6).map(theme => theme.term)
  const gaps = []
  if (topThemeNames.length >= 2) {
    const first = topThemeNames[0]
    const second = topThemeNames[1]
    const both = records.filter(record => `${record.title} ${record.abstract}`.toLowerCase().includes(first) && `${record.title} ${record.abstract}`.toLowerCase().includes(second)).length
    if (both <= Math.max(1, Math.round(records.length * 0.1))) {
      gaps.push(`「${first}」与「${second}」同时出现的文献仅 ${both} 篇，可检验交叉机制是否被低估。`)
    }
  }
  if (recentShare > 0.45) gaps.push(`近三年文献占 ${Math.round(recentShare * 100)}%，领域正在快速升温；适合做“新现象 + 旧理论”的对照验证。`)
  else gaps.push(`近三年文献仅占 ${Math.round(recentShare * 100)}%，可用近期数据检验旧结论是否仍然稳定。`)
  if (citationStats.zeroShare > 0.4) gaps.push(`零引用文献占 ${Math.round(citationStats.zeroShare * 100)}%，说明大量新工作尚未被整合；可做系统性证据地图而非只追随高引论文。`)
  if (records.length) gaps.push(`现有样本以 ${sortedTypes[0]?.name || 'article'} 为主；换一个人群、场景或测量方式即可构成最小增量贡献。`)
  const evidence = [...records]
    .sort((left, right) => (right.relevance || 0) + Math.log10((right.citations || 0) + 1) - ((left.relevance || 0) + Math.log10((left.citations || 0) + 1)))
    .slice(0, 10)
    .map(record => ({
      title: record.title,
      year: record.year,
      venue: record.venue,
      authors: (record.authors || []).slice(0, 3).join(', '),
      citations: record.citations,
      doi: record.doi,
      url: record.url,
      source: record.sources?.[0] || record.source,
      abstract: truncate(record.abstract, 240),
    }))
  return {
    query,
    total: records.length,
    years: sortedYears,
    venues: sortedVenues,
    authors: sortedAuthors,
    types: sortedTypes,
    themes,
    recentShare,
    oaShare: records.length ? oaCount / records.length : 0,
    citations: citationStats,
    gaps,
    evidence,
    generatedAt: new Date().toISOString(),
  }
}

function referenceLine(record, index) {
  const authors = (record.authors || []).slice(0, 6).join(', ') || 'Unknown authors'
  const year = record.year || 'n.d.'
  const venue = record.venue ? ` ${record.venue}.` : ''
  const doi = record.doi ? ` https://doi.org/${record.doi}` : record.url ? ` ${record.url}` : ''
  return `[${index + 1}] ${authors} (${year}). ${record.title}.${venue}${doi}`
}

export function buildReview({ records, analysis, topic, notes = '', style = 'narrative', wordLimit = 1800 }) {
  const top = records.slice(0, 18)
  const themes = (analysis?.themes || []).slice(0, 5)
  const citationsFor = term => top
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => `${record.title} ${record.abstract}`.toLowerCase().includes(String(term).toLowerCase()))
    .slice(0, 3)
    .map(({ index }) => `[${index + 1}]`)
    .join(' ')
  const sections = []
  sections.push({
    heading: '摘要',
    body: [
      `本文围绕“${topic}”检索并整合了 ${records.length} 条文献记录。当前证据集中在 ${themes.slice(0, 3).map(theme => theme.term).join('、') || '若干主题'}；本稿为结构化初稿，具体数字与因果表述需回到原文核对。`,
    ],
  })
  sections.push({
    heading: '1. 引言',
    body: [
      `“${topic}”的研究正在从概念辨析转向机制与边界条件检验。既有工作提供了 ${analysis?.total || records.length} 条可检索证据，但在测量、样本与情境上仍存在明显异质性。`,
      `本文的问题不是“是否有效”，而是“在什么条件下、通过什么机制、对谁有效”。`,
    ],
  })
  const sourceLabels = [...new Set(top.flatMap(record => record.sources?.length ? record.sources : [record.source]).filter(Boolean))]
  const sourceText = sourceLabels.length
    ? sourceLabels.map(source => ({ openalex: 'OpenAlex', crossref: 'Crossref', pubmed: 'PubMed', arxiv: 'arXiv' }[source] || source)).join('、')
    : '文献数据库'
  sections.push({
    heading: '2. 检索与纳入方法',
    body: [
      `检索主题：${topic}。检索来源：${sourceText}。`,
      `共获得 ${records.length} 条去重记录；以下综合按主题与证据强度组织，不追求穷尽。`,
      notes ? `补充笔记：${truncate(notes, 500)}` : '',
    ].filter(Boolean),
  })
  sections.push({
    heading: '3. 主题综合',
    body: themes.length ? themes.slice(0, 4).map(theme => {
      const cites = citationsFor(theme.term)
      return `**${theme.term}**（出现 ${theme.count} 次）。相关证据 ${cites || '尚需补充'} 表明该主题已成为领域内的可测量变量；下一步应区分其作为前因、机制还是结果的角色。`
    }) : [`当前记录不足以稳定聚类主题；建议扩大检索或补充摘要。`],
  })
  sections.push({
    heading: '4. 证据表',
    body: [top.slice(0, 10).map((record, index) => `| [${index + 1}] | ${mdCell(record.title, 80)} | ${record.year || ''} | ${mdCell(record.venue, 40)} | ${record.citations ?? ''} |`).join('\n')].map(table => `| # | 文献 | 年份 | 来源 | 引用 |\n|---|---|---|---|---|\n${table}`),
  })
  sections.push({
    heading: '5. 研究空白与可检验命题',
    body: (analysis?.gaps || []).slice(0, 4).map((gap, index) => `- **空白 ${index + 1}**：${gap}`),
  })
  sections.push({
    heading: '6. 研究议程',
    body: [
      `优先做一项可在 2–4 周内完成的最小研究：固定一个情境、一个操纵、一个主要结局；先报告效应量与置信区间，再讨论显著性。`,
      style === 'systematic' ? `系统综述模式：补全 PRISMA 流程图、双人筛选与偏倚评估。` : `叙事综述模式：以机制链条组织段落，避免逐篇罗列。`,
    ],
  })
  sections.push({
    heading: '参考文献',
    body: top.map((record, index) => referenceLine(record, index)),
  })
  const markdown = [
    `# ${topic}`,
    '',
    `> 结构化综述初稿 · 生成于 ${new Date().toISOString().slice(0, 10)} · 目标长度约 ${wordLimit} 字`,
    '',
    ...sections.flatMap(section => [`## ${section.heading}`, '', ...section.body, '']),
    '---',
    '> 引用完整性提示：本稿只使用检索结果中的条目；未核对的断言请标记为“待核”。',
  ].join('\n')
  return {
    topic,
    style,
    outline: sections.map(section => section.heading),
    sections,
    markdown,
    references: top.map((record, index) => referenceLine(record, index)),
    wordCount: markdown.replace(/[\s#>*|\-]/g, '').length,
    generatedAt: new Date().toISOString(),
  }
}

export function literatureMarkdown(result, action) {
  if (action === 'search' || action === 'screen') {
    const lines = [
      `文献${action === 'search' ? '检索' : '筛选'}完成：${result.query || ''}`,
      `记录数：${result.records?.length ?? 0}；来源：${Object.entries(result.sourceCounts || {}).map(([name, count]) => `${name} ${count}`).join('，')}`,
      '',
      '| # | 文献 | 年份 | 来源 | 引用 |',
      '|---|---|---|---|---|',
      ...(result.records || []).slice(0, 8).map((record, index) => `| ${index + 1} | ${mdCell(record.title, 70)} | ${record.year || ''} | ${mdCell(record.venue, 36)} | ${record.citations ?? ''} |`),
    ]
    if (result.errors?.length) lines.push('', `部分来源失败：${result.errors.join('；')}`)
    return lines.join('\n')
  }
  if (action === 'analyze') {
    const analysis = result.analysis || {}
    return [
      `文献分析：${result.query || ''}`,
      `年份范围：${analysis.years?.[0]?.year || '?'}–${analysis.years?.at(-1)?.year || '?'}；近三年占比：${Math.round((analysis.recentShare || 0) * 100)}%`,
      `主题：${(analysis.themes || []).slice(0, 8).map(theme => `${theme.term}(${theme.count})`).join('、')}`,
      `高引/高相关证据：`,
      ...(analysis.evidence || []).slice(0, 5).map((item, index) => `${index + 1}. ${item.title} (${item.year || 'n.d.'}) — ${item.venue || ''} — 引用 ${item.citations ?? 0}`),
      '',
      `可检验空白：`,
      ...(analysis.gaps || []).map(gap => `- ${gap}`),
    ].join('\n')
  }
  if (action === 'review') {
    return [
      `综述初稿已生成：${result.topic || ''}`,
      `结构：${(result.outline || []).join(' / ')}`,
      `字数（近似）：${result.wordCount || 0}`,
      '',
      '预览：',
      truncate(result.markdown, 1200),
      '',
      '完整文件路径见卡片。',
    ].join('\n')
  }
  return '文献工具完成'
}

export function searchSummaryMarkdown(records, limit = 5) {
  return records.slice(0, limit).map((record, index) => `${index + 1}. ${record.title} (${record.year || 'n.d.'}) — ${record.venue || '未标注'} — 引用 ${record.citations ?? 0}${record.doi ? ` — https://doi.org/${record.doi}` : ''}`).join('\n')
}

export function recordKeywords(records, limit = 12) {
  return termCounts(records.map(record => `${record.title} ${record.abstract}`), { limit }).map(item => item.term)
}
