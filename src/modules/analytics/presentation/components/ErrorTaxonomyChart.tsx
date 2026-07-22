"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import type { ErrorTypeCount } from "../../domain/analytics.types";

// Onde seus erros se concentram — contagem por tipo de erro (tipoErro).
export function ErrorTaxonomyChart({ data }: { data: ErrorTypeCount[] }) {
  if (data.length === 0) {
    return (
      <ChartCard title="Tipos de erro" hint="Como você erra">
        <p className="py-10 text-center text-xs text-muted-foreground">Sem erros com tipo registrado ainda.</p>
      </ChartCard>
    );
  }
  return (
    <ChartCard title="Tipos de erro" hint="Onde seus erros se concentram">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="tipo" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={96} />
          <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--accent))" }} />
          <Bar dataKey="count" name="Erros" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
