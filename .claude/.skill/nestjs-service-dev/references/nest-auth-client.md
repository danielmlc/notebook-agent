# @cs/nest-auth-client - 内部认证

> **源码**：[`libs/nest-auth-client`](../../../libs/nest-auth-client) ｜ **对齐版本**：v1.0.1 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 安装与注册

```bash
pnpm add @cs/nest-auth-client
```

```typescript
import { AuthClientModule, AuthClientMiddleware } from '@cs/nest-auth-client';

AuthClientModule.forRoot({
  authServerUrl: 'http://auth-server.com',
  secure: false,
  sessionTTL: 3600,                  // Session 过期时间（秒）
  skipRules: [
    { path: '/api/health', method: 'GET' },
    { path: '/api/public/**', method: 'ALL' },
  ],
  skipStaticExtensions: ['.js', '.css', '.png'],
  cookieAttrName: '__inneruid',
  sessionPrefix: 'inner',
}, true)
```

## 中间件集成

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthClientMiddleware).forRoutes('/*');
  }
}
```

## 配置接口

```typescript
interface AuthOptions {
  authServerUrl: string;               // 认证服务器地址
  secure: boolean;
  sessionTTL: number;                  // Session 过期时间（秒）
  skipRules?: AuthSkipRule[];
  skipPaths?: string[];
  skipStaticExtensions?: string[];
  cookieAttrName?: string;             // Cookie 名称
  sessionPrefix?: string;             // Session 存储前缀
}
```

## 与 nest-cas-client 的区别

| 特性 | nest-cas-client | nest-auth-client |
|------|----------------|-----------------|
| 认证方式 | CAS SSO 协议 | Cookie + RPC 会话验证 |
| 适用场景 | 面向外部用户 | 内部系统间调用 |
| 会话存储 | 本地 + CAS 服务器 | 通过 RPC 验证 |
| 移动端支持 | 支持 WebView 检测 | 不支持 |
