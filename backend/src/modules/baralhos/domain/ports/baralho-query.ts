import type { BaralhoDetail, BaralhoListItem } from '../baralho-views';

// Read port for the user's decks: listing with card counts and graph origins.
export interface BaralhoQuery {
  listBaralhos(userId: string): Promise<BaralhoListItem[]>;
  getBaralho(userId: string, baralhoId: string): Promise<BaralhoDetail | null>;
}

export const BARALHO_QUERY = Symbol('BARALHO_QUERY');
