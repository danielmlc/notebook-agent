---
title: "@cs/nest-common · 源码整理 v4.0.1"
type: source
aliases: ["@cs/nest-common 源码", "nest-common 源码"]
tags: [nestjs, mwp, code-docs, context, logger, http, dto, crypto]
status: stable
version: "4.0.1"
supersedes: "[[2026-04-27-cs-nest-common-v4.0.1-beta.2]]"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-common.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-common · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：4.0.1
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-common代码库源码整理

#### 代码目录
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

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-common",
  "version": "4.0.1",
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


> 代码路径  `src\index.ts`

```typescript
export * from './utils';
export * from './constants';
export * from './dto';
export * from './logger';
export * from './interface/index';
export * from './context';

```


> 代码路径  `src\constants\index.ts`

```typescript
export enum EHttpStatus {
  Error = 'error',
  Success = 'success',
}

// 一些扩展的HTTP状态码
export enum EHttpExtendStatus {
  // RPC服务调用错误
  INTERNAL_RPC_SERVER_ERROR = 508,
  INTERNAL_RPC_SERVER_TIMEOUT = 509,
}

```


> 代码路径  `src\context\context.constants.ts`

```typescript
export const CONTEXT_MODULE_OPTIONS = Symbol('CONTEXT_MODULE_OPTIONS');

```


> 代码路径  `src\context\context.interfaces.ts`

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
  // 组织信息
  orgId?: string;
  orgName?: string;
  orgType?: string;
  // 租户信息
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  // 应用信息
  applicationId?: string;
  moduleId?: string;

  // 链路追踪头（Istio/Envoy 标准头透传）
  traceHeaders?: Record<string, string>;

  [key: string]: any;
}

export interface ContextModuleOptions {
  enableCaching?: boolean;
  cacheTTL?: number;
}

export const CONTEXT_HEADER = 'X-User-Context';

```


> 代码路径  `src\context\context.module.ts`

```typescript
// context/context.module.ts
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


> 代码路径  `src\context\context.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
// import { UserContext } from './context.interfaces';

@Injectable()
export class ContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<
    Map<string, any>
  >();
  private readonly logger = new Logger(ContextService.name);

  /**
   * 获取上下文中特定键的值
   */
  getContext<T>(key: string): T | undefined {
    const store = this.asyncLocalStorage.getStore();
    return store ? store.get(key) : undefined;
  }

  getAllContext(): Record<string, any> {
    const store = this.asyncLocalStorage.getStore();
    if (!store) {
      return {};
    }

    // 将 Map 转换为普通对象
    const contextObject = {};
    for (const [key, value] of store.entries()) {
      contextObject[key] = value;
    }

    return contextObject;
  }

  /**
   * 在上下文中执行回调函数
   */
  runWithContext<T>(context: Record<string, any>, callback: () => T): T {
    const store = new Map<string, any>();
    Object.entries(context).forEach(([key, value]) => {
      store.set(key, value);
    });
    return this.asyncLocalStorage.run(store, callback);
  }

  /**
   * 设置当前上下文的值
   */
  setContext(key: string, value: any): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.set(key, value);
    } else {
      this.logger.warn('No active context store found when setting context');
    }
  }

  // 删除指定上下文的值
  deleteContext(key: string): void {
    const store = this.asyncLocalStorage.getStore();
    if (store) {
      store.delete(key);
    } else {
      this.logger.warn('No active context store found when deleting context');
    }
  }

  /**
   * 编码上下文为传输格式
   */
  encodeContext(context: Record<string, any>): string {
    return Buffer.from(JSON.stringify(context)).toString('base64');
  }

  /**
   * 解码传输格式的上下文
   */
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


> 代码路径  `src\context\index.ts`

```typescript
export * from './context.interfaces';
export * from './context.module';
export * from './context.service';

```


> 代码路径  `src\dto\base.dto.ts`

```typescript
import { IsDate, IsString, IsBoolean, IsInt } from 'class-validator';
export abstract class BaseDto {
  @IsDate()
  createdAt?: Date;
  @IsString()
  creatorId?: string;
  @IsString()
  creatorName?: string;
  @IsDate()
  modifiedAt?: Date;
  @IsString()
  modifierId?: string;
  @IsString()
  modifierName?: string;
  @IsBoolean()
  isRemoved?: boolean;
  @IsInt()
  version?: number;
}

```


> 代码路径  `src\dto\hasEnable.dto.ts`

```typescript
import { BaseDto } from './base.dto';
import { TreeDto } from './tree.dto';
import { IsBoolean, IsInt } from 'class-validator';
export abstract class HasEnableDto extends BaseDto {
  @IsInt()
  sortCode?: number;
  @IsBoolean()
  isEnable?: boolean;
}

export abstract class HasEnableTreeDto extends TreeDto {
  @IsInt()
  sortCode?: number;
  @IsBoolean()
  isEnable?: boolean;
}

```


> 代码路径  `src\dto\hasPrimary.dto.ts`

```typescript
import { BaseDto } from './base.dto';
import { TreeDto } from './tree.dto';
import { HasEnableDto, HasEnableTreeDto } from './hasEnable.dto';
import { IsString } from 'class-validator';
export abstract class HasPrimaryDto extends BaseDto {
  @IsString()
  id?: string;
}

export abstract class HasPrimaryTreeDto extends TreeDto {
  @IsString()
  id?: string;
}

export abstract class HasPrimaryFullDto extends HasEnableDto {
  @IsString()
  id?: string;
}

export abstract class HasPrimaryFullTreeDto extends HasEnableTreeDto {
  @IsString()
  id?: string;
}

```


> 代码路径  `src\dto\index.ts`

```typescript
export * from './base.dto';
export * from './hasEnable.dto';
export * from './hasPrimary.dto';
export * from './result.dto';
export * from './pageResult.dto';
export * from './queryConditionInput.dto';

```


> 代码路径  `src\dto\pageResult.dto.ts`

```typescript
export interface PageResult<T> {
  result: T;
  count: number;
}

```


> 代码路径  `src\dto\queryConditionInput.dto.ts`

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


> 代码路径  `src\dto\result.dto.ts`

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


> 代码路径  `src\dto\tree.dto.ts`

```typescript
import { BaseDto } from './base.dto';
import { IsString, IsInt, IsBoolean } from 'class-validator';
export abstract class TreeDto extends BaseDto {
  @IsString()
  parentId?: string;
  @IsString()
  fullId?: string;
  @IsString()
  fullName?: string;
  @IsInt()
  level?: number;
  @IsBoolean()
  isLeaf?: boolean;
}

```


> 代码路径  `src\interface\express-extend.ts`

```typescript
// express属性扩展

// 请求上下文接口定义

export interface User {
  // 根据您的实际用户数据结构定义属性
  userId?: string;
  [key: string]: any;
}

```


> 代码路径  `src\interface\index.ts`

```typescript
export * from './express-extend';

```


> 代码路径  `src\logger\index.ts`

```typescript
export * from './logger.module';
export * from './logger.service';
export * from './logger.interface';

```


> 代码路径  `src\logger\logger.constants.ts`

```typescript
export const LOGGER_MODULE_OPTIONS = Symbol('LOGGER_MODULE_OPTIONS');
export const PROJECT_LOG_DIR_NAME = 'logs';
export const DEFAULT_WEB_LOG_NAME = 'web.log';
export const DEFAULT_ERROR_LOG_NAME = 'common-error.log';
export const DEFAULT_ACCESS_LOG_NAME = 'access.log';
export const DEFAULT_SQL_SLOW_LOG_NAME = 'sql-slow.log';
export const DEFAULT_SQL_ERROR_LOG_NAME = 'sql-error.log';
export const DEFAULT_TASK_LOG_NAME = 'task.log';
// 默认日志存储天数
export const DEFAULT_MAX_SIZE = '2m';

export const DEFAULT_LOG_CONFIG = {
  level: 'info',
  timestamp: true,
  disableConsoleAtProd: false,
  maxFileSize: '2m',
  maxFiles: '30',
  appLogName: 'web.log',
  errorLogName: 'error.log',
  dir: './logs',
  contextLevels: {} as Record<string, string>,
};

```


> 代码路径  `src\logger\logger.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';
// import { LoggerOptions } from 'typeorm';

/**
 * 日志等级
 */
export type WinstonLogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

// export interface TypeORMLoggerOptions {
//   options?: LoggerOptions;
// }

/**
 * 日志配置，默认按天数进行切割
 */
export interface LoggerModuleOptions {
  /**
   * 日志文件输出
   * 默认只会输出 log 及以上（warn 和 error）的日志到文件中，等级级别如下
   */
  level?: WinstonLogLevel | 'none';

  /**
   * 如果启用，将打印当前和上一个日志消息之间的时间戳（时差）
   */
  timestamp?: boolean;

  /**
   * 生产环境下，默认会关闭终端日志输出，如有需要，可以设置为 false
   */
  disableConsoleAtProd?: boolean;

  /**
   * Maximum size of the file after which it will rotate. This can be a number of bytes, or units of kb, mb, and gb.
   *  If using the units, add 'k', 'm', or 'g' as the suffix. The units need to directly follow the number.
   *  default: 2m
   */
  maxFileSize?: string;

  /**
   * Maximum number of logs to keep. If not set,
   * no logs will be removed. This can be a number of files or number of days. If using days, add 'd' as the suffix.
   * default: 15d
   */
  maxFiles?: string;

  /**
   * 开发环境下日志产出的目录，绝对路径
   * 开发环境下为了避免冲突以及集中管理，日志会打印在项目目录下的 logs 目录
   */
  dir?: string;

  /**
   * 任何 logger 的 .error() 调用输出的日志都会重定向到这里，重点通过查看此日志定位异常，默认文件名为 common-error.%DATE%.log
   * 注意：此文件名可以包含%DATE%占位符
   */
  errorLogName?: string;

  /**
   * 应用相关日志，供应用开发者使用的日志。我们在绝大数情况下都在使用它，默认文件名为 web.%DATE%.log
   * 注意：此文件名可以包含%DATE%占位符
   */
  appLogName?: string;

  /**
   * 基于 context 的日志级别配置
   * 可以为特定的 context 设置不同的日志级别，未配置的 context 使用 defaultContextLevel 或全局 level
   *
   * @example
   * ```typescript
   * {
   *   level: 'info',
   *   contextLevels: {
   *     'ToolA': 'error',      // ToolA 只输出 error
   *     'ToolB': 'warn',       // ToolB 输出 warn 及以上
   *     'MyService': 'verbose' // MyService 输出 verbose 及以上
   *   }
   * }
   * ```
   */
  contextLevels?: Record<string, WinstonLogLevel | 'none'>;

  /**
   * 未在 contextLevels 中配置的 context 的默认日志级别
   *
   * - 不设置时，未配置的 context 回退到全局 `level`（默认行为）
   * - 设置为 `'none'` 可实现白名单模式：只有 contextLevels 中明确列出的 context 才输出日志，其余全部静默
   * - 设置为具体级别可为所有未配置 context 统一指定输出级别
   *
   * @example 白名单模式 — 只看 OrderService 的日志
   * ```typescript
   * {
   *   level: 'info',
   *   defaultContextLevel: 'none',
   *   contextLevels: { 'OrderService': 'debug' }
   * }
   * ```
   */
  defaultContextLevel?: WinstonLogLevel | 'none';
}

export interface LoggerModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => LoggerModuleOptions | Promise<LoggerModuleOptions>;
  inject?: any[];
}

```


> 代码路径  `src\logger\logger.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { LOGGER_MODULE_OPTIONS } from './logger.constants';
import {
  LoggerModuleAsyncOptions,
  LoggerModuleOptions,
} from './logger.interface';
import { LoggerService } from './logger.service';

@Module({})
export class LoggerModule {
  static forRoot(
    options: LoggerModuleOptions,
    isGlobal = false,
  ): DynamicModule {
    // 设置静态全局配置，使所有 new 创建的实例也能获取配置
    LoggerService.setGlobalConfig(options);

    return {
      global: isGlobal,
      module: LoggerModule,
      providers: [
        LoggerService,
        {
          provide: LOGGER_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [LoggerService, LOGGER_MODULE_OPTIONS],
    };
  }

  static forRootAsync(
    options: LoggerModuleAsyncOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: LoggerModule,
      imports: options.imports,
      providers: [
        LoggerService,
        {
          provide: LOGGER_MODULE_OPTIONS,
          useFactory: async (...args: any[]) => {
            const resolvedOptions = await options.useFactory!(...args);
            // 异步模式下也设置静态全局配置
            LoggerService.setGlobalConfig(resolvedOptions);
            return resolvedOptions;
          },
          inject: options.inject || [],
        },
      ],
      exports: [LoggerService, LOGGER_MODULE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\logger\logger.service.ts`

```typescript
import {
  Injectable,
  Optional,
  Inject,
  LoggerService as NestLoggerService,
} from '@nestjs/common';
import { clc, yellow } from '@nestjs/common/utils/cli-colors.util';
import { LOGGER_MODULE_OPTIONS, DEFAULT_LOG_CONFIG } from './logger.constants';
import { LoggerModuleOptions, WinstonLogLevel } from './logger.interface';
import {
  createLogger,
  Logger as WinstonLogger,
  format as winstonFormat,
} from 'winston';
import WinstonDailyRotateFile from 'winston-daily-rotate-file';
import { isPlainObject, defaultsDeep } from 'lodash';
import { format } from 'util'; // 引入 format 函数
import { ContextService } from '../context/context.service';

/**
 * 日志输出等级，基于Nest配置扩展，与winston配合，由于log等级与winston定义冲突，需要转为info
 * https://github.com/nestjs/nest/blob/master/packages/common/services/utils/is-log-level-enabled.util.ts
 */
const LOG_LEVEL_VALUES: Record<WinstonLogLevel, number> = {
  debug: 4,
  verbose: 3,
  info: 2,
  warn: 1,
  error: 0,
};

@Injectable()
export class LoggerService implements NestLoggerService {
  private static lastTimestampAt?: number;
  /**
   * 全局静态配置，所有 LoggerService 实例共享
   * 用于支持直接 new LoggerService(context) 的使用方式
   */
  private static globalOptions?: LoggerModuleOptions;

  /**
   * 全局静态持有 ContextService 引用
   * 用于从 AsyncLocalStorage 中获取追踪信息注入日志
   */
  private static contextService?: ContextService;

  /**
   * 设置 ContextService 静态引用
   * 在应用启动时由 LoggerConfigStrategy 调用
   */
  static setContextService(contextService: ContextService): void {
    LoggerService.contextService = contextService;
  }

  /**
   * 日志文件存放文件夹路径
   */
  private logDir: string;

  /**
   * winston实例
   */
  private winstonLogger: WinstonLogger;

  /**
   * 内部存储的 context，始终是 string 或 undefined
   */
  private _context?: string;

  /**
   * 设置全局静态配置
   * 在 LoggerModule 初始化时调用，使所有实例共享配置
   */
  static setGlobalConfig(options: LoggerModuleOptions): void {
    LoggerService.globalOptions = options;
  }

  constructor();
  constructor(context: string);
  constructor(options: LoggerModuleOptions);
  constructor(context: string, options: LoggerModuleOptions);
  constructor(
    @Optional() context?: string | LoggerModuleOptions,
    @Optional()
    @Inject(LOGGER_MODULE_OPTIONS)
    protected options: LoggerModuleOptions = {},
  ) {
    // 处理 new LoggerService(context) 的情况
    if (typeof context === 'string') {
      this._context = context;
    } else if (typeof context === 'object' && context !== null) {
      // 第一个参数是 options
      this.options = context;
    }
    // 优先使用传入的 options，否则使用静态全局配置
    if (Object.keys(this.options).length === 0 && LoggerService.globalOptions) {
      this.options = LoggerService.globalOptions;
    }
    this.options = defaultsDeep(this.options, DEFAULT_LOG_CONFIG);
    this.initWinston();
  }

  /**
   * 获取 context（兼容原有代码）
   */
  get context(): string | undefined {
    return this._context;
  }

  /**
   * 设置 context（兼容原有代码）
   */
  set context(value: string | undefined) {
    this._context = value;
  }

  /**
   * 初始化winston
   */
  private initWinston() {
    // 配置日志输出目录
    if (this.options.dir) {
      this.logDir = this.options.dir;
    }
    const transportOptions: WinstonDailyRotateFile.DailyRotateFileTransportOptions =
      {
        dirname: this.logDir,
        maxSize: this.options.maxFileSize,
        maxFiles: this.options.maxFiles,
      };
    // 多路日志
    const webTransport = new WinstonDailyRotateFile(
      Object.assign(transportOptions, { filename: this.options.appLogName }),
    );
    // 所有error级别都记录在该文件下
    const errorTransport = new WinstonDailyRotateFile(
      Object.assign(transportOptions, {
        filename: this.options.errorLogName,
        level: 'error',
      }),
    );
    // 初始化winston
    this.winstonLogger = createLogger({
      level: this.options.level,
      format: winstonFormat.json({
        space: 0,
      }),
      levels: LOG_LEVEL_VALUES,
      transports: [webTransport, errorTransport],
    });
  }

  /**
   * 获取当前请求的追踪信息（从 AsyncLocalStorage 上下文中提取）
   * 在请求上下文外调用时返回空对象，不影响日志正常输出
   */
  private getTraceInfo(): Record<string, string> {
    const result: Record<string, string> = {};
    if (!LoggerService.contextService) return result;

    try {
      const requestId =
        LoggerService.contextService.getContext<string>('requestId');
      if (requestId) result.requestId = requestId;

      const traceHeaders =
        LoggerService.contextService.getContext<Record<string, string>>(
          'traceHeaders',
        );
      if (traceHeaders) {
        // 从 W3C traceparent 提取 trace-id（格式：00-{traceId}-{spanId}-{flags}）
        const traceIdFromOtel = traceHeaders['traceparent']?.split('-')[1];
        // 优先使用 B3 traceid，其次 W3C traceparent 的 trace-id 段，最后降级为 x-request-id
        const traceId =
          traceHeaders['x-b3-traceid'] ||
          traceIdFromOtel ||
          traceHeaders['x-request-id'];
        if (traceId) result.traceId = traceId;
      }
    } catch {
      // 在请求上下文外调用时（如启动阶段），静默忽略
    }
    return result;
  }

  /**
   * 获取日志存放路径
   */
  protected getLogDir(): string {
    return this.logDir;
  }

  /**
   * 获取winston实例
   */
  protected getWinstonLogger(): WinstonLogger {
    return this.winstonLogger;
  }

  /**
   * Write a 'info' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  log(message: any, context?: string): void;
  log(message: any, ...optionalParams: [...any, string?]): void;
  log(message: any, ...optionalParams: any[]) {
    // 先解析 context，用于级别判断
    const { messages, context: resolvedContext } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    const consoleEnable = this.isConsoleLevelEnabled('info', resolvedContext);
    const winstonEnable = this.isWinstonLevelEnabled('info', resolvedContext);
    if (!consoleEnable && !winstonEnable) {
      return;
    }
    const formattedMessage = this.formatMessages(messages);
    if (consoleEnable) {
      this.printMessages([formattedMessage], resolvedContext, 'info');
    }
    this.recordMessages([formattedMessage], resolvedContext, 'info');
  }

  /**
   * Write an 'error' level log, if the configured level allows for it.
   * Prints to `stderr` with newline.
   */
  error(message: any, context?: string): void;
  error(message: any, stack?: string, context?: string): void;
  error(message: any, ...optionalParams: [...any, string?, string?]): void;
  error(message: any, ...optionalParams: any[]) {
    // 先解析 context，用于级别判断
    const { messages, context: resolvedContext, stack } =
      this.getContextAndStackAndMessagesToPrint([message, ...optionalParams]);
    const consoleEnable = this.isConsoleLevelEnabled('error', resolvedContext);
    const winstonEnable = this.isWinstonLevelEnabled('error', resolvedContext);
    if (!consoleEnable && !winstonEnable) {
      return;
    }

    const formattedMessage = this.formatMessages(messages);
    if (consoleEnable) {
      this.printMessages([formattedMessage], resolvedContext, 'error', 'stderr');
      this.printStackTrace(stack);
    }
    this.recordMessages([formattedMessage], resolvedContext, 'error', stack);
  }

  /**
   * Write a 'warn' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  warn(message: any, context?: string): void;
  warn(message: any, ...optionalParams: [...any, string?]): void;
  warn(message: any, ...optionalParams: any[]) {
    // 先解析 context，用于级别判断
    const { messages, context: resolvedContext } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    const consoleEnable = this.isConsoleLevelEnabled('warn', resolvedContext);
    const winstonEnable = this.isWinstonLevelEnabled('warn', resolvedContext);
    if (!consoleEnable && !winstonEnable) {
      return;
    }
    const formattedMessage = this.formatMessages(messages);
    if (consoleEnable) {
      this.printMessages([formattedMessage], resolvedContext, 'warn');
    }
    this.recordMessages([formattedMessage], resolvedContext, 'warn');
  }

  /**
   * Write a 'debug' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  debug(message: any, context?: string): void;
  debug(message: any, ...optionalParams: [...any, string?]): void;
  debug(message: any, ...optionalParams: any[]) {
    // 先解析 context，用于级别判断
    const { messages, context: resolvedContext } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    const consoleEnable = this.isConsoleLevelEnabled('debug', resolvedContext);
    const winstonEnable = this.isWinstonLevelEnabled('debug', resolvedContext);
    if (!consoleEnable && !winstonEnable) {
      return;
    }
    const formattedMessage = this.formatMessages(messages);
    if (consoleEnable) {
      this.printMessages([formattedMessage], resolvedContext, 'debug');
    }
    this.recordMessages([formattedMessage], resolvedContext, 'debug');
  }

  /**
   * Write a 'verbose' level log, if the configured level allows for it.
   * Prints to `stdout` with newline.
   */
  verbose(message: any, context?: string): void;
  verbose(message: any, ...optionalParams: [...any, string?]): void;
  verbose(message: any, ...optionalParams: any[]) {
    // 先解析 context，用于级别判断
    const { messages, context: resolvedContext } = this.getContextAndMessagesToPrint([
      message,
      ...optionalParams,
    ]);
    const consoleEnable = this.isConsoleLevelEnabled('verbose', resolvedContext);
    const winstonEnable = this.isWinstonLevelEnabled('verbose', resolvedContext);
    if (!consoleEnable && !winstonEnable) {
      return;
    }
    const formattedMessage = this.formatMessages(messages);
    if (consoleEnable) {
      this.printMessages([formattedMessage], resolvedContext, 'verbose');
    }
    this.recordMessages([formattedMessage], resolvedContext, 'verbose');
  }

  protected isConsoleLevelEnabled(
    level: WinstonLogLevel,
    context?: string,
  ): boolean {
    const effectiveLevel = this.getContextLevel(context);
    // 默认禁止生产模式控制台日志输出
    if (
      this.options.disableConsoleAtProd &&
      process.env.NODE_ENV === 'production'
    ) {
      return false;
    }
    if (effectiveLevel === 'none') {
      return false;
    }
    return LOG_LEVEL_VALUES[level] <= LOG_LEVEL_VALUES[effectiveLevel];
  }

  protected isWinstonLevelEnabled(
    level: WinstonLogLevel,
    context?: string,
  ): boolean {
    const effectiveLevel = this.getContextLevel(context);
    if (effectiveLevel === 'none') {
      return false;
    }
    return LOG_LEVEL_VALUES[level] <= LOG_LEVEL_VALUES[effectiveLevel];
  }

  /**
   * 获取指定 context 的有效日志级别
   * 如果配置了 contextLevels，返回对应 context 的级别
   * 否则返回全局级别
   * @param context context 名称，不传则使用实例的 this.context
   */
  protected getContextLevel(context?: string): WinstonLogLevel | 'none' {
    const targetContext = context || this.context;
    if (this.options.contextLevels && targetContext) {
      const contextLevel = this.options.contextLevels[targetContext];
      if (contextLevel) {
        return contextLevel;
      }
    }
    return this.options.defaultContextLevel ?? this.options.level ?? 'info';
  }

  /**
   * 动态设置某个 context 的日志级别
   * @param context context 名称
   * @param level 日志级别
   */
  setContextLevel(context: string, level: WinstonLogLevel | 'none'): void {
    if (!this.options.contextLevels) {
      this.options.contextLevels = {};
    }
    this.options.contextLevels[context] = level;
  }

  /**
   * 动态设置全局日志级别
   * @param level 日志级别
   */
  setGlobalLevel(level: WinstonLogLevel | 'none'): void {
    this.options.level = level;
  }

  private formatMessages(messages: unknown[]): string {
    const [message, ...formatArgs] = messages;
    return format(message, ...formatArgs);
  }

  // code from -> https://github.com/nestjs/nest/blob/master/packages/common/services/console-logger.service.ts
  protected getTimestamp(): string {
    const localeStringOptions = {
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      day: '2-digit',
      month: '2-digit',
    };
    return new Date(Date.now()).toLocaleString(
      undefined,
      localeStringOptions as Intl.DateTimeFormatOptions,
    );
  }

  protected recordMessages(
    messages: unknown[],
    context = '',
    logLevel: WinstonLogLevel = 'info',
    stack?: string,
  ) {
    messages.forEach((message) => {
      const output = isPlainObject(message)
        ? JSON.stringify(
            message,
            (_, value) =>
              typeof value === 'bigint' ? value.toString() : value,
            0,
          )
        : (message as string);

      const traceInfo = this.getTraceInfo();
      this.winstonLogger.log(logLevel, output, {
        context,
        stack,
        pid: process.pid,
        timestamp: this.getTimestamp(),
        ...traceInfo,
      });
    });
  }

  protected printMessages(
    messages: unknown[],
    context = '',
    logLevel: WinstonLogLevel = 'info',
    writeStreamType?: 'stdout' | 'stderr',
  ) {
    const color = this.getColorByLogLevel(logLevel);
    messages.forEach((message) => {
      const output = isPlainObject(message)
        ? `${color('Object:')}\n${JSON.stringify(
            message,
            (_, value) =>
              typeof value === 'bigint' ? value.toString() : value,
            2,
          )}\n`
        : color(message as string);

      const pidMessage = color(`[CS-SERVER] ${process.pid}  - `);
      const traceInfo = this.getTraceInfo();
      // 优先显示 traceId（跨服务一致），本地无 Istio 时降级为 requestId
      const traceLabel = traceInfo.traceId || traceInfo.requestId;
      const traceTag = traceLabel
        ? clc.cyanBright(`[${traceLabel}] `)
        : '';
      const contextMessage = context ? yellow(`[${context}] `) : '';
      const timestampDiff = this.updateAndGetTimestampDiff();
      const formattedLogLevel = color(logLevel.toUpperCase().padStart(7, ' '));
      const computedMessage = `${pidMessage}${this.getTimestamp()} ${formattedLogLevel} ${traceTag}${contextMessage}${output}${timestampDiff}\n`;

      process[writeStreamType ?? 'stdout'].write(computedMessage);
    });
  }

  protected printStackTrace(stack: string) {
    if (!stack) {
      return;
    }
    process.stderr.write(`${stack}\n`);
  }

  private updateAndGetTimestampDiff(): string {
    const includeTimestamp =
      LoggerService.lastTimestampAt && this.options?.timestamp;
    const result = includeTimestamp
      ? yellow(` +${Date.now() - LoggerService.lastTimestampAt}ms`)
      : '';
    LoggerService.lastTimestampAt = Date.now();
    return result;
  }

  private getContextAndMessagesToPrint(args: unknown[]) {
    if (args?.length <= 1) {
      return { messages: args, context: this.context };
    }
    // 传递多个字符串  最后一个作为为context
    const lastElement = args[args.length - 1];
    const isContext = typeof lastElement === 'string';
    if (!isContext) {
      return { messages: args, context: this.context };
    }
    return {
      context: lastElement as string,
      messages: args.slice(0, args.length - 1),
    };
  }

  private getContextAndStackAndMessagesToPrint(args: unknown[]) {
    const { messages, context } = this.getContextAndMessagesToPrint(args);
    if (messages?.length <= 1) {
      return { messages, context };
    }
    const lastElement = messages[messages.length - 1];
    const isStack = typeof lastElement === 'string';
    if (!isStack) {
      return { messages, context };
    }
    return {
      stack: lastElement as string,
      messages: messages.slice(0, messages.length - 1),
      context,
    };
  }

  private getColorByLogLevel(level: WinstonLogLevel): (text: string) => string {
    switch (level) {
      case 'debug':
        return clc.magentaBright;
      case 'warn':
        return clc.yellow;
      case 'error':
        return clc.red;
      case 'verbose':
        return clc.cyanBright;
      default:
        return clc.green;
    }
  }
}

```


> 代码路径  `src\utils\common.util.ts`

```typescript
/* eslint-disable @typescript-eslint/no-empty-function */
import { customAlphabet, nanoid } from 'nanoid';
import * as os from 'os';
export const CommonUtil = {
  // 生产环境警用console
  disableConsole: function (): any {
    const originalConsole = { ...console };
    console.log = () => { };
    console.error = () => { };
    console.warn = () => { };
    console.info = () => { };
    console.debug = () => { };
    return originalConsole;
  },

  nanoidKey: function (size = 10): string {
    return nanoid(size);
  },

  idGenerate: function (): string {
    return nanoid();
  },

  idArrGenerate (arrLength: number): string[] {
    const idArr = [];
    for (let index = 0; index < arrLength; index++) {
      idArr.push(nanoid());
    }
    return idArr;
  },

  getRandomString (length: number): string {
    const placeholder =
      '1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
    const customNanoid = customAlphabet(placeholder, length);
    return customNanoid();
  },

  getRandomCode (length: number): string {
    const placeholder = '1234567890';
    const customNanoid = customAlphabet(placeholder, length);
    return customNanoid();
  },

  getVerSion (): number {
    return Date.now();
  },

  getIPAdress () {
    const interfaces = os.networkInterfaces();

    const wiredPatterns = [
      /^eth\d+/,
      /^enp\d+s\d+/,
      /^ens\d+/,
      /^en\d+/,
      /^Ethernet/i,
    ];

    const wirelessPatterns = [
      /^wlan\d+/,
      /^wlp\d+s\d+/,
      /^wl\d+/,
      /^Wi-Fi/i,
      /^WLAN/i,
    ];

    const virtualPatterns = [
      /^tun\d+/,
      /^tap\d+/,
      /^ppp\d+/,
      /^veth/,
      /^docker/,
      /^vmnet/,
      /^vbox/,
      /^virtual/i,
      /^Loopback/i,
      /^lo$/,
      /^tel\d+/,
      /^tailscale/i,
      /^zerotier/i,
      /^wg\d+/,
    ];

    const byType: { wired: string[]; wireless: string[]; other: string[] } = {
      wired: [],
      wireless: [],
      other: [],
    };

    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (!iface) continue;

      if (virtualPatterns.some((p) => p.test(devName))) continue;

      for (const alias of iface) {
        if (
          alias.family === 'IPv4' &&
          alias.address !== '127.0.0.1' &&
          !alias.internal
        ) {
          if (wiredPatterns.some((p) => p.test(devName))) {
            byType.wired.push(alias.address);
          } else if (wirelessPatterns.some((p) => p.test(devName))) {
            byType.wireless.push(alias.address);
          } else {
            byType.other.push(alias.address);
          }
        }
      }
    }

    const priorityList = [...byType.wired, ...byType.wireless, ...byType.other];

    const excludeRanges = [/^10\.8\.\d+\.\d+$/, /^192\.168\.0\.\d+$/];
    const validIpList = priorityList.filter(
      (ip) => !excludeRanges.some((range) => range.test(ip)),
    );

    const preferredRanges = [
      /^192\.168\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^10\./,
    ];

    for (const range of preferredRanges) {
      for (const ip of validIpList) {
        if (range.test(ip)) return ip;
      }
    }

    if (validIpList.length > 0) return validIpList[0];

    return 'localhost';
  },

  getMac () {
    const networkInterfaces = os.networkInterfaces();
    for (const devname in networkInterfaces) {
      const iface = networkInterfaces[devname];
      if (iface) {
        for (let index = 0; index < iface.length; index++) {
          const alias = iface[index];
          if (
            alias.family === 'IPv4' &&
            alias.address !== '127.0.0.1' &&
            !alias.internal
          ) {
            return alias.mac;
          }
        }
      }
    }
  },
};

```


> 代码路径  `src\utils\crypto.util.ts`

```typescript
import {
  createCipheriv,
  createDecipheriv,
  publicEncrypt,
  privateDecrypt,
  randomBytes,
  scrypt,
  constants,
  createHash,
} from 'crypto';
import argon2 from 'argon2';
import { promisify } from 'util';

/**
 * AES加密工具类 对称加密类
 */
export class AesUtils {
  /**
   * AES-256-CBC加密
   * @param text 待加密文本
   * @param key 密钥(32字节)
   * @param iv 初始化向量(16字节)
   * @returns 加密后的Base64字符串
   */
  static async encrypt(
    text: string,
    key: string,
    iv?: string,
  ): Promise<string> {
    // 从密钥派生32字节密钥
    const keyBuffer = await this.deriveKey(key);

    // 使用提供的IV或生成随机IV
    const ivBuffer = iv ? Buffer.from(iv, 'hex') : randomBytes(16);

    // 创建加密器
    const cipher = createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);

    // 加密数据
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // 如果使用随机IV，将IV添加到加密结果前面
    if (!iv) {
      const ivHex = ivBuffer.toString('hex');
      return `${ivHex}:${encrypted}`;
    }

    return encrypted;
  }

  /**
   * AES-256-CBC解密
   * @param encryptedText 加密的Base64字符串
   * @param key 密钥
   * @param iv 初始化向量(如果未包含在加密文本中)
   * @returns 解密后的原始文本
   */
  static async decrypt(
    encryptedText: string,
    key: string,
    iv?: string,
  ): Promise<string> {
    let ivBuffer: Buffer;
    let textToDecrypt = encryptedText;

    // 检查是否包含IV
    if (encryptedText.includes(':') && !iv) {
      const parts = encryptedText.split(':');
      const ivHex = parts[0];
      textToDecrypt = parts[1];
      ivBuffer = Buffer.from(ivHex, 'hex');
    } else if (iv) {
      ivBuffer = Buffer.from(iv, 'hex');
    } else {
      throw new Error('未提供IV且加密文本中不包含IV');
    }

    // 从密钥派生32字节密钥
    const keyBuffer = await this.deriveKey(key);

    // 创建解密器
    const decipher = createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);

    // 解密数据
    let decrypted = decipher.update(textToDecrypt, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * 生成AES密钥和IV
   * @returns 生成的密钥和IV(十六进制格式)
   */
  static generateKey(): { key: string; iv: string } {
    const key = randomBytes(32).toString('hex'); // 256位密钥
    const iv = randomBytes(16).toString('hex'); // 128位IV
    return { key, iv };
  }

  /**
   * 从密码派生密钥
   * @private
   * @param password 密码
   * @returns 派生的32字节密钥
   */
  private static async deriveKey(password: string): Promise<Buffer> {
    const scryptAsync = promisify(scrypt);
    return scryptAsync(password, 'salt', 32) as Promise<Buffer>;
  }
}

/**
 * RSA加密工具类 非对称类加密
 */
export class RsaUtils {
  /**
   * RSA公钥加密
   * @param text 待加密文本
   * @param publicKey PEM格式公钥
   * @returns 加密后的Base64字符串
   */
  static encrypt(text: string, publicKey: string): string {
    const buffer = Buffer.from(text);
    const encrypted = publicEncrypt(
      {
        key: publicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );

    return encrypted.toString('base64');
  }

  /**
   * RSA私钥解密
   * @param encryptedText 加密的Base64字符串
   * @param privateKey PEM格式私钥
   * @returns 解密后的原始文本
   */
  static decrypt(encryptedText: string, privateKey: string): string {
    const buffer = Buffer.from(encryptedText, 'base64');
    const decrypted = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      buffer,
    );

    return decrypted.toString('utf8');
  }

  /**
   * 分块加密长文本(解决RSA加密大小限制)
   * @param text 待加密的长文本
   * @param publicKey PEM格式公钥
   * @param blockSize 分块大小，默认190字节
   * @returns 加密后的Base64字符串，块之间用冒号分隔
   */
  static encryptLong(text: string, publicKey: string, blockSize = 190): string {
    const textBuffer = Buffer.from(text, 'utf8');
    const blocks: string[] = [];

    for (let i = 0; i < textBuffer.length; i += blockSize) {
      const block = textBuffer.slice(i, i + blockSize);
      const encryptedBlock = this.encrypt(block.toString('utf8'), publicKey);
      blocks.push(encryptedBlock);
    }

    return blocks.join(':');
  }

  /**
   * 解密分块加密的长文本
   * @param encryptedBlocks 以冒号分隔的加密块
   * @param privateKey PEM格式私钥
   * @returns 解密后的原始文本
   */
  static decryptLong(encryptedBlocks: string, privateKey: string): string {
    const blocks = encryptedBlocks.split(':');
    let result = '';

    for (const block of blocks) {
      result += this.decrypt(block, privateKey);
    }

    return result;
  }
}

/**
 * MD5哈希工具类
 *
 * @remarks
 * MD5是一种单向哈希算法，非真正的加密算法。
 * 在安全性要求高的场景（如密码存储）中不应使用MD5，
 * 应考虑使用bcrypt、Argon2、PBKDF2等更安全的算法。
 */
export class Md5Utils {
  /**
   * 生成字符串的MD5哈希值
   *
   * @param text - 输入文本
   * @returns MD5哈希值（十六进制字符串）
   */
  static hash(text: string): string {
    return createHash('md5').update(text).digest('hex');
  }

  /**
   * 生成带盐值的MD5哈希（简单提升安全性）
   *
   * @param text - 输入文本
   * @param salt - 盐值
   * @param iterations - 迭代次数，默认为1
   * @returns 带盐值的MD5哈希（十六进制字符串）
   */
  static hashWithSalt(text: string, salt: string, iterations = 1): string {
    let hash = text + salt;

    for (let i = 0; i < iterations; i++) {
      hash = createHash('md5').update(hash).digest('hex');
    }

    return hash;
  }

  /**
   * MD5-HMAC处理（消息认证码）
   *
   * @param text - 输入文本
   * @param key - 密钥
   * @returns HMAC结果（十六进制字符串）
   */
  static hmac(text: string, key: string): string {
    // 创建内外填充
    const blockSize = 64; // MD5的块大小为64字节

    // 如果密钥长度超过块大小，则使用其哈希值
    const k =
      key.length > blockSize
        ? createHash('md5').update(key).digest()
        : Buffer.from(key);

    // 创建内外填充
    const iPad = Buffer.alloc(blockSize, 0x36);
    const oPad = Buffer.alloc(blockSize, 0x5c);

    for (let i = 0; i < k.length; i++) {
      iPad[i] = iPad[i] ^ k[i];
      oPad[i] = oPad[i] ^ k[i];
    }

    // 计算HMAC: MD5(K XOR opad, MD5(K XOR ipad, text))
    const innerHash = createHash('md5').update(iPad).update(text).digest();

    return createHash('md5').update(oPad).update(innerHash).digest('hex');
  }

  /**
   * 文件MD5校验码计算
   *
   * @param buffer - 文件Buffer
   * @returns 文件的MD5校验码（十六进制字符串）
   */
  static fileChecksum(buffer: Buffer): string {
    return createHash('md5').update(buffer).digest('hex');
  }

  /**
   * 验证字符串是否匹配指定的MD5哈希值
   *
   * @param text - 待验证的文本
   * @param hash - MD5哈希值
   * @returns 是否匹配
   */
  static verify(text: string, hash: string): boolean {
    return this.hash(text) === hash.toLowerCase();
  }

  /**
   * 验证字符串是否匹配指定的带盐值MD5哈希
   *
   * @param text - 待验证的文本
   * @param hash - 带盐值的MD5哈希
   * @param salt - 盐值
   * @param iterations - 迭代次数，默认为1
   * @returns 是否匹配
   */
  static verifyWithSalt(
    text: string,
    hash: string,
    salt: string,
    iterations = 1,
  ): boolean {
    return this.hashWithSalt(text, salt, iterations) === hash.toLowerCase();
  }
}

/**
 * 密码哈希系统配置接口
 */
interface HashingOptions {
  /**
   * 内存成本 (单位: kibibytes)
   * 推荐: 服务器环境 65536+ (64MB)，Web环境 32768 (32MB)
   */
  memoryCost?: number;

  /**
   * 时间成本因子 (迭代次数)
   * 推荐: 3-4 (可根据硬件定期评估并调整)
   */
  timeCost?: number;

  /**
   * 并行度 (线程数)
   * 推荐: 核心数的一半，最小值为 1
   */
  parallelism?: number;

  /**
   * 输出哈希长度 (字节数)
   * 推荐: 32 (256位)
   */
  hashLength?: number;

  /**
   * Argon2 算法类型
   * - 0 (argon2d): 抗 GPU 攻击，适用于加密货币等应用
   * - 1 (argon2i): 抗侧信道攻击，适用于密码哈希
   * - 2 (argon2id): 混合模式，推荐用于密码哈希
   */
  type?: 0 | 1 | 2;
}

/**
 * 基于Argon2算法的密码哈希服务类
 * 提供密码哈希与验证的核心功能
 */
export class Argon2Utils {
  private readonly defaultOptions: HashingOptions;

  /**
   * 构造密码服务实例
   * @param options 自定义哈希配置参数
   */
  constructor(options: HashingOptions = {}) {
    // 基于系统安全等级设置默认参数
    this.defaultOptions = {
      memoryCost: options.memoryCost || 65536, // 64MB
      timeCost: options.timeCost || 3, // 3 次迭代
      parallelism: options.parallelism || 4, // 4 线程
      hashLength: options.hashLength || 32, // 256 位输出
      type: options.type !== undefined ? options.type : 2, // 默认使用 argon2id (2)
    };
  }

  /**
   * 哈希用户密码
   * @param password 明文密码
   * @param options 可选的哈希参数(覆盖默认值)
   * @returns 哈希结果(包含算法、盐值、参数等完整信息)
   */
  async hashPassword(
    password: string,
    options?: HashingOptions,
  ): Promise<string> {
    try {
      // 创建一个新对象，确保所有选项都符合 argon2 库要求
      const hashOptions = {
        memoryCost: options?.memoryCost || this.defaultOptions.memoryCost,
        timeCost: options?.timeCost || this.defaultOptions.timeCost,
        parallelism: options?.parallelism || this.defaultOptions.parallelism,
        hashLength: options?.hashLength || this.defaultOptions.hashLength,
        type: options?.type || this.defaultOptions.type,
      };

      return await argon2.hash(password, hashOptions);
    } catch (error) {
      // 系统化错误处理，保留错误上下文但不泄露敏感信息
      throw new Error(
        `Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 验证密码
   * @param hashedPassword 存储的哈希密码
   * @param plainPassword 用户输入的明文密码
   * @returns 密码是否匹配
   */
  async verifyPassword(
    hashedPassword: string,
    plainPassword: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
      // 系统化错误处理
      throw new Error(
        `Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 检查哈希是否需要重新哈希(参数升级)
   * 系统安全维护的关键组件，用于适应计算能力增长
   * @param hashedPassword 存储的哈希密码
   * @returns 是否需要重新哈希
   */
  async needsRehash(hashedPassword: string): Promise<boolean> {
    try {
      // 创建一个符合 argon2 库要求的选项对象
      const rehashOptions = {
        memoryCost: this.defaultOptions.memoryCost,
        timeCost: this.defaultOptions.timeCost,
        parallelism: this.defaultOptions.parallelism,
        hashLength: this.defaultOptions.hashLength,
        type: this.defaultOptions.type,
      };

      const needsRehash = await argon2.needsRehash(
        hashedPassword,
        rehashOptions,
      );
      return needsRehash;
    } catch (error) {
      // 出错时保守处理，建议重新哈希
      return true;
    }
  }
}

```


> 代码路径  `src\utils\index.ts`

```typescript
export * from './common.util';
export * from './crypto.util';

```


#### 代码说明

# @cs/nest-common

一个功能丰富的 NestJS 工具库，提供日志、加密工具、上下文管理等常用功能模块。

## 安装

```bash
npm install
# 或
yarn install
```

## 模块概览

| 模块 | 功能 | 主要特性 |
|------|------|----------|
| Utils | 通用工具类 | ID生成、加密解密、IP获取等 |
| Logger | 日志管理 | 基于Winston，支持文件轮转 |
| DTO | 数据传输对象 | 基础DTO类，支持验证 |
| Context | 上下文管理 | 基于AsyncLocalStorage |


## 上下文管理模块

上下文管理模块是一个用于在 NestJS 应用程序中跨请求传递和管理用户上下文信息的全局模块。它使用 Node.js 的 AsyncLocalStorage API，允许在整个请求生命周期内安全地存储和访问用户信息、请求数据和其他上下文信息，无需通过参数显式传递。


### 配置

在应用的根模块中导入并配置 `ContextModule`：

```typescript

import { Module } from '@nestjs/common';
import { ContextModule } from '@cs/nest-common';

@Module({
  imports: [
    ContextModule.forRoot({
      enableCaching: true,
      cacheTTL: -1
    })
  ],
})
export class AppModule {}

```

### 核心组件

#### ContextModule

提供模块的全局配置和注册服务。

```typescript
ContextModule.forRoot(
  options?: ContextModuleOptions,  // 可选配置项
  isGlobal = true                 // 是否为全局模块
)
```

#### ContextService

提供上下文数据的存取和管理功能。

##### 主要方法

- **runWithContext**: 在指定上下文中执行回调函数
  ```typescript
  runWithContext<T>(context: Record<string, any>, callback: () => T): T
  ```

- **getContext**: 获取上下文中特定键的值
  ```typescript
  getContext<T>(key: string): T | undefined
  ```

- **getAllContext**: 获取所有上下文数据
  ```typescript
  getAllContext(): Record<string, any>
  ```

- **setContext**: 设置当前上下文的值
  ```typescript
  setContext(key: string, value: any): void
  ```

- **deleteContext**: 删除指定上下文的值
  ```typescript
  deleteContext(key: string): void
  ```

- **encodeContext**: 编码上下文为传输格式(Base64)
  ```typescript
  encodeContext(context: Record<string, any>): string
  ```

- **decodeContext**: 解码传输格式的上下文
  ```typescript
  decodeContext(encodedContext: string): Record<string, any>
  ```

### 用户上下文接口

`UserContext` 接口定义了用户上下文中可能包含的标准字段：

- **基本请求信息**
  - `requestId`: 请求ID
  - `startTime`: 请求开始时间
  - `url`: 请求URL
  - `method`: 请求方法
  - `history`: 请求历史记录

- **用户信息**
  - `userId`: 用户ID
  - `userName`: 用户名
  - `realName`: 真实姓名
  - `eMail`: 电子邮件
  - `phone`: 电话

- **组织信息**
  - `orgId`: 组织ID
  - `orgName`: 组织名称
  - `orgType`: 组织类型

- **租户信息**
  - `tenantId`: 租户ID
  - `tenantCode`: 租户代码
  - `tenantName`: 租户名称

- **应用信息**
  - `applicationId`: 应用ID
  - `moduleId`: 模块ID

此外，该接口支持通过索引签名 `[key: string]: any` 添加任意自定义字段。

### 使用示例



#### 1. 在中间件中设置上下文



```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ContextService, CONTEXT_HEADER } from './context';

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly contextService: ContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const encodedContext = req.headers[CONTEXT_HEADER.toLowerCase()] as string;
    let context = {};
    
    if (encodedContext) {
      context = this.contextService.decodeContext(encodedContext);
    }
    
    // 添加基本请求信息
    const requestInfo = {
      requestId: req.headers['x-request-id'] || Date.now().toString(),
      startTime: Date.now(),
      url: req.originalUrl,
      method: req.method,
    };
    
    context = {
      ...context,
      ...requestInfo,
    };
    
    this.contextService.runWithContext(context, () => {
      next();
    });
  }
}
```

> 上下文中间件默认在服务启动中已经全局被注入。通过`context`配置项控制是否开启。

#### 2. 在服务中使用上下文

```typescript
import { Injectable } from '@nestjs/common';
import { ContextService } from '@cs/nest-common';

@Injectable()
export class UserService {
  constructor(private readonly contextService: ContextService) {}

  getCurrentUser() {
    const userId = this.contextService.getContext<string>('userId');
    const userName = this.contextService.getContext<string>('userName');
    
    return {
      userId,
      userName,
    };
  }
  
  getTenantInfo() {
    return {
      tenantId: this.contextService.getContext<string>('tenantId'),
      tenantName: this.contextService.getContext<string>('tenantName'),
    };
  }
  
  // 设置自定义上下文
  setCustomData(key: string, value: any) {
    this.contextService.setContext(key, value);
  }
}
```

> 上下文模块默认使用装饰器`CSModule`全局导入，无需手动导入。


## 日志模块

基于 Winston 的企业级日志解决方案，支持文件轮转、多级别日志、生产环境优化。


### 配置

```yaml
logger:
  level: 'info' # 全局默认日志级别  error, warn, info, verbose, debug
  timestamp: true # 是否开启时间戳
  disableConsoleAtProd: false # 是否在生产环境禁用控制台日志
  maxFileSize: '2m' # 单个日志文件最大大小
  maxFiles: '30' # 日志文件最大数量
  appLogName: 'web.log' # 应用日志名称
  errorLogName: 'error.log' # 错误日志名称
  dir: './logs' # 日志文件存储目录
  defaultContextLevel: 'info' # 未在 contextLevels 中配置的 context 的默认级别（可选）
  contextLevels: # 基于 context 的日志级别配置（可选）
    ToolA: 'error' # ToolA 只输出 error
    ToolB: 'warn' # ToolB 输出 warn 及以上
    MyService: 'verbose' # MyService 输出 verbose 及以上
```

#### contextLevels 与 defaultContextLevel 配置说明

`contextLevels` 允许为特定的 context（通常是类名或服务名）设置不同的日志级别，实现细粒度的日志控制：

- **已配置的 context** 使用 `contextLevels` 中指定的级别
- **未配置的 context** 优先使用 `defaultContextLevel`，未设置则回退到全局 `level`
- 支持的级别：`error` < `warn` < `info` < `verbose` < `debug`，以及特殊值 `none`（完全静默）

**`defaultContextLevel` 典型用法：**

| 场景 | 配置方式 |
|------|----------|
| 不设置（默认行为） | 未配置的 context 跟随全局 `level` |
| 白名单模式，只看指定模块 | `defaultContextLevel: 'none'`，在 `contextLevels` 中列出关注的模块 |
| 统一降级未配置模块 | `defaultContextLevel: 'warn'`，只看警告及以上 |

```yaml
# 示例：白名单模式 — 只看 OrderService 和 PayService 的日志
logger:
  level: 'info'
  defaultContextLevel: 'none'   # 其余 context 全部静默
  contextLevels:
    OrderService: 'debug'
    PayService: 'verbose' 
```

### 使用

> logger 服务注入方式,logger模块在nest-cloud中已经全局注册，可以直接注入使用 


```typescript
import { LoggerService } from '@cs/nest-common';

@Injectable()
export class AppService {
  constructor(private readonly logger: LoggerService) {}
} 
``` 

> 日志模块默认使用装饰器`CSModule`全局导入，无需手动导入。


#### 方法说明

```typescript
// 接受消息和可选的上下文
log(message: any, context?: string): void;

// 接受消息和任意数量的参数，最后一个如果时字符串是上下文
log(message: any, ...optionalParams: [...any, string?]): void;

// 实际的方法实现，处理所有重载情况
log(message: any, ...optionalParams: any[]): void;
```

**参数填充**

所有日志方法（`log`, `error`, `warn`, `debug`, `verbose`）现在都支持 `printf`-风格的参数填充。第一个参数 `message` 可以是一个包含占位符（如 `%s`, `%d`, `%j`）的格式化字符串，后续的参数将按顺序填充到这些占位符中。

-   `%s` - 字符串
-   `%d` - 数字
-   `%j` - JSON

#### 使用实例

```typescript
// 只传消息
logger.log('用户登录成功');

// 传消息和上下文
logger.log('用户登录成功', 'AuthService');

// 传递对象（最后一个参数如果是字符串则为上下文）
logger.log('用户登录成功', { userId: 123 });
logger.log('用户登录成功', { userId: 123 }, 'AuthService');

// --- 使用参数填充 ---

// 使用 %s 填充字符串, %d 填充数字
logger.log('用户 %s 登录成功, 用户ID: %d', 'Alice', 123);
// 输出: 用户 Alice 登录成功, 用户ID: 123

// 混合参数填充和上下文
logger.warn('用户 %s 的权限不足', 'Bob', 'AuthService');
// 输出: [AuthService] 用户 Bob 的权限不足

// 使用 %j 填充JSON对象
const requestData = { body: { username: 'cathy' }, ip: '192.168.1.1' };
logger.info('收到新的请求: %j', requestData, 'RequestLog');
// 输出: [RequestLog] 收到新的请求: {"body":{"username":"cathy"},"ip":"192.168.1.1"}
```

#### 基于 Context 的日志级别控制

使用 `contextLevels` 配置可以实现细粒度的日志控制：

```yaml
# config.yaml
logger:
  level: 'info'  # 全局默认级别
  contextLevels:
    ToolA: 'error'      # 只输出 error
    ToolB: 'warn'       # 输出 warn 及以上
    MyService: 'verbose' # 输出 verbose 及以上
```

```typescript
// 方式1: 构造函数设置 context（推荐）
@Injectable()
export class ToolAService {
  private readonly logger = new LoggerService('ToolA');

  doWork() {
    this.logger.verbose('调试信息');  // 不输出（error > verbose）
    this.logger.error('出错了！');    // 输出 ✓
  }
}

@Injectable()
export class MyService {
  private readonly logger = new LoggerService('MyService');

  doWork() {
    this.logger.verbose('调试信息');  // 输出 ✓
    this.logger.error('出错了！');    // 输出 ✓
  }
}

// 方式2: 通过依赖注入 + 传入 context 参数
@Injectable()
export class AppController {
  constructor(private readonly logger: LoggerService) {}

  someMethod() {
    // 使用传入的 context 参数，级别由配置决定
    this.logger.verbose('详细日志', 'ToolA');      // 不输出
    this.logger.verbose('详细日志', 'MyService');  // 输出 ✓
  }
}
```

#### 动态调整日志级别

```typescript
// 动态设置某个 context 的日志级别
logger.setContextLevel('ToolA', 'debug');

// 动态设置全局日志级别（影响所有未配置 contextLevels 且未设置 defaultContextLevel 的 context）
logger.setGlobalLevel('verbose');
```

#### 日志级别

- info 信息
- error 错误
- warn 警告
- verbose 详细
- debug 调试

##### 日志文件存储目录

- 默认存储在项目根目录下的logs文件夹中
- 可以通过配置修改存储目录  

##### 日志文件命名

- 默认的日志文件名是app.log，错误日志文件名是error.log
- 可以通过配置修改日志文件名
  


## 基础常用DTO基类定义

`@cs/nest-common` 提供了一套完整的基础 DTO 类，用于构建类型安全的数据传输对象。这些 DTO 基类具有优雅的继承层次结构，完美支持 NestJS 的数据验证和转换机制。

### DTO继承体系

```
BaseDto
 ├── TreeDto
 │   ├── HasEnableTreeDto
 │   └── HasPrimaryTreeDto
 │       └── HasPrimaryFullTreeDto
 ├── HasEnableDto
 │   └── HasPrimaryFullDto
 └── HasPrimaryDto
      └── HasPrimaryFullDto
```

### 核心 DTO 类详解

#### BaseDto

```typescript
abstract class BaseDto {
  @IsDate()
  createdAt?: Date;     // 创建时间
  
  @IsString()
  creatorId?: string;   // 创建者ID
  
  @IsString()
  creatorName?: string; // 创建者姓名
  
  @IsDate()
  modifiedAt?: Date;    // 修改时间
  
  @IsString() 
  modifierId?: string;  // 修改者ID
  
  @IsString()
  modifierName?: string; // 修改者姓名
  
  @IsBoolean()
  isRemoved?: boolean;  // 是否删除
  
  @IsInt()
  version?: number;     // 版本号
}
```

#### HasPrimaryDto

为实体提供主键ID支持：

```typescript
abstract class HasPrimaryDto extends BaseDto {
  @IsString()
  id?: string;  // 主键ID
}
```

#### HasEnableDto

添加启用/禁用功能和排序支持：

```typescript
abstract class HasEnableDto extends BaseDto {
  @IsInt()
  sortCode?: number;    // 排序代码
  
  @IsBoolean()
  isEnable?: boolean;   // 是否启用
}
```

#### HasPrimaryFullDto

结合了主键和启用功能的完整DTO：

```typescript
abstract class HasPrimaryFullDto extends HasEnableDto {
  @IsString()
  id?: string;  // 主键ID
}
```

#### TreeDto

用于构建树形结构数据：

```typescript
abstract class TreeDto extends BaseDto {
  @IsString()
  parentId?: string;    // 父节点ID
  
  @IsString()
  fullId?: string;      // 完整路径ID
  
  @IsString()
  fullName?: string;    // 完整路径名称
  
  @IsInt()
  level?: number;       // 层级
  
  @IsBoolean()
  isLeaf?: boolean;     // 是否叶子节点
}
```

#### 树形衍生DTO

- **HasEnableTreeDto**: 带启用功能的树形DTO
- **HasPrimaryTreeDto**: 带主键的树形DTO
- **HasPrimaryFullTreeDto**: 带主键和启用功能的完整树形DTO

### 响应结果封装

#### Result<T>

统一的API响应格式：

```typescript
class Result<T> {
  code: number;           // 响应码
  status: EHttpStatus;    // 状态枚举(success|error)
  message: any;           // 响应消息
  error?: any;            // 错误详情
  result?: T;             // 响应数据
}
```

#### ErrorResult

标准化的错误响应结构：

```typescript
class ErrorResult {
  code: number;           // 错误码
  message: string;        // 错误消息
  data?: string;          // 错误数据
  stack?: string;         // 错误堆栈
  path?: string;          // 错误路径
  timestamp?: string;     // 错误时间戳
}
```

#### PageResult<T>

分页查询结果封装：

```typescript
interface PageResult<T> {
  result: T;              // 分页数据
  count: number;          // 总数量
}
```

### 使用示例

#### 1. 创建实体DTO

```typescript
import { HasPrimaryFullDto } from '@cs/nest-common';
import { IsString, IsInt } from 'class-validator';

export class UserDto extends HasPrimaryFullDto {
  @IsString()
  username: string;
  
  @IsString()
  email: string;
  
  @IsInt()
  age: number;
}
```

#### 2. 创建树形数据DTO

```typescript
import { HasPrimaryFullTreeDto } from '@cs/nest-common';
import { IsString } from 'class-validator';

export class DepartmentDto extends HasPrimaryFullTreeDto {
  @IsString()
  name: string;
  
  @IsString()
  code: string;
}
```

#### 3. 使用分页查询

```typescript
import { PageResult, Result } from '@cs/nest-common';

@Injectable()
export class UserService {
  async findPaged(page: number, size: number): Promise<Result<PageResult<UserDto[]>>> {
    const [result, count] = await Promise.all([
      this.userRepository.findAndCount({ skip: (page - 1) * size, take: size }),
    ]);
    
    return {
      code: 200,
      status: EHttpStatus.Success,
      message: 'Success',
      result: {
        result: result[0],
        count: result[1],
      },
    };
  }
}
```


## 工具模块 (Utils)

### CommonUtil - 通用工具类

提供常用的工具方法，包括ID生成、字符串处理、网络信息获取等。

```typescript
import { CommonUtil } from '@/utils';

// ID 生成
const id = CommonUtil.idGenerate(); // 生成唯一ID
const shortId = CommonUtil.nanoidKey(8); // 生成指定长度ID
const idArray = CommonUtil.idArrGenerate(5); // 生成ID数组

// 随机字符串生成
const randomStr = CommonUtil.getRandomString(10); // 字母数字混合
const randomCode = CommonUtil.getRandomCode(6); // 纯数字

// 版本号生成
const version = CommonUtil.getVerSion(); // 基于时间戳

// 网络信息
const ip = CommonUtil.getIPAdress(); // 获取本机IP
const mac = CommonUtil.getMac(); // 获取MAC地址

// 生产环境禁用控制台
const originalConsole = CommonUtil.disableConsole();
```

### 加密工具类

#### AesUtils - AES对称加密

```typescript
import { AesUtils } from '@/utils';

// 基础加密解密
const encrypted = await AesUtils.encrypt('明文数据', 'my-password');
const decrypted = await AesUtils.decrypt(encrypted, 'my-password');

// 使用指定IV加密
const { key, iv } = AesUtils.generateKey();
const encryptedWithIV = await AesUtils.encrypt('数据', key, iv);
const decryptedWithIV = await AesUtils.decrypt(encryptedWithIV, key, iv);
```

#### RsaUtils - RSA非对称加密

```typescript
import { RsaUtils } from '@/utils';

const publicKey = `-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----`;

const privateKey = `-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----`;

// 短文本加密
const encrypted = RsaUtils.encrypt('短文本', publicKey);
const decrypted = RsaUtils.decrypt(encrypted, privateKey);

// 长文本分块加密
const longText = '很长的文本内容...';
const encryptedLong = RsaUtils.encryptLong(longText, publicKey);
const decryptedLong = RsaUtils.decryptLong(encryptedLong, privateKey);
```

#### Md5Utils - MD5哈希

```typescript
import { Md5Utils } from '@/utils';

// 基础哈希
const hash = Md5Utils.hash('待哈希的文本');

// 带盐值哈希
const saltedHash = Md5Utils.hashWithSalt('文本', 'salt', 1000);

// HMAC
const hmac = Md5Utils.hmac('消息', '密钥');

// 文件校验
const fileHash = Md5Utils.fileChecksum(fileBuffer);

// 验证
const isValid = Md5Utils.verify('原文', hash);
const isSaltedValid = Md5Utils.verifyWithSalt('原文', saltedHash, 'salt', 1000);
```

#### Argon2Utils - 密码哈希

```typescript
import { Argon2Utils } from '@/utils';

// 创建密码服务实例
const passwordService = new Argon2Utils({
  memoryCost: 65536, // 64MB
  timeCost: 3,       // 3次迭代
  parallelism: 4,    // 4线程
  hashLength: 32,    // 32字节输出
  type: 2           // argon2id
});

// 哈希密码
const hashedPassword = await passwordService.hashPassword('user-password');

// 验证密码
const isValid = await passwordService.verifyPassword(hashedPassword, 'user-password');

// 检查是否需要重新哈希
const needsRehash = await passwordService.needsRehash(hashedPassword);
if (needsRehash) {
  const newHash = await passwordService.hashPassword('user-password');
}
```


### 最佳实践

1. **安全实践**：敏感数据使用Argon2，密码hash不要用MD5，生产环境禁用console
2. **性能优化**：使用AES处理大数据量，RSA限制在1KB以下的小数据
3. **类型安全**：充分利用TypeScript类型系统，确保编译时类型检查
4. **错误处理**：所有异步操作需要适当的错误处理
5. **随机性**：ID生成使用Nanoid确保分布式环境下的唯一性

### 性能考量

- **Argon2**：资源消耗大，仅用于密码哈希
- **AES**：高性能对称加密，适合大数据
- **RSA**：非对称加密，速度慢，数据量受限
- **ID生成**：时间复杂度O(1)，无碰撞风险



### 持续升级策略

1. **密码安全升级**：
```typescript
@Injectable()
export class SecurityService {
  private readonly argon2 = new Argon2Utils();
  
  async upgradeUserPassword(userId: string) {
    const user = await this.userRepo.findById(userId);
    
    // 检查是否使用旧哈希算法
    if (user.password.startsWith('$2')) { // bcrypt
      throw new Error('需要手动转换密码算法');
    }
    
    // 检查Argon2参数是否过时
    if (await this.argon2.needsRehash(user.password)) {
      // 用户下次登录时自动升级
      user.needsPasswordUpgrade = true;
      await this.userRepo.save(user);
    }
  }
}
```

2. **向后兼容考虑**：
```typescript
interface LegacyHashDetector {
  detectHashType(hash: string): 'md5' | 'bcrypt' | 'argon2';
}

@Injectable()
export class PasswordService {
  verifyLegacyPassword(input: string, stored: string, type: string) {
    switch (type) {
      case 'md5':
        return Md5Utils.verify(input, stored);
      case 'argon2':
        return this.argon2.verifyPassword(stored, input);
      // ... 其他哈希类型处理
    }
  }
}
```

### 扩展自定义加密算法

```typescript
// 创建自定义加密服务
import { Injectable } from '@nestjs/common';
import { AesUtils, RsaUtils } from '@cs/nest-common';

interface EncryptionStrategy {
  encrypt(data: string): Promise<string>;
  decrypt(encrypted: string): Promise<string>;
}

@Injectable()
export class HybridEncryptionService {
  private readonly aes = AesUtils;
  private readonly rsa = RsaUtils;
  
  /**
   * 混合加密策略：用RSA加密AES密钥，AES加密实际数据
   * 兼顾安全性和性能
   */
  async encryptLargeData(data: string, publicKey: string): Promise<string> {
    // 1. 生成随机AES密钥
    const { key, iv } = this.aes.generateKey();
    
    // 2. 用AES加密数据
    const encryptedData = await this.aes.encrypt(data, key, iv);
    
    // 3. 用RSA加密AES密钥
    const encryptedKey = this.rsa.encrypt(JSON.stringify({ key, iv }), publicKey);
    
    // 4. 返回组合结果
    return `${encryptedKey}:${encryptedData}`;
  }
  
  async decryptLargeData(encrypted: string, privateKey: string): Promise<string> {
    const [encryptedKey, encryptedData] = encrypted.split(':');
    
    // 1. 用RSA解密AES密钥
    const { key, iv } = JSON.parse(this.rsa.decrypt(encryptedKey, privateKey));
    
    // 2. 用AES解密数据
    return await this.aes.decrypt(encryptedData, key, iv);
  }
}
```




> HTTP 客户端模块已迁移至 `@cs/nest-cloud`，详见 [nest-cloud 的 HttpService 文档](../nest-cloud/readme.md#httpservice外部-http-调用)。

