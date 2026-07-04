"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, AlertCircleIcon, Trash2Icon } from "lucide-react";
import type { ParsedQuestaoPreview } from "../../domain/prova.types";

const TIPO_LABEL: Record<string, string> = {
  VERDADEIRO_FALSO: "V/F",
  MULTIPLA_ESCOLHA: "MC",
};

export function ParsedQuestaoRow({ q, onRemove }: { q: ParsedQuestaoPreview; onRemove: () => void }) {
  const gabaritoOk = q.gabarito !== "?";
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-xs text-muted-foreground font-mono w-6 pt-0.5 shrink-0">{q.numero}.</span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{TIPO_LABEL[q.tipo]}</Badge>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                gabaritoOk
                  ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                  : "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400"
              }`}
            >
              {gabaritoOk ? <CheckCircle2Icon className="size-3" /> : <AlertCircleIcon className="size-3" />}
              {q.gabarito}
            </span>
          </div>
          <p className="text-sm leading-snug">{q.enunciado}</p>
          {q.alternativas && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              {q.alternativas.map((a) => (
                <p key={a.letra} className={`text-xs truncate ${a.letra === q.gabarito ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                  <span className="font-mono">{a.letra}.</span> {a.texto}
                </p>
              ))}
            </div>
          )}
        </div>
        <button onClick={onRemove} className="text-zinc-400 hover:text-red-500 shrink-0 mt-0.5" title="Remover">
          <Trash2Icon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
