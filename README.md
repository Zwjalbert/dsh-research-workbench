# 科研工作台（dsh-research-workbench）

一个装进 DSH 对话里的科研快路径插件：检索文献、读文献、写综述、头脑风暴、设计实验、下载数据、跑统计、做质性编码。每一步都通过对话完成，工具结果用可视化卡片渲染。

## 现在能做什么

| 阶段 | 工具 | 说明 |
|---|---|---|
| 定问题 | 对话 | 直接讨论；需要时用 `research_idea` 把模糊想法变成可检验命题 |
| 文献检索 | `research_lit` | `action="search"`，支持 OpenAlex、Crossref、PubMed、arXiv，自动去重 |
| 文献筛选 | `research_lit` | `action="screen"`，按纳入/排除词、年份、引用数筛选 |
| 文献分析 | `research_lit` | `action="analyze"`，年份/主题/来源/证据表/可检验空白 |
| 综述初稿 | `research_lit` | `action="review"`，输出结构、证据表、参考文献和可编辑 Markdown |
| 头脑风暴 | `research_idea` | 荒诞度 0–100；每个想法都有命题、最小杀死测试和证伪条件 |
| 实验设计 | `research_design` | 样本量/检验力、条件、随机化、分析计划、威胁、预注册草案 |
| 数据下载 | `research_data` | 下载公开 CSV/TSV/JSON/文本/二进制，或检查本地 CSV；上限 80 MB |
| 统计分析 | `research_stats` | 描述统计、t 检验、ANOVA、卡方、Pearson/Spearman、OLS 回归；报告效应量与 95% CI |
| 质性分析 | `research_qual` | 文本/CSV 分段编码、代码频次、共现、覆盖率和代表性引文 |
| 产物回顾 | `research_board` | 列出当前工作区里的科研产物和路径 |

## 安装状态

已安装到当前 DSH profile，包名 `dsh-research-workbench`，版本 `0.1.2`。宿主工具、系统提示和客户端槽位已注册：

- 输入框下方：`conversation.composer.dock` 出现「研 · 科研台」
- 每个科研工具结果：`tool.call.toolview` 自定义卡片
- 系统提示：`Research workbench (fast path)`

浏览器工具当前被 DSH Web 的登录门挡住，未能截图验证视觉效果；刷新当前页面后应能看到科研台。若没有出现，先确认页面已刷新，再检查浏览器控制台是否有 `slot entry crashed`。

## 快速开始

刷新 DSH 页面，在输入框下方点击任意阶段，例如「检索」：

1. 直接点击：填入提示词并立即执行
2. `Alt+点击`：只填入输入框，自己改完再回车

也可以直接说：

> 用科研工作台检索“大模型审稿偏好”的文献，分析主题和空白，然后给我 5 个可检验想法。

## 快路径约定

插件注入的系统提示要求：

- 一个阶段一次工具调用，先给 3–6 条要点，再给一个下一步决策
- 不重复整段工具输出
- 先报告效应量和 95% CI，再报告 p 值
- 荒诞想法不直接否定：改写成可证伪命题，并给最便宜的杀死测试
- 没有真实返回的数据不冒充已验证

## 产物目录

所有输出都在工作区：

```
research-output/
  index.json
  searches/
  analysis/
  reviews/
  ideas/
  designs/
  stats/
  qual/
  data/
```

每个 JSON 产物旁边通常有 `.md` 版本；综述和设计稿可以直接编辑。索引文件只保留最近 500 条记录。

## 数据源与限制

- OpenAlex / Crossref：无需 API key，适合快速检索；OpenAlex 有共享的每日免费额度。
- PubMed：只拉取元数据（标题/期刊/DOI），摘要需要额外抓取；需要摘要时优先用 OpenAlex/Crossref 的记录。
- arXiv：返回标题/摘要/作者，引用数为 0（arXiv 不提供引用数）。
- 统计：纯 JavaScript 实现，不依赖 scipy；复杂模型（混合效应、结构方程、生存分析）需要另写脚本。
- 质性分析：词典/关键词编码 + 自动码本，不做生成式解释；解释权留给研究者和对话。
- 综述：生成的是结构化初稿与证据表，引用只来自检索结果；具体断言仍需回原文核对。
- 数据下载：拒绝 localhost/私有地址；重定向后的地址也会检查；单文件上限 80 MB。

## 开发

插件源码就在本目录。宿主入口 `index.js`，客户端入口 `client.js`，算法在 `lib/`。修改后如宿主代码未热更新，可在插件管理里禁用再启用，或重启 DSH；客户端代码需要刷新页面。
