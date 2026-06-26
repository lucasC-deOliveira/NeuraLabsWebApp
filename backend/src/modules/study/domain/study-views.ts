// Summary of a study session for the history view.
export interface StudySessionSummary {
  id: string;
  dataInicio: Date;
  dataFim: Date | null;
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  avgConfidence: number;
}
