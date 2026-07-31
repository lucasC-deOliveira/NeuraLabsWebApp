// Fonte da AMPLITUDE do mapa (o eixo Explorador): quantos conceitos/tópicos/assuntos
// distintos o usuário já trouxe para o grafo, e quais áreas novas surgiram há pouco.
// Só o adapter conhece o Prisma.
export interface GraphBreadth {
  concepts: number;
  topics: number;
  subjects: number;
}

// Uma área recém-descoberta (nó ASSUNTO/TOPICO que entrou no grafo) — para celebrar.
export interface TerritoryItem {
  referenciaId: string;
  nome: string;
  tipo: 'ASSUNTO' | 'TOPICO';
}

export interface GraphBreadthSource {
  breadth(userId: string): Promise<GraphBreadth>;
  recentTerritory(userId: string, since: Date): Promise<TerritoryItem[]>;
}

export const GRAPH_BREADTH_SOURCE = Symbol('GRAPH_BREADTH_SOURCE');
