import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotesService } from './notes.service';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.notes.getNotas(userId);
  }

  @Get('filters')
  filters(@CurrentUser() userId: string) {
    return this.notes.getNotasFilterData(userId);
  }

  @Post()
  create(@CurrentUser() userId: string, @Body() body: { titulo: string; conteudo: string; subtipo?: string | null; tipoNota?: string }) {
    return this.notes.createNotaManual(userId, body);
  }

  @Post(':id/flashcards')
  generateFlashcards(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notes.generateFlashcardsFromNota(userId, id);
  }

  @Delete()
  deleteAll(@CurrentUser() userId: string) {
    return this.notes.deleteAllNotas(userId);
  }

  @Get(':id')
  byId(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notes.getNotaById(userId, id);
  }

  @Delete(':id')
  delete(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notes.deleteNota(userId, id);
  }
}
