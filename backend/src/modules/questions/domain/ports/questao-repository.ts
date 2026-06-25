import type { CreateQuestaoInput, OwnedQuestao, QuestaoView } from '../questao';

export type UpdateQuestaoPatch = Partial<CreateQuestaoInput>;

// Persistence port for exam questions.
export interface QuestaoRepository {
  create(userId: string, input: CreateQuestaoInput): Promise<string>;
  listByUser(userId: string): Promise<QuestaoView[]>;
  findById(id: string): Promise<OwnedQuestao | null>;
  update(id: string, patch: UpdateQuestaoPatch): Promise<void>;
  delete(id: string): Promise<void>;
}

export const QUESTAO_REPOSITORY = Symbol('QUESTAO_REPOSITORY');
