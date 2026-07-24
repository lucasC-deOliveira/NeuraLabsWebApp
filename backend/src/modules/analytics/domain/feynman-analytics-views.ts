// Clareza média por dia (0-100) + nº de explicações naquele dia.
export interface FeynmanClarezaDay {
  date: string;
  clareza: number;
  count: number;
}

// Analytics da Técnica Feynman: quanto se explicou e como a clareza evolui.
export interface FeynmanAnalytics {
  totals: { explicacoes: number; alvos: number };
  clarezaMedia: number | null; // 0-100; null sem explicações
  clarezaTrend: FeynmanClarezaDay[];
}
