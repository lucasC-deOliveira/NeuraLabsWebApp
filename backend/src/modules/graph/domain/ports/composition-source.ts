// Tipos de item que têm composição (viram raiz de um subgrafo).
export type CompositionRootType = 'FLASHCARD' | 'QUESTION' | 'BARALHO' | 'PROVA';

// Uma cadeia de conteúdo de uma folha: conceito → tópico → assunto. Os pais são
// opcionais (nem todo conceito tem tópico/assunto ligados no grafo). Uma folha
// pode ter VÁRIAS (um flashcard ligado a mais de um conceito no grafo).
export interface ConceptChainItem {
  conceitoId: string;
  conceito: string;
  topicoId: string | null;
  topico: string | null;
  assuntoId: string | null;
  assunto: string | null;
}

// Folha (flashcard/questão) com suas cadeias de conceito (do grafo).
export interface LeafInput {
  id: string;
  type: 'FLASHCARD' | 'QUESTION';
  label: string;
  chains: ConceptChainItem[];
}

// Entrada normalizada para o builder puro. Para flashcard/questão, `rootIsLeaf` é
// true e `leaves` traz a própria folha; para baralho/prova, `leaves` são os itens
// contidos (ligados por CONTEM).
export interface CompositionInput {
  root: { id: string; type: CompositionRootType; label: string };
  rootIsLeaf: boolean;
  leaves: LeafInput[];
}

// Read port: só o adapter conhece o Prisma; devolve null se o item não é do usuário.
export interface CompositionSource {
  load(userId: string, tipo: CompositionRootType, id: string): Promise<CompositionInput | null>;
}

export const COMPOSITION_SOURCE = Symbol('COMPOSITION_SOURCE');
