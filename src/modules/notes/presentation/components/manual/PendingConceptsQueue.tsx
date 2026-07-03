"use client";

import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";
import type { PendingConcept, PendingTopic } from "../../../domain/manual-nota-draft";

interface PendingConceptsQueueProps {
  pendingConcepts: PendingConcept[];
  pendingTopics: PendingTopic[];
  topicNameOf: (id: string) => string;
  onRemove: (tempId: string) => void;
}

export function PendingConceptsQueue({ pendingConcepts, pendingTopics, topicNameOf, onRemove }: PendingConceptsQueueProps) {
  if (pendingConcepts.length === 0) return null;
  return (
    <div className="space-y-1.5 pt-2 border-t">
      <p className="text-xs font-medium text-zinc-500">{pendingConcepts.length} conceito(s) na fila:</p>
      {pendingConcepts.map((pc) => (
        <div key={pc.tempId} className="flex items-start justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-md px-3 py-2 border border-zinc-200 dark:border-zinc-800">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{pc.nome}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {pc.relsToTopics.map((r, i) => (
                <Badge key={i} variant="outline" className="text-[10px] h-4 px-1">{r.tipoRelacao}: {topicNameOf(r.targetTopicoId)}</Badge>
              ))}
              {pc.relsToPendingTopics.map((r) => {
                const pt = pendingTopics.find((t) => t.tempId === r.tempTopicoId);
                return (<Badge key={r.tempTopicoId} variant="secondary" className="text-[10px] h-4 px-1">tp. &quot;{pt?.nome}&quot;</Badge>);
              })}
            </div>
          </div>
          <button type="button" onClick={() => onRemove(pc.tempId)} className="flex-shrink-0 text-zinc-400 hover:text-red-500 ml-2"><XIcon className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}
