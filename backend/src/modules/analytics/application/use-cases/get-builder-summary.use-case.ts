import { addDays } from '../../domain/services/date-key';
import { studyStreak } from '../../domain/services/study-streak';
import { builderSummary, type BuilderSummary } from '../../domain/services/builder-summary';
import type { ContentCreationSource } from '../../domain/ports/content-creation-source';
import type { GraphBreadthSource } from '../../domain/ports/graph-breadth-source';

// Janela larga o bastante para a maior ofensiva plausível (e para o "novo
// território" recente) — a mesma escala do resumo de hábito.
const CREATION_WINDOW_DAYS = 400;

/**
 * Resumo do eixo Construtor & Explorador: ofensiva de criação + totais criados +
 * amplitude do mapa + badges + território novo. Reusa a ofensiva (studyStreak).
 * @example useCase.execute('u1')
 */
export class GetBuilderSummaryUseCase {
  constructor(
    private readonly creation: ContentCreationSource,
    private readonly graph: GraphBreadthSource,
  ) {}

  async execute(userId: string): Promise<BuilderSummary> {
    const now = new Date();
    const since = addDays(now, -CREATION_WINDOW_DAYS);
    const [events, createdTotals, breadth, recentTerritory] = await Promise.all([
      this.creation.creationEvents(userId, since),
      this.creation.creationTotals(userId),
      this.graph.breadth(userId),
      this.graph.recentTerritory(userId, since),
    ]);
    const creationStreak = studyStreak(events, now).current;
    return builderSummary({ creationStreak, createdTotals, breadth, recentTerritory });
  }
}
