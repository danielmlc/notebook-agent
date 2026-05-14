---
title: "@cs/nest-schedule · 源码整理 v1.0.4"
type: source
aliases: ["@cs/nest-schedule 源码", "nest-schedule 源码"]
tags: [nestjs, mwp, code-docs, schedule]
status: stable
version: "1.0.4"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-schedule.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-schedule · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：1.0.4
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-schedule代码库源码整理

#### 代码目录
```
@cs/nest-schedule/
├── src/
├── core/
│   ├── executor/
│   │   ├── job-context.ts
│   │   ├── job-executor.service.ts
│   │   └── job-handler-registry.ts
│   ├── http/
│   │   ├── callback.service.ts
│   │   └── http-server.service.ts
│   ├── interfaces/
│   │   ├── executor.interface.ts
│   │   ├── index.ts
│   │   ├── registry.interface.ts
│   │   └── xxl-job.interface.ts
│   ├── log/
│   │   ├── file-logger.ts
│   │   ├── log-cleanup.service.ts
│   │   ├── log-file.service.ts
│   │   ├── log-reader.service.ts
│   │   └── log-writer.service.ts
│   ├── metrics/
│   │   ├── metrics.interface.ts
│   │   └── metrics.service.ts
│   └── registry/
│       ├── heartbeat.service.ts
│       └── registry.service.ts
├── decorators/
│   ├── index.ts
│   └── job-handler.decorator.ts
├── discovery/
│   └── job-handler-discovery.service.ts
├── index.ts
├── schedule.constants.ts
├── schedule.interface.ts
├── schedule.module.ts
└── schedule.service.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-schedule",
  "version": "1.0.4",
  "description": "NestJS module for XXL-Job distributed task scheduler",
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
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "reflect-metadata": "^0.2.2"
  },
  "peerDependencies": {
    "@cs/nest-common": "workspace:^",
    "@cs/nest-config": "workspace:^",
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    },
    "@cs/nest-config": {
      "optional": false
    },
    "@nestjs/common": {
      "optional": false
    },
    "@nestjs/core": {
      "optional": false
    }
  }
}
```


> 代码路径  `src\index.ts`

```typescript
/**
 * @cs/nest-schedule
 *
 * 基于 XXL-Job 的 NestJS 分布式定时任务执行器
 */

// 主模块
export * from './schedule.module';
export * from './schedule.service';

// 类型和接口
export * from './schedule.interface';
export * from './schedule.constants';

// 装饰器
export * from './decorators';

// 核心接口（供高级使用）
export * from './core/interfaces';
export * from './core/metrics/metrics.interface';

```


> 代码路径  `src\schedule.constants.ts`

```typescript
/**
 * 模块配置注入令牌
 */
export const SCHEDULE_MODULE_OPTIONS = Symbol('SCHEDULE_MODULE_OPTIONS');

/**
 * 执行器实例注入令牌
 */
export const SCHEDULE_EXECUTOR_INSTANCE = Symbol('SCHEDULE_EXECUTOR_INSTANCE');

/**
 * 任务处理器装饰器元数据键
 */
export const JOB_HANDLER_METADATA = 'xxl:job:handler';

/**
 * XXL-Job 执行器默认配置
 */
export const DEFAULT_EXECUTOR_CONFIG = {
  /** 执行器端口 */
  port: 9999,
  /** 心跳间隔（毫秒） */
  heartbeatInterval: 30000,
  /** 是否自动注册 */
  enableAutoRegistry: true,
  /** 日志保留天数 */
  logRetentionDays: 30,
  /** 日志存储路径 */
  logPath: './logs/xxl-job',
  /** 是否启用监控指标 */
  enableMetrics: true,
};

/**
 * XXL-Job 返回码
 */
export const XXL_JOB_RESPONSE_CODE = {
  /** 成功 */
  SUCCESS: 200,
  /** 失败 */
  FAIL: 500,
};

/**
 * XXL-Job 任务执行结果
 */
export const XXL_JOB_HANDLE_CODE = {
  /** 成功 */
  SUCCESS: 200,
  /** 失败 */
  FAIL: 500,
  /** 超时 */
  TIMEOUT: 502,
};

/**
 * Schedule 上下文传递的 HTTP 头键名
 * 与 @cs/nest-common 的 CONTEXT_HEADER 保持一致
 */
export const SCHEDULE_CONTEXT_HEADER = 'X-User-Context';

```


> 代码路径  `src\schedule.interface.ts`

```typescript
import { ModuleMetadata, Type } from '@nestjs/common';

/**
 * 调度模块配置选项
 */
export interface ScheduleModuleOptions {
  /**
   * XXL-Job Admin 地址列表
   * @example ['http://localhost:8080/xxl-job-admin']
   */
  adminAddresses: string[];

  /**
   * 访问令牌（Admin配置的AccessToken）
   */
  accessToken?: string;

  /**
   * 执行器名称（唯一标识）
   * @example 'my-executor'
   */
  appName: string;

  /**
   * 执行器端口
   * @default 9999
   */
  port?: number;

  /**
   * 执行器IP地址（可选，自动获取）
   */
  ip?: string;

  /**
   * 执行器完整地址（可选）
   * @example 'http://192.168.1.100:9999'
   */
  address?: string;

  /**
   * 日志存储路径
   * @default './logs/xxl-job'
   */
  logPath?: string;

  /**
   * 日志保留天数
   * @default 30
   */
  logRetentionDays?: number;

  /**
   * 日志清理间隔（小时）
   * @default 24
   */
  logCleanupIntervalHours?: number;

  /**
   * 是否自动注册到调度中心
   * @default true
   */
  enableAutoRegistry?: boolean;

  /**
   * 心跳间隔（毫秒）
   * @default 30000
   */
  heartbeatInterval?: number;

  /**
   * 是否启用监控指标
   * @default true
   */
  enableMetrics?: boolean;
}

/**
 * 异步配置选项
 */
export interface ScheduleModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * 工厂函数，用于创建配置
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<ScheduleModuleOptions> | ScheduleModuleOptions;

  /**
   * 注入的依赖项
   */
  inject?: any[];

  /**
   * 使用类创建配置
   */
  useClass?: Type<ScheduleModuleOptionsFactory>;

  /**
   * 使用现有的配置提供者
   */
  useExisting?: Type<ScheduleModuleOptionsFactory>;
}

/**
 * 配置工厂接口
 */
export interface ScheduleModuleOptionsFactory {
  createScheduleOptions():
    | Promise<ScheduleModuleOptions>
    | ScheduleModuleOptions;
}

/**
 * 任务处理器函数类型
 */
export type JobHandlerFunction = (context: JobContext) => Promise<any> | any;

/**
 * 任务上下文接口
 */
export interface JobContext {
  /**
   * 任务日志记录器
   */
  logger: JobLogger;

  /**
   * 任务参数
   */
  params?: string;

  /**
   * 分片索引（从0开始）
   */
  shardIndex?: number;

  /**
   * 分片总数
   */
  shardTotal?: number;

  /**
   * 任务ID
   */
  jobId: number;

  /**
   * 日志ID
   */
  logId: number;

  /**
   * 日志时间
   */
  logDateTime: number;

  /**
   * 执行超时时间（秒）
   */
  executorTimeout: number;

  /**
   * 检查任务是否已被终止
   */
  isKilled(): boolean;
}

/**
 * 任务日志记录器接口
 */
export interface JobLogger {
  /**
   * 记录普通日志
   */
  log(message: string, ...args: any[]): void;

  /**
   * 记录错误日志
   */
  error(message: string, trace?: string, ...args: any[]): void;

  /**
   * 记录警告日志
   */
  warn(message: string, ...args: any[]): void;

  /**
   * 记录调试日志
   */
  debug(message: string, ...args: any[]): void;
}

/**
 * 任务处理器元数据
 */
export interface JobHandlerMetadata {
  /**
   * 任务名称（在XXL-Job Admin中配置的JobHandler值）
   */
  jobName: string;
}

```


> 代码路径  `src\schedule.module.ts`

```typescript
import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { SCHEDULE_MODULE_OPTIONS } from './schedule.constants';
import {
  ScheduleModuleOptions,
  ScheduleModuleAsyncOptions,
  ScheduleModuleOptionsFactory,
} from './schedule.interface';
import { ScheduleService } from './schedule.service';
import { HttpServerService } from './core/http/http-server.service';
import { CallbackService } from './core/http/callback.service';
import { RegistryService } from './core/registry/registry.service';
import { HeartbeatService } from './core/registry/heartbeat.service';
import { JobExecutorService } from './core/executor/job-executor.service';
import { JobHandlerRegistry } from './core/executor/job-handler-registry';
import { MetricsService } from './core/metrics/metrics.service';
import { JobHandlerDiscoveryService } from './discovery/job-handler-discovery.service';
import { LogFileService } from './core/log/log-file.service';
import { LogWriterService } from './core/log/log-writer.service';
import { LogReaderService } from './core/log/log-reader.service';
import { LogCleanupService } from './core/log/log-cleanup.service';

/**
 * XXL-Job 调度模块
 *
 * 提供分布式定时任务执行器功能
 */
@Module({})
export class ScheduleModule {
  /**
   * 同步配置方式
   *
   * @example
   * ```typescript
   * ScheduleModule.forRoot({
   *   adminAddresses: ['http://localhost:8080/xxl-job-admin'],
   *   appName: 'my-executor',
   *   port: 9999,
   *   accessToken: 'default_token',
   * })
   * ```
   */
  static forRoot(options: ScheduleModuleOptions): DynamicModule {
    return {
      module: ScheduleModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: SCHEDULE_MODULE_OPTIONS,
          useValue: options,
        },
        ...this.createProviders(),
      ],
      exports: [ScheduleService],
    };
  }

  /**
   * 异步配置方式
   *
   * @example
   * ```typescript
   * ScheduleModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     adminAddresses: config.get('xxlJob.adminAddresses'),
   *     appName: config.get('xxlJob.appName'),
   *     port: config.get('xxlJob.port'),
   *     accessToken: config.get('xxlJob.accessToken'),
   *   }),
   * })
   * ```
   */
  static forRootAsync(options: ScheduleModuleAsyncOptions): DynamicModule {
    return {
      module: ScheduleModule,
      imports: [DiscoveryModule, ...(options.imports || [])],
      providers: [
        ...this.createAsyncProviders(options),
        ...this.createProviders(),
      ],
      exports: [ScheduleService],
    };
  }

  /**
   * 创建异步配置提供者
   */
  private static createAsyncProviders(
    options: ScheduleModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: SCHEDULE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    const useClass = options.useClass as Type<ScheduleModuleOptionsFactory>;
    const useExisting =
      options.useExisting as Type<ScheduleModuleOptionsFactory>;

    return [
      {
        provide: SCHEDULE_MODULE_OPTIONS,
        useFactory: async (optionsFactory: ScheduleModuleOptionsFactory) =>
          await optionsFactory.createScheduleOptions(),
        inject: [useClass || useExisting],
      },
      ...(useClass
        ? [
            {
              provide: useClass,
              useClass,
            },
          ]
        : []),
    ];
  }

  /**
   * 创建核心服务提供者
   */
  private static createProviders(): Provider[] {
    return [
      // 核心服务
      ScheduleService,

      // HTTP 服务
      HttpServerService,
      CallbackService,

      // 注册与心跳
      RegistryService,
      HeartbeatService,

      // 执行器
      JobExecutorService,
      JobHandlerRegistry,

      // 监控
      MetricsService,

      // 服务发现
      JobHandlerDiscoveryService,

      // 日志服务
      LogFileService,
      LogWriterService,
      LogReaderService,
      LogCleanupService,
    ];
  }
}

```


> 代码路径  `src\schedule.service.ts`

```typescript
import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  SCHEDULE_MODULE_OPTIONS,
  DEFAULT_EXECUTOR_CONFIG,
} from './schedule.constants';
import { ScheduleModuleOptions } from './schedule.interface';
import { HttpServerService } from './core/http/http-server.service';
import { CallbackService } from './core/http/callback.service';
import { RegistryService } from './core/registry/registry.service';
import { HeartbeatService } from './core/registry/heartbeat.service';
import { JobExecutorService } from './core/executor/job-executor.service';
import { JobHandlerRegistry } from './core/executor/job-handler-registry';
import { MetricsService } from './core/metrics/metrics.service';
import { LogCleanupService } from './core/log/log-cleanup.service';
import { RegistryInfo } from './core/interfaces';
import * as os from 'os';

/**
 * 调度模块核心服务
 *
 * 负责协调所有子服务，管理执行器生命周期
 */
@Injectable()
export class ScheduleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduleService.name);
  private isInitialized = false;

  constructor(
    @Inject(SCHEDULE_MODULE_OPTIONS)
    private readonly options: ScheduleModuleOptions,
    private readonly httpServerService: HttpServerService,
    private readonly callbackService: CallbackService,
    private readonly registryService: RegistryService,
    private readonly heartbeatService: HeartbeatService,
    private readonly executorService: JobExecutorService,
    private readonly handlerRegistry: JobHandlerRegistry,
    private readonly metricsService: MetricsService,
    private readonly logCleanupService: LogCleanupService,
  ) {}

  /**
   * 模块初始化
   */
  async onModuleInit(): Promise<void> {
    try {
      this.logger.verbose('定时任务执行器正在初始化...');

      // 合并默认配置
      const config = { ...DEFAULT_EXECUTOR_CONFIG, ...this.options };

      // 获取执行器地址信息
      const registryInfo = this.buildRegistryInfo(config);

      // 0. 配置回调服务
      this.callbackService.configure(config.adminAddresses, config.accessToken);

      // 1. 启动 HTTP 服务器
      await this.httpServerService.start(
        config.port!,
        this.executorService,
        this.handlerRegistry,
      );

      // 2. 注册到调度中心（如果启用）
      if (config.enableAutoRegistry) {
        await this.registryService.registry(registryInfo);

        // 3. 启动心跳
        this.heartbeatService.start(registryInfo);
      }

      // 4. 更新指标
      if (config.enableMetrics) {
        this.metricsService.setRegisteredHandlerCount(
          this.handlerRegistry.getAllJobNames().length,
        );
      }

      // 5. 启动日志清理服务
      const logRetentionDays = config.logRetentionDays ?? 30;
      const logCleanupIntervalHours = config.logCleanupIntervalHours ?? 24;
      this.logCleanupService.start(logRetentionDays, logCleanupIntervalHours);

      this.isInitialized = true;
      this.logger.log(
        `定时任务${config.appName}执行器初始化完成！执行器地址: ${registryInfo.address}`,
      );
      this.logger.log(
        `已注册任务: ${this.handlerRegistry.getAllJobNames().join(', ')}`,
      );

      // 注册优雅关闭钩子
      this.registerShutdownHooks();
    } catch (error) {
      this.logger.error(
        `定时任务执行器初始化失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 模块销毁
   */
  async onModuleDestroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.verbose('定时任务执行器正在关闭...');

      // 1. 停止心跳
      this.heartbeatService.stop();

      // 2. 注销执行器
      if (this.options.enableAutoRegistry !== false) {
        await this.registryService.registryRemove();
      }

      // 3. 停止日志清理服务
      this.logCleanupService.stop();

      // 4. 停止 HTTP 服务器
      await this.httpServerService.stop();

      this.isInitialized = false;
      this.logger.verbose('定时任务执行器已关闭');
    } catch (error) {
      this.logger.error(
        `定时任务执行器关闭失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 获取执行器指标
   */
  getMetrics() {
    return this.metricsService.getExecutorMetrics();
  }

  /**
   * 获取已注册的任务列表
   */
  getJobHandlers() {
    return this.handlerRegistry.getAllJobNames();
  }

  /**
   * 构建注册信息
   */
  private buildRegistryInfo(
    config: ScheduleModuleOptions & { port: number },
  ): RegistryInfo {
    const ip = config.ip || this.getLocalIpAddress();
    const port = config.port;
    const address = config.address || `http://${ip}:${port}`;

    return {
      appName: config.appName,
      address,
      ip,
      port,
    };
  }

  /**
   * 获取本机IP地址
   * 按常用网段优先级顺序查找：192.168.x.x > 172.16-31.x.x > 10.x.x.x
   */
  private getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();

    // 按常用网段优先级顺序查找
    const preferredRanges = [
      /^192\.168\./, // 192.168.x.x
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.x.x - 172.31.x.x
      /^10\./, // 10.x.x.x
    ];

    for (const range of preferredRanges) {
      for (const devName in interfaces) {
        const iface = interfaces[devName];
        if (iface) {
          for (const alias of iface) {
            if (
              alias.family === 'IPv4' &&
              alias.address !== '127.0.0.1' &&
              !alias.internal &&
              range.test(alias.address)
            ) {
              return alias.address;
            }
          }
        }
      }
    }

    // 如果没找到常用网段的IP，返回第一个非回环地址
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (iface) {
        for (const alias of iface) {
          if (
            alias.family === 'IPv4' &&
            alias.address !== '127.0.0.1' &&
            !alias.internal
          ) {
            return alias.address;
          }
        }
      }
    }

    // 如果没有找到，返回localhost
    this.logger.warn('无法获取本机IP地址，使用 127.0.0.1');
    return '127.0.0.1';
  }

  /**
   * 注册优雅关闭钩子
   */
  private registerShutdownHooks(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

    signals.forEach((signal) => {
      process.once(signal, async () => {
        this.logger.log(`收到 ${signal} 信号，开始优雅关闭定时任务执行器...`);
        await this.onModuleDestroy();
        process.exit(0);
      });
    });
  }
}

```


> 代码路径  `src\decorators\index.ts`

```typescript
export * from './job-handler.decorator';

```


> 代码路径  `src\decorators\job-handler.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { JOB_HANDLER_METADATA } from '../schedule.constants';
import { JobHandlerMetadata } from '../schedule.interface';

/**
 * 任务处理器装饰器
 *
 * 用于标记一个方法作为 XXL-Job 任务处理器
 *
 * @param jobName 任务名称（需与 XXL-Job Admin 中配置的 JobHandler 值一致）
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class TaskService {
 *   @JobHandler('demoJob')
 *   async handleDemoJob(context: JobContext) {
 *     const { logger, params } = context;
 *     logger.log(`执行任务，参数：${params}`);
 *     // 业务逻辑
 *     return { success: true };
 *   }
 * }
 * ```
 */
export const JobHandler = (jobName: string): MethodDecorator => {
  if (!jobName || typeof jobName !== 'string') {
    throw new Error('JobHandler: jobName must be a non-empty string');
  }

  const metadata: JobHandlerMetadata = { jobName };
  return SetMetadata(JOB_HANDLER_METADATA, metadata);
};

```


> 代码路径  `src\discovery\job-handler-discovery.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { JOB_HANDLER_METADATA } from '../schedule.constants';
import { JobHandlerMetadata } from '../schedule.interface';
import { JobHandlerRegistry } from '../core/executor/job-handler-registry';
import { JobHandlerInfo } from '../core/interfaces';

/**
 * 任务处理器发现服务
 *
 * 负责扫描所有带有 @JobHandler 装饰器的方法并自动注册
 */
@Injectable()
export class JobHandlerDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(JobHandlerDiscoveryService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly handlerRegistry: JobHandlerRegistry,
  ) {}

  /**
   * 模块初始化时自动发现并注册任务处理器
   */
  async onModuleInit(): Promise<void> {
    this.logger.verbose('开始扫描任务处理器...');

    const startTime = Date.now();
    const handlers = this.discover();

    // 注册所有发现的任务处理器
    handlers.forEach((handler) => {
      this.handlerRegistry.register(handler);
    });

    const duration = Date.now() - startTime;
    this.logger.log(
      `任务处理器扫描完成，共发现 ${handlers.length} 个处理器，耗时 ${duration}ms`,
    );
  }

  /**
   * 发现所有任务处理器
   */
  discover(): JobHandlerInfo[] {
    const handlers: JobHandlerInfo[] = [];

    // 获取所有提供者
    const providers: InstanceWrapper[] = this.discoveryService.getProviders();

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;

      if (!instance || !Object.getPrototypeOf(instance)) {
        return;
      }

      // 扫描实例的所有方法
      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (methodName: string) => {
          const methodRef = instance[methodName];

          // 获取方法上的装饰器元数据
          const metadata = this.reflector.get<JobHandlerMetadata>(
            JOB_HANDLER_METADATA,
            methodRef,
          );

          if (metadata) {
            const { jobName } = metadata;

            handlers.push({
              jobName,
              handler: methodRef,
              instance,
              methodName,
            });

            this.logger.debug(
              `发现任务处理器: ${jobName} -> ${instance.constructor.name}.${methodName}`,
            );
          }
        },
      );
    });

    return handlers;
  }

  /**
   * 重新发现并注册任务处理器（可用于热重载）
   */
  rediscover(): void {
    this.logger.log('重新扫描任务处理器...');

    // 清空现有注册
    this.handlerRegistry.clear();

    // 重新发现并注册
    const handlers = this.discover();
    handlers.forEach((handler) => {
      this.handlerRegistry.register(handler);
    });

    this.logger.log(`重新扫描完成，共发现 ${handlers.length} 个处理器`);
  }
}

```


> 代码路径  `src\core\executor\job-context.ts`

```typescript
import { JobContext, JobLogger } from '../../schedule.interface';

/**
 * 任务执行上下文实现
 */
export class JobContextImpl implements JobContext {
  private _killed = false;

  constructor(
    public readonly logger: JobLogger,
    public readonly jobId: number,
    public readonly logId: number,
    public readonly logDateTime: number,
    public readonly executorTimeout: number,
    public readonly params?: string,
    public readonly shardIndex?: number,
    public readonly shardTotal?: number,
  ) {
    // 绑定 isKilled 方法，使其可以安全地被解构使用
    this.isKilled = this.isKilled.bind(this);
  }

  /**
   * 检查任务是否已被终止
   */
  isKilled(): boolean {
    return this._killed;
  }

  /**
   * 标记任务为已终止（内部方法）
   * @internal
   */
  kill(): void {
    this._killed = true;
  }
}

```


> 代码路径  `src\core\executor\job-executor.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from '@cs/nest-common';
import { XXL_JOB_HANDLE_CODE } from '../../schedule.constants';
import { JobLogger } from '../../schedule.interface';
import { RunningJobInfo, XxlJobTriggerRequest } from '../interfaces';
import { JobContextImpl } from './job-context';
import { JobHandlerRegistry } from './job-handler-registry';
import { LogWriterService } from '../log/log-writer.service';

/**
 * 任务执行器服务
 *
 * 负责任务的执行、状态追踪、终止管理等核心功能
 */
@Injectable()
export class JobExecutorService {
  private readonly logger = new Logger(JobExecutorService.name);
  private readonly runningJobs = new Map<number, RunningJobInfo>();

  constructor(
    private readonly handlerRegistry: JobHandlerRegistry,
    private readonly logWriterService: LogWriterService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * 执行任务
   */
  async execute(
    request: XxlJobTriggerRequest,
    userContext?: Record<string, any>,
  ): Promise<{ code: number; msg: string }> {
    const { jobId, executorHandler, logId, logDateTime } = request;

    // 检查任务处理器是否存在
    if (!this.handlerRegistry.has(executorHandler)) {
      const errorMsg = `任务处理器 "${executorHandler}" 未找到`;
      this.logger.error(errorMsg);
      return {
        code: XXL_JOB_HANDLE_CODE.FAIL,
        msg: errorMsg,
      };
    }

    // 检查任务是否已在运行（阻塞策略处理）
    if (this.runningJobs.has(jobId)) {
      const blockStrategy = request.executorBlockStrategy || 'SERIAL_EXECUTION';

      if (blockStrategy === 'DISCARD_LATER') {
        const warnMsg = `任务 ${jobId} 正在运行，丢弃后续调度`;
        this.logger.warn(warnMsg);
        return {
          code: XXL_JOB_HANDLE_CODE.FAIL,
          msg: warnMsg,
        };
      } else if (blockStrategy === 'COVER_EARLY') {
        // 终止之前的任务
        this.killJob(jobId);
        this.logger.warn(`任务 ${jobId} 正在运行，终止之前的任务`);
      } else {
        // SERIAL_EXECUTION：串行执行，等待之前的任务完成
        const warnMsg = `任务 ${jobId} 正在运行，等待完成（串行执行）`;
        this.logger.warn(warnMsg);
        return {
          code: XXL_JOB_HANDLE_CODE.FAIL,
          msg: warnMsg,
        };
      }
    }

    // 创建任务上下文
    const jobLogger = this.createJobLogger(logId, logDateTime);
    const context = new JobContextImpl(
      jobLogger,
      jobId,
      logId,
      logDateTime,
      request.executorTimeout || 0,
      request.executorParams,
      request.broadcastIndex,
      request.broadcastTotal,
    );

    // 获取任务处理器
    const handlerInfo = this.handlerRegistry.get(executorHandler);
    if (!handlerInfo) {
      return {
        code: XXL_JOB_HANDLE_CODE.FAIL,
        msg: `任务处理器 "${executorHandler}" 未找到`,
      };
    }

    // 异步执行任务
    const promise = this.executeJob(handlerInfo, context, userContext);

    // 记录运行中的任务
    this.runningJobs.set(jobId, {
      jobId,
      logId,
      startTime: Date.now(),
      context,
      promise,
    });

    // 等待任务完成或超时
    try {
      let timeoutHandle: NodeJS.Timeout | undefined;
      const timeout = (request.executorTimeout || 0) * 1000;
      let result: any;

      if (timeout > 0) {
        // 有超时限制
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            context.kill();
            reject(new Error(`任务执行超时（${timeout}ms）`));
          }, timeout);
        });

        result = await Promise.race([promise, timeoutPromise]);
      } else {
        // 无超时限制
        result = await promise;
      }

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // 将任务返回值序列化为消息
      let resultMsg = '执行成功';
      if (result !== undefined && result !== null) {
        try {
          resultMsg = JSON.stringify(result);
        } catch {
          resultMsg = String(result);
        }
      }

      this.logger.log(`任务 ${jobId} 执行成功`);
      return {
        code: XXL_JOB_HANDLE_CODE.SUCCESS,
        msg: resultMsg,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `任务 ${jobId} 执行失败: ${errorMsg}`,
        error instanceof Error ? error.stack : undefined,
      );

      // 判断是否超时
      const isTimeout = errorMsg.includes('超时');

      return {
        code: isTimeout
          ? XXL_JOB_HANDLE_CODE.TIMEOUT
          : XXL_JOB_HANDLE_CODE.FAIL,
        msg: errorMsg,
      };
    } finally {
      // 清理运行中的任务记录
      this.runningJobs.delete(jobId);

      // 关闭日志文件流
      try {
        await this.logWriterService.closeLogFile(logId);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `关闭日志文件失败: logId=${logId}, error=${errorMsg}`,
        );
      }
    }
  }

  /**
   * 终止任务
   */
  killJob(jobId: number): boolean {
    const runningJob = this.runningJobs.get(jobId);
    if (!runningJob) {
      this.logger.warn(`任务 ${jobId} 未在运行中，无法终止`);
      return false;
    }

    // 标记任务为已终止
    if (runningJob.context && typeof runningJob.context.kill === 'function') {
      runningJob.context.kill();
      this.logger.log(`任务 ${jobId} 已标记为终止`);
      return true;
    }

    return false;
  }

  /**
   * 检查任务是否空闲（未运行）
   */
  isIdle(jobId: number): boolean {
    return !this.runningJobs.has(jobId);
  }

  /**
   * 检查任务是否正在运行
   */
  isRunning(jobId: number): boolean {
    return this.runningJobs.has(jobId);
  }

  /**
   * 通过 logId 获取 jobId
   *
   * @param logId 日志ID
   * @returns jobId 如果找到，否则返回 undefined
   */
  getJobIdByLogId(logId: number): number | undefined {
    for (const [jobId, jobInfo] of this.runningJobs.entries()) {
      if (jobInfo.logId === logId) {
        return jobId;
      }
    }
    return undefined;
  }

  /**
   * 获取运行中的任务数量
   */
  getRunningJobCount(): number {
    return this.runningJobs.size;
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * 执行任务（内部方法）
   */
  private async executeJob(
    handlerInfo: any,
    context: JobContextImpl,
    userContext?: Record<string, any>,
  ): Promise<any> {
    try {
      const { handler, instance } = handlerInfo;

      // 生成默认上下文字段（参考 nest-cloud 的 context.middleware.ts）
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      // 构建完整上下文
      const fullContext = {
        // ContextService 默认字段
        requestId: requestId,
        trackingId: requestId,
        startTime: startTime,
        url: `/job/${context.jobId}`,
        method: 'SCHEDULE JOB',
        history: [],

        // 任务相关字段
        jobId: context.jobId,
        logId: context.logId,
        logDateTime: context.logDateTime,
        executorParams: context.params,
        broadcastIndex: context.shardIndex,
        broadcastTotal: context.shardTotal,

        // 合并用户自定义上下文（从 HTTP 头传递的）
        ...(userContext || {}),
      };

      // 使用 runWithContext 包装执行
      return await this.contextService.runWithContext(fullContext, async () => {
        // 绑定this并执行
        const boundHandler = handler.bind(instance);
        const result = await boundHandler(context);
        return result;
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * 创建任务日志记录器
   *
   * 使用文件日志记录器，将日志同时输出到控制台和文件
   */
  private createJobLogger(logId: number, logDateTime: number): JobLogger {
    return this.logWriterService.createFileLogger(logId, logDateTime);
  }
}

```


> 代码路径  `src\core\executor\job-handler-registry.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { JobHandlerInfo } from '../interfaces';

/**
 * 任务处理器注册表
 *
 * 管理所有通过 @JobHandler 装饰器注册的任务处理器
 */
@Injectable()
export class JobHandlerRegistry {
  private readonly logger = new Logger(JobHandlerRegistry.name);
  private readonly handlers = new Map<string, JobHandlerInfo>();

  /**
   * 注册任务处理器
   */
  register(info: JobHandlerInfo): void {
    if (this.handlers.has(info.jobName)) {
      this.logger.warn(
        `任务处理器 "${info.jobName}" 已存在，将被覆盖。` +
          `原处理器：${this.handlers.get(info.jobName)?.instance?.constructor?.name}.${this.handlers.get(info.jobName)?.methodName}，` +
          `新处理器：${info.instance?.constructor?.name}.${info.methodName}`,
      );
    }

    this.handlers.set(info.jobName, info);
    // this.logger.verbose(
    //   `注册任务处理器: ${info.jobName} -> ${info.instance?.constructor?.name}.${info.methodName}`,
    // );
  }

  /**
   * 获取任务处理器
   */
  get(jobName: string): JobHandlerInfo | undefined {
    return this.handlers.get(jobName);
  }

  /**
   * 检查任务处理器是否存在
   */
  has(jobName: string): boolean {
    return this.handlers.has(jobName);
  }

  /**
   * 获取所有任务处理器
   */
  getAll(): JobHandlerInfo[] {
    return Array.from(this.handlers.values());
  }

  /**
   * 获取所有任务名称
   */
  getAllJobNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * 清空所有任务处理器
   */
  clear(): void {
    this.handlers.clear();
  }
}

```


> 代码路径  `src\core\http\callback.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { XxlJobCallbackRequest } from '../interfaces';

/**
 * 回调服务
 *
 * 负责将任务执行结果回调给 XXL-Job Admin
 */
@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);
  private adminAddresses: string[] = [];
  private accessToken?: string;

  /**
   * 配置回调服务
   */
  configure(adminAddresses: string[], accessToken?: string): void {
    this.adminAddresses = adminAddresses;
    this.accessToken = accessToken;
    this.logger.log(`回调服务已配置: Admin地址=${adminAddresses.join(', ')}`);
  }

  /**
   * 回调任务执行结果
   */
  async callback(callbackParams: XxlJobCallbackRequest): Promise<boolean> {
    if (!this.adminAddresses || this.adminAddresses.length === 0) {
      this.logger.warn('未配置 Admin 地址，跳过回调');
      return false;
    }

    this.logger.debug(
      `准备回调任务执行结果: logId=${callbackParams.logId}, handleCode=${callbackParams.handleCode}`,
    );

    // 尝试向所有 Admin 地址发送回调
    const results = await Promise.allSettled(
      this.adminAddresses.map((adminAddress) =>
        this.sendCallback(adminAddress, callbackParams),
      ),
    );

    // 只要有一个成功就算成功
    const hasSuccess = results.some(
      (result) => result.status === 'fulfilled' && result.value === true,
    );

    if (hasSuccess) {
      this.logger.log(`任务执行结果回调成功: logId=${callbackParams.logId}`);
    } else {
      this.logger.error(`任务执行结果回调失败: logId=${callbackParams.logId}`);
    }

    return hasSuccess;
  }

  /**
   * 发送回调到指定的 Admin 地址
   */
  private async sendCallback(
    adminAddress: string,
    callbackParams: XxlJobCallbackRequest,
  ): Promise<boolean> {
    const callbackUrl = `${adminAddress}/api/callback`;

    try {
      const response = await axios.post(
        callbackUrl,
        [callbackParams], // XXL-Job Admin 的 callback 接口接收数组
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.accessToken && {
              'XXL-JOB-ACCESS-TOKEN': this.accessToken,
            }),
          },
          timeout: 5000, // 5秒超时
        },
      );

      if (response.data && response.data.code === 200) {
        this.logger.debug(`回调成功: ${callbackUrl}`);
        return true;
      } else {
        this.logger.warn(
          `回调响应异常: ${callbackUrl}, code=${response.data?.code}`,
        );
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`回调失败: ${callbackUrl}, error=${errorMsg}`);
      return false;
    }
  }

  /**
   * 批量回调（用于未来的优化）
   */
  async batchCallback(
    callbackParamsList: XxlJobCallbackRequest[],
  ): Promise<boolean> {
    if (!this.adminAddresses || this.adminAddresses.length === 0) {
      this.logger.warn('未配置 Admin 地址，跳过批量回调');
      return false;
    }

    // 尝试向所有 Admin 地址发送批量回调
    const results = await Promise.allSettled(
      this.adminAddresses.map((adminAddress) =>
        this.sendBatchCallback(adminAddress, callbackParamsList),
      ),
    );

    // 只要有一个成功就算成功
    const hasSuccess = results.some(
      (result) => result.status === 'fulfilled' && result.value === true,
    );

    return hasSuccess;
  }

  /**
   * 发送批量回调到指定的 Admin 地址
   */
  private async sendBatchCallback(
    adminAddress: string,
    callbackParamsList: XxlJobCallbackRequest[],
  ): Promise<boolean> {
    const callbackUrl = `${adminAddress}/api/callback`;

    try {
      const response = await axios.post(callbackUrl, callbackParamsList, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.accessToken && {
            'XXL-JOB-ACCESS-TOKEN': this.accessToken,
          }),
        },
        timeout: 5000,
      });

      if (response.data && response.data.code === 200) {
        this.logger.debug(
          `批量回调成功: ${callbackUrl}, count=${callbackParamsList.length}`,
        );
        return true;
      } else {
        this.logger.warn(
          `批量回调响应异常: ${callbackUrl}, code=${response.data?.code}`,
        );
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`批量回调失败: ${callbackUrl}, error=${errorMsg}`);
      return false;
    }
  }
}

```


> 代码路径  `src\core\http\http-server.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import express, { Express } from 'express';
import { Server } from 'http';
import { ContextService } from '@cs/nest-common';
import { JobExecutorService } from '../executor/job-executor.service';
import { JobHandlerRegistry } from '../executor/job-handler-registry';
import {
  XXL_JOB_RESPONSE_CODE,
  XXL_JOB_HANDLE_CODE,
  SCHEDULE_CONTEXT_HEADER,
} from '../../schedule.constants';
import {
  XxlJobResponse,
  XxlJobTriggerRequest,
  XxlJobKillRequest,
  XxlJobLogRequest,
  XxlJobLogResponse,
  XxlJobIdleBeatRequest,
  XxlJobCallbackRequest,
} from '../interfaces';
import { CallbackService } from './callback.service';
import { LogReaderService } from '../log/log-reader.service';

/**
 * HTTP 服务器管理服务
 *
 * 负责创建和管理轻量级 Express HTTP 应用（执行器HTTP服务）
 */
@Injectable()
export class HttpServerService {
  private readonly logger = new Logger(HttpServerService.name);
  private app: Express | null = null;
  private server: Server | null = null;
  private port = 9999;
  private executorService: JobExecutorService | null = null;
  private callbackService: CallbackService | null = null;

  constructor(
    private readonly callback: CallbackService,
    private readonly logReaderService: LogReaderService,
    private readonly contextService: ContextService,
  ) {}

  /**
   * 启动 HTTP 服务器
   */
  async start(
    port: number,
    executorService: JobExecutorService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    handlerRegistry: JobHandlerRegistry, // 保留参数以兼容接口
  ): Promise<void> {
    if (this.app) {
      this.logger.warn('HTTP 服务器已在运行');
      return;
    }

    this.port = port;
    this.executorService = executorService;
    this.callbackService = this.callback;

    try {
      // 创建 Express 应用
      this.app = express();

      // 启用 JSON 解析
      this.app.use(express.json());

      // 启用 CORS（XXL-Job Admin 直接调用）
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
          return res.sendStatus(200);
        }
        next();
      });

      // 注册路由
      this.registerRoutes(executorService);

      // 启动服务器
      await new Promise<void>((resolve, reject) => {
        if (!this.app) {
          return reject(new Error('Express app not initialized'));
        }

        this.server = this.app.listen(port, '0.0.0.0', () => {
          // this.logger.log(`定时任务执行器 HTTP 服务已启动，监听端口: ${port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error(
        `HTTP 服务器启动失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 注册所有路由
   */
  private registerRoutes(executorService: JobExecutorService): void {
    if (!this.app) return;

    // POST /beat - 心跳检测
    this.app.post('/beat', (req, res) => {
      this.logger.debug('收到心跳检测请求');
      const response: XxlJobResponse = {
        code: XXL_JOB_RESPONSE_CODE.SUCCESS,
        msg: 'pong',
      };
      res.json(response);
    });

    // POST /idleBeat - 空闲检测
    this.app.post('/idleBeat', (req, res) => {
      const request = req.body as XxlJobIdleBeatRequest;
      this.logger.debug(`收到空闲检测请求: jobId=${request.jobId}`);

      const isIdle = executorService.isIdle(request.jobId);

      const response: XxlJobResponse = isIdle
        ? {
            code: XXL_JOB_RESPONSE_CODE.SUCCESS,
            msg: '任务空闲',
          }
        : {
            code: XXL_JOB_RESPONSE_CODE.FAIL,
            msg: '任务运行中',
          };

      res.json(response);
    });

    // POST /run - 执行任务
    this.app.post('/run', async (req, res) => {
      const request = req.body as XxlJobTriggerRequest;
      this.logger.log(
        `收到任务执行请求: jobId=${request.jobId}, handler=${request.executorHandler}, params=${request.executorParams}`,
      );

      // 提取上下文
      let deserializedContext: Record<string, any> | undefined;
      const contextHeader = req.headers[SCHEDULE_CONTEXT_HEADER.toLowerCase()];
      if (contextHeader && typeof contextHeader === 'string') {
        try {
          deserializedContext =
            this.contextService.decodeContext(contextHeader);
          this.logger.debug(
            `已从请求头中解码上下文: ${JSON.stringify(deserializedContext)}`,
          );
        } catch (e: any) {
          this.logger.warn(`解码上下文失败: ${e.message}`);
        }
      }

      try {
        // 立即返回成功响应（异步执行模式）
        const response: XxlJobResponse = {
          code: XXL_JOB_RESPONSE_CODE.SUCCESS,
          msg: '任务已接收',
        };
        res.json(response);

        // 异步执行任务，完成后回调结果
        setImmediate(async () => {
          try {
            const result = await executorService.execute(
              request,
              deserializedContext,
            );

            // 将任务执行结果回调给 Admin
            const callbackParams: XxlJobCallbackRequest = {
              logId: request.logId,
              logDateTim: request.logDateTime,
              handleCode: result.code,
              handleMsg: result.msg,
            };

            await this.callbackService?.callback(callbackParams);
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `任务执行失败: ${errorMsg}`,
              error instanceof Error ? error.stack : undefined,
            );

            // 回调失败结果
            const callbackParams: XxlJobCallbackRequest = {
              logId: request.logId,
              logDateTim: request.logDateTime,
              handleCode: XXL_JOB_HANDLE_CODE.FAIL,
              handleMsg: errorMsg,
            };

            await this.callbackService?.callback(callbackParams);
          }
        });
      } catch (error) {
        // 这里的错误是指任务接收失败（很少见）
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `任务接收失败: ${errorMsg}`,
          error instanceof Error ? error.stack : undefined,
        );

        const response: XxlJobResponse = {
          code: XXL_JOB_RESPONSE_CODE.FAIL,
          msg: errorMsg,
        };
        res.json(response);
      }
    });

    // POST /kill - 终止任务
    this.app.post('/kill', (req, res) => {
      const request = req.body as XxlJobKillRequest;
      this.logger.log(`收到终止任务请求: jobId=${request.jobId}`);

      const success = executorService.killJob(request.jobId);

      const response: XxlJobResponse = success
        ? {
            code: XXL_JOB_RESPONSE_CODE.SUCCESS,
            msg: '任务已终止',
          }
        : {
            code: XXL_JOB_RESPONSE_CODE.FAIL,
            msg: '任务未在运行或终止失败',
          };

      res.json(response);
    });

    // POST /log - 查询日志
    this.app.post('/log', async (req, res) => {
      const request = req.body as XxlJobLogRequest;
      this.logger.debug(
        `收到日志查询请求: logId=${request.logId}, fromLineNum=${request.fromLineNum}`,
      );

      try {
        // 调用 LogReaderService 读取日志
        const logResult = await this.logReaderService.readLog(
          request.logId,
          request.logDateTim,
          request.fromLineNum,
        );

        const response: XxlJobResponse<XxlJobLogResponse> = {
          code: XXL_JOB_RESPONSE_CODE.SUCCESS,
          msg: '查询成功',
          content: {
            fromLineNum: logResult.fromLineNum,
            toLineNum: logResult.toLineNum,
            logContent: logResult.logContent,
            isEnd: logResult.isEnd,
          },
        };

        res.json(response);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `日志查询失败: ${errorMsg}`,
          error instanceof Error ? error.stack : undefined,
        );

        const response: XxlJobResponse = {
          code: XXL_JOB_RESPONSE_CODE.FAIL,
          msg: `日志查询失败: ${errorMsg}`,
        };
        res.json(response);
      }
    });
  }

  /**
   * 停止 HTTP 服务器
   */
  async stop(): Promise<void> {
    if (!this.server) {
      this.logger.warn('HTTP 服务器未在运行');
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        if (!this.server) {
          return resolve();
        }

        this.server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.app = null;
      this.server = null;
      this.executorService = null;
      this.logger.log(`定时任务执行器 HTTP 服务已停止`);
    } catch (error) {
      this.logger.error(
        `HTTP 服务器停止失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 检查服务器是否正在运行
   */
  isRunning(): boolean {
    return this.server !== null;
  }

  /**
   * 获取监听端口
   */
  getPort(): number {
    return this.port;
  }
}

```


> 代码路径  `src\core\interfaces\executor.interface.ts`

```typescript
import { JobHandlerFunction } from '../../schedule.interface';

/**
 * 任务处理器信息
 */
export interface JobHandlerInfo {
  /**
   * 任务名称
   */
  jobName: string;

  /**
   * 任务处理函数
   */
  handler: JobHandlerFunction;

  /**
   * 提供者实例（用于绑定this）
   */
  instance: any;

  /**
   * 方法名称
   */
  methodName: string;
}

/**
 * 运行中的任务信息
 */
export interface RunningJobInfo {
  /**
   * 任务ID
   */
  jobId: number;

  /**
   * 日志ID
   */
  logId: number;

  /**
   * 开始时间
   */
  startTime: number;

  /**
   * 任务上下文
   */
  context: any;

  /**
   * 任务Promise
   */
  promise: Promise<any>;
}

```


> 代码路径  `src\core\interfaces\index.ts`

```typescript
export * from './xxl-job.interface';
export * from './executor.interface';
export * from './registry.interface';

```


> 代码路径  `src\core\interfaces\registry.interface.ts`

```typescript
/**
 * 注册信息
 */
export interface RegistryInfo {
  /**
   * 执行器AppName
   */
  appName: string;

  /**
   * 执行器地址
   */
  address: string;

  /**
   * 执行器IP
   */
  ip: string;

  /**
   * 执行器端口
   */
  port: number;
}

```


> 代码路径  `src\core\interfaces\xxl-job.interface.ts`

```typescript
/**
 * XXL-Job Admin 请求执行器的触发任务请求
 */
export interface XxlJobTriggerRequest {
  /**
   * 任务ID
   */
  jobId: number;

  /**
   * 执行器任务handler名称
   */
  executorHandler: string;

  /**
   * 执行器任务参数
   */
  executorParams?: string;

  /**
   * 阻塞处理策略：
   * - SERIAL_EXECUTION: 单机串行
   * - DISCARD_LATER: 丢弃后续调度
   * - COVER_EARLY: 覆盖之前调度
   */
  executorBlockStrategy?: string;

  /**
   * 任务执行超时时间（秒），0表示不限制
   */
  executorTimeout?: number;

  /**
   * 本次调度日志ID
   */
  logId: number;

  /**
   * 调度时间
   */
  logDateTime: number;

  /**
   * GLUE类型（BEAN、GLUE_GROOVY等）
   */
  glueType?: string;

  /**
   * GLUE源代码
   */
  glueSource?: string;

  /**
   * GLUE更新时间
   */
  glueUpdatetime?: number;

  /**
   * 分片序号（从0开始）
   */
  broadcastIndex?: number;

  /**
   * 分片总数
   */
  broadcastTotal?: number;
}

/**
 * XXL-Job 通用响应
 */
export interface XxlJobResponse<T = any> {
  /**
   * 响应码：200成功，500失败
   */
  code: number;

  /**
   * 响应消息
   */
  msg: string;

  /**
   * 响应内容
   */
  content?: T;
}

/**
 * 任务执行结果回调请求
 */
export interface XxlJobCallbackRequest {
  /**
   * 日志ID
   */
  logId: number;

  /**
   * 日志时间
   */
  logDateTim: number;

  /**
   * 执行结果码：200成功，500失败，502超时
   */
  handleCode: number;

  /**
   * 执行结果消息
   */
  handleMsg?: string;
}

/**
 * 执行器注册请求
 */
export interface XxlJobRegistryRequest {
  /**
   * 注册组：EXECUTOR
   */
  registryGroup: 'EXECUTOR';

  /**
   * 注册key：执行器AppName
   */
  registryKey: string;

  /**
   * 注册value：执行器地址
   */
  registryValue: string;
}

/**
 * 日志查询请求
 */
export interface XxlJobLogRequest {
  /**
   * 日志时间
   */
  logDateTim: number;

  /**
   * 日志ID
   */
  logId: number;

  /**
   * 起始行号
   */
  fromLineNum: number;
}

/**
 * 日志查询响应
 */
export interface XxlJobLogResponse {
  /**
   * 起始行号
   */
  fromLineNum: number;

  /**
   * 结束行号
   */
  toLineNum: number;

  /**
   * 日志内容
   */
  logContent: string;

  /**
   * 是否结束
   */
  isEnd: boolean;
}

/**
 * 终止任务请求
 */
export interface XxlJobKillRequest {
  /**
   * 任务ID
   */
  jobId: number;
}

/**
 * 空闲检测请求
 */
export interface XxlJobIdleBeatRequest {
  /**
   * 任务ID
   */
  jobId: number;
}

```


> 代码路径  `src\core\log\file-logger.ts`

```typescript
import { Logger } from '@nestjs/common';
import { JobLogger } from '../../schedule.interface';
import { LogWriterService } from './log-writer.service';

/**
 * 文件日志记录器
 *
 * 实现 JobLogger 接口，将日志同时输出到控制台和文件
 */
export class FileLogger implements JobLogger {
  private readonly consoleLogger: Logger;

  constructor(
    private readonly logId: number,
    private readonly logDateTime: number,
    private readonly logWriterService: LogWriterService,
  ) {
    this.consoleLogger = new Logger(`Job-${logId}`);
  }

  /**
   * 记录普通日志
   */
  log(message: string, ...args: any[]): void {
    const formatted = this.formatMessage(message, ...args);

    // 1. 输出到控制台
    this.consoleLogger.log(formatted);

    // 2. 异步写入文件（不阻塞）
    setImmediate(() => {
      this.logWriterService
        .writeLog(this.logId, this.logDateTime, 'INFO', formatted)
        .catch((error) => {
          this.consoleLogger.error(`写入日志文件失败: ${error.message}`);
        });
    });
  }

  /**
   * 记录错误日志
   */
  error(message: string, trace?: string, ...args: any[]): void {
    const formatted = this.formatMessage(message, ...args);
    const fullMessage = trace ? `${formatted}\n${trace}` : formatted;

    // 1. 输出到控制台
    this.consoleLogger.error(formatted, trace);

    // 2. 异步写入文件
    setImmediate(() => {
      this.logWriterService
        .writeLog(this.logId, this.logDateTime, 'ERROR', fullMessage)
        .catch((error) => {
          this.consoleLogger.error(`写入日志文件失败: ${error.message}`);
        });
    });
  }

  /**
   * 记录警告日志
   */
  warn(message: string, ...args: any[]): void {
    const formatted = this.formatMessage(message, ...args);

    // 1. 输出到控制台
    this.consoleLogger.warn(formatted);

    // 2. 异步写入文件
    setImmediate(() => {
      this.logWriterService
        .writeLog(this.logId, this.logDateTime, 'WARN', formatted)
        .catch((error) => {
          this.consoleLogger.error(`写入日志文件失败: ${error.message}`);
        });
    });
  }

  /**
   * 记录调试日志
   */
  debug(message: string, ...args: any[]): void {
    const formatted = this.formatMessage(message, ...args);

    // 1. 输出到控制台
    this.consoleLogger.debug(formatted);

    // 2. 异步写入文件
    setImmediate(() => {
      this.logWriterService
        .writeLog(this.logId, this.logDateTime, 'DEBUG', formatted)
        .catch((error) => {
          this.consoleLogger.error(`写入日志文件失败: ${error.message}`);
        });
    });
  }

  /**
   * 格式化消息
   */
  private formatMessage(message: string, ...args: any[]): string {
    if (args.length === 0) {
      return message;
    }

    // 简单的参数替换
    return `${message} ${args.map((arg) => String(arg)).join(' ')}`;
  }
}

```


> 代码路径  `src\core\log\log-cleanup.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { LogFileService } from './log-file.service';

/**
 * 日志清理服务
 *
 * 负责定时清理过期的日志文件
 */
@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;
  private retentionDays = 30; // 默认保留30天
  private cleanupIntervalHours = 24; // 默认每24小时清理一次

  constructor(private readonly logFileService: LogFileService) {}

  /**
   * 启动日志清理服务
   *
   * @param retentionDays 日志保留天数，默认30天
   * @param cleanupIntervalHours 清理间隔（小时），默认24小时
   */
  start(retentionDays = 30, cleanupIntervalHours = 24): void {
    if (this.cleanupTimer) {
      this.logger.warn('日志清理服务已在运行');
      return;
    }

    this.retentionDays = retentionDays;
    this.cleanupIntervalHours = cleanupIntervalHours;

    this.logger.log(
      `日志清理服务已启动，保留天数: ${retentionDays}，清理间隔: ${cleanupIntervalHours}小时`,
    );

    // 立即执行一次清理
    this.cleanup().catch((error) => {
      this.logger.error(
        `日志清理失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    // 设置定时清理
    const intervalMs = cleanupIntervalHours * 60 * 60 * 1000;
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((error) => {
        this.logger.error(
          `日志清理失败: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, intervalMs);
  }

  /**
   * 停止日志清理服务
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.log('日志清理服务已停止');
    }
  }

  /**
   * 执行日志清理
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.debug(`开始清理过期日志，保留天数: ${this.retentionDays}`);

      // 获取过期的日期目录
      const expiredDirs = await this.logFileService.getExpiredLogDirs(
        this.retentionDays,
      );

      if (expiredDirs.length === 0) {
        this.logger.debug('没有过期的日志目录需要清理');
        return;
      }

      this.logger.log(`发现 ${expiredDirs.length} 个过期日志目录需要清理`);

      let deletedCount = 0;
      let failedCount = 0;

      // 删除每个过期目录
      for (const dirPath of expiredDirs) {
        try {
          await this.deleteDirectory(dirPath);
          deletedCount++;
          this.logger.debug(`已删除日志目录: ${dirPath}`);
        } catch (error) {
          failedCount++;
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `删除日志目录失败: ${dirPath}, error=${errorMsg}`,
          );
        }
      }

      this.logger.log(
        `日志清理完成，成功: ${deletedCount}，失败: ${failedCount}`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`日志清理过程失败: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * 递归删除目录及其所有内容
   */
  private async deleteDirectory(dirPath: string): Promise<void> {
    try {
      // 检查目录是否存在
      try {
        await fs.access(dirPath);
      } catch {
        // 目录不存在，直接返回
        return;
      }

      // 读取目录内容
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // 删除所有文件和子目录
      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归删除子目录
          await this.deleteDirectory(fullPath);
        } else {
          // 删除文件
          await fs.unlink(fullPath);
        }
      }

      // 删除空目录
      await fs.rmdir(dirPath);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`删除目录失败: ${dirPath}, ${errorMsg}`);
    }
  }

  /**
   * 检查清理服务是否正在运行
   */
  isRunning(): boolean {
    return this.cleanupTimer !== null;
  }

  /**
   * 获取当前配置
   */
  getConfig(): { retentionDays: number; cleanupIntervalHours: number } {
    return {
      retentionDays: this.retentionDays,
      cleanupIntervalHours: this.cleanupIntervalHours,
    };
  }
}

```


> 代码路径  `src\core\log\log-file.service.ts`

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { SCHEDULE_MODULE_OPTIONS } from '../../schedule.constants';
import { ScheduleModuleOptions } from '../../schedule.interface';

/**
 * 日志文件管理服务
 *
 * 负责日志文件路径生成、目录创建、文件存在性检查
 */
@Injectable()
export class LogFileService {
  private readonly logger = new Logger(LogFileService.name);
  private readonly logPath: string;

  constructor(
    @Inject(SCHEDULE_MODULE_OPTIONS)
    private readonly options: ScheduleModuleOptions,
  ) {
    this.logPath = options.logPath || './logs/xxl-job';
  }

  /**
   * 生成日志文件完整路径
   *
   * @param logId 日志ID
   * @param logDateTime 日志时间（时间戳）
   * @returns 日志文件路径，格式：{logPath}/{yyyy-MM-dd}/{logId}.log
   */
  getLogFilePath(logId: number, logDateTime: number): string {
    const dateDir = this.formatDateDir(logDateTime);
    return path.join(this.logPath, dateDir, `${logId}.log`);
  }

  /**
   * 确保日期目录存在
   *
   * @param logDateTime 日志时间（时间戳）
   * @returns 日期目录路径
   */
  async ensureLogDirectory(logDateTime: number): Promise<string> {
    const dateDir = this.formatDateDir(logDateTime);
    const dirPath = path.join(this.logPath, dateDir);

    try {
      await fs.mkdir(dirPath, { recursive: true });
      return dirPath;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`创建日志目录失败: ${dirPath}, error=${errorMsg}`);
      throw error;
    }
  }

  /**
   * 检查日志文件是否存在
   *
   * @param logId 日志ID
   * @param logDateTime 日志时间（时间戳）
   * @returns 文件是否存在
   */
  async checkLogFileExists(
    logId: number,
    logDateTime: number,
  ): Promise<boolean> {
    const filePath = this.getLogFilePath(logId, logDateTime);

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取过期日志目录列表
   *
   * @param retentionDays 日志保留天数
   * @returns 过期的日期目录列表
   */
  async getExpiredLogDirs(retentionDays: number): Promise<string[]> {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - retentionDays);
    expiredDate.setHours(0, 0, 0, 0);

    try {
      // 检查日志根目录是否存在
      try {
        await fs.access(this.logPath);
      } catch {
        // 目录不存在，返回空数组
        return [];
      }

      const dirs = await fs.readdir(this.logPath);
      const expiredDirs: string[] = [];

      for (const dir of dirs) {
        // 检查是否是日期格式的目录（yyyy-MM-dd）
        if (!this.isDateDir(dir)) {
          continue;
        }

        const dirDate = this.parseDateDir(dir);
        if (dirDate < expiredDate) {
          expiredDirs.push(path.join(this.logPath, dir));
        }
      }

      return expiredDirs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `获取过期日志目录失败: logPath=${this.logPath}, error=${errorMsg}`,
      );
      return [];
    }
  }

  /**
   * 格式化日期为目录名（yyyy-MM-dd）
   *
   * @param timestamp 时间戳
   * @returns 格式化的日期字符串
   */
  private formatDateDir(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 解析日期目录名为 Date 对象
   *
   * @param dateDir 日期目录名（yyyy-MM-dd）
   * @returns Date 对象
   */
  private parseDateDir(dateDir: string): Date {
    const [year, month, day] = dateDir.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * 检查目录名是否是日期格式（yyyy-MM-dd）
   *
   * @param dirName 目录名
   * @returns 是否是日期格式
   */
  private isDateDir(dirName: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(dirName);
  }
}

```


> 代码路径  `src\core\log\log-reader.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { LogFileService } from './log-file.service';
import { JobExecutorService } from '../executor/job-executor.service';

/**
 * 日志读取结果
 */
export interface LogReadResult {
  fromLineNum: number;
  toLineNum: number;
  logContent: string;
  isEnd: boolean;
}

/**
 * 日志读取服务
 *
 * 负责实现基于行号的增量日志读取
 */
@Injectable()
export class LogReaderService {
  private readonly logger = new Logger(LogReaderService.name);

  constructor(
    private readonly logFileService: LogFileService,
    private readonly jobExecutorService: JobExecutorService,
  ) {}

  /**
   * 读取日志（增量读取）
   *
   * @param logId 日志ID
   * @param logDateTime 日志时间
   * @param fromLineNum 起始行号（从1开始）
   * @returns 日志读取结果
   */
  async readLog(
    logId: number,
    logDateTime: number,
    fromLineNum: number,
  ): Promise<LogReadResult> {
    this.logger.debug(
      `读取日志: logId=${logId}, fromLineNum=${fromLineNum}`,
    );

    // 1. 判断任务是否完成（通过logId查找jobId）
    const jobId = this.jobExecutorService.getJobIdByLogId(logId);
    const isEnd = jobId === undefined; // 找不到说明任务已完成

    // 2. 检查日志文件是否存在
    const fileExists = await this.logFileService.checkLogFileExists(
      logId,
      logDateTime,
    );

    if (!fileExists) {
      this.logger.debug(
        `日志文件不存在: logId=${logId}, isEnd=${isEnd}`,
      );

      return {
        fromLineNum,
        toLineNum: 0,
        logContent: '',
        isEnd,
      };
    }

    // 3. 读取日志文件内容
    const filePath = this.logFileService.getLogFilePath(logId, logDateTime);

    try {
      const logLines: string[] = [];
      let currentLineNum = 0;
      let toLineNum = 0; // 初始化为 0，而不是 fromLineNum

      // 使用 readline 逐行读取
      const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity, // 处理 \r\n 和 \n
      });

      for await (const line of rl) {
        currentLineNum++;
        toLineNum = currentLineNum; // 始终更新为当前实际行号

        // 只收集 >= fromLineNum 的行
        if (currentLineNum >= fromLineNum) {
          logLines.push(line);
        }
      }

      // 4. 拼接日志内容（每行以 \n 结尾）
      const logContent =
        logLines.length > 0 ? logLines.join('\n') + '\n' : '';

      this.logger.debug(
        `日志读取完成: logId=${logId}, fromLine=${fromLineNum}, toLine=${toLineNum}, newLines=${logLines.length}, isEnd=${isEnd}`,
      );

      return {
        fromLineNum,
        toLineNum,
        logContent,
        isEnd,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `读取日志文件失败: logId=${logId}, error=${errorMsg}`,
        error instanceof Error ? error.stack : undefined,
      );

      // 读取失败时返回空内容，但保持isEnd状态
      return {
        fromLineNum,
        toLineNum: 0,
        logContent: '',
        isEnd,
      };
    }
  }
}

```


> 代码路径  `src\core\log\log-writer.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { createWriteStream, WriteStream } from 'fs';
import { JobLogger } from '../../schedule.interface';
import { LogFileService } from './log-file.service';
import { FileLogger } from './file-logger';

/**
 * 日志写入队列项
 */
interface LogQueueItem {
  level: string;
  message: string;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * 日志写入服务
 *
 * 负责管理日志文件写入流、创建文件日志记录器
 */
@Injectable()
export class LogWriterService {
  private readonly logger = new Logger(LogWriterService.name);

  // 日志文件流映射: logId -> WriteStream
  private readonly logStreams = new Map<number, WriteStream>();

  // 日志写入队列: logId -> LogQueueItem[]
  private readonly logQueues = new Map<number, LogQueueItem[]>();

  // 写入处理中标记: logId -> boolean
  private readonly processing = new Map<number, boolean>();

  constructor(private readonly logFileService: LogFileService) {}

  /**
   * 创建文件日志记录器
   *
   * @param logId 日志ID
   * @param logDateTime 日志时间
   * @returns JobLogger 实例
   */
  createFileLogger(logId: number, logDateTime: number): JobLogger {
    // 初始化日志流（惰性创建）
    this.initLogStream(logId, logDateTime);

    return new FileLogger(logId, logDateTime, this);
  }

  /**
   * 写入日志内容到文件
   *
   * @param logId 日志ID
   * @param logDateTime 日志时间
   * @param level 日志级别
   * @param message 日志消息
   */
  async writeLog(
    logId: number,
    logDateTime: number,
    level: string,
    message: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // 添加到队列
      const queue = this.getOrCreateQueue(logId);
      queue.push({ level, message, resolve, reject });

      // 触发处理
      this.processQueue(logId, logDateTime);
    });
  }

  /**
   * 关闭指定日志文件流
   *
   * @param logId 日志ID
   */
  async closeLogFile(logId: number): Promise<void> {
    // 等待队列处理完成
    await this.waitQueueEmpty(logId);

    const stream = this.logStreams.get(logId);
    if (stream) {
      await new Promise<void>((resolve, reject) => {
        stream.end((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      this.logStreams.delete(logId);
      this.logQueues.delete(logId);
      this.processing.delete(logId);

      this.logger.debug(`日志文件流已关闭: logId=${logId}`);
    }
  }

  /**
   * 关闭所有日志文件流
   */
  async closeAllLogFiles(): Promise<void> {
    const logIds = Array.from(this.logStreams.keys());
    await Promise.all(logIds.map((logId) => this.closeLogFile(logId)));
    this.logger.log(`所有日志文件流已关闭，共 ${logIds.length} 个`);
  }

  /**
   * 初始化日志流（惰性创建）
   */
  private async initLogStream(
    logId: number,
    logDateTime: number,
  ): Promise<void> {
    if (this.logStreams.has(logId)) {
      return;
    }

    try {
      // 确保日志目录存在
      await this.logFileService.ensureLogDirectory(logDateTime);

      // 获取日志文件路径
      const logFilePath = this.logFileService.getLogFilePath(
        logId,
        logDateTime,
      );

      // 创建写入流（追加模式）
      const stream = createWriteStream(logFilePath, {
        flags: 'a',
        encoding: 'utf-8',
      });

      stream.on('error', (error) => {
        this.logger.error(
          `日志文件流错误: logId=${logId}, error=${error.message}`,
        );
      });

      this.logStreams.set(logId, stream);
      this.logger.debug(`日志文件流已创建: logId=${logId}, path=${logFilePath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `创建日志文件流失败: logId=${logId}, error=${errorMsg}`,
      );
      throw error;
    }
  }

  /**
   * 获取或创建日志队列
   */
  private getOrCreateQueue(logId: number): LogQueueItem[] {
    if (!this.logQueues.has(logId)) {
      this.logQueues.set(logId, []);
    }
    return this.logQueues.get(logId)!;
  }

  /**
   * 处理日志写入队列
   */
  private async processQueue(
    logId: number,
    logDateTime: number,
  ): Promise<void> {
    // 如果正在处理，直接返回
    if (this.processing.get(logId)) {
      return;
    }

    this.processing.set(logId, true);

    try {
      const queue = this.getOrCreateQueue(logId);

      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        try {
          await this.doWriteLog(logId, logDateTime, item.level, item.message);
          item.resolve();
        } catch (error) {
          item.reject(error as Error);
        }
      }
    } finally {
      this.processing.set(logId, false);
    }
  }

  /**
   * 执行实际的日志写入
   */
  private async doWriteLog(
    logId: number,
    logDateTime: number,
    level: string,
    message: string,
  ): Promise<void> {
    // 确保日志流已初始化
    if (!this.logStreams.has(logId)) {
      await this.initLogStream(logId, logDateTime);
    }

    const stream = this.logStreams.get(logId);
    if (!stream) {
      throw new Error(`日志文件流不存在: logId=${logId}`);
    }

    // 格式化日志行：[2025-11-18 14:30:45] [INFO] 消息内容
    const timestamp = this.formatTimestamp(new Date());
    const logLine = `[${timestamp}] [${level}] ${message}\n`;

    // 写入文件
    return new Promise((resolve, reject) => {
      stream.write(logLine, 'utf-8', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 等待队列为空
   */
  private async waitQueueEmpty(logId: number): Promise<void> {
    const queue = this.logQueues.get(logId);
    if (!queue || queue.length === 0) {
      return;
    }

    // 最多等待5秒
    const timeout = 5000;
    const startTime = Date.now();

    while (queue.length > 0 && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (queue.length > 0) {
      this.logger.warn(
        `等待日志队列清空超时: logId=${logId}, remaining=${queue.length}`,
      );
    }
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
}

```


> 代码路径  `src\core\metrics\metrics.interface.ts`

```typescript
/**
 * 任务指标信息
 */
export interface JobMetrics {
  /**
   * 任务名称
   */
  jobName: string;

  /**
   * 执行次数
   */
  executionCount: number;

  /**
   * 成功次数
   */
  successCount: number;

  /**
   * 失败次数
   */
  failureCount: number;

  /**
   * 超时次数
   */
  timeoutCount: number;

  /**
   * 总耗时（毫秒）
   */
  totalDuration: number;

  /**
   * 平均耗时（毫秒）
   */
  averageDuration: number;

  /**
   * 最小耗时（毫秒）
   */
  minDuration: number;

  /**
   * 最大耗时（毫秒）
   */
  maxDuration: number;

  /**
   * 最后执行时间
   */
  lastExecutionTime: number;

  /**
   * 最后执行状态（success | failure | timeout）
   */
  lastExecutionStatus: 'success' | 'failure' | 'timeout';
}

/**
 * 执行器指标信息
 */
export interface ExecutorMetrics {
  /**
   * 当前运行中的任务数
   */
  runningJobCount: number;

  /**
   * 已注册的任务处理器数量
   */
  registeredHandlerCount: number;

  /**
   * 执行器启动时间
   */
  startTime: number;

  /**
   * 执行器运行时长（毫秒）
   */
  uptime: number;

  /**
   * 任务指标列表
   */
  jobMetrics: JobMetrics[];
}

```


> 代码路径  `src\core\metrics\metrics.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { JobMetrics, ExecutorMetrics } from './metrics.interface';

/**
 * 监控指标收集服务
 *
 * 负责收集和统计任务执行指标
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly jobMetricsMap = new Map<string, JobMetrics>();
  private readonly startTime: number = Date.now();
  private runningJobCount = 0;
  private registeredHandlerCount = 0;

  /**
   * 记录任务开始执行
   */
  recordJobStart(jobName: string): void {
    this.runningJobCount++;
    this.ensureJobMetrics(jobName);
  }

  /**
   * 记录任务执行成功
   */
  recordJobSuccess(jobName: string, duration: number): void {
    this.runningJobCount--;

    const metrics = this.ensureJobMetrics(jobName);
    metrics.executionCount++;
    metrics.successCount++;
    metrics.totalDuration += duration;
    metrics.lastExecutionTime = Date.now();
    metrics.lastExecutionStatus = 'success';

    this.updateDurationStats(metrics, duration);

    this.logger.debug(`任务 ${jobName} 执行成功，耗时: ${duration}ms`);
  }

  /**
   * 记录任务执行失败
   */
  recordJobFailure(jobName: string, duration: number): void {
    this.runningJobCount--;

    const metrics = this.ensureJobMetrics(jobName);
    metrics.executionCount++;
    metrics.failureCount++;
    metrics.totalDuration += duration;
    metrics.lastExecutionTime = Date.now();
    metrics.lastExecutionStatus = 'failure';

    this.updateDurationStats(metrics, duration);

    this.logger.debug(`任务 ${jobName} 执行失败，耗时: ${duration}ms`);
  }

  /**
   * 记录任务执行超时
   */
  recordJobTimeout(jobName: string, duration: number): void {
    this.runningJobCount--;

    const metrics = this.ensureJobMetrics(jobName);
    metrics.executionCount++;
    metrics.timeoutCount++;
    metrics.totalDuration += duration;
    metrics.lastExecutionTime = Date.now();
    metrics.lastExecutionStatus = 'timeout';

    this.updateDurationStats(metrics, duration);

    this.logger.debug(`任务 ${jobName} 执行超时，耗时: ${duration}ms`);
  }

  /**
   * 设置已注册的任务处理器数量
   */
  setRegisteredHandlerCount(count: number): void {
    this.registeredHandlerCount = count;
  }

  /**
   * 获取任务指标
   */
  getJobMetrics(jobName: string): JobMetrics | undefined {
    return this.jobMetricsMap.get(jobName);
  }

  /**
   * 获取所有任务指标
   */
  getAllJobMetrics(): JobMetrics[] {
    return Array.from(this.jobMetricsMap.values());
  }

  /**
   * 获取执行器指标
   */
  getExecutorMetrics(): ExecutorMetrics {
    return {
      runningJobCount: this.runningJobCount,
      registeredHandlerCount: this.registeredHandlerCount,
      startTime: this.startTime,
      uptime: Date.now() - this.startTime,
      jobMetrics: this.getAllJobMetrics(),
    };
  }

  /**
   * 清空指标
   */
  clear(): void {
    this.jobMetricsMap.clear();
    this.runningJobCount = 0;
    this.logger.log('指标已清空');
  }

  /**
   * 确保任务指标存在
   */
  private ensureJobMetrics(jobName: string): JobMetrics {
    let metrics = this.jobMetricsMap.get(jobName);

    if (!metrics) {
      metrics = {
        jobName,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Number.MAX_SAFE_INTEGER,
        maxDuration: 0,
        lastExecutionTime: 0,
        lastExecutionStatus: 'success',
      };
      this.jobMetricsMap.set(jobName, metrics);
    }

    return metrics;
  }

  /**
   * 更新耗时统计
   */
  private updateDurationStats(metrics: JobMetrics, duration: number): void {
    // 更新最小值
    if (duration < metrics.minDuration) {
      metrics.minDuration = duration;
    }

    // 更新最大值
    if (duration > metrics.maxDuration) {
      metrics.maxDuration = duration;
    }

    // 更新平均值
    metrics.averageDuration = metrics.totalDuration / metrics.executionCount;
  }
}

```


> 代码路径  `src\core\registry\heartbeat.service.ts`

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import { SCHEDULE_MODULE_OPTIONS } from '../../schedule.constants';
import { ScheduleModuleOptions } from '../../schedule.interface';
import { RegistryService } from './registry.service';
import { RegistryInfo } from '../interfaces';

/**
 * 心跳服务
 *
 * 负责定时向 XXL-Job Admin 发送心跳，保持执行器在线状态
 * XXL-Job 的心跳机制：定时重复调用注册接口
 */
@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    @Inject(SCHEDULE_MODULE_OPTIONS)
    private readonly options: ScheduleModuleOptions,
    private readonly registryService: RegistryService,
  ) {}

  /**
   * 启动心跳
   */
  start(registryInfo: RegistryInfo): void {
    if (this.isRunning) {
      this.logger.warn('心跳服务已在运行');
      return;
    }

    const interval = this.options.heartbeatInterval || 30000; // 默认30秒

    this.isRunning = true;

    // 立即发送一次心跳
    this.sendHeartbeat(registryInfo);

    // 启动定时心跳
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(registryInfo);
    }, interval);

    this.logger.verbose(`心跳服务已启动，间隔: ${interval}ms`);
  }

  /**
   * 停止心跳
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('心跳服务未在运行');
      return;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.isRunning = false;
    this.logger.log('心跳服务已停止');
  }

  /**
   * 发送心跳（实际上是重复调用注册接口）
   */
  private async sendHeartbeat(registryInfo: RegistryInfo): Promise<void> {
    try {
      await this.registryService.registry(registryInfo);
      this.logger.debug('心跳发送成功');
    } catch (error) {
      this.logger.error(
        `心跳发送失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 检查心跳是否正在运行
   */
  isHeartbeatRunning(): boolean {
    return this.isRunning;
  }
}

```


> 代码路径  `src\core\registry\registry.service.ts`

```typescript
import { Injectable, Logger, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { SCHEDULE_MODULE_OPTIONS } from '../../schedule.constants';
import { ScheduleModuleOptions } from '../../schedule.interface';
import {
  RegistryInfo,
  XxlJobRegistryRequest,
  XxlJobResponse,
} from '../interfaces';

/**
 * 注册服务
 *
 * 负责向 XXL-Job Admin 注册和注销执行器
 */
@Injectable()
export class RegistryService {
  private readonly logger = new Logger(RegistryService.name);
  private readonly httpClient: AxiosInstance;
  private registryInfo: RegistryInfo | null = null;

  constructor(
    @Inject(SCHEDULE_MODULE_OPTIONS)
    private readonly options: ScheduleModuleOptions,
  ) {
    // 创建 HTTP 客户端
    this.httpClient = axios.create({
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 如果配置了 accessToken，添加到请求头
    if (this.options.accessToken) {
      this.httpClient.defaults.headers.common['XXL-JOB-ACCESS-TOKEN'] =
        this.options.accessToken;
    }
  }

  /**
   * 注册执行器
   */
  async registry(registryInfo: RegistryInfo): Promise<boolean> {
    this.registryInfo = registryInfo;

    const request: XxlJobRegistryRequest = {
      registryGroup: 'EXECUTOR',
      registryKey: registryInfo.appName,
      registryValue: registryInfo.address,
    };

    // 向所有配置的 Admin 地址发送注册请求
    const promises = this.options.adminAddresses.map(async (adminAddress) => {
      try {
        const url = `${adminAddress}/api/registry`;
        const response = await this.httpClient.post<XxlJobResponse>(
          url,
          request,
        );

        if (response.data.code === 200) {
          this.logger.debug(
            `向 ${adminAddress} 注册执行器成功: ${registryInfo.address}`,
          );
          return true;
        } else {
          this.logger.error(
            `向 ${adminAddress} 注册执行器失败: ${response.data.msg}`,
          );
          return false;
        }
      } catch (error) {
        this.logger.error(
          `向 ${adminAddress} 注册执行器失败: ${error instanceof Error ? error.message : String(error)}`,
        );
        return false;
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r).length;

    this.logger.debug(
      `注册执行器完成: 成功 ${successCount}/${this.options.adminAddresses.length}`,
    );

    return successCount > 0;
  }

  /**
   * 注销执行器
   */
  async registryRemove(): Promise<boolean> {
    if (!this.registryInfo) {
      this.logger.warn('执行器未注册，无需注销');
      return true;
    }

    const request: XxlJobRegistryRequest = {
      registryGroup: 'EXECUTOR',
      registryKey: this.registryInfo.appName,
      registryValue: this.registryInfo.address,
    };

    // 向所有配置的 Admin 地址发送注销请求
    const promises = this.options.adminAddresses.map(async (adminAddress) => {
      try {
        const url = `${adminAddress}/api/registryRemove`;
        const response = await this.httpClient.post<XxlJobResponse>(
          url,
          request,
        );

        if (response.data.code === 200) {
          this.logger.debug(`向 ${adminAddress} 注销执行器成功`);
          return true;
        } else {
          this.logger.error(
            `向 ${adminAddress} 注销执行器失败: ${response.data.msg}`,
          );
          return false;
        }
      } catch (error) {
        this.logger.error(
          `向 ${adminAddress} 注销执行器失败: ${error instanceof Error ? error.message : String(error)}`,
        );
        return false;
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r).length;

    this.logger.debug(
      `注销执行器完成: 成功 ${successCount}/${this.options.adminAddresses.length}`,
    );

    this.registryInfo = null;
    return successCount > 0;
  }

  /**
   * 回调任务执行结果
   */
  async callback(callbackRequests: any[]): Promise<boolean> {
    if (callbackRequests.length === 0) {
      return true;
    }

    // 向所有配置的 Admin 地址发送回调请求
    const promises = this.options.adminAddresses.map(async (adminAddress) => {
      try {
        const url = `${adminAddress}/api/callback`;
        const response = await this.httpClient.post<XxlJobResponse>(
          url,
          callbackRequests,
        );

        if (response.data.code === 200) {
          this.logger.debug(`向 ${adminAddress} 回调任务结果成功`);
          return true;
        } else {
          this.logger.error(
            `向 ${adminAddress} 回调任务结果失败: ${response.data.msg}`,
          );
          return false;
        }
      } catch (error) {
        this.logger.error(
          `向 ${adminAddress} 回调任务结果失败: ${error instanceof Error ? error.message : String(error)}`,
        );
        return false;
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r).length;

    return successCount > 0;
  }

  /**
   * 获取注册信息
   */
  getRegistryInfo(): RegistryInfo | null {
    return this.registryInfo;
  }
}

```


#### 代码说明

# @cs/nest-schedule

基于 XXL-Job 的 NestJS 分布式定时任务执行器。

## 安装

```bash
pnpm add @cs/nest-schedule
```

## 快速开始

### 1. 导入模块

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@cs/nest-schedule';
import { ConfigModule, ConfigService } from '@cs/nest-config';

@Module({
  imports: [
    ScheduleModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const schedule = config.get('schedule');
        return schedule;
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 2. 定义任务处理器

```typescript
import { Injectable } from '@nestjs/common';
import { JobHandler, JobContext } from '@cs/nest-schedule';

@Injectable()
export class TaskService {
  // 简单任务
  @JobHandler('demoJob')
  async handleDemoJob(context: JobContext) {
    const { logger, params } = context;

    logger.log(`执行任务，参数：${params}`);

    // 业务逻辑
    await this.doSomething();
    return { success: true, message: '执行成功' };
  }

  // 分片广播任务
  @JobHandler('shardingJob')
  async handleShardingJob(context: JobContext) {
    const { logger, shardIndex, shardTotal, params } = context;

    logger.log(`执行分片任务 ${shardIndex}/${shardTotal}`);

    // 根据分片处理数据
    const items = await this.getItems();
    const myItems = items.filter((_, i) => i % shardTotal === shardIndex);

    for (const item of myItems) {
      // 检查任务是否被终止
      if (context.isKilled()) {
        throw new Error('任务被终止');
      }

      await this.processItem(item);
    }
    logger.log(`分片任务完成，处理了 ${myItems.length} 条数据`);
  }

  private async doSomething() {
    // 业务逻辑
  }

  private async getItems() {
    // 获取数据
    return [];
  }

  private async processItem(item: any) {
    // 处理数据
  }
}
```

### 3. 配置文件

```yaml
# config/default.yaml
xxlJob:
  adminAddresses:
    - http://localhost:8080/xxl-job-admin
  appName: my-executor
  port: 9999
  accessToken: default_token
  logPath: './logs/xxl-job'
  logRetentionDays: 30
  logCleanupIntervalHours: 24
  enableAutoRegistry: true
  heartbeatInterval: 30000
  enableMetrics: true
```

## 配置选项

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `adminAddresses` | `string[]` | 是 | - | XXL-Job Admin 地址列表 |
| `appName` | `string` | 是 | - | 执行器名称（唯一标识） |
| `port` | `number` | 否 | `9999` | 执行器监听端口 |
| `ip` | `string` | 否 | 自动获取 | 执行器IP地址 |
| `address` | `string` | 否 | 自动生成 | 执行器完整地址 |
| `accessToken` | `string` | 否 | - | 访问令牌 |
| `logPath` | `string` | 否 | `./logs/xxl-job` | 日志存储路径 |
| `logRetentionDays` | `number` | 否 | `30` | 日志保留天数 |
| `logCleanupIntervalHours` | `number` | 否 | `24` | 日志清除间隔 |
| `enableAutoRegistry` | `boolean` | 否 | `true` | 是否自动注册 |
| `heartbeatInterval` | `number` | 否 | `30000` | 心跳间隔（毫秒） |
| `enableMetrics` | `boolean` | 否 | `true` | 是否启用监控指标 |

## API

### JobContext

任务执行上下文对象，提供以下属性和方法：

```typescript
interface JobContext {
  /** 任务日志记录器 */
  logger: JobLogger;

  /** 任务参数 */
  params?: string;

  /** 分片索引（从0开始） */
  shardIndex?: number;

  /** 分片总数 */
  shardTotal?: number;

  /** 任务ID */
  jobId: number;

  /** 日志ID */
  logId: number;

  /** 日志时间 */
  logDateTime: number;

  /** 执行超时时间（秒） */
  executorTimeout: number;

  /** 检查任务是否已被终止 */
  isKilled(): boolean;
}
```

### JobLogger

任务日志记录器，提供以下方法：

```typescript
interface JobLogger {
  log(message: string, ...args: any[]): void;
  error(message: string, trace?: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
```

### ScheduleService

核心服务，提供以下方法：

```typescript
class ScheduleService {
  /** 获取执行器指标 */
  getMetrics(): ExecutorMetrics;

  /** 获取已注册的任务列表 */
  getJobHandlers(): string[];
}
```

## 使用示例

### 处理长时间运行的任务

```typescript
@JobHandler('longRunningJob')
async handleLongRunningJob(context: JobContext) {
  const { logger, isKilled } = context;

  for (let i = 0; i < 1000; i++) {
    // 定期检查任务是否被终止
    if (isKilled()) {
      logger.warn('任务被终止');
      throw new Error('任务被终止');
    }

    await this.processItem(i);
    logger.log(`处理进度: ${i + 1}/1000`);
  }
}
```

### 使用任务参数

```typescript
@JobHandler('paramJob')
async handleParamJob(context: JobContext) {
  const { logger, params } = context;

  // 解析参数（JSON格式）
  const config = JSON.parse(params || '{}');

  logger.log(`任务参数: ${JSON.stringify(config)}`);

  // 使用参数执行业务逻辑
  await this.execute(config);
}
```

### 分片广播任务

```typescript
@JobHandler('shardingJob')
async handleShardingJob(context: JobContext) {
  const { logger, shardIndex, shardTotal } = context;

  // 获取所有数据
  const allData = await this.getAllData();

  // 根据分片索引过滤出当前执行器需要处理的数据
  const myData = allData.filter((item, index) => {
    return index % shardTotal === shardIndex;
  });

  logger.log(`分片 ${shardIndex}/${shardTotal} 需要处理 ${myData.length} 条数据`);

  // 处理数据
  for (const item of myData) {
    await this.processItem(item);
  }
}
```



