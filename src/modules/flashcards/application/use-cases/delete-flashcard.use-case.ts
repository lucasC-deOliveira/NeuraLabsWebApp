import { FlashcardRepository } from "../../domain/repositories/flashcard-repository";

export class DeleteFlashcardUseCase {
  constructor(private repository: FlashcardRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
