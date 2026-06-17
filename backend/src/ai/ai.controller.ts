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
}
