---
title: "@cs/nest-schedule"
type: entity
aliases: ["@cs/nest-schedule", "nest-schedule", "NestJS 定时任务包", "XXL-Job 执行器"]
tags: [nestjs, mwp, package, tool, schedule, cron, xxl-job]
status: draft
confidence: high
version: "1.0.4"
sources:
  - "[[2026-05-14-cs-nest-schedule-v1.0.4]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-schedule

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：1.0.4
- License：ISC
- 作者：danielmlc
- 定位：分布式定时任务执行器 — 基于 XXL-Job
- 核心依赖：axios ^1.6.0, express ^4.18.0
- 强制 peerDependencies：@cs/nest-common, @cs/nest-config, @nestjs/common, @nestjs/core

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v1.0.4 源码快照）

## 核心模块

### core/executor/ — 任务执行器

- **JobExecutorService**：执行任务逻辑，调用处理器
- **JobContext**：任务执行上下文（参数、日志、追踪）
- **JobHandlerRegistry**：处理器注册表，管理任务处理器映射

### core/registry/ — 注册与心跳

- **RegistryService**：执行器注册到 XXL-Job Admin
- **HeartbeatService**：定时心跳保活

### core/http/ — HTTP 服务

- **HttpServerService**：接收 Admin 调度请求
- **CallbackService**：执行结果回调

### core/log/ — 日志管理

- **LogFileService**：日志文件读写
- **LogCleanupService**：日志定期清理
- **LogReaderService**：日志查询服务

### core/metrics/ — 监控指标

- **MetricsService**：任务执行统计（成功/失败/耗时）

### decorators/ — 装饰器

- **@JobHandler(jobName)** — 标注任务处理器方法

### discovery/ — 自动发现

- **JobHandlerDiscoveryService** — OnModuleInit 扫描装饰器，注册任务处理器

### ScheduleModuleOptions — 配置接口

```typescript
interface ScheduleModuleOptions {
  adminAddresses: string[];    // XXL-Job Admin 地址
  accessToken?: string;        // 访问令牌
  appName: string;             // 执行器名称
  port?: number;               // 执行器端口（默认 9999）
  logPath?: string;            // 日志路径
  logRetentionDays?: number;   // 日志保留天数
  enableAutoRegistry?: boolean; // 自动注册（默认 true）
  heartbeatInterval?: number;  // 心跳间隔（默认 30s）
  enableMetrics?: boolean;     // 启用监控
}
```

## 设计亮点

1. **装饰器驱动**：@JobHandler 标注处理器，自动发现注册
2. **分布式执行**：基于 XXL-Job 调度中心，支持多实例协调
3. **日志持久化**：任务执行日志本地存储，支持 Admin 查询
4. **监控指标**：任务执行统计，便于监控告警
5. **上下文传播**：与 @cs/nest-common ContextService 集成

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-common]]、[[cs-nest-config]]

## 引用来源

- [[2026-05-14-cs-nest-schedule-v1.0.4]]