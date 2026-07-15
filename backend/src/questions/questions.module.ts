import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import {
  QUESTAO_REPOSITORY,
  type QuestaoRepository,
} from '../modules/questions/domain/ports/questao-repository';
import { PrismaQuestaoRepository } from '../modules/questions/infrastructure/persistence/prisma-questao.repository';
import { PrismaConnectedConceptsQuery } from '../modules/curriculum/infrastructure/persistence/prisma-connected-concepts.query';
import { CreateQuestaoUseCase } from '../modules/questions/application/use-cases/create-questao.use-case';
import { ListQuestoesUseCase } from '../modules/questions/application/use-cases/list-questoes.use-case';
import { GetQuestaoUseCase } from '../modules/questions/application/use-cases/get-questao.use-case';
import { UpdateQuestaoUseCase } from '../modules/questions/application/use-cases/update-questao.use-case';
import { RemoveQuestaoUseCase } from '../modules/questions/application/use-cases/remove-questao.use-case';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [QuestionsController],
  providers: [
    PrismaConnectedConceptsQuery,
    { provide: QUESTAO_REPOSITORY, useClass: PrismaQuestaoRepository },
    {
      provide: CreateQuestaoUseCase,
      useFactory: (repo: QuestaoRepository) => new CreateQuestaoUseCase(repo),
      inject: [QUESTAO_REPOSITORY],
    },
    {
      provide: ListQuestoesUseCase,
      useFactory: (repo: QuestaoRepository) => new ListQuestoesUseCase(repo),
      inject: [QUESTAO_REPOSITORY],
    },
    {
      provide: GetQuestaoUseCase,
      useFactory: (repo: QuestaoRepository) => new GetQuestaoUseCase(repo),
      inject: [QUESTAO_REPOSITORY],
    },
    {
      provide: UpdateQuestaoUseCase,
      useFactory: (repo: QuestaoRepository) => new UpdateQuestaoUseCase(repo),
      inject: [QUESTAO_REPOSITORY],
    },
    {
      provide: RemoveQuestaoUseCase,
      useFactory: (repo: QuestaoRepository) => new RemoveQuestaoUseCase(repo),
      inject: [QUESTAO_REPOSITORY],
    },
  ],
})
export class QuestionsModule {}
