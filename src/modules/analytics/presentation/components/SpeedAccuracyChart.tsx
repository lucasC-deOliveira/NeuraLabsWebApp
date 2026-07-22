"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import type { SpeedBucket } from "../../domain/analytics.types";

// Acurácia por faixa de tempo de resposta — apressar (ou demorar) atrapalha?
export function SpeedAccuracyChart({ data }: { data: SpeedBucket[] }) {
  return (
    <ChartCard title="Velocidade × acerto" hint="Acurácia por tempo de resposta">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} unit="%" />
          <Tooltip content={<ChartTip unit="%" />} cursor={{ fill: "hsl(var(--accent))" }} />
          <Bar dataKey="accuracy" name="Acurácia" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
