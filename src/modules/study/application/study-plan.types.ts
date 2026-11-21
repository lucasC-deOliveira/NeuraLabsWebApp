export type PlanMetaTipo = "TEMPO" | "NOVOS";
export type PlanPrioridade = "prova" | "edital" | "prova_edital" | "ai";

export interface StudyPlan {
  id: string;
  // Grafos escolhidos como CONTEÚDO (o objetivo é aprender tudo). Não há mais
  // "grafo objetivo"; vazio = todos os grafos.
  grafoIds: string[];
  prioridade: string; // a ORDEM de estudo (modo do roadmap); "prova|p:<id>" traz escopo
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: string | null; // ISO ou null (sem prazo)
  ativo: boolean;
  baralhoIds: string[];
  provaIds: string[];
  conceitosExcluidos: string[];
}

export interface DailyTarget {
  reviews: number;
  feynman: number;
  novos: number;
  estMinutes: number;
  note: string | null;
}

export interface PlanProjection {
  projectedFinish: string | null;
  daysNeeded: number | null;
  onTrack: boolean | null;
  suggestedPerDay: number | null;
}

export interface TodayPlan {
  plan: StudyPlan;
  target: DailyTarget;
  projection: PlanProjection;
  newAvailable: number;
}

// A sessão do dia mistura flashcards e questões (prática); `kind` discrimina.
export interface FlashcardItem {
  kind: "flashcard";
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
}

export interface QuestionItem {
  kind: "question";
  id: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[] | null;
  gabarito: string;
  explicacao: string | null;
  conceito: string | null;
}

export type PlannedItem = FlashcardItem | QuestionItem;

export interface PlannedSession {
  sessionId: string;
  items: PlannedItem[];
  index?: number;
}

export interface SaveStudyPlanInput {
  id?: string; // presente = atualiza esse plano; ausente = cria um novo
  grafoIds: string[];
  prioridade: string;
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: string | null;
  baralhoIds: string[];
  provaIds: string[];
  conceitosExcluidos: string[];
}

// Um escopo/roadmap que o plano pode seguir (uma opção por trilha do grafo).
export interface RoadmapOption {
  modo: string;
  label: string;
}

export interface PlanScope {
  hasProva: boolean;
  hasEdital: boolean;
}
