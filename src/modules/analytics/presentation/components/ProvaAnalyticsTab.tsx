"use client";

import { useState } from "react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { FilterBar } from "../filters/FilterBar";
import { FilterSelect } from "../filters/FilterSelect";
import { useProvaOptions } from "../filters/useProvaOptions";
import { DEFAULT_PERIOD, periodDays, type PeriodValue } from "../filters/period";
import { useProvaAnalytics } from "../useProvaAnalytics";
import { ProvaAnalyticsView } from "./ProvaAnalyticsView";

export function ProvaAnalyticsTab() {
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [provaId, setProvaId] = useState("");
  const provas = useProvaOptions();
  return (
    <div className="space-y-4">
      <FilterBar period={period} onPeriod={setPeriod}>
        <FilterSelect value={provaId} onChange={setProvaId} allLabel="Todas as provas" options={provas} />
      </FilterBar>
      <ProvaContent days={periodDays(period)} provaId={provaId || undefined} />
    </div>
  );
}

function ProvaContent({ days, provaId }: { days: number; provaId?: string }) {
  const { data, loading, error, reload } = useProvaAnalytics(days, provaId);
  if (loading) {
    return <LoadingState message="Carregando seus analytics de provas…" hint="Reunindo tentativas e respostas." />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Não foi possível carregar os analytics."} onRetry={reload} />;
  }
  return <ProvaAnalyticsView data={data} />;
}
