---
title: Karpathy · LLM Wiki gist
type: summary
aliases: [karpathy llm-wiki gist]
tags: [karpathy, llm-wiki, knowledge-base]
status: draft
confidence: medium
sources:
  - "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
related:
  - "[[llm-wiki]]"
  - "[[agent-knowledge-base]]"
  - "[[rag]]"
created: 2026-04-19
updated: 2026-04-19
---

# Karpathy · LLM Wiki gist

## 一句话

Karpathy 提出：让 LLM 作为"全职园丁"，持续编译维护一份结构化互链 Markdown 维基，替代传统向量 RAG 的"每次从零检索"。

## TL;DR

- 知识**编译一次、链接一次**，之后只做增量演进
- 三层架构：原始资源（只读）/ 维基（LLM 拥有）/ 模式（规范）
- LLM 三类动作：摄入（Ingest）/ 查询（Retrieve & Synthesize）/ 维护（Maintain）
- 冲突处理：**显式标记矛盾**，不静默覆盖
- 比 RAG 多出的关键一层：**综合与累积**

## 核心论点

1. RAG 的根本缺陷是"无状态"——每次查询都在重新发现知识，无法沉淀。
2. 知识应该像维基百科一样**有人（或 Agent）在持续维护**，而不是被动索引。
3. 纯 Markdown + wikilink 足以承载复杂的知识结构，无需向量库作为一等公民。
4. 新信息与旧信息冲突时，应让冲突**可见**，作为知识演进的材料，而非默默覆盖。

## 我的加工意图

这份资料新建/更新了以下页面：

- 新建 [[llm-wiki]]（draft）
- 新建 [[rag]]（stub）
- 新建 [[agent-knowledge-base]]（stub）

## 原文链接

- https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- 发布日期：2026-04-04
- 作者：Andrej Karpathy

> [!note] 复核提示
> 当前摘要基于公开解读与 gist 提取，未逐句对照原文。待人工回读后补充关键直引，再把 `confidence` 升至 `high` 并 `status` 改为 `stable`。

