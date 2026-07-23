"use client";

import type { ReactNode } from "react";
import { Link } from "@/components/link";
import { FlameIcon, CalendarClockIcon, GraduationCapIcon, ArrowRightIcon } from "lucide-react";
import { useFlashcardAnalytics } from "../useFlashcardAnalytics";

// Resumo compacto do estudo na home, com link para a /analytics detalhada.
// Some enquanto carrega e quando não há cartas (sem ruído na home).
export function AnalyticsSummaryCard() {
  // Resumo da home usa uma janela fixa de 90 dias.
  const { data, loading } = useFlashcardAnalytics(90);
  if (loading || !data || data.totals.cards === 0) return null;

  const due7 = data.retentionForecast.slice(0, 7).reduce((sum, d) => sum + d.count, 0);
  const { learning, young, mature } = data.maturity;
  const total = learning + young + mature;
  const maturePct = total > 0 ? Math.round((mature / total) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Seu estudo</h3>
        <Link href="/analytics" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver analytics <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Metric icon={<FlameIcon className="size-4 text-orange-500" />} value={data.streak.current} label="dias seguidos" />
        <Metric icon={<CalendarClockIcon className="size-4 text-primary" />} value={due7} label="a revisar (7d)" />
        <Metric icon={<GraduationCapIcon className="size-4 text-emerald-500" />} value={`${maturePct}%`} label="maduras" />
      </div>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      {icon}
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
