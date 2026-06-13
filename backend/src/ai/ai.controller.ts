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
}
