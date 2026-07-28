// Config de um plano de estudo. `prioridade` é a chave da trilha do roadmap seguida.
export type PlanMetaTipo = 'TEMPO' | 'NOVOS';

// Curadoria do conteúdo do plano. Fontes vazias = tudo do roadmap; senão, só o
// conteúdo das fontes. `conceitosExcluidos` remove cards/questões desses conceitos.
export interface PlanContent {
  baralhoIds: string[];
  provaIds: string[];
  conceitosExcluidos: string[];
}

export interface StudyPlan extends PlanContent {
  id: string;
  grafoId: string;
  prioridade: string;
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: Date | null;
  ativo: boolean;
}

export interface StudyPlanInput extends PlanContent {
  grafoId: string;
  prioridade: string;
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: Date | null;
}

// Persistência do plano. `loadById` traz um plano específico (permite vários por
// grafo); `load` traz o ativo mais recente do grafo (atalho do Dashboard); `save`
// faz upsert por (usuário, grafo, prioridade).
export interface StudyPlanRepository {
  loadById(userId: string, id: string): Promise<StudyPlan | null>;
  load(userId: string, grafoId: string): Promise<StudyPlan | null>;
  save(userId: string, input: StudyPlanInput): Promise<StudyPlan>;
  listByUser(userId: string): Promise<StudyPlan[]>;
  deleteById(userId: string, id: string): Promise<void>;
}

export const STUDY_PLAN_REPOSITORY = Symbol('STUDY_PLAN_REPOSITORY');
