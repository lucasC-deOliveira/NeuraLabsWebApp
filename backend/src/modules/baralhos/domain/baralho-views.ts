import type { ConceptTag } from '../../curriculum/domain/curriculum-views';

// Grafo em que o baralho tem um nó — o baralho pertence ao usuário, não ao grafo,
// mas pode ter sido criado a partir de um (e a listagem oferece o caminho de volta).
export interface BaralhoOrigin {
  grafoId: string;
  nome: string;
}

export interface BaralhoListItem {
  id: string;
  titulo: string;
  totalCards: number;
  // Contadores do cartão do baralho, por estado de estudo (ver deck-stats).
  novos: number;
  aprender: number;
  revisar: number;
  dataCriacao: Date;
  origens: BaralhoOrigin[];
}

export interface BaralhoCard {
  id: string;
  pergunta: string;
  resposta: string;
  tipo: string | null;
  conceito: string;
  // Conceitos aos quais o cartão está conectado no grafo (+ tópicos/assuntos pais),
  // a mesma origem das tags da listagem de flashcards. Vazio fora de grafos.
  conceitosConectados: ConceptTag[];
}

export interface BaralhoDetail {
  id: string;
  titulo: string;
  dataCriacao: Date;
  origens: BaralhoOrigin[];
  cards: BaralhoCard[];
}

export interface CreateBaralhoInput {
  titulo: string;
  flashcardIds: string[];
}

// Um baralho importado traz os cartões embutidos: o import cria os flashcards
// (sem conceito) e o baralho que os agrupa, num payload só.
export interface ImportedCard {
  pergunta: string;
  resposta: string;
}

export interface ImportedBaralho {
  titulo: string;
  cards: ImportedCard[];
}
