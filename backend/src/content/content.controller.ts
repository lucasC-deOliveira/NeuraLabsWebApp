import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

  @Get('flashcards')
  flashcards(@CurrentUser() userId: string, @Query('conceptId') conceptId?: string, @Query('topicId') topicId?: string) {
    return this.content.getFlashcards(userId, { conceptId, topicId });
  }

  @Get('study/history')
  studyHistory(@CurrentUser() userId: string) {
    return this.content.getStudyHistory(userId);
  }
}
