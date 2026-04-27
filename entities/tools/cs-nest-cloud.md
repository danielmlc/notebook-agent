---
title: "@cs/nest-cloud"
type: entity
aliases: ["@cs/nest-cloud", "nest-cloud", "cs-nest-cloud", "NestJS 微服务核心框架", "云平台核心包"]
tags: [nestjs, mwp, package, tool, rpc, json-rpc, microservice, istio, graceful-shutdown, http-proxy]
status: draft
confidence: high
version: "3.0.1-beta.9"
sources:
  - "[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-redis]]"
  - "[[json-rpc-2.0]]"
  - "[[microservice-exception-retry]]"
  - "[[graceful-shutdown]]"
created: 2026-04-27
updated: 2026-04-27
last_reviewed: 2026-04-27
---

# @cs/nest-cloud

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：3.0.1-beta.9
- License：ISC
- 作者：danielmlc
- 定位：微服务核心框架 — 服务启动、注册、跨服务调用
- 核心依赖：axios ^0.27.2, body-parser ^1.20.3, cookie-parser ^1.4.7, nacos ^2.6.0, http-proxy-middleware ^3.0.3
- 强制 peerDependencies：@cs/nest-common, @cs/nest-config

## 关键事件 / 里程碑

- 2026-04-27 · 首次入库（基于 v3.0.1-beta.9 源码快照）

## 核心模块

### app.bootstrap.ts — 启动编排

- `bootstrap(rootModule, appStartedCall?)`：初始化 NestJS 应用，9 大策略按序执行
- 启用 ShutdownHooks，注册 GracefulShutdownService 兜底
- 捕获 unhandledRejection / uncaughtException（记录但不退出）

### base.metadata.ts — CSModule 装饰器

- `CSModule(sharedMetaData, configOption?, options?)`：替代 @Module 的装饰器工厂
- 自动组装 ConfigModule + ContextModule + LoggerModule + RpcModule + HttpModule
- options.enableRpc / options.enableHttp 控制按需加载

### rpc/ — JSON-RPC 2.0 框架

- **RpcModule**：forRoot / forRootAsync 动态模块，全局注册
- **@RpcService / @RpcMethod / @RpcParam**：装饰器驱动服务注册
- **RpcRegistry**：OnModuleInit 自动扫描元数据，构建方法映射表，运行时分发
- **RpcClient**：注入式客户端 — call / callWithExtract / notify / getNewId
- **RpcController**：POST /rpc 入口 + GET /rpc JSON 文档 + GET /rpc/docs 可视化 HTML 页
- **异常体系**：RpcException → RpcBusinessException / RpcRetryableException / RpcInternalException 等
- **Istio 防雪崩**：shiftStatus 幂等偏移（502→512, 503→513, 504→514）

### http/ — 外部 HTTP 调用

- **HttpService**：Axios 封装，classifyAxiosError 自动分类异常
- 网络失败 → RpcRetryableException（偏移码）；4xx/非502-504 5xx → RpcException
- 设计意图：所有外部调用必须通过 HttpService，禁止裸用 axios

### components/ — 公共组件

- **UnifiedExceptionFilter**：区分 RPC/HTTP 请求，双路径序列化
- **ContextMiddleware**：HTTP traceparent/B3/x-request-id 优先级链 + RPC X-User-Context 解码 + hopCount 循环检测
- **TransformInterceptor**：统一 HTTP 响应格式（code/status/message/result）
- **LoggingInterceptor**：请求/响应日志（可配置 moreInfo）
- **skipTransformInterceptor**：跳过响应转换的装饰器
- **ProxyMiddleware**：http-proxy-middleware 封装，多站点 + 路径缓存 + 防循环
- **GracefulShutdownService**：优雅停机（5s 等待 + 10s 强退 + 500ms fallback）

### setup/ — 启动策略

9 大策略按序执行：Logger → Middleware → BodyParser → Interceptors → Pipes → Filter → Swagger → Health → Started

### json-rpc/ — 协议层

- **types.ts**：JsonRpcRequest / JsonRpcResponse / RpcErrorCode 枚举
- **utils.ts**：validateJsonRpcRequest / createJsonRpcSuccess / createJsonRpcError
- **client.ts**：JsonRpcClient（axios 封装，uuid v4 请求 ID）
- **rpc-helpers.ts**：getRPCResult 解包 + 类型守卫
- **rpc-error-transformer.ts**：RpcErrorCode → HttpException 映射

## 设计亮点

1. **协议无关异常**：业务代码只抛 RpcException，Filter 按请求协议自动选择序列化，业务无需感知调用方式
2. **防重试雪崩**：shiftStatus 幂等偏移，使 Istio 重试只发生在最近一跳，不随调用层数指数放大
3. **幂等性标注**：@RpcMethod(idempotent) 控制未知错误的处理策略，与 Istio retryOn 协同
4. **上下文全链路传播**：从 HTTP 入口到 RPC 出口，traceparent/B3/x-request-id + X-User-Context 自动透传
5. **装饰器驱动的自文档化**：@RpcService/@RpcMethod/@RpcParam 的 description 自动生成可视化文档页

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 兄弟 package：[[cs-nest-common|@cs/nest-common]]、[[cs-nest-redis|@cs/nest-redis]]
- 核心概念：[[json-rpc-2.0]]、[[microservice-exception-retry]]、[[graceful-shutdown]]

## 引用来源

- [[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]
