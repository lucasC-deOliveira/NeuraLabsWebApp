import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import {
  FLASHCARD_REPOSITORY,
  type FlashcardRepository,
} from '../modules/flashcards/domain/ports/flashcard-repository';
import {
  FLASHCARD_QUERY,
  type FlashcardQuery,
} from '../modules/flashcards/domain/ports/flashcard-query';
import { PrismaFlashcardRepository } from '../modules/flashcards/infrastructure/persistence/prisma-flashcard.repository';
import { PrismaFlashcardQuery } from '../modules/flashcards/infrastructure/persistence/prisma-flashcard.query';
import { ListFlashcardsUseCase } from '../modules/flashcards/application/use-cases/list-flashcards.use-case';
import { CreateFlashcardUseCase } from '../modules/flashcards/application/use-cases/create-flashcard.use-case';
import { UpdateFlashcardUseCase } from '../modules/flashcards/application/use-cases/update-flashcard.use-case';
import { DeleteFlashcardUseCase } from '../modules/flashcards/application/use-cases/delete-flashcard.use-case';
import { DeleteAllFlashcardsUseCase } from '../modules/flashcards/application/use-cases/delete-all-flashcards.use-case';
import { PreviewFlashcardsFromNotaUseCase } from '../modules/flashcards/application/use-cases/preview-flashcards-from-nota.use-case';
import { SaveFlashcardPreviewsUseCase } from '../modules/flashcards/application/use-cases/save-flashcard-previews.use-case';

@Module({
  imports: [AuthModule],
  controllers: [ContentController],
  providers: [
    ContentService,
    { provide: FLASHCARD_REPOSITORY, useClass: PrismaFlashcardRepository },
    { provide: FLASHCARD_QUERY, useClass: PrismaFlashcardQuery },
    {
      provide: ListFlashcardsUseCase,
      useFactory: (query: FlashcardQuery) => new ListFlashcardsUseCase(query),
      inject: [FLASHCARD_QUERY],
    },
    {
      provide: CreateFlashcardUseCase,
      useFactory: (repo: FlashcardRepository) => new CreateFlashcardUseCase(repo),
      inject: [FLASHCARD_REPOSITORY],
    },
    {
      provide: UpdateFlashcardUseCase,
      useFactory: (repo: FlashcardRepository) => new UpdateFlashcardUseCase(repo),
      inject: [FLASHCARD_REPOSITORY],
    },
    {
      provide: DeleteFlashcardUseCase,
      useFactory: (repo: FlashcardRepository) => new DeleteFlashcardUseCase(repo),
      inject: [FLASHCARD_REPOSITORY],
    },
    {
      provide: DeleteAllFlashcardsUseCase,
      useFactory: (repo: FlashcardRepository) => new DeleteAllFlashcardsUseCase(repo),
      inject: [FLASHCARD_REPOSITORY],
    },
    {
      provide: PreviewFlashcardsFromNotaUseCase,
      useFactory: (repo: FlashcardRepository) => new PreviewFlashcardsFromNotaUseCase(repo),
      inject: [FLASHCARD_REPOSITORY],
    },
    {
      provide: SaveFlashcardPreviewsUseCase,
      useFactory: (repo: FlashcardRepository) => new SaveFlashcardPreviewsUseCase(repo),
      inject: [FLASHCARD_REPOSITORY],
    },
  ],
})
export class ContentModule {}
