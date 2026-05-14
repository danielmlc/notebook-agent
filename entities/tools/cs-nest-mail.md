---
title: "@cs/nest-mail"
type: entity
aliases: ["@cs/nest-mail", "nest-mail", "cs-nest-mail", "NestJS 邮件工具包"]
tags: [nestjs, mwp, package, tool, mail, nodemailer, email]
status: draft
confidence: high
version: "1.0.3"
sources:
  - "[[2026-05-14-cs-nest-mail-v1.0.3]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-common]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-mail

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：1.0.3
- License：ISC
- 作者：danielmlc
- 定位：邮件工具包 — nodemailer 封装
- 核心依赖：nodemailer ^7.0.3
- 强制 peerDependencies：@cs/nest-common

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v1.0.3 源码快照）

## 核心模块

### MailService — 邮件服务

- 封装 nodemailer transporter
- 支持邮件发送

### MailModule — 动态模块

- `forRoot(options, isGlobal)` — 同步配置
- `forRootAsync(options, isGlobal)` — 异步配置

### MailOptions — 配置接口

- SMTP 配置（host / port / auth 等）

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-common]]

## 引用来源

- [[2026-05-14-cs-nest-mail-v1.0.3]]