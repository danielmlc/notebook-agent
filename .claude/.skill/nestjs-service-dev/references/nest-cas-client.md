# @cs/nest-cas-client - CAS SSO 认证

> **源码**：[`libs/nest-cas-client`](../../../libs/nest-cas-client) ｜ **对齐版本**：v3.0.6 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 安装与注册

```bash
pnpm add @cs/nest-cas-client
```

```typescript
import { CasClientModule, CasClientMiddleware } from '@cs/nest-cas-client';

// ShareModule 中注册
CasClientModule.forRoot({
  casServerUrl: 'http://cas-server.com',
  serviceUrl: 'http://my-app.com/api',
  cookie: {
    tgc: 3600000,            // TGC Cookie 过期时间（毫秒）
    casuid: 3600000,         // CASUID Cookie 过期时间
  },
  secure: false,
  enableDefaultSkipRules: true,
  skipRules: [
    { path: '/api/health', method: 'GET', description: '健康检查' },
    { path: '/static/**', method: 'ALL', description: '静态资源' },
  ],
  skipStaticExtensions: ['.js', '.css', '.png', '.jpg'],
}, true)  // isGlobal
```

## 中间件集成

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CasClientMiddleware).forRoutes('/*');
  }
}
```

## 配置接口

```typescript
interface CasOptions {
  casServerUrl: string;                // CAS 服务器地址
  serviceUrl: string;                  // 本服务回调地址
  cookie: { tgc: number; casuid: number };
  secure: boolean;                     // 是否 HTTPS
  skipRules?: CasSkipRule[];           // 跳过认证规则
  skipPaths?: string[];                // 简单路径数组（向后兼容）
  skipStaticExtensions?: string[];     // 静态文件扩展名
  enableDefaultSkipRules?: boolean;    // 默认跳过 favicon.ico, robots.txt
}

interface CasSkipRule {
  path: string;                        // 支持通配符 ** 和 *
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  description?: string;
}
```

## CAS 认证流程

1. 请求到达 → 检查 `__casuid` Cookie
2. Cookie 不存在 → 重定向到 CAS 登录页
3. 用户登录 → CAS 返回 Service Ticket (ST)
4. 验证 ST → `CasClientService.validateTicket()`
5. 存储会话 → 设置 `__casuid` Cookie
6. 后续请求 → 从 Cookie 中获取用户信息，自动设置上下文

## 认证后上下文

```typescript
// 认证成功后自动注入到 ContextService：
contextService.getContext('userId');
contextService.getContext('tenantId');
contextService.getContext('tenantCode');
contextService.getContext('userName');
contextService.getContext('realName');
```

## 与 nest-auth-client 的区别

| 特性 | nest-cas-client | nest-auth-client |
|------|----------------|-----------------|
| 认证方式 | CAS SSO 协议 | Cookie + RPC 会话验证 |
| 适用场景 | 面向外部用户 | 内部系统间调用 |
| 会话存储 | 本地 + CAS 服务器 | 通过 RPC 验证 |
| 移动端支持 | 支持 WebView 检测 | 不支持 |
