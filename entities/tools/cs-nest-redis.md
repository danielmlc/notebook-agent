---
title: "@cs/nest-redis"
type: entity
aliases: ["@cs/nest-redis", "nest-redis", "cs-nest-redis", "NestJS Redis 模块"]
tags: [nestjs, redis, mwp, package, tool]
status: draft
confidence: high
sources:
  - "[[2026-04-19-cs-nest-redis]]"
related:
  - "[[mwp-packages-project]]"
created: 2026-04-19
updated: 2026-04-19
last_reviewed: 2026-04-19
---

# @cs/nest-redis

## 基本信息

- 类别：工具 / NestJS package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：2.0.0
- License：ISC
- 作者：danielmlc
- 底层依赖：`ioredis`、`lodash`、`rxjs`、`reflect-metadata`

## 关键事件 / 里程碑

- 2026-04-19 · 首次入库（基于 v2.0.0 源码快照）

## 观点与作品

- 对外 API 面非常克制：`RedisModule.forRoot/forRootAsync` + `RedisService.getRedis(name)`
- 多实例以 `Map<string, Redis | Cluster>` 实现，命名冲突抛错（不静默覆盖）
- 连接形态（URL / 单机 / 集群）三选一的分支逻辑集中在 `createClient()` 私有方法
- `OnModuleDestroy` 钩子目前空实现，扩展位已留但未启用

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 兄弟 package（同 monorepo，待入库）：`@cs/nest-cloud` / `@cs/nest-common` / `@cs/nest-typeorm` / `@cs/nest-mq` / `@cs/nest-config` / `@cs/nest-schedule` / `@cs/nest-files` / `@cs/nest-cas-client` / `@cs/nest-sms` / `@cs/nest-auth-client` / `@cs/nest-mail` / `@cs/sql-parser`

## 引用来源

- [[2026-04-19-cs-nest-redis]]

