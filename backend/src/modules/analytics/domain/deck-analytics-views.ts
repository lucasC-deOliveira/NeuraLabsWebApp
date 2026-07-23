// Read-model views para o analytics por baralho.

export interface DeckStat {
  baralhoId: string;
  titulo: string;
  cards: number;
  mature: number; // cartas maduras (intervalo >= 21d)
  due: number; // cartas a revisar (novas ou vencidas)
  reviewed: number; // cartas com ao menos uma revisão
  accuracy: number | null; // 0-100, ou null se nunca revisou
}

export interface DeckAnalytics {
  totals: { decks: number; cards: number };
  decks: DeckStat[];
}
