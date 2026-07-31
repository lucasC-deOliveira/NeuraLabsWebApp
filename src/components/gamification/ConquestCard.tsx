"use client";

import { useEffect, useState } from "react";
import { TrophyIcon } from "lucide-react";
import { getConquestSummary, type ConquestSummary } from "@/lib/gamification-api";
import { VerNoGrafo } from "@/components/graph/VerNoGrafo";

// Painel de Conquista do grafo: conceitos DOMINADOS (cruzando SRS dos flashcards,
// acerto nas questões e clareza no Feynman) vs em progresso. Mede sobre o que foi
// estudado — não sobre os milhares nunca vistos —, então o número é honesto e
// motivador. Autossuficiente (chama @/lib), no padrão do ConceptWeakSpots.
export function ConquestCard() {
  const [summary, setSummary] = useState<ConquestSummary | null>(null);

  useEffect(() => {
    let ignore = false;
    getConquestSummary()
      .then((s) => { if (!ignore) setSummary(s); })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  // Sem nada estudado ainda: o painel não ocupa espaço à toa.
  if (!summary || summary.studied === 0) return null;
  const pct = Math.round((summary.dominated / summary.studied) * 100);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
      <header className="flex items-center gap-2">
        <TrophyIcon className="size-4 text-amber-500" />
        <h2 className="text-sm font-semibold">Conquista do grafo</h2>
      </header>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums">{summary.dominated}</span>
        <span className="text-sm text-muted-foreground">de {summary.studied} conceitos dominados</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Dominado = forte no SRS, nas questões e no Feynman do conceito.
      </p>

      {summary.quaseLa.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Quase lá — feche a seguir:</p>
          <ul className="space-y-1">
            {summary.quaseLa.map((c) => (
              <li key={c.conceitoId} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{c.nome}</span>
                <span className="tabular-nums text-muted-foreground">{Math.round(c.score * 100)}%</span>
                <VerNoGrafo tipo="CONCEITO" refId={c.conceitoId} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
