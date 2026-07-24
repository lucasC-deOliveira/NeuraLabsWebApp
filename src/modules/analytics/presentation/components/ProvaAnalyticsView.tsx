"use client";

import { InboxIcon } from "lucide-react";
import { ProvaProgressChart } from "./ProvaProgressChart";
import { TypeAccuracyChart } from "./TypeAccuracyChart";
import { HardestQuestionsList } from "./HardestQuestionsList";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";

// Visão completa dos analytics de provas a partir de dados já carregados.
// Reutilizada pela aba /analytics e pelo modal de analytics de prova no grafo.
export function ProvaAnalyticsView({ data }: { data: ProvaAnalytics }) {
  if (data.totals.tentativas === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16 text-sm text-muted-foreground">
        <InboxIcon className="size-6" />
        <p className="max-w-xs text-center">Estude uma prova (quiz) para ver seus analytics aqui.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <KpiRow data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ProvaProgressChart progress={data.progress} />
        <TypeAccuracyChart data={data.accuracyByType} />
      </div>
      <HardestQuestionsList questions={data.hardestQuestions} />
    </div>
  );
}

function KpiRow({ data }: { data: ProvaAnalytics }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Kpi label="Tentativas" value={data.totals.tentativas} />
      <Kpi label="Provas feitas" value={data.totals.provas} />
      <Kpi label="Acurácia" value={data.totals.accuracy === null ? "—" : `${data.totals.accuracy}%`} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
