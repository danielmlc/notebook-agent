# @cs/nest-mail - 邮件

> **源码**：[`libs/nest-mail`](../../../libs/nest-mail) ｜ **对齐版本**：v1.0.2 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 安装与注册

```bash
pnpm add @cs/nest-mail
```

```typescript
import { MailModule } from '@cs/nest-mail';

// ShareModule 中注册
// 异步方式（推荐）
MailModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    host: config.get('mail.host'),
    port: config.get('mail.port'),
    secure: config.get('mail.secure'),
    auth: {
      user: config.get('mail.user'),
      pass: config.get('mail.pass'),
    },
    sender: config.get('mail.sender'),
  }),
}, true)  // 第二参数 isGlobal，默认 false

// 同步方式
MailModule.forRoot(options, isGlobal = false)
```

## config.yaml

```yaml
mail:
  host: 'smtp.example.com'
  port: 587
  secure: false                 # 端口465用true，587/25用false
  user: 'noreply@example.com'
  pass: 'app-password'
  sender: '系统通知'
```

## 配置接口

```typescript
interface MailModuleOptions {
  host?: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  sender: string;               // 发件人显示名称
}
```

## 发送邮件

```typescript
import { MailService } from '@cs/nest-mail';

@Injectable()
export class NotifyService {
  constructor(private readonly mailService: MailService) {}

  async sendNotification(to: string, subject: string, content: string) {
    return await this.mailService.sendMail({
      to,                        // 收件人
      subject,                   // 主题
      html: content,             // HTML 正文
      text: 'plain text',       // 纯文本正文（可选）
      cc: 'admin@example.com',  // 抄送（可选）
    });
  }
}
```
