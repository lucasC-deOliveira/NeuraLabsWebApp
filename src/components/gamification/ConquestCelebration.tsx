"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { getConquestConcepts } from "@/lib/gamification-api";
import {
  newlyDominated,
  loadSeenConquered,
  saveSeenConquered,
  hasSeenRecord,
} from "./conquest-celebration";

// Sem UI: ao montar (abrir o app), celebra os conceitos DOMINADOS desde a última
// visita — o momento "🏆 você conquistou X". Na primeira vez semeia em silêncio
// para não festejar de uma vez tudo o que já estava dominado.
const MAX_TOASTS = 3;

export function ConquestCelebration() {
  useEffect(() => {
    let ignore = false;
    getConquestConcepts()
      .then((concepts) => {
        if (ignore) return;
        const dominatedIds = concepts.filter((c) => c.dominated).map((c) => c.conceitoId);
        const nameById = new Map(concepts.map((c) => [c.conceitoId, c.nome]));
        if (!hasSeenRecord()) return void saveSeenConquered(dominatedIds); // primeira vez
        celebrate(newlyDominated(dominatedIds, loadSeenConquered()), nameById);
        saveSeenConquered(dominatedIds);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  return null;
}

function celebrate(newIds: string[], nameById: Map<string, string>): void {
  for (const id of newIds.slice(0, MAX_TOASTS)) {
    toast.success(`🏆 Conceito dominado: ${nameById.get(id) ?? "novo conceito"}!`);
  }
  const extra = newIds.length - MAX_TOASTS;
  if (extra > 0) toast.success(`🏆 …e mais ${extra} conceito(s) dominado(s)!`);
}
