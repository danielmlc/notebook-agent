---
title: LLM Wiki
type: concept
aliases: [LLM 维基, Karpathy Wiki, llm-wiki 范式, 第二大脑]
tags: [knowledge-base, agent, karpathy]
status: draft
confidence: medium
sources:
  - "[[2026-04-04-karpathy-llm-wiki]]"
related:
  - "[[rag]]"
  - "[[agent-knowledge-base]]"
created: 2026-04-19
updated: 2026-04-19
last_reviewed: 2026-04-19
---

# LLM Wiki

## 一句话定义

由 LLM 作为"全职管理员"持续编译、维护的结构化 Markdown 知识库范式，替代传统 RAG 的向量召回。

## 展开解释

由 Andrej Karpathy 于 2026-04-04 以 GitHub gist 形式发布。核心主张：让 LLM 不再在每次查询时"从零发现知识"，而是把一次学到的东西**编译进一份可读的 Markdown 维基**，后续只做增量演进。

三层结构：
- **原始层**：只读的源文档
- **维基层**：LLM 拥有的 Markdown 集合，互相 wikilink
- **模式层**：SOP / 规范（本库的 [[CLAUDE]]、[[SCHEMA]]）

LLM 承担三类动作：摄入（Ingest）· 查询（Retrieve & Synthesize）· 维护（Maintain）。

## 与其他概念的关系

- 对立 / 替代：[[rag]]
- 实例应用：[[agent-knowledge-base]]

## 引用来源

- [[2026-04-04-karpathy-llm-wiki]]

## 演进记录

- 2026-04-19 · 初建（来源：[[2026-04-04-karpathy-llm-wiki]]）

