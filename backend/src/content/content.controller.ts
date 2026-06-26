import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ListFlashcardsUseCase } from '../modules/flashcards/application/use-cases/list-flashcards.use-case';
import { CreateFlashcardUseCase } from '../modules/flashcards/application/use-cases/create-flashcard.use-case';
import { UpdateFlashcardUseCase } from '../modules/flashcards/application/use-cases/update-flashcard.use-case';
import { DeleteFlashcardUseCase } from '../modules/flashcards/application/use-cases/delete-flashcard.use-case';
import { DeleteAllFlashcardsUseCase } from '../modules/flashcards/application/use-cases/delete-all-flashcards.use-case';
import { PreviewFlashcardsFromNotaUseCase } from '../modules/flashcards/application/use-cases/preview-flashcards-from-nota.use-case';
import { SaveFlashcardPreviewsUseCase } from '../modules/flashcards/application/use-cases/save-flashcard-previews.use-case';
import { FlashcardsExceptionFilter } from '../modules/flashcards/interface/flashcards-exception.filter';
import type {
  CreateFlashcardInput,
  PreviewCard,
  UpdateFlashcardPatch,
} from '../modules/flashcards/domain/flashcard-views';
import { CreateAssuntoUseCase } from '../modules/curriculum/application/use-cases/create-assunto.use-case';
import { CreateTopicoUseCase } from '../modules/curriculum/application/use-cases/create-topico.use-case';
import { CreateConceptUseCase } from '../modules/curriculum/application/use-cases/create-concept.use-case';
import {
  GetConceptHierarchyUseCase,
  GetFlashcardFiltersUseCase,
  GetHierarquiaTreeUseCase,
  ListSubjectsUseCase,
} from '../modules/curriculum/application/use-cases/curriculum-queries.use-cases';
import { CurriculumExceptionFilter } from '../modules/curriculum/interface/curriculum-exception.filter';
import { GetStudyHistoryUseCase } from '../modules/study/application/use-cases/get-study-history.use-case';

@UseGuards(JwtAuthGuard)
@UseFilters(FlashcardsExceptionFilter, CurriculumExceptionFilter)
@Controller()
export class ContentController {
  constructor(
    private readonly listFlashcards: ListFlashcardsUseCase,
    private readonly createFlashcard: CreateFlashcardUseCase,
    private readonly updateFlashcard: UpdateFlashcardUseCase,
    private readonly deleteFlashcardUseCase: DeleteFlashcardUseCase,
    private readonly deleteAllFlashcards: DeleteAllFlashcardsUseCase,
    private readonly previewFromNotaUseCase: PreviewFlashcardsFromNotaUseCase,
    private readonly saveFromNotaUseCase: SaveFlashcardPreviewsUseCase,
    private readonly createAssunto: CreateAssuntoUseCase,
    private readonly createTopico: CreateTopicoUseCase,
    private readonly createConcept: CreateConceptUseCase,
    private readonly listSubjectsUseCase: ListSubjectsUseCase,
    private readonly conceptHierarchy: GetConceptHierarchyUseCase,
    private readonly hierarquiaTreeUseCase: GetHierarquiaTreeUseCase,
    private readonly flashcardFiltersUseCase: GetFlashcardFiltersUseCase,
    private readonly getStudyHistory: GetStudyHistoryUseCase,
  ) {}

  @Get('subjects')
  subjects(@CurrentUser() userId: string) {
    return this.listSubjectsUseCase.execute(userId);
  }

  @Get('subjects/hierarchy')
  hierarchy(@CurrentUser() userId: string) {
    return this.conceptHierarchy.execute(userId);
  }

  @Get('subjects/tree')
  hierarchyTree(@CurrentUser() userId: string) {
    return this.hierarquiaTreeUseCase.execute(userId);
  }

  @Post('subjects')
  create(@CurrentUser() userId: string, @Body() body: { nome: string }) {
    return this.createAssunto.execute(userId, body.nome);
  }

  @Post('subjects/:assuntoId/topicos')
  topico(
    @CurrentUser() userId: string,
    @Param('assuntoId') assuntoId: string,
    @Body() body: { nome: string },
  ) {
    return this.createTopico.execute(userId, body.nome, assuntoId);
  }

  @Post('conceitos')
  concept(
    @CurrentUser() userId: string,
    @Body() body: { nome: string; assuntoId: string; topicoId: string },
  ) {
    return this.createConcept.execute(userId, body);
  }

  @Get('flashcards')
  flashcards(
    @CurrentUser() userId: string,
    @Query('conceptId') conceptId?: string,
    @Query('topicId') topicId?: string,
  ) {
    return this.listFlashcards.execute(userId, { conceptId, topicId });
  }

  @Get('flashcards/filters')
  flashcardFilters(@CurrentUser() userId: string) {
    return this.flashcardFiltersUseCase.execute(userId);
  }

  @Post('flashcards')
  newFlashcard(@CurrentUser() userId: string, @Body() body: CreateFlashcardInput) {
    return this.createFlashcard.execute(userId, body);
  }

  @Patch('flashcards/:id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateFlashcardPatch,
  ) {
    return this.updateFlashcard.execute(userId, id, body);
  }

  @Delete('flashcards')
  deleteAll(@CurrentUser() userId: string) {
    return this.deleteAllFlashcards.execute(userId);
  }

  @Delete('flashcards/:id')
  delete(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.deleteFlashcardUseCase.execute(userId, id);
  }

  @Get('notas/:notaId/flashcard-preview')
  previewFromNota(@CurrentUser() userId: string, @Param('notaId') notaId: string) {
    return this.previewFromNotaUseCase.execute(userId, notaId);
  }

  @Post('notas/:notaId/flashcards')
  saveFromNota(
    @CurrentUser() userId: string,
    @Param('notaId') _notaId: string,
    @Body() body: { flashcards: PreviewCard[] },
  ) {
    return this.saveFromNotaUseCase.execute(userId, body.flashcards ?? []);
  }

  @Get('study/history')
  studyHistory(@CurrentUser() userId: string) {
    return this.getStudyHistory.execute(userId);
  }
}
