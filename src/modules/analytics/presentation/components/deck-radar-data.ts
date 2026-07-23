import type { DeckStat } from "../../domain/deck-analytics.types";

export interface RadarRow {
  axis: string;
  [deck: string]: string | number;
}

export interface RadarSeries {
  rows: RadarRow[];
  decks: string[]; // rótulos das séries (baralhos), na ordem
}

const pct = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Monta os dados do radar comparando os `limit` maiores baralhos em três dimensões
// normalizadas 0-100: acurácia, maturidade (% maduras) e atividade (% revisadas).
export function deckRadarData(decks: DeckStat[], limit = 3): RadarSeries {
  const top = decks.slice(0, limit);
  const labels = top.map((d) => d.titulo);
  const dims: { axis: string; value: (d: DeckStat) => number }[] = [
    { axis: "Acurácia", value: (d) => d.accuracy ?? 0 },
    { axis: "Maturidade", value: (d) => pct(d.mature, d.cards) },
    { axis: "Atividade", value: (d) => pct(d.reviewed, d.cards) },
  ];
  const rows = dims.map((dim) => {
    const row: RadarRow = { axis: dim.axis };
    top.forEach((d) => {
      row[d.titulo] = dim.value(d);
    });
    return row;
  });
  return { rows, decks: labels };
}
