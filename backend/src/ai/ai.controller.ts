import {
  Body,
  Controller,
  Param,
  Post,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DetectDuplicatesHybridUseCase } from '../modules/ai/application/use-cases/detect-duplicates-hybrid.use-case';
import { DetectDuplicatesBySimilarityUseCase } from '../modules/ai/application/use-cases/detect-duplicates-by-similarity.use-case';
import { ImproveFlashcardUseCase } from '../modules/ai/application/use-cases/improve-flashcard.use-case';
import { GenerateStudyAidUseCase } from '../modules/ai/application/use-cases/generate-study-aid.use-case';
import type { StudyAidMode } from '../modules/ai/domain/services/study-aid-prompt';
import { ImproveQuestaoUseCase } from '../modules/ai/application/use-cases/improve-questao.use-case';
import { ImproveNotaUseCase } from '../modules/ai/application/use-cases/improve-nota.use-case';
import { ImproveProvaQuestoesUseCase } from '../modules/ai/application/use-cases/improve-questoes-batch.use-case';
import { SuggestNotaRelationsUseCase } from '../modules/ai/application/use-cases/suggest-nota-relations.use-case';
import { GenerateLearningPathUseCase } from '../modules/ai/application/use-cases/generate-learning-path.use-case';
import { GenerateNodeInsightsUseCase } from '../modules/ai/application/use-cases/generate-node-insights.use-case';
import { AutoLinkGraphUseCase } from '../modules/ai/application/use-cases/auto-link-graph.use-case';
import { AssessCompletenessUseCase } from '../modules/ai/application/use-cases/assess-completeness.use-case';
import { ApplyAutoLinkUseCase } from '../modules/ai/application/use-cases/apply-auto-link.use-case';
import { SuggestCrossGraphBridgesUseCase } from '../modules/ai/application/use-cases/suggest-cross-graph-bridges.use-case';
import { AddMissingPrerequisiteUseCase } from '../modules/ai/application/use-cases/add-missing-prerequisite.use-case';
import { AddInsightsToGraphUseCase } from '../modules/ai/application/use-cases/add-insights-to-graph.use-case';
import { DetectMissingPrerequisitesUseCase } from '../modules/ai/application/use-cases/detect-missing-prerequisites.use-case';
import { GenerateCommunitySummaryUseCase } from '../modules/ai/application/use-cases/generate-community-summary.use-case';
import { ChatWithGraphUseCase } from '../modules/ai/application/use-cases/chat-with-graph.use-case';
import { ListBaralhosInGrafoUseCase } from '../modules/ai/application/use-cases/list-baralhos-in-grafo.use-case';
import { ExpandNodeUseCase } from '../modules/ai/application/use-cases/expand-node.use-case';
import { ClassifyFlashcardUseCase } from '../modules/ai/application/use-cases/classify-flashcard.use-case';
import { FillKnowledgeGapsUseCase } from '../modules/ai/application/use-cases/fill-knowledge-gaps.use-case';
import { MergeDuplicateNodesUseCase } from '../modules/ai/application/use-cases/merge-duplicate-nodes.use-case';
import { SuggestGapFillUseCase } from '../modules/ai/application/use-cases/suggest-gap-fill.use-case';
import { AnalyzeRawTextUseCase } from '../modules/ai/application/use-cases/analyze-raw-text.use-case';
import { GenerateFlashcardsViaIaUseCase } from '../modules/ai/application/use-cases/generate-flashcards-via-ia.use-case';
import { SaveSelectedNotasUseCase } from '../modules/ai/application/use-cases/save-selected-notas.use-case';
import { PopulateGraphFromBaralhoUseCase } from '../modules/ai/application/use-cases/populate-graph-from-baralho.use-case';
import { PlanDeckClassificationChunkUseCase } from '../modules/ai/application/use-cases/plan-deck-classification-chunk.use-case';
import { ApplyDeckClassificationChunkUseCase } from '../modules/ai/application/use-cases/apply-deck-classification-chunk.use-case';
import {
  normalizeClassificationPlan,
  type RawClassificationPlan,
} from '../modules/ai/domain/services/classification-plan';
import { PlanGraphFromTextUseCase } from '../modules/ai/application/use-cases/plan-graph-from-text.use-case';
import { BuildGraphFromPlanUseCase } from '../modules/ai/application/use-cases/build-graph-from-plan.use-case';
import { GenerateGraphFromTextUseCase } from '../modules/ai/application/use-cases/generate-graph-from-text.use-case';
import { PlanGraphFromEditalUseCase } from '../modules/ai/application/use-cases/plan-graph-from-edital.use-case';
import { BuildGraphFromEditalUseCase } from '../modules/ai/application/use-cases/build-graph-from-edital.use-case';
import { RankGraphImportanceUseCase } from '../modules/ai/application/use-cases/rank-graph-importance.use-case';
import { BuildRoadmapUseCase } from '../modules/ai/application/use-cases/build-roadmap.use-case';
import { isRoadmapMode } from '../modules/ai/domain/services/roadmap-score';
import {
  EDITAL_TEXT_EXTRACTOR,
  type EditalTextExtractor,
} from '../modules/ai/domain/ports/edital-text-extractor';
import { AiDomainExceptionFilter } from '../modules/ai/interface/ai-domain-exception.filter';

@UseGuards(JwtAuthGuard)
@UseFilters(AiDomainExceptionFilter)
@Controller('ai/graph')
export class AiController {
  constructor(
    private readonly detectDuplicatesHybridUseCase: DetectDuplicatesHybridUseCase,
    private readonly detectDuplicatesBySimilarityUseCase: DetectDuplicatesBySimilarityUseCase,
    private readonly improveFlashcardUseCase: ImproveFlashcardUseCase,
    private readonly generateStudyAidUseCase: GenerateStudyAidUseCase,
    private readonly improveQuestaoUseCase: ImproveQuestaoUseCase,
    private readonly improveNotaUseCase: ImproveNotaUseCase,
    private readonly improveProvaQuestoesUseCase: ImproveProvaQuestoesUseCase,
    private readonly suggestNotaRelationsUseCase: SuggestNotaRelationsUseCase,
    private readonly generateLearningPathUseCase: GenerateLearningPathUseCase,
    private readonly generateNodeInsightsUseCase: GenerateNodeInsightsUseCase,
    private readonly autoLinkGraphUseCase: AutoLinkGraphUseCase,
    private readonly assessCompletenessUseCase: AssessCompletenessUseCase,
    private readonly applyAutoLinkUseCase: ApplyAutoLinkUseCase,
    private readonly suggestCrossGraphBridgesUseCase: SuggestCrossGraphBridgesUseCase,
    private readonly addMissingPrerequisiteUseCase: AddMissingPrerequisiteUseCase,
    private readonly addInsightsToGraphUseCase: AddInsightsToGraphUseCase,
    private readonly detectMissingPrerequisitesUseCase: DetectMissingPrerequisitesUseCase,
    private readonly generateCommunitySummaryUseCase: GenerateCommunitySummaryUseCase,
    private readonly chatWithGraphUseCase: ChatWithGraphUseCase,
    private readonly listBaralhosInGrafoUseCase: ListBaralhosInGrafoUseCase,
    private readonly expandNodeUseCase: ExpandNodeUseCase,
    private readonly classifyFlashcardUseCase: ClassifyFlashcardUseCase,
    private readonly fillKnowledgeGapsUseCase: FillKnowledgeGapsUseCase,
    private readonly mergeDuplicateNodesUseCase: MergeDuplicateNodesUseCase,
    private readonly suggestGapFillUseCase: SuggestGapFillUseCase,
    private readonly analyzeRawTextUseCase: AnalyzeRawTextUseCase,
    private readonly generateFlashcardsViaIaUseCase: GenerateFlashcardsViaIaUseCase,
    private readonly saveSelectedNotasUseCase: SaveSelectedNotasUseCase,
    private readonly populateGraphFromBaralhoUseCase: PopulateGraphFromBaralhoUseCase,
    private readonly planDeckClassificationChunkUseCase: PlanDeckClassificationChunkUseCase,
    private readonly applyDeckClassificationChunkUseCase: ApplyDeckClassificationChunkUseCase,
    private readonly planGraphFromTextUseCase: PlanGraphFromTextUseCase,
    private readonly buildGraphFromPlanUseCase: BuildGraphFromPlanUseCase,
    private readonly generateGraphFromTextUseCase: GenerateGraphFromTextUseCase,
    private readonly planGraphFromEditalUseCase: PlanGraphFromEditalUseCase,
    private readonly buildGraphFromEditalUseCase: BuildGraphFromEditalUseCase,
    private readonly rankGraphImportanceUseCase: RankGraphImportanceUseCase,
    private readonly buildRoadmapUseCase: BuildRoadmapUseCase,
    @Inject(EDITAL_TEXT_EXTRACTOR) private readonly editalExtractor: EditalTextExtractor,
  ) {}

  @Post('graphs/:grafoId/nodes/:nodeId/insights')
  nodeInsights(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('nodeId') nodeId: string,
    @Body() body?: { refresh?: boolean },
  ) {
    return this.generateNodeInsightsUseCase.execute(userId, grafoId, nodeId, {
      refresh: !!body?.refresh,
    });
  }

  @Post('graphs/:grafoId/nodes/:nodeId/insights/add')
  addInsights(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('nodeId') nodeId: string,
    @Body()
    body: {
      insights: Array<{ tipoNo: string; relacao: string; titulo: string; descricao?: string }>;
    },
  ) {
    return this.addInsightsToGraphUseCase.execute(userId, grafoId, nodeId, body.insights ?? []);
  }

  @Post('graphs/:grafoId/nota-relations')
  notaRelations(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { titulo: string; conteudo: string },
  ) {
    return this.suggestNotaRelationsUseCase.execute(
      userId,
      grafoId,
      body.titulo ?? '',
      body.conteudo ?? '',
    );
  }

  @Post('notas/:notaId/flashcards')
  generateFlashcards(@CurrentUser() userId: string, @Param('notaId') notaId: string) {
    return this.generateFlashcardsViaIaUseCase.execute(userId, notaId);
  }

  @Post('notas/analyze')
  analyzeRawText(@CurrentUser() userId: string, @Body() body: { rawText: string }) {
    return this.analyzeRawTextUseCase.execute(userId, body.rawText ?? '');
  }

  @Post('notas/save')
  saveSelectedNotas(
    @CurrentUser() userId: string,
    @Body() body: { candidatas: Array<{ titulo: string; conteudo: string }> },
  ) {
    return this.saveSelectedNotasUseCase.execute(userId, body.candidatas ?? []);
  }

  @Post('graphs/:grafoId/generate-graph')
  generateGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { rawText: string },
  ) {
    return this.generateGraphFromTextUseCase.execute(userId, grafoId, body.rawText ?? '');
  }

  @Post('graphs/:grafoId/generate-graph/plan')
  planGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { rawText: string },
  ) {
    return this.planGraphFromTextUseCase.execute(userId, grafoId, body.rawText ?? '');
  }

  @Post('graphs/:grafoId/generate-graph/build')
  buildGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { rawText: string; plan: unknown; saveBruto?: boolean },
  ) {
    return this.buildGraphFromPlanUseCase.execute(
      userId,
      grafoId,
      body.rawText ?? '',
      body.plan,
      body.saveBruto !== false,
    );
  }

  // Edital-driven graph completion: upload the notice PDF → plan mirroring its
  // hierarchy (reusing existing nodes); then build persists the missing ones.
  @Post('graphs/:grafoId/edital/plan')
  @UseInterceptors(FileInterceptor('edital', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async planEdital(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @UploadedFile() edital?: Express.Multer.File,
  ) {
    if (!edital) throw new BadRequestException('Arquivo do edital é obrigatório.');
    const text = await this.editalExtractor.extract({
      buffer: edital.buffer,
      originalname: edital.originalname,
    });
    return this.planGraphFromEditalUseCase.execute(userId, grafoId, text);
  }

  @Post('graphs/:grafoId/edital/build')
  buildEdital(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { plan: unknown },
  ) {
    return this.buildGraphFromEditalUseCase.execute(userId, grafoId, body.plan);
  }

  // Ranks the graph's concepts by study importance (past-exam frequency balanced
  // with edital emphasis). provaWeight (0..1) tunes the balance.
  @Post('graphs/:grafoId/importance')
  rankImportance(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { provaWeight?: number },
  ) {
    return this.rankGraphImportanceUseCase.execute(userId, grafoId, body.provaWeight);
  }

  @Post('graphs/:grafoId/gap-suggestions')
  gapSuggestions(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { labelsA: string[]; labelsB: string[]; bridgeA: string; bridgeB: string },
  ) {
    return this.suggestGapFillUseCase.execute(userId, grafoId, body);
  }

  @Post('graphs/:grafoId/auto-link')
  autoLink(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.autoLinkGraphUseCase.execute(userId, grafoId);
  }

  @Post('graphs/:grafoId/auto-link/apply')
  applyAutoLink(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { edges: Array<{ sourceId: string; targetId: string; relacao: string }> },
  ) {
    return this.applyAutoLinkUseCase.execute(userId, grafoId, body.edges ?? []);
  }

  // Bridges reuse the auto-link apply endpoint above to write: a bridge IS an edge,
  // it just happens to join concepts the user keeps in two different graphs.
  @Post('graphs/:grafoId/bridges')
  suggestBridges(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { percentile?: number },
  ) {
    return this.suggestCrossGraphBridgesUseCase.execute(userId, grafoId, body?.percentile);
  }

  // "IA" mode = hybrid: embeddings shortlist the candidates, the LLM only confirms
  // the uncertain ones, and an incremental cache skips unchanged clusters.
  @Post('graphs/:grafoId/detect-duplicates')
  detectDuplicates(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.detectDuplicatesHybridUseCase.execute(userId, grafoId);
  }

  // Similarity-only detection (embeddings, no LLM): scales to large graphs the LLM
  // detector truncates. `threshold` (0..1) tunes strictness; omit for the default.
  @Post('graphs/:grafoId/detect-duplicates-similar')
  detectDuplicatesSimilar(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { threshold?: number },
  ) {
    return this.detectDuplicatesBySimilarityUseCase.execute(userId, grafoId, body?.threshold);
  }

  @Post('graphs/:grafoId/nodes/:nodeId/expand')
  expandNode(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.expandNodeUseCase.execute(userId, grafoId, nodeId);
  }

  @Post('graphs/:grafoId/nodes/:nodeId/classify-flashcard')
  classifyFlashcard(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.classifyFlashcardUseCase.execute(userId, grafoId, nodeId);
  }

  @Post('graphs/:grafoId/community-summary')
  communitySummary(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { nodeIds: string[] },
  ) {
    return this.generateCommunitySummaryUseCase.execute(userId, grafoId, body.nodeIds ?? []);
  }

  @Post('graphs/:grafoId/missing-prerequisites')
  missingPrerequisites(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.detectMissingPrerequisitesUseCase.execute(userId, grafoId);
  }

  @Post('graphs/:grafoId/missing-prerequisites/add')
  addPrerequisite(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { nome: string; tipo: string; connectToIds: string[] },
  ) {
    return this.addMissingPrerequisiteUseCase.execute(
      userId,
      grafoId,
      body.nome,
      body.tipo,
      body.connectToIds ?? [],
    );
  }

  @Post('graphs/:grafoId/learning-path')
  learningPath(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.generateLearningPathUseCase.execute(userId, grafoId);
  }

  // Builds/persists the study roadmap for a mode, recomputing only the delta.
  @Post('graphs/:grafoId/roadmap')
  roadmap(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { modo: string; regenerate?: boolean; provaId?: string; editalId?: string },
  ) {
    if (!isRoadmapMode(body.modo)) {
      throw new BadRequestException(
        `invalid roadmap mode: "${body.modo}". Expected: ai|prova|edital|prova_edital`,
      );
    }
    return this.buildRoadmapUseCase.execute(userId, grafoId, body.modo, {
      regenerate: body.regenerate,
      provaId: body.provaId,
      editalId: body.editalId,
    });
  }

  // Melhora um flashcard aplicando só as operações escolhidas (formatação, estilo
  // markdown, conteúdo). Recebe o conteúdo no corpo — sem contexto do grafo, barato.
  @Post('flashcards/improve')
  improveFlashcard(
    @CurrentUser() userId: string,
    @Body() body: { pergunta: string; resposta: string; operations: unknown },
  ) {
    return this.improveFlashcardUseCase.execute(userId, body);
  }

  // Dica socrática (não revela a resposta) ou mnemônico para um card em que o
  // aluno tropeça. Conteúdo no corpo — sem contexto do grafo, barato.
  @Post('flashcards/study-aid')
  studyAid(
    @CurrentUser() userId: string,
    @Body()
    body: { mode: StudyAidMode; pergunta: string; resposta: string; conceito?: string | null },
  ) {
    return this.generateStudyAidUseCase.execute(userId, body.mode, {
      pergunta: body.pergunta,
      resposta: body.resposta,
      conceito: body.conceito ?? null,
    });
  }

  // Melhora uma questão preservando gabarito/letras; recebe a questão no corpo.
  @Post('questions/improve')
  improveQuestao(
    @CurrentUser() userId: string,
    @Body()
    body: {
      tipo: string;
      enunciado: string;
      alternativas: { letra: string; texto: string }[];
      gabarito: string;
      explicacao: string;
      operations: unknown;
    },
  ) {
    return this.improveQuestaoUseCase.execute(userId, body);
  }

  @Post('notas/improve')
  improveNota(
    @CurrentUser() userId: string,
    @Body() body: { titulo: string; conteudo: string; operations: unknown },
  ) {
    return this.improveNotaUseCase.execute(userId, body);
  }

  // Melhora TODAS as questões numa chamada (usado na importação de prova).
  @Post('questions/improve-batch')
  improveQuestoesBatch(
    @CurrentUser() userId: string,
    @Body() body: { questoes: unknown; operations: unknown },
  ) {
    return this.improveProvaQuestoesUseCase.execute(userId, body as never);
  }

  @Post('graphs/:grafoId/chat')
  chat(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body()
    body: { question: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> },
  ) {
    return this.chatWithGraphUseCase.execute(
      userId,
      grafoId,
      body.question ?? '',
      body.history ?? [],
    );
  }

  @Post('graphs/:grafoId/assess-completeness')
  assessCompleteness(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.assessCompletenessUseCase.execute(userId, grafoId);
  }

  @Post('graphs/:grafoId/fill-gaps')
  fillGaps(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body()
    body: {
      gaps: Array<{
        nome: string;
        tipo: 'missing' | 'shallow';
        assuntoId: string;
        assuntoNome: string;
      }>;
    },
  ) {
    return this.fillKnowledgeGapsUseCase.execute(userId, grafoId, body.gaps ?? []);
  }

  @Post('graphs/:grafoId/baralhos')
  listBaralhosInGrafo(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.listBaralhosInGrafoUseCase.execute(userId, grafoId);
  }

  @Post('graphs/:grafoId/baralhos/:baralhoId/populate')
  populateFromBaralho(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('baralhoId') baralhoId: string,
  ) {
    return this.populateGraphFromBaralhoUseCase.execute(userId, grafoId, baralhoId);
  }

  @Post('graphs/:grafoId/baralhos/:baralhoId/classification/plan')
  planDeckClassificationChunk(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('baralhoId') baralhoId: string,
    @Body() body: { chunkSize?: number },
  ) {
    return this.planDeckClassificationChunkUseCase.execute(
      userId,
      grafoId,
      baralhoId,
      body?.chunkSize,
    );
  }

  @Post('graphs/:grafoId/baralhos/:baralhoId/classification/apply')
  applyDeckClassificationChunk(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('baralhoId') baralhoId: string,
    @Body() body: { plan?: RawClassificationPlan },
  ) {
    const plan = normalizeClassificationPlan(body?.plan ?? {});
    return this.applyDeckClassificationChunkUseCase.execute(userId, grafoId, baralhoId, plan);
  }

  @Post('graphs/:grafoId/merge-duplicates')
  mergeDuplicates(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { keepId: string; deleteIds: string[] },
  ) {
    return this.mergeDuplicateNodesUseCase.execute(
      userId,
      grafoId,
      body.keepId,
      body.deleteIds ?? [],
    );
  }
}
