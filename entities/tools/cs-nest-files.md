---
title: "@cs/nest-files"
type: entity
aliases: ["@cs/nest-files", "nest-files", "cs-nest-files", "NestJS 文件存储包"]
tags: [nestjs, mwp, package, tool, files, storage, oss, minio, cos]
status: draft
confidence: high
version: "1.2.8"
sources:
  - "[[2026-05-14-cs-nest-files-v1.2.8]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-files

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：1.2.8
- License：ISC
- 作者：danielmlc
- 定位：文件存储 — 多云统一抽象层
- 支持存储：阿里云 OSS / MinIO / 腾讯云 COS

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v1.2.8 源码快照）

## 核心模块

### providers/ — 云存储实现

- **AbstractStorageProvider**：抽象存储提供者，定义统一接口
- **AliOssProvider**：阿里云 OSS 实现
- **MinioProvider**：MinIO 实现
- **TencentCosProvider**：腾讯云 COS 实现

### FileStorageFactory — 工厂模式

- 根据配置自动创建对应 StorageProvider
- 业务代码无需感知底层实现

### FileStorageService — 统一入口

- 上传 / 下载 / 删除 / 签名 URL 等文件操作
- 通过工厂模式委托给具体 Provider

### FileStorageModule — 动态模块

- `forRoot(options, isGlobal)` — 同步配置
- `forRootAsync(options, isGlobal)` — 异步配置

### interfaces/ — 配置接口

- `FileStorageOptions` — 存储配置
- `FileStorageInterface` — 存储操作接口

## 设计亮点

1. **抽象工厂模式**：统一接口 + 多云适配
2. **零侵入切换**：改配置即可切换云厂商
3. **适配器模式**：FileStorageAdapter 桥接 Service 与 Provider

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-common]]、[[cs-nest-config]]

## 引用来源

- [[2026-05-14-cs-nest-files-v1.2.8]]