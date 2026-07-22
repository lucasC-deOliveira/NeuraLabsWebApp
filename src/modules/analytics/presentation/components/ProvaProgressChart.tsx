"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import type { ProvaProgress } from "../../domain/prova-analytics.types";

// Progresso: melhor pontuação × última, por prova (as mais refeitas primeiro).
export function ProvaProgressChart({ progress }: { progress: ProvaProgress[] }) {
  const rows = progress.slice(0, 6).map((p) => ({
    titulo: p.titulo.length > 22 ? `${p.titulo.slice(0, 21)}…` : p.titulo,
    melhor: Math.max(...p.points.map((pt) => pt.scorePct)),
    ultima: p.points[p.points.length - 1].scorePct,
  }));
  return (
    <ChartCard title="Progresso nas provas" hint="Melhor pontuação × última, por prova (%)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} unit="%" />
          <YAxis type="category" dataKey="titulo" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
          <Tooltip content={<ChartTip unit="%" />} cursor={{ fill: "hsl(var(--accent))" }} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>} />
          <Bar dataKey="melhor" name="Melhor" fill="#10b981" radius={[0, 4, 4, 0]} />
          <Bar dataKey="ultima" name="Última" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
