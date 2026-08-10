import { ZodBody } from '../common/zod-body.decorator';
import { configAiContract } from '../../../contracts/estudo-e-anexos';
import type { ConfigAiBody } from '../../../contracts/estudo-e-anexos';
import { Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetConfigAiUseCase } from '../modules/settings/application/use-cases/get-config-ai.use-case';
import { SaveConfigAiUseCase } from '../modules/settings/application/use-cases/save-config-ai.use-case';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly getConfigAi: GetConfigAiUseCase,
    private readonly saveConfigAi: SaveConfigAiUseCase,
  ) {}

  @Get('ai')
  getAI(@CurrentUser() userId: string) {
    return this.getConfigAi.execute(userId);
  }

  @Put('ai')
  saveAI(@CurrentUser() userId: string, @ZodBody(configAiContract) body: ConfigAiBody) {
    return this.saveConfigAi.execute(userId, body);
  }
}
