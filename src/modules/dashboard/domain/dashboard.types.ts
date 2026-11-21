// Read-model types for the home dashboard. dashboard-owned; the infra adapter
// maps the @/lib/content-api shapes onto these.

export interface SubjectWithTopics {
  id: string;
  nome: string;
  descricao: string | null;
  topicos: { id: string; nome: string }[];
}

export interface SubjectSummary {
  id: string;
  nome: string;
  descricao: string | null;
  topicoCount: number;
}

export interface StudySessionEntry {
  id: string;
  examTitle?: string;
  dataInicio: Date;
  dataFim: Date | null;
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  avgConfidence: number;
}

export interface VaultDashboardMetrics {
  sessions: StudySessionEntry[];
  dueCardCount: number;
  accuracy: number | null;
  streak: number;
  examAttempts: number;
}

// The dashboard only needs each card's next-review date to count what's due.
export interface DueCandidate {
  spacedRepetition: { proximaRevisao: Date } | null;
}
