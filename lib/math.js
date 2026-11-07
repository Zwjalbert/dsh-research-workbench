import { mean, toNumber } from './io.js'

const SQRT2 = Math.SQRT2

export function erf(x) {
  const sign = x < 0 ? -1 : 1
  const value = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * value)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-value * value)
  return sign * y
}

export function normalCdf(x) {
  return 0.5 * (1 + erf(x / SQRT2))
}

export function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

/** Acklam's inverse normal CDF. */
export function normalInv(p) {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const low = 0.02425
  const high = 1 - low
  let q
  let r
  if (p < low) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p <= high) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  }
  q = Math.sqrt(-2 * Math.log(1 - p))
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

export function logGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = LANCZOS[0]
  for (let i = 1; i < LANCZOS.length; i++) x += LANCZOS[i] / (z + i)
  const t = z + LANCZOS.length - 1.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function betaContinuedFraction(a, b, x) {
  const MAX = 300
  const EPS = 3e-14
  const FPMIN = 1e-300
  let qab = a + b
  let qap = a + 1
  let qam = a - 1
  let c = 1
  let d = 1 - qab * x / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAX; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < EPS) break
  }
  return h
}

export function incompleteBeta(a, b, x) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return bt * betaContinuedFraction(a, b, x) / a
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b
}

export function tCdf(t, df) {
  if (!Number.isFinite(t)) return t > 0 ? 1 : 0
  const x = df / (df + t * t)
  const prob = 0.5 * incompleteBeta(df / 2, 0.5, x)
  return t > 0 ? 1 - prob : prob
}

export function tTwoSidedP(t, df) {
  return Math.min(1, 2 * (1 - tCdf(Math.abs(t), df)))
}

export function fCdf(f, df1, df2) {
  if (f <= 0) return 0
  return incompleteBeta(df1 / 2, df2 / 2, (df1 * f) / (df1 * f + df2))
}

export function fUpperP(f, df1, df2) {
  return Math.max(0, Math.min(1, 1 - fCdf(f, df1, df2)))
}

function gammaSeries(a, x) {
  let ap = a
  let sum = 1 / a
  let del = sum
  for (let n = 1; n < 500; n++) {
    ap++
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * 3e-14) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

function gammaContinuedFraction(a, x) {
  const FPMIN = 1e-300
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < 3e-14) break
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

export function gammaP(a, x) {
  if (x <= 0) return 0
  if (x < a + 1) return gammaSeries(a, x)
  return 1 - gammaContinuedFraction(a, x)
}

export function chi2UpperP(x, df) {
  return Math.max(0, Math.min(1, 1 - gammaP(df / 2, x / 2)))
}

export function tCritical(alpha, df) {
  const target = 1 - alpha / 2
  let low = 0
  let high = 40
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2
    if (tCdf(mid, df) < target) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export function zCritical(alpha) {
  return normalInv(1 - alpha / 2)
}

export function quantile(values, q) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const base = Math.floor(position)
  const rest = position - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}

export function variance(values) {
  if (values.length < 2) return 0
  const avg = mean(values)
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1)
}

export function sd(values) {
  return Math.sqrt(variance(values))
}

export function skewness(values) {
  const n = values.length
  if (n < 3) return 0
  const avg = mean(values)
  const s = sd(values)
  if (s === 0) return 0
  return (n / ((n - 1) * (n - 2))) * values.reduce((sum, value) => sum + ((value - avg) / s) ** 3, 0)
}

export function kurtosis(values) {
  const n = values.length
  if (n < 4) return 0
  const avg = mean(values)
  const s = sd(values)
  if (s === 0) return 0
  const m4 = values.reduce((sum, value) => sum + ((value - avg) / s) ** 4, 0)
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
}

export function describe(values) {
  const clean = values.filter(value => Number.isFinite(value))
  const n = clean.length
  if (!n) return { n: 0 }
  const avg = mean(clean)
  const s = sd(clean)
  const se = n > 1 ? s / Math.sqrt(n) : 0
  const critical = n > 1 ? tCritical(0.05, n - 1) : 0
  return {
    n,
    mean: avg,
    sd: s,
    se,
    median: quantile(clean, 0.5),
    q1: quantile(clean, 0.25),
    q3: quantile(clean, 0.75),
    min: Math.min(...clean),
    max: Math.max(...clean),
    ci95: [avg - critical * se, avg + critical * se],
    skewness: skewness(clean),
    kurtosis: kurtosis(clean),
  }
}

export function twoSampleTTest(left, right, { paired = false, equalVar = false, alpha = 0.05 } = {}) {
  if (paired) {
    if (left.length !== right.length) throw new Error('配对 t 检验要求两组长度一致')
    const differences = left.map((value, index) => value - right[index])
    const stats = describe(differences)
    if (stats.n < 2 || stats.sd === 0) throw new Error('配对差值方差为 0，无法计算 t 检验')
    const t = stats.mean / (stats.sd / Math.sqrt(stats.n))
    const df = stats.n - 1
    const p = tTwoSidedP(t, df)
    const critical = tCritical(alpha, df)
    return {
      test: 'paired-t',
      n: stats.n,
      meanDifference: stats.mean,
      sdDifference: stats.sd,
      t,
      df,
      p,
      ci95: [stats.mean - critical * stats.se, stats.mean + critical * stats.se],
      effectSize: { name: "Cohen's dz", value: stats.mean / stats.sd },
      groups: { left: describe(left), right: describe(right), differences: stats },
    }
  }
  const leftStats = describe(left)
  const rightStats = describe(right)
  if (leftStats.n < 2 || rightStats.n < 2) throw new Error('每组至少需要 2 个有效值')
  const diff = leftStats.mean - rightStats.mean
  let se
  let df
  if (equalVar) {
    const pooledVar = ((leftStats.n - 1) * leftStats.sd ** 2 + (rightStats.n - 1) * rightStats.sd ** 2) / (leftStats.n + rightStats.n - 2)
    se = Math.sqrt(pooledVar * (1 / leftStats.n + 1 / rightStats.n))
    df = leftStats.n + rightStats.n - 2
  } else {
    const a = leftStats.sd ** 2 / leftStats.n
    const b = rightStats.sd ** 2 / rightStats.n
    se = Math.sqrt(a + b)
    df = (a + b) ** 2 / ((a ** 2) / (leftStats.n - 1) + (b ** 2) / (rightStats.n - 1))
  }
  if (se === 0) throw new Error('两组标准误为 0，无法计算 t 检验')
  const t = diff / se
  const p = tTwoSidedP(t, df)
  const critical = tCritical(alpha, df)
  const pooledSd = Math.sqrt(((leftStats.n - 1) * leftStats.sd ** 2 + (rightStats.n - 1) * rightStats.sd ** 2) / (leftStats.n + rightStats.n - 2))
  const cohenD = pooledSd ? diff / pooledSd : 0
  const correction = 1 - 3 / (4 * (leftStats.n + rightStats.n) - 9)
  return {
    test: equalVar ? 'student-t' : 'welch-t',
    n: leftStats.n + rightStats.n,
    meanDifference: diff,
    se,
    t,
    df,
    p,
    ci95: [diff - critical * se, diff + critical * se],
    effectSize: { name: "Cohen's d", value: cohenD, hedgesG: cohenD * correction },
    varRatio: leftStats.sd && rightStats.sd ? Math.max(leftStats.sd ** 2 / rightStats.sd ** 2, rightStats.sd ** 2 / leftStats.sd ** 2) : null,
    groups: { left: leftStats, right: rightStats },
  }
}

export function oneWayAnova(groups, { alpha = 0.05 } = {}) {
  const cleanGroups = groups.map(group => ({ name: group.name, values: group.values.filter(value => Number.isFinite(value)) })).filter(group => group.values.length >= 2)
  if (cleanGroups.length < 2) throw new Error('ANOVA 至少需要两组、每组至少 2 个有效值')
  const all = cleanGroups.flatMap(group => group.values)
  const grand = mean(all)
  let ssBetween = 0
  let ssWithin = 0
  for (const group of cleanGroups) {
    const avg = mean(group.values)
    ssBetween += group.values.length * (avg - grand) ** 2
    ssWithin += group.values.reduce((sum, value) => sum + (value - avg) ** 2, 0)
  }
  const dfBetween = cleanGroups.length - 1
  const dfWithin = all.length - cleanGroups.length
  const msBetween = ssBetween / dfBetween
  const msWithin = ssWithin / dfWithin
  const f = msWithin === 0 ? Infinity : msBetween / msWithin
  const p = Number.isFinite(f) ? fUpperP(f, dfBetween, dfWithin) : 0
  const eta2 = ssBetween / (ssBetween + ssWithin)
  const omega2 = (ssBetween - dfBetween * msWithin) / (ssBetween + ssWithin + msWithin)
  return {
    test: 'one-way-anova',
    n: all.length,
    dfBetween,
    dfWithin,
    f,
    p,
    ssBetween,
    ssWithin,
    msBetween,
    msWithin,
    effectSize: { name: 'eta-squared', value: eta2, omegaSquared: omega2 },
    groups: cleanGroups.map(group => ({ name: group.name, ...describe(group.values) })),
  }
}

export function chiSquareTest(table) {
  const rows = table.filter(row => Array.isArray(row) && row.length)
  if (rows.length < 2) throw new Error('卡方检验至少需要 2 行')
  const width = rows[0].length
  if (width < 2 || rows.some(row => row.length !== width)) throw new Error('列联表每行长度必须一致且至少 2 列')
  const values = rows.map(row => row.map(value => Number(value)))
  if (values.some(row => row.some(value => !Number.isFinite(value) || value < 0))) throw new Error('列联表必须是非负数')
  const rowSums = values.map(row => row.reduce((sum, value) => sum + value, 0))
  const colSums = Array.from({ length: width }, (_, column) => values.reduce((sum, row) => sum + row[column], 0))
  const total = rowSums.reduce((sum, value) => sum + value, 0)
  if (total <= 0) throw new Error('列联表总和必须大于 0')
  let chi2 = 0
  let minExpected = Infinity
  let lowExpected = 0
  for (let row = 0; row < values.length; row++) {
    for (let column = 0; column < width; column++) {
      const expected = (rowSums[row] * colSums[column]) / total
      minExpected = Math.min(minExpected, expected)
      if (expected < 5) lowExpected++
      if (expected > 0) chi2 += (values[row][column] - expected) ** 2 / expected
    }
  }
  const df = (rows.length - 1) * (width - 1)
  const p = chi2UpperP(chi2, df)
  const cramersV = Math.sqrt(chi2 / (total * Math.min(rows.length - 1, width - 1)))
  return {
    test: 'chi-square-independence',
    n: total,
    chi2,
    df,
    p,
    minExpected,
    lowExpectedCells: lowExpected,
    effectSize: { name: "Cramér's V", value: cramersV },
    rowSums,
    colSums,
  }
}

function rank(values) {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
  const ranks = new Array(values.length)
  let index = 0
  while (index < sorted.length) {
    let end = index
    while (end + 1 < sorted.length && sorted[end + 1].value === sorted[index].value) end++
    const avgRank = (index + end) / 2 + 1
    for (let cursor = index; cursor <= end; cursor++) ranks[sorted[cursor].index] = avgRank
    index = end + 1
  }
  return ranks
}

function pearson(left, right) {
  if (left.length !== right.length) throw new Error('两列长度必须一致')
  const n = left.length
  if (n < 3) throw new Error('相关分析至少需要 3 对有效值')
  const mx = mean(left)
  const my = mean(right)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let index = 0; index < n; index++) {
    const dx = left[index] - mx
    const dy = right[index] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) throw new Error('其中一列没有变异，无法计算相关')
  const r = sxy / Math.sqrt(sxx * syy)
  const t = r * Math.sqrt((n - 2) / Math.max(1e-15, 1 - r * r))
  const p = tTwoSidedP(t, n - 2)
  const z = 0.5 * Math.log((1 + r) / (1 - r))
  const seZ = 1 / Math.sqrt(n - 3)
  const zCriticalValue = zCritical(0.05)
  return { n, r, t, df: n - 2, p, ci95: [Math.tanh(z - zCriticalValue * seZ), Math.tanh(z + zCriticalValue * seZ)] }
}

export function correlationTest(left, right, { method = 'pearson' } = {}) {
  const pairs = left.map((value, index) => [value, right[index]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
  const x = pairs.map(pair => pair[0])
  const y = pairs.map(pair => pair[1])
  if (method === 'spearman') {
    const result = pearson(rank(x), rank(y))
    return { test: 'spearman-correlation', ...result, method: 'spearman' }
  }
  return { test: 'pearson-correlation', ...pearson(x, y), method: 'pearson' }
}

export function matrixInverse(matrix) {
  const n = matrix.length
  const augmented = matrix.map((row, index) => [...row, ...Array.from({ length: n }, (_, col) => (col === index ? 1 : 0))])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row
    }
    if (Math.abs(augmented[pivot][col]) < 1e-12) throw new Error('设计矩阵奇异（存在完全共线或常量预测变量）')
    if (pivot !== col) [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]]
    const divisor = augmented[col][col]
    for (let index = 0; index < 2 * n; index++) augmented[col][index] /= divisor
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = augmented[row][col]
      for (let index = 0; index < 2 * n; index++) augmented[row][index] -= factor * augmented[col][index]
    }
  }
  return augmented.map(row => row.slice(n))
}

export function linearRegression(outcome, predictors, { alpha = 0.05 } = {}) {
  const names = Object.keys(predictors)
  const rows = []
  for (let index = 0; index < outcome.length; index++) {
    const row = [1]
    let valid = Number.isFinite(outcome[index])
    for (const name of names) {
      const value = predictors[name][index]
      if (!Number.isFinite(value)) valid = false
      row.push(value)
    }
    if (valid) rows.push({ y: outcome[index], x: row })
  }
  if (rows.length <= names.length + 1) throw new Error(`有效样本不足：需要大于 ${names.length + 1} 行`)
  const X = rows.map(row => row.x)
  const y = rows.map(row => row.y)
  const p = X[0].length
  const n = rows.length
  const xt = X[0].map((_, col) => X.map(row => row[col]))
  const xtx = xt.map(left => X[0].map((_, col) => left.reduce((sum, value, index) => sum + value * X[index][col], 0)))
  const xty = xt.map(left => left.reduce((sum, value, index) => sum + value * y[index], 0))
  const inv = matrixInverse(xtx)
  const beta = inv.map(row => row.reduce((sum, value, index) => sum + value * xty[index], 0))
  const fitted = X.map(row => row.reduce((sum, value, index) => sum + value * beta[index], 0))
  const residuals = y.map((value, index) => value - fitted[index])
  const sse = residuals.reduce((sum, value) => sum + value * value, 0)
  const yMean = mean(y)
  const sst = y.reduce((sum, value) => sum + (value - yMean) ** 2, 0)
  const dfModel = p - 1
  const dfResidual = n - p
  if (dfResidual <= 0) throw new Error('残差自由度为 0')
  const mse = sse / dfResidual
  const r2 = sst === 0 ? 0 : 1 - sse / sst
  const adjustedR2 = 1 - (1 - r2) * (n - 1) / dfResidual
  const f = dfModel > 0 && mse > 0 ? (r2 / dfModel) / ((1 - r2) / dfResidual) : 0
  const pValue = dfModel > 0 ? fUpperP(f, dfModel, dfResidual) : 1
  const coefficients = beta.map((value, index) => {
    const se = Math.sqrt(Math.max(0, mse * inv[index][index]))
    const t = se === 0 ? 0 : value / se
    const df = dfResidual
    return {
      name: index === 0 ? 'intercept' : names[index - 1],
      estimate: value,
      se,
      t,
      p: tTwoSidedP(t, df),
      ci95: [value - tCritical(alpha, df) * se, value + tCritical(alpha, df) * se],
    }
  })
  const conditionNumber = Math.sqrt(Math.max(...xtx.flatMap(row => row.map(value => Math.abs(value)))) || 0)
  return {
    test: 'ols-regression',
    n,
    r2,
    adjustedR2,
    f,
    dfModel,
    dfResidual,
    p: pValue,
    mse,
    coefficients,
    conditionNumberHint: conditionNumber,
    residualSummary: describe(residuals),
    fittedVsResidual: residuals.slice(0, 30).map((residual, index) => ({ fitted: fitted[index], residual })),
  }
}

function cleanGroups(groups) {
  return (groups || []).map((group, index) => ({
    name: String(group?.name || `组${index + 1}`),
    values: (Array.isArray(group?.values) ? group.values : []).map(toNumber).filter(value => value !== null),
  })).filter(group => group.values.length)
}

function cleanColumns(columns) {
  const out = {}
  for (const [name, values] of Object.entries(columns || {})) {
    if (Array.isArray(values)) out[name] = values.map(toNumber)
  }
  return out
}

export function runStats(test, data, options = {}) {
  const alpha = Number(options.alpha) > 0 && Number(options.alpha) < 1 ? Number(options.alpha) : 0.05
  if (test === 'describe') {
    if (Array.isArray(data?.groups)) {
      const groups = cleanGroups(data.groups)
      if (!groups.length) throw new Error('没有可分析的分组数据')
      return { test: 'descriptive', groups: groups.map(group => ({ name: group.name, ...describe(group.values) })) }
    }
    const columns = cleanColumns(data?.columns)
    const names = Object.keys(columns)
    if (!names.length) throw new Error('需要 data.groups 或 data.columns')
    return { test: 'descriptive', columns: names.map(name => ({ name, ...describe(columns[name].filter(value => value !== null)) })) }
  }
  if (test === 'ttest') {
    let left
    let right
    let leftName = '组1'
    let rightName = '组2'
    if (Array.isArray(data?.groups) && data.groups.length >= 2) {
      const groups = cleanGroups(data.groups)
      left = groups[0].values
      right = groups[1].values
      leftName = groups[0].name
      rightName = groups[1].name
    } else {
      const columns = cleanColumns(data?.columns)
      const names = Object.keys(columns)
      if (names.length < 2) throw new Error('需要两组数据')
      left = columns[names[0]].filter(value => value !== null)
      right = columns[names[1]].filter(value => value !== null)
      leftName = names[0]
      rightName = names[1]
    }
    if (options.paired && left.length !== right.length) throw new Error('配对检验要求两组等长且顺序对应')
    return { ...twoSampleTTest(left, right, { paired: Boolean(options.paired), equalVar: Boolean(options.equalVar), alpha }), labels: { left: leftName, right: rightName } }
  }
  if (test === 'anova') {
    const groups = cleanGroups(data?.groups)
    if (groups.length < 2) throw new Error('ANOVA 至少需要两组')
    return oneWayAnova(groups, { alpha })
  }
  if (test === 'chi2') {
    const table = Array.isArray(data?.table) ? data.table : Array.isArray(data?.rows) ? data.rows : null
    if (!table) throw new Error('卡方检验需要 data.table 二维数组')
    return chiSquareTest(table)
  }
  if (test === 'correlation') {
    const columns = cleanColumns(data?.columns)
    const names = Object.keys(columns)
    if (names.length < 2) throw new Error('相关分析需要两列数据')
    const xName = options.x && columns[options.x] ? options.x : names[0]
    const yName = options.y && columns[options.y] ? options.y : names[1]
    return { ...correlationTest(columns[xName], columns[yName], { method: options.method === 'spearman' ? 'spearman' : 'pearson' }), labels: { x: xName, y: yName } }
  }
  if (test === 'regression') {
    const columns = cleanColumns(data?.columns)
    const names = Object.keys(columns)
    const outcomeName = options.outcome
    if (!outcomeName || !columns[outcomeName]) throw new Error('回归分析需要 options.outcome 指定因变量列名')
    const predictors = {}
    for (const name of Array.isArray(options.predictors) && options.predictors.length ? options.predictors : names.filter(name => name !== outcomeName)) {
      if (columns[name]) predictors[name] = columns[name]
    }
    if (!Object.keys(predictors).length) throw new Error('回归分析至少需要一个自变量')
    return { ...linearRegression(columns[outcomeName], predictors, { alpha }), outcome: outcomeName, predictors: Object.keys(predictors) }
  }
  throw new Error(`未知统计方法：${test}`)
}

export function formatP(value) {
  if (!Number.isFinite(value)) return 'NA'
  if (value < 0.001) return '< .001'
  return value.toFixed(3).replace(/^0/, '')
}

export function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return 'NA'
  const abs = Math.abs(value)
  if (abs !== 0 && abs < 0.001) return value.toExponential(2)
  return Number(value.toFixed(digits)).toString()
}

export function powerTwoSample(d, nPerGroup, alpha = 0.05) {
  if (!(d > 0) || !(nPerGroup > 0)) return 0
  const noncentral = Math.abs(d) * Math.sqrt(nPerGroup / 2)
  const z = zCritical(alpha)
  return normalCdf(noncentral - z) + normalCdf(-noncentral - z)
}

export function sampleSizeTwoSample(d, { alpha = 0.05, power = 0.8 } = {}) {
  if (!(d > 0)) throw new Error('效应量 d 必须大于 0')
  const zAlpha = zCritical(alpha)
  const zPower = normalInv(power)
  const n = Math.ceil((2 * (zAlpha + zPower) ** 2) / (d * d))
  return { nPerGroup: n, total: n * 2, achievedPower: powerTwoSample(d, n, alpha) }
}

export function sampleSizeCorrelation(r, { alpha = 0.05, power = 0.8 } = {}) {
  if (!(Math.abs(r) > 0 && Math.abs(r) < 1)) throw new Error('相关系数 r 必须在 (-1, 1) 且不为 0')
  const z = 0.5 * Math.log((1 + r) / (1 - r))
  const n = Math.ceil(((zCritical(alpha) + normalInv(power)) / z) ** 2 + 3)
  return { n, achievedPower: power }
}

export function powerCurve(d, maxN = 120, alpha = 0.05) {
  const points = []
  for (let n = 4; n <= maxN; n += Math.max(1, Math.round(maxN / 30))) {
    points.push({ n, power: Number(powerTwoSample(d, n, alpha).toFixed(3)) })
  }
  return points
}
