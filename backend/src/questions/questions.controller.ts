import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { QuestionsService, CreateQuestaoDto } from './questions.service';

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly svc: QuestionsService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateQuestaoDto) {
    return this.svc.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.svc.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.svc.findOne(userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: Partial<CreateQuestaoDto>) {
    return this.svc.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.svc.remove(userId, id);
  }
}
