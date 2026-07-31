"use client";

import { useEffect, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { getGamificationProgress, type Achievement, type GamificationProgress } from "@/lib/gamification-api";
import { orderAchievements } from "./progress-badges";

// Painel de Progresso: nível/XP como TEMPERO (barra que enche) e as conquistas de
// consistência e domínio como a recompensa de fato. Autossuficiente (chama @/lib),
// no padrão do ConquestCard. Com pouca atividade os badges já mostram "quase lá".
const MAX_BADGES = 6;

export function ProgressCard() {
  const [progress, setProgress] = useState<GamificationProgress | null>(null);

  useEffect(() => {
    let ignore = false;
    getGamificationProgress()
      .then((p) => { if (!ignore) setProgress(p); })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  if (!progress) return null;
  const badges = orderAchievements(progress.achievements).slice(0, MAX_BADGES);
  const levelPct = Math.round((progress.xpInLevel / progress.xpForNext) * 100);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
      <header className="flex items-center gap-2">
        <SparklesIcon className="size-4 text-violet-500" />
        <h2 className="text-sm font-semibold">Progresso</h2>
        <span className="ml-auto text-xs font-medium text-muted-foreground">Nível {progress.level}</span>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" title={`${progress.xpInLevel}/${progress.xpForNext} XP`}>
        <div className="h-full bg-violet-500 transition-all" style={{ width: `${levelPct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {progress.xpInLevel}/{progress.xpForNext} XP para o nível {progress.level + 1}
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {badges.map((b) => <BadgeItem key={b.id} badge={b} />)}
      </ul>
    </section>
  );
}

function BadgeItem({ badge }: { badge: Achievement }) {
  const pct = Math.round(badge.progress * 100);
  return (
    <li
      className={`rounded-md border p-2 ${badge.earned ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40" : "border-zinc-200 dark:border-zinc-800 opacity-70"}`}
      title={badge.description}
    >
      <div className="flex items-center gap-1 text-xs font-medium">
        <span>{badge.earned ? "🏅" : "🔒"}</span>
        <span className="truncate">{badge.title}</span>
      </div>
      {!badge.earned && (
        <div className="mt-1 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground">{badge.current}/{badge.target}</span>
        </div>
      )}
    </li>
  );
}
