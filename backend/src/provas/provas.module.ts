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
import {
  EXAM_FIGURE_SOURCE,
  type ExamFigureSource,
} from '../modules/provas/domain/ports/exam-figure-source';
import { PrismaProvaRepository } from '../modules/provas/infrastructure/persistence/prisma-prova.repository';
import { MultiFormatTextExtractor } from '../modules/provas/infrastructure/documents/multi-format-text-extractor';
import { PdfjsFigureExtractor } from '../modules/provas/infrastructure/documents/pdfjs-figure-extractor';
import { OpenAiExamLlmAdapter } from '../modules/provas/infrastructure/llm/openai-exam-llm.adapter';
import { CreateProvaUseCase } from '../modules/provas/application/use-cases/create-prova.use-case';
import { CreateProvaFromParsedUseCase } from '../modules/provas/application/use-cases/create-prova-from-parsed.use-case';
import { ListProvasUseCase } from '../modules/provas/application/use-cases/list-provas.use-case';
import { GetProvaUseCase } from '../modules/provas/application/use-cases/get-prova.use-case';
import { GetProvaImagemUseCase } from '../modules/provas/application/use-cases/get-prova-imagem.use-case';
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
    {
      // PROVA_MAX_PAGES limita quantas páginas de PDF são lidas (0/ausente = todas).
      provide: DOCUMENT_TEXT_EXTRACTOR,
      useFactory: () => new MultiFormatTextExtractor(Number(process.env.PROVA_MAX_PAGES) || 0),
    },
    {
      // Mesmo cap de páginas do texto, para as figuras não divergirem do parse.
      provide: EXAM_FIGURE_SOURCE,
      useFactory: () => new PdfjsFigureExtractor(Number(process.env.PROVA_MAX_PAGES) || 0),
    },
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
      provide: GetProvaImagemUseCase,
      useFactory: (repo: ProvaRepository) => new GetProvaImagemUseCase(repo),
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
      useFactory: (extractor: DocumentTextExtractor, llm: ExamLlmPort, figures: ExamFigureSource) =>
        new ParseExamUploadUseCase(extractor, llm, figures),
      inject: [DOCUMENT_TEXT_EXTRACTOR, EXAM_LLM_PORT, EXAM_FIGURE_SOURCE],
    },
  ],
})
export class ProvasModule {}
