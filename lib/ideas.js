const OPERATORS = [
  {
    name: '反转默认假设',
    move: seed => `假设“${seed}”的反面才是常态：如果默认方向错了，什么现象会立刻变得合理？`,
    claim: seed => `当“${seed}”的默认关系被反转时，原本被视为噪声的个体差异会变成主要效应。`,
  },
  {
    name: '极端尺度',
    move: seed => `把“${seed}”放大 1000 倍或缩小到 1/1000，哪一条规律会先断裂？`,
    claim: seed => `“${seed}”的效应在极端尺度上呈阈值型，而不是线性累积。`,
  },
  {
    name: '跨域移植',
    move: seed => `把生态学/金融/戏剧理论中的一条机制移植到“${seed}”，会产生什么新预测？`,
    claim: seed => `用另一个领域的机制解释“${seed}”，能预测原理论漏掉的一个交互效应。`,
  },
  {
    name: '移除关键条件',
    move: seed => `如果去掉“${seed}”最常被假定的必要条件，效应还会存在吗？`,
    claim: seed => `“${seed}”并不依赖通常假定的必要条件；去掉它后效应仍可复现，只是换了载体。`,
  },
  {
    name: '对抗性设计',
    move: seed => `设计一个专门让“${seed}”失效的情境；这个情境揭示了什么边界？`,
    claim: seed => `“${seed}”在对抗性情境下失效，说明它其实是情境特异性策略而非普遍规律。`,
  },
  {
    name: '时间倒置',
    move: seed => `先看结果再看“${seed}”的前因，时间顺序能否被倒置或共同演化？`,
    claim: seed => `“${seed}”的因果箭头可能是双向的，反馈延迟决定了观测到的相关方向。`,
  },
  {
    name: '把缺陷变信号',
    move: seed => `如果“${seed}”的测量误差本身携带信息，而不是需要消除的噪声呢？`,
    claim: seed => `“${seed}”的测量残差编码了被忽略的情境变量，可作为新的预测特征。`,
  },
  {
    name: '制度/物理约束',
    move: seed => `给“${seed}”加一个现实世界无法绕开的约束（成本、隐私、能量、伦理），最优策略会怎样变？`,
    claim: seed => `在真实约束下，“${seed}”的最优策略会从最大化效应转向最小化脆弱性。`,
  },
]

const LENSES = [
  { name: '机制', question: '中间过程是什么？', test: '测量中介变量，做因果中介或过程追踪。' },
  { name: '测量', question: '现在的测量漏掉了什么？', test: '用两种测量方式做多质多法对照，报告收敛效度。' },
  { name: '人群', question: '谁被样本排除在外？', test: '在一个被忽略的人群中做最小复制，比较效应方向。' },
  { name: '情境', question: '换一个场景还成立吗？', test: '做 2×2 情境操纵，检验交互而非主效应。' },
  { name: '时间', question: '效应随时间如何变化？', test: '用密集纵向数据估计延迟与衰减曲线。' },
  { name: '技术', question: '新技术让哪个旧假设第一次可测？', test: '用现有模型/传感器做一次低成本概念验证。' },
  { name: '失败', question: '什么情况下它会失败？', test: '预注册一个对抗性样本，专门寻找边界条件。' },
]

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function pick(list, seed) {
  return list[seed % list.length]
}

function score(base, offset, min = 5, max = 98) {
  return Math.max(min, Math.min(max, Math.round(base + offset)))
}

export function generateIdeas({ seed, count = 8, wildness = 70, constraints = '', domain = '' }) {
  const cleanSeed = String(seed || '').trim()
  if (!cleanSeed) throw new Error('请给出一个研究种子（现象、问题或一句荒诞想法）')
  const total = Math.max(4, Math.min(12, Number(count) || 8))
  const wild = Math.max(0, Math.min(100, Number(wildness) || 70))
  const baseHash = hashString(`${cleanSeed}|${domain}|${constraints}`)
  const ideas = []
  for (let index = 0; index < total; index++) {
    const operator = OPERATORS[(baseHash + index * 3) % OPERATORS.length]
    const lens = LENSES[(baseHash + index * 5 + 1) % LENSES.length]
    const absurdity = Math.min(98, Math.round(38 + wild * 0.45 + ((baseHash + index * 17) % 22)))
    const novelty = score(58, (baseHash + index * 11) % 32)
    const feasibility = score(74 - wild * 0.22, -((baseHash + index * 7) % 18))
    const testability = score(82, -((baseHash + index * 5) % 14))
    const title = `${lens.name}视角：${operator.name}`
    const claim = operator.claim(cleanSeed)
    const move = operator.move(cleanSeed)
    const design = `${lens.test} 具体做法：${move}`
    const falsifier = `如果按上述设计测量，关键指标的方向与预测相反、且 95% 置信区间排除最小有意义效应，则该想法被证伪。`
    ideas.push({
      id: `idea-${index + 1}`,
      title,
      claim,
      idea: move,
      mechanism: `${lens.question} ${domain ? `在“${domain}”场景中，` : ''}优先检查一个可观测的中介或边界变量。`,
      test: design,
      falsifier,
      cheapestTest: absurdity >= 75
        ? `24 小时内可做的“杀死测试”：用 20–30 条现有文本/公开数据做一次方向性检查；只回答“值不值得继续”，不追求显著。`
        : `一周内可做的试点：小样本预注册 + 效应量估计；先看可行性，再决定是否扩大。`,
      resources: ['公开数据或既有语料', '一个可自动化的指标', '2–4 周内可完成的样本'],
      risks: [
        absurdity >= 75 ? '高荒诞度：先做证伪，不要先做验证性分析。' : '中等风险：注意把探索性结果标记为探索性。',
        constraints ? `约束条件：${constraints}` : '现实约束：时间、样本获取与测量成本。',
      ],
      scores: {
        absurdity,
        novelty,
        feasibility,
        testability,
        informationGain: Math.round((novelty + testability + (100 - feasibility) * 0.35) / 2.35),
      },
      tags: [lens.name, operator.name, absurdity >= 75 ? '荒诞但可验证' : '稳健增量'],
    })
  }
  ideas.sort((left, right) => right.scores.informationGain - left.scores.informationGain)
  const wildest = [...ideas].sort((left, right) => right.scores.absurdity - left.scores.absurdity)[0]
  return {
    seed: cleanSeed,
    domain,
    constraints,
    wildness: wild,
    ideas,
    wildest: wildest?.id,
    summary: `生成 ${ideas.length} 个可检验想法；最荒诞的是「${wildest?.title}」，已给出 24 小时杀死测试。`,
    protocol: [
      '不先评判“现不现实”，先把想法改写成可证伪命题。',
      '为每个高荒诞度想法配一个最便宜的杀死测试。',
      '只有通过杀死测试的想法才进入正式设计。',
    ],
    generatedAt: new Date().toISOString(),
  }
}

export function ideasMarkdown(result) {
  return [
    `头脑风暴：${result.seed}`,
    `荒诞度设定：${result.wildness}/100；共 ${result.ideas.length} 个想法。`,
    '',
    ...result.ideas.map((idea, index) => [
      `${index + 1}. **${idea.title}**（荒诞 ${idea.scores.absurdity} / 新颖 ${idea.scores.novelty} / 可行 ${idea.scores.feasibility}）`,
      `   - 命题：${idea.claim}`,
      `   - 最小验证：${idea.cheapestTest}`,
      `   - 证伪条件：${idea.falsifier}`,
    ].join('\n')),
    '',
    `优先处理最荒诞想法：${result.wildest}`,
  ].join('\n')
}
