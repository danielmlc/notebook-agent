---
title: 微服务异常与重试策略
type: concept
aliases: ["microservice exception retry", "异常重试", "防重试雪崩", "Istio 重试协调", "status code shift", "状态码偏移"]
tags: [microservice, exception, retry, istio, circuit-breaker, resilience]
status: stub
confidence: high
sources:
  - "[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]"
related:
  - "[[cs-nest-cloud]]"
  - "[[json-rpc-2.0]]"
  - "[[graceful-shutdown]]"
created: 2026-04-27
updated: 2026-04-27
last_reviewed: 2026-04-27
---

# 微服务异常与重试策略

## 一句话定义

> 在微服务调用链中，通过异常分类、重试边界控制和状态码偏移，防止瞬态错误引发重试雪崩，确保重试只发生在离故障最近的一跳。

## 展开解释

### 核心问题

微服务调用链（A → B → C → D）中，如果每层都配置 Istio 重试，下游瞬态故障会导致指数级重试放大：A 重试 3 次 × B 重试 3 次 × C 重试 3 次 = 27 倍请求冲击。

### @cs/nest-cloud 的解决方案

1. **异常分类**：
   - RpcBusinessException：业务错误，code >= 1000，HTTP 200 + error body，不重试
   - RpcRetryableException：传输层瞬态错误，httpStatus 白名单 {502,503,504,512,513,514}，触发重试
   - RpcInternalException：未知错误兜底，HTTP 200 + error body，不重试

2. **状态码偏移（shiftStatus +10）**：
   - 收到下游 502/503/504 → 偏移为 512/513/514 再抛出
   - Istio retryOn: gateway-error 只匹配 502/503/504，偏移码不触发上层重试
   - shiftStatus 幂等：已偏移的 512/513/514 原样返回，不二次偏移
   - **结果**：只有离故障最近的一跳触发 Istio 重试

3. **幂等性约束**：
   - @RpcMethod(idempotent: true) → 未知运行时错误抛 503，Istio 可重试
   - 默认 false → 未知错误抛 RpcInternalException，不重试
   - 主动抛出的 RpcException / HttpException 不受 idempotent 影响

4. **RpcClient timeout 约束**：
   - 必须 >= perTryTimeout × attempts + 1s 缓冲
   - 默认 10s 足够覆盖 3 × 2s

### 设计原则

- **协议无关**：业务代码只抛 RpcException，Filter 按请求协议自动选择序列化
- **异常语义透传**：code/message/data 沿链路原样保留
- **重试与业务分离**：retryable 标志只表达瞬态错误，httpStatus 白名单精确控制 Istio 行为

## 与其他概念的关系

- 上位：分布式系统韧性（Resilience）
- 并列：[[graceful-shutdown]]（另一维度的韧性保障）、熔断器（Circuit Breaker）
- 对立：无重试策略（让所有错误直接暴露）
- 被使用于：[[cs-nest-cloud]]

## 引用来源

- [[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]

## 演进记录

- 2026-04-27 · 初建（来源：[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]）
