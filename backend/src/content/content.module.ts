import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentController } from './content.controller';
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
import { PrismaConnectedConceptsQuery } from '../modules/curriculum/infrastructure/persistence/prisma-connected-concepts.query';
import { ListFlashcardsUseCase } from '../modules/flashcards/application/use-cases/list-flashcards.use-case';
import { CreateFlashcardUseCase } from '../modules/flashcards/application/use-cases/create-flashcard.use-case';
import { UpdateFlashcardUseCase } from '../modules/flashcards/application/use-cases/update-flashcard.use-case';
import { DeleteFlashcardUseCase } from '../modules/flashcards/application/use-cases/delete-flashcard.use-case';
import { DeleteAllFlashcardsUseCase } from '../modules/flashcards/application/use-cases/delete-all-flashcards.use-case';
import { PreviewFlashcardsFromNotaUseCase } from '../modules/flashcards/application/use-cases/preview-flashcards-from-nota.use-case';
import { SaveFlashcardPreviewsUseCase } from '../modules/flashcards/application/use-cases/save-flashcard-previews.use-case';
import {
  CURRICULUM_REPOSITORY,
  type CurriculumRepository,
} from '../modules/curriculum/domain/ports/curriculum-repository';
import {
  CURRICULUM_QUERY,
  type CurriculumQuery,
} from '../modules/curriculum/domain/ports/curriculum-query';
import { PrismaCurriculumRepository } from '../modules/curriculum/infrastructure/persistence/prisma-curriculum.repository';
import { PrismaCurriculumQuery } from '../modules/curriculum/infrastructure/persistence/prisma-curriculum.query';
import { CreateAssuntoUseCase } from '../modules/curriculum/application/use-cases/create-assunto.use-case';
import { CreateTopicoUseCase } from '../modules/curriculum/application/use-cases/create-topico.use-case';
import { CreateConceptUseCase } from '../modules/curriculum/application/use-cases/create-concept.use-case';
import {
  GetConceptHierarchyUseCase,
  GetFlashcardFiltersUseCase,
  GetHierarquiaTreeUseCase,
  ListSubjectsUseCase,
} from '../modules/curriculum/application/use-cases/curriculum-queries.use-cases';
import {
  STUDY_HISTORY_QUERY,
  type StudyHistoryQuery,
} from '../modules/study/domain/ports/study-history-query';
import { PrismaStudyHistoryQuery } from '../modules/study/infrastructure/persistence/prisma-study-history.query';
import { GetStudyHistoryUseCase } from '../modules/study/application/use-cases/get-study-history.use-case';

@Module({
  imports: [AuthModule],
  controllers: [ContentController],
  providers: [
    { provide: FLASHCARD_REPOSITORY, useClass: PrismaFlashcardRepository },
    PrismaConnectedConceptsQuery,
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
    { provide: CURRICULUM_REPOSITORY, useClass: PrismaCurriculumRepository },
    { provide: CURRICULUM_QUERY, useClass: PrismaCurriculumQuery },
    {
      provide: CreateAssuntoUseCase,
      useFactory: (repo: CurriculumRepository) => new CreateAssuntoUseCase(repo),
      inject: [CURRICULUM_REPOSITORY],
    },
    {
      provide: CreateTopicoUseCase,
      useFactory: (repo: CurriculumRepository) => new CreateTopicoUseCase(repo),
      inject: [CURRICULUM_REPOSITORY],
    },
    {
      provide: CreateConceptUseCase,
      useFactory: (repo: CurriculumRepository) => new CreateConceptUseCase(repo),
      inject: [CURRICULUM_REPOSITORY],
    },
    {
      provide: ListSubjectsUseCase,
      useFactory: (query: CurriculumQuery) => new ListSubjectsUseCase(query),
      inject: [CURRICULUM_QUERY],
    },
    {
      provide: GetConceptHierarchyUseCase,
      useFactory: (query: CurriculumQuery) => new GetConceptHierarchyUseCase(query),
      inject: [CURRICULUM_QUERY],
    },
    {
      provide: GetHierarquiaTreeUseCase,
      useFactory: (query: CurriculumQuery) => new GetHierarquiaTreeUseCase(query),
      inject: [CURRICULUM_QUERY],
    },
    {
      provide: GetFlashcardFiltersUseCase,
      useFactory: (query: CurriculumQuery) => new GetFlashcardFiltersUseCase(query),
      inject: [CURRICULUM_QUERY],
    },
    { provide: STUDY_HISTORY_QUERY, useClass: PrismaStudyHistoryQuery },
    {
      provide: GetStudyHistoryUseCase,
      useFactory: (query: StudyHistoryQuery) => new GetStudyHistoryUseCase(query),
      inject: [STUDY_HISTORY_QUERY],
    },
  ],
})
export class ContentModule {}
