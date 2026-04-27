---
title: "@cs/nest-common"
type: entity
aliases: ["@cs/nest-common", "nest-common", "cs-nest-common", "NestJS 通用工具包"]
tags: [nestjs, mwp, package, tool, logger, context, http, dto, crypto]
status: draft
confidence: high
version: "4.0.1-beta.2"
sources:
  - "[[2026-04-27-cs-nest-common-v4.0.1-beta.2]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-redis]]"
created: 2026-04-27
updated: 2026-04-27
last_reviewed: 2026-04-27
---

# @cs/nest-common

## 基本信息

- 类别：工具 / NestJS package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：4.0.1-beta.2
- License：ISC
- 作者：danielmlc
- 核心依赖：`winston` + `winston-daily-rotate-file`、`axios ^0.27`、`argon2`、`nanoid`、`class-validator` / `class-transformer`、`@nestjs/common ^10`

## 关键事件 / 里程碑

- 2026-04-27 · 首次入库（基于 v4.0.1-beta.2 源码快照）

## 核心模块

### context/

- 基于 Node.js `AsyncLocalStorage` 的请求上下文传播
- `runWithContext(ctx, fn)` 绑定生命周期；`getContext<T>(key)` / `setContext(key, val)` 读写；`deleteContext(key)` 清除
- `UserContext` 接口：requestId / userId / orgId / tenantId / applicationId / traceHeaders（可扩展）
- 跨服务透传：`encodeContext()` → base64 JSON → `X-User-Context` 头；`decodeContext()` 还原
- `ContextModule.forRoot(options, isGlobal)` — `@Global()` 模块，默认全局

### logger/

- 实现 NestJS `LoggerService` 接口，基于 `winston` + `winston-daily-rotate-file`
- 双路文件输出：`web.log`（全级别）+ `error.log`（error 级别）
- **按 context 白名单控制日志级别**：`contextLevels` 字典 + `defaultContextLevel: 'none'` 白名单模式
- 自动注入 requestId / traceId（从 ContextService AsyncLocalStorage 读取，B3 > W3C > x-request-id）
- 双构造路径：DI 注入（`@Inject(LOGGER_MODULE_OPTIONS)`）+ `new LoggerService(context)` 直接实例化
- 静态 `globalOptions` 使所有实例共享配置；静态 `contextService` 支持运行时注入追踪上下文

### http/

- Axios 包装，`forRegister` / `forRegisterAsync` 动态模块
- 双层拦截器：全局（`debugAuth: true` 注入 `x-service-endpoint: 1`）+ 用户自定义（`interceptors` 选项）
- 封装 `get` / `post` / `put` / `delete`，泛型返回类型
- `getAxiosInstance()` 暴露原生实例；动态 `addRequestInterceptor` / `removeRequestInterceptor`

### dto/

- 继承链：`BaseDto`（审计字段）→ `HasEnableDto`（isEnable, sortCode）/ `TreeDto`（parentId, fullId, fullName, level, isLeaf）
- → `HasPrimaryDto` / `HasPrimaryFullDto` / `HasPrimaryFullTreeDto`（含 id 的全字段变体）
- 独立接口：`PageResult<T>` / `QueryConditionInput` / `Result<T>` / `ErrorResult`

### utils/

- `CommonUtil`：nanoid ID 生成、IP 获取（多网段优先级匹配）、随机字符串/验证码、`disableConsole()`
- `AesUtils`：AES-256-CBC，`scrypt` 派生密钥（固定 salt），随机 IV 自动内嵌（`ivHex:ciphertext`）
- `RsaUtils`：RSA-OAEP-SHA256，`encryptLong` 分块加密（默认 190 字节/块）
- `Md5Utils`：MD5 hash / hashWithSalt / hmac / fileChecksum（含注释：不适合密码存储）
- `Argon2Utils`：Argon2id 密码哈希，memoryCost 64MB / timeCost 3 / parallelism 4（可配置）

## 观点与作品

- 最重要的设计是 **ContextService + LoggerService 松散集成**：两者互相独立，LoggerService 通过静态引用按需使用 ContextService，不强制 DI 耦合
- `contextLevels` 白名单模式是生产调试利器，可实现"只看某个 Service 的日志"
- DTO 继承链设计完整，但 `HasPrimaryFullTreeDto` 涵盖所有父类字段，使用时需明确各变体用途避免过度继承
- `AesUtils` 使用 `scrypt` 派生密钥但 salt 硬编码为字面量 `'salt'`，是一个安全弱点（相同密码总能派生相同密钥）
- `LoggerService.initWinston()` 存在 transportOptions 被 Object.assign 原地修改两次的 bug（详见 summary）

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 兄弟 package：[[cs-nest-redis|@cs/nest-redis]]、[[cs-nest-cloud|@cs/nest-cloud]]
- 待入库兄弟 package：`@cs/nest-typeorm` / `@cs/nest-mq` / `@cs/nest-config` / `@cs/nest-schedule` / `@cs/nest-files` / `@cs/nest-cas-client` / `@cs/nest-sms` / `@cs/nest-auth-client` / `@cs/nest-mail` / `@cs/sql-parser`

## 引用来源

- [[2026-04-27-cs-nest-common-v4.0.1-beta.2]]
