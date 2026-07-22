// Divide o texto em frases para a leitura destacada (uma frase acende por vez).
// Pragmático, pt/en: corta após . ! ? … seguidos de espaço, e em quebras de linha
// (listas/parágrafos do markdown já sem marcação). Não trata abreviações ("Dr.")
// — imperfeição aceitável. O MESMO splitter é usado pelo motor (o que falar) e
// pela UI (o que destacar), então os índices sempre batem.
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
