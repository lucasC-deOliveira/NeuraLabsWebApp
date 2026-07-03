"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkIcon } from "lucide-react";
import type { NotaConceitoRel } from "../../../domain/manual-nota-draft";
import { NOTA_TO_CONCEITO_TYPES } from "../../constants/relation-types";

interface NotaConceptRelationsCardProps {
  rels: NotaConceitoRel[];
  conceptNameOf: (id: string) => string;
  onUpdate: (conceitoId: string, tipo: string) => void;
}

export function NotaConceptRelationsCard({ rels, conceptNameOf, onUpdate }: NotaConceptRelationsCardProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="size-4" />Relacoes: Nota → Conceito</CardTitle>
        <CardDescription className="text-[10px]">Como a nota se relaciona com cada conceito.</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 space-y-2">
        {rels.map((rel) => (
          <div key={rel.conceitoId} className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-28 truncate">{conceptNameOf(rel.conceitoId)}</span>
            <select
              value={rel.tipoRelacao}
              onChange={(e) => onUpdate(rel.conceitoId, e.target.value)}
              className="flex-1 h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background"
            >
              {NOTA_TO_CONCEITO_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
            </select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
