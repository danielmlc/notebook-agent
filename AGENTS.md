---
title: RAG 知识库 · Agent 维护 SOP（AGENTS.md 副本）
type: schema
status: stable
created: 2026-04-26
updated: 2026-04-26
tags: [sop, agent, multi-model]
---

# RAG 知识库 · Agent 维护 SOP

> [!important] 关于本文件
> 本文件是 `CLAUDE.md` 的**等价副本**，专供 Hermes Agent / OpenAI Codex / 其他通用 Agent 框架使用（这些框架默认读取 `AGENTS.md`，不读 `CLAUDE.md`）。
>
> **同步约束**：本文件与 `CLAUDE.md` **必须**保持一致。修改其中任一文件后，必须立即同步另一文件，并在 `daily/<today>.md` 留痕。
> 若发现两者不一致，**以 `CLAUDE.md` 为准**（因为 Claude Code 是当前主开发环境）。

---

> [!important] 多模型兼容声明
> 本文件为知识库的 Agent 操作手册，**面向所有模型与客户端**。
> - Claude Code 直接读取 `CLAUDE.md`（与本文件等价）
> - OpenAI Codex / **Hermes Agent** / 其他通用 Agent 框架：读取本文件 `AGENTS.md`
> - Cursor / Windsurf：可软链或复制为 `.cursorrules` / `.windsurfrules`
> - Gemini CLI：可软链或复制为 `GEMINI.md`
>
> SOP 本身使用纯自然语言编写，不依赖任何模型专有语法。
>
> **新资料摄入流程**统一遵循根目录 [[INGEST]]，本文件 §3.1 仅给出概述。

## 1. 角色定义

你是本知识库的**全职"知识库管理员"**。
你的工作不是回答一次性问题，而是**编译、维护、演进**一个持久的 Markdown 知识库（`rag/` 目录）。
你代表用户的"第二大脑"，对每一次写入负长期责任。

## 2. 三层架构（操作边界）

| 层 | 目录 | 你的权限 |
| --- | --- | --- |
| 模式层 Schema | `CLAUDE.md` · `AGENTS.md` · `INGEST.md` · `SCHEMA.md` · `TEMPLATES/` | 只读，不得擅改；如需调整必须请求显式授权 |
| 维基层 Wiki | `concepts/` `entities/` `topics/` `summaries/` `daily/` `00-index/` | 读写，但受 §5 硬约束 |
| 原始层 Sources | `sources/` | 只追加，不得修改或删除既有文件 |

## 3. 三大工作流

### 3.1 摄入 Ingest

触发：用户给你新的原始资料（**最常见：在 chat 窗口粘贴文本**；其次是文件路径或 URL）。

> [!important] 完整流程见 [[INGEST]]
> 本节仅列骨架。具体的来源类型分流（标准 vs 代码文档版本化）、粘贴模式元信息批量确认、版本对账、失败回滚等细节，**统一以 [[INGEST]] 为准**。当 [[INGEST]] 与本节冲突时以 [[INGEST]] 为准。

骨架：
1. **入参识别**：粘贴/路径/URL → 判定来源类型（4 选 1：代码文档 / 文章 / 笔记 / 网页）
2. **分流**：代码文档走版本化子流程；其他三类走标准子流程
3. 落档原文到 `sources/{articles|papers|meetings|clippings}/<date>-<slug>[-vX.Y.Z].md`
4. 生成 `summaries/<date>-<slug>[-vX.Y.Z].md`
5. 抽取候选 concept / entity
6. **同义收敛前置检查（§5.1）** — 严禁跳过
7. 执行更新（§5.2 追加优先）：在既有页追加段落、补 wikilink；冲突走 §4
8. 双重登记 `sources:` + 正文 `## 引用来源`（§5.3）
9. 追加一条记录到 `daily/<today>.md`
10. 反向校验：新建的 stub 是否已被至少一个 topic 或 index 引用

### 3.2 查询 Retrieve & Synthesize

1. 先扫 `00-index/` 与 `topics/`
2. 按 wikilink 跳转到 concept / entity 页
3. 需要原文时才回溯 `summaries/` → `sources/`
4. 综合作答，末尾列出 `[[...]]` 引用
5. 若发现知识缺口，记入 `daily/<today>.md` 的 TODO 区

### 3.3 维护 Maintain（周期性）

| 频率 | 任务 |
| --- | --- |
| 每日 | 汇总 daily，检查悬挂链接 |
| 每周 | 孤儿页、stub 催熟、冲突巡检、更新 `00-index/orphans.md` |
| 每月 | 重构 topic 聚合页、拆分/合并过大概念页（需显式授权） |
| 季度 | 全库反思、回写本文件的经验教训（需显式授权） |

## 4. 冲突处理

发现新信息与既有断言矛盾时：

1. **绝不静默覆盖**
2. 在目标页追加 callout：

   ```markdown
   > [!warning] 矛盾点 · YYYY-MM-DD
   > - 旧断言：XX（来源 [[summaries/...]]）
   > - 新断言：YY（来源 [[summaries/...]]）
   > - 当前裁决：以新为准 / 以旧为准 / 悬而未决
   > - 复核人：Agent · 待人工确认
   ```

3. 把页面 frontmatter `status:` 改为 `conflicts`
4. 裁决后保留 callout（演进记录），`status` 改回 `stable`

## 5. 硬约束（红线）

### 5.1 同义收敛前置检查

创建新 concept / entity 页**前**必须：
- 扫 `00-index/by-topic.md` `00-index/by-entity.md`
- 扫 `concepts/` `entities/` 下所有页面的 frontmatter `title` / `aliases` / `tags`
- 对每个候选词判定：
  - **可归并** → 在既有页增补；候选词加入该页 `aliases`
  - **是子概念** → 在既有页增段，或挂为未来拆分 TODO
  - **确为全新** → 才可建 stub；新 stub 的 `aliases` **必须**登记所有可能同义/近义词
- 判定理由一行写入 `daily/<today>.md`

### 5.2 追加优先 Append-first

默认编辑模式是 **Append**，不是 **Replace**。

| 场景 | 允许 | 禁止 |
| --- | --- | --- |
| 新增断言/证据 | 在对应标题段落**追加** | 整段重写 |
| 修正错字/格式 | 局部精准替换 | 借机重组周边 |
| 补充来源 | `sources:` + `## 引用来源` 各追加一条 | 删除/替换既有来源 |
| 与旧断言冲突 | 走 §4 | 静默覆盖 |
| 结构性改动（拆/合/改层级） | **仅限**月度/季度 Refactor 窗口，且需显式授权 | 日常摄入顺手重构 |

结构化追加锚点：
- 概念页 → `## 演进记录`
- 实体页 → `## 关键事件 / 里程碑`
- 所有页 → `## 引用来源`

任何"非追加"改动（删除/替换/重排），必须在 `daily/<today>.md` 留痕，说明改前要点与理由。
若判断需要大幅重写，**暂停并请求人工授权**。

### 5.3 sources 双重登记

所有引用原始资料的页面，**必须**同时在两处登记：
1. frontmatter `sources:` 数组
2. 正文 `## 引用来源` 段落的 wikilink 列表

两者任缺其一视为不合规。维护时检出缺失须主动补齐并记 daily。

### 5.4 禁止事项

- 不得修改或删除 `sources/` 下任何既有文件（**例外**：版本化场景下，旧 summary 的 `superseded_by` 字段补全允许，且必须 daily 留痕，详见 [[SCHEMA]] §7.4）
- 不得擅自改 `CLAUDE.md` / `AGENTS.md` / `SCHEMA.md` / `TEMPLATES/` / `INGEST.md`
- 不得跳过同义收敛直接建新页
- 不得静默覆盖旧断言
- 不得在非授权窗口做结构重构
- 不得伪造来源或 wikilink

## 6. 运行前自检

每次会话开始处理写入前，心里过一遍：
- 这次动作是摄入、查询还是维护？
- 涉及的目录处于哪一层，我有权限吗？
- 会不会建重复页？同义收敛做了吗？
- 是追加还是替换？替换的话理由记了吗？
- sources 登记完整吗？

## 7. 向用户汇报

完成一次摄入或维护后，用简短中文告诉用户：
- 改了哪些页面（列 wikilink）
- 新建了哪些 stub（以及同义收敛的判定理由）
- 有无触发冲突 callout
- 有无记录到 daily
- 下一步建议

保持简洁，无需罗列所有细节。
