import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { GraphModule } from '../graph/graph.module';
import { TokenUsageModule } from '../token-usage/token-usage.module';
import { AiController } from './ai.controller';
import { LLM_PORT, type LlmPort } from '../modules/ai/domain/ports/llm-port';
import { OpenAiLlmAdapter } from '../modules/ai/infrastructure/llm/openai-llm.adapter';
import {
  AI_CONFIG_RESOLVER,
  type AiConfigResolver,
} from '../modules/ai/domain/ports/ai-config-resolver';
import { ResolveAiConfigUseCase } from '../modules/settings/application/use-cases/resolve-ai-config.use-case';

// Binds the AI context's config resolver to the settings context's use-case.
const aiConfigResolver = (resolve: ResolveAiConfigUseCase): AiConfigResolver => ({
  resolve: (userId) => resolve.execute(userId),
});
import {
  DUPLICATE_NODES_REPOSITORY,
  type DuplicateNodesRepository,
} from '../modules/ai/domain/ports/duplicate-nodes-repository';
import { PrismaDuplicateNodesRepository } from '../modules/ai/infrastructure/persistence/prisma-duplicate-nodes.repository';
import { DetectDuplicatesUseCase } from '../modules/ai/application/use-cases/detect-duplicates.use-case';
import { EMBEDDING_PORT, type EmbeddingPort } from '../modules/ai/domain/ports/embedding-port';
import { OpenAiEmbeddingAdapter } from '../modules/ai/infrastructure/llm/openai-embedding.adapter';
import {
  NODE_EMBEDDING_REPOSITORY,
  type NodeEmbeddingRepository,
} from '../modules/ai/domain/ports/node-embedding-repository';
import { PrismaNodeEmbeddingRepository } from '../modules/ai/infrastructure/persistence/prisma-node-embedding.repository';
import { DetectDuplicatesBySimilarityUseCase } from '../modules/ai/application/use-cases/detect-duplicates-by-similarity.use-case';
import { ImproveFlashcardUseCase } from '../modules/ai/application/use-cases/improve-flashcard.use-case';
import { ImproveQuestaoUseCase } from '../modules/ai/application/use-cases/improve-questao.use-case';
import { ImproveNotaUseCase } from '../modules/ai/application/use-cases/improve-nota.use-case';
import { ImproveProvaQuestoesUseCase } from '../modules/ai/application/use-cases/improve-questoes-batch.use-case';
import {
  DUPLICATE_VERDICT_REPOSITORY,
  type DuplicateVerdictRepository,
} from '../modules/ai/domain/ports/duplicate-verdict-repository';
import { PrismaDuplicateVerdictRepository } from '../modules/ai/infrastructure/persistence/prisma-duplicate-verdict.repository';
import { DetectDuplicatesHybridUseCase } from '../modules/ai/application/use-cases/detect-duplicates-hybrid.use-case';
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
  EXPAND_TARGET_REPOSITORY,
  type ExpandTargetRepository,
} from '../modules/ai/domain/ports/expand-target-repository';
import {
  GRAPH_NAME_INDEX_REPOSITORY,
  type GraphNameIndexRepository,
} from '../modules/ai/domain/ports/graph-name-index-repository';
import { PrismaExpandTargetRepository } from '../modules/ai/infrastructure/persistence/prisma-expand-target.repository';
import { PrismaGraphNameIndexRepository } from '../modules/ai/infrastructure/persistence/prisma-graph-name-index.repository';
import { ExpandNodeUseCase } from '../modules/ai/application/use-cases/expand-node.use-case';
import { ClassifyFlashcardUseCase } from '../modules/ai/application/use-cases/classify-flashcard.use-case';
import { FillKnowledgeGapsUseCase } from '../modules/ai/application/use-cases/fill-knowledge-gaps.use-case';
import {
  INSIGHT_CONTEXT_REPOSITORY,
  type InsightContextRepository,
} from '../modules/ai/domain/ports/insight-context-repository';
import { PrismaInsightContextRepository } from '../modules/ai/infrastructure/persistence/prisma-insight-context.repository';
import {
  NODE_INSIGHTS_CACHE_REPOSITORY,
  type NodeInsightsCacheRepository,
} from '../modules/ai/domain/ports/node-insights-cache-repository';
import { PrismaNodeInsightsCacheRepository } from '../modules/ai/infrastructure/persistence/prisma-node-insights-cache.repository';
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
import { DeleteNodeUseCase } from '../modules/graph/application/use-cases/delete-node.use-case';
import { CreateDeckUseCase } from '../modules/graph/application/use-cases/create-deck.use-case';
import {
  GRAPH_DECK_WRITER,
  type GraphDeckWriter,
} from '../modules/ai/domain/ports/graph-deck-writer';
import { PlanGraphFromTextUseCase } from '../modules/ai/application/use-cases/plan-graph-from-text.use-case';
import { BuildGraphFromPlanUseCase } from '../modules/ai/application/use-cases/build-graph-from-plan.use-case';
import { GenerateGraphFromTextUseCase } from '../modules/ai/application/use-cases/generate-graph-from-text.use-case';
import {
  DUPLICATE_MERGE_REPOSITORY,
  type DuplicateMergeRepository,
} from '../modules/ai/domain/ports/duplicate-merge-repository';
import {
  GRAPH_NODE_DELETER,
  type GraphNodeDeleter,
} from '../modules/ai/domain/ports/graph-node-deleter';
import { PrismaDuplicateMergeRepository } from '../modules/ai/infrastructure/persistence/prisma-duplicate-merge.repository';
import { MergeDuplicateNodesUseCase } from '../modules/ai/application/use-cases/merge-duplicate-nodes.use-case';
import { GAP_RULES_PORT, type GapRulesPort } from '../modules/ai/domain/ports/gap-rules-port';
import { SuggestGapFillUseCase } from '../modules/ai/application/use-cases/suggest-gap-fill.use-case';
import { AnalyzeRawTextUseCase } from '../modules/ai/application/use-cases/analyze-raw-text.use-case';
import {
  FLASHCARD_SOURCE_REPOSITORY,
  type FlashcardSourceRepository,
} from '../modules/ai/domain/ports/flashcard-source-repository';
import { PrismaFlashcardSourceRepository } from '../modules/ai/infrastructure/persistence/prisma-flashcard-source.repository';
import { GenerateFlashcardsViaIaUseCase } from '../modules/ai/application/use-cases/generate-flashcards-via-ia.use-case';
import {
  CURRICULUM_REPOSITORY,
  type CurriculumRepository,
} from '../modules/ai/domain/ports/curriculum-repository';
import { PrismaCurriculumRepository } from '../modules/ai/infrastructure/persistence/prisma-curriculum.repository';
import { SaveSelectedNotasUseCase } from '../modules/ai/application/use-cases/save-selected-notas.use-case';
import {
  BARALHO_POPULATION_REPOSITORY,
  type BaralhoPopulationRepository,
} from '../modules/ai/domain/ports/baralho-population-repository';
import { PrismaBaralhoPopulationRepository } from '../modules/ai/infrastructure/persistence/prisma-baralho-population.repository';
import { PopulateGraphFromBaralhoUseCase } from '../modules/ai/application/use-cases/populate-graph-from-baralho.use-case';
import {
  DECK_CLASSIFICATION_REPOSITORY,
  type DeckClassificationRepository,
} from '../modules/ai/domain/ports/deck-classification-repository';
import { PrismaDeckClassificationRepository } from '../modules/ai/infrastructure/persistence/prisma-deck-classification.repository';
import {
  GRAPH_NODE_ATTACHER,
  type GraphNodeAttacher,
} from '../modules/ai/domain/ports/graph-node-attacher';
import { AddExistingNodeUseCase } from '../modules/graph/application/use-cases/add-existing-node.use-case';
import { PlanDeckClassificationChunkUseCase } from '../modules/ai/application/use-cases/plan-deck-classification-chunk.use-case';
import { ApplyDeckClassificationChunkUseCase } from '../modules/ai/application/use-cases/apply-deck-classification-chunk.use-case';
import { PlanGraphFromEditalUseCase } from '../modules/ai/application/use-cases/plan-graph-from-edital.use-case';
import { BuildGraphFromEditalUseCase } from '../modules/ai/application/use-cases/build-graph-from-edital.use-case';
import {
  EDITAL_TEXT_EXTRACTOR,
  type EditalTextExtractor,
} from '../modules/ai/domain/ports/edital-text-extractor';
import { PdfEditalTextExtractor } from '../modules/ai/infrastructure/documents/pdf-edital-text-extractor';
import { RankGraphImportanceUseCase } from '../modules/ai/application/use-cases/rank-graph-importance.use-case';
import {
  CONCEITO_IMPORTANCE_SOURCE,
  type ConceitoImportanceSource,
} from '../modules/curriculum/domain/ports/conceito-importance-source';
import { PrismaConceitoImportanceRepository } from '../modules/curriculum/infrastructure/persistence/prisma-conceito-importance.repository';
import { BuildRoadmapUseCase } from '../modules/ai/application/use-cases/build-roadmap.use-case';
import {
  ROADMAP_TRILHA_REPOSITORY,
  type RoadmapTrilhaRepository,
} from '../modules/ai/domain/ports/roadmap-trilha-repository';
import { PrismaRoadmapTrilhaRepository } from '../modules/ai/infrastructure/persistence/prisma-roadmap-trilha.repository';
import {
  EDITAL_COVERAGE_SOURCE,
  type EditalCoverageSource,
} from '../modules/ai/domain/ports/edital-coverage-source';
import { PrismaEditalCoverageRepository } from '../modules/ai/infrastructure/persistence/prisma-edital-coverage.repository';
import { BuildAiRoadmapUseCase } from '../modules/ai/application/use-cases/build-ai-roadmap.use-case';

// Binds the AI context's GraphDeckWriter to the graph context's CreateDeck use-case.
const graphDeckWriter = (createDeck: CreateDeckUseCase): GraphDeckWriter => ({
  createBaralho: async (userId, grafoId, nome, flashcardIds) => {
    await createDeck.execute(userId, grafoId, nome, flashcardIds);
  },
});

// Binds the structural-gap targets to the graph's relation rules.
const gapRules: GapRulesPort = {
  gapTargets: () => [
    { tipo: 'CONCEITO', relacoes: getAllowedRelations('CONCEITO', 'CONCEITO') },
    { tipo: 'NOTA', relacoes: getAllowedRelations('NOTA', 'CONCEITO') },
  ],
};

// Binds the AI context's GraphNodeDeleter to the graph context's DeleteNode use-case.
const graphNodeDeleter = (deleteNode: DeleteNodeUseCase): GraphNodeDeleter => ({
  deleteNode: async (userId, nodeId, grafoId) => {
    await deleteNode.execute(userId, nodeId, grafoId);
  },
});

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

// Binds the AI context's GraphNodeAttacher to the graph context's AddExistingNode use-case.
const graphNodeAttacher = (addExisting: AddExistingNodeUseCase): GraphNodeAttacher => ({
  attachExisting: async (userId, grafoId, tipoNode, entityId) => {
    await addExisting.execute(userId, grafoId, tipoNode, entityId);
  },
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
  imports: [
    AuthModule,
    SettingsModule,
    GraphModule,
    TokenUsageModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [AiController],
  providers: [
    { provide: LLM_PORT, useClass: OpenAiLlmAdapter },
    { provide: AI_CONFIG_RESOLVER, useFactory: aiConfigResolver, inject: [ResolveAiConfigUseCase] },
    { provide: DUPLICATE_NODES_REPOSITORY, useClass: PrismaDuplicateNodesRepository },
    { provide: EMBEDDING_PORT, useClass: OpenAiEmbeddingAdapter },
    { provide: NODE_EMBEDDING_REPOSITORY, useClass: PrismaNodeEmbeddingRepository },
    { provide: DUPLICATE_VERDICT_REPOSITORY, useClass: PrismaDuplicateVerdictRepository },
    { provide: RELATION_CANDIDATES_REPOSITORY, useClass: PrismaRelationCandidatesRepository },
    { provide: RELATION_RULES_PORT, useValue: graphRelationRules },
    { provide: LEARNING_GRAPH_REPOSITORY, useClass: PrismaLearningGraphRepository },
    { provide: INSIGHT_CONTEXT_REPOSITORY, useClass: PrismaInsightContextRepository },
    { provide: NODE_INSIGHTS_CACHE_REPOSITORY, useClass: PrismaNodeInsightsCacheRepository },
    { provide: AUTO_LINK_REPOSITORY, useClass: PrismaAutoLinkRepository },
    { provide: COMPLETENESS_REPOSITORY, useClass: PrismaCompletenessRepository },
    { provide: NODE_TYPES_REPOSITORY, useClass: PrismaNodeTypesRepository },
    { provide: INSIGHT_TARGET_INDEX_REPOSITORY, useClass: PrismaInsightTargetIndexRepository },
    { provide: PREREQUISITE_NODES_REPOSITORY, useClass: PrismaPrerequisiteNodesRepository },
    { provide: CLUSTER_NODES_REPOSITORY, useClass: PrismaClusterNodesRepository },
    { provide: CHAT_NODES_REPOSITORY, useClass: PrismaChatNodesRepository },
    { provide: GRAPH_DECKS_QUERY, useClass: PrismaGraphDecksQuery },
    { provide: EXPAND_TARGET_REPOSITORY, useClass: PrismaExpandTargetRepository },
    { provide: GRAPH_NAME_INDEX_REPOSITORY, useClass: PrismaGraphNameIndexRepository },
    { provide: DUPLICATE_MERGE_REPOSITORY, useClass: PrismaDuplicateMergeRepository },
    { provide: GRAPH_NODE_DELETER, useFactory: graphNodeDeleter, inject: [DeleteNodeUseCase] },
    { provide: GAP_RULES_PORT, useValue: gapRules },
    { provide: FLASHCARD_SOURCE_REPOSITORY, useClass: PrismaFlashcardSourceRepository },
    { provide: CURRICULUM_REPOSITORY, useClass: PrismaCurriculumRepository },
    { provide: BARALHO_POPULATION_REPOSITORY, useClass: PrismaBaralhoPopulationRepository },
    { provide: GRAPH_DECK_WRITER, useFactory: graphDeckWriter, inject: [CreateDeckUseCase] },
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
      provide: ImproveFlashcardUseCase,
      useFactory: (llm: LlmPort) => new ImproveFlashcardUseCase(llm),
      inject: [LLM_PORT],
    },
    {
      provide: ImproveQuestaoUseCase,
      useFactory: (llm: LlmPort) => new ImproveQuestaoUseCase(llm),
      inject: [LLM_PORT],
    },
    {
      provide: ImproveNotaUseCase,
      useFactory: (llm: LlmPort) => new ImproveNotaUseCase(llm),
      inject: [LLM_PORT],
    },
    {
      provide: ImproveProvaQuestoesUseCase,
      useFactory: (llm: LlmPort) => new ImproveProvaQuestoesUseCase(llm),
      inject: [LLM_PORT],
    },
    {
      provide: DetectDuplicatesBySimilarityUseCase,
      useFactory: (
        nodes: DuplicateNodesRepository,
        embeddings: EmbeddingPort,
        store: NodeEmbeddingRepository,
      ) => new DetectDuplicatesBySimilarityUseCase(nodes, embeddings, store),
      inject: [DUPLICATE_NODES_REPOSITORY, EMBEDDING_PORT, NODE_EMBEDDING_REPOSITORY],
    },
    {
      provide: DetectDuplicatesHybridUseCase,
      useFactory: (
        nodes: DuplicateNodesRepository,
        embeddings: EmbeddingPort,
        store: NodeEmbeddingRepository,
        verdicts: DuplicateVerdictRepository,
        llm: DetectDuplicatesUseCase,
      ) => new DetectDuplicatesHybridUseCase(nodes, embeddings, store, verdicts, llm),
      inject: [
        DUPLICATE_NODES_REPOSITORY,
        EMBEDDING_PORT,
        NODE_EMBEDDING_REPOSITORY,
        DUPLICATE_VERDICT_REPOSITORY,
        DetectDuplicatesUseCase,
      ],
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
      useFactory: (
        graph: LearningGraphRepository,
        llm: LlmPort,
        importance: ConceitoImportanceSource,
      ) => new GenerateLearningPathUseCase(graph, llm, importance),
      inject: [LEARNING_GRAPH_REPOSITORY, LLM_PORT, CONCEITO_IMPORTANCE_SOURCE],
    },
    {
      provide: GenerateNodeInsightsUseCase,
      useFactory: (
        context: InsightContextRepository,
        llm: LlmPort,
        rules: RelationRulesPort,
        cache: NodeInsightsCacheRepository,
      ) => new GenerateNodeInsightsUseCase(context, llm, rules, cache),
      inject: [
        INSIGHT_CONTEXT_REPOSITORY,
        LLM_PORT,
        RELATION_RULES_PORT,
        NODE_INSIGHTS_CACHE_REPOSITORY,
      ],
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
    {
      provide: ExpandNodeUseCase,
      useFactory: (
        targets: ExpandTargetRepository,
        names: GraphNameIndexRepository,
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
        llm: LlmPort,
      ) => new ExpandNodeUseCase(targets, names, nodeWriter, edgeWriter, llm),
      inject: [
        EXPAND_TARGET_REPOSITORY,
        GRAPH_NAME_INDEX_REPOSITORY,
        GRAPH_NODE_WRITER,
        GRAPH_EDGE_WRITER,
        LLM_PORT,
      ],
    },
    {
      provide: ClassifyFlashcardUseCase,
      useFactory: (
        targets: ExpandTargetRepository,
        names: GraphNameIndexRepository,
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
        llm: LlmPort,
      ) => new ClassifyFlashcardUseCase(targets, names, nodeWriter, edgeWriter, llm),
      inject: [
        EXPAND_TARGET_REPOSITORY,
        GRAPH_NAME_INDEX_REPOSITORY,
        GRAPH_NODE_WRITER,
        GRAPH_EDGE_WRITER,
        LLM_PORT,
      ],
    },
    {
      provide: FillKnowledgeGapsUseCase,
      useFactory: (
        names: GraphNameIndexRepository,
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
        types: NodeTypesRepository,
        llm: LlmPort,
      ) => new FillKnowledgeGapsUseCase(names, nodeWriter, edgeWriter, types, llm),
      inject: [
        GRAPH_NAME_INDEX_REPOSITORY,
        GRAPH_NODE_WRITER,
        GRAPH_EDGE_WRITER,
        NODE_TYPES_REPOSITORY,
        LLM_PORT,
      ],
    },
    {
      provide: MergeDuplicateNodesUseCase,
      useFactory: (repo: DuplicateMergeRepository, deleter: GraphNodeDeleter) =>
        new MergeDuplicateNodesUseCase(repo, deleter),
      inject: [DUPLICATE_MERGE_REPOSITORY, GRAPH_NODE_DELETER],
    },
    {
      provide: SuggestGapFillUseCase,
      useFactory: (llm: LlmPort, rules: GapRulesPort) => new SuggestGapFillUseCase(llm, rules),
      inject: [LLM_PORT, GAP_RULES_PORT],
    },
    {
      provide: AnalyzeRawTextUseCase,
      useFactory: (llm: LlmPort) => new AnalyzeRawTextUseCase(llm),
      inject: [LLM_PORT],
    },
    {
      provide: GenerateFlashcardsViaIaUseCase,
      useFactory: (repo: FlashcardSourceRepository, llm: LlmPort) =>
        new GenerateFlashcardsViaIaUseCase(repo, llm),
      inject: [FLASHCARD_SOURCE_REPOSITORY, LLM_PORT],
    },
    {
      provide: SaveSelectedNotasUseCase,
      useFactory: (repo: CurriculumRepository, llm: LlmPort) =>
        new SaveSelectedNotasUseCase(repo, llm),
      inject: [CURRICULUM_REPOSITORY, LLM_PORT],
    },
    {
      provide: PopulateGraphFromBaralhoUseCase,
      useFactory: (
        repo: BaralhoPopulationRepository,
        names: GraphNameIndexRepository,
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
        llm: LlmPort,
      ) => new PopulateGraphFromBaralhoUseCase(repo, names, nodeWriter, edgeWriter, llm),
      inject: [
        BARALHO_POPULATION_REPOSITORY,
        GRAPH_NAME_INDEX_REPOSITORY,
        GRAPH_NODE_WRITER,
        GRAPH_EDGE_WRITER,
        LLM_PORT,
      ],
    },
    { provide: DECK_CLASSIFICATION_REPOSITORY, useClass: PrismaDeckClassificationRepository },
    {
      provide: GRAPH_NODE_ATTACHER,
      useFactory: graphNodeAttacher,
      inject: [AddExistingNodeUseCase],
    },
    {
      provide: PlanDeckClassificationChunkUseCase,
      useFactory: (
        repo: DeckClassificationRepository,
        names: GraphNameIndexRepository,
        llm: LlmPort,
      ) => new PlanDeckClassificationChunkUseCase(repo, names, llm),
      inject: [DECK_CLASSIFICATION_REPOSITORY, GRAPH_NAME_INDEX_REPOSITORY, LLM_PORT],
    },
    {
      provide: ApplyDeckClassificationChunkUseCase,
      useFactory: (
        repo: DeckClassificationRepository,
        names: GraphNameIndexRepository,
        nodeWriter: GraphNodeWriter,
        attacher: GraphNodeAttacher,
        edgeWriter: GraphEdgeWriter,
      ) => new ApplyDeckClassificationChunkUseCase(repo, names, nodeWriter, attacher, edgeWriter),
      inject: [
        DECK_CLASSIFICATION_REPOSITORY,
        GRAPH_NAME_INDEX_REPOSITORY,
        GRAPH_NODE_WRITER,
        GRAPH_NODE_ATTACHER,
        GRAPH_EDGE_WRITER,
      ],
    },
    {
      provide: PlanGraphFromTextUseCase,
      useFactory: (names: GraphNameIndexRepository, llm: LlmPort) =>
        new PlanGraphFromTextUseCase(names, llm),
      inject: [GRAPH_NAME_INDEX_REPOSITORY, LLM_PORT],
    },
    {
      provide: BuildGraphFromPlanUseCase,
      useFactory: (
        names: GraphNameIndexRepository,
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
        deckWriter: GraphDeckWriter,
      ) => new BuildGraphFromPlanUseCase(names, nodeWriter, edgeWriter, deckWriter),
      inject: [
        GRAPH_NAME_INDEX_REPOSITORY,
        GRAPH_NODE_WRITER,
        GRAPH_EDGE_WRITER,
        GRAPH_DECK_WRITER,
      ],
    },
    {
      provide: GenerateGraphFromTextUseCase,
      useFactory: (
        names: GraphNameIndexRepository,
        llm: LlmPort,
        builder: BuildGraphFromPlanUseCase,
      ) => new GenerateGraphFromTextUseCase(names, llm, builder),
      inject: [GRAPH_NAME_INDEX_REPOSITORY, LLM_PORT, BuildGraphFromPlanUseCase],
    },
    { provide: EDITAL_TEXT_EXTRACTOR, useClass: PdfEditalTextExtractor },
    {
      provide: PlanGraphFromEditalUseCase,
      useFactory: (names: GraphNameIndexRepository, llm: LlmPort) =>
        new PlanGraphFromEditalUseCase(names, llm),
      inject: [GRAPH_NAME_INDEX_REPOSITORY, LLM_PORT],
    },
    {
      provide: BuildGraphFromEditalUseCase,
      useFactory: (
        names: GraphNameIndexRepository,
        nodeWriter: GraphNodeWriter,
        edgeWriter: GraphEdgeWriter,
      ) => new BuildGraphFromEditalUseCase(names, nodeWriter, edgeWriter),
      inject: [GRAPH_NAME_INDEX_REPOSITORY, GRAPH_NODE_WRITER, GRAPH_EDGE_WRITER],
    },
    { provide: CONCEITO_IMPORTANCE_SOURCE, useClass: PrismaConceitoImportanceRepository },
    {
      provide: RankGraphImportanceUseCase,
      useFactory: (source: ConceitoImportanceSource) => new RankGraphImportanceUseCase(source),
      inject: [CONCEITO_IMPORTANCE_SOURCE],
    },
    { provide: ROADMAP_TRILHA_REPOSITORY, useClass: PrismaRoadmapTrilhaRepository },
    { provide: EDITAL_COVERAGE_SOURCE, useClass: PrismaEditalCoverageRepository },
    {
      provide: BuildAiRoadmapUseCase,
      useFactory: (
        generate: GenerateLearningPathUseCase,
        graph: LearningGraphRepository,
        trilhas: RoadmapTrilhaRepository,
        llm: LlmPort,
      ) => new BuildAiRoadmapUseCase(generate, graph, trilhas, llm),
      inject: [
        GenerateLearningPathUseCase,
        LEARNING_GRAPH_REPOSITORY,
        ROADMAP_TRILHA_REPOSITORY,
        LLM_PORT,
      ],
    },
    {
      provide: BuildRoadmapUseCase,
      useFactory: (
        graph: LearningGraphRepository,
        importance: ConceitoImportanceSource,
        coverage: EditalCoverageSource,
        trilhas: RoadmapTrilhaRepository,
        aiBuilder: BuildAiRoadmapUseCase,
      ) => new BuildRoadmapUseCase(graph, importance, coverage, trilhas, aiBuilder),
      inject: [
        LEARNING_GRAPH_REPOSITORY,
        CONCEITO_IMPORTANCE_SOURCE,
        EDITAL_COVERAGE_SOURCE,
        ROADMAP_TRILHA_REPOSITORY,
        BuildAiRoadmapUseCase,
      ],
    },
  ],
})
export class AiModule {}
