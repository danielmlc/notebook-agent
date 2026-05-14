---
title: "@cs/nest-sms"
type: entity
aliases: ["@cs/nest-sms", "nest-sms", "NestJS 短信包"]
tags: [nestjs, mwp, package, tool, sms, aliyun, tencent]
status: draft
confidence: high
version: "1.0.4"
sources:
  - "[[2026-05-14-cs-nest-sms-v1.0.4]]"
related:
  - "[[mwp-packages-project]]"
  - "[[cs-nest-common]]"
  - "[[cs-nest-config]]"
created: 2026-05-14
updated: 2026-05-14
last_reviewed: 2026-05-14
---

# @cs/nest-sms

## 基本信息

- 类别：工具 / NestJS Package
- 语言：TypeScript
- 归属：[[mwp-packages-project]]
- 当前版本：1.0.4
- License：ISC
- 作者：danielmlc
- 定位：短信服务 — 多云适配（阿里云/腾讯云）
- 核心依赖：@alicloud/dysmsapi20170525 ^2.0.24, tencentcloud-sdk-nodejs ^4.1.47
- 强制 peerDependencies：@cs/nest-common, @cs/nest-config

## 关键事件 / 里程碑

- 2026-05-14 · 首次入库（基于 v1.0.4 源码快照）

## 核心模块

### providers/ — 云厂商实现

- **AliyunSmsProvider** — 阿里云短信 SDK 封装
- **TencentSmsProvider** — 腾讯云短信 SDK 封装

### SmsService — 统一服务

- `sendSms(dto)` — 单条短信发送
- `sendBatchSms(dto)` — 批量短信发送

### SmsModuleOptions — 配置接口

```typescript
enum SmsProviderType {
  aliyun = 'aliyun',
  tencent = 'tencent',
}

interface AliyunSmsConfig {
  provider: SmsProviderType.aliyun;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
}

interface TencentSmsConfig {
  provider: SmsProviderType.tencent;
  secretId: string;
  secretKey: string;
  sdkAppId: string;
  region?: string;
}
```

### SendSmsDto / SmsResponse — 消息接口

```typescript
interface SendSmsDto {
  phoneNumbers: string;        // 手机号
  signName: string;            // 签名
  templateCode: string;        // 模板编码
  templateParam: string | object; // 模板参数
}

interface SmsResponse {
  code: string;       // 'OK' 表示成功
  message: string;
  requestId?: string;
}
```

## 设计亮点

1. **多云适配**：阿里云/腾讯云一键切换
2. **统一接口**：SmsProvider 抽象，业务代码无感知
3. **批量发送**：支持批量短信发送

## 关联主题

- 归属项目：[[mwp-packages-project]]
- 依赖 package：[[cs-nest-common]]、[[cs-nest-config]]

## 引用来源

- [[2026-05-14-cs-nest-sms-v1.0.4]]