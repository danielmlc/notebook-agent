---
title: "@cs/nest-auth-client"
type: entity
aliases: ["@cs/nest-auth-client", "nest-auth-client", "cs-nest-auth-client", "NestJS 认证客户端", "内部系统认证授权客户端"]
tags: [nestjs, mwp, package, tool, auth, cas, session, middleware]
status: draft
confidence: high
version: "1.0.3"
sources:
  - "[[2026-05-14-cs-nest-auth-client-v1.0.3]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-auth-client

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：1.0.3
- License：ISC
- 作者：danielmlc
- 定位：内部系统认证授权客户端 — 统一身份验证中间件
- 核心依赖：axios ^0.27.2
- 强制 peerDependencies：@cs/nest-cloud, @cs/nest-common, @cs/nest-config

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v1.0.3 源码快照）

## 核心模块

### AuthClientMiddleware — 认证中间件

- 拦截所有请求执行认证流程
- **跳过规则引擎**：
  - `AuthSkipRule` 支持通配符：`*`（单层）/ `**`（多层）/ `*.ext`（扩展名）
  - `pathToRegex()` 将通配符转为正则
  - `compileSkipRule()` 生成带测试函数的规则对象
- **ServerPath 支持**：`CS_SERVERPATH` 环境变量，自动处理路径前缀（如 `/app1`）
- 认证流程：
  1. 检查跳过规则
  2. 从 `signedCookies` 提取 `__inneruid`
  3. 调用 RPC 验证 session
  4. 成功 → 注入上下文；失败 → 重定向登录页
- **AJAX 检测**：`x-requested-with` / `sec-fetch-mode` / `accept` 头判断
- **上下文注入**：userId / userName / realName / companyId / companyName

### AuthClientService — RPC 服务封装

- 依赖 `RpcClient` 调用远程 session 服务
- `getLoginUrl()` → CAS 登录地址
- `getSessionInfo(sessionId)` → `session.getSession`（获取用户信息）
- `updateSessionInfo(sessionId)` → `session.refreshSession`（notify 模式续期）

### AuthClientModule — 动态模块

- `forRoot(options, isGlobal)` — 同步配置
- `forRootAsync(options, isGlobal)` — 异步配置
- 默认全局注册

### AuthOptions — 配置接口

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `authServerUrl` | `string` | ✅ | CAS 服务地址 |
| `secure` | `boolean` | ✅ | 是否 HTTPS |
| `sessionTTL` | `number` | ✅ | 过期时间（毫秒） |
| `skipRules` | `AuthSkipRule[]` | ❌ | 跳过规则数组 |
| `skipPaths` | `string[]` | ❌ | 简单路径（向后兼容） |
| `skipStaticExtensions` | `string[]` | ❌ | 静态文件扩展名 |
| `cookieAttrName` | `string` | ❌ | Cookie 属性名，默认 `__inneruid` |
| `sessionPrefix` | `string` | ❌ | Session 前缀，默认 `inner` |

## 设计亮点

1. **通配符规则引擎**：支持 `*`/`**`/`*.ext` 三种模式，灵活配置跳过路径
2. **ServerPath 兼容**：自动处理子路径部署场景
3. **AJAX 友好**：自动区分 AJAX 请求，返回 401 JSON 或 302 重定向
4. **上下文自动注入**：认证成功后自动注入用户信息到 AsyncLocalStorage

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-cloud]]、[[cs-nest-common]]、[[cs-nest-config]]

## 引用来源

- [[2026-05-14-cs-nest-auth-client-v1.0.3]]
