// Types for the "generate flashcards from a note" flow.

export type FlashcardSourceType =
  | "pergunta_resposta" | "cloze" | "bidirecional" | "explicacao_profunda"
  | "comparacao" | "lista_fragmentada" | "aplicacao_problema" | "identificacao_imagem"
  | "erro_comum" | "definicao" | "finalidade" | "importancia"
  | "caracteristicas" | "diferenca" | "conteudo";

export interface FlashcardPreview {
  id: string;
  pergunta: string;
  resposta: string;
  conceitoId: string;
  conceptNome?: string;
  source: FlashcardSourceType;
}

export interface NotaForGen {
  id: string;
  preview: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; id: string }[];
  flashcardCount: number;
}
