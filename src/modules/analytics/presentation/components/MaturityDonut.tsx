"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import type { MaturityMix } from "../../domain/analytics.types";

// Ordinal (aprendizado -> jovem -> madura): ramp sequencial de um hue (indigo),
// claro -> escuro = imatura -> sólida. Legenda garante identidade sem depender só da cor.
const RAMP = ["#a5b4fc", "#6366f1", "#4338ca"];

export function MaturityDonut({ mix }: { mix: MaturityMix }) {
  const data = [
    { name: "Em aprendizado", value: mix.learning },
    { name: "Jovens (<21d)", value: mix.young },
    { name: "Maduras (≥21d)", value: mix.mature },
  ];
  const total = mix.learning + mix.young + mix.mature;
  return (
    <ChartCard title="Maturidade das cartas" hint={`${total} carta(s) no total`}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="40%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={RAMP[i]} stroke="hsl(var(--card))" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<ChartTip />} />
          <Legend
            layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
            formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
