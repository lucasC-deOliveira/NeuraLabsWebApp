"use client";

import { useEffect, useState } from "react";
import { FlameIcon, CheckCircle2Icon, TargetIcon } from "lucide-react";
import { toast } from "sonner";
import { getGamificationSummary } from "@/lib/gamification-api";
import { dailyGoalProgress, type DailyGoalProgress } from "./daily-goal";
import {
  loadDailyGoal,
  alreadyCelebratedToday,
  markCelebratedToday,
  localDateKey,
} from "./gamification-settings";

// Painel de Progresso do dashboard: anel da meta diária (revisões de hoje) +
// ofensiva. Autossuficiente (chama @/lib) para caber numa página sob o gate, no
// padrão do ConceptWeakSpots. Celebra a meta uma vez por dia.
export function DailyGoalCard() {
  const [progress, setProgress] = useState<DailyGoalProgress | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let ignore = false;
    getGamificationSummary()
      .then((s) => {
        if (ignore) return;
        const p = dailyGoalProgress(s.reviewsToday, loadDailyGoal());
        setProgress(p);
        setStreak(s.streak);
        celebrateIfJustMet(p);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  if (!progress) return null;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
      <div className="flex items-center gap-4">
        <GoalRing progress={progress} />
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold">
            <TargetIcon className="size-4 text-primary" />
            Meta de hoje
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {progress.met
              ? "Meta batida! Cada revisão a mais só reforça."
              : `Faltam ${progress.remaining} revisão(ões) para bater a meta.`}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <FlameIcon className={`size-4 ${streak > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
            <span className="font-medium tabular-nums">{streak}</span>
            <span className="text-muted-foreground">{streak === 1 ? "dia seguido" : "dias seguidos"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Anel de progresso em SVG (sem dependência). Fica verde e com check ao bater.
function GoalRing({ progress }: { progress: DailyGoalProgress }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * progress.pct;
  const color = progress.met ? "stroke-emerald-500" : "stroke-primary";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={`fill-none ${color} transition-all`}
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {progress.met ? (
          <CheckCircle2Icon className="size-6 text-emerald-500" />
        ) : (
          <span className="text-sm font-bold tabular-nums">{progress.done}/{progress.goal}</span>
        )}
      </div>
    </div>
  );
}

// Comemora só na primeira vez do dia que a meta aparece batida.
function celebrateIfJustMet(p: DailyGoalProgress): void {
  if (!p.met) return;
  const today = localDateKey(new Date());
  if (alreadyCelebratedToday(today)) return;
  markCelebratedToday(today);
  toast.success("🎯 Meta do dia batida! Ofensiva mantida.");
}
