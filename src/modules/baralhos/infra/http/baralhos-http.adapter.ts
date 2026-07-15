// ACL over @/lib/baralhos-api. Only this infra adapter knows the lib boundary.
import {
  getBaralhos,
  getBaralho,
  createBaralho,
  renameBaralho,
  deleteBaralho,
  addCardsToBaralho,
  removeCardFromBaralho,
  importBaralhos,
} from "@/lib/baralhos-api";
import { getFlashcards } from "@/lib/content-api";
import type { BaralhosPort } from "../../application/ports/baralhos.port";
import type { BaralhoCardOption, BaralhoDetail, BaralhoItem } from "../../domain/baralho.types";

export class HttpBaralhosAdapter implements BaralhosPort {
  listBaralhos(): Promise<BaralhoItem[]> {
    return getBaralhos();
  }

  async listAvailableCards(): Promise<BaralhoCardOption[]> {
    const cards = await getFlashcards();
    return cards.map((card) => ({ id: card.id, pergunta: card.pergunta, conceito: card.conceito }));
  }

  getBaralho(baralhoId: string): Promise<BaralhoDetail> {
    return getBaralho(baralhoId);
  }

  createBaralho(titulo: string, flashcardIds: string[]): Promise<{ baralhoId: string }> {
    return createBaralho(titulo, flashcardIds);
  }

  async renameBaralho(baralhoId: string, titulo: string): Promise<void> {
    await renameBaralho(baralhoId, titulo);
  }

  async deleteBaralho(baralhoId: string): Promise<void> {
    await deleteBaralho(baralhoId);
  }

  async addCards(baralhoId: string, flashcardIds: string[]): Promise<void> {
    await addCardsToBaralho(baralhoId, flashcardIds);
  }

  async removeCard(baralhoId: string, flashcardId: string): Promise<void> {
    await removeCardFromBaralho(baralhoId, flashcardId);
  }

  importBaralhos(payload: unknown): Promise<{ count: number }> {
    return importBaralhos(payload);
  }
}
