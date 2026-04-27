---
title: "@cs/nest-cloud v3.0.1-beta.9 摘要"
type: summary
aliases: ["nest-cloud summary", "cs-nest-cloud-summary"]
tags: [nestjs, mwp, rpc, json-rpc, microservice, istio, graceful-shutdown]
status: draft
confidence: high
version: "3.0.1-beta.9"
sources:
  - "[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]"
related:
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-common]]"
  - "[[mwp-packages-project]]"
  - "[[json-rpc-2.0]]"
  - "[[microservice-exception-retry]]"
  - "[[graceful-shutdown]]"
created: 2026-04-27
updated: 2026-04-27
---

# @cs/nest-cloud v3.0.1-beta.9 摘要

## 一句话

@cs/nest-cloud 是 MWP Packages Project 的微服务核心框架包，提供基于 JSON-RPC 2.0 的服务间调用、统一异常体系（含 Istio 防雪崩重试协调）、优雅停机、上下文传播和启动编排。

## TL;DR

- **bootstrap + CSModule**：一行装饰器 + 一行启动函数即可完成 NestJS 微服务全配置，9 大策略按序执行
- **JSON-RPC 2.0 RPC 框架**：装饰器驱动服务注册（@RpcService/@RpcMethod/@RpcParam），RpcRegistry 自动发现分发，内置可视化文档页
- **统一异常体系**：RpcException → RpcBusinessException(业务) / RpcRetryableException(传输) / RpcInternalException(兜底)；协议无关，Filter 自动按 RPC/HTTP 选择序列化
- **Istio 防雪崩**：502/503/504 偏移 +10 → 512/513/514，shiftStatus 幂等，只有最近一跳重试
- **优雅停机**：5s 等待在途请求 + 10s 兜底强退 + 500ms fallback 信号处理
- **上下文传播**：HTTP (traceparent/B3/x-request-id) + RPC (X-User-Context base64 + hopCount 循环检测)
- **HttpService**：Axios 封装，classifyAxiosError 自动分类，所有外部调用必须通过它

## 核心论点

### 1. 装饰器驱动的 RPC 服务注册

@RpcService / @RpcMethod / @RpcParam 三个装饰器在类/方法/参数上标注元数据，RpcRegistry 在 OnModuleInit 阶段通过 NestJS DiscoveryService + MetadataScanner 自动收集，构建 `serviceName.methodName → instance + methodName + methodInfo` 映射表。运行时 executeMethod 按方法全名查找并调用，支持数组/对象/单值三种参数传递模式。

### 2. 协议无关异常 + 双路径序列化

业务代码统一抛 RpcException 及其子类。UnifiedExceptionFilter.catch() 通过 x-rpc-request 头或 POST /rpc 路径判定请求协议：
- RPC 路径 → JSON-RPC error body（非 retryable 返回 HTTP 200，retryable 返回 5xx）
- HTTP 路径 → rpcErrorToHttpError 映射为对应 HttpException

### 3. 防重试雪崩（状态码偏移 +10）

- RpcClient 收到下游 502/503/504 → shiftStatus 偏移为 512/513/514
- Istio retryOn: gateway-error 只匹配 502/503/504，偏移码不再触发
- shiftStatus 幂等：512/513/514 进入后原样返回，不会二次偏移
- 结果：重试只发生在离故障最近的一跳

### 4. 幂等性约束与 Istio 协同

- @RpcMethod(idempotent: true) → 未知运行时错误抛 RpcRetryableException（503），本层 Istio 可重试
- 默认 false → 未知错误抛 RpcInternalException，不重试
- 主动抛出的 RpcException/HttpException 不受 idempotent 影响

### 5. 上下文传播链路

- HTTP 入口：ContextMiddleware 提取 traceparent/B3/x-request-id → trackingId 优先级链
- RPC 出口：RpcClient.initContext 自动注入 X-User-Context + x-tracking-id + Istio trace headers
- RPC 入口：ContextMiddleware 解码 X-User-Context，累加 hopCount，>100 抛 508

## 我的加工意图

这份资料新建/更新了以下页面：

- [[entities/tools/cs-nest-cloud]] — 新建实体页
- [[concepts/foundations/json-rpc-2.0]] — 新建概念页
- [[concepts/patterns/microservice-exception-retry]] — 新建概念页
- [[concepts/patterns/graceful-shutdown]] — 新建概念页
- [[entities/projects/mwp-packages-project]] — 更新（从"未入库"移到"已入库"）
- [[entities/tools/cs-nest-common]] — 更新兄弟 package 状态

## 与旧版差异

首次入库，无旧版对比。

## 原文链接

- [[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]
