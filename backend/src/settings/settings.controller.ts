import { ZodBody } from '../common/zod-body.decorator';
import { configAiContract } from '../../../contracts/estudo-e-anexos';
import type { ConfigAiBody } from '../../../contracts/estudo-e-anexos';
import { Controller, Delete, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetConfigAiUseCase } from '../modules/settings/application/use-cases/get-config-ai.use-case';
import { SaveConfigAiUseCase } from '../modules/settings/application/use-cases/save-config-ai.use-case';
import {
  ACCOUNT_STORAGE_QUERY,
  type AccountStorageQuery,
} from '../modules/settings/domain/ports/account-storage-query';
import type { AccountStorageUsage } from '../../../contracts/account-storage';
import {
  CONFIG_AI_REPOSITORY,
  type ConfigAiRepository,
} from '../modules/settings/domain/ports/config-ai-repository';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly getConfigAi: GetConfigAiUseCase,
    private readonly saveConfigAi: SaveConfigAiUseCase,
    @Inject(ACCOUNT_STORAGE_QUERY) private readonly accountStorage: AccountStorageQuery,
    @Inject(CONFIG_AI_REPOSITORY) private readonly configAi: ConfigAiRepository,
  ) {}

  @Get('storage')
  getStorage(@CurrentUser() userId: string): Promise<AccountStorageUsage> {
    return this.accountStorage.measure(userId);
  }

  @Get('ai')
  getAI(@CurrentUser() userId: string) {
    return this.getConfigAi.execute(userId);
  }

  @Put('ai')
  saveAI(@CurrentUser() userId: string, @ZodBody(configAiContract) body: ConfigAiBody) {
    return this.saveConfigAi.execute(userId, body);
  }

  @Delete('ai')
  async resetAI(@CurrentUser() userId: string): Promise<{ success: true }> {
    await this.configAi.remove(userId);
    return { success: true };
  }
}
