---
title: Agent 知识库（主题聚合）
type: topic
aliases: [Agent KB, Agent 持久记忆, Second Brain Topic]
tags: [agent, knowledge-base, llm-wiki, rag, moc]
status: draft
confidence: medium
sources:
  - "[[2026-04-04-karpathy-llm-wiki]]"
related:
  - "[[llm-wiki]]"
  - "[[rag]]"
  - "[[agent-knowledge-base]]"
created: 2026-04-26
updated: 2026-04-26
---

# Agent 知识库 · 主题聚合

> 本主题汇集"如何为 Agent 构建持久化、结构化、可综合的知识"这一问题域下的所有断言、范式与争议。
> 是本知识库的**第一个 topic**，作为查询入口示范。

## 问题陈述

Agent（尤其是 LLM-based Agent）需要跨会话、跨任务的长期记忆。当前主流方案在三个维度存在权衡：

- **可综合性**：能否在写入时就把碎片信息组织成可复用的知识单元
- **可追溯性**：回答某个问题时能否定位到原始证据
- **可演进性**：新信息进来时如何与旧信息对账，避免覆盖或冲突

不同方案在这三维上选择不同。本主题就是为追踪这些选择而存在。

## 关键子概念

- [[llm-wiki|LLM Wiki 范式]] — 由 LLM 持续编译维护的结构化 Markdown 维基（本知识库当前的主范式）
- [[rag|RAG]] — 传统的向量召回 + 上下文注入方案，无综合无累积
- [[agent-knowledge-base|Agent 知识库]] — 上位概念，涵盖所有为 Agent 服务的持久化知识形态

## 当前共识

基于 [[2026-04-04-karpathy-llm-wiki|Karpathy gist]]：

1. **RAG 的根本缺陷是"无状态"** —— 每次查询都在重新发现知识，无法沉淀。
2. **LLM 应该承担"园丁"角色** —— 不止回答问题，还要持续维护知识本身。
3. **三种动作构成闭环** —— 摄入 (Ingest) / 查询 (Retrieve & Synthesize) / 维护 (Maintain)。
4. **冲突应该可见而非掩盖** —— 新旧矛盾用 callout 显式标记，作为演进材料。
5. **纯 Markdown + wikilink 足以承载复杂知识结构** —— 不必把向量库作为一等公民。

## 开放问题 / 争议点

- **规模化拐点** —— LLM Wiki 范式在多大规模后会出现检索效率问题？是否需要 RAG 兜底？（待实证）
- **多 Agent 共写** —— 多个 Agent 同时维护同一知识库时的并发冲突如何处理？当前 SOP 仅考虑单 Agent。
- **代码文档版本化** —— 同一份资料的版本迭代如何在"只追加"原则下处理？已在 [[INGEST]] §3 给出方案，待实证。
- **概念抽离阈值** —— 一个候选概念在几份资料里出现才值得独立建页？当前是"中粒度"经验判断，未量化。
- **知识老化** —— 长时间未复核的页面如何提示淘汰？当前依赖 `last_reviewed` 字段 + 季度反思，但缺少自动化视图。

## 引用来源

- [[2026-04-04-karpathy-llm-wiki|Karpathy · LLM Wiki gist]]

## 演进记录

- 2026-04-26 · 初建（来源：[[2026-04-04-karpathy-llm-wiki]]）
  - 作为本知识库**首个 topic**，承担"为 LLM 综合查询提供入口"的职责
  - 串联三个种子概念页 [[llm-wiki]] / [[rag]] / [[agent-knowledge-base]]
  - 列出 5 条开放问题，作为后续摄入资料的"问题驱动"指引
