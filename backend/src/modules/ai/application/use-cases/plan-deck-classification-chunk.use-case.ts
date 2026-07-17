import { BaralhoNotFoundError, EmptyBaralhoError, GraphNotFoundError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import { normalizePopulationPlan } from '../../domain/services/population-plan';
import { buildPopulationMessages } from '../../domain/services/population-prompt';
import {
  toClassificationPlan,
  type ClassificationPlan,
  type RawClassificationPlan,
} from '../../domain/services/classification-plan';
import type {
  DeckCard,
  DeckClassificationRepository,
  DeckForClassification,
} from '../../domain/ports/deck-classification-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmPort } from '../../domain/ports/llm-port';

export const DEFAULT_CHUNK_SIZE = 30;
const CHUNK_MAX_TOKENS = 4000;

export interface DeckClassificationChunk {
  baralhoNome: string;
  totalCards: number;
  classifiedCards: number;
  chunkCards: DeckCard[];
  // null = no pending cards left; the deck is fully classified
  plan: ClassificationPlan | null;
}

/**
 * Plans ONE chunk of deck classification: takes the next unclassified cards and
 * asks the model to map them into the subject→topic→concept hierarchy. Writes
 * NOTHING — the plan goes to review, and ApplyDeckClassificationChunk persists
 * it. Idempotent per card: re-running skips already-classified cards, so a whole
 * deck is processed by calling this repeatedly (resumable across sessions).
 * @example planChunk.execute('u1', 'g1', 'deck1', 30)
 */
export class PlanDeckClassificationChunkUseCase {
  constructor(
    private readonly repo: DeckClassificationRepository,
    private readonly names: GraphNameIndexRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    baralhoId: string,
    chunkSize = DEFAULT_CHUNK_SIZE,
  ): Promise<DeckClassificationChunk> {
    const deck = await this.loadDeck(userId, grafoId, baralhoId);
    const { classified, chunk } = await this.nextChunk(userId, deck, chunkSize);
    const base = { baralhoNome: deck.titulo, totalCards: deck.cards.length };
    if (chunk.length === 0)
      return { ...base, classifiedCards: classified, chunkCards: [], plan: null };
    const plan = await this.planChunk(userId, grafoId, deck.titulo, chunk);
    return { ...base, classifiedCards: classified, chunkCards: chunk, plan };
  }

  private async loadDeck(
    userId: string,
    grafoId: string,
    baralhoId: string,
  ): Promise<DeckForClassification> {
    if (!(await this.repo.graphExists(userId, grafoId))) throw new GraphNotFoundError();
    const deck = await this.repo.loadDeck(userId, baralhoId);
    if (!deck) throw new BaralhoNotFoundError();
    if (deck.cards.length === 0) throw new EmptyBaralhoError();
    return deck;
  }

  private async nextChunk(
    userId: string,
    deck: DeckForClassification,
    chunkSize: number,
  ): Promise<{ classified: number; chunk: DeckCard[] }> {
    const ids = deck.cards.map((c) => c.id);
    const classified = await this.repo.loadClassifiedCardIds(userId, ids);
    const pending = deck.cards.filter((c) => !classified.has(c.id));
    return { classified: classified.size, chunk: pending.slice(0, Math.max(1, chunkSize)) };
  }

  private async planChunk(
    userId: string,
    grafoId: string,
    titulo: string,
    chunk: DeckCard[],
  ): Promise<ClassificationPlan> {
    const { existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      maxTokens: CHUNK_MAX_TOKENS,
      messages: buildPopulationMessages(titulo, chunk, existingContext),
    });
    return parsePlannedChunk(content, chunk);
  }
}

function parsePlannedChunk(content: string, chunk: DeckCard[]): ClassificationPlan {
  const raw = parseAiJson(content) as RawClassificationPlan;
  return toClassificationPlan(
    normalizePopulationPlan(raw),
    chunk.map((c) => c.id),
  );
}
