import { prisma } from "@/lib/prisma";
import { PrismaNotaRepository } from "../infra/prisma-nota-repository";
import { PrismaFlashcardGenerator } from "../infra/prisma-flashcard-generator";
import { CreateNotaUseCase } from "../application/use-cases/create-nota.use-case";
import { GetNotaUseCase } from "../application/use-cases/get-nota.use-case";
import { DeleteNotaUseCase } from "../application/use-cases/delete-nota.use-case";
import { GenerateFlashcardsFromNotaUseCase } from "../application/use-cases/generate-flashcards-from-nota.use-case";

// Lazy singletons
let _createNota: CreateNotaUseCase | null = null;
let _getNota: GetNotaUseCase | null = null;
let _deleteNota: DeleteNotaUseCase | null = null;
let _generateFlashcards: GenerateFlashcardsFromNotaUseCase | null = null;

function repository(): PrismaNotaRepository {
  return new PrismaNotaRepository();
}

async function loadConcepts(): Promise<Array<{ id: string; nome: string }>> {
  return prisma.conceito.findMany({
    select: { id: true, nome: true },
  });
}

export function getCreateNotaUseCase(): CreateNotaUseCase {
  if (!_createNota) {
    _createNota = new CreateNotaUseCase(repository(), []);
  }
  return _createNota;
}

export async function getCreateNotaUseCaseWithConcepts(): Promise<CreateNotaUseCase> {
  if (!_createNota) {
    const concepts = await loadConcepts();
    _createNota = new CreateNotaUseCase(repository(), concepts);
  }
  return _createNota;
}

export function getGetNotaUseCase(): GetNotaUseCase {
  if (!_getNota) {
    _getNota = new GetNotaUseCase(repository());
  }
  return _getNota;
}

export function getDeleteNotaUseCase(): DeleteNotaUseCase {
  if (!_deleteNota) {
    _deleteNota = new DeleteNotaUseCase(repository());
  }
  return _deleteNota;
}

export function getGenerateFlashcardsFromNotaUseCase(): GenerateFlashcardsFromNotaUseCase {
  if (!_generateFlashcards) {
    _generateFlashcards = new GenerateFlashcardsFromNotaUseCase(
      repository(),
      new PrismaFlashcardGenerator(),
      [],
    );
  }
  return _generateFlashcards;
}

export async function getGenerateFlashcardsFromNotaUseCaseWithConcepts(): Promise<GenerateFlashcardsFromNotaUseCase> {
  if (!_generateFlashcards) {
    const concepts = await loadConcepts();
    _generateFlashcards = new GenerateFlashcardsFromNotaUseCase(
      repository(),
      new PrismaFlashcardGenerator(),
      concepts,
    );
  }
  return _generateFlashcards;
}
