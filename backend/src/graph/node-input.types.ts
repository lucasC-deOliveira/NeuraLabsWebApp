// Node creation input shape used by the graph controller (rich, with a typed
// tipoNode union). The migrated use-cases accept the wider domain CreateNodeInput.
export type TipoNode =
  | 'ASSUNTO'
  | 'TOPICO'
  | 'CONCEITO'
  | 'FLASHCARD'
  | 'NOTA'
  | 'TEXTO_BRUTO'
  | 'BARALHO'
  | 'GRAFO_REF'
  | 'QUESTION'
  | 'PROVA';

export interface CreateNodeInput {
  tipoNode: TipoNode;
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
}
