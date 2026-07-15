import { describe, it, expect } from 'vitest';
import { RankGraphImportanceUseCase } from './rank-graph-importance.use-case';
import type { ConceitoImportanceSource } from '../../../curriculum/domain/ports/conceito-importance-source';
import type { ImportanceRow } from '../../../curriculum/domain/services/conceito-importance';

class FakeSource implements ConceitoImportanceSource {
  constructor(private readonly rows: ImportanceRow[]) {}
  async load(): Promise<ImportanceRow[]> {
    return this.rows;
  }
}

describe('RankGraphImportanceUseCase', () => {
  it('returns concepts ranked by the balanced importance score', async () => {
    const source = new FakeSource([
      { conceitoId: 'a', nome: 'A', topicoId: 't1', provaFreq: 6 },
      { conceitoId: 'b', nome: 'B', topicoId: 't1', provaFreq: 0 },
    ]);
    const { conceitos } = await new RankGraphImportanceUseCase(source).execute('u1', 'g1', 1);
    expect(conceitos.map((c) => c.conceitoId)).toEqual(['a', 'b']);
    expect(conceitos[0].importancia).toBe(1);
  });

  it('returns an empty list for a graph with no concepts', async () => {
    const { conceitos } = await new RankGraphImportanceUseCase(new FakeSource([])).execute(
      'u1',
      'g1',
    );
    expect(conceitos).toEqual([]);
  });
});
