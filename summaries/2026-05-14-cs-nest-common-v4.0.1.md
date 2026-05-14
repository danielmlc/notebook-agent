---
title: "@cs/nest-common v4.0.1 摘要"
type: summary
aliases: ["nest-common summary", "cs-nest-common-summary"]
tags: [nestjs, mwp, context, logger, http, dto, crypto]
status: draft
confidence: high
version: "4.0.1"
supersedes: "[[2026-04-27-cs-nest-common-v4.0.1-beta.2]]"
sources:
  - "[[2026-05-14-cs-nest-common-v4.0.1]]"
related:
  - "[[cs-nest-common]]"
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-redis]]"
  - "[[mwp-packages-project]]"
created: 2026-05-14
updated: 2026-05-14
---

# @cs/nest-common v4.0.1 摘要

## 一句话

@cs/nest-common 是 MWP Packages Project 的通用工具包，提供 ContextService（AsyncLocalStorage）、LoggerService（winston）、HttpService（axios）、DTO 继承链和加密工具集。

## TL;DR

- **ContextService**：基于 AsyncLocalStorage 的请求上下文传播，base64 编解码跨服务透传
- **LoggerService**：winston + DailyRotateFile，按 context 白名单控制日志级别，自动注入 traceId
- **HttpService**：Axios 封装，forRegister / forRegisterAsync 动态模块，双层拦截器
- **DTO 继承链**：BaseDto → TreeDto / HasEnableDto → HasPrimaryFullTreeDto，含 PageResult / QueryConditionInput
- **加密工具集**：AES-256-CBC / RSA-OAEP-SHA256 / MD5 / Argon2id
- **通用工具**：nanoid ID 生成、IP 获取、随机字符串

## 核心论点

### 1. ContextService 松散集成

AsyncLocalStorage 隔离请求上下文，`runWithContext()` 绑定生命周期。与 LoggerService 通过静态引用松散耦合，不强制 DI。

### 2. LoggerService 白名单模式

`contextLevels` 字典 + `defaultContextLevel: 'none'` 实现白名单日志，可实现"只看某个 Service 的日志"。

### 3. DTO 继承链设计完整

BaseDto（审计字段）→ TreeDto / HasEnableDto → 多种组合变体。`HasPrimaryFullTreeDto` 涵盖所有父类字段。

### 4. 加密工具集

- AesUtils：AES-256-CBC + scrypt（固定 salt 安全弱点）
- RsaUtils：RSA-OAEP-SHA256 分块加密
- Argon2Utils：Argon2id 密码哈希

## 与旧版差异

### 新增（v4.0.1 引入）

- 版本从 beta 升级为正式版（4.0.1-beta.2 → 4.0.1）

### 仍然成立（沿用 v4.0.1-beta.2）

- 代码目录结构不变
- ContextService 核心设计不变
- LoggerService 核心设计不变
- DTO 继承链不变
- 加密工具集不变

### 被推翻（v4.0.1 取代旧断言）

- 无明显断言被推翻，主要为版本迭代

## 我的加工意图

这份资料更新了以下页面：

- [[entities/tools/cs-nest-common]] — 更新版本号与演进记录

## 原文链接

- [[2026-05-14-cs-nest-common-v4.0.1]]
