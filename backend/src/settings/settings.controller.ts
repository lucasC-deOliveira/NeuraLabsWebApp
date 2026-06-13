import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SettingsService, type ConfigAIData } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('ai')
  getAI(@CurrentUser() userId: string) {
    return this.settings.getConfigAI(userId);
  }

  @Put('ai')
  saveAI(@CurrentUser() userId: string, @Body() body: ConfigAIData) {
    return this.settings.saveConfigAI(userId, body);
  }
}
