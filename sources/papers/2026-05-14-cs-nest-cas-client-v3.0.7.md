---
title: "@cs/nest-cas-client · 源码整理 v3.0.7"
type: source
aliases: ["@cs/nest-cas-client 源码", "nest-cas-client 源码"]
tags: [nestjs, mwp, code-docs, cas, sso, authentication, middleware]
status: stable
version: "3.0.7"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-cas-client.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-cas-client · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：3.0.7
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-cas-client代码库源码整理

#### 代码目录
```
@cs/nest-cas-client/
├── src/
├── cas-client.constants.ts
├── cas-client.middleware.ts
├── cas-client.module.ts
├── cas-client.service.ts
├── cas-options.interface.ts
└── index.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-cas-client",
  "version": "3.0.7",
  "description": "> TODO: description",
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


> 代码路径  `src\cas-client.constants.ts`

```typescript
export const CAS_CLIENT_MODULE_OPTIONS = Symbol('CAS_CLIENT_MODULE_OPTIONS');

```


> 代码路径  `src\cas-client.middleware.ts`

```typescript
import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  User,
  LoggerService,
  ContextService,
  CommonUtil,
} from '@cs/nest-common';
import { CasClientService } from './cas-client.service';
import { CasOptions, CasSkipRule } from './cas-options.interface';
import { CAS_CLIENT_MODULE_OPTIONS } from './cas-client.constants';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface ST {
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

interface CompiledSkipRule {
  originalPath: string;
  regex: RegExp;
  method: string;
  description?: string;
  test: (url: string, method: string) => boolean;
}

@Injectable()
export class CasClientMiddleware implements NestMiddleware {
  private compiledRules: CompiledSkipRule[] = [];
  private serverPath = '';
  private hasServerPath = false;

  constructor(
    @Inject(CAS_CLIENT_MODULE_OPTIONS)
    private readonly options: CasOptions,
    private readonly casClient: CasClientService,
    private readonly logger: LoggerService,
    private readonly contextService: ContextService,
  ) {
    this.initializeServerPath();
    this.initializeSkipRules();
  }

  private initializeServerPath() {
    const serverPath = process.env.CS_SERVERPATH;
    this.hasServerPath = !!(serverPath && serverPath.trim());

    if (this.hasServerPath) {
      this.serverPath = '/' + serverPath.trim().replace(/^\/+|\/+$/g, '');
    }

    this.logger.verbose(
      `CAS Middleware - Server Path: ${this.hasServerPath ? this.serverPath : 'None'}`,
    );
  }

  private initializeSkipRules() {
    const rules: CasSkipRule[] = [];

    // 默认跳过规则
    if (this.options.enableDefaultSkipRules !== false) {
      rules.push(
        { path: '/favicon.ico', method: 'GET', description: 'Favicon' },
        { path: '/robots.txt', method: 'GET', description: 'Robots file' },
      );
    }

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
      `CAS Middleware initialized with ${this.compiledRules.length} skip rules:${JSON.stringify(this.compiledRules)}`,
    );
  }

  private compileSkipRule(rule: CasSkipRule): CompiledSkipRule {
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
    this.logger.verbose(`CAS check - Original URL: ${cleanUrl}`);
    this.logger.verbose(`CAS check - Test URLs: ${JSON.stringify(testUrls)}`);
    this.logger.verbose(`CAS check - Method: ${method}`);

    // 遍历规则进行匹配
    for (const rule of this.compiledRules) {
      for (const testUrl of testUrls) {
        if (rule.test(testUrl, method)) {
          this.logger.verbose(
            `CAS skip matched - Rule: "${rule.originalPath}", Matched URL: "${testUrl}", Method: "${method}"`,
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
        `CAS check - URL contains server path, testing without prefix: ${urlWithoutPrefix}`,
      );
    }
    // 如果URL不包含serverPath，添加带前缀的版本
    else {
      const urlWithPrefix = this.serverPath + cleanUrl;
      testUrls.push(urlWithPrefix);

      this.logger.verbose(
        `CAS check - URL missing server path, testing with prefix: ${urlWithPrefix}`,
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
    const protocol = this.options.secure ? 'https' : 'http';
    const host = req.get('host');
    const path = req.originalUrl || req.url; // 使用originalUrl包含完整的查询参数
    return `${protocol}://${host}${path}`;
  }

  private async isUserLoggedIn(uid: string): Promise<any> {
    // 判断用户登录
    const sessionId = `yunque:${uid}`;
    // 集成第三方时考虑
    const userInfo = await this.casClient.getSessionInfo(sessionId);
    return userInfo;
  }
  private async handleTicketValidation(
    ticket: string,
    fullUrl: string,
    req: Request,
    res: Response,
  ) {
    // 1. 验证 ST 并获取用户信息
    const user = await this.casClient.validateTicket(ticket, fullUrl);

    // 获取st信息
    // this.logger.verbose(`CAS Middleware - ST: ${ticket} `);
    const stInfo: ST = await this.casClient.getSessionInfo(
      ticket,
      'cas:ticket:st:',
    );
    // this.logger.verbose(`CAS Middleware - ST: ${JSON.stringify(stInfo)}`);
    // 2. 将用户信息存储到 session 中
    const uid = await this.setUserToSession(user, stInfo.tgtId);

    // 3. 设置 session cookie
    this.setSessionCookie(uid, res);

    // 4. 清理 URL 中的 ticket 参数，避免后续请求带上 ST
    const cleanUrl = this.removeTicketFromUrl(fullUrl);

    // 5. 重定向到清理过的 URL
    return res.redirect(cleanUrl);
  }

  private async setUserToSession(user: any, tgtid: string): Promise<string> {
    // 生成 sessionId
    const uId = `${tgtid}-` + CommonUtil.getRandomString(10);
    const sessionId = `yunque:${uId}`;
    await this.casClient.setSessionInfo(sessionId, user);
    return uId;
  }

  private setContext(user: any) {
    this.contextService.setContext('userId', user.userId);
    this.contextService.setContext('tenantId', user.tenantId);
    this.contextService.setContext('tenantCode', user.tenantCode);
    this.contextService.setContext('userName', user.attributes.userName);
    this.contextService.setContext('realName', user.attributes.realName);
  }

  private setSessionCookie(uid: string, res: Response) {
    if (uid) {
      res.cookie('__casuid', uid, {
        signed: true,
        httpOnly: true, // 设置 HttpOnly 以防止 JavaScript 访问
        secure: this.options.secure || false, // 生产环境使用 secure cookie
        maxAge: this.options.cookie.casuid || 3600 * 1000, // 设置 cookie 的过期时间
      });
    }
  }

  /**
   * 检测是否为移动端WebView
   */
  private isMobileWebView(req: Request): boolean {
    // 方式1: 检查自定义Header (推荐，更可靠)
    const mobileHeader = req.headers['x-mobile-webview'];
    if (mobileHeader === 'true' || mobileHeader === '1') {
      return true;
    }

    // 方式2: 检查User-Agent (备用)
    const userAgent = req.headers['user-agent'] || '';
    const mobilePatterns = [/Flutter/i, /MobileWebView/i, /AppWebView/i];

    return mobilePatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * 处理移动端WebView认证失败
   */
  private handleMobileAuthFailure(res: Response) {
    return res.status(401).json({
      code: 'MOBILE_SESSION_EXPIRED',
      message: 'Session expired, please refresh WebView cookies',
      requireReauth: true,
    });
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

  private redirectToLogin(req: Request, res: Response, fullUrl: string) {
    if (this.isAjaxRequest(req)) {
      // AJAX 请求：用 referer（前端页面 URL）作为登录后回跳目标，避免跳回 API URL
      const referer = req.get('referer');
      const loginUrl = this.casClient.getLoginUrl(referer || fullUrl);
      res
        .status(401)
        .json({ code: 302, redirectUrl: loginUrl, message: 'session expired' });
      return;
    }
    const loginUrl = this.casClient.getLoginUrl(fullUrl);
    return res.redirect(loginUrl);
  }

  // 私有方法，用于从 URL 中删除 ticket 参数
  private removeTicketFromUrl(url: string): string {
    // 使用 URL 对象来解析和修改 URL
    const urlObj = new URL(url);
    // 删除 URL 中的 ticket 参数
    urlObj.searchParams.delete('ticket');
    return urlObj.toString();
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const method = req.method;
    const requestPath = this.extractPathFromRequest(req);
    const fullUrl = this.getFullUrl(req);
    try {
      this.logger.verbose(
        `CAS Middleware - Processing: ${method} ${requestPath}`,
      );

      // 0. 检查是否应该跳过认证
      if (this.shouldSkipAuth(requestPath, method)) {
        this.logger.verbose(
          `CAS Middleware - Skipped: ${method} ${requestPath}`,
        );
        return next();
      }
      this.logger.verbose(`CAS Middleware - fullUrl:${fullUrl}`);
      // 1. 检查 URL 中是否带有 ST 票据 (应该优先于casuid检查，解决uid更新问题， 另外uid考虑添加servier信息？？)
      const ticket = req.query.ticket as string;
      this.logger.verbose(`CAS Middleware - ticket:${ticket}`);
      if (ticket) {
        await this.handleTicketValidation(ticket, fullUrl, req, res);
        return;
      }
      this.logger.verbose('CAS Middleware - no ticket in url');

      // 2. 如果 session 中已存在用户信息，直接放行
      const casuid = req.signedCookies?.['__casuid'];
      this.logger.verbose(`CAS Middleware - casuid:${casuid}`);
      if (casuid) {
        const userInfo = await this.isUserLoggedIn(casuid);
        if (!!userInfo) {
          this.setContext(userInfo);
          return next();
        }
      }
      // 3. 如果以上都不满足，根据客户端类型返回不同响应
      // if (this.isMobileWebView(req)) {
      //   return this.handleMobileAuthFailure(res);
      // }
      this.redirectToLogin(req, res, fullUrl);
    } catch (error) {
      this.logger.verbose(`CAS Middleware - ${error.message}`);
      // if (this.isMobileWebView(req)) {
      //   return this.handleMobileAuthFailure(res);
      // }
      this.redirectToLogin(req, res, fullUrl);
    }
  }
}

```


> 代码路径  `src\cas-client.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { CAS_CLIENT_MODULE_OPTIONS } from './cas-client.constants';
import { CasAsyncOptions, CasOptions } from './cas-options.interface';
import { CasClientService } from './cas-client.service';

@Module({})
export class CasClientModule {
  static forRoot(options: CasOptions, isGlobal = true): DynamicModule {
    return {
      global: isGlobal,
      module: CasClientModule,
      providers: [
        CasClientService,
        {
          provide: CAS_CLIENT_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [CasClientService, CAS_CLIENT_MODULE_OPTIONS],
    };
  }

  static forRootAsync(
    options: CasAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: CasClientModule,
      imports: options.imports,
      providers: [
        CasClientService,
        {
          provide: CAS_CLIENT_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [CasClientService, CAS_CLIENT_MODULE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\cas-client.service.ts`

```typescript
import { Injectable, Inject } from '@nestjs/common';
import {
  RpcClient,
  RpcErrorCode,
  RpcException,
  getRPCResult,
} from '@cs/nest-cloud';
import { CasOptions } from './cas-options.interface';
import { CAS_CLIENT_MODULE_OPTIONS } from './cas-client.constants';
interface ServiceResponse {
  authenticationSuccess?: {
    user: string;
    tenantId: string;
    tenantCode?: string;
    attributes?: Record<string, any>;
  };
  authenticationFailure?: {
    code: string;
    description: string;
  };
}

@Injectable()
export class CasClientService {
  constructor(
    @Inject(CAS_CLIENT_MODULE_OPTIONS)
    private readonly options: CasOptions,
    private readonly rpcClient: RpcClient,
  ) { }

  async validateTicket (
    ticket: string,
    actualService?: string,
  ): Promise<object> {
    try {
      // 使用实际的service URL
      const service = actualService || this.options.serviceUrl;
      const response = await this.rpcClient.call<
        any,
        {
          serviceResponse: ServiceResponse;
        }
      >({
        rpcConfig: {
          serviceName: 'node-pf-cas-system', // 目标服务名称
          servicePath: '',
        },
        payload: {
          method: 'service-validate.validateServiceTicket',
          params: {
            ticket,
            service,
            renew: false,
            format: 'JSON',
          },
        },
      });
      const result = getRPCResult<{
        serviceResponse: ServiceResponse;
      }>(response)?.serviceResponse;
      if (result && result.authenticationSuccess) {
        return {
          userId: result.authenticationSuccess.user,
          tenantId: result.authenticationSuccess.tenantId,
          tenantCode: result.authenticationSuccess.tenantCode,
          attributes: result.authenticationSuccess.attributes,
        };
      }

      const failure = result?.authenticationFailure;
      throw new RpcException(
        failure?.description || 'Invalid ticket',
        RpcErrorCode.UNAUTHORIZED,
      );
    } catch (error) {
      throw new RpcException(error.message, RpcErrorCode.UNAUTHORIZED);
    }
  }
  getLoginUrl (actualService?: string): string {
    const service = encodeURIComponent(
      actualService || this.options.serviceUrl,
    );
    const loginUrl = `${this.options.casServerUrl}/login.html?service=${service}`;
    return loginUrl;
  }

  async getSessionInfo (sessionId: string, prefix?: string): Promise<any> {
    const response = await this.rpcClient.call({
      rpcConfig: {
        serviceName: 'node-pf-cas-session-service', // 目标服务名称
        servicePath: 'sessionServer',
      },
      payload: {
        method: 'session.getSession',
        params: {
          sessionId,
          prefix
        },
      },
    });
    return getRPCResult(response);
  }

  async setSessionInfo (
    sessionId: string,
    userInfo: Record<string, any>,
  ): Promise<void> {
    await this.rpcClient.call({
      rpcConfig: {
        serviceName: 'node-pf-cas-session-service', // 目标服务名称
        servicePath: 'sessionServer',
      },
      payload: {
        method: 'session.setSession',
        params: {
          sessionId,
          userData: userInfo,
        },
        isNotify: true,
      },
    });
  }
}

```


> 代码路径  `src\cas-options.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';

export interface CasSkipRule {
  path: string; // 支持通配符的路径规则
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  description?: string; // 规则描述，便于维护
}

export interface CasOptions {
  casServerUrl: string; // cas服务登录地址
  serviceUrl: string; //认证成功回调地址
  cookie: Cookie;
  secure: boolean; //是否使用https
  skipRules?: CasSkipRule[]; // 跳过规则数组
  skipPaths?: string[]; // 简单路径数组（向后兼容）
  skipStaticExtensions?: string[]; // 静态文件扩展名
  enableDefaultSkipRules?: boolean; // 是否启用默认跳过规则
}

export interface CasAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => CasOptions | Promise<CasOptions>;
  inject?: any[];
}

interface Cookie {
  tgc: number;
  casuid: number;
}

```


> 代码路径  `src\index.ts`

```typescript
export * from './cas-client.service';
export * from './cas-client.middleware';
export * from './cas-client.module';
export * from './cas-options.interface';

```


#### 代码说明


## cas客户端

一个完整的 NestJS 模块，为您的应用提供中央认证服务 (CAS) 集成。

## 安装

```bash
npm install @cs/nest-cas-client
```

## 概述

本库提供了 NestJS 应用的完整 CAS 客户端实现，使您能够轻松地与 CAS 服务器集成进行身份验证。它提供：

- 处理 CAS 认证流程的中间件
- 用于票据验证和会话管理的服务方法
- 可配置的 CAS 服务器集成选项

## 快速开始

###  注册模块

您可以使用 `forRoot` 方法注册模块：

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { CasClientModule } from '@cs/nest-cas-client';

@Module({
  imports: [
    CasClientModule.forRoot({
      casServerUrl: 'https://cas.example.com', // CAS 服务器 URL
      serviceUrl: 'https://yourapp.example.com', // 您的应用 URL
      cookie: {
        tgc: 86400000, // 24小时（毫秒）
        casuid: 3600000, // 1小时（毫秒）
      },
      secure: true, // 使用安全 cookie（生产环境推荐）
    }),
  ], 
})
export class AppModule {}
```

或者使用异步配置：

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CasClientModule } from '@cs/nest-cas-client';

@Module({
   imports: [
    CasClientModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return {
          ...config.get('cas'),
        };
      },
    }),
  ],
  exports: [CasClientModule],
})
export class AppModule {}
```

客户端认证流程:
1. 检查用户是否已登录（通过 cookie）
2. 如果 URL 中有票据，验证票据并设置用户会话
3. 如果未登录且无票据，重定向到 CAS 登录页面

## 工作原理

CAS 客户端库实现了完整的 CAS 协议流程：

1. 未登录用户访问受保护资源时，会被重定向到 CAS 服务器登录页面
2. 用户在 CAS 服务器上完成身份验证后，会被重定向回原始服务，并携带服务票据 (ST)
3. 中间件验证票据并从 CAS 服务器获取用户信息
4. 将用户信息存储在会话中，并设置用户 cookie
5. 用户后续请求将使用 cookie 进行身份验证，而不需要重新登录


## 使用示例

### 模块注册
```ts
import { Global } from '@nestjs/common';
import { CSModule } from '@cs/nest-cloud';
import { ConfigService } from '@cs/nest-config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CasClientModule } from '@cs/nest-cas-client';
// 全局模块
@Global()
// 模块装饰器
@CSModule({
  // 导入模块
  imports: [
    CasClientModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return {
          ...config.get('cas'),
        };
      },
    }),
  ],
  exports: [CasClientModule],
})
export class ShareModule {}
```

### 中间件注册

```ts
import { CSModule } from '@cs/nest-cloud';
import { CasClientMiddleware } from '@cs/nest-cas-client';
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
    consumer.apply(CasClientMiddleware).forRoutes('/*');
  }
}

```

## 跳过权限认证配置

CAS 客户端提供了多种方式来跳过特定路径的权限认证，这对于公共资源、健康检查端点、静态文件等场景非常有用。

### 配置选项

```typescript
CasClientModule.forRoot({
  casServerUrl: 'https://cas.example.com',
  serviceUrl: 'https://yourapp.example.com',
  cookie: {
    tgc: 86400000,
    casuid: 3600000,
  },
  secure: true,
  
  // === 跳过认证配置 ===
  
  // 1. 启用/禁用默认跳过规则（默认为 true）
  enableDefaultSkipRules: true,
  
  // 2. 简单路径数组（支持通配符）
  skipPaths: [
    '/api/public',
    '/docs/**',
    '/swagger/**',
  ],
  
  // 3. 静态文件扩展名
  skipStaticExtensions: [
    '.css', '.js', '.png', '.jpg', 
    '.ico', '.woff', '.woff2'
  ],
  
  // 4. 详细跳过规则（最灵活）
  skipRules: [
    {
      path: '/api/health',
      method: 'GET',
      description: '健康检查端点'
    },
    {
      path: '/api/metrics',
      method: 'GET', 
      description: 'Prometheus 监控指标'
    },
    {
      path: '/uploads/**',
      method: 'ALL',
      description: '文件上传目录'
    },
    {
      path: '/api/webhook/**',
      method: 'POST',
      description: 'Webhook 回调'
    }
  ]
})
```

### 跳过规则类型说明

#### 1. 默认跳过规则
当 `enableDefaultSkipRules` 为 `true`（默认值）时，自动跳过以下路径：
- `GET /health` - 健康检查
- `GET /metrics` - 监控指标
- `GET /favicon.ico` - 网站图标
- `GET /robots.txt` - 爬虫协议

```typescript
// 禁用默认规则
CasClientModule.forRoot({
  // ... 其他配置
  enableDefaultSkipRules: false, // 禁用默认跳过规则
})
```

#### 2. 简单路径跳过 (skipPaths)
最简单的配置方式，支持通配符：

```typescript
skipPaths: [
  '/public',           // 精确匹配
  '/static/*',         // 单级通配符
  '/docs/**',          // 多级通配符
  '/api/v*/public',    // 版本号通配符
]
```

#### 3. 静态文件扩展名跳过 (skipStaticExtensions)
自动跳过指定扩展名的所有文件：

```typescript
skipStaticExtensions: [
  '.css', '.js', '.ts',     // 样式和脚本
  '.png', '.jpg', '.svg',   // 图片文件
  '.woff', '.woff2', '.ttf', // 字体文件
  '.ico', '.xml', '.txt'    // 其他静态资源
]
```

#### 4. 详细跳过规则 (skipRules)
提供最大的灵活性，支持 HTTP 方法过滤：

```typescript
skipRules: [
  {
    path: '/api/public/**',
    method: 'ALL',           // 所有 HTTP 方法
    description: '公共 API'
  },
  {
    path: '/api/auth/login',
    method: 'POST',          // 仅 POST 方法
    description: '登录接口'
  },
  {
    path: '/api/users/register', 
    method: 'POST',
    description: '用户注册'
  }
]
```

### 路径通配符规则

| 模式 | 说明 | 示例匹配 |
|------|------|----------|
| `/api/public` | 精确匹配 | `/api/public` |
| `/static/*` | 单级通配符，不匹配 `/` | `/static/style.css` |
| `/docs/**` | 多级通配符，匹配任意深度 | `/docs/api/v1/users` |
| `/api/v*/users` | 单字符通配符 | `/api/v1/users`, `/api/v2/users` |
| `**.css` | 匹配所有 CSS 文件 | `/styles/app.css`, `/static/css/main.css` |

### 支持的 HTTP 方法

- `'GET'` - 仅 GET 请求
- `'POST'` - 仅 POST 请求  
- `'PUT'` - 仅 PUT 请求
- `'DELETE'` - 仅 DELETE 请求
- `'PATCH'` - 仅 PATCH 请求
- `'ALL'` - 所有 HTTP 方法（默认值）

### Server Path 支持

如果您的应用部署在子路径下（如 `https://domain.com/myapp`），CAS 中间件会自动处理路径前缀：

```bash
# 环境变量
CS_SERVERPATH=myapp

# 以下规则会自动匹配两种形式：
# - /myapp/api/health
# - /api/health
skipRules: [
  {
    path: '/api/health',
    method: 'GET'
  }
]
```

### 实际应用示例

#### Web 应用配置
```typescript
CasClientModule.forRoot({
  // ... 基础配置
  skipPaths: [
    '/login',
    '/register', 
    '/forgot-password'
  ],
  skipStaticExtensions: [
    '.css', '.js', '.png', '.jpg', '.ico'
  ],
  skipRules: [
    {
      path: '/api/captcha',
      method: 'GET',
      description: '验证码接口'
    }
  ]
})
```

#### API 服务配置
```typescript
CasClientModule.forRoot({
  // ... 基础配置
  skipRules: [
    {
      path: '/api/public/**',
      method: 'ALL',
      description: '公共 API'
    },
    {
      path: '/api/webhook/**', 
      method: 'POST',
      description: 'Webhook 回调'
    },
    {
      path: '/api/health',
      method: 'GET',
      description: '健康检查'
    },
    {
      path: '/api/metrics',
      method: 'GET', 
      description: 'Prometheus 指标'
    }
  ]
})
```

### 调试跳过规则

CAS 中间件在 `verbose` 日志级别下会输出详细的规则匹配信息：

```typescript
// 启用详细日志
CasClientModule.forRoot({
  // ... 配置
})

// 日志输出示例：
// CAS Middleware initialized with 8 skip rules
// CAS check - Original URL: /api/health
// CAS check - Method: GET  
// CAS skip matched - Rule: "/health", Matched URL: "/api/health", Method: "GET"
// CAS Middleware - Skipped: GET /api/health
```

### 注意事项

1. **规则优先级**：所有跳过规则具有相同优先级，任一规则匹配即跳过认证
2. **大小写敏感**：路径匹配不区分大小写
3. **性能考虑**：复杂的正则表达式可能影响性能，建议使用简单的通配符模式
4. **安全提醒**：跳过的路径应确保不包含敏感信息或操作

### 常见配置模板

```typescript
// 生产环境推荐配置
{
  enableDefaultSkipRules: true,
  skipStaticExtensions: ['.css', '.js', '.png', '.jpg', '.ico', '.woff', '.woff2'],
  skipRules: [
    { path: '/api/public/**', method: 'ALL', description: '公共API' },
    { path: '/health', method: 'GET', description: '健康检查' },
    { path: '/metrics', method: 'GET', description: '监控指标' }
  ]
}
```

