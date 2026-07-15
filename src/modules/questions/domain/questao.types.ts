// Modelo de questão (domain). Compartilhado por domain-services, port e presentation.

export type TipoQuestao = "VERDADEIRO_FALSO" | "MULTIPLA_ESCOLHA";

export interface AlternativaMultipla {
  letra: string;
  texto: string;
}

// Tag de um conceito que a questão testa no grafo, com seus pais.
export interface QuestaoConceptTag {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

export interface QuestaoListItem {
  id: string;
  tipo: TipoQuestao;
  enunciado: string;
  gabarito: string;
  explicacao: string | null;
  alternativas: AlternativaMultipla[] | null;
  conceitoId: string | null;
  conceitoNome: string | null;
  // Conceitos que a questão testa segundo o grafo. É onde a ligação vive: o
  // conceitoId acima está nulo em todas as questões.
  conceitosConectados: QuestaoConceptTag[];
  dataCriacao: string;
}

export interface CreateQuestaoInput {
  tipo: TipoQuestao;
  enunciado: string;
  alternativas?: AlternativaMultipla[];
  gabarito: string;
  explicacao?: string;
  conceitoId?: string | null;
}
