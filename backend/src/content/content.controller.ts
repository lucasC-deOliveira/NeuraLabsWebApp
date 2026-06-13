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

  @Get('flashcards')
  flashcards(@CurrentUser() userId: string, @Query('conceptId') conceptId?: string, @Query('topicId') topicId?: string) {
    return this.content.getFlashcards(userId, { conceptId, topicId });
  }

  @Get('flashcards/filters')
  flashcardFilters(@CurrentUser() userId: string) {
    return this.content.getFlashcardFilterData(userId);
  }

  @Post('flashcards')
  createFlashcard(@CurrentUser() userId: string, @Body() body: { pergunta: string; resposta: string; conceitoId?: string | null }) {
    return this.content.createFlashcard(userId, body);
  }

  @Patch('flashcards/:id')
  updateFlashcard(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: { pergunta?: string; resposta?: string }) {
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

  @Get('study/history')
  studyHistory(@CurrentUser() userId: string) {
    return this.content.getStudyHistory(userId);
  }
}
