import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
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
import {
  GRAPH_EDGE_REPOSITORY,
  type GraphEdgeRepository,
} from '../modules/graph/domain/ports/graph-edge-repository';
import {
  GRAPH_NODE_REPOSITORY,
  type GraphNodeRepository,
} from '../modules/graph/domain/ports/graph-node-repository';
import {
  GRAPH_REPOSITORY,
  type GraphRepository,
} from '../modules/graph/domain/ports/graph-repository';
import { GRAPH_QUERY, type GraphQuery } from '../modules/graph/domain/ports/graph-query';
import {
  GRAPH_DELETION_REPOSITORY,
  type GraphDeletionRepository,
} from '../modules/graph/domain/ports/graph-deletion-repository';
import {
  NODE_DELETION_REPOSITORY,
  type NodeDeletionRepository,
} from '../modules/graph/domain/ports/node-deletion-repository';
import {
  GRAPH_VISUAL_STATE_REPOSITORY,
  type GraphVisualStateRepository,
} from '../modules/graph/domain/ports/graph-visual-state-repository';
import {
  NODE_DETAILS_QUERY,
  type NodeDetailsQuery,
} from '../modules/graph/domain/ports/node-details-query';
import {
  GRAPH_EDGES_QUERY,
  type GraphEdgesQuery,
} from '../modules/graph/domain/ports/graph-edges-query';
import {
  NODE_CONTENT_SEARCH_QUERY,
  type NodeContentSearchQuery,
} from '../modules/graph/domain/ports/node-content-search-query';
import { DECK_QUERY, type DeckQuery } from '../modules/graph/domain/ports/deck-query';
import {
  GRAPH_POSITION_REPOSITORY,
  type GraphPositionRepository,
} from '../modules/graph/domain/ports/graph-position-repository';
import {
  AVAILABLE_ITEMS_QUERY,
  type AvailableItemsQuery,
} from '../modules/graph/domain/ports/available-items-query';
import { PrismaGraphEdgeRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-edge.repository';
import { PrismaGraphNodeRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-node.repository';
import { PrismaGraphRepository } from '../modules/graph/infrastructure/persistence/prisma-graph.repository';
import { PrismaGraphQuery } from '../modules/graph/infrastructure/persistence/prisma-graph.query';
import { PrismaGraphDeletionRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-deletion.repository';
import { PrismaGraphVisualStateRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-visual-state.repository';
import { PrismaNodeDetailsQuery } from '../modules/graph/infrastructure/persistence/prisma-node-details.query';
import { PrismaGraphEdgesQuery } from '../modules/graph/infrastructure/persistence/prisma-graph-edges.query';
import { PrismaNodeContentSearchQuery } from '../modules/graph/infrastructure/persistence/prisma-node-content-search.query';
import { PrismaDeckQuery } from '../modules/graph/infrastructure/persistence/prisma-deck.query';
import { PrismaGraphPositionRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-position.repository';
import { PrismaAvailableItemsQuery } from '../modules/graph/infrastructure/persistence/prisma-available-items.query';

@Module({
  imports: [AuthModule], // JwtAuthGuard depende do JwtModule exportado pelo AuthModule
  controllers: [GraphController],
  providers: [
    GraphService,
    { provide: GRAPH_EDGE_REPOSITORY, useClass: PrismaGraphEdgeRepository },
    { provide: GRAPH_NODE_REPOSITORY, useClass: PrismaGraphNodeRepository },
    { provide: GRAPH_REPOSITORY, useClass: PrismaGraphRepository },
    { provide: GRAPH_QUERY, useClass: PrismaGraphQuery },
    // One adapter backs both deletion ports (shared per-type entity removal).
    PrismaGraphDeletionRepository,
    { provide: GRAPH_DELETION_REPOSITORY, useExisting: PrismaGraphDeletionRepository },
    { provide: NODE_DELETION_REPOSITORY, useExisting: PrismaGraphDeletionRepository },
    { provide: GRAPH_VISUAL_STATE_REPOSITORY, useClass: PrismaGraphVisualStateRepository },
    { provide: NODE_DETAILS_QUERY, useClass: PrismaNodeDetailsQuery },
    { provide: GRAPH_EDGES_QUERY, useClass: PrismaGraphEdgesQuery },
    { provide: NODE_CONTENT_SEARCH_QUERY, useClass: PrismaNodeContentSearchQuery },
    { provide: DECK_QUERY, useClass: PrismaDeckQuery },
    { provide: GRAPH_POSITION_REPOSITORY, useClass: PrismaGraphPositionRepository },
    { provide: AVAILABLE_ITEMS_QUERY, useClass: PrismaAvailableItemsQuery },
    {
      provide: CreateEdgeUseCase,
      useFactory: (edges: GraphEdgeRepository) => new CreateEdgeUseCase(edges),
      inject: [GRAPH_EDGE_REPOSITORY],
    },
    {
      provide: UpdateEdgeUseCase,
      useFactory: (edges: GraphEdgeRepository) => new UpdateEdgeUseCase(edges),
      inject: [GRAPH_EDGE_REPOSITORY],
    },
    {
      provide: DeleteEdgeUseCase,
      useFactory: (edges: GraphEdgeRepository) => new DeleteEdgeUseCase(edges),
      inject: [GRAPH_EDGE_REPOSITORY],
    },
    {
      provide: AddExistingNodeUseCase,
      useFactory: (nodes: GraphNodeRepository) => new AddExistingNodeUseCase(nodes),
      inject: [GRAPH_NODE_REPOSITORY],
    },
    {
      provide: RemoveNodeUseCase,
      useFactory: (nodes: GraphNodeRepository) => new RemoveNodeUseCase(nodes),
      inject: [GRAPH_NODE_REPOSITORY],
    },
    {
      provide: CreateGraphUseCase,
      useFactory: (graphs: GraphRepository) => new CreateGraphUseCase(graphs),
      inject: [GRAPH_REPOSITORY],
    },
    {
      provide: RenameGraphUseCase,
      useFactory: (graphs: GraphRepository) => new RenameGraphUseCase(graphs),
      inject: [GRAPH_REPOSITORY],
    },
    {
      provide: ListGraphsUseCase,
      useFactory: (graphs: GraphQuery) => new ListGraphsUseCase(graphs),
      inject: [GRAPH_QUERY],
    },
    {
      provide: GetGraphInfoUseCase,
      useFactory: (graphs: GraphQuery) => new GetGraphInfoUseCase(graphs),
      inject: [GRAPH_QUERY],
    },
    {
      provide: DeleteGraphUseCase,
      useFactory: (graphs: GraphDeletionRepository) => new DeleteGraphUseCase(graphs),
      inject: [GRAPH_DELETION_REPOSITORY],
    },
    {
      provide: DeleteNodeUseCase,
      useFactory: (nodes: NodeDeletionRepository) => new DeleteNodeUseCase(nodes),
      inject: [NODE_DELETION_REPOSITORY],
    },
    {
      provide: SaveVisualStateUseCase,
      useFactory: (visual: GraphVisualStateRepository) => new SaveVisualStateUseCase(visual),
      inject: [GRAPH_VISUAL_STATE_REPOSITORY],
    },
    {
      provide: LoadVisualStateUseCase,
      useFactory: (visual: GraphVisualStateRepository) => new LoadVisualStateUseCase(visual),
      inject: [GRAPH_VISUAL_STATE_REPOSITORY],
    },
    {
      provide: GetNodeDetailsUseCase,
      useFactory: (nodes: NodeDetailsQuery) => new GetNodeDetailsUseCase(nodes),
      inject: [NODE_DETAILS_QUERY],
    },
    {
      provide: GetEdgesUseCase,
      useFactory: (edges: GraphEdgesQuery) => new GetEdgesUseCase(edges),
      inject: [GRAPH_EDGES_QUERY],
    },
    {
      provide: SearchNodeContentUseCase,
      useFactory: (search: NodeContentSearchQuery) => new SearchNodeContentUseCase(search),
      inject: [NODE_CONTENT_SEARCH_QUERY],
    },
    {
      provide: ListUserFlashcardsUseCase,
      useFactory: (decks: DeckQuery) => new ListUserFlashcardsUseCase(decks),
      inject: [DECK_QUERY],
    },
    {
      provide: GetDeckForStudyUseCase,
      useFactory: (decks: DeckQuery) => new GetDeckForStudyUseCase(decks),
      inject: [DECK_QUERY],
    },
    {
      provide: SavePositionsUseCase,
      useFactory: (positions: GraphPositionRepository) => new SavePositionsUseCase(positions),
      inject: [GRAPH_POSITION_REPOSITORY],
    },
    {
      provide: GetAvailableItemsUseCase,
      useFactory: (items: AvailableItemsQuery) => new GetAvailableItemsUseCase(items),
      inject: [AVAILABLE_ITEMS_QUERY],
    },
  ],
  exports: [GraphService, DeleteNodeUseCase],
})
export class GraphModule {}
