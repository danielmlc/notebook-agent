---
title: "@cs/nest-files v1.2.8 摘要"
type: summary
aliases: ["nest-files summary", "cs-nest-files-summary"]
tags: [nestjs, mwp, files, storage, oss, minio, cos]
status: draft
confidence: high
version: "1.2.8"
sources:
  - "[[2026-05-14-cs-nest-files-v1.2.8]]"
related:
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
  - "[[mwp-packages-project]]"
created: 2026-05-14
updated: 2026-05-14
---

# @cs/nest-files v1.2.8 摘要

## 一句话

@cs/nest-files 是 MWP Packages Project 的文件存储包，提供统一的文件存储抽象层，支持阿里云 OSS、MinIO、腾讯云 COS 多云适配。

## TL;DR

- **FileStorageService**：统一文件操作接口（上传/下载/删除/签名 URL）
- **多云适配**：阿里云 OSS / MinIO / 腾讯云 COS，工厂模式自动选择
- **AbstractStorageProvider**：抽象存储提供者，定义统一接口
- **FileStorageModule**：forRoot / forRootAsync 动态模块配置
- **适配器模式**：FileStorageAdapter + FileStorageFactory 动态创建 Provider

## 核心论点

### 1. 抽象存储提供者模式

`AbstractStorageProvider` 定义统一文件操作接口，各云厂商实现具体逻辑：
- `AliOssProvider` — 阿里云 OSS
- `MinioProvider` — MinIO
- `TencentCosProvider` — 腾讯云 COS

### 2. 工厂模式动态选择

`FileStorageFactory` 根据配置自动创建对应的 StorageProvider 实例，业务代码无需感知底层实现。

### 3. FileStorageService 统一入口

业务层只依赖 `FileStorageService`，通过它调用底层 Provider 完成文件操作。

## 我的加工意图

这份资料新建/更新了以下页面：

- [[entities/tools/cs-nest-files]] — 新建实体页

## 与旧版差异

首次入库，无旧版对比。

## 原文链接

- [[2026-05-14-cs-nest-files-v1.2.8]]