import { Module } from '@nestjs/common';
import { ShareModule } from './share.module';
import { AppService } from './app.service';

@Module({
  imports: [ShareModule],
  providers: [AppService],
})
export class AppModule {}
