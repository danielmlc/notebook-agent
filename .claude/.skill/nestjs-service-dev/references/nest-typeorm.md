# @cs/nest-typeorm - 数据库 ORM

> **源码**：[`libs/nest-typeorm`](../../../libs/nest-typeorm) ｜ **对齐版本**：v2.0.0 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装](#安装)
- [模块配置](#模块配置)
- [实体定义](#实体定义)
- [仓储定义](#仓储定义)
- [模块注册](#模块注册)
- [仓储注入](#仓储注入)
- [BaseRepository 完整 API](#baserepository-完整-api)
- [DataSourceManager](#datasourcemanager)
- [完整模块示例](#完整模块示例)

## 安装

```bash
pnpm add @cs/nest-typeorm
```

## 模块配置

### ShareModule 中注册

```typescript
import { DatabaseModule } from '@cs/nest-typeorm';

// 异步方式（推荐）
@Global()
@CSModule({
  imports: [
    DatabaseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        return { ...config.get('mysql') };
      },
    }),
  ],
  exports: [DatabaseModule],
})
export class ShareModule {}

// 同步方式
DatabaseModule.forRoot({ record: { name: 'default', type: 'mysql', ... } })
```

### config.yaml 配置

```yaml
mysql:
  record:                        # 连接配置key（可多个）
    name: 'default'              # 连接名称
    type: 'mysql'
    host: 'localhost'
    port: 3306
    username: 'root'
    password: 'password'
    database: 'my_db'
    synchronize: true            # 自动同步实体到数据库（开发环境用）
    logging: true                # 打印SQL日志
    retryAttempts: 10            # 连接重试次数（默认10）
    retryDelay: 3000             # 重试间隔ms（默认3000）
    sqlProcessor:                # SQL 处理器配置（见下方 SqlProcessorConfig）
      injection:
        enabled: true
        mode: 'isTenant'         # 'isTenant' | 'isGlobal'
      sqlRewrite:
        enabled: true
        tenantField: 'tenant'
        targetDatabases:
          prefixes: ['tnt_']
          fullNames: []
          defaultDatabase: 'main'
      databaseRewrite:
        enabled: false
        dbPrefix: ''
      sqlFilter:
        enabled: true
```

### 多数据源

```yaml
mysql:
  primary:
    name: 'default'
    type: 'mysql'
    host: 'db1.example.com'
    database: 'primary_db'
  secondary:
    name: 'secondary'
    type: 'mysql'
    host: 'db2.example.com'
    database: 'secondary_db'
```

### SqlProcessorConfig

```typescript
interface SqlProcessorConfig {
  injection?: {
    enabled?: boolean;                       // 默认 true
    mode?: 'isTenant' | 'isGlobal';         // 默认 'isTenant'
    customHintGenerator?: () => string[];    // 自定义注释生成函数
  };
  databaseRewrite?: {
    enabled: boolean;                        // 默认 false
    dbPrefix: string;                        // 库名前缀，如 'dev_mc_'
    targetDatabases?: string[];             // 指定改写的库名列表（空=全部）
    excludeDatabases?: string[];            // 排除的库名列表
  };
  sqlFilter?: SqlFilterConfig;              // SQL 过滤规则
  sqlRewrite?: {
    enabled: boolean;                        // 是否启用租户条件注入
    tenantField?: string;                    // 租户字段名，默认 'tenant'
    throwOnError?: boolean;                  // 解析失败是否抛异常，默认 false
    targetDatabases?: {
      prefixes: string[];                    // 库名前缀列表，如 ['tnt_']
      fullNames: string[];                   // 完整库名列表
      defaultDatabase: string;              // 无库名表的默认库名
    };
  };
}
```

## 实体定义

### 基类选择

| 基类 | 包含字段 | 适用场景 |
|------|---------|---------|
| `HasOnlyPrimaryEntity` | id | 仅需主键 |
| `HasPrimaryEntity` | id, 审计字段, isRemoved, version | 标准业务表 |
| `HasPrimaryFullEntity` | id, 审计字段, isRemoved, version, sortCode, isEnable | 需排序和启用状态 |
| `HasPrimaryTreeEntity` | id, 审计字段, parentId, fullId, fullName, level, isLeaf | 树形结构 |
| `HasPrimaryFullTreeEntity` | 上述全部 | 带排序启用的树形结构 |

### 审计字段（HasPrimaryEntity 及子类包含）

```typescript
@CreateDateColumn({ name: 'created_at', nullable: true })              createdAt: Date;
@Column({ name: 'creator_id', type: 'bigint', nullable: true })       creatorId: string;
@Column({ name: 'creator_name', length: 50, nullable: true })         creatorName: string;
@UpdateDateColumn({ name: 'modifier_at', nullable: true })             modifierAt: Date;
@Column({ name: 'modifier_id', type: 'bigint', nullable: true })      modifierId: string;
@Column({ name: 'modifier_name', length: 50, nullable: true })        modifierName: string;
@Column({ name: 'is_removed', type: 'tinyint', default: false, nullable: true })  isRemoved: boolean;
@Column({ name: 'version', type: 'bigint', nullable: true })          version: number;
```

> 所有审计字段均为 `nullable: true`，由 BaseRepository 在 saveOne/saveMany 时自动从 ContextService 填充。

### 实体示例

```typescript
import { Entity, Column, Index } from 'typeorm';
import { HasPrimaryEntity } from '@cs/nest-typeorm';

@Entity('t_order')
export class OrderEntity extends HasPrimaryEntity {
  @Column({ comment: '订单编号', length: 64 })
  @Index()
  orderNo: string;

  @Column({ comment: '客户名称', length: 128 })
  customerName: string;

  @Column({ comment: '金额', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ comment: '状态', default: 0 })
  status: number;

  @Column({ comment: '备注', nullable: true, length: 500 })
  remark: string;
}
```

## 仓储定义

```typescript
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@cs/nest-typeorm';
import { OrderEntity } from './order.entity';

@Injectable()
export class OrderRepository extends BaseRepository<OrderEntity> {
  // 可添加自定义查询方法
  async findByOrderNo(orderNo: string) {
    return this.findOne({ where: { orderNo } });
  }
}
```

## 模块注册

```typescript
import { EntityRegistModule } from '@cs/nest-typeorm';

@Module({
  imports: [
    EntityRegistModule.forRepos([
      {
        entity: OrderEntity,
        repository: OrderRepository,
        connectionName: 'default',    // 对应 config.yaml 中的 name
      },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
})
export class OrderModule {}
```

## 仓储注入

```typescript
import { InjectRepository } from '@cs/nest-typeorm';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository({
      entity: OrderEntity,
      repository: OrderRepository,
    })
    private readonly orderRepo: OrderRepository,
  ) {}
}
```

## BaseRepository 完整 API

### 查询方法

```typescript
// 查询单条
await this.repo.findOne(dto: Partial<T>): Promise<T>

// 查询多条
await this.repo.findMany(dto: Partial<T>, take?: number, skip?: number): Promise<T[]>

// 分页查询（标准方式）
await this.repo.findManyBase<R>(query: QueryConditionInput): Promise<R[] | PageResult<R[]>>
```

**QueryConditionInput 分页查询：**

```typescript
interface QueryConditionInput {
  tableName?: string;                          // 表别名
  select?: string[];                           // 查询字段
  conditionLambda?: string;                    // 条件表达式，如 "status = :status AND name LIKE :name"
  conditionValue?: Record<string, any>;        // 条件值，如 { status: 1, name: '%test%' }
  orderBy?: Record<string, 'ASC' | 'DESC'>;   // 排序
  skip?: number;                               // 偏移量
  take?: number;                               // 每页数量（不传则不分页）
}

interface PageResult<T> {
  result: T;     // 数据列表
  count: number; // 总数
}
```

### 保存方法

```typescript
// 保存单条（新增或更新）
await this.repo.saveOne(entity: DeepPartial<T>): Promise<T>

// 批量保存
await this.repo.saveMany(entities: DeepPartial<T>[], options?: SaveOptions): Promise<T[]>
```

### 更新方法

```typescript
// 按条件更新
await this.repo.updateByCondition(
  updateData: Partial<T>,     // 要更新的字段
  conditions: Partial<T>      // 更新条件
): Promise<UpdateResult>
```

### 删除方法

```typescript
// 软删除（设置 isRemoved = true）
await this.repo.softDeletion(conditions: Partial<T>): Promise<UpdateResult>

// 硬删除（物理删除）
await this.repo.hardDelete(conditions: Partial<T>): Promise<DeleteResult>
```

### SQL 执行

```typescript
// 执行原始SQL，结果字段名自动从 snake_case 转为 camelCase
await this.repo.executeSql(
  sql: string,
  parameters?: Record<string, any>
): Promise<any>

// 示例
await this.repo.executeSql(
  'SELECT * FROM t_order WHERE status = :status',
  { status: 1 }
);
// 返回示例：[{ orderId: '1', orderNo: 'ORD001', createdAt: Date }]（自动驼峰转换）
```

### 事务

```typescript
// 使用 manager.transaction
await this.repo.manager.transaction(async (entityManager) => {
  const order = await entityManager.save(OrderEntity, orderData);
  await entityManager.save(OrderItemEntity, { ...itemData, orderId: order.id });
  // 异常自动回滚
});
```

### 上下文方法

BaseRepository 自动从 ContextService 获取用户信息填充审计字段：

```typescript
// 新增时自动填充 creatorId, creatorName, id
suppleAddContext(entity, id): Partial<T>

// 编辑时自动填充 modifierId, modifierName
suppleEditContext(entity): Partial<T>
```

## DataSourceManager

用于多数据源场景：

```typescript
import { DATA_SOURCE_MANAGER, DataSourceManager } from '@cs/nest-typeorm';

@Injectable()
export class MyService {
  constructor(
    @Inject(DATA_SOURCE_MANAGER)
    private readonly dsManager: DataSourceManager,
  ) {}

  async queryOtherDb() {
    const ds = this.dsManager.getDataSource('secondary');
    return ds.query('SELECT 1');
  }

  getAllSources() {
    return this.dsManager.getAllDataSources(); // Map<string, DataSource>
  }
}
```

## 完整模块示例

```typescript
// order.entity.ts
@Entity('t_order')
export class OrderEntity extends HasPrimaryEntity {
  @Column({ comment: '订单编号', length: 64 })
  orderNo: string;

  @Column({ comment: '金额', type: 'decimal', precision: 10, scale: 2 })
  amount: number;
}

// order.repository.ts
@Injectable()
export class OrderRepository extends BaseRepository<OrderEntity> {}

// order.service.ts
@Injectable()
export class OrderService {
  constructor(
    @InjectRepository({ entity: OrderEntity, repository: OrderRepository })
    private readonly orderRepo: OrderRepository,
    private readonly logger: LoggerService,
  ) {}

  async create(dto: CreateOrderDto) {
    return await this.orderRepo.saveOne(dto);
  }

  async findPage(query: QueryConditionInput) {
    return await this.orderRepo.findManyBase(query);
  }

  async update(id: string, dto: UpdateOrderDto) {
    return await this.orderRepo.updateByCondition(dto, { id });
  }

  async remove(id: string) {
    return await this.orderRepo.softDeletion({ id });
  }
}

// order.module.ts
@Module({
  imports: [
    EntityRegistModule.forRepos([
      { entity: OrderEntity, repository: OrderRepository, connectionName: 'default' },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
})
export class OrderModule {}
```
