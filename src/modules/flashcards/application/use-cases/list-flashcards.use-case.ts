import { Flashcard } from "../../domain/entities/flashcard";
import { FlashcardRepository } from "../../domain/repositories/flashcard-repository";
import { SpacedRepetitionData } from "../../domain/value-objects/flashcard-spaced-data";

export interface ListFlashcardsInput {
  userId: string;
  conceptId?: string;
  topicId?: string;
}

export interface FlashcardDto {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string;
  dataCriacao: Date;
  spacedRepetition: {
    dificuldade: number;
    intervalo: number;
    proximaRevisao: Date;
    ultimaRevisao: Date;
    estagioAprendizado: number;
  } | null;
}

export class ListFlashcardsUseCase {
  constructor(private repository: FlashcardRepository) {}

  async execute(input: ListFlashcardsInput): Promise<FlashcardDto[]> {
    const flashcards = await this.repository.findAllByUserId(input.userId, {
      conceptId: input.conceptId,
      topicId: input.topicId,
    });

    return flashcards.map((fc) => ({
      id: fc.id,
      pergunta: fc.pergunta,
      resposta: fc.resposta,
      conceito: fc.conceitoNome,
      dataCriacao: fc.dataCriacao,
      spacedRepetition: fc.spacedRepetition
        ? {
            dificuldade: fc.spacedRepetition.dificuldade,
            intervalo: fc.spacedRepetition.intervalo,
            proximaRevisao: fc.spacedRepetition.proximaRevisao,
            ultimaRevisao: fc.spacedRepetition.ultimaRevisao,
            estagioAprendizado: fc.spacedRepetition.estagioAprendizado,
          }
        : null,
    }));
  }
}
