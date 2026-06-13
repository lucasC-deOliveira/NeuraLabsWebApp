import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';

@Module({
  imports: [AuthModule], // JwtAuthGuard depende do JwtModule exportado pelo AuthModule
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule {}
