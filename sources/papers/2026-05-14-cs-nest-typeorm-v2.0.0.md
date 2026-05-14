---
title: "@cs/nest-typeorm · 源码整理 v2.0.0"
type: source
aliases: ["@cs/nest-typeorm 源码", "nest-typeorm 源码"]
tags: [nestjs, mwp, code-docs, typeorm]
status: stable
version: "2.0.0"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-typeorm.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-typeorm · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：2.0.0
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-typeorm代码库源码整理

#### 代码目录
```
@cs/nest-typeorm/
├── src/
├── base.entity/
│   ├── base.entity.ts
│   ├── hasEnable.entity.ts
│   ├── hasPrimary.entity.ts
│   ├── index.ts
│   └── tree.entity.ts
├── decorators/
│   ├── index.ts
│   ├── inject-repository.decorator.ts
│   └── repository-module.decorator.ts
├── driver/
│   └── mysql-driver-interceptor.ts
├── sql-processor/
│   ├── index.ts
│   ├── sql-filter.ts
│   ├── sql-processor.interface.ts
│   └── sql-processor.service.ts
├── base.repository.ts
├── database.constants.ts
├── database.module.ts
├── database.types.ts
├── database.utils.ts
├── dataSource.manager.ts
├── entity.registry.ts
├── index.ts
└── repository.factory.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-typeorm",
  "version": "2.0.0",
  "description": "NestJS 应用程序提供了 TypeORM 的增强封装，提供改进的数据库连接管理、简化的仓库操作和标准化的实体类",
  "author": "danielmlc <danielmlc@126.com>",
  "homepage": "",
  "license": "ISC",
  "main": "lib/index.js",
  "directories": {
    "lib": "lib"
  },
  "files": [
    "lib"
  ],
  "scripts": {
    "prebuild": "rimraf lib",
    "build": "tsc -p ./tsconfig.json",
    "watch": "tsc -p ./tsconfig.json --watch",
    "publish": "pnpm publish --no-git-checks",
    "pre-publish:beta": "pnpm version prerelease --preid=beta",
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "mysql2": "^3.12.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "typeorm": "0.3.20"
  },
  "peerDependencies": {
    "@cs/nest-cloud": "workspace:^",
    "@cs/nest-common": "workspace:^",
    "@cs/sql-parser": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    },
    "@cs/nest-cloud": {
      "optional": false
    }
  }
}
```


> 代码路径  `src\base.repository.ts`

```typescript
import {
  Repository,
  ObjectLiteral,
  FindOptionsWhere,
  DeepPartial,
  FindOneOptions,
  SaveOptions,
  UpdateResult,
  DeleteResult,
} from 'typeorm';
import { Injectable } from '@nestjs/common';
import {
  QueryConditionInput,
  PageResult,
  ContextService,
} from '@cs/nest-common';
import { RpcClient } from '@cs/nest-cloud';

interface IEntityWithContext {
  creatorId?: string;
  creatorName?: string;
  modifierId?: string;
  modifierName?: string;
  id?: string;
  version?: number;
}

export abstract class BaseRepository<
  T extends ObjectLiteral,
> extends Repository<T> {
  // 声明为保护属性，但不在构造函数中初始化
  protected contextService: ContextService;
  protected rpcClient: RpcClient;
  // 设置上下文服务的方法
  setContextService(contextService: ContextService): void {
    this.contextService = contextService;
  }

  setRpcClient(rpcClient: RpcClient): void {
    this.rpcClient = rpcClient;
  }
  /**
   * 根据条件对象查询符合条件的一个对象
   * @param dto 条件的dto对象
   * @returns 查询到的对象
   */
  async findOne(dto: Partial<T>): Promise<T> {
    const options: FindOneOptions<T> = {
      where: dto as FindOptionsWhere<T>,
    };
    return super.findOne(options);
  }

  /**
   * 根据条件对象查询符合条件的多个对象
   * @param dto 条件的dto对象
   * @returns 查询到的对象数组
   */
  async findMany(dto: Partial<T>, take?: number, skip?: number): Promise<T[]> {
    return super.find({
      where: dto as FindOptionsWhere<T>,
      take,
      skip,
    });
  }

  /**
   * 根据条件对象查询符合条件的多个对象
   * @param queryConditionInput 查询的条件对象
   * @returns 查询的结果集
   */
  async findManyBase<R>(
    queryConditionInput: QueryConditionInput,
  ): Promise<R[] | PageResult<R[]>> {
    // 创建基本查询构建器
    const queryBuilder = queryConditionInput.tableName
      ? this.createQueryBuilder(queryConditionInput.tableName)
      : this.createQueryBuilder();

    // 添加选择的字段
    if (queryConditionInput.select) {
      queryBuilder.select(queryConditionInput.select);
    }

    // 添加条件
    if (queryConditionInput.conditionLambda) {
      queryBuilder.where(
        queryConditionInput.conditionLambda,
        queryConditionInput.conditionValue || {},
      );
    }

    // 添加排序
    if (queryConditionInput.orderBy) {
      queryBuilder.orderBy(queryConditionInput.orderBy);
    }

    // 添加限制数量
    if (queryConditionInput.take !== undefined) {
      queryBuilder.take(queryConditionInput.take);
    }

    // 判断是否需要分页
    if (queryConditionInput.skip !== undefined) {
      // 分页查询
      queryBuilder.skip(queryConditionInput.skip);

      // 使用countQuery缓存计数查询，避免重复执行相同条件的查询
      const [result, count] = await queryBuilder.getManyAndCount();

      return {
        result: result as any,
        count,
      } as PageResult<R[]>;
    } else {
      // 非分页查询
      const result = await queryBuilder.getMany();
      return result as any;
    }
  }

  // 补充上下文信息
  suppleAddContext(entity: Partial<T>, id: string): Partial<T> {
    const contextEntity = entity as Partial<T> & Partial<IEntityWithContext>;
    contextEntity.creatorId = this.contextService.getContext('userId');
    contextEntity.modifierId = this.contextService.getContext('userId');
    contextEntity.modifierName = this.contextService.getContext('realName');
    contextEntity.creatorName = this.contextService.getContext('realName');
    contextEntity.version = Date.now();
    contextEntity.id = id;
    return contextEntity;
  }
  suppleEditContext(entity: Partial<T>): Partial<T> {
    const contextEntity = entity as Partial<T> & Partial<IEntityWithContext>;
    contextEntity.modifierId = this.contextService.getContext('userId');
    contextEntity.modifierName = this.contextService.getContext('realName');
    contextEntity.version = Date.now();
    return contextEntity;
  }

  private isNewEntity(entity: any): boolean {
    return !entity.id;
  }

  /**
   * 添加或修改单条对象，根据主键判断是新增还是修改
   * @param entity 要添加或修改的对象
   * @returns 处理结果影响条目数
   */
  async saveOne(entity: DeepPartial<T>): Promise<T & DeepPartial<T>> {
    const entityDto = this.create(entity);
    const isNewEntity = this.isNewEntity(entityDto);
    const entityWithContext = isNewEntity
      ? this.suppleAddContext(entityDto, await this.rpcClient.getNewId())
      : this.suppleEditContext(entityDto);
    return this.save(entityWithContext as DeepPartial<T>, {
      transaction: false,
    });
  }

  /**
   * 添加或修改多条对象，根据主键判断是新增还是修改
   * @param entities 要添加或修改的对象数组
   * @returns 处理结果影响条目数
   */
  async saveMany(
    entities: DeepPartial<T>[],
    options?: SaveOptions,
  ): Promise<(T & DeepPartial<T>)[]> {
    if (!entities.length) {
      return [];
    }

    // 预处理，分离新实体和现有实体
    const newEntities: DeepPartial<T>[] = [];
    const existingEntities: DeepPartial<T>[] = [];

    entities.forEach((entity) => {
      const entityDto = this.create(entity);
      if (this.isNewEntity(entityDto)) {
        newEntities.push(entityDto);
      } else {
        existingEntities.push(
          this.suppleEditContext(entityDto) as DeepPartial<T>,
        );
      }
    });

    // 一次性获取所有新ID，复用 suppleAddContext 保证字段一致
    let processedNewEntities: DeepPartial<T>[] = [];
    if (newEntities.length > 0) {
      const ids = await this.rpcClient.getNewId(newEntities.length);
      processedNewEntities = newEntities.map((entity, index) => {
        return this.suppleAddContext(entity as Partial<T>, ids[index]) as DeepPartial<T>;
      });
    }

    // 合并处理后的实体
    const allProcessedEntities = [...processedNewEntities, ...existingEntities];

    // 一次性保存所有实体
    return this.save(allProcessedEntities, options);
  }

  /**
   * 根据传递条件对数据修改
   * @param updateData 修改的数据对象
   * @param conditions 查找条件的数据对象
   * @returns 处理结果影响条目数
   */
  async updateByCondition(
    updateData: Partial<T>,
    conditions: Partial<T>,
  ): Promise<UpdateResult> {
    // 版本号由@BeforeUpdate和@BeforeInsert钩子自动管理
    const result = await this.update(
      conditions as FindOptionsWhere<T>,
      this.suppleEditContext(updateData) as any,
    );
    return result;
  }

  /**
   * 根据条件对象软删一个或者多个对象（设置isRemoved=true）
   * @param conditions 条件对象
   * @returns 处理结果影响条目数
   */
  async softDeletion(conditions: Partial<T>): Promise<UpdateResult> {
    const deleteData = this.suppleEditContext({ isRemoved: true } as unknown as Partial<T>);
    return this.update(
      conditions as FindOptionsWhere<T>,
      deleteData as any,
    );
  }

  /**
   * 根据条件对象真删一个或者多个对象
   * @param conditions 条件对象
   * @returns 处理结果影响条目数
   */
  async hardDelete(conditions: Partial<T>): Promise<DeleteResult> {
    const result = await this.delete(conditions as FindOptionsWhere<T>);
    return result;
  }

  /**
   * 执行自由SQL语句
   * @param sql 执行的SQL语句
   * @param parameters SQL语句中的参数
   * @returns 处理结果影响条目数或查询结果
   */
  async executeSql(
    querySql: string,
    parameters?: Record<string, any>,
  ): Promise<any> {
    try {
      // 基础SQL验证
      if (!querySql || typeof querySql !== 'string') {
        throw new Error('SQL查询语句不能为空且必须是字符串类型');
      }

      const trimmedSql = querySql.trim();
      if (!trimmedSql) {
        throw new Error('SQL查询语句不能为空');
      }

      // 限制SQL长度，防止过长的查询
      const MAX_SQL_LENGTH = 100000; // 100KB
      if (trimmedSql.length > MAX_SQL_LENGTH) {
        throw new Error(`SQL查询语句过长，最大允许长度为${MAX_SQL_LENGTH}字符`);
      }

      // 参数处理
      let processedSql = querySql;
      const paramValues: any[] = [];

      if (parameters && Object.keys(parameters).length > 0) {
        // 单次正则遍历：同时替换占位符并收集参数值
        processedSql = querySql.replace(/\:(\w+)/g, (_, name) => {
          if (name in parameters) {
            paramValues.push(parameters[name]);
            return '?';
          }
          throw new Error(`缺少SQL参数: ${name}`);
        });
      }

      // 执行查询
      const records = await this.query(processedSql, paramValues);
      // 将结果转换为小驼峰格式
      const camelCaseRecords = this.transformObjectKeys(records);
      return camelCaseRecords;
    } catch (error) {
      // 优化错误处理，避免敏感信息泄露
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      throw new Error(`SQL执行失败: ${errorMessage}`);
    }
  }

  /**
   * 将下划线命名转换为小驼峰命名
   * @param str 要转换的字符串
   * @returns 转换后的字符串
   */
  private toCamelCase(str: string): string {
    return str.replace(/(_\w)/g, (match) => match[1].toUpperCase());
  }

  /**
   * 将对象的属性名称从下划线命名转换为小驼峰命名
   * @param obj 要转换的对象
   * @returns 转换后的对象
   */
  private transformObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformObjectKeys(item));
    }

    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const camelKey = this.toCamelCase(key);
        result[camelKey] = this.transformObjectKeys(obj[key]);
      }
    }
    return result;
  }
}

@Injectable()
export class CustomRepository<
  T extends ObjectLiteral,
> extends BaseRepository<T> {}

```


> 代码路径  `src\database.constants.ts`

```typescript
export const DATABASE_MODULE_OPTIONS = 'DATABASE_MODULE_OPTIONS';
export const DATABASE_CONNECTIONS = 'DATABASE_CONNECTIONS';
export const DEFAULT_CONNECTION_NAME = 'default';
export const DATA_SOURCE_MANAGER = 'DATA_SOURCE_MANAGER';

```


> 代码路径  `src\database.module.ts`

```typescript
import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DataSource, ReplicationMode } from 'typeorm';
import { LoggerService, ContextService } from '@cs/nest-common';
import {
  DatabaseModuleOptions,
  DatabaseModuleAsyncOptions,
} from './database.types';
import {
  DATABASE_MODULE_OPTIONS,
  DATABASE_CONNECTIONS,
  DATA_SOURCE_MANAGER,
  DEFAULT_CONNECTION_NAME,
} from './database.constants';
import { DataSourceManagerImpl } from './dataSource.manager';
import { getRegisteredEntities } from './entity.registry';
import { defer, lastValueFrom } from 'rxjs';
import { handleRetry } from './database.utils';
import { SqlProcessorService } from './sql-processor';
import { MysqlDriverInterceptor } from './driver/mysql-driver-interceptor';

@Module({})
export class DatabaseModule {
  /**
   * 同步方式配置数据库连接
   * @param options 数据库连接配置
   */
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    const connectionProvider = this.createConnectionProvider(options);
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_MODULE_OPTIONS,
          useValue: options,
        },
        connectionProvider,
        {
          provide: DATA_SOURCE_MANAGER,
          useFactory: (connections: Map<string, DataSource>) => {
            return new DataSourceManagerImpl(connections);
          },
          inject: [DATABASE_CONNECTIONS],
        },
      ],
      exports: [
        DATABASE_MODULE_OPTIONS,
        DATABASE_CONNECTIONS,
        DATA_SOURCE_MANAGER,
      ],
      global: true,
    };
  }

  /**
   * 异步方式配置数据库连接
   * @param options 异步配置选项
   */
  static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: options.imports || [],
      providers: [
        {
          provide: DATABASE_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: DATABASE_CONNECTIONS,
          useFactory: async (
            dbOptions: DatabaseModuleOptions,
            contextService?: ContextService,
            loggerService?: LoggerService,
          ) => {
            const configWithEntities = this.mergeConfigWithEntities(dbOptions);
            return await this.createConnections(
              configWithEntities,
              contextService,
              loggerService,
            );
          },
          inject: [
            DATABASE_MODULE_OPTIONS,
            { token: ContextService, optional: true },
            { token: LoggerService, optional: true },
          ],
        },
        {
          provide: DATA_SOURCE_MANAGER,
          useFactory: (connections: Map<string, DataSource>) => {
            return new DataSourceManagerImpl(connections);
          },
          inject: [DATABASE_CONNECTIONS],
        },
      ],
      exports: [
        DATABASE_MODULE_OPTIONS,
        DATABASE_CONNECTIONS,
        DATA_SOURCE_MANAGER,
      ],
      global: true,
    };
  }

  private static mergeConfigWithEntities(
    options: DatabaseModuleOptions,
  ): DatabaseModuleOptions {
    const result: DatabaseModuleOptions = {};
    for (const key in options) {
      result[key] = Object.assign({}, options[key], {
        name: options[key].name || DEFAULT_CONNECTION_NAME,
        entities: getRegisteredEntities(options[key].name),
      });
    }
    return result;
  }

  private static createConnectionProvider(
    options: DatabaseModuleOptions,
  ): Provider {
    return {
      provide: DATABASE_CONNECTIONS,
      useFactory: async (
        contextService?: ContextService,
        loggerService?: LoggerService,
      ) => {
        const configWithEntities = this.mergeConfigWithEntities(options);
        return await this.createConnections(
          configWithEntities,
          contextService,
          loggerService,
        );
      },
      inject: [
        { token: ContextService, optional: true },
        { token: LoggerService, optional: true },
      ],
    };
  }

  /**
   * @param options 数据库连接配置
   * @param contextService 上下文服务实例
   * @param loggerService 日志服务实例
   */
  private static async createConnections(
    options: DatabaseModuleOptions,
    contextService?: ContextService,
    loggerService?: LoggerService,
  ): Promise<Map<string, DataSource>> {
    const connections = new Map<string, DataSource>();
    const logger = loggerService || new LoggerService();

    for (const key in options) {
      const connectionOptions = options[key];
      const name = connectionOptions.name || DEFAULT_CONNECTION_NAME;

      if (connections.has(name)) {
        throw new Error(
          `Database ${connectionOptions.database}  initialization error: The connection name "${name}" must be unique`,
        );
      }

      // 从配置中获取重试参数和hint配置，或者使用默认值
      const { retryAttempts, retryDelay, sqlProcessor, ...restOptions } =
        connectionOptions;

      await lastValueFrom(
        defer(async () => {
          const dataSource = new DataSource(restOptions);
          await dataSource.initialize();

          // 如果启用了hint功能，在DataSource初始化后安装MySQL驱动拦截器
          if (
            restOptions.type === 'mysql' &&
            (sqlProcessor?.injection?.enabled !== false || sqlProcessor?.databaseRewrite?.enabled)
          ) {
            const hintService = new SqlProcessorService(sqlProcessor);

            // 安装统一的 MySQL Driver 层拦截器
            MysqlDriverInterceptor.install(
              dataSource,
              hintService,
              contextService,
              logger,
            );

          }

          logger.log(
            `Database ${connectionOptions.database} connection "${name}" initialized successfully!`,
            'DatabaseModule',
          );
          connections.set(name, dataSource);
        }).pipe(
          // 将创建好的 Observable 传递给 handleRetry 操作符
          handleRetry(retryAttempts, retryDelay, name),
        ),
      ).catch((error) => {
        // 如果最终还是失败了（达到最大重试次数），则记录致命错误并抛出
        logger.error(
          `Database ${connectionOptions.database} connection "${name}" failed to initialize! ${error}`,
          'DatabaseModule',
        );
        throw error;
      });
    }

    return connections;
  }
}

```


> 代码路径  `src\database.types.ts`

```typescript
import { DataSource } from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { ModuleMetadata } from '@nestjs/common';
import { SqlProcessorConfig } from './sql-processor';
export interface EntityClassOrSchema {
  new (...args: any[]): any;
}

export interface DatabaseModuleOption extends MysqlConnectionOptions {
  name?: string;
  /**
   * Number of times to retry connecting.
   * @default 10
   */
  retryAttempts?: number;
  /**
   * Delay between connection retry attempts (ms).
   * @default 3000
   */
  retryDelay?: number;
  /**
   * SQL 处理器配置（注释注入、SQL 改写、库名改写、SQL 过滤）
   */
  sqlProcessor?: SqlProcessorConfig;
}

export type DatabaseModuleOptions = Record<string, DatabaseModuleOption>;

export interface EntityRegistration {
  connectionName: string;
  entities: EntityClassOrSchema[];
}

// 用于异步配置
export interface DatabaseModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (
    ...args: any[]
  ) => Promise<DatabaseModuleOptions> | DatabaseModuleOptions;
  inject?: any[];
}

export interface DatabaseOptionsFactory {
  createDatabaseOptions():
    | Promise<DatabaseModuleOptions>
    | DatabaseModuleOptions;
}

/**
 * 数据源管理器接口
 */
export interface DataSourceManager {
  /**
   * 获取指定名称的数据源
   * @param name 数据源名称
   */
  getDataSource(name?: string): DataSource;

  /**
   * 获取所有数据源
   */
  getAllDataSources(): Map<string, DataSource>;
}

```


> 代码路径  `src\database.utils.ts`

```typescript
import { LoggerService } from '@cs/nest-common';
import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import { DEFAULT_CONNECTION_NAME } from './database.constants';

const logger = new LoggerService();

export function handleRetry(
  retryAttempts = 10,
  retryDelay = 5000,
  connectionName = DEFAULT_CONNECTION_NAME,
): <T>(source: Observable<T>) => Observable<T> {
  return <T>(source: Observable<T>) =>
    source.pipe(
      retry({
        count: retryAttempts,
        delay: (error: Error, retryCount: number) => {
          const connectionInfo =
            connectionName === DEFAULT_CONNECTION_NAME
              ? 'default connection'
              : `connection "${connectionName}"`;
          logger.error(
            `Unable to connect to the database (${connectionInfo}). Message: ${error.message}. Retrying (${retryCount})...`,
            error.stack,
            'DatabaseModule',
          );
          return timer(retryDelay);
        },
      }),
    );
}

```


> 代码路径  `src\dataSource.manager.ts`

```typescript
import { Injectable, Type } from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import { ContextService } from '@cs/nest-common';
import { RpcClient } from '@cs/nest-cloud';
import { DEFAULT_CONNECTION_NAME } from './database.constants';
import { RepositoryFactory } from './repository.factory';
import { DataSourceManager } from './database.types';
import { BaseRepository } from './base.repository';
/**
 * 数据源管理器实现类
 * 负责管理所有数据库连接
 */
@Injectable()
export class DataSourceManagerImpl implements DataSourceManager {
  /**
   * 存储所有数据源的映射表
   */
  private readonly dataSources: Map<string, DataSource> = new Map();

  /**
   * 构造函数
   * @param initialDataSources 初始数据源映射
   */
  constructor(initialDataSources?: Map<string, DataSource>) {
    if (initialDataSources) {
      this.dataSources = new Map(initialDataSources);
    }
  }

  /**
   * 获取指定名称的数据源
   * @param name 数据源名称，默认为 'default'
   * @throws 如果数据源不存在则抛出错误
   */
  getDataSource(name: string = DEFAULT_CONNECTION_NAME): DataSource {
    if (!this.dataSources.has(name)) {
      throw new Error(`数据源 "${name}" 不存在`);
    }
    return this.dataSources.get(name);
  }

  /**
   * 获取所有数据源
   */
  getAllDataSources(): Map<string, DataSource> {
    return this.dataSources;
  }

  /**
   * 注册数据源
   * @param name 数据源名称
   * @param dataSource 数据源实例
   * @throws 如果数据源名称已存在则抛出错误
   */
  registerDataSource(name: string, dataSource: DataSource): void {
    if (this.dataSources.has(name)) {
      throw new Error(`数据源名称 "${name}" 已存在`);
    }
    this.dataSources.set(name, dataSource);
  }

  /**
   * 为指定实体和数据源创建自定义仓储
   * @param entity 实体类
   * @param customRepositoryClass 自定义仓储类
   * @param connectionName 连接名称
   */
  getCustomRepository<T, R extends BaseRepository<T>>(
    entity: EntityTarget<T>,
    customRepositoryClass: Type<R>,
    connectionName: string = DEFAULT_CONNECTION_NAME,
    contextService?: ContextService, // 添加新参数
    rpcClient?: RpcClient,
  ): R {
    const dataSource = this.getDataSource(connectionName);
    return RepositoryFactory.create(
      dataSource,
      entity,
      customRepositoryClass,
      contextService,
      rpcClient,
    );
  }
}

```


> 代码路径  `src\entity.registry.ts`

```typescript
import { EntityClassOrSchema } from './database.types';
import { DEFAULT_CONNECTION_NAME } from './database.constants';

export interface EntityRegistryOptions {
  entity: EntityClassOrSchema;
  connectionName?: string;
}

class EntityRegistry {
  private static entities: Map<string, Set<EntityClassOrSchema>> = new Map();

  static register(options: EntityRegistryOptions): void {
    if (!options.connectionName)
      options.connectionName = DEFAULT_CONNECTION_NAME;
    if (!this.entities.has(options.connectionName)) {
      this.entities.set(options.connectionName, new Set());
    }
    this.entities.get(options.connectionName).add(options.entity);
  }

  static getEntities(
    connectionName = DEFAULT_CONNECTION_NAME,
  ): EntityClassOrSchema[] {
    const entitySet = this.entities.get(connectionName);
    return entitySet ? Array.from(entitySet) : [];
  }

  static getAllEntityMappings(): Map<string, EntityClassOrSchema[]> {
    const result = new Map<string, EntityClassOrSchema[]>();
    this.entities.forEach((entitySet, connectionName) => {
      result.set(connectionName, Array.from(entitySet));
    });
    return result;
  }
}

/**
 * 注册实体到指定连接
 * @param connectionName 连接名称，默认为 'default'
 * @param entity 实体类
 */
export const registerEntity = EntityRegistry.register.bind(EntityRegistry);

/**
 * 获取指定连接的所有注册实体
 * @param connectionName 连接名称，默认为 'default'
 */
export const getRegisteredEntities =
  EntityRegistry.getEntities.bind(EntityRegistry);

/**
 * 获取所有连接的实体映射
 */
export const getAllEntityMappings =
  EntityRegistry.getAllEntityMappings.bind(EntityRegistry);

```


> 代码路径  `src\index.ts`

```typescript
export * from './database.module';
export * from './database.types';
export * from './database.constants';
export * from './entity.registry';
export * from './base.entity';
export * from './base.repository';
export * from './dataSource.manager';
export * from './decorators';
export * from './sql-processor';
export { SqlFilter, SqlFilterConfig } from './sql-processor/sql-filter';
export * from './driver/mysql-driver-interceptor';

```


> 代码路径  `src\repository.factory.ts`

```typescript
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Type } from '@nestjs/common';
import { ContextService } from '@cs/nest-common';
import { RpcClient } from '@cs/nest-cloud';
/**
 * 仓储工厂，用于创建自定义仓储实例
 */
export class RepositoryFactory {
  /**
   * 注入 contextService 和 rpcClient 到仓储实例
   */
  private static injectDependencies<R extends BaseRepository<any>>(
    repository: R,
    contextService?: ContextService,
    rpcClient?: RpcClient,
  ): void {
    if (contextService && typeof repository.setContextService === 'function') {
      repository.setContextService(contextService);
    }
    if (rpcClient && typeof repository.setRpcClient === 'function') {
      repository.setRpcClient(rpcClient);
    }
  }

  /**
   * 为指定实体创建自定义仓储（Proxy 代理方式，无全局副作用）
   */
  static create<T extends ObjectLiteral, R extends BaseRepository<T>>(
    dataSource: DataSource,
    entity: EntityTarget<T>,
    customRepositoryClass: Type<R>,
    contextService?: ContextService,
    rpcClient?: RpcClient,
  ): R {
    const baseRepository = dataSource.getRepository(entity);
    const customRepository = new customRepositoryClass();

    // 将 TypeORM Repository 内部属性从 baseRepository 复制到 customRepository，
    // 使 super.X() 调用能访问到有效的 manager 和 target
    (customRepository as any).manager = (baseRepository as any).manager;
    (customRepository as any).target = (baseRepository as any).target;

    this.injectDependencies(customRepository, contextService, rpcClient);

    return new Proxy(customRepository, {
      get(target, prop) {
        if (prop in target) {
          const value = (target as any)[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        }
        const baseValue = (baseRepository as any)[prop];
        if (baseValue !== undefined) {
          return typeof baseValue === 'function'
            ? baseValue.bind(baseRepository)
            : baseValue;
        }
        return undefined;
      },
      set(target, prop, value) {
        (target as any)[prop] = value;
        return true;
      },
      has(target, prop) {
        return prop in target || prop in baseRepository;
      },
      ownKeys(target) {
        return [
          ...new Set([...Object.keys(target), ...Object.keys(baseRepository)]),
        ];
      },
      getOwnPropertyDescriptor(target, prop) {
        return (
          Object.getOwnPropertyDescriptor(target, prop) ??
          Object.getOwnPropertyDescriptor(baseRepository, prop)
        );
      },
    }) as R;
  }
}

```


> 代码路径  `src\base.entity\base.entity.ts`

```typescript
import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @CreateDateColumn({
    name: 'created_at',
    comment: '创建时间',
    type: 'datetime',
    nullable: true,
  })
  createdAt: Date;
  @Column({
    name: 'creator_id',
    comment: '创建用户主键',
    type: 'bigint',
    nullable: true,
  })
  creatorId: string;
  @Column({
    name: 'creator_name',
    comment: '添加人',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  creatorName: string;
  @UpdateDateColumn({
    name: 'modifier_at',
    comment: '上次修改时间',
    type: 'datetime',
    nullable: true,
  })
  modifierAt: Date;
  @Column({
    name: 'modifier_id',
    comment: '修改用户主键',
    type: 'bigint',
    nullable: true,
  })
  modifierId: string;
  @Column({
    name: 'modifier_name',
    comment: '修改人',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  modifierName: string;
  @Column({
    name: 'is_removed',
    comment: '删除标识',
    type: 'tinyint',
    default: false,
    nullable: true,
  })
  isRemoved: boolean;
  @Column({
    name: 'version',
    comment: '版本号',
    type: 'bigint',
    nullable: true,
  })
  version: number;
}

```


> 代码路径  `src\base.entity\hasEnable.entity.ts`

```typescript
import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TreeEntity } from './tree.entity';
export abstract class HasEnableEntity extends BaseEntity {
  @Column({
    name: 'sort_code',
    comment: '排序',
    type: 'int',
    nullable: true,
  })
  sortCode: number;
  @Column({
    name: 'is_enable',
    comment: '启用',
    type: 'tinyint',
    nullable: true,
    default: true,
  })
  isEnable: boolean;
}

export abstract class HasEnableTreeEntity extends TreeEntity {
  @Column({
    name: 'sort_code',
    comment: '排序',
    type: 'int',
    nullable: true,
  })
  sortCode: number;
  @Column({
    name: 'is_enable',
    comment: '启用',
    type: 'tinyint',
    nullable: true,
    default: true,
  })
  isEnable: boolean;
}

```


> 代码路径  `src\base.entity\hasPrimary.entity.ts`

```typescript
import { PrimaryColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TreeEntity } from './tree.entity';
import { HasEnableEntity, HasEnableTreeEntity } from './hasEnable.entity';
// 单独主键
export abstract class HasOnlyPrimaryEntity {
  @PrimaryColumn({
    name: 'id',
    comment: '主键',
    type: 'bigint',
  })
  id: string;
}

export abstract class HasPrimaryEntity extends BaseEntity {
  @PrimaryColumn({
    name: 'id',
    comment: '主键',
    type: 'bigint',
  })
  id: string;
}

export abstract class HasPrimaryTreeEntity extends TreeEntity {
  @PrimaryColumn({
    name: 'id',
    comment: '主键',
    type: 'bigint',
  })
  id: string;
}

export abstract class HasPrimaryFullEntity extends HasEnableEntity {
  @PrimaryColumn({
    name: 'id',
    comment: '主键',
    type: 'bigint',
  })
  id: string;
}

export abstract class HasPrimaryFullTreeEntity extends HasEnableTreeEntity {
  @PrimaryColumn({
    name: 'id',
    comment: '主键',
    type: 'bigint',
  })
  id: string;
}

```


> 代码路径  `src\base.entity\index.ts`

```typescript
export * from './base.entity';
export * from './tree.entity';
export * from './hasEnable.entity';
export * from './hasPrimary.entity';

```


> 代码路径  `src\base.entity\tree.entity.ts`

```typescript
import { Column } from 'typeorm';
import { BaseEntity } from './base.entity';
export abstract class TreeEntity extends BaseEntity {
  @Column({
    name: 'parent_id',
    comment: '父节点主键',
    type: 'bigint',
    nullable: true,
  })
  parentId: string;
  @Column({
    name: 'full_id',
    comment: '主键全路径',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  fullId: string;
  @Column({
    name: 'full_name',
    comment: '名称全路径',
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  fullName: string;
  @Column({
    name: 'level',
    comment: '层级',
    type: 'int',
    nullable: true,
  })
  level: number;
  @Column({
    name: 'is_leaf',
    comment: '子节点标识',
    type: 'tinyint',
    nullable: true,
  })
  isLeaf: boolean;
}

```


> 代码路径  `src\decorators\index.ts`

```typescript
export * from './inject-repository.decorator';
export * from './repository-module.decorator';

```


> 代码路径  `src\decorators\inject-repository.decorator.ts`

```typescript
import { Inject, Type } from '@nestjs/common';
import { EntityTarget } from 'typeorm';
import { ContextService } from '@cs/nest-common';
import { RpcClient } from '@cs/nest-cloud';
import { BaseRepository, CustomRepository } from '../base.repository';
import { DEFAULT_CONNECTION_NAME } from '../database.constants';
import { DataSourceManagerImpl } from '../dataSource.manager';

/**
 * 仓库注入工厂标识符前缀
 */
export const REPOSITORY_FACTORY_TOKEN_PREFIX = 'REPOSITORY_FACTORY_';

/**
 * 生成特定实体和仓库类型的注入标识符
 * @param entity 实体类
 * @param repositoryClass 仓库类
 */
export function getRepositoryToken(
  entity: any,
  repositoryClass: Type<any>,
): string {
  // 获取实体的构造函数名称
  const entityName =
    entity.name || (entity.constructor ? entity.constructor.name : 'Unknown');
  return `${REPOSITORY_FACTORY_TOKEN_PREFIX}${entityName}_${repositoryClass.name}`;
}

/**
 * 创建仓库提供者的参数接口
 */
export interface CreateRepositoryProviderOptions<
  T,
  R extends BaseRepository<T>,
> {
  /** 实体类 */
  entity: EntityTarget<T>;
  /** 仓库类型，可选，默认为 CustomRepository */
  repository?: Type<R>;
  /** 数据库连接名称，默认为 'default' */
  connectionName?: string;
}

/**
 * 创建一个自定义仓库提供者
 */
export function createRepositoryProvider<T, R extends BaseRepository<T>>(
  options: CreateRepositoryProviderOptions<T, R>,
) {
  const entity = options.entity;
  const repositoryClass = options.repository;
  const connectionName = options.connectionName || DEFAULT_CONNECTION_NAME;
  // 如果未提供仓库类，则使用 CustomRepository 作为默认值
  const repoClass = repositoryClass || (CustomRepository as unknown as Type<R>);
  const token = getRepositoryToken(entity, repoClass);
  return {
    provide: token,
    useFactory: (
      dataSourceManager: DataSourceManagerImpl,
      rpcClient?: RpcClient,
      contextService?: ContextService,
    ) => {
      return dataSourceManager.getCustomRepository(
        entity,
        repoClass,
        connectionName,
        contextService,
        rpcClient,
      );
    },
    inject: [
      DataSourceManagerImpl,
      { token: RpcClient, optional: true },
      { token: ContextService, optional: true },
    ],
  };
}

/**
 * 注入仓库的参数接口
 */
export interface InjectRepositoryOptions<T, R extends BaseRepository<T>> {
  /** 实体类 */
  entity: EntityTarget<T>;
  /** 仓库类型，可选，默认为 CustomRepository */
  repository?: Type<R>;
  /** 数据库连接名称，默认为 'default' */
  connectionName?: string;
}

/**
 * 注入自定义仓库的装饰器
 */
export function InjectRepository<T, R extends BaseRepository<T>>(
  options: InjectRepositoryOptions<T, R>,
): ParameterDecorator {
  const entity: EntityTarget<T> = options.entity;
  const connectionName = options.connectionName || DEFAULT_CONNECTION_NAME;
  const repoClass = options.repository || (CustomRepository as unknown as Type<R>);
  const token = getRepositoryToken(entity, repoClass);
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    Reflect.defineMetadata(
      'repository_info',
      { entity, repositoryClass: repoClass, connectionName },
      target.constructor,
      `param:${parameterIndex}`,
    );
    return Inject(token)(target, propertyKey, parameterIndex);
  };
}

```


> 代码路径  `src\decorators\repository-module.decorator.ts`

```typescript
import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
// import { ContextModule } from '@cs/nest-common';
// import { RpcModule } from '@cs/nest-cloud';
import { DATABASE_CONNECTIONS } from '../database.constants';
import { DataSourceManagerImpl } from '../dataSource.manager';
import { BaseRepository, CustomRepository } from '../base.repository';
import { EntityTarget } from 'typeorm';
import {
  createRepositoryProvider,
  getRepositoryToken,
} from './inject-repository.decorator';

/**
 * 仓库注册信息
 */
export interface RepositoryRegistration<T, R extends BaseRepository<T>> {
  entity: EntityTarget<T>;
  repository?: Type<R>;
  connectionName?: string;
}

/**
 * 创建动态模块，注册指定的仓库
 * @param repositories 仓库注册信息列表
 */
export function createRepositoryModule(
  repositories: RepositoryRegistration<any, BaseRepository<any>>[],
): DynamicModule {
  const providers: Provider[] = [
    {
      provide: DataSourceManagerImpl,
      useFactory: (connections) => {
        return new DataSourceManagerImpl(connections);
      },
      inject: [DATABASE_CONNECTIONS],
    },
    ...repositories.map((reg) =>
      createRepositoryProvider({
        entity: reg.entity,
        repository: reg.repository,
        connectionName: reg.connectionName,
      }),
    ),
  ];

  const providerTokens = repositories.map((reg) => {
    // 如果未提供仓库类，则使用 CustomRepository
    const repoClass =
      reg.repository || (CustomRepository as unknown as Type<any>);
    return getRepositoryToken(reg.entity, repoClass);
  });
  return {
    module: EntityRegistModule,
    providers,
    exports: [DataSourceManagerImpl, ...providerTokens],
  };
}

/**
 * 仓库动态模块
 * 用于动态注册仓库提供者
 */
@Module({
  // imports: [ContextModule, RpcModule],
})
export class EntityRegistModule {
  /**
   * 静态方法，用于注册一组仓库
   * @param repositories 仓库注册信息列表
   */
  static forRepos(
    repositories: RepositoryRegistration<any, BaseRepository<any>>[],
  ): DynamicModule {
    return createRepositoryModule(repositories);
  }
}

```


> 代码路径  `src\driver\mysql-driver-interceptor.ts`

```typescript
import { DataSource } from 'typeorm';
import { SqlProcessorService } from '../sql-processor/sql-processor.service';
import {
  SqlProcessorConfig,
  QueryOptions,
} from '../sql-processor/sql-processor.interface';
import { ContextService, LoggerService } from '@cs/nest-common';
import { SqlRewriter, SqlParserConfig } from '@cs/sql-parser';
import { SqlFilter } from '../sql-processor/sql-filter';

/**
 * TypeORM MySQL Driver 拦截器
 * 通过拦截mysql2的BaseConnection原型方法实现SQL注释注入和SQL改写
 */
interface ConnectionInfo {
  sqlProcessorService: SqlProcessorService;
  contextService?: ContextService;
  logger?: LoggerService;
  connectionKey: string;
  sqlRewriter?: SqlRewriter;
  sqlFilter?: SqlFilter;
  databaseInfo?: {
    host: string;
    port: number;
    database: string;
    username: string;
  };
}

export class MysqlDriverInterceptor {
  private static globalInterceptionInstalled = false;
  private static serviceRegistry = new Map<string, ConnectionInfo>();

  /**
   * 安装MySQL驱动拦截器，实现SQL注释注入和SQL改写功能
   * @param dataSource TypeORM数据源实例
   * @param sqlProcessorService SQL处理服务实例
   * @param contextService 上下文服务实例（可选）
   * @param logger 日志服务实例（可选）
   */
  static install(
    dataSource: DataSource,
    sqlProcessorService: SqlProcessorService,
    contextService?: ContextService,
    logger?: LoggerService,
  ): void {
    const driver = (dataSource as any).driver;
    // 检查是否为 MySQL 驱动
    if (!driver || driver.constructor.name !== 'MysqlDriver') {
      return;
    }

    // 生成连接标识并注册服务
    const connectionKey = this.generateConnectionKey(dataSource);

    // 提取数据库信息
    const databaseInfo = this.extractDatabaseInfo(dataSource);

    // 初始化SQL解析器（同时处理租户注入和库名改写）
    let sqlRewriter: SqlRewriter | undefined;
    const processorConfig = sqlProcessorService.getConfig();
    if (
      processorConfig?.sqlRewrite?.enabled ||
      processorConfig?.databaseRewrite?.enabled
    ) {
      sqlRewriter = this.createSqlRewriter(processorConfig, databaseInfo);
    }

    // 初始化SQL过滤器
    const sqlFilter = new SqlFilter(processorConfig?.sqlFilter);

    this.serviceRegistry.set(connectionKey, {
      sqlProcessorService,
      contextService,
      logger,
      connectionKey,
      sqlRewriter,
      sqlFilter,
      databaseInfo,
    });

    // 全局拦截器只安装一次
    if (!this.globalInterceptionInstalled) {
      this.installGlobalInterceptor(driver);
      this.globalInterceptionInstalled = true;
    }

    // 为这个DataSource的连接池添加名称标记
    this.markConnectionsWithName(
      dataSource,
      connectionKey.split(':')[0],
      logger,
    );
  }

  /**
   * 生成连接的唯一标识
   */
  private static generateConnectionKey(dataSource: DataSource): string {
    const options = dataSource.options as any;
    const connectionName = options.name || 'default';
    return `${connectionName}:${options.host}:${options.port}:${options.database}:${options.username}`;
  }

  /**
   * 提取数据库连接信息
   */
  private static extractDatabaseInfo(dataSource: DataSource): {
    host: string;
    port: number;
    database: string;
    username: string;
  } {
    const options = dataSource.options as any;
    return {
      host: options.host || 'localhost',
      port: options.port || 3306,
      database: options.database || '',
      username: options.username || '',
    };
  }

  /**
   * 创建SQL解析器实例
   */
  private static createSqlRewriter(
    processorConfig: SqlProcessorConfig,
    databaseInfo: { database: string },
  ): SqlRewriter {
    const { sqlRewrite, databaseRewrite } = processorConfig;
    const config: Partial<SqlParserConfig> = {
      listeners: {
        tenant: {
          enabled: sqlRewrite?.enabled ?? true,
          priority: 100,
          abortOnError: false,
          tenantField: sqlRewrite?.tenantField ?? 'tenant',
          targetDatabases: {
            prefixes: sqlRewrite?.targetDatabases?.prefixes ?? [],
            fullNames: sqlRewrite?.targetDatabases?.fullNames ?? [],
            defaultDatabase:
              databaseInfo.database ||
              sqlRewrite?.targetDatabases?.defaultDatabase ||
              'main',
          },
        },
        hint: {
          enabled: true,
          priority: 10,
          abortOnError: false,
          preserveHint: true,
        },
        ...(databaseRewrite?.enabled
          ? {
              databaseRewrite: {
                enabled: true,
                priority: 50,
                abortOnError: false,
                dbPrefix: databaseRewrite.dbPrefix ?? '',
                targetDatabases: databaseRewrite.targetDatabases,
                excludeDatabases: databaseRewrite.excludeDatabases,
              },
            }
          : {}),
      },
      errorHandling: {
        throwOnError: sqlRewrite?.throwOnError ?? false,
        collectAll: true,
        maxErrors: 100,
        logErrors: true,
      },
    };
    return new SqlRewriter(config);
  }

  /**
   * 从连接实例获取连接标识
   */
  private static getConnectionKey(connection: any): string {
    if (connection.config) {
      // 尝试从不同地方获取连接名称
      let connectionName = 'default';

      // 方法1: 检查config中是否有name
      if (connection.config.name) {
        connectionName = connection.config.name;
      }
      // 方法2: 检查connection上是否有标记
      else if (connection._cs_connection_name) {
        connectionName = connection._cs_connection_name;
      }

      return `${connectionName}:${connection.config.host}:${connection.config.port}:${connection.config.database}:${connection.config.user}`;
    }
    return '';
  }

  /**
   * 根据连接实例查找对应的连接信息
   */
  private static findConnectionInfo(connection: any): ConnectionInfo | null {
    const connectionKey = this.getConnectionKey(connection);
    return this.serviceRegistry.get(connectionKey) ?? null;
  }

  /**
   * 通用SQL处理逻辑，避免query和execute方法中的重复代码
   * @param sql SQL语句
   * @param connection 数据库连接
   * @param methodType 方法类型，用于区分日志标签
   * @returns 处理后的SQL
   */
  private static processSQL(
    sql: any,
    connection: any,
    methodType: 'query' | 'execute',
  ): any {
    // 只处理字符串SQL的情况
    if (typeof sql !== 'string') {
      return sql;
    }

    const connInfo = MysqlDriverInterceptor.findConnectionInfo(connection);
    const ctx = 'MysqlDriverInterceptor';
    const tag = methodType === 'execute' ? 'Execute' : 'Query';
    try {
      if (connInfo?.logger) {
        connInfo.logger.verbose(
          `[0] ProcessSQL Start ${tag} =======================================================《`,
          ctx,
        );
      }

      // 步骤1: 注释注入（不受SQL过滤影响）
      if (connInfo?.sqlProcessorService?.isEnabled()) {
        connInfo.logger?.verbose(
          `[1] Comment Injection Branch ${tag}: Starting comment injection (base processing)`,
          ctx,
        );

        const queryOptions: QueryOptions = {};

        // 获取租户上下文信息
        if (connInfo.contextService) {
          const tenantCode = connInfo.contextService.getContext('tenantCode');
          if (tenantCode) {
            queryOptions.tenantCode = tenantCode as string;
            connInfo.logger?.verbose(
              `[1.1] Tenant Context ${tag}: Tenant context found: ${tenantCode}`,
              ctx,
            );
          } else {
            connInfo.logger?.verbose(
              `[1.1] Tenant Context ${tag}: Tenant context not found!`,
              ctx,
            );
          }
        }

        // 注入hint到SQL
        sql = connInfo.sqlProcessorService.prepareSql(sql, queryOptions);
        connInfo.logger?.verbose(
          `[1.2] Comment Injection Complete ${tag}: ${sql}`,
          ctx,
        );
      } else {
        connInfo?.logger?.verbose(
          `[1] Comment Injection Skip ${tag}: SqlProcessorService disabled, skipping comment injection`,
          ctx,
        );
      }

      // 步骤2: SQL改写分支 - 租户条件注入 + 库名改写（受SQL过滤控制）
      if (connInfo?.sqlRewriter) {
        connInfo.logger?.verbose(
          `[2] SQL Rewrite Branch ${tag}: Starting SQL rewrite branch (tenant condition + database rewrite)`,
          ctx,
        );

        // 检查SQL是否应该跳过SQL改写
        if (connInfo.sqlFilter?.shouldSkip(sql)) {
          connInfo.logger?.verbose(
            `[2.1] SQL Filter Skip ${tag}: Skipping SQL rewrite due to SQL filter: ${sql.substring(0, 100)}...`,
            ctx,
          );
        } else {
          try {
            const rewriteResult = connInfo.sqlRewriter.rewrite(sql);
            if (methodType === 'query') {
              connInfo.logger?.verbose(
                `[2.2] SQL Rewrite Result Query: ${JSON.stringify(rewriteResult)}`,
                ctx,
              );
            }
            if (rewriteResult.modified) {
              sql = rewriteResult.sql;
              connInfo.logger?.verbose(
                `[2.2] SQL Rewrite Success ${tag}: SQL rewritten with ${rewriteResult.hint?.tenant ? `tenant: ${rewriteResult.hint.tenant}` : 'no tenant'}`,
                ctx,
              );
            } else {
              connInfo.logger?.verbose(
                `[2.2] SQL Rewrite Skip ${tag}: No SQL modification needed`,
                ctx,
              );
            }
          } catch (rewriteError) {
            // SQL改写失败时记录错误但不影响正常查询
            connInfo.logger?.error(
              `[2.2] SQL Rewrite Error ${tag}: SQL rewrite failed: ${rewriteError instanceof Error ? rewriteError.message : rewriteError}`,
              ctx,
            );
          }
        }
      } else {
        connInfo?.logger?.verbose(
          `[2] SQL Rewrite Branch Skip ${tag}: SqlRewriter not configured, skipping SQL rewrite branch`,
          ctx,
        );
      }

      // 记录流程完成
      if (connInfo?.logger) {
        connInfo.logger.verbose(
          `[4] ProcessSQL Complete ${tag} =======================================================》`,
          ctx,
        );
      }
    } catch (error) {
      // 静默处理错误，不影响正常查询
      connInfo?.logger?.error(
        `MySQL2 BaseConnection ${methodType} processing failed: ${error instanceof Error ? error.message : error}`,
        ctx,
      );
    }

    return sql;
  }

  /**
   * 安装全局拦截器
   */
  private static installGlobalInterceptor(driver: any): void {
    // 直接拦截mysql2模块的BaseConnection原型方法
    const mysql = driver.mysql;

    // 确保我们有mysql2的connection class
    if (mysql && mysql.Connection) {
      const BaseConnection = Object.getPrototypeOf(
        mysql.Connection.prototype,
      ).constructor;

      // 拦截BaseConnection的query方法
      if (
        BaseConnection &&
        BaseConnection.prototype.query &&
        !BaseConnection.prototype._cs_query_intercepted
      ) {
        BaseConnection.prototype._cs_query_intercepted = true;

        const originalQuery = BaseConnection.prototype.query;
        BaseConnection.prototype.query = function (
          sql: any,
          values?: any,
          cb?: any,
        ) {
          sql = MysqlDriverInterceptor.processSQL(sql, this, 'query');
          return originalQuery.call(this, sql, values, cb);
        };
      }

      // 拦截BaseConnection的execute方法
      if (
        BaseConnection &&
        BaseConnection.prototype.execute &&
        !BaseConnection.prototype._cs_execute_intercepted
      ) {
        BaseConnection.prototype._cs_execute_intercepted = true;

        const originalExecute = BaseConnection.prototype.execute;
        BaseConnection.prototype.execute = function (
          sql: any,
          values?: any,
          cb?: any,
        ) {
          sql = MysqlDriverInterceptor.processSQL(sql, this, 'execute');
          return originalExecute.call(this, sql, values, cb);
        };
      }
    }
  }

  /**
   * 为DataSource的连接添加名称标记
   */
  private static markConnectionsWithName(
    dataSource: DataSource,
    connectionName: string,
    logger?: LoggerService,
  ): void {
    try {
      const driver = (dataSource as any).driver;
      if (driver && driver.pool) {
        // 拦截连接池的连接创建过程
        const pool = driver.pool;

        // 保存原始的获取连接方法
        if (pool.getConnection && !pool._cs_marked) {
          pool._cs_marked = true;
          const originalGetConnection = pool.getConnection.bind(pool);

          pool.getConnection = function (callback: any) {
            return originalGetConnection((err: any, connection: any) => {
              if (!err && connection) {
                // 为连接添加名称标记
                connection._cs_connection_name = connectionName;
              }
              if (callback) callback(err, connection);
            });
          };
        }
      }
    } catch (error) {
      logger?.error(
        `Failed to mark connections with name: ${error instanceof Error ? error.message : error}`,
        'MysqlDriverInterceptor',
      );
    }
  }
}

```


> 代码路径  `src\sql-processor\index.ts`

```typescript
export * from './sql-processor.interface';
export * from './sql-processor.service';

```


> 代码路径  `src\sql-processor\sql-filter.ts`

```typescript
/**
 * SQL过滤器 - 用于判断哪些SQL语句应该跳过hint注入和改写处理
 */
export interface SqlFilterConfig {
  /** 是否启用SQL过滤功能，默认为true */
  enabled?: boolean;
  /** 自定义跳过规则 - 正则表达式数组或字符串数组 */
  customSkipPatterns?: (RegExp | string)[];
  /** 自定义不跳过规则 - 正则表达式数组或字符串数组，优先级最高 */
  customNotSkipPatterns?: (RegExp | string)[];
  /** 自定义跳过函数 */
  customSkipFunction?: (sql: string) => boolean;
  /** 是否跳过DDL语句，默认为true */
  skipDDL?: boolean;
  /** 是否跳过事务控制语句，默认为true */
  skipTransaction?: boolean;
  /** 是否跳过系统查询语句，默认为true */
  skipSystemQueries?: boolean;
  /** 是否跳过SET语句，默认为true */
  skipSetStatements?: boolean;
}

// 内部配置接口，所有数组都转换为RegExp
interface InternalSqlFilterConfig {
  enabled: boolean;
  customSkipPatterns: RegExp[];
  customNotSkipPatterns: RegExp[];
  customSkipFunction: (sql: string) => boolean;
  skipDDL: boolean;
  skipTransaction: boolean;
  skipSystemQueries: boolean;
  skipSetStatements: boolean;
}

export class SqlFilter {
  private readonly config: InternalSqlFilterConfig;

  // 预定义的跳过规则
  private readonly DDL_PATTERNS = [
    /^\s*(CREATE|ALTER|DROP|TRUNCATE)\s+/i,
    /^\s*RENAME\s+/i,
  ];

  private readonly TRANSACTION_PATTERNS = [
    /^\s*(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK)\s*;?\s*$/i,
    /^\s*SAVEPOINT\s+/i,
    /^\s*RELEASE\s+SAVEPOINT\s+/i,
    /^\s*ROLLBACK\s+TO\s+SAVEPOINT\s+/i,
  ];

  private readonly SYSTEM_QUERY_PATTERNS = [
    /^\s*SELECT\s+(VERSION\(\)|@@version|@@version_comment|DATABASE\(\)|USER\(\)|CONNECTION_ID\(\))/i,
    /^\s*SHOW\s+/i,
    /^\s*DESCRIBE\s+/i,
    /^\s*DESC\s+/i,
    /^\s*EXPLAIN\s+/i,
    /^\s*USE\s+/i,
    /^\s*FLUSH\s+/i,
    /^\s*RESET\s+/i,
    /^\s*KILL\s+/i,
    /^\s*HANDLER\s+/i,
    /^\s*CHECKSUM\s+/i,
    /^\s*ANALYZE\s+/i,
    /^\s*OPTIMIZE\s+/i,
    /^\s*REPAIR\s+/i,
    /^\s*CHECK\s+/i,
    /^\s*DEALLOCATE\s+PREPARE\s+/i,
    /^\s*PREPARE\s+/i,
    /^\s*EXECUTE\s+/i,
  ];

  private readonly SET_STATEMENT_PATTERNS = [/^\s*SET\s+/i];

  /**
   * 将字符串或正则表达式数组转换为正则表达式数组
   * @param patterns 字符串或正则表达式数组
   * @returns 正则表达式数组
   */
  private convertToRegExpArray (patterns: (RegExp | string)[] = []): RegExp[] {
    return patterns.map((pattern) => {
      if (typeof pattern === 'string') {
        return new RegExp(pattern, 'i');
      }
      return pattern;
    });
  }

  constructor(config: SqlFilterConfig = {}) {
    this.config = {
      enabled: config.enabled !== undefined ? config.enabled : true,
      customSkipPatterns: this.convertToRegExpArray(config.customSkipPatterns),
      customNotSkipPatterns: this.convertToRegExpArray(
        config.customNotSkipPatterns,
      ),
      customSkipFunction: config.customSkipFunction || (() => false),
      skipDDL: config.skipDDL !== undefined ? config.skipDDL : true,
      skipTransaction:
        config.skipTransaction !== undefined ? config.skipTransaction : true,
      skipSystemQueries:
        config.skipSystemQueries !== undefined
          ? config.skipSystemQueries
          : true,
      skipSetStatements:
        config.skipSetStatements !== undefined
          ? config.skipSetStatements
          : true,
    };
  }

  /**
   * 判断SQL是否应该跳过hint注入和改写处理
   * @param sql SQL语句
   * @returns true表示应该跳过，false表示需要处理
   */
  shouldSkip (sql: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 清理SQL语句 - 移除前后空白和注释
    const cleanSql = this.cleanSql(sql);

    // 空SQL直接跳过
    if (!cleanSql) {
      return true;
    }

    // 0. 最高优先级：检查自定义不跳过模式
    // 如果匹配不跳过模式，无论其他规则如何都不跳过
    if (
      this.config.customNotSkipPatterns.some((pattern) =>
        pattern.test(cleanSql),
      )
    ) {
      return false;
    }

    // 1. 检查自定义跳过函数
    if (this.config.customSkipFunction(cleanSql)) {
      return true;
    }

    // 2. 检查自定义跳过模式
    if (
      this.config.customSkipPatterns.some((pattern) => pattern.test(cleanSql))
    ) {
      return true;
    }

    // 3. 检查DDL语句
    if (
      this.config.skipDDL &&
      this.DDL_PATTERNS.some((pattern) => pattern.test(cleanSql))
    ) {
      return true;
    }

    // 4. 检查事务控制语句
    if (
      this.config.skipTransaction &&
      this.TRANSACTION_PATTERNS.some((pattern) => pattern.test(cleanSql))
    ) {
      return true;
    }

    // 5. 检查系统查询语句
    if (
      this.config.skipSystemQueries &&
      this.SYSTEM_QUERY_PATTERNS.some((pattern) => pattern.test(cleanSql))
    ) {
      return true;
    }

    // 6. 检查SET语句
    if (
      this.config.skipSetStatements &&
      this.SET_STATEMENT_PATTERNS.some((pattern) => pattern.test(cleanSql))
    ) {
      return true;
    }

    return false;
  }

  /**
   * 清理SQL语句，移除前导注释和空白
   * @param sql 原始SQL
   * @returns 清理后的SQL
   */
  private cleanSql (sql: string): string {
    return (
      sql
        .trim()
        // 移除行首的单行注释
        .replace(/^\s*--.*$/gm, '')
        // 移除行首的多行注释
        .replace(/^\s*\/\*[\s\S]*?\*\//gm, '')
        .trim()
    );
  }

  /**
   * 获取当前配置
   */
  getConfig (): InternalSqlFilterConfig {
    return { ...this.config };
  }

  /**
   * 添加自定义跳过模式
   * @param pattern 正则表达式
   */
  addCustomSkipPattern (pattern: RegExp): void {
    this.config.customSkipPatterns.push(pattern);
  }

  /**
   * 设置自定义跳过函数
   * @param func 跳过判断函数
   */
  setCustomSkipFunction (func: (sql: string) => boolean): void {
    this.config.customSkipFunction = func;
  }
}

```


> 代码路径  `src\sql-processor\sql-processor.interface.ts`

```typescript
import { SqlFilterConfig } from './sql-filter';

export { SqlFilterConfig };

export enum InjectionMode {
  isTenant = 'isTenant',
  isGlobal = 'isGlobal',
}

export interface SqlProcessorConfig {
  /**
   * SQL注释注入配置（向SQL中注入 from/tenant 等标记注释）
   */
  injection?: {
    /** 是否启用注释注入，默认为true */
    enabled?: boolean;
    /** 注入模式：isTenant（注入租户标记）/ isGlobal（注入全局标记）*/
    mode?: InjectionMode;
    /** 自定义注释生成函数 */
    customHintGenerator?: () => string[];
  };
  /**
   * 数据库名改写配置（在SQL过滤之前执行）
   * 使用 @cs/sql-parser 的 DatabaseRewriteConfig
   */
  databaseRewrite?: {
    /** 是否启用数据库名改写，默认为false */
    enabled: boolean;
    /** 数据库名前缀，如 'dev_mc_' */
    dbPrefix: string;
    /** 需要改写的库名列表，如果为空则改写所有库名 */
    targetDatabases?: string[];
    /** 排除的库名列表，这些库不会被改写 */
    excludeDatabases?: string[];
    // preserveOriginalName?: boolean; // 待 sql-parser 实现后启用
    // wrapperStatements?: {           // 待 sql-parser 实现后启用
    //   enabled: boolean;
    //   supportedTypes: string[];
    //   validateInnerSql?: boolean;
    // };
  };
  /**
   * SQL过滤配置
   */
  sqlFilter?: SqlFilterConfig;
  /**
   * SQL改写配置（租户条件添加）
   */
  sqlRewrite?: {
    /** 是否启用SQL改写功能 */
    enabled: boolean;
    /** 租户字段名，默认为 'tenant' */
    tenantField?: string;
    /** 解析失败时是否抛出异常，默认为 false */
    throwOnError?: boolean;
    /** 目标库配置，用于指定需要添加租户条件的库 */
    targetDatabases?: {
      /** 库名前缀列表，如 ['tnt_'] */
      prefixes: string[];
      /** 完整库名列表，如 ['global_mb'] */
      fullNames: string[];
      /** 默认库名，用于处理无库名的表 */
      defaultDatabase: string;
    };
    // wrapperStatements?: {  // 待 sql-parser 实现后启用
    //   enabled: boolean;
    //   supportedTypes: string[];
    //   validateInnerSql?: boolean;
    // };
  };
}

export interface QueryOptions {
  /**
   * 租户代码
   */
  tenantCode?: string;
}

export interface ServiceInfo {
  /**
   * 服务地址
   */
  address: string;
  /**
   * 服务名称
   */
  serviceName: string;
  /**
   * 服务路径
   */
  servicePath: string;
  /**
   * 集群名称
   */
  cluster: string;
  // 端口
  port: string;
}

```


> 代码路径  `src\sql-processor\sql-processor.service.ts`

```typescript
import { Injectable, Optional } from '@nestjs/common';
import * as os from 'os';
import { merge } from 'lodash';
import { SqlProcessorConfig, ServiceInfo, QueryOptions, InjectionMode } from './sql-processor.interface';
import { CommonUtil } from '@cs/nest-common';

@Injectable()
export class SqlProcessorService {
  private readonly serviceInfo: ServiceInfo;
  private readonly injectionSegments: string[] = [];
  private readonly config: SqlProcessorConfig;

  constructor(@Optional() config?: SqlProcessorConfig) {
    const defaultConfig: SqlProcessorConfig = {
      injection: {
        enabled: true,
        mode: InjectionMode.isTenant,
      },
      sqlRewrite: {
        enabled: true,
        targetDatabases: {
          prefixes: [
            'tnt_',
            'tnt_mc_',
            'dev_tnt_',
            'dev_mc_tnt_',
            'test_tnt_',
            'test_mc_tnt_',
            'pre_tnt_',
            'pre_mc_tnt_',
          ],
          fullNames: [],
          defaultDatabase: 'main',
        },
        // wrapperStatements: { // 待 sql-parser 实现后启用
        //   enabled: false,
        //   supportedTypes: ['EXPLAIN'],
        //   validateInnerSql: true,
        // },
      },
      databaseRewrite: {
        enabled: false,
        dbPrefix: '',
        targetDatabases: [],
        excludeDatabases: [],
        // preserveOriginalName: true, // 待 sql-parser 实现后启用
        // wrapperStatements: {        // 待 sql-parser 实现后启用
        //   enabled: false,
        //   supportedTypes: ['EXPLAIN'],
        //   validateInnerSql: true,
        // },
      },
      sqlFilter: {
        enabled: true,
        skipDDL: true,           // 跳过 CREATE/ALTER/DROP/TRUNCATE/RENAME
        skipTransaction: true,   // 跳过 BEGIN/COMMIT/ROLLBACK/SAVEPOINT
        skipSystemQueries: true, // 跳过 SHOW/DESC/EXPLAIN/USE/FLUSH 等系统语句
        skipSetStatements: true, // 跳过 SET 语句
      },
    };
    this.config = merge({}, defaultConfig, config);

    this.serviceInfo = {
      address: process.env.CS_HOST || CommonUtil.getIPAdress(),
      serviceName: process.env.CS_NAME || os.hostname(),
      servicePath: process.env.CS_SERVER_PATH || '',
      port: process.env.CS_PORT,
      cluster: '',
    };

    this.initializeInjectionSegments();
  }

  /**
   * 初始化注释注入片段
   */
  private initializeInjectionSegments (): void {
    if (!this.config.injection?.enabled) {
      return;
    }

    this.injectionSegments.length = 0;

    // 添加基础服务信息注释
    const serviceIdentifier = this.serviceInfo.servicePath
      ? `${this.serviceInfo.serviceName}.${this.serviceInfo.servicePath}`
      : this.serviceInfo.serviceName;
    this.injectionSegments.push(
      `/* from:'${serviceIdentifier}', addr:'${this.serviceInfo.address}:${this.serviceInfo.port}' */`,
    );

    // 执行自定义注释生成器
    if (this.config.injection?.customHintGenerator) {
      const customSegments = this.config.injection!.customHintGenerator!();
      this.injectionSegments.push(...customSegments);
    }
  }

  /**
   * 获取当前服务身份信息
   */
  getServiceInfo (): ServiceInfo {
    return { ...this.serviceInfo };
  }

  /**
   * 生成包含注入注释的SQL
   */
  prepareSql (sql: string, options?: QueryOptions): string {
    if (!this.config.injection?.enabled) {
      return sql;
    }

    const segments = [...this.injectionSegments];

    // 根据模式添加对应的注释
    if (this.config.injection?.mode === InjectionMode.isTenant) {
      if (options?.tenantCode) {
        segments.push(`/*& tenant:'${options.tenantCode}' */`);
      }
    } else if (this.config.injection?.mode === InjectionMode.isGlobal) {
      segments.push(`/*& global:true */`);
    }

    segments.push(sql);
    return segments.join('\n');
  }

  /**
   * 检查是否启用注释注入功能
   */
  isEnabled (): boolean {
    return this.config.injection?.enabled === true;
  }

  /**
   * 获取当前配置
   */
  getConfig (): SqlProcessorConfig {
    return { ...this.config };
  }
}

```


#### 代码说明



## 简介
这个库为 NestJS 应用程序提供了 TypeORM 的增强封装，提供改进的数据库连接管理、简化的仓库操作和标准化的实体类。它旨在简化数据库操作，同时提供处理常见数据访问模式的一致方法。

## 特性
+ **多数据库连接管理**：通过统一接口支持管理多个数据库连接
+ **增强的仓库模式**：扩展的仓库类，包含常用的 CRUD 操作
+ **标准化实体类**：提供基础实体类和树形实体类，包含常用字段和功能
+ **依赖注入支持**：简化仓库注入和管理的装饰器
+ **灵活的查询支持**：支持条件查询、分页查询和自定义 SQL 执行

## 安装
```bash
npm install @cs/nest-typeorm
```

## 基本配置
### 模块配置
在应用程序的根模块中导入 `DatabaseModule`：

```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cs/nest-typeorm';

@Module({
  imports: [
    DatabaseModule.forRoot({
      default: {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'password',
        database: 'my_database',
        synchronize: false,
      },
      // 可以配置多个数据库连接
      secondary: {
        name: 'secondary',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'password',
        database: 'second_database',
        synchronize: false,
      }
    }),
  ],
})
export class AppModule {}
```

### 异步配置
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@cs/nest-typeorm';
import { ConfigModule, ConfigService } from '@cs/nest-config';

@Module({
  imports: [
    DatabaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return {
          ...config.get('mysql'),
        };
      },
    }),
  ],
})
export class AppModule {}
```

## 实体定义
### 基础实体类
库提供了多种基础实体类，可以根据需求选择继承：

```typescript
import { Entity, Column } from 'typeorm';
import { HasPrimaryEntity } from '@cs/nest-typeorm';

@Entity('users')
export class User extends HasPrimaryEntity {
  @Column({ length: 100 })
  username: string;
  
  @Column({ length: 100 })
  email: string;
}
```

### 可用的基础实体类
1. `BaseEntity`: 包含基本的审计字段（创建时间、修改时间等）
2. `HasEnableEntity`: 继承 `BaseEntity` 并添加启用/禁用和排序功能
3. `HasPrimaryEntity`: 继承 `BaseEntity` 并添加主键字段
4. `HasPrimaryFullEntity`: 继承 `HasEnableEntity` 并添加主键字段
5. `TreeEntity`: 提供树形结构支持的实体基类
6. `HasPrimaryTreeEntity`: 树形结构带主键
7. `HasEnableTreeEntity`: 树形结构带启用/禁用功能
8. `HasPrimaryFullTreeEntity`: 完整功能的树形实体

#### BaseEntity（基础审计实体）
包含基本审计字段：

+ `createdAt`: 创建时间
+ `creatorId`: 创建用户ID
+ `creatorName`: 创建用户名称
+ `modifierAt`: 最后修改时间
+ `modifierId`: 修改用户ID
+ `modifierName`: 修改用户名称
+ `isRemoved`: 删除标识
+ `version`: 版本号

#### HasEnableEntity（支持启用/禁用的实体）
继承自 `BaseEntity`，额外包含：

+ `sortCode`: 排序码
+ `isEnable`: 是否启用

#### HasPrimaryEntity（带主键的基础实体）
继承自 `BaseEntity`，额外包含：

+ `id`: 主键

#### HasPrimaryFullEntity（完整功能实体）
继承自 `HasEnableEntity`，额外包含：

+ `id`: 主键

#### TreeEntity（树形结构实体）
继承自 `BaseEntity`，支持树形结构：

+ `parentId`: 父节点ID
+ `fullId`: ID全路径
+ `fullName`: 名称全路径
+ `level`: 层级
+ `isLeaf`: 是否叶子节点

#### HasEnableTreeEntity（支持启用/禁用的树形实体）
继承自 `TreeEntity`，额外包含：

+ `sortCode`: 排序码
+ `isEnable`: 是否启用

#### HasPrimaryTreeEntity（带主键的树形实体）
继承自 `TreeEntity`，额外包含：

+ `id`: 主键

#### HasPrimaryFullTreeEntity（完整功能树形实体）
继承自 `HasEnableTreeEntity`，额外包含：

+ `id`: 主键

#### BaseEntity 字段
`BaseEntity` 类提供以下字段：

| 字段名 | 数据库字段 | 类型 | 描述 |
| --- | --- | --- | --- |
| createdAt | created_at | datetime | 创建时间 |
| creatorId | creator_id | bigint | 创建用户ID |
| creatorName | creator_name | varchar(50) | 创建用户名称 |
| modifierAt | modifier_at | datetime | 修改时间 |
| modifierId | modifier_id | bigint | 修改用户ID |
| modifierName | modifier_name | varchar(50) | 修改用户名称 |
| isRemoved | is_removed | tinyint | 删除标识 |
| version | version | bigint | 版本号 |


`HasEnableEntity` 额外提供：

| 字段名 | 数据库字段 | 类型 | 描述 |
| --- | --- | --- | --- |
| sortCode | sort_code | int | 排序码 |
| isEnable | is_enable | tinyint | 启用状态 |


`TreeEntity` 额外提供：

| 字段名 | 数据库字段 | 类型 | 描述 |
| --- | --- | --- | --- |
| parentId | parent_id | bigint | 父节点ID |
| fullId | full_id | varchar(500) | ID全路径 |
| fullName | full_name | varchar(2000) | 名称全路径 |
| level | level | int | 层级 |
| isLeaf | is_leaf | tinyint | 是否叶节点 |


### 注册实体
使用 `registerEntity` 函数将实体注册到指定的数据库连接：

```typescript
import { registerEntity } from '@cs/nest-typeorm';
import { User } from './entities/user.entity';

// 注册到默认连接
registerEntity({ entity: User });

// 注册到指定连接
registerEntity({ entity: User, connectionName: 'secondary' });
```

## 仓库使用
[仓库的官方文档方法](https://typeorm.io/repository-api)

### 基础仓库
库提供了 `CustomRepository` 类，它扩展了 TypeORM 的  `BaseRepository`  类，提供了额外的功能：



```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository, CustomRepository } from '@cs/nest-typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository({
      entity: User,
      repository: CustomRepository
    })
    private readonly userRepository: CustomRepository<User>,
  ) {}

  async createUser(userData: Partial<User>): Promise<User> {
    return await this.userRepository.saveOne(userData);
  }

  async findUsers(query: Partial<User>): Promise<User[]> {
    return await this.userRepository.findMany(query);
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<void> {
    await this.userRepository.updateByCondition(
      updateData, 
      { id }
    );
  }

  async softDeleteUser(id: string): Promise<void> {
    await this.userRepository.softDeletion({ id });
  }
}
```



### 自定义仓库
有时候基础仓储类`CustomRepository`无法满足使用场景，我们可以基于`BaseRepository`,它是一个抽象类，可以基于此类进行扩展：



```typescript
// user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository, BaseRepository } from '@cs/nest-typeorm';
import { User } from './user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  
  async findActiveUsers(): Promise<User[]> {
    return this.findMany({ 
      isRemoved: false, 
      isEnable: true 
    });
  }

  async findUsersByEmail(email: string): Promise<User[]> {
    return this.executeSql(
      'SELECT * FROM users WHERE email = :email AND is_removed = 0',
      { email }
    );
  }

  async getUserStatistics(): Promise<any> {
    return this.executeSql(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_enable = 1 THEN 1 END) as active_users,
        COUNT(CASE WHEN is_removed = 1 THEN 1 END) as deleted_users
      FROM users
    `);
  }
}
```

### 仓库注入
使用 `InjectRepository` 装饰器在服务中注入仓库：

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@cs/nest-typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository({
      entity: User,
      repository: UserRepository,
    })
    private userRepo: UserRepository,
  ) {}
  
  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }
  
  async createUser(userData: Partial<User>): Promise<number> {
    return this.userRepo.saveOne(userData);
  }
}
```



### 多个仓库注入
在实际应用中，一个服务通常需要操作多个相关实体，因此需要注入多个仓库。以下是一个典型示例：

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository, CustomRepository, DATA_SOURCE_MANAGER, DataSourceManager } from '@cs/nest-typeorm';
import { ProductEntity } from './product.entity';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';
import { RoleEntity } from './role.entity';

@Injectable()
export class UserService {
  constructor(
  @Inject(DATA_SOURCE_MANAGER)
  private dataSourceManager: DataSourceManager,
  @InjectRepository({
    entity: UserEntity,
    repository: UserRepository,
  })
  private readonly userRepository: UserRepository,
  // 使用 undefined 作为第二个参数，使用默认仓库类
  @InjectRepository({
    entity: ProductEntity,
  })
  private readonly productRepository: CustomRepository<ProductEntity>,

  // 使用对象参数版本的装饰器
  @InjectRepository({
    entity: RoleEntity,
    connectionName: 'test1',
  })
  private readonly roleRepository: CustomRepository<RoleEntity>,
  ) {}

  async createUser(userData: Partial<UserEntity>): Promise<UserEntity> {
    // 检查用户名是否已存在
    const exists = await this.userRepository.isUsernameExists(
      userData.username,
    );
    if (exists) {
      throw new Error(`用户名 ${userData.username} 已存在`);
    }

    // 创建用户实体并保存
    const user = new UserEntity();
    Object.assign(user, userData);

    // 设置默认值
    user.id = Date.now().toString(); // 简单示例，实际应使用UUID或雪花ID
    user.isRemoved = false;

    // 插入产品
    const product = new ProductEntity();
    product.productname = '1232';
    product.productcode = 'aaaaww22a';
    product.id = Date.now().toString();

    // // 插入角色
    const role = new RoleEntity();
    role.rolename = 'tes11wwt';
    role.rolecode = 'aaa11wwaa';
    role.id = Date.now().toString();

    await this.userRepository.saveOne(user);
    await this.productRepository.saveOne(product);
    await this.roleRepository.saveOne(role);
    return user;
  }
  // 服务方法...
}
```

### 注册仓库模块
使用 `EntityRegistModule` 在模块中注册：

```typescript
import { Module } from '@nestjs/common';
import { EntityRegistModule } from '@cs/nest-typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [
    EntityRegistModule.forRepos([
      {
        entity: User,
        repository: UserRepository,
        'connectionName': 'secondary', 如果是单库可以省略
      },
    ]),
  ],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
```

### 数据源管理
使用 `DataSourceManager` 获取和管理数据源：

```typescript
import { Injectable } from '@nestjs/common';
import {
  InjectRepository,
  BaseRepository,
  DATA_SOURCE_MANAGER,
  DataSourceManager,
} from '@cs/nest-typeorm';

@Injectable()
export class AppService {
  constructor(
  @Inject(DATA_SOURCE_MANAGER)
  private dataSourceManager: DataSourceManager;
  ) {}
  async doSomething() {
    // 获取默认数据源
    const defaultDataSource = this.dataSourceManager.getDataSource();
    
    // 获取指定名称的数据源
    const secondaryDataSource = this.dataSourceManager.getDataSource('secondary');
    
  }
}
```

## 仓库方法
`BaseRepository` 提供了以下方法：

### 查询方法
```typescript
// 根据条件查询单个对象
const user = await userRepo.findOne({ username: 'admin' });

// 根据条件查询多个对象
const users = await userRepo.findMany({ isEnable: true }, 10, 0); // take, skip

// 高级查询条件
const result = await userRepo.findManyBase({
  tableName: 'user',
  select: ['id', 'username', 'email'],
  conditionLambda: 'username = :username AND isRemoved = :isRemoved',
  conditionValue: { username: 'admin', isRemoved: false },
  orderBy: { 'createdAt': 'DESC' },
  take: 10,
  skip: 0,
});
```

findManyBase参数详细说明如下：

> 该方法按照`QueryConditionInput`实体的条件属性对结果集进行查询；
>

+ 参数实体：

```javascript
export class QueryConditionInput {
  tableName?: string;  // 表别名 eg: "tableName":"user"
  select?: string[];  // 如果传入了tablename，在select属性中必须以前缀方式访问 eg: "select":["user.id","user.userName"]  注意：属性名访问必须转化为小驼峰风格；
  conditionLambda: string; //查询条件 eg："user.firstName = :firstName and userName like %:userName%" 注意：属性名访问必须转化为小驼峰风格；
  conditionValue: object;  //查询条件的参数变量  eg：{ firstName: "Timber", userName: "mlc" }
  orderBy?: OrderByCondition;  // 排序条件  eg:{"user_name":"asc","id":"asc"}  注意此处的属性为数据库字段格式，不是小驼峰格式。
  skip?: number; // 跳过的条目数  该属性存在时会返回分页格式的结果
  take?: number;  // 获取结果集的条目数  0为不限制
}
```

### 增删改方法
```typescript
// 添加或修改单个对象
const affected = await userRepo.saveOne({
  id: '1',
  username: 'admin',
  email: 'admin@example.com',
});

// 添加或修改多个对象
const affected = await userRepo.saveMany([
  { id: '1', username: 'user1' },
  { id: '2', username: 'user2' },
]);

// 根据条件更新
const affected = await userRepo.updateByCondition(
  { isEnable: false },
  { id: '1' }
);

// 软删除
const affected = await userRepo.softDeletion({ id: '1' });

// 硬删除
const affected = await userRepo.hardDelete({ id: '1' });
```

### 执行自定义 SQL
```typescript
// 执行自定义 SQL
const results = await userRepo.executeSql(
  'SELECT * FROM user WHERE username = :username AND is_removed = :isRemoved',
  { username: 'admin', isRemoved: false }
);
```

## 事务管理



[事务操作官网文档](https://typeorm.io/transactions)

当需要在多个仓库之间保证操作的原子性时，可以使用事务。官方提供了两种方式使用事务：



### 使用 DataSourceManager 手动管理事务
```typescript
import { Injectable, Inject } from '@nestjs/common';
import {
  InjectRepository,
  BaseRepository,
  DATA_SOURCE_MANAGER,
  DataSourceManager,
} from '@cs/nest-typeorm';
import { EntityManager } from 'typeorm';
import { ProductEntity } from './product.entity';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';
import { RoleEntity } from './role.entity';

@Injectable()
export class OrderService {
  constructor(
  @Inject(DATA_SOURCE_MANAGER)
  private dataSourceManager: DataSourceManager,
  @InjectRepository({
    entity: UserEntity,
    repository: UserRepository,
  })
  private readonly userRepository: UserRepository,
  @InjectRepository({
    entity: ProductEntity,
  })
  private readonly productRepository: BaseRepository<ProductEntity>,
  ) {}
  
  
  async createOrderWithItems(userId: string, orderData: any, items: any[]): Promise<boolean> {
    // 获取数据源
    const dataSource = this.dataSourceManager.getDataSource();
    
    // 创建查询运行器
    const queryRunner = dataSource.createQueryRunner();
    
    // 连接查询运行器
    await queryRunner.connect();
    
    // 检查用户名是否已存在
    const exists = await this.userRepository.isUsernameExists(
      userData.username,
    );
    if (exists) {
      throw new Error(`用户名 ${userData.username} 已存在`);
    }

    // 开始事务
    await queryRunner.startTransaction();
    
     // 创建用户实体并保存
    const user = new UserEntity();
    Object.assign(user, userData);

    // 设置默认值
    user.id = Date.now().toString(); // 简单示例，实际应使用UUID或雪花ID
    user.isRemoved = false;

    // 产品
    const product = new ProductEntity();
    product.productname = '1232';
    product.productcode = 'aaaaww22a';
    product.id = Date.now().toString();

    try {
      // 使用事务保存
      await queryRunner.manager.save(user);
      await queryRunner.manager.save(product);
      
      // 提交事务
      await queryRunner.commitTransaction();
      
      return true;
    } catch (error) {
      // 发生错误，回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 释放查询运行器
      await queryRunner.release();
    }
  }
}

```

### 使用 transaction方法回调方式
```typescript
import { Injectable, Inject } from '@nestjs/common';
import {
  InjectRepository,
  BaseRepository,
  DATA_SOURCE_MANAGER,
  DataSourceManager,
} from '@cs/nest-typeorm';
import { EntityManager } from 'typeorm';
import { ProductEntity } from './product.entity';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';
import { RoleEntity } from './role.entity';

@Injectable()
export class UserService {
  constructor(
  @Inject(DATA_SOURCE_MANAGER)
  private dataSourceManager: DataSourceManager,
  @InjectRepository({
    entity: UserEntity,
    repository: UserRepository,
  })
  private readonly userRepository: UserRepository,
  @InjectRepository({
    entity: ProductEntity,
  })
  private readonly productRepository: BaseRepository<ProductEntity>,

  @InjectRepository({
    entity: RoleEntity,
    connectionName: 'test1',
  })
  private readonly roleRepository: BaseRepository<RoleEntity>,
  ) {}
async createUser(userData: Partial<UserEntity>): Promise<UserEntity> {
    const dataSource = this.dataSourceManager.getDataSource('default');
    // 创建查询运行器
    // 检查用户名是否已存在
    const exists = await this.userRepository.isUsernameExists(
      userData.username,
    );
    if (exists) {
      throw new Error(`用户名 ${userData.username} 已存在`);
    }

    // 创建用户实体并保存
    const user = new UserEntity();
    Object.assign(user, userData);

    // 设置默认值
    user.id = Date.now().toString(); // 简单示例，实际应使用UUID或雪花ID
    user.isRemoved = false;

    // 插入产品
    const product = new ProductEntity();
    product.productname = '1232';
    product.productcode = 'aaaaww22a';
    product.id = Date.now().toString();


    return await dataSource.transaction(
      async (transactionalEntityManager: EntityManager) => {
        await transactionalEntityManager.save(product);
        await transactionalEntityManager.save(user);
        return user;
      },
    );
  }
 }

```



### 事务使用说明
> 如果你的应用程序使用了多个数据库连接，需要特别注意事务是基于单个连接的。不同连接之间的操作不能放在同一个事务中




## SQL 处理器功能说明

本包在 TypeORM 基础上，通过 MySQL 驱动层拦截器实现了 SQL 自动处理能力，无需业务代码改动，包括：

- **注释注入**：自动在 SQL 头部插入服务标识 + 租户标记，用于数据库审计追踪
- **租户条件改写**：根据请求上下文自动向目标库的 DML 语句添加 `WHERE tenant = 'xxx'`
- **库名改写**：自动为库名添加环境前缀，如 `tnt_order` → `dev_mc_tnt_order`
- **SQL 过滤**：DDL、事务、系统查询等自动跳过改写处理

### 配置

通过 `DatabaseModuleOption.sqlProcessor` 字段配置，类型为 `SqlProcessorConfig`：

```typescript
const databaseConfig: DatabaseModuleOptions = {
  default: {
    type: 'mysql',
    // ... 其他连接配置
    sqlProcessor: {
      // 注释注入配置（默认启用）
      injection: {
        enabled: true,
        mode: InjectionMode.isTenant, // isTenant | isGlobal
      },
      // 租户条件改写配置（默认启用）
      sqlRewrite: {
        enabled: true,
        tenantField: 'tenant',
        targetDatabases: {
          prefixes: ['tnt_', 'tnt_mc_'],
          fullNames: [],
          defaultDatabase: 'main',
        },
      },
      // 库名改写配置（默认关闭）
      databaseRewrite: {
        enabled: true,
        dbPrefix: 'dev_mc_',
        excludeDatabases: ['tnt_config'],
      },
    },
  },
};
```

> 不传 `sqlProcessor` 时使用内置默认配置，适合标准多租户场景直接使用。

### SQL 处理示例

**原始 SQL**
```sql
SELECT * FROM tnt_order.orders WHERE id = ?
```

**处理后 SQL**
```sql
/* from:'my-service.api', addr:'192.168.1.100:8080' */
/*& tenant:'sxlq' */
SELECT * FROM tnt_order.orders WHERE tenant = 'sxlq' AND id = ?
```

- 第 1 行：服务标识注释（injection 开启时始终存在）
- 第 2 行：租户标记注释（isTenant 模式 + 有租户上下文时存在）
- 第 3 行：TenantFilterListener 自动注入的租户过滤条件

### 全局服务配置示例

```typescript
sqlProcessor: {
  injection: {
    mode: InjectionMode.isGlobal, // 注入 /*& global:true */
  },
  sqlRewrite: {
    enabled: false, // 全局服务无需租户过滤
  },
}
```

> 详细配置说明参见 [SQL_PROCESSOR.md](./SQL_PROCESSOR.md)

