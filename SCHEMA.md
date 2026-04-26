---
title: 知识库 · Frontmatter 与命名规范
type: schema
status: stable
created: 2026-04-19
updated: 2026-04-19
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
- `version` — Git 已有
- `deprecated_reason` — 记在 `## 演进记录` 段落

