import type { StudyCardView } from './study-card-query';

// Read model for studying a specific deck: due cards + deck title + total size.
export interface DeckStudyView {
  titulo: string;
  cards: StudyCardView[];
  totalNoDeck: number;
}

// Read port: the due cards of a deck owned by the user (null if not found).
export interface StudyDeckQuery {
  findDeckForStudy(userId: string, baralhoId: string): Promise<DeckStudyView | null>;
}

export const STUDY_DECK_QUERY = Symbol('STUDY_DECK_QUERY');
