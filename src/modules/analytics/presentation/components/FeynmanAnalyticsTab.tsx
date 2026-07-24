"use client";

import { useState } from "react";
import { InboxIcon } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { FilterBar } from "../filters/FilterBar";
import { DEFAULT_PERIOD, periodDays, type PeriodValue } from "../filters/period";
import { useFeynmanAnalytics } from "../useFeynmanAnalytics";
import { ClarezaTrendChart } from "./ClarezaTrendChart";
import type { FeynmanAnalytics } from "../../domain/feynman-analytics.types";

export function FeynmanAnalyticsTab() {
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  return (
    <div className="space-y-4">
      <FilterBar period={period} onPeriod={setPeriod} />
      <FeynmanContent days={periodDays(period)} />
    </div>
  );
}

function FeynmanContent({ days }: { days: number }) {
  const { data, loading, error, reload } = useFeynmanAnalytics(days);
  if (loading) {
    return <LoadingState message="Carregando seus analytics de Feynman…" hint="Reunindo suas explicações." />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Não foi possível carregar os analytics."} onRetry={reload} />;
  }
  if (data.totals.explicacoes === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16 text-sm text-muted-foreground">
        <InboxIcon className="size-6" />
        <p className="max-w-xs text-center">Explique um conceito ou flashcard (Feynman) para ver seus analytics aqui.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <KpiRow data={data} />
      <ClarezaTrendChart data={data.clarezaTrend} />
    </div>
  );
}

function KpiRow({ data }: { data: FeynmanAnalytics }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Kpi label="Explicações" value={data.totals.explicacoes} />
      <Kpi label="Itens explicados" value={data.totals.alvos} />
      <Kpi label="Clareza média" value={data.clarezaMedia === null ? "—" : `${data.clarezaMedia}`} />
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
