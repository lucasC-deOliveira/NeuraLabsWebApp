import type { QuestaoConceitoLink } from '../prova';

// Anti-Corruption Layer over the knowledge-graph store for writes. The provas
// core speaks this thin port to materialize each question as a QUESTION node and
// connect it to its CONCEITOs via TESTA edges in a target graph; only the adapter
// (provas/infrastructure) knows Prisma and the graph node/edge schema. Keeps the
// bounded-context boundary — provas never imports graph's domain.
export interface QuestaoGraphWriter {
  linkQuestoesToGrafo(userId: string, grafoId: string, links: QuestaoConceitoLink[]): Promise<void>;
}

export const QUESTAO_GRAPH_WRITER = Symbol('QUESTAO_GRAPH_WRITER');
