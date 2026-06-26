import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotesController } from './notes.controller';
import {
  NOTA_REPOSITORY,
  type NotaRepository,
} from '../modules/notes/domain/ports/nota-repository';
import { NOTA_QUERY, type NotaQuery } from '../modules/notes/domain/ports/nota-query';
import { PrismaNotaRepository } from '../modules/notes/infrastructure/persistence/prisma-nota.repository';
import { PrismaNotaQuery } from '../modules/notes/infrastructure/persistence/prisma-nota.query';
import { CreateNotaUseCase } from '../modules/notes/application/use-cases/create-nota.use-case';
import { ListNotasUseCase } from '../modules/notes/application/use-cases/list-notas.use-case';
import { GetNotaByIdUseCase } from '../modules/notes/application/use-cases/get-nota-by-id.use-case';
import { ListNotaFiltersUseCase } from '../modules/notes/application/use-cases/list-nota-filters.use-case';
import { DeleteNotaUseCase } from '../modules/notes/application/use-cases/delete-nota.use-case';
import { DeleteAllNotasUseCase } from '../modules/notes/application/use-cases/delete-all-notas.use-case';
import { GenerateFlashcardsFromNotaUseCase } from '../modules/notes/application/use-cases/generate-flashcards-from-nota.use-case';

@Module({
  imports: [AuthModule],
  controllers: [NotesController],
  providers: [
    { provide: NOTA_REPOSITORY, useClass: PrismaNotaRepository },
    { provide: NOTA_QUERY, useClass: PrismaNotaQuery },
    {
      provide: CreateNotaUseCase,
      useFactory: (repo: NotaRepository) => new CreateNotaUseCase(repo),
      inject: [NOTA_REPOSITORY],
    },
    {
      provide: ListNotasUseCase,
      useFactory: (query: NotaQuery) => new ListNotasUseCase(query),
      inject: [NOTA_QUERY],
    },
    {
      provide: GetNotaByIdUseCase,
      useFactory: (query: NotaQuery) => new GetNotaByIdUseCase(query),
      inject: [NOTA_QUERY],
    },
    {
      provide: ListNotaFiltersUseCase,
      useFactory: (query: NotaQuery) => new ListNotaFiltersUseCase(query),
      inject: [NOTA_QUERY],
    },
    {
      provide: DeleteNotaUseCase,
      useFactory: (repo: NotaRepository) => new DeleteNotaUseCase(repo),
      inject: [NOTA_REPOSITORY],
    },
    {
      provide: DeleteAllNotasUseCase,
      useFactory: (repo: NotaRepository) => new DeleteAllNotasUseCase(repo),
      inject: [NOTA_REPOSITORY],
    },
    {
      provide: GenerateFlashcardsFromNotaUseCase,
      useFactory: (repo: NotaRepository) => new GenerateFlashcardsFromNotaUseCase(repo),
      inject: [NOTA_REPOSITORY],
    },
  ],
})
export class NotesModule {}
