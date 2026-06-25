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
import {
  RELATION_CANDIDATES_REPOSITORY,
  type RelationCandidatesRepository,
} from '../modules/ai/domain/ports/relation-candidates-repository';
import {
  RELATION_RULES_PORT,
  type RelationRulesPort,
} from '../modules/ai/domain/ports/relation-rules-port';
import { PrismaRelationCandidatesRepository } from '../modules/ai/infrastructure/persistence/prisma-relation-candidates.repository';
import { SuggestNotaRelationsUseCase } from '../modules/ai/application/use-cases/suggest-nota-relations.use-case';
import {
  LEARNING_GRAPH_REPOSITORY,
  type LearningGraphRepository,
} from '../modules/ai/domain/ports/learning-graph-repository';
import { PrismaLearningGraphRepository } from '../modules/ai/infrastructure/persistence/prisma-learning-graph.repository';
import { GenerateLearningPathUseCase } from '../modules/ai/application/use-cases/generate-learning-path.use-case';
import {
  getAllowedRelations,
  isRelationAllowed,
  getInsightTargets,
} from '../modules/graph/domain/services/relation-rules';
import {
  INSIGHT_CONTEXT_REPOSITORY,
  type InsightContextRepository,
} from '../modules/ai/domain/ports/insight-context-repository';
import { PrismaInsightContextRepository } from '../modules/ai/infrastructure/persistence/prisma-insight-context.repository';
import { GenerateNodeInsightsUseCase } from '../modules/ai/application/use-cases/generate-node-insights.use-case';

// Binds the AI context's RelationRulesPort to the graph context's published rules.
const graphRelationRules: RelationRulesPort = {
  allowedNotaRelations: (targetTipo) => getAllowedRelations('NOTA', targetTipo),
  isNotaRelationAllowed: (targetTipo, relacao) => isRelationAllowed('NOTA', targetTipo, relacao),
  isRelationAllowed: (sourceTipo, targetTipo, relacao) =>
    isRelationAllowed(sourceTipo, targetTipo, relacao),
  insightTargets: (tipo) => getInsightTargets(tipo),
};

@Module({
  imports: [AuthModule, SettingsModule, GraphModule],
  controllers: [AiController],
  providers: [
    AiService,
    { provide: LLM_PORT, useClass: OpenAiLlmAdapter },
    { provide: DUPLICATE_NODES_REPOSITORY, useClass: PrismaDuplicateNodesRepository },
    { provide: RELATION_CANDIDATES_REPOSITORY, useClass: PrismaRelationCandidatesRepository },
    { provide: RELATION_RULES_PORT, useValue: graphRelationRules },
    { provide: LEARNING_GRAPH_REPOSITORY, useClass: PrismaLearningGraphRepository },
    { provide: INSIGHT_CONTEXT_REPOSITORY, useClass: PrismaInsightContextRepository },
    {
      provide: DetectDuplicatesUseCase,
      useFactory: (nodes: DuplicateNodesRepository, llm: LlmPort) =>
        new DetectDuplicatesUseCase(nodes, llm),
      inject: [DUPLICATE_NODES_REPOSITORY, LLM_PORT],
    },
    {
      provide: SuggestNotaRelationsUseCase,
      useFactory: (
        candidates: RelationCandidatesRepository,
        llm: LlmPort,
        rules: RelationRulesPort,
      ) => new SuggestNotaRelationsUseCase(candidates, llm, rules),
      inject: [RELATION_CANDIDATES_REPOSITORY, LLM_PORT, RELATION_RULES_PORT],
    },
    {
      provide: GenerateLearningPathUseCase,
      useFactory: (graph: LearningGraphRepository, llm: LlmPort) =>
        new GenerateLearningPathUseCase(graph, llm),
      inject: [LEARNING_GRAPH_REPOSITORY, LLM_PORT],
    },
    {
      provide: GenerateNodeInsightsUseCase,
      useFactory: (context: InsightContextRepository, llm: LlmPort, rules: RelationRulesPort) =>
        new GenerateNodeInsightsUseCase(context, llm, rules),
      inject: [INSIGHT_CONTEXT_REPOSITORY, LLM_PORT, RELATION_RULES_PORT],
    },
  ],
})
export class AiModule {}
