# 科研工作台（dsh-research-workbench）

一个装进 DSH 对话里的科研快路径插件：检索文献、读文献、写综述、头脑风暴、设计实验、下载数据、跑统计、做质性编码。每一步都通过对话完成，工具结果用可视化卡片渲染。

## 功能

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

## 环境要求

- DeepSeek Harness Web（当前验证版本：DSH 0.2.x）
- Node.js 20+
- 不需要额外 npm 依赖，也不需要构建步骤

## 安装

本仓库是完整的本地 bundle 包，包含 `dsh.bundle.patch` 和 `dsh.client` 声明。

1. 克隆仓库到本地：

```bash
git clone https://github.com/<你的用户名>/dsh-research-workbench.git
```

2. 在 DSH 对话里让 Agent 安装这个本地 bundle，并把路径替换成实际目录：

> 使用 plugin_manager 的 install_bundle，target 指向 `<你的路径>/dsh-research-workbench`

3. 安装成功后刷新 DSH 页面。输入框下方应该出现「研 · 科研台」。

> 安装本地 bundle 可能需要 DSH 的 Full access 或一次安装批准。这个插件没有安装脚本，不需要批准 build script。

## 使用

点击科研台里的阶段：

- 直接点击：填入该阶段的提示词并立即执行
- `Alt + 点击`：只填入输入框，修改后自己回车
- 「产物」：查看当前工作区里生成的科研文件

也可以直接说：

> 用科研工作台检索“大模型审稿偏好”的文献，分析主题和空白，然后给我 5 个可检验想法。

## 快路径约定

插件会注入一段系统提示，要求：

- 一个阶段一次工具调用，先给 3–6 条要点，再给一个下一步决策
- 不重复整段工具输出
- 先报告效应量和 95% CI，再报告 p 值
- 荒诞想法不直接否定：改写成可证伪命题，并给最便宜的杀死测试
- 没有真实返回的数据不冒充已验证

## 产物目录

所有输出都在 DSH 当前工作区：

```text
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

每个 JSON 产物旁边通常有 `.md` 版本；综述和设计稿可以直接编辑。索引文件只保留最近 500 条记录。`research-output/` 已加入 `.gitignore`，不会被提交到仓库。

## 数据源与限制

- OpenAlex / Crossref：无需 API key，适合快速检索；OpenAlex 有共享的每日免费额度。
- PubMed：只拉取元数据（标题/期刊/DOI），摘要需要额外抓取；需要摘要时优先用 OpenAlex/Crossref 的记录。
- arXiv：返回标题/摘要/作者，引用数为 0（arXiv 不提供引用数）。
- 统计：纯 JavaScript 实现，不依赖 scipy；复杂模型（混合效应、结构方程、生存分析）需要另写脚本。
- 质性分析：词典/关键词编码 + 自动码本，不做生成式解释；解释权留给研究者和对话。
- 综述：生成的是结构化初稿与证据表，引用只来自检索结果；具体断言仍需回原文核对。
- 数据下载：拒绝 localhost/私有地址；重定向后的地址也会检查；单文件上限 80 MB。

## 开发

```text
index.js         宿主入口：工具、系统提示、文件存储
client.js        客户端入口：科研台 dock、工具结果卡片
lib/lit.js       文献检索、筛选、分析、综述
lib/ideas.js     头脑风暴与可证伪想法
lib/design.js    样本量、检验力、实验设计
lib/math.js      统计检验与效应量
lib/qual.js      质性编码
lib/data.js      数据下载与检查
lib/io.js        工作区存储、CSV、索引
locale/          插件元数据的中英文标题和描述
icon.svg         插件图标
```

改完代码后：

- 宿主代码：在插件管理里禁用再启用，或重启 DSH
- 客户端代码：刷新页面

## License

MIT
