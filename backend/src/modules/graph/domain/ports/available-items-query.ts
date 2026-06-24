import type { AvailableItem } from '../services/available-item';

// Read model: entities the user owns that are not yet in the graph, grouped by
// kind, for the "add node" picker.
export interface AvailableItemsView {
  flashcards: AvailableItem[];
  notas: AvailableItem[];
  questoes: AvailableItem[];
  provas: AvailableItem[];
}

export interface AvailableItemsQuery {
  listForGraph(userId: string, grafoId: string): Promise<AvailableItemsView>;
}

export const AVAILABLE_ITEMS_QUERY = Symbol('AVAILABLE_ITEMS_QUERY');
