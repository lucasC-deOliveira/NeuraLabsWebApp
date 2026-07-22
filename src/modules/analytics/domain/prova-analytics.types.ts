// Tipos de leitura do analytics de questões/provas (espelham o backend).

export interface ProvaScorePoint {
  date: string;
  scorePct: number;
}

export interface ProvaProgress {
  provaId: string;
  titulo: string;
  points: ProvaScorePoint[];
}

export interface HardQuestion {
  enunciado: string;
  total: number;
  wrong: number;
  accuracy: number;
}

export interface TypeAccuracy {
  tipo: string;
  accuracy: number;
  total: number;
}

export interface ProvaAnalytics {
  totals: { tentativas: number; provas: number; accuracy: number | null };
  progress: ProvaProgress[];
  hardestQuestions: HardQuestion[];
  accuracyByType: TypeAccuracy[];
}
