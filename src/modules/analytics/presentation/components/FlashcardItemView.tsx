"use client";

import { InboxIcon } from "lucide-react";
import { AccuracyTrendChart } from "./AccuracyTrendChart";
import { ErrorTaxonomyChart } from "./ErrorTaxonomyChart";
import type { FlashcardItemAnalytics, FlashcardItemState } from "../../domain/flashcard-item.types";

// Rótulos das fases do agendador (linguagem do usuário).
const FASE_LABELS: Record<string, string> = {
  LEARN: "aprendendo",
  YOUNG: "jovem",
  MATURE: "madura",
  RELEARN: "reaprendendo",
};

// Analytics de UMA carta a partir de dados já carregados.
export function FlashcardItemView({ data }: { data: FlashcardItemAnalytics }) {
  if (data.totals.reviews === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-12 text-sm text-muted-foreground">
        <InboxIcon className="size-6" />
        <p className="max-w-xs text-center">Esta carta ainda não foi revisada — estude-a para ver o histórico.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <KpiRow data={data} />
      {data.state && <StateRow state={data.state} />}
      {data.accuracyTrend.length > 0 && <AccuracyTrendChart data={data.accuracyTrend} />}
      {data.errorTaxonomy.length > 0 && <ErrorTaxonomyChart data={data.errorTaxonomy} />}
    </div>
  );
}

function KpiRow({ data }: { data: FlashcardItemAnalytics }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Kpi label="Revisões" value={data.totals.reviews} />
      <Kpi label="Acurácia" value={data.accuracy === null ? "—" : `${data.accuracy}%`} />
      <Kpi label="Confiança" value={data.avgConfidence === null ? "—" : `${data.avgConfidence}/5`} />
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

function StateRow({ state }: { state: FlashcardItemState }) {
  const fase = FASE_LABELS[state.fase] ?? state.fase.toLowerCase();
  const proxima = new Date(state.proximaRevisao).toLocaleDateString("pt-BR");
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        Fase: <span className="font-medium text-foreground">{fase}</span> · intervalo {state.intervalo}d
      </span>
      <span className="text-muted-foreground">
        Próxima: <span className="font-medium text-foreground">{proxima}</span>
      </span>
    </div>
  );
}
