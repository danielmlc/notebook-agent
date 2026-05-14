---
title: "@cs/sql-parser"
type: entity
aliases: ["@cs/sql-parser", "sql-parser", "SQL 解析器", "ANTLR4 SQL Parser"]
tags: [nestjs, mwp, package, tool, sql, parser, antlr4, mysql, tidb]
status: draft
confidence: high
version: "2.0.0"
sources:
  - "[[2026-05-14-cs-sql-parser-v2.0.0]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-typeorm]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/sql-parser

## 基本信息

- 类别：工具 / Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：2.0.0
- License：ISC
- 作者：danielmlc
- 定位：SQL 解析器 — 基于 ANTLR4，支持租户隔离和库名改写
- 核心依赖：antlr4ng ^3.0.16
- 支持：MySQL / TiDB 方言

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v2.0.2 源码快照）

## 核心模块

### parser/ — 解析器

- **BaseParser** — 解析器基类
- **MySqlParser** — MySQL 方言解析器
- **ParserFactory** — 解析器工厂

### adapter/ — 适配器

- **BaseAdapter** — 适配器基类
- **MySqlAdapter** — MySQL 适配器
- **AdapterFactory** — 适配器工厂

### listeners/ — 监听器（改写逻辑）

- **TenantFilterListener** — 租户过滤，自动注入 tenant_id 条件
- **DatabaseRewriteListener** — 库名改写，动态切换数据库
- **HintListener** — SQL Hint 解析和传递

### orchestrator/ — 编排器

- **SQLProcessorOrchestrator** — 协调解析、改写、输出

### SqlParserService — 静态 API

```typescript
class SqlParserService {
  static rewriteWithTenant(sql: string): string       // 租户过滤改写
  static rewriteWithDetails(sql: string): RewriteResult // 详细结果
  static batchRewrite(sqlList: string[]): string[]    // 批量处理
  static setTenantField(fieldName: string): void      // 设置租户字段
  static setTargetDatabases(config): void             // 设置目标库
  static addDatabasePrefix(prefix: string): void      // 添加库前缀
}
```

### RewriteResult — 输出接口

```typescript
interface RewriteResult {
  sql: string;            // 改写后的 SQL
  tables: TableInfo[];    // 涉及的表
  hints: HintInfo[];      // 解析的 Hint
  tenantIds: string[];    // 检测到的租户 ID
}
```

## 设计亮点

1. **ANTLR4 解析**：完整的语法树解析，支持复杂 SQL
2. **租户隔离**：自动注入 tenant_id 条件，实现多租户隔离
3. **库名改写**：动态改写数据库前缀，支持多库切换
4. **Hint 支持**：解析和传递 SQL Hint，保持执行提示
5. **MySQL/TiDB 双方言**：支持两种数据库方言

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 被依赖：[[cs-nest-typeorm]]（ORM 封装使用）

## 引用来源

- [[2026-05-14-cs-sql-parser-v2.0.0]]