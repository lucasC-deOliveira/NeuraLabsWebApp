import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProvasController } from './provas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { TokenUsageModule } from '../token-usage/token-usage.module';
import { TokenUsageService } from '../token-usage/token-usage.service';
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
import {
  CONCEITO_CATALOG_SOURCE,
  type ConceitoCatalogSource,
} from '../modules/provas/domain/ports/conceito-catalog-source';
import {
  QUESTAO_GRAPH_WRITER,
  type QuestaoGraphWriter,
} from '../modules/provas/domain/ports/questao-graph-writer';
import { PrismaProvaRepository } from '../modules/provas/infrastructure/persistence/prisma-prova.repository';
import {
  EDITAL_REPOSITORY,
  type EditalRepository,
} from '../modules/provas/domain/ports/edital-repository';
import { PrismaEditalRepository } from '../modules/provas/infrastructure/persistence/prisma-edital.repository';
import {
  CreateEditalUseCase,
  LinkEditalToProvaUseCase,
  ListEditaisUseCase,
} from '../modules/provas/application/use-cases/edital.use-cases';
import { PrismaConceitoCatalog } from '../modules/provas/infrastructure/persistence/prisma-conceito-catalog';
import { PrismaQuestaoGraphWriter } from '../modules/provas/infrastructure/persistence/prisma-questao-graph-writer';
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
import { SuggestQuestaoConceitosUseCase } from '../modules/provas/application/use-cases/suggest-questao-conceitos.use-case';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SettingsModule,
    TokenUsageModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ProvasController],
  providers: [
    { provide: PROVA_REPOSITORY, useClass: PrismaProvaRepository },
    { provide: CONCEITO_CATALOG_SOURCE, useClass: PrismaConceitoCatalog },
    { provide: QUESTAO_GRAPH_WRITER, useClass: PrismaQuestaoGraphWriter },
    { provide: EDITAL_REPOSITORY, useClass: PrismaEditalRepository },
    {
      provide: CreateEditalUseCase,
      useFactory: (repo: EditalRepository) => new CreateEditalUseCase(repo),
      inject: [EDITAL_REPOSITORY],
    },
    {
      provide: LinkEditalToProvaUseCase,
      useFactory: (repo: EditalRepository) => new LinkEditalToProvaUseCase(repo),
      inject: [EDITAL_REPOSITORY],
    },
    {
      provide: ListEditaisUseCase,
      useFactory: (repo: EditalRepository) => new ListEditaisUseCase(repo),
      inject: [EDITAL_REPOSITORY],
    },
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
      useFactory: (resolve: ResolveAiConfigUseCase, tokens: TokenUsageService) =>
        new OpenAiExamLlmAdapter(resolve, tokens),
      inject: [ResolveAiConfigUseCase, TokenUsageService],
    },
    {
      provide: CreateProvaUseCase,
      useFactory: (repo: ProvaRepository) => new CreateProvaUseCase(repo),
      inject: [PROVA_REPOSITORY],
    },
    {
      provide: CreateProvaFromParsedUseCase,
      useFactory: (repo: ProvaRepository, graphWriter: QuestaoGraphWriter) =>
        new CreateProvaFromParsedUseCase(repo, graphWriter),
      inject: [PROVA_REPOSITORY, QUESTAO_GRAPH_WRITER],
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
    {
      provide: SuggestQuestaoConceitosUseCase,
      useFactory: (catalog: ConceitoCatalogSource, llm: ExamLlmPort) =>
        new SuggestQuestaoConceitosUseCase(catalog, llm),
      inject: [CONCEITO_CATALOG_SOURCE, EXAM_LLM_PORT],
    },
  ],
})
export class ProvasModule {}
