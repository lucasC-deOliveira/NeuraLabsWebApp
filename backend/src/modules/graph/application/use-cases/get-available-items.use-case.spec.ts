import { describe, it, expect } from 'vitest';
import { GetAvailableItemsUseCase } from './get-available-items.use-case';
import type {
  AvailableItemsQuery,
  AvailableItemsView,
} from '../../domain/ports/available-items-query';

const view: AvailableItemsView = {
  flashcards: [
    { id: 'f1', label: 'Q', fullText: 'Q', tipo: 'FLASHCARD', hierarquia: 'Sem conceito' },
  ],
  notas: [],
  questoes: [],
  provas: [],
};

class FakeAvailableItemsQuery implements AvailableItemsQuery {
  calls: Array<{ userId: string; grafoId: string }> = [];
  async listForGraph(userId: string, grafoId: string): Promise<AvailableItemsView> {
    this.calls.push({ userId, grafoId });
    return view;
  }
}

describe('GetAvailableItemsUseCase', () => {
  it('delegates to the query and returns the grouped items', async () => {
    const query = new FakeAvailableItemsQuery();
    const res = await new GetAvailableItemsUseCase(query).execute('u1', 'g1');
    expect(res).toBe(view);
    expect(query.calls).toEqual([{ userId: 'u1', grafoId: 'g1' }]);
  });
});
