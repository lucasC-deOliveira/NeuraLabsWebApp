"use client";

import { ChartCard } from "./chart-shell";
import type { DeckStat } from "../../domain/deck-analytics.types";

// Tabela por baralho: cartas, maduras, a revisar e acurácia.
export function DeckList({ decks }: { decks: DeckStat[] }) {
  return (
    <ChartCard title="Por baralho" hint="Cartas, maturidade, a revisar e acurácia">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-1.5 pr-2 font-medium">Baralho</th>
              <th className="px-2 py-1.5 text-right font-medium">Cartas</th>
              <th className="px-2 py-1.5 text-right font-medium">Maduras</th>
              <th className="px-2 py-1.5 text-right font-medium">A revisar</th>
              <th className="py-1.5 pl-2 text-right font-medium">Acurácia</th>
            </tr>
          </thead>
          <tbody>
            {decks.map((d) => (
              <tr key={d.baralhoId} className="border-b border-border/50 last:border-0">
                <td className="max-w-[200px] truncate py-1.5 pr-2">{d.titulo}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{d.cards}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{d.mature}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{d.due}</td>
                <td className="py-1.5 pl-2 text-right tabular-nums font-medium">
                  {d.accuracy === null ? "—" : `${d.accuracy}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
