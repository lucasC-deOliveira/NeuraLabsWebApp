"use client";

import { InboxIcon } from "lucide-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { useDeckAnalytics } from "../useDeckAnalytics";
import { DeckComparisonRadar } from "./DeckComparisonRadar";
import { DeckList } from "./DeckList";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";

export function DeckAnalyticsTab() {
  const { data, loading, error, reload } = useDeckAnalytics();
  if (loading) {
    return <LoadingState message="Carregando seus analytics de baralhos…" hint="Reunindo cartas e desempenho." />;
  }
  if (error || !data) {
    return <ErrorState message={error ?? "Não foi possível carregar os analytics."} onRetry={reload} />;
  }
  if (data.totals.decks === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16 text-sm text-muted-foreground">
        <InboxIcon className="size-6" />
        <p className="max-w-xs text-center">Crie baralhos com cartas para ver o desempenho por baralho.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KpiRow data={data} />
      {data.decks.length >= 2 && <DeckComparisonRadar decks={data.decks} />}
      <DeckList decks={data.decks} />
    </div>
  );
}

function KpiRow({ data }: { data: DeckAnalytics }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Kpi label="Baralhos" value={data.totals.decks} />
      <Kpi label="Cartas em baralhos" value={data.totals.cards} />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
