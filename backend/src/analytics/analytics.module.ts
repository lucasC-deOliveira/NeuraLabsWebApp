import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './analytics.controller';
import { GetFlashcardAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-analytics.use-case';
import {
  FLASHCARD_ANALYTICS_SOURCE,
  type FlashcardAnalyticsSource,
} from '../modules/analytics/domain/ports/flashcard-analytics-source';
import { PrismaFlashcardAnalyticsSource } from '../modules/analytics/infrastructure/persistence/prisma-flashcard-analytics.source';

@Module({
  imports: [AuthModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: FLASHCARD_ANALYTICS_SOURCE, useClass: PrismaFlashcardAnalyticsSource },
    {
      provide: GetFlashcardAnalyticsUseCase,
      useFactory: (source: FlashcardAnalyticsSource) => new GetFlashcardAnalyticsUseCase(source),
      inject: [FLASHCARD_ANALYTICS_SOURCE],
    },
  ],
})
export class AnalyticsModule {}
