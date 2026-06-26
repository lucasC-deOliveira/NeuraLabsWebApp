import { Body, Controller, Get, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  SubmitReviewUseCase,
  type SubmitReviewCommand,
} from '../modules/study/application/use-cases/submit-review.use-case';
import { StartSessionUseCase } from '../modules/study/application/use-cases/start-session.use-case';
import { EndSessionUseCase } from '../modules/study/application/use-cases/end-session.use-case';
import { FinalizeSessionUseCase } from '../modules/study/application/use-cases/finalize-session.use-case';
import { GetFlashcardForStudyUseCase } from '../modules/study/application/use-cases/get-flashcard-for-study.use-case';
import { StartSingleCardStudyUseCase } from '../modules/study/application/use-cases/start-single-card-study.use-case';
import { StartDeckStudyUseCase } from '../modules/study/application/use-cases/start-deck-study.use-case';
import {
  SyncVaultLogUseCase,
  type VaultSessionInput,
} from '../modules/study/application/use-cases/sync-vault-log.use-case';
import { StudyDomainExceptionFilter } from '../modules/study/interface/study-domain-exception.filter';

@UseGuards(JwtAuthGuard)
@UseFilters(StudyDomainExceptionFilter)
@Controller('study')
export class StudyController {
  constructor(
    private readonly submitReview: SubmitReviewUseCase,
    private readonly startSession: StartSessionUseCase,
    private readonly endSession: EndSessionUseCase,
    private readonly finalizeSession: FinalizeSessionUseCase,
    private readonly getFlashcardForStudy: GetFlashcardForStudyUseCase,
    private readonly startSingleCardStudy: StartSingleCardStudyUseCase,
    private readonly startDeckStudy: StartDeckStudyUseCase,
    private readonly syncVaultLog: SyncVaultLogUseCase,
  ) {}

  @Post('session')
  start(@CurrentUser() userId: string) {
    return this.startSession.execute(userId);
  }

  @Post('session/:id/end')
  end(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.endSession.execute(userId, id);
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
    return this.startDeckStudy.execute(userId, baralhoId);
  }

  @Get('flashcard/:flashcardId')
  flashcardForStudy(@CurrentUser() userId: string, @Param('flashcardId') flashcardId: string) {
    return this.getFlashcardForStudy.execute(userId, flashcardId);
  }

  @Post('flashcard/:flashcardId/start')
  startSingleCard(@CurrentUser() userId: string, @Param('flashcardId') flashcardId: string) {
    return this.startSingleCardStudy.execute(userId, flashcardId);
  }

  @Post('session/:id/finalize')
  finalize(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.finalizeSession.execute(userId, id);
  }

  @Post('sync-vault-log')
  sync(@CurrentUser() userId: string, @Body() body: { sessions?: VaultSessionInput[] }) {
    return this.syncVaultLog.execute(userId, body.sessions ?? []);
  }
}
