---
title: "@cs/nest-common · 摘要 v4.0.1-beta.2"
type: summary
aliases: ["@cs/nest-common 摘要", "nest-common 摘要"]
tags: [nestjs, mwp, code-docs, context, logger, http, dto, crypto]
status: draft
confidence: high
version: "4.0.1-beta.2"
sources:
  - "[[2026-04-27-cs-nest-common-v4.0.1-beta.2]]"
related:
  - "[[cs-nest-common]]"
  - "[[mwp-packages-project]]"
created: 2026-04-27
updated: 2026-04-27
---

# @cs/nest-common · 摘要 v4.0.1-beta.2

## 一句话

@cs/nest-common 是 MWP Packages Project 的 NestJS 通用工具库（v4.0.1-beta.2），提供请求上下文传播、结构化日志、HTTP 客户端封装、DTO 基类体系与加密工具集。

## TL;DR

- 版本 4.0.1-beta.2，归属 [[mwp-packages-project|MWP Packages Project]] monorepo
- 核心能力分 6 个子模块：`context` / `logger` / `http` / `dto` / `utils` / `constants`
- **ContextService**（AsyncLocalStorage）：请求上下文存取，支持跨服务 base64 头编解码和 Istio/Envoy traceparent 透传
- **LoggerService**：Winston 包装，实现 `NestLoggerService`，支持按 context 白名单控制日志级别
- **HttpService**：Axios 包装，`forRegister` / `forRegisterAsync` 动态模块 + 双层拦截器
- **DTO 体系**：`BaseDto` → `HasEnableDto` / `TreeDto` → `HasPrimaryDto` 继承链 + 分页/查询条件/响应体
- **CryptoUtils**：`AesUtils` / `RsaUtils` / `Md5Utils` / `Argon2Utils` 四套工具类

## 核心论点

1. **ContextService 与 LoggerService 松散集成**：LoggerService 通过静态 `setContextService()` 引用 ContextService，requestId / traceId 自动注入日志——既能 DI 注入，也能在请求上下文外安静降级（不报错）
2. **LoggerService 双构造路径**：支持 `new LoggerService(context)` 直接实例化 + DI 注入两种用法；全局选项通过 `static globalOptions` 跨实例共享，由 `LoggerModule.forRoot` 初始化
3. **日志白名单模式**：`defaultContextLevel: 'none'` + `contextLevels: { 'OrderService': 'debug' }` → 只有白名单内的 context 才输出日志，适合生产调试定向只看某个 Service
4. **NestJS Dynamic Module 复用模式**：ContextModule / LoggerModule / HttpModule 均遵循 `forRoot` / `forRootAsync` 成对出现的约定，与 [[cs-nest-redis|@cs/nest-redis]] 保持一致
5. **traceId 优先级链**：B3 `x-b3-traceid` > W3C `traceparent` 第 2 段 > `x-request-id`，兼容 Istio/Envoy 多种链路追踪方案

## 关键设计模式

> 按"中粒度"方针：记录于此，暂不独立建 concept 页。若后续多份同类文档复现同一模式，再抽离。

- **AsyncLocalStorage 请求作用域**：`runWithContext(ctx, fn)` 绑定 `Map<string, any>` store，无需在调用链手动传参
- **跨服务上下文编解码**：`encodeContext()` → base64 JSON → `X-User-Context` 头，`decodeContext()` 还原 `UserContext`
- **Symbol-based Provider Token**：`CONTEXT_MODULE_OPTIONS` / `LOGGER_MODULE_OPTIONS` / `HTTP_MODULE_OPTIONS` 均用 `Symbol()` 防命名冲突（与 @cs/nest-redis 同模式，复现 2 次）
- **DTO 树形扩展**：`TreeDto.fullId` / `fullName` / `level` / `isLeaf` 支持后端直接输出平铺树形结构

## 潜在问题

> [!warning] logger.service.ts · transportOptions 对象被 Object.assign 原地修改两次
> `initWinston()` 中 `const transportOptions = {...}` 创建后，先后被 `Object.assign(transportOptions, { filename: appLogName })` 和 `Object.assign(transportOptions, { filename: errorLogName, level: 'error' })` 原地修改。两个 transport 共享同一引用，第二次 Object.assign 会把 `errorLogName` 和 `level: 'error'` 写回 transportOptions，导致 webTransport 也拿到了 error 配置。建议改为每次 `Object.assign({}, transportOptions, {...})` 浅拷贝。

## 我的加工意图

这份资料新建了以下页面：

- [[cs-nest-common]]（entity · tool · draft）

追加到已有页面：

- [[mwp-packages-project]]：@cs/nest-common 移入"已入库"列表，追加 source 引用

尚未抽离为独立 concept 的候选（等待后续同类文档复现再定夺）：

- `nestjs-dynamic-module`（与 @cs/nest-redis 共享，复现 2 次，接近抽离阈值）
- `async-local-storage-context`
- `context-aware-logger`
- `dto-inheritance-chain`

## 原文链接

- 本地快照：[[2026-04-27-cs-nest-common-v4.0.1-beta.2]]
- 来源路径：`C:/work/project/mwp-packages-project/apps/code-docs/output/nest-common.md`（推断）
- 快照时间：2026-04-27
- 作者：danielmlc
- 版本：4.0.1-beta.2

## 观察 / TODO

- [ ] `logger.service.ts` `initWinston()` 中 transportOptions 被 Object.assign 原地修改两次 → webTransport 日志可能被 error 配置污染，建议人工核查
- [ ] `ContextModule.forRoot` 的 `enableCaching` / `cacheTTL` 选项在 service 层未见实现 → 可能是预留 API，待确认
- [ ] `@cs/nest-config` 尚未入库，待该包文档摄入后补充 LoggerModule / HttpModule 的配置中心集成 wikilink
- [ ] `nestjs-dynamic-module` 模式已在 nest-redis 和 nest-common 中复现 2 次，下次再出现时应抽离为独立 concept 页
