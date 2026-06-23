import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { CreateEdgeUseCase } from '../modules/graph/application/use-cases/create-edge.use-case';
import { UpdateEdgeUseCase } from '../modules/graph/application/use-cases/update-edge.use-case';
import { DeleteEdgeUseCase } from '../modules/graph/application/use-cases/delete-edge.use-case';
import {
  GRAPH_EDGE_REPOSITORY,
  type GraphEdgeRepository,
} from '../modules/graph/domain/ports/graph-edge-repository';
import { PrismaGraphEdgeRepository } from '../modules/graph/infrastructure/persistence/prisma-graph-edge.repository';

@Module({
  imports: [AuthModule], // JwtAuthGuard depende do JwtModule exportado pelo AuthModule
  controllers: [GraphController],
  providers: [
    GraphService,
    { provide: GRAPH_EDGE_REPOSITORY, useClass: PrismaGraphEdgeRepository },
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
  ],
  exports: [GraphService],
})
export class GraphModule {}
