import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { GetFlashcardAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-analytics.use-case';
import { GetGamificationSummaryUseCase } from '../modules/analytics/application/use-cases/get-gamification-summary.use-case';
import { GetConquestSummaryUseCase } from '../modules/analytics/application/use-cases/get-conquest-summary.use-case';
import { GetGamificationProgressUseCase } from '../modules/analytics/application/use-cases/get-gamification-progress.use-case';
import { GetBuilderSummaryUseCase } from '../modules/analytics/application/use-cases/get-builder-summary.use-case';
import {
  CONTENT_CREATION_SOURCE,
  type ContentCreationSource,
} from '../modules/analytics/domain/ports/content-creation-source';
import { PrismaContentCreationSource } from '../modules/analytics/infrastructure/persistence/prisma-content-creation.source';
import {
  GRAPH_BREADTH_SOURCE,
  type GraphBreadthSource,
} from '../modules/analytics/domain/ports/graph-breadth-source';
import { PrismaGraphBreadthSource } from '../modules/analytics/infrastructure/persistence/prisma-graph-breadth.source';
import {
  CONCEPT_MASTERY_SOURCE,
  type ConceptMasterySource,
} from '../modules/analytics/domain/ports/concept-mastery-source';
import { PrismaConceptMasterySource } from '../modules/analytics/infrastructure/persistence/prisma-concept-mastery.source';
import { computeMastery } from '../modules/graph/domain/services/domain-propagation';
import { GetProvaAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-prova-analytics.use-case';
import { GetDeckAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-deck-analytics.use-case';
import { GetFlashcardItemAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-item-analytics.use-case';
import { GetQuestaoItemAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-questao-item-analytics.use-case';
import { GetFeynmanAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-feynman-analytics.use-case';
import {
  FEYNMAN_ANALYTICS_SOURCE,
  type FeynmanAnalyticsSource,
} from '../modules/analytics/domain/ports/feynman-analytics-source';
import { PrismaFeynmanAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-feynman-analytics.source';
import {
  FLASHCARD_ANALYTICS_SOURCE,
  type FlashcardAnalyticsSource,
} from '../modules/analytics/domain/ports/flashcard-analytics-source';
import {
  PROVA_ANALYTICS_SOURCE,
  type ProvaAnalyticsSource,
} from '../modules/analytics/domain/ports/prova-analytics-source';
import {
  DECK_ANALYTICS_SOURCE,
  type DeckAnalyticsSource,
} from '../modules/analytics/domain/ports/deck-analytics-source';
import {
  FLASHCARD_ITEM_SOURCE,
  type FlashcardItemSource,
} from '../modules/analytics/domain/ports/flashcard-item-source';
import {
  QUESTAO_ITEM_SOURCE,
  type QuestaoItemSource,
} from '../modules/analytics/domain/ports/questao-item-source';
import { PrismaFlashcardAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-flashcard-analytics.source';
import { PrismaProvaAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-prova-analytics.source';
import { PrismaDeckAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-deck-analytics.source';
import { PrismaFlashcardItemSource } from '../modules/analytics/infrastructure/persistence/prisma-flashcard-item.source';
import { PrismaQuestaoItemSource } from '../modules/analytics/infrastructure/persistence/prisma-questao-item.source';
import { TtlCache } from '../modules/analytics/infrastructure/cache/ttl-cache';

// Agregações de analytics são caras; 60s de cache absorve recargas e toggles de
// filtro sem staleness perceptível para um dashboard.
const ANALYTICS_CACHE_TTL_MS = 60_000;

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: TtlCache, useFactory: () => new TtlCache(ANALYTICS_CACHE_TTL_MS) },
    { provide: FLASHCARD_ANALYTICS_SOURCE, useClass: PrismaFlashcardAnalyticsSource },
    { provide: PROVA_ANALYTICS_SOURCE, useClass: PrismaProvaAnalyticsSource },
    { provide: DECK_ANALYTICS_SOURCE, useClass: PrismaDeckAnalyticsSource },
    { provide: FLASHCARD_ITEM_SOURCE, useClass: PrismaFlashcardItemSource },
    { provide: QUESTAO_ITEM_SOURCE, useClass: PrismaQuestaoItemSource },
    { provide: FEYNMAN_ANALYTICS_SOURCE, useClass: PrismaFeynmanAnalyticsSource },
    { provide: CONCEPT_MASTERY_SOURCE, useClass: PrismaConceptMasterySource },
    { provide: CONTENT_CREATION_SOURCE, useClass: PrismaContentCreationSource },
    { provide: GRAPH_BREADTH_SOURCE, useClass: PrismaGraphBreadthSource },
    {
      provide: GetConquestSummaryUseCase,
      useFactory: (source: ConceptMasterySource) =>
        new GetConquestSummaryUseCase(source, (i, nowMs) => computeMastery(i, nowMs)),
      inject: [CONCEPT_MASTERY_SOURCE],
    },
    {
      provide: GetFlashcardAnalyticsUseCase,
      useFactory: (source: FlashcardAnalyticsSource) => new GetFlashcardAnalyticsUseCase(source),
      inject: [FLASHCARD_ANALYTICS_SOURCE],
    },
    {
      provide: GetGamificationSummaryUseCase,
      useFactory: (source: FlashcardAnalyticsSource) => new GetGamificationSummaryUseCase(source),
      inject: [FLASHCARD_ANALYTICS_SOURCE],
    },
    {
      provide: GetGamificationProgressUseCase,
      useFactory: (source: FlashcardAnalyticsSource, conquest: GetConquestSummaryUseCase) =>
        new GetGamificationProgressUseCase(source, conquest),
      inject: [FLASHCARD_ANALYTICS_SOURCE, GetConquestSummaryUseCase],
    },
    {
      provide: GetBuilderSummaryUseCase,
      useFactory: (creation: ContentCreationSource, graph: GraphBreadthSource) =>
        new GetBuilderSummaryUseCase(creation, graph),
      inject: [CONTENT_CREATION_SOURCE, GRAPH_BREADTH_SOURCE],
    },
    {
      provide: GetProvaAnalyticsUseCase,
      useFactory: (source: ProvaAnalyticsSource) => new GetProvaAnalyticsUseCase(source),
      inject: [PROVA_ANALYTICS_SOURCE],
    },
    {
      provide: GetDeckAnalyticsUseCase,
      useFactory: (source: DeckAnalyticsSource) => new GetDeckAnalyticsUseCase(source),
      inject: [DECK_ANALYTICS_SOURCE],
    },
    {
      provide: GetFlashcardItemAnalyticsUseCase,
      useFactory: (source: FlashcardItemSource) => new GetFlashcardItemAnalyticsUseCase(source),
      inject: [FLASHCARD_ITEM_SOURCE],
    },
    {
      provide: GetQuestaoItemAnalyticsUseCase,
      useFactory: (source: QuestaoItemSource) => new GetQuestaoItemAnalyticsUseCase(source),
      inject: [QUESTAO_ITEM_SOURCE],
    },
    {
      provide: GetFeynmanAnalyticsUseCase,
      useFactory: (source: FeynmanAnalyticsSource) => new GetFeynmanAnalyticsUseCase(source),
      inject: [FEYNMAN_ANALYTICS_SOURCE],
    },
  ],
})
export class AnalyticsModule {}
