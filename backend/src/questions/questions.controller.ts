import { ZodBody } from '../common/zod-body.decorator';
import { createQuestaoContract, updateQuestaoContract } from '../../../contracts/estudo-e-anexos';
import type { CreateQuestaoBody, UpdateQuestaoBody } from '../../../contracts/estudo-e-anexos';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  create(@CurrentUser() userId: string, @ZodBody(createQuestaoContract) dto: CreateQuestaoBody) {
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
  update(@CurrentUser() userId: string, @Param('id') id: string, @ZodBody(updateQuestaoContract) dto: UpdateQuestaoBody) {
    return this.updateQuestao.execute(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.removeQuestao.execute(userId, id);
  }
}
