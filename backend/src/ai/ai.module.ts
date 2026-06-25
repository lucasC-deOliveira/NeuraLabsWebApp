import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { GraphModule } from '../graph/graph.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LLM_PORT, type LlmPort } from '../modules/ai/domain/ports/llm-port';
import { OpenAiLlmAdapter } from '../modules/ai/infrastructure/llm/openai-llm.adapter';
import {
  DUPLICATE_NODES_REPOSITORY,
  type DuplicateNodesRepository,
} from '../modules/ai/domain/ports/duplicate-nodes-repository';
import { PrismaDuplicateNodesRepository } from '../modules/ai/infrastructure/persistence/prisma-duplicate-nodes.repository';
import { DetectDuplicatesUseCase } from '../modules/ai/application/use-cases/detect-duplicates.use-case';

@Module({
  imports: [AuthModule, SettingsModule, GraphModule],
  controllers: [AiController],
  providers: [
    AiService,
    { provide: LLM_PORT, useClass: OpenAiLlmAdapter },
    { provide: DUPLICATE_NODES_REPOSITORY, useClass: PrismaDuplicateNodesRepository },
    {
      provide: DetectDuplicatesUseCase,
      useFactory: (nodes: DuplicateNodesRepository, llm: LlmPort) =>
        new DetectDuplicatesUseCase(nodes, llm),
      inject: [DUPLICATE_NODES_REPOSITORY, LLM_PORT],
    },
  ],
})
export class AiModule {}
