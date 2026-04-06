import { FlashcardRepository } from "../../domain/repositories/flashcard-repository";

export interface UpdateFlashcardInput {
  id: string;
  pergunta?: string;
  resposta?: string;
}

export interface UpdateFlashcardOutput {
  success: boolean;
}

export class UpdateFlashcardUseCase {
  constructor(private repository: FlashcardRepository) {}

  async execute(input: UpdateFlashcardInput): Promise<UpdateFlashcardOutput> {
    const flashcard = await this.repository.findById(input.id);
    if (!flashcard) {
      throw new Error("Flashcard não encontrado");
    }

    if (input.pergunta !== undefined) {
      flashcard.updateQuestion(input.pergunta);
    }
    if (input.resposta !== undefined) {
      flashcard.updateAnswer(input.resposta);
    }

    await this.repository.save(flashcard);

    return { success: true };
  }
}
