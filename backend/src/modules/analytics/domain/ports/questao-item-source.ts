// Uma resposta àquela questão numa tentativa do usuário.
export interface QuestaoAnswerRow {
  data: Date; // dataInicio da tentativa
  acertou: boolean;
  escolhida: string; // resposta_escolhida
}

// Enunciado + gabarito da questão (para marcar a alternativa correta).
export interface QuestaoItemMeta {
  enunciado: string;
  gabarito: string;
}

// Read port para os analytics de UMA questão.
export interface QuestaoItemSource {
  // Respostas do usuário àquela questão, em qualquer tentativa (cronológicas).
  questionAnswers(userId: string, questaoId: string): Promise<QuestaoAnswerRow[]>;
  // Enunciado + gabarito; null quando a questão não existe/não é do usuário.
  questionMeta(userId: string, questaoId: string): Promise<QuestaoItemMeta | null>;
}

export const QUESTAO_ITEM_SOURCE = Symbol('QUESTAO_ITEM_SOURCE');
