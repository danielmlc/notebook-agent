---
title: "@cs/nest-sms · 源码整理 v1.0.4"
type: source
aliases: ["@cs/nest-sms 源码", "nest-sms 源码"]
tags: [nestjs, mwp, code-docs, sms]
status: stable
version: "1.0.4"
created: 2026-05-14
updated: 2026-05-14
source_type: paper
source_url: "file:///C:/work/project/mwp-packages-project/apps/code-docs/output/nest-sms.md"
source_author: danielmlc
source_date: 2026-05-14
---

# @cs/nest-sms · 源码整理

## 元信息

- 类型：工作类代码文档（@cs 平台包）
- 归属项目：MWP Packages Project
- 版本：1.0.4
- 作者：danielmlc
- 摄入日期：2026-05-14
- 摄入方式：文件路径模式

## 正文 / 摘录

> 此处存放原始资料正文。**只追加、不修改。**

### @cs/nest-sms代码库源码整理

#### 代码目录
```
@cs/nest-sms/
├── src/
├── providers/
│   ├── aliyun-sms.provider.ts
│   └── tencent-sms.provider.ts
├── index.ts
├── sms.constants.ts
├── sms.interface.ts
├── sms.module.ts
└── sms.service.ts
└── package.json
```

#### 代码文件

> 代码路径  `package.json`

```json
{
  "name": "@cs/nest-sms",
  "version": "1.0.4",
  "description": "NestJS module for SMS sending, supporting multiple providers like Aliyun.",
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
    "publish:beta": "pnpm run pre-publish:beta && pnpm publish --no-git-checks --tag beta",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  },
  "dependencies": {
    "@alicloud/dysmsapi20170525": "^2.0.24",
    "@alicloud/openapi-client": "^0.4.8",
    "tencentcloud-sdk-nodejs": "^4.1.47"
  },
  "peerDependencies": {
    "@cs/nest-common": "workspace:^",
    "@cs/nest-config": "workspace:^"
  },
  "peerDependenciesMeta": {
    "@cs/nest-common": {
      "optional": false
    },
    "@cs/nest-config": {
      "optional": false
    }
  },
  "devDependencies": {
    "@nestjs/testing": "^11.1.12",
    "@types/jest": "^30.0.0",
    "jest": "^30.2.0",
    "ts-jest": "^29.4.6"
  }
}
```


> 代码路径  `src\index.ts`

```typescript
export * from './sms.module';
export * from './sms.service';
export * from './sms.interface';

```


> 代码路径  `src\sms.constants.ts`

```typescript
export const SMS_MODULE_OPTIONS = Symbol('SMS_MODULE_OPTIONS');

```


> 代码路径  `src\sms.interface.ts`

```typescript
import { ModuleMetadata } from '@nestjs/common';

export interface SendSmsDto {
  phoneNumbers: string;
  signName: string;
  templateCode: string;
  templateParam: string | object;
}

export interface SendBatchSmsDto {
  phoneNumberJson: string[];
  signNameJson: string;
  templateCode: string;
  templateParamJson: object[];
}

export interface SmsResponse {
  code: string;        // 'OK' 表示成功，其他值为错误码
  message: string;     // 返回消息
  requestId?: string;  // 云服务商请求 ID
  data?: any;          // 原始 SDK 响应
}

export interface SmsProvider {
  sendSms(sendSmsDto: SendSmsDto): Promise<SmsResponse>; // 单条发送
  sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<SmsResponse>; // 批量发送
}

export interface BaseSmsConfig {
  provider: SmsProviderType; // 公共配置参数
}

export enum SmsProviderType {
  aliyun = 'aliyun',
  tencent = 'tencent',
}

export interface AliyunSmsConfig extends BaseSmsConfig {
  provider: SmsProviderType.aliyun;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
}

export interface TencentSmsConfig extends BaseSmsConfig {
  provider: SmsProviderType.tencent;
  secretId: string;
  secretKey: string;
  region?: string;
  sdkAppId: string;
  endpoint?: string;
}

export type SmsModuleOptions = AliyunSmsConfig | TencentSmsConfig;

export interface SmsModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory?: (...args: any[]) => SmsModuleOptions | Promise<SmsModuleOptions>;
  inject?: any[];
}

```


> 代码路径  `src\sms.module.ts`

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { SMS_MODULE_OPTIONS } from './sms.constants';
import { SmsModuleOptions, SmsModuleAsyncOptions } from './sms.interface';
import { SmsService } from './sms.service';
@Module({})
export class SmsModule {
  static forRoot(options: SmsModuleOptions, isGlobal = false): DynamicModule {
    return {
      global: isGlobal,
      module: SmsModule,
      providers: [
        {
          provide: SMS_MODULE_OPTIONS,
          useValue: options,
        },
        SmsService,
      ],
      exports: [SmsService, SMS_MODULE_OPTIONS],
    };
  }

  static forRootAsync(
    options: SmsModuleAsyncOptions,
    isGlobal = false,
  ): DynamicModule {
    return {
      global: isGlobal,
      module: SmsModule,
      imports: options.imports || [],
      providers: [
        {
          provide: SMS_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
        SmsService,
      ],
      exports: [SmsService, SMS_MODULE_OPTIONS],
    };
  }
}

```


> 代码路径  `src\sms.service.ts`

```typescript
import { Injectable, Optional, Inject } from '@nestjs/common';
import { SMS_MODULE_OPTIONS } from './sms.constants';
import {
  SmsModuleOptions,
  SmsProvider,
  SmsResponse,
  SendSmsDto,
  SendBatchSmsDto,
  SmsProviderType,
} from './sms.interface';
import { AliyunSmsProvider } from './providers/aliyun-sms.provider';
import { TencentSmsProvider } from './providers/tencent-sms.provider';
@Injectable()
export class SmsService {
  private smsClient: SmsProvider;
  constructor(
    @Optional()
    @Inject(SMS_MODULE_OPTIONS)
    protected options: SmsModuleOptions,
  ) {
    // 初始化实例
    this.smsClient = this.createSmsProvider(this.options);
  }

  async sendSms(sendSmsDto: SendSmsDto): Promise<SmsResponse> {
    return this.smsClient.sendSms(sendSmsDto);
  }

  async sendBatchSms(sendBatchSmsDto: SendBatchSmsDto): Promise<SmsResponse> {
    return this.smsClient.sendBatchSms(sendBatchSmsDto);
  }

  private createSmsProvider(options: SmsModuleOptions): SmsProvider {
    const { provider } = options;
    switch (provider) {
      case SmsProviderType.aliyun:
        return new AliyunSmsProvider(options);
      case SmsProviderType.tencent:
        return new TencentSmsProvider(options);
      default:
        // 这里抛出错误，provider 确实是一个 string
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }
  }
}

```


> 代码路径  `src\providers\aliyun-sms.provider.ts`

```typescript
import {
  SmsProvider,
  SmsResponse,
  AliyunSmsConfig,
  SendSmsDto,
  SendBatchSmsDto,
} from '../sms.interface';
import Dysmsapi, * as $Dysmsapi from '@alicloud/dysmsapi20170525';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';

export class AliyunSmsProvider implements SmsProvider {
  private smsClient: Dysmsapi;

  constructor(private options: AliyunSmsConfig) {
    this.createClient();
  }

  private createClient () {
    const config = new $OpenApi.Config({
      accessKeyId: this.options.accessKeyId,
      accessKeySecret: this.options.accessKeySecret,
      endpoint: this.options.endpoint,
    });
    this.smsClient = new Dysmsapi(config);
  }

  async sendSms (sendSmsDto: SendSmsDto): Promise<SmsResponse> {
    sendSmsDto.templateParam = JSON.stringify(sendSmsDto.templateParam);
    const params = new $Dysmsapi.SendSmsRequest(sendSmsDto);
    const sendResp = await this.smsClient.sendSms(params);
    const body = sendResp.body;
    return {
      code: (body.code || 'OK').toUpperCase(),
      message: body.message || 'send success',
      requestId: body.requestId,
      data: body,
    };
  }

  async sendBatchSms (sendBatchSmsDto: SendBatchSmsDto): Promise<SmsResponse> {
    // 验证必要参数
    if (!sendBatchSmsDto.phoneNumberJson?.length) {
      throw new Error('电话号码列表不能为空');
    }

    if (!sendBatchSmsDto.signNameJson) {
      throw new Error('签名不能为空');
    }

    // 获取电话号码数量
    const phoneCount = sendBatchSmsDto.phoneNumberJson.length;

    // 构建签名数组 - 为每个电话号码复制相同的签名
    const signNameJson = new Array(phoneCount).fill(
      sendBatchSmsDto.signNameJson,
    );

    // 构建请求参数对象
    const batchSmsDto = {
      templateCode: sendBatchSmsDto.templateCode, // templateCode保持原样
      phoneNumberJson: JSON.stringify(sendBatchSmsDto.phoneNumberJson),
      signNameJson: JSON.stringify(signNameJson),
      // 处理其他可能的参数
      ...(sendBatchSmsDto.templateParamJson && {
        templateParamJson: JSON.stringify(sendBatchSmsDto.templateParamJson),
      }),
    };
    // 创建请求对象并发送
    const params = new $Dysmsapi.SendBatchSmsRequest(batchSmsDto);
    const sendResp = await this.smsClient.sendBatchSms(params);
    const body = sendResp.body;
    return {
      code: (body.code || 'OK').toUpperCase(),
      message: body.message || 'send success',
      requestId: body.requestId,
      data: body,
    };
  }
}

```


> 代码路径  `src\providers\tencent-sms.provider.ts`

```typescript
import {
  SmsProvider,
  SmsResponse,
  TencentSmsConfig,
  SendSmsDto,
  SendBatchSmsDto,
} from '../sms.interface';
import * as tencentcloud from 'tencentcloud-sdk-nodejs';

// 腾讯云短信服务实现
export class TencentSmsProvider implements SmsProvider {
  private smsClient: any;

  constructor(private options: TencentSmsConfig) {
    this.createClient();
  }

  private createClient () {
    const SmsClient = tencentcloud.sms.v20210111.Client;

    const clientConfig = {
      credential: {
        secretId: this.options.secretId,
        secretKey: this.options.secretKey,
      },
      region: this.options.region || 'ap-beijing',
      profile: {
        httpProfile: {
          endpoint: this.options.endpoint || 'sms.tencentcloudapi.com',
        },
      },
    };
    this.smsClient = new SmsClient(clientConfig);
  }

  async sendSms (sendSmsDto: SendSmsDto): Promise<SmsResponse> {
    try {
      // 处理模板参数
      let templateParamSet: string[] = [];
      if (sendSmsDto.templateParam) {
        if (typeof sendSmsDto.templateParam === 'string') {
          try {
            const parsed = JSON.parse(sendSmsDto.templateParam);
            templateParamSet = Object.values(parsed).map(String);
          } catch {
            templateParamSet = [sendSmsDto.templateParam];
          }
        } else if (typeof sendSmsDto.templateParam === 'object') {
          templateParamSet = Object.values(sendSmsDto.templateParam).map(
            String,
          );
        }
      }

      const params = {
        PhoneNumberSet: [sendSmsDto.phoneNumbers],
        SmsSdkAppId: String(this.options.sdkAppId),
        SignName: sendSmsDto.signName,
        TemplateId: sendSmsDto.templateCode,
        TemplateParamSet: templateParamSet,
      };

      const response = await this.smsClient.SendSms(params);
      // 适配返回格式，统一为 { code, message, requestId, data }
      const firstStatus = response.SendStatusSet?.[0];
      return {
        code: firstStatus?.Code?.toUpperCase() || 'OK',
        message: firstStatus?.Message || 'send success',
        requestId: response.RequestId,
        data: response,
      };
    } catch (error) {
      console.error('Tencent SMS sendSms error:', error);
      throw error;
    }
  }

  async sendBatchSms (sendBatchSmsDto: SendBatchSmsDto): Promise<SmsResponse> {
    try {
      // 腾讯云批量发送时，所有手机号使用相同的模板参数
      // TemplateParamSet 格式为 string[]，而不是 string[][]
      const firstParam = (sendBatchSmsDto.templateParamJson[0] || {}) as Record<string, any>;
      const templateParamSet: string[] = Object.values(firstParam).map((v) => String(v));

      const params = {
        PhoneNumberSet: sendBatchSmsDto.phoneNumberJson,
        SmsSdkAppId: String(this.options.sdkAppId),
        SignName: sendBatchSmsDto.signNameJson, // 腾讯云批量发送使用统一签名
        TemplateId: sendBatchSmsDto.templateCode,
        TemplateParamSet: templateParamSet,
      };

      const response = await this.smsClient.SendSms(params);
      // 适配返回格式，统一为 { code, message, requestId, data }
      // 批量发送时，检查是否有失败的
      const statusSet = response.SendStatusSet || [];
      const hasFailure = statusSet.some((status: any) => status.Code !== 'Ok');
      const firstStatus = statusSet[0];

      return {
        code: hasFailure ? 'FAILED' : 'OK',
        message: hasFailure
          ? '部分短信发送失败'
          : firstStatus?.Message || 'send success',
        requestId: response.RequestId,
        data: response,
      };
    } catch (error) {
      console.error('Tencent SMS sendBatchSms error:', error);
      throw error;
    }
  }
}

```


#### 代码说明

# @cs/nest-sms

> NestJS 短信服务模块，支持阿里云和腾讯云短信服务商

[![npm version](https://img.shields.io/npm/v/@cs/nest-sms)](https://www.npmjs.com/package/@cs/nest-sms)
[![License](https://img.shields.io/npm/l/@cs/nest-sms)](LICENSE)

## 📖 简介

`@cs/nest-sms` 是一个专为 NestJS 设计的短信服务模块，提供了统一的短信发送接口，支持多家主流云服务商的短信网关。采用策略模式设计，便于扩展其他短信服务商。


## 📦 安装

```bash
# 使用 npm
npm install @cs/nest-sms

# 使用 yarn
yarn add @cs/nest-sms

# 使用 pnpm
pnpm add @cs/nest-sms
```

## 🚀 快速开始

### 1. 配置模块

#### 使用阿里云短信

```typescript
import { Module } from '@nestjs/common';
import { SmsModule, SmsProviderType } from '@cs/nest-sms';

@Module({
  imports: [
    SmsModule.forRoot({
      provider: SmsProviderType.aliyun,
      accessKeyId: 'your-access-key-id',
      accessKeySecret: 'your-access-key-secret',
      // endpoint: 'dysmsapi.aliyuncs.com', // 可选
    }, true), // 设置为全局模块
  ],
})
export class AppModule {}
```

#### 使用腾讯云短信

```typescript
import { Module } from '@nestjs/common';
import { SmsModule, SmsProviderType } from '@cs/nest-sms';

@Module({
  imports: [
    SmsModule.forRoot({
      provider: SmsProviderType.tencent,
      secretId: 'your-secret-id',
      secretKey: 'your-secret-key',
      sdkAppId: 'your-sdk-app-id',
      region: 'ap-beijing', // 可选，默认 ap-beijing
      // endpoint: 'sms.tencentcloudapi.com', // 可选
    }, true),
  ],
})
export class AppModule {}
```

#### 异步配置（推荐）

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmsModule, SmsProviderType } from '@cs/nest-sms';

@Module({
  imports: [
    ConfigModule,
    SmsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        provider: config.get('SMS_PROVIDER') as SmsProviderType,
        accessKeyId: config.get('ALIYUN_ACCESS_KEY_ID'),
        accessKeySecret: config.get('ALIYUN_ACCESS_KEY_SECRET'),
        // 或者腾讯云配置
        // secretId: config.get('TENCENT_SECRET_ID'),
        // secretKey: config.get('TENCENT_SECRET_KEY'),
        // sdkAppId: config.get('TENCENT_SDK_APP_ID'),
      }),
    }, true),
  ],
})
export class AppModule {}
```

### 2. 使用服务

```typescript
import { Injectable } from '@nestjs/common';
import { SmsService } from '@cs/nest-sms';

@Injectable()
export class UserService {
  constructor(private readonly smsService: SmsService) {}

  async sendVerificationCode(phone: string, code: string) {
    await this.smsService.sendSms({
      phoneNumbers: phone,
      signName: '你的签名',
      templateCode: 'SMS_123456789',
      templateParam: { code },
    });
  }
}
```

## 📝 配置说明

### 阿里云配置 (AliyunSmsConfig)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | `SmsProviderType.aliyun` | 是 | 固定值为 `SmsProviderType.aliyun` |
| `accessKeyId` | `string` | 是 | 阿里云 AccessKey ID |
| `accessKeySecret` | `string` | 是 | 阿里云 AccessKey Secret |
| `endpoint` | `string` | 否 | 自定义端点，默认为阿里云官方端点 |

### 腾讯云配置 (TencentSmsConfig)

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `provider` | `SmsProviderType.tencent` | 是 | 固定值为 `SmsProviderType.tencent` |
| `secretId` | `string` | 是 | 腾讯云 SecretId |
| `secretKey` | `string` | 是 | 腾讯云 SecretKey |
| `sdkAppId` | `string` | 是 | 短信应用 ID |
| `region` | `string` | 否 | 地域参数，默认 `ap-beijing` |
| `endpoint` | `string` | 否 | 自定义端点，默认为腾讯云官方端点 |

## 🔧 API 文档

### SmsService

短信服务核心类，提供统一的短信发送接口。

#### sendSms(sendSmsDto: SendSmsDto)

发送单条短信。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phoneNumbers` | `string` | 是 | 手机号码 |
| `signName` | `string` | 是 | 短信签名 |
| `templateCode` | `string` | 是 | 短信模板代码 |
| `templateParam` | `string \| object` | 是 | 模板参数，支持字符串或对象 |

**返回值：** `Promise<SmsResponse>` - 统一格式的响应对象，详见 [SmsResponse](#smsresponse)

**示例：**

```typescript
// 对象形式（推荐）
const result = await smsService.sendSms({
  phoneNumbers: '13800138000',
  signName: '你的签名',
  templateCode: 'SMS_123456789',
  templateParam: { code: '123456', name: '张三' }
});

if (result.code === 'OK') {
  console.log('发送成功', result.requestId);
} else {
  console.error('发送失败', result.code, result.message);
}

// 字符串形式
await smsService.sendSms({
  phoneNumbers: '13800138000',
  signName: '你的签名',
  templateCode: 'SMS_123456789',
  templateParam: JSON.stringify({ code: '123456' })
});
```

#### sendBatchSms(sendBatchSmsDto: SendBatchSmsDto)

批量发送短信。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phoneNumberJson` | `string[]` | 是 | 手机号码数组 |
| `signNameJson` | `string` | 是 | 短信签名 |
| `templateCode` | `string` | 是 | 短信模板代码 |
| `templateParamJson` | `object[]` | 是 | 模板参数数组，每个手机号对应一个参数对象 |

**返回值：** `Promise<SmsResponse>` - 统一格式的响应对象，详见 [SmsResponse](#smsresponse)

**示例：**

```typescript
const result = await smsService.sendBatchSms({
  phoneNumberJson: ['13800138000', '13900139000'],
  signNameJson: '你的签名',
  templateCode: 'SMS_123456789',
  templateParamJson: [
    { code: '123456', name: '张三' },
    { code: '789012', name: '李四' }
  ]
});

if (result.code === 'OK') {
  console.log('批量发送成功', result.requestId);
} else {
  console.error('批量发送失败', result.code, result.message);
}
```

#### SmsResponse

所有发送方法统一返回 `SmsResponse`，无论使用哪家服务商，返回格式保持一致。

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `string` | 状态码，`'OK'` 表示成功，其他值为错误码 |
| `message` | `string` | 返回消息描述 |
| `requestId` | `string?` | 云服务商请求 ID，可用于问题排查 |
| `data` | `any?` | 原始 SDK 响应，包含服务商的完整返回数据 |

## 💡 使用示例

### 示例 1：发送验证码

```typescript
import { Injectable } from '@nestjs/common';
import { SmsService } from '@cs/nest-sms';

@Injectable()
export class AuthService {
  constructor(private readonly smsService: SmsService) {}

  async sendLoginCode(phone: string): Promise<void> {
    const code = Math.random().toString().slice(2, 8);

    // 存储验证码到 Redis，设置 5 分钟过期
    // await this.redisService.set(`sms:code:${phone}`, code, 300);

    await this.smsService.sendSms({
      phoneNumbers: phone,
      signName: '登录验证',
      templateCode: 'SMS_LOGIN_TEMPLATE',
      templateParam: { code },
    });

    console.log(`验证码已发送至 ${phone}`);
  }
}
```

### 示例 2：批量发送通知

```typescript
import { Injectable } from '@nestjs/common';
import { SmsService } from '@cs/nest-sms';

@Injectable()
export class NotificationService {
  constructor(private readonly smsService: SmsService) {}

  async sendBatchNotification(phones: string[], message: string): Promise<void> {
    await this.smsService.sendBatchSms({
      phoneNumberJson: phones,
      signNameJson: '系统通知',
      templateCode: 'SMS_NOTIFICATION_TEMPLATE',
      templateParamJson: phones.map(() => ({ message })),
    });
  }
}
```

### 示例 3：订单通知

```typescript
import { Injectable } from '@nestjs/common';
import { SmsService } from '@cs/nest-sms';

@Injectable()
export class OrderService {
  constructor(private readonly smsService: SmsService) {}

  async sendOrderNotification(phone: string, orderId: string, amount: number): Promise<void> {
    await this.smsService.sendSms({
      phoneNumbers: phone,
      signName: '订单通知',
      templateCode: 'SMS_ORDER_TEMPLATE',
      templateParam: {
        orderId,
        amount: amount.toFixed(2),
      },
    });
  }
}
```

### 示例 4：环境变量配置

**.env 文件**

```env
# 短信服务商（aliyun 或 tencent）
SMS_PROVIDER=aliyun

# 阿里云配置
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret

# 腾讯云配置（如果使用腾讯云）
# TENCENT_SECRET_ID=your-secret-id
# TENCENT_SECRET_KEY=your-secret-key
# TENCENT_SDK_APP_ID=your-sdk-app-id
# TENCENT_REGION=ap-beijing
```

**app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsModule, SmsProviderType } from '@cs/nest-sms';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SmsModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<'aliyun' | 'tencent'>('SMS_PROVIDER');

        if (provider === 'tencent') {
          return {
            provider: SmsProviderType.tencent,
            secretId: config.get('TENCENT_SECRET_ID'),
            secretKey: config.get('TENCENT_SECRET_KEY'),
            sdkAppId: config.get('TENCENT_SDK_APP_ID'),
            region: config.get('TENCENT_REGION'),
          };
        }

        return {
          provider: SmsProviderType.aliyun,
          accessKeyId: config.get('ALIYUN_ACCESS_KEY_ID'),
          accessKeySecret: config.get('ALIYUN_ACCESS_KEY_SECRET'),
        };
      },
    }, true),
  ],
})
export class AppModule {}
```

## ⚠️ 注意事项

### 1. 服务商差异

两家服务商的 `sendSms` / `sendBatchSms` 均返回统一的 `SmsResponse` 格式，业务层无需感知底层服务商。

底层行为差异：

- **阿里云**：批量发送时支持为每个手机号指定不同的签名
- **腾讯云**：批量发送时使用统一签名；批量结果中任意一条失败时，`code` 返回 `'FAILED'`

### 2. 模板参数格式

- **阿里云**：`templateParam` 会自动转换为 JSON 字符串
- **腾讯云**：`templateParam` 的对象值会被提取并转换为字符串数组

### 3. 错误处理

建议在调用短信服务时添加错误处理：

```typescript
try {
  await this.smsService.sendSms({...});
} catch (error) {
  console.error('短信发送失败:', error.message);
  // 根据业务需求处理错误
}
```

### 4. 频率限制

- 请遵守各服务商的频率限制
- 批量发送时建议控制单次发送数量
- 避免短时间内对同一手机号重复发送

### 5. 签名和模板

- 短信签名和模板需要提前在服务商平台申请并审核通过
- 模板参数必须与模板定义的变量个数和类型匹配

## 🔗 相关链接

- [阿里云短信服务文档](https://help.aliyun.com/product/44282.html)
- [腾讯云短信服务文档](https://cloud.tencent.com/document/product/382)
- [NestJS 官方文档](https://docs.nestjs.com/)

## 📄 许可证

[ISC](LICENSE)

## 👤 作者

danielmlc <danielmlc@126.com>

