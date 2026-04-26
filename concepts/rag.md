---
title: RAG
type: concept
aliases: [Retrieval-Augmented Generation, 检索增强生成, 向量检索]
tags: [retrieval, llm]
status: stub
confidence: medium
sources: []
related:
  - "[[llm-wiki]]"
  - "[[agent-knowledge-base]]"
created: 2026-04-19
updated: 2026-04-19
---

# RAG

## 一句话定义

检索增强生成：LLM 在回答前先从向量库或搜索引擎召回相关片段，作为上下文注入 prompt。

## 展开解释

典型管线：文档切片 → 向量化 → 存入向量库 → 查询时召回 Top-K → 拼接上下文送入 LLM。
优点是规模可扩；缺点是**每次查询都从零发现知识**，无综合、无累积——这正是 [[llm-wiki]] 范式所批评的。

## 与其他概念的关系

- 对立 / 互补：[[llm-wiki]]
- 应用场景：作为 [[agent-knowledge-base]] 规模扩张后的兜底检索层

## 引用来源

- 待补

## 演进记录

- 2026-04-19 · 初建 stub

