import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GraphModule } from './graph/graph.module';
import { ContentModule } from './content/content.module';
import { StudyModule } from './study/study.module';
import { SettingsModule } from './settings/settings.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GraphModule,
    ContentModule,
    StudyModule,
    SettingsModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
