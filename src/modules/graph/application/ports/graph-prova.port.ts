// Port (application boundary) for the exam (prova) upload/parse flow. Only infra/
// implements it (ACL over @/lib/provas-api). DTOs mirror the provas-api shapes but
// live here so application/presentation don't import @/lib/*-api.

export type QuestaoTipo = "VERDADEIRO_FALSO" | "MULTIPLA_ESCOLHA";

export interface QuestaoAlternativa {
  letra: string;
  texto: string;
}

// Figura extraída do PDF, base64, para preview durante a revisão (parse → criar).
// `alternativa` = letra A–E quando a figura é de uma alternativa-imagem, senão null.
export interface ParsedImagemView {
  mimetype: string;
  base64: string;
  alternativa: string | null;
}

// Conceito do grafo que a questão avalia; `conceitoId` = id do nó existente, ou
// null quando é um conceito novo proposto pela IA.
export interface ConceitoSugeridoView {
  nome: string;
  conceitoId: string | null;
}

export interface ParsedQuestao {
  numero: number;
  enunciado: string;
  tipo: QuestaoTipo;
  alternativas: QuestaoAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
  imagens?: ParsedImagemView[];
  conceitos?: ConceitoSugeridoView[];
}

export interface QuestaoConceitosView {
  numero: number;
  conceitos: ConceitoSugeridoView[];
}

export interface ProvaParseResult {
  tituloSugerido: string | null;
  questoes: ParsedQuestao[];
}

// Referência a uma figura salva; os bytes vêm por fetch autenticado (blob).
// `alternativa` = letra A–E quando a figura é de uma alternativa-imagem, senão null.
export interface ProvaImagemRefView {
  id: string;
  ordem: number;
  mimetype: string;
  alternativa: string | null;
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

// Uma questão isolada (nó QUESTION) para o modo de estudo/quiz.
export interface QuestaoView {
  id: string;
  tipo: QuestaoTipo;
  enunciado: string;
  alternativas: QuestaoAlternativa[] | null;
  gabarito: string;
  explicacao: string | null;
  conceitoNome: string | null;
}

// Edital: nó vinculado 1:1 a uma prova.
export interface CreateEditalInputView {
  titulo: string;
  programa: string;
  grafoId: string;
  provaId?: string;
  conceitoNodeIds?: string[];
}
export interface EditalItemView {
  id: string;
  titulo: string;
  provaId: string | null;
}

export interface GraphProvaPort {
  // Uma questão pelo id (nó QUESTION) para estudar isoladamente.
  getQuestao(questaoId: string): Promise<QuestaoView | null>;
  // Cria o nó EDITAL (com programa); com provaId, vincula 1:1 à prova.
  createEditalNode(input: CreateEditalInputView): Promise<{ editalId: string }>;
  // Vincula um edital existente a uma prova (1:1).
  linkEditalToProva(editalId: string, provaId: string, grafoId: string): Promise<{ success: boolean }>;
  listEditais(): Promise<EditalItemView[]>;
  // gabaritoFile é opcional: sem ele, cada questão volta com gabarito "?" para o
  // usuário informar a alternativa correta manualmente.
  parseProvaUpload(provaFile: File, gabaritoFile?: File | null): Promise<ProvaParseResult>;
  // Sugere os conceitos que cada questão avalia, para confirmação na revisão.
  suggestProvaConceitos(questoes: ParsedQuestao[]): Promise<QuestaoConceitosView[]>;
  // grafoId liga as questões ao grafo pelos conceitos confirmados de cada questão.
  createProvaFromParsed(input: {
    titulo: string;
    questoes: ParsedQuestao[];
    grafoId?: string;
  }): Promise<{ provaId: string }>;
  getProva(provaId: string): Promise<ProvaDetailView | null>;
  // Busca os bytes de uma figura salva (endpoint autenticado) como Blob.
  fetchProvaImagem(imagemId: string): Promise<Blob>;
}
