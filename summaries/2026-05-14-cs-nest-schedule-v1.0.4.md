---
title: "@cs/nest-schedule v1.0.4 摘要"
type: summary
aliases: ["nest-schedule summary"]
tags: [nestjs, mwp, schedule, cron]
status: draft
confidence: high
version: "1.0.4"
sources:
  - "[[2026-05-14-cs-nest-schedule-v1.0.4]]"
related:
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
  - "[[mwp-packages-project]]"
created: 2026-05-14
updated: 2026-05-14
---

# @cs/nest-schedule v1.0.4 摘要

## 一句话

@cs/nest-schedule 是 MWP Packages Project 的定时任务包，基于 NestJS Schedule 封装，支持动态任务管理和分布式锁。

## TL;DR

- **动态任务管理**：运行时添加/删除/更新 Cron 任务
- **分布式锁**：避免多实例重复执行
- **装饰器驱动**：@Cron / @Interval / @Timeout 标注任务方法
- **任务持久化**：支持数据库存储任务配置

## 原文链接

- [[2026-05-14-cs-nest-schedule-v1.0.4]]