"use client";

import { useState } from "react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { FilterBar } from "../filters/FilterBar";
import { FilterSelect } from "../filters/FilterSelect";
import { useDeckOptions } from "../filters/useDeckOptions";
import { useAssuntoOptions } from "../filters/useAssuntoOptions";
import { DEFAULT_PERIOD, periodDays, type PeriodValue } from "../filters/period";
import { useFlashcardAnalytics } from "../useFlashcardAnalytics";
import { FlashcardAnalyticsView } from "./FlashcardAnalyticsView";

export function FlashcardAnalyticsTab() {
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const [baralhoId, setBaralhoId] = useState("");
  const [assuntoId, setAssuntoId] = useState("");
  const decks = useDeckOptions();
  const assuntos = useAssuntoOptions();
  return (
    <div className="space-y-4">
      <FilterBar period={period} onPeriod={setPeriod}>
        <FilterSelect value={baralhoId} onChange={setBaralhoId} allLabel="Todos os baralhos" options={decks} />
        <FilterSelect value={assuntoId} onChange={setAssuntoId} allLabel="Todos os assuntos" options={assuntos} />
      </FilterBar>
      <FlashcardContent
        days={periodDays(period)}
        baralhoId={baralhoId || undefined}
        assuntoId={assuntoId || undefined}
      />
    </div>
  );
}

function FlashcardContent({ days, baralhoId, assuntoId }: { days: number; baralhoId?: string; assuntoId?: string }) {
  const { data, loading, error, reload } = useFlashcardAnalytics(days, baralhoId, assuntoId);
  if (loading) {
    return <LoadingState message="Carregando seus analytics de estudo…" hint="Reunindo revisões e estado das cartas." />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Não foi possível carregar os analytics."} onRetry={reload} />;
  }
  return <FlashcardAnalyticsView data={data} />;
}
