---
title: "@cs/nest-cloud v3.0.3 摘要"
type: summary
aliases: ["nest-cloud summary", "cs-nest-cloud-summary"]
tags: [nestjs, mwp, rpc, json-rpc, microservice, istio, graceful-shutdown]
status: draft
confidence: high
version: "3.0.3"
supersedes: "[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]"
sources:
  - "[[2026-05-14-cs-nest-cloud-v3.0.3]]"
related:
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-common]]"
  - "[[mwp-packages-project]]"
  - "[[json-rpc-2.0]]"
  - "[[microservice-exception-retry]]"
  - "[[graceful-shutdown]]"
created: 2026-05-14
updated: 2026-05-14
---

# @cs/nest-cloud v3.0.3 摘要

## 一句话

@cs/nest-cloud 是 MWP Packages Project 的微服务核心框架包，提供基于 JSON-RPC 2.0 的服务间调用、统一异常体系（含 Istio 防雪崩）、优雅停机、上下文传播和启动编排。

## TL;DR

- **bootstrap + CSModule**：一行装饰器 + 一行启动函数完成 NestJS 微服务全配置，9 大策略按序执行
- **JSON-RPC 2.0 RPC 框架**：装饰器驱动服务注册，RpcRegistry 自动发现分发，内置可视化文档页
- **统一异常体系**：RpcException → Business/Retryable/Internal；协议无关，Filter 双路径序列化
- **Istio 防雪崩**：502/503/504 偏移 +10 → 512/513/514，shiftStatus 幂等
- **优雅停机**：5s 等待 + 10s 兜底强退 + 500ms fallback 信号处理
- **上下文传播**：HTTP (traceparent/B3/x-request-id) + RPC (X-User-Context base64 + hopCount)
- **HttpService**：Axios 封装，classifyAxiosError 自动分类

## 核心论点

### 1. 装饰器驱动的 RPC 服务注册

@RpcService / @RpcMethod / @RpcParam 在类/方法/参数上标注元数据，RpcRegistry 在 OnModuleInit 阶段自动收集，构建 `serviceName.methodName → instance + methodName` 映射表。

### 2. 协议无关异常 + 双路径序列化

UnifiedExceptionFilter 通过 x-rpc-request 头判定协议：
- RPC 路径 → JSON-RPC error body
- HTTP 路径 → rpcErrorToHttpError 映射

### 3. 防重试雪崩（状态码偏移 +10）

shiftStatus 幂等偏移，使 Istio retryOn 只在最近一跳生效。

### 4. 优雅停机三层保护

- NestJS enableShutdownHooks
- GracefulShutdownService beforeApplicationShutdown（5s 等待）
- 兜底 500ms fallback + 10s timeout

## 与旧版差异

### 新增（v3.0.3 引入）

- 版本从 beta（3.0.1-beta.9）升级为正式版（3.0.3）
- bootstrap 增加 SIGTERM/SIGINT 诊断日志
- unhandledRejection / uncaughtException 仅记录，不退出进程（v3.0.1-beta.9 亦有）

### 仍然成立（沿用 v3.0.1-beta.9）

- 代码目录结构完全相同
- 9 大策略执行顺序不变
- CSModule 装饰器接口不变（enableRpc / enableHttp）
- RPC 模块核心设计不变（装饰器驱动 + Registry 分发）
- 异常体系设计不变（RpcException + shiftStatus）
- 优雅停机逻辑不变（5s + 10s + 500ms）

### 被推翻（v3.0.3 取代旧断言）

- 无明显断言被推翻，主要为版本迭代

## 我的加工意图

这份资料新建/更新了以下页面：

- [[entities/tools/cs-nest-cloud]] — 更新版本号与演进记录

## 原文链接

- [[2026-05-14-cs-nest-cloud-v3.0.3]]