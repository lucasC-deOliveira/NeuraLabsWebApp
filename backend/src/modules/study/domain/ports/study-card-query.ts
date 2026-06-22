// Read model for assembling a study session. Fields mirror the API response
// shown to the user (Portuguese), so it is a query projection, not an aggregate.
export interface StudyCardView {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  fase: string;
  learningStep: number;
}

// Read port: cards eligible for a new session (due reviews + brand-new cards).
export interface StudyCardQuery {
  findDueCards(userId: string): Promise<StudyCardView[]>;
  findNewCards(userId: string, limit: number): Promise<StudyCardView[]>;
}

export const STUDY_CARD_QUERY = Symbol('STUDY_CARD_QUERY');
