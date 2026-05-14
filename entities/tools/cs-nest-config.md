---
title: "@cs/nest-config"
type: entity
aliases: ["@cs/nest-config", "nest-config", "cs-nest-config", "NestJS 配置管理包"]
tags: [nestjs, mwp, package, tool, config, nacos, yaml]
status: draft
confidence: high
version: "4.0.1"
sources:
  - "[[2026-05-14-cs-nest-config-v4.0.1]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-cloud]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-config

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：4.0.1
- License：ISC
- 作者：danielmlc
- 定位：配置管理 — 本地 YAML + 远程配置中心多层合并
- 核心依赖：axios ^0.27.2, js-yaml ^4.1.0, lodash ^4.17.21, nacos ^2.6.0
- 强制 peerDependencies：@cs/nest-common

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v4.0.1 源码快照）

## 核心模块

### ConfigModule — 动态模块

- `forRoot(options, isGlobal)` — 同步配置，自动从远程获取
- `forRootAsync(options, isGlobal)` — 异步配置
- 默认全局注册

### ConfigOptions — 配置接口

```typescript
interface ConfigOptions {
  configFilePath: string;    // 本地 YAML 文件路径
  onlyLocal?: boolean;       // 仅使用本地配置
  configFrom?: 'gitea' | 'nacos';  // 配置中心来源
}
```

### resloveConfig() — 配置合并核心

多层合并策略：
- 本地开发（dev/beta/dev-mc）：localConfig > envConfig > appConfig > defaultConfig
- 生产环境：serverConfig > appConfig > defaultConfig
- 支持 `profiles.active` 多 profile（逗号分隔）
- `coverConfigFn()` 处理覆盖配置
- `convertType()` 自动类型转换
- `read2Env()` 注入环境变量（`CS_*`）

### ConfigService — 配置查询

- `get(key)` → lodash `_get()` 嵌套路径支持
- `isConfig(key)` → 检查存在
- `getAll()` → 返回完整配置

### config/ — 配置结构

- `config.default.ts` — 系统默认配置
- `config.env.ts` — 环境变量映射默认值
- `config.schema.interface.ts` — 配置接口定义

### nacos.config.ts — Nacos 集成

- 从 Nacos 配置中心获取远程配置
- 支持 Nacos 命名空间和分组

## 设计亮点

1. **多层合并**：defaultsDeep 保证配置优先级清晰
2. **环境区分**：dev/beta 自动使用本地配置优先
3. **类型自动转换**：字符串 'true'/'false' → boolean
4. **环境变量注入**：统一注入 CS_* 环境变量

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-common]]
- 被依赖：[[cs-nest-cloud]]、[[cs-nest-auth-client]]、[[cs-nest-cas-client]]、[[cs-nest-redis]]

## 引用来源

- [[2026-05-14-cs-nest-config-v4.0.1]]