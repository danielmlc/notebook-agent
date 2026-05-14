---
title: "@cs/nest-auth-client · 源码整理 v1.0.3"
type: source
aliases: ["@cs/nest-auth-client 源码", "nest-auth-client 源码"]
tags: [nestjs, mwp, code-docs, auth, cas, session, middleware]
status: stable
version: "1.0.3"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-auth-client.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-auth-client · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：1.0.3
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-auth-client代码库源码整理

#### 代码目录
```
@cs/nest-auth-client/
├── src/
├── auth-client.constants.ts
├── auth-client.middleware.ts
├── auth-client.module.ts
├── auth-client.service.ts
├── auth-options.interface.ts
└── index.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-auth-client",
  "version": "1.0.3",
  "description": "内部系统认证授权客户端",
  "author": "danielmlc <danielmlc@126.com>",
  "homepage": "",
  "license": "ISC",
  "main": "lib/index.js",
  "directories": {
    "lib": "lib"
  },
  "files": [
    "lib"
  ],
  "scripts": {
    "prebuild": "rimraf lib",
    "build": "tsc -p ./tsconfig.json",
    "watch": "tsc -p ./tsconfig.json --watch",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "axios": "^0.27.2",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "peerDependencies": {
    "@cs/nest-cloud": "workspace:^",
    "@cs/nest-common": "workspace:^",
    "@cs/nest-config": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    },
    "@cs/nest-config": {
      "optional": false
    },
    "@cs/nest-cloud": {
      "optional": false
    }
  }
}
```


> 代码路径  `src\auth-client.constants.ts`

```typescript
export const AUTH_CLIENT_MODULE_OPTIONS = Symbol('AUTH_CLIENT_MODULE_OPTIONS');

```


> 代码路径  `src\auth-client.middleware.ts`

```typescript
import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { User, LoggerService, ContextService } from '@cs/nest-common';
import { AuthClientService } from './auth-client.service';
import { AuthOptions, AuthSkipRule } from './auth-options.interface';
import { AUTH_CLIENT_MODULE_OPTIONS } from './auth-client.constants';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

interface CompiledSkipRule {
  originalPath: string;
  regex: RegExp;
  method: string;
  description?: string;
  test: (url: string, method: string) => boolean;
}

@Injectable()
export class AuthClientMiddleware implements NestMiddleware {
  private compiledRules: CompiledSkipRule[] = [];
  private serverPath = '';
  private hasServerPath = false;

  constructor(
    @Inject(AUTH_CLIENT_MODULE_OPTIONS)
    private readonly options: AuthOptions,
    private readonly authClient: AuthClientService,
    private readonly logger: LoggerService,
    private readonly contextService: ContextService,
  ) {
    this.initializeServerPath();
    this.initializeSkipRules();
  }

  private initializeServerPath() {
    const serverPath = process.env.CS_SERVERPATH;
    this.hasServerPath = Boolean(serverPath?.trim());

    if (this.hasServerPath) {
      // 标准化路径格式：确保以 / 开头，不以 / 结尾
      this.serverPath = '/' + serverPath.trim().replace(/^\/+|\/+$/g, '');
    }

    this.logger.verbose(
      `Auth Middleware - Server Path: ${this.hasServerPath ? this.serverPath : 'None'}`,
    );
  }

  private initializeSkipRules() {
    const rules: AuthSkipRule[] = [];

    // 添加静态文件扩展名规则
    if (this.options.skipStaticExtensions?.length) {
      this.options.skipStaticExtensions.forEach((ext) => {
        const cleanExt = ext.replace(/^\./, '');
        rules.push({
          path: `**.${cleanExt}`,
          method: 'ALL',
          description: `Static files: ${ext}`,
        });
      });
    }

    // 添加简单路径规则
    if (this.options.skipPaths?.length) {
      this.options.skipPaths.forEach((path) => {
        rules.push({ path, method: 'ALL', description: 'Skip path' });
      });
    }

    // 添加用户配置的规则
    if (this.options.skipRules?.length) {
      rules.push(...this.options.skipRules);
    }

    // 编译规则
    this.compiledRules = rules.map((rule) => this.compileSkipRule(rule));

    this.logger.verbose(
      `Auth Middleware initialized with ${this.compiledRules.length} skip rules`,
    );
  }

  private compileSkipRule(rule: AuthSkipRule): CompiledSkipRule {
    const method = rule.method || 'ALL';
    const regex = this.pathToRegex(rule.path);

    return {
      originalPath: rule.path,
      regex,
      method,
      description: rule.description,
      test: (url: string, reqMethod: string) => {
        const methodMatch =
          method === 'ALL' || method === reqMethod.toUpperCase();
        const pathMatch = regex.test(url);
        return methodMatch && pathMatch;
      },
    };
  }

  private pathToRegex(path: string): RegExp {
    try {
      let regexPattern = path
        .replace(/\*\*/g, '___DOUBLESTAR___')
        .replace(/\*/g, '___STAR___')
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/___DOUBLESTAR___/g, '.*')
        .replace(/___STAR___/g, '[^/]*');

      if (!regexPattern.startsWith('^')) {
        regexPattern = '^' + regexPattern;
      }
      if (!regexPattern.endsWith('$')) {
        regexPattern = regexPattern + '$';
      }

      return new RegExp(regexPattern, 'i');
    } catch (error) {
      this.logger.error(
        `Invalid regex pattern for path "${path}": ${error.message}`,
      );
      return /(?!.*)/;
    }
  }

  private shouldSkipAuth(url: string, method: string): boolean {
    // 移除查询参数和片段
    let cleanUrl = url.split('?')[0].split('#')[0];
    if (!cleanUrl.startsWith('/')) {
      cleanUrl = '/' + cleanUrl;
    }

    // 准备测试的URL列表
    const testUrls = this.prepareTestUrls(cleanUrl);

    // 调试日志
    this.logger.verbose(`Auth check - Original URL: ${cleanUrl}`);
    this.logger.verbose(`Auth check - Test URLs: ${JSON.stringify(testUrls)}`);
    this.logger.verbose(`Auth check - Method: ${method}`);

    // 遍历规则进行匹配
    for (const rule of this.compiledRules) {
      for (const testUrl of testUrls) {
        if (rule.test(testUrl, method)) {
          this.logger.verbose(
            `Auth skip matched - Rule: "${rule.originalPath}", Matched URL: "${testUrl}", Method: "${method}"`,
          );
          return true;
        }
      }
    }

    return false;
  }

  private prepareTestUrls(cleanUrl: string): string[] {
    const testUrls: string[] = [cleanUrl];

    // 如果没有配置 serverPath，只测试原始URL
    if (!this.hasServerPath) {
      return testUrls;
    }

    // 如果URL包含serverPath，添加去掉前缀的版本
    if (cleanUrl.startsWith(this.serverPath)) {
      const urlWithoutPrefix =
        cleanUrl.substring(this.serverPath.length) || '/';
      testUrls.push(urlWithoutPrefix);

      this.logger.verbose(
        `Auth check - URL contains server path, testing without prefix: ${urlWithoutPrefix}`,
      );
    }
    // 如果URL不包含serverPath，添加带前缀的版本
    else {
      const urlWithPrefix = this.serverPath + cleanUrl;
      testUrls.push(urlWithPrefix);

      this.logger.verbose(
        `Auth check - URL missing server path, testing with prefix: ${urlWithPrefix}`,
      );
    }

    return testUrls;
  }

  private extractPathFromRequest(req: Request): string {
    // 优先使用 originalUrl，其次是 url，最后是 path
    let path = req.originalUrl || req.url || req.path || '/';

    // 如果是完整URL，提取路径部分
    if (path.includes('://')) {
      try {
        const url = new URL(path);
        path = url.pathname;
      } catch (e) {
        // 解析失败，继续使用原始路径
      }
    }

    // 移除查询参数和片段
    path = path.split('?')[0].split('#')[0];

    // 确保以 / 开头
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    return path;
  }

  private getFullUrl(req: Request): string {
    const protocol = req.protocol;
    const host = req.get('host');
    const path = req.originalUrl || req.url;
    return `${protocol}://${host}${path}`;
  }

  private async isUserLoggedIn(uid: string): Promise<any> {
    const sessionId = `${this.options.sessionPrefix || 'inner'}:${uid}`;
    const userInfo = await this.authClient.getSessionInfo(sessionId);
    return userInfo.result;
  }

  private setContext(user: any) {
    this.contextService.setContext('userId', user.id);
    this.contextService.setContext('userName', user.userName);
    this.contextService.setContext('realName', user.realName);
    this.contextService.setContext('companyId', user.companyId);
    this.contextService.setContext('companyName', user.companyName);
  }

  private isAjaxRequest(req: Request): boolean {
    if (
      (req.get('x-requested-with') || '').toLowerCase() === 'xmlhttprequest'
    ) {
      return true;
    }
    const secFetchMode = req.get('sec-fetch-mode');
    if (secFetchMode && secFetchMode !== 'navigate') return true;
    const accept = req.get('accept') || '';
    if (accept.includes('application/json') && !accept.includes('text/html')) {
      return true;
    }
    return false;
  }

  private redirectToLogin(req: Request, res: Response): void {
    const loginUrl = this.authClient.getLoginUrl();
    if (this.isAjaxRequest(req)) {
      res
        .status(401)
        .json({ code: 302, redirectUrl: loginUrl, message: 'session expired' });
      return;
    }
    res.redirect(loginUrl);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const method = req.method;
    const requestPath = this.extractPathFromRequest(req);

    try {
      this.logger.verbose(
        `Auth Middleware - Processing: ${method} ${requestPath}`,
      );

      // 检查是否应该跳过认证
      if (this.shouldSkipAuth(requestPath, method)) {
        this.logger.verbose(
          `Auth Middleware - Skipped: ${method} ${requestPath}`,
        );
        return next();
      }

      // 执行认证逻辑
      const innerUid =
        req.signedCookies?.[this.options.cookieAttrName || '__inneruid'];
      this.logger.verbose(`Auth Middleware - innerUid: ${innerUid}`);

      if (innerUid) {
        const userInfo = await this.isUserLoggedIn(innerUid);
        if (userInfo) {
          this.setContext(userInfo);
          const sessionId = `${this.options.sessionPrefix || 'inner'}:${innerUid}`;
          this.authClient.updateSessionInfo(sessionId);
          return next();
        }
      }

      // 认证失败，重定向到登录页
      this.logger.verbose(
        `Auth Middleware - Redirecting to login: ${method} ${requestPath}`,
      );
      this.redirectToLogin(req, res);
    } catch (error) {
      this.logger.error(
        `Auth Middleware Error - ${error.message}`,
        error.stack,
      );
      this.redirectToLogin(req, res);
    }
  }
}

```


> 代码路径  `src\auth-client.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { AUTH_CLIENT_MODULE_OPTIONS } from './auth-client.constants';
import { AuthAsyncOptions, AuthOptions } from './auth-options.interface';
import { AuthClientService } from './auth-client.service';

@Module({})
export class AuthClientModule {
  static forRoot(options: AuthOptions, isGlobal = true): DynamicModule {
    return {
      global: isGlobal,
      module: AuthClientModule,
      providers: [
        AuthClientService,
        {
          provide: AUTH_CLIENT_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [AuthClientService, AUTH_CLIENT_MODULE_OPTIONS],
    };
  }

  static forRootAsync(
    options: AuthAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: AuthClientModule,
      imports: options.imports,
      providers: [
        AuthClientService,
        {
          provide: AUTH_CLIENT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [AuthClientService, AUTH_CLIENT_MODULE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\auth-client.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { RpcClient } from '@cs/nest-cloud';
import { AuthOptions } from './auth-options.interface';
import { AUTH_CLIENT_MODULE_OPTIONS } from './auth-client.constants';

@Injectable()
export class AuthClientService {
  constructor(
    @Inject(AUTH_CLIENT_MODULE_OPTIONS)
    private readonly options: AuthOptions,
    private readonly rpcClient: RpcClient,
  ) { }

  getLoginUrl(): string {
    return `${this.options.authServerUrl}/login.html`;
  }

  async getSessionInfo (sessionId: string): Promise<any> {
    const response = await this.rpcClient.call({
      rpcConfig: {
        serviceName: 'node-pf-cas-session-service',
        servicePath: 'sessionServer',
      },
      payload: {
        method: 'session.getSession',
        params: {
          sessionId,
        },
      },
    });
    return response;
  }

  async updateSessionInfo (sessionId: string): Promise<void> {
    await this.rpcClient.call({
      rpcConfig: {
        serviceName: 'node-pf-cas-session-service',
        servicePath: 'sessionServer',
      },
      payload: {
        method: 'session.refreshSession',
        params: {
          sessionId,
          ttl: this.options.sessionTTL,
        },
        isNotify: true,
      },
    });
  }
}

```


> 代码路径  `src\auth-options.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';

export interface AuthSkipRule {
  /** 支持通配符的路径规则 */
  path: string;
  /** HTTP 方法，不指定则匹配所有方法 */
  method?: HttpMethod;
  /** 规则描述，便于维护 */
  description?: string;
}

export interface AuthOptions {
  /** CAS 服务登录地址 */
  authServerUrl: string;
  /** 是否使用 HTTPS */
  secure: boolean;
  /** Session 过期时间（秒） */
  sessionTTL: number;
  /** 跳过认证的规则数组 */
  skipRules?: AuthSkipRule[];
  /** 简单路径数组（向后兼容） */
  skipPaths?: string[];
  /** 静态文件扩展名数组 */
  skipStaticExtensions?: string[];
  /** Cookie 属性名 */
  cookieAttrName?: string;
  /** Session 存储前缀 */
  sessionPrefix?: string;
}

export interface AuthAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => AuthOptions | Promise<AuthOptions>;
  inject?: any[];
}

```


> 代码路径  `src\index.ts`

```typescript
export * from './auth-client.service';
export * from './auth-client.middleware';
export * from './auth-client.module';

```


#### 代码说明

# Auth Client Library

一个基于 NestJS 的认证客户端库，提供统一的身份验证和会话管理功能。

## 功能特性

- 🔐 统一身份验证中间件
- 🍪 基于 Cookie 的会话管理
- 🔄 自动会话续期
- 🌐 支持重定向到登录页面
- 📝 集成日志和上下文服务
- ⚙️ 灵活的配置选项

## 安装

```bash
npm install @cs/auth-client
# 或
yarn add @cs/auth-client
```

## 快速开始

### 1. 基本配置

在您的 `app.module.ts` 中导入并配置模块：

```typescript
import { Module } from '@nestjs/common';
import { AuthClientModule } from '@cs/nest-auth-client';

@Module({
  imports: [
    AuthClientModule.forRoot({
      authServerUrl: 'https://your-auth-server.com',
      secure: true,
      sessionTTL: 3600000, // 1小时，单位毫秒
    }),
  ],
})
export class AppModule {}
```

### 2. 模块注册

如果需要从配置服务动态获取配置：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthClientModule } from '@cs/auth-client';

@CSModule({
  imports: [
    AuthClientModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        return {
          ...config.get('auth'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [AuthClientModule],
})
export class ShareModule {}
```

### 3. 应用中间件


```typescript


import { CSModule } from '@cs/nest-cloud';
import { AuthClientMiddleware } from '@cs/nest-auth-client';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ShareModule } from './share.module';
@CSModule({
  imports: [ShareModule],
  providers: [AppService],
  controllers: [AppController],
  exports: [ShareModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthClientMiddleware).forRoutes('/*');
  }
}
```

## 配置选项

### AuthOptions

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `authServerUrl` | `string` | ✅ | 认证服务器的 URL 地址 |
| `secure` | `boolean` | ✅ | 是否使用 HTTPS |
| `sessionTTL` | `number` | ✅ | 会话过期时间（毫秒） |
| `skipRules` | `AuthSkipRule[]` | ❌ | 跳过规则数组 |
| `skipPaths` | `string[]` | ❌ | 简单路径数组（向后兼容） |
| `skipStaticExtensions` | `string[]` | ❌ | 静态文件扩展名 |
| `cookieAttrName` | `string` | ❌ | cookie的属性名 |
| `sessionPrefix` | `string` | ❌ | session 存储前缀 |

### 示例配置

```yaml
auth:
  authServerUrl: 'https://auth.example.com',
  secure: true,
  sessionTTL: 7200000, // 2小时
```


## 1. 修改配置接口

**修改 `auth-options.interface.ts`**：
```typescript
import { ModuleMetadata } from '@nestjs/common';

export interface AuthSkipRule {
  path: string;           // 支持通配符的路径规则
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  description?: string;   // 规则描述，便于维护
}

export interface AuthOptions {
  authServerUrl: string;
  secure: boolean;
  sessionTTL: number;
  
  // 新增跳过配置
  skipRules?: AuthSkipRule[];     // 跳过规则数组
  skipPaths?: string[];           // 简单路径数组（向后兼容）
  skipStaticExtensions?: string[]; // 静态文件扩展名
  enableDefaultSkipRules?: boolean; // 是否启用默认跳过规则，默认true
}

export interface AuthAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => AuthOptions | Promise<AuthOptions>;
  inject?: any[];
}
```


## 4. 跳过认证使用示例

### 基础配置

```typescript
AuthClientModule.forRoot({
  authServerUrl: 'https://auth.example.com',
  secure: true,
  sessionTTL: 3600,
  
  // 静态文件扩展名跳过
  skipStaticExtensions: ['css', 'js', 'png', 'jpg', 'gif', 'svg', 'ico', 'woff', 'woff2'],
  
  // 简单路径跳过
  skipPaths: [
    '/public/**',
    '/assets/**',
    '/static/**'
  ],
  
  // 详细规则配置
  skipRules: [
    { path: '/password-reset.html', method: 'ALL', description: 'Password reset page' },
    { path: '/password-reset/**', method: 'ALL', description: 'Password reset resources' },
    { path: '/api/public/**', method: 'ALL', description: 'Public API' },
    { path: '/api/auth/login', method: 'POST', description: 'Login API' },
    { path: '/api/auth/register', method: 'POST', description: 'Register API' },
    { path: '/webhook/*', method: 'POST', description: 'Webhook endpoints' },
    { path: '*.json', method: 'GET', description: 'JSON files' },
    { path: '*.xml', method: 'GET', description: 'XML files' },
  ]
})
```

### 高级配置

```typescript
AuthClientModule.forRoot({
  authServerUrl: 'https://auth.example.com',
  secure: true,
  sessionTTL: 3600,
  enableDefaultSkipRules: true, // 启用默认规则
  
  skipRules: [
    // 页面级跳过
    { path: '/admin/login.html', method: 'ALL' },
    { path: '/admin/login/**', method: 'ALL' },
    
    // API 级跳过
    { path: '/api/v1/public/**', method: 'ALL' },
    { path: '/api/v1/auth/*', method: 'POST' },
    
    // 文件类型跳过
    { path: '*.map', method: 'GET' },
    { path: '*.woff2', method: 'GET' },
    
    // 特定功能跳过
    { path: '/captcha/*', method: 'GET' },
    { path: '/upload/temp/*', method: 'POST' },
    
    // 第三方回调
    { path: '/callback/oauth/**', method: 'ALL' },
    { path: '/webhook/payment/*', method: 'POST' },
  ]
})
```

## 5. 通配符规则说明

| 通配符 | 说明 | 示例 | 匹配路径 |
|--------|------|------|----------|
| `*` | 匹配单层路径中的任意字符（不包括 `/`） | `/api/*/users` | `/api/v1/users`, `/api/v2/users` |
| `**` | 匹配任意层级路径（包括 `/`） | `/static/**` | `/static/css/main.css`, `/static/js/app.js` |
| `*.ext` | 匹配任意文件名的特定扩展名 | `*.css` | `/style.css`, `/theme/main.css` |
| `path/*` | 匹配路径下的直接子资源 | `/assets/*` | `/assets/logo.png`（不匹配 `/assets/img/logo.png`） |
| `path/**` | 匹配路径下的所有子资源 | `/assets/**` | `/assets/logo.png`, `/assets/img/logo.png` |


