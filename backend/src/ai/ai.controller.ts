import { Body, Controller, Param, Post, UseFilters, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiService } from './ai.service';
import { DetectDuplicatesUseCase } from '../modules/ai/application/use-cases/detect-duplicates.use-case';
import { SuggestNotaRelationsUseCase } from '../modules/ai/application/use-cases/suggest-nota-relations.use-case';
import { GenerateLearningPathUseCase } from '../modules/ai/application/use-cases/generate-learning-path.use-case';
import { GenerateNodeInsightsUseCase } from '../modules/ai/application/use-cases/generate-node-insights.use-case';
import { AutoLinkGraphUseCase } from '../modules/ai/application/use-cases/auto-link-graph.use-case';
import { AssessCompletenessUseCase } from '../modules/ai/application/use-cases/assess-completeness.use-case';
import { ApplyAutoLinkUseCase } from '../modules/ai/application/use-cases/apply-auto-link.use-case';
import { AddMissingPrerequisiteUseCase } from '../modules/ai/application/use-cases/add-missing-prerequisite.use-case';
import { AddInsightsToGraphUseCase } from '../modules/ai/application/use-cases/add-insights-to-graph.use-case';
import { DetectMissingPrerequisitesUseCase } from '../modules/ai/application/use-cases/detect-missing-prerequisites.use-case';
import { GenerateCommunitySummaryUseCase } from '../modules/ai/application/use-cases/generate-community-summary.use-case';
import { ChatWithGraphUseCase } from '../modules/ai/application/use-cases/chat-with-graph.use-case';
import { ListBaralhosInGrafoUseCase } from '../modules/ai/application/use-cases/list-baralhos-in-grafo.use-case';
import { ExpandNodeUseCase } from '../modules/ai/application/use-cases/expand-node.use-case';
import { FillKnowledgeGapsUseCase } from '../modules/ai/application/use-cases/fill-knowledge-gaps.use-case';
import { MergeDuplicateNodesUseCase } from '../modules/ai/application/use-cases/merge-duplicate-nodes.use-case';
import { SuggestGapFillUseCase } from '../modules/ai/application/use-cases/suggest-gap-fill.use-case';
import { AnalyzeRawTextUseCase } from '../modules/ai/application/use-cases/analyze-raw-text.use-case';
import { GenerateFlashcardsViaIaUseCase } from '../modules/ai/application/use-cases/generate-flashcards-via-ia.use-case';
import { SaveSelectedNotasUseCase } from '../modules/ai/application/use-cases/save-selected-notas.use-case';
import { AiDomainExceptionFilter } from '../modules/ai/interface/ai-domain-exception.filter';

@UseGuards(JwtAuthGuard)
@UseFilters(AiDomainExceptionFilter)
@Controller('ai/graph')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly detectDuplicatesUseCase: DetectDuplicatesUseCase,
    private readonly suggestNotaRelationsUseCase: SuggestNotaRelationsUseCase,
    private readonly generateLearningPathUseCase: GenerateLearningPathUseCase,
    private readonly generateNodeInsightsUseCase: GenerateNodeInsightsUseCase,
    private readonly autoLinkGraphUseCase: AutoLinkGraphUseCase,
    private readonly assessCompletenessUseCase: AssessCompletenessUseCase,
    private readonly applyAutoLinkUseCase: ApplyAutoLinkUseCase,
    private readonly addMissingPrerequisiteUseCase: AddMissingPrerequisiteUseCase,
    private readonly addInsightsToGraphUseCase: AddInsightsToGraphUseCase,
    private readonly detectMissingPrerequisitesUseCase: DetectMissingPrerequisitesUseCase,
    private readonly generateCommunitySummaryUseCase: GenerateCommunitySummaryUseCase,
    private readonly chatWithGraphUseCase: ChatWithGraphUseCase,
    private readonly listBaralhosInGrafoUseCase: ListBaralhosInGrafoUseCase,
    private readonly expandNodeUseCase: ExpandNodeUseCase,
    private readonly fillKnowledgeGapsUseCase: FillKnowledgeGapsUseCase,
    private readonly mergeDuplicateNodesUseCase: MergeDuplicateNodesUseCase,
    private readonly suggestGapFillUseCase: SuggestGapFillUseCase,
    private readonly analyzeRawTextUseCase: AnalyzeRawTextUseCase,
    private readonly generateFlashcardsViaIaUseCase: GenerateFlashcardsViaIaUseCase,
    private readonly saveSelectedNotasUseCase: SaveSelectedNotasUseCase,
  ) {}

  @Post('graphs/:grafoId/nodes/:nodeId/insights')
  nodeInsights(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.generateNodeInsightsUseCase.execute(userId, grafoId, nodeId);
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
    return this.ai.generateGraphFromText(userId, grafoId, body.rawText ?? '');
  }

  @Post('graphs/:grafoId/generate-graph/plan')
  planGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { rawText: string },
  ) {
    return this.ai.planGraphFromText(userId, grafoId, body.rawText ?? '');
  }

  @Post('graphs/:grafoId/generate-graph/build')
  buildGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { rawText: string; plan: any; saveBruto?: boolean },
  ) {
    return this.ai.buildGraphFromPlan(
      userId,
      grafoId,
      body.rawText ?? '',
      body.plan,
      body.saveBruto !== false,
    );
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

  @Post('graphs/:grafoId/detect-duplicates')
  detectDuplicates(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.detectDuplicatesUseCase.execute(userId, grafoId);
  }

  @Post('graphs/:grafoId/nodes/:nodeId/expand')
  expandNode(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.expandNodeUseCase.execute(userId, grafoId, nodeId);
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
    return this.ai.populateGraphFromBaralho(userId, grafoId, baralhoId);
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
