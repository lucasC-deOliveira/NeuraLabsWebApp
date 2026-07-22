"use client";

import { Loader2Icon, AlertCircleIcon, InboxIcon } from "lucide-react";
import { useFlashcardAnalytics } from "../useFlashcardAnalytics";
import { RetentionForecastChart } from "./RetentionForecastChart";
import { MaturityDonut } from "./MaturityDonut";
import { AccuracyTrendChart } from "./AccuracyTrendChart";
import { PerformanceRadar } from "./PerformanceRadar";
import type { FlashcardAnalytics } from "../../domain/analytics.types";

export function FlashcardAnalyticsTab() {
  const { data, loading, error } = useFlashcardAnalytics();
  if (loading) return <StateBox icon={<Loader2Icon className="size-6 animate-spin" />} text="Carregando analytics..." />;
  if (error || !data) return <StateBox icon={<AlertCircleIcon className="size-6 text-destructive" />} text="Não foi possível carregar os analytics." />;
  if (data.totals.cards === 0) return <StateBox icon={<InboxIcon className="size-6" />} text="Estude alguns flashcards para ver seus analytics aqui." />;

  return (
    <div className="space-y-4">
      <KpiRow data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PerformanceRadar profile={data.profile} />
        <AccuracyTrendChart data={data.accuracyTrend} />
        <RetentionForecastChart data={data.retentionForecast} />
        <MaturityDonut mix={data.maturity} />
      </div>
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
      <Kpi label="Revisões (90d)" value={data.totals.reviews} />
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
