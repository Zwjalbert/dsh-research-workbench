import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import {
  columnStats,
  displayPath,
  ensureDir,
  parseDelimited,
  pathExists,
  readCsvFile,
  resolveInside,
  safeFileName,
  sha256,
  sniffDelimiter,
  toNumber,
  truncate,
  workbenchRoot,
} from './io.js'

const MAX_BYTES = 80 * 1024 * 1024

function assertPublicUrl(value) {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只支持 http/https 下载')
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) throw new Error('拒绝访问本机地址')
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) throw new Error('拒绝访问私有地址')
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) throw new Error('拒绝访问私有地址')
  if (host === '0.0.0.0') throw new Error('拒绝访问私有地址')
  return url
}

export async function downloadData({ url, filename, cwd }) {
  const parsed = assertPublicUrl(String(url || '').trim())
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  let response
  let current = parsed
  try {
    for (let hop = 0; hop < 6; hop++) {
      response = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'user-agent': 'dsh-research-workbench/0.1 (data download; local DSH plugin)',
          accept: '*/*',
        },
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) throw new Error('下载重定向缺少 Location')
        current = assertPublicUrl(new URL(location, current).toString())
        continue
      }
      break
    }
    if (!response || !response.ok) throw new Error(`下载失败：HTTP ${response?.status ?? 'unknown'}`)
    const length = Number(response.headers.get('content-length') || 0)
    if (length > MAX_BYTES) throw new Error(`文件过大（${(length / 1024 / 1024).toFixed(1)} MB），上限 80 MB`)
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.byteLength > MAX_BYTES) throw new Error('文件超过 80 MB 上限')
    const disposition = response.headers.get('content-disposition') || ''
    const dispositionName = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1]
    const guessed = dispositionName ? decodeURIComponent(dispositionName.replace(/"/g, '')) : decodeURIComponent(current.pathname.split('/').pop() || '')
    const name = safeFileName(filename || guessed || 'download.bin', 'download.bin')
    const dir = join(workbenchRoot(cwd), 'data')
    await ensureDir(dir)
    let target = join(dir, name)
    if (await pathExists(target)) {
      const ext = extname(name)
      const stem = name.slice(0, Math.max(0, name.length - ext.length))
      target = join(dir, `${stem}-${Date.now().toString(36)}${ext}`)
    }
    await writeFile(target, buffer)
    const preview = await previewFile(target)
    return {
      file: target,
      relativePath: displayPath(cwd, target),
      bytes: buffer.byteLength,
      sha256: sha256(buffer),
      contentType: response.headers.get('content-type') || '',
      sourceUrl: current.toString(),
      ...preview,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function previewFile(file) {
  const info = await stat(file)
  const ext = extname(file).toLowerCase()
  const base = { size: info.size, previewKind: 'binary', preview: null, columns: [], rows: [] }
  if (info.size > 20 * 1024 * 1024) {
    return { ...base, previewKind: 'too-large', preview: '文件较大，已保存；预览跳过。' }
  }
  if (['.csv', '.tsv', '.txt', '.md'].includes(ext)) {
    const text = await readFile(file, 'utf8')
    if (ext === '.csv' || ext === '.tsv') {
      const parsed = parseDelimited(text.slice(0, 500_000), ext === '.tsv' ? '\t' : sniffDelimiter(text.slice(0, 4096)))
      return {
        ...base,
        previewKind: 'table',
        columns: columnStats(parsed.rows, parsed.headers),
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 12),
        rowCountPreview: parsed.rows.length,
        preview: truncate(text, 800),
      }
    }
    return { ...base, previewKind: 'text', preview: truncate(text, 2000) }
  }
  if (ext === '.json') {
    const text = await readFile(file, 'utf8')
    try {
      const json = JSON.parse(text.slice(0, 2_000_000))
      if (Array.isArray(json) && json.length && typeof json[0] === 'object') {
        const headers = [...new Set(json.slice(0, 50).flatMap(item => Object.keys(item || {})))].slice(0, 30)
        const rows = json.slice(0, 12).map(item => Object.fromEntries(headers.map(header => [header, item?.[header]])))
        return { ...base, previewKind: 'table', columns: columnStats(rows, headers), headers, rows, rowCountPreview: json.length, preview: truncate(text, 800) }
      }
      return { ...base, previewKind: 'json', preview: truncate(JSON.stringify(json, null, 2), 2000) }
    } catch {
      return { ...base, previewKind: 'text', preview: truncate(text, 2000) }
    }
  }
  return { ...base, preview: `已保存 ${ext || '文件'}；该格式不做内联预览。` }
}

export async function inspectData({ path, cwd }) {
  if (!path) throw new Error('请提供要检查的文件路径')
  const file = resolveInside(cwd, path)
  const preview = await previewFile(file)
  return { file, relativePath: displayPath(cwd, file), ...preview }
}

export function datasetColumnValues(rows, column) {
  return (rows || []).map(row => toNumber(row[column])).filter(value => value !== null)
}
