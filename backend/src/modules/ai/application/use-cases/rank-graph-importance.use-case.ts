import {
  rankConceitoImportance,
  type RankedConceito,
} from '../../domain/services/conceito-importance';
import type { ConceitoImportanceSource } from '../../domain/ports/conceito-importance-source';

const DEFAULT_PROVA_WEIGHT = 0.6;

/**
 * Ranks a graph's concepts by study importance, balancing past-exam frequency
 * (TESTA edges) with the edital's emphasis (topic breadth). `provaWeight` (0..1)
 * tunes the balance; defaults to slightly favoring what already fell in exams.
 * @example rankGraphImportance.execute('u1', 'g1', 0.6)
 */
export class RankGraphImportanceUseCase {
  constructor(private readonly source: ConceitoImportanceSource) {}

  async execute(
    userId: string,
    grafoId: string,
    provaWeight = DEFAULT_PROVA_WEIGHT,
  ): Promise<{ conceitos: RankedConceito[] }> {
    const rows = await this.source.load(userId, grafoId);
    return { conceitos: rankConceitoImportance(rows, provaWeight) };
  }
}
