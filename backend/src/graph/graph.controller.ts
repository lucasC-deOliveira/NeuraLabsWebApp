import { ZodBody } from '../common/zod-body.decorator';
import {
  addProvaToGraphContract,
  composeGraphContract,
  createEdgeContract,
  createGraphBaralhoContract,
  createGraphContract,
  createNodeContract,
  importGraphContract,
  updateNodeContract,
  vaultSyncContract,
  createSubgraphContract,
  extractSubgraphContract,
  graphPositionsContract,
  graphVisualContract,
  linkNodeContract,
  renameGraphContract,
  updateEdgeContract,
} from '../../../contracts/graph';
import type {
  AddProvaToGraphBody,
  ComposeGraphBody,
  CreateEdgeBody,
  CreateGraphBaralhoBody,
  CreateGraphBody,
  CreateNodeBody,
  ImportGraphBody,
  UpdateNodeBody,
  VaultSyncBody,
  CreateSubgraphBody,
  ExtractSubgraphBody,
  GraphPositionsBody,
  GraphVisualBody,
  LinkNodeBody,
  RenameGraphBody,
  UpdateEdgeBody,
} from '../../../contracts/graph';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import type { CreateNodeInput } from './node-input.types';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { UpdateEdgeUseCase } from '../modules/graph/application/use-cases/update-edge.use-case';
import { DeleteEdgeUseCase } from '../modules/graph/application/use-cases/delete-edge.use-case';
import { AddExistingNodeUseCase } from '../modules/graph/application/use-cases/add-existing-node.use-case';
import { RemoveNodeUseCase } from '../modules/graph/application/use-cases/remove-node.use-case';
import { CreateGraphUseCase } from '../modules/graph/application/use-cases/create-graph.use-case';
import { RenameGraphUseCase } from '../modules/graph/application/use-cases/rename-graph.use-case';
import { ListGraphsUseCase } from '../modules/graph/application/use-cases/list-graphs.use-case';
import { ListGraphAssuntosUseCase } from '../modules/graph/application/use-cases/list-graph-assuntos.use-case';
import type { RawGraphListQuery } from '../modules/graph/domain/services/parse-graph-list-query';
import { GetGraphInfoUseCase } from '../modules/graph/application/use-cases/get-graph-info.use-case';
import { DeleteGraphUseCase } from '../modules/graph/application/use-cases/delete-graph.use-case';
import { DeleteNodeUseCase } from '../modules/graph/application/use-cases/delete-node.use-case';
import { SaveVisualStateUseCase } from '../modules/graph/application/use-cases/save-visual-state.use-case';
import { LoadVisualStateUseCase } from '../modules/graph/application/use-cases/load-visual-state.use-case';
import { GetNodeDetailsUseCase } from '../modules/graph/application/use-cases/get-node-details.use-case';
import { ListEntityGraphsUseCase } from '../modules/graph/application/use-cases/list-entity-graphs.use-case';
import { GetEdgesUseCase } from '../modules/graph/application/use-cases/get-edges.use-case';
import { SearchNodeContentUseCase } from '../modules/graph/application/use-cases/search-node-content.use-case';
import { ListUserFlashcardsUseCase } from '../modules/graph/application/use-cases/list-user-flashcards.use-case';
import { GetDeckForStudyUseCase } from '../modules/graph/application/use-cases/get-deck-for-study.use-case';
import { SavePositionsUseCase } from '../modules/graph/application/use-cases/save-positions.use-case';
import { GetAvailableItemsUseCase } from '../modules/graph/application/use-cases/get-available-items.use-case';
import { CreateNodeUseCase } from '../modules/graph/application/use-cases/create-node.use-case';
import { UpdateNodeUseCase } from '../modules/graph/application/use-cases/update-node.use-case';
import { CreateDeckUseCase } from '../modules/graph/application/use-cases/create-deck.use-case';
import { AddProvaToGraphUseCase } from '../modules/graph/application/use-cases/add-prova-to-graph.use-case';
import { GetItemCompositionUseCase } from '../modules/graph/application/use-cases/get-item-composition.use-case';
import { ComposeItemIntoGraphUseCase } from '../modules/graph/application/use-cases/compose-item-into-graph.use-case';
import type { CompositionRootType } from '../modules/graph/domain/ports/composition-source';
import type { CompositionGraph } from '../modules/graph/domain/composition-views';
import type { ComposeResult } from '../modules/graph/domain/ports/compose-into-graph-repository';
import { CreateSubgraphUseCase } from '../modules/graph/application/use-cases/create-subgraph.use-case';
import { ExtractSubgraphUseCase } from '../modules/graph/application/use-cases/extract-subgraph.use-case';
import { LoadGraphUseCase } from '../modules/graph/application/use-cases/load-graph.use-case';
import { ExpandSubgraphUseCase } from '../modules/graph/application/use-cases/expand-subgraph.use-case';
import { ExportGraphUseCase } from '../modules/graph/application/use-cases/export-graph.use-case';
import { ImportGraphUseCase } from '../modules/graph/application/use-cases/import-graph.use-case';
import { SyncVaultUseCase } from '../modules/graph/application/use-cases/sync-vault.use-case';
import { GraphDomainExceptionFilter } from '../modules/graph/interface/graph-domain-exception.filter';

type TipoNode = CreateNodeInput['tipoNode'];

// tipo da URL (amigável) → tipo raiz da composição (vocabulário do grafo).
const COMPOSITION_TIPO: Record<string, CompositionRootType> = {
  flashcard: 'FLASHCARD',
  questao: 'QUESTION',
  baralho: 'BARALHO',
  prova: 'PROVA',
};

@UseGuards(JwtAuthGuard)
@UseFilters(GraphDomainExceptionFilter)
@Controller('graph')
export class GraphController {
  constructor(
    private readonly createEdgeUseCase: CreateEdgeUseCase,
    private readonly updateEdgeUseCase: UpdateEdgeUseCase,
    private readonly deleteEdgeUseCase: DeleteEdgeUseCase,
    private readonly addExistingNodeUseCase: AddExistingNodeUseCase,
    private readonly removeNodeUseCase: RemoveNodeUseCase,
    private readonly createGraphUseCase: CreateGraphUseCase,
    private readonly renameGraphUseCase: RenameGraphUseCase,
    private readonly listGraphsUseCase: ListGraphsUseCase,
    private readonly listGraphAssuntosUseCase: ListGraphAssuntosUseCase,
    private readonly getGraphInfoUseCase: GetGraphInfoUseCase,
    private readonly deleteGraphUseCase: DeleteGraphUseCase,
    private readonly deleteNodeUseCase: DeleteNodeUseCase,
    private readonly saveVisualStateUseCase: SaveVisualStateUseCase,
    private readonly loadVisualStateUseCase: LoadVisualStateUseCase,
    private readonly getNodeDetailsUseCase: GetNodeDetailsUseCase,
    private readonly getEdgesUseCase: GetEdgesUseCase,
    private readonly listEntityGraphsUseCase: ListEntityGraphsUseCase,
    private readonly searchNodeContentUseCase: SearchNodeContentUseCase,
    private readonly listUserFlashcardsUseCase: ListUserFlashcardsUseCase,
    private readonly getDeckForStudyUseCase: GetDeckForStudyUseCase,
    private readonly savePositionsUseCase: SavePositionsUseCase,
    private readonly getAvailableItemsUseCase: GetAvailableItemsUseCase,
    private readonly createNodeUseCase: CreateNodeUseCase,
    private readonly updateNodeUseCase: UpdateNodeUseCase,
    private readonly createDeckUseCase: CreateDeckUseCase,
    private readonly addProvaToGraphUseCase: AddProvaToGraphUseCase,
    private readonly getItemCompositionUseCase: GetItemCompositionUseCase,
    private readonly composeItemIntoGraphUseCase: ComposeItemIntoGraphUseCase,
    private readonly createSubgraphUseCase: CreateSubgraphUseCase,
    private readonly extractSubgraphUseCase: ExtractSubgraphUseCase,
    private readonly loadGraphUseCase: LoadGraphUseCase,
    private readonly expandSubgraphUseCase: ExpandSubgraphUseCase,
    private readonly exportGraphUseCase: ExportGraphUseCase,
    private readonly importGraphUseCase: ImportGraphUseCase,
    private readonly syncVaultUseCase: SyncVaultUseCase,
  ) {}

  // Subgrafo composto de um item (mini-grafo + base do import). tipo: flashcard|questao|baralho|prova.
  @Get('composition/:tipo/:id')
  async composition(
    @CurrentUser() userId: string,
    @Param('tipo') tipo: string,
    @Param('id') id: string,
  ): Promise<CompositionGraph> {
    const root = COMPOSITION_TIPO[tipo.toLowerCase()];
    if (!root) {
      throw new BadRequestException(
        `invalid tipo: "${tipo}". Expected: flashcard|questao|baralho|prova`,
      );
    }
    const graph = await this.getItemCompositionUseCase.execute(userId, root, id);
    if (!graph) throw new NotFoundException(`item not found: "${tipo}/${id}"`);
    return graph;
  }

  // Importa um item num grafo COMPONDO tudo (item + hierarquia), mesclado.
  @Post('graphs/:grafoId/compose')
  async composeIntoGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(composeGraphContract) body: ComposeGraphBody,
  ): Promise<ComposeResult> {
    const root = COMPOSITION_TIPO[(body.tipo ?? '').toLowerCase()];
    if (!root || !body.id) {
      throw new BadRequestException(
        `invalid body: expected { tipo: flashcard|questao|baralho|prova, id }`,
      );
    }
    const result = await this.composeItemIntoGraphUseCase.execute(userId, grafoId, root, body.id);
    if (!result)
      throw new NotFoundException(`graph or item not found: "${grafoId}" / "${body.id}"`);
    return result;
  }

  // ---- Grafos ----
  @Get('graphs')
  listGraphs(@CurrentUser() userId: string, @Query() query: RawGraphListQuery) {
    return this.listGraphsUseCase.execute(userId, query);
  }

  // Assuntos disponíveis para o filtro (rota estática — precede graphs/:id/*).
  @Get('graphs/assuntos')
  listGraphAssuntos(@CurrentUser() userId: string) {
    return this.listGraphAssuntosUseCase.execute(userId);
  }

  @Post('graphs')
  createGraph(@CurrentUser() userId: string, @ZodBody(createGraphContract) body: CreateGraphBody) {
    return this.createGraphUseCase.execute(userId, body.nome, body.descricao);
  }

  @Delete('graphs/:id')
  // Apaga a VISTA, não o conteúdo. O `keep` (tipos a preservar) saiu com o nó do
  // sistema: nada é apagado, então não havia mais o que escolher.
  deleteGraph(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.deleteGraphUseCase.execute(userId, id);
  }

  @Get('graphs/:id/info')
  graphInfo(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.getGraphInfoUseCase.execute(userId, id);
  }

  @Patch('graphs/:id')
  renameGraph(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @ZodBody(renameGraphContract) body: RenameGraphBody,
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
    @ZodBody(graphVisualContract) body: GraphVisualBody,
  ) {
    return this.saveVisualStateUseCase.execute(userId, id, body.state);
  }

  // ---- Grafo (nós + arestas) ----
  @Get()
  load(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.loadGraphUseCase.execute(userId, grafoId);
  }

  @Get('edges')
  edges(@CurrentUser() userId: string, @Query('grafoId') grafoId: string) {
    return this.getEdgesUseCase.execute(userId, grafoId);
  }

  // Grafos que mostram uma entidade, para o "Ver no grafo" saber aonde ir.
  @Get('containing/:tipo/:refId')
  containing(
    @CurrentUser() userId: string,
    @Param('tipo') tipo: string,
    @Param('refId') refId: string,
  ) {
    return this.listEntityGraphsUseCase.execute(userId, tipo, refId);
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
    @ZodBody(createNodeContract) body: CreateNodeBody,
  ) {
    return this.createNodeUseCase.execute(userId, grafoId, body);
  }

  // vincula uma entidade já existente ao grafo
  @Post('graphs/:grafoId/nodes/link')
  addExisting(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(linkNodeContract) body: LinkNodeBody,
  ) {
    return this.addExistingNodeUseCase.execute(userId, grafoId, body.tipoNode, body.entityId);
  }

  @Post('graphs/:grafoId/baralho')
  createBaralho(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(createGraphBaralhoContract) body: CreateGraphBaralhoBody,
  ) {
    return this.createDeckUseCase.execute(userId, grafoId, body.titulo, body.flashcardIds ?? []);
  }

  @Post('graphs/:grafoId/prova')
  addProva(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(addProvaToGraphContract) body: AddProvaToGraphBody,
  ) {
    return this.addProvaToGraphUseCase.execute(userId, grafoId, body.provaId);
  }

  @Post('graphs/:grafoId/import')
  importGraph(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(importGraphContract) body: ImportGraphBody,
  ) {
    return this.importGraphUseCase.execute(userId, grafoId, body);
  }

  @Get('graphs/:grafoId/export')
  exportGraph(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.exportGraphUseCase.execute(userId, grafoId);
  }

  @Post('graphs/:grafoId/sync')
  syncFromVault(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(vaultSyncContract) body: VaultSyncBody,
  ) {
    return this.syncVaultUseCase.execute(userId, grafoId, body);
  }

  @Patch('nodes/:refId')
  updateNode(
    @CurrentUser() userId: string,
    @Param('refId') refId: string,
    @ZodBody(updateNodeContract) body: UpdateNodeBody,
  ) {
    return this.updateNodeUseCase.execute(userId, body.tipoNode, refId, body);
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
    @ZodBody(createEdgeContract) body: CreateEdgeBody,
  ) {
    return this.createEdgeUseCase.execute({ userId, grafoId, ...body });
  }

  @Patch('graphs/:grafoId/edges/:id')
  updateEdge(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @Param('id') id: string,
    @ZodBody(updateEdgeContract) body: UpdateEdgeBody,
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
    @ZodBody(graphPositionsContract) body: GraphPositionsBody,
  ) {
    return this.savePositionsUseCase.execute(userId, grafoId, body.positions);
  }

  // ---- Subgrafos ----
  @Post('graphs/:grafoId/subgrafos')
  createSubgrafo(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(createSubgraphContract) body: CreateSubgraphBody,
  ) {
    return this.createSubgraphUseCase.execute(userId, grafoId, body);
  }

  @Post('graphs/:grafoId/extract')
  extractSubgrafo(
    @CurrentUser() userId: string,
    @Param('grafoId') grafoId: string,
    @ZodBody(extractSubgraphContract) body: ExtractSubgraphBody,
  ) {
    return this.extractSubgraphUseCase.execute(userId, grafoId, body);
  }

  @Get('graphs/:grafoId/expand')
  expandSubgrafo(@CurrentUser() userId: string, @Param('grafoId') grafoId: string) {
    return this.expandSubgraphUseCase.execute(userId, grafoId);
  }
}
