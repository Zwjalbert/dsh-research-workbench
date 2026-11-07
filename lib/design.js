import { clamp } from './io.js'
import {
  formatNumber,
  normalInv,
  powerCurve,
  powerTwoSample,
  sampleSizeCorrelation,
  sampleSizeTwoSample,
  zCritical,
} from './math.js'

function positive(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function deriveSampleSize({ designType, effectSize, alpha, power, groups, correlation }) {
  if (designType === 'correlation') {
    const r = correlation || effectSize || 0.3
    return { method: 'fisher-z', ...sampleSizeCorrelation(clamp(r, -0.99, 0.99), { alpha, power }), effect: r, effectLabel: 'r' }
  }
  if (designType === 'within' || designType === 'paired') {
    const d = positive(effectSize, 0.4)
    const n = Math.ceil(((zCritical(alpha) + normalInv(power)) ** 2) / (d * d))
    return { method: 'paired-normal-approx', nPerGroup: n, total: n, achievedPower: powerTwoSample(d, n, alpha), effect: d, effectLabel: "Cohen's dz" }
  }
  if (designType === 'anova') {
    const k = Math.max(2, Math.min(8, Number(groups) || 3))
    const f = positive(effectSize, 0.25)
    const nPerGroup = Math.ceil((2 * (zCritical(alpha) + normalInv(power)) ** 2) / (f * f) * (k / Math.max(2, k - 1)))
    return { method: 'anova-normal-approx', nPerGroup, total: nPerGroup * k, groups: k, achievedPower: power, effect: f, effectLabel: "Cohen's f", approximate: true }
  }
  const d = positive(effectSize, 0.4)
  return { method: 'two-sample-normal-approx', ...sampleSizeTwoSample(d, { alpha, power }), effect: d, effectLabel: "Cohen's d" }
}

export function designStudy({ hypothesis, options = {} }) {
  const cleanHypothesis = String(hypothesis || '').trim()
  if (!cleanHypothesis) throw new Error('请给出待检验的假设')
  const designType = ['between', 'within', 'paired', 'anova', 'correlation', 'mixed', 'qualitative'].includes(options.designType)
    ? options.designType
    : 'between'
  const alpha = clamp(options.alpha ?? 0.05, 0.001, 0.2)
  const power = clamp(options.power ?? 0.8, 0.5, 0.99)
  const effectSize = positive(options.effectSize, 0.4)
  const correlation = Number(options.correlation) || 0.3
  const sample = deriveSampleSize({ designType, effectSize, alpha, power, groups: options.groups, correlation })
  const conditions = designType === 'between'
    ? [
      { name: '对照组', description: '无操纵/常规条件', n: sample.nPerGroup || Math.ceil((sample.total || 40) / 2) },
      { name: '实验组', description: options.manipulation || '接受核心操纵', n: sample.nPerGroup || Math.ceil((sample.total || 40) / 2) },
    ]
    : designType === 'within' || designType === 'paired'
      ? [
        { name: '条件 A', description: '基线/控制条件', n: sample.nPerGroup || sample.total || 30 },
        { name: '条件 B', description: options.manipulation || '实验条件', n: sample.nPerGroup || sample.total || 30 },
      ]
      : designType === 'anova'
        ? Array.from({ length: sample.groups || 3 }, (_, index) => ({ name: `组 ${index + 1}`, description: index === 0 ? '对照' : `操纵水平 ${index}`, n: sample.nPerGroup }))
        : [{ name: '主样本', description: '横断面/观察样本', n: sample.total || sample.n || 100 }]
  const primaryOutcome = options.primaryOutcome || '主要结局（请替换为可量化指标）'
  const secondaryOutcomes = Array.isArray(options.secondaryOutcomes) && options.secondaryOutcomes.length
    ? options.secondaryOutcomes
    : ['机制变量', '过程指标', '操纵检查']
  const preregistration = `# 预注册草案\n\n## 研究问题\n${cleanHypothesis}\n\n## 设计\n${designType}；计划样本：${sample.total || sample.n}（${sample.method}）。\n\n## 主要结局\n${primaryOutcome}\n\n## 分析计划\n${designType === 'correlation' ? 'Pearson/Spearman 相关；报告 r 与 95% CI；必要时用偏相关控制协变量。' : designType === 'anova' ? '单因素方差分析；报告 η²、95% CI 与事后比较（校正）。' : designType === 'within' || designType === 'paired' ? '配对 t 检验或线性混合模型；报告差值、dz 与 95% CI。' : '独立样本 t 检验（Welch）或协方差分析；报告 d、95% CI 与稳健标准误。'}\n\n## 排除与缺失\n预先声明排除标准；对缺失机制做敏感性分析。\n\n## 证伪条件\n${options.falsifier || '主要结局方向与假设相反，且 95% CI 排除最小有意义效应。'}\n`
  const threats = [
    '选择偏差：随机化或匹配是否真正平衡了基线？',
    '测量偏差：主要结局是否对条件/期望敏感？',
    '多重比较：次要结局与亚组分析是否消耗了错误率？',
    '脱落与缺失：脱落是否与条件相关？',
    '外部效度：样本、情境与刺激材料是否只覆盖一个狭窄切片？',
    options.risk ? `用户标注风险：${options.risk}` : '',
  ].filter(Boolean)
  const timeline = [
    { phase: '第 1 周', task: '锁定假设、主要结局与最小有意义效应；完成预注册。' },
    { phase: '第 2 周', task: '搭建材料/操纵，做 5–10 人认知访谈或试点。' },
    { phase: '第 3–4 周', task: `收集约 ${sample.total || sample.n} 个有效样本；每日监控数据质量。` },
    { phase: '第 5 周', task: '按预注册分析；报告效应量与不确定性；做稳健性检查。' },
    { phase: '第 6 周', task: '写结果与限制；决定复制、扩展或转向。' },
  ]
  const curve = designType === 'correlation'
    ? []
    : powerCurve(sample.effect || effectSize, Math.max(40, Math.ceil((sample.nPerGroup || sample.total || 40) * 2.2)), alpha)
  return {
    hypothesis: cleanHypothesis,
    designType,
    alpha,
    power,
    sample,
    conditions,
    primaryOutcome,
    secondaryOutcomes,
    randomization: designType === 'between' || designType === 'anova' ? '分层随机分配（按关键协变量分层）；分配序列由独立脚本生成。' : '条件顺序随机化/拉丁方平衡；设置洗脱期。',
    blinding: '至少对评分者/分析师盲法；如无法对参与者盲法，明确记录期望效应。',
    analysisPlan: preregistration.split('## 分析计划')[1]?.split('##')[0]?.trim() || '',
    preregistration,
    threats,
    timeline,
    powerCurve: curve,
    smallestMeaningfulEffect: positive(options.smallestMeaningfulEffect, effectSize),
    falsifier: options.falsifier || '主要结局方向与假设相反，且 95% CI 排除最小有意义效应。',
    generatedAt: new Date().toISOString(),
  }
}

export function designMarkdown(result) {
  return [
    `# 实验设计：${result.hypothesis}`,
    '',
    `- 设计类型：${result.designType}`,
    `- 计划样本：${result.sample.total || result.sample.n}（${result.sample.method}；每组约 ${result.sample.nPerGroup || 'NA'}）`,
    `- 效应量假设：${result.sample.effectLabel || 'd'} = ${formatNumber(result.sample.effect)}`,
    `- alpha = ${result.alpha}；power = ${result.power}`,
    `- 主要结局：${result.primaryOutcome}`,
    '',
    '## 条件',
    ...result.conditions.map(condition => `- **${condition.name}**：${condition.description}（n≈${condition.n}）`),
    '',
    '## 随机化与盲法',
    `- ${result.randomization}`,
    `- ${result.blinding}`,
    '',
    '## 分析计划',
    result.analysisPlan,
    '',
    '## 威胁与对策',
    ...result.threats.map(threat => `- ${threat}`),
    '',
    '## 时间线',
    ...result.timeline.map(item => `- **${item.phase}**：${item.task}`),
    '',
    '## 证伪条件',
    result.falsifier,
    '',
    '## 预注册草案',
    result.preregistration,
  ].join('\n')
}
