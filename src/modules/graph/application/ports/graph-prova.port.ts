// Port (application boundary) for the exam (prova) upload/parse flow. Only infra/
// implements it (ACL over @/lib/provas-api). DTOs mirror the provas-api shapes but
// live here so application/presentation don't import @/lib/*-api.

export type QuestaoTipo = "VERDADEIRO_FALSO" | "MULTIPLA_ESCOLHA";

export interface QuestaoAlternativa {
  letra: string;
  texto: string;
}

// Figura extraída do PDF, base64, para preview durante a revisão (parse → criar).
export interface ParsedImagemView {
  mimetype: string;
  base64: string;
}

export interface ParsedQuestao {
  numero: number;
  enunciado: string;
  tipo: QuestaoTipo;
  alternativas: QuestaoAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
  imagens?: ParsedImagemView[];
}

export interface ProvaParseResult {
  tituloSugerido: string | null;
  questoes: ParsedQuestao[];
}

// Referência a uma figura salva; os bytes vêm por fetch autenticado (blob).
export interface ProvaImagemRefView {
  id: string;
  ordem: number;
  mimetype: string;
}

export interface ProvaQuestaoView {
  ordem: number;
  id: string;
  tipo: QuestaoTipo;
  enunciado: string;
  alternativas: QuestaoAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
  conceitoNome: string | null;
  imagens: ProvaImagemRefView[];
}

export interface ProvaDetailView {
  id: string;
  titulo: string;
  descricao: string | null;
  dataCriacao: string;
  questoes: ProvaQuestaoView[];
}

export interface GraphProvaPort {
  // gabaritoFile é opcional: sem ele, cada questão volta com gabarito "?" para o
  // usuário informar a alternativa correta manualmente.
  parseProvaUpload(provaFile: File, gabaritoFile?: File | null): Promise<ProvaParseResult>;
  createProvaFromParsed(input: { titulo: string; questoes: ParsedQuestao[] }): Promise<{ provaId: string }>;
  getProva(provaId: string): Promise<ProvaDetailView | null>;
  // Busca os bytes de uma figura salva (endpoint autenticado) como Blob.
  fetchProvaImagem(imagemId: string): Promise<Blob>;
}
