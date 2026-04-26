---
title: Agent 知识库
type: concept
aliases: [Second Brain, 第二大脑, Agent 持久记忆, Agent Knowledge Base]
tags: [agent, knowledge-base, memory]
status: stub
confidence: medium
sources:
  - "[[2026-04-04-karpathy-llm-wiki]]"
related:
  - "[[llm-wiki]]"
  - "[[rag]]"
created: 2026-04-19
updated: 2026-04-19
---

# Agent 知识库

## 一句话定义

服务于 Agent 的持久化、结构化、可综合的知识存储，区别于对话内短期记忆与检索式上下文。

## 展开解释

Agent 需要跨会话的长期记忆。当前三种主流形态：

1. 对话历史压缩（短期）
2. 向量库 + RAG（中期，无综合） → [[rag]]
3. LLM Wiki 范式（长期，有综合） → [[llm-wiki]]

本知识库即采用第 3 种形态作为主范式，并把第 2 种留作 Phase 3 的兜底层。

## 与其他概念的关系

- 主范式：[[llm-wiki]]
- 传统方案：[[rag]]

## 引用来源

- [[2026-04-04-karpathy-llm-wiki]]

## 演进记录

- 2026-04-19 · 初建 stub

