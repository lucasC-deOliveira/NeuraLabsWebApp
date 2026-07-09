import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TokenUsageService } from './token-usage.service';
import { TokenUsageController } from './token-usage.controller';

// Shared, app-level LLM token meter. Exported so the AI/provas LLM adapters can
// record usage at the single point where tokens are actually spent.
@Module({
  imports: [AuthModule],
  controllers: [TokenUsageController],
  providers: [TokenUsageService],
  exports: [TokenUsageService],
})
export class TokenUsageModule {}
