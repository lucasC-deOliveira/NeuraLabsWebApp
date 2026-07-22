import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetFlashcardAnalyticsUseCase } from '../modules/analytics/application/use-cases/get-flashcard-analytics.use-case';
import type { FlashcardAnalytics } from '../modules/analytics/domain/analytics-views';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly getFlashcardAnalytics: GetFlashcardAnalyticsUseCase) {}

  @Get('flashcards')
  flashcards(@CurrentUser() userId: string): Promise<FlashcardAnalytics> {
    return this.getFlashcardAnalytics.execute(userId);
  }
}
