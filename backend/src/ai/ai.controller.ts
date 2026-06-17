import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai/graph')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('graphs/:grafoId/nodes/:nodeId/insights')
  nodeInsights(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Param('nodeId') nodeId: string) {
    return this.ai.generateNodeInsights(userId, grafoId, nodeId);
  }

  @Post('graphs/:grafoId/nodes/:nodeId/insights/add')
  addInsights(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('nodeId') nodeId: string,
    @Body() body: { insights: Array<{ tipoNo: string; relacao: string; titulo: string; descricao?: string }> },
  ) {
    return this.ai.addInsightsToGraph(userId, grafoId, nodeId, body.insights ?? []);
  }

  @Post('graphs/:grafoId/nota-relations')
  notaRelations(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: { titulo: string; conteudo: string }) {
    return this.ai.suggestNotaRelations(userId, grafoId, body.titulo ?? '', body.conteudo ?? '');
  }

  @Post('notas/:notaId/flashcards')
  generateFlashcards(@CurrentUser() userId: string, @Param('notaId') notaId: string) {
    return this.ai.generateFlashcardsViaIA(userId, notaId);
  }

  @Post('notas/analyze')
  analyzeRawText(@CurrentUser() userId: string, @Body() body: { rawText: string }) {
    return this.ai.analyzeRawText(userId, body.rawText ?? '');
  }

  @Post('notas/save')
  saveSelectedNotas(@CurrentUser() userId: string, @Body() body: { candidatas: Array<{ titulo: string; conteudo: string }> }) {
    return this.ai.saveSelectedNotas(userId, body.candidatas ?? []);
  }

  @Post('graphs/:grafoId/generate-graph')
  generateGraph(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: { rawText: string }) {
    return this.ai.generateGraphFromText(userId, grafoId, body.rawText ?? '');
  }

  @Post('graphs/:grafoId/gap-suggestions')
  gapSuggestions(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { labelsA: string[]; labelsB: string[]; bridgeA: string; bridgeB: string },
  ) {
    return this.ai.suggestGapFill(userId, grafoId, body);
  }

  @Post('graphs/:grafoId/auto-link')
  autoLink(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.ai.autoLinkGraph(userId, grafoId);
  }

  @Post('graphs/:grafoId/auto-link/apply')
  applyAutoLink(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { edges: Array<{ sourceId: string; targetId: string; relacao: string }> },
  ) {
    return this.ai.applyAutoLink(userId, grafoId, body.edges ?? []);
  }

  @Post('graphs/:grafoId/detect-duplicates')
  detectDuplicates(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.ai.detectDuplicates(userId, grafoId);
  }

  @Post('graphs/:grafoId/nodes/:nodeId/expand')
  expandNode(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Param('nodeId') nodeId: string) {
    return this.ai.expandNode(userId, grafoId, nodeId);
  }

  @Post('graphs/:grafoId/community-summary')
  communitySummary(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: { nodeIds: string[] }) {
    return this.ai.generateCommunitySummary(userId, grafoId, body.nodeIds ?? []);
  }

  @Post('graphs/:grafoId/missing-prerequisites')
  missingPrerequisites(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.ai.detectMissingPrerequisites(userId, grafoId);
  }

  @Post('graphs/:grafoId/missing-prerequisites/add')
  addPrerequisite(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { nome: string; tipo: string; connectToIds: string[] },
  ) {
    return this.ai.addMissingPrerequisite(userId, grafoId, body.nome, body.tipo, body.connectToIds ?? []);
  }

  @Post('graphs/:grafoId/learning-path')
  learningPath(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.ai.generateLearningPath(userId, grafoId);
  }

  @Post('graphs/:grafoId/chat')
  chat(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { question: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> },
  ) {
    return this.ai.chatWithGraph(userId, grafoId, body.question ?? '', body.history ?? []);
  }

  @Post('graphs/:grafoId/assess-completeness')
  assessCompleteness(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.ai.assessCompleteness(userId, grafoId);
  }

  @Post('graphs/:grafoId/merge-duplicates')
  mergeDuplicates(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { keepId: string; deleteIds: string[] },
  ) {
    return this.ai.mergeDuplicateNodes(userId, grafoId, body.keepId, body.deleteIds ?? []);
  }
}
