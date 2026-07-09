import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TokenUsageService, type TokenUsageTotals } from './token-usage.service';

// Live token meter: the running total of LLM tokens the user has spent this
// session (all AI features). Polled by the frontend meter.
@UseGuards(JwtAuthGuard)
@Controller('token-usage')
export class TokenUsageController {
  constructor(private readonly usage: TokenUsageService) {}

  @Get()
  get(@CurrentUser() userId: string): TokenUsageTotals {
    return this.usage.get(userId);
  }

  @Delete()
  reset(@CurrentUser() userId: string): { success: boolean } {
    this.usage.reset(userId);
    return { success: true };
  }
}
