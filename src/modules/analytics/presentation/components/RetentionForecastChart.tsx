"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import { shortDate } from "./chart-format";
import type { RetentionDay } from "../../domain/analytics.types";

// Quantas cartas vencem por dia nos próximos 30 dias (atrasadas contam em hoje).
export function RetentionForecastChart({ data }: { data: RetentionDay[] }) {
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <ChartCard title="Revisões previstas" hint="Cartas que vencem por dia (próximos 30 dias)">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={rows} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
          <Tooltip content={<ChartTip />} cursor={{ fill: "var(--accent)" }} />
          <Bar dataKey="count" name="A revisar" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
