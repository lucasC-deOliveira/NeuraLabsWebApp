// Baralhos domain model, baralhos-owned. Mirrors the @/lib/baralhos-api
// boundary; the infra adapter returns the structurally compatible shape.

// Grafo em que o baralho tem um nó — o baralho é do usuário, não do grafo, mas
// pode ter nascido de um, e a listagem oferece o caminho de volta.
export interface BaralhoOrigin {
  grafoId: string;
  nome: string;
}

export interface BaralhoItem {
  id: string;
  titulo: string;
  totalCards: number;
  // Contadores do cartão, por estado de estudo (calculados no backend).
  novos: number;
  aprender: number;
  revisar: number;
  dataCriacao: Date;
  origens: BaralhoOrigin[];
}

// Tag de um conceito ao qual o cartão está conectado no grafo, com seus pais —
// a mesma origem das tags da listagem de flashcards.
export interface BaralhoConceptTag {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

export interface BaralhoCard {
  id: string;
  pergunta: string;
  resposta: string;
  tipo: string | null;
  conceito: string;
  conceitosConectados: BaralhoConceptTag[];
}

export interface BaralhoDetail {
  id: string;
  titulo: string;
  dataCriacao: Date;
  origens: BaralhoOrigin[];
  cards: BaralhoCard[];
}

// Flashcard candidato a entrar num baralho (visão do módulo baralhos).
export interface BaralhoCardOption {
  id: string;
  pergunta: string;
  conceito: string;
}
