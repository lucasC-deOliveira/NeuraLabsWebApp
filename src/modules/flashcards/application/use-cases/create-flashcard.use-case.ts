import { Flashcard } from "../../domain/entities/flashcard";
import { SpacedRepetitionData } from "../../domain/value-objects/flashcard-spaced-data";
import { FlashcardRepository } from "../../domain/repositories/flashcard-repository";

/**
 * Port: spaced repetition service (SM-2 algorithm input).
 */
export interface InitialScheduleInput {
  quality: number;
}

export interface InitialScheduleOutput {
  interval: number;
  ease: number;
  stage: number;
}

export interface SpacedRepetitionService {
  createSchedule(quality: number): InitialScheduleOutput;
  calculateNextInterval(ease: number, interval: number, quality: number): {
    newInterval: number;
    newEase: number;
    newStage: number;
  };
}

export interface CreateFlashcardInput {
  pergunta: string;
  resposta: string;
  conceitoId: string;
  conceitoNome: string;
  userId: string;
}

export interface CreateFlashcardOutput {
  flashcardId: string;
}

export class CreateFlashcardUseCase {
  constructor(
    private repository: FlashcardRepository,
    private srService: SpacedRepetitionService,
    private knowledgeNodeService: KnowledgeNodeService,
  ) {}

  async execute(input: CreateFlashcardInput): Promise<CreateFlashcardOutput> {
    // 1. Create Flashcard entity
    const flashcard = Flashcard.create(
      input.pergunta,
      input.resposta,
      input.conceitoId,
      input.conceitoNome,
      input.userId,
    );

    // 2. Initial spaced repetition schedule
    const scheduleOutput = this.srService.createSchedule(3); // default neutral quality
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + scheduleOutput.interval);

    const srData = SpacedRepetitionData.create(
      scheduleOutput.ease > 0 ? Math.max(1, Math.round((5 - scheduleOutput.ease) * 2)) : 5,
      scheduleOutput.interval,
      nextReview,
      new Date(),
      scheduleOutput.stage,
    );
    flashcard.setSpacedRepetition(srData);

    // 3. Persist
    await this.repository.save(flashcard);

    // 4. Create knowledge graph nodes
    await this.knowledgeNodeService.ensureFlashcardNodes(
      input.conceitoId,
      flashcard.id,
    );

    return { flashcardId: flashcard.id };
  }
}

export interface KnowledgeNodeService {
  ensureFlashcardNodes(conceitoId: string, flashcardId: string): Promise<void>;
}
