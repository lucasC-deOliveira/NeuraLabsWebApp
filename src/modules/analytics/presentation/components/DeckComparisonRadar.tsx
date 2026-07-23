"use client";

import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import { deckRadarData } from "./deck-radar-data";
import type { DeckStat } from "../../domain/deck-analytics.types";

// Cores categóricas validadas (skill dataviz) — legenda garante a identidade.
const COLORS = ["#6366f1", "#10b981", "#f59e0b"];

// Compara os maiores baralhos em acurácia, maturidade e atividade num radar.
export function DeckComparisonRadar({ decks }: { decks: DeckStat[] }) {
  const { rows, decks: labels } = deckRadarData(decks, 3);
  return (
    <ChartCard title="Comparar baralhos" hint="Acurácia · maturidade · atividade (0-100)">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={rows} outerRadius="70%">
          <PolarGrid gridType="polygon" stroke="hsl(var(--border))" strokeOpacity={0.7} />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {labels.map((label, i) => (
            <Radar key={label} name={label} dataKey={label} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
          ))}
          <Tooltip content={<ChartTip />} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
