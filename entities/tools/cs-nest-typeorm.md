---
title: "@cs/nest-typeorm"
type: entity
aliases: ["@cs/nest-typeorm", "nest-typeorm", "NestJS TypeORM 包", "ORM 封装"]
tags: [nestjs, mwp, package, tool, typeorm, orm, mysql]
status: draft
confidence: high
version: "2.0.0"
sources:
  - "[[2026-05-14-cs-nest-typeorm-v2.0.0]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-cloud]]"
  - "[[cs-nest-common]]"
  - "[[cs-sql-parser]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-typeorm

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：2.0.0
- License：ISC
- 作者：danielmlc
- 定位：ORM 封装 — TypeORM 增强封装
- 核心依赖：typeorm 0.3.20, mysql2 ^3.12.0, lodash ^4.17.21
- 强制 peerDependencies：@cs/nest-cloud, @cs/nest-common

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v2.0.0 源码快照）

## 核心模块

### base.entity/ — 实体基类

- **BaseEntity**：审计字段基类（createdAt/creatorId/modifiedAt...）
- **HasEnableEntity**：启用状态 + 排序码
- **TreeEntity**：树形结构（parentId/fullId/level/isLeaf）
- **HasPrimaryEntity**：主键实体

### BaseRepository — 增强仓库

```typescript
abstract class BaseRepository<T> extends Repository<T> {
  findOne(dto: Partial<T>): Promise<T>
  findMany(dto: Partial<T>, take?, skip?): Promise<T[]>
  findManyBase<R>(queryConditionInput): Promise<R[] | PageResult<R[]>>
  saveOne(entity): Promise<T>
  saveMany(entities): Promise<T[]>
  suppleAddContext(entity, id): Partial<T>  // 自动注入创建人信息
  suppleEditContext(entity): Partial<T>     // 自动注入修改人信息
}
```

- 与 ContextService / RpcClient 集成
- 自动注入 creatorId/modifierId/creatorName/modifierName
- 自动生成 ID（通过 RpcClient.getNewId()）

### decorators/ — 装饰器

- **@InjectRepository(Entity)** — 注入增强仓库
- **@RepositoryModule(entities)** — 标注仓库模块

### sql-processor/ — SQL 处理

- **SqlProcessorService** — SQL 过滤和处理
- **SqlFilter** — SQL 安全过滤

### driver/ — 驱动拦截

- **MysqlDriverInterceptor** — MySQL 驱动拦截器，实现租户隔离

### DataSourceManager — 多数据源

- 多数据库连接管理
- 动态数据源切换

## 设计亮点

1. **上下文自动注入**：saveOne/saveMany 自动填充审计字段
2. **增强仓库**：BaseRepository 提供便捷查询方法
3. **SQL 安全过滤**：SqlProcessorService 防止 SQL 注入
4. **多数据源**：DataSourceManager 支持多库切换
5. **与 sql-parser 集成**：实现租户隔离 SQL 改写

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-cloud]]、[[cs-nest-common]]、[[cs-sql-parser]]

## 引用来源

- [[2026-05-14-cs-nest-typeorm-v2.0.0]]