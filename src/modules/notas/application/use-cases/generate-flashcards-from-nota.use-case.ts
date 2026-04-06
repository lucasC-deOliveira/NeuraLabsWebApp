import { Nota } from "../../domain/entities/nota";
import { NotaRepository } from "../../domain/repositories/nota-repository";
import { NotaParser } from "../../domain/services/nota-parser";
import { NotaConceptMatcher } from "../../domain/services/nota-concept-matcher";

/**
 * Port: interface for generating flashcards from a nota.
 * The implementation lives in the infrastructure layer (prisma adapter).
 */
export interface FlashcardGenerator {
  generateFromNota(nota: Nota): Promise<string[]>; // returns flashcard IDs
}

export interface GenerateFlashcardsFromNotaOutput {
  flashcardIds: string[];
}

export class GenerateFlashcardsFromNotaUseCase {
  constructor(
    private notaRepository: NotaRepository,
    private flashcardGenerator: FlashcardGenerator,
    private allConcepts: Array<{ id: string; nome: string }>,
  ) {}

  async execute(
    notaId: string,
    userId: string,
  ): Promise<GenerateFlashcardsFromNotaOutput> {
    const nota = await this.notaRepository.findById(notaId);
    if (!nota || nota.userId !== userId) {
      throw new Error("Nota não encontrada");
    }

    // If nota has no parsed sections yet, parse it
    if (nota.sections.length === 0) {
      const sections = NotaParser.parse(nota.textoBruto);
      nota.attachSections(sections);
    }

    // Re-match concepts if none linked
    if (nota.conceitoIds.length === 0) {
      const terms = nota.extractTerms();
      const matcher = new NotaConceptMatcher(this.allConcepts);
      const matches = matcher.matchAll(terms);
      for (const [, concept] of matches) {
        if (concept) nota.linkConcept(concept.id);
      }
    }

    // Generate flashcards via the generator port
    const flashcardIds = await this.flashcardGenerator.generateFromNota(nota);

    // Record flashcard IDs on the nota
    for (const fcId of flashcardIds) {
      nota.generateFlashcard(fcId);
    }

    await this.notaRepository.save(nota);

    return { flashcardIds };
  }
}
