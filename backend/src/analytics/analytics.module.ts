import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { GetFlashcardAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-analytics.use-case';
import { GetProvaAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-prova-analytics.use-case';
import { GetDeckAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-deck-analytics.use-case';
import { GetFlashcardItemAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-item-analytics.use-case';
import { GetQuestaoItemAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-questao-item-analytics.use-case';
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
    {
      provide: GetFlashcardAnalyticsUseCase,
      useFactory: (source: FlashcardAnalyticsSource) => new GetFlashcardAnalyticsUseCase(source),
      inject: [FLASHCARD_ANALYTICS_SOURCE],
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
  ],
})
export class AnalyticsModule {}
