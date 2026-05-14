import { Global } from '@nestjs/common';
import { CSModule } from '@cs/nest-cloud';
// import { ConfigService } from '@cs/nest-config';
// import { DatabaseModule } from '@cs/nest-typeorm';
// import { RedisModule } from '@cs/nest-redis';
// import { FileStorageModule } from '@cs/nest-files';
// import { MqModule } from '@cs/nest-mq';

@Global()
@CSModule({
  imports: [
    // TODO: 按需注册全局基础设施模块，示例：
    //
    // DatabaseModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: async (config: ConfigService) => {
    //     return { ...config.get('mysql') };
    //   },
    // }),
    //
    // RedisModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({ ...config.get('redis') }),
    // }),
    //
    // FileStorageModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({ ...config.get('fileStorage') }),
    // }),
    //
    // MqModule.forRootAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => config.get('mq'),
    // }),
  ],
  exports: [
    // TODO: 导出已注册的模块，如 DatabaseModule, RedisModule 等
  ],
})
export class ShareModule {}
