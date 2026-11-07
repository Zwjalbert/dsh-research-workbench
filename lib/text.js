const LATIN_STOP = new Set(`a an the and or but if then than that this these those of in on for to from with without within by as at is are was were be been being it its we our you your they their he she his her not no nor so such can could may might will would should do does did have has had into over under about across between among during before after above below up down out off again further once here there when where why how all any both each few more most other some only own same too very just also using use used study studies research paper article results result method methods approach approaches analysis analyses data model models based new novel however therefore thus although while because through via`.split(/\s+/))
const CJK_STOP = new Set('的了和与及或在是对为从中把被将而及其这那有也就可以进行一个一种我们你们他们它们这个那个以及通过基于方法研究分析结果问题数据模型影响作用关系发展如今目前例如比如因此但是然而如果因为所以并且其中对于关于不同主要相关显著发现表明具有没有不能可以能够'.split(''))

const CJK_RUN = /[\u3400-\u9fff]+/g
const LATIN_WORD = /[A-Za-z][A-Za-z0-9'’-]{1,}/g

export function normalizeSpace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

export function truncate(text, length = 600) {
  const value = normalizeSpace(text)
  return value.length > length ? `${value.slice(0, Math.max(0, length - 1))}…` : value
}

export function stripMarkup(text) {
  return normalizeSpace(String(text || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' '))
}

export function sentenceSplit(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim()
  if (!normalized) return []
  const raw = normalized
    .split(/(?<=[。！？!?；;])\s*|(?<=\.)\s+(?=[A-Z0-9"“])|\n+/u)
    .map(item => item.trim())
    .filter(Boolean)
  const sentences = []
  for (const item of raw) {
    if (item.length <= 260) {
      sentences.push(item)
      continue
    }
    // Split very long paragraphs on commas so coding stays local.
    let buffer = ''
    for (const part of item.split(/(?<=[，,、])\s*/u)) {
      if ((buffer + part).length > 220 && buffer) {
        sentences.push(buffer.trim())
        buffer = part
      } else {
        buffer += part
      }
    }
    if (buffer.trim()) sentences.push(buffer.trim())
  }
  return sentences.filter(item => item.length >= 2).slice(0, 500)
}

export function words(text) {
  const value = String(text || '')
  const out = []
  for (const match of value.matchAll(LATIN_WORD)) {
    const word = match[0].toLowerCase().replace(/['’]s$/, '')
    if (word.length >= 3 && !LATIN_STOP.has(word)) out.push(word)
  }
  for (const match of value.matchAll(CJK_RUN)) {
    const run = match[0]
    if (run.length === 1) continue
    for (let size = 2; size <= Math.min(4, run.length); size++) {
      for (let index = 0; index + size <= run.length; index++) {
        const gram = run.slice(index, index + size)
        if (!CJK_STOP.has(gram) && ![...gram].every(char => CJK_STOP.has(char))) out.push(gram)
      }
    }
  }
  return out
}

export function termCounts(texts, { limit = 20, minLength = 3 } = {}) {
  const counts = new Map()
  for (const text of texts) {
    for (const term of words(text)) {
      if (term.length < minLength) continue
      counts.set(term, (counts.get(term) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }))
}

export function topTermsFromRecords(records, limit = 16) {
  const counts = new Map()
  for (const record of records) {
    const titleTerms = words(record.title || '')
    const abstractTerms = words(record.abstract || '').slice(0, 220)
    for (const term of titleTerms) counts.set(term, (counts.get(term) || 0) + 3)
    for (const term of abstractTerms) counts.set(term, (counts.get(term) || 0) + 1)
  }
  return [...counts.entries()]
    .filter(([term, count]) => count >= 2 && term.length >= 3)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }))
}

export function autoCodebook(texts, limit = 8) {
  const counts = new Map()
  for (const text of texts) {
    for (const term of words(text)) {
      if (term.length < 2) continue
      counts.set(term, (counts.get(term) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([term]) => ({ code: term, keywords: [term], color: 'auto' }))
}

export function matchesCode(text, code) {
  const haystack = String(text || '').toLowerCase()
  const keywords = Array.isArray(code.keywords) && code.keywords.length
    ? code.keywords
    : [code.code]
  return keywords.some(keyword => {
    const needle = String(keyword || '').toLowerCase().trim()
    if (!needle) return false
    if (/[\u3400-\u9fff]/.test(needle)) return haystack.includes(needle)
    if (needle.length <= 3) return new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'i').test(haystack)
    return haystack.includes(needle)
  })
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function countMatches(text, keywords) {
  const haystack = String(text || '').toLowerCase()
  let total = 0
  for (const keyword of keywords) {
    const needle = String(keyword || '').toLowerCase().trim()
    if (!needle) continue
    if (/[\u3400-\u9fff]/.test(needle)) {
      let index = 0
      while ((index = haystack.indexOf(needle, index)) >= 0) {
        total++
        index += needle.length
      }
    } else {
      total += (haystack.match(new RegExp(`\\b${escapeRegExp(needle)}\\b`, 'gi')) || []).length
    }
  }
  return total
}

export function slugify(text, fallback = 'item') {
  const ascii = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return (ascii || fallback).slice(0, 60)
}
