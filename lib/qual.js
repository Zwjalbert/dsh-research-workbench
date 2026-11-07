import { clamp, toNumber, truncate } from './io.js'
import { autoCodebook, countMatches, matchesCode, sentenceSplit } from './text.js'

function normalizeCodebook(codebook) {
  if (!Array.isArray(codebook)) return []
  return codebook.map((entry, index) => {
    if (typeof entry === 'string') return { code: entry, keywords: [entry] }
    const code = String(entry?.code || entry?.name || `代码${index + 1}`).trim()
    const keywords = Array.isArray(entry?.keywords) && entry.keywords.length
      ? entry.keywords.map(keyword => String(keyword).trim()).filter(Boolean)
      : [code]
    return { code, keywords, definition: entry?.definition || '' }
  }).filter(entry => entry.code)
}

function textRowsFromCsv(rows, textColumn) {
  if (!Array.isArray(rows) || !rows.length) return []
  const headers = Object.keys(rows[0] || {})
  const column = textColumn && headers.includes(textColumn)
    ? textColumn
    : headers.find(header => {
      const values = rows.map(row => row[header]).filter(value => String(value ?? '').trim())
      const numeric = values.filter(value => toNumber(value) !== null).length
      return values.length > 0 && numeric / values.length < 0.5
    }) || headers[0]
  return rows.map((row, index) => ({
    source: String(row.id || row.ID || row.source || `row-${index + 1}`),
    text: String(row[column] ?? '').trim(),
  })).filter(row => row.text)
}

export function analyzeQualitative({ text, rows, codebook, textColumn, options = {} }) {
  const sourceRows = Array.isArray(rows) && rows.length
    ? textRowsFromCsv(rows, textColumn)
    : sentenceSplit(text || '').map((sentence, index) => ({ source: `doc-${index + 1}`, text: sentence }))
  if (!sourceRows.length) throw new Error('没有可编码的文本；请提供 text 或 CSV 路径')
  const segments = []
  for (const row of sourceRows) {
    const pieces = row.text.length > 900 ? sentenceSplit(row.text) : [row.text]
    for (const piece of pieces) {
      if (piece.trim()) segments.push({ source: row.source, text: piece.trim() })
    }
  }
  if (!segments.length) throw new Error('文本切分后为空')
  let codebookUsed = normalizeCodebook(codebook)
  if (!codebookUsed.length) codebookUsed = autoCodebook(segments.map(segment => segment.text), clamp(options.maxCodes ?? 8, 3, 16))
  if (!codebookUsed.length) throw new Error('无法自动生成编码本，请提供 codebook')
  const coded = segments.slice(0, 400).map((segment, index) => {
    const hits = codebookUsed
      .map(code => ({ code: code.code, matches: countMatches(segment.text, code.keywords) }))
      .filter(hit => hit.matches > 0)
    return {
      index: index + 1,
      source: segment.source,
      text: segment.text,
      codes: hits.map(hit => hit.code),
      matches: hits.reduce((sum, hit) => sum + hit.matches, 0),
    }
  })
  const codeStats = new Map()
  for (const code of codebookUsed) codeStats.set(code.code, { code: code.code, definition: code.definition || '', count: 0, sources: new Set(), quotes: [] })
  for (const segment of coded) {
    for (const code of segment.codes) {
      const stat = codeStats.get(code)
      if (!stat) continue
      stat.count++
      stat.sources.add(segment.source)
      if (stat.quotes.length < 2) stat.quotes.push({ text: truncate(segment.text, 260), source: segment.source })
    }
  }
  const codes = [...codeStats.values()]
    .map(stat => ({ ...stat, sourceCount: stat.sources.size, sources: [...stat.sources].slice(0, 8), coverage: coded.length ? stat.count / coded.length : 0 }))
    .sort((left, right) => right.count - left.count)
  const codeNames = codes.slice(0, 8).map(code => code.code)
  const matrix = codeNames.map(left => codeNames.map(right => {
    if (left === right) return 0
    return coded.filter(segment => segment.codes.includes(left) && segment.codes.includes(right)).length
  }))
  const cooccurrence = []
  for (let row = 0; row < codeNames.length; row++) {
    for (let column = row + 1; column < codeNames.length; column++) {
      if (matrix[row][column] > 0) cooccurrence.push({ a: codeNames[row], b: codeNames[column], count: matrix[row][column] })
    }
  }
  cooccurrence.sort((left, right) => right.count - left.count)
  const codedCount = coded.filter(segment => segment.codes.length > 0).length
  const uncoded = coded.length - codedCount
  return {
    codebook: codebookUsed,
    codes,
    segments: coded,
    matrix: { labels: codeNames, values: matrix },
    cooccurrence: cooccurrence.slice(0, 12),
    totalSegments: coded.length,
    codedSegments: codedCount,
    uncodedSegments: uncoded,
    coverage: coded.length ? codedCount / coded.length : 0,
    sources: new Set(coded.map(segment => segment.source)).size,
    summary: `${coded.length} 个文本片段，${codedCount} 个被编码（覆盖 ${Math.round((coded.length ? codedCount / coded.length : 0) * 100)}%）；${codes.length} 个代码。`,
    generatedAt: new Date().toISOString(),
  }
}

export function qualitativeMarkdown(result) {
  return [
    `质性编码完成：${result.summary}`,
    '',
    '代码频次：',
    ...result.codes.slice(0, 10).map(code => `- **${code.code}**：${code.count} 个片段，覆盖 ${code.sources.length} 个来源`),
    '',
    '代表性引文：',
    ...result.codes.slice(0, 4).map(code => `- ${code.code}：「${code.quotes[0]?.text || '（无引文）'}」`),
    '',
    '共现（前 5）：',
    ...(result.cooccurrence || []).slice(0, 5).map(pair => `- ${pair.a} × ${pair.b}：${pair.count}`),
  ].join('\n')
}
