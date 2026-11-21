import { readSrsLog, type LocalSchedule } from "@/lib/srs-local";
import { getToken } from "@/lib/api";
import { configuredStudyVault, selectStudyStorage, type ElectronVaultStudyStore, type VaultCard } from "@/modules/study/infra/electron-vault-study";
import { catalogVaultCards, transformVaultCards } from "@/modules/study/infra/vault-card-catalog";
import { availableStudyServer, mergeStudyRecords } from "@/modules/study/infra/available-study-server";
import type { CreateFlashcardInput, FlashcardsPort, UpdateFlashcardInput } from "../application/ports/flashcards.port";
import type { AssuntoOption, FlashcardItem, SpacedRepetition } from "../domain/flashcard.types";
import type { ConceptHierarchy } from "../domain/concept-hierarchy.types";

function repetitionView(schedule: LocalSchedule | null): SpacedRepetition | null {
  if (!schedule) return null;
  return {
    dificuldade: schedule.dificuldade, intervalo: schedule.intervalo,
    proximaRevisao: new Date(schedule.proximaRevisao), ultimaRevisao: new Date(schedule.ultimaRevisao),
    estagioAprendizado: schedule.learningStep,
  };
}

function flashcardView(card: VaultCard, schedule: LocalSchedule | null): FlashcardItem {
  return {
    id: card.id, storage: "vault", tipo: (card.type ?? null) as FlashcardItem["tipo"], pergunta: card.question, resposta: card.answer,
    assunto: "", assuntoId: "", topico: "", topicoId: "", conceito: card.concept ?? "", conceitosConectados: card.conceptTags ?? [],
    dataCriacao: new Date(card.createdAt ?? 0), spacedRepetition: repetitionView(schedule),
  };
}

class VaultFlashcards implements FlashcardsPort {
  constructor(
    private readonly store: ElectronVaultStudyStore,
    private readonly server: FlashcardsPort,
    private readonly session: () => string | null,
  ) {}

  async getFlashcards(): Promise<FlashcardItem[]> {
    const [library, srs, remote] = await Promise.all([
      this.store.read(), readSrsLog(this.store.folder),
      availableStudyServer(() => this.server.getFlashcards(), [], this.session),
    ]);
    const local = catalogVaultCards(library).map((card) => flashcardView(card, srs.schedule[card.id] ?? card.schedule));
    return mergeStudyRecords(local, remote);
  }

  async getFilterData(): Promise<AssuntoOption[]> {
    return availableStudyServer(() => this.server.getFilterData(), [], this.session);
  }

  async getConceptHierarchy(): Promise<ConceptHierarchy[]> {
    return availableStudyServer(() => this.server.getConceptHierarchy(), [], this.session);
  }

  async createFlashcard(input: CreateFlashcardInput): Promise<{ flashcardId: string }> {
    const card: VaultCard = {
      id: crypto.randomUUID(), question: input.pergunta.trim(), answer: input.resposta.trim(),
      type: input.tipo ?? null, schedule: null, createdAt: new Date().toISOString(),
    };
    await this.store.update((library) => ({ ...library, cards: [...(library.cards ?? []), card] }));
    return { flashcardId: card.id };
  }

  async updateFlashcard(id: string, update: UpdateFlashcardInput): Promise<void> {
    if (await this.isServerCard(id)) return this.server.updateFlashcard(id, update);
    await this.store.update((library) => transformVaultCards(library, (card) => {
      if (card.id !== id) return card;
      return {
        ...card, question: update.pergunta?.trim() ?? card.question, answer: update.resposta?.trim() ?? card.answer,
        type: update.tipo !== undefined ? update.tipo : card.type,
      };
    }));
  }

  async deleteFlashcard(id: string): Promise<void> {
    if (await this.isServerCard(id)) return this.server.deleteFlashcard(id);
    await this.store.update((library) => transformVaultCards(library, (card) => card.id === id ? null : card));
  }

  async deleteAllFlashcards(): Promise<{ count: number }> {
    let count = 0;
    await this.store.update((library) => {
      count = catalogVaultCards(library).length;
      return transformVaultCards(library, () => null);
    });
    return { count };
  }

  private async isServerCard(id: string): Promise<boolean> {
    if (!this.session()) return false;
    const library = await this.store.read();
    return !catalogVaultCards(library).some((card) => card.id === id);
  }
}

/** Uses the existing flashcard interface with local storage on configured desktops.
 * @example const store = vaultAwareFlashcards(server)
 */
export function vaultAwareFlashcards(
  server: FlashcardsPort, resolveVault: typeof configuredStudyVault = configuredStudyVault, session: () => string | null = getToken,
): FlashcardsPort {
  const withStoragePort = selectStudyStorage<FlashcardsPort>(server, (vault) => new VaultFlashcards(vault, server, session), resolveVault);
  return {
    getFlashcards: (): Promise<FlashcardItem[]> => withStoragePort((port) => port.getFlashcards()),
    getFilterData: (): Promise<AssuntoOption[]> => withStoragePort((port) => port.getFilterData()),
    getConceptHierarchy: (): Promise<ConceptHierarchy[]> => withStoragePort((port) => port.getConceptHierarchy()),
    createFlashcard: (input): Promise<{ flashcardId: string }> => withStoragePort((port) => port.createFlashcard(input)),
    updateFlashcard: (id, input): Promise<void> => withStoragePort((port) => port.updateFlashcard(id, input)),
    deleteFlashcard: (id): Promise<void> => withStoragePort((port) => port.deleteFlashcard(id)),
    deleteAllFlashcards: (): Promise<{ count: number }> => withStoragePort((port) => port.deleteAllFlashcards()),
  };
}
