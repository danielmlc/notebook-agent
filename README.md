# 📚 Notebook Agent — AI 驱动的个人知识库

> **知识编译一次、链接一次，之后只做增量演进。**

基于 [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 范式构建的**结构化、可持续自进化**的个人知识库。以 LLM 作为「知识库管理员」，通过标准化的摄入、综合与维护流程，将碎片化信息编译为互链互引的知识网络。

---

## ✨ 核心特性

- 🏗️ **三层架构** — 模式层 / 维基层 / 原始资源层物理隔离，职责清晰
- 🤖 **多模型兼容** — Claude / Gemini / Codex / Cursor / Windsurf 等均可作为知识管理 Agent
- 📥 **标准化摄入流程** — 支持文章、笔记、网页收藏、代码文档四种来源类型
- 🔄 **代码文档版本化** — 同一份代码文档的多版本迭代对账、差异追踪与冲突标记
- 🔗 **知识互链** — Obsidian Wikilink 驱动的实体-概念-主题三级知识图谱
- ⚡ **追加优先** — 严禁静默覆盖，所有变更可追溯、可审计
- 🛡️ **冲突治理** — 新旧断言矛盾时显式标记，保留版本线索

---

## 📂 目录结构

```
notebook-agent/
├── AI知识库建设方案.md       # 项目蓝图与设计决策
│
│── CLAUDE.md                # ⚙️ Agent 维护 SOP（模式层 · 主文件）
│── AGENTS.md                # ⚙️ CLAUDE.md 等价副本（供 Codex / Hermes 等读取）
│── INGEST.md                # ⚙️ 资料摄入权威流程（模式层）
│── SCHEMA.md                # ⚙️ Frontmatter 与命名规范（模式层）
├── TEMPLATES/               # ⚙️ 新建页面的 Markdown 模板
│   ├── concept.md
│   ├── entity.md
│   ├── source.md
│   ├── summary.md
│   ├── topic.md
│   └── daily.md
│
├── 00-index/                # 🗂️ 入口索引（Map of Content）
│   ├── home.md              #    知识库主页
│   ├── by-topic.md          #    按主题聚合
│   ├── by-entity.md         #    按实体聚合
│   └── orphans.md           #    孤儿页追踪
│
├── concepts/                # 💡 概念页：抽象知识点
│   ├── foundations/         #    元方法论 / 范式 / 理论
│   ├── patterns/            #    可复用设计模式 / 工程实践
│   └── domains/             #    业务领域知识
│
├── entities/                # 🏢 实体页：人 / 项目 / 工具
│   ├── people/
│   ├── projects/
│   └── tools/
│
├── topics/                  # 🧭 主题聚合页：跨概念/实体的叙事线
├── summaries/               # 📝 原始资料的摘要页（与 sources/ 一对一）
├── daily/                   # 📅 摄入日志 + 维护日志
│
└── sources/                 # 📦 原始资源层（只读、只追加）
    ├── articles/            #    行业文章 / gist
    ├── papers/              #    代码文档
    ├── meetings/            #    个人笔记 / 会议纪要
    └── clippings/           #    网页收藏
```

---

## 🚀 快速上手

### 1. 配置 Agent

本知识库设计为 **AI Agent 驱动**，你需要一个支持读取 SOP 文件的 AI 编码助手：

| Agent / 客户端 | 读取文件 |
| --- | --- |
| Claude Code | `CLAUDE.md` |
| Gemini CLI | `AGENTS.md`（或软链为 `GEMINI.md`）|
| OpenAI Codex / Hermes | `AGENTS.md` |
| Cursor | 复制为 `.cursorrules` |
| Windsurf | 复制为 `.windsurfrules` |

### 2. 摄入资料

最常见的用法是**在 chat 窗口粘贴一段内容**，Agent 会自动按 `INGEST.md` 流程处理：

```
👤 用户：[粘贴一篇文章]
🤖 Agent：
   ✅ 摄入完成：[[2026-04-26-example-article]]
   - 改了 2 个页面：[[concept-a]] [[entity-b]]
   - 新建了 1 个 stub：[[new-concept]]
   - daily：已记录到 [[2026-04-26]]
```

### 3. 查询知识

Agent 会先扫描索引和主题页，沿 Wikilink 跳转到概念/实体页，综合作答并附带引用。

### 4. 周期维护

Agent 按日/周/月/季度频率执行维护任务：悬挂链接检查、孤儿页清理、stub 催熟、冲突巡检等。

---

## 🏛️ 三层架构

```
┌─────────────────────────────────────────────────────┐
│  模式层 / Schema Layer          👁️ Agent 只读       │
│  CLAUDE.md · AGENTS.md · INGEST.md · SCHEMA.md      │
│  TEMPLATES/（Agent 工作手册，极少改动）              │
├─────────────────────────────────────────────────────┤
│  维基层 / Wiki Layer            ✏️ Agent 读写       │
│  concepts/ entities/ topics/ summaries/ daily/       │
│  00-index/（结构化、互链、可综合、可重构）          │
├─────────────────────────────────────────────────────┤
│  原始资源层 / Sources Layer     📎 只追加            │
│  sources/（不可变档案，完整保留原文）                │
└─────────────────────────────────────────────────────┘
```

---

## 📋 模式层文件说明

| 文件 | 职责 |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Agent 维护 SOP 主文件：角色定义、三大工作流、冲突处理、硬约束红线 |
| [`AGENTS.md`](AGENTS.md) | `CLAUDE.md` 等价副本，供非 Claude 系 Agent 读取 |
| [`INGEST.md`](INGEST.md) | 资料摄入的**唯一权威流程**：标准摄入 + 代码文档版本化摄入 |
| [`SCHEMA.md`](SCHEMA.md) | Frontmatter 字段定义、命名规范、页面骨架、版本化字段语义 |
| [`TEMPLATES/`](TEMPLATES/) | 六种页面类型的 Markdown 模板 |

---

## 🔑 关键设计决策

### 为什么不用传统 RAG？

| 维度 | 传统 RAG | LLM Wiki 范式 |
| --- | --- | --- |
| 知识形态 | 分散 chunk + 向量 | 结构化互联 Markdown |
| 知识生产 | 被动索引 | LLM 主动综合与修订 |
| 冲突处理 | 无感知 | 显式标记矛盾 |
| 可迁移性 | 依赖向量库 | 纯 Markdown + Git |
| 可读性 | 人不可读 | 人与 Agent 皆可读 |

### 追加优先 (Append-first)

Agent 默认编辑模式为 **Append**（追加），而非 Replace（替换）。任何非追加改动需在 daily 留痕说明理由。结构性重构仅允许在月度/季度窗口进行，且需人工授权。

### 同义收敛

创建新概念/实体页前，**必须**执行同义收敛前置检查，避免重复建页。每个新 stub 的 `aliases` 必须登记所有可能的同义/近义词。

---

## 📊 当前状态

> 最后更新：2026-04-26

| 指标 | 数量 |
| --- | --- |
| 概念页 (concepts) | 3（foundations 层） |
| 实体页 (entities) | 2（1 项目 + 1 工具） |
| 主题页 (topics) | 1 |
| 摘要页 (summaries) | 2 |
| 原始资料 (sources) | 1 |
| 每日日志 (daily) | 2 |

**Phase 进度**：Phase 0 骨架 ✅ → Phase 1 日常摄入闭环 🚧

---

## 🗺️ 迭代路线图

### Phase 0 · 骨架搭建 ✅
- [x] 目录骨架 + 模式层文件（CLAUDE.md / SCHEMA.md / TEMPLATES/）
- [x] 首批概念 stub：`llm-wiki` / `rag` / `agent-knowledge-base`
- [x] 首份 summary：Karpathy LLM Wiki gist
- [x] 首份代码文档摄入：`@cs/nest-redis`

### Phase 1 · 日常摄入闭环 🚧
- [x] 摄入流程权威文档（INGEST.md）
- [x] 多模型兼容声明（AGENTS.md）
- [x] 代码文档版本化机制（SCHEMA.md §7）
- [x] concepts/ 分层目录（foundations / patterns / domains）
- [x] 首个 topic 综合聚合页
- [ ] 每周至少 3 份 source 入库
- [ ] `.base` 视图（stubs / conflicts / stale）
- [ ] daily 稳定写入习惯

### Phase 2 · Agent 自治维护
- [ ] `/maintain` 指令：自动扫孤儿 + 扫冲突 + 写周报
- [ ] 概念页密度达到阈值后启动月度重构

### Phase 3 · 外挂与融合
- [ ] 规模 > 数百页后挂 RAG 做兜底检索
- [ ] `.canvas` 作为 Agent 可读关系图
- [ ] 与 AIOS 项目知识模块对接

---

## 📄 许可

本仓库为个人知识库项目，仅供学习与参考。