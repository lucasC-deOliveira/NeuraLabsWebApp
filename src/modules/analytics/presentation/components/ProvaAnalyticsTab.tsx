"use client";

import { InboxIcon } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { useProvaAnalytics } from "../useProvaAnalytics";
import { ProvaProgressChart } from "./ProvaProgressChart";
import { TypeAccuracyChart } from "./TypeAccuracyChart";
import { HardestQuestionsList } from "./HardestQuestionsList";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";

export function ProvaAnalyticsTab() {
  const { data, loading, error, reload } = useProvaAnalytics();
  if (loading) {
    return <LoadingState message="Carregando seus analytics de provas…" hint="Reunindo tentativas e respostas." />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Não foi possível carregar os analytics."} onRetry={reload} />;
  }
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
