# @cs/nest-common - 通用工具库

> **源码**：[`libs/nest-common`](../../../libs/nest-common) ｜ **对齐版本**：v4.0.1 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装](#安装)
- [ContextService - 请求上下文](#contextservice---请求上下文)
- [LoggerService - 日志服务](#loggerservice---日志服务)
- [加密工具类](#加密工具类)
- [CommonUtil - 通用工具](#commonutil---通用工具)
- [常量](#常量)
- [基础 DTO 类](#基础-dto-类)

## 安装

```bash
pnpm add @cs/nest-common
```

> 使用 `@CSModule` 时 ContextModule 和 LoggerModule 已自动注入，无需手动配置。

> ⚠️ `HttpService` 已迁移至 `@cs/nest-cloud`，不再从 `@cs/nest-common` 导入。

## ContextService - 请求上下文

获取当前请求上下文中的用户/租户信息：

```typescript
import { ContextService, CONTEXT_HEADER } from '@cs/nest-common';

@Injectable()
export class MyService {
  constructor(private readonly ctx: ContextService) {}

  getCurrentUser() {
    const userId = this.ctx.getContext<string>('userId');
    const tenantId = this.ctx.getContext<string>('tenantId');
    return this.ctx.getAllContext();  // 获取所有上下文
  }
}
```

### 完整 API

```typescript
getContext<T>(key: string): T | undefined       // 获取单个上下文值
getAllContext(): Record<string, any>              // 获取所有上下文
setContext(key: string, value: any): void        // 设置上下文值
deleteContext(key: string): void                 // 删除上下文值
runWithContext<T>(ctx: Record<string, any>, cb: () => T): T  // 在指定上下文中执行
encodeContext(ctx: Record<string, any>): string  // 编码上下文（base64）
decodeContext(encoded: string): Record<string, any>
```

### UserContext 接口

```typescript
interface UserContext {
  requestId: string;
  startTime: number;
  url: string;
  method: string;
  hopCount?: number;
  userId?: string;
  userName?: string;
  realName?: string;
  eMail?: string;
  phone?: string;
  orgId?: string;
  orgName?: string;
  orgType?: string;
  tenantId?: string;
  tenantCode?: string;
  tenantName?: string;
  applicationId?: string;
  moduleId?: string;
  traceHeaders?: Record<string, string>;  // Istio/Envoy 标准追踪头
  [key: string]: any;
}
```

### 常量

```typescript
CONTEXT_HEADER = 'X-User-Context'  // 跨服务传递上下文的请求头名称
```

## LoggerService - 日志服务

```typescript
import { LoggerService } from '@cs/nest-common';

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {}

  doWork() {
    this.logger.log('操作成功', 'MyService');
    this.logger.error('操作失败', error.stack, 'MyService');
    this.logger.warn('警告信息');
    this.logger.debug('调试信息');
    this.logger.verbose('详细信息');
  }
}

// 直接实例化（无需注入）
const logger = new LoggerService('MyContext');
```

### 动态方法

```typescript
setContextLevel(context: string, level: WinstonLogLevel | 'none'): void  // 动态设置某个 context 的日志级别
setGlobalLevel(level: WinstonLogLevel | 'none'): void                    // 动态设置全局日志级别
```

### config.yaml 日志配置

```yaml
logger:
  level: 'info'                    # 全局日志级别：error | warn | info | verbose | debug | none
  timestamp: true                  # 打印当前与上一条日志的时间差
  disableConsoleAtProd: false      # 生产环境禁用控制台输出
  maxFileSize: '2m'                # 单个日志文件大小上限
  maxFiles: '15d'                  # 日志保留天数/数量
  appLogName: 'web.log'           # 应用日志文件名（支持 %DATE% 占位符）
  errorLogName: 'error.log'       # 错误日志文件名（支持 %DATE% 占位符）
  dir: './logs'                    # 日志文件存储目录
  defaultContextLevel: 'info'     # 未在 contextLevels 中配置的 context 的默认级别（设为 'none' 实现白名单模式）
  contextLevels:                   # 基于 context 的日志级别（可选）
    ToolA: 'error'                 # ToolA 只输出 error
    ToolB: 'warn'
    MyService: 'verbose'
```

**白名单模式**（只输出指定 context 的日志）：

```yaml
logger:
  level: 'info'
  defaultContextLevel: 'none'     # 未配置的 context 全部静默
  contextLevels:
    OrderService: 'debug'          # 只有 OrderService 输出
```

## 加密工具类

```typescript
import { AesUtils, RsaUtils, Md5Utils, Argon2Utils } from '@cs/nest-common';
```

### AesUtils — AES-256-CBC 对称加密

```typescript
// 加密（不传 iv 则随机生成，输出格式：${ivHex}:${encrypted}）
const encrypted = await AesUtils.encrypt(text, key);
const encrypted = await AesUtils.encrypt(text, key, ivHex);  // 指定 IV

// 解密
const text = await AesUtils.decrypt(encrypted, key);

// 生成密钥和 IV
const { key, iv } = AesUtils.generateKey();
```

### RsaUtils — RSA 非对称加密

```typescript
// 公钥加密 / 私钥解密（PKCS1_OAEP_PADDING + sha256）
const encrypted = RsaUtils.encrypt(text, publicKeyPem);
const text = RsaUtils.decrypt(encrypted, privateKeyPem);

// 长文本分块加密/解密（解决 RSA 大小限制，块间用 ':' 分隔）
const encrypted = RsaUtils.encryptLong(text, publicKeyPem, blockSize = 190);
const text = RsaUtils.decryptLong(encrypted, privateKeyPem);
```

### Md5Utils — MD5 哈希

```typescript
Md5Utils.hash(text)                        // MD5 哈希
Md5Utils.hashWithSalt(text, salt, iterations = 1)  // 加盐 MD5
Md5Utils.hmac(text, key)                   // HMAC-MD5
Md5Utils.fileChecksum(buffer)              // 文件 MD5
Md5Utils.verify(text, hash)                // 验证
Md5Utils.verifyWithSalt(text, hash, salt)  // 加盐验证
```

### Argon2Utils — 密码哈希（推荐用于密码存储）

```typescript
const argon2 = new Argon2Utils({
  memoryCost: 65536,  // 64MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  type: 2,            // 0=argon2d, 1=argon2i, 2=argon2id（默认）
});

const hash = await argon2.hashPassword(password);
const valid = await argon2.verifyPassword(hash, password);
const needsRehash = await argon2.needsRehash(hash);  // 判断是否需要重新哈希
```

## CommonUtil - 通用工具

```typescript
import { CommonUtil } from '@cs/nest-common';

CommonUtil.nanoidKey(size = 10)          // 生成指定长度随机字符串（nanoid）
CommonUtil.idGenerate()                  // 生成唯一 ID
CommonUtil.idArrGenerate(length)         // 生成 ID 数组
CommonUtil.getRandomString(length)       // 生成随机字母数字字符串
CommonUtil.getRandomCode(length)         // 生成随机纯数字字符串（验证码用）
CommonUtil.getVerSion()                  // 获取时间戳版本号（Date.now()）
CommonUtil.getIPAdress()                 // 获取本机 IP（优先私有网段）
CommonUtil.getMac()                      // 获取本机 MAC 地址
CommonUtil.disableConsole()              // 生产环境禁用 console（返回原始 console）
```

## 常量

```typescript
import { EHttpStatus, EHttpExtendStatus } from '@cs/nest-common';

enum EHttpStatus {
  Error = 'error',
  Success = 'success',
}

enum EHttpExtendStatus {
  INTERNAL_RPC_SERVER_ERROR = 508,
  INTERNAL_RPC_SERVER_TIMEOUT = 509,
}
```

## 基础 DTO 类

### 查询与分页

```typescript
import { QueryConditionInput, PageResult } from '@cs/nest-common';

// 查询条件
interface QueryConditionInput {
  tableName?: string;
  select?: string[];
  conditionLambda?: string;                    // "status = :status AND name LIKE :name"
  conditionValue?: Record<string, any>;        // { status: 1, name: '%test%' }
  orderBy?: Record<string, 'ASC' | 'DESC'>;
  skip?: number;
  take?: number;                               // 不传则不分页
}

// 分页结果
interface PageResult<T> {
  result: T;
  count: number;
}
```

### 实体 DTO 基类

```typescript
import { HasPrimaryDto, HasPrimaryFullDto, HasPrimaryTreeDto, HasPrimaryFullTreeDto } from '@cs/nest-common';

// HasPrimaryDto: id + 审计字段（createAt/modifiedAt/creatorId 等）
// HasPrimaryFullDto: id + 审计字段 + sortCode + isEnable
// HasPrimaryTreeDto: id + 审计字段 + parentId + fullId + fullName + level + isLeaf
// HasPrimaryFullTreeDto: 以上全部
```

> **注意：** DTO 中的修改时间字段名为 `modifiedAt`，Entity 基类中为 `modifierAt`，映射时需注意。

### Controller 中使用分页查询

```typescript
@Get('page')
async findPage(@Query() query: QueryConditionInput) {
  return await this.service.findPage(query);
}
```
