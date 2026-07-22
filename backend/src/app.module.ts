import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GraphModule } from './graph/graph.module';
import { ContentModule } from './content/content.module';
import { StudyModule } from './study/study.module';
import { SettingsModule } from './settings/settings.module';
import { AiModule } from './ai/ai.module';
import { NotesModule } from './notes/notes.module';
import { QuestionsModule } from './questions/questions.module';
import { ProvasModule } from './provas/provas.module';
import { BaralhosModule } from './baralhos/baralhos.module';
import { TokenUsageModule } from './token-usage/token-usage.module';
import { TtsModule } from './tts/tts.module';
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
    NotesModule,
    QuestionsModule,
    ProvasModule,
    BaralhosModule,
    TokenUsageModule,
    TtsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
