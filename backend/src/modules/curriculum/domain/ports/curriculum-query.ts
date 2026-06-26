import type {
  ConceptHierarchyAssunto,
  FilterAssunto,
  SubjectSummary,
  TreeAssunto,
} from '../curriculum-views';

// Read port for the curriculum hierarchy in its various shapes.
export interface CurriculumQuery {
  listSubjects(userId: string): Promise<SubjectSummary[]>;
  conceptHierarchy(userId: string): Promise<ConceptHierarchyAssunto[]>;
  hierarquiaTree(userId: string): Promise<TreeAssunto[]>;
  flashcardFilterData(userId: string): Promise<FilterAssunto[]>;
}

export const CURRICULUM_QUERY = Symbol('CURRICULUM_QUERY');
