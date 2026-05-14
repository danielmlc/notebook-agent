# @cs/nest-schedule - 定时任务 (XXL-Job)

> **源码**：[`libs/nest-schedule`](../../../libs/nest-schedule) ｜ **对齐版本**：v1.0.3 ｜ **同步时间**：2026-05-06 ｜ **状态**：✅ 已对齐

## 目录

- [安装](#安装)
- [模块配置](#模块配置)
- [@JobHandler 装饰器](#jobhandler-装饰器)
- [JobContext 任务上下文](#jobcontext-任务上下文)
- [任务模式](#任务模式)
- [生命周期](#生命周期)

## 安装

```bash
pnpm add @cs/nest-schedule
```

## 模块配置

### ShareModule 中注册

```typescript
import { ScheduleModule } from '@cs/nest-schedule';

@Global()
@CSModule({
  imports: [
    ScheduleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('schedule'),
    }),
  ],
})
export class ShareModule {}
```

### config.yaml 配置

```yaml
schedule:
  adminAddresses:
    - 'http://xxl-job-admin:8080/xxl-job-admin'
  appName: 'my-service-executor'     # 执行器名称（XXL-Job Admin 中配置）
  port: 9999                         # 执行器端口
  accessToken: ''                    # 访问令牌
  logPath: './logs/xxl-job'          # 日志路径
  logRetentionDays: 30               # 日志保留天数
```

### 完整配置接口

```typescript
interface ScheduleModuleOptions {
  adminAddresses: string[];              // XXL-Job Admin 地址列表
  accessToken?: string;                  // 访问令牌
  appName: string;                       // 执行器名称（唯一标识）
  port?: number;                         // 执行器端口，默认 9999
  ip?: string;                           // 执行器IP（自动获取）
  address?: string;                      // 完整地址
  logPath?: string;                      // 默认 './logs/xxl-job'
  logRetentionDays?: number;             // 默认 30
  logCleanupIntervalHours?: number;      // 默认 24
  enableAutoRegistry?: boolean;          // 自动注册，默认 true
  heartbeatInterval?: number;            // 心跳间隔，默认 30000ms
  enableMetrics?: boolean;               // 启用指标，默认 true
}
```

## @JobHandler 装饰器

标记一个方法为任务处理器：

```typescript
import { JobHandler } from '@cs/nest-schedule';

@Injectable()
export class TaskService {
  @JobHandler('jobName')   // jobName 必须与 XXL-Job Admin 中配置的一致
  async handleJob(context: JobContext) {
    // 任务逻辑
    return { success: true };
  }
}
```

**注意：** 任务服务必须在模块的 `providers` 中注册。

## JobContext 任务上下文

```typescript
interface JobContext {
  logger: JobLogger;            // 任务专用日志（写入 XXL-Job 日志文件）
  params?: string;              // 任务参数（JSON 字符串，在 Admin 中配置）
  shardIndex?: number;          // 分片索引（从 0 开始）
  shardTotal?: number;          // 分片总数
  jobId: number;                // 任务ID
  logId: number;                // 日志ID
  logDateTime: number;          // 日志时间戳
  executorTimeout: number;      // 执行超时时间（秒）
  isKilled(): boolean;          // 检查任务是否已被终止
}

interface JobLogger {
  log(message: string, ...args: any[]): void;
  error(message: string, trace?: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}
```

## 任务模式

### 简单任务

```typescript
@JobHandler('dailyCleanup')
async handleDailyCleanup(context: JobContext) {
  const { logger, jobId } = context;
  logger.log(`开始清理, jobId: ${jobId}`);

  const count = await this.cleanExpiredRecords();
  logger.log(`清理完成, 删除 ${count} 条记录`);

  return { success: true, deletedCount: count };
}
```

### 参数化任务

```typescript
@JobHandler('reportJob')
async handleReport(context: JobContext) {
  const { logger, params } = context;
  const config = params ? JSON.parse(params) : {};
  // params 在 XXL-Job Admin 中配置，如 {"type":"daily","email":"admin@test.com"}

  logger.log(`生成报表, 类型: ${config.type}`);
  const report = await this.generateReport(config.type);
  await this.sendReport(config.email, report);

  return { success: true };
}
```

### 分片任务（分布式并行处理）

```typescript
@JobHandler('batchProcess')
async handleBatchProcess(context: JobContext) {
  const { logger, shardIndex, shardTotal, isKilled } = context;
  logger.log(`分片 ${shardIndex}/${shardTotal}`);

  const allData = await this.fetchAllData();
  // 按分片索引分配数据
  const myData = allData.filter((_, i) => i % shardTotal === shardIndex);

  let processed = 0;
  for (const item of myData) {
    if (isKilled()) {
      logger.warn('任务被终止');
      break;
    }
    await this.processItem(item);
    processed++;
  }

  return { success: true, processed, total: myData.length };
}
```

### 长时间任务（支持终止检测）

```typescript
@JobHandler('longRunningJob')
async handleLongRunning(context: JobContext) {
  const { logger, isKilled } = context;

  for (let i = 0; i < 1000; i++) {
    if (isKilled()) {
      logger.warn(`任务在第 ${i} 步被终止`);
      return { success: false, stoppedAt: i };
    }
    await this.processStep(i);
    if (i % 100 === 0) {
      logger.log(`进度: ${i}/1000`);
    }
  }

  return { success: true };
}
```

## 生命周期

模块启动时自动：
1. 启动 HTTP 服务器（接收 Admin 调度请求）
2. 注册到 XXL-Job Admin
3. 启动心跳
4. 启动日志清理定时器

模块销毁时自动：
1. 停止心跳
2. 注销执行器
3. 停止日志清理
4. 停止 HTTP 服务器
