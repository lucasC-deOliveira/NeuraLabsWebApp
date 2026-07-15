import type { BaralhoDetail } from "../baralho.types";

// Formato de export/import: só título e os dois lados do cartão. Ids, datas e SRS
// ficam de fora de propósito — são locais deste app e não sobrevivem a um reimport
// em outra conta. O parser do backend lê de volta exatamente esta forma.
export interface ExportedCard {
  pergunta: string;
  resposta: string;
}

export interface ExportedBaralho {
  titulo: string;
  cards: ExportedCard[];
}

/**
 * Monta o payload de export a partir dos baralhos com seus cartões.
 * @example toExportPayload([{ id: 'b1', titulo: 'Bio', cards: [...], ... }])
 */
export function toExportPayload(baralhos: BaralhoDetail[]): ExportedBaralho[] {
  return baralhos.map((baralho) => ({
    titulo: baralho.titulo,
    cards: baralho.cards.map((card) => ({ pergunta: card.pergunta, resposta: card.resposta })),
  }));
}

/** Nome do arquivo de export, datado para não sobrescrever o anterior. */
export function exportFileName(now: Date): string {
  return `baralhos-${now.toISOString().slice(0, 10)}.json`;
}
