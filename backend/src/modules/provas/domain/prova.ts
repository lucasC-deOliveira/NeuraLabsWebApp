export type TipoQuestaoParsed = 'VERDADEIRO_FALSO' | 'MULTIPLA_ESCOLHA';

export interface ParsedAlternativa {
  letra: string;
  texto: string;
}

// A question extracted from an uploaded exam document by the LLM.
export interface ParsedQuestao {
  numero: number;
  enunciado: string;
  tipo: TipoQuestaoParsed;
  alternativas: ParsedAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
}

export interface ParsedUpload {
  tituloSugerido: string | null;
  questoes: ParsedQuestao[];
}

export interface CreateProvaInput {
  titulo: string;
  descricao?: string;
  questaoIds: string[];
}

export interface CreateProvaFromParsedInput {
  titulo: string;
  descricao?: string;
  questoes: ParsedQuestao[];
}

export type UpdateProvaPatch = Partial<CreateProvaInput>;

export interface ProvaSummary {
  id: string;
  titulo: string;
  descricao: string | null;
  totalQuestoes: number;
  dataCriacao: Date;
}

export interface ProvaDetailQuestao {
  ordem: number;
  id: string;
  tipo: string;
  enunciado: string;
  alternativas: ParsedAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
  conceitoNome: string | null;
}

export interface ProvaDetail {
  id: string;
  titulo: string;
  descricao: string | null;
  dataCriacao: Date;
  questoes: ProvaDetailQuestao[];
}

// A loaded exam paired with its owner, so the application layer can assert
// ownership before returning the (owner-free) ProvaDetail.
export interface OwnedProvaDetail {
  usuarioId: string;
  detail: ProvaDetail;
}
