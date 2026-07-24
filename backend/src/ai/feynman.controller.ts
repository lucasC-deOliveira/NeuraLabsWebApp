import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GradeFeynmanExplanationUseCase } from '../modules/ai/application/use-cases/grade-feynman-explanation.use-case';
import { SaveFeynmanExplanationUseCase } from '../modules/ai/application/use-cases/save-feynman-explanation.use-case';
import type { FeynmanAlvoTipo } from '../modules/ai/domain/ports/feynman-context-source';
import type { FeynmanFeedback } from '../modules/ai/domain/feynman-views';

const ALVO_TIPOS = ['CONCEITO', 'FLASHCARD'];

interface AttemptBody {
  alvoTipo?: string;
  alvoId?: string;
  texto?: string;
  clareza?: number;
  lacunas?: unknown;
  jargao?: unknown;
}

@UseGuards(JwtAuthGuard)
@Controller('feynman')
export class FeynmanController {
  constructor(
    private readonly grade: GradeFeynmanExplanationUseCase,
    private readonly save: SaveFeynmanExplanationUseCase,
  ) {}

  // Avalia uma explicação Feynman de um conceito/flashcard (clareza, jargão, lacunas...).
  @Post('grade')
  async gradeExplanation(
    @CurrentUser() userId: string,
    @Body() body: { alvoTipo?: string; alvoId?: string; texto?: string },
  ): Promise<FeynmanFeedback> {
    const tipo = (body.alvoTipo ?? '').toUpperCase();
    if (!ALVO_TIPOS.includes(tipo) || !body.alvoId || !body.texto?.trim()) {
      throw new BadRequestException(
        'invalid body: expected { alvoTipo: CONCEITO|FLASHCARD, alvoId, texto }',
      );
    }
    const fb = await this.grade.execute(userId, tipo as FeynmanAlvoTipo, body.alvoId, body.texto);
    if (!fb) throw new NotFoundException(`target not found: "${tipo}/${body.alvoId}"`);
    return fb;
  }

  // Persiste a explicação (histórico) e agenda a re-explicação (SM-2-lite).
  @Post('attempts')
  @HttpCode(204)
  async saveAttempt(@CurrentUser() userId: string, @Body() body: AttemptBody): Promise<void> {
    const tipo = (body.alvoTipo ?? '').toUpperCase();
    if (
      !ALVO_TIPOS.includes(tipo) ||
      !body.alvoId ||
      !body.texto?.trim() ||
      typeof body.clareza !== 'number'
    ) {
      throw new BadRequestException(
        'invalid body: expected { alvoTipo, alvoId, texto, clareza, lacunas?, jargao? }',
      );
    }
    await this.save.execute(userId, tipo as FeynmanAlvoTipo, body.alvoId, {
      texto: body.texto,
      clareza: body.clareza,
      lacunas: body.lacunas ?? [],
      jargao: body.jargao ?? [],
    });
  }
}
