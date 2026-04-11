import { Module } from '@nestjs/common';
import { CompilerService } from './compiler.service';
import { DatabaseModule } from '../database/database.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [DatabaseModule, LlmModule],
  providers: [CompilerService],
})
export class CompilerModule {}
