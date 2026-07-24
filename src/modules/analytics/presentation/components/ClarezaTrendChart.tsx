"use client";

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import { shortDate } from "./chart-format";
import type { FeynmanClarezaDay } from "../../domain/feynman-analytics.types";

// Clareza média das explicações Feynman por dia (0-100).
export function ClarezaTrendChart({ data }: { data: FeynmanClarezaDay[] }) {
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <ChartCard title="Tendência de clareza" hint="Clareza média das explicações por dia">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<ChartTip />} cursor={{ stroke: "var(--border)" }} />
          <Line
            type="monotone" dataKey="clareza" name="Clareza" stroke="var(--primary)"
            strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
