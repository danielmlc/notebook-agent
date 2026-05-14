---
title: "@cs/sql-parser · 源码整理 v2.0.0"
type: source
aliases: ["@cs/sql-parser 源码", "sql-parser 源码"]
tags: [nestjs, mwp, code-docs, sql-parser]
status: stable
version: "2.0.0"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/sql-parser.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/sql-parser · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：2.0.0
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/sql-parser代码库源码整理

#### 代码目录
```
@cs/sql-parser/
├── src/
├── adapter/
│   ├── base-adapter.ts
│   ├── factory.ts
│   ├── index.ts
│   └── mysql-adapter.ts
├── config/
│   ├── config-manager.ts
│   └── index.ts
├── core/
│   ├── antlr4-types.ts
│   ├── enums.ts
│   ├── index.ts
│   ├── interfaces.ts
│   └── types.ts
├── listeners/
│   ├── base/
│   │   ├── base-listener.ts
│   │   └── listener-chain.ts
│   ├── database/
│   │   └── database-rewrite-listener.ts
│   ├── tenant/
│   │   ├── hint-listener.ts
│   │   └── tenant-filter-listener.ts
│   └── index.ts
├── orchestrator/
│   ├── index.ts
│   └── sql-processor-orchestrator.ts
├── parser/
│   ├── mysql/
│   │   └── mysql-parser.ts
│   ├── base-parser.ts
│   ├── factory.ts
│   └── index.ts
├── utils/
│   ├── antlr4-loader.ts
│   ├── index.ts
│   ├── listener-binder.ts
│   ├── table-info-collector.ts
│   └── tenant-id-validator.ts
└── index.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/sql-parser",
  "version": "2.0.0",
  "description": "SQL Parser based on ANTLR4 with MySQL/TiDB support",
  "main": "lib/src/index.js",
  "types": "lib/src/index.d.ts",
  "directories": {
    "lib": "lib"
  },
  "files": [
    "lib",
    "grammar",
    "generated"
  ],
  "scripts": {
    "prebuild": "rimraf lib",
    "build": "tsc -p ./tsconfig.json",
    "watch": "tsc -p ./tsconfig.json --watch",
    "generate:parser": "antlr-ng -Dlanguage=TypeScript -o ./generated/mysql grammar/mysql/MySqlLexer.g4 grammar/mysql/MySqlParser.g4",
    "generate:parser:tidb": "antlr-ng -Dlanguage=TypeScript -o ./generated/tidb grammar/tidb/TiDBLexer.g4 grammar/tidb/TiDBParser.g4",
    "generate:all": "pnpm run generate:parser && pnpm run generate:parser:tidb",
    "test:filter": "node -r ts-node/register test/tenant-filter.test.ts",
    "test:database": "node -r ts-node/register test/database-rewrite.test.ts",
    "test": "node -r ts-node/register test/comprehensive.test.ts",
    "test:wrapper": "node -r ts-node/register test/wrapper-statement.test.ts",
    "test:all": "pnpm run test && pnpm run test:database && pnpm run test:error",
    "prepublishOnly": "pnpm run build",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "keywords": [
    "sql",
    "parser",
    "antlr4",
    "mysql",
    "tidb",
    "tenant",
    "rewrite"
  ],
  "author": "danielmlc <danielmlc@126.com>",
  "license": "ISC",
  "dependencies": {
    "antlr4ng": "^3.0.16"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "antlr-ng": "^1.0.10",
    "rimraf": "^5.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```


> 代码路径  `src\index.ts`

```typescript
/**
 * @cs/sql-parser-antlr4
 *
 * 基于 ANTLR4 的 SQL 解析器
 * 支持 MySQL 和 TiDB 方言
 * 提供租户隔离和库名改写功能
 */

// 核心导出
export * from './core';
export * from './parser';
export * from './adapter';
export * from './listeners';
export * from './orchestrator';
export * from './config';

import { SQLProcessorOrchestrator } from './orchestrator';
import { ConfigManager } from './config';
import { ParserFactory } from './parser/factory';
import { SqlParserConfig, RewriteResult, HintInfo, HINT_REGEX, HINT_REGEX_GLOBAL } from './core/types';
import { SQLDialect } from './core/enums';
import { TenantIdValidator } from './utils/tenant-id-validator';

/**
 * SqlParserService
 * 向后兼容的服务类，提供静态 API
 */
export class SqlParserService {
  private static orchestrator: SQLProcessorOrchestrator;
  private static config: SqlParserConfig;
  private static validationParser: ReturnType<typeof ParserFactory.createParser>;

  /**
   * 初始化服务
   */
  private static ensureInitialized (): void {
    if (!this.orchestrator) {
      this.config = ConfigManager.createConfig();
      this.orchestrator = new SQLProcessorOrchestrator(this.config);
    }
  }

  /**
   * 使用租户信息重写 SQL
   * @param sql 原始 SQL
   * @returns 重写后的 SQL
   */
  static rewriteWithTenant (sql: string): string {
    this.ensureInitialized();
    const result = this.process(sql);
    return result.sql;
  }

  /**
   * 处理 SQL 并返回详细信息
   * @param sql 原始 SQL
   * @returns 处理结果详情
   */
  static rewriteWithDetails (sql: string): RewriteResult {
    this.ensureInitialized();
    return this.process(sql);
  }

  /**
   * 批量处理 SQL
   * @param sqlList SQL 列表
   * @returns 处理后的 SQL 列表
   */
  static batchRewrite (sqlList: string[]): string[] {
    this.ensureInitialized();
    return sqlList.map(sql => this.process(sql).sql);
  }

  /**
   * 处理 SQL（内部方法）
   */
  private static process (sql: string): RewriteResult {
    return this.orchestrator.process(sql);
  }

  /**
   * 设置租户字段名
   * @param fieldName 租户字段名
   */
  static setTenantField (fieldName: string): void {
    this.ensureInitialized();
    this.updateConfig({
      listeners: {
        ...this.config.listeners,
        tenant: {
          ...this.config.listeners.tenant,
          tenantField: fieldName,
        } as any,
      },
    } as any);
  }

  /**
   * 设置完整配置
   * @param config 配置对象
   */
  static setConfig (config: Partial<SqlParserConfig>): void {
    this.ensureInitialized();
    this.updateConfig(config);
  }

  /**
   * 更新配置
   * @param config 配置对象
   */
  static updateConfig (config: Partial<SqlParserConfig>): void {
    this.ensureInitialized();
    // 合并现有配置和新配置
    const mergedConfig = { ...this.config, ...config };
    this.config = ConfigManager.createConfig(mergedConfig);
    ConfigManager.validateConfig(this.config);
    this.orchestrator.updateConfig(this.config);
  }

  /**
   * 设置目标数据库配置
   * @param targetDatabases 目标数据库配置
   */
  static setTargetDatabases (targetDatabases: {
    prefixes?: string[];
    fullNames?: string[];
    defaultDatabase?: string;
  }): void {
    this.ensureInitialized();
    this.updateConfig({
      listeners: {
        ...this.config.listeners,
        tenant: {
          ...this.config.listeners.tenant,
          targetDatabases: {
            ...this.config.listeners.tenant.targetDatabases,
            ...targetDatabases,
          } as any,
        } as any,
      },
    } as any);
  }

  /**
   * 添加数据库前缀
   * @param prefix 数据库前缀
   */
  static addDatabasePrefix (prefix: string): void {
    this.ensureInitialized();
    const prefixes = [...this.config.listeners.tenant.targetDatabases.prefixes];
    if (!prefixes.includes(prefix)) {
      prefixes.push(prefix);
      this.updateConfig({
        listeners: {
          ...this.config.listeners,
          tenant: {
            ...this.config.listeners.tenant,
            targetDatabases: {
              ...this.config.listeners.tenant.targetDatabases,
              prefixes,
            } as any,
          } as any,
        },
      } as any);
    }
  }

  /**
   * 添加完整数据库名
   * @param dbName 数据库名
   */
  static addDatabaseName (dbName: string): void {
    this.ensureInitialized();
    const fullNames = [...this.config.listeners.tenant.targetDatabases.fullNames];
    if (!fullNames.includes(dbName)) {
      fullNames.push(dbName);
      this.updateConfig({
        listeners: {
          ...this.config.listeners,
          tenant: {
            ...this.config.listeners.tenant,
            targetDatabases: {
              ...this.config.listeners.tenant.targetDatabases,
              fullNames,
            } as any,
          } as any,
        },
      } as any);
    }
  }

  /**
   * 设置默认数据库名
   * @param defaultDatabase 默认数据库名
   */
  static setDefaultDatabase (defaultDatabase: string): void {
    this.ensureInitialized();
    this.updateConfig({
      listeners: {
        ...this.config.listeners,
        tenant: {
          ...this.config.listeners.tenant,
          targetDatabases: {
            ...this.config.listeners.tenant.targetDatabases,
            defaultDatabase,
          } as any,
        } as any,
      },
    } as any);
  }

  /**
   * 提取 Hint 信息
   * @param sql SQL 字符串
   * @returns Hint 信息
   */
  static extractHint (sql: string): HintInfo | undefined {
    const match = sql.match(HINT_REGEX);
    if (match) {
      return {
        tenant: match[1],
        original: match[0],
      };
    }
    return undefined;
  }

  /**
   * 检查是否有 Hint
   * @param sql SQL 字符串
   * @returns 是否有 Hint
   */
  static hasHint (sql: string): boolean {
    return HINT_REGEX.test(sql);
  }

  /**
   * 移除 Hints
   * @param sql SQL 字符串
   * @returns 移除 Hints 后的 SQL
   */
  static removeHints (sql: string): string {
    return sql.replace(HINT_REGEX_GLOBAL, '');
  }

  /**
   * 验证 SQL 语法
   * @param sql SQL 字符串
   * @returns 是否有效
   */
  static validateSql (sql: string): boolean {
    try {
      if (!this.validationParser) {
        this.validationParser = ParserFactory.createParser(SQLDialect.MYSQL);
      }
      return this.validationParser.validate(sql);
    } catch {
      return false;
    }
  }

  /**
   * 获取 SQL 类型
   * @param sql SQL 字符串
   * @returns SQL 类型（SELECT/INSERT/UPDATE/DELETE 等）或 null
   */
  static getSqlType (sql: string): string | null {
    try {
      const cleanSql = this.removeAllComments(sql);
      if (!cleanSql) return null;

      const firstWord = cleanSql.split(/\s+/)[0].toUpperCase();
      const knownTypes = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
        'REPLACE', 'TRUNCATE', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'USE', 'SET',
        'BEGIN', 'COMMIT', 'ROLLBACK',
      ];
      return knownTypes.includes(firstWord) ? firstWord : null;
    } catch {
      return null;
    }
  }

  /**
   * 创建 Hint 字符串
   * @param tenant 租户编码
   * @returns Hint 字符串
   */
  static createHint (tenant: string): string {
    return `/*& tenant:'${tenant}' */`;
  }

  /**
   * 在 SQL 前添加 Hint
   * @param sql 原始 SQL
   * @param tenant 租户编码
   * @returns 添加 Hint 后的 SQL
   */
  static addHintToSql (sql: string, tenant: string): string {
    return `${this.createHint(tenant)} ${sql}`;
  }

  /**
   * 移除 SQL 中的所有注释（块注释和行注释）
   * @param sql 原始 SQL
   * @returns 移除注释后的 SQL
   */
  static removeAllComments (sql: string): string {
    if (!sql) return sql;
    return sql
      .replace(/\/\*[\s\S]*?\*\//g, ' ')  // 块注释
      .replace(/--.*$/gm, '')              // 行注释 --
      .replace(/\s+/g, ' ')               // 合并空格
      .trim();
  }

  /**
   * 获取 SQL 详细信息
   * @param sql SQL 字符串
   * @returns 详细信息
   */
  static getDetailedInfo (sql: string): {
    hasHint: boolean;
    hint?: HintInfo;
    sqlType: string | null;
    isValid: boolean;
    cleanSql: string;
  } {
    const hint = this.extractHint(sql);
    return {
      hasHint: !!hint,
      hint,
      sqlType: this.getSqlType(sql),
      isValid: this.validateSql(sql),
      cleanSql: this.removeAllComments(sql),
    };
  }

  /**
   * 验证租户编码格式
   * @param tenant 租户编码
   * @returns 是否有效
   */
  static isValidTenant (tenant: string): boolean {
    return TenantIdValidator.isValid(tenant);
  }

  /**
   * 批量处理 SQL 并返回详细结果
   * @param sqlList SQL 列表
   * @returns 处理结果列表
   */
  static batchRewriteWithDetails (sqlList: string[]): RewriteResult[] {
    this.ensureInitialized();
    return sqlList.map(sql => {
      try {
        return this.process(sql);
      } catch (error) {
        return {
          sql,
          modified: false,
          listenerResults: [],
          error: error as Error,
        };
      }
    });
  }
}

/**
 * SqlRewriter
 * 向后兼容的类，提供实例 API
 */
export class SqlRewriter {
  private orchestrator: SQLProcessorOrchestrator;
  private config: SqlParserConfig;

  constructor(config?: Partial<SqlParserConfig>) {
    this.config = ConfigManager.createConfig(config);
    ConfigManager.validateConfig(this.config);
    this.orchestrator = new SQLProcessorOrchestrator(this.config);
  }

  /**
   * 重写 SQL
   * @param sql 原始 SQL
   * @returns 重写结果
   */
  rewrite (sql: string): RewriteResult {
    return this.orchestrator.process(sql);
  }

  /**
   * 更新配置
   * @param config 配置对象
   */
  updateConfig (config: Partial<SqlParserConfig>): void {
    this.config = ConfigManager.createConfig(config);
    ConfigManager.validateConfig(this.config);
    this.orchestrator.updateConfig(this.config);
  }

  /**
   * 获取配置
   * @returns 当前配置
   */
  getConfig (): SqlParserConfig {
    return { ...this.config };
  }
}

// 默认导出
export default SqlParserService;

```


> 代码路径  `src\adapter\base-adapter.ts`

```typescript
import { IDialectAdapter } from '../core/interfaces';
import { SQLDialect } from '../core/enums';
import { ParseTree } from '../core/types';

/**
 * 基础 Adapter 抽象类
 * 所有 Adapter 实现的基类
 */
export abstract class BaseDialectAdapter implements IDialectAdapter {
  /**
   * 将方言特定 AST 适配为标准格式
   * 默认实现直接返回（适用于标准方言如 MySQL）
   */
  adaptAST(ast: ParseTree): ParseTree {
    // 默认不做转换，子类可以重写
    return ast;
  }

  /**
   * 获取方言支持的特性
   */
  abstract getSupportedFeatures(): Set<string>;

  /**
   * 检查是否支持某特性
   */
  supportsFeature(feature: string): boolean {
    return this.getSupportedFeatures().has(feature);
  }

  /**
   * 获取方言类型
   */
  abstract getDialect(): SQLDialect;
}

```


> 代码路径  `src\adapter\factory.ts`

```typescript
import { IDialectAdapter } from '../core/interfaces';
import { SQLDialect } from '../core/enums';
import { MySQLAdapter } from './mysql-adapter';

/**
 * Adapter 工厂类
 * 负责创建和管理不同方言的 Adapter 实例
 */
export class AdapterFactory {
  private static adapters = new Map<SQLDialect, () => IDialectAdapter>();

  /**
   * 初始化默认 Adapter
   */
  static {
    // 注册 MySQL Adapter
    AdapterFactory.registerAdapter(SQLDialect.MYSQL, () => new MySQLAdapter());

    // TiDB Adapter 将在后续实现（继承 MySQL Adapter）
    // AdapterFactory.registerAdapter(SQLDialect.TIDB, () => new TiDBAdapter());
  }

  /**
   * 创建 Adapter 实例
   */
  static createAdapter(dialect: SQLDialect): IDialectAdapter {
    const factory = AdapterFactory.adapters.get(dialect);
    if (!factory) {
      throw new Error(`Unsupported SQL dialect: ${dialect}`);
    }
    return factory();
  }

  /**
   * 注册 Adapter
   */
  static registerAdapter(
    dialect: SQLDialect,
    factory: () => IDialectAdapter
  ): void {
    AdapterFactory.adapters.set(dialect, factory);
  }

  /**
   * 获取支持的方言列表
   */
  static getSupportedDialects(): SQLDialect[] {
    return Array.from(AdapterFactory.adapters.keys());
  }
}

```


> 代码路径  `src\adapter\index.ts`

```typescript
/**
 * Adapter 模块导出
 */

// 基础类
export * from './base-adapter';

// MySQL Adapter
export * from './mysql-adapter';

// 工厂
export * from './factory';

```


> 代码路径  `src\adapter\mysql-adapter.ts`

```typescript
import { BaseDialectAdapter } from './base-adapter';
import { SQLDialect } from '../core/enums';
import { ParseTree } from '../core/types';

/**
 * MySQL Adapter
 * MySQL 是标准方言，不需要特殊适配
 */
export class MySQLAdapter extends BaseDialectAdapter {
  /**
   * MySQL 支持的特性
   */
  private static readonly FEATURES = new Set([
    'CTE',                    // Common Table Expressions (WITH)
    'WINDOW_FUNCTIONS',       // Window Functions (OVER)
    'SUBQUERY',               // Subqueries
    'JOIN',                   // JOIN operations
    'UNION',                  // UNION / UNION ALL
    'UNION_ALL',              // UNION ALL
    'INSERT_SELECT',          // INSERT ... SELECT
    'MULTI_TABLE_DELETE',     // Multi-table DELETE
    'MULTI_TABLE_UPDATE',     // Multi-table UPDATE
    'REPLACE',                // REPLACE statement
    'HANDLER',                // HANDLER statement
    'OPTIMIZE',               // OPTIMIZE TABLE
    'ANALYZE',                // ANALYZE TABLE
    'CHECK',                  // CHECK TABLE
    'REPAIR',                 // REPAIR TABLE
    'SHOW',                   // SHOW commands
    'DESCRIBE',               // DESCRIBE command
    'EXPLAIN',                // EXPLAIN command
    'PREPARE',                // PREPARE statement
    'EXECUTE',                // EXECUTE statement
    'DEALLOCATE',             // DEALLOCATE statement
    'TRANSACTION',            // BEGIN, COMMIT, ROLLBACK
    'SAVEPOINT',              // SAVEPOINT support
    'LOCK',                   // LOCK TABLES
    'UNLOCK',                 // UNLOCK TABLES
    'SET',                    // SET variable
    'GRANT',                  // GRANT
    'REVOKE',                 // REVOKE
    'CREATE_USER',            // CREATE USER
    'DROP_USER',              // DROP USER
    'ALTER_USER',             // ALTER USER
    'CREATE_DATABASE',        // CREATE DATABASE
    'DROP_DATABASE',          // DROP DATABASE
    'ALTER_DATABASE',         // ALTER DATABASE
    'CREATE_TABLE',           // CREATE TABLE
    'DROP_TABLE',             // DROP TABLE
    'ALTER_TABLE',            // ALTER TABLE
    'CREATE_INDEX',           // CREATE INDEX
    'DROP_INDEX',             // DROP INDEX
    'CREATE_VIEW',            // CREATE VIEW
    'DROP_VIEW',              // DROP VIEW
    'ALTER_VIEW',             // ALTER VIEW
    'CREATE_TRIGGER',         // CREATE TRIGGER
    'DROP_TRIGGER',           // DROP TRIGGER
    'CREATE_PROCEDURE',       // CREATE PROCEDURE
    'DROP_PROCEDURE',         // DROP PROCEDURE
    'CREATE_FUNCTION',        // CREATE FUNCTION
    'DROP_FUNCTION',          // DROP FUNCTION
  ]);

  /**
   * 获取方言类型
   */
  getDialect(): SQLDialect {
    return SQLDialect.MYSQL;
  }

  /**
   * 获取支持的特性
   */
  getSupportedFeatures(): Set<string> {
    return MySQLAdapter.FEATURES;
  }

  /**
   * MySQL AST 不需要转换，已经是标准格式
   */
  adaptAST(ast: ParseTree): ParseTree {
    return ast;
  }
}

```


> 代码路径  `src\config\config-manager.ts`

```typescript
import { SqlParserConfig, DatabaseRewriteListenerConfig } from '../core/types';
import { SQLDialect } from '../core/enums';

/**
 * 配置管理器
 * 负责配置的验证、合并和管理
 */
export class ConfigManager {
  private static DEFAULT_CONFIG: SqlParserConfig = {
    dialect: SQLDialect.MYSQL,
    listeners: {
      tenant: {
        enabled: true,
        priority: 100,
        abortOnError: false,
        tenantField: 'tenant',
        targetDatabases: {
          prefixes: ['tnt_'],
          fullNames: [],
          defaultDatabase: 'main',
        },
      },
      hint: {
        enabled: true,
        priority: 10,
        abortOnError: false,
        preserveHint: false,
      },
      databaseRewrite: {
        enabled: false,
        priority: 50,
        abortOnError: false,
        dbPrefix: '',
        targetDatabases: [],
        excludeDatabases: [],
      },
    },
    errorHandling: {
      throwOnError: false,
      collectAll: true,
      maxErrors: 100,
      logErrors: true,
    },
  };

  /**
   * 创建配置（与默认配置合并）
   */
  static createConfig(userConfig?: Partial<SqlParserConfig>): SqlParserConfig {
    return this.mergeConfigs(this.DEFAULT_CONFIG, userConfig || {});
  }

  /**
   * 合并配置
   */
  private static mergeConfigs(
    base: SqlParserConfig,
    override: Partial<SqlParserConfig>
  ): SqlParserConfig {
    return {
      ...base,
      ...override,
      listeners: {
        ...base.listeners,
        ...override.listeners,
        tenant: {
          ...base.listeners.tenant,
          ...override.listeners?.tenant,
        },
        hint: {
          ...base.listeners.hint,
          ...override.listeners?.hint,
        },
        databaseRewrite: {
          ...base.listeners.databaseRewrite,
          ...override.listeners?.databaseRewrite,
        } as DatabaseRewriteListenerConfig,
      },
      errorHandling: {
        ...base.errorHandling,
        ...override.errorHandling,
      },
    };
  }

  /**
   * 验证配置
   */
  static validateConfig(config: SqlParserConfig): void {
    // 验证租户字段名
    if (config.listeners.tenant.enabled && !config.listeners.tenant.tenantField) {
      throw new Error('租户字段名不能为空');
    }

    // 验证默认数据库名
    if (
      config.listeners.tenant.enabled &&
      !config.listeners.tenant.targetDatabases.defaultDatabase
    ) {
      throw new Error('默认数据库名不能为空');
    }

    // 验证目标数据库配置
    const { prefixes, fullNames, defaultDatabase } =
      config.listeners.tenant.targetDatabases;
    if (!prefixes.length && !fullNames.length && !defaultDatabase) {
      throw new Error(
        '必须配置至少一个目标数据库规则（prefixes/fullNames/defaultDatabase）'
      );
    }

    // 验证方言
    if (!Object.values(SQLDialect).includes(config.dialect)) {
      throw new Error(`不支持的 SQL 方言: ${config.dialect}`);
    }
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig(): SqlParserConfig {
    return { ...this.DEFAULT_CONFIG };
  }
}

```


> 代码路径  `src\config\index.ts`

```typescript
/**
 * Config 模块导出
 */

export * from './config-manager';

```


> 代码路径  `src\core\antlr4-types.ts`

```typescript
/**
 * ANTLR4 生成代码的类型定义
 * 由于 ANTLR4 生成的代码没有 TypeScript 类型定义，这里提供接口定义
 */

import { CharStream, CommonTokenStream, TokenSource, TokenStreamRewriter } from 'antlr4ng';

// ============================================================================
// ANTLR4 运行时接口
// ============================================================================

/**
 * ANTLR4 Lexer 接口
 * 由于 ANTLR4 生成的代码没有 TypeScript 类型，这里定义基础接口
 * 扩展 TokenSource 以兼容 CommonTokenStream
 */
export interface ANTLR4Lexer extends TokenSource {
  /** 输入字符流 */
  input: CharStream;
  /** 移除所有错误监听器 */
  removeErrorListeners(): void;
  /** 添加错误监听器 */
  addErrorListener(listener: unknown): void;
  /** 获取所有 Token */
  getAllTokens(): unknown[];
}

/**
 * ANTLR4 Parser 接口
 * 由于 ANTLR4 生成的代码没有 TypeScript 类型，这里定义基础接口
 */
export interface ANTLR4Parser {
  /** Token 流 */
  tokenStream: CommonTokenStream;
  /** 移除所有错误监听器 */
  removeErrorListeners(): void;
  /** 添加错误监听器 */
  addErrorListener(listener: unknown): void;
  /** 设置构建解析树 */
  buildParseTrees: boolean;
}

/**
 * 解析树类型
 * 使用 ParserRuleContext 结构接口而非 any/unknown，以提供真实的类型约束
 * 注意：传入 antlr4ng ParseTreeWalker.walk() 时仍需 as any，因其期望 antlr4ng 内部类型
 */
export type ParseTree = ParserRuleContext;

// ============================================================================
// 基础 Context 类型
// ============================================================================

/**
 * 解析树上下文基接口
 * 所有 ANTLR4 生成的 Context 都实现此接口
 */
export interface ParserRuleContext {
  /** 父上下文 */
  parentCtx?: ParserRuleContext;
  /** 起始 Token */
  start?: { tokenIndex: number };
  /** 结束 Token */
  stop?: { tokenIndex: number };
  /** 获取子节点数量 */
  getChildCount(): number;
  /** 获取指定索引的子节点 */
  getChild(i: number): ParserRuleContext | undefined;
  /** 获取文本内容 */
  getText(): string;
}

// ============================================================================
// MySQL Parser Context 类型
// ============================================================================

/**
 * 表名上下文
 */
export interface TableNameContext extends ParserRuleContext {
  /** 获取完整表名 */
  getText(): string;
}

/**
 * 表源项上下文（单个表）
 */
export interface TableSourceItemContext extends ParserRuleContext {
  /** 表名 */
  tableName?(): TableNameContext | undefined;
  /** 别名 (AS alias) */
  alias?: { getText(): string };
  /** 别名 (AS? uid) - 可以是方法或属性 */
  uid?: { getText(): string } | (() => { getText(): string });
  /** 内部别名属性 */
  _alias?: { getText(): string };
}

/**
 * JOIN 上下文
 */
export interface JoinedTableContext extends ParserRuleContext {
  /** 表名 */
  tableName?(): TableNameContext | undefined;
  /** 别名 */
  alias?: { getText(): string };
  /** 可以是方法或属性 */
  uid?: { getText(): string } | (() => { getText(): string });
  _alias?: { getText(): string };
}

/**
 * 表源列表上下文
 */
export interface TableSourcesContext extends ParserRuleContext {
  getChildCount(): number;
  getChild(i: number): TableSourceItemContext | undefined;
}

/**
 * FROM 子句上下文
 */
export interface FromClauseContext extends ParserRuleContext {
  /** WHERE 关键字 Token */
  WHERE?(): { tokenIndex: number } | null;
  /** 表源列表 */
  tableSources?(): TableSourcesContext;
  /** 表达式（WHERE 后的谓词） */
  expression?(): ExpressionContext;
  /** 起始和结束 Token */
  start?: { tokenIndex: number };
  stop?: { tokenIndex: number };
}

/**
 * 表达式上下文
 */
export interface ExpressionContext extends ParserRuleContext {
  stop?: { tokenIndex: number };
}

/**
 * SELECT 查询规范上下文
 */
export interface QuerySpecificationContext extends ParserRuleContext {
  /** FROM 子句 */
  fromClause?(): FromClauseContext;
}

/**
 * UPDATE 语句上下文
 */
export interface UpdateStatementContext extends ParserRuleContext {
  /** 单表 UPDATE 语句 */
  singleUpdateStatement?(): SingleUpdateStatementContext;
}

/**
 * 单表 UPDATE 语句上下文
 */
export interface SingleUpdateStatementContext extends ParserRuleContext {
  /** 表源列表 */
  tableSources?(): TableSourcesContext;
  /** WHERE 关键字 Token */
  WHERE?(): { tokenIndex: number } | null;
  /** WHERE 表达式 */
  expression?(): ExpressionContext;
  /** 起始和结束 Token */
  start?: { tokenIndex: number };
  stop?: { tokenIndex: number };
}

/**
 * DELETE 语句上下文
 */
export interface DeleteStatementContext extends ParserRuleContext {
  /** 单表 DELETE 语句 */
  singleDeleteStatement?(): SingleDeleteStatementContext;
  /** 多表 DELETE 语句 */
  multipleDeleteStatement?(): MultipleDeleteStatementContext;
}

/**
 * 单表 DELETE 语句上下文
 */
export interface SingleDeleteStatementContext extends ParserRuleContext {
  /** 表名 */
  tableName?(): TableNameContext;
  /** WHERE 关键字 Token */
  WHERE?(): { tokenIndex: number } | null;
  /** WHERE 表达式 */
  expression?(): ExpressionContext;
  /** 起始和结束 Token */
  start?: { tokenIndex: number };
  stop?: { tokenIndex: number };
}

/**
 * 多表 DELETE 语句上下文
 */
export interface MultipleDeleteStatementContext extends ParserRuleContext {
  /** 表源列表 */
  tableSources?(): TableSourcesContext;
  /** WHERE 关键字 Token */
  WHERE?(): { tokenIndex: number } | null;
  /** WHERE 表达式 */
  expression?(): ExpressionContext;
  /** 起始和结束 Token */
  start?: { tokenIndex: number };
  stop?: { tokenIndex: number };
}

/**
 * INSERT 语句上下文
 */
export interface InsertStatementContext extends ParserRuleContext {
  /** 表名 */
  tableName?(): TableNameContext;
  /** SET 关键字（用于 INSERT ... SET 语法） */
  SET?(): { tokenIndex: number } | null;
  /** 列名列表 */
  fullColumnNameList?(): FullColumnNameListContext;
  /** INSERT 值 */
  insertStatementValue?(): InsertStatementValueContext;
  /** 左括号 Token */
  LR_BRACKET?(index: number): { symbol: { tokenIndex: number } } | undefined;
}

/**
 * 列名列表上下文
 */
export interface FullColumnNameListContext extends ParserRuleContext {}

/**
 * INSERT 值上下文
 */
export interface InsertStatementValueContext extends ParserRuleContext {
  /** 表达式列表 */
  expressionsWithDefaults?(): Array<{ start?: { tokenIndex: number } }>;
}

/**
 * UPDATE 元素上下文（用于 INSERT ... SET）
 */
export interface UpdatedElementContext extends ParserRuleContext {
  stop?: { tokenIndex: number };
}

/**
 * CTE 名称上下文
 */
export interface CteNameContext extends ParserRuleContext {
  getText(): string;
}

// ============================================================================
// Listener 基类类型
// ============================================================================

/**
 * MySqlParserListener 基类接口
 * ANTLR4 生成的 Listener 基类
 */
export interface MySqlParserListenerConstructor {
  new (): MySqlParserListener;
}

/**
 * MySqlParserListener 接口
 * 所有 ANTLR4 方法都是 undefined 属性，需要子类实现
 */
export interface MySqlParserListener {
  /** 进入每个规则 */
  enterEveryRule?(ctx: ParserRuleContext): void;
  /** 退出每个规则 */
  exitEveryRule?(ctx: ParserRuleContext): void;
  /** 访问终端节点 */
  visitTerminal?(node: unknown): void;
  /** 访问错误节点 */
  visitErrorNode?(node: unknown): void;

  // SQL 语句相关方法
  enterCteName?(ctx: CteNameContext): void;
  enterInsertStatement?(ctx: InsertStatementContext): void;
  enterQuerySpecification?(ctx: QuerySpecificationContext): void;
  enterQuerySpecificationNointo?(ctx: QuerySpecificationContext): void;
  enterUpdateStatement?(ctx: UpdateStatementContext): void;
  enterDeleteStatement?(ctx: DeleteStatementContext): void;
}

// ============================================================================
// 表信息类型
// ============================================================================

/**
 * 表信息接口
 */
export interface TableInfo {
  /** 完整表名（包含数据库前缀，如 db.table） */
  fullName: string;
  /** 简单表名（不包含数据库前缀） */
  simpleName: string;
  /** 表别名 */
  alias?: string;
}

// ============================================================================
// TokenStream 相关类型
// ============================================================================

/**
 * Token 流接口扩展
 */
export interface ExtendedTokenStream {
  /** Token 数量 */
  size: number;
  /** 获取指定索引的 Token */
  get(index: number): { tokenIndex: number; text?: string };
}

```


> 代码路径  `src\core\enums.ts`

```typescript
/**
 * SQL 方言枚举
 */
export enum SQLDialect {
  MYSQL = 'mysql',
  TIDB = 'tidb',
  // 未来可扩展：POSTGRESQL, MARIADB, 等
}

/**
 * SQL 语句类型
 */
export enum StatementType {
  SELECT = 'SELECT',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CREATE = 'CREATE',
  DROP = 'DROP',
  ALTER = 'ALTER',
  // 其他类型...
}

/**
 * 错误类型
 */
export enum ErrorType {
  PARSE_ERROR = 'PARSE_ERROR',
  LISTENER_ERROR = 'LISTENER_ERROR',
  ADAPTER_ERROR = 'ADAPTER_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

```


> 代码路径  `src\core\index.ts`

```typescript
/**
 * 核心模块导出
 */

// 枚举
export * from './enums';

// 类型
export * from './types';
export * from './antlr4-types';

// 接口
export * from './interfaces';

```


> 代码路径  `src\core\interfaces.ts`

```typescript
import { ParseResult, SqlParserConfig, ParseTree, ListenerContext } from './types';
import { SQLDialect } from './enums';

// ============================================================================
// Parser 接口
// ============================================================================

/**
 * SQL Parser 接口
 * 所有 Parser 实现必须实现此接口
 */
export interface ISQLParser {
  /**
   * 解析 SQL 为 AST
   * @param sql SQL 字符串
   * @returns 解析结果
   */
  parse(sql: string): ParseResult;

  /**
   * 解析 SQL 并返回详细信息（包含错误信息）
   * @param sql SQL 字符串
   * @returns 解析结果
   */
  parseWithDetails(sql: string): ParseResult;

  /**
   * 验证 SQL 语法
   * @param sql SQL 字符串
   * @returns 是否有效
   */
  validate(sql: string): boolean;

  /**
   * 获取支持的 SQL 类型
   * @returns SQL 类型列表
   */
  getSupportedTypes(): string[];

  /**
   * 获取方言类型
   * @returns SQL 方言
   */
  getDialect(): SQLDialect;
}

// ============================================================================
// Adapter 接口
// ============================================================================

/**
 * 方言适配器接口
 * 负责将不同方言的 AST 适配为统一格式
 */
export interface IDialectAdapter {
  /**
   * 将方言特定 AST 适配为标准格式
   * @param ast 原始 AST
   * @returns 适配后的 AST
   */
  adaptAST(ast: ParseTree): ParseTree;

  /**
   * 获取方言支持的特性
   * @returns 特性集合
   */
  getSupportedFeatures(): Set<string>;

  /**
   * 检查是否支持某特性
   * @param feature 特性名称
   * @returns 是否支持
   */
  supportsFeature(feature: string): boolean;

  /**
   * 获取方言类型
   * @returns SQL 方言
   */
  getDialect(): SQLDialect;
}

// ============================================================================
// Listener 接口
// ============================================================================

/**
 * SQL Listener 接口
 * 所有 Listener 实现必须实现此接口
 */
export interface ISQLListener {
  /**
   * 处理前的钩子
   * @param context 处理上下文
   */
  beforeProcess?(context: ListenerContext): void;

  /**
   * 处理 AST
   * @param ast AST 对象
   * @param context 处理上下文
   * @returns 处理后的 AST（可选）
   */
  process(ast: ParseTree, context: ListenerContext): void;

  /**
   * 处理后的钩子
   * @param context 处理上下文
   */
  afterProcess?(context: ListenerContext): void;

  /**
   * 获取优先级（数字越小优先级越高）
   * @returns 优先级值
   */
  getPriority(): number;

  /**
   * 是否启用此 Listener
   * @returns 是否启用
   */
  isEnabled(): boolean;

  /**
   * 获取 Listener 名称
   * @returns Listener 名称
   */
  getName(): string;
}

// ============================================================================
// Factory 接口
// ============================================================================

/**
 * Parser 工厂接口
 */
export interface IParserFactory {
  /**
   * 创建 Parser 实例
   * @param dialect SQL 方言
   * @returns Parser 实例
   */
  createParser(dialect: SQLDialect): ISQLParser;

  /**
   * 注册 Parser
   * @param dialect SQL 方言
   * @param factory 工厂函数
   */
  registerParser(dialect: SQLDialect, factory: () => ISQLParser): void;

  /**
   * 获取支持的方言列表
   * @returns 方言列表
   */
  getSupportedDialects(): SQLDialect[];
}

/**
 * Adapter 工厂接口
 */
export interface IAdapterFactory {
  /**
   * 创建 Adapter 实例
   * @param dialect SQL 方言
   * @returns Adapter 实例
   */
  createAdapter(dialect: SQLDialect): IDialectAdapter;

  /**
   * 注册 Adapter
   * @param dialect SQL 方言
   * @param factory 工厂函数
   */
  registerAdapter(dialect: SQLDialect, factory: () => IDialectAdapter): void;

  /**
   * 获取支持的方言列表
   * @returns 方言列表
   */
  getSupportedDialects(): SQLDialect[];
}

```


> 代码路径  `src\core\types.ts`

```typescript
import { SQLDialect, StatementType, ErrorType } from './enums';
import { CommonTokenStream } from 'antlr4ng';
import type { ANTLR4Lexer, ANTLR4Parser, ParseTree } from './antlr4-types';

// 从 antlr4-types 重新导出，保持公共 API 不变
export type { ANTLR4Lexer, ANTLR4Parser, ParseTree };

// ============================================================================
// ANTLR4 TokenStream 类型别名
// ============================================================================

export type ANTLRToken = import('antlr4ng').Token;
export type TokenStream = CommonTokenStream;
export type TokenStreamRewriter = import('antlr4ng').TokenStreamRewriter;

// ============================================================================
// 解析相关类型
// ============================================================================

/**
 * 语法错误信息
 */
export interface SyntaxError {
  /** 错误消息 */
  message: string;
  /** 所在行号 */
  line: number;
  /** 所在列号 */
  column: number;
  /** 错误的 Token */
  offendingToken?: ANTLRToken;
}

/**
 * 解析结果接口
 */
export interface ParseResult {
  /** 原始 SQL */
  originalSql: string;
  /** 解析树 */
  parseTree: ParseTree;
  /** Token 流 */
  tokenStream: TokenStream;
  /** Token 流重写器 */
  rewriter: TokenStreamRewriter;
  /** 词法错误列表 */
  lexerErrors: SyntaxError[];
  /** 语法错误列表 */
  parserErrors: SyntaxError[];
  /** 是否成功解析 */
  success: boolean;
}

// ============================================================================
// 配置相关类型
// ============================================================================

/**
 * 目标数据库配置
 */
export interface TargetDatabaseConfig {
  /** 数据库前缀列表 */
  prefixes: string[];
  /** 完整数据库名列表 */
  fullNames: string[];
  /** 默认数据库名 */
  defaultDatabase: string;
}

/**
 * 基础 Listener 配置
 */
export interface BaseListenerConfig {
  /** 是否启用此 Listener */
  enabled: boolean;
  /** 执行优先级（数字越小越先执行） */
  priority: number;
  /** 是否在遇到错误时中断 */
  abortOnError: boolean;
}

/**
 * 租户 Listener 配置
 */
export interface TenantListenerConfig extends BaseListenerConfig {
  /** 租户字段名 */
  tenantField: string;
  /** 目标数据库配置 */
  targetDatabases: TargetDatabaseConfig;
}

/**
 * Hint Listener 配置
 */
export interface HintListenerConfig extends BaseListenerConfig {
  /** 是否保留原始 Hint */
  preserveHint: boolean;
}

/**
 * 库名改写 Listener 配置
 */
export interface DatabaseRewriteListenerConfig extends BaseListenerConfig {
  /** 数据库名前缀，如 'dev_mc_' */
  dbPrefix: string;
  /** 仅改写的目标库名列表（为空则改写所有） */
  targetDatabases?: string[];
  /** 排除的库名列表（不改写） */
  excludeDatabases?: string[];
}

/**
 * Listener 配置
 */
export interface ListenerConfig {
  /** 租户 Listener 配置 */
  tenant: TenantListenerConfig;
  /** Hint Listener 配置 */
  hint: HintListenerConfig;
  /** 库名改写 Listener 配置（可选） */
  databaseRewrite?: DatabaseRewriteListenerConfig;
}

/**
 * 错误处理配置
 */
export interface ErrorHandlingConfig {
  /** 是否在解析失败时抛出异常 */
  throwOnError: boolean;
  /** 是否收集所有错误（遇到第一个错误后是否继续） */
  collectAll: boolean;
  /** 最大错误数量 */
  maxErrors: number;
  /** 是否记录错误 */
  logErrors: boolean;
}

/**
 * 主配置接口
 */
export interface SqlParserConfig {
  /** 数据库类型 */
  dialect: SQLDialect;
  /** Listener 配置 */
  listeners: ListenerConfig;
  /** 错误处理配置 */
  errorHandling: ErrorHandlingConfig;
}

// ============================================================================
// Listener 相关类型
// ============================================================================

/**
 * Listener 上下文接口
 * 提供 Listener 执行时所需的所有信息
 */
export interface ListenerContext {
  /** 原始 SQL */
  originalSql: string;
  /** Token 流重写器 */
  rewriter: TokenStreamRewriter;
  /** Token 流 */
  tokenStream: TokenStream;
  /** 解析树（用于 Listener 遍历 AST） */
  parseTree: ParseTree;
  /** 配置 */
  config: ListenerConfig;
  /** 共享状态（用于 Listener 之间通信） */
  sharedState: Map<string, any>;
}

/**
 * Listener 执行结果
 */
export interface ListenerResult {
  /** Listener 名称 */
  listenerName: string;
  /** 是否修改了 SQL */
  modified: boolean;
  /** 错误信息（如果有） */
  error?: Error;
  /** 额外的元数据 */
  metadata?: Record<string, any>;
}

// ============================================================================
// SharedState 常量键
// ============================================================================

/**
 * ListenerContext.sharedState 中使用的键常量
 * 避免魔法字符串在多处散落导致拼写错误
 */
export const SHARED_STATE_KEYS = {
  TENANT_INFO: 'tenantInfo',
  DB_REWRITE_PREFIX: 'dbRewritePrefix',
} as const;

// ============================================================================
// Hint 正则常量
// ============================================================================

/**
 * Hint 匹配正则（带捕获组，提取 tenant 值）
 * 格式：/*& tenant:'xxx' *\/
 */
export const HINT_REGEX = /\/\*&\s*tenant\s*:\s*['"]([^'"]+)['"]\s*\*\//i;

/**
 * Hint 全局匹配正则（用于 removeHints，g 标志）
 */
export const HINT_REGEX_GLOBAL = /\/\*&\s*tenant\s*:\s*['"][^'"]+['"]\s*\*\//gi;

// ============================================================================
// Hint 相关类型
// ============================================================================

/**
 * Hint 信息接口
 */
export interface HintInfo {
  /** 租户编码 */
  tenant?: string;
  /** 原始 Hint 字符串 */
  original?: string;
}

// ============================================================================
// 改写结果相关类型
// ============================================================================

/**
 * 改写结果接口
 */
export interface RewriteResult {
  /** 改写后的 SQL */
  sql: string;
  /** 是否被修改 */
  modified: boolean;
  /** 各个 Listener 的执行结果 */
  listenerResults: ListenerResult[];
  /** 提取的 Hint 信息 */
  hint?: HintInfo;
  /** 错误信息（如果有） */
  error?: Error;
}

// ============================================================================
// 错误相关类型
// ============================================================================

/**
 * SQL 解析错误基类
 */
export class SqlParseError extends Error {
  public readonly type: ErrorType;
  public readonly originalSql?: string;
  public readonly cause?: Error;

  constructor(
    type: ErrorType,
    message: string,
    originalSql?: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'SqlParseError';
    this.type = type;
    this.originalSql = originalSql;
    this.cause = cause;
  }
}

/**
 * 配置错误
 */
export class ConfigError extends SqlParseError {
  constructor(message: string) {
    super(ErrorType.CONFIG_ERROR, message);
    this.name = 'ConfigError';
  }
}

/**
 * 解析错误
 */
export class ParserError extends SqlParseError {
  constructor(message: string, originalSql: string, cause?: Error) {
    super(ErrorType.PARSE_ERROR, message, originalSql, cause);
    this.name = 'ParserError';
  }
}

/**
 * Hint 解析错误
 */
export class HintParseError extends SqlParseError {
  constructor(message: string, originalSql: string, cause?: Error) {
    super(ErrorType.PARSE_ERROR, `Hint解析失败: ${message}`, originalSql, cause);
    this.name = 'HintParseError';
  }
}

/**
 * Listener 转换错误
 */
export class TransformError extends SqlParseError {
  constructor(message: string, originalSql: string, cause?: Error) {
    super(ErrorType.LISTENER_ERROR, `转换失败: ${message}`, originalSql, cause);
    this.name = 'TransformError';
  }
}

/**
 * 不支持的 SQL 类型错误
 */
export class UnsupportedSqlError extends SqlParseError {
  public readonly sqlType: string;

  constructor(sqlType: string, originalSql: string) {
    super(ErrorType.VALIDATION_ERROR, `不支持的SQL类型: ${sqlType}`, originalSql);
    this.name = 'UnsupportedSqlError';
    this.sqlType = sqlType;
  }
}

/**
 * 错误工具类
 */
export class ErrorUtils {
  static formatError(error: SqlParseError): string {
    const sql = error.originalSql || '';
    const truncatedSql = sql.length > 200 ? sql.substring(0, 200) + '...' : sql;
    let message = `${error.name}: ${error.message}\n`;
    message += `原始SQL: ${truncatedSql}\n`;
    if (error.cause) {
      message += `根本原因: ${error.cause.message}\n`;
    }
    return message;
  }

  static isSqlParseError(error: unknown): error is SqlParseError {
    return error instanceof SqlParseError;
  }

  static getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }
}

```


> 代码路径  `src\listeners\index.ts`

```typescript
/**
 * Listener 模块导出
 */

// 基础类
export * from './base/base-listener';
export * from './base/listener-chain';

// 租户相关 Listener
export * from './tenant/tenant-filter-listener';
export * from './tenant/hint-listener';

// 数据库相关 Listener
export * from './database/database-rewrite-listener';

```


> 代码路径  `src\orchestrator\index.ts`

```typescript
/**
 * Orchestrator 模块导出
 */

export * from './sql-processor-orchestrator';

```


> 代码路径  `src\orchestrator\sql-processor-orchestrator.ts`

```typescript
import { ParserFactory } from '../parser/factory';
import { ListenerChain } from '../listeners/base/listener-chain';
import { HintListener } from '../listeners/tenant/hint-listener';
import { TenantFilterListener } from '../listeners/tenant/tenant-filter-listener';
import { DatabaseRewriteListener } from '../listeners/database/database-rewrite-listener';
import { BaseListener } from '../listeners/base/base-listener';
import { SqlParserConfig, RewriteResult, ListenerContext, SHARED_STATE_KEYS } from '../core/types';
import { ISQLParser } from '../core/interfaces';

/**
 * SQL 处理编排器
 * 负责协调整个 SQL 处理流程
 */
export class SQLProcessorOrchestrator {
  private listenerChain: ListenerChain;
  private config: SqlParserConfig;
  private parser: ISQLParser;

  constructor(config: SqlParserConfig) {
    this.config = config;
    this.parser = ParserFactory.createParser(config.dialect);
    this.listenerChain = new ListenerChain();
    this.setupDefaultListeners();
  }

  /**
   * 处理 SQL（同步方法）
   * ANTLR4 处理是同步的，不需要 async
   */
  process(sql: string): RewriteResult {
    try {
      // 1. 解析 SQL
      const parseResult = this.parser.parseWithDetails(sql);

      if (!parseResult.success) {
        // 解析失败，根据配置决定是否抛出错误
        if (this.config.errorHandling.throwOnError) {
          throw new Error(`SQL 解析失败: ${parseResult.parserErrors[0]?.message}`);
        }
        return {
          sql,
          modified: false,
          listenerResults: [],
        };
      }

      // 2. 准备上下文
      const context: ListenerContext = {
        originalSql: sql,
        rewriter: parseResult.rewriter,
        tokenStream: parseResult.tokenStream,
        parseTree: parseResult.parseTree,
        config: this.config.listeners,
        sharedState: new Map(),
      };

      // 4. 执行 Listener 链
      const listenerResults = this.listenerChain.execute(context);

      // 5. 获取结果
      const resultSql = context.rewriter.getText();

      // 6. 检查是否修改
      const modified = listenerResults.some(r => r.modified);

      // 7. 提取 Hint 信息
      const hint = context.sharedState.get(SHARED_STATE_KEYS.TENANT_INFO);

      return {
        sql: resultSql,
        modified,
        listenerResults,
        hint,
      };
    } catch (error) {
      // 错误处理
      if (this.config.errorHandling.throwOnError) {
        throw error;
      }
      return {
        sql,
        modified: false,
        listenerResults: [],
        error: error as Error,
      };
    }
  }

  /**
   * 添加自定义 Listener
   */
  addListener(listener: BaseListener): void {
    this.listenerChain.addListener(listener);
  }

  /**
   * 配置管理
   */
  updateConfig(newConfig: Partial<SqlParserConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果方言改变，重新创建 parser 并重新初始化 Listener
    if (newConfig.dialect) {
      this.parser = ParserFactory.createParser(this.config.dialect);
      this.listenerChain.clear();
      this.setupDefaultListeners();
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): SqlParserConfig {
    return { ...this.config };
  }

  /**
   * 设置默认 Listener
   */
  private setupDefaultListeners(): void {
    // Hint Listener（最高优先级，最先执行）
    this.listenerChain.addListener(
      new HintListener(this.config.listeners.hint)
    );

    // 库名改写 Listener（优先级 50，在 Hint 之后、租户过滤之前）
    if (this.config.listeners.databaseRewrite?.enabled) {
      this.listenerChain.addListener(
        new DatabaseRewriteListener(this.config.listeners.databaseRewrite)
      );
    }

    // 租户过滤 Listener
    if (this.config.listeners.tenant.enabled) {
      this.listenerChain.addListener(
        new TenantFilterListener(this.config.listeners.tenant)
      );
    }
  }
}

```


> 代码路径  `src\parser\base-parser.ts`

```typescript
import { CharStream, CommonTokenStream, TokenStreamRewriter, BaseErrorListener, RecognitionException, Recognizer, ATNSimulator } from 'antlr4ng';
import { ISQLParser } from '../core/interfaces';
import { SQLDialect } from '../core/enums';
import type { ParseResult, ParseTree, SyntaxError as SyntaxErrorInfo } from '../core/types';
import type { ANTLR4Lexer, ANTLR4Parser } from '../core/antlr4-types';

/**
 * 收集 ANTLR4 解析错误的 Listener
 */
class ErrorCollector extends BaseErrorListener {
  readonly errors: SyntaxErrorInfo[] = [];

  syntaxError(
    _recognizer: Recognizer<ATNSimulator>,
    _offendingSymbol: unknown,
    line: number,
    column: number,
    msg: string,
    _e: RecognitionException | null
  ): void {
    this.errors.push({ message: msg, line, column });
  }
}

/**
 * 基础 Parser 抽象类
 * 所有 Parser 实现的基类
 */
export abstract class BaseSQLParser implements ISQLParser {
  /**
   * 解析 SQL 为 AST
   */
  parse(sql: string): ParseResult {
    const result = this.parseWithDetails(sql);
    return result;
  }

  /**
   * 解析 SQL 并返回详细信息
   */
  parseWithDetails(sql: string): ParseResult {
    try {
      // 创建字符流
      const inputStream = CharStream.fromString(sql);

      // 创建词法分析器
      const lexer = this.createLexer(inputStream);
      const lexerErrors = new ErrorCollector();
      lexer.removeErrorListeners();
      lexer.addErrorListener(lexerErrors);

      // 创建 Token 流
      const tokenStream = new CommonTokenStream(lexer);

      // 创建语法分析器
      const parser = this.createParser(tokenStream);
      const parserErrors = new ErrorCollector();
      parser.removeErrorListeners();
      parser.addErrorListener(parserErrors);

      // 开始解析
      const parseTree = this.startParsing(parser);

      // 创建重写器
      const rewriter = new TokenStreamRewriter(tokenStream);

      const hasErrors = lexerErrors.errors.length > 0 || parserErrors.errors.length > 0;

      return {
        originalSql: sql,
        parseTree,
        tokenStream,
        rewriter,
        lexerErrors: lexerErrors.errors,
        parserErrors: parserErrors.errors,
        success: !hasErrors,
      };
    } catch (error) {
      return {
        originalSql: sql,
        parseTree: null as unknown as ParseTree,
        tokenStream: null as unknown as CommonTokenStream,
        rewriter: null as unknown as TokenStreamRewriter,
        lexerErrors: [],
        parserErrors: [
          {
            message: error instanceof Error ? error.message : String(error),
            line: 0,
            column: 0,
          },
        ],
        success: false,
      };
    }
  }

  /**
   * 验证 SQL 语法
   */
  validate(sql: string): boolean {
    const result = this.parseWithDetails(sql);
    return result.success;
  }

  /**
   * 获取方言类型
   */
  abstract getDialect(): SQLDialect;

  /**
   * 获取支持的 SQL 类型
   */
  getSupportedTypes(): string[] {
    return ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'];
  }

  /**
   * 创建词法分析器（子类实现）
   */
  protected abstract createLexer(inputStream: CharStream): ANTLR4Lexer;

  /**
   * 创建语法分析器（子类实现）
   */
  protected abstract createParser(tokenStream: CommonTokenStream): ANTLR4Parser;

  /**
   * 开始解析（子类实现，调用对应的根规则）
   */
  protected abstract startParsing(parser: ANTLR4Parser): ParseTree;
}

```


> 代码路径  `src\parser\factory.ts`

```typescript
import { ISQLParser } from '../core/interfaces';
import { SQLDialect } from '../core/enums';
import { MySQLParser } from './mysql/mysql-parser';

/**
 * Parser 工厂类
 * 负责创建和管理不同方言的 Parser 实例
 */
export class ParserFactory {
  private static parsers = new Map<SQLDialect, () => ISQLParser>();

  /**
   * 初始化默认 Parser
   */
  static {
    // 注册 MySQL Parser
    ParserFactory.registerParser(SQLDialect.MYSQL, () => new MySQLParser());

    // TiDB Parser 将在后续实现
    // ParserFactory.registerParser(SQLDialect.TIDB, () => new TiDBParser());
  }

  /**
   * 创建 Parser 实例
   */
  static createParser(dialect: SQLDialect): ISQLParser {
    const factory = ParserFactory.parsers.get(dialect);
    if (!factory) {
      throw new Error(`Unsupported SQL dialect: ${dialect}`);
    }
    return factory();
  }

  /**
   * 注册 Parser
   */
  static registerParser(
    dialect: SQLDialect,
    factory: () => ISQLParser
  ): void {
    ParserFactory.parsers.set(dialect, factory);
  }

  /**
   * 获取支持的方言列表
   */
  static getSupportedDialects(): SQLDialect[] {
    return Array.from(ParserFactory.parsers.keys());
  }
}

```


> 代码路径  `src\parser\index.ts`

```typescript
/**
 * Parser 模块导出
 */

// 基础类
export * from './base-parser';

// MySQL Parser
export * from './mysql/mysql-parser';

// 工厂
export * from './factory';

```


> 代码路径  `src\utils\antlr4-loader.ts`

```typescript
/**
 * ANTLR4 生成代码加载器
 * 统一处理动态加载 ANTLR4 生成代码的逻辑
 */

import * as path from 'path';
import { ParserError } from '../core/types';

/**
 * 加载结果
 */
export interface LoadResult<T> {
  /** 加载的模块 */
  module: T | null;
  /** 是否成功加载 */
  success: boolean;
  /** 错误信息（如果加载失败） */
  error?: Error;
  /** 加载路径 */
  loadedFrom?: string;
}

/**
 * ANTLR4 生成代码加载器
 * 提供统一的加载逻辑，支持多种加载路径和错误处理
 */
export class Antlr4Loader {
  /**
   * 加载 ANTLR4 生成的模块
   * @param moduleName 模块名称（不含路径和扩展名）
   * @param exportName 导出名称（默认与模块名相同）
   * @param options 加载选项
   * @returns 加载结果
   */
  static loadModule<T>(
    moduleName: string,
    exportName?: string,
    options: {
      /** 是否在加载失败时抛出异常（默认 true） */
      throwOnError?: boolean;
      /** 自定义日志函数（默认 console.error） */
      logger?: (msg: string, ...args: any[]) => void;
      /** 调用方路径（用于解析相对路径） */
      callerPath?: string;
    } = {}
  ): LoadResult<T> {
    const {
      throwOnError = true,
      logger = console.error,
      callerPath = __dirname,
    } = options;

    const actualExportName = exportName || moduleName;
    const result: LoadResult<T> = {
      module: null,
      success: false,
    };

    // 定义可能的加载路径
    const paths = this.getLoadPaths(callerPath, moduleName);

    // 尝试从每个路径加载
    for (const loadPath of paths) {
      try {
        const module = require(loadPath);
        const exported = module[actualExportName] || module.default?.[actualExportName];

        if (exported) {
          result.module = exported;
          result.success = true;
          result.loadedFrom = loadPath;
          return result;
        }
      } catch (e) {
        // 继续尝试下一个路径
        continue;
      }
    }

    // 所有路径都加载失败
    const error = new ParserError(
      `Failed to load ANTLR4 module '${moduleName}' (export '${actualExportName}'). ` +
        `Tried paths:\n  - ${paths.join('\n  - ')}\n` +
        `Make sure to run 'pnpm run generate:parser' to generate the parser files.`,
      ''
    );

    result.error = error;

    if (throwOnError) {
      throw error;
    }

    logger(`[ERROR] ${error.message}`);

    return result;
  }

  /**
   * 获取模块加载路径列表
   * @param callerPath 调用方路径
   * @param moduleName 模块名称
   * @returns 路径列表
   */
  private static getLoadPaths(callerPath: string, moduleName: string): string[] {
    const relativePath = path.join(callerPath, '../../../');

    // require() 调用本身已在 try/catch 中，无需 existsSync 预检（TOCTOU 反模式）
    return [
      // 1. 编译后的 lib 目录（生产环境）
      path.join(relativePath, 'lib/generated/mysql', `${moduleName}.js`),
      // 2. 源目录（开发环境，ts-node 场景）
      path.join(relativePath, 'generated/mysql', moduleName),
      // 3. Node.js 模块解析兜底
      `antlr4ng/src/${moduleName}`,
    ];
  }

  /**
   * 批量加载多个模块
   * @param modules 模块配置数组
   * @returns 加载结果映射
   */
  static loadModules<T extends Record<string, any>>(
    modules: Array<{ name: string; export?: string; key: string }>
  ): Record<string, LoadResult<any>> {
    const results: Record<string, LoadResult<any>> = {};

    for (const config of modules) {
      results[config.key] = this.loadModule(config.name, config.export, {
        throwOnError: false,
      });
    }

    return results;
  }

  /**
   * 验证必需的模块是否都已加载
   * @param results 加载结果映射
   * @param requiredKeys 必需的键列表
   * @returns 是否全部成功
   */
  static validateRequired(
    results: Record<string, LoadResult<any>>,
    requiredKeys: string[]
  ): boolean {
    for (const key of requiredKeys) {
      const result = results[key];
      if (!result || !result.success) {
        return false;
      }
    }
    return true;
  }
}

```


> 代码路径  `src\utils\index.ts`

```typescript
/**
 * 工具类模块导出
 */

export * from './table-info-collector';
export * from './listener-binder';
export * from './antlr4-loader';
export * from './tenant-id-validator';

```


> 代码路径  `src\utils\listener-binder.ts`

```typescript
/**
 * Listener 方法绑定工具
 * 自动绑定 ANTLR4 Listener 方法到实例，解决基类 undefined 属性遮蔽问题
 */

import type { MySqlParserListener } from '../core/antlr4-types';

/**
 * 方法绑定选项
 */
export interface BindingOptions {
  /** 是否忽略未实现的方法 */
  ignoreMissing?: boolean;
  /** 自定义方法名列表（如果提供，只绑定这些方法） */
  methods?: string[];
}

/**
 * Listener 方法绑定器
 * ANTLR4 生成的 Listener 基类将所有方法定义为 undefined 属性，
 * 这会遮蔽原型方法。此类自动将原型方法绑定到实例。
 */
export class ListenerBinder {
  /**
   * ANTLR4 MySQL Parser 常用方法名列表
   */
  private static readonly COMMON_METHODS = [
    // CTE
    'enterCteName',
    // DML
    'enterInsertStatement',
    'enterQuerySpecification',
    'enterQuerySpecificationNointo',
    'enterUpdateStatement',
    'enterDeleteStatement',
    'enterSelectStatement',
    // DDL
    'enterCreateDatabase',
    'enterCreateTable',
    'enterDropDatabase',
    'enterDropTable',
    'enterAlterTable',
    // 通用方法
    'enterEveryRule',
    'exitEveryRule',
    'visitTerminal',
    'visitErrorNode',
  ];

  /**
   * 自动绑定 Listener 实例的所有方法
   * @param listener Listener 实例
   * @param options 绑定选项
   * @returns 绑定后的 Listener 实例（链式调用）
   */
  static bind<T extends MySqlParserListener>(
    listener: T,
    options: BindingOptions = {}
  ): T {
    const { ignoreMissing = true, methods } = options;

    // 确定要绑定的方法列表
    const methodsToBind = methods || this.COMMON_METHODS;

    // 获取原型
    const prototype = Object.getPrototypeOf(listener);

    for (const methodName of methodsToBind) {
      // 检查原型上是否有此方法
      if (typeof prototype[methodName] === 'function') {
        // 绑定方法到实例
        (listener as any)[methodName] = prototype[methodName].bind(listener);
      } else if (!ignoreMissing) {
        throw new Error(
          `Method '${methodName}' not found on listener prototype. ` +
            `Make sure the method is defined on the class.`
        );
      }
    }

    return listener;
  }

  /**
   * 使用装饰器自动绑定方法
   * 可以在类定义时使用 @AutoBind() 装饰器
   */
  static AutoBind(options: BindingOptions = {}) {
    return function <T extends { new (...args: any[]): MySqlParserListener }>(
      constructor: T
    ) {
      return class extends constructor {
        constructor(...args: any[]) {
          super(...args);
          ListenerBinder.bind(this as any, options);
        }
      };
    };
  }

  /**
   * 批量绑定多个 Listener
   * @param listeners Listener 实例数组
   * @param options 绑定选项
   */
  static bindAll<T extends MySqlParserListener>(
    listeners: T[],
    options: BindingOptions = {}
  ): T[] {
    return listeners.map(listener => this.bind(listener, options));
  }

  /**
   * 扫描类原型上所有 enter/exit 开头的方法并自动绑定
   * @param listener Listener 实例
   * @param options 绑定选项
   */
  static bindAllEnterExit<T extends MySqlParserListener>(
    listener: T,
    options: BindingOptions = {}
  ): T {
    const prototype = Object.getPrototypeOf(listener);
    const methods: string[] = [];

    // 扫描原型上所有方法
    for (const key of Object.getOwnPropertyNames(prototype)) {
      if (
        (key.startsWith('enter') || key.startsWith('exit')) &&
        typeof prototype[key] === 'function'
      ) {
        methods.push(key);
      }
    }

    return this.bind(listener, { ...options, methods });
  }
}

```


> 代码路径  `src\utils\table-info-collector.ts`

```typescript
/**
 * 表信息收集工具类
 * 统一处理从 ANTLR4 语法树中提取表信息的逻辑
 */

import type {
  TableInfo,
  FromClauseContext,
  TableSourcesContext,
  TableSourceItemContext,
  JoinedTableContext,
  TableNameContext,
  ParserRuleContext,
} from '../core/antlr4-types';

/**
 * 表信息收集器
 * 提供静态方法从各种上下文中提取表信息
 */
export class TableInfoCollector {
  /**
   * 从 FROM 子句收集表信息
   * @param fromClause FROM 子句上下文
   * @returns 表信息数组
   */
  static collectFromFromClause(fromClause: FromClauseContext): TableInfo[] {
    const tables: TableInfo[] = [];
    const tableSources = fromClause.tableSources?.();
    if (!tableSources) {
      return tables;
    }

    for (let i = 0; i < tableSources.getChildCount(); i++) {
      const tableSourceBase = tableSources.getChild(i);
      if (!tableSourceBase) {
        continue;
      }

      // 遍历子节点
      for (let j = 0; j < (tableSourceBase.getChildCount?.() || 0); j++) {
        const child = tableSourceBase.getChild(j);
        if (!child) {
          continue;
        }

        // 检查是否是 JOIN 上下文（先检查 JOIN，避免重复收集表）
        const childName = child.constructor?.name || '';
        if (childName.includes('Join')) {
          const joinedTables = this.collectFromJoinContext(child as JoinedTableContext);
          tables.push(...joinedTables);
        } else if ((child as TableSourceItemContext).tableName) {
          // 检查是否是 AtomTableItemContext
          const tableNameCtx = (child as TableSourceItemContext).tableName?.();
          if (tableNameCtx) {
            const tableInfo = this.extractTableInfo(tableNameCtx, child as TableSourceItemContext);
            if (tableInfo) {
              tables.push(tableInfo);
            }
          }
        }
      }
    }

    return tables;
  }

  /**
   *从 TableSources 收集表信息
   * @param tableSources 表源列表上下文
   * @returns 表信息数组
   */
  static collectFromTableSources(tableSources: TableSourcesContext): TableInfo[] {
    const tables: TableInfo[] = [];

    for (let i = 0; i < tableSources.getChildCount(); i++) {
      const tableSourceBase = tableSources.getChild(i);
      if (!tableSourceBase) {
        continue;
      }

      for (let j = 0; j < (tableSourceBase.getChildCount?.() || 0); j++) {
        const child = tableSourceBase.getChild(j);
        if (!child) {
          continue;
        }

        // 先检查是否是 JOIN 上下文（避免 break 导致 JOIN 被跳过）
        const childName = child.constructor?.name || '';
        if (childName.includes('Join')) {
          const joinedTables = this.collectFromJoinContext(child as JoinedTableContext);
          tables.push(...joinedTables);
        } else if ((child as TableSourceItemContext).tableName) {
          // 检查是否是表名上下文
          const tableNameCtx = (child as TableSourceItemContext).tableName?.();
          if (tableNameCtx) {
            const tableInfo = this.extractTableInfo(tableNameCtx, child as TableSourceItemContext);
            if (tableInfo) {
              tables.push(tableInfo);
            }
          }
        }
      }
    }

    return tables;
  }

  /**
   * 从 JOIN 上下文收集表信息（支持嵌套 JOIN）
   * @param joinCtx JOIN 上下文
   * @returns 表信息数组
   */
  static collectFromJoinContext(joinCtx: JoinedTableContext): TableInfo[] {
    const tables: TableInfo[] = [];
    const seenKeys = new Set<string>(); // 用于去重

    const collectFromContext = (ctx: ParserRuleContext) => {
      for (let i = 0; i < (ctx.getChildCount?.() || 0); i++) {
        const child = ctx.getChild(i);
        if (!child) {
          continue;
        }

        if ((child as TableSourceItemContext).tableName) {
          const tableNameCtx = (child as TableSourceItemContext).tableName?.();
          if (tableNameCtx) {
            const tableInfo = this.extractTableInfo(tableNameCtx, child as TableSourceItemContext);
            if (tableInfo) {
              // 使用 fullName 和 alias 作为唯一键进行去重
              const key = tableInfo.alias || `${tableInfo.fullName}.${tableInfo.simpleName}`;
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                tables.push(tableInfo);
              }
            }
          }
        }

        // 递归处理嵌套的 JOIN
        const childName = child.constructor?.name || '';
        if (childName.includes('Join')) {
          collectFromContext(child);
        }
      }
    };

    collectFromContext(joinCtx);
    return tables;
  }

  /**
   * 从表名上下文和父上下文中提取表信息
   * @param tableNameCtx 表名上下文
   * @param parentCtx 父上下文（用于提取别名）
   * @returns 表信息
   */
  static extractTableInfo(
    tableNameCtx: TableNameContext,
    parentCtx?: TableSourceItemContext
  ): TableInfo | null {
    if (!tableNameCtx) {
      return null;
    }

    const fullName = tableNameCtx.getText() || '';
    const simpleName = this.extractSimpleName(tableNameCtx);

    const tableInfo: TableInfo = { fullName, simpleName };

    // 提取别名
    if (parentCtx) {
      if (parentCtx._alias) {
        tableInfo.alias = parentCtx._alias.getText();
      } else if (parentCtx.alias) {
        tableInfo.alias = parentCtx.alias.getText();
      } else if (parentCtx.uid) {
        // uid 可能是方法或属性
        const uid = typeof parentCtx.uid === 'function' ? (parentCtx.uid as () => { getText(): string })() : parentCtx.uid;
        if (uid) {
          tableInfo.alias = uid.getText();
        }
      }
    }

    return tableInfo;
  }

  /**
   * 提取简单表名（不带数据库前缀）
   * @param tableNameCtx 表名上下文
   * @returns 简单表名
   */
  static extractSimpleName(tableNameCtx: TableNameContext): string {
    if (!tableNameCtx) {
      return '';
    }

    const text = tableNameCtx.getText() || '';
    if (text.includes('.')) {
      return text.split('.').pop() || text;
    }
    return text;
  }

  /**
   * 从 TableSources 提取表名列表（包含别名）
   * 用于 UPDATE 语句
   * @param tableSources 表源列表上下文
   * @returns 表信息数组
   */
  static extractFromTableSources(tableSources: TableSourcesContext): TableInfo[] {
    const tables: TableInfo[] = [];

    for (let i = 0; i < tableSources.getChildCount(); i++) {
      const tableSourceBase = tableSources.getChild(i);
      if (!tableSourceBase) {
        continue;
      }

      for (let j = 0; j < (tableSourceBase.getChildCount?.() || 0); j++) {
        const child = tableSourceBase.getChild(j);
        if (!child) {
          continue;
        }

        if ((child as TableSourceItemContext).tableName) {
          const tableNameCtx = (child as TableSourceItemContext).tableName?.();
          if (tableNameCtx) {
            const tableInfo = this.extractTableInfo(tableNameCtx, child as TableSourceItemContext);
            if (tableInfo) {
              tables.push(tableInfo);
              break; // 找到表名后跳出内层循环
            }
          }
        }
      }
    }

    return tables;
  }
}

```


> 代码路径  `src\utils\tenant-id-validator.ts`

```typescript
/**
 * 租户 ID 验证和转义工具
 */
export class TenantIdValidator {
  /**
   * 租户 ID 格式验证正则
   * 只允许字母、数字、下划线和连字符
   */
  private static readonly TENANT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

  /**
   * 最大租户 ID 长度
   */
  private static readonly MAX_TENANT_ID_LENGTH = 128;

  /**
   * 验证租户 ID 格式
   * @param tenantId 租户 ID
   * @returns 是否有效
   */
  static isValid(tenantId: string): boolean {
    if (!tenantId || typeof tenantId !== 'string') {
      return false;
    }

    // 检查长度
    if (tenantId.length > this.MAX_TENANT_ID_LENGTH) {
      return false;
    }

    // 检查格式
    return this.TENANT_ID_PATTERN.test(tenantId);
  }

  /**
   * 验证租户 ID，如果不合法则抛出错误
   * @param tenantId 租户 ID
   * @throws {Error} 如果租户 ID 格式不合法
   */
  static validate(tenantId: string): void {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error(
        'TenantId is required and must be a string'
      );
    }

    if (tenantId.length === 0) {
      throw new Error('TenantId cannot be empty');
    }

    if (tenantId.length > this.MAX_TENANT_ID_LENGTH) {
      throw new Error(
        `TenantId exceeds maximum length of ${this.MAX_TENANT_ID_LENGTH} characters`
      );
    }

    if (!this.TENANT_ID_PATTERN.test(tenantId)) {
      throw new Error(
        `TenantId contains invalid characters. ` +
        `Only alphanumeric characters, underscores and hyphens are allowed. ` +
        `Received: "${tenantId}"`
      );
    }
  }

  /**
   * 转义租户 ID 以便安全地嵌入 SQL 字符串字面量
   * 转义规则：
   * - 反斜杠 (\) -> 双反斜杠 (\\)
   * - 单引号 (') -> 反斜杠单引号 (\')
   * - 双引号 (") -> 反斜杠双引号 (\")
   * - 换行符 -> \n
   * - 回车符 -> \r
   * - 制表符 -> \t
   * - NULL 字符 -> \0
   *
   * 注意：这只能防御基本的 SQL 注入。对于生产环境，建议使用参数化查询。
   *
   * @param tenantId 租户 ID
   * @returns 转义后的租户 ID
   */
  static escapeForSql(tenantId: string): string {
    // 首先验证格式
    this.validate(tenantId);

    // 替换特殊字符
    return tenantId
      .replace(/\\/g, '\\\\')   // 反斜杠必须首先处理
      .replace(/'/g, "\\'")     // 单引号
      .replace(/"/g, '\\"')     // 双引号
      .replace(/\n/g, '\\n')    // 换行符
      .replace(/\r/g, '\\r')    // 回车符
      .replace(/\t/g, '\\t')    // 制表符
      .replace(/\0/g, '\\0');   // NULL 字符
  }

  /**
   * 获取安全的 SQL 字符串字面量
   * 返回带单引号包围的转义后租户 ID
   *
   * @param tenantId 租户 ID
   * @returns SQL 安全的字面量字符串，如 "'tenant_123'"
   */
  static toSqlLiteral(tenantId: string): string {
    const escaped = this.escapeForSql(tenantId);
    return `'${escaped}'`;
  }
}

```


> 代码路径  `src\listeners\base\base-listener.ts`

```typescript
import { ISQLListener } from '../../core/interfaces';
import { BaseListenerConfig, ListenerContext, ParseTree } from '../../core/types';

/**
 * 基础 Listener 抽象类
 * 所有自定义 Listener 都应该继承此类
 */
export abstract class BaseListener<TConfig extends BaseListenerConfig = BaseListenerConfig>
  implements ISQLListener {
  /** Listener 名称 */
  protected abstract readonly name: string;

  /** Listener 配置 */
  protected config: TConfig;

  /** Listener 上下文 */
  protected context!: ListenerContext;

  constructor(config: TConfig) {
    this.config = config;
  }

  /**
   * 检查 Listener 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 初始化 Listener
   * 在每次执行前调用，用于设置上下文
   */
  initialize(context: ListenerContext): void {
    this.context = context;
    this.onInitialize();
  }

  /**
   * 初始化钩子（子类可重写）
   */
  protected onInitialize(): void {
    // 子类可以实现自定义的初始化逻辑
  }

  /**
   * 处理前的钩子
   */
  beforeProcess?(context: ListenerContext): void {
    // 子类可以实现
  }

  /**
   * 处理 AST（子类必须实现）
   */
  abstract process(ast: ParseTree, context: ListenerContext): void;

  /**
   * 处理后的钩子
   */
  afterProcess?(context: ListenerContext): void {
    // 子类可以实现
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.onCleanup();
  }

  /**
   * 清理钩子（子类可重写）
   */
  protected onCleanup(): void {
    // 子类可以实现自定义的清理逻辑
  }

  /**
   * 获取 Listener 名称
   */
  getName(): string {
    return this.name;
  }

  /**
   * 获取 Listener 优先级
   */
  abstract getPriority(): number;
}

```


> 代码路径  `src\listeners\base\listener-chain.ts`

```typescript
import { BaseListener } from './base-listener';
import { ListenerContext, ListenerResult } from '../../core/types';

/**
 * Listener 链
 * 负责按优先级顺序执行多个 Listener
 */
export class ListenerChain {
  private listeners: BaseListener[] = [];

  /**
   * 添加 Listener
   */
  addListener(listener: BaseListener): void {
    this.listeners.push(listener);
    // 按优先级排序（数字越小越先执行）
    this.listeners.sort((a, b) => a.getPriority() - b.getPriority());
  }

  /**
   * 移除 Listener
   */
  removeListener(listener: BaseListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 执行所有启用的 Listener（同步方法）
   */
  execute(context: ListenerContext): ListenerResult[] {
    const results: ListenerResult[] = [];

    for (const listener of this.listeners) {
      if (!listener.isEnabled()) {
        continue;
      }

      const startTime = Date.now();
      let modified = false;

      try {
        // 初始化 Listener
        listener.initialize(context);

        // 执行前置钩子
        listener.beforeProcess?.(context);

        // 记录此 listener 执行前的 SQL 快照，用于准确判断当前 listener 是否做了修改
        const sqlBefore = context.rewriter.getText();
        listener.process(context.parseTree, context);

        // 检查是否修改（与执行前快照比较，而非与原始 SQL 比较）
        modified = context.rewriter.getText() !== sqlBefore;

        // 执行后置钩子
        listener.afterProcess?.(context);

        results.push({
          listenerName: listener.getName(),
          modified,
          metadata: {
            executionTime: Date.now() - startTime,
          },
        });

        // 如果出错且配置为中断，则停止执行
      } catch (error) {
        const errorResult: ListenerResult = {
          listenerName: listener.getName(),
          modified: false,
          error: error as Error,
          metadata: {
            executionTime: Date.now() - startTime,
          },
        };
        results.push(errorResult);

        // 检查是否需要中断
        const abortOnError = (listener as any).config?.abortOnError ?? false;
        if (abortOnError) {
          break;
        }
      } finally {
        // 清理资源
        listener.cleanup();
      }
    }

    return results;
  }

  /**
   * 获取所有 Listener
   */
  getListeners(): BaseListener[] {
    return [...this.listeners];
  }

  /**
   * 清空所有 Listener
   */
  clear(): void {
    this.listeners = [];
  }
}

```


> 代码路径  `src\listeners\database\database-rewrite-listener.ts`

```typescript
import { BaseListener } from '../base/base-listener';
import {
  ListenerContext,
  DatabaseRewriteListenerConfig,
  TokenStreamRewriter,
  SHARED_STATE_KEYS,
} from '../../core/types';
import type {
  MySqlParserListener,
  ParserRuleContext,
} from '../../core/antlr4-types';
import { ParseTreeWalker, CommonTokenStream } from 'antlr4ng';
import { ListenerBinder } from '../../utils/listener-binder';
import { Antlr4Loader } from '../../utils/antlr4-loader';

// 动态导入生成的 ANTLR4 Listener
const { module: MySqlParserListener, success: listenerLoaded } = Antlr4Loader.loadModule(
  'MySqlParserListener',
  'MySqlParserListener',
  {
    throwOnError: true,
    callerPath: __dirname,
  }
);

/**
 * 库名改写 Listener
 * 负责在 SQL 中为数据库名添加前缀
 * 优先级 50（在 HintListener 之后、TenantFilterListener 之前）
 */
export class DatabaseRewriteListener extends BaseListener<DatabaseRewriteListenerConfig> {
  protected readonly name = 'DatabaseRewriteListener';

  getPriority(): number {
    return 50;
  }

  process(_ast: unknown, context: ListenerContext): void {
    const { dbPrefix } = this.config;
    if (!dbPrefix) {
      return;
    }

    const { rewriter, tokenStream, parseTree } = context;

    const antlrListener = new DatabaseNameRewriteListener(
      rewriter,
      tokenStream,
      dbPrefix,
      this.config.targetDatabases,
      this.config.excludeDatabases
    );

    ListenerBinder.bindAllEnterExit(antlrListener as any);

    ParseTreeWalker.DEFAULT.walk(antlrListener as any, parseTree as any);

    // 将 dbPrefix 写入 sharedState，供 TenantFilterListener 在处理同名表冲突时使用
    context.sharedState.set(SHARED_STATE_KEYS.DB_REWRITE_PREFIX, dbPrefix);
  }
}

/**
 * ANTLR4 Listener 实现
 * 遍历语法树，找到所有表名中的库名部分并添加前缀
 */
class DatabaseNameRewriteListener extends (MySqlParserListener as any) {
  // 记录已处理过的 token index，避免重复替换
  private processedTokens = new Set<number>();

  constructor(
    private readonly rewriter: TokenStreamRewriter,
    private readonly tokenStream: CommonTokenStream,
    private readonly dbPrefix: string,
    private readonly targetDatabases?: string[],
    private readonly excludeDatabases?: string[]
  ) {
    super();
  }

  /**
   * 进入 tableName 节点时，对库名部分进行改写
   * 处理 FROM/JOIN/INSERT/UPDATE/DELETE 中的表名引用
   */
  enterTableName(ctx: ParserRuleContext): void {
    const text = ctx.getText();
    if (!text || !text.includes('.')) {
      return; // 没有库名部分，跳过
    }

    const dotIndex = text.indexOf('.');
    const rawDbPart = text.substring(0, dotIndex);
    const dbName = this.stripBackticks(rawDbPart);

    if (!this.shouldRewrite(dbName)) {
      return;
    }

    const newDbName = this.dbPrefix + dbName;

    // 找到库名对应的 token 并替换
    this.replaceDbNameToken(ctx, dbName, newDbName);
  }

  /**
   * 进入 fullColumnName 节点时，对列引用中的库名部分进行改写
   * 处理 SELECT/ON/WHERE/HAVING/ORDER BY 中的 db.table.column 格式引用
   * 只处理三层结构（两个点），跳过 table.column（一个点）和单独列名
   */
  enterFullColumnName(ctx: ParserRuleContext): void {
    const text = ctx.getText();
    if (!text) {
      return;
    }

    // 找到前两个点的位置，判断是否为三层结构 db.table.column
    const firstDot = text.indexOf('.');
    if (firstDot === -1) {
      return; // 无点，只是列名，跳过
    }
    const secondDot = text.indexOf('.', firstDot + 1);
    if (secondDot === -1) {
      return; // 只有一个点（table.column），不是库名引用，跳过
    }
    const thirdDot = text.indexOf('.', secondDot + 1);
    if (thirdDot !== -1) {
      return; // 超过三层，跳过（异常格式）
    }

    // 提取库名（第一个点之前的部分）
    const rawDbPart = text.substring(0, firstDot);
    const dbName = this.stripBackticks(rawDbPart);

    if (!this.shouldRewrite(dbName)) {
      return;
    }

    const newDbName = this.dbPrefix + dbName;
    this.replaceDbNameToken(ctx, dbName, newDbName);
  }

  /**
   * 替换库名 token
   * tableName 通常由多个 token 组成: [dbName] [.] [tableName]
   * 我们需要找到 dbName 对应的 token 并替换
   */
  private replaceDbNameToken(ctx: ParserRuleContext, dbName: string, newDbName: string): void {
    if (!ctx.start) {
      return;
    }

    const startIndex = ctx.start.tokenIndex;
    const stopIndex = ctx.stop?.tokenIndex ?? startIndex;

    // 扫描 token 范围，找到库名 token
    for (let i = startIndex; i <= stopIndex; i++) {
      if (this.processedTokens.has(i)) {
        continue;
      }

      const token = this.tokenStream.get(i);
      const tokenText = token.text || '';

      // 匹配库名 token（可能带反引号）
      const rawName = this.stripBackticks(tokenText);
      if (rawName === dbName) {
        const hasBackticks = tokenText.startsWith('`');
        const replacement = hasBackticks ? `\`${newDbName}\`` : newDbName;
        this.rewriter.replace(i, i, replacement);
        this.processedTokens.add(i);
        return;
      }
    }
  }

  /**
   * 判断库名是否需要改写
   */
  private shouldRewrite(dbName: string): boolean {
    if (!dbName) {
      return false;
    }

    // 已有前缀的不重复添加
    if (dbName.startsWith(this.dbPrefix)) {
      return false;
    }

    // 检查排除列表
    if (this.excludeDatabases?.includes(dbName)) {
      return false;
    }

    // 如果有目标列表，只改写目标库
    if (this.targetDatabases && this.targetDatabases.length > 0) {
      return this.targetDatabases.includes(dbName);
    }

    return true;
  }

  /**
   * 去除反引号
   */
  private stripBackticks(name: string): string {
    if (name.startsWith('`') && name.endsWith('`')) {
      return name.slice(1, -1);
    }
    return name;
  }
}

```


> 代码路径  `src\listeners\tenant\hint-listener.ts`

```typescript
import { BaseListener } from '../base/base-listener';
import { ListenerContext, HintListenerConfig, HintInfo, ParseTree, SHARED_STATE_KEYS, HINT_REGEX } from '../../core/types';

/**
 * Hint Listener
 * 负责提取和移除 SQL 中的 Hint
 */
export class HintListener extends BaseListener<HintListenerConfig> {
  protected readonly name = 'HintListener';

  /**
   * 获取优先级
   * Hint 提取应该最先执行（优先级最高）
   */
  getPriority(): number {
    return 10;
  }

  /**
   * 处理 SQL，提取 Hint
   */
  process(ast: ParseTree, context: ListenerContext): void {
    const originalSql = context.originalSql;

    // 提取租户 Hint
    const tenantInfo = this.extractTenantHint(originalSql);

    if (tenantInfo) {
      // 将租户信息存入共享状态，供其他 Listener 使用
      context.sharedState.set(SHARED_STATE_KEYS.TENANT_INFO, tenantInfo);

      // 如果不保留 Hint，则移除它
      if (!this.config.preserveHint && tenantInfo.original) {
        this.removeHint(tenantInfo.original, context);
      }
    }
  }

  /**
   * 提取租户 Hint
   * 支持格式：/*& tenant:'xxx' *\/
   */
  private extractTenantHint(sql: string): HintInfo | undefined {
    const match = sql.match(HINT_REGEX);

    if (match) {
      return {
        tenant: match[1],
        original: match[0],
      };
    }

    return undefined;
  }

  /**
   * 移除 Hint
   */
  private removeHint(hint: string, context: ListenerContext): void {
    const { rewriter, tokenStream } = context;

    // 找到 Hint 对应的 Token
    for (let i = 0; i < tokenStream.size; i++) {
      const token = tokenStream.get(i);
      const tokenText = token.text || '';

      // 检查 Token 是否包含 Hint
      // 注意：Hint 可能作为 COMMENT token 出现
      if (tokenText.toLowerCase().includes('tenant') && tokenText.includes("/*&")) {
        // 使用 TokenStreamRewriter 删除 Hint
        rewriter.replace(token.tokenIndex, token.tokenIndex, '');
        break;
      }
    }
  }
}

```


> 代码路径  `src\listeners\tenant\tenant-filter-listener.ts`

```typescript
import { BaseListener } from '../base/base-listener';
import {
  ListenerContext,
  TenantListenerConfig,
  TokenStreamRewriter,
  TokenStream,
} from '../../core/types';
import {
  TableInfo,
  MySqlParserListener,
  InsertStatementContext,
  UpdateStatementContext,
  DeleteStatementContext,
  QuerySpecificationContext,
  CteNameContext,
} from '../../core/antlr4-types';
import { ParseTreeWalker, CommonTokenStream } from 'antlr4ng';
import { TableInfoCollector } from '../../utils/table-info-collector';
import { ListenerBinder } from '../../utils/listener-binder';
import { Antlr4Loader } from '../../utils/antlr4-loader';
import { TenantIdValidator } from '../../utils/tenant-id-validator';
import { SHARED_STATE_KEYS } from '../../core/types';

// 动态导入生成的 ANTLR4 Listener（避免编译时依赖）
const { module: MySqlParserListener, success: listenerLoaded } = Antlr4Loader.loadModule(
  'MySqlParserListener',
  'MySqlParserListener',
  {
    throwOnError: true,
    callerPath: __dirname,
  }
);

/**
 * 租户条件 Listener
 * 负责在 SQL 中添加租户过滤条件
 */
export class TenantFilterListener extends BaseListener<TenantListenerConfig> {
  protected readonly name = 'TenantFilterListener';

  /**
   * 获取优先级
   * 租户过滤应该优先级较高（数字小），在库名改写之后执行
   */
  getPriority(): number {
    return 100;
  }

  /**
   * 处理 SQL（使用 ANTLR4 Listener 模式）
   */
  process(_ast: unknown, context: ListenerContext): void {
    const tenantInfo = context.sharedState.get(SHARED_STATE_KEYS.TENANT_INFO);
    if (!tenantInfo?.tenant) {
      return; // 没有租户信息，不处理
    }

    const { rewriter, tokenStream, parseTree } = context;
    const rawTenantId = tenantInfo.tenant;
    const tenantField = this.config.tenantField;

    // 验证并转义租户 ID（防止 SQL 注入）
    let escapedTenantId: string;
    try {
      escapedTenantId = TenantIdValidator.escapeForSql(rawTenantId);
    } catch (error) {
      throw new Error(
        `Invalid tenant ID in tenant-filter-listener: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // 每次调用创建新的 Set，避免跨调用的共享可变状态
    const cteTableNames = new Set<string>();

    // 读取 DatabaseRewriteListener 写入的库名前缀（用于同名表冲突时生成 db.table 限定形式）
    const dbRewritePrefix = (context.sharedState.get(SHARED_STATE_KEYS.DB_REWRITE_PREFIX) as string) || '';

    // 创建 ANTLR4 Listener 来遍历语法树
    const antlrListener = new TenantConditionListener(
      rewriter,
      tokenStream,
      escapedTenantId,
      tenantField,
      this.config.targetDatabases,
      cteTableNames,
      dbRewritePrefix
    );

    // 使用 ListenerBinder 自动绑定方法
    ListenerBinder.bindAllEnterExit(antlrListener);

    // 使用 ParseTreeWalker 遍历语法树
    // ParseTreeWalker.DEFAULT.walk 的第二个参数类型为 any，需要保留断言
    ParseTreeWalker.DEFAULT.walk(antlrListener as any, parseTree as any);
  }
}

/**
 * ANTLR4 Listener 实现
 * 用于遍历 MySQL 语法树并注入租户条件
 */
class TenantConditionListener extends (MySqlParserListener as any) {
  constructor(
    private readonly rewriter: TokenStreamRewriter,
    private readonly tokenStream: CommonTokenStream,
    private readonly tenantId: string,
    private readonly tenantField: string,
    private readonly targetDatabases: {
      prefixes: string[];
      fullNames: string[];
      defaultDatabase: string;
    },
    private readonly cteTableNames: Set<string>,
    private readonly dbRewritePrefix: string
  ) {
    super();
  }

  /**
   * 收集 CTE 表名
   */
  enterCteName(ctx: CteNameContext): void {
    const tableName = ctx.getText();
    if (tableName) {
      this.cteTableNames.add(tableName);
    }
  }

  /**
   * 处理 INSERT 语句
   */
  enterInsertStatement(ctx: InsertStatementContext): void {
    const tableName = ctx.tableName?.();
    if (!tableName) {
      return;
    }

    const fullTableName = tableName.getText();
    if (!this.shouldInjectTenant(fullTableName)) {
      return;
    }

    // 检查是否是 INSERT ... SET 语法
    if (ctx.SET?.()) {
      this.handleInsertSet(ctx);
      return;
    }

    // 处理 INSERT INTO ... (columns) VALUES ... 语法
    const columnsList = ctx.fullColumnNameList?.();
    const insertValue = ctx.insertStatementValue?.();

    if (!columnsList || !insertValue) {
      return;
    }

    // 在列列表的开头插入租户字段
    const leftBracket = ctx.LR_BRACKET?.(0);
    if (leftBracket) {
      const bracketToken = leftBracket.symbol;
      if (bracketToken) {
        this.rewriter.insertAfter(bracketToken.tokenIndex, ` ${this.tenantField},`);
      }
    }

    // 检查是 VALUES 还是 SELECT 语法
    const valueLists = insertValue.expressionsWithDefaults?.();
    if (valueLists && valueLists.length > 0) {
      // INSERT ... VALUES 语法：在每个 VALUES 行的左括号后插入租户值
      for (const valueList of valueLists) {
        if (valueList && valueList.start) {
          const valueStartToken = valueList.start;
          const leftParenIndex = valueStartToken.tokenIndex - 1;
          const leftParenToken = this.tokenStream.get(leftParenIndex);
          if (leftParenToken && leftParenToken.text === '(') {
            this.rewriter.insertAfter(leftParenIndex, ` '${this.tenantId}',`);
          }
        }
      }
    } else {
      // INSERT ... SELECT 语法（含 UNION ALL）：在每个 SELECT 列列表开头插入租户值
      this.handleInsertSelect(insertValue as any);
    }
  }

  /**
   * 处理 INSERT ... SET 语法
   */
  private handleInsertSet(ctx: InsertStatementContext): void {
    const elements = (ctx as any).updatedElement?.();
    if (elements && elements.length > 0) {
      const lastElement = elements[elements.length - 1];
      if (lastElement?.stop) {
        const condition = `${this.tenantField} = '${this.tenantId}'`;
        this.rewriter.insertAfter(lastElement.stop.tokenIndex, `, ${condition}`);
      }
    }
  }

  /**
   * 处理 INSERT ... SELECT 语法（含 UNION ALL）
   * 在每个 SELECT 的列列表开头插入租户值
   */
  private handleInsertSelect(insertValueCtx: any): void {
    const querySpecs = this.collectQuerySpecifications(insertValueCtx);
    for (const querySpec of querySpecs) {
      this.injectTenantValueIntoSelect(querySpec);
    }
  }

  /**
   * 递归收集所有 querySpecification 上下文
   * 找到 QuerySpecification 后不再递归进入，避免收集子查询中的 SELECT
   */
  private collectQuerySpecifications(ctx: any): any[] {
    const results: any[] = [];
    const ctxName = ctx.constructor?.name || '';
    if (ctxName.includes('QuerySpecification')) {
      results.push(ctx);
      return results;
    }
    for (let i = 0; i < (ctx.getChildCount?.() || 0); i++) {
      const child = ctx.getChild(i);
      if (child) {
        results.push(...this.collectQuerySpecifications(child));
      }
    }
    return results;
  }

  /**
   * 在 SELECT 列列表开头插入租户值
   * 找到 SelectElements 节点，在其第一个 token 前插入
   */
  private injectTenantValueIntoSelect(querySpecCtx: any): void {
    for (let i = 0; i < (querySpecCtx.getChildCount?.() || 0); i++) {
      const child = querySpecCtx.getChild(i);
      if (!child) {
        continue;
      }
      const name = child.constructor?.name || '';
      if (name.includes('SelectElements')) {
        const startToken = child.start;
        if (startToken) {
          this.rewriter.insertBefore(startToken.tokenIndex, `'${this.tenantId}', `);
          return;
        }
      }
    }
  }

  /**
   * 构建租户条件表达式
   * 当多张表的 alias/simpleName 相同（同名表来自不同库，无别名）时，
   * 改用 db.table 限定形式避免 MySQL 歧义错误
   * @param tables 表信息数组
   * @returns 租户条件字符串
   */
  private buildTenantConditions(tables: TableInfo[]): string {
    // 只保留需要注入租户的表
    const tenantTables = tables.filter(t => this.shouldInjectTenant(t.fullName));
    if (tenantTables.length === 0) {
      return '';
    }

    // 统计每个 qualifier（alias || simpleName）出现次数，检测同名冲突
    const qualifierCount = new Map<string, number>();
    for (const table of tenantTables) {
      const q = table.alias || table.simpleName;
      qualifierCount.set(q, (qualifierCount.get(q) || 0) + 1);
    }

    const conditions: string[] = [];
    for (const table of tenantTables) {
      const qualifier = table.alias || table.simpleName;
      if ((qualifierCount.get(qualifier) || 0) > 1) {
        // 同名冲突：用 effectiveDb.table 限定，避免歧义
        // effectiveDb = dbRewritePrefix + originalDb（若有库名改写），否则用原始库名
        const dbPart = table.fullName.includes('.') ? table.fullName.split('.')[0] : null;
        if (dbPart) {
          const effectiveDb = this.dbRewritePrefix ? this.dbRewritePrefix + dbPart : dbPart;
          conditions.push(`${effectiveDb}.${table.simpleName}.${this.tenantField} = '${this.tenantId}'`);
        } else {
          // 无库名信息（走默认库），退回 simpleName
          conditions.push(`${qualifier}.${this.tenantField} = '${this.tenantId}'`);
        }
      } else {
        conditions.push(`${qualifier}.${this.tenantField} = '${this.tenantId}'`);
      }
    }

    return conditions.join(' AND ');
  }

  /**
   * 注入 WHERE 子句
   * @param expressionCtx 表达式上下文
   * @param whereToken WHERE token
   * @param tenantCondition 租户条件
   */
  private injectWhereClause(
    expressionCtx: { stop?: { tokenIndex: number } } | null | undefined,
    whereToken: { stop?: { tokenIndex: number } },
    tenantCondition: string
  ): void {
    if (expressionCtx?.stop) {
      // 已有 WHERE 子句，使用 AND 连接
      this.rewriter.insertAfter(expressionCtx.stop.tokenIndex, ` AND ${tenantCondition}`);
    } else if (whereToken.stop) {
      // 没有 WHERE 子句，添加新的 WHERE
      this.rewriter.insertAfter(whereToken.stop.tokenIndex, ` WHERE ${tenantCondition}`);
    }
  }

  /**
   * 处理 SELECT 语句
   */
  enterQuerySpecification(ctx: QuerySpecificationContext): void {
    this.handleQuerySpecification(ctx);
  }

  /**
   * 处理 UNION 等查询中的 SELECT 语句
   * UNION 查询使用 querySpecificationNointo 节点
   */
  enterQuerySpecificationNointo(ctx: QuerySpecificationContext): void {
    this.handleQuerySpecification(ctx);
  }

  /**
   * 统一的 SELECT 语句处理逻辑
   */
  private handleQuerySpecification(ctx: QuerySpecificationContext): void {
    const fromClause = ctx.fromClause?.();
    if (!fromClause) {
      return;
    }

    const tables = TableInfoCollector.collectFromFromClause(fromClause);
    if (tables.length === 0) {
      return;
    }

    const tenantCondition = this.buildTenantConditions(tables);
    if (tenantCondition.length === 0) {
      return;
    }

    const expression = fromClause.expression?.();
    this.injectWhereClause(expression, fromClause, tenantCondition);
  }

  /**
   * 处理 UPDATE 语句
   */
  enterUpdateStatement(ctx: UpdateStatementContext): void {
    const singleUpdate = ctx.singleUpdateStatement?.();
    if (!singleUpdate) {
      return;
    }

    const tableSources = singleUpdate.tableSources?.();
    if (!tableSources) {
      return;
    }

    const tables = TableInfoCollector.collectFromTableSources(tableSources);
    if (tables.length === 0) {
      return;
    }

    const tenantCondition = this.buildTenantConditions(tables);
    if (tenantCondition.length === 0) {
      return;
    }

    const expression = singleUpdate.expression?.();
    this.injectWhereClause(expression, singleUpdate, tenantCondition);
  }

  /**
   * 处理 DELETE 语句
   */
  enterDeleteStatement(ctx: DeleteStatementContext): void {
    // 处理 singleDeleteStatement
    const singleDelete = ctx.singleDeleteStatement?.();
    if (singleDelete) {
      this.handleSingleDelete(singleDelete);
      return;
    }

    // 处理 multipleDeleteStatement (DELETE ... FROM ... JOIN ...)
    const multipleDelete = ctx.multipleDeleteStatement?.();
    if (multipleDelete) {
      this.handleMultipleDelete(multipleDelete);
    }
  }

  /**
   * 处理单表 DELETE 语句
   */
  private handleSingleDelete(singleDelete: { tableName?: () => any; WHERE?: () => any; expression?: () => any; stop?: { tokenIndex: number } }): void {
    const tableName = singleDelete.tableName?.();
    if (!tableName) {
      return;
    }

    const fullName = tableName.getText();
    if (!this.shouldInjectTenant(fullName)) {
      return;
    }

    const simpleName = TableInfoCollector.extractSimpleName(tableName);
    const tenantCondition = `${simpleName}.${this.tenantField} = '${this.tenantId}'`;

    const expression = singleDelete.expression?.();
    this.injectWhereClause(expression, singleDelete, tenantCondition);
  }

  /**
   * 处理多表 DELETE 语句 (DELETE ... FROM ... JOIN ...)
   */
  private handleMultipleDelete(ctx: { tableSources?: () => any; WHERE?: () => any; expression?: () => any; stop?: { tokenIndex: number } }): void {
    const tableSources = ctx.tableSources?.();
    if (!tableSources) {
      return;
    }

    const tables = TableInfoCollector.collectFromTableSources(tableSources);
    if (tables.length === 0) {
      return;
    }

    const tenantCondition = this.buildTenantConditions(tables);
    if (tenantCondition.length === 0) {
      return;
    }

    const expression = ctx.expression?.();
    this.injectWhereClause(expression, ctx, tenantCondition);
  }

  /**
   * 判断表是否需要注入租户字段
   * fullNames 和 prefixes 都是配置库名
   */
  private shouldInjectTenant(fullTableName: string): boolean {
    if (!fullTableName) {
      return false;
    }

    // 检查是否是 CTE 表
    if (this.cteTableNames.has(fullTableName)) {
      return false;
    }

    const databasePart = this.extractDatabasePart(fullTableName);
    if (!databasePart) {
      return false;
    }

    // 检查完整库名匹配
    if (this.targetDatabases.fullNames?.includes(databasePart)) {
      return true;
    }

    // 检查前缀匹配
    return this.matchesPrefix(databasePart);
  }

  /**
   * 从完整表名中提取库名部分（去除反引号等标识符引号）
   */
  private extractDatabasePart(fullTableName: string): string | null {
    if (fullTableName.includes('.')) {
      const raw = fullTableName.split('.')[0];
      return raw.replace(/^[`"']|[`"']$/g, '');
    }

    // 使用配置的默认库名
    return this.targetDatabases.defaultDatabase || null;
  }

  /**
   * 检查库名是否匹配配置的前缀
   */
  private matchesPrefix(databasePart: string): boolean {
    if (!this.targetDatabases.prefixes) {
      return false;
    }

    return this.targetDatabases.prefixes.some(
      prefix => databasePart.startsWith(prefix) || databasePart === prefix
    );
  }
}

```


> 代码路径  `src\parser\mysql\mysql-parser.ts`

```typescript
import { CharStream, CommonTokenStream } from 'antlr4ng';
import { BaseSQLParser } from '../base-parser';
import { SQLDialect } from '../../core/enums';
import type { ParseResult, ParseTree } from '../../core/types';
import type { ANTLR4Lexer, ANTLR4Parser } from '../../core/antlr4-types';
import { Antlr4Loader } from '../../utils/antlr4-loader';

// 导入生成的 ANTLR4 类
// 注意：需要先运行 pnpm run generate:parser 生成这些文件
const { module: MySqlLexer, success: lexerLoaded } = Antlr4Loader.loadModule<any>('MySqlLexer', 'MySqlLexer', {
  throwOnError: true,
  callerPath: __dirname,
});

const { module: MySqlParser, success: parserLoaded } = Antlr4Loader.loadModule<any>('MySqlParser', 'MySqlParser', {
  throwOnError: true,
  callerPath: __dirname,
});

// 验证加载结果
if (!lexerLoaded || !parserLoaded) {
  throw new Error('MySqlLexer or MySqlParser failed to load. Please run "pnpm run generate:parser" first.');
}

/**
 * MySQL Parser 实现
 * 基于 ANTLR4 生成的 MySQL Parser
 */
export class MySQLParser extends BaseSQLParser {
  /**
   * 获取方言类型
   */
  getDialect(): SQLDialect {
    return SQLDialect.MYSQL;
  }

  /**
   * 创建词法分析器
   */
  protected createLexer(inputStream: CharStream): ANTLR4Lexer {
    return new MySqlLexer(inputStream);
  }

  /**
   * 创建语法分析器
   */
  protected createParser(tokenStream: CommonTokenStream): ANTLR4Parser {
    return new MySqlParser(tokenStream);
  }

  /**
   * 开始解析
   * MySQL 的根规则是 `root`
   */
  protected startParsing(parser: ANTLR4Parser): ParseTree {
    // ANTLR4 生成的 Parser 有 root() 方法，但 TypeScript 类型中没有定义
    // 使用类型断言访问生成的解析方法
    return (parser as any).root() as ParseTree;
  }

  /**
   * 获取支持的 SQL 类型
   */
  getSupportedTypes(): string[] {
    return [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
      'DROP',
      'ALTER',
      'REPLACE',
      'TRUNCATE',
      'SHOW',
      'DESCRIBE',
      'EXPLAIN',
      'USE',
      'SET',
      'BEGIN',
      'COMMIT',
      'ROLLBACK',
    ];
  }
}

```


#### 代码说明

# @cs/sql-parser

基于 ANTLR4 的 SQL 改写库，支持 MySQL / TiDB，提供租户过滤注入、库名前缀改写等能力。

## 主要特性

- **多方言支持**：MySQL、TiDB
- **租户过滤注入**：自动在 SELECT / INSERT / UPDATE / DELETE 中添加租户条件
- **库名前缀改写**：批量为数据库名添加环境前缀（如 `dev_mc_`）
- **列引用同步改写**：SELECT 列表、ON 子句、WHERE 子句中的 `db.table.column` 同步改写
- **同名表冲突处理**：多库同名表 JOIN 时自动使用 `db.table.tenant` 限定避免歧义
- **Hint 驱动**：通过 SQL 注释传递租户信息，与业务代码解耦

## 安装

```bash
pnpm add @cs/sql-parser
```

## 快速开始

```typescript
import { SqlRewriter } from '@cs/sql-parser';

const rewriter = new SqlRewriter({
  dialect: 'mysql',
  listeners: {
    hint:   { enabled: true, priority: 10,  abortOnError: false, preserveHint: false },
    tenant: {
      enabled: true, priority: 100, abortOnError: false,
      tenantField: 'tenant',
      targetDatabases: { prefixes: ['tnt_'], fullNames: [], defaultDatabase: 'tnt_ma' },
    },
    databaseRewrite: {
      enabled: true, priority: 50, abortOnError: false,
      dbPrefix: 'dev_mc_',
    },
  },
  errorHandling: { throwOnError: false, collectAll: true, maxErrors: 10, logErrors: false },
});

const { sql } = rewriter.rewrite("/*& tenant:'sxlq' */ SELECT * FROM tnt_ma.users");
// => SELECT * FROM dev_mc_tnt_ma.users WHERE users.tenant = 'sxlq'
```

## Hint 格式

租户信息通过 SQL 注释传入：

```sql
/*& tenant:'租户编码' */ SELECT ...
```

- 必须位于 SQL 最前面
- 租户编码仅允许字母、数字、下划线、连字符

## 处理流程

```
SQL 输入
  │
  ├─ HintListener (优先级 10)      提取租户 Hint，可选保留或移除
  ├─ DatabaseRewriteListener (50)  FROM / JOIN / 列引用 中的库名添加前缀
  └─ TenantFilterListener (100)    注入 WHERE tenant = 'xxx' 条件
  │
SQL 输出 (TokenStreamRewriter，保留原始格式)
```

三个 Listener 通过 `sharedState` 传递数据：
- HintListener → `TENANT_INFO`（租户编码）
- DatabaseRewriteListener → `DB_REWRITE_PREFIX`（前缀，供租户 Listener 处理同名表冲突）

## 配置说明

完整配置结构如下，所有字段均可按需覆盖：

```typescript
interface SqlParserConfig {
  dialect: 'mysql' | 'tidb';   // 默认 'mysql'
  listeners: ListenerConfig;
  errorHandling: ErrorHandlingConfig;
}
```

---

### 通用 Listener 字段

每个 Listener 都继承以下基础字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | `boolean` | 是否启用，默认 `true` |
| `priority` | `number` | 执行优先级，数字越小越先执行 |
| `abortOnError` | `boolean` | 遇到错误是否中断整个处理链，默认 `false` |

---

### Hint 提取（`listeners.hint`）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `boolean` | `true` | 是否启用 |
| `priority` | `number` | `10` | 执行优先级（最先运行） |
| `abortOnError` | `boolean` | `false` | 错误时是否中断 |
| `preserveHint` | `boolean` | `false` | `true` 保留原始 Hint 注释，`false` 从 SQL 中移除 |

---

### 租户过滤（`listeners.tenant`）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `boolean` | `true` | 是否启用 |
| `priority` | `number` | `100` | 执行优先级（最后运行） |
| `abortOnError` | `boolean` | `false` | 错误时是否中断 |
| `tenantField` | `string` | `'tenant'` | 注入的租户字段名 |
| `targetDatabases.prefixes` | `string[]` | `['tnt_']` | 库名前缀匹配列表，符合前缀的库才注入条件 |
| `targetDatabases.fullNames` | `string[]` | `[]` | 完整库名匹配列表 |
| `targetDatabases.defaultDatabase` | `string` | `'main'` | SQL 中无显式库名时使用的默认库名 |

**匹配规则**：表名同时满足以下任一条件才会注入租户过滤：
- 库名匹配 `prefixes` 中任意前缀
- 库名在 `fullNames` 中
- 无库名的表且 `defaultDatabase` 匹配上述规则

---

### 库名改写（`listeners.databaseRewrite`）

> 可选，不配置则不启用。

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `boolean` | `true` | 是否启用 |
| `priority` | `number` | `50` | 执行优先级（在租户过滤之前） |
| `abortOnError` | `boolean` | `false` | 错误时是否中断 |
| `dbPrefix` | `string` | — | **必填**。要添加的库名前缀，如 `'dev_mc_'` |
| `targetDatabases` | `string[]` | `undefined` | 仅改写这些库名；未设置或为空时改写所有库 |
| `excludeDatabases` | `string[]` | `undefined` | 排除列表，这些库不改写（优先级高于 `targetDatabases`） |

改写范围覆盖：FROM/JOIN 表名、SELECT 列引用、ON 子句、WHERE/HAVING/ORDER BY 中的 `db.table.column` 格式引用。已带前缀的库名不会重复添加。

---

### 错误处理（`errorHandling`）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `throwOnError` | `boolean` | `false` | SQL 解析失败时是否抛出异常；`false` 时将错误写入 `RewriteResult.error` |
| `collectAll` | `boolean` | `true` | 遇到第一个错误后是否继续收集后续错误 |
| `maxErrors` | `number` | `100` | 最多收集的错误数量 |
| `logErrors` | `boolean` | `true` | 是否将错误打印到控制台 |

## 改写示例

### 租户条件注入

```sql
-- SELECT：WHERE 末尾追加
/*& tenant:'sxlq' */ SELECT * FROM tnt_ma.users WHERE status = 1
→ SELECT * FROM tnt_ma.users WHERE status = 1 AND users.tenant = 'sxlq'

-- INSERT：插入 tenant 列和值
/*& tenant:'sxlq' */ INSERT INTO tnt_ma.users (name) VALUES ('张三')
→ INSERT INTO tnt_ma.users (tenant, name) VALUES ('sxlq', '张三')

-- UPDATE / DELETE：WHERE 末尾追加
/*& tenant:'sxlq' */ UPDATE tnt_ma.users SET name = '李四' WHERE id = 1
→ UPDATE tnt_ma.users SET name = '李四' WHERE id = 1 AND users.tenant = 'sxlq'
```

### 库名改写（含列引用）

```sql
-- FROM、列引用、ON 子句全部同步改写
SELECT tnt_ma.users.name FROM tnt_ma.users JOIN tnt_mb.orders ON tnt_ma.users.id = tnt_mb.orders.user_id
→ SELECT dev_mc_tnt_ma.users.name FROM dev_mc_tnt_ma.users JOIN dev_mc_tnt_mb.orders ON dev_mc_tnt_ma.users.id = dev_mc_tnt_mb.orders.user_id
```

### 同名表跨库 JOIN（无别名）

```sql
-- 两张 users 分别来自 tnt_ma 和 tnt_mb，租户条件自动用完整限定避免歧义
/*& tenant:'sxlq' */ SELECT tnt_ma.users.name FROM tnt_ma.users JOIN tnt_mb.users ON tnt_ma.users.id = tnt_mb.users.ref_id
→ ... AND dev_mc_tnt_ma.users.tenant = 'sxlq' AND dev_mc_tnt_mb.users.tenant = 'sxlq'
```

## API

```typescript
// 实例 API
const rewriter = new SqlRewriter(config?)
rewriter.rewrite(sql: string): RewriteResult
rewriter.updateConfig(config: Partial<SqlParserConfig>): void

// 结果类型
interface RewriteResult {
  sql: string            // 改写后的 SQL
  modified: boolean      // 是否发生了修改
  hint?: HintInfo        // 提取到的 Hint 信息
  error?: Error
}
```

