// Ordem da sessão de estudo. Puro.
//
// Fica em @/lib porque um módulo não pode importar o domínio de outro, e os dois
// lados desta preferência vivem em módulos diferentes: quem a escolhe é o
// `settings`, quem a obedece é o `graph` (o modal de estudo).
//
// Só decide QUAL card vencido vem antes — não toca no agendamento. O SM-2 mede
// memória (quando você esquece); a importância mede relevância (o que cai na
// prova). São perguntas diferentes: misturá-las estragaria a primeira. O ganho
// está em quem não termina os 153 vencidos de uma sessão — a ordem decide o que
// você de fato estudou.

export type StudyOrder = "classico" | "peso";

export interface StudyOrderOption {
  id: StudyOrder;
  titulo: string;
  descricao: string;
}

export const STUDY_ORDERS: StudyOrderOption[] = [
  {
    id: "classico",
    titulo: "Ordem do baralho",
    descricao: "Os cards vencidos aparecem na ordem em que foram criados.",
  },
  {
    id: "peso",
    titulo: "Prioridade pelo peso do grafo",
    descricao:
      "Entre os vencidos, os conceitos que mais caem em prova e que o edital enfatiza vêm primeiro. " +
      "Baralhos fora do grafo não têm peso e seguem na ordem do baralho.",
  },
];

export const DEFAULT_STUDY_ORDER: StudyOrder = "classico";

// O bastante para ordenar: quem chama tem cards maiores, mas só isto importa aqui.
interface WeightedCard {
  importancia: number | null;
}

/** Algum card desta fila está no grafo? Se não, o modo por peso é inerte. */
export function hasGraphWeights(cards: WeightedCard[]): boolean {
  return cards.some((c) => c.importancia !== null);
}

/**
 * Ordena os cards VENCIDOS de uma sessão. Não altera a lista recebida.
 * @example orderStudyQueue(cards, "peso") // conceito mais pesado primeiro
 */
export function orderStudyQueue<T extends WeightedCard>(cards: T[], order: StudyOrder): T[] {
  if (order !== "peso") return [...cards];
  // Card sem peso não é "zero": é desconhecido. Vai para o fim sem se declarar
  // menos importante que um conceito medido em 0. `sort` do JS é estável, então o
  // empate — e a fila inteira sem peso — preserva a ordem do baralho.
  return [...cards].sort((a, b) => rank(b) - rank(a));
}

const SEM_PESO = -1;

const rank = (card: WeightedCard): number => card.importancia ?? SEM_PESO;
