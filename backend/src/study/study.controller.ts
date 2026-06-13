import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
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
    @Body() body: { flashcardId: string; respostaUsuario: string; acertou: boolean; nivelConfianca: number; tipoErro?: string; tempoResposta?: number; sessaoId?: string },
  ) {
    return this.study.submitReview(userId, body);
  }
}
