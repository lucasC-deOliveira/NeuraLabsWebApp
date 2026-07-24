import { parseAiJson } from '../../domain/services/ai-json';
import { buildFeynmanMessages } from '../../domain/services/feynman-prompt';
import { parseFeynmanFeedback } from '../../domain/services/feynman-feedback';
import type { FeynmanAngulo } from '../../domain/services/feynman-angulo';
import type {
  FeynmanAlvoTipo,
  FeynmanContextSource,
} from '../../domain/ports/feynman-context-source';
import type { FeynmanFeedback } from '../../domain/feynman-views';
import type { LlmPort } from '../../domain/ports/llm-port';

/**
 * Avalia uma explicação pela Técnica Feynman: monta o contexto do alvo (conceito
 * ou flashcard) e pede à LLM clareza + jargão + lacunas→conceitos + analogia/reescrita.
 * Retorna null quando o alvo não existe/não é do usuário (o controller → 404).
 * @example grade.execute('u1', 'CONCEITO', 'c1', 'Heap é tipo uma fila...')
 */
export class GradeFeynmanExplanationUseCase {
  constructor(
    private readonly source: FeynmanContextSource,
    private readonly llm: LlmPort,
  ) {}

  async execute(
    userId: string,
    tipo: FeynmanAlvoTipo,
    id: string,
    texto: string,
    angulo: FeynmanAngulo = 'SIMPLES',
  ): Promise<FeynmanFeedback | null> {
    const ctx = await this.source.load(userId, tipo, id);
    if (!ctx) return null;
    const messages = buildFeynmanMessages(ctx, texto, angulo);
    const content = await this.llm.complete({ userId, messages });
    return parseFeynmanFeedback(parseAiJson(content || '{}'), ctx.candidatos);
  }
}
