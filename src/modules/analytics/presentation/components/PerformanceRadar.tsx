"use client";

import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import type { ProfileAxis } from "../../domain/analytics.types";

// Radar do estudo: seis dimensões 0-100 num só gráfico — o "raio-X" do desempenho.
export function PerformanceRadar({ profile }: { profile: ProfileAxis[] }) {
  return (
    <ChartCard title="Perfil de desempenho" hint="Seis dimensões do seu estudo (0-100)">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={profile} outerRadius="72%">
          <PolarGrid gridType="polygon" stroke="hsl(var(--border))" strokeOpacity={0.7} />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Perfil" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
          <Tooltip content={<ChartTip />} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
