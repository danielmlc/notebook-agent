# @cs/nest-mq - 消息队列 (RocketMQ)

> **源码**：[`libs/nest-mq`](../../../libs/nest-mq) ｜ **对齐版本**：v1.0.3 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装](#安装)
- [模块配置](#模块配置)
- [生产者（发送消息）](#生产者发送消息)
- [消费者（接收消息）](#消费者接收消息)

## 安装

```bash
pnpm add @cs/nest-mq
```

## 模块配置

### ShareModule 中注册

```typescript
import { MqModule } from '@cs/nest-mq';

@Global()
@CSModule({
  imports: [
    MqModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('mq'),
    }),
  ],
  exports: [MqModule],
})
export class ShareModule {}
```

### config.yaml 配置

```yaml
# 形式1：对象形式（推荐，含公共配置 + producers 数组）
mq:
  isGlobal: true
  default:
    provider: 'openmq'                # 'openmq' (开源版) | 'tdmq' (腾讯云)
    endpoints: 'localhost:8081'
    accessKey: ''
    accessSecret: ''
    namespace: ''
  clients:
    producers:
      - name: 'order-producer'        # 生产者名称（用于 @ProducerMessage 引用）

# 形式2：扁平数组形式
mq:
  default:
    provider: 'openmq'
    endpoints: 'localhost:8081'
  clients:
    - name: 'order-producer'
      provider: 'openmq'
      endpoints: 'localhost:8081'
```

### 完整配置接口

```typescript
interface MqModuleOptions {
  isGlobal?: boolean;
  default?: CommonMqOptions;
  clients?: MqConfig;           // 支持多种配置形式
}

// clients 支持三种形式：
type MqConfig =
  | (CommonMqOptions & { producers?: ProducerOptions[] })  // 对象形式（含公共配置 + producers 数组）
  | ProducerOptions                                         // 单个生产者
  | ProducerOptions[];                                      // 生产者数组

interface CommonMqOptions {
  provider: 'openmq' | 'tdmq';
  name?: string;
  accessKey?: string;
  accessSecret?: string;
  endpoints?: string;
  namespace?: string;
  logConfig?: Partial<LoggerModuleOptions>;  // 日志配置
  enableTrace?: boolean;
}

interface ProducerOptions extends CommonMqOptions {
  maxAttempts?: number;       // 重试次数，默认 3
}
```

## 生产者（发送消息）

### 基本用法

```typescript
import { MqService, ProducerMessage } from '@cs/nest-mq';

@Injectable()
export class OrderProducer {
  constructor(private readonly mqService: MqService) {}

  @ProducerMessage({
    producerName: 'order-producer',      // 必须：关联配置中的生产者
    topic: 'ORDER_TOPIC',               // 可选：默认 topic
    tags: 'CREATE',                     // 可选：默认 tag
  })
  async sendOrderCreated(order: any) {
    return this.mqService.sendMsg(this.sendOrderCreated, {
      body: JSON.stringify(order),
      // 可覆盖装饰器中的 topic/tags
    });
  }
}
```

### @ProducerMessage 装饰器

```typescript
@ProducerMessage({
  producerName: string;         // 必须：生产者名称
  topic?: string;               // 默认 topic
  tags?: string;                // 默认 tag
  keys?: string | string[];     // 消息 key
  properties?: Record<string, string>;
  messageGroup?: string;        // 顺序消息分组
})
```

### MqService 方法

```typescript
// 通过装饰器配置发送（推荐）
await this.mqService.sendMsg(
  methodRef: Function,                                    // 被 @ProducerMessage 装饰的方法引用
  message: Partial<MqMessage> & { body: string | Buffer } // 消息体（可覆盖装饰器配置）
): Promise<SendResult>

// 直接发送（需要完整参数）
await this.mqService.send(
  message: MqMessage,
  options?: { producerName?: string; timeout?: number }
): Promise<SendResult>

// 获取生产者实例
this.mqService.getProducer(name?: string): IProducer
```

### 消息接口

```typescript
interface MqMessage {
  topic: string;
  tags?: string;
  keys?: string | string[];
  body: string | Buffer;
  properties?: Record<string, string>;
  messageGroup?: string;            // 顺序消息
  delaySeconds?: number;            // 延时消息（1秒 ~ 40天）
}

interface SendResult {
  sendStatus: string;
  messageId: string;
  offsetMessageId?: string;
  queueOffset?: number;
}
```

### 延时消息

```typescript
@ProducerMessage({ producerName: 'order-producer', topic: 'ORDER_TOPIC' })
async sendDelayedMessage(data: any) {
  return this.mqService.sendMsg(this.sendDelayedMessage, {
    body: JSON.stringify(data),
    delaySeconds: 60,               // 60秒后投递
  });
}
```

### 顺序消息

```typescript
@ProducerMessage({
  producerName: 'order-producer',
  topic: 'ORDER_TOPIC',
  messageGroup: 'order-group',     // 同一分组保证顺序
})
async sendOrderedMessage(data: any) {
  return this.mqService.sendMsg(this.sendOrderedMessage, {
    body: JSON.stringify(data),
  });
}
```

## 消费者（接收消息）

### 基本用法

```typescript
import { MessageHandler, ConsumeStatus } from '@cs/nest-mq';

@Injectable()
export class OrderConsumer {
  @MessageHandler({
    topic: 'ORDER_TOPIC',
    groupId: 'order-process-group',
    tags: 'CREATE',                  // 可选：过滤 tag
  })
  async onOrderCreated(payload: any, message: MqMessageExt) {
    const order = JSON.parse(payload);
    // 处理业务逻辑
    return ConsumeStatus.CONSUME_SUCCESS;
  }
}
```

### @MessageHandler 装饰器

```typescript
@MessageHandler({
  topic: string;                     // 必须：订阅的 topic
  groupId: string;                   // 必须：消费者组
  tags?: string;                     // 过滤表达式，如 'CREATE|UPDATE'
  awaitDuration?: number;            // 长轮询等待时间，默认 30000ms
  maxMessageNum?: number;            // 单次拉取最大消息数，默认 20
  invisibleDuration?: number;        // 消息不可见时间，默认 30000ms
})
```

### 消费状态

```typescript
enum ConsumeStatus {
  CONSUME_SUCCESS = 'CONSUME_SUCCESS',       // 消费成功
  RECONSUME_LATER = 'RECONSUME_LATER',       // 稍后重试
}
```

### 消费消息扩展字段

```typescript
interface MqMessageExt extends MqMessage {
  queueId?: number;
  reconsumeTimes?: number;           // 重试次数
  bornTimestamp?: number;            // 消息产生时间
  storeTimestamp?: number;           // 消息存储时间
}
```

### 消费者注册

消费者需要在模块的 `providers` 中注册：

```typescript
@Module({
  providers: [OrderConsumer],
})
export class OrderConsumerModule {}
```

> 消费者通常放在独立的消费者应用中，与生产者分离部署。
