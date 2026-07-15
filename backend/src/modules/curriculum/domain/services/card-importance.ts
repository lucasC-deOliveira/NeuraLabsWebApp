import type { NodeEdgePair } from './connected-concepts';

// Lógica pura para dizer o quanto cada flashcard importa, a partir da importância
// já calculada dos conceitos do grafo. As consultas (nós, arestas, ranking) vivem
// no adapter Prisma; aqui só combinamos os mapas — testável sem DB.
//
// A chave do conceito leva o grafo (`grafoId:conceitoId`) porque a importância é
// normalizada por grafo: o mesmo conceito em dois grafos tem duas escalas.

/**
 * Importância (0..1) de cada card: a do seu conceito MAIS importante — um card
 * pode tocar vários. Card sem conceito (ou cujo conceito não foi ranqueado) fica
 * de fora do mapa: "não sei" não é o mesmo que "vale zero".
 * @example cardImportanceByOwner(pairs, donos, conceitos, pesos) // Map { "fc-1" => 0.9 }
 */
export function cardImportanceByOwner(
  pairs: NodeEdgePair[],
  ownerNodeToCard: Map<string, string>,
  conceptNodeToKey: Map<string, string>,
  importanceByConcept: Map<string, number>,
): Map<string, number> {
  const porCard = new Map<string, number>();
  for (const { ownerNode, other } of pairs) {
    const card = ownerNodeToCard.get(ownerNode);
    const chave = conceptNodeToKey.get(other);
    const importancia = chave === undefined ? undefined : importanceByConcept.get(chave);
    if (card === undefined || importancia === undefined) continue;
    const atual = porCard.get(card);
    if (atual === undefined || importancia > atual) porCard.set(card, importancia);
  }
  return porCard;
}
