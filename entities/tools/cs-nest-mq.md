---
title: "@cs/nest-mq"
type: entity
aliases: ["@cs/nest-mq", "nest-mq", "cs-nest-mq", "NestJS 消息队列包"]
tags: [nestjs, mwp, package, tool, mq, rocketmq, message-queue]
status: draft
confidence: high
version: "1.0.3"
sources:
  - "[[2026-05-14-cs-nest-mq-v1.0.3]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-mq

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：1.0.3
- License：ISC
- 作者：danielmlc
- 定位：消息队列 — RocketMQ 5.x 集成（开源 + 腾讯云）

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v1.0.3 源码快照）

## 核心模块

### decorators/ — 装饰器

- **@Handler(topic, consumerGroup)** — 标注消费者方法
- **@Producer(topic)** — 标注生产者

### discovery/ — 自动发现

- **ConsumerDiscoveryService** — OnModuleInit 自动扫描装饰器，注册消费者

### providers/ — MQ 实现

- **OpenSourceRocketMQProvider** — 开源 RocketMQ 5.x
- **OpenSourceRocketMQConsumer** / **OpenSourceRocketMQProducer**
- **TencentRocketMQProvider** — 腾讯云 RocketMQ

### core/factory/ — 工厂模式

- **MqClientFactory** — 根据配置创建 Provider
- **ProviderRegistry** — Provider 注册表

### interfaces/ — 消息接口

- **Consumer** — 消费者接口
- **Producer** — 生产者接口
- **Message** — 消息结构
- **MqOptions** — MQ 配置

### MqModule — 动态模块

- `forRoot(options, isGlobal)` — 同步配置
- `forRootAsync(options, isGlobal)` — 异步配置

## 设计亮点

1. **装饰器驱动**：类似 RPC 模块的 @RpcService/@RpcMethod 模式
2. **双 RocketMQ 支持**：开源 + 云厂商无缝切换
3. **自动发现**：ConsumerDiscoveryService 扫描元数据注册消费者

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-common]]、[[cs-nest-config]]

## 引用来源

- [[2026-05-14-cs-nest-mq-v1.0.3]]