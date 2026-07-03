// Modelo de nota (domain), notes-owned. Espelha a borda @/lib/notes-api; o
// adapter de infra converte (estruturalmente compatível).

export type SubtipoNota =
  | "DEFINICAO"
  | "EXPLICACAO"
  | "EXEMPLO"
  | "COMPARACAO"
  | "SINTESE"
  | "PREREQUISITO"
  | "ERRO_COMUM"
  | "APLICACAO";

export interface NotaListItem {
  id: string;
  titulo: string;
  preview: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; id: string }[];
  flashcardCount: number;
  wordCount: number;
  subtipo: SubtipoNota | null;
  tipoNota: string;
}

export interface NotaDetail {
  id: string;
  conteudo: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; tipoRelacao: string }[];
  subtipo: SubtipoNota | null;
  tipoNota: string;
}
