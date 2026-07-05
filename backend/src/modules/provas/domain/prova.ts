export type TipoQuestaoParsed = 'VERDADEIRO_FALSO' | 'MULTIPLA_ESCOLHA';

export interface ParsedAlternativa {
  letra: string;
  texto: string;
}

// A figure extracted from the exam PDF, carried base64-encoded so it round-trips
// through the parse → review → create flow as JSON. Persisted as bytes on create.
// `alternativa` is the answer letter (A–E) when the figure belongs to an image
// alternative, or null when it belongs to the question stem/enunciado.
export interface ParsedImagem {
  mimetype: string;
  base64: string;
  alternativa: string | null;
}

// A question extracted from an uploaded exam document by the LLM.
export interface ParsedQuestao {
  numero: number;
  enunciado: string;
  tipo: TipoQuestaoParsed;
  alternativas: ParsedAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
  imagens?: ParsedImagem[];
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

// A reference to a stored question figure; the bytes are fetched from an endpoint.
// `alternativa` is the answer letter (A–E) for image alternatives, else null.
export interface ProvaImagemRef {
  id: string;
  ordem: number;
  mimetype: string;
  alternativa: string | null;
}

// A stored figure with its owner, so the endpoint can assert access before
// streaming the bytes.
export interface StoredQuestaoImagem {
  usuarioId: string;
  mimetype: string;
  dados: Buffer;
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
  imagens: ProvaImagemRef[];
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
