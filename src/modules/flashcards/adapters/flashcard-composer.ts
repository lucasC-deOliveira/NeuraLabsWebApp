import { FlashcardRepository } from "../domain/repositories/flashcard-repository";
import { PrismaFlashcardRepository } from "../infra/prisma-flashcard-repository";
import { CreateFlashcardUseCase } from "../application/use-cases/create-flashcard.use-case";
import { ListFlashcardsUseCase } from "../application/use-cases/list-flashcards.use-case";
import { UpdateFlashcardUseCase } from "../application/use-cases/update-flashcard.use-case";
import { DeleteFlashcardUseCase } from "../application/use-cases/delete-flashcard.use-case";

// Lazy singletons
let _repository: FlashcardRepository | null = null;

function getRepository(): FlashcardRepository {
  if (!_repository) {
    _repository = new PrismaFlashcardRepository();
  }
  return _repository;
}

export function getCreateFlashcardUseCase(): CreateFlashcardUseCase {
  throw new Error("Use getCreateFlashcardUseCaseWithDeps instead — needs knowledge node service");
}

export function getCreateFlashcardUseCaseWithDeps(
  srService: CreateFlashcardUseCase["srService"],
  knowledgeNodeService: CreateFlashcardUseCase["knowledgeNodeService"],
): CreateFlashcardUseCase {
  return new CreateFlashcardUseCase(getRepository(), srService, knowledgeNodeService);
}

export function getListFlashcardsUseCase(): ListFlashcardsUseCase {
  return new ListFlashcardsUseCase(getRepository());
}

export function getUpdateFlashcardUseCase(): UpdateFlashcardUseCase {
  return new UpdateFlashcardUseCase(getRepository());
}

export function getDeleteFlashcardUseCase(): DeleteFlashcardUseCase {
  return new DeleteFlashcardUseCase(getRepository());
}
