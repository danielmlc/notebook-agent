# 项目结构与约定

> **聚合文档** ｜ 涉及多库的项目工程约定（不绑定单一库版本） ｜ **最近更新**：2026-05-06

## 目录

- [标准项目结构](#标准项目结构)
- [工程配置](#工程配置)
- [依赖管理](#依赖管理)
- [新服务清单](#新服务清单)

## 标准项目结构

每个服务是一个独立的 NestJS 项目（非 monorepo），参考 `node-pf-file-service`：

```
my-service/
├── .editorconfig
├── .eslintignore
├── .eslintrc.js
├── .gitignore
├── .npmrc
├── nest-cli.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── config.yaml                  # 应用配置（环境相关，不提交到git）
└── src/
    ├── main.ts                  # 入口：使用 bootstrap()
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

## 工程配置

### nest-cli.json

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "webpack": true,
    "tsConfigPath": "tsconfig.json"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2021",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "./dist",
    "baseUrl": "./",
    "declaration": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "sourceMap": true,
    "incremental": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### .npmrc

```
shamefully-hoist=true
strict-peer-dependencies=false
```

### package.json

```json
{
  "name": "my-service",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "cp:config": "cp ./config.yaml ./dist",
    "build": "nest build",
    "start:dev": "npm run cp:config && nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start": "nest start"
  },
  "dependencies": {
    "@cs/nest-cloud": "^2.0.0",
    "@cs/nest-common": "^3.0.0",
    "@cs/nest-config": "^3.0.0",
    "@nestjs/common": "^10.4.8",
    "@nestjs/core": "^10.4.8",
    "@nestjs/platform-express": "^10.4.8",
    "@nestjs/swagger": "^8.0.7",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.13.2",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "10.4.7",
    "typescript": "5.3.3"
  }
}
```

> 按需添加其他 `@cs/*` 包，如 `@cs/nest-typeorm`、`@cs/nest-redis`、`@cs/nest-mq` 等。

### config.yaml

```yaml
application:
  name: 'my-service-name'
  port: 3025
  serverPath: 'myServer'

profiles.local:
  logger:
    level: 'verbose'
  # 按需添加其他配置块（mysql, redis, mq, fileStorage 等）
```

> `config.yaml` 包含环境相关配置，通过 `cp:config` 脚本在构建时复制到 `dist` 目录。

## 依赖管理

### @cs/* 库安装

所有平台库通过 npm/pnpm 从包仓库安装，使用版本号引用：

```bash
# 安装平台库
pnpm add @cs/nest-cloud @cs/nest-common @cs/nest-config

# 按需安装其他平台库
pnpm add @cs/nest-typeorm    # 数据库ORM
pnpm add @cs/nest-redis      # Redis
pnpm add @cs/nest-mq         # 消息队列
pnpm add @cs/nest-files      # 文件存储
pnpm add @cs/nest-schedule   # 定时任务
pnpm add @cs/nest-mail       # 邮件
pnpm add @cs/nest-sms        # 短信
```

### 构建与运行

```bash
# 开发模式（热重载）
pnpm start:dev

# 构建
pnpm build

# 生产启动
pnpm start
```

## 新服务清单

创建新服务时，按顺序完成以下步骤：

1. 创建项目目录，初始化 `package.json`
2. 安装基础依赖：`@cs/nest-cloud`、`@cs/nest-common`、`@cs/nest-config`、NestJS 核心包
3. 创建 `tsconfig.json`、`nest-cli.json`、`.npmrc`
4. 创建 `config.yaml`，定义 application 配置
5. 创建 `src/main.ts`，使用 `bootstrap(AppModule)`
6. 创建 `src/share.module.ts`，使用 `@Global() @CSModule()`
7. 创建 `src/app.module.ts`，导入 ShareModule
8. 创建 `src/app.service.ts`
9. 按功能在 `src/` 下创建业务模块目录
10. 按需安装其他 `@cs/*` 平台库
