import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SettingsController } from './settings.controller';
import {
  CONFIG_AI_REPOSITORY,
  type ConfigAiRepository,
} from '../modules/settings/domain/ports/config-ai-repository';
import { PrismaConfigAiRepository } from '../modules/settings/infrastructure/persistence/prisma-config-ai.repository';
import { GetConfigAiUseCase } from '../modules/settings/application/use-cases/get-config-ai.use-case';
import { SaveConfigAiUseCase } from '../modules/settings/application/use-cases/save-config-ai.use-case';
import { ResolveAiConfigUseCase } from '../modules/settings/application/use-cases/resolve-ai-config.use-case';

@Module({
  imports: [AuthModule],
  controllers: [SettingsController],
  providers: [
    { provide: CONFIG_AI_REPOSITORY, useClass: PrismaConfigAiRepository },
    {
      provide: GetConfigAiUseCase,
      useFactory: (repo: ConfigAiRepository) => new GetConfigAiUseCase(repo),
      inject: [CONFIG_AI_REPOSITORY],
    },
    {
      provide: SaveConfigAiUseCase,
      useFactory: (repo: ConfigAiRepository) => new SaveConfigAiUseCase(repo),
      inject: [CONFIG_AI_REPOSITORY],
    },
    {
      provide: ResolveAiConfigUseCase,
      useFactory: (repo: ConfigAiRepository) => new ResolveAiConfigUseCase(repo),
      inject: [CONFIG_AI_REPOSITORY],
    },
  ],
  exports: [ResolveAiConfigUseCase], // consumido pelo contexto ai
})
export class SettingsModule {}
