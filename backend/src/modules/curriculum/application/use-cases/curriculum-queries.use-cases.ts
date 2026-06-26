import type { CurriculumQuery } from '../../domain/ports/curriculum-query';
import type {
  ConceptHierarchyAssunto,
  FilterAssunto,
  SubjectSummary,
  TreeAssunto,
} from '../../domain/curriculum-views';

/** Lists the user's subjects with their topics (home). */
export class ListSubjectsUseCase {
  constructor(private readonly query: CurriculumQuery) {}
  execute(userId: string): Promise<SubjectSummary[]> {
    return this.query.listSubjects(userId);
  }
}

/** Subject → topic → concept hierarchy (concept dropdown). */
export class GetConceptHierarchyUseCase {
  constructor(private readonly query: CurriculumQuery) {}
  execute(userId: string): Promise<ConceptHierarchyAssunto[]> {
    return this.query.conceptHierarchy(userId);
  }
}

/** Full Assunto → Tópico → Conceito tree (with relation labels). */
export class GetHierarquiaTreeUseCase {
  constructor(private readonly query: CurriculumQuery) {}
  execute(userId: string): Promise<TreeAssunto[]> {
    return this.query.hierarquiaTree(userId);
  }
}

/** Subjects → topics, for flashcard filters. */
export class GetFlashcardFiltersUseCase {
  constructor(private readonly query: CurriculumQuery) {}
  execute(userId: string): Promise<FilterAssunto[]> {
    return this.query.flashcardFilterData(userId);
  }
}
