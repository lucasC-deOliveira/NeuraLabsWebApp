"use client";

import { useEffect, useState } from "react";
import { HammerIcon, FlameIcon } from "lucide-react";
import { getBuilderSummary, type BuilderSummary } from "@/lib/gamification-api";
import { AchievementGrid } from "./AchievementGrid";

// Painel Construtor & Explorador: premia CRIAR conteúdo (ofensiva de criação +
// totais) e AMPLIAR o mapa (conceitos/assuntos distintos). Autossuficiente (chama
// @/lib), no padrão do ConquestCard. Rótulo "dias criando" p/ não confundir com o
// "dias estudando" do laço de hábito.
export function BuilderCard() {
  const [b, setB] = useState<BuilderSummary | null>(null);

  useEffect(() => {
    let ignore = false;
    getBuilderSummary()
      .then((s) => { if (!ignore) setB(s); })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  if (!b || b.created === 0) return null;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
      <header className="flex items-center gap-2">
        <HammerIcon className="size-4 text-sky-500" />
        <h2 className="text-sm font-semibold">Construtor & Explorador</h2>
        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <FlameIcon className={`size-3.5 ${b.creationStreak > 0 ? "text-orange-500" : "text-muted-foreground/40"}`} />
          <span className="tabular-nums">{b.creationStreak}</span> dias criando
        </span>
      </header>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums">{b.created.toLocaleString("pt-BR")}</span>
        <span className="text-sm text-muted-foreground">conteúdos criados</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Mapa: {b.breadth.concepts.toLocaleString("pt-BR")} conceitos em {b.breadth.subjects} assuntos
        ({b.breadth.topics.toLocaleString("pt-BR")} tópicos).
      </p>

      <AchievementGrid achievements={b.achievements} tone="sky" />
    </section>
  );
}
