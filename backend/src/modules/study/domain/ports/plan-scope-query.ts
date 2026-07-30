// O que os grafos escolhidos como conteúdo permitem: se contêm prova/edital, os
// modos de ordenação "o que mais cai na prova" / "ênfase do edital" ficam liberados
// (o roadmap desses modos usa as provas/editais de dentro do grafo).
export interface PlanScope {
  hasProva: boolean;
  hasEdital: boolean;
}

export interface PlanScopeQuery {
  capabilities(userId: string, grafoIds: string[]): Promise<PlanScope>;
}

export const PLAN_SCOPE_QUERY = Symbol('PLAN_SCOPE_QUERY');
