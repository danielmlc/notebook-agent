# @cs/nest-config - 配置管理

> **源码**：[`libs/nest-config`](../../../libs/nest-config) ｜ **对齐版本**：v4.0.1 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装](#安装)
- [ConfigService 使用](#configservice-使用)
- [ConfigModule 配置](#configmodule-配置)
- [config.yaml 结构](#configyaml-结构)
- [配置加载流程](#配置加载流程)
- [配置源](#配置源)
- [本机 bootstrap 配置文件](#本机-bootstrap-配置文件)
- [变量替换](#变量替换)
- [常用配置模式](#常用配置模式)

## 安装

```bash
pnpm add @cs/nest-config
```

> 使用 `@CSModule` 时 ConfigModule 已自动注入，无需手动配置。

## ConfigService 使用

```typescript
import { ConfigService } from '@cs/nest-config';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService) {}

  getDbConfig() {
    return this.config.get('mysql');           // 获取整个配置块
  }

  getPort() {
    return this.config.get('port');            // 获取单个值（支持嵌套路径，如 'mysql.default.host'）
  }

  checkConfig() {
    return this.config.isConfig('redis');      // 检查配置项是否存在
  }

  getAllConfig() {
    return this.config.getAll();               // 获取所有配置
  }
}
```

### 完整 API

```typescript
get(key: string): any                  // 获取配置项（支持嵌套 key，如 'mysql.host'）
isConfig(key: string): boolean         // 检查顶层 key 是否存在
getAll(): ConfigSchema                 // 获取所有配置
```

## ConfigModule 配置

### forRoot（同步）

```typescript
ConfigModule.forRoot(options: ConfigOptions, isGlobal = true)
```

### forRootAsync（异步）

```typescript
ConfigModule.forRootAsync(options: ConfigAsyncOptions, isGlobal = true)

interface ConfigAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => ConfigSchema | Promise<ConfigSchema>;
  inject?: any[];
}
```

### ConfigOptions 接口

```typescript
type ConfigFrom = 'gitea' | 'nacos';

interface ConfigOptions {
  configFilePath?: string;          // 本地配置文件路径（默认 ./dist/config.yaml）
  configFrom?: ConfigFrom;          // 远程配置源（默认 'gitea'）
  onlyLocal?: boolean;             // 仅使用本地配置
  adminNamespace?: string;         // 管理命名空间（Nacos 用）
  gitea?: GiteaOptions;            // Gitea 连接配置（configFrom='gitea' 时使用）
}
```

### GiteaOptions 接口

```typescript
interface GiteaOptions {
  serverUrl?: string;   // Gitea 服务器地址，如 'https://gitea.example.com'
  token?: string;       // Gitea Access Token
  owner?: string;       // 仓库所有者/组织名
  adminRepo?: string;   // 管理配置仓库名，默认 'admin-config'
  branch?: string;      // 分支名，默认 'master'
}
```

## config.yaml 结构

```yaml
application:
  name: 'my-service-name'           # 服务名称
  port: 3025                        # 服务端口
  serverPath: 'myServer'            # 服务路径（RPC 路由前缀）
  profiles.active: 'local'          # 激活的 profile（逗号分隔可多选）

profiles.local:                      # 本地环境配置
  logger:
    level: 'verbose'
  mysql:
    record:
      name: 'default'
      type: 'mysql'
      host: 'localhost'
      port: 3306
      username: 'root'
      password: 'password'
      database: 'my_db'
      synchronize: true
  redis:
    name: 'default'
    url: 'redis://localhost:6379'
  fileStorage:
    provider: 'minio'
    endPoint: 'localhost'
    port: 9000
    bucket: 'my-bucket'
    accessKey: 'minioadmin'
    secretKey: 'minioadmin'
```

## 配置加载流程

```
应用启动
  ↓
ConfigModule.forRoot() / CSModule 自动注入
  ↓
读取本地 config.yaml（configFilePath，默认 ./dist/config.yaml）
  ↓
根据 configFrom（默认 gitea）拉取远程配置
  ↓
检查运行环境（CS_SERVICEENV 环境变量，默认 dev）
  ↓
本地开发环境（dev / beta / dev-mc）？
  ├─ 是 → 本地 config.yaml 优先，合并远程配置
  └─ 否 → 远程配置优先
  ↓
处理覆盖配置（applicationCover）
  ↓
变量替换（${variable.path} → commonSecrets 中的实际值）
  ↓
类型转换（字符串 'true'/'false'/'123' → boolean/number）
  ↓
导出环境变量（CS_*）
  ↓
注入 ConfigService
```

## 配置源

### Gitea（默认，推荐）

从 Gitea 仓库拉取配置，默认配置源（`configFrom: 'gitea'`）。

**仓库结构：**
- 服务配置：`${env}-config` 仓库中的 `${serviceName}.yaml`
- 管理配置（admin-config 仓库中）：
  - `${env}/.application.yaml` — 公共应用配置
  - `${env}/.application-cover.yaml` — 覆盖配置
  - `${env}/.common-secrets.yaml` — 公共敏感配置（密码、密钥等）

**连接信息优先级：** `options.gitea` > `~/.cs/config.json` > 环境变量 > 内置默认值

**环境变量（或 `~/.cs/config.json` 同名字段）：**

| 变量 | 说明 | 必填 |
|---|---|---|
| `CS_GITEA_SERVER_URL` | Gitea 服务器地址 | ✅ |
| `CS_GITEA_TOKEN` | Gitea Access Token | ✅ |
| `CS_GITEA_OWNER` | 仓库所有者/组织名 | ✅ |
| `CS_GITEA_ADMIN_REPO` | 管理配置仓库名 | 默认 `admin-config` |
| `CS_GITEA_BRANCH` | 分支名 | 默认 `master` |
| `CS_SERVICEENV` | 运行环境（命名空间） | 默认 `dev` |

### Nacos（可选，传统方式）

`configFrom: 'nacos'` 时使用。

从 Nacos 配置中心获取配置，自动加载：
- 主命名空间：`${serviceName}` — 服务专有配置
- 管理命名空间：`.application` / `.application-cover` / `.common-secrets`

**连接信息优先级：** `~/.cs/config.json` > 环境变量 > 内置默认值

| 变量 | 说明 | 默认值 |
|---|---|---|
| `CS_NACOSSERVERIP` | Nacos 服务器地址 | — |
| `CS_NACOSNAME` | 用户名 | `nacos` |
| `CS_NACOSPASSWORD` | 密码 | `nacos` |
| `CS_SERVICEENV` | 环境/命名空间 | `dev` |
| `CS_ADMINNAMESPACE` | 管理命名空间 | `${CS_SERVICEENV}-admin` |

## 本机 bootstrap 配置文件

`~/.cs/config.json` — 明文 KV 格式，Gitea 和 Nacos 共用，用于本机开发覆盖：

```json
{
  "CS_SERVICEENV": "dev",
  "CS_GITEA_SERVER_URL": "https://gitea.example.com",
  "CS_GITEA_TOKEN": "your-token",
  "CS_GITEA_OWNER": "your-org",
  "CS_GITEA_ADMIN_REPO": "admin-config",
  "CS_GITEA_BRANCH": "master"
}
```

## 变量替换

支持在配置中引用 `commonSecrets` 中的值（集中管理密码/密钥）：

```yaml
# commonSecrets 中定义敏感信息
commonSecrets:
  mysql:
    password: 'real-password'

# 业务配置中引用
mysql:
  password: '${mysql.password}'              # 完整引用，保持原始类型
  url: 'mysql://${mysql.host}:${mysql.port}/db'  # 字符串内引用
```

## 常用配置模式

### 在模块 forRootAsync 中使用

```typescript
// 所有 @cs/* 模块的标准配置方式
DatabaseModule.forRootAsync({
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    return { ...config.get('mysql') };
  },
})

RedisModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    ...config.get('redis'),
  }),
})

MqModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => config.get('mq'),
})
```

### 在 bootstrap 回调中使用

```typescript
bootstrap(AppModule, async (app, config) => {
  const name = config.get('name');
  const port = config.get('port');
  console.log(`${name} 已启动，端口: ${port}`);
});
```
