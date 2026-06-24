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
import { PrismaGraphEdgeRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-edge.repository';
import { PrismaGraphNodeRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-node.repository';
import { PrismaGraphRepository } from '../modules/graph/infrastructure/persistence/prisma-graph.repository';
import { PrismaGraphQuery } from '../modules/graph/infrastructure/persistence/prisma-graph.query';
import { PrismaGraphDeletionRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-deletion.repository';

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
  ],
  exports: [GraphService, DeleteNodeUseCase],
})
export class GraphModule {}
