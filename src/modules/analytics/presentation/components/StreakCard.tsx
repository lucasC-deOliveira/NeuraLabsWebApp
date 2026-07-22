"use client";

import { FlameIcon } from "lucide-react";
import { ChartCard } from "./chart-shell";
import { recentActivity, activityLevel } from "./activity-calendar";
import type { StudyStreak } from "../../domain/analytics.types";

// Intensidade -> cor da célula (ramp sequencial do primary; 0 = vazio/muted).
const LEVEL_BG = [
  "bg-muted",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
];

// Sequência atual + heatmap de atividade dos últimos ~84 dias.
export function StreakCard({ streak }: { streak: StudyStreak }) {
  const days = recentActivity(streak.calendar, new Date(), 84);
  return (
    <ChartCard title="Constância" hint="Sua sequência e atividade recente">
      <div className="mb-3 flex items-center gap-2">
        <FlameIcon className={`size-6 ${streak.current > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
        <span className="text-2xl font-bold tabular-nums">{streak.current}</span>
        <span className="text-sm text-muted-foreground">
          {streak.current === 1 ? "dia seguido" : "dias seguidos"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {days.map((d) => (
          <span
            key={d.date}
            title={`${d.date}: ${d.count} revisão(ões)`}
            className={`size-3 rounded-sm ${LEVEL_BG[activityLevel(d.count)]}`}
          />
        ))}
      </div>
    </ChartCard>
  );
}
