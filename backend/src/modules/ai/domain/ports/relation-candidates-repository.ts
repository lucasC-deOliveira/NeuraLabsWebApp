import type { RelationCandidate } from '../services/nota-relation-suggestions';

// Read port: the structural nodes a note could relate to (the suggestion candidates).
export interface RelationCandidatesRepository {
  loadCandidates(userId: string, grafoId: string): Promise<RelationCandidate[]>;
}

export const RELATION_CANDIDATES_REPOSITORY = Symbol('RELATION_CANDIDATES_REPOSITORY');
