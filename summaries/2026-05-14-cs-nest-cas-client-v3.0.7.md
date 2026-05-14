---
title: "@cs/nest-cas-client v3.0.7 摘要"
type: summary
aliases: ["nest-cas-client summary", "cs-nest-cas-client-summary"]
tags: [nestjs, mwp, cas, sso, authentication, middleware]
status: draft
confidence: high
version: "3.0.7"
sources:
  - "[[2026-05-14-cs-nest-cas-client-v3.0.7]]"
related:
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
  - "[[cs-nest-auth-client]]"
  - "[[mwp-packages-project]]"
created: 2026-05-14
updated: 2026-05-14
---

# @cs/nest-cas-client v3.0.7 摘要

## 一句话

@cs/nest-cas-client 是 MWP Packages Project 的 CAS 单点登录客户端包，实现完整 CAS 协议流程（ST 验证 + Session 管理），支持多租户和通配符跳过规则。

## TL;DR

- **CasClientMiddleware**：实现完整 CAS 协议，处理 ST 验证 + Session 管理 + 上下文注入
- **CasClientService**：通过 RpcClient 调用远程 CAS 服务（validateTicket / getSession / setSession）
- **CAS 协议流程**：跳过检查 → ST 验证 → Session 存储 → Cookie 设置 → URL 清理
- **多租户支持**：tenantId / tenantCode 自动传递
- **通配符跳过规则**：支持 `*`/`**`/`*.ext`，含默认规则（favicon.ico / robots.txt）
- **强依赖**：@cs/nest-cloud / @cs/nest-common / @cs/nest-config（peerDependencies 非可选）

## 核心论点

### 1. 完整 CAS 协议实现

`CasClientMiddleware` 实现标准 CAS 协议流程：
- 用户未登录 → 重定向 CAS 登录页（带 service 参数）
- 用户认证成功 → CAS 回调带 ST 票据
- 中间件验证 ST → 获取用户信息 → 存储 Session → 设置 Cookie → 清理 URL
- 后续请求 → Cookie 验证 Session → 有效则注入上下文放行

### 2. ST 票据验证流程

`handleTicketValidation()` 处理 ST 票据：
1. 调用 `validateTicket()` → RPC 调用 `service-validate.validateServiceTicket`
2. 获取 ST 信息 → 提取 TGT ID
3. 调用 `setUserToSession()` → 生成 sessionId（`tgtId-{random}`）→ 存储 session
4. 调用 `setSessionCookie()` → 设置 `__casuid` cookie（signed + httpOnly）
5. 重定向到清理后的 URL（移除 ticket 参数）

### 3. 与 @cs/nest-auth-client 的区别

| 特性 | @cs/nest-cas-client | @cs/nest-auth-client |
|------|---------------------|----------------------|
| 协议 | CAS（ST 验证） | 自定义（Cookie + Session） |
| 票据 | ST / TGT | 无票据概念 |
| Session 前缀 | `yunque:` / `cas:ticket:st:` | `inner:` |
| Cookie 名 | `__casuid` | `__inneruid` |
| 适用场景 | 标准单点登录 | 内部系统认证 |

### 4. 多租户支持

用户信息自动包含：
- `tenantId` / `tenantCode` → 从 CAS 认证结果传递
- `attributes.userName` / `attributes.realName` → 用户属性
- 上下文注入：userId / tenantId / tenantCode / userName / realName

## 我的加工意图

这份资料新建/更新了以下页面：

- [[entities/tools/cs-nest-cas-client]] — 新建实体页

## 与旧版差异

首次入库，无旧版对比。

## 原文链接

- [[2026-05-14-cs-nest-cas-client-v3.0.7]]