"use client";

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import { shortDate } from "./chart-format";
import type { AccuracyDay } from "../../domain/analytics.types";

// Acurácia por dia (%) ao longo do tempo (janela de 90 dias).
export function AccuracyTrendChart({ data }: { data: AccuracyDay[] }) {
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <ChartCard title="Tendência de acurácia" hint="% de acerto por dia">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={rows} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} unit="%" />
          <Tooltip content={<ChartTip unit="%" />} cursor={{ stroke: "hsl(var(--border))" }} />
          <Line
            type="monotone" dataKey="accuracy" name="Acurácia" stroke="hsl(var(--primary))"
            strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
