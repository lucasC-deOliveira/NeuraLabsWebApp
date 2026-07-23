"use client";

import { InboxIcon } from "lucide-react";
import { RetentionForecastChart } from "./RetentionForecastChart";
import { MaturityDonut } from "./MaturityDonut";
import { AccuracyTrendChart } from "./AccuracyTrendChart";
import { PerformanceRadar } from "./PerformanceRadar";
import { ErrorTaxonomyChart } from "./ErrorTaxonomyChart";
import { SpeedAccuracyChart } from "./SpeedAccuracyChart";
import { StreakCard } from "./StreakCard";
import { ProblemCardsList } from "./ProblemCardsList";
import type { FlashcardAnalytics } from "../../domain/analytics.types";

// Visão completa dos analytics de flashcards a partir de dados já carregados.
// Reutilizada pela aba /analytics e pelo modal de analytics de baralho no grafo.
export function FlashcardAnalyticsView({ data }: { data: FlashcardAnalytics }) {
  if (data.totals.cards === 0) {
    return (
      <StateBox
        icon={<InboxIcon className="size-6" />}
        text="Estude alguns flashcards para ver seus analytics aqui."
      />
    );
  }
  return (
    <div className="space-y-4">
      <KpiRow data={data} />
      <StreakCard streak={data.streak} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceRadar profile={data.profile} />
        <AccuracyTrendChart data={data.accuracyTrend} />
        <RetentionForecastChart data={data.retentionForecast} />
        <MaturityDonut mix={data.maturity} />
        <SpeedAccuracyChart data={data.speedBuckets} />
        <ErrorTaxonomyChart data={data.errorTaxonomy} />
      </div>
      <ProblemCardsList cards={data.problemCards} />
    </div>
  );
}

function KpiRow({ data }: { data: FlashcardAnalytics }) {
  const { learning, young, mature } = data.maturity;
  const total = learning + young + mature;
  const maturePct = total > 0 ? Math.round((mature / total) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-3">
      <Kpi label="Cartas" value={data.totals.cards} />
      <Kpi label="Revisões (período)" value={data.totals.reviews} />
      <Kpi label="Maduras" value={`${maturePct}%`} />
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

function StateBox({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-16 text-sm text-muted-foreground">
      {icon}
      <p className="max-w-xs text-center">{text}</p>
    </div>
  );
}
