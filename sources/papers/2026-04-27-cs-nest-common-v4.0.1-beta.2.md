---
title: "@cs/nest-common · 源码整理 v4.0.1-beta.2"
type: source
tags: [nestjs, mwp, code-docs, context, logger, http, dto, crypto]
status: stable
version: "4.0.1-beta.2"
created: 2026-04-27
updated: 2026-04-27
---

# @cs/nest-common · 源码整理

## 元信息

- 来源类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：4.0.1-beta.2
- 作者：danielmlc
- 摄入日期：2026-04-27
- 摄入方式：粘贴模式

## 正文 / 摘录

### 代码目录

```
@cs/nest-common/
├── src/
├── constants/
│   └── index.ts
├── context/
│   ├── context.constants.ts
│   ├── context.interfaces.ts
│   ├── context.module.ts
│   ├── context.service.ts
│   └── index.ts
├── dto/
│   ├── base.dto.ts
│   ├── hasEnable.dto.ts
│   ├── hasPrimary.dto.ts
│   ├── index.ts
│   ├── pageResult.dto.ts
│   ├── queryConditionInput.dto.ts
│   ├── result.dto.ts
│   └── tree.dto.ts
├── http/
│   ├── http.constants.ts
│   ├── http.interface.ts
│   ├── http.module.ts
│   ├── http.service.ts
│   └── index.ts
├── interface/
│   ├── express-extend.ts
│   └── index.ts
├── logger/
│   ├── index.ts
│   ├── logger.constants.ts
│   ├── logger.interface.ts
│   ├── logger.module.ts
│   └── logger.service.ts
├── utils/
│   ├── common.util.ts
│   ├── crypto.util.ts
│   └── index.ts
└── index.ts
└── package.json
```

### package.json

```json
{
  "name": "@cs/nest-common",
  "version": "4.0.1-beta.2",
  "description": "",
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
  "devDependencies": {
    "@types/crypto-js": "^4.2.2",
    "@types/express": "^4.17.21",
    "@types/lodash": "^4.14.178",
    "@nestjs/schematics": "^10.2.3"
  },
  "dependencies": {
    "@nestjs/swagger": "^8.0.7",
    "axios": "^0.27.2",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.13.2",
    "express": "^4.18.1",
    "lodash": "^4.17.21",
    "nanoid": "^3.3.2",
    "swagger-ui-express": "^5.0.1",
    "argon2": "^0.41.1",
    "winston": "^3.7.2",
    "winston-daily-rotate-file": "^4.7.1",
    "@nestjs/common": "^10.4.8",
    "@nestjs/core": "^10.4.8",
    "@nestjs/platform-express": "^10.4.8"
  }
}
```

### src/index.ts

```typescript
export * from './utils';
export * from './constants';
export * from './dto';
export * from './logger';
export * from './interface/index';
export * from './context';
```

### src/constants/index.ts

```typescript
export enum EHttpStatus {
  Error = 'error',
  Success = 'success',
}

export enum EHttpExtendStatus {
  INTERNAL_RPC_SERVER_ERROR = 508,
  INTERNAL_RPC_SERVER_TIMEOUT = 509,
}
```

### src/context/context.constants.ts

```typescript
export const CONTEXT_MODULE_OPTIONS = Symbol('CONTEXT_MODULE_OPTIONS');
```

### src/context/context.interfaces.ts

```typescript
export interface UserContext {
  requestId: string;
  startTime: number;
  url: string;
  method: string;
  hopCount?: number;
  userId?: string;
  userName?: string;
  realName?: string;
  eMail?: string;
  phone?: string;
  orgId?: string;
  orgName?: string;
  orgType?: string;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  applicationId?: string;
  moduleId?: string;
  traceHeaders?: Record<string, string>;
  [key: string]: any;
}

export interface ContextModuleOptions {
  enableCaching?: boolean;
  cacheTTL?: number;
}

export const CONTEXT_HEADER = 'X-User-Context';
```

### src/context/context.module.ts

```typescript
import { Module, Global, DynamicModule } from '@nestjs/common';
import { ContextService } from './context.service';
import { CONTEXT_MODULE_OPTIONS } from './context.constants';
import { ContextModuleOptions } from './context.interfaces';

@Global()
@Module({})
export class ContextModule {
  static forRoot(
    options: ContextModuleOptions = {},
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: ContextModule,
      providers: [
        {
          provide: CONTEXT_MODULE_OPTIONS,
          useValue: {
            enableCaching: true,
            cacheTTL: -1,
            ...options,
          },
        },
        ContextService,
      ],
      exports: [ContextService, CONTEXT_MODULE_OPTIONS],
    };
  }
}
```

### src/context/context.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class ContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();
  private readonly logger = new Logger(ContextService.name);

  getContext<T>(key: string): T | undefined {
    const store = this.asyncLocalStorage.getStore();
    return store ? store.get(key) : undefined;
  }

  getAllContext(): Record<string, any> {
    const store = this.asyncLocalStorage.getStore();
    if (!store) return {};
    const contextObject = {};
    for (const [key, value] of store.entries()) {
      contextObject[key] = value;
    }
    return contextObject;
  }

  runWithContext<T>(context: Record<string, any>, callback: () => T): T {
    const store = new Map<string, any>();
    Object.entries(context).forEach(([key, value]) => {
      store.set(key, value);
    });
    return this.asyncLocalStorage.run(store, callback);
  }

  setContext(key: string, value: any): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.set(key, value);
    } else {
      this.logger.warn('No active context store found when setting context');
    }
  }

  deleteContext(key: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.delete(key);
    } else {
      this.logger.warn('No active context store found when deleting context');
    }
  }

  encodeContext(context: Record<string, any>): string {
    return Buffer.from(JSON.stringify(context)).toString('base64');
  }

  decodeContext(encodedContext: string): Record<string, any> {
    try {
      return JSON.parse(Buffer.from(encodedContext, 'base64').toString());
    } catch (error) {
      this.logger.error(`Failed to decode context: ${error.message}`);
      return {};
    }
  }
}
```

### src/dto/base.dto.ts

```typescript
import { IsDate, IsString, IsBoolean, IsInt } from 'class-validator';
export abstract class BaseDto {
  @IsDate() createdAt?: Date;
  @IsString() creatorId?: string;
  @IsString() creatorName?: string;
  @IsDate() modifiedAt?: Date;
  @IsString() modifierId?: string;
  @IsString() modifierName?: string;
  @IsBoolean() isRemoved?: boolean;
  @IsInt() version?: number;
}
```

### src/dto/tree.dto.ts

```typescript
import { BaseDto } from './base.dto';
import { IsString, IsInt, IsBoolean } from 'class-validator';
export abstract class TreeDto extends BaseDto {
  @IsString() parentId?: string;
  @IsString() fullId?: string;
  @IsString() fullName?: string;
  @IsInt() level?: number;
  @IsBoolean() isLeaf?: boolean;
}
```

### src/dto/hasEnable.dto.ts

```typescript
import { BaseDto } from './base.dto';
import { TreeDto } from './tree.dto';
import { IsBoolean, IsInt } from 'class-validator';
export abstract class HasEnableDto extends BaseDto {
  @IsInt() sortCode?: number;
  @IsBoolean() isEnable?: boolean;
}
export abstract class HasEnableTreeDto extends TreeDto {
  @IsInt() sortCode?: number;
  @IsBoolean() isEnable?: boolean;
}
```

### src/dto/hasPrimary.dto.ts

```typescript
import { BaseDto } from './base.dto';
import { TreeDto } from './tree.dto';
import { HasEnableDto, HasEnableTreeDto } from './hasEnable.dto';
import { IsString } from 'class-validator';
export abstract class HasPrimaryDto extends BaseDto {
  @IsString() id?: string;
}
export abstract class HasPrimaryTreeDto extends TreeDto {
  @IsString() id?: string;
}
export abstract class HasPrimaryFullDto extends HasEnableDto {
  @IsString() id?: string;
}
export abstract class HasPrimaryFullTreeDto extends HasEnableTreeDto {
  @IsString() id?: string;
}
```

### src/dto/result.dto.ts

```typescript
import { EHttpStatus } from '../constants';
export class Result<T> {
  code: number;
  status: EHttpStatus;
  message: any;
  error?: any;
  result?: T;
}
export class ErrorResult {
  code: number;
  message: string;
  bizCode?: number;
  data?: Record<string, any>;
  stack?: string;
  path?: string;
  timestamp?: string;
}
```

### src/dto/pageResult.dto.ts

```typescript
export interface PageResult<T> {
  result: T;
  count: number;
}
```

### src/dto/queryConditionInput.dto.ts

```typescript
export interface QueryConditionInput {
  tableName?: string;
  select?: string[];
  conditionLambda?: string;
  conditionValue?: Record<string, any>;
  orderBy?: Record<string, 'ASC' | 'DESC'>;
  skip?: number;
  take?: number;
}
```

### src/http/http.interface.ts

```typescript
import { ModuleMetadata } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface AxiosRequestInterceptors<T = AxiosResponse> {
  requestInterceptor?: (config: AxiosRequestConfig) => AxiosRequestConfig;
  requestInterceptorCatch?: (error: any) => any;
  responseInterceptor?: (res: T) => T;
  responseInterceptorCatch?: (error: any) => any;
}

export interface HttpModuleOptions<T = AxiosResponse> extends AxiosRequestConfig {
  interceptors?: AxiosRequestInterceptors<T>;
  debugAuth?: boolean;
  validateStatus?: ((status: number) => boolean) | null | undefined;
}

export interface HttpModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => HttpModuleOptions | Promise<HttpModuleOptions>;
  inject?: any[];
}
```

### src/http/http.module.ts

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { HTTP_MODULE_OPTIONS } from './http.constants';
import { HttpModuleOptions, HttpModuleAsyncOptions } from './http.interface';
import { HttpService } from './http.service';

@Module({})
export class HttpModule {
  static forRegister(options: HttpModuleOptions, isGlobal = false): DynamicModule {
    return {
      global: isGlobal,
      module: HttpModule,
      providers: [HttpService, { provide: HTTP_MODULE_OPTIONS, useValue: options }],
      exports: [HttpService, HTTP_MODULE_OPTIONS],
    };
  }

  static forRegisterAsync(options: HttpModuleAsyncOptions, isGlobal = false): DynamicModule {
    return {
      global: isGlobal,
      module: HttpModule,
      imports: options.imports,
      providers: [
        HttpService,
        { provide: HTTP_MODULE_OPTIONS, useFactory: options.useFactory, inject: options.inject },
      ],
      exports: [HttpService, HTTP_MODULE_OPTIONS],
    };
  }
}
```

### src/http/http.service.ts

（完整源码见原始粘贴内容——包含 request / get / post / put / delete / getAxiosInstance / addRequestInterceptor / addResponseInterceptor / removeRequestInterceptor / removeResponseInterceptor）

### src/logger/logger.interface.ts

```typescript
export type WinstonLogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

export interface LoggerModuleOptions {
  level?: WinstonLogLevel | 'none';
  timestamp?: boolean;
  disableConsoleAtProd?: boolean;
  maxFileSize?: string;
  maxFiles?: string;
  dir?: string;
  errorLogName?: string;
  appLogName?: string;
  contextLevels?: Record<string, WinstonLogLevel | 'none'>;
  defaultContextLevel?: WinstonLogLevel | 'none';
}

export interface LoggerModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => LoggerModuleOptions | Promise<LoggerModuleOptions>;
  inject?: any[];
}
```

### src/logger/logger.service.ts（关键片段）

- 实现 `NestLoggerService` 接口
- `static globalOptions` + `static contextService` 两个静态引用
- 多构造函数签名：`new LoggerService()` / `new LoggerService(context)` / `new LoggerService(options)` / `new LoggerService(context, options)`
- `getContextLevel(context?)` 优先从 `contextLevels` 取，兜底 `defaultContextLevel ?? level`
- `getTraceInfo()` 从 AsyncLocalStorage 提取 requestId / traceId（B3 > W3C > x-request-id），上下文外静默返回空对象
- `initWinston()` 创建双路 DailyRotateFile transport

### src/utils/common.util.ts（关键功能）

- `idGenerate()` → nanoid
- `getIPAdress()` 多网段优先级：192.168 > 172.16-31 > 10.x > 第一个非回环地址
- `getRandomString(length)` / `getRandomCode(length)` → customAlphabet nanoid

### src/utils/crypto.util.ts（关键类）

- `AesUtils`：AES-256-CBC，`scrypt` 派生密钥（固定 salt `'salt'`），随机 IV 自动内嵌（`ivHex:ciphertext`）
- `RsaUtils`：RSA-OAEP-SHA256，`encryptLong` 分块（默认 190 字节/块）
- `Md5Utils`：MD5 hash / hashWithSalt / hmac / fileChecksum / verify
- `Argon2Utils`：Argon2id，memoryCost 64MB / timeCost 3 / parallelism 4（可配置）
