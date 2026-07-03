// Port (application boundary) for reading a deck's cards over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/graph-api). No React, no @/lib here.

export interface DeckStudyCard {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
}

export interface DeckForStudy {
  titulo: string;
  cards: DeckStudyCard[];
}

export interface GraphDeckPort {
  getDeckForStudy(baralhoId: string): Promise<DeckForStudy | null>;
}
