export interface CreateNotaInput {
  titulo: string;
  conteudo: string;
  subtipo?: string | null;
  tipoNota?: string;
}

export interface NotaListItem {
  id: string;
  titulo: string;
  preview: string;
  dataCriacao: Date;
  conceitosRelacionados: Array<{ nome: string; id: string }>;
  flashcardCount: number;
  wordCount: number;
  subtipo: string | null;
  tipoNota: string;
}

export interface NotaDetail {
  id: string;
  conteudo: string;
  dataCriacao: Date;
  conceitosRelacionados: Array<{ nome: string; tipoRelacao: string }>;
  subtipo: string | null;
  tipoNota: string;
}

export interface FilterAssunto {
  id: string;
  nome: string;
}

export interface FlashcardCreated {
  id: string;
  pergunta: string;
}
