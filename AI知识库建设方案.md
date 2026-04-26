---
title: AI 知识库建设方案
type: index
status: draft
created: 2026-04-19
updated: 2026-04-19
tags: [knowledge-base, llm-wiki, rag, obsidian]
aliases: [知识库建设方案, LLM Wiki 方案]
---

# AI 知识库建设方案（基于 Karpathy LLM Wiki 范式）

> [!note] 方案定位
> 以 Andrej Karpathy 2026-04-04 发布的 [LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 为核心范式，结合社区复刻经验（WikiLLM、karpathy-skill 等）与 Obsidian 原生能力，建设一个**可持续自进化**的个人知识库。
>
> 核心口号：**知识编译一次、链接一次，之后只做增量演进。**

---

## 一、为什么不是传统 RAG

| 维度 | 传统 RAG（向量库 + 召回） | LLM Wiki 范式 |
| --- | --- | --- |
| 知识形态 | 分散 chunk，语义向量 | 结构化互联 Markdown |
| 知识生产 | 被动索引，不综合 | LLM 作为"园丁"主动综合、修订 |
| 冲突处理 | 无感知，后入为主 | 显式标记矛盾、保留版本线索 |
| 演进方式 | 每次查询重新发现 | 预编译结构 + 增量增删改 |
| 迁移成本 | 强依赖向量库 | 纯 Markdown，Obsidian / Git 原生 |
| 可读性 | 对人不可读 | 人、Agent 皆可直接阅读 |

**结论**：把 LLM 从"检索答题机"升级为"随身的知识库管理员"。RAG 可作为规模扩张后的兜底检索，但不是一层。

---

## 二、三层架构

参考 Karpathy gist 的核心思想，抽象为三层：

```
┌─────────────────────────────────────────────────────┐
│  模式层 / Schema Layer                              │
│  CLAUDE.md · TEMPLATES/ · SCHEMA.md · 命名约定      │
│  （给 Agent 的"工作手册"，极少改动）                │
├─────────────────────────────────────────────────────┤
│  维基层 / Wiki Layer         ← LLM 完全拥有         │
│  concepts/ entities/ topics/ summaries/ daily/      │
│  （结构化、互链、可综合、可重构）                   │
├─────────────────────────────────────────────────────┤
│  原始资源层 / Sources Layer   ← 只读                │
│  sources/ 剪藏 · 论文 · 会议纪要 · 代码快照等      │
│  （不可变档案，只追加）                             │
└─────────────────────────────────────────────────────┘
```

**关键约束**：
- 三层**物理隔离**（不同目录），避免 LLM 在综合页里夹带原文污染
- 维基层所有页面**必须引用**原始层出处（wikilink + 行号/锚点）
- 模式层变更需走"方案文档更新 → 执行"流程，LLM 不得擅自修改

---

## 三、目录结构

```
rag/
├── AI知识库建设方案.md          # 本文件，入口
├── CLAUDE.md                    # 模式层：Agent 维护 SOP
├── SCHEMA.md                    # 页面 frontmatter 规范
├── TEMPLATES/                   # 新建页面的模板
│   ├── concept.md
│   ├── entity.md
│   ├── source.md
│   └── summary.md
│
├── 00-index/                    # 入口 / MOC（Map of Content）
│   ├── home.md                  # 知识库主页
│   ├── by-topic.md              # 按主题聚合
│   ├── by-entity.md             # 按实体聚合
│   └── orphans.md               # 孤儿页（自动维护）
│
├── concepts/                    # 概念页：抽象知识点
│   └── llm-wiki.md
├── entities/                    # 实体页：人 / 项目 / 组织 / 工具
│   ├── people/
│   ├── projects/
│   └── tools/
├── topics/                      # 主题聚合页：跨概念/实体的叙事线
│   └── agent-knowledge-base.md
├── summaries/                   # 原始资料的摘要页（一对一）
│   └── 2026-04-04-karpathy-llm-wiki.md
│
├── daily/                       # 摄入日志 + 维护日志
│   └── 2026-04-19.md
│
└── sources/                     # 原始资源层，只读
    ├── articles/
    ├── papers/
    ├── meetings/
    └── clippings/
```

**命名规范**：
- 概念 / 实体 / 主题：kebab-case 英文，便于 wikilink 稳定
- 摘要 / 日志：`YYYY-MM-DD-slug.md`
- 中文别名通过 frontmatter `aliases:` 字段提供

---

## 四、页面类型与 Frontmatter 规范

### 4.1 统一 frontmatter 字段

```yaml
---
title:        # 页面标题（人类可读）
type:         # concept | entity | topic | source | summary | index | daily
aliases: []   # 中文别名 / 缩写 / 同义词
tags: []      # 扁平标签（粗粒度归类）
status:       # stub | draft | stable | conflicts | deprecated
confidence:   # low | medium | high（LLM 自评）
sources: []   # 引用的 sources/ 页面 wikilinks（硬约束：须与正文 ## 引用来源 双重登记，见 §4.3）
related: []   # 强关联页面（补充 backlinks 之外的显式关系）
created:      # YYYY-MM-DD
updated:      # YYYY-MM-DD
last_reviewed:# 最后人工/Agent 复核日期
---
```

### 4.2 各类型页面骨架

**concept（概念页）**
- `## 一句话定义`
- `## 展开解释`
- `## 与其他概念的关系`（嵌入 wikilinks）
- `## 引用来源`（sources/*）
- `## 演进记录`（仅当被重大修订时追加）

**entity（实体页）**
- `## 基本信息`（结构化 key/value）
- `## 关键事件 / 里程碑`
- `## 观点与作品`
- `## 关联主题`

**summary（摘要页，一对一对应 sources/）**
- `## 一句话`
- `## TL;DR（3~5 条）`
- `## 核心论点`
- `## 我的加工意图`（"这份资料更新了哪些 concept/entity"）
- `## 原文链接`

**topic（主题聚合页）**
- `## 问题陈述`
- `## 关键子概念`（全是 wikilinks）
- `## 当前共识`
- `## 开放问题 / 争议点`

### 4.3 硬约束：sources 双重登记

任何引用原始资料的页面，**必须**同时在两处登记：

1. **frontmatter 的 `sources:` 数组** —— 供 Properties / Bases / Dataview 结构化查询
2. **正文 `## 引用来源` 段落的 wikilink 列表** —— 供 LLM 顺序阅读时与段落上下文同屏感知

两者任缺其一视为页面不合规。Agent 在维护期若检出缺失，应主动补齐并在 daily 记录。

---

## 五、LLM"知识库管理员"工作流

### 5.1 摄入（Ingest）

触发：新增一份 `sources/` 文件，或粘贴一段内容让 Agent 处理。

```
1. 读取原始资料，放入 sources/ 并登记 frontmatter
2. 生成 summaries/<date>-<slug>.md（摘要页）
3. 抽取候选 concept / entity
4. 【同义收敛前置检查】—— 严禁跳过
   - 扫 00-index/by-topic.md、by-entity.md，以及 concepts/ entities/ 目录下
     所有页面的 frontmatter title / aliases / tags
   - 对每个候选词，逐一判定是否为已有页的同义 / 近义 / 子集 / 特例
   - 判定结果三选一：
     a. 可归并 → 不新建页，仅在既有页增量补充，并把该候选词追加进
        既有页的 aliases
     b. 是子概念 → 不新建页，改为在既有概念页下新增段落，或留作未来
        拆分的 TODO
     c. 确为全新概念 → 才允许建 stub；新 stub 的 aliases 必须登记所有
        可能同义/近义词，防止未来再度重复创建
   - 本步骤的判定理由，一行写入 daily/<today>.md，便于事后审计
5. 执行更新（遵循 §5.4 追加优先约束）：
   - 在目标概念页补充段落，文末追加本次 source wikilink
   - 若与既有断言冲突 → 触发「冲突处理」SOP（见 §6）
6. 追加 daily/<today>.md 一行记录（做了什么、改了哪些页）
7. 最后反向校验：新建 stub 是否已被至少一个 topic/index 引用
```

### 5.2 查询（Retrieve & Synthesize）

```
1. 先扫 00-index/ 与 topics/（入口）
2. 按 wikilink 跳转到概念 / 实体页
3. 若概念页引用了 summaries，可按需回溯到 sources/
4. 综合作答，答案末尾附带 wikilink 引用（可追溯）
5. 若查询过程中发现"知识缺口"，在 daily 里记一条 TODO
```

### 5.3 维护（Maintain，周期性）

| 频率 | 任务 | 产出 |
| --- | --- | --- |
| 每日 | 汇总当日 daily，检查是否有悬挂链接 | daily/*.md |
| 每周 | 孤儿页扫描、stub 页催熟、矛盾巡检 | 00-index/orphans.md 更新 |
| 每月 | 重构主题聚合页，拆分/合并过大概念页 | topics/ 更新 |
| 季度 | 全库反思：删除过期、回写 CLAUDE.md 经验 | SCHEMA / TEMPLATES 调整 |

### 5.4 更新操作约束（追加优先原则）

**背景**：LLM 在"基于已有文档修改"时容易整段重写，造成人工批注、历史演进注释丢失。本节为所有写入操作的硬约束。

| 场景 | 允许的操作 | 禁止的操作 |
| --- | --- | --- |
| 新增一条断言/证据 | 在对应标题段落**追加**新条目或子段 | 整段重写已有文字 |
| 修正错别字 / 格式 | 局部精准替换 | 借机重组周边段落 |
| 补充引用来源 | frontmatter `sources:` + 正文 `## 引用来源` 各追加一条 | 删除或替换已有来源 |
| 与旧断言冲突 | 走 §6 冲突 SOP，用 callout 标记 | 静默覆盖旧断言 |
| 结构性改动（拆/合/改层级） | **仅允许**在月度 / 季度 Refactor 窗口进行，且需显式授权 | 日常摄入顺手重构 |

**执行约定**：
- Agent 的默认编辑模式是 **Append**，不是 **Replace**。
- 结构化追加锚点：`## 演进记录`（概念页）、`## 关键事件 / 里程碑`（实体页）、`## 引用来源`（所有页）——优先把新内容挂到这些段落后。
- 任何一次"非追加"改动（删除 / 替换 / 重排），必须在 daily 当天留痕，说明理由与被改前的要点，以便回滚和审计。
- 若 Agent 判断需要大幅重写，**暂停并请求人工授权**，不得自行越权。

---

## 六、冲突与版本处理

**原则**：LLM **不得静默覆盖**任何既有断言。

当新信息与旧信息冲突：

1. 在目标页用 callout 显式标记：

   ```markdown
   > [!warning] 矛盾点 · 2026-04-19
   > - 旧断言：XX（来源 [[summaries/2026-03-10-foo]]）
   > - 新断言：YY（来源 [[summaries/2026-04-19-bar]]）
   > - 当前裁决：以新为准 / 以旧为准 / 悬而未决
   > - 复核人：Agent · 待人工确认
   ```

2. 页面 frontmatter `status: conflicts`，待人工或 Agent 下次复核时裁决
3. 裁决完成后：保留 callout（作为演进记录），`status` 改回 `stable`

---

## 七、Obsidian 原生能力利用

| 能力 | 用法 |
| --- | --- |
| **Wikilinks** | 所有跨页引用强制使用 `[[...]]`，避免路径硬编码 |
| **Aliases** | frontmatter `aliases:` 支持中英文别名自然写作 |
| **Backlinks** | 每个概念页底部自动展示被引情况，免维护 |
| **Properties** | 把 frontmatter 当结构化字段查询 |
| **Bases (.base)** | 构建"stub 页清单""conflicts 清单""最近更新"等视图，替代 orphans.md 的手工维护 |
| **Canvas (.canvas)** | 给 topics 画跨概念关系图，辅助 LLM 理解 |
| **Templates** | 配合核心插件 Templater，一键生成符合 SCHEMA 的骨架 |

计划在 [00-index/](00-index/) 同级维护 3 个 `.base` 视图：
- `stubs.base` — status=stub 的页面
- `conflicts.base` — status=conflicts 的页面
- `stale.base` — last_reviewed 超过 90 天的页面

---

## 八、迭代路线图

### Phase 0 · 骨架（本周）
- [ ] 按 §3 创建目录骨架 + `CLAUDE.md` + `SCHEMA.md`
- [ ] 编写 4 份 `TEMPLATES/*.md`
- [ ] 写第一个 summary：`2026-04-04-karpathy-llm-wiki.md`
- [ ] 首批 concept：`llm-wiki`、`rag`、`agent-knowledge-base`

### Phase 1 · 日常摄入闭环（2~4 周）
- [ ] 打磨"摄入 SOP"，每周至少 3 份 source 入库
- [ ] 搭建 3 个 `.base` 视图
- [ ] `daily/` 形成稳定写入习惯

### Phase 2 · Agent 自治维护（1~2 月）
- [ ] 把 `CLAUDE.md` 升级为可被 Claude Code 按 skill 调用的 SOP
- [ ] 引入周度 `/maintain` 指令：扫孤儿 + 扫冲突 + 写周报到 `daily/`
- [ ] 概念页密度达到阈值后，开始月度重构

### Phase 3 · 外挂与融合（按需）
- [ ] 当 wiki 规模 > 数百页，再考虑把 `summaries/` + `sources/` 挂 RAG 做兜底检索
- [ ] 探索把 `.canvas` 作为 Agent 可读的关系图输入
- [ ] 评估是否把核心 wiki 同步到云端 Agent（可作为 [[entities/projects/aios]] 的个人知识模块）

---

## 九、与 AIOS 项目的衔接

> 你正在建设 [[entities/projects/aios|AIOS]]，本知识库的一条长期价值线是：**验证"Agent + 持久化结构化知识"的工程形态**。

- 短期：本 rag/ 目录作为 AIOS 内部"个人知识模块"的原型场地
- 中期：SCHEMA.md + CLAUDE.md 的 SOP 若稳定，可以产品化为 AIOS 的一个内置 skill
- 长期：Wiki 层本身可以作为 AIOS 多 Agent 共享的"共同记忆"底座

---

## 十、下一步

待你确认后，我将按 Phase 0 一次性生成：

1. `rag/CLAUDE.md` — Agent 维护 SOP（最重要，决定后续一致性）
2. `rag/SCHEMA.md` — frontmatter 与命名规范
3. `rag/TEMPLATES/*.md` + 核心目录骨架（空 index 页）
4. 第一份示例 summary：Karpathy LLM Wiki gist

如有调整意见（目录结构 / 命名风格 / 语言比例 / 阶段节奏），在动手前先说。

