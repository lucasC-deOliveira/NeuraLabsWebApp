// Tipos de leitura do analytics por baralho (espelham o backend).

export interface DeckStat {
  baralhoId: string;
  titulo: string;
  cards: number;
  mature: number;
  due: number;
  reviewed: number;
  accuracy: number | null;
}

export interface DeckAnalytics {
  totals: { decks: number; cards: number };
  decks: DeckStat[];
}
