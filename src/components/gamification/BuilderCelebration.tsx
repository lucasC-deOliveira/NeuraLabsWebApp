"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getBuilderSummary } from "@/lib/gamification-api";
import {
  newlyDiscovered,
  loadSeenTerritory,
  saveSeenTerritory,
  hasSeenTerritory,
} from "./builder-celebration";

// Sem UI: ao montar (abrir o app), celebra os ASSUNTOS/TÓPICOS novos que entraram no
// mapa desde a última visita — "🧭 nova área no mapa". Na primeira vez semeia em
// silêncio para não festejar de uma vez tudo o que já estava lá.
const MAX_TOASTS = 3;

export function BuilderCelebration() {
  useEffect(() => {
    let ignore = false;
    getBuilderSummary()
      .then((b) => {
        if (ignore) return;
        const ids = b.recentTerritory.map((t) => t.referenciaId);
        const nameById = new Map(b.recentTerritory.map((t) => [t.referenciaId, t.nome]));
        if (!hasSeenTerritory()) return void saveSeenTerritory(ids); // primeira vez
        celebrate(newlyDiscovered(ids, loadSeenTerritory()), nameById);
        saveSeenTerritory(ids);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  return null;
}

function celebrate(newIds: string[], nameById: Map<string, string>): void {
  for (const id of newIds.slice(0, MAX_TOASTS)) {
    toast.success(`🧭 Nova área no mapa: ${nameById.get(id) ?? "novo território"}!`);
  }
  const extra = newIds.length - MAX_TOASTS;
  if (extra > 0) toast.success(`🧭 …e mais ${extra} nova(s) área(s) no mapa!`);
}
