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
import {
  SaveFeynmanSessionUseCase,
  type FeynmanSessionExplanation,
} from '../modules/ai/application/use-cases/save-feynman-session.use-case';
import { parseFeynmanAngulo } from '../modules/ai/domain/services/feynman-angulo';
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

interface SessionItemBody {
  angulo?: string;
  texto?: string;
  clareza?: number;
  lacunas?: unknown;
  jargao?: unknown;
}

interface SessionBody {
  alvoTipo?: string;
  alvoId?: string;
  explicacoes?: SessionItemBody[];
}

// Mantém só os ângulos preenchidos e válidos; normaliza o ângulo e a clareza.
function toSessionExplanations(items: SessionItemBody[]): FeynmanSessionExplanation[] {
  return items
    .filter((i) => typeof i?.texto === 'string' && i.texto.trim() && typeof i.clareza === 'number')
    .map((i) => ({
      angulo: parseFeynmanAngulo(i.angulo),
      texto: i.texto as string,
      clareza: i.clareza as number,
      lacunas: i.lacunas ?? [],
      jargao: i.jargao ?? [],
    }));
}

@UseGuards(JwtAuthGuard)
@Controller('feynman')
export class FeynmanController {
  constructor(
    private readonly grade: GradeFeynmanExplanationUseCase,
    private readonly save: SaveFeynmanExplanationUseCase,
    private readonly saveSession: SaveFeynmanSessionUseCase,
  ) {}

  // Avalia uma explicação Feynman de um conceito/flashcard, sob um ângulo (clareza,
  // jargão, lacunas...). O ângulo muda a régua: simples | analogia | técnico.
  @Post('grade')
  async gradeExplanation(
    @CurrentUser() userId: string,
    @Body() body: { alvoTipo?: string; alvoId?: string; texto?: string; angulo?: string },
  ): Promise<FeynmanFeedback> {
    const tipo = (body.alvoTipo ?? '').toUpperCase();
    if (!ALVO_TIPOS.includes(tipo) || !body.alvoId || !body.texto?.trim()) {
      throw new BadRequestException(
        'invalid body: expected { alvoTipo: CONCEITO|FLASHCARD, alvoId, texto, angulo? }',
      );
    }
    const angulo = parseFeynmanAngulo(body.angulo);
    const fb = await this.grade.execute(
      userId,
      tipo as FeynmanAlvoTipo,
      body.alvoId,
      body.texto,
      angulo,
    );
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

  // Salva uma sessão de 3 ângulos: grava cada ângulo (histórico), agenda pela clareza
  // do mais fraco e publica UMA nota combinada no grafo.
  @Post('sessions')
  @HttpCode(204)
  async saveSessionAttempt(@CurrentUser() userId: string, @Body() body: SessionBody): Promise<void> {
    const tipo = (body.alvoTipo ?? '').toUpperCase();
    const explicacoes = toSessionExplanations(body.explicacoes ?? []);
    if (!ALVO_TIPOS.includes(tipo) || !body.alvoId || explicacoes.length === 0) {
      throw new BadRequestException(
        'invalid body: expected { alvoTipo, alvoId, explicacoes: [{ angulo, texto, clareza }] }',
      );
    }
    await this.saveSession.execute(userId, tipo as FeynmanAlvoTipo, body.alvoId, explicacoes);
  }
}
