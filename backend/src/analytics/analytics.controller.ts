import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { clampDays } from '../modules/analytics/domain/services/period';
import { GetFlashcardAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-analytics.use-case';
import { GetProvaAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-prova-analytics.use-case';
import { GetDeckAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-deck-analytics.use-case';
import { TtlCache } from '../modules/analytics/infrastructure/cache/ttl-cache';
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
    private readonly cache: TtlCache,
  ) {}

  @Get('flashcards')
  flashcards(
    @CurrentUser() userId: string,
    @Query('days') days?: string,
    @Query('baralhoId') baralhoId?: string,
    @Query('assuntoId') assuntoId?: string,
  ): Promise<FlashcardAnalytics> {
    const window = clampDays(days);
    const deck = baralhoId || undefined;
    const subject = assuntoId || undefined;
    const key = `fc:${userId}:${window}:${deck ?? ''}:${subject ?? ''}`;
    return this.cache.getOrCompute(key, () =>
      this.getFlashcardAnalytics.execute(userId, window, deck, subject),
    );
  }

  @Get('provas')
  provas(
    @CurrentUser() userId: string,
    @Query('days') days?: string,
    @Query('provaId') provaId?: string,
  ): Promise<ProvaAnalytics> {
    const window = clampDays(days);
    const prova = provaId || undefined;
    const key = `prova:${userId}:${window}:${prova ?? ''}`;
    return this.cache.getOrCompute(key, () =>
      this.getProvaAnalytics.execute(userId, window, prova),
    );
  }

  @Get('decks')
  decks(@CurrentUser() userId: string, @Query('days') days?: string): Promise<DeckAnalytics> {
    const window = clampDays(days);
    const key = `deck:${userId}:${window}`;
    return this.cache.getOrCompute(key, () => this.getDeckAnalytics.execute(userId, window));
  }
}
