import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ContentService } from './content.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

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
  createTopico(@CurrentUser() userId: string, @Param('assuntoId') assuntoId: string, @Body() body: { nome: string }) {
    return this.content.createTopico(userId, body.nome, assuntoId);
  }

  @Post('conceitos')
  createFullConcept(@CurrentUser() userId: string, @Body() body: { nome: string; assuntoId: string; topicoId: string }) {
    return this.content.createFullConcept(userId, body);
  }

  @Get('flashcards')
  flashcards(@CurrentUser() userId: string, @Query('conceptId') conceptId?: string, @Query('topicId') topicId?: string) {
    return this.content.getFlashcards(userId, { conceptId, topicId });
  }

  @Get('flashcards/filters')
  flashcardFilters(@CurrentUser() userId: string) {
    return this.content.getFlashcardFilterData(userId);
  }

  @Post('flashcards')
  createFlashcard(@CurrentUser() userId: string, @Body() body: { pergunta: string; resposta: string; conceitoId?: string | null; tipo?: string | null }) {
    return this.content.createFlashcard(userId, body);
  }

  @Patch('flashcards/:id')
  updateFlashcard(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: { pergunta?: string; resposta?: string; tipo?: string | null }) {
    return this.content.updateFlashcard(userId, id, body);
  }

  @Delete('flashcards')
  deleteAllFlashcards(@CurrentUser() userId: string) {
    return this.content.deleteAllFlashcards(userId);
  }

  @Delete('flashcards/:id')
  deleteFlashcard(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.content.deleteFlashcard(userId, id);
  }

  @Get('notas/:notaId/flashcard-preview')
  previewFromNota(@CurrentUser() userId: string, @Param('notaId') notaId: string) {
    return this.content.previewFlashcardsFromNota(userId, notaId);
  }

  @Post('notas/:notaId/flashcards')
  saveFromNota(
    @CurrentUser() userId: string,
    @Param('notaId') notaId: string,
    @Body() body: { flashcards: Array<{ pergunta: string; resposta: string; conceitoId: string }> },
  ) {
    return this.content.saveFlashcardPreviewsFromNota(userId, notaId, body.flashcards ?? []);
  }

  @Get('study/history')
  studyHistory(@CurrentUser() userId: string) {
    return this.content.getStudyHistory(userId);
  }
}
