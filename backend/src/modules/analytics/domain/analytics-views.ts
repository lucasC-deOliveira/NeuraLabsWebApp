// Read-model views for study analytics (flashcards). Shaped for the charts.

export interface RetentionDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface MaturityMix {
  learning: number;
  young: number;
  mature: number;
}

export interface AccuracyDay {
  date: string; // YYYY-MM-DD
  accuracy: number; // 0-100
  reviews: number;
}

// Um eixo do radar de perfil (valor normalizado 0-100).
export interface ProfileAxis {
  axis: string;
  value: number;
}

export interface FlashcardAnalytics {
  totals: { cards: number; reviews: number };
  retentionForecast: RetentionDay[];
  maturity: MaturityMix;
  accuracyTrend: AccuracyDay[];
  profile: ProfileAxis[];
}
