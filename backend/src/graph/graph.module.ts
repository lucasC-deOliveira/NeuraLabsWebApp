import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { UpdateEdgeUseCase } from '../modules/graph/application/use-cases/update-edge.use-case';
import { DeleteEdgeUseCase } from '../modules/graph/application/use-cases/delete-edge.use-case';
import { AddExistingNodeUseCase } from '../modules/graph/application/use-cases/add-existing-node.use-case';
import { RemoveNodeUseCase } from '../modules/graph/application/use-cases/remove-node.use-case';
import {
  GRAPH_EDGE_REPOSITORY,
  type GraphEdgeRepository,
} from '../modules/graph/domain/ports/graph-edge-repository';
import {
  GRAPH_NODE_REPOSITORY,
  type GraphNodeRepository,
} from '../modules/graph/domain/ports/graph-node-repository';
import { PrismaGraphEdgeRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-edge.repository';
import { PrismaGraphNodeRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-node.repository';

@Module({
  imports: [AuthModule], // JwtAuthGuard depende do JwtModule exportado pelo AuthModule
  controllers: [GraphController],
  providers: [
    GraphService,
    { provide: GRAPH_EDGE_REPOSITORY, useClass: PrismaGraphEdgeRepository },
    { provide: GRAPH_NODE_REPOSITORY, useClass: PrismaGraphNodeRepository },
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
  ],
  exports: [GraphService],
})
export class GraphModule {}
