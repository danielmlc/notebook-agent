# @cs/nest-cloud - 应用启动 / CSModule / RPC / HTTP

> **源码**：[`libs/nest-cloud`](../../../libs/nest-cloud) ｜ **对齐版本**：v3.0.2 ｜ **同步时间**：2026-05-06 ｜ **当前源码版本**：v3.0.2 ｜ **状态**：✅ 已对齐

## 目录

- [概述](#概述)
- [安装](#安装)
- [bootstrap 启动](#bootstrap-启动)
- [CSModule 装饰器](#csmodule-装饰器)
- [RPC 服务端](#rpc-服务端)
- [RPC 客户端](#rpc-客户端)
- [RPC 异常体系（rpc.errors.ts）](#rpc-异常体系rpcerrorsts)
- [HTTP 客户端（HttpService）](#http-客户端httpservice)
- [健康检查端点（health.setup.ts）](#健康检查端点healthsetupts)
- [优雅停机（GracefulShutdownService）](#优雅停机gracefulshutdownservice)
- [装饰器工具（components/decorator/）](#装饰器工具componentsdecorator)
- [配置（config.yaml）](#配置configyaml)
- [环境变量](#环境变量)
- [关键约束](#关键约束)

## 概述

`@cs/nest-cloud` 是平台微服务的基础设施聚合包，负责：

- **应用启动**（`bootstrap`）：自动接入日志/中间件/拦截器/管道/异常过滤器/Swagger/健康检查/启动日志
- **共享模块装饰器**（`CSModule`）：自动注入 ConfigModule / ContextModule / LoggerModule / RpcModule / HttpModule
- **JSON-RPC 服务端 + 客户端**：装饰器声明 + 框架自动注册 + K8s DNS 自动寻址
- **HTTP 客户端**（`HttpService`）：内置 AxiosError → 框架异常自动分类
- **健康检查端点** `/health` `/ready`：供 K8s Liveness/Readiness 探针使用
- **优雅停机**：SIGTERM/SIGINT → 等待 5s 让在途请求完成 → 10s 兜底强退
- **统一异常体系**：`RpcException` / `RpcRetryableException` / `RpcBusinessException` 等

## 安装

```bash
pnpm add @cs/nest-cloud
```

`peerDependencies`（必需）：`@cs/nest-common`、`@cs/nest-config`。

## bootstrap 启动

```typescript
import { bootstrap } from '@cs/nest-cloud';
import { AppModule } from './app.module';

bootstrap(AppModule);

// 带回调
bootstrap(AppModule, async (app, config) => {
  // app: NestExpressApplication ｜ config: ConfigService
  console.log('服务已启动：', config.get('name'));
});
```

`bootstrap()` 内部按顺序执行（来自 `setup/index.ts`）：

1. `NestFactory.create()`（`bufferLogs: true`）
2. `app.enableShutdownHooks()` 启用生命周期钩子
3. 顺序应用：**LoggerStrategy → MiddlewareStrategy → BodyParserStrategy → InterceptorsStrategy → PipesStrategy → FilterStrategy → SwaggerStrategy → HealthStrategy → StartedStrategy**
4. 执行用户回调（如有）
5. 注册 SIGTERM/SIGINT 诊断日志 + 兜底信号处理（`GracefulShutdownService.registerFallbackSignalHandlers`）
6. 监听 `unhandledRejection` 和 `uncaughtException`（仅记录，不退出进程）

## CSModule 装饰器

替代 `@Module`，自动注入基础设施模块。

```typescript
function CSModule(
  sharedMetaData: ModuleMetadata,
  configOption?: ConfigOptions,        // 可选：覆盖 ConfigModule 配置
  options?: CSModuleOptions,           // 可选：开关子模块
): ClassDecorator;

interface CSModuleOptions {
  enableRpc?: boolean;   // 默认 true
  enableHttp?: boolean;  // 默认 true
}
```

**自动注入的模块**：
- `ConfigModule.forRoot({ configFilePath: './dist/config.yaml', onlyLocal: false, configFrom: 'gitea', ...configOption }, true)`
- `ContextModule.forRoot({ enableCaching: true, cacheTTL: -1 })`
- `LoggerModule.forRootAsync({ inject:[ConfigService], useFactory: cfg => cfg.get('logger') }, true)`
- `RpcModule.forRootAsync({ inject:[ConfigService], useFactory: cfg => cfg.get('rpc') }, true)` —— `enableRpc=false` 可关闭
- `HttpModule.forRegisterAsync({ inject:[ConfigService], useFactory: cfg => cfg.get('http') }, true)` —— `enableHttp=false` 可关闭

**默认 export**：`LoggerModule`、`ConfigModule`、`ContextModule`，以及（按需）`RpcModule`、`HttpModule`。
**默认 provide**：`GracefulShutdownService`。

```typescript
import { Global } from '@nestjs/common';
import { CSModule } from '@cs/nest-cloud';
import { ConfigService } from '@cs/nest-config';
import { DatabaseModule } from '@cs/nest-typeorm';

@Global()
@CSModule({
  imports: [
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({ ...cfg.get('mysql') }),
    }),
  ],
  exports: [DatabaseModule],
})
export class ShareModule {}
```

## RPC 服务端

### 装饰器（`rpc.decorators.ts`）

```typescript
@RpcService(options: RpcServiceOptions | string)         // 类装饰器
@RpcMethod(options?: RpcMethodOptions)                   // 方法装饰器
@RpcParam(options: RpcParamOptions | string)             // 参数装饰器
```

```typescript
interface RpcServiceOptions { name: string; description?: string; }
interface RpcMethodOptions {
  name: string;
  description?: string;
  returnType?: string;
  returnDescription?: string;
  /** 幂等：true 时未知运行时错误会被包装为 RpcRetryableException 触发 Istio 重试；默认 false */
  idempotent?: boolean;
}
interface RpcParamOptions {
  name: string;
  description?: string;
  type?: string;          // 'string' | 'number' | 'boolean' | 'array' | 'object'
  required?: boolean;
  defaultValue?: any;
}
```

### 示例

```typescript
import { Injectable } from '@nestjs/common';
import { RpcService, RpcMethod, RpcParam } from '@cs/nest-cloud';

@Injectable()
@RpcService({ name: 'user', description: '用户服务' })
export class UserRpcService {
  @RpcMethod({ name: 'getById', description: '根据 ID 查询用户', idempotent: true })
  async getById(
    @RpcParam({ name: 'userId', type: 'string', required: true }) userId: string,
  ) {
    return { userId, name: 'foo' };
  }
}
```

`RpcRegistry` 在 `OnModuleInit` 中自动扫描所有声明 `@RpcService` 的 provider，注册到 `/rpc` 入口。客户端通过 `${serviceName}.${methodName}` 调用（如 `user.getById`）。

### `/rpc` 控制器

`RpcController` 自动暴露：

- `POST /rpc` — JSON-RPC 2.0 调用入口
- `GET /rpc` — 获取所有已注册服务的元信息（`RpcServiceInfo[]`）
- `GET /rpc/docs` — RPC 可视化文档页面（仅当 `process.env.CS_DOCS_NAME` 设置时启用）

## RPC 客户端

注入 `RpcClient`：

```typescript
import { RpcClient } from '@cs/nest-cloud';

@Injectable()
export class OrderService {
  constructor(private readonly rpc: RpcClient) {}

  async getUser(userId: string) {
    return this.rpc.callWithExtract<{ userId: string }, UserDTO>({
      rpcConfig: { serviceName: 'node-pf-user-service', servicePath: 'userServer' },
      payload: { method: 'user.getById', params: { userId } },
    });
  }
}
```

### API

```typescript
class RpcClient {
  call<TParams, TResult>(req: RpcRequestClient<TParams>): Promise<JsonRpcResponse<TResult>>;
  callWithExtract<TParams, TResult>(req: RpcRequestClient<TParams>): Promise<TResult>;
  notify<TParams>(req: { rpcConfig; payload: Omit<ExtendedJsonRpcRequest, 'isNotify'>; reqOptions? }): Promise<void>;
  getNewId(): Promise<string>;
  getNewId(n: number): Promise<string[]>;
}

interface RpcRequestClient<TParams> {
  rpcConfig: {
    serviceName: string;
    servicePath?: string;
    namespace?: string;   // 跨命名空间调用时指定目标 K8s namespace
  };
  payload: { method: string; params?: TParams; isNotify?: boolean };
  reqOptions?: AxiosRequestConfig;
}
```

- `call()` — 返回完整 JSON-RPC 响应；调用方自己解 `result/error`
- `callWithExtract()` — 自动 `getRPCResult()`，错误自动抛 `RpcException`；`isNotify=true` 时返回 `undefined`
- `notify()` — 类型安全 fire-and-forget，强制 `isNotify=true`，返回 `Promise<void>`（传输层异常仍会抛）
- `getNewId()` — 调用 `node-pf-id-generation-service.id.batchCreateId` 的便捷封装

### 服务地址解析（`resolveServiceUrl`）

1. **配置优先**：`config.get('rpc').services.{serviceName}.url` 命中 → 使用该 URL（本地开发覆盖）
2. **K8s DNS 兜底**（按 `rpcConfig.namespace` 是否提供分两种）：
   - 同命名空间：`${protocol}://${serviceName}:${defaultPort || 8080}`
   - 跨命名空间：`${protocol}://${serviceName}.${namespace}:${defaultPort || 8080}`
3. 最终 URL = `<base>/<servicePath>/rpc`（有 servicePath）或 `<base>/rpc`（无 servicePath）

### 上下文与追踪头透传（`initContext`）

每次调用自动在请求头注入：
- `CONTEXT_HEADER`（`X-User-Context`）— `contextService.encodeContext(getAllContext())`
- `x-tracking-id` — 来自 `contextService.getContext('trackingId')`
- 全部 `traceHeaders` — 来自 `contextService.getContext('traceHeaders')`（Istio/Envoy 标准追踪头）

## RPC 异常体系（`rpc.errors.ts`）

```typescript
class RpcException extends Error {
  code: number;          // JSON-RPC error code
  data?: any;
  retryable: boolean;    // 默认 false
}

class RpcParseException extends RpcException;          // -32700
class RpcInvalidRequestException extends RpcException; // -32600
class RpcMethodNotFoundException extends RpcException; // -32601
class RpcInvalidParamsException extends RpcException;  // -32602
class RpcInternalException extends RpcException;       // -32603

class RpcRetryableException extends RpcException {
  httpStatus: number;    // 仅接受 {502,503,504,512,513,514}，其他强制折叠为 503
  static TRANSPORT_STATUS_CODES: Set<number>;
  static RETRYABLE_TO_SHIFTED: Map<number, number>;  // 502→512, 503→513, 504→514
  static shiftStatus(s: number): number;             // 幂等
}

class RpcBusinessException extends RpcException {
  // code 必须 >= 1000；与协议级负数 code 隔离
  // 可在 data.httpStatus 中指定 HTTP 映射状态码
}
```

**状态码偏移机制**：`RpcClient.call()` 收到下游 502/503/504 后偏移为 512/513/514，本层 Istio 已重试过，偏移后上层 Istio 的 `gateway-error` 重试不再匹配，防止雪崩。`shiftStatus` 幂等：512/513/514 原样传递不二次偏移。

**幂等方法运行时错误**：`@RpcMethod({ idempotent: true })` 声明的方法，未知错误自动包装为 `RpcRetryableException`；非幂等方法包装为 `RpcInternalException`。`RpcException` 子类与 `HttpException` 原样透传。

## HTTP 客户端（`HttpService`）

通过 `CSModule` 自动加载（`enableHttp` 默认 true），无需手动 `import HttpModule`。

```typescript
import { HttpService } from '@cs/nest-cloud';

@Injectable()
export class WeatherService {
  constructor(private readonly http: HttpService) {}

  async fetch(city: string) {
    return this.http.get<WeatherDTO>(`https://api.example.com/weather/${city}`);
  }
}
```

### API

```typescript
class HttpService {
  request<T>(config: HttpModuleOptions<T>): Promise<T>;
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T>(url: string, data?: any, config?): Promise<T>;
  put<T>(url: string, data?: any, config?): Promise<T>;
  delete<T>(url: string, data?: any, config?): Promise<T>;
  getAxiosInstance(): AxiosInstance;
  addRequestInterceptor(...): number;
  addResponseInterceptor(...): number;
  removeRequestInterceptor(id: number): void;
  removeResponseInterceptor(id: number): void;
}
```

### AxiosError 自动分类

`HttpService` 在响应拦截器中将 `AxiosError` 统一转为框架异常：

| Axios 错误类型 | 转换为 |
|---|---|
| 网络错误（无 response，超时 ECONNABORTED/ETIMEDOUT） | `RpcRetryableException`（504，偏移→514） |
| 网络错误（其他无 response） | `RpcRetryableException`（503，偏移→513） |
| HTTP 502/503/504 | `RpcRetryableException`（偏移→512/513/514） |
| 其他 HTTP 错误（4xx/5xx） | `RpcException` |

业务代码只需 `try/catch` 捕获 `RpcException` 及其子类。

## 健康检查端点（`health.setup.ts`）

默认启用，`config.get('health').enabled === false` 可关闭。

- `GET /health` — Liveness：仅确认进程存活，返回 `{ status, timestamp, service: process.env.CS_NAME }`
- `GET /ready` — Readiness：可扩展自定义检查（当前仅 `process: 'ok'`），失败返回 503

## 优雅停机（`GracefulShutdownService`）

实现 `BeforeApplicationShutdown` 钩子，由 `enableShutdownHooks()` 触发：

1. 收到 SIGTERM/SIGINT → 等待 **5s** 让在途请求完成（给 Istio/K8s 时间切流量）
2. 等待结束 → NestJS 模块清理流程
3. **10s 兜底强退**：模块清理超时则 `process.exit(0)`（用 `unref()` 避免阻塞事件循环）

`bootstrap()` 还会注册 `registerFallbackSignalHandlers`：500ms 后若 NestJS hooks 未接管，手动调 `app.close()`。

## 装饰器工具（`components/decorator/`）

```typescript
import { skipTransformInterceptor } from '@cs/nest-cloud';

@Controller('files')
export class FileController {
  @Get(':id/download')
  @skipTransformInterceptor()  // 跳过 TransformInterceptor 的统一响应包装
  download() { /* 直接返回二进制流 */ }
}
```

## 配置（`config.yaml`）

```yaml
application:
  name: 'node-pf-user-service'
  port: 3010
  serverPath: 'userServer'

logger:
  level: 'verbose'

rpc:
  protocol: 'http'                 # 必填
  timeout: 10000                   # 默认 10s
  defaultPort: 8080                # K8s DNS 默认端口
  services:                        # 可选：覆盖特定服务地址（本地开发用）
    node-pf-id-generation-service:
      url: 'http://localhost:3001/idGenerationServer'

http:                              # axios 配置 + interceptors（可选）
  timeout: 5000

health:
  enabled: true                    # 默认启用，false 可关闭 /health 和 /ready
```

## 环境变量

`bootstrap()` 与启动日志读取以下环境变量：

| 变量 | 用途 |
|---|---|
| `CS_NAME` | 服务名（启动日志、/health 响应） |
| `CS_HOST` | 启动日志中的 host |
| `CS_PORT` | 监听端口（必填） |
| `CS_SERVERPATH` | URL 前缀（与 `application.serverPath` 对应） |
| `CS_SERVICEENV` | 环境标识（启动日志） |
| `CS_DOCS_NAME` / `CS_DOCS_DESCRIBE` / `CS_DOCS_VERSION` | 启用 `/rpc/docs` 可视化页面 |

## 关键约束

1. **必须用 `bootstrap()` 启动应用**，禁止自定义 `NestFactory.create` 调用
2. **必须用 `@CSModule` 替代 `@Module`** 定义 `ShareModule`，禁止手动重复注册 ConfigModule/LoggerModule/ContextModule/RpcModule/HttpModule
3. **HTTP 客户端用 `HttpService`**，不要直接 `import axios`（绕过异常分类）
4. **业务异常用 `RpcBusinessException`**（code ≥ 1000），不要用普通 `Error` 抛业务错误
5. **传输错误用 `RpcRetryableException`**，httpStatus 仅用 502/503/504/512/513/514，其他强制折叠为 503
6. **幂等方法显式声明** `@RpcMethod({ idempotent: true })`，否则未知错误不会触发 Istio 重试
