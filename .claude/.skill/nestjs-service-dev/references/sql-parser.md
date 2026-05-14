# @cs/sql-parser - SQL 改写引擎

> **源码**：[`libs/sql-parser`](../../../libs/sql-parser) ｜ **对齐版本**：v2.0.0 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [概述](#概述)
- [安装](#安装)
- [核心 API](#核心-api)
- [配置结构](#配置结构)
- [结果类型](#结果类型)
- [Hint 格式](#hint-格式)
- [处理流程](#处理流程)
- [使用示例](#使用示例)
- [租户 ID 验证规则](#租户-id-验证规则)
- [已知边界 Case（v2.0.0）](#已知边界-casev200)

## 概述

基于 ANTLR4 的 MySQL SQL 改写引擎，支持：

- 多租户条件自动注入（通过 SQL Hint）
- 库名前缀改写（跨环境数据库隔离）
- 使用 TokenStreamRewriter 非破坏性改写，保留原始格式和注释

通常无需直接使用，由 [`@cs/nest-typeorm`](nest-typeorm.md) 的 `DatabaseModule` 通过 `SqlProcessorConfig` 间接调用。

## 安装

```bash
pnpm add @cs/sql-parser
```

## 核心 API

### SqlParserService（静态 API）

```typescript
import SqlParserService from '@cs/sql-parser';

// SQL 改写
SqlParserService.rewriteWithTenant(sql: string): string
SqlParserService.rewriteWithDetails(sql: string): RewriteResult
SqlParserService.batchRewrite(sqlList: string[]): string[]
SqlParserService.batchRewriteWithDetails(sqlList: string[]): RewriteResult[]

// 配置
SqlParserService.setConfig(config: Partial<SqlParserConfig>): void
SqlParserService.updateConfig(config: Partial<SqlParserConfig>): void
SqlParserService.setTenantField(fieldName: string): void
SqlParserService.addDatabasePrefix(prefix: string): void
SqlParserService.addDatabaseName(dbName: string): void
SqlParserService.setDefaultDatabase(dbName: string): void

// Hint 工具
SqlParserService.extractHint(sql: string): HintInfo | undefined
SqlParserService.hasHint(sql: string): boolean
SqlParserService.removeHints(sql: string): string
SqlParserService.createHint(tenant: string): string
SqlParserService.addHintToSql(sql: string, tenant: string): string

// 校验工具
SqlParserService.validateSql(sql: string): boolean
SqlParserService.getSqlType(sql: string): string | null
SqlParserService.isValidTenant(tenant: string): boolean
```

### SqlRewriter（实例 API）

适用于需要独立配置的场景：

```typescript
import { SqlRewriter } from '@cs/sql-parser';

const rewriter = new SqlRewriter(config?: Partial<SqlParserConfig>)

rewriter.rewrite(sql: string): RewriteResult
rewriter.updateConfig(config: Partial<SqlParserConfig>): void
rewriter.getConfig(): SqlParserConfig
```

## 配置结构

```typescript
interface SqlParserConfig {
  dialect: 'mysql' | 'tidb';   // 默认 'mysql'
  listeners: ListenerConfig;
  errorHandling: ErrorHandlingConfig;
}

interface ListenerConfig {
  hint: {
    enabled: boolean;          // 默认 true
    priority: number;          // 默认 10
    abortOnError: boolean;     // 默认 false
    preserveHint: boolean;     // 默认 false（false = 移除 Hint 注释）
  };
  tenant: {
    enabled: boolean;          // 默认 true
    priority: number;          // 默认 100
    abortOnError: boolean;     // 默认 false
    tenantField: string;       // 默认 'tenant'（租户列名）
    targetDatabases: {
      prefixes: string[];      // 默认 ['tnt_']（匹配该前缀的库才注入）
      fullNames: string[];     // 默认 []（完整库名匹配）
      defaultDatabase: string; // 默认 'main'
    };
  };
  databaseRewrite?: {
    enabled: boolean;          // 默认 false（需显式启用）
    priority: number;          // 默认 50
    abortOnError: boolean;     // 默认 false
    dbPrefix: string;          // 例：'dev_mc_'（必填）
    targetDatabases?: string[];  // 仅改写这些库（空 = 改写所有）
    excludeDatabases?: string[]; // 排除这些库（优先级高于 target）
  };
}

interface ErrorHandlingConfig {
  throwOnError: boolean; // 默认 false
  collectAll: boolean;   // 默认 true
  maxErrors: number;     // 默认 100
  logErrors: boolean;    // 默认 true
}
```

## 结果类型

```typescript
interface RewriteResult {
  sql: string;                       // 改写后的 SQL
  modified: boolean;                 // 是否被修改
  listenerResults: ListenerResult[]; // 各 Listener 执行结果
  hint?: HintInfo;                   // 提取的 Hint 信息
  error?: Error;
}

interface HintInfo {
  tenant?: string;   // 租户编码
  original?: string; // 原始 Hint 字符串
}

interface ListenerResult {
  listenerName: string;
  modified: boolean;
  error?: Error;
  metadata?: Record<string, any>;
}
```

## Hint 格式

```sql
/*& tenant:'sxlq' */  SELECT * FROM tnt_ma.users
```

- 大小写不敏感
- 支持单引号或双引号
- `preserveHint: false`（默认）时改写后自动移除

## 处理流程

三个 Listener 按优先级顺序执行：

```
priority 10  → HintListener         提取租户 Hint，存入 sharedState
priority 50  → DatabaseRewriteListener  为库名添加环境前缀（需启用）
priority 100 → TenantFilterListener 注入 WHERE/INSERT 租户条件
```

租户条件注入规则：
- `SELECT`：在 WHERE 子句追加 `AND \`table\`.\`tenant\` = 'xxx'`
- `INSERT`：在列列表和 VALUES 中插入租户列和值
- `UPDATE` / `DELETE`：在 WHERE 子句追加租户条件
- 只对 `targetDatabases` 匹配的库中的表生效

## 使用示例

```typescript
import SqlParserService from '@cs/sql-parser';

// 简单改写
const sql = SqlParserService.rewriteWithTenant(
  "/*& tenant:'sxlq' */ SELECT * FROM tnt_ma.users WHERE age > 18"
);
// => SELECT * FROM tnt_ma.users WHERE age > 18 AND `users`.`tenant` = 'sxlq'

// 详细结果
const result = SqlParserService.rewriteWithDetails(
  "/*& tenant:'sxlq' */ SELECT * FROM tnt_ma.users"
);
console.log(result.modified);     // true
console.log(result.hint?.tenant); // 'sxlq'

// 实例模式（独立配置）
import { SqlRewriter } from '@cs/sql-parser';

const rewriter = new SqlRewriter({
  listeners: {
    hint: { enabled: true, priority: 10, abortOnError: false, preserveHint: false },
    tenant: {
      enabled: true, priority: 100, abortOnError: false,
      tenantField: 'tenant_id',
      targetDatabases: { prefixes: ['tnt_'], fullNames: [], defaultDatabase: 'main' },
    },
    databaseRewrite: {
      enabled: true, priority: 50, abortOnError: false,
      dbPrefix: 'dev_mc_',
      excludeDatabases: ['tnt_public'],
    },
  },
});

const result = rewriter.rewrite("/*& tenant:'sxlq' */ SELECT * FROM tnt_ma.users");
```

## 租户 ID 验证规则

- 只允许 `[a-zA-Z0-9_-]`，最大 128 字符
- 自动防 SQL 注入（转义特殊字符）
- 使用 `SqlParserService.isValidTenant(id)` 可预先校验

## 已知边界 Case（v2.0.0）

以下场景存在已知问题（低优先级）：

| SQL 类型 | 问题 |
|---------|------|
| `EXPLAIN WITH cte AS (...) SELECT ...` | CTE 内嵌物理表未注入租户条件 |
| `EXPLAIN ANALYZE SELECT ...` | 完全未注入任何租户条件 |

根因：MySQL 8.0 的 `EXPLAIN ANALYZE` 是独立语法节点，`EXPLAIN` + CTE 路径与普通 `SELECT` 的 `enterSelectStatement` 触发路径不同，`TenantFilterListener` 未覆盖。
