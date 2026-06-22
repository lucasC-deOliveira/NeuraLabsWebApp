import { Body, Controller, Get, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StudyService } from './study.service';
import {
  SubmitReviewUseCase,
  type SubmitReviewCommand,
} from '../modules/study/application/use-cases/submit-review.use-case';
import { StartSessionUseCase } from '../modules/study/application/use-cases/start-session.use-case';
import { StudyDomainExceptionFilter } from '../modules/study/interface/study-domain-exception.filter';

@UseGuards(JwtAuthGuard)
@UseFilters(StudyDomainExceptionFilter)
@Controller('study')
export class StudyController {
  constructor(
    private readonly study: StudyService,
    private readonly submitReview: SubmitReviewUseCase,
    private readonly startSession: StartSessionUseCase,
  ) {}

  @Post('session')
  start(@CurrentUser() userId: string) {
    return this.startSession.execute(userId);
  }

  @Post('session/:id/end')
  end(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.study.endSession(userId, id);
  }

  @Post('review')
  review(
    @CurrentUser() userId: string,
    @Body() body: Omit<SubmitReviewCommand, 'userId'>,
  ): Promise<{ success: boolean }> {
    return this.submitReview.execute({ ...body, userId });
  }

  @Post('deck/:baralhoId')
  startDeck(@CurrentUser() userId: string, @Param('baralhoId') baralhoId: string) {
    return this.study.startDeckStudy(userId, baralhoId);
  }

  @Get('flashcard/:flashcardId')
  flashcardForStudy(@CurrentUser() userId: string, @Param('flashcardId') flashcardId: string) {
    return this.study.getFlashcardForStudy(userId, flashcardId);
  }

  @Post('flashcard/:flashcardId/start')
  startSingleCard(@CurrentUser() userId: string, @Param('flashcardId') flashcardId: string) {
    return this.study.startSingleCardStudy(userId, flashcardId);
  }

  @Post('session/:id/finalize')
  finalize(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.study.finalizeSession(userId, id);
  }

  @Post('sync-vault-log')
  syncVaultLog(@CurrentUser() userId: string, @Body() body: { sessions: any[] }) {
    return this.study.syncVaultLog(userId, body.sessions ?? []);
  }
}
