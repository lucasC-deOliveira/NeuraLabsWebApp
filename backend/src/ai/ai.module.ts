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
  getCanonicalDirection,
} from '../modules/graph/domain/services/relation-rules';
import {
  INSIGHT_TARGET_INDEX_REPOSITORY,
  type InsightTargetIndexRepository,
} from '../modules/ai/domain/ports/insight-target-index-repository';
import { PrismaInsightTargetIndexRepository } from '../modules/ai/infrastructure/persistence/prisma-insight-target-index.repository';
import { AddInsightsToGraphUseCase } from '../modules/ai/application/use-cases/add-insights-to-graph.use-case';
import {
  PREREQUISITE_NODES_REPOSITORY,
  type PrerequisiteNodesRepository,
} from '../modules/ai/domain/ports/prerequisite-nodes-repository';
import { PrismaPrerequisiteNodesRepository } from '../modules/ai/infrastructure/persistence/prisma-prerequisite-nodes.repository';
import { DetectMissingPrerequisitesUseCase } from '../modules/ai/application/use-cases/detect-missing-prerequisites.use-case';
import {
  CLUSTER_NODES_REPOSITORY,
  type ClusterNodesRepository,
} from '../modules/ai/domain/ports/cluster-nodes-repository';
import { PrismaClusterNodesRepository } from '../modules/ai/infrastructure/persistence/prisma-cluster-nodes.repository';
import { GenerateCommunitySummaryUseCase } from '../modules/ai/application/use-cases/generate-community-summary.use-case';
import {
  CHAT_NODES_REPOSITORY,
  type ChatNodesRepository,
} from '../modules/ai/domain/ports/chat-nodes-repository';
import { PrismaChatNodesRepository } from '../modules/ai/infrastructure/persistence/prisma-chat-nodes.repository';
import { ChatWithGraphUseCase } from '../modules/ai/application/use-cases/chat-with-graph.use-case';
import {
  GRAPH_DECKS_QUERY,
  type GraphDecksQuery,
} from '../modules/ai/domain/ports/graph-decks-query';
import { PrismaGraphDecksQuery } from '../modules/ai/infrastructure/persistence/prisma-graph-decks.query';
import { ListBaralhosInGrafoUseCase } from '../modules/ai/application/use-cases/list-baralhos-in-grafo.use-case';
import {
  INSIGHT_CONTEXT_REPOSITORY,
  type InsightContextRepository,
} from '../modules/ai/domain/ports/insight-context-repository';
import { PrismaInsightContextRepository } from '../modules/ai/infrastructure/persistence/prisma-insight-context.repository';
import { GenerateNodeInsightsUseCase } from '../modules/ai/application/use-cases/generate-node-insights.use-case';
import {
  AUTO_LINK_REPOSITORY,
  type AutoLinkRepository,
} from '../modules/ai/domain/ports/auto-link-repository';
import { PrismaAutoLinkRepository } from '../modules/ai/infrastructure/persistence/prisma-auto-link.repository';
import { AutoLinkGraphUseCase } from '../modules/ai/application/use-cases/auto-link-graph.use-case';
import {
  COMPLETENESS_REPOSITORY,
  type CompletenessRepository,
} from '../modules/ai/domain/ports/completeness-repository';
import { PrismaCompletenessRepository } from '../modules/ai/infrastructure/persistence/prisma-completeness.repository';
import { AssessCompletenessUseCase } from '../modules/ai/application/use-cases/assess-completeness.use-case';
import {
  GRAPH_EDGE_WRITER,
  type GraphEdgeWriter,
} from '../modules/ai/domain/ports/graph-edge-writer';
import {
  GRAPH_NODE_WRITER,
  type GraphNodeWriter,
} from '../modules/ai/domain/ports/graph-node-writer';
import {
  NODE_TYPES_REPOSITORY,
  type NodeTypesRepository,
} from '../modules/ai/domain/ports/node-types-repository';
import { PrismaNodeTypesRepository } from '../modules/ai/infrastructure/persistence/prisma-node-types.repository';
import { ApplyAutoLinkUseCase } from '../modules/ai/application/use-cases/apply-auto-link.use-case';
import { AddMissingPrerequisiteUseCase } from '../modules/ai/application/use-cases/add-missing-prerequisite.use-case';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { CreateNodeUseCase } from '../modules/graph/application/use-cases/create-node.use-case';

// Binds the AI context's GraphEdgeWriter to the graph context's CreateEdge use-case.
const graphEdgeWriter = (createEdge: CreateEdgeUseCase): GraphEdgeWriter => ({
  createEdge: async (userId, grafoId, edge) => {
    await createEdge.execute({ userId, grafoId, ...edge });
  },
});

// Binds the AI context's GraphNodeWriter to the graph context's CreateNode use-case.
const graphNodeWriter = (createNode: CreateNodeUseCase): GraphNodeWriter => ({
  createNode: (userId, grafoId, input) => createNode.execute(userId, grafoId, input),
});

// Binds the AI context's RelationRulesPort to the graph context's published rules.
const graphRelationRules: RelationRulesPort = {
  allowedNotaRelations: (targetTipo) => getAllowedRelations('NOTA', targetTipo),
  isNotaRelationAllowed: (targetTipo, relacao) => isRelationAllowed('NOTA', targetTipo, relacao),
  isRelationAllowed: (sourceTipo, targetTipo, relacao) =>
    isRelationAllowed(sourceTipo, targetTipo, relacao),
  insightTargets: (tipo) => getInsightTargets(tipo),
  canonicalDirection: (typeA, typeB, relacao) => getCanonicalDirection(typeA, typeB, relacao),
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
    { provide: AUTO_LINK_REPOSITORY, useClass: PrismaAutoLinkRepository },
    { provide: COMPLETENESS_REPOSITORY, useClass: PrismaCompletenessRepository },
    { provide: NODE_TYPES_REPOSITORY, useClass: PrismaNodeTypesRepository },
    { provide: INSIGHT_TARGET_INDEX_REPOSITORY, useClass: PrismaInsightTargetIndexRepository },
    { provide: PREREQUISITE_NODES_REPOSITORY, useClass: PrismaPrerequisiteNodesRepository },
    { provide: CLUSTER_NODES_REPOSITORY, useClass: PrismaClusterNodesRepository },
    { provide: CHAT_NODES_REPOSITORY, useClass: PrismaChatNodesRepository },
    { provide: GRAPH_DECKS_QUERY, useClass: PrismaGraphDecksQuery },
    {
      provide: GRAPH_EDGE_WRITER,
      useFactory: graphEdgeWriter,
      inject: [CreateEdgeUseCase],
    },
    {
      provide: GRAPH_NODE_WRITER,
      useFactory: graphNodeWriter,
      inject: [CreateNodeUseCase],
    },
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
    {
      provide: AutoLinkGraphUseCase,
      useFactory: (repo: AutoLinkRepository, llm: LlmPort, rules: RelationRulesPort) =>
        new AutoLinkGraphUseCase(repo, llm, rules),
      inject: [AUTO_LINK_REPOSITORY, LLM_PORT, RELATION_RULES_PORT],
    },
    {
      provide: AssessCompletenessUseCase,
      useFactory: (repo: CompletenessRepository, llm: LlmPort) =>
        new AssessCompletenessUseCase(repo, llm),
      inject: [COMPLETENESS_REPOSITORY, LLM_PORT],
    },
    {
      provide: ApplyAutoLinkUseCase,
      useFactory: (writer: GraphEdgeWriter) => new ApplyAutoLinkUseCase(writer),
      inject: [GRAPH_EDGE_WRITER],
    },
    {
      provide: AddMissingPrerequisiteUseCase,
      useFactory: (
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
        types: NodeTypesRepository,
      ) => new AddMissingPrerequisiteUseCase(nodeWriter, edgeWriter, types),
      inject: [GRAPH_NODE_WRITER, GRAPH_EDGE_WRITER, NODE_TYPES_REPOSITORY],
    },
    {
      provide: AddInsightsToGraphUseCase,
      useFactory: (
        repo: InsightTargetIndexRepository,
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
        rules: RelationRulesPort,
      ) => new AddInsightsToGraphUseCase(repo, nodeWriter, edgeWriter, rules),
      inject: [
        INSIGHT_TARGET_INDEX_REPOSITORY,
        GRAPH_NODE_WRITER,
        GRAPH_EDGE_WRITER,
        RELATION_RULES_PORT,
      ],
    },
    {
      provide: DetectMissingPrerequisitesUseCase,
      useFactory: (repo: PrerequisiteNodesRepository, llm: LlmPort) =>
        new DetectMissingPrerequisitesUseCase(repo, llm),
      inject: [PREREQUISITE_NODES_REPOSITORY, LLM_PORT],
    },
    {
      provide: GenerateCommunitySummaryUseCase,
      useFactory: (repo: ClusterNodesRepository, llm: LlmPort) =>
        new GenerateCommunitySummaryUseCase(repo, llm),
      inject: [CLUSTER_NODES_REPOSITORY, LLM_PORT],
    },
    {
      provide: ChatWithGraphUseCase,
      useFactory: (repo: ChatNodesRepository, llm: LlmPort) => new ChatWithGraphUseCase(repo, llm),
      inject: [CHAT_NODES_REPOSITORY, LLM_PORT],
    },
    {
      provide: ListBaralhosInGrafoUseCase,
      useFactory: (decks: GraphDecksQuery) => new ListBaralhosInGrafoUseCase(decks),
      inject: [GRAPH_DECKS_QUERY],
    },
  ],
})
export class AiModule {}
