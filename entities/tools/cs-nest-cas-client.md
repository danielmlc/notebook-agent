---
title: "@cs/nest-cas-client"
type: entity
aliases: ["@cs/nest-cas-client", "nest-cas-client", "cs-nest-cas-client", "NestJS CAS 客户端", "CAS 单点登录客户端"]
tags: [nestjs, mwp, package, tool, cas, sso, authentication, middleware]
status: draft
confidence: high
version: "3.0.7"
sources:
  - "[[2026-05-14-cs-nest-cas-client-v3.0.7]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
  - "[[cs-nest-auth-client]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-cas-client

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：3.0.7
- License：ISC
- 作者：danielmlc
- 定位：CAS 单点登录客户端 — 完整 CAS 协议实现
- 核心依赖：axios ^0.27.2
- 强制 peerDependencies：@cs/nest-cloud, @cs/nest-common, @cs/nest-config

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v3.0.7 源码快照）

## 核心模块

### CasClientMiddleware — CAS 中间件

- 实现完整 CAS 协议流程
- **认证流程**：
  1. 检查跳过规则 → 放行或继续
  2. 检查 URL 中 ST 票据 → 验证票据
  3. 验证成功 → 存储 Session + 设置 Cookie + 重定向
  4. 无票据 → 检查 `__casuid` cookie → 验证 session
  5. session 有效 → 注入上下文 → 放行
  6. session 无效 → 重定向 CAS 登录页

- **票据验证流程**（`handleTicketValidation`）：
  - `validateTicket()` → RPC 调用 ST 验证
  - `setUserToSession()` → 生成 sessionId（`tgtId-{random}`）
  - `setSessionCookie()` → 设置 `__casuid` cookie
  - 重定向到清理后的 URL

- **ST 接口**：
```typescript
interface ST {
  id: string;
  tgtId: string;
  service: string;
  tenantId: string;
  tenantCode?: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  isFromRenew: boolean;
  used: boolean;
}
```

- **跳过规则引擎**：通配符 `*`/`**`/`*.ext`，默认跳过 favicon.ico + robots.txt
- **ServerPath 支持**：`CS_SERVERPATH` 环境变量
- **移动端 WebView 检测**：`x-mobile-webview` 头 + User-Agent 模式匹配

### CasClientService — RPC 服务封装

- 依赖 `RpcClient` 调用远程 CAS 服务
- `validateTicket(ticket, service)` → `service-validate.validateServiceTicket`
- `getSessionInfo(sessionId, prefix?)` → `session.getSession`
- `setSessionInfo(sessionId, userInfo)` → `session.setSession`（notify）
- `getLoginUrl(service?)` → CAS 登录地址（带 service 参数）

### CasClientModule — 动态模块

- `forRoot(options, isGlobal)` — 同步配置
- `forRootAsync(options, isGlobal)` — 异步配置
- 默认全局注册

### CasOptions — 配置接口

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `casServerUrl` | `string` | ✅ | CAS 服务器地址 |
| `serviceUrl` | `string` | ✅ | 认证成功回调地址 |
| `cookie` | `{ tgc, casuid }` | ✅ | Cookie 过期时间（毫秒） |
| `secure` | `boolean` | ✅ | 是否 HTTPS |
| `skipRules` | `CasSkipRule[]` | ❌ | 跳过规则数组 |
| `skipPaths` | `string[]` | ❌ | 简单路径（向后兼容） |
| `skipStaticExtensions` | `string[]` | ❌ | 静态文件扩展名 |
| `enableDefaultSkipRules` | `boolean` | ❌ | 启用默认跳过规则（默认 true） |

## 设计亮点

1. **完整 CAS 协议**：ST 验证 + TGT 管理 + Session 存储
2. **多租户支持**：tenantId / tenantCode 自动传递
3. **URL 清理**：认证成功后自动移除 ticket 参数
4. **移动端适配**：WebView 检测 + 特殊响应处理
5. **与 auth-client 互补**：CAS 标准 vs 自定义认证

## 与 @cs/nest-auth-client 对比

| 特性 | @cs/nest-cas-client | @cs/nest-auth-client |
|------|---------------------|----------------------|
| 协议 | CAS（ST 验证） | 自定义（Cookie + Session） |
| 票据 | ST / TGT | 无 |
| Session 前缀 | `yunque:` / `cas:ticket:st:` | `inner:` |
| Cookie 名 | `__casuid` | `__inneruid` |
| 适用场景 | 标准单点登录 | 内部系统认证 |

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-cloud]]、[[cs-nest-common]]、[[cs-nest-config]]
- 兄弟 package：[[cs-nest-auth-client]]（认证客户端）

## 引用来源

- [[2026-05-14-cs-nest-cas-client-v3.0.7]]