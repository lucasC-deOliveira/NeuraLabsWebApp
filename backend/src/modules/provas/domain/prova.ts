import type { ConceptTag } from '../../curriculum/domain/curriculum-views';

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
  // Concepts the user confirmed in the review; when set with a target grafo, the
  // question is linked into the knowledge graph (QUESTION node → TESTA edges).
  conceitos?: ConceitoSugerido[];
}

export interface ParsedUpload {
  tituloSugerido: string | null;
  questoes: ParsedQuestao[];
}

// A concept node the user's graph already has, offered to the classifier so it
// reuses the exact name instead of duplicating (name-index pattern).
export interface ConceitoConhecido {
  id: string;
  nome: string;
}

// The user's existing knowledge-graph nodes, by level, used to ground the
// question→concept classification and resolve names back to ids.
export interface CatalogoConceitos {
  assuntos: ConceitoConhecido[];
  topicos: ConceitoConhecido[];
  conceitos: ConceitoConhecido[];
}

// A concept a question tests. `conceitoId` is the existing node's id when the
// name matches the catalog, or null when the classifier proposed a new concept.
export interface ConceitoSugerido {
  nome: string;
  conceitoId: string | null;
}

// The concepts suggested for one question — more than one means it is
// multidisciplinary (modeled later as several TESTA edges from the QUESTION node).
export interface QuestaoConceitos {
  numero: number;
  conceitos: ConceitoSugerido[];
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
  // When set, the questions are also linked into this knowledge graph using each
  // question's confirmed `conceitos` (chosen in the review).
  grafoId?: string;
}

// A persisted question paired with the concepts to connect it to in the graph.
export interface QuestaoConceitoLink {
  questaoId: string;
  conceitos: ConceitoSugerido[];
}

// An edital (a public-tender notice's content program) that becomes an EDITAL
// node linked 1:1 to a prova (REGE edge). programa is the syllabus text.
export interface Edital {
  id: string;
  titulo: string;
  provaId: string | null;
}

export interface CreateEditalInput {
  titulo: string;
  programa: string;
  grafoId: string;
  provaId?: string; // optional 1:1 link at creation time
  // Concept node ids the edital covers — the EDITAL node links to each (COBRE edge).
  conceitoNodeIds?: string[];
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
  // Conceitos que a questão testa no grafo, com tópico e assunto pais — a mesma
  // taxonomia da lista de questões (shared kernel `curriculum`), e o que alimenta
  // os filtros da prova aberta. Vazio quando a questão não está ligada ao grafo.
  conceitosConectados: ConceptTag[];
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
