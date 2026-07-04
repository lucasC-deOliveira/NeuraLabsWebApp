"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkIcon, ArrowRightIcon, PlusIcon, XIcon } from "lucide-react";
import type { ConceitoConceitoRel } from "../../../domain/manual-nota-draft";
import { CONCEITO_TO_CONCEITO_TYPES } from "../../constants/relation-types";

interface ConceptConceptRelationsCardProps {
  selectedIds: string[];
  rels: ConceitoConceitoRel[];
  conceptNameOf: (id: string) => string;
  onChange: (idx: number, patch: Partial<ConceitoConceitoRel>) => void;
  onRemove: (idx: number) => void;
  onAdd: () => void;
}

export function ConceptConceptRelationsCard({
  selectedIds, rels, conceptNameOf, onChange, onRemove, onAdd,
}: ConceptConceptRelationsCardProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="size-4" />Relacoes: Conceito ↔ Conceito</CardTitle>
        <CardDescription className="text-[10px]">Relacoes semanticas entre conceitos.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 space-y-3">
        {rels.map((rel, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row gap-1.5 items-start sm:items-center">
            <select value={rel.origemId} onChange={(e) => onChange(idx, { origemId: e.target.value })} className="h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-1 min-w-0">
              {selectedIds.map((id) => (<option key={id} value={id}>{conceptNameOf(id)}</option>))}
            </select>
            <select value={rel.tipoRelacao} onChange={(e) => onChange(idx, { tipoRelacao: e.target.value })} className="h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background w-28 flex-shrink-0">
              {CONCEITO_TO_CONCEITO_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
            <ArrowRightIcon className="size-3.5 text-zinc-400 flex-shrink-0 mx-1" />
            <select value={rel.destinoId} onChange={(e) => onChange(idx, { destinoId: e.target.value })} className="h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-1 min-w-0">
              {selectedIds.filter((id) => id !== rel.origemId).map((id) => (<option key={id} value={id}>{conceptNameOf(id)}</option>))}
            </select>
            <button type="button" onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-500 flex-shrink-0"><XIcon className="size-3.5" /></button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onAdd}><PlusIcon className="size-3.5 mr-1" />Adicionar relacao</Button>
      </CardContent>
    </Card>
  );
}
