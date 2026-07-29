// Config de um plano de estudo. `prioridade` é o modo do roadmap = a ORDEM de estudo.
export type PlanMetaTipo = 'TEMPO' | 'NOVOS';

// Curadoria do conteúdo do plano. O objetivo é sempre aprender TODO o conteúdo
// escolhido (grafos + baralhos + provas). Vazio em tudo = todos os grafos do usuário.
// `conceitosExcluidos` remove cards/questões desses conceitos.
export interface PlanContent {
  grafoIds: string[];
  baralhoIds: string[];
  provaIds: string[];
  conceitosExcluidos: string[];
}

export interface StudyPlan extends PlanContent {
  id: string;
  prioridade: string;
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: Date | null;
  ativo: boolean;
}

export interface StudyPlanInput extends PlanContent {
  // Presente = atualiza esse plano; ausente = cria um novo.
  id?: string;
  prioridade: string;
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: Date | null;
}

// Persistência do plano. `loadById` traz um plano específico; `save` cria (sem id) ou
// atualiza por id — a identidade é o id (o usuário pode ter vários planos).
export interface StudyPlanRepository {
  loadById(userId: string, id: string): Promise<StudyPlan | null>;
  save(userId: string, input: StudyPlanInput): Promise<StudyPlan>;
  listByUser(userId: string): Promise<StudyPlan[]>;
  deleteById(userId: string, id: string): Promise<void>;
}

export const STUDY_PLAN_REPOSITORY = Symbol('STUDY_PLAN_REPOSITORY');
