"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { ChartCard, ChartTip } from "./chart-shell";
import type { TypeAccuracy } from "../../domain/prova-analytics.types";

const TYPE_LABEL: Record<string, string> = {
  MULTIPLA_ESCOLHA: "Múltipla escolha",
  VERDADEIRO_FALSO: "Verdadeiro/Falso",
};

// Acurácia por tipo de questão — você vai melhor em múltipla escolha ou V/F?
export function TypeAccuracyChart({ data }: { data: TypeAccuracy[] }) {
  const rows = data.map((d) => ({ ...d, label: TYPE_LABEL[d.tipo] ?? d.tipo }));
  return (
    <ChartCard title="Acurácia por tipo" hint="Múltipla escolha × Verdadeiro/Falso">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={rows} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} unit="%" />
          <Tooltip content={<ChartTip unit="%" />} cursor={{ fill: "var(--accent)" }} />
          <Bar dataKey="accuracy" name="Acurácia" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
