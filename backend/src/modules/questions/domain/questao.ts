import type { ConceptTag } from '../../curriculum/domain/curriculum-views';

export type TipoQuestao = 'VERDADEIRO_FALSO' | 'MULTIPLA_ESCOLHA';

export interface AlternativaMultipla {
  letra: string;
  texto: string;
}

export interface CreateQuestaoInput {
  tipo: TipoQuestao;
  enunciado: string;
  alternativas?: AlternativaMultipla[];
  gabarito: string;
  explicacao?: string;
  conceitoId?: string | null;
}

export interface QuestaoView {
  id: string;
  tipo: string;
  enunciado: string;
  gabarito: string;
  explicacao: string | null;
  alternativas: AlternativaMultipla[] | null;
  conceitoId: string | null;
  conceitoNome: string | null;
  // Conceitos que a questão testa segundo o grafo (+ tópicos/assuntos pais). É onde
  // a ligação de fato vive: conceitoId acima fica nulo na prática.
  conceitosConectados: ConceptTag[];
  dataCriacao: Date;
}

export interface OwnedQuestao extends QuestaoView {
  usuarioId: string;
}
