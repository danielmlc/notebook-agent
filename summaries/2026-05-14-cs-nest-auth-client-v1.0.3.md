---
title: "@cs/nest-auth-client v1.0.3 摘要"
type: summary
aliases: ["nest-auth-client summary", "cs-nest-auth-client-summary"]
tags: [nestjs, mwp, auth, cas, session, middleware]
status: draft
confidence: high
version: "1.0.3"
sources:
  - "[[2026-05-14-cs-nest-auth-client-v1.0.3]]"
related:
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
  - "[[mwp-packages-project]]"
created: 2026-05-14
updated: 2026-05-14
---

# @cs/nest-auth-client v1.0.3 摘要

## 一句话

@cs/nest-auth-client 是 MWP Packages Project 的认证客户端包，提供基于 Cookie + RPC Session 的统一身份验证中间件，支持灵活的通配符跳过规则。

## TL;DR

- **AuthClientMiddleware**：NestJS 中间件，拦截请求执行认证，自动处理 ServerPath 路径前缀
- **AuthClientService**：通过 RpcClient 调用远程 session 服务（getSession / refreshSession）
- **通配符跳过规则**：支持 `*`（单层）/ `**`（多层）/ `*.ext`（扩展名）三种模式
- **上下文注入**：认证成功后自动注入 userId / userName / realName / companyId / companyName
- **AJAX 检测**：自动区分 AJAX 请求，返回 401 JSON 或 302 重定向
- **强依赖**：@cs/nest-cloud / @cs/nest-common / @cs/nest-config（peerDependencies 非可选）

## 核心论点

### 1. 中间件驱动的认证流程

`AuthClientMiddleware` 作为 NestJS 中间件，对所有路由（`forRoutes('/*')`）执行认证：
- 先检查 `shouldSkipAuth()`，命中规则则跳过
- 从 `signedCookies` 提取 `__inneruid`（可配置）
- 调用 RPC 远程验证 session 有效性
- 成功 → 注入上下文 + 续期 session；失败 → 重定向登录页

### 2. 通配符跳过规则引擎

`AuthSkipRule` 支持三种通配符：
- `*` → `[^/]*`（单层路径任意字符）
- `**` → `.*`（任意层级）
- `*.ext` → 文件扩展名匹配

`pathToRegex()` 将通配符转为正则，`compileSkipRule()` 生成带测试函数的规则对象。

### 3. ServerPath 路径前缀处理

`CS_SERVERPATH` 环境变量支持服务部署在子路径下（如 `/app1`）：
- 请求 URL 包含前缀 → 测试带前缀和不带前缀两个版本
- 请求 URL 不含前缀 → 测试不带前缀和带前缀两个版本
- 确保跳过规则在两种情况下都能正确匹配

### 4. RPC Session 管理

`AuthClientService` 通过 `RpcClient` 调用远程 session 服务：
- `getSessionInfo(sessionId)` → `session.getSession`（获取用户信息）
- `updateSessionInfo(sessionId)` → `session.refreshSession`（notify 模式续期）

## 我的加工意图

这份资料新建/更新了以下页面：

- [[entities/tools/cs-nest-auth-client]] — 新建实体页

## 与旧版差异

首次入库，无旧版对比。

## 原文链接

- [[2026-05-14-cs-nest-auth-client-v1.0.3]]