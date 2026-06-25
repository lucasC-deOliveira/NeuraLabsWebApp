import type { AssessmentContextData } from '../services/assessment-context';

// Read port: the data needed to assess a graph's completeness (subjects, their
// topics/concepts, the node links and the PERTENCE_A edges).
export interface CompletenessRepository {
  loadAssessmentData(userId: string, grafoId: string): Promise<AssessmentContextData>;
}

export const COMPLETENESS_REPOSITORY = Symbol('COMPLETENESS_REPOSITORY');
