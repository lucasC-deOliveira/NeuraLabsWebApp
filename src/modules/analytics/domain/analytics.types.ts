// Tipos de leitura do analytics de flashcards (espelham o read-model do backend).

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
  date: string;
  accuracy: number; // 0-100
  reviews: number;
}

export interface ProfileAxis {
  axis: string;
  value: number; // 0-100
}

export interface ErrorTypeCount {
  tipo: string;
  count: number;
}

export interface SpeedBucket {
  bucket: string;
  accuracy: number;
  reviews: number;
}

export interface StudyStreak {
  current: number;
  calendar: { date: string; count: number }[];
}

export interface ProblemCard {
  pergunta: string;
  total: number;
  wrong: number;
  accuracy: number;
}

export interface FlashcardAnalytics {
  totals: { cards: number; reviews: number };
  retentionForecast: RetentionDay[];
  maturity: MaturityMix;
  accuracyTrend: AccuracyDay[];
  profile: ProfileAxis[];
  errorTaxonomy: ErrorTypeCount[];
  speedBuckets: SpeedBucket[];
  streak: StudyStreak;
  problemCards: ProblemCard[];
}
