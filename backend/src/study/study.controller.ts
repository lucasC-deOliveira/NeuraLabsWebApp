import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { StudyService } from './study.service';

@UseGuards(JwtAuthGuard)
@Controller('study')
export class StudyController {
  constructor(private readonly study: StudyService) {}

  @Post('session')
  start(@CurrentUser() userId: string) {
    return this.study.startSession(userId);
  }

  @Post('session/:id/end')
  end(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.study.endSession(userId, id);
  }

  @Post('review')
  review(
    @CurrentUser() userId: string,
    @Body() body: { flashcardId: string; respostaUsuario?: string; grade?: string; acertou?: boolean; nivelConfianca?: number; tempoResposta?: number; sessaoId?: string },
  ) {
    return this.study.submitReview(userId, body as any);
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
  syncVaultLog(
    @CurrentUser() userId: string,
    @Body() body: { sessions: any[] },
  ) {
    return this.study.syncVaultLog(userId, body.sessions ?? []);
  }
}
