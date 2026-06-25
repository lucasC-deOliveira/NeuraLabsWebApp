import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GetConfigAiUseCase } from '../modules/settings/application/use-cases/get-config-ai.use-case';
import { SaveConfigAiUseCase } from '../modules/settings/application/use-cases/save-config-ai.use-case';
import type { ConfigAi } from '../modules/settings/domain/ports/config-ai-repository';

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
  saveAI(@CurrentUser() userId: string, @Body() body: ConfigAi) {
    return this.saveConfigAi.execute(userId, body);
  }
}
