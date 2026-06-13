import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { GraphModule } from '../graph/graph.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [AuthModule, SettingsModule, GraphModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
