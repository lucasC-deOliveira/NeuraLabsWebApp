// Guard da animação de entrada ("big bang") do grafo. A montagem/reassentamento
// pesado deve rodar UMA vez por grafo aberto — não a cada refresh dos dados do mesmo
// grafo (ex.: fechar o modal de estudo → refreshGraph → setRawNodes). Quem chama
// guarda o último graphId animado e consulta esta decisão.

/**
 * Deve rodar o big-bang nesta carga? Só quando o grafo aberto muda: mesmo graphId
 * (refresh de dados) reusa o layout e cai no branch de merge de posições.
 * @example isFirstOpenOfGraph("g1", "g1") // false — refresh, não reanima
 * @example isFirstOpenOfGraph("g1", "g2") // true  — trocou de grafo, reanima
 */
export function isFirstOpenOfGraph(animatedGraphId: string | null, graphId: string): boolean {
  return animatedGraphId !== graphId;
}
