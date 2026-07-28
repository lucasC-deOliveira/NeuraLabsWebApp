"use client";

import {
  PlayIcon,
  SettingsIcon,
  CalendarCheckIcon,
  TargetIcon,
  AlertTriangleIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TodayPlan } from "@/lib/study-plan-api";

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

// "Hoje" + "Progresso" lado a lado (command center). Sem barra de progresso do dia
// porque o v1 não rastreia o feito de hoje — o foco é o alvo e a projeção.
export function TodayView({ today, onStudy, onEdit, onDelete }: {
  today: TodayPlan;
  onStudy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { target, projection } = today;
  const total = target.reviews + target.feynman + target.novos;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border bg-card p-5">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hoje</div>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold tabular-nums text-primary">{total}</span>
          <span className="mb-1 text-sm text-muted-foreground">cartões · ~{target.estMinutes} min</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label="Revisões" value={target.reviews} />
          <Chip label="Feynman" value={target.feynman} />
          <Chip label="Novos" value={target.novos} />
        </div>
        {target.note && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" /> {target.note}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={onStudy} disabled={total === 0} className="gap-2">
            <PlayIcon className="size-4" /> Estudar agora
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1.5 text-muted-foreground">
            <SettingsIcon className="size-4" /> Editar plano
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="gap-1.5 text-muted-foreground hover:text-red-500">
            <Trash2Icon className="size-4" /> Remover
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progresso</div>
        <Row
          icon={<CalendarCheckIcon className="size-4 text-primary" />}
          label="Término projetado"
          value={projection.projectedFinish ? fmtDate(projection.projectedFinish) : "ritmo indefinido"}
        />
        <Row
          icon={<TargetIcon className="size-4 text-primary" />}
          label="Dias no ritmo atual"
          value={projection.daysNeeded !== null ? `${projection.daysNeeded} dias` : "—"}
        />
        {projection.onTrack !== null && (
          <div
            className={`mt-3 rounded-lg border p-2.5 text-sm ${
              projection.onTrack
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
            }`}
          >
            {projection.onTrack
              ? "No ritmo para bater a data-alvo. 🎯"
              : `Fora do ritmo — precisa de ~${projection.suggestedPerDay}/dia para chegar na data.`}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{today.newAvailable} conceitos novos disponíveis à frente.</p>
      </section>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number }) {
  const muted = value === 0;
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${muted ? "text-muted-foreground/50" : "border-primary/30 text-foreground"}`}>
      {label}: <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
