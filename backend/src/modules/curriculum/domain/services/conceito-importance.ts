// Ranks concepts by study importance, balancing two live signals (no persisted
// weight): how often a concept already fell in past exams (TESTA edges) and how
// much the edital emphasizes its area (breadth = how many sibling concepts the
// edital lists under the same topic). `provaWeight` (0..1) tunes the balance.
// Pure.
//
// Vive no curriculum (shared kernel) porque a importância é uma propriedade do
// grafo, não de uma feature: nasceu para o roadmap (ai) e hoje a sessão de estudo
// também ordena por ela.

export interface ImportanceRow {
  conceitoId: string;
  nome: string;
  topicoId: string | null;
  provaFreq: number; // number of TESTA edges pointing at the concept
}

export interface RankedConceito {
  conceitoId: string;
  nome: string;
  importancia: number; // 0..1
  provaFreq: number;
  editalPeso: number; // sibling-concept count under its topic (edital emphasis)
}

/** @example rankConceitoImportance(rows, 0.6) */
export function rankConceitoImportance(
  rows: ImportanceRow[],
  provaWeight: number,
): RankedConceito[] {
  const w = clamp01(provaWeight);
  const breadth = topicBreadth(rows);
  const maxProva = Math.max(0, ...rows.map((r) => r.provaFreq));
  const maxEdital = Math.max(1, ...rows.map((r) => breadth(r.topicoId)));
  return rows
    .map((row) => score(row, breadth(row.topicoId), w, maxProva, maxEdital))
    .sort((a, b) => b.importancia - a.importancia || b.provaFreq - a.provaFreq);
}

function score(
  row: ImportanceRow,
  editalPeso: number,
  w: number,
  maxProva: number,
  maxEdital: number,
): RankedConceito {
  const normProva = maxProva > 0 ? row.provaFreq / maxProva : 0;
  const normEdital = editalPeso / maxEdital;
  return {
    conceitoId: row.conceitoId,
    nome: row.nome,
    provaFreq: row.provaFreq,
    editalPeso,
    importancia: round2(w * normProva + (1 - w) * normEdital),
  };
}

// Edital emphasis proxy: how many concepts sit under the same topic.
function topicBreadth(rows: ImportanceRow[]): (topicoId: string | null) => number {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.topicoId) counts.set(r.topicoId, (counts.get(r.topicoId) ?? 0) + 1);
  }
  return (topicoId) => (topicoId ? (counts.get(topicoId) ?? 1) : 1);
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));
const round2 = (n: number): number => Math.round(n * 100) / 100;
