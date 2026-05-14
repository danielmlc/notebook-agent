# @cs/nest-redis - Redis 缓存

> **源码**：[`libs/nest-redis`](../../../libs/nest-redis) ｜ **对齐版本**：v2.0.0 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装](#安装)
- [模块配置](#模块配置)
- [RedisService 使用](#redisservice-使用)

## 安装

```bash
pnpm add @cs/nest-redis
```

## 模块配置

### ShareModule 中注册

```typescript
import { RedisModule } from '@cs/nest-redis';

@Global()
@CSModule({
  imports: [
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...config.get('redis'),
      }),
    }),
  ],
  exports: [RedisModule],
})
export class ShareModule {}
```

### config.yaml 配置

```yaml
# 单客户端（URL方式）
redis:
  name: 'default'
  url: 'redis://localhost:6379'

# 单客户端（详细配置）
redis:
  name: 'default'
  host: 'localhost'
  port: 6379
  password: 'your-password'
  db: 0

# 集群模式
redis:
  name: 'default'
  cluster: true
  nodes:
    - host: 'node1'
      port: 6379
    - host: 'node2'
      port: 6379
    - host: 'node3'
      port: 6379
```

### 配置接口

```typescript
interface RedisModuleOptions extends RedisOptions {
  name?: string;                         // 客户端标识名，默认 'default'
  url?: string;                          // Redis URL
  cluster?: boolean;                     // 是否集群模式
  nodes?: ClusterNode[];                 // 集群节点
  clusterOptions?: ClusterOptions;       // 集群选项
  onClientReady?(client: Redis): void;   // 客户端就绪回调
}
```

### 多客户端

```typescript
// 注册多个客户端
RedisModule.forRoot([
  { name: 'cache', url: 'redis://localhost:6379/0' },
  { name: 'session', url: 'redis://localhost:6379/1' },
])
```

## RedisService 使用

```typescript
import { RedisService } from '@cs/nest-redis';

@Injectable()
export class CacheService {
  constructor(private readonly redisService: RedisService) {}

  private get redis() {
    return this.redisService.getRedis('default');  // 获取 ioredis 实例
  }

  // 字符串操作
  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async del(key: string) {
    return await this.redis.del(key);
  }

  // Hash 操作
  async hset(key: string, field: string, value: string) {
    await this.redis.hset(key, field, value);
  }

  async hget(key: string, field: string) {
    return await this.redis.hget(key, field);
  }

  async hgetall(key: string) {
    return await this.redis.hgetall(key);
  }

  // List 操作
  async lpush(key: string, ...values: string[]) {
    return await this.redis.lpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number) {
    return await this.redis.lrange(key, start, stop);
  }

  // Set 操作
  async sadd(key: string, ...members: string[]) {
    return await this.redis.sadd(key, ...members);
  }

  async smembers(key: string) {
    return await this.redis.smembers(key);
  }

  // 过期时间
  async expire(key: string, seconds: number) {
    return await this.redis.expire(key, seconds);
  }

  async ttl(key: string) {
    return await this.redis.ttl(key);
  }

  // 批量操作 (Pipeline)
  async batchSet(entries: Record<string, string>, ttl?: number) {
    const pipeline = this.redis.pipeline();
    for (const [key, value] of Object.entries(entries)) {
      if (ttl) {
        pipeline.set(key, value, 'EX', ttl);
      } else {
        pipeline.set(key, value);
      }
    }
    return await pipeline.exec();
  }
}
```

> `getRedis()` 返回的是标准 ioredis 实例，支持 ioredis 的所有命令。
