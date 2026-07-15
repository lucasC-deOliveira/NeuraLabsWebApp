import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BaralhosController } from '../modules/baralhos/interface/baralhos.controller';
import { BARALHO_QUERY, type BaralhoQuery } from '../modules/baralhos/domain/ports/baralho-query';
import {
  BARALHO_REPOSITORY,
  type BaralhoRepository,
} from '../modules/baralhos/domain/ports/baralho-repository';
import { PrismaBaralhoQuery } from '../modules/baralhos/infrastructure/persistence/prisma-baralho.query';
import { PrismaConnectedConceptsQuery } from '../modules/curriculum/infrastructure/persistence/prisma-connected-concepts.query';
import { PrismaBaralhoRepository } from '../modules/baralhos/infrastructure/persistence/prisma-baralho.repository';
import {
  AddCardsToBaralhoUseCase,
  CreateBaralhoUseCase,
  DeleteBaralhoUseCase,
  GetBaralhoUseCase,
  ImportBaralhosUseCase,
  ListBaralhosUseCase,
  RemoveCardFromBaralhoUseCase,
  RenameBaralhoUseCase,
} from '../modules/baralhos/application/use-cases/baralho.use-cases';

@Module({
  imports: [AuthModule],
  controllers: [BaralhosController],
  providers: [
    PrismaConnectedConceptsQuery,
    { provide: BARALHO_QUERY, useClass: PrismaBaralhoQuery },
    { provide: BARALHO_REPOSITORY, useClass: PrismaBaralhoRepository },
    {
      provide: ListBaralhosUseCase,
      useFactory: (query: BaralhoQuery) => new ListBaralhosUseCase(query),
      inject: [BARALHO_QUERY],
    },
    {
      provide: GetBaralhoUseCase,
      useFactory: (query: BaralhoQuery) => new GetBaralhoUseCase(query),
      inject: [BARALHO_QUERY],
    },
    {
      provide: CreateBaralhoUseCase,
      useFactory: (repo: BaralhoRepository) => new CreateBaralhoUseCase(repo),
      inject: [BARALHO_REPOSITORY],
    },
    {
      provide: RenameBaralhoUseCase,
      useFactory: (repo: BaralhoRepository) => new RenameBaralhoUseCase(repo),
      inject: [BARALHO_REPOSITORY],
    },
    {
      provide: DeleteBaralhoUseCase,
      useFactory: (repo: BaralhoRepository) => new DeleteBaralhoUseCase(repo),
      inject: [BARALHO_REPOSITORY],
    },
    {
      provide: AddCardsToBaralhoUseCase,
      useFactory: (repo: BaralhoRepository) => new AddCardsToBaralhoUseCase(repo),
      inject: [BARALHO_REPOSITORY],
    },
    {
      provide: RemoveCardFromBaralhoUseCase,
      useFactory: (repo: BaralhoRepository) => new RemoveCardFromBaralhoUseCase(repo),
      inject: [BARALHO_REPOSITORY],
    },
    {
      provide: ImportBaralhosUseCase,
      useFactory: (repo: BaralhoRepository) => new ImportBaralhosUseCase(repo),
      inject: [BARALHO_REPOSITORY],
    },
  ],
})
export class BaralhosModule {}
