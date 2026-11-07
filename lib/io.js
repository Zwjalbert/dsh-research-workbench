import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'

export const WORKBENCH_DIR = 'research-output'

export function workbenchRoot(cwd) {
  return join(cwd || process.cwd(), WORKBENCH_DIR)
}

export function resolveInside(root, candidate) {
  const target = resolve(root, candidate)
  const rel = relative(root, target)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('路径必须位于当前工作区内')
  return target
}

export function timestampId(prefix) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  return `${prefix}-${stamp}-${randomBytes(2).toString('hex')}`
}

export function safeFileName(name, fallback = 'data.bin') {
  const raw = String(name || '').split(/[\\/]/).pop() || fallback
  const cleaned = raw.replace(/[<>:"|?*\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim()
  return cleaned.slice(0, 120) || fallback
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true })
}

export async function atomicWrite(file, data) {
  await ensureDir(resolve(file, '..'))
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(3).toString('hex')}`
  await writeFile(tmp, data)
  try {
    await rename(tmp, file)
  } catch {
    try { await unlink(file) } catch {}
    await rename(tmp, file)
  }
}

export async function writeJson(file, value) {
  await atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`)
}

export async function writeText(file, text) {
  await atomicWrite(file, text)
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

export async function pathExists(file) {
  try {
    await stat(file)
    return true
  } catch {
    return false
  }
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

export function jsonSafe(value) {
  if (value === undefined) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return { error: '结果不是可序列化的 JSON' }
  }
}

export function clamp(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, number))
}

export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/,/g, '').replace(/%$/, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned.toLowerCase() === 'na' || cleaned.toLowerCase() === 'null') return null
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

export function mean(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function truncate(text, length = 600) {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
  return value.length > length ? `${value.slice(0, Math.max(0, length - 1))}…` : value
}

export function mdCell(text, length = 120) {
  return truncate(text, length).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function stripTags(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
}

/** Parse a CSV/TSV buffer with quoted fields and embedded newlines. */
export function parseDelimited(text, delimiter = ',') {
  const source = String(text || '').replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let index = 0; index < source.length; index++) {
    const char = source[index]
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      field = ''
      if (row.some(cell => cell.trim() !== '')) rows.push(row)
      row = []
    } else if (char === '\r') {
      // ignore CR; LF owns the row break
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some(cell => cell.trim() !== '')) rows.push(row)
  if (!rows.length) return { headers: [], rows: [] }
  const headers = rows[0].map((header, index) => header.trim() || `column_${index + 1}`)
  return {
    headers,
    rows: rows.slice(1).map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))),
  }
}

export function sniffDelimiter(text) {
  const first = String(text || '').split(/\r?\n/).find(line => line.trim() !== '') || ''
  const tabs = (first.match(/\t/g) || []).length
  const commas = (first.match(/,/g) || []).length
  const semis = (first.match(/;/g) || []).length
  if (tabs >= commas && tabs >= semis && tabs > 0) return '\t'
  if (semis > commas) return ';'
  return ','
}

export function toCsv(headers, rows) {
  const esc = value => {
    const text = String(value ?? '')
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers.map(esc).join(','), ...rows.map(row => headers.map(header => esc(row[header])).join(','))].join('\n')
}

export async function readCsvFile(file) {
  const text = await readFile(file, 'utf8')
  return parseDelimited(text, sniffDelimiter(text))
}

export function columnStats(rows, columns) {
  return columns.map(column => {
    const values = rows.map(row => row[column])
    const nonEmpty = values.filter(value => String(value ?? '').trim() !== '')
    const numbers = nonEmpty.map(toNumber).filter(value => value !== null)
    const unique = new Set(nonEmpty.map(value => String(value)))
    return {
      name: column,
      type: numbers.length >= Math.max(1, nonEmpty.length * 0.8) ? 'number' : 'text',
      nonEmpty: nonEmpty.length,
      missing: values.length - nonEmpty.length,
      unique: unique.size,
      sample: nonEmpty.slice(0, 3).map(value => truncate(value, 60)),
      min: numbers.length ? Math.min(...numbers) : undefined,
      max: numbers.length ? Math.max(...numbers) : undefined,
      mean: numbers.length ? mean(numbers) : undefined,
    }
  })
}

const indexQueues = new Map()

/** Serialize index updates per workspace so parallel tool calls cannot lose entries. */
export function addIndexEntry(cwd, entry) {
  const root = workbenchRoot(cwd)
  const key = root
  const previous = indexQueues.get(key) || Promise.resolve()
  const next = previous.catch(() => {}).then(async () => {
    const file = join(root, 'index.json')
    const index = await readJson(file, { version: 1, entries: [] })
    const entries = Array.isArray(index.entries) ? index.entries : []
    entries.push({ ...entry, at: entry.at || new Date().toISOString() })
    await writeJson(file, { version: 1, generatedAt: new Date().toISOString(), entries: entries.slice(-500) })
    return entry
  })
  indexQueues.set(key, next)
  return next
}

export async function readIndex(cwd) {
  const index = await readJson(join(workbenchRoot(cwd), 'index.json'), { version: 1, entries: [] })
  return Array.isArray(index.entries) ? index.entries : []
}

export async function listArtifacts(cwd, limit = 20) {
  const root = workbenchRoot(cwd)
  const entries = await readIndex(cwd)
  return entries.slice(-limit).reverse()
}

export async function listFiles(dir, depth = 2) {
  const out = []
  async function walk(current, level) {
    if (level > depth) return
    let items = []
    try { items = await readdir(current, { withFileTypes: true }) } catch { return }
    for (const item of items) {
      const full = join(current, item.name)
      if (item.isDirectory()) await walk(full, level + 1)
      else out.push(full)
    }
  }
  await walk(dir, 0)
  return out
}

export function displayPath(cwd, file) {
  const rel = relative(cwd, file)
  return rel.startsWith('..') ? file : rel.replace(/\\/g, '/')
}

export function fileKind(file) {
  return extname(file).toLowerCase().replace('.', '') || 'file'
}

export function baseName(file) {
  return basename(file)
}
