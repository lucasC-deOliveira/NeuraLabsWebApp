"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/link";
import { CalendarClockIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import { getStudyPlans, getTodayPlan, type TodayPlan } from "@/lib/study-plan-api";

// Resumo do "hoje" do plano na home, com atalho para /estudo. Usa o plano mais
// recente. Some enquanto carrega e quando não há plano (sem ruído na home).
export function PlanTodayCard() {
  const [today, setToday] = useState<TodayPlan | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getStudyPlans()
      .then((plans) => (plans[0] ? getTodayPlan(plans[0].id) : null))
      .then((t) => { if (active) { setToday(t); setReady(true); } })
      .catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  if (!ready || !today) return null;
  const { target } = today;
  const total = target.reviews + target.feynman + target.novos;

  return (
    <Link
      href="/estudo"
      className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
          <CalendarClockIcon className="size-5 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold">Plano de hoje</div>
          <div className="text-xs text-muted-foreground">
            {target.reviews} revisões · {target.novos} novos
            {target.feynman > 0 ? ` · ${target.feynman} Feynman` : ""} · ~{target.estMinutes} min
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold tabular-nums text-primary">{total}</span>
        <span className="flex items-center gap-1 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" /> Estudar <ArrowRightIcon className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
