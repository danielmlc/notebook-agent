---
title: AI 知识库建设方案
date: 2026-04-06
tags:
  - arch/knowledge-base
  - type/decision
  - dev/backend
aliases:
  - Karpathy AI 知识库
  - 个人维基方案
status: planning
---

# AI 知识库建设方案

> [!abstract] 概述
> 参照 Andrej Karpathy 提出的 AI 知识库方法，构建一套**以 LLM 为核心编译器**的个人知识管理系统。核心理念：人类只负责提供"信息源"和提出"问题"，大模型承担"知识建构者"和"维基编辑"的角色，最终形成一个能自我迭代的自动化个人智库。

---

## 一、核心理念

```mermaid
graph LR
    A[原始数据 Raw] -->|文件监听| B[AI 编译服务]
    B -->|摘要/分类/链接| C[结构化 Wiki]
    C -->|语义搜索| D[知识查询]
    D -->|回写新见解| C
    style B fill:#f9f,stroke:#333
```

1. **原始数据收集**：将所有资料扔进 `10-Raw/`，不需要手动分类
2. **AI 自动编译**：LLM 自动摘要、分类、打标签、建立双向链接
3. **前端可视化**：通过 Obsidian 浏览结构化的知识图谱
4. **闭环进化**：每次查询的新见解自动回写，知识库持续生长

---

## 二、Vault 目录结构

```
Obsidian-NoteBook/
├── 00-Inbox/              # 临时收件箱，快速记录
├── 10-Raw/                # 原始语料区（AI 编译的输入源）
│   ├── articles/          # 网页文章、技术文章
│   ├── papers/            # PDF 论文
│   ├── docs/              # 办公文件、管理制度
│   └── misc/              # 杂项文件
├── 20-Wiki/               # AI 编译输出区（自动生成的结构化知识）
│   ├── dev/               # 开发知识维基
│   ├── architecture/      # 架构设计维基
│   ├── devops/            # 运维部署维基
│   ├── management/        # 管理制度维基
│   └── concepts/          # 通用概念维基
├── 30-Projects/           # 项目相关
│   ├── aios/              # AIOS 项目
│   └── ...
├── 40-Blog/               # 个人技术博客
├── 50-Personal/           # 个人私密笔记
│   ├── accounts/          # 账号信息
│   ├── finance/           # 财务记录
│   └── journal/           # 日记/随记
├── 60-Templates/          # 模板区
├── rag/                   # RAG 相关方案与文档
├── 工作方案/               # 已有目录保留
└── _assets/               # 附件、图片
```

> [!tip] 编号前缀的作用
> 使用 `00-` `10-` 这样的编号前缀，可以在文件管理器中保持固定排序，同时语义清晰。

---

## 三、标签体系

采用**层级标签 + 状态标签**双轨制：

### 领域标签（用 `/` 分层）

| 分类 | 标签 |
|------|------|
| 开发 | `#dev/frontend` `#dev/backend` `#dev/database` `#dev/devops` |
| 架构 | `#arch/microservice` `#arch/gateway` `#arch/distributed` |
| 管理 | `#mgmt/policy` `#mgmt/process` |

### 内容类型标签

| 标签 | 含义 |
|------|------|
| `#type/guide` | 指南教程 |
| `#type/reference` | 参考资料 |
| `#type/decision` | 决策记录 |
| `#type/blog` | 博客文章 |
| `#type/raw` | 原始语料 |

### 状态标签

| 标签 | 含义 |
|------|------|
| `#status/raw` | 未处理 |
| `#status/compiled` | AI 已编译 |
| `#status/reviewed` | 人工已审阅 |

### 来源标签

`#source/web` `#source/paper` `#source/yuque` `#source/wechat`

---

## 四、系统架构

```
┌─────────────────────────────────────────────────────┐
│                  日常工作流                            │
│  浏览器 / 语雀 / 微信 / VS Code / 本地文件              │
└──────────────┬──────────────────────────────────────┘
               │ 手动或脚本丢进来
               ▼
┌──────────────────────┐
│   10-Raw/ 原始语料区   │  ← Obsidian Vault 内
└──────────┬───────────┘
           │ 文件监听 (chokidar)
           ▼
┌──────────────────────────────────────┐
│       AI 编译服务 (Node.js)           │  ← 部署在 Ubuntu 服务器
│                                      │
│  1. 文件解析 (PDF/MD/HTML)            │
│  2. 调用 LLM API 摘要+分类+打标签      │
│  3. 生成结构化 Wiki MD 文件            │
│  4. 自动建立双向链接                    │
│  5. 生成 Embedding 存入 SQLite        │
└──────────┬───────────────────────────┘
           │ 输出
           ▼
┌──────────────────────┐
│  20-Wiki/ AI维基区     │  ← 结构化知识，AI 自动维护
└──────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│       语义搜索服务 (轻量 API)          │
│  SQLite + Embedding 向量检索          │
│  + Obsidian 插件对接                  │
└──────────────────────────────────────┘
```

---

## 五、技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 编译服务 | Node.js + TypeScript | 技术栈匹配，快速上手 |
| LLM API | 智谱 GLM-4 / MiniMax | 国产、性价比高、中文效果好 |
| 文件解析 | `pdf-parse` + `defuddle` + `marked` | 覆盖 PDF/HTML/MD 三种主要格式 |
| 向量存储 | **SQLite + sqlite-vss** | 2GB 服务器完全够用，无需额外服务 |
| Embedding | 智谱 Embedding API | 和 LLM 用同一家，统一管理 |
| 文件监听 | `chokidar` | Node.js 生态成熟方案 |
| 定时任务 | `node-cron` | 轻量，每天定时全量巡检 |
| Obsidian 搜索 | Omnisearch 插件 + 自定义插件 | 本地全文搜索 + 语义搜索 |

> [!warning] 服务器资源约束
> 服务器仅 2GB 内存 / 4 核，因此选择 SQLite 而非 Milvus/Chroma 等独立向量数据库。sqlite-vss 扩展可以在 SQLite 内直接做向量相似度搜索，资源占用极低。

---

## 六、核心 Prompt 设计

### 编译 Prompt

```typescript
const COMPILE_PROMPT = `
你是一个知识库编译器。请阅读以下原始资料，完成：

1. **摘要**：用 3-5 句话概括核心内容
2. **分类**：从以下目录中选择最合适的归属：
   dev/, architecture/, devops/, management/, concepts/
3. **标签**：从标签体系中选择 2-5 个合适标签
4. **关键概念**：提取 3-10 个关键术语
5. **关联**：根据以下已有 Wiki 页面列表，找出相关页面并生成 [[wikilink]]
6. **Wiki 正文**：将内容改写为结构清晰的知识条目

已有 Wiki 页面：
{{existingPages}}

原始资料：
{{rawContent}}

输出格式为 Obsidian Markdown，包含 YAML frontmatter。
`;
```

### 输出模板

```markdown
---
title: {{标题}}
date: {{日期}}
tags:
  - {{标签1}}
  - {{标签2}}
source: {{原始文件路径}}
compiled_at: {{编译时间}}
status: compiled
---

# {{标题}}

## 摘要

{{3-5 句话的核心总结}}

## 关键概念

- **{{概念1}}**：{{简述}}
- **{{概念2}}**：{{简述}}

## 详细内容

{{结构化的知识条目正文}}

## 关联知识

- [[相关页面1]]
- [[相关页面2]]

## 原始来源

![[10-Raw/articles/原始文件.md]]
```

---

## 七、实施路线

### 阶段一：基础设施（1-2 天）

- [ ] 重新组织 Vault 目录结构
- [ ] 安装 Obsidian 插件（Omnisearch、Templater、Dataview）
- [ ] 建立笔记模板（Raw 模板、Wiki 模板）
- [ ] 将已有散落笔记粗分到新目录

### 阶段二：编译管道 MVP（3-5 天）

- [ ] 初始化 `kb-compiler` Node.js 项目
- [ ] 实现文件解析器（先支持 MD 和 PDF）
- [ ] 对接 LLM API，实现核心编译 Prompt
- [ ] 输出 Wiki MD 文件到 `20-Wiki/`
- [ ] 基础测试：手动丢几篇文章验证效果

### 阶段三：搜索与自动化（3-5 天）

- [ ] 集成 Embedding API，建立向量索引
- [ ] 搭建轻量 HTTP 搜索接口
- [ ] 配置 `chokidar` 监听 `10-Raw/` 自动触发编译
- [ ] 配置 `node-cron` 每晚全量巡检
- [ ] （可选）Obsidian 插件或 URI 打通搜索

### 阶段四：闭环进化（持续迭代）

- [ ] 实现"查询回写"：问答结果自动存回 Wiki
- [ ] 接入更多数据源（语雀 API 自动拉取、浏览器扩展一键收藏）
- [ ] 周报自动生成：AI 基于本周新增 Wiki 生成周报
- [ ] 知识图谱可视化优化

---

## 八、成本估算

> [!info] 基于每周 ~10 篇原始语料

| 项目 | 月成本 |
|------|--------|
| 智谱 GLM-4 API（编译 + 问答） | ≈ ¥20-50 |
| 智谱 Embedding API | ≈ ¥5-10 |
| Ubuntu 服务器 | 已有 |
| Obsidian | 免费（本地使用） |
| **合计** | **≈ ¥25-60/月** |

---

## 九、风险与应对

| 风险 | 应对措施 |
|------|----------|
| LLM 分类不准确 | 初期人工审阅校正，积累 few-shot 示例 |
| 服务器内存不足 | 控制并发数为 1，逐篇处理 |
| 双向链接质量低 | 定期人工巡检，优化 Prompt |
| 隐私数据泄露 | `50-Personal/` 目录不参与编译，配置排除规则 |
