// Port for deck CRUD, import and export. The infra/ adapter implements it over
// @/lib/baralhos-api — only that adapter knows the lib boundary (ACL).
import type { BaralhoCardOption, BaralhoDetail, BaralhoItem } from "../../domain/baralho.types";

export interface BaralhosPort {
  listBaralhos(): Promise<BaralhoItem[]>;
  // Flashcards do usuário candidatos a entrar num baralho. Vem da borda de conteúdo,
  // não do módulo flashcards: cada módulo tem a sua visão do que precisa.
  listAvailableCards(): Promise<BaralhoCardOption[]>;
  getBaralho(baralhoId: string): Promise<BaralhoDetail>;
  createBaralho(titulo: string, flashcardIds: string[]): Promise<{ baralhoId: string }>;
  renameBaralho(baralhoId: string, titulo: string): Promise<void>;
  deleteBaralho(baralhoId: string): Promise<void>;
  addCards(baralhoId: string, flashcardIds: string[]): Promise<void>;
  removeCard(baralhoId: string, flashcardId: string): Promise<void>;
  importBaralhos(payload: unknown): Promise<{ count: number }>;
}
