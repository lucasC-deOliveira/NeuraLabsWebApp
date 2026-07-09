import type { CatalogoConceitos } from '../prova';

// Anti-Corruption Layer over the knowledge-graph store. The provas core speaks
// this thin port to read the user's existing ASSUNTO/TÓPICO/CONCEITO nodes; only
// the adapter (provas/infrastructure) knows Prisma and the graph schema. This is
// how provas reaches graph data without importing another context's domain.
export interface ConceitoCatalogSource {
  loadCatalogo(userId: string): Promise<CatalogoConceitos>;
}

export const CONCEITO_CATALOG_SOURCE = Symbol('CONCEITO_CATALOG_SOURCE');
