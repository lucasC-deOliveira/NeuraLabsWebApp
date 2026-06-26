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
import { ContentService } from './content.service';
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

@UseGuards(JwtAuthGuard)
@UseFilters(FlashcardsExceptionFilter)
@Controller()
export class ContentController {
  constructor(
    private readonly content: ContentService,
    private readonly listFlashcards: ListFlashcardsUseCase,
    private readonly createFlashcard: CreateFlashcardUseCase,
    private readonly updateFlashcard: UpdateFlashcardUseCase,
    private readonly deleteFlashcardUseCase: DeleteFlashcardUseCase,
    private readonly deleteAllFlashcards: DeleteAllFlashcardsUseCase,
    private readonly previewFromNotaUseCase: PreviewFlashcardsFromNotaUseCase,
    private readonly saveFromNotaUseCase: SaveFlashcardPreviewsUseCase,
  ) {}

  @Get('subjects')
  subjects(@CurrentUser() userId: string) {
    return this.content.listSubjects(userId);
  }

  @Get('subjects/hierarchy')
  hierarchy(@CurrentUser() userId: string) {
    return this.content.getConceptHierarchy(userId);
  }

  @Get('subjects/tree')
  hierarchyTree(@CurrentUser() userId: string) {
    return this.content.getHierarquiaConceitos(userId);
  }

  @Post('subjects')
  createAssunto(@CurrentUser() userId: string, @Body() body: { nome: string }) {
    return this.content.createAssunto(userId, body.nome);
  }

  @Post('subjects/:assuntoId/topicos')
  createTopico(
    @CurrentUser() userId: string,
    @Param('assuntoId') assuntoId: string,
    @Body() body: { nome: string },
  ) {
    return this.content.createTopico(userId, body.nome, assuntoId);
  }

  @Post('conceitos')
  createFullConcept(
    @CurrentUser() userId: string,
    @Body() body: { nome: string; assuntoId: string; topicoId: string },
  ) {
    return this.content.createFullConcept(userId, body);
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
    return this.content.getFlashcardFilterData(userId);
  }

  @Post('flashcards')
  create(@CurrentUser() userId: string, @Body() body: CreateFlashcardInput) {
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
    return this.content.getStudyHistory(userId);
  }
}
