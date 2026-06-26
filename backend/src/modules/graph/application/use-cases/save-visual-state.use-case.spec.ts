import { describe, it, expect } from 'vitest';
import { SaveVisualStateUseCase } from './save-visual-state.use-case';
import type { GraphVisualStateRepository } from '../../domain/ports/graph-visual-state-repository';

class FakeVisualStateRepository implements GraphVisualStateRepository {
  saved: { userId: string; grafoId: string; serialized: string } | null = null;
  async save(userId: string, grafoId: string, serialized: string): Promise<void> {
    this.saved = { userId, grafoId, serialized };
  }
  async loadRaw(): Promise<string | null> {
    return null;
  }
}

describe('SaveVisualStateUseCase', () => {
  it('serializes the state as JSON and reports success', async () => {
    const repo = new FakeVisualStateRepository();
    const res = await new SaveVisualStateUseCase(repo).execute('u1', 'g1', { zoom: 2 });
    expect(res).toEqual({ success: true });
    expect(repo.saved).toEqual({ userId: 'u1', grafoId: 'g1', serialized: '{"zoom":2}' });
  });
});
