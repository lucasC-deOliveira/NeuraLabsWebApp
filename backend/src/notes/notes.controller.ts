import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
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
