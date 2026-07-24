export interface FeynmanClarezaDay {
  date: string;
  clareza: number; // 0-100
  count: number;
}

export interface FeynmanAnalytics {
  totals: { explicacoes: number; alvos: number };
  clarezaMedia: number | null;
  clarezaTrend: FeynmanClarezaDay[];
}
