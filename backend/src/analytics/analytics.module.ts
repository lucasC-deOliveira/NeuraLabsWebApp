import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { GetFlashcardAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-analytics.use-case';
import { GetProvaAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-prova-analytics.use-case';
import { GetDeckAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-deck-analytics.use-case';
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
import { PrismaFlashcardAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-flashcard-analytics.source';
import { PrismaProvaAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-prova-analytics.source';
import { PrismaDeckAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-deck-analytics.source';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: FLASHCARD_ANALYTICS_SOURCE, useClass: PrismaFlashcardAnalyticsSource },
    { provide: PROVA_ANALYTICS_SOURCE, useClass: PrismaProvaAnalyticsSource },
    { provide: DECK_ANALYTICS_SOURCE, useClass: PrismaDeckAnalyticsSource },
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
  ],
})
export class AnalyticsModule {}
