import { describe, it, expect } from 'vitest';
import { LoadVisualStateUseCase } from './load-visual-state.use-case';
import type { GraphVisualStateRepository } from '../../domain/ports/graph-visual-state-repository';

class FakeVisualStateRepository implements GraphVisualStateRepository {
  constructor(private readonly raw: string | null) {}
  async save(): Promise<void> {}
  async loadRaw(): Promise<string | null> {
    return this.raw;
  }
}

const load = (raw: string | null): Promise<unknown> =>
  new LoadVisualStateUseCase(new FakeVisualStateRepository(raw)).execute('u1', 'g1');

describe('LoadVisualStateUseCase', () => {
  it('parses the stored JSON', async () => {
    expect(await load('{"zoom":2}')).toEqual({ zoom: 2 });
  });

  it('returns null when no state is stored', async () => {
    expect(await load(null)).toBeNull();
  });

  it('returns null when the stored value is not valid JSON', async () => {
    expect(await load('not json')).toBeNull();
  });
});
