import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { LlmModule } from './llm/llm.module';
import { CompilerModule } from './compiler/compiler.module';

@Module({
  imports: [DatabaseModule, LlmModule, CompilerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
