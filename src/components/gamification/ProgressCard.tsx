"use client";

import { useEffect, useState } from "react";
import { SparklesIcon } from "lucide-react";
import { getGamificationProgress, type GamificationProgress } from "@/lib/gamification-api";
import { AchievementGrid } from "./AchievementGrid";

// Painel de Progresso: nível/XP como TEMPERO (barra que enche) e as conquistas de
// consistência e domínio como a recompensa de fato. Autossuficiente (chama @/lib),
// no padrão do ConquestCard. Com pouca atividade os badges já mostram "quase lá".
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

      <AchievementGrid achievements={progress.achievements} tone="violet" />
    </section>
  );
}
