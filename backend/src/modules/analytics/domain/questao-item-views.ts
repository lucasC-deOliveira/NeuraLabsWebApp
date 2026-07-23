// Um ponto do histórico: uma resposta àquela questão, em ordem cronológica.
export interface QuestaoAttemptPoint {
  date: string; // ISO date da tentativa
  acertou: boolean;
}

// Distribuição das alternativas escolhidas ao responder a questão.
export interface AlternativeShare {
  opcao: string; // texto/rótulo da alternativa escolhida
  count: number;
  pct: number; // 0-100 sobre o total de respostas
  correta: boolean; // é o gabarito
}

// Analytics de UMA questão: respostas daquele item ao longo das tentativas.
export interface QuestaoItemAnalytics {
  enunciado: string;
  totals: { respostas: number; wrong: number };
  accuracy: number | null; // 0-100; null sem respostas
  history: QuestaoAttemptPoint[];
  alternativas: AlternativeShare[];
}
