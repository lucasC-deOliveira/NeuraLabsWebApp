import {
  buildStudyAidMessages,
  parseStudyAid,
  studyAidMaxTokens,
  type StudyAidCard,
  type StudyAidMode,
} from '../../domain/services/study-aid-prompt';
import type { LlmPort } from '../../domain/ports/llm-port';

export interface StudyAidResult {
  texto: string;
}

/**
 * Gera uma dica socrática ou um mnemônico para um card durante a sessão de estudo.
 * Uma chamada, sem contexto do grafo — barato. A dica nunca recebe a resposta no
 * prompt, então não pode vazá-la (ver study-aid-prompt).
 * @example generateStudyAid.execute('u1', 'hint', { pergunta, resposta, conceito })
 */
export class GenerateStudyAidUseCase {
  constructor(private readonly llm: LlmPort) {}

  async execute(userId: string, mode: StudyAidMode, card: StudyAidCard): Promise<StudyAidResult> {
    const raw = await this.llm.complete({
      userId,
      maxTokens: studyAidMaxTokens(),
      messages: buildStudyAidMessages(mode, card),
    });
    return { texto: parseStudyAid(raw || '') };
  }
}
