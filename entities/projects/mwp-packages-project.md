---
title: MWP Packages Project
type: entity
aliases: [mwp-packages-project, MWP 云平台包, "@cs/nest-* 包集合", NestJS 云平台底座]
tags: [mwp, nestjs, monorepo, platform, project]
status: draft
confidence: medium
sources:
  - "[[2026-04-19-cs-nest-redis]]"
  - "[[2026-04-27-cs-nest-common-v4.0.1-beta.2]]"
related:
  - "[[cs-nest-redis]]"
  - "[[cs-nest-common]]"
created: 2026-04-19
updated: 2026-04-27
last_reviewed: 2026-04-19
---

# MWP Packages Project

## 基本信息

- 类别：项目 / Monorepo
- 位置：`C:/work/project/mwp-packages-project/`
- 技术栈：TypeScript、NestJS、pnpm workspace（推断）
- 作者：danielmlc
- 定位：承载云平台底层能力的一组 `@cs/nest-*` NestJS 扩展包

## 关键事件 / 里程碑

- 2026-04-19 · 本知识库首次摄入该 repo 的文档，起自 `@cs/nest-redis` v2.0.0
- 2026-04-27 · 摄入 `@cs/nest-common` v4.0.1-beta.2

## 观点与作品

本 monorepo 的 `apps/code-docs/output/` 下已观察到 13 份 package 源码整理文档。
逐一入库，未入库项列 *（未入库）*。

**已入库**

- [[cs-nest-redis|@cs/nest-redis]] · Redis 封装（11KB）
- [[cs-nest-common|@cs/nest-common]] · 通用工具（85KB）v4.0.1-beta.2

**观察到但未入库**

- `@cs/nest-cloud` · 云平台核心（124KB，最大）*（未入库）*
- `@cs/sql-parser` · SQL 解析器（115KB）*（未入库）*
- `@cs/nest-schedule` · 定时任务（99KB）*（未入库）*
- `@cs/nest-typeorm` · ORM 封装（91KB）*（未入库）*
- `@cs/nest-mq` · 消息队列（82KB）*（未入库）*
- `@cs/nest-files` · 文件服务（68KB）*（未入库）*
- `@cs/nest-config` · 配置管理（36KB）*（未入库）*
- `@cs/nest-cas-client` · CAS 单点登录（30KB）*（未入库）*
- `@cs/nest-sms` · 短信（24KB）*（未入库）*
- `@cs/nest-auth-client` · 认证客户端（21KB）*（未入库）*
- `@cs/nest-mail` · 邮件（4KB）*（未入库）*

## 关联主题

- 与 AIOS 项目（尚未建立 entity 页）的关系：**待人工确认** — 可能是 AIOS 的前身、底层依赖，或独立平行项目

## 引用来源

- [[2026-04-19-cs-nest-redis]]
- [[2026-04-27-cs-nest-common-v4.0.1-beta.2]]

