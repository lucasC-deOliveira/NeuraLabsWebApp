import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { GraphService, type CreateNodeInput } from './graph.service';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { UpdateEdgeUseCase } from '../modules/graph/application/use-cases/update-edge.use-case';
import { DeleteEdgeUseCase } from '../modules/graph/application/use-cases/delete-edge.use-case';
import { AddExistingNodeUseCase } from '../modules/graph/application/use-cases/add-existing-node.use-case';
import { RemoveNodeUseCase } from '../modules/graph/application/use-cases/remove-node.use-case';
import { CreateGraphUseCase } from '../modules/graph/application/use-cases/create-graph.use-case';
import { RenameGraphUseCase } from '../modules/graph/application/use-cases/rename-graph.use-case';
import { ListGraphsUseCase } from '../modules/graph/application/use-cases/list-graphs.use-case';
import { GetGraphInfoUseCase } from '../modules/graph/application/use-cases/get-graph-info.use-case';
import { DeleteGraphUseCase } from '../modules/graph/application/use-cases/delete-graph.use-case';
import { DeleteNodeUseCase } from '../modules/graph/application/use-cases/delete-node.use-case';
import { SaveVisualStateUseCase } from '../modules/graph/application/use-cases/save-visual-state.use-case';
import { LoadVisualStateUseCase } from '../modules/graph/application/use-cases/load-visual-state.use-case';
import { GetNodeDetailsUseCase } from '../modules/graph/application/use-cases/get-node-details.use-case';
import { GetEdgesUseCase } from '../modules/graph/application/use-cases/get-edges.use-case';
import { SearchNodeContentUseCase } from '../modules/graph/application/use-cases/search-node-content.use-case';
import { ListUserFlashcardsUseCase } from '../modules/graph/application/use-cases/list-user-flashcards.use-case';
import { GetDeckForStudyUseCase } from '../modules/graph/application/use-cases/get-deck-for-study.use-case';
import { SavePositionsUseCase } from '../modules/graph/application/use-cases/save-positions.use-case';
import { GetAvailableItemsUseCase } from '../modules/graph/application/use-cases/get-available-items.use-case';
import { CreateNodeUseCase } from '../modules/graph/application/use-cases/create-node.use-case';
import { GraphDomainExceptionFilter } from '../modules/graph/interface/graph-domain-exception.filter';

type TipoNode = CreateNodeInput['tipoNode'];

@UseGuards(JwtAuthGuard)
@UseFilters(GraphDomainExceptionFilter)
@Controller('graph')
export class GraphController {
  constructor(
    private readonly graph: GraphService,
    private readonly createEdgeUseCase: CreateEdgeUseCase,
    private readonly updateEdgeUseCase: UpdateEdgeUseCase,
    private readonly deleteEdgeUseCase: DeleteEdgeUseCase,
    private readonly addExistingNodeUseCase: AddExistingNodeUseCase,
    private readonly removeNodeUseCase: RemoveNodeUseCase,
    private readonly createGraphUseCase: CreateGraphUseCase,
    private readonly renameGraphUseCase: RenameGraphUseCase,
    private readonly listGraphsUseCase: ListGraphsUseCase,
    private readonly getGraphInfoUseCase: GetGraphInfoUseCase,
    private readonly deleteGraphUseCase: DeleteGraphUseCase,
    private readonly deleteNodeUseCase: DeleteNodeUseCase,
    private readonly saveVisualStateUseCase: SaveVisualStateUseCase,
    private readonly loadVisualStateUseCase: LoadVisualStateUseCase,
    private readonly getNodeDetailsUseCase: GetNodeDetailsUseCase,
    private readonly getEdgesUseCase: GetEdgesUseCase,
    private readonly searchNodeContentUseCase: SearchNodeContentUseCase,
    private readonly listUserFlashcardsUseCase: ListUserFlashcardsUseCase,
    private readonly getDeckForStudyUseCase: GetDeckForStudyUseCase,
    private readonly savePositionsUseCase: SavePositionsUseCase,
    private readonly getAvailableItemsUseCase: GetAvailableItemsUseCase,
    private readonly createNodeUseCase: CreateNodeUseCase,
  ) {}

  // ---- Grafos ----
  @Get('graphs')
  listGraphs(@CurrentUser() userId: string) {
    return this.listGraphsUseCase.execute(userId);
  }

  @Post('graphs')
  createGraph(@CurrentUser() userId: string, @Body() body: { nome: string; descricao?: string }) {
    return this.createGraphUseCase.execute(userId, body.nome, body.descricao);
  }

  @Delete('graphs/:id')
  deleteGraph(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Query('keep') keep?: string,
  ) {
    const keepTypes = keep ? keep.split(',').filter(Boolean) : [];
    return this.deleteGraphUseCase.execute(userId, id, keepTypes);
  }

  @Get('graphs/:id/info')
  graphInfo(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.getGraphInfoUseCase.execute(userId, id);
  }

  @Patch('graphs/:id')
  renameGraph(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: { nome: string },
  ) {
    return this.renameGraphUseCase.execute(userId, id, body.nome);
  }

  @Get('graphs/:id/visual')
  loadVisual(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.loadVisualStateUseCase.execute(userId, id);
  }

  @Put('graphs/:id/visual')
  saveVisual(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: { state: unknown },
  ) {
    return this.saveVisualStateUseCase.execute(userId, id, body.state);
  }

  // ---- Grafo (nós + arestas) ----
  @Get()
  load(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.graph.loadGraph(userId, grafoId);
  }

  @Get('edges')
  edges(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.getEdgesUseCase.execute(userId, grafoId);
  }

  @Get('search')
  search(@CurrentUser() userId: string, @Query('grafoId') grafoId: string, @Query('q') q: string) {
    return this.searchNodeContentUseCase.execute(userId, grafoId, q ?? '');
  }

  @Get('available-items')
  availableItems(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.getAvailableItemsUseCase.execute(userId, grafoId);
  }

  @Get('flashcards')
  flashcards(@CurrentUser() userId: string) {
    return this.listUserFlashcardsUseCase.execute(userId);
  }

  @Get('baralho/:baralhoId/study')
  deckForStudy(@CurrentUser() userId: string, @Param('baralhoId') baralhoId: string) {
    return this.getDeckForStudyUseCase.execute(userId, baralhoId);
  }

  // ---- Nós ----
  @Post('graphs/:grafoId/nodes')
  createNode(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: CreateNodeInput,
  ) {
    return this.createNodeUseCase.execute(userId, grafoId, body);
  }

  // vincula uma entidade já existente ao grafo
  @Post('graphs/:grafoId/nodes/link')
  addExisting(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { tipoNode: TipoNode; entityId: string },
  ) {
    return this.addExistingNodeUseCase.execute(userId, grafoId, body.tipoNode, body.entityId);
  }

  @Post('graphs/:grafoId/baralho')
  createBaralho(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { titulo: string; flashcardIds: string[] },
  ) {
    return this.graph.createBaralho(userId, grafoId, body.titulo, body.flashcardIds ?? []);
  }

  @Post('graphs/:grafoId/prova')
  addProva(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { provaId: string },
  ) {
    return this.graph.addProvaToGraph(userId, grafoId, body.provaId);
  }

  @Post('graphs/:grafoId/import')
  importGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { nodes: unknown[]; edges: unknown[] },
  ) {
    return this.graph.importGraph(userId, grafoId, body as never);
  }

  @Get('graphs/:grafoId/export')
  exportGraph(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.graph.exportGraph(userId, grafoId);
  }

  @Post('graphs/:grafoId/sync')
  syncFromVault(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { nodes: any[]; edges: any[] },
  ) {
    return this.graph.syncGraphFromVault(userId, grafoId, body as never);
  }

  @Patch('nodes/:refId')
  updateNode(
    @CurrentUser() userId: string,
    @Param('refId') refId: string,
    @Body() body: Partial<CreateNodeInput> & { tipoNode: TipoNode },
  ) {
    return this.graph.updateNode(userId, body.tipoNode, refId, body);
  }

  @Delete('nodes/:refId')
  deleteNode(
    @CurrentUser() userId: string,
    @Param('refId') refId: string,
    @Query('grafoId') grafoId?: string,
    @Query('deleteConnected') deleteConnected?: string,
  ) {
    return this.deleteNodeUseCase.execute(userId, refId, grafoId, deleteConnected === 'true');
  }

  // remove só o vínculo do nó com o grafo (mantém a entidade)
  @Delete('graphs/:grafoId/nodes/:refId')
  removeNode(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('refId') refId: string,
  ) {
    return this.removeNodeUseCase.execute(userId, grafoId, refId);
  }

  @Get('nodes/:refId/details')
  nodeDetails(
    @CurrentUser() userId: string,
    @Param('refId') refId: string,
    @Query('tipoNode') tipoNode: TipoNode,
  ) {
    return this.getNodeDetailsUseCase.execute(userId, tipoNode, refId);
  }

  // ---- Arestas ----
  @Post('graphs/:grafoId/edges')
  createEdge(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body()
    body: { sourceNodeId: string; targetNodeId: string; tipoRelacao: string; peso?: number },
  ) {
    return this.createEdgeUseCase.execute({ userId, grafoId, ...body });
  }

  @Patch('graphs/:grafoId/edges/:id')
  updateEdge(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('id') id: string,
    @Body() body: { tipoRelacao?: string; peso?: number },
  ) {
    return this.updateEdgeUseCase.execute({ userId, grafoId, edgeId: id, ...body });
  }

  @Delete('graphs/:grafoId/edges/:id')
  deleteEdge(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('id') id: string,
  ) {
    return this.deleteEdgeUseCase.execute(userId, grafoId, id);
  }

  // ---- Posições ----
  @Post('graphs/:grafoId/positions')
  savePositions(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { positions: Record<string, { x: number; y: number }> },
  ) {
    return this.savePositionsUseCase.execute(userId, grafoId, body.positions);
  }

  // ---- Subgrafos ----
  @Post('graphs/:grafoId/subgrafos')
  createSubgrafo(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body()
    body: { nome: string; descricao?: string; tipoRelacao: string; posX?: number; posY?: number },
  ) {
    return this.graph.createSubgrafo(userId, grafoId, body);
  }

  @Post('graphs/:grafoId/extract')
  extractSubgrafo(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Body() body: { nodeIds: string[]; nome: string; tipoRelacao: string },
  ) {
    return this.graph.extractNodesToSubgrafo(userId, grafoId, body);
  }

  @Get('graphs/:grafoId/expand')
  expandSubgrafo(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.graph.expandSubgrafo(userId, grafoId);
  }
}
