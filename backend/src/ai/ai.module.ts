import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { GraphModule } from '../graph/graph.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LLM_PORT } from '../modules/ai/domain/ports/llm-port';
import { OpenAiLlmAdapter } from '../modules/ai/infrastructure/llm/openai-llm.adapter';

@Module({
  imports: [AuthModule, SettingsModule, GraphModule],
  controllers: [AiController],
  providers: [AiService, { provide: LLM_PORT, useClass: OpenAiLlmAdapter }],
})
export class AiModule {}
