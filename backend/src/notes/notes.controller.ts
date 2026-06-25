import { Body, Controller, Delete, Get, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateNotaUseCase } from '../modules/notes/application/use-cases/create-nota.use-case';
import { ListNotasUseCase } from '../modules/notes/application/use-cases/list-notas.use-case';
import { GetNotaByIdUseCase } from '../modules/notes/application/use-cases/get-nota-by-id.use-case';
import { ListNotaFiltersUseCase } from '../modules/notes/application/use-cases/list-nota-filters.use-case';
import { DeleteNotaUseCase } from '../modules/notes/application/use-cases/delete-nota.use-case';
import { DeleteAllNotasUseCase } from '../modules/notes/application/use-cases/delete-all-notas.use-case';
import { GenerateFlashcardsFromNotaUseCase } from '../modules/notes/application/use-cases/generate-flashcards-from-nota.use-case';
import { NotesExceptionFilter } from '../modules/notes/interface/notes-exception.filter';
import type { CreateNotaInput } from '../modules/notes/domain/note-views';

@UseGuards(JwtAuthGuard)
@UseFilters(NotesExceptionFilter)
@Controller('notes')
export class NotesController {
  constructor(
    private readonly createNota: CreateNotaUseCase,
    private readonly listNotas: ListNotasUseCase,
    private readonly getNotaById: GetNotaByIdUseCase,
    private readonly listFilters: ListNotaFiltersUseCase,
    private readonly deleteNota: DeleteNotaUseCase,
    private readonly deleteAllNotas: DeleteAllNotasUseCase,
    private readonly generateFlashcards: GenerateFlashcardsFromNotaUseCase,
  ) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.listNotas.execute(userId);
  }

  @Get('filters')
  filters(@CurrentUser() userId: string) {
    return this.listFilters.execute(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() body: CreateNotaInput) {
    return this.createNota.execute(userId, body);
  }

  @Post(':id/flashcards')
  flashcards(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.generateFlashcards.execute(userId, id);
  }

  @Delete()
  deleteAll(@CurrentUser() userId: string) {
    return this.deleteAllNotas.execute(userId);
  }

  @Get(':id')
  byId(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.getNotaById.execute(userId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.deleteNota.execute(userId, id);
  }
}
