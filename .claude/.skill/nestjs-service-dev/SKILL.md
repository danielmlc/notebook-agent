---
name: nestjs-service-dev
description: NestJS 微服务开发规范技能。用于开发基于 @cs/* 平台库的 NestJS 服务时，约束开发方式和规范。当用户要求创建新的 NestJS 服务、添加模块、编写 Controller/Service/Repository、使用消息队列、文件存储、定时任务、数据库ORM、Redis、RPC调用、配置管理、邮件、短信、认证等功能时触发。确保优先使用平台提供的 @cs/* 库而非第三方库。触发关键词：创建服务、新建模块、添加接口、数据库操作、消息队列、文件上传、定时任务、Redis缓存、RPC调用、认证集成、NestJS开发。
---

# NestJS 微服务开发规范

## 权威源与同步机制

**唯一权威源**：本地 [libs/](../../libs/) 目录下的源码。所有 `@cs/*` 平台库的 API、配置、装饰器、行为说明，以源码为准；本技能包的所有 reference 文档是源码的"派生说明"，不是平行真理。

- 每个 reference 文档顶部有版本 stamp，标注其对齐的源码版本与同步时间
- 当 reference 与源码冲突时，**以源码为准**，并在下次迭代中修正 reference

## 核心原则

1. **优先使用平台库**: 所有基础设施功能必须使用 `@cs/*` 系列库，禁止引入功能重叠的第三方包
2. **遵循参考实现**: `node-pf-file-service` 是标准单体项目范例，新服务应以此为蓝本
3. **统一启动方式**: 使用 `@cs/nest-cloud` 的 `bootstrap()` 启动应用
4. **模块化开发**: 使用 `@CSModule` 装饰器替代原生 `@Module` 进行根模块/共享模块定义
5. **配置驱动**: 通过 `config.yaml` + `@cs/nest-config` 管理所有配置

## 平台库速查

| 功能 | 库 | 导入路径 |
|------|-----|---------|
| 应用启动/RPC | `@cs/nest-cloud` | `import { bootstrap, CSModule } from '@cs/nest-cloud'` |
| 配置管理 | `@cs/nest-config` | `import { ConfigService } from '@cs/nest-config'` |
| 通用工具/日志 | `@cs/nest-common` | `import { LoggerService, ContextService } from '@cs/nest-common'` |
| 数据库 ORM | `@cs/nest-typeorm` | `import { BaseRepository, EntityRegistModule } from '@cs/nest-typeorm'` |
| Redis | `@cs/nest-redis` | `import { RedisModule, RedisService } from '@cs/nest-redis'` |
| 消息队列 | `@cs/nest-mq` | `import { MqModule, MqService } from '@cs/nest-mq'` |
| 文件存储 | `@cs/nest-files` | `import { FileStorageModule, FileStorageService } from '@cs/nest-files'` |
| 定时任务 | `@cs/nest-schedule` | `import { ScheduleModule, JobHandler } from '@cs/nest-schedule'` |
| 邮件 | `@cs/nest-mail` | `import { MailModule, MailService } from '@cs/nest-mail'` |
| 短信 | `@cs/nest-sms` | `import { SmsModule } from '@cs/nest-sms'` |
| CAS 认证 | `@cs/nest-cas-client` | `import { CasClientModule } from '@cs/nest-cas-client'` |
| 内部认证 | `@cs/nest-auth-client` | `import { AuthClientModule } from '@cs/nest-auth-client'` |

## 创建新服务

所有 `@cs/*` 平台库通过 `package.json` 声明依赖、`pnpm install` 安装到 `node_modules` 中使用。

### 项目模板

技能包提供了完整的项目初始模板，位于 [assets/template/](assets/template/)。创建新服务时，复制整个模板目录到目标位置，然后替换占位符：

- `{{SERVICE_NAME}}` - 服务名称（如 `node-pf-order-service`）
- `{{SERVER_PATH}}` - 服务路径（如 `orderServer`）

模板包含：`.editorconfig`、`.gitignore`、`.npmrc`、`tsconfig.json`、`eslint.config.ts`、`packer-config.ts`、`package.json`（含基础依赖）、`config.yaml`、以及 `src/` 骨架（`main.ts`、`app.module.ts`、`share.module.ts`、`app.service.ts`）。按需在 `package.json` 中添加其他 `@cs/*` 库依赖。

### 标准目录结构

```
my-service/
├── .npmrc
├── package.json
├── tsconfig.json
├── config.yaml                  # 应用配置
└── src/
    ├── main.ts                  # 入口：bootstrap()
    ├── app.module.ts            # 根模块：导入 ShareModule + 业务模块
    ├── app.service.ts           # 根服务
    ├── share.module.ts          # 共享模块：@Global + @CSModule
    └── <feature>/               # 业务功能模块（按功能划分目录）
        ├── <feature>.module.ts
        ├── <feature>.service.ts
        ├── <feature>.controller.ts  # 如需HTTP接口
        ├── <feature>.repository.ts  # 如需数据库
        ├── <feature>.entity.ts      # 如需数据库
        └── <feature>.dto.ts
```

> `share.module.ts` 使用 `@CSModule` + `@Global()` — 自动注入 ConfigModule、ContextModule、LoggerModule、RpcModule，业务模块在此引入全局基础设施。

## 功能模块开发

各库的详细配置、完整 API 和代码范例见参考文档（按需加载）：

- **项目结构与约定**: [project-structure.md](references/project-structure.md) - 工程配置、目录规范、依赖管理
- **应用启动与 RPC**: [nest-cloud.md](references/nest-cloud.md) - bootstrap、CSModule、RPC 客户端/服务端
- **配置管理**: [nest-config.md](references/nest-config.md) - ConfigService、config.yaml、Gitea/Nacos/本地配置加载
- **数据库 ORM**: [nest-typeorm.md](references/nest-typeorm.md) - 实体、仓储、BaseRepository API、事务、多数据源
- **SQL 改写引擎**: [sql-parser.md](references/sql-parser.md) - 多租户/全局/库名前缀注入（nest-typeorm 底层）
- **通用工具**: [nest-common.md](references/nest-common.md) - ContextService、LoggerService、DTO
- **消息队列**: [nest-mq.md](references/nest-mq.md) - RocketMQ 生产者/消费者、装饰器、配置
- **文件存储**: [nest-files.md](references/nest-files.md) - 多云存储、上传/下载/签名 API
- **Redis**: [nest-redis.md](references/nest-redis.md) - 单客户端/多客户端/集群配置
- **定时任务**: [nest-schedule.md](references/nest-schedule.md) - XXL-Job、@JobHandler、分片任务
- **邮件**: [nest-mail.md](references/nest-mail.md) - SMTP 配置、MailService.sendMail
- **短信**: [nest-sms.md](references/nest-sms.md) - 阿里云/腾讯云 SMS
- **CAS SSO 认证**: [nest-cas-client.md](references/nest-cas-client.md) - CAS Server、ST 验证、Cookie 会话
- **内部认证**: [nest-auth-client.md](references/nest-auth-client.md) - Cookie + RPC 会话验证

## 关键约束

1. **禁止直接使用 TypeORM**: 必须通过 `@cs/nest-typeorm` 的 `BaseRepository` 操作数据库
2. **禁止直接使用 ioredis**: 必须通过 `@cs/nest-redis` 的 `RedisModule` 使用 Redis
3. **禁止直接使用 nodemailer**: 必须通过 `@cs/nest-mail` 的 `MailModule` 发邮件
4. **禁止自定义启动逻辑**: 必须使用 `bootstrap()` 启动应用
5. **禁止自定义日志系统**: 必须使用 `@cs/nest-common` 的 `LoggerService`
6. **模块初始化**: 全局基础设施模块放在 `ShareModule` 中，使用 `@CSModule` + `@Global()` 装饰
7. **实体注册**: 使用 `EntityRegistModule.forRepos()` 注册实体和仓储
8. **仓储注入**: 使用 `@InjectRepository()` 装饰器注入仓储
9. **异步配置优先**: 模块初始化优先使用 `forRootAsync` + `ConfigService`
10. **DTO 规范**: 查询条件使用 `QueryConditionInput`，分页结果使用 `PageResult`
