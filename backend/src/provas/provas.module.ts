import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProvasController } from './provas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { ResolveAiConfigUseCase } from '../modules/settings/application/use-cases/resolve-ai-config.use-case';
import {
  PROVA_REPOSITORY,
  type ProvaRepository,
} from '../modules/provas/domain/ports/prova-repository';
import {
  DOCUMENT_TEXT_EXTRACTOR,
  type DocumentTextExtractor,
} from '../modules/provas/domain/ports/document-text-extractor';
import { EXAM_LLM_PORT, type ExamLlmPort } from '../modules/provas/domain/ports/exam-llm';
import { PrismaProvaRepository } from '../modules/provas/infrastructure/persistence/prisma-prova.repository';
import { MultiFormatTextExtractor } from '../modules/provas/infrastructure/documents/multi-format-text-extractor';
import { OpenAiExamLlmAdapter } from '../modules/provas/infrastructure/llm/openai-exam-llm.adapter';
import { CreateProvaUseCase } from '../modules/provas/application/use-cases/create-prova.use-case';
import { CreateProvaFromParsedUseCase } from '../modules/provas/application/use-cases/create-prova-from-parsed.use-case';
import { ListProvasUseCase } from '../modules/provas/application/use-cases/list-provas.use-case';
import { GetProvaUseCase } from '../modules/provas/application/use-cases/get-prova.use-case';
import { UpdateProvaUseCase } from '../modules/provas/application/use-cases/update-prova.use-case';
import { RemoveProvaUseCase } from '../modules/provas/application/use-cases/remove-prova.use-case';
import { ParseExamUploadUseCase } from '../modules/provas/application/use-cases/parse-exam-upload.use-case';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SettingsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ProvasController],
  providers: [
    { provide: PROVA_REPOSITORY, useClass: PrismaProvaRepository },
    { provide: DOCUMENT_TEXT_EXTRACTOR, useClass: MultiFormatTextExtractor },
    {
      provide: EXAM_LLM_PORT,
      useFactory: (resolve: ResolveAiConfigUseCase) => new OpenAiExamLlmAdapter(resolve),
      inject: [ResolveAiConfigUseCase],
    },
    {
      provide: CreateProvaUseCase,
      useFactory: (repo: ProvaRepository) => new CreateProvaUseCase(repo),
      inject: [PROVA_REPOSITORY],
    },
    {
      provide: CreateProvaFromParsedUseCase,
      useFactory: (repo: ProvaRepository) => new CreateProvaFromParsedUseCase(repo),
      inject: [PROVA_REPOSITORY],
    },
    {
      provide: ListProvasUseCase,
      useFactory: (repo: ProvaRepository) => new ListProvasUseCase(repo),
      inject: [PROVA_REPOSITORY],
    },
    {
      provide: GetProvaUseCase,
      useFactory: (repo: ProvaRepository) => new GetProvaUseCase(repo),
      inject: [PROVA_REPOSITORY],
    },
    {
      provide: UpdateProvaUseCase,
      useFactory: (repo: ProvaRepository) => new UpdateProvaUseCase(repo),
      inject: [PROVA_REPOSITORY],
    },
    {
      provide: RemoveProvaUseCase,
      useFactory: (repo: ProvaRepository) => new RemoveProvaUseCase(repo),
      inject: [PROVA_REPOSITORY],
    },
    {
      provide: ParseExamUploadUseCase,
      useFactory: (extractor: DocumentTextExtractor, llm: ExamLlmPort) =>
        new ParseExamUploadUseCase(extractor, llm),
      inject: [DOCUMENT_TEXT_EXTRACTOR, EXAM_LLM_PORT],
    },
  ],
})
export class ProvasModule {}
