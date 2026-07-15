import type { CreateBaralhoInput, ImportedBaralho } from '../baralho-views';

// Write port for the user's decks. Every operation is tenant-scoped by userId:
// the adapter must never touch a deck of another user.
export interface BaralhoRepository {
  create(userId: string, input: CreateBaralhoInput): Promise<{ baralhoId: string }>;
  rename(userId: string, baralhoId: string, titulo: string): Promise<boolean>;
  remove(userId: string, baralhoId: string): Promise<boolean>;
  addCards(userId: string, baralhoId: string, flashcardIds: string[]): Promise<boolean>;
  removeCard(userId: string, baralhoId: string, flashcardId: string): Promise<boolean>;
  importBaralhos(userId: string, baralhos: ImportedBaralho[]): Promise<{ count: number }>;
}

export const BARALHO_REPOSITORY = Symbol('BARALHO_REPOSITORY');
