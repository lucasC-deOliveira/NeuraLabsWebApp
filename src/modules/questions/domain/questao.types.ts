// Modelo de questão (domain). Compartilhado por domain-services, port e presentation.

export type TipoQuestao = "VERDADEIRO_FALSO" | "MULTIPLA_ESCOLHA";

export interface AlternativaMultipla {
  letra: string;
  texto: string;
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
