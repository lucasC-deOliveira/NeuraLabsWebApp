import type {
  AvailableItemsQuery,
  AvailableItemsView,
} from '../../domain/ports/available-items-query';

/**
 * Lists the user's entities not yet in the graph, grouped by kind, for the picker.
 * @example getAvailableItems.execute('u1', 'g1') // → AvailableItemsView
 */
export class GetAvailableItemsUseCase {
  constructor(private readonly items: AvailableItemsQuery) {}

  execute(userId: string, grafoId: string): Promise<AvailableItemsView> {
    return this.items.listForGraph(userId, grafoId);
  }
}
