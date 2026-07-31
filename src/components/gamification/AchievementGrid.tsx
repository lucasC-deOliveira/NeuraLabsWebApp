"use client";

import type { Achievement } from "@/lib/gamification-api";
import { orderAchievements } from "./progress-badges";

// Grade de badges reusável (Progresso e Construtor). Conquistados primeiro, depois
// os mais próximos; os não-conquistados mostram a barra "quase lá". O tom (cor) muda
// por painel para diferenciar os eixos.
const TONES = {
  violet: {
    border: "border-violet-300 dark:border-violet-800",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    bar: "bg-violet-400",
  },
  sky: {
    border: "border-sky-300 dark:border-sky-800",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    bar: "bg-sky-400",
  },
};
type Tone = keyof typeof TONES;

export function AchievementGrid({ achievements, max = 6, tone = "violet" }: {
  achievements: Achievement[];
  max?: number;
  tone?: Tone;
}) {
  const badges = orderAchievements(achievements).slice(0, max);
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {badges.map((b) => <BadgeItem key={b.id} badge={b} tone={TONES[tone]} />)}
    </ul>
  );
}

function BadgeItem({ badge, tone }: { badge: Achievement; tone: (typeof TONES)[Tone] }) {
  const pct = Math.round(badge.progress * 100);
  const shell = badge.earned
    ? `${tone.border} ${tone.bg}`
    : "border-zinc-200 dark:border-zinc-800 opacity-70";
  return (
    <li className={`rounded-md border p-2 ${shell}`} title={badge.description}>
      <div className="flex items-center gap-1 text-xs font-medium">
        <span>{badge.earned ? "🏅" : "🔒"}</span>
        <span className="truncate">{badge.title}</span>
      </div>
      {!badge.earned && (
        <div className="mt-1 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${tone.bar} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground">{badge.current}/{badge.target}</span>
        </div>
      )}
    </li>
  );
}
