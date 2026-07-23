// Tipos de item que têm composição (viram raiz de um subgrafo).
export type CompositionRootType = 'FLASHCARD' | 'QUESTION' | 'BARALHO' | 'PROVA';

// Cadeia de conteúdo de uma folha: conceito → tópico → assunto (cada um opcional).
export interface ConceptChain {
  conceito: {
    id: string;
    nome: string;
    topico: { id: string; nome: string; assunto: { id: string; nome: string } | null } | null;
  } | null;
}

// Folha (flashcard/questão) que carrega sua cadeia de conceito.
export interface LeafInput extends ConceptChain {
  id: string;
  type: 'FLASHCARD' | 'QUESTION';
  label: string;
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
