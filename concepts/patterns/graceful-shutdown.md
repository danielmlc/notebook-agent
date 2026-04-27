---
title: 优雅停机
type: concept
aliases: ["graceful shutdown", "优雅关闭", "平滑停机", "Graceful Shutdown", "SIGTERM handling"]
tags: [microservice, kubernetes, istio, resilience, shutdown, signal]
status: stub
confidence: high
sources:
  - "[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]"
related:
  - "[[cs-nest-cloud]]"
  - "[[microservice-exception-retry]]"
created: 2026-04-27
updated: 2026-04-27
last_reviewed: 2026-04-27
---

# 优雅停机

## 一句话定义

> 在收到 SIGTERM/SIGINT 信号后，等待在途请求完成、释放资源、再退出进程，避免 K8s/Istio 环境下流量丢失。

## 展开解释

### K8s/Istio 下的停机时序

1. K8s 发 SIGTERM → Pod 标记 Terminating
2. Istio/Envoy 开始将流量切走（但已建立的请求仍在处理）
3. 进程需要等待在途请求完成
4. K8s 在 terminationGracePeriodSeconds 后发 SIGKILL 强杀

### @cs/nest-cloud 的实现

GracefulShutdownService 实现了三层保障：

1. **NestJS enableShutdownHooks**：标准生命周期钩子
   - SIGTERM/SIGINT → BeforeApplicationShutdown → OnModuleDestroy → app.close()

2. **beforeApplicationShutdown**：
   - 等 5s 让在途请求完成（给 Istio 切流量时间）
   - 兜底 10s 后强退（setTimeout + unref()，不阻塞事件循环自然退出）

3. **Fallback 信号处理**：
   - 500ms 延迟后检查 NestJS hooks 是否已接管
   - 未接管时手动调用 app.close()
   - 防止 npm 未透传信号或 enableShutdownHooks 不生效

### 关键设计决策

- **10s 强退 timer 使用 unref()**：若模块正常清理完毕进程自然退出，timer 不触发；若清理超时才兜底
- **shuttingDown / shutdownInProgress 双标志**：防止并发执行
- **诊断日志**：SIGTERM/SIGINT 到达时打印，确认信号是否到达 Node.js 进程（npm 可能未透传）

## 与其他概念的关系

- 上位：分布式系统韧性（Resilience）
- 并列：[[microservice-exception-retry]]（另一维度的韧性保障）
- 依赖：K8s terminationGracePeriodSeconds 配置、Istio 流量切走机制
- 被使用于：[[cs-nest-cloud]]

## 引用来源

- [[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]

## 演进记录

- 2026-04-27 · 初建（来源：[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]）
