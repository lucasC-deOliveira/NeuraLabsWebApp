// Questão do plano (prática): enunciado + alternativas + gabarito + explicação, já
// com o nome do conceito para o interleaving. `conceitoId` só para ordenar.
export interface PlanQuestion {
  id: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[] | null;
  gabarito: string;
  explicacao: string | null;
  conceito: string | null;
  conceitoId: string | null;
}

// Read port: questões dos conceitos do roadmap dos grafos do plano (na ordem dele),
// ainda não acertadas.
export interface RoadmapQuestionsQuery {
  findByRoadmap(
    userId: string,
    grafoIds: string[],
    modo: string,
    limit: number,
  ): Promise<PlanQuestion[]>;
}

export const ROADMAP_QUESTIONS_QUERY = Symbol('ROADMAP_QUESTIONS_QUERY');
