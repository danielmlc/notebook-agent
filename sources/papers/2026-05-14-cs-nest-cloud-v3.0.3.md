---
title: "@cs/nest-cloud · 源码整理 v3.0.3"
type: source
aliases: ["@cs/nest-cloud 源码", "nest-cloud source", "cs-nest-cloud-source"]
tags: [nestjs, mwp, package, rpc, json-rpc, microservice, istio, graceful-shutdown]
status: stable
version: "3.0.3"
supersedes: "[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-cloud.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-cloud · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：3.0.3
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-cloud代码库源码整理

#### 代码目录
```
@cs/nest-cloud/
├── src/
├── components/
│   ├── decorator/
│   │   ├── index.ts
│   │   └── interceptor.decorator.ts
│   ├── filter/
│   │   └── exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── middleware/
│   │   ├── context.middleware.ts
│   │   └── proxy.middleware.ts
│   ├── graceful-shutdown.service.ts
│   └── index.ts
├── http/
│   ├── http.constants.ts
│   ├── http.interface.ts
│   ├── http.module.ts
│   ├── http.service.ts
│   └── index.ts
├── rpc/
│   ├── json-rpc/
│   │   ├── client.ts
│   │   ├── rpc-error-transformer.ts
│   │   ├── rpc-helpers.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── index.ts
│   ├── rpc.client.ts
│   ├── rpc.controller.ts
│   ├── rpc.decorators.ts
│   ├── rpc.errors.ts
│   ├── rpc.interface.ts
│   ├── rpc.module.ts
│   └── rpc.registry.ts
├── setup/
│   ├── bodyParser.setup.ts
│   ├── filter.setup.ts
│   ├── health.setup.ts
│   ├── index.ts
│   ├── interceptors.setup.ts
│   ├── logger.setup.ts
│   ├── middleware.setup.ts
│   ├── pipes.setup.ts
│   ├── setup.interface.ts
│   ├── started.setup.ts
│   └── swagger.setup.ts
├── app.bootstrap.ts
├── base.metadata.ts
└── index.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-cloud",
  "version": "3.0.3",
  "description": "服务启动 注册 跨服务相关包",
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
    "body-parser": "^1.20.3",
    "cookie-parser": "^1.4.7",
    "nacos": "^2.6.0",
    "http-proxy-middleware": "^3.0.3"
  },
  "devDependencies": {
    "@types/http-proxy-middleware": "^1.0.0"
  },
  "peerDependencies": {
    "@cs/nest-common": "workspace:^",
    "@cs/nest-config": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    },
    "@cs/nest-config": {
      "optional": false
    }
  }
}
```


> 代码路径  `src\app.bootstrap.ts`

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@cs/nest-config';
import { LoggerService } from '@cs/nest-common';
import { configStrategyList } from './setup';
import { GracefulShutdownService } from './components';

type AsyncFunction = (app: any, config: ConfigService) => Promise<any>;

export async function bootstrap(
  rootModule: any, // 加载根模块
  appStartedCall?: AsyncFunction, // 启动中间回调
) {
  // 初始化应用对象
  const app = await NestFactory.create<NestExpressApplication>(rootModule, {
    bufferLogs: true,
  });

  // 启用 NestJS 生命周期钩子（支持优雅停机：SIGTERM/SIGINT → BeforeApplicationShutdown → OnModuleDestroy → app.close()）
  app.enableShutdownHooks();

  // 获取配置 根据配置加载对象
  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  // 根据配置策略按顺序启动相关设置
  for (const { strategy } of configStrategyList) {
    const instance = new strategy(app, configService);
    await instance.execute();
  }

  // 启动回调函数
  if (appStartedCall) {
    await appStartedCall(app, configService);
  }

  // 诊断日志：确认 SIGTERM/SIGINT 信号是否到达 Node.js 进程（若 npm 未透传则此处不会打印）
  process.once('SIGTERM', () => {
    logger.log('[Bootstrap] 收到 SIGTERM 信号，NestJS 优雅停机流程接管中...');
  });
  process.once('SIGINT', () => {
    logger.log('[Bootstrap] 收到 SIGINT 信号，NestJS 优雅停机流程接管中...');
  });

  // 注册兜底信号处理：防止 enableShutdownHooks 未生效时进程直接退出
  try {
    const shutdownService = app.get(GracefulShutdownService);
    shutdownService.registerFallbackSignalHandlers(app);
  } catch {
    // GracefulShutdownService 未注册时跳过（非强依赖）
  }

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('捕获到未处理的Promise Rejection!', { reason, promise });
    // logger.error('程序因 unhandledRejection 即将退出...');
    // process.exit(1);
  });

  process.on('uncaughtException', (err, origin) => {
    logger.error('捕获到未处理的同步异常!', { err, origin });
    // logger.error('程序因 uncaughtException 即将退出...');
    // process.exit(1);
  });
}

```


> 代码路径  `src\base.metadata.ts`

```typescript
import { Module, ModuleMetadata, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigOptions } from '@cs/nest-config';
import { LoggerModule, ContextModule } from '@cs/nest-common';
import { RpcModule } from './rpc/rpc.module';
import { HttpModule } from './http/http.module';
import { GracefulShutdownService } from './components/graceful-shutdown.service';

export interface CSModuleOptions {
  /** 是否启用 RPC 模块，默认为 true */
  enableRpc?: boolean;
  /** 是否启用 HTTP 模块，默认为 true */
  enableHttp?: boolean;
}

export function CSModule (
  sharedMetaData: ModuleMetadata,
  configOption?: ConfigOptions,
  options?: CSModuleOptions,
): ClassDecorator {
  const { enableRpc = true, enableHttp = true } = options || {};

  // 基础模块（所有服务都需要）
  const imports: Array<DynamicModule | any> = [
    ConfigModule.forRoot(
      Object.assign(
        {
          configFilePath: './dist/config.yaml',
          onlyLocal: false,
          configFrom: 'gitea',
        },
        configOption || {},
      ),
      true,
    ),
    ContextModule.forRoot({
      enableCaching: true,
      cacheTTL: -1,
    }),
    LoggerModule.forRootAsync(
      {
        inject: [ConfigService],
        useFactory: async (config: ConfigService) => {
          return {
            ...config.get('logger'),
          };
        },
      },
      true,
    ),
  ];

  const exports: Array<any> = [LoggerModule, ConfigModule, ContextModule];

  // 按需加载 RPC 模块
  if (enableRpc) {
    imports.push(
      RpcModule.forRootAsync(
        {
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            return {
              ...config.get('rpc'),
            };
          },
        },
        true,
      ),
    );
    exports.push(RpcModule);
  }

  // 按需加载 HTTP 模块
  if (enableHttp) {
    imports.push(
      HttpModule.forRegisterAsync(
        {
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            return {
              ...config.get('http'),
            };
          },
        },
        true,
      ),
    );
    exports.push(HttpModule);
  }

  const metadata: ModuleMetadata = {
    imports,
    providers: [GracefulShutdownService],
    controllers: [],
    exports,
  };

  for (const key in sharedMetaData) {
    metadata[key].push(...sharedMetaData[key]);
  }
  // 调用原始 @Module 装饰器，并返回其结果
  return Module(metadata);
}

```


> 代码路径  `src\index.ts`

```typescript
export * from './base.metadata';
export * from './app.bootstrap';
export * from './components';
export * from './rpc';
export * from './http';

```


> 代码路径  `src\components\graceful-shutdown.service.ts`

```typescript
import {
  Injectable,
  BeforeApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@cs/nest-config';
import { LoggerService } from '@cs/nest-common';

@Injectable()
export class GracefulShutdownService implements BeforeApplicationShutdown {
  private readonly logger = new LoggerService('GracefulShutdown');
  private shuttingDown = false;
  private shutdownInProgress = false;

  constructor(@Optional() private readonly configService?: ConfigService) { }

  /**
   * 注册手动 SIGTERM/SIGINT 兜底：延迟 500ms 后检查 NestJS hooks 是否已接管，
   * 未接管时才手动调用 app.close()，防止与 enableShutdownHooks 并发执行。
   */
  registerFallbackSignalHandlers (app: INestApplication): void {
    const handler = (signal: string) => {
      setTimeout(async () => {
        if (this.shuttingDown) return;
        this.shuttingDown = true;
        this.logger.warn(
          `[Fallback] 收到 ${signal} 后 500ms NestJS hooks 仍未触发，手动执行优雅停机...`,
        );
        await app.close();
      }, 500);
    };
    process.once('SIGTERM', () => handler('SIGTERM'));
    process.once('SIGINT', () => handler('SIGINT'));
  }

  /**
   * NestJS 在收到 SIGTERM/SIGINT 后、关闭模块之前调用此方法
   * 用于等待在途请求完成，给 Istio/K8s 时间将流量切走
   */
  async beforeApplicationShutdown (signal: string): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;
    this.shuttingDown = true;
    const gracePeriod =
      (this.configService?.get('gracefulShutdown.gracePeriod') as number) ?? 5000;
    this.logger.log(
      `收到 ${signal} 信号，等待 ${gracePeriod}ms 让在途请求完成...`,
    );
    await new Promise((resolve) => setTimeout(resolve, gracePeriod));
    this.logger.log('优雅停机等待完成，开始释放资源');

    // 兜底强退：给 NestJS 模块清理 10s，超时后强制退出
    // K8s 场景下 kubelet 会在 terminationGracePeriodSeconds 后发 SIGKILL，此处保证本地环境也能退出
    // unref() 使此 timer 不阻塞事件循环：
    // 若模块正常清理完毕，进程自然退出，timer 不触发；
    // 若模块清理超时（事件循环仍有其他挂起任务），10s 后强退兜底。
    setTimeout(() => {
      console.warn('[GracefulShutdown] 模块清理超时，强制退出进程');
      process.exit(0);
    }, 10000).unref();
  }
}

```


> 代码路径  `src\components\index.ts`

```typescript
export * from './filter/exception.filter';
export * from './interceptors/logging.interceptor';
export * from './interceptors/transform.interceptor';
export * from './middleware/context.middleware';
export * from './decorator/index';
export * from './graceful-shutdown.service';

```


> 代码路径  `src\http\http.constants.ts`

```typescript
export const HTTP_MODULE_OPTIONS = Symbol('HTTP_MODULE_OPTIONS');

```


> 代码路径  `src\http\http.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

export interface AxiosRequestInterceptors<T = AxiosResponse> {
  requestInterceptor?: (config: AxiosRequestConfig) => AxiosRequestConfig;
  requestInterceptorCatch?: (error: any) => any;
  responseInterceptor?: (res: T) => T;
  responseInterceptorCatch?: (error: any) => any;
}

export interface HttpModuleOptions<T = AxiosResponse>
  extends AxiosRequestConfig {
  interceptors?: AxiosRequestInterceptors<T>;
  debugAuth?: boolean;
  validateStatus?: ((status: number) => boolean) | null | undefined;
}

export interface HttpModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => HttpModuleOptions | Promise<HttpModuleOptions>;
  inject?: any[];
}

```


> 代码路径  `src\http\http.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { HTTP_MODULE_OPTIONS } from './http.constants';
import { HttpModuleOptions, HttpModuleAsyncOptions } from './http.interface';
import { HttpService } from './http.service';

@Module({})
export class HttpModule {
  static forRegister(
    options: HttpModuleOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: HttpModule,
      providers: [
        HttpService,
        {
          provide: HTTP_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [HttpService, HTTP_MODULE_OPTIONS],
    };
  }

  static forRegisterAsync(
    options: HttpModuleAsyncOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: HttpModule,
      imports: options.imports,
      providers: [
        HttpService,
        {
          provide: HTTP_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      exports: [HttpService, HTTP_MODULE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\http\http.service.ts`

```typescript
import { Injectable, Optional, Inject } from '@nestjs/common';
import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { HTTP_MODULE_OPTIONS } from './http.constants';
import { HttpModuleOptions, AxiosRequestInterceptors } from './http.interface';
import { RpcException, RpcRetryableException } from '../rpc/rpc.errors';
import { RpcErrorCode } from '../rpc/json-rpc/types';

@Injectable()
export class HttpService {
  private $http: AxiosInstance;
  private interceptors: AxiosRequestInterceptors;

  constructor(
    @Optional()
    @Inject(HTTP_MODULE_OPTIONS)
    protected options: HttpModuleOptions,
  ) {
    this.$http = axios.create(options);
    this.interceptors = options.interceptors || {};
    this.setupInterceptors();
  }

  private setupInterceptors (): void {
    this.$http.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        if (this.interceptors?.requestInterceptor) {
          config = this.interceptors.requestInterceptor(config);
        }
        return config;
      },
      (error: any) => {
        if (this.interceptors?.requestInterceptorCatch) {
          return this.interceptors.requestInterceptorCatch(error);
        }
        return Promise.reject(error);
      },
    );

    this.$http.interceptors.response.use(
      (response: any) => {
        if (this.interceptors?.responseInterceptor) {
          response = this.interceptors.responseInterceptor(response);
        }
        return response;
      },
      (error: any) => {
        // 统一将 AxiosError 转为框架异常，业务代码只需处理 RpcException 及其子类
        const classified =
          error instanceof AxiosError ? this.classifyAxiosError(error) : error;

        if (this.interceptors?.responseInterceptorCatch) {
          return this.interceptors.responseInterceptorCatch(classified);
        }
        return Promise.reject(classified);
      },
    );
  }

  private classifyAxiosError (error: AxiosError): Error {
    if (!error.response) {
      // 网络错误：超时降级为 504，其他保持 503
      const httpStatus =
        error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 504 : 503;
      return new RpcRetryableException(
        `External service unreachable: ${error.message}`,
        { axiosCode: error.code, url: error.config?.url },
        // 外部 API 调用失败直接偏移，本层 Istio 不再重试其他副本
        RpcRetryableException.shiftStatus(httpStatus),
      );
    }

    const status = error.response.status;
    // 只有基础设施错误才可重试；
    const RETRYABLE_STATUS = [502, 503, 504];

    if (RETRYABLE_STATUS.includes(status)) {
      return new RpcRetryableException(
        `External service error: ${status}`,
        { upstreamStatus: status, url: error.config?.url },
        // 502/503/504 → 512/513/514，切断上层 Istio 重试链
        RpcRetryableException.shiftStatus(status),
      );
    }

    return new RpcException(
      `External service rejected: ${status} ${error.response.statusText}`,
      RpcErrorCode.INTERNAL_ERROR,
      { upstreamStatus: status, url: error.config?.url },
    );
  }

  request<T> (config: HttpModuleOptions<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.$http
        .request<any, T>(config)
        .then((res: T) => resolve(res))
        .catch((err: any) => reject(err));
    });
  }

  get<T = any> (url: string, config?: AxiosRequestConfig<T>): Promise<T> {
    return this.request<T>({ url, ...config, method: 'GET' });
  }

  post<T = any> (
    url: string,
    data?: any,
    config?: AxiosRequestConfig<T>,
  ): Promise<T> {
    return this.request<T>({ url, ...config, data, method: 'POST' });
  }

  put<T = any> (
    url: string,
    data?: any,
    config?: AxiosRequestConfig<T>,
  ): Promise<T> {
    return this.request<T>({ url, ...config, data, method: 'PUT' });
  }

  delete<T = any> (
    url: string,
    data?: any,
    config?: AxiosRequestConfig<T>,
  ): Promise<T> {
    return this.request<T>({ url, ...config, data, method: 'DELETE' });
  }

  getAxiosInstance (): AxiosInstance {
    return this.$http;
  }

  addRequestInterceptor (
    onFulfilled?: (
      value: AxiosRequestConfig,
    ) => AxiosRequestConfig | Promise<AxiosRequestConfig>,
    onRejected?: (error: any) => any,
  ): number {
    return this.$http.interceptors.request.use(onFulfilled, onRejected);
  }

  addResponseInterceptor (
    onFulfilled?: (value: any) => any | Promise<any>,
    onRejected?: (error: any) => any,
  ): number {
    return this.$http.interceptors.response.use(onFulfilled, onRejected);
  }

  removeRequestInterceptor (interceptorId: number): void {
    this.$http.interceptors.request.eject(interceptorId);
  }

  removeResponseInterceptor (interceptorId: number): void {
    this.$http.interceptors.response.eject(interceptorId);
  }
}

```


> 代码路径  `src\http\index.ts`

```typescript
export * from './http.module';
export * from './http.service';
export * from './http.interface';
export * from './http.constants';

```


> 代码路径  `src\rpc\index.ts`

```typescript
export * from './rpc.interface';
export * from './rpc.module';
export * from './rpc.controller';
export * from './rpc.decorators';
export * from './rpc.registry';
export * from './rpc.client';
export * from './rpc.errors';
export * from './json-rpc/types';
export * from './json-rpc/rpc-helpers';

```


> 代码路径  `src\rpc\rpc.client.ts`

```typescript
import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { ContextService, CONTEXT_HEADER } from '@cs/nest-common';
import { ConfigService } from '@cs/nest-config';
import { AxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { RPC_MODULE_OPTIONS, RpcConfig } from './rpc.interface';
import { JsonRpcClient } from './json-rpc/client';
import {
  JsonRpcResponse,
  ExtendedJsonRpcRequest,
  JSONValue,
} from './json-rpc/types';
import { RpcModuleOptions, RpcRequestClient } from './rpc.interface';
import {
  RpcInternalException,
  RpcException,
  RpcRetryableException,
} from './rpc.errors';
import { getRPCResult } from './json-rpc/rpc-helpers';

@Injectable()
export class RpcClient {
  private client: JsonRpcClient;
  private readonly logger = new Logger('RpcService');
  constructor(
    @Inject(RPC_MODULE_OPTIONS)
    private readonly options: RpcModuleOptions,
    private readonly contextService: ContextService,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.client = new JsonRpcClient({
      protocol: options.protocol,
      timeout: options.timeout || 10000,
    });
  }
  async call<TParams, TResult> (
    request: RpcRequestClient<TParams>,
  ): Promise<JsonRpcResponse<TResult>> {
    const { rpcConfig, payload, reqOptions = {} } = request;

    // 获取并传递上下文
    const finalreqOptions = this.initContext(reqOptions);
    let url = this.resolveServiceUrl(rpcConfig);
    if (rpcConfig.servicePath) {
      url += `/${rpcConfig.servicePath}/rpc`;
    } else {
      url += '/rpc';
    }
    try {
      return await this.client.call<TParams, TResult>(
        {
          url,
          req: payload,
        },
        finalreqOptions,
      );
    } catch (error) {
      if (error instanceof RpcException) throw error;

      if (error instanceof AxiosError) {
        // 只有明确的传输层错误才可重试：网络不通 / 超时 / 网关类 5xx（502/503/504/512/513/514）
        // 500/501 等应用层 5xx 不在此列，避免对永久性错误做无意义重试
        const isTransportError =
          !error.response ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          RpcRetryableException.TRANSPORT_STATUS_CODES.has(
            error.response.status,
          );

        const downstreamError = parseDownstreamRpcError(error.response?.data);

        if (isTransportError) {
          // 推导 httpStatus：
          // - 有 response.status (5xx) → 原样保留
          // - 超时 (ECONNABORTED / ETIMEDOUT) → 504 Gateway Timeout
          // - 其他网络错误 (ECONNREFUSED / ENOTFOUND / 无 response) → 503
          const upstreamStatus = error.response?.status;
          let httpStatus = 503;
          if (upstreamStatus) {
            httpStatus = upstreamStatus;
          } else if (
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT'
          ) {
            httpStatus = 504;
          }

          // 防重试雪崩：502/503/504 → 512/513/514
          // 本层 Istio 已完成重试，偏移后上层 Istio 的 gateway-error 不再匹配
          // shiftStatus 幂等：来自更深层的 512/513/514 原样传递，不会二次偏移
          const shiftedStatus = RpcRetryableException.shiftStatus(httpStatus);

          throw new RpcRetryableException(
            downstreamError?.message || `Upstream transport failure: ${error.message}`,
            {
              targetService: rpcConfig.serviceName,
              axiosCode: error.code,
              responseStatus: upstreamStatus,
              downstreamCode: downstreamError?.code,
              downstreamData: downstreamError?.data,
            },
            shiftedStatus,
          );
        }

        // 下游 4xx：若 body 含合法 JSON-RPC error 则保留原始语义
        if (downstreamError) {
          throw new RpcException(
            downstreamError.message,
            downstreamError.code,
            downstreamError.data,
          );
        }
      }

      throw new RpcInternalException('Failed to call RPC service', {
        originalError: error.message,
      });
    }
  }

  async callWithExtract<TParams, TResult> (
    request: RpcRequestClient<TParams>,
  ): Promise<TResult> {
    const result = await this.call(request);
    if (request.payload.isNotify) return;
    return getRPCResult<TResult>(result);
  }

  /**
   * 通知型调用（fire-and-forget）
   * JSON-RPC 规范：无 id、服务端不返回响应体
   * 类型签名为 Promise<void>，强制 isNotify=true；传输层/协议层异常仍会抛出
   */
  async notify<TParams = JSONValue>(request: {
    rpcConfig: RpcConfig;
    payload: Omit<ExtendedJsonRpcRequest<TParams>, 'isNotify'>;
    reqOptions?: AxiosRequestConfig;
  }): Promise<void> {
    await this.call<TParams, void>({
      ...request,
      payload: { ...request.payload, isNotify: true },
    });
  }

  // 函数重载签名
  async getNewId (): Promise<string>;
  async getNewId (number: number): Promise<string[]>;

  // 函数实现
  async getNewId (number?: number): Promise<string | string[]> {
    // 调用idGenerationServer服务，获取新ID
    const response = await this.call({
      rpcConfig: {
        serviceName: 'node-pf-id-generation-service',
        servicePath: 'idGenerationServer',
      },
      payload: {
        method: 'id.batchCreateId',
        params: number || 1, // 如果没有传参数，默认为1
      },
    });

    const result = getRPCResult<string | string[]>(response);

    // 根据是否传入参数来决定返回类型
    if (number === undefined) {
      // 没有传入参数，返回单个字符串
      return Array.isArray(result) ? result[0] : result;
    } else {
      // 传入了参数，返回数组
      return Array.isArray(result) ? result : [result];
    }
  }

  private initContext (reqOptions: AxiosRequestConfig) {
    const allContext = this.contextService.getAllContext();
    if (!reqOptions.headers) {
      reqOptions.headers = {};
    }
    const encodedContext = this.contextService.encodeContext(allContext);
    reqOptions.headers[CONTEXT_HEADER] = encodedContext;
    // 添加请求跟踪ID，便于排查问题
    const trackingId = this.contextService.getContext<string>('trackingId');
    if (trackingId) {
      reqOptions.headers['x-tracking-id'] = trackingId;
    }

    // 透传 Istio/Envoy 标准追踪头
    const traceHeaders =
      this.contextService.getContext<Record<string, string>>('traceHeaders');
    if (traceHeaders) {
      Object.assign(reqOptions.headers, traceHeaders);
    }

    return reqOptions;
  }

  /**
   * 解析服务地址
   * 策略：配置优先，约定兜底
   * - 有配置 → 使用配置的 url（本地开发覆盖用）
   * - 无配置 → 按 K8s Service DNS 约定拼接 http://{serviceName}:{defaultPort}
   */
  private resolveServiceUrl (config: RpcConfig): string {
    // 1. 优先从配置中查找（支持本地开发覆盖）
    // ConfigService.get() 只支持顶层 key 查找，需先取 rpc 对象再导航嵌套属性
    const rpcConfig = this.configService?.get('rpc') as any;
    const configuredUrl = rpcConfig?.services?.[config.serviceName]?.url;
    if (configuredUrl) {
      return configuredUrl;
    }

    // 2. 未配置 → 按 K8s Service DNS 约定拼接
    //    同命名空间：serviceName；跨命名空间：serviceName.namespace
    const port = this.options.defaultPort || 8080;
    const host = config.namespace
      ? `${config.serviceName}.${config.namespace}`
      : config.serviceName;
    return `${this.options.protocol}://${host}:${port}`;
  }
}

/** 从下游响应体里提取 JSON-RPC error（存在且格式合法才返回） */
function parseDownstreamRpcError (
  data: unknown,
): { code: number; message: string; data?: any } | null {
  if (data && typeof data === 'object' && 'error' in (data as any)) {
    const err = (data as any).error;
    if (
      err &&
      typeof err.code === 'number' &&
      typeof err.message === 'string'
    ) {
      return err;
    }
  }
  return null;
}

```


> 代码路径  `src\rpc\rpc.controller.ts`

```typescript
import { Controller, Post, Body, Req, Get, Res } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { skipTransformInterceptor } from '../components/decorator/interceptor.decorator';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { RpcRegistry, RpcParameterInfo, RpcMethodInfo } from './rpc.registry';
import { JsonRpcRequest, JsonRpcResponse } from './json-rpc/types';
import { createJsonRpcSuccess, validateJsonRpcRequest } from './json-rpc/utils';
import { RpcServiceInfo } from './rpc.registry';
import { RpcInvalidParamsException } from './rpc.errors';

class JsonRpcRequestDto {
  @ApiProperty({
    description: 'JSON-RPC版本号',
    example: '2.0',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  jsonrpc: string;

  @ApiProperty({
    description: 'RPC方法名,<路径>.<方法>',
    example: 'service.method',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({
    description: '请求参数',
    example: { param1: 'value1', param2: 'value2' },
    required: false,
    type: Object,
  })
  @IsObject()
  @IsOptional()
  params?: any;

  @ApiProperty({
    description: '请求ID',
    example: '1234567890',
    required: false,
  })
  @IsOptional()
  id?: string | number | null;
}

// 定义响应DTO类
class JsonRpcResponseDto {
  @ApiProperty({
    description: 'JSON-RPC版本号',
    example: '2.0',
  })
  jsonrpc: string;

  @ApiProperty({
    description: '响应结果',
    example: { data: 'success' },
  })
  result?: any;

  @ApiProperty({
    description: '错误信息',
    example: {
      code: -32600,
      message: 'Invalid Request',
      data: { details: 'Invalid method parameter' },
    },
  })
  error?: {
    code: number;
    message: string;
    data?: any;
  };

  @ApiProperty({
    description: '请求ID',
    example: '1234567890',
  })
  id: string | number | null;
}

@Controller('rpc')
@ApiTags('rpc')
export class RpcController {
  constructor(private readonly rpcRegistry: RpcRegistry) {}

  @Post()
  @ApiOperation({
    summary: 'RPC 请求控制器',
    description:
      '处理JSON-RPC 2.0请求,支持方法调用和通知(使用postman等工具调试时，注意请求头部添加x-rpc-request: true标识头)',
  })
  @ApiBody({
    type: JsonRpcRequestDto,
    description: 'JSON-RPC 2.0请求对象',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回RPC响应',
    type: JsonRpcResponseDto,
  })
  async handleRpcRequest(
    @Body()
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse | void> {
    // if (Array.isArray(request)) {
    //   return Promise.all(request.map((req) => this.handleSingleRequest(req)));
    // }
    // 请求参数验证
    validateJsonRpcRequest(request);
    return await this.handleSingleRequest(request);
  }

  private async handleSingleRequest(
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    const { method, params, id } = request;
    if (!method || typeof method !== 'string') {
      throw new RpcInvalidParamsException('Invalid method name');
    }
    const result = await this.rpcRegistry.executeMethod(method, params);
    return createJsonRpcSuccess(id, result);
  }

  @Get()
  @ApiOperation({
    summary: 'RPC服务文档信息',
    description: '获取已注册的RPC服务信息，查询测试使用',
  })
  getServicesInfo(): RpcServiceInfo[] {
    const services = this.rpcRegistry.getServicesInfo();

    // 这有助于调试
    // console.log('Services info:', JSON.stringify(services, null, 2));

    return services;
  }

  @Get('docs')
  @skipTransformInterceptor()
  @ApiOperation({
    summary: 'RPC服务可视化文档',
    description: '以HTML页面形式展示RPC服务文档，支持在线测试',
  })
  getDocsPage(@Res() res: Response): void {
    if (process.env.CS_DOCS_NAME) {
      const services = this.rpcRegistry.getServicesInfo();

      // 获取服务路径配置，构建正确的RPC调用URL
      const serverPath = process.env.CS_SERVERPATH;
      const rpcEndpoint = serverPath ? `/${serverPath}/rpc` : '/rpc';

      const html = this.generateRpcDocsHTML(services, rpcEndpoint);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(html);
    } else {
      res.send('UNCONFIG!');
    }
  }

  private generateRpcDocsHTML(
    services: RpcServiceInfo[],
    rpcEndpoint: string,
  ): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head> 
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${process.env.CS_DOCS_NAME}</title>
    <style>
        :root {
            --primary-color: #ff7f00;
            --primary-hover: #e66d00;
            --secondary-color: #2d3748;
            --success-color: #38a169;
            --error-color: #e53e3e;
            --warning-color: #d69e2e;
            --background: #f7fafc;
            --card-background: #ffffff;
            --border-color: #e2e8f0;
            --text-primary: #2d3748;
            --text-secondary: #718096;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--background);
            color: var(--text-primary);
            line-height: 1.4;
        }

        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
            color: white;
            padding: 0.5rem 1.5rem;
            text-align: left;
            box-shadow: var(--shadow);
        }

        .header h1 {
            font-size: 1.6rem;
            font-weight: 700;
            margin-bottom: 0.15rem;
        }

        .header p {
            font-size: 0.85rem;
            opacity: 0.9;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0.5rem;
        }

        .service-card {
            background: var(--card-background);
            border-radius: 2px;
            margin-bottom: 0.5rem;
            box-shadow: var(--shadow);
            overflow: hidden;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .service-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .service-header {
            background: var(--secondary-color);
            color: white;
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .service-title {
            font-size: 1.05rem;
            font-weight: 600;
        }

        .service-description {
            color: #cbd5e0;
            margin-top: 0.15rem;
            font-size: 0.85rem;
        }

        .expand-icon {
            transition: transform 0.3s ease;
            font-size: 1.1rem;
        }

        .expand-icon.expanded {
            transform: rotate(180deg);
        }

        .methods-container {
            display: none;
            padding: 0.5rem;
        }

        .methods-container.expanded {
            display: block;
        }

        .method-card {
            border: 1px solid var(--border-color);
            border-radius: 2px;
            margin-bottom: 0.5rem;
            overflow: hidden;
        }

        .method-header {
            background: #f8f9fa;
            padding: 0.5rem;
            border-bottom: 1px solid var(--border-color);
        }

        .method-name {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 0.15rem;
        }

        .method-description {
            color: var(--text-secondary);
            font-size: 0.8rem;
        }

        .method-body {
            padding: 0.5rem;
        }

        .params-section, .test-section {
            margin-bottom: 0.5rem;
        }

        .section-title {
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }

        .param-item {
            display: flex;
            align-items: center;
            padding: 0.25rem 0.5rem;
            background: #f8f9fa;
            border-radius: 2px;
            margin-bottom: 0.2rem;
            font-size: 0.85rem;
        }

        .param-name {
            font-weight: 600;
            color: var(--primary-color);
            min-width: 100px;
        }

        .param-required {
            background: var(--error-color);
            color: white;
            font-size: 0.65rem;
            padding: 0.15rem 0.4rem;
            border-radius: 2px;
            margin-left: 0.4rem;
        }

        .param-optional {
            background: var(--text-secondary);
            color: white;
            font-size: 0.65rem;
            padding: 0.15rem 0.4rem;
            border-radius: 2px;
            margin-left: 0.4rem;
        }

        .param-description {
            margin-left: 0.75rem;
            color: var(--text-secondary);
            flex: 1;
            font-size: 0.8rem;
        }

        .test-form {
            background: #f8f9fa;
            padding: 0.5rem;
            border-radius: 2px;
            border: 1px solid var(--border-color);
        }

        .form-group {
            margin-bottom: 0.5rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.35rem;
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.85rem;
        }

        .form-input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 2px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.85rem;
            resize: vertical;
            min-height: 80px;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(255, 127, 0, 0.1);
        }

        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 2px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.85rem;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-primary:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
        }

        .btn-primary:disabled {
            background: var(--text-secondary);
            cursor: not-allowed;
            transform: none;
        }

        .response-container {
            margin-top: 0.5rem;
            border-radius: 2px;
            overflow: hidden;
        }

        .response-header {
            padding: 0.5rem 0.75rem;
            font-weight: 600;
            color: white;
            font-size: 0.85rem;
        }

        .response-success {
            background: var(--success-color);
        }

        .response-error {
            background: var(--error-color);
        }

        .response-body {
            background: #2d3748;
            color: #e2e8f0;
            padding: 0.5rem;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.75rem;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 300px;
            overflow-y: auto;
        }

        .loading {
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s linear infinite;
            margin-right: 0.5rem;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .no-services {
            text-align: center;
            padding: 3rem;
            color: var(--text-secondary);
        }

        .validation-error {
            color: var(--error-color);
            font-size: 0.8rem;
            margin-top: 0.25rem;
        }

        .form-label-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.35rem;
        }

        .form-label-row .form-label {
            margin-bottom: 0;
        }

        .mode-toggle {
            display: flex;
            border: 1px solid var(--border-color);
            border-radius: 2px;
            overflow: hidden;
        }

        .mode-btn {
            padding: 0.15rem 0.55rem;
            border: none;
            background: white;
            cursor: pointer;
            font-size: 0.75rem;
            color: var(--text-secondary);
            transition: all 0.2s;
        }

        .mode-btn.active {
            background: var(--primary-color);
            color: white;
        }

        .mode-btn:hover:not(.active) {
            background: #f0f0f0;
        }

        @media (max-width: 768px) {
            .container {
                padding: 0.5rem;
            }

            .header h1 {
                font-size: 1.5rem;
            }

            .header p {
                font-size: 0.8rem;
            }

            .param-item {
                flex-direction: column;
                align-items: flex-start;
            }

            .param-description {
                margin-left: 0;
                margin-top: 0.25rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${process.env.CS_DOCS_NAME}</h1>
        <p>${process.env.CS_DOCS_DESCRIBE}-${process.env.CS_DOCS_VERSION}</p>
    </div>

    <div class="container">
        ${
          services.length === 0
            ? '<div class="no-services"><h3>暂无可用的RPC服务</h3><p>请确保您的服务已正确注册RPC装饰器</p></div>'
            : services
                .map((service) => this.generateServiceCardHTML(service))
                .join('')
        }
    </div>

    <script>
        class RPCDocumentApp {
            constructor(rpcEndpoint) {
                this.rpcEndpoint = rpcEndpoint;
                this.initializeEventListeners();
            }

            initializeEventListeners() {
                // 服务展开/收起事件
                document.querySelectorAll('.service-header').forEach(header => {
                    header.addEventListener('click', (e) => {
                        const serviceCard = e.currentTarget.closest('.service-card');
                        const methodsContainer = serviceCard.querySelector('.methods-container');
                        const expandIcon = serviceCard.querySelector('.expand-icon');
                        
                        if (methodsContainer.classList.contains('expanded')) {
                            methodsContainer.classList.remove('expanded');
                            expandIcon.classList.remove('expanded');
                        } else {
                            methodsContainer.classList.add('expanded');
                            expandIcon.classList.add('expanded');
                        }
                    });
                });

                // RPC测试表单提交事件
                document.querySelectorAll('.test-form').forEach(form => {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.handleRPCTest(e.target);
                    });
                });

                // 参数输入验证事件
                document.querySelectorAll('.form-input').forEach(input => {
                    input.addEventListener('blur', (e) => {
                        this.validateInput(e.target);
                    });
                });

                // 模式切换事件
                document.querySelectorAll('.mode-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const toggle = e.currentTarget.closest('.mode-toggle');
                        toggle.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                        e.currentTarget.classList.add('active');
                        const textarea = toggle.closest('.form-group').querySelector('.form-input');
                        if (textarea) {
                            textarea.style.borderColor = '';
                            const err = textarea.parentNode.querySelector('.validation-error');
                            if (err) err.remove();
                        }
                    });
                });
            }

            getMode(element) {
                const form = element.closest('form');
                const activeBtn = form && form.querySelector('.mode-btn.active');
                return activeBtn ? activeBtn.dataset.mode : 'json';
            }

            parseInput(value, mode) {
                if (mode === 'js') {
                    return new Function('return (' + value + ')')();
                }
                return JSON.parse(value);
            }

            validateInput(input) {
                const errorElement = input.parentNode.querySelector('.validation-error');
                if (errorElement) {
                    errorElement.remove();
                }

                const value = input.value.trim();
                if (!value) return;

                const mode = this.getMode(input);
                try {
                    this.parseInput(value, mode);
                    input.style.borderColor = 'var(--success-color)';
                } catch (error) {
                    input.style.borderColor = 'var(--error-color)';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'validation-error';
                    errorDiv.textContent = (mode === 'js' ? '无效的JS对象格式: ' : '无效的JSON格式: ') + error.message;
                    input.parentNode.appendChild(errorDiv);
                }
            }

            async handleRPCTest(form) {
                const formData = new FormData(form);
                const method = formData.get('method');
                const paramsInput = form.querySelector('.form-input');
                const submitBtn = form.querySelector('.btn-primary');
                const responseContainer = form.querySelector('.response-container');

                let params = null;
                const paramsValue = paramsInput.value.trim();
                const mode = this.getMode(form);

                if (paramsValue) {
                    try {
                        params = this.parseInput(paramsValue, mode);
                    } catch (error) {
                        this.showResponse(responseContainer, {
                            success: false,
                            data: { error: (mode === 'js' ? 'JS对象格式错误: ' : 'JSON格式错误: ') + error.message }
                        });
                        return;
                    }
                }

                // 构建RPC请求
                const rpcRequest = {
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: Date.now()
                };

                // 显示加载状态
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="loading"></span>测试中...';

                try {
                    const response = await fetch(this.rpcEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-rpc-request': 'true'
                        },
                        body: JSON.stringify(rpcRequest)
                    });

                    const result = await response.json();
                    
                    this.showResponse(responseContainer, {
                        success: response.ok && !result.error,
                        data: result,
                        status: response.status
                    });

                } catch (error) {
                    this.showResponse(responseContainer, {
                        success: false,
                        data: { error: '网络请求失败: ' + error.message }
                    });
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '🚀 发送测试';
                }
            }

            showResponse(container, response) {
                const { success, data, status } = response;
                
                container.innerHTML = \`
                    <div class="response-header \${success ? 'response-success' : 'response-error'}">
                        \${success ? '✅ 调用成功' : '❌ 调用失败'} \${status ? '(HTTP ' + status + ')' : ''}
                    </div>
                    <div class="response-body">\${JSON.stringify(data, null, 2)}</div>
                \`;
                
                container.style.display = 'block';
            }
        }

        // 初始化应用，传入RPC端点配置
        document.addEventListener('DOMContentLoaded', () => {
            new RPCDocumentApp(${JSON.stringify(rpcEndpoint)});
        });
    </script>
</body>
</html>`;
  }

  private generateServiceCardHTML(service: RpcServiceInfo): string {
    return `
        <div class="service-card">
            <div class="service-header">
                <div>
                    <div class="service-title">${this.escapeHtml(service.name)}</div>
                    ${service.description ? `<div class="service-description">${this.escapeHtml(service.description)}</div>` : ''}
                </div>
                <div class="expand-icon">▼</div>
            </div>
            <div class="methods-container">
                ${service.methods.map((method) => this.generateMethodCardHTML(method)).join('')}
            </div>
        </div>`;
  }

  private generateMethodCardHTML(method: RpcMethodInfo): string {
    return `
        <div class="method-card">
            <div class="method-header">
                <div class="method-name">${this.escapeHtml(method.fullName)}</div>
                ${method.description ? `<div class="method-description">${this.escapeHtml(method.description)}</div>` : ''}
            </div>
            <div class="method-body">
                ${
                  method.parameters.length > 0
                    ? `
                    <div class="params-section">
                        <div class="section-title">📋 参数列表</div>
                        ${method.parameters
                          .map(
                            (param) => `
                            <div class="param-item">
                                <span class="param-name">${this.escapeHtml(param.name)}</span>
                                <span class="${param.required ? 'param-required' : 'param-optional'}">
                                    ${param.required ? 'Required' : 'Optional'}
                                </span>
                                ${param.type ? `<span class="param-type">[${this.escapeHtml(param.type)}]</span>` : ''}
                                ${param.description ? `<span class="param-description">${this.escapeHtml(param.description)}</span>` : ''}
                            </div>
                        `,
                          )
                          .join('')}
                    </div>
                `
                    : ''
                }
                
                <div class="test-section">
                    <div class="section-title">🧪 在线测试</div>
                    <form class="test-form">
                        <input type="hidden" name="method" value="${this.escapeHtml(method.fullName)}">
                        <div class="form-group">
                            <div class="form-label-row">
                                <label class="form-label">请求参数:</label>
                                <div class="mode-toggle">
                                    <button type="button" class="mode-btn active" data-mode="json">JSON</button>
                                    <button type="button" class="mode-btn" data-mode="js">JS对象</button>
                                </div>
                            </div>
                            <textarea
                                class="form-input"
                                placeholder="${this.escapeHtml(this.generateParameterPlaceholder(method.parameters))}"
                                spellcheck="false"
                            ></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">🚀 发送测试</button>
                        <div class="response-container" style="display: none;"></div>
                    </form>
                </div>
            </div>
        </div>`;
  }

  private generateParameterPlaceholder(parameters: RpcParameterInfo[]): string {
    if (parameters.length === 0) {
      return '该方法无需参数';
    }

    if (parameters.length === 1) {
      const param = parameters[0];
      if (param.type === 'string') {
        return `"${param.name}的值"`;
      } else if (param.type === 'number') {
        return '123';
      } else if (param.type === 'boolean') {
        return 'true';
      }
      return `"${param.name}的值"`;
    }

    // 多参数情况，生成对象格式
    const exampleObj = {};
    parameters.forEach((param) => {
      if (param.type === 'string') {
        exampleObj[param.name] = `${param.name}的值`;
      } else if (param.type === 'number') {
        exampleObj[param.name] = 123;
      } else if (param.type === 'boolean') {
        exampleObj[param.name] = true;
      } else {
        exampleObj[param.name] = `${param.name}的值`;
      }
    });

    return JSON.stringify(exampleObj, null, 2);
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

```


> 代码路径  `src\rpc\rpc.decorators.ts`

```typescript
import 'reflect-metadata';
import {
  RPC_SERVICE_METADATA,
  RPC_METHOD_METADATA,
  RPC_PARAMS_METADATA,
  RpcServiceOptions,
  RpcMethodOptions,
  RpcParamOptions,
} from './rpc.interface';
// 服务装饰器
export function RpcService(
  options: RpcServiceOptions | string,
): ClassDecorator {
  return (target: any) => {
    const serviceOptions =
      typeof options === 'string' ? { name: options } : options;

    Reflect.defineMetadata(RPC_SERVICE_METADATA, serviceOptions, target);
  };
}

// 方法装饰器
export function RpcMethod(options?: RpcMethodOptions): MethodDecorator {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const methodOptions: RpcMethodOptions = options;

    Reflect.defineMetadata(
      RPC_METHOD_METADATA,
      {
        name: methodOptions.name || propertyKey.toString(),
        originalMethod: propertyKey.toString(),
        description: methodOptions.description,
        returnType: methodOptions.returnType,
        returnDescription: methodOptions.returnDescription,
        idempotent: methodOptions.idempotent ?? false,
      },
      descriptor.value,
    );
    return descriptor;
  };
}

// 参数装饰器
export function RpcParam(
  options: RpcParamOptions | string,
): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    // 将字符串转换为选项对象
    const paramOptions =
      typeof options === 'string' ? { name: options } : options;

    // 获取当前方法已有的参数映射
    const existingParams =
      Reflect.getMetadata(RPC_PARAMS_METADATA, target, propertyKey) || {};

    // 添加新的参数映射
    existingParams[parameterIndex] = paramOptions;

    // 保存更新后的参数映射
    Reflect.defineMetadata(
      RPC_PARAMS_METADATA,
      existingParams,
      target,
      propertyKey,
    );
  };
}

```


> 代码路径  `src\rpc\rpc.errors.ts`

```typescript
import { RpcErrorCode } from './json-rpc/types';
export class RpcException extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: any,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'RpcException';
  }
}

export class RpcParseException extends RpcException {
  constructor(data?: any) {
    super('Parse error', RpcErrorCode.PARSE_ERROR, data);
    this.name = 'RpcParseException';
  }
}

export class RpcInvalidRequestException extends RpcException {
  constructor(data?: any) {
    super('Invalid request', RpcErrorCode.INVALID_REQUEST, data);
    this.name = 'RpcInvalidRequestException';
  }
}

export class RpcMethodNotFoundException extends RpcException {
  constructor(method: string, data?: any) {
    super(`Method not found: ${method}`, RpcErrorCode.METHOD_NOT_FOUND, data);
    this.name = 'RpcMethodNotFoundException';
  }
}

export class RpcInvalidParamsException extends RpcException {
  constructor(message = 'Invalid params', data?: any) {
    super(message, RpcErrorCode.INVALID_PARAMS, data);
    this.name = 'RpcInvalidParamsException';
  }
}

export class RpcInternalException extends RpcException {
  constructor(message = 'Internal error', data?: any) {
    super(message, RpcErrorCode.INTERNAL_ERROR, data);
    this.name = 'RpcInternalException';
  }
}

/**
 * 可重试的 RPC 异常：专用于传输层失败和下游瞬态错误
 * httpStatus 仅接受 {502, 503, 504, 512, 513, 514}，其他值构造时强制折叠为 503
 * RpcClient 收到下游 502/503/504 后会偏移 +10 再传入（512/513/514），防止上层 Istio 重试雪崩
 * 默认 503，保持向后兼容
 */
export class RpcRetryableException extends RpcException {
  /**
   * Istio 可重试状态码 → 偏移后的"已重试"状态码
   * Istio 默认 retryOn 匹配 502/503/504，偏移后的 512/513/514 不在匹配范围
   */
  static readonly RETRYABLE_TO_SHIFTED: ReadonlyMap<number, number> = new Map([
    [502, 512],
    [503, 513],
    [504, 514],
  ]);

  /**
   * 唯一允许透传为非 200 HTTP 状态码的传输层错误码集合
   * 只有这些状态码会被 Filter 原样写入 HTTP response.status
   * 其他状态码（400/429/500 等）一律折叠为 200，错误信息放 JSON-RPC error body
   */
  static readonly TRANSPORT_STATUS_CODES = new Set([
    502, 503, 504, 512, 513, 514,
  ]);

  /**
   * 将原始可重试状态码偏移为非重试码，防止上层 Istio 再次重试
   * 幂等：已偏移（如 513）或不在映射中的状态码原样返回
   */
  static shiftStatus(status: number): number {
    return RpcRetryableException.RETRYABLE_TO_SHIFTED.get(status) ?? status;
  }

  public readonly httpStatus: number;

  constructor(message: string, data?: any, httpStatus = 503) {
    super(message, RpcErrorCode.INTERNAL_ERROR, data, true);
    this.name = 'RpcRetryableException';

    if (!RpcRetryableException.TRANSPORT_STATUS_CODES.has(httpStatus)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[RpcRetryableException] 非法状态码 ${httpStatus}，已强制折叠为 503。` +
          `仅接受 502/503/504（传输错误）和 512/513/514（偏移后的传输错误）。` +
          `业务异常请改用 RpcBusinessException。`,
      );
      this.httpStatus = 503;
    } else {
      this.httpStatus = httpStatus;
    }
  }
}

/**
 * 业务异常：code 必须为正整数，与协议级负整数 code 天然隔离
 * 可在 data.httpStatus 中指定 HTTP 映射状态码（如 409），默认映射 400
 */
export class RpcBusinessException extends RpcException {
  constructor(message: string, code: number, data?: any) {
    if (code < 1000) {
      throw new Error('Business error code must be >= 1000');
    }
    super(message, code, data);
    this.name = 'RpcBusinessException';
  }
}

```


> 代码路径  `src\rpc\rpc.interface.ts`

```typescript
import { AxiosRequestConfig } from 'axios';
import { ExtendedJsonRpcRequest, JSONValue } from './json-rpc/types';
export const RPC_SERVICE_METADATA = Symbol('RPC_SERVICE_METADATA');
export const RPC_METHOD_METADATA = Symbol('RPC_METHOD_METADATA');
export const RPC_PARAMS_METADATA = Symbol('RPC_PARAMS_METADATA');
export const RPC_MODULE_OPTIONS = Symbol('RPC_MODULE_OPTIONS');
export interface RpcModuleOptions {
  protocol: string;
  timeout?: number;
  defaultPort?: number;
}

export interface RpcModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => Promise<RpcModuleOptions> | RpcModuleOptions;
  inject?: any[];
}

export interface RpcConfig {
  serviceName: string;
  servicePath?: string;
  groupName?: string;
  clusters?: string;
  /** 跨命名空间调用时指定目标服务所在的 K8s namespace */
  namespace?: string;
}

export interface RpcRequestClient<TParams = JSONValue> {
  rpcConfig: RpcConfig;
  payload: ExtendedJsonRpcRequest<TParams>;
  reqOptions?: AxiosRequestConfig;
}

export interface RpcServiceOptions {
  name: string;
  description?: string;
}

export interface RpcMethodOptions {
  name: string;
  description?: string;
  returnType?: string;
  returnDescription?: string;
  /** 是否幂等，默认 false；只有声明 true 的方法才会在瞬态失败时抛 RpcRetryableException 触发 Istio 重试 */
  idempotent?: boolean;
}

export interface RpcParamOptions {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
  defaultValue?: any;
}

```


> 代码路径  `src\rpc\rpc.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  RpcModuleOptions,
  RpcModuleAsyncOptions,
  RPC_MODULE_OPTIONS,
} from './rpc.interface';
import { RpcController } from './rpc.controller';
import { RpcRegistry } from './rpc.registry';
import { RpcClient } from './rpc.client';

@Module({})
export class RpcModule {
  static forRoot(options: RpcModuleOptions, isGlobal = true): DynamicModule {
    return {
      global: isGlobal,
      module: RpcModule,
      imports: [DiscoveryModule],
      providers: [
        RpcRegistry,
        RpcClient,
        {
          provide: RPC_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      controllers: [RpcController],
      exports: [RPC_MODULE_OPTIONS, RpcRegistry, RpcClient], // 导出 RpcRegistry
    };
  }

  static forRootAsync(
    options: RpcModuleAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: RpcModule,
      imports: [...(options.imports || []), DiscoveryModule],
      providers: [
        RpcRegistry,
        RpcClient,
        {
          provide: RPC_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ],
      controllers: [RpcController],
      exports: [RPC_MODULE_OPTIONS, RpcRegistry, RpcClient],
    };
  }
}

```


> 代码路径  `src\rpc\rpc.registry.ts`

```typescript
import { Injectable, OnModuleInit, HttpException } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  RPC_SERVICE_METADATA,
  RPC_METHOD_METADATA,
  RPC_PARAMS_METADATA,
} from './rpc.interface';
import {
  RpcException,
  RpcInvalidParamsException,
  RpcMethodNotFoundException,
  RpcInternalException,
  RpcRetryableException,
} from './rpc.errors';

// 定义服务信息接口
export interface RpcServiceInfo {
  name: string;
  description?: string;
  methods: RpcMethodInfo[];
}

// 定义方法信息接口
export interface RpcMethodInfo {
  name: string;
  description?: string;
  returnType?: string;
  returnDescription?: string;
  parameters: RpcParameterInfo[];
  fullName: string; // 服务名.方法名
  idempotent: boolean;
}

// 定义参数信息接口
export interface RpcParameterInfo {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
  defaultValue?: any;
  position: number;
}

@Injectable()
export class RpcRegistry implements OnModuleInit {
  private rpcMethods: Map<
    string,
    {
      instance: any;
      methodName: string;
      methodInfo: RpcMethodInfo;
    }
  > = new Map();

  private servicesInfo: Map<string, RpcServiceInfo> = new Map();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  async onModuleInit() {
    const providers = this.discoveryService.getProviders();

    providers.forEach((wrapper: InstanceWrapper) => {
      const { instance } = wrapper;
      if (!instance) return;

      // 获取服务元数据
      const serviceOptions = Reflect.getMetadata(
        RPC_SERVICE_METADATA,
        instance.constructor,
      );
      if (!serviceOptions) return;

      // 创建服务信息
      const serviceName = serviceOptions.name;
      const serviceInfo: RpcServiceInfo = {
        name: serviceName,
        description: serviceOptions.description,
        methods: [],
      };

      this.servicesInfo.set(serviceName, serviceInfo);

      this.metadataScanner.scanFromPrototype(
        instance,
        Object.getPrototypeOf(instance),
        (methodName: string) => {
          // 获取方法的实际引用
          const method = instance[methodName];
          // 从方法本身获取元数据
          const methodMeta = Reflect.getMetadata(RPC_METHOD_METADATA, method);

          // console.log(`Scanning method ${methodName}:`, methodMeta);

          if (methodMeta) {
            const fullMethodName = `${serviceName}.${methodMeta.name}`;
            // 获取参数信息
            const prototype = Object.getPrototypeOf(instance);
            const paramMappings =
              Reflect.getMetadata(RPC_PARAMS_METADATA, prototype, methodName) ||
              {};

            // 构建参数信息数组
            const parametersInfo: RpcParameterInfo[] = [];
            for (const [index, options] of Object.entries(paramMappings)) {
              const paramIndex = Number(index);
              parametersInfo.push({
                ...(options as any),
                position: paramIndex,
              });
            }

            // 排序参数（按位置）
            parametersInfo.sort((a, b) => a.position - b.position);

            // 创建方法信息
            const methodInfo: RpcMethodInfo = {
              name: methodMeta.name,
              description: methodMeta.description,
              returnType: methodMeta.returnType,
              returnDescription: methodMeta.returnDescription,
              parameters: parametersInfo,
              fullName: fullMethodName,
              idempotent: methodMeta.idempotent ?? false,
            };

            // 存储方法信息
            serviceInfo.methods.push(methodInfo);

            // 存储到执行映射中
            this.rpcMethods.set(fullMethodName, {
              instance,
              methodName,
              methodInfo,
            });
          }
        },
      );
    });
  }

  // private getParameterNames(func: (...args: any[]) => any): string[] {
  //   const funcStr = func.toString();
  //   const paramStr = funcStr.slice(
  //     funcStr.indexOf('(') + 1,
  //     funcStr.indexOf(')'),
  //   );
  //   return paramStr
  //     .split(',')
  //     .map((param) => param.trim())
  //     .filter((param) => param.length > 0);
  // }

  async executeMethod(method: string, params: any): Promise<any> {
    const methodData = this.rpcMethods.get(method);
    if (!methodData) {
      throw new RpcMethodNotFoundException(method);
    }
    const { instance, methodName, methodInfo } = methodData;
    try {
      // 根据参数类型处理参数、
      const args = this.buildMethodArguments(params, methodInfo);
      // console.log('参数输出', params, methodInfo, ...args);
      const result = instance[methodName](...args);
      // 检查返回值是否是 Promise
      if (result && typeof result.then === 'function') {
        return await result; // 如果是 Promise，等待它完成
      }
      return result; // 如果不是 Promise，直接返回
    } catch (error) {
      // RpcException（含 RpcRetryableException）原样透传，语义已明确
      if (error instanceof RpcException) {
        throw error;
      }
      // HttpException 原样透传，由 UnifiedExceptionFilter 按当前请求协议重新序列化
      if (error instanceof HttpException) {
        throw error;
      }
      // 未知运行时错误：按方法幂等性决定是否透出 503 触发 Istio 重试
      const errMsg = error.message || 'Method execution failed';
      if (methodInfo.idempotent) {
        throw new RpcRetryableException(errMsg, {
          originalError: error.message,
          stack: error.stack,
        });
      }
      throw new RpcInternalException(errMsg, {
        originalError: error.message,
        stack: error.stack,
      });
    }
  }

  private buildMethodArguments(params: any, methodInfo: RpcMethodInfo): any[] {
    try {
      // 处理空参数
      if (params === null || params === undefined) {
        // 检查必需参数
        const requiredParam = methodInfo.parameters.find((p) => p.required);
        if (requiredParam) {
          throw new Error(`Missing required parameter: ${requiredParam.name}`);
        }
        return [];
      }

      // 处理数组参数
      if (Array.isArray(params)) {
        if (params.length > methodInfo.parameters.length) {
          throw new Error('Too many parameters provided');
        }

        // 创建完整参数数组
        const args = [...params];

        // 校验已提供的参数类型
        for (let i = 0; i < params.length; i++) {
          const param = methodInfo.parameters[i];
          if (param) {
            this.validateRequired(args[i], param);
            this.validateParamType(args[i], param);
          }
        }

        // 检查未提供的参数
        for (let i = params.length; i < methodInfo.parameters.length; i++) {
          const param = methodInfo.parameters[i];
          if (param.required) {
            throw new Error(`Missing required parameter: ${param.name}`);
          }
          // 使用默认值填充剩余参数
          if ('defaultValue' in param) {
            args[i] = param.defaultValue;
          }
        }

        return args;
      }

      // 处理对象参数
      if (typeof params === 'object') {
        // 创建按参数位置排序的数组
        const args = Array(methodInfo.parameters.length).fill(undefined);

        // 按照参数名称填充参数值
        for (const param of methodInfo.parameters) {
          if (param.name in params) {
            const value = params[param.name];
            this.validateRequired(value, param);
            this.validateParamType(value, param);
            args[param.position] = value;
          } else if (param.required) {
            throw new Error(`Missing required parameter: ${param.name}`);
          } else if ('defaultValue' in param) {
            args[param.position] = param.defaultValue;
          }
        }

        return args;
      }

      // 处理单一参数
      if (methodInfo.parameters.length === 0) {
        throw new Error('No parameters expected but received one');
      }

      const firstParam = methodInfo.parameters[0];
      this.validateRequired(params, firstParam);
      this.validateParamType(params, firstParam);

      return [params];
    } catch (error) {
      throw new RpcInvalidParamsException(error.message);
    }
  }
  /**
   * 校验参数值是否符合声明的基础类型
   */
  private validateParamType(value: any, param: RpcParameterInfo): void {
    if (value === null || value === undefined || !param.type) {
      return;
    }

    const typeValidators: Record<string, (v: any) => boolean> = {
      string: (v) => typeof v === 'string',
      number: (v) => typeof v === 'number' && !isNaN(v),
      boolean: (v) => typeof v === 'boolean',
      array: (v) => Array.isArray(v),
      object: (v) => typeof v === 'object' && !Array.isArray(v) && v !== null,
    };

    const validator = typeValidators[param.type];
    if (validator && !validator(value)) {
      throw new Error(
        `Parameter '${param.name}' expected type '${param.type}', but got '${typeof value}'`,
      );
    }
  }

  /**
   * 校验必填参数的值不为 null/undefined
   */
  private validateRequired(value: any, param: RpcParameterInfo): void {
    if (param.required && (value === null || value === undefined)) {
      throw new Error(`Missing required parameter: ${param.name}`);
    }
  }

  getMethods(): string[] {
    return Array.from(this.rpcMethods.keys());
  }

  // 获取完整服务信息
  getServicesInfo(): RpcServiceInfo[] {
    return Array.from(this.servicesInfo.values());
  }
}

```


> 代码路径  `src\setup\bodyParser.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import * as bodyParser from 'body-parser';

export class BodyParserStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // 设置服务请求参数题解析
    if (this.configService.isConfig('bodyParser')) {
      const bodyParserConfig = this.configService.get('bodyParser');

      for (const parserType in bodyParserConfig) {
        if (bodyParserConfig[parserType]) {
          const config = { ...bodyParserConfig[parserType] };
          const preserveRawBody = config.preserveRawBody;

          // 删除非标准选项，避免传递给 bodyParser
          delete config.preserveRawBody;

          // 根据配置决定是否添加 verify 函数
          if (preserveRawBody) {
            config.verify = (req: any, res: any, buf: Buffer) => {
              req.rawBody = buf.toString();
            };
          }
          this.app.use(bodyParser[parserType](config));
        }
      }
    }
  }
}

```


> 代码路径  `src\setup\filter.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerService } from '@cs/nest-common';
import { UnifiedExceptionFilter } from '../components';
export class FilterStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    const logger = this.app.get(LoggerService);
    if (this.configService.isConfig('exceptionFilter')) {
      this.app.useGlobalFilters(
        new UnifiedExceptionFilter(this.configService, logger),
      );
    }
  }
}

```


> 代码路径  `src\setup\health.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { Router } from 'express';

export class HealthStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // 默认启用健康检查，除非显式配置 health.enabled = false
    const healthConfig = this.configService.get('health');
    if (healthConfig && healthConfig.enabled === false) {
      return;
    }

    const router = Router();

    // Liveness 探针 — 仅确认进程存活
    router.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: process.env.CS_NAME || 'unknown',
      });
    });

    // Readiness 探针 — 确认服务已就绪可接收流量
    router.get('/ready', async (req, res) => {
      try {
        const checks: Record<string, string> = {
          process: 'ok',
        };

        res.status(200).json({
          status: 'ok',
          checks,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(503).json({
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    this.app.use(router);
  }
}

```


> 代码路径  `src\setup\index.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerConfigStrategy } from './logger.setup';
import { MiddlewareStrategy } from './middleware.setup';
import { InterceptorsStrategy } from './interceptors.setup';
import { PipesStrategy } from './pipes.setup';
import { FilterStrategy } from './filter.setup';
import { BodyParserStrategy } from './bodyParser.setup';
import { SwaggerStrategy } from './swagger.setup';
import { HealthStrategy } from './health.setup';
import { StartedStrategy } from './started.setup';
// 启动处理配置项（按顺序执行）
export const configStrategyList: Array<{
  name: string;
  strategy: typeof SetupStrategy;
}> = [
  { name: 'logger', strategy: LoggerConfigStrategy }, // 日志配置（最先加载）
  { name: 'middleware', strategy: MiddlewareStrategy }, // 中间件配置
  { name: 'bodyParser', strategy: BodyParserStrategy }, // body解析配置
  { name: 'interceptors', strategy: InterceptorsStrategy }, // 拦截器配置
  { name: 'pipes', strategy: PipesStrategy }, // 管道配置
  { name: 'filter', strategy: FilterStrategy }, // 过滤器配置
  { name: 'docs', strategy: SwaggerStrategy }, // 文档配置
  { name: 'health', strategy: HealthStrategy }, // 健康检查端点（K8s/Istio 探针）
  { name: 'started', strategy: StartedStrategy }, // 启动配置（最后执行）
];

```


> 代码路径  `src\setup\interceptors.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerService } from '@cs/nest-common';
import { LoggingInterceptor, TransformInterceptor } from '../components';
export class InterceptorsStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    const logger = this.app.get(LoggerService);
    //  请求日志拦截器
    if (this.configService.isConfig('loggerInterceptor')) {
      this.app.useGlobalInterceptors(
        new LoggingInterceptor(this.configService, logger),
      );
    }
    // 响应拦截器
    if (this.configService.isConfig('transformInterceptor')) {
      this.app.useGlobalInterceptors(new TransformInterceptor());
    }
  }
}

```


> 代码路径  `src\setup\logger.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerService, CommonUtil, ContextService } from '@cs/nest-common';
export class LoggerConfigStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // 使用自定义日志
    const logger = this.app.get(LoggerService);
    this.app.useLogger(logger);

    // 注册 ContextService 到 LoggerService，使日志能注入 requestId/traceId
    const contextService = this.app.get(ContextService);
    LoggerService.setContextService(contextService);

    // 根据Console配置设置日志输出
    if (this.configService.isConfig('disableConsole')) {
      // 禁用console
      CommonUtil.disableConsole();
    }
  }
}

```


> 代码路径  `src\setup\middleware.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { ContextService, LoggerService } from '@cs/nest-common';
import { ContextMiddleware } from '../components/middleware/context.middleware';
import { ProxyMiddlewareFactory } from '../components/middleware/proxy.middleware';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');

export class MiddlewareStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    // cors配置
    if (this.configService.isConfig('cors')) {
      const corsConfig = this.configService.get('cors');
      this.app.enableCors(corsConfig);
    }

    // 代理中间件
    if (this.configService.isConfig('proxy')) {
      const proxyConfig = this.configService.get('proxy');
      const loggerService = this.app.get(LoggerService);
      const proxyMiddleware = ProxyMiddlewareFactory.getInstance(
        proxyConfig,
        loggerService,
      );

      // 注册全局中间件
      this.app.use((req, res, next) => {
        return proxyMiddleware.use(req, res, next);
      });
    }
    // cookie中间件
    const secret = 'yearrow-wmcp';
    this.app.use(cookieParser(secret));

    // 上下文中间件
    if (this.configService.isConfig('contextMiddleware')) {
      const contextService = this.app.get(ContextService);
      const loggerService = this.app.get(LoggerService);
      const contextMiddleware = new ContextMiddleware(contextService, loggerService);
      this.app.use((req, res, next) => {
        return contextMiddleware.use(req, res, next);
      });
    }
  }
}

```


> 代码路径  `src\setup\pipes.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { ValidationPipe, HttpStatus } from '@nestjs/common';
export class PipesStrategy extends SetupStrategy {
  async execute(): Promise<void> {
    const config = this.configService.get('validationPipe');
    if (this.configService.isConfig('validationPipe')) {
      this.app.useGlobalPipes(
        new ValidationPipe({
          ...config,
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
      );
    }
  }
}

```


> 代码路径  `src\setup\setup.interface.ts`

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@cs/nest-config';

export class SetupStrategy {
  constructor(
    protected app: NestExpressApplication,
    protected configService: ConfigService,
  ) {}
  async execute(): Promise<void> {}
}

```


> 代码路径  `src\setup\started.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { LoggerService } from '@cs/nest-common';
export class StartedStrategy extends SetupStrategy {
  async execute (): Promise<void> {
    // 服务启动相关程序
    // 设置服务访问路径
    const serverPrefix = this.configService.get('serverPath');
    // 启动服务
    const logger = this.app.get(LoggerService);
    const docsPath = serverPrefix ? `${serverPrefix}/docs` : 'docs';
    const rpcDocsPath = serverPrefix ? `${serverPrefix}/rpc/docs` : 'rpc/docs';
    if (Number(process.env.CS_PORT) > 0) {
      await this.app.listen(Number(process.env.CS_PORT));

      const serviceName = process.env.CS_NAME || 'Unknown Service';
      const host = process.env.CS_HOST;
      const port = Number(process.env.CS_PORT);
      const serverPath = process.env.CS_SERVERPATH;
      const env = process.env.CS_SERVICEENV || 'default';
      const startTime = new Date().toLocaleString();
      const baseUrl = `http://${host}:${port}`;

      // 构建美化的日志输出
      const separator = '─'.repeat(50);
      const lines: string[] = [
        '',
        separator,
        `🚀 ${serviceName} 启动成功!`,
        separator,
        `📍 端口: ${port}`,
        `🌍 环境: ${env}`,
        `⏰ 时间: ${startTime}`,
        `🔗 服务地址: ${baseUrl}/${serverPath}`,
      ];

      if (this.configService.isConfig('docs')) {
        lines.push(`📖 RESTful文档: ${baseUrl}/${docsPath}`);
        lines.push(`📚 RPC文档: ${baseUrl}/${rpcDocsPath}`);
      }

      lines.push(separator);
      lines.push('');
      logger.log(lines.join('\n'));
    } else {
      logger.error('service start port not specified!');
    }
  }
}

```


> 代码路径  `src\setup\swagger.setup.ts`

```typescript
import { SetupStrategy } from './setup.interface';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
export class SwaggerStrategy extends SetupStrategy {
  setupSwagger (app, docPath, docsConfig) {
    const builder = new DocumentBuilder()
      .addBearerAuth()
      .setTitle(`${docsConfig.name}`)
      .setDescription(`${docsConfig.describe}`)
      .setVersion(`${docsConfig.version}`);

    // 从配置中读取自定义请求头，注册为 apiKey 安全方案
    // 配置示例：headers: [{ name: 'x-user-id', description: '用户ID' }]
    const customHeaders: Array<{ name: string; description?: string }> =
      docsConfig.headers || [];
    for (const header of customHeaders) {
      builder.addApiKey(
        {
          type: 'apiKey',
          in: 'header',
          name: header.name,
          description: header.description,
        },
        header.name,
      );
    }
    // 全局生效，所有接口自动带上这些头
    if (customHeaders.length > 0) {
      const securityRequirement = Object.fromEntries(
        customHeaders.map((h) => [h.name, []]),
      );
      builder.addSecurityRequirements(securityRequirement);
    }

    const options = builder.build();
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(docPath, app, document);
  }
  async execute (): Promise<void> {
    // 加载文档
    const serverPrefix = this.configService.get('serverPath');
    if (this.configService.isConfig('serverPath')) {
      this.app.setGlobalPrefix(serverPrefix);
    }
    const docsPath = serverPrefix ? `${serverPrefix}/docs` : 'docs';
    if (this.configService.isConfig('docs')) {
      // 添加前缀
      const docsConfig = this.configService.get('docs');
      docsConfig.serverPrefix = serverPrefix;
      this.setupSwagger(this.app, docsPath, docsConfig);
    }
  }
}

```


> 代码路径  `src\components\decorator\index.ts`

```typescript
export * from './interceptor.decorator';

```


> 代码路径  `src\components\decorator\interceptor.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_INTERCEPTOR = 'SKIP_TRANSFORM_INTERCEPTOR';

export const skipTransformInterceptor = (): MethodDecorator =>
  // 跳过转化拦截器
  SetMetadata(SKIP_TRANSFORM_INTERCEPTOR, true);

```


> 代码路径  `src\components\filter\exception.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService, ErrorResult } from '@cs/nest-common';
import { AxiosError } from 'axios';
import { ConfigService } from '@cs/nest-config';
import { RpcException, RpcRetryableException } from '../../rpc';
import { rpcErrorToHttpError } from '../../rpc/json-rpc/rpc-error-transformer';
import { RpcErrorCode } from '../../rpc/json-rpc/types';

@Catch()
export class UnifiedExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) { }

  private isRpcRequest (request: Request): boolean {
    if (request.headers['x-rpc-request'] === 'true') return true;
    // POST /rpc 路径兜底（兼容未带请求头的调试场景），限制 POST 避免误伤 GET /rpc、GET /rpc/docs
    if (request.method === 'POST' && request.url?.endsWith('/rpc')) return true;
    return false;
  }

  private isHttpException (exception: unknown): exception is HttpException {
    return (
      exception instanceof HttpException ||
      (exception?.constructor?.name === 'HttpException' &&
        typeof (exception as any).getStatus === 'function')
    );
  }

  private getErrorMessage (exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as any).message;
      return Array.isArray(message) ? message[0] : message;
    }
    return 'Internal server error';
  }

  // 从 HttpException response body 中提取正整数业务错误码
  private getBizCode (exceptionResponse: string | object): number | undefined {
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const code = (exceptionResponse as any).code;
      if (typeof code === 'number' && code >= 1000) return code;
    }
    return undefined;
  }

  private getAxiosErrorMessage (exception: AxiosError): string {
    if (exception.response?.data) {
      const responseData = exception.response.data;
      if (typeof responseData === 'string') {
        return responseData;
      }
      if (typeof responseData === 'object' && responseData !== null) {
        if ('message' in responseData) {
          const message = (responseData as any).message;
          return Array.isArray(message) ? message[0] : message;
        }
        if ('error' in responseData) {
          const error = (responseData as any).error;
          if (typeof error === 'string') {
            return error;
          }
          if (
            typeof error === 'object' &&
            error !== null &&
            'message' in error
          ) {
            return error.message || 'External service error';
          }
        }
      }
    }
    if (exception.response?.statusText) {
      return exception.response.statusText;
    }
    return exception.message || 'External service error';
  }

  private getAxiosErrorStatus (exception: AxiosError): number {
    if (exception.response?.status) {
      return exception.response.status;
    }
    switch (exception.code) {
      case 'ECONNABORTED':
      case 'ETIMEDOUT':
        return HttpStatus.REQUEST_TIMEOUT;
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
        return HttpStatus.SERVICE_UNAVAILABLE;
      case 'NETWORK_ERROR':
        return HttpStatus.BAD_GATEWAY;
      default:
        return HttpStatus.BAD_GATEWAY;
    }
  }

  // 将各类异常映射到 JSON-RPC error code
  private toJsonRpcCode (exception: unknown): number {
    if (exception instanceof RpcException) {
      return exception.code;
    }
    if (this.isHttpException(exception)) {
      const status = (exception as HttpException).getStatus();
      switch (status) {
        case HttpStatus.BAD_REQUEST:
          return RpcErrorCode.INVALID_PARAMS;
        case HttpStatus.UNAUTHORIZED:
          return RpcErrorCode.UNAUTHORIZED;
        case HttpStatus.NOT_FOUND:
          return RpcErrorCode.METHOD_NOT_FOUND;
        case HttpStatus.UNPROCESSABLE_ENTITY:
          return RpcErrorCode.VALIDATION_ERROR;
        case HttpStatus.TOO_MANY_REQUESTS:
          return RpcErrorCode.RATE_LIMIT_EXCEEDED;
        case HttpStatus.SERVICE_UNAVAILABLE:
          return RpcErrorCode.SERVICE_UNAVAILABLE;
        default:
          return RpcErrorCode.INTERNAL_ERROR;
      }
    }
    return RpcErrorCode.INTERNAL_ERROR;
  }

  private handleRpcResponse (
    exception: unknown,
    request: Request,
    response: Response,
    includeStack: boolean,
  ) {
    // retryable=true 或未知 Error（非 RpcException/HttpException）→ HTTP 5xx，让 Istio 重试
    // 其余（明确语义的 RpcException、HttpException）→ HTTP 200
    // RpcRetryableException 只有 httpStatus 在 TRANSPORT_STATUS_CODES（502/503/504/512/513/514）时才透传
    // 其他状态码（400/429/500 等）一律折叠为 200，RpcRetryableException 的语义就是"可重试传输错误"
    const isRetryable =
      (exception instanceof RpcException && exception.retryable) ||
      (!(exception instanceof RpcException) &&
        !this.isHttpException(exception));

    const httpStatus =
      exception instanceof RpcRetryableException &&
      RpcRetryableException.TRANSPORT_STATUS_CODES.has(exception.httpStatus)
        ? exception.httpStatus
        : isRetryable
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.OK;

    const code = this.toJsonRpcCode(exception);
    const id = request.body?.id !== undefined ? request.body.id : null;

    let message: string;
    let data: any;

    if (exception instanceof RpcException) {
      message = exception.message;
      data = exception.data;
    } else if (this.isHttpException(exception)) {
      const httpEx = exception as HttpException;
      message = this.getErrorMessage(httpEx.getResponse());
      data = { httpStatus: httpEx.getStatus() };
    } else if (exception instanceof AxiosError) {
      // 兜底：捕获违规裸用 axios 的场景，正常链路不应触达此分支
      message = this.getAxiosErrorMessage(exception);
      data = {
        type: 'AXIOS_ERROR',
        axiosCode: exception.code,
        ...(exception.config && {
          requestUrl: exception.config.url,
          requestMethod: exception.config.method?.toUpperCase(),
          requestTimeout: exception.config.timeout,
        }),
        ...(exception.response && {
          responseStatus: exception.response.status,
          responseStatusText: exception.response.statusText,
        }),
        ...(!exception.response && {
          networkError: true,
          hostname: exception.config?.baseURL || exception.config?.url,
        }),
      };
    } else {
      message =
        exception instanceof Error
          ? (exception as Error).message
          : 'Internal server error';
      data = undefined;
    }

    const buildData = (d: any, withStack: boolean) => {
      const stack = withStack ? (exception as any)?.stack : undefined;
      if (typeof d === 'object' && d !== null) {
        return stack ? { ...d, stack } : d;
      }
      if (stack) return d !== undefined ? { value: d, stack } : { stack };
      return d;
    };

    this.logger.error(
      {
        retryable: isRetryable,
        rpc_method: request.body?.method,
        rpc_params: request.body?.params,
        error: {
          code,
          message,
          data: buildData(data, includeStack),
        },
        id,
      },
      this.getRpcLogContext(exception),
    );

    return response.status(httpStatus).json({
      jsonrpc: '2.0',
      error: {
        code,
        message,
        data: buildData(data, includeStack),
      },
      id,
    });
  }

  private getRpcLogContext (exception: unknown): string {
    if (exception instanceof RpcException) return 'RpcExceptionFilter';
    if (this.isHttpException(exception)) return 'HttpExceptionFilter';
    if (exception instanceof AxiosError) return 'AxiosExceptionFilter';
    return 'ExceptionFilter';
  }

  private handleHttpResponse (
    exception: unknown,
    request: Request,
    response: Response,
    includeStackResponse: boolean,
    includeStackLogger: boolean,
  ) {
    // RpcException 归一化为 HttpException，避免 HTTP 接口误抛 RpcException 时落 500
    // RpcRetryableException 只有 TRANSPORT_STATUS_CODES（502/503/504/512/513/514）才透传 httpStatus
    // 其余状态码（400/429/500 等）折叠为 503，保持"服务端错误"语义
    const resolvedEx: unknown =
      exception instanceof RpcRetryableException
        ? new HttpException(
            exception.message,
            RpcRetryableException.TRANSPORT_STATUS_CODES.has(
              exception.httpStatus,
            )
              ? exception.httpStatus
              : HttpStatus.SERVICE_UNAVAILABLE,
          )
        : exception instanceof RpcException
          ? rpcErrorToHttpError({
            code: exception.code,
            message: exception.message,
            data: exception.data,
          })
          : exception;

    // HTTP 异常
    if (this.isHttpException(resolvedEx)) {
      const httpEx = resolvedEx as HttpException;
      const status = httpEx.getStatus();
      const exceptionResponse = httpEx.getResponse();

      // 302 重定向
      if (
        status === HttpStatus.FOUND &&
        typeof exceptionResponse === 'object' &&
        'redirectUrl' in exceptionResponse
      ) {
        return response.redirect((exceptionResponse as any).redirectUrl);
      }

      // 忽略浏览器自动请求 favicon 产生的 404
      if (status === HttpStatus.NOT_FOUND && request.url === '/favicon.ico') {
        return response.status(status).end();
      }

      const errorResponse: ErrorResult = {
        code: status,
        message: this.getErrorMessage(exceptionResponse),
        path: request.url,
        timestamp: new Date().toISOString(),
      };

      const bizCode = this.getBizCode(exceptionResponse);
      if (bizCode !== undefined) errorResponse.bizCode = bizCode;

      if (includeStackLogger) {
        this.logger.error(
          { ...errorResponse, stack: httpEx.stack },
          'HttpExceptionFilter',
        );
      } else {
        this.logger.error(errorResponse, 'HttpExceptionFilter');
      }
      if (includeStackResponse) errorResponse.stack = httpEx.stack;
      return response.status(status).json(errorResponse);
    }

    // 兜底：捕获违规裸用 axios 的场景，正常链路不应触达此分支
    if (resolvedEx instanceof AxiosError) {
      const status = this.getAxiosErrorStatus(resolvedEx);
      const message = this.getAxiosErrorMessage(resolvedEx);

      const errorResponse: ErrorResult = {
        code: status,
        message,
        path: request.url,
        timestamp: new Date().toISOString(),
      };

      const axiosErrorData = {
        type: 'AXIOS_ERROR',
        axiosCode: resolvedEx.code,
        ...(resolvedEx.config && {
          requestUrl: resolvedEx.config.url,
          requestMethod: resolvedEx.config.method?.toUpperCase(),
          requestTimeout: resolvedEx.config.timeout,
        }),
        ...(resolvedEx.response && {
          responseStatus: resolvedEx.response.status,
          responseStatusText: resolvedEx.response.statusText,
          responseHeaders: resolvedEx.response.headers,
          responseData:
            typeof resolvedEx.response.data === 'string'
              ? resolvedEx.response.data.substring(0, 1000)
              : resolvedEx.response.data,
        }),
        ...(!resolvedEx.response && {
          networkError: true,
          hostname: resolvedEx.config?.baseURL || resolvedEx.config?.url,
        }),
      };

      if (includeStackLogger) {
        this.logger.error(
          { ...errorResponse, ...axiosErrorData },
          'AxiosExceptionFilter',
        );
      } else {
        this.logger.error({ ...errorResponse }, 'AxiosExceptionFilter');
      }

      return response.status(status).json({
        ...errorResponse,
        ...(includeStackResponse ? { ...axiosErrorData } : {}),
      });
    }

    // 未知异常
    const errorResponse: ErrorResult = {
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        resolvedEx instanceof Error
          ? (resolvedEx as Error).message
          : 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (includeStackLogger) {
      this.logger.error(
        {
          ...errorResponse,
          stack:
            resolvedEx instanceof Error
              ? (resolvedEx as Error).stack
              : undefined,
        },
        'ExceptionFilter',
      );
    } else {
      this.logger.error(errorResponse, 'ExceptionFilter');
    }

    if (includeStackResponse) {
      errorResponse.stack =
        resolvedEx instanceof Error ? (resolvedEx as Error).stack : undefined;
    }
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(errorResponse);
  }

  catch (exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const config = this.configService.get('exceptionFilter');
    const includeStackResponse = config?.stack?.response || false;
    const includeStackLogger = config?.stack?.logger || false;

    if (this.isRpcRequest(request)) {
      return this.handleRpcResponse(
        exception,
        request,
        response,
        includeStackResponse,
      );
    }
    return this.handleHttpResponse(
      exception,
      request,
      response,
      includeStackResponse,
      includeStackLogger,
    );
  }
}

```


> 代码路径  `src\components\interceptors\logging.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { LoggerService } from '@cs/nest-common';
import { ConfigService } from '@cs/nest-config';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const loggerInterceptor = this.config.get('loggerInterceptor');
    if (!loggerInterceptor) {
      return next.handle();
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { method, url } = request;
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    // 收集请求信息
    const requestDetails = {
      method,
      url,
      handler,
      controller,
      // 可以根据配置决定是否记录
      ...(loggerInterceptor.moreInfo && {
        headers: request.headers,
        query: request.query,
        params: request.params,
        body: request.body,
      }),
    };

    this.logger.verbose(
      `>>>>>> Incoming Request: ${JSON.stringify(requestDetails)}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - now;
        // 收集响应信息
        const responseDetails = {
          method,
          url,
          responseTime: `${responseTime}ms`,
          ...(loggerInterceptor.moreInfo && {
            statusCode: response.statusCode,
            responseBody: data,
          }),
        };
        // 记录响应信息
        this.logger.verbose(
          `<<<<<<Outgoing Response: ${JSON.stringify(responseDetails)}`,
        );
      }),
    );
  }
}

```


> 代码路径  `src\components\interceptors\transform.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Result, EHttpStatus } from '@cs/nest-common';
import { isObject } from 'class-validator';
import { SKIP_TRANSFORM_INTERCEPTOR } from '../decorator/interceptor.decorator';

@Injectable()
export class TransformInterceptor<T extends Record<string, any>>
  implements NestInterceptor<T, Result<T>>
{
  private readonly reflector = new Reflector();
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Result<T>> {
    const isSkipIntercept = this.reflector.get<boolean>(
      SKIP_TRANSFORM_INTERCEPTOR,
      context.getHandler(),
    );

    // 跳过拦截器
    if (isSkipIntercept) {
      return next.handle().pipe(map((data: any) => data));
    }
    const request = context.switchToHttp().getRequest();
    // 检查请求头中是否包含 RPC 标识
    const isRpcRequest = request.headers['x-rpc-request'] === 'true';
    if (isRpcRequest) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: T) => {
        let message = '';
        if (isObject(data)) {
          message = (data as any).message;
        }
        const result: Result<T> = {
          code: response.statusCode,
          status: EHttpStatus.Success,
          message,
          result: data !== undefined ? data : null,
        };
        return result;
      }),
    );
  }
}

```


> 代码路径  `src\components\middleware\context.middleware.ts`

```typescript
import { Request, Response } from 'express';
import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ContextService,
  LoggerService,
  UserContext,
  CONTEXT_HEADER,
} from '@cs/nest-common';

// Istio/Envoy 标准追踪头（需原样透传，不做 camelCase 转换）
const TRACE_HEADERS = [
  'x-request-id',
  'x-b3-traceid',
  'x-b3-spanid',
  'x-b3-parentspanid',
  'x-b3-sampled',
  'x-b3-flags',
  'traceparent',
  'tracestate',
];

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(
    private readonly contextService: ContextService,
    private readonly logger: LoggerService,
  ) {}

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  use(req: Request, res: Response, next: () => void) {
    // 注入请求服务信息
    res.header('X-Powered-By', process.env.CS_NAME);

    // 辅助函数：将 kebab-case 头部转换为 camelCase
    const transformHeaderToCamelCase = (header: string): string => {
      // 移除 x- 前缀并转换为小驼峰
      return header
        .toLowerCase()
        .replace(/^x-/, '')
        .replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
    };

    // 辅助函数：提取自定义头部
    const extractCustomHeaders = (
      headers: Record<string, string | string[] | undefined>,
    ): Record<string, string> => {
      const result: Record<string, string> = {};
      const skipHeaders = [
        'x-rpc-request',
        'x-powered-by',
        'x-tracking-id',
        ...TRACE_HEADERS,
      ];

      Object.keys(headers).forEach((headerKey) => {
        const lowerCaseKey = headerKey.toLowerCase();

        // 检查是否符合自定义头部格式且不在跳过列表中
        if (
          /^x-[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$/i.test(lowerCaseKey) &&
          !skipHeaders.includes(lowerCaseKey)
        ) {
          const headerValue = headers[headerKey];
          if (headerValue) {
            const camelCaseKey = transformHeaderToCamelCase(lowerCaseKey);
            result[camelCaseKey] = Array.isArray(headerValue)
              ? headerValue[0]
              : headerValue;
          }
        }
      });
      return result;
    };

    // 提取 Istio/Envoy 标准追踪头（保持原始 header name，不做 camelCase 转换）
    const extractTraceHeaders = (
      headers: Record<string, string | string[] | undefined>,
    ): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const header of TRACE_HEADERS) {
        const value = headers[header];
        if (value && typeof value === 'string') {
          result[header] = value;
        }
      }
      return result;
    };

    // 区分是http还是rpc请求
    const isRpc = req.headers['x-rpc-request'];

    if (isRpc) {
      // RPC请求处理逻辑
      const contextHeader = req.headers[CONTEXT_HEADER.toLowerCase()];
      let lastContext: UserContext;

      if (contextHeader && typeof contextHeader === 'string') {
        lastContext = this.contextService.decodeContext(
          contextHeader,
        ) as UserContext;
      }

      // 累加调用跳数并检测循环调用
      const hopCount = (lastContext?.hopCount ?? 0) + 1;

      if (hopCount > 30) {
        this.logger.warn(
          `RPC 调用链路较深（${hopCount} 层），请检查是否存在循环调用`,
        );
      }

      if (hopCount > 100) {
        throw new HttpException(
          `RPC 调用链路过深（${hopCount} 层），可能存在循环调用`,
          508,
        );
      }

      // 重新生成新的 requestInfo
      // requestId 优先使用 Envoy 注入的 x-request-id，保持与 HTTP 分支及 Envoy 访问日志一致
      lastContext = Object.assign(lastContext || {}, {
        hopCount,
        requestId:
          (req.headers['x-request-id'] as string) || this.generateRequestId(),
        startTime: Date.now(),
        url: req.originalUrl,
        method: req.method,
      });

      // 提取并转换自定义头部，然后合并到上下文
      const customHeaders = extractCustomHeaders(req.headers);
      Object.assign(lastContext, customHeaders);

      // 提取 Istio/Envoy 标准追踪头
      const traceHeaders = extractTraceHeaders(req.headers);
      if (Object.keys(traceHeaders).length > 0) {
        lastContext.traceHeaders = traceHeaders;
      }

      this.contextService.runWithContext(lastContext, async () => {
        next();
      });
    } else {
      // HTTP请求处理
      // 优先使用 Istio/Envoy 注入的 x-request-id，本地无 Istio 时降级为内部生成
      const incomingRequestId = req.headers['x-request-id'];
      const requestId =
        typeof incomingRequestId === 'string' && incomingRequestId
          ? incomingRequestId
          : this.generateRequestId();

      // 提取 Istio/Envoy 标准追踪头（需先提取，供 trackingId 使用）
      const traceHeaders = extractTraceHeaders(req.headers);

      // 从 W3C traceparent 提取 trace-id（格式：00-{traceId}-{spanId}-{flags}）
      const traceIdFromOtel = traceHeaders['traceparent']?.split('-')[1];

      // 创建基础上下文
      // trackingId 优先级：W3C traceparent > B3 x-b3-traceid > x-request-id
      const context: UserContext = {
        requestId: requestId,
        trackingId:
          traceIdFromOtel || traceHeaders['x-b3-traceid'] || requestId,
        startTime: Date.now(),
        url: req.originalUrl,
        method: req.method,
      };

      // 提取并转换自定义头部，然后合并到上下文
      const customHeaders = extractCustomHeaders(req.headers);
      Object.assign(context, customHeaders);

      if (Object.keys(traceHeaders).length > 0) {
        context.traceHeaders = traceHeaders;
      }

      this.contextService.runWithContext(context, async () => {
        next();
      });
    }
  }
}

```


> 代码路径  `src\components\middleware\proxy.middleware.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { LoggerService } from '@cs/nest-common';

export interface ProxySite {
  proxyPrefix: string;
  targetUrl: string;
  skipPath?: string[];
  pathRewrite?: { [key: string]: string };
}

export interface ProxyConfig {
  enable: boolean;
  sites: ProxySite[];
}

@Injectable()
export class ProxyMiddlewareFactory {
  private static instance: ProxyMiddleware | null = null;

  static getInstance(
    proxyConfig: ProxyConfig,
    loggerService: LoggerService,
  ): ProxyMiddleware {
    if (!this.instance) {
      this.instance = new ProxyMiddleware(proxyConfig, loggerService);
    }
    return this.instance;
  }
}

@Injectable()
export class ProxyMiddleware {
  private readonly proxyHandlers: Map<string, RequestHandler> = new Map();
  private readonly proxyPathCache: Map<string, string | null> = new Map();
  private initialized = false;

  constructor(
    private readonly proxyConfig: ProxyConfig,
    private readonly logger: LoggerService,
  ) {
    this.initialize();
  }

  private initialize(): void {
    // 防止重复初始化
    if (this.initialized) {
      return;
    }

    this.setupProxyHandlers();
    this.initialized = true;
  }

  private setupProxyHandlers(): void {
    if (!this.proxyConfig.enable || !this.proxyConfig.sites?.length) {
      this.logger.log('代理配置未启用或站点配置为空');
      return;
    }

    // 按特定性排序代理站点（更具体的路径优先）
    const sortedSites = [...this.proxyConfig.sites].sort(
      (a, b) => b.proxyPrefix.length - a.proxyPrefix.length,
    );

    for (const site of sortedSites) {
      const { proxyPrefix, targetUrl, skipPath, pathRewrite } = site;

      // 优化过滤器函数以提高性能
      const filter = skipPath?.length
        ? (pathname: string) => {
            return !skipPath.some((path) => {
              const regex = new RegExp(`^/${path}(?:/|$)`);
              return regex.test(pathname);
            });
          }
        : undefined;
      // 构建代理配置，添加防循环机制
      const options = {
        target: targetUrl,
        changeOrigin: true,
        pathRewrite,
        logLevel: 'warn',
        onProxyReq: (proxyReq) => {
          // 标记请求已被代理
          proxyReq.setHeader('X-Proxied-By', 'nest-proxy');
        },
      };
      // 创建代理处理器
      const handler = filter
        ? createProxyMiddleware({
            ...options,
            pathFilter: filter,
          })
        : createProxyMiddleware(options);

      // 存储代理处理器
      this.proxyHandlers.set(proxyPrefix, handler);

      // 只在初始化时记录日志，避免重复输出
      const skipPathStr = skipPath?.length
        ? `----> 跳过路径：[ ${skipPath.join(',')}]`
        : '';
      this.logger.log(
        `已代理地址：${proxyPrefix} ---> ${targetUrl}${proxyPrefix} ${skipPathStr}`,
      );
    }
  }

  // 优化路径匹配，使用缓存提高性能
  private findBestProxyMatch(path: string): string | null {
    // 检查缓存
    if (this.proxyPathCache.has(path)) {
      return this.proxyPathCache.get(path) || null;
    }

    // 确保按照路径长度排序进行匹配
    const prefixes = Array.from(this.proxyHandlers.keys()).sort(
      (a, b) => b.length - a.length,
    );

    for (const prefix of prefixes) {
      if (path.startsWith(prefix)) {
        // 缓存结果并返回
        this.proxyPathCache.set(path, prefix);
        return prefix;
      }
    }

    // 缓存未匹配的结果
    this.proxyPathCache.set(path, null);
    return null;
  }

  /**
   * 中间件处理函数
   */
  use(req: Request, res: Response, next: NextFunction): void | Promise<void> {
    // 防止代理循环
    if (req.headers['x-proxied-by'] === 'nest-proxy') {
      return next();
    }

    // 检查代理配置是否启用
    if (!this.proxyConfig.enable) {
      return next();
    }
    try {
      // 查找最佳匹配的代理路径
      const matchedPrefix = this.findBestProxyMatch(req.path);
      if (matchedPrefix) {
        const handler = this.proxyHandlers.get(matchedPrefix);
        return handler(req, res, next);
      }
    } catch (error) {
      // 错误处理，确保请求不中断
      this.logger.error(
        `代理处理异常: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 没有匹配的代理规则，继续处理
    next();
  }
}

```


> 代码路径  `src\rpc\json-rpc\client.ts`

```typescript
// jsonRpcClient.ts

import {
  JsonRpcRequest,
  JsonRpcResponse,
  JSONRPCConfig,
  JsonRpcRequestClient,
} from './types';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class JsonRpcClient {
  private axiosInstance: AxiosInstance;
  constructor(private rpcConfig: JSONRPCConfig) {
    this.axiosInstance = axios.create({
      timeout: rpcConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-rpc-request': 'true',
      },
    });

    // this.axiosInstance.interceptors.request.use(
    //   (config) => {
    //     // 请求拦截
    //     return config;
    //   },
    //   (error) => {
    //     return Promise.reject(error);
    //   },
    // );

    // this.axiosInstance.interceptors.response.use(
    //   (response) => {
    //     // 响应拦截
    //     return response;
    //   },
    //   (error) => {
    //     if (
    //       error.code === 'ECONNABORTED' &&
    //       error.message.includes('timeout')
    //     ) {
    //       // 超时处理
    //       return Promise.reject(new Error('Request timeout'));
    //     }
    //     return Promise.reject(error);
    //   },
    // );
  }

  public async call<TParams, TResult>(
    requestClient: JsonRpcRequestClient<TParams>,
    reqOptions?: AxiosRequestConfig,
  ): Promise<JsonRpcResponse<TResult>> {
    try {
      const { req, url } = requestClient;
      const request: JsonRpcRequest<TParams> = {
        jsonrpc: '2.0',
        id: !req.isNotify ? uuidv4() : null,
        method: req.method,
        params: req.params,
      };
      // console.log('request', request, url, reqOptions);
      // 如果是通知类请求，则直接发送请求并返回
      if (req.isNotify) {
        await this.sendNotification<TParams>(request, url, reqOptions);
        return;
      }
      const response = await this.sendRequest<TParams, TResult>(
        request,
        url,
        reqOptions,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  // 发送通知类请求的方法
  private async sendNotification<TParams>(
    request: JsonRpcRequest<TParams>,
    url: string,
    reqOptions?: AxiosRequestConfig,
  ): Promise<void> {
    await this.axiosInstance.post(url, request, reqOptions);
  }

  private async sendRequest<TParams, TResult>(
    request: JsonRpcRequest<TParams>,
    url: string,
    reqOptions?: AxiosRequestConfig,
  ): Promise<JsonRpcResponse<TResult>> {
    const response = await this.axiosInstance.post(url, request, reqOptions);
    return response.data;
  }
}

```


> 代码路径  `src\rpc\json-rpc\rpc-error-transformer.ts`

```typescript
import {
  HttpException,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
  HttpStatus,
} from '@nestjs/common';
import { JSONRPCError, RpcErrorCode } from './types';

/**
 * RPC 错误码到 HTTP 异常的转换器
 * 业务错误码（正整数）优先读取 data.httpStatus，默认映射 400
 */
export function rpcErrorToHttpError(rpcError: JSONRPCError): HttpException {
  const { code, message, data } = rpcError;

  // 业务错误码（正整数）→ 携带完整 code/data，支持自定义 HTTP 状态码
  if (code > 0) {
    const httpStatus =
      typeof data?.httpStatus === 'number' ? data.httpStatus : HttpStatus.BAD_REQUEST;
    return new HttpException({ message, code, data }, httpStatus);
  }

  switch (code) {
    // 请求格式类错误 -> 400 Bad Request
    case RpcErrorCode.PARSE_ERROR:
    case RpcErrorCode.INVALID_REQUEST:
    case RpcErrorCode.INVALID_PARAMS:
      return new BadRequestException(message);

    // 资源不存在类错误 -> 404 Not Found
    case RpcErrorCode.METHOD_NOT_FOUND:
    case RpcErrorCode.SERVICE_NOT_FOUND:
      return new NotFoundException(message);

    // 数据验证类错误 -> 422 Unprocessable Entity
    case RpcErrorCode.VALIDATION_ERROR:
      return new UnprocessableEntityException(message);

    // 认证授权类错误 -> 401 Unauthorized
    case RpcErrorCode.UNAUTHORIZED:
      return new UnauthorizedException(message);

    // 服务可用性类错误 -> 503 Service Unavailable
    case RpcErrorCode.SERVICE_UNAVAILABLE:
      return new ServiceUnavailableException(message);

    // 限流类错误 -> 429 Too Many Requests
    case RpcErrorCode.RATE_LIMIT_EXCEEDED:
      return new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);

    // 服务器内部错误 -> 500 Internal Server Error
    case RpcErrorCode.INTERNAL_ERROR:
    case RpcErrorCode.TIMEOUT_ERROR:
    default:
      return new InternalServerErrorException(message || '服务内部错误');
  }
}

```


> 代码路径  `src\rpc\json-rpc\rpc-helpers.ts`

```typescript
import {
  JsonRpcResponse,
  JsonRpcSuccessResponse,
  JSONRPCErrorResponse,
} from './types';
import { RpcException } from '../rpc.errors';

export function isJsonRpcResponse(obj: any): obj is JsonRpcResponse {
  return obj && typeof obj === 'object' && 'jsonrpc' in obj;
}

export function isJsonRpcSuccessResponse(
  obj: JsonRpcResponse,
): obj is JsonRpcSuccessResponse {
  return 'result' in obj;
}

export function isJsonRpcErrorResponse(
  obj: JsonRpcResponse,
): obj is JSONRPCErrorResponse {
  return 'error' in obj;
}

export function getRPCResult<T>(response: JsonRpcResponse | void): T | null {
  if (!response) return null;
  if (isJsonRpcErrorResponse(response)) {
    throw new RpcException(
      response.error.message,
      response.error.code,
      response.error.data,
    );
  }
  return response.result as T;
}

```


> 代码路径  `src\rpc\json-rpc\types.ts`

```typescript
export type JSONRPC = '2.0';
export const JSONRPC: JSONRPC = '2.0';

export type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | JSONArray
  | null;

export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = Array<JSONValue>;
export type JSONRPCID = number | string | null;

export interface JsonRpcRequest<TParams = JSONValue> {
  jsonrpc: JSONRPC;
  method: string;
  params?: TParams;
  id?: JSONRPCID;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: JSONRPC;
  result: JSONValue;
  id: JSONRPCID;
}

export interface JSONRPCErrorResponse {
  jsonrpc: JSONRPC;
  error: JSONRPCError;
  id: JSONRPCID;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcResponse<TResult = any> {
  jsonrpc: JSONRPC;
  result?: TResult;
  error?: JSONRPCError;
  id: JSONRPCID;
}

export interface JSONRPCConfig {
  protocol: string;
  timeout: number;
}

export interface JsonRpcRequestClient<TParams = JSONValue> {
  url: string;
  req: ExtendedJsonRpcRequest<TParams>;
}

export interface ExtendedJsonRpcRequest<TParams = JSONValue>
  extends Pick<JsonRpcRequest<TParams>, 'method' | 'params'> {
  isNotify?: boolean;
}

export enum RpcErrorCode {
  // Standard JSON-RPC 2.0 error codes
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // Custom error codes (range -32000 to -32099)
  SERVICE_NOT_FOUND = -32000,
  SERVICE_UNAVAILABLE = -32001,
  TIMEOUT_ERROR = -32002,
  VALIDATION_ERROR = -32003,
  UNAUTHORIZED = -32004,
  RATE_LIMIT_EXCEEDED = -32005,
}

```


> 代码路径  `src\rpc\json-rpc\utils.ts`

```typescript
import { JsonRpcResponse, JSONRPCID, JSONValue } from './types';
import {
  RpcInvalidRequestException,
  RpcInvalidParamsException,
} from '../rpc.errors';

interface ValidationResult {
  isValid: boolean;
  error?: JsonRpcResponse;
}
const ALLOWED_REQUEST_MEMBERS = new Set(['jsonrpc', 'method', 'params', 'id']);

function isValidParam(param: any): boolean {
  const validTypes = ['string', 'number', 'boolean', 'object', 'undefined'];

  if (param === null) return true;

  if (validTypes.includes(typeof param)) {
    if (typeof param === 'object') {
      return (
        Array.isArray(param) ||
        Object.getPrototypeOf(param) === Object.prototype
      );
    }
    return true;
  }

  return false;
}

function hasExtraMembers(request: any): boolean {
  return Object.keys(request).some((key) => !ALLOWED_REQUEST_MEMBERS.has(key));
}

function throwError(
  error: typeof RpcInvalidRequestException | typeof RpcInvalidParamsException,
  message: string,
): never {
  throw new error(message);
}

export function validateJsonRpcRequest(request: any): ValidationResult {
  // 基础结构验证
  if (!request || typeof request !== 'object') {
    throwError(RpcInvalidRequestException, 'Request must be an object');
  }

  // 检查是否有额外的成员
  if (hasExtraMembers(request)) {
    throwError(
      RpcInvalidRequestException,
      'Contains unrecognized members. Only jsonrpc, method, params, and id are allowed',
    );
  }

  // 验证 jsonrpc 版本
  if (request.jsonrpc !== '2.0') {
    throwError(RpcInvalidRequestException, 'Unsupported JSON-RPC version');
  }

  // 验证方法名
  if (typeof request.method !== 'string' || request.method.trim() === '') {
    throwError(RpcInvalidRequestException, 'Method must be a non-empty string');
  }

  // 验证参数
  if (request.params !== undefined) {
    // 检查单个参数的情况
    if (isValidParam(request.params)) {
      return;
    }

    throwError(
      RpcInvalidParamsException,
      'Params must be primitive type, object, or array',
    );
  }

  // 验证 ID
  if (request.id !== undefined && request.id !== null) {
    if (!(typeof request.id === 'string' || typeof request.id === 'number')) {
      throwError(
        RpcInvalidRequestException,
        'ID must be a string, number, or null',
      );
    }
  }
}

export function createJsonRpcSuccess(
  id: JSONRPCID,
  result: JSONValue,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    result,
    id: id || null,
  };
}

export function createJsonRpcError(
  id: JSONRPCID,
  code: number,
  message: string,
  data?: any,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      data,
    },
    id: id || null,
  };
}

```


#### 代码说明



## 概述
`@cs/nest-cloud` 是一个基于 NestJS 的微服务通用组件库，主要提供了服务的启动方法、服务注册、服务间远程调用方法。该库基于 HTTP 协议和 JSON-RPC 2.0 规范协议实现，支持服务发现、负载均衡等特性。



## 安装
```bash
npm install @cs/nest-cloud
```

## 快速开始
### 1. 基础模块配置
使用 `CSModule` 装饰器快速配置应用模块：

```typescript
import { CSModule } from '@cs/nest-cloud';
import { YourController } from './your.controller';
import { YourService } from './your.service';

@CSModule({
  controllers: [YourController],
  providers: [YourService],
}, {
  configFilePath: './dist/config.yaml',
  onlyLocal: false,
  configFrom: 'nacos'
})
export class AppModule {}
```

### 2. 服务启动
使用 `bootstrap` 方法启动服务：

```typescript
import { bootstrap } from '@cs/nest-cloud';
import { AppModule } from './app.module';

async function main() {
  await bootstrap(AppModule, async (app, config) => {
    // 可选的启动回调
    console.log('服务启动成功');
  });
}

main();
```

## RPC 模块
RPC 模块提供了服务间远程调用的能力，基于 HTTP 协议和 JSON-RPC 2.0 规范协议实现，支持服务发现、负载均衡等特性。

### 1. 安装和配置
> 在@CSModule 模块装饰器中已默认全局导入了 RpcModule，无需单独引入。
>

单独使用时在应用模块中导入 RpcModule：

```typescript
import { RpcModule } from '@cs/nest-cloud';

@Module({
  imports: [
    RpcModule.forRoot({
      timeout: 5000,         // 请求超时时间(ms)
      protocol: 'http',      // 协议，支持http/https
    }),
  ],
})
export class AppModule {}
```

### 2. RPC 服务定义
实现 RPC 方法时，需要对服务、方法和参数进行标注才能注入到注册列表中，以便其他服务调用。在 `@cs/nest-cloud` 包中实现了 `RpcService`、`RpcMethod`、`RpcParam` 三个装饰器，用于标注服务、方法和参数。

除了服务名称、方法名称、参数名称强制要求外，其他描述信息主要作用于服务文档展示，方便开发人员了解服务接口的用途和参数含义，在服务中可在浏览器通过访问 `<服务地址>/rpc` 查询服务文档。

示例如下：

```typescript
@RpcService({
  name: 'userService',
  description: '用户相关服务，包括身份验证和用户信息管理'
})
export class UserService {
  @RpcMethod({
    name: 'validateServiceTicket',
    description: '验证服务票据的有效性',
    returnType: 'boolean',
    returnDescription: '票据验证结果，true表示有效，false表示无效'
  })
  async validateServiceTicket(
    @RpcParam({
      name: 'ticket',
      description: '服务票据',
      type: 'string',
      required: true
    })
    ticket: string,
    
    @RpcParam({
      name: 'service',
      description: '请求服务的URL',
      type: 'string',
      required: true
    })
    service: string,
    
    @RpcParam({
      name: 'renew',
      description: '是否强制重新认证',
      type: 'boolean',
      required: false,
      defaultValue: false
    })
    renew?: boolean,
    
    @RpcParam({
      name: 'format',
      description: '返回数据格式',
      type: 'string',
      required: false,
      defaultValue: 'JSON'
    })
    format: 'JSON' | 'XML' = 'JSON',
  ) {
    // 方法实现...
    return true;
  }
}
```



### 3. 调用 RPC 服务
在服务中注入 RpcClient：

```typescript
import { RpcClient } from '@cs/nest-cloud';

@Injectable()
export class YourService {
  constructor(private readonly rpcClient: RpcClient) {}

  async callRemoteService() {
    const result = await this.rpcClient.call({
      rpcConfig: {
        serviceName: 'remote-service',    // 目标服务名称
        groupName: 'default',             // 目标服务组名 可以省略
        clusters: 'cluster1',             // 目标服务集群 可以省略
        servicePath: '/sessionServer',    // 目标服务路径 可以省略
        namespace: 'other-namespace',     // 跨命名空间调用时指定目标服务的 K8s namespace，同命名空间时省略
      },
      payload: {
        method: 'session.setSession',  // 调用方法 一般为服务名.方法名
        params: ['11111', { name: '1111' }], // 参数 
        isNotify: false, // 没有包含"id"成员的请求对象为通知， 作为通知的请求对象表明客户端对相应的响应对象并不感兴趣，本身也没有响应对象需要返回给客户端。服务端必须不回复一个通知，该参数默认不传
      },
      reqOptions: {
        // axiosConfig   可省略 改变超时 请求的headers等
      }
    });
  }
}
```

**服务地址解析策略**

`RpcClient` 按以下优先级确定目标地址：

1. **配置优先**：若 `rpc.services.<serviceName>.url` 有配置，直接使用（用于本地开发覆盖）。
2. **K8s DNS 约定**：未配置时按命名空间情况拼接：
   - 同命名空间（默认）：`http://{serviceName}:{port}`
   - 跨命名空间（指定 `namespace`）：`http://{serviceName}.{namespace}:{port}`

```typescript
// 同命名空间（无需 namespace）
rpcConfig: { serviceName: 'user-service' }
// → http://user-service:8080

// 跨命名空间
rpcConfig: { serviceName: 'auth-service', namespace: 'infra' }
// → http://auth-service.infra:8080
```

> **所有服务部署在同一 namespace 时，不需要指定 `namespace`，保持默认行为即可。**

### 4. 参数传递的支持方式
#### 空参数
```typescript
// 不传任何参数
{
  "method": "service.method"
}
// 或显式传 null/undefined
{
  "method": "service.method",
  "params": null 
}
```

#### 单个值参数
```typescript
// 直接传递单个值
{
  "method": "service.method",
  "params": "some value"
}
```

#### 数组形式参数
```typescript
// 按顺序传递多个参数
{
  "method": "service.method", 
  "params": ["test", 18, "beijing"]
}
```

#### 对象形式参数（命名参数）
```typescript
// 通过参数名传递
{
  "method": "service.method",
  "params": {
    "name": "test",
    "age": 18,
    "address": "beijing"
  }
}
```

**注意事项：**

+ 对象形式传参时，参数名必须与方法定义的参数名完全匹配
+ 数组形式传参时，参数数量不能超过方法定义的参数数量
+ 参数验证失败会抛出 RpcInvalidParamsException 异常

### 5. 带结果提取的调用

`callWithExtract` 在 `call` 基础上自动解包结果，遇到 JSON-RPC error 自动抛出 `RpcException`：

```typescript
const user = await this.rpcClient.callWithExtract<Params, UserInfo>({
  rpcConfig: {
    serviceName: 'user-service',
    servicePath: 'userServer',
  },
  payload: {
    method: 'userService.getUserById',
    params: ['user-123'],
  },
});
```

| 方法 | 返回值 | error 处理 | 适用场景 |
|------|--------|-----------|---------|
| `call()` | `JsonRpcResponse<T>`（完整响应对象） | 调用方自行判断 error 字段 | 需要原始响应做特殊处理 |
| `callWithExtract()` | `T`（直接拿到 result 值） | 自动抛出 `RpcException` | 日常服务间调用（**推荐**） |
| `notify()` | `void` | 自动抛出 `RpcException`（仅传输层/协议层） | fire-and-forget 通知型调用 |

> 日常服务间调用统一使用 `callWithExtract`，只有需要拿原始响应做特殊处理时才用 `call`。

### 6. 通知型调用（notify）

JSON-RPC 2.0 规范中的 notify：请求无 `id`、服务端不返回响应体，适用于**只需触发、不关心结果**的场景（审计日志、统计上报、异步任务触发等）。

```typescript
await this.rpcClient.notify({
  rpcConfig: {
    serviceName: 'audit-service',
    servicePath: 'auditServer',
  },
  payload: {
    method: 'audit.log',
    params: { action: 'order.create', userId: 'u-123' },
  },
});
```

**与 `callWithExtract` 的区别：**

- 返回类型为 `Promise<void>`，类型签名诚实反映"无返回值"的语义
- 参数类型禁止传 `isNotify` 字段（方法内部强制设为 `true`），避免歧义
- 传输层异常（网络失败、下游服务不可达）仍会抛出 `RpcRetryableException`，不会静默吞掉投递失败

> ⚠️ 如果你用 `callWithExtract` 调用 `isNotify: true` 的请求，功能上能工作（返回 `undefined`），但类型签名会撒谎（声明 `Promise<TResult>` 却返回 `undefined`）。**notify 语义的调用请统一使用 `notify()`**。

### 7. 获取 ID 方法


```typescript
const id = await this.rpcClient.getNewId();  // 获取单个id
const ids = await this.rpcClient.getNewId(100);  // 获取多个id
```



---

## 服务启动
服务启动提供了 `bootstrap` 方法。该方法提供了两个参数：

+ `rootModule` 为服务的根模块财政，将根模块传入启动函数
+ `appStartedCall` 启动方法的回调方法



```typescript
export async function bootstrap(
  rootModule: any, // 加载根模块
  appStartedCall?: AsyncFunction, // 启动中间回调
) {}
```



### 启动配置策略
运行`bootstrap`方法后运行启动策略，根据各项的配置项初始化内置的服务组件。

+ **loggerStrategy**: 日志配置
+ **middlewareStrategy**: 中间件配置
+ **interceptorsStrategy**: 拦截器配置
+ **pipesStrategy**: 管道配置
+ **filterStrategy**: 过滤器配置
+ **docs**: Swagger 文档配置
+ **started**: 服务启动配置

### 启动服务组件
#### loggerStrategy
##### logger
服务启动后默认加载实现的日志模块，将nestjs的日志默认全局使用实现的日志模块

> logger模块在`@cs/nest-common`包中实现。
>

```typescript
 // 使用自定义日志
  const logger = this.app.get(LoggerService);
  this.app.useLogger(logger);
```
 

##### console
console日志可在系统配置中进行控制。

```yaml
disableConsole: false
```

#### middlewareStrategy
##### 上下文中间件
自动处理请求上下文，支持 HTTP 和 RPC 请求

> context模块在`@cs/nest-common`包中实现。
>

```yaml
contextMiddleware: true  #默认启动
```

上下文信息包括：

+ `requestId`: 请求唯一标识
+ `trackingId`: 追踪ID
+ `startTime`: 请求开始时间
+ `url`: 请求URL
+ `method`: 请求方法
+ `history`: 请求历史（RPC链路追踪） 

##### 代理中间件
> 用法详见代理中间件文档
>

```yaml
# 代理配置
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api'
      targetUrl: 'http://backend-service.com'
      pathRewrite:
        '^/api': ''
      skipPath:
        - 'health'
        - 'metrics'
```


##### cors 中间件
跨域配置此中间件采用nestjs自带中间件，在配置中进行配置是否开启以及禁用项。

```yaml
  cors:
    origin: 'http://localhost:8088'
    credentials: true
    preflightContinue: false
    methods: 
      - 'GET'
      - 'POST'
      - 'PUT'
      - 'DELETE'
    allowedHeaders: 
      - 'Content-Type'
      - 'Authorization'
```


##### cookieParser
cookie中间件集成插件`cookie-parser`。默认开启，不经过配置控制。



##### bodyParser
bodyParser中间件集成插件`body-parser`

配置如下：

```yaml
bodyParser: 
    json:
      limit: '5mb'
      preserveRawBody: true # 控制是否保留原始请求体
    urlencoded:
      extended: true
      limit: '5mb'
      preserveRawBody: true
    text:
      limit: '5mb'
      preserveRawBody: false 
      
```


#### interceptorsStrategy
##### 日志拦截器
记录请求和响应信息，在调试模式下很有用：

```yaml
loggerInterceptor: #默认不开启，需要手动配置
  moreInfo: true  # 记录详细信息（headers、body等）
```

##### 响应转换拦截器
统一API响应格式：

```typescript
// 响应格式
{
  "code": 200,
  "status": "success",
  "message": "",
  "result": { /* 实际数据 */ }
}

// 跳过转换（在某些接口上）
import { skipTransformInterceptor } from '@cs/nest-cloud';

@Get('raw-data')
@skipTransformInterceptor()
getRawData() {
  return { raw: 'data' };
}
```


配置如下：

```yaml
transformInterceptor: true
```


#### pipesStrategy
##### validationPipe
我们的标准服务中内置了nestjs官方的`validationPipe`管道。管道的作用详见文档：[https://www.yuque.com/danielmlc/cb8wsn/qic4ad6l4qd7m839/edit?toc_node_uuid=EfQXceUPinyCTd7A](https://www.yuque.com/danielmlc/cb8wsn/qic4ad6l4qd7m839/edit?toc_node_uuid=EfQXceUPinyCTd7A)



配置如下： 改配置默认全局启用，可在默认配置基础上进行自定义

```yaml
validationPipe:
    whitelist: true #  过滤掉没有装饰器的属性
    skipMissingProperties: true # 是否跳过缺失的属性
    transform: true # 是否转换类型
```


#### filterStrategy


##### exceptionFilter
异常过滤器处理服务中抛出的大部分错误，有httpexception、rpcexception、axiosexception、error等类型的错误。

异常过滤器默认在服务中全局注册，配置如下：

```yaml
exceptionFilter:  # 异常过滤器
  stack: 
    response: false # 是否在响应打印堆栈信息 （默认不开启）
    logger: true # 是否在日志中打印堆栈信息 （默认开启）
```



#### docs
服务中根据配置开启文档。默认不开启服务文档。



```yaml
docs:
  name: '用户服务 API'
  describe: '提供用户管理相关接口'
  version: '1.0.0'
```


#### started
服务启动中，输出服务访问路径。根据配置注册服务到注册中心。



服务启动相关配置：

```yaml
  name: 'node-database-service'
  port: 3023  #部署环境中一般不需要配置
  serverPath: 'ormServer'
```



注册中心配置：

```yaml
naming: true
```

## 异常处理

### 设计思路

平台的异常体系围绕三个核心原则：

1. **协议无关的异常类型**：业务代码统一抛 `RpcException` 及其子类，由 `UnifiedExceptionFilter` 根据请求协议（HTTP / JSON-RPC）自动选择序列化方式。业务代码不需要知道自己被谁调用。
2. **异常语义沿链路透传**：下游抛出的 `RpcException` 经过 RpcClient 时保留 `code / message / data`，上游可以在相同的 catch 逻辑里处理，业务码不会在跨服务时丢失。
3. **重试决策与业务语义分离**：`retryable` 标志只表达"是否是瞬态错误"，由 `RpcRetryableException` 单独承载。`httpStatus` 仅允许 `{502, 503, 504, 512, 513, 514}`，只有这些传输层状态码才会透传为非 200 HTTP 响应，让 Istio `retryOn: gateway-error` 精确决策；业务错误（`RpcBusinessException`）始终返回 200，语义清晰。
4. **防重试雪崩（状态码偏移 +10）**：`RpcClient` 收到下游 502/503/504 后，偏移 +10 变为 512/513/514 再透传上层。Istio 的 `gateway-error` 只匹配 502/503/504，偏移码不会再触发上层重试，使重试只发生在离故障最近的一跳，不随调用层数指数放大。

### 异常类型体系

```
Error
└── RpcException (code, message, data, retryable)
    ├── RpcBusinessException       业务错误，code ≥ 1000，默认 HTTP 400
    ├── RpcRetryableException      传输层瞬态错误（httpStatus 仅允许 502/503/504/512/513/514）
    ├── RpcInternalException       内部未知错误（-32603）
    ├── RpcParseException          JSON 解析失败（-32700）
    ├── RpcInvalidRequestException 请求格式非法（-32600）
    ├── RpcMethodNotFoundException 方法不存在（-32601）
    └── RpcInvalidParamsException  参数校验失败（-32602）
```

| 类型 | 用途 | 谁抛 |
|------|------|------|
| `RpcBusinessException` | 业务规则失败（余额不足、订单不存在等） | **业务代码** |
| `RpcRetryableException` | 网络层失败、下游 5xx/429 | 框架（RpcClient / HttpService / Filter） |
| `RpcInternalException` | 未知运行时错误兜底 | 框架 |
| `RpcParse / InvalidRequest / MethodNotFound / InvalidParams` | JSON-RPC 协议层错误 | 框架 |

> 业务代码几乎只需要关心 `RpcBusinessException`，其他类型由框架自动抛出。

### 异常传播路径

**场景 1：HTTP Controller → RPC 服务链**

```
┌─────────┐  HTTP  ┌──────────────┐  JSON-RPC  ┌──────────────┐
│ Client  │ ─────► │ A.Controller │ ─────────► │  B.RpcMethod │
└─────────┘        └──────────────┘            └──────────────┘
     ▲                    ▲                           │
     │                    │ ① RpcException            │ 抛 RpcBusinessException
     │ ④ ErrorResult      │    throw (原始 code 保留) │
     │    (HTTP 映射)     │                           ▼
     │                    │  ┌────────────────────────────┐
     │                    └──│ RpcClient.callWithExtract  │
     │                       │ 解包 JSON-RPC error body   │
     │                       └────────────────────────────┘
     │                                  ▲
     │                                  │ HTTP 200 + { error: {...} }
     │                                  │
     │                       ┌──────────────────┐
     └── UnifiedException ──│ B 的 Filter       │② JSON-RPC 序列化
         Filter (A 端)      │ handleRpcResponse│
         ③ rpcErrorToHttp   └──────────────────┘
```

**场景 2：外部 HTTP 调用（HttpService）**

```
┌──────────────┐     ┌─────────────┐  AxiosError  ┌──────────────┐
│  业务 Service │ ──► │ HttpService │ ───────────► │  第三方 API   │
└──────────────┘     └─────────────┘              └──────────────┘
       ▲                    │
       │                    │ classifyAxiosError
       │ RpcException /     ▼
       │ RpcRetryableException    网络失败 / 5xx / 429 → RpcRetryableException
       │                          4xx                  → RpcException
       │
       └── 业务代码按需 catch，否则冒泡到 Filter
```

**关键规则**：

- `RpcRetryableException.httpStatus` 只接受 `{502, 503, 504, 512, 513, 514}`，非法值在构造时**强制折叠为 503** 并打印 warn；Filter 直接透传该字段，不再做二次判断
- `RpcClient` 收到下游 502/503/504 时**偏移 +10**（→ 512/513/514）再抛出；`shiftStatus` 幂等，512/513/514 不会被二次偏移；最终只有离故障最近的一跳触发 Istio 重试
- Filter 对 `RpcRetryableException` 在 RPC 路径返回 `httpStatus`（502-514），HTTP 路径同样透传；`RpcBusinessException` 和其他 `RpcException` 在 RPC 路径一律返回 **HTTP 200 + JSON-RPC error body**，HTTP 路径走 `rpcErrorToHttpError` 映射
- 跨服务调用时，下游的 `code / data` 经 RpcClient 原样解包，不被任何中间层改写

**`RpcRetryableException.httpStatus` 的取值来源**

> 构造函数只接受 `{502, 503, 504, 512, 513, 514}`，其他值强制折叠为 503 并打印 warn。
> 框架内 `RpcClient` / `HttpService` 已统一处理偏移，**业务代码通常只需使用默认值 503**。

| 场景 | 最终 `httpStatus` | 说明 |
|---|---|---|
| 下游 RPC 返回 502（RpcClient） | **512** | `shiftStatus(502) → 512`，切断上层 Istio 重试链 |
| 下游 RPC 返回 503（RpcClient） | **513** | `shiftStatus(503) → 513` |
| 下游 RPC 返回 504（RpcClient） | **514** | `shiftStatus(504) → 514` |
| 下游 RPC 已是 512/513/514（深层服务偏移过，RpcClient） | **原值** | `shiftStatus` 幂等，不会二次偏移为 522/523/524 |
| 下游 RPC 返回其他 5xx（500/501 等）（RpcClient） | — | 不在传输层错误范围，走 `RpcException` 路径，RPC 路径返回 200，不触发重试 |
| 下游超时 `ECONNABORTED` / `ETIMEDOUT`（RpcClient） | **514** | 504 → shiftStatus → 514 |
| 下游网络错误 `ECONNREFUSED` / `ENOTFOUND` / 无 response（RpcClient） | **513** | 503 → shiftStatus → 513 |
| 外部 API 502 / 503 / 504（HttpService） | **512 / 513 / 514** | 同样偏移 |
| 外部 API 超时（HttpService） | **514** | 504 → shiftStatus → 514 |
| 外部 API 其他网络错误（HttpService） | **513** | 503 → shiftStatus → 513 |
| 外部 API 429 / 4xx / 其他 5xx（HttpService） | — | 抛 `RpcException`（非 retryable），不走此表 |
| 业务代码 `new RpcRetryableException(msg)` | **503** | 默认值，向后兼容，本层 Istio 可正常重试 |

**RPC → HTTP 状态码映射表**

当请求入口是 HTTP（非 `/rpc`）时，`UnifiedExceptionFilter` 会按下表把 `RpcException` 映射为 HTTP 状态码返回给客户端：

| 异常类型 / RpcErrorCode | HTTP 状态码 | 响应体说明 |
|---|---|---|
| `RpcRetryableException` | **按 `httpStatus` 字段**（502/503/504/512/513/514，默认 503） | Filter 直接透传；512/513/514 为偏移码，Istio `gateway-error` 不匹配，不触发上层重试 |
| `RpcBusinessException`（`code >= 1000`） | 优先读 `data.httpStatus`，默认 **400** | 响应体携带 `bizCode`、`code`、`message`、`data` |
| `INVALID_PARAMS` / `INVALID_REQUEST` / `PARSE_ERROR` | **400** | `BadRequestException` |
| `METHOD_NOT_FOUND` / `SERVICE_NOT_FOUND` | **404** | `NotFoundException` |
| `UNAUTHORIZED` | **401** | `UnauthorizedException` |
| `VALIDATION_ERROR` | **422** | `UnprocessableEntityException` |
| `RATE_LIMIT_EXCEEDED` | **429** | `HttpException(..., 429)` |
| `SERVICE_UNAVAILABLE` | **503** | `ServiceUnavailableException` |
| `INTERNAL_ERROR` / `TIMEOUT_ERROR` / 未匹配 code | **500** | `InternalServerErrorException`（兜底） |

**HTTP → JSON-RPC code 反向映射表**

当请求入口是 `/rpc` 时，若业务代码抛了 `HttpException`（或下游透传上来的 `HttpException`），`UnifiedExceptionFilter.toJsonRpcCode` 会按下表把 HTTP 状态码映射回 JSON-RPC `error.code` 写入响应信封：

| HTTP 状态码 | JSON-RPC code | 常量 |
|---|---|---|
| **400** Bad Request | -32602 | `RpcErrorCode.INVALID_PARAMS` |
| **401** Unauthorized | -32004 | `RpcErrorCode.UNAUTHORIZED` |
| **404** Not Found | -32601 | `RpcErrorCode.METHOD_NOT_FOUND` |
| **422** Unprocessable Entity | -32005 | `RpcErrorCode.VALIDATION_ERROR` |
| **429** Too Many Requests | -32006 | `RpcErrorCode.RATE_LIMIT_EXCEEDED` |
| **503** Service Unavailable | -32003 | `RpcErrorCode.SERVICE_UNAVAILABLE` |
| 其他 HTTP 状态（含 500） | -32603 | `RpcErrorCode.INTERNAL_ERROR`（兜底） |

> 若 `exception` 本身就是 `RpcException`，`toJsonRpcCode` 直接返回其原始 `code`，不走映射；源码见 [exception.filter.ts:113-137](src/components/filter/exception.filter.ts#L113-L137)。


### 业务开发中的异常处理

**原则 1：业务错误用 `RpcBusinessException`**

```typescript
if (!order) {
  throw new RpcBusinessException('订单不存在', 30001, { orderId });
}
if (stock < quantity) {
  throw new RpcBusinessException('库存不足', 30002, { httpStatus: 409, stock });
}
```

业务码固定 `>= 1000`，构造器会做运行时校验。通过 `data.httpStatus` 可以指定 HTTP 侧的状态码（默认 400）。

**原则 2：调用下游服务的异常默认不处理**

```typescript
// ✅ 直接写主逻辑，异常冒泡到 Filter 自动处理
async placeOrder(dto: CreateOrderDto) {
  const user = await this.rpcClient.callWithExtract({ ... });
  return this.orderRepo.save({ userId: user.id, ...dto });
}
```

下游抛出的 `RpcException` 会原样透传给前端（`code / data` 保留），无需自己 try-catch。

**原则 3：只在需要"把下游错误映射为本域业务错误"时 catch**

```typescript
try {
  return await this.rpcClient.callWithExtract<Params, UserInfo>({ ... });
} catch (err) {
  if (err instanceof RpcException && err.code === 30001) {
    // 下游的"订单不存在"，对当前域来说是"用户无订单"
    throw new RpcBusinessException('用户尚未下单', 20001);
  }
  throw err; // 其他异常直接透传
}
```

**原则 4：幂等方法显式标注 `idempotent: true`**

只有查询类和确定幂等的写操作才能标 `true`，创建 / 扣减 / 发券等严禁设置。详见下方"幂等性约束"章节。

**原则 5：不要裸用 axios**

所有外部 HTTP 调用走 `HttpService`（来自 `@cs/nest-cloud`），所有服务间 RPC 调用走 `RpcClient`。两者都内置了异常分类逻辑，裸用会绕过保护。

---

### 抛出 RPC 异常
```typescript
import { RpcException, RpcErrorCode } from '@cs/nest-cloud';

//... 服务上下文
throw new RpcException('error message', RpcErrorCode.INTERNAL_ERROR);
```

### 抛出 HTTP 异常
```typescript
import {
  HttpException,
  HttpStatus,
} from '@nestjs/common';

//... 站点控制器
throw new HttpException('error message', HttpStatus.INTERNAL_SERVER_ERROR);
```



> 一般所有的错误都会在异常过滤器中被接受并被格式化处理。想要查看比较详细的错误，可以更改异常过滤器的配置来收集错误。
>

```yaml
exceptionFilter:
    stack:
      response: true // 响应中是否包含异常堆栈   默认关闭
      logger: true // 日志中是否包含异常堆栈   默认开启
```



### RPC错误码定义
```typescript
export enum RpcErrorCode {
  // 标准 JSON-RPC 2.0 错误码
  PARSE_ERROR = -32700,        // 解析错误
  INVALID_REQUEST = -32600,    // 无效请求
  METHOD_NOT_FOUND = -32601,   // 方法未找到
  INVALID_PARAMS = -32602,     // 无效参数
  INTERNAL_ERROR = -32603,     // 内部错误

  // 自定义错误码
  SERVICE_NOT_FOUND = -32000,     // 服务未找到
  SERVICE_UNAVAILABLE = -32001,   // 服务不可用
  TIMEOUT_ERROR = -32002,         // 超时错误
  VALIDATION_ERROR = -32003,      // 验证错误
  UNAUTHORIZED = -32004,          // 未授权
  RATE_LIMIT_EXCEEDED = -32005,   // 限流
}
```

### 业务错误码规范

业务错误码使用 **`>= 1000` 的正整数**，与 JSON-RPC 协议级负整数（及 1-999 的保留段）天然隔离。构造器会在运行时校验，传入小于 1000 的值会直接抛错。使用 `RpcBusinessException` 抛出：

```typescript
import { RpcBusinessException } from '@cs/nest-cloud';

// 基本用法：默认映射 HTTP 400
throw new RpcBusinessException('订单不存在', 30001, { orderId });

// 自定义 HTTP 状态码（如 409 Conflict）
throw new RpcBusinessException('库存不足', 30002, { httpStatus: 409, stock: 0 });
```

**错误码分段约定**：

| 范围 | 用途 |
|------|------|
| `-32768 ~ -32000` | JSON-RPC 2.0 协议保留，**框架内部使用，业务代码不得复用** |
| `-32000 ~ -32099` | 平台扩展（SERVICE_NOT_FOUND、TIMEOUT 等） |
| `1000 ~ 99999` | 业务错误码（正整数） |
| `1xxxx` | 通用业务错误 |
| `2xxxx` | 用户/租户域 |
| `3xxxx` | 订单/支付域 |
| `9xxxx` | 各业务服务内部保留 |

> 各服务维护一份 `error-codes.md`，列出占用的 code 段，避免跨服务冲突。

---

### RPC 调用规范

#### 禁止业务层裸用 axios 调用其他 RPC 服务

服务间调用必须通过 `RpcClient`，不得直接使用 axios。`RpcClient.callWithExtract()` 已对 `AxiosError` 做了转换，能正确识别传输层失败并透出 retryable 语义；裸用 axios 会绕过这层保护。

#### RPC service 内部调用另一层 RPC

`callWithExtract` 遇到 error 统一抛出 `RpcException`，无论是 HTTP Controller 还是 RPC service 内部链式调用，写法完全一致：

```typescript
const user = await this.rpcClient.callWithExtract<Params, UserInfo>({ ... });
```

`UnifiedExceptionFilter` 根据请求协议自动选择序列化方式：
- RPC 请求 → 按 JSON-RPC 协议透传原始 `code/data`
- HTTP 请求 → 通过 `rpcErrorToHttpError` 映射为对应 HTTP 状态码

---

### 幂等性约束与 Istio 重试协同

`idempotent` 控制**未知运行时错误**（非 `RpcException` / `HttpException` 的意外异常）的处理策略。主动抛出的 `RpcException`、`HttpException` 不受此字段影响，始终按原语义透传。

```typescript
// 查询类 / 幂等写：可安全重试
@RpcMethod({ name: 'order.query', idempotent: true })
async queryOrder(id: string) { ... }

// 幂等写（相同入参结果一致）：可安全重试
@RpcMethod({ name: 'config.set', idempotent: true })
async setConfig(key: string, value: string) { ... }

// 非幂等写：不能重试（默认值）
@RpcMethod({ name: 'order.create' })
async createOrder(dto: CreateOrderDto) { ... }

// 扣减类：绝对不能重试（默认值）
@RpcMethod({ name: 'balance.deduct' })
async deductBalance(userId: string, amount: number) { ... }
```

**未知错误行为对比**：

| `idempotent` | 未知错误抛出类型 | HTTP 状态码 | Istio 行为 |
|-------------|----------------|-----------|-----------|
| `true` | `RpcRetryableException`（默认 `httpStatus=503`） | **503** | 本层 Istio 自动重试到其他副本；上层收到 503 时经 RpcClient 偏移为 513，不触发更上层重试 |
| `false`（默认） | `RpcInternalException` | **200** | 不重试，错误直接暴露 |

> `idempotent` 默认 `false`（保守）。接入时需逐个 review 方法，查询类和幂等写操作显式标注 `true`，创建 / 扣减 / 发券等非幂等写严禁设为 `true`。

对应 Istio VirtualService 配置示例：

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: node-xx-service
spec:
  hosts:
    - node-xx-service
  http:
    - retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: gateway-error,connect-failure,refused-stream,reset
      timeout: 8s
      route:
        - destination:
            host: node-xx-service
```

> 注意：`RpcClient.timeout` 必须 ≥ `perTryTimeout × attempts + 1s` 缓冲，否则客户端会在 Istio 重试完成前提前超时中断。默认值 10s 已足够覆盖 `3 × 2s`，自定义时需留足余量。

---

## HttpService（外部 HTTP 调用）

`HttpService` 是对 axios 的封装，内置了异常分类逻辑，**所有外部 HTTP 调用必须通过它**，不允许在业务代码中裸用 axios。

### 主要特性

- 基于 axios 的 HTTP 客户端
- 支持全局和动态配置
- 完整的请求/响应拦截器支持
- TypeScript 类型支持
- 内置异常分类与统一错误处理
- 支持异步配置
- 支持注册为全局模块

### 注册模块

```typescript
import { HttpModule } from '@cs/nest-cloud';

@Module({
  imports: [
    // 基本配置
    HttpModule.forRegister({
      timeout: 5000,
      baseURL: 'https://api.example.com',
    }),

    // 注册为全局模块（第二个参数传 true）
    HttpModule.forRegister({
      timeout: 5000,
      baseURL: 'https://api.example.com',
    }, true),
  ],
})
export class MyModule {}
```

异步配置（依赖 ConfigService）：

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@cs/nest-cloud';

HttpModule.forRegisterAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    baseURL: config.get('thirdParty.baseUrl'),
    timeout: config.get('thirdParty.timeout') || 5000,
    headers: {
      'User-Agent': config.get('USER_AGENT', 'MyApp/1.0.0'),
    },
  }),
  inject: [ConfigService],
}, true)
```

### HttpService 方法

```typescript
class HttpService {
  // 通用请求方法
  request<T>(config: HttpModuleOptions<T>): Promise<T>

  // GET 请求
  get<T = any>(url: string, config?: AxiosRequestConfig<T>): Promise<T>

  // POST 请求
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig<T>): Promise<T>

  // PUT 请求
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig<T>): Promise<T>

  // DELETE 请求
  delete<T = any>(url: string, data?: any, config?: AxiosRequestConfig<T>): Promise<T>

  // 获取底层 axios 实例
  getAxiosInstance(): AxiosInstance

  // 动态添加拦截器
  addRequestInterceptor(onFulfilled?: Function, onRejected?: Function): number
  addResponseInterceptor(onFulfilled?: Function, onRejected?: Function): number

  // 移除拦截器
  removeRequestInterceptor(interceptorId: number): void
  removeResponseInterceptor(interceptorId: number): void
}
```

### 使用

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@cs/nest-cloud';

@Injectable()
export class UserService {
  constructor(private readonly http: HttpService) {}

  // GET
  async getUser(id: string) {
    return this.http.get<UserInfo>(`/users/${id}`);
  }

  // POST
  async createUser(userData: CreateUserDto) {
    return this.http.post<UserInfo>('/users', userData);
  }

  // PUT
  async updateUser(id: string, userData: UpdateUserDto) {
    return this.http.put<UserInfo>(`/users/${id}`, userData);
  }

  // DELETE
  async deleteUser(id: string) {
    return this.http.delete(`/users/${id}`, {});
  }
}
```

### 完整配置选项（含拦截器）

```typescript
HttpModule.forRegister({
  // 基础配置
  baseURL: 'https://api.example.com',
  timeout: 10000,

  // 请求头
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'MyApp/1.0.0',
    'Accept': 'application/json',
  },

  // 调试模式：开启后会自动添加调试相关的头信息
  debugAuth: true,

  // 状态码验证
  validateStatus: (status: number) => status >= 200 && status < 300,

  // 其他 axios 配置
  maxRedirects: 5,
  responseType: 'json',
  responseEncoding: 'utf8',

  // 拦截器配置
  interceptors: {
    // 请求拦截器
    requestInterceptor: (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers!.Authorization = `Bearer ${token}`;
      }
      config.headers!['X-Request-ID'] = generateRequestId();
      return config;
    },

    // 请求错误拦截器
    requestInterceptorCatch: (error) => Promise.reject(error),

    // 响应拦截器
    responseInterceptor: (response) => {
      // 统一处理业务错误
      if (response.data?.code && response.data.code !== 200) {
        throw new Error(response.data.message || '业务处理失败');
      }
      return response;
    },

    // 响应错误拦截器（一般无需自定义，HttpService 已内置异常分类，详见下文）
    responseInterceptorCatch: (error) => Promise.reject(error),
  },
})
```

> 注意：`HttpService` 已通过内置响应拦截器把 `AxiosError` 统一分类为 `RpcException` / `RpcRetryableException`（详见下文「异常分类规则」）。如果自定义 `responseInterceptorCatch`，请注意不要破坏既有的异常分类语义。

### 异常分类规则

`HttpService` 的响应错误拦截器会自动将 AxiosError 转为框架异常，业务代码只需处理 `RpcException` 及其子类：

| 情形 | 抛出异常 | 最终 `httpStatus` | 触发上层 Istio 重试 |
|------|----------|---|----------------|
| 网络不通（无 response，非超时） | `RpcRetryableException` | **513**（503 → 偏移） | ❌（偏移码不被 gateway-error 匹配） |
| 超时（`ECONNABORTED` / `ETIMEDOUT`） | `RpcRetryableException` | **514**（504 → 偏移） | ❌ |
| 外部 502 / 503 / 504 | `RpcRetryableException` | **512 / 513 / 514** | ❌ |
| 外部 429 | `RpcException` | —（RPC 路径 200） | ❌ |
| 外部 4xx（非 429） | `RpcException` | —（RPC 路径 200） | ❌ |
| 外部 5xx（非 502/503/504） | `RpcException` | —（RPC 路径 200） | ❌ |

> **注意**：HttpService 对所有错误均不触发上层 Istio 重试，是有意为之。外部服务调用失败通过偏移码阻断重试链，避免因第三方不可用引发内部重试风暴。

原始上游状态码保存在 `err.data.upstreamStatus`，原始请求 URL 保存在 `err.data.url`。

### 将第三方错误映射为业务异常

```typescript
async callThirdParty(userId: string) {
  try {
    return await this.http.get<UserInfo>(`/users/${userId}`);
  } catch (err) {
    if (err instanceof RpcException && err.data?.upstreamStatus === 404) {
      throw new RpcBusinessException('用户在第三方系统中不存在', 10001, { userId });
    }
    throw err;
  }
}
```

---

## 接口文档
### Swagger 配置
```yaml
docs:
  name: '用户服务 API'
  describe: '提供用户管理相关接口'
  version: '1.0.0'
```

访问文档：`http://your-service/docs`

### RPC 服务文档
访问 RPC 服务文档：`http://your-service/rpc`

返回已注册的 RPC 服务信息，包括：

+ 服务名称和描述
+ 方法列表
+ 参数定义
+ 返回值类型



## HTTP 代理中间件
### 简介
这个 HTTP 代理中间件基于 `http-proxy-middleware` 库开发，专为 NestJS 应用程序设计，提供灵活的 API 代理功能。通过这个中间件，你可以轻松地将前端请求代理到不同的后端服务，解决跨域问题，并支持各种高级代理功能。

### 特性
+ 支持多个代理目标
+ 路径过滤与跳过
+ 路径重写
+ 防循环代理
+ 性能优化缓存

### 配置示例
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/inner'
      targetUrl: 'http://192.168.5.41:3013'
      pathRewrite: 
        '^/inner': '/inner'
    - proxyPrefix: '/'
      targetUrl: 'http://beta.yearrow.com'
      skipPath:
        - 'casInnerDemoServer'
        - 'inner'
```

### 配置参数说明
| 参数 | 类型 | 描述 |
| --- | --- | --- |
| `enable` | boolean | 是否启用代理 |
| `sites` | ProxyConfig[] | 代理配置数组 |
| `proxyPrefix` | string | 代理路径前缀 |
| `targetUrl` | string | 目标服务器 URL |
| `pathRewrite` | object | 路径重写规则 |
| `skipPath` | string[] | 要跳过的路径数组 |


### 高级配置示例
#### 带路径重写的代理
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api'
      targetUrl: 'http://backend-server.com'
      pathRewrite:
        '^/api': '' # 将 /api/users 重写为 /users
```

#### 带过滤的代理 
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api'
      targetUrl: 'http://backend-server.com'
      skipPath:
        - 'health'    # 跳过健康检查路径
        - 'metrics'   # 跳过指标路径
```

#### 多目标代理
```yaml
proxy:
  enable: true
  sites:
    - proxyPrefix: '/api/users'
      targetUrl: 'http://user-service.com'
    - proxyPrefix: '/api/products'
      targetUrl: 'http://product-service.com'
    - proxyPrefix: '/api/orders'
      targetUrl: 'http://order-service.com'
```


