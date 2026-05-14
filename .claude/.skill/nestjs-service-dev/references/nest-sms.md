# @cs/nest-sms - 短信

> **源码**：[`libs/nest-sms`](../../../libs/nest-sms) ｜ **对齐版本**：v1.0.3 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装与注册](#安装与注册)
- [config.yaml](#configyaml)
- [配置接口](#配置接口)
- [SmsService API](#smsservice-api)

## 安装与注册

```bash
pnpm add @cs/nest-sms
```

```typescript
import { SmsModule } from '@cs/nest-sms';

// ShareModule 中注册（异步方式）
SmsModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => config.get('sms'),
}, true)  // 第二参数 isGlobal，默认 false

// 同步方式
SmsModule.forRoot(options, isGlobal = false)
```

支持阿里云 SMS (`'aliyun'`) 和腾讯云 SMS (`'tencent'`) 两种提供商。

## config.yaml

```yaml
# 阿里云
sms:
  provider: 'aliyun'
  accessKeyId: 'your-access-key-id'
  accessKeySecret: 'your-access-key-secret'
  endpoint: 'dysmsapi.aliyuncs.com'  # 可选

# 腾讯云
sms:
  provider: 'tencent'
  secretId: 'your-secret-id'
  secretKey: 'your-secret-key'
  region: 'ap-guangzhou'             # 可选
  sdkAppId: 'your-sdk-app-id'
  endpoint: 'sms.tencentcloudapi.com' # 可选
```

## 配置接口

```typescript
enum SmsProviderType {
  aliyun = 'aliyun',
  tencent = 'tencent',
}

// 阿里云配置
interface AliyunSmsConfig {
  provider: 'aliyun';
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
}

// 腾讯云配置
interface TencentSmsConfig {
  provider: 'tencent';
  secretId: string;
  secretKey: string;
  region?: string;
  sdkAppId: string;
  endpoint?: string;
}
```

## SmsService API

```typescript
import { SmsService } from '@cs/nest-sms';

@Injectable()
export class NotifyService {
  constructor(private readonly smsService: SmsService) {}

  async sendVerifyCode(phone: string, code: string) {
    return await this.smsService.sendSms({
      phoneNumbers: phone,             // 接收号码（+86前缀）
      signName: '签名名称',            // 短信签名
      templateCode: 'SMS_123456789',  // 模板 Code
      templateParam: JSON.stringify({ code }),  // 模板变量（JSON字符串或对象）
    });
  }

  async sendBatch(phones: string[], params: object[]) {
    return await this.smsService.sendBatchSms({
      phoneNumberJson: phones,         // 接收号码数组
      signNameJson: '签名名称',        // 短信签名
      templateCode: 'SMS_123456789',  // 模板 Code
      templateParamJson: params,       // 各号码的模板变量（与号码一一对应）
    });
  }
}
```

### 接口定义

```typescript
interface SendSmsDto {
  phoneNumbers: string;        // 接收号码
  signName: string;            // 短信签名名称
  templateCode: string;        // 短信模板 Code
  templateParam: string | object;  // 模板变量（JSON字符串或对象）
}

interface SendBatchSmsDto {
  phoneNumberJson: string[];   // 接收号码数组
  signNameJson: string;        // 签名名称
  templateCode: string;        // 模板 Code
  templateParamJson: object[]; // 各号码对应的模板变量（与号码数组等长）
}

interface SmsResponse {
  code: string;        // 'OK' 表示成功，其他值为错误码
  message: string;     // 返回消息
  requestId?: string;  // 云服务商请求 ID
  data?: any;          // 原始 SDK 响应
}
```
