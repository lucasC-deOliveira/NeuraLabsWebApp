import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GraphService, type CreateNodeInput } from './graph.service';

type TipoNode = CreateNodeInput['tipoNode'];

@UseGuards(JwtAuthGuard)
@Controller('graph')
export class GraphController {
  constructor(private readonly graph: GraphService) {}

  // ---- Grafos ----
  @Get('graphs')
  listGraphs(@CurrentUser() userId: string) {
    return this.graph.listGraphs(userId);
  }

  @Post('graphs')
  createGraph(@CurrentUser() userId: string, @Body() body: { nome: string; descricao?: string }) {
    return this.graph.createGraph(userId, body.nome, body.descricao);
  }

  @Delete('graphs/:id')
  deleteGraph(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.graph.deleteGraph(userId, id);
  }

  @Get('graphs/:id/info')
  graphInfo(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.graph.getGraphInfo(userId, id);
  }

  @Patch('graphs/:id')
  renameGraph(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: { nome: string }) {
    return this.graph.updateGraphName(userId, id, body.nome);
  }

  @Get('graphs/:id/visual')
  loadVisual(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.graph.loadVisualState(userId, id);
  }

  @Put('graphs/:id/visual')
  saveVisual(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: { state: unknown }) {
    return this.graph.saveVisualState(userId, id, body.state);
  }

  // ---- Grafo (nós + arestas) ----
  @Get()
  load(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.graph.loadGraph(userId, grafoId);
  }

  @Get('edges')
  edges(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.graph.getEdges(userId, grafoId);
  }

  @Get('search')
  search(@CurrentUser() userId: string, @Query('grafoId') grafoId: string, @Query('q') q: string) {
    return this.graph.searchNodeContent(userId, grafoId, q ?? '');
  }

  @Get('available-items')
  availableItems(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.graph.availableItems(userId, grafoId);
  }

  @Get('flashcards')
  flashcards(@CurrentUser() userId: string) {
    return this.graph.listFlashcardsForDeck(userId);
  }

  // ---- Nós ----
  @Post('graphs/:grafoId/nodes')
  createNode(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: CreateNodeInput) {
    return this.graph.createNode(userId, grafoId, body);
  }

  // vincula uma entidade já existente ao grafo
  @Post('graphs/:grafoId/nodes/link')
  addExisting(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: { tipoNode: TipoNode; entityId: string }) {
    return this.graph.addExistingNode(userId, grafoId, body.tipoNode, body.entityId);
  }

  @Post('graphs/:grafoId/baralho')
  createBaralho(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: { titulo: string; flashcardIds: string[] }) {
    return this.graph.createBaralho(userId, grafoId, body.titulo, body.flashcardIds ?? []);
  }

  @Patch('nodes/:refId')
  updateNode(@CurrentUser() userId: string, @Param('refId') refId: string, @Body() body: Partial<CreateNodeInput> & { tipoNode: TipoNode }) {
    return this.graph.updateNode(userId, body.tipoNode, refId, body);
  }

  @Delete('nodes/:refId')
  deleteNode(@CurrentUser() userId: string, @Param('refId') refId: string, @Query('grafoId') grafoId?: string) {
    return this.graph.deleteNode(userId, refId, grafoId);
  }

  // remove só o vínculo do nó com o grafo (mantém a entidade)
  @Delete('graphs/:grafoId/nodes/:refId')
  removeNode(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Param('refId') refId: string) {
    return this.graph.removeNode(userId, grafoId, refId);
  }

  @Get('nodes/:refId/details')
  nodeDetails(@CurrentUser() userId: string, @Param('refId') refId: string, @Query('tipoNode') tipoNode: TipoNode) {
    return this.graph.getNodeDetails(userId, tipoNode, refId);
  }

  // ---- Arestas ----
  @Post('graphs/:grafoId/edges')
  createEdge(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: { sourceNodeId: string; targetNodeId: string; tipoRelacao: string; peso?: number }) {
    return this.graph.createEdge(userId, grafoId, body);
  }

  @Patch('graphs/:grafoId/edges/:id')
  updateEdge(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Param('id') id: string, @Body() body: { tipoRelacao?: string; peso?: number }) {
    return this.graph.updateEdge(userId, grafoId, id, body);
  }

  @Delete('graphs/:grafoId/edges/:id')
  deleteEdge(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Param('id') id: string) {
    return this.graph.deleteEdge(userId, grafoId, id);
  }

  // ---- Posições ----
  @Post('graphs/:grafoId/positions')
  savePositions(@CurrentUser() userId: string, @Param('grafoId') grafoId: string, @Body() body: { positions: Record<string, { x: number; y: number }> }) {
    return this.graph.savePositions(userId, grafoId, body.positions);
  }
}
