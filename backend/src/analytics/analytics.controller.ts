import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { clampDays } from '../modules/analytics/domain/services/period';
import { GetFlashcardAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-analytics.use-case';
import { GetProvaAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-prova-analytics.use-case';
import { GetDeckAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-deck-analytics.use-case';
import type { FlashcardAnalytics } from '../modules/analytics/domain/analytics-views';
import type { ProvaAnalytics } from '../modules/analytics/domain/prova-analytics-views';
import type { DeckAnalytics } from '../modules/analytics/domain/deck-analytics-views';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly getFlashcardAnalytics: GetFlashcardAnalyticsUseCase,
    private readonly getProvaAnalytics: GetProvaAnalyticsUseCase,
    private readonly getDeckAnalytics: GetDeckAnalyticsUseCase,
  ) {}

  @Get('flashcards')
  flashcards(
    @CurrentUser() userId: string,
    @Query('days') days?: string,
  ): Promise<FlashcardAnalytics> {
    return this.getFlashcardAnalytics.execute(userId, clampDays(days));
  }

  @Get('provas')
  provas(@CurrentUser() userId: string, @Query('days') days?: string): Promise<ProvaAnalytics> {
    return this.getProvaAnalytics.execute(userId, clampDays(days));
  }

  @Get('decks')
  decks(@CurrentUser() userId: string, @Query('days') days?: string): Promise<DeckAnalytics> {
    return this.getDeckAnalytics.execute(userId, clampDays(days));
  }
}
