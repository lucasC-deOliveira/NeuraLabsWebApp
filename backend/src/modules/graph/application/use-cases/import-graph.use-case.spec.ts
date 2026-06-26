import { describe, it, expect } from 'vitest';
import { ImportGraphUseCase } from './import-graph.use-case';
import type {
  GraphImportRepository,
  ImportResult,
} from '../../domain/ports/graph-import-repository';

class FakeGraphImportRepository implements GraphImportRepository {
  lastCall: { userId: string; grafoId: string; payload: unknown } | null = null;
  async importFromJson(userId: string, grafoId: string, payload: unknown): Promise<ImportResult> {
    this.lastCall = { userId, grafoId, payload };
    return { nodes: 2, edges: 1, reused: 0 };
  }
}

describe('ImportGraphUseCase', () => {
  it('delegates the import and returns its result', async () => {
    const repo = new FakeGraphImportRepository();
    const payload = { nodes: [], edges: [] };
    const res = await new ImportGraphUseCase(repo).execute('u1', 'g1', payload);
    expect(res).toEqual({ nodes: 2, edges: 1, reused: 0 });
    expect(repo.lastCall).toEqual({ userId: 'u1', grafoId: 'g1', payload });
  });
});
