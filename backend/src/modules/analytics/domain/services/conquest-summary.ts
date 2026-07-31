import { conceptMastery, type ConceptSignals } from './concept-mastery';

// Resumo de "conquista do grafo": dos conceitos que você JÁ ESTUDOU (têm alguma
// evidência), quantos estão dominados vs em progresso. Medir sobre os estudados —
// não sobre os milhares nunca vistos — é o que torna o número honesto e motivador.

export interface ConceptSignalRow extends ConceptSignals {
  conceitoId: string;
  nome: string;
}

export interface ConquistaConceito {
  conceitoId: string;
  nome: string;
  score: number;
  dominated: boolean;
}

export interface ConquestSummary {
  dominated: number; // conceitos dominados
  inProgress: number; // têm evidência mas ainda não dominados
  studied: number; // dominated + inProgress
  // Os em-progresso mais próximos do domínio — bons candidatos para "fechar" a seguir.
  quaseLa: ConquistaConceito[];
}

const QUASE_LA_LIMIT = 5;

/**
 * Agrega o domínio conceito a conceito no resumo da conquista.
 * @example conquestSummary(rows)
 */
export function conquestSummary(rows: ConceptSignalRow[]): ConquestSummary {
  const avaliados: ConquistaConceito[] = [];
  for (const row of rows) {
    const m = conceptMastery(row);
    if (m.evidenceCount === 0) continue; // sem evidência não conta como "estudado"
    avaliados.push({
      conceitoId: row.conceitoId,
      nome: row.nome,
      score: m.score,
      dominated: m.dominated,
    });
  }
  const dominated = avaliados.filter((c) => c.dominated).length;
  const emProgresso = avaliados.filter((c) => !c.dominated);
  return {
    dominated,
    inProgress: emProgresso.length,
    studied: avaliados.length,
    quaseLa: [...emProgresso].sort((a, b) => b.score - a.score).slice(0, QUASE_LA_LIMIT),
  };
}
