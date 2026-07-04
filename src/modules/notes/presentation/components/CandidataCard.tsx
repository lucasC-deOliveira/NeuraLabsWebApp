"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2Icon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import type { NotaCandidata } from "../../application/ports/nota-ai.port";

interface CandidataCardProps {
  candidata: NotaCandidata;
  selected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onToggleExpand: () => void;
}

export function CandidataCard({ candidata, selected, expanded, onToggle, onToggleExpand }: CandidataCardProps) {
  const hasConcepts = candidata.conceitosPrevistos.length > 0;
  return (
    <Card className={`transition-all ${selected ? "border-primary/30 bg-primary/[0.02]" : "opacity-60"} border-zinc-200 dark:border-zinc-800`}>
      <button onClick={onToggle} className="w-full text-left">
        <div className="px-3 sm:px-6 pt-3 pb-2">
          <div className="flex items-start gap-2">
            <div className={`mt-0.5 size-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
              {selected && <CheckCircle2Icon className="size-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium">{candidata.titulo}</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{candidata.conteudo.slice(0, 100)}...</p>
            </div>
          </div>
          {hasConcepts && (
            <div className="flex flex-wrap gap-1 mt-2 ml-7">
              {candidata.conceitosPrevistos.slice(0, 6).map((cn, ci) => (
                <Badge key={ci} variant="outline" className="text-[10px] px-1.5 h-5">{cn}</Badge>
              ))}
              {candidata.conceitosPrevistos.length > 6 && (
                <span className="text-[10px] text-zinc-400">+{candidata.conceitosPrevistos.length - 6}</span>
              )}
            </div>
          )}
        </div>
      </button>
      <div className="px-3 sm:px-6 pb-3">
        <Button variant="ghost" size="sm" className="text-xs text-zinc-400 h-7 px-1" onClick={onToggleExpand}>
          {expanded ? <ChevronDownIcon className="size-3.5 mr-1" /> : <ChevronRightIcon className="size-3.5 mr-1" />}
          {expanded ? "Ocultar" : "Ver conteudo"}
        </Button>
        {expanded && (
          <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 rounded-md p-3 border border-zinc-100 dark:border-zinc-800 max-h-[200px] overflow-y-auto">
            {candidata.conteudo}
          </div>
        )}
      </div>
    </Card>
  );
}
