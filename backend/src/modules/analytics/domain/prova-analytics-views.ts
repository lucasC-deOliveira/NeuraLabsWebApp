// Read-model views para o analytics de questões/provas (usa as tentativas capturadas).

export interface ProvaScorePoint {
  date: string; // YYYY-MM-DD
  scorePct: number; // 0-100
}

// Progresso de uma prova ao longo das tentativas (curva de retakes).
export interface ProvaProgress {
  provaId: string;
  titulo: string;
  points: ProvaScorePoint[];
}

export interface HardQuestion {
  enunciado: string;
  total: number;
  wrong: number;
  accuracy: number; // 0-100
}

export interface TypeAccuracy {
  tipo: string;
  accuracy: number; // 0-100
  total: number;
}

export interface ProvaAnalytics {
  totals: { tentativas: number; provas: number; accuracy: number | null };
  progress: ProvaProgress[];
  hardestQuestions: HardQuestion[];
  accuracyByType: TypeAccuracy[];
}
