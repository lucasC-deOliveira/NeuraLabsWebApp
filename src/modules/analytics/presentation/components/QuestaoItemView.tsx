"use client";

import { InboxIcon, CheckIcon } from "lucide-react";
import { ChartCard } from "./chart-shell";
import type { QuestaoItemAnalytics, AlternativeShare, QuestaoAttemptPoint } from "../../domain/questao-item.types";

// Analytics de UMA questão a partir de dados já carregados.
export function QuestaoItemView({ data }: { data: QuestaoItemAnalytics }) {
  if (data.totals.respostas === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-12 text-sm text-muted-foreground">
        <InboxIcon className="size-6" />
        <p className="max-w-xs text-center">Esta questão ainda não foi respondida — resolva-a num quiz para ver o histórico.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <KpiRow data={data} />
      <ChartCard title="Evolução" hint="Cada marca é uma resposta, da mais antiga à mais recente">
        <HistoryStrip history={data.history} />
      </ChartCard>
      <ChartCard title="Alternativas escolhidas" hint="Distribuição das respostas — ✓ é o gabarito">
        <AlternativeBars alternativas={data.alternativas} />
      </ChartCard>
    </div>
  );
}

function KpiRow({ data }: { data: QuestaoItemAnalytics }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Kpi label="Respostas" value={data.totals.respostas} />
      <Kpi label="Acurácia" value={data.accuracy === null ? "—" : `${data.accuracy}%`} />
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

function HistoryStrip({ history }: { history: QuestaoAttemptPoint[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {history.map((point, i) => (
        <span
          key={i}
          title={`${new Date(point.date).toLocaleDateString("pt-BR")} — ${point.acertou ? "acertou" : "errou"}`}
          className={`size-5 rounded ${point.acertou ? "bg-emerald-500" : "bg-destructive"}`}
        />
      ))}
    </div>
  );
}

function AlternativeBars({ alternativas }: { alternativas: AlternativeShare[] }) {
  return (
    <div className="space-y-2">
      {alternativas.map((alt) => (
        <div key={alt.opcao} className="flex items-center gap-2">
          <span className="flex w-32 shrink-0 items-center gap-1 truncate text-xs" title={alt.opcao}>
            {alt.correta && <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />}
            <span className="truncate">{alt.opcao}</span>
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
            <div
              className={`h-full rounded ${alt.correta ? "bg-emerald-500" : "bg-primary/60"}`}
              style={{ width: `${alt.pct}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {alt.count} · {alt.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}
