import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateQuestaoUseCase } from '../modules/questions/application/use-cases/create-questao.use-case';
import { ListQuestoesUseCase } from '../modules/questions/application/use-cases/list-questoes.use-case';
import { GetQuestaoUseCase } from '../modules/questions/application/use-cases/get-questao.use-case';
import { UpdateQuestaoUseCase } from '../modules/questions/application/use-cases/update-questao.use-case';
import { RemoveQuestaoUseCase } from '../modules/questions/application/use-cases/remove-questao.use-case';
import { QuestionsExceptionFilter } from '../modules/questions/interface/questions-exception.filter';
import type { CreateQuestaoInput } from '../modules/questions/domain/questao';
import type { UpdateQuestaoPatch } from '../modules/questions/domain/ports/questao-repository';

@Controller('questions')
@UseGuards(JwtAuthGuard)
@UseFilters(QuestionsExceptionFilter)
export class QuestionsController {
  constructor(
    private readonly createQuestao: CreateQuestaoUseCase,
    private readonly listQuestoes: ListQuestoesUseCase,
    private readonly getQuestao: GetQuestaoUseCase,
    private readonly updateQuestao: UpdateQuestaoUseCase,
    private readonly removeQuestao: RemoveQuestaoUseCase,
  ) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() dto: CreateQuestaoInput) {
    return this.createQuestao.execute(userId, dto);
  }

  @Get()
  findAll(@CurrentUser() userId: string) {
    return this.listQuestoes.execute(userId);
  }

  @Get(':id')
  findOne(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.getQuestao.execute(userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdateQuestaoPatch) {
    return this.updateQuestao.execute(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.removeQuestao.execute(userId, id);
  }
}
