---
title: 知识库 · Frontmatter 与命名规范
type: schema
status: stable
created: 2026-04-19
updated: 2026-04-26
tags: [schema, convention]
---

# Frontmatter 与命名规范

> 本文件规定所有 wiki 层页面的元数据与命名。改动前请阅读 [[AI知识库建设方案]] §4。

## 1. 统一 frontmatter 字段

字段名全部英文，值允许中文。除模板文件与索引占位外，所有页面必须有 frontmatter。

| 字段 | 必选 | 类型 | 说明 |
| --- | --- | --- | --- |
| `title` | 是 | string | 人类可读标题，可中文 |
| `type` | 是 | enum | `concept` \| `entity` \| `topic` \| `source` \| `summary` \| `index` \| `daily` \| `schema` |
| `aliases` | 概念/实体页强烈建议 | list | 中英别名、同义词、缩写 |
| `tags` | 是 | list | 扁平标签，粗粒度归类 |
| `status` | 是 | enum | `stub` \| `draft` \| `stable` \| `conflicts` \| `deprecated` |
| `confidence` | 否 | enum | `low` \| `medium` \| `high`（LLM 自评） |
| `sources` | 摘要/概念/实体页必选 | list | 引用的 `sources/` 页 wikilink |
| `related` | 否 | list | 显式强关联页 |
| `created` | 是 | date | `YYYY-MM-DD` |
| `updated` | 是 | date | `YYYY-MM-DD` |
| `last_reviewed` | 推荐 | date | 最近复核日 |
| `version` | 代码文档版本化场景必选 | string | 资料版本号，如 `2.0.0`；详见 §7 |
| `supersedes` | 版本化新版必选 | wikilink | 我替代了哪个旧版页面 |
| `superseded_by` | 版本化旧版被替代后必填 | wikilink | 我被哪个新版页面替代 |

### 1.1 sources 字段豁免

- `status: stub` 的页面 **允许** `sources: []`（占位期可暂缺）
- 一旦 `status` 升级到 `draft` 或更高，`sources` 必须非空，否则不合规
- `summary` 类型不享受豁免，建页即必须挂 source

## 2. status 生命周期

```
stub ──撰写──▶ draft ──多次复核──▶ stable
                                    │
                                    ├──发现矛盾──▶ conflicts ──裁决──▶ stable
                                    │
                                    └──过期/合并──▶ deprecated
```

- `stub`：已建页但内容仅 1~2 行，占位
- `draft`：主体已写，未经二次复核
- `stable`：至少复核过一次，可作为查询入口
- `conflicts`：存在待裁决矛盾，见 [[CLAUDE]] §4
- `deprecated`：已过期或合并到别页，保留链接不删除

## 3. 命名规范

| 对象 | 规则 | 例 |
| --- | --- | --- |
| 概念 / 实体 / 主题文件名 | `kebab-case` 英文 | `llm-wiki.md` |
| 摘要 / 日志文件名 | `YYYY-MM-DD-slug.md` | `2026-04-04-karpathy-llm-wiki.md` |
| 中文标题 | 通过 `title` 与 `aliases` 提供 | — |
| wikilink | 一律使用 `[[filename]]` 或 `[[filename\|显示文字]]` | `[[llm-wiki\|LLM Wiki]]` |
| tag | 小写英文，短横线连接 | `knowledge-base` |

### 3.1 concepts/ 分层目录语义

> 当概念数量超过 ~5 个就必须分层，否则平铺会失控。建概念 stub 时按下表选目录：

| 子目录 | 收录 | 例 |
| --- | --- | --- |
| `concepts/foundations/` | **元方法论 / 范式 / 理论** —— 关于"如何做"或"为什么这样想"的抽象 | `llm-wiki` `rag` `agent-knowledge-base` |
| `concepts/patterns/` | **可复用的设计模式 / 工程实践** —— 在多份资料里反复出现的"套路" | `nestjs-dynamic-module` `event-driven-architecture` |
| `concepts/domains/` | **业务领域知识** —— 特定行业 / 业务场景的概念 | `oauth2-flow` `microservices-saga` |

> 拿不准 → 默认放 `foundations/`（元层是兜底层）。后期如发现归类不当，进入月度 refactor 窗口迁移。
>
> wikilink 按 basename 解析（如 `[[llm-wiki]]`），子目录变化**不破坏既有链接**。

## 4. 各类型页面骨架

### concept

```
## 一句话定义
## 展开解释
## 与其他概念的关系
## 引用来源
## 演进记录
```

### entity

```
## 基本信息
## 关键事件 / 里程碑
## 观点与作品
## 关联主题
## 引用来源
```

### summary（一对一对应 sources/）

```
## 一句话
## TL;DR
## 核心论点
## 我的加工意图
## 原文链接
## 与旧版差异   ← 仅版本化摄入新版时必填，详见 §7
```

### topic

```
## 问题陈述
## 关键子概念
## 当前共识
## 开放问题 / 争议点
## 引用来源
```

### source

```
## 元信息
## 正文 / 摘录
```

### daily

```
## 摄入
## 维护
## TODO
## 备注
```

## 5. 引用与双重登记

所有非 daily 页，若引用 `sources/`，**必须**同时登记：
- frontmatter `sources:`
- 正文 `## 引用来源` 段落

## 6. 禁用字段

以下字段曾考虑但决定不引入，以保持精简：
- `owner` / `author` — Git 已有
- `deprecated_reason` — 记在 `## 演进记录` 段落

> **演进说明 · 2026-04-26**：原列表包含 `version`，认为"Git 已有"。但代码文档场景下同一份资料会以**新版本**重复入库（如 nest-redis v2 → v3），版本号是业务语义而非 Git 版本，必须显式登记。已从禁用列表移除并加入 §1 / §7。

## 7. 代码文档版本化

> 适用范围：**仅工作类代码文档**（其他三类来源——行业文章 / 个人笔记 / 网页收藏——为单点快照，不走版本化）。

### 7.1 字段语义

| 字段 | 语义 | 示例 |
| --- | --- | --- |
| `version` | 该 source / summary 对应的资料版本号 | `2.0.0` |
| `supersedes` | 新版指向旧版的 wikilink | `[[2026-04-19-cs-nest-redis-v2.0.0]]` |
| `superseded_by` | 旧版被替代后回填，指向新版 | `[[2026-06-15-cs-nest-redis-v3.0.0]]` |

### 7.2 命名约定

```
sources/papers/<YYYY-MM-DD>-<slug>-v<X.Y.Z>.md
summaries/<YYYY-MM-DD>-<slug>-v<X.Y.Z>.md
```

无版本号信息时，回退到不带 `-vX.Y.Z` 的常规命名。

### 7.3 版本号识别优先级

由 Agent 在摄入时按下列顺序判定，前一档命中即用，全部缺失则**主动询问用户一次**：

1. 用户在对话中显式告知（如"这是 v3.0 的文档"）
2. 内容里的明显版本字段（package.json 的 `version`、文档头部 `Version: x.x.x`、git tag）
3. 摄入日期（fallback，仅当无法识别真实业务版本时）

> 粘贴模式下 **文件 mtime 不可用**，故只有 3 档。

### 7.4 旧 → 新版本对账

新版摄入时必须：

- 新 source 文件名带 `-vX.Y.Z`，frontmatter 含 `version` 与 `supersedes`
- 新 summary 必须含 `## 与旧版差异` 段，分三类列示：**新增 / 仍然成立 / 被推翻**
- 旧 summary frontmatter 回填 `superseded_by`（这是 append-first 框架下被允许的字段补全，写进 daily 留痕）
- 被推翻的旧断言 → 在概念页 / 实体页对应段落加 `## 矛盾点` callout，遵循 [[CLAUDE]] §4
- 实体页 `## 关键事件 / 里程碑` 或概念页 `## 演进记录` 追加："vX.X → vY.Y · 变化点 ZZ（[[新 summary]]）"
- 旧 source 与旧 summary **保留不删**，作为版本演进档案

详细操作流程见项目根 [[INGEST]]。

